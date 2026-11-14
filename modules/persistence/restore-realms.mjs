import { clampFiniteNumber } from './saved-number.mjs';
import { normalizeLoopGateFlags } from './saved-settings.mjs';
import { normalizeSkillSlotsSave } from './saved-gems.mjs';

export function restoreRealmDefaults(deps, context) {
    restoreRealmStatesAndSkyCurrency(deps, context);
    restoreRealmBonusesAndFloors(deps, context);
}

export function restoreUnderworldProgress(deps, context) {
    // A save from before the underworld starts it like a new one (2026-10-19 user: the old copy from chaos realm floors kept only
    // the floor 10 credit, which opened the underworld without its entry conditions).
    context.merged.underworldProgress = { ...(deps.defaultGame.underworldProgress || { highestFloor: 1, currentFloor: 1 }), ...(context.merged.underworldProgress || {}) };
    context.merged.underworldProgress.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.underworldProgress.highestFloor, 1, 1)));
    context.merged.underworldProgress.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.underworldProgress.currentFloor, 1, 1)));
    context.merged.underworldProgress.deepRewardFloor = Math.floor(clampFiniteNumber(context.merged.underworldProgress.deepRewardFloor, 0, 0, Number.MAX_SAFE_INTEGER - deps.UNDERWORLD_DEEP_FLOOR_REWARD.every));
    let savedRunes = (context.merged.underworldRunes && typeof context.merged.underworldRunes === 'object') ? context.merged.underworldRunes : {};
    let underworld10ClearCredit = !!context.merged.underworldProgress.floor10Cleared
        || Math.max(0, Math.floor(Number(savedRunes.unlockedSlots) || 0)) >= 1
        || Math.max(0, Math.floor(Number(savedRunes.unlockedRunesMaxNumber) || 0)) >= 1;
    context.merged.underworldProgress.floor10Cleared = underworld10ClearCredit;
    if (!underworld10ClearCredit) {
        context.merged.underworldProgress.highestFloor = Math.min(context.merged.underworldProgress.highestFloor, 10);
        context.merged.underworldProgress.currentFloor = Math.min(context.merged.underworldProgress.currentFloor, context.merged.underworldProgress.highestFloor);
    }
}

export function restoreChaosProgress(deps, context) {
    context.merged.chaosRealm.clearedFloors = Array.isArray(context.merged.chaosRealm.clearedFloors) ? Array.from(new Set(context.merged.chaosRealm.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    context.merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(context.merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(deps.CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { context.merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(context.merged.chaosRealm.permanentBonuses[key]) || 0); });
    if (context.merged.chaosRealm.unlocked && context.merged.chaosRealm.highestFloor < 1) context.merged.chaosRealm.highestFloor = 1;
}

export function restoreSkyAndWoodsmanScores(deps, context) {
    restoreSkyLoopFloors(context);
    restoreSkyRewardsAndBoosts(deps, context);
    restoreWoodsmanScoresAndEcho(deps, context);
}

export function restoreEchoAndLoopRecords(deps, context) {
    context.merged.woodsmanEchoRun.timeLeft = clampFiniteNumber(context.merged.woodsmanEchoRun.timeLeft, 0, 0, 30);
    context.merged.woodsmanEchoRun.duration = 30;
    context.merged.woodsmanEchoRun.lastTickAt = clampFiniteNumber(context.merged.woodsmanEchoRun.lastTickAt, 0, 0);
    context.merged.woodsmanEchoRun.totalDamage = Math.floor(clampFiniteNumber(context.merged.woodsmanEchoRun.totalDamage, 0, 0));
    context.merged.woodsmanEchoRun.bestDps = clampFiniteNumber(context.merged.woodsmanEchoRun.bestDps, 0, 0);
    context.merged.loopProgressBase = { ...(deps.defaultGame.loopProgressBase || {}), ...(context.merged.loopProgressBase || {}) };
    context.merged.loopProgressCurrent = { ...(deps.defaultGame.loopProgressCurrent || {}), ...(context.merged.loopProgressCurrent || {}), ...Object.fromEntries(['bestSkyFloor','bestUnderworldFloor'].map(key => [key, Number.isFinite(context.save?.loopProgressCurrent?.[key]) ? Math.max(0,Math.floor(context.save.loopProgressCurrent[key])) : null])) };
    context.merged.loopProgressBase.specialBosses = Array.isArray(context.merged.loopProgressBase.specialBosses) ? context.merged.loopProgressBase.specialBosses : [];
    context.merged.loopProgressCurrent.specialBosses = Array.isArray(context.merged.loopProgressCurrent.specialBosses) ? context.merged.loopProgressCurrent.specialBosses : [];
    context.merged.loopProgressCurrent.cosmosPlanets = Array.isArray(context.merged.loopProgressCurrent.cosmosPlanets) ? Array.from(new Set(context.merged.loopProgressCurrent.cosmosPlanets.filter(Boolean))) : [];
}

export function restoreLoopGatesAndSkillSlots(deps, context) {
    restoreCosmosLoopCount(deps, context);
    restoreLoopCompletionAndSlots(deps, context);
}

function restoreRealmStatesAndSkyCurrency(deps, context) {
    context.merged.chaosRealm = { ...(0, deps.createDefaultChaosRealmState)(), ...(context.merged.chaosRealm || {}) };
    context.merged.skyTower = { ...(0, deps.createDefaultSkyTowerState)(), ...(context.merged.skyTower || {}) };
    const legacyCondensedSkyPower = Math.max(0, Math.floor(Number(context.merged.currencies.condensedSkyPower) || 0));
    if (legacyCondensedSkyPower > 0) {
        context.merged.skyTower.condensedPower = Math.max(0, Math.floor(Number(context.merged.skyTower.condensedPower) || 0)) + legacyCondensedSkyPower;
    }
}

function restoreRealmBonusesAndFloors(deps, context) {
    delete context.merged.currencies.condensedSkyPower;
    context.merged.skyTower.skyStone = { ...((0, deps.createDefaultSkyTowerState)().skyStone || {}), ...((context.merged.skyTower || {}).skyStone || {}) };
    context.merged.skyTower.gemBoosts = { ...((context.merged.skyTower || {}).gemBoosts || {}) };
    context.merged.chaosRealm.permanentBonuses = { ...deps.CHAOS_REALM_DEFAULT_BONUSES, ...((context.merged.chaosRealm || {}).permanentBonuses || {}) };
    context.merged.chaosRealm.unlocked = !!context.merged.chaosRealm.unlocked;
    context.merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(context.merged.chaosRealm.highestFloor, 0, 0)));
    context.merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.chaosRealm.currentFloor, 1, 1)));
}

function restoreSkyLoopFloors(context) {
    context.merged.skyTower.unlocked = !!context.merged.skyTower.unlocked;
    context.merged.skyTower.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(context.merged.skyTower.highestFloor, 1, 1)));
    context.merged.skyTower.currentFloor = Math.max(1, Math.min(context.merged.skyTower.highestFloor, Math.floor(clampFiniteNumber(context.merged.skyTower.currentFloor, 1, 1))));
    context.merged.skyTower.loopSeason = Math.max(1, Math.floor(clampFiniteNumber(context.merged.skyTower.loopSeason, context.merged.season || 1, 1)));
    if (context.merged.skyTower.loopSeason !== Math.max(1, Math.floor(context.merged.season || 1))) { context.merged.skyTower.loopSeason = Math.max(1, Math.floor(context.merged.season || 1)); context.merged.skyTower.clearedThisLoop = 0; }
}

function restoreSkyRewardsAndBoosts(deps, context) {
    context.merged.skyTower.clearedThisLoop = Math.max(0, Math.min((0, deps.getSkyTowerLoopClearLimit)(), Math.floor(clampFiniteNumber(context.merged.skyTower.clearedThisLoop, 0, 0))));
    context.merged.skyTower.lastResult = (0, deps.normalizeSkyTowerResult)(context.merged.skyTower.lastResult, context.merged.season);
    context.merged.skyTower.clearedFloors = Array.isArray(context.merged.skyTower.clearedFloors) ? Array.from(new Set(context.merged.skyTower.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    context.merged.skyTower.condensedPower = Math.max(0, Math.floor(clampFiniteNumber(context.merged.skyTower.condensedPower, 0, 0)));
    context.merged.skyTower.skyStone.level = Math.max(0, Math.min((0, deps.getSkyStoneMaxLevel)(), Math.floor(clampFiniteNumber(context.merged.skyTower.skyStone.level, 0, 0))));
    context.merged.skyTower.skyStone.crafted = !!context.merged.skyTower.skyStone.crafted || context.merged.skyTower.skyStone.level > 0;
    Object.keys(context.merged.skyTower.gemBoosts).forEach(name => { context.merged.skyTower.gemBoosts[name] = Math.max(0, Math.min((0, deps.getSkyTowerGemBoostMaxLevel)(), Math.floor(clampFiniteNumber(context.merged.skyTower.gemBoosts[name], 0, 0)))); if (context.merged.skyTower.gemBoosts[name] <= 0) delete context.merged.skyTower.gemBoosts[name]; });
    if (!context.merged.skyTower.unlocked && ((context.merged.season || 1) > 15 || ((context.merged.season || 1) >= 15 && (context.merged.loopProgressCurrent && context.merged.loopProgressCurrent.chaos20Cleared)))) context.merged.skyTower.unlocked = true;
}

function restoreWoodsmanScoresAndEcho(deps, context) {
    context.merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanPendingScore, deps.defaultGame.woodsmanPendingScore || 0, 0)));
    context.merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanLifetimeScore, deps.defaultGame.woodsmanLifetimeScore || 0, 0)));
    context.merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(context.merged.woodsmanSettledScore, deps.defaultGame.woodsmanSettledScore || 0, 0)));
    context.merged.woodsmanEchoRun = (context.merged.woodsmanEchoRun && typeof context.merged.woodsmanEchoRun === 'object') ? context.merged.woodsmanEchoRun : { active:false, timeLeft:0, duration:30, lastTickAt:0, totalDamage:0, bestDps:0 };
    context.merged.woodsmanEchoRun.active = !!context.merged.woodsmanEchoRun.active && context.merged.currentZoneId === deps.WOODSMAN_ECHO_ZONE_ID;
}

function restoreCosmosLoopCount(deps, context) {
    context.merged.cosmosLoopCount = Math.max(0, Math.floor(clampFiniteNumber(context.merged.cosmosLoopCount, deps.defaultGame.cosmosLoopCount || 0, 0)));
}

function restoreLoopCompletionAndSlots(deps, context) {
    context.merged.lastLoopAdvancePath = ['chaos', 'cosmos'].includes(context.merged.lastLoopAdvancePath) ? context.merged.lastLoopAdvancePath : null;
    context.merged.loopProgressCurrent.chaos20Cleared = !!context.merged.loopProgressCurrent.chaos20Cleared || (Array.isArray(context.merged.abyssClearedDepths) && context.merged.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
    if (!context.merged.skyTower.unlocked && (context.merged.season || 1) >= 15 && context.merged.loopProgressCurrent.chaos20Cleared) context.merged.skyTower.unlocked = true;
    normalizeLoopGateFlags(context.merged);
    context.merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendPoints, deps.defaultGame.ascendPoints, 0)));
    context.merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(context.merged.ascendRank, deps.defaultGame.ascendRank, 0, 5)));
    // 재능 개화는 5
    normalizeSkillSlotsSave(deps, context.merged);
    if (Array.isArray(context.merged.woodsmanBuildSnapshot?.skills)) normalizeSkillSlotsSave(deps, context.merged.woodsmanBuildSnapshot);
}
