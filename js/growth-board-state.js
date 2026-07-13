const GROWTH_SYSTEM_VERSION = 1;
const GROWTH_STORAGE_BASE_LIMIT = 60;
const GROWTH_STORAGE_MAX_LIMIT = 100;
const GROWTH_RECENT_LIMIT = 24;

function createGrowthUnlockOrder() {
    let starter = [];
    for (let y = 1; y <= 2; y++) for (let x = 3; x <= 8; x++) starter.push(y * GROWTH_BOARD_WIDTH + x);
    let starterSet = new Set(starter);
    let cells = [];
    for (let y = 0; y < GROWTH_BOARD_HEIGHT; y++) {
        for (let x = 0; x < GROWTH_BOARD_WIDTH; x++) {
            let distance = Math.abs(x - 5.5) + Math.abs(y - 2);
            let index = y * GROWTH_BOARD_WIDTH + x;
            if (!starterSet.has(index)) cells.push({ index, distance, y, x });
        }
    }
    return starter.concat(cells.sort((a, b) => a.distance - b.distance || a.y - b.y || a.x - b.x).map(row => row.index));
}

const GROWTH_UNLOCK_ORDER = createGrowthUnlockOrder();

function createDefaultGrowthBoard() {
    return {
        width: GROWTH_BOARD_WIDTH,
        height: GROWTH_BOARD_HEIGHT,
        unlockedCells: GROWTH_UNLOCK_ORDER.slice(0, 12),
        placements: [],
        loadouts: [
            { name: '세팅 1', placements: [] },
            { name: '세팅 2', placements: [] },
            { name: '세팅 3', placements: [] }
        ],
        activeLoadout: 0
    };
}

function normalizeGrowthLoadouts(loadouts) {
    let source = Array.isArray(loadouts) ? loadouts.slice(0, 3) : [];
    while (source.length < 3) source.push({ name: `세팅 ${source.length + 1}`, placements: [] });
    return source.map((loadout, index) => ({
        name: String((loadout && loadout.name) || `세팅 ${index + 1}`).slice(0, 30),
        placements: Array.isArray(loadout && loadout.placements) ? loadout.placements : []
    }));
}

function ensureGrowthBoardState(target) {
    let state = target || game;
    if (!state || typeof state !== 'object') throw new Error('growth board requires game state');
    let board = state.growthBoard && typeof state.growthBoard === 'object' ? state.growthBoard : createDefaultGrowthBoard();
    board.width = GROWTH_BOARD_WIDTH;
    board.height = GROWTH_BOARD_HEIGHT;
    board.unlockedCells = Array.from(new Set((Array.isArray(board.unlockedCells) ? board.unlockedCells : []).map(Number)
        .filter(index => Number.isInteger(index) && index >= 0 && index < 60)));
    if (board.unlockedCells.length < 12) board.unlockedCells = GROWTH_UNLOCK_ORDER.slice(0, 12);
    board.placements = Array.isArray(board.placements) ? board.placements.filter(entry => entry && entry.itemId !== undefined) : [];
    board.loadouts = normalizeGrowthLoadouts(board.loadouts);
    board.activeLoadout = Math.max(0, Math.min(2, Math.floor(Number(board.activeLoadout) || 0)));
    state.growthBoard = board;
    state.growthInventory = Array.isArray(state.growthInventory) ? state.growthInventory : [];
    state.recentGrowthDrops = Array.isArray(state.recentGrowthDrops) ? state.recentGrowthDrops.slice(0, GROWTH_RECENT_LIMIT) : [];
    state.growthInventoryExpandLevel = Math.max(0, Math.min(8, Math.floor(Number(state.growthInventoryExpandLevel) || 0)));
    state.growthSystemVersion = Math.max(0, Math.floor(Number(state.growthSystemVersion) || 0));
    state.growthBoardDirty = state.growthBoardDirty !== false;
    return board;
}

function getGrowthStorageLimit() {
    return Math.min(GROWTH_STORAGE_MAX_LIMIT, GROWTH_STORAGE_BASE_LIMIT + Math.max(0, Math.floor(game.growthInventoryExpandLevel || 0)) * 5);
}

function getStoredGrowthItems(state) {
    let source = state || game;
    ensureGrowthBoardState(source);
    let placed = new Set(source.growthBoard.placements.map(entry => String(entry.itemId)));
    return source.growthInventory.filter(item => item && !placed.has(String(item.id)));
}

function getGrowthProgressTier(state) {
    let source = state || game;
    let loop = Math.max(0, Math.floor(source.loopCount || 0));
    let actRow = typeof getStoryActByZoneId === 'function' ? getStoryActByZoneId(source.maxZoneId || 0) : null;
    let act = actRow ? Math.max(1, Number(actRow.order) + 1 || Number(actRow.displayAct) || 1) : Math.max(1, Math.ceil((source.maxZoneId || 0) / 3));
    if (loop >= 5) return 15;
    if (loop >= 1) return 13;
    if (act >= 10) return 11;
    if (act >= 7) return 9;
    if (act >= 4) return 6;
    if (act >= 2) return 4;
    return 1;
}

function getGrowthUnlockedCellTarget(state) {
    let source = state || game;
    let loop = Math.max(0, Math.floor(source.loopCount || 0));
    let actRow = typeof getStoryActByZoneId === 'function' ? getStoryActByZoneId(source.maxZoneId || 0) : null;
    let act = actRow ? Math.max(1, Number(actRow.order) + 1 || Number(actRow.displayAct) || 1) : 1;
    if (loop >= 5) return 60;
    if (loop >= 1) return 50;
    if (act >= 10) return 40;
    if (act >= 7) return 32;
    if (act >= 4) return 24;
    if (act >= 2) return 15;
    return 12;
}

function syncGrowthBoardUnlocks(state) {
    let source = state || game;
    let board = ensureGrowthBoardState(source);
    let target = getGrowthUnlockedCellTarget(source);
    let unlocked = new Set(board.unlockedCells);
    GROWTH_UNLOCK_ORDER.slice(0, target).forEach(index => unlocked.add(index));
    let changed = unlocked.size !== board.unlockedCells.length;
    board.unlockedCells = Array.from(unlocked).sort((a, b) => a - b);
    if (changed) source.growthBoardDirty = true;
    return changed;
}

function getAllGrowthItems(state) {
    let source = state || game;
    ensureGrowthBoardState(source);
    return source.growthInventory.concat(source.recentGrowthDrops);
}

function findGrowthItemById(itemId, state) {
    let source = state || game;
    ensureGrowthBoardState(source);
    let id = String(itemId);
    let item = source.growthInventory.find(row => row && String(row.id) === id)
        || source.recentGrowthDrops.find(row => row && String(row.id) === id);
    if (item) return item;
    let placedIds = new Set(source.growthBoard.placements.map(entry => String(entry.itemId)));
    return source.growthInventory.find(row => row && placedIds.has(String(row.id)) && String(row.id) === id) || null;
}

function getGrowthPlacement(itemId, state) {
    let source = state || game;
    ensureGrowthBoardState(source);
    return source.growthBoard.placements.find(entry => String(entry.itemId) === String(itemId)) || null;
}

function getActiveGrowthItems(state) {
    let source = state || game;
    ensureGrowthBoardState(source);
    return source.growthBoard.placements.map(placement => {
        let item = source.growthInventory.find(row => row && String(row.id) === String(placement.itemId));
        return item ? { item, placement } : null;
    }).filter(Boolean);
}

function invalidateGrowthBoard(reason) {
    ensureGrowthBoardState(game);
    game.growthBoardDirty = true;
    game.growthBoardDirtyReason = reason || 'changed';
}

function placeGrowthItem(itemId, placement) {
    let board = ensureGrowthBoardState(game);
    if (game.woodsmanBuildLock) return false;
    let item = findGrowthItemById(itemId);
    if (!item || !canPlaceGrowthItem(board, item, placement, item.id)) return false;
    board.placements = board.placements.filter(entry => String(entry.itemId) !== String(item.id));
    board.placements.push({ itemId: item.id, x: placement.x, y: placement.y, rotation: placement.rotation || 0 });
    item.rotation = placement.rotation || 0;
    item.placement = { x: placement.x, y: placement.y, rotation: placement.rotation || 0 };
    invalidateGrowthBoard('placement');
    return true;
}

function removeGrowthItem(itemId) {
    let board = ensureGrowthBoardState(game);
    if (game.woodsmanBuildLock) return false;
    let before = board.placements.length;
    if (board.placements.some(entry => String(entry.itemId) === String(itemId)) && getStoredGrowthItems().length >= getGrowthStorageLimit()) return false;
    board.placements = board.placements.filter(entry => String(entry.itemId) !== String(itemId));
    let item = findGrowthItemById(itemId);
    if (item) item.placement = null;
    if (board.placements.length === before) return false;
    invalidateGrowthBoard('remove');
    return true;
}

function rotatePlacedGrowthItem(itemId) {
    let item = findGrowthItemById(itemId);
    let current = getGrowthPlacement(itemId);
    if (!item || !current || item.rotationAllowed === false || game.woodsmanBuildLock) return false;
    let next = { x: current.x, y: current.y, rotation: (current.rotation + 1) % 4 };
    return placeGrowthItem(itemId, next);
}

function saveGrowthLoadout(index, name) {
    let board = ensureGrowthBoardState(game);
    let slot = Math.max(0, Math.min(2, Math.floor(index)));
    board.loadouts[slot] = {
        name: String(name || board.loadouts[slot].name || `세팅 ${slot + 1}`).slice(0, 30),
        placements: board.placements.map(entry => ({ ...entry }))
    };
    return true;
}

function applyGrowthLoadout(index) {
    let board = ensureGrowthBoardState(game);
    if (game.woodsmanBuildLock || game.combatHalted === false && Array.isArray(game.enemies) && game.enemies.some(enemy => enemy && enemy.hp > 0)) return false;
    let slot = Math.max(0, Math.min(2, Math.floor(index)));
    let candidate = board.loadouts[slot].placements.filter(entry => findGrowthItemById(entry.itemId));
    let original = board.placements;
    board.placements = [];
    let valid = candidate.every(entry => {
        let item = findGrowthItemById(entry.itemId);
        if (!canPlaceGrowthItem(board, item, entry, item.id)) return false;
        board.placements.push({ ...entry });
        return true;
    });
    if (!valid) {
        board.placements = original;
        return false;
    }
    board.activeLoadout = slot;
    invalidateGrowthBoard('loadout');
    return true;
}

safeExposeGlobals({ ensureGrowthBoardState, getGrowthStorageLimit, getStoredGrowthItems, getGrowthProgressTier, getGrowthUnlockedCellTarget, syncGrowthBoardUnlocks, getAllGrowthItems, findGrowthItemById, getGrowthPlacement, getActiveGrowthItems, invalidateGrowthBoard, placeGrowthItem, removeGrowthItem, rotatePlacedGrowthItem, saveGrowthLoadout, applyGrowthLoadout });
