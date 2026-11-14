import * as part0 from './combat/boss-pattern-rules.mjs';
import * as part3 from './combat/boss-pattern-lifecycle.mjs';
import * as part4 from './combat/boss-pattern-warning.mjs';
// Preserve classic names until the enemy-turn, warning renderer and bootstrap consume the owners directly.
const deps = {
    get COMBAT_GRID_CONFIG() { return COMBAT_GRID_CONFIG; },
    get bossMoves() { return bossMoves; },
    get _t() { return _t; },
    get roomInvaders() { return roomInvaders; },
    get cosmosBossPattern() { return globalThis.getCosmosBossPatternState; },
    get authoredAtlas() { return globalThis.atlasEndgame; },
    get woodsmanBattle() { return woodsmanBattle; },
    get enemyAttackRules() { return enemyAttackRules; },
    get getCombatTime() { return getCombatTime; },
    get getClosestGridUnitCell() { return getClosestGridUnitCell; },
    get getSkillStageFootprint() { return getSkillStageFootprint; }
};
const env = { deps };
const bossPatternBridge = {
    getBossWarningCells(state, pending) { return part4.bossGetBossWarningCells(env, state, pending); },
    getBossPatternPreview(enemy) { return part3.bossGetBossPatternPreview(env, enemy); },
    consumeBossPatternAttack(enemy) { return part3.bossConsumeBossPatternAttack(env, enemy); },
    refreshBossPatternPreview(enemy) { return part3.bossRefreshBossPatternPreview(env, enemy); },
    getBossPatternModeLabel(mode) { return part0.bossGetBossPatternModeLabel(mode); },
    getBossPatternDescription(mode) { return part0.bossGetBossPatternDescription(mode); },
    getBossPatternPeakDamageMultiplier(mode) { return part0.bossGetBossPatternPeakDamageMultiplier(mode); },
    getMaximumBossPatternDamageMultiplier() { return part0.bossGetMaximumBossPatternDamageMultiplier(); },
    getBossPatternModesForLoop(loopValue) { return part0.bossGetBossPatternModesForLoop(loopValue); },
    getMaximumBossPatternDamageMultiplierForLoop(loopValue) { return part0.bossGetMaximumBossPatternDamageMultiplierForLoop(loopValue); },
    updateBossPatternTelegraph(enemy, now, target, chargePerSec) { return part4.bossUpdateBossPatternTelegraph(env, enemy, now, target, chargePerSec); }
};
safeExposeGlobals(bossPatternBridge);
