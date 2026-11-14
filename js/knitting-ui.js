// GENERATED from modules/knitting-ui*.mjs. Edit the ESM sources; run npm run build:modules.
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

  // modules/ui/knitting-view.mjs
  var KnittingView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.ownedOnly = false;
      this.lastHtml = "";
      this.lastResult = "";
      this.shownSeason = 0;
      this.esc = (value) => this.deps.escapeHTML(String(value));
      this.currentResult = () => this.shownSeason === this.deps.game.season ? this.lastResult : "";
      for (const name of ["card", "header", "render", "resultText", "knit", "offlineHtml"]) this[name] = this[name].bind(this);
      listenView(this, this.deps.window, "project-idle:knitting-yarn", ({ detail }) => {
        if (this.deps.game.isBackgroundCalculation) return;
        if (detail.first || detail.complete) {
          this.deps.game.noti.items = true;
          this.deps.showGameToast(detail.complete ? this.deps._t("「{name}」 뜨개질 가능", { name: detail.name }) : this.deps._t("새 실타래 「{name}」", { name: detail.name }), { tone: "leaf", duration: 2800 });
        }
        if (detail.first || detail.complete || this.deps.game.settings.showLootLog) this.deps.addLog(this.deps._t("실타래 「{name}」 {count}/{set}", { name: this.esc(this.deps._t(detail.name)), count: detail.count, set: detail.set }), "loot-rare");
        this.render();
      });
    }
    card(row) {
      const st = this.deps.game.knitting, count = st.counts[row.id] || 0, done = st.knitted[row.id] || 0;
      const ready = count >= row.set, reason = ready ? this.deps.knitting.reason(this.deps.game, row.id) : "";
      return `<article class="knit-card${ready ? " is-ready" : ""}"><div class="knit-card-head"><strong>${this.esc(this.deps._t(row.name))}</strong><span>${count} / ${row.set}</span></div><p>${this.esc(this.deps._t(row.label))}</p><small>${this.esc(row.found)}${done ? this.deps._t(" / 뜨개질 {done}회", { done }) : ""}</small><div class="knit-progress" role="progressbar" aria-label="${this.deps._t("{name} 수집", { name: this.esc(this.deps._t(row.name)) })}" aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${Math.max(count, row.set)}"><i style="width:${Math.min(100, count / row.set * 100)}%"></i></div>` + (ready ? `<div class="knit-card-foot"><button type="button" data-knit="${row.id}"${reason ? " disabled" : ""}>${this.deps._t("뜨개질")}</button></div>` : "") + (reason && ready ? `<p class="knit-warning">${this.esc(reason)}</p>` : "") + "</article>";
    }
    header(seen, ready) {
      return `<header class="knit-head"><div><h3>${this.deps._t("실타래 보관함")}</h3></div>${ready ? `<strong>${this.deps._t("필요 수량 충족 {ready}", { ready })}</strong>` : ""}</header>` + (seen.length > 6 ? `<div class="knit-toolbar"><button type="button" data-knit-filter="all" aria-pressed="${!this.ownedOnly}">${this.deps._t("발견한 종류 {length}", { length: seen.length })}</button><button type="button" data-knit-filter="owned" aria-pressed="${this.ownedOnly}">${this.deps._t("현재 보유 중")}</button></div>` : "");
    }
    render() {
      if (!this.active) return;
      const panel = this.deps.document.getElementById("item-tab-knitting"), button = this.deps.document.getElementById("btn-item-tab-knitting");
      if (!panel || !button) return;
      this.adoptContext();
      this.bindControls(panel);
      const opened = this.deps.contentProgression.isUnlocked("knitting");
      button.style.display = opened ? "" : "none";
      if (!opened || this.deps.game.itemSubtab !== "item-tab-knitting") return;
      const html = this.bodyHtml();
      if (html !== this.lastHtml) {
        panel.innerHTML = html;
        this.lastHtml = html;
      }
    }
    bodyHtml() {
      const seen = this.deps.knitting.visible(this.deps.game), rows = this.ownedOnly && seen.length > 6 ? seen.filter((row) => this.deps.game.knitting.counts[row.id] > 0) : seen;
      const ready = seen.filter((row) => (this.deps.game.knitting.counts[row.id] || 0) >= row.set).length;
      return this.header(seen, ready) + `<div class="knit-result" role="status" aria-live="polite">${this.esc(this.currentResult())}</div><div class="knit-grid">` + (rows.map(this.card).join("") || '<p class="knit-empty">아직 모은 실타래가 없습니다.</p>') + "</div>";
    }
    resultText(made) {
      const parts = made.currencies.map(([key, n]) => this.deps._t("{name} {n}개", { name: this.deps._t(this.deps.ORB_DB[key].name), n }));
      for (const [color, n] of made.seeds) parts.push(this.deps._t("{color} 씨앗 {n}개", { color: this.deps._t(this.deps.STUMP_BOX_COLORS[color].label), n }));
      if (made.item) parts.push(made.item.name + " 1개");
      if (made.mapReward) parts.push(`희귀 지도석 ${made.mapReward.maps.length}개`);
      for (const id of made.yarns) parts.push(this.deps.knitting.row(id).name + " 1개");
      return parts.join(", ");
    }
    knit(id) {
      if (!this.contextCurrent()) return this.render();
      this.shownSeason = this.deps.game.season;
      try {
        const result = this.deps.knittingRewards.knit(this.owner, id);
        this.lastResult = result.ok ? `${result.row.name} → ${this.resultText(result.made)}` : result.reason;
        if (result.ok) {
          this.deps.queueImportantSave(0);
          if (result.made.item) this.deps.recordEquipmentAcquisition(result.made.item);
          result.made.currencies.forEach(([key, n]) => this.deps.notifyCurrencyAcquisition(key, n));
          this.deps.addLog(this.esc(this.lastResult), "loot-rare");
        }
      } catch (error) {
        this.deps.console.error("뜨개질 보상 생성 실패", { id, error });
        this.lastResult = "보상을 만들지 못했습니다. 다시 시도하기 전에 보관함을 확인하세요.";
      }
      this.deps.updateStaticUI();
      this.render();
    }
    offlineHtml(gains) {
      if (!gains?.total) return "";
      return `<div class="background-result-chips"><span class="background-result-chip">${this.deps._t("실타래")} <b>+${gains.total}</b></span>` + gains.fresh.map((name) => `<span class="background-result-chip"><em>${this.deps._t("새 실타래")}</em> ${this.esc(name)}</span>`).join("") + "</div>";
    }
    contextCurrent() {
      const owner = this.deps.game;
      return this.active && owner === this.owner && owner.knitting === this.book && owner.season === this.season;
    }
    adoptContext() {
      if (this.contextCurrent()) return;
      this.owner = this.deps.game;
      this.book = this.owner.knitting;
      this.season = this.owner.season;
      this.ownedOnly = false;
      this.lastHtml = "";
      this.lastResult = "";
    }
    bindControls(panel) {
      if (this.panel === panel) return;
      releaseViewTarget(this, this.panel);
      this.panel = panel;
      this.lastHtml = "";
      listenView(this, panel, "click", (event) => this.onClick(event));
    }
    onClick(event) {
      const target = event.target.closest("[data-knit], [data-knit-filter]");
      if (!target || target.disabled || !this.panel.contains(target)) return;
      if (!this.contextCurrent()) return this.render();
      if (target.dataset.knit) this.knit(target.dataset.knit);
      if (target.dataset.knitFilter) {
        this.ownedOnly = target.dataset.knitFilter === "owned";
        this.render();
      }
    }
    api() {
      return Object.freeze({ render: this.render, offlineHtml: this.offlineHtml });
    }
    dispose() {
      releaseViewEvents(this);
      this.owner = null;
      this.book = null;
      this.panel = null;
      this.lastHtml = "";
      this.lastResult = "";
    }
  };
  function createKnittingView(deps) {
    const view = new KnittingView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/knitting-ui-classic.mjs
  var knittingUi = createKnittingView({
    get ORB_DB() {
      return ORB_DB;
    },
    get STUMP_BOX_COLORS() {
      return STUMP_BOX_COLORS;
    },
    get _t() {
      return _t;
    },
    get addLog() {
      return addLog;
    },
    get console() {
      return console;
    },
    get contentProgression() {
      return contentProgression;
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
    get knitting() {
      return knitting;
    },
    get knittingRewards() {
      return window.GameModules.knittingRewardRules;
    },
    get notifyCurrencyAcquisition() {
      return notifyCurrencyAcquisition;
    },
    get queueImportantSave() {
      return queueImportantSave;
    },
    get recordEquipmentAcquisition() {
      return recordEquipmentAcquisition;
    },
    get showGameToast() {
      return showGameToast;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get window() {
      return window;
    }
  });
  safeExposeGlobals({ knittingUi });
})();
