import { cellGetGridPlacementTerrain, cellCanPlaceGridFootprint, cellGetGridBlockedCells } from './grid-terrain.mjs';
import { cellGridChebyshevDist, cellGetGridUnitFootprint, cellGetGridFootprintCells, cellGridCellKey, cellGetCombatGridSize, cellHasGridCell, cellIsGridCellInBounds } from './grid-units.mjs';
import { cellFitBossFootprint, cellAssignEnemyGridCombatProfile } from './grid-appearance.mjs';

export function cellFindFreeGridCell(env, blocked, near, footprint) {
    let size = footprint || { columns: 1, rows: 1 };
    if (cellIsOneTileNear(env, near, size)) return cellFindFreeGridCellNear(env, blocked, near);
    let free = [], terrain = cellGetGridPlacementTerrain(env);
    const placement={env,footprint:size,terrain};
    for (let gx = 0; gx < terrain.map.columns; gx++) {
        for (let gy = 0; gy < terrain.map.rows; gy++) {
            if (cellCanPlaceGridFootprint(blocked, gx, gy, placement)) free.push({ gx, gy });
        }
    }
    if (free.length === 0) return null;
    if (!near) return free[Math.floor(Math.random() * free.length)];
    return cellNearestGridCell(free, near, size);
}

export function cellFindFreeGridCellNear(env, blocked, near) {
    const terrain = cellGetGridPlacementTerrain(env), reach = Math.max(terrain.map.columns, terrain.map.rows);
    for (let ring = 0; ring <= reach; ring++) {
        const cell = cellFirstFreeOnRing(env, blocked, near, ring, terrain);
        if (cell) return cell;
    }
    return null;
}

export function cellFirstFreeOnRing(env, blocked, near, ring, terrain) {
    const size = { columns: 1, rows: 1 };
    const placement={env,footprint:size,terrain};
    const rows = gx => (Math.abs(gx - near.gx) === ring
        ? Array.from({ length: 2 * ring + 1 }, (_, index) => near.gy - ring + index) : [near.gy - ring, near.gy + ring]);
    for (let gx = Math.max(0, near.gx - ring); gx <= Math.min(terrain.map.columns - 1, near.gx + ring); gx++) {
        const cell = rows(gx).filter(gy => gy >= 0 && gy < terrain.map.rows).find(gy => cellCanPlaceGridFootprint(blocked, gx, gy, placement));
        if (cell !== undefined) return { gx, gy: cell };
    }
    return null;
}

export function cellNearestGridCell(cells, near, size) {
    let centerOffsetX = (size.columns - 1) / 2, centerOffsetY = (size.rows - 1) / 2;
    let best = cells[0], bestDistance = Infinity;
    for (const cell of cells) {
        const distance = cellGridChebyshevDist(cell.gx + centerOffsetX, cell.gy + centerOffsetY, near.gx, near.gy);
        if (distance < bestDistance) { best = cell; bestDistance = distance; }
    }
    return best;
}

export function cellAssignEnemyGridSpawn(env, enemy, blocked) {
    cellFitBossFootprint(env, enemy);
    let footprint = cellGetGridUnitFootprint(env, enemy);
    let bossSpawnFree = cellCanPlaceGridFootprint(blocked, env.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, env.deps.COMBAT_GRID_CONFIG.bossSpawn.gy, {env:env,footprint:footprint,terrain:undefined});
    let cell = enemy.isBoss
        ? (!bossSpawnFree
            ? cellFindFreeGridCell(env, blocked, env.deps.COMBAT_GRID_CONFIG.bossSpawn, footprint)
            : { gx: env.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, gy: env.deps.COMBAT_GRID_CONFIG.bossSpawn.gy })
        // A wide map spawns reinforcements (void breach, swarms) beside the hero, not in some far room.
        : cellFindFreeGridCell(env, blocked, env.deps.actExplorationState.current(env.owner) ? env.owner.gridPlayer : undefined);
    if (!cell) cell = { gx: env.deps.COMBAT_GRID_CONFIG.bossSpawn.gx, gy: env.deps.COMBAT_GRID_CONFIG.bossSpawn.gy };
    enemy.gx = cell.gx;
    enemy.gy = cell.gy;
    enemy.gridMoveTimer = 0;
    cellGetGridFootprintCells(env, cell.gx, cell.gy, footprint).forEach(occupied => blocked.add(cellGridCellKey(occupied.gx, occupied.gy)));
}

export function cellResetPlayerGridPosition(env) {
    const cell=cellGetCombatGridSize(env).entry || env.deps.COMBAT_GRID_CONFIG.playerSpawn;
    env.owner.gridPlayer = { gx: cell.gx, gy: cell.gy, gridMoveTimer: 0 };
}

export function cellEnsureCombatGridRuntime(env) {
    if (!cellHasGridCell(env, env.owner.gridPlayer)) cellResetPlayerGridPosition(env);
    // The occupied set only once a unit needs a cell: every combat tick and every target search comes through here, and almost
    // every unit already stands somewhere (2026-10-27: a tenth of an 8-hour offline settlement built this set for nothing).
    let blocked = null;
    const occupied = () => blocked || (blocked = cellGetGridBlockedCells(env));
    (env.owner.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        if (!enemy.attackKind || !Number.isFinite(enemy.attackRange)) cellAssignEnemyGridCombatProfile(env, enemy);
        if (cellHasGridCell(env, enemy)) return;
        cellAssignEnemyGridSpawn(env, enemy, occupied());
    });
    (env.owner.summons || []).forEach(summon => {
        if (!summon || !summon.alive || (summon.hp || 0) <= 0 || cellHasGridCell(env, summon)) return;
        let cell = cellFindFreeGridCell(env, occupied(), env.owner.gridPlayer);
        if (!cell) return;
        summon.gx = cell.gx;
        summon.gy = cell.gy;
        summon.gridMoveTimer = 0;
        blocked.add(cellGridCellKey(cell.gx, cell.gy));
    });
}

function cellIsOneTileNear(env, near,size) {return !!near && size.columns === 1 && size.rows === 1 && cellIsGridCellInBounds(env, near.gx, near.gy);}
