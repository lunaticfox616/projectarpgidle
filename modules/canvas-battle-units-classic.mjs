import { createPlayerFigureRenderer } from './rendering/player-figure.mjs';
import { createSummonFigureRenderer } from './rendering/summon-figure.mjs';
import { createPlayerOcclusionRenderer } from './rendering/player-occlusion.mjs';
import { createPlayerTintRenderer } from './rendering/player-tint.mjs';
import { getHanaSwingTiming, getHeroHitTintStrength as hitStrength } from './rendering/player-figure-timing.mjs';

const hero = createPlayerFigureRenderer({
    get actors() { return stageActors; },
    get skills() { return SKILL_DB; },
    get atlas() { return SKILL_FX_ATLAS; },
    get stageView() { return STAGE_VIEW; },
    get moveIntervalSec() { return COMBAT_GRID_CONFIG.playerMoveIntervalSec; },
    get maxRunRate() { return HERO_RUN_RATE_MAX; },
    stance: () => {
        const owner = window.GameModules.state.game;
        return stageActors.stanceFor(owner.equipment?.['무기'], owner.settings?.stageStance || 'auto');
    },
    appearance: () => getHeroAppearanceId(),
    activeSkill: () => window.GameModules.state.game.activeSkill,
    runMotion: () => actExplorationState.current(window.GameModules.state.game)?.motion,
    playerAir: () => battleVisualState.playerAir,
    effects: () => battleFx,
    drawLegacyHero: (ctx, pose) => window.GameModules.battlefieldPresentation.drawHero(ctx, pose)
});
const getHeroHitTintStrength = (now, stats) => hitStrength(battleFx, now, stats);
const drawActiveSummons = createSummonFigureRenderer({
    summons: () => window.GameModules.state.game.summons,
    effects: () => battleFx,
    get stageSkillCasts() { return typeof stageSkillCasts === 'undefined' ? undefined : stageSkillCasts; },
    get doorMarks() { return stageDoorMarks; },
    get assets() { return battleAssets; },
    get hasGridCell() { return hasGridCell; }
});
const readability = createPlayerOcclusionRenderer({
    get outlineStyle() { return BATTLE_SPRITE_OUTLINES.heroOccluded; },
    get heroSizeScale() { return HERO_SIZE_SCALE; },
    createCanvas: () => document.createElement('canvas'),
    drawFigure: hero.drawBattlePlayerFigure,
    isMirrored: hero.isBattlePlayerMirrored,
    headY: hero.getHeroHeadY,
    actorState: scene => worldTreeSkillFx.actorState(scene),
    hurtPosition: state => getPlayerHurtPosition(state),
    enemyBarLift: enemy => getEnemyFieldBarLift(enemy),
    drawEnemy: (...args) => drawBattleEnemyActor(...args)
});
const tint = createPlayerTintRenderer({
    createCanvas: () => document.createElement('canvas'),
    drawFigure: hero.drawBattlePlayerFigure,
    isStagePlayer: hero.canDrawStagePlayer,
    hitStrength: getHeroHitTintStrength
});
// Retired with the classic battlefield bridge; native consumers receive these owners explicitly.
const drawBattlePlayerFigure = hero.drawBattlePlayerFigure;
drawBattlePlayerFigure.readability = readability;
drawBattlePlayerFigure.dispose = () => { readability.dispose(); tint.dispose(); };
safeExposeGlobals({
    getStageHeroStance: hero.getStageHeroStance,
    canDrawStagePlayer: hero.canDrawStagePlayer,
    getHeroHeadY: hero.getHeroHeadY,
    isBattlePlayerMirrored: hero.isBattlePlayerMirrored,
    drawBattlePlayerFigure,
    drawStageHeroAloft: hero.drawStageHeroAloft,
    getHanaSwingTiming, getHeroHitTintStrength, drawActiveSummons,
    drawTintedBattlePlayerFigure: tint.draw
});
