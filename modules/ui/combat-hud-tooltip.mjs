export function showEnemyTraitTooltip(runtime, event) {
    let anchor = event.currentTarget || (event.target && event.target.closest
            ? event.target.closest('.enemy-traits') : null);
    if (!anchor) return;
    let detail = anchor.getAttribute('data-enemy-trait-tooltip') || '';
    if (!detail) return runtime.handlers.showEnemyTraitTooltip.hide();
    let title = anchor.getAttribute('data-enemy-trait-kind') || '적 특성';
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)(title)}</div>`
        + String(detail).split('\n').map(line => `<div class="tooltip-line">${runtime.deps.statToneText.html(line)}</div>`).join('');
    const rect = anchor.getBoundingClientRect();
    runtime.handlers.showEnemyTraitTooltip.current = { anchor, detail, title };
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX || rect.left + rect.width / 2, event.clientY || rect.bottom, html, '#d99a8f', anchor);
}

export function onEnemyTraitKey(runtime, event) {
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    if (!['Enter', ' ', 'Escape'].includes(event.key)) return;
    event.stopPropagation();
    event.preventDefault();
    if (event.key === 'Escape') { event.currentTarget.blur(); runtime.handlers.showEnemyTraitTooltip.hide(); }
    else showEnemyTraitTooltip(runtime, event);
}

export function syncEnemyTraitTooltip(runtime) {
    const current = runtime.handlers.showEnemyTraitTooltip.current;
    if (!current) return;
    const { anchor, detail, title } = current;
    if (runtime.deps.activeInfoTooltipToken !== anchor) { runtime.handlers.showEnemyTraitTooltip.current = null; return; }
    if (!anchor.isConnected || anchor.style.display === 'none' || anchor.closest('[hidden]')) return runtime.handlers.showEnemyTraitTooltip.hide();
    if (detail !== (anchor.getAttribute('data-enemy-trait-tooltip') || '')
            || title !== (anchor.getAttribute('data-enemy-trait-kind') || '적 특성')) showEnemyTraitTooltip(runtime, { currentTarget: anchor });
}

export function hideEnemyTraitTooltip(runtime) {
    const anchor = runtime.handlers.showEnemyTraitTooltip.current?.anchor;
    runtime.handlers.showEnemyTraitTooltip.current = null;
    if (anchor && runtime.deps.activeInfoTooltipToken === anchor) (0, runtime.deps.hideInfoTooltip)();
}
