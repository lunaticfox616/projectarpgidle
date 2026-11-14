// GENERATED from modules/salvage-recovery*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/salvage-recovery-rules.mjs
  function recoveryGetSalvageRecoveryLoop(targetGame) {
    return Math.max(1, Math.floor(Number(targetGame.season) || 1));
  }
  function recoveryIsSalvageRecoveryItem(env, item) {
    return !!(item && typeof item === "object" && typeof item.slot === "string" && typeof item.name === "string" && env.SALVAGE_RECOVERY_RARITIES.includes(item.rarity) && Number(item.id) > 0);
  }
  function recoveryNormalizeSalvageRecoveryRewards(env, rewards) {
    let normalized = {};
    Object.entries(rewards || {}).forEach(([key, amount]) => {
      let gain = Math.max(0, Math.floor(Number(amount) || 0));
      if (gain <= 0) return;
      let currencyKey = typeof env.deps.getCanonicalCurrencyKey === "function" ? env.deps.getCanonicalCurrencyKey(key) : key;
      if (!Object.hasOwn(env.deps.ORB_DB, currencyKey) && !Object.hasOwn(env.deps.WALLET_CURRENCY_INFO, currencyKey)) return;
      normalized[currencyKey] = (normalized[currencyKey] || 0) + gain;
    });
    return normalized;
  }
  function recoveryNormalizeSalvageRecoveryEntry(env, entry, currentLoop) {
    if (!entry || typeof entry !== "object" || !recoveryIsSalvageRecoveryItem(env, entry.item)) return null;
    let id = Math.max(0, Math.floor(Number(entry.id) || 0));
    let loop = Math.max(1, Math.floor(Number(entry.loop) || 1));
    if (id <= 0 || loop !== currentLoop) return null;
    return {
      id,
      loop,
      salvagedAt: Math.max(0, Math.floor(Number(entry.salvagedAt) || 0)),
      item: { ...entry.item, id: Math.floor(Number(entry.item.id)) },
      rewards: recoveryNormalizeSalvageRecoveryRewards(env, entry.rewards)
    };
  }
  function recoveryEnsureSalvageRecoveryState(env, targetGame) {
    let source = targetGame.salvageRecovery && typeof targetGame.salvageRecovery === "object" ? targetGame.salvageRecovery : {};
    let raw = {
      entries: Array.isArray(source.entries) ? source.entries : [],
      sequence: source.sequence
    };
    let currentLoop = recoveryGetSalvageRecoveryLoop(targetGame);
    let seen = /* @__PURE__ */ new Set();
    raw.entries = (Array.isArray(raw.entries) ? raw.entries : []).map((entry) => recoveryNormalizeSalvageRecoveryEntry(env, entry, currentLoop)).filter((entry) => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }).slice(0, env.SALVAGE_RECOVERY_CAP);
    let highestId = raw.entries.reduce((highest, entry) => Math.max(highest, entry.id), 0);
    raw.sequence = Math.max(highestId, Math.floor(Number(raw.sequence) || 0));
    targetGame.salvageRecovery = raw;
    return raw;
  }
  function recoveryCloneSalvageRecoveryItem(item) {
    return JSON.parse(JSON.stringify(item));
  }
  function recoveryGetSalvageReplayRewards(env, item) {
    if (!item || !Object.prototype.hasOwnProperty.call(item, "salvageRecoveryRewards")) return null;
    return recoveryNormalizeSalvageRecoveryRewards(env, item.salvageRecoveryRewards);
  }
  function recoveryPrepareSalvageRecoveryRecords(env, records, targetGame) {
    const state = recoveryEnsureSalvageRecoveryState(env, { season: targetGame.season, salvageRecovery: targetGame.salvageRecovery });
    for (const { item, rewards } of records) {
      if (!recoveryIsSalvageRecoveryItem(env, item)) continue;
      state.entries.unshift({
        id: ++state.sequence,
        loop: recoveryGetSalvageRecoveryLoop(targetGame),
        salvagedAt: env.deps.clockNow(),
        item: recoveryCloneSalvageRecoveryItem(item),
        rewards: recoveryNormalizeSalvageRecoveryRewards(env, rewards)
      });
    }
    state.entries = state.entries.slice(0, env.SALVAGE_RECOVERY_CAP);
    return state;
  }
  function* recoveryRecordSalvagedEquipment(env, item, rewards, targetGame) {
    if (!recoveryIsSalvageRecoveryItem(env, item)) return null;
    const state = recoveryPrepareSalvageRecoveryRecords(env, [{ item, rewards }], targetGame);
    targetGame.salvageRecovery = state;
    const entry = state.entries[0];
    yield { kind: "dispatchRuntimeEvent", args: ["salvage-recovery-changed", { action: "recorded", entryId: entry.id }] };
    return entry;
  }
  function recoveryGetSalvageRecoveryEntry(env, entryId, targetGame) {
    let id = Math.max(0, Math.floor(Number(entryId) || 0));
    return recoveryEnsureSalvageRecoveryState(env, targetGame).entries.find((entry) => entry.id === id) || null;
  }
  function recoveryGetSalvageRestoreAvailability(env, entryId, targetGame) {
    let entry = recoveryGetSalvageRecoveryEntry(env, entryId, targetGame);
    if (!entry) return { canRestore: false, reason: env.deps._t("복구할 장비를 찾을 수 없습니다."), missing: {} };
    if (!env.deps.canStoreEquipmentItems([entry.item], targetGame)) return { canRestore: false, reason: env.deps._t("인벤토리 공간이 부족합니다."), missing: {} };
    let missing = {};
    Object.entries(entry.rewards).forEach(([key, amount]) => {
      let owned = Math.max(0, Math.floor(Number(targetGame.currencies && targetGame.currencies[key]) || 0));
      if (owned < amount) missing[key] = amount - owned;
    });
    if (Object.keys(missing).length > 0) return { canRestore: false, reason: env.deps._t("반환할 해체 재화가 부족합니다."), missing };
    return { canRestore: true, reason: "", missing: {} };
  }
  function recoveryAssignRecoveredEquipmentId(env, item, state, targetGame) {
    let owned = (targetGame.inventory || []).concat(Object.values(targetGame.equipment || {}).filter(Boolean));
    if (!owned.some((entry) => entry && entry.id === item.id)) return item;
    let highest = owned.reduce((value, entry) => Math.max(value, Number(entry && entry.id) || 0), 0);
    item.id = Math.max(env.deps.clockNow(), highest + 1) + state.sequence;
    return item;
  }
  function* recoveryRestoreSalvagedEquipment(env, entryId, targetGame) {
    let availability = recoveryGetSalvageRestoreAvailability(env, entryId, targetGame);
    if (!availability.canRestore) return { restored: false, ...availability };
    let state = recoveryEnsureSalvageRecoveryState(env, targetGame);
    let index = state.entries.findIndex((entry2) => entry2.id === Math.floor(Number(entryId)));
    if (index < 0) return { restored: false, reason: env.deps._t("복구할 장비를 찾을 수 없습니다."), missing: {} };
    let entry = state.entries[index];
    Object.entries(entry.rewards).forEach(([key, amount]) => {
      targetGame.currencies[key] -= amount;
    });
    let item = recoveryAssignRecoveredEquipmentId(env, recoveryCloneSalvageRecoveryItem(entry.item), state, targetGame);
    item.salvageRecoveryRewards = { ...entry.rewards };
    targetGame.inventory.push(item);
    state.entries.splice(index, 1);
    yield { kind: "dispatchRuntimeEvent", args: ["salvage-recovery-changed", { action: "restored", entryId: entry.id }] };
    return { restored: true, item, returned: { ...entry.rewards } };
  }
  function recoveryGetSalvageRecoveryEntries(env, targetGame) {
    return recoveryEnsureSalvageRecoveryState(env, targetGame).entries.slice();
  }

  // modules/domain/salvage-recovery.mjs
  function createSalvageRecovery(deps) {
    const env = { deps };
    env.SALVAGE_RECOVERY_CAP = 8;
    env.SALVAGE_RECOVERY_RARITIES = Object.freeze(["normal", "magic", "rare", "unique"]);
    return Object.freeze({
      isItem: (...args) => recoveryIsSalvageRecoveryItem(env, ...args),
      cap: env.SALVAGE_RECOVERY_CAP,
      rarities: env.SALVAGE_RECOVERY_RARITIES,
      ensureState: (...args) => recoveryEnsureSalvageRecoveryState(env, ...args),
      prepareRecords: (...args) => recoveryPrepareSalvageRecoveryRecords(env, ...args),
      record: (...args) => recoveryRecordSalvagedEquipment(env, ...args),
      getReplayRewards: (...args) => recoveryGetSalvageReplayRewards(env, ...args),
      getEntries: (...args) => recoveryGetSalvageRecoveryEntries(env, ...args),
      getAvailability: (...args) => recoveryGetSalvageRestoreAvailability(env, ...args),
      restore: (...args) => recoveryRestoreSalvagedEquipment(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/runtime-event-commands.mjs
  function runRuntimeEventCommands(commands, dispatch) {
    return consumeDomainCommands(commands, { dispatchRuntimeEvent: dispatch });
  }

  // modules/salvage-recovery-classic.mjs
  var rules = createSalvageRecovery({
    get getCanonicalCurrencyKey() {
      return typeof getCanonicalCurrencyKey === "undefined" ? void 0 : getCanonicalCurrencyKey;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get WALLET_CURRENCY_INFO() {
      return WALLET_CURRENCY_INFO;
    },
    clockNow: () => Date.now(),
    get _t() {
      return _t;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    }
  });
  var SALVAGE_RECOVERY_CAP = rules.cap;
  var SALVAGE_RECOVERY_RARITIES = rules.rarities;
  var isSalvageRecoveryItem = rules.isItem;
  var getSalvageReplayRewards = rules.getReplayRewards;
  var prepareSalvageRecoveryRecords = rules.prepareRecords;
  function ensureSalvageRecoveryState(targetGame = game) {
    return rules.ensureState(targetGame);
  }
  function recordSalvagedEquipment(item, rewards, targetGame = game) {
    return runRuntimeEventCommands(rules.record(item, rewards, targetGame), dispatchRuntimeEvent);
  }
  function getSalvageRestoreAvailability(entryId, targetGame = game) {
    return rules.getAvailability(entryId, targetGame);
  }
  function restoreSalvagedEquipment(entryId, targetGame = game) {
    return runRuntimeEventCommands(rules.restore(entryId, targetGame), dispatchRuntimeEvent);
  }
  function getSalvageRecoveryEntries(targetGame = game) {
    return rules.getEntries(targetGame);
  }
  var salvageRecoveryRuntime = Object.freeze({
    ensureState: ensureSalvageRecoveryState,
    prepareRecords: prepareSalvageRecoveryRecords,
    record: recordSalvagedEquipment,
    getReplayRewards: getSalvageReplayRewards,
    getEntries: getSalvageRecoveryEntries,
    getAvailability: getSalvageRestoreAvailability,
    restore: restoreSalvagedEquipment
  });
  safeExposeGlobals({
    SALVAGE_RECOVERY_CAP,
    SALVAGE_RECOVERY_RARITIES,
    isSalvageRecoveryItem,
    ensureSalvageRecoveryState,
    getSalvageReplayRewards,
    prepareSalvageRecoveryRecords,
    recordSalvagedEquipment,
    getSalvageRestoreAvailability,
    restoreSalvagedEquipment,
    getSalvageRecoveryEntries,
    salvageRecoveryRuntime
  });
})();
