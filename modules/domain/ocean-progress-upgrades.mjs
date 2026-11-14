

export function oceanGetOceanPermanentUpgradeCost(env, owner, key) {
    let def = env.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return null;
    let level = env.deps.getOceanPermanentUpgradeLevel(key, owner);
    if (level >= def.maxLevel) return null;
    let nextLevel = level + 1;
    return {
        skyEssence: 4 + nextLevel * 2,
        oceanRerollShard: 1 + Math.floor(nextLevel / 3),
        reefFragment: 2 + Math.floor(nextLevel / 2),
        bossCore: nextLevel % 3 === 0 ? Math.max(1, Math.floor(nextLevel / 3)) : 0
    };
}

export function oceanCanPayOceanUpgradeCost(owner, cost) {
    if (!cost) return false;
    return Object.keys(cost).every(key => (owner.currencies[key] || 0) >= (cost[key] || 0));
}

export function oceanPayOceanUpgradeCost(owner, cost) {
    Object.keys(cost).forEach(key => {
        owner.currencies[key] = Math.max(0, (owner.currencies[key] || 0) - (cost[key] || 0));
    });
}

export function* oceanUpgradeOceanPermanent(env, owner, key) {
    let st = env.deps.ensureOceanState(owner);
    let def = env.deps.OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return false;
    let cost = oceanGetOceanPermanentUpgradeCost(env, owner, key);
    if (!cost) return (yield { kind: 'progressLog', args: [env.deps._t('{label} 업그레이드는 이미 최대 단계입니다.', { label: env.deps._t(def.label) }), 'attack-monster'] });
    if (!oceanCanPayOceanUpgradeCost(owner, cost)) return (yield { kind: 'progressLog', args: [env.deps._t('{label} 업그레이드 재료가 부족합니다. (필요: {cost})', { label: env.deps._t(def.label), cost: (yield { kind: 'progressCostText', args: [cost] }) }), 'attack-monster'] });
    oceanPayOceanUpgradeCost(owner, cost);
    st.permanentUpgrades[key] = env.deps.getOceanPermanentUpgradeLevel(key, owner) + 1;
    st.oxygenMax = Math.max(1, Math.floor(env.deps.getOceanOxygenMax(owner)));
    st.oxygenCur = Math.min(st.oxygenMax, (st.oxygenCur || 0) + (key === 'oxygenMax' ? def.valuePerLevel : 0));
    (yield { kind: 'progressLog', args: [env.deps._t('🌊 심해 영구 업그레이드: {label} Lv.{permanentUpgrades} 달성', { label: env.deps._t(def.label), permanentUpgrades: st.permanentUpgrades[key] }), 'loot-rare'] });
    (yield { kind: 'progressRefresh', args: [] });
    (yield { kind: 'progressSave', args: [200] });
    return true;
}

export function* oceanInstallOceanReefFragment(env, owner) {
    let st = env.deps.ensureOceanState(owner);
    if (!st.unlocked) return false;
    if (st.reefInstalled >= 10) return (yield { kind: 'progressLog', args: [env.deps._t('암초 조각을 더 설치할 수 없습니다 (최대치).'), 'attack-monster'] });
    if ((owner.currencies.reefFragment || 0) < 1) return (yield { kind: 'progressLog', args: [env.deps._t('암초 조각이 부족합니다.'), 'attack-monster'] });
    owner.currencies.reefFragment -= 1;
    st.reefInstalled = Math.max(0, Math.floor(st.reefInstalled || 0)) + 1;
    (yield { kind: 'progressLog', args: [env.deps._t('🪸 암초 조각을 설치했습니다. (낚시 게이지 충전 +{value}%)', { value: st.reefInstalled * 15 }), 'loot-rare'] });
    (yield { kind: 'progressSave', args: [200] });
}
