import { createUniqueHunt } from './domain/unique-hunt.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';

const rules = createUniqueHunt({
    get UNIQUE_DB() { return UNIQUE_DB; },
    get _t() { return _t; }
});
const UNIQUE_HUNT_TARGET_LIMIT = rules.limit;
const getUniqueHuntEntryKey = rules.getKey;
const getUniqueHuntEntry = rules.getEntry;
function ensureUniqueHuntState(targetGame = game) { return rules.ensureState(targetGame); }
function getUniqueHuntTargets(targetGame = game) { return rules.getTargets(targetGame); }
function toggleUniqueHuntTarget(key, targetGame = game) {
    return runRuntimeEventCommands(rules.toggle(key, targetGame), dispatchRuntimeEvent);
}
function isUniqueHuntTargetItem(item, targetGame = game) { return rules.isTargetItem(item, targetGame); }
function completeUniqueHuntTarget(item, targetGame = game) {
    return runRuntimeEventCommands(rules.complete(item, targetGame, targetGame === game), dispatchRuntimeEvent);
}
const uniqueHuntRuntime = Object.freeze({
    limit: UNIQUE_HUNT_TARGET_LIMIT, ensureState: ensureUniqueHuntState, getKey: getUniqueHuntEntryKey,
    getEntry: getUniqueHuntEntry, getTargets: getUniqueHuntTargets, toggle: toggleUniqueHuntTarget,
    isTargetItem: isUniqueHuntTargetItem, complete: completeUniqueHuntTarget
});
safeExposeGlobals({ UNIQUE_HUNT_TARGET_LIMIT, getUniqueHuntEntryKey, getUniqueHuntEntry, ensureUniqueHuntState,
    getUniqueHuntTargets, toggleUniqueHuntTarget, isUniqueHuntTargetItem, completeUniqueHuntTarget, uniqueHuntRuntime });
