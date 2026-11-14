// GENERATED from modules/colony-ward-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/colony-ward-panel-actions.mjs
  function renderColonyWardView(runtime, targetId) {
    const panel = runtime.deps.document.getElementById(targetId);
    if (!panel) return;
    const html = runtime.deps.colonyWardsUi.colonyPanelHtml();
    if (panel.__wardHtml === html) return;
    panel.innerHTML = html;
    panel.__wardHtml = html;
  }

  // modules/ui/colony-ward-panel.mjs
  function createColonyWardPanel(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderColonyWardView };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = { renderColonyWardView: runtime.handlers.renderColonyWardView };
    return runtime.api;
  }

  // modules/colony-ward-ui-classic.mjs
  var colonyWardPanel = createColonyWardPanel({
    get document() {
      return document;
    },
    get colonyWardsUi() {
      return colonyWardsUi;
    }
  });
  safeExposeGlobals({
    renderColonyWardView: colonyWardPanel.renderColonyWardView
  });
})();
