// GENERATED from modules/colony-wards*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/colony-ward-slots.mjs
  function wardIsWard(env, item) {
    return !!item && item.slot === env.R.slot;
  }
  function wardKeptOnPickup(env, item, state) {
    return wardIsWard(env, item) && !!state.settings && (state.settings.itemFilterAlways || {}).ward !== false;
  }
  function wardUnlocked(env, state) {
    return typeof env.deps.contentProgression === "object" && env.deps.contentProgression.isUnlocked(env.R.unlock, state);
  }
  function wardIsBelt(item) {
    return !!item && item.slot === "허리띠";
  }
  function wardBeltSlots(env, item) {
    if (!wardIsBelt(item)) return 0;
    const { min, max } = env.R.beltSlots, stored = Math.floor(Number(item.wardSlotRoll));
    if (stored >= min && stored <= max) return stored;
    return min + env.deps.hashSeed(`ward-belt:${item.id === void 0 ? item.name : item.id}`) % (max - min + 1);
  }
  function wardStampBelt(env, item) {
    if (wardIsBelt(item)) item.wardSlotRoll = wardBeltSlots(env, item);
    return item;
  }
  function wardRerollBelt(env, item, random = Math.random) {
    if (!wardIsBelt(item)) return 0;
    const { min, max } = env.R.beltSlots;
    item.wardSlotRoll = min + Math.floor(random() * (max - min + 1));
    return item.wardSlotRoll;
  }
  function wardBeltRoll(env, item, state) {
    return wardIsBelt(item) && wardUnlocked(env, state) ? wardBeltSlots(env, item) : void 0;
  }
  function wardWardString(env, equipment) {
    const item = Object.values(equipment || {}).find((entry) => entry && entry.rarity === "unique" && entry.uniqueEffectKey === env.R.stringEffectKey);
    const p = item ? item.uniqueEffectParams || {} : {};
    return { slots: Math.max(0, Math.floor(Number(p.slots) || 0)), mul: Math.max(1, Number(p.mul) || 1) };
  }
  function wardSlotCount(env, state) {
    const equipment = state.equipment || {};
    const extra = [
      wardBeltSlots(env, equipment["허리띠"]),
      typeof env.deps.getTranscendentVoidPassiveCount === "function" ? env.deps.getTranscendentVoidPassiveCount(env.R.voidPassive, state) : 0,
      typeof env.deps.hasKeystone === "function" && env.deps.hasKeystone(env.R.ascendNode, state) ? 1 : 0,
      Object.values(equipment).some((item) => item && item.uniqueEffectKey === env.R.uniqueEffectKey) ? 1 : 0,
      wardWardString(env, equipment).slots
    ];
    return Math.max(0, Math.min(env.R.maxSlots, env.R.baseSlots + extra.reduce((sum, value) => sum + value, 0)));
  }
  function wardSlotChange(env, item, slot, state) {
    const from = wardSlotCount(env, state), to = wardSlotCount(env, { ...state, equipment: { ...state.equipment || {}, [slot]: item } });
    return from === to ? null : { from, to };
  }
  function wardOpenSlots(env, state) {
    return env.R.slots.slice(0, wardSlotCount(env, state));
  }
  function wardPickSlot(env, state) {
    const open = wardOpenSlots(env, state);
    return open.find((slot) => !(state.equipment || {})[slot]) || open[0];
  }
  function wardOpenWards(env, state) {
    return wardOpenSlots(env, state).map((slot) => (state.equipment || {})[slot]).filter((...args) => wardIsWard(env, ...args));
  }
  function wardUniqueParam(item, key, name) {
    return item.rarity === "unique" && item.uniqueEffectKey === key ? Number((item.uniqueEffectParams || {})[name]) || 0 : 0;
  }
  function wardEquippedLines(env, state) {
    const wards = wardOpenWards(env, state);
    const mul = wardWardString(env, state.equipment).mul + wards.reduce((sum, item) => sum + wardUniqueParam(item, "wardEcho", "pct"), 0) / 100;
    return wards.flatMap((item) => (item.baseStats || []).map((line) => ({ stat: line.id, val: (Number(line.val) || 0) * mul })));
  }
  function wardIncidentMul(env, state) {
    return Math.max(1, ...wardOpenWards(env, state).map((item) => wardUniqueParam(item, "incidentBell", "mul")));
  }

  // modules/domain/colony-ward-items.mjs
  function wardMakeItem(env, row, val, tier, ...selection) {
    const [locked, unique = null] = selection;
    const allocatedId = env.deps.nextItemId();
    const item = {
      id: allocatedId,
      slot: env.R.slot,
      baseId: env.R.baseId,
      baseName: env.R.name,
      name: env.R.name,
      rarity: "magic",
      itemTier: Math.max(1, Math.min(20, Math.floor(Number(tier) || 1))),
      locked: !!locked,
      baseStats: row ? [{ id: row.id, val, statName: row.name, valMin: row.min, valMax: row.max }] : [],
      stats: [],
      ...unique
    };
    if (typeof env.deps.normalizeItem === "function") env.deps.normalizeItem(item);
    return item;
  }
  function wardCreate(env, random = Math.random, tier = 1, rollFloor = 0) {
    const row = env.deps.COLONY_WARD_POOL[Math.floor(random() * env.deps.COLONY_WARD_POOL.length)];
    const min = row.min + Math.ceil((row.max - row.min) * rollFloor);
    return wardMakeItem(env, row, min + Math.floor(random() * (row.max - min + 1)), tier);
  }
  function wardCreateUnique(env, random = Math.random, tier = 1, key = "") {
    const row = env.U.rows.find((entry) => entry.key === key) || env.U.rows[Math.floor(random() * env.U.rows.length)];
    const unique = { name: row.name, rarity: "unique", chaseUnique: true, uniqueEffect: row.text, uniqueEffectKey: row.key, uniqueEffectParams: { ...row.params } };
    if (row.key !== "doubleKnot") return wardMakeItem(env, null, 0, tier, false, unique);
    const line = env.deps.COLONY_WARD_POOL[Math.floor(random() * env.deps.COLONY_WARD_POOL.length)];
    const min = Math.round(line.max * row.params.min), max = Math.round(line.max * row.params.max);
    return wardMakeItem(env, { ...line, min, max }, min + Math.floor(random() * (max - min + 1)), tier, false, unique);
  }
  function wardCreateDrop(env, random, tier, rollFloor = 0) {
    return random() < env.U.chance ? wardCreateUnique(env, random, tier) : wardCreate(env, random, tier, rollFloor);
  }
  function wardSalvageShards(env, item) {
    if (item && item.rarity === "unique") return env.R.shards.max;
    const value = Math.abs(Number((item && item.baseStats || [])[0]?.val) || 0);
    return Math.max(env.R.shards.base, Math.min(env.R.shards.max, env.R.shards.base + Math.floor(value / env.R.shards.per)));
  }
  function wardSalvageProfile(env, item) {
    return { guaranteed: { colonyShard: wardSalvageShards(env, item) }, chances: [] };
  }

  // modules/domain/colony-ward-rewards.mjs
  function* wardRollFieldDrop(env, state, enemy, zone, random = Math.random) {
    if (!enemy || !zone || zone.id === env.R.colonyZoneId || !wardUnlocked(env, state)) return [];
    const chance = enemy.isBoss ? env.R.field.boss : enemy.isElite ? env.R.field.elite : env.R.field.normal;
    if (random() >= chance) return [];
    const item = wardCreateDrop(env, random, zone.tier);
    const kept = yield { kind: "keepWardDrop", args: [enemy, item] };
    return kept === "kept" ? [item] : [];
  }
  function* wardRollColonyWave(env, state, wave, zone, options = {}) {
    const { random = Math.random, where = state.gridPlayer } = options;
    const bossWave = wave % env.R.colonyWave.every === 0;
    if (!bossWave && random() >= env.R.colonyWave.chance) return null;
    const floor = bossWave ? Math.min(
      env.R.colonyWave.maxRollFloor,
      env.R.colonyWave.bossRollFloor + (wave / env.R.colonyWave.every - 1) * env.R.colonyWave.bossRollStep
    ) : 0;
    const item = wardCreateDrop(env, random, zone && zone.tier, floor);
    const kept = yield { kind: "keepWardDrop", args: [where || state.gridPlayer, item, { ignoreFilter: true, ignoreAutoSalvage: true }] };
    return kept === "kept" ? item : null;
  }
  function* wardCraft(env, state, random = Math.random) {
    if (!wardUnlocked(env, state)) return "군락지가 열리면 만들 수 있습니다.";
    if (state.woodsmanBuildLock) return "☠️ 나무꾼 전투 중에는 만들 수 없습니다.";
    if ((Number(state.currencies.colonyShard) || 0) < env.R.craftCost) return env.deps._t("군락지 편린이 부족합니다({craftCost}개 필요).", { craftCost: env.R.craftCost });
    const item = wardCreate(env, random, 1), roomy = env.deps.canStoreEquipmentItems([item], state);
    const stored = yield roomy ? { kind: "storeWard", args: [item, { ignoreFilter: true, ignoreAutoSalvage: true }] } : { kind: "equipWard", args: [item] };
    if (!stored) return "가방에 자리가 없습니다.";
    state.currencies.colonyShard -= env.R.craftCost;
    return "";
  }

  // modules/domain/colony-ward-migration.mjs
  function wardFromLegacy(env, ward) {
    const row = ward && typeof ward === "object" ? env.POOL.get(ward.stat) : null;
    if (!row) return null;
    return wardMakeItem(env, row, Math.max(row.min, Math.min(row.max, Math.round(Number(ward.val) || row.min))), 1, ward.locked);
  }
  function wardRefundSlots(env, state, bought) {
    for (let slot = 2; slot <= Math.min(4, Math.floor(Number(bought) || 1)); slot++) {
      Object.entries(env.R.legacySlotCosts[slot] || {}).forEach(([key, amount]) => {
        state.currencies[key] = (Number(state.currencies[key]) || 0) + amount;
      });
    }
  }
  function wardMigrate(env, state) {
    const colony = state && state.colony;
    if (!colony || typeof colony !== "object" || !state.equipment) return;
    const equipped = (Array.isArray(colony.wardEquipped) ? colony.wardEquipped : []).map((...args) => wardFromLegacy(env, ...args));
    const stored = (Array.isArray(colony.wardInventory) ? colony.wardInventory : []).map((...args) => wardFromLegacy(env, ...args)).filter(Boolean);
    equipped.forEach((item, index) => {
      if (!item) return;
      if (!state.equipment[env.R.slots[index]]) state.equipment[env.R.slots[index]] = item;
      else stored.push(item);
    });
    if (stored.length) state.inventory = [...Array.isArray(state.inventory) ? state.inventory : [], ...stored];
    if (state.currencies) wardRefundSlots(env, state, colony.wardSlots);
    Object.assign(colony, { wardInventory: [], wardEquipped: [null, null, null, null], wardSlots: 1 });
  }

  // modules/domain/colony-wards.mjs
  function createColonyWards(deps) {
    const env = { deps };
    env.R = env.deps.COLONY_WARD_RULES;
    env.POOL = new Map(env.deps.COLONY_WARD_POOL.map((row) => [row.id, row]));
    env.U = env.deps.COLONY_WARD_UNIQUES;
    return Object.freeze({
      isWard: (...args) => wardIsWard(env, ...args),
      keptOnPickup: (...args) => wardKeptOnPickup(env, ...args),
      unlocked: (...args) => wardUnlocked(env, ...args),
      beltSlots: (...args) => wardBeltSlots(env, ...args),
      stampBelt: (...args) => wardStampBelt(env, ...args),
      rerollBelt: (...args) => wardRerollBelt(env, ...args),
      beltRoll: (...args) => wardBeltRoll(env, ...args),
      slotCount: (...args) => wardSlotCount(env, ...args),
      slotChange: (...args) => wardSlotChange(env, ...args),
      openSlots: (...args) => wardOpenSlots(env, ...args),
      pickSlot: (...args) => wardPickSlot(env, ...args),
      equippedLines: (...args) => wardEquippedLines(env, ...args),
      incidentMul: (...args) => wardIncidentMul(env, ...args),
      create: (...args) => wardCreate(env, ...args),
      createUnique: (...args) => wardCreateUnique(env, ...args),
      rollFieldDrop: (...args) => wardRollFieldDrop(env, ...args),
      rollColonyWave: (...args) => wardRollColonyWave(env, ...args),
      craft: (...args) => wardCraft(env, ...args),
      salvageShards: (...args) => wardSalvageShards(env, ...args),
      salvageProfile: (...args) => wardSalvageProfile(env, ...args),
      migrate: (...args) => wardMigrate(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/colony-wards-classic.mjs
  var rules = createColonyWards({
    get contentProgression() {
      return typeof contentProgression === "undefined" ? void 0 : contentProgression;
    },
    get hashSeed() {
      return hashSeed;
    },
    get getTranscendentVoidPassiveCount() {
      return typeof getTranscendentVoidPassiveCount === "undefined" ? void 0 : getTranscendentVoidPassiveCount;
    },
    get hasKeystone() {
      return typeof hasKeystone === "undefined" ? void 0 : hasKeystone;
    },
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter,
    get normalizeItem() {
      return typeof normalizeItem === "undefined" ? void 0 : normalizeItem;
    },
    get COLONY_WARD_POOL() {
      return COLONY_WARD_POOL;
    },
    get _t() {
      return _t;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get COLONY_WARD_RULES() {
      return COLONY_WARD_RULES;
    },
    get COLONY_WARD_UNIQUES() {
      return COLONY_WARD_UNIQUES;
    }
  });
  var effects = {
    keepWardDrop: (...args) => keepEquipmentDrop(...args),
    storeWard: (...args) => addItemToInventory(...args),
    equipWard: (...args) => equipIntoFirstEmptySlot(...args)
  };
  function runWardCommands(commands) {
    return consumeDomainCommands(commands, effects);
  }
  var colonyWards = Object.freeze({
    ...rules,
    keptOnPickup: (item, owner = game) => rules.keptOnPickup(item, owner),
    unlocked: (state = game) => rules.unlocked(state),
    beltRoll: (item, state = game) => rules.beltRoll(item, state),
    slotCount: (state = game) => rules.slotCount(state),
    slotChange: (item, slot, state = game) => rules.slotChange(item, slot, state),
    openSlots: (state = game) => rules.openSlots(state),
    pickSlot: (state = game) => rules.pickSlot(state),
    equippedLines: (state = game) => rules.equippedLines(state),
    incidentMul: (state = game) => rules.incidentMul(state),
    rollFieldDrop: (enemy, zone, random) => runWardCommands(rules.rollFieldDrop(game, enemy, zone, random)),
    rollColonyWave: (wave, zone, random, where) => runWardCommands(rules.rollColonyWave(game, wave, zone, { random, where })),
    craft: (state = game, random) => runWardCommands(rules.craft(state, random))
  });
  safeExposeGlobals({ colonyWards });
})();
