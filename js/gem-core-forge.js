// GENERATED from modules/gem-core-forge*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/gem-forge-values.mjs
  var roundForgeValue = (value) => Math.round(value * 100) / 100;
  function forgeRuneEffects(rules, record) {
    const level = Math.min(rules.maxLevel, Math.max(0, Math.floor(Number(record?.enhanceLevel) || 0)));
    const reached = (table) => table.reduce((total, [at, value]) => level >= at ? value : total, 0);
    return {
      damage: 1 + reached(rules.damageMoreAt) / 100,
      speed: 1 + reached(rules.speedMoreAt) / 100,
      damageInc: rules.damageIncPct[level],
      speedInc: reached(rules.speedIncAt),
      levels: rules.runeLevelAt.filter((at) => level >= at).length
    };
  }
  function forgeRuneTier(rules, level) {
    return rules.tiers.filter((at) => level >= at).length;
  }
  function forgeRuneEffectText(rules, translate, level) {
    if (level <= 0) return "강화 효과 없음";
    const { damage, speed, damageInc, speedInc, levels } = forgeRuneEffects(rules, { enhanceLevel: level });
    const percent = (mul) => Math.round((mul - 1) * 100);
    return [
      translate("피해 {damageInc}% 증가", { damageInc }),
      speedInc ? translate("공격/시전 속도 {speedInc}% 증가", { speedInc }) : "",
      damage > 1 ? translate("피해 {damage}% 증폭", { damage: percent(damage) }) : "",
      speed > 1 ? translate("공격/시전 속도 {speed}% 증폭", { speed: percent(speed) }) : "",
      levels ? translate("룬 레벨 +{levels}", { levels }) : ""
    ].filter(Boolean).join(", ");
  }
  function forgePity(rules, level, failures) {
    return Math.min(failures * rules.pityStepOfBase, rules.pityMaxOfBase) * rules.successPct[level];
  }
  function forgeRuneOdds(rules, { level, failures, coresUsed, timed }) {
    const pityBonus = roundForgeValue(forgePity(rules, level, failures)), coreBonus = coresUsed * rules.boosterPct;
    const before = Math.min(100, rules.successPct[level] + pityBonus + coreBonus);
    const chance = roundForgeValue(Math.min(100, before * (timed ? rules.timing.mul : 1)));
    return {
      pityBonus,
      coreBonus,
      timingBonus: roundForgeValue(chance - before),
      chance,
      destroy: roundForgeValue(Math.min(rules.destroyPct[level], 100 - chance)),
      nextPityGain: roundForgeValue(Math.min(100 - chance, forgePity(rules, level, failures + 1) - forgePity(rules, level, failures)))
    };
  }
  var FINISHED_FORGE_ODDS = Object.freeze({ pityBonus: 0, coreBonus: 0, timingBonus: 0, chance: 100, destroy: 0, nextPityGain: 0 });

  // modules/domain/gem-core-forge.mjs
  var heldForgeCurrency = (owner, key) => Math.max(0, Math.floor(Number(owner.currencies[key]) || 0));
  function forgeUnavailable(env, owner, name, { done, owned, cost }) {
    if (owner.season < 2 || !env.deps.isUnlocked("gemForge", owner)) return "룬 강화를 먼저 해금하세요.";
    if (owner.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 룬을 강화할 수 없습니다.";
    if (!env.deps.enhanceableNames(owner).includes(name) || !owner.gemData[name]) return "강화할 공격 룬을 먼저 장착하세요.";
    if (done) return "최대 강화";
    return owned < cost ? "재료 부족" : "";
  }
  function inspectRuneForge(env, owner, name, { cores = 0, timed = false } = {}) {
    const rules = env.rules, gem = env.deps.normalizeGem(owner.gemData[name]);
    const level = gem.enhanceLevel, failures = gem.enhanceFailures, done = level >= rules.maxLevel;
    const owned = heldForgeCurrency(owner, rules.materialKey), coresOwned = heldForgeCurrency(owner, rules.boosterKey);
    const cost = done ? 0 : rules.costs[level];
    const coresUsed = done ? 0 : Math.max(0, Math.min(rules.boosterMax, coresOwned, Math.floor(cores)));
    const odds = done ? FINISHED_FORGE_ODDS : forgeRuneOdds(rules, { level, failures, coresUsed, timed });
    return {
      name,
      level,
      failures,
      owned,
      cost,
      coresOwned,
      coresUsed,
      done,
      spares: env.deps.spareCount(owner, name),
      ...odds,
      error: forgeUnavailable(env, owner, name, { done, owned, cost })
    };
  }
  function removeShatteredRune(env, owner, name) {
    owner.skills = owner.skills.filter((gem) => gem !== name);
    if (owner.activeSkill === name) owner.activeSkill = "기본 공격";
    if (owner.weaponBlockedSkill === name) owner.weaponBlockedSkill = "";
    if (owner.mobilitySkill === name) {
      owner.mobilitySkill = "";
      env.deps.resetMobility();
    }
    owner.equippedSummonSkills = (owner.equippedSummonSkills || []).filter((gem) => gem !== name);
    if (owner.summonSkillCounts) delete owner.summonSkillCounts[name];
  }
  function shatterForgedRune(env, owner, name) {
    owner.gemData[name] = { ...env.deps.normalizeGem(owner.gemData[name]), enhanceLevel: 0, enhanceFailures: 0 };
    if (env.deps.takeSpare(owner, name)) return false;
    removeShatteredRune(env, owner, name);
    return true;
  }
  function attemptRuneForge(env, owner, name, options) {
    const before = inspectRuneForge(env, owner, name, options);
    if (before.error) return { ...before, status: "blocked" };
    owner.currencies[env.rules.materialKey] -= before.cost;
    owner.currencies[env.rules.boosterKey] -= before.coresUsed;
    const roll = Math.random() * 100;
    if (roll >= before.chance && roll < before.chance + before.destroy) return { ...before, status: "destroyed", lost: shatterForgedRune(env, owner, name) };
    const success = roll < before.chance;
    owner.gemData[name] = { ...env.deps.normalizeGem(owner.gemData[name]), enhanceLevel: before.level + Number(success), enhanceFailures: success ? 0 : before.failures + 1 };
    return { ...before, status: success ? "success" : "failure" };
  }

  // modules/gem-core-forge-classic.mjs
  var forgeEnv = { rules: GEM_CORE_FORGE, deps: {
    isUnlocked: (id, owner) => contentProgression.isUnlocked(id, owner),
    enhanceableNames: (owner) => getEquippedEnhanceableGemNames(owner),
    normalizeGem: (record) => normalizeGemRecord(record),
    spareCount: (owner, name) => gemDropRewards.spareCount(owner, name),
    takeSpare: (owner, name) => gemDropRewards.takeSpare(owner, name),
    resetMobility: () => mobilitySkill.reset()
  } };
  var gemCoreForge = Object.freeze({
    effects: (record) => forgeRuneEffects(forgeEnv.rules, record),
    forSkill: (name) => forgeRuneEffects(forgeEnv.rules, game.gemData[name]),
    tierOf: (level) => forgeRuneTier(forgeEnv.rules, level),
    effectText: (level) => forgeRuneEffectText(forgeEnv.rules, _t, level),
    inspect: (name, options) => inspectRuneForge(forgeEnv, game, name, options),
    attempt: (name, options) => attemptRuneForge(forgeEnv, game, name, options)
  });
  safeExposeGlobals({ gemCoreForge });
})();
