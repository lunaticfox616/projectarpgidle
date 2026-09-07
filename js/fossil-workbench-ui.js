// Presentation only; existing fossil domain actions retain validation and payment ownership.
function renderFossilWorkbench(selectedItem) {
    const mycologistLv = getExpertLevel('mycologist');
    const materialButtons = [
        { key: 'fossil', level: 0, label: '기본 화석 정제', action: 'applyFossilCraft()' },
        { key: 'fossilPrimal', level: 4, label: '원시 화석 복원', action: "restorePrimalFossil('normal')" },
        { key: 'fossilAncientPrimal', level: 5, label: '원시 고대 화석 복원', action: "restorePrimalFossil('ancient')" }
    ].filter(row => game.currencies[row.key] > 0).map(row => {
        const locked = mycologistLv < row.level;
        return `<button type="button" onclick="${row.action}" ${locked ? 'disabled' : ''}>${row.label} · 보유 ${game.currencies[row.key]}${locked ? ' · 균사학자 Lv.' + row.level + ' 필요' : ''}</button>`;
    });
    ['fossil', ...FOSSIL_DB.map(fossil => fossil.key)].forEach(fossilKey => {
        let surplusCost = typeof getFossilSurplusRefiningCost === 'function' ? getFossilSurplusRefiningCost(fossilKey) : null;
        let owned = Math.max(0, Math.floor(game.currencies[fossilKey] || 0));
        if (!surplusCost || owned <= 0) return;
        let sourceName = fossilKey === 'fossil' ? '미궁 화석' : ((FOSSIL_DB.find(row => row.key === fossilKey) || {}).name || fossilKey);
        materialButtons.push(`<button onclick="refineFossilSurplus('${fossilKey}')" ${mycologistLv < 4 || owned < surplusCost ? 'disabled' : ''}>${sourceName} 잉여 정제 (${owned}/${surplusCost})</button>`);
    });
    document.getElementById('ui-fossil-material-actions').innerHTML = materialButtons.join('') || '<p>정제할 화석이 없습니다.</p>';
    document.getElementById('ui-fossil-actions').innerHTML = FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).map(fossil =>
        `<article class="fossil-recipe"><strong>${escapeHTML(fossil.name)}</strong><p>${escapeHTML(fossil.desc)}</p><button type="button" onclick="applyFossilChaosCraft('${fossil.key}')" ${!selectedItem || selectedItem.corrupted ? 'disabled' : ''}>사용 · 1개 / 보유 ${game.currencies[fossil.key]}</button></article>`
    ).join('') || '<p>보유 중인 타입 화석이 없습니다.</p>';
}

safeExposeGlobals({ renderFossilWorkbench });
