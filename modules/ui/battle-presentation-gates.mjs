const PAUSE_OVERLAYS = [
    '.tutorial-overlay.active:not(#tutorial-overlay):not(#death-overlay)',
    '#act-exploration-dialog[open]', '#beehive-choice-overlay', '.selection-overlay',
    '#mobile-craft-currency-overlay', '#craft-item-picker-overlay'
];

/** Browser/overlay facts only. The application still decides whether to advance combat. */
export function battlePresentationSuspended(deps) {
    return deps.document.hidden || deps.background.appInactive || deps.background.processing
        || deps.startupOpen() || deps.loadingOpen();
}

function overlayOpen(deps, selector) {
    const element = deps.document.querySelector(selector);
    if (!element) return false;
    if (element.classList && element.classList.contains('active')) return true;
    const style = typeof deps.window.getComputedStyle === 'function' ? deps.window.getComputedStyle(element) : null;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0);
}

export function pauseSettingOverlayOpen(deps) { return PAUSE_OVERLAYS.some(selector => overlayOpen(deps, selector)); }

export function tutorialPausingCombat(deps) {
    if (!(deps.game.settings && deps.game.settings.pauseGameOnOverlay)) return false;
    return (deps.tutorialOpen() && deps.tutorialActions.requiresAttention(deps.activeTutorial)) || deps.tutorialActions.holdsQueue();
}
