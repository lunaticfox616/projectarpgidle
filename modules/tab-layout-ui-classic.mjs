import { createTabLayoutView } from './ui/tab-layout-view.mjs';
const tabLayoutUi = createTabLayoutView({
    get document() { return document; },
    get uiDisplay() { return uiDisplay; },
    get game() { return window.GameModules.state.game; },
    get i18n() { return i18n; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get applyTabHeaderOrder() { return applyTabHeaderOrder; },
    get queueImportantSave() { return queueImportantSave; }
});
safeExposeGlobals({ tabLayoutUi });
