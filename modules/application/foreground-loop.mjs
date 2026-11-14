/** Foreground combat orchestration; game is read through deps on every callback. */
export class ForegroundLoop {
    constructor(deps, clock) {
        this.deps = deps;
        this.clock = clock;
        this.uiOwner = deps.game;
        this.lastHeavyUiRefreshAt = 0;
        this.runGameTickOnce = this.runGameTickOnce.bind(this);
    }

    foregroundCombatPaused() {
        return this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive || this.deps.backgroundCombatRuntime.processing
            || this.deps.backgroundCombatRuntime.failed || this.deps.isForegroundGameplayPausedForBackground();
    }

    runForegroundCombat(nowMs) {
        const paused = this.foregroundCombatPaused();
        const cinematic = this.deps.bossMoves.observer.advanceScene(nowMs, paused);
        let steps = this.deps.takeForegroundCombatSteps(this.clock, nowMs, paused || cinematic);
        let executed = 0;
        for (; executed < steps; executed++) {
            if (this.deps.isForegroundGameplayPausedForBackground()) break;
            this.deps.runUiCoreLoop();
            if (this.deps.bossMoves.observer.advanceScene(nowMs, false)) return executed + 1;
        }
        return executed;
    }

    runForegroundExplorationFrame(nowMs) {
        const run = this.deps.actExplorationState.current(this.deps.game);
        if (!run || this.foregroundCombatPaused() || this.deps.bossMoves.observer.sceneActive()) return;
        const sinceTick = this.clock.lastAtMs === null ? 0 : Math.max(0, nowMs - this.clock.lastAtMs);
        // The pending fraction and time since the last 100 ms callback can each approach
        // 100 ms. Clamping their sum to 100 freezes walking until the next combat tick.
        const remainder = Math.min(200, this.clock.remainderMs + sinceTick);
        const motionNow = this.deps.getCombatTime() + remainder;
        if (motionNow - run.motionTimeMs < 20) return;
        // Walking shares the combat tick's current stats. A high-refresh display must not
        // re-evaluate the character build on every RAF, including frames with no motion step.
        const stats = this.deps.game.lastCombatStats || this.deps.getPlayerStats();
        this.deps.advancePlayerExplorationFrame(motionNow, stats);
    }

    runGameTick() {
        if (this.deps.game.isGuideReplay) {
            this.deps.takeForegroundCombatSteps(this.clock, this.deps.performance.now(), true);
            return;
        }
        this.deps.combatEquipmentStats.withinTick(this.runGameTickOnce);
    }

    runGameTickOnce() {
        try {
            if (this.uiOwner !== this.deps.game) {
                this.uiOwner = this.deps.game;
                this.lastHeavyUiRefreshAt = 0;
            }
            this.settlePlayerStall();
            if (this.runForegroundCombat(this.deps.performance.now()) === 0) return;
            this.deps.ensureLoopChallengeState();
            let now = Date.now();
            if (typeof this.deps.updateCombatOxygenBar === 'function') this.deps.updateCombatOxygenBar();
            if (this.deps.pendingHeavyUiRefresh && now - this.lastHeavyUiRefreshAt >= 1200) {
                this.deps.pendingHeavyUiRefresh = false;
                this.lastHeavyUiRefreshAt = now;
                // 킬 이후 드랍·인벤·재화·지도 상태를 스로틀된 정적 갱신으로 반영한다.
                this.deps.updateStaticUI();
            }
            this.refreshCombatTickUi();
        } catch (error) {
            this.deps.console.error('gameTick error:', error);
            this.deps.recoverRuntimeState();
            try { this.refreshCombatTickUi(); }
            catch (uiError) { this.deps.console.error('tick UI recovery failed:', uiError); }
        }
    }

    settlePlayerStall() {
        this.deps.playerStallUi.tickVisitors(Date.now());
        if (this.deps.document.hidden || this.deps.backgroundCombatRuntime.appInactive || this.deps.backgroundCombatRuntime.snapshot
            || this.deps.backgroundCombatRuntime.processing || this.deps.backgroundCombatRuntime.failed || Date.now() - this.deps.game.playerStall.lastAt < 15000) return;
        const stall = this.deps.game.playerStall, sequence = stall.offerSequence;
        const pending = stall.listings.filter(row => row.offer).length;
        const paid = this.deps.playerStallUi.settleSales(Date.now());
        if (paid > 0 || sequence !== stall.offerSequence || pending !== stall.listings.filter(row => row.offer).length) this.deps.pendingHeavyUiRefresh = true;
    }

    refreshCombatTickUi() {
        this.deps.cosmosRouteUi.updateVitals();
        this.deps.combatCurrencyHud.update();
        this.deps.loopMutationUi.update();
        let recentStats = this.deps.game.lastCombatStats && (this.deps.getCombatTime() - (this.deps.game.lastCombatStatsAt || 0) < 250) ? this.deps.game.lastCombatStats : this.deps.getUiPlayerStats();
        this.deps.updateCombatUI(recentStats);
    }

    notePageExit() {
        if (!(this.deps.document.hidden && this.deps.backgroundCombatRuntime.hiddenAtMs)) this.deps.recordBackgroundCombatEntry(Date.now());
    }
}
