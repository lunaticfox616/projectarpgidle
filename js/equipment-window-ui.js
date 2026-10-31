/**
 * 장비창(2026-10-10 개편, 사용자가 시안 6차에서 고른 고급 테마). 왼쪽은 장착 장비(인형 배치, 칸마다 그림과 칸 이름만, 머리에 세팅 I II III,
 * 2026-10-21)와 요약(DPS 하나만 크게, 그 아래 유효 생명력을 원소마다 제 색으로). 가운데는 가방이고 머리 한 줄에
 * 칸 수와 검색, 그 아래 쪽 단추, 가방 오른쪽에 도구 줄(정리, 분석, 필터, 해체, 복구, 터치 기기는 배치)을 둔다(2026-10-19, 분석은 2026-10-24까지 판단).
 * 창이 넓으면 오른쪽에 선택한 장비(바꾸면 증감표, 단추, 툴팁)가 붙고, 좁으면 같은 내용이 떠서 나오며, 휴대폰은 요약을 한 줄로 접고
 * (장착 장비 ▾로 펼친다) 선택한 장비는 아래에서 올라온다. 배치와 모양은 css/equipment-window.css.
 * 새로 들어온 아이템은 빨간 점 하나: id가 game.bagSeenId보다 크면 새 것이고, 가방을 열었다가 닫으면 그때까지 들어온 것을 모두 본 것으로 친다.
 */
const equipmentWindowUi = (() => {
    const COLOR = Object.freeze({ dps: '#ffcf6e', life: '#ff6b6b', es: '#7fd3ff', fire: '#ff8a50', cold: '#6cb8ff', light: '#ffd54f', chaos: '#c39bff',
        armor: '#d2b98c', evasion: '#8fe08f', phys: '#d6cdb8' });
    const EHP = Object.freeze([['물리', 'phys'], ['화염', 'fire'], ['냉기', 'cold'], ['번개', 'light'], ['카오스', 'chaos']]);
    /** 바꾸면 표의 이름 색: 요약과 같은 능력치는 요약과 같은 색. */
    const DELTA_TINT = Object.freeze({ dps: 'dps', summonDps: 'dps', maxHp: 'life', energyShield: 'es', resF: 'fire', resC: 'cold', resL: 'light',
        resChaos: 'chaos', armor: 'armor', evasion: 'evasion' });
    const fmt = value => Math.floor(Number(value) || 0).toLocaleString('ko-KR');
    const pretty = text => (/^-?\d{4,}$/.test(text) ? Number(text).toLocaleString('ko-KR') : text);
    const slotName = slot => (typeof getDualSlotDisplayLabel === 'function' ? getDualSlotDisplayLabel(slot) : String(slot).replace(/[123]$/, ''));
    function setHtml(node, html) {
        if (node && node.__eqwHtml !== html) { node.innerHTML = html; node.__eqwHtml = html; }
    }

    // ---------------------------------------------------------------- 요약
    function ehpItems(stats) {
        const profile = typeof calculatePlayerEhpProfile === 'function' ? calculatePlayerEhpProfile(stats) : null;
        if (!profile) return '';
        return EHP.map(([name, key]) => `<span style="--c:${COLOR[key]}" data-tip="직격 ${fmt(profile.elements[key].direct)}">${name} <b>${fmt(profile.elements[key].entropy)}</b></span>`).join('');
    }
    /** The phone's one-line summary: 유효 생명력 and the five values in one wrapping row. */
    function ehpHtml(stats) {
        const items = ehpItems(stats);
        return items ? `<div class="eqw-ehp"><span class="eqw-ehp-label">유효 생명력</span>${items}</div>` : '';
    }
    /** DPS and 유효 생명력 only (2026-10-21 사용자: "DPS/EHP 만 보이게 하고 나머지는 삭제해"; 저항, 생명력, 보호막, 방어도, 회피는 캐릭터 창에).
     * Names in the left column, values in the right one (2026-10-24 사용자: the five values stay one group when they wrap). */
    function fullHtml(stats, dps) {
        const ehp = ehpItems(stats);
        return `<div class="eqw-summary-full"><span class="eqw-sum-label"><span class="px-center">DPS</span></span><div class="eqw-sum-value eqw-dps" style="--c:${COLOR.dps}"><b>${dps}</b></div>`
            + (ehp ? `<span class="eqw-sum-label"><span class="px-center">유효 생명력</span></span><div class="eqw-sum-value eqw-ehp">${ehp}</div>` : '') + '</div>';
    }
    /** Phone: DPS and 유효 생명력 under a toggle that unfolds the equipped gear and the presets (game.settings.equipmentMobilePane). */
    function miniHtml(stats, dps) {
        const open = (game.settings || {}).equipmentMobilePane === 'loadout';
        return `<div class="eqw-summary-mini"><button type="button" class="eqw-mini-toggle" aria-expanded="${open}" onclick="equipmentWindowUi.toggleLoadout()">장착 장비 ${open ? '▴' : '▾'}</button>
            <div class="eqw-mini-dps" style="--c:${COLOR.dps}"><small>DPS</small><b>${dps}</b></div><div class="eqw-mini-line">${ehpHtml(stats)}</div></div>`;
    }
    function toggleLoadout() {
        setEquipmentMobilePane((game.settings || {}).equipmentMobilePane === 'loadout' ? 'inventory' : 'loadout');
        updateStaticUI();
    }

    // ---------------------------------------------------------------- 가방 머리
    function renderHead() {
        const cap = document.getElementById('ui-equipment-bag-capacity');
        if (cap) {
            const used = getInventoryUsedCellCount(game), limit = Math.max(1, getInventoryLimit(game));
            setHtml(cap, `<b>가방</b><small>${used}/${limit}칸</small><i style="--v:${Math.min(100, Math.round(100 * used / limit))}%"></i>`);
            cap.classList.toggle('is-full', used >= limit);
        }
        const input = document.getElementById('ui-equipment-bag-search');
        const query = String(getSearchFilterState().equip || '');
        if (input && document.activeElement !== input && input.value !== query) input.value = query;
    }
    /** ⋯ and the rail's panels close when the pointer goes down anywhere outside them. */
    function closeMenus(event) {
        document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]').forEach(menu => {
            if (!menu.contains(event.target)) menu.removeAttribute('open');
        });
    }

    // ---------------------------------------------------------------- 도구 줄(2026-10-19: 정리, 분석, 필터, 해체, 복구, 손가락 기기의 배치)
    /** Each tool's pixel icon (index.html data-icon) goes in once, before its name. */
    function fillRailIcons() {
        document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host) .eqw-rail-tool[data-icon]').forEach(tool => {
            if (!tool.querySelector('svg')) tool.insertAdjacentHTML('afterbegin', renderPixelIcon(tool.dataset.icon, 'eqw-rail-icon'));
        });
    }
    /** 필터 has a dot while a grade is hidden or one kind of slot is picked (a picked slot the bag no longer holds shows everything);
     * 분석 has one while its filter dims the bag, so a closed panel still says why items are dimmed. */
    function markFilter() {
        const summary = document.querySelector('#eqw-filter-menu > summary');
        if (!summary) return;
        const settings = game.settings || {};
        const slot = String(settings.equipmentSlotFilter || 'all');
        const slotPicked = slot !== 'all' && (game.inventory || []).some(item => item && item.slot === slot);
        const gradeHidden = Object.values(settings.inventoryViewRarities || {}).some(shown => shown === false);
        summary.dataset.active = String(slotPicked || gradeHidden);
        const judge = document.querySelector('#eqw-judge-menu > summary');
        if (judge) judge.dataset.active = String(equipmentTriage.currentFilter() !== 'all');
        const order = settings.bagArrangeOrder || 'recent';
        document.querySelectorAll('#eqw-arrange-menu [data-arrange-order]').forEach(button => {
            button.setAttribute('aria-pressed', String(button.dataset.arrangeOrder === order));
        });
    }
    /** 검색 항목 해체 and 미검색 항목 해체 wait for a search word: with none, the first took the whole bag and the second nothing. */
    function markSearchSalvage() {
        const empty = !getSearchFilterState().equip.trim();
        document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host) [data-search-salvage]').forEach(button => {
            button.disabled = empty;
            button.dataset.tip = empty ? '가방 검색어를 먼저 입력하세요.' : '';
        });
    }
    /** Opening one panel closes the others (the toggle event does not bubble, so the document listens in the capture phase). */
    function keepOnePanel(event) {
        const menu = event.target;
        if (!menu.matches || !menu.matches(':is(#item-tab-equip, #stump-equip-host) .eqw-rail-menu') || !menu.open) return;
        document.querySelectorAll(':is(#item-tab-equip, #stump-equip-host) .eqw-rail-menu[open]').forEach(other => { if (other !== menu) other.removeAttribute('open'); });
    }
    /** Esc, and the Android back key (it sends one, js/android-app-ui.js), closes an open panel before the window. */
    function closePanelOnEscape(event) {
        if (event.key !== 'Escape') return;
        const menu = document.querySelector(':is(#item-tab-equip, #stump-equip-host) details:is(.eqw-more, .eqw-rail-menu)[open]');
        if (!menu || !menu.getClientRects().length) return;
        menu.removeAttribute('open');
        menu.querySelector('summary').focus();
        event.preventDefault();
        event.stopPropagation();
    }
    /** A rail tool double-clicked does its main job at once, with no question and no panel (2026-10-21, the user's ask; 정리 2026-10-26,
     * in the order picked last in its panel): 해체 salvages
     * the whole bag (locked, set and priority-kept gear stays, as with the panel's 전체 해체), 분석 runs the analysis again (the bag
     * marks show the results). Keyed by the panel's id; the two clicks before the double-click opened and closed it. */
    const RAIL_DOUBLE_CLICK = Object.freeze({
        'eqw-arrange-menu': () => equipmentInventoryInteraction.autoArrange(),
        'eqw-salvage-menu': () => bulkSalvageAllInventory({ ask: false }),
        'eqw-judge-menu': () => equipmentTriage.start()
    });
    function runRailToolOnDoubleClick(event) {
        const summary = event.target.closest && event.target.closest(':is(#item-tab-equip, #stump-equip-host) .eqw-rail-menu > summary');
        const action = summary && RAIL_DOUBLE_CLICK[summary.parentElement.id];
        if (!action) return;
        event.preventDefault();
        summary.parentElement.removeAttribute('open');
        action();
    }
    /** 해체 panel opened from elsewhere (the triage's near-full hint): auto salvage is set there now. */
    function openSalvage() {
        const menu = document.getElementById('eqw-salvage-menu');
        if (menu) menu.open = true;
    }
    /** 아이템 필터 열기: the drop filter moved to the settings screen (2026-10-19). */
    function openItemFilter() {
        switchTab('tab-settings');
        settingsUi.select('items');
    }

    // ---------------------------------------------------------------- 새 아이템
    const seenId = () => {
        if (!Number.isFinite(Number(game.bagSeenId)) || game.bagSeenId === null) game.bagSeenId = itemIdCounter;
        return Number(game.bagSeenId);
    };
    const isNew = item => !!item && Number(item.id) > seenId();
    /** The red dot of a new bag item (js/canvas-passive-tree.js renderEquipmentGridItem). */
    const newDotHtml = item => (isNew(item) ? '<span class="eqw-new-dot" aria-label="새 아이템"></span>' : '');
    let watched = null, bagShown = false;
    /** The bag counts as opened while its grid is on screen; when it leaves the screen everything that came in so far is seen. */
    function watchBag() {
        const target = document.querySelector(':is(#item-tab-equip, #stump-equip-host) .equipment-inventory-grid-shell');
        if (!target || watched === target || typeof IntersectionObserver !== 'function') return;
        watched = target;
        new IntersectionObserver(entries => {
            if (entries.some(entry => entry.isIntersecting)) bagShown = true;
            else if (bagShown) {
                bagShown = false;
                game.bagSeenId = itemIdCounter;
            }
        }).observe(target);
    }

    /** Items-tab refresh (js/ui.js renderEquipmentLoadoutSummary): the summary. */
    function render(stats) {
        const dps = fmt(stats.totalDps || stats.dps);
        setHtml(document.getElementById('ui-equipment-loadout-summary'), fullHtml(stats, dps) + miniHtml(stats, dps));
    }
    /** Bag refresh (js/ui.js renderEquipmentBagPanel: the equipment window, or the stump tab's left gem): the bag head, the rail and the
     * new-item watch. */
    function renderBag() {
        renderHead();
        fillRailIcons();
        markFilter();
        markSearchSalvage();
        watchBag();
    }

    // ---------------------------------------------------------------- 선택한 장비
    /** Where the selected item panel sits (css/equipment-window.css --eqw-dock): 'panel' in the right column, 'sheet' rising from
     * the bottom on a phone, '' floating next to the item (js/equipment-inventory-grid-ui.js positionInspector). */
    const inspectorDock = inspector => getComputedStyle(inspector).getPropertyValue('--eqw-dock').trim();
    /** The worn slots a bag item would replace: the filled candidate slots, else all of them. Jewels go into sockets, not slots. */
    function compareSlots(item) {
        if (bagItems.isJewel(item)) return [];
        const slots = getEquipCandidateSlots(item);
        const filled = slots.filter(slot => (game.equipment || {})[slot]);
        return filled.length ? filled : slots;
    }
    /** 고른 가방 장비와 옵션을 견줄 지금 낀 장비의 칸(끼운 후보 칸, 셋까지). 주얼, 코어, 액막이는 견줄 옵션이 한두 줄이라 없다. */
    const wornSlots = item => (bagItems.isSpecial(item) ? [] : compareSlots(item).filter(slot => (game.equipment || {})[slot]).slice(0, 3));
    /** 고른 장비와 지금 낀 장비의 옵션(2026-10-11, 개편으로 낀 장비의 옵션이 사라져 확인하기 힘들다는 사용자 말): 칸이 넓으면 나란히,
     * 좁으면(휴대폰, 좁게 뜬 칸) 탭으로 바꿔 본다(css/equipment-window.css .eqw-compare). @param {{ tab: string, label: string, node: Element }[]} panes */
    function compareNode(panes, selectedLabel) {
        const wrap = document.createElement('div');
        wrap.className = 'eqw-compare';
        wrap.dataset.panes = String(panes.length);
        const selected = Math.max(0, panes.findIndex(pane => pane.label === selectedLabel));
        const tabs = panes.map((pane, index) => `<button type="button" aria-pressed="${index === selected}" class="${index === selected ? 'active' : ''}" onclick="equipmentWindowUi.showPane(this, ${index})">${escapeHTML(pane.tab)}</button>`);
        wrap.innerHTML = `<div class="eqw-compare-tabs">${tabs.join('')}</div><div class="eqw-compare-panes"></div>`;
        panes.forEach((pane, index) => {
            const section = document.createElement('section');
            section.className = `eqw-compare-pane${index === selected ? ' active' : ''}`;
            const head = document.createElement('h5');
            head.textContent = pane.label;
            section.append(head, pane.node);
            wrap.lastElementChild.append(section);
        });
        return wrap;
    }
    /** 좁은 칸의 탭: 고른 장비와 지금 낀 장비 가운데 하나를 보여 준다. */
    function showPane(button, index) {
        const wrap = button.closest('.eqw-compare');
        wrap.querySelectorAll('.eqw-compare-tabs > button, .eqw-compare-pane').forEach(node => node.classList.remove('active'));
        wrap.querySelectorAll('.eqw-compare-tabs > button').forEach((node, tabIndex) => node.setAttribute('aria-pressed', String(tabIndex === index)));
        wrap.querySelectorAll('.eqw-compare-tabs > button')[index].classList.add('active');
        wrap.querySelectorAll('.eqw-compare-pane')[index].classList.add('active');
        equipmentInventoryInteraction.positionInspector();
    }
    function wornNames(slots) {
        const worn = slots.map(slot => game.equipment[slot]).filter(Boolean);
        if (!worn.length) return '비어 있음';
        return worn.map(row => `<span class="${row.rarity || 'normal'}">${escapeHTML(row.name || row.baseName || '장비')}</span>`).join(', ');
    }
    function subtitleOf(slot, slots) {
        if (slot) return `${slotName(slot)} 칸에 장착 중`;
        return slots.length ? `${slots.map(slotName).join(', ')} 칸과 비교` : '';
    }
    const deltaTablesHtml = slots => slots.map(target => `<div class="eqw-deltas" data-eqw-slot="${escapeHTML(target)}"><div class="eqw-dl-head">바꾸면${slots.length > 1 ? `, ${escapeHTML(slotName(target))}` : ''}</div>
        <div class="eqw-dl-body"><p class="eqw-none">계산 중</p></div></div>`).join('');
    /** The panel's markup (js/canvas-passive-tree.js renderEquipmentInventoryInspector); the 바꾸면 tables fill in afterwards (fillDeltas). */
    function inspectorHtml(item, slot, actionsHtml, flags) {
        const slots = slot ? [] : compareSlots(item);
        const hint = slot ? escapeHTML(item.baseName || '장착 중') : bagItems.isJewel(item) ? '빈 소켓이 있는 장비에 끼웁니다' : `지금 장착: ${wornNames(slots)}`;
        const rarity = item.rarity || 'normal';
        return `<h4 class="eqw-title">선택한 장비<small>${escapeHTML(subtitleOf(slot, slots))}</small></h4>
            <div class="eqw-pick rarity-${rarity}"><img src="${getEquipmentGridVisualAsset(item)}" alt="" draggable="false"><div><b class="${rarity}">${escapeHTML(item.name || item.baseName || '장비')}</b>
                <small>${hint}${flags ? `, ${escapeHTML(flags)}` : ''}</small></div></div>
            <div class="eqw-inspector-body">${deltaTablesHtml(slots)}${orderedBody(actionsHtml)}</div>
            <button type="button" class="equipment-grid-inspector-close" aria-label="선택 닫기" onclick="equipmentInventoryInteraction.focus(null)">×</button>`;
    }
    /** 휴대폰 카드(sheet)는 단추 줄을 옵션 뒤에 그린다: 바꾸면 표 바로 밑의 단추 줄이 카드의 끝처럼 보여 아래의 옵션을 찾기 어려웠다.
     * css/equipment-window.css가 그 줄을 카드 아래에 붙인다. 넓은 창은 표, 단추, 옵션 차례 그대로다. */
    function orderedBody(actionsHtml) {
        const actions = `<div class="equipment-grid-inspector-actions">${actionsHtml}</div>`, details = '<div class="equipment-inspection-details"></div>';
        const inspector = document.getElementById('ui-equipment-inventory-inspector');
        return inspector && inspectorDock(inspector) === 'sheet' ? details + actions : actions + details;
    }
    /** Phone management stays separate from the equip action; it changes presentation only. */
    function toggleTools(button) {
        const actions = button.closest('.equipment-grid-inspector-actions');
        const open = actions.classList.toggle('tools-open');
        button.setAttribute('aria-expanded', String(open));
        button.textContent = open ? '관리 닫기' : '장비 관리';
    }
    /** The panel without a selection: in the right column it keeps its title band. */
    const emptyHtml = message => `<h4 class="eqw-title">선택한 장비</h4><div class="equipment-grid-inspector-empty">${message}</div>`;

    /** Stats with `item` in `slot`, by the comparison tooltip's own swap (js/ui.js buildSlotPanel). @returns [before, after] */
    function swapStats(item, slot) {
        const before = getUiPlayerStats({}, false);
        const equipment = game.equipment, had = Object.prototype.hasOwnProperty.call(equipment, slot), backup = equipment[slot];
        const twins = Array.isArray(game.cosmosTwinKeystones) ? game.cosmosTwinKeystones.slice() : game.cosmosTwinKeystones;
        try {
            equipment[slot] = item;
            return [before, getUiPlayerStats({}, false)];
        } finally {
            if (had) equipment[slot] = backup;
            else delete equipment[slot];
            game.cosmosTwinKeystones = twins;
        }
    }
    function deltaRow(key, a, b, rest) {
        const meta = COMPARE_STAT_META[key], d = b - a, sign = d > 0 ? '+' : '-';
        // DPS는 앞뒤 값이 이미 길어서 증감은 비율만 적는다(좁은 칸에서 "-473,651 (-24.7%)"가 네 줄로 꺾였다).
        const pct = key === 'dps' && a > 0 ? `${sign}${Math.abs(100 * d / a).toFixed(1)}%` : '';
        const tint = COLOR[DELTA_TINT[key]];
        return `<div class="eqw-dl ${d > 0 ? 'up' : 'down'}${rest ? ' is-rest' : ''}"><span${tint ? ` style="color:${tint}"` : ''}>${meta.label}</span><b>${pretty(meta.format(a))}</b><i>→</i>`
            + `<b>${pretty(meta.format(b))}</b><em>${pct || `${sign}${pretty(meta.format(Math.abs(d)))}`}</em></div>`;
    }
    function uniqueRows(item, worn) {
        if ((worn && worn.uniqueEffect) === item.uniqueEffect) return '';
        const gain = item.uniqueEffect ? `<div class="eqw-dl-note is-gain">획득: ${escapeHTML(item.uniqueEffect)}</div>` : '';
        return gain + (worn && worn.uniqueEffect ? `<div class="eqw-dl-note is-loss">상실: ${escapeHTML(worn.uniqueEffect)}</div>` : '');
    }
    /** 허리띠를 바꾸면 달라지는 액막이 칸 한 줄(2026-10-11, 허리띠마다 1~3칸이라): 칸 수 변화만(사용자: "액막이 칸수 변화만 보여줘"). */
    function wardRows(item, slot) {
        const change = colonyWards.slotChange(item, slot);
        if (!change) return '';
        return `<div class="eqw-dl-note ${change.to > change.from ? 'is-gain' : 'is-loss'}">액막이 칸 ${change.from} → ${change.to}</div>`;
    }
    /** 휴대폰의 바꾸면 표는 요약에 있는 능력치(DPS, 생명력, 보호막, 방어, 저항)만 먼저 보인다. 표가 열다섯 줄까지 길어져 그 아래 고른 장비의
     * 옵션이 밀렸다(2026-10-11). 나머지 줄은 이 단추로 편다(css/equipment-window.css .eqw-dl-more, PC에서는 단추 없이 다 보인다). */
    function restButton(count) {
        return count ? `<button type="button" class="eqw-dl-more" data-rest="${count}" onclick="equipmentWindowUi.toggleDeltas(this)">나머지 변화 ${count}줄 보기</button>` : '';
    }
    function toggleDeltas(button) {
        const open = button.closest('.eqw-dl-body').classList.toggle('is-open');
        button.textContent = open ? '접기' : `나머지 변화 ${button.dataset.rest}줄 보기`;
        equipmentInventoryInteraction.positionInspector();
    }
    function deltaHtml(item, slot) {
        const [before, after] = swapStats(item, slot);
        const keys = Object.keys(COMPARE_STAT_META).filter(key => Math.abs((Number(after[key]) || 0) - (Number(before[key]) || 0)) >= 0.001);
        const rest = keys.filter(key => !DELTA_TINT[key]);
        const fold = rest.length < keys.length ? rest : []; // 요약 능력치가 하나도 안 바뀌면 접지 않는다
        const rows = keys.map(key => deltaRow(key, Number(before[key]) || 0, Number(after[key]) || 0, fold.includes(key))).join('');
        return (rows + restButton(fold.length) + wardRows(item, slot) + uniqueRows(item, game.equipment[slot])) || '<p class="eqw-none">능력치 변화 없음</p>';
    }
    const deltaCache = new Map();
    const deltaJobs = new WeakMap();
    /** A short key for the long gear signature (FNV-1a). */
    function hashKey(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        return (h >>> 0).toString(36);
    }
    /** Fills the panel's 바꾸면 tables once the browser is idle; the same item and gear (signature) reuse the last result. */
    function fillDeltas(root, item, signature) {
        const job = {};
        deltaJobs.set(root, job);
        const tables = [...root.querySelectorAll('.eqw-deltas[data-eqw-slot]')];
        if (!tables.length) return;
        const sig = hashKey(String(signature));
        const fill = table => {
            if (!table.isConnected) return;
            const key = `${sig}|${table.dataset.eqwSlot}`;
            if (!deltaCache.has(key)) deltaCache.set(key, deltaHtml(item, table.dataset.eqwSlot));
            const body = table.querySelector('.eqw-dl-body');
            const focused = body.contains(document.activeElement);
            body.innerHTML = deltaCache.get(key);
            const more = body.querySelector('.eqw-dl-more');
            if (more && body.classList.contains('is-open')) more.textContent = '접기';
            if (focused) more?.focus({ preventScroll: true });
        };
        const run = () => {
            if (deltaJobs.get(root) !== job) return; // A newer refresh owns these reused tables.
            tables.forEach(fill);
            equipmentInventoryInteraction.positionInspector(); // the taller floating panel finds its place again
        };
        if (deltaCache.size > 24) deltaCache.clear();
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 200 });
        else setTimeout(run, 0);
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
        document.addEventListener('pointerdown', closeMenus, true);
        document.addEventListener('toggle', keepOnePanel, true);
        document.addEventListener('keydown', closePanelOnEscape, true);
        document.addEventListener('dblclick', runRailToolOnDoubleClick, true);
    }
    return Object.freeze({ render, renderBag, toggleLoadout, newDotHtml, inspectorDock, inspectorHtml, emptyHtml, fillDeltas, wornSlots, compareNode, showPane, toggleDeltas,
        openSalvage, openItemFilter, toggleTools });
})();
safeExposeGlobals({ equipmentWindowUi });
