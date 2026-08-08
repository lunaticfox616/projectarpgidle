const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const {
    ensureOfflineProgressState,
    getOfflineLifetimeEntitlement,
    syncOfflineProgressEntitlement,
    getOfflineProgressConfig,
    purchaseOfflineProgressUpgrade,
    purchaseOfflineDirective,
    routeOfflineItem,
    getOfflineSafetyStopReason
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

let migrated = { loopCount: 3, currencies: { timeRemnant: 2 } };
ensureOfflineProgressState(migrated);
assert.strictEqual(migrated.offlineProgress.version, 1);
assert.deepStrictEqual(migrated.offlineProgress.stash, []);
let safe = state({ offlineProgress: { safeReturnUnlocked: true, safetyPolicy: { consecutiveDeaths: 3, noKillMinutes: 10, stopOnNegativeExp: false, stopWhenStorageFull: false }, huntMode: 'push', stash: [] } });
assert.strictEqual(getOfflineSafetyStopReason(safe, { deaths: 3, kills: 5 }, 1000), 'consecutive-deaths');
assert.strictEqual(getOfflineSafetyStopReason(safe, { deaths: 0, kills: 0 }, 10 * 60 * 1000), 'no-kill');

console.log('smoke-offline-progress: ok');
