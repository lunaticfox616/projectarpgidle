import { atlasSessionGrantSpoils } from './atlas-run-spoils.mjs';
import { atlasSessionNotify } from './atlas-run-events.mjs';
import { atlasSessionReturnZone } from './atlas-run-access.mjs';
import { atlasSessionHalt } from './atlas-run-travel.mjs';
import { restoreMainMap } from './atlas-passages.mjs';
import { atlasSessionClearRoom } from './atlas-run-drops.mjs';

/** 보스 처치 → 완료 정산. 일반·수호자 지도 완료만 자동 지도석으로 잇는다(방치 · 오프라인 재생도 같다). */
export function* atlasSessionSettle(env, owner, zone) {
    const settled = env.deps.atlas.complete(owner);
    if (settled) (yield* atlasSessionGrantSpoils(env, owner, settled, zone));
    return settled;
}

function settlementHub(env, opened, result) {
    if (opened || result.board || result.memory?.spoils) return false;
    return ['guardian', 'map', 'pinnacle'].includes(env.deps.atlas.node(result.nodeId)?.kind);
}

export function* atlasSessionFinish(env, owner, zone) {
    if (zone.pocket) return yield* finishExpedition(env, owner, zone);
    return yield* finishMainMap(env,owner,zone);
}

function* finishMainMap(env,owner,zone) {
    // Capture while the finished run still owns this receipt; completion rewards belong to this map too.
    const result = (yield { kind: 'atlasSessionEffectCaptureAtlasCompletion', args: [owner, atlasSessionSettle(env, owner, zone)] });
    if (!result) return;
    env.deps.atlas.keepLoot(owner, owner.explorationLoot);
    owner.killsInZone = 0;
    const stop = owner.settings.mapCompleteAction === 'stop';
    const next = atlasSessionNextMapForResult(env, owner, stop, result);
    const opened = !!next && !env.deps.atlas.begin(owner, next.uid, result.returnZoneId);
    if (opened) env.deps.combatLootReceipts.reset(owner);
    (yield* atlasSessionNotify(env, { kind: 'complete', name: zone.name, ...result, next: opened ? owner.atlas.run.map.node : null }));
    owner.currentZoneId = opened ? env.deps.ATLAS.zoneId : atlasSessionReturnZone(env, result.returnZoneId);
    owner.atlas.wheelHub = settlementHub(env, opened, result);
    (yield { kind: 'atlasSessionEffectMarkAtlasRefresh', args: [] });
    (yield { kind: 'atlasSessionEffectQueueImportantSave', args: [220] });
    if (stop || owner.atlas.wheelHub) return (yield* atlasSessionHalt(env, owner));
    // The cleared map stays on screen through the settlement pause only when the next map is ready to take its place.
    if (opened && env.deps.actExplorationProgress.deferDeparture(owner)) return;
    env.deps.actExplorationProgress.reconcileDeparture(owner);
    (yield { kind: 'atlasSessionEffectStartMoving', args: [false] });
}

function* finishExpedition(env, owner, zone) {
    if (!owner.actExploration?.home || owner.actExploration.status !== 'cleared') return;
    const maps = [], room = zone.pocket;
    // Rewards normally run inside the kill receipt; use the same receipt for the expedition award.
    const rewards = yield {kind:'atlasSessionEffectCaptureAtlasCompletion', args:[owner, atlasSessionClearRoom(env, owner, zone, room, maps)]};
    restoreMainMap(owner);
    yield {kind:'atlasSessionEffectResumeExpedition', args:[]};
    yield* atlasSessionNotify(env, {kind:'drops', room, maps, rewards, fragments:[], golden:env.deps.atlasEncounters.isGolden(zone,room)});
    yield {kind:'atlasSessionEffectQueueImportantSave', args:[100]};
}

/** Special challenges return after settlement without spending an unrelated map stone or changing the auto-map setting. */
export function atlasSessionNextMapForResult(env, owner, stop, result) {
    const kind = env.deps.atlas.node(result.nodeId)?.kind;
    if (stop || result.board || result.memory?.spoils || !['map', 'guardian'].includes(kind)) return null;
    return env.deps.atlas.nextAuto(owner, result.tier);
}
