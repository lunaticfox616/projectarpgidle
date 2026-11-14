import { createNpcShopView } from './ui/npc-shop-view.mjs';
const npcShopUi = createNpcShopView({
    get NPC_SHOPS() { return NPC_SHOPS; },
    get npcShop() { return npcShop; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get stumpBox() { return stumpBox; },
    get shopView() { return shopView; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get pickParticle() { return pickParticle; },
    get game() { return window.GameModules.state.game; },
    get systemTutorialUi() { return systemTutorialUi; },
    get getEffectiveResonanceCap() { return getEffectiveResonanceCap; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get contentUnlockUi() { return contentUnlockUi; },
    get STORY_NPCS() { return STORY_NPCS; },
    get addLog() { return addLog; },
    get checkUnlocks() { return checkUnlocks; },
    get updateStaticUI() { return updateStaticUI; },
    get saveGame() { return saveGame; },
    get SUPPORT_GEM_DB() { return SUPPORT_GEM_DB; },
    get SKILL_DB() { return SKILL_DB; },
    get matchSearchQuery() { return matchSearchQuery; },
    get window() { return window; },
    get contentProgression() { return contentProgression; },
    get document() { return document; },
    get CSS() { return CSS; }
});
safeExposeGlobals({ npcShopUi });
