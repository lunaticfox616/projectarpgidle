import { createBossMoveView } from './rendering/boss-moves.mjs';
import { createObserverHud } from './ui/observer-hud.mjs';

const hud = createObserverHud({ get document() { return document; } });

const native = createBossMoveView({
    get BOSS_FX() { return typeof BOSS_FX === 'undefined' ? undefined : BOSS_FX; },
    get stagePictures() { return stagePictures; },
    get stageDots() { return stageDots; },
    get stageRoster() { return typeof stageRoster === 'undefined' ? undefined : stageRoster; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get clampNumber() { return clampNumber; },
    get projectSkillFootprint() { return projectSkillFootprint; },
    get drawSkillFootprintGround() { return drawSkillFootprintGround; },
    get BOSS_MOVE_RULES() { return BOSS_MOVE_RULES; },
    get hashSeed() { return hashSeed; },
    get bossAttackView() { return bossAttackView.timing; },
    get bossMoves() { return bossMoves; },
    get performance() { return performance; },
    get uiDisplay() { return uiDisplay; },
    get battlePixelFont() { return battlePixelFont; },
    get _t() { return _t; },
    get BEYOND_BOUNDARY_UNLOCK_BOSS_ID() { return BEYOND_BOUNDARY_UNLOCK_BOSS_ID; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationMotion() { return actExplorationMotion; },
    get clipSkillFootprint() { return clipSkillFootprint; },
    get getCombatTime() { return getCombatTime; },
    get getGridFootprintCells() { return getGridFootprintCells; },
    get getGridUnitFootprint() { return getGridUnitFootprint; },
    get woodsmanAttackFxElement() { return woodsmanAttackFxElement; }
});
const bossMoveView = Object.freeze({
    drawGround: (ctx, projection) => native.drawGround(game, ctx, projection),
    drawAir: (ctx, projection) => native.drawAir(game, ctx, projection),
    drawWoodsmanFx: native.drawWoodsmanFx,
    drawObserverWarnings: (ctx, layout, projection) => native.drawObserverWarnings(game, ctx, layout, projection),
    drawObserverTransition: native.drawObserverTransition,
    observerScene: native.observerScene,
    observerCamera: native.observerCamera,
    syncObserverHud: hud.sync,
    strikeHoldMs: native.strikeHoldMs,
    heldSide: native.heldSide,
    shiftAlpha: native.shiftAlpha,
    motion: native.motion
});
safeExposeGlobals({ bossMoveView });
