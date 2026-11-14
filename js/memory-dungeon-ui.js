// GENERATED from modules/memory-dungeon-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/memory-dungeon-view.mjs
  var MemoryDungeonView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.M = this.deps.MEMORY_DUNGEON;
      this.esc = (value) => this.deps.escapeHTML(String(value));
      this.selection = null;
      this.filter = "held";
      this.query = "";
      this.percent = (chance) => `${Number((chance * 100).toFixed(2))}%`;
      this.hasHeld = (row) => row.counts.some((count) => count > 0);
      for (const name of ["selectedPreview", "select", "challenge", "setFilter", "search", "showMaps", "departBlock", "tierButton", "cardHtml", "currentRunHtml", "currencyReward", "nextReward", "rewardsHtml", "preparationHtml", "controlsHtml", "visibleRows", "emptyHtml", "html", "spoilsLines", "announce"]) this[name] = this[name].bind(this);
      listenView(this, this.deps.window, "project-idle:atlas-map", (event) => this.announce(event.detail));
    }
    selectedPreview() {
      if (!this.active) return null;
      if (!this.selection || this.selection.owner !== this.deps.game || this.selection.book !== this.deps.game.atlas.memory) return null;
      return this.deps.memoryDungeon.preview(this.deps.game, this.selection.node, this.selection.tier);
    }
    select(nodeId, tier) {
      if (!this.active) return;
      this.adoptContext();
      const model = this.deps.memoryDungeon.preview(this.deps.game, nodeId, Number(tier));
      if (!model) return;
      this.selection = { owner: this.deps.game, book: this.deps.game.atlas.memory, node: nodeId, tier: model.tier };
      this.filter = model.have ? "held" : "records";
      this.query = "";
      this.deps.atlasUi.refresh();
      const panel = this.deps.document.querySelector("#ui-atlas .memory-preparation");
      panel?.focus({ preventScroll: true });
      panel?.scrollIntoView({ block: "start" });
    }
    challenge(nodeId, tier) {
      if (!this.contextCurrent()) return;
      const model = this.selectedPreview();
      if (!model || model.node.id !== nodeId || model.tier !== Number(tier)) return this.deps.addLog(this.deps._t("도전할 기억을 다시 선택하세요."), "attack-monster");
      const reason = this.deps.atlasRun.openMemory(nodeId, Number(tier));
      if (reason) {
        this.deps.addLog(reason, "attack-monster");
        this.deps.atlasUi.refresh();
        return;
      }
      this.deps.queueImportantSave(200);
      this.deps.atlasUi.refresh();
      this.deps.switchTab("tab-battle");
    }
    setFilter(value, clearSearch = false) {
      if (!this.active) return;
      this.adoptContext();
      if (!["held", "records"].includes(value)) return;
      this.filter = value;
      this.selection = null;
      if (clearSearch) this.query = "";
      this.deps.atlasUi.refresh();
      this.deps.document.querySelector(`#ui-atlas [data-memory-filter="${this.filter}"]`)?.focus({ preventScroll: true });
    }
    search(value) {
      if (!this.active) return;
      this.query = String(value);
      this.selection = null;
      this.deps.atlasUi.refresh();
      const input = this.deps.document.querySelector("#memory-boss-search");
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(this.query.length, this.query.length);
    }
    showMaps() {
      if (!this.active) return;
      this.deps.atlasUi.setView("maps");
      if (this.deps.game.atlas.run) return this.deps.atlasUi.revealDevice();
      const map = this.deps.game.atlas.stash[0];
      if (map) return this.deps.atlasUi.selectMap(map.uid, true);
      this.deps.document.querySelector("#ui-atlas .atlas-journey")?.scrollIntoView({ block: "start" });
    }
    departBlock() {
      return this.deps.atlas.runOpenReason(this.deps.game) || this.deps.atlas.lockReason(this.deps.game) || this.deps.atlasRun.blockReason();
    }
    tierButton(row, step, selected) {
      if (!step.have && row.best !== step.tier) return `<span class="memory-tier is-empty">${this.deps._t("{tier}단계", { tier: step.tier })}</span>`;
      const on = selected?.node.id === row.node.id && selected.tier === step.tier;
      const label = this.deps._t("{boss}의 기억 {tier}단계 준비 보기", { boss: row.node.boss, tier: step.tier });
      const note = step.have ? this.deps._t("{have}개", { have: step.have }) : "승리 기록";
      return `<button type="button" class="memory-tier" data-memory-action="select" data-memory-node="${this.esc(row.node.id)}" data-memory-tier="${step.tier}" aria-label="${this.esc(label)}" aria-pressed="${on}">
            <strong>${this.deps._t("{tier}단계", { tier: step.tier })}</strong><small>${note}</small>${step.tier > this.deps.memoryDungeon.maxTier(this.deps.game) ? this.deps._t("<small>잠김</small>") : ""}</button>`;
    }
    cardHtml(row, selected) {
      const where = row.node.region ? (this.deps.ATLAS.regions.find((region) => region.id === row.node.region) || {}).name : row.node.name;
      return `<div class="memory-card"><strong>${this.esc(row.node.boss)}</strong><small>${this.esc(where)}${row.best ? this.deps._t(", 이긴 단계 {best}", { best: row.best }) : ""}</small>
            <div class="memory-tiers">${row.tiers.map((step) => this.tierButton(row, step, selected)).join("")}</div></div>`;
    }
    currentRunHtml() {
      const run = this.deps.game.atlas.run;
      if (!run) return "";
      const name = this.deps.atlas.node(run.map.node).boss, memory = run.map.memory ? this.deps._t(" (기억 {memory}단계)", { memory: run.map.memory }) : "";
      return `<section class="memory-current-run" aria-label="${this.deps._t("열린 지도")}"><strong>${this.deps._t("진행 중인 도전이 있습니다")}</strong><p>${this.deps._t("{name}{memory}, 남은 포털 {portals}개", { name: this.esc(name), memory, portals: run.portals })}</p>
            <button type="button" data-memory-action="maps">${this.deps._t("열린 지도 보기")}</button></section>`;
    }
    currencyReward(row) {
      const amount = row.min === row.max ? this.deps._t("{min}개", { min: row.min }) : this.deps._t("{min}~{max}개 ({extraChance}로 {max2}개)", { min: row.min, max: row.max, extraChance: this.percent(row.extraChance), max2: row.max });
      return `<li><span>${this.deps.getStyledOrbName(row.key)}</span><b>${amount}</b></li>`;
    }
    nextReward(next) {
      if (!next) return "최고 단계입니다. 다음 단계 기억은 없습니다.";
      if (next.reason) return next.reason;
      return this.deps._t("승리 시 {chance} 확률로 {tier}단계 기억 1개 (현재 {have}/{cap}개)", { chance: this.percent(next.chance), tier: next.tier, have: next.have, cap: next.cap });
    }
    rewardsHtml(model) {
      const name = model.unique.name || "무작위 고유 장비";
      const gear = model.gear ? "<p>추가 희귀 장비 1개 확정</p>" : "";
      return `<div class="memory-rewards"><p><b>${this.esc(name)}</b> ${this.percent(model.unique.chance)}</p>
            <p class="atlas-muted">${this.deps._t("옵션 한 줄 뒤바뀜 {swapChance}", { swapChance: this.percent(model.unique.swapChance) })}</p>
            <p>${this.esc(this.nextReward(model.next))}</p><details><summary>${this.deps._t("기억 전용 보상 자세히")}</summary>${gear}<ul>${model.rewards.map(this.currencyReward).join("")}</ul></details></div>`;
    }
    preparationHtml(model) {
      if (!model) return "";
      const why = model.reason || this.departBlock();
      return `<section class="memory-preparation" tabindex="-1" aria-labelledby="memory-preparation-title"><h3 id="memory-preparation-title">${this.deps._t("{boss}의 기억 {tier}단계", { boss: this.esc(model.node.boss), tier: model.tier })}</h3>
            <p class="memory-preparation-meta">${model.map.tier}등급, 보유 ${model.have}개${model.best ? this.deps._t(", 최고 승리 {best}단계", { best: model.best }) : ""}</p>
            ${this.deps.buildMapPowerEstimateHtml(this.deps.atlas.preview(this.deps.game, model.map), { hideReward: true })}${this.rewardsHtml(model)}
            <p class="memory-entry-cost">${this.deps._t("입장 비용: 이 기억 1개와 장착 각인")}</p>
            ${why ? `<p class="atlas-lock" id="memory-entry-reason">${this.esc(why)}</p>` : ""}
            <button type="button" class="atlas-primary memory-challenge" data-exploration-departure data-memory-action="challenge" data-memory-node="${this.esc(model.node.id)}" data-memory-tier="${model.tier}"
                ${why ? 'disabled aria-describedby="memory-entry-reason"' : ""}>${this.deps._t("기억 1개로 도전")}</button></section>`;
    }
    controlsHtml(rows) {
      if (!rows.length) return "";
      const options = [["held", "보유 기억", rows.filter(this.hasHeld).length], ["records", "승리 기록", rows.filter((row) => row.best > 0).length]];
      return `<div class="memory-controls"><nav aria-label="${this.deps._t("기억 목록")}">${options.map(([id, label, count]) => `<button type="button" data-memory-filter="${id}" aria-pressed="${this.filter === id}"
            >${this.deps._t("{label} {count}종", { label, count })}</button>`).join("")}</nav>
            <label for="memory-boss-search">${this.deps._t("보스 이름으로 찾기")}<input id="memory-boss-search" type="search" value="${this.esc(this.query)}" placeholder="${this.deps._t("보스 또는 지역 이름")}"
                data-memory-search></label></div>`;
    }
    visibleRows(rows) {
      const term = this.query.trim().toLocaleLowerCase();
      return rows.filter((row) => this.filter === "held" ? this.hasHeld(row) : row.best > 0).filter((row) => {
        const region = this.deps.ATLAS.regions.find((entry) => entry.id === row.node.region);
        return [row.node.boss, row.node.name, region?.name].join(" ").toLocaleLowerCase().includes(term);
      });
    }
    emptyHtml() {
      if (this.query.trim()) return '<p class="memory-empty">이름이 일치하는 기억이 없습니다.</p>';
      if (this.filter === "records") return '<p class="memory-empty">아직 승리 기록이 없습니다.</p>';
      return `<section class="memory-empty"><p>${this.deps._t("보유한 기억이 없습니다.")}</p>
            ${this.deps.game.atlas.run ? "" : `<button type="button" data-memory-action="maps">${this.deps._t("지도 준비 보기")}</button>`}</section>`;
    }
    html() {
      if (!this.active) return "";
      this.adoptContext();
      this.bindControls();
      const rows = this.deps.memoryDungeon.overview(this.deps.game), selected = this.selectedPreview(), shown = this.visibleRows(rows), block = this.departBlock();
      const head = this.deps.memoryDungeon.open(this.deps.game) ? "" : "기억 던전 해금 뒤에 아틀라스의 보스가 기억을 남깁니다.";
      const tiers = this.deps.memoryDungeon.maxTier(this.deps.game) < this.M.tiers ? this.deps._t("1~{value}단계 ({from}~{tiers}단계는 기억 던전 4, 5 해금 뒤)", { value: this.M.highTiers.from - 1, from: this.M.highTiers.from, tiers: this.M.tiers }) : this.deps._t("1~{tiers}단계 도전 가능", { tiers: this.M.tiers });
      const list = shown.length ? `<div class="memory-cards">${shown.map((row) => this.cardHtml(row, selected)).join("")}</div>` : this.emptyHtml();
      return `<div class="atlas-late memory-dungeon"><section class="atlas-late-head"><h3>${this.deps._t("기억 던전")}</h3>${head ? `<p class="atlas-muted">${head}</p>` : ""}<p class="atlas-muted">${this.deps._t("{tiers}, 보유 {total}개", { tiers, total: this.deps.memoryDungeon.total(this.deps.game) })}</p>
            ${block && !this.deps.game.atlas.run ? `<p class="atlas-lock">${this.esc(block)}</p>` : ""}</section>${this.currentRunHtml()}${this.preparationHtml(selected)}${this.controlsHtml(rows)}${list}${this.deps.bossVariantsUi.recordHtml()}</div>`;
    }
    spoilsLines(spoils) {
      const currencies = spoils.rewards.map(([key, amount]) => `${this.deps._t(this.deps.ORB_DB[key].name)} ${amount}`).join(", ");
      this.deps.addLog(this.deps._t("🕯️ 기억 {tier}단계 승리{best}: {currencies}", { tier: spoils.tier, best: spoils.best ? ` ${this.deps._t("(새 기록)")}` : "", currencies: currencies || this.deps._t("재화 없음") }), "loot-unique", { toast: true });
      (spoils.items || []).forEach((item) => this.deps.addLog(this.deps._t("🛡️ 기억의 보상 <span class='loot-{rarity}'>[{item}]</span>", { rarity: item.rarity, item: this.esc(this.deps.getItemDisplayName(item)) }), item.rarity === "unique" ? "loot-unique" : "loot-rare", { item }));
    }
    announce(detail) {
      const memory = detail.kind === "complete" ? detail.memory : null;
      if (!memory) return;
      if (memory.spoils) this.spoilsLines(memory.spoils);
      if (memory.ticket) this.deps.addLog(this.deps._t("🕯️ {name}의 기억 {tier}단계를 얻었습니다(아틀라스의 기억 보기).", { name: this.esc(this.deps._t(memory.ticket.name)), tier: memory.ticket.tier }), "loot-unique", { toast: true });
    }
    contextCurrent() {
      const owner = this.deps.game, context = this.context;
      return this.active && !!context && context.owner === owner && context.book === owner.atlas.memory && context.loop === owner.loopCount;
    }
    adoptContext() {
      if (this.contextCurrent()) return;
      const owner = this.deps.game;
      this.context = { owner, book: owner.atlas.memory, loop: owner.loopCount };
      this.selection = null;
      this.filter = "held";
      this.query = "";
    }
    bindControls() {
      const host = this.deps.document.getElementById("ui-atlas");
      if (host === this.host) return;
      releaseViewTarget(this, this.host);
      this.host = host;
      if (!host) return;
      listenView(this, host, "click", (event) => this.onClick(event));
      listenView(this, host, "input", (event) => this.onSearch(event));
      listenView(this, host, "compositionend", (event) => this.onSearch(event));
    }
    onClick(event) {
      const target = event.target.closest("[data-memory-action], [data-memory-filter]");
      if (!target || target.disabled || !target.closest(".memory-dungeon")) return;
      if (!this.contextCurrent()) return this.deps.atlasUi.refresh();
      if (target.dataset.memoryFilter) return this.setFilter(target.dataset.memoryFilter);
      const { memoryAction: action, memoryNode: node, memoryTier: tier } = target.dataset;
      if (action === "select") this.select(node, tier);
      else if (action === "challenge") this.challenge(node, tier);
      else if (action === "maps") this.showMaps();
    }
    onSearch(event) {
      if (!event.target.matches("[data-memory-search]") || event.isComposing) return;
      if (!this.contextCurrent()) return this.deps.atlasUi.refresh();
      this.search(event.target.value);
    }
    api() {
      return Object.freeze({ html: this.html, select: this.select, challenge: this.challenge, setFilter: this.setFilter, search: this.search, showMaps: this.showMaps });
    }
    dispose() {
      releaseViewEvents(this);
      this.selection = null;
      this.context = null;
      this.host = null;
    }
  };
  function createMemoryDungeonView(deps) {
    const view = new MemoryDungeonView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/memory-dungeon-ui-classic.mjs
  var memoryDungeonUi = createMemoryDungeonView({
    get ATLAS() {
      return ATLAS;
    },
    get MEMORY_DUNGEON() {
      return MEMORY_DUNGEON;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get atlas() {
      return atlas;
    },
    get atlasRun() {
      return atlasRun;
    },
    get atlasUi() {
      return atlasUi;
    },
    get bossVariantsUi() {
      return bossVariantsUi;
    },
    get buildMapPowerEstimateHtml() {
      return buildMapPowerEstimateHtml;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get getItemDisplayName() {
      return getItemDisplayName;
    },
    get getStyledOrbName() {
      return getStyledOrbName;
    },
    get memoryDungeon() {
      return memoryDungeon;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get switchTab() {
      return switchTab;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ memoryDungeonUi });
})();
