// GENERATED from modules/message-frames-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);
  var windowStructuredClone = (...args) => globalThis.structuredClone(...args);

  // modules/ui/message-frame-queries.mjs
  function frameTabs(runtime, frame) {
    if (!runtime.state.state.split) return frame === "main" ? ["log", "chat"] : [];
    return [frame === "side" ? runtime.state.state.side : otherTab(runtime.state.state.side)];
  }
  function shownTab(runtime, frame) {
    const tabs = frameTabs(runtime, frame);
    if (!tabs.length || runtime.state.state.collapsed[frame]) return null;
    return tabs.length > 1 ? runtime.state.state.active : tabs[0];
  }
  function isFrameTabVisible(runtime, tab) {
    if (!runtime.state.mounted) return runtime.state.phoneTab === tab && !!runtime.deps.document.getElementById("tab-battle")?.classList.contains("active");
    return runtime.state.FRAMES.some((frame) => shownTab(runtime, frame) === tab);
  }
  function otherTab(tab) {
    return tab === "log" ? "chat" : "log";
  }
  function frameEl(runtime, frame) {
    return runtime.deps.document.getElementById(`message-frame-${frame}`);
  }
  function frameScale(runtime) {
    return typeof runtime.deps.uiDisplay === "object" && runtime.deps.uiDisplay.factor || 1;
  }

  // modules/ui/message-frame-geometry.mjs
  function frameWorkspace(runtime) {
    if (runtime.state.env && typeof runtime.state.env.workspaceRect === "function") return runtime.state.env.workspaceRect();
    return { left: 8, top: 8, width: runtime.deps.window.innerWidth / frameScale(runtime) - 16, height: runtime.deps.window.innerHeight / frameScale(runtime) - 16 };
  }
  function clampRect(runtime, rect, keepPosition) {
    const ws = frameWorkspace(runtime);
    const maxWidth = keepPosition ? ws.left + ws.width - rect.x : ws.width;
    const maxHeight = keepPosition ? ws.top + ws.height - rect.y : ws.height;
    const width = clampFrameValue(rect.width, Math.min(runtime.state.MIN_WIDTH, maxWidth), maxWidth);
    const height = clampFrameValue(rect.height, Math.min(runtime.state.MIN_HEIGHT, maxHeight), maxHeight);
    return { width, height, x: clampFrameValue(rect.x, ws.left, ws.left + ws.width - width), y: clampFrameValue(rect.y, ws.top, ws.top + ws.height - height) };
  }
  function shellLogWidth(runtime) {
    const probe = runtime.deps.document.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;width:var(--combat-log-width, 300px)";
    runtime.deps.document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width / frameScale(runtime);
    probe.remove();
    return width > 100 ? width : runtime.state.DEFAULT_WIDTH;
  }
  function openGoalBottom(runtime) {
    const body = runtime.deps.document.querySelector("#ui-goal-drawer.expanded #ui-goal-body");
    const box = body && body.getClientRects().length ? body.getBoundingClientRect() : null;
    return box && box.height ? box.bottom / frameScale(runtime) : 0;
  }
  function defaultMainRect(runtime) {
    const ws = frameWorkspace(runtime), width = shellLogWidth(runtime);
    const hud = runtime.deps.document.querySelector(".player-hud");
    const hudTop = hud ? hud.getBoundingClientRect().top / frameScale(runtime) : 0;
    const bottom = hudTop > ws.top + 240 ? hudTop - runtime.state.GAP : ws.top + ws.height;
    const room = bottom - Math.max(ws.top + runtime.state.TOP_RESERVE, openGoalBottom(runtime) + runtime.state.GAP);
    const height = Math.min(runtime.state.DEFAULT_HEIGHT, bottom - ws.top - runtime.state.TOP_RESERVE, Math.max(runtime.state.MIN_HEIGHT, room));
    return { width, height, x: ws.left + ws.width - width, y: bottom - height };
  }
  function defaultRect(runtime, frame) {
    if (frame !== "side") return defaultMainRect(runtime);
    const main = runtime.state.state.main || defaultMainRect(runtime);
    return { ...main, x: main.x - main.width - runtime.state.GAP };
  }
  function applyRect(runtime, frame, rect) {
    const el = frameEl(runtime, frame), folded = runtime.state.state.collapsed[frame];
    runtime.state.placedRects[frame] = { ...rect };
    el.style.left = `${rect.x}px`;
    el.style.top = `${folded ? rect.y + rect.height - runtime.state.COLLAPSED_HEIGHT : rect.y}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${folded ? runtime.state.COLLAPSED_HEIGHT : rect.height}px`;
  }
  function setRect(runtime, frame, rect, keepPosition) {
    const next = clampRect(runtime, rect, keepPosition);
    if (frame === "main") runtime.state.state.main = next;
    else runtime.state.state.sideRect = next;
    applyRect(runtime, frame, next);
  }
  function createFrameResizeAxis() {
    return function frameResizeAxis(pos, size, delta, movesStart, limits) {
      const [min, lo, hi] = limits;
      if (!movesStart) return [pos, Math.max(Math.min(min, hi - pos), Math.min(hi - pos, size + delta))];
      const end = pos + size, start = Math.max(lo, Math.min(end - min, pos + delta));
      return [start, end - start];
    };
  }
  function frameResizedRect(runtime, rect, edges, dx, dy) {
    const ws = frameWorkspace(runtime);
    const [x, width] = /[ew]/.test(edges) ? runtime.handlers.frameResizeAxis(rect.x, rect.width, dx, edges.includes("w"), [runtime.state.MIN_WIDTH, ws.left, ws.left + ws.width]) : [rect.x, rect.width];
    const [y, height] = /[ns]/.test(edges) ? runtime.handlers.frameResizeAxis(rect.y, rect.height, dy, edges.includes("n"), [runtime.state.MIN_HEIGHT, ws.top, ws.top + ws.height]) : [rect.y, rect.height];
    return { x, y, width, height };
  }
  function clampFrameValue(value, min, max) {
    return Math.round(Math.max(min, Math.min(max, Number(value) || 0)));
  }
  function rectFor(runtime, frame) {
    return (frame === "main" ? runtime.state.state.main : runtime.state.state.sideRect) || defaultRect(runtime, frame);
  }

  // modules/ui/message-frame-store.mjs
  function defaultFrameState() {
    return { split: false, active: "log", side: "chat", main: null, sideRect: null, collapsed: { main: true, side: false } };
  }
  function validFrameRect(rect) {
    if (!rect || !["x", "y", "width", "height"].every((key) => Number.isFinite(Number(rect[key])))) return null;
    return { x: Number(rect.x), y: Number(rect.y), width: Number(rect.width), height: Number(rect.height) };
  }
  function normalizeFrameState(runtime, saved) {
    const base = defaultFrameState();
    if (!saved || typeof saved !== "object") return base;
    const collapsed = saved.collapsed || {};
    return {
      split: saved.split === true,
      active: runtime.state.TABS[saved.active] ? saved.active : base.active,
      side: runtime.state.TABS[saved.side] ? saved.side : base.side,
      main: validFrameRect(saved.main),
      sideRect: validFrameRect(saved.sideRect),
      collapsed: { main: typeof collapsed.main === "boolean" ? collapsed.main : base.collapsed.main, side: collapsed.side === true }
    };
  }
  function readFrameState(runtime) {
    try {
      return normalizeFrameState(runtime, JSON.parse(runtime.deps.localStorage.getItem(runtime.state.STORAGE_KEY) || "null"));
    } catch (error) {
      runtime.deps.console.warn("message frame layout ignored:", error);
      return defaultFrameState();
    }
  }
  function saveFrameState(runtime) {
    if (!runtime.active || runtime.state.pointer) return;
    try {
      runtime.deps.localStorage.setItem(runtime.state.STORAGE_KEY, JSON.stringify(runtime.state.state));
    } catch (error) {
      runtime.deps.console.warn("message frame layout was not saved:", error);
    }
  }

  // modules/ui/message-frame-presentation.mjs
  function actionsHtml(runtime, frame, tabs) {
    const folded = runtime.state.state.collapsed[frame];
    const buttons = tabs.includes("chat") ? [["settings", "⚙", "채팅 설정"]] : [];
    buttons.push(runtime.state.state.split ? ["merge", "⇲", "합치기"] : ["split", "⇱", "보는 탭을 따로 띄우기"]);
    buttons.push(folded ? ["collapse", "▢", "펼치기"] : ["collapse", "—", "접기"]);
    return buttons.map(([action, glyph, label]) => `<button type="button" data-message-action="${action}" data-tip="${label}" aria-label="${label}">${glyph}</button>`).join("");
  }
  function renderBar(runtime, frame, tabs) {
    const el = frameEl(runtime, frame), shown = tabs.length > 1 ? runtime.state.state.active : tabs[0];
    el.querySelector(".message-frame-tabs").innerHTML = tabs.map((tab) => `<button type="button" class="message-frame-tab${tab === shown ? " active" : ""}" role="tab" aria-selected="${tab === shown}" data-message-tab="${tab}">${(0, runtime.deps._t)(runtime.state.TABS[tab].label)}</button>`).join("");
    el.querySelector(".message-frame-actions").innerHTML = actionsHtml(runtime, frame, tabs);
    const chatTab = el.querySelector('[data-message-tab="chat"]');
    if (chatTab && runtime.state.dot) chatTab.appendChild(runtime.state.dot);
  }
  function renderFrame(runtime, frame) {
    const el = frameEl(runtime, frame), tabs = frameTabs(runtime, frame);
    el.style.display = tabs.length ? "" : "none";
    if (!tabs.length) return;
    el.classList.toggle("collapsed", runtime.state.state.collapsed[frame]);
    renderBar(runtime, frame, tabs);
    applyRect(runtime, frame, clampRect(runtime, rectFor(runtime, frame)));
  }
  function placePanes(runtime) {
    Object.keys(runtime.state.TABS).forEach((tab) => {
      const pane = runtime.deps.document.getElementById(runtime.state.TABS[tab].paneId);
      const frame = runtime.state.FRAMES.find((name) => shownTab(runtime, name) === tab);
      const target = frame ? frameEl(runtime, frame).querySelector(".message-frame-body") : runtime.state.stash;
      if (pane && pane.parentElement !== target) target.appendChild(pane);
    });
  }
  function noticeFrameVisibility(runtime) {
    const now = new Set(Object.keys(runtime.state.TABS).filter(runtime.handlers.isFrameTabVisible));
    if (now.has("chat") && !runtime.state.visible.has("chat") && typeof runtime.deps.renderSocialTab === "function") (0, runtime.deps.renderSocialTab)();
    const log = runtime.deps.document.getElementById("log");
    if (now.has("log") && !runtime.state.visible.has("log") && log) log.scrollTop = log.scrollHeight;
    runtime.state.visible = now;
    if (typeof runtime.deps.syncSocialChatPolling === "function") (0, runtime.deps.syncSocialChatPolling)();
    if (typeof runtime.deps.updateTabNotificationDots === "function") (0, runtime.deps.updateTabNotificationDots)();
  }
  function followGoalDrawer(runtime) {
    if (!runtime.active || !runtime.state.mounted) return;
    runtime.state.FRAMES.forEach((frame) => {
      if (frameTabs(runtime, frame).length && !(frame === "main" ? runtime.state.state.main : runtime.state.state.sideRect)) applyRect(runtime, frame, clampRect(runtime, defaultRect(runtime, frame)));
    });
  }
  function watchGoalDrawer(runtime) {
    const body = runtime.deps.document.getElementById("ui-goal-body");
    if (!body || typeof runtime.deps.ResizeObserver !== "function" || runtime.state.goalTarget === body) return;
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalTarget = body;
    runtime.state.goalWatch = new runtime.deps.ResizeObserver(runtime.handlers.followGoalDrawer);
    runtime.state.goalWatch.observe(body);
  }
  function renderFrames(runtime, persist = true) {
    if (!runtime.active || !runtime.state.mounted) return;
    watchGoalDrawer(runtime);
    runtime.state.FRAMES.forEach(runtime.handlers.renderFrame);
    placePanes(runtime);
    if (persist) saveFrameState(runtime);
    noticeFrameVisibility(runtime);
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

  // modules/ui/message-frame-lifetime.mjs
  function cancelMessagePointer(runtime) {
    runtime.state.pointer?.cancelMessagePointer();
  }
  function clearMessageClickTimer(runtime) {
    runtime.deps.clearTimeout(runtime.state.clickTimer);
    runtime.state.clickTimer = null;
    runtime.state.suppressClick = false;
  }
  function syncMessageOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    runtime.state.owner = runtime.deps.game;
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    runtime.state.stageBox = null;
    runtime.state.visible.clear();
  }
  function listenMessage(runtime, target, type, callback) {
    listenView(runtime, target, type, (event) => {
      if (!runtime.active) return;
      syncMessageOwner(runtime);
      callback(event);
    });
  }

  // modules/ui/message-frame-interaction.mjs
  function splitTab(runtime, tab, point) {
    if (runtime.state.state.split) return;
    runtime.state.state.split = true;
    runtime.state.state.side = tab;
    runtime.state.state.collapsed.side = false;
    runtime.state.state.sideRect = clampRect(runtime, point ? { ...rectFor(runtime, "main"), x: point.x - rectFor(runtime, "main").width / 2, y: point.y - 14 } : defaultRect(runtime, "side"));
    renderFrames(runtime);
  }
  function mergeTabs(runtime, tab) {
    runtime.state.state.split = false;
    runtime.state.state.active = tab;
    runtime.state.state.collapsed.main = false;
    renderFrames(runtime);
  }
  function runAction(runtime, action, frame) {
    if (action === "settings" && typeof runtime.deps.openChatSettings === "function") return (0, runtime.deps.openChatSettings)();
    if (action === "split") return splitTab(runtime, runtime.state.state.active, null);
    if (action === "merge") return mergeTabs(runtime, frameTabs(runtime, frame)[0]);
    if (action !== "collapse") return void 0;
    runtime.state.state.collapsed[frame] = !runtime.state.state.collapsed[frame];
    return renderFrames(runtime);
  }
  function onFrameClick(runtime, event, frame) {
    if (runtime.state.suppressClick) {
      runtime.state.suppressClick = false;
      return;
    }
    cancelMessagePointer(runtime);
    const action = event.target.closest("[data-message-action]");
    if (action) return runAction(runtime, action.dataset.messageAction, frame);
    const tab = event.target.closest("[data-message-tab]");
    if (!tab || runtime.state.state.split) return void 0;
    runtime.state.state.active = tab.dataset.messageTab;
    runtime.state.state.collapsed.main = false;
    return renderFrames(runtime);
  }
  function trackPointer(runtime, event, onMove, onEnd) {
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    const owner = runtime.deps.game, snapshot = runtime.deps.structuredClone(runtime.state.state);
    const pointer = { active: true, listeners: [], cancelMessagePointer: () => finishMessagePointer(false) };
    const finishMessagePointer = (commit) => {
      if (!pointer.active) return;
      releaseViewEvents(pointer);
      runtime.state.pointer = null;
      if (commit && runtime.active && owner === runtime.deps.game && runtime.state.mounted) onEnd();
      else {
        runtime.state.state = snapshot;
        clearMessageClickTimer(runtime);
        renderFrames(runtime, false);
      }
    };
    runtime.state.pointer = pointer;
    listenView(pointer, runtime.deps.window, "pointermove", (moved) => {
      if (moved.pointerId !== event.pointerId) return;
      if (!runtime.active || owner !== runtime.deps.game || !runtime.state.mounted) {
        finishMessagePointer(false);
        return;
      }
      onMove(moved);
    });
    listenView(pointer, runtime.deps.window, "pointerup", (ended) => {
      if (ended.pointerId === event.pointerId) finishMessagePointer(true);
    });
    listenView(pointer, runtime.deps.window, "pointercancel", (ended) => {
      if (ended.pointerId === event.pointerId) finishMessagePointer(false);
    });
    listenView(pointer, runtime.deps.window, "blur", () => finishMessagePointer(false));
  }
  function beginMove(runtime, event, frame) {
    cancelMessagePointer(runtime);
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(runtime, frame) } };
    trackPointer(
      runtime,
      event,
      (move) => setRect(runtime, frame, { ...start.rect, x: start.rect.x + (move.clientX - start.x) / frameScale(runtime), y: start.rect.y + (move.clientY - start.y) / frameScale(runtime) }),
      () => saveFrameState(runtime)
    );
  }
  function beginResize(runtime, event, frame, edges) {
    if (event.button !== void 0 && event.button !== 0) return;
    cancelMessagePointer(runtime);
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(runtime, frame) } };
    trackPointer(
      runtime,
      event,
      (move) => setRect(runtime, frame, frameResizedRect(runtime, start.rect, edges, (move.clientX - start.x) / frameScale(runtime), (move.clientY - start.y) / frameScale(runtime)), true),
      () => saveFrameState(runtime)
    );
  }
  function leftFrame(runtime, event, frame) {
    const box = frameEl(runtime, frame).getBoundingClientRect();
    return event.clientX < box.left - runtime.state.DRAG_OUT_PX || event.clientX > box.right + runtime.state.DRAG_OUT_PX || event.clientY < box.top - runtime.state.DRAG_OUT_PX || event.clientY > box.bottom + runtime.state.DRAG_OUT_PX;
  }
  function beginTabDrag(runtime, event, tab) {
    let dragged = false;
    trackPointer(runtime, event, (move) => {
      if (!dragged && !leftFrame(runtime, move, "main")) return;
      const point = { x: move.clientX / frameScale(runtime), y: move.clientY / frameScale(runtime) };
      if (!dragged) {
        dragged = true;
        runtime.state.suppressClick = true;
        return splitTab(runtime, tab, point);
      }
      return setRect(runtime, "side", { ...rectFor(runtime, "side"), x: point.x - rectFor(runtime, "side").width / 2, y: point.y - 14 });
    }, () => {
      if (!dragged) return;
      saveFrameState(runtime);
      runtime.state.clickTimer = (0, runtime.deps.setTimeout)(() => clearMessageClickTimer(runtime), 0);
    });
  }
  function onBarPointerDown(runtime, event, frame) {
    if (event.button !== void 0 && event.button !== 0) return;
    if (event.target.closest("[data-message-action]")) return;
    const tab = event.target.closest("[data-message-tab]");
    if (tab && !runtime.state.state.split) beginTabDrag(runtime, event, tab.dataset.messageTab);
    else beginMove(runtime, event, frame);
  }
  function buildFrame(runtime, frame) {
    const el = runtime.deps.document.createElement("section");
    el.id = `message-frame-${frame}`;
    el.className = "message-frame";
    el.setAttribute("aria-label", frame === "main" ? "전투 기록과 채팅" : "따로 띄운 탭");
    el.innerHTML = '<div class="message-frame-bar"><div class="message-frame-tabs" role="tablist"></div><div class="message-frame-actions"></div></div><div class="message-frame-body"></div>' + runtime.state.EDGES.map((edges) => `<div class="message-frame-edge" data-edges="${edges}" aria-hidden="true"></div>`).join("");
    listenMessage(runtime, el.querySelector(".message-frame-bar"), "pointerdown", (event) => onBarPointerDown(runtime, event, frame));
    el.querySelectorAll("[data-edges]").forEach((handle) => listenMessage(runtime, handle, "pointerdown", (event) => beginResize(runtime, event, frame, handle.dataset.edges)));
    listenMessage(runtime, el, "click", (event) => onFrameClick(runtime, event, frame));
    return el;
  }
  function createFrames(runtime, layer) {
    runtime.state.FRAMES.forEach((frame) => layer.appendChild(buildFrame(runtime, frame)));
    runtime.state.stash = runtime.deps.document.createElement("div");
    runtime.state.stash.className = "message-frame-stash";
    runtime.state.stash.hidden = true;
    layer.appendChild(runtime.state.stash);
    runtime.state.dot = runtime.deps.document.getElementById("noti-social-dock");
  }

  // modules/ui/message-frame-mount.mjs
  function rememberHome(runtime, element) {
    if (element && !runtime.state.homes.has(element)) runtime.state.homes.set(element, { parent: element.parentElement, next: element.nextSibling });
  }
  function mountFrames(runtime) {
    const layer = runtime.deps.document.getElementById("right-pane");
    if (!layer) return;
    if (!runtime.state.stash) createFrames(runtime, layer);
    if (!runtime.state.mounted) {
      [...Object.values(runtime.state.TABS).map((tab) => runtime.deps.document.getElementById(tab.paneId)), runtime.state.dot].forEach(runtime.handlers.rememberHome);
      runtime.state.mounted = true;
      runtime.deps.document.body.classList.add("message-frames-on");
      runtime.deps.document.getElementById("tab-social")?.classList.add("ui-community-dock");
    }
    renderFrames(runtime);
  }
  function unmountFrames(runtime) {
    if (!runtime.state.mounted) return;
    cancelMessagePointer(runtime);
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalWatch = runtime.state.goalTarget = null;
    runtime.state.mounted = false;
    runtime.state.homes.forEach((home, element) => home.parent.insertBefore(element, home.next && home.next.parentNode === home.parent ? home.next : null));
    runtime.deps.document.body.classList.remove("message-frames-on");
    runtime.deps.document.getElementById("tab-social")?.classList.remove("ui-community-dock");
    runtime.state.FRAMES.forEach((frame) => {
      const el = frameEl(runtime, frame);
      if (el) el.style.display = "none";
    });
    runtime.state.visible = /* @__PURE__ */ new Set();
  }
  function placePhoneFeed(runtime) {
    const feed = runtime.deps.document.querySelector("#tab-battle .combat-feed"), social = runtime.deps.document.getElementById("tab-social");
    if (!feed || !social) return;
    const chat = !runtime.state.mounted && runtime.state.phoneTab === "chat";
    rememberHome(runtime, social);
    if (chat && social.parentElement !== feed) feed.appendChild(social);
    if (!chat && social.parentElement === feed) {
      const home = runtime.state.homes.get(social);
      home.parent.insertBefore(social, home.next && home.next.parentNode === home.parent ? home.next : null);
    }
    social.classList.toggle("is-feed-chat", chat);
    feed.classList.toggle("is-chat", chat);
    feed.querySelectorAll(".combat-feed-title > .ui-context-dock-tab").forEach((button) => {
      const on = button.id === "btn-combat-chat-tab" === chat;
      button.classList.toggle("active", on);
      button.setAttribute("aria-selected", String(on));
    });
  }
  function showPhoneTab(runtime, tab) {
    if (runtime.state.mounted || !runtime.state.TABS[tab]) return false;
    runtime.state.phoneTab = tab;
    placePhoneFeed(runtime);
    if (runtime.deps.uiDisplay.battleHudAtSide && runtime.deps.document.body.classList.contains("combat-log-collapsed")) (0, runtime.deps.toggleCombatLogCollapse)();
    noticeFrameVisibility(runtime);
    return true;
  }
  function syncFrames(runtime, environment) {
    const changed = !runtime.state.env || runtime.state.env.desktop !== environment?.desktop;
    runtime.state.env = environment || runtime.state.env;
    if (runtime.state.env && runtime.state.env.desktop) mountFrames(runtime);
    else unmountFrames(runtime);
    placePhoneFeed(runtime);
    if (changed && typeof runtime.deps.applyPanelLayoutSettings === "function") (0, runtime.deps.applyPanelLayoutSettings)();
  }
  function showFrameTab(runtime, tab, expand = true) {
    if (!runtime.state.mounted || !runtime.state.TABS[tab]) return false;
    cancelMessagePointer(runtime);
    if (runtime.state.state.split) {
      if (expand) runtime.state.state.collapsed[runtime.state.state.side === tab ? "side" : "main"] = false;
    } else {
      runtime.state.state.active = tab;
      if (expand) runtime.state.state.collapsed.main = false;
    }
    renderFrames(runtime);
    return true;
  }
  function resetFrames(runtime) {
    cancelMessagePointer(runtime);
    runtime.state.state = defaultFrameState();
    renderFrames(runtime);
  }
  function disposeMessageFrames(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    releaseViewEvents(runtime);
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalWatch = runtime.state.goalTarget = null;
    unmountFrames(runtime);
    runtime.state.phoneTab = "log";
    placePhoneFeed(runtime);
    runtime.state.homes.forEach((home, element) => home.parent.insertBefore(element, home.next?.parentNode === home.parent ? home.next : null));
    for (const frame of runtime.state.FRAMES) frameEl(runtime, frame)?.remove();
    runtime.state.stash?.remove();
    runtime.state.homes.clear();
    runtime.state.stash = runtime.state.dot = runtime.state.env = runtime.state.stageBox = null;
    runtime.state.visible.clear();
  }

  // modules/ui/message-frame-occlusion.mjs
  function readStageBox(runtime) {
    const canvas = runtime.deps.document.getElementById("battlefield-canvas"), box = canvas ? canvas.getBoundingClientRect() : null;
    runtime.state.stageBox = box && canvas.clientWidth ? { left: box.left, top: box.top, scale: box.width / canvas.clientWidth } : null;
  }
  function frameCoversHero(runtime, frame, at) {
    if (frame === "side" && !runtime.state.state.split) return false;
    const rect = runtime.state.placedRects[frame];
    if (!rect) return false;
    const scale = frameScale(runtime), top = runtime.state.state.collapsed[frame] ? rect.y + rect.height - runtime.state.COLLAPSED_HEIGHT : rect.y;
    return at.x + runtime.state.HERO_HALF > rect.x * scale && at.x - runtime.state.HERO_HALF < (rect.x + rect.width) * scale && at.y > top * scale && at.top < (rect.y + rect.height) * scale;
  }
  function fadeFramesOverHero(runtime, x, y, top) {
    if (!runtime.state.mounted) return;
    const known = Number.isFinite(x);
    if (known && !runtime.state.stageBox) readStageBox(runtime);
    const at = known && runtime.state.stageBox ? { x: runtime.state.stageBox.left + x * runtime.state.stageBox.scale, y: runtime.state.stageBox.top + y * runtime.state.stageBox.scale, top: runtime.state.stageBox.top + top * runtime.state.stageBox.scale } : null;
    for (const frame of runtime.state.FRAMES) {
      const over = !!at && frameCoversHero(runtime, frame, at);
      if (over === runtime.state.faded[frame]) continue;
      runtime.state.faded[frame] = over;
      frameEl(runtime, frame).classList.toggle("over-hero", over);
    }
  }
  function frameBoxOnStage(runtime, frame) {
    if (frame === "side" && !runtime.state.state.split || runtime.state.state.collapsed[frame]) return null;
    if (runtime.state.faded[frame] && !frameEl(runtime, frame).matches(":hover, :focus-within")) return null;
    const rect = runtime.state.placedRects[frame];
    if (!rect) return null;
    const k = frameScale(runtime) / runtime.state.stageBox.scale, dx = runtime.state.stageBox.left / runtime.state.stageBox.scale, dy = runtime.state.stageBox.top / runtime.state.stageBox.scale;
    return { left: rect.x * k - dx, right: (rect.x + rect.width) * k - dx, top: rect.y * k - dy, bottom: (rect.y + rect.height) * k - dy };
  }
  function stageCoveredFrom(runtime, y, width) {
    if (!runtime.state.mounted) return width;
    if (!runtime.state.stageBox) readStageBox(runtime);
    if (!runtime.state.stageBox) return width;
    const boxes = runtime.state.FRAMES.map(runtime.handlers.frameBoxOnStage).filter((box) => box && y >= box.top && y <= box.bottom).sort((a, b) => b.right - a.right);
    let limit = width;
    for (const box of boxes) if (box.right >= limit - runtime.state.COVER_JOIN) limit = Math.min(limit, box.left);
    return limit;
  }

  // modules/ui/message-frames-view.mjs
  function createMessageFramesView(deps) {
    const runtime = { deps, state: { owner: deps.game, pointer: null, clickTimer: null }, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { isFrameTabVisible, followGoalDrawer, renderFrame, rememberHome, frameBoxOnStage, syncFrames, showFrameTab, showPhoneTab, resetFrames, fadeFramesOverHero, stageCoveredFrom };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.handlers.frameResizeAxis = createFrameResizeAxis();
    runtime.api = messageFramesApi(runtime);
    listenMessage(runtime, runtime.deps.window, "game:languagechange", () => {
      if (runtime.state.mounted) runtime.state.FRAMES.forEach((frame) => renderBar(runtime, frame, frameTabs(runtime, frame)));
    });
    listenMessage(runtime, runtime.deps.window, "resize", () => {
      runtime.state.stageBox = null;
    });
    return runtime.api;
  }
  function messageFramesApi(runtime) {
    const calls = {
      sync: runtime.handlers.syncFrames,
      showTab: runtime.handlers.showFrameTab,
      showPhoneTab: runtime.handlers.showPhoneTab,
      isTabVisible: runtime.handlers.isFrameTabVisible,
      isActive: () => runtime.state.mounted,
      reset: runtime.handlers.resetFrames,
      heroAt: runtime.handlers.fadeFramesOverHero,
      coveredFrom: runtime.handlers.stageCoveredFrom
    };
    const api = {};
    for (const [name, handler] of Object.entries(calls)) api[name] = (...args) => {
      if (!runtime.active) return name === "coveredFrom" ? args[1] : false;
      syncMessageOwner(runtime);
      return handler(...args);
    };
    api.dispose = () => disposeMessageFrames(runtime);
    return Object.freeze(api);
  }
  function initialize(runtime) {
    runtime.state.STORAGE_KEY = "rignin-message-frames-v1";
    runtime.state.TABS = Object.freeze({ log: { label: "전투", paneId: "log" }, chat: { label: "채팅", paneId: "tab-social" } });
    runtime.state.FRAMES = Object.freeze(["main", "side"]);
    runtime.state.MIN_WIDTH = 220;
    runtime.state.MIN_HEIGHT = 120;
    runtime.state.COLLAPSED_HEIGHT = 34;
    runtime.state.DRAG_OUT_PX = 24;
    runtime.state.DEFAULT_WIDTH = 300;
    runtime.state.DEFAULT_HEIGHT = 240;
    runtime.state.GAP = 10;
    runtime.state.TOP_RESERVE = 96;
    runtime.state.EDGES = Object.freeze(["n", "s", "e", "w", "nw", "ne", "sw", "se"]);
    runtime.state.homes = /* @__PURE__ */ new Map();
    runtime.state.placedRects = { main: null, side: null };
    runtime.state.state = readFrameState(runtime);
    runtime.state.env = null;
    runtime.state.mounted = false;
    runtime.state.stash = null;
    runtime.state.dot = null;
    runtime.state.visible = /* @__PURE__ */ new Set();
    runtime.state.suppressClick = false;
    runtime.state.phoneTab = "log";
    runtime.state.goalWatch = null;
    runtime.state.HERO_HALF = 30;
    runtime.state.faded = { main: false, side: false };
    runtime.state.stageBox = null;
    runtime.state.COVER_JOIN = 40;
  }

  // modules/message-frames-ui-classic.mjs
  var messageFrames = createMessageFramesView({
    get localStorage() {
      return localStorage;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get structuredClone() {
      return windowStructuredClone;
    },
    get clearTimeout() {
      return windowClearTimeout;
    },
    get console() {
      return console;
    },
    get document() {
      return document;
    },
    get window() {
      return window;
    },
    get _t() {
      return _t;
    },
    get renderSocialTab() {
      return typeof renderSocialTab === "undefined" ? void 0 : renderSocialTab;
    },
    get syncSocialChatPolling() {
      return typeof syncSocialChatPolling === "undefined" ? void 0 : syncSocialChatPolling;
    },
    get updateTabNotificationDots() {
      return typeof updateTabNotificationDots === "undefined" ? void 0 : updateTabNotificationDots;
    },
    get ResizeObserver() {
      return typeof ResizeObserver === "undefined" ? void 0 : ResizeObserver;
    },
    get openChatSettings() {
      return typeof openChatSettings === "undefined" ? void 0 : openChatSettings;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get uiDisplay() {
      return typeof uiDisplay === "undefined" ? void 0 : uiDisplay;
    },
    get toggleCombatLogCollapse() {
      return toggleCombatLogCollapse;
    },
    get applyPanelLayoutSettings() {
      return typeof applyPanelLayoutSettings === "undefined" ? void 0 : applyPanelLayoutSettings;
    }
  });
  safeExposeGlobals({ messageFrames });
})();
