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
    if (growthSelection.itemId === null || !hover) return;
    let item = findGrowthItemById(growthSelection.itemId);
    if (!item) return;
    let check = canPlaceGrowthItem(item, hover.x, hover.y, growthSelection.rotation);
    getGrowthItemCells(item, growthSelection.rotation).forEach(([dx, dy]) => {
        let cell = host.querySelector(`.growth-cell[data-x="${dx + hover.x}"][data-y="${dy + hover.y}"]`);
        if (cell) cell.classList.add(check.ok ? 'preview-ok' : 'preview-bad');
    });
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

function renderActiveGrowthSynergies() {
    let globals = getActiveGrowthGlobalSynergies();
    if (globals.length === 0) return '<div class="growth-synergy-empty">활성화된 전역 시너지가 없습니다.</div>';
    return globals.map(row => `<div class="growth-synergy-row"><strong>${escapeHTML(row.label)}</strong>${row.times > 1 ? ` ×${row.times}` : ''}<div>${escapeHTML(row.desc || '')}</div></div>`).join('');
}

// ── 아이템 카드 / 보관함 / 최근 획득함 ───────────────────────────────────
function renderGrowthShapePreview(item, rotation) {
    let cells = getGrowthItemCells(item, rotation || 0);
    if (cells.length === 0) return '';
    let maxX = Math.max(...cells.map(c => c[0]));
    let maxY = Math.max(...cells.map(c => c[1]));
    let owned = new Set(cells.map(([x, y]) => `${x},${y}`));
    let out = [];
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) {
            out.push(`<span class="growth-mini-cell${owned.has(`${x},${y}`) ? ' on' : ''}"></span>`);
        }
    }
    return `<div class="growth-mini-grid" style="grid-template-columns:repeat(${maxX + 1}, 8px);">${out.join('')}</div>`;
}

function renderGrowthItemCard(item, mode) {
    let info = getGrowthCategoryInfo(item.growthCategory);
    let placement = (getActiveGrowthLoadout().placements || {})[item.id];
    let size = getGrowthItemSize(item);
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
    return `<div class="growth-item-card${selected ? ' selected' : ''}${placement ? ' placed' : ''}" data-info-tooltip-anchor="1"
        onmouseenter="showGrowthItemTooltip(event, ${item.id})" onmousemove="showGrowthItemTooltip(event, ${item.id})" onmouseleave="hideInfoTooltip()">
        <div class="growth-item-head">
            <span class="item-title loot-${item.rarity || 'normal'}">${info.icon} ${escapeHTML(item.name || '')}</span>
            <span class="growth-item-size">${isGrowthSlab(item) ? '석판' : `${size}칸`}${levelBadge}</span>
        </div>
        ${isGrowthSlab(item) ? '' : renderGrowthShapePreview(item, placement ? placement.rotation : 0)}
        <div class="growth-item-actions">${actions}</div>
    </div>`;
}

function renderGrowthInventorySection() {
    let items = (game.growthInventory || []).filter(isGrowthItem);
    if (items.length === 0) return '<div class="growth-synergy-empty">보관 중인 생장 아이템이 없습니다. 루프 ' + GROWTH_UNLOCK_LOOP + ' 이후 전투에서 드랍됩니다.</div>';
    return items.map(item => renderGrowthItemCard(item, 'inventory')).join('');
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
        <div class="tooltip-line">${info.label} · ${getGrowthItemSize(item)}칸 · 요구 티어 ${Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1))}</div>
        ${flags ? `<div class="tooltip-line">${flags}</div>` : ''}
        ${renderGrowthShapePreview(item, placement ? placement.rotation : 0)}
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
    let placement = (getActiveGrowthLoadout().placements || {})[placedId];
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
        sizeDelta: getGrowthItemSize(candidate) - getGrowthItemSize(placed),
        lostTags: Array.from(placedTags).filter(tag => !candidateTags.has(tag)),
        gainedTags: Array.from(candidateTags).filter(tag => !placedTags.has(tag)),
        lostSynergies: getGrowthItemConditionReport(placedId).met.map(row => row.label),
        fits: placement ? canPlaceGrowthItemIgnoring(candidate, placement, placedId) : false
    };
}

// 대상 아이템을 내렸다고 가정하고 후보가 그 자리에 들어갈 수 있는지 본다.
function canPlaceGrowthItemIgnoring(candidate, placement, ignoreItemId) {
    let cells = getGrowthItemCells(candidate, placement.rotation).map(([x, y]) => [x + placement.x, y + placement.y]);
    let occupancy = buildGrowthOccupancyMap(ignoreItemId);
    return cells.every(([x, y]) => isGrowthCellUnlocked(x, y) && !occupancy.has(`${x},${y}`));
}

function renderGrowthComparisonPanel() {
    if (growthSelection.itemId === null) return '<div class="growth-synergy-empty">보관함에서 아이템을 선택하면 교체 비교가 표시됩니다.</div>';
    let entries = getPlacedGrowthEntries().filter(entry => entry.item.id !== growthSelection.itemId);
    if (entries.length === 0) return '<div class="growth-synergy-empty">배치된 아이템이 없어 비교할 대상이 없습니다.</div>';
    return entries.slice(0, 4).map(entry => {
        let cmp = buildGrowthComparison(growthSelection.itemId, entry.item.id);
        if (!cmp) return '';
        let diff = cmp.statDiff.slice(0, 5).map(row => `<span style="color:${row.delta > 0 ? '#7fd99a' : '#e07a7a'};">${escapeHTML(getStatName(row.id))} ${row.delta > 0 ? '+' : ''}${formatValue(row.id, row.delta)}</span>`).join(', ');
        return `<div class="growth-compare-row">
            <div><strong>${escapeHTML(entry.item.name)}</strong> 자리와 비교 ${cmp.fits ? '<span style="color:#7fd99a;">배치 가능</span>' : '<span style="color:#e07a7a;">배치 불가</span>'}</div>
            <div>${diff || '옵션 변화 없음'}</div>
            <div style="color:#8fb7ca;">칸 변화 ${cmp.sizeDelta > 0 ? '+' : ''}${cmp.sizeDelta} · 잃는 시너지 ${cmp.lostSynergies.length}개 · 태그 -${cmp.lostTags.length}/+${cmp.gainedTags.length}</div>
        </div>`;
    }).join('');
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
            <button type="button" onclick="rotateGrowthSelection()" ${selectedItem ? '' : 'disabled'}>회전 (${growthSelection.rotation * 90}°)</button>
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
                <span class="growth-item-size">${getGrowthItemSize(item)}칸</span>
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

function renderGrowthTab() {
    syncGrowthSubtabVisibility();
    ['ui-craft-growth-list', 'ui-fossil-growth-list', 'ui-infuser-growth-list'].forEach(renderGrowthCraftTargets);
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
    let invCount = document.getElementById('ui-growth-inv-count');
    if (invCount) invCount.innerText = String((game.growthInventory || []).length);
    let invLimit = document.getElementById('ui-growth-inv-limit');
    if (invLimit) invLimit.innerText = String(getGrowthInventoryLimit());
}

// 생장판은 루프 25 전에는 존재 자체를 노출하지 않는다.
function syncGrowthSubtabVisibility() {
    let unlocked = isGrowthBoardUnlocked();
    let btn = document.getElementById('btn-item-tab-growth');
    if (btn) btn.style.display = unlocked ? '' : 'none';
    let note = document.getElementById('ui-growth-unlock-note');
    if (note) note.innerText = unlocked ? '' : `루프 ${GROWTH_UNLOCK_LOOP}에 해금`;
    if (!unlocked && game.itemSubtab === 'item-tab-growth' && typeof switchItemSubtab === 'function') {
        switchItemSubtab('item-tab-equip');
    }
}

safeExposeGlobals({
    selectGrowthItem, rotateGrowthSelection, handleGrowthCellClick, unplaceGrowthItem,
    setGrowthHoverCell, clearGrowthHoverCell, showGrowthItemTooltip, renderGrowthBoardPanel,
    renderGrowthTab, switchGrowthLoadoutFromUi, renameGrowthLoadoutFromUi, buildGrowthComparison,
    renderGrowthShapePreview, renderGrowthCraftTargets, toggleGrowthItemLock, syncGrowthSubtabVisibility,
    getSelectedSlabInfluenceCells, renderGrowthLevelLine
});
