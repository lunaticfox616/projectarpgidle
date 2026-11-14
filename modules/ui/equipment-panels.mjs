export function isCraftSelectionEquipAvailableLocal(runtime) {
    return typeof runtime.deps.isCraftSelectionEquip === 'function' && (0, runtime.deps.isCraftSelectionEquip)();
}

export function getCraftSelectionRefLocal(runtime) {
    return typeof runtime.deps.getCraftSelectionRef === 'function' ? (0, runtime.deps.getCraftSelectionRef)() : null;
}

export function handleEquipmentSlotDoubleClick(runtime, slot) {
    (0, runtime.deps.unequipItem)(slot);
}

export function getDropOnlyItemSourceMeta(runtime, item) {
    if (!item) return null;
    let base = runtime.deps.BASE_ITEM_DB.find(row => row && ((item.baseId && row.id === item.baseId) || (row.slot === String(item.slot || '').replace(/[12]/, '') && row.name === item.baseName)));
    let unique = runtime.deps.UNIQUE_DB.find(row => row && row.name === item.name && Array.isArray(row.slots) && row.slots.includes(String(item.slot || '').replace(/[12]/, '')));
    let dropOnly = dropOnlyRule(base, unique);
    let sourceKey = dropOnly ? (dropOnly.type || dropOnly.id || null) : null;
    if (!sourceKey && base && base.realmBase) sourceKey = `realm_${base.realmBase}`;
    let map = {
        beehive: { badgeClass: 'item-source-badge item-source-badge--beehive', toneClass: 'item-source-tone--beehive', label: (0, runtime.deps._t)('벌집 한정') },
        trial: { badgeClass: 'item-source-badge item-source-badge--trial', toneClass: 'item-source-tone--trial', label: (0, runtime.deps._t)('시련 한정') },
        rift: { badgeClass: 'item-source-badge item-source-badge--rift', toneClass: 'item-source-tone--rift', label: (0, runtime.deps._t)('균열 한정') },
        meteor: { badgeClass: 'item-source-badge item-source-badge--meteor', toneClass: 'item-source-tone--meteor', label: (0, runtime.deps._t)('운석 한정') },
        labyrinth: { badgeClass: 'item-source-badge item-source-badge--ancient-labyrinth', toneClass: 'item-source-tone--ancient-labyrinth', label: (0, runtime.deps._t)('고대 미궁 한정') },
        ancient_labyrinth: { badgeClass: 'item-source-badge item-source-badge--ancient-labyrinth', toneClass: 'item-source-tone--ancient-labyrinth', label: (0, runtime.deps._t)('고대 미궁 한정') },
        grand_breach_run: { badgeClass: 'item-source-badge item-source-badge--rift', toneClass: 'item-source-tone--rift', label: (0, runtime.deps._t)('대균열 한정') },
        atlasLate: { badgeClass: 'item-source-badge item-source-badge--atlas-late', toneClass: 'item-source-tone--atlas-late', label: (0, runtime.deps._t)('아틀라스 한정') },
        seasonBoss: { badgeClass: 'item-source-badge item-source-badge--root-boss', toneClass: 'item-source-tone--root-boss', label: (0, runtime.deps._t)('보스 한정') },
        skyTower: { badgeClass: 'item-source-badge item-source-badge--sky-tower', toneClass: 'item-source-tone--sky-tower', label: (0, runtime.deps._t)('창공의 탑 한정') },
        colony: { badgeClass: 'item-source-badge item-source-badge--colony', toneClass: 'item-source-tone--colony', label: (0, runtime.deps._t)('군락지 한정') },
        realm_chaos: { badgeClass: 'item-source-badge item-source-badge--realm-chaos', toneClass: 'item-source-tone--realm-chaos', label: (0, runtime.deps._t)('혼돈계 한정') },
        realm_underworld: { badgeClass: 'item-source-badge item-source-badge--realm-underworld', toneClass: 'item-source-tone--realm-underworld', label: (0, runtime.deps._t)('지하계 한정') },
        realm_cosmos: { badgeClass: 'item-source-badge item-source-badge--realm-cosmos', toneClass: 'item-source-tone--realm-cosmos', label: (0, runtime.deps._t)('우주계 한정') }
    };
    return sourceKey ? (map[sourceKey] || null) : null;
}

export function getEquipSearchQueryLocal(runtime) {
    try {
        if (typeof runtime.deps.getSearchFilterState === 'function') {
            let sf = (0, runtime.deps.getSearchFilterState)();
            if (sf && typeof sf.equip === 'string') return sf.equip;
        }
        let d = runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings.searchFilters;
        return d && typeof d.equip === 'string' ? d.equip : '';
    } catch (error) {
        runtime.deps.console.error('equipment search query failed:', error);
        return '';
    }
}

export function highlightEquipTextLocal(runtime, text, query) {
    let raw = String(text || '');
    let q = String(query || '').trim().toLowerCase();
    if (!q) return (0, runtime.deps.escapeHTML)(raw);
    let tokens = q.split(/\s+/).filter(Boolean).sort((a,b)=>b.length-a.length);
    if (tokens.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    let lower = raw.toLowerCase();
    let ranges = [];
    tokens.forEach(tok => {
        let from = 0;
        while (from < lower.length) {
            let idx = lower.indexOf(tok, from);
            if (idx < 0) break;
            ranges.push([idx, idx + tok.length]);
            from = idx + Math.max(1, tok.length);
        }
    });
    if (ranges.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    ranges.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    let merged = [];
    ranges.forEach(([s,e]) => {
        let last = merged[merged.length - 1];
        if (!last || s > last[1]) merged.push([s,e]);
        else last[1] = Math.max(last[1], e);
    });
    let out = '';
    let cur = 0;
    merged.forEach(([s,e]) => {
        if (s > cur) out += (0, runtime.deps.escapeHTML)(raw.slice(cur, s));
        out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${(0, runtime.deps.escapeHTML)(raw.slice(s, e))}</mark>`;
        cur = e;
    });
    if (cur < raw.length) out += (0, runtime.deps.escapeHTML)(raw.slice(cur));
    return out;
}

/** 장착 칸 이름: 칸이 좁아(약 68px) "마법의 녹…"처럼 등급 수식어만 남았다 — 등급은 글자색이 말해 주니 바탕 이름을 쓴다.
* 고유 · 특수 이름 장비는 그 이름이 곧 정체라 그대로(전체 이름은 title과 툴팁). */
export function paperdollItemLabel(runtime, item) {
    if (item.rarity === 'unique' || !item.baseName) return (0, runtime.deps._t)(item.name || item.baseName || '장비');
    return (0, runtime.deps._t)(item.baseName);
}

/** 장착 칸 목록: 세 번째 반지 칸은 세 번째 손가락이 있을 때, 또는 그 칸에 반지가 남아 있을 때만(꺼진 채, 두 번 눌러 뺀다). */
export function getPaperdollSlots(runtime, equipment = runtime.deps.game.equipment) {
    const slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
    return isThirdRingOpen(runtime) || (equipment || {})['반지3'] ? [...slots, '반지3'] : slots;
}

/** 장착 칸을 그리고 배치를 고른다(css/equipment-window.css): 세 번째 반지는 코어 칸이 없으면 그 자리, 코어가 있으면 신발 아래 줄. */
export function setPaperdollHtml(runtime, targetId, html) {
    const list = runtime.deps.document.getElementById(targetId);
    (0, runtime.deps.writeHtmlIfChanged)(list, html);
    list.classList.toggle('has-ring3', !!list.querySelector('.slot-반지3'));
    list.classList.toggle('has-core', !!list.querySelector('.slot-코어'));
}

export function renderPaperdoll(runtime, targetId) {
    let html = '';
    let query = getEquipSearchQueryLocal(runtime);
    let hi = (text) => {
        try {
            if (typeof runtime.deps.highlightSearchText === 'function') return (0, runtime.deps.highlightSearchText)(text, query);
        } catch (error) {
            runtime.deps.console.error('equipment search highlight failed:', error);
        }
        return highlightEquipTextLocal(runtime, text, query);
    };
    getPaperdollSlots(runtime).forEach(slot => {
        let item = runtime.deps.game.equipment[slot];
        let displaySlot = (0, runtime.deps.getItemSlotDisplayLabel)(null, slot.replace(/[123]$/, ''));
        let selected = isCraftSelectionEquipAvailableLocal(runtime) && getCraftSelectionRefLocal(runtime) === slot;
        if (item) {
            let click = `equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')`;
            // 장비창 장착 칸에는 단추가 없다(2026-10-10 개편): 빼기는 두 번 누르기, 끌어 놓기, 선택한 장비의 단추.
            let doubleClick = `event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}')`;
            let sourceMeta = getDropOnlyItemSourceMeta(runtime, item);
            let sourceTone = (sourceMeta ? sourceMeta.toneClass : '') + thirdRingOffClass(runtime, slot);
            let preview = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${slot}', true)`;
            html += `<div class="slot-box equipment-slot slot-${slot} rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${sourceTone}${runtime.deps.itemInfluencesUi.influenceClasses(item)}" style="${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-slot="${slot}" data-item-tooltip-anchor="1" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" aria-hidden="true" draggable="false">${runtime.deps.equipmentSocketsUi.badgesHtml(item, `slot:${slot}`)}${runtime.deps.equipmentWindowUi.tierHtml(item)}${runtime.deps.equipmentWindowUi.baseStepHtml(item)}</div>
                <div class="item-title equipment-slot-name ${item.rarity}">${hi(paperdollItemLabel(runtime, item))}</div>
            </div>`;
        } else {
            let emptyClick = ` onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"`;
            html += `<div class="slot-box equipment-slot equipment-slot-empty slot-${slot}" data-slot="${slot}"${emptyClick}>
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual empty"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)({ slot: slot.replace(/[123]$/, ''), baseId: `empty-${slot}` })}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="equipment-empty-mark">＋</div>
                <div class="equipment-empty-label">${(0, runtime.deps._t)('비어 있음')}</div>
            </div>`;
        }
    });
    if (targetId === 'ui-equip-list') html += runtime.deps.coreItemsUi.slotHtml() + runtime.deps.colonyWardsUi.slotsHtml();
    setPaperdollHtml(runtime, targetId, html);
    if (targetId === 'ui-equip-list') runtime.deps.equipmentAuxUi.render();
}

/** Keep the existing five arguments without a new object allocation for each slot. */
export function createEquipmentGridItemRenderer(runtime) {
    return function renderEquipmentGridItem(item, idx, triageResult, placement, filterState) {
        let size = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
        let footprint = placement || { column: 0, row: 0, columns: size.columns, rows: size.rows };
        let asset = (0, runtime.deps.getEquipmentGridVisualAsset)(item);
        let sourceMeta = getDropOnlyItemSourceMeta(runtime, item);
        let presetProtected = equipmentPresetProtected(runtime, item);
        let itemKey = placement ? placement.key : runtime.deps.equipmentInventoryGridRuntime.getItemKey(item);
        let selected = runtime.deps.equipmentInventoryInteraction.getFocusedKey() === itemKey;
        let carried = runtime.deps.equipmentInventoryInteraction.isCarryingKey(itemKey);
        let filterClass = gridFilterClass(filterState);
        let rarityLabel = (0, runtime.deps._t)(runtime.deps.ITEM_RARITY_LABELS[item.rarity] || runtime.deps.ITEM_RARITY_LABELS.normal);
        // Opus 4차 검수: 비교 수치를 먼저 한 개만 표시. 잠금·세팅·특수와 다른 비교 수치는 ARIA에 남긴다.
        const gains = triageResult ? [[triageResult.dpsGainPct, 'atk', '공격'], [triageResult.ehpGainPct, 'def', '생존']].filter(row => row[0] >= 1) : [];
        const status = gridItemStatus(item, presetProtected);
        const gain = gains[0];
        const badges = gridItemBadges(runtime, gain, status, item);
        const details = gridItemDetails(item, presetProtected, triageResult, gains);
        let label = gridItemLabel(runtime, item, rarityLabel, footprint, details);
        let preview = `if(window.matchMedia('(hover: hover)').matches&&!equipmentInventoryInteraction.isCarrying())showItemTooltip(event,${idx},false)`;
        return `<button type="button" class="equipment-grid-item rarity-${item.rarity || 'normal'} ${selected ? 'selected' : ''} ${carried ? 'is-carried' : ''} ${filterClass} ${sourceMeta ? sourceMeta.toneClass : ''}${runtime.deps.itemInfluencesUi.influenceClasses(item)}"
        style="grid-column:${footprint.column + 1}/span ${footprint.columns};grid-row:${footprint.row + 1}/span ${footprint.rows};--item-grid-columns:${footprint.columns};--item-grid-rows:${footprint.rows};${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-equipment-grid-key="${(0, runtime.deps.escapeHTML)(itemKey)}"
        aria-pressed="${selected ? 'true' : 'false'}" aria-label="${(0, runtime.deps.escapeHTML)(label)}"
        onclick="equipmentInventoryInteraction.handleItemClick(event,this.dataset.equipmentGridKey,${idx})"
        ondblclick="equipmentInventoryInteraction.handleItemDoubleClick(event,this.dataset.equipmentGridKey,${item.id})"
        onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
        <img class="equipment-grid-item-art" src="${asset}" alt="" aria-hidden="true" draggable="false">${runtime.deps.equipmentWindowUi.tierHtml(item)}${runtime.deps.equipmentWindowUi.baseStepHtml(item)}${runtime.deps.equipmentWindowUi.newDotHtml(item)}${runtime.deps.equipmentSocketsUi.badgesHtml(item, `item:${item.id}`)}
        <span class="equipment-grid-item-badges">${badges}</span>
    </button>`;
    };
}

export function renderEquipmentGridCells(runtime, layout, visibleKeys) {
    let hiddenOccupied = new Set();
    layout.entries.filter(entry => !visibleKeys.has(entry.key)).forEach(entry => {
        for (let row = entry.row; row < entry.row + entry.rows; row++) {
            for (let column = entry.column; column < entry.column + entry.columns; column++) hiddenOccupied.add(`${column}:${row}`);
        }
    });
    let cells = [];
    for (let row = 0; row < layout.rows; row++) {
        for (let column = 0; column < layout.columns; column++) {
            let hiddenClass = hiddenOccupied.has(`${column}:${row}`) ? ' occupied-filtered' : '';
            cells.push(`<button type="button" tabindex="-1" class="equipment-grid-cell${hiddenClass}" style="grid-column:${column + 1};grid-row:${row + 1};" data-grid-column="${column}" data-grid-row="${row}" aria-label="${column + 1}열 ${row + 1}행으로 이동" onclick="equipmentInventoryInteraction.moveFocusedTo(event,${column},${row})"></button>`);
        }
    }
    return cells.join('');
}

export function renderEquipmentInventoryGrid(runtime, layout, rows) {
    let byKey = new Map(layout.entries.map(entry => [entry.key, entry]));
    let visibleKeys = new Set(rows.map(row => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    let itemHtml = rows.map(row => {
        let key = runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item);
        let placement = byKey.get(key);
        if (!placement) return '';
        let triageResult = runtime.deps.window.equipmentTriage ? runtime.deps.window.equipmentTriage.getResult(row.item) : null;
        return runtime.handlers.renderEquipmentGridItem(row.item, row.idx, triageResult, placement, row);
    }).join('');
    return renderEquipmentGridCells(runtime, layout, visibleKeys) + itemHtml;
}

export function renderEquipmentInspectorActions(runtime, item, slot, presetProtected) {
    let primaryAction = slot ? `equipmentInventoryInteraction.focus(null);unequipItem('${slot}')` : `equipmentInventoryInteraction.cancelCarry();equipItemById(${item.id})`;
    let craftAction = slot ? `equipmentInventoryInteraction.focus(null);switchItemSubtab('item-tab-craft');selectForCrafting('${slot}',true)` : `equipmentInventoryInteraction.focus(null);craftSelectInventoryItemById(${item.id})`;
    // 단추 줄(2026-10-10 개편): 장착, 잠금, 제작실, 해체, 그다음 주입, 소켓, 기름. 주얼, 코어, 액막이는 제작실부터 받지 않는다(js/bag-items.js).
    let craft = !runtime.deps.bagItems.isSpecial(item) && runtime.deps.contentProgression.canOpen('item-tab-craft') ? `<button data-content-action="craft" onclick="${craftAction}"><span class="px-center">${(0, runtime.deps._t)('제작실')}</span></button>` : '';
    let tools = runtime.deps.bagItems.isSpecial(item) ? '' : `${runtime.deps.chaosInfusionUi.actionHtml(item, slot)}${runtime.deps.equipmentSocketsUi.actionHtml(item, slot)}${runtime.deps.gardenOilsUi.actionHtml(item, slot)}`;
    return `<button class="equipment-card-primary" onclick="${primaryAction}"><span class="px-center">${slot ? (0, runtime.deps._t)('장착 해제') : runtime.deps.bagItems.isJewel(item) ? (0, runtime.deps._t)('끼우기') : (0, runtime.deps._t)('장착')}</span></button>
        ${slot ? craft : renderEquipmentInventoryProtectionActions(runtime, item, presetProtected, craft)}${tools}`;
}

export function renderEquipmentInventoryProtectionActions(runtime, item, presetProtected, middle = '') {
    let salvageTitle = presetProtected ? '장비 세팅 프리셋에서 제거한 뒤 해체할 수 있습니다.' : '장비를 해체합니다.';
    return `<button class="${item.locked ? 'is-locked' : ''}" onclick="toggleItemLockById(${item.id})"><span class="px-center">${item.locked ? (0, runtime.deps._t)('잠금해제') : (0, runtime.deps._t)('잠금')}</span></button>${middle}
        <button class="equipment-card-danger" data-tip="${salvageTitle}" onclick="equipmentInventoryInteraction.cancelCarry();salvageItemById(${item.id})" ${item.locked || presetProtected ? 'disabled' : ''}><span class="px-center">${presetProtected ? (0, runtime.deps._t)('보호됨') : (0, runtime.deps._t)('해체')}</span></button>`;
}

export function renderEquipmentInventoryInspector(runtime, rows) {
    runtime.deps.equipmentInspectionUi.decorateLoadout();
    let root = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
    if (!root) return;
    let visibleItems = (Array.isArray(rows) ? rows : []).map(row => row.item).filter(Boolean);
    let focusedKey = runtime.deps.equipmentInventoryInteraction.getFocusedKey();
    let slot = runtime.deps.equipmentInventoryInteraction.getFocusedEquipmentSlot();
    let item = inspectionItem(runtime, slot, visibleItems, focusedKey);
    if (item && runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) !== focusedKey) item = null;
    if (!item) {
        runtime.deps.equipmentInventoryInteraction.setFocusedKey(null);
        let message = visibleItems.length ? '가방에서 장비를 고르면 여기서 비교합니다.' : '표시할 장비가 없습니다.';
        let emptyHtml = runtime.deps.equipmentWindowUi.emptyHtml(message);
        if (root.__lastHtml !== emptyHtml) root.innerHTML = root.__lastHtml = emptyHtml;
        return;
    }
    runtime.deps.equipmentInventoryInteraction.setFocusedKey(runtime.deps.equipmentInventoryGridRuntime.getItemKey(item));
    let presetProtected = equipmentPresetProtected(runtime, item);
    let flags = [presetProtected ? '세팅 보호' : '', item.locked ? '잠금' : ''].filter(Boolean).join(', ');
    // 선택한 장비(2026-10-10 개편, js/equipment-window-ui.js): 그림과 이름, 지금 장착, 바꾸면 증감표, 단추, 툴팁.
    let html = runtime.deps.equipmentWindowUi.inspectorHtml(item, slot, renderEquipmentInspectorActions(runtime, item, slot, presetProtected), flags);
    runtime.deps.equipmentInspectionUi.render(root, item, slot, html);
    runtime.deps.equipmentInventoryInteraction.positionInspector();
}

export function isThirdRingOpen(runtime) { return typeof runtime.deps.getTranscendentVoidPassiveCount === 'function' && (0, runtime.deps.getTranscendentVoidPassiveCount)('thirdFinger', runtime.deps.game) > 0; }

export function thirdRingOffClass(runtime, slot) { return slot === '반지3' && !isThirdRingOpen(runtime) ? ' is-off' : ''; }

function dropOnlyRule(base, unique) {
    return (base && base.dropOnly) ? base.dropOnly : ((unique && unique.dropOnly) ? unique.dropOnly : null);
}

function gridFilterClass(filterState) {
    return filterState && filterState.filterActive
        ? (filterState.filterMatched ? 'is-filter-match' : 'is-filter-muted') : '';
}

function gridItemBadges(runtime, gain, status, item) {
    return gain ? `<span class="is-${gain[1]}">+${Math.round(gain[0])}%</span>`
        : status ? `<span>${item.locked ? (0, runtime.deps._t)('잠금') : (0, runtime.deps._t)('세팅')}</span>` : '';
}

function gridItemDetails(item, presetProtected, triageResult, gains) {
    return [item.locked && '잠금', presetProtected && '장비 세팅에 포함', triageResult && triageResult.special && '특수 효과',
        ...gains.map(row => `${row[2]} +${row[0]}%`)].filter(Boolean).join(', ');
}

function gridItemLabel(runtime, item, rarityLabel, footprint, details) {
    return [`${rarityLabel} ${item.name || item.baseName || (0, runtime.deps._t)('장비')}`, (0, runtime.deps.getItemSlotDisplayLabel)(item), `${footprint.columns}×${footprint.rows}`, details].filter(Boolean).join(', ');
}

function inspectionItem(runtime, slot, visibleItems, focusedKey) {
    return slot ? runtime.deps.game.equipment[slot] : visibleItems.find(row => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row) === focusedKey);
}

function equipmentPresetProtected(runtime, item) {
    return typeof runtime.deps.equipmentLoadoutRuntime !== 'undefined' && runtime.deps.equipmentLoadoutRuntime.isReferenced(item);
}

function gridItemStatus(item, presetProtected) {
    return item.locked ? '잠금' : presetProtected ? '장비 세팅에 포함' : '';
}
