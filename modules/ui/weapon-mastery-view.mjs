import { listenView, releaseViewEvents } from './view-events.mjs';
import { stepHtml, sectionHtml, tooltipHtml, settlementLine, announce } from './weapon-mastery-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createWeaponMasteryView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { stepHtml, sectionHtml, tooltipHtml, settlementLine };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ sectionHtml: runtime.handlers.sectionHtml, tooltipHtml: runtime.handlers.tooltipHtml, settlementLine: runtime.handlers.settlementLine , dispose: () => disposeWeaponMasteryView(runtime) });
    listenView(runtime, runtime.deps.window, 'project-idle:weapon-mastery', event => announce(runtime, event.detail || {}));
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.M = runtime.deps.WEAPON_MASTERY;
    runtime.state.TONES = Object.freeze({ greatsword: '#ff7a59', scimitar: '#ffb35c', shortbow: '#8fe07a', orb: '#8fb8ff', flask: '#c98cff', censer: '#f0d24a' });
}

function disposeWeaponMasteryView(runtime) {
    releaseViewEvents(runtime);
}
