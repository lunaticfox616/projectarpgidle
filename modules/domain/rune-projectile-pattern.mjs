import { runeFlowGetSkyEnhancementForSkill } from './rune-engrave-slots.mjs';

export function runeFlowGetSkyProjectilePatternMode(env, owner, skillName) {
    let id = runeFlowGetSkyEnhancementForSkill(env, owner, skillName).find(enhanceId => env.deps.GEM_SKY_ENHANCEMENTS[enhanceId].projectilePatternMode);
    return id ? env.deps.GEM_SKY_ENHANCEMENTS[id].projectilePatternMode : null;
}

export function runeFlowIsSkyEnhancementCompatibleWithSkill(env, enhanceId, skillName) {
    let enhancement = env.deps.GEM_SKY_ENHANCEMENTS[enhanceId];
    if (enhancement?.projectilePatternMode && env.deps.SKILL_DB[skillName]?.projectilePattern?.fixed) return false;
    if (!enhancement || !enhancement.requiredTag) return !!enhancement;
    let tags = (env.deps.SKILL_DB[skillName] && env.deps.SKILL_DB[skillName].tags) || [];
    return tags.includes(enhancement.requiredTag);
}

export function runeFlowApplyProjectilePatternMode(env, skill, mode, source, damageMultiplierOverride) {
    let config = env.deps.PROJECTILE_PATTERN_MODE_DB[mode];
    if (!runeFlowCanChangeProjectilePattern(skill, config)) return skill;
    let hasDamageMultiplierOverride = damageMultiplierOverride !== null
        && damageMultiplierOverride !== undefined
        && Number.isFinite(Number(damageMultiplierOverride));
    let damageMultiplier = hasDamageMultiplierOverride
        ? Number(damageMultiplierOverride)
        : config.damageMultiplier;
    let next = { ...skill, projectilePattern: { mode, kind: config.kind }, projectilePatternSource: source || '효과', projectilePatternDamageMultiplier: damageMultiplier };
    applyRuneProjectileOptions(next, config);
    if (Number.isFinite(next.dmg) && Number.isFinite(damageMultiplier)) next.dmg *= damageMultiplier;
    return next;
}

export function runeFlowCanChangeProjectilePattern(skill, config) {
    return !!config?.kind && !!skill?.tags?.includes('projectile') && !skill.projectilePattern?.fixed;
}

function applyRuneProjectileOptions(next, config) {
    if (config.rays) Object.assign(next.projectilePattern, { rays: config.rays, spreadDeg: config.spreadDeg });
    if (config.targetMode) next.targetMode = config.targetMode;
    if (config.targetLimit) next.targets = config.targetLimit;
    if (config.minTargets) next.targets = Math.max(config.minTargets, Number(next.targets) || 1);
    if (config.extraProjectileDamagePct) next.extraProjectileDamagePct = config.extraProjectileDamagePct;
    if (next.combatPattern && next.combatPattern.kind === 'boomerang') delete next.combatPattern;
    if (config.combatPattern) next.combatPattern = { ...config.combatPattern };
}
