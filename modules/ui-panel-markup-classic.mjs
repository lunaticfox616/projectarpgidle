import { updateGamePanelMarkup } from './browser/panel-markup.mjs';
// Remove this adapter when panel consumers import the updater directly.
safeExposeGlobals({ updateGamePanelMarkup });
