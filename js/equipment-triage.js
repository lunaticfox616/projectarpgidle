// GENERATED from modules/equipment-triage*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/domain/equipment-triage-analysis.mjs
  function freezeInventoryRecord(value) {
    if (!value || typeof value !== "object") return value;
    Object.values(value).forEach(freezeInventoryRecord);
    return Object.freeze(value);
  }
  var EquipmentTriageAnalysis = class {
    constructor(deps) {
      this.deps = deps;
      this.analyzedAs = /* @__PURE__ */ new WeakMap();
      this.analyzable = (item) => !!item && item.id !== void 0 && !this.deps.bagItems.isJewel(item);
    }
    getDamageScore(stats) {
      return Math.max(0, Number(stats && stats.totalDps) || Number(stats && stats.dps) || 0);
    }
    getEhpScore(stats) {
      if (typeof this.deps.calculatePlayerEhpProfile !== "function") {
        return Math.max(1, Number(stats && stats.maxHp) + Number(stats && stats.energyShield) || 1);
      }
      const profile = this.deps.calculatePlayerEhpProfile(stats || {});
      const values = Object.values(profile.elements || {}).map((row) => Number(row && row.entropy) || 0).filter((value) => value > 0);
      return values.length > 0 ? Math.min(...values) : Math.max(1, Number(profile.pool) || 1);
    }
    getCandidateSlots(item) {
      if (!item) return [];
      const slots = typeof this.deps.getEquipCandidateSlots === "function" ? this.deps.getEquipCandidateSlots(item) : [item.slot];
      return Array.from(new Set(slots.filter(Boolean)));
    }
    evaluateCandidateSlot(item, slot, work) {
      const after = this.readSnapshotStats(work.snapshot, item, slot);
      return {
        slot,
        dpsRatio: this.getDamageScore(after) / work.baseline.dps,
        ehpRatio: this.getEhpScore(after) / work.baseline.ehp
      };
    }
    createAnalysisWork(owner, readCombatTime, only = null) {
      const inventory = freezeInventoryRecord(JSON.parse(JSON.stringify(owner.inventory)));
      const exploration = owner.actExploration === void 0 ? void 0 : JSON.parse(JSON.stringify(owner.actExploration));
      const snapshot = {
        inventory,
        exploration,
        gameJson: JSON.stringify({ ...owner, inventory: void 0, actExploration: void 0, combatTimeMs: readCombatTime() })
      };
      const items = inventory.filter((item) => this.analyzable(item) && (!only || only.has(String(item.id)))).map((item) => ({ item, slots: this.getCandidateSlots(item), key: JSON.stringify(item) }));
      return { items, index: 0, snapshot, baseline: this.createBaseline(snapshot) };
    }
    isSpecialCandidate(item) {
      return !!(item && (item.rarity === "unique" || item.encroached || item.corrupted || item.loopSealed || item.fusedRelic || item.dropOnly || item.cosmosChase || item.ultraRare));
    }
    percentGain(ratio) {
      return Math.max(0, Math.round((Math.max(0, Number(ratio) || 1) - 1) * 1e3) / 10);
    }
    classifyCandidate(candidate, work) {
      const { item, slots } = candidate;
      const rows = slots.map((slot) => this.evaluateCandidateSlot(item, slot, work));
      const bestDps = rows.reduce(
        (best, row) => row.dpsRatio > best.dpsRatio ? row : best,
        { slot: "", dpsRatio: 1, ehpRatio: 1 }
      );
      const bestEhp = rows.reduce(
        (best, row) => row.ehpRatio > best.ehpRatio ? row : best,
        { slot: "", dpsRatio: 1, ehpRatio: 1 }
      );
      const balanced = rows.filter((row) => row.dpsRatio >= 1.01 && row.ehpRatio >= 1.01).sort((a, b) => Math.min(b.dpsRatio, b.ehpRatio) - Math.min(a.dpsRatio, a.ehpRatio))[0] || null;
      const dpsGainPct = this.percentGain(bestDps.dpsRatio);
      const ehpGainPct = this.percentGain(bestEhp.ehpRatio);
      let kind = balanced ? "balanced" : dpsGainPct >= 1 ? "damage" : ehpGainPct >= 1 ? "defense" : "keep";
      const upgrade = rows.some((row) => row.dpsRatio >= 1.01 && row.ehpRatio >= 0.99 || row.ehpRatio >= 1.01 && row.dpsRatio >= 0.99);
      const result = {
        kind,
        dpsGainPct,
        ehpGainPct,
        upgrade,
        special: this.isSpecialCandidate(item),
        dpsSlot: balanced ? balanced.slot : bestDps.slot,
        ehpSlot: balanced ? balanced.slot : bestEhp.slot
      };
      this.analyzedAs.set(result, candidate.key);
      return result;
    }
    createBaseline(snapshot) {
      const stats = this.readSnapshotStats(snapshot);
      return { dps: Math.max(1, this.getDamageScore(stats)), ehp: Math.max(1, this.getEhpScore(stats)) };
    }
    readSnapshotStats(snapshot, item, slot) {
      const owner = JSON.parse(snapshot.gameJson);
      owner.inventory = snapshot.inventory;
      if (snapshot.exploration !== void 0) owner.actExploration = snapshot.exploration;
      if (item) owner.equipment[slot] = JSON.parse(JSON.stringify(item));
      return this.deps.readStats(owner);
    }
  };
  function createEquipmentTriageAnalysis(deps) {
    const instance = new EquipmentTriageAnalysis(deps);
    return Object.freeze({
      createWork: instance.createAnalysisWork.bind(instance),
      classify: instance.classifyCandidate.bind(instance),
      analyzable: instance.analyzable,
      candidateSlots: instance.getCandidateSlots.bind(instance),
      analyzedKey: (result) => instance.analyzedAs.get(result)
    });
  }

  // modules/domain/equipment-triage.mjs
  var EQUIPMENT_TRIAGE_FILTER_IDS = Object.freeze(["all", "balanced", "damage", "defense", "special", "keep"]);
  var EquipmentTriage = class {
    constructor(deps) {
      this.deps = deps;
      this.analysis = createEquipmentTriageAnalysis(this.deps);
      this.state = { status: "idle", filter: "all", results: /* @__PURE__ */ new Map(), signature: "", token: 0, work: null, lastSyncAt: 0 };
      this.freshGearAt = 0;
      this.getBuildSignature = (owner) => this.deps.getPersistentBuildSignature(owner, false);
    }
    getCounts() {
      const rows = Array.from(this.state.results.values());
      return {
        all: rows.length,
        balanced: rows.filter((row) => row.kind === "balanced").length,
        damage: rows.filter((row) => row.dpsGainPct >= 1).length,
        defense: rows.filter((row) => row.ehpGainPct >= 1).length,
        special: rows.filter((row) => row.special).length,
        keep: rows.filter((row) => row.kind === "keep" && !row.special).length
      };
    }
    getRecommendedCandidate(owner) {
      if (this.state.status !== "ready" || ["special", "keep"].includes(this.state.filter)) return null;
      const candidates = (Array.isArray(owner.inventory) ? owner.inventory : []).map((item) => ({ item, result: this.getResult(item) }));
      const ranked = candidates.map((candidate) => {
        const result = candidate.result;
        if (!result) return null;
        if (this.state.filter === "damage" && result.dpsGainPct >= 1) return { ...candidate, slot: result.dpsSlot, score: result.dpsGainPct };
        if (this.state.filter === "defense" && result.ehpGainPct >= 1) return { ...candidate, slot: result.ehpSlot, score: result.ehpGainPct };
        if (["all", "balanced"].includes(this.state.filter) && result.kind === "balanced") {
          return { ...candidate, slot: result.dpsSlot, score: Math.min(result.dpsGainPct, result.ehpGainPct) };
        }
        return null;
      }).filter(Boolean).sort((a, b) => b.score - a.score);
      return ranked[0] || null;
    }
    matchesFilter(result) {
      if (this.state.filter === "all") return true;
      if (!result) return false;
      if (this.state.filter === "balanced") return result.kind === "balanced";
      if (this.state.filter === "damage") return result.dpsGainPct >= 1;
      if (this.state.filter === "defense") return result.ehpGainPct >= 1;
      if (this.state.filter === "special") return result.special;
      return result.kind === "keep" && !result.special;
    }
    filterRows(rows) {
      if (this.state.status !== "ready" || this.state.filter === "all") return rows;
      return rows.map((row) => ({
        ...row,
        filterActive: true,
        filterMatched: row.filterMatched !== false && this.matchesFilter(this.getResult(row.item))
      }));
    }
    getResult(item) {
      if (this.state.status !== "ready" || !item || item.id === void 0) return null;
      return this.state.results.get(String(item.id)) || null;
    }
    currentFilter() {
      return this.state.status === "ready" ? this.state.filter : "all";
    }
    clearResults(status) {
      this.state.token += 1;
      this.state.status = status;
      this.state.filter = "all";
      this.state.results = /* @__PURE__ */ new Map();
      this.state.signature = "";
      this.state.work = null;
      this.state.lastSyncAt = 0;
    }
    sync(owner, force, now) {
      if (this.state.status !== "ready" && this.state.status !== "running") return false;
      if (!force && now - this.state.lastSyncAt < 500) return false;
      this.state.lastSyncAt = now;
      return this.getBuildSignature(owner) !== this.state.signature;
    }
    prepareStart() {
      this.state.status = "running";
      this.state.filter = "all";
      this.state.results = /* @__PURE__ */ new Map();
    }
    begin(owner, readCombatTime, ids, clock) {
      this.state.token += 1;
      if (!ids) this.state.signature = this.getBuildSignature(owner);
      this.state.work = this.analysis.createWork(owner, readCombatTime, ids);
      this.state.lastSyncAt = clock();
    }
    finish(owner, token, clock) {
      if (token !== this.state.token || !this.state.work) return false;
      if (this.getBuildSignature(owner) !== this.state.signature) return "stale";
      this.state.status = "ready";
      this.state.work = null;
      this.state.lastSyncAt = clock();
      return true;
    }
    /** At least three items per chunk; after that yield when 10 ms has elapsed. */
    step(token, clock, started) {
      if (token !== this.state.token || !this.state.work) return;
      const first = this.state.work.index;
      do {
        const candidate = this.state.work.items[this.state.work.index++];
        this.state.results.set(String(candidate.item.id), this.analysis.classify(candidate, this.state.work));
      } while (this.state.work.index < this.state.work.items.length && (this.state.work.index - first < 3 || clock() - started < 10));
    }
    changedIds(owner) {
      const live = /* @__PURE__ */ new Map();
      (owner.inventory || []).forEach((item) => {
        if (this.analysis.analyzable(item)) live.set(String(item.id), item);
      });
      Array.from(this.state.results.keys()).forEach((id) => {
        if (!live.has(id)) this.state.results.delete(id);
      });
      const changed = Array.from(live).filter(([id, item]) => this.analysis.analyzedKey(this.state.results.get(id)) !== JSON.stringify(item));
      return new Set(changed.map(([id]) => id));
    }
    setFilter(filterId) {
      if (this.state.status !== "ready" || !EQUIPMENT_TRIAGE_FILTER_IDS.includes(filterId)) return false;
      this.state.filter = filterId;
      return true;
    }
    rate(owner, item, readCombatTime) {
      return this.analysis.analyzable(item) ? this.analysis.classify(
        { item, slots: this.analysis.candidateSlots(item), key: "" },
        this.analysis.createWork(owner, readCombatTime, /* @__PURE__ */ new Set())
      ) : null;
    }
    /** Four newly acquired items per four seconds; never during background settlement. */
    checkFreshGear(owner, now, readCombatTime) {
      if (now < this.freshGearAt || owner.isBackgroundCalculation) return;
      this.freshGearAt = now + 4e3;
      const ids = new Set(this.deps.takeFreshGearIds(4).map(String));
      if (!ids.size) return;
      const work = this.analysis.createWork(owner, readCombatTime, ids);
      const keep = this.state.status === "ready" && !this.state.work && this.getBuildSignature(owner) === this.state.signature;
      const results = work.items.map((candidate) => [String(candidate.item.id), this.analysis.classify(candidate, work)]);
      if (keep) results.forEach(([id, result]) => this.state.results.set(id, result));
      if (results.some(([, result]) => result.upgrade)) owner.noti.items = true;
    }
  };
  function createEquipmentTriage(deps) {
    const instance = new EquipmentTriage(deps);
    return Object.freeze({
      view: instance.state,
      getCounts: instance.getCounts.bind(instance),
      getRecommendedCandidate: instance.getRecommendedCandidate.bind(instance),
      filterRows: instance.filterRows.bind(instance),
      currentFilter: instance.currentFilter.bind(instance),
      getResult: instance.getResult.bind(instance),
      clearResults: instance.clearResults.bind(instance),
      sync: instance.sync.bind(instance),
      prepareStart: instance.prepareStart.bind(instance),
      begin: instance.begin.bind(instance),
      finish: instance.finish.bind(instance),
      step: instance.step.bind(instance),
      changedIds: instance.changedIds.bind(instance),
      setFilter: instance.setFilter.bind(instance),
      rate: instance.rate.bind(instance),
      checkFreshGear: instance.checkFreshGear.bind(instance)
    });
  }

  // modules/ui/equipment-triage.mjs
  var EquipmentTriageUi = class {
    constructor(model, deps) {
      this.model = model;
      this.deps = deps;
      this.state = this.model.view;
      this.getCounts = this.model.getCounts;
      this.getRecommendedCandidate = () => this.model.getRecommendedCandidate(this.deps.getOwner());
      this.changedIds = () => this.model.changedIds(this.deps.getOwner());
      this.AUTO_DELAY_MS = 300;
      this.timer = null;
      this.autoTimer = null;
      this.autoArmed = false;
      this.wantsFullRun = () => ["idle", "stale"].includes(this.state.status) || this.autoArmed && ["cancelled", "error"].includes(this.state.status);
    }
    getStatusCopy() {
      if (this.state.status === "running") return this.deps._t("{index}/{length} 분석 중", { index: this.state.work.index, length: this.state.work.items.length });
      if (this.state.status === "ready") {
        const counts = this.getCounts();
        return this.deps._t("{all}개 완료, 균형 {balanced}, 공격 {damage}, 생존 {defense}", { all: counts.all, balanced: counts.balanced, damage: counts.damage, defense: counts.defense });
      }
      if (this.state.status === "error") return this.deps._t("분석 중 오류가 발생했습니다. 다시 시도하세요.");
      if (this.state.status === "stale") return this.deps._t("세팅이 바뀌어 다시 분석합니다.");
      if (this.state.status === "cancelled") return this.deps._t("분석을 중단했습니다.");
      return this.deps._t("분석 시작 시점의 세팅/전투 상태로 비교합니다.");
    }
    getFilterOptionsHtml(counts) {
      const labels = {
        all: this.deps._t("전체"),
        balanced: this.deps._t("균형 상승"),
        damage: this.deps._t("공격 상승"),
        defense: this.deps._t("생존 상승"),
        special: this.deps._t("특수 장비"),
        keep: this.deps._t("현 세팅 유지")
      };
      return EQUIPMENT_TRIAGE_FILTER_IDS.map((id) => `<option value="${id}" ${this.state.filter === id ? "selected" : ""}>${labels[id]} ${counts[id] || 0}</option>`).join("");
    }
    isInventoryNearFull() {
      if (typeof this.deps.getInventoryLimit !== "function" || typeof this.deps.getInventoryUsedCellCount !== "function") return false;
      const limit = Math.max(1, Math.floor(this.deps.getInventoryLimit(this.deps.getOwner())));
      return this.deps.getInventoryUsedCellCount(this.deps.getOwner()) >= Math.floor(limit * 0.9);
    }
    getRecommendTitle(recommendation) {
      if (recommendation) return this.state.filter === "all" ? this.deps._t("공격과 생존이 함께 오르는 장비만 추천합니다.") : this.deps._t("현재 판단 기준에서 가장 높은 장비를 추천합니다.");
      if (this.state.status !== "ready") return this.deps._t("현재 세팅으로 일괄 분석을 완료하면 추천을 확인할 수 있습니다.");
      if (["all", "balanced"].includes(this.state.filter)) return this.deps._t("공격과 생존이 함께 오르는 장비가 없습니다. 공격 상승/생존 상승 필터로 각각 비교할 수 있습니다.");
      if (["special", "keep"].includes(this.state.filter)) return this.deps._t("이 목록에서는 장비를 직접 선택해 효과를 비교하세요.");
      return this.deps._t("선택한 판단 기준에서 상승하는 장비가 없습니다.");
    }
    getRecommendLabel(recommendation) {
      if (recommendation) return ["all", "balanced"].includes(this.state.filter) ? this.deps._t("균형 추천 교체") : this.deps._t("추천 교체");
      if (this.state.status === "running") return this.deps._t("분석 중");
      if (this.state.status !== "ready") return this.state.status === "idle" ? this.deps._t("분석 먼저") : this.deps._t("재분석 필요");
      return {
        all: this.deps._t("균형 상승 없음"),
        balanced: this.deps._t("균형 상승 없음"),
        damage: this.deps._t("공격 상승 없음"),
        defense: this.deps._t("생존 상승 없음"),
        special: this.deps._t("직접 비교"),
        keep: this.deps._t("직접 비교")
      }[this.state.filter];
    }
    render() {
      const host = this.deps.document.getElementById("ui-equipment-triage");
      if (!host) return;
      const counts = this.getCounts();
      const running = this.state.status === "running";
      const ready = this.state.status === "ready";
      const recommendation = this.getRecommendedCandidate();
      const autoSalvageButton = this.isInventoryNearFull() ? `<button type="button" onclick="equipmentWindowUi.openSalvage()">${this.deps._t("자동 해체 설정")}</button>` : "";
      const fillable = this.deps.countFillableEmptySlots();
      const fillButton = fillable ? `<button type="button" class="equipment-fill-empty" onclick="fillEmptyEquipmentSlots()">${this.deps._t("빈 칸 채우기 {fillable}", { fillable })}</button>` : "";
      const html = `<div class="equipment-triage-copy" data-tip="${this.deps._t("분석 시작 시점의 세팅/전투 상태를 기준으로 비교합니다.")}"><strong>${this.deps._t("현재 세팅 분석")}</strong><small>${this.getStatusCopy()}</small></div>
          <div class="equipment-triage-controls">
              <label>${this.deps._t("판단")} <select onchange="equipmentTriage.setFilter(this.value)" ${ready ? "" : "disabled"}>${this.getFilterOptionsHtml(counts)}</select></label>
              <button type="button" onclick="equipmentTriage.${running ? "cancel" : "start"}()">${running ? this.deps._t("분석 중단") : this.state.status === "idle" ? this.deps._t("일괄 분석") : this.deps._t("다시 분석")}</button>
              <button type="button" onclick="equipmentTriage.equipRecommended()" ${recommendation ? "" : "disabled"} data-tip="${this.getRecommendTitle(recommendation)}">${this.getRecommendLabel(recommendation)}</button>
              ${fillButton}${autoSalvageButton}
          </div>`;
      const renderSignature = this.renderSignature(counts, recommendation, fillable);
      if (host.dataset.renderSig === renderSignature) return;
      host.innerHTML = html;
      host.dataset.renderSig = renderSignature;
    }
    renderSignature(counts, recommendation, fillable) {
      return `${this.deps.i18n.language}|${this.state.status}|${this.state.filter}|${this.state.work ? this.state.work.index : 0}|${JSON.stringify(counts)}|${recommendation ? recommendation.item.id : ""}|${this.isInventoryNearFull()}|${fillable}`;
    }
    failAnalysis(error) {
      this.deps.console.error("equipment triage failed:", error);
      this.clearResults("error");
      if (typeof this.deps.showGameToast === "function") {
        this.deps.showGameToast(this.deps._t("장비 분석에 실패했습니다. 다시 시도해 주세요."), { tone: "error", duration: 3200 });
      }
    }
    cancel() {
      if (this.state.status !== "running") return false;
      this.clearResults("cancelled");
      return true;
    }
    later(run, wait = this.AUTO_DELAY_MS) {
      this.autoTimer = this.deps.setTimeout(() => {
        this.autoTimer = null;
        if (!this.state.work) run();
      }, wait);
    }
    autoStart() {
      this.sync(true);
      if (this.deps.getOwner().itemSubtab !== "item-tab-equip") return;
      const opening = this.autoArmed;
      const full = this.wantsFullRun();
      this.autoArmed = false;
      if (this.autoTimer || this.state.work) return;
      if (full) {
        this.later(() => {
          if (this.state.status !== "ready") this.start();
        }, opening ? 0 : this.AUTO_DELAY_MS);
        return;
      }
      const changed = this.state.status === "ready" ? this.changedIds() : /* @__PURE__ */ new Set();
      if (changed.size) this.later(() => {
        this.sync(true);
        if (this.state.status === "ready") this.begin(changed);
      }, opening ? 0 : this.AUTO_DELAY_MS);
    }
    equipRecommended() {
      this.sync(true);
      const recommendation = this.getRecommendedCandidate();
      if (!recommendation || typeof this.deps.equipItemById !== "function") return false;
      const equipped = this.deps.equipItemById(recommendation.item.id, recommendation.slot);
      if (!equipped) return false;
      if (typeof this.deps.showGameToast === "function") {
        this.deps.showGameToast(this.deps._t("{item} 장착, {slot}", { item: this.deps._t(recommendation.item.name || "추천 장비"), slot: this.deps._t(recommendation.slot) }), { tone: "success" });
      }
      this.start();
      return true;
    }
    clearResults(status) {
      this.deps.clearTimeout(this.timer);
      this.deps.clearTimeout(this.autoTimer);
      this.timer = null;
      this.autoTimer = null;
      this.model.clearResults(status);
      this.render();
    }
    sync(force) {
      if (this.model.sync(this.deps.getOwner(), force, this.deps.Date.now())) this.clearResults("stale");
    }
    finishAnalysis(token) {
      const result = this.model.finish(this.deps.getOwner(), token, () => this.deps.Date.now());
      if (result === "stale") return this.clearResults("stale");
      if (!result) return;
      this.render();
      if (typeof this.deps.updateStaticUI === "function") this.deps.updateStaticUI();
    }
    runChunk(token) {
      if (token !== this.state.token || !this.state.work) return;
      this.timer = null;
      const started = this.deps.performance.now();
      try {
        this.sync();
        if (!this.state.work) return;
        this.model.step(token, () => this.deps.performance.now(), started);
      } catch (error) {
        this.failAnalysis(error);
        return;
      }
      this.render();
      if (this.state.work.index >= this.state.work.items.length) return this.finishAnalysis(token);
      this.timer = this.deps.setTimeout(() => this.runChunk(token), 0);
    }
    begin(ids) {
      try {
        this.model.begin(this.deps.getOwner(), () => this.deps.getCombatTime(), ids, () => this.deps.Date.now());
      } catch (error) {
        this.failAnalysis(error);
        return false;
      }
      this.render();
      if (!this.state.work.items.length) {
        this.finishAnalysis(this.state.token);
        return true;
      }
      const token = this.state.token;
      this.timer = this.deps.setTimeout(() => this.runChunk(token), 0);
      return true;
    }
    start() {
      if (this.state.status === "running") return false;
      this.deps.clearTimeout(this.autoTimer);
      this.autoTimer = null;
      this.model.prepareStart();
      return this.begin(null);
    }
    setFilter(filterId) {
      this.sync(true);
      if (!this.model.setFilter(filterId)) return false;
      this.render();
      if (typeof this.deps.updateStaticUI === "function") this.deps.updateStaticUI();
      return true;
    }
    onOpen() {
      this.autoArmed = true;
    }
  };
  function createEquipmentTriageUi(model, deps) {
    const instance = new EquipmentTriageUi(model, deps);
    return Object.freeze({
      render: instance.render.bind(instance),
      start: instance.start.bind(instance),
      cancel: instance.cancel.bind(instance),
      autoStart: instance.autoStart.bind(instance),
      onOpen: instance.onOpen.bind(instance),
      setFilter: instance.setFilter.bind(instance),
      filterRows: instance.model.filterRows,
      currentFilter: instance.model.currentFilter,
      getResult: instance.model.getResult,
      equipRecommended: instance.equipRecommended.bind(instance),
      rate: (item) => instance.model.rate(instance.deps.getOwner(), item, () => instance.deps.getCombatTime()),
      checkFreshGear: () => instance.model.checkFreshGear(instance.deps.getOwner(), instance.deps.Date.now(), () => instance.deps.getCombatTime())
    });
  }

  // modules/equipment-triage-classic.mjs
  var analysis = createEquipmentTriage({
    get bagItems() {
      return bagItems;
    },
    get calculatePlayerEhpProfile() {
      return typeof calculatePlayerEhpProfile === "function" ? calculatePlayerEhpProfile : void 0;
    },
    get getEquipCandidateSlots() {
      return typeof getEquipCandidateSlots === "function" ? getEquipCandidateSlots : void 0;
    },
    get getPersistentBuildSignature() {
      return getPersistentBuildSignature;
    },
    get takeFreshGearIds() {
      return takeFreshGearIds;
    },
    readStats: (owner) => combatEquipmentStats.read(false, owner)
  });
  var equipmentTriage = createEquipmentTriageUi(analysis, {
    getOwner: () => game,
    get document() {
      return document;
    },
    get i18n() {
      return i18n;
    },
    get _t() {
      return _t;
    },
    get Date() {
      return Date;
    },
    get performance() {
      return performance;
    },
    get console() {
      return console;
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get clearTimeout() {
      return clearTimeout.bind(globalThis);
    },
    get getCombatTime() {
      return getCombatTime;
    },
    get getInventoryLimit() {
      return typeof getInventoryLimit === "function" ? getInventoryLimit : void 0;
    },
    get getInventoryUsedCellCount() {
      return typeof getInventoryUsedCellCount === "function" ? getInventoryUsedCellCount : void 0;
    },
    get countFillableEmptySlots() {
      return countFillableEmptySlots;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "function" ? updateStaticUI : void 0;
    },
    get showGameToast() {
      return typeof showGameToast === "function" ? showGameToast : void 0;
    },
    get equipItemById() {
      return typeof equipItemById === "function" ? equipItemById : void 0;
    }
  });
  safeExposeGlobals({ equipmentTriage });
})();
