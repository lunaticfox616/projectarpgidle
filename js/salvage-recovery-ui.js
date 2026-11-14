// GENERATED from modules/salvage-recovery-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
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

  // modules/ui/salvage-recovery-view.mjs
  var SalvageRecoveryView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      for (const name of ["getSalvageRecoveryCurrencyText", "getSalvageRecoveryRarityLabel", "getSalvageRecoveryUnavailableText", "renderSalvageRecoveryEntry", "renderSalvageRecoveryPanel", "refreshSalvageRecoveryShortcut", "refreshSalvageRecoveryOverlay", "closeSalvageRecoveryOverlay", "openSalvageRecoveryOverlay", "restoreSalvageRecoveryEntry", "showSalvageRecoveryTooltip", "hideSalvageRecoveryTooltip"]) this[name] = this[name].bind(this);
      this.salvageRecoveryReturnFocus = null;
      this.owner = null;
      this.overlay = null;
      this.entries = [];
      listenView(this, this.deps.window, "project-idle:salvage-recovery-changed", this.refreshSalvageRecoveryShortcut);
    }
    getSalvageRecoveryCurrencyText(rewards, nameOf = (key) => this.deps.getCurrencyInfo(key).name) {
      let rows = Object.entries(rewards || {}).filter(([, amount]) => Number(amount) > 0);
      if (rows.length === 0) return "반환 재화 없음";
      return rows.map(([key, amount]) => this.deps._t("{key} {floor}개", { key: nameOf(key), floor: Math.floor(amount) })).join(", ");
    }
    getSalvageRecoveryRarityLabel(rarity) {
      return this.deps._t(this.deps.ITEM_RARITY_LABELS[rarity] || this.deps.ITEM_RARITY_LABELS.normal);
    }
    getSalvageRecoveryUnavailableText(availability) {
      if (!availability || availability.canRestore) return "복구 가능";
      let missing = this.getSalvageRecoveryCurrencyText(availability.missing);
      return Object.keys(availability.missing || {}).length > 0 ? this.deps._t("부족: {missing}", { missing }) : availability.reason;
    }
    renderSalvageRecoveryEntry(entry) {
      let item = entry.item;
      let availability = this.deps.salvageRecoveryRuntime.getAvailability(entry.id, this.owner);
      let tier = Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier || item.tier) || 1));
      let cost = this.getSalvageRecoveryCurrencyText(entry.rewards);
      let status = this.getSalvageRecoveryUnavailableText(availability);
      let disabled = availability.canRestore ? "" : "disabled";
      let size = this.deps.getEquipmentInventoryFootprint(item);
      return `<article class="salvage-recovery-entry rarity-${item.rarity}" data-item-tooltip-anchor="1" tabindex="0" role="group" aria-label="${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}"
        data-recovery-entry="${entry.id}">
        <div class="salvage-recovery-art rarity-${item.rarity || "normal"}" style="--art-columns:${size.columns};--art-rows:${size.rows}"><img src="${this.deps.getEquipmentGridVisualAsset(item)}" alt="" aria-hidden="true" draggable="false"></div>
        <div class="salvage-recovery-info">
            <div class="salvage-recovery-item-head"><strong>${this.deps.escapeHTML(this.deps.getItemDisplayName(item))}</strong><span>${this.getSalvageRecoveryRarityLabel(item.rarity)}</span></div>
            <div class="salvage-recovery-meta">${this.deps.escapeHTML(this.deps.getItemSlotDisplayLabel(item))}, T${tier}</div>
            <div class="salvage-recovery-cost"><span>${this.deps._t("반환 비용")}</span><strong>${this.deps.escapeHTML(cost)}</strong></div>
        </div>
        <button type="button" data-recovery-restore="${entry.id}" ${disabled} data-tip="${this.deps.escapeHTML(status)}">${availability.canRestore ? this.deps._t("재화 반환 후 복구") : this.deps.escapeHTML(status)}</button>
    </article>`;
    }
    renderSalvageRecoveryPanel() {
      let entries = this.deps.salvageRecoveryRuntime.getEntries(this.owner);
      this.entries = entries;
      let list = entries.length > 0 ? `<div class="salvage-recovery-grid">${entries.map(this.renderSalvageRecoveryEntry).join("")}</div>` : '<div class="salvage-recovery-empty"><strong>복구할 장비가 없습니다.</strong><span>이번 루프에서 해체한 최근 장비가 여기에 최대 8개까지 남습니다.</span></div>';
      return `<div class="craft-picker-panel salvage-recovery-panel" role="dialog" aria-modal="true" aria-labelledby="salvage-recovery-title">
        <div class="craft-picker-head"><div><div class="craft-picker-title" id="salvage-recovery-title">${this.deps._t("해체 복구함")}</div><div class="craft-picker-desc">${this.deps._t("해체로 실제 획득한 재화를 그대로 반환해 장비를 되살립니다. 최근 8개만 같은 루프 동안 보관됩니다.")}</div></div><button type="button" data-recovery-close>${this.deps._t("닫기")}</button></div>
        ${list}
    </div>`;
    }
    refreshSalvageRecoveryShortcut() {
      if (!this.active) return;
      if (this.overlay && !this.contextCurrent()) this.closeSalvageRecoveryOverlay();
      let button = this.deps.document.getElementById("btn-salvage-recovery");
      if (!button) return;
      let count = this.deps.salvageRecoveryRuntime.getEntries(this.deps.game).length;
      button.setAttribute("aria-label", count > 0 ? this.deps._t("해체 복구함, 복구 가능 장비 {count}개", { count }) : "해체 복구함, 비어 있음");
    }
    refreshSalvageRecoveryOverlay() {
      if (!this.contextCurrent()) {
        this.closeSalvageRecoveryOverlay();
        return;
      }
      let overlay = this.overlay;
      if (overlay) {
        overlay.innerHTML = this.renderSalvageRecoveryPanel();
        if (!overlay.contains(this.deps.document.activeElement)) overlay.querySelector("[data-recovery-close]")?.focus();
      }
      this.refreshSalvageRecoveryShortcut();
    }
    closeSalvageRecoveryOverlay() {
      const overlay = this.overlay;
      releaseViewTarget(this, overlay);
      if (overlay) {
        this.deps.hideItemTooltip();
        overlay.remove();
        if (this.salvageRecoveryReturnFocus?.isConnected) this.salvageRecoveryReturnFocus.focus();
      }
      this.overlay = null;
      this.owner = null;
      this.entries = [];
      this.salvageRecoveryReturnFocus = null;
    }
    openSalvageRecoveryOverlay() {
      if (!this.active) return;
      this.closeSalvageRecoveryOverlay();
      this.owner = this.deps.game;
      this.loop = this.owner.loop;
      this.season = this.owner.season;
      this.salvageRecoveryReturnFocus = this.deps.document.activeElement;
      let overlay = this.deps.document.createElement("div");
      overlay.id = "salvage-recovery-overlay";
      overlay.className = "craft-picker-overlay salvage-recovery-overlay";
      this.overlay = overlay;
      this.bindOverlay(overlay);
      overlay.innerHTML = this.renderSalvageRecoveryPanel();
      this.deps.document.body.appendChild(overlay);
      let closeButton = overlay.querySelector("[data-recovery-close]");
      if (closeButton) closeButton.focus();
    }
    restoreSalvageRecoveryEntry(entryId) {
      if (!this.contextCurrent()) {
        this.closeSalvageRecoveryOverlay();
        return false;
      }
      if (!this.entries.some((entry) => entry.id === Number(entryId))) return false;
      this.deps.hideItemTooltip();
      let result = this.deps.salvageRecoveryRuntime.restore(entryId, this.owner);
      if (!result.restored) {
        this.deps.addLog(this.deps._t("♻️ 장비 복구 실패: {reason}", { reason: result.reason }), "attack-monster");
        this.refreshSalvageRecoveryOverlay();
        return false;
      }
      this.deps.addLog(this.deps._t("♻️ 해체 장비 복구: <span class='loot-{rarity}'>[{name}]</span>, {salvageRecoveryCurrencyText} 반환", { rarity: result.item.rarity, name: this.deps._t(result.item.name), salvageRecoveryCurrencyText: this.getSalvageRecoveryCurrencyText(result.returned, this.deps.getStyledOrbName) }), "loot-rare", { item: result.item });
      if (typeof this.deps.queueImportantSave === "function") this.deps.queueImportantSave(200);
      this.deps.updateStaticUI();
      this.refreshSalvageRecoveryOverlay();
      return true;
    }
    showSalvageRecoveryTooltip(event, entryId) {
      if (!this.contextCurrent()) {
        this.closeSalvageRecoveryOverlay();
        return;
      }
      let entry = this.entries.find((row) => row.id === Number(entryId));
      if (entry) this.deps.showItemTooltip(event, null, false, entry.item, { token: `salvage-recovery:${entry.id}` });
    }
    hideSalvageRecoveryTooltip(event) {
      this.deps.hideItemTooltip(event);
    }
    api() {
      return Object.freeze({
        open: this.openSalvageRecoveryOverlay,
        close: this.closeSalvageRecoveryOverlay,
        restore: this.restoreSalvageRecoveryEntry,
        refreshShortcut: this.refreshSalvageRecoveryShortcut,
        showTooltip: this.showSalvageRecoveryTooltip,
        hideTooltip: this.hideSalvageRecoveryTooltip
      });
    }
    contextCurrent() {
      return this.active && this.owner === this.deps.game && this.owner !== null && this.loop === this.owner.loop && this.season === this.owner.season;
    }
    bindOverlay(overlay) {
      listenView(this, overlay, "click", (event) => {
        if (event.target === overlay || event.target.closest("[data-recovery-close]")) this.closeSalvageRecoveryOverlay();
        else {
          const button = event.target.closest("[data-recovery-restore]");
          if (button && !button.disabled) this.restoreSalvageRecoveryEntry(Number(button.dataset.recoveryRestore));
        }
      });
      listenView(this, overlay, "keydown", (event) => {
        if (event.key === "Escape") this.closeSalvageRecoveryOverlay();
      });
      for (const type of ["pointerover", "pointermove", "focusin"]) listenView(this, overlay, type, (event) => {
        if (event.pointerType === "touch") return;
        const row = event.target.closest("[data-recovery-entry]");
        if (row) this.showSalvageRecoveryTooltip(event, Number(row.dataset.recoveryEntry));
      });
      for (const type of ["pointerout", "focusout"]) listenView(this, overlay, type, (event) => {
        const row = event.target.closest("[data-recovery-entry]");
        if (row && !row.contains(event.relatedTarget)) this.hideSalvageRecoveryTooltip(event);
      });
    }
    dispose() {
      this.closeSalvageRecoveryOverlay();
      releaseViewEvents(this);
    }
  };
  function createSalvageRecoveryView(deps) {
    const view = new SalvageRecoveryView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/salvage-recovery-ui-classic.mjs
  var salvageRecoveryUi = createSalvageRecoveryView({
    get game() {
      return window.GameModules.state.game;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get getStyledOrbName() {
      return getStyledOrbName;
    },
    get hideItemTooltip() {
      return hideItemTooltip;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get salvageRecoveryRuntime() {
      return salvageRecoveryRuntime;
    },
    get showItemTooltip() {
      return showItemTooltip;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ salvageRecoveryUi });
})();
