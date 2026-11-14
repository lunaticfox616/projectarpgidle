import { killFinishGrandBreachLootCollection } from './kill-grand-breach.mjs';
import { clearFinishBeyondBoundaryEncounter } from '../combat/boundary-completion.mjs';
import { clearFinishMeteorEncounter, clearFinishOutsideChaosEncounter } from '../combat/special-completion.mjs';
import { clearFinishOceanEncounter } from '../combat/ocean-completion.mjs';
import { clearFinishChaosRealmEncounter } from '../combat/chaos-realm-completion.mjs';
import { clearFinishSkyTowerEncounter } from '../combat/tower-completion.mjs';
import { clearFinishTimeRiftEncounter } from '../combat/time-rift-completion.mjs';
import { clearFinishTrialEncounter } from '../combat/trial-completion.mjs';
import { clearFinishSeasonBossEncounter } from '../combat/season-boss-completion.mjs';
import { clearFinishLabyrinthEncounter } from '../combat/labyrinth-completion.mjs';
import { clearFinishUnderworldEncounter } from '../combat/underworld-completion.mjs';
import { clearFinishCosmosEncounter } from '../combat/cosmos-completion.mjs';
import { clearFinishZoneClear } from '../combat/zone-completion.mjs';

const encounterFinishByKind = /* @__PURE__ */ Object.freeze({
    beyondBoundary: clearFinishBeyondBoundaryEncounter,
    meteor: clearFinishMeteorEncounter,
    outsideChaos: clearFinishOutsideChaosEncounter,
    oceanDepth: clearFinishOceanEncounter,
    chaosRealm: clearFinishChaosRealmEncounter,
    skyTower: clearFinishSkyTowerEncounter,
    timeRift: clearFinishTimeRiftEncounter,
    trial: clearFinishTrialEncounter,
    seasonBoss: clearFinishSeasonBossEncounter,
    labyrinth: clearFinishLabyrinthEncounter,
    underworld: clearFinishUnderworldEncounter,
    cosmos: clearFinishCosmosEncounter
});

/** An encounter's end: the zone kind's own finish, else the zone clear once its kills are done, else the next encounter. Split by
 * zone kind on 2026-10-18 (it was one function of complexity 258): the same steps, rolls and UI calls in the same order. The UI
 * calls reach the parts through ui (addLog, updateStaticUI, checkUnlocks, the map reveal). */
export function* clearFinishEncounterRun(env) {
    let zone = env.deps.getZone(env.owner.currentZoneId);
    // 나무꾼의 잔상은 30초가 끝나야 끝난다. 방 단위 지도에서 허수아비가 먼저 쓰러져 지도가 비면 그 자리에서 기록하고 끝낸다.
    if (yield* clearFinishSpecialEncounterEarly(env, zone)) return;
    if(!env.deps.actExplorationProgress.beginCompletion(zone))return;
    (yield { kind: 'dispatchRuntimeEvent', args: ['encounter-finished', {
        zoneId: zone.id,
        zoneType: zone.type,
        contentContext: env.deps.getEncounterTelemetryContext(zone),
        background: !!env.owner.isBackgroundCalculation
    }] });
    let mapAction = env.owner.settings.mapCompleteAction;
    env.owner.killsInZone++;
    if (zone.type === 'atlasMap') return env.deps.atlasRun.finish(zone);
    // The map reveal is looked up only when a zone opens (it lives in the passive tree canvas script, which some runs lack).
    (yield { kind: 'captureFinishFeedback', args: [] });
    const finishKind = encounterFinishByKind[zone.type];
    if (finishKind) return yield* finishKind(env, zone, mapAction);
    if (env.owner.killsInZone >= zone.maxKills) return (yield* clearFinishZoneClear(env, zone, mapAction));
    // 구역 maxKills 미달성 시 — 다음 encounter 진행
    (yield { kind: 'checkUnlocks', args: [] });
    env.deps.startMoving(false);
    (yield { kind: 'updateStaticUI', args: [] });
}

export function* clearFinishSpecialEncounterEarly(env, zone) {
    if(zone?.type==='woodsmanEcho'){env.deps.finishWoodsmanEchoRun();return true;}
    if(zone?.id==='grand_breach_run' && env.owner.voidRift?.grandRun?.phase==='loot'){
        yield* killFinishGrandBreachLootCollection(env, zone);
        return true;
    }
    return false;
}
