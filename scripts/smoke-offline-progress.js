const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');

(async function runOfflineProgressSmoke() {

const runtime = buildGameRuntime();
const {
    ensureOfflineProgressState,
    getOfflineLifetimeEntitlement,
    syncOfflineProgressEntitlement,
    getOfflineProgressConfig,
    getInventoryLimit,
    purchaseOfflineProgressUpgrade,
    purchaseOfflineDirective,
    routeOfflineItem,
    getOfflineProgressView,
    buildOfflineProgressHtml,
    getOfflineSafetyStopReason,
    mergeDefaults,
    simulateBackgroundCombat,
    simulateBackgroundCombatChunked,
    applyOfflineHuntDirective,
    resetOfflineStashForLoop
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
assert.strictEqual(routeOfflineItem({ name: 'chase', rarity: 'unique' }, stashState, { protected: true }).action, 'normal');
assert.strictEqual(stashState.offlineProgress.stash.length, 8);
assert.strictEqual(stashState.offlineProgress.protectedOverflow.length, 0,
    '고유 아이템도 보관함 표시 한도를 넘는 별도 대기열에 쌓이면 안 된다');
let lockedState = state({ offlineProgress: { stashLevel: 1, lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' }, stash: [] } });
routeOfflineItem({ name: 'locked', rarity: 'normal', locked: true }, lockedState, {});
assert.strictEqual(lockedState.offlineProgress.stash[0].offlineProtected, true);
let protectedOverflow = Array.from({ length: 129 }, (_, index) => ({ name: `u${index}`, rarity: 'unique', offlineProtected: true }));
lockedState.offlineProgress.stash = protectedOverflow;
ensureOfflineProgressState(lockedState);
let lockedView = getOfflineProgressView(lockedState);
assert.strictEqual(lockedView.stash.length, lockedView.stashSlots, 'main stash stays within capacity');
assert.strictEqual(lockedState.offlineProgress.protectedOverflow.length, 0, 'legacy protected overflow is removed');
assert.strictEqual(lockedState.inventory.length, protectedOverflow.length - lockedView.stashSlots,
    'legacy overflow items move to regular inventory instead of being deleted');
let protectedFallback = routeOfflineItem({ name: 'overflow-limit', rarity: 'unique' }, lockedState, {});
assert.strictEqual(protectedFallback.action, 'normal', 'a protected item must fall back to regular inventory instead of salvage');
assert.strictEqual(protectedFallback.protected, true);
assert.strictEqual(lockedState.offlineProgress.stash.length, lockedView.stashSlots, 'stash remains at its visible capacity after fallback');
let inventoryFallbackState = mergeDefaults({
    inventory: [], offlineProgress: { stashLevel: 1 }
});
inventoryFallbackState.offlineProgress.stash = protectedOverflow.slice(0, 8);
inventoryFallbackState.settings.autoSalvageEnabled = true;
inventoryFallbackState.settings.autoSalvageRarities.unique = true;
function addOfflineItem(target,item) {
    const vm=require('vm'); const original=vm.runInContext('game',runtime);
    runtime.testOfflineState=target;
    vm.runInContext('game=testOfflineState; game.isBackgroundCalculation=true;',runtime);
    try{return runtime.addItemToInventory(item);}
    finally{runtime.testOfflineState=original;vm.runInContext('game=testOfflineState',runtime);}
}
assert.strictEqual(addOfflineItem(inventoryFallbackState,{name:'kept-unique',rarity:'unique'}),true);
assert.deepStrictEqual(Array.from(inventoryFallbackState.inventory,item=>item.name),['kept-unique']);
let fullInventoryState = mergeDefaults({ inventory: [], offlineProgress: { stashLevel: 1 } });
fullInventoryState.inventory = Array.from({ length: getInventoryLimit(fullInventoryState) }, (_, index) => ({ name: `filled-${index}`, rarity: 'normal' }));
fullInventoryState.offlineProgress.stash = protectedOverflow.slice(0, 8);
assert.strictEqual(addOfflineItem(fullInventoryState,{name:'last-kept-unique',rarity:'unique'}),true);
assert.strictEqual(fullInventoryState.inventory.at(-1).name,'last-kept-unique','protected item must remain owned');
assert.strictEqual(fullInventoryState.backgroundStopReason,'protected-storage-full');
assert.ok(!buildOfflineProgressHtml(getOfflineProgressView(stashState)).includes('보호 대기열'),
    '방치 보관함 UI에 숨은 초과 대기열을 표시하면 안 된다');
let loopResetState = state({ offlineProgress: { stashLevel: 1, stash: [{ name: 'old-loop-item', rarity: 'rare' }], protectedOverflow: [{ name: 'old-loop-unique', rarity: 'unique' }] } });
resetOfflineStashForLoop(loopResetState);
assert.strictEqual(loopResetState.offlineProgress.stash.length, 0, '루프를 시작하면 방치 보관함을 비워야 한다');
assert.strictEqual(loopResetState.offlineProgress.protectedOverflow.length, 0, '루프를 시작하면 예전 보호 대기열도 비워야 한다');
assert.strictEqual(loopResetState.inventory.length, 0, '루프 초기화 대상 아이템을 일반 인벤토리로 이관하면 안 된다');
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

let stopSnapshot=state({heroSelectionInitialized:true,playerHp:100,moveTimer:600,moveTotalTime:600,enemies:[],encounterPlan:[],offlineProgress:{safeReturnUnlocked:true,safetyPolicy:{consecutiveDeaths:5,noKillMinutes:5,stopOnNegativeExp:false,stopWhenStorageFull:false}}});
let syncResult=simulateBackgroundCombat({elapsedMs:360000,snapshot:stopSnapshot});
assert.strictEqual(syncResult.processedMs,300000,'real combat must stop at the configured no-kill boundary');
assert.strictEqual(syncResult.stopReason,'no-kill');
runtime.setTimeout=fn=>setImmediate(fn);
let asyncResult=await simulateBackgroundCombatChunked({elapsedMs:360000,snapshot:stopSnapshot});
assert.strictEqual(asyncResult.stopReason,'no-kill');
assert.strictEqual(asyncResult.processedMs,syncResult.processedMs);
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
