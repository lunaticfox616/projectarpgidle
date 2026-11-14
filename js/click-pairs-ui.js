// GENERATED from modules/click-pairs-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/click-pairs-actions.mjs
  function onClick(runtime, event) {
    runtime.state.second = event.detail > 1 && !runtime.state.second;
    if (!runtime.state.second || event.detail === 2) return;
    const { target, clientX, clientY } = event;
    const timer = runtime.deps.setTimeout(() => {
      runtime.state.timers.delete(timer);
      if (runtime.active && target.isConnected) target.dispatchEvent(new runtime.deps.MouseEvent("dblclick", { bubbles: true, cancelable: true, view: runtime.deps.window, detail: 2, clientX, clientY }));
    }, 0);
    runtime.state.timers.add(timer);
  }

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/click-pairs-view.mjs
  function createClickPairsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { onClick };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ isSecond: () => runtime.state.second, dispose: () => disposeClickPairs(runtime) });
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onClick, true);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.second = false;
    runtime.state.timers = /* @__PURE__ */ new Set();
  }
  function disposeClickPairs(runtime) {
    releaseViewEvents(runtime);
    for (const timer of runtime.state.timers) runtime.deps.clearTimeout(timer);
    runtime.state.timers.clear();
    runtime.state.second = false;
  }

  // modules/click-pairs-ui-classic.mjs
  var clickPairs = createClickPairsView({
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get MouseEvent() {
      return MouseEvent;
    },
    get window() {
      return window;
    },
    get document() {
      return document;
    }
  });
  safeExposeGlobals({ clickPairs });
})();
