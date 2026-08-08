const OFFLINE_PROGRESS_VERSION = 1;
const OFFLINE_PROGRESS_CURRENCY_KEY = 'timeRemnant';
const OFFLINE_PROGRESS_MAX_LIFETIME_GRANT = 281;
const OFFLINE_PROGRESS_RECOGNITION_LEVELS = Object.freeze([
    { hours: 3, cost: 0 }, { hours: 6, cost: 1 }, { hours: 9, cost: 2 },
    { hours: 12, cost: 3 }, { hours: 15, cost: 8 }, { hours: 18, cost: 15 },
    { hours: 21, cost: 25 }, { hours: 24, cost: 40 }
]);
const OFFLINE_PROGRESS_EFFICIENCY_LEVELS = Object.freeze([
    { rate: 0.10, cost: 0 }, { rate: 0.12, cost: 2 }, { rate: 0.15, cost: 4 },
    { rate: 0.18, cost: 7 }, { rate: 0.22, cost: 12 }, { rate: 0.26, cost: 20 },
    { rate: 0.30, cost: 32 }
]);
const OFFLINE_PROGRESS_STASH_LEVELS = Object.freeze([
    { slots: 0, cost: 0 }, { slots: 8, cost: 3 }, { slots: 16, cost: 6 },
    { slots: 32, cost: 12 }, { slots: 48, cost: 20 }, { slots: 72, cost: 32 }
]);
const OFFLINE_PROGRESS_DIRECTIVE_COSTS = Object.freeze({ hunt: 10, safety: 12, loot: 15 });
const OFFLINE_PROGRESS_HUNT_MODES = Object.freeze(['push', 'current', 'highestCleared', 'stopBeforeBoss']);
const OFFLINE_PROGRESS_LOOT_MODES = Object.freeze(['rarity', 'itemLevel', 'baseTier']);
const OFFLINE_PROGRESS_SAFETY_DEATHS = Object.freeze([3, 5, 10]);
const OFFLINE_PROGRESS_SAFETY_NO_KILL_MINUTES = Object.freeze([5, 10, 20]);
const OFFLINE_PROGRESS_DEFAULT_STATE = Object.freeze({
    version: OFFLINE_PROGRESS_VERSION,
    recognitionLevel: 0,
    efficiencyLevel: 0,
    stashLevel: 0,
    huntDirectiveUnlocked: false,
    safeReturnUnlocked: false,
    lootDirectiveUnlocked: false,
    rewardedThroughLoop: 0,
    lifetimeGranted: 0,
    huntMode: 'push',
    safetyPolicy: { consecutiveDeaths: 5, noKillMinutes: 10, stopOnNegativeExp: false, stopWhenStorageFull: false },
    lootPolicy: { mode: 'rarity', preferredSlots: [], searchText: '' },
    stash: []
});
