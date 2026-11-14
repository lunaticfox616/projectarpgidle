

export function cellIsGridCellInBounds(env, gx, gy, size = cellGetCombatGridSize(env)) {
    return Number.isInteger(gx) && Number.isInteger(gy)
        && gx >= 0 && gy >= 0
        && gx < size.columns && gy < size.rows;
}

export function cellGetCombatGridSize(env, state=env.owner) {
    const exploration=state.actExploration;
    if(!exploration||exploration.zoneId!==state.currentZoneId)return env.deps.COMBAT_GRID_CONFIG;
    return env.deps.actExplorationMap.forRun(exploration) || env.deps.COMBAT_GRID_CONFIG;
}

export function cellGridCellKey(gx, gy) {
    return gx + ',' + gy;
}

export function cellGridChebyshevDist(ax, ay, bx, by) {
    return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function cellGetGridUnitFootprint(env, unit) {
    let bossSize = (unit && unit.footprint) || env.deps.COMBAT_GRID_CONFIG.bossFootprint || { columns: 2, rows: 2 };
    return unit && unit.isBoss
        ? { columns: bossSize.columns, rows: bossSize.rows }
        : { columns: 1, rows: 1 };
}

export function cellGetGridFootprintCells(env, gx, gy, footprint, size = cellGetCombatGridSize(env)) {
    let cells = [];
    for (let dx = 0; dx < footprint.columns; dx++) {
        for (let dy = 0; dy < footprint.rows; dy++) {
            if (cellIsGridCellInBounds(env, gx + dx, gy + dy, size)) cells.push({ gx: gx + dx, gy: gy + dy });
        }
    }
    return cells;
}

export function cellHasGridCell(env, unit, size) {
    if (!unit) return false;
    return cellIsGridFootprintInside(unit.gx, unit.gy, cellGetGridUnitFootprint(env, unit), size && typeof size === 'object' ? size : cellGetCombatGridSize(env));
}

export function cellIsGridFootprintInside(gx, gy, footprint, map) {
    return Number.isInteger(gx) && Number.isInteger(gy) && gx >= 0 && gy >= 0
        && gx + footprint.columns <= map.columns && gy + footprint.rows <= map.rows;
}

export function cellGetGridUnitCells(env, unit) {
    const size = cellGetCombatGridSize(env);
    return cellHasGridCell(env, unit, size) ? cellGetGridFootprintCells(env, unit.gx, unit.gy, cellGetGridUnitFootprint(env, unit), size) : [];
}

export function cellGetGridUnitKeys(env, unit, size = cellGetCombatGridSize(env)) {
    if (!cellHasGridCell(env, unit, size)) return [];
    const footprint = cellGetGridUnitFootprint(env, unit), keys = [];
    for (let dx = 0; dx < footprint.columns; dx++) for (let dy = 0; dy < footprint.rows; dy++) keys.push(cellGridCellKey(unit.gx + dx, unit.gy + dy));
    return keys;
}

export function cellGetGridUnitCenter(env, unit) {
    let footprint = cellGetGridUnitFootprint(env, unit);
    return { gx: unit.gx + (footprint.columns - 1) / 2, gy: unit.gy + (footprint.rows - 1) / 2 };
}

export function cellGetGridUnitDistance(env, first, second) {
    if (!cellHasGridCell(env, first) || !cellHasGridCell(env, second)) return Infinity;
    let firstSize = cellGetGridUnitFootprint(env, first), secondSize = cellGetGridUnitFootprint(env, second);
    let dx = Math.max(0, second.gx - (first.gx + firstSize.columns - 1), first.gx - (second.gx + secondSize.columns - 1));
    let dy = Math.max(0, second.gy - (first.gy + firstSize.rows - 1), first.gy - (second.gy + secondSize.rows - 1));
    return Math.max(dx, dy);
}

export function cellGetGridDirectHitDistanceMultiplier(env, first, second) {
    let distance = cellGetGridUnitDistance(env, first, second);
    if (!Number.isFinite(distance)) return 1;
    let reductionPct = Math.min(50, Math.max(0, distance - 1) * 5);
    return 1 - reductionPct / 100;
}

export function cellGetClosestGridUnitCell(env, from, unit) {
    let footprint = cellGetGridUnitFootprint(env, unit);
    return {
        gx: Math.max(unit.gx, Math.min(from.gx, unit.gx + footprint.columns - 1)),
        gy: Math.max(unit.gy, Math.min(from.gy, unit.gy + footprint.rows - 1))
    };
}

export function cellIsGridUnitInCellSet(env, unit, cellKeys) {
    return cellGetGridUnitKeys(env, unit).some(key => cellKeys.has(key));
}
