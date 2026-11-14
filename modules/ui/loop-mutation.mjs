/** Text-only presentation of mutation rules. No combat state or mutation ownership. */
export function renderLoopMutationPart(deps, ele, word) {
    return `<b style="--mutation-ele:${deps.getElementColor(ele)}">${deps.escapeHTML(deps._t(deps.labels[ele]))} ${deps.escapeHTML(deps._t(word))}</b>`;
}

export function renderLoopMutationParts(deps, rule, separator = '') {
    const parts = [renderLoopMutationPart(deps, rule.immune, '면역'), renderLoopMutationPart(deps, rule.weak, '약점')];
    if (rule.empowered) parts.push(renderLoopMutationPart(deps, rule.empowered, '공격 강화'));
    parts.push(`<b class="loop-mutation-reward">${deps.escapeHTML(deps._t('보상 +{rewardPct}%', { rewardPct: deps.rewardPct(rule) }))}</b>`);
    return parts.join(separator);
}
