// GENERATED from modules/ember-corruption-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/ember-corruption-actions.mjs
  function useState(ctx, item) {
    if (ctx.deps.game.woodsmanBuildLock) return { enabled: false, reason: (0, ctx.deps._t)("나무꾼 전투 중에는 쓸 수 없습니다.") };
    if ((ctx.deps.game.currencies[ctx.state.KEY] || 0) <= 0) return { enabled: false, reason: (0, ctx.deps._t)("재화 부족") };
    const reason = ctx.deps.emberCorruption.burnReason(item);
    return { enabled: !reason, reason: reason || "사용 가능" };
  }
  function ashPct(ctx, item) {
    const rows = ctx.deps.emberCorruption.outcomes(item), total = rows.reduce((sum, [, weight]) => sum + weight, 0);
    return Math.round((rows.find(([kind]) => kind === "ash") || [0, 0])[1] / Math.max(1, total) * 100);
  }
  async function use(ctx) {
    const item = (0, ctx.deps.getSelectedCraftItem)(), state = useState(ctx, item);
    if (!state.enabled) return (0, ctx.deps.addLog)(state.reason, "attack-monster");
    const question = (0, ctx.deps._t)("[{name}]에 타오른 잿불가지를 씁니다. {item}% 확률로 장비가 타서 사라집니다.", { name: item.name, item: ashPct(ctx, item) });
    if (!await (0, ctx.deps.requestGameConfirmation)(question, { title: (0, ctx.deps._t)("타오른 잿불가지"), tone: "danger", confirmLabel: (0, ctx.deps._t)("태우기") })) return;
    if ((0, ctx.deps.getSelectedCraftItem)() !== item || !useState(ctx, item).enabled) return (0, ctx.deps.addLog)((0, ctx.deps._t)("확인 중 제작 대상이나 재화가 바뀌어 쓰지 않았습니다."), "attack-monster");
    ctx.deps.game.currencies[ctx.state.KEY] -= 1;
    const token = ctx.deps.craftingResultLedger.begin(item, { currencyKey: ctx.state.KEY });
    const outcome = ctx.deps.emberCorruption.burn(item);
    if (outcome.kind === "ash") burnAway(ctx, item);
    else {
      token.meta.outcome = outcome.text;
      ctx.deps.craftingResultLedger.commit(token, item);
      (0, ctx.deps.addLog)((0, ctx.deps._t)("🔥 타오른 잿불가지: {text}", { text: outcome.text }), outcome.kind === "nothing" ? "attack-monster" : "loot-unique", { toast: true });
    }
    (0, ctx.deps.updateStaticUI)();
    (0, ctx.deps.queueImportantSave)(200);
    return true;
  }
  function burnAway(ctx, item) {
    const name = item.name, growth = ctx.deps.emberCorruption.ashGrowth(item), jewels = (0, ctx.deps.destroySelectedCraftItem)(item);
    const fed = typeof ctx.deps.stumpBox === "object" ? ctx.deps.stumpBox.feedAsh(ctx.deps.game, growth) : null;
    const parts = [
      (0, ctx.deps._t)("🔥 [{name}] 타서 재가 되었습니다.", { name }),
      jewels ? (0, ctx.deps._t)("끼운 주얼 {jewels}개는 가방으로 돌아왔습니다.", { jewels }) : "",
      fed ? (0, ctx.deps._t)("재가 그루터기 함 거름이 되었습니다(자라는 {fed}개 +{growth}).", { fed: fed.fed, growth: fed.growth }) : ""
    ];
    (0, ctx.deps.addLog)(parts.filter(Boolean).join(" "), "attack-monster", { toast: true });
  }
  function tooltipHtml(ctx, item) {
    if (!item || !item.burned) return "";
    const lines = (item.emberLines || []).map((line) => lineHtml(ctx, line, '<div class="tooltip-line">') + "</div>").join("");
    return `<div class="tooltip-line" style="margin-top:6px; color:${ctx.deps.EMBER_CORRUPTION_TONE};">${(0, ctx.deps._t)("🔥 타오른 장비 (다시 태울 수 없음)")}</div>${lines}`;
  }
  function scaleBadgeHtml(ctx, stat) {
    if (!stat || !Number.isFinite(Number(stat.emberScale)) || Number(stat.emberScale) === 1) return "";
    const pct = Math.round((Number(stat.emberScale) - 1) * 100);
    return ` <span style="color:${pct > 0 ? ctx.deps.EMBER_CORRUPTION_TONE : "#9aa3ad"}; font-weight:700;">🔥${pct > 0 ? "+" : ""}${pct}%</span>`;
  }
  function scaleNote(ctx, stat) {
    const pct = Math.round(((Number(stat && stat.emberScale) || 1) - 1) * 100);
    return pct ? (0, ctx.deps._t)("불길 {value}{pct}%", { value: pct > 0 ? "+" : "", pct }) : "";
  }
  function cardHtml(ctx, item) {
    if (!item || !item.burned) return "";
    const lines = (item.emberLines || []).map((line) => lineHtml(ctx, line, "")).join(" / ");
    return `<div class="cl-base">🔥 타오른 장비${lines ? ` &ensp; ${lines}` : ""}</div>`;
  }
  function esc(ctx, value) {
    return (0, ctx.deps.escapeHTML)(String(value));
  }
  function lineHtml(ctx, line, tag) {
    return `${tag}<span style="color:${ctx.deps.EMBER_CORRUPTION_TONE};">${(0, ctx.deps._t)("[잿불] {statName} +{id}", { statName: esc(ctx, (0, ctx.deps._t)(line.statName || (0, ctx.deps.getStatName)(line.id))), id: esc(ctx, (0, ctx.deps.formatValue)(line.id, line.val)) })}</span>`;
  }

  // modules/ui/ember-corruption-view.mjs
  function createEmberCorruptionView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { useState, use, ashPct, tooltipHtml, scaleBadgeHtml, scaleNote, cardHtml };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ useState: ctx.handlers.useState, use: ctx.handlers.use, ashPct: ctx.handlers.ashPct, tooltipHtml: ctx.handlers.tooltipHtml, scaleBadgeHtml: ctx.handlers.scaleBadgeHtml, scaleNote: ctx.handlers.scaleNote, cardHtml: ctx.handlers.cardHtml });
    return ctx.api;
  }
  function initialize(ctx) {
    ctx.state.KEY = "burningEmberBranch";
  }

  // modules/ember-corruption-ui-classic.mjs
  var emberCorruptionUi = createEmberCorruptionView({
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get emberCorruption() {
      return emberCorruption;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get addLog() {
      return addLog;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get craftingResultLedger() {
      return craftingResultLedger;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get destroySelectedCraftItem() {
      return destroySelectedCraftItem;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get EMBER_CORRUPTION_TONE() {
      return EMBER_CORRUPTION_TONE;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getStatName() {
      return getStatName;
    },
    get formatValue() {
      return formatValue;
    }
  });
  safeExposeGlobals({ emberCorruptionUi });
})();
