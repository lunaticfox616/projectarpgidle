import { cellHasGridCell, cellGridCellKey, cellGetCombatGridSize, cellGetGridUnitKeys, cellGetGridUnitCells } from './grid-units.mjs';
import { cellGetGridBlockedCells } from './grid-terrain.mjs';
import { cellGridStepToward } from './grid-path.mjs';

export function cellAdvanceGridUnitMovement(env, unit, target, {dtSec, intervalSec, avoid}) {
    if (!cellHasGridCell(env, unit) || !target) return false;
    let interval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : env.deps.COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
    if (env.deps.actExplorationState.current(env.owner) && unit===env.owner.gridPlayer) return cellBeginExplorationGridStep(env, target,interval,avoid);
    unit.gridMoveTimer = (Number(unit.gridMoveTimer) || 0) + dtSec;
    if (unit.gridMoveTimer < interval) return false;
    const next = cellGetGridApproachStep(env,unit,target,avoid);
    return cellSpendGridStep(env,unit,next,interval);
}

export function cellSpendGridStep(env,unit,next,interval) {
    if (!next) { unit.gridMoveTimer=interval; return false; }
    const from={gx:unit.gx,gy:unit.gy};
    const cost=interval*(from.gx!==next.gx && from.gy!==next.gy ? Math.SQRT2 : 1);
    if (unit.gridMoveTimer+1e-9<cost) return false;
    unit.gridMoveTimer=Math.min(interval,Math.max(0,unit.gridMoveTimer-cost));
    unit.gx=next.gx;unit.gy=next.gy;
    cellMarkGridStep(env,unit,from,true);
    return true;
}

export function cellGetGridUnitStepSec(env, unit) {
    if (unit && unit.isBoss) return unit.stepSec || env.deps.BOSS_REACH.stepSec;
    return env.deps.MONSTER_COMBAT_ROLES.of(unit)?.stepSec || env.deps.COMBAT_GRID_CONFIG.enemyMoveIntervalSec;
}

export function cellMarkGridStep(env, unit, from, moved) {
    if (moved) Object.assign(unit, { gridStepFrom: from, gridStepAt: env.deps.getCombatTime() });
}

export function cellWithAvoidedGridCells(blocked, cells) {
    for (const cell of cells || []) blocked.add(cellGridCellKey(cell.gx, cell.gy));
    return blocked;
}

export function cellStepAroundDanger(blocked, avoid, stepThrough) {
    const { hard = [], soft = [] } = Array.isArray(avoid) ? { hard: avoid } : (avoid || {});
    cellWithAvoidedGridCells(blocked, hard);
    return (soft.length > 0 && stepThrough(cellWithAvoidedGridCells(new Set(blocked), soft))) || stepThrough(blocked);
}

export function cellBeginExplorationGridStep(env, target,interval,avoid) {
    const run=env.deps.actExplorationState.current(env.owner);if(!run || run.motion)return false;
    if(env.deps.actExplorationMotion.freeBusy(run))return false;
    const next={gx:env.owner.gridPlayer.gx,gy:env.owner.gridPlayer.gy}, free=env.deps.bossMoves.observer.playerBoundary(run);
    if(!cellStepAroundDanger(cellGetExplorationPlanningBlockedCells(env, run),avoid,blocked=>cellGridStepToward(env, next, {tx:target.gx,ty:target.gy,blocked,diagonal:true})))return false;
    const paced=interval/env.deps.actExplorationDoors.pace(run);
    if(free){
        const point=env.deps.actExplorationMotion.preciseTarget(run,next);
        return env.deps.actExplorationMotion.startFree(run,env.owner.gridPlayer,point||next,paced);
    }
    return env.deps.actExplorationMotion.start(run,env.owner.gridPlayer,next,paced,run.motionTimeMs);
}

export function cellCanGridUnitStepToward(env, unit, target, avoid) {
    return !!cellGetGridApproachStep(env, unit, target, avoid);
}

export function cellGetGridApproachStep(env, unit, target, avoid) {
    if (!cellHasGridCell(env, unit) || !target) return null;
    const run = env.deps.actExplorationState.current(env.owner);
    const exploring = !!run && unit === env.owner.gridPlayer;
    const probe = { gx:unit.gx, gy:unit.gy, isBoss:unit.isBoss, footprint:unit.footprint };
    const blocked = exploring ? cellGetExplorationPlanningBlockedCells(env, run) : cellGetGridBlockedCells(env, unit);
    return cellStepAroundDanger(blocked, avoid, cells => cellGridStepToward(env, probe, {tx:target.gx,ty:target.gy,blocked:cells,diagonal:true})) ? probe : null;
}

export function cellGetExplorationPlanningBlockedCells(env, run) {
    const blocked=cellGetHeroStepBlockedCells(env),size=cellGetCombatGridSize(env);
    run.packs.forEach(pack=>pack.waiting.forEach(enemy=>cellGetGridUnitKeys(env, enemy,size).forEach(key=>blocked.delete(key))));
    return blocked;
}

export function cellGetHeroStepBlockedCells(env) {
    const blocked=cellGetGridBlockedCells(env, env.owner.gridPlayer),size=cellGetCombatGridSize(env);
    (env.owner.summons||[]).forEach(summon=>{if(summon)cellGetGridUnitKeys(env, summon,size).forEach(key=>blocked.delete(key));});
    return blocked;
}

export function cellSwapSummonOutOfHeroTile(env, from) {
    const hero=env.owner.gridPlayer;
    if(!from || (hero.gx===from.gx && hero.gy===from.gy))return;
    const summon=(env.owner.summons||[]).find(row=>row && cellHasGridCell(env, row) && cellGetGridUnitCells(env, row).some(cell=>cell.gx===hero.gx && cell.gy===hero.gy));
    if(summon)Object.assign(summon,{gx:from.gx,gy:from.gy,gridMoveTimer:0});
}
