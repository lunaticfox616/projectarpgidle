// GENERATED from modules/inventory-search-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/search-filters.mjs
  function getSearchFilters(game) {
    game.settings = game.settings || {};
    game.settings.searchFilters = game.settings.searchFilters && typeof game.settings.searchFilters === "object" ? game.settings.searchFilters : {};
    const filters = game.settings.searchFilters;
    for (const key of ["equip", "colonyWard", "skill", "support"]) filters[key] = String(filters[key] || "");
    return filters;
  }
  function equipmentInventorySlot(owner) {
    owner.settings = owner.settings || {};
    return owner.settings.equipmentSlotFilter || "all";
  }
  function setEquipmentSlotFilter(owner, key, value) {
    owner.settings = owner.settings || {};
    if (key === "slot") owner.settings.equipmentSlotFilter = String(value || "all");
  }
  function equipmentMobilePane(owner, requestedPane) {
    owner.settings = owner.settings || {};
    if (requestedPane !== void 0) owner.settings.equipmentMobilePane = requestedPane;
    const pane = owner.settings.equipmentMobilePane === "loadout" ? "loadout" : "inventory";
    owner.settings.equipmentMobilePane = pane;
    return pane;
  }

  // modules/ui/inventory-search-actions.mjs
  function renderSearchSection(runtime, options) {
    const { containerId, key, rowsHtml, emptyHtml, actionButtonsHtml } = options;
    let root = runtime.deps.document.getElementById(containerId);
    if (!root) return;
    let sf = getSearchFilterState(runtime);
    const { input, list } = searchSectionShell(runtime, root, options, sf);
    updateSearchSectionActions(runtime, root, key, actionButtonsHtml);
    if (input && input.value !== String(sf[key] || "")) input.value = String(sf[key] || "");
    let v = rowsHtml || emptyHtml || "";
    if (list.__lastHtml !== v) {
      list.innerHTML = v;
      list.__lastHtml = v;
    }
  }
  function searchSectionShell(runtime, root, { key, placeholder, actionButtonsHtml }, sf) {
    let input = root.querySelector(`input[data-search-key="${key}"]`);
    let list = root.querySelector(".search-result-list");
    if (!input || !list) {
      root.innerHTML = `<div class="search-filter-panel" style="grid-column:1/-1; margin-bottom:6px; width:100%; max-width:100%;"><input class="search-filter-input" data-search-key="${key}" placeholder="${placeholder}" value="${(0, runtime.deps.escapeHTML)(sf[key] || "")}" oninput="updateSearchFilter('${key}', this.value)" style="display:block; width:100%; max-width:100%; box-sizing:border-box; padding:6px 8px;"><div class="search-action-row" style="margin-top:6px; display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;"><button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">${(0, runtime.deps._t)("검색어 리셋")}</button>${actionButtonsHtml || ""}</div></div><div class="search-result-list" style="display:contents;"></div>`;
      input = root.querySelector(`input[data-search-key="${key}"]`);
      list = root.querySelector(".search-result-list");
    }
    return { input, list };
  }
  function updateSearchSectionActions(runtime, root, key, actionButtonsHtml) {
    let actionRow = root.querySelector(".search-action-row");
    if (actionRow && actionRow.__lastActions !== actionButtonsHtml) {
      actionRow.__lastActions = actionButtonsHtml;
      actionRow.innerHTML = `<button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">${(0, runtime.deps._t)("검색어 리셋")}</button>${actionButtonsHtml || ""}`;
      actionRow.querySelectorAll("button").forEach((btn) => {
        btn.style.flex = "0 0 auto";
        btn.style.whiteSpace = "nowrap";
      });
    }
  }
  function getSearchFilterState(runtime) {
    return getSearchFilters(runtime.deps.game);
  }

  // modules/common/text.mjs
  function getSearchTokens(query) {
    return String(query || "").toLowerCase().trim().split(/\s+/).filter(Boolean);
  }
  function matchSearchQuery(raw, query) {
    const tokens = getSearchTokens(query);
    if (!tokens.length) return true;
    const text = String(raw || "").toLowerCase();
    return tokens.every((token) => text.includes(token));
  }

  // modules/ui/inventory-equipment-filters.mjs
  function equipmentSearchStatText(deps, stat, resolveName) {
    const value = stat || {};
    const name = value.statName || (resolveName ? deps.getStatName(value.id || "") : "");
    return `${value.id || ""} ${name || ""}`;
  }
  function getEquipmentSearchText(runtime, item) {
    const deps = runtime.deps;
    const base = (item.baseStats || []).map((stat) => equipmentSearchStatText(deps, stat, false)).join(" ");
    const stats = (item.stats || []).map((stat) => equipmentSearchStatText(deps, stat, true)).join(" ");
    const under = item.underEnchant ? `${equipmentSearchStatText(deps, item.underEnchant, true)} ${item.underEnchant.val || ""}` : "";
    return `${item.name || ""} ${item.baseName || ""} ${deps.getItemSlotDisplayLabel(item)} ${deps.getWeaponCategoryName(item)} ${item.rarity || ""} ${deps.ITEM_RARITY_LABELS[item.rarity] || ""} ${base} ${stats} ${under}`;
  }
  function syncSlotFilterOptions(runtime, select, slots) {
    if (!select) return;
    const signature = JSON.stringify(slots);
    if (select.dataset.optionSignature === signature) return;
    const deps = runtime.deps;
    select.innerHTML = `<option value="all">${deps._t("모든 칸")}</option>${slots.map((slot) => `<option value="${deps.escapeHTML(slot)}">${deps.escapeHTML(deps.getItemSlotDisplayLabel(null, slot))}</option>`).join("")}`;
    select.dataset.optionSignature = signature;
  }
  function getSortedEquipmentInventoryRows(runtime, query, isItemRarityVisible) {
    const { deps } = runtime;
    const owner = deps.game;
    let slotValue = equipmentInventorySlot(owner);
    const slots = Array.from(new Set(owner.inventory.map((item) => item && item.slot).filter(Boolean))).sort((a, b) => a.localeCompare(b, deps.i18n.locale));
    if (!slots.includes(slotValue)) slotValue = "all";
    const slotSelect = deps.document.getElementById("ui-equipment-slot-filter");
    syncSlotFilterOptions(runtime, slotSelect, slots);
    if (slotSelect) slotSelect.value = slotValue;
    const visualFilterActive = [
      slotValue !== "all",
      String(query || "").trim().length > 0,
      owner.inventory.some((item) => item && !isItemRarityVisible(item))
    ].some(Boolean);
    const rows = owner.inventory.map((item, idx) => ({ item, idx })).map((row) => {
      const item = row.item || {};
      const searchMatched = matchSearchQuery(getEquipmentSearchText(runtime, item), query);
      return {
        ...row,
        filterActive: visualFilterActive,
        filterMatched: ["all", item.slot].includes(slotValue) && isItemRarityVisible(item) && searchMatched
      };
    }).sort((a, b) => b.idx - a.idx);
    return deps.equipmentTriage ? deps.equipmentTriage.filterRows(rows) : rows;
  }
  function setEquipmentInventoryView(runtime, key, value) {
    setEquipmentSlotFilter(runtime.deps.game, key, value);
    runtime.deps.updateStaticUI();
  }
  function syncEquipmentMobilePane(runtime) {
    const pane = equipmentMobilePane(runtime.deps.game);
    const workspace = runtime.deps.document.querySelector("#item-tab-equip .equipment-workspace");
    if (workspace) workspace.dataset.mobilePane = pane;
  }
  function setEquipmentMobilePane(runtime, pane) {
    if (!["inventory", "loadout"].includes(pane)) return;
    equipmentMobilePane(runtime.deps.game, pane);
    syncEquipmentMobilePane(runtime);
    if (typeof runtime.deps.saveGame === "function") runtime.deps.saveGame({ skipCloudSync: true });
  }

  // modules/ui/inventory-search-view.mjs
  function createInventorySearchView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getSearchFilterState, renderSearchSection, getEquipmentSearchText, getSortedEquipmentInventoryRows, setEquipmentInventoryView, syncEquipmentMobilePane, setEquipmentMobilePane };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.api = Object.freeze({ ...runtime.handlers });
    return runtime.api;
  }

  // modules/inventory-search-ui-classic.mjs
  var inventorySearchView = createInventorySearchView({
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get _t() {
      return _t;
    },
    get i18n() {
      return i18n;
    },
    get getStatName() {
      return getStatName;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getWeaponCategoryName() {
      return getWeaponCategoryName;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get equipmentTriage() {
      return window.equipmentTriage;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get saveGame() {
      return typeof saveGame === "undefined" ? void 0 : saveGame;
    },
    get game() {
      return window.GameModules.state.game;
    }
  });
  safeExposeGlobals({
    getSearchTokens,
    matchSearchQuery,
    getEquipmentSearchText: inventorySearchView.getEquipmentSearchText,
    getSortedEquipmentInventoryRows: inventorySearchView.getSortedEquipmentInventoryRows,
    setEquipmentInventoryView: inventorySearchView.setEquipmentInventoryView,
    syncEquipmentMobilePane: inventorySearchView.syncEquipmentMobilePane,
    setEquipmentMobilePane: inventorySearchView.setEquipmentMobilePane,
    getSearchFilterState: inventorySearchView.getSearchFilterState,
    renderSearchSection: (...args) => inventorySearchView.renderSearchSection({
      containerId: args[0],
      key: args[1],
      placeholder: args[2],
      rowsHtml: args[3],
      emptyHtml: args[4],
      actionButtonsHtml: args[5]
    })
  });
})();
