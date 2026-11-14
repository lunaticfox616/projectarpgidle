/** Browser scheduling only. Handles never enter a save or a combat replay snapshot. */
export class GameplayTimers {
    constructor(deps, clock, tick) {
        this.deps = deps;
        this.clock = clock;
        this.tick = tick;
        this.combat = null;
        this.autoSave = null;
        this.idleSave = null;
        this.active = true;
    }

    stopCombat() {
        if (this.combat !== null) this.deps.clearInterval(this.combat);
        this.combat = null;
    }

    cancelSave() {
        if (!this.idleSave) return;
        if (this.idleSave.type === 'idle' && this.deps.cancelIdleCallback) this.deps.cancelIdleCallback(this.idleSave.id);
        else this.deps.clearTimeout(this.idleSave.id);
        this.idleSave = null;
    }

    stop() {
        this.stopCombat();
        if (this.autoSave !== null) this.deps.clearInterval(this.autoSave);
        this.autoSave = null;
        this.cancelSave();
    }

    dispose() {
        this.active = false;
        this.stop();
    }

    sync() {
        if (!this.active) return;
        this.stop();
        this.deps.takeForegroundCombatSteps(this.clock, this.deps.performance.now(), true);
        if (this.deps.isStartupOverlayOpen()) return;
        this.combat = this.deps.setInterval(this.tick, 100);
        this.autoSave = this.deps.setInterval(() => this.scheduleSave(), 15000);
    }

    saveBlocked() {
        return this.deps.backgroundCombatRuntime.processing || this.deps.isStartupOverlayOpen() || this.deps.isLoadingOverlayOpen();
    }

    scheduleSave() {
        if (!this.active || this.idleSave || this.saveBlocked()) return;
        const run = () => {
            this.idleSave = null;
            if (!this.active || this.saveBlocked()) return;
            if (typeof this.deps.chronicle === 'object') this.deps.chronicle.check(this.deps.game);
            this.deps.saveGame();
        };
        this.idleSave = this.deps.requestIdleCallback
            ? { type: 'idle', id: this.deps.requestIdleCallback(run, { timeout: 4000 }) }
            : { type: 'timeout', id: this.deps.setTimeout(run, 120) };
    }
}
