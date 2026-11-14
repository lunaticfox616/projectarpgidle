

export function* workshopApplyChaosInfusion(env, owner, item, optionId) {
    if (!item) return (yield { kind: 'workshopLog', args: [env.deps._t('혼돈 주입 대상 아이템을 선택하세요.'), 'attack-monster'] });
    let eligibility = env.deps.isChaosInfusionEligibleItem(item);
    if (!eligibility.ok) return (yield { kind: 'workshopLog', args: [eligibility.reason, 'attack-monster'] });
    let option = env.deps.getChaosInfuserOption(optionId);
    if (!option || !env.deps.P_STATS[option.id]) return;
    if (!env.deps.getChaosInfuserOptionsForItem(item).some(opt => (opt.optionId || opt.id) === (option.optionId || option.id))) return (yield { kind: 'workshopLog', args: [env.deps._t('이 부위에는 해당 혼돈 주입 옵션을 사용할 수 없습니다.'), 'attack-monster'] });
    let costs = env.deps.getChaosInfusionCost(option, item);
    if (!env.deps.canPayCurrencyCosts(owner, costs)) return (yield { kind: 'workshopLog', args: [env.deps._t('혼돈 주입 재화가 부족합니다. (필요: {costs})', { costs: (yield { kind: 'workshopCurrencyCosts', args: [costs] }) }), 'attack-monster'] });
    if (!env.deps.payCurrencyCosts(owner, costs)) return;
    let infusion = env.deps.rollChaosInfusionOption(option);
    item.chaosInfusion = infusion;
    (yield { kind: 'workshopLog', args: [env.deps._t('🧪 혼돈 주입: [{name}] {id} +{value} 부여', { name: env.deps._t(item.name), id: env.deps.getStatName(option.id), value: env.deps.formatValue(option.id, infusion.val) }), 'loot-rare'] });
    env.deps.normalizeItem(item);
    (yield { kind: 'workshopRefresh', args: [] });
}

export function* workshopRemoveChaosInfusion(env, owner, item) {
    if (!item || !item.chaosInfusion) return;
    let costs = [{ key: 'blightSpore', amount: 1 }];
    if (!env.deps.canPayCurrencyCosts(owner, costs)) return (yield { kind: 'workshopLog', args: [env.deps._t('혼돈 주입 제거에는 {name} 1개가 필요합니다.', { name: env.deps._t(env.deps.ORB_DB.blightSpore.name) }), 'attack-monster'] });
    if (!env.deps.payCurrencyCosts(owner, costs)) return;
    item.chaosInfusion = null;
    (yield { kind: 'workshopLog', args: [env.deps._t('🧼 혼돈 주입 제거: [{name}]', { name: env.deps._t(item.name) }), 'loot-normal'] });
    (yield { kind: 'workshopRefresh', args: [] });
}
