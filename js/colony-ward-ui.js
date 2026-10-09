// Ward presentation only. Existing equip/salvage handlers own all mutations.
(function () {
    'use strict';

    function refreshWardSection(panel, selector, html) {
        const section = panel.querySelector(selector);
        if (section.__wardHtml === html) return;
        section.innerHTML = html;
        section.__wardHtml = html;
    }

    const wardTone = ward => getItemStatToneColor(ward.stat);

    /** Slot cards (2026-10-09; locked slots each repeated "미해금 슬롯 N, 편린으로 슬롯 확장"): a worn ward in its stat colour with 해제,
     *  an empty slot dashed, the next locked slot as the unlock button with its cost bars, later locked slots only a padlock. */
    function wardSlot(c, ward, index) {
        const label = `<span class="colony-ward-slot-label">슬롯 ${index + 1}</span>`;
        if (index === c.wardSlots) return wardNextSlot(index);
        if (index > c.wardSlots) return `<article class="colony-ward-slot is-locked" data-ward-slot="${index}">${label}<span class="colony-ward-lock" aria-label="잠김"></span></article>`;
        if (!ward) return `<article class="colony-ward-slot is-empty" data-ward-slot="${index}">${label}<strong>비어 있음</strong></article>`;
        return `<article class="colony-ward-slot is-worn" data-ward-slot="${index}" style="--ward-tone:${wardTone(ward)}">${label}<strong>${escapeHTML(getColonyWardValueText(ward))}</strong>
            <button onclick="unequipColonyWard(${index})" ${game.woodsmanBuildLock ? 'disabled' : ''}>해제</button></article>`;
    }

    function wardNextSlot(index) {
        const cost = getColonyWardSlotCost(index + 1);
        const blocked = game.woodsmanBuildLock || game.season < 15 || !canPayColonyWardCost(cost);
        const rows = Object.keys(cost).map(key => {
            const have = Math.max(0, Math.floor(game.currencies[key] || 0));
            return `<span class="colony-ward-need${have < cost[key] ? ' is-short' : ''}"><small>${escapeHTML(getCurrencyInfo(key).name)}</small><b>${have}/${cost[key]}</b>`
                + `<i class="colony-ward-bar"><i style="width:${Math.min(100, have / cost[key] * 100).toFixed(1)}%"></i></i></span>`;
        }).join('');
        return `<button type="button" class="colony-ward-slot is-next" data-ward-slot="${index}" onclick="unlockColonyWardSlot()" ${blocked ? 'disabled' : ''}>`
            + `<span class="colony-ward-slot-label">슬롯 ${index + 1} 열기</span>${rows}</button>`;
    }

    function wardCard(ward, query, full) {
        const id = escapeHTML(JSON.stringify(ward.id));
        const locked = isLockedInventoryObject(ward);
        const blocked = game.woodsmanBuildLock || game.season < 15;
        return `<article class="colony-ward-chip" data-ward-id="${escapeHTML(ward.id)}" style="--ward-tone:${wardTone(ward)}">
            <strong>${highlightColonyWardSearchText(getColonyWardValueText(ward), query)}</strong>
            <div class="colony-ward-card-actions">
                <button onclick="selectColonyWard(${id})" ${blocked ? 'disabled' : ''}>${full ? '교체' : '장착'}</button>
                <button onclick="toggleColonyWardLock(${id})" aria-pressed="${locked}">${locked ? '잠금 해제' : '잠금'}</button>
                <button onclick="dismantleColonyWardById(${id})" ${locked || blocked ? 'disabled' : ''}>해체, 편린 +${getColonyWardDismantleReward(ward)}</button>
            </div></article>`;
    }

    function wardTotals(c) {
        const totals = {};
        c.wardEquipped.slice(0, c.wardSlots).filter(Boolean).forEach(ward => {
            totals[ward.stat] = (totals[ward.stat] || 0) + Number(ward.val);
        });
        return Object.entries(totals).map(([stat, val]) => `<li style="--ward-tone:${wardTone({stat})}">${escapeHTML(getColonyWardValueText({stat, val}))}</li>`).join('')
            || '<li class="is-none">장착된 액막이가 없습니다.</li>';
    }

    function wardInventory(panel, c, targetId) {
        const query = getColonyWardSearchQuery();
        const matched = c.wardInventory.filter(ward => matchColonyWardSearchQuery(getColonyWardSearchText(ward), query));
        const available = c.wardInventory.filter(ward => !isLockedInventoryObject(ward));
        const matchCount = available.filter(ward => matched.includes(ward)).length;
        const blocked = !!game.woodsmanBuildLock;
        const actions = `<button onclick="bulkDismantleColonyWardsBySearch(false)" ${blocked || !matchCount ? 'disabled' : ''}>검색 항목 해체</button>
            <button onclick="bulkDismantleColonyWardsBySearch(true)" ${blocked || available.length === matchCount ? 'disabled' : ''}>미검색 항목 해체</button>`;
        const full = c.wardEquipped.slice(0, c.wardSlots).every(Boolean);
        const cards = matched.map(ward => wardCard(ward, query, full)).join('');
        refreshWardSection(panel, '.colony-ward-inventory-title', `보유 액막이 <span>${matched.length}/${c.wardInventory.length}</span>`);
        renderSearchSection(`${targetId}-inventory`, 'colonyWard', '액막이 옵션 검색 (이름/옵션/수치)', cards,
            `<p class="colony-ward-empty">${c.wardInventory.length ? '검색 조건에 맞는 액막이가 없습니다.' : '5웨이브마다 액막이를 얻습니다.'}</p>`, actions);
    }

    function renderColonyWardView(targetId) {
        const panel = document.getElementById(targetId);
        if (!panel) return;
        if (!panel.querySelector('.colony-ward-panel')) {
            panel.innerHTML = `<section class="colony-ward-panel" aria-label="군락지 액막이">
                <header class="colony-ward-hero"><div><h3>군락지 액막이</h3><p>모든 전투에 적용</p></div><div class="colony-ward-currency"></div></header>
                <p class="colony-ward-locked" hidden>루프 15부터 사용할 수 있습니다.</p>
                <h4 class="colony-ward-slots-title"></h4><div class="colony-ward-grid"></div>
                <section class="colony-ward-section"><h4>적용 효과</h4><ul class="colony-ward-total"></ul></section>
                <section class="colony-ward-section"><h4 class="colony-ward-inventory-title"></h4><div id="${targetId}-inventory" class="colony-ward-inventory"></div></section>
            </section>`;
        }
        const c = normalizeColonyWardState();
        panel.querySelector('.colony-ward-locked').hidden = game.season >= 15;
        refreshWardSection(panel, '.colony-ward-currency', `<span>편린 <b>${game.currencies.colonyShard || 0}</b></span><span>흔적 <b>${game.currencies.colonyTrace || 0}</b></span>`);
        refreshWardSection(panel, '.colony-ward-slots-title', `장착 슬롯 <span>${c.wardSlots}/${COLONY_WARD_MAX_SLOTS}</span>`);
        refreshWardSection(panel, '.colony-ward-grid', c.wardEquipped.map((ward, i) => wardSlot(c, ward, i)).join(''));
        refreshWardSection(panel, '.colony-ward-total', wardTotals(c));
        wardInventory(panel, c, targetId);
    }

    // Capture destination identities so an outstanding choice cannot replace a different loadout.
    async function selectColonyWard(id) {
        if (!assertBuildEditable() || game.season < 15) return;
        const c = normalizeColonyWardState();
        const slots = c.wardEquipped.slice(0, c.wardSlots);
        if (slots.some(ward => !ward)) { equipColonyWardById(id); return; }
        const incoming = c.wardInventory.find(ward => ward.id === id);
        if (!incoming) return;
        const slot = await requestGameChoice({title: '액막이 교체', message: `${getColonyWardValueText(incoming)}\n교체할 슬롯을 선택하세요. 기존 액막이는 보관됩니다.`,
            confirmLabel: '교체', submitOnChoice: true,
            choices: slots.map((ward, index) => ({value: index, label: `슬롯 ${index + 1}`, detail: getColonyWardValueText(ward)}))});
        if (slot === null || game.colony !== c) return;
        equipColonyWardById(id, slot, slots[slot].id);
    }

    safeExposeGlobals({renderColonyWardView, selectColonyWard});
})();
