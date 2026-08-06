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

// 알 수 없는 예전 형태 id는 안전하게 1칸으로 해석한다.
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

/** 석판 판정. 아이템 정체성이라 효과 계층이 아니라 도메인이 소유한다. */
function isGrowthSlab(item) {
    return !!(item && item.growthCategory === 'slab');
}

// 아이템의 점유 좌표. 형태와 방향 조건 모두 회전을 반영한다.
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
function buildGrowthOccupancyMap(excludeItemIds) {
    let excluded = new Set(Array.isArray(excludeItemIds) ? excludeItemIds : [excludeItemIds]);
    let map = new Map();
    getPlacedGrowthEntries().forEach(entry => {
        if (excluded.has(entry.item.id)) return;
        entry.cells.forEach(([x, y]) => map.set(`${x},${y}`, entry.item.id));
    });
    return map;
}

function getGrowthPlacementCells(item, x, y, rotation) {
    return getGrowthItemCells(item, rotation).map(([cx, cy]) => [cx + Math.floor(x), cy + Math.floor(y)]);
}

function checkGrowthCells(cells, occupancy) {
    if (cells.length === 0) return { ok: false, reason: '형태 정보가 없습니다.' };
    for (let i = 0; i < cells.length; i++) {
        let [x, y] = cells[i];
        if (x < 0 || y < 0 || x >= GROWTH_BOARD_W || y >= GROWTH_BOARD_H) return { ok: false, reason: '보드 밖으로 나갈 수 없습니다.' };
        if (!isGrowthCellUnlocked(x, y)) return { ok: false, reason: '봉인된 칸에는 배치할 수 없습니다.' };
        if (occupancy && occupancy.has(`${x},${y}`)) return { ok: false, reason: '다른 아이템과 겹칩니다.' };
    }
    return { ok: true, reason: '' };
}

/** @returns {{ok:boolean, reason:string}} */
function canPlaceGrowthItem(item, x, y, rotation) {
    if (!isGrowthItem(item)) return { ok: false, reason: '생장 아이템이 아닙니다.' };
    if (item.rotationLocked && ((Math.floor(rotation || 0) % 4) + 4) % 4 !== 0) return { ok: false, reason: '회전이 봉인된 아이템입니다.' };
    return checkGrowthCells(getGrowthPlacementCells(item, x, y, rotation), buildGrowthOccupancyMap(item.id));
}

/** 겹친 아이템이 하나면 이전 자리와 교환하고, 교환이 불가능하면 기존 아이템을 내린다. */
function planGrowthPlacement(itemId, x, y, rotation) {
    let item = findGrowthItemById(itemId);
    if (!item) return { ok: false, reason: '아이템을 찾을 수 없습니다.' };
    let loadout = getActiveGrowthLoadout();
    let target = { x: Math.floor(x), y: Math.floor(y), rotation: ((Math.floor(rotation || 0) % 4) + 4) % 4 };
    let cells = getGrowthPlacementCells(item, target.x, target.y, target.rotation);
    let boundary = checkGrowthCells(cells);
    if (!boundary.ok) return boundary;
    let occupancy = buildGrowthOccupancyMap(item.id);
    let overlapIds = new Set(cells.map(([cx, cy]) => occupancy.get(`${cx},${cy}`)).filter(id => id !== undefined));
    if (overlapIds.size === 0) return { ok: true, mode: 'move', itemId, target };
    if (overlapIds.size > 1) return { ok: false, reason: '여러 아이템과 겹치는 위치에는 놓을 수 없습니다.' };
    let displacedItemId = Array.from(overlapIds)[0];
    let previous = loadout.placements[itemId];
    let swap = previous ? planGrowthSwap(itemId, target, cells, displacedItemId, previous) : null;
    return swap || { ok: true, mode: 'replace', itemId, target, displacedItemId };
}

function planGrowthSwap(itemId, target, targetCells, displacedItemId, previous) {
    let displaced = findGrowthItemById(displacedItemId);
    if (!displaced) return null;
    let displacedTarget = { x: previous.x, y: previous.y, rotation: previous.rotation || 0 };
    let displacedCells = getGrowthPlacementCells(displaced, displacedTarget.x, displacedTarget.y, displacedTarget.rotation);
    let occupancy = buildGrowthOccupancyMap([itemId, displacedItemId]);
    targetCells.forEach(([x, y]) => occupancy.set(`${x},${y}`, itemId));
    if (!checkGrowthCells(displacedCells, occupancy).ok) return null;
    return { ok: true, mode: 'swap', itemId, target, displacedItemId, displacedTarget };
}

function placeGrowthItem(itemId, x, y, rotation) {
    let plan = planGrowthPlacement(itemId, x, y, rotation);
    if (!plan.ok) return plan;
    let placements = getActiveGrowthLoadout().placements;
    if (plan.mode === 'swap') placements[plan.displacedItemId] = plan.displacedTarget;
    if (plan.mode === 'replace') delete placements[plan.displacedItemId];
    placements[itemId] = plan.target;
    invalidateGrowthEffects();
    if (typeof queueImportantSave === 'function') queueImportantSave(300);
    return plan;
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

function getGrowthSalvageEssenceYield(item) {
    if (!isGrowthItem(item)) return 0;
    let rarityYield = { normal: 1, magic: 2, rare: 4, unique: 10 };
    let footprint = Math.max(1, getGrowthItemCells(item, 0).length);
    let slabBonus = isGrowthSlab(item) ? 2 + Math.floor(Math.max(1, Number(item.itemTier) || 1) / 5) : 0;
    return Math.max(1, (rarityYield[item.rarity] || 1) + footprint - 1 + slabBonus);
}

/** 기존 해체 보상과 생장 정수를 한 트랜잭션으로 지급한다. */
function salvageGrowthItemObject(item, silent, options) {
    if (!item) return {};
    let rewards = salvageItemObject(item, true, options) || {};
    let essence = getGrowthSalvageEssenceYield(item);
    if (essence > 0) {
        game.currencies = game.currencies || {};
        game.currencies.growthEssence = (game.currencies.growthEssence || 0) + essence;
        rewards.growthEssence = (rewards.growthEssence || 0) + essence;
    }
    if (!silent) {
        let summary = typeof formatSalvageRewardSummary === 'function'
            ? formatSalvageRewardSummary(rewards) : `생장 정수 +${essence}`;
        addLog(`🧪 [${item.name}] 해체 · ${summary}`, 'loot-normal');
    }
    return rewards;
}

// ── 최근 획득함 ──────────────────────────────────────────────────────────
const RECENT_GROWTH_DROPS_CAP = 24;

// 최근 획득함이 넘칠 때 무엇부터 녹일지 정하는 등급.
// 2 = 자동 해체 금지(잠금·고유). 방치 중에 사라지면 안 되는 것들.
// 1 = 최근함과 보관함이 둘 다 가득 찼을 때만 양보(희귀·처음 보는 베이스).
// 0 = 가장 먼저 녹인다(이미 가진 베이스의 일반/매직).
const GROWTH_KEEP_NONE = 0;
const GROWTH_KEEP_SOFT = 1;
const GROWTH_KEEP_HARD = 2;

function getRecentGrowthDropKeepTier(item) {
    if (!item) return GROWTH_KEEP_NONE;
    if (item.locked || item.rarity === 'unique') return GROWTH_KEEP_HARD;
    // 희귀는 생장판에서 가장 좋은 비고유 등급이다. 예전에는 이미 가진 베이스라는
    // 이유만으로 방치 중에 조용히 녹아, 자고 일어나면 쓸 만한 것이 남지 않았다.
    if (item.rarity === 'rare') return GROWTH_KEEP_SOFT;
    // 새로운 베이스: 보관함/배치/최근함 어디에도 같은 베이스가 없으면 보호.
    let baseId = item.growthBaseId;
    if (!baseId) return GROWTH_KEEP_NONE;
    let ownedSame = (game.growthInventory || []).some(row => row && row.growthBaseId === baseId)
        || (game.recentGrowthDrops || []).some(row => row && row !== item && row.growthBaseId === baseId);
    return ownedSame ? GROWTH_KEEP_NONE : GROWTH_KEEP_SOFT;
}

function isProtectedRecentGrowthDrop(item) {
    return getRecentGrowthDropKeepTier(item) > GROWTH_KEEP_NONE;
}

// 지정한 등급의 가장 오래된 아이템 하나를 녹인다. 녹였으면 true.
function meltOldestRecentGrowthDrop(tier) {
    let idx = game.recentGrowthDrops.findIndex(row => getRecentGrowthDropKeepTier(row) === tier);
    if (idx < 0) return false;
    let victim = game.recentGrowthDrops.splice(idx, 1)[0];
    salvageGrowthItemObject(victim, true, { noDivine: true });
    if (game.settings.showLootLog) addLog(`🧪 최근 획득함 초과 자동해체: [${victim.name}]`, 'loot-normal');
    return true;
}

/**
 * 최근 획득함을 상한까지 줄인다.
 * 예전에는 보호 대상만 남으면 보관함 상한을 무시하고 밀어 넣어, 방치하면 보관함이
 * 40칸 제한을 넘어 수백 개까지 불어났다(상한·확장 아이템이 무의미해진다).
 * 이제는 보관함이 가득 차면 약한 보호부터 양보하고, 잠금·고유만 남으면 새 드랍을 받지 않는다.
 * @returns {boolean} 상한 안으로 줄였으면 true, 더 비울 곳이 없으면 false
 */
function trimRecentGrowthDrops() {
    while (game.recentGrowthDrops.length > RECENT_GROWTH_DROPS_CAP) {
        if (meltOldestRecentGrowthDrop(GROWTH_KEEP_NONE)) continue;
        if (game.growthInventory.length < getGrowthInventoryLimit()) {
            game.growthInventory.push(game.recentGrowthDrops.shift());
            continue;
        }
        if (meltOldestRecentGrowthDrop(GROWTH_KEEP_SOFT)) continue;
        return false;
    }
    return true;
}

let _growthFullLogAt = 0;
const GROWTH_FULL_LOG_INTERVAL_MS = 60000;

/**
 * 보관함이 가득 차 드랍을 거절했음을 알린다. 1분에 한 줄로 제한한다.
 *
 * 백그라운드 재생(오프라인 복귀 정산)은 Date.now를 시뮬레이션 시각으로 갈아끼우고
 * 그 구간을 몇 초 만에 돌린다. 그래서 실시간 기준 스로틀이 통하지 않고 시뮬레이션
 * 1분마다 한 줄씩 쌓인다. 현재 상한(실제 3시간 × rate 0.1 = 시뮬레이션 18분)에서
 * 실측 17줄이 한꺼번에 밀려들어 복귀 후 전투 로그를 덮는다.
 * 플레이어가 보고 있지 않은 구간이므로 아예 남기지 않는다. 가득 찼다는 사실은
 * 복귀 후 목표 안내("생장 보관함 40/40 · ...")가 계속 보여 준다.
 */
function logGrowthStorageFull() {
    if (game.isBackgroundCalculation) return;
    let now = Date.now();
    if (now - _growthFullLogAt < GROWTH_FULL_LOG_INTERVAL_MS) return;
    _growthFullLogAt = now;
    addLog(`🌱 최근 획득함과 생장 보관함이 잠금/고유 아이템으로 가득 차 새 생장 아이템을 받지 못했습니다. (보관함 ${game.growthInventory.length}/${getGrowthInventoryLimit()})`, 'attack-monster');
}

// 전투/백그라운드 드랍 진입점. 가득 차도 전투를 멈추지 않는다(오래된 비보호 아이템 자동 해체).
function addDroppedGrowthItem(item, options) {
    if (!item) return false;
    if (!isGrowthBoardUnlocked()) return false;
    normalizeItem(item);
    // 필터·자동해체는 생장 전용 설정을 쓴다. 장비 설정을 물려받으면 루프 25에 판이
    // 열리자마자 일반/매직 드랍이 전부 녹아, 8칸조차 채우지 못하고 "드랍이 안 나온다"고
    // 느끼게 된다. 기본값은 전부 보관이고, 원하면 아래 설정으로 좁힌다.
    let ignoreFilter = !!(options && (options.ignoreFilter || options.guaranteedKeep));
    if (!ignoreFilter && game.settings.growthUseItemFilter
        && typeof passesItemPickupFilter === 'function' && !passesItemPickupFilter(item)) {
        if (game.settings.showLootLog) addLog(`🚫 아이템 필터로 미습득: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'attack-monster');
        return false;
    }
    let ignoreAutoSalvage = !!(options && (options.ignoreAutoSalvage || options.guaranteedKeep));
    let growthSalvage = game.settings.growthAutoSalvageRarities || {};
    if (!ignoreAutoSalvage && game.settings.growthAutoSalvageEnabled && growthSalvage[item.rarity]) {
        salvageGrowthItemObject(item, true);
        if (game.settings.showLootLog) addLog(`🧪 생장 자동해체: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'loot-normal');
        return false;
    }
    ensureGrowthBoardState();
    if (item.rarity === 'unique' && typeof registerUniqueToCodexOnAcquire === 'function') registerUniqueToCodexOnAcquire(item);
    // 자동 이송을 켜면 최근 획득함을 거치지 않고 바로 보관함으로 간다.
    // 최근 획득함은 "쓸모없는 것을 걸러내는 대기실"이라 기본은 꺼 두되,
    // 매 전투마다 [전부 보관함으로]를 누르는 반복이 싫은 사람에게 선택지를 준다.
    if (game.settings.growthAutoClaim && game.growthInventory.length < getGrowthInventoryLimit()) {
        game.growthInventory.push(item);
        if (game.noti) game.noti.items = true;
        return true;
    }
    game.recentGrowthDrops.push(item);
    if (!trimRecentGrowthDrops()) {
        let idx = game.recentGrowthDrops.indexOf(item);
        if (idx >= 0) game.recentGrowthDrops.splice(idx, 1);
        logGrowthStorageFull();
        return false;
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
    let left = game.recentGrowthDrops.length;
    // 보관함이 꽉 차 일부만 옮겨진 경우를 분명히 알린다. 예전에는 "가득 찼습니다" 한 줄뿐이라
    // 최근 획득함에 남은 것이 계속 자동 해체로 사라져도 이유를 알기 어려웠다.
    if (moved > 0 && left > 0) {
        addLog(`🌱 ${moved}개를 옮겼지만 생장 보관함이 가득 차 ${left}개가 남았습니다. 보관함을 정리하세요. (남은 아이템은 새 드랍에 밀려 자동 해체됩니다)`, 'attack-monster');
    } else if (moved > 0) {
        addLog(`🌱 최근 획득함에서 ${moved}개를 생장 보관함으로 옮겼습니다.`, 'loot-normal');
    } else if (left > 0) {
        addLog(`🌱 생장 보관함이 가득 찼습니다 (${game.growthInventory.length}/${getGrowthInventoryLimit()}). 해체하거나 배치해 자리를 비우세요.`, 'attack-monster');
    } else {
        addLog('옮길 아이템이 없습니다.', 'attack-monster');
    }
    updateStaticUI();
    return moved;
}

/**
 * 보관함 정렬. 40칸에서 쓸 만한 것을 찾으려면 등급/티어 기준이 필요하다.
 * 정렬은 배열 자체를 바꾸므로 배치(아이템 id 참조)에는 영향이 없다.
 */
const GROWTH_SORT_MODES = ['recent', 'rarity', 'tier', 'category'];

function sortGrowthInventory(mode) {
    ensureGrowthBoardState();
    let key = GROWTH_SORT_MODES.includes(mode) ? mode : 'recent';
    let rarityRank = { unique: 3, rare: 2, magic: 1, normal: 0 };
    let categoryRank = Object.keys(GROWTH_CATEGORY_INFO).reduce((out, category, index) => {
        out[category] = index;
        return out;
    }, {});
    let compare = {
        recent: (a, b) => (b.id || 0) - (a.id || 0),
        rarity: (a, b) => (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0) || (b.itemTier || 0) - (a.itemTier || 0),
        tier: (a, b) => (b.itemTier || 0) - (a.itemTier || 0) || (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0),
        category: (a, b) => (categoryRank[a.growthCategory] ?? 9) - (categoryRank[b.growthCategory] ?? 9)
            || (rarityRank[b.rarity] || 0) - (rarityRank[a.rarity] || 0)
    }[key];
    game.growthInventory.sort(compare);
    game.settings.growthSortMode = key;
    updateStaticUI();
    return key;
}

// ── 생장 전용 드랍 설정 ──────────────────────────────────────────────────
function getGrowthAutoSalvageRarities() {
    game.settings = game.settings || {};
    let saved = game.settings.growthAutoSalvageRarities;
    if (!saved || typeof saved !== 'object') saved = {};
    let out = {};
    ['normal', 'magic', 'rare', 'unique'].forEach(key => { out[key] = !!saved[key]; });
    game.settings.growthAutoSalvageRarities = out;
    return out;
}

function toggleGrowthAutoSalvageRarity(rarity) {
    let map = getGrowthAutoSalvageRarities();
    if (!(rarity in map)) return;
    map[rarity] = !map[rarity];
    updateStaticUI();
}

function toggleGrowthAutoSalvageEnabled() {
    game.settings = game.settings || {};
    game.settings.growthAutoSalvageEnabled = !game.settings.growthAutoSalvageEnabled;
    addLog(game.settings.growthAutoSalvageEnabled
        ? '🧪 생장 자동해체를 켰습니다. 선택한 등급의 드랍은 획득 즉시 해체됩니다.'
        : '🧪 생장 자동해체를 껐습니다.', 'loot-normal');
    updateStaticUI();
}

function toggleGrowthUseItemFilter() {
    game.settings = game.settings || {};
    game.settings.growthUseItemFilter = !game.settings.growthUseItemFilter;
    addLog(game.settings.growthUseItemFilter
        ? '🚫 생장 드랍에도 장비 아이템 필터를 적용합니다.'
        : '🌱 생장 드랍은 장비 아이템 필터를 무시하고 모두 획득합니다.', 'loot-normal');
    updateStaticUI();
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
    salvageGrowthItemObject(item, false);
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
    targets.forEach(item => mergeSalvageRewards(rewards, salvageGrowthItemObject(item, true)));
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
 * 석판은 영향 범위가 넓게 닿는 칸에 놓는다.
 * 그냥 앞칸부터 채우면 (0,0) 모서리에 박혀서 상하좌우·주변 8칸 패턴이 절반 넘게
 * 판 밖으로 새어 나간다 — 석판을 먼저 놓는 의미가 사라진다.
 * @returns {boolean} 배치 성공 여부
 */
/** 주변 8칸 중 열려 있는 칸 수. 석판 효과가 판 밖으로 새지 않는 자리를 고르는 기준이다. */
function countUnlockedGrowthNeighbours(x, y) {
    let reach = 0;
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (isGrowthCellUnlocked(x + dx, y + dy)) reach++;
        }
    }
    return reach;
}

function tryPlaceSlabAtBestCell(item) {
    let occupancy = buildGrowthOccupancyMap();
    let best = null;
    for (let y = 0; y < GROWTH_BOARD_H; y++) {
        for (let x = 0; x < GROWTH_BOARD_W; x++) {
            if (!isGrowthCellUnlocked(x, y) || occupancy.has(`${x},${y}`)) continue;
            let reach = countUnlockedGrowthNeighbours(x, y);
            if (!best || reach > best.reach) best = { x, y, reach };
        }
    }
    if (!best) return false;
    return placeGrowthItem(item.id, best.x, best.y, 0).ok;
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
    candidates.forEach(item => {
        let ok = isGrowthSlab(item) ? tryPlaceSlabAtBestCell(item) : tryAutoPlaceGrowthItem(item);
        if (ok) placed++;
    });
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
    salvageGrowthItemObject(item, false);
    updateStaticUI();
    return true;
}

safeExposeGlobals({
    rotateGrowthCells, normalizeGrowthCells, getGrowthShapeDef, getGrowthBaseDef, isGrowthItem, isGrowthSlab,
    getGrowthItemCells,
    ensureGrowthBoardState, getGrowthCellUnlockOrder, getGrowthStageUnlockedCellCount,
    syncGrowthBoardUnlocks, isGrowthCellUnlocked, getActiveGrowthLoadout, findGrowthItemById,
    getPlacedGrowthEntries, buildGrowthOccupancyMap, canPlaceGrowthItem, planGrowthPlacement, placeGrowthItem,
    removeGrowthPlacement, rotatePlacedGrowthItem, validateGrowthPlacements, validateGrowthLoadoutPlacements,
    switchGrowthLoadout, renameGrowthLoadout, purgeGrowthItemFromAllLoadouts, isGrowthItemPlacedAnywhere,
    resetGrowthBoardForLoop,
    addDroppedGrowthItem, claimRecentGrowthDrop, claimAllRecentGrowthDrops, salvageRecentGrowthDrop,
    isProtectedRecentGrowthDrop, getRecentGrowthDropKeepTier, trimRecentGrowthDrops,
    isGrowthBoardUnlocked, getGrowthInventoryLimit, findAnyGrowthItemById,
    salvageGrowthInventoryItem, bulkSalvageGrowthInventory, tryAutoPlaceGrowthItem,
    autoFillGrowthBoard, unplaceAllGrowthItems, isGrowthItemPlacedInLoadout, tryPlaceSlabAtBestCell,
    sortGrowthInventory, GROWTH_SORT_MODES, getGrowthSalvageEssenceYield, salvageGrowthItemObject,
    getGrowthAutoSalvageRarities, toggleGrowthAutoSalvageRarity,
    toggleGrowthAutoSalvageEnabled, toggleGrowthUseItemFilter
});
