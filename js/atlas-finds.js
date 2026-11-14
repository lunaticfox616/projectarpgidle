// GENERATED from modules/atlas-finds*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/atlas-finds-memory.mjs
  function* atlasFindReceiveMemoryLeaf(env, owner, id) {
    const result = env.deps.memoryLeaves.receive(owner, id);
    if (!result) return result;
    env.deps.combatLootReceipts.leaf(owner, id);
    yield { kind: "atlasFindEffectDispatchRuntimeEvent", args: ["memory-leaf", result] };
    return result;
  }
  function* atlasFindGrantMemoryLeaf(env, owner, enemy, id) {
    const run = env.deps.explorationFloorFor(enemy);
    if (run) env.deps.actExplorationState.groundLoot.placeLeaf(run, enemy, id);
    else yield* atlasFindReceiveMemoryLeaf(env, owner, id);
  }

  // modules/domain/atlas-finds-drops.mjs
  function* atlasFindGrantOmenDrop(env, owner, enemy, zone, [key, count]) {
    if (key === "@jewel") return yield* atlasFindGrantOmenJewel(env, enemy, zone);
    if (key === "@seed") return yield* atlasFindGrantOmenSeed(env, owner, enemy);
    return (yield { kind: "atlasFindEffectKeepCurrencyDrop", args: [enemy, key, count] }).gain > 0;
  }
  function* atlasFindGrantOmenJewel(env, enemy, zone) {
    const jewel = yield { kind: "atlasFindEffectGenerateJewelDrop", args: [zone, env.deps.lootOmens.jewelOdds(zone)] };
    if (yield { kind: "atlasFindEffectPlaceFloorItem", args: [enemy, "jewel", jewel] }) return true;
    const receipt = yield { kind: "atlasFindEffectReceiveJewelDrop", args: [jewel] };
    if (receipt.stored) yield { kind: "atlasFindEffectQueueEnemyGroundLoot", args: [enemy, { item: jewel, itemKind: "jewel", color: env.deps.getJewelLootColor(jewel) }] };
    yield { kind: "atlasFindEffectDispatchRuntimeEvent", args: ["jewel-drop-received", receipt] };
    return true;
  }
  function* atlasFindGrantOmenSeed(env, owner, enemy) {
    const spec = env.deps.stumpBox.seedDropSpec(owner, Math.random);
    if (yield { kind: "atlasFindEffectPlaceFloorItem", args: [enemy, "stump", spec] }) return true;
    const { item, compost } = env.deps.stumpBox.receiveDrop(owner, spec);
    yield { kind: "atlasFindEffectDispatchRuntimeEvent", args: ["stump-box-changed", { ripened: compost ? compost.ripened : [], drop: item, compost }] };
    return true;
  }
  function* atlasFindGrantTreasureUnique(env, enemy, zone, name = null) {
    const itemLevel = env.deps.levelProgression.itemLevel(zone, enemy);
    const cap = Math.min(env.deps.getRealmEquipmentHiddenTierCap(zone), env.deps.levelProgression.maxDropTier(itemLevel));
    const item = env.deps.levelProgression.stampItem(yield { kind: "atlasFindEffectGenerateUniqueItem", args: [cap, null, name, zone] }, itemLevel);
    return (yield { kind: "atlasFindEffectKeepEquipmentDrop", args: [enemy, item, { guaranteedKeep: true }] }) ? [item] : [];
  }
  function atlasFindChaseName(env) {
    return env.deps.rndChoice(env.deps.UNIQUE_DB.filter((row) => row.ultraRare && !row.dropOnly).map((row) => row.name));
  }
  function* atlasFindGrantGoldenJackpot(env, owner, enemy, zone) {
    const key = env.deps.lootOmens.goldenJackpot(owner, Math.random);
    if (key === "@chase") return yield* atlasFindGrantTreasureUnique(env, enemy, zone, atlasFindChaseName(env));
    yield { kind: "atlasFindEffectKeepCurrencyDrop", args: [enemy, key, 1] };
    return [];
  }

  // modules/domain/atlas-finds-treasure.mjs
  function* atlasFindBurstTreasure(env, owner, enemy, zone) {
    const rules2 = env.deps.LOOT_OMENS.treasure, golden = !!enemy.goldenTreasure, { omen, drops } = env.deps.lootOmens.treasureDrops(zone, owner, Math.random, golden);
    let granted = 0;
    for (const drop of drops) if (yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop)) granted++;
    const items = [];
    for (let i = 0; i < rules2.rareGear; i++) items.push(...yield { kind: "atlasFindEffectGrantEquipmentPick", args: [enemy, zone, "rare"] });
    if (golden || Math.random() < rules2.uniqueChance) items.push(...yield* atlasFindGrantTreasureUnique(env, enemy, zone));
    if (golden) items.push(...yield* atlasFindGrantGoldenJackpot(env, owner, enemy, zone));
    owner.atlas.tally.treasure += 1;
    owner.atlas.tally.golden += Number(golden);
    yield { kind: "atlasFindEffectDispatchRuntimeEvent", args: ["atlas-find", {
      kind: "treasure",
      golden,
      omen: omen ? omen.id : null,
      name: enemy.name,
      count: granted + items.length + Number(golden),
      unique: items.some((item) => item.rarity === "unique"),
      cell: { gx: enemy.gx, gy: enemy.gy }
    }] };
  }
  function* atlasFindGrantBossReward(env, enemy, zone) {
    const rules2 = env.deps.LOOT_OMENS.mapBoss, count = rules2.items + Number(Math.random() < rules2.extraChance);
    const roller = { ...enemy, isBoss: false, isElite: false, uniqueChanceMul: 1, atlasInfluence: env.deps.itemInfluences.bossInfluence(zone) };
    for (let i = 0; i < count; i++) yield { kind: "atlasFindEffectGrantEquipmentPick", args: [roller, zone, rules2.minimum[i] || null] };
  }
  function atlasFindDressTreasurePack(env, zone, pack) {
    if (pack.alert || !env.deps.lootOmens.isTreasurePack(zone, pack)) return;
    const golden = env.deps.lootOmens.isGoldenTreasure(pack), rules2 = golden ? env.deps.LOOT_OMENS.treasure.golden : env.deps.LOOT_OMENS.treasure;
    const leader = pack.waiting.find((enemy) => !enemy.isElite) || pack.waiting[0];
    pack.treasure = true;
    Object.assign(leader, {
      treasureCarrier: true,
      goldenTreasure: golden,
      name: `${rules2.prefix} ${leader.name}`,
      encounterOutline: rules2.outline,
      encounterSparks: rules2.sparks
    });
  }

  // modules/domain/atlas-finds-kills.mjs
  function* atlasFindOnAtlasKill(env, owner, zone, enemy) {
    if (!zone || zone.type !== "atlasMap") return;
    for (const drop of env.deps.lootOmens.killDrops(zone, enemy, owner, Math.random)) yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop);
    for (const drop of env.deps.lootOmens.strayDrops(zone, enemy, owner, Math.random)) yield* atlasFindGrantOmenDrop(env, owner, enemy, zone, drop);
    const leaf = env.deps.memoryLeaves.rollKill(owner, zone, enemy, Math.random);
    if (leaf) yield* atlasFindGrantMemoryLeaf(env, owner, enemy, leaf);
    if (enemy.treasureCarrier) yield* atlasFindBurstTreasure(env, owner, enemy, zone);
    if (enemy.isBoss && env.MAP_BOSS_KINDS.has(zone.atlasKind) && !zone.memoryTier) yield* atlasFindGrantBossReward(env, enemy, zone);
  }

  // modules/domain/atlas-finds.mjs
  function createAtlasFinds(deps) {
    const env = { deps };
    env.MAP_BOSS_KINDS = /* @__PURE__ */ new Set(["map", "guardian"]);
    return Object.freeze({ onAtlasKill: (...args) => atlasFindOnAtlasKill(env, ...args), dressTreasurePack: (...args) => atlasFindDressTreasurePack(env, ...args), receiveMemoryLeaf: (...args) => atlasFindReceiveMemoryLeaf(env, ...args) });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/atlas-finds-classic.mjs
  var rules = createAtlasFinds({
    get lootOmens() {
      return lootOmens;
    },
    get getJewelLootColor() {
      return getJewelLootColor;
    },
    get stumpBox() {
      return stumpBox;
    },
    get levelProgression() {
      return levelProgression;
    },
    get getRealmEquipmentHiddenTierCap() {
      return getRealmEquipmentHiddenTierCap;
    },
    get rndChoice() {
      return rndChoice;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get LOOT_OMENS() {
      return LOOT_OMENS;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get memoryLeaves() {
      return memoryLeaves;
    },
    get combatLootReceipts() {
      return combatLootReceipts;
    },
    get explorationFloorFor() {
      return explorationFloorFor;
    },
    get actExplorationState() {
      return actExplorationState;
    }
  });
  var effects = {
    atlasFindEffectKeepCurrencyDrop: (...args) => keepCurrencyDrop(...args),
    atlasFindEffectGenerateJewelDrop: (...args) => generateJewelDrop(...args),
    atlasFindEffectPlaceFloorItem: (...args) => placeFloorItem(...args),
    atlasFindEffectReceiveJewelDrop: (...args) => receiveJewelDrop(...args),
    atlasFindEffectQueueEnemyGroundLoot: (...args) => queueEnemyGroundLoot(...args),
    atlasFindEffectDispatchRuntimeEvent: (...args) => dispatchRuntimeEvent(...args),
    atlasFindEffectGenerateUniqueItem: (...args) => generateUniqueItem(...args),
    atlasFindEffectKeepEquipmentDrop: (...args) => keepEquipmentDrop(...args),
    atlasFindEffectGrantEquipmentPick: (...args) => grantEquipmentPick(...args)
  };
  var atlasFinds = Object.freeze({
    onAtlasKill: (...args) => consumeDomainCommands(rules.onAtlasKill(game, ...args), effects),
    dressTreasurePack: (...args) => rules.dressTreasurePack(...args),
    receiveMemoryLeaf: (...args) => consumeDomainCommands(rules.receiveMemoryLeaf(game, ...args), effects)
  });
  safeExposeGlobals({ atlasFinds });
})();
