import { battlePresentationSuspended } from '../ui/battle-presentation-gates.mjs';

/** Owns the drawing RAF. The separate foreground application owns elapsed combat time and gameplay ticks. */
export class BattlePresentationLoop {
    constructor(deps, preview) {
        this.deps = deps; this.preview = preview; this.handle = null; this.lastDrawAt = 0; this.active = true;
        // Keep this callback identical to the public gameLoop used by visual capture tools.
        this.tick = this.tick.bind(this);
    }

    throttle(frameNow) {
        const exploration = !!this.deps.explorationState.current(this.deps.game);
        const interval = exploration ? this.deps.display.explorationFrameMs : this.deps.display.battleFrameMs;
        const elapsed = frameNow - this.lastDrawAt;
        if (elapsed + .5 < interval) return;
        this.lastDrawAt = exploration ? this.lastDrawAt + Math.max(1, Math.floor((elapsed + .5) / interval)) * interval : frameNow;
        this.preview.updateVisibility();
        // PiP renders and copies on its adaptive timer; avoid copying again on the main RAF.
        const began = this.deps.now();
        if (this.deps.renderBattlefield(false, interval)) this.deps.frameStats.noteBattleDraw(began, this.deps.now(), interval);
    }

    schedule() {
        if (!this.active || this.handle !== null || this.deps.startupOpen()) return;
        this.handle = this.deps.requestFrame(this.tick);
    }

    passiveTree() {
        if (!this.deps.document.getElementById('tab-char').classList.contains('active')) return;
        if (!this.deps.shouldRedrawTree()) return;
        this.deps.passiveScene.resizePassiveTreeCanvas(false);
        this.deps.drawTree();
    }

    tick(frameNow = this.deps.now()) {
        this.handle = null;
        if (!this.active) return;
        try {
            if (battlePresentationSuspended(this.deps)) return;
            if (!this.deps.game.isGuideReplay) {
                this.deps.explorationFrame(frameNow);
                this.deps.explorationUi.render();
                this.deps.showTutorial();
                this.deps.deathOverlay.flushPending();
            }
            this.passiveTree();
            if (!this.deps.game.isGuideReplay) this.throttle(frameNow);
        } catch (error) {
            this.deps.console.error('gameLoop error:', error);
            this.deps.recover();
        } finally {
            this.schedule();
        }
    }

    stop() {
        if (this.handle !== null) this.deps.cancelFrame(this.handle);
        this.handle = null;
    }

    dispose() { this.active = false; this.stop(); this.lastDrawAt = 0; }
}
