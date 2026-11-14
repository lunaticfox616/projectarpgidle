import { atlasSessionDepartureBlock, atlasSessionInMap } from './atlas-run-access.mjs';

/** 지도 장치: 지도석을 소모해 지도를 열고 그 맵으로 떠난다(떠나지 못하면 지도석은 보관함으로 돌아간다).
 * @returns {string} '' when the map opened, otherwise why not. */
export function* atlasSessionOpen(env, owner, uid) {
    env.deps.atlas.sync(owner);
    const reason = env.deps.atlas.beginReason(owner, uid) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.begin(owner, uid, owner.currentZoneId);
    return (yield* atlasSessionDepart(env, owner));
}

/** 정점: 뿌리 입장권 4종을 바치고 세계수의 그림자로 떠난다(떠나지 못하면 입장권은 돌아온다). */
export function* atlasSessionOpenPinnacle(env, owner) {
    const reason = env.deps.atlas.pinnacleReason(owner) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.beginPinnacle(owner, owner.currentZoneId);
    return (yield* atlasSessionDepart(env, owner));
}

/** 후반부 싸움(최종 보스 · 리그 우두머리, js/atlas-endgame.js): 재료를 바치고 그 투기장으로 떠난다(떠나지 못하면 재료는 돌아온다). */
export function* atlasSessionOpenEndgame(env, owner, id) {
    const reason = env.deps.atlasEndgame.entryReason(owner, id) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlasEndgame.spend(owner, id);
    env.deps.atlas.beginSpecial(owner, id, owner.currentZoneId);
    return (yield* atlasSessionDepart(env, owner));
}

/** 기억 던전(js/memory-dungeon.js): 보스의 기억 하나로 그 보스의 투기장으로 떠난다(떠나지 못하면 기억은 돌아온다). */
export function* atlasSessionOpenMemory(env, owner, nodeId, tier) {
    const reason = env.deps.memoryDungeon.entryReason(owner, nodeId, tier) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.beginMemory(owner, nodeId, tier, owner.currentZoneId);
    return (yield* atlasSessionDepart(env, owner));
}

export function* atlasSessionOpenBoard(env, owner) {
    const reason = atlasSessionDepartureBlock(env, owner) || env.deps.atlas.beginBoard(owner, owner.currentZoneId);
    if (reason) return reason;
    return (yield* atlasSessionDepart(env, owner));
}

export function* atlasSessionDepart(env, owner) {
    env.deps.combatLootReceipts.reset(owner);
    (yield { kind: 'atlasSessionEffectChangeZone', args: [env.deps.ATLAS.zoneId] });
    if (atlasSessionInMap(env, owner)) return '';
    env.deps.atlas.cancel(owner);
    return '지도로 이동할 수 없습니다.';
}

/** 열린 지도에 다시 들어간다(떠날 때 포털 하나를 이미 썼다). @returns {string} '' when the hero is headed in, otherwise why not. */
export function* atlasSessionReenter(env, owner) {
    const reason = owner.atlas.run ? atlasSessionDepartureBlock(env, owner) : '열린 지도가 없습니다.';
    if (reason) return reason;
    if (!atlasSessionInMap(env, owner)) (yield { kind: 'atlasSessionEffectChangeZone', args: [env.deps.ATLAS.zoneId] });
    return atlasSessionInMap(env, owner) ? '' : '지도로 이동할 수 없습니다.';
}
