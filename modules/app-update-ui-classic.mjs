import { createAppUpdateView } from './ui/app-update-view.mjs';

window.GameModules.appUpdateView = createAppUpdateView({
    get document() { return document; },
    get window() { return window; },
    get location() { return location; },
    get navigator() { return navigator; },
    get console() { return console; },
    get AbortController() { return AbortController; },
    now: () => Date.now(),
    fetch: function updateFetchVersion(...args) { return fetch(...args); },
    setInterval: function updateStartTimer(...args) { return setInterval(...args); },
    clearInterval: function updateStopTimer(...args) { return clearInterval(...args); },
    getLocalSaveStatus: function updateReadSaveStatus() { return getLocalSaveStatus(); },
    saveGame: function updatePersistBeforeReload(options) { return saveGame(options); },
    _t: function updateTranslate(...args) { return _t(...args); }
});
