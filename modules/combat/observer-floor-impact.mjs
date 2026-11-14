import { observerBox, moveSteps, moveCellOf } from './boss-move-geometry.mjs';
import { observerFloor, observerCacheFloor, observerRememberSeal } from './observer-floor-cache.mjs';
import { FLOOR_MS } from './boss-move-values.mjs';

export function observerLanding(env, unit, room, removed) {
            const blocked = env.deps.getGridBlockedCells(unit), size = env.deps.getGridUnitFootprint(unit);
            for (const key of removed) blocked.add(key);
            const terrain = env.deps.getGridPlacementTerrain();
            return observerBox(room, unit, room.x1 - room.x0, room.y1 - room.y0).sort((a, b) => moveSteps(unit, a) - moveSteps(unit, b)
                || Math.abs(a.gx - unit.gx) + Math.abs(a.gy - unit.gy) - Math.abs(b.gx - unit.gx) - Math.abs(b.gy - unit.gy))
                .find(cell => env.deps.canPlaceGridFootprint(blocked, cell.gx, cell.gy, size, terrain));
        }

export function* observerDisplace(env, unit, to, run) {
            const from = moveCellOf(unit);
            Object.assign(unit, to, { gridMoveTimer: 0, gridStepFrom: null });
            if (unit !== env.owner.gridPlayer) return;
            env.deps.actExplorationMotion.cancel(run);
            run.destination = null;
            (yield { kind: 'addBattleFx', args: ['playerMobility', { fromCell: from, toCell: to, duration: 260 }] });
        }

export function* observerCollapse(env, attack, now) {
            const run = env.deps.actExplorationState.current(env.owner), map = env.deps.getCombatGridSize();
            const enemy = attack.source, room = env.deps.actExplorationRooms.roomAt(map, enemy);
            if (!run || !room) return;
            const cells = attack.bossPattern.area.cells, keys = new Set(cells.map(cell => env.deps.gridCellKey(cell.gx, cell.gy)));
            const victims = env.deps.enemyAttackRules.impactTargets(attack, env.owner);
            attack.observerTargets = victims;
            for (const unit of victims) {
                const to = observerLanding(env, unit, room, keys);
                if (!to && unit === env.owner.gridPlayer) return; // No legal escape tile: keep the impact but do not remove the floor.
                if (to) (yield* observerDisplace(env, unit, to, run));
            }
            observerFloor(env, run, now); // Discard expired patches before adding a new one.
            const previous = env.memory.floors.get(run);
            const active = previous?.enemy === enemy ? previous : { enemy, patches: [] };
            active.patches.push({ cells, at: now, until: now + FLOOR_MS });
            observerCacheFloor(env, active);
            env.memory.floors.set(run, active);
            (yield { kind: 'addBattleFx', args: ['observerCollapse', { duration: 340 }] });
        }

export function* observerSeal(env, attack) {
            const run = env.deps.actExplorationState.current(env.owner), { cells, room } = attack.bossPattern.area;
            if (!run || !cells.length) return;
            const victims = env.deps.enemyAttackRules.impactTargets(attack, env.owner);
            attack.observerFatal = victims.includes(env.owner.gridPlayer);
            attack.observerTargets = [];
            const removed = observerRememberSeal(env, run, cells);
            for (const unit of victims) {
                if (unit === env.owner.gridPlayer || !env.deps.isGridUnitInCellSet(unit, removed)) continue;
                const to = observerLanding(env, unit, room, removed);
                if (to) (yield* observerDisplace(env, unit, to, run));
            }
            (yield { kind: 'addBattleFx', args: ['observerCollapse', { duration: 340 }] });
        }
