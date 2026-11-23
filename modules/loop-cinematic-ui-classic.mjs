import { windowCancelAnimationFrame, windowFetch, windowRequestAnimationFrame } from './browser/window-methods.mjs';
import { createLoopCinematicView } from './ui/loop-cinematic-view.mjs';

// The loop transition cinematic. Other views reach it as window.GameModules.loopCinematic (onScreen, holdsHeroSelection).
const loopCinematic = createLoopCinematicView({
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get window() { return window; },
    get performance() { return performance; },
    get console() { return console; },
    get Image() { return Image; },
    get MutationObserver() { return MutationObserver; },
    get requestAnimationFrame() { return windowRequestAnimationFrame; },
    get cancelAnimationFrame() { return windowCancelAnimationFrame; },
    get fetch() { return windowFetch; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get i18n() { return i18n; },
    get uiDisplay() { return uiDisplay; },
    get selectionDialog() { return selectionDialog; },
    get STORY_LOOP_CINEMATIC() { return STORY_LOOP_CINEMATIC; },
    get STORY_NPCS() { return STORY_NPCS; },
    get STAGE_NPC_ART() { return STAGE_NPC_ART; },
    get STAGE_REGIONS() { return STAGE_REGIONS; },
    get STAGE_ROOM_PLANS() { return STAGE_ROOM_PLANS; },
    get STAGE_SCENES() { return STAGE_SCENES; },
    get STAGE_CHARACTERS() { return STAGE_CHARACTERS; },
    get stageActors() { return stageActors; },
    get getZone() { return getZone; },
    get ABYSS_START_ZONE_ID() { return ABYSS_START_ZONE_ID; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationMap() { return actExplorationMap; },
    get getHeroAppearanceId() { return getHeroAppearanceId; },
    get getStageHeroStance() { return getStageHeroStance; },
    get PLAYER_CLASS_DEFS() { return PLAYER_CLASS_DEFS; },
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get HANA_WEAPON_COMBOS() { return HANA_WEAPON_COMBOS; },
    get contentProgression() { return contentProgression; },
    get CONTENT_UNLOCK_CATALOG() { return CONTENT_UNLOCK_CATALOG; },
    get contentUnlockUi() { return contentUnlockUi; },
    get bagItems() { return bagItems; },
    get requestLoopHeroSelection() { return requestLoopHeroSelection; },
    get isLoopHeroSelectOpen() { return isLoopHeroSelectOpen; },
    get showNextTutorial() { return typeof showNextTutorial === 'function' ? showNextTutorial : undefined; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get gameBgm() { return typeof gameBgm === 'object' ? gameBgm : undefined; },
    get BGM_TRACKS() { return BGM_TRACKS; }
});
window.GameModules.loopCinematic = loopCinematic;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loopCinematic.start, { once: true });
else loopCinematic.start();
