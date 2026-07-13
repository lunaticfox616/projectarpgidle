let growthUiSelection = { itemId: null, source: null, dragItemId: null, compareItemId: null };
let growthUiFilters = { search: '', category: 'all', sort: 'newest' };

function getGrowthCategoryLabel(category) {
    return { flower:'꽃 · 공격', branch:'가지 · 방어', leaf:'잎 · 연결' }[category] || category;
}

function getGrowthRarityLabel(rarity) {
    return { normal:'일반', magic:'마법', rare:'희귀', unique:'고유' }[rarity] || rarity;
}

function escapeGrowthText(value) {
    return String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderGrowthMiniShape(item) {
    let cells = getGrowthItemShape(item, item.rotation || 0);
    if (cells.length === 0) return '';
    let maxX = Math.max(...cells.map(cell => cell.x));
    let maxY = Math.max(...cells.map(cell => cell.y));
    let occupied = new Set(cells.map(cell => growthCellKey(cell.x, cell.y)));
    let html = '';
    for (let y = 0; y <= maxY; y++) {
        for (let x = 0; x <= maxX; x++) html += `<i class="${occupied.has(growthCellKey(x,y)) ? 'on' : ''}"></i>`;
    }
    return `<span class="growth-mini-shape" style="--shape-w:${maxX + 1};--shape-h:${maxY + 1}">${html}</span>`;
}

function getGrowthSelectedItem() {
    return growthUiSelection.itemId === null ? null : findGrowthItemById(growthUiSelection.itemId);
}

function selectGrowthUiItem(itemId, source) {
    growthUiSelection.itemId = itemId;
    growthUiSelection.source = source || (getGrowthPlacement(itemId) ? 'board' : 'storage');
    updateStaticUI();
}

function getGrowthItemTooltipLines(item) {
    if (!item) return [];
    let base = getGrowthBase(item);
    let condition = (ensureGrowthBoardEffectsCache().conditionsByItem || {})[String(item.id)];
    let baseStats = (item.baseStats || []).map(stat => `${stat.statName || getStatName(stat.id)} +${formatValue(stat.id, stat.val)}`);
    let affixes = (item.stats || []).map(stat => `${stat.statName || getStatName(stat.id)} +${formatValue(stat.id, stat.val)}${Number.isFinite(stat.tier) ? ` T${stat.tier}` : ''}`);
    return [
        `${getGrowthRarityLabel(item.rarity)} · ${getGrowthCategoryLabel(item.category)} · ${getGrowthItemShape(item).length}칸`,
        `요구 티어 ${base ? base.requiredTier : item.itemTier || 1} · 회전 ${(item.rotation || 0) * 90}°`,
        `베이스: ${baseStats.join(', ') || '없음'}`,
        `추가 옵션: ${affixes.join(', ') || '없음'}`,
        `태그: ${(item.tags || []).join(', ') || '없음'}`,
        `공간 효과: ${item.uniqueEffect || (item.spatialEffect && item.spatialEffect.type) || '없음'}`,
        `조건: ${condition ? (condition.active ? `충족 (${condition.count})` : '미충족') : '미배치'}`,
        `품질 ${item.quality || 0}%${item.corrupted ? ' · 타락' : ''}${item.fused || item.fusedRelic ? ' · 융합' : ''}${item.sealed || item.loopSealed ? ' · 봉인' : ''}`
    ];
}

function renderGrowthItemDetail(item) {
    if (!item) return '<div class="growth-empty-detail">아이템을 선택하면 형태·옵션·태그·공간 조건을 확인할 수 있습니다.</div>';
    let lines = getGrowthItemTooltipLines(item).map(line => `<div>${escapeGrowthText(line)}</div>`).join('');
    let placed = !!getGrowthPlacement(item.id);
    let actions = placed
        ? `<button onclick="rotateGrowthUiItem('${item.id}')" ${item.rotationAllowed === false ? 'disabled' : ''}>90° 회전</button><button onclick="removeGrowthUiItem('${item.id}')">보관함으로</button>`
        : `<button onclick="autoPlaceGrowthUiItem('${item.id}')">자동 배치</button>`;
    return `<div class="growth-detail-head">${renderGrowthMiniShape(item)}<div><strong class="growth-rarity-${item.rarity}">${escapeGrowthText(item.name)}</strong><div>${escapeGrowthText(getGrowthCategoryLabel(item.category))}</div></div></div><div class="growth-detail-lines">${lines}</div>${renderGrowthComparison(item)}<div class="growth-detail-actions">${actions}<button onclick="selectGrowthForCrafting('${item.id}',${placed})">제작 선택</button></div>`;
}

function getGrowthCombinedStats(item) {
    let totals = {};
    (item ? (item.baseStats || []).concat(item.stats || []) : []).forEach(stat => {
        if (stat && stat.id) totals[stat.id] = (totals[stat.id] || 0) + Number(stat.val || 0);
    });
    return totals;
}

function renderGrowthComparison(item) {
    let other = growthUiSelection.compareItemId ? findGrowthItemById(growthUiSelection.compareItemId) : null;
    if (!other || String(other.id) === String(item.id)) return '';
    let current = getGrowthCombinedStats(item);
    let reference = getGrowthCombinedStats(other);
    let ids = Array.from(new Set(Object.keys(current).concat(Object.keys(reference))));
    let rows = ids.slice(0, 8).map(id => {
        let delta = (current[id] || 0) - (reference[id] || 0);
        return `<span class="${delta >= 0 ? 'positive' : 'negative'}">${escapeGrowthText(getStatName(id))} ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}</span>`;
    }).join('');
    return `<div class="growth-compare"><strong>${escapeGrowthText(other.name)} 대비</strong>${rows || '<span>직접 수치 차이 없음</span>'}<button onclick="clearGrowthComparison()">비교 해제</button></div>`;
}

function renderGrowthBoardCells(cache) {
    let board = ensureGrowthBoardState(game);
    let unlocked = new Set(board.unlockedCells);
    let occupied = new Map();
    getActiveGrowthItems().forEach(entry => getGrowthOccupiedCells(entry.item, entry.placement)
        .forEach(cell => occupied.set(growthCellKey(cell.x, cell.y), entry.item)));
    let linked = new Set((cache.connections || []).flat().map(String));
    let cells = [];
    for (let y = 0; y < board.height; y++) {
        for (let x = 0; x < board.width; x++) {
            let index = y * board.width + x;
            let item = occupied.get(growthCellKey(x, y));
            let cls = unlocked.has(index) ? 'unlocked' : 'sealed';
            if (item) cls += ` occupied category-${item.category}${linked.has(String(item.id)) ? ' linked' : ''}${String(growthUiSelection.itemId) === String(item.id) ? ' selected' : ''}`;
            let itemHtml = item ? `<button draggable="true" ondragstart="startGrowthDrag(event,'${item.id}')" onclick="event.stopPropagation();selectGrowthUiItem('${item.id}','board')" title="${escapeGrowthText(getGrowthItemTooltipLines(item).join('\n'))}">${escapeGrowthText(item.name.slice(0,1))}</button>` : '';
            cells.push(`<div class="growth-cell ${cls}" data-x="${x}" data-y="${y}" ondragover="event.preventDefault()" ondrop="dropGrowthOnCell(event,${x},${y})" onclick="placeSelectedGrowthAt(${x},${y})">${itemHtml}${!unlocked.has(index) ? '<span>🔒</span>' : ''}</div>`);
        }
    }
    return cells.join('');
}

function renderGrowthSynergies(cache) {
    let active = cache.synergies || [];
    let triggers = cache.triggers || [];
    if (active.length === 0 && triggers.length === 0) return '<span class="growth-muted">활성 시너지 없음</span>';
    return active.map(rule => `<span class="growth-synergy-chip">${escapeGrowthText(rule.label)}</span>`)
        .concat(triggers.map(trigger => `<span class="growth-synergy-chip trigger">발동 · ${escapeGrowthText(trigger.id)}</span>`)).join('');
}

function renderGrowthStorageCard(item, source) {
    let selected = String(growthUiSelection.itemId) === String(item.id);
    let placed = !!getGrowthPlacement(item.id);
    let buttons = source === 'recent'
        ? `<button onclick="event.stopPropagation();claimRecentGrowth('${item.id}')">보관</button>`
        : `${placed ? '<span class="growth-equipped-badge">배치됨</span>' : `<button onclick="event.stopPropagation();autoPlaceGrowthUiItem('${item.id}')">배치</button>`}<button onclick="event.stopPropagation();setGrowthComparison('${item.id}')">비교</button><button onclick="event.stopPropagation();toggleGrowthUiLock('${item.id}')">${item.locked ? '잠금해제' : '잠금'}</button>${placed || item.locked ? '' : `<button class="danger" onclick="event.stopPropagation();salvageGrowthUiItem('${item.id}')">해체</button>`}`;
    return `<article class="growth-storage-card ${selected ? 'selected' : ''}" onclick="selectGrowthUiItem('${item.id}','${source}')" title="${escapeGrowthText(getGrowthItemTooltipLines(item).join('\n'))}">${renderGrowthMiniShape(item)}<div class="growth-card-copy"><strong class="growth-rarity-${item.rarity}">${item.locked ? '🔒 ' : ''}${escapeGrowthText(item.name)}</strong><small>${escapeGrowthText(getGrowthCategoryLabel(item.category))} · ${getGrowthItemShape(item).length}칸 · ${escapeGrowthText((item.tags || []).slice(0,3).join(' / '))}</small></div><div class="growth-card-actions">${buttons}</div></article>`;
}

function getFilteredGrowthStorageItems() {
    let query = growthUiFilters.search.trim().toLowerCase();
    let rows = getStoredGrowthItems().filter(item => {
        if (growthUiFilters.category !== 'all' && item.category !== growthUiFilters.category) return false;
        if (!query) return true;
        return [item.name, item.category].concat(item.tags || []).join(' ').toLowerCase().includes(query);
    });
    if (growthUiFilters.sort === 'size') rows.sort((a,b) => getGrowthItemShape(b).length - getGrowthItemShape(a).length);
    if (growthUiFilters.sort === 'rarity') rows.sort((a,b) => ['normal','magic','rare','unique'].indexOf(b.rarity) - ['normal','magic','rare','unique'].indexOf(a.rarity));
    if (growthUiFilters.sort === 'name') rows.sort((a,b) => String(a.name).localeCompare(String(b.name), 'ko'));
    return rows;
}

function renderGrowthStorageControls() {
    return `<div class="growth-storage-controls"><input type="search" value="${escapeGrowthText(growthUiFilters.search)}" placeholder="이름·태그 검색" oninput="setGrowthUiSearch(this.value)"><select onchange="setGrowthUiCategory(this.value)"><option value="all" ${growthUiFilters.category === 'all' ? 'selected' : ''}>전체 종류</option><option value="flower" ${growthUiFilters.category === 'flower' ? 'selected' : ''}>꽃</option><option value="branch" ${growthUiFilters.category === 'branch' ? 'selected' : ''}>가지</option><option value="leaf" ${growthUiFilters.category === 'leaf' ? 'selected' : ''}>잎</option></select><select onchange="setGrowthUiSort(this.value)"><option value="newest" ${growthUiFilters.sort === 'newest' ? 'selected' : ''}>획득순</option><option value="size" ${growthUiFilters.sort === 'size' ? 'selected' : ''}>크기순</option><option value="rarity" ${growthUiFilters.sort === 'rarity' ? 'selected' : ''}>희귀도순</option><option value="name" ${growthUiFilters.sort === 'name' ? 'selected' : ''}>이름순</option></select></div>`;
}

function renderGrowthLoadouts() {
    let board = ensureGrowthBoardState(game);
    return board.loadouts.map((loadout, index) => `<div class="growth-loadout ${board.activeLoadout === index ? 'active' : ''}"><span>${escapeGrowthText(loadout.name)}</span><button onclick="saveGrowthUiLoadout(${index})">저장</button><button onclick="applyGrowthUiLoadout(${index})">전환</button></div>`).join('');
}

function renderGrowthBoardUI() {
    let root = document.getElementById('ui-growth-board-root');
    if (!root) return;
    syncGrowthBoardUnlocks(game);
    let cache = ensureGrowthBoardEffectsCache();
    let board = ensureGrowthBoardState(game);
    let selected = getGrowthSelectedItem();
    let storedItems = getStoredGrowthItems();
    let filteredItems = getFilteredGrowthStorageItems();
    root.innerHTML = `<section class="growth-board-shell"><header><div><h2>🌿 생장판</h2><p>배치된 아이템만 전투에 적용됩니다. 빈칸·벽·방향도 빌드의 일부입니다.</p></div><div class="growth-progress"><strong>${board.unlockedCells.length}/60칸</strong><span>진행 티어 ${getGrowthProgressTier()}</span></div></header><div class="growth-board-grid" style="--growth-cols:${board.width};--growth-rows:${board.height}">${renderGrowthBoardCells(cache)}</div><div class="growth-synergy-bar">${renderGrowthSynergies(cache)}</div><div class="growth-loadouts">${renderGrowthLoadouts()}</div></section><section class="growth-detail-panel">${renderGrowthItemDetail(selected)}</section><section class="growth-storage-section"><h2>🎒 보관함 <small>${storedItems.length}/${getGrowthStorageLimit()}</small></h2>${renderGrowthStorageControls()}<div class="growth-storage-list">${filteredItems.map(item => renderGrowthStorageCard(item,'storage')).join('') || '<div class="growth-muted">조건에 맞는 아이템이 없습니다.</div>'}</div></section><section class="growth-storage-section recent"><h2>✨ 최근 획득함 <small>${game.recentGrowthDrops.length}/24</small></h2><div class="growth-storage-list">${game.recentGrowthDrops.map(item => renderGrowthStorageCard(item,'recent')).join('') || '<div class="growth-muted">최근 획득 아이템이 없습니다.</div>'}</div></section>`;
}

function renderGrowthCraftingCard(item, placed) {
    return `<article class="growth-craft-card" onclick="selectGrowthForCrafting('${item.id}',${placed})">${renderGrowthMiniShape(item)}<div><strong class="growth-rarity-${item.rarity}">${escapeGrowthText(item.name)}</strong><small>${getGrowthItemShape(item).length}칸 · ${escapeGrowthText(getGrowthCategoryLabel(item.category))}</small></div><button>선택</button></article>`;
}

function renderGrowthCraftingLists() {
    let placed = getActiveGrowthItems().map(entry => entry.item);
    ['ui-craft-equip-list','ui-fossil-equip-list','ui-infuser-equip-list'].forEach(id => {
        let host = document.getElementById(id);
        if (host) host.innerHTML = placed.map(item => renderGrowthCraftingCard(item, true)).join('');
    });
    ['ui-craft-inventory-list','ui-fossil-inventory-list','ui-infuser-inventory-list'].forEach(id => {
        let host = document.getElementById(id);
        if (host) host.innerHTML = game.growthInventory.filter(item => !getGrowthPlacement(item.id)).map(item => renderGrowthCraftingCard(item, false)).join('');
    });
}

function startGrowthDrag(event, itemId) { growthUiSelection.dragItemId = itemId; if (event.dataTransfer) event.dataTransfer.setData('text/plain', itemId); }
function dropGrowthOnCell(event, x, y) { event.preventDefault(); let id = event.dataTransfer ? event.dataTransfer.getData('text/plain') : growthUiSelection.dragItemId; if (id) moveGrowthUiItem(id, x, y); }
function moveGrowthUiItem(itemId, x, y) {
    let item = findGrowthItemById(itemId);
    let current = getGrowthPlacement(itemId);
    if (!item) return false;
    let placement = { x, y, rotation: current ? current.rotation : item.rotation || 0 };
    if (!placeGrowthItem(itemId, placement)) return false;
    growthUiSelection.itemId = itemId; growthUiSelection.source = 'board'; updateStaticUI(); return true;
}
function placeSelectedGrowthAt(x, y) { let item = getGrowthSelectedItem(); if (item && growthUiSelection.source !== 'recent') moveGrowthUiItem(item.id, x, y); }
function autoPlaceGrowthUiItem(itemId) { let item=findGrowthItemById(itemId); let placement=item&&findFirstGrowthPlacement(ensureGrowthBoardState(game),item); if(placement&&placeGrowthItem(itemId,placement)){growthUiSelection.itemId=itemId;growthUiSelection.source='board';updateStaticUI();} }
function rotateGrowthUiItem(itemId) { if (rotatePlacedGrowthItem(itemId)) updateStaticUI(); }
function removeGrowthUiItem(itemId) { if (removeGrowthItem(itemId)) { growthUiSelection.source='storage'; updateStaticUI(); } }
function claimRecentGrowth(itemId) { if (moveRecentGrowthDropToStorage(itemId)) { growthUiSelection.source='storage'; updateStaticUI(); } }
function toggleGrowthUiLock(itemId) { if (toggleGrowthItemLock(itemId)) updateStaticUI(); }
function salvageGrowthUiItem(itemId) { if (salvageGrowthItem(itemId)) { growthUiSelection.itemId=null; updateStaticUI(); } }
function setGrowthComparison(itemId) { growthUiSelection.compareItemId=itemId; if (String(growthUiSelection.itemId) === String(itemId)) growthUiSelection.itemId=null; updateStaticUI(); }
function clearGrowthComparison() { growthUiSelection.compareItemId=null; updateStaticUI(); }
function setGrowthUiSearch(value) { growthUiFilters.search=String(value || ''); renderGrowthBoardUI(); }
function setGrowthUiCategory(value) { growthUiFilters.category=value || 'all'; renderGrowthBoardUI(); }
function setGrowthUiSort(value) { growthUiFilters.sort=value || 'newest'; renderGrowthBoardUI(); }
function saveGrowthUiLoadout(index) { let board=ensureGrowthBoardState(game); let name=window.prompt('세팅 이름',board.loadouts[index].name); if(name!==null&&saveGrowthLoadout(index,name)) updateStaticUI(); }
function applyGrowthUiLoadout(index) { if (!applyGrowthLoadout(index)) return addLog('전투 중이거나 배치가 유효하지 않아 세팅을 전환하지 못했습니다.','attack-monster'); updateStaticUI(); }
function selectGrowthForCrafting(itemId, placed) { if (typeof selectForCrafting === 'function') selectForCrafting(itemId, !!placed); }

safeExposeGlobals({ renderGrowthBoardUI, renderGrowthCraftingLists, selectGrowthUiItem, startGrowthDrag, dropGrowthOnCell, placeSelectedGrowthAt, autoPlaceGrowthUiItem, rotateGrowthUiItem, removeGrowthUiItem, claimRecentGrowth, toggleGrowthUiLock, salvageGrowthUiItem, setGrowthComparison, clearGrowthComparison, setGrowthUiSearch, setGrowthUiCategory, setGrowthUiSort, saveGrowthUiLoadout, applyGrowthUiLoadout, selectGrowthForCrafting });
