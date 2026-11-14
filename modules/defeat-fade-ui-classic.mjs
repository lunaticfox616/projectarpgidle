import { createDefeatFadeView } from './ui/defeat-fade-view.mjs';

// No new global handlers. The application owns this view's shutdown.
window.GameModules.defeatFadeView = createDefeatFadeView({
    get document() { return document; },
    get window() { return window; },
    get uiDisplay() { return uiDisplay; }
});
