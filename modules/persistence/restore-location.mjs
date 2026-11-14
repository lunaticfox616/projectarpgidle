import { getSavedZoneForValidation } from './saved-combat-runtime.mjs';
import { keepLegacyAccessorySockets } from './saved-equipment.mjs';

export function restoreNumericZones(deps, context) {
    if (typeof context.merged.maxZoneId === 'string' && /^\d+$/.test(context.merged.maxZoneId)) context.merged.maxZoneId = parseInt(context.merged.maxZoneId, 10);
    if (typeof context.merged.maxZoneId !== 'string') {
        let mergedSeasonCap = (0, deps.getSeasonFinalZoneId)(context.merged.season || 1);
        context.merged.maxZoneId = (0, deps.clampNumber)(Number.isFinite(context.merged.maxZoneId) ? context.merged.maxZoneId : 0, 0, Math.max(deps.MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof context.merged.currentZoneId !== 'string') {
        let numericZoneId = Number.isFinite(context.merged.currentZoneId) ? context.merged.currentZoneId : 0;
        let savedDepth = Math.max(Math.floor(context.merged.abyssEndlessDepth || 20), (0, deps.getAbyssDepthFromZoneId)(numericZoneId), ...((Array.isArray(context.merged.abyssUnlockedDepths) ? context.merged.abyssUnlockedDepths : [20]).map(v => Math.floor(v || 0))));
        let maxDeepZoneId = (0, deps.getAbyssZoneIdForDepth)(Math.max(20, savedDepth));
        context.merged.currentZoneId = (0, deps.clampNumber)(numericZoneId, 0, Math.max(deps.MAP_ZONES.length - 1, maxDeepZoneId));
    }
    deps.atlas.normalize(context.merged);
}

export function restoreActiveLocation(deps, context) {
    // 없어진 지역(예: 예전 세계수 지역)에서 저장했으면 액트 1이 아니라 도달한 진행 지역으로.
    if (typeof context.merged.currentZoneId === 'string' && !getSavedZoneForValidation(deps, context.merged)) context.merged.currentZoneId = (0, deps.getAutoProgressZoneId)(context.merged.maxZoneId);
    restoreInactiveRunLocation(deps, context);
    clearInactiveRunLocks(deps, context);
    restoreReachableDepthAndRoot(deps, context);
}

function restoreInactiveRunLocation(deps, context) {
    if (context.merged.currentZoneId === deps.BEYOND_BOUNDARY_ZONE_ID && !context.merged.beyondBoundary.activeRun) context.merged.currentZoneId = (0, deps.getAutoProgressZoneId)(context.merged.maxZoneId);
    if (context.merged.currentZoneId === 'beehive_run' && !(context.merged.beehive && context.merged.beehive.inRun)) context.merged.currentZoneId = context.merged.beehive && context.merged.beehive.returnZoneId !== undefined && context.merged.beehive.returnZoneId !== null ? context.merged.beehive.returnZoneId : context.merged.maxZoneId;
}

function clearInactiveRunLocks(deps, context) {
    if (context.merged.beehive && context.merged.beehive.inRun && context.merged.currentZoneId !== 'beehive_run') {
        context.merged.beehive.inRun = false;
        (0, deps.resetBeehiveRunModifiers)(context.merged.beehive);
    }
    if (context.merged.woodsmanBuildLock && (context.merged.currentZoneId !== deps.OUTSIDE_CHAOS_ZONE_ID || !context.merged.woodsmanBuildSnapshot)) {
        context.merged.woodsmanBuildLock = false;
        context.merged.woodsmanBuildSnapshot = null;
    }
}

function restoreReachableDepthAndRoot(deps, context) {
    let currentAbyssDepth = typeof context.merged.currentZoneId !== 'string' ? (0, deps.getAbyssDepthFromZoneId)(context.merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = isSavedDeepChaosSlot(context, currentAbyssDepth);
    if (typeof context.merged.maxZoneId !== 'string' && typeof context.merged.currentZoneId !== 'string' && context.merged.currentZoneId > context.merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) context.merged.currentZoneId = context.merged.maxZoneId;
    if (context.merged.discoveredPassives.length === 0) context.merged.discoveredPassives = [(0, deps.getPassiveTreeRootNodeId)(context.merged)];
}

export function restoreProgressionCaps(deps, context) {
    clampSavedProgressToSeason(deps, context);
    if ((context.merged.season || 1) >= deps.METEOR_SITE_UNLOCK_LOOP && (context.merged.maxZoneId || 0) >= deps.METEOR_SITE_UNLOCK_ACT) {
        context.merged.meteorSite.unlocked = true;
    }
    (0, deps.reconcileMapPrimaryContentUnlocks)(context.merged);
    if (!(0, deps.isMapPrimaryContentUnlocked)(context.merged, context.merged.mapSubtab)) context.merged.mapSubtab = 'map-tab-zones';
}

function clampSavedProgressToSeason(deps, context) {
    let seasonCap = (0, deps.getSeasonFinalZoneId)(context.merged.season || 1);
    if (typeof context.merged.maxZoneId !== 'string') context.merged.maxZoneId = (0, deps.clampNumber)(context.merged.maxZoneId, 0, seasonCap);
    if (typeof context.merged.currentZoneId !== 'string') {
        let normalizedDepth = (0, deps.getAbyssDepthFromZoneId)(context.merged.currentZoneId);
        let keepLegacyDeepChaosSlot = isSavedDeepChaosSlot(context, normalizedDepth);
        if ((normalizedDepth <= 20 && !keepLegacyDeepChaosSlot) || (context.merged.season || 1) < 10) context.merged.currentZoneId = (0, deps.clampNumber)(context.merged.currentZoneId, 0, seasonCap);
    }
}

function isSavedDeepChaosSlot(context, depth) {
    return (context.merged.season || 1) >= 10 && depth === 20 && Math.floor(context.merged.abyssEndlessDepth || 0) > 20;
}

export function restoreStumpAndSaveVersion(deps, context) {
    if (typeof deps.salvageRecoveryRuntime !== 'undefined') deps.salvageRecoveryRuntime.ensureState(context.merged);
    if (typeof deps.stumpBox === 'object') deps.stumpBox.restore(context.merged);
    context.merged.stumpCube = deps.stumpCube.normalize(context.merged.stumpCube);
    keepLegacyAccessorySockets(deps, context.merged, context.save);
    context.merged.saveVersion = deps.defaultGame.saveVersion;
}
