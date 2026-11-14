import { attackControls } from '../combat/enemy-targets.mjs';

/** Freeze/stun stop actions; silence stops specials/casts. Released flights are independent. */
    export function attackInterrupt(env, enemy, now) {
        const cc = attackControls(enemy);
        const special = enemy.nextPatternState?.isSpecial || enemy.attackCast || enemy.attackCastMs > 0;
        if (!cc.hard && !(cc.silence && special)) return false;
        enemy.castInterruptedAt = now;
        attackClearInterruptedCast(env, enemy, now);
        return true;
    }

export function attackClearInterruptedCast(env, enemy, now) {
        env.deps.bossMoves.cancelShift(enemy);
        if (enemy.patternTelegraphKey || enemy.attackCast) {
            enemy.castInterruptedUntil = enemy.nextPatternState?.isSpecial || enemy.attackCast?.isSpecial ? now + 650 : 0;
            enemy.attackTimer = 0;
        }
        enemy.attackCast = null;
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
    }

export function attackCancelPending(env, attack, now) {
        if (attack.delivery !== 'patternArea') return false;
        const cc = attackControls(attack.source);
        const interrupted = Number.isFinite(attack.source.castInterruptedAt) && attack.source.castInterruptedAt >= attack.castStartAt;
        if (!cc.hard && !cc.silence && !interrupted && attack.source.hp > 0) return false;
        env.deps.bossMoves.cancelShift(attack.source);
        attack.source.castInterruptedUntil = attack.bossPattern.isSpecial !== false ? now + 650 : 0;
        attack.source.attackTimer = 0;
        attack.source.attackCast = null;
        return true;
    }

export function attackReady(enemy, now, target) {
        if (!enemy.attackCastMs || enemy.isBoss) return true;
        if (!enemy.attackCast && enemy.attackTimer >= 1) {
            enemy.attackCast = {startAt:now, finishAt:now+enemy.attackCastMs,
                isSpecial:enemy.attackCastSpecial === true,
                targetCell:{gx:target.gx,gy:target.gy}};
        }
        return !!enemy.attackCast && now >= enemy.attackCast.finishAt;
    }
