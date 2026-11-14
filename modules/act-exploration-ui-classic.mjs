import { windowCancelAnimationFrame, windowClearInterval, windowRequestAnimationFrame, windowSetInterval } from './browser/window-methods.mjs';
import { createActExplorationView } from './ui/act-exploration-view.mjs';
const actExplorationUi = createActExplorationView({
    get game() { return window.GameModules.state.game; },
    get actExplorationState() { return actExplorationState; },
    get document() { return document; },
    get actExplorationMap() { return actExplorationMap; },
    get _t() { return _t; },
    get actExplorationRooms() { return actExplorationRooms; },
    get showGameToast() { return showGameToast; },
    get queueImportantSave() { return queueImportantSave; },
    get actExplorationRoomsUi() { return actExplorationRoomsUi; },
    get hotkeyBindings() { return hotkeyBindings; },
    get actExplorationSight() { return actExplorationSight; },
    get actExplorationProgress() { return actExplorationProgress; },
    get battleDrawList() { return battleDrawList; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get actTitleCard() { return actTitleCard; },
    get stageDoorMarks() { return stageDoorMarks; },
    get bossMoves() { return bossMoves; },
    get actExplorationMotion() { return actExplorationMotion; },
    get window() { return window; },
    get isForegroundGameplayPausedForBackground() { return isForegroundGameplayPausedForBackground; },
    get setInterval() { return windowSetInterval; },
    get clearInterval() { return windowClearInterval; },
    get showInfoTooltipHtml() { return showInfoTooltipHtml; },
    get escapeHTML() { return escapeHTML; },
    get hideInfoTooltip() { return hideInfoTooltip; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get console() { return console; },
    get openingJourney() { return typeof openingJourney === 'undefined' ? undefined : openingJourney; }
});
safeExposeGlobals({ actExplorationUi });
