import { createDisplay } from './browser/display.mjs';
// This adapter goes away when bootstrap and display consumers import the application instance.
const uiDisplay = createDisplay({ window, document }, {
    getState: () => game,
    normalizeScale: value => normalizeUiScale(value),
    translate: (...args) => _t(...args),
    save: options => saveGame(options)
});
safeExposeGlobals({ uiDisplay, applyUiSkin: uiDisplay.applyUiSkin, applyHighContrast: uiDisplay.applyHighContrast,
    applyLoadedSaveLook: uiDisplay.applyLoadedSaveLook, applyChatMessageSize: uiDisplay.applyChatMessageSize });
// Preserve the existing defer-script/DOMContentLoaded contract, including the headless game VM.
uiDisplay.start({ waitForDomReady: true });
