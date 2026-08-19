function cloneOfflineProgressDefault() {
    return JSON.parse(JSON.stringify(OFFLINE_PROGRESS_DEFAULT_STATE));
}

function offlineFiniteInt(value, fallback, min, max) {
    let number = Number(value);
    if (!Number.isFinite(number)) number = fallback;
    number = Math.floor(number);
    if (Number.isFinite(min)) number = Math.max(min, number);
    if (Number.isFinite(max)) number = Math.min(max, number);
    return number;
}

function getOfflineLevelMax(table) { return Math.max(0, table.length - 1); }

function isOfflineProtectedItem(item) {
    return !!(item && (item.locked || item.offlineProtected || item.rarity === 'unique' || item.rarity === 'chase'));
}

function normalizeOfflineStashEntries(state, stashLevel) {
    let capacity = OFFLINE_PROGRESS_STASH_LEVELS[stashLevel].slots;
    let source = state.offlineProgress && Array.isArray(state.offlineProgress.stash) ? state.offlineProgress.stash : [];
    let existingOverflow = state.offlineProgress && Array.isArray(state.offlineProgress.protectedOverflow) ? state.offlineProgress.protectedOverflow : [];
    let entries = source.concat(existingOverflow).filter(item => item && typeof item === 'object');
    entries.forEach(item => { if (isOfflineProtectedItem(item)) item.offlineProtected = true; });
    let protectedEntries = entries.filter(isOfflineProtectedItem);
    let regularEntries = entries.filter(item => !isOfflineProtectedItem(item));
    let prioritized = protectedEntries.concat(regularEntries);
    return { stash: prioritized.slice(0, capacity), recoveryItems: prioritized.slice(capacity) };
}

function ensureOfflineProgressState(state) {
    if (!state || typeof state !== 'object') return cloneOfflineProgressDefault();
    let source = state.offlineProgress && typeof state.offlineProgress === 'object' ? state.offlineProgress : {};
    let defaults = cloneOfflineProgressDefault();
    let merged = { ...defaults, ...source };
    merged.version = OFFLINE_PROGRESS_VERSION;
    merged.recognitionLevel = offlineFiniteInt(merged.recognitionLevel, 0, 0, getOfflineLevelMax(OFFLINE_PROGRESS_RECOGNITION_LEVELS));
    merged.efficiencyLevel = offlineFiniteInt(merged.efficiencyLevel, 0, 0, getOfflineLevelMax(OFFLINE_PROGRESS_EFFICIENCY_LEVELS));
    merged.stashLevel = offlineFiniteInt(merged.stashLevel, 0, 0, getOfflineLevelMax(OFFLINE_PROGRESS_STASH_LEVELS));
    merged.rewardedThroughLoop = offlineFiniteInt(merged.rewardedThroughLoop, 0, 0);
    merged.lifetimeGranted = offlineFiniteInt(merged.lifetimeGranted, 0, 0, OFFLINE_PROGRESS_MAX_LIFETIME_GRANT);
    merged.huntMode = OFFLINE_PROGRESS_HUNT_MODES.includes(merged.huntMode) ? merged.huntMode : 'push';
    merged.safetyPolicy = normalizeOfflineSafetyPolicy(merged.safetyPolicy);
    merged.lootPolicy = normalizeOfflineLootPolicy(merged.lootPolicy);
    merged.huntDirectiveUnlocked = !!merged.huntDirectiveUnlocked;
    merged.safeReturnUnlocked = !!merged.safeReturnUnlocked;
    merged.lootDirectiveUnlocked = !!merged.lootDirectiveUnlocked;
    let stashState = normalizeOfflineStashEntries({ offlineProgress: merged }, merged.stashLevel);
    merged.stash = stashState.stash;
    merged.protectedOverflow = [];
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    if (stashState.recoveryItems.length > 0) state.inventory.push(...stashState.recoveryItems);
    state.offlineProgress = merged;
    return merged;
}

function normalizeOfflineSafetyPolicy(policy) {
    let source = policy && typeof policy === 'object' ? policy : {};
    let deaths = OFFLINE_PROGRESS_SAFETY_DEATHS.includes(Number(source.consecutiveDeaths)) ? Number(source.consecutiveDeaths) : 5;
    let noKill = OFFLINE_PROGRESS_SAFETY_NO_KILL_MINUTES.includes(Number(source.noKillMinutes)) ? Number(source.noKillMinutes) : 10;
    return { consecutiveDeaths: deaths, noKillMinutes: noKill, stopOnNegativeExp: !!source.stopOnNegativeExp, stopWhenStorageFull: !!source.stopWhenStorageFull };
}

function normalizeOfflineLootPolicy(policy) {
    let source = policy && typeof policy === 'object' ? policy : {};
    let slots = Array.isArray(source.preferredSlots) ? source.preferredSlots.filter(slot => typeof slot === 'string').slice(0, 12) : [];
    return { mode: OFFLINE_PROGRESS_LOOT_MODES.includes(source.mode) ? source.mode : 'rarity', preferredSlots: slots, searchText: String(source.searchText || '').slice(0, 64) };
}

function getOfflineCompletedLoopCount(state) {
    let loopCount = offlineFiniteInt(state && state.loopCount, 0, 0);
    if (loopCount > 0) return loopCount;
    return Math.max(0, offlineFiniteInt(state && state.season, 1, 1) - 1);
}

function getOfflineLoopReward(loop) {
    let value = offlineFiniteInt(loop, 0, 0);
    if (value < 1) return 0;
    return Math.min(6, Math.floor((value - 1) / 10) + 1);
}

function getOfflineLifetimeEntitlement(loopCount) {
    let loops = Math.min(71, getOfflineCompletedLoopCount({ loopCount }));
    if (loops <= 0) return 0;
    if (loops <= 9) return loops;
    let total = 9;
    let remaining = loops - 9;
    for (let tier = 2; tier <= 5 && remaining > 0; tier++) {
        let count = Math.min(10, remaining);
        total += count * tier;
        remaining -= count;
    }
    if (remaining > 0) total += remaining * 6;
    return Math.min(OFFLINE_PROGRESS_MAX_LIFETIME_GRANT, total);
}

function syncOfflineProgressEntitlement(state) {
    let progress = ensureOfflineProgressState(state);
    let completedLoops = getOfflineCompletedLoopCount(state);
    let entitlement = getOfflineLifetimeEntitlement(completedLoops);
    let previous = progress.lifetimeGranted;
    let grant = Math.max(0, entitlement - previous);
    if (grant > 0) {
        state.currencies = state.currencies && typeof state.currencies === 'object' ? state.currencies : {};
        state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY] = Math.max(0, Number(state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY]) || 0) + grant;
    }
    progress.lifetimeGranted = Math.max(previous, entitlement);
    progress.rewardedThroughLoop = Math.max(progress.rewardedThroughLoop, completedLoops);
    return { grant, entitlement, completedLoops };
}

function getOfflineProgressConfig(state) {
    let progress = ensureOfflineProgressState(state || {});
    let recognition = OFFLINE_PROGRESS_RECOGNITION_LEVELS[progress.recognitionLevel];
    let efficiency = OFFLINE_PROGRESS_EFFICIENCY_LEVELS[progress.efficiencyLevel];
    let recognitionLimitMs = recognition.hours * 60 * 60 * 1000;
    return { recognitionLimitMs, efficiencyRate: efficiency.rate, effectiveLimitMs: recognitionLimitMs * efficiency.rate, recognitionHours: recognition.hours };
}

function getOfflineUpgradeTable(type) {
    if (type === 'recognition') return OFFLINE_PROGRESS_RECOGNITION_LEVELS;
    if (type === 'efficiency') return OFFLINE_PROGRESS_EFFICIENCY_LEVELS;
    if (type === 'stash') return OFFLINE_PROGRESS_STASH_LEVELS;
    return null;
}

function purchaseOfflineProgressUpgrade(type, state) {
    let progress = ensureOfflineProgressState(state);
    let table = getOfflineUpgradeTable(type);
    if (!table) return { ok: false, reason: 'unknown-upgrade' };
    let key = `${type}Level`;
    let level = offlineFiniteInt(progress[key], 0, 0, table.length - 1);
    if (level >= table.length - 1) return { ok: false, reason: 'max-level', level };
    let cost = table[level + 1].cost;
    let wallet = Math.max(0, Number(state.currencies && state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY]) || 0);
    if (wallet < cost) return { ok: false, reason: 'insufficient', cost, wallet, level };
    state.currencies = state.currencies && typeof state.currencies === 'object' ? state.currencies : {};
    state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY] = wallet - cost;
    progress[key] = level + 1;
    return { ok: true, type, level: level + 1, cost, wallet: wallet - cost };
}

function purchaseOfflineDirective(id, state) {
    let progress = ensureOfflineProgressState(state);
    let field = id === 'hunt' ? 'huntDirectiveUnlocked' : id === 'safety' ? 'safeReturnUnlocked' : id === 'loot' ? 'lootDirectiveUnlocked' : null;
    if (!field) return { ok: false, reason: 'unknown-directive' };
    if (progress[field]) return { ok: false, reason: 'already-unlocked' };
    let cost = OFFLINE_PROGRESS_DIRECTIVE_COSTS[id];
    let wallet = Math.max(0, Number(state.currencies && state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY]) || 0);
    if (wallet < cost) return { ok: false, reason: 'insufficient', cost, wallet };
    state.currencies = state.currencies && typeof state.currencies === 'object' ? state.currencies : {};
    state.currencies[OFFLINE_PROGRESS_CURRENCY_KEY] = wallet - cost;
    progress[field] = true;
    return { ok: true, id, cost, wallet: wallet - cost };
}

function updateOfflineProgressPolicy(kind, value, state) {
    let progress = ensureOfflineProgressState(state);
    if (kind === 'huntMode' && OFFLINE_PROGRESS_HUNT_MODES.includes(value)) progress.huntMode = value;
    if (kind === 'lootMode' && OFFLINE_PROGRESS_LOOT_MODES.includes(value)) progress.lootPolicy.mode = value;
    if (kind === 'consecutiveDeaths' && OFFLINE_PROGRESS_SAFETY_DEATHS.includes(Number(value))) progress.safetyPolicy.consecutiveDeaths = Number(value);
    if (kind === 'noKillMinutes' && OFFLINE_PROGRESS_SAFETY_NO_KILL_MINUTES.includes(Number(value))) progress.safetyPolicy.noKillMinutes = Number(value);
    if (kind === 'stopOnNegativeExp') progress.safetyPolicy.stopOnNegativeExp = !!value;
    if (kind === 'stopWhenStorageFull') progress.safetyPolicy.stopWhenStorageFull = !!value;
    return getOfflineProgressView(state);
}

function applyOfflineHuntDirective(state) {
    let progress = ensureOfflineProgressState(state);
    if (!progress.huntDirectiveUnlocked) return state;
    let actions = { push: 'nextZone', current: 'repeatZone', highestCleared: 'nextLoopBestPlusOne', stopBeforeBoss: 'nextZone' };
    state.settings = { ...(state.settings || {}), mapCompleteAction: actions[progress.huntMode] || 'nextZone' };
    state.offlineHuntMode = progress.huntMode;
    return state;
}

function getOfflineProgressView(state) {
    let source = state || (typeof game !== 'undefined' ? game : null) || {};
    let progress = ensureOfflineProgressState(source);
    let config = getOfflineProgressConfig(source);
    let wallet = Math.max(0, Number(source.currencies && source.currencies[OFFLINE_PROGRESS_CURRENCY_KEY]) || 0);
    let next = type => {
        let table = getOfflineUpgradeTable(type), level = progress[`${type}Level`];
        return { level, current: table[level], next: table[level + 1] || null };
    };
    let stashSlots = OFFLINE_PROGRESS_STASH_LEVELS[progress.stashLevel].slots;
    return { wallet, completedLoops: getOfflineCompletedLoopCount(source), lifetimeGranted: progress.lifetimeGranted, maxLifetimeGrant: OFFLINE_PROGRESS_MAX_LIFETIME_GRANT, config, recognition: next('recognition'), efficiency: next('efficiency'), stashUpgrade: next('stash'), stash: progress.stash.slice(), stashSlots, huntMode: progress.huntMode, huntDirectiveUnlocked: progress.huntDirectiveUnlocked, safeReturnUnlocked: progress.safeReturnUnlocked, lootDirectiveUnlocked: progress.lootDirectiveUnlocked, safetyPolicy: { ...progress.safetyPolicy }, lootPolicy: { ...progress.lootPolicy, preferredSlots: progress.lootPolicy.preferredSlots.slice() } };
}

function resetOfflineStashForLoop(state) {
    let progress = state && state.offlineProgress && typeof state.offlineProgress === 'object'
        ? state.offlineProgress : ensureOfflineProgressState(state);
    progress.stash = [];
    progress.protectedOverflow = [];
    return progress;
}

function getOfflineItemPriority(item, policy, options) {
    let rarity = String(item && item.rarity || 'normal');
    let ranks = { normal: 1, magic: 2, rare: 3, unique: 4, chase: 5 };
    let score = ranks[rarity] || 1;
    if (policy && policy.mode === 'itemLevel') score = Number(item.itemLevel || item.level || 0) * 10 + score;
    if (policy && policy.mode === 'baseTier') score = Number(item.baseTier || item.tier || 0) * 10 + score;
    if (policy && Array.isArray(policy.preferredSlots) && policy.preferredSlots.includes(item.slot)) score += 1000;
    if (options && options.protected) score += 100000;
    return score;
}

function routeOfflineItem(item, state, options) {
    if (!item || typeof item !== 'object') return { action: 'normal' };
    let progress = ensureOfflineProgressState(state);
    let capacity = OFFLINE_PROGRESS_STASH_LEVELS[progress.stashLevel].slots;
    if (capacity <= 0) return { action: 'normal' };
    let protectedItem = !!(options && options.protected) || isOfflineProtectedItem(item);
    item.offlineProtected = protectedItem;
    let priority = getOfflineItemPriority(item, progress.lootPolicy, { protected: protectedItem });
    let stash = progress.stash;
    if (stash.length < capacity) { stash.push(item); return { action: 'stored', protected: protectedItem }; }
    let candidates = stash.map((entry, index) => ({ entry, index })).filter(row => !row.entry.offlineProtected && String(row.entry.rarity) !== 'unique' && String(row.entry.rarity) !== 'chase');
    if (candidates.length === 0) {
        if (protectedItem) return { action: 'normal', protected: true, reason: 'protected-stash-full' };
        return { action: 'salvage', reason: 'protected-stash-full' };
    }
    let weakest = candidates.reduce((best, row) => getOfflineItemPriority(row.entry, progress.lootPolicy, { protected: false }) < getOfflineItemPriority(best.entry, progress.lootPolicy, { protected: false }) ? row : best);
    if (priority <= getOfflineItemPriority(weakest.entry, progress.lootPolicy, { protected: false })) return { action: 'salvage', reason: 'lower-priority' };
    let replacedItem = stash[weakest.index];
    stash[weakest.index] = item;
    return { action: 'stored', replacedItem, protected: protectedItem };
}

function getOfflineSafetyStopReason(state, metrics, elapsedMs) {
    let progress = ensureOfflineProgressState(state);
    if (progress.huntDirectiveUnlocked && progress.huntMode === 'stopBeforeBoss' && isOfflineBossEncounterPending(state)) return 'before-boss';
    if (!progress.safeReturnUnlocked) return null;
    let data = metrics || {};
    if (progress.safetyPolicy.consecutiveDeaths > 0 && Number(data.consecutiveDeaths || 0) >= progress.safetyPolicy.consecutiveDeaths) return 'consecutive-deaths';
    let noKillElapsed = Number.isFinite(Number(data.elapsedSinceLastKillMs)) ? Number(data.elapsedSinceLastKillMs) : Number(elapsedMs || 0);
    if (noKillElapsed >= progress.safetyPolicy.noKillMinutes * 60 * 1000) return 'no-kill';
    if (progress.safetyPolicy.stopOnNegativeExp && Number(data.exp || 0) - Number(data.expLost || 0) < 0) return 'negative-exp';
    if (progress.safetyPolicy.stopWhenStorageFull && Array.isArray(state.inventory) && typeof getInventoryLimit === 'function' && state.inventory.length >= getInventoryLimit()) return 'storage-full';
    return null;
}

function isOfflineBossEncounterPending(state) {
    if (Array.isArray(state && state.enemies) && state.enemies.some(enemy => enemy && enemy.isBoss && enemy.hp > 0)) return true;
    let progress = Math.max(0, Number(state && state.runProgress) || 0);
    let markers = Array.isArray(state && state.encounterPlan) ? state.encounterPlan : [];
    let nextBoss = markers.filter(marker => marker && marker.boss && Number(marker.at) >= progress - 0.1).sort((a, b) => Number(a.at) - Number(b.at))[0];
    return !!nextBoss && progress >= Number(nextBoss.at) - 0.1;
}

safeExposeGlobals({ cloneOfflineProgressDefault, ensureOfflineProgressState, getOfflineLoopReward, getOfflineLifetimeEntitlement, syncOfflineProgressEntitlement, getOfflineProgressConfig, getOfflineProgressView, purchaseOfflineProgressUpgrade, purchaseOfflineDirective, updateOfflineProgressPolicy, applyOfflineHuntDirective, resetOfflineStashForLoop, routeOfflineItem, getOfflineSafetyStopReason, getOfflineCompletedLoopCount });
