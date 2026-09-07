// Mobile presentation reuses the domain's investment/refund checks and the existing confirmation flow.
const expertiseMobileUi = (() => {
    let branch = 'common';

    function navigation(unlocked, treeUnlocked) {
        const selected = game.expertise.selectedExpertTab;
        const treeLabel = treeUnlocked ? '전문가 노드 트리' : '전문가 노드 트리(잠김)';
        const mobile = uiDisplay.matches('(max-width: 1080px)');
        document.getElementById('ui-expert-subtabs').classList.toggle('subtab-row', !mobile);
        if (!mobile) {
            return unlocked.map(id => `<button class="subtab-btn ${selected === id ? 'active' : ''}" onclick="game.expertise.selectedExpertTab='${id}';updateStaticUI();">${EXPERT_DEFS[id].icon} ${EXPERT_DEFS[id].name}</button>`).join('')
                + `<button class="subtab-btn ${selected === '__tree' ? 'active' : ''}" onclick="game.expertise.selectedExpertTab='__tree';updateStaticUI();">${treeLabel}</button>`;
        }
        const rows = [...unlocked.map(id => ({ id, label: EXPERT_DEFS[id].name })), { id: '__tree', label: treeLabel }];
        return `<label class="expert-mobile-selector">전문화<select data-expert-screen>${rows.map(row => `<option value="${row.id}"${row.id === selected ? ' selected' : ''}>${row.label}</option>`).join('')}</select></label>`;
    }

    function card(node) {
        const can = canAllocateExpertNode(node.id);
        const refund = canUntrainExpertNode(node.id) && game.currencies.blightSpore >= 1;
        return `<article class="expert-mobile-node" data-expert-node="${node.id}">
            ${buildExpertNodeTooltipHtml(node)}
            <div class="expert-mobile-actions"><button type="button" class="expertise-node"${can ? '' : ' disabled'} onclick="allocateExpertNode('${node.id}')&&updateStaticUI()">투자 · ${node.cost}P</button>
            <button type="button"${refund ? '' : ' disabled'} onclick="askUntrainExpertNode('${node.id}')">반환 · 포자 1</button></div>
        </article>`;
    }

    function tree(groups) {
        const options = Object.keys(groups).map(id => `<option value="${id}"${id === branch ? ' selected' : ''}>${getExpertBranchTheme(id).label} · 투자 ${getExpertBranchSpent(id)}P</option>`).join('');
        return `<label class="expert-mobile-selector">투자 분기<select data-expert-branch>${options}</select></label>
            <div class="expert-mobile-nodes">${groups[branch].map(card).join('')}</div>`;
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('tab-expertise').addEventListener('change', event => {
            if (event.target.matches('[data-expert-screen]')) game.expertise.selectedExpertTab = event.target.value;
            else if (event.target.matches('[data-expert-branch]')) branch = event.target.value;
            else return;
            updateStaticUI();
        });
    }, { once: true });
    return { navigation, tree };
})();
safeExposeGlobals({ expertiseMobileUi });
