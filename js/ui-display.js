// GENERATED from modules/ui-display*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/display-scale.mjs
  var PC_SCALE_STEPS = Object.freeze([100, 150, 200]);
  var floorDpr = (dpr) => Math.max(1, Math.floor((dpr || 1) + 1e-6));
  var deviceMultiple = (step, dpr) => step / 100 * floorDpr(dpr);
  function isCrispStep(step, dpr) {
    const multiple = deviceMultiple(step, dpr);
    return Math.abs(multiple - Math.round(multiple)) < 1e-6;
  }
  function nearestPcScaleStep(wanted, dpr) {
    return PC_SCALE_STEPS.slice().sort((a, b) => Math.abs(a - wanted) - Math.abs(b - wanted) || Number(isCrispStep(b, dpr)) - Number(isCrispStep(a, dpr)) || a - b)[0];
  }
  function recommendedScale(deviceWidth, dpr) {
    const distance = (step) => Math.abs(deviceWidth / deviceMultiple(step, dpr) - 1920);
    return PC_SCALE_STEPS.filter((step) => isCrispStep(step, dpr)).sort((a, b) => distance(a) - distance(b) || a - b)[0];
  }
  function scaledMediaText(query, factor) {
    return query.replace(
      /((?:min-|max-)?(?:width|height)\s*:\s*)([\d.]+)(px|em|rem)/g,
      (_, prefix, value, unit) => `${prefix}${Number(value) * factor}${unit}`
    );
  }

  // modules/browser/display-styles.mjs
  var DisplayStyles = class {
    constructor({ window: window2, document: document2 }) {
      this.window = window2;
      this.document = document2;
      this.mediaRules = /* @__PURE__ */ new Map();
      this.visitedSheets = /* @__PURE__ */ new WeakSet();
      this.styles = /* @__PURE__ */ new Map();
    }
    adaptStyle(style) {
      for (const property of Array.from(style)) {
        const value = style.getPropertyValue(property);
        if (value.includes("--scale-display-factor")) continue;
        const next = value.replace(
          /(-?(?:\d*\.)?\d+)(d?vw|d?vh|vmin|vmax)\b/g,
          (_, number, unit) => `calc(${number}${unit} / var(--scale-display-factor, 1))`
        );
        if (next === value) continue;
        const priority = style.getPropertyPriority(property);
        if (!this.styles.has(style)) this.styles.set(style, /* @__PURE__ */ new Map());
        this.styles.get(style).set(property, { value, priority, next });
        style.setProperty(property, next, priority);
      }
    }
    adaptRules(rules) {
      const pending = Array.from(rules);
      while (pending.length) {
        const rule = pending.pop();
        if (rule.type === this.window.CSSRule.MEDIA_RULE) this.mediaRules.set(rule, { original: rule.media.mediaText });
        if (rule.cssRules) pending.push(...rule.cssRules);
        const imported = rule.styleSheet;
        if (imported && !this.visitedSheets.has(imported) && new this.window.URL(imported.href).origin === this.window.origin) {
          this.visitedSheets.add(imported);
          pending.push(...imported.cssRules);
        }
        if (rule.style) this.adaptStyle(rule.style);
      }
    }
    register(factor) {
      for (const sheet of Array.from(this.document.styleSheets)) {
        if (this.visitedSheets.has(sheet)) continue;
        if (sheet.href && new this.window.URL(sheet.href).origin !== this.window.origin) continue;
        this.adaptRules(sheet.cssRules);
        this.visitedSheets.add(sheet);
      }
      for (const [rule, row] of this.mediaRules) {
        rule.media.mediaText = scaledMediaText(row.original, factor);
        row.next = rule.media.mediaText;
      }
    }
    dispose() {
      for (const [rule, row] of this.mediaRules) {
        if (rule.media.mediaText === row.next) rule.media.mediaText = row.original;
      }
      for (const [style, properties] of this.styles) {
        for (const [property, row] of properties) {
          if (style.getPropertyValue(property) === row.next && style.getPropertyPriority(property) === row.priority) {
            style.setProperty(property, row.value, row.priority);
          }
        }
      }
      this.mediaRules.clear();
      this.styles.clear();
      this.visitedSheets = /* @__PURE__ */ new WeakSet();
    }
  };

  // modules/browser/display-cadence.mjs
  var INPUT_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"];
  var DisplayCadence = class {
    constructor(environment, getState) {
      const { window: window2, document: document2 } = environment;
      this.window = window2;
      this.document = document2;
      this.getState = getState;
      const { navigator } = window2;
      this.mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
      this.lastInputAt = window2.performance.now();
      this.markInput = () => {
        this.lastInputAt = window2.performance.now();
      };
    }
    start() {
      if (this.started) return;
      this.started = true;
      INPUT_EVENTS.forEach((type) => this.window.addEventListener(type, this.markInput, { capture: true, passive: true }));
      this.window.addEventListener("focus", this.markInput);
    }
    watchingBoss() {
      const game2 = this.getState();
      if (typeof game2 !== "object" || game2.combatHalted || !(game2.playerHp > 0)) return false;
      if (!this.document.getElementById("tab-battle")?.classList.contains("active")) return false;
      return game2.enemies.some((enemy) => enemy && enemy.isBoss && enemy.hp > 0);
    }
    restingFrameMs() {
      if (!this.document.hidden && this.watchingBoss()) return 0;
      if (!this.document.hasFocus()) return 1e3 / 20;
      return this.inputIdleMs > 2e4 ? this.mobile ? 1e3 / 20 : 1e3 / 30 : 0;
    }
    get inputIdleMs() {
      return this.window.performance.now() - this.lastInputAt;
    }
    get battleFrameMs() {
      return Math.max(this.mobile ? 1e3 / 30 : 22, this.restingFrameMs());
    }
    get explorationFrameMs() {
      return Math.max(this.mobile ? 1e3 / 30 : 1e3 / 60, this.restingFrameMs());
    }
    dispose() {
      INPUT_EVENTS.forEach((type) => this.window.removeEventListener(type, this.markInput, true));
      this.window.removeEventListener("focus", this.markInput);
      this.started = false;
    }
  };

  // modules/common/numbers.mjs
  function normalizeUiSkin() {
    return "rift";
  }

  // modules/browser/display.mjs
  var Display = class {
    constructor(environment, inputs) {
      this.env = environment;
      this.inputs = inputs;
      this.styles = new DisplayStyles(environment);
      this.cadence = new DisplayCadence(environment, inputs.getState);
      this.factor = 1;
      this.percent = 100;
      this.started = false;
      this.initialized = false;
      this.disposed = false;
      this.motionQuery = environment.window.matchMedia("(prefers-reduced-motion: reduce)");
      this.refresh = () => this.apply(this.percent);
      this.syncEffects = this.syncEffects.bind(this);
      this.init = this.init.bind(this);
      this.languageChange = () => this.syncScaleSelect(Math.max(1, this.env.window.devicePixelRatio || 1));
      this.selectionChange = (event) => this.select(event.target.value);
    }
    start({ waitForDomReady = false } = {}) {
      if (this.started || this.disposed) return;
      this.started = true;
      this.motionQuery.addEventListener("change", this.syncEffects);
      this.cadence.start();
      if (!waitForDomReady && this.env.document.readyState === "complete") this.init();
      else this.env.document.addEventListener("DOMContentLoaded", this.init, { once: true });
    }
    reducedEffects() {
      const choice = this.inputs.getState().settings.effectIntensity;
      if (choice === "reduced") return true;
      if (choice === "full") return false;
      return this.motionQuery.matches;
    }
    syncEffects() {
      if (this.disposed) return;
      const classes = this.env.document.body.classList;
      if (this.originalReduced === void 0) this.originalReduced = classes.contains("reduced-effects");
      this.lastReduced = this.reducedEffects();
      classes.toggle("reduced-effects", this.lastReduced);
    }
    mediaText(query) {
      return scaledMediaText(query, this.factor);
    }
    applyUiSkin(skin) {
      if (!this.disposed) this.env.document.body.dataset.uiSkin = normalizeUiSkin(skin);
    }
    applyHighContrast(enabled) {
      if (!this.disposed) this.env.document.body.classList.toggle("high-contrast", enabled === true);
    }
    applyLoadedSaveLook() {
      const settings = this.inputs.getState().settings;
      this.applyUiSkin(settings.uiSkin);
      this.applyHighContrast(settings.highContrast);
    }
    applyChatMessageSize(size) {
      const normalized = ["small", "medium", "large"].includes(size) ? size : "medium";
      const body = this.env.document.body;
      if (!this.disposed && body?.dataset) body.dataset.chatMessageSize = normalized;
      return normalized;
    }
    matches(query) {
      return this.env.window.matchMedia(this.mediaText(query)).matches;
    }
    registerStyles() {
      if (!this.disposed) this.styles.register(this.factor);
    }
    watchResolution() {
      this.resolutionQuery?.removeEventListener("change", this.refresh);
      this.resolutionQuery = this.env.window.matchMedia(`(resolution: ${this.env.window.devicePixelRatio}dppx)`);
      this.resolutionQuery.addEventListener("change", this.refresh, { once: true });
    }
    apply(value) {
      if (this.disposed) return;
      const { window: window2, document: document2 } = this.env;
      this.captureRoot();
      const dpr = Math.max(1, window2.devicePixelRatio || 1);
      const normalized = this.inputs.normalizeScale(value);
      this.percent = this.cadence.mobile ? normalized : nearestPcScaleStep(normalized, dpr);
      const deviceScale = this.cadence.mobile ? 1 : dpr / Math.floor(dpr + 1e-6);
      const next = this.percent / 100 / deviceScale;
      const changed = Math.abs(next - this.factor) > 1e-5;
      this.factor = next;
      if (changed || !this.sideBattleHudQuery) {
        this.sideBattleHudQuery = window2.matchMedia(this.mediaText("(max-width: 1080px) and (orientation: landscape) and (max-height: 600px)"));
      }
      document2.documentElement.style.setProperty("--scale-display-factor", String(this.factor));
      document2.documentElement.style.setProperty("--device-ratio", String(dpr * this.factor));
      document2.documentElement.style.zoom = String(this.factor);
      document2.documentElement.classList.toggle("ui-smooth-text", !this.cadence.mobile && !isCrispStep(this.percent, dpr));
      this.lastSmooth = document2.documentElement.classList.contains("ui-smooth-text");
      for (const [property, row] of this.rootStyles) row.next = document2.documentElement.style.getPropertyValue(property);
      this.registerStyles();
      this.syncScaleSelect(dpr);
      this.watchResolution();
      if (changed) window2.dispatchEvent(new window2.Event("resize"));
    }
    select(value) {
      const settings = this.inputs.getState().settings;
      settings.uiScale = this.inputs.normalizeScale(value);
      settings.uiScaleChosen = true;
      this.apply(settings.uiScale);
      this.inputs.save({ skipCloudSync: false });
    }
    syncScaleSelect(dpr) {
      const { document: document2 } = this.env;
      const select = document2.getElementById("sel-ui-scale");
      if (!select) return;
      if (!this.cadence.mobile) {
        const labels = PC_SCALE_STEPS.map((step) => this.inputs.translate(isCrispStep(step, dpr) ? "{step}% (추천)" : "{step}% (글꼴 바꿈)", { step })).join("|");
        if (select.dataset.labels !== labels) {
          select.dataset.labels = labels;
          select.innerHTML = labels.split("|").map((label, index) => `<option value="${PC_SCALE_STEPS[index]}">${label}</option>`).join("");
          const hint = document2.querySelector('label[for="sel-ui-scale"] + small');
          if (hint) hint.textContent = this.inputs.translate("메뉴와 글자의 크기. (추천)은 도트가 또렷한 배율이고, 글꼴 바꿈 배율은 글자를 일반 글꼴로 보입니다.");
        }
      }
      select.value = String(this.percent);
    }
    applySaved(settings) {
      if (this.disposed) return;
      this.syncEffects();
      const { window: window2 } = this.env;
      const dpr = Math.max(1, window2.devicePixelRatio || 1);
      const chosen = settings.uiScaleChosen === true || this.inputs.normalizeScale(settings.uiScale) !== 100;
      if (!this.cadence.mobile && !chosen) settings.uiScale = recommendedScale((window2.screen ? window2.screen.width : 1920) * dpr, dpr);
      this.apply(settings.uiScale);
      settings.uiScale = this.percent;
    }
    init() {
      if (this.initialized || this.disposed) return;
      this.initialized = true;
      this.apply(100);
      this.syncEffects();
      const { window: window2, document: document2 } = this.env;
      this.selectElement = document2.getElementById("sel-ui-scale");
      this.selectElement.addEventListener("change", this.selectionChange);
      window2.addEventListener("game:languagechange", this.languageChange);
      document2.querySelectorAll("[style]").forEach((el) => this.styles.adaptStyle(el.style));
      this.observer = new window2.MutationObserver(() => this.registerStyles());
      this.observer.observe(document2.head, { childList: true });
    }
    get battleRenderScale() {
      const ratio = (this.env.window.devicePixelRatio || 1) * this.factor, cap = this.cadence.mobile ? 1.5 : 2;
      return Math.max(1, ratio / Math.max(1, Math.ceil(ratio / cap - 1e-6)));
    }
    captureRoot() {
      if (this.rootStyles) return;
      const root = this.env.document.documentElement;
      this.originalSmooth = root.classList.contains("ui-smooth-text");
      this.rootStyles = new Map(["--scale-display-factor", "--device-ratio", "zoom"].map((property) => [property, { value: root.style.getPropertyValue(property), priority: root.style.getPropertyPriority(property) }]));
    }
    restoreRoot() {
      const { document: document2 } = this.env, root = document2.documentElement;
      if (this.rootStyles) {
        for (const [property, row] of this.rootStyles) {
          if (root.style.getPropertyValue(property) !== row.next) continue;
          if (row.value) root.style.setProperty(property, row.value, row.priority);
          else root.style.removeProperty(property);
        }
        this.rootStyles.clear();
      }
      if (root.classList.contains("ui-smooth-text") === this.lastSmooth) root.classList.toggle("ui-smooth-text", this.originalSmooth);
      if (document2.body.classList.contains("reduced-effects") === this.lastReduced) document2.body.classList.toggle("reduced-effects", this.originalReduced);
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.env.document.removeEventListener("DOMContentLoaded", this.init);
      this.motionQuery.removeEventListener("change", this.syncEffects);
      this.resolutionQuery?.removeEventListener("change", this.refresh);
      this.env.window.removeEventListener("game:languagechange", this.languageChange);
      this.selectElement?.removeEventListener("change", this.selectionChange);
      this.observer?.disconnect();
      this.cadence.dispose();
      this.styles.dispose();
      this.restoreRoot();
      this.sideBattleHudQuery = null;
    }
  };
  function createDisplay(environment, inputs) {
    const service = new Display(environment, inputs);
    return Object.freeze({
      start: (options) => service.start(options),
      init: () => service.init(),
      dispose: () => service.dispose(),
      apply: (value) => service.apply(value),
      applySaved: (settings) => service.applySaved(settings),
      applyUiSkin: (skin) => service.applyUiSkin(skin),
      applyHighContrast: (enabled) => service.applyHighContrast(enabled),
      applyLoadedSaveLook: () => service.applyLoadedSaveLook(),
      applyChatMessageSize: (size) => service.applyChatMessageSize(size),
      matches: (query) => service.matches(query),
      registerStyles: () => service.registerStyles(),
      recommendedScale,
      isCrispStep,
      pcScaleStep: (value, dpr) => nearestPcScaleStep(inputs.normalizeScale(value), dpr),
      reducedEffects: () => service.reducedEffects(),
      syncEffects: () => service.syncEffects(),
      get factor() {
        return service.factor;
      },
      get battleHudAtSide() {
        return !!service.sideBattleHudQuery && service.sideBattleHudQuery.matches;
      },
      get inputIdleMs() {
        return service.cadence.inputIdleMs;
      },
      get battleFrameMs() {
        return service.cadence.battleFrameMs;
      },
      get explorationFrameMs() {
        return service.cadence.explorationFrameMs;
      },
      get battleRenderScale() {
        return service.battleRenderScale;
      }
    });
  }

  // modules/ui-display-classic.mjs
  var uiDisplay = createDisplay({ window, document }, {
    getState: () => game,
    normalizeScale: (value) => normalizeUiScale(value),
    translate: (...args) => _t(...args),
    save: (options) => saveGame(options)
  });
  safeExposeGlobals({
    uiDisplay,
    applyUiSkin: uiDisplay.applyUiSkin,
    applyHighContrast: uiDisplay.applyHighContrast,
    applyLoadedSaveLook: uiDisplay.applyLoadedSaveLook,
    applyChatMessageSize: uiDisplay.applyChatMessageSize
  });
  uiDisplay.start({ waitForDomReady: true });
})();
