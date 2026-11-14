import { windowClearInterval, windowSetInterval } from './browser/window-methods.mjs';
import { CloudSessionGuard } from './application/cloud-session-guard.mjs';
import { StandbyView } from './ui/standby-view.mjs';

const guard = new CloudSessionGuard({
    get canPersistLocalSave() { return canPersistLocalSave; },
    get clearInterval() { return windowClearInterval; },
    get cloudJsonRequest() { return cloudJsonRequest; },
    get console() { return console; },
    get crypto() { return typeof crypto === 'undefined' ? undefined : crypto; },
    get document() { return document; },
    get gameplayStarted() { return gameplayStarted; },
    get getActiveCloudUserId() { return getActiveCloudUserId; },
    get location() { return location; },
    get saveGame() { return saveGame; },
    get sessionStorage() { return sessionStorage; },
    get setInterval() { return windowSetInterval; },
    get setLocalSaveRuntimeState() { return setLocalSaveRuntimeState; },
    get window() { return window; }
}, new StandbyView(document));
safeExposeGlobals({ cloudSessionGuard: Object.freeze({ ready: () => guard.untilSessionMayBoot(), syncSession: () => guard.syncCloudSessionGuard(), requestHeaders: options => guard.requestHeaders(options), assertActive: () => guard.assertActive(), noteServerRefusal: (data, token) => guard.noteServerRefusal(data, token), refusalCode: guard.refusalCode, dispose: () => guard.dispose() }) });
