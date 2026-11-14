import { atlasSessionGrantSpoils } from './atlas-run-spoils.mjs';
import { atlasSessionNotify } from './atlas-run-events.mjs';
import { atlasSessionReturnZone } from './atlas-run-access.mjs';
import { atlasSessionHalt } from './atlas-run-travel.mjs';

/** 보스 처치 → 완료 정산. 일반·수호자 지도 완료만 자동 지도석으로 잇는다(방치 · 오프라인 재생도 같다). */
export function* atlasSessionSettle(env, owner, zone) {
    const settled = env.deps.atlas.complete(owner);
    if (settled) (yield* atlasSessionGrantSpoils(env, owner, settled, zone));
    return settled;
}

export function* atlasSessionFinish(env, owner, zone) {
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
    (yield { kind: 'atlasSessionEffectMarkAtlasRefresh', args: [] });
    (yield { kind: 'atlasSessionEffectQueueImportantSave', args: [220] });
    if (stop) return (yield* atlasSessionHalt(env, owner));
    // The cleared map stays on screen through the settlement pause only when the next map is ready to take its place.
    if (opened && env.deps.actExplorationProgress.deferDeparture(owner)) return;
    env.deps.actExplorationProgress.reconcileDeparture(owner);
    (yield { kind: 'atlasSessionEffectStartMoving', args: [false] });
}

/** Special challenges return after settlement without spending an unrelated map stone or changing the auto-map setting. */
export function atlasSessionNextMapForResult(env, owner, stop, result) {
    const kind = env.deps.atlas.node(result.nodeId)?.kind;
    if (stop || result.board || result.memory?.spoils || !['map', 'guardian'].includes(kind)) return null;
    return env.deps.atlas.nextAuto(owner, result.tier);
}
