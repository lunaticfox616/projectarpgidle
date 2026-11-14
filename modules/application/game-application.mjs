import { ForegroundLoop } from './foreground-loop.mjs';
import { GameStartup } from './startup.mjs';
import { GameplayTimers } from '../browser/gameplay-timers.mjs';
import { ApplicationEvents } from '../browser/application-events.mjs';
import { createViewServices } from './view-services.mjs';

/** Restore saved defaults before rebuilding the encounter, without UI string dispatch. */
export function restoreGameRuntime(deps) {
    deps.game = deps.mergeDefaults(deps.game || {});
    deps.ensureEncounterRun();
}

/** One application instance per page. The composition root supplies the current save through deps.game. */
export function createGameApplication(deps) {
    const clock = { lastAtMs: null, remainderMs: 0 };
    const foreground = new ForegroundLoop(deps, clock);
    const timers = new GameplayTimers(deps, clock, () => foreground.runGameTick());
    const events = new ApplicationEvents(deps);
    const views = createViewServices(deps);
    const startup = new GameStartup(deps, events, timers, foreground, views);
    return Object.freeze({
        timers, events, startup,
        runForegroundCombat: now => foreground.runForegroundCombat(now),
        runForegroundExplorationFrame: now => foreground.runForegroundExplorationFrame(now),
        revealStartupScreen: () => startup.revealStartupScreen(),
        applySavedPresentation: settings => startup.applySavedPresentation(settings),
        runGameTick: () => foreground.runGameTick(),
        settlePlayerStall: () => foreground.settlePlayerStall(),
        refreshCombatTickUi: () => foreground.refreshCombatTickUi(),
        notePageExit: () => foreground.notePageExit(),
        syncGameplayTimers: () => timers.sync(),
        bootWhenTabMayRun: () => startup.bootWhenTabMayRun(),
        init: () => startup.init(),
        install() {
            if (!events.active) return;
            views.start();
            events.boot(() => startup.bootWhenTabMayRun(), () => timers.sync());
        },
        dispose: () => startup.dispose()
    });
}
