// GENERATED from modules/gem-progression*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/gem-records.mjs
  function normalizeGemCoreFailures(value, level, rules) {
    const most = Math.ceil(rules.pityMaxOfBase / rules.pityStepOfBase);
    return level === rules.maxLevel || !Number.isFinite(value) ? 0 : Math.min(most, Math.max(0, Math.floor(value)));
  }
  function normalizeRuneEnhanceLevel(raw, rules) {
    const old = (key) => Number.isFinite(raw[key]) ? Math.min(5, Math.max(0, Math.floor(raw[key]))) : 0;
    const level = Number.isFinite(raw.enhanceLevel) ? Math.floor(raw.enhanceLevel) : old("bossCoreLevel") + old("skyCoreLevel");
    return Math.min(rules.maxLevel, Math.max(0, level));
  }
  function normalizeGemRecord(raw, rules) {
    if (!raw || typeof raw !== "object") return { level: 1, exp: 0, enhanceLevel: 0, enhanceFailures: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1, quality: 0, awakened: false };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    const enhanceLevel = normalizeRuneEnhanceLevel(raw, rules);
    const enhanceFailures = normalizeGemCoreFailures(raw.enhanceFailures, enhanceLevel, rules);
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    let quality = Number.isFinite(raw.quality) ? Math.max(0, Math.min(20, Math.floor(raw.quality))) : 0;
    let awakened = !!raw.awakened;
    return { level, exp, enhanceLevel, enhanceFailures, skyEnhanceCap, unlockedTier, activeTier, quality, awakened };
  }

  // modules/domain/gem-growth.mjs
  function getGemHighLevelGrowth(value, level19Value) {
    return value + Math.max(0, value - level19Value) * 0.1;
  }
  function getGemLevelGrowthSteps(level, offset = 1) {
    return getGemHighLevelGrowth(Math.max(0, level - offset), Math.max(0, 19 - offset));
  }
  function getGemSpellBaseDamage(skill, level) {
    const base = skill.spellFlatBase || 0, scale = skill.spellFlatScale || 0;
    const logarithmicGrowth = getGemHighLevelGrowth(Math.log2(Math.max(1, level)) ** 2, Math.log2(19) ** 2);
    return (base * 3 + getGemLevelGrowthSteps(level) * scale + base * 0.8 * logarithmicGrowth) * getGemSpellEarlyMultiplier(skill, level);
  }
  function getGemSpellEarlyMultiplier(skill, level) {
    const start = Number(skill.spellEarlyMul), until = Number(skill.spellEarlyUntil);
    if (!(start > 0 && start < 1 && until > 1)) return 1;
    return start + (1 - start) * Math.min(1, Math.max(0, (level - 1) / (until - 1)));
  }

  // modules/domain/rune-requirements.mjs
  var getRuneLevelReq = (name, support, tables) => (support ? tables.supports : tables.skills)[name] || 0;
  function getRuneLevelNote(name, support, state, tables, translate) {
    const need = getRuneLevelReq(name, support, tables);
    return need > (state.level || 1) ? translate("Lv.{need} 필요", { need }) : "";
  }

  // modules/gem-progression-classic.mjs
  var requirements = { get skills() {
    return SKILL_RUNE_LEVEL_REQ;
  }, get supports() {
    return SUPPORT_RUNE_LEVEL_REQ;
  } };
  var normalizeGemRecord2 = (raw) => normalizeGemRecord(raw, GEM_CORE_FORGE);
  var getRuneLevelReq2 = (name, support = false) => getRuneLevelReq(name, support, requirements);
  var getRuneLevelNote2 = (name, support = false, state = game) => getRuneLevelNote(name, support, state, requirements, _t);
  safeExposeGlobals({ normalizeGemRecord: normalizeGemRecord2, getGemHighLevelGrowth, getGemLevelGrowthSteps, getGemSpellBaseDamage, getRuneLevelReq: getRuneLevelReq2, getRuneLevelNote: getRuneLevelNote2 });
})();
