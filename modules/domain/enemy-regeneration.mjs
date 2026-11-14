// Enemy regenRate is a life fraction per 100ms step, not per second.
// 2026-10-04: sustained damage exhausts regen in 60s; quiet intervals reset fatigue. Woodsman is exempt.
// 2026-10-18: apex finishers extend the quiet window so dodging a long warning does not restore full regen.
export const ENEMY_REGEN_COMBAT_WINDOW_MS = 2000, ENEMY_REGEN_FATIGUE_MS = 60000, ENEMY_REGEN_STEP_MS = 100;
export const regenFatigueFactor = fatigueMs => Math.max(0, 1 - Math.max(0, fatigueMs) / ENEMY_REGEN_FATIGUE_MS);

export function takeEnemyRegenAmount(enemy, rawRegen) {
    let wholeRegen = Math.floor(Math.max(0, rawRegen));
    const fractionalRegen = Math.max(0, rawRegen) - wholeRegen;
    enemy.regenBank = Math.max(0, Number(enemy.regenBank) || 0);
    if (fractionalRegen > 0) enemy.regenBank = Math.round((enemy.regenBank + Math.max(0.1, Math.round(fractionalRegen * 10) / 10)) * 10) / 10;
    if (enemy.regenBank >= 1) {
        wholeRegen += Math.floor(enemy.regenBank);
        enemy.regenBank = Math.round((enemy.regenBank - Math.floor(enemy.regenBank)) * 10) / 10;
    }
    return wholeRegen;
}

export function tireEnemyRegen(enemy, now, finisherWarningMs) {
    if (enemy.isWoodsman) return 1;
    const mark = Number(enemy.regenHpMark);
    if (Number.isFinite(mark) && enemy.hp < mark) enemy.regenLastLossAt = now;
    const calm = ENEMY_REGEN_COMBAT_WINDOW_MS + (enemy.patternMode === 'apex' ? finisherWarningMs : 0);
    const fighting = now - (Number(enemy.regenLastLossAt) || -Infinity) < calm;
    enemy.regenFatigueMs = fighting ? Math.min(ENEMY_REGEN_FATIGUE_MS, (Number(enemy.regenFatigueMs) || 0) + ENEMY_REGEN_STEP_MS) : 0;
    return regenFatigueFactor(enemy.regenFatigueMs);
}

function regenRate(enemy, stats, inputs) {
    const suppress = Math.max(0, Math.min(95, enemy.regenSuppressPct || 0));
    const curse = inputs.conditionDebuffs(enemy);
    const unique = stats?.uniqueEnemyRegenCutAndMinRoll ? Math.max(0, Number(stats.uniqueEnemyRegenCutAndMinRoll.enemyRegenRateMul || 1)) : 1;
    const talent = inputs.talentMultiplier(enemy);
    return Math.max(0, enemy.regenRate * (1 - suppress / 100) * (curse.enemyRegenRateMul || 1) * unique * talent);
}

/** Clock and lower-level condition rules are explicit inputs. No game singleton or UI effects.
 * Conditions are evaluated only while healing can occur; the fatigue mark updates even at full life. */
export function createEnemyRegeneration(inputs) {
    return (enemy, stats) => {
        const maxHp = Math.max(1, enemy.maxHp || enemy.hp || 1);
        const fatigue = tireEnemyRegen(enemy, inputs.clock(), inputs.finisherWarningMs);
        if ((enemy.regenRate || 0) > 0 && enemy.hp < maxHp && fatigue > 0) {
            const whole = takeEnemyRegenAmount(enemy, maxHp * regenRate(enemy, stats, inputs) * fatigue);
            if (whole > 0) enemy.hp = Math.min(maxHp, enemy.hp + whole);
        }
        enemy.regenHpMark = enemy.hp;
    };
}
