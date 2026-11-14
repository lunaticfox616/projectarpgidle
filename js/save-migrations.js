// GENERATED from modules/save-migrations*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/persistence/saved-monster-identity.mjs
  function migrateRetiredWoodMonsters(deps2, merged) {
    const skins = merged.unlockedMonsterSkins;
    if (skins && typeof skins === "object") Object.entries(deps2.RETIRED_WOOD_MONSTER_SKINS).forEach(([old, next]) => {
      if (skins[old]) skins[next] = true;
      delete skins[old];
    });
    merged.selectedMonsterSkin = deps2.RETIRED_WOOD_MONSTER_SKINS[merged.selectedMonsterSkin] || merged.selectedMonsterSkin;
    const zone = Number.isInteger(merged.currentZoneId) && merged.currentZoneId < deps2.ACT_ZONE_COUNT ? deps2.MAP_ZONES[merged.currentZoneId] : null;
    const packs = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...packs.map((pack) => pack?.waiting)].filter(Array.isArray).flat().forEach((enemy) => {
      retireWoodMonsterVisual(deps2, enemy, zone);
      resetRedrawnRealmAttack(deps2, enemy);
    });
  }
  function migrateRetiredRealmMonsters(deps2, merged) {
    const skins = merged.unlockedMonsterSkins;
    if (skins && typeof skins === "object") Object.entries(deps2.RETIRED_REALM_MONSTERS).forEach(([old, next]) => {
      if (skins[old]) skins[next] = true;
      delete skins[old];
    });
    merged.selectedMonsterSkin = deps2.RETIRED_REALM_MONSTERS[merged.selectedMonsterSkin] || merged.selectedMonsterSkin;
    const packs = Array.isArray(merged.actExploration?.packs) ? merged.actExploration.packs : [];
    [merged.enemies, ...packs.map((pack) => pack?.waiting)].filter(Array.isArray).flat().forEach(((...args) => retireRealmMonsterVisual(deps2, ...args)));
  }
  function retireRealmMonsterVisual(deps2, enemy) {
    const next = enemy && deps2.RETIRED_REALM_MONSTERS[enemy.monsterVisualId], def = next ? (0, deps2.getRealmMonsterVisualDefinitionById)(next) : null;
    if (!def) return;
    if (enemy.baseMonsterName && typeof enemy.name === "string") enemy.name = enemy.name.replace(enemy.baseMonsterName, def.name);
    Object.assign(enemy, { monsterVisualId: def.id, baseMonsterName: def.name });
    ["attackKind", "attackRange", "attackDelivery", "projectileToEdge", "attackCastMs", "attackLabel"].forEach((key) => delete enemy[key]);
  }
  function resetRedrawnRealmAttack(deps2, enemy) {
    const kind = enemy && enemy.monsterVisualId ? (0, deps2.getMonsterVisualAttackKind)(enemy.monsterVisualId) : null;
    if (!kind || !enemy.attackKind || enemy.isBoss || enemy.attackKind === kind) return;
    ["attackKind", "attackRange", "attackDelivery", "projectileToEdge", "attackCastMs", "attackLabel"].forEach((key) => delete enemy[key]);
  }
  function retireWoodMonsterVisual(deps2, enemy, zone) {
    if (!enemy || !/^(woodSlime|rootSpider|sapLeech|woodPuppet)-\d+$/.test(enemy.spriteVariantId || "")) return;
    const pool = (0, deps2.getActMonsterPool)(zone), def = deps2.ACT_MONSTER_VISUAL_BY_ID[pool[Math.abs(Math.floor(Number(enemy.variantSeed) || 0)) % pool.length]];
    if (enemy.baseMonsterName && typeof enemy.name === "string") enemy.name = enemy.name.replace(enemy.baseMonsterName, def.name);
    Object.assign(enemy, { spriteVariantId: def.id, baseMonsterName: def.name });
    ["attackKind", "attackRange", "attackDelivery", "projectileToEdge", "attackCastMs", "attackLabel"].forEach((key) => delete enemy[key]);
  }
  function restoreSavedBossPicture(deps2, record2, state) {
    if (!record2.isBoss || record2.roomInvader || record2.uninvited) return;
    const zoneId = state.currentZoneId;
    if (zoneId === deps2.LABYRINTH_ZONE_ID) {
      record2.monsterVisualId = (0, deps2.getLabyrinthZoneNow)(state.labyrinthFloor).bossVisualId;
      (0, deps2.assignEnemyGridCombatProfile)(record2);
      return;
    }
    const visual = deps2.bossLooks.get(zoneId);
    if (visual && record2.monsterVisualId !== visual) {
      record2.monsterVisualId = visual;
      record2.spriteVariantId = null;
    }
    if (/^bossAct10_[1345]$/.test(record2.bossAssetKey)) record2.bossAssetKey = deps2.ACT_BOSS_ASSET_KEYS[9];
  }

  // modules/persistence/saved-retired-definitions.mjs
  var RETIRED_TAB_BUTTON_IDS = Object.freeze(["btn-tab-pruning", "btn-tab-arcana", "btn-tab-expertise"]);
  var METEOR_SITE_SAVE_KEYS = Object.freeze([
    "unlocked",
    "skyRiftGauge",
    "skyRiftReady",
    "skyRiftMinTier",
    "skyRiftAllCosmos",
    "activeMeteorTier",
    "meteorReturnZoneId",
    "lastAnomalyAt",
    "skyRiftCarryGauge",
    "constellationBuff",
    "entriesCleared"
  ]);
  var RETIRED_STAR_WEDGE_CURRENCIES = Object.freeze(["meteorShard", "incompleteStarWedge", "starWedge", "astralCore"]);
  var RETIRED_SPORE_CURRENCIES = Object.freeze(["sporeFire", "sporeCold", "sporeLight"]);
  var RETIRED_EXPERT_ACCESS = Object.freeze([
    ["mycologist", 4, "fossilRestore"],
    ["mycologist", 7, "advancedSpores"],
    ["gemEngraver", 12, "gemAwakening"]
  ]);
  var REMOVED_AFFIX_KEEP_REFUND = 4;

  // modules/persistence/saved-equipment.mjs
  function savedItemsOf(merged) {
    const offline = merged.offlineProgress || {}, rift = merged.timeRift || {};
    const presets = ((merged.equipmentLoadouts || {}).presets || []).filter(Boolean).flatMap((preset) => Object.values(preset.slots || {}));
    const listings = ((merged.playerStall || {}).listings || []).map((row) => row && row.item);
    return [
      merged.inventory,
      Object.values(merged.equipment || {}),
      merged.equipmentTemporaryStorage,
      offline.stash,
      offline.protectedOverflow,
      rift.altarUnique,
      rift.altarRare,
      presets,
      listings
    ].flat().filter((item) => item && typeof item === "object");
  }
  function markLegacyEquipmentGrace(equipment) {
    Object.values(equipment).forEach((item) => {
      if (item && !item.requirementsVersion) item.legacyRequirementGrace = true;
    });
  }
  function normalizeCarriedEquipmentSave(deps2, state) {
    state.inventory = (state.inventory || []).map(deps2.normalizeItem);
    state.equipmentTemporaryStorage = Array.isArray(state.equipmentTemporaryStorage) ? state.equipmentTemporaryStorage.map(deps2.normalizeItem) : [];
    Object.keys(state.equipment).forEach((slot) => state.equipment[slot] = (0, deps2.normalizeItem)(state.equipment[slot]));
  }
  function normalizeStoredEquipmentSave(deps2, state) {
    const snapshots = [state, state.woodsmanBuildSnapshot].filter((row) => row && typeof row === "object");
    const items = snapshots.flatMap(savedItemsOf).concat(deps2.actExplorationLoot.reservedItems(state), deps2.actExplorationState.groundLoot.reservedItems(state));
    for (const item of new Set(items)) {
      if (item && typeof item.slot === "string" && Array.isArray(item.baseStats)) (0, deps2.normalizeItem)(item);
    }
  }
  function normalizeEquipmentCraftChoiceSave(deps2, state) {
    state.craftChoice = (0, deps2.normalizeCraftChoice)(state.craftChoice);
    if (!state.craftChoice) return;
    const item = savedItemsOf(state).find((row) => row.id === state.craftChoice.itemId && ["방패", "무기"].includes(row.slot));
    if (!item) return;
    state.craftChoice.options.forEach((fields) => {
      const named = { ...fields, slot: item.slot, baseId: item.baseId, baseName: item.baseName };
      (0, deps2.normalizeArmGuardIdentity)(named);
      fields.name = named.name;
    });
  }
  function keepLegacyAccessorySockets(deps2, merged, save) {
    if ((save.saveVersion || 0) >= 19 || typeof deps2.equipmentSockets !== "object") return;
    legacySocketStores(merged).flat().forEach(deps2.equipmentSockets.keepLegacySocket);
  }
  function legacySocketStores(merged) {
    const rift = merged.timeRift || {}, offline = merged.offlineProgress || {};
    const presets = ((merged.equipmentLoadouts || {}).presets || []).filter(Boolean).flatMap((preset) => Object.values(preset.slots || {}));
    const stall = ((merged.playerStall || {}).listings || []).map((row) => row && row.item);
    return [
      merged.inventory,
      Object.values(merged.equipment || {}),
      rift.altarUnique,
      rift.altarRare,
      offline.stash,
      offline.protectedOverflow,
      merged.equipmentTemporaryStorage,
      presets,
      stall
    ];
  }
  function renameRetiredUniques(deps2, state) {
    const rename = (item) => {
      if (item && item.rarity === "unique" && deps2.RENAMED_UNIQUES[item.name]) item.name = deps2.RENAMED_UNIQUES[item.name];
    };
    savedItemsOf(state).forEach(rename);
    state.seasonChaseUniqueDrops = state.seasonChaseUniqueDrops.map((name) => deps2.RENAMED_UNIQUES[name] || name);
    const owned = new Map(savedItemsOf(state).filter((item) => item && Array.isArray(item.baseStats)).map((item) => [item.id, item]));
    (state.equipmentLoadouts?.presets || []).forEach((preset) => Object.entries(preset?.slots || {}).forEach(([slot, ref]) => {
      if (!ref) return;
      if (owned.has(ref.id)) {
        ref.name = owned.get(ref.id).name;
        return;
      }
      const named = { slot, name: deps2.RENAMED_UNIQUES[ref.name] || ref.name };
      (0, deps2.normalizeArmGuardIdentity)(named);
      ref.name = named.name;
    }));
  }
  function reconcileUniqueEquipmentSave(deps2, state) {
    renameRetiredUniques(deps2, state);
    savedItemsOf(state).forEach(deps2.equipmentSockets.migrateHarvest);
    Object.values(state.npcShops || {}).forEach((shop) => (Array.isArray(shop?.offers) ? shop.offers : []).forEach((ware) => {
      if (ware?.item) ware.item = (0, deps2.normalizeItem)(ware.item);
    }));
    for (const [slot, item] of Object.entries(state.equipment)) {
      if (!item?.uniqueBaseLegacy || (0, deps2.getEquipCandidateSlots)(item, state).includes(slot)) continue;
      delete item.legacyRequirementGrace;
      state.inventory.push(item);
      state.equipment[slot] = null;
    }
    state.timeRift.altarUnique = (0, deps2.normalizeItem)(state.timeRift.altarUnique);
    migrateUniqueCodexKeys(deps2, state.uniqueCodex);
    migrateUniqueCodexKeys(deps2, state.codexNewlyRegistered);
    deps2.equipmentInventoryGridRuntime.ensureState(state);
  }
  function migrateUniqueCodexKeys(deps2, records) {
    for (const [key, found] of Object.entries(records)) {
      const next = migrateUniqueCodexKey(deps2, key);
      if (found && typeof found === "object" && found.rarity === "unique") {
        found.name = deps2.RENAMED_UNIQUES[found.name] || found.name;
        (0, deps2.normalizeItem)(found);
      }
      if (next === key) continue;
      if (found && typeof found === "object") found.slot = next.split("|")[0];
      records[next] || (records[next] = found);
      delete records[key];
    }
  }
  function migrateUniqueCodexKey(deps2, key) {
    const text = String(key), cut = text.indexOf("|");
    const written = text.slice(cut + 1), name = deps2.RENAMED_UNIQUES[written] || written;
    const keptSlot = name !== written && cut > 0 ? text.slice(0, cut) : "";
    const slot = deps2.UNIQUE_EQUIPMENT_RULES[name]?.slot || keptSlot;
    return slot ? `${slot}|${name}` : key;
  }
  function normalizeUniqueHuntSave(deps2, state) {
    state.uniqueHuntTargets = Array.isArray(state.uniqueHuntTargets) ? state.uniqueHuntTargets.map(((...args) => migrateUniqueCodexKey(deps2, ...args))) : [];
    if (typeof deps2.uniqueHuntRuntime !== "undefined") deps2.uniqueHuntRuntime.ensureState(state);
  }

  // modules/persistence/saved-retired-systems.mjs
  function stripRemovedGrowthBoard(merged) {
    ["growthBoard", "growthInventory", "recentGrowthDrops", "growthInventoryExpandLevel", "growthEssenceExpandLevel", "growthCodex"].forEach((key) => delete merged[key]);
    ["growthSortMode", "growthAutoSalvageEnabled", "growthAutoSalvageRarities", "growthUseItemFilter", "growthInventoryFilter"].forEach((key) => delete merged.settings[key]);
    [[merged.settings.searchFilters, "growth"], [merged.currencies, "growthEssence"], [merged.unlocks, "growthboard"], [merged.noti, "growthboard"]].forEach(([row, key]) => {
      if (row && typeof row === "object") delete row[key];
    });
  }
  function moveStarWedgeSaveToMeteorSite(deps2, merged, save) {
    const legacy = save.starWedge && typeof save.starWedge === "object" ? save.starWedge : null;
    if (legacy && !(save.meteorSite && typeof save.meteorSite === "object")) {
      merged.meteorSite = Object.fromEntries(METEOR_SITE_SAVE_KEYS.filter((key) => key in legacy).map((key) => [key, legacy[key]]));
    }
    delete merged.starWedge;
    (0, deps2.ensureMeteorSiteState)(merged);
    if (Array.isArray(merged.journalEntries)) merged.journalEntries = merged.journalEntries.map((id) => id === "star_wedge" ? "meteor_fall" : id);
  }
  function stripRemovedStarWedges(merged) {
    RETIRED_STAR_WEDGE_CURRENCIES.forEach((key) => delete merged.currencies[key]);
    if (merged.woodsmanBuildSnapshot && typeof merged.woodsmanBuildSnapshot === "object") delete merged.woodsmanBuildSnapshot.starWedge;
    Object.keys(merged.retiredVoidPassives || {}).filter((id) => id.startsWith("star_")).forEach((id) => delete merged.retiredVoidPassives[id]);
  }
  function stripRetiredSpores(merged) {
    RETIRED_SPORE_CURRENCIES.forEach((key) => delete merged.currencies[key]);
  }
  function stripRemovedAuxSystems(deps2, merged) {
    ["arcana", "pruningTree", "expertise"].forEach((key) => delete merged[key]);
    ["arcana", "pruning", "expertise"].forEach((key) => {
      delete merged.unlocks[key];
      delete merged.noti[key];
    });
    delete merged.currencies.starDust;
    const choice = merged.beehive && merged.beehive.pendingChoice;
    if (choice && typeof choice === "object") {
      delete choice.expertLevel;
      ["a", "b", "c"].forEach((key) => {
        if (choice[key] && typeof choice[key] === "object") delete choice[key].expertLevel;
      });
    }
    deps2.colonyWards.migrate(merged);
    deps2.bagItems.migrate(merged);
    refundRemovedAffixKeep(merged);
  }
  function inheritRetiredExpertAccess(ledger, save) {
    const levels = save && save.expertise && save.expertise.levels;
    if (!levels || typeof levels !== "object") return;
    RETIRED_EXPERT_ACCESS.forEach(([expert, level, id]) => {
      const owned = ledger.unlocked.includes(id) || ledger.inherited.includes(id);
      if (!owned && (Number(levels[expert]) || 0) >= level) ledger.inherited.push(id);
    });
  }
  function stripCraftChoiceAffixKeep(merged) {
    ((merged.craftChoice || {}).options || []).forEach((fields) => {
      if (fields && typeof fields === "object") delete fields.affixKeep;
    });
  }
  function refundRemovedAffixKeep(merged) {
    const refunded = /* @__PURE__ */ new Set();
    for (const item of savedItemsOf(merged)) {
      if (!Object.hasOwn(item, "affixKeep")) continue;
      if (item.affixKeep === "prefix" || item.affixKeep === "suffix") refunded.add(String(item.id));
      delete item.affixKeep;
    }
    stripCraftChoiceAffixKeep(merged);
    if (!refunded.size || !merged.currencies || typeof merged.currencies !== "object") return;
    merged.currencies.goldenRule = Math.max(0, Math.floor(Number(merged.currencies.goldenRule) || 0)) + REMOVED_AFFIX_KEEP_REFUND * refunded.size;
  }
  function stripRemovedFlasks(merged) {
    delete merged.flasks;
    [[merged.settings && merged.settings.notiFilters, "flask"], [merged.noti, "flask"]].forEach(([row, key]) => {
      if (row && typeof row === "object") delete row[key];
    });
  }
  function retireOfflineGrowth(state) {
    const offline = state.offlineProgress && typeof state.offlineProgress === "object" ? state.offlineProgress : {};
    const items = [offline.stash, offline.protectedOverflow].flat().filter((item) => item && typeof item === "object");
    if (items.length) state.inventory.push(...items);
    delete state.offlineProgress;
    delete state.currencies.timeRemnant;
  }
  function restoreSeenUnlocks(deps2, merged, save) {
    const saved = Array.isArray(save.seenUnlocks) ? save.seenUnlocks.filter((id) => typeof id === "string") : null;
    merged.seenUnlocks = saved ? [...new Set(saved)] : deps2.CONTENT_UNLOCK_CATALOG.filter((def) => deps2.contentProgression.isUnlocked(def.id, merged)).map((def) => def.id);
  }
  function normalizeContentProgressionSave(deps2, merged, save) {
    merged.contentProgression = deps2.contentProgression.restore(save.contentProgression, merged, Object.keys(save).length > 0);
    retireOfflineGrowth(merged);
    inheritRetiredExpertAccess(merged.contentProgression, save);
    deps2.contentProgression.sync(merged);
    restoreSeenUnlocks(deps2, merged, save);
    if (deps2.TRIAL_ZONES.some((zone) => zone.id === merged.currentZoneId) && !deps2.contentProgression.isUnlocked("battleTrials", merged)) {
      merged.currentZoneId = 0;
      merged.enemies = [];
      merged.encounterPlan = [];
      merged.killsInZone = 0;
      merged.inTicketBossFight = false;
      merged.moveTimer = 0;
    }
    return merged;
  }

  // modules/persistence/legacy-summon-migration.mjs
  function pickGrownLegacySummonGem(gemData, names) {
    const growth = (name) => {
      const row = gemData[name] || {};
      return [Number(row.level) || 0, Number(row.exp) || 0];
    };
    return names.reduce((best, name) => {
      const [level, exp] = growth(name), [bestLevel, bestExp] = growth(best);
      return level > bestLevel || level === bestLevel && exp > bestExp ? name : best;
    });
  }
  function mergeGrownGemRecords(gemData, names) {
    const rows = names.map((name) => gemData[name]).filter((row) => row && typeof row === "object");
    const highestBy = (key) => rows.reduce((best, row) => (Number(row[key]) || 0) > (Number(best[key]) || 0) ? row : best, rows[0]);
    const boss = highestBy("bossCoreLevel"), sky = highestBy("skyCoreLevel"), tier = highestBy("unlockedTier");
    return {
      ...gemData[pickGrownLegacySummonGem(gemData, names)],
      bossCoreLevel: boss.bossCoreLevel,
      bossCoreFailures: boss.bossCoreFailures,
      skyCoreLevel: sky.skyCoreLevel,
      skyCoreFailures: sky.skyCoreFailures,
      skyEnhanceCap: Math.max(...rows.map((row) => Number(row.skyEnhanceCap) || 1)),
      unlockedTier: tier.unlockedTier,
      activeTier: tier.activeTier,
      quality: Math.max(...rows.map((row) => Number(row.quality) || 0)),
      awakened: rows.some((row) => !!row.awakened)
    };
  }

  // modules/persistence/saved-support-definitions.mjs
  var moved = Object.freeze({
    "물리 전령": "장군의 가호",
    "방어 상승": "장군의 가호",
    "화염 전령": "화염의 가호",
    "화염 장막": "화염의 가호",
    "냉기 전령": "한기의 가호",
    "냉기 장막": "한기의 가호",
    "번개 전령": "낙뢰의 가호",
    "번개 장막": "낙뢰의 가호",
    "카오스 전령": "심연의 가호",
    "공허 장막": "심연의 가호",
    "활력": "수액의 가호",
    "가벼운 발걸음": "수액의 가호",
    "수액 골렘 소환": "수액 골렘 소환"
  });
  var renamed = Object.freeze({
    "범위 확장": "범위 피해",
    "사역 피해 증폭": "소환수 피해 증폭",
    "사역 생명력": "소환수 생명력",
    "사역 가속": "소환수 가속",
    "사역 예리함": "소환수 예리함",
    "사역 무자비": "소환수 무자비"
  });

  // modules/persistence/saved-support-runes.mjs
  var list = (value) => Array.isArray(value) ? value : [];
  var record = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  var unique = (values) => [...new Set(values)];
  var successor = (name) => moved[name] || renamed[name] || name;
  var summon = (deps2, name) => (deps2.SKILL_DB[name]?.tags || []).some((tag) => ["summon_attack", "summon_buff", "summon_guard"].includes(tag));
  var single = (deps2, name) => !(deps2.SKILL_DB[name]?.tags || []).includes("summon_attack");
  var copy = (value) => JSON.parse(JSON.stringify(value));
  function mergeRecords(deps2, a, b, skill) {
    const rows = { a: (0, deps2.normalizeGemRecord)(a), b: (0, deps2.normalizeGemRecord)(b) };
    const out = (0, deps2.normalizeGemRecord)(mergeGrownGemRecords(rows, ["a", "b"]));
    if (skill) {
      out.unlockedTier = 1;
      out.activeTier = 1;
    }
    return out;
  }
  function renameSupports(deps2, state) {
    state.supportGemData = { ...record(state.supportGemData) };
    Object.entries(renamed).forEach(([from, to]) => {
      if (!Object.hasOwn(state.supportGemData, from)) return;
      state.supportGemData[to] = mergeRecords(deps2, state.supportGemData[to], state.supportGemData[from], false);
      delete state.supportGemData[from];
    });
    ["supports", "sealedSupports", "equippedSupports"].forEach((key) => {
      state[key] = unique(list(state[key]).map((name) => renamed[name] || name));
    });
  }
  function ownedSupportKind(state, name) {
    if (state.supports.includes(name) || state.equippedSupports.includes(name)) return "owned";
    if (state.sealedSupports.includes(name)) return "sealed";
    return Object.hasOwn(state.supportGemData, name) ? "owned" : null;
  }
  function moveOwned(deps2, state, name, report) {
    const to = moved[name], source = state.supportGemData[name];
    const holding = ownedSupportKind(state, name);
    if (!holding) return;
    state.gemData[to] = mergeRecords(deps2, state.gemData[to], source, true);
    if (holding === "owned") state.skills.push(to);
    else state.sealedSkills.push(to);
    const tier = name === "수액 골렘 소환" ? 1 : (0, deps2.normalizeGemRecord)(source).unlockedTier;
    report.tiers[name] = Math.max(report.tiers[name] || 1, tier);
    delete state.supportGemData[name];
  }
  function migrateLoadout(deps2, state) {
    renameSupports(deps2, state);
    const equip = state.equippedSupports.filter((name) => Object.hasOwn(moved, name) && (name.endsWith("전령") || name === "수액 골렘 소환")).map((name) => moved[name]);
    const report = { equip, tiers: {} };
    state.skills = list(state.skills).slice();
    state.sealedSkills = list(state.sealedSkills).slice();
    state.gemData = { ...record(state.gemData) };
    Object.keys(moved).forEach((name) => moveOwned(deps2, state, name, report));
    ["supports", "sealedSupports", "equippedSupports"].forEach((key) => {
      state[key] = state[key].filter((name) => !moved[name]);
    });
    state.skills = unique(state.skills);
    state.sealedSkills = unique(state.sealedSkills).filter((name) => !state.skills.includes(name));
    if (state.activeSkill === "수액 골렘 소환") {
      state.activeSkill = "기본 공격";
      report.equip.push("수액 골렘 소환");
    }
    if (state.mobilitySkill === "수액 골렘 소환") state.mobilitySkill = null;
    report.equip = unique(report.equip);
    return report;
  }
  function reward(row) {
    if (!row || row.kind !== "support") return row;
    if (moved[row.name]) return { kind: "attack", name: moved[row.name], awakened: row.awakened === true };
    return { ...row, name: successor(row.name) };
  }
  function rewards(rows) {
    const out = [];
    list(rows).map(reward).forEach((row) => {
      const held = out.find((other) => other?.kind === row?.kind && other?.name === row?.name);
      if (!held) {
        out.push(row);
        return;
      }
      if (row.kind === "attack") held.awakened = held.awakened || row.awakened;
      if (row.kind === "support") held.tier = Math.max(held.tier, row.tier);
    });
    return out;
  }
  function renameRows(owner, key) {
    if (!Array.isArray(owner?.[key])) return;
    owner[key] = owner[key].map((row) => row?.gem?.kind === "support" ? { ...row, gem: reward(row.gem) } : row);
  }
  function holdings(state) {
    const run = state.actExploration;
    if (Array.isArray(run?.loot?.gems)) run.loot.gems = rewards(run.loot.gems);
    renameRows(run, "groundLoot");
    if (state.colony) {
      state.colony = copy(state.colony);
      renameRows(state.colony, "pendingLoot");
    }
    if (state.voidRift) {
      state.voidRift = copy(state.voidRift);
      renameRows(state.voidRift.grandRun, "pendingLoot");
    }
    if (state.npcShops) {
      state.npcShops = copy(state.npcShops);
      Object.values(record(state.npcShops)).forEach((shop) => renameRows(shop, "offers"));
    }
  }
  function normalizeSupportMigrationReceipt(meta) {
    const previous = record(meta.supportRuneMigration);
    const names = unique(list(previous.moved).filter((name) => Object.hasOwn(moved, name)));
    if (!names.length) {
      delete meta.supportRuneMigration;
      return;
    }
    const refund = Number(previous.refund);
    meta.supportRuneMigration = {
      version: 1,
      moved: names,
      refund: Number.isFinite(refund) ? Math.min(60, Math.max(0, Math.floor(refund))) : 0,
      noticePending: previous.noticePending === true
    };
  }
  function migrateLockedLoadout(deps2, state, saved) {
    if (!state.woodsmanBuildSnapshot || typeof state.woodsmanBuildSnapshot !== "object") return null;
    const snapshot = copy(state.woodsmanBuildSnapshot);
    ["sealedSkills", "sealedSupports", "equippedSummonSkills", "summonSkillCounts"].forEach((key) => {
      if (!Object.hasOwn(snapshot, key) && Object.hasOwn(saved, key)) snapshot[key] = copy(saved[key]);
    });
    state.woodsmanBuildSnapshot = snapshot;
    return migrateLoadout(deps2, snapshot);
  }
  function migrate(deps2, state, saved) {
    normalizeSupportMigrationReceipt(state.saveMeta);
    const root = migrateLoadout(deps2, state);
    const locked = migrateLockedLoadout(deps2, state, saved);
    holdings(state);
    const tiers = { ...root.tiers };
    Object.entries(locked?.tiers || {}).forEach(([name, tier]) => {
      tiers[name] = Math.max(tiers[name] || 1, tier);
    });
    const names = Object.keys(tiers);
    if (names.length) {
      const refund = Object.values(tiers).reduce((sum, tier) => sum + [0, 0, 2, 5][tier], 0);
      const balance = Number(state.currencies.skyEssence);
      state.currencies.skyEssence = (Number.isFinite(balance) ? Math.max(0, Math.floor(balance)) : 0) + refund;
      state.saveMeta.supportRuneMigration = { version: 1, moved: names, refund, noticePending: true };
    }
    return { root, locked };
  }
  function finishLoadout(deps2, state, cap, hasCounts, candidates) {
    const names = unique(list(state.equippedSummonSkills)).filter((name) => summon(deps2, name) && state.skills.includes(name));
    const counts = {}, old = record(state.summonSkillCounts);
    let remaining = cap;
    names.forEach((name) => {
      const requested = hasCounts && !single(deps2, name) ? Math.max(1, Math.floor(Number(old[name]) || 1)) : 1;
      const count = Math.min(remaining, requested);
      if (count > 0) counts[name] = count;
      remaining -= count;
    });
    list(candidates).forEach((name) => {
      if (remaining <= 0 || counts[name] || !state.skills.includes(name)) return;
      counts[name] = 1;
      remaining--;
    });
    const attackers = names.filter((name) => !single(deps2, name));
    let cursor = 0;
    while (!hasCounts && remaining > 0 && attackers.length) {
      const name = attackers[cursor++ % attackers.length];
      counts[name] = (counts[name] || 0) + 1;
      remaining--;
    }
    state.equippedSummonSkills = Object.keys(counts);
    state.summonSkillCounts = counts;
  }

  // modules/persistence/saved-gems.mjs
  function normalizeSkillSlotsSave(deps2, merged) {
    merged.activeSkill = deps2.SKILL_DB[merged.activeSkill] ? merged.activeSkill : merged.skills[0] || "기본 공격";
    if (summon(deps2, merged.activeSkill)) {
      if (!merged.gemEnhanceTargetSkill) merged.gemEnhanceTargetSkill = merged.activeSkill;
      merged.activeSkill = "기본 공격";
    }
    const worn = (name) => deps2.mobilitySkill.isMobilityGem(name) && merged.skills.includes(name);
    moveAttackSlotMobilityGem(deps2, merged, worn);
    keepBlockedMobilityGem(deps2, merged, worn);
    merged.mobilitySkill = worn(merged.mobilitySkill) ? merged.mobilitySkill : "";
  }
  function normalizeStarterWeaponSave(deps2, state) {
    wearOldStarterGem(deps2, state, state.starterGemTutorialPending);
    state.loopStarterWeaponGranted = state.loopStarterWeaponGranted === true || state.loopStarterGemGranted === true;
    for (const key of ["starterGemTutorialPending", "loopStarterGemGranted", "pendingStarterRuneChoice"]) delete state[key];
    const pending = state.starterWeaponTutorialPending, bag = Array.isArray(state.inventory) ? state.inventory : [];
    state.starterWeaponTutorialPending = Number.isSafeInteger(pending) && bag.some((item) => item && item.id === pending) ? pending : null;
    normalizeBasicSkillOfferSave(deps2, state);
  }
  function wearOldStarterGem(deps2, state, name) {
    if (typeof name === "string" && state.activeSkill === "기본 공격" && state.skills.includes(name) && deps2.SKILL_DB[name]?.isGem) state.activeSkill = name;
  }
  function normalizeBasicSkillOfferSave(deps2, state) {
    const offer = state.basicSkillOffer, elements = deps2.BASIC_SKILL_ELEMENTS.map((row) => row.ele);
    const picked = offer && Number.isInteger(offer.loop) && Array.isArray(offer.elements) ? offer.elements.filter((ele) => elements.includes(ele)) : [];
    state.basicSkillOffer = picked.length && new Set(picked).size === picked.length ? { loop: offer.loop, elements: picked } : null;
    if (!elements.includes(state.basicSkillElement)) state.basicSkillElement = "";
  }
  function normalizeOwnedGemLibrariesSave(deps2, state) {
    state.skills = (0, deps2.dedupeList)(Array.isArray(state.skills) ? state.skills.filter((name) => !!deps2.SKILL_DB[name]) : []);
    if (!state.skills.includes("기본 공격")) state.skills.unshift("기본 공격");
    state.sealedSkills = (0, deps2.dedupeList)(Array.isArray(state.sealedSkills) ? state.sealedSkills.filter((name) => !!deps2.SKILL_DB[name] && name !== "기본 공격" && !state.skills.includes(name)) : []);
    state.supports = (0, deps2.dedupeList)(Array.isArray(state.supports) ? state.supports.filter((name) => !!deps2.SUPPORT_GEM_DB[name]) : []);
    state.sealedSupports = (0, deps2.dedupeList)(Array.isArray(state.sealedSupports) ? state.sealedSupports.filter((name) => !!deps2.SUPPORT_GEM_DB[name] && !state.supports.includes(name)) : []);
    state.equippedSupports = Array.isArray(state.equippedSupports) ? (0, deps2.dedupeList)(state.equippedSupports.filter((name) => state.supports.includes(name))) : [];
    state.resonancePower = Number.isFinite(state.resonancePower) ? Math.max(0, Math.floor(state.resonancePower)) : deps2.defaultGame.resonancePower;
  }
  function removeOldSealResonanceSave(state) {
    state.resonancePower = Math.max(0, state.resonancePower - state.sealedSkills.length - state.sealedSupports.length);
  }
  function moveAttackSlotMobilityGem(deps2, merged, worn) {
    if (!deps2.mobilitySkill.isMobilityGem(merged.activeSkill) || (0, deps2.isMobilityRuneAttackWorn)(merged)) return;
    if (!worn(merged.mobilitySkill)) merged.mobilitySkill = merged.activeSkill;
    merged.activeSkill = "기본 공격";
  }
  function keepBlockedMobilityGem(deps2, merged, worn) {
    if (!deps2.mobilitySkill.isMobilityGem(merged.weaponBlockedSkill)) return;
    if (!worn(merged.mobilitySkill) && worn(merged.weaponBlockedSkill)) merged.mobilitySkill = merged.weaponBlockedSkill;
    merged.weaponBlockedSkill = "";
  }
  function normalizeGemEnhanceTargetSave(deps2, merged) {
    const worn = [merged.activeSkill, merged.mobilitySkill, ...merged.equippedSummonSkills].filter((name) => deps2.SKILL_DB[name]?.isGem);
    if (worn.includes(merged.gemEnhanceTargetSkill)) return;
    merged.gemEnhanceTargetSkill = worn[0] || null;
  }
  function dropRetiredSupportGems(deps2, merged) {
    const retired = (name) => deps2.RETIRED_SUPPORT_GEMS.includes(name);
    const keepRune = (row) => !(row && row.gem && row.gem.kind === "support" && retired(row.gem.name));
    const filterRows = (owner, key) => {
      if (owner && Array.isArray(owner[key])) owner[key] = owner[key].filter(keepRune);
    };
    if (merged.supportGemData && typeof merged.supportGemData === "object") deps2.RETIRED_SUPPORT_GEMS.forEach((name) => delete merged.supportGemData[name]);
    const run = merged.actExploration;
    if (run?.loot && Array.isArray(run.loot.gems)) run.loot.gems = run.loot.gems.filter((row) => !(row && row.kind === "support" && retired(row.name)));
    filterRows(run, "groundLoot");
    filterRows(merged.colony, "pendingLoot");
    filterRows(merged.voidRift?.grandRun, "pendingLoot");
    Object.values(merged.npcShops && typeof merged.npcShops === "object" ? merged.npcShops : {}).forEach((shop) => filterRows(shop, "offers"));
    dropRetiredSupportsFrom(deps2, merged.woodsmanBuildSnapshot, retired);
  }
  function removeDropOnlyShopWares(deps2, state) {
    for (const shop of Object.values(state.npcShops)) {
      if (Array.isArray(shop?.offers)) {
        shop.offers = shop.offers.filter((ware) => !deps2.SKILL_DB[ware?.gem?.name]?.dropOnly);
      }
    }
    const market = state.blackMarket;
    if (Array.isArray(market?.offers)) {
      market.offers = market.offers.map((offer) => offer?.type === "skillGem" && deps2.SKILL_DB[offer.name]?.dropOnly ? null : offer);
    }
  }
  function dropRetiredSupportsFrom(deps2, build, retired) {
    if (!build || typeof build !== "object") return;
    ["supports", "sealedSupports", "equippedSupports"].forEach((key) => {
      if (Array.isArray(build[key])) build[key] = build[key].filter((name) => !retired(name));
    });
    if (build.supportGemData && typeof build.supportGemData === "object") deps2.RETIRED_SUPPORT_GEMS.forEach((name) => delete build.supportGemData[name]);
  }
  function refundBlessingEngravings(deps2, merged) {
    const refund = blessingRuneNamesForSave(deps2).reduce((sum, name) => sum + clearBlessingEngraving(merged, name), 0);
    if (refund > 0) merged.currencies.skyEssence = (Number(merged.currencies.skyEssence) || 0) + refund;
  }
  function clearBlessingEngraving(merged, name) {
    const slots = merged.skyGemEnhancements[name], record2 = merged.gemData && merged.gemData[name];
    let refund = Array.isArray(slots) ? slots.filter(Boolean).length : 0;
    delete merged.skyGemEnhancements[name];
    const cap = record2 ? Math.min(5, Math.floor(Number(record2.skyEnhanceCap) || 1)) : 1;
    if (cap > 1) {
      refund += cap * (cap + 1) / 2 - 1;
      record2.skyEnhanceCap = 1;
    }
    return refund;
  }
  var blessingRuneNamesForSave = (deps2) => Object.keys(deps2.SKILL_DB).filter((name) => (deps2.SKILL_DB[name].tags || []).includes("summon_buff"));

  // modules/persistence/saved-boss-looks.mjs
  function createSavedBossLooks(deps2) {
    return new Map([
      [deps2.OUTSIDE_CHAOS_ZONE_ID, "woodsman"],
      [deps2.WOODSMAN_ECHO_ZONE_ID, "woodsman_echo"],
      ...deps2.SEASON_BOSS_ZONES.filter((zone) => zone.bossVisualId && !zone.bossStages).map((zone) => [zone.id, zone.bossVisualId])
    ]);
  }

  // modules/persistence/saved-number.mjs
  function clampFiniteNumber(value, fallback, min, max) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = fallback;
    if (Number.isFinite(min)) num = Math.max(min, num);
    if (Number.isFinite(max)) num = Math.min(max, num);
    return num;
  }

  // modules/persistence/saved-passive-nodes.mjs
  function normalizePassiveNodeId(deps2, rawId) {
    if (typeof rawId === "string") {
      let currentId = typeof deps2.getCurrentPassiveNodeId === "function" ? (0, deps2.getCurrentPassiveNodeId)(rawId) : rawId;
      if (deps2.PASSIVE_TREE.nodes[currentId]) return currentId;
      if (/^\d+$/.test(currentId)) {
        let converted = "n" + currentId;
        if (deps2.PASSIVE_TREE.nodes[converted]) return converted;
      }
      return null;
    }
    if (typeof rawId === "number" && Number.isFinite(rawId)) {
      let converted = "n" + Math.floor(rawId);
      return deps2.PASSIVE_TREE.nodes[converted] ? converted : null;
    }
    return null;
  }
  function normalizeAllocatedPassiveTreeNodes(deps2, rawIds, passiveStarEvolution, passiveSaveState) {
    const rawList = Array.isArray(rawIds) ? rawIds : [];
    const seen = /* @__PURE__ */ new Set(), kept = [];
    let refunded = 0;
    rawList.forEach((rawId) => {
      const id = normalizePassiveNodeId(deps2, rawId);
      if (!id) {
        refunded++;
        return;
      }
      if (seen.has(id)) return;
      seen.add(id);
      const node = deps2.PASSIVE_TREE.nodes[id];
      if (node.kind === "start") return;
      if (node.requiresEvolution && !passiveStarEvolution) {
        refunded++;
        return;
      }
      kept.push(id);
    });
    const candidate = { ...passiveSaveState, passives: kept };
    const connected = deps2.passiveRouting.connected(candidate, deps2.PASSIVE_TREE, (0, deps2.getPassiveRouting)(candidate));
    const lostBonus = Math.max(0, deps2.passiveRouting.paleBonus({ ...candidate, passives: rawList }) - deps2.passiveRouting.paleBonus({ ...candidate, passives: connected }));
    return { passives: connected, refunded: refunded + kept.length - connected.length, lostBonus };
  }
  function migratePassiveSaveNodeReferences(deps2, state) {
    if (typeof deps2.migratePassiveNodeIdList !== "function" || typeof deps2.migratePassiveNodeIdRecord !== "function") return;
    const taken = new Set(Array.isArray(state.passives) ? state.passives : []);
    const doubled = Object.entries(deps2.PASSIVE_NODE_ID_MERGED).filter(([gone, kept]) => taken.has(gone) && taken.has(kept)).length;
    if (doubled) state.passivePoints = Math.max(0, Number(state.passivePoints) || 0) + doubled;
    state.passives = (0, deps2.migratePassiveNodeIdList)(state.passives);
    state.discoveredPassives = (0, deps2.migratePassiveNodeIdList)(state.discoveredPassives);
    state.passiveAttributeChoices = (0, deps2.migratePassiveNodeIdRecord)(state.passiveAttributeChoices);
    state.voidPassives = (0, deps2.migratePassiveNodeIdRecord)(state.voidPassives);
    state.retiredVoidPassives = (0, deps2.migratePassiveNodeIdRecord)(state.retiredVoidPassives);
  }

  // modules/persistence/saved-combat-values.mjs
  function normalizeSavedCurrencies(currencies) {
    for (const key of Object.keys(currencies)) {
      const raw = currencies[key], amount = Number(raw);
      currencies[key] = (typeof raw === "number" || typeof raw === "string") && Number.isFinite(amount) && amount > 0 ? amount : 0;
    }
  }
  function normalizeConditionDebuffMap(map) {
    const rows = map && typeof map === "object" && !Array.isArray(map) ? map : {};
    return Object.fromEntries(Object.entries(rows).filter(([, list2]) => Array.isArray(list2)));
  }
  function normalizePlayerAilmentRow(row, clampFiniteNumber2) {
    const time = Math.max(0, clampFiniteNumber2(row.time, 0, 0, 30));
    const out = {
      type: row.type,
      time,
      duration: Math.max(time, clampFiniteNumber2(row.duration, time, 0, 30)),
      power: Math.max(0, clampFiniteNumber2(row.power, 0.1, 0, 1.5)),
      sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber2(row.sourceHitDamage || row.hitDamage, 0, 0)))
    };
    if (Number.isFinite(Number(row.critDotBonusPct))) out.critDotBonusPct = Math.max(0, Number(row.critDotBonusPct));
    if (Number.isFinite(Number(row.ailmentDotScore))) out.ailmentDotScore = Math.max(0, Number(row.ailmentDotScore));
    if (row.sourceEnemyName) Object.assign(out, { sourceEnemyId: row.sourceEnemyId === void 0 ? null : row.sourceEnemyId, sourceEnemyName: String(row.sourceEnemyName) });
    return out;
  }
  function normalizeLoopMutationState(merged) {
    const season = Number(merged.loopMutationSeason);
    merged.loopMutationSeason = Number.isInteger(season) && season > 0 ? season : 0;
  }
  function voidPassiveLockField(rawEntry) {
    return rawEntry.fairyLocked ? { fairyLocked: true } : {};
  }

  // modules/persistence/restore-identity.mjs
  function restoreInitialSnapshot(deps2, context) {
    captureSavedLayout(deps2, context);
    mergeSavedDefaults(deps2, context);
  }
  function restoreRuneAndCurrencyMigrations(deps2, context) {
    context.supportRuneMigration = migrate(deps2, context.merged, context.save);
    dropRetiredSupportGems(deps2, context.merged);
    ["hideout", "abyssPassivePoints", "abyssPassives", "lastSkillHitElement"].forEach((key) => delete context.merged[key]);
    delete context.merged.unlocks.hideout;
    delete context.merged.noti.hideout;
    migratePassiveSaveNodeReferences(deps2, context.merged);
    deps2.legacySummons.migrateLegacySummonGemSave(context.merged);
    (0, deps2.dropRuntimeOnlySaveFields)(context.merged);
    normalizeSavedCurrencies(context.merged.currencies);
    Object.entries(typeof deps2.CURRENCY_LEGACY_MERGE === "object" ? deps2.CURRENCY_LEGACY_MERGE : {}).forEach(([currentKey, legacyKeys]) => {
      let legacyAmount = (legacyKeys || []).reduce((sum, legacyKey) => sum + Math.max(0, Math.floor(Number(context.merged.currencies[legacyKey]) || 0)), 0);
      context.merged.currencies[currentKey] = Math.max(0, Math.floor(Number(context.merged.currencies[currentKey]) || 0)) + legacyAmount;
      (legacyKeys || []).forEach((legacyKey) => delete context.merged.currencies[legacyKey]);
      (legacyKeys || []).forEach((legacyKey) => Object.defineProperty(context.merged.currencies, legacyKey, {
        configurable: true,
        enumerable: false,
        get() {
          return this[currentKey] || 0;
        },
        set(value) {
          this[currentKey] = Math.max(0, Math.floor(Number(value) || 0));
        }
      }));
    });
    delete context.merged.challengeContract;
    delete context.merged.activeChallengeContract;
    const legacyHiveTrace = Math.max(0, Math.floor(Number(context.merged.currencies.hiveTrace) || 0));
    if (legacyHiveTrace > 0) {
      context.merged.currencies.colonyTrace = Math.max(0, Math.floor(Number(context.merged.currencies.colonyTrace) || 0)) + legacyHiveTrace;
    }
    delete context.merged.currencies.hiveTrace;
  }
  function restoreSavedMetadata(deps2, context) {
    context.merged.cosmosAtlas = context.merged.cosmosAtlas && typeof context.merged.cosmosAtlas === "object" ? { ...context.merged.cosmosAtlas } : {};
    delete context.merged.cosmosAtlas.starDust;
    context.merged.saveMeta.lastCloudUploadProfile = (0, deps2.normalizeCloudUploadProfile)(context.merged.saveMeta.lastCloudUploadProfile);
    context.merged.saveMeta.cloudUserId = typeof context.merged.saveMeta.cloudUserId === "string" && context.merged.saveMeta.cloudUserId.trim() ? context.merged.saveMeta.cloudUserId : null;
    context.merged.ocean = (0, deps2.mergeOceanState)(context.save && context.save.ocean);
    if (typeof deps2.syncPermanentTalentTabUnlock === "function") (0, deps2.syncPermanentTalentTabUnlock)(context.merged);
    if (!context.save.currencies && context.save.materials) {
      context.merged.currencies.magicBud += Math.floor(context.save.materials / 2) + Math.floor(context.save.materials / 4);
      context.merged.currencies.formlessDew += Math.floor(context.save.materials / 10);
    }
  }
  function restoreCarriedEquipment(deps2, context) {
    let normalizedEquipment = Object.fromEntries(Object.keys(deps2.defaultGame.equipment).map((slot) => [slot, context.merged.equipment[slot] || null]));
    if (context.save && context.save.equipment && context.save.equipment["장갑"] && !context.save.equipment["장갑1"] && !context.save.equipment["장갑2"]) {
      normalizedEquipment["장갑1"] = context.save.equipment["장갑"];
    }
    context.merged.equipment = normalizedEquipment;
    markLegacyEquipmentGrace(context.merged.equipment);
    if (deps2.window.equipmentLoadoutRuntime) deps2.window.equipmentLoadoutRuntime.ensureState(context.merged);
    normalizeCarriedEquipmentSave(deps2, context.merged);
    if (typeof deps2.equipmentInventoryGridRuntime !== "undefined") deps2.equipmentInventoryGridRuntime.ensureState(context.merged);
  }
  function restoreGemRecords(deps2, context) {
    context.merged.gemData = context.merged.gemData && typeof context.merged.gemData === "object" ? context.merged.gemData : {};
    context.merged.gemData["기본 공격"] = (0, deps2.normalizeGemRecord)(context.merged.gemData["기본 공격"]);
    Object.keys(context.merged.gemData).forEach((name) => context.merged.gemData[name] = (0, deps2.normalizeGemRecord)(context.merged.gemData[name]));
    context.merged.runeSpares = Object.fromEntries(Object.entries(context.merged.runeSpares && typeof context.merged.runeSpares === "object" ? context.merged.runeSpares : {}).filter(([name, count]) => deps2.SKILL_DB[name]?.isGem && Number.isInteger(count) && count > 0));
    context.merged.supportGemData = context.merged.supportGemData && typeof context.merged.supportGemData === "object" ? context.merged.supportGemData : {};
    Object.keys(context.merged.supportGemData).forEach((name) => context.merged.supportGemData[name] = (0, deps2.normalizeGemRecord)(context.merged.supportGemData[name]));
  }
  function restoreLegacyZoneIds(deps2, context) {
    if ((context.save.saveVersion || 0) < 9) {
      context.merged.passives = [];
      context.merged.discoveredPassives = [(0, deps2.getPassiveTreeRootNodeId)(context.merged)];
    }
    if ((context.save.saveVersion || 0) < 13) {
      movePreAbyssZoneIds(deps2, context);
    } else if ((context.save.saveVersion || 0) < 14) {
      removeRetiredAbyssZoneId(context);
    } else if ((context.save.saveVersion || 0) < 15) {
      removeRetiredActZoneId(context);
    }
  }
  function movePreAbyssZoneIds(deps2, context) {
    if (typeof context.merged.currentZoneId === "number" && context.merged.currentZoneId >= 10) context.merged.currentZoneId += deps2.ABYSS_START_ZONE_ID - 10;
    if (typeof context.merged.maxZoneId === "number" && context.merged.maxZoneId >= 10) context.merged.maxZoneId += deps2.ABYSS_START_ZONE_ID - 10;
  }
  function removeRetiredAbyssZoneId(context) {
    if (typeof context.merged.currentZoneId === "number" && context.merged.currentZoneId >= 11) context.merged.currentZoneId -= 1;
    if (typeof context.merged.maxZoneId === "number" && context.merged.maxZoneId >= 11) context.merged.maxZoneId -= 1;
  }
  function removeRetiredActZoneId(context) {
    if (typeof context.merged.currentZoneId === "number" && context.merged.currentZoneId >= 5) context.merged.currentZoneId -= 1;
    if (typeof context.merged.maxZoneId === "number" && context.merged.maxZoneId >= 5) context.merged.maxZoneId -= 1;
  }
  function captureSavedLayout(deps2, context) {
    if (context.save && typeof context.save === "object") deps2.itemSaveSlim.expandTree(context.save);
    context.savedHeroAppearanceMode = context.save && context.save.settings && context.save.settings.heroAppearanceMode;
    let savedColony = context.save && context.save.colony && typeof context.save.colony === "object" ? context.save.colony : null;
    context.savedColonyHadWardSlotVersion = !!(savedColony && Object.prototype.hasOwnProperty.call(savedColony, "wardSlotVersion"));
  }
  function mergeSavedDefaults(deps2, context) {
    context.merged = {
      ...JSON.parse(JSON.stringify(deps2.defaultGame)),
      ...context.save,
      actExploration: context.save.actExploration == null ? null : JSON.parse(JSON.stringify(context.save.actExploration)),
      equipmentDropProgress: clampFiniteNumber(context.save.equipmentDropProgress, 0, 0, deps2.EQUIPMENT_DROUGHT_RULES.threshold - 0.5),
      settings: { ...deps2.defaultGame.settings, ...context.save.settings || {} },
      unlocks: { ...deps2.defaultGame.unlocks, ...context.save.unlocks || {} },
      noti: { ...deps2.defaultGame.noti, ...context.save.noti || {} },
      currencies: { ...deps2.defaultGame.currencies, ...context.save.currencies || {} },
      equipment: { ...deps2.defaultGame.equipment, ...context.save.equipment || {} },
      saveMeta: { ...deps2.defaultGame.saveMeta, ...context.save.saveMeta || {} }
    };
  }

  // modules/persistence/saved-jewels.mjs
  function normalizeJewelRecord(deps2, jewel) {
    if (!jewel || typeof jewel !== "object") return null;
    let stats = readSavedJewelStats(deps2, jewel);
    if (stats.length === 0) return null;
    let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map((stat) => Math.floor(stat.tier || 1)))));
    let hasWaxBonus = stats.some((stat) => stat && stat.waxBonus);
    let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
    return { ...jewel, rarity: ["normal", "magic", "rare", "unique"].includes(jewel.rarity) ? jewel.rarity : "normal", waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier, stats: stats.slice(0, statLimit), locked: !!jewel.locked };
  }
  function readSavedJewelStats(deps2, jewel) {
    let stats = typeof deps2.getJewelStats === "function" ? (0, deps2.getJewelStats)(jewel) : Array.isArray(jewel.stats) ? jewel.stats.filter((stat) => stat && stat.id) : [];
    if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof deps2.normalizeJewelStat === "function" ? [(0, deps2.normalizeJewelStat)(jewel.stat)].filter(Boolean) : [jewel.stat];
    return stats;
  }

  // modules/persistence/saved-ascendancy.mjs
  function normalizeAscendancySave(deps2, merged) {
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter((id) => typeof id === "string") : [];
    if (merged.ascendClass && !deps2.CLASS_TEMPLATES[merged.ascendClass]) {
      merged.ascendPoints = Math.max(0, Math.floor(Number(merged.ascendPoints) || 0)) + merged.ascendNodes.length;
      const keystones = Array.isArray(merged.ascendKeystones) ? merged.ascendKeystones.length : 0;
      merged.ascendKeystonePoints = Math.max(0, Math.floor(Number(merged.ascendKeystonePoints) || 0)) + keystones;
      merged.ascendClass = "";
      merged.ascendNodes = [];
      merged.ascendKeystones = [];
    }
    normalizeTalentCardKeys(deps2, merged);
    merged.lastLoopAscendPlan = normalizeLastLoopAscendPlan(deps2, merged.lastLoopAscendPlan);
  }
  function normalizeLastLoopAscendPlan(deps2, raw) {
    if (!raw || typeof raw !== "object" || !deps2.CLASS_TEMPLATES[raw.ascendClass]) return null;
    const keystoneIds = new Set((deps2.CLASS_KEYSTONE_DEFS[raw.ascendClass] || []).map((node) => node.id));
    const keepIds = (value, keep) => Array.from(new Set((Array.isArray(value) ? value : []).filter((id) => typeof id === "string" && keep(id)))).slice(0, 32);
    return { ascendClass: raw.ascendClass, nodes: keepIds(raw.nodes, (id) => /^n\d{1,2}[a-d]?$/.test(id)), keystones: keepIds(raw.keystones, (id) => keystoneIds.has(id)) };
  }
  function normalizeTalentCardKeys(deps2, merged) {
    if (typeof deps2.TALENT_BLOOM_CARD_DEFS !== "object" || !deps2.TALENT_BLOOM_CARD_DEFS || typeof deps2.getTalentBloomCardKeyForAscendancy !== "function") return;
    const bloomCardOf = (key) => (0, deps2.getTalentBloomCardKeyForAscendancy)(String(key || "").split("__")[1]);
    const cards = merged.talentCards && typeof merged.talentCards === "object" ? merged.talentCards : {};
    const folded = {};
    Object.entries(cards).forEach(([key, card]) => {
      const to = bloomCardOf(key);
      if (to && card && typeof card === "object") folded[to] = mergeTalentCardRecords(folded[to], card);
    });
    merged.talentCards = folded;
    if (Array.isArray(merged.talentCardLoadout)) {
      const moved2 = merged.talentCardLoadout.map((key) => key ? bloomCardOf(key) : null);
      merged.talentCardLoadout = moved2.map((key, index) => key && folded[key] && moved2.indexOf(key) === index ? key : null);
    }
    if (Array.isArray(merged.talentBloomCombos)) merged.talentBloomCombos = Array.from(new Set(merged.talentBloomCombos.map(bloomCardOf).filter(Boolean)));
    alignBloomLoopTalent(deps2, merged);
  }
  function alignBloomLoopTalent(deps2, merged) {
    const classTalent = (0, deps2.getTalentBloomHeroIdForAscendancy)(merged.ascendClass);
    if (!classTalent) return;
    if (merged.bloomedTalentThisLoop) merged.bloomedTalentThisLoop = classTalent;
    if (merged.pendingTalentBloomHeroId) merged.pendingTalentBloomHeroId = classTalent;
  }
  function mergeTalentCardRecords(previous, card) {
    if (!previous) return { ...card };
    return {
      ...previous,
      level: Math.max(Number(previous.level) || 1, Number(card.level) || 1),
      score: Math.max(Number(previous.score) || 0, Number(card.score) || 0),
      count: (Number(previous.count) || 0) + (Number(card.count) || 0)
    };
  }

  // modules/persistence/restore-progression.mjs
  function restorePassiveAllocation(deps2, context) {
    context.legacyPassiveRefundCount = Number(context.merged.passiveLayoutVersion || 0) < deps2.PASSIVE_LAYOUT_VERSION ? Array.isArray(context.save.passives) ? context.save.passives.filter((id) => id !== "n0" && !String(id).startsWith("pt_start_")).length : 0 : 0;
    moveStarWedgeSaveToMeteorSite(deps2, context.merged, context.save);
    context.passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(deps2, context.merged.passives, !!context.merged.passiveStarEvolution, context.merged);
    context.merged.passives = context.passiveAllocationNormalization.passives;
    context.merged.autoRefundedPassivePoints = Math.max(0, Math.floor(context.passiveAllocationNormalization.refunded || 0));
    Object.values(deps2.PASSIVE_TREE.nodes || {}).forEach((node) => {
      if (!node || node.stat !== "critDmg") return;
      node.val = (0, deps2.getPassiveStatTierValue)("critDmg", Math.max(0, Math.floor(node.tier || 1)));
    });
    context.merged.discoveredPassives = Array.from(new Set((context.merged.discoveredPassives || []).map(((...args) => normalizePassiveNodeId(deps2, ...args))).filter(Boolean)));
  }
  function restorePassiveChoices(deps2, context) {
    const passiveAttributeStats = /* @__PURE__ */ new Set(["strength", "dexterity", "intelligence"]);
    context.merged.passiveAttributePreference = passiveAttributeStats.has(context.merged.passiveAttributePreference) ? context.merged.passiveAttributePreference : "strength";
    const rawPassiveAttributeChoices = context.merged.passiveAttributeChoices && typeof context.merged.passiveAttributeChoices === "object" && !Array.isArray(context.merged.passiveAttributeChoices) ? context.merged.passiveAttributeChoices : {};
    context.merged.passiveAttributeChoices = Object.fromEntries(Object.entries(rawPassiveAttributeChoices).filter(([nodeId, stat]) => passiveAttributeStats.has(stat) && deps2.PASSIVE_TREE.nodes[nodeId] && deps2.PASSIVE_TREE.nodes[nodeId].kind === "attribute" && (context.merged.passives || []).includes(nodeId)));
    const passiveSpecializationOptions = { migrateWisdomBranchChoice: true, passiveIds: context.merged.passives };
    context.merged.passiveSpecialization = typeof deps2.normalizePassiveSpecializationState === "function" ? (0, deps2.normalizePassiveSpecializationState)(context.merged.passiveSpecialization, passiveSpecializationOptions) : JSON.parse(JSON.stringify(deps2.defaultGame.passiveSpecialization));
  }
  function restorePassiveLayout(deps2, context) {
    if (context.merged.passiveLayoutVersion !== deps2.PASSIVE_LAYOUT_VERSION) {
      if (Number(context.merged.passiveLayoutVersion || 0) < deps2.PASSIVE_LAYOUT_VERSION) {
        context.merged.autoRefundedPassivePoints = context.legacyPassiveRefundCount;
        context.merged.passives = [];
        context.merged.passiveAttributeChoices = {};
        context.merged.voidPassives = {};
        context.merged.retiredVoidPassives = {};
      }
      context.merged.discoveredPassives = Array.from(new Set([(0, deps2.getPassiveTreeRootNodeId)(context.merged)].concat(context.merged.passives || [])));
      context.merged.passiveLayoutVersion = deps2.PASSIVE_LAYOUT_VERSION;
    }
  }
  function restoreActRewards(deps2, context) {
    context.merged.claimableActRewards = (context.merged.claimableActRewards || []).filter((id) => typeof id === "number" && id >= 0 && id <= 9);
    context.merged.claimedActRewards = (context.merged.claimedActRewards || []).filter((id) => typeof id === "number" && id >= 0 && id <= 9);
    context.merged.actRewardBonuses = (context.merged.actRewardBonuses || []).filter((entry) => entry && entry.stat);
    context.merged.seasonChaseUniqueDrops = Array.from(new Set((Array.isArray(context.merged.seasonChaseUniqueDrops) ? context.merged.seasonChaseUniqueDrops : []).filter((name) => typeof name === "string" && name)));
    context.merged.seasonChaseUniqueDropped = context.merged.seasonChaseUniqueDrops.length > 0;
    normalizeOwnedGemLibrariesSave(deps2, context.merged);
    if ((context.save.saveVersion || 0) < 21) removeOldSealResonanceSave(context.merged);
    context.merged.seasonNodes = Array.isArray(context.merged.seasonNodes) ? context.merged.seasonNodes.filter((id) => !!(0, deps2.getSeasonPassiveNodeDef)(id)) : [];
  }
  function restoreSeasonUnlocks(context) {
    context.merged.seasonNodeLevels = context.merged.seasonNodeLevels && typeof context.merged.seasonNodeLevels === "object" ? context.merged.seasonNodeLevels : {};
    context.merged.seasonNodes.forEach((id) => {
      let lv = Math.max(1, Math.floor(context.merged.seasonNodeLevels[id] || 1));
      context.merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    context.merged.unlockedSeasonContents = Array.isArray(context.merged.unlockedSeasonContents) ? context.merged.unlockedSeasonContents.filter((id) => typeof id === "string") : ["season_1"];
    context.merged.seenSeasonContentNotices = Array.isArray(context.merged.seenSeasonContentNotices) ? context.merged.seenSeasonContentNotices.filter((id) => typeof id === "string") : ["season_1"];
    context.merged.unlockedMapContents = Array.isArray(context.merged.unlockedMapContents) ? context.merged.unlockedMapContents.filter((id) => typeof id === "string") : [];
  }
  function restoreEndlessDepths(deps2, context) {
    restoreLabyrinthDepths(deps2, context);
    restoreAbyssDepths(deps2, context);
  }
  function restoreJewelsAndEngravings(deps2, context) {
    context.merged.jewelInventory = Array.isArray(context.merged.jewelInventory) ? context.merged.jewelInventory.map(((...args) => normalizeJewelRecord(deps2, ...args))).filter(Boolean) : [];
    context.merged.jewelInventory.push(...Array.isArray(context.merged.jewelSlots) ? context.merged.jewelSlots.map(((...args) => normalizeJewelRecord(deps2, ...args))).filter(Boolean) : []);
    delete context.merged.jewelSlots;
    delete context.merged.jewelSlotAmplify;
    delete context.merged.unlocks.jewel;
    delete context.merged.noti.jewel;
    context.merged.skyGemEnhancements = context.merged.skyGemEnhancements && typeof context.merged.skyGemEnhancements === "object" ? context.merged.skyGemEnhancements : {};
    Object.keys(context.merged.skyGemEnhancements).forEach((skill) => {
      let arr = Array.isArray(context.merged.skyGemEnhancements[skill]) ? context.merged.skyGemEnhancements[skill] : [];
      context.merged.skyGemEnhancements[skill] = typeof deps2.normalizeSkyGemEnhancementSlots === "function" ? (0, deps2.normalizeSkyGemEnhancementSlots)(arr) : arr.slice(0, 5);
    });
    refundBlessingEngravings(deps2, context.merged);
  }
  function restoreAscendancyProgress(deps2, context) {
    restoreBloomIdentity(deps2, context);
    restoreBloomAndKeystones(deps2, context);
  }
  function restoreAscendancyCaps(deps2, context) {
    if (context.merged.ascendClass) {
      let legacyTrialCount = Array.isArray(context.merged.completedTrials) ? context.merged.completedTrials.filter((id) => ["trial_1", "trial_2", "trial_3", "trial_4"].includes(id)).length : 0;
      let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendRank, 0, 0, 4)));
      let legacyKeystoneTotal = Math.min(deps2.CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
      let minExpectedPoints = Math.max(0, legacyKeystoneTotal - context.merged.ascendKeystones.length);
      context.merged.ascendKeystonePoints = Math.max(context.merged.ascendKeystonePoints, minExpectedPoints);
    }
  }
  function restoreVoidPassives(deps2, context) {
    let validVoidPassiveIds = new Set(typeof deps2.getVoidPassiveNodeIds === "function" ? (0, deps2.getVoidPassiveNodeIds)() : []);
    let rawVoidPassives = context.merged.voidPassives && typeof context.merged.voidPassives === "object" ? context.merged.voidPassives : {};
    context.merged.voidPassives = {};
    context.merged.retiredVoidPassives = context.merged.retiredVoidPassives && typeof context.merged.retiredVoidPassives === "object" ? context.merged.retiredVoidPassives : {};
    Object.keys(rawVoidPassives).forEach((nodeId) => {
      if (!validVoidPassiveIds.has(String(nodeId))) context.merged.retiredVoidPassives[nodeId] = rawVoidPassives[nodeId];
    });
    let legacyVoidMigration = !(context.save.voidPassives && typeof context.save.voidPassives === "object");
    let allocatedVoidIds = legacyVoidMigration ? new Set((context.merged.passives || []).map((id) => String(id))) : /* @__PURE__ */ new Set();
    validVoidPassiveIds.forEach((nodeId) => {
      let rawEntry = readSavedVoidEntry(rawVoidPassives, nodeId);
      let stats = Array.isArray(rawEntry.stats) ? rawEntry.stats : [];
      if (legacyVoidMigration && allocatedVoidIds.has(String(nodeId)) && stats.length <= 0) {
        stats = restoreLegacyVoidStats(deps2, nodeId, stats);
      }
      stats = stats.filter((line) => line && (0, deps2.isVoidPassiveLineStat)(line.id) && Number.isFinite(Number(line.val))).slice(0, 2).map((line) => ({ id: line.id, val: Number(line.val) }));
      let transcendent = typeof deps2.normalizeTranscendentVoidPassive === "function" ? (0, deps2.normalizeTranscendentVoidPassive)(rawEntry.transcendent) : null;
      if (keepSavedVoidEntry(stats, transcendent, rawVoidPassives, allocatedVoidIds, nodeId)) context.merged.voidPassives[nodeId] = { rarity: transcendent ? "transcendent" : stats.length > 0 ? "magic" : "normal", stats, transcendent, ...voidPassiveLockField(rawEntry) };
    });
  }
  function readSavedVoidEntry(rawVoidPassives, nodeId) {
    return rawVoidPassives[nodeId] && typeof rawVoidPassives[nodeId] === "object" ? rawVoidPassives[nodeId] : {};
  }
  function restoreLegacyVoidStats(deps2, nodeId, stats) {
    let node = deps2.PASSIVE_TREE.nodes[nodeId];
    if (node && deps2.P_STATS[node.legacyVoidStat] && Number.isFinite(Number(node.legacyVoidVal))) {
      stats = [{ id: node.legacyVoidStat, val: Number(node.legacyVoidVal) }];
    }
    return stats;
  }
  function keepSavedVoidEntry(stats, transcendent, rawVoidPassives, allocatedVoidIds, nodeId) {
    return stats.length > 0 || transcendent || rawVoidPassives[nodeId] || allocatedVoidIds.has(String(nodeId));
  }
  function restoreLabyrinthDepths(deps2, context) {
    context.merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.labyrinthFloor, deps2.defaultGame.labyrinthFloor || 1, 1)));
    context.merged.labyrinthUnlockedMaxFloor = Math.max(
      context.merged.labyrinthFloor,
      Math.floor(clampFiniteNumber(context.merged.labyrinthUnlockedMaxFloor, deps2.defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    const lastLabyrinth = context.merged.labyrinthLastResult;
    context.merged.labyrinthLastResult = lastLabyrinth && Number.isInteger(lastLabyrinth.season) && lastLabyrinth.season > 0 && Number.isInteger(lastLabyrinth.floor) && lastLabyrinth.floor > 0 ? {
      season: lastLabyrinth.season,
      floor: lastLabyrinth.floor,
      pending: lastLabyrinth.pending === true,
      currencies: Object.fromEntries(Object.keys(deps2.ORB_DB).filter((key) => Number.isFinite(lastLabyrinth.currencies?.[key]) && lastLabyrinth.currencies[key] > 0).map((key) => [key, Math.min(1e6, Math.floor(lastLabyrinth.currencies[key]))]))
    } : null;
  }
  function restoreAbyssDepths(deps2, context) {
    context.merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(context.merged.abyssEndlessDepth, deps2.defaultGame.abyssEndlessDepth || 20, 20)));
    context.merged.abyssUnlockedDepths = Array.isArray(context.merged.abyssUnlockedDepths) ? Array.from(new Set(context.merged.abyssUnlockedDepths.map((v) => Math.floor(v || 0)).filter((v) => v >= 20))).sort((a, b) => a - b) : [20];
    if (!context.merged.abyssUnlockedDepths.includes(20)) context.merged.abyssUnlockedDepths.unshift(20);
    if (context.merged.abyssEndlessDepth >= 21 && !context.merged.abyssUnlockedDepths.includes(context.merged.abyssEndlessDepth)) context.merged.abyssUnlockedDepths.push(context.merged.abyssEndlessDepth);
  }
  function restoreBloomIdentity(deps2, context) {
    normalizeAscendancySave(deps2, context.merged);
    context.merged.bloomedClassThisLoop = deps2.CLASS_TEMPLATES[context.merged.bloomedClassThisLoop] ? context.merged.bloomedClassThisLoop : null;
    context.merged.bloomedTalentThisLoop = deps2.HERO_SELECTION_DEFS[context.merged.bloomedTalentThisLoop] ? context.merged.bloomedTalentThisLoop : null;
  }
  function restoreBloomAndKeystones(deps2, context) {
    if (context.merged.bloomedClassThisLoop && !context.merged.bloomedTalentThisLoop) context.merged.bloomedTalentThisLoop = context.merged.selectedHeroId;
    if (!context.merged.bloomedClassThisLoop) context.merged.bloomedTalentThisLoop = null;
    context.merged.pendingTalentBloomHeroId = context.merged.currentZoneId === "trial_5" && deps2.HERO_SELECTION_DEFS[context.merged.pendingTalentBloomHeroId] ? context.merged.pendingTalentBloomHeroId : null;
    context.merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set((0, deps2.getClassKeystoneDefs)(context.merged.ascendClass).map((node) => node.id));
    context.merged.ascendKeystones = Array.isArray(context.merged.ascendKeystones) ? Array.from(new Set(context.merged.ascendKeystones.filter((id) => typeof id === "string" && classKeystoneSet.has(id)))).slice(0, deps2.CLASS_KEYSTONE_PICK_LIMIT) : [];
    if (!context.merged.ascendClass && (!Array.isArray(context.merged.completedTrials) || context.merged.completedTrials.length === 0)) {
      context.merged.ascendKeystonePoints = 0;
      context.merged.ascendKeystones = [];
    }
  }

  // modules/persistence/saved-settings.mjs
  function normalizeLoopGateFlags(state) {
    state.pendingLoopDecision = !!state.pendingLoopDecision;
    state.pendingLoopReady = !!state.pendingLoopReady;
    state.loopGateOffline = state.loopGateOffline === true && (state.pendingLoopDecision || state.pendingLoopReady);
  }
  function normalizeAutomationSettings(settings) {
    settings.autoMove = settings.autoMove !== false;
    settings.autoLoop = settings.autoLoop === true;
    settings.autoRediveOcean = settings.autoRediveOcean === true;
    settings.autoLoopClass = settings.autoLoopClass === "keep" ? "keep" : "ask";
  }
  function normalizeTabLayoutSettings(settings) {
    const normalizeOrder = (list2, pattern) => Array.from(new Set(
      (Array.isArray(list2) ? list2 : []).filter((id) => typeof id === "string" && pattern.test(id) && !RETIRED_TAB_BUTTON_IDS.includes(id))
    ));
    const buttonId = /^btn-(tab-[a-z]+|map-complete-action-picker)$/;
    const layouts = {};
    for (const platform of ["desktop", "mobile"]) {
      const candidate = settings.tabLayouts && settings.tabLayouts[platform];
      const source = candidate && typeof candidate === "object" ? candidate : settings;
      const placements = source.tabPlacement && typeof source.tabPlacement === "object" ? source.tabPlacement : {};
      layouts[platform] = {
        tabOrder: normalizeOrder(source.tabOrder, buttonId),
        tabPlacement: Object.fromEntries(Object.entries(placements).filter(([id, place]) => buttonId.test(id) && ["top", "bottom"].includes(place) && !RETIRED_TAB_BUTTON_IDS.includes(id))),
        tabGroupOrder: normalizeOrder(source.tabGroupOrder, /^(character|growth|content|gear|etc)$/)
      };
    }
    return layouts;
  }
  function normalizeSavedTacticRules(deps2, raw) {
    const rules = Array.isArray(raw) ? raw.filter((rule) => rule && typeof rule === "object") : [];
    return rules.filter((rule) => rule.actionType && rule.actionType !== "condition_gem").map((rule) => (0, deps2.normalizeConditionPatternRule)({ ...rule }));
  }

  // modules/persistence/saved-content-runs.mjs
  function wasGrandBreachSurvivalStarted(run) {
    return !!run.survivalStarted || run.phase === "survival" && Number.isFinite(run.timeLeft) && run.timeLeft < 35;
  }
  function normalizeColonyRunSave(colony, clampFiniteNumber2) {
    colony.wave = Math.floor(clampFiniteNumber2(colony.wave, 0, 0));
    colony.highestWave = Math.max(colony.wave, Math.floor(clampFiniteNumber2(colony.highestWave, colony.wave, 0)));
    colony.coreMaxHp = Math.floor(clampFiniteNumber2(colony.coreMaxHp, 0, 0, Number.MAX_SAFE_INTEGER));
    colony.coreHp = Math.floor(clampFiniteNumber2(colony.coreHp, colony.coreMaxHp, 0, colony.coreMaxHp));
    colony.failedWave = Math.floor(clampFiniteNumber2(colony.failedWave, 0, 0, Number.MAX_SAFE_INTEGER));
    colony.returnAfterWave = Math.floor(clampFiniteNumber2(colony.returnAfterWave, 0, 0, Number.MAX_SAFE_INTEGER));
    if (!colony.inRun || colony.returnAfterWave % 5 !== 0 || colony.returnAfterWave < colony.wave - 1) colony.returnAfterWave = 0;
    const result = colony.lastResult;
    if (result && ["withdraw", "scheduled", "left", "core", "defeat"].includes(result.kind)) {
      const wave = Math.floor(clampFiniteNumber2(result.wave, 1, 1, Number.MAX_SAFE_INTEGER));
      colony.lastResult = {
        kind: result.kind,
        wave,
        completed: Math.min(wave - 1, Math.floor(clampFiniteNumber2(result.completed, 0, 0))),
        lostHeld: Math.floor(clampFiniteNumber2(result.lostHeld, 0, 0, Number.MAX_SAFE_INTEGER))
      };
    } else colony.lastResult = null;
  }
  function normalizeGrandBreachCounters(deps2, run) {
    const savedKills = Number(run.kills);
    run.kills = Number.isFinite(savedKills) ? Math.max(0, Math.floor(savedKills)) : 0;
    const savedGauge = Number(run.gauge);
    const legacyGauge = Math.min(deps2.GRAND_BREACH_ENCOUNTER.requiredGauge, run.kills * 2);
    run.gauge = (0, deps2.getGrandBreachProgress)(run.gauge == null || !Number.isFinite(savedGauge) ? legacyGauge : savedGauge).gauge;
    if (!Number.isFinite(run.survivalEndsAt)) delete run.survivalEndsAt;
  }
  function normalizeGrandBreachRefillPlan(deps2, run) {
    if (!Number.isFinite(run.nextRefillAt) || run.nextRefillAt < 0) run.nextRefillAt = 0;
    const plan = run.refillPlan;
    if (!run.inRun || run.phase !== "survival" || (0, deps2.getGrandBreachProgress)(run.gauge).complete || !isSavedGrandBreachRefillPlan(plan, run.nextRefillAt)) {
      delete run.refillPlan;
      return;
    }
    run.refillPlan = { portalIndices: [...plan.portalIndices], at: plan.at, turn: plan.turn };
  }
  function isSavedGrandBreachRefillPlan(plan, at) {
    return !!plan && Number.isFinite(plan.at) && plan.at === at && Number.isSafeInteger(plan.turn) && plan.turn >= 0 && isSavedGrandBreachPortalPair(plan.portalIndices);
  }
  function isSavedGrandBreachPortalPair(indices) {
    return Array.isArray(indices) && indices.length === 2 && indices[0] !== indices[1] && indices.every((index) => Number.isInteger(index) && index >= 0 && index < 6);
  }
  function normalizeVoidRiftSave(deps2, state) {
    state.voidRift = state.voidRift && typeof state.voidRift === "object" ? state.voidRift : {};
    state.voidRift.grandBreachCleared = !!state.voidRift.grandBreachCleared;
    const run = state.voidRift.grandRun;
    if (!run || typeof run !== "object") return;
    run.survivalStarted = wasGrandBreachSurvivalStarted(run);
    normalizeGrandBreachCounters(deps2, run);
    normalizeGrandBreachRefillPlan(deps2, run);
    delete run.timeLeft;
    delete run.lastTickAt;
    const paid = run.rewardVoidChisel;
    run.rewardVoidChisel = Number.isFinite(paid) && paid >= 0 ? Math.floor(paid) : null;
    const shardPaid = run.rewardJewelShard;
    run.rewardJewelShard = Number.isFinite(shardPaid) && shardPaid >= 0 ? Math.floor(shardPaid) : null;
  }

  // modules/persistence/restore-content.mjs
  function restoreCraftAndMapTabs(deps2, context) {
    context.merged.completedTrials = Array.isArray(context.merged.completedTrials) ? context.merged.completedTrials.filter((id) => typeof id === "string") : [];
    context.merged.unlockedTrials = Array.isArray(context.merged.unlockedTrials) ? context.merged.unlockedTrials.filter((id) => typeof id === "string") : [];
    Object.assign(context.merged, deps2.craftingWorkspaceState.restore(context.merged));
    context.merged.skillSubtab = ["skill-tab-equip", "skill-tab-enhance", "skill-tab-condition"].includes(context.merged.skillSubtab) ? context.merged.skillSubtab : "skill-tab-equip";
    context.merged.skillAutoRules = normalizeSavedTacticRules(deps2, context.merged.skillAutoRules);
    [
      "conditionGemUnlocked",
      "conditionGemPool",
      "conditionGemLevels",
      "pendingConditionGemChoices",
      "conditionGemCooldowns",
      "playerConditionBuffs",
      "lastConditionGemCast",
      "playerCastDelayUntil",
      "enemyCurseExpirePayloads"
    ].forEach((key) => delete context.merged[key]);
    context.merged.beyondBoundary = (0, deps2.normalizeBeyondBoundaryState)(context.merged.beyondBoundary, context.merged);
    delete context.merged.worldDeck;
    context.merged.clearedRootBosses = Array.isArray(context.merged.clearedRootBosses) ? context.merged.clearedRootBosses : [];
    context.merged.mapSubtab = ["map-tab-zones", "map-tab-chaos-realm", "map-tab-sky", "map-tab-underworld", "map-tab-cosmos", "map-tab-ocean", "map-tab-fishing", "map-tab-pvp"].includes(context.merged.mapSubtab) ? context.merged.mapSubtab : "map-tab-zones";
    context.merged.mapExploreSubtab = ["map-explore-atlas", "map-explore-worldtree", "map-explore-hunting", "map-explore-chaos", "map-explore-root-boss", "map-explore-beyond", "map-explore-labyrinth", "map-explore-deep-chaos", "map-explore-meteor", "map-explore-beehive", "map-explore-colony", "map-explore-voidrift", "map-explore-timerift", "map-explore-trials"].includes(context.merged.mapExploreSubtab) ? context.merged.mapExploreSubtab : "map-explore-atlas";
    delete context.merged.coreCube;
    delete context.merged.unlocks.cube;
    delete context.merged.noti.cube;
    context.merged.cores = deps2.coreItems.normalize(context.merged.cores);
  }
  function restoreRetiredCraftPanels(context) {
    restoreGemPanelAndTalismanCore(context);
    restoreJewelCoreAndRetiredTalisman(context);
  }
  function restoreCodexAndColony(deps2, context) {
    restoreGemEnhanceSelection(deps2, context);
    restoreCodexLedgers(deps2, context);
    restoreCodexPreferences(deps2, context);
    restoreColonyWardSlots(deps2, context);
  }
  function restoreBeehiveRun(deps2, context) {
    let beeHasReturnZone = context.merged.beehive.returnZoneId !== void 0 && context.merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(context.merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(context.merged.beehive.inRun && context.merged.currentZoneId === "beehive_run" && hasSavedBeehiveActivity(context, beeHasReturnZone, beeHasStartedRoute));
    if (!activeBeehiveRuntime) {
      let staleBeehiveReturnZone = beeHasReturnZone ? context.merged.beehive.returnZoneId : context.merged.maxZoneId;
      context.merged.beehive.inRun = false;
      (0, deps2.resetBeehiveRunModifiers)(context.merged.beehive);
      if (context.merged.currentZoneId === "beehive_run") context.merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (context.merged.beehive && context.merged.beehive.inRun) {
      context.merged.combatHalted = !context.merged.beehive.awaitingClear;
    } else {
      context.merged.combatHalted = !!context.merged.combatHalted;
    }
  }
  function hasSavedBeehiveActivity(context, beeHasReturnZone, beeHasStartedRoute) {
    return context.merged.beehive.awaitingClear || context.merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute) || context.merged.beehive.queenActive || context.merged.beehive.pendingWaveReward || Array.isArray(context.merged.beehive.pendingQueenRewards) && context.merged.beehive.pendingQueenRewards.length > 0 || Array.isArray(context.merged.enemies) && context.merged.enemies.some((enemy) => enemy && enemy.hp > 0);
  }
  function restoreJournalAndNpcs(deps2, context) {
    context.merged.seenTutorials = Array.isArray(context.merged.seenTutorials) ? context.merged.seenTutorials.filter((id) => typeof id === "string") : [];
    context.merged.npcHeard = Array.isArray(context.merged.npcHeard) ? Array.from(new Set(context.merged.npcHeard.filter((id) => typeof id === "string" && id.includes(":")))) : [];
    const record2 = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
    context.merged.npcMet = record2(context.merged.npcMet);
    context.merged.npcShops = record2(context.merged.npcShops);
    removeDropOnlyShopWares(deps2, context.merged);
    normalizeStarterWeaponSave(deps2, context.merged);
    deps2.window.GameModules.state.tutorials.normalize(context.merged);
    context.merged.journalEntries = Array.isArray(context.merged.journalEntries) ? Array.from(new Set(context.merged.journalEntries.filter((id) => typeof id === "string" && deps2.JOURNAL_DB[id]))) : ["prologue"];
    context.merged.hiddenJournalBossRun = null;
    if (typeof deps2.ensureRecordsState === "function") (0, deps2.ensureRecordsState)(context.merged);
    normalizeVoidRiftSave(deps2, context.merged);
    context.merged.timeRift = context.merged.timeRift && typeof context.merged.timeRift === "object" ? { ...deps2.defaultGame.timeRift, ...context.merged.timeRift } : { ...deps2.defaultGame.timeRift };
    context.merged.timeRift.fusionCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.timeRift.fusionCount, 0, 0)));
    context.merged.timeRift.lastFusion = deps2.window.GameModules.state.normalizeTimeRiftResult(context.merged.timeRift.lastFusion);
    (0, deps2.repairJournalEntriesFromProgress)(context.merged);
    let journalLoadState = (0, deps2.rebuildJournalBonusStateForLoad)(context.merged);
    context.pendingJournalPassivePoints = Math.max(0, Math.floor(journalLoadState.pendingPassivePoints || 0));
  }
  function restoreGemPanelAndTalismanCore(context) {
    context.merged.gemFoldInactiveAttack = !!context.merged.gemFoldInactiveAttack;
    context.merged.gemFoldInactiveSupport = !!context.merged.gemFoldInactiveSupport;
    delete context.merged.gemResearchExpanded;
    if (context.merged.currencies) delete context.merged.currencies.gemShard;
    if (context.merged.gemFoldInactive) {
      context.merged.gemFoldInactiveAttack = true;
      context.merged.gemFoldInactiveSupport = true;
    }
    context.merged.autoRepeatSeasonBoss = !!context.merged.autoRepeatSeasonBoss;
    if (((context.merged.currencies || {}).talismanCore || 0) > 0) {
      context.merged.currencies.sealShard = (context.merged.currencies.sealShard || 0) + (context.merged.currencies.talismanCore || 0);
      context.merged.currencies.talismanCore = 0;
    }
  }
  function restoreJewelCoreAndRetiredTalisman(context) {
    if (((context.merged.currencies || {}).jewelCore || 0) > 0) {
      context.merged.currencies.jewelShard = (context.merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(context.merged.currencies.jewelCore || 0));
      context.merged.currencies.jewelCore = 0;
    }
    [
      "talismanUnlocked",
      "talismanBoardUnlock",
      "talismanUnlockedCells",
      "talismanInventory",
      "talismanBoard",
      "talismanPlacements",
      "talismanSelectedId",
      "talismanUnseal",
      "talismanUnlockPickMode",
      "talismanSubtab"
    ].forEach((key) => delete context.merged[key]);
    delete context.merged.unlocks.talisman;
    delete context.merged.noti.talisman;
    context.merged.gemEnhanceUnlocked = !!context.merged.gemEnhanceUnlocked;
    context.merged.gemEngraveSelectedSlot = Math.max(0, Math.min(4, Math.floor(clampFiniteNumber(context.merged.gemEngraveSelectedSlot, 0, 0, 4))));
  }
  function restoreGemEnhanceSelection(deps2, context) {
    context.merged.gemEnhanceTargetSkill = typeof context.merged.gemEnhanceTargetSkill === "string" && deps2.SKILL_DB[context.merged.gemEnhanceTargetSkill] && deps2.SKILL_DB[context.merged.gemEnhanceTargetSkill].isGem && Array.isArray(context.merged.skills) && context.merged.skills.includes(context.merged.gemEnhanceTargetSkill) ? context.merged.gemEnhanceTargetSkill : null;
  }
  function restoreCodexLedgers(deps2, context) {
    context.merged.uniqueCodex = context.merged.uniqueCodex && typeof context.merged.uniqueCodex === "object" ? context.merged.uniqueCodex : {};
    normalizeUniqueHuntSave(deps2, context.merged);
    context.merged.codexNewlyRegistered = context.merged.codexNewlyRegistered && typeof context.merged.codexNewlyRegistered === "object" ? context.merged.codexNewlyRegistered : {};
    context.merged.codexCollapsedSlots = context.merged.codexCollapsedSlots && typeof context.merged.codexCollapsedSlots === "object" ? context.merged.codexCollapsedSlots : {};
  }
  function restoreCodexPreferences(deps2, context) {
    context.merged.codexSubtab = context.merged.codexSubtab === "realm" ? "realm" : "main";
    context.merged.codexSelectedSlot = (0, deps2.getCodexSlotOrder)().includes(context.merged.codexSelectedSlot) ? context.merged.codexSelectedSlot : "무기";
    context.merged.uniqueCodexCompletedRewardClaimed = !!context.merged.uniqueCodexCompletedRewardClaimed;
    if (!context.merged.gemEnhanceUnlocked && (((context.merged.currencies || {}).bossCore || 0) > 0 || ((context.merged.currencies || {}).skyEssence || 0) > 0)) context.merged.gemEnhanceUnlocked = true;
  }
  function restoreColonyWardSlots(deps2, context) {
    context.merged.inTicketBossFight = !!context.merged.inTicketBossFight;
    context.merged.beehive = context.merged.beehive && typeof context.merged.beehive === "object" ? context.merged.beehive : { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0 };
    context.merged.beehive.waveExtra = Math.floor(clampFiniteNumber(context.merged.beehive.waveExtra, 0, 0, 2));
    context.merged.colony = context.merged.colony && typeof context.merged.colony === "object" ? { ...deps2.defaultGame.colony, ...context.merged.colony } : { ...deps2.defaultGame.colony };
    normalizeColonyRunSave(context.merged.colony, clampFiniteNumber);
    context.merged.colony.wardInventory = Array.isArray(context.merged.colony.wardInventory) ? context.merged.colony.wardInventory.map((w) => w && typeof w === "object" ? { ...w, locked: !!w.locked } : w).filter(Boolean) : [];
    context.merged.colony.wardEquipped = Array.isArray(context.merged.colony.wardEquipped) ? context.merged.colony.wardEquipped.slice(0, 4) : [null, null, null, null];
    while (context.merged.colony.wardEquipped.length < 4) context.merged.colony.wardEquipped.push(null);
    let highestWardSlot = context.merged.colony.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    if (!context.savedColonyHadWardSlotVersion) context.merged.colony.wardSlots = highestWardSlot;
    else context.merged.colony.wardSlots = Math.max(1, Math.min(4, Math.floor(context.merged.colony.wardSlots || 1)));
    context.merged.colony.wardSlots = Math.max(context.merged.colony.wardSlots, highestWardSlot);
    context.merged.colony.wardSlotVersion = 1;
  }

  // modules/persistence/restore-settings.mjs
  function restorePassiveEvolution(context) {
    context.merged.passiveStarEvolution = !!context.merged.passiveStarEvolution;
    const awakeningSources = /* @__PURE__ */ new Set(["legacy_migrated", "legacy_apex", "outer_constellation", "outer_void"]);
    context.merged.passiveStarEvolutionSource = context.merged.passiveStarEvolution ? awakeningSources.has(context.merged.passiveStarEvolutionSource) ? context.merged.passiveStarEvolutionSource : "legacy_migrated" : null;
  }
  function restoreDisplaySettings(deps2, context) {
    context.merged.settings.showDeathNotice = context.merged.settings.showDeathNotice !== false;
    context.merged.settings.uiSounds = context.merged.settings.uiSounds !== false;
    context.merged.settings.runeTimingOff = context.merged.settings.runeTimingOff === true;
    context.merged.settings.soundVolume = clampFiniteNumber(context.merged.settings.soundVolume, 100, 0, 100);
    context.merged.settings.bgm = context.merged.settings.bgm !== false;
    context.merged.settings.bgmVolume = clampFiniteNumber(context.merged.settings.bgmVolume, 70, 0, 100);
    delete context.merged.settings.themeMode;
    context.merged.settings.uiSkin = (0, deps2.normalizeUiSkin)(context.merged.settings.uiSkin);
    context.merged.settings.highContrast = context.merged.settings.highContrast === true;
    context.merged.settings.hotkeyOverrides = deps2.hotkeyBindings.normalize(context.merged.settings.hotkeyOverrides);
    context.merged.settings.uiScale = (0, deps2.normalizeUiScale)(context.merged.settings.uiScale);
    context.merged.settings.uiScaleChosen = context.merged.settings.uiScaleChosen === true ? true : null;
    context.merged.settings.language = deps2.i18n.normalizeLanguage(context.merged.settings.language);
    delete context.merged.settings.uiFont;
    delete context.merged.settings.iconArtStyle;
    delete context.merged.selectedMonsterSkin;
    context.merged.settings.tabLayouts = normalizeTabLayoutSettings(context.save.settings || {});
    ["tabOrder", "tabPlacement", "tabGroupOrder", "tabPlacementInitialized"].forEach((key) => delete context.merged.settings[key]);
    context.merged.settings.twoRowTabs = false;
    context.merged.settings.leftPaneCollapsed = !!context.merged.settings.leftPaneCollapsed;
    context.merged.settings.combatLogCollapsed = !!context.merged.settings.combatLogCollapsed;
    context.merged.settings.mobileCombatLogExpanded = context.merged.settings.mobileCombatLogExpanded === true;
    context.merged.settings.hitEmphasis = context.merged.settings.hitEmphasis === "mild" ? "mild" : "normal";
    context.merged.settings.effectIntensity = ["system", "reduced", "full"].includes(context.merged.settings.effectIntensity) ? context.merged.settings.effectIntensity : "system";
  }
  function restoreAutomation(deps2, context) {
    deps2.equipmentLootPolicy.normalizeSettings(context.merged.settings);
    context.merged.settings.autoEnterGrandBreach = !!context.merged.settings.autoEnterGrandBreach;
    context.merged.settings.inventoryViewRarities = { ...deps2.defaultGame.settings.inventoryViewRarities || {}, ...context.merged.settings.inventoryViewRarities || {} };
    delete context.merged.settings.jewelAutoSalvageEnabled;
    delete context.merged.settings.jewelAutoSalvageRarities;
    context.merged.settings.mapCompleteAction = ["nextZone", "repeatZone", "nextLoopBestPlusOne", "stop"].includes(context.merged.settings.mapCompleteAction) ? context.merged.settings.mapCompleteAction : "nextZone";
    context.merged.settings.actExplorationMode = context.merged.settings.actExplorationMode === "full" ? "full" : "direct";
    normalizeAutomationSettings(context.merged.settings);
    context.merged.settings.disableItemAutomationAfterLoop = context.merged.settings.disableItemAutomationAfterLoop !== false;
    context.merged.settings.postLoopMapCompleteAction = ["nextZone", "repeatZone", "nextLoopBestPlusOne", "stop"].includes(context.merged.settings.postLoopMapCompleteAction) ? context.merged.settings.postLoopMapCompleteAction : "nextLoopBestPlusOne";
    context.merged.settings.townReturnAction = ["retry", "stop"].includes(context.merged.settings.townReturnAction) ? context.merged.settings.townReturnAction : "retry";
  }
  function restoreHeroIdentity(deps2, context) {
    context.merged.heroSelectionInitialized = !!context.merged.heroSelectionInitialized;
    let hasSavedTalentHero = !!deps2.HERO_SELECTION_DEFS[context.save && context.save.selectedHeroId];
    context.merged.selectedHeroId = hasSavedTalentHero ? context.save.selectedHeroId : "hero1";
    restoreClassFromSavedMotion(deps2, context, hasSavedTalentHero);
    restoreClassTalentAlignment(deps2, context, hasSavedTalentHero);
  }
  function restoreClassFromSavedMotion(deps2, context, hasSavedTalentHero) {
    let legacyMotionId = context.save && context.save.settings && typeof context.save.settings.testCharacterMotionId === "string" ? context.save.settings.testCharacterMotionId.replace(/^motion_/, "") : "";
    let migratedClassId = deps2.PLAYER_CLASS_DEFS[context.save && context.save.selectedClassId] ? context.save.selectedClassId : deps2.PLAYER_CLASS_DEFS[legacyMotionId] ? legacyMotionId : deps2.LEGACY_HERO_TO_PLAYER_CLASS[context.merged.selectedHeroId];
    context.merged.selectedClassId = deps2.PLAYER_CLASS_DEFS[migratedClassId] ? migratedClassId : "archer";
    if (!hasSavedTalentHero) context.merged.selectedHeroId = deps2.PLAYER_CLASS_DEFS[context.merged.selectedClassId].recommendedTalentHeroId;
  }
  function restoreClassTalentAlignment(deps2, context, hasSavedTalentHero) {
    let classTalentAlignmentVersion = Math.max(0, Math.floor(Number(context.save && context.save.classTalentAlignmentVersion) || 0));
    if (classTalentAlignmentVersion < 1 && context.save && context.save.heroSelectionInitialized) {
      context.merged.selectedHeroId = deps2.PLAYER_CLASS_DEFS[context.merged.selectedClassId].recommendedTalentHeroId;
    }
    context.merged.classTalentAlignmentVersion = 1;
    let hasSavedTalentInitializedFlag = !!context.save && Object.prototype.hasOwnProperty.call(context.save, "talentSelectionInitialized");
    context.merged.talentSelectionInitialized = hasSavedTalentInitializedFlag ? !!context.save.talentSelectionInitialized : hasSavedTalentHero || !!context.merged.heroSelectionInitialized;
  }
  function restoreHeroAppearance(deps2, context) {
    restoreFixedAppearanceClass(deps2, context);
    restoreDiscoveredClasses(deps2, context);
    restoreAppearanceMode(deps2, context);
  }
  function restoreFixedAppearanceClass(deps2, context) {
    let legacyAppearanceClassId = deps2.LEGACY_HERO_TO_PLAYER_CLASS[context.save && context.save.appearanceHeroId];
    context.merged.appearanceClassId = deps2.PLAYER_CLASS_DEFS[context.save && context.save.appearanceClassId] ? context.save.appearanceClassId : deps2.PLAYER_CLASS_DEFS[legacyAppearanceClassId] ? legacyAppearanceClassId : null;
  }
  function restoreDiscoveredClasses(deps2, context) {
    let savedDiscoveredClasses = Array.isArray(context.save && context.save.discoveredClassIds) ? context.save.discoveredClassIds : Array.isArray(context.save && context.save.discoveredHeroIds) ? context.save.discoveredHeroIds.map((id) => deps2.LEGACY_HERO_TO_PLAYER_CLASS[id]) : [];
    context.merged.discoveredClassIds = [...new Set(savedDiscoveredClasses.filter((id) => deps2.PLAYER_CLASS_DEFS[id]))];
    context.merged.classFreeSwitchUnlocked = !!(context.save && (context.save.classFreeSwitchUnlocked || context.save.heroFreeSwitchUnlocked));
  }
  function restoreAppearanceMode(deps2, context) {
    if ((context.merged.heroSelectionInitialized || context.merged.classFreeSwitchUnlocked) && !context.merged.discoveredClassIds.includes(context.merged.selectedClassId)) {
      context.merged.discoveredClassIds.push(context.merged.selectedClassId);
    }
    context.merged.classFreeSwitchUnlocked = context.merged.classFreeSwitchUnlocked || context.merged.discoveredClassIds.length >= deps2.PLAYER_CLASS_ORDER.length;
    context.merged.settings.heroAppearanceMode = ["fixed", "loop"].includes(context.savedHeroAppearanceMode) ? context.savedHeroAppearanceMode : context.merged.appearanceClassId ? "fixed" : "loop";
    if (context.merged.settings.heroAppearanceMode === "fixed" && !context.merged.appearanceClassId) context.merged.appearanceClassId = context.merged.selectedClassId;
    delete context.merged.appearanceHeroId;
    delete context.merged.discoveredHeroIds;
    delete context.merged.heroFreeSwitchUnlocked;
    context.merged.pendingLoopHeroSelection = !!context.merged.pendingLoopHeroSelection;
    normalizeLoopMutationState(context.merged);
  }

  // modules/persistence/saved-enemy-records.mjs
  function normalizeEncounterMarker(marker) {
    if (!marker || typeof marker !== "object") return null;
    let at = clampFiniteNumber(marker.at, NaN, 0, 100);
    if (!Number.isFinite(at)) return null;
    let normalized = {
      at,
      count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
      elite: !!marker.elite,
      boss: !!marker.boss
    };
    return normalized;
  }
  function normalizeEnemyRegenFatigue(enemy, hp) {
    if (enemy.regenHpMark === void 0 && enemy.regenFatigueMs === void 0 && enemy.regenLastLossAt === void 0) return {};
    return {
      regenFatigueMs: clampFiniteNumber(enemy.regenFatigueMs, 0, 0, 6e4),
      regenLastLossAt: clampFiniteNumber(enemy.regenLastLossAt, 0, 0),
      regenHpMark: clampFiniteNumber(enemy.regenHpMark, hp, 0)
    };
  }
  function normalizeEnemyRecord(deps2, merged, enemy) {
    if (!enemy || typeof enemy !== "object") return null;
    let hp = clampFiniteNumber(enemy.hp, NaN, 0);
    let maxHp = clampFiniteNumber(enemy.maxHp, clampFiniteNumber(hp, 1, 1), 1);
    if (!Number.isFinite(hp)) hp = maxHp;
    return normalizeEnemyGridFields(deps2, merged, {
      ...enemy,
      ...merged.currentZoneId === deps2.WOODSMAN_ECHO_ZONE_ID ? { noAttack: true, regenRate: 0 } : {},
      id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
      hp: Math.min(maxHp, hp),
      maxHp,
      attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
      regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
      ...normalizeEnemyRegenFatigue(enemy, Math.min(maxHp, hp)),
      spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
      spawnStamp: 0,
      groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
      variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
      ele: enemy.ele || "phys",
      name: enemy.name || "이름 없는 적",
      atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
      dr: clampFiniteNumber(enemy.dr, 0, 0),
      resF: clampFiniteNumber(enemy.resF, 0),
      resC: clampFiniteNumber(enemy.resC, 0),
      resL: clampFiniteNumber(enemy.resL, 0),
      resChaos: clampFiniteNumber(enemy.resChaos, 0),
      isElite: !!enemy.isElite,
      isBoss: !!enemy.isBoss
    });
  }
  function normalizeEnemyGridFields(deps2, merged, record2) {
    delete record2.battleSlot;
    restoreSavedBossPicture(deps2, record2, merged);
    const exploration = merged.actExploration;
    if (exploration) return record2;
    let gx = Math.floor(clampFiniteNumber(record2.gx, NaN, 0, deps2.COMBAT_GRID_CONFIG.columns - 1));
    let gy = Math.floor(clampFiniteNumber(record2.gy, NaN, 0, deps2.COMBAT_GRID_CONFIG.rows - 1));
    if (Number.isFinite(gx) && Number.isFinite(gy)) {
      record2.gx = gx;
      record2.gy = gy;
    } else {
      delete record2.gx;
      delete record2.gy;
    }
    record2.gridMoveTimer = 0;
    if (record2.attackKind !== "melee" && record2.attackKind !== "ranged") {
      delete record2.attackKind;
      delete record2.attackRange;
    } else {
      record2.attackRange = Math.max(1, Math.floor(clampFiniteNumber(record2.attackRange, 1, 1, 99)));
    }
    return record2;
  }
  function normalizeRecentDamageEvent(deps2, entry) {
    if (!entry || typeof entry !== "object") return null;
    let ele = (0, deps2.normalizeDamageElementKey)(entry.ele);
    let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
    return {
      at: clampFiniteNumber(entry.at, Date.now(), 0),
      ele,
      amount,
      source: typeof entry.source === "string" ? entry.source : "",
      sourceType: ["monster", "hazard", "ailment"].includes(entry.sourceType) ? entry.sourceType : "hazard",
      sourceId: typeof entry.sourceId === "string" || Number.isFinite(entry.sourceId) ? entry.sourceId : null,
      sourceName: typeof entry.sourceName === "string" ? entry.sourceName : "",
      ailmentType: typeof entry.ailmentType === "string" ? entry.ailmentType : ""
    };
  }
  function pruneEnemyRuntimeMap(aliveEnemyIds, rawMap, options = {}) {
    let map = rawMap && typeof rawMap === "object" ? rawMap : {};
    let keys = Object.keys(map);
    let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
    let out = {};
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i];
      if (!aliveEnemyIds.has(String(key))) continue;
      out[key] = map[key];
      if (Object.keys(out).length >= maxKeys) break;
    }
    return out;
  }

  // modules/persistence/saved-damage-history.mjs
  function normalizeDeathDamageSummaryRows(deps2, rows) {
    let damageSummary = Array.isArray(rows) ? rows.map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      let ele = (0, deps2.normalizeDamageElementKey)(entry.ele);
      let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
      return { ele, value };
    }).filter(Boolean) : [];
    let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
    damageSummary.forEach((entry) => {
      totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
    });
    return Object.keys(totals).map((ele) => ({ ele, value: totals[ele] })).filter((entry) => entry.value > 0).sort((a, b) => b.value - a.value);
  }
  function normalizeDeathMonsterSummaryRows(deps2, rows) {
    return Array.isArray(rows) ? rows.map((row) => {
      if (!row || typeof row !== "object") return null;
      let byElement = {};
      ["phys", "fire", "cold", "light", "chaos", "other"].forEach((ele) => {
        let value = Math.max(0, Math.floor(clampFiniteNumber(row.byElement && row.byElement[ele], 0, 0)));
        if (value > 0) byElement[ele] = value;
      });
      return {
        sourceId: typeof row.sourceId === "string" || Number.isFinite(row.sourceId) ? row.sourceId : null,
        name: typeof row.name === "string" && row.name ? row.name : "알 수 없는 몬스터",
        value: Math.max(0, Math.floor(clampFiniteNumber(row.value, 0, 0))),
        byElement,
        primaryElement: (0, deps2.normalizeDamageElementKey)(row.primaryElement)
      };
    }).filter((row) => row && row.value > 0).sort((a, b) => b.value - a.value) : [];
  }
  function normalizeActRetreat(deps2, value) {
    if (!value || typeof value !== "object") return null;
    const zone = (0, deps2.getZone)(value.frontierZoneId);
    const level = Math.floor(Number(value.level));
    if (zone?.type !== "act" || !(zone.id > 0) || !Number.isFinite(level) || level < 1) return null;
    return { frontierZoneId: zone.id, level };
  }
  function normalizeDeathFight(deps2, fight) {
    if (!fight || typeof fight !== "object") return null;
    return {
      seconds: Math.max(1, Math.round(clampFiniteNumber(fight.seconds, 1, 1, 86400))),
      damageSummary: normalizeDeathDamageSummaryRows(deps2, fight.damageSummary),
      ailmentDamageSummary: normalizeDeathDamageSummaryRows(deps2, fight.ailmentDamageSummary),
      monsterSummary: normalizeDeathMonsterSummaryRows(deps2, fight.monsterSummary)
    };
  }
  function normalizeDeathLog(deps2, log) {
    if (!log || typeof log !== "object") return null;
    let primaryElement = (0, deps2.normalizeDamageElementKey)(log.primaryElement);
    let damageSummary = normalizeDeathDamageSummaryRows(deps2, log.damageSummary);
    let ailmentDamageSummary = normalizeDeathDamageSummaryRows(deps2, log.ailmentDamageSummary);
    let monsterSummary = normalizeDeathMonsterSummaryRows(deps2, log.monsterSummary);
    let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map((row) => {
      if (!row || typeof row !== "object") return null;
      let type = typeof row.type === "string" && row.type ? row.type : "unknown";
      return {
        type,
        label: typeof row.label === "string" && row.label ? row.label : (0, deps2.getAilmentDisplayLabel)(type),
        time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
        power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
        sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))),
        sourceEnemyName: typeof row.sourceEnemyName === "string" ? row.sourceEnemyName : ""
      };
    }).filter(Boolean) : [];
    return {
      primaryElement,
      fatalElement: Object.keys(deps2.DAMAGE_ELEMENT_LABELS).find((ele) => ele === log.fatalElement) ?? null,
      reasonText: typeof log.reasonText === "string" && log.reasonText.trim() ? log.reasonText : deps2.DEATH_REASON_TEXT[primaryElement] || deps2.DEATH_REASON_TEXT.phys,
      expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
      damageSummary,
      ailmentDamageSummary,
      monsterSummary,
      activeAilments,
      sourceName: typeof log.sourceName === "string" ? log.sourceName : "",
      lostItems: Math.max(0, Math.floor(clampFiniteNumber(log.lostItems, 0, 0))),
      lostCurrencies: Math.max(0, Math.floor(clampFiniteNumber(log.lostCurrencies, 0, 0))),
      retreatZoneName: typeof log.retreatZoneName === "string" ? log.retreatZoneName : "",
      maxLife: Math.max(0, Math.floor(clampFiniteNumber(log.maxLife, 0, 0))),
      fight: normalizeDeathFight(deps2, log.fight),
      at: clampFiniteNumber(log.at, Date.now(), 0)
    };
  }

  // modules/persistence/saved-enemy-casts.mjs
  function restoreEnemyCasts(deps2, state) {
    const map = state.actExploration ? deps2.actExplorationMap.forRun(state.actExploration) : deps2.COMBAT_GRID_CONFIG;
    const packs = state.actExploration?.packs || [];
    [state.enemies, ...packs.map((pack) => pack.waiting)].flat().forEach((enemy) => {
      const cast = enemy.attackCast;
      if (!cast || enemy.isBoss) return;
      const validClock = [cast.startAt, cast.finishAt].every((at) => Number.isFinite(at) && at >= 0) && cast.finishAt > cast.startAt;
      const validTarget = [[cast.targetCell?.gx, map.columns], [cast.targetCell?.gy, map.rows]].every(([cell, limit]) => Number.isInteger(cell) && cell >= 0 && cell < limit);
      if (validClock && validTarget) return;
      deps2.console.warn("Invalid enemy cast discarded on load:", enemy.id);
      Object.assign(enemy, { attackCast: null, attackTimer: 0 });
    });
  }

  // modules/persistence/restore-battle.mjs
  function restoreDamageHistory(deps2, context) {
    context.merged.abyssClearedDepths = Array.isArray(context.merged.abyssClearedDepths) ? context.merged.abyssClearedDepths.map((v) => Math.max(1, Math.floor(v || 1))).filter((v) => v <= 20) : [];
    context.merged.playerAilments = Array.isArray(context.merged.playerAilments) ? context.merged.playerAilments.map((row) => normalizePlayerAilmentRow(row, clampFiniteNumber)).filter((row) => row.type) : [];
    context.merged.playerLeechInstances = Array.isArray(context.merged.playerLeechInstances) ? context.merged.playerLeechInstances.map((row) => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === "energyShield" ? "energyShield" : "life" })).filter((row) => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    context.merged.recentDamageEvents = Array.isArray(context.merged.recentDamageEvents) ? context.merged.recentDamageEvents.map(((...args) => normalizeRecentDamageEvent(deps2, ...args))).filter(Boolean) : [];
    context.merged.lastDeathLog = normalizeDeathLog(deps2, context.merged.lastDeathLog);
    context.merged.actRetreat = normalizeActRetreat(deps2, context.merged.actRetreat);
  }
  function restoreEnemyRecords(deps2, context) {
    context.merged.enemies = Array.isArray(context.merged.enemies) ? context.merged.enemies.map(((...args) => normalizeEnemyRecord(deps2, context.merged, ...args))).filter(Boolean) : [];
    deps2.actExplorationState.dropRetired(context.merged);
    deps2.actExplorationState.upgradeRotation(context.merged);
    if (context.merged.actExploration) {
      deps2.actExplorationState.validate(context.merged.actExploration, context.save.enemies || []);
      context.merged.actExploration.packs.forEach((pack) => {
        pack.waiting = pack.waiting.map(((...args) => normalizeEnemyRecord(deps2, context.merged, ...args)));
      });
    }
    restoreEnemyCasts(deps2, context.merged);
  }
  function restoreEnemyRuntimeMaps(context) {
    let aliveEnemyIds = new Set((context.merged.enemies || []).map((enemy) => String(enemy.id)));
    ["enemyKeystoneDebuffs", "rangerWeakpointMarks", "enemyUniqueChaosResDown", "enemyUniqueElementalResDown"].forEach((key) => {
      context.merged[key] = pruneEnemyRuntimeMap(aliveEnemyIds, context.merged[key], { maxKeys: 120 });
    });
    context.merged.enemyConditionDebuffs = normalizeConditionDebuffMap(context.merged.enemyConditionDebuffs);
    context.merged.encounterPlan = Array.isArray(context.merged.encounterPlan) ? context.merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
  }
  function restoreLevelAndPointBudgets(deps2, context) {
    restoreLevelAndWoodsmanAttempts(deps2, context);
    restoreCurseAndPassiveBudget(deps2, context);
  }
  function restorePassiveDisplay(deps2, context) {
    delete context.merged.inventoryExpandLevel;
    context.merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(context.merged.jewelInventoryExpandLevel, deps2.defaultGame.jewelInventoryExpandLevel, 0)));
    context.merged.settings = { ...deps2.defaultGame.settings, ...context.merged.settings || {} };
    delete context.merged.settings.testCharacterMotionId;
    context.merged.settings.chatMessageSize = ["small", "medium", "large"].includes(context.merged.settings.chatMessageSize) ? context.merged.settings.chatMessageSize : "medium";
    const passiveVisualVersion = Math.max(0, Math.floor(Number(context.save && context.save.settings && context.save.settings.passiveTreeVisualStyleVersion) || 0));
    if (passiveVisualVersion < 1) context.merged.settings.passiveTreeShowLabels = false;
    else context.merged.settings.passiveTreeShowLabels = context.merged.settings.passiveTreeShowLabels === true;
    context.merged.settings.passiveInvestmentSummaryCollapsed = passiveVisualVersion < 2 ? true : context.merged.settings.passiveInvestmentSummaryCollapsed === true;
    context.merged.settings.passiveTreeVisualStyleVersion = 2;
    if (typeof deps2.normalizePassiveTreePlannerState === "function") {
      context.merged.settings.passiveTreePlanner = (0, deps2.normalizePassiveTreePlannerState)(context.merged.settings.passiveTreePlanner);
    }
  }
  function restorePlayerResources(deps2, context) {
    context.merged.settings.damageNumberFormat = ["comma", "korean", "korean_short", "english"].includes(context.merged.settings.damageNumberFormat) ? context.merged.settings.damageNumberFormat : "comma";
    context.merged.settings.showExpComma = context.merged.settings.showExpComma !== false;
    context.merged.settings.showHpComma = context.merged.settings.showHpComma !== false;
    context.merged.settings.showEnemyHpComma = context.merged.settings.showEnemyHpComma !== false;
    context.merged.settings.showCharacterComma = context.merged.settings.showCharacterComma !== false;
    context.merged.settings.notiFilters = { ...deps2.defaultGame.settings.notiFilters || {}, ...context.merged.settings.notiFilters || {} };
    delete context.merged.settings.notiFilters.hideout;
    delete context.merged.settings.notiFilters.talisman;
    context.merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(context.merged.playerHp, deps2.defaultGame.playerHp, 0)));
    context.merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(context.merged.playerEnergyShield, deps2.defaultGame.playerEnergyShield, 0)));
    context.merged.moveTimer = clampFiniteNumber(context.merged.moveTimer, deps2.defaultGame.moveTimer, 0);
    context.merged.moveTotalTime = clampFiniteNumber(context.merged.moveTotalTime, deps2.defaultGame.moveTotalTime, 0);
    context.merged.runProgress = clampFiniteNumber(context.merged.runProgress, deps2.defaultGame.runProgress, 0, 100);
    context.merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(context.merged.encounterIndex, deps2.defaultGame.encounterIndex, 0)));
    context.merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(context.merged.nextEnemyId, deps2.defaultGame.nextEnemyId, 1)));
    context.merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.seasonPoints, deps2.defaultGame.seasonPoints, 0)));
    context.merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.loopDeepPoints, deps2.defaultGame.loopDeepPoints, 0)));
    context.merged.loopDeepStats = Object.fromEntries(deps2.LOOP_DEEP_STATS.map((def) => [
      def.key,
      Math.max(0, Math.floor(clampFiniteNumber((context.merged.loopDeepStats || {})[def.key], 0, 0)))
    ]));
    context.merged.worldTreeBark = (0, deps2.normalizeWorldTreeBark)(context.merged.worldTreeBark, context.merged);
  }
  function restoreLevelAndWoodsmanAttempts(deps2, context) {
    context.merged.level = Math.max(1, Math.floor(clampFiniteNumber(context.merged.level, deps2.defaultGame.level, 1, deps2.MAX_PLAYER_LEVEL)));
    context.merged.exp = Math.max(0, Math.floor(clampFiniteNumber(context.merged.exp, deps2.defaultGame.exp, 0)));
    context.merged.season = Math.max(1, Math.floor(clampFiniteNumber(context.merged.season, deps2.defaultGame.season, 1)));
    context.merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.loopCount, deps2.defaultGame.loopCount, 0)));
    context.merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanDefeatAttempts, deps2.defaultGame.woodsmanDefeatAttempts, 0)));
    context.merged.woodsmanSimulatorSeenLoop = !!context.merged.woodsmanSimulatorSeenLoop;
    context.merged.woodsmanEntrancePending = !!(context.merged.woodsmanEntrancePending && context.merged.currentZoneId === deps2.OUTSIDE_CHAOS_ZONE_ID);
  }
  function restoreCurseAndPassiveBudget(deps2, context) {
    context.merged.woodsmanCurseActive = !!context.merged.woodsmanCurseActive;
    context.merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseDamageTakenStacks, deps2.defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    context.merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseLastTickAt, deps2.defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    context.merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseNextLogStack, deps2.defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    context.merged.chaosInfuserUnlocked = !!context.merged.chaosInfuserUnlocked || context.merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(context.merged.woodsmanDefeatAttempts || 0)) > 0 || Array.isArray(context.merged.journalEntries) && context.merged.journalEntries.includes("woodsman");
    context.merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(context.merged.killsInZone, deps2.defaultGame.killsInZone, 0)));
    context.merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.passivePoints, deps2.defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(context.merged.autoRefundedPassivePoints || 0)) + context.pendingJournalPassivePoints;
    deps2.passiveRouting.reconcile(context.merged, deps2.PASSIVE_TREE, (0, deps2.getPassiveRouting)(context.merged), deps2.passiveRouting.pointBudget(context.merged) - context.passiveAllocationNormalization.lostBonus);
  }

  // modules/persistence/restore-realms.mjs
  function restoreRealmDefaults(deps2, context) {
    restoreRealmStatesAndSkyCurrency(deps2, context);
    restoreRealmBonusesAndFloors(deps2, context);
  }
  function restoreUnderworldProgress(deps2, context) {
    context.merged.underworldProgress = { ...deps2.defaultGame.underworldProgress || { highestFloor: 1, currentFloor: 1 }, ...context.merged.underworldProgress || {} };
    context.merged.underworldProgress.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.underworldProgress.highestFloor, 1, 1)));
    context.merged.underworldProgress.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.underworldProgress.currentFloor, 1, 1)));
    context.merged.underworldProgress.deepRewardFloor = Math.floor(clampFiniteNumber(context.merged.underworldProgress.deepRewardFloor, 0, 0, Number.MAX_SAFE_INTEGER - deps2.UNDERWORLD_DEEP_FLOOR_REWARD.every));
    let savedRunes = context.merged.underworldRunes && typeof context.merged.underworldRunes === "object" ? context.merged.underworldRunes : {};
    let underworld10ClearCredit = !!context.merged.underworldProgress.floor10Cleared || Math.max(0, Math.floor(Number(savedRunes.unlockedSlots) || 0)) >= 1 || Math.max(0, Math.floor(Number(savedRunes.unlockedRunesMaxNumber) || 0)) >= 1;
    context.merged.underworldProgress.floor10Cleared = underworld10ClearCredit;
    if (!underworld10ClearCredit) {
      context.merged.underworldProgress.highestFloor = Math.min(context.merged.underworldProgress.highestFloor, 10);
      context.merged.underworldProgress.currentFloor = Math.min(context.merged.underworldProgress.currentFloor, context.merged.underworldProgress.highestFloor);
    }
  }
  function restoreChaosProgress(deps2, context) {
    context.merged.chaosRealm.clearedFloors = Array.isArray(context.merged.chaosRealm.clearedFloors) ? Array.from(new Set(context.merged.chaosRealm.clearedFloors.map((v) => Math.floor(v || 0)).filter((v) => v >= 1))).sort((a, b) => a - b) : [];
    context.merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(context.merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(deps2.CHAOS_REALM_DEFAULT_BONUSES).forEach((key) => {
      context.merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(context.merged.chaosRealm.permanentBonuses[key]) || 0);
    });
    if (context.merged.chaosRealm.unlocked && context.merged.chaosRealm.highestFloor < 1) context.merged.chaosRealm.highestFloor = 1;
  }
  function restoreSkyAndWoodsmanScores(deps2, context) {
    restoreSkyLoopFloors(context);
    restoreSkyRewardsAndBoosts(deps2, context);
    restoreWoodsmanScoresAndEcho(deps2, context);
  }
  function restoreEchoAndLoopRecords(deps2, context) {
    context.merged.woodsmanEchoRun.timeLeft = clampFiniteNumber(context.merged.woodsmanEchoRun.timeLeft, 0, 0, 30);
    context.merged.woodsmanEchoRun.duration = 30;
    context.merged.woodsmanEchoRun.lastTickAt = clampFiniteNumber(context.merged.woodsmanEchoRun.lastTickAt, 0, 0);
    context.merged.woodsmanEchoRun.totalDamage = Math.floor(clampFiniteNumber(context.merged.woodsmanEchoRun.totalDamage, 0, 0));
    context.merged.woodsmanEchoRun.bestDps = clampFiniteNumber(context.merged.woodsmanEchoRun.bestDps, 0, 0);
    context.merged.loopProgressBase = { ...deps2.defaultGame.loopProgressBase || {}, ...context.merged.loopProgressBase || {} };
    context.merged.loopProgressCurrent = { ...deps2.defaultGame.loopProgressCurrent || {}, ...context.merged.loopProgressCurrent || {}, ...Object.fromEntries(["bestSkyFloor", "bestUnderworldFloor"].map((key) => [key, Number.isFinite(context.save?.loopProgressCurrent?.[key]) ? Math.max(0, Math.floor(context.save.loopProgressCurrent[key])) : null])) };
    context.merged.loopProgressBase.specialBosses = Array.isArray(context.merged.loopProgressBase.specialBosses) ? context.merged.loopProgressBase.specialBosses : [];
    context.merged.loopProgressCurrent.specialBosses = Array.isArray(context.merged.loopProgressCurrent.specialBosses) ? context.merged.loopProgressCurrent.specialBosses : [];
    context.merged.loopProgressCurrent.cosmosPlanets = Array.isArray(context.merged.loopProgressCurrent.cosmosPlanets) ? Array.from(new Set(context.merged.loopProgressCurrent.cosmosPlanets.filter(Boolean))) : [];
  }
  function restoreLoopGatesAndSkillSlots(deps2, context) {
    restoreCosmosLoopCount(deps2, context);
    restoreLoopCompletionAndSlots(deps2, context);
  }
  function restoreRealmStatesAndSkyCurrency(deps2, context) {
    context.merged.chaosRealm = { ...(0, deps2.createDefaultChaosRealmState)(), ...context.merged.chaosRealm || {} };
    context.merged.skyTower = { ...(0, deps2.createDefaultSkyTowerState)(), ...context.merged.skyTower || {} };
    const legacyCondensedSkyPower = Math.max(0, Math.floor(Number(context.merged.currencies.condensedSkyPower) || 0));
    if (legacyCondensedSkyPower > 0) {
      context.merged.skyTower.condensedPower = Math.max(0, Math.floor(Number(context.merged.skyTower.condensedPower) || 0)) + legacyCondensedSkyPower;
    }
  }
  function restoreRealmBonusesAndFloors(deps2, context) {
    delete context.merged.currencies.condensedSkyPower;
    context.merged.skyTower.skyStone = { ...(0, deps2.createDefaultSkyTowerState)().skyStone || {}, ...(context.merged.skyTower || {}).skyStone || {} };
    context.merged.skyTower.gemBoosts = { ...(context.merged.skyTower || {}).gemBoosts || {} };
    context.merged.chaosRealm.permanentBonuses = { ...deps2.CHAOS_REALM_DEFAULT_BONUSES, ...(context.merged.chaosRealm || {}).permanentBonuses || {} };
    context.merged.chaosRealm.unlocked = !!context.merged.chaosRealm.unlocked;
    context.merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(context.merged.chaosRealm.highestFloor, 0, 0)));
    context.merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.chaosRealm.currentFloor, 1, 1)));
  }
  function restoreSkyLoopFloors(context) {
    context.merged.skyTower.unlocked = !!context.merged.skyTower.unlocked;
    context.merged.skyTower.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.skyTower.highestFloor, 1, 1)));
    context.merged.skyTower.currentFloor = Math.max(1, Math.min(context.merged.skyTower.highestFloor, Math.floor(clampFiniteNumber(context.merged.skyTower.currentFloor, 1, 1))));
    context.merged.skyTower.loopSeason = Math.max(1, Math.floor(clampFiniteNumber(context.merged.skyTower.loopSeason, context.merged.season || 1, 1)));
    if (context.merged.skyTower.loopSeason !== Math.max(1, Math.floor(context.merged.season || 1))) {
      context.merged.skyTower.loopSeason = Math.max(1, Math.floor(context.merged.season || 1));
      context.merged.skyTower.clearedThisLoop = 0;
    }
  }
  function restoreSkyRewardsAndBoosts(deps2, context) {
    context.merged.skyTower.clearedThisLoop = Math.max(0, Math.min((0, deps2.getSkyTowerLoopClearLimit)(), Math.floor(clampFiniteNumber(context.merged.skyTower.clearedThisLoop, 0, 0))));
    context.merged.skyTower.lastResult = (0, deps2.normalizeSkyTowerResult)(context.merged.skyTower.lastResult, context.merged.season);
    context.merged.skyTower.clearedFloors = Array.isArray(context.merged.skyTower.clearedFloors) ? Array.from(new Set(context.merged.skyTower.clearedFloors.map((v) => Math.floor(v || 0)).filter((v) => v >= 1))).sort((a, b) => a - b) : [];
    context.merged.skyTower.condensedPower = Math.max(0, Math.floor(clampFiniteNumber(context.merged.skyTower.condensedPower, 0, 0)));
    context.merged.skyTower.skyStone.level = Math.max(0, Math.min((0, deps2.getSkyStoneMaxLevel)(), Math.floor(clampFiniteNumber(context.merged.skyTower.skyStone.level, 0, 0))));
    context.merged.skyTower.skyStone.crafted = !!context.merged.skyTower.skyStone.crafted || context.merged.skyTower.skyStone.level > 0;
    Object.keys(context.merged.skyTower.gemBoosts).forEach((name) => {
      context.merged.skyTower.gemBoosts[name] = Math.max(0, Math.min((0, deps2.getSkyTowerGemBoostMaxLevel)(), Math.floor(clampFiniteNumber(context.merged.skyTower.gemBoosts[name], 0, 0))));
      if (context.merged.skyTower.gemBoosts[name] <= 0) delete context.merged.skyTower.gemBoosts[name];
    });
    if (!context.merged.skyTower.unlocked && ((context.merged.season || 1) > 15 || (context.merged.season || 1) >= 15 && (context.merged.loopProgressCurrent && context.merged.loopProgressCurrent.chaos20Cleared))) context.merged.skyTower.unlocked = true;
  }
  function restoreWoodsmanScoresAndEcho(deps2, context) {
    context.merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanPendingScore, deps2.defaultGame.woodsmanPendingScore || 0, 0)));
    context.merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanLifetimeScore, deps2.defaultGame.woodsmanLifetimeScore || 0, 0)));
    context.merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanSettledScore, deps2.defaultGame.woodsmanSettledScore || 0, 0)));
    context.merged.woodsmanEchoRun = context.merged.woodsmanEchoRun && typeof context.merged.woodsmanEchoRun === "object" ? context.merged.woodsmanEchoRun : { active: false, timeLeft: 0, duration: 30, lastTickAt: 0, totalDamage: 0, bestDps: 0 };
    context.merged.woodsmanEchoRun.active = !!context.merged.woodsmanEchoRun.active && context.merged.currentZoneId === deps2.WOODSMAN_ECHO_ZONE_ID;
  }
  function restoreCosmosLoopCount(deps2, context) {
    context.merged.cosmosLoopCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.cosmosLoopCount, deps2.defaultGame.cosmosLoopCount || 0, 0)));
  }
  function restoreLoopCompletionAndSlots(deps2, context) {
    context.merged.lastLoopAdvancePath = ["chaos", "cosmos"].includes(context.merged.lastLoopAdvancePath) ? context.merged.lastLoopAdvancePath : null;
    context.merged.loopProgressCurrent.chaos20Cleared = !!context.merged.loopProgressCurrent.chaos20Cleared || Array.isArray(context.merged.abyssClearedDepths) && context.merged.abyssClearedDepths.map((v) => Math.floor(v || 0)).includes(20);
    if (!context.merged.skyTower.unlocked && (context.merged.season || 1) >= 15 && context.merged.loopProgressCurrent.chaos20Cleared) context.merged.skyTower.unlocked = true;
    normalizeLoopGateFlags(context.merged);
    context.merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendPoints, deps2.defaultGame.ascendPoints, 0)));
    context.merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendRank, deps2.defaultGame.ascendRank, 0, 5)));
    normalizeSkillSlotsSave(deps2, context.merged);
    if (Array.isArray(context.merged.woodsmanBuildSnapshot?.skills)) normalizeSkillSlotsSave(deps2, context.merged.woodsmanBuildSnapshot);
  }

  // modules/persistence/saved-summon-capacity.mjs
  function estimateSummonEquipCapForMergedSave(deps2, state) {
    let bonus = 0;
    function statValue(stat) {
      if (!stat || typeof stat !== "object") return 0;
      if (Number.isFinite(stat.val)) return stat.val;
      if (Number.isFinite(stat.value)) return stat.value;
      if (Number.isFinite(stat.base)) return stat.base;
      return 0;
    }
    bonus = accumulateSavedEquipmentSummons(deps2, state, bonus, statValue);
    bonus = accumulateSavedProgressSummons(deps2, state, bonus);
    let keystones = savedSummonKeystones(state);
    if (state && state.ascendClass === "soulbinder") {
      if (keystones.includes("sb4")) bonus += 1;
      if (keystones.includes("sb8")) bonus += 3;
    }
    bonus = accumulateSavedTalentSummons(deps2, state, bonus);
    let cap = Math.max(1, Math.floor(1 + bonus));
    let expandedCap = state && state.ascendClass === "soulbinder" && keystones.includes("sb9");
    if (expandedCap) cap = Math.floor(cap * 1.5);
    return Math.min(expandedCap ? 12 : 8, cap);
  }
  function savedSummonKeystones(state) {
    return state && Array.isArray(state.ascendKeystones) ? state.ascendKeystones : [];
  }
  function savedSummonItemStats(deps2, item) {
    return [...item.baseStats || [], ...item.stats || [], ...typeof deps2.getImmutableItemSpecialStats === "function" ? (0, deps2.getImmutableItemSpecialStats)(item) : []];
  }
  function accumulateSavedEquipmentSummons(deps2, state, bonus, statValue) {
    Object.entries(state && state.equipment || {}).forEach(([slot, item]) => {
      if (!item) return;
      savedSummonItemStats(deps2, item).forEach((stat) => {
        if (stat && stat.id === "summonCap") bonus += statValue(stat);
      });
      if (item.uniqueEffectKey === "summonCapBonus") bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
      if (item.uniqueEffectKey === "rightRingSummonCap" && slot === "반지2") bonus += Number((item.uniqueEffectParams || {}).cap) || 1;
    });
    return bonus;
  }
  function accumulateSavedProgressSummons(deps2, state, bonus) {
    (state && Array.isArray(state.passives) ? state.passives : []).forEach((id) => {
      let node = deps2.PASSIVE_TREE.nodes[id];
      if (node && node.stat === "summonCap") bonus += node.val || 0;
    });
    (state && Array.isArray(state.actRewardBonuses) ? state.actRewardBonuses : []).forEach((entry) => {
      if (entry && entry.stat === "summonCap") bonus += Number(entry.value) || 0;
    });
    (state && Array.isArray(state.journalBonuses) ? state.journalBonuses : []).forEach((entry) => {
      if (entry && entry.stat === "summonCap") bonus += Number(entry.value) || 0;
    });
    return bonus;
  }
  function accumulateSavedTalentSummons(deps2, state, bonus) {
    let ownedCards = Object.keys(state && state.talentCards || {});
    let unlockedSlots = (typeof deps2.TALENT_CARD_SLOT_UNLOCKS !== "undefined" ? deps2.TALENT_CARD_SLOT_UNLOCKS : []).filter((requirement) => ownedCards.length >= requirement).length;
    (state && Array.isArray(state.talentCardLoadout) ? state.talentCardLoadout.slice(0, unlockedSlots) : []).forEach((comboKey) => {
      let rule = typeof deps2.TALENT_PRECISE_CARD_RULES !== "undefined" ? deps2.TALENT_PRECISE_CARD_RULES[comboKey] : null;
      (rule && rule.uniques || []).forEach((effect) => {
        if (effect && effect.key === "summonCapBonus") bonus += Number((effect.params || {}).cap) || 1;
      });
    });
    return bonus;
  }

  // modules/persistence/restore-loadout.mjs
  function restoreSummonCounts(deps2, context) {
    restoreOwnedSummonNames(deps2, context);
    restoreSummonCountLedger(deps2, context);
  }
  function restoreSummonCapacity(deps2, context) {
    finishLoadout(deps2, context.merged, context.saveSummonCap, context.hasSavedSummonSkillCounts, context.supportRuneMigration.root.equip);
    if (context.supportRuneMigration.locked) {
      const snapshot = context.merged.woodsmanBuildSnapshot;
      const hadCounts = !!snapshot.summonSkillCounts;
      finishLoadout(deps2, snapshot, estimateSummonEquipCapForMergedSave(deps2, { ...context.merged, ...snapshot }), hadCounts, context.supportRuneMigration.locked.equip);
    }
    context.merged.summonLoadoutInitialized = true;
    normalizeGemEnhanceTargetSave(deps2, context.merged);
    if (typeof context.merged.currentZoneId === "string" && /^\d+$/.test(context.merged.currentZoneId)) context.merged.currentZoneId = parseInt(context.merged.currentZoneId, 10);
  }
  function restoreOwnedSummonNames(deps2, context) {
    context.merged.equippedSummonSkills = Array.isArray(context.merged.equippedSummonSkills) ? Array.from(new Set(context.merged.equippedSummonSkills.filter((name) => {
      return summon(deps2, name) && context.merged.skills.includes(name);
    }))) : [];
    context.hasSavedSummonSkillCounts = !!(context.save && Object.prototype.hasOwnProperty.call(context.save, "summonSkillCounts") && context.save.summonSkillCounts && typeof context.save.summonSkillCounts === "object");
  }
  function restoreSummonCountLedger(deps2, context) {
    context.merged.summonSkillCounts = context.hasSavedSummonSkillCounts ? { ...context.merged.summonSkillCounts } : {};
    Object.keys(context.merged.summonSkillCounts).forEach((name) => {
      if (!context.merged.equippedSummonSkills.includes(name)) delete context.merged.summonSkillCounts[name];
    });
    if (context.hasSavedSummonSkillCounts) context.merged.equippedSummonSkills.forEach((name) => {
      context.merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(context.merged.summonSkillCounts[name]) || 1));
    });
    let ownedSummonAttackSkills = (Array.isArray(context.merged.skills) ? context.merged.skills : []).filter((name) => {
      let def = deps2.SKILL_DB[name] || {};
      return !!(def && Array.isArray(def.tags) && def.tags.includes("summon_attack"));
    });
    context.saveSummonCap = estimateSummonEquipCapForMergedSave(deps2, context.merged);
    if (!context.merged.summonLoadoutInitialized && context.merged.equippedSummonSkills.length === 0 && ownedSummonAttackSkills.length > 0) {
      context.merged.equippedSummonSkills = ownedSummonAttackSkills.slice(0, context.saveSummonCap);
      if (context.hasSavedSummonSkillCounts) context.merged.equippedSummonSkills.forEach((name) => {
        context.merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(context.merged.summonSkillCounts[name]) || 1));
      });
    }
  }

  // modules/persistence/saved-cosmos-route.mjs
  function restoreCosmosRouteSave(deps2, state) {
    restoreCosmosRouteBoard(deps2, state);
    const route = state.cosmosRoute;
    if (!route) {
      state.cosmosRoute = null;
      return;
    }
    if (!isValidCosmosRouteSave(deps2, route)) {
      deps2.console.warn("Invalid cosmos route save discarded; earned rewards and atlas records retained.");
      state.cosmosRoute = null;
      return;
    }
    state.cosmosRoute = JSON.parse(JSON.stringify(route));
    if (route.version === 1) deps2.cosmosRouteRuntime.upgrade(state);
    const active = ["fighting", "choice"].includes(route.phase);
    if (!active) return;
    if (route.loop !== state.season || state.currentZoneId !== "cosmos_challenge") {
      state.cosmosRoute.phase = "returned";
      state.cosmosRoute.queue = [];
      return;
    }
    if (route.phase === "choice") state.combatHalted = true;
    else if (state.cosmosAtlas.activeChallenge?.nodeId !== route.queue[0]) {
      state.cosmosRoute.phase = "returned";
      state.cosmosRoute.queue = [];
    }
  }
  function isValidCosmosRouteSave(deps2, route) {
    if ([3, 4, 5].includes(route.version)) return isValidCosmosExpeditionSave(deps2, route);
    return isValidLegacyCosmosRouteSave(deps2, route);
  }
  function isValidLegacyCosmosRouteSave(deps2, route) {
    if (![1, 2].includes(route.version) || !["dust", "boss"].includes(route.goal)) return false;
    if (!["fighting", "choice", "complete", "failed", "returned"].includes(route.phase)) return false;
    if (![0, 1, 2, 3, 4, 5].includes(route.stage)) return false;
    if (![1, 2, 3, 4, 5].includes(route.legSize)) return false;
    if (!Number.isFinite(route.loop) || !Number.isFinite(route.dust) || route.dust < 0) return false;
    return isValidCosmosRouteLedger(deps2, route) && isValidCosmosRouteVersion(deps2, route);
  }
  function isValidCosmosRouteVersion(deps2, route) {
    return route.version === 1 || isValidCosmosRoutePlan(deps2, route);
  }
  function restoreCosmosRouteBoard(deps2, state) {
    const saved = state.cosmosRouteBoard;
    const defaults = deps2.defaultGame.cosmosRouteBoard;
    const board = saved && typeof saved === "object" ? saved : defaults;
    state.cosmosRouteBoard = {
      seed: Number.isSafeInteger(board.seed) ? Math.max(1, Math.min(1e9, board.seed)) : 1,
      selected: [0, 1, 2].includes(board.selected) ? board.selected : 0,
      goal: ["dust", "boss"].includes(board.goal) ? board.goal : "dust",
      retryAt: Number.isFinite(board.retryAt) ? Math.max(0, Math.min(board.retryAt, Date.now() + deps2.COSMOS_ROUTE_G1.retryMs)) : 0,
      decisions: { ...defaults.decisions },
      habitats: defaults.habitats.map((id, index) => Object.hasOwn(deps2.COSMOS_ROUTE_G1.habitats, board.habitats?.[index]) ? board.habitats[index] : id)
    };
    for (const stage of [1, 3]) {
      const signal = board.decisions?.[stage];
      if (deps2.COSMOS_ROUTE_G1.choices[stage].includes(signal)) state.cosmosRouteBoard.decisions[stage] = signal;
    }
  }
  function isValidCosmosExpeditionSave(deps2, route) {
    if (!["fighting", "complete", "failed", "returned"].includes(route.phase)) return false;
    if (!Number.isSafeInteger(route.seed) || !Number.isFinite(route.loop) || !["dust", "boss"].includes(route.goal)) return false;
    const definition = deps2.COSMOS_ROUTE_GALAXIES[route.version === 5 ? route.galaxy : 1];
    return !!definition && isValidCosmosExpeditionPlan(deps2, route, definition) && isValidCosmosExpeditionLedger(route) && isValidCosmosExpeditionPhase(route);
  }
  function isValidCosmosExpeditionPlan(deps2, route, definition) {
    if (!Array.isArray(route.plan) || route.plan.length !== 4) return false;
    if (!route.plan.every((ids2, i) => Array.isArray(ids2) && ids2.length === definition.lengths[i])) return false;
    if (route.version === 3 && !isValidLegacyCosmosHabitats(deps2, route.habitats)) return false;
    const ids = route.plan.flat(), expected = /* @__PURE__ */ new Set([definition.start, definition.boss, ...definition.middle]);
    if (ids[0] !== definition.start || ids.at(-1) !== definition.boss) return false;
    return new Set(ids.filter((id) => expected.has(id))).size === definition.total;
  }
  function isValidCosmosExpeditionLedger(route) {
    if (!Array.isArray(route.history) || !Array.isArray(route.queue) || route.history.length > route.plan.flat().length) return false;
    if (!Number.isFinite(route.dust) || route.dust < 0) return false;
    const ledger = route.plan.flatMap((leg, stage) => leg.map((id) => ({ id, stage })));
    if (!route.history.every((row, i) => row?.id === ledger[i].id && row.stage === ledger[i].stage && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    return route.history.reduce((sum, row) => sum + row.dust, 0) === route.dust;
  }
  function isValidLegacyCosmosHabitats(deps2, habitats) {
    return Array.isArray(habitats) && habitats.length === 4 && habitats[3] === "guard" && habitats.every((id) => Object.hasOwn(deps2.COSMOS_ROUTE_G1.habitats, id));
  }
  function isValidCosmosExpeditionPhase(route) {
    if (route.phase === "complete") return route.stage === 4 && route.history.length === route.plan.flat().length && route.queue.length === 0;
    if (![0, 1, 2, 3].includes(route.stage)) return false;
    if (route.phase !== "fighting") return route.queue.length === 0;
    const ledger = route.plan.flatMap((leg, stage) => leg.map((id) => ({ id, stage })));
    return ledger[route.history.length]?.stage === route.stage && isValidCosmosRoutePlanProgress(route);
  }
  function isValidCosmosRoutePlan(deps2, route) {
    if (!Number.isInteger(route.seed) || !Array.isArray(route.plan) || route.plan.length !== 5) return false;
    if (![1, 3].every((stage) => deps2.COSMOS_ROUTE_G1.choices[stage].includes(route.decisions[stage]))) return false;
    if (!route.plan.every((leg, stage) => Array.isArray(leg) && leg.length === (stage % 4 === 0 ? 1 : route.legSize))) return false;
    if (route.plan[0][0] !== deps2.COSMOS_ROUTE_G1.start || route.plan[4][0] !== deps2.COSMOS_ROUTE_G1.boss) return false;
    const middle = route.plan.slice(1, 4).flat();
    const pool = /* @__PURE__ */ new Set([...deps2.COSMOS_ROUTE_G1.planets, ...deps2.COSMOS_ROUTE_G1.asteroids]);
    if (new Set(middle).size !== middle.length || !middle.every((id) => pool.has(id))) return false;
    return isValidCosmosRoutePlanProgress(route);
  }
  function isValidCosmosRoutePlanProgress(route) {
    if (!Array.isArray(route.history)) return false;
    if (!route.history.every((row) => route.plan[row.stage]?.includes(row.id))) return false;
    if (route.phase !== "fighting") return true;
    const remaining = route.plan[route.stage].filter((id) => !route.history.some((row) => row.id === id));
    return JSON.stringify(route.queue) === JSON.stringify(remaining);
  }
  function isValidCosmosRouteLedger(deps2, route) {
    const ids = /* @__PURE__ */ new Set([
      deps2.COSMOS_ROUTE_G1.start,
      deps2.COSMOS_ROUTE_G1.boss,
      ...deps2.COSMOS_ROUTE_G1.planets,
      ...deps2.COSMOS_ROUTE_G1.asteroids
    ]);
    if (!Array.isArray(route.queue) || !Array.isArray(route.history) || route.history.length > 17) return false;
    if (!isValidCosmosRoutePhase(route)) return false;
    if (!route.queue.every((id) => ids.has(id)) || route.queue.length > 5) return false;
    if (!route.history.every((row) => row && ids.has(row.id) && Number.isFinite(row.dust) && row.dust >= 0)) return false;
    const combined = [...route.queue, ...route.history.map((row) => row.id)];
    if (new Set(combined).size !== combined.length) return false;
    return true;
  }
  function isValidCosmosRoutePhase(route) {
    if (!route.decisions || typeof route.decisions !== "object") return false;
    if (!["survey", "salvage", "rift"].includes(route.signal)) return false;
    if (route.phase === "complete") return route.stage === 5;
    if (route.phase === "choice") return [1, 3].includes(route.stage) && route.queue.length === 0;
    if (route.phase === "fighting") return route.stage < 5 && route.queue.length > 0;
    return route.queue.length === 0;
  }

  // modules/persistence/saved-combat-runtime.mjs
  function normalizeSavedCombatRuntime(deps2, state) {
    state.knitting = deps2.knitting.normalize(state.knitting, state.season);
    deps2.actExplorationState.groundLoot.normalizeEncounter(state);
    deps2.actExplorationState.restore(state);
    deps2.combatLootReceipts.normalize(state);
    state.cosmosGravity = null;
    restoreCosmosRouteSave(deps2, state);
    const challenge = state.cosmosAtlas.activeChallenge;
    if (challenge) challenge.habitat = deps2.cosmosRouteRuntime.habitat(state, challenge.nodeId);
    const time = Number(state.combatTimeMs);
    state.combatTimeMs = Number.isFinite(time) ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, time)) : 0;
    delete state.isBackgroundCalculation;
    delete state.backgroundStopReason;
    delete state.backgroundOverflowSalvageCount;
    delete state.backgroundKillMix;
    return state;
  }
  function getSavedZoneForValidation(deps2, state) {
    if (state.currentZoneId === deps2.ATLAS.zoneId) return deps2.atlas.zone(state);
    if (state.currentZoneId === "cosmos_challenge") return (0, deps2.createCosmosChallengeZone)(state);
    const zone = (0, deps2.getZone)(state.currentZoneId);
    return zone?.id === state.currentZoneId ? zone : null;
  }

  // modules/persistence/restore-location.mjs
  function restoreNumericZones(deps2, context) {
    if (typeof context.merged.maxZoneId === "string" && /^\d+$/.test(context.merged.maxZoneId)) context.merged.maxZoneId = parseInt(context.merged.maxZoneId, 10);
    if (typeof context.merged.maxZoneId !== "string") {
      let mergedSeasonCap = (0, deps2.getSeasonFinalZoneId)(context.merged.season || 1);
      context.merged.maxZoneId = (0, deps2.clampNumber)(Number.isFinite(context.merged.maxZoneId) ? context.merged.maxZoneId : 0, 0, Math.max(deps2.MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof context.merged.currentZoneId !== "string") {
      let numericZoneId = Number.isFinite(context.merged.currentZoneId) ? context.merged.currentZoneId : 0;
      let savedDepth = Math.max(Math.floor(context.merged.abyssEndlessDepth || 20), (0, deps2.getAbyssDepthFromZoneId)(numericZoneId), ...(Array.isArray(context.merged.abyssUnlockedDepths) ? context.merged.abyssUnlockedDepths : [20]).map((v) => Math.floor(v || 0)));
      let maxDeepZoneId = (0, deps2.getAbyssZoneIdForDepth)(Math.max(20, savedDepth));
      context.merged.currentZoneId = (0, deps2.clampNumber)(numericZoneId, 0, Math.max(deps2.MAP_ZONES.length - 1, maxDeepZoneId));
    }
    deps2.atlas.normalize(context.merged);
  }
  function restoreActiveLocation(deps2, context) {
    if (typeof context.merged.currentZoneId === "string" && !getSavedZoneForValidation(deps2, context.merged)) context.merged.currentZoneId = (0, deps2.getAutoProgressZoneId)(context.merged.maxZoneId);
    restoreInactiveRunLocation(deps2, context);
    clearInactiveRunLocks(deps2, context);
    restoreReachableDepthAndRoot(deps2, context);
  }
  function restoreInactiveRunLocation(deps2, context) {
    if (context.merged.currentZoneId === deps2.BEYOND_BOUNDARY_ZONE_ID && !context.merged.beyondBoundary.activeRun) context.merged.currentZoneId = (0, deps2.getAutoProgressZoneId)(context.merged.maxZoneId);
    if (context.merged.currentZoneId === "beehive_run" && !(context.merged.beehive && context.merged.beehive.inRun)) context.merged.currentZoneId = context.merged.beehive && context.merged.beehive.returnZoneId !== void 0 && context.merged.beehive.returnZoneId !== null ? context.merged.beehive.returnZoneId : context.merged.maxZoneId;
  }
  function clearInactiveRunLocks(deps2, context) {
    if (context.merged.beehive && context.merged.beehive.inRun && context.merged.currentZoneId !== "beehive_run") {
      context.merged.beehive.inRun = false;
      (0, deps2.resetBeehiveRunModifiers)(context.merged.beehive);
    }
    if (context.merged.woodsmanBuildLock && (context.merged.currentZoneId !== deps2.OUTSIDE_CHAOS_ZONE_ID || !context.merged.woodsmanBuildSnapshot)) {
      context.merged.woodsmanBuildLock = false;
      context.merged.woodsmanBuildSnapshot = null;
    }
  }
  function restoreReachableDepthAndRoot(deps2, context) {
    let currentAbyssDepth = typeof context.merged.currentZoneId !== "string" ? (0, deps2.getAbyssDepthFromZoneId)(context.merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = isSavedDeepChaosSlot(context, currentAbyssDepth);
    if (typeof context.merged.maxZoneId !== "string" && typeof context.merged.currentZoneId !== "string" && context.merged.currentZoneId > context.merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) context.merged.currentZoneId = context.merged.maxZoneId;
    if (context.merged.discoveredPassives.length === 0) context.merged.discoveredPassives = [(0, deps2.getPassiveTreeRootNodeId)(context.merged)];
  }
  function restoreProgressionCaps(deps2, context) {
    clampSavedProgressToSeason(deps2, context);
    if ((context.merged.season || 1) >= deps2.METEOR_SITE_UNLOCK_LOOP && (context.merged.maxZoneId || 0) >= deps2.METEOR_SITE_UNLOCK_ACT) {
      context.merged.meteorSite.unlocked = true;
    }
    (0, deps2.reconcileMapPrimaryContentUnlocks)(context.merged);
    if (!(0, deps2.isMapPrimaryContentUnlocked)(context.merged, context.merged.mapSubtab)) context.merged.mapSubtab = "map-tab-zones";
  }
  function clampSavedProgressToSeason(deps2, context) {
    let seasonCap = (0, deps2.getSeasonFinalZoneId)(context.merged.season || 1);
    if (typeof context.merged.maxZoneId !== "string") context.merged.maxZoneId = (0, deps2.clampNumber)(context.merged.maxZoneId, 0, seasonCap);
    if (typeof context.merged.currentZoneId !== "string") {
      let normalizedDepth = (0, deps2.getAbyssDepthFromZoneId)(context.merged.currentZoneId);
      let keepLegacyDeepChaosSlot = isSavedDeepChaosSlot(context, normalizedDepth);
      if (normalizedDepth <= 20 && !keepLegacyDeepChaosSlot || (context.merged.season || 1) < 10) context.merged.currentZoneId = (0, deps2.clampNumber)(context.merged.currentZoneId, 0, seasonCap);
    }
  }
  function isSavedDeepChaosSlot(context, depth) {
    return (context.merged.season || 1) >= 10 && depth === 20 && Math.floor(context.merged.abyssEndlessDepth || 0) > 20;
  }
  function restoreStumpAndSaveVersion(deps2, context) {
    if (typeof deps2.salvageRecoveryRuntime !== "undefined") deps2.salvageRecoveryRuntime.ensureState(context.merged);
    if (typeof deps2.stumpBox === "object") deps2.stumpBox.restore(context.merged);
    context.merged.stumpCube = deps2.stumpCube.normalize(context.merged.stumpCube);
    keepLegacyAccessorySockets(deps2, context.merged, context.save);
    context.merged.saveVersion = deps2.defaultGame.saveVersion;
  }

  // modules/persistence/saved-woodsman.mjs
  function stripBossPatternRuntime(deps2, enemy) {
    if (!enemy || typeof enemy !== "object") return;
    delete enemy.lastPatternState;
    if (enemy.patternMode === "woodsman") {
      normalizeWoodsmanStumps(deps2, enemy);
      Object.assign(enemy, {
        patternArea: null,
        patternTelegraphKey: null,
        patternTelegraphStartedAt: 0,
        nextPatternState: null,
        attackCast: null,
        attackTimer: 0,
        apexRecoveryUntil: 0
      });
    }
    const center = enemy.patternArea && enemy.patternArea.center;
    const nested = center && typeof center === "object" && ["hp", "patternArea", "lastPatternState"].some((key) => key in center);
    if (nested) enemy.patternArea.center = { gx: Math.floor(Number(center.gx) || 0), gy: Math.floor(Number(center.gy) || 0) };
  }
  function normalizeWoodsmanStumps(deps2, enemy) {
    enemy.woodsmanStumpsDue = !!enemy.woodsmanStumpsDue;
    enemy.woodsmanStumpsPlaced = !!enemy.woodsmanStumpsPlaced;
    const rows = Array.isArray(enemy.woodsmanStumps) ? enemy.woodsmanStumps : [];
    enemy.woodsmanStumps = rows.filter((c) => c && Number.isInteger(c.gx) && Number.isInteger(c.gy) && c.gx >= 0 && c.gy >= 0 && c.gx < 999 && c.gy < 999).slice(0, 1).map(((...args) => normalizeWoodsmanStumpAnchor(deps2, ...args)));
  }
  function normalizeWoodsmanStumpAnchor(deps2, c) {
    const time = (value) => Number.isFinite(value) ? Math.max(0, value) : 0;
    const large = c.footprint?.columns === 3 && c.footprint?.rows === 2;
    const footprint = large ? { columns: 3, rows: 2 } : { columns: 1, rows: 1 };
    const { phase, target } = normalizeWoodsmanCycle(c);
    const cap = deps2.WOODSMAN_BATTLE.stumps.maxAdds, count = Number.isFinite(c.absorbedCount) ? Math.floor(c.absorbedCount) : 0;
    return {
      gx: c.gx,
      gy: c.gy,
      footprint,
      plantedAt: time(c.plantedAt),
      nextSpawnAt: time(c.nextSpawnAt),
      phase,
      phaseAt: time(c.phaseAt),
      target,
      lastSpawnAt: time(c.lastSpawnAt),
      healAt: time(c.healAt),
      spawnSerial: Math.floor(time(c.spawnSerial)) % deps2.WOODSMAN_BATTLE.stumps.summons.length,
      absorbedCount: phase === "absorbing" ? Math.max(0, Math.min(cap, count)) : 0,
      echoes: phase === "absorbing" ? normalizeWoodsmanEchoes(deps2, c.echoes) : []
    };
  }
  function normalizeWoodsmanCycle(c) {
    let phase = ["idle", "rising", "absorbing", "seeking", "moving"].includes(c.phase) ? c.phase : "idle";
    const target = phase === "moving" ? normalizeWoodsmanLanding(c.target) : null;
    if (phase === "moving" && !target) phase = "seeking";
    return { phase, target };
  }
  function normalizeWoodsmanLanding(cell) {
    return cell && Number.isInteger(cell.gx) && Number.isInteger(cell.gy) && cell.gx >= 0 && cell.gy >= 0 && cell.gx < 999 && cell.gy < 999 ? { gx: cell.gx, gy: cell.gy } : null;
  }
  function normalizeWoodsmanEchoes(deps2, value) {
    const looks = new Set(deps2.WOODSMAN_BATTLE.stumps.summons.map((row) => row.look));
    return (Array.isArray(value) ? value : []).filter((e) => normalizeWoodsmanLanding(e) && looks.has(e.spriteVariantId)).slice(0, deps2.WOODSMAN_BATTLE.stumps.maxAdds).map((e, index) => ({
      ...normalizeWoodsmanLanding(e),
      id: Number.isFinite(e.id) ? e.id : -3e3 - index,
      spriteVariantId: e.spriteVariantId,
      hp: 1,
      maxHp: 1,
      isBoss: false,
      ele: deps2.WOODSMAN_BATTLE.elements.includes(e.ele) ? e.ele : "chaos"
    }));
  }

  // modules/persistence/restore-finish.mjs
  function restoreRetiredSystems(deps2, context) {
    delete context.merged.bountyHunt;
    const explorationPacks = Array.isArray(context.merged.actExploration?.packs) ? context.merged.actExploration.packs : [];
    [context.merged.enemies, ...explorationPacks.map((pack) => pack?.waiting)].filter(Array.isArray).flat().forEach((enemy) => {
      if (enemy) {
        delete enemy.isBountyTarget;
        delete enemy.bountyId;
      }
    });
    [context.merged.enemies, ...explorationPacks.map((pack) => pack?.waiting)].filter(Array.isArray).flat().forEach(((...args) => stripBossPatternRuntime(deps2, ...args)));
    stripRemovedGrowthBoard(context.merged);
    stripRemovedFlasks(context.merged);
    stripRemovedStarWedges(context.merged);
    stripRetiredSpores(context.merged);
    stripRemovedAuxSystems(deps2, context.merged);
    migrateRetiredWoodMonsters(deps2, context.merged);
    migrateRetiredRealmMonsters(deps2, context.merged);
    delete context.merged.shrineState;
    delete context.merged.shrineBuff;
    reconcileUniqueEquipmentSave(deps2, context.merged);
    (0, deps2.enforcePassiveEquipmentRestrictions)(context.merged);
  }
  function finishRestoredSave(deps2, context) {
    const normalized = normalizeContentProgressionSave(deps2, normalizeSavedCombatRuntime(deps2, context.merged), context.save);
    normalizeStoredEquipmentSave(deps2, normalized);
    deps2.playerStall.restore(normalized);
    normalized.craftOmen = (0, deps2.normalizeCraftOmen)(normalized.craftOmen);
    normalizeEquipmentCraftChoiceSave(deps2, normalized);
    return normalized;
  }

  // modules/persistence/restore-saved-game.mjs
  function restoreSavedGame(deps2, save) {
    const context = { save };
    restoreInitialSnapshot(deps2, context);
    restoreRuneAndCurrencyMigrations(deps2, context);
    restoreSavedMetadata(deps2, context);
    restoreCarriedEquipment(deps2, context);
    restoreGemRecords(deps2, context);
    restoreLegacyZoneIds(deps2, context);
    restorePassiveAllocation(deps2, context);
    restorePassiveChoices(deps2, context);
    restorePassiveLayout(deps2, context);
    restoreActRewards(deps2, context);
    restoreSeasonUnlocks(context);
    restoreEndlessDepths(deps2, context);
    restoreJewelsAndEngravings(deps2, context);
    restoreAscendancyProgress(deps2, context);
    restoreAscendancyCaps(deps2, context);
    restoreVoidPassives(deps2, context);
    restoreCraftAndMapTabs(deps2, context);
    restoreRetiredCraftPanels(context);
    restoreCodexAndColony(deps2, context);
    restoreBeehiveRun(deps2, context);
    restoreJournalAndNpcs(deps2, context);
    restorePassiveEvolution(context);
    restoreDisplaySettings(deps2, context);
    restoreAutomation(deps2, context);
    restoreHeroIdentity(deps2, context);
    restoreHeroAppearance(deps2, context);
    restoreDamageHistory(deps2, context);
    restoreEnemyRecords(deps2, context);
    restoreEnemyRuntimeMaps(context);
    restoreLevelAndPointBudgets(deps2, context);
    restorePassiveDisplay(deps2, context);
    restorePlayerResources(deps2, context);
    restoreRealmDefaults(deps2, context);
    restoreUnderworldProgress(deps2, context);
    restoreChaosProgress(deps2, context);
    restoreSkyAndWoodsmanScores(deps2, context);
    restoreEchoAndLoopRecords(deps2, context);
    restoreLoopGatesAndSkillSlots(deps2, context);
    restoreSummonCounts(deps2, context);
    restoreSummonCapacity(deps2, context);
    restoreNumericZones(deps2, context);
    restoreActiveLocation(deps2, context);
    restoreProgressionCaps(deps2, context);
    restoreStumpAndSaveVersion(deps2, context);
    restoreRetiredSystems(deps2, context);
    return finishRestoredSave(deps2, context);
  }

  // modules/save-migrations-classic.mjs
  var deps = {
    get ABYSS_START_ZONE_ID() {
      return ABYSS_START_ZONE_ID;
    },
    get ACT_BOSS_ASSET_KEYS() {
      return ACT_BOSS_ASSET_KEYS;
    },
    get ACT_MONSTER_VISUAL_BY_ID() {
      return ACT_MONSTER_VISUAL_BY_ID;
    },
    get ACT_ZONE_COUNT() {
      return ACT_ZONE_COUNT;
    },
    get ATLAS() {
      return ATLAS;
    },
    get BASIC_SKILL_ELEMENTS() {
      return BASIC_SKILL_ELEMENTS;
    },
    get BEYOND_BOUNDARY_ZONE_ID() {
      return BEYOND_BOUNDARY_ZONE_ID;
    },
    get CHAOS_REALM_DEFAULT_BONUSES() {
      return CHAOS_REALM_DEFAULT_BONUSES;
    },
    get CLASS_KEYSTONE_DEFS() {
      return CLASS_KEYSTONE_DEFS;
    },
    get CLASS_KEYSTONE_PICK_LIMIT() {
      return CLASS_KEYSTONE_PICK_LIMIT;
    },
    get CLASS_TEMPLATES() {
      return CLASS_TEMPLATES;
    },
    get COMBAT_GRID_CONFIG() {
      return COMBAT_GRID_CONFIG;
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get COSMOS_ROUTE_G1() {
      return COSMOS_ROUTE_G1;
    },
    get COSMOS_ROUTE_GALAXIES() {
      return COSMOS_ROUTE_GALAXIES;
    },
    get CURRENCY_LEGACY_MERGE() {
      return typeof CURRENCY_LEGACY_MERGE === "undefined" ? void 0 : CURRENCY_LEGACY_MERGE;
    },
    get DAMAGE_ELEMENT_LABELS() {
      return DAMAGE_ELEMENT_LABELS;
    },
    get DEATH_REASON_TEXT() {
      return DEATH_REASON_TEXT;
    },
    get EQUIPMENT_DROUGHT_RULES() {
      return EQUIPMENT_DROUGHT_RULES;
    },
    get GRAND_BREACH_ENCOUNTER() {
      return GRAND_BREACH_ENCOUNTER;
    },
    get HERO_SELECTION_DEFS() {
      return HERO_SELECTION_DEFS;
    },
    get JOURNAL_DB() {
      return JOURNAL_DB;
    },
    get LABYRINTH_ZONE_ID() {
      return LABYRINTH_ZONE_ID;
    },
    get LEGACY_HERO_TO_PLAYER_CLASS() {
      return LEGACY_HERO_TO_PLAYER_CLASS;
    },
    get LOOP_DEEP_STATS() {
      return LOOP_DEEP_STATS;
    },
    get MAP_ZONES() {
      return MAP_ZONES;
    },
    get MAX_PLAYER_LEVEL() {
      return MAX_PLAYER_LEVEL;
    },
    get METEOR_SITE_UNLOCK_ACT() {
      return METEOR_SITE_UNLOCK_ACT;
    },
    get METEOR_SITE_UNLOCK_LOOP() {
      return METEOR_SITE_UNLOCK_LOOP;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get OUTSIDE_CHAOS_ZONE_ID() {
      return OUTSIDE_CHAOS_ZONE_ID;
    },
    get PASSIVE_LAYOUT_VERSION() {
      return PASSIVE_LAYOUT_VERSION;
    },
    get PASSIVE_NODE_ID_MERGED() {
      return PASSIVE_NODE_ID_MERGED;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get PLAYER_CLASS_DEFS() {
      return PLAYER_CLASS_DEFS;
    },
    get PLAYER_CLASS_ORDER() {
      return PLAYER_CLASS_ORDER;
    },
    get P_STATS() {
      return P_STATS;
    },
    get RENAMED_UNIQUES() {
      return RENAMED_UNIQUES;
    },
    get RETIRED_REALM_MONSTERS() {
      return RETIRED_REALM_MONSTERS;
    },
    get RETIRED_SUPPORT_GEMS() {
      return RETIRED_SUPPORT_GEMS;
    },
    get RETIRED_WOOD_MONSTER_SKINS() {
      return RETIRED_WOOD_MONSTER_SKINS;
    },
    get SEASON_BOSS_ZONES() {
      return SEASON_BOSS_ZONES;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get TALENT_BLOOM_CARD_DEFS() {
      return typeof TALENT_BLOOM_CARD_DEFS === "undefined" ? void 0 : TALENT_BLOOM_CARD_DEFS;
    },
    get TALENT_CARD_SLOT_UNLOCKS() {
      return typeof TALENT_CARD_SLOT_UNLOCKS === "undefined" ? void 0 : TALENT_CARD_SLOT_UNLOCKS;
    },
    get TALENT_PRECISE_CARD_RULES() {
      return typeof TALENT_PRECISE_CARD_RULES === "undefined" ? void 0 : TALENT_PRECISE_CARD_RULES;
    },
    get TRIAL_ZONES() {
      return TRIAL_ZONES;
    },
    get UNDERWORLD_DEEP_FLOOR_REWARD() {
      return UNDERWORLD_DEEP_FLOOR_REWARD;
    },
    get UNIQUE_EQUIPMENT_RULES() {
      return UNIQUE_EQUIPMENT_RULES;
    },
    get WOODSMAN_BATTLE() {
      return WOODSMAN_BATTLE;
    },
    get WOODSMAN_ECHO_ZONE_ID() {
      return WOODSMAN_ECHO_ZONE_ID;
    },
    get actExplorationLoot() {
      return actExplorationLoot;
    },
    get actExplorationMap() {
      return actExplorationMap;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get assignEnemyGridCombatProfile() {
      return assignEnemyGridCombatProfile;
    },
    get atlas() {
      return atlas;
    },
    get bagItems() {
      return bagItems;
    },
    get clampNumber() {
      return clampNumber;
    },
    get colonyWards() {
      return colonyWards;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get console() {
      return console;
    },
    get contentProgression() {
      return contentProgression;
    },
    get coreItems() {
      return coreItems;
    },
    get cosmosRouteRuntime() {
      return cosmosRouteRuntime;
    },
    get craftingWorkspaceState() {
      return craftingWorkspaceState;
    },
    get createCosmosChallengeZone() {
      return createCosmosChallengeZone;
    },
    get createDefaultChaosRealmState() {
      return createDefaultChaosRealmState;
    },
    get createDefaultSkyTowerState() {
      return createDefaultSkyTowerState;
    },
    get dedupeList() {
      return dedupeList;
    },
    get defaultGame() {
      return window.GameModules.state.defaultGame;
    },
    get dropRuntimeOnlySaveFields() {
      return dropRuntimeOnlySaveFields;
    },
    get enforcePassiveEquipmentRestrictions() {
      return enforcePassiveEquipmentRestrictions;
    },
    get ensureMeteorSiteState() {
      return ensureMeteorSiteState;
    },
    get ensureRecordsState() {
      return typeof ensureRecordsState === "undefined" ? void 0 : ensureRecordsState;
    },
    get equipmentInventoryGridRuntime() {
      return typeof equipmentInventoryGridRuntime === "undefined" ? void 0 : equipmentInventoryGridRuntime;
    },
    get equipmentLootPolicy() {
      return equipmentLootPolicy;
    },
    get equipmentSockets() {
      return typeof equipmentSockets === "undefined" ? void 0 : equipmentSockets;
    },
    get getAbyssDepthFromZoneId() {
      return getAbyssDepthFromZoneId;
    },
    get getAbyssZoneIdForDepth() {
      return getAbyssZoneIdForDepth;
    },
    get getActMonsterPool() {
      return getActMonsterPool;
    },
    get getAilmentDisplayLabel() {
      return getAilmentDisplayLabel;
    },
    get getAutoProgressZoneId() {
      return getAutoProgressZoneId;
    },
    get getClassKeystoneDefs() {
      return getClassKeystoneDefs;
    },
    get getCodexSlotOrder() {
      return getCodexSlotOrder;
    },
    get getCurrentPassiveNodeId() {
      return typeof getCurrentPassiveNodeId === "undefined" ? void 0 : getCurrentPassiveNodeId;
    },
    get getEquipCandidateSlots() {
      return getEquipCandidateSlots;
    },
    get getGrandBreachProgress() {
      return getGrandBreachProgress;
    },
    get getImmutableItemSpecialStats() {
      return typeof getImmutableItemSpecialStats === "undefined" ? void 0 : getImmutableItemSpecialStats;
    },
    get getJewelStats() {
      return typeof getJewelStats === "undefined" ? void 0 : getJewelStats;
    },
    get getLabyrinthZoneNow() {
      return getLabyrinthZoneNow;
    },
    get getMonsterVisualAttackKind() {
      return getMonsterVisualAttackKind;
    },
    get getPassiveRouting() {
      return getPassiveRouting;
    },
    get getPassiveStatTierValue() {
      return getPassiveStatTierValue;
    },
    get getPassiveTreeRootNodeId() {
      return getPassiveTreeRootNodeId;
    },
    get getRealmMonsterVisualDefinitionById() {
      return getRealmMonsterVisualDefinitionById;
    },
    get getSeasonFinalZoneId() {
      return getSeasonFinalZoneId;
    },
    get getSeasonPassiveNodeDef() {
      return getSeasonPassiveNodeDef;
    },
    get getSkyStoneMaxLevel() {
      return getSkyStoneMaxLevel;
    },
    get getSkyTowerGemBoostMaxLevel() {
      return getSkyTowerGemBoostMaxLevel;
    },
    get getSkyTowerLoopClearLimit() {
      return getSkyTowerLoopClearLimit;
    },
    get getTalentBloomCardKeyForAscendancy() {
      return typeof getTalentBloomCardKeyForAscendancy === "undefined" ? void 0 : getTalentBloomCardKeyForAscendancy;
    },
    get getTalentBloomHeroIdForAscendancy() {
      return getTalentBloomHeroIdForAscendancy;
    },
    get getVoidPassiveNodeIds() {
      return typeof getVoidPassiveNodeIds === "undefined" ? void 0 : getVoidPassiveNodeIds;
    },
    get getZone() {
      return getZone;
    },
    get hotkeyBindings() {
      return hotkeyBindings;
    },
    get i18n() {
      return i18n;
    },
    get isMapPrimaryContentUnlocked() {
      return isMapPrimaryContentUnlocked;
    },
    get isMobilityRuneAttackWorn() {
      return isMobilityRuneAttackWorn;
    },
    get isVoidPassiveLineStat() {
      return isVoidPassiveLineStat;
    },
    get itemSaveSlim() {
      return window.GameModules.itemSaveSlim;
    },
    get knitting() {
      return knitting;
    },
    get mergeOceanState() {
      return mergeOceanState;
    },
    get legacySummons() {
      return window.GameModules.legacySummons;
    },
    get migratePassiveNodeIdList() {
      return typeof migratePassiveNodeIdList === "undefined" ? void 0 : migratePassiveNodeIdList;
    },
    get migratePassiveNodeIdRecord() {
      return typeof migratePassiveNodeIdRecord === "undefined" ? void 0 : migratePassiveNodeIdRecord;
    },
    get mobilitySkill() {
      return mobilitySkill;
    },
    get normalizeArmGuardIdentity() {
      return normalizeArmGuardIdentity;
    },
    get normalizeBeyondBoundaryState() {
      return normalizeBeyondBoundaryState;
    },
    get normalizeCloudUploadProfile() {
      return normalizeCloudUploadProfile;
    },
    get normalizeConditionPatternRule() {
      return normalizeConditionPatternRule;
    },
    get normalizeCraftChoice() {
      return normalizeCraftChoice;
    },
    get normalizeCraftOmen() {
      return normalizeCraftOmen;
    },
    get normalizeDamageElementKey() {
      return normalizeDamageElementKey;
    },
    get normalizeGemRecord() {
      return normalizeGemRecord;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get normalizeJewelStat() {
      return typeof normalizeJewelStat === "undefined" ? void 0 : normalizeJewelStat;
    },
    get normalizePassiveSpecializationState() {
      return typeof normalizePassiveSpecializationState === "undefined" ? void 0 : normalizePassiveSpecializationState;
    },
    get normalizePassiveTreePlannerState() {
      return typeof normalizePassiveTreePlannerState === "undefined" ? void 0 : normalizePassiveTreePlannerState;
    },
    get normalizeSkyGemEnhancementSlots() {
      return typeof normalizeSkyGemEnhancementSlots === "undefined" ? void 0 : normalizeSkyGemEnhancementSlots;
    },
    get normalizeSkyTowerResult() {
      return normalizeSkyTowerResult;
    },
    get normalizeTranscendentVoidPassive() {
      return typeof normalizeTranscendentVoidPassive === "undefined" ? void 0 : normalizeTranscendentVoidPassive;
    },
    get normalizeUiScale() {
      return normalizeUiScale;
    },
    get normalizeUiSkin() {
      return normalizeUiSkin;
    },
    get normalizeWorldTreeBark() {
      return normalizeWorldTreeBark;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get playerStall() {
      return playerStall;
    },
    get rebuildJournalBonusStateForLoad() {
      return rebuildJournalBonusStateForLoad;
    },
    get reconcileMapPrimaryContentUnlocks() {
      return reconcileMapPrimaryContentUnlocks;
    },
    get repairJournalEntriesFromProgress() {
      return repairJournalEntriesFromProgress;
    },
    get resetBeehiveRunModifiers() {
      return resetBeehiveRunModifiers;
    },
    get salvageRecoveryRuntime() {
      return typeof salvageRecoveryRuntime === "undefined" ? void 0 : salvageRecoveryRuntime;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get stumpCube() {
      return stumpCube;
    },
    get syncPermanentTalentTabUnlock() {
      return typeof syncPermanentTalentTabUnlock === "undefined" ? void 0 : syncPermanentTalentTabUnlock;
    },
    get uniqueHuntRuntime() {
      return typeof uniqueHuntRuntime === "undefined" ? void 0 : uniqueHuntRuntime;
    },
    get window() {
      return window;
    }
  };
  deps.bossLooks = createSavedBossLooks(deps);
  var mergeDefaults = restoreSavedGame.bind(void 0, deps);
  var cloneDefaultGame = () => mergeDefaults({});
  safeExposeGlobals({
    migrateRetiredRealmMonsters: migrateRetiredRealmMonsters.bind(void 0, deps),
    retireOfflineGrowth,
    markLegacyEquipmentGrace,
    keepLegacyAccessorySockets: keepLegacyAccessorySockets.bind(void 0, deps),
    renameRetiredUniques: renameRetiredUniques.bind(void 0, deps),
    removeOldSealResonanceSave,
    keepBlockedMobilityGem: keepBlockedMobilityGem.bind(void 0, deps),
    dropRetiredSupportGems: dropRetiredSupportGems.bind(void 0, deps),
    mergeDefaults,
    cloneDefaultGame
  });
})();
