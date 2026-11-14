

export function atlasSessionInMap(env, owner) { return owner.currentZoneId === env.deps.ATLAS.zoneId; }

/** In the open map itself, not still on the cleared one during the settlement pause before the next map. */
export function atlasSessionInsideMap(env, owner) { return atlasSessionInMap(env, owner) && !env.deps.actExplorationState.current(owner)?.departure; }

export function atlasSessionReturnZone(env, id) {
    return Number.isInteger(id) && env.deps.getZone(id) ? id : env.deps.getDefeatRecoveryZoneId();
}

export function atlasSessionDepartureBlock(env, owner) {
    if (owner.pendingLoopReady || owner.pendingLoopDecision) return '루프 정산 화면에서 먼저 결정하세요(루프 진행 또는 나중에 루프).';
    return env.deps.isBeehiveRunLockedForMapTravel() || owner.beyondBoundary.activeRun || owner.woodsmanBuildLock ? '진행 중인 도전을 마친 뒤 지도를 여세요.' : '';
}

/** The open map has one entry left: spending it would close the map. */
export function atlasSessionLastPortal(env, owner) { return atlasSessionInsideMap(env, owner) && !!owner.atlas.run && owner.atlas.run.portals <= 1; }
