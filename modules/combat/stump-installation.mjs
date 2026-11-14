import { stumpPositions } from './stump-placement.mjs';
import { stumpFootprintCells, stumpOwner, stumpStumpCellKey } from './stump-occupancy.mjs';

export function stumpWarning(env, enemy, state, now, box) {
        const installCells = stumpPositions(env, enemy, box), cells = installCells.flatMap((arg0) => stumpFootprintCells(env, arg0));
        const cast = { type: 'stump', motion: state.motion, element: enemy.ele, startedAt: now,
            warningMs: state.warningMs, box, events: [], stages: [{ ms: 160, cells }], installCells };
        return { kind: 'woodsman', cells, source: { gx: enemy.gx, gy: enemy.gy }, woodsman: cast };
    }

export function stumpInstallStumps(env, enemy, cast, now) {
        if (enemy !== stumpOwner(env) || enemy.woodsmanStumpsPlaced) return;
        const occupied = env.deps.getGridBlockedCells(), motion = env.deps.actExplorationState.current(env.owner)?.motion;
        if (motion?.to) occupied.add(stumpStumpCellKey(env, motion.to));
        const terrain = env.deps.getGridPlacementTerrain();
        enemy.woodsmanStumps = cast.installCells.slice(0, 1)
            .filter(c => env.deps.canPlaceGridFootprint(occupied, c.gx, c.gy, c.footprint, terrain)).map(c => ({ ...c,
            plantedAt: now, phase: 'idle', phaseAt: now, spawnSerial: Math.floor(Math.random() * env.deps.WOODSMAN_BATTLE.stumps.summons.length),
            lastSpawnAt: 0, echoes: [], absorbedCount: 0, target: null, nextSpawnAt: now + env.deps.WOODSMAN_BATTLE.stumps.firstSpawnMs }));
        // A player may enter the warning. Retry with a fresh warning instead of trapping them or losing the mechanic.
        enemy.woodsmanStumpsPlaced = enemy.woodsmanStumps.length === 1;
    }

export function stumpResolveStumps(env, attack, now) {
        const cast = attack.bossPattern?.move?.cast;
        if (cast?.type !== 'stump') return false;
        stumpInstallStumps(env, attack.source, cast, now);
        return true;
    }
