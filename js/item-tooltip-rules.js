// GENERATED from modules/item-tooltip-rules*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/item-tooltip-calculations.mjs
  function itemTooltipStatOrder(env, statId) {
    const key = String(statId || "").toLowerCase();
    const index = env.STAT_GROUPS.findIndex(([names, parts]) => names.includes(key) || parts.some((part) => key.includes(part)));
    return index < 0 ? 99 : index + 1;
  }
  function itemTooltipCompareStats(env, a, b) {
    const aKey = a && (a.id || a.stat), bKey = b && (b.id || b.stat);
    return itemTooltipStatOrder(env, aKey) - itemTooltipStatOrder(env, bKey) || String(aKey || "").localeCompare(String(bKey || ""));
  }
  function itemTooltipDefenseTable() {
    return { armor: 0, evasion: 0, energyShield: 0 };
  }
  function itemTooltipDefenseSources(env, item) {
    const lines = (Array.isArray(item.stats) ? item.stats : []).concat(item.chaosInfusion ? [item.chaosInfusion] : [], env.deps.getImmutableItemSpecialStats(item));
    return lines.filter(Boolean).flatMap((stat) => [stat].concat(Array.isArray(stat.extraStats) ? stat.extraStats : [])).filter(Boolean);
  }
  function itemTooltipDefenseView(env, item) {
    const base = itemTooltipDefenseTable(), flat = itemTooltipDefenseTable(), pct = itemTooltipDefenseTable(), implicit = env.deps.getUniqueImplicitMultiplier(item);
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach((stat) => {
      if (stat && Object.hasOwn(base, stat.id)) base[stat.id] += Number(stat.val || 0) * implicit;
    });
    itemTooltipDefenseSources(env, item).forEach((stat) => {
      if (Object.hasOwn(flat, stat.id)) flat[stat.id] += Number(stat.val || 0);
      if (Object.hasOwn(env.DEFENSE_PCT, stat.id)) pct[env.DEFENSE_PCT[stat.id]] += Number(stat.val || 0);
    });
    const view = Object.fromEntries(env.DEFENSE_IDS.map((id) => [id, Math.floor((base[id] + flat[id]) * (1 + pct[id] / 100))]));
    return { ...view, base };
  }

  // modules/domain/item-tooltip-rules.mjs
  var STAT_GROUPS = Object.freeze([
    [["energyshield", "energyshieldpct", "energyshieldregen", "es"], ["energyshield"]],
    [["armor", "armorpct", "dr"], ["armor"]],
    [["evasion", "evasionpct", "deflectchance", "deflectdamagereduce"], ["evasion", "deflect"]],
    [["flathp", "pcthp", "regen", "regenflat"], ["hp", "life"]],
    [["resf", "resc", "resl", "resall", "reschaos"], ["res"]],
    [["firepctdmg", "coldpctdmg", "lightpctdmg", "chaospctdmg", "dotpctdmg", "pctdmg"], ["dmg", "dot"]],
    [["crit", "critdmg"], ["crit"]],
    [["aspd", "move"], ["speed", "move"]]
  ]);
  var DEFENSE_IDS = Object.freeze(["armor", "evasion", "energyShield"]);
  var DEFENSE_PCT = Object.freeze({ armorPct: "armor", evasionPct: "evasion", energyShieldPct: "energyShield" });
  function createItemTooltipRules(deps) {
    const env = { deps, STAT_GROUPS, DEFENSE_IDS, DEFENSE_PCT };
    return Object.freeze({ statOrder: (...args) => itemTooltipStatOrder(env, ...args), compareStats: (...args) => itemTooltipCompareStats(env, ...args), defenseView: (...args) => itemTooltipDefenseView(env, ...args), DEFENSE_IDS: env.DEFENSE_IDS });
  }

  // modules/ui/item-tooltip-empty.mjs
  function renderEmptyItemExplicit(deps, item) {
    const ward = typeof deps.colonyWards === "object" && deps.colonyWards.isWard(item);
    return `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-muted);">${ward ? deps._t("장비창의 액막이 칸에 끼웁니다") : deps._t("일반 아이템: 추가 옵션 없음")}</div>`;
  }

  // modules/item-tooltip-rules-classic.mjs
  var rules = createItemTooltipRules({
    get getImmutableItemSpecialStats() {
      return getImmutableItemSpecialStats;
    },
    get getUniqueImplicitMultiplier() {
      return getUniqueImplicitMultiplier;
    }
  });
  var display = {
    get colonyWards() {
      return typeof colonyWards === "undefined" ? void 0 : colonyWards;
    },
    get _t() {
      return _t;
    }
  };
  var itemTooltipRules = Object.freeze({
    statOrder: rules.statOrder,
    compareStats: rules.compareStats,
    defenseView: rules.defenseView,
    emptyExplicitHtml: (item) => renderEmptyItemExplicit(display, item),
    DEFENSE_IDS: rules.DEFENSE_IDS
  });
  safeExposeGlobals({ itemTooltipRules });
})();
