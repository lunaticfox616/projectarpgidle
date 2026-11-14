import { createBossVariantsView } from './ui/boss-variants-view.mjs';

// Transitional classic API; remove when the application supplies this view directly.
const bossVariantsUi = createBossVariantsView({
    get BOSS_VARIANTS() { return BOSS_VARIANTS; },
    get ORB_DB() { return ORB_DB; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get atlas() { return atlas; },
    get bossVariants() { return bossVariants; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get window() { return window; }
});
safeExposeGlobals({ bossVariantsUi });
