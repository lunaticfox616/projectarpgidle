const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');

(async function runOfflineProgressSmoke() {

const runtime = buildGameRuntime();
const {
    ensureOfflineProgressState,
    getOfflineLifetimeEntitlement,
    syncOfflineProgressEntitlement,
    getOfflineProgressConfig,
    purchaseOfflineProgressUpgrade,
    purchaseOfflineDirective,
    routeOfflineItem,
    getOfflineProgressView,
    buildOfflineProgressHtml,
    getOfflineSafetyStopReason,
    mergeDefaults,
    simulateBackgroundCombat,
    simulateBackgroundCombatChunked,
    applyOfflineHuntDirective
} = runtime;

function state(extra) {
    return { loopCount: 0, currencies: { timeRemnant: 0 }, inventory: [], ...extra };
}

assert.strictEqual(getOfflineLifetimeEntitlement(0), 0);
assert.strictEqual(getOfflineLifetimeEntitlement(1), 1);
assert.strictEqual(getOfflineLifetimeEntitlement(9), 9);
assert.strictEqual(getOfflineLifetimeEntitlement(10), 11);
assert.strictEqual(getOfflineLifetimeEntitlement(19), 29);
assert.strictEqual(getOfflineLifetimeEntitlement(20), 32);
assert.strictEqual(getOfflineLifetimeEntitlement(49), 149);
assert.strictEqual(getOfflineLifetimeEntitlement(50), 155);
assert.strictEqual(getOfflineLifetimeEntitlement(71), 281);
assert.strictEqual(getOfflineLifetimeEntitlement(100), 281);
let legacySave = mergeDefaults({ season: 40, loopCount: 0, currencies: { timeRemnant: 0 } });
assert.strictEqual(legacySave.currencies.timeRemnant, 99, 'legacy season saves receive retroactive entitlement on load');
assert.strictEqual(legacySave.offlineProgress.lifetimeGranted, 99);

let rewardState = state({ loopCount: 10 });
let first = syncOfflineProgressEntitlement(rewardState);
let second = syncOfflineProgressEntitlement(rewardState);
assert.strictEqual(first.grant, 11);
assert.strictEqual(second.grant, 0);
assert.strictEqual(rewardState.currencies.timeRemnant, 11);
assert.strictEqual(rewardState.offlineProgress.lifetimeGranted, 11);

let upgraded = state({ currencies: { timeRemnant: 10 } });
assert.strictEqual(purchaseOfflineProgressUpgrade('recognition', upgraded).ok, true);
assert.strictEqual(getOfflineProgressConfig(upgraded).recognitionHours, 6);
assert.strictEqual(purchaseOfflineProgressUpgrade('efficiency', upgraded).ok, true);
assert.strictEqual(purchaseOfflineDirective('hunt', upgraded).ok, false, 'remaining wallet cannot buy hunt after upgrades');
assert.strictEqual(upgraded.currencies.timeRemnant, 7);
let maxState = state({ currencies: { timeRemnant: 999 } });
maxState.offlineProgress = { recognitionLevel: 7 };
assert.strictEqual(purchaseOfflineProgressUpgrade('recognition', maxState).reason, 'max-level');
assert.strictEqual(purchaseOfflineProgressUpgrade('recognition', { loopCount: 0 }).reason, 'insufficient');

let stashState = state({ offlineProgress: { stashLevel: 1, lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' }, stash: [] } });
assert.strictEqual(routeOfflineItem({ name: 'common', rarity: 'normal' }, stashState, {}).action, 'stored');
assert.strictEqual(routeOfflineItem({ name: 'unique', rarity: 'unique' }, stashState, { protected: true }).action, 'stored');
stashState.offlineProgress.stash = Array.from({ length: 8 }, (_, index) => ({ name: `locked${index}`, rarity: 'unique' }));
assert.strictEqual(routeOfflineItem({ name: 'ordinary', rarity: 'normal' }, stashState, {}).action, 'salvage');
assert.strictEqual(routeOfflineItem({ name: 'chase', rarity: 'unique' }, stashState, { protected: true }).overflowProtected, true);
assert.strictEqual(stashState.offlineProgress.stash.length, 8);
assert.strictEqual(stashState.offlineProgress.protectedOverflow.length, 1);
let lockedState = state({ offlineProgress: { stashLevel: 1, lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' }, stash: [] } });
routeOfflineItem({ name: 'locked', rarity: 'normal', locked: true }, lockedState, {});
assert.strictEqual(lockedState.offlineProgress.stash[0].offlineProtected, true);
let protectedOverflow = Array.from({ length: 129 }, (_, index) => ({ name: `u${index}`, rarity: 'unique', offlineProtected: true }));
lockedState.offlineProgress.stash = protectedOverflow;
ensureOfflineProgressState(lockedState);
let lockedView = getOfflineProgressView(lockedState);
assert.strictEqual(lockedView.stash.length, lockedView.stashSlots, 'main stash stays within capacity');
assert.strictEqual(lockedView.protectedOverflow.length, lockedView.protectedOverflowSlots, 'protected overflow stays within its dedicated limit');
assert.strictEqual(lockedView.stash.length + lockedView.protectedOverflow.length, 40);
let protectedFallback = routeOfflineItem({ name: 'overflow-limit', rarity: 'unique' }, lockedState, {});
assert.strictEqual(protectedFallback.action, 'normal', 'a protected item must fall back to regular inventory instead of salvage');
assert.strictEqual(protectedFallback.protected, true);
assert.strictEqual(lockedState.offlineProgress.stash.length + lockedState.offlineProgress.protectedOverflow.length, 40, 'protected queues remain bounded after fallback');
let inventoryFallbackState = mergeDefaults({
    inventory: [], offlineProgress: { stashLevel: 1 }
});
inventoryFallbackState.offlineProgress.stash = protectedOverflow.slice(0, 8);
inventoryFallbackState.offlineProgress.protectedOverflow = protectedOverflow.slice(8, 40);
inventoryFallbackState.settings.autoSalvageEnabled = true;
inventoryFallbackState.settings.autoSalvageRarities.unique = true;
runtime.document.getElementById = () => ({ innerText: '', innerHTML: '', style: {}, classList: { add() {} } });
let fallbackAdded = false;
let inventoryFallbackResult = simulateBackgroundCombat({ elapsedMs: 100, snapshot: inventoryFallbackState, stepFn: () => {
    if (!fallbackAdded) fallbackAdded = runtime.addItemToInventory({ name: 'kept-unique', rarity: 'unique' });
} });
assert.strictEqual(fallbackAdded, true);
assert.deepStrictEqual(inventoryFallbackResult.game.inventory.map(item => item.name), ['kept-unique'], 'protected fallback item enters regular inventory');
let fullInventoryState = mergeDefaults({ inventory: Array.from({ length: 30 }, (_, index) => ({ name: `filled-${index}`, rarity: 'normal' })), offlineProgress: { stashLevel: 1 } });
fullInventoryState.offlineProgress.stash = protectedOverflow.slice(0, 8);
fullInventoryState.offlineProgress.protectedOverflow = protectedOverflow.slice(8, 40);
let fullFallbackAdded = false;
let fullFallbackResult = simulateBackgroundCombat({ elapsedMs: 100, snapshot: fullInventoryState, stepFn: () => {
    if (!fullFallbackAdded) fullFallbackAdded = runtime.addItemToInventory({ name: 'last-kept-unique', rarity: 'unique' });
} });
assert.strictEqual(fullFallbackAdded, true);
assert.strictEqual(fullFallbackResult.game.inventory.at(-1).name, 'last-kept-unique', 'the item that triggers the safety stop remains owned');
assert.strictEqual(fullFallbackResult.stopReason, 'protected-storage-full', 'background replay stops before protected inventory can grow without bound');
assert.ok(buildOfflineProgressHtml(getOfflineProgressView(stashState)).includes('보호 대기열 1/32'));
let legacyLockedState = state({ offlineProgress: { stashLevel: 1, stash: [{ name: 'legacy-locked', rarity: 'normal', locked: true }] } });
ensureOfflineProgressState(legacyLockedState);
assert.strictEqual(legacyLockedState.offlineProgress.stash[0].offlineProtected, true);

let migrated = { loopCount: 3, currencies: { timeRemnant: 2 } };
ensureOfflineProgressState(migrated);
assert.strictEqual(migrated.offlineProgress.version, 1);
assert.deepStrictEqual(migrated.offlineProgress.stash, []);
let safe = state({ offlineProgress: { safeReturnUnlocked: true, safetyPolicy: { consecutiveDeaths: 3, noKillMinutes: 10, stopOnNegativeExp: false, stopWhenStorageFull: false }, huntMode: 'push', stash: [] } });
assert.strictEqual(getOfflineSafetyStopReason(safe, { deaths: 3, consecutiveDeaths: 3, kills: 5 }, 1000), 'consecutive-deaths');
assert.strictEqual(getOfflineSafetyStopReason(safe, { deaths: 0, consecutiveDeaths: 0, kills: 2, elapsedSinceLastKillMs: 10 * 60 * 1000 }, 10 * 60 * 1000), 'no-kill');
assert.strictEqual(getOfflineSafetyStopReason(safe, { deaths: 3, consecutiveDeaths: 1, kills: 5, elapsedSinceLastKillMs: 1000 }, 1000), null);
safe.offlineProgress.safetyPolicy.stopOnNegativeExp = true;
assert.strictEqual(getOfflineSafetyStopReason(safe, { exp: 20, expLost: 5, consecutiveDeaths: 0, elapsedSinceLastKillMs: 1000 }, 1000), null);
assert.strictEqual(getOfflineSafetyStopReason(safe, { exp: 5, expLost: 20, consecutiveDeaths: 0, elapsedSinceLastKillMs: 1000 }, 1000), 'negative-exp');

let stopSnapshot = state({ playerHp: 1, level: 1, exp: 0, loopKills: 0, loopDeaths: 0, moveTimer: 0, runProgress: 0, offlineProgress: { huntDirectiveUnlocked: false, safeReturnUnlocked: true, stash: [], safetyPolicy: { consecutiveDeaths: 5, noKillMinutes: 5, stopOnNegativeExp: false, stopWhenStorageFull: false } } });
let syncCalls = 0;
let syncResult = simulateBackgroundCombat({ elapsedMs: 6 * 60 * 1000, snapshot: stopSnapshot, stepFn: () => { syncCalls++; } });
assert.ok(syncCalls < 4000, 'sync safety stop exits the outer replay loop');
assert.strictEqual(syncResult.stopReason, 'no-kill');
let originalPerformanceNow = runtime.performance.now;
runtime.performance.now = () => 0;
let asyncResult = await simulateBackgroundCombatChunked({ elapsedMs: 6 * 60 * 1000, snapshot: stopSnapshot, stepFn: () => {} });
runtime.performance.now = originalPerformanceNow;
assert.strictEqual(asyncResult.stopReason, 'no-kill');
let huntState = state({ settings: { mapCompleteAction: 'nextZone' }, offlineProgress: { huntDirectiveUnlocked: true, huntMode: 'current', stash: [] } });
applyOfflineHuntDirective(huntState);
assert.strictEqual(huntState.settings.mapCompleteAction, 'repeatZone');
huntState.offlineProgress.huntMode = 'highestCleared';
applyOfflineHuntDirective(huntState);
assert.strictEqual(huntState.settings.mapCompleteAction, 'nextLoopBestPlusOne');
let bossState = state({ enemies: [{ isBoss: true, hp: 10 }], offlineProgress: { huntDirectiveUnlocked: true, huntMode: 'stopBeforeBoss', stash: [] } });
assert.strictEqual(getOfflineSafetyStopReason(bossState, {}, 0), 'before-boss');
let bossMarkerState = state({ runProgress: 79.95, encounterPlan: [{ at: 80, boss: true }], offlineProgress: { huntDirectiveUnlocked: true, huntMode: 'stopBeforeBoss', stash: [] } });
assert.strictEqual(getOfflineSafetyStopReason(bossMarkerState, {}, 0), 'before-boss');

console.log('smoke-offline-progress: ok');
}()).catch(error => { console.error(error); process.exitCode = 1; });
