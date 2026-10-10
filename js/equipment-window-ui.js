/**
 * 장비창(2026-10-10 개편, 사용자가 시안 6차에서 고른 고급 테마). 왼쪽은 장착 장비(인형 배치, 칸마다 그림과 칸 이름만), 요약(DPS 하나만
 * 크게, 그 아래 저항, 생명력과 에너지 보호막, 방어도와 회피, 유효 생명력을 능력치마다 제 색으로), 세팅 한 줄. 가운데는 가방이고 머리 한 줄에
 * 칸 수, 검색, 등급, 칸, 정렬, ⋯(빈칸 정리, 배치 모드, 판단, 다시 분석, 추천 교체, 빈 칸 채우기, 일괄 해체, 해체 복구, 드랍 필터)를 둔다.
 * 창이 넓으면 오른쪽에 선택한 장비(바꾸면 증감표, 단추, 툴팁)가 붙고, 좁으면 같은 내용이 떠서 나오며, 휴대폰은 요약을 한 줄로 접고
 * (장착 장비 ▾로 펼친다) 선택한 장비는 아래에서 올라온다. 배치와 모양은 css/equipment-window.css.
 * 새로 들어온 아이템은 빨간 점 하나: id가 game.bagSeenId보다 크면 새 것이고, 가방을 열었다가 닫으면 그때까지 들어온 것을 모두 본 것으로 친다.
 */
const equipmentWindowUi = (() => {
    const COLOR = Object.freeze({ dps: '#ffcf6e', life: '#ff6b6b', es: '#7fd3ff', fire: '#ff8a50', cold: '#6cb8ff', light: '#ffd54f', chaos: '#c39bff',
        armor: '#d2b98c', evasion: '#8fe08f', phys: '#d6cdb8' });
    const RES = Object.freeze([['화염', 'resF', 'maxResF', 'fire'], ['냉기', 'resC', 'maxResC', 'cold'], ['번개', 'resL', 'maxResL', 'light'],
        ['카오스', 'resChaos', 'maxResChaos', 'chaos']]);
    const EHP = Object.freeze([['물리', 'phys'], ['화염', 'fire'], ['냉기', 'cold'], ['번개', 'light'], ['카오스', 'chaos']]);
    /** 바꾸면 표의 이름 색: 요약과 같은 능력치는 요약과 같은 색. */
    const DELTA_TINT = Object.freeze({ dps: 'dps', summonDps: 'dps', maxHp: 'life', energyShield: 'es', resF: 'fire', resC: 'cold', resL: 'light',
        resChaos: 'chaos', armor: 'armor', evasion: 'evasion' });
    const fmt = value => Math.floor(Number(value) || 0).toLocaleString('ko-KR');
    const pretty = text => (/^-?\d{4,}$/.test(text) ? Number(text).toLocaleString('ko-KR') : text);
    const slotName = slot => (typeof getDualSlotDisplayLabel === 'function' ? getDualSlotDisplayLabel(slot) : String(slot).replace(/[123]$/, ''));
    const kv = (name, value, tint, cap) => `<div class="eqw-kv" style="--c:${COLOR[tint]}"><span>${name}</span><b>${value}${cap ? `<small>/${cap}</small>` : ''}</b></div>`;
    const resOf = (stats, key) => Math.floor(Number(stats[key]) || 0);
    function setHtml(node, html) {
        if (node && node.__eqwHtml !== html) { node.innerHTML = html; node.__eqwHtml = html; }
    }

    // ---------------------------------------------------------------- 요약
    function ehpHtml(stats) {
        const profile = typeof calculatePlayerEhpProfile === 'function' ? calculatePlayerEhpProfile(stats) : null;
        if (!profile) return '';
        const items = EHP.map(([name, key]) => `<span style="--c:${COLOR[key]}" title="직격 ${fmt(profile.elements[key].direct)}">${name} <b>${fmt(profile.elements[key].entropy)}</b></span>`);
        return `<div class="eqw-ehp"><span class="eqw-ehp-label">유효 생명력</span>${items.join('')}</div>`;
    }
    function fullHtml(stats, dps) {
        const res = RES.map(([name, key, cap, tint]) => kv(`${name} 저항`, resOf(stats, key), tint, resOf(stats, cap) || 75)).join('');
        const rest = kv('생명력', fmt(stats.maxHp), 'life') + kv('에너지 보호막', fmt(stats.energyShield), 'es') + kv('방어도', fmt(stats.armor), 'armor')
            + kv('회피', fmt(stats.evasion), 'evasion');
        return `<div class="eqw-summary-full"><div class="eqw-dps" style="--c:${COLOR.dps}"><span>DPS</span><b>${dps}</b></div>
            <div class="eqw-kvs">${res}${rest}</div>${ehpHtml(stats)}</div>`;
    }
    /** Phone: one line under a toggle that unfolds the equipped gear and the presets (game.settings.equipmentMobilePane). */
    function miniHtml(stats, dps) {
        const open = (game.settings || {}).equipmentMobilePane === 'loadout';
        const word = (name, value, tint) => `<span style="--c:${COLOR[tint]}">${name} <b>${value}</b></span>`;
        const words = RES.map(([name, key, , tint]) => word(name, resOf(stats, key), tint)).join('')
            + word('생명력', fmt(stats.maxHp), 'life') + word('에너지 보호막', fmt(stats.energyShield), 'es');
        return `<div class="eqw-summary-mini"><button type="button" class="eqw-mini-toggle" aria-expanded="${open}" onclick="equipmentWindowUi.toggleLoadout()">장착 장비 ${open ? '▴' : '▾'}</button>
            <div class="eqw-mini-dps" style="--c:${COLOR.dps}"><small>DPS</small><b>${dps}</b></div><div class="eqw-mini-line">${words}</div></div>`;
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
    /** ⋯ closes when the pointer goes down anywhere outside it. */
    function closeMenus(event) {
        document.querySelectorAll('#item-tab-equip details.eqw-more[open]').forEach(menu => {
            if (!menu.contains(event.target)) menu.removeAttribute('open');
        });
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
        const target = document.querySelector('#item-tab-equip .equipment-inventory-grid-shell');
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

    /** Items-tab refresh (js/ui.js renderEquipmentLoadoutSummary): the summary, the bag head and the new-item watch. */
    function render(stats) {
        const dps = fmt(stats.totalDps || stats.dps);
        setHtml(document.getElementById('ui-equipment-loadout-summary'), fullHtml(stats, dps) + miniHtml(stats, dps));
        renderHead();
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
            ${deltaTablesHtml(slots)}<div class="equipment-grid-inspector-actions">${actionsHtml}</div><div class="equipment-inspection-details"></div>
            <button type="button" class="equipment-grid-inspector-close" aria-label="선택 닫기" onclick="equipmentInventoryInteraction.focus(null)">×</button>`;
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
    function deltaRow(key, a, b) {
        const meta = COMPARE_STAT_META[key], d = b - a, sign = d > 0 ? '+' : '-';
        const pct = key === 'dps' && a > 0 ? ` (${sign}${Math.abs(100 * d / a).toFixed(1)}%)` : '';
        const tint = COLOR[DELTA_TINT[key]];
        return `<div class="eqw-dl ${d > 0 ? 'up' : 'down'}"><span${tint ? ` style="color:${tint}"` : ''}>${meta.label}</span><b>${pretty(meta.format(a))}</b><i>→</i>`
            + `<b>${pretty(meta.format(b))}</b><em>${sign}${pretty(meta.format(Math.abs(d)))}${pct}</em></div>`;
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
    function deltaHtml(item, slot) {
        const [before, after] = swapStats(item, slot);
        const rows = Object.keys(COMPARE_STAT_META).filter(key => Math.abs((Number(after[key]) || 0) - (Number(before[key]) || 0)) >= 0.001)
            .map(key => deltaRow(key, Number(before[key]) || 0, Number(after[key]) || 0)).join('');
        return (rows + wardRows(item, slot) + uniqueRows(item, game.equipment[slot])) || '<p class="eqw-none">능력치 변화 없음</p>';
    }
    const deltaCache = new Map();
    /** A short key for the long gear signature (FNV-1a). */
    function hashKey(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
        return (h >>> 0).toString(36);
    }
    /** Fills the panel's 바꾸면 tables once the browser is idle; the same item and gear (signature) reuse the last result. */
    function fillDeltas(root, item, signature) {
        const tables = [...root.querySelectorAll('.eqw-deltas[data-eqw-slot]')];
        if (!tables.length) return;
        const sig = hashKey(String(signature));
        const fill = table => {
            if (!table.isConnected) return;
            const key = `${sig}|${table.dataset.eqwSlot}`;
            if (!deltaCache.has(key)) deltaCache.set(key, deltaHtml(item, table.dataset.eqwSlot));
            table.querySelector('.eqw-dl-body').innerHTML = deltaCache.get(key);
        };
        const run = () => {
            tables.forEach(fill);
            equipmentInventoryInteraction.positionInspector(); // the taller floating panel finds its place again
        };
        if (deltaCache.size > 24) deltaCache.clear();
        if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 200 });
        else setTimeout(run, 0);
    }

    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('pointerdown', closeMenus, true);
    return Object.freeze({ COLOR, render, toggleLoadout, newDotHtml, isNew, inspectorDock, inspectorHtml, emptyHtml, fillDeltas });
})();
safeExposeGlobals({ equipmentWindowUi });
