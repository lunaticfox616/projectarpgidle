import { observerSceneActive, observerMatches, observerReadyToDivide, observerArena } from './observer-state.mjs';
import { divisionCue, OPEN_MS } from './boss-move-values.mjs';

export function* observerDivide(env, enemy, now) {
            if (enemy.hp > enemy.maxHp * .75 || env.memory.splits.has(enemy)) return;
            env.memory.splits.set(enemy, now);
            (yield { kind: 'addBattleFx', args: ['observerCollapse', { duration: 340 }] });
        }

/** The foreground scheduler pauses combat, while the scene itself advances on its wall clock. */
        export function* observerAdvanceScene(env, now, paused) {
            const scene = observerSceneActive(env);
            if (scene) return (yield* observerAdvanceDivision(env, scene, now, paused));
            env.memory.division = null;
            if (paused || env.owner.currentZoneId !== env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID || env.owner.combatHalted) return false;
            const enemy = env.owner.enemies.find((arg0) => observerMatches(env, arg0));
            if (!observerReadyToDivide(env, enemy)) return false;
            const room = observerArena(env, enemy);
            if (!room || room !== observerArena(env, env.owner.gridPlayer)) return false;
            env.memory.division = { enemy, room, started: now, last: now };
            return true;
        }

export function* observerAdvanceDivision(env, scene, now, paused) {
            if (paused) scene.started += now - scene.last;
            scene.last = now;
            if (now - scene.started < divisionCue.end) return true;
            env.memory.division = null;
            (yield* observerDivide(env, scene.enemy, env.deps.getCombatTime()));
            return false;
        }

/** Finish the attack that has already been shown. Hold the next cast while the mantle opens. */
        export function* observerWait(env, enemy, now) {
            if (!observerMatches(env, enemy)) return false;
            if ((yield* observerHoldsForDivision(env, enemy, now))) return true;
            const phase = env.memory.phases.get(enemy);
            if (phase && phase.at !== null) return now < phase.at + OPEN_MS;
            if (enemy.hp > enemy.maxHp / 2) { if (!phase) env.memory.phases.set(enemy, { at: null }); return false; }
            if (enemy.patternTelegraphKey && enemy.patternArea) return false;
            env.memory.phases.set(enemy, { at: phase ? now : now - OPEN_MS });
            return !!phase;
        }

export function* observerHoldsForDivision(env, enemy, now) {
            if (env.owner.isBackgroundCalculation) (yield* observerDivide(env, enemy, now));
            return observerReadyToDivide(env, enemy) && observerArena(env, enemy) === observerArena(env, env.owner.gridPlayer);
        }
