// GENERATED from modules/ghost-arena-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/state/ghost-arena.mjs
  var GhostArenaState = class {
    constructor() {
      this.active = true;
      this.epoch = null;
      this.current = {
        loading: false,
        data: null,
        message: "",
        result: null,
        selectedProfile: null,
        friendlyBusy: false,
        friendlyResult: null,
        duel: null,
        duelMode: "",
        userId: null,
        loadedAt: 0,
        failedAt: 0
      };
    }
    /** A new session of the same account also invalidates responses from its earlier login. */
    syncAccount(context) {
      if (this.current.userId === context.userId && this.epoch === context.epoch) return false;
      const switched = this.epoch !== null;
      this.epoch = context.epoch;
      this.current.userId = context.userId;
      if (!switched) return false;
      Object.assign(this.current, {
        loading: false,
        friendlyBusy: false,
        data: null,
        message: "",
        result: null,
        selectedProfile: null,
        friendlyResult: null,
        duel: null,
        duelMode: "",
        loadedAt: 0,
        failedAt: 0
      });
      return true;
    }
    serverReady() {
      return Number(this.current.data && this.current.data.combatProtocolVersion) >= 4;
    }
    loadDue(now = Date.now()) {
      if (this.current.loading || this.current.friendlyBusy) return false;
      if (this.current.failedAt && now - this.current.failedAt < 3e4) return false;
      return !this.current.data || now - this.current.loadedAt > 6e4;
    }
    dispose() {
      this.active = false;
      this.current.loading = false;
      this.current.friendlyBusy = false;
    }
  };

  // modules/ui/ghost-arena-view.mjs
  var GhostArenaView = class {
    constructor(deps2, owner2) {
      this.deps = deps2;
      this.owner = owner2;
      this.createdStyle = null;
    }
    ghostArenaEscape(value) {
      return typeof this.deps.escapeHTML === "function" ? (0, this.deps.escapeHTML)(String(value == null ? "" : value)) : String(value == null ? "" : value);
    }
    renderProfileGhostResult(result) {
      if (!result) return "";
      let labels = { win: "승리", loss: "패배", draw: "무승부" };
      let tone = result.result === "win" ? "win" : result.result === "loss" ? "loss" : "draw";
      return `<div class="ghost-result ${tone}" data-ghost-duel-result><strong>${(0, this.deps._t)("친선전 {labels}", { labels: labels[result.result] || result.result })}</strong><span>${(0, this.deps._t)("{opponent}, 레이팅 변동 없음", { opponent: this.ghostArenaEscape(result.opponent) })}</span></div>`;
    }
    renderGhostResult(result) {
      if (!result) return "";
      let labels = { win: "승리", loss: "패배", draw: "무승부" };
      let tone = result.result === "win" ? "win" : result.result === "loss" ? "loss" : "draw";
      let delta = Number(result.ratingDelta) || 0;
      return `<div class="ghost-result ${tone}" data-ghost-duel-result><strong>${labels[result.result] || result.result}</strong>, ${this.ghostArenaEscape(result.opponent)} (${this.ghostArenaEscape(result.opponentSkill)})<span>${(0, this.deps._t)("레이팅 {ratingBefore} → {ratingAfter} ({value}{delta})", { ratingBefore: this.ghostArenaEscape(result.ratingBefore), ratingAfter: this.ghostArenaEscape(result.ratingAfter), value: delta >= 0 ? "+" : "", delta })}</span></div>`;
    }
    renderGhostReviewNotice(data) {
      return data && data.underReview === true ? '<p class="ghost-error">검토 중인 고스트: 순위전 점수가 멈춰 있습니다.</p>' : "";
    }
    renderGhostLeaderboard(rows) {
      if (!rows.length) return '<p class="ghost-empty">등록된 고스트가 없습니다.</p>';
      return `<div class="ghost-board">${rows.slice(0, 10).map((row) => `<div class="ghost-rank"><b>${row.rank}</b><span>${this.ghostArenaEscape(row.nickname)}<small>${this.ghostArenaEscape((0, this.deps.socialClassLabel)(row.ascend_class))}, ${this.ghostArenaEscape(row.active_skill)}</small></span><strong>${row.rating}${row.provisional ? "*" : ""}</strong><em>${(0, this.deps._t)("{wins}승 {losses}패 {draws}무", { wins: row.wins, losses: row.losses, draws: row.draws })}</em></div>`).join("")}</div>`;
    }
    renderFriendlyGhostChallenge() {
      let selected = this.owner.current.selectedProfile;
      if (!selected) return "";
      let disabled = this.owner.current.friendlyBusy || this.owner.current.loading || !this.owner.serverReady();
      return `<section class="ghost-friendly"><div><small>${(0, this.deps._t)("친선전 상대")}</small><strong>${this.ghostArenaEscape(selected.nickname)}</strong><span>${(0, this.deps._t)("레이팅과 전적은 변하지 않습니다.")}</span></div><button type="button" onclick="fightSelectedProfileGhost()" ${disabled ? "disabled" : ""}>${this.owner.current.friendlyBusy ? (0, this.deps._t)("대결 중…") : (0, this.deps._t)("친선 대결 시작")}</button></section>`;
    }
    renderActiveGhostDuel() {
      return this.owner.current.duel ? '<button type="button" class="ghost-replay" onclick="playGhostDuel()">무대에서 다시 보기</button>' : "";
    }
    renderGhostArenaRetry() {
      return this.owner.current.failedAt && !this.owner.current.data && !this.owner.current.loading ? '<button type="button" class="ghost-retry" onclick="loadGhostArena()">다시 불러오기</button>' : "";
    }
    renderActiveGhostResult() {
      if (this.owner.current.duelMode === "friendly") return this.renderProfileGhostResult(this.owner.current.friendlyResult);
      if (this.owner.current.duelMode === "ranked") return this.renderGhostResult(this.owner.current.result);
      return "";
    }
    updateGhostArenaMarkup(host, html) {
      if (host.__ghostArenaHtml === html) return false;
      host.innerHTML = html;
      host.__ghostArenaHtml = html;
      return true;
    }
    renderGhostArena() {
      let host = this.deps.document.getElementById("map-ghost-arena");
      if (!host) return false;
      if (!(0, this.deps.socialCloudReady)()) {
        this.updateGhostArenaMarkup(host, `<section class="ghost-arena"><header><div><strong>${(0, this.deps._t)("고스트 대결")}</strong><small>${(0, this.deps._t)("보상 없음, 점수는 서버가 판정")}</small></div></header><p class="ghost-help">${(0, this.deps._t)("대전은 클라우드 로그인이 필요합니다. 로그인한 뒤 다시 열어주세요.")}</p><button type="button" onclick="openStartupGate({ accountOnly: true })">${(0, this.deps._t)("로그인 화면 열기")}</button></section>`);
        return true;
      }
      const data = this.owner.current.data || {};
      this.updateGhostArenaMarkup(host, this.arenaMarkup(data));
      return true;
    }
    toolbar(me) {
      const serverReady = this.owner.serverReady();
      const blocked = this.owner.current.loading || this.owner.current.friendlyBusy || !serverReady;
      let status = me ? `<span>${(0, this.deps._t)("내 레이팅")} <strong>${me.rating}</strong>${(0, this.deps._t)(", {wins}승 {losses}패 {draws}무{value}", { wins: me.wins, losses: me.losses, draws: me.draws, value: me.matches < 10 ? (0, this.deps._t)(", 배치 중") : "" })}</span>` : "<span>등록된 고스트 없음</span>";
      return `<div class="ghost-toolbar">${status}<button onclick="registerMyGhost()" ${blocked ? "disabled" : ""}>${me ? (0, this.deps._t)("고스트 갱신") : (0, this.deps._t)("고스트 등록")}</button><button onclick="fightRandomGhost()" ${!me || blocked ? "disabled" : ""}>${(0, this.deps._t)("상대 찾기")}</button></div>`;
    }
    arenaMarkup(data) {
      const me = data.me, serverReady = this.owner.serverReady();
      let visibleMessage = this.owner.current.message || (!serverReady && me ? "고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요." : "");
      let html = `<section class="ghost-arena"><header><div><strong>${(0, this.deps._t)("고스트 실전투")}</strong><small>${(0, this.deps._t)("보상 없음, 점수는 서버 모의 전투로 판정")}</small></div></header>${this.toolbar(data.me)}<p class="ghost-help">${(0, this.deps._t)("등록 시 현재 세팅을 즉시 반영합니다. 대전 간 20초, 랭크 20회/24시간, 친선 30회/24시간 제한이 서버에서 적용됩니다.")}</p>${visibleMessage ? `<p class="ghost-error">${this.ghostArenaEscape(visibleMessage)}</p>` : ""}${this.renderGhostReviewNotice(data)}${this.renderGhostArenaRetry()}${this.renderFriendlyGhostChallenge()}${this.renderActiveGhostResult()}${this.renderActiveGhostDuel()}${this.renderGhostLeaderboard(Array.isArray(data.leaderboard) ? data.leaderboard : [])}</section>`;
      return html;
    }
    injectGhostArenaStyles() {
      if (this.deps.document.getElementById("ghost-arena-styles")) return;
      let style = this.deps.document.createElement("style");
      style.id = "ghost-arena-styles";
      style.textContent = `@layer components{.map-pvp-heading{display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:12px}.map-pvp-heading span{color:#a999d0;font-size:12px;font-weight:800;letter-spacing:.14em}.map-pvp-heading h2{margin:2px 0 0}.map-pvp-heading p{max-width:520px;margin:0;color:#9eabc0;font-size:12px}.ghost-arena{margin:8px 0;border:1px solid #4b3d72;border-radius:9px;background:linear-gradient(145deg,#17162a,#101827);overflow:hidden}.ghost-arena>header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid #342d50;background:rgba(39,31,65,.62);color:#e3d8ff}.ghost-arena>header div{display:flex;align-items:baseline;gap:8px}.ghost-arena>header small{color:#9e96b8;font-weight:500}.ghost-toolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:12px 10px 8px}.ghost-toolbar>span{margin-right:auto;color:#d9e7f8}.ghost-help{margin:0 10px 10px;color:#9eabc0;font-size:12px}.ghost-arena>button{margin:0 10px 10px}.ghost-error{margin:0 10px 8px;color:#ff9b9b}.ghost-retry,.ghost-replay{margin:0 10px 10px}.ghost-friendly{display:flex;align-items:center;gap:12px;margin:0 10px 10px;padding:10px;border:1px solid #4a5477;border-radius:8px;background:#18243a}.ghost-friendly>div{display:flex;flex-direction:column;gap:2px;margin-right:auto}.ghost-friendly small,.ghost-friendly span{color:#9eabc0;font-size:12px}.ghost-friendly strong{color:#f0e8ff}.ghost-result{display:flex;gap:7px;flex-wrap:wrap;margin:0 10px 8px;padding:8px;border-radius:7px;background:#172238}.ghost-result:empty{display:none}.ghost-result span{margin-left:auto}.ghost-result.win strong{color:#7ee4a1}.ghost-result.loss strong{color:#ff8f8f}.ghost-result.draw strong{color:#e5d080}.ghost-board{display:grid;gap:4px;padding:0 10px 10px}.ghost-rank{display:grid;grid-template-columns:28px minmax(120px,1fr) 58px 92px;gap:7px;align-items:center;padding:6px 8px;border:1px solid #283b56;border-radius:6px;background:#111d2d}.ghost-rank>b{color:#c9a8ff}.ghost-rank span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ghost-rank small{display:block;color:#94a7bf;overflow:hidden;text-overflow:ellipsis}.ghost-rank strong{text-align:right}.ghost-rank em{font-style:normal;color:#aebbd0;font-size:12px;text-align:right}.ghost-empty{padding:0 10px 10px;color:#9eabc0}@media(max-width:640px){.map-pvp-heading{display:block}.map-pvp-heading p{margin-top:6px}.ghost-arena>header div{align-items:flex-start;flex-direction:column;gap:2px}.ghost-friendly{align-items:stretch;flex-direction:column}.ghost-rank{grid-template-columns:24px minmax(100px,1fr) 52px}.ghost-rank em{display:none}}}`;
      this.deps.document.head.appendChild(style);
      this.createdStyle = style;
    }
    dispose() {
      this.createdStyle?.remove();
      this.createdStyle = null;
    }
  };

  // modules/common/ghost-arena-error.mjs
  function getGhostArenaError(error) {
    let message = String(error && error.message || error);
    let texts = [
      [/GHOST_SNAPSHOT_UNAVAILABLE|INVALID_GHOST_SNAPSHOT/, "현재 세팅의 전투 능력치를 불러오지 못했습니다."],
      [/GHOST_ACCOUNT_HELD/, "운영 검토 중인 계정이라 고스트 대결에 참여할 수 없습니다."],
      [/GHOST_SNAPSHOT_IMPLAUSIBLE/, "게임에서 나올 수 없는 수치라 서버가 고스트 등록을 거절했습니다."],
      [/GHOST_OPPONENT_NOT_FOUND/, "대결 가능한 상대가 아직 없습니다."],
      [/GHOST_TARGET_NOT_REGISTERED/, "상대가 현재 버전의 고스트를 등록하지 않았습니다."],
      [/GHOST_REGISTRATION_REQUIRED/, "먼저 내 고스트를 등록하세요."],
      [/GHOST_REGISTRATION_COOLDOWN/, "고스트는 5분마다 한 번 갱신할 수 있습니다."],
      [/GHOST_DUEL_COOLDOWN/, "대전 시작 후 20초가 지나야 다시 대전할 수 있습니다."],
      [/GHOST_FRIENDLY_TARGET_LIMIT/, "최근 24시간 동안 이 상대와 친선전 10회를 모두 진행했습니다."],
      [/GHOST_FRIENDLY_DAILY_LIMIT/, "최근 24시간의 친선전 한도 30회를 모두 사용했습니다."],
      [/GHOST_DAILY_LIMIT/, "최근 24시간의 랭크 대전 한도 20회를 모두 사용했습니다."],
      [/NICKNAME_REQUIRED/, "먼저 커뮤니티 닉네임을 설정하세요."],
      [/schema cache|could not find|does not exist/i, "고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요."]
    ];
    let match = texts.find(([pattern]) => pattern.test(message));
    return match ? match[1] : message;
  }

  // modules/application/ghost-arena.mjs
  var GhostArena = class {
    constructor(deps2, owner2, view2, session2) {
      this.deps = deps2;
      this.owner = owner2;
      this.view = view2;
      this.session = session2;
      this.onReady = () => this.injectGhostArenaStyles();
      this.installed = false;
    }
    prepare() {
      const context = this.session.capture();
      if (this.owner.syncAccount(context)) this.deps.ghostDuelStage.stop();
      return context;
    }
    busy() {
      return this.owner.current.loading || this.owner.current.friendlyBusy;
    }
    renderGhostArena() {
      if (!this.owner.active) return;
      this.prepare();
      if (!this.view.renderGhostArena()) return;
      if (this.deps.socialCloudReady() && this.owner.loadDue()) {
        this.loadGhostArena().catch((error) => this.deps.console.error("ghost arena rendering failed:", error));
      }
    }
    async loadGhostArena() {
      if (!this.owner.active || !this.deps.socialCloudReady()) return;
      const context = this.prepare();
      if (this.busy()) return;
      const state = this.owner.current;
      state.loading = true;
      this.view.renderGhostArena();
      try {
        const data = await this.session.request(context, "/rest/v1/rpc/get_ghost_arena", {
          method: "POST",
          body: { p_combat_version: this.deps.getGhostCombatVersion() }
        });
        this.session.assertCurrent(context);
        state.data = data;
        state.message = this.owner.serverReady() ? "" : "고스트 대결 서버를 준비 중입니다. 잠시 후 다시 시도해주세요.";
        state.loadedAt = Date.now();
        state.failedAt = 0;
      } catch (error) {
        if (this.session.current(context)) {
          state.message = getGhostArenaError(error);
          state.failedAt = Date.now();
        }
      } finally {
        if (this.session.current(context)) {
          state.loading = false;
          this.view.renderGhostArena();
        }
      }
    }
    async registerMyGhost() {
      if (!this.owner.active) return;
      const context = this.prepare();
      if (!this.deps.socialCloudReady()) return this.deps.showGameToast(this.deps._t("클라우드 로그인이 필요합니다."), "warning");
      if (!this.owner.serverReady()) return this.deps.showGameToast(this.deps._t("고스트 실전투 DB 업데이트가 필요합니다."), "warning");
      if (this.busy()) return;
      const character = this.deps.game, state = this.owner.current;
      state.loading = true;
      state.message = "";
      this.view.renderGhostArena();
      try {
        if (!await this.prepareNickname(context)) return;
        const snapshot = this.registrationSnapshot(character);
        await this.deps.uploadPlayerProfile({ required: true });
        this.session.assertCurrent(context);
        if (this.deps.game !== character) throw new Error("GHOST_SNAPSHOT_UNAVAILABLE");
        await this.session.request(context, "/rest/v1/rpc/register_my_ghost", {
          method: "POST",
          body: { p_combat_version: this.deps.getGhostCombatVersion(), p_snapshot: snapshot }
        });
        this.session.assertCurrent(context);
        state.result = null;
        state.duel = null;
        this.deps.showGameToast(this.deps._t("현재 세팅으로 고스트를 등록했습니다."), "success");
      } catch (error) {
        if (this.session.current(context)) state.message = getGhostArenaError(error);
      } finally {
        await this.finishRanked(context);
      }
    }
    async prepareNickname(context) {
      await this.deps.restoreNicknameFromServer();
      this.session.assertCurrent(context);
      if (!this.deps.getMyNickname()) await this.deps.promptAndSetNickname();
      this.session.assertCurrent(context);
      return !!this.deps.getMyNickname();
    }
    registrationSnapshot(character) {
      if (this.deps.game !== character || typeof this.deps.getGhostCombatSnapshot !== "function") throw new Error("GHOST_SNAPSHOT_UNAVAILABLE");
      return this.deps.getGhostCombatSnapshot();
    }
    async finishRanked(context) {
      if (!this.session.current(context)) return;
      this.owner.current.loading = false;
      await this.loadGhostArena();
    }
    clearDuel() {
      this.owner.current.duel = null;
      this.owner.current.duelMode = "";
      this.deps.ghostDuelStage.stop();
    }
    async fightRandomGhost() {
      if (!this.owner.active || !this.deps.socialCloudReady()) return;
      const context = this.prepare();
      if (this.busy() || !this.owner.serverReady()) return;
      const state = this.owner.current;
      state.loading = true;
      state.message = "";
      state.result = null;
      this.clearDuel();
      this.view.renderGhostArena();
      try {
        const result = await this.session.request(context, "/rest/v1/rpc/fight_ghost", {
          method: "POST",
          body: { p_combat_version: this.deps.getGhostCombatVersion() }
        });
        this.session.assertCurrent(context);
        state.result = result;
        this.applyDuel(result, "ranked");
      } catch (error) {
        if (this.session.current(context)) state.message = getGhostArenaError(error);
      } finally {
        await this.finishRanked(context);
      }
    }
    fightCurrentProfileGhost() {
      if (!this.owner.active) return;
      const targetId = this.deps.socialState.currentProfileUserId;
      if (!targetId || targetId === this.deps.socialLoggedInUserId()) return;
      const profile = this.deps.socialState.currentProfile || {};
      this.prepare();
      this.owner.current.selectedProfile = { userId: String(targetId), nickname: String(profile.nickname || "선택한 플레이어") };
      this.owner.current.friendlyResult = null;
      this.clearDuel();
      this.deps.closePlayerProfile();
      this.deps.switchTab("tab-map", { keepWindowOpen: true });
      this.deps.switchMapSubtab("map-tab-pvp");
      this.renderGhostArena();
    }
    async fightSelectedProfileGhost() {
      if (!this.owner.active || !this.deps.socialCloudReady()) return;
      const context = this.prepare(), state = this.owner.current, selected = state.selectedProfile;
      if (!selected || this.busy() || !this.owner.serverReady()) return;
      state.friendlyBusy = true;
      state.friendlyResult = null;
      state.message = "";
      this.clearDuel();
      this.view.renderGhostArena();
      return this.performFriendlyFight(context, selected);
    }
    async performFriendlyFight(context, selected) {
      const state = this.owner.current;
      try {
        const result = await this.session.request(context, "/rest/v1/rpc/fight_ghost_target", {
          method: "POST",
          body: { p_target_user_id: selected.userId, p_combat_version: this.deps.getGhostCombatVersion() }
        });
        this.session.assertCurrent(context);
        if (state.selectedProfile !== selected) return;
        state.friendlyResult = result || {};
        this.applyDuel(result, "friendly");
      } catch (error) {
        if (this.session.current(context) && state.selectedProfile === selected) state.message = getGhostArenaError(error);
      } finally {
        if (this.session.current(context)) {
          state.friendlyBusy = false;
          this.view.renderGhostArena();
        }
      }
    }
    applyDuel(result, mode) {
      this.owner.current.duel = result && result.duel || null;
      this.owner.current.duelMode = mode;
      this.playGhostDuel();
    }
    playGhostDuel() {
      if (!this.owner.active) return;
      this.prepare();
      const state = this.owner.current;
      if (!state.duel) return;
      const result = state.duelMode === "ranked" ? state.result : state.friendlyResult;
      this.deps.ghostDuelStage.play(state.duel, { mode: state.duelMode, result });
    }
    injectGhostArenaStyles() {
      if (this.owner.active) this.view.injectGhostArenaStyles();
    }
    install() {
      if (this.installed || !this.owner.active) return;
      this.installed = true;
      if (this.deps.document.readyState === "loading") this.deps.document.addEventListener("DOMContentLoaded", this.onReady, { once: true });
      else this.injectGhostArenaStyles();
    }
    dispose() {
      if (!this.owner.active) return;
      this.owner.dispose();
      this.deps.document.removeEventListener("DOMContentLoaded", this.onReady);
      this.deps.ghostDuelStage.stop();
      this.view.dispose();
    }
  };

  // modules/application/cloud-account-request.mjs
  var CloudAccountRequest = class {
    constructor(owner2, state, request) {
      this.owner = owner2;
      this.state = state;
      this.send = request;
    }
    capture() {
      return { userId: this.owner.userId(), epoch: this.owner.current.sessionEpoch };
    }
    current(context) {
      return this.state.active && this.owner.isCurrentAccount(context.userId, context.epoch);
    }
    assertCurrent(context) {
      if (!this.current(context)) throw new Error("로그인 계정이 변경되어 작업을 중단했습니다.");
    }
    async request(context, path, options) {
      this.assertCurrent(context);
      const result = await this.send(path, { ...options, expectedUserId: context.userId, expectedSessionEpoch: context.epoch });
      this.assertCurrent(context);
      return result;
    }
  };

  // modules/ghost-arena-ui-classic.mjs
  var deps = {
    get _t() {
      return _t;
    },
    get closePlayerProfile() {
      return closePlayerProfile;
    },
    get console() {
      return console;
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
    get getGhostCombatSnapshot() {
      return typeof getGhostCombatSnapshot === "undefined" ? void 0 : getGhostCombatSnapshot;
    },
    get getGhostCombatVersion() {
      return getGhostCombatVersion;
    },
    get getMyNickname() {
      return getMyNickname;
    },
    get ghostDuelStage() {
      return ghostDuelStage;
    },
    get promptAndSetNickname() {
      return promptAndSetNickname;
    },
    get restoreNicknameFromServer() {
      return restoreNicknameFromServer;
    },
    get showGameToast() {
      return showGameToast;
    },
    get socialClassLabel() {
      return socialClassLabel;
    },
    get socialCloudReady() {
      return socialCloudReady;
    },
    get socialLoggedInUserId() {
      return socialLoggedInUserId;
    },
    get socialState() {
      return socialState;
    },
    get switchMapSubtab() {
      return switchMapSubtab;
    },
    get switchTab() {
      return switchTab;
    },
    get uploadPlayerProfile() {
      return uploadPlayerProfile;
    }
  };
  var owner = new GhostArenaState();
  var view = new GhostArenaView(deps, owner);
  var session = new CloudAccountRequest(window.GameModules.cloudAccountState, owner, (path, options) => cloudJsonRequest(path, options));
  var arena = new GhostArena(deps, owner, view, session);
  window.GameModules.ghostArena = Object.freeze({
    dispose: () => arena.dispose(),
    loadGhostArena: arena.loadGhostArena.bind(arena),
    registerMyGhost: arena.registerMyGhost.bind(arena),
    fightRandomGhost: arena.fightRandomGhost.bind(arena),
    fightCurrentProfileGhost: arena.fightCurrentProfileGhost.bind(arena),
    fightSelectedProfileGhost: arena.fightSelectedProfileGhost.bind(arena),
    playGhostDuel: arena.playGhostDuel.bind(arena),
    renderGhostArena: arena.renderGhostArena.bind(arena),
    injectGhostArenaStyles: arena.injectGhostArenaStyles.bind(arena)
  });
  safeExposeGlobals({
    loadGhostArena: window.GameModules.ghostArena.loadGhostArena,
    registerMyGhost: window.GameModules.ghostArena.registerMyGhost,
    fightRandomGhost: window.GameModules.ghostArena.fightRandomGhost,
    fightCurrentProfileGhost: window.GameModules.ghostArena.fightCurrentProfileGhost,
    fightSelectedProfileGhost: window.GameModules.ghostArena.fightSelectedProfileGhost,
    playGhostDuel: window.GameModules.ghostArena.playGhostDuel,
    renderGhostArena: window.GameModules.ghostArena.renderGhostArena,
    injectGhostArenaStyles: window.GameModules.ghostArena.injectGhostArenaStyles
  });
  arena.install();
})();
