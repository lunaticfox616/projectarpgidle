// GENERATED from modules/equipment-inspection-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/equipment-inspection-actions.mjs
  function getInactiveAffixIds(runtime, stats, summonSkills = []) {
    const inactive = /* @__PURE__ */ new Set();
    if (!stats || summonSkills.length) return inactive;
    const { sSkill, passiveKeystoneFlags: flags } = stats;
    if (!sSkill) return inactive;
    const tags = new Set(sSkill.tags);
    if (!tags.size || tags.has("summon")) return inactive;
    const applies = {
      attackPctDmg: tags.has("attack"),
      spellPctDmg: tags.has("spell") || flags.duel,
      spellFlatDmg: tags.has("spell"),
      spellCritDmg: tags.has("spell"),
      spellLeech: tags.has("spell"),
      leech: tags.has("attack") && !tags.has("spell") && !flags.soulSanctuary
    };
    Object.entries(applies).forEach(([id, enabled]) => {
      if (!enabled) inactive.add(id);
    });
    return inactive;
  }
  function tooltipBox(runtime, item, slot, equipped) {
    const tip = runtime.deps.document.createElement("div");
    tip.className = "equipment-inspection-tooltip";
    (0, runtime.deps.showItemTooltip)(null, slot, equipped, item, { target: tip });
    return tip;
  }
  function readView(runtime, root) {
    const panes = [...root.querySelectorAll(".eqw-compare-pane")];
    return {
      pane: root.querySelector(".eqw-compare-pane.active > h5")?.textContent,
      scroll: root.scrollTop,
      bodyScroll: root.querySelector(".eqw-inspector-body")?.scrollTop || 0,
      panes: panes.map((pane) => [pane.querySelector("h5").textContent, pane.lastElementChild.scrollTop]),
      deltas: [...root.querySelectorAll(".eqw-deltas[data-eqw-slot]")],
      focus: root.contains(runtime.deps.document.activeElement) ? runtime.deps.document.activeElement : null
    };
  }
  function restoreView(runtime, root, view) {
    root.querySelectorAll(".eqw-compare-pane").forEach((pane) => {
      const saved = view.panes.find(([label]) => label === pane.querySelector("h5").textContent);
      if (saved) pane.lastElementChild.scrollTop = saved[1];
    });
    root.scrollTop = view.scroll;
    const body = root.querySelector(".eqw-inspector-body");
    if (body) body.scrollTop = view.bodyScroll;
    const action = view.focus?.getAttribute("onclick");
    if (!action || view.focus.isConnected || runtime.deps.document.activeElement !== runtime.deps.document.body) return;
    [...root.querySelectorAll("button[onclick]")].find((button) => button.getAttribute("onclick") === action)?.focus({ preventScroll: true });
  }
  function replaceShell(runtime, root, html, view) {
    if (root.__lastHtml === html) return;
    root.innerHTML = root.__lastHtml = html;
    root.querySelectorAll(".eqw-deltas[data-eqw-slot]").forEach((table) => {
      const previous = view?.deltas.find((row) => row.dataset.eqwSlot === table.dataset.eqwSlot);
      if (previous) table.replaceWith(previous);
    });
  }
  function render(runtime, root, item, equippedSlot, html) {
    const selection = `${runtime.deps.equipmentInventoryGridRuntime.getItemKey(item)}:${equippedSlot || ""}`;
    const signature = JSON.stringify([item, runtime.deps.game.equipment, runtime.deps.cachedTooltipStats], (key, value) => key === "breakdowns" ? void 0 : value);
    const sameSelection = selection === runtime.state.activeSelection && root.contains(runtime.state.activeDetails);
    if (sameSelection && root.__lastHtml === html && signature === runtime.state.activeSignature) return;
    const view = sameSelection ? readView(runtime, root) : null;
    replaceShell(runtime, root, html, view);
    const details = root.querySelector(".equipment-inspection-details");
    runtime.state.activeDetails = details;
    runtime.state.activeSignature = signature;
    runtime.state.activeSelection = selection;
    runtime.deps.itemTooltipComparisonScheduler.cancel();
    const worn = equippedSlot ? [] : runtime.deps.equipmentWindowUi.wornSlots(item);
    const panes = [{ tab: "선택한 장비", label: (0, runtime.deps._t)("선택한 장비"), node: tooltipBox(runtime, item, equippedSlot, !!equippedSlot) }];
    worn.forEach((slot) => {
      const name = (0, runtime.deps.getDualSlotDisplayLabel)(slot);
      panes.push({ tab: worn.length > 1 ? (0, runtime.deps._t)("지금 {name}", { name }) : "지금 장착", label: (0, runtime.deps._t)("지금 장착, {name}", { name }), node: tooltipBox(runtime, runtime.deps.game.equipment[slot], slot, true) });
    });
    root.dataset.eqwPanes = String(Math.min(3, panes.length));
    details.replaceChildren(runtime.deps.equipmentWindowUi.compareNode(panes, view?.pane));
    runtime.deps.equipmentWindowUi.fillDeltas(root, item, signature);
    if (view) restoreView(runtime, root, view);
    else root.scrollTop = 0;
  }
  function decorateLoadout(runtime) {
    const root = runtime.deps.document.getElementById("ui-equip-list");
    if (!root) return;
    runtime.deps.levelProgressionUi.decorateSlots(root);
    const current = Object.fromEntries(Object.entries(runtime.deps.game.equipment).map(([slot, item]) => [slot, item?.id]));
    const now = runtime.deps.Date.now();
    root.querySelectorAll(".equipment-slot").forEach((card) => {
      const slot = card.dataset.slot;
      if (runtime.state.previousEquipment && current[slot] && current[slot] !== runtime.state.previousEquipment[slot]) runtime.state.changedUntil.set(slot, now + 1e3);
      card.classList.toggle("equipment-just-equipped", runtime.state.changedUntil.get(slot) > now);
    });
    runtime.state.previousEquipment = current;
  }

  // modules/ui/equipment-inspection-view.mjs
  function createEquipmentInspectionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { render, decorateLoadout, getInactiveAffixIds, tooltipBox };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({
      render: runtime.handlers.render,
      decorateLoadout: runtime.handlers.decorateLoadout,
      getInactiveAffixIds: runtime.handlers.getInactiveAffixIds,
      tooltipBox: runtime.handlers.tooltipBox,
      dispose: () => initialize(runtime)
    });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.activeDetails = null;
    runtime.state.activeSignature = "";
    runtime.state.activeSelection = "";
    runtime.state.previousEquipment = null;
    runtime.state.changedUntil = /* @__PURE__ */ new Map();
  }

  // modules/equipment-inspection-ui-classic.mjs
  var equipmentInspectionUi = createEquipmentInspectionView({
    get document() {
      return document;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get cachedTooltipStats() {
      return window.GameModules.uiRuntime.stats.snapshot();
    },
    get itemTooltipComparisonScheduler() {
      return window.GameModules.tooltipView.comparison;
    },
    get equipmentWindowUi() {
      return equipmentWindowUi;
    },
    get _t() {
      return _t;
    },
    get getDualSlotDisplayLabel() {
      return getDualSlotDisplayLabel;
    },
    get levelProgressionUi() {
      return levelProgressionUi;
    },
    get Date() {
      return Date;
    }
  });
  safeExposeGlobals({ equipmentInspectionUi });
})();
