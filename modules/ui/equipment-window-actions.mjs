export function fillEmptySlots(runtime) {
    const { deps } = runtime;
    const equipped = deps.equipIntoEmptySlots(deps.game.inventory.slice());
    if (equipped) deps.showGameToast(deps._t('빈 장비 칸 {equipped}개를 채웠습니다', { equipped }), { tone: 'success' });
    deps.updateStaticUI();
}

export function renderLoadoutSummary(runtime, stats) {
    render(runtime, stats);
    runtime.deps.knittingUi.render();
}

export function updateFullWarnings(runtime) {
    const { deps } = runtime;
    const element = deps.document.getElementById('inventory-full-warning');
    if (!element) return;
    const used = deps.getInventoryUsedCellCount(deps.game), limit = deps.getInventoryLimit(deps.game);
    const full = used >= limit, display = full ? 'inline-block' : 'none';
    const changed = element.style.display !== display;
    element.style.display = display;
    element.dataset.tip = full ? `${deps._t('{label} {used}/{limit}칸', { label: '장비', used, limit })}, ${deps._t('공간을 확보하세요')}` : '';
    if (changed && deps.document.body.classList.contains('desktop-windowed-ui') && typeof deps.syncDesktopRailGroups === 'function') {
        deps.syncDesktopRailGroups();
    }
}

export function setHtml(runtime, node, html) {
    if (node && node.__eqwHtml !== html) { node.innerHTML = html; node.__eqwHtml = html; }
}

export function ehpItems(runtime, stats) {
    const profile = typeof runtime.deps.calculatePlayerEhpProfile === 'function' ? (0, runtime.deps.calculatePlayerEhpProfile)(stats) : null;
    if (!profile) return '';
    return runtime.state.EHP.map(([name, key]) => `<span style="--c:${runtime.state.COLOR[key]}" data-tip="${(0, runtime.deps._t)('직격 {value}', { value: fmt(runtime, profile.elements[key].direct) })}">${(0, runtime.deps._t)(name)} <b>${fmt(runtime, profile.elements[key].entropy)}</b></span>`).join('');
}

/** The phone's one-line summary: 유효 생명력 and the five values in one wrapping row. */
export function ehpHtml(runtime, stats) {
    const items = ehpItems(runtime, stats);
    return items ? `<div class="eqw-ehp"><span class="eqw-ehp-label">${(0, runtime.deps._t)('유효 생명력')}</span>${items}</div>` : '';
}

/** DPS and 유효 생명력 only (2026-10-21 사용자: "DPS/EHP 만 보이게 하고 나머지는 삭제해"; 저항, 생명력, 보호막, 방어도, 회피는 캐릭터 창에).
* Names in the left column, values in the right one (2026-10-24 사용자: the five values stay one group when they wrap). */
export function fullHtml(runtime, stats, dps) {
    const ehp = ehpItems(runtime, stats);
    return `<div class="eqw-summary-full"><span class="eqw-sum-label"><span class="px-center">DPS</span></span><div class="eqw-sum-value eqw-dps" style="--c:${runtime.state.COLOR.dps}"><b>${dps}</b></div>`
        + (ehp ? `<span class="eqw-sum-label"><span class="px-center">${(0, runtime.deps._t)('유효 생명력')}</span></span><div class="eqw-sum-value eqw-ehp">${ehp}</div>` : '') + '</div>';
}

/** Phone: DPS and 유효 생명력 under a toggle that unfolds the equipped gear and the presets (game.settings.equipmentMobilePane). */
export function miniHtml(runtime, stats, dps) {
    const open = (runtime.deps.game.settings || {}).equipmentMobilePane === 'loadout';
    return `<div class="eqw-summary-mini"><button type="button" class="eqw-mini-toggle" aria-expanded="${open}" onclick="equipmentWindowUi.toggleLoadout()">${(0, runtime.deps._t)('장착 장비')} ${open ? '▴' : '▾'}</button>
            <div class="eqw-mini-dps" style="--c:${runtime.state.COLOR.dps}"><small>DPS</small><b>${dps}</b></div><div class="eqw-mini-line">${ehpHtml(runtime, stats)}</div></div>`;
}

export function toggleLoadout(runtime) {
    (0, runtime.deps.setEquipmentMobilePane)((runtime.deps.game.settings || {}).equipmentMobilePane === 'loadout' ? 'inventory' : 'loadout');
    (0, runtime.deps.updateStaticUI)();
}

export function renderHead(runtime) {
    const cap = runtime.deps.document.getElementById('ui-equipment-bag-capacity');
    if (cap) {
        const used = (0, runtime.deps.getInventoryUsedCellCount)(runtime.deps.game), limit = Math.max(1, (0, runtime.deps.getInventoryLimit)(runtime.deps.game));
        setHtml(runtime, cap, `<b>${(0, runtime.deps._t)('가방')}</b><small>${(0, runtime.deps._t)('{used}/{limit}칸', { used, limit })}</small><i style="--v:${Math.min(100, Math.round(100 * used / limit))}%"></i>`);
        cap.classList.toggle('is-full', used >= limit);
    }
    const input = runtime.deps.document.getElementById('ui-equipment-bag-search');
    const query = String((0, runtime.deps.getSearchFilterState)().equip || '');
    if (input && runtime.deps.document.activeElement !== input && input.value !== query) input.value = query;
}

/** ⋯ and the rail's panels close when the pointer goes down anywhere outside them. */
export function closeMenus(runtime, event) {
    runtime.deps.document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]').forEach(menu => {
        if (!menu.contains(event.target)) menu.removeAttribute('open');
    });
}

/** Each tool's pixel icon (index.html data-icon) goes in once, before its name. */
export function fillRailIcons(runtime) {
    runtime.deps.document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-tool[data-icon]').forEach(tool => {
        if (!tool.querySelector('svg')) tool.insertAdjacentHTML('afterbegin', (0, runtime.deps.renderPixelIcon)(tool.dataset.icon, 'eqw-rail-icon'));
    });
}

/** 필터 has a dot while a grade is hidden or one kind of slot is picked (a picked slot the bag no longer holds shows everything);
* 분석 has one while its filter dims the bag, so a closed panel still says why items are dimmed. */
export function markFilter(runtime) {
    const summary = runtime.deps.document.querySelector('#eqw-filter-menu > summary');
    if (!summary) return;
    const settings = runtime.deps.game.settings || {};
    const slot = String(settings.equipmentSlotFilter || 'all');
    const slotPicked = slot !== 'all' && (runtime.deps.game.inventory || []).some(item => item && item.slot === slot);
    const gradeHidden = Object.values(settings.inventoryViewRarities || {}).some(shown => shown === false);
    summary.dataset.active = String(slotPicked || gradeHidden);
    const judge = runtime.deps.document.querySelector('#eqw-judge-menu > summary');
    if (judge) judge.dataset.active = String(runtime.deps.equipmentTriage.currentFilter() !== 'all');
    const order = settings.bagArrangeOrder || 'recent';
    runtime.deps.document.querySelectorAll('#eqw-arrange-menu [data-arrange-order]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.arrangeOrder === order));
    });
}

/** 검색 항목 해체 and 미검색 항목 해체 wait for a search word: with none, the first took the whole bag and the second nothing. */
export function markSearchSalvage(runtime) {
    const empty = !(0, runtime.deps.getSearchFilterState)().equip.trim();
    runtime.deps.document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) [data-search-salvage]').forEach(button => {
        button.disabled = empty;
        button.dataset.tip = empty ? (0, runtime.deps._t)('가방 검색어를 먼저 입력하세요.') : '';
    });
}

/** Opening one panel closes the others (the toggle event does not bubble, so the document listens in the capture phase). */
export function keepOnePanel(runtime, event) {
    const menu = event.target;
    if (!menu.matches || !menu.matches(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu') || !menu.open) return;
    runtime.deps.document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu[open]').forEach(other => { if (other !== menu) other.removeAttribute('open'); });
}

/** Esc, and the Android back key (it sends one, js/android-app-ui.js), closes an open panel before the window. */
export function closePanelOnEscape(runtime, event) {
    if (event.key !== 'Escape') return;
    const menu = runtime.deps.document.querySelector(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]');
    if (!menu || !menu.getClientRects().length) return;
    menu.removeAttribute('open');
    menu.querySelector('summary').focus();
    event.preventDefault();
    event.stopPropagation();
}

export function runRailToolOnDoubleClick(runtime, event) {
    const summary = event.target.closest && event.target.closest(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .eqw-rail-menu > summary');
    const action = summary && runtime.state.RAIL_DOUBLE_CLICK[summary.parentElement.id];
    if (!action) return;
    event.preventDefault();
    summary.parentElement.removeAttribute('open');
    action();
}

/** 해체 panel opened from elsewhere (the triage's near-full hint): auto salvage is set there now. */
export function openSalvage(runtime) {
    const menu = runtime.deps.document.getElementById('eqw-salvage-menu');
    if (menu) menu.open = true;
}

/** 아이템 필터 열기: the drop filter moved to the settings screen (2026-10-19). */
export function openItemFilter(runtime) {
    (0, runtime.deps.switchTab)('tab-settings');
    runtime.deps.settingsUi.select('items');
}

export function salvageKind(runtime, item) {
    if (runtime.deps.bagItems.isJewel(item)) return runtime.deps.bagItems.JEWEL;
    if (runtime.deps.bagItems.isCore(item)) return runtime.deps.bagItems.CORE;
    if (runtime.deps.colonyWards.isWard(item)) return '액막이';
    return String(item.slot || '').replace(/[123]$/, '') || '기타';
}

export function countBy(runtime, items, keyOf) {
    const counts = new Map();
    items.forEach(item => { const key = keyOf(item); counts.set(key, (counts.get(key) || 0) + 1); });
    return counts;
}

export function salvageSummaryHtml(runtime, items) {
    const grades = countBy(runtime, items, item => item.rarity), kinds = countBy(runtime, items, runtime.handlers.salvageKind);
    const shown = ['normal', 'magic', 'rare', 'unique'].filter(grade => grades.get(grade));
    const rank = kind => { const at = runtime.state.SALVAGE_KIND_ORDER.indexOf(kind); return at < 0 ? runtime.state.SALVAGE_KIND_ORDER.length : at; };
    const chip = (label, count, grade = '') => `<span class="salvage-sum-chip"${grade ? ` data-grade="${grade}"` : ''}><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(label))}</b>${count}</span>`;
    const bar = shown.map(grade => `<i data-grade="${grade}" style="flex:${grades.get(grade)}"></i>`).join('');
    const gradeChips = shown.map(grade => chip(runtime.deps.ITEM_RARITY_LABELS[grade], grades.get(grade), grade)).join('');
    const kindChips = [...kinds].sort((a, b) => rank(a[0]) - rank(b[0])).map(([kind, count]) => chip(kind, count)).join('');
    return `<div class="salvage-sum">${bar ? `<div class="salvage-sum-bar" aria-hidden="true">${bar}</div>` : ''}
            ${gradeChips ? `<div class="salvage-sum-row"><h5>${(0, runtime.deps._t)('등급')}</h5>${gradeChips}</div>` : ''}
            <div class="salvage-sum-row"><h5>${(0, runtime.deps._t)('종류')}</h5>${kindChips}</div></div>`;
}

/** The bag counts as opened while its grid is on screen; when it leaves the screen everything that came in so far is seen. */
export function watchBag(runtime) {
    const target = runtime.deps.document.querySelector(':is(#item-tab-equip, #stump-equip-host, #craft-equip-host) .equipment-inventory-grid-shell');
    if (!runtime.active || !target || typeof runtime.deps.IntersectionObserver !== 'function') return;
    const owner = runtime.deps.game;
    if (runtime.state.watched === target && runtime.state.bagOwner === owner) return;
    runtime.state.bagObserver?.disconnect();
    runtime.state.watched = target;
    runtime.state.bagOwner = owner;
    runtime.state.bagShown = false;
    const observer = new runtime.deps.IntersectionObserver(entries => {
        if (!runtime.active || runtime.state.bagObserver !== observer || runtime.deps.game !== owner) return;
        if (entries.some(entry => entry.isIntersecting)) runtime.state.bagShown = true;
        else if (runtime.state.bagShown) {
            runtime.state.bagShown = false;
            runtime.deps.game.bagSeenId = runtime.deps.window.GameModules.state.session.itemIdCounter;
        }
    });
    runtime.state.bagObserver = observer;
    observer.observe(target);
}

/** Items-tab refresh (js/ui.js renderEquipmentLoadoutSummary): the summary. */
export function render(runtime, stats) {
    const dps = fmt(runtime, stats.totalDps || stats.dps);
    setHtml(runtime, runtime.deps.document.getElementById('ui-equipment-loadout-summary'), fullHtml(runtime, stats, dps) + miniHtml(runtime, stats, dps));
}

/** Bag refresh (js/ui.js renderEquipmentBagPanel: the equipment window, or the stump tab's left gem): the bag head, the rail and the
* new-item watch. */
export function renderBag(runtime) {
    renderHead(runtime);
    fillRailIcons(runtime);
    markFilter(runtime);
    markSearchSalvage(runtime);
    watchBag(runtime);
}

/** The worn slots a bag item would replace: the filled candidate slots, else all of them. Jewels go into sockets, not slots. */
export function compareSlots(runtime, item) {
    if (runtime.deps.bagItems.isJewel(item)) return [];
    const slots = (0, runtime.deps.getEquipCandidateSlots)(item);
    const filled = slots.filter(slot => (runtime.deps.game.equipment || {})[slot]);
    return filled.length ? filled : slots;
}

/** 고른 장비와 지금 낀 장비의 옵션(2026-10-11, 개편으로 낀 장비의 옵션이 사라져 확인하기 힘들다는 사용자 말): 칸이 넓으면 나란히,
* 좁으면(휴대폰, 좁게 뜬 칸) 탭으로 바꿔 본다(css/equipment-window.css .eqw-compare). @param {{ tab: string, label: string, node: Element }[]} panes */
export function compareNode(runtime, panes, selectedLabel) {
    const wrap = runtime.deps.document.createElement('div');
    wrap.className = 'eqw-compare';
    wrap.dataset.panes = String(panes.length);
    const selected = Math.max(0, panes.findIndex(pane => pane.label === selectedLabel));
    const tabs = panes.map((pane, index) => `<button type="button" aria-pressed="${index === selected}" class="${index === selected ? 'active' : ''}" onclick="equipmentWindowUi.showPane(this, ${index})">${(0, runtime.deps.escapeHTML)(pane.tab)}</button>`);
    wrap.innerHTML = `<div class="eqw-compare-tabs">${tabs.join('')}</div><div class="eqw-compare-panes"></div>`;
    panes.forEach((pane, index) => {
        const section = runtime.deps.document.createElement('section');
        section.className = `eqw-compare-pane${index === selected ? ' active' : ''}`;
        const head = runtime.deps.document.createElement('h5');
        head.textContent = (0, runtime.deps._t)(pane.label);
        section.append(head, pane.node);
        wrap.lastElementChild.append(section);
    });
    return wrap;
}

/** 좁은 칸의 탭: 고른 장비와 지금 낀 장비 가운데 하나를 보여 준다. */
export function showPane(runtime, button, index) {
    const wrap = button.closest('.eqw-compare');
    wrap.querySelectorAll('.eqw-compare-tabs > button, .eqw-compare-pane').forEach(node => node.classList.remove('active'));
    wrap.querySelectorAll('.eqw-compare-tabs > button').forEach((node, tabIndex) => node.setAttribute('aria-pressed', String(tabIndex === index)));
    wrap.querySelectorAll('.eqw-compare-tabs > button')[index].classList.add('active');
    wrap.querySelectorAll('.eqw-compare-pane')[index].classList.add('active');
    runtime.deps.equipmentInventoryInteraction.positionInspector();
}

export function wornNames(runtime, slots) {
    const worn = slots.map(slot => runtime.deps.game.equipment[slot]).filter(Boolean);
    if (!worn.length) return '비어 있음';
    return worn.map(row => `<span class="${row.rarity || 'normal'}">${(0, runtime.deps.escapeHTML)(row.name || row.baseName || '장비')}</span>`).join(', ');
}

export function subtitleOf(runtime, slot, slots) {
    if (slot) return (0, runtime.deps._t)('{slot} 칸에 장착 중', { slot: slotName(runtime, slot) });
    return slots.length ? (0, runtime.deps._t)('{slots} 칸과 비교', { slots: slots.map(runtime.handlers.slotName).join(', ') }) : '';
}

/** The panel's markup (js/canvas-passive-tree.js renderEquipmentInventoryInspector); the 바꾸면 tables fill in afterwards (fillDeltas). */
export function inspectorHtml(runtime, item, slot, actionsHtml, flags) {
    const slots = slot ? [] : compareSlots(runtime, item);
    const hint = slot ? (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(item.baseName || '장착 중')) : runtime.deps.bagItems.isJewel(item) ? '빈 소켓이 있는 장비에 끼웁니다' : (0, runtime.deps._t)('지금 장착: {slots}', { slots: wornNames(runtime, slots) });
    const rarity = item.rarity || 'normal';
    return `<h4 class="eqw-title">${(0, runtime.deps._t)('선택한 장비')}<small>${(0, runtime.deps.escapeHTML)(subtitleOf(runtime, slot, slots))}</small></h4>
            <div class="eqw-pick rarity-${rarity}"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"><div><b class="${rarity}">${(0, runtime.deps.escapeHTML)(item.name || item.baseName || '장비')}</b>
                <small>${hint}${flags ? `, ${(0, runtime.deps.escapeHTML)(flags)}` : ''}</small></div></div>
            <div class="eqw-inspector-body">${deltaTablesHtml(runtime, slots)}${orderedBody(runtime, actionsHtml)}</div>
            <button type="button" class="equipment-grid-inspector-close" aria-label="${(0, runtime.deps._t)('선택 닫기')}" onclick="equipmentInventoryInteraction.focus(null)">×</button>`;
}

/** 휴대폰 카드(sheet)는 단추 줄을 옵션 뒤에 그린다: 바꾸면 표 바로 밑의 단추 줄이 카드의 끝처럼 보여 아래의 옵션을 찾기 어려웠다.
* css/equipment-window.css가 그 줄을 카드 아래에 붙인다. 넓은 창은 표, 단추, 옵션 차례 그대로다. */
export function orderedBody(runtime, actionsHtml) {
    const actions = `<div class="equipment-grid-inspector-actions">${actionsHtml}</div>`, details = '<div class="equipment-inspection-details"></div>';
    const inspector = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
    return inspector && inspectorDock(runtime, inspector) === 'sheet' ? details + actions : actions + details;
}

/** Phone management stays separate from the equip action; it changes presentation only. */
export function toggleTools(runtime, button) {
    const actions = button.closest('.equipment-grid-inspector-actions');
    const open = actions.classList.toggle('tools-open');
    button.setAttribute('aria-expanded', String(open));
    button.textContent = open ? (0, runtime.deps._t)('관리 닫기') : (0, runtime.deps._t)('장비 관리');
}

export function fmt(runtime, value) { return Math.floor(Number(value) || 0).toLocaleString(runtime.deps.i18n.locale); }

export function pretty(runtime, text) { return /^-?\d{4,}$/.test(text) ? Number(text).toLocaleString(runtime.deps.i18n.locale) : text; }

export function slotName(runtime, slot) { return typeof runtime.deps.getDualSlotDisplayLabel === 'function' ? (0, runtime.deps.getDualSlotDisplayLabel)(slot) : String(slot).replace(/[123]$/, ''); }

export function seenId(runtime) {
    if (!Number.isFinite(Number(runtime.deps.game.bagSeenId)) || runtime.deps.game.bagSeenId === null) runtime.deps.game.bagSeenId = runtime.deps.window.GameModules.state.session.itemIdCounter;
    return Number(runtime.deps.game.bagSeenId);
}

export function isNew(runtime, item) { return !!item && Number(item.id) > seenId(runtime); }

export function newDotHtml(runtime, item) { return isNew(runtime, item) ? '<span class="eqw-new-dot" aria-label="새 아이템"></span>' : ''; }

export function tierHtml(runtime, item) { return item && !runtime.deps.bagItems.isSpecial(item)
        ? `<span class="eqw-item-tier ${(0, runtime.deps.getTierClassName)((0, runtime.deps.getItemCraftTier)(item))}" aria-hidden="true">T${(0, runtime.deps.getItemCraftTier)(item)}</span>` : ''; }

export function baseStepHtml(runtime, item) {
    const info = item && !runtime.deps.bagItems.isSpecial(item) ? (0, runtime.deps.getItemBaseChainInfo)(item) : null;
    return info && info.total > 1 ? `<span class="eqw-base-step ${(0, runtime.deps.getBaseStepClassName)(info)}" aria-hidden="true">${info.step}/${info.total}</span>` : '';
}

export function inspectorDock(runtime, inspector) { return (0, runtime.deps.getComputedStyle)(inspector).getPropertyValue('--eqw-dock').trim(); }

export function wornSlots(runtime, item) { return runtime.deps.bagItems.isSpecial(item) ? [] : compareSlots(runtime, item).filter(slot => (runtime.deps.game.equipment || {})[slot]).slice(0, 3); }

export function deltaTablesHtml(runtime, slots) { return slots.length ? `<div class="eqw-deltas${slots.length > 1 ? ' is-multi' : ''}" data-eqw-slot="${(0, runtime.deps.escapeHTML)(slots.join(','))}" style="--eqw-sides:${slots.length}"><div class="eqw-dl-head">바꾸면</div>
        <div class="eqw-dl-body"><p class="eqw-none">${(0, runtime.deps._t)('계산 중')}</p></div></div>` : ''; }

export function emptyHtml(runtime, message) { return `<h4 class="eqw-title">${(0, runtime.deps._t)('선택한 장비')}</h4><div class="equipment-grid-inspector-empty">${message}</div>`; }
