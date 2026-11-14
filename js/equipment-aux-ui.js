// GENERATED from modules/equipment-aux-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/equipment-aux-actions.mjs
  function render(runtime) {
    const host = runtime.deps.document.getElementById("ui-equipment-aux");
    if (!host || host.hidden) return;
    host.innerHTML = "";
    host.hidden = true;
  }

  // modules/ui/equipment-aux-view.mjs
  function createEquipmentAuxView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { render };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = Object.freeze({ render: runtime.handlers.render });
    return runtime.api;
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

  // modules/ui/equipment-slot-choice-view.mjs
  var DIALOG_IDS = Object.freeze({ ring: "ring-slot-overlay", glove: "glove-slot-overlay", weapon: "weapon-slot-overlay" });
  var EquipmentSlotChoiceView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.dialogs = /* @__PURE__ */ new Map();
      this.pending = /* @__PURE__ */ new Map();
    }
    open(kind, itemId) {
      if (!this.active) return;
      this.pending.set(kind, { itemId: Number.isFinite(itemId) ? itemId : null, owner: this.deps.game });
      const dialog = this.deps.document.getElementById(DIALOG_IDS[kind]);
      if (!dialog) return;
      this.bindDialog(kind, dialog);
      if (!dialog.open) dialog.showModal();
    }
    bindDialog(kind, dialog) {
      const previous = this.dialogs.get(kind);
      if (previous === dialog) return;
      if (previous) releaseViewTarget(this, previous);
      this.dialogs.set(kind, dialog);
      listenView(this, dialog, "click", (event) => this.click(kind, dialog, event));
      listenView(this, dialog, "cancel", (event) => {
        event.preventDefault();
        this.close(kind);
      });
      listenView(this, dialog, "keydown", (event) => event.stopPropagation());
      listenView(this, dialog, "close", () => {
        if (!dialog.open) this.pending.delete(kind);
      });
    }
    click(kind, dialog, event) {
      const button = event.target.closest("[data-equipment-slot], [data-equipment-cancel]");
      if (!button || !dialog.contains(button)) return;
      if (button.hasAttribute("data-equipment-cancel")) this.close(kind);
      else this.select(kind, button.getAttribute("data-equipment-slot"));
    }
    close(kind) {
      this.pending.delete(kind);
      const dialog = this.deps.document.getElementById(DIALOG_IDS[kind]);
      if (dialog) dialog.close();
    }
    select(kind, slot) {
      const choice = this.pending.get(kind);
      this.close(kind);
      if (!this.active || !choice || choice.owner !== this.deps.game) return;
      if (!Number.isInteger(choice.itemId)) return;
      if (kind === "weapon" && !["무기", "방패"].includes(slot)) return;
      this.deps.equipItemById(choice.itemId, slot);
    }
    dispose() {
      for (const kind of this.dialogs.keys()) this.close(kind);
      this.pending.clear();
      this.dialogs.clear();
      releaseViewEvents(this);
    }
  };

  // modules/equipment-aux-ui-classic.mjs
  var equipmentAuxUi = createEquipmentAuxView({
    get document() {
      return document;
    }
  });
  safeExposeGlobals({ equipmentAuxUi });
  var equipmentSlotChoice = new EquipmentSlotChoiceView({
    get document() {
      return document;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get equipItemById() {
      return equipItemById;
    }
  });
  window.GameModules.equipmentSlotChoice = equipmentSlotChoice;
})();
