export function getCurrencyIconHtml(runtime, orbKey, className = 'currency-icon') {

    let icon = runtime.deps.ORB_DB[orbKey] && runtime.deps.ORB_DB[orbKey].icon;
    return icon ? `<img class="${className}" src="${icon}" alt="" aria-hidden="true">` : '';

}

export function showCurrencyCardTooltip(runtime, event, key, reason) {

    let orb = runtime.deps.ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title currency-tooltip-title">${getCurrencyIconHtml(runtime, key, 'currency-tooltip-icon')}<span>${(0, runtime.deps._t)(orb.name)}</span></div><div class="tooltip-line">${(0, runtime.deps._t)(orb.desc) || ''}</div><div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${(0, runtime.deps._t)('상태: {reason}', { reason: reason || '-' })}</div>`;
    (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, html, '#f1c40f');

}
