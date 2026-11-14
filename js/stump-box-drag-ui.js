// GENERATED from modules/stump-box-drag-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

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

  // modules/ui/stump-drag-actions.mjs
  function stumpTarget(runtime, event) {
    return event.target && event.target.closest ? event.target.closest("#tab-stump") && event.target : null;
  }
  function clearPress(runtime) {
    if (!runtime.state.press) return;
    (0, runtime.deps.clearTimeout)(runtime.state.press.timer);
    runtime.state.press.source.classList.remove("is-held");
    runtime.state.press = null;
  }
  function closeTouchTooltip(runtime, event, target) {
    if (event.pointerType !== "mouse" && !(target && target.closest('[data-stump-tip="rules"]'))) (0, runtime.deps.hideInfoTooltip)();
  }
  function startPress(runtime, event) {
    runtime.state.swallowClick = false;
    if (runtime.state.press || runtime.state.drag || event.button > 0 || event.isPrimary === false) return;
    const target = stumpTarget(runtime, event);
    closeTouchTooltip(runtime, event, target);
    const source = target && target.closest("[data-stump-drag], [data-stump-drag-cube]");
    if (source) holdSource(runtime, event, source);
  }
  function holdSource(runtime, event, source) {
    const touch = event.pointerType === "touch", cube = source.dataset.stumpDragCube !== void 0 ? cubeGrab(runtime, source, event) : null;
    runtime.state.press = { owner: runtime.deps.game, pointerId: event.pointerId, id: cube ? null : Number(source.dataset.stumpDrag), cube, source, x: event.clientX, y: event.clientY, armed: !touch, timer: 0 };
    if (touch) runtime.state.press.timer = runtime.deps.setTimeout(() => {
      if (!currentStumpPointer(runtime, runtime.state.press) || !source.isConnected) return clearPress(runtime);
      runtime.state.press.armed = true;
      source.classList.add("is-held");
    }, runtime.state.HOLD_MS);
  }
  function ghostFor(runtime, source) {
    const ghost = runtime.deps.document.createElement("div");
    ghost.className = "stump-drag-ghost";
    ghost.setAttribute("aria-hidden", "true");
    const image = source.querySelector("img");
    if (image) ghost.appendChild(image.cloneNode(false));
    ghost.style.setProperty("--stump-tone", source.style.getPropertyValue("--stump-tone") || "transparent");
    runtime.deps.document.body.appendChild(ghost);
    return ghost;
  }
  function cubeCellAt(runtime, zone, x, y) {
    const at = Number(zone.dataset.stumpDropCube), w = Number(zone.dataset.cubeW) || 1, h = Number(zone.dataset.cubeH) || 1;
    const rect = zone.getBoundingClientRect(), clamp = (v, n) => Math.max(0, Math.min(n - 1, v));
    const dx = clamp(Math.floor((x - rect.left) / (rect.width / w)), w), dy = clamp(Math.floor((y - rect.top) / (rect.height / h)), h);
    return at + dy * runtime.deps.stumpCube.SIZE + dx;
  }
  function cubeGrab(runtime, source, event) {
    const from = Number(source.dataset.stumpDragCube), held = cubeCellAt(runtime, source, event.clientX, event.clientY);
    return { from, dx: held % runtime.deps.stumpCube.SIZE - from % runtime.deps.stumpCube.SIZE, dy: Math.floor(held / runtime.deps.stumpCube.SIZE) - Math.floor(from / runtime.deps.stumpCube.SIZE) };
  }
  function cubeTarget(runtime, zone, x, y) {
    const cell = cubeCellAt(runtime, zone, x, y), size = runtime.deps.stumpCube.SIZE;
    const tx = cell % size - runtime.state.drag.cube.dx, ty = Math.floor(cell / size) - runtime.state.drag.cube.dy;
    return tx < 0 || ty < 0 ? -1 : ty * size + tx;
  }
  function beginDrag(runtime, event) {
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    runtime.state.drag = { owner: runtime.state.press.owner, pointerId: runtime.state.press.pointerId, id: runtime.state.press.id, cube: runtime.state.press.cube, source: runtime.state.press.source, ghost: ghostFor(runtime, runtime.state.press.source), zone: null, point: null };
    clearPress(runtime);
    runtime.state.drag.source.classList.add("is-dragging");
    runtime.deps.document.getElementById("tab-stump")?.classList.add("is-stump-dragging");
    (0, runtime.deps.hideInfoTooltip)();
    follow(runtime, event);
  }
  function movePress(runtime, event) {
    if (!runtime.state.press || runtime.state.press.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - runtime.state.press.x, event.clientY - runtime.state.press.y);
    if (!runtime.state.press.armed) {
      if (distance > runtime.state.TOUCH_SLOP_PX) clearPress(runtime);
      return;
    }
    if (distance >= runtime.state.DRAG_PX) beginDrag(runtime, event);
  }
  function zoneAt(runtime, x, y) {
    const hit = runtime.deps.document.elementFromPoint(x, y), bag = runtime.state.drag?.cube ? ", #tab-stump #stump-equip-host" : "";
    return hit && hit.closest ? hit.closest(`#tab-stump [data-stump-storage-slot], #tab-stump [data-stump-drop-cell], #tab-stump [data-stump-drop-storage], #tab-stump [data-stump-drop-cube]${bag}`) : null;
  }
  function zoneAccepts(runtime, zone) {
    if (runtime.state.drag.cube) return zone.dataset.stumpDropCube === void 0 ? zone.dataset.stumpDropCell === void 0 : runtime.deps.stumpCube.canMove(runtime.deps.game, runtime.state.drag.cube.from, cubeTarget(runtime, zone, runtime.state.drag.point.clientX, runtime.state.drag.point.clientY));
    if (zone.dataset.stumpDropStorage || zone.dataset.stumpStorageSlot !== void 0) return true;
    if (zone.dataset.stumpDropCube !== void 0) return runtime.deps.stumpCube.candidates("stump").some((item) => item.id === runtime.state.drag.id);
    const cell = Number(zone.dataset.stumpDropCell);
    return runtime.deps.stumpBox.isOpen(runtime.deps.game, cell) && runtime.deps.game.stumpBox.board[cell] !== runtime.state.drag.id;
  }
  function markZone(runtime, zone) {
    if (runtime.state.drag.zone === zone && !runtime.state.drag.cube) return;
    runtime.state.drag.zone?.classList.remove("is-drop-ok", "is-drop-bad");
    runtime.state.drag.zone = zone;
    if (zone) zone.classList.add(zoneAccepts(runtime, zone) ? "is-drop-ok" : "is-drop-bad");
    if (!runtime.state.drag.cube && zone?.dataset.stumpDropCell !== void 0 && zoneAccepts(runtime, zone)) runtime.deps.stumpBoxUi.previewCell(runtime.state.drag.id, Number(zone.dataset.stumpDropCell), false, true);
    else runtime.deps.stumpBoxUi.clearPlacementPreview(true);
  }
  function showDragTip(runtime, point) {
    const tip = runtime.state.drag.cube ? null : runtime.deps.stumpBoxUi.placementTip();
    if (tip) (0, runtime.deps.showInfoTooltipHtml)(point.clientX, point.clientY, tip.html, tip.tone);
    else (0, runtime.deps.hideInfoTooltip)();
  }
  function flipStoragePage(runtime, point) {
    const hit = runtime.deps.document.elementFromPoint(point.clientX, point.clientY);
    const button = runtime.state.drag.cube || !hit || !hit.closest ? null : hit.closest('#tab-stump [data-stump-action="storage-page"]');
    if (button === (runtime.state.pageHover && runtime.state.pageHover.button)) return;
    (0, runtime.deps.clearTimeout)(runtime.state.pageHover && runtime.state.pageHover.timer);
    runtime.state.pageHover = button ? { button, timer: (0, runtime.deps.setTimeout)(() => {
      if (currentStumpPointer(runtime, runtime.state.drag)) runtime.deps.stumpBoxUi.showStoragePage(Number(button.dataset.page));
      runtime.state.pageHover = null;
    }, runtime.state.PAGE_HOVER_MS) } : null;
  }
  function follow(runtime, point) {
    if (!currentStumpPointer(runtime, runtime.state.drag)) return endDrag(runtime);
    const scale = runtime.deps.uiDisplay.factor || 1;
    runtime.state.drag.point = point;
    runtime.state.drag.ghost.style.transform = `translate3d(${Math.round(point.clientX / scale)}px,${Math.round(point.clientY / scale)}px,0)`;
    markZone(runtime, zoneAt(runtime, point.clientX, point.clientY));
    showDragTip(runtime, point);
    flipStoragePage(runtime, point);
  }
  function scheduleFollow(runtime, event) {
    runtime.state.pending = { clientX: event.clientX, clientY: event.clientY };
    if (runtime.state.frame) return;
    runtime.state.frame = (0, runtime.deps.requestAnimationFrame)(() => {
      runtime.state.frame = 0;
      follow(runtime, runtime.state.pending);
    });
  }
  function endDrag(runtime) {
    if (!runtime.state.drag) return;
    if (runtime.state.frame) (0, runtime.deps.cancelAnimationFrame)(runtime.state.frame);
    runtime.state.frame = 0;
    (0, runtime.deps.clearTimeout)(runtime.state.pageHover && runtime.state.pageHover.timer);
    runtime.state.pageHover = null;
    runtime.state.drag.zone?.classList.remove("is-drop-ok", "is-drop-bad");
    runtime.state.drag.source.classList.remove("is-dragging");
    runtime.state.drag.ghost.remove();
    runtime.deps.document.getElementById("tab-stump")?.classList.remove("is-stump-dragging");
    runtime.state.drag = null;
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    (0, runtime.deps.hideInfoTooltip)();
  }
  function finishDrag(runtime, event) {
    const id = runtime.state.drag.id, zone = zoneAt(runtime, event.clientX, event.clientY);
    const cubeDrop = runtime.state.drag.cube && zone ? cubeDropTarget(runtime, zone, event) : void 0, from = runtime.state.drag.cube?.from;
    endDrag(runtime);
    runtime.state.swallowClick = true;
    runtime.state.swallowTimer = runtime.deps.setTimeout(() => {
      runtime.state.swallowClick = false;
    }, 0);
    if (!zone) return;
    if (cubeDrop !== void 0) return cubeDrop === false ? void 0 : runtime.deps.stumpBoxUi.dropCubeItem(from, cubeDrop);
    dropStumpItem(runtime, id, zone, event);
  }
  function dropStumpItem(runtime, id, zone, event) {
    if (zone.dataset.stumpStorageSlot !== void 0) runtime.deps.stumpBoxUi.dropOnStorage(id, Number(zone.dataset.stumpStorageSlot));
    else if (zone.dataset.stumpDropStorage) runtime.deps.stumpBoxUi.dropOnStorage(id);
    else if (zone.dataset.stumpDropCube !== void 0) runtime.deps.stumpBoxUi.dropOnCube(id, Number(zone.dataset.stumpDropCube));
    else if (event.pointerType === "touch") runtime.deps.stumpBoxUi.previewCell(id, Number(zone.dataset.stumpDropCell), true);
    else runtime.deps.stumpBoxUi.dropOnCell(id, Number(zone.dataset.stumpDropCell));
  }
  function cubeDropTarget(runtime, zone, point) {
    if (zone.dataset.stumpDropCube !== void 0) return cubeTarget(runtime, zone, point.clientX, point.clientY);
    return zone.dataset.stumpDropCell === void 0 ? null : false;
  }
  function onPointerMove(runtime, event) {
    const gesture = runtime.state.drag || runtime.state.press;
    if (!gesture) return;
    if (!currentStumpPointer(runtime, gesture)) return onPointerCancel(runtime);
    if (gesture.pointerId !== event.pointerId) return;
    if (runtime.state.drag) {
      event.preventDefault();
      scheduleFollow(runtime, event);
      return;
    }
    movePress(runtime, event);
  }
  function onPointerUp(runtime, event) {
    const gesture = runtime.state.drag || runtime.state.press;
    if (!gesture) return;
    if (!currentStumpPointer(runtime, gesture)) return onPointerCancel(runtime);
    if (gesture.pointerId !== event.pointerId) return;
    if (runtime.state.drag) {
      event.preventDefault();
      finishDrag(runtime, event);
      return;
    }
    if (runtime.state.press && runtime.state.press.pointerId === event.pointerId) clearPress(runtime);
  }
  function onPointerCancel(runtime) {
    clearPress(runtime);
    endDrag(runtime);
  }
  function onTouchMove(runtime, event) {
    if (runtime.state.drag || runtime.state.press && runtime.state.press.armed) event.preventDefault();
  }
  function onClickCapture(runtime, event) {
    if (runtime.state.swallowClick && stumpTarget(runtime, event)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }
  function onKeydown(runtime, event) {
    if (event.key !== "Escape") return;
    runtime.deps.stumpBoxUi.clearPlacementPreview();
    if (!runtime.state.drag) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    endDrag(runtime);
  }
  function onHover(runtime, event) {
    if (event.pointerType !== "mouse" || runtime.state.drag || runtime.state.press) return;
    const target = stumpTarget(runtime, event);
    if (showCellPreview(runtime, event, target && target.closest("[data-stump-drop-cell]"))) return;
    const anchor = target && target.closest("[data-stump-tip]");
    if (!anchor) return;
    const tip = runtime.deps.stumpBoxUi.tipFor(anchor);
    if (tip) (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, tip.html, tip.tone);
    else (0, runtime.deps.hideInfoTooltip)();
  }
  function showCellPreview(runtime, event, cell) {
    const preview = cell && runtime.deps.stumpBoxUi.hoverCell(Number(cell.dataset.stumpDropCell), true);
    if (!preview) return false;
    if (preview.html) (0, runtime.deps.showInfoTooltipHtml)(event.clientX, event.clientY, preview.html, preview.tone);
    else (0, runtime.deps.hideInfoTooltip)();
    return true;
  }
  function onLeave(runtime, event) {
    const target = stumpTarget(runtime, event), anchor = target && target.closest("[data-stump-tip]");
    if (anchor && !anchor.contains(event.relatedTarget)) (0, runtime.deps.hideInfoTooltip)();
    const cell = target && target.closest("[data-stump-drop-cell]");
    if (!cell || cell.contains(event.relatedTarget)) return;
    if (runtime.deps.stumpBoxUi.clearPlacementPreview(true) && !anchor) (0, runtime.deps.hideInfoTooltip)();
  }
  function onCellFocus(runtime, event) {
    const target = stumpTarget(runtime, event), cell = target && target.closest("[data-stump-drop-cell]");
    if (cell?.matches(":focus-visible")) runtime.deps.stumpBoxUi.hoverCell(Number(cell.dataset.stumpDropCell));
  }
  function bind(runtime) {
    if (!runtime.active || runtime.state.bound) return;
    runtime.state.bound = true;
    listenView(runtime, runtime.deps.document, "pointerdown", runtime.handlers.startPress);
    listenView(runtime, runtime.deps.document, "pointermove", runtime.handlers.onPointerMove, { passive: false });
    listenView(runtime, runtime.deps.document, "pointerup", runtime.handlers.onPointerUp);
    listenView(runtime, runtime.deps.document, "pointercancel", runtime.handlers.onPointerCancel);
    listenView(runtime, runtime.deps.document, "touchmove", runtime.handlers.onTouchMove, { passive: false });
    listenView(runtime, runtime.deps.document, "click", runtime.handlers.onClickCapture, true);
    listenView(runtime, runtime.deps.document, "keydown", runtime.handlers.onKeydown, true);
    listenView(runtime, runtime.deps.document, "pointerover", runtime.handlers.onHover);
    listenView(runtime, runtime.deps.document, "pointermove", runtime.handlers.onHover, { passive: true });
    listenView(runtime, runtime.deps.document, "pointerout", runtime.handlers.onLeave);
    listenView(runtime, runtime.deps.document, "focusin", runtime.handlers.onCellFocus);
    listenView(runtime, runtime.deps.document, "contextmenu", (event) => {
      if (runtime.state.press || runtime.state.drag) event.preventDefault();
    });
  }
  function currentStumpPointer(runtime, gesture) {
    return !!gesture && runtime.active && gesture.owner === runtime.deps.game;
  }

  // modules/ui/stump-drag-view.mjs
  function createStumpDragView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { startPress, onPointerMove, onPointerUp, onPointerCancel, onTouchMove, onClickCapture, onKeydown, onHover, onLeave, onCellFocus, bind };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : void 0;
    initialize(runtime);
    runtime.api = StumpDragViewApi(runtime);
    installStumpDragViewEvents(runtime);
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.DRAG_PX = 6;
    runtime.state.HOLD_MS = 280;
    runtime.state.TOUCH_SLOP_PX = 10;
    runtime.state.PAGE_HOVER_MS = 380;
    runtime.state.press = null;
    runtime.state.drag = null;
    runtime.state.swallowClick = false;
    runtime.state.frame = 0;
    runtime.state.pending = null;
    runtime.state.pageHover = null;
  }
  function installStumpDragViewEvents(runtime) {
    if (runtime.deps.document.readyState === "loading") listenView(runtime, runtime.deps.document, "DOMContentLoaded", runtime.handlers.bind, { once: true });
    else bind(runtime);
  }
  function StumpDragViewApi(runtime) {
    return Object.freeze({
      dispose: () => disposeStumpDragView(runtime)
    });
  }
  function disposeStumpDragView(runtime) {
    releaseViewEvents(runtime);
    clearPress(runtime);
    endDrag(runtime);
    runtime.deps.clearTimeout(runtime.state.swallowTimer);
    runtime.state.swallowClick = false;
  }

  // modules/stump-box-drag-ui-classic.mjs
  var stumpDragView = createStumpDragView({
    get clearTimeout() {
      return windowClearTimeout;
    },
    get hideInfoTooltip() {
      return hideInfoTooltip;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get document() {
      return document;
    },
    get stumpCube() {
      return stumpCube;
    },
    get stumpBoxUi() {
      return stumpBoxUi;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get stumpBox() {
      return stumpBox;
    },
    get showInfoTooltipHtml() {
      return showInfoTooltipHtml;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get requestAnimationFrame() {
      return windowRequestAnimationFrame;
    },
    get cancelAnimationFrame() {
      return windowCancelAnimationFrame;
    }
  });
  window.GameModules.stumpDragView = stumpDragView;
})();
