

/** 블랙홀 · 안드로메다는 연결 판정을 바꾼다. 생기거나 사라지면 끊긴 투자를 정산한다. */
export function voidRuleIsRoutingTranscendent(entry) {
    return !!entry && ['blackHole', 'andromeda'].includes(entry.id);
}

export function voidRuleSyncPaleBlueDotPassivePoints(env, owner, previousEntry, nextEntry) {
    let previous = previousEntry && previousEntry.id === 'paleBlueDot' ? Number(previousEntry.value || 0) : 0;
    let next = nextEntry && nextEntry.id === 'paleBlueDot' ? Number(nextEntry.value || 0) : 0;
    if (previous === next) return;
    const budget = env.deps.passiveRouting.pointBudget(owner) - previous + next;
    env.deps.passiveRouting.reconcile(owner, env.deps.PASSIVE_TREE, env.deps.getPassiveRouting(owner), budget);
}

/** 연결이 바뀔 수 있는 일(초월 공허의 블랙홀 · 안드로메다가 생기거나 사라짐) 뒤에 끊긴 투자를 돌려받고 닿는 노드를 다시 센다. */
export function* voidRuleRefreshPassiveConnectivity(env, owner) {
    env.deps.passiveRouting.reconcile(owner, env.deps.PASSIVE_TREE, env.deps.getPassiveRouting(owner));
    (yield { kind: 'voidReachable', args: [] });
    (yield { kind: 'voidVisibility', args: [] });
}
