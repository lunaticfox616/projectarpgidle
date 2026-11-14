// GENERATED from modules/item-influences-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/item-influences-markup.mjs
  function influenceClasses(ctx, item) {
    const keys = ctx.deps.itemInfluences.influenceKeys(item), corrupted = item && item.corrupted ? " is-corrupted" : "";
    if (!keys.length) return corrupted;
    return ` has-influence${keys.length > 1 ? " has-influence-2" : ""} ${keys.map((key) => `infl-${key}`).join(" ")}${corrupted}`;
  }
  function influenceStyle(ctx, item) {
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) return "";
    return `--infl-a:${meta(ctx, keys[0]).tone};--infl-b:${meta(ctx, keys[1] || keys[0]).tone};`;
  }
  function markFrame(ctx, target, item) {
    if (!target || !target.dataset) return;
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) {
      delete target.dataset.influence;
      ["--infl-a", "--infl-b"].forEach((name) => target.style.removeProperty(name));
      return;
    }
    target.dataset.influence = keys.join(" ");
    target.style.setProperty("--infl-a", meta(ctx, keys[0]).tone);
    target.style.setProperty("--infl-b", meta(ctx, keys[1] || keys[0]).tone);
  }
  function tagsHtml(ctx, item, className = "") {
    const keys = ctx.deps.itemInfluences.influenceKeys(item);
    if (!keys.length) return "";
    const tags = keys.map((key) => `<span class="infl-tag" style="--infl:${meta(ctx, key).tone}">${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(meta(ctx, key).label))}</span>`).join("");
    return `<div class="infl-tags${className}">${tags}</div>`;
  }
  function sourceHtml(ctx, key) {
    const row = ctx.deps.ITEM_INFLUENCES[key];
    if (!row || !row.found) return "";
    return `<p class="infl-source"><span class="infl-tag" style="--infl:${row.tone}">${(0, ctx.deps.escapeHTML)((0, ctx.deps._t)(row.label))}</span>${(0, ctx.deps.escapeHTML)(row.found)}</p>`;
  }
  function lineBadgeHtml(ctx, item, stat) {
    if (!stat) return "";
    if (stat.altar && ctx.deps.ITEM_INFLUENCES[stat.altar]) return replacedLine(ctx, stat.altar, ctx.deps.ITEM_INFLUENCES[stat.altar].name, stat.replaced);
    if (stat.swapped) return replacedLine(ctx, "swapped", "뒤바뀜", stat.replaced);
    const influence = ctx.deps.itemInfluences.lineInfluence(stat);
    return influence ? chip(ctx, influence, ctx.deps.ITEM_INFLUENCES[influence].name) : "";
  }
  function useState(ctx, key, item) {
    const reason = ctx.deps.itemInfluences.altarUseReason(item, ctx.deps.itemInfluences.altarOfCurrency(key)) || ((Number(ctx.deps.game.currencies[key]) || 0) < 1 ? "재화 부족" : "");
    return { enabled: !reason, reason };
  }
  function use(ctx, key) {
    const item = (0, ctx.deps.getSelectedCraftItem)();
    const result = ctx.deps.itemInfluences.useAltarCurrency(ctx.deps.game, item, key);
    if (!result.ok) {
      if (typeof ctx.deps.showGameToast === "function") (0, ctx.deps.showGameToast)(result.reason, { tone: "error", duration: 2600 });
      return false;
    }
    const influence = ctx.deps.ITEM_INFLUENCES[result.line.altar];
    (0, ctx.deps.addLog)((0, ctx.deps._t)("{name} 줄을 새겼습니다: [{item}] {statName} +{value}", { name: (0, ctx.deps._t)(influence.name), item: (0, ctx.deps.escapeHTML)((0, ctx.deps.getItemDisplayName)(item)), statName: (0, ctx.deps.escapeHTML)(result.line.statName), value: (0, ctx.deps.formatValue)(result.line.id, result.line.val) }), "loot-rare");
    return true;
  }
  function meta(ctx, key) {
    return key === "swapped" ? ctx.deps.SWAPPED_UNIQUE_META : ctx.deps.ITEM_INFLUENCES[key];
  }
  function chip(ctx, key, text) {
    return `<span class="infl-chip is-${key}" style="--infl:${meta(ctx, key).tone}">${(0, ctx.deps.escapeHTML)(text)}</span>`;
  }
  function replacedLine(ctx, key, text, replaced) {
    return `<span class="infl-replaced is-${key}" style="--infl:${meta(ctx, key).tone}">${chip(ctx, key, text)}${replaced ? (0, ctx.deps._t)("기존 {statName}", { statName: (0, ctx.deps.escapeHTML)((0, ctx.deps._t)(replaced.statName || (0, ctx.deps.getStatName)(replaced.id))) }) : ""}</span>`;
  }
  function tooltipHtml(ctx, item) {
    return tagsHtml(ctx, item, " tooltip-line");
  }

  // modules/ui/item-influences-view.mjs
  function createItemInfluencesView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { influenceClasses, influenceStyle, markFrame, tagsHtml, tooltipHtml, sourceHtml, lineBadgeHtml, useState, use };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    ctx.api = Object.freeze({
      influenceClasses: ctx.handlers.influenceClasses,
      influenceStyle: ctx.handlers.influenceStyle,
      markFrame: ctx.handlers.markFrame,
      markTooltip: ctx.handlers.markFrame,
      tagsHtml: ctx.handlers.tagsHtml,
      tooltipHtml: ctx.handlers.tooltipHtml,
      sourceHtml: ctx.handlers.sourceHtml,
      lineBadgeHtml: ctx.handlers.lineBadgeHtml,
      useState: ctx.handlers.useState,
      use: ctx.handlers.use
    });
    return ctx.api;
  }

  // modules/item-influences-ui-classic.mjs
  var itemInfluencesUi = createItemInfluencesView({
    get itemInfluences() {
      return itemInfluences;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get ITEM_INFLUENCES() {
      return ITEM_INFLUENCES;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get addLog() {
      return addLog;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get formatValue() {
      return formatValue;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get SWAPPED_UNIQUE_META() {
      return SWAPPED_UNIQUE_META;
    },
    get getStatName() {
      return getStatName;
    }
  });
  safeExposeGlobals({ itemInfluencesUi });
})();
