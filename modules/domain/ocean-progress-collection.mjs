

export function oceanGetOceanFishingStrategyDef(env, owner, st) {
    let state = st || env.deps.ensureOceanState(owner);
    return env.deps.OCEAN_FISHING_STRATEGIES[state.fishingStrategy] || env.deps.OCEAN_FISHING_STRATEGIES.balanced;
}

export function oceanGetOceanFishCollectionProgress(env, owner, st) {
    let state = st || env.deps.ensureOceanState(owner);
    let discovered = Object.keys(env.deps.OCEAN_FISH_DB).filter(key => (state.fishCaughtTotal[key] || 0) > 0);
    let claimed = new Set(state.claimedCollectionMilestones || []);
    let milestones = env.deps.OCEAN_FISH_COLLECTION_MILESTONES.map(row => ({
        ...row,
        ready: discovered.length >= row.required,
        claimed: claimed.has(row.required)
    }));
    return { discovered, discoveredCount: discovered.length, totalCount: Object.keys(env.deps.OCEAN_FISH_DB).length, milestones };
}

export function oceanGetOceanFishCollectionBonus(env, owner, key, st) {
    let state = st || env.deps.ensureOceanState(owner);
    let claimed = new Set(state.claimedCollectionMilestones || []);
    return env.deps.OCEAN_FISH_COLLECTION_MILESTONES.reduce((sum, row) => {
        return sum + (claimed.has(row.required) ? Math.max(0, Number((row.bonus || {})[key]) || 0) : 0);
    }, 0);
}

export function* oceanSetOceanFishingStrategy(env, owner, strategyId) {
    let st = env.deps.ensureOceanState(owner);
    let strategy = env.deps.OCEAN_FISHING_STRATEGIES[strategyId];
    if (!strategy) return false;
    if (st.diving) { (yield { kind: 'progressLog', args: [env.deps._t('낚시 전략은 수면에서만 변경할 수 있습니다.'), 'attack-monster'] }); return false; }
    if (st.fishingStrategy === strategyId) return true;
    st.fishingStrategy = strategyId;
    (yield { kind: 'progressLog', args: [env.deps._t('{icon} 낚시 전략을 {name} 변경했습니다.', { icon: strategy.icon, name: env.deps.withDirectionParticle(`'${env.deps._t(strategy.name)}'`) }), 'loot-magic'] });
    yield { kind: 'progressOptionalSave', args: [200] };
    yield { kind: 'progressOptionalRefresh', args: [] };
    return true;
}

export function* oceanClaimOceanFishCollectionMilestone(env, owner, requiredCount) {
    let st = env.deps.ensureOceanState(owner);
    let required = Math.max(0, Math.floor(requiredCount || 0));
    let milestone = env.deps.OCEAN_FISH_COLLECTION_MILESTONES.find(row => row.required === required);
    let progress = oceanGetOceanFishCollectionProgress(env, owner, st);
    let status = progress.milestones.find(row => row.required === required);
    if (!milestone || !status || !status.ready || status.claimed) return false;
    st.claimedCollectionMilestones.push(required);
    for (const key of Object.keys(milestone.reward || {})) (yield { kind: 'progressAwardCurrency', args: [key, milestone.reward[key]] });
    (yield { kind: 'progressLog', args: [env.deps._t("📘 심해 도감 '{label}' 보상을 획득했습니다.", { label: env.deps._t(milestone.label) }), 'loot-unique'] });
    yield { kind: 'progressOptionalSave', args: [200] };
    yield { kind: 'progressOptionalRefresh', args: [] };
    return true;
}
