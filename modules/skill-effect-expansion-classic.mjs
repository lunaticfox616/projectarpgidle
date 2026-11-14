import { createSkillEffectExpansion } from './domain/skill-effect-expansion.mjs';
// Retire these late-bound ports with the application entry and passive/stat-cache owners.
const skillEffectExpansion = createSkillEffectExpansion({
    readRules: () => SKILL_EFFECT_EXPANSION,
    get hasKeystone() { return hasKeystone; },
    invalidateStats: () => playerStatCache.invalidate()
});
safeExposeGlobals({ skillEffectExpansion });
