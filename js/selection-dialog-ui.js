// GENERATED from modules/selection-dialog-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // modules/browser/selection-dialog.mjs
  var PANEL = ".selection-overlay-panel";
  var FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]";
  var SelectionDialog = class {
    constructor({ window: window2, document: document2 }, translate) {
      __publicField(this, "openers", /* @__PURE__ */ new Map());
      __publicField(this, "listening", false);
      this.window = window2;
      this.document = document2;
      this.inputs = { translate };
      this.disposed = false;
      for (const name of ["topOverlay", "focusables", "visibleControl", "radioTabStop", "focusVisibleControl", "restoreFocus", "isIdleFocus", "remember", "frameHtml", "create", "settle", "show", "close", "listen", "onKeydown", "trapTab", "containFocus"]) this[name] = this[name].bind(this);
    }
    topOverlay() {
      const all = this.document.querySelectorAll(".selection-overlay");
      return all[all.length - 1] || null;
    }
    focusables(panel) {
      const items = Array.from(panel.querySelectorAll(FOCUSABLE)).filter((node) => node.tabIndex >= 0 && this.visibleControl(node));
      return items.filter((node) => this.radioTabStop(node, items)).sort((a, b) => (a.tabIndex || Infinity) - (b.tabIndex || Infinity));
    }
    visibleControl(node) {
      return !!node && node.isConnected !== false && !!node.getClientRects().length && !node.closest('[hidden], [inert], [aria-hidden="true"]') && !node.matches(":disabled") && this.window.getComputedStyle(node).visibility !== "hidden";
    }
    radioTabStop(node, items) {
      if (node.type !== "radio" || !node.name) return true;
      const group = items.filter((item) => item.type === "radio" && item.name === node.name && item.form === node.form);
      return node === (group.find((item) => item.checked) || group[0]);
    }
    focusVisibleControl(node) {
      if (!this.visibleControl(node)) return false;
      if (node.tabIndex < 0) node.tabIndex = -1;
      node.focus({ preventScroll: true });
      return this.document.activeElement === node;
    }
    restoreFocus(previous, fallback = this.document.getElementById("battlefield-canvas")) {
      if (this.document.querySelector("dialog:modal")) return;
      if (!this.isIdleFocus(previous) && this.focusVisibleControl(previous)) return;
      if (this.focusVisibleControl(fallback)) return;
      const navigation = [
        ...this.document.querySelectorAll(".tab-header .tab-btn.active"),
        this.document.getElementById("btn-mobile-nav-more"),
        ...this.document.querySelectorAll(".tab-header .tab-btn")
      ];
      navigation.some(this.focusVisibleControl);
    }
    isIdleFocus(element) {
      return !element || element === this.document.body;
    }
    remember(overlay) {
      const panel = overlay && overlay.querySelector(PANEL);
      if (!panel) return null;
      const active = this.document.activeElement;
      return { scroll: panel.scrollTop, index: this.focusables(panel).indexOf(active), takeFocus: this.isIdleFocus(active) || panel.contains(active) };
    }
    frameHtml({ id, title, panelClass = "", body }) {
      return `<div class="selection-overlay-panel ${panelClass}" role="dialog" aria-modal="true" aria-labelledby="${id}-title" tabindex="-1">
            <div class="selection-overlay-header"><div class="selection-overlay-title" id="${id}-title">${title}</div>
                <button type="button" data-selection-close>${this.inputs.translate("닫기")}</button></div>
            ${body}</div>`;
    }
    create(id) {
      const overlay = this.document.createElement("div");
      overlay.id = id;
      overlay.className = "selection-overlay";
      overlay.onclick = (event) => {
        if (event.target === overlay || event.target.closest("[data-selection-close]")) this.close(id);
      };
      this.openers.set(id, this.document.activeElement);
      this.listen();
      return overlay;
    }
    settle(overlay, memory) {
      const panel = overlay.querySelector(PANEL);
      if (!panel) return null;
      if (memory) panel.scrollTop = memory.scroll;
      if (!memory || memory.takeFocus) (this.focusables(panel)[memory ? memory.index : -1] || panel).focus({ preventScroll: true });
      return panel;
    }
    show(options) {
      if (this.disposed) return null;
      const existing = this.document.getElementById(options.id);
      const memory = this.remember(existing);
      const overlay = existing || this.create(options.id);
      overlay.innerHTML = this.frameHtml(options);
      if (!existing) this.document.body.append(overlay);
      return this.settle(overlay, memory);
    }
    close(id) {
      const overlay = this.document.getElementById(id);
      if (!overlay) return;
      const active = this.document.activeElement;
      const opener = this.isIdleFocus(active) || overlay.contains(active) ? this.openers.get(id) : null;
      this.openers.delete(id);
      overlay.remove();
      this.restoreFocus(opener);
    }
    listen() {
      if (this.listening || this.disposed) return;
      this.listening = true;
      this.window.addEventListener("keydown", this.onKeydown, true);
    }
    onKeydown(event) {
      const overlay = this.topOverlay();
      if (!overlay || this.document.querySelector("dialog:modal") || !["Escape", "Tab"].includes(event.key)) return;
      event.stopPropagation();
      if (event.key === "Tab") return this.trapTab(event, overlay);
      event.preventDefault();
      this.close(overlay.id);
    }
    trapTab(event, overlay) {
      this.containFocus(event, overlay.querySelector(PANEL));
    }
    containFocus(event, panel) {
      if (event.key !== "Tab" || !panel) return;
      event.stopPropagation();
      const items = this.focusables(panel), active = this.document.activeElement;
      const first = items[0] || panel, last = items[items.length - 1] || panel;
      const wraps = !items.includes(active) || (event.shiftKey ? active === first : active === last);
      if (!wraps) return;
      event.preventDefault();
      if (!items.length) panel.tabIndex = -1;
      (event.shiftKey ? last : first).focus({ preventScroll: true });
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.window.removeEventListener("keydown", this.onKeydown, true);
      this.listening = false;
      Array.from(this.openers.keys()).reverse().forEach((id) => this.close(id));
      this.openers.clear();
    }
  };
  function createSelectionDialog(env, translate) {
    const dialog = new SelectionDialog(env, translate);
    return Object.freeze({
      show: dialog.show,
      close: dialog.close,
      containFocus: dialog.containFocus,
      restoreFocus: dialog.restoreFocus,
      isOpen: (id) => !!env.document.getElementById(id),
      dispose: () => dialog.dispose()
    });
  }

  // modules/selection-dialog-ui-classic.mjs
  var selectionDialog = createSelectionDialog({ window, document }, (...args) => _t(...args));
  safeExposeGlobals({ selectionDialog });
})();
