/** XP costs read only the shared progression table. Preserve flooring at each original boundary. */
export function playerExperienceRequired(level, rules) {
    const lv = Math.max(1, Math.floor(level || 1));
    const requirements = rules.playerExperienceRequired;
    const delta = lv - 100;
    const base = lv <= 100 ? requirements[lv - 1]
        : requirements[99] + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
    const premium = rules.playerExperienceDensityPremium;
    const ramp = Math.max(0, Math.min(1, (lv - premium.startLevel) / (premium.fullLevel - premium.startLevel)));
    return Math.floor(base * (1 + premium.increase * ramp));
}

export function gemExperienceRequired(level, rules) {
    return rules.gemExperienceRequired[Math.max(1, Math.min(20, Math.floor(level || 1))) - 1];
}

/** Mutate a normalized record. Nonpositive XP and already capped records are unchanged.
 * Overflow carries until level 20. The caller owns notifications and expert rewards. */
export function gainGemExperience(gem, amount, rules) {
    if (amount <= 0 || gem.level >= 20) return 0;
    const previousLevel = gem.level;
    gem.exp += amount;
    while (gem.level < 20 && gem.exp >= gemExperienceRequired(gem.level, rules)) {
        gem.exp -= gemExperienceRequired(gem.level, rules);
        gem.level++;
    }
    if (gem.level === 20) gem.exp = 0;
    return gem.level - previousLevel;
}
