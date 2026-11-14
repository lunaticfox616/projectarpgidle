// GENERATED from modules/records-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/ui/records-view.mjs
  var RecordsView = class {
    constructor(deps) {
      this.deps = deps;
      this.active = true;
      for (const name of ["formatCount", "formatDuration", "formatDate", "getZoneLabel", "statCard", "renderHeader", "renderLoopSection", "renderActSection", "renderBestSection", "renderIncidentSection", "renderEchoSection", "buildRecordsHtml", "renderRecordsTab"]) this[name] = this[name].bind(this);
      this.MINUTE = 60 * 1e3;
      this.HOUR = 60 * this.MINUTE;
      this.DAY = 24 * this.HOUR;
      this.TONE = Object.freeze({
        loop: "#e8c27a",
        time: "#8fd8ff",
        level: "#8fe07a",
        chaos: "#b78bff",
        labyrinth: "#d9b066",
        sky: "#9fd0ff",
        underworld: "#54b8a4",
        ocean: "#5ab8f0",
        colony: "#9fd46a",
        zone: "#eee7dc",
        damage: "#ff8a5c"
      });
      this.INCIDENT_TONE = Object.freeze({
        critter: "#ffcf4a",
        stray: "#9be0a4",
        sleep: "#a9b8ff",
        star: "#ffe9a0",
        challenge: "#ff9f6b",
        breath: "#b8f0c8",
        shower: "#ffd36e",
        rainbow: "#c79bff",
        feast: "#ffcf4a",
        yawn: "#9fd46a",
        lucky: "#8fd8ff",
        luckyKill: "#c79bff",
        unknown: "#8b8478"
      });
      this.BEST_ROWS = [
        { key: "loop", label: "최고 루프", unit: "", tone: this.TONE.loop },
        { key: "level", label: "최고 레벨", unit: "", tone: this.TONE.level },
        { key: "actZone", label: "최고 개방 사냥터", unit: "", format: this.getZoneLabel, tone: this.TONE.zone },
        { key: "abyssDepth", label: "혼돈 심화", unit: "층", tone: this.TONE.chaos },
        { key: "chaosRealmFloor", label: "혼돈계", unit: "층", tone: this.TONE.chaos },
        { key: "labyrinthFloor", label: "고대 미궁", unit: "층", tone: this.TONE.labyrinth },
        { key: "skyFloor", label: "창공의 탑", unit: "층", tone: this.TONE.sky },
        { key: "underworldFloor", label: "지하계", unit: "층", tone: this.TONE.underworld },
        { key: "oceanBoundary", label: "심해", unit: "m", tone: this.TONE.ocean },
        { key: "colonyWave", label: "군락지 방어", unit: "파도", tone: this.TONE.colony }
      ];
    }
    formatCount(value) {
      return Math.floor(Number(value) || 0).toLocaleString(this.deps.i18n.locale);
    }
    formatDuration(ms) {
      let total = Math.max(0, Math.floor(Number(ms) || 0));
      if (total < this.MINUTE) return this.deps._t("{floor}초", { floor: Math.floor(total / 1e3) });
      if (total < this.HOUR) return this.deps._t("{floor}분 {floor2}초", { floor: Math.floor(total / this.MINUTE), floor2: Math.floor(total % this.MINUTE / 1e3) });
      if (total < this.DAY) return this.deps._t("{floor}시간 {floor2}분", { floor: Math.floor(total / this.HOUR), floor2: Math.floor(total % this.HOUR / this.MINUTE) });
      return this.deps._t("{floor}일 {floor2}시간", { floor: Math.floor(total / this.DAY), floor2: Math.floor(total % this.DAY / this.HOUR) });
    }
    formatDate(timestamp) {
      let ts = Math.floor(Number(timestamp) || 0);
      if (!ts) return "기록 없음";
      let d = new Date(ts);
      return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }
    getZoneLabel(zoneId) {
      let id = Math.floor(Number(zoneId) || 0);
      if (typeof this.deps.getZone === "function") {
        let zone = this.deps.getZone(id);
        if (zone && zone.name) return zone.name;
      }
      return this.deps._t("구역 {id}", { id });
    }
    statCard(iconKind, label, value, sub, tone) {
      let icon = ["attack", "phys", "fire", "cold", "light", "chaos"].includes(iconKind) ? `<span class="records-stat-icon combat-log-icon combat-log-icon--${iconKind}" aria-hidden="true"></span>` : "";
      return `<div class="records-stat"${tone ? ` style="--record-tone:${tone}"` : ""}>${icon}<span class="records-stat-label">${this.deps.escapeHTML(label)}</span><strong class="records-stat-value">${this.deps.escapeHTML(value)}</strong>` + (sub ? `<small class="records-stat-sub">${this.deps.escapeHTML(sub)}</small>` : "") + "</div>";
    }
    renderHeader(view) {
      return `<section class="records-section records-header">
            <div class="records-section-title">${this.deps._t("진행 중인 루프")}</div>
            <div class="records-stat-row">
                ${this.statCard("", "현재 루프", this.deps._t("루프 {loop}", { loop: this.formatCount(view.currentLoop.loop) }), "", this.TONE.loop)}
                ${this.statCard("", "이번 루프 진행", this.formatDuration(view.currentLoop.activeMs), this.deps._t("실제 경과 {elapsedMs}", { elapsedMs: this.formatDuration(view.currentLoop.elapsedMs) }), this.TONE.time)}
            </div>
            <details class="records-time-note"><summary>${this.deps._t("시간 기록 안내")}</summary>
            <p class="records-note">${this.deps._t("기록 시작 {startedAt}, {trackedForMs} 동안 기록", { startedAt: this.deps.escapeHTML(this.formatDate(view.startedAt)), trackedForMs: this.deps.escapeHTML(this.formatDuration(view.trackedForMs)) })}<br>
            ${this.deps._t("시간 기록은 이 기능이 추가된 시점부터 쌓입니다. 진행 시간은 실제 게임 계산 시간이며, 실제 경과는 자리를 비운 시간도 포함합니다.")}</p></details>
        </section>`;
    }
    renderLoopSection(view) {
      let summary = view.loopSummary;
      let summaryRow = `<div class="records-stat-row">
            ${this.statCard("", "완료한 루프", this.deps._t("{count}회", { count: this.formatCount(summary.count) }), "기록 시작 이후", this.TONE.loop)}
            ${this.statCard("", "최단 루프", summary.fastestMs ? this.formatDuration(summary.fastestMs) : "-", summary.fastestLoop ? this.deps._t("루프 {fastestLoop}, 진행 시간", { fastestLoop: this.formatCount(summary.fastestLoop) }) : "아직 없음", this.TONE.level)}
            ${this.statCard("", "평균 루프", summary.averageMs ? this.formatDuration(summary.averageMs) : "-", "진행 시간", this.TONE.time)}
        </div>`;
      if (!view.loops.length) {
        return `<section class="records-section records-loop-history">
                <div class="records-section-title">${this.deps._t("최근 루프")}</div>
                <p class="records-empty">${this.deps._t("아직 완료한 루프가 없습니다. 루프를 한 번 넘기면 여기에 소요 시간이 남습니다.")}</p>
            </section>`;
      }
      let rows = view.loops.map((row) => `<tr>
            <td class="records-loop">${this.formatCount(row.loop)}</td>
            <td class="records-num${summary.fastestMs && row.activeMs === summary.fastestMs ? " is-best" : ""}">${this.deps.escapeHTML(this.formatDuration(row.activeMs))}</td>
            <td class="records-num">${this.deps.escapeHTML(this.formatDuration(row.durationMs))}</td>
            <td>${this.deps.escapeHTML(this.getZoneLabel(row.maxZoneId))}</td>
            <td class="records-num records-chaos">${row.bestAbyssDepth ? this.deps._t("{bestAbyssDepth}층", { bestAbyssDepth: this.formatCount(row.bestAbyssDepth) }) : "-"}</td>
            <td class="records-num records-level">Lv.${this.formatCount(row.level)}</td>
            <td class="records-num${row.deaths > 0 ? " is-deaths" : ""}">${this.formatCount(row.deaths)}</td>
        </tr>`).join("");
      return `<section class="records-section records-loop-history">
            <div class="records-section-title">${this.deps._t("최근 루프")}<span>${this.deps._t("{length}개 보관", { length: this.formatCount(view.loops.length) })}</span></div>
            ${summaryRow}
            <div class="records-table-scroll">
                <table class="records-table">
                    <thead><tr><th>${this.deps._t("루프")}</th><th>${this.deps._t("진행 시간")}</th><th>${this.deps._t("실제 경과")}</th><th>${this.deps._t("도달 사냥터")}</th><th>${this.deps._t("혼돈 최고")}</th><th>${this.deps._t("레벨")}</th><th>${this.deps._t("죽음")}</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
    }
    renderActSection(view) {
      let ids = [];
      for (let id = 0; id <= 9; id++) {
        if (view.actBest[id] !== void 0 || view.currentLoop.actClears[id] !== void 0) ids.push(id);
      }
      if (!ids.length) {
        return `<section class="records-section">
                <div class="records-section-title">${this.deps._t("액트 돌파 기록")}</div>
                <p class="records-empty">${this.deps._t("액트를 돌파하면 루프 진행 시간 기준 기록이 여기에 남습니다.")}</p>
            </section>`;
      }
      let rows = ids.map((id) => {
        let current = view.currentLoop.actClears[id];
        let best = view.actBest[id];
        let isBestThisLoop = current !== void 0 && best !== void 0 && current <= best;
        return `<tr>
                <td>${this.deps.escapeHTML(this.getZoneLabel(id))}</td>
                <td class="records-num">${current === void 0 ? "-" : this.deps.escapeHTML(this.formatDuration(current))}</td>
                <td class="records-num${isBestThisLoop ? " is-best" : ""}">${best === void 0 ? "-" : this.deps.escapeHTML(this.formatDuration(best))}</td>
            </tr>`;
      }).join("");
      return `<section class="records-section">
            <div class="records-section-title">${this.deps._t("액트 돌파 기록")}<span>${this.deps._t("루프 진행 시간 기준")}</span></div>
            <div class="records-table-scroll">
                <table class="records-table">
                    <thead><tr><th>${this.deps._t("사냥터")}</th><th>${this.deps._t("이번 루프")}</th><th>${this.deps._t("최고 기록")}</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </section>`;
    }
    renderBestSection(view) {
      let cards = this.BEST_ROWS.filter((row) => Math.floor(Number(view.best[row.key]) || 0) > 0).map((row) => {
        let value = Math.floor(Number(view.best[row.key]) || 0);
        let text = row.format ? row.format(value) : `${value.toLocaleString()}${row.unit}`;
        return this.statCard("", row.label, text, "", row.tone);
      }).join("");
      if (!cards) {
        return `<section class="records-section">
                <div class="records-section-title">${this.deps._t("최고 도달")}</div>
                <p class="records-empty">${this.deps._t("아직 기록된 도달 지점이 없습니다.")}</p>
            </section>`;
      }
      return `<section class="records-section">
            <div class="records-section-title">${this.deps._t("최고 진행")}<span>${this.deps._t("루프를 넘겨도 유지됩니다, 층수는 개방 기준")}</span></div>
            <div class="records-stat-row">${cards}</div>
        </section>`;
    }
    renderIncidentSection(view) {
      let cards = view.incidents.map((row) => row.hidden && !row.count ? this.statCard("", "???", "-", "숨은 사건", this.INCIDENT_TONE.unknown) : this.statCard("", row.name, this.deps._t("{count}회", { count: this.formatCount(row.count) }), row.hidden ? "숨은 사건" : "", this.INCIDENT_TONE[row.key])).join("");
      const hidden = view.incidents.filter((row) => row.hidden), found = hidden.filter((row) => row.count > 0).length;
      return `<section class="records-section">
            <div class="records-section-title">${this.deps._t("잔잔한 사건")}<span>${this.deps._t("사냥 중에 드물게 일어나는 일, 루프를 넘겨도 유지됩니다. 숨은 사건 {found}/{length}", { found, length: hidden.length })}</span></div>
            <div class="records-stat-row">${cards}</div>
        </section>`;
    }
    renderEchoSection(view) {
      let echo = view.echo;
      if (!echo.runs) return "";
      const recent = echo.last ? this.statCard(
        "attack",
        "최근 DPS",
        this.formatCount(echo.last.dps),
        echo.changePct === null ? this.deps._t("{value}초 측정", { value: echo.last.seconds % 1 < 0.05 ? Math.round(echo.last.seconds) : echo.last.seconds.toFixed(1) }) : this.deps._t("이전 대비 {value}{changePct}%", { value: echo.changePct >= 0 ? "+" : "", changePct: echo.changePct.toFixed(1) }),
        this.TONE.damage
      ) : "";
      return `<section class="records-section">
            <div class="records-section-title">${this.deps._t("나무꾼의 잔상")}<span>${this.deps._t("30초 허수아비 측정")}</span></div>
            <div class="records-stat-row">
                ${recent}
                ${this.statCard("attack", "최고 DPS", this.formatCount(echo.bestDps), "", this.TONE.damage)}
                ${this.statCard("attack", "최고 총 피해", this.formatCount(echo.bestDamage), "", this.TONE.damage)}
                ${this.statCard("", "측정 횟수", this.deps._t("{runs}회", { runs: this.formatCount(echo.runs) }), this.deps._t("마지막 {lastAt}", { lastAt: this.formatDate(echo.lastAt) }), this.TONE.time)}
            </div>
        </section>`;
    }
    buildRecordsHtml(view) {
      return this.renderHeader(view) + (typeof this.deps.chronicleUi === "object" ? this.deps.chronicleUi.sectionHtml() : "") + (typeof this.deps.weaponMasteryUi === "object" ? this.deps.weaponMasteryUi.sectionHtml() : "") + this.renderActSection(view) + this.renderBestSection(view) + this.renderIncidentSection(view) + this.renderLoopSection(view) + this.renderEchoSection(view);
    }
    renderRecordsTab() {
      if (!this.active) return;
      let root = this.deps.document.getElementById("ui-records-body");
      if (!root) return;
      let view = typeof this.deps.getRecordsView === "function" ? this.deps.getRecordsView() : null;
      if (!view) return;
      let html = this.buildRecordsHtml(view);
      this.deps.updateGamePanelMarkup(root, html);
    }
    api() {
      return { renderRecordsTab: this.renderRecordsTab, buildRecordsHtml: this.buildRecordsHtml, formatRecordDuration: this.formatDuration };
    }
    dispose() {
      this.active = false;
    }
  };
  function createRecordsView(deps) {
    const view = new RecordsView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
  }

  // modules/records-ui-classic.mjs
  var recordsView = createRecordsView({
    get i18n() {
      return i18n;
    },
    get _t() {
      return _t;
    },
    get chronicleUi() {
      return chronicleUi;
    },
    get document() {
      return document;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get getRecordsView() {
      return getRecordsView;
    },
    get getZone() {
      return getZone;
    },
    get updateGamePanelMarkup() {
      return updateGamePanelMarkup;
    },
    get weaponMasteryUi() {
      return weaponMasteryUi;
    }
  });
  window.GameModules.recordsView = recordsView;
  safeExposeGlobals({ renderRecordsTab: recordsView.renderRecordsTab, buildRecordsHtml: recordsView.buildRecordsHtml, formatRecordDuration: recordsView.formatRecordDuration });
})();
