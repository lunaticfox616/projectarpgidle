// GENERATED from modules/away-settlement-ui*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowCancelAnimationFrame = (...args) => globalThis.cancelAnimationFrame(...args);
  var windowClearTimeout = (...args) => globalThis.clearTimeout(...args);
  var windowRequestAnimationFrame = (...args) => globalThis.requestAnimationFrame(...args);
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/domain/away-progress.mjs
  function awayProgressLimits(getConfig, state) {
    const config = getConfig(state);
    return { ...config, effectiveLimitMs: Math.max(0, Number(config.effectiveLimitMs) || 0) };
  }
  function calculateBackgroundProgressMs(actualElapsedMs, minRealMs, rate, maxProgressMs) {
    const elapsed = Math.max(0, Number.isFinite(actualElapsedMs) ? actualElapsedMs : 0);
    const minElapsed = Math.max(0, Number.isFinite(minRealMs) ? minRealMs : 0);
    if (elapsed < minElapsed) return 0;
    const progress = elapsed * Math.max(0, Number.isFinite(rate) ? rate : 0);
    return Math.max(0, Math.floor(Math.min(progress, Math.max(0, Number.isFinite(maxProgressMs) ? maxProgressMs : 0))));
  }
  function getBackgroundCombatSignature(state) {
    if (!state || typeof state !== "object") return "";
    return [state.currentZoneId, state.inTicketBossFight ? 1 : 0, state.pendingLoopDecision ? 1 : 0, state.pendingLoopReady ? 1 : 0].join("|");
  }
  function offlineCombatEligible(state) {
    if (!state || typeof state !== "object" || !state.heroSelectionInitialized) return false;
    if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
    if ((Number(state.playerHp) || 0) <= 0) return false;
    return state.currentZoneId !== void 0 && state.currentZoneId !== null;
  }

  // modules/application/away-pause-gate.mjs
  var AwayPauseGate = class {
    constructor(owner2, deps2) {
      this.owner = owner2;
      this.deps = deps2;
      this.memo = { at: -Infinity, open: false };
    }
    heroHeld() {
      if (typeof this.deps.actTitleCard === "object" && this.deps.actTitleCard.greeting()) return true;
      return typeof this.deps.ghostDuelStage === "object" && this.deps.ghostDuelStage.playing();
    }
    blockingScreen() {
      if (this.deps.isStartupOverlayOpen()) return true;
      if (typeof this.deps.isLoadingOverlayOpen === "function" && this.deps.isLoadingOverlayOpen()) return true;
      if (typeof this.deps.isRewardOpen === "function" && this.deps.isRewardOpen()) return true;
      return typeof this.deps.isLoopHeroSelectOpen === "function" && this.deps.isLoopHeroSelectOpen();
    }
    overlayOpen() {
      const now = this.deps.performance.now();
      if (now - this.memo.at >= 16 || now < this.memo.at) Object.assign(this.memo, { at: now, open: this.deps.isPauseSettingOverlayOpen() });
      return this.memo.open;
    }
    unstarted() {
      if (typeof this.deps.gameplayStarted !== "undefined" && !this.deps.gameplayStarted) return true;
      const game = this.owner.game;
      return !!game && !game.heroSelectionInitialized;
    }
    paused() {
      if (this.unstarted()) return true;
      if (this.blockingScreen()) return true;
      if (this.deps.actExplorationUi.departurePending() || this.deps.sideEncounterUi.withdrawalPending() || this.heroHeld()) return true;
      if (!this.owner.game?.settings?.pauseGameOnOverlay) return false;
      return !!(this.deps.isTutorialPausingCombat() || this.overlayOpen());
    }
    eligible(state) {
      if (!state || typeof state !== "object" || this.paused()) return false;
      if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
      if ((Number(state.playerHp) || 0) <= 0) return false;
      return this.hasWork(state);
    }
    hasWork(state) {
      if (Array.isArray(state.enemies) && state.enemies.some((enemy) => enemy && enemy.hp > 0)) return true;
      if (Number(state.moveTimer) > 0) return true;
      if (Array.isArray(state.encounterPlan) && state.encounterPlan.length > 0) return true;
      return !!this.deps.actExplorationState.current(state) && !this.deps.actExplorationProgress.waiting(state);
    }
  };

  // modules/application/away-rewards.mjs
  function rarityCounts(list) {
    const counts = {};
    for (const item of Array.isArray(list) ? list : []) {
      if (item && item.rarity) counts[item.rarity] = (counts[item.rarity] || 0) + 1;
    }
    return counts;
  }
  function uniqueNames(list) {
    return (Array.isArray(list) ? list : []).filter((item) => item && item.rarity === "unique").map((item) => item.name);
  }
  function inventoryGains(before, after) {
    const first = rarityCounts(before.inventory), last = rarityCounts(after.inventory), rarityGains = {};
    for (const rarity of Object.keys(last)) {
      const gain = last[rarity] - (first[rarity] || 0);
      if (gain > 0) rarityGains[rarity] = gain;
    }
    const previous = uniqueNames(before.inventory);
    const names = uniqueNames(after.inventory).filter((name) => {
      const index = previous.indexOf(name);
      if (index < 0) return true;
      previous.splice(index, 1);
      return false;
    });
    return {
      rarityGains,
      uniqueNames: names,
      items: Math.max(0, (Array.isArray(after.inventory) ? after.inventory.length : 0) - (Array.isArray(before.inventory) ? before.inventory.length : 0))
    };
  }
  function backgroundAtlasGains(memoryLeaves2, beforeState, afterState) {
    const before = beforeState && beforeState.atlas, after = afterState && afterState.atlas;
    if (!before || !after || !after.tally || typeof memoryLeaves2 !== "object") return null;
    const tally = (key) => Math.max(0, (Number(after.tally[key]) || 0) - (Number((before.tally || {})[key]) || 0));
    const leaves = memoryLeaves2.gainedBetween(before.leaves, after.leaves);
    const gains = { maps: tally("maps"), treasure: tally("treasure"), golden: tally("golden"), leaves: leaves.total, newLeaves: leaves.fresh };
    return gains.maps || gains.treasure || gains.leaves ? gains : null;
  }
  function currencyGains(deps2, before, after) {
    const first = before.currencies || {}, last = after.currencies || {}, currencies = [];
    for (const key of Object.keys(last)) {
      const gain = Math.floor((last[key] || 0) - (first[key] || 0));
      if (gain > 0) currencies.push({ key, name: deps2.getCurrencyInfo(key).name, gain });
    }
    return currencies;
  }
  function combatGains(deps2, before, after, metrics) {
    return {
      kills: metrics ? metrics.kills : Math.max(0, Math.floor((after.loopKills || 0) - (before.loopKills || 0))),
      exp: metrics ? metrics.exp : Math.max(0, deps2.getBackgroundTotalExperience(after) - deps2.getBackgroundTotalExperience(before)),
      expLost: metrics ? metrics.expLost : 0,
      deaths: metrics ? metrics.deaths : Math.max(0, Math.floor((after.loopDeaths || 0) - (before.loopDeaths || 0)))
    };
  }
  function backgroundRewardSummary(deps2, before, after, metrics, overflowSalvaged) {
    return {
      ...combatGains(deps2, before, after, metrics),
      ...inventoryGains(before, after),
      currencies: currencyGains(deps2, before, after),
      highlights: deps2.equipmentLootPolicy.collectHighlights(before, after),
      overflowSalvaged: Math.max(0, Math.floor(Number(overflowSalvaged) || 0)),
      masteryGains: typeof deps2.weaponMastery === "object" && before && after ? deps2.weaponMastery.gains(before, after) : [],
      knitting: deps2.knitting.gainedBetween(before.knitting, after.knitting),
      atlas: backgroundAtlasGains(deps2.memoryLeaves, before, after)
    };
  }

  // modules/application/away-settlement.mjs
  var MIN_REAL_MS = 60 * 1e3;
  var AwaySettlement = class {
    constructor(owner2, deps2, view2) {
      this.owner = owner2;
      this.deps = deps2;
      this.view = view2;
      this.pause = new AwayPauseGate(owner2, deps2);
      this.active = true;
    }
    get runtime() {
      return this.deps.backgroundCombatRuntime;
    }
    record(nowMs) {
      this.deps.window.playerGuideUi?.dismissReplay();
      const rt = this.runtime;
      if (!this.active || rt.processing || rt.failed || !this.deps.gameplayStarted) return;
      rt.hiddenAtMs = Number.isFinite(nowMs) ? nowMs : Date.now();
      rt.signature = getBackgroundCombatSignature(this.owner.game);
      rt.snapshot = this.pause.eligible(this.owner.game) ? this.deps.cloneBackgroundCombatState(this.owner.game) : null;
    }
    recordOffline(nowMs) {
      const game = this.owner.game, rt = this.runtime, savedAt = Math.max(0, Math.floor(Number(game.saveMeta.playedUntil) || 0));
      rt.launchSettlementPending = false;
      const now = Number.isFinite(nowMs) ? nowMs : Date.now(), key = this.deps.getSaveSlot().key;
      if (rt.offlineSettledSlots.includes(key) || savedAt <= 0 || now <= savedAt) return false;
      rt.offlineSettledSlots.push(key);
      rt.signature = getBackgroundCombatSignature(game);
      rt.snapshot = offlineCombatEligible(game) ? this.deps.cloneBackgroundCombatState(game) : null;
      rt.hiddenAtMs = rt.snapshot ? savedAt : 0;
      return !!rt.snapshot;
    }
    mayApply(signature) {
      const game = this.owner.game;
      return getBackgroundCombatSignature(game) === signature && !(game.pendingLoopDecision || game.pendingLoopReady);
    }
    commit(result, expectedGame) {
      if (this.owner.game !== expectedGame) throw new Error("정산 중 저장 계정 또는 게임 상태가 변경되었습니다.");
      const candidate = this.deps.mergeDefaults(result.game), rt = this.runtime;
      candidate.saveMeta = { ...expectedGame.saveMeta };
      candidate.settings.mapCompleteAction = expectedGame.settings.mapCompleteAction;
      this.deps.yieldTutorialCardToResult();
      this.owner.game = candidate;
      rt.processing = false;
      const awaySince = rt.hiddenAtMs;
      rt.hiddenAtMs = 0;
      try {
        this.deps.contentUnlockUi.announceSettledUnlocks(expectedGame);
        if (!this.deps.persistLocalSave({ allowRecoveryWrite: this.deps.getLocalSaveStatus().status === "write-failed" })) throw new Error("방치 보상 저장에 실패했습니다. 이전 진행은 유지됩니다.");
        this.deps.restoreCombatRuntime(result.runtime);
        rt.snapshot = null;
        rt.signature = "";
      } catch (error) {
        this.owner.game = expectedGame;
        this.owner.tutorials.sync(expectedGame);
        rt.hiddenAtMs = awaySince;
        throw error;
      }
      if (this.deps.document.hidden || rt.appInactive) this.record(Date.now());
    }
    begin(nowMs) {
      const rt = this.runtime;
      if (!this.active || rt.processing || rt.appInactive || this.deps.document.hidden) return null;
      const snapshot = rt.snapshot, original = this.owner.game, startedAtMs = rt.hiddenAtMs;
      const actualElapsedMs = Math.max(0, nowMs - startedAtMs), limits = awayProgressLimits(this.deps.getOfflineProgressConfig, snapshot || original);
      const effectiveProgressMs = calculateBackgroundProgressMs(actualElapsedMs, MIN_REAL_MS, limits.efficiencyRate, limits.effectiveLimitMs);
      if (!snapshot || effectiveProgressMs <= 0) {
        rt.snapshot = null;
        rt.hiddenAtMs = 0;
        return null;
      }
      rt.processing = true;
      rt.failed = false;
      rt.accelerationTier = 0;
      rt.finishRequested = false;
      return { snapshot, original, startedAtMs, actualElapsedMs, limits, effectiveProgressMs, committed: false };
    }
    simulate(run) {
      return this.deps.simulateBackgroundCombatChunked({
        elapsedMs: run.effectiveProgressMs,
        snapshot: run.snapshot,
        startNowMs: run.startedAtMs,
        project: true,
        isCancelled: () => !this.active,
        isPaused: () => this.deps.document.hidden || this.runtime.appInactive,
        getElapsedMs: () => {
          run.actualElapsedMs = Math.max(run.actualElapsedMs, Date.now() - run.startedAtMs);
          return calculateBackgroundProgressMs(run.actualElapsedMs, MIN_REAL_MS, run.limits.efficiencyRate, run.limits.effectiveLimitMs);
        },
        getControl: () => ({ tier: this.runtime.accelerationTier, finish: this.runtime.finishRequested }),
        onProgress: (done, total, skipped, phase) => this.view.updateBackgroundProgressOverlay(done, total, run.actualElapsedMs, skipped, phase)
      });
    }
    async presentResult(run, result, summary) {
      const total = result.processedMs + result.skippedMs;
      this.view.updateBackgroundProgressOverlay(total, total, run.actualElapsedMs, result.skippedMs);
      this.view.complete();
      await this.deps.waitFrame();
      if (!this.active) return;
      this.view.showBackgroundCombatResult({
        actualElapsedMs: run.actualElapsedMs,
        effectiveProgressMs: result.processedMs,
        summary,
        capped: run.actualElapsedMs >= run.limits.recognitionLimitMs,
        limits: run.limits,
        stopped: result.stopped,
        stopReason: result.stopReason,
        skippedMs: result.skippedMs,
        realMs: result.realMs,
        projectedMs: result.projectedMs,
        heldZone: result.heldZone,
        cutMs: result.cutMs
      });
      this.view.restoreBattlefieldBeforeBackgroundReplay();
    }
    async start(nowMs) {
      const run = this.begin(nowMs);
      if (!run) return false;
      this.deps.setBattleFxSuppressed(true);
      try {
        this.view.restoreBattlefieldBeforeBackgroundReplay(false);
        this.view.hideBackgroundProgressOverlay();
        this.view.updateBackgroundProgressOverlay(0, run.effectiveProgressMs, run.actualElapsedMs);
        await this.deps.waitFrame();
        if (!this.active) return false;
        const result = await this.simulate(run);
        if (!this.active) return false;
        if (!this.mayApply(this.runtime.signature)) throw new Error("정산 중 사냥 상태가 변경되었습니다.");
        const summary = backgroundRewardSummary(this.deps, run.snapshot, result.game, result.metrics, result.overflowSalvaged);
        this.commit(result, run.original);
        run.committed = true;
        await this.presentResult(run, result, summary);
        return true;
      } catch (error) {
        if (this.active) this.reportFailure(error, run.committed);
        return run.committed;
      } finally {
        this.runtime.processing = false;
        this.deps.setBattleFxSuppressed(false);
        if (!this.runtime.failed) this.view.hideBackgroundProgressOverlay();
      }
    }
    reportFailure(error, committed) {
      this.deps.console.error("offline combat settlement failed:", error);
      if (committed) {
        this.deps.addLog("방치 보상은 저장되었습니다. 결과 화면을 표시하지 못했습니다: " + error.message, "loot-rare");
        return;
      }
      this.runtime.failed = true;
      this.view.failure(error);
    }
    async startOffline(nowMs) {
      if (!this.active || !this.recordOffline(nowMs)) return false;
      return this.start(nowMs);
    }
    faster(finish = false) {
      const rt = this.runtime;
      if (!this.active || !rt.processing || rt.finishRequested) return;
      rt.finishRequested = finish;
      rt.accelerationTier = Math.min(4, rt.accelerationTier + (finish ? 0 : 1));
      this.view.renderBackgroundSpeedControls(finish);
    }
    visibility() {
      if (!this.active || typeof this.deps.document === "undefined") return;
      if (this.deps.document.hidden) this.record(Date.now());
      else this.start(Date.now());
    }
    dispose() {
      this.active = false;
      this.deps.disposePaint();
      this.view.dispose();
    }
  };

  // modules/ui/away-settlement-view.mjs
  var AwaySettlementView = class {
    constructor(deps2) {
      this.deps = deps2;
      for (const name of ["formatBackgroundMasteryLine", "formatBackgroundDuration", "getBackgroundProgressOverlay", "renderBackgroundSpeedControls", "updateBackgroundProgressOverlay", "backgroundProgressPhaseText", "hideBackgroundProgressOverlay", "updateBackgroundSkippedTime", "formatBackgroundProjection", "formatBackgroundSkippedReward", "formatBackgroundRealLimits", "showBackgroundCombatResult", "renderBackgroundResultHeader", "formatBackgroundResultTime", "renderBackgroundResultTiles", "renderBackgroundResultTile", "renderBackgroundResultLoot", "renderBackgroundResultAtlas", "renderBackgroundResultCurrencies", "renderBackgroundResultCoin", "backgroundResultCurrencyIcon", "renderBackgroundResultGrowth", "renderBackgroundResultNotes", "backgroundNoExpReason", "renderBackgroundStoryLine", "restoreBattlefieldBeforeBackgroundReplay"]) this[name] = this[name].bind(this);
    }
    limits(state) {
      return awayProgressLimits(this.deps.getOfflineProgressConfig, state || this.deps.game);
    }
    formatBackgroundMasteryLine(gains) {
      return typeof this.deps.weaponMasteryUi === "object" ? this.deps.weaponMasteryUi.settlementLine(gains) : "";
    }
    formatBackgroundDuration(ms) {
      let totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1e3));
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor(totalSeconds % 3600 / 60);
      let seconds = totalSeconds % 60;
      if (hours > 0) return minutes > 0 ? this.deps._t("{hours}시간 {minutes}분", { hours, minutes }) : this.deps._t("{hours}시간", { hours });
      if (minutes > 0) return seconds > 0 ? this.deps._t("{minutes}분 {seconds}초", { minutes, seconds }) : this.deps._t("{minutes}분", { minutes });
      return this.deps._t("{seconds}초", { seconds });
    }
    getBackgroundProgressOverlay() {
      if (typeof this.deps.document === "undefined" || !this.deps.document.body) return null;
      let overlay = this.deps.document.getElementById("background-combat-progress-overlay");
      if (overlay) return overlay;
      overlay = this.deps.document.createElement("div");
      overlay.id = "background-combat-progress-overlay";
      overlay.className = "background-combat-progress-overlay";
      overlay.innerHTML = '<div class="background-combat-progress-card" role="dialog" aria-modal="true" aria-label="방치 정산"><h2>방치 정산</h2><div id="background-combat-progress-percent" aria-live="polite">계산 진행 0%</div><div class="background-combat-progress-track" role="progressbar" aria-label="방치 정산 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="background-combat-progress-bar-fill"></div></div><div id="background-combat-progress-duration"></div><div class="background-combat-speed-guide"></div><p id="background-combat-sacrifice">가속할 때마다 남은 전투 시간의 절반과 그 보상 기회를 포기합니다. 이미 계산한 보상은 유지됩니다.</p><p id="background-combat-skipped" aria-live="polite"></p><div class="background-combat-actions"><button type="button" id="background-combat-fast-button" onclick="requestFasterBackgroundCombat()">2배 가속, 남은 시간 ½</button><button type="button" id="background-combat-finish-button" onclick="requestFasterBackgroundCombat(true)">즉시 종료, 남은 시간 포기</button></div></div>';
      this.deps.document.body.appendChild(overlay);
      return overlay;
    }
    renderBackgroundSpeedControls(finish) {
      let button = typeof this.deps.document !== "undefined" ? this.deps.document.getElementById("background-combat-fast-button") : null;
      if (!button) return;
      button.disabled = finish || this.deps.backgroundCombatRuntime.accelerationTier >= 4;
      button.textContent = finish ? this.deps._t("계산한 보상 저장 중…") : this.deps.backgroundCombatRuntime.accelerationTier >= 4 ? "16배 가속 적용됨" : this.deps._t("{value}배 가속, 남은 시간 ½", { value: 2 ** (this.deps.backgroundCombatRuntime.accelerationTier + 1) });
      const stop = this.deps.document.getElementById("background-combat-finish-button");
      if (stop) stop.disabled = finish;
    }
    updateBackgroundProgressOverlay(doneMs, totalMs, actualElapsedMs, skippedMs = 0, phase) {
      let overlay = this.getBackgroundProgressOverlay();
      if (!overlay) return;
      let pct = totalMs > 0 ? Math.max(0, Math.min(100, Math.floor(doneMs / totalMs * 1e3) / 10)) : 100;
      const signature = `${pct}:${skippedMs}:${phase}`;
      if (overlay.dataset.progressPercent === signature) return;
      overlay.dataset.progressPercent = signature;
      this.updateBackgroundSkippedTime(skippedMs);
      let percent = this.deps.document.getElementById("background-combat-progress-percent");
      let progressBar = this.deps.document.querySelector(".background-combat-progress-track");
      let progressFill = this.deps.document.getElementById("background-combat-progress-bar-fill");
      let duration = this.deps.document.getElementById("background-combat-progress-duration");
      let guide = this.deps.document.querySelector(".background-combat-speed-guide");
      if (percent) percent.textContent = this.deps._t("계산 진행 {pct}%{phase}", { pct, phase: this.backgroundProgressPhaseText(phase) });
      if (progressBar) progressBar.setAttribute("aria-valuenow", String(pct));
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (duration) duration.textContent = this.deps._t("자리 비움 {actualElapsedMs}, 계산 {max}", { actualElapsedMs: this.formatBackgroundDuration(actualElapsedMs), max: this.formatBackgroundDuration(Math.max(0, doneMs - skippedMs)) });
      if (guide) {
        let limits = this.limits(this.deps.game);
        guide.textContent = this.deps._t("진행 한도 {recognitionHours}시간, 효율 {round}%", { recognitionHours: limits.recognitionHours, round: Math.round(limits.efficiencyRate * 100) });
      }
    }
    backgroundProgressPhaseText(phase) {
      return phase === "measure" ? " (전투 속도 재는 중)" : "";
    }
    hideBackgroundProgressOverlay() {
      let overlay = typeof this.deps.document !== "undefined" ? this.deps.document.getElementById("background-combat-progress-overlay") : null;
      if (overlay) overlay.remove();
    }
    updateBackgroundSkippedTime(skippedMs) {
      const skipped = this.deps.document.getElementById("background-combat-skipped");
      if (skipped) skipped.textContent = this.formatBackgroundSkippedReward(skippedMs);
    }
    formatBackgroundProjection(result) {
      if (!(result.projectedMs > 0)) return "";
      return this.deps._t("빠른 계산: 실제 전투 {realMs}의 속도로 나머지 {projectedMs}도 계산했습니다.", { realMs: this.formatBackgroundDuration(result.realMs), projectedMs: this.formatBackgroundDuration(result.projectedMs) });
    }
    formatBackgroundSkippedReward(skippedMs) {
      return skippedMs > 0 ? this.deps._t("포기한 전투 시간 {skippedMs}, 해당 시간 보상 미지급", { skippedMs: this.formatBackgroundDuration(skippedMs) }) : "";
    }
    formatBackgroundRealLimits(result) {
      const minutes = (ms) => Math.round(ms / 6e4);
      return [
        ["info", result.heldZone ? this.deps._t("실제 전투가 {realHoldMs}분을 넘어 그 뒤로는 지금 지역을 반복했습니다.", { realHoldMs: minutes(this.deps.OFFLINE_PROJECTION.realHoldMs) }) : ""],
        ["bad", result.cutMs > 0 ? this.deps._t("빠른 계산을 못 하는 곳이라 실제 전투 {realCapMs}분까지만 계산했고, 남은 {cutMs}의 보상은 없습니다.", { realCapMs: minutes(this.deps.OFFLINE_PROJECTION.realCapMs), cutMs: this.formatBackgroundDuration(result.cutMs) }) : ""]
      ];
    }
    showBackgroundCombatResult(result) {
      if (typeof this.deps.document === "undefined" || !this.deps.document.body) return;
      if (typeof this.deps.yieldTutorialCardToResult === "function") this.deps.yieldTutorialCardToResult();
      this.deps.document.getElementById("background-combat-result-overlay")?.remove();
      const overlay = this.deps.document.createElement("div");
      overlay.id = "background-combat-result-overlay";
      overlay.className = "background-combat-result-overlay";
      const summary = result.summary || {};
      const limits = result.limits || this.limits(this.deps.game);
      const body = this.renderBackgroundStoryLine() + this.renderBackgroundResultTiles(summary) + this.renderBackgroundResultLoot(summary) + this.renderBackgroundResultAtlas(summary.atlas) + this.deps.knittingUi.offlineHtml(summary.knitting) + this.renderBackgroundResultCurrencies(summary.currencies) + this.renderBackgroundResultGrowth(summary) + this.renderBackgroundResultNotes(result, summary, limits);
      const close = "hideItemTooltip();document.getElementById('background-combat-result-overlay').remove()";
      overlay.innerHTML = `<div class="background-combat-result-card" role="dialog" aria-modal="true" aria-labelledby="background-result-title">${this.renderBackgroundResultHeader(result, limits)}<div class="background-result-body">${body}</div><footer><button type="button" onclick="${close};switchTab('tab-items', {keepWindowOpen:true})">${this.deps._t("장비 확인")}</button><button type="button" class="background-result-continue" onclick="${close}">${this.deps._t("계속하기")}</button></footer></div>`;
      this.deps.document.body.appendChild(overlay);
    }
    renderBackgroundResultHeader(result, limits) {
      const away = this.formatBackgroundResultTime(result.actualElapsedMs);
      const fought = this.formatBackgroundResultTime(result.effectiveProgressMs);
      return `<header><h2 id="background-result-title">${this.deps._t("정산 결과")}</h2><p class="background-result-times"><span>${this.deps._t("자리 비움")} <strong>${away}</strong></span><span class="background-result-arrow" aria-hidden="true">→</span><span class="fought">${this.deps._t("전투 진행")} <strong>${fought}</strong></span></p><p class="background-result-formula">${this.deps._t("효율 {round}%, 한도 {recognitionHours}시간.", { round: Math.round(limits.efficiencyRate * 100), recognitionHours: limits.recognitionHours })}</p></header>`;
    }
    formatBackgroundResultTime(ms) {
      const value = Math.max(0, Number(ms) || 0);
      return this.formatBackgroundDuration(value >= 6e4 ? value - value % 6e4 : value);
    }
    renderBackgroundResultTiles(summary) {
      const deaths = Math.max(0, Number(summary.deaths) || 0);
      const lost = Math.max(0, Number(summary.expLost) || 0);
      const best = ["unique", "rare", "magic"].find((rarity) => (summary.rarityGains || {})[rarity] > 0);
      const tiles = [
        { label: this.deps._t("처치"), value: this.deps.formatNumberKR(summary.kills) },
        { label: this.deps._t("경험치"), value: `+${this.deps.formatNumberKR(summary.exp)}`, tone: "exp", note: lost > 0 ? this.deps._t("-{lost} 잃음", { lost: this.deps.formatNumberKR(lost) }) : "" },
        { label: this.deps._t("장비"), value: `+${this.deps.formatNumberKR(summary.items)}`, color: best ? this.deps.getRarityColor(best) : "" },
        { label: this.deps._t("사망"), value: String(deaths), tone: deaths > 0 ? "bad" : "quiet" }
      ];
      return `<div class="background-result-tiles">${tiles.map(this.renderBackgroundResultTile).join("")}</div>`;
    }
    renderBackgroundResultTile(tile) {
      const style = tile.color ? ` style="--tile-tone:${tile.color}"` : "";
      const size = tile.value.length > 9 ? " long" : "";
      return `<div class="background-result-tile ${tile.tone || ""}${size}"${style}><span>${this.deps._t(tile.label)}</span><strong>${tile.value}</strong>${tile.note ? `<small>${this.deps._t(tile.note)}</small>` : ""}</div>`;
    }
    renderBackgroundResultLoot(summary) {
      const gains = summary.rarityGains || {};
      const chips = ["unique", "rare", "magic", "normal"].filter((rarity) => gains[rarity] > 0).map((rarity) => `<span class="background-result-chip" style="--chip-tone:${this.deps.getRarityColor(rarity)}">${this.deps._t(this.deps.ITEM_RARITY_LABELS[rarity])} <b>${gains[rarity]}</b></span>`);
      const salvaged = Math.max(0, Number(summary.overflowSalvaged) || 0);
      if (salvaged > 0) chips.push(`<span class="background-result-chip quiet" data-tip="가방이 차서 해체했습니다. 해체 보상은 재화에 들어 있습니다.">자동해체 <b>${salvaged}</b></span>`);
      const row = chips.length ? `<div class="background-result-chips">${chips.join("")}</div>` : "";
      return row + this.deps.equipmentLootUi.renderHighlights(summary.highlights);
    }
    renderBackgroundResultAtlas(atlas) {
      if (!atlas) return "";
      const chips = [];
      if (atlas.maps) chips.push(`<span class="background-result-chip">지도 <b>${this.deps.formatNumberKR(atlas.maps)}판</b></span>`);
      if (atlas.treasure) chips.push(`<span class="background-result-chip major">보물 무리 <b>${this.deps.formatNumberKR(atlas.treasure)}</b></span>`);
      if (atlas.golden) chips.push(`<span class="background-result-chip jackpot">황금 보물 <b>${this.deps.formatNumberKR(atlas.golden)}</b></span>`);
      if (atlas.leaves) chips.push(`<span class="background-result-chip leaf">${this.deps.renderPixelIcon("leaf", "background-result-leaf")}기억의 잎 <b>+${this.deps.formatNumberKR(atlas.leaves)}</b></span>`);
      (atlas.newLeaves || []).forEach((name) => chips.push(`<span class="background-result-chip leaf new"><em>새 잎</em>${this.deps.escapeHTML(name)}</span>`));
      return `<section class="background-result-section"><h3>${this.deps._t("아틀라스")}</h3><div class="background-result-chips">${chips.join("")}</div></section>`;
    }
    renderBackgroundResultCurrencies(currencies) {
      const rows = (Array.isArray(currencies) ? currencies : []).filter((entry) => entry && entry.gain > 0);
      if (!rows.length) return "";
      const rank = (entry) => this.deps.lootMoments.rank(this.deps.lootMoments.ofCurrency(entry.key));
      const coins = rows.slice().sort((a, b) => rank(b) - rank(a)).map(this.renderBackgroundResultCoin);
      return `<section class="background-result-section"><h3>${this.deps._t("재화")}</h3><div class="background-result-wallet">${coins.join("")}</div></section>`;
    }
    renderBackgroundResultCoin(entry) {
      const moment = this.deps.lootMoments.ofCurrency(entry.key);
      return `<span class="background-result-coin${moment ? ` is-${moment}` : ""}" style="--coin-tone:${this.deps.getCurrencyTone(entry.key)}">${this.backgroundResultCurrencyIcon(entry.key)}<span class="background-result-coin-name">${this.deps.escapeHTML(this.deps._t(entry.name))}</span><b>+${this.deps.formatNumberKR(entry.gain)}</b></span>`;
    }
    backgroundResultCurrencyIcon(key) {
      const icon = this.deps.ORB_DB[key] && this.deps.ORB_DB[key].icon;
      return icon ? `<img class="background-result-icon" src="${icon}" alt="" aria-hidden="true">` : '<i class="background-result-coin-mark" aria-hidden="true"></i>';
    }
    renderBackgroundResultGrowth(summary) {
      const mastery = this.formatBackgroundMasteryLine(summary.masteryGains);
      return mastery ? `<p class="background-result-growth">${mastery}</p>` : "";
    }
    renderBackgroundResultNotes(result, summary, limits) {
      const notes = [
        ["bad", this.formatBackgroundSkippedReward(result.skippedMs - (result.cutMs || 0))],
        ...this.formatBackgroundRealLimits(result),
        ["warn", this.backgroundNoExpReason(summary)],
        ["warn", result.stopped ? "사냥이 멈추거나 선택 창이 열려 여기까지만 진행했습니다." : ""],
        ["warn", result.capped ? this.deps._t("방치 한도 {recognitionHours}시간을 다 채웠습니다.", { recognitionHours: limits.recognitionHours }) : ""],
        ["info", this.formatBackgroundProjection(result)]
      ].filter(([, text]) => text);
      return notes.length ? `<ul class="background-result-notes">${notes.map(([tone, text]) => `<li class="${tone}">${text}</li>`).join("")}</ul>` : "";
    }
    backgroundNoExpReason(summary) {
      if (!((Number(summary.kills) || 0) > 0)) return "";
      const zone = this.deps.getZone(this.deps.game.currentZoneId);
      const rate = this.deps.levelProgression.rewardMultiplier(zone, { level: this.deps.levelProgression.areaLevel(zone) }, this.deps.game.level, "experience");
      if (rate >= 0.5) return "";
      const pct = Math.round(rate * 100);
      return `레벨 차이로 이 지역 경험치가 ${pct > 0 ? this.deps._t("{pct}%로 줄었습니다", { pct }) : this.deps._t("거의 없습니다")}.`;
    }
    renderBackgroundStoryLine() {
      const scenes = typeof this.deps.storyJournalUi === "object" ? this.deps.storyJournalUi.foldPassedScenes() : [];
      if (!scenes.length) return "";
      return `<p class="background-result-story"><span>${this.deps._t("지난 이야기 {length}편이 기록에 실렸습니다.", { length: scenes.length })}</span>
            <button type="button" onclick="hideItemTooltip();document.getElementById('background-combat-result-overlay').remove();switchTab('tab-journal')">${this.deps._t("기록에서 읽기")}</button></p>`;
    }
    restoreBattlefieldBeforeBackgroundReplay(refreshUi = true) {
      if (typeof this.deps.syncBattleTabLayout === "function") this.deps.syncBattleTabLayout(false);
      if (typeof this.deps.scheduleStableResize === "function") this.deps.scheduleStableResize();
      else if (typeof this.deps.resizeCanvas === "function") this.deps.resizeCanvas();
      if (refreshUi && typeof this.deps.updateStaticUI === "function") this.deps.updateStaticUI();
      if (typeof this.deps.renderBattlefield === "function") this.deps.renderBattlefield(true);
    }
    failure(error) {
      const overlay = this.getBackgroundProgressOverlay();
      if (!overlay) return;
      overlay.innerHTML = `<div class="background-combat-progress-card" role="alert"><strong>${this.deps._t("방치 정산을 완료하지 못했습니다")}</strong><p>${this.deps.escapeHTML(error.message)}</p><p>${this.deps._t("이전 저장과 방치 시간은 보존됩니다. 다시 계산하거나 새로고침해 주세요.")}</p><button type="button" onclick="startBackgroundCombatReturn(Date.now())">${this.deps._t("다시 계산")}</button></div>`;
    }
    complete() {
      this.deps.document.getElementById("background-combat-progress-percent").textContent = this.deps._t("정산 완료");
    }
    dispose() {
      this.hideBackgroundProgressOverlay();
      this.deps.document.getElementById("background-combat-result-overlay")?.remove();
    }
  };

  // modules/browser/replay-scheduler.mjs
  function createReplayScheduler(deps2) {
    const pending = /* @__PURE__ */ new Set();
    let active = true;
    function waitFrame() {
      if (!active) return Promise.resolve();
      return new Promise((resolve) => {
        let timer = null, frame = null, paintTimer = null, finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          if (timer !== null) deps2.clearTimeout(timer);
          if (paintTimer !== null) deps2.clearTimeout(paintTimer);
          if (frame !== null && typeof deps2.cancelAnimationFrame === "function") deps2.cancelAnimationFrame(frame);
          pending.delete(finish);
          resolve();
        };
        pending.add(finish);
        timer = deps2.setTimeout(finish, 100);
        if (typeof deps2.requestAnimationFrame === "function") frame = deps2.requestAnimationFrame(() => {
          frame = null;
          if (!finished) paintTimer = deps2.setTimeout(finish, 0);
        });
      });
    }
    function delay(ms) {
      if (!active) return Promise.resolve();
      return new Promise((resolve) => {
        let timer = null;
        const finish = () => {
          if (timer !== null) deps2.clearTimeout(timer);
          pending.delete(finish);
          resolve();
        };
        pending.add(finish);
        timer = deps2.setTimeout(finish, ms);
      });
    }
    function dispose() {
      active = false;
      for (const finish of pending) finish();
      pending.clear();
    }
    return Object.freeze({ waitFrame, delay, dispose });
  }

  // modules/away-settlement-ui-classic.mjs
  var owner = window.GameModules.state;
  var paint = createReplayScheduler({
    setTimeout: windowSetTimeout,
    clearTimeout: windowClearTimeout,
    requestAnimationFrame: typeof requestAnimationFrame === "function" ? windowRequestAnimationFrame : void 0,
    cancelAnimationFrame: typeof cancelAnimationFrame === "function" ? windowCancelAnimationFrame : void 0
  });
  var deps = {
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get OFFLINE_PROJECTION() {
      return OFFLINE_PROJECTION;
    },
    get ORB_DB() {
      return ORB_DB;
    },
    get _t() {
      return _t;
    },
    get actExplorationProgress() {
      return actExplorationProgress;
    },
    get actExplorationState() {
      return actExplorationState;
    },
    get actExplorationUi() {
      return actExplorationUi;
    },
    get actTitleCard() {
      return typeof actTitleCard === "undefined" ? void 0 : actTitleCard;
    },
    get addLog() {
      return addLog;
    },
    get backgroundCombatRuntime() {
      return backgroundCombatRuntime;
    },
    get cloneBackgroundCombatState() {
      return cloneBackgroundCombatState;
    },
    get console() {
      return console;
    },
    get contentUnlockUi() {
      return contentUnlockUi;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get equipmentLootPolicy() {
      return equipmentLootPolicy;
    },
    get equipmentLootUi() {
      return equipmentLootUi;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get formatNumberKR() {
      return formatNumberKR;
    },
    get game() {
      return owner.game;
    },
    get gameplayStarted() {
      return typeof gameplayStarted === "undefined" ? void 0 : gameplayStarted;
    },
    get getBackgroundTotalExperience() {
      return getBackgroundTotalExperience;
    },
    get getCurrencyInfo() {
      return getCurrencyInfo;
    },
    get getCurrencyTone() {
      return getCurrencyTone;
    },
    get getLocalSaveStatus() {
      return getLocalSaveStatus;
    },
    get getOfflineProgressConfig() {
      return getOfflineProgressConfig;
    },
    get getRarityColor() {
      return getRarityColor;
    },
    get getSaveSlot() {
      return getSaveSlot;
    },
    get getZone() {
      return getZone;
    },
    get ghostDuelStage() {
      return typeof ghostDuelStage === "undefined" ? void 0 : ghostDuelStage;
    },
    get isLoadingOverlayOpen() {
      return typeof isLoadingOverlayOpen === "undefined" ? void 0 : isLoadingOverlayOpen;
    },
    get isLoopHeroSelectOpen() {
      return typeof isLoopHeroSelectOpen === "undefined" ? void 0 : isLoopHeroSelectOpen;
    },
    get isPauseSettingOverlayOpen() {
      return isPauseSettingOverlayOpen;
    },
    get isRewardOpen() {
      return typeof isRewardOpen === "undefined" ? void 0 : isRewardOpen;
    },
    get isStartupOverlayOpen() {
      return isStartupOverlayOpen;
    },
    get isTutorialPausingCombat() {
      return isTutorialPausingCombat;
    },
    get knitting() {
      return knitting;
    },
    get knittingUi() {
      return knittingUi;
    },
    get levelProgression() {
      return levelProgression;
    },
    get lootMoments() {
      return lootMoments;
    },
    get memoryLeaves() {
      return typeof memoryLeaves === "undefined" ? void 0 : memoryLeaves;
    },
    get mergeDefaults() {
      return mergeDefaults;
    },
    get performance() {
      return performance;
    },
    get persistLocalSave() {
      return persistLocalSave;
    },
    get renderBattlefield() {
      return typeof renderBattlefield === "undefined" ? void 0 : renderBattlefield;
    },
    get renderPixelIcon() {
      return renderPixelIcon;
    },
    get resizeCanvas() {
      return typeof resizeCanvas === "undefined" ? void 0 : resizeCanvas;
    },
    get restoreCombatRuntime() {
      return restoreCombatRuntime;
    },
    get scheduleStableResize() {
      return typeof scheduleStableResize === "undefined" ? void 0 : scheduleStableResize;
    },
    get setBattleFxSuppressed() {
      return setBattleFxSuppressed;
    },
    get sideEncounterUi() {
      return sideEncounterUi;
    },
    get simulateBackgroundCombatChunked() {
      return simulateBackgroundCombatChunked;
    },
    get storyJournalUi() {
      return typeof storyJournalUi === "undefined" ? void 0 : storyJournalUi;
    },
    get syncBattleTabLayout() {
      return typeof syncBattleTabLayout === "undefined" ? void 0 : syncBattleTabLayout;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get weaponMastery() {
      return typeof weaponMastery === "undefined" ? void 0 : weaponMastery;
    },
    get weaponMasteryUi() {
      return typeof weaponMasteryUi === "undefined" ? void 0 : weaponMasteryUi;
    },
    get window() {
      return window;
    },
    get yieldTutorialCardToResult() {
      return typeof yieldTutorialCardToResult === "undefined" ? void 0 : yieldTutorialCardToResult;
    },
    waitFrame: () => paint.waitFrame(),
    disposePaint: () => paint.dispose()
  };
  var view = new AwaySettlementView(deps);
  var settlement = new AwaySettlement(owner, deps, view);
  window.GameModules.awaySettlement = settlement;
  safeExposeGlobals({
    calculateBackgroundProgressMs,
    getBackgroundCombatSignature,
    isForegroundGameplayPausedForBackground: () => settlement.pause.paused(),
    recordBackgroundCombatEntry: settlement.record.bind(settlement),
    getBackgroundAtlasGains: (before, after) => backgroundAtlasGains(deps.memoryLeaves, before, after),
    requestFasterBackgroundCombat: settlement.faster.bind(settlement),
    shouldApplyBackgroundCombatResult: settlement.mayApply.bind(settlement),
    commitBackgroundCombat: settlement.commit.bind(settlement),
    startBackgroundCombatReturn: settlement.start.bind(settlement),
    startOfflineCombatReturn: settlement.startOffline.bind(settlement),
    handleBackgroundVisibilityChange: settlement.visibility.bind(settlement)
  });
})();
