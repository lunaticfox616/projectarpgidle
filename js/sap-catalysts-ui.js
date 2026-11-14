// GENERATED from modules/sap-catalysts-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/sap-catalysts-actions.mjs
  function useState(ctx, key, item) {
    if (ctx.deps.game.woodsmanBuildLock) return { enabled: false, reason: (0, ctx.deps._t)("나무꾼 전투 중에는 쓸 수 없습니다.") };
    if ((ctx.deps.game.currencies[key] || 0) <= 0) return { enabled: false, reason: (0, ctx.deps._t)("재화 부족") };
    const reason = ctx.deps.sapCatalysts.useReason(item, key);
    return { enabled: !reason, reason: reason || "사용 가능" };
  }
  function use(ctx, key) {
    const item = (0, ctx.deps.getSelectedCraftItem)(), state = useState(ctx, key, item);
    if (!state.enabled) return (0, ctx.deps.addLog)(state.reason, "attack-monster");
    ctx.deps.game.currencies[key] -= 1;
    const token = ctx.deps.craftingResultLedger.begin(item, { currencyKey: key });
    const out = ctx.deps.sapCatalysts.apply(item, key);
    token.meta.outcome = (0, ctx.deps._t)("품질 속성 {mode}, 품질 {before}% → {after}%", { mode: (0, ctx.deps.getItemQualityAttributeLabel)(out.mode), before: out.before, after: out.after });
    ctx.deps.craftingResultLedger.commit(token, item);
    (0, ctx.deps.addLog)(`💧 ${(0, ctx.deps._t)(ctx.deps.ORB_DB[key].name)}: [${(0, ctx.deps.escapeHTML)((0, ctx.deps.getItemDisplayName)(item))}] ${token.meta.outcome}`, "loot-magic");
    (0, ctx.deps.updateStaticUI)();
    (0, ctx.deps.queueImportantSave)(200);
    return true;
  }
  function qualityHtml(ctx, item) {
    const value = Math.max(0, Math.floor(Number(item && item.quality) || 0));
    if (!value) return "";
    const mode = (0, ctx.deps.getItemQualityAttributeMode)(item);
    const grows = mode === "base" ? "베이스 옵션" : (0, ctx.deps._t)("{mode} 태그 줄", { mode: (0, ctx.deps.getItemQualityAttributeLabel)(mode) });
    return `<div class="tooltip-line" style="margin-top:6px; color:#9fd3ff;">${(0, ctx.deps._t)("💧 품질 {value}%: {grows} +{value2}%", { value, grows, value2: value })}</div>`;
  }

  // modules/ui/sap-catalysts-view.mjs
  function createSapCatalystsView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { useState, use, qualityHtml };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    ctx.api = Object.freeze({ useState: ctx.handlers.useState, use: ctx.handlers.use, qualityHtml: ctx.handlers.qualityHtml });
    return ctx.api;
  }

  // modules/sap-catalysts-ui-classic.mjs
  var sapCatalystsUi = createSapCatalystsView({
    get game() {
      return window.GameModules.state.game;
    },
    get _t() {
      return _t;
    },
    get sapCatalysts() {
      return sapCatalysts;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get addLog() {
      return addLog;
    },
    get craftingResultLedger() {
      return craftingResultLedger;
    },
    get getItemQualityAttributeLabel() {
      return getItemQualityAttributeLabel;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get getItemQualityAttributeMode() {
      return getItemQualityAttributeMode;
    }
  });
  safeExposeGlobals({ sapCatalystsUi });
})();
