/** Presentation only; the existing fossil domain actions validate targets and own payment. */
export function renderFossilWorkbench(deps) {
    // 원시 화석 복원 · 잉여 정제는 '해금'의 화석 복원이 연다.
    const restoreOpen = deps.contentProgression.isUnlocked('fossilRestore');
    const materialButtons = [
        { key: 'fossil', restore: false, label: (0, deps._t)('기본 화석 정제'), action: 'applyFossilCraft()' },
        { key: 'fossilPrimal', restore: true, label: (0, deps._t)('원시 화석 복원'), action: "restorePrimalFossil('normal')" },
        { key: 'fossilAncientPrimal', restore: true, label: (0, deps._t)('원시 고대 화석 복원'), action: "restorePrimalFossil('ancient')" }
    ].filter(row => deps.game.currencies[row.key] > 0).map(row => {
        const locked = row.restore && !restoreOpen;
        return `<button type="button" onclick="${row.action}" ${locked ? 'disabled' : ''}>${(0, deps._t)('{label}, 보유 {currencies}{value}', { label: (0, deps._t)(row.label), currencies: deps.game.currencies[row.key], value: locked ? (0, deps._t)(', 화석 복원 해금 필요') : '' })}</button>`;
    });
    ['fossil', ...deps.FOSSIL_DB.map(fossil => fossil.key)].forEach(fossilKey => {
        let surplusCost = typeof deps.getFossilSurplusRefiningCost === 'function' ? (0, deps.getFossilSurplusRefiningCost)(fossilKey) : null;
        let owned = Math.max(0, Math.floor(deps.game.currencies[fossilKey] || 0));
        if (!surplusCost || owned <= 0) return;
        let sourceName = fossilKey === 'fossil' ? '미궁 화석' : ((deps.FOSSIL_DB.find(row => row.key === fossilKey) || {}).name || fossilKey);
        materialButtons.push(`<button onclick="refineFossilSurplus('${fossilKey}')" ${!restoreOpen || owned < surplusCost ? 'disabled' : ''}>${sourceName} 잉여 정제 (${owned}/${surplusCost})</button>`);
    });
    deps.document.getElementById('ui-fossil-material-actions').innerHTML = materialButtons.join('') || '<p>정제할 화석이 없습니다.</p>';
}
