import { windowCancelAnimationFrame, windowClearTimeout, windowRequestAnimationFrame, windowSetTimeout } from './browser/window-methods.mjs';
import { createStumpDragView } from './ui/stump-drag-view.mjs';
const stumpDragView = createStumpDragView({
    get clearTimeout() { return windowClearTimeout; },
    get hideInfoTooltip() { return hideInfoTooltip; },
    get setTimeout() { return windowSetTimeout; },
    get document() { return document; },
    get stumpCube() { return stumpCube; },
    get stumpBoxUi() { return stumpBoxUi; },
    get game() { return window.GameModules.state.game; },
    get stumpBox() { return stumpBox; },
    get showInfoTooltipHtml() { return showInfoTooltipHtml; },
    get uiDisplay() { return uiDisplay; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; }
});
window.GameModules.stumpDragView = stumpDragView;
