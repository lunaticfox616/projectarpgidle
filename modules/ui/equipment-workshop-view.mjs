

export function showEncroachmentLiberationOverlay(deps, item, options) {
    let overlay = deps.document.getElementById('encroachment-liberation-overlay');
    if (!overlay) {
        deps.document.body.insertAdjacentHTML('beforeend', '<div id="encroachment-liberation-overlay" style="position:fixed;inset:0;background:rgba(6,4,14,.82);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
        overlay = deps.document.getElementById('encroachment-liberation-overlay');
    }
    let rows = options.map((stat, idx) => {
        let label = `${(0, deps._t)(stat.statName || (0, deps.getStatName)(stat.id))} +${(0, deps.formatValue)(stat.id, stat.val)}`;
        return `<button id="encroach-opt-${idx}" onclick="confirmEncroachmentLiberation(${idx})" disabled style="opacity:0;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease;pointer-events:none;display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border:1px solid #5a3f8f;border-radius:10px;background:linear-gradient(90deg,rgba(40,24,64,.92),rgba(24,16,40,.92));color:#e7d8ff;font-size:15px;cursor:pointer;"><span>${label}</span><span style="color:#b79bff;font-size:12px;">[T${stat.tier || 10}]</span></button>`;
    }).join('');
    overlay.innerHTML = `<div style="width:min(520px,calc(95vw / var(--scale-display-factor, 1)));background:#120c1e;border:1px solid #6a47b3;border-radius:14px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);">`
        + `<div style="color:#caa6ff;font-size:19px;font-weight:700;margin-bottom:4px;">${(0, deps._t)('잠식 해방')}</div>`
        + `<div style="color:#b9a7d8;font-size:13px;margin-bottom:14px;line-height:1.5;">${(0, deps._t)('[{name}], 최고 티어 옵션 셋 중', { name: item.name })} <strong style="color:#e7d8ff;">${(0, deps._t)('반드시 하나')}</strong>${(0, deps._t)('를 선택해야 합니다.')}</div>`
        + `<div style="display:grid;gap:10px;">${rows}</div>`
        + `<div id="encroach-hint" style="opacity:0;transition:opacity .5s ease;margin-top:12px;color:#9b86c4;font-size:12px;text-align:center;">${(0, deps._t)('옵션이 모두 드러나면 하나를 선택하세요.')}</div>`
        + `</div>`;
    options.forEach((_, idx) => {
        (0, deps.setTimeout)(() => {
            let el = deps.document.getElementById(`encroach-opt-${idx}`);
            if (!el) return;
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            if (idx === options.length - 1) {
                let hint = deps.document.getElementById('encroach-hint');
                if (hint) hint.style.opacity = '1';
            }
        }, 280 + idx * 620);
    });
}

export function hideEncroachmentLiberationOverlay(deps) {
    let overlay = deps.document.getElementById('encroachment-liberation-overlay');
    if (overlay) overlay.remove();
}

export async function useCurrency(deps, currencyKey) {
    const result = deps.craftCurrencyUse.use(currencyKey);
    if (result.reason) return (0, deps.addLog)(result.reason, 'attack-monster');
    result.logs.forEach(args => (0, deps.addLog)(...args));
    if (!result.ok) return undefined;
    (0, deps.updateStaticUI)();
    return true;
}
