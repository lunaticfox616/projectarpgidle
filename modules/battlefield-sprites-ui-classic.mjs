import { HERO_MOTIONS, HERO_SPRITE_CONFIG } from './data/hero-motion-layout.mjs';
import { createBattlefieldViewport } from './rendering/battlefield-viewport.mjs';
import { createSkillVisualCache, battleZoneTheme, paintCriticalHit } from './rendering/battlefield-look.mjs';
import { createLegacyHeroRenderer } from './rendering/legacy-hero-sprites.mjs';
import { createLegacyEnemyRenderer } from './rendering/legacy-enemy-sprites.mjs';
import { createBattleCanvasBox } from './browser/battle-canvas-box.mjs';
import { drawActorShadow } from './rendering/battle-sprite-alpha.mjs';

const currentZone = () => getZone(window.GameModules.state.game.currentZoneId);
const canvasBox = createBattleCanvasBox({
    document, now: () => performance.now(),
    get ResizeObserver() { return typeof ResizeObserver === 'undefined' ? undefined : ResizeObserver; },
    get MutationObserver() { return typeof MutationObserver === 'undefined' ? undefined : MutationObserver; }
});
const viewport = createBattlefieldViewport({
    document,
    get layout() { return ACT_BATTLE_MAP_LAYOUT; },
    get bossSpawn() { return COMBAT_GRID_CONFIG.bossSpawn; },
    get uiDisplay() { return uiDisplay; },
    canvasBox,
    get stageView() { return stageView; },
    get exploration() { return actExplorationView; },
    get stageBoard() { return typeof stageBoard === 'undefined' ? undefined : stageBoard; },
    hasExploration: () => actExplorationState.current(window.GameModules.state.game), currentZone,
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get getGridUnitFootprint() { return getGridUnitFootprint; }
});
const skillVisuals = createSkillVisualCache(() => SKILL_DB);
const hero = createLegacyHeroRenderer({
    get heroSizeScale() { return HERO_SIZE_SCALE; },
    get assets() { return battleAssets; },
    get motions() { return HERO_MOTIONS; },
    get sheetConfig() { return HERO_SPRITE_CONFIG; },
    get debugAnchors() { return DEBUG_BATTLE_ANCHORS; },
    playback: now => getSkillPlaybackState(now),
    playerStats: () => getUiPlayerStats(),
    effects: () => battleFx,
    appearance: () => typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : window.GameModules.state.game.selectedHeroId,
    activeSkillData: () => {
        const state = window.GameModules.state.game;
        const name = state && typeof state.activeSkill === 'string' ? state.activeSkill : '';
        return SKILL_DB && name && SKILL_DB[name] ? SKILL_DB[name] : null;
    },
    get getSpriteFrameRectByIndex() { return getSpriteFrameRectByIndex; },
    get getHeroFrameMeta() { return getHeroFrameMeta; },
    get getHeroDrawMetrics() { return getHeroDrawMetrics; },
    drawPixelShadow: drawActorShadow,
    get drawBattleSprite() { return drawBattleSprite; }
});
const enemies = createLegacyEnemyRenderer({
    get outlinePalette() { return BATTLE_SPRITE_OUTLINES; },
    get assets() { return battleAssets; },
    get noteEnemyDrawnHeight() { return noteEnemyDrawnHeight; },
    drawPixelShadow: drawActorShadow,
    get drawBattleSprite() { return drawBattleSprite; },
    get shouldMirrorEnemySprite() { return shouldMirrorEnemySprite; },
    get bossAttackView() { return bossAttackView; }
});

// Temporary composition port, retired when canvas-battlefield and UI join the native entry.
window.GameModules.battlefieldPresentation = Object.freeze({
    viewport, canvasBox, skillVisuals, drawHero: hero.draw, drawEnemy: enemies.draw,
    dispose: () => { skillVisuals.dispose(); viewport.dispose(); canvasBox.dispose(); }
});
safeExposeGlobals({
    resizeBattlefieldCanvas: viewport.resize,
    getBattleGridProjection: viewport.projection,
    getFixedBattleGridProjection: viewport.fixedProjection,
    getBattleLayout: viewport.layout,
    getBattleZoneTheme: zone => battleZoneTheme(zone || currentZone()),
    getBattleSkillVisual: skillVisuals.get,
    drawBattleBackdrop: (...args) => viewport.background(args[0], args[1], args[2], args[6]),
    drawEnemySprite: (...args) => {
        const [ctx, enemy, x, y, scale, flash, now, moving, attackMotion, facingDirection] = args;
        return enemies.draw(ctx, enemy, { x, y, scale, flash, now, moving, attackMotion, facingDirection });
    },
    drawBattleHitFx: (...args) => paintCriticalHit(args[0], args[1], args[2], args[4])
});
