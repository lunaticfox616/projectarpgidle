import { moveCellOf, observerColorBands, observerColorCells, observerObserverGroups, observerObserverFloorMove } from './boss-move-geometry.mjs';
import { SEAL_CAST_MS, SEAL_LOCK_MS } from './boss-move-values.mjs';
import { observerArena } from './observer-state.mjs';

export function observerArea(env, enemy, state, target) {
            if (!state.observerMove) return null;
            const terrain = env.deps.getGridPlacementTerrain(), room = env.deps.actExplorationRooms.roomAt(terrain.map, enemy);
            if (!room) return null;
            const kind = state.observerMove, center = moveCellOf(kind === 'seal' ? env.owner.gridPlayer : target);
            const source = env.deps.getClosestGridUnitCell(center, enemy), bands = observerColorBands(room, center, state);
            const groups = bands ? [observerColorCells(room, center, bands)] : observerObserverGroups(room, center, kind);
            const waves = groups.map(cells => cells.filter(cell => observerObserverFloorMove(kind)
                ? env.deps.actExplorationState.validObserverSeal(terrain.map, cell) : env.deps.actExplorationMap.walkable(terrain.map, cell, terrain.sealed)));
            const cells = [...new Map(waves.flat().map(cell => [env.deps.gridCellKey(cell.gx, cell.gy), cell])).values()];
            return { kind: 'blast', shape: 'cells', center, source, cells, waves, room, bands, observerMove: kind };
        }

export function observerFollowSeal(env, enemy, state, now) {
            if (state.observerMove !== 'seal' || !env.deps.hasGridCell(env.owner.gridPlayer)) return;
            const target = env.owner.gridPlayer, current = enemy.patternArea, elapsed = now - enemy.patternTelegraphStartedAt;
            if (elapsed >= SEAL_CAST_MS - SEAL_LOCK_MS) {
                if (current) current.sealLocked = true;
                return;
            }
            if (current && current.center.gx === target.gx && current.center.gy === target.gy) return;
            if (observerArena(env, enemy) === observerArena(env, target)) enemy.patternArea = observerArea(env, enemy, state, target);
        }
