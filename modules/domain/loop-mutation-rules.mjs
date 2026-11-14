

/** The mutation of a loop number: { immune, weak, empowered } (damage element keys), or null before LOOP_MUTATION.startLoop.
 * empowered: the element monsters attack harder with from LOOP_MUTATION.empowered.startLoop (empoweredElementOfLoop), else null. */
export function loopRuleMutationOfLoop(env, loop) {
    const index = Math.floor(Number(loop) || 0) - env.deps.LOOP_MUTATION.startLoop;
    if (index < 0) return null;
    const [immune, weak] = env.deps.LOOP_MUTATION.schedule[index % env.deps.LOOP_MUTATION.schedule.length];
    return { immune, weak, empowered: loopRuleEmpoweredElementOfLoop(env, loop, immune) };
}

/** 강화 변이시간선의 공격 강화 속성: 루프 번호로 굴린다. 면역 속성이 LOOP_MUTATION.empowered.immuneWeight, 다른 넷이 남은 몫을 똑같이
 * 나눈다. null before the empowered loops. */
export function loopRuleEmpoweredElementOfLoop(env, loop, immune) {
    const rule = env.deps.LOOP_MUTATION.empowered;
    if (Math.floor(Number(loop) || 0) < rule.startLoop) return null;
    const roll = env.deps.createSeededRng(`loop-mutation-empowered:${Math.floor(Number(loop))}`)();
    if (roll < rule.immuneWeight) return immune;
    const others = env.MUTATION_ELEMENTS.filter(ele => ele !== immune);
    return others[Math.min(others.length - 1, Math.floor((roll - rule.immuneWeight) / (1 - rule.immuneWeight) * others.length))];
}

/** This loop's mutation when the loop was entered under the rule, else null. */
export function loopRuleCurrentMutation(env, state) {
    return state && state.loopMutationSeason === state.season ? loopRuleMutationOfLoop(env, state.season) : null;
}

/** Whether it acts now: this loop's mutation, once the hero fights with a rune (not 기본 공격: the basic skill rests until its weapon). */
export function loopRuleMutationBites(env, state) {
    return !!loopRuleCurrentMutation(env, state) && !!state.activeSkill && state.activeSkill !== '기본 공격';
}

/** Damage-taken scale of an element on a monster: 0 for the immune element, 1 + LOOP_MUTATION.weakTakenPct / 100 for the weak
 * one, else 1 (also outside a mutation loop and for the woodsman). */
export function loopRuleTakenMul(env, owner, enemy, ele) {
    if (!enemy || enemy.isWoodsman || !loopRuleMutationBites(env, owner)) return 1;
    const rule = loopRuleMutationOfLoop(env, owner.season);
    if (ele === rule.immune) return 0;
    return ele === rule.weak ? 1 + env.deps.LOOP_MUTATION.weakTakenPct / 100 : 1;
}

/** 강화 변이시간선: what a monster hit adds before the player's mitigation, LOOP_MUTATION.empowered.addedPct% of the raw hit as the
 * empowered element ({ ele, amount }). The hit puts it through the same mitigation as its own damage of that element (js/combat.js
 * performMonsterAttacks). null while the rule does not bite, before the empowered loops and for the woodsman. */
export function loopRuleEmpoweredHit(env, owner, enemy, rawHit) {
    const rule = enemy && !enemy.isWoodsman && loopRuleMutationBites(env, owner) ? loopRuleMutationOfLoop(env, owner.season) : null;
    if (!rule || !rule.empowered) return null;
    const amount = Math.floor(rawHit * env.deps.LOOP_MUTATION.empowered.addedPct / 100);
    return amount > 0 ? { ele: rule.empowered, amount } : null;
}

/** Reward scale of a monster while the rule bites: 1 + LOOP_MUTATION.rewardPct / 100, or empowered.rewardPct in 강화 변이시간선;
 * 1 outside it and in the woodsman's zone. */
export function loopRuleRewardMul(env, zone, state) {
    const rule = (!zone || zone.type !== 'outsideChaos') && loopRuleMutationBites(env, state) ? loopRuleMutationOfLoop(env, state.season) : null;
    return rule ? 1 + loopRuleRewardPctOf(env, rule) / 100 : 1;
}

export function loopRuleRewardPctOf(env, rule) { return rule.empowered ? env.deps.LOOP_MUTATION.empowered.rewardPct : env.deps.LOOP_MUTATION.rewardPct; }

/** At a loop's start (after the loop number went up): mark it when the rule covers it. */
export function loopRuleBeginLoop(env, state) {
    state.loopMutationSeason = loopRuleMutationOfLoop(env, state.season) ? state.season : 0;
}

/** '화염 면역, 냉기 약점' for a mutation. */
export function loopRuleDescribeMutation(env, rule) {
    return `${loopRuleDescribeSides(env, rule)}, ${env.deps._t('보상 +{rewardPct}%', { rewardPct: loopRuleRewardPctOf(env, rule) })}`;
}

export function loopRuleDescribeSides(env, rule) {
    if (rule.empowered) return env.deps._t('{immune} 면역, {weak} 약점, {strong} 공격 강화', { immune: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.immune]),
        weak: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.weak]), strong: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.empowered]) });
    return env.deps._t('{DAMAGE_ELEMENT_LABELS} 면역, {DAMAGE_ELEMENT_LABELS2} 약점', { DAMAGE_ELEMENT_LABELS: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: env.deps._t(env.deps.DAMAGE_ELEMENT_LABELS[rule.weak]) });
}
