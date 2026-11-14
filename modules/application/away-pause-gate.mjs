/** UI pause decisions belong to the application, not the replay's combat rules. */
export class AwayPauseGate {
    constructor(owner, deps) { this.owner=owner; this.deps=deps; this.memo={at:-Infinity,open:false}; }

    heroHeld() {
        if (typeof this.deps.actTitleCard === 'object' && this.deps.actTitleCard.greeting()) return true;
        return typeof this.deps.ghostDuelStage === 'object' && this.deps.ghostDuelStage.playing();
    }

    blockingScreen() {
        if (this.deps.isStartupOverlayOpen()) return true;
        if (typeof this.deps.isLoadingOverlayOpen === 'function' && this.deps.isLoadingOverlayOpen()) return true;
        if (typeof this.deps.isRewardOpen === 'function' && this.deps.isRewardOpen()) return true;
        return typeof this.deps.isLoopHeroSelectOpen === 'function' && this.deps.isLoopHeroSelectOpen();
    }

    overlayOpen() {
        const now=this.deps.performance.now();
        if (now-this.memo.at >= 16 || now < this.memo.at) Object.assign(this.memo,{at:now,open:this.deps.isPauseSettingOverlayOpen()});
        return this.memo.open;
    }

    unstarted() {
        if (typeof this.deps.gameplayStarted !== 'undefined' && !this.deps.gameplayStarted) return true;
        const game=this.owner.game;
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
        if (!state || typeof state !== 'object' || this.paused()) return false;
        if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
        if ((Number(state.playerHp) || 0) <= 0) return false;
        return this.hasWork(state);
    }

    hasWork(state) {
        if (Array.isArray(state.enemies) && state.enemies.some(enemy=>enemy && enemy.hp>0)) return true;
        if (Number(state.moveTimer)>0) return true;
        if (Array.isArray(state.encounterPlan) && state.encounterPlan.length>0) return true;
        return !!this.deps.actExplorationState.current(state) && !this.deps.actExplorationProgress.waiting(state);
    }
}
