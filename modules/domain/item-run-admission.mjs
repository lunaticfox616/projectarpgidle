

export function itemFlowHasActiveBeehiveRuntimeState(owner, b) {
    if (!b || !b.inRun) return false;
    return hasBeehiveProgress(b)
        || (Array.isArray(b.pendingQueenRewards) && b.pendingQueenRewards.length > 0)
        || (owner.currentZoneId === 'beehive_run' && (owner.enemies || []).some(enemy => enemy && enemy.hp > 0));
}

function hasBeehiveProgress(b) {
    let hasReturnZone = b.returnZoneId !== undefined && b.returnZoneId !== null;
    let hasStartedRoute = Math.max(0, Math.floor(b.branchStep || 0)) > 0;
    return !!b.awaitingClear
        || (!!b.pendingChoice && (hasReturnZone || hasStartedRoute))
        || !!b.queenActive
        || !!b.pendingWaveReward;
}

export function itemFlowClearBeehiveRuntimeState(b) {
    if (!b) return;
    b.inRun = false;
    b.branchStep = 0;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.waveExtra = 0;
    b.pendingQueenRewards = [];
    b.queenActive = false;
}

export function itemFlowReconcileBeehiveRunState(owner) {
    let b = owner && owner.beehive ? owner.beehive : null;
    if (!b || !b.inRun) return false;
    if (owner.currentZoneId === 'beehive_run' && itemFlowHasActiveBeehiveRuntimeState(owner, b)) return true;
    let returnZoneId = b.returnZoneId ?? owner.maxZoneId;
    itemFlowClearBeehiveRuntimeState(b);
    b.returnZoneId = null;
    if (owner.currentZoneId === 'beehive_run') owner.currentZoneId = returnZoneId ?? 0;
    owner.enemies = [];
    owner.encounterPlan = [];
    owner.encounterIndex = 0;
    owner.runProgress = 0;
    owner.combatHalted = false;
    return false;
}

export function itemFlowIsBeehiveRunLockedForMapTravel(owner) {
    let b = owner && owner.beehive ? owner.beehive : null;
    if (!b || !b.inRun) return false;
    // Only a real active beehive run should lock travel/progress. Older saves can
    // retain partial beehive flags; reconcile them instead of leaving maps stuck at 0%.
    return itemFlowReconcileBeehiveRunState(owner) && owner.currentZoneId === 'beehive_run';
}

export function* itemFlowWarnBeehiveMapTravelBlocked(env) {
    yield { kind: 'itemOptionalLog', args: [env.BEEHIVE_TRAVEL_REFUSAL, 'attack-monster'] };
    return true;
}

export function itemFlowGetHeldRunBlockReason(env, owner) {
    if (itemFlowIsBeehiveRunLockedForMapTravel(owner)) return env.BEEHIVE_TRAVEL_REFUSAL;
    return env.deps.ensureBeyondBoundaryState(owner).activeRun ? '경계 너머 도전을 먼저 마치거나 포기하세요.' : '';
}

export function itemFlowGetContentStartBlockReason(env, owner) {
    if (owner.pendingLoopReady) return '⏸️ 루프 진행 대기 중에는 콘텐츠를 시작할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.';
    return itemFlowGetHeldRunBlockReason(env, owner) || (env.deps.atlas.inMap(owner) ? env.deps.atlas.runOpenReason(owner) : '');
}
