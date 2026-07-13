const GROWTH_ORTHOGONAL_DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1]];
const GROWTH_ELEMENT_TAGS = ['fire','cold','lightning','chaos','physical'];

function buildGrowthBoardAnalysis() {
    let board = ensureGrowthBoardState(game);
    let active = getActiveGrowthItems();
    let occupancy = new Map();
    active.forEach(entry => getGrowthOccupiedCells(entry.item, entry.placement)
        .forEach(cell => occupancy.set(growthCellKey(cell.x, cell.y), String(entry.item.id))));
    return { board, active, occupancy };
}

function getGrowthNeighbors(entry, analysis) {
    let ids = new Set();
    getGrowthOccupiedCells(entry.item, entry.placement).forEach(cell => {
        GROWTH_ORTHOGONAL_DIRECTIONS.forEach(([dx, dy]) => {
            let id = analysis.occupancy.get(growthCellKey(cell.x + dx, cell.y + dy));
            if (id && id !== String(entry.item.id)) ids.add(id);
        });
    });
    return analysis.active.filter(row => ids.has(String(row.item.id)));
}

function countGrowthWallFaces(entry, analysis) {
    let faces = new Set();
    getGrowthOccupiedCells(entry.item, entry.placement).forEach(cell => {
        if (cell.x === 0) faces.add('left');
        if (cell.x === analysis.board.width - 1) faces.add('right');
        if (cell.y === 0) faces.add('up');
        if (cell.y === analysis.board.height - 1) faces.add('down');
    });
    return faces.size;
}

function hasGrowthDirectionEmpty(entry, analysis, direction) {
    let vectors = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] };
    let vector = vectors[direction] || vectors.up;
    return getGrowthOccupiedCells(entry.item, entry.placement).some(cell => {
        let x = cell.x + vector[0], y = cell.y + vector[1];
        return x >= 0 && y >= 0 && x < analysis.board.width && y < analysis.board.height
            && !analysis.occupancy.has(growthCellKey(x, y));
    });
}

function isGrowthRowEdge(entry, analysis, edge) {
    let cells = getGrowthOccupiedCells(entry.item, entry.placement);
    let rowIds = new Set(cells.map(cell => cell.y));
    return Array.from(rowIds).some(y => {
        let ownXs = cells.filter(cell => cell.y === y).map(cell => cell.x);
        let targetX = edge === 'right' ? Math.max(...ownXs) : Math.min(...ownXs);
        for (let x = edge === 'right' ? targetX + 1 : 0; edge === 'right' ? x < analysis.board.width : x < targetX; x++) {
            if (analysis.occupancy.has(growthCellKey(x, y))) return false;
        }
        return true;
    });
}

function getGrowthGapState(entry, analysis, occupiedWanted) {
    let cells = getGrowthOccupiedCells(entry.item, entry.placement);
    if (cells.length < 2) return false;
    let minX = Math.min(...cells.map(cell => cell.x)), maxX = Math.max(...cells.map(cell => cell.x));
    let minY = Math.min(...cells.map(cell => cell.y)), maxY = Math.max(...cells.map(cell => cell.y));
    let own = new Set(cells.map(cell => growthCellKey(cell.x, cell.y)));
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            if (own.has(growthCellKey(x, y))) continue;
            let occupied = analysis.occupancy.has(growthCellKey(x, y));
            if (occupied === occupiedWanted) return true;
        }
    }
    return false;
}

function evaluateGrowthSpatialEffect(entry, analysis) {
    let effect = entry.item.spatialEffect || (getGrowthBase(entry.item) || {}).spatialEffect;
    if (!effect || !effect.type) return { active:false, count:0, label:'공간 효과 없음' };
    let neighbors = getGrowthNeighbors(entry, analysis);
    let allTags = analysis.active.flatMap(row => row.item.tags || []);
    let count = 0;
    if (effect.type === 'adjacentCategory') count = neighbors.filter(row => row.item.category === effect.category).length;
    else if (effect.type === 'adjacentTag') count = neighbors.filter(row => (row.item.tags || []).includes(effect.tag)).length;
    else if (effect.type === 'adjacentCount') count = neighbors.length;
    else if (effect.type === 'wall') count = countGrowthWallFaces(entry, analysis) > 0 ? 1 : 0;
    else if (effect.type === 'wallFaces') count = countGrowthWallFaces(entry, analysis);
    else if (effect.type === 'corner') count = countGrowthWallFaces(entry, analysis) >= 2 ? 1 : 0;
    else if (effect.type === 'directionEmpty') count = hasGrowthDirectionEmpty(entry, analysis, effect.direction) ? 1 : 0;
    else if (effect.type === 'rowEdge') count = isGrowthRowEdge(entry, analysis, effect.edge) ? 1 : 0;
    else if (effect.type === 'sameRowCategory') count = analysis.active.filter(row => row !== entry && row.item.category === effect.category && row.placement.y === entry.placement.y).length;
    else if (effect.type === 'sameColumnCategory') count = analysis.active.filter(row => row !== entry && row.item.category === effect.category && row.placement.x === entry.placement.x).length;
    else if (effect.type === 'tagExact') count = allTags.filter(tag => tag === effect.tag).length === effect.count ? 1 : 0;
    else if (effect.type === 'distinctElements') count = new Set(allTags.filter(tag => GROWTH_ELEMENT_TAGS.includes(tag))).size >= effect.count ? 1 : 0;
    else if (effect.type === 'adjacentDifferentTags') count = new Set(neighbors.flatMap(row => row.item.tags || [])).size >= effect.count ? 1 : 0;
    else if (effect.type === 'isolated') count = neighbors.length === 0 ? 1 : 0;
    else if (effect.type === 'gapOccupied') count = getGrowthGapState(entry, analysis, true) ? 1 : 0;
    else if (effect.type === 'gapEmpty') count = getGrowthGapState(entry, analysis, false) ? 1 : 0;
    else if (effect.type === 'fullRow') count = getGrowthOccupiedCells(entry.item, entry.placement).some(cell => {
        for (let x = 0; x < analysis.board.width; x++) if (!analysis.occupancy.has(growthCellKey(x, cell.y))) return false;
        return true;
    }) ? 1 : 0;
    else if (effect.type === 'surrounded') count = neighbors.length >= 3 ? 1 : 0;
    else if (effect.type === 'distanceFromWall') {
        let cells = getGrowthOccupiedCells(entry.item, entry.placement);
        count = cells.every(cell => Math.min(cell.x, cell.y, analysis.board.width - 1 - cell.x, analysis.board.height - 1 - cell.y) >= effect.min) ? 1 : 0;
    } else if (effect.type === 'betweenCategories') {
        count = effect.categories.every(category => neighbors.some(row => row.item.category === category)) ? 1 : 0;
    } else if (effect.type === 'connectedTag') count = neighbors.some(row => (row.item.tags || []).includes(effect.tag)) ? 1 : 0;
    return { active: count > 0, count, label: effect.type, effect };
}

function isGrowthGlobalSynergyActive(rule, analysis) {
    let condition = rule.condition || {};
    let tags = analysis.active.flatMap(entry => entry.item.tags || []);
    if (condition.type === 'categories') return condition.values.every(value => analysis.active.some(entry => entry.item.category === value));
    if (condition.type === 'tags') return condition.values.every(value => tags.includes(value));
    if (condition.type === 'distinctSizes') return new Set(analysis.active.map(entry => getGrowthItemShape(entry.item, entry.placement.rotation).length)).size >= condition.count;
    if (condition.type === 'emptyCells') return analysis.board.unlockedCells.length - analysis.occupancy.size >= condition.min;
    if (condition.type === 'exactSizeCount') return analysis.active.filter(entry => getGrowthItemShape(entry.item, entry.placement.rotation).length === condition.size).length === condition.count;
    return false;
}

function computeGrowthBoardEffects() {
    let analysis = buildGrowthBoardAnalysis();
    let stats = [], triggers = [], conditionsByItem = {}, connections = [];
    analysis.active.forEach(entry => {
        let result = evaluateGrowthSpatialEffect(entry, analysis);
        conditionsByItem[String(entry.item.id)] = result;
        if (!result.active) return;
        let effect = result.effect;
        if (effect.stat) stats.push({ id: effect.stat, val: Number(effect.value || 0) * Math.max(1, result.count), source: entry.item.name });
        getGrowthNeighbors(entry, analysis).forEach(other => connections.push([entry.item.id, other.item.id]));
        if ((entry.item.tags || []).includes('trigger')) triggers.push({ id: entry.item.uniqueEffectKey || entry.item.baseId, sourceItemId: entry.item.id, internalCooldownMs: 500 });
    });
    let tier = getGrowthProgressTier();
    let synergies = GROWTH_GLOBAL_SYNERGIES.filter(rule => rule.minTier <= tier && isGrowthGlobalSynergyActive(rule, analysis));
    synergies.forEach(rule => rule.stats.forEach(stat => stats.push({ ...stat, source: rule.label })));
    return { stats, triggers, conditionsByItem, connections, synergies, occupancySize: analysis.occupancy.size, calculatedAt: Date.now() };
}

function getGrowthCompatibilitySlot(item, used) {
    let preferred = item.originalSlot || item.slot;
    if (preferred && !used.has(preferred)) return preferred;
    let pools = { flower:['무기'], branch:['방패','갑옷','투구','장갑1','장갑2','신발','허리띠'], leaf:['목걸이','반지1','반지2','반지3'] };
    let available = (pools[item.category] || []).find(slot => !used.has(slot));
    return available || `growth:${item.id}`;
}

function syncGrowthEquipmentBridge() {
    if (!game || game.growthSystemVersion < GROWTH_SYSTEM_VERSION) return game.equipment || {};
    let equipment = {}, used = new Set();
    getActiveGrowthItems().forEach(entry => {
        let slot = getGrowthCompatibilitySlot(entry.item, used);
        used.add(slot);
        equipment[slot] = entry.item;
    });
    game.equipment = equipment;
    return equipment;
}

function ensureGrowthBoardEffectsCache() {
    ensureGrowthBoardState(game);
    if (!game.growthBoardDirty && game.growthBoardEffectsCache) return game.growthBoardEffectsCache;
    syncGrowthBoardUnlocks(game);
    game.growthBoardEffectsCache = computeGrowthBoardEffects();
    game.growthBoardDirty = false;
    syncGrowthEquipmentBridge();
    return game.growthBoardEffectsCache;
}

safeExposeGlobals({ buildGrowthBoardAnalysis, getGrowthNeighbors, evaluateGrowthSpatialEffect, computeGrowthBoardEffects, syncGrowthEquipmentBridge, ensureGrowthBoardEffectsCache });
