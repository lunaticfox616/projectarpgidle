// 생장판 도메인: 형태 기하(회전/정규화), 보드 상태, 배치 검증/적용, 칸 해금, 세팅(로드아웃), 최근 획득함.
// UI에 의존하지 않는다. 데이터(data/growth-items.js)·상태(game)·유틸리티만 사용한다.

/** @param {Array<[number,number]>} cells @param {number} rotation 0|1|2|3 (90도 단위) */
function rotateGrowthCells(cells, rotation) {
    let steps = ((Math.floor(rotation || 0) % 4) + 4) % 4;
    let rotated = (cells || []).map(([x, y]) => {
        if (steps === 1) return [-y, x];
        if (steps === 2) return [-x, -y];
        if (steps === 3) return [y, -x];
        return [x, y];
    });
    return normalizeGrowthCells(rotated);
}

// 좌표를 (0,0) 기준 좌상단 정렬로 정규화한다.
function normalizeGrowthCells(cells) {
    if (!Array.isArray(cells) || cells.length === 0) return [];
    let minX = Math.min(...cells.map(c => c[0]));
    let minY = Math.min(...cells.map(c => c[1]));
    return cells.map(([x, y]) => [x - minX, y - minY]).sort((a, b) => (a[1] - b[1]) || (a[0] - b[0]));
}

// 모든 생장 아이템은 1칸이다. 예전 저장에 남은 폴리오미노 형태 id도 1칸으로 해석한다.
function getGrowthShapeDef(shapeId) {
    if (typeof GROWTH_SHAPE_DB === 'undefined') return null;
    return GROWTH_SHAPE_DB[shapeId] || GROWTH_SHAPE_DB.dot1 || null;
}

function getGrowthBaseDef(item) {
    if (!item || typeof GROWTH_BASE_DB === 'undefined') return null;
    return GROWTH_BASE_DB.find(base => base && base.id === item.growthBaseId) || null;
}

function isGrowthItem(item) {
    return !!(item && item.growthCategory && item.growthShapeId);
}

// 아이템의 점유 좌표. 모든 아이템이 1칸이므로 회전은 점유 칸을 바꾸지 않지만,
// 방향 조건(왼쪽이 외벽 등)은 회전과 함께 돌아가므로 회전 값 자체는 계속 의미가 있다.
function getGrowthItemCells(item, rotation) {
    let shape = item ? getGrowthShapeDef(item.growthShapeId) : null;
    if (!shape) return [];
    let cells = shape.cells.map(c => [c[0], c[1]]);
    let rot = Number.isFinite(Number(rotation)) ? Number(rotation) : (item.placementRotationPreview || 0);
    if (item.rotationLocked) rot = 0;
    return rotateGrowthCells(cells, rot);
}


// ── 보드 상태 ────────────────────────────────────────────────────────────
/** 생장판은 기존 장비를 대체하지 않는 추가 시스템이며 루프 25부터 열린다. */
function isGrowthBoardUnlocked() {
    return Math.floor(Number(game.season) || 1) >= GROWTH_UNLOCK_LOOP;
}

/** 생장 전용 보관함 한도. 기존 장비 보관함과 칸을 나눠 쓰지 않는다. */
function getGrowthInventoryLimit() {
    return 40 + (Math.max(0, Math.floor(game.growthInventoryExpandLevel || 0)) * 5);
}

function ensureGrowthBoardState() {
    if (!game.growthBoard || typeof game.growthBoard !== 'object') game.growthBoard = {};
    let board = game.growthBoard;
    board.width = GROWTH_BOARD_W;
    board.height = GROWTH_BOARD_H;
    board.unlockedCellCount = Math.max(0,
        Math.min(GROWTH_BOARD_W * GROWTH_BOARD_H, Math.floor(Number(board.unlockedCellCount) || 0)));
    if (!Array.isArray(board.loadouts) || board.loadouts.length === 0) board.loadouts = [];
    while (board.loadouts.length < 3) board.loadouts.push({ name: `세팅 ${board.loadouts.length + 1}`, placements: {} });
    board.loadouts = board.loadouts.slice(0, 3).map((loadout, idx) => ({
        name: (loadout && typeof loadout.name === 'string' && loadout.name) ? loadout.name : `세팅 ${idx + 1}`,
        placements: (loadout && loadout.placements && typeof loadout.placements === 'object') ? loadout.placements : {}
    }));
    board.activeLoadout = Math.max(0, Math.min(2, Math.floor(Number(board.activeLoadout) || 0)));
    if (!Array.isArray(game.recentGrowthDrops)) game.recentGrowthDrops = [];
    if (!Array.isArray(game.growthInventory)) game.growthInventory = [];
    return board;
}

// 해금 순서: 중앙에서 바깥으로 (좌 → 우로 확장하는 나선). 인덱스 = y*W + x.
let _growthUnlockOrderCache = null;
function getGrowthCellUnlockOrder() {
    if (_growthUnlockOrderCache) return _growthUnlockOrderCache;
    let cx = (GROWTH_BOARD_W - 1) / 2;
    let cy = (GROWTH_BOARD_H - 1) / 2;
    let all = [];
    for (let y = 0; y < GROWTH_BOARD_H; y++) {
        for (let x = 0; x < GROWTH_BOARD_W; x++) all.push({ x, y, d: Math.abs(x - cx) * 1.6 + Math.abs(y - cy) * 2.1 });
    }
    all.sort((a, b) => (a.d - b.d) || (a.y - b.y) || (a.x - b.x));
    _growthUnlockOrderCache = all.map(c => c.y * GROWTH_BOARD_W + c.x);
    return _growthUnlockOrderCache;
}

function getGrowthStageUnlockedCellCount() {
    if (!isGrowthBoardUnlocked()) return 0;
    let unlocked = 0;
    GROWTH_UNLOCK_STAGES.forEach(stage => {
        let req = stage.req || {};
        if (Number.isFinite(req.maxZoneId) && Math.floor(game.maxZoneId || 0) < req.maxZoneId) return;
        if (Number.isFinite(req.season) && Math.floor(game.season || 1) < req.season) return;
        unlocked = Math.max(unlocked, stage.cells);
    });
    return unlocked;
}

// 진행 조건을 다시 판정해 해금 칸 수를 끌어올린다(영구 성장 — 절대 줄지 않음).
function syncGrowthBoardUnlocks(options) {
    let board = ensureGrowthBoardState();
    let target = getGrowthStageUnlockedCellCount();
    if (target <= board.unlockedCellCount) return false;
    let firstAwakening = board.unlockedCellCount <= 0;
    let gained = target - board.unlockedCellCount;
    board.unlockedCellCount = target;
    if (!options || options.silent !== true) {
        let total = GROWTH_BOARD_W * GROWTH_BOARD_H;
        if (firstAwakening) addLog(`🌱 생장판이 각성했습니다! 루프 ${GROWTH_UNLOCK_LOOP} 달성 — 장비와 별개로 자라나는 판이 열렸습니다. (활성 칸 ${target}/${total})`, 'season-up');
        else addLog(`🌱 생장판이 자라났습니다! 활성 칸 +${gained} (현재 ${target}/${total})`, 'season-up');
    }
    invalidateGrowthEffects();
    return true;
}

function isGrowthCellUnlocked(x, y) {
    if (x < 0 || y < 0 || x >= GROWTH_BOARD_W || y >= GROWTH_BOARD_H) return false;
    let board = ensureGrowthBoardState();
    let order = getGrowthCellUnlockOrder();
    let idx = order.indexOf(y * GROWTH_BOARD_W + x);
    return idx >= 0 && idx < board.unlockedCellCount;
}

// ── 배치 ────────────────────────────────────────────────────────────────
function getActiveGrowthLoadout() {
    let board = ensureGrowthBoardState();
    return board.loadouts[board.activeLoadout];
}

function findGrowthItemById(itemId) {
    return (game.growthInventory || []).find(item => item && item.id === itemId && isGrowthItem(item)) || null;
}

/** 제작 선택 등에서 쓰는 조회: 보관함과 최근 획득함을 모두 본다. */
function findAnyGrowthItemById(itemId) {
    return findGrowthItemById(itemId)
        || (game.recentGrowthDrops || []).find(item => item && item.id === itemId && isGrowthItem(item))
        || null;
}

/** 활성 세팅의 배치 목록: [{ item, placement:{x,y,rotation}, cells:[[x,y]...] }] (유효한 것만) */
function getPlacedGrowthEntries() {
    let loadout = getActiveGrowthLoadout();
    let entries = [];
    Object.keys(loadout.placements || {}).forEach(key => {
        let placement = loadout.placements[key];
        let item = findGrowthItemById(Number(key));
        if (!item || !placement) return;
        let cells = getGrowthItemCells(item, placement.rotation).map(([x, y]) => [x + placement.x, y + placement.y]);
        entries.push({ item, placement, cells });
    });
    return entries;
}

/** 점유 맵: 'x,y' → itemId */
function buildGrowthOccupancyMap(excludeItemId) {
    let map = new Map();
    getPlacedGrowthEntries().forEach(entry => {
        if (excludeItemId !== undefined && entry.item.id === excludeItemId) return;
        entry.cells.forEach(([x, y]) => map.set(`${x},${y}`, entry.item.id));
    });
    return map;
}

/** @returns {{ok:boolean, reason:string}} */
function canPlaceGrowthItem(item, x, y, rotation) {
    if (!isGrowthItem(item)) return { ok: false, reason: '생장 아이템이 아닙니다.' };
    if (item.rotationLocked && ((Math.floor(rotation || 0) % 4) + 4) % 4 !== 0) return { ok: false, reason: '회전이 봉인된 아이템입니다.' };
    let cells = getGrowthItemCells(item, rotation).map(([cx, cy]) => [cx + x, cy + y]);
    if (cells.length === 0) return { ok: false, reason: '형태 정보가 없습니다.' };
    let occupancy = buildGrowthOccupancyMap(item.id);
    for (let i = 0; i < cells.length; i++) {
        let [cx, cy] = cells[i];
        if (cx < 0 || cy < 0 || cx >= GROWTH_BOARD_W || cy >= GROWTH_BOARD_H) return { ok: false, reason: '보드 밖으로 나갈 수 없습니다.' };
        if (!isGrowthCellUnlocked(cx, cy)) return { ok: false, reason: '봉인된 칸에는 배치할 수 없습니다.' };
        if (occupancy.has(`${cx},${cy}`)) return { ok: false, reason: '다른 아이템과 겹칩니다.' };
    }
    return { ok: true, reason: '' };
}

function placeGrowthItem(itemId, x, y, rotation) {
    let item = findGrowthItemById(itemId);
    if (!item) return { ok: false, reason: '아이템을 찾을 수 없습니다.' };
    let check = canPlaceGrowthItem(item, x, y, rotation);
    if (!check.ok) return check;
    let loadout = getActiveGrowthLoadout();
    loadout.placements[itemId] = { x: Math.floor(x), y: Math.floor(y), rotation: ((Math.floor(rotation || 0) % 4) + 4) % 4 };
    invalidateGrowthEffects();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
    return { ok: true, reason: '' };
}

function removeGrowthPlacement(itemId, options) {
    let loadout = getActiveGrowthLoadout();
    if (!loadout.placements[itemId]) return false;
    delete loadout.placements[itemId];
    invalidateGrowthEffects();
    if ((!options || options.skipSave !== true) && typeof queueImportantSave === 'function') queueImportantSave(300);
    return true;
}

// 배치 상태에서 90도 회전 시도. 실패 시 기존 배치 유지.
function rotatePlacedGrowthItem(itemId) {
    let loadout = getActiveGrowthLoadout();
    let placement = loadout.placements[itemId];
    let item = findGrowthItemById(itemId);
    if (!placement || !item) return { ok: false, reason: '배치된 아이템이 아닙니다.' };
    let nextRotation = (placement.rotation + 1) % 4;
    let check = canPlaceGrowthItem(item, placement.x, placement.y, nextRotation);
    if (!check.ok) return check;
    placement.rotation = nextRotation;
    invalidateGrowthEffects();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
    return { ok: true, reason: '' };
}

// 저장 로드/루프 리셋/아이템 소실 후: 사라진 아이템·겹침·봉인 칸 위반 배치를 제거한다.
// 세팅(로드아웃)마다 독립적으로 판정한다 — 세팅끼리는 같은 아이템/칸을 공유할 수 있다.
function validateGrowthPlacements() {
    let board = ensureGrowthBoardState();
    let removedCount = 0;
    board.loadouts.forEach(loadout => { removedCount += validateGrowthLoadoutPlacements(loadout); });
    if (removedCount > 0) invalidateGrowthEffects();
    return removedCount;
}

function validateGrowthLoadoutPlacements(loadout) {
    let occupied = new Set();
    let removed = 0;
    Object.keys((loadout && loadout.placements) || {}).forEach(key => {
        let placement = loadout.placements[key];
        let item = findGrowthItemById(Number(key));
        if (!item || !placement || !Number.isFinite(Number(placement.x)) || !Number.isFinite(Number(placement.y))) {
            delete loadout.placements[key];
            removed++;
            return;
        }
        let cells = getGrowthItemCells(item, placement.rotation).map(([x, y]) => [x + placement.x, y + placement.y]);
        let invalid = cells.length === 0 || cells.some(([x, y]) => !isGrowthCellUnlocked(x, y) || occupied.has(`${x},${y}`));
        if (invalid) {
            delete loadout.placements[key];
            removed++;
            return;
        }
        cells.forEach(([x, y]) => occupied.add(`${x},${y}`));
    });
    return removed;
}

/**
 * 루프 리셋용 보드 초기화. 배치는 비우고, 해금 칸 수(영구 성장)는 유지한다.
 * 보드 상수의 소유자가 이 모듈이므로 리셋도 여기서 수행한다.
 */
function resetGrowthBoardForLoop(preservedUnlockedCellCount) {
    game.growthBoard = {
        width: GROWTH_BOARD_W,
        height: GROWTH_BOARD_H,
        unlockedCellCount: Math.max(0, Math.floor(Number(preservedUnlockedCellCount) || 0)),
        activeLoadout: 0,
        loadouts: []
    };
    ensureGrowthBoardState();
    invalidateGrowthEffects();
    return game.growthBoard;
}

/** 어느 세팅에라도 배치되어 있으면 true. 일괄 해체는 이 아이템을 잠금과 동일하게 보호한다. */
function isGrowthItemPlacedAnywhere(itemId) {
    let board = ensureGrowthBoardState();
    return board.loadouts.some(loadout => !!(loadout.placements && loadout.placements[itemId]));
}

// 아이템이 보관함에서 사라질 때(해체/제단 이동/융합 소모) 모든 세팅의 배치를 함께 정리한다.
// 이걸 빠뜨리면 존재하지 않는 아이템을 가리키는 배치가 남아 칸이 영구히 막힌다.
function purgeGrowthItemFromAllLoadouts(itemId) {
    let board = ensureGrowthBoardState();
    let removed = 0;
    board.loadouts.forEach(loadout => {
        if (loadout.placements && loadout.placements[itemId]) {
            delete loadout.placements[itemId];
            removed++;
        }
    });
    if (removed > 0) invalidateGrowthEffects();
    return removed;
}

function switchGrowthLoadout(idx) {
    let board = ensureGrowthBoardState();
    let target = Math.max(0, Math.min(2, Math.floor(Number(idx) || 0)));
    if (target === board.activeLoadout) return false;
    if (game.woodsmanBuildLock) { addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster'); return false; }
    board.activeLoadout = target;
    validateGrowthPlacements();
    invalidateGrowthEffects();
    // 세팅 전환은 전투를 재시작한다 (spec 22).
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    if (typeof startMoving === 'function') startMoving(true);
    addLog(`🌿 생장판 세팅 전환: [${board.loadouts[target].name}] (전투 재시작)`, 'season-up');
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
    return true;
}

function renameGrowthLoadout(idx, name) {
    let board = ensureGrowthBoardState();
    let target = Math.max(0, Math.min(2, Math.floor(Number(idx) || 0)));
    let clean = String(name || '').trim().slice(0, 12);
    if (!clean) return false;
    board.loadouts[target].name = clean;
    return true;
}

// ── 최근 획득함 ──────────────────────────────────────────────────────────
const RECENT_GROWTH_DROPS_CAP = 24;

function isProtectedRecentGrowthDrop(item) {
    if (!item) return false;
    if (item.locked || item.rarity === 'unique') return true;
    // 새로운 베이스: 보관함/배치/최근함 어디에도 같은 베이스가 없으면 보호.
    let baseId = item.growthBaseId;
    if (!baseId) return false;
    let ownedSame = (game.growthInventory || []).some(row => row && row.growthBaseId === baseId)
        || (game.recentGrowthDrops || []).some(row => row && row !== item && row.growthBaseId === baseId);
    return !ownedSame;
}

// 전투/백그라운드 드랍 진입점. 가득 차도 전투를 멈추지 않는다(오래된 비보호 아이템 자동 해체).
function addDroppedGrowthItem(item, options) {
    if (!item) return false;
    if (!isGrowthBoardUnlocked()) return false;
    normalizeItem(item);
    let ignoreFilter = !!(options && (options.ignoreFilter || options.guaranteedKeep));
    if (!ignoreFilter && typeof passesItemPickupFilter === 'function' && !passesItemPickupFilter(item)) {
        if (game.settings.showLootLog) addLog(`🚫 아이템 필터로 미습득: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'attack-monster');
        return false;
    }
    let ignoreAutoSalvage = !!(options && (options.ignoreAutoSalvage || options.guaranteedKeep));
    if (!ignoreAutoSalvage && game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities && game.settings.autoSalvageRarities[item.rarity]) {
        salvageItemObject(item, true);
        if (game.settings.showLootLog) addLog(`🧪 자동해체: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'loot-normal');
        return false;
    }
    ensureGrowthBoardState();
    if (item.rarity === 'unique' && typeof registerUniqueToCodexOnAcquire === 'function') registerUniqueToCodexOnAcquire(item);
    game.recentGrowthDrops.push(item);
    while (game.recentGrowthDrops.length > RECENT_GROWTH_DROPS_CAP) {
        let victimIdx = game.recentGrowthDrops.findIndex(row => !isProtectedRecentGrowthDrop(row));
        if (victimIdx < 0) {
            // 전부 보호 대상이면 가장 오래된 것을 생장 보관함으로 밀어낸다(유실 방지).
            let overflow = game.recentGrowthDrops.shift();
            if (overflow) game.growthInventory.push(overflow);
            continue;
        }
        let victim = game.recentGrowthDrops.splice(victimIdx, 1)[0];
        if (victim) {
            salvageItemObject(victim, true, { noDivine: true });
            if (game.settings.showLootLog) addLog(`🧪 최근 획득함 초과 자동해체: [${victim.name}]`, 'loot-normal');
        }
    }
    if (game.noti) game.noti.items = true;
    return true;
}

// 최근 획득함 → 보관함 이동.
function claimRecentGrowthDrop(itemId) {
    ensureGrowthBoardState();
    let idx = game.recentGrowthDrops.findIndex(row => row && row.id === itemId);
    if (idx < 0) return false;
    if (game.growthInventory.length >= getGrowthInventoryLimit()) { addLog('생장 보관함이 가득 찼습니다.', 'attack-monster'); return false; }
    game.growthInventory.push(game.recentGrowthDrops.splice(idx, 1)[0]);
    updateStaticUI();
    return true;
}

function claimAllRecentGrowthDrops() {
    ensureGrowthBoardState();
    let moved = 0;
    while (game.recentGrowthDrops.length > 0 && game.growthInventory.length < getGrowthInventoryLimit()) {
        game.growthInventory.push(game.recentGrowthDrops.shift());
        moved++;
    }
    if (moved > 0) addLog(`🌱 최근 획득함에서 ${moved}개를 생장 보관함으로 옮겼습니다.`, 'loot-normal');
    else addLog('옮길 아이템이 없거나 생장 보관함이 가득 찼습니다.', 'attack-monster');
    updateStaticUI();
    return moved;
}

/** 생장 보관함 해체. 배치 중인 아이템은 먼저 내려야 한다. */
function salvageGrowthInventoryItem(itemId) {
    ensureGrowthBoardState();
    let idx = game.growthInventory.findIndex(row => row && row.id === itemId);
    if (idx < 0) return false;
    let item = game.growthInventory[idx];
    if (item.locked) { addLog('잠금된 아이템은 해체할 수 없습니다.', 'attack-monster'); return false; }
    if (isGrowthItemPlacedAnywhere(item.id)) { addLog('생장판에 배치된 아이템은 먼저 내려야 해체할 수 있습니다.', 'attack-monster'); return false; }
    game.growthInventory.splice(idx, 1);
    salvageItemObject(item, false);
    updateStaticUI();
    return true;
}

/** 배치되지 않은 비잠금 생장 아이템 일괄 해체. */
async function bulkSalvageGrowthInventory() {
    ensureGrowthBoardState();
    let targets = game.growthInventory.filter(item => item && !item.locked && !isGrowthItemPlacedAnywhere(item.id));
    if (targets.length <= 0) return addLog('해체할 수 있는 생장 아이템이 없습니다. (잠금/배치 중인 아이템은 보호됩니다)', 'attack-monster');
    if (!await requestGameConfirmation(`생장 보관함 아이템 ${targets.length}개를 해체합니다.\n잠금·배치 중인 아이템은 보호됩니다.`, {
        title: '생장 보관함 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targets.length}개 해체`
    })) return;
    // 확인창이 열린 동안 배치/잠금이 바뀌었을 수 있으므로 대상을 다시 추린다.
    targets = game.growthInventory.filter(item => item && !item.locked && !isGrowthItemPlacedAnywhere(item.id));
    if (targets.length <= 0) return addLog('확인 중 대상이 모두 보호 상태가 되어 해체를 취소했습니다.', 'attack-monster');
    let protectedCount = game.growthInventory.length - targets.length;
    let rewards = {};
    targets.forEach(item => mergeSalvageRewards(rewards, salvageItemObject(item, true)));
    game.growthInventory = game.growthInventory.filter(item => item && (item.locked || isGrowthItemPlacedAnywhere(item.id)));
    addLog(`🧪 생장 아이템 ${targets.length}개 해체 · ${formatSalvageRewardSummary(rewards)}${protectedCount > 0 ? ` (보호 ${protectedCount}개)` : ''}`, 'loot-normal');
    updateStaticUI();
}

/**
 * 비어 있는 첫 자리에 배치한다. 모든 회전을 시도한다.
 * @returns {boolean} 배치 성공 여부
 */
function tryAutoPlaceGrowthItem(item) {
    for (let y = 0; y < GROWTH_BOARD_H; y++) {
        for (let x = 0; x < GROWTH_BOARD_W; x++) {
            for (let rotation = 0; rotation < 4; rotation++) {
                if (canPlaceGrowthItem(item, x, y, rotation).ok) return placeGrowthItem(item.id, x, y, rotation).ok;
            }
        }
    }
    return false;
}

/**
 * 빈 칸을 미배치 아이템으로 한 번에 채운다.
 * 판이 32칸이라 손으로 채우면 아이템 선택 + 칸 클릭을 수십 번 반복해야 한다.
 * 배치의 "정답"을 대신 찾아 주지는 않는다 — 일단 채워 두고 다듬는 출발점을 만든다.
 * 석판을 먼저 놓아 레벨을 뿌린 뒤, 좋은 아이템이 그 칸을 차지할 확률을 높인다.
 * @returns {number} 새로 배치한 개수
 */
function autoFillGrowthBoard() {
    if (game.woodsmanBuildLock) { addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster'); return 0; }
    ensureGrowthBoardState();
    if (!isGrowthBoardUnlocked()) { addLog('생장판이 아직 열리지 않았습니다.', 'attack-monster'); return 0; }
    let rarityRank = { unique: 3, rare: 2, magic: 1, normal: 0 };
    let candidates = (game.growthInventory || [])
        .filter(item => isGrowthItem(item) && !isGrowthItemPlacedInLoadout(item.id))
        .sort((a, b) => {
            let slabDelta = (isGrowthSlab(b) ? 1 : 0) - (isGrowthSlab(a) ? 1 : 0);
            if (slabDelta !== 0) return slabDelta;
            return (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0);
        });
    let placed = 0;
    candidates.forEach(item => { if (tryAutoPlaceGrowthItem(item)) placed++; });
    if (placed > 0) addLog(`🌱 빈 칸에 ${placed}개를 자동 배치했습니다.`, 'loot-normal');
    else addLog('배치할 수 있는 빈 칸이나 미배치 아이템이 없습니다.', 'attack-monster');
    updateStaticUI();
    return placed;
}

/** 현재 세팅에서만 배치 여부를 본다(자동 배치·필터용). */
function isGrowthItemPlacedInLoadout(itemId) {
    return !!(getActiveGrowthLoadout().placements || {})[itemId];
}

/** 현재 세팅의 배치를 모두 내린다. 하나씩 내리려면 수십 번 눌러야 한다. */
function unplaceAllGrowthItems() {
    if (game.woodsmanBuildLock) { addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster'); return 0; }
    let loadout = getActiveGrowthLoadout();
    let count = Object.keys(loadout.placements || {}).length;
    if (count <= 0) { addLog('내릴 배치가 없습니다.', 'attack-monster'); return 0; }
    loadout.placements = {};
    invalidateGrowthEffects();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
    addLog(`🌱 배치 ${count}개를 모두 내렸습니다.`, 'loot-normal');
    updateStaticUI();
    return count;
}

function salvageRecentGrowthDrop(itemId) {
    ensureGrowthBoardState();
    let idx = game.recentGrowthDrops.findIndex(row => row && row.id === itemId);
    if (idx < 0) return false;
    let item = game.recentGrowthDrops[idx];
    if (item.locked) { addLog('잠금된 아이템은 해체할 수 없습니다.', 'attack-monster'); return false; }
    game.recentGrowthDrops.splice(idx, 1);
    salvageItemObject(item, false);
    updateStaticUI();
    return true;
}

safeExposeGlobals({
    rotateGrowthCells, normalizeGrowthCells, getGrowthShapeDef, getGrowthBaseDef, isGrowthItem,
    getGrowthItemCells,
    ensureGrowthBoardState, getGrowthCellUnlockOrder, getGrowthStageUnlockedCellCount,
    syncGrowthBoardUnlocks, isGrowthCellUnlocked, getActiveGrowthLoadout, findGrowthItemById,
    getPlacedGrowthEntries, buildGrowthOccupancyMap, canPlaceGrowthItem, placeGrowthItem,
    removeGrowthPlacement, rotatePlacedGrowthItem, validateGrowthPlacements, validateGrowthLoadoutPlacements,
    switchGrowthLoadout, renameGrowthLoadout, purgeGrowthItemFromAllLoadouts, isGrowthItemPlacedAnywhere,
    resetGrowthBoardForLoop,
    addDroppedGrowthItem, claimRecentGrowthDrop, claimAllRecentGrowthDrops, salvageRecentGrowthDrop,
    isProtectedRecentGrowthDrop, isGrowthBoardUnlocked, getGrowthInventoryLimit, findAnyGrowthItemById,
    salvageGrowthInventoryItem, bulkSalvageGrowthInventory, tryAutoPlaceGrowthItem,
    autoFillGrowthBoard, unplaceAllGrowthItems, isGrowthItemPlacedInLoadout
});
