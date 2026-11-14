// Growth beyond level 19 gains ten percent; early-spell scaling retains the original curve.
export function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
}

/** Growth steps, not displayed gem level. Offset supports delayed cap growth. */
export function getGemLevelGrowthSteps(level, offset = 1) {
    return getGemHighLevelGrowth(Math.max(0, level - offset), Math.max(0, 19 - offset));
}

/** Skill-owned flat damage only; equipment damage belongs to the stat pipeline. */
export function getGemSpellBaseDamage(skill, level) {
    const base = skill.spellFlatBase || 0, scale = skill.spellFlatScale || 0;
    const logarithmicGrowth = getGemHighLevelGrowth(Math.log2(Math.max(1, level)) ** 2, Math.log2(19) ** 2);
    return (base * 3 + getGemLevelGrowthSteps(level) * scale + base * 0.8 * logarithmicGrowth) * getGemSpellEarlyMultiplier(skill, level);
}

/** Early-spell reduction reaches the full curve at spellEarlyUntil. */
function getGemSpellEarlyMultiplier(skill, level) {
    const start = Number(skill.spellEarlyMul), until = Number(skill.spellEarlyUntil);
    if (!(start > 0 && start < 1 && until > 1)) return 1;
    return start + (1 - start) * Math.min(1, Math.max(0, (level - 1) / (until - 1)));
}
