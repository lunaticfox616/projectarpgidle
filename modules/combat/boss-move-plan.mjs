import { moveReleaseShift } from './boss-shift-state.mjs';
import { observerImpacts } from './boss-move-geometry.mjs';
import { moveStyleOf, moveMoveKind } from './boss-move-style.mjs';
import { moveStagesOf } from './boss-move-stages.mjs';

/** Puts a move on a special about to be released (consumeBossPatternAttack): state.move, or nothing (lands at once). */
    export function movePlanBossMove(env, state, enemy) {
        if (!state || !state.area || !state.isSpecial || !enemy) return null;
        if (state.area.observerMove) return movePlanObserverMove(state);
        moveReleaseShift(env, enemy);
        return state.area.woodsman ? env.deps.woodsmanBattle.plan(state) : movePlanStagedMove(env, state, enemy);
    }

export function movePlanObserverMove(state) {
        const { source, observerMove, room, bands } = state.area;
        const stages = observerImpacts(state.area).filter(stage => stage.cells.length);
        if (!stages.length) return null;
        state.move = { kind: 'observer', observerMove, source, room, bands, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
        return state.move;
    }

export function movePlanStagedMove(env, state, enemy) {
        const style = moveStyleOf(env, enemy), kind = moveMoveKind(state.area, state.telegraphKind, style);
        if (!kind) return null;
        const source = state.area.source || { gx: enemy.gx, gy: enemy.gy }, stages = moveStagesOf(env, kind, state.area, source).filter(stage => stage.cells.length);
        if (!stages.length) return null;
        state.move = { kind, style, source, stages, next: 0, spent: [], hits: [], releasedAt: 0 };
        return state.move;
    }
