// GENERATED from modules/loot*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/numbers.mjs
  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function getAdditiveDropBonusMultiplier(codexBonusPct, challengeBonusPct) {
    let codexRatio = Math.max(0, Number(codexBonusPct) || 0) / 100;
    let challengeRatio = Math.max(0, Number(challengeBonusPct) || 0) / 100;
    return 1 + codexRatio + challengeRatio;
  }

  // modules/domain/loot-rules.mjs
  var LootRules = class {
    constructor(tables2, deps2) {
      this.tables = tables2;
      this.deps = deps2;
      this.codexKeys = new Set(tables2.UNIQUE_DB.filter((entry) => !entry.realmCodexOnly).map((entry) => `${entry.slots[0]}|${entry.name}`));
    }
    getCodexBonusPct(state) {
      if (!this.deps.isUnlocked("codex", state)) return 0;
      return this.getCodexBonusPctFromCount(this.getUniqueCodexProgress(state).stored);
    }
    getUniqueCodexProgress(state) {
      let codex = state.uniqueCodex && typeof state.uniqueCodex === "object" ? state.uniqueCodex : {};
      let stored = Object.keys(codex).filter((key) => !!codex[key] && this.codexKeys.has(key)).length;
      return { stored, total: this.codexKeys.size };
    }
    claimCodexCompletion(state) {
      const progress = this.getUniqueCodexProgress(state);
      if (progress.total <= 0 || progress.stored < progress.total || state.uniqueCodexCompletedRewardClaimed) return false;
      state.uniqueCodexCompletedRewardClaimed = true;
      return true;
    }
    /** Called once by loop settlement, after the carried inventory has been restored. */
    grantCodexStarter(state) {
      if (!state.uniqueCodexCompletedRewardClaimed) return null;
      const pool = this.tables.UNIQUE_DB.filter((entry) => (entry.reqTier || 1) <= 1 && !entry.ultraRare && !entry.dropOnly);
      if (!pool.length) return null;
      const pick = this.deps.rndChoice(pool);
      const item = this.deps.generateUniqueItem(1, null, pick.name, {});
      if (!this.deps.canStoreEquipmentItems([item], state)) return null;
      state.inventory.push(this.deps.normalizeItem(item));
      return { item, pick };
    }
    getCodexBonusPctFromCount(storedCount) {
      let count = Math.max(0, Math.floor(Number(storedCount) || 0));
      let preSoftCap = Math.min(50, count) * 0.2;
      let postSoftCap = Math.max(0, count - 50) * 0.1;
      return preSoftCap + postSoftCap;
    }
    getWildTalismanBaseDropChance(enemy) {
      if (enemy && enemy.isBoss) return this.tables.TALISMAN_WILD_DROPS.chance.boss;
      return enemy && enemy.isElite ? this.tables.TALISMAN_WILD_DROPS.chance.elite : this.tables.TALISMAN_WILD_DROPS.chance.normal;
    }
    getEquipmentBaseDropChance(enemy) {
      if (enemy && enemy.isBoss) return this.tables.EQUIPMENT_BASE_DROP_CHANCES.boss;
      return enemy && enemy.isElite ? this.tables.EQUIPMENT_BASE_DROP_CHANCES.elite : this.tables.EQUIPMENT_BASE_DROP_CHANCES.regular;
    }
    isFirstActBossEquipmentDropThisLoop(state, zone, enemy) {
      if (!zone || zone.type !== "act" || !enemy || !enemy.isBoss) return false;
      return String(zone.id) === String(Math.max(0, Math.floor(Number(state.maxZoneId) || 0)));
    }
    getLabyrinthFossilDropChances(floor, fossilDropMultiplier, fossilRareMultiplier) {
      let currentFloor = Math.max(1, Math.floor(Number(floor) || 1));
      let commonMul = Math.max(0, Number(fossilDropMultiplier) || 0);
      let deepMul = 1 + Math.max(0, currentFloor - this.tables.LABYRINTH_DEEP_FOSSIL.fromFloor) * this.tables.LABYRINTH_DEEP_FOSSIL.abyssalPerFloor;
      let rareMul = Math.max(0, Number(fossilRareMultiplier) || 0) * deepMul;
      return {
        base: 0.5 * commonMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        typed: 0.5 * commonMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        primal: Math.min(0.45, (0.1 + currentFloor * 3e-3) * commonMul) * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        ancient: Math.min(0.14, (0.025 + currentFloor * 1e-3) * commonMul) * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER,
        abyssal: 0.03 * rareMul * this.tables.LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER
      };
    }
    getEnemyLootDropMultiplier(state, zone, enemy) {
      let progression = getAdditiveDropBonusMultiplier(this.getCodexBonusPct(state));
      let raw = progression * this.deps.getAbyssMonsterScales(zone).dropMul * (Number(enemy.dropMul) || 1) * (Number(enemy.greedDropMul) || 1);
      return this.deps.capEndlessContentDropMultiplier(zone, raw) * this.deps.getContentDropRateMultiplier(zone);
    }
    getEquipmentDropChances(state, zone, enemy) {
      let multiplier = this.getEnemyLootDropMultiplier(state, zone, enemy);
      if (zone.type === "labyrinth") {
        let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
        let progress = Math.min(1, Math.max(0, (floor - 30) / 170));
        multiplier *= 1 - 0.7 * progress;
      }
      return {
        equipment: this.isFirstActBossEquipmentDropThisLoop(state, zone, enemy) ? 1 : this.getEquipmentBaseDropChance(enemy) * multiplier * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level, "equipment") * (Number(enemy.equipmentDropMul) || 1),
        talisman: this.getWildTalismanBaseDropChance(enemy) * multiplier * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level)
      };
    }
    rollEquipmentDrop(state, zone, enemy, chance) {
      let rank = enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "regular";
      let progress = state.equipmentDropProgress + this.tables.EQUIPMENT_DROUGHT_RULES.credit[rank] * this.deps.getContentDropRateMultiplier(zone) * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level, "equipment");
      let guaranteed = progress >= this.tables.EQUIPMENT_DROUGHT_RULES.threshold;
      const expected = Math.max(0, Number(chance) || 0), whole = Math.floor(expected);
      const count = Math.max(guaranteed ? 1 : 0, whole + Number(this.deps.random() < expected - whole));
      let minimumRarity = guaranteed ? "rare" : null;
      return { dropped: count > 0, count, guaranteed, minimumRarity, nextProgress: count > 0 ? 0 : progress };
    }
    getEquipmentDropRarity(enemy, roll) {
      let rank = enemy.isBoss ? "boss" : enemy.isElite ? "elite" : "regular";
      let thresholds = this.tables.EQUIPMENT_DROP_RARITY_THRESHOLDS[rank];
      let scaled = roll / Math.max(1, Number(enemy.lootRarityMul) || 1);
      if (scaled < thresholds.unique * Math.max(1, Number(enemy.uniqueChanceMul) || 1)) return "unique";
      return ["rare", "magic"].find((rarity) => scaled < thresholds[rarity]) || "normal";
    }
    generateRealmBossUniqueDrop(state, zone, enemy) {
      const baseChance = enemy.isBoss ? this.tables.REALM_BOSS_UNIQUE_DROP_RULES.chance[zone.type] : 0;
      if (!baseChance) return null;
      const chance = baseChance * this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level);
      if (this.deps.random() >= chance) return null;
      const itemLevel = this.deps.levelProgression.itemLevel(zone, enemy);
      const cap = Math.min(this.deps.getRealmEquipmentHiddenTierCap(zone), this.deps.levelProgression.maxDropTier(itemLevel));
      const eligible = this.tables.UNIQUE_DB.filter((unique) => unique.dropOnly?.type === zone.type && this.deps.uniqueDropsInZone(unique, zone) && cap >= (unique.dropOnly.minTier || unique.reqTier || 1));
      const chase = eligible.filter((unique) => unique.ultraRare);
      const useChase = chase.length > 0 && this.deps.random() < this.tables.REALM_BOSS_UNIQUE_DROP_RULES.ultraRareShare;
      const pool = useChase ? chase : eligible.filter((unique) => !unique.ultraRare);
      if (!pool.length) return null;
      const item = this.deps.generateUniqueItem(cap, null, this.deps.rndChoice(pool).name, zone);
      return this.deps.levelProgression.stampItem(item, itemLevel);
    }
    getMappingTicketDrops(state, enemy, zone, mappingOpened) {
      let drops = [];
      if (!mappingOpened || !zone || ["trial", "seasonBoss"].includes(zone.type)) return drops;
      let contentDropMul = this.deps.getContentDropRateMultiplier(zone);
      const key = this.mappingBossKey(state, enemy, contentDropMul);
      if (key) drops.push([key, 1]);
      if (!this.highTrialUnlocked(state)) return drops;
      let trialKeyChance = enemy.isBoss ? 0.015 : enemy.isElite ? 1e-3 : 0;
      if (trialKeyChance > 0 && this.deps.random() < trialKeyChance) drops.push(["trialKey3", 1]);
      return drops;
    }
    mappingBossKey(state, enemy, multiplier) {
      if ((state.season || 1) < 2) return null;
      const keys = ["bossKeyFlame", "bossKeyFrost", "bossKeyStorm"];
      if (enemy.isBoss && this.deps.random() < 0.044 * multiplier) return this.deps.rndChoice(keys);
      if (enemy.isElite && this.deps.random() < 0.01 * multiplier) return this.deps.rndChoice(keys);
      return null;
    }
    highTrialUnlocked(state) {
      return ["trial_3", "trial_4"].some((key) => (state.unlockedTrials || []).includes(key) || (state.completedTrials || []).includes(key));
    }
    getUnderworldResourceDropChances(enemy) {
      if (enemy && enemy.isBoss) {
        return { fossil: 0.11, typedFossil: 0.0375, tool: 0.025, rune: 0.18, core: 0.01, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
      }
      if (enemy && enemy.isElite) {
        return { fossil: 0.0125, typedFossil: 3e-3, tool: 25e-4, rune: 8e-3, core: 5e-4, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
      }
      return { fossil: 25e-4, typedFossil: 6e-4, tool: 5e-4, rune: 15e-4, core: 5e-5, ...this.tables.UNDERWORLD_ORE_DROP_CHANCES };
    }
  };
  var createLootRules = (tables2, deps2) => new LootRules(tables2, deps2);

  // modules/domain/loot-currency.mjs
  var CurrencyDropRules = class {
    constructor(tables2, deps2, rules2) {
      this.tables = tables2;
      this.deps = deps2;
      this.rules = rules2;
      this.loopRules = Object.freeze([
        [4, (enemy) => enemy.isSky, () => 0.35, "skyEssence", 1],
        [5, (enemy) => enemy.isBoss, (mul) => 0.16 * mul, "emberBranch", 1],
        [5, (enemy) => enemy.isBoss, (mul) => 0.03 * mul, "jewelShard", 3],
        [5, (enemy) => enemy.isElite, (mul) => 8e-3 * mul, "jewelShard", 1],
        [6, (enemy, zone) => zone.type === "labyrinth", () => 0.018, "sealShard", 1],
        [6, (enemy, zone) => zone.type === "labyrinth", () => 5e-3, "strongSealShard", 1],
        [6, (enemy, zone) => zone.type === "labyrinth" && Math.floor(zone.floor || 0) >= 30, () => 52e-5, "radiantSealShard", 1],
        [6, (enemy) => enemy.isBoss, (mul) => 0.018 * mul, "blessing", 1],
        [6, (enemy) => enemy.isElite, (mul) => 4e-3 * mul, "blessing", 1],
        [6, (enemy, zone) => enemy.isBoss && zone.type === "abyss" && Number(zone.id) >= 19, () => 0.0125, "beastKeyCerberus", 1],
        // 버려진 날붙이 도전권 (루프 31+): 심층 콘텐츠 보스가 드랍한다. 루프당 결투 6회(다섯 날 + 완성작)를 노린 넉넉한 확률.
        [31, (enemy, zone) => enemy.isBoss && this.isDeepRivalKeyZone(zone), (mul) => 0.1 * mul, "rivalKey", 1],
        // 잔향체 아스트라 도전권 (루프 31+): 우주계 은하 보스(planet-45~49)가 드랍한다.
        [31, (enemy, zone) => enemy.isBoss && zone.type === "cosmos", () => 0.15, "cosmosSovereignKey", 1]
      ]);
      this.underworldRules = Object.freeze([
        { chance: (rc, enemy) => enemy.isBoss ? 0.015 : enemy.isElite ? 3e-3 : 6e-4, drop: () => ["coreKey", 1] },
        { chance: (rc) => rc.fossil, drop: () => ["fossil", 1] },
        { chance: (rc) => rc.typedFossil, drop: () => [this.deps.rndChoice(["fossilBulwark", "fossilWedge", "fossilOld", "fossilRift"]), 1] },
        { chance: (rc) => rc.tool, drop: () => [this.deps.rndChoice(["deepWhetstone", "rootIron", "jewelPolish"]), 1] },
        { when: (enemy, floor) => floor >= 10, chance: (rc) => rc.rune, drop: (enemy) => ["runeShard", enemy.isBoss ? 2 : 1] },
        { when: (enemy, floor, state) => this.deps.coreItems.canDrop(state), chance: (rc) => rc.core, drop: () => ["core", 1] },
        { chance: (rc) => rc.copper, drop: () => ["underCopper", 1] },
        { chance: (rc) => rc.silver, drop: () => ["underSilver", 1] },
        { chance: (rc) => rc.gold, drop: () => ["underGold", 1] },
        { when: (enemy) => enemy.isBoss, chance: () => 25e-4, drop: () => [this.deps.rndChoice(["uberRootTicketFlame", "uberRootTicketFrost", "uberRootTicketStorm", "uberRootTicketChaos"]), 1] }
      ]);
    }
    getBasicCurrencyDrops(enemy, bonusRoll) {
      if (enemy.isBoss) return Object.entries(this.tables.BASIC_CURRENCY_DROP_CHANCES.boss).filter(([, chance]) => bonusRoll(chance)).map(([key]) => [key, 1]);
      let drops = [];
      if (enemy.isElite) {
        if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.mixed)) {
          drops.push([this.deps.random() < 0.9 ? "magicBud" : "formlessDew", 1]);
        }
        if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.sapBud)) drops.push(["sapBud", 1]);
        if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.elite.formlessDew)) drops.push(["formlessDew", 1]);
      } else if (bonusRoll(this.tables.BASIC_CURRENCY_DROP_CHANCES.regular.mixed)) {
        drops.push([["magicBud", "magicBud", "magicBud", "magicBud", "blightSpore"][Math.floor(this.deps.random() * 5)], 1]);
      }
      return drops;
    }
    getContentKillCurrencyDrops(state, zone, enemy, abyssScale) {
      const embers = this.deps.emberDrops(enemy);
      const catalysts = this.deps.sapDrops(enemy);
      const oils = this.deps.oilDrops(enemy);
      return [...embers, ...catalysts, ...oils, ...this.getContentBossCurrencyDrops(state, zone, enemy, abyssScale)];
    }
    getContentBossCurrencyDrops(state, zone, enemy, abyssScale) {
      const drops = [];
      if (enemy.isBoss && zone.type === "abyss" && this.deps.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(["jewelShard", 2]);
      if ((state.season || 1) >= 2 && zone.type === "seasonBoss" && enemy.isBoss && this.deps.random() < 0.22) drops.push(["bossCore", 1]);
      return drops;
    }
    getCurrencyDrops(state, enemy) {
      let zone = this.deps.getZone(state.currentZoneId) || this.deps.getZone(0);
      let abyssScale = this.deps.getAbyssMonsterScales(zone);
      let contentDropMul = this.deps.getContentDropRateMultiplier(zone);
      let dropMultiplier = this.rules.getEnemyLootDropMultiplier(state, zone, enemy);
      let bonusRoll = (chance) => this.deps.random() < Math.min(0.95, chance * dropMultiplier);
      let drops = this.getBasicCurrencyDrops(enemy, bonusRoll);
      drops.push(...this.getRareOrbDrops(state, enemy, zone, bonusRoll));
      let mappingOpened = (state.maxZoneId || 0) >= this.tables.ABYSS_START_ZONE_ID;
      drops.push(...this.rules.getMappingTicketDrops(state, enemy, zone, mappingOpened));
      drops.push(...this.getCosmosCurrencyDrops(enemy, zone, bonusRoll));
      drops.push(...this.getLoopCurrencyDrops(state, enemy, zone, contentDropMul));
      if (zone.type === "chaosRealm") {
        let chaosKeyChance = enemy.isBoss ? 0.012 : enemy.isElite ? 3e-3 : 6e-4;
        if (this.deps.random() < chaosKeyChance) drops.push(["chaosKey", 1]);
      }
      if (zone.type === "underworld") drops.push(...this.getUnderworldCurrencyDrops(state, enemy, zone));
      drops.push(...this.getContentKillCurrencyDrops(state, zone, enemy, abyssScale));
      return this.deps.levelProgression.filterCurrencyDrops(drops, this.deps.levelProgression.rewardMultiplier(zone, enemy, state.level)).filter(([key]) => this.deps.canDropCurrency(key, state));
    }
    getRareOrbDrops(state, enemy, zone, bonusRoll) {
      const drops = [];
      let divineChance = enemy.isBoss ? 6e-3 : enemy.isElite ? 4e-4 : 7e-5;
      if (bonusRoll(divineChance)) drops.push(["goldenRule", 1]);
      if (bonusRoll(divineChance / 20)) drops.push(["fairyRing", 1]);
      if (bonusRoll(divineChance * 2)) drops.push(["sapBud", 1]);
      let ouroborosChance = divineChance / 1200 * (this.isRepeatMasterworkBoss(state, enemy, zone) ? 2.5 : 1);
      if (bonusRoll(ouroborosChance)) drops.push(["ouroboros", 1]);
      return drops;
    }
    isRepeatMasterworkBoss(state, enemy, zone) {
      return enemy.isBoss && zone.id === "rival_masterwork" && Array.isArray(state.clearedRootBosses) && state.clearedRootBosses.includes(zone.id);
    }
    getCosmosCurrencyDrops(enemy, zone, bonusRoll) {
      const drops = [];
      if (zone.type === "cosmos" && bonusRoll(enemy.isBoss ? 0.025 : enemy.isElite ? 6e-3 : 15e-4)) drops.push(["pruningShears", 1]);
      if (zone.type === "cosmos" && enemy.isBoss && bonusRoll(0.012)) drops.push(["abyssCatalyst", 1]);
      return drops;
    }
    getLoopCurrencyDrops(state, enemy, zone, contentDropMul) {
      const loop = state.season || 1, drops = [];
      this.loopRules.forEach(([fromLoop, when, chance, key, amount]) => {
        if (loop >= fromLoop && when(enemy, zone) && this.deps.random() < chance(contentDropMul)) drops.push([key, amount]);
      });
      return drops;
    }
    isDeepRivalKeyZone(zone) {
      return zone.type === "chaosRealm" || zone.type === "underworld" || zone.type === "skyTower" || zone.type === "abyss" && Math.floor(this.deps.getAbyssDepthFromZoneId(Number(zone.id)) || 0) >= 21;
    }
    getUnderworldCurrencyDrops(state, enemy, zone) {
      let underFloor = Math.max(1, Math.floor(zone.floor || 1));
      let resourceChance = this.rules.getUnderworldResourceDropChances(enemy);
      const drops = [];
      this.underworldRules.forEach((rule) => {
        if ((!rule.when || rule.when(enemy, underFloor, state)) && this.deps.random() < rule.chance(resourceChance, enemy)) drops.push(rule.drop(enemy));
      });
      return drops;
    }
  };
  var createCurrencyDropRules = (tables2, deps2, rules2) => new CurrencyDropRules(tables2, deps2, rules2);

  // modules/domain/loot-policy.mjs
  var boolMap = (keys, raw, fallback) => Object.fromEntries(keys.map((key) => [key, typeof (raw && raw[key]) === "boolean" ? raw[key] : fallback[key] !== false]));
  var PICK_GROUPS = Object.freeze({
    rarity: (settings) => settings.itemFilterRarities,
    slot: (settings) => settings.itemFilterSlots,
    weapon: (settings) => settings.itemFilterWeaponCategories,
    always: (settings) => settings.itemFilterAlways,
    beams: (settings) => settings.lootFx.beams,
    notices: (settings) => settings.lootFx.notices
  });
  var EquipmentLootPolicy = class {
    constructor(tables2, deps2) {
      this.tables = tables2;
      this.deps = deps2;
    }
    statOptions() {
      const ids = new Set(this.tables.MOD_DB.flatMap((mod) => [
        mod.statId || mod.id,
        ...(mod.compound || []).map((stat) => stat.statId || stat.id)
      ]));
      return [...ids].filter(Boolean).map((id) => ({ id, name: this.deps.getStatName(id) })).sort((a, b) => a.name.localeCompare(b.name, this.deps.i18n.locale));
    }
    tagOptions() {
      return Object.entries(this.tables.AFFIX_TAG_LABELS).map(([id, name]) => ({ id, name }));
    }
    normalizeRule(rule, validIds) {
      if (!rule || !Number.isFinite(rule.minTier)) return null;
      const minTier = clampNumber(Math.floor(Number(rule.minTier)), 0, 20);
      if (typeof rule.tag === "string") {
        return this.tables.AFFIX_TAG_LABELS[rule.tag] && Number.isFinite(rule.minCount) ? { tag: rule.tag, minCount: clampNumber(Math.floor(Number(rule.minCount)), 1, 6), minTier } : null;
      }
      return validIds.has(rule.statId) && Number.isFinite(rule.minValue) ? { statId: rule.statId, minValue: Math.max(0, Number(rule.minValue)), minTier } : null;
    }
    ruleKey(rule) {
      return rule.tag ? "tag:" + rule.tag : rule.statId;
    }
    normalizeTargets(input) {
      const source = input && typeof input === "object" ? input : {};
      const validIds = new Set(this.statOptions().map((stat) => stat.id));
      const seen = /* @__PURE__ */ new Set();
      const rules2 = (Array.isArray(source.rules) ? source.rules : []).map((rule) => this.normalizeRule(rule, validIds)).filter((rule) => {
        if (!rule || seen.has(this.ruleKey(rule))) return false;
        seen.add(this.ruleKey(rule));
        return true;
      }).slice(0, 6);
      return {
        enabled: source.enabled === true,
        slot: this.tables.EQUIPMENT_DROP_SLOTS.includes(source.slot) ? source.slot : "any",
        scope: source.scope === "all" ? "all" : "explicit",
        minMatches: clampNumber(Math.floor(Number(source.minMatches) || 1), 1, Math.max(1, rules2.length)),
        rules: rules2
      };
    }
    normalizeSettings(settings) {
      settings.autoSalvageEnabled = !!settings.autoSalvageEnabled;
      settings.autoSalvageRarities = { ...this.deps.defaults.settings.autoSalvageRarities, ...settings.autoSalvageRarities };
      settings.itemFilterRarities = { ...this.deps.defaults.settings.itemFilterRarities, ...settings.itemFilterRarities };
      settings.itemFilterMinHiddenTier = clampNumber(Math.floor(Number(settings.itemFilterMinHiddenTier) || 1), 1, 20);
      settings.itemFilterTierThreshold = clampNumber(Math.floor(Number(settings.itemFilterTierThreshold) || 10), 1, 20);
      settings.itemFilterMinTierCount = clampNumber(Math.floor(Number(settings.itemFilterMinTierCount) || 0), 0, 6);
      settings.equipmentTargets = this.normalizeTargets(settings.equipmentTargets);
      this.normalizePickupDetail(settings);
    }
    normalizePickupDetail(settings) {
      const defaults = this.deps.defaults.settings, rarities = Object.keys(this.tables.ITEM_RARITY_LABELS), tiers = settings.itemFilterMinTiers || {};
      const legacy = rarities.every((key) => !(Number(tiers[key]) > 1)) ? settings.itemFilterMinHiddenTier : null;
      settings.itemFilterMinTiers = Object.fromEntries(rarities.map((key) => [key, clampNumber(Math.floor(Number(legacy || tiers[key]) || 1), 1, 20)]));
      settings.itemFilterMinHiddenTier = 1;
      settings.itemFilterSlots = boolMap(this.tables.EQUIPMENT_DROP_SLOTS, settings.itemFilterSlots, defaults.itemFilterSlots);
      settings.itemFilterWeaponCategories = boolMap(Object.keys(this.tables.WEAPON_CATEGORIES), settings.itemFilterWeaponCategories, defaults.itemFilterWeaponCategories);
      settings.itemFilterAlways = boolMap(Object.keys(defaults.itemFilterAlways), settings.itemFilterAlways, defaults.itemFilterAlways);
      const fx = settings.lootFx || {};
      settings.lootFx = {
        beams: boolMap(Object.keys(defaults.lootFx.beams), fx.beams, defaults.lootFx.beams),
        notices: boolMap(Object.keys(defaults.lootFx.notices), fx.notices, defaults.lootFx.notices)
      };
    }
    pickupPreset(key, zone) {
      const preset = this.tables.ITEM_PICKUP_PRESETS[key];
      if (!preset) return null;
      const tierFloor = preset.tierBelowZoneCap ? Math.max(1, this.deps.getZoneEquipmentTierCap(zone) - preset.tierBelowZoneCap) : 1;
      return {
        itemFilterEnabled: true,
        itemFilterRarities: { ...preset.rarities },
        itemFilterMinHiddenTier: 1,
        itemFilterMinTierCount: 0,
        itemFilterMinTiers: { normal: tierFloor, magic: tierFloor, rare: tierFloor, unique: tierFloor },
        itemFilterOnlyNewCodexUnique: !!preset.onlyNewCodexUnique
      };
    }
    targetLines(item, scope) {
      const stats = item.stats || [];
      return (scope === "all" ? stats.concat(item.baseStats || [], item.underEnchant || []) : stats).filter(Boolean);
    }
    pickGroup(settings, group) {
      return Object.hasOwn(PICK_GROUPS, group) ? PICK_GROUPS[group](settings) : null;
    }
    togglePick(settings, group, key) {
      const map = this.pickGroup(settings, group);
      if (!map || !Object.hasOwn(map, key)) return false;
      map[key] = map[key] === false;
      return true;
    }
    updatePickup(settings, input) {
      const tiers = input.itemFilterMinTiers;
      if (!Number.isFinite(input.itemFilterTierThreshold) || !Number.isFinite(input.itemFilterMinTierCount)) return false;
      if (!tiers || Object.keys(this.tables.ITEM_RARITY_LABELS).some((key) => !Number.isFinite(tiers[key]))) return false;
      const next = {
        ...settings,
        itemFilterEnabled: input.itemFilterEnabled === true,
        itemFilterOnlyNewCodexUnique: input.itemFilterOnlyNewCodexUnique === true,
        itemFilterMinTiers: { ...tiers },
        itemFilterTierThreshold: clampNumber(Math.floor(input.itemFilterTierThreshold), 1, 20),
        itemFilterMinTierCount: clampNumber(Math.floor(input.itemFilterMinTierCount), 0, 6)
      };
      this.normalizePickupDetail(next);
      Object.assign(settings, next);
      return true;
    }
    applyPreset(settings, key, zone) {
      const patch = this.pickupPreset(key, zone);
      if (!patch) return false;
      const next = { ...settings, ...patch };
      this.normalizeSettings(next);
      Object.assign(settings, next);
      return true;
    }
    updateTargets(settings, input) {
      if (!Array.isArray(input.rules) || input.rules.some((rule) => !rule)) return false;
      if (new Set(input.rules.map((rule) => this.ruleKey(rule))).size !== input.rules.length) return false;
      settings.equipmentTargets = this.normalizeTargets(input);
      return true;
    }
    addTarget(settings, kind) {
      const filter = settings.equipmentTargets;
      if (filter.rules.length >= 6 || !["stat", "tag"].includes(kind)) return false;
      const field = kind === "tag" ? "tag" : "statId";
      const options = kind === "tag" ? this.tagOptions() : this.statOptions();
      const option = options.find((row) => !filter.rules.some((rule2) => rule2[field] === row.id));
      if (!option) return false;
      const rule = kind === "tag" ? { tag: option.id, minCount: 2, minTier: 0 } : { statId: option.id, minValue: 0, minTier: 0 };
      filter.rules = [...filter.rules, rule];
      return true;
    }
    removeTarget(settings, index) {
      const filter = settings.equipmentTargets;
      if (!Number.isInteger(index) || index < 0 || index >= filter.rules.length) return false;
      settings.equipmentTargets = this.normalizeTargets({ ...filter, rules: filter.rules.filter((_, i) => i !== index) });
      return true;
    }
    targetStats(lines) {
      return lines.flatMap((stat) => [stat, ...(stat.extraStats || []).map((extra) => ({ ...extra, tier: stat.tier }))]);
    }
    lineMatchesRule(stat, rule) {
      if (!stat || Number(stat.tier || 0) < rule.minTier) return false;
      return rule.tag ? this.deps.getAffixTags(stat).includes(rule.tag) : stat.id === rule.statId && Number(stat.val) >= rule.minValue;
    }
    ruleMet(rule, lines, expanded) {
      return rule.tag ? lines.filter((line) => this.lineMatchesRule(line, rule)).length >= rule.minCount : expanded.some((stat) => this.lineMatchesRule(stat, rule));
    }
    matches(item, targetGame) {
      const filter = targetGame.settings && targetGame.settings.equipmentTargets;
      if (!filter || !filter.enabled || !filter.rules.length || !item) return false;
      if (filter.slot !== "any" && filter.slot !== item.slot) return false;
      const lines = this.targetLines(item, filter.scope), expanded = this.targetStats(lines);
      return filter.rules.filter((rule) => this.ruleMet(rule, lines, expanded)).length >= filter.minMatches;
    }
    highlight(item, targetGame) {
      if (item.rarity === "unique" && (targetGame.uniqueHuntTargets || []).includes(this.deps.getUniqueCodexKeyByItem(item))) return { reason: this.deps.translate("목표 고유 획득"), color: "#7fffd2", priority: 3 };
      if (this.matches(item, targetGame)) return { reason: this.deps.translate("목표 옵션 일치"), color: "#7fffd2", priority: 3 };
      if (item.rarity === "unique") return { reason: this.deps.translate("고유 장비 획득"), color: "#ffbb69", priority: 2 };
      if (item.exceptionalBase) return { reason: this.deps.translate("특출 베이스 발견"), color: "#f3d779", priority: 1 };
      if (item.corrupted) return { reason: this.deps.translate("타락 장비 발견"), color: "#e7685c", priority: 1 };
      return null;
    }
    ownedItems(state) {
      const equipped = this.deps.getEquipmentLoadoutOwnedItems(state);
      const stash = state.offlineProgress || {};
      return [...new Set(equipped.concat(stash.stash || [], stash.protectedOverflow || []))];
    }
    collectHighlights(before, after) {
      const beforeIds = new Set(this.ownedItems(before).map((item) => String(item.id)));
      const seen = /* @__PURE__ */ new Set();
      const rows = [];
      for (const item of this.ownedItems(after)) {
        const id = String(item.id);
        if (beforeIds.has(id) || seen.has(id)) continue;
        seen.add(id);
        const info = this.highlight(item, before);
        if (!info) continue;
        const inStash = (after.offlineProgress?.stash || []).includes(item);
        const worn = Object.values(after.equipment || {}).includes(item);
        rows.push({ id: item.id, name: item.name, rarity: item.rarity, slot: item.slot, location: inStash ? "방치 보관함" : worn ? "자동 착용" : "장비창", ...info });
      }
      rows.sort((a, b) => b.priority - a.priority);
      return { items: rows.slice(0, 5), total: rows.length };
    }
  };
  var createEquipmentLootPolicy = (tables2, deps2) => new EquipmentLootPolicy(tables2, deps2);

  // modules/domain/loot-variants.mjs
  var EquipmentDropVariants = class {
    constructor(tables2, deps2) {
      this.tables = tables2;
      this.deps = deps2;
    }
    explicitLines(item) {
      return (item.stats || []).filter((stat) => stat && !stat.fixedValue && Number(stat.val) > 0);
    }
    sameRange(range, stat) {
      return Math.abs(range.min - Number(stat.valMin)) < 1e-9 && Math.abs(range.max - Number(stat.valMax)) < 1e-9;
    }
    lineMod(stat) {
      if (stat.sourceModId) return this.tables.MOD_DB.find((mod) => mod.id === stat.sourceModId) || null;
      return this.tables.MOD_DB.find((mod) => (mod.statId || mod.id) === stat.id && !mod.tierValues && [false, true].some((round) => this.sameRange(this.deps.getAffixTierRange(mod, stat.id, stat.tier, round), stat))) || null;
    }
    /** Raise on the original value step, never above the item's affix cap; tiny values cannot jump a large step. */
    corruptedValue(item, stat, mod) {
      const value = Number(stat.val), boost = this.tables.EQUIPMENT_DROP_VARIANTS.corruptedBoost;
      const own = this.deps.getAffixTierRange(mod, stat.id, stat.tier), step = Number(stat.valueStep) || own.step;
      const capTier = Math.max(Number(stat.tier) || 1, Math.floor(Number(item.affixTierCap) || 1));
      const cap = Math.max(Number(stat.valMax) || value, this.deps.getAffixTierRange(mod, stat.id, capTier).max);
      let next = Math.floor(value * boost / step + 1e-9) * step;
      if (next <= value && step <= value * 0.3) next = value + step;
      next = Number(Math.min(next, cap).toFixed(2));
      return next > value ? next : value;
    }
    corruptionPlan(item) {
      return this.explicitLines(item).flatMap((stat) => {
        const mod = this.lineMod(stat);
        if (!mod) return [];
        const extras = (stat.extraStats || []).filter((extra) => Number(extra.val) > 0).map((extra) => {
          const sub = (mod.compound || []).find((row) => (row.statId || row.id) === extra.id);
          return sub ? [extra, this.corruptedValue(item, extra, sub)] : [extra, Number(extra.val)];
        });
        return [[stat, this.corruptedValue(item, stat, mod)], ...extras];
      }).filter(([line, next]) => next > Number(line.val));
    }
    pick(state, item, roll, scale) {
      const rules2 = this.tables.EQUIPMENT_DROP_VARIANTS;
      if (!item || item.rarity === "unique" || item.corrupted || (Number(state.season) || 1) < rules2.fromLoop) return null;
      let edge = 0;
      const zone = this.deps.getZone(state.currentZoneId);
      for (const [kind, chance] of rules2.odds) {
        edge += chance * scale * this.deps.lootOmens.variantMul(zone, kind);
        if (roll < edge) return kind === "corrupted" && !this.corruptionPlan(item).length ? null : kind;
      }
      return null;
    }
    corrupt(item) {
      this.corruptionPlan(item).forEach(([line, next]) => {
        line.val = next;
      });
      item.corrupted = true;
      return [item];
    }
    duplicate(item) {
      const copy = JSON.parse(JSON.stringify(item));
      copy.id = this.deps.nextItemId();
      return [item, copy];
    }
    /** Preserve base, rarity and level; each extra uses the actual item generator for its own affixes. */
    bundle(item, rng) {
      const base = this.tables.BASE_ITEM_DB.find((row) => row.id === item.baseId);
      if (!base) return [item];
      const { min, max } = this.tables.EQUIPMENT_DROP_VARIANTS.bundle;
      const extra = min + Math.floor(rng() * (max - min + 1));
      const origin = {
        dropRealm: item.dropRealm,
        affixTierCap: item.affixTierCap,
        affixTierFloor: this.deps.getDroppedAffixTierRange(item.affixTierCap).min,
        tierWeightFalloff: this.tables.DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
      };
      const extras = Array.from({ length: extra }, () => this.deps.levelProgression.stampItem(this.deps.createItemFromBase(base, item.rarity, item.itemTier, origin), item.itemLevel));
      return [item, ...extras];
    }
    expand(state, item, options = {}) {
      const rng = options.rng || this.deps.random;
      const kind = this.pick(state, item, rng(), Math.max(0, Number(options.scale) || 1));
      if (!kind) return { kind: null, items: [item] };
      const items = kind === "corrupted" ? this.corrupt(item) : kind === "duplicate" ? this.duplicate(item) : this.bundle(item, rng);
      return { kind, items };
    }
  };
  var createEquipmentDropVariants = (tables2, deps2) => new EquipmentDropVariants(tables2, deps2);

  // modules/domain/loot-moments.mjs
  var TIERS = Object.freeze(["good", "great", "jackpot"]);
  var momentRank = (tier) => TIERS.indexOf(tier) + 1;
  var higherMoment = (a, b) => momentRank(a) >= momentRank(b) ? a : b;
  var LootMoments = class {
    constructor(tables2, deps2, policy2) {
      this.tables = tables2;
      this.deps = deps2;
      this.policy = policy2;
      this.byCurrency = new Map(TIERS.flatMap((tier) => tables2.LOOT_OMENS.moments[tier].map((key) => [key, tier])));
      this.itemKinds = Object.freeze({
        equipment: (item) => this.ofEquipment(item),
        jewel: (item) => item.rarity === "unique" ? "great" : item.rarity === "rare" ? "good" : null,
        talisman: (item) => item.rarity === "unique" ? "great" : null,
        core: (item) => item.perfect ? "jackpot" : "good"
        // 완전한 코어는 체이싱 티어(js/core-items.js)
      });
    }
    rank(tier) {
      return momentRank(tier);
    }
    higher(a, b) {
      return higherMoment(a, b);
    }
    ofCurrency(key) {
      return this.byCurrency.get(this.deps.getCanonicalCurrencyKey(key)) || null;
    }
    ofRune(gem) {
      return this.tables.SKILL_DB[typeof gem === "string" ? gem : gem.name]?.chase ? "jackpot" : null;
    }
    fineLines(item) {
      const rules2 = this.tables.LOOT_OMENS.fineRare, cap = Number(item.affixTierCap) || 0, floor = cap - rules2.band + 1;
      return cap >= rules2.minCap && Array.isArray(item.stats) ? item.stats.filter((stat) => Number(stat.tier) >= floor).length : 0;
    }
    ofRare(item) {
      const lines = this.fineLines(item), rules2 = this.tables.LOOT_OMENS.fineRare;
      return lines >= rules2.good ? "good" : null;
    }
    ofEquipment(item) {
      if (item.rarity === "unique") return this.deps.isChaseUniqueItem(item) ? "jackpot" : "great";
      if (item.exceptionalAllLines) return "great";
      const base = item.exceptionalBase || item.corrupted || item.voidSocket ? "good" : null;
      return item.rarity === "rare" ? higherMoment(base, this.ofRare(item)) : base;
    }
    ofItem(item, kind = "equipment") {
      const judge = this.itemKinds[kind];
      return item && judge ? judge(item) : null;
    }
    ofReceipt(state, receipt) {
      if (receipt.currency) return this.ofCurrency(receipt.currency);
      if (receipt.leaf) return this.deps.memoryLeaves.momentOf(state, receipt.leaf);
      if (receipt.yarn) return "good";
      if (receipt.gem) return this.ofRune(receipt.gem);
      const tier = this.ofItem(receipt.item, receipt.itemKind || "equipment");
      const hunted = receipt.highlight && (this.policy.highlight(receipt.item, state)?.priority || 0) >= 3;
      return hunted ? higherMoment(tier, "great") : tier;
    }
    isNewUnique(item, state) {
      if (!item || item.rarity !== "unique") return false;
      const key = this.deps.getUniqueCodexKeyByItem(item), entry = key && state.uniqueCodex ? state.uniqueCodex[key] : null;
      return !!key && !(entry && entry.baseName);
    }
  };
  var createLootMoments = (tables2, deps2, policy2) => new LootMoments(tables2, deps2, policy2);

  // modules/loot-classic.mjs
  var tables = {
    get TALISMAN_WILD_DROPS() {
      return TALISMAN_WILD_DROPS;
    },
    get EQUIPMENT_BASE_DROP_CHANCES() {
      return EQUIPMENT_BASE_DROP_CHANCES;
    },
    get LABYRINTH_DEEP_FOSSIL() {
      return LABYRINTH_DEEP_FOSSIL;
    },
    get LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER() {
      return LABYRINTH_FOSSIL_DROP_RATE_MULTIPLIER;
    },
    get EQUIPMENT_DROUGHT_RULES() {
      return EQUIPMENT_DROUGHT_RULES;
    },
    get EQUIPMENT_DROP_RARITY_THRESHOLDS() {
      return EQUIPMENT_DROP_RARITY_THRESHOLDS;
    },
    get REALM_BOSS_UNIQUE_DROP_RULES() {
      return REALM_BOSS_UNIQUE_DROP_RULES;
    },
    get UNDERWORLD_ORE_DROP_CHANCES() {
      return UNDERWORLD_ORE_DROP_CHANCES;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get BASIC_CURRENCY_DROP_CHANCES() {
      return BASIC_CURRENCY_DROP_CHANCES;
    },
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get MOD_DB() {
      return MOD_DB;
    },
    get AFFIX_TAG_LABELS() {
      return AFFIX_TAG_LABELS;
    },
    get EQUIPMENT_DROP_SLOTS() {
      return EQUIPMENT_DROP_SLOTS;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get WEAPON_CATEGORIES() {
      return WEAPON_CATEGORIES;
    },
    get ITEM_PICKUP_PRESETS() {
      return ITEM_PICKUP_PRESETS;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get EQUIPMENT_DROP_VARIANTS() {
      return EQUIPMENT_DROP_VARIANTS;
    },
    get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() {
      return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get SKILL_DB() {
      return SKILL_DB;
    }
  };
  var deps = {
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get getAbyssMonsterScales() {
      return getAbyssMonsterScales;
    },
    get getContentDropRateMultiplier() {
      return getContentDropRateMultiplier;
    },
    get capEndlessContentDropMultiplier() {
      return capEndlessContentDropMultiplier;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getRealmEquipmentHiddenTierCap() {
      return getRealmEquipmentHiddenTierCap;
    },
    get uniqueDropsInZone() {
      return uniqueDropsInZone;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get rndChoice() {
      return rndChoice;
    },
    get getZone() {
      return getZone;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get getStatName() {
      return getStatName;
    },
    get getZoneEquipmentTierCap() {
      return getZoneEquipmentTierCap;
    },
    get getAffixTags() {
      return getAffixTags;
    },
    get getUniqueCodexKeyByItem() {
      return getUniqueCodexKeyByItem;
    },
    get getEquipmentLoadoutOwnedItems() {
      return getEquipmentLoadoutOwnedItems;
    },
    get getAffixTierRange() {
      return getAffixTierRange;
    },
    get getDroppedAffixTierRange() {
      return getDroppedAffixTierRange;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get lootOmens() {
      return lootOmens;
    },
    get getCanonicalCurrencyKey() {
      return getCanonicalCurrencyKey;
    },
    get isChaseUniqueItem() {
      return isChaseUniqueItem;
    },
    random: () => Math.random(),
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter,
    isUnlocked: (key, state) => contentProgression.isUnlocked(key, state),
    canDropCurrency: (key, state) => contentProgression.canDropCurrency(key, state),
    get coreItems() {
      return coreItems;
    },
    get defaults() {
      return defaultGame;
    },
    get i18n() {
      return i18n;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    translate: (...args) => _t(...args),
    emberDrops: (enemy) => typeof emberCorruption === "object" ? emberCorruption.killDrops(enemy) : [],
    sapDrops: (enemy) => typeof sapCatalysts === "object" ? sapCatalysts.killDrops(enemy) : [],
    oilDrops: (enemy) => typeof gardenOils === "object" ? gardenOils.killDrops(enemy) : []
  };
  var rules = createLootRules(tables, deps);
  var currencies = createCurrencyDropRules(tables, deps, rules);
  window.GameModules.lootRules = rules;
  var policy = createEquipmentLootPolicy(tables, deps);
  var variants = createEquipmentDropVariants(tables, deps);
  window.GameModules.equipmentLootPolicy = policy;
  var moments = createLootMoments(tables, deps, policy);
  var equipmentLootPolicy = Object.freeze({
    ...Object.fromEntries(["statOptions", "tagOptions", "ruleKey", "normalizeTargets", "normalizeSettings", "pickupPreset", "lineMatchesRule", "collectHighlights"].map((name) => [name, policy[name].bind(policy)])),
    matches: (item, state = game) => policy.matches(item, state),
    highlight: (item, state = game) => policy.highlight(item, state)
  });
  var equipmentDropVariants = Object.freeze({
    expand: (item, options = {}) => {
      const result = variants.expand(game, item, options);
      if (result.kind) dispatchRuntimeEvent("equipment-drop-variant", result);
      return result;
    }
  });
  var lootMoments = Object.freeze({
    ...Object.fromEntries(["ofCurrency", "ofItem", "rank", "higher", "fineLines"].map((name) => [name, moments[name].bind(moments)])),
    ofReceipt: (receipt) => moments.ofReceipt(game, receipt),
    isNewUnique: (item, state = game) => moments.isNewUnique(item, state)
  });
  safeExposeGlobals({
    UNIQUE_CODEX_KEYS: rules.codexKeys,
    getUniqueCodexProgress: () => rules.getUniqueCodexProgress(game),
    getCodexBonusPctFromCount: rules.getCodexBonusPctFromCount.bind(rules),
    getCodexBonusPct: () => rules.getCodexBonusPct(game),
    getLabyrinthFossilDropChances: rules.getLabyrinthFossilDropChances.bind(rules),
    getEnemyLootDropMultiplier: (zone, enemy) => rules.getEnemyLootDropMultiplier(game, zone, enemy),
    getEquipmentDropChances: (zone, enemy) => rules.getEquipmentDropChances(game, zone, enemy),
    rollEquipmentDrop: (zone, enemy, chance) => rules.rollEquipmentDrop(game, zone, enemy, chance),
    getEquipmentDropRarity: rules.getEquipmentDropRarity.bind(rules),
    generateRealmBossUniqueDrop: (zone, enemy) => rules.generateRealmBossUniqueDrop(game, zone, enemy),
    getMappingTicketDrops: (enemy, zone, opened) => rules.getMappingTicketDrops(game, enemy, zone, opened),
    getUnderworldResourceDropChances: rules.getUnderworldResourceDropChances.bind(rules),
    getCurrencyDrops: (enemy) => currencies.getCurrencyDrops(game, enemy),
    equipmentLootPolicy,
    equipmentDropVariants,
    lootMoments
  });
})();
