/** Mutate one enemy's shield and life. No death, reward or presentation effects.
 * @returns {number|null} Actual absorbed damage; null means no eligible input (skip damage incidents).
 * Zero remains a processed hit, even when the victim has no resource left. */
export function damageEnemyResource(enemy, damage) {
    let remaining = Math.max(0, Math.floor(Number(damage) || 0));
    if (!enemy || remaining <= 0) return null;
    let dealt = 0;
    if ((enemy.energyShield || 0) > 0) {
        const absorbed = Math.min(Math.max(0, Math.floor(enemy.energyShield || 0)), remaining);
        enemy.energyShield = Math.max(0, Math.floor(enemy.energyShield || 0) - absorbed);
        remaining -= absorbed;
        dealt += absorbed;
    }
    if (remaining > 0) {
        const beforeHp = Math.max(0, Math.floor(enemy.hp || 0));
        enemy.hp = Math.max(0, beforeHp - remaining);
        dealt += Math.max(0, beforeHp - enemy.hp);
    }
    return dealt;
}

/** Executions consume both remaining resources; resource damage always consumes shield first. */
export function enemyLifeAndShield(enemy) {
    return Math.max(0, Number(enemy.hp) || 0) + Math.max(0, Number(enemy.energyShield) || 0);
}

export function enemyLifeDamagePct(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    return Math.max(0, Math.min(100, (1 - (Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1))) * 100));
}
