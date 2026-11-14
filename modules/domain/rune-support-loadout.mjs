

export function* runeFlowNormalizeSupportLoadout(env, owner, logChange, knownStats, hadOverflowKeystone = false) {
    let stats = knownStats;
    if (!stats) {
        let statsProvider = env.deps.supportStatsProvider;
        if (!statsProvider) return false;
        stats = statsProvider();
    }
    let cap = Math.max(0, Math.floor((stats || {}).suppCap || 0));
    const resonanceCap = env.deps.gemDropRewards.normalizationResonanceCap(owner, stats, hadOverflowKeystone);
    const { equippedSupports, removed } = env.deps.supportRules.normalize(owner, cap, resonanceCap);
    if (!removed.length) return false;
    owner.equippedSupports = equippedSupports;
    if (logChange) (yield { kind: 'runeLog', args: [env.deps._t('🟢 장착 한도, 공명력 또는 연결 제약으로 자동 해제: {removed}', { removed: removed.join(', ') }), "attack-monster"] });
    env.deps.playerStatCache.invalidate();
    return removed.length > 0;
}
