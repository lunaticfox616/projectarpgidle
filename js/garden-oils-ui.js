// GENERATED from modules/garden-oils-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/garden-oils-view.mjs
  var GardenOilsView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.OVERLAY_ID = "garden-oil-overlay";
      this.TONE = "#cfe0a0";
      this.esc = (value) => this.deps.escapeHTML(String(value));
      this.bowl = [];
      this.slot = 0;
      this.effectText = (node) => node.effects.map((effect) => `${this.deps.getStatName(effect.stat)} ${effect.val >= 0 ? "+" : ""}${this.deps.formatValue(effect.stat, effect.val)}`).join(", ");
      for (const name of ["actionHtml", "open", "chipsHtml", "bowlHtml", "offersHtml", "render", "slotsHtml", "pickSlot", "add", "remove", "choose", "tooltipHtml"]) this[name] = this[name].bind(this);
      this.context = null;
      this.revision = 0;
      this.pending = false;
    }
    actionHtml(item, slot) {
      if (!item || item.slot !== "목걸이" || !(this.deps.gardenOils.open(this.deps.game) || item.anoint)) return "";
      const ref = slot ? `'${slot}',true` : `${item.id},false`;
      return `<button type="button" data-content-action="anoint" onclick="equipmentInventoryInteraction.focus(null);gardenOilsUi.open(${ref})"><span class="px-center">${this.deps._t("기름")}</span></button>`;
    }
    open(ref, isEquip) {
      if (!this.active) return;
      if (!this.deps.selectForCrafting(ref, isEquip)) return;
      const owner = this.deps.game;
      this.context = { owner, season: owner.season, loop: owner.loopCount, item: this.deps.getSelectedCraftItem() };
      this.revision++;
      this.bowl = [];
      this.slot = 0;
      this.render();
    }
    chipsHtml() {
      return this.deps.gardenOils.keys.map((key) => {
        const left = (this.deps.game.currencies[key] || 0) - this.bowl.filter((entry) => entry === key).length;
        return `<button type="button" data-oil-add="${key}" ${left > 0 && this.bowl.length < this.deps.GARDEN_OILS.perAnoint ? "" : "disabled"}>${this.esc(this.deps.gardenOils.oil(key).name)} ${left}</button>`;
      }).join("");
    }
    bowlHtml() {
      return Array.from({ length: this.deps.GARDEN_OILS.perAnoint }, (_, index) => this.bowl[index] ? `<button type="button" class="is-on" data-oil-remove="${index}" aria-label="${this.deps._t("{name} 빼기", { name: this.esc(this.deps.gardenOils.oil(this.bowl[index]).name) })}">${this.esc(this.deps.gardenOils.oil(this.bowl[index]).name)}</button>` : '<span class="garden-oil-empty">빈 자리</span>').join("");
    }
    offersHtml(item) {
      if (this.bowl.length < this.deps.GARDEN_OILS.perAnoint) return '<p class="selection-overlay-help">기름 셋을 담으면 이 조합이 이번 루프에 부르는 노드 셋이 보입니다.</p>';
      const reason = this.deps.gardenOils.anointReason(this.deps.game, item, this.bowl);
      return `<div class="selection-overlay-grid">${this.deps.gardenOils.offers(this.deps.game, this.bowl).map((node) => {
        const why = reason || this.deps.gardenOils.slotReason(this.deps.game, item, node.id, this.slot);
        return `<button type="button" class="selection-overlay-option" data-oil-choose="${node.id}" ${why ? `disabled data-tip="${this.esc(why)}"` : ""}>
                ${this.esc(this.deps._t(node.title))}<br><span>${this.esc(this.effectText(node))}</span></button>`;
      }).join("")}</div>`;
    }
    render() {
      if (!this.contextCurrent()) return this.close();
      const item = this.deps.getSelectedCraftItem();
      if (!item) return this.deps.selectionDialog.close(this.OVERLAY_ID);
      const nodes = this.deps.gardenOils.nodesOf(item).slice(0, this.deps.gardenOils.slotCount(this.deps.game));
      const current = nodes.map((node, index) => `<p class="garden-oil-current">${nodes.length > 1 ? this.deps._t("{value} 자리: ", { value: index ? this.deps._t("둘째") : this.deps._t("첫째") }) : this.deps._t("지금 새겨진 노드: ")}${node ? `<strong>${this.esc(this.deps._t(node.title))}</strong> (${this.esc(this.effectText(node))})` : this.deps._t("없음")}</p>`).join("");
      const panel = this.deps.selectionDialog.show({ id: this.OVERLAY_ID, title: this.deps._t("기름 바르기"), panelClass: "garden-oil-panel", body: `<div class="selection-overlay-help"><strong>[${this.esc(this.deps.getItemDisplayName(item))}]</strong>
            ${this.deps._t("기름 셋을 바르면 고른 패시브 노드 하나가 목걸이에 새겨집니다(다시 바르면 바뀝니다). 조합 표는 루프마다 바뀝니다.")}</div>${current}
            ${this.slotsHtml()}<div class="garden-oil-row" aria-label="${this.deps._t("기름")}">${this.chipsHtml()}</div><div class="garden-oil-row garden-oil-bowl" aria-label="${this.deps._t("그릇")}">${this.bowlHtml()}</div>${this.offersHtml(item)}` });
      this.bindControls(panel);
    }
    slotsHtml() {
      if (this.deps.gardenOils.slotCount(this.deps.game) < 2) return "";
      return `<div class="garden-oil-row" aria-label="${this.deps._t("자리")}">${["첫째 자리", "둘째 자리"].map((label, index) => `<button type="button" class="${index === this.slot ? "is-on" : ""}"
            aria-pressed="${index === this.slot}" data-oil-slot="${index}">${label}</button>`).join("")}</div>`;
    }
    pickSlot(index) {
      if (!this.contextCurrent()) return this.close();
      this.revision++;
      this.slot = index === 1 ? 1 : 0;
      this.render();
    }
    add(key) {
      if (!this.contextCurrent()) return this.close();
      if (!this.deps.gardenOils.keys.includes(key)) return;
      this.revision++;
      if (this.bowl.length < this.deps.GARDEN_OILS.perAnoint && (this.deps.game.currencies[key] || 0) > this.bowl.filter((entry) => entry === key).length) this.bowl.push(key);
      this.render();
    }
    remove(index) {
      if (!this.contextCurrent()) return this.close();
      if (!Number.isInteger(index) || index < 0 || index >= this.bowl.length) return;
      this.revision++;
      this.bowl.splice(index, 1);
      this.render();
    }
    async choose(nodeId) {
      if (!this.contextCurrent() || this.pending) return;
      const item = this.deps.getSelectedCraftItem(), node = this.deps.gardenOils.offers(this.deps.game, this.bowl).find((row) => row.id === nodeId);
      if (!item || !node) return;
      if (this.deps.game.woodsmanBuildLock) return this.deps.addLog(this.deps._t("나무꾼 전투 중에는 바를 수 없습니다."), "attack-monster");
      const message = this.choiceMessage(item, node);
      const snapshot = { revision: this.revision, bowl: [...this.bowl], slot: this.slot, context: this.context, panel: this.panel };
      this.pending = true;
      try {
        if (!await this.deps.requestGameConfirmation(message, { title: this.deps._t("기름 바르기"), confirmLabel: this.deps._t("바르기") })) return;
        if (!this.active) return;
        if (this.deps.getSelectedCraftItem() !== item) return this.deps.addLog(this.deps._t("확인 중 대상 장비가 바뀌어 바르지 않았습니다."), "attack-monster");
        if (!this.confirmationCurrent(snapshot)) return;
        this.applyChoice(item, node, snapshot);
      } finally {
        this.pending = false;
      }
    }
    choiceMessage(item, node) {
      const was = this.deps.gardenOils.nodesOf(item)[this.slot];
      return `[${item.name}]에 ${this.deps.withObjectParticle(node.title)} 새깁니다(기름 ${this.deps.GARDEN_OILS.perAnoint}개).${was ? `
지금 새겨진 ${was.title}${this.deps.pickParticle(was.title, "은", "는")} 사라집니다.` : ""}`;
    }
    applyChoice(item, node, snapshot) {
      const result = this.deps.gardenOils.anoint(snapshot.context.owner, item, snapshot.bowl, node.id, snapshot.slot);
      if (!result.ok) return this.deps.addLog(result.reason, "attack-monster");
      this.deps.addLog(this.deps._t("🌿 [{item}]에 기름을 발라 {title} 새겨졌습니다: {node}", { item: this.esc(this.deps.getItemDisplayName(item)), title: this.esc(this.deps.withSubjectParticle(node.title)), node: this.esc(this.effectText(node)) }), "loot-unique", { toast: true });
      this.bowl = [];
      this.revision++;
      this.deps.updateStaticUI();
      this.deps.queueImportantSave(200);
      this.render();
    }
    tooltipHtml(item) {
      return this.deps.gardenOils.nodesOf(item).filter(Boolean).map((node, index) => `<div class="tooltip-line" style="${index ? "" : "margin-top:6px; "}color:${this.TONE};">${this.deps._t("🌿 기름: {title}\n            ({node})", { title: this.esc(this.deps._t(node.title)), node: this.esc(this.effectText(node)) })}</div>`).join("");
    }
    contextCurrent() {
      const context = this.context, owner = this.deps.game;
      if (!this.active || !context || context.owner !== owner) return false;
      return context.season === owner.season && context.loop === owner.loopCount && context.item === this.deps.getSelectedCraftItem();
    }
    confirmationCurrent(snapshot) {
      if (!this.contextCurrent() || snapshot.context !== this.context) return false;
      return snapshot.revision === this.revision && snapshot.panel === this.panel && !!snapshot.panel?.isConnected;
    }
    bindControls(panel) {
      if (this.panel === panel) return;
      releaseViewTarget(this, this.panel);
      this.panel = panel;
      if (panel) listenView(this, panel, "click", (event) => this.onClick(event));
    }
    onClick(event) {
      const button = event.target.closest("button");
      if (!button || !this.panel.contains(button) || button.disabled) return;
      const actions = {
        oilAdd: (key) => this.add(key),
        oilRemove: (index) => this.remove(Number(index)),
        oilChoose: (id) => this.choose(id),
        oilSlot: (index) => this.pickSlot(Number(index))
      };
      for (const [key, action] of Object.entries(actions)) if (Object.hasOwn(button.dataset, key)) return action(button.dataset[key]);
    }
    close() {
      this.revision++;
      this.context = null;
      this.bowl = [];
      releaseViewTarget(this, this.panel);
      this.panel = null;
      this.deps.selectionDialog.close(this.OVERLAY_ID);
    }
    api() {
      return Object.freeze({ actionHtml: this.actionHtml, open: this.open, add: this.add, remove: this.remove, choose: this.choose, pickSlot: this.pickSlot, tooltipHtml: this.tooltipHtml, close: () => this.close() });
    }
    dispose() {
      releaseViewEvents(this);
      this.close();
    }
  };
  function createGardenOilsView(deps) {
    const view = new GardenOilsView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/garden-oils-ui-classic.mjs
  var gardenOilsUi = createGardenOilsView({
    get GARDEN_OILS() {
      return GARDEN_OILS;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatValue() {
      return formatValue;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get gardenOils() {
      return gardenOils;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getSelectedCraftItem() {
      return getSelectedCraftItem;
    },
    get getStatName() {
      return getStatName;
    },
    get pickParticle() {
      return pickParticle;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get requestGameConfirmation() {
      return requestGameConfirmation;
    },
    get selectForCrafting() {
      return selectForCrafting;
    },
    get selectionDialog() {
      return selectionDialog;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get withObjectParticle() {
      return withObjectParticle;
    },
    get withSubjectParticle() {
      return withSubjectParticle;
    }
  });
  safeExposeGlobals({ gardenOilsUi });
})();
