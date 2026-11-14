export function loopOrbitCenterHtml(runtime) {
    return runtime.handlers.isSeasonTreeEvolved() ? '' : `<div class="loop-orbit-center" aria-live="polite">${loopOrbitCenterBody(runtime)}</div>`;
}

export function loopOrbitCenterBody(runtime) {
    const node = runtime.shown ? runtime.deps.getSeasonPassiveNodeDef(runtime.shown) : null;
    return node ? loopNodeDetailHtml(runtime, runtime.shown, node) : loopOrbitTotalsHtml(runtime);
}

export function loopNodeValueText(runtime, node, lv) {
    const info = runtime.deps.P_STATS[node.stat] || {}, value = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
    return `${runtime.deps._t(String(info.name || node.stat)).replace(/s*(%)$/, '')} +${runtime.deps.formatValue(node.stat, value)}${info.isPct ? '%' : ''}`;
}

export function loopNodeStateText(runtime, id, node, lv) {
    const unlockLoop = runtime.deps.getSeasonPassiveUnlockLoop(id);
    if ((runtime.deps.game.season || 1) < unlockLoop) return runtime.deps._t('루프 {unlockLoop}에 열립니다', { unlockLoop });
    if (!runtime.handlers.isSeasonNodeRequirementMet(node)) return '이어진 노드를 먼저 활성화하세요';
    return lv > 0 ? runtime.deps._t('{lv}/{node}단계', { lv, node: runtime.handlers.getSeasonNodeCap(node) }) : '활성화할 수 있습니다';
}

export function loopNodeBuyHtml(runtime, id, node, lv) {
    const open = (runtime.deps.game.season || 1) >= runtime.deps.getSeasonPassiveUnlockLoop(id) && runtime.handlers.isSeasonNodeRequirementMet(node);
    if (!open || lv >= runtime.handlers.getSeasonNodeCap(node)) return '';
    return `<button type="button" data-loop-action="buy" data-loop-id="${id}" ${runtime.deps.game.seasonPoints > 0 ? '' : runtime.deps._t('disabled data-tip="루프 포인트가 없습니다"')}>${lv > 0 ? runtime.deps._t('강화') : runtime.deps._t('활성화')}</button>`;
}

export function loopNodeActionsHtml(runtime, id, node, lv) {
    const buy = loopNodeBuyHtml(runtime, id, node, lv);
    const refund = lv > 0 ? `<button type="button" data-loop-action="refund" data-loop-id="${id}">${runtime.deps._t('마름병 포자로 반환')}</button>` : '';
    return buy || refund ? `<span class="loop-orbit-actions">${buy}${refund}</span>` : '';
}

export function loopNodeDetailHtml(runtime, id, node) {
    const lv = runtime.handlers.getSeasonNodeLevel(id);
    return `<strong>${runtime.deps.escapeHTML(runtime.deps._t(node.name))}</strong><small>${runtime.deps.statToneText.html(runtime.deps._t(node.desc))}</small>
        ${lv > 1 ? `<em style="color:${runtime.deps.getItemStatToneColor(node.stat)}">${runtime.deps._t('지금 {node}', { node: runtime.deps.escapeHTML(loopNodeValueText(runtime, node, lv)) })}</em>` : ''}<b>${loopNodeStateText(runtime, id, node, lv)}</b>${loopNodeActionsHtml(runtime, id, node, lv)}`;
}

export function loopOrbitTotalsHtml(runtime) {
    const sums = new Map();
    Object.keys(runtime.deps.SEASON_NODES || {}).forEach(id => {
        const lv = runtime.handlers.getSeasonNodeLevel(id), node = runtime.deps.getSeasonPassiveNodeDef(id);
        if (lv > 0 && node) sums.set(node.stat, (sums.get(node.stat) || 0) + node.val * (1 + (lv - 1) * 0.2));
    });
    const total = [...sums].map(([stat, val]) => loopNodeValueText(runtime, { stat, val }, 1)).join(', ');
    return `<strong>${runtime.deps._t('우로보로스 원환')}</strong><small>${total ? `${runtime.deps._t('활성화한 노드의 합계')}: ${runtime.deps.statToneText.html(total)}` : runtime.deps._t('노드를 가리키면 그 효과가 여기에 나옵니다.')}</small>`;
}

export function loopPassiveHint(runtime, id) {
    runtime.shown = id;
    const center = runtime.deps.document.querySelector('#ui-season-tree .loop-orbit-center');
    if (center) center.innerHTML = loopOrbitCenterBody(runtime);
}

export function loopPassivePress(runtime, id) {
    const again = runtime.pressed === id, touch = typeof runtime.deps.matchMedia === 'function' && !runtime.deps.matchMedia('(hover: hover)').matches;
    runtime.pressed = id;
    loopPassiveHint(runtime, id);
    if (touch && !runtime.deps.uiDisplay.matches('(max-width: 1080px)') && !again) return;
    runtime.handlers.buySeason(id);
}
