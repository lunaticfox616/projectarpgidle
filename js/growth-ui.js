// 생장판 UI: 격자 렌더, 드래그 배치, 회전, 시너지 시각화, 툴팁, 보관함, 최근 획득함, 세팅.
// 도메인(js/growth-board.js, js/growth-effects.js)을 호출하며, 도메인이 UI를 호출하지 않는다.

let growthSelection = { itemId: null, source: null, rotation: 0, hoverCell: null };

function getGrowthCategoryInfo(category) {
    return GROWTH_CATEGORY_INFO[category] || { label: '기타', icon: '❔' };
}

function selectGrowthItem(itemId, source) {
    let numericId = Math.floor(Number(itemId));
    if (growthSelection.itemId === numericId) {
        growthSelection = { itemId: null, source: null, rotation: 0, hoverCell: null };
    } else {
        let placement = (getActiveGrowthLoadout().placements || {})[numericId];
        growthSelection = { itemId: numericId, source: source || 'inventory', rotation: placement ? placement.rotation : 0, hoverCell: null };
    }
    renderGrowthBoardPanel();
}

function rotateGrowthSelection() {
    if (growthSelection.itemId === null) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    let item = findGrowthItemById(growthSelection.itemId);
    if (item && item.rotationLocked) return addLog('회전이 봉인된 아이템입니다.', 'attack-monster');
    let placement = (getActiveGrowthLoadout().placements || {})[growthSelection.itemId];
    if (placement) {
        let result = rotatePlacedGrowthItem(growthSelection.itemId);
        if (!result.ok) return addLog(result.reason, 'attack-monster');
        growthSelection.rotation = placement.rotation;
    } else {
        growthSelection.rotation = (growthSelection.rotation + 1) % 4;
    }
    renderGrowthBoardPanel();
}

function handleGrowthCellClick(x, y) {
    // 드래그로 배치한 직후 따라오는 합성 클릭이 한 번 더 동작하지 않게 막는다.
    if (Date.now() < growthSuppressClickUntil) return;
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let occupantId = getGrowthOccupantIdAt(x, y);
    if (growthSelection.itemId === null) {
        if (occupantId === null) return;
        selectGrowthItem(occupantId, 'board');
        return;
    }
    let item = findGrowthItemById(growthSelection.itemId);
    if (!item) { growthSelection.itemId = null; return renderGrowthBoardPanel(); }
    let result = placeGrowthItem(item.id, x, y, growthSelection.rotation);
    if (!result.ok) return addLog(result.reason, 'attack-monster');
    growthSelection = { itemId: null, source: null, rotation: 0, hoverCell: null };
    addLog(`🌱 [${item.name}] 배치`, 'loot-normal');
    updateStaticUI();
}

function getGrowthOccupantIdAt(x, y) {
    let found = null;
    getPlacedGrowthEntries().forEach(entry => {
        if (entry.cells.some(([cx, cy]) => cx === x && cy === y)) found = entry.item.id;
    });
    return found;
}

function unplaceGrowthItem(itemId) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!removeGrowthPlacement(itemId)) return;
    growthSelection = { itemId: null, source: null, rotation: 0, hoverCell: null };
    updateStaticUI();
}

function setGrowthHoverCell(x, y) {
    if (growthSelection.itemId === null) return;
    growthSelection.hoverCell = { x, y };
    paintGrowthPlacementPreview();
}

function clearGrowthHoverCell() {
    growthSelection.hoverCell = null;
    paintGrowthPlacementPreview();
}

// 미리보기는 DOM을 다시 만들지 않고 클래스만 갱신한다(드래그 중 렉 방지).
function paintGrowthPlacementPreview() {
    let host = document.getElementById('ui-growth-board');
    if (!host) return;
    host.querySelectorAll('.growth-cell').forEach(cell => cell.classList.remove('preview-ok', 'preview-bad'));
    let hover = growthSelection.hoverCell;
    let item = growthSelection.itemId === null ? null : findGrowthItemById(growthSelection.itemId);
    if (!item || !hover) return renderGrowthHoverHint(null, null, null);
    let check = canPlaceGrowthItem(item, hover.x, hover.y, growthSelection.rotation);
    getGrowthItemCells(item, growthSelection.rotation).forEach(([dx, dy]) => {
        let cell = host.querySelector(`.growth-cell[data-x="${dx + hover.x}"][data-y="${dy + hover.y}"]`);
        if (cell) cell.classList.add(check.ok ? 'preview-ok' : 'preview-bad');
    });
    renderGrowthHoverHint(item, hover, check);
}

// 놓기 전에 "이 칸이 나에게 얼마짜리인가"를 알려준다.
// 칸마다 레벨 배지는 있지만, 그 레벨이 내 아이템 옵션을 몇 % 올리는지는 놓아 봐야 알 수 있었다.
function renderGrowthHoverHint(item, hover, check) {
    let host = document.getElementById('ui-growth-hover-hint');
    if (!host) return;
    if (!item || !hover) { host.innerHTML = ''; return; }
    if (check && !check.ok) {
        host.innerHTML = `<span class="growth-hover-bad">${escapeHTML(check.reason || '배치할 수 없습니다.')}</span>`;
        return;
    }
    let level = getGrowthCellLevel(hover.x, hover.y);
    let capped = Math.max(-GROWTH_LEVEL_CAP, Math.min(GROWTH_LEVEL_CAP, level));
    let pct = Math.round((getGrowthLevelMultiplier(capped) - 1) * 100);
    if (isGrowthSlab(item)) {
        host.innerHTML = `<span>(${hover.x + 1}, ${hover.y + 1}) — 석판은 레벨을 받지 않고 <strong>주변에 뿌립니다</strong></span>`;
        return;
    }
    let tone = capped > 0 ? 'growth-hover-good' : (capped < 0 ? 'growth-hover-bad' : '');
    let levelText = capped === 0 ? '석판 레벨 없음' : `석판 레벨 ${capped > 0 ? '+' : ''}${capped} → 옵션 ${pct > 0 ? '+' : ''}${pct}%`;
    host.innerHTML = `<span class="${tone}">(${hover.x + 1}, ${hover.y + 1}) — ${levelText}</span>`;
}

function renderGrowthBoardGrid() {
    let entries = getPlacedGrowthEntries();
    let ownerMap = new Map();
    entries.forEach(entry => entry.cells.forEach(([x, y]) => ownerMap.set(`${x},${y}`, entry)));
    let selectedEntry = entries.find(entry => entry.item.id === growthSelection.itemId) || null;
    let relatedIds = getGrowthRelatedItemIds(selectedEntry);
    let slabCells = getSelectedSlabInfluenceCells();
    let rows = [];
    for (let y = 0; y < GROWTH_BOARD_H; y++) {
        let cells = [];
        for (let x = 0; x < GROWTH_BOARD_W; x++) {
            cells.push(renderGrowthCell(x, y, ownerMap.get(`${x},${y}`), relatedIds, slabCells));
        }
        rows.push(cells.join(''));
    }
    return `<div id="ui-growth-board" class="growth-board" style="grid-template-columns:repeat(${GROWTH_BOARD_W}, 1fr);">${rows.join('')}</div>`;
}

function renderGrowthCell(x, y, entry, relatedIds, slabCells) {
    let unlocked = isGrowthCellUnlocked(x, y);
    let classes = ['growth-cell'];
    if (!unlocked) classes.push('sealed');
    let label = '';
    let style = '';
    if (entry) {
        let item = entry.item;
        classes.push('filled', `cat-${item.growthCategory}`, `rarity-${item.rarity || 'normal'}`);
        if (item.id === growthSelection.itemId) classes.push('selected');
        else if (relatedIds.has(item.id)) classes.push('related');
        let firstCell = entry.cells[0];
        if (firstCell && firstCell[0] === x && firstCell[1] === y) label = getGrowthCategoryInfo(item.growthCategory).icon;
        style = ` style="border-color:${getRarityColor(item.rarity || 'normal')};"`;
    }
    // 선택한 석판의 영향권을 강화/약화로 구분해 보여준다.
    let influence = slabCells ? slabCells.get(`${x},${y}`) : undefined;
    if (influence !== undefined) classes.push(influence >= 0 ? 'slab-buff' : 'slab-debuff');
    let level = unlocked ? getGrowthCellLevel(x, y) : 0;
    let levelBadge = level !== 0
        ? `<span class="growth-cell-level${level < 0 ? ' negative' : ''}">${level > 0 ? '+' : ''}${level}</span>`
        : '';
    let handlers = unlocked
        ? ` onclick="handleGrowthCellClick(${x},${y})" onmouseenter="setGrowthHoverCell(${x},${y})" onmouseleave="clearGrowthHoverCell()"`
        : '';
    let tooltip = entry
        ? ` data-info-tooltip-anchor="1" onmousemove="showGrowthItemTooltip(event, ${entry.item.id})"`
        : '';
    return `<div class="${classes.join(' ')}" data-x="${x}" data-y="${y}"${style}${handlers}${tooltip}>${label}${levelBadge}</div>`;
}

// 선택된 석판이 영향을 주는 칸 → 부여 레벨(합계). 없으면 null.
function getSelectedSlabInfluenceCells() {
    if (growthSelection.itemId === null) return null;
    let entry = getPlacedGrowthEntries().find(row => row.item.id === growthSelection.itemId);
    if (!entry || !isGrowthSlab(entry.item)) return null;
    let def = getGrowthSlabDef(entry.item);
    if (!def) return null;
    let [originX, originY] = entry.cells[0];
    let cells = new Map();
    (def.grants || []).forEach(grant => {
        getGrowthSlabPatternCells(grant.pattern, originX, originY).forEach(([x, y]) => {
            let key = `${x},${y}`;
            cells.set(key, (cells.get(key) || 0) + Number(grant.level || 0));
        });
    });
    return cells;
}

// 선택 아이템과 실제로 효과를 주고받는 아이템만 강조한다(무관한 효과는 표시하지 않는다).
function getGrowthRelatedItemIds(selectedEntry) {
    let related = new Set();
    if (!selectedEntry) return related;
    let selfKeys = new Set(selectedEntry.cells.map(([x, y]) => `${x},${y}`));
    getPlacedGrowthEntries().forEach(entry => {
        if (entry.item.id === selectedEntry.item.id) return;
        let touches = entry.cells.some(([x, y]) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => selfKeys.has(`${x + dx},${y + dy}`)));
        let sharesLine = entry.cells.some(([x, y]) => selectedEntry.cells.some(([sx, sy]) => sx === x || sy === y));
        if (touches || sharesLine) related.add(entry.item.id);
    });
    return related;
}

function renderGrowthUnlockSummary() {
    let board = ensureGrowthBoardState();
    let nextStage = GROWTH_UNLOCK_STAGES.find(stage => stage.cells > board.unlockedCellCount);
    let nextText = nextStage ? `다음 해금: ${nextStage.label} (${nextStage.cells}칸)` : '모든 칸이 해금되었습니다.';
    let stages = GROWTH_SYNERGY_STAGES.map(stage => {
        let open = isGrowthSynergyStageUnlocked(stage.key);
        return `<span class="growth-stage-chip${open ? ' open' : ''}">${open ? '✔' : '🔒'} ${escapeHTML(stage.label)}</span>`;
    }).join('');
    return `<div class="growth-summary-row">
        <span>활성 칸 <strong>${board.unlockedCellCount}</strong> / ${GROWTH_BOARD_W * GROWTH_BOARD_H}</span>
        <span style="color:#8fb7ca;">${escapeHTML(nextText)}</span>
    </div>
    <div class="growth-stage-row">${stages}</div>`;
}

function renderGrowthLoadoutBar() {
    let board = ensureGrowthBoardState();
    let buttons = board.loadouts.map((loadout, idx) => {
        let count = Object.keys(loadout.placements || {}).length;
        return `<button type="button" class="growth-loadout-btn${idx === board.activeLoadout ? ' active' : ''}" onclick="switchGrowthLoadoutFromUi(${idx})">${escapeHTML(loadout.name)} <span style="color:#8fb7ca;">(${count})</span></button>`;
    }).join('');
    return `<div class="growth-loadout-bar">${buttons}<button type="button" onclick="renameGrowthLoadoutFromUi()">세팅 이름 변경</button></div>`;
}

function switchGrowthLoadoutFromUi(idx) {
    if (switchGrowthLoadout(idx)) updateStaticUI();
}

async function renameGrowthLoadoutFromUi() {
    let board = ensureGrowthBoardState();
    let slotIdx = board.activeLoadout;
    let name = await requestGameText({
        title: '생장 세팅 이름',
        message: '세팅 이름을 입력하세요. (최대 12자)',
        value: board.loadouts[slotIdx].name || '',
        maxLength: 12,
        placeholder: '세팅 이름',
        confirmLabel: '이름 적용'
    });
    if (name == null) return;
    if (!renameGrowthLoadout(slotIdx, name)) return addLog('이름이 비어 있습니다.', 'attack-monster');
    updateStaticUI();
}

// 판에서 "지금 무엇이 터지고 있나"를 한자리에 모은다.
// 전역 시너지만 보여 주면 아이템별 공간 조건이 툴팁에 갇혀, 배치를 바꿔도
// 무엇이 켜지고 꺼졌는지 알 수 없다.
function renderActiveGrowthSynergies() {
    let globals = getActiveGrowthGlobalSynergies();
    let entries = getPlacedGrowthEntries();
    let met = [];
    let unmetCount = 0;
    entries.forEach(entry => {
        let report = getGrowthItemConditionReport(entry.item.id);
        report.met.forEach(row => met.push({ name: entry.item.name, label: row.label, times: row.times || 1 }));
        unmetCount += report.unmet.length;
    });
    if (globals.length === 0 && met.length === 0) {
        return `<div class="growth-synergy-empty">발동 중인 시너지가 없습니다.${unmetCount > 0 ? ` (조건 미충족 ${unmetCount}개 — 아이템에 마우스를 올리면 이유가 보입니다)` : ''}</div>`;
    }
    let globalHtml = globals.map(row =>
        `<div class="growth-synergy-row"><strong>🌐 ${escapeHTML(row.label)}</strong>${row.times > 1 ? ` ×${row.times}` : ''}<div>${escapeHTML(row.desc || '')}</div></div>`).join('');
    let itemHtml = met.map(row =>
        `<div class="growth-synergy-row item"><strong>${escapeHTML(row.name)}</strong>${row.times > 1 ? ` ×${row.times}` : ''}<div>${escapeHTML(row.label)}</div></div>`).join('');
    let summary = `<div class="growth-synergy-summary">전역 ${globals.length}개 · 아이템 조건 ${met.length}개 발동${unmetCount > 0 ? ` · 미충족 ${unmetCount}개` : ''}</div>`;
    return summary + globalHtml + itemHtml;
}

// ── 아이템 카드 / 보관함 / 최근 획득함 ───────────────────────────────────
function renderGrowthItemCard(item, mode) {
    let info = getGrowthCategoryInfo(item.growthCategory);
    let placement = (getActiveGrowthLoadout().placements || {})[item.id];
    let selected = growthSelection.itemId === item.id;
    let itemLevel = placement && !isGrowthSlab(item) ? getGrowthItemLevel(item.id) : 0;
    let levelBadge = itemLevel !== 0
        ? ` <span class="growth-level-badge${itemLevel < 0 ? ' negative' : ''}">Lv${itemLevel > 0 ? '+' : ''}${itemLevel}</span>`
        : '';
    let actions = mode === 'recent'
        ? `<button onclick="claimRecentGrowthDrop(${item.id})">보관</button><button onclick="salvageRecentGrowthDrop(${item.id})">해체</button>`
        : `<button onclick="selectGrowthItem(${item.id},'inventory')">${selected ? '선택 해제' : (placement ? '선택' : '배치')}</button>`
          + (placement ? `<button onclick="unplaceGrowthItem(${item.id})">내리기</button>` : '')
          + (isGrowthSlab(item) ? '' : `<button onclick="selectForCrafting(${item.id}, false)">제작</button>`)
          + `<button onclick="toggleGrowthItemLock(${item.id})">${item.locked ? '🔒' : '🔓'}</button>`
          + `<button onclick="salvageGrowthInventoryItem(${item.id})">해체</button>`;
    return `<div class="growth-item-card${selected ? ' selected' : ''}${placement ? ' placed' : ''}" data-info-tooltip-anchor="1" data-growth-drag-id="${item.id}"
        onmouseenter="showGrowthItemTooltip(event, ${item.id})" onmousemove="showGrowthItemTooltip(event, ${item.id})" onmouseleave="hideInfoTooltip()">
        <div class="growth-item-head">
            <span class="item-title loot-${item.rarity || 'normal'}">${info.icon} ${escapeHTML(item.name || '')}</span>
            <span class="growth-item-size">${isGrowthSlab(item) ? '석판' : info.label}${levelBadge}</span>
        </div>
        <div class="growth-item-actions">${actions}</div>
    </div>`;
}

// 보관함이 40칸이라 필터가 없으면 원하는 아이템을 눈으로 훑어야 한다.
// 종류 칩과 "미배치만"으로 후보를 좁힌다.
const GROWTH_INVENTORY_CATEGORIES = ['flower', 'branch', 'leaf', 'slab'];

function getGrowthInventoryFilter() {
    game.settings = game.settings || {};
    let saved = game.settings.growthInventoryFilter;
    if (!saved || typeof saved !== 'object') saved = {};
    let categories = {};
    GROWTH_INVENTORY_CATEGORIES.forEach(key => {
        categories[key] = saved.categories && key in saved.categories ? !!saved.categories[key] : true;
    });
    // 전부 꺼 두면 목록이 통째로 사라져 고장난 것처럼 보인다. 그럴 땐 전체 표시로 되돌린다.
    if (GROWTH_INVENTORY_CATEGORIES.every(key => !categories[key])) {
        GROWTH_INVENTORY_CATEGORIES.forEach(key => { categories[key] = true; });
    }
    let filter = { categories, unplacedOnly: !!saved.unplacedOnly };
    game.settings.growthInventoryFilter = filter;
    return filter;
}

function toggleGrowthInventoryCategory(category) {
    let filter = getGrowthInventoryFilter();
    filter.categories[category] = !filter.categories[category];
    updateStaticUI();
}

function toggleGrowthInventoryUnplacedOnly() {
    let filter = getGrowthInventoryFilter();
    filter.unplacedOnly = !filter.unplacedOnly;
    updateStaticUI();
}

const GROWTH_SORT_LABELS = { recent: '최신', rarity: '등급', tier: '티어', category: '종류' };

function renderGrowthInventoryFilterChips() {
    let filter = getGrowthInventoryFilter();
    let chips = GROWTH_INVENTORY_CATEGORIES.map(key => {
        let info = getGrowthCategoryInfo(key);
        let count = (game.growthInventory || []).filter(item => isGrowthItem(item) && item.growthCategory === key).length;
        return `<button type="button" class="growth-filter-chip${filter.categories[key] ? ' on' : ''}" onclick="toggleGrowthInventoryCategory('${key}')">${info.icon} ${info.label} ${count}</button>`;
    }).join('');
    let sortMode = (game.settings && game.settings.growthSortMode) || 'recent';
    let sortChips = GROWTH_SORT_MODES.map(mode =>
        `<button type="button" class="growth-filter-chip${sortMode === mode ? ' on' : ''}" onclick="sortGrowthInventory('${mode}')">${GROWTH_SORT_LABELS[mode]}순</button>`).join('');
    let autoClaim = !!(game.settings && game.settings.growthAutoClaim);
    return `<div class="growth-filter-row">${chips}
        <button type="button" class="growth-filter-chip${filter.unplacedOnly ? ' on' : ''}" onclick="toggleGrowthInventoryUnplacedOnly()">미배치만</button></div>
        <div class="growth-filter-row"><span class="growth-filter-label">정렬</span>${sortChips}
        <button type="button" class="growth-filter-chip${autoClaim ? ' on' : ''}" onclick="toggleGrowthAutoClaim()" title="드랍을 최근 획득함을 거치지 않고 바로 보관함으로 보냅니다.">자동 보관</button></div>`;
}

function toggleGrowthAutoClaim() {
    game.settings = game.settings || {};
    game.settings.growthAutoClaim = !game.settings.growthAutoClaim;
    addLog(game.settings.growthAutoClaim
        ? '🌱 생장 드랍을 최근 획득함을 건너뛰고 바로 보관함으로 보냅니다. (보관함이 가득 차면 다시 최근 획득함에 쌓입니다)'
        : '🌱 생장 드랍이 최근 획득함을 거칩니다.', 'loot-normal');
    updateStaticUI();
}

function renderGrowthInventorySection() {
    let all = (game.growthInventory || []).filter(isGrowthItem);
    if (all.length === 0) return '<div class="growth-synergy-empty">보관 중인 생장 아이템이 없습니다. 루프 ' + GROWTH_UNLOCK_LOOP + ' 이후 전투에서 드랍됩니다.</div>';
    let filter = getGrowthInventoryFilter();
    let items = all.filter(item => filter.categories[item.growthCategory] !== false
        && (!filter.unplacedOnly || !isGrowthItemPlacedInLoadout(item.id)));
    let chips = renderGrowthInventoryFilterChips();
    if (items.length === 0) return `${chips}<div class="growth-synergy-empty">조건에 맞는 아이템이 없습니다. (전체 ${all.length}개)</div>`;
    return chips + items.map(item => renderGrowthItemCard(item, 'inventory')).join('');
}

function renderGrowthRecentSection() {
    let items = (game.recentGrowthDrops || []).filter(isGrowthItem);
    if (items.length === 0) return '<div class="growth-synergy-empty">최근 획득한 아이템이 없습니다.</div>';
    return items.map(item => renderGrowthItemCard(item, 'recent')).join('');
}

// ── 툴팁 ────────────────────────────────────────────────────────────────
function buildGrowthSlabTooltipHtml(item) {
    let def = getGrowthSlabDef(item);
    let placement = (getActiveGrowthLoadout().placements || {})[item.id];
    let grants = (def && def.grants ? def.grants : []).map(grant => {
        let pattern = (GROWTH_SLAB_PATTERNS[grant.pattern] || {}).label || grant.pattern;
        let positive = Number(grant.level || 0) >= 0;
        return `<div class="tooltip-line" style="color:${positive ? '#7fd99a' : '#e07a7a'};">${escapeHTML(pattern)} 레벨 ${positive ? '+' : ''}${grant.level}</div>`;
    }).join('');
    return `<div class="tooltip-title" style="color:#c9b28a">🪨 ${escapeHTML(item.name || '')}</div>
        <div class="tooltip-line">석판 · 1칸 · 요구 티어 ${Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1))}</div>
        <div class="tooltip-line" style="color:#9fd6ff;margin-top:6px;">${escapeHTML((def && def.desc) || '')}</div>
        ${grants}
        <div class="tooltip-line" style="color:#8fb7ca;margin-top:6px;">석판은 자체 능력치가 없고 제작되지 않습니다. 아이템은 자신이 점유한 칸 중 <strong>가장 높은 레벨</strong>을 받습니다. (레벨 1당 옵션 +${GROWTH_LEVEL_STAT_PCT}%)</div>
        <div class="tooltip-line" style="margin-top:6px;">${placement ? '<span style="color:#7fd99a;">배치됨 (영향 적용 중)</span>' : '<span style="color:#e08a5a;">미배치 (영향 없음)</span>'}</div>`;
}

function buildGrowthTooltipHtml(item) {
    if (isGrowthSlab(item)) return buildGrowthSlabTooltipHtml(item);
    let info = getGrowthCategoryInfo(item.growthCategory);
    let base = getGrowthBaseDef(item);
    let placement = (getActiveGrowthLoadout().placements || {})[item.id];
    let report = placement ? getGrowthItemConditionReport(item.id) : { met: [], unmet: [] };
    let tags = Array.from(getGrowthItemTags(item));
    let statLine = stat => `<div class="tooltip-line">${escapeHTML(stat.statName || getStatName(stat.id))} +${formatValue(stat.id, stat.val)}${Number(stat.tier) > 0 ? ` <span style="color:#8fb7ca;">T${Math.floor(stat.tier)}</span>` : ''}</div>`;
    let flags = [
        item.corrupted ? '<span style="color:#e74c3c;">타락</span>' : '',
        item.fusedRelic ? '<span style="color:#c7a2ff;">융합</span>' : '',
        item.loopSealed ? '<span style="color:#7fd99a;">🌿봉인</span>' : '',
        item.rotationLocked ? '<span style="color:#f39c12;">회전 불가</span>' : ''
    ].filter(Boolean).join(' · ');
    return `<div class="tooltip-title" style="color:${getRarityColor(item.rarity || 'normal')}">${info.icon} ${escapeHTML(item.name || '')}</div>
        <div class="tooltip-line">${info.label} · 1칸 · 요구 티어 ${Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1))}</div>
        ${flags ? `<div class="tooltip-line">${flags}</div>` : ''}
        ${Math.floor(item.quality || 0) > 0 ? `<div class="tooltip-line" style="color:#8fd4ff;">품질 +${Math.floor(item.quality)}%</div>` : ''}
        ${placement ? renderGrowthLevelLine(item.id) : ''}
        <div class="tooltip-line" style="color:#f6c461;margin-top:6px;">베이스 옵션</div>
        ${(item.baseStats || []).map(statLine).join('') || '<div class="tooltip-line">없음</div>'}
        <div class="tooltip-line" style="color:#f6c461;margin-top:6px;">추가 옵션 (${(item.stats || []).length}/${getGrowthItemAffixCap(item)})</div>
        ${(item.stats || []).map(statLine).join('') || '<div class="tooltip-line">없음</div>'}
        ${item.uniqueEffect ? `<div class="tooltip-line" style="color:#ffb05a;margin-top:6px;">${escapeHTML(item.uniqueEffect)}</div>` : ''}
        ${base && base.spatial ? `<div class="tooltip-line" style="color:#9fd6ff;margin-top:6px;">공간 효과: ${escapeHTML(base.spatial.desc || '')}</div>` : ''}
        <div class="tooltip-line" style="color:#8fb7ca;margin-top:4px;">태그: ${tags.map(escapeHTML).join(', ') || '없음'}</div>
        <div class="tooltip-line" style="margin-top:6px;">${placement ? '<span style="color:#7fd99a;">배치됨 (효과 적용 중)</span>' : '<span style="color:#e08a5a;">미배치 (효과 없음)</span>'}</div>
        ${report.met.map(row => `<div class="tooltip-line" style="color:#7fd99a;">✔ ${escapeHTML(row.label)}${row.times > 1 ? ` ×${row.times}` : ''}</div>`).join('')}
        ${report.unmet.map(row => `<div class="tooltip-line" style="color:#96a5b5;">✘ ${escapeHTML(row.label)} — ${escapeHTML(row.reason)}</div>`).join('')}`;
}

// 석판으로 받은 레벨과 그로 인한 옵션 증폭을 한 줄로 보여준다.
function renderGrowthLevelLine(itemId) {
    let level = getGrowthItemLevel(itemId);
    if (level === 0) return '<div class="tooltip-line" style="color:#8fb7ca;">석판 레벨 0 (인접한 석판 없음)</div>';
    let pct = Math.round((getGrowthLevelMultiplier(level) - 1) * 100);
    let color = level > 0 ? '#ffd98a' : '#e07a7a';
    return `<div class="tooltip-line" style="color:${color};">석판 레벨 ${level > 0 ? '+' : ''}${level} → 옵션 ${pct > 0 ? '+' : ''}${pct}%</div>`;
}

function showGrowthItemTooltip(event, itemId) {
    let item = findGrowthItemById(itemId)
        || (game.recentGrowthDrops || []).find(row => row && row.id === itemId);
    if (!item || typeof showInfoTooltipHtml !== 'function') return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildGrowthTooltipHtml(item), getRarityColor(item.rarity || 'normal'));
}

// ── 비교 ────────────────────────────────────────────────────────────────
/** 선택한 아이템을 특정 배치 아이템과 교체했을 때의 변화를 요약한다 (단순 DPS 비교 금지). */
function buildGrowthComparison(candidateId, placedId) {
    let candidate = findGrowthItemById(candidateId);
    let placed = findGrowthItemById(placedId);
    if (!candidate || !placed) return null;
    let sumStats = item => {
        let totals = {};
        [].concat(item.baseStats || [], item.stats || []).forEach(stat => {
            if (!stat || !stat.id) return;
            totals[stat.id] = (totals[stat.id] || 0) + Number(stat.val || 0);
        });
        return totals;
    };
    let before = sumStats(placed);
    let after = sumStats(candidate);
    let statDiff = Array.from(new Set(Object.keys(before).concat(Object.keys(after))))
        .map(id => ({ id, delta: (after[id] || 0) - (before[id] || 0) }))
        .filter(row => Math.abs(row.delta) > 0.001);
    let placedTags = getGrowthItemTags(placed);
    let candidateTags = getGrowthItemTags(candidate);
    return {
        statDiff: statDiff,
        lostTags: Array.from(placedTags).filter(tag => !candidateTags.has(tag)),
        gainedTags: Array.from(candidateTags).filter(tag => !placedTags.has(tag)),
        lostSynergies: getGrowthItemConditionReport(placedId).met.map(row => row.label)
    };
}

function renderGrowthComparisonPanel() {
    if (growthSelection.itemId === null) return '<div class="growth-synergy-empty">보관함에서 아이템을 선택하면 교체 비교가 표시됩니다.</div>';
    let candidate = findGrowthItemById(growthSelection.itemId);
    let entries = getPlacedGrowthEntries().filter(entry => entry.item.id !== growthSelection.itemId);
    if (entries.length === 0) return '<div class="growth-synergy-empty">배치된 아이템이 없어 비교할 대상이 없습니다.</div>';
    let ranked = entries
        .map(entry => {
            let [cx, cy] = entry.cells[0] || [0, 0];
            return { entry, cx, cy, level: getGrowthCellLevel(cx, cy) };
        })
        .sort((a, b) => b.level - a.level);
    return ranked.slice(0, 6).map(row => {
        let cmp = buildGrowthComparison(growthSelection.itemId, row.entry.item.id);
        if (!cmp) return '';
        let diff = cmp.statDiff.slice(0, 5).map(stat => `<span style="color:${stat.delta > 0 ? '#7fd99a' : '#e07a7a'};">${escapeHTML(getStatName(stat.id))} ${stat.delta > 0 ? '+' : ''}${formatValue(stat.id, stat.delta)}</span>`).join(', ');
        let capped = Math.max(-GROWTH_LEVEL_CAP, Math.min(GROWTH_LEVEL_CAP, row.level));
        let pct = Math.round((getGrowthLevelMultiplier(capped) - 1) * 100);
        let cellText = candidate && isGrowthSlab(candidate)
            ? `(${row.cx + 1}, ${row.cy + 1})`
            : `(${row.cx + 1}, ${row.cy + 1}) · 레벨 ${capped > 0 ? '+' : ''}${capped}${capped !== 0 ? ` → 옵션 ${pct > 0 ? '+' : ''}${pct}%` : ''}`;
        return `<div class="growth-compare-row">
            <div><strong>${escapeHTML(row.entry.item.name)}</strong> 자리 ${cellText}</div>
            <div>${diff || '옵션 변화 없음'}</div>
            <div style="color:#8fb7ca;">잃는 시너지 ${cmp.lostSynergies.length}개 · 태그 -${cmp.lostTags.length}/+${cmp.gainedTags.length}</div>
        </div>`;
    }).join('');
}


// ── 드래그 배치 ──────────────────────────────────────────────────────────
// 클릭 2번(아이템 선택 → 칸 클릭)은 판을 짤 때 계속 반복된다.
// 마우스와 터치를 한 경로로 처리하려고 HTML5 드래그 대신 포인터 이벤트를 쓴다
// (HTML5 드래그는 터치에서 동작하지 않는다).
let growthDrag = null;
let growthSuppressClickUntil = 0;
let growthDragBound = false;

const GROWTH_DRAG_THRESHOLD_PX = 8;

// 칸 요소를 직접 히트 테스트한다. elementFromPoint는 드래그 중 커서를 따라다니는
// 툴팁이나 그 위에 겹친 레이어를 먼저 집어 버려서, 정작 판 위에 있는데도 놓지 못한다.
// 칸이 32개뿐이라 읽기만 하는 이 반복은 레이아웃 한 번으로 끝난다.
function growthCellFromPoint(clientX, clientY) {
    let board = document.getElementById('ui-growth-board');
    if (!board) return null;
    let found = null;
    board.querySelectorAll('.growth-cell:not(.sealed)').forEach(cell => {
        if (found) return;
        let rect = cell.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
            found = { x: Number(cell.dataset.x), y: Number(cell.dataset.y) };
        }
    });
    return found;
}

function onGrowthPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    if (!event.target || !event.target.closest) return;
    // 카드 안의 버튼(배치/해체/잠금)은 원래 동작을 유지한다.
    if (event.target.closest('button')) return;
    let card = event.target.closest('.growth-item-card[data-growth-drag-id]');
    let cell = event.target.closest('#ui-growth-board .growth-cell');
    let itemId = null;
    if (card) itemId = Number(card.dataset.growthDragId);
    else if (cell && !cell.classList.contains('sealed')) itemId = getGrowthOccupantIdAt(Number(cell.dataset.x), Number(cell.dataset.y));
    if (itemId === null || !Number.isFinite(itemId)) return;
    growthDrag = { itemId, startX: event.clientX, startY: event.clientY, active: false };
}

function onGrowthPointerMove(event) {
    if (!growthDrag) return;
    if (!growthDrag.active) {
        let moved = Math.abs(event.clientX - growthDrag.startX) + Math.abs(event.clientY - growthDrag.startY);
        if (moved < GROWTH_DRAG_THRESHOLD_PX) return;
        growthDrag.active = true;
        // 선택 상태로 만들어 기존 배치 미리보기와 회전 값을 그대로 재사용한다.
        selectGrowthItem(growthDrag.itemId, 'inventory');
        document.body.classList.add('growth-dragging');
    }
    // 터치에서 드래그 중 화면이 스크롤되지 않게 막는다(비수동 리스너로 등록).
    if (event.cancelable) event.preventDefault();
    let target = growthCellFromPoint(event.clientX, event.clientY);
    if (target) setGrowthHoverCell(target.x, target.y);
    else clearGrowthHoverCell();
}

function onGrowthPointerUp(event) {
    if (!growthDrag) return;
    let drag = growthDrag;
    growthDrag = null;
    document.body.classList.remove('growth-dragging');
    if (!drag.active) return;   // 움직이지 않았으면 평범한 클릭 — 기존 경로가 처리한다.
    let target = growthCellFromPoint(event.clientX, event.clientY);
    clearGrowthHoverCell();
    if (target) handleGrowthCellClick(target.x, target.y);
    growthSuppressClickUntil = Date.now() + 400;
}

function bindGrowthDragOnce() {
    if (growthDragBound || typeof document === 'undefined') return;
    growthDragBound = true;
    document.addEventListener('pointerdown', onGrowthPointerDown);
    document.addEventListener('pointermove', onGrowthPointerMove, { passive: false });
    document.addEventListener('pointerup', onGrowthPointerUp);
    document.addEventListener('pointercancel', () => {
        growthDrag = null;
        document.body.classList.remove('growth-dragging');
        clearGrowthHoverCell();
    });
}

// ── 패널 조립 ────────────────────────────────────────────────────────────
function renderGrowthBoardPanel() {
    let host = document.getElementById('ui-growth-panel');
    if (!host) return;
    let selectedItem = growthSelection.itemId === null ? null : findGrowthItemById(growthSelection.itemId);
    host.innerHTML = `
        ${renderGrowthUnlockSummary()}
        ${renderGrowthLoadoutBar()}
        <div class="growth-controls">
            <span>${selectedItem ? `선택: <strong>${escapeHTML(selectedItem.name)}</strong>` : '아이템을 선택한 뒤 칸을 클릭해 배치하세요.'}</span>
            <span id="ui-growth-hover-hint" class="growth-hover-hint"></span>
            <span class="growth-control-actions">
                <button type="button" onclick="rotateGrowthSelection()" ${selectedItem ? '' : 'disabled'}>회전 (${growthSelection.rotation * 90}°)</button>
                <button type="button" onclick="autoFillGrowthBoard()">빈 칸 자동 배치</button>
                <button type="button" onclick="unplaceAllGrowthItems()" ${Object.keys(getActiveGrowthLoadout().placements || {}).length > 0 ? '' : 'disabled'}>전부 내리기</button>
            </span>
        </div>
        ${renderGrowthBoardGrid()}
        <div class="growth-columns">
            <div>
                <h3>활성 시너지</h3>
                <div class="growth-synergy-list">${renderActiveGrowthSynergies()}</div>
            </div>
            <div>
                <h3>교체 비교</h3>
                <div class="growth-synergy-list">${renderGrowthComparisonPanel()}</div>
            </div>
        </div>`;
    paintGrowthPlacementPreview();
    bindGrowthDragOnce();
}

// 제작/화석/주입 탭의 "대상 선택"에 생장 아이템(전용 보관함)도 노출한다.
// 생장 아이템은 game.inventory에 없으므로 이 목록이 없으면 제작 자체가 불가능하다.
function renderGrowthCraftTargets(targetId) {
    let host = document.getElementById(targetId);
    let heading = document.getElementById(`${targetId}-heading`);
    if (!host) return;
    let items = (game.growthInventory || []).filter(item => isGrowthItem(item) && !isGrowthSlab(item));
    if (heading) heading.style.display = items.length > 0 ? '' : 'none';
    if (items.length === 0) { host.innerHTML = ''; return; }
    let selectedRef = typeof getCraftSelectionRef === 'function' ? getCraftSelectionRef() : null;
    let isEquipRef = typeof isCraftSelectionEquip === 'function' ? isCraftSelectionEquip() : false;
    host.innerHTML = items.map(item => {
        let info = getGrowthCategoryInfo(item.growthCategory);
        let selected = !isEquipRef && selectedRef === item.id;
        return `<div class="growth-item-card${selected ? ' selected' : ''}" data-info-tooltip-anchor="1"
            onmouseenter="showGrowthItemTooltip(event, ${item.id})" onmousemove="showGrowthItemTooltip(event, ${item.id})" onmouseleave="hideInfoTooltip()"
            onclick="selectForCrafting(${item.id}, false)">
            <div class="growth-item-head">
                <span class="item-title loot-${item.rarity || 'normal'}">${info.icon} ${escapeHTML(item.name || '')}</span>
                <span class="growth-item-size">${getGrowthCategoryInfo(item.growthCategory).label}</span>
            </div>
            <div class="growth-item-actions"><button onclick="event.stopPropagation(); selectForCrafting(${item.id}, false)">제작 대상</button></div>
        </div>`;
    }).join('');
}

/** 생장 아이템 잠금 토글 (전용 보관함 대상). */
function toggleGrowthItemLock(itemId) {
    let item = findAnyGrowthItemById(itemId);
    if (!item) return;
    item.locked = !item.locked;
    addLog(`${item.locked ? '🔒 잠금' : '🔓 잠금 해제'}: [${item.name}]`, 'loot-normal');
    updateStaticUI();
}

// 제작 대상 목록은 장비/제작 탭에 남아 있어, 생장판 탭과 별개로 갱신된다.
function renderGrowthCraftTargetLists() {
    ['ui-craft-growth-list', 'ui-fossil-growth-list', 'ui-infuser-growth-list'].forEach(renderGrowthCraftTargets);
}

function renderGrowthTab() {
    syncGrowthTabVisibility();
    if (!isGrowthBoardUnlocked()) return;
    renderGrowthBoardPanel();
    let recentHost = document.getElementById('ui-growth-recent');
    if (recentHost) {
        recentHost.innerHTML = renderGrowthRecentSection();
        let countEl = document.getElementById('ui-growth-recent-count');
        if (countEl) countEl.innerText = String((game.recentGrowthDrops || []).length);
    }
    let invHost = document.getElementById('ui-growth-inventory');
    if (invHost) invHost.innerHTML = renderGrowthInventorySection();
    let count = (game.growthInventory || []).length;
    let limit = getGrowthInventoryLimit();
    let invCount = document.getElementById('ui-growth-inv-count');
    if (invCount) {
        invCount.innerText = String(count);
        // 가득 차면 최근 획득함의 새 드랍이 밀려 자동 해체된다. 숫자만으로는 놓치기 쉬워 색을 준다.
        invCount.style.color = count >= limit ? '#e07a7a' : '';
        invCount.style.fontWeight = count >= limit ? '900' : '';
    }
    let invLimit = document.getElementById('ui-growth-inv-limit');
    if (invLimit) invLimit.innerText = String(limit);
}

// 생장판은 루프 25 전에는 존재 자체를 노출하지 않는다.
// 탭 자체의 노출은 보조장비 그룹(MERGED_TAB_RUNTIME_GATES)이 isGrowthBoardUnlocked를
// 그대로 읽어 처리하므로, 여기서는 안내 문구만 맞춘다.
function syncGrowthTabVisibility() {
    let note = document.getElementById('ui-growth-unlock-note');
    if (note) note.innerText = isGrowthBoardUnlocked() ? '' : `루프 ${GROWTH_UNLOCK_LOOP}에 해금`;
}

safeExposeGlobals({
    selectGrowthItem, rotateGrowthSelection, handleGrowthCellClick, unplaceGrowthItem,
    setGrowthHoverCell, clearGrowthHoverCell, showGrowthItemTooltip, renderGrowthBoardPanel,
    renderGrowthTab, switchGrowthLoadoutFromUi, renameGrowthLoadoutFromUi, buildGrowthComparison,
    renderGrowthCraftTargets, renderGrowthCraftTargetLists, toggleGrowthItemLock, syncGrowthTabVisibility,
    toggleGrowthInventoryCategory, toggleGrowthInventoryUnplacedOnly, getGrowthInventoryFilter, toggleGrowthAutoClaim,
    renderGrowthHoverHint, bindGrowthDragOnce,
    getSelectedSlabInfluenceCells, renderGrowthLevelLine
});
