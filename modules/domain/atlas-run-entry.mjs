import { atlasSessionDepartureBlock, atlasSessionInMap } from './atlas-run-access.mjs';

/** 지도 장치: 지도석을 소모해 지도를 열고 그 맵으로 떠난다(떠나지 못하면 지도석과 이슬은 돌아간다). nodeId: 고른 노드(없으면 지도석이 갈 곳).
 * dew: 형체 없는 이슬 입장(입장 도크에서만 고른다, 자동 지도와 차륜 거점은 쓰지 않는다).
 * @returns {string} '' when the map opened, otherwise why not. */
export function* atlasSessionOpen(env, owner, uid, nodeId, dew = false) {
    env.deps.atlas.sync(owner);
    const reason = atlasSessionDepartureBlock(env, owner) || env.deps.atlas.begin(owner, uid, owner.currentZoneId, undefined, nodeId, dew === true);
    if (reason) return reason;
    return (yield* atlasSessionDepart(env, owner));
}

/** 천문도의 보스 자리(개편 C): 그 자리가 치르는 싸움으로 떠난다. 첫 도전은 비용이 없고, 완료한 뒤에는 그 싸움의 비용(수호자 지도석, 뿌리
 * 입장권 4종, 바치는 재료)을 낸다(떠나지 못하면 낸 것은 돌아온다). */
export function* atlasSessionOpenGate(env, owner, gateId) {
    env.deps.atlas.sync(owner);
    const reason = env.deps.atlas.gateReason(owner, gateId) || atlasSessionDepartureBlock(env, owner);
    if (reason) return reason;
    env.deps.atlas.beginGate(owner, gateId, owner.currentZoneId);
    return (yield* atlasSessionDepart(env, owner));
}

/** 후반부 싸움(최종 보스 · 리그 우두머리, js/atlas-endgame.js): 재료를 바치고 그 투기장으로 떠난다(떠나지 못하면 재료는 돌아온다).
 * 천문도의 자리가 치르는 다섯(벨라-루, 아리안로드, 정원사의 메아리, 나무꾼, 베일라)은 그 자리의 규칙으로 연다. */
export function* atlasSessionOpenEndgame(env, owner, id) {
    const gate = env.deps.atlas.gateOf(id);
    if (gate) return (yield* atlasSessionOpenGate(env, owner, gate.id));
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
