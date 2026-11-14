

/** Efficiency from outside the 강화 steps, one row per source that gives any: {key, label, rate}. */
export function offlineGetOfflineEfficiencySources(env, state) {
    let rows = [
        { key: 'epoch', label: env.deps._t('고요한 시대'), rate: typeof env.deps.atlasEpoch === 'object' && state.atlas && state.atlas.epoch ? env.deps.atlasEpoch.offline(state) : 0 },
        { key: 'mastery', label: env.deps._t('무기 숙련'), rate: typeof env.deps.weaponMastery === 'object' ? env.deps.weaponMastery.offline(state) : 0 },
        { key: 'chronicle', label: env.deps._t('세계수 연대기'), rate: typeof env.deps.chronicle === 'object' ? env.deps.chronicle.offline(state) : 0 }
    ];
    return rows.filter(row => row.rate > 0);
}

/** The hours the settlement counts and the share of them fought, from the owned 강화 steps plus the outside sources (capped). */
export function offlineGetOfflineProgressConfig(env, state) {
    let owner = state || {};
    let hours = env.deps.OFFLINE_PROGRESS_RECOGNITION_HOURS[env.deps.contentProgression.rank('offlineHours', owner)];
    let baseRate = env.deps.OFFLINE_PROGRESS_EFFICIENCY_RATES[env.deps.contentProgression.rank('offlineRate', owner)];
    let recognitionLimitMs = hours * 60 * 60 * 1000;
    let efficiencySources = offlineGetOfflineEfficiencySources(env, owner);
    let rate = Math.min(env.deps.OFFLINE_PROGRESS_EFFICIENCY_CAP, efficiencySources.reduce((sum, row) => sum + row.rate, baseRate));
    return { recognitionLimitMs, efficiencyRate: rate, baseEfficiencyRate: baseRate, efficiencySources,
        effectiveLimitMs: recognitionLimitMs * rate, recognitionHours: hours };
}
