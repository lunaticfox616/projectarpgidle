/** The rule in numbers, for the chip's hover. */
export function mutationRuleText(runtime, rule) {
    if (rule.empowered) return (0, runtime.deps._t)('이번 루프의 모든 몬스터: {immune} 피해 면역, {weak} 피해 +{weakTakenPct}%, 공격에 {strong} 피해 {addedPct}% 추가', {
        immune: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.immune]), weak: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.weak]), strong: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.empowered]),
        weakTakenPct: runtime.deps.LOOP_MUTATION.weakTakenPct, addedPct: runtime.deps.LOOP_MUTATION.empowered.addedPct });
    return (0, runtime.deps._t)('이번 루프의 모든 몬스터: {DAMAGE_ELEMENT_LABELS} 피해 면역, {DAMAGE_ELEMENT_LABELS2} 피해 +{weakTakenPct}%', { DAMAGE_ELEMENT_LABELS: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.immune]), DAMAGE_ELEMENT_LABELS2: (0, runtime.deps._t)(runtime.deps.DAMAGE_ELEMENT_LABELS[rule.weak]), weakTakenPct: runtime.deps.LOOP_MUTATION.weakTakenPct });
}

/** The chip under the zone name (#ui-loop-mutation, before the held currencies): drawn again only when the loop's rule changes. */
export function updateMutationChip(runtime) {
    if (!runtime.active) return;
    const root = runtime.deps.document.getElementById('ui-loop-mutation');
    if (!root) return;
    const rule = runtime.deps.loopMutation.current();
    // 언어를 바꾸면 칩 글도 바뀌어야 하므로 언어도 같이 본다.
    const sign = rule ? `${runtime.deps.i18n.language}|${rule.immune}|${rule.weak}|${rule.empowered}` : '';
    if (sign === runtime.state.chipDrawn && root === runtime.state.chipRoot) return;
    runtime.state.chipRoot = root;
    runtime.state.chipDrawn = sign;
    root.hidden = !rule;
    root.innerHTML = rule ? `<i>${(0, runtime.deps._t)(rule.empowered ? '강화 변이' : '변이')}</i>${runtime.deps.loopMutation.partsHtml(rule)}` : '';
    root.dataset.tip = rule ? `${mutationRuleText(runtime, rule)}\n${(0, runtime.deps._t)('경험치, 장비와 재화 드랍 +{rewardPct}%', { rewardPct: runtime.deps.loopMutation.rewardPct(rule) })}` : '';
}

export function update(runtime) {
    updateMutationChip(runtime);
}

/** The settlement's line for the next loop's mutation, or none before the rule's first loop. */
export function nextLoopLines(runtime, loop) {
    const rule = runtime.deps.loopMutation.of(loop);
    return rule ? [(0, runtime.deps._t)('변이시간선: {describe}', { describe: runtime.deps.loopMutation.describe(rule) })] : [];
}
