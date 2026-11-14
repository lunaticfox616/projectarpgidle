// GENERATED from modules/ui-window-manager*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowGetComputedStyle = (...args) => globalThis.getComputedStyle(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);
  var windowStructuredClone = (...args) => globalThis.structuredClone(...args);

  // modules/ui/window-layout-store.mjs
  function getDefaultLayoutState(runtime) {
    return { version: runtime.state.UI_LAYOUT_VERSION, passiveTreePresentationVersion: runtime.state.PASSIVE_TREE_PRESENTATION_VERSION, workspacePresentationVersion: runtime.state.WORKSPACE_PRESENTATION_VERSION, windows: {}, community: { open: false, width: runtime.state.DEFAULT_COMMUNITY_WIDTH }, goals: { expanded: false, pinned: false }, combatLog: { expanded: false } };
  }
  function readStoredLayout(runtime) {
    try {
      let raw = runtime.deps.window.localStorage && runtime.deps.window.localStorage.getItem(runtime.state.UI_LAYOUT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      runtime.deps.console.warn("UI layout state ignored:", error);
      return null;
    }
  }
  function normalizeLayoutState(runtime, raw) {
    let base = getDefaultLayoutState(runtime);
    let next = raw && typeof raw === "object" ? raw : {};
    let state = { ...base, ...next, version: runtime.state.UI_LAYOUT_VERSION };
    state.windows = next.windows && typeof next.windows === "object" ? next.windows : {};
    applyWindowPresentationUpdates(runtime, state, next);
    state.community = { ...base.community, ...next.community && typeof next.community === "object" ? next.community : {} };
    state.community.width = clampNumberLocal(runtime, state.community.width, runtime.state.COMMUNITY_MIN_WIDTH, runtime.state.COMMUNITY_MAX_WIDTH, runtime.state.DEFAULT_COMMUNITY_WIDTH);
    state.goals = { ...base.goals, ...next.goals && typeof next.goals === "object" ? next.goals : {} };
    state.combatLog = normalizeCombatLogLayout(runtime, base.combatLog, next.combatLog);
    return state;
  }
  function normalizeCombatLogLayout(runtime, base, stored) {
    const combatLog = { ...base, ...stored && typeof stored === "object" ? stored : {} };
    if (combatLog.reserve != null) combatLog.reserve = clampNumberLocal(runtime, combatLog.reserve, runtime.state.COMBAT_LOG_RESERVE_MIN, 4e3, runtime.state.COMBAT_LOG_RESERVE_MIN);
    return combatLog;
  }
  function applyWindowPresentationUpdates(runtime, state, next) {
    if ((Number(next.passiveTreePresentationVersion) || 0) < runtime.state.PASSIVE_TREE_PRESENTATION_VERSION) {
      state.windows = { ...state.windows, "tab-char": { ...state.windows["tab-char"] || {}, maximized: true } };
    }
    state.passiveTreePresentationVersion = runtime.state.PASSIVE_TREE_PRESENTATION_VERSION;
    let previousWorkspaceVersion = Number(next.workspacePresentationVersion) || 0;
    if (previousWorkspaceVersion < runtime.state.WORKSPACE_PRESENTATION_VERSION) {
      state.windows = { ...state.windows };
      ["tab-items", "tab-skills", "tab-map"].forEach((id) => {
        state.windows[id] = { ...state.windows[id], maximized: false, docked: true, restoreRect: null };
      });
    }
    state.workspacePresentationVersion = runtime.state.WORKSPACE_PRESENTATION_VERSION;
  }
  function closePersistedSurfacesForBoot(runtime) {
    Object.keys(runtime.state.layoutState.windows).forEach((tabId) => {
      let stored = runtime.state.layoutState.windows[tabId];
      if (!stored || typeof stored !== "object") return;
      runtime.state.layoutState.windows[tabId] = { ...stored, open: false, minimized: false };
    });
    runtime.state.layoutState.community.open = false;
    saveLayoutState(runtime);
  }
  function saveLayoutState(runtime) {
    if (runtime.deps.game.isGuideReplay) return;
    try {
      if (runtime.deps.window.localStorage) runtime.deps.window.localStorage.setItem(runtime.state.UI_LAYOUT_STORAGE_KEY, JSON.stringify(runtime.state.layoutState));
    } catch (error) {
      runtime.deps.console.warn("UI layout state save failed:", error);
    }
  }
  function clampNumberLocal(runtime, value, min, max, fallback) {
    let num = Number(value);
    if (!Number.isFinite(num)) num = fallback;
    return Math.max(min, Math.min(max, Math.round(num)));
  }

  // modules/ui/window-geometry.mjs
  function getDesktopRailInset(runtime) {
    if (runtime.state.railDockHome) return runtime.state.WORKSPACE_EDGE;
    let rail = runtime.deps.document.querySelector(".tab-header");
    let rect = rail && typeof rail.getBoundingClientRect === "function" ? rail.getBoundingClientRect() : null;
    if (!rect || !Number.isFinite(rect.right) || rect.right <= 0) return runtime.state.DESKTOP_RAIL_WIDTH;
    return Math.ceil(rect.right / runtime.deps.uiDisplay.factor + runtime.state.WORKSPACE_GAP / 2);
  }
  function getHudBarTop(runtime, shell) {
    let rect = shell.getBoundingClientRect();
    let bar = runtime.deps.window.getComputedStyle(shell, "::before");
    let top = (0, runtime.deps.parseFloat)(bar.top);
    if (!(rect.height > 0) || !(shell.offsetHeight > 0) || bar.position !== "absolute" || !Number.isFinite(top)) return NaN;
    return rect.top + top * rect.height / shell.offsetHeight;
  }
  function getDockedHudTop(runtime, hud) {
    let shell = hud.querySelector(".player-hud-shell");
    let barTop = shell ? getHudBarTop(runtime, shell) : NaN;
    if (barTop > 0) return barTop;
    let rect = hud.getBoundingClientRect();
    return rect.height > 0 ? rect.top : NaN;
  }
  function getDockedHudInset(runtime, viewHeight) {
    let hud = runtime.state.railDockHome ? runtime.deps.document.querySelector(".player-hud") : null;
    let top = hud ? getDockedHudTop(runtime, hud) : NaN;
    if (!(top > 0)) return runtime.state.WORKSPACE_EDGE;
    return Math.ceil(viewHeight - top / runtime.deps.uiDisplay.factor + runtime.state.WORKSPACE_GAP / 2);
  }
  function getWorkspaceRect(runtime) {
    let width = Math.max(320, runtime.deps.window.innerWidth / runtime.deps.uiDisplay.factor || 1280);
    let height = Math.max(260, runtime.deps.window.innerHeight / runtime.deps.uiDisplay.factor || 720);
    let railInset = getDesktopRailInset(runtime);
    let hudInset = getDockedHudInset(runtime, height);
    return { left: railInset, top: runtime.state.WORKSPACE_EDGE, width: Math.max(240, width - railInset - runtime.state.WORKSPACE_GAP), height: Math.max(260, height - runtime.state.WORKSPACE_EDGE - hudInset) };
  }
  function getFreeWindowRect(runtime) {
    let rect = getWorkspaceRect(runtime);
    let viewBottom = Math.max(260, runtime.deps.window.innerHeight / runtime.deps.uiDisplay.factor || 720) - runtime.state.WORKSPACE_EDGE;
    return { ...rect, height: Math.max(rect.height, viewBottom - rect.top) };
  }
  function getDockFitWidth(runtime, tabId) {
    const el = tabId && runtime.deps.document.getElementById(tabId), fit = el && el.querySelector("[data-dock-fit]");
    if (!fit || !fit.getClientRects().length) return null;
    const need = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(fit).getPropertyValue("--dock-fit-width"));
    if (!(need > 0)) return null;
    return need + (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(el).width) - (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(fit).width);
  }
  function getDockRect(runtime, tabId) {
    let rect = getWorkspaceRect(runtime);
    let width = clampNumberLocal(runtime, rect.width * runtime.state.DOCK_RATIO, runtime.state.DOCK_MIN_WIDTH, runtime.state.DOCK_MAX_WIDTH, runtime.state.DOCK_MIN_WIDTH);
    let fit = getDockFitWidth(runtime, tabId);
    if (fit) width = Math.max(runtime.state.DOCK_MIN_WIDTH, Math.min(width, Math.ceil(fit)));
    if (rect.width - width - runtime.state.WORKSPACE_GAP < runtime.state.DOCK_MIN_BATTLE_WIDTH) return null;
    return { x: rect.left + rect.width - width, y: rect.top, width, height: rect.height };
  }
  function createResolveWindowPlacement(runtime) {
    return function resolveWindowPlacement(box, rect, maximized, docked, tabId) {
      let dockRect = docked && !maximized ? getDockRect(runtime, tabId) : null;
      if (dockRect) return { box: dockRect, dockActive: true };
      let area = maximized ? getFreeWindowRect(runtime) : rect;
      if (maximized || docked) return { box: { x: area.left, y: area.top, width: area.width, height: area.height }, dockActive: false };
      return { box, dockActive: false };
    };
  }
  function isDockPreferred(runtime, tabId, stored) {
    return stored.docked === void 0 ? !!runtime.state.WINDOW_DEFS[tabId].dock : !!stored.docked;
  }
  function getWindowState(runtime, tabId) {
    let def = runtime.state.WINDOW_DEFS[tabId];
    let stored = runtime.state.layoutState.windows[tabId] || {};
    let rect = getWorkspaceRect(runtime), free = getFreeWindowRect(runtime);
    let minWidth = Math.min(def.minWidth, free.width);
    let minHeight = Math.min(def.minHeight, free.height);
    let width = clampNumberLocal(runtime, stored.width, minWidth, free.width, Math.min(def.width, rect.width));
    let height = clampNumberLocal(runtime, stored.height, minHeight, free.height, Math.min(def.height, rect.height));
    let x = clampNumberLocal(runtime, stored.x, free.left, free.left + free.width - width, Math.min(def.x, rect.left + rect.width - width));
    let y = clampNumberLocal(runtime, stored.y, free.top, free.top + free.height - height, Math.min(def.y, rect.top + rect.height - height));
    let maximized = stored.maximized === void 0 ? !!def.defaultMaximized : !!stored.maximized;
    let restoreRect = stored.restoreRect || (maximized ? { x, y, width, height } : null);
    let docked = isDockPreferred(runtime, tabId, stored);
    let placement = runtime.handlers.resolveWindowPlacement({ x, y, width, height }, rect, maximized, docked, tabId);
    return { open: !!stored.open, minimized: !!stored.minimized, maximized, docked, dockActive: placement.dockActive, restoreRect, ...placement.box };
  }
  function persistWindowState(runtime, tabId, patch) {
    let cur = getWindowState(runtime, tabId);
    delete cur.dockActive;
    runtime.state.layoutState.windows[tabId] = { ...cur, ...patch };
    saveLayoutState(runtime);
  }

  // modules/ui/window-queries.mjs
  function closeRailMiscPanel(runtime) {
    let panel = runtime.deps.document.getElementById("ui-rail-misc-panel");
    let trigger = runtime.deps.document.getElementById("btn-ui-rail-misc");
    if (panel) panel.hidden = true;
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }
  function isDesktopWindowed(runtime) {
    return !!(runtime.deps.window.matchMedia && runtime.deps.uiDisplay.matches(runtime.state.DESKTOP_MEDIA));
  }
  function isMenuUnlocked(runtime, tabId) {
    let button = runtime.deps.document.getElementById("btn-" + tabId);
    return !!button && !button.hidden && button.style.display !== "none";
  }
  function mergedWindowOf(runtime, tabId) {
    let button = runtime.deps.document.getElementById("btn-" + tabId), groupKey = button ? button.dataset.mergedTabGroup || button.dataset.mergedTabLauncher : "";
    let launcher = groupKey ? runtime.deps.document.querySelector('.tab-btn[data-merged-tab-launcher="' + groupKey + '"]') : null;
    if (!launcher) return null;
    let windowId = launcher.id.replace(/^btn-/, ""), pane = runtime.deps.document.querySelector("#" + windowId + " .merged-subtab-pane.active");
    return { windowId, shownId: pane ? pane.dataset.tabId : "" };
  }

  // modules/ui/window-frame-queue.mjs
  function requestCanvasResize(runtime) {
    queueWindowFrame(runtime, "canvasResizeFrame", () => {
      if (typeof runtime.deps.scheduleStableResize === "function") (0, runtime.deps.scheduleStableResize)();
      else if (typeof runtime.deps.resizeCanvas === "function") (0, runtime.deps.resizeCanvas)();
    });
  }
  function queueWindowFrame(runtime, key, callback) {
    if (!runtime.active || runtime.state[key]) return;
    const owner = runtime.deps.game;
    runtime.state[key] = runtime.deps.requestAnimationFrame(() => {
      runtime.frames.delete(key);
      runtime.state[key] = 0;
      if (runtime.active && owner === runtime.deps.game) callback();
    });
    runtime.frames.add(key);
  }
  function cancelWindowFrame(runtime, key) {
    if (runtime.state[key]) runtime.deps.cancelAnimationFrame(runtime.state[key]);
    runtime.state[key] = 0;
    runtime.frames.delete(key);
  }
  function cancelWindowFrames(runtime) {
    for (const key of runtime.frames) cancelWindowFrame(runtime, key);
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

  // modules/ui/window-gesture-lifetime.mjs
  function beginCapturedWindowGesture(runtime, handle, pointerId, callbacks) {
    cancelWindowGesture(runtime);
    const owner = runtime.deps.game;
    const gesture = { active: true, listeners: [], handle, cancelWindowPointer: () => finishWindowPointer(false) };
    const finishWindowPointer = (commit) => {
      if (!gesture.active) return;
      releaseViewEvents(gesture);
      runtime.state.gesture = null;
      if (handle.hasPointerCapture?.(pointerId)) handle.releasePointerCapture(pointerId);
      if (callbacks.text) holdTextStill(runtime, false);
      callbacks.finish(commit && runtime.active && owner === runtime.deps.game && handle.isConnected);
    };
    runtime.state.gesture = gesture;
    handle.setPointerCapture(pointerId);
    if (callbacks.text) holdTextStill(runtime, true);
    listenView(gesture, handle, "pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      if (!runtime.active || owner !== runtime.deps.game || !handle.isConnected) {
        finishWindowPointer(false);
        return;
      }
      callbacks.move(event);
    });
    listenView(gesture, handle, "pointerup", (event) => {
      if (event.pointerId === pointerId) finishWindowPointer(true);
    });
    listenView(gesture, handle, "pointercancel", (event) => {
      if (event.pointerId === pointerId) finishWindowPointer(false);
    });
    listenView(gesture, handle, "lostpointercapture", (event) => {
      if (event.pointerId === pointerId) finishWindowPointer(false);
    });
  }
  function cancelWindowGesture(runtime, root) {
    const gesture = runtime.state.gesture;
    if (!gesture || root && !root.contains(gesture.handle)) return;
    gesture.cancelWindowPointer();
  }
  function stopTextDrag(runtime, event) {
    return event.preventDefault();
  }
  function holdTextStill(runtime, on) {
    runtime.deps.document.documentElement.classList.toggle("ui-window-gesture", on);
    runtime.deps.document[on ? "addEventListener" : "removeEventListener"]("selectstart", runtime.handlers.stopTextDrag, true);
    runtime.deps.document[on ? "addEventListener" : "removeEventListener"]("dragstart", runtime.handlers.stopTextDrag, true);
    if (on) runtime.deps.window.getSelection()?.removeAllRanges();
  }

  // modules/ui/window-view-lifetime.mjs
  function syncWindowOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    const guide = runtime.state.guideLayout;
    if (guide && guide.example !== runtime.deps.game) {
      if (runtime.state.layoutState === guide.guideLayout) {
        runtime.state.layoutState = guide.previousLayout;
        runtime.state.zOrder = guide.previousOrder;
      }
      runtime.state.guideLayout = null;
    }
    clearWindowWork(runtime);
    const goal = runtime.state.goalRuntime;
    goal.currentGoal = null;
    goal.signature = "";
    goal.pendingAutoExpand = false;
    const drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (drawer) drawer.style.display = "none";
  }
  function clearWindowWork(runtime) {
    cancelWindowGesture(runtime);
    cancelWindowFrames(runtime);
    const goal = runtime.state.goalRuntime;
    runtime.deps.clearTimeout(goal.collapseTimer);
    runtime.deps.clearTimeout(goal.flashTimer);
    goal.collapseTimer = goal.flashTimer = null;
    runtime.deps.document.getElementById("ui-goal-drawer")?.classList.remove("ui-goal-flash");
  }
  function listenWindow(runtime, target, type, callback, options) {
    if (runtime.listeners.some((b) => b.target === target && b.type === type && b.listener.windowCallback === callback)) return;
    const listener = (...args) => {
      if (!runtime.active) return;
      syncWindowOwner(runtime);
      return callback(...args);
    };
    listener.windowCallback = callback;
    listenView(runtime, target, type, listener, options);
  }
  function releaseWindowTree(runtime, root) {
    const targets = new Set(runtime.listeners.filter((b) => b.target === root || b.target.nodeType && root.contains(b.target)).map((b) => b.target));
    for (const target of targets) releaseViewTarget(runtime, target);
  }

  // modules/ui/window-panels.mjs
  function watchDockFit(runtime, el) {
    const fit = el.querySelector("[data-dock-fit]");
    if (!fit || typeof runtime.deps.ResizeObserver !== "function") return;
    runtime.state.dockFitWatch = runtime.state.dockFitWatch || new runtime.deps.ResizeObserver(() => {
      queueWindowFrame(runtime, "dockFitFrame", () => refitDockedWindows(runtime));
    });
    runtime.state.dockFitWatch.observe(fit);
  }
  function refitDockedWindows(runtime) {
    Object.keys(runtime.state.WINDOW_DEFS).forEach((id) => {
      if (getWindowState(runtime, id).dockActive) applyWindowState(runtime, id);
    });
    syncWorkspacePresentation(runtime);
  }
  function windowEdgesAt(runtime, el, event) {
    if (!el.classList.contains("ui-window") || el.classList.contains("ui-window-maximized") || el.classList.contains("ui-window-minimized")) return "";
    const rect = el.getBoundingClientRect(), band = Math.max(runtime.state.EDGE_GRAB_PX, (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(el).borderTopWidth) || 0);
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    return (y < band ? "n" : y > rect.height - band ? "s" : "") + (x < band ? "w" : x > rect.width - band ? "e" : "");
  }
  function prepareWindow(runtime, tabId) {
    let el = runtime.deps.document.getElementById(tabId);
    let def = runtime.state.WINDOW_DEFS[tabId];
    if (!el || !def || el.dataset.windowPrepared === "1") return;
    let body = runtime.deps.document.createElement("div");
    body.className = "ui-window-body";
    while (el.firstChild) body.appendChild(el.firstChild);
    let titlebar = runtime.deps.document.createElement("div");
    titlebar.className = "ui-window-titlebar";
    titlebar.innerHTML = `<div class="ui-window-title" id="ui-window-title-${tabId}" data-i18n>${(0, runtime.deps._t)(def.title)}</div><div class="ui-window-actions"><button type="button" data-window-action="reset" aria-label="${(0, runtime.deps._t)("창 위치와 크기 되돌리기")}" data-tip="${(0, runtime.deps._t)("창 위치와 크기 되돌리기")}">↺</button><button type="button" data-window-action="minimize" aria-label="${(0, runtime.deps._t)("최소화")}" data-tip="${(0, runtime.deps._t)("최소화")}">—</button><button type="button" data-window-action="maximize" aria-label="${(0, runtime.deps._t)("최대화 또는 원래 크기")}" data-tip="${(0, runtime.deps._t)("최대화 / 원래 크기")}">□</button><button type="button" data-window-action="close" aria-label="${(0, runtime.deps._t)("닫기")}" data-tip="${(0, runtime.deps._t)("닫기 (Esc)")}">✕</button></div>`;
    el.classList.add("ui-window");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-labelledby", `ui-window-title-${tabId}`);
    el.tabIndex = -1;
    el.dataset.windowPrepared = "1";
    el.prepend(titlebar);
    el.appendChild(body);
    listenWindow(runtime, titlebar, "pointerdown", (event) => beginWindowDrag(runtime, event, tabId));
    listenWindow(runtime, titlebar, "dblclick", () => toggleMaximizeWindow(runtime, tabId));
    if (el.dataset.windowInputBound !== "1") {
      listenWindow(runtime, el, "pointerdown", (event) => {
        focusWindow(runtime, tabId);
        const edges = event.target === el ? windowEdgesAt(runtime, el, event) : "";
        if (edges) beginWindowResize(runtime, event, tabId, edges);
      });
      listenWindow(runtime, el, "pointermove", (event) => {
        if (event.buttons) return;
        const cursor = event.target === el ? runtime.state.EDGE_CURSORS[windowEdgesAt(runtime, el, event)] || "" : "";
        if (el.style.cursor !== cursor) el.style.cursor = cursor;
      });
      listenWindow(runtime, el, "click", (event) => handleWindowActionClick(runtime, event, tabId));
      watchDockFit(runtime, el);
      el.dataset.windowInputBound = "1";
    }
  }
  function applyWindowState(runtime, tabId) {
    let el = runtime.deps.document.getElementById(tabId);
    if (!el) return;
    let st = getWindowState(runtime, tabId);
    el.style.left = `${st.x}px`;
    el.style.top = `${st.y}px`;
    el.style.width = `${st.width}px`;
    el.style.height = `${st.height}px`;
    el.classList.toggle("ui-window-open", st.open && !st.minimized);
    el.classList.toggle("ui-window-minimized", st.minimized);
    el.classList.toggle("ui-window-maximized", st.maximized);
    el.classList.toggle("ui-window-docked", st.dockActive);
    if (st.dockActive && st.open && !st.minimized) {
      let fitted = getWindowState(runtime, tabId);
      if (fitted.width !== st.width) {
        el.style.left = `${fitted.x}px`;
        el.style.width = `${fitted.width}px`;
      }
    }
    let btn = runtime.deps.document.getElementById("btn-" + tabId);
    if (btn) {
      btn.classList.toggle("ui-window-open", st.open);
      btn.classList.toggle("ui-window-minimized-btn", st.minimized);
      btn.setAttribute("aria-pressed", st.open && !st.minimized ? "true" : "false");
    }
  }
  function syncWorkspacePresentation(runtime) {
    let activeWindowId = runtime.state.zOrder.slice().reverse().find((id) => {
      let state = runtime.state.layoutState.windows[id];
      return state && state.open && !state.minimized;
    }) || "";
    let managementMode = isDesktopWindowed(runtime) && !!activeWindowId;
    runtime.deps.document.body.classList.toggle("ui-management-mode", managementMode);
    syncWorkspaceDock(runtime, managementMode ? activeWindowId : "");
    runtime.deps.document.body.classList.toggle("ui-combat-mode", isDesktopWindowed(runtime) && !managementMode);
    if (runtime.deps.document.body.dataset) {
      if (activeWindowId) runtime.deps.document.body.dataset.activeGameWindow = activeWindowId;
      else delete runtime.deps.document.body.dataset.activeGameWindow;
    }
  }
  function syncWorkspaceDock(runtime, activeWindowId) {
    let state = activeWindowId && runtime.state.WINDOW_DEFS[activeWindowId] ? getWindowState(runtime, activeWindowId) : null;
    let docked = !!(state && state.dockActive);
    runtime.deps.document.body.classList.toggle("ui-workspace-docked", docked);
    if (docked) runtime.deps.document.body.style.setProperty("--workspace-dock-width", `${state.width}px`);
  }
  function focusWindow(runtime, tabId) {
    if (!isDesktopWindowed(runtime)) return;
    runtime.state.zOrder = runtime.state.zOrder.filter((id) => id !== tabId).concat(tabId);
    runtime.state.zOrder.forEach((id, index) => {
      let el2 = runtime.deps.document.getElementById(id);
      if (el2) el2.style.zIndex = String(1200 + index);
    });
    let el = runtime.deps.document.getElementById(tabId);
    runtime.deps.document.querySelectorAll(".ui-window-active").forEach((node) => node.classList.remove("ui-window-active"));
    if (el) {
      el.classList.add("ui-window-active");
      el.focus && el.focus({ preventScroll: true });
    }
    syncWorkspacePresentation(runtime);
  }
  function closeOtherDockedWindows(runtime, tabId) {
    if (!getWindowState(runtime, tabId).dockActive) return;
    Object.keys(runtime.state.WINDOW_DEFS).forEach((id) => {
      if (id === tabId || !runtime.state.layoutState.windows[id] || !runtime.state.layoutState.windows[id].open) return;
      if (!getWindowState(runtime, id).dockActive) return;
      persistWindowState(runtime, id, { open: false, minimized: false });
      applyWindowState(runtime, id);
    });
  }
  function openWindow(runtime, tabId) {
    if (!runtime.state.WINDOW_DEFS[tabId]) return false;
    prepareWindow(runtime, tabId);
    closeOtherDockedWindows(runtime, tabId);
    persistWindowState(runtime, tabId, { open: true, minimized: false });
    applyWindowState(runtime, tabId);
    focusWindow(runtime, tabId);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
    return true;
  }
  function closeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    persistWindowState(runtime, tabId, { open: false, minimized: false });
    applyWindowState(runtime, tabId);
    let el = runtime.deps.document.getElementById(tabId);
    if (el) el.classList.remove("ui-window-active");
    let nextTop = runtime.state.zOrder.slice().reverse().find((id) => {
      let st = runtime.state.layoutState.windows[id];
      return id !== tabId && st && st.open && !st.minimized;
    });
    if (nextTop) focusWindow(runtime, nextTop);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
  }
  function closeAllWindows(runtime) {
    cancelWindowGesture(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach((tabId) => {
      let st = runtime.state.layoutState.windows[tabId];
      if (!st || !st.open && !st.minimized) return;
      runtime.state.layoutState.windows[tabId] = { ...st, open: false, minimized: false };
      applyWindowState(runtime, tabId);
      let el = runtime.deps.document.getElementById(tabId);
      if (el) el.classList.remove("ui-window-active");
    });
    saveLayoutState(runtime);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
  }
  function beginGuideWindowLayout(runtime, liveOwner) {
    if (!isDesktopWindowed(runtime)) return null;
    const previousLayout = runtime.state.layoutState, previousOrder = runtime.state.zOrder;
    const previousActive = runtime.deps.document.querySelector(".ui-window-active")?.id;
    runtime.state.layoutState = (0, runtime.deps.structuredClone)(runtime.state.layoutState);
    const guideLayout = runtime.state.layoutState;
    const lease = { example: runtime.deps.game, previousLayout, previousOrder, guideLayout, restored: false };
    runtime.state.guideLayout = lease;
    closeAllWindows(runtime);
    return () => {
      if (!runtime.active || runtime.deps.game !== liveOwner || lease.restored) return;
      if (runtime.state.layoutState !== guideLayout && runtime.state.layoutState !== previousLayout) return;
      lease.restored = true;
      runtime.state.guideLayout = null;
      runtime.state.layoutState = previousLayout;
      runtime.state.zOrder = previousOrder;
      runtime.deps.document.querySelectorAll(".ui-window[data-window-prepared]").forEach((windowNode) => {
        windowNode.classList.remove("ui-window-active");
        applyWindowState(runtime, windowNode.id);
      });
      if (previousActive) focusWindow(runtime, previousActive);
      else syncWorkspacePresentation(runtime);
    };
  }
  function minimizeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    persistWindowState(runtime, tabId, { open: true, minimized: true });
    applyWindowState(runtime, tabId);
    syncWorkspacePresentation(runtime);
  }
  function toggleMaximizeWindow(runtime, tabId) {
    const panel = runtime.deps.document.getElementById(tabId);
    if (panel) cancelWindowGesture(runtime, panel);
    let st = getWindowState(runtime, tabId);
    let rect = getFreeWindowRect(runtime);
    if (st.maximized) {
      persistWindowState(runtime, tabId, { ...st.restoreRect || {}, maximized: false, restoreRect: null });
    } else {
      persistWindowState(runtime, tabId, { x: rect.left, y: rect.top, width: rect.width, height: rect.height, maximized: true, restoreRect: { x: st.x, y: st.y, width: st.width, height: st.height } });
    }
    applyWindowState(runtime, tabId);
    focusWindow(runtime, tabId);
  }
  function resetWindow(runtime, tabId) {
    runtime.state.layoutState.windows[tabId] = { maximized: false };
    saveLayoutState(runtime);
    openWindow(runtime, tabId);
  }
  function handleWindowActionClick(runtime, event, tabId) {
    let button = event.target.closest("[data-window-action]");
    if (!button) return;
    event.stopPropagation();
    let action = button.dataset.windowAction;
    if (action === "close") closeWindow(runtime, tabId);
    if (action === "minimize") minimizeWindow(runtime, tabId);
    if (action === "maximize") toggleMaximizeWindow(runtime, tabId);
    if (action === "reset") resetWindow(runtime, tabId);
  }
  function undockPatch(runtime, state, pendingValue) {
    return state.dockActive && pendingValue !== void 0 ? { docked: false } : {};
  }
  function beginWindowDrag(runtime, event, tabId) {
    if (event.button !== void 0 && event.button !== 0) return;
    if (event.target.closest("button,input,select,textarea,a")) return;
    cancelWindowGesture(runtime);
    let titlebar = event.currentTarget;
    let el = runtime.deps.document.getElementById(tabId);
    let st = getWindowState(runtime, tabId);
    if (st.maximized) return;
    let startX = event.clientX;
    let startY = event.clientY;
    delete el.dataset.pendingX;
    delete el.dataset.pendingY;
    focusWindow(runtime, tabId);
    event.preventDefault();
    let move = (moveEvent) => {
      let rect = getFreeWindowRect(runtime);
      let x = clampNumberLocal(runtime, st.x + (moveEvent.clientX - startX) / runtime.deps.uiDisplay.factor, rect.left, rect.left + rect.width - st.width, st.x);
      let y = clampNumberLocal(runtime, st.y + (moveEvent.clientY - startY) / runtime.deps.uiDisplay.factor, rect.top, rect.top + rect.height - st.height, st.y);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.dataset.pendingX = String(x);
      el.dataset.pendingY = String(y);
    };
    let finish = (commit) => {
      if (commit) persistWindowState(runtime, tabId, { x: Number(el.dataset.pendingX || st.x), y: Number(el.dataset.pendingY || st.y), ...undockPatch(runtime, st, el.dataset.pendingX) });
      delete el.dataset.pendingX;
      delete el.dataset.pendingY;
      applyWindowState(runtime, tabId);
      syncWorkspacePresentation(runtime);
    };
    beginCapturedWindowGesture(runtime, titlebar, event.pointerId, { move, finish, text: true });
  }
  function createWindowResizeAxis(runtime) {
    return function windowResizeAxis(pos, size, delta, movesStart, limits) {
      const [min, lo, hi] = limits;
      if (!movesStart) return [pos, clampNumberLocal(runtime, size + delta, Math.min(min, hi - pos), hi - pos, size)];
      const end = pos + size, start = clampNumberLocal(runtime, pos + delta, lo, end - min, pos);
      return [start, end - start];
    };
  }
  function createWindowResizedRect(runtime) {
    return function windowResizedRect(st, def, edges, dx, dy) {
      const rect = getFreeWindowRect(runtime);
      const [x, width] = /[ew]/.test(edges) ? runtime.handlers.windowResizeAxis(st.x, st.width, dx, edges.includes("w"), [Math.min(def.minWidth, rect.width), rect.left, rect.left + rect.width]) : [st.x, st.width];
      const [y, height] = /[ns]/.test(edges) ? runtime.handlers.windowResizeAxis(st.y, st.height, dy, edges.includes("n"), [Math.min(def.minHeight, rect.height), rect.top, rect.top + rect.height]) : [st.y, st.height];
      return { x, y, width, height };
    };
  }
  function beginWindowResize(runtime, event, tabId, edges = "se") {
    if (event.button !== void 0 && event.button !== 0) return;
    cancelWindowGesture(runtime);
    let handle = event.currentTarget;
    let el = runtime.deps.document.getElementById(tabId);
    let def = runtime.state.WINDOW_DEFS[tabId];
    let st = getWindowState(runtime, tabId);
    if (st.maximized) return;
    let startX = event.clientX;
    let startY = event.clientY;
    let next = { x: st.x, y: st.y, width: st.width, height: st.height };
    delete el.dataset.pendingWidth;
    event.preventDefault();
    let move = (moveEvent) => {
      next = runtime.handlers.windowResizedRect(st, def, edges, (moveEvent.clientX - startX) / runtime.deps.uiDisplay.factor, (moveEvent.clientY - startY) / runtime.deps.uiDisplay.factor);
      Object.assign(el.style, { left: `${next.x}px`, top: `${next.y}px`, width: `${next.width}px`, height: `${next.height}px` });
      el.dataset.pendingWidth = String(next.width);
    };
    let finish = (commit) => {
      if (commit) persistWindowState(runtime, tabId, { ...next, ...undockPatch(runtime, st, el.dataset.pendingWidth) });
      delete el.dataset.pendingWidth;
      applyWindowState(runtime, tabId);
      syncWorkspacePresentation(runtime);
    };
    beginCapturedWindowGesture(runtime, handle, event.pointerId, { move, finish, text: true });
  }
  function openCommunityDock(runtime) {
    if (typeof runtime.deps.messageFrames !== "object" || runtime.deps.window.isTabSurfaceAvailable("tab-social") === false) return;
    if (isDesktopWindowed(runtime)) {
      runtime.deps.messageFrames.showTab("chat");
      return;
    }
    runtime.deps.window.switchTab("tab-battle");
    runtime.deps.messageFrames.showPhoneTab("chat");
  }

  // modules/ui/tab-definitions.mjs
  var MERGED_TAB_GROUPS = Object.freeze({
    growth: { launcher: "tab-char", title: "스킬트리", tabs: [{ id: "tab-char", label: "스킬트리", icon: 2, count: (game) => game.passivePoints, detail: "스킬트리 노드에 포인트를 씁니다." }, { id: "tab-traits", label: "전직", icon: 16, detail: "전직을 고르고 노드와 키스톤을 할당합니다." }, { id: "tab-talent", gate: "talent", label: "재능", icon: 17, detail: "재능 개화 카드를 고르고 키웁니다." }] },
    gear: { launcher: "tab-items", title: "장비", tabs: [{ id: "tab-items", label: "장비", icon: 6, detail: "장비와 가방을 봅니다." }, { id: "tab-skills", label: "스킬룬", icon: 9, detail: "룬을 장착하고 키웁니다." }] },
    loop: { launcher: "tab-season", title: "루프", tabs: [{ id: "tab-season", label: "루프 패시브", icon: 4, count: (game) => game.seasonPoints, detail: "루프 포인트로 영구 노드에 투자합니다." }, { id: "tab-unlocks", label: "해금", icon: 3, count: (game, contentProgression) => contentProgression.points(game).balance, detail: "해금 포인트로 다음 콘텐츠를 고릅니다." }] },
    records: { launcher: "tab-journal", title: "기록", tabs: [{ id: "tab-journal", gate: "journal", label: "이야기 저널", icon: 10, detail: "진행 기록과 안내를 확인합니다." }, { id: "tab-guide", gate: "journal", label: "가이드", icon: 10, detail: "주요 조작을 다시 따라 하거나 용어를 확인합니다." }, { id: "tab-codex", gate: "codex", label: "도감", icon: 13, detail: "발견한 항목과 수집 현황을 확인합니다." }, { id: "tab-records", gate: "journal", label: "기록", icon: 20, detail: "루프 소요 시간과 최고 기록을 확인합니다." }] }
  });

  // modules/ui/window-goal-drawer.mjs
  function mountGoalDrawer(runtime, drawer) {
    let battlefield = isDesktopWindowed(runtime) ? runtime.deps.document.getElementById("battlefield-wrap") : null;
    if (!battlefield) {
      runtime.deps.document.body.appendChild(drawer);
      return;
    }
    battlefield.appendChild(drawer);
  }
  function installGoalDrawer(runtime) {
    let existing = runtime.deps.document.getElementById("ui-goal-drawer");
    if (existing) {
      mountGoalDrawer(runtime, existing);
      return;
    }
    let drawer = runtime.deps.document.createElement("div");
    drawer.id = "ui-goal-drawer";
    drawer.className = "ui-goal-drawer";
    drawer.style.display = "none";
    drawer.innerHTML = '<div class="ui-goal-panel"><div id="ui-goal-body"><div class="ui-goal-head-row"><span id="ui-goal-badge" class="ui-goal-badge"></span><button type="button" id="ui-goal-pin" aria-pressed="false" aria-label="목표 서랍 고정">고정</button></div><div id="ui-goal-title" class="ui-goal-title"></div><div id="ui-goal-desc" class="ui-goal-desc"></div><div id="ui-goal-bar" class="ui-goal-bar"><span id="ui-goal-bar-fill" class="ui-goal-bar-fill"></span></div><div id="ui-goal-progress" class="ui-goal-progress"></div><button type="button" id="ui-goal-action" class="ui-goal-action"></button><div id="ui-goal-notices" class="ui-goal-notices"></div></div><button type="button" id="ui-goal-toggle" aria-expanded="false" aria-label="다음 목표 열기/닫기"><span id="ui-goal-handle-icon" class="ui-goal-handle-icon"></span><span id="ui-goal-handle-title" class="ui-goal-handle-title">목표</span><span class="ui-goal-chevron" aria-hidden="true"></span></button><div id="ui-goal-handle-bar" class="ui-goal-handle-bar"><span id="ui-goal-handle-fill" class="ui-goal-handle-fill"></span></div></div>';
    mountGoalDrawer(runtime, drawer);
    listenWindow(runtime, drawer.querySelector("#ui-goal-toggle"), "click", () => toggleGoalDrawer(runtime));
    listenWindow(runtime, drawer.querySelector("#ui-goal-pin"), "click", runtime.handlers.toggleGoalPin);
    drawer.querySelector("#ui-goal-pin").setAttribute("aria-pressed", runtime.state.layoutState.goals.pinned ? "true" : "false");
    listenWindow(runtime, drawer.querySelector("#ui-goal-action"), "click", runtime.handlers.openGoalDrawerTarget);
  }
  function collapseGoalDrawerUnlessPinned(runtime) {
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (!drawer || !drawer.classList.contains("expanded") || runtime.state.layoutState.goals.pinned) return;
    toggleGoalDrawer(runtime, false);
  }
  function toggleGoalDrawer(runtime, force) {
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (!drawer) return;
    let expanded = force === void 0 ? !drawer.classList.contains("expanded") : !!force;
    if (expanded) closeRailMiscPanel(runtime);
    drawer.classList.toggle("expanded", expanded);
    let toggle = drawer.querySelector("#ui-goal-toggle");
    if (toggle) toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
    syncGoalAccessButtons(runtime, runtime.state.goalRuntime.currentGoal);
    runtime.state.layoutState.goals.expanded = expanded;
    saveLayoutState(runtime);
  }
  function syncGoalAccessButtons(runtime, goal) {
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    let expanded = !!(drawer && drawer.classList.contains("expanded"));
    ["btn-combat-goal-toggle"].forEach((id) => {
      let access = runtime.deps.document.getElementById(id);
      if (!access) return;
      access.hidden = !goal;
      access.setAttribute("aria-expanded", expanded ? "true" : "false");
      access.classList.toggle("mandatory", !!(goal && goal.mandatory));
      if (goal) access.style.setProperty("--goal-tone", goalTone(runtime, goal));
    });
  }
  function toggleGoalPin(runtime) {
    runtime.state.layoutState.goals.pinned = !runtime.state.layoutState.goals.pinned;
    saveLayoutState(runtime);
    let pin = runtime.deps.document.getElementById("ui-goal-pin");
    if (pin) pin.setAttribute("aria-pressed", runtime.state.layoutState.goals.pinned ? "true" : "false");
    if (runtime.state.layoutState.goals.pinned && runtime.state.goalRuntime.collapseTimer) {
      (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.collapseTimer);
      runtime.state.goalRuntime.collapseTimer = null;
    }
    if (!runtime.state.layoutState.goals.pinned) scheduleGoalAutoCollapse(runtime);
  }
  function isGoalAutoCollapseBlocked(runtime) {
    let goal = runtime.state.goalRuntime.currentGoal;
    return !goal || !!runtime.state.layoutState.goals.pinned;
  }
  function isBlockingOverlayVisible(runtime) {
    return !!runtime.deps.document.querySelector(".tutorial-overlay.active:not(#tutorial-overlay), .background-combat-progress-overlay");
  }
  function scheduleGoalAutoCollapse(runtime) {
    if (runtime.state.goalRuntime.collapseTimer) (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.collapseTimer);
    runtime.state.goalRuntime.collapseTimer = null;
    if (isGoalAutoCollapseBlocked(runtime)) return;
    const owner = runtime.deps.game;
    runtime.state.goalRuntime.collapseTimer = (0, runtime.deps.setTimeout)(() => {
      runtime.state.goalRuntime.collapseTimer = null;
      if (!runtime.active || owner !== runtime.deps.game) return;
      let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
      if (!drawer || !drawer.classList.contains("expanded") || isGoalAutoCollapseBlocked(runtime)) return;
      if (drawer.matches(":hover") || drawer.contains(runtime.deps.document.activeElement)) {
        scheduleGoalAutoCollapse(runtime);
        return;
      }
      toggleGoalDrawer(runtime, false);
    }, runtime.state.GOAL_AUTO_COLLAPSE_MS);
  }
  function openGoalTarget(runtime, target) {
    if (!target || !target.actionTabId) return;
    if (isDesktopWindowed(runtime) && runtime.state.originalSwitchTab && runtime.state.WINDOW_DEFS[target.actionTabId]) {
      let merged = typeof runtime.deps.getMergedTabGroup === "function" ? (0, runtime.deps.getMergedTabGroup)(target.actionTabId) : null;
      if (merged && typeof runtime.deps.window.switchMergedTabSubtab === "function") runtime.deps.window.switchMergedTabSubtab(merged[0], target.actionTabId, { keepWindowOpen: true });
      else runtime.state.originalSwitchTab(target.actionTabId);
      openWindow(runtime, target.actionTabId);
    } else if (typeof runtime.deps.window.switchTab === "function") {
      runtime.deps.window.switchTab(target.actionTabId);
    } else {
      return;
    }
    openGoalSubtab(runtime, target);
  }
  function openGoalSubtab(runtime, target) {
    if (Number.isInteger(target.actionMapAct) && runtime.deps.window.explorationAtlasUi) {
      runtime.deps.window.explorationAtlasUi.openAct(target.actionMapAct);
      return;
    }
    const subtab = target.actionSubtabId;
    if (!subtab) return;
    if (subtab.startsWith("map-explore-")) {
      callGlobalIfPresent(runtime, "switchMapSubtab", "map-tab-zones");
      callGlobalIfPresent(runtime, "switchMapExploreSubtab", subtab);
      return;
    }
    const row = runtime.state.GOAL_SUBTAB_SWITCHES.find(([prefix]) => subtab.startsWith(prefix));
    if (row) callGlobalIfPresent(runtime, row[1], subtab);
  }
  function callGlobalIfPresent(runtime, name, arg) {
    if (typeof runtime.deps.window[name] === "function") runtime.deps.window[name](arg);
  }
  function openGoalDrawerTarget(runtime) {
    openGoalTarget(runtime, runtime.state.goalRuntime.currentGoal);
  }
  function openGoalNoticeTarget(runtime, index) {
    let goal = runtime.state.goalRuntime.currentGoal;
    let notices = goal && Array.isArray(goal.notices) ? goal.notices : [];
    let notice = notices[Math.max(0, Math.floor(Number(index) || 0))];
    if (notice && typeof notice === "object") openGoalTarget(runtime, notice);
  }
  function escapeGoalText(runtime, value) {
    return (0, runtime.deps.escapeHTML)((0, runtime.deps.stripDecorativeEmoji)(value));
  }
  function setGoalNoticesHtml(runtime, notices, html) {
    if (notices.__goalHtml !== html) {
      notices.innerHTML = html;
      notices.__goalHtml = html;
    }
    notices.style.display = html ? "" : "none";
  }
  function setGoalDrawerText(runtime, id, text) {
    let el = runtime.deps.document.getElementById(id);
    if (!el) return;
    let cleanText = (0, runtime.deps.stripDecorativeEmoji)(text);
    el.textContent = cleanText;
    el.style.display = cleanText ? "" : "none";
  }
  function getGoalProgressPct(runtime, goal) {
    if (Number.isFinite(goal.progressPct)) return Math.max(0, Math.min(100, Math.round(goal.progressPct)));
    if (Number.isFinite(goal.current) && Number.isFinite(goal.target) && goal.target > 0) {
      return Math.max(0, Math.min(100, Math.round(goal.current / goal.target * 100)));
    }
    return null;
  }
  function setGoalDrawerBar(runtime, barId, fillId, pct) {
    let bar = runtime.deps.document.getElementById(barId);
    let fill = runtime.deps.document.getElementById(fillId);
    if (!bar || !fill) return;
    bar.style.display = pct === null ? "none" : "";
    if (pct !== null) fill.style.width = `${pct}%`;
  }
  function renderGoalDrawerContent(runtime, goal) {
    let hasProgress = Number.isFinite(goal.current) && Number.isFinite(goal.target);
    let pct = getGoalProgressPct(runtime, goal);
    renderGoalBadge(runtime, goal);
    setGoalDrawerText(runtime, "ui-goal-title", goal.title);
    setGoalDrawerText(runtime, "ui-goal-desc", goal.description);
    setGoalDrawerBar(runtime, "ui-goal-bar", "ui-goal-bar-fill", pct);
    let progressText = Object.prototype.hasOwnProperty.call(goal, "progressText") ? goal.progressText : hasProgress ? (0, runtime.deps._t)("현재 {current} / {target}", { current: goal.current, target: goal.target }) : "";
    setGoalDrawerText(runtime, "ui-goal-progress", progressText);
    let action = runtime.deps.document.getElementById("ui-goal-action");
    if (action) {
      let usable = !!(goal.actionLabel && goal.actionTabId);
      action.textContent = usable ? goal.actionLabel : "";
      action.style.display = usable ? "" : "none";
    }
    renderGoalNotices(runtime, goal);
    setGoalDrawerText(runtime, "ui-goal-handle-icon", "");
    setGoalDrawerText(runtime, "ui-goal-handle-title", "목표");
    setGoalDrawerBar(runtime, "ui-goal-handle-bar", "ui-goal-handle-fill", pct);
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (drawer) {
      drawer.classList.toggle("ui-goal-mandatory", !!goal.mandatory);
      drawer.style.setProperty("--goal-tone", goalTone(runtime, goal));
    }
    syncGoalAccessButtons(runtime, goal);
  }
  function renderGoalBadge(runtime, goal) {
    const badge = runtime.deps.document.getElementById("ui-goal-badge");
    if (!badge) return;
    const icon = goal.iconKind === "attack" && typeof runtime.deps.renderCombatLogIcon === "function" ? (0, runtime.deps.renderCombatLogIcon)("attack") : "";
    badge.innerHTML = `${icon}${escapeGoalText(runtime, (0, runtime.deps.stripDecorativeEmoji)(goal.categoryLabel || ""))}`;
    badge.style.display = badge.innerHTML ? "" : "none";
  }
  function renderGoalNotices(runtime, goal) {
    const rows = (Array.isArray(goal.notices) ? goal.notices : []).slice(0, 2);
    const notices = runtime.deps.document.getElementById("ui-goal-notices");
    if (!notices) return;
    setGoalNoticesHtml(runtime, notices, rows.map((notice, index) => {
      const normalized = typeof notice === "string" ? { text: notice } : notice || {};
      const label = escapeGoalText(runtime, normalized.text || normalized.label || "");
      if (!label) return "";
      return normalized.actionTabId ? `<button type="button" class="ui-goal-notice-action" onclick="openGoalNoticeTarget(${index})"><span>${label}</span></button>` : `<div class="ui-goal-notice-text">${label}</div>`;
    }).join(""));
  }
  function presentGoalDrawer(runtime, goal) {
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (!drawer) return;
    if (!goal || typeof goal !== "object" || !goal.id || !goal.title) {
      runtime.state.goalRuntime.currentGoal = null;
      runtime.state.goalRuntime.signature = "";
      drawer.style.display = "none";
      syncGoalAccessButtons(runtime, null);
      return;
    }
    runtime.state.goalRuntime.currentGoal = goal;
    drawer.style.display = "";
    renderGoalDrawerContent(runtime, goal);
    markGoalAutoExpand(runtime, goal);
    if (!runtime.state.goalRuntime.pendingAutoExpand) return;
    if (isBlockingOverlayVisible(runtime)) return;
    runtime.state.goalRuntime.pendingAutoExpand = false;
    if (!isDesktopWindowed(runtime)) return;
    toggleGoalDrawer(runtime, true);
    flashImportantGoal(runtime, drawer, goal);
    scheduleGoalAutoCollapse(runtime);
  }
  function markGoalAutoExpand(runtime, goal) {
    const signature = [goal.id, goal.stage || "", goal.mandatory ? 1 : 0].join("|");
    if (signature !== runtime.state.goalRuntime.signature) {
      runtime.state.goalRuntime.signature = signature;
      runtime.state.goalRuntime.pendingAutoExpand = true;
    }
  }
  function flashImportantGoal(runtime, drawer, goal) {
    if (!goal.mandatory) return;
    (0, runtime.deps.clearTimeout)(runtime.state.goalRuntime.flashTimer);
    drawer.classList.remove("ui-goal-flash");
    void drawer.offsetWidth;
    drawer.classList.add("ui-goal-flash");
    const owner = runtime.deps.game;
    runtime.state.goalRuntime.flashTimer = (0, runtime.deps.setTimeout)(() => {
      runtime.state.goalRuntime.flashTimer = null;
      if (runtime.active && owner === runtime.deps.game && drawer.isConnected) drawer.classList.remove("ui-goal-flash");
    }, runtime.state.GOAL_FLASH_MS);
  }
  function installSettingsReset(runtime) {
    let host = runtime.deps.document.getElementById("settings-window-actions");
    if (!host || runtime.deps.document.getElementById("btn-reset-window-layout")) return;
    let button = runtime.deps.document.createElement("button");
    button.id = "btn-reset-window-layout";
    button.className = "cfg-btn cfg-btn--neutral";
    button.type = "button";
    button.textContent = (0, runtime.deps._t)("UI 배치 초기화");
    listenWindow(runtime, button, "click", runtime.handlers.resetWindowLayout);
    host.appendChild(button);
  }
  function goalTone(runtime, goal) {
    return runtime.state.GOAL_TONES[(0, runtime.deps.stripDecorativeEmoji)(goal.categoryLabel || "")] || (goal.mandatory ? "#f0a04a" : "#d9b066");
  }

  // modules/ui/window-rail.mjs
  function closeCommunityDock(runtime) {
    if (typeof runtime.deps.messageFrames !== "object") return;
    if (isDesktopWindowed(runtime)) runtime.deps.messageFrames.showTab("log", false);
    else runtime.deps.messageFrames.showPhoneTab("log");
  }
  function getOrderedRailButtons(runtime, header) {
    let buttons = Array.from(header.querySelectorAll(".tab-btn")).filter((button) => !runtime.state.RAIL_EXTERNAL_TAB_IDS.has(button.id));
    let savedTabOrder = [...runtime.deps.tabLayoutUi.current().tabOrder, ...runtime.deps.tabLayoutUi.defaultOrder];
    let originalRank = new Map(buttons.map((button, index) => [
      button.id,
      Number(button.dataset.railOriginalOrder ?? index)
    ]));
    let ordered = buttons.sort((left, right) => {
      let leftSaved = savedTabOrder.indexOf(left.id);
      let rightSaved = savedTabOrder.indexOf(right.id);
      if (leftSaved >= 0 || rightSaved >= 0) {
        if (leftSaved < 0) return 1;
        if (rightSaved < 0) return -1;
        return leftSaved - rightSaved;
      }
      return originalRank.get(left.id) - originalRank.get(right.id);
    });
    return ordered;
  }
  function railCaption(runtime, id, label) {
    return runtime.deps.tabLayoutUi.shortCaptions[id] || label;
  }
  function wrapRailButtonLabel(runtime, button) {
    if (!button || !button.childNodes || button.querySelector(":scope > .ui-rail-label")) return;
    let textNodes = Array.from(button.childNodes).filter((node) => node.nodeType === 3 && node.textContent.trim());
    if (textNodes.length === 0) return;
    let label = runtime.deps.document.createElement("span");
    label.className = "ui-rail-label";
    label.dataset.i18n = "";
    label.textContent = textNodes.map((node) => runtime.deps.i18n.sourceOf(node).trim()).join(" ");
    button.dataset.caption = `${railCaption(runtime, button.id, label.textContent)}|하단 메뉴`;
    button.dataset.i18nAttr = "data-caption";
    let merged = button.dataset.mergedTabLauncher && typeof MERGED_TAB_GROUPS === "object" ? MERGED_TAB_GROUPS[button.dataset.mergedTabLauncher] : null;
    if (merged) label.textContent = (0, runtime.deps._t)(merged.title);
    if (button.dataset.hotkey) label.dataset.hotkey = button.dataset.hotkey;
    textNodes.forEach((node) => button.removeChild(node));
    button.insertBefore(label, button.firstChild);
    runtime.deps.i18n.applyStatic(button);
  }
  function createRailMiscButton(runtime) {
    let button = runtime.deps.document.createElement("button");
    button.id = "btn-ui-rail-misc";
    button.type = "button";
    button.className = "ui-rail-external-btn ui-rail-misc-btn";
    button.setAttribute("aria-label", "기타 메뉴 열기");
    button.dataset.i18n = "";
    button.dataset.i18nAttr = "aria-label";
    button.setAttribute("aria-controls", "ui-rail-misc-panel");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML = '기타|하단 메뉴<span id="noti-ui-rail-misc" class="noti-dot"></span>';
    runtime.deps.i18n.applyStatic(button);
    listenWindow(runtime, button, "click", runtime.handlers.toggleRailMiscPanel);
    return button;
  }
  function installRailLayers(runtime, header) {
    let tabLayer = runtime.deps.document.createElement("div");
    tabLayer.className = "ui-rail-tab-layer";
    tabLayer.setAttribute("aria-label", (0, runtime.deps._t)("메뉴"));
    header.appendChild(tabLayer);
    let controls = runtime.deps.document.createElement("div");
    controls.className = "ui-rail-external-controls";
    controls.appendChild(createRailMiscButton(runtime));
    header.appendChild(controls);
    let miscPanel = runtime.deps.document.createElement("div");
    miscPanel.id = "ui-rail-misc-panel";
    miscPanel.className = "ui-rail-misc-panel";
    miscPanel.hidden = true;
    listenWindow(runtime, header, "click", runtime.handlers.closeRailMiscPanelAfterSelection);
    listenWindow(runtime, runtime.deps.document, "pointerdown", runtime.handlers.closeRailMiscPanelFromOutside, true);
    listenWindow(runtime, runtime.deps.document, "keydown", runtime.handlers.closeRailMiscPanelOnEscape, true);
    header.appendChild(miscPanel);
  }
  function isRailButtonVisible(runtime, button) {
    return button.style.display !== "none" && !button.hidden && button.dataset.mergedTabMember !== "1";
  }
  function toggleRailMiscPanel(runtime) {
    let panel = runtime.deps.document.getElementById("ui-rail-misc-panel");
    let trigger = runtime.deps.document.getElementById("btn-ui-rail-misc");
    if (!panel || !trigger) return;
    panel.hidden = !panel.hidden;
    trigger.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
    let drawer = runtime.deps.document.getElementById("ui-goal-drawer");
    if (!panel.hidden && drawer && drawer.classList.contains("expanded")) toggleGoalDrawer(runtime, false);
  }
  function closeRailMiscPanelFromOutside(runtime, event) {
    let panel = runtime.deps.document.getElementById("ui-rail-misc-panel");
    if (!panel || panel.hidden || !event.target.closest) return;
    if (event.target.closest("#ui-rail-misc-panel, #btn-ui-rail-misc")) return;
    closeRailMiscPanel(runtime);
  }
  function closeRailMiscPanelOnEscape(runtime, event) {
    let panel = runtime.deps.document.getElementById("ui-rail-misc-panel");
    if (event.key !== "Escape" || !panel || panel.hidden) return;
    closeRailMiscPanel(runtime);
    event.stopPropagation();
  }
  function closeRailMiscPanelAfterSelection(runtime, event) {
    if (!event.target.closest || !event.target.closest(".tab-btn")) return;
    closeRailMiscPanel(runtime);
  }
  function hasVisibleRailNotice(runtime, button) {
    if (button.classList.contains("starter-equip-tutorial-pending")) return true;
    return Array.from(button.querySelectorAll(".noti-dot, .inventory-full-warning")).some((notice) => {
      let style = runtime.deps.window.getComputedStyle ? runtime.deps.window.getComputedStyle(notice) : notice.style;
      return style.display !== "none" && style.visibility !== "hidden";
    });
  }
  function moveRailAuxiliaryTabs(runtime, miscPanel) {
    ["btn-tab-settings", "btn-map-complete-action-picker"].forEach((id) => {
      let button = runtime.deps.document.getElementById(id);
      if (button) miscPanel.appendChild(button);
    });
  }
  function updateRailMiscNotice(runtime, miscPanel) {
    let notice = runtime.deps.document.getElementById("noti-ui-rail-misc");
    if (!notice) return;
    let visible = Array.from(miscPanel.querySelectorAll(".tab-btn")).filter(runtime.handlers.isRailButtonVisible);
    notice.style.display = visible.some(runtime.handlers.hasVisibleRailNotice) ? "block" : "none";
  }
  function installDesktopRailMenu(runtime) {
    let header = runtime.deps.document.querySelector(".tab-header");
    if (!header) return;
    if (!header.querySelector(":scope > .ui-rail-tab-layer")) {
      Array.from(header.querySelectorAll(".tab-btn")).forEach((button, index) => {
        button.dataset.railOriginalOrder = String(index);
      });
      installRailLayers(runtime, header);
    }
    installCloseAllButton(runtime);
    dockRailIntoHud(runtime, header);
    syncDesktopRailGroups(runtime);
  }
  function dockRailIntoHud(runtime, header) {
    let shell = runtime.deps.document.querySelector(".player-hud-shell");
    if (!shell || runtime.state.railDockHome) return;
    runtime.state.railDockHome = { parent: header.parentElement, next: header.nextElementSibling };
    let rightWing = runtime.deps.document.createElement("div");
    rightWing.className = "ui-rail-tab-layer ui-rail-wing-right";
    rightWing.setAttribute("aria-label", (0, runtime.deps._t)("메뉴"));
    header.querySelector(":scope > .ui-rail-tab-layer").classList.add("ui-rail-wing-left");
    header.insertBefore(rightWing, header.querySelector(":scope > .ui-rail-external-controls"));
    shell.appendChild(header);
    header.classList.add("ui-rail-docked");
    runtime.deps.document.body.classList.add("hud-menu-docked");
    observeDockedHud(runtime, [runtime.deps.document.querySelector(".player-hud"), header.querySelector(":scope > .ui-rail-wing-left"), rightWing]);
  }
  function undockRailFromHud(runtime, header) {
    if (!runtime.state.railDockHome) return;
    runtime.state.railDockHome.parent.insertBefore(header, runtime.state.railDockHome.next);
    runtime.state.railDockHome = null;
    header.classList.remove("ui-rail-docked");
    runtime.deps.document.body.classList.remove("hud-menu-docked");
    if (runtime.state.dockedHudWatch) runtime.state.dockedHudWatch.disconnect();
    cancelWindowFrame(runtime, "hudLayoutFrame");
    runtime.state.dockedHudSizes.clear();
  }
  function observeDockedHud(runtime, targets) {
    if (typeof runtime.deps.ResizeObserver !== "function") return;
    runtime.state.dockedHudWatch = runtime.state.dockedHudWatch || new runtime.deps.ResizeObserver(runtime.handlers.noteDockedHudResize);
    targets.forEach((target) => {
      if (target) runtime.state.dockedHudWatch.observe(target);
    });
  }
  function noteDockedHudResize(runtime, entries) {
    if (!runtime.active) return;
    let changed = entries.filter((entry) => {
      let size = Math.round(entry.contentRect.width) + "x" + Math.round(entry.contentRect.height);
      if (runtime.state.dockedHudSizes.get(entry.target) === size) return false;
      runtime.state.dockedHudSizes.set(entry.target, size);
      return true;
    });
    if (runtime.state.railDockHome && changed.length) queueWindowFrame(runtime, "hudLayoutFrame", runtime.handlers.relayoutDockedHud);
  }
  function relayoutDockedHud(runtime) {
    if (!runtime.state.railDockHome) return;
    syncDesktopRailGroups(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach(runtime.handlers.applyWindowState);
    if (typeof runtime.deps.messageFrames === "object") runtime.deps.messageFrames.sync();
  }
  function isRailButtonDisplayed(runtime, button) {
    return typeof button.getClientRects !== "function" || button.getClientRects().length > 0;
  }
  function countRailWingRoom(runtime, wing, buttons) {
    let bottom = wing.getBoundingClientRect().bottom;
    return buttons.filter((button) => button.getBoundingClientRect().bottom <= bottom + 0.5).length;
  }
  function spreadRailWings(runtime, header, visible) {
    let left = header.querySelector(":scope > .ui-rail-wing-left");
    let right = header.querySelector(":scope > .ui-rail-wing-right");
    if (!left || !right) return [];
    let shown = visible.filter(runtime.handlers.isRailButtonDisplayed);
    let leftRoom = countRailWingRoom(runtime, left, shown);
    shown.forEach((button) => right.appendChild(button));
    let rightRoom = countRailWingRoom(runtime, right, shown);
    let overflow = pickRailOverflow(runtime, shown, leftRoom + rightRoom);
    let kept = shown.filter((button) => !overflow.includes(button));
    let leftCount = Math.min(leftRoom, Math.max(Math.ceil(kept.length / 2), kept.length - rightRoom));
    kept.slice(0, leftCount).forEach((button) => left.appendChild(button));
    return overflow;
  }
  function pickRailOverflow(runtime, shown, room) {
    let spare = shown.length - room;
    if (spare <= 0) return [];
    let auxiliary = shown.filter((button) => !runtime.state.RAIL_CORE_TAB_IDS.has(button.id)).reverse();
    let core = shown.filter((button) => runtime.state.RAIL_CORE_TAB_IDS.has(button.id)).reverse();
    return [...auxiliary, ...core].slice(0, spare);
  }
  function measureRailOverflow(runtime, tabLayer, visible) {
    tabLayer.scrollTop = 0;
    const bottom = tabLayer.getBoundingClientRect().bottom;
    return visible.filter((button) => button.getBoundingClientRect().bottom > bottom + 0.5);
  }
  function syncDesktopRailGroups(runtime) {
    let header = runtime.deps.document.querySelector(".tab-header");
    let tabLayer = header && header.querySelector(":scope > .ui-rail-tab-layer");
    let miscPanel = header && header.querySelector(":scope > .ui-rail-misc-panel");
    if (!tabLayer || !miscPanel) return;
    let buttons = getOrderedRailButtons(runtime, header);
    let visible = buttons.filter((button) => isRailButtonVisible(runtime, button) && !runtime.deps.tabLayoutUi.isMisc(button.id));
    buttons.forEach((button) => {
      wrapRailButtonLabel(runtime, button);
      tabLayer.appendChild(button);
    });
    buttons.filter((button) => runtime.deps.tabLayoutUi.isMisc(button.id)).forEach((button) => miscPanel.appendChild(button));
    moveRailAuxiliaryTabs(runtime, miscPanel);
    const overflow = runtime.state.railDockHome ? spreadRailWings(runtime, header, visible) : measureRailOverflow(runtime, tabLayer, visible);
    overflow.forEach((button) => miscPanel.appendChild(button));
    miscPanel.dataset.railOverflow = String(overflow.length);
    updateRailMiscNotice(runtime, miscPanel);
  }
  function installCloseAllButton(runtime) {
    let header = runtime.deps.document.querySelector(".tab-header");
    if (!header || runtime.deps.document.getElementById("btn-close-all-windows")) return;
    let btn = runtime.deps.document.createElement("button");
    btn.id = "btn-close-all-windows";
    btn.type = "button";
    btn.className = "ui-rail-external-btn ui-close-all-btn";
    btn.textContent = "정리|하단 메뉴";
    btn.setAttribute("aria-label", "열린 창 모두 닫기");
    btn.dataset.i18n = "";
    btn.dataset.i18nAttr = "aria-label";
    runtime.deps.i18n.applyStatic(btn);
    listenWindow(runtime, btn, "click", runtime.handlers.closeAllWindows);
    let logo = runtime.deps.document.createElement("button");
    logo.id = "ui-rail-logo";
    logo.type = "button";
    logo.setAttribute("aria-label", (0, runtime.deps._t)("RIGNIN, 열린 창 모두 닫기"));
    logo.dataset.tip = (0, runtime.deps._t)("열린 창 모두 닫기");
    logo.innerHTML = '<img src="assets/ui/pixel/rignin-logo-52.png" alt="" width="52" height="52">';
    listenWindow(runtime, logo, "click", runtime.handlers.closeAllWindows);
    header.prepend(logo);
    let controls = header.querySelector(":scope > .ui-rail-external-controls");
    (controls || header).appendChild(btn);
  }

  // modules/ui/window-combat-log.mjs
  function saveCombatLogReserve(runtime, px) {
    runtime.state.layoutState.combatLog.reserve = clampNumberLocal(runtime, px, runtime.state.COMBAT_LOG_RESERVE_MIN, 4e3, runtime.state.COMBAT_LOG_RESERVE_MIN);
    applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve);
    saveLayoutState(runtime);
  }
  function measureCombatLogShare(runtime) {
    const stage = runtime.deps.document.querySelector("#tab-battle .combat-stage");
    if (!stage) return null;
    const root = runtime.deps.document.documentElement.style, stored = runtime.state.layoutState.combatLog.reserve || runtime.state.COMBAT_LOG_RESERVE_MIN;
    root.setProperty("--combat-log-reserve", "0px");
    const whole = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(stage).maxHeight);
    root.setProperty("--combat-log-reserve", stored + "px");
    if (!Number.isFinite(whole)) return null;
    const factor = runtime.deps.window.uiDisplay && runtime.deps.window.uiDisplay.factor || 1;
    return { now: whole - stage.getBoundingClientRect().height / factor, most: Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, whole - runtime.state.COMBAT_LOG_MIN_STAGE), factor };
  }
  function startCombatLogResize(runtime, event) {
    if (event.button > 0) return;
    cancelWindowGesture(runtime);
    const share = measureCombatLogShare(runtime);
    if (!share) return;
    const handle = event.currentTarget, startY = event.clientY;
    let reserve = share.now;
    event.preventDefault();
    handle.classList.add("is-dragging");
    const move = (moved) => {
      reserve = Math.min(share.most, Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, share.now + (startY - moved.clientY) / share.factor));
      queueWindowFrame(runtime, "combatLogResizeFrame", () => applyCombatLogReserve(runtime, reserve));
    };
    const finish = (commit) => {
      cancelWindowFrame(runtime, "combatLogResizeFrame");
      handle.classList.remove("is-dragging");
      if (commit) saveCombatLogReserve(runtime, reserve);
      else applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve || runtime.state.COMBAT_LOG_RESERVE_MIN);
    };
    beginCapturedWindowGesture(runtime, handle, event.pointerId, { move, finish });
  }
  function nudgeCombatLogResize(runtime, event) {
    const step = { ArrowUp: runtime.state.COMBAT_LOG_KEY_STEP, ArrowDown: -runtime.state.COMBAT_LOG_KEY_STEP }[event.key];
    const share = step ? measureCombatLogShare(runtime) : null;
    if (!share) return;
    event.preventDefault();
    saveCombatLogReserve(runtime, Math.min(share.most, Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, share.now + step)));
  }
  function setupCombatLogResize(runtime) {
    const feed = runtime.deps.document.querySelector(".combat-feed");
    if (!feed || runtime.deps.document.getElementById("combat-log-resize")) return;
    const handle = runtime.deps.document.createElement("div");
    handle.id = "combat-log-resize";
    handle.className = "combat-log-resize";
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-orientation", "horizontal");
    handle.setAttribute("aria-label", typeof runtime.deps._t === "function" ? (0, runtime.deps._t)("전투 기록 높이 조절") : "전투 기록 높이 조절");
    feed.parentNode.insertBefore(handle, feed);
    listenWindow(runtime, handle, "pointerdown", runtime.handlers.startCombatLogResize);
    listenWindow(runtime, handle, "keydown", runtime.handlers.nudgeCombatLogResize);
    listenWindow(runtime, handle, "dblclick", () => saveCombatLogReserve(runtime, runtime.state.COMBAT_LOG_RESERVE_MIN));
    if (runtime.state.layoutState.combatLog.reserve) applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve);
  }
  function applyCombatLogReserve(runtime, px) {
    runtime.deps.document.documentElement.style.setProperty("--combat-log-reserve", Math.round(px) + "px");
    const log = runtime.deps.document.getElementById("log");
    if (log && log.combatLogAtBottom !== false && typeof runtime.deps.window.scrollCombatLogToLatest === "function") runtime.deps.window.scrollCombatLogToLatest(log);
  }

  // modules/ui/window-responsive.mjs
  function resetWindowLayout(runtime) {
    runtime.state.layoutState = getDefaultLayoutState(runtime);
    saveLayoutState(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach((id) => applyWindowState(runtime, id));
    if (typeof runtime.deps.messageFrames === "object") runtime.deps.messageFrames.reset();
    toggleGoalDrawer(runtime, false);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
  }
  function patchCombatLogToggle(runtime) {
    if (typeof runtime.deps.window.toggleCombatLogCollapse !== "function" || runtime.deps.window.toggleCombatLogCollapse.__uiLayoutPatched) return;
    let originalToggle = runtime.deps.window.toggleCombatLogCollapse;
    runtime.state.originalCombatLogToggle = originalToggle;
    runtime.deps.window.toggleCombatLogCollapse = function uiLayoutCombatLogToggle() {
      if (!runtime.active) return originalToggle();
      syncWindowOwner(runtime);
      originalToggle();
      runtime.state.layoutState.combatLog.expanded = !(runtime.deps.window.game && runtime.deps.window.game.settings && runtime.deps.window.game.settings.combatLogCollapsed);
      saveLayoutState(runtime);
      requestCanvasResize(runtime);
      syncWorkspacePresentation(runtime);
    };
    runtime.deps.window.toggleCombatLogCollapse.__uiLayoutPatched = true;
    runtime.state.combatLogToggleWrapper = runtime.deps.window.toggleCombatLogCollapse;
    if (runtime.deps.window.game && runtime.deps.window.game.settings) {
      runtime.deps.window.game.settings.combatLogCollapsed = !runtime.state.layoutState.combatLog.expanded;
      if (typeof runtime.deps.window.applyPanelLayoutSettings === "function") runtime.deps.window.applyPanelLayoutSettings();
    }
  }
  function noteEquipmentReopen(runtime, tabId, st) {
    if (tabId !== "tab-items" || st && st.open && !st.minimized || !runtime.deps.window.equipmentTriage) return;
    runtime.deps.window.equipmentTriage.onOpen();
    if (typeof runtime.deps.window.updateStaticUI === "function") runtime.deps.window.updateStaticUI();
  }
  function patchSwitchTab(runtime) {
    if (runtime.state.originalSwitchTab || typeof runtime.deps.window.switchTab !== "function") return;
    runtime.state.originalSwitchTab = runtime.deps.window.switchTab;
    runtime.deps.window.switchTab = function windowedSwitchTab(tabId, options = {}) {
      if (!runtime.active) return runtime.state.originalSwitchTab(tabId, options);
      syncWindowOwner(runtime);
      if (runtime.deps.window.isTabSurfaceAvailable(tabId) === false) return runtime.state.originalSwitchTab(tabId);
      if (tabId === "tab-social") {
        openCommunityDock(runtime);
        return;
      }
      if (!isDesktopWindowed(runtime)) {
        collapseGoalDrawerUnlessPinned(runtime);
        return runtime.state.originalSwitchTab(tabId);
      }
      if (tabId === "tab-battle") {
        closeAllWindows(runtime);
        return runtime.state.originalSwitchTab(tabId);
      }
      let el = runtime.deps.document.getElementById(tabId);
      let st = runtime.state.layoutState.windows[tabId];
      if (shouldCloseWindowTab(runtime, tabId, options, el)) {
        closeWindow(runtime, tabId);
        return;
      }
      noteEquipmentReopen(runtime, tabId, st);
      let result = runtime.state.originalSwitchTab(tabId);
      openWindow(runtime, tabId);
      return result;
    };
    runtime.state.switchTabWrapper = runtime.deps.window.switchTab;
  }
  function shouldCloseWindowTab(runtime, tabId, options, el) {
    const st = runtime.state.layoutState.windows[tabId];
    return !options.keepWindowOpen && runtime.state.WINDOW_DEFS[tabId] && st && st.open && !st.minimized && el && el.classList.contains("ui-window-active");
  }
  function restoreDesktopMenuForMobile(runtime) {
    let header = runtime.deps.document.querySelector(".tab-header");
    if (!header) return;
    undockRailFromHud(runtime, header);
    header.querySelectorAll(":scope > .ui-rail-tab-layer .tab-btn, :scope > .ui-rail-misc-panel .tab-btn").forEach((btn) => header.appendChild(btn));
    header.querySelectorAll(":scope > .ui-rail-tab-layer").forEach((layer) => {
      releaseWindowTree(runtime, layer);
      layer.remove();
    });
    let miscPanel = header.querySelector(":scope > .ui-rail-misc-panel");
    if (miscPanel) {
      releaseWindowTree(runtime, miscPanel);
      miscPanel.remove();
    }
    let externalControls = header.querySelector(":scope > .ui-rail-external-controls");
    if (externalControls) {
      releaseWindowTree(runtime, externalControls);
      externalControls.remove();
    }
    Array.from(header.querySelectorAll(".tab-btn")).sort((left, right) => Number(left.dataset.railOriginalOrder) - Number(right.dataset.railOriginalOrder)).forEach((button) => {
      delete button.dataset.railOriginalOrder;
      header.appendChild(button);
    });
    let closeAllBtn = runtime.deps.document.getElementById("btn-close-all-windows");
    if (closeAllBtn) {
      releaseWindowTree(runtime, closeAllBtn);
      closeAllBtn.remove();
    }
    header.querySelectorAll(":scope > #ui-rail-logo").forEach((logo) => {
      releaseWindowTree(runtime, logo);
      logo.remove();
    });
    let toggle = runtime.deps.document.getElementById("ui-community-toggle");
    if (toggle) {
      releaseWindowTree(runtime, toggle);
      toggle.remove();
    }
  }
  function restoreWindowMarkupForMobile(runtime) {
    restoreDesktopMenuForMobile(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach((tabId) => {
      let el = runtime.deps.document.getElementById(tabId);
      if (!el || el.dataset.windowPrepared !== "1") return;
      let body = el.querySelector(":scope > .ui-window-body");
      let titlebar = el.querySelector(":scope > .ui-window-titlebar");
      if (body) {
        while (body.firstChild) el.insertBefore(body.firstChild, body);
        body.remove();
      }
      if (titlebar) {
        releaseWindowTree(runtime, titlebar);
        titlebar.remove();
      }
      el.style.cursor = "";
      el.classList.remove("ui-window", "ui-window-open", "ui-window-minimized");
      el.removeAttribute("data-window-prepared");
      ["role", "aria-labelledby", "tabindex"].forEach((name) => el.removeAttribute(name));
      ["left", "top", "width", "height", "zIndex"].forEach((prop) => {
        el.style[prop] = "";
      });
    });
    let social = runtime.deps.document.getElementById("tab-social");
    if (social) {
      social.classList.remove("ui-community-dock", "ui-community-overlay");
      ["left", "top", "right", "bottom", "width", "height"].forEach((property) => {
        social.style[property] = "";
      });
      let dockHeader = social.querySelector(":scope > .ui-community-dock-header");
      if (dockHeader) dockHeader.remove();
    }
    runtime.deps.document.body.classList.remove("community-dock-open", "community-overlay-open");
    syncWorkspacePresentation(runtime);
  }
  function restoreSelectedMobileWindow(runtime) {
    let mobileTab = Object.keys(runtime.state.WINDOW_DEFS).concat("tab-battle").find((id) => {
      let el = runtime.deps.document.getElementById(id);
      return el && el.classList.contains("active");
    });
    if (!mobileTab) return;
    if (runtime.state.WINDOW_DEFS[mobileTab]) {
      openWindow(runtime, mobileTab);
      return;
    }
    closeAllWindows(runtime);
  }
  function restoreSelectedDesktopTab(runtime) {
    if (!runtime.state.originalSwitchTab) return;
    let tabId = runtime.state.zOrder.slice().reverse().find((id) => {
      let state = runtime.state.layoutState.windows[id];
      return state && state.open && !state.minimized;
    });
    runtime.state.originalSwitchTab(tabId || "tab-battle");
  }
  function watchZoneRowClearance(runtime) {
    let row = runtime.deps.document.querySelector(".combat-zone-row"), tab = runtime.deps.document.getElementById("tab-battle");
    if (!row || !tab || typeof runtime.deps.ResizeObserver !== "function") return;
    if (runtime.state.zoneRowTarget === row && runtime.state.zoneRowTab === tab) return;
    runtime.state.zoneRowWatch?.disconnect();
    runtime.state.zoneRowTarget = row;
    runtime.state.zoneRowTab = tab;
    runtime.state.zoneRowWatch = new runtime.deps.ResizeObserver(() => {
      if (runtime.active && row.isConnected && tab.isConnected) tab.style.setProperty("--zone-row-bottom", `${Math.ceil(row.offsetTop + row.offsetHeight)}px`);
    });
    runtime.state.zoneRowWatch.observe(row);
  }
  function applyResponsiveMode(runtime) {
    watchZoneRowClearance(runtime);
    let desktop = isDesktopWindowed(runtime);
    let enteringDesktop = desktop && runtime.state.previousDesktopMode === false;
    let enteringMobile = !desktop && runtime.state.previousDesktopMode === true;
    if (enteringDesktop || enteringMobile) cancelWindowGesture(runtime);
    runtime.state.previousDesktopMode = desktop;
    runtime.deps.document.body.classList.toggle("desktop-windowed-ui", desktop);
    if (!desktop) {
      syncMessageFrameMode(runtime, false);
      restoreWindowMarkupForMobile(runtime);
      if (enteringMobile) restoreSelectedDesktopTab(runtime);
      syncWorkspacePresentation(runtime);
      installGoalDrawer(runtime);
      return;
    }
    Object.keys(runtime.state.WINDOW_DEFS).forEach((id) => {
      prepareWindow(runtime, id);
      applyWindowState(runtime, id);
    });
    installGoalDrawer(runtime);
    installSettingsReset(runtime);
    installDesktopRailMenu(runtime);
    if (runtime.state.layoutState.goals.expanded) toggleGoalDrawer(runtime, true);
    syncMessageFrameMode(runtime, true);
    if (enteringDesktop) restoreSelectedMobileWindow(runtime);
    requestCanvasResize(runtime);
    syncWorkspacePresentation(runtime);
  }
  function syncMessageFrameMode(runtime, desktop) {
    if (typeof runtime.deps.messageFrames !== "object") return;
    runtime.deps.messageFrames.sync(desktop ? { desktop: true, workspaceRect: runtime.handlers.getFreeWindowRect } : { desktop: false });
  }
  function closeTopWindowOnEscape(runtime, event) {
    if (event.key !== "Escape" || (0, runtime.deps.isTextEntryTarget)(event.target)) return;
    if (runtime.deps.document.querySelector("dialog:modal")) return;
    if (runtime.deps.document.querySelector(".selection-overlay")) return;
    if (runtime.deps.document.querySelector('.tutorial-overlay.active:not(#tutorial-overlay),.social-modal-overlay[style*="display: block"]')) return;
    let open = runtime.state.zOrder.slice().reverse().find((id) => {
      let st = runtime.state.layoutState.windows[id];
      return st && st.open && !st.minimized;
    });
    if (open) closeWindow(runtime, open);
  }
  function toggleWindowFromHotkey(runtime, tabId) {
    if (!runtime.deps.document.body.classList.contains("desktop-windowed-ui") || !isMenuUnlocked(runtime, tabId)) return false;
    let merged = mergedWindowOf(runtime, tabId), windowId = merged ? merged.windowId : tabId;
    let state = runtime.state.layoutState.windows[windowId];
    let onTop = runtime.state.zOrder[runtime.state.zOrder.length - 1] === windowId, showing = !merged || merged.shownId === tabId;
    if (state && state.open && !state.minimized && onTop && showing) closeWindow(runtime, windowId);
    else runtime.deps.window.switchTab(tabId, { keepWindowOpen: !!merged });
    return true;
  }
  function initWindowManager(runtime) {
    if (runtime.state.initialized) return;
    runtime.state.initialized = true;
    runtime.state.layoutState = normalizeLayoutState(runtime, readStoredLayout(runtime));
    closePersistedSurfacesForBoot(runtime);
    patchSwitchTab(runtime);
    patchCombatLogToggle(runtime);
    setupCombatLogResize(runtime);
    applyResponsiveMode(runtime);
    listenWindow(runtime, runtime.deps.window, "resize", runtime.handlers.applyResponsiveMode);
    listenWindow(runtime, runtime.deps.document, "keydown", runtime.handlers.closeTopWindowOnEscape);
  }

  // modules/ui/window-manager-disposal.mjs
  function disposeWindowManager(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    clearWindowWork(runtime);
    releaseViewEvents(runtime);
    for (const key of ["dockFitWatch", "dockedHudWatch", "zoneRowWatch"]) {
      runtime.state[key]?.disconnect();
      runtime.state[key] = null;
    }
    runtime.state.dockedHudSizes.clear();
    restoreWindowHooks(runtime);
    if (runtime.state.initialized) restoreWindowMarkupForMobile(runtime);
    releaseWindowPresentation(runtime);
    runtime.state.goalRuntime.currentGoal = null;
    runtime.state.guideLayout = null;
  }
  function restoreWindowHooks(runtime) {
    const target = runtime.deps.window;
    if (runtime.state.switchTabWrapper && target.switchTab === runtime.state.switchTabWrapper) {
      target.switchTab = runtime.state.originalSwitchTab;
    }
    if (runtime.state.combatLogToggleWrapper && target.toggleCombatLogCollapse === runtime.state.combatLogToggleWrapper) {
      target.toggleCombatLogCollapse = runtime.state.originalCombatLogToggle;
    }
  }
  function releaseWindowPresentation(runtime) {
    const doc = runtime.deps.document;
    for (const id of Object.keys(runtime.state.WINDOW_DEFS)) {
      const panel = doc.getElementById(id);
      if (!panel) continue;
      delete panel.dataset.windowInputBound;
      panel.classList.remove("ui-window-active", "ui-window-docked", "ui-window-maximized");
    }
    if (!runtime.state.initialized) return;
    for (const id of ["ui-goal-drawer", "btn-reset-window-layout", "combat-log-resize"]) doc.getElementById(id)?.remove();
    const access = doc.getElementById("btn-combat-goal-toggle");
    if (access) {
      access.hidden = true;
      access.setAttribute("aria-expanded", "false");
    }
    doc.body.classList.remove("desktop-windowed-ui", "ui-management-mode", "ui-workspace-docked", "ui-combat-mode");
    delete doc.body.dataset.activeGameWindow;
  }

  // modules/ui/window-manager-view.mjs
  function createWindowManagerView(deps) {
    const runtime = { deps, state: { owner: deps.game, gesture: null }, handlers: {}, api: null, active: true, listeners: [], frames: /* @__PURE__ */ new Set() };
    initialize(runtime);
    bindWindowHandlers(runtime);
    runtime.handlers.resolveWindowPlacement = createResolveWindowPlacement(runtime);
    runtime.handlers.windowResizeAxis = createWindowResizeAxis(runtime);
    runtime.handlers.windowResizedRect = createWindowResizedRect(runtime);
    runtime.api = windowApi(runtime);
    if (deps.document.readyState === "loading") listenWindow(runtime, deps.document, "DOMContentLoaded", runtime.handlers.initWindowManager, { once: true });
    else initWindowManager(runtime);
    return runtime.api;
  }
  function bindWindowHandlers(runtime) {
    const handlers = { stopTextDrag, toggleRailMiscPanel, closeRailMiscPanelAfterSelection, closeRailMiscPanelFromOutside, closeRailMiscPanelOnEscape, isRailButtonVisible, hasVisibleRailNotice, noteDockedHudResize, relayoutDockedHud, applyWindowState, isRailButtonDisplayed, closeAllWindows, toggleGoalPin, openGoalDrawerTarget, resetWindowLayout, getFreeWindowRect, startCombatLogResize, nudgeCombatLogResize, applyResponsiveMode, closeTopWindowOnEscape, toggleWindowFromHotkey, openWindow, closeWindow, beginGuideWindowLayout, minimizeWindow, toggleMaximizeWindow, openCommunityDock, closeCommunityDock, toggleGoalDrawer, presentGoalDrawer, openGoalNoticeTarget, syncDesktopRailGroups, syncWorkspacePresentation, refitDockedWindows, initWindowManager };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
  }
  function windowApi(runtime) {
    const names = [
      "toggleWindowFromHotkey",
      "openWindow",
      "closeWindow",
      "closeAllWindows",
      "beginGuideWindowLayout",
      "minimizeWindow",
      "toggleMaximizeWindow",
      "resetWindowLayout",
      "openCommunityDock",
      "closeCommunityDock",
      "toggleGoalDrawer",
      "presentGoalDrawer",
      "openGoalNoticeTarget",
      "syncDesktopRailGroups",
      "syncWorkspacePresentation",
      "refitDockedWindows"
    ];
    const api = {};
    for (const name of names) api[name] = (...args) => {
      if (!runtime.active) return;
      syncWindowOwner(runtime);
      return runtime.handlers[name](...args);
    };
    api.dispose = () => disposeWindowManager(runtime);
    return Object.freeze(api);
  }
  function initialize(runtime) {
    runtime.state.DESKTOP_MEDIA = "(min-width: 1081px)";
    runtime.state.UI_LAYOUT_STORAGE_KEY = "project-arpg-idle-ui-layout-v1";
    runtime.state.UI_LAYOUT_VERSION = 1;
    runtime.state.PASSIVE_TREE_PRESENTATION_VERSION = 1;
    runtime.state.WORKSPACE_PRESENTATION_VERSION = 2;
    runtime.state.DOCK_MIN_BATTLE_WIDTH = 380;
    runtime.state.DOCK_MIN_WIDTH = 720;
    runtime.state.DOCK_MAX_WIDTH = 1100;
    runtime.state.DOCK_RATIO = 0.62;
    runtime.state.COMMUNITY_MIN_WIDTH = 280;
    runtime.state.COMMUNITY_MAX_WIDTH = 520;
    runtime.state.DEFAULT_COMMUNITY_WIDTH = 360;
    runtime.state.DESKTOP_RAIL_WIDTH = 140;
    runtime.state.WORKSPACE_GAP = 10;
    runtime.state.WORKSPACE_EDGE = 8;
    runtime.state.RAIL_CORE_TAB_IDS = /* @__PURE__ */ new Set(["btn-tab-character", "btn-tab-char", "btn-tab-items", "btn-tab-map", "btn-tab-journal"]);
    runtime.state.RAIL_EXTERNAL_TAB_IDS = /* @__PURE__ */ new Set([
      "btn-tab-battle",
      "btn-tab-settings",
      "btn-map-complete-action-picker"
    ]);
    initializeWindowDefinitions(runtime);
    initializeWindowState(runtime);
    initializeGoalState(runtime);
  }
  function initializeWindowDefinitions(runtime) {
    runtime.state.WINDOW_DEFS = {
      "tab-character": { title: "캐릭터 능력치", x: 90, y: 40, width: 900, height: 940, minWidth: 520, minHeight: 480 },
      // 2026-10-13: 스킬룬은 장비 창 안의 화면, 해금은 루프 창 안의 화면이 됐다(js/ui.js MERGED_TAB_GROUPS: 창 머리의 탭으로 오간다).
      // 제 창이 없으므로 여기에 줄이 없다(저장된 옛 창 자리는 쓰이지 않는다).
      "tab-items": { title: "장비 및 인벤토리", defaultMaximized: true, dock: true, x: 150, y: 54, width: 1060, height: 780, minWidth: 720, minHeight: 520 },
      "tab-char": { title: "스킬트리", x: 210, y: 70, width: 920, height: 740, minWidth: 620, minHeight: 460, defaultMaximized: true },
      "tab-map": { title: "지도 및 콘텐츠", defaultMaximized: true, dock: true, x: 120, y: 60, width: 900, height: 720, minWidth: 620, minHeight: 440 },
      "tab-settings": { title: "설정", x: 230, y: 40, width: 1e3, height: 800, minWidth: 460, minHeight: 420 },
      // 2026-10-11: 아래 창들은 기본 높이가 낮아 1080p 화면에서 원환 아래 절반, 조합창 끝 줄, 연대기가 잘렸다(재능은 2026-10-16부터 스킬트리 창 안).
      // 높이는 작업 영역(HUD 위)까지만 쓰이므로 작은 화면에서는 전처럼 줄어든다. 사용자가 옮기거나 키운 창은 저장된 크기를 따른다.
      "tab-season": { title: "루프 패시브", x: 210, y: 20, width: 980, height: 920, minWidth: 500, minHeight: 380 },
      "tab-journal": { title: "기록", x: 300, y: 30, width: 820, height: 900, minWidth: 500, minHeight: 380 },
      "tab-stump": { title: "그루터기 함", x: 240, y: 30, width: 940, height: 880, minWidth: 560, minHeight: 440 },
      // 2026-11-06: 거래(NPC, 가판대, 장비 전당)는 장비 창의 칸에서 제 창이 됐다(js/market-ui.js).
      "tab-trade": { title: "거래", x: 200, y: 40, width: 1e3, height: 840, minWidth: 600, minHeight: 440 }
    };
  }
  function initializeWindowState(runtime) {
    runtime.state.layoutState = getDefaultLayoutState(runtime);
    runtime.state.originalSwitchTab = null;
    runtime.state.zOrder = Object.keys(runtime.state.WINDOW_DEFS);
    runtime.state.initialized = false;
    runtime.state.previousDesktopMode = null;
    runtime.state.dockFitWatch = null;
    runtime.state.dockFitFrame = 0;
    runtime.state.EDGE_GRAB_PX = 8;
    runtime.state.EDGE_CURSORS = Object.freeze({ n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize", nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize" });
    runtime.state.railDockHome = null;
    runtime.state.dockedHudWatch = null;
    runtime.state.dockedHudSizes = /* @__PURE__ */ new Map();
    runtime.state.zoneRowWatch = null;
    runtime.state.COMBAT_LOG_RESERVE_MIN = 176;
    runtime.state.COMBAT_LOG_MIN_STAGE = 160;
    runtime.state.COMBAT_LOG_KEY_STEP = 24;
    runtime.state.combatLogResizeFrame = 0;
  }
  function initializeGoalState(runtime) {
    runtime.state.GOAL_AUTO_COLLAPSE_MS = 7e3;
    runtime.state.GOAL_FLASH_MS = 1400;
    runtime.state.goalRuntime = { signature: "", collapseTimer: null, flashTimer: null, currentGoal: null, pendingAutoExpand: false };
    runtime.state.GOAL_SUBTAB_SWITCHES = [["item-tab-", "switchItemSubtab"], ["skill-tab-", "switchSkillSubtab"], ["map-tab-", "switchMapSubtab"]];
    runtime.state.GOAL_TONES = Object.freeze({
      "필수 선택": "#f0a04a",
      "첫 룬": "#f0a04a",
      "보상": "#8fd17a",
      "이야기": "#d6a8ff",
      "루프": "#b7a3e0",
      "루프 조건": "#b7a3e0",
      "다음 주요 해금": "#7fd1c4",
      "기록 갱신": "#7fb6ef",
      "저널": "#7fb6ef",
      "지하계": "#ff8a5c",
      "우주계": "#8fb8ff"
    });
  }

  // modules/ui-window-manager-classic.mjs
  var windowManagerView = createWindowManagerView({
    get window() {
      return window;
    },
    get console() {
      return console;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get document() {
      return document;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get parseFloat() {
      return parseFloat;
    },
    get getComputedStyle() {
      return windowGetComputedStyle;
    },
    get ResizeObserver() {
      return typeof ResizeObserver === "undefined" ? void 0 : ResizeObserver;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get structuredClone() {
      return windowStructuredClone;
    },
    get messageFrames() {
      return typeof messageFrames === "undefined" ? void 0 : messageFrames;
    },
    get tabLayoutUi() {
      return tabLayoutUi;
    },
    get i18n() {
      return i18n;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get getMergedTabGroup() {
      return typeof getMergedTabGroup === "undefined" ? void 0 : getMergedTabGroup;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get stripDecorativeEmoji() {
      return stripDecorativeEmoji;
    },
    get renderCombatLogIcon() {
      return typeof renderCombatLogIcon === "undefined" ? void 0 : renderCombatLogIcon;
    },
    get scheduleStableResize() {
      return typeof scheduleStableResize === "undefined" ? void 0 : scheduleStableResize;
    },
    get resizeCanvas() {
      return typeof resizeCanvas === "undefined" ? void 0 : resizeCanvas;
    },
    get isTextEntryTarget() {
      return isTextEntryTarget;
    }
  });
  window.GameModules.windowManagerView = windowManagerView;
  safeExposeGlobals({
    toggleWindowFromHotkey: windowManagerView.toggleWindowFromHotkey,
    openWindow: windowManagerView.openWindow,
    closeWindow: windowManagerView.closeWindow,
    closeAllWindows: windowManagerView.closeAllWindows,
    beginGuideWindowLayout: windowManagerView.beginGuideWindowLayout,
    minimizeWindow: windowManagerView.minimizeWindow,
    toggleMaximizeWindow: windowManagerView.toggleMaximizeWindow,
    resetWindowLayout: windowManagerView.resetWindowLayout,
    openCommunityDock: windowManagerView.openCommunityDock,
    closeCommunityDock: windowManagerView.closeCommunityDock,
    toggleGoalDrawer: windowManagerView.toggleGoalDrawer,
    presentGoalDrawer: windowManagerView.presentGoalDrawer,
    openGoalNoticeTarget: windowManagerView.openGoalNoticeTarget,
    syncDesktopRailGroups: windowManagerView.syncDesktopRailGroups,
    syncWorkspacePresentation: windowManagerView.syncWorkspacePresentation,
    refitDockedWindows: windowManagerView.refitDockedWindows
  });
})();
