import { hashSeed } from '../common/numbers.mjs';
import { SHAPE_REST, SPECIAL_ODDS, PITY } from './boss-pattern-values.mjs';

export function bossRollShare(enemy, attackNumber, salt) { return (hashSeed(`${enemy.id}|${attackNumber}|${salt}`) >>> 0) / 4294967296; }

export function bossPickSpecialShape(enemy, attackNumber, count) {
        const used = enemy.specialShapeUsedAt || {}, rested = [];
        for (let index = 0; index < count; index++) if (!(attackNumber - (used[index] ?? -99) <= SHAPE_REST)) rested.push(index);
        const pool = rested.length ? rested : [[...Array(count).keys()].sort((a, b) => (used[a] ?? -99) - (used[b] ?? -99))[0]];
        return pool[Math.floor(bossRollShare(enemy, attackNumber, 'shape') * pool.length)];
    }

/** The chance an attack is a special: SPECIAL_ODDS.full at full life, SPECIAL_ODDS.empty at none, in a line between. */
    export function bossSpecialOdds(enemy) {
        const share = Math.max(0, Math.min(1, (Number(enemy.hp) || 0) / Math.max(1, Number(enemy.maxHp) || 1)));
        return SPECIAL_ODDS.empty + (SPECIAL_ODDS.full - SPECIAL_ODDS.empty) * share;
    }

/** @returns {{attackNumber:number, special:boolean, shape:number}} shape: the special's index among the boss's shapes (-1 when not special). */
    export function bossPlanBossSpecial(enemy, attackNumber, shapeCount) {
        const kept = enemy.specialPlan;
        if (kept && kept.attackNumber === attackNumber) return kept;
        const last = Number(enemy.lastSpecialAttack) || 0, resting = attackNumber < 2 || (last > 0 && attackNumber - last <= 1);
        const special = !resting && (attackNumber - last > PITY || bossRollShare(enemy, attackNumber, 'special') < bossSpecialOdds(enemy));
        enemy.specialPlan = { attackNumber, special, shape: special ? bossPickSpecialShape(enemy, attackNumber, Math.max(1, shapeCount)) : -1 };
        return enemy.specialPlan;
    }

/** The special just used: no special on the next attack, and its shape rests SHAPE_REST attacks. */
    export function bossNoteBossSpecial(enemy, state) {
        if (!state.isSpecial || !Number.isFinite(state.shapeIndex)) return;
        enemy.lastSpecialAttack = state.attackNumber;
        if (state.shapeIndex >= 0) enemy.specialShapeUsedAt = { ...(enemy.specialShapeUsedAt || {}), [state.shapeIndex]: state.attackNumber };
    }

export function bossStyleSpecialPlan(env, enemy, attackNumber, family) {
        const shapes = env.deps.bossMoves.familyShapes(enemy, family), plan = bossPlanBossSpecial(enemy, attackNumber, shapes.length);
        return plan.special ? { ...plan, ...env.deps.bossMoves.shapeLook(enemy, shapes[plan.shape]) } : plan;
    }
