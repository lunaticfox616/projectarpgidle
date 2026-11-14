import { createBossAttacks } from './rendering/boss-attacks.mjs';

const native = createBossAttacks({
    get stageView() { return typeof stageView === 'undefined' ? undefined : stageView; },
    get getCombatTime() { return getCombatTime; },
    get performance() { return performance; },
    get bossMoves() { return bossMoves; },
    get clampNumber() { return clampNumber; },
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get getCombatGridSize() { return getCombatGridSize; },
    get actExplorationState() { return actExplorationState; },
    get getGroundTakenCellKeys() { return getGroundTakenCellKeys; },
    get actExplorationMap() { return actExplorationMap; },
    get gridCellKey() { return gridCellKey; },
    get clipSkillFootprint() { return clipSkillFootprint; },
    get hasGridCell() { return hasGridCell; },
    get getGridUnitCenter() { return getGridUnitCenter; },
    get projectSkillFootprint() { return projectSkillFootprint; },
    get clipSkillFootprintTerrain() { return clipSkillFootprintTerrain; },
    get drawBossPatternArea() { return drawBossPatternArea; },
    get battleVisualState() { return battleVisualState; },
    get battleFx() { return battleFx; },
    get attackFxSpawn() { return typeof attackFxSpawn === 'undefined' ? undefined : attackFxSpawn; },
    get playUiFeedbackSound() { return typeof playUiFeedbackSound === 'undefined' ? undefined : playUiFeedbackSound; },
    get getEnemyTelegraphColor() { return getEnemyTelegraphColor; },
    get getSkillGemVfxImage() { return typeof getSkillGemVfxImage === 'undefined' ? undefined : getSkillGemVfxImage; },
    get stageRoster() { return stageRoster; }
});
const bossAttackView = {
    groundAlpha: native.groundAlpha,
    pendingAlpha: native.pendingAlpha,
    drawMarks: (ctx, scene) => native.drawMarks(game, ctx, scene),
    addMotions: native.addMotions,
    spriteOffsetY: native.spriteOffsetY,
    drawImpact: native.drawImpact,
    drawGround: native.drawGround,
    drawHeadRelease: native.drawHeadRelease,
    isLiveWarning: native.isLiveWarning,
    warningShare: native.warningShare,
    now: native.now,
    timing: native.timing
};
safeExposeGlobals({ bossAttackView });
