import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
import { clearResolveNextLoopBestPlusOneZone } from '../combat/clear-progression.mjs';

// Called only after a map/floor payout, never between waves of a committed expedition.
export function* clearContinueMapAfterClear(env, zone) {
    if (env.deps.isSkyTowerAtRewardLimit(zone)) {
        env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
        env.owner.moveTimer = 0;
        return;
    }
    if (env.owner.settings.mapCompleteAction === 'stop') {
        env.owner.combatHalted = true;
        env.owner.moveTimer = 0;
        env.owner.enemies = [];
        env.owner.encounterPlan = [];
        env.owner.encounterIndex = 0;
        env.owner.runProgress = 0;
        return;
    }
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    env.deps.startMoving(false);
}

/** Where the hero goes after a zone clear: the map action's zone (or a stop), the act retreat hold, a deferred departure. */
export function* clearDepartAfterZoneClear(env, zone, mapAction) {
    if (mapAction === 'repeatZone') env.owner.currentZoneId = zone.id;
    else if (mapAction === 'nextLoopBestPlusOne') {
        let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
        env.owner.currentZoneId = nextZone !== null ? nextZone : env.deps.getAutoProgressZoneId(Math.max(env.owner.currentZoneId, env.owner.maxZoneId));
    }
    else if (mapAction === 'stop') {
        env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
        (yield { kind: 'finishRedraw', args: [] });
        (yield { kind: 'queueImportantSave', args: [180] });
        return;
    } else if (!env.deps.holdActRetreat(zone)) env.owner.currentZoneId = env.deps.getAutoProgressZoneId(Math.max(env.owner.currentZoneId, env.owner.maxZoneId));
    if(env.deps.actExplorationProgress.deferDeparture(env.owner)) {
        (yield { kind: 'finishUnlocks', args: [] });(yield { kind: 'finishRedraw', args: [] });(yield { kind: 'queueImportantSave', args: [220] });return;
    }
    env.deps.actExplorationProgress.reconcileDeparture(env.owner);
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    (yield { kind: 'finishUnlocks', args: [] });
    if ((env.owner.settings.townReturnAction || 'retry') === 'stop') {
        env.deps.actExplorationProgress.stopAfterCompletion(env.owner);
    } else env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [220] });
}
