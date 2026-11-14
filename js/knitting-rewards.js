// GENERATED from modules/knitting-rewards*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/knitting-reward-gear.mjs
  function threadRewardPick(rows, random) {
    return rows[Math.floor(random() * rows.length)];
  }
  function threadRewardBasesFor(env, gear, tier, state, slot) {
    let pool = env.deps.BASE_ITEM_DB.filter((base) => !base.dropOnly && !base.realmBase && base.reqTier <= tier);
    if (gear.base) return pool.filter((base) => base.id === gear.base);
    if (slot) pool = pool.filter((base) => base.slot === slot);
    else if (gear.slots) pool = pool.filter((base) => gear.slots.includes(base.slot));
    if (gear.classWeapon) pool = env.deps.keepWeaponCategoryBases(pool.filter((base) => base.slot === "무기"), env.deps.HANA_WEAPON_COMBOS.classWeapons[state.selectedClassId]);
    const near = pool.filter((base) => base.reqTier >= tier - env.deps.BASE_DROP_WEIGHTS.windowTiers);
    return near.length ? near : pool;
  }
  function threadRewardPickBase(env, gear, tier, state, random) {
    const slots = (gear.slots || [null]).filter((slot) => threadRewardBasesFor(env, gear, tier, state, slot).length);
    if (!slots.length) return null;
    return threadRewardPick(threadRewardBasesFor(env, gear, tier, state, threadRewardPick(slots, random)), random);
  }
  function threadRewardFossilLine(env, item, random) {
    const mod = threadRewardPick(env.deps.getFossilExclusivePool(item), random);
    if (!mod) return false;
    if (item.stats.length) item.stats.pop();
    const roll = env.deps.rollAffixValueInTierRange(mod, Math.max(1, item.affixTierCap - 4), item.affixTierCap);
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    return true;
  }
  function threadRewardGearReward(env, state, reward, random) {
    const base = threadRewardPickBase(env, reward.gear, reward.tier, state, random);
    if (!base) return null;
    const item = env.deps.createItemFromBase(base, "rare", reward.tier, { affixTierCap: Math.min(20, reward.tier), affixTierFloor: Math.max(1, reward.tier - 4) });
    if (reward.gear.fossil && !threadRewardFossilLine(env, item, random)) return null;
    if (reward.gear.influence) {
      env.deps.itemInfluences.stampInfluence(item, reward.gear.influence, random);
      if (!item.stats.some((stat) => env.deps.itemInfluences.lineInfluence(stat) === reward.gear.influence)) return null;
    }
    env.deps.updateItemName(item);
    env.deps.normalizeItem(item);
    return item;
  }
  function threadRewardUniquePool(env, reward, state) {
    const chase = reward.uniquePool === "chase";
    const rows = env.deps.UNIQUE_DB.filter((row) => !!row.ultraRare === chase && !row.realmCodexOnly && env.deps.uniqueMeetsTier(row, reward.tier) && (!state || env.deps.contentProgression.canDropUnique(row, state)));
    if (reward.unique) return rows.filter((row) => row.name === reward.unique);
    if (!env.deps.KNITTING.uniquePools.includes(reward.uniquePool)) return [];
    return rows.filter((row) => ["general", "chase"].includes(reward.uniquePool) ? !row.dropOnly : row.dropOnly?.type === reward.uniquePool);
  }
  function threadRewardUniqueBandOf(env, row) {
    return Math.floor(((row.reqTier || 1) - 1) / env.deps.KNITTING.uniqueBand.step) + (env.deps.KNITTING.uniqueBand.bump[row.name]?.[0] || 0);
  }
  function threadRewardUniqueWeight(env, row) {
    return Math.pow(env.deps.KNITTING.uniqueBand.decay, threadRewardUniqueBandOf(env, row));
  }
  function threadRewardNamedUniqueGrade(env, row) {
    const band = threadRewardUniqueBandOf(env, row);
    return band === 0 ? 2 : band <= 2 ? 3 : 4;
  }
  function threadRewardPickBy(rows, weightOf, random) {
    const total = rows.reduce((sum, row) => sum + weightOf(row), 0);
    if (!(total > 0)) return null;
    let roll = random() * total;
    return rows.find((row) => (roll -= weightOf(row)) < 0) || rows[rows.length - 1];
  }
  function threadRewardUniqueReward(env, state, reward, random) {
    const def = threadRewardPickBy(threadRewardUniquePool(env, reward, state), (...args) => threadRewardUniqueWeight(env, ...args), random);
    if (!def) return null;
    return env.deps.generateUniqueItem(reward.tier, def.slots[0], def.name, { type: def.dropOnly?.type || "act", id: def.dropOnly?.id });
  }

  // modules/domain/knitting-reward-plan.mjs
  function threadRewardIsEquipmentReward(reward) {
    return !!(reward.gear || reward.unique || reward.uniquePool);
  }
  function threadRewardPlannedItem(env, state, reward, random) {
    let item = null;
    if (reward.gear) item = threadRewardGearReward(env, state, reward, random);
    if (reward.unique || reward.uniquePool) item = threadRewardUniqueReward(env, state, reward, random);
    return item;
  }
  function threadRewardPlannedCurrencies(env, reward, random) {
    return (reward.pickCurrencies ? [threadRewardPick(reward.pickCurrencies, random)] : reward.currencies || []).map(([key, n]) => [env.deps.getCanonicalCurrencyKey(key), n]);
  }
  function threadRewardHeldCurrency(env, state, key) {
    return (key === env.SKY_POWER ? state.skyTower && state.skyTower.condensedPower : state.currencies[key]) || 0;
  }
  function threadRewardPlannedSeeds(reward) {
    return (reward.seeds || []).map(([color, n]) => [color, n]);
  }
  function threadRewardPlannedYarns(env, state, row, random) {
    return Array.from({ length: row.reward.yarns || 0 }, () => env.deps.knitting.pickYarn(state, row.id, random));
  }
  function threadRewardPlannedMaps(env, state, rule, random) {
    if (!rule) return null;
    if (!state.atlas.unlocked || state.atlas.stash.length + rule.count > env.deps.ATLAS.stashCap) return null;
    const copy = { ...state, atlas: JSON.parse(JSON.stringify(state.atlas)) };
    const maps = env.deps.atlas.rewardMaps(copy, rule, random);
    return maps.length === rule.count ? { maps, atlas: copy.atlas } : null;
  }
  function threadRewardPlan(env, state, row, random) {
    const reward = row.reward, item = threadRewardPlannedItem(env, state, reward, random);
    if (threadRewardIsEquipmentReward(reward) && !item) return null;
    const mapReward = threadRewardPlannedMaps(env, state, reward.maps, random);
    if (reward.maps && !mapReward) return { mapBlocked: true };
    const made = { currencies: threadRewardPlannedCurrencies(env, reward, random), seeds: threadRewardPlannedSeeds(reward), yarns: threadRewardPlannedYarns(env, state, row, random), item, mapReward };
    return made.yarns.includes(null) ? null : made;
  }
  function threadRewardLockedReason(env, state, made) {
    if (made.currencies.some(([key]) => !env.deps.contentProgression.canDropCurrency(key, state))) return "보상 재화의 콘텐츠를 먼저 해금하세요.";
    return made.seeds.length && !(state.stumpBox && state.stumpBox.acquired) ? "보상 씨앗을 받으려면 그루터기 함을 먼저 얻으세요." : "";
  }
  function threadRewardReason(env, state, made) {
    if (!made) return "현재 보상 풀에 맞는 아이템이 없습니다. 실타래는 유지됩니다.";
    if (made.mapBlocked) return "아틀라스를 열고 지도석 보관함에 빈칸 두 개를 마련하세요. 실타래는 유지됩니다.";
    if (made.item && !env.deps.canStoreEquipmentItems([made.item], state)) return "장비 보관함에 빈자리가 필요합니다.";
    const locked = threadRewardLockedReason(env, state, made);
    if (locked) return locked;
    if (made.currencies.some(([key, n]) => !env.deps.ORB_DB[key] || !Number.isSafeInteger(threadRewardHeldCurrency(env, state, key) + n))) return "재화를 더 보관할 수 없습니다.";
    const counts = {};
    for (const id of made.yarns) counts[id] = (counts[id] || 0) + 1;
    return Object.entries(counts).some(([id, n]) => (state.knitting.counts[id] || 0) + n > env.deps.KNITTING.countCap) ? "실타래 보관 수량이 가득 찼습니다." : "";
  }

  // modules/domain/knitting-reward-exchange.mjs
  function threadRewardGrantSeeds(env, state, seeds) {
    for (const [color, n] of seeds) for (let i = 0; i < n; i++) env.deps.stumpBox.createItem(state, { family: "seed", color, roll: env.deps.STUMP_BOX_HARVEST.giftRoll }, true);
  }
  function threadRewardCommit(env, state, row, made) {
    const next = {
      ...state,
      currencies: { ...state.currencies },
      inventory: state.inventory.slice(),
      knitting: { ...state.knitting, counts: { ...state.knitting.counts }, knitted: { ...state.knitting.knitted }, seen: state.knitting.seen.slice() }
    };
    next.knitting.counts[row.id] -= row.set;
    next.knitting.knitted[row.id] = (next.knitting.knitted[row.id] || 0) + 1;
    if (made.item) next.inventory.push(made.item);
    let skyPower = 0;
    for (const [key, n] of made.currencies) {
      if (key === env.SKY_POWER) skyPower += n;
      else next.currencies[key] = (next.currencies[key] || 0) + n;
    }
    made.yarns.forEach((id) => env.deps.knitting.receive(next, id));
    Object.assign(state, { currencies: next.currencies, inventory: next.inventory, knitting: next.knitting });
    if (skyPower) state.skyTower.condensedPower = threadRewardHeldCurrency(env, state, env.SKY_POWER) + skyPower;
    if (made.mapReward) state.atlas = made.mapReward.atlas;
    threadRewardGrantSeeds(env, state, made.seeds);
    state.currencyDropVersion = (Number(state.currencyDropVersion) || 0) + made.currencies.length;
    state.noti.items = true;
  }
  function threadRewardKnit(env, state, id, random = Math.random) {
    const blocked = env.deps.knitting.reason(state, id);
    if (blocked) return { ok: false, reason: blocked };
    const row = env.deps.knitting.row(id), counter = env.deps.itemAllocator.snapshot();
    try {
      const made = threadRewardPlan(env, state, row, random), failure = threadRewardReason(env, state, made);
      if (failure) {
        env.deps.itemAllocator.restore(counter);
        return { ok: false, reason: failure };
      }
      threadRewardCommit(env, state, row, made);
      return { ok: true, row, made };
    } catch (error) {
      env.deps.itemAllocator.restore(counter);
      throw error;
    }
  }

  // modules/domain/knitting-reward-catalog.mjs
  function threadRewardKnittingPrerequisites(env) {
    const defs = new Map(env.deps.CONTENT_UNLOCK_CATALOG.map((row) => [row.id, row])), out = /* @__PURE__ */ new Set(), queue = ["knitting"];
    while (queue.length) {
      const id = queue.pop();
      if (out.has(id) || !defs.has(id)) continue;
      out.add(id);
      const def = defs.get(id);
      queue.push(...[def.after, ...def.requires || []].filter(Boolean));
    }
    return out;
  }
  function threadRewardCurrencyProblems(env, row, implied) {
    const own = /* @__PURE__ */ new Set([...implied, ...row.unlocks || []]);
    const seeds = (row.reward.seeds || []).filter(([color, n]) => !Object.hasOwn(env.deps.STUMP_BOX_COLORS, color) || !Number.isInteger(n) || n < 1).map(([color]) => `${row.id}: 씨앗 ${color}`);
    return seeds.concat((row.reward.currencies || row.reward.pickCurrencies || []).flatMap(([key, n]) => {
      const def = env.deps.ORB_DB[env.deps.getCanonicalCurrencyKey(key)];
      if (!def || !Number.isInteger(n) || n < 1) return [env.deps._t("{id}: 재화 {key}", { id: row.id, key })];
      const need = def.dropUnlocks || [];
      return need.length && !need.some((id) => own.has(id)) ? [env.deps._t("{id}: {key}의 해금 {need} 누락", { id: row.id, key, need: need.join("|") })] : [];
    }));
  }
  function threadRewardYarnsProblems(env, row) {
    const n = row.reward.yarns;
    return Number.isInteger(n) && n >= 1 && n <= 3 ? [] : [env.deps._t("{id}: 반환 수", { id: row.id })];
  }
  function threadRewardTierProblems(env, row) {
    const tier = row.reward.tier;
    return Number.isInteger(tier) && tier >= 1 && tier <= 20 ? [] : [env.deps._t("{id}: 보상 등급 {tier}", { id: row.id, tier })];
  }
  function threadRewardUniqueProblems(env, row) {
    const reward = row.reward, pool = threadRewardUniquePool(env, reward, null);
    if (!pool.length) return [env.deps._t("{id}: 고유 풀이 비어 있음", { id: row.id })];
    if (reward.uniquePool === "chase" && (row.grade !== 5 || row.yarnOut !== false)) return [env.deps._t("{id}: 극희귀 보상은 5등급, 반환 제외여야 함", { id: row.id })];
    const want = reward.unique ? threadRewardNamedUniqueGrade(env, pool[0]) : row.grade;
    return want === row.grade ? [] : [env.deps._t("{id}: 「{unique}」 기준 등급 {want}, 세트 등급 {grade}", { id: row.id, unique: reward.unique, want, grade: row.grade })];
  }
  function threadRewardEquipmentProblems(env, family, row) {
    const tier = threadRewardTierProblems(env, row);
    if (tier.length) return tier;
    return family === "unique" ? threadRewardUniqueProblems(env, row) : threadRewardGearProblems(env, row);
  }
  function threadRewardFamilyProblems(env, family, row, implied) {
    if (family === "currencies") return threadRewardCurrencyProblems(env, row, implied);
    if (family === "yarns") return threadRewardYarnsProblems(env, row);
    if (family === "maps") {
      const rule = row.reward.maps;
      return rule.count === 2 && rule.rarity === "rare" && rule.tierUp === 1 ? [] : [env.deps._t("{id}: 지도석 규격", { id: row.id })];
    }
    return threadRewardEquipmentProblems(env, family, row);
  }
  function threadRewardRewardProblems(env) {
    const implied = threadRewardKnittingPrerequisites(env);
    return env.deps.KNITTING.list.flatMap((row) => {
      const families = [...new Set(Object.keys(row.reward || {}).map((key) => env.FAMILIES[key]).filter(Boolean))];
      return families.length === 1 ? threadRewardFamilyProblems(env, families[0], row, implied) : [env.deps._t("{id}: 보상 종류 {families}", { id: row.id, families: families.join(",") || env.deps._t("없음") })];
    });
  }
  function threadRewardGearProblems(env, row) {
    const gear = row.reward.gear, slots = new Set(env.deps.BASE_ITEM_DB.map((base) => base.slot));
    if (gear.slots && !gear.slots.every((slot) => slots.has(slot))) return [env.deps._t("{id}: 부위", { id: row.id })];
    const open = env.deps.BASE_ITEM_DB.some((base) => base.id === gear.base && !base.dropOnly && !base.realmBase && base.reqTier <= row.reward.tier);
    return gear.base && !open ? [env.deps._t("{id}: 베이스 {base}", { id: row.id, base: gear.base })] : [];
  }
  function threadRewardCatalogProblems(env) {
    return env.deps.knitting.structureProblems().concat(threadRewardRewardProblems(env));
  }

  // modules/domain/knitting-rewards.mjs
  function createKnittingRewards(deps) {
    const env = { deps };
    env.FAMILIES = Object.freeze({ currencies: "currencies", pickCurrencies: "currencies", seeds: "currencies", maps: "maps", gear: "gear", unique: "unique", uniquePool: "unique", yarns: "yarns" });
    env.SKY_POWER = "condensedSkyPower";
    return Object.freeze({
      plan: (...args) => threadRewardPlan(env, ...args),
      reason: (...args) => threadRewardReason(env, ...args),
      commit: (...args) => threadRewardCommit(env, ...args),
      knit: (...args) => threadRewardKnit(env, ...args),
      catalogProblems: (...args) => threadRewardCatalogProblems(env, ...args),
      uniquePool: (...args) => threadRewardUniquePool(env, ...args),
      uniqueWeight: (...args) => threadRewardUniqueWeight(env, ...args),
      basesFor: (...args) => threadRewardBasesFor(env, ...args),
      rewardProblems: (...args) => threadRewardRewardProblems(env, ...args)
    });
  }

  // modules/knitting-rewards-classic.mjs
  var rules = createKnittingRewards({
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get keepWeaponCategoryBases() {
      return keepWeaponCategoryBases;
    },
    get HANA_WEAPON_COMBOS() {
      return HANA_WEAPON_COMBOS;
    },
    get BASE_DROP_WEIGHTS() {
      return BASE_DROP_WEIGHTS;
    },
    get getFossilExclusivePool() {
      return getFossilExclusivePool;
    },
    get rollAffixValueInTierRange() {
      return rollAffixValueInTierRange;
    },
    get createItemFromBase() {
      return createItemFromBase;
    },
    get updateItemName() {
      return updateItemName;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get itemInfluences() {
      return itemInfluences;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get KNITTING() {
      return KNITTING;
    },
    get uniqueMeetsTier() {
      return uniqueMeetsTier;
    },
    get contentProgression() {
      return contentProgression;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get getCanonicalCurrencyKey() {
      return getCanonicalCurrencyKey;
    },
    get knitting() {
      return knitting;
    },
    get ATLAS() {
      return ATLAS;
    },
    get atlas() {
      return atlas;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get stumpBox() {
      return stumpBox;
    },
    get STUMP_BOX_HARVEST() {
      return STUMP_BOX_HARVEST;
    },
    // Phase 6 replaces these legacy allocation checkpoints with the shared state owner.
    // Planning failures restore the counter before the synchronous caller can observe them.
    itemAllocator: {
      snapshot: () => window.GameModules.state.session.itemIdCounter,
      restore: (value) => {
        window.GameModules.state.session.itemIdCounter = value;
      }
    },
    get CONTENT_UNLOCK_CATALOG() {
      return CONTENT_UNLOCK_CATALOG;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get _t() {
      return _t;
    }
  });
  var knittingRewards = Object.freeze({
    ...rules,
    knit: (id, random) => rules.knit(game, id, random)
  });
  window.GameModules.knittingRewardRules = rules;
  safeExposeGlobals({ knittingRewards });
})();
