import { attackControls } from '../combat/enemy-targets.mjs';
import { clampNumber } from '../common/numbers.mjs';

export function attackActiveCast(enemy, pending) {
        if (pending?.delivery === 'patternArea' && pending.bossPattern.isSpecial !== false) {
            const pattern=pending.bossPattern, fatal=pattern.observerMove==='seal';
            return {label:pattern.label,startAt:fatal ? pattern.castStartedAt : pending.castStartAt,finishAt:pending.at,fatal};
        }
        if (!enemy.attackCast?.isSpecial) return null;
        return {...enemy.attackCast,label:enemy.attackCast.label || enemy.attackLabel || '강력한 공격'};
    }

export function attackCastBar(env, enemy, now, pending) {
        if (enemy.hp <= 0) return null;
        if (enemy.castInterruptedUntil > now) return {label:env.deps._t('시전 취소'),progress:0,cancelled:true};
        const cc = attackControls(enemy);
        if (cc.hard || cc.silence) return null;
        const cast = attackActiveCast(enemy,pending);
        if (cast && now < cast.finishAt) return {label:cast.label, fatal:cast.fatal,
            progress:clampNumber((now-cast.startAt)/Math.max(1,cast.finishAt-cast.startAt),0,1)};
        return attackWarningBar(env, enemy,now);
    }

export function attackWarningBar(env, enemy,now) {
        const state = enemy.nextPatternState;
        if (!state?.isSpecial || !enemy.patternTelegraphKey || !enemy.patternArea) return null;
        const span = (state.warningMs || env.deps.COMBAT_GRID_CONFIG.bossPatternWarningMs) + env.deps.bossMoves.firstImpactMs(state, enemy);
        return {label:state.label || '강력한 공격', fatal:state.observerMove === 'seal',
            progress:clampNumber((now-enemy.patternTelegraphStartedAt)/span,0,1)};
    }

/** Later stages suppress the cast announcement, but remain damage from the same named special. */
    export function attackDamageName(enemy,pattern) {
        const special = pattern && (pattern.isSpecial || pattern.move);
        return special && pattern.label ? `${enemy.name} (${pattern.label})` : enemy.name;
    }
