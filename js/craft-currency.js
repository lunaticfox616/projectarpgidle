// GENERATED from modules/craft-currency*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/crafting-payment.mjs
  function craftingPayment(owner, action) {
    const have = owner.currencies[action] || 0;
    return { key: action, cost: 1, have, affordable: have >= 1 };
  }

  // modules/domain/craft-harvest.mjs
  function availableCraftHarvestModes(deps2, owner) {
    const modes = ["none", "fire", "cold", "light"];
    if (deps2.contentProgression.isUnlocked("advancedSpores", owner)) modes.push("chaos", "damage");
    return modes;
  }
  function craftHarvestBlockReason(deps2, owner, item, action, { mode, omen = null }) {
    if (["chaos", "damage"].includes(mode) && !availableCraftHarvestModes(deps2, owner).includes(mode)) {
      return "카오스, 피해 계열 수확 제작은 고급 수확 제작을 해금해야 쓸 수 있습니다.";
    }
    const reason = deps2.equipmentCrafting.getSporeBlockReason(item, action, mode);
    if (reason || mode === "none" || !deps2.equipmentCrafting.basicActions.includes(action)) return reason;
    return deps2.equipmentCrafting.sporePool(item, action, mode, omen).length ? "" : "선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다.";
  }
  function isCraftHarvestEquipment(deps2, item) {
    if (!item) return false;
    const slot = String(item.slot || "").replace(/[123]$/, "");
    return deps2.EQUIPMENT_DROP_SLOTS.includes(slot);
  }
  function craftHarvestPriceKey(deps2, mode) {
    return deps2.stumpBox.harvestPriceKey("any", deps2.STUMP_BOX_HARVEST_CRAFT.colors[mode]);
  }
  function hasCraftHarvestCost(deps2, owner, mode) {
    if (!mode || mode === "none" || !Object.hasOwn(deps2.STUMP_BOX_HARVEST_CRAFT.colors, mode)) return true;
    return deps2.stumpBox.harvestPriceHeld(owner, craftHarvestPriceKey(deps2, mode)) >= 1;
  }

  // modules/domain/craft-currency-admission.mjs
  var RELIC_ACTIONS = Object.freeze(["divine", "tainted", "blessing"]);
  var qualityFits = (slots) => (item) => slots.includes(String(item.slot || "")) && Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
  function createCurrencyFits(deps2) {
    return Object.freeze({
      ...Object.fromEntries(deps2.equipmentCrafting.basicActions.map((action) => [
        action,
        (item) => deps2.equipmentCrafting.basicFits(item, action)
      ])),
      divine: (item) => item.rarity !== "normal",
      chance: (item, owner) => item.rarity === "normal" && deps2.uniquePools(owner, item).normal.length > 0,
      scour: (item) => item.rarity !== "normal" && item.rarity !== "unique",
      tainted: (item) => !item.corrupted || deps2.isKaleidoscopeShieldItem(item) && deps2.getItemExplicitOptionCount(item) <= deps2.EXPLICIT_AFFIX_LINE_CAP,
      blessing: (item) => Array.isArray(item.baseStats) && item.baseStats.length > 0,
      annulment: (item) => deps2.getAnnulmentRemovableStats(item).length > 0,
      abyssCatalyst: (item) => Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0,
      deepWhetstone: qualityFits(["무기"]),
      rootIron: qualityFits(["투구", "갑옷", "방패", "장갑", "신발", "허리띠"]),
      jewelPolish: qualityFits(["목걸이", "반지"])
    });
  }
  function currencyBlockReason(env, owner, item, action) {
    const locked = env.deps.equipmentCrafting.buildLockReason(owner);
    if (locked) return locked;
    const waiting = env.deps.equipmentCrafting.choiceWaitReason(owner);
    if (waiting) return waiting;
    if (item.corrupted && action !== "tainted") return "타락한 아이템은 더 이상 제작할 수 없습니다.";
    if (item.fusedRelic && !RELIC_ACTIONS.includes(action)) return "융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.";
    return Object.hasOwn(env.fits, action) && env.fits[action](item, owner) ? "" : "지금 선택한 아이템에는 사용할 수 없습니다.";
  }
  function sporeMode(deps2, owner, item, currencyKey) {
    owner.sporeCraftModes = owner.sporeCraftModes || {};
    return isCraftHarvestEquipment(deps2, item) ? owner.sporeCraftModes[currencyKey] || "none" : "none";
  }
  function sporeReason(deps2, owner, item, action, { mode, guaranteedMod }) {
    const blocked = craftHarvestBlockReason(deps2, owner, item, action, { mode });
    if (blocked || mode === "none" || !deps2.equipmentCrafting.basicActions.includes(action)) return blocked;
    if (!guaranteedMod) return deps2.equipmentCrafting.rerollActions.includes(action) ? "이 장비에는 선택한 수확 계열로 출현 가능한 옵션이 없어 제작할 수 없습니다." : "선택한 수확 계열에서 새로 부여할 수 있는 옵션이 없습니다. 수확 제작을 사용 안 함으로 바꾸거나 해당 계열의 기존 옵션을 제거하세요.";
    return hasCraftHarvestCost(deps2, owner, mode) ? "" : "식물이 없어 제작을 시작하지 않았습니다.";
  }
  function planCurrencyCraft(deps2, owner, item, currencyKey, action) {
    const mode = sporeMode(deps2, owner, item, currencyKey);
    const spore = deps2.equipmentCrafting.basicActions.includes(action) ? mode : "none";
    const sideBlock = deps2.equipmentCrafting.armedSideReason(owner, item, action, spore);
    if (sideBlock) return { reason: sideBlock };
    const omen = deps2.equipmentCrafting.omenFor(owner, action, item, mode);
    const guaranteedMod = spore === "none" ? null : deps2.equipmentCrafting.pickSporeMod(item, action, spore, omen);
    const reason = sporeReason(deps2, owner, item, action, { mode, guaranteedMod });
    if (reason) return { reason };
    const addedMod = action === "exalted" ? guaranteedMod || deps2.equipmentCrafting.pickAddMod(item, omen) : null;
    return action === "exalted" && !addedMod ? { reason: deps2._t("이 장비에 추가로 부여할 수 있는 옵션이 없습니다.") } : { spore, guaranteedMod, omen, addedMod };
  }
  function currencyAddonReason(deps2, owner, item, action, mode) {
    return deps2.equipmentCrafting.armedSideReason(owner, item, action, mode) || craftHarvestBlockReason(
      deps2,
      owner,
      item,
      action,
      { mode, omen: deps2.equipmentCrafting.omenFor(owner, action, item, mode) }
    );
  }

  // modules/domain/craft-currency-effects.mjs
  var FAIRY_RING_KEPT_FIELDS = Object.freeze(["id", "instanceId", "loopSealed", "locked", "tradeLocked", "hallRelistBlocked"]);
  function raiseQuality(deps2, owner, item, run) {
    item.quality = Math.max(0, Math.min(20, Math.floor(item.quality || 0) + 1));
    run.logs.push([deps2._t("🛠️ 장비 퀄리티 +1% (현재 {quality}%)", { quality: item.quality }), "loot-magic"]);
  }
  function rerollAbyssAmp(deps2, item) {
    const p = item.uniqueEffectParams;
    const ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
    const ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
    p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
    item.uniqueEffectParams = p;
    const socketCount = Array.isArray(item.abyssSockets) ? item.abyssSockets.length : Math.max(1, Math.floor(Number(p.socketsMin || 1)));
    item.uniqueEffect = deps2._t("심연 주얼 슬롯 ({socketCount})개, 장착 심연 주얼 효과 +{ampPct}%", { socketCount, ampPct: p.ampPct });
  }
  function rerollValues(deps2, owner, item, run) {
    const onSide = (stat) => deps2.equipmentCrafting.onOmenSide(item, stat, run.omen);
    item.stats.forEach((stat) => {
      if (!stat.lockedByHoney && !stat.lockedByRift && onSide(stat)) deps2.rerollStoredAffixValue(stat);
    });
    const infusion = item.chaosInfusion;
    if (infusion && onSide(infusion) && Number.isFinite(Number(infusion.valMin)) && Number.isFinite(Number(infusion.valMax))) deps2.rerollStoredAffixValue(infusion);
    if (!run.omen && item.uniqueEffectKey === "abyssSocketAndJewelAmp" && item.uniqueEffectParams) rerollAbyssAmp(deps2, item);
  }
  function jewelsBack(deps2, jewels) {
    return jewels ? deps2._t(" 끼운 주얼 {jewels}개는 가방으로 돌아왔습니다.", { jewels }) : "";
  }
  function fairyRing(deps2, owner, item, run) {
    if (Math.random() < 0.25) {
      run.logs.push([deps2._t(
        "💥 요정의 고리: 아이템이 파괴되었습니다.{item}",
        { item: jewelsBack(deps2, deps2.destroyItem(owner, item)) }
      ), "attack-monster"]);
      return true;
    }
    const pools = deps2.uniquePools(owner, item);
    const pool = pools.chase.length && Math.random() < deps2.getChaseUniqueChance(deps2.getZone(owner.currentZoneId) || {}) ? pools.chase : pools.normal;
    const unique = pool.length ? deps2.createUnique(owner, pools.tier, item.slot, deps2.rndChoice(pool).name) : null;
    if (!unique) {
      run.logs.push([deps2._t("승급할 수 있는 고유가 없습니다."), "attack-monster"]);
      return false;
    }
    const kept = Object.fromEntries(FAIRY_RING_KEPT_FIELDS.filter((key) => Object.hasOwn(item, key)).map((key) => [key, item[key]]));
    const jewels = deps2.equipmentSockets.returnJewels(item, owner);
    Object.keys(item).forEach((key) => delete item[key]);
    Object.assign(item, unique, kept);
    run.logs.push([deps2._t(
      "🌟 요정의 고리: [{name}] 고유로 진화했습니다.{jewels}",
      { name: deps2._t(item.name), jewels: jewelsBack(deps2, jewels) }
    ), "loot-unique"]);
    return true;
  }
  function annul(deps2, owner, item, run) {
    const candidates = deps2.getAnnulmentRemovableStats(item).filter((row) => deps2.equipmentCrafting.onOmenSide(item, row.stat, run.omen));
    const picked = deps2.equipmentCrafting.pickPruneLine(candidates, run.omen);
    const removed = item.stats.splice(picked.index, 1)[0];
    deps2.updateItemName(item);
    run.logs.push([deps2._t("🕳️ 전정 가위: {value} 옵션 제거", { value: deps2._t(removed.statName || deps2.getStatName(removed.id)) }), "loot-unique"]);
  }
  function scour(deps2, owner, item, run) {
    const sideOnly = run.omen && run.omen.effect === "side";
    const onSide = (stat) => deps2.equipmentCrafting.onOmenSide(item, stat, run.omen);
    item.stats = (item.stats || []).filter((stat) => stat && (stat.lockedByHoney || stat.lockedByRift || !onSide(stat)));
    if (item.chaosInfusion && onSide(item.chaosInfusion)) item.chaosInfusion = null;
    const remaining = deps2.getItemExplicitOptionCount(item) > 0;
    item.rarity = remaining ? sideOnly ? item.rarity : "magic" : "normal";
    deps2.updateItemName(item);
  }
  function taint(deps2, owner, item, run) {
    const outcome = deps2.corruptCraftedItem(item);
    run.token.meta.outcome = outcome.text;
    run.logs.push([deps2._t("🩸 타락: {text}", { text: outcome.text }), outcome.kind === "nothing" ? "attack-monster" : "loot-unique", { toast: true }]);
  }
  function catalyse(deps2, owner, item, run) {
    const label = deps2.applyAbyssCatalystToItemQuality(item);
    run.logs.push([deps2._t("🧪 심연 촉매: [{name}] 퀄리티 속성 → {label}", { name: deps2._t(item.name), label }), "loot-unique"]);
  }
  function blessRange(stat) {
    let low = Number.isFinite(Number(stat.baseRollMin)) ? Number(stat.baseRollMin) : Number(stat.valMin);
    let high = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax) : Number(stat.valMax);
    if (!Number.isFinite(low) || !Number.isFinite(high)) {
      const fallback = Number.isFinite(Number(stat.val)) ? Number(stat.val) : Number(stat.base || 0);
      low = fallback;
      high = fallback;
    }
    return high < low ? [high, low] : [low, high];
  }
  function blessBaseStat(deps2, stat) {
    let [low, high] = blessRange(stat);
    if (deps2.isTenthStat(stat.id)) {
      const minStep = Math.round(low * 10), maxStep = Math.round(high * 10);
      stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
      low = minStep / 10;
      high = maxStep / 10;
    } else {
      low = Math.floor(low);
      high = Math.floor(high);
      if (high > 0) low = Math.max(1, low);
      stat.val = low + Math.floor(Math.random() * (high - low + 1));
    }
    Object.assign(stat, { baseRollMin: low, baseRollMax: high, valMin: low, valMax: high });
  }
  function bless(deps2, owner, item) {
    (item.baseStats || []).forEach((stat) => blessBaseStat(deps2, stat));
    if (typeof deps2.colonyWards === "object") deps2.colonyWards.rerollBelt(item);
  }
  var EFFECTS = Object.freeze({
    deepWhetstone: raiseQuality,
    rootIron: raiseQuality,
    jewelPolish: raiseQuality,
    divine: rerollValues,
    chance: fairyRing,
    annulment: annul,
    scour,
    tainted: taint,
    abyssCatalyst: catalyse,
    blessing: bless
  });
  function applyCurrencyCraft(deps2, owner, item, action, run) {
    if (!deps2.equipmentCrafting.basicActions.includes(action)) return EFFECTS[action](deps2, owner, item, run);
    const guaranteedFor = (copy) => run.guaranteedMod ? deps2.equipmentCrafting.rollSporeLine(
      copy,
      deps2.equipmentCrafting.pickSporeMod(copy, action, run.spore, run.omen) || run.guaranteedMod,
      run.omen
    ) : null;
    deps2.equipmentCrafting.craftBasic(owner, item, action, {
      addedMod: run.addedMod,
      guaranteedStat: deps2.equipmentCrafting.rollSporeLine(item, run.guaranteedMod, run.omen),
      guaranteedFor,
      omen: run.omen
    });
    return true;
  }

  // modules/domain/craft-currency.mjs
  function useCurrency(env, owner, currencyKey, item) {
    const deps2 = env.deps;
    if (!item) return { reason: deps2._t("먼저 아이템을 선택하세요.") };
    const payment = craftingPayment(owner, currencyKey);
    if (!Object.hasOwn(deps2.ORB_DB, currencyKey) || !payment || !payment.affordable) {
      return { reason: deps2._t("제작 재화가 부족하거나 사용할 수 없는 제작 방식입니다.") };
    }
    const action = deps2.equipmentCrafting.resolveAction(currencyKey, item.rarity);
    const block = currencyBlockReason(env, owner, item, action);
    if (block) return { reason: block };
    const run = planCurrencyCraft(deps2, owner, item, currencyKey, action);
    if (run.reason) return { reason: run.reason };
    run.token = deps2.craftingResultLedger.begin(item, { currencyKey, actionKey: action });
    run.logs = [];
    if (run.spore !== "none") deps2.stumpBox.payHarvestPrice(owner, craftHarvestPriceKey(deps2, run.spore));
    owner.currencies[payment.key] -= payment.cost;
    if (applyCurrencyCraft(deps2, owner, item, action, run) === false) return { ok: false, logs: run.logs };
    return finishCurrencyCraft(deps2, owner, item, payment, run);
  }
  function finishCurrencyCraft(deps2, owner, item, payment, run) {
    const note = (run.spore !== "none" && run.guaranteedMod ? deps2._t(", 수확 보장: {statName}", { statName: run.guaranteedMod.statName }) : "") + deps2.equipmentCrafting.spendOmen(owner, run.omen);
    deps2.craftingResultLedger.commit(run.token, item);
    run.logs.push([deps2._t("⚒️ {name} 사용{note}", { name: deps2._t(deps2.ORB_DB[payment.key].name), note }), "loot-magic"]);
    return { ok: true, logs: run.logs };
  }
  function createCraftCurrencyUse(deps2) {
    const env = { deps: deps2, fits: createCurrencyFits(deps2) };
    return Object.freeze({
      use: (owner, currencyKey, item) => useCurrency(env, owner, currencyKey, item),
      blockReason: (owner, item, action) => currencyBlockReason(env, owner, item, action),
      addonReason: (owner, item, action, mode) => currencyAddonReason(deps2, owner, item, action, mode)
    });
  }

  // modules/craft-currency-classic.mjs
  var deps = {
    get _t() {
      return _t;
    },
    get equipmentCrafting() {
      return equipmentCrafting;
    },
    get EXPLICIT_AFFIX_LINE_CAP() {
      return EXPLICIT_AFFIX_LINE_CAP;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get EQUIPMENT_DROP_SLOTS() {
      return EQUIPMENT_DROP_SLOTS;
    },
    get STUMP_BOX_HARVEST_CRAFT() {
      return STUMP_BOX_HARVEST_CRAFT;
    },
    get contentProgression() {
      return contentProgression;
    },
    get stumpBox() {
      return stumpBox;
    },
    get equipmentSockets() {
      return equipmentSockets;
    },
    get craftingResultLedger() {
      return craftingResultLedger;
    },
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get isKaleidoscopeShieldItem() {
      return isKaleidoscopeShieldItem;
    },
    get getItemExplicitOptionCount() {
      return getItemExplicitOptionCount;
    },
    get getAnnulmentRemovableStats() {
      return getAnnulmentRemovableStats;
    },
    get rerollStoredAffixValue() {
      return rerollStoredAffixValue;
    },
    get getChaseUniqueChance() {
      return getChaseUniqueChance;
    },
    get getZone() {
      return getZone;
    },
    get rndChoice() {
      return rndChoice;
    },
    get updateItemName() {
      return updateItemName;
    },
    get getStatName() {
      return getStatName;
    },
    get corruptCraftedItem() {
      return corruptCraftedItem;
    },
    get applyAbyssCatalystToItemQuality() {
      return applyAbyssCatalystToItemQuality;
    },
    get isTenthStat() {
      return isTenthStat;
    },
    uniquePools: (owner, item) => getFairyRingUniquePools(item, getZone(owner.currentZoneId) || {}, owner),
    createUnique: (owner, tier, slot, name) => generateUniqueItem(tier, slot, name, getZone(owner.currentZoneId) || {}, owner),
    destroyItem: (owner, item) => destroySelectedCraftItem(item, owner)
  };
  var rules = createCraftCurrencyUse(deps);
  var craftCurrencyUse = Object.freeze({
    use: (currencyKey) => rules.use(game, currencyKey, getSelectedCraftItem()),
    blockReason: (item, action) => rules.blockReason(game, item, action),
    addonReason: (item, action, mode) => rules.addonReason(game, item, action, mode)
  });
  var getAvailableSporeCraftModes = () => availableCraftHarvestModes(deps, game);
  var getSporeCraftBlockReason = (item, action, mode, omen = null) => craftHarvestBlockReason(deps, game, item, action, { mode, omen });
  var isSporeCraftEquipment = (item) => isCraftHarvestEquipment(deps, item);
  var getSporeCraftPriceKey = (mode) => craftHarvestPriceKey(deps, mode);
  var hasSporeCraftCost = (mode) => hasCraftHarvestCost(deps, game, mode);
  safeExposeGlobals({
    craftCurrencyUse,
    getAvailableSporeCraftModes,
    getSporeCraftBlockReason,
    isSporeCraftEquipment,
    getSporeCraftPriceKey,
    hasSporeCraftCost
  });
})();
