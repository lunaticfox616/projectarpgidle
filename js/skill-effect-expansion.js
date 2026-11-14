// GENERATED from modules/skill-effect-expansion*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/skill-effect-expansion.mjs
  function effectExpansionKind(name, rules) {
    return Object.hasOwn(rules.kinds, name) ? rules.kinds[name] : null;
  }
  function effectExpansionPotionNode(skill, hasKeystone2) {
    return hasKeystone2("bm1") && Array.isArray(skill.tags) && skill.tags.includes("potion") ? 1 : 0;
  }
  function effectExpansionApply(skill, name, level, ports) {
    const rules = ports.readRules();
    const kind = skill.supportEffects?.spreadRadius ? "radius" : effectExpansionKind(name, rules);
    const n = kind ? Math.min(rules.max, Math.max(level, skill.supportExpansion || 0, effectExpansionPotionNode(skill, ports.hasKeystone))) : 0;
    skill.effectExpansion = n;
    skill.effectExpansionKind = kind;
    skill.effectExpansionFromSupport = n > 0 && level < n;
    effectExpansionApplyGrowth(skill, kind, n, rules);
    return skill;
  }
  function effectExpansionApplyGrowth(skill, kind, n, rules) {
    if (kind === "targets" && n) skill.targets = Math.max(1, Math.floor(skill.targets || 1)) + n;
    if (n >= rules.penaltyFrom) skill.dmg = (skill.dmg || skill.baseDmg || 1) * (1 - rules.damagePenaltyPct / 100);
  }
  function effectExpansionExtra(skill) {
    return Number(skill && skill.effectExpansion) || 0;
  }
  function effectExpansionWidened(profile, n) {
    const radius = (profile.radius || 0) + n;
    return { ...profile, radius, range: profile.kind === "nova" ? Math.max(profile.range || 0, radius) : profile.range };
  }
  function effectExpansionGrid(profile, skill) {
    const n = effectExpansionExtra(skill), kind = skill && skill.effectExpansionKind;
    if (!n || !profile) return profile;
    if (kind === "radius" || kind === "lance") return effectExpansionWidened(profile, n);
    return kind === "cone" || kind === "range" ? { ...profile, range: (profile.range || 0) + n } : profile;
  }
  function effectExpansionStageGrid(own, skill) {
    const n = effectExpansionExtra(skill), kind = skill && skill.effectExpansionKind;
    if (!n || !own) return own;
    if (kind === "radius" && own.radius > 0) return { ...own, radius: own.radius + n };
    return kind === "cone" && own.range > 0 ? { ...own, range: own.range + n } : own;
  }
  function createSkillEffectExpansion(ports) {
    let testLevel = 0;
    return Object.freeze({
      level() {
        return testLevel;
      },
      /* @dev-only */
      setTestLevel(n) {
        testLevel = Math.max(0, Math.min(ports.readRules().max, Math.floor(Number(n) || 0)));
        ports.invalidateStats();
        return testLevel;
      },
      /* @end-dev-only */
      kindOf(name) {
        return effectExpansionKind(name, ports.readRules());
      },
      applyToSkill(skill, name) {
        return effectExpansionApply(skill, name, testLevel, ports);
      },
      extra: effectExpansionExtra,
      grid: effectExpansionGrid,
      stageGrid: effectExpansionStageGrid
    });
  }

  // modules/skill-effect-expansion-classic.mjs
  var skillEffectExpansion = createSkillEffectExpansion({
    readRules: () => SKILL_EFFECT_EXPANSION,
    get hasKeystone() {
      return hasKeystone;
    },
    invalidateStats: () => playerStatCache.invalidate()
  });
  safeExposeGlobals({ skillEffectExpansion });
})();
