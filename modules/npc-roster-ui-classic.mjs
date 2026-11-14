import { createNpcRosterView } from './ui/npc-roster-view.mjs';
const npcRosterUi = createNpcRosterView({
    get npcShop() { return npcShop; },
    get NPC_SHOPS() { return NPC_SHOPS; },
    get contentUnlockUi() { return contentUnlockUi; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get STAGE_NPC_ART() { return STAGE_NPC_ART; },
    get NPC_CURRENCY_EXCHANGE() { return NPC_CURRENCY_EXCHANGE; },
    get document() { return document; },
    get marketUi() { return marketUi; },
    get i18n() { return i18n; },
    get contentProgression() { return contentProgression; },
    get STORY_NPCS() { return STORY_NPCS; }
});
safeExposeGlobals({ npcRosterUi });
