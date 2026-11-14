import { GhostDuelFighters } from './rendering/ghost-duel-fighters.mjs';
import { GhostDuelTimeline } from './rendering/ghost-duel-timeline.mjs';
import { GhostDuelPictures } from './browser/ghost-duel-pictures.mjs';
import { GhostDuelRenderer } from './rendering/ghost-duel-renderer.mjs';
import { GhostDuelView } from './ui/ghost-duel-view.mjs';
import { GhostDuelPlayback } from './application/ghost-duel-playback.mjs';

const deps = {
    get HANA_WEAPON_COMBOS() { return HANA_WEAPON_COMBOS; },
    get PLAYER_CLASS_DEFS() { return PLAYER_CLASS_DEFS; },
    get SKILL_RUNE_STANCE_BY_CATEGORY() { return SKILL_RUNE_STANCE_BY_CATEGORY; },
    get STAGE_CHARACTERS() { return STAGE_CHARACTERS; },
    get STAGE_VIEW() { return STAGE_VIEW; },
    get _t() { return _t; },
    get battlePixelFont() { return battlePixelFont; },
    get cancelAnimationFrame() { return cancelAnimationFrame.bind(globalThis); },
    get clampNumber() { return clampNumber; },
    get closeAllWindows() { return typeof closeAllWindows === 'function' ? closeAllWindows : undefined; },
    get console() { return console; },
    get document() { return document; },
    get drawCrispCanvasText() { return drawCrispCanvasText; },
    get escapeHTML() { return escapeHTML; },
    get formatNumberKR() { return formatNumberKR; },
    get game() { return window.GameModules.state.game; },
    get getHeroAppearanceId() { return getHeroAppearanceId; },
    get getStageHeroStance() { return getStageHeroStance; },
    get getZone() { return getZone; },
    get performance() { return performance; },
    get requestAnimationFrame() { return requestAnimationFrame.bind(globalThis); },
    get stageActors() { return stageActors; },
    get stageBoard() { return stageBoard; },
    get stageDots() { return stageDots; },
    get stagePictures() { return stagePictures; },
    get stageRegionFit() { return stageRegionFit; },
    get stageRings() { return stageRings; },
    get switchMapSubtab() { return switchMapSubtab; },
    get switchTab() { return switchTab; },
    get uiDisplay() { return uiDisplay; },
};
const fighters = new GhostDuelFighters(deps);
const timeline = new GhostDuelTimeline(deps);
const pictures = new GhostDuelPictures(deps);
const renderer = new GhostDuelRenderer(deps, { timeline, pictures });
const view = new GhostDuelView(deps, { timeline });
const playback = new GhostDuelPlayback(deps, { fighters, timeline, pictures, renderer, view });

// The alias remains until classic/template consumers use the composed playback service.
const ghostDuelStage = Object.freeze({
    play: playback.play.bind(playback),
    stop: playback.stop.bind(playback),
    playing: playback.playing.bind(playback),
    dispose: playback.dispose.bind(playback),
});
window.GameModules.ghostDuelPlayback = ghostDuelStage;
safeExposeGlobals({ ghostDuelStage });
