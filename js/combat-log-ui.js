// GENERATED from modules/combat-log-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/combat-log-markup.mjs
  function stripHtmlMessage(runtime, raw) {
    let div = runtime.deps.document.createElement("div");
    div.innerHTML = String(raw || "");
    return (div.textContent || div.innerText || "").trim();
  }
  function registerCombatLogItemSnapshot(runtime, item) {
    let token = ++runtime.state.combatLogItemSequence;
    let snapshot = JSON.parse(JSON.stringify(item));
    runtime.state.combatLogItemSnapshots.set(token, snapshot);
    while (runtime.state.combatLogItemSnapshots.size > 80) {
      const expired = [...runtime.state.combatLogItemSnapshots.keys()].find((key) => !runtime.deps.document.querySelector(`#background-combat-result-overlay [data-log-item-token="${key}"]`));
      if (expired === void 0) break;
      runtime.state.combatLogItemSnapshots.delete(expired);
    }
    return token;
  }
  function decorateCombatLogItemMessage(runtime, msg, item) {
    if (!item || typeof item !== "object" || !item.name) return msg;
    let token = registerCombatLogItemSnapshot(runtime, item);
    let label = `[${item.name}]`;
    let link = `<span class="combat-log-item-link" role="button" tabindex="0" data-item-tooltip-anchor="1" data-log-item-token="${token}" onmouseenter="showCombatLogItemTooltip(event,${token})" onmousemove="showCombatLogItemTooltip(event,${token})" onmouseleave="hideCombatLogItemTooltip(event)" onclick="openCombatLogItemEquipment(event)" onkeydown="if(event.key==='Enter'||event.key===' '){openCombatLogItemEquipment(event)}">${(0, runtime.deps.escapeHTML)(label)}</span>`;
    return String(msg).replace(label, link);
  }
  function stripCombatLogEmoji(runtime, raw) {
    return (0, runtime.deps.stripDecorativeEmoji)(raw);
  }
  function getCombatLogElementFromText(message) {
    let text = String(message || "");
    if (/(화염|점화)/.test(text)) return "fire";
    if (/(냉기|한기|동결)/.test(text)) return "cold";
    if (/(번개|감전)/.test(text)) return "light";
    if (/(카오스|중독|독)/.test(text)) return "chaos";
    if (/(물리|출혈)/.test(text)) return "phys";
    return "";
  }
  function getCombatLogIconKind(message, cls, options) {
    let opts = options || {};
    if (opts.item) return "item";
    if (["attack", "phys", "fire", "cold", "light", "chaos"].includes(opts.logIcon)) return opts.logIcon;
    if (["phys", "fire", "cold", "light", "chaos"].includes(opts.element)) return opts.element;
    return inferCombatLogIconKind(message, cls);
  }
  function inferCombatLogIconKind(message, cls) {
    let text = String(message || "");
    let element = getCombatLogElementFromText(message);
    if (element && /(피격|피해|상태이상|점화|냉각|동결|감전|중독|출혈)/.test(text)) return element;
    if (cls === "attack-player" && /(피해|타격|공격)/.test(text)) return "attack";
    if (cls === "attack-monster" && /피해/.test(text)) return element || "phys";
    return "";
  }
  function renderCombatLogIcon(runtime, kind, options) {
    let opts = options || {};
    if (kind === "item") {
      let asset = typeof runtime.deps.getInventoryItemVisualAsset === "function" ? (0, runtime.deps.getInventoryItemVisualAsset)(opts.item, opts.itemKind) : "";
      return asset ? `<img class="combat-log-icon combat-log-item-icon" src="${(0, runtime.deps.escapeHTML)(asset)}" alt="" aria-hidden="true">` : "";
    }
    return kind ? `<span class="combat-log-icon combat-log-icon--${kind}" aria-hidden="true"></span>` : "";
  }
  function markCombatLogCritNumber(runtime, message, critValue) {
    let at = critValue ? message.lastIndexOf((0, runtime.deps._t)("{critValue} 피해", { critValue })) : -1;
    if (at < 0) return message;
    return `${message.slice(0, at)}<span class="combat-log-crit">${critValue}</span>${message.slice(at + critValue.length)}`;
  }
  function decorateCombatLogMessage(runtime, message, cls, options) {
    let cleanMessage = stripCombatLogEmoji(runtime, message);
    let icon = renderCombatLogIcon(runtime, getCombatLogIconKind(cleanMessage, cls, options), options);
    return `${icon}${markCombatLogCritNumber(runtime, cleanMessage, options && options.critValue)}`;
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
  function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
      if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
      else retained.push(binding);
    }
    runtime.listeners = retained;
  }

  // modules/ui/combat-log-lifetime.mjs
  function syncCombatLogOwner(runtime) {
    if (runtime.owner === runtime.deps.game) return;
    clearCombatLogWork(runtime);
    runtime.owner = runtime.deps.game;
  }
  function queueCombatLogTimer(runtime, callback, delay) {
    const owner = runtime.owner;
    const id = runtime.deps.setTimeout(() => {
      runtime.timers.delete(id);
      if (!runtime.active) return;
      syncCombatLogOwner(runtime);
      if (owner === runtime.owner) callback();
    }, delay);
    runtime.timers.add(id);
    return id;
  }
  function cancelCombatLogTimer(runtime, id) {
    runtime.deps.clearTimeout(id);
    runtime.timers.delete(id);
  }
  function queueCombatLogFrame(runtime, callback) {
    const owner = runtime.owner;
    const id = runtime.deps.requestAnimationFrame((now) => {
      runtime.frames.delete(id);
      if (!runtime.active) return;
      syncCombatLogOwner(runtime);
      if (owner === runtime.owner) callback(now);
    });
    runtime.frames.add(id);
    return id;
  }
  function clearCombatLogWork(runtime) {
    for (const id of runtime.timers) runtime.deps.clearTimeout(id);
    for (const id of runtime.frames) runtime.deps.cancelAnimationFrame(id);
    runtime.timers.clear();
    runtime.frames.clear();
    for (const toast of runtime.toasts) {
      releaseViewTarget(runtime, toast);
      toast.remove();
    }
    runtime.toasts.clear();
    Object.assign(runtime.state, {
      mobileToastQueue: [],
      mobileToastResultHoldTimer: null,
      mobileToastActiveCount: 0,
      logQueue: [],
      logFlushRaf: 0,
      combatLogRateState: {},
      combatLogAggregateState: {},
      lastLogFlushAt: -Infinity
    });
    runtime.state.combatLogItemSnapshots.clear();
  }
  function disposeCombatLog(runtime) {
    if (!runtime.active) return;
    clearCombatLogWork(runtime);
    if (runtime.log) delete runtime.log.combatLogScrollWatched;
    runtime.log = null;
    releaseViewEvents(runtime);
  }

  // modules/ui/combat-log-toasts.mjs
  function shouldShowMobileToast(runtime, msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    if (!usesToastPresentation(runtime)) return false;
    let text = stripHtmlMessage(runtime, msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || "");
    if (importantFailure) return true;
    let level = cls || "";
    if (level === "season-up" || level === "loot-unique") return true;
    return false;
  }
  function usesToastPresentation(runtime) {
    const isMobile = runtime.deps.window.matchMedia && runtime.deps.uiDisplay.matches("(max-width: 900px)") || "ontouchstart" in runtime.deps.window;
    const logHidden = runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings.showCombatLog === false;
    return isMobile || logHidden;
  }
  function getMobileToastRoot(runtime) {
    let root = runtime.deps.document.getElementById("mobile-toast-root");
    if (root) return root;
    root = runtime.deps.document.createElement("div");
    root.id = "mobile-toast-root";
    root.style.position = "fixed";
    root.style.left = "50%";
    root.style.bottom = "var(--mobile-toast-bottom, 84px)";
    root.style.transform = "translateX(-50%)";
    root.style.zIndex = "22000";
    root.style.pointerEvents = "none";
    root.style.display = "flex";
    root.style.flexDirection = "column";
    root.style.gap = "8px";
    root.style.width = "min(calc(92vw / var(--scale-display-factor, 1)), 420px)";
    runtime.deps.document.body.appendChild(root);
    return root;
  }
  function enqueueMobileToast(runtime, msg, cls) {
    runtime.state.mobileToastQueue.push({ msg: stripHtmlMessage(runtime, msg), cls: cls || "" });
    pumpMobileToastQueue(runtime);
  }
  function resumeMobileToastsAfterResult(runtime) {
    runtime.state.mobileToastResultHoldTimer = null;
    pumpMobileToastQueue(runtime);
  }
  function pumpMobileToastQueue(runtime) {
    if (typeof runtime.deps.isTutorialOpen === "function" && (0, runtime.deps.isTutorialOpen)()) return;
    if (runtime.deps.document.getElementById("background-combat-result-overlay")) {
      runtime.state.mobileToastResultHoldTimer = runtime.state.mobileToastResultHoldTimer || queueCombatLogTimer(runtime, runtime.handlers.resumeMobileToastsAfterResult, 600);
      return;
    }
    while (runtime.state.mobileToastActiveCount < runtime.state.MOBILE_TOAST_MAX_CONCURRENT && runtime.state.mobileToastQueue.length > 0) {
      showNextMobileToast(runtime);
    }
  }
  function getMobileToastDisplayDurationMs(runtime) {
    let backlog = runtime.state.mobileToastQueue.length;
    return Math.max(650, 1700 - backlog * 180);
  }
  function showNextMobileToast(runtime) {
    if (runtime.state.mobileToastQueue.length <= 0) return;
    let entry = runtime.state.mobileToastQueue.shift();
    runtime.state.mobileToastActiveCount++;
    let root = getMobileToastRoot(runtime);
    let toast = runtime.deps.document.createElement("div");
    toast.textContent = entry.msg;
    toast.className = entry.cls === "attack-monster" ? "mobile-log-toast mobile-log-toast--error" : "mobile-log-toast";
    toast.style.opacity = "0";
    toast.style.transition = "opacity .2s ease";
    root.appendChild(toast);
    runtime.toasts.add(toast);
    queueCombatLogFrame(runtime, () => {
      toast.style.opacity = "1";
    });
    listenView(runtime, toast, "click", () => {
      syncCombatLogOwner(runtime);
      if (runtime.toasts.has(toast)) releaseMobileToast(runtime, toast, 90);
    });
    queueCombatLogTimer(runtime, () => releaseMobileToast(runtime, toast, 220), getMobileToastDisplayDurationMs(runtime));
  }
  function releaseMobileToast(runtime, toast, fadeMs) {
    if (toast.dataset.released) return;
    toast.dataset.released = "1";
    toast.style.transition = `opacity ${fadeMs}ms ease`;
    toast.style.opacity = "0";
    queueCombatLogTimer(runtime, () => {
      releaseViewTarget(runtime, toast);
      runtime.toasts.delete(toast);
      toast.remove();
      runtime.state.mobileToastActiveCount = Math.max(0, runtime.state.mobileToastActiveCount - 1);
      queueCombatLogTimer(runtime, runtime.handlers.pumpMobileToastQueue, 0);
    }, fadeMs);
  }

  // modules/ui/combat-log-scroll.mjs
  function captureCombatLogScroll(log) {
    const top = log.getBoundingClientRect().top;
    for (const row of log.children) {
      const box = row.getBoundingClientRect();
      if (box.bottom > top) return { row, offset: box.top - top };
    }
    return null;
  }
  function watchCombatLogScroll(runtime, log) {
    if (runtime.log === log) return;
    if (runtime.log) {
      releaseViewTarget(runtime, runtime.log);
      delete runtime.log.combatLogScrollWatched;
    }
    runtime.log = log;
    log.combatLogScrollWatched = true;
    listenView(runtime, log, "scroll", () => {
      const top = log.scrollTop, own = top === log.combatLogSetTop;
      log.combatLogSetTop = NaN;
      if (own) return;
      log.combatLogAtBottom = log.scrollHeight - top - log.clientHeight <= 24;
    }, { passive: true });
  }
  function scrollCombatLogToLatest(log) {
    log.scrollTop = log.scrollHeight;
    log.combatLogSetTop = log.scrollTop;
    log.combatLogAtBottom = true;
  }
  function isCombatLogHidden(log) {
    if (typeof log.closest !== "function") return false;
    const pane = log.closest(".tab-content");
    return !!pane && !pane.classList.contains("active") || !!log.closest(".message-frame-stash") || !!log.closest(".combat-feed.collapsed") && log.offsetHeight === 0;
  }
  function restoreCombatLogScroll(runtime, log, scrollState) {
    const row = scrollState.row.parentNode === log ? scrollState.row : log.firstElementChild;
    if (!row) return;
    log.scrollTop += (row.getBoundingClientRect().top - log.getBoundingClientRect().top - scrollState.offset) / runtime.deps.uiDisplay.factor;
    log.combatLogSetTop = log.scrollTop;
  }
  function settleCombatLogScroll(runtime, log, view) {
    if (view.hidden) log.combatLogAtBottom = true;
    else if (view.scrollState) restoreCombatLogScroll(runtime, log, view.scrollState);
    else scrollCombatLogToLatest(log);
  }

  // modules/ui/combat-log-queue.mjs
  function deferCombatLogFlush(runtime, frameNow) {
    if (frameNow - runtime.state.lastLogFlushAt >= runtime.state.COMBAT_LOG_FLUSH_MS || frameNow < runtime.state.lastLogFlushAt) {
      runtime.state.lastLogFlushAt = frameNow;
      return false;
    }
    runtime.state.logFlushRaf = queueCombatLogFrame(runtime, runtime.handlers.flushLogQueue);
    return true;
  }
  function flushLogQueue(runtime, frameNow = runtime.deps.performance.now()) {
    runtime.state.logFlushRaf = 0;
    const log = runtime.deps.document.getElementById("log");
    if (!log || runtime.state.logQueue.length === 0 || deferCombatLogFlush(runtime, frameNow)) return;
    watchCombatLogScroll(runtime, log);
    const hidden = isCombatLogHidden(log), reading = !hidden && log.combatLogAtBottom === false;
    let scrollState = reading ? captureCombatLogScroll(log) : null;
    if (runtime.state.logQueue.length > 60) runtime.state.logQueue = runtime.state.logQueue.slice(-60);
    let frag = runtime.deps.document.createDocumentFragment();
    runtime.state.logQueue.forEach((entry) => {
      const div = runtime.deps.document.createElement("div");
      div.className = "log-msg " + (entry.cls || "");
      div.innerHTML = entry.msg;
      frag.appendChild(div);
    });
    noteCombatLogLatest(runtime, runtime.state.logQueue[runtime.state.logQueue.length - 1]);
    runtime.state.logQueue = [];
    log.appendChild(frag);
    while (log.childElementCount > 60) log.removeChild(log.firstChild);
    settleCombatLogScroll(runtime, log, { hidden, scrollState });
  }
  function noteCombatLogLatest(runtime, entry) {
    if (!runtime.deps.document.body.classList.contains("mobile-battle-tab")) return;
    const toggle = runtime.deps.document.getElementById("btn-combat-log-toggle"), text = entry ? stripHtmlMessage(runtime, entry.msg) : "";
    if (toggle && text && toggle.dataset.latest !== text) toggle.dataset.latest = text;
  }
  function isCombatLogRateLimited(runtime, opts, settings, now) {
    if (!opts.rateKey || settings.combatLogRateLimit === false) return false;
    if (now < (runtime.state.combatLogRateState[opts.rateKey] || 0)) return true;
    runtime.state.combatLogRateState[opts.rateKey] = now + Math.max(60, Number(opts.minIntervalMs || 180));
    return false;
  }
  function pushCombatLogLine(runtime, msg, cls) {
    runtime.state.logQueue.push({ msg, cls });
    if (runtime.state.logQueue.length > 240) runtime.state.logQueue = runtime.state.logQueue.slice(-60);
    if (!runtime.state.logFlushRaf) runtime.state.logFlushRaf = queueCombatLogFrame(runtime, runtime.handlers.flushLogQueue);
  }
  function mergedCombatLogLine(state) {
    return state.count > 1 ? `${state.msg} <span style="color:var(--copy-bright);">x${state.count}</span>` : state.msg;
  }
  function flushCombatLogAggregate(runtime, key, winMs) {
    let state = runtime.state.combatLogAggregateState[key];
    if (!state) return;
    let quiet = runtime.deps.performance.now() - state.lastAt;
    if (quiet < winMs) {
      state.timer = queueCombatLogTimer(runtime, runtime.handlers.flushCombatLogAggregate.bind(void 0, key, winMs), winMs - quiet + 10);
      return;
    }
    pushCombatLogLine(runtime, mergedCombatLogLine(state), state.cls);
    delete runtime.state.combatLogAggregateState[key];
  }
  function queueAggregatedCombatLog(runtime, msg, cls, opts, now) {
    let key = `${opts.aggregateKey}:${cls || ""}`;
    let state = runtime.state.combatLogAggregateState[key];
    let winMs = Math.max(120, Number(opts.aggregateWindowMs || 500));
    if (state && now - state.lastAt <= winMs) {
      state.count++;
      state.lastAt = now;
      state.msg = msg;
      return;
    }
    if (state) {
      cancelCombatLogTimer(runtime, state.timer);
      pushCombatLogLine(runtime, mergedCombatLogLine(state), state.cls);
    }
    runtime.state.combatLogAggregateState[key] = { msg, cls, count: 1, lastAt: now };
    runtime.state.combatLogAggregateState[key].timer = queueCombatLogTimer(runtime, runtime.handlers.flushCombatLogAggregate.bind(void 0, key, winMs), winMs + 10);
  }

  // modules/ui/combat-log-view.mjs
  function createCombatLogView(deps) {
    const runtime = {
      deps,
      state: {},
      handlers: {},
      api: null,
      active: true,
      owner: deps.game,
      timers: /* @__PURE__ */ new Set(),
      frames: /* @__PURE__ */ new Set(),
      toasts: /* @__PURE__ */ new Set(),
      listeners: [],
      log: null
    };
    const handlers = { resumeMobileToastsAfterResult, pumpMobileToastQueue, flushLogQueue, flushCombatLogAggregate, shouldShowMobileToast, stripHtmlMessage, enqueueMobileToast, registerCombatLogItemSnapshot, decorateCombatLogItemMessage, renderCombatLogIcon, decorateCombatLogMessage, scrollCombatLogToLatest, isCombatLogRateLimited, pushCombatLogLine, queueAggregatedCombatLog };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = name === "scrollCombatLogToLatest" ? handler : handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = { shouldShowMobileToast: runtime.handlers.shouldShowMobileToast, stripHtmlMessage: runtime.handlers.stripHtmlMessage, enqueueMobileToast: runtime.handlers.enqueueMobileToast, pumpMobileToastQueue: runtime.handlers.pumpMobileToastQueue, registerCombatLogItemSnapshot: runtime.handlers.registerCombatLogItemSnapshot, decorateCombatLogItemMessage: runtime.handlers.decorateCombatLogItemMessage, renderCombatLogIcon: runtime.handlers.renderCombatLogIcon, decorateCombatLogMessage: runtime.handlers.decorateCombatLogMessage, scrollCombatLogToLatest: runtime.handlers.scrollCombatLogToLatest, isCombatLogRateLimited: runtime.handlers.isCombatLogRateLimited, pushCombatLogLine: runtime.handlers.pushCombatLogLine, queueAggregatedCombatLog: runtime.handlers.queueAggregatedCombatLog };
    for (const [name, handler] of Object.entries(runtime.api)) runtime.api[name] = (...args) => {
      if (!runtime.active) return;
      syncCombatLogOwner(runtime);
      return handler(...args);
    };
    runtime.api.itemSnapshot = (token) => {
      if (!runtime.active) return;
      syncCombatLogOwner(runtime);
      return runtime.state.combatLogItemSnapshots.get(Number(token));
    };
    runtime.api.addLog = (message, kind, options = {}) => {
      if (!runtime.active) return;
      syncCombatLogOwner(runtime);
      return addLog(runtime, message, kind, options);
    };
    runtime.api.dispose = () => disposeCombatLog(runtime);
    installCombatLogEvents(runtime);
    return Object.freeze(runtime.api);
  }
  function addLog(runtime, message, kind, options) {
    const { deps } = runtime, owner = deps.game;
    if (owner.isBackgroundCalculation) return;
    const now = deps.performance.now(), settings = owner.settings || {};
    if (isCombatLogRateLimited(runtime, options, settings, now)) return;
    if (options.item) message = decorateCombatLogItemMessage(runtime, message, options.item);
    message = decorateCombatLogMessage(runtime, message, kind, options);
    if (options.aggregateKey && settings.combatLogAggregate !== false) return queueAggregatedCombatLog(runtime, message, kind, options, now);
    pushCombatLogLine(runtime, message, kind);
    showLogToast(runtime, message, kind, options);
  }
  function showLogToast(runtime, message, kind, options) {
    if (options.toast && typeof runtime.deps.showGameToast === "function") {
      const tone = options.toastTone || (kind === "loot-unique" ? "success" : kind === "attack-monster" ? "warning" : "info");
      runtime.deps.showGameToast(stripHtmlMessage(runtime, message) || String(message || ""), { tone });
    } else if (shouldShowMobileToast(runtime, message, kind, options)) enqueueMobileToast(runtime, message, kind);
  }
  function installCombatLogEvents(runtime) {
    const { deps } = runtime;
    listenView(runtime, deps.window, "project-idle:ground-damage", (event) => {
      const { name, element, damage, persistent } = event.detail;
      const values = { name, element: deps.getDamageElementLabel(element), damage };
      const text = persistent ? deps._t("{name} [{element}] 지속 피해 {damage}", values) : deps._t("{name} 발동 [{element}] ({damage} 피해)", values);
      runtime.api.addLog(text, "attack-monster", { noToast: true, element });
    });
    listenView(runtime, deps.window, "project-idle:colony-defense-failed", (event) => {
      const { wave, background } = event.detail;
      runtime.api.addLog(
        deps._t("군락 핵이 파괴되어 {wave}웨이브 방어에 실패했습니다. 귀환하며 이미 획득한 보상은 유지됩니다.", { wave }),
        "attack-monster",
        { noToast: !!background }
      );
    });
  }
  function initialize(runtime) {
    runtime.state.mobileToastQueue = [];
    runtime.state.mobileToastResultHoldTimer = null;
    runtime.state.mobileToastActiveCount = 0;
    runtime.state.MOBILE_TOAST_MAX_CONCURRENT = 1;
    runtime.state.logQueue = [];
    runtime.state.logFlushRaf = 0;
    runtime.state.combatLogRateState = {};
    runtime.state.combatLogAggregateState = {};
    runtime.state.combatLogItemSequence = 0;
    runtime.state.combatLogItemSnapshots = /* @__PURE__ */ new Map();
    runtime.state.COMBAT_LOG_FLUSH_MS = 150;
    runtime.state.lastLogFlushAt = -Infinity;
  }

  // modules/combat-log-ui-classic.mjs
  var combatLogView = createCombatLogView({
    get window() {
      return window;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get isTutorialOpen() {
      return typeof isTutorialOpen === "undefined" ? void 0 : isTutorialOpen;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get stripDecorativeEmoji() {
      return stripDecorativeEmoji;
    },
    get getInventoryItemVisualAsset() {
      return typeof getInventoryItemVisualAsset === "undefined" ? void 0 : getInventoryItemVisualAsset;
    },
    get _t() {
      return _t;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get getDamageElementLabel() {
      return getDamageElementLabel;
    },
    get performance() {
      return performance;
    }
  });
  window.GameModules.combatLogView = combatLogView;
  safeExposeGlobals({
    addLog: combatLogView.addLog,
    shouldShowMobileToast: combatLogView.shouldShowMobileToast,
    stripHtmlMessage: combatLogView.stripHtmlMessage,
    enqueueMobileToast: combatLogView.enqueueMobileToast,
    pumpMobileToastQueue: combatLogView.pumpMobileToastQueue,
    registerCombatLogItemSnapshot: combatLogView.registerCombatLogItemSnapshot,
    decorateCombatLogItemMessage: combatLogView.decorateCombatLogItemMessage,
    renderCombatLogIcon: combatLogView.renderCombatLogIcon,
    decorateCombatLogMessage: combatLogView.decorateCombatLogMessage,
    scrollCombatLogToLatest: combatLogView.scrollCombatLogToLatest,
    isCombatLogRateLimited: combatLogView.isCombatLogRateLimited,
    pushCombatLogLine: combatLogView.pushCombatLogLine,
    queueAggregatedCombatLog: combatLogView.queueAggregatedCombatLog
  });
})();
