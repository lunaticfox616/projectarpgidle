import { AFTER, DIVIDED, BEFORE } from './boss-move-values.mjs';

export function observerMatches(env, enemy) { return env.owner.currentZoneId === env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID
            && enemy.isBoss && enemy.monsterVisualId === 'pinnacle_observer'; }

export function observerOpeningAt(env, enemy) { return env.memory.phases.get(enemy)?.at ?? null; }

export function observerArena(env, enemy) { return env.deps.actExplorationRooms.roomAt(env.deps.getCombatGridSize(), enemy); }

export function observerBoundary(env, enemy) {
            const started = env.memory.splits.get(enemy);
            if (started === undefined || enemy.hp <= 0 || !observerMatches(env, enemy)) return null;
            const room = observerArena(env, enemy);
            return room ? { room, started } : null;
        }

export function observerPlayerBoundary(env, run) {
            if (run?.zoneId !== env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID) return null;
            const enemy = env.owner.enemies.find((arg0) => observerMatches(env, arg0)), split = enemy && observerBoundary(env, enemy);
            return split && observerArena(env, env.owner.gridPlayer) === split.room ? split : null;
        }

export function observerReadyToDivide(env, enemy) { return enemy && enemy.hp > 0 && enemy.hp <= enemy.maxHp * .75 && !env.memory.splits.has(enemy); }

export function observerSceneActive(env) {
            return env.memory.division && observerMatches(env, env.memory.division.enemy) && env.memory.division.enemy.hp > 0 && env.owner.enemies.includes(env.memory.division.enemy) ? env.memory.division : null;
        }

export function observerPattern(env, enemy, attackNumber) {
            if (!observerMatches(env, enemy)) return null;
            const current = enemy.nextPatternState;
            if (enemy.patternTelegraphKey && current?.attackNumber === attackNumber && current.observerMove) return current;
            const awakened = observerOpeningAt(env, enemy) !== null || enemy.hp <= enemy.maxHp / 2;
            const cycle = awakened ? AFTER : env.memory.splits.has(enemy) ? DIVIDED : BEFORE;
            const row = cycle[(attackNumber - 1) % cycle.length];
            return { mode: 'cosmos', patternMode: enemy.patternMode, attackNumber, isSpecial: true, shapeIndex: -1,
                label: env.deps._t(row.label), observerMove: row.kind, telegraphKind: 'ring', warningMs: row.warningMs, damageMul: row.damageMul,
                recoveryMs: row.kind === 'collapse' ? 1050 : 460 };
        }
