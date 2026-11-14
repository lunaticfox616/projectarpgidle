import { SHIFT_TIMING } from './boss-move-values.mjs';
import { moveShiftContext, moveShiftLanding, moveLegalLanding } from './boss-shift-placement.mjs';
import { moveCellOf } from './boss-move-geometry.mjs';

export function moveWoodsmanShiftKind(env, enemy, attackNumber) {
        if (!enemy.isWoodsman || env.owner.currentZoneId !== env.deps.OUTSIDE_CHAOS_ZONE_ID || attackNumber % 4) return null;
        return attackNumber % 8 ? 'blink' : 'ambush';
    }

export function moveShiftPattern(env, enemy, attackNumber) {
        const kind = moveWoodsmanShiftKind(env, enemy, attackNumber);
        if (!kind) return null;
        return { mode: 'burst', patternMode: enemy.patternMode, attackNumber, isSpecial: true, shapeIndex: -1, shiftKind: kind,
            label: kind === 'blink' ? env.deps._t('공간 절단') : env.deps._t('그림자 기습'), damageMul: 1.18,
            telegraphKind: kind === 'blink' ? 'lane' : 'impact', warningMs: SHIFT_TIMING[kind].warning, recoveryMs: 800 };
    }

/** A scheduled blink may charge out of melee range, but never across rooms. */
    export function moveCanPrepare(env, enemy, target) {
        if (env.owner.currentZoneId === env.deps.BEYOND_BOUNDARY_UNLOCK_BOSS_ID && enemy.monsterVisualId === 'pinnacle_observer') {
            const map = env.deps.getCombatGridSize(), room = env.deps.actExplorationRooms.roomAt(map, enemy);
            return room ? env.deps.actExplorationRooms.roomAt(map, target) === room : env.deps.canEnemyAttackFromHere(enemy, target);
        }
        if (!moveWoodsmanShiftKind(env, enemy, (Number(enemy.patternAttackCount) || 0) + 1)) return env.deps.canEnemyAttackFromHere(enemy, target);
        const map = env.deps.getCombatGridSize(), room = env.deps.actExplorationRooms.roomAt(map, enemy);
        return !!room && env.deps.actExplorationRooms.roomAt(map, target)?.id === room.id;
    }

export function movePrepareShift(env, enemy, state, target, now) {
        if (!state.shiftKind) { env.memory.shifts.delete(enemy); return null; }
        const context = moveShiftContext(env, enemy), to = moveShiftLanding(env, enemy, target, state.shiftKind, context);
        const run = env.deps.actExplorationState.current(env.owner), key = enemy.patternTelegraphKey;
        if (!to) { env.memory.shifts.set(enemy, { run, key, stationary: true }); return null; } // cast in place if no safe landing exists
        const source = env.deps.getClosestGridUnitCell(target, { ...to, isBoss: true, footprint: context.footprint });
        const area = { ...env.deps.getSkillStageFootprint('', {}, { aimCell: target,
            gridProfile: env.deps.COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind] }, source), source };
        env.memory.shifts.set(enemy, { kind: state.shiftKind, key, run,
            from: moveCellOf(enemy), to, target: moveCellOf(target), startedAt: now, landAt: now + SHIFT_TIMING[state.shiftKind].land,
            element: env.deps.woodsmanAttackFxElement(enemy), landed: false, cancelled: false, released: false });
        return area;
    }

export function moveShiftOf(env, enemy) {
        const shift = env.memory.shifts.get(enemy);
        if (!shift || shift.stationary || shift.cancelled || enemy.hp <= 0 || env.owner.currentZoneId !== env.deps.OUTSIDE_CHAOS_ZONE_ID) return null;
        if (shift.run !== env.deps.actExplorationState.current(env.owner)) return null;
        return shift.released || enemy.patternTelegraphKey === shift.key ? shift : null;
    }

/** Reloaded casts have no transient destination. Restart their full warning instead of landing an old, invisible attack. */
    export function moveNeedsWarning(env, enemy, state, key) {
        if (enemy.patternTelegraphKey !== key) return true;
        if (!state.shiftKind) return false;
        const shift = env.memory.shifts.get(enemy);
        return !shift || shift.key !== key || shift.run !== env.deps.actExplorationState.current(env.owner);
    }

/** Recheck occupancy at the actual hop; a hero stepping onto the mark cancels this cast, never gets displaced. */
    export function moveUpdateShift(env, enemy, now) {
        const shift = moveShiftOf(env, enemy);
        if (!shift || shift.landed || now < shift.landAt) return true;
        if (!moveLegalLanding(env, shift.to, moveShiftContext(env, enemy))) {
            shift.cancelled = true;
            enemy.attackTimer = 0;
            enemy.castInterruptedUntil = now + 650;
            return false;
        }
        Object.assign(enemy, shift.to, { gridMoveTimer: 0, gridStepFrom: null, gridStepAt: now });
        enemy.facingDirection = env.deps.skillGemCasts.facing(enemy, shift.target);
        shift.landed = true;
        return true;
    }

export function moveReleaseShift(env, enemy) {
        const shift = moveShiftOf(env, enemy);
        if (shift) { shift.released = true; shift.releasedAt = env.deps.getCombatTime(); }
    }

export function moveCancelShift(env, enemy) { env.memory.shifts.delete(enemy); }
