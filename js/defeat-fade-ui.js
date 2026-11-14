// GENERATED from modules/defeat-fade-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/defeat-fade-view.mjs
  function createDefeatFadeView(deps) {
    const runtime = { active: true, listeners: [], fade: null };
    const clear = () => {
      releaseViewTarget(runtime, runtime.fade);
      runtime.fade?.remove();
      runtime.fade = null;
    };
    const show = (event) => {
      if (!runtime.active || event.detail?.background || deps.uiDisplay.reducedEffects()) return;
      const wrap = deps.document.getElementById("battlefield-wrap");
      const canvas = deps.document.getElementById("battlefield-canvas");
      if (!wrap || !canvas || !canvas.width || !canvas.height) return;
      clear();
      const fade = deps.document.createElement("div"), dark = deps.document.createElement("div");
      fade.className = "battle-defeat-fade";
      fade.setAttribute("aria-hidden", "true");
      dark.className = "battle-defeat-dark";
      fade.append(stillOf(deps.document, canvas), dark);
      runtime.fade = fade;
      listenView(runtime, fade, "animationend", (end) => {
        if (end.target === fade) clear();
      });
      wrap.append(fade);
    };
    listenView(runtime, deps.window, "project-idle:player-defeated", show);
    return Object.freeze({ dispose() {
      clear();
      releaseViewEvents(runtime);
    } });
  }
  function stillOf(document2, canvas) {
    const still = document2.createElement("canvas");
    still.width = canvas.width;
    still.height = canvas.height;
    still.className = "battle-defeat-still";
    Object.assign(still.style, {
      left: `${canvas.offsetLeft}px`,
      top: `${canvas.offsetTop}px`,
      width: `${canvas.offsetWidth}px`,
      height: `${canvas.offsetHeight}px`
    });
    still.getContext("2d").drawImage(canvas, 0, 0);
    return still;
  }

  // modules/defeat-fade-ui-classic.mjs
  window.GameModules.defeatFadeView = createDefeatFadeView({
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get uiDisplay() {
      return uiDisplay;
    }
  });
})();
