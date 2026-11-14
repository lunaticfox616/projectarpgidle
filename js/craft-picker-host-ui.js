// GENERATED from modules/craft-picker-host-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/craft-picker-host-actions.mjs
  function craftPickerParts(ctx, kind) {
    const parts = [ctx.deps.document.querySelector(ctx.state.PANEL[kind])];
    if (kind === "inventory") parts.push(ctx.deps.document.getElementById("ui-equipment-inventory-inspector"));
    if (!parts.every(Boolean)) throw new Error(`craft picker: equipment window part missing for ${kind}`);
    return parts;
  }
  function craftPickerPress(ctx, event) {
    const slot = event.target.closest("#ui-equip-list > .equipment-slot[data-slot]");
    const card = event.target.closest(".equipment-grid-item");
    if (!slot && !card) return;
    event.stopPropagation();
    if (event.type !== "click") return;
    event.preventDefault();
    if (slot) {
      ctx.state.pick.equip(slot.dataset.slot);
      return;
    }
    const item = craftPickerItem(ctx, card.dataset.equipmentGridKey);
    const reason = item ? craftPickerBlock(ctx, item) : "";
    if (reason) ctx.state.pick.refuse(reason);
    else if (item) ctx.state.pick.inventory(item.id);
  }
  function craftPickerDim(ctx, host) {
    host.querySelectorAll(".equipment-grid-item").forEach((card) => {
      const item = craftPickerItem(ctx, card.dataset.equipmentGridKey);
      card.classList.toggle("is-picker-off", !!item && !!craftPickerBlock(ctx, item));
    });
  }
  function craftPickerMount(ctx, body, kind, picks) {
    const parts = craftPickerParts(ctx, kind);
    body.innerHTML = `<div id="craft-equip-host" data-kind="${kind}"><div class="equipment-window" data-mobile-pane="${kind === "equip" ? "loadout" : "inventory"}"></div></div>`;
    const host = body.firstElementChild;
    [...ctx.state.HELD, "click"].forEach((type) => host.addEventListener(type, ctx.handlers.craftPickerPress, true));
    ctx.deps.equipmentInventoryInteraction.focus(null);
    host.firstElementChild.append(...parts);
    ctx.state.shown = kind;
    ctx.state.pick = picks;
    ctx.state.dimmer = new ctx.deps.MutationObserver(() => craftPickerDim(ctx, host));
    ctx.state.dimmer.observe(host, { childList: true, subtree: true });
    craftPickerDim(ctx, host);
  }
  function craftPickerUnmount(ctx) {
    if (!ctx.state.shown) return;
    ctx.state.dimmer.disconnect();
    ctx.state.dimmer = null;
    ctx.deps.document.querySelectorAll("#craft-equip-host .is-picker-off").forEach((card) => card.classList.remove("is-picker-off"));
    const home = ctx.deps.document.querySelector("#item-tab-equip .equipment-window"), parts = craftPickerParts(ctx, ctx.state.shown);
    if (ctx.state.shown === "equip") home.prepend(...parts);
    else home.append(...parts);
    ctx.state.shown = "";
    ctx.state.pick = null;
  }
  function craftPickerItem(ctx, key) {
    return (ctx.deps.game.inventory || []).find((row) => ctx.deps.equipmentInventoryGridRuntime.getItemKey(row) === key);
  }
  function craftPickerBlock(ctx, item) {
    return ctx.state.pick.blocked ? ctx.state.pick.blocked(item) : ctx.deps.bagItems.isSpecial(item) ? (0, ctx.deps._t)("주얼, 코어, 액막이는 고를 수 없습니다.") : "";
  }

  // modules/ui/craft-picker-host.mjs
  function createCraftPickerHost(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { craftPickerPress, craftPickerMount, craftPickerUnmount };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(void 0, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({
      mount: ctx.handlers.craftPickerMount,
      unmount: ctx.handlers.craftPickerUnmount,
      /** Whether the picker shows the real loadout panel or bag now (then they are drawn even when the items tab is not). */
      shows: (kind) => ctx.state.shown === kind,
      /** The place the bag belongs while the inventory picker shows it, or null (js/stump-box-ui.js moveEquipmentBag). */
      bagHome: () => ctx.state.shown === "inventory" ? ctx.deps.document.querySelector("#craft-equip-host > .equipment-window") : null
    });
    return ctx.api;
  }
  function initialize(ctx) {
    ctx.state.PANEL = Object.freeze({ equip: ".equipment-loadout-panel", inventory: ".equipment-inventory-panel" });
    ctx.state.HELD = Object.freeze(["pointerdown", "dblclick", "contextmenu", "dragstart"]);
    ctx.state.shown = "";
    ctx.state.pick = null;
    ctx.state.dimmer = null;
  }

  // modules/craft-picker-host-ui-classic.mjs
  var craftPickerHostUi = createCraftPickerHost({
    get document() {
      return document;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get MutationObserver() {
      return MutationObserver;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get bagItems() {
      return bagItems;
    },
    get _t() {
      return _t;
    }
  });
  safeExposeGlobals({ craftPickerHostUi });
})();
