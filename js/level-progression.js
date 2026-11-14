// GENERATED from modules/level-progression*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/level-progression.mjs
  function createLevelProgression(config, getBases, uniques) {
    const rules = {
      config,
      getBases,
      uniques,
      ordinaryCurrencies: new Set(config.ordinaryCurrencies),
      penaltyDecays: Object.freeze({
        experience: config.experienceDecay,
        gemExperience: config.experienceDecay,
        equipment: config.equipmentLootDecay,
        loot: config.lootDecay
      }),
      penaltyGaps: Object.freeze({ experience: config.experienceGap, gemExperience: config.gemExperienceGap })
    };
    return Object.freeze({
      tierLevel: tierLevel.bind(null, rules),
      areaLevel: areaLevel.bind(null, rules),
      monsterLevel: monsterLevel.bind(null, rules),
      itemLevel: itemLevel.bind(null, rules),
      monsterExperience: monsterExperience.bind(null, rules),
      penalty: penalty.bind(null, rules),
      rewardMultiplier: rewardMultiplier.bind(null, rules),
      loopExperienceMultiplier: loopExperienceMultiplier.bind(null, rules),
      filterCurrencyDrops: filterCurrencyDrops.bind(null, rules),
      requirements: requirements.bind(null, rules),
      stampItem: stampItem.bind(null, rules),
      affixCap: affixCap.bind(null, rules),
      combatZone: combatZone.bind(null, rules),
      maxDropTier: (level) => Math.max(1, Math.floor(interpolate(rules, level, true)))
    });
  }
  function interpolate(rules, value, reverse = false) {
    const points = rules.config.tierAnchors;
    const x = Number(reverse), y = 1 - x;
    let right = points.findIndex((point) => point[x] >= value);
    if (right === 0) return points[0][y];
    if (right < 0) right = points.length - 1;
    const a = points[right - 1], b = points[right];
    return a[y] + (value - a[x]) * (b[y] - a[y]) / (b[x] - a[x]);
  }
  function tierLevel(rules, tier) {
    return Math.max(1, Math.round(interpolate(rules, Math.max(1, Number(tier) || 1))));
  }
  function areaLevel(rules, zone) {
    return Math.max(1, Math.floor(Number(zone?.areaLevel) || tierLevel(rules, zone?.tier)));
  }
  var MONSTER_RANK_LEVEL = Object.freeze({ boss: 2, elite: 1 });
  function rankOf(enemy) {
    if (enemy.isBoss || enemy.boss) return "boss";
    return enemy.isElite || enemy.elite ? "elite" : null;
  }
  function monsterLevel(rules, zone, enemy = {}) {
    if (Number.isFinite(enemy.level) && enemy.level > 0) return Math.floor(enemy.level);
    return areaLevel(rules, zone) + (MONSTER_RANK_LEVEL[rankOf(enemy)] || 0);
  }
  function itemLevel(rules, zone, enemy = {}, random = Math.random) {
    const rank = rankOf(enemy), range = rank && rules.config.itemLevelBonus[rank];
    if (!range) return monsterLevel(rules, zone, enemy);
    const bonus = range[0] + Math.floor(random() * (range[1] - range[0] + 1));
    return Math.max(1, monsterLevel(rules, zone, enemy) - MONSTER_RANK_LEVEL[rank] + bonus);
  }
  function monsterExperience(rules, level) {
    const rewards = rules.config.monsterExperience;
    const index = Math.max(0, Math.floor(level) - 1);
    if (index < rewards.length) return rewards[index];
    return rewards[rewards.length - 1] + (index - rewards.length + 1) * rules.config.monsterExperienceOverflowStep;
  }
  function penalty(rules, playerLevel, enemyLevel, kind) {
    const free = rules.penaltyGaps[kind] ?? rules.config.lootGap;
    const decay = rules.penaltyDecays[kind] ?? rules.penaltyDecays.loot;
    return Math.exp(-Math.max(0, playerLevel - enemyLevel - free) * decay);
  }
  function rewardMultiplier(rules, zone, enemy, playerLevel, kind = "loot") {
    return penalty(rules, playerLevel, monsterLevel(rules, zone, enemy), kind);
  }
  function loopExperienceMultiplier(rules, season, playerLevel, enemyLevel) {
    const config = rules.config;
    const bonus = Math.min(config.loopExperienceBonusCap, Math.max(0, season - 1) * config.loopExperiencePerLoop);
    const gap = playerLevel - enemyLevel;
    const acceleration = Math.max(0, Math.min(1, (config.lootGap - gap) / (config.lootGap - config.experienceGap)));
    return config.loopExperienceBase + bonus * acceleration;
  }
  function filterCurrencyDrops(rules, drops, multiplier) {
    if (multiplier >= 1) return drops;
    return drops.filter(([key]) => !rules.ordinaryCurrencies.has(key) || Math.random() < multiplier);
  }
  function baseFor(rules, item) {
    const bases = rules.getBases();
    return bases.find((base) => base.id === item.baseId) || bases.find((base) => base.slot === item.slot && base.name === item.baseName);
  }
  function attributeWeights(base) {
    if (base.slot === "무기") return base.requirementWeights;
    if (["반지", "목걸이", "허리띠"].includes(base.slot)) return {};
    const defenses = { armor: "strength", evasion: "dexterity", energyShield: "intelligence" };
    const types = base.baseStats.filter((stat) => defenses[stat.id]).map((stat) => defenses[stat.id]);
    return Object.fromEntries(types.map((type) => [type, 1 / Math.sqrt(types.length)]));
  }
  function requirements(rules, item) {
    const unique = item.rarity === "unique" && rules.uniques[item.name];
    const base = baseFor(rules, item);
    if (unique && (!base || base.id === unique.baseId)) return { level: unique.level, attributes: { ...unique.attributes } };
    const req = base ? baseRequirements(rules, base) : { level: 1, attributes: {} };
    if (!unique) return req;
    const keys = /* @__PURE__ */ new Set([...Object.keys(req.attributes), ...Object.keys(unique.attributes)]);
    return { level: Math.max(req.level, unique.level), attributes: Object.fromEntries([...keys].map((key) => [key, Math.max(req.attributes[key] || 0, unique.attributes[key] || 0)])) };
  }
  function baseRequirements(rules, base) {
    const config = rules.config;
    const tier = Math.max(1, Math.min(config.attributeRequirements.length, base.reqTier));
    const value = config.attributeRequirements[tier - 1];
    return {
      level: Math.max(1, tierLevel(rules, base.reqTier) - config.equipmentLevelDiscount),
      attributes: Object.fromEntries(Object.entries(attributeWeights(base)).map(([key, weight]) => [key, Math.round(value * weight)]))
    };
  }
  function stampItem(rules, item, monsterLv) {
    if (!item) return item;
    const sourceTier = item.hiddenTier || item.itemTier || 1;
    const level = [monsterLv, item.itemLevel, tierLevel(rules, sourceTier), 1].map(Number).find((value) => Number.isFinite(value) && value > 0);
    item.itemLevel = Math.max(1, Math.floor(level));
    item.requirementsVersion = 1;
    return item;
  }
  function affixCap(rules, level) {
    return Math.max(1, Math.min(20, Math.floor(interpolate(rules, level, true))));
  }
  function combatZone(rules, zone) {
    return Number.isFinite(zone.areaLevel) && !Number.isFinite(zone.tier) ? { ...zone, tier: interpolate(rules, zone.areaLevel, true) } : zone;
  }

  // modules/domain/experience.mjs
  function playerExperienceRequired(level, rules) {
    const lv = Math.max(1, Math.floor(level || 1));
    const requirements2 = rules.playerExperienceRequired;
    const delta = lv - 100;
    const base = lv <= 100 ? requirements2[lv - 1] : requirements2[99] + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
    const premium = rules.playerExperienceDensityPremium;
    const ramp = Math.max(0, Math.min(1, (lv - premium.startLevel) / (premium.fullLevel - premium.startLevel)));
    return Math.floor(base * (1 + premium.increase * ramp));
  }
  function gemExperienceRequired(level, rules) {
    return rules.gemExperienceRequired[Math.max(1, Math.min(20, Math.floor(level || 1))) - 1];
  }
  function gainGemExperience(gem, amount, rules) {
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

  // modules/level-progression-classic.mjs
  var levelProgression = createLevelProgression(LEVEL_PROGRESSION, () => BASE_ITEM_DB, UNIQUE_EQUIPMENT_RULES);
  var getExpReq = (level) => playerExperienceRequired(level, LEVEL_PROGRESSION);
  var getGemReqExp = (level) => gemExperienceRequired(level, LEVEL_PROGRESSION);
  var gainGemExperience2 = (gem, amount) => gainGemExperience(gem, amount, LEVEL_PROGRESSION);
  safeExposeGlobals({ levelProgression, getExpReq, getGemReqExp, gainGemExperience: gainGemExperience2 });
})();
