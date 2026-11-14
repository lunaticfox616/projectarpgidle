// GENERATED from modules/npc-shop*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/npc-shops.mjs
  var NPC_SHOPS = Object.freeze({
    haken: Object.freeze({ kind: "gem", label: "스킬룬", count: 10, firstMeetingClosed: true }),
    orga: Object.freeze({ kind: "gear", label: "무기", slots: Object.freeze(["무기"]), count: 8 }),
    bern: Object.freeze({ kind: "gear", label: "방어구", slots: Object.freeze(["투구", "갑옷", "장갑", "신발", "방패"]), count: 8 }),
    ivel: Object.freeze({ kind: "gear", label: "장신구", slots: Object.freeze(["반지", "목걸이", "허리띠"]), count: 10 }),
    veila: Object.freeze({ kind: "unique", label: "고유 장비", count: 4 })
  });

  // modules/domain/npc-shop-rolls.mjs
  function npcTradeWeighShopMods(env, pool) {
    return pool.map((mod) => env.deps.getAffixTags(mod).includes("resistance") ? { ...mod, weight: (Number(mod.weight) || 1) * env.RESISTANCE_WEIGHT } : mod);
  }
  function npcTradePickShopSome(list, count) {
    const pool = list.slice(), picked = [];
    while (pool.length && picked.length < count) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    return picked;
  }
  function npcTradePickShopWeighted(list, count, weightOf) {
    return list.map((entry) => ({ entry, key: Math.pow(Math.random(), 1 / Math.max(1e-3, weightOf(entry))) })).sort((a, b) => b.key - a.key).slice(0, count).map((row) => row.entry);
  }
  function npcTradeRollGearWares(env, shop, zone) {
    return Array.from({ length: shop.count }, () => npcTradeRollGearPiece(env, env.deps.rndChoice(shop.slots), zone)).filter(Boolean).map((item) => ({ item, ...npcTradeGearWarePrice(env, item) }));
  }
  function npcTradeRollGearPiece(env, slot, zone) {
    const dice = Math.random(), minimumRarity = dice < env.RARITY.rare ? "rare" : dice < env.RARITY.rare + env.RARITY.magic ? "magic" : null;
    for (let tries = 0; tries < 6; tries++) {
      const item = env.deps.generateEquipmentDrop({}, { zone, slot, minimumRarity, weigh: (...args) => npcTradeWeighShopMods(env, ...args) });
      if (item && item.rarity !== "unique") return item;
    }
    return null;
  }
  function npcTradeGearWarePrice(env, item) {
    const tier = Math.max(1, env.deps.getItemCraftTier(item));
    if (item.rarity === "rare") return { priceKey: "formlessDew", price: env.PRICE.rare + Math.floor(tier / env.PRICE.rareTierStep) };
    return { priceKey: "magicBud", price: env.PRICE[item.rarity === "magic" ? "magic" : "normal"] + Math.floor(tier / env.PRICE.tierStep) };
  }
  function npcTradeRollUniqueWares(env, count, tier) {
    const pool = env.deps.UNIQUE_DB.filter((unique) => env.deps.isUniqueEligibleForBlackMarket(unique) && !unique.ultraRare && (unique.reqTier || 1) <= tier + 2);
    return npcTradePickShopSome(pool, count).map((unique) => {
      const offer = env.deps.createBlackMarketUniqueOffer(unique, tier);
      const item = env.deps.generateUniqueItem(offer.reqTier, offer.slot, offer.name);
      return item && { item, priceKey: "goldenRule", price: offer.price };
    }).filter(Boolean);
  }
  function npcTradeRollGemWares(env, owner, count) {
    const runes = env.deps.gemDropRewards.attackRunes(), weights = env.deps.getSkillRuneRewardWeights(runes);
    const attacks = runes.map((name) => ({ kind: "attack", name, awakened: false }));
    const supports = env.deps.contentProgression.isUnlocked("support", owner) ? Object.keys(env.deps.SUPPORT_GEM_DB).map((name) => env.deps.gemDropRewards.nextSupport(owner, name)).filter(Boolean) : [];
    const average = [...weights.values()].reduce((sum, weight) => sum + weight, 0) / runes.length;
    const weightOf = (gem) => gem.kind === "attack" ? weights.get(gem.name) : average;
    return npcTradePickShopWeighted([...attacks, ...supports], count, weightOf).map((gem) => ({
      gem,
      priceKey: "formlessDew",
      price: gem.kind === "support" ? env.PRICE.supportGem + gem.tier : env.PRICE.attackGem
    }));
  }

  // modules/domain/npc-shop-layout.mjs
  function npcTradePackShopWares(env, wares) {
    const taken = /* @__PURE__ */ new Set(), offers = [];
    const sized = wares.map((ware) => ({ ware, size: ware.item ? env.deps.getEquipmentInventoryFootprint(ware.item) : { columns: 1, rows: 1 } })).sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
    for (const { ware, size } of sized) {
      const at = npcTradeFirstFreeShopPlace(env, taken, size);
      if (!at) continue;
      npcTradeShopWareCells(at, size).forEach((cell) => taken.add(cell));
      offers.push({ ...ware, column: at.column, row: at.row, columns: size.columns, rows: size.rows });
    }
    return offers;
  }
  function npcTradeShopWareCells(at, size) {
    const cells = [];
    for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
    return cells;
  }
  function npcTradeFirstFreeShopPlace(env, taken, size) {
    for (let row = 0; row + size.rows <= env.GRID.rows; row++) {
      for (let column = 0; column + size.columns <= env.GRID.columns; column++) {
        if (!npcTradeShopWareCells({ column, row }, size).some((cell) => taken.has(cell))) return { column, row };
      }
    }
    return null;
  }

  // modules/domain/npc-shop-stock.mjs
  function* npcTradeMeetShopNpc(env, owner, npc, zoneId) {
    const shop = NPC_SHOPS[npc.id];
    if (!shop) return null;
    const before = owner.npcMet[npc.id] || { count: 0 };
    owner.npcMet[npc.id] = { count: before.count + 1, loop: owner.season || 1, zoneId, tone: npc.tone || "gold" };
    owner.unlocks.npcs = true;
    const first = before.count === 0 && (owner.season || 1) === 1;
    if (!npcTradeAllRunesOpen(env, owner, npc.id) && !(shop.firstMeetingClosed && first)) {
      owner.npcShops[npc.id] = npcTradeRollShopStock(env, owner, npc.id, zoneId);
      yield { kind: "npcNotify", args: ["npc-shop-stocked", { id: npc.id }] };
    }
    return owner.npcMet[npc.id];
  }
  function npcTradeAllRunesOpen(env, owner, id = env.ALL_RUNES.npc) {
    return id === env.ALL_RUNES.npc && !!owner.npcMet[id] && (owner.maxZoneId || 0) >= env.ALL_RUNES.act;
  }
  function npcTradeAllRunesMark(env, owner) {
    return env.deps.contentProgression.isUnlocked("support", owner) ? "full-roots" : "attacks-roots";
  }
  function npcTradeRollAllRunes(env, owner) {
    const runes = env.deps.gemDropRewards.attackRunes(), weights = env.deps.getSkillRuneRewardWeights(runes);
    const attacks = runes.sort((a, b) => weights.get(b) - weights.get(a)).map((name) => ({ kind: "attack", name, awakened: false }));
    const supports = env.deps.contentProgression.isUnlocked("support", owner) ? Object.keys(env.deps.SUPPORT_GEM_DB).map((name) => env.deps.gemDropRewards.nextSupport(owner, name)).filter(Boolean) : [];
    const offers = [...attacks, ...supports].map((gem) => ({ gem, priceKey: npcTradeAllRunePriceKey(env, gem), price: 1, columns: 1, rows: 1 }));
    return { loop: owner.season || 1, zoneId: owner.currentZoneId, offers, allRunes: npcTradeAllRunesMark(env, owner) };
  }
  function npcTradeAllRunePriceKey(env, gem) {
    if (gem.kind === "support") return env.deps.stumpBox.harvestPriceKey(Object.keys(env.deps.SUPPORT_GEM_DB).indexOf(gem.name) % 2 ? "vine" : "root");
    const def = env.deps.SKILL_DB[gem.name];
    if (env.deps.isMobilityRuneName(gem.name) || (def.tags || []).includes("summon")) return env.deps.stumpBox.harvestPriceKey("fruit");
    return env.deps.stumpBox.harvestPriceKey("flower", env.ELEMENT_FLOWER[def.ele]);
  }
  function* npcTradeSyncAllRunes(env, owner) {
    if (!npcTradeAllRunesOpen(env, owner)) return;
    const shop = owner.npcShops[env.ALL_RUNES.npc], current = shop && shop.loop === (owner.season || 1);
    if (current && shop.allRunes === npcTradeAllRunesMark(env, owner)) return;
    const first = !(current && shop.allRunes);
    owner.npcShops[env.ALL_RUNES.npc] = npcTradeRollAllRunes(env, owner);
    yield { kind: "npcNotify", args: ["npc-shop-stocked", { id: env.ALL_RUNES.npc }] };
    if (first) yield { kind: "npcNotify", args: ["npc-shop-all-runes", { id: env.ALL_RUNES.npc }] };
  }
  function npcTradeRollShopStock(env, owner, id, zoneId) {
    const shop = NPC_SHOPS[id], zone = env.deps.getZone(zoneId) || env.deps.getZone(0), tier = Math.max(1, Math.floor(Number(zone.tier) || 1));
    const wares = shop.kind === "gem" ? npcTradeRollGemWares(env, owner, shop.count) : shop.kind === "unique" ? npcTradeRollUniqueWares(env, shop.count, tier) : npcTradeRollGearWares(env, shop, zone);
    return { loop: owner.season || 1, zoneId, offers: npcTradePackShopWares(env, wares) };
  }
  function* npcTradeShopStock(env, owner, id) {
    if (id === env.ALL_RUNES.npc) yield* npcTradeSyncAllRunes(env, owner);
    const shop = owner.npcShops[id];
    return shop && shop.loop === (owner.season || 1) && Array.isArray(shop.offers) ? shop : null;
  }

  // modules/domain/npc-shop-purchase.mjs
  function npcTradePriceIsHarvest(env, key) {
    return env.deps.stumpBox.isHarvestPrice(key);
  }
  function npcTradeCurrencyName(env, key) {
    return npcTradePriceIsHarvest(env, key) ? env.deps.stumpBox.harvestPriceName(key) : env.deps.ORB_DB[key] ? env.deps._t(env.deps.ORB_DB[key].name) : key;
  }
  function npcTradePriceHeld(env, owner, key) {
    return npcTradePriceIsHarvest(env, key) ? env.deps.stumpBox.harvestPriceHeld(owner, key) : Math.floor(Number(owner.currencies[key]) || 0);
  }
  function npcTradePayShopPrice(env, owner, { priceKey, price }) {
    if (npcTradePriceIsHarvest(env, priceKey)) env.deps.stumpBox.payHarvestPrice(owner, priceKey);
    else owner.currencies[priceKey] -= price;
  }
  function* npcTradeCheckShopWare(env, owner, id, index, place) {
    if (owner.woodsmanBuildLock) return { ok: false, reason: env.deps._t("☠️ 나무꾼 전투 중에는 살 수 없습니다.") };
    const offer = (yield* npcTradeShopStock(env, owner, id))?.offers[index];
    if (!offer) return { ok: false, reason: env.deps._t("이미 팔린 물건입니다.") };
    const have = npcTradePriceHeld(env, owner, offer.priceKey);
    if (have < offer.price) return { ok: false, reason: env.deps._t("{priceKey} 부족, {have}/{price}", { priceKey: npcTradeCurrencyName(env, offer.priceKey), have, price: offer.price }) };
    if (offer.gem) return npcTradeCheckGemWare(env, owner, offer.gem);
    if (place) {
      const fit = env.deps.equipmentInventoryGridRuntime.canAdd(offer.item, place.column, place.row, owner);
      return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
    }
    return env.deps.canStoreEquipmentItems([offer.item], owner) ? { ok: true } : { ok: false, reason: env.deps._t("가방에 빈칸이 없습니다.") };
  }
  function npcTradeCheckGemWare(env, owner, gem) {
    if (gem.kind === "attack") return { ok: true };
    const next = env.deps.gemDropRewards.nextSupport(owner, gem.name);
    return next && next.tier === gem.tier ? { ok: true } : { ok: false, reason: env.deps._t("이미 가진 룬입니다.") };
  }
  function* npcTradeShelfChangedReason(env, owner, id, index, seen) {
    return seen && (yield* npcTradeShopStock(env, owner, id))?.offers[index] !== seen ? env.SHELF_CHANGED : "";
  }
  function* npcTradeSellShopWare(env, owner, id, index, { place = null, resonanceCap = 0, seen } = {}) {
    const moved = yield* npcTradeShelfChangedReason(env, owner, id, index, seen);
    if (moved) return { ok: false, reason: moved };
    const result = yield* npcTradeCheckShopWare(env, owner, id, index, place);
    if (!result.ok) return result;
    const shop = yield* npcTradeShopStock(env, owner, id), offer = shop.offers[index];
    if (offer.gem) yield { kind: "npcGrantGem", args: [owner, offer.gem, offer.gem.kind === "support" ? resonanceCap : 0] };
    else if (!(yield* npcTradeStowShopItem(env, offer.item, place))) return { ok: false, reason: env.deps._t("가방에 넣지 못했습니다.") };
    npcTradePayShopPrice(env, owner, offer);
    npcTradeRefillSoldShelfCell(env, owner, shop, index, offer);
    return { ok: true, offer };
  }
  function npcTradeRefillSoldShelfCell(env, owner, shop, index, offer) {
    if (offer.gem?.kind === "attack") return;
    const next = shop.allRunes && offer.gem?.kind === "support" ? env.deps.gemDropRewards.nextSupport(owner, offer.gem.name) : null;
    if (next) shop.offers[index] = { ...offer, gem: next };
    else shop.offers.splice(index, 1);
  }
  function* npcTradeStowShopItem(env, item, place) {
    item.id = yield { kind: "npcAllocateItemId", args: [] };
    delete item.instanceId;
    return yield { kind: "npcStowItem", args: [item, place] };
  }
  function* npcTradeReadyShopWares(env, owner, id) {
    const spent = {}, stock = yield* npcTradeShopStock(env, owner, id);
    const fits = (ware) => {
      const left = npcTradePriceHeld(env, owner, ware.priceKey) - (spent[ware.priceKey] || 0);
      if (left < ware.price) return false;
      spent[ware.priceKey] = (spent[ware.priceKey] || 0) + ware.price;
      return true;
    };
    if (!stock) return 0;
    const available = [], offers = stock.offers, length = offers.length;
    for (let index = 0; index < length; index++) {
      if (!(index in offers)) continue;
      const ware = offers[index];
      if ((yield* npcTradeCheckShopWare(env, owner, id, index, null)).ok) available.push(ware);
    }
    return available.sort((a, b) => a.price - b.price).filter(fits).length;
  }

  // modules/domain/npc-shop.mjs
  function createNpcShop(deps) {
    const env = { deps };
    env.GRID = Object.freeze({ columns: 10, rows: 7 });
    env.RARITY = Object.freeze({ rare: 0.25, magic: 0.5 });
    env.PRICE = Object.freeze({ normal: 1, magic: 2, rare: 1, tierStep: 4, rareTierStep: 6, attackGem: 3, supportGem: 1 });
    env.RESISTANCE_WEIGHT = 1.5;
    env.ALL_RUNES = Object.freeze({ npc: "haken", act: 5 });
    env.ELEMENT_FLOWER = Object.freeze({ phys: "physical", fire: "fire", cold: "cold", light: "lightning", chaos: "chaos" });
    env.SHELF_CHANGED = "진열이 바뀌었습니다. 새 물건을 다시 확인하세요.";
    return Object.freeze({
      grid: env.GRID,
      allRunesAct: env.ALL_RUNES.act,
      syncAllRunes: (...args) => npcTradeSyncAllRunes(env, ...args),
      meet: (...args) => npcTradeMeetShopNpc(env, ...args),
      stock: (...args) => npcTradeShopStock(env, ...args),
      check: (...args) => npcTradeCheckShopWare(env, ...args),
      buy: (...args) => npcTradeSellShopWare(env, ...args),
      ready: (...args) => npcTradeReadyShopWares(env, ...args),
      currencyName: (...args) => npcTradeCurrencyName(env, ...args),
      shelfChanged: env.SHELF_CHANGED
    });
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects2) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects2[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/npc-shop-classic.mjs
  var rules = createNpcShop({
    get contentProgression() {
      return contentProgression;
    },
    get gemDropRewards() {
      return gemDropRewards;
    },
    get getSkillRuneRewardWeights() {
      return getSkillRuneRewardWeights;
    },
    get SUPPORT_GEM_DB() {
      return SUPPORT_GEM_DB;
    },
    get stumpBox() {
      return stumpBox;
    },
    get SKILL_DB() {
      return SKILL_DB;
    },
    get isMobilityRuneName() {
      return isMobilityRuneName;
    },
    get getZone() {
      return getZone;
    },
    get getAffixTags() {
      return getAffixTags;
    },
    get rndChoice() {
      return rndChoice;
    },
    get generateEquipmentDrop() {
      return generateEquipmentDrop;
    },
    get getItemCraftTier() {
      return getItemCraftTier;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get isUniqueEligibleForBlackMarket() {
      return isUniqueEligibleForBlackMarket;
    },
    get createBlackMarketUniqueOffer() {
      return createBlackMarketUniqueOffer;
    },
    get generateUniqueItem() {
      return generateUniqueItem;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get _t() {
      return _t;
    },
    get canStoreEquipmentItems() {
      return canStoreEquipmentItems;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    }
  });
  var effects = {
    npcNotify: (...args) => dispatchRuntimeEvent(...args),
    npcGrantGem: (...args) => gemDropRewards.grant(...args),
    npcStowItem: (...args) => stowBoughtItem(...args),
    npcAllocateItemId() {
      return ++window.GameModules.state.session.itemIdCounter;
    }
  };
  var npcShop = Object.freeze({
    grid: rules.grid,
    allRunesAct: rules.allRunesAct,
    syncAllRunes: (...args) => consumeDomainCommands(rules.syncAllRunes(game, ...args), effects),
    meet: (...args) => consumeDomainCommands(rules.meet(game, ...args), effects),
    stock: (...args) => consumeDomainCommands(rules.stock(game, ...args), effects),
    check: (...args) => consumeDomainCommands(rules.check(game, ...args), effects),
    buy: (...args) => consumeDomainCommands(rules.buy(game, ...args), effects),
    ready: (...args) => consumeDomainCommands(rules.ready(game, ...args), effects),
    currencyName: rules.currencyName,
    shelfChanged: rules.shelfChanged
  });
  safeExposeGlobals({ NPC_SHOPS, npcShop });
})();
