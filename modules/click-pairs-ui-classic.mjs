import { windowClearTimeout, windowSetTimeout } from './browser/window-methods.mjs';
import { createClickPairsView } from './ui/click-pairs-view.mjs';
const clickPairs = createClickPairsView({
    get setTimeout() { return windowSetTimeout; },
    get clearTimeout() { return windowClearTimeout; },
    get MouseEvent() { return MouseEvent; },
    get window() { return window; },
    get document() { return document; }
});
safeExposeGlobals({ clickPairs });
