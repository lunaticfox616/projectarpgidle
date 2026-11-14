import { atlasSessionInMap, atlasSessionReturnZone, atlasSessionInsideMap } from './atlas-run-access.mjs';
import { atlasSessionNotify } from './atlas-run-events.mjs';

/** A content's return or a finished departure left the hero in a map that has closed since: back to the frontier. */
export function* atlasSessionRecoverClosedMap(env, owner) {
    if (atlasSessionInMap(env, owner) && !owner.atlas.run) (yield* atlasSessionTravelBack(env, owner, null));
}

/** 열린 지도를 닫는다: 지도석과 맵 안의 지도석 드롭을 잃는다. @returns {boolean} whether a map was open. */
export function* atlasSessionAbandon(env, owner) {
    if (!owner.atlas.run) return false;
    const { returnZoneId } = env.deps.atlas.close(owner, 'failed');
    if (atlasSessionInMap(env, owner)) (yield* atlasSessionTravelBack(env, owner, returnZoneId));
    return true;
}

export function* atlasSessionTravelBack(env, owner, returnZoneId) {
    owner.currentZoneId = atlasSessionReturnZone(env, returnZoneId);
    owner.killsInZone = 0;
    owner.enemies = []; owner.encounterPlan = []; owner.encounterIndex = 0; owner.runProgress = 0;
    (yield { kind: 'atlasSessionEffectStartMoving', args: [false] });
}

export function* atlasSessionHalt(env, owner) {
    env.deps.actExplorationProgress.depart(owner);
    env.deps.actExplorationProgress.stopAfterCompletion(owner);
    // A stopped return still needs its destination room; without it the renderer falls back to the legacy 9×8 arena.
    (yield { kind: 'atlasSessionEffectPrepareActExplorationArrival', args: [] });
}

/** 쓰러짐(handlePlayerDefeat 끝): 포털 하나. 남아 있으면 같은 지도에 다시 들어가고, 마지막 포털이면 지도가 닫힌다. */
export function* atlasSessionDefeat(env, owner, zone) {
    if (zone && zone.type === 'atlasMap') (yield* atlasSessionSpendPortal(env, owner, 'defeat'));
}

/** 마을 귀환 · 다른 곳으로 이동: 포털 하나(정산 대기 중에는 아직 다음 지도에 들어가지 않았다). */
export function* atlasSessionLeave(env, owner, reason) {
    if (atlasSessionInsideMap(env, owner)) (yield* atlasSessionSpendPortal(env, owner, reason));
}

/** changeZone의 마지막 단계: 맵을 떠나면 포털 하나, 그리고 도착지를 현재 지역으로. */
export function* atlasSessionTravel(env, owner, zone) {
    if (zone.id !== env.deps.ATLAS.zoneId) (yield* atlasSessionLeave(env, owner, 'travel'));
    owner.currentZoneId = zone.id;
}

export function* atlasSessionSpendPortal(env, owner, reason) {
    const portal = env.deps.atlas.usePortal(owner);
    if (!portal) return;
    (yield* atlasSessionNotify(env, { kind: portal.closed ? 'failed' : 'portal', reason, portals: portal.portals || 0 }));
    if (!portal.closed) return;
    if (atlasSessionInMap(env, owner)) owner.currentZoneId = atlasSessionReturnZone(env, portal.returnZoneId);
    owner.killsInZone = 0;
    (yield { kind: 'atlasSessionEffectQueueImportantSave', args: [160] });
}
