const BUILD_EVENTS = ['pointerdown', 'pointerup', 'click', 'keydown', 'change', 'input', 'drop', 'dragend'];

/** Owns only the event listeners and recurring work previously installed by main.js. */
export class ApplicationEvents {
    constructor(deps) {
        this.deps = deps;
        this.listeners = [];
        this.bound = new Set();
        this.tokenRefresh = null;
        this.afterBuildEdit = null;
        this.bootTimer = null;
        this.active = true;
    }

    listen(target, type, listener, options) {
        target.addEventListener(type, listener, options);
        this.listeners.push({ target, type, listener, options });
    }

    viewport() {
        if (this.bound.has('viewport')) return;
        this.bound.add('viewport');
        const resize = () => {
            this.deps.syncBattleTabLayout(false);
            this.deps.scheduleStableResize();
        };
        this.listen(this.deps.window, 'resize', resize);
        this.listen(this.deps.window, 'orientationchange', resize);
        if (this.deps.window.visualViewport) this.listen(this.deps.window.visualViewport, 'resize', resize);
    }

    exitSaves(notePageExit) {
        if (this.bound.has('save')) return;
        this.bound.add('save');
        this.listen(this.deps.document, 'visibilitychange', () => {
            this.deps.handleBackgroundVisibilityChange();
            if (this.deps.document.hidden) this.saveOnExit('visibilitychange');
        });
        for (const type of ['pagehide', 'beforeunload']) this.listen(this.deps.window, type, () => {
            notePageExit();
            this.saveOnExit(type);
        });
    }

    saveOnExit(type) {
        if (this.deps.window.__skipUnloadSaveOnce) return;
        this.deps.saveGame({ skipCloudSync: true, touchModifiedAt: this.deps.gameplayStarted });
        this.deps.pushCloudSaveOnPageExit(type);
    }

    token() {
        if (this.tokenRefresh !== null) return;
        this.tokenRefresh = this.deps.setInterval(() => {
            if (this.deps.cloudState.user && this.deps.cloudState.session) this.deps.ensureCloudSessionFresh('주기 확인')
                .catch(error => this.deps.console.warn('periodic cloud token refresh failed:', error));
        }, 60000);
    }

    buildEdits() {
        if (this.bound.has('build')) return;
        this.bound.add('build');
        const afterHandlers = () => {
            this.afterBuildEdit = null;
            this.deps.playerStatCache.invalidate();
        };
        const drop = () => {
            this.deps.playerStatCache.invalidate();
            if (this.afterBuildEdit === null) this.afterBuildEdit = this.deps.setTimeout(afterHandlers, 0);
        };
        for (const type of BUILD_EVENTS) this.listen(this.deps.document, type, drop, { capture: true, passive: true });
    }

    touchTooltips() {
        if (this.bound.has('touch')) return;
        this.bound.add('touch');
        this.listen(this.deps.document, 'touchstart', event => {
            const target = event.target;
            const keep = target && target.closest && target.closest('.item-card, .skill-gem, #tree-canvas, #item-tooltip-box, [data-item-tooltip-anchor="1"]');
            if (!keep) {
                this.deps.hideInfoTooltip();
                this.deps.hideItemTooltip();
            }
        }, { passive: true });
    }

    boot(bootWhenTabMayRun, syncGameplayTimers) {
        if (!this.active || this.bound.has('boot')) return;
        this.bound.add('boot');
        this.listen(this.deps.window, 'project-idle:startup-visibility', syncGameplayTimers);
        this.listen(this.deps.window, 'error', event => {
            if (event?.error) this.deps.reportFatalError('runtime', event.error);
        });
        this.listen(this.deps.window, 'load', bootWhenTabMayRun);
        if (this.deps.document.readyState === 'loading') this.listen(this.deps.document, 'DOMContentLoaded', bootWhenTabMayRun);
        else this.bootTimer = this.deps.setTimeout(() => { this.bootTimer = null; bootWhenTabMayRun(); }, 0);
    }

    dispose() {
        this.active = false;
        for (const { target, type, listener, options } of this.listeners) target.removeEventListener(type, listener, options);
        this.listeners.length = 0;
        this.bound.clear();
        if (this.tokenRefresh !== null) this.deps.clearInterval(this.tokenRefresh);
        if (this.afterBuildEdit !== null) this.deps.clearTimeout(this.afterBuildEdit);
        if (this.bootTimer !== null) this.deps.clearTimeout(this.bootTimer);
        this.tokenRefresh = this.afterBuildEdit = this.bootTimer = null;
    }
}
