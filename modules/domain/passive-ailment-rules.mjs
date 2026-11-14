

export function passiveRuleGetPassiveAshuraAilmentChance(baseChance, cycle) {
    const base = Math.max(0, Number(baseChance) || 0), cycleChance = Math.max(0, Number(cycle) || 0) / 100;
    return Math.min(1, base + cycleChance);
}

export function passiveRuleGetPassiveAshuraDamageMultiplier(env, element, ailments, cycle) {
    const ailmentType = env.deps.PASSIVE_AILMENT_BY_ELEMENT[element];
    const active = (Array.isArray(ailments) ? ailments : []).find(ailment => ailment
        && ailment.type === ailmentType && Number(ailment.time) > 0);
    if (!active) return 1;
    const remainingSeconds = Math.max(0, Number(active.time) || 0);
    const lessPct = Math.min(50, Math.max(0, Number(cycle) || 0) * remainingSeconds / 10);
    return 1 - lessPct / 100;
}

export function passiveRuleApplyPassiveAshuraDamageBreakdown(env, breakdown, ailments, cycle) {
    return (Array.isArray(breakdown) ? breakdown : []).map(row => ({
        ele: row.ele,
        amount: Math.max(0, Math.floor((Number(row.amount) || 0)
            * passiveRuleGetPassiveAshuraDamageMultiplier(env, row.ele, ailments, cycle)))
    })).filter(row => row.amount > 0);
}

export function passiveRuleApplyPassiveConditionalAilmentRules(passive, flags) {
    if (flags.explosiveDistill) {
        ['igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance']
            .forEach(statId => { passive[statId] += 25; });
    }
    if (flags.taintedWarhead) {
        passive.igniteChance += 20;
        passive.poisonChance += 20;
        passive.bleedChance += 20;
    }
    if (flags.blackDistill) passive.poisonChance += 20;
}
