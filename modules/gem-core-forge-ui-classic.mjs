import { windowCancelAnimationFrame, windowClearTimeout, windowRequestAnimationFrame, windowSetTimeout } from './browser/window-methods.mjs';
import { createGemForgeView } from './ui/gem-forge-view.mjs';
const gemCoreForgeUi = createGemForgeView({
    get _t() { return _t; },
    get gemCoreForge() { return gemCoreForge; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get renderSkillGemArt() { return renderSkillGemArt; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get addLog() { return addLog; },
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get setTimeout() { return windowSetTimeout; },
    get clearTimeout() { return windowClearTimeout; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get performance() { return performance; },
    get formatValue() { return formatValue; },
    get GEM_CORE_FORGE() { return GEM_CORE_FORGE; }
});
safeExposeGlobals({ gemCoreForgeUi });
