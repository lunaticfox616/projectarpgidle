// Presentation only; existing fossil domain actions retain validation and payment ownership.
function renderFossilWorkbench() {
    // 원시 화석 복원 · 잉여 정제는 '해금'의 화석 복원이 연다(2026-10-01, 균사학자 Lv.4 · 5 대신).
    const restoreOpen = contentProgression.isUnlocked('fossilRestore');
    const materialButtons = [
        { key: 'fossil', restore: false, label: '기본 화석 정제', action: 'applyFossilCraft()' },
        { key: 'fossilPrimal', restore: true, label: '원시 화석 복원', action: "restorePrimalFossil('normal')" },
        { key: 'fossilAncientPrimal', restore: true, label: '원시 고대 화석 복원', action: "restorePrimalFossil('ancient')" }
    ].filter(row => game.currencies[row.key] > 0).map(row => {
        const locked = row.restore && !restoreOpen;
        return `<button type="button" onclick="${row.action}" ${locked ? 'disabled' : ''}>${row.label} · 보유 ${game.currencies[row.key]}${locked ? ' · 화석 복원 해금 필요' : ''}</button>`;
    });
    ['fossil', ...FOSSIL_DB.map(fossil => fossil.key)].forEach(fossilKey => {
        let surplusCost = typeof getFossilSurplusRefiningCost === 'function' ? getFossilSurplusRefiningCost(fossilKey) : null;
        let owned = Math.max(0, Math.floor(game.currencies[fossilKey] || 0));
        if (!surplusCost || owned <= 0) return;
        let sourceName = fossilKey === 'fossil' ? '미궁 화석' : ((FOSSIL_DB.find(row => row.key === fossilKey) || {}).name || fossilKey);
        materialButtons.push(`<button onclick="refineFossilSurplus('${fossilKey}')" ${!restoreOpen || owned < surplusCost ? 'disabled' : ''}>${sourceName} 잉여 정제 (${owned}/${surplusCost})</button>`);
    });
    document.getElementById('ui-fossil-material-actions').innerHTML = materialButtons.join('') || '<p>정제할 화석이 없습니다.</p>';
}

safeExposeGlobals({ renderFossilWorkbench });
