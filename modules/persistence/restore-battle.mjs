import { normalizePlayerAilmentRow, normalizeConditionDebuffMap } from './saved-combat-values.mjs';
import { clampFiniteNumber } from './saved-number.mjs';
import { normalizeRecentDamageEvent, normalizeEnemyRecord, pruneEnemyRuntimeMap, normalizeEncounterMarker } from './saved-enemy-records.mjs';
import { normalizeDeathLog, normalizeActRetreat } from './saved-damage-history.mjs';
import { restoreEnemyCasts } from './saved-enemy-casts.mjs';

export function restoreDamageHistory(deps, context) {
    context.merged.abyssClearedDepths = Array.isArray(context.merged.abyssClearedDepths) ? context.merged.abyssClearedDepths.map(v => Math.max(1, Math.floor(v || 1))).filter(v => v <= 20) : [];
    context.merged.playerAilments = Array.isArray(context.merged.playerAilments) ? context.merged.playerAilments.map(row => normalizePlayerAilmentRow(row, clampFiniteNumber)).filter(row => row.type) : [];
    context.merged.playerLeechInstances = Array.isArray(context.merged.playerLeechInstances) ? context.merged.playerLeechInstances.map(row => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === 'energyShield' ? 'energyShield' : 'life' })).filter(row => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    context.merged.recentDamageEvents = Array.isArray(context.merged.recentDamageEvents) ? context.merged.recentDamageEvents.map(((...args) => normalizeRecentDamageEvent(deps, ...args))).filter(Boolean) : [];
    context.merged.lastDeathLog = normalizeDeathLog(deps, context.merged.lastDeathLog);
    context.merged.actRetreat = normalizeActRetreat(deps, context.merged.actRetreat);
}

export function restoreEnemyRecords(deps, context) {
    context.merged.enemies = Array.isArray(context.merged.enemies) ? context.merged.enemies.map(((...args) => normalizeEnemyRecord(deps, context.merged, ...args))).filter(Boolean) : [];
    deps.actExplorationState.dropRetired(context.merged);
    deps.actExplorationState.upgradeRotation(context.merged);
    if(context.merged.actExploration) {
        // Validate the original ownership/HP first so normalization cannot revive a corrupt record.
        deps.actExplorationState.validate(context.merged.actExploration, context.save.enemies || []);
        context.merged.actExploration.packs.forEach(pack=>{pack.waiting=pack.waiting.map(((...args) => normalizeEnemyRecord(deps, context.merged, ...args)));});
    }
    restoreEnemyCasts(deps, context.merged);
}

export function restoreEnemyRuntimeMaps(context) {
    let aliveEnemyIds = new Set((context.merged.enemies || []).map(enemy => String(enemy.id)));
    ['enemyKeystoneDebuffs', 'rangerWeakpointMarks', 'enemyUniqueChaosResDown', 'enemyUniqueElementalResDown'].forEach(key => { context.merged[key] = pruneEnemyRuntimeMap(aliveEnemyIds, context.merged[key], { maxKeys: 120 }); });
    context.merged.enemyConditionDebuffs = normalizeConditionDebuffMap(context.merged.enemyConditionDebuffs);
    context.merged.encounterPlan = Array.isArray(context.merged.encounterPlan) ? context.merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
}

export function restoreLevelAndPointBudgets(deps, context) {
    restoreLevelAndWoodsmanAttempts(deps, context);
    restoreCurseAndPassiveBudget(deps, context);
}

export function restorePassiveDisplay(deps, context) {
    delete context.merged.inventoryExpandLevel;
    context.merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(context.merged.jewelInventoryExpandLevel, deps.defaultGame.jewelInventoryExpandLevel, 0)));
    context.merged.settings = { ...deps.defaultGame.settings, ...(context.merged.settings || {}) };
    delete context.merged.settings.testCharacterMotionId;
    context.merged.settings.chatMessageSize = ['small', 'medium', 'large'].includes(context.merged.settings.chatMessageSize) ? context.merged.settings.chatMessageSize : 'medium';
    const passiveVisualVersion = Math.max(0, Math.floor(Number(context.save && context.save.settings && context.save.settings.passiveTreeVisualStyleVersion) || 0));
    if (passiveVisualVersion < 1) context.merged.settings.passiveTreeShowLabels = false;
    else context.merged.settings.passiveTreeShowLabels = context.merged.settings.passiveTreeShowLabels === true;
    context.merged.settings.passiveInvestmentSummaryCollapsed = passiveVisualVersion < 2
        ? true : context.merged.settings.passiveInvestmentSummaryCollapsed === true;
    context.merged.settings.passiveTreeVisualStyleVersion = 2;
    if (typeof deps.normalizePassiveTreePlannerState === 'function') {
        context.merged.settings.passiveTreePlanner = (0, deps.normalizePassiveTreePlannerState)(context.merged.settings.passiveTreePlanner);
    }
}

export function restorePlayerResources(deps, context) {
    context.merged.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(context.merged.settings.damageNumberFormat) ? context.merged.settings.damageNumberFormat : 'comma';
    context.merged.settings.showExpComma = context.merged.settings.showExpComma !== false;
    context.merged.settings.showHpComma = context.merged.settings.showHpComma !== false;
    context.merged.settings.showEnemyHpComma = context.merged.settings.showEnemyHpComma !== false;
    context.merged.settings.showCharacterComma = context.merged.settings.showCharacterComma !== false;
    context.merged.settings.notiFilters = { ...(deps.defaultGame.settings.notiFilters || {}), ...(context.merged.settings.notiFilters || {}) };
    delete context.merged.settings.notiFilters.hideout;
    delete context.merged.settings.notiFilters.talisman;
    context.merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(context.merged.playerHp, deps.defaultGame.playerHp, 0)));
    context.merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(context.merged.playerEnergyShield, deps.defaultGame.playerEnergyShield, 0)));
    context.merged.moveTimer = clampFiniteNumber(context.merged.moveTimer, deps.defaultGame.moveTimer, 0);
    context.merged.moveTotalTime = clampFiniteNumber(context.merged.moveTotalTime, deps.defaultGame.moveTotalTime, 0);
    context.merged.runProgress = clampFiniteNumber(context.merged.runProgress, deps.defaultGame.runProgress, 0, 100);
    context.merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(context.merged.encounterIndex, deps.defaultGame.encounterIndex, 0)));
    context.merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(context.merged.nextEnemyId, deps.defaultGame.nextEnemyId, 1)));
    context.merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.seasonPoints, deps.defaultGame.seasonPoints, 0)));
    context.merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.loopDeepPoints, deps.defaultGame.loopDeepPoints, 0)));
    // Deep loop levels: whole, non-negative counts for every LOOP_DEEP_STATS key (resChaos was added 2026-10-04).
    context.merged.loopDeepStats = Object.fromEntries(deps.LOOP_DEEP_STATS.map(def => [def.key,
        Math.max(0, Math.floor(clampFiniteNumber((context.merged.loopDeepStats || {})[def.key], 0, 0)))]));
    context.merged.worldTreeBark = (0, deps.normalizeWorldTreeBark)(context.merged.worldTreeBark, context.merged);
}

function restoreLevelAndWoodsmanAttempts(deps, context) {
    context.merged.level = Math.max(1, Math.floor(clampFiniteNumber(context.merged.level, deps.defaultGame.level, 1, deps.MAX_PLAYER_LEVEL)));
    context.merged.exp = Math.max(0, Math.floor(clampFiniteNumber(context.merged.exp, deps.defaultGame.exp, 0)));
    context.merged.season = Math.max(1, Math.floor(clampFiniteNumber(context.merged.season, deps.defaultGame.season, 1)));
    context.merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.loopCount, deps.defaultGame.loopCount, 0)));
    context.merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanDefeatAttempts, deps.defaultGame.woodsmanDefeatAttempts, 0)));
    context.merged.woodsmanSimulatorSeenLoop = !!context.merged.woodsmanSimulatorSeenLoop;
    context.merged.woodsmanEntrancePending = !!(context.merged.woodsmanEntrancePending && context.merged.currentZoneId === deps.OUTSIDE_CHAOS_ZONE_ID);
}

function restoreCurseAndPassiveBudget(deps, context) {
    context.merged.woodsmanCurseActive = !!context.merged.woodsmanCurseActive;
    context.merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseDamageTakenStacks, deps.defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    context.merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseLastTickAt, deps.defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    context.merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanCurseNextLogStack, deps.defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    context.merged.chaosInfuserUnlocked = !!context.merged.chaosInfuserUnlocked || context.merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(context.merged.woodsmanDefeatAttempts || 0)) > 0 || (Array.isArray(context.merged.journalEntries) && context.merged.journalEntries.includes('woodsman'));
    context.merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(context.merged.killsInZone, deps.defaultGame.killsInZone, 0)));
    context.merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.passivePoints, deps.defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(context.merged.autoRefundedPassivePoints || 0)) + context.pendingJournalPassivePoints;
    deps.passiveRouting.reconcile(context.merged, deps.PASSIVE_TREE, (0, deps.getPassiveRouting)(context.merged), deps.passiveRouting.pointBudget(context.merged) - context.passiveAllocationNormalization.lostBonus);
}
