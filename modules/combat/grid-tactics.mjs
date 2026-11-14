import { cellGetGridUnitDistance, cellGetGridUnitFootprint, cellGetGridUnitCells, cellGetGridUnitCenter, cellHasGridCell } from './grid-units.mjs';
import { cellGetGridBlockedCells, cellCanPlaceGridFootprint } from './grid-terrain.mjs';
import { cellMarkGridStep, cellBeginExplorationGridStep } from './grid-movement.mjs';
import { cellGridStepToward } from './grid-path.mjs';
import { GRID_CARDINAL_STEPS } from './combat-grid-values.mjs';

export function cellFindGridRetreatCell(env, unit, target, {maxRange, previousCell, keepRows}) {
    const { footprint, open, currentDist } = cellGridRetreatSpace(env, unit, target, keepRows);
    let best = null, bestScore = currentDist;
    GRID_CARDINAL_STEPS.forEach(direction => {
        let gx = unit.gx + direction.dx, gy = unit.gy + direction.dy;
        if (!open({ gx, gy })) return;
        let distance = cellGetGridUnitDistance(env, { gx, gy, isBoss: unit.isBoss, footprint }, target);
        if (distance <= currentDist || distance > maxRange) return;
        let backtrack = previousCell && gx === previousCell.gx && gy === previousCell.gy;
        let score = distance - (backtrack ? 0.25 : 0);
        if (score > bestScore) { best = { gx, gy }; bestScore = score; }
    });
    return best;
}

export function cellGridRetreatSpace(env, unit, target, keepRows) {
    let blocked = cellGetGridBlockedCells(env, unit);
    let footprint = cellGetGridUnitFootprint(env, unit);
    // 방 단위 무대: 주인공은 벽에 파인 문 칸(한 칸짜리 막다른 곳)으로 물러서지 않는다. 2026-10-17 사용자 "거리유지 전술에서 방 입구의
    // 1칸 막다른길로는 안 들어가게 해줘": 몰린 채 그 칸에 갇혀 싸웠다.
    let stage = unit === env.owner.gridPlayer ? env.deps.actExplorationDoors.stageMap(env.deps.actExplorationState.current(env.owner)) : null;
    const placement={env,footprint};
    let open = cell => cellCanPlaceGridFootprint(blocked, cell.gx, cell.gy, placement) && !(stage && env.deps.actExplorationRooms.doorAt(stage, cell))
        && (!keepRows || cellGetGridUnitCells(env, target).some(row => Math.abs(row.gy - cell.gy) <= keepRows));
    return { footprint, open, currentDist: cellGetGridUnitDistance(env, unit, target) };
}

export function cellFindGridSidestepCell(env, unit, target, {maxRange, previousCell, keepRows}) {
    const { footprint, open, currentDist } = cellGridRetreatSpace(env, unit, target, keepRows);
    if (currentDist >= maxRange) return null;
    const turns = GRID_CARDINAL_STEPS.map(direction => ({ gx: unit.gx + direction.dx, gy: unit.gy + direction.dy }))
        .filter(cell => open(cell) && !(previousCell && cell.gx === previousCell.gx && cell.gy === previousCell.gy)
            && cellGetGridUnitDistance(env, { ...cell, isBoss: unit.isBoss, footprint }, target) === currentDist);
    const center = cellGetGridUnitCenter(env, target);
    const gap = cell => (cell.gx + (footprint.columns - 1) / 2 - center.gx) ** 2
        + (cell.gy + (footprint.rows - 1) / 2 - center.gy) ** 2;
    const turn = turns.reduce((farther, cell) => gap(cell) > gap(farther) ? cell : farther, unit);
    return turn === unit ? null : turn;
}

function cellTacticalOptions(options,defaultInterval) {
    const config=options||{};
    const interval=Number(config.intervalSec)>0?Number(config.intervalSec):defaultInterval;
    return {config,interval};
}

export function cellAdvanceGridTacticalMovement(env, unit, target, options) {
    if (![unit,target].every((...args)=>cellHasGridCell(env,...args))) return { moved: false };
    const {config,interval}=cellTacticalOptions(options,env.deps.COMBAT_GRID_CONFIG.playerMoveIntervalSec);
    if (env.deps.actExplorationState.current(env.owner) && unit===env.owner.gridPlayer) return cellBeginExplorationTacticalStep(env, target,config,interval);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + Math.max(0, Number(config.dtSec) || 0);
    if (unit.gridMoveTimer < interval) return { moved: false };
    let from = { gx: unit.gx, gy: unit.gy };
    const cell = cellFindGridTacticalDestination(env, unit,target,config);
    const moved = !!cell;
    if (cell) Object.assign(unit,cell);
    unit.gridMoveTimer = moved ? 0 : interval;
    cellMarkGridStep(env, unit, from, moved);
    return { moved, from, to: { gx: unit.gx, gy: unit.gy }, retreat: moved && config.direction === 'away' };
}

export function cellBeginExplorationTacticalStep(env, target,config,interval) {
    const from={gx:env.owner.gridPlayer.gx,gy:env.owner.gridPlayer.gy};
    const away=config.direction==='away';
    const next=cellFindGridTacticalDestination(env, env.owner.gridPlayer,target,config);
    const moved=!!next && cellBeginExplorationGridStep(env, next,interval);
    return {moved,from,to:moved?env.owner.actExploration.motion.to:from,retreat:moved && away};
}

export function cellFindGridTacticalDestination(env, unit,target,config) {
    const range=Math.max(1,Number(config.maxRange)||1);
    const reach={maxRange:range,previousCell:config.previousCell,keepRows:config.keepRows};
    if(config.direction==='away')return cellFindGridRetreatCell(env, unit, target, reach)||cellFindGridSidestepCell(env, unit, target, reach);
    const next={gx:unit.gx,gy:unit.gy};
    return cellGridStepToward(env, next, {tx:target.gx,ty:target.gy,blocked:cellGetGridBlockedCells(env, unit),diagonal:undefined})?next:null;
}
