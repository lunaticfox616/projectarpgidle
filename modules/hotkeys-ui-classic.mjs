import { createHotkeysView } from './ui/hotkeys-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const hotkeysUi = createHotkeysView({
    get Element() { return Element; },
    get JSON() { return JSON; },
    get _t() { return _t; },
    get actExplorationUi() { return actExplorationUi; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get hotkeyBindings() { return hotkeyBindings; },
    get isTextEntryTarget() { return isTextEntryTarget; },
    get messageFrames() { return messageFrames; },
    get mobilitySkill() { return mobilitySkill; },
    get performance() { return performance; },
    get queueImportantSave() { return queueImportantSave; },
    get renderCombatSkillHud() { return renderCombatSkillHud; },
    get showGameToast() { return showGameToast; },
    get toggleWindowFromHotkey() { return toggleWindowFromHotkey; },
    get window() { return window; }
});
safeExposeGlobals({ hotkeysUi });
