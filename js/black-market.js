// GENERATED from modules/black-market*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/black-market-uniques.mjs
  function marketTradeIsUniqueEligibleForBlackMarket(unique) {
    if (!unique || unique.contentOnly || unique.bossOnly || unique.realmCodexOnly) return false;
    if (!unique.dropOnly) return true;
    return false;
  }
  function marketTradeGetBlackMarketUniqueBase(env, unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return null;
    return env.deps.BASE_ITEM_DB.find((base) => base.id === env.deps.UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
  }
  function marketTradeRollBlackMarketChaseUniquePrice(reqTier) {
    let tier = Math.max(1, Math.floor(Number(reqTier) || 1));
    let minPrice = Math.max(30, Math.min(150, Math.floor(tier * 2)));
    let maxPrice = Math.max(minPrice, Math.min(150, Math.floor(tier * 7.5)));
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
  }
  function marketTradeGetBlackMarketUniqueCodexKey(unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return "";
    return `${unique.slots[0]}|${unique.name}`;
  }
  function marketTradeIsBlackMarketUniqueRegistered(owner, unique) {
    let key = marketTradeGetBlackMarketUniqueCodexKey(unique);
    return !!(key && owner.uniqueCodex && owner.uniqueCodex[key]);
  }
  function marketTradeRollBlackMarketOfferPrice(unique, req) {
    if (unique.ultraRare) return marketTradeRollBlackMarketChaseUniquePrice(req);
    const minPrice = Math.max(1, Math.floor(req / 10));
    const maxPrice = Math.max(minPrice + 1, Math.floor(req / 4) + 1);
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
  }
  function marketTradeCreateBlackMarketUniqueOffer(env, unique, tier, options) {
    if (!unique) return null;
    let req = unique.reqTier || tier;
    let uniqueBase = marketTradeGetBlackMarketUniqueBase(env, unique);
    const price = marketTradeRollBlackMarketOfferPrice(unique, req);
    return {
      type: "unique",
      name: unique.name,
      slot: unique.slots[0],
      reqTier: req,
      hiddenTier: req,
      baseId: uniqueBase ? uniqueBase.id : "",
      baseName: uniqueBase ? uniqueBase.name : "",
      priceKey: "goldenRule",
      price,
      chase: !!unique.ultraRare,
      featured: !!(options && options.featured),
      uniqueEffect: unique.uniqueEffect || "",
      baseStats: uniqueBase && Array.isArray(uniqueBase.baseStats) ? uniqueBase.baseStats.map((stat) => ({ ...stat })) : [],
      uniqueStats: Array.isArray(unique.stats) ? unique.stats.map((stat) => ({ ...stat })) : []
    };
  }
  function marketTradeGetBlackMarketUniquePool(env, tier, preferredSlot, options) {
    const pool = marketTradeFilterUniquePool(env, tier, preferredSlot, options);
    if (pool.length <= 0 && preferredSlot && preferredSlot !== "any") {
      return marketTradeFilterUniquePool(env, tier, "any", options);
    }
    return pool;
  }
  function marketTradeFilterUniquePool(env, tier, preferredSlot, options) {
    let includeChase = !!(options && options.includeChase);
    return env.deps.UNIQUE_DB.filter((unique) => {
      if (!marketTradeIsUniqueEligibleForBlackMarket(unique)) return false;
      if ((unique.reqTier || 1) > tier + 4) return false;
      if (!includeChase && unique.ultraRare) return false;
      if (preferredSlot && preferredSlot !== "any" && (!Array.isArray(unique.slots) || unique.slots[0] !== preferredSlot)) return false;
      return true;
    });
  }

  // modules/data/black-market.mjs
  var BLACK_MARKET_BASE_SLOT_COUNT = 6;
  var BLACK_MARKET_MAX_SLOT_COUNT = 50;
  var BLACK_MARKET_MAX_EXTRA_SLOTS = Math.max(0, BLACK_MARKET_MAX_SLOT_COUNT - BLACK_MARKET_BASE_SLOT_COUNT);
  var BLACK_MARKET_CHASE_UNIQUE_CHANCE = 16e-4;
  var BLACK_MARKET_BASE_CRAFT_TIER = 15;
  var BLACK_MARKET_MAX_LOCKED_OFFERS = 3;
  var BLACK_MARKET_INSIGHT_TARGET = 5;
  var BLACK_MARKET_EQUIPMENT_SLOTS = ["무기", "투구", "갑옷", "장갑", "신발", "목걸이", "반지", "허리띠", "방패"];
  var BLACK_MARKET_SHELF = Object.freeze({ columns: 10, rows: 4 });

  // modules/domain/black-market-bases.mjs
  function marketTradeIsBaseEligibleForBlackMarket(base) {
    return !!(base && !base.dropOnly && !base.realmBase);
  }
  function marketTradeGetBlackMarketBaseChainInfo(env, base) {
    return typeof env.deps.getBaseChainInfo === "function" ? env.deps.getBaseChainInfo(base) : null;
  }
  function marketTradeRollBlackMarketBaseStats(env, base, hiddenTier) {
    if (typeof env.deps.rollBaseStats === "function") return env.deps.rollBaseStats(base, hiddenTier || base.reqTier || 1);
    return Array.isArray(base.baseStats) ? base.baseStats.map((stat) => ({ ...stat })) : [];
  }
  function marketTradeMaybeApplyBlackMarketExceptionalBaseStats(env, baseStats) {
    if (!Array.isArray(baseStats) || baseStats.length <= 0 || Math.random() >= 0.12) return { baseStats, exceptionalBase: false, names: [] };
    let names = [];
    baseStats.forEach((stat) => {
      if (!stat) return;
      let max = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax) : Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.val || stat.base || 0);
      let boosted = max * 1.2;
      let usesDecimal = env.deps.isTenthStat(stat.id);
      stat.val = usesDecimal ? Math.round(boosted * 10) / 10 : Math.max(1, Math.floor(boosted));
      stat.exceptional = true;
      names.push(env.deps._t(stat.statName || env.deps.getStatName(stat.id)));
    });
    return { baseStats, exceptionalBase: names.length > 0, names };
  }
  function marketTradeClearExceptionalBaseState(item) {
    if (!item) return item;
    delete item.exceptionalBase;
    delete item.exceptionalStatNames;
    delete item.exceptionalStatName;
    delete item.exceptionalAllLines;
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach((stat) => {
      if (stat) delete stat.exceptional;
    });
    return item;
  }
  function marketTradeChooseBlackMarketBase(env, slot) {
    let candidates = env.deps.BASE_ITEM_DB.filter((base) => marketTradeIsBaseEligibleForBlackMarket(base) && base.slot === slot && (base.reqTier || 1) <= BLACK_MARKET_BASE_CRAFT_TIER);
    return candidates.length ? env.deps.rndChoice(candidates) : env.deps.chooseItemBase(slot, BLACK_MARKET_BASE_CRAFT_TIER);
  }
  function marketTradeBaseBoundary(stat, keys, fallback) {
    for (const key of keys) {
      if (Number.isFinite(Number(stat && stat[key]))) return Number(stat[key]);
    }
    return fallback;
  }
  function marketTradeGetBlackMarketBaseRollRange(env, stat) {
    let statBase = Number(stat && stat.base) || 0;
    let minBase = marketTradeBaseBoundary(stat, ["baseMin", "baseRollMin", "valMin"], statBase * 0.8);
    let maxBase = marketTradeBaseBoundary(stat, ["baseMax", "baseRollMax", "valMax"], statBase * 1.2);
    let scale = stat && stat.id === "energyShield" ? 1.5 : 1;
    let min = minBase * scale;
    let max = maxBase * scale;
    if (max > 0) {
      let decimal = env.deps.isTenthStat(stat.id);
      min = Math.max(decimal ? 0.1 : 1, min);
      max = Math.max(min, max);
    }
    return { min, max };
  }

  // modules/domain/black-market-ledger.mjs
  function marketTradeMigrateUniqueMarketOffer(env, offer) {
    if (offer.type === "unique") offer.name = env.deps.RENAMED_UNIQUES[offer.name] || offer.name;
    const rule = offer.type === "unique" && env.deps.UNIQUE_EQUIPMENT_RULES[offer.name];
    if (!rule) return;
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === rule.baseId);
    if (offer.baseId === base.id && offer.slot === base.slot && offer.baseName === base.name && offer.blockBaseVersion >= 1) return;
    offer.baseId = base.id;
    offer.baseName = base.name;
    offer.slot = base.slot;
    offer.baseStats = base.baseStats.map((stat) => ({ ...stat }));
    offer.blockBaseVersion = 1;
    if (offer.name === "고요한 맹세") offer.uniqueStats = env.deps.UNIQUE_DB.find((row) => row.name === offer.name).stats.map((stat) => ({ ...stat }));
  }
  function marketTradeMigrateBlackMarketBaseOffer(env, offer) {
    const legacyName = String(offer.baseName || offer.name || "").replace(/ 베이스$/, "");
    if (!offer.baseId) offer.baseId = env.deps.ARM_GUARD_BASE_LEGACY_NAMES[legacyName] || env.deps.WEAPON_BASE_LEGACY_NAMES[legacyName];
    env.deps.normalizeArmGuardIdentity(offer);
    if (Array.isArray(offer.baseStats)) env.deps.migrateEquipmentBlockBases(offer);
    const base = env.deps.BASE_ITEM_DB.find((row) => row.id === offer.baseId);
    if (base) offer.name = base.name + " 베이스";
  }
  function marketTradeNormalizeBlackMarketState(env, owner) {
    owner.blackMarket = owner.blackMarket && typeof owner.blackMarket === "object" ? owner.blackMarket : { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {} };
    owner.blackMarket.extraSlots = Math.max(0, Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.floor(Number(owner.blackMarket.extraSlots) || 0)));
    owner.blackMarket.offers = Array.isArray(owner.blackMarket.offers) ? owner.blackMarket.offers.slice(0, BLACK_MARKET_MAX_SLOT_COUNT).map((offer) => {
      if (!offer) return offer;
      marketTradeMigrateUniqueMarketOffer(env, offer);
      if (offer.type === "baseItem") {
        marketTradeMigrateBlackMarketBaseOffer(env, offer);
        let base = env.deps.BASE_ITEM_DB.find((row) => row && (offer.baseId && row.id === offer.baseId || row.name === String(offer.name || "").replace(" 베이스", "") && row.slot === offer.slot));
        if (base && (base.reqTier || 1) > BLACK_MARKET_BASE_CRAFT_TIER) return null;
        offer.hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
        offer.affixTierCap = BLACK_MARKET_BASE_CRAFT_TIER;
        offer.rareT20Base = false;
        offer.price = Math.ceil(BLACK_MARKET_BASE_CRAFT_TIER * 0.45) + 2 + (offer.exceptionalBase ? 4 : 0);
        return offer;
      }
      if (offer.type !== "unique") return offer;
      let unique = env.deps.UNIQUE_DB.find((row) => row && row.name === offer.name);
      return marketTradeIsUniqueEligibleForBlackMarket(unique) ? offer : null;
    }) : [];
    owner.blackMarket.lockedOffers = owner.blackMarket.lockedOffers && typeof owner.blackMarket.lockedOffers === "object" ? owner.blackMarket.lockedOffers : {};
    owner.blackMarket.preferredSlot = BLACK_MARKET_EQUIPMENT_SLOTS.includes(owner.blackMarket.preferredSlot) ? owner.blackMarket.preferredSlot : "any";
    owner.blackMarket.insight = Math.max(0, Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.floor(Number(owner.blackMarket.insight) || 0)));
    owner.blackMarket.manualRefreshes = Math.max(0, Math.min(20, Math.floor(Number(owner.blackMarket.manualRefreshes) || 0)));
    Object.keys(owner.blackMarket.lockedOffers).forEach((key) => {
      let idx = Math.floor(Number(key));
      if (!Number.isFinite(idx) || idx < 0 || idx >= BLACK_MARKET_MAX_SLOT_COUNT || !owner.blackMarket.offers[idx]) delete owner.blackMarket.lockedOffers[key];
    });
    return owner.blackMarket;
  }
  function marketTradeGetBlackMarketLockCount(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Object.keys(bm.lockedOffers || {}).filter((key) => bm.lockedOffers[key] && bm.offers[Math.floor(Number(key))]).length;
  }
  function marketTradeGetBlackMarketManualRefreshCost(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Math.min(25, 3 + Math.max(0, Math.floor(bm.manualRefreshes || 0)) * 2);
  }
  function marketTradeGetBlackMarketSlotCount(env, owner) {
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    return Math.min(BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_BASE_SLOT_COUNT + Math.max(0, Math.floor(bm.extraSlots || 0)));
  }
  function marketTradeIsBlackMarketSlotCapReached(env, owner) {
    return marketTradeGetBlackMarketSlotCount(env, owner) >= BLACK_MARKET_MAX_SLOT_COUNT;
  }
  function marketTradeGetBlackMarketSlotExpandCost(env, owner) {
    return 1 + Math.max(0, Math.floor(marketTradeNormalizeBlackMarketState(env, owner).extraSlots || 0));
  }

  // modules/domain/black-market-offers.mjs
  function marketTradeRollBlackMarketExchangeOffer(env, recipe, index) {
    let multiplierRoll = Math.random();
    let bulkMultiplier = 1;
    if (multiplierRoll < 2e-4) bulkMultiplier = 100;
    else if (multiplierRoll < 22e-4) bulkMultiplier = 10;
    else if (multiplierRoll < 0.0222) bulkMultiplier = 2 + Math.floor(Math.random() * 4);
    let needVariance = 0.9 + Math.random() * 0.2;
    let gainVariance = 0.9 + Math.random() * 0.2;
    let baseGain = recipe.gain;
    if (recipe.id === "m11" && recipe.from === "goldenRule" && recipe.to === "formlessDew") baseGain = 70;
    let need = Math.max(1, Math.floor(recipe.need * 0.8 * needVariance * bulkMultiplier));
    let gain = Math.max(1, Math.floor(baseGain * gainVariance * bulkMultiplier));
    let standardRate = Math.max(1e-4, recipe.gain / Math.max(1, recipe.need));
    let rolledRate = gain / Math.max(1, need);
    let dealPct = Math.max(0, Math.round((rolledRate / standardRate - 1) * 100));
    return { type: "exchange", name: env.deps._t("암거래 교환 #{value}", { value: index + 1 }), from: recipe.from, to: recipe.to, need, gain, bulkMultiplier, dealPct };
  }
  function marketTradeBuildBlackMarketFeaturedOffer(env, owner) {
    let tier = (env.deps.getZone(owner.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let pool = marketTradeGetBlackMarketUniquePool(env, tier, bm.preferredSlot, { includeChase: false });
    let missing = pool.filter((unique2) => !marketTradeIsBlackMarketUniqueRegistered(owner, unique2));
    let unique = env.deps.rndChoice(missing.length > 0 ? missing : pool);
    return marketTradeCreateBlackMarketUniqueOffer(env, unique, tier, { featured: true }) || marketTradeBuildBlackMarketOffer(env, owner, 0);
  }
  function marketTradeBuildBlackMarketOffer(env, owner, index) {
    let tier = (env.deps.getZone(owner.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let roll = Math.random();
    if (roll < 0.45) {
      return marketTradeRollBlackMarketExchangeOffer(env, env.deps.rndChoice(env.deps.MARKET_EXCHANGES), index);
    }
    if (roll < 0.75) return marketTradeRollBaseOffer(env, bm);
    if (roll < 0.9) {
      return { type: "skillGem", name: env.deps.pickSkillRuneReward(env.deps.gemDropRewards.attackRunes()), priceKey: "formlessDew", price: 5 };
    }
    return marketTradeChooseUniqueOffer(env, owner, bm, tier);
  }
  function marketTradeRollBaseOffer(env, bm) {
    let preferred = bm.preferredSlot;
    let slot = preferred !== "any" && Math.random() < 0.35 ? preferred : env.deps.rndChoice(BLACK_MARKET_EQUIPMENT_SLOTS);
    let base = marketTradeChooseBlackMarketBase(env, slot);
    let hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
    let chainInfo = marketTradeGetBlackMarketBaseChainInfo(env, base);
    let rolledBase = marketTradeMaybeApplyBlackMarketExceptionalBaseStats(env, marketTradeRollBlackMarketBaseStats(env, base, hiddenTier));
    let price = Math.max(2, Math.ceil(hiddenTier * 0.45) + 2 + (rolledBase.exceptionalBase ? 4 : 0));
    return { type: "baseItem", name: env.deps._t("{name} 베이스", { name: base.name }), slot: base.slot, baseId: base.id, baseName: base.name, hiddenTier, affixTierCap: hiddenTier, priceKey: "formlessDew", price, baseStats: rolledBase.baseStats, exceptionalBase: rolledBase.exceptionalBase, exceptionalStatNames: rolledBase.names, rareT20Base: false, baseChainStep: chainInfo && chainInfo.step, baseChainTotal: chainInfo && chainInfo.total };
  }
  function marketTradeChooseUniqueOffer(env, owner, bm, tier) {
    let preferredUniqueSlot = bm.preferredSlot !== "any" && Math.random() < 0.35 ? bm.preferredSlot : "any";
    let uniqPool = marketTradeGetBlackMarketUniquePool(env, tier, preferredUniqueSlot, { includeChase: true });
    let normalPool = uniqPool.filter((u) => !u.ultraRare);
    let chasePool = uniqPool.filter((u) => u.ultraRare);
    let pickChase = chasePool.length > 0 && Math.random() < BLACK_MARKET_CHASE_UNIQUE_CHANCE;
    let fallbackPool = uniqPool.length ? uniqPool : env.deps.UNIQUE_DB.filter(marketTradeIsUniqueEligibleForBlackMarket);
    let unregisteredNormal = normalPool.filter((unique2) => !marketTradeIsBlackMarketUniqueRegistered(owner, unique2));
    let normalChoicePool = unregisteredNormal.length > 0 && Math.random() < 0.7 ? unregisteredNormal : normalPool;
    let unique = pickChase ? env.deps.rndChoice(chasePool) : env.deps.rndChoice(normalChoicePool.length ? normalChoicePool : fallbackPool);
    return marketTradeCreateBlackMarketUniqueOffer(env, unique, tier);
  }

  // modules/domain/black-market-refresh.mjs
  function marketTradeRefreshBlackMarket(env, owner, force) {
    if (!env.deps.contentProgression.isUnlocked("market", owner)) return;
    let bm = marketTradeNormalizeBlackMarketState(env, owner);
    let now = env.deps.marketNow();
    let count = marketTradeGetBlackMarketSlotCount(env, owner);
    Object.keys(bm.lockedOffers || {}).forEach((key) => {
      let idx = Math.floor(Number(key));
      if (!Number.isFinite(idx) || idx < 0 || idx >= count) delete bm.lockedOffers[key];
    });
    if (!force && now < (bm.nextRefreshAt || 0)) {
      for (let index = 0; index < count; index++) {
        if (typeof bm.offers[index] === "undefined") bm.offers[index] = marketTradeBuildBlackMarketOffer(env, owner, index);
      }
      return;
    }
    let isNaturalRefresh = !force;
    if (isNaturalRefresh) bm.manualRefreshes = 0;
    marketTradeRollRefreshedShelf(env, owner, bm, count);
    bm.nextRefreshAt = now + 10 * 60 * 1e3;
  }
  function marketTradeLockBlackMarketOffer(env, owner, index) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner);
    if (!bm.offers[index]) return { ok: false, reason: env.deps._t("이미 팔린 물건입니다.") };
    if (bm.lockedOffers[index]) {
      delete bm.lockedOffers[index];
      return { ok: true, locked: false };
    }
    if (marketTradeGetBlackMarketLockCount(env, owner) >= BLACK_MARKET_MAX_LOCKED_OFFERS) return { ok: false, reason: env.deps._t("잠금은 {value}개까지입니다.", { value: BLACK_MARKET_MAX_LOCKED_OFFERS }) };
    bm.lockedOffers[index] = true;
    return { ok: true, locked: true };
  }
  function marketTradeSetBlackMarketPreferredSlot(env, owner, slot) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), next = BLACK_MARKET_EQUIPMENT_SLOTS.includes(slot) ? slot : "any";
    if (bm.preferredSlot === next) return false;
    bm.preferredSlot = next;
    return true;
  }
  function marketTradePayBlackMarketRefresh(env, owner) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), cost = marketTradeGetBlackMarketManualRefreshCost(env, owner);
    if (!env.deps.contentProgression.isUnlocked("market", owner)) return { ok: false, reason: env.deps._t("거래소가 아직 열리지 않았습니다.") };
    if ((owner.currencies.formlessDew || 0) < cost) return { ok: false, reason: env.deps._t("형체 없는 이슬 부족, {formlessDew}/{cost}", { formlessDew: owner.currencies.formlessDew || 0, cost }), cost };
    owner.currencies.formlessDew -= cost;
    bm.manualRefreshes = Math.min(20, Math.max(0, Math.floor(bm.manualRefreshes || 0)) + 1);
    marketTradeRefreshBlackMarket(env, owner, true);
    return { ok: true, cost };
  }
  function marketTradePayBlackMarketExpansion(env, owner) {
    const bm = marketTradeNormalizeBlackMarketState(env, owner), cost = marketTradeGetBlackMarketSlotExpandCost(env, owner), before = marketTradeGetBlackMarketSlotCount(env, owner);
    if (marketTradeIsBlackMarketSlotCapReached(env, owner)) return { ok: false, reason: env.deps._t("진열은 {value}칸까지입니다.", { value: BLACK_MARKET_MAX_SLOT_COUNT }) };
    if ((owner.currencies.goldenRule || 0) < cost) return { ok: false, reason: env.deps._t("황금률 부족, {goldenRule}/{cost}", { goldenRule: owner.currencies.goldenRule || 0, cost }), cost };
    owner.currencies.goldenRule -= cost;
    bm.extraSlots = Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.max(0, Math.floor(bm.extraSlots || 0)) + 1);
    bm.offers[before] = marketTradeBuildBlackMarketOffer(env, owner, before);
    return { ok: true, cost, count: marketTradeGetBlackMarketSlotCount(env, owner) };
  }
  function marketTradeRollRefreshedShelf(env, owner, bm, count) {
    let prevOffers = Array.isArray(bm.offers) ? bm.offers.slice(0, count) : [];
    let openIndices = Array.from({ length: count }, (_, index) => index).filter((index) => !(bm.lockedOffers[index] && prevOffers[index]));
    let nextInsight = Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.max(0, Math.floor(bm.insight || 0)) + 1);
    let featuredIndex = nextInsight >= BLACK_MARKET_INSIGHT_TARGET && openIndices.length > 0 ? openIndices[0] : -1;
    let featuredOffer = featuredIndex >= 0 ? marketTradeBuildBlackMarketFeaturedOffer(env, owner) : null;
    bm.offers = Array.from({ length: count }, (_, i) => {
      if (bm.lockedOffers[i] && prevOffers[i]) return prevOffers[i];
      if (bm.lockedOffers[i]) delete bm.lockedOffers[i];
      if (i === featuredIndex) return featuredOffer;
      return marketTradeBuildBlackMarketOffer(env, owner, i);
    });
    bm.insight = featuredOffer && featuredOffer.featured ? 0 : nextInsight;
  }

  // modules/domain/black-market-items.mjs
  function marketTradeGetBlackMarketBaseItemShape(env, offer) {
    const base = env.deps.BASE_ITEM_DB.find((row) => row && (offer.baseId && row.id === offer.baseId || row.name === offer.name.replace(" 베이스", "") && row.slot === offer.slot)) || env.deps.chooseItemBase(offer.slot, offer.hiddenTier || offer.reqTier);
    const tier = offer.hiddenTier || offer.reqTier || base.reqTier || 1, rolled = Array.isArray(offer.baseStats) && offer.baseStats.length > 0;
    return {
      slot: base.slot,
      baseId: base.id,
      baseName: base.name,
      name: base.name,
      rarity: "normal",
      itemTier: tier,
      hiddenTier: tier,
      affixTierCap: BLACK_MARKET_BASE_CRAFT_TIER,
      baseStats: rolled ? offer.baseStats.map((stat) => ({ ...stat })) : env.deps.rollBaseStats(base, tier),
      stats: [],
      ...marketTradeGetBlackMarketExceptionalShape(offer, rolled)
    };
  }
  function marketTradeGetBlackMarketExceptionalShape(offer, rolled) {
    const names = Array.isArray(offer.exceptionalStatNames) ? offer.exceptionalStatNames.slice() : [];
    return {
      exceptionalBase: !!offer.exceptionalBase,
      exceptionalStatNames: names,
      exceptionalStatName: names.join(", "),
      exceptionalAllLines: !!(offer.exceptionalBase && rolled && offer.baseStats.every((stat) => stat && stat.exceptional))
    };
  }
  function* marketTradeCreateBlackMarketUniqueItem(env, offer) {
    const item = yield { kind: "marketCreateUnique", args: [offer.hiddenTier || offer.reqTier, offer.slot, offer.name] };
    const base = env.deps.BASE_ITEM_DB.find((row) => row && offer.baseId && row.id === offer.baseId);
    if (item && base) {
      item.baseId = base.id;
      item.baseName = base.name;
      item.baseStats = env.deps.rollBaseStats(base, offer.hiddenTier || offer.reqTier || base.reqTier || 1);
      marketTradeClearExceptionalBaseState(item);
      env.deps.maybeApplyExceptionalBase(item);
    }
    return item;
  }
  function marketTradeGetBlackMarketOfferSize(env, offer) {
    return offer.type === "baseItem" || offer.type === "unique" ? env.deps.getEquipmentInventoryFootprint(offer) : { columns: 1, rows: 1 };
  }

  // modules/domain/black-market-purchase.mjs
  function marketTradeGetBlackMarketOfferPrice(offer) {
    return offer.type === "exchange" ? { key: offer.from, amount: offer.need } : { key: offer.priceKey, amount: offer.price };
  }
  function marketTradeCheckBlackMarketOffer(env, owner, index, place = null) {
    if (owner.woodsmanBuildLock) return { ok: false, reason: env.deps._t("☠️ 나무꾼 전투 중에는 살 수 없습니다.") };
    const offer = marketTradeNormalizeBlackMarketState(env, owner).offers[index];
    if (!offer) return { ok: false, reason: env.deps._t("이미 팔린 물건입니다.") };
    const price = marketTradeGetBlackMarketOfferPrice(offer), have = Math.floor(Number(owner.currencies[price.key]) || 0);
    if (have < price.amount) return { ok: false, reason: env.deps._t("{name} 부족, {have}/{amount}", { name: env.deps._t(env.deps.ORB_DB[price.key].name), have, amount: price.amount }) };
    if (offer.type === "skillGem") return { ok: true };
    return offer.type === "baseItem" || offer.type === "unique" ? marketTradeCheckBlackMarketRoom(env, owner, offer, place) : { ok: true };
  }
  function marketTradeCheckBlackMarketRoom(env, owner, offer, place) {
    if (!place) return env.deps.canStoreEquipmentItems([offer], owner) ? { ok: true } : { ok: false, reason: env.deps._t("가방에 빈칸이 없습니다.") };
    const fit = env.deps.equipmentInventoryGridRuntime.canAdd(offer, place.column, place.row, owner);
    return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
  }
  function marketTradeGetBlackMarketConfirmText(env, offer) {
    const price = marketTradeGetBlackMarketOfferPrice(offer);
    if (!(offer.chase || offer.featured || price.key === "goldenRule" && Number(price.amount) >= 5)) return "";
    return `[${offer.name || env.deps._t("암거래 상품")}]${env.deps.pickParticle(offer.name || "암거래 상품", "을", "를")} 삽니다.
${env.deps._t(env.deps.ORB_DB[price.key].name)} ${price.amount}개를 쓰며 되돌릴 수 없습니다.`;
  }
  function* marketTradeSellBlackMarketOffer(env, owner, index, { place = null, offer = null } = {}) {
    marketTradeRefreshBlackMarket(env, owner, false);
    const bm = marketTradeNormalizeBlackMarketState(env, owner);
    if (offer && bm.offers[index] !== offer) return { ok: false, reason: env.deps._t("진열이 바뀌었습니다. 새 물건을 다시 확인하세요.") };
    const check = marketTradeCheckBlackMarketOffer(env, owner, index, place);
    if (!check.ok) return check;
    const sold = bm.offers[index], summary = yield* marketTradeGrantBlackMarketOffer(env, owner, sold, place);
    if (!summary) return { ok: false, reason: env.deps._t("가방에 넣지 못했습니다.") };
    const price = marketTradeGetBlackMarketOfferPrice(sold);
    owner.currencies[price.key] -= price.amount;
    bm.offers[index] = null;
    delete bm.lockedOffers[index];
    return { ok: true, summary, notable: !!(sold.chase || sold.featured) };
  }
  function* marketTradeGrantBlackMarketOffer(env, owner, offer, place) {
    if (offer.type === "exchange") {
      yield { kind: "marketGrantCurrency", args: [offer.to, offer.gain] };
      return `${env.deps._t(env.deps.ORB_DB[offer.from].name)} ${offer.need} → ${env.deps._t(env.deps.ORB_DB[offer.to].name)} ${offer.gain}`;
    }
    if (offer.type === "skillGem") {
      yield { kind: "marketGrantGem", args: [owner, { kind: "attack", name: offer.name, awakened: false }, 0] };
      return env.deps._t("공격 룬 [{name}]", { name: offer.name });
    }
    const item = offer.type === "baseItem" ? env.deps.normalizeItem({ ...marketTradeGetBlackMarketBaseItemShape(env, offer), id: yield { kind: "marketAllocateItemId", args: [] } }) : yield* marketTradeCreateBlackMarketUniqueItem(env, offer);
    if (!item || !(yield { kind: "marketStowItem", args: [item, place] })) return "";
    owner.noti.items = true;
    return offer.type === "baseItem" ? env.deps._t("제작 베이스 [{name}]", { name: item.name }) : env.deps._t("{value}고유 [{name}]", { value: offer.featured ? env.deps._t("표적 ") : "", name: item.name });
  }

  // modules/domain/black-market-layout.mjs
  function marketTradeBlackMarketShelfCells(at, size) {
    const cells = [];
    for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
    return cells;
  }
  function marketTradeKeepsBlackMarketPlace(env, offer, size, taken) {
    const placed = Number.isInteger(offer.column) && Number.isInteger(offer.row) && offer.column >= 0 && offer.row >= 0 && offer.column + size.columns <= BLACK_MARKET_SHELF.columns;
    return placed && !marketTradeBlackMarketShelfCells(offer, size).some((cell) => taken.has(cell));
  }
  function marketTradeFirstFreeBlackMarketPlace(env, taken, size) {
    for (let row = 0; ; row++) {
      for (let column = 0; column + size.columns <= BLACK_MARKET_SHELF.columns; column++) {
        if (!marketTradeBlackMarketShelfCells({ column, row }, size).some((cell) => taken.has(cell))) return { column, row };
      }
    }
  }
  function marketTradePlaceBlackMarketOffers(env, bm) {
    const taken = /* @__PURE__ */ new Set(), waiting = [];
    let rows = BLACK_MARKET_SHELF.rows;
    const claim = (offer, size) => {
      marketTradeBlackMarketShelfCells(offer, size).forEach((cell) => taken.add(cell));
      rows = Math.max(rows, offer.row + size.rows);
    };
    for (const offer of bm.offers) {
      if (!offer) continue;
      const size = marketTradeGetBlackMarketOfferSize(env, offer);
      if (marketTradeKeepsBlackMarketPlace(env, offer, size, taken)) claim(offer, size);
      else waiting.push({ offer, size });
    }
    waiting.sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
    for (const { offer, size } of waiting) {
      Object.assign(offer, marketTradeFirstFreeBlackMarketPlace(env, taken, size));
      claim(offer, size);
    }
    return rows;
  }

  // modules/domain/black-market-comparison.mjs
  function marketTradeGetBlackMarketBaseComparison(env, owner, offer) {
    if (!offer || offer.type !== "baseItem" || !offer.slot) return null;
    let equipped = marketTradeComparableEquipment(owner, offer);
    if (equipped.length <= 0) return { delta: null, label: env.deps._t("빈 장착 슬롯 있음"), tone: "empty" };
    equipped.sort((a, b) => a.tier - b.tier || a.slotKey.localeCompare(b.slotKey));
    let weakest = equipped[0];
    let offerTier = Math.max(1, Math.floor(Number(offer.hiddenTier || offer.reqTier) || 1));
    let delta = offerTier - weakest.tier;
    return {
      delta,
      comparedSlot: weakest.slotKey,
      comparedTier: weakest.tier,
      label: marketTradeComparisonLabel(env, weakest, delta),
      tone: delta > 0 ? "upgrade" : delta < 0 ? "downgrade" : "same"
    };
  }
  function marketTradeComparableEquipment(owner, offer) {
    return Object.entries(owner && owner.equipment || {}).filter(([slotKey, item]) => item && String(slotKey).replace(/[123]$/, "") === offer.slot).map(([slotKey, item]) => ({ slotKey, item, tier: Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1)) }));
  }
  function marketTradeComparisonLabel(env, weakest, delta) {
    return `${weakest.slotKey} T${weakest.tier} 대비 ${delta === 0 ? env.deps._t("동급") : env.deps._t("{value}{delta}티어", { value: delta > 0 ? "+" : "", delta })}`;
  }

  // modules/domain/black-market.mjs
  function createBlackMarket(deps) {
    const env = { deps };
    return Object.freeze({
      isUniqueEligibleForBlackMarket: marketTradeIsUniqueEligibleForBlackMarket,
      isBaseEligibleForBlackMarket: marketTradeIsBaseEligibleForBlackMarket,
      rollBlackMarketExchangeOffer: (...args) => marketTradeRollBlackMarketExchangeOffer(env, ...args),
      normalizeBlackMarketState: (...args) => marketTradeNormalizeBlackMarketState(env, ...args),
      getBlackMarketLockCount: (...args) => marketTradeGetBlackMarketLockCount(env, ...args),
      getBlackMarketManualRefreshCost: (...args) => marketTradeGetBlackMarketManualRefreshCost(env, ...args),
      getBlackMarketSlotCount: (...args) => marketTradeGetBlackMarketSlotCount(env, ...args),
      createBlackMarketUniqueOffer: (...args) => marketTradeCreateBlackMarketUniqueOffer(env, ...args),
      buildBlackMarketOffer: (...args) => marketTradeBuildBlackMarketOffer(env, ...args),
      refreshBlackMarket: (...args) => marketTradeRefreshBlackMarket(env, ...args),
      lockBlackMarketOffer: (...args) => marketTradeLockBlackMarketOffer(env, ...args),
      setBlackMarketPreferredSlot: (...args) => marketTradeSetBlackMarketPreferredSlot(env, ...args),
      payBlackMarketRefresh: (...args) => marketTradePayBlackMarketRefresh(env, ...args),
      payBlackMarketExpansion: (...args) => marketTradePayBlackMarketExpansion(env, ...args),
      getBlackMarketSlotExpandCost: (...args) => marketTradeGetBlackMarketSlotExpandCost(env, ...args),
      getBlackMarketOfferPrice: marketTradeGetBlackMarketOfferPrice,
      checkBlackMarketOffer: (...args) => marketTradeCheckBlackMarketOffer(env, ...args),
      getBlackMarketConfirmText: (...args) => marketTradeGetBlackMarketConfirmText(env, ...args),
      sellBlackMarketOffer: (...args) => marketTradeSellBlackMarketOffer(env, ...args),
      getBlackMarketBaseItemShape: (...args) => marketTradeGetBlackMarketBaseItemShape(env, ...args),
      getBlackMarketOfferSize: (...args) => marketTradeGetBlackMarketOfferSize(env, ...args),
      placeBlackMarketOffers: (...args) => marketTradePlaceBlackMarketOffers(env, ...args),
      getBlackMarketBaseRollRange: (...args) => marketTradeGetBlackMarketBaseRollRange(env, ...args),
      getBlackMarketBaseComparison: (...args) => marketTradeGetBlackMarketBaseComparison(env, ...args)
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/black-market-tooltips.mjs
  function renderBlackMarketBaseOptions(deps, baseStats) {
    let rows = Array.isArray(baseStats) ? baseStats : [];
    if (rows.length <= 0) return '<div class="tooltip-line">베이스 옵션 없음</div>';
    return rows.map((stat) => {
      let range = deps.baseRange(stat);
      let label = deps._t(stat.statName || deps.getStatName(stat.id));
      return `<div class="tooltip-line" style="color:#9fd6ff;">${deps._t("베이스 옵션, {label} {id}~{id2}", { label: deps.escapeHTML(label), id: deps.formatSignedValue(stat.id, range.min), id2: deps.formatSignedValue(stat.id, range.max) })}</div>`;
    }).join("");
  }
  function renderBlackMarketUniqueOptions(deps, offer, uniq) {
    let effect = marketUniqueEffect(offer, uniq);
    let sourceStats = Array.isArray(offer && offer.uniqueStats) ? offer.uniqueStats : uniq && uniq.stats;
    let effectLine = effect ? `<div class="tooltip-line" style="color:#d7b8ff;">${deps._t("고유 효과: {effect}", { effect: deps.escapeHTML(effect) })}</div>` : "";
    let statLines = (Array.isArray(sourceStats) ? sourceStats : []).map((stat) => {
      let statId = stat.id;
      let { min, max } = deps.getUniqueStatRollRange(stat);
      let label = deps._t(stat.statName || deps.getStatName(statId));
      return `<div class="tooltip-line" style="color:#ffd98a;">${deps._t("고유 옵션, {label} +{statId}~+{statId2}", { label: deps.escapeHTML(label), statId: deps.formatValue(statId, min), statId2: deps.formatValue(statId, max) })}</div>`;
    });
    return effectLine + (statLines.join("") || '<div class="tooltip-line">고유 옵션 보유</div>');
  }
  function renderBlackMarketOfferTooltip(deps, owner, offer) {
    if (!offer) return '<div class="tooltip-title">품절</div>';
    if (offer.type === "exchange") return renderMarketExchange(deps, offer);
    if (offer.type === "skillGem") return renderMarketRune(deps, offer);
    if (offer.type === "baseItem") return renderMarketBase(deps, owner, offer);
    if (offer.type === "unique") return renderMarketUnique(deps, owner, offer);
    return '<div class="tooltip-title">암거래 품목</div>';
  }
  function renderMarketExchange(deps, offer) {
    let fromName = typeof deps.getStyledOrbName === "function" ? deps.getStyledOrbName(offer.from) : deps._t(deps.ORB_DB[offer.from].name);
    let toName = typeof deps.getStyledOrbName === "function" ? deps.getStyledOrbName(offer.to) : deps._t(deps.ORB_DB[offer.to].name);
    let bulkLine = offer.bulkMultiplier && offer.bulkMultiplier > 1 ? `<div class="tooltip-line" style="color:#ffd36a;">${deps._t("대량 교환 x{bulkMultiplier}", { bulkMultiplier: offer.bulkMultiplier })}</div>` : "";
    let dealLine = Number.isFinite(Number(offer.dealPct)) ? `<div class="tooltip-line" style="color:#8fd9a7;">${deps._t("정규 거래소 대비 교환 효율 +{max}%", { max: Math.max(0, Math.floor(offer.dealPct)) })}</div>` : "";
    return `<div class="tooltip-title">${deps._t("재화 교환")}</div><div class="tooltip-line">${deps._t("{fromName} {need}개를 {toName} {gain}개로 교환합니다.", { fromName, need: offer.need, toName, gain: offer.gain })}</div>${dealLine}${bulkLine}`;
  }
  function renderMarketRune(deps, offer) {
    let skill = deps.SKILL_DB[offer.name] || {};
    return `<div class="tooltip-title">${deps._t("룬: {name}", { name: offer.name })}</div><div class="tooltip-line">${deps._t(skill.desc) || deps._t("미보유 공격 룬을 획득합니다.")}</div>`;
  }
  function renderMarketBase(deps, owner, offer) {
    let sourceStats = marketBaseSourceStats(deps, offer);
    let chainLabel = offer && offer.baseChainStep && offer.baseChainTotal ? `${Math.floor(offer.baseChainStep)}/${Math.floor(offer.baseChainTotal)}` : "";
    let chainLine = chainLabel ? `<div class="tooltip-line" style="color:#9fd6ff;">${deps._t("베이스 체인 {chainLabel}", { chainLabel })}</div>` : "";
    let rareLine = offer.rareT20Base ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">T20 희귀 베이스</div>' : "";
    let exLine = offer.exceptionalBase ? '<div class="tooltip-line" style="color:#ffb454; font-weight:800;">특출난 베이스</div>' : "";
    let comparison = deps.compareBase(owner, offer);
    let comparisonLine = renderMarketComparison(deps, comparison);
    return `<div class="tooltip-title">${deps._t("베이스 장비")}</div><div class="tooltip-line">${deps._t("{name}, 숨겨진 티어 {hiddenTier}", { name: offer.name, hiddenTier: offer.hiddenTier || offer.reqTier })}</div>${comparisonLine}${chainLine}${rareLine}${exLine}${renderBlackMarketBaseOptions(deps, sourceStats)}<div class="tooltip-line">${deps._t("제작용 베이스로 사용됩니다.")}</div>`;
  }
  function renderMarketUnique(deps, owner, offer) {
    let uniq = deps.UNIQUE_DB.find((u) => u && u.name === offer.name);
    let codexLine = renderMarketCodex(owner, offer, uniq);
    let optionLines = renderBlackMarketUniqueOptions(deps, offer, uniq);
    let baseLines = renderBlackMarketBaseOptions(deps, offer.baseStats);
    let baseTitle = offer.baseName ? `<div class="tooltip-line" style="color:var(--copy-bright);">${deps._t("베이스: {baseName}, 숨겨진 티어 {hiddenTier}", { baseName: deps.escapeHTML(deps._t(offer.baseName)), hiddenTier: offer.hiddenTier || offer.reqTier })}</div>` : "";
    let chaseLine = offer.chase ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">체이싱 유니크 암거래 품목</div>' : "";
    let featuredLine = offer.featured ? '<div class="tooltip-line" style="color:#93e7c1; font-weight:800;">시장 정보로 확보한 표적 고유</div>' : "";
    return `<div class="tooltip-title">${deps._t("도감 고유 정보, {name} (숨겨진 티어 {hiddenTier})", { name: deps.escapeHTML(deps._t(offer.name)), hiddenTier: offer.hiddenTier || offer.reqTier })}</div>${featuredLine}${chaseLine}${baseTitle}${baseLines}${optionLines}<div class="tooltip-line">${deps._t("도감 등록: {codexLine}", { codexLine })}</div>`;
  }
  function marketUniqueEffect(offer, uniq) {
    return offer && offer.uniqueEffect || uniq && uniq.uniqueEffect || "";
  }
  function marketBaseSourceStats(deps, offer) {
    let base = deps.BASE_ITEM_DB.find((row) => row && (offer.baseId && row.id === offer.baseId || row.name === String(offer.name || "").replace(" 베이스", "") && row.slot === offer.slot));
    return Array.isArray(offer.baseStats) && offer.baseStats.length > 0 ? offer.baseStats : base && base.baseStats;
  }
  function renderMarketComparison(deps, comparison) {
    return comparison ? `<div class="tooltip-line" style="color:${comparison.tone === "upgrade" || comparison.tone === "empty" ? "#8fd9a7" : comparison.tone === "downgrade" ? "#d99b91" : "#9fb4d1"};">${deps._t("장착 비교, {label}", { label: deps.escapeHTML(deps._t(comparison.label)) })}</div>` : "";
  }
  function renderMarketCodex(owner, offer, uniq) {
    let slot = uniq && Array.isArray(uniq.slots) && uniq.slots.length > 0 ? uniq.slots[0] : "";
    let codexKey = `${slot}|${offer.name}`;
    let codex = owner && owner.uniqueCodex && typeof owner.uniqueCodex === "object" ? owner.uniqueCodex : {};
    let registered = !!codex[codexKey];
    return registered ? '<span style="color:#8dffb1;">등록됨</span>' : '<span style="color:#ffb0b0;">미등록</span>';
  }

  // modules/black-market-classic.mjs
  var rules = createBlackMarket({
    get getBaseChainInfo() {
      return typeof getBaseChainInfo === "undefined" ? void 0 : getBaseChainInfo;
    },
    get rollBaseStats() {
      return typeof rollBaseStats === "undefined" ? void 0 : rollBaseStats;
    },
    get isTenthStat() {
      return isTenthStat;
    },
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get rndChoice() {
      return rndChoice;
    },
    get chooseItemBase() {
      return chooseItemBase;
    },
    get UNIQUE_EQUIPMENT_RULES() {
      return UNIQUE_EQUIPMENT_RULES;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get RENAMED_UNIQUES() {
      return RENAMED_UNIQUES;
    },
    get ARM_GUARD_BASE_LEGACY_NAMES() {
      return ARM_GUARD_BASE_LEGACY_NAMES;
    },
    get WEAPON_BASE_LEGACY_NAMES() {
      return WEAPON_BASE_LEGACY_NAMES;
    },
    get normalizeArmGuardIdentity() {
      return normalizeArmGuardIdentity;
    },
    get migrateEquipmentBlockBases() {
      return migrateEquipmentBlockBases;
    },
    get getZone() {
      return getZone;
    },
    get MARKET_EXCHANGES() {
      return MARKET_EXCHANGES;
    },
    get pickSkillRuneReward() {
      return pickSkillRuneReward;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get contentProgression() {
      return contentProgression;
    },
    marketNow: () => Date.now(),
    get ORB_DB() {
      return ORB_DB;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get pickParticle() {
      return pickParticle;
    },
    get normalizeItem() {
      return normalizeItem;
    },
    get maybeApplyExceptionalBase() {
      return maybeApplyExceptionalBase;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    }
  });
  var effects = {
    marketGrantCurrency: (...args) => awardCurrency(...args),
    marketGrantGem: (...args) => gemDropRewards.grant(...args),
    marketStowItem: (...args) => stowBoughtItem(...args),
    marketAllocateItemId() {
      return ++window.GameModules.state.session.itemIdCounter;
    },
    marketCreateUnique: (...args) => generateUniqueItem(...args)
  };
  var tooltipDeps = {
    get _t() {
      return _t;
    },
    get getStatName() {
      return getStatName;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatSignedValue() {
      return formatSignedValue;
    },
    get getUniqueStatRollRange() {
      return getUniqueStatRollRange;
    },
    get formatValue() {
      return formatValue;
    },
    get getStyledOrbName() {
      return typeof getStyledOrbName === "undefined" ? void 0 : getStyledOrbName;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    baseRange: rules.getBlackMarketBaseRollRange,
    compareBase: rules.getBlackMarketBaseComparison
  };
  var isUniqueEligibleForBlackMarket = rules.isUniqueEligibleForBlackMarket;
  var isBaseEligibleForBlackMarket = rules.isBaseEligibleForBlackMarket;
  var rollBlackMarketExchangeOffer = rules.rollBlackMarketExchangeOffer;
  var normalizeBlackMarketState = (...args) => rules.normalizeBlackMarketState(game, ...args);
  var getBlackMarketLockCount = (...args) => rules.getBlackMarketLockCount(game, ...args);
  var getBlackMarketManualRefreshCost = (...args) => rules.getBlackMarketManualRefreshCost(game, ...args);
  var getBlackMarketSlotCount = (...args) => rules.getBlackMarketSlotCount(game, ...args);
  var createBlackMarketUniqueOffer = rules.createBlackMarketUniqueOffer;
  var buildBlackMarketOffer = (...args) => rules.buildBlackMarketOffer(game, ...args);
  var refreshBlackMarket = (...args) => rules.refreshBlackMarket(game, ...args);
  var lockBlackMarketOffer = (...args) => rules.lockBlackMarketOffer(game, ...args);
  var setBlackMarketPreferredSlot = (...args) => rules.setBlackMarketPreferredSlot(game, ...args);
  var payBlackMarketRefresh = (...args) => rules.payBlackMarketRefresh(game, ...args);
  var payBlackMarketExpansion = (...args) => rules.payBlackMarketExpansion(game, ...args);
  var getBlackMarketSlotExpandCost = (...args) => rules.getBlackMarketSlotExpandCost(game, ...args);
  var getBlackMarketOfferPrice = rules.getBlackMarketOfferPrice;
  var checkBlackMarketOffer = (...args) => rules.checkBlackMarketOffer(game, ...args);
  var getBlackMarketConfirmText = rules.getBlackMarketConfirmText;
  var sellBlackMarketOffer = (...args) => consumeDomainCommands(rules.sellBlackMarketOffer(game, ...args), effects);
  var getBlackMarketBaseItemShape = rules.getBlackMarketBaseItemShape;
  var getBlackMarketOfferSize = rules.getBlackMarketOfferSize;
  var placeBlackMarketOffers = rules.placeBlackMarketOffers;
  var getBlackMarketOfferTooltipHtml = (offer) => renderBlackMarketOfferTooltip(tooltipDeps, game, offer);
  var blackMarketShop = Object.freeze({
    shelf: BLACK_MARKET_SHELF,
    state: normalizeBlackMarketState,
    refresh: refreshBlackMarket,
    place: placeBlackMarketOffers,
    size: getBlackMarketOfferSize,
    price: getBlackMarketOfferPrice,
    check: checkBlackMarketOffer,
    confirmText: getBlackMarketConfirmText,
    buy: sellBlackMarketOffer,
    baseItem: getBlackMarketBaseItemShape,
    lock: lockBlackMarketOffer,
    track: setBlackMarketPreferredSlot,
    refreshCost: getBlackMarketManualRefreshCost,
    refreshNow: payBlackMarketRefresh,
    expandCost: getBlackMarketSlotExpandCost,
    expand: payBlackMarketExpansion,
    slotCount: getBlackMarketSlotCount,
    lockCount: getBlackMarketLockCount
  });
  safeExposeGlobals({
    isUniqueEligibleForBlackMarket,
    isBaseEligibleForBlackMarket,
    rollBlackMarketExchangeOffer,
    normalizeBlackMarketState,
    getBlackMarketLockCount,
    getBlackMarketManualRefreshCost,
    getBlackMarketSlotCount,
    createBlackMarketUniqueOffer,
    buildBlackMarketOffer,
    getBlackMarketOfferTooltipHtml,
    refreshBlackMarket,
    lockBlackMarketOffer,
    setBlackMarketPreferredSlot,
    payBlackMarketRefresh,
    payBlackMarketExpansion,
    getBlackMarketSlotExpandCost,
    getBlackMarketOfferPrice,
    checkBlackMarketOffer,
    getBlackMarketConfirmText,
    sellBlackMarketOffer,
    getBlackMarketBaseItemShape,
    getBlackMarketOfferSize,
    placeBlackMarketOffers,
    BLACK_MARKET_BASE_SLOT_COUNT,
    BLACK_MARKET_MAX_SLOT_COUNT,
    BLACK_MARKET_MAX_EXTRA_SLOTS,
    BLACK_MARKET_CHASE_UNIQUE_CHANCE,
    BLACK_MARKET_BASE_CRAFT_TIER,
    BLACK_MARKET_MAX_LOCKED_OFFERS,
    BLACK_MARKET_INSIGHT_TARGET,
    BLACK_MARKET_EQUIPMENT_SLOTS,
    BLACK_MARKET_SHELF,
    blackMarketShop
  });
})();
