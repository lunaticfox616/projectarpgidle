const GROWTH_BOARD_WIDTH = 12;
const GROWTH_BOARD_HEIGHT = 5;

function normalizeGrowthShape(cells) {
    if (!Array.isArray(cells) || cells.length === 0) return [];
    let minX = Math.min(...cells.map(cell => Number(cell.x) || 0));
    let minY = Math.min(...cells.map(cell => Number(cell.y) || 0));
    return cells.map(cell => ({ x: (Number(cell.x) || 0) - minX, y: (Number(cell.y) || 0) - minY }))
        .sort((a, b) => a.y - b.y || a.x - b.x);
}

function rotateGrowthShape(cells, rotation) {
    let turns = ((Math.floor(Number(rotation) || 0) % 4) + 4) % 4;
    let output = normalizeGrowthShape(cells);
    for (let turn = 0; turn < turns; turn++) {
        output = normalizeGrowthShape(output.map(cell => ({ x: -cell.y, y: cell.x })));
    }
    return output;
}

function getGrowthBase(item) {
    if (!item) return null;
    return GROWTH_BOARD_ITEMS.find(base => base.baseId === item.baseId || base.baseId === item.growthBaseId) || null;
}

function getGrowthItemShape(item, rotation) {
    let base = getGrowthBase(item);
    let unique = item && item.uniqueGrowthId ? GROWTH_BOARD_UNIQUES.find(row => row.id === item.uniqueGrowthId) : null;
    let shapeKey = (unique && unique.shapeKey) || (base && base.shapeKey);
    let source = shapeKey && GROWTH_BOARD_SHAPES[shapeKey]
        ? GROWTH_BOARD_SHAPES[shapeKey].map(([x, y]) => ({ x, y }))
        : (base ? base.shape : []);
    return rotateGrowthShape(source, rotation === undefined ? item.rotation : rotation);
}

function getGrowthOccupiedCells(item, placement) {
    if (!item || !placement) return [];
    let shape = getGrowthItemShape(item, placement.rotation);
    return shape.map(cell => ({ x: placement.x + cell.x, y: placement.y + cell.y }));
}

function growthCellKey(x, y) { return `${x},${y}`; }

function getGrowthPlacementFailure(board, item, placement, ignoredItemId) {
    if (!board || !item || !placement) return 'invalid';
    let unlocked = new Set((board.unlockedCells || []).map(Number));
    let occupied = new Map();
    (board.placements || []).forEach(entry => {
        if (!entry || entry.itemId === ignoredItemId) return;
        let placedItem = findGrowthItemById(entry.itemId);
        getGrowthOccupiedCells(placedItem, entry).forEach(cell => occupied.set(growthCellKey(cell.x, cell.y), entry.itemId));
    });
    let cells = getGrowthOccupiedCells(item, placement);
    if (cells.length === 0) return 'shape';
    for (let i = 0; i < cells.length; i++) {
        let cell = cells[i];
        if (cell.x < 0 || cell.y < 0 || cell.x >= board.width || cell.y >= board.height) return 'bounds';
        let index = cell.y * board.width + cell.x;
        if (!unlocked.has(index)) return 'locked';
        if (occupied.has(growthCellKey(cell.x, cell.y))) return 'overlap';
    }
    return null;
}

function canPlaceGrowthItem(board, item, placement, ignoredItemId) {
    return getGrowthPlacementFailure(board, item, placement, ignoredItemId) === null;
}

function findFirstGrowthPlacement(board, item) {
    for (let rotation = 0; rotation < 4; rotation++) {
        if (rotation > 0 && item.rotationAllowed === false) break;
        for (let y = 0; y < board.height; y++) {
            for (let x = 0; x < board.width; x++) {
                let placement = { x, y, rotation };
                if (canPlaceGrowthItem(board, item, placement, item.id)) return placement;
            }
        }
    }
    return null;
}

safeExposeGlobals({ normalizeGrowthShape, rotateGrowthShape, getGrowthBase, getGrowthItemShape, getGrowthOccupiedCells, getGrowthPlacementFailure, canPlaceGrowthItem, findFirstGrowthPlacement });
