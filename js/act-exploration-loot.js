// GENERATED from modules/act-exploration-loot*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-escrow-validation.mjs
  function escrowIsCurrency(env, key) {
    return Object.hasOwn(env.deps.ORB_DB, key) || Object.hasOwn(env.deps.defaultGame.currencies, key);
  }
  function escrowReservedItems(state) {
    const loot = state.actExploration?.loot;
    return loot ? [...loot.equipment, ...loot.jewels, ...loot.cores, ...loot.salvagedEquipment.map((row) => row.item)] : [];
  }
  function escrowValidEquipment(item) {
    return item && Number.isSafeInteger(item.id) && typeof item.name === "string" && typeof item.slot === "string" && Array.isArray(item.stats) && Array.isArray(item.baseStats);
  }
  function escrowValidCore(env, item) {
    const core = env.deps.coreItems.normalizeCore(item);
    return !!core && JSON.stringify(core) === JSON.stringify(item);
  }
  function escrowValidJewel(item) {
    return item && Number.isSafeInteger(item.id) && typeof item.name === "string" && ["normal", "magic", "rare", "unique"].includes(item.rarity) && Array.isArray(item.stats);
  }
  function escrowValidate(env, loot) {
    if (!loot || loot.version !== 10 || !["pending", "claimed", "lost"].includes(loot.phase)) throw Error("지원하지 않는 탐험 보상 저장");
    escrowValidateCurrencies(env, loot.currencies);
    env.deps.gemDropRewards.validate(loot.gems);
    escrowValidateItemList(loot.equipment, escrowValidEquipment);
    escrowValidateItemList(loot.jewels, escrowValidJewel);
    escrowValidateItemList(loot.cores, (...args) => escrowValidCore(env, ...args));
    escrowValidateSalvagedEquipment(env, loot);
    if (loot.phase !== "pending" && escrowHasRewards(loot)) throw Error("정산된 탐험 보상이 남아 있습니다.");
  }
  function escrowHasRewards(loot) {
    return [
      loot.equipment.length,
      Object.keys(loot.currencies).length,
      loot.gems.length,
      loot.cores.length,
      loot.jewels.length,
      loot.salvagedEquipment.length
    ].some(Boolean);
  }
  function escrowValidateSalvagedEquipment(env, loot) {
    if (!Array.isArray(loot.salvagedEquipment) || loot.salvagedEquipment.length > env.deps.SALVAGE_RECOVERY_CAP) throw Error("잘못된 탐험 해체 기록");
    for (const row of loot.salvagedEquipment) {
      if (!row || !escrowValidEquipment(row.item) || !env.deps.isSalvageRecoveryItem(row.item)) throw Error("잘못된 탐험 해체 기록");
      escrowValidateCurrencies(env, row.rewards);
    }
    escrowValidateItemList([...loot.equipment, ...loot.salvagedEquipment.map((row) => row.item)], escrowValidEquipment);
  }
  function escrowValidateItemList(items, valid) {
    if (!Array.isArray(items) || !items.every(valid)) throw Error("잘못된 탐험 장비 저장");
    if (new Set(items.map((item) => item.id)).size !== items.length) throw Error("중복된 탐험 아이템 저장");
  }
  function escrowValidateCurrencies(env, currencies) {
    if (!currencies || typeof currencies !== "object" || Array.isArray(currencies)) throw Error("잘못된 탐험 재화 목록");
    for (const [key, amount] of Object.entries(currencies)) {
      if (!escrowIsCurrency(env, key) || !Number.isFinite(amount) || amount <= 0) throw Error("잘못된 탐험 재화 저장");
    }
  }

  // modules/combat/exploration-escrow-claim.mjs
  function escrowClaim(env, state, run) {
    const loot = run.loot;
    const { currencies, skyPower } = escrowPrepareCurrencyBalances(state, loot.currencies);
    const gems = env.deps.gemDropRewards.prepare(state, loot.gems);
    const inventories = escrowPrepareInventories(env, state, loot);
    const recovery = loot.salvagedEquipment.length ? { salvageRecovery: env.deps.salvageRecoveryRuntime.prepareRecords(loot.salvagedEquipment, state) } : {};
    Object.assign(state.currencies, currencies);
    Object.assign(state, inventories);
    Object.assign(state, recovery);
    state.skyTower.condensedPower = skyPower;
    Object.assign(state, gems);
    if (loot.gems.length) state.noti.skills = true;
    escrowMarkItemsReceived(env, state, loot);
    state.currencyDropVersion = Math.max(0, Math.floor(state.currencyDropVersion || 0)) + Object.keys(loot.currencies).length;
  }
  function escrowPrepareInventories(env, state, loot) {
    const inventory = state.inventory.concat(
      loot.equipment,
      loot.jewels.map((jewel) => env.deps.bagItems.asJewel({ ...jewel })),
      loot.cores.map((core) => env.deps.bagItems.asCore({ ...core }))
    );
    const owned = [
      ...state.inventory,
      ...state.jewelInventory || [],
      ...Object.values(state.equipment),
      ...env.deps.coreItems.ownedItems(state)
    ].filter(Boolean);
    const ids = new Set(owned.map((item) => item.id));
    for (const item of [...loot.equipment, ...loot.jewels, ...loot.cores]) {
      if (ids.has(item.id)) throw Error("이미 소유한 탐험 장비 보상");
      ids.add(item.id);
    }
    return { inventory };
  }
  function escrowMarkItemsReceived(env, state, loot) {
    if (loot.jewels.length || loot.equipment.length || loot.cores.length) state.noti.items = true;
    for (const item of loot.equipment.filter((row) => row.rarity === "unique")) {
      env.deps.registerUniqueToCodexOnAcquire(item, state);
      env.deps.uniqueHuntRuntime.complete(item, state);
    }
  }
  function escrowPrepareCurrencyBalances(state, rewards) {
    const currencies = { ...state.currencies };
    const ordinary = Object.entries(rewards).filter(([key]) => key !== "condensedSkyPower");
    for (const [key, amount] of ordinary) {
      currencies[key] = (currencies[key] || 0) + amount;
      if (!Number.isFinite(currencies[key])) throw Error("탐험 보상 수령 한도 초과");
    }
    const skyGain = rewards.condensedSkyPower || 0;
    const skyPower = (state.skyTower.condensedPower || 0) + skyGain;
    if (!Number.isFinite(skyPower)) throw Error("창공 보상 수령 한도 초과");
    return { currencies, skyPower };
  }

  // modules/combat/act-exploration-loot-values.mjs
  var LOOT_UPGRADES = {
    // Version 1 granted flask drops immediately, so it has no pending flask rewards to recover.
    1: (loot) => Object.assign(loot, { version: 2, flasks: [], alchemyGlass: 0 }),
    // v2 already granted gem drops. Only future rolls enter the pending collection.
    2: (loot) => Object.assign(loot, { version: 3, gems: [] }),
    // v3 granted cube material immediately; its previous drops must not be paid twice.
    3: (loot) => Object.assign(loot, { version: 4, blurred45: 0 }),
    // v4 paid these collections immediately, including their auto-salvage rewards.
    4: (loot) => Object.assign(loot, { version: 5, growthItems: [], jewels: [], growthCodex: [] }),
    // v5 bypassed equipment salvage, so it has no deferred recovery records.
    5: (loot) => Object.assign(loot, { version: 6, salvagedEquipment: [] }),
    // v6 held core cube material. The cube became core items (2026-09-30); old progress resets without compensation.
    6: (loot) => {
      delete loot.blurred45;
      Object.assign(loot, { version: 7, cores: [] });
    },
    // v7 held growth items and growth essence. The growth board was removed (2026-09-30); they go without compensation.
    7: (loot) => {
      delete loot.growthItems;
      delete loot.growthCodex;
      if (loot.currencies && typeof loot.currencies === "object") delete loot.currencies.growthEssence;
      loot.version = 8;
    },
    // v8 held flask discoveries and alchemy glass. Flasks were removed (2026-10-01); they go without compensation.
    8: (loot) => {
      delete loot.flasks;
      delete loot.alchemyGlass;
      loot.version = 9;
    },
    // v9 could hold meteor shards (atlas meteor craters) and other star-wedge currencies. Star wedges were removed
    // (2026-10-01); those currencies go without compensation.
    9: (loot) => {
      if (loot.currencies && typeof loot.currencies === "object") ["meteorShard", "incompleteStarWedge", "starWedge", "astralCore"].forEach((key) => delete loot.currencies[key]);
      loot.version = 10;
    }
  };

  // modules/combat/exploration-escrow-restore.mjs
  function escrowMigrateLegacyLoot(run) {
    if (run.loot === null) return;
    while (Object.hasOwn(LOOT_UPGRADES, run.loot?.version)) LOOT_UPGRADES[run.loot.version](run.loot);
  }
  function escrowRestore(env, state, run) {
    if (run.loot === void 0) return;
    escrowMigrateLegacyLoot(run);
    escrowValidate(env, run.loot);
    if (run.status === "active" && run.loot.phase !== "pending") throw Error("진행 중 탐험의 보상이 이미 종료되었습니다.");
    if (run.status === "failed" && run.loot.phase !== "lost") throw Error("실패한 탐험에 보상이 남아 있습니다.");
    if (run.completionApplied && run.loot.phase !== "claimed") throw Error("완료된 탐험 보상이 정산되지 않았습니다.");
    if (run.loot.phase === "pending") escrowClaim(env, state, run);
    delete run.loot;
  }

  // modules/act-exploration-loot-classic.mjs
  var deps = {
    get ORB_DB() {
      return ORB_DB;
    },
    get defaultGame() {
      return defaultGame;
    },
    get coreItems() {
      return coreItems;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get SALVAGE_RECOVERY_CAP() {
      return SALVAGE_RECOVERY_CAP;
    },
    get isSalvageRecoveryItem() {
      return isSalvageRecoveryItem;
    },
    get salvageRecoveryRuntime() {
      return salvageRecoveryRuntime;
    },
    get bagItems() {
      return bagItems;
    },
    get registerUniqueToCodexOnAcquire() {
      return registerUniqueToCodexOnAcquire;
    },
    get uniqueHuntRuntime() {
      return uniqueHuntRuntime;
    }
  };
  var actExplorationLoot = {
    reservedItems(state) {
      return escrowReservedItems(state);
    },
    restore(state, run) {
      return escrowRestore({ deps }, state, run);
    },
    validEquipment(item) {
      return escrowValidEquipment(item);
    },
    validJewel(item) {
      return escrowValidJewel(item);
    },
    validCore(item) {
      return escrowValidCore({ deps }, item);
    },
    isCurrency(key) {
      return escrowIsCurrency({ deps }, key);
    }
  };
  safeExposeGlobals({ actExplorationLoot });
})();
