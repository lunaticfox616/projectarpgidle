import { windowClearInterval, windowClearTimeout, windowSetInterval, windowSetTimeout } from './browser/window-methods.mjs';
import { GameTabGuard } from './application/game-tab-guard.mjs';
import { StandbyView } from './ui/standby-view.mjs';

const guard = new GameTabGuard({
    get _t() { return _t; },
    get canPersistLocalSave() { return canPersistLocalSave; },
    get clearInterval() { return windowClearInterval; },
    get clearTimeout() { return windowClearTimeout; },
    get console() { return console; },
    get document() { return document; },
    get gameplayStarted() { return gameplayStarted; },
    get localStorage() { return localStorage; },
    get location() { return location; },
    get saveGame() { return saveGame; },
    get sessionStorage() { return sessionStorage; },
    get setInterval() { return windowSetInterval; },
    get setLocalSaveRuntimeState() { return setLocalSaveRuntimeState; },
    get setTimeout() { return windowSetTimeout; },
    get window() { return window; }
}, new StandbyView(document));
safeExposeGlobals({ gameTabGuard: Object.freeze({ ready: () => guard.untilTabMayBoot(), uncover: () => guard.uncover(), dispose: () => guard.dispose() }) });
