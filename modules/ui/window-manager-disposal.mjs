import { releaseViewEvents } from './view-events.mjs';
import { clearWindowWork } from './window-view-lifetime.mjs';
import { restoreWindowMarkupForMobile } from './window-responsive.mjs';

/** Release presentation only. Stored layout and game state belong to their existing owners. */
export function disposeWindowManager(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    clearWindowWork(runtime);
    releaseViewEvents(runtime);
    for (const key of ['dockFitWatch', 'dockedHudWatch', 'zoneRowWatch']) {
        runtime.state[key]?.disconnect();
        runtime.state[key] = null;
    }
    runtime.state.dockedHudSizes.clear();
    restoreWindowHooks(runtime);
    if (runtime.state.initialized) restoreWindowMarkupForMobile(runtime);
    releaseWindowPresentation(runtime);
    runtime.state.goalRuntime.currentGoal = null;
    runtime.state.guideLayout = null;
}

function restoreWindowHooks(runtime) {
    const target = runtime.deps.window;
    if (runtime.state.switchTabWrapper && target.switchTab === runtime.state.switchTabWrapper) {
        target.switchTab = runtime.state.originalSwitchTab;
    }
    if (runtime.state.combatLogToggleWrapper && target.toggleCombatLogCollapse === runtime.state.combatLogToggleWrapper) {
        target.toggleCombatLogCollapse = runtime.state.originalCombatLogToggle;
    }
}

function releaseWindowPresentation(runtime) {
    const doc = runtime.deps.document;
    for (const id of Object.keys(runtime.state.WINDOW_DEFS)) {
        const panel = doc.getElementById(id);
        if (!panel) continue;
        delete panel.dataset.windowInputBound;
        panel.classList.remove('ui-window-active', 'ui-window-docked', 'ui-window-maximized');
    }
    if (!runtime.state.initialized) return;
    for (const id of ['ui-goal-drawer', 'btn-reset-window-layout', 'combat-log-resize']) doc.getElementById(id)?.remove();
    const access = doc.getElementById('btn-combat-goal-toggle');
    if (access) { access.hidden = true; access.setAttribute('aria-expanded', 'false'); }
    doc.body.classList.remove('desktop-windowed-ui', 'ui-management-mode', 'ui-workspace-docked', 'ui-combat-mode');
    delete doc.body.dataset.activeGameWindow;
}
