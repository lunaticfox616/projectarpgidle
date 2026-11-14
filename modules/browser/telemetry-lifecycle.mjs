/** Own only this service's event bindings and timers; repeated install/dispose is harmless. */
export function createTelemetryLifecycle(deps, rules, state) {
    let installed = false, panelTimer = null;
    const events = [
        ['project-idle:encounter-started', event => rules.beginPlaytestAttempt(event.detail)],
        ['project-idle:encounter-finished', event => rules.finishPlaytestAttempt('clear', event.detail)],
        ['project-idle:player-defeated', event => rules.finishPlaytestAttempt('death', event.detail)],
        ['project-idle:movement-started', event => rules.finishPlaytestAttempt('abandon', event.detail)],
        ['error', event => rules.captureClientError(event.error || event.message, event.filename)],
        ['unhandledrejection', event => rules.captureClientError(event.reason, 'unhandledrejection')],
        ['project-idle:startup-visibility', rules.syncPlaytestFrameSampling]
    ];
    const resetFrameClock = () => { state.lastFrameAt = 0; };
    return {
        install() {
            if (installed) return;
            installed = true;
            state.active = true;
            for (const [name, handler] of events) deps.window.addEventListener(name, handler);
            deps.document.addEventListener('visibilitychange', resetFrameClock);
            rules.schedulePlaytestFrame();
            if (rules.isPerformancePanelEnabled()) panelTimer = deps.setInterval(rules.updatePerformancePanel, 500);
        },
        dispose() {
            if (!installed) return;
            installed = false;
            state.active = false;
            for (const [name, handler] of events) deps.window.removeEventListener(name, handler);
            deps.document.removeEventListener('visibilitychange', resetFrameClock);
            if (state.frameHandle !== null) deps.cancelAnimationFrame(state.frameHandle);
            if (panelTimer !== null) deps.clearInterval(panelTimer);
            state.frameHandle = null;
            state.lastFrameAt = 0;
            panelTimer = null;
        }
    };
}
