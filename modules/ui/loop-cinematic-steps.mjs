// Steps 7 and 8 of the loop cinematic: the real unlock tree hosted in a window inside the overlay (the one #content-unlock-panel,
// moved in and moved back to #tab-unlocks, never a second tree), and the real class window over backdrop B.
import { unlockHtml } from './loop-cinematic-hud.mjs';

/** True when an unlock can be bought now with the points in hand. */
export function unlockReady(deps) {
    if (!deps.game.contentProgression) return false;
    return deps.CONTENT_UNLOCK_CATALOG.some(def => deps.contentProgression.kind(def) === 'paid' && deps.contentProgression.status(def.id).available);
}

/** Moves the unlock tree into the step's window and redraws it at the window's size. */
export function hostUnlockPanel(runtime, layer) {
    const { deps } = runtime, panel = deps.document.getElementById('content-unlock-panel');
    layer.innerHTML = unlockHtml(deps);
    layer.hidden = false;
    const host = layer.querySelector('[data-cine-host]');
    if (!panel || !host) return false;
    runtime.state.hosted = { panel, parent: panel.parentNode, next: panel.nextSibling };
    host.appendChild(panel);
    deps.contentUnlockUi.render();
    return true;
}

/** Puts the tree back where it lives (in #tab-unlocks, before the node it stood before) and redraws it there. */
export function returnUnlockPanel(runtime) {
    const hosted = runtime.state.hosted;
    if (!hosted) return;
    runtime.state.hosted = null;
    const { panel, parent, next } = hosted;
    if (!parent) return;
    parent.insertBefore(panel, next && next.parentNode === parent ? next : null);
    runtime.deps.contentUnlockUi.render();
}

/** After a click inside the hosted tree the tab's own handlers have run (document listeners); redraw at the host's size. */
export function refreshHostedPanel(runtime) {
    if (runtime.state.hosted) runtime.deps.contentUnlockUi.render();
}

/** Opens the real class window through the game's own request path (the automation's 3 s retry stays as the fallback). */
export function requestClassWindow(runtime) {
    const { deps } = runtime;
    if (!deps.game.pendingLoopHeroSelection) return false;
    deps.requestLoopHeroSelection({});
    return true;
}
