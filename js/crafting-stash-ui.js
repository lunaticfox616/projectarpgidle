// 제작실의 재화 보관함(2026-11-06 사용자: "주 재화 4개만 보이는 방식 말고 POE식으로 재화 보관함", 같은 날 "재화 테마(탭)별로 묶고").
// 재화 테마마다 탭이 하나이고, 탭 안은 쓰임새 묶음이다. 재화는 늘 같은 칸에 있고 칸 왼쪽 위에 가진 수가 보인다. 다 쓴 재화는 그림이
// 흐리고, 아직 얻지 못한 재화(craftingCatalogUi.visible)는 빈 칸이다. 누르기는 js/crafting-workspace-ui.js workspaceClick이 받는다:
// 탭(data-stash-tab)은 넘기고, 제작 재화(data-recipe)는 쓸 재화로 고르고 화석 재료는 수확/화석 정제 칸을 열며, 뿌리(data-omen)는
// 함께 쓰도록 걸고 다시 누르면 푼다. 그림 칸은 css/crafting-workspace.css .cl-stash.
const craftingStashUi = (() => {
    // icon: 탭에 붙는 재화 그림. cols: 묶음의 열 수(칸이 넘치면 다음 줄). 한 줄에 여섯 칸까지 들고(화석 탭) 세 칸 높이까지 쌓으며,
    // 판이 좁으면 묶음이 다음 줄로 내려간다(기본 재화).
    const TABS = Object.freeze([
        { id: 'basic', label: '기본 재화', icon: 'formlessDew', groups: [
            { label: '등급', cols: 3, keys: ['magicBud', 'sapBud', 'formlessDew'] },
            { label: '수치', cols: 2, keys: ['goldenRule', 'blessing'] },
            { label: '제거', cols: 2, keys: ['blightSpore', 'pruningShears'] },
            { label: '진화', cols: 1, keys: ['fairyRing'] }] },
        { id: 'special', label: '특수 제작', icon: 'emberBranch', groups: [
            { label: '타락', cols: 1, keys: ['emberBranch', 'burningEmberBranch'] },
            { label: '고정', cols: 1, keys: ['ouroboros', 'enchantedHoney'] },
            { label: '부여', cols: 2, keys: ['venomStinger', 'voidChisel', 'oceanRerollShard'] },
            { label: '제단', cols: 1, keys: ['altarEmber', 'altarIchor'] }] },
        { id: 'quality', label: '퀄리티', icon: 'catalystFire', groups: [
            { label: '강화', cols: 1, keys: ['deepWhetstone', 'rootIron', 'jewelPolish'] },
            { label: '속성', cols: 4, keys: ['abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold', 'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon'] }] },
        { id: 'fossil', label: '화석', icon: 'fossilJagged', groups: [
            { label: '정제', cols: 1, keys: ['fossil', 'fossilPrimal', 'fossilAncientPrimal'] },
            { label: '화석', cols: 5, keys: ['fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic', 'fossilAbyssal', 'fossilPrimordial', 'fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift'] }] },
        { id: 'omen', label: '뿌리', icon: 'omenWeave', groups: [
            { label: '제작 뿌리', cols: 5, keys: ['omenPruning', 'omenCompost', 'omenWeave', 'omenPyre', 'omenHunger'] }] }
    ]);
    const esc = value => escapeHTML(String(value));
    let shownTab = '';

    const stashTabOf = key => TABS.find(tab => tab.groups.some(group => group.keys.includes(key)));

    /** One slot: the picture, the held count in the corner, and the name, count and short effect on hover (stashTip).
     * data-info-tooltip-anchor: js/ui.js's mousemove guard keeps the card while the pointer stays on the slot. */
    function stashCellHtml(key, picked) {
        if (!craftingCatalogUi.visible(key)) return '<span class="cl-stash-cell is-blank" aria-hidden="true"></span>';
        const amount = game.currencies[key] || 0, name = craftingCatalogUi.name(key), omen = CRAFT_OMENS.keys.includes(key);
        const on = omen ? picked.omen === key : picked.recipe === key;
        const count = amount.toLocaleString(i18n.locale), held = _t('보유 {currencies}', { currencies: count });
        return `<button type="button" id="cl-stash-${key}" class="cl-stash-cell${amount ? '' : ' is-empty'}${on ? ' is-on' : ''}" data-theme="${craftingCatalogUi.theme(key)}"
            ${omen ? 'data-omen' : 'data-recipe'}="${key}" aria-pressed="${on}" aria-label="${esc(name)}, ${esc(held)}" data-info-tooltip-anchor="1"
            onpointerenter="craftingStashUi.tip(event,'${key}')" onpointerleave="hideInfoTooltip()"><img src="${esc(ORB_DB[key].icon)}" alt="" draggable="false">${amount ? `<b>${count}</b>` : ''}</button>`;
    }

    /** The hover card of a slot, mouse only (2026-11-07 사용자: 재화별 툴팁에도 색감): the name in its own colour on its theme's tone
     * (css/crafting-workspace.css .cl-stash-tip), the held count (red when none), and the effect with its keywords coloured as in the
     * currency list (craftingCatalogUi.description). The card's edge takes the theme's tone. */
    function stashTip(event, key) {
        if (event.pointerType !== 'mouse') return;
        const amount = game.currencies[key] || 0;
        const held = _t('보유 {currencies}', { currencies: amount.toLocaleString(i18n.locale) });
        const html = `<div class="cl-stash-tip"><div class="tooltip-title">${craftingCatalogUi.styledName(key)}</div>`
            + `<div class="tooltip-line cl-stash-tip-held${amount ? '' : ' is-empty'}">${esc(held)}</div>`
            + `<div class="tooltip-line cl-stash-tip-effect">${craftingCatalogUi.description(key, true)}</div></div>`;
        const tone = getComputedStyle(event.currentTarget).getPropertyValue('--resource-tone').trim();
        showInfoTooltipHtml(event.clientX, event.clientY, html, tone || '#a98546', `stash:${key}:${amount}`);
    }

    function stashGroupHtml(group, picked) {
        return `<div class="cl-stash-group" style="--cl-stash-cols:${group.cols}"><small>${esc(_t(group.label))}</small>${group.keys.map(key => stashCellHtml(key, picked)).join('')}</div>`;
    }

    /** A tab: its currency's picture and name, and a gold mark when the chosen currency or the armed omen is in it. */
    function stashTabHtml(tab, current, picked) {
        const keys = tab.groups.flatMap(group => group.keys);
        const marked = keys.includes(picked.recipe) || keys.includes(picked.omen);
        return `<button type="button" id="cl-stash-tab-${tab.id}" class="cl-stash-tab${marked ? ' has-pick' : ''}" role="tab" data-stash-tab="${tab.id}"
            aria-selected="${tab === current}" aria-controls="cl-stash-page"><img src="${esc(ORB_DB[tab.icon].icon)}" alt="" draggable="false"><span>${esc(_t(tab.label))}</span></button>`;
    }

    /**
     * @param {{recipe: string, omen: string}} picked the currency chosen for the craft and the armed omen ('' for none)
     * @returns {string} the tab row and the shown tab's slots (first shown: the tab of the chosen currency)
     */
    function stashHtml(picked) {
        craftingCatalogUi.capture();
        const current = TABS.find(tab => tab.id === shownTab) || stashTabOf(picked.recipe) || TABS[0];
        shownTab = current.id;
        return `<div class="cl-stash-box"><div class="cl-stash-tabs" role="tablist" aria-label="${esc(_t('재화 보관함'))}">${TABS.map(tab => stashTabHtml(tab, current, picked)).join('')}</div>
            <div class="cl-stash" id="cl-stash-page" role="tabpanel" aria-labelledby="cl-stash-tab-${current.id}">${current.groups.map(group => stashGroupHtml(group, picked)).join('')}</div></div>`;
    }

    /** Shows a tab (data-stash-tab); an unknown id is ignored. */
    function stashShowTab(id) {
        if (TABS.some(tab => tab.id === id)) shownTab = id;
    }

    return Object.freeze({ html: stashHtml, showTab: stashShowTab, tip: stashTip });
})();
safeExposeGlobals({ craftingStashUi });
