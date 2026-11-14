// GENERATED from modules/combat-build-stats*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/stat-bucket.mjs
  var STAT_BUCKET_DEFAULTS = {
    flatDmg: 0,
    weaponFlatDmgPct: 0,
    pctDmg: 0,
    flatHp: 0,
    pctHp: 0,
    aspd: 0,
    crit: 0,
    move: 0,
    cooldownRecovery: 0,
    cooldownReduction: 0,
    mobilityCooldownRecovery: 0,
    mobilityCooldownReduction: 0,
    cooldownReductionCapBonus: 0,
    sight: 0,
    sightCap: 0,
    chestGrade: 0,
    gemLevel: 0,
    elementalGemLevel: 0,
    fireGemLevel: 0,
    coldGemLevel: 0,
    lightGemLevel: 0,
    chaosGemLevel: 0,
    physGemLevel: 0,
    projectileGemLevel: 0,
    meleeGemLevel: 0,
    slamGemLevel: 0,
    spellGemLevel: 0,
    dotGemLevel: 0,
    aoeGemLevel: 0,
    strGemLevel: 0,
    dexGemLevel: 0,
    intGemLevel: 0,
    suppCap: 0,
    runeResonancePower: 0,
    regenFlat: 0,
    dr: 0,
    physIgnore: 0,
    resPen: 0,
    resF: 0,
    resC: 0,
    resL: 0,
    maxResAll: 0,
    maxResF: 0,
    maxResC: 0,
    maxResL: 0,
    maxResChaos: 0,
    resChaos: 0,
    leech: 0,
    leechRateCap: 0,
    leechTotalCap: 0,
    leechInstanceCap: 0,
    leechKeepFullLife: 0,
    critDmg: 0,
    regen: 0,
    regenSuppress: 0,
    ds: 0,
    expGain: 0,
    minDmgRoll: 0,
    maxDmgRoll: 0,
    slamEchoChance: 0,
    slamEchoDamagePct: 0,
    doubleDamageChance: 0,
    blockChanceMax: 0,
    physFlatTakenReduce: 0,
    fireFlatTakenReduce: 0,
    coldFlatTakenReduce: 0,
    lightFlatTakenReduce: 0,
    chaosFlatTakenReduce: 0,
    allFlatTakenReduce: 0,
    physTakenAsFire: 0,
    physTakenAsCold: 0,
    physTakenAsLight: 0,
    physTakenAsChaos: 0,
    addedFireDamagePct: 0,
    addedColdDamagePct: 0,
    addedLightDamagePct: 0,
    addedChaosDamagePct: 0,
    addedPhysDamagePct: 0,
    fireFlatDmg: 0,
    coldFlatDmg: 0,
    lightFlatDmg: 0,
    chaosFlatDmg: 0,
    physFlatDmg: 0,
    meleePctDmg: 0,
    slamPctDmg: 0,
    projectilePctDmg: 0,
    physPctDmg: 0,
    elementalPctDmg: 0,
    firePctDmg: 0,
    coldPctDmg: 0,
    lightPctDmg: 0,
    chaosPctDmg: 0,
    aoePctDmg: 0,
    dotPctDmg: 0,
    spellPctDmg: 0,
    shieldPctDmg: 0,
    minePctDmg: 0,
    potionPctDmg: 0,
    mobilityPctDmg: 0,
    channelingPctDmg: 0,
    igniteChance: 0,
    chillChance: 0,
    freezeChance: 0,
    shockChance: 0,
    poisonChance: 0,
    bleedChance: 0,
    spellFlatDmg: 0,
    spellFlatPct: 0,
    targetAny: 0,
    targetProjectile: 0,
    targetSlam: 0,
    projectileExtraShots: 0,
    projectileExtraChance: 0,
    projectileChain: 0,
    igniteDurationPct: 0,
    chillDurationPct: 0,
    freezeDurationPct: 0,
    shockDurationPct: 0,
    poisonDurationPct: 0,
    bleedDurationPct: 0,
    skillDelayReduce: 0,
    attackPctDmg: 0,
    spellLeech: 0,
    spellCritDmg: 0,
    spellRepeatChance: 0,
    strength: 0,
    dexterity: 0,
    intelligence: 0,
    accuracy: 0,
    mystique: 0,
    devotion: 0,
    cycle: 0,
    ailmentDamagePct: 0,
    ailmentPotencyPct: 0,
    armor: 0,
    evasion: 0,
    energyShield: 0,
    armorPct: 0,
    evasionPct: 0,
    energyShieldPct: 0,
    energyShieldRegen: 0,
    energyShieldRechargeFaster: 0,
    deflectChance: 0,
    deflectDamageReduce: 0,
    blockChance: 0,
    blockChancePct: 0,
    ailResIgnite: 0,
    ailResShock: 0,
    ailResFreeze: 0,
    ailResPoison: 0,
    ailResBleed: 0,
    chillEffectReducePct: 0,
    freezeDurationReducePct: 0,
    shockEffectReducePct: 0,
    igniteDamageReducePct: 0,
    bleedDamageReducePct: 0,
    poisonDamageReducePct: 0,
    dotTakenDamageReducePct: 0,
    takenDamageReduceWhen2EnemiesPct: 0,
    takenDamageReduceWhen1EnemyPct: 0,
    genericTakenDamageReducePct: 0,
    critTakenDamageReducePct: 0,
    igniteTakenDurationReducePct: 0,
    shockTakenDurationReducePct: 0,
    coldTakenDurationReducePct: 0,
    poisonTakenDurationReducePct: 0,
    bleedTakenDurationReducePct: 0,
    shockedEnemyHitDamageMorePct: 0,
    shockedEnemyHitDamagePct: 0,
    igniteDamageMultiplierPct: 0,
    poisonDamageMultiplierPct: 0,
    accuracyBonusPct: 0,
    chillEffect: 0,
    shockEffect: 0,
    summonFlatDmg: 0,
    summonPctDmg: 0,
    summonAspd: 0,
    summonHpPct: 0,
    summonCrit: 0,
    summonCritDmg: 0,
    summonCap: 0,
    summonEfficiency: 0,
    summonGuardRedirectPct: 0,
    summonResPen: 0,
    summonGemLevel: 0,
    curseCap: 0,
    oxygenMax: 0,
    oxygenRegen: 0,
    oceanPressureResist: 0,
    oceanDepthGainPct: 0,
    oceanRareFishChancePct: 0,
    bossDamagePct: 0,
    eliteDamagePct: 0,
    firstStrikeDamagePct: 0,
    cullStrikePct: 0,
    echoPower: 0,
    chaosErosion: 0,
    chaosErosionCap: 0,
    // 우주계 보스 유물석과 보스 부적의 줄(js/combat.js가 reward에서 읽는다): 통에 없어 addStatToBucket이 버렸다(2026-10-20).
    firstHitDamageMorePct: 0,
    cosmosAlwaysFirstHitChancePct: 0,
    uniqueInstantLeechPct: 0,
    cosmosLightningVariance: 0,
    cosmosBossDamageMorePct: 0,
    regionPoisonSpread: 0,
    regionChaosShred: 0,
    regionPoisonedLeech: 0,
    regionChaosOvercap: 0,
    regionBlockEmpower: 0,
    regionArmorToPhys: 0,
    regionBleedingDamage: 0,
    regionLowLifeDR: 0,
    regionShockChain: 0,
    regionCritMove: 0,
    regionShockSpread: 0,
    regionShockedLightPen: 0,
    regionIgniteSpread: 0,
    regionFullLifeFire: 0,
    regionIgniteDuration: 0,
    regionIgnitedDamage: 0,
    regionFrozenCritDamage: 0,
    regionShatter: 0,
    regionChillOnHit: 0,
    regionChilledAttackerDR: 0
  };
  function createEmptyStatBucket() {
    return { ...STAT_BUCKET_DEFAULTS };
  }
  var DIRECT_STAT_BUCKET_KEYS = new Set(Object.keys(createEmptyStatBucket()).filter((key) => key !== "oxygenMax" && key !== "oxygenRegen"));
  var COMPOSITE_STAT_BUCKET_LINES = Object.freeze({
    resAll: [["resF", 1, 0], ["resC", 1, 0], ["resL", 1, 0]],
    moveEvasion: [["move", 1, 0], ["evasionPct", 1, 0]],
    hpArmor: [["flatHp", 1, 0], ["armor", 2, 0]],
    aspdMove: [["aspd", 1, 0], ["move", 1, 0]],
    chaosResElemPenalty: [["resChaos", 1, 0], ["resF", -1, 0], ["resC", -1, 0], ["resL", -1, 0]],
    deflectMajor: [["deflectChance", 1, 0], ["deflectDamageReduce", 0, 3]],
    targetCount: [["targetAny", 1, 0]]
  });
  function addStatToBucket(bucket, statId, value) {
    value = Number(value);
    if (typeof statId !== "string" || !Number.isFinite(value)) return;
    if (DIRECT_STAT_BUCKET_KEYS.has(statId)) {
      bucket[statId] += value;
      return;
    }
    if (!Object.hasOwn(COMPOSITE_STAT_BUCKET_LINES, statId)) return;
    for (const [key, multiplier, flat] of COMPOSITE_STAT_BUCKET_LINES[statId]) {
      bucket[key] += value * multiplier + flat;
    }
  }
  function applyStatsToBucket(bucket, stats) {
    (stats || []).forEach((stat) => {
      if (!stat) return;
      addStatToBucket(bucket, stat.id, stat.val);
      if (Array.isArray(stat.extraStats)) stat.extraStats.forEach((extra) => {
        if (extra) addStatToBucket(bucket, extra.id, extra.val);
      });
    });
  }

  // modules/domain/combat-build-stats.mjs
  var CombatBuildStats = class {
    constructor(deps) {
      this.deps = deps;
    }
    accumulateCombatSeasonStats(bucket, nodeIds, levels) {
      const nodeLevels = levels && typeof levels === "object" ? levels : {};
      nodeIds.forEach((id) => {
        const node = this.deps.seasonNode(id);
        if (!node) return;
        const level = Math.max(1, Math.floor(nodeLevels[id] || 1));
        const value = Number((node.val * (1 + Math.max(0, level - 1) * 0.2)).toFixed(4));
        addStatToBucket(bucket, node.stat, value);
      });
    }
    accumulateCombatAscendStats(bucket, nodeIds, ascendClass, owner) {
      this.accumulateCombatKeystoneStats(bucket, owner);
      if (!ascendClass) return;
      const tree = this.deps.classTree(ascendClass);
      nodeIds.forEach((id) => {
        const node = tree[id];
        if (!node) return;
        if (Array.isArray(node.stats)) {
          node.stats.forEach((line) => addStatToBucket(bucket, line.stat, line.val));
          return;
        }
        addStatToBucket(bucket, node.stat, node.val);
      });
    }
    forEachActiveKeystoneDef(owner, visit) {
      const ids = /* @__PURE__ */ new Set([...owner.ascendKeystones || [], ...owner.cosmosTwinKeystones || []]);
      ids.forEach((id) => {
        if (!this.deps.keystoneActive(id, owner)) return;
        const ownerClass = this.deps.keystoneClass(id);
        const def = ownerClass ? (this.deps.CLASS_KEYSTONE_DEFS[ownerClass] || []).find((node) => node.id === id) : null;
        if (def) visit(def);
      });
    }
    accumulateCombatKeystoneStats(bucket, owner) {
      this.forEachActiveKeystoneDef(owner, (def) => (Array.isArray(def.stats) ? def.stats : []).forEach((line) => addStatToBucket(bucket, line.stat, line.val)));
    }
    getActiveAscendKeystoneUniqueEffects(owner) {
      const out = [];
      this.forEachActiveKeystoneDef(owner, (def) => (Array.isArray(def.uniques) ? def.uniques : []).forEach((unique) => {
        out.push({ key: unique.key, params: Object.assign({}, unique.params || {}), itemName: "전직 키스톤: " + def.name, sourceSlot: "ascendKeystone" });
      }));
      return out;
    }
    pushBuildKeystoneUniqueEffects(target, owner, talent) {
      this.getActiveAscendKeystoneUniqueEffects(owner).concat(talent).forEach((effect) => {
        if (effect && effect.key) target.push(effect);
      });
    }
    mergeBetterUniqueParams(previous, next) {
      if (!previous) return next;
      const merged = { ...previous };
      Object.keys(next).forEach((name) => {
        merged[name] = LOWER_IS_BETTER_UNIQUE_PARAMS.has(name) ? Math.min(previous[name], next[name]) : Math.max(previous[name], next[name]);
      });
      return merged;
    }
    accumulateCombatLoopStats(bucket, loopBonus, deepBonus, season, owner) {
      const loop = loopBonus || {};
      addStatToBucket(bucket, "flatHp", (loop.flatHp || 0) * 12);
      addStatToBucket(bucket, "flatDmg", (loop.flatDmg || 0) * 3);
      addStatToBucket(bucket, "aspd", (loop.aspd || 0) * 1.5);
      addStatToBucket(bucket, "move", (loop.move || 0) * 1);
      this.accumulateCombatDeepLoopStats(bucket, deepBonus || {});
      this.accumulateWorldTreeBarkStats(bucket, season, owner);
    }
    accumulateWorldTreeBarkStats(bucket, season, owner) {
      const layers = this.deps.barkLayers(season), effect = this.getWorldTreeBarkEffect(owner);
      addStatToBucket(bucket, "pctHp", layers * this.deps.WORLD_TREE_BARK.pctHp);
      addStatToBucket(bucket, "genericTakenDamageReducePct", layers * this.deps.WORLD_TREE_BARK.taken + effect.takenPct);
      addStatToBucket(bucket, "move", effect.movePct);
    }
    isWorldTreeBarkZone(zone, owner) {
      if (!zone || !["act", "abyss"].includes(zone.type) || !this.deps.barkLayers(owner.season)) return false;
      return Number(zone.id) < this.deps.barkReach(owner) && Number(zone.id) >= Math.max(0, Math.floor(owner.maxZoneId || 0));
    }
    getWorldTreeBarkEffect(owner) {
      if (!this.isWorldTreeBarkZone(this.deps.zone(owner.currentZoneId), owner)) return WORLD_TREE_BARK_NO_EFFECT;
      const total = (key) => Math.max(0, Math.floor(Number(owner.worldTreeBark[key]) || 0)) * this.deps.WORLD_TREE_BARK.stats.find((def) => def.key === key).per;
      return { on: true, damagePct: total("damage"), takenPct: total("taken"), movePct: total("move") };
    }
    accumulateCombatDeepLoopStats(bucket, deep) {
      this.deps.LOOP_DEEP_STATS.forEach((def) => {
        if (def.stat) addStatToBucket(bucket, def.stat, (deep[def.key] || 0) * def.per);
      });
    }
    getLoopDeepMorePct(deep) {
      return this.deps.LOOP_DEEP_STATS.reduce((sum, def) => sum + (def.more === "damage" ? Math.max(0, Number((deep || {})[def.key]) || 0) * def.per : 0), 0);
    }
    accumulateCombatRuneStats(bucket, runeState = {}) {
      const result = { runeCorpseExplodeChance: 0, runeCorpseExplodeLifePct: 0, runeResonancePower: 0 };
      if (!Array.isArray(this.deps.UNDERWORLD_RUNE_DB)) return result;
      const state = runeState || {};
      const cap = Math.max(0, Math.min(6, Math.floor(state.unlockedSlots || 0)));
      const equipped = Array.isArray(state.equippedRunes) ? state.equippedRunes.slice(0, cap) : [];
      equipped.forEach((no) => this.accumulateCombatRuneEntry(bucket, result, state, no));
      return result;
    }
    accumulateCombatRuneEntry(bucket, result, state, no) {
      const number = Math.floor(Number(no) || 0);
      if (number <= 0) return;
      const rune = this.deps.UNDERWORLD_RUNE_DB.find((row) => row.no === number);
      if (!rune) return;
      const level = Math.max(0, Math.floor(state.enhanceLvByNo?.[number] || 0));
      const value = Number(rune.val || 0) * (1 + level * 0.01);
      const special = { corpseExplodeChance: "runeCorpseExplodeChance", corpseExplodeLifePct: "runeCorpseExplodeLifePct", resonancePower: "runeResonancePower" };
      if (Object.hasOwn(special, rune.stat)) result[special[rune.stat]] += value;
      else addStatToBucket(bucket, rune.stat, value);
      const lines = state.bonusLinesByNo?.[number];
      if (Array.isArray(lines)) lines.forEach((line) => {
        if (line && line.stat) addStatToBucket(bucket, line.stat, Number(line.val || 0));
      });
    }
    getBonusResonancePower(runePower, reward, passive, gear) {
      return runePower + Math.max(0, Number(reward.runeResonancePower) || 0) + Math.max(0, Number(passive.runeResonancePower) || 0) + Math.max(0, Number(gear.runeResonancePower) || 0);
    }
    addConstellationBuffStat(reward, owner) {
      const constellation = owner.meteorSite && owner.meteorSite.constellationBuff;
      if (constellation && constellation.stat) addStatToBucket(reward, constellation.stat, constellation.val || 0);
    }
    /** The caller has already added the constellation and applied passive conversions, in that order. */
    readRequirementAttributes(buckets) {
      const total = (stat) => Math.max(0, Object.values(buckets).reduce((sum, bucket) => sum + (bucket[stat] || 0), 0));
      return { strength: total("strength"), dexterity: total("dexterity"), intelligence: total("intelligence") };
    }
    /** memo is for one unchanged build/equipment view. Its buckets remain prototypes, not flattened or serialized data. */
    getCombatEquipmentContributions(resolvedSources, excludedSlots, owner, memo) {
      let result = memo?.get("combat-equipment");
      if (!result) {
        result = {
          gearBase: createEmptyStatBucket(),
          gearExplicit: createEmptyStatBucket(),
          localDefenseTotals: { armor: 0, evasion: 0, energyShield: 0 },
          globalDefensePct: { armor: 0, evasion: 0, energyShield: 0 },
          shieldArmorForDamage: 0,
          shieldBaseBlockChance: 0,
          shieldBlockChancePct: 0,
          shieldBlockChanceFlat: 0,
          equippedUniqueEffects: []
        };
        const included = [];
        for (const source of resolvedSources) {
          const [, item] = source;
          if (excludedSlots.has(item.slot) || excludedSlots.has("all:" + item.slot)) continue;
          this.accumulateCombatEquipmentItem(result, source, owner);
          included.push(item);
        }
        this.accumulateUniqueEffectStatLines(result, included, owner);
        memo?.set("combat-equipment", result);
      }
      if (!memo) return result;
      return {
        ...result,
        gearBase: Object.create(result.gearBase),
        gearExplicit: Object.create(result.gearExplicit),
        equippedUniqueEffects: result.equippedUniqueEffects.slice()
      };
    }
    countRipeStumpGrowth(owner) {
      const box = owner.stumpBox;
      if (!box || !Array.isArray(box.board) || !Array.isArray(box.items)) return 0;
      const onBoard = new Set(box.board.filter((id) => id !== null));
      return box.items.filter((item) => onBoard.has(item.id) && item.ripe === true && item.family === "seed").length;
    }
    uniqueEffectContext(items, owner) {
      const anointNodes = (item) => item.anoint ? [item.anoint.nodeId, item.anoint.second].filter(Boolean).length : 0;
      return {
        loop: Math.max(1, Math.floor(Number(owner.season) || 1)),
        horizontal: items.filter((item) => this.deps.BASE_ITEM_DB.some((base) => base.id === item.baseId && base.family)).length,
        uniques: items.filter((item) => item.rarity === "unique").length,
        rares: items.filter((item) => item.rarity === "rare").length,
        empty: UNIQUE_EFFECT_GEAR_SLOTS.filter((slot) => !items.includes((owner.equipment || {})[slot])).length,
        wards: this.deps.colonyWards ? this.deps.colonyWards.openSlots(owner).filter((slot) => this.deps.colonyWards.isWard((owner.equipment || {})[slot])).length : 0,
        corrupted: items.filter((item) => item.corrupted === true).length,
        quality: items.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.quality) || 0)), 0),
        anoints: items.reduce((sum, item) => sum + anointNodes(item), 0),
        stumpMature: this.countRipeStumpGrowth(owner)
      };
    }
    accumulateUniqueEffectStatLines(result, items, owner) {
      const effects = result.equippedUniqueEffects.filter((effect) => Object.hasOwn(UNIQUE_EFFECT_STAT_LINES, effect.key));
      if (!effects.length) return;
      const context = this.uniqueEffectContext(items, owner);
      for (const effect of effects) {
        for (const line of UNIQUE_EFFECT_STAT_LINES[effect.key](effect.params || {}, context)) {
          if (line.id === "blockChance") result.shieldBlockChanceFlat += line.val;
          else addStatToBucket(result.gearExplicit, line.id, line.val);
        }
      }
    }
    accumulateCombatEquipmentItem(result, [slotKey, item, resolved], owner) {
      for (const [sourceSlot, source] of [[slotKey, item], [resolved.mirrorSourceSlot, resolved.mirrorSourceItem]]) {
        if (source?.rarity === "unique" && source.uniqueEffectKey) {
          result.equippedUniqueEffects.push({
            key: source.uniqueEffectKey,
            params: source.uniqueEffectParams || null,
            itemName: source.name || "",
            sourceSlot
          });
        }
      }
      applyStatsToBucket(result.gearBase, resolved.baseStats);
      applyStatsToBucket(result.gearExplicit, resolved.explicitStats);
      this.accumulateCombatItemDefenses(result, slotKey, item, resolved);
      this.accumulateCombatSocketJewels(result, item, owner);
    }
    accumulateCombatSocketJewels(result, item, owner) {
      const socketMultiplier = this.getSocketJewelMultiplier(owner);
      for (const row of this.deps.equipmentSockets.jewels(item)) {
        this.addSocketJewelStats(result, row.jewel, socketMultiplier * (row.kind === "abyss" ? this.getAbyssJewelMultiplier(item) : 1));
      }
      for (const row of this.deps.equipmentSockets.harvests(item)) {
        this.deps.stumpBox.socketLines(row.harvest).forEach((line) => addStatToBucket(result.gearExplicit, line.stat, line.value));
      }
    }
    getSocketJewelMultiplier(owner) {
      const lord = this.deps.keystoneActive("wlk8", owner) ? SOCKET_JEWEL_BONUS.warlockLord : 0;
      const greed = this.deps.voidPassiveCount("greed", owner) > 0 ? SOCKET_JEWEL_BONUS.greed : 0;
      return 1 + lord + greed;
    }
    addSocketJewelStats(result, jewel, multiplier) {
      this.deps.jewelStats(jewel).forEach((stat) => {
        const value = Number((Number(stat.val || 0) * multiplier).toFixed(2));
        addStatToBucket(result.gearExplicit, stat.id, value);
        this.addGlobalDefensePct(result.globalDefensePct, stat.id, value);
      });
    }
    addGlobalDefensePct(target, statId, value) {
      if (Object.hasOwn(DEFENSE_PCT_KINDS, statId)) target[DEFENSE_PCT_KINDS[statId]] += value;
    }
    accumulateCombatItemDefenses(result, slotKey, item, resolved) {
      const base = { armor: 0, evasion: 0, energyShield: 0 };
      const flat = { ...base }, pct = { ...base };
      resolved.baseStats.forEach((stat) => {
        if (!stat) return;
        if (Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0);
        const offhandWeapon = slotKey === "방패" && item.slot === "무기";
        if (stat.id === "baseBlockChance" && !offhandWeapon) result.shieldBaseBlockChance += Number(stat.val || 0);
      });
      const addExplicit = (stat) => this.accumulateCombatDefenseLine(result, flat, pct, stat);
      resolved.explicitStats.forEach((stat) => {
        if (!stat) return;
        addExplicit(stat);
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(addExplicit);
      });
      const armor = (base.armor + flat.armor) * (1 + pct.armor / 100);
      for (const kind of Object.keys(base)) if (base[kind] + flat[kind] <= 0) result.globalDefensePct[kind] += pct[kind];
      result.localDefenseTotals.armor += armor;
      result.localDefenseTotals.evasion += (base.evasion + flat.evasion) * (1 + pct.evasion / 100);
      result.localDefenseTotals.energyShield += (base.energyShield + flat.energyShield) * (1 + pct.energyShield / 100);
      if (slotKey === "방패" && item.slot === "방패") result.shieldArmorForDamage = Math.max(0, armor);
    }
    accumulateCombatDefenseLine(result, flat, pct, stat) {
      if (!stat) return;
      const value = Number(stat.val || 0);
      if (Object.hasOwn(flat, stat.id)) flat[stat.id] += value;
      const percentKey = { armorPct: "armor", evasionPct: "evasion", energyShieldPct: "energyShield" }[stat.id];
      if (Object.hasOwn(pct, percentKey)) pct[percentKey] += value;
      if (stat.id === "baseBlockChance") result.shieldBaseBlockChance += value;
      if (stat.id === "blockChancePct") result.shieldBlockChancePct += value;
      if (stat.id === "blockChance") result.shieldBlockChanceFlat += value;
    }
    getAbyssJewelMultiplier(item) {
      if (!item || item.uniqueEffectKey !== "abyssSocketAndJewelAmp") return 1;
      const params = item.uniqueEffectParams || {};
      const min = Number(params.ampMin || 1), max = Number(params.ampMax || 100);
      const pct = Number.isFinite(Number(params.ampPct)) ? Number(params.ampPct) : (min + max) / 2;
      return 1 + pct / 100;
    }
  };
  var LOWER_IS_BETTER_UNIQUE_PARAMS = /* @__PURE__ */ new Set(["cooldown", "cooldownSec", "icdSec", "minEnemies"]);
  var WORLD_TREE_BARK_NO_EFFECT = Object.freeze({ on: false, damagePct: 0, takenPct: 0, movePct: 0 });
  var perCountLines = (count, max, lines) => lines.map(([id, per]) => ({ id, val: Math.min(Number(max) || 0, count) * (Number(per) || 0) }));
  var UNIQUE_EFFECT_STAT_LINES = Object.freeze({
    loopGrowth: (p, context) => perCountLines(context.loop, p.maxLoops, [["pctHp", p.hpPerLoop], ["pctDmg", p.dmgPerLoop]]),
    familyBond: (p, context) => perCountLines(context.horizontal, p.maxPieces, [["pctDmg", p.dmgPer], ["resAll", p.resPer]]),
    // 탐험 지도 시야 상한(js/act-exploration-state.js sightRadius)과 보급 상자 등급 확률(js/exploration-object-combat.js chestRules).
    sightBeyond: (p) => [{ id: "sightCap", val: Number(p.cap) || 0 }],
    // 되감긴 모래시계: 재사용 대기시간 감소 상한(js/skills.js getSkillCooldownMs, 기본 60%)을 올린다.
    cooldownReductionCap: (p) => [{ id: "cooldownReductionCapBonus", val: Number(p.pct) || 0 }],
    chestLuck: (p) => [{ id: "chestGrade", val: Number(p.gradePct) || 0 }],
    // 리그 우두머리 고유: 잿불 터(타락), 수액 상처(품질), 시든 정원(목걸이 기름), 묘목장(그루터기 함).
    emberHeart: (p, context) => perCountLines(context.corrupted, p.max, [["pctDmg", p.dmgPer], ["resF", p.resPer]]),
    amberTime: (p, context) => perCountLines(Math.floor(context.quality / (Number(p.qualityStep) || 10)), p.max, [["pctDmg", p.dmgPer], ["pctHp", p.hpPer]]),
    witheredEcho: (p, context) => perCountLines(context.anoints, p.max, [["pctDmg", p.dmgPer], ["resChaos", p.resPer]]),
    nurseryBloom: (p, context) => perCountLines(context.stumpMature, p.max, [["pctHp", p.hpPer], ["pctDmg", p.dmgPer]]),
    // 체이싱 고유(2026-10-20): 착용한 고유 장비(달을 벤 초승달), 희귀 장비(세계수의 첫 껍질), 장착한 액막이(고요한 맹세), 빈 장비
    // 칸(비워 둔 자리)의 수만큼.
    uniqueChorus: (p, context) => perCountLines(context.uniques, p.max, [["pctDmg", p.dmgPer], ["aspd", p.aspdPer]]),
    rareBark: (p, context) => perCountLines(context.rares, p.max, [["pctHp", p.hpPer], ["resAll", p.resPer]]),
    wardVow: (p, context) => perCountLines(context.wards, p.max, [["blockChance", p.blockPer], ["dr", p.drPer]]),
    emptyPlaces: (p, context) => perCountLines(context.empty, p.max, [["pctDmg", p.dmgPer], ["pctHp", p.hpPer]])
  });
  var UNIQUE_EFFECT_GEAR_SLOTS = Object.freeze(["무기", "투구", "갑옷", "방패", "장갑1", "장갑2", "신발", "목걸이", "반지1", "반지2", "허리띠"]);
  var SOCKET_JEWEL_BONUS = Object.freeze({ warlockLord: 0.25, greed: 0.1 });
  var DEFENSE_PCT_KINDS = Object.freeze({ armorPct: "armor", evasionPct: "evasion", energyShieldPct: "energyShield" });
  function createCombatBuildStats(deps) {
    const runtime = new CombatBuildStats(deps);
    return Object.freeze({
      accumulateCombatSeasonStats: runtime.accumulateCombatSeasonStats.bind(runtime),
      accumulateCombatAscendStats: runtime.accumulateCombatAscendStats.bind(runtime),
      forEachActiveKeystoneDef: runtime.forEachActiveKeystoneDef.bind(runtime),
      pushBuildKeystoneUniqueEffects: runtime.pushBuildKeystoneUniqueEffects.bind(runtime),
      mergeBetterUniqueParams: runtime.mergeBetterUniqueParams.bind(runtime),
      accumulateCombatLoopStats: runtime.accumulateCombatLoopStats.bind(runtime),
      accumulateWorldTreeBarkStats: runtime.accumulateWorldTreeBarkStats.bind(runtime),
      isWorldTreeBarkZone: runtime.isWorldTreeBarkZone.bind(runtime),
      getWorldTreeBarkEffect: runtime.getWorldTreeBarkEffect.bind(runtime),
      getLoopDeepMorePct: runtime.getLoopDeepMorePct.bind(runtime),
      accumulateCombatRuneStats: runtime.accumulateCombatRuneStats.bind(runtime),
      getBonusResonancePower: runtime.getBonusResonancePower.bind(runtime),
      addConstellationBuffStat: runtime.addConstellationBuffStat.bind(runtime),
      readRequirementAttributes: runtime.readRequirementAttributes.bind(runtime),
      getCombatEquipmentContributions: runtime.getCombatEquipmentContributions.bind(runtime),
      getSocketJewelMultiplier: runtime.getSocketJewelMultiplier.bind(runtime),
      addGlobalDefensePct: runtime.addGlobalDefensePct.bind(runtime),
      getAbyssJewelMultiplier: runtime.getAbyssJewelMultiplier.bind(runtime)
    });
  }

  // modules/combat-build-stats-classic.mjs
  var build = createCombatBuildStats({
    seasonNode: (id) => getSeasonPassiveNodeDef(id),
    classTree: (id) => getClassTreeDef(id),
    keystoneActive: (id, owner) => hasKeystone(id, owner),
    keystoneClass: (id) => getAscendKeystoneOwnerClass(id),
    barkLayers: (season) => getWorldTreeBarkLayers(season),
    barkReach: (owner) => getWorldTreeBarkReach(owner),
    zone: (id) => getZone(id),
    jewelStats: (item) => getJewelStats(item),
    voidPassiveCount: (id, owner) => getTranscendentVoidPassiveCount(id, owner),
    get CLASS_KEYSTONE_DEFS() {
      return CLASS_KEYSTONE_DEFS;
    },
    get WORLD_TREE_BARK() {
      return WORLD_TREE_BARK;
    },
    get LOOP_DEEP_STATS() {
      return LOOP_DEEP_STATS;
    },
    get UNDERWORLD_RUNE_DB() {
      return UNDERWORLD_RUNE_DB;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get colonyWards() {
      return typeof colonyWards === "object" ? colonyWards : null;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get stumpBox() {
      return stumpBox;
    }
  });
  var pushBuildKeystoneUniqueEffects = (target, owner = game) => {
    const talent = typeof getActiveTalentKeystoneUniqueEffects === "function" ? getActiveTalentKeystoneUniqueEffects() : [];
    return build.pushBuildKeystoneUniqueEffects(target, owner, talent);
  };
  var readRequirementAttributes = (buckets, owner) => {
    build.addConstellationBuffStat(buckets.reward, owner);
    if (typeof applyPassiveKeystoneBucketRules === "function") applyPassiveKeystoneBucketRules(buckets);
    return build.readRequirementAttributes(buckets);
  };
  var accumulateCombatAscendStats = (bucket, ids, heroClass) => build.accumulateCombatAscendStats(bucket, ids, heroClass, game);
  var accumulateCombatLoopStats = (bucket, loop, deep, season) => build.accumulateCombatLoopStats(bucket, loop, deep, season, game);
  var accumulateWorldTreeBarkStats = (bucket, season) => build.accumulateWorldTreeBarkStats(bucket, season, game);
  var isWorldTreeBarkZone = (zone, owner = game) => build.isWorldTreeBarkZone(zone, owner);
  var getWorldTreeBarkEffect = (owner = game) => build.getWorldTreeBarkEffect(owner);
  var getSocketJewelMultiplier = (owner = game) => build.getSocketJewelMultiplier(owner);
  var getCombatEquipmentContributions = (sources, excluded, owner = game) => build.getCombatEquipmentContributions(sources, excluded, owner, getBackgroundBuildMemo(owner));
  var {
    accumulateCombatSeasonStats,
    forEachActiveKeystoneDef,
    mergeBetterUniqueParams,
    getLoopDeepMorePct,
    accumulateCombatRuneStats,
    getBonusResonancePower,
    addConstellationBuffStat,
    addGlobalDefensePct,
    getAbyssJewelMultiplier
  } = build;
  safeExposeGlobals({
    accumulateCombatSeasonStats,
    accumulateCombatAscendStats,
    forEachActiveKeystoneDef,
    pushBuildKeystoneUniqueEffects,
    mergeBetterUniqueParams,
    accumulateCombatLoopStats,
    accumulateWorldTreeBarkStats,
    isWorldTreeBarkZone,
    getWorldTreeBarkEffect,
    getLoopDeepMorePct,
    accumulateCombatRuneStats,
    getBonusResonancePower,
    addConstellationBuffStat,
    readRequirementAttributes,
    getCombatEquipmentContributions,
    getSocketJewelMultiplier,
    addGlobalDefensePct,
    getAbyssJewelMultiplier
  });
})();
