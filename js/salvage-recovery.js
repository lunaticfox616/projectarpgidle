const SALVAGE_RECOVERY_CAP = 8;
const SALVAGE_RECOVERY_RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);

/** @typedef {{id:number, loop:number, salvagedAt:number, item:Record<string, unknown>, rewards:Record<string, number>}} SalvageRecoveryEntry */

function getSalvageRecoveryLoop(targetGame) {
    return Math.max(1, Math.floor(Number(targetGame.season) || 1));
}

function isSalvageRecoveryItem(item) {
    return !!(item && typeof item === 'object'
        && typeof item.slot === 'string' && typeof item.name === 'string'
        && SALVAGE_RECOVERY_RARITIES.includes(item.rarity) && Number(item.id) > 0
        && !item.growthCategory);
}

function normalizeSalvageRecoveryRewards(rewards) {
    let normalized = {};
    Object.entries(rewards || {}).forEach(([key, amount]) => {
        let gain = Math.max(0, Math.floor(Number(amount) || 0));
        if (gain <= 0) return;
        let currencyKey = typeof getCanonicalCurrencyKey === 'function' ? getCanonicalCurrencyKey(key) : key;
        if (typeof ORB_DB === 'undefined' || !ORB_DB[currencyKey]) return;
        normalized[currencyKey] = (normalized[currencyKey] || 0) + gain;
    });
    return normalized;
}

function normalizeSalvageRecoveryEntry(entry, currentLoop) {
    if (!entry || typeof entry !== 'object' || !isSalvageRecoveryItem(entry.item)) return null;
    let id = Math.max(0, Math.floor(Number(entry.id) || 0));
    let loop = Math.max(1, Math.floor(Number(entry.loop) || 1));
    if (id <= 0 || loop !== currentLoop) return null;
    return {
        id,
        loop,
        salvagedAt: Math.max(0, Math.floor(Number(entry.salvagedAt) || 0)),
        item: { ...entry.item, id: Math.floor(Number(entry.item.id)) },
        rewards: normalizeSalvageRecoveryRewards(entry.rewards)
    };
}

function ensureSalvageRecoveryState(targetGame = game) {
    let source = targetGame.salvageRecovery && typeof targetGame.salvageRecovery === 'object'
        ? targetGame.salvageRecovery : {};
    let raw = {
        entries: Array.isArray(source.entries) ? source.entries : [],
        sequence: source.sequence
    };
    let currentLoop = getSalvageRecoveryLoop(targetGame);
    let seen = new Set();
    raw.entries = (Array.isArray(raw.entries) ? raw.entries : [])
        .map(entry => normalizeSalvageRecoveryEntry(entry, currentLoop))
        .filter(entry => {
            if (!entry || seen.has(entry.id)) return false;
            seen.add(entry.id);
            return true;
        })
        .slice(0, SALVAGE_RECOVERY_CAP);
    let highestId = raw.entries.reduce((highest, entry) => Math.max(highest, entry.id), 0);
    raw.sequence = Math.max(highestId, Math.floor(Number(raw.sequence) || 0));
    targetGame.salvageRecovery = raw;
    return raw;
}

function cloneSalvageRecoveryItem(item) {
    return JSON.parse(JSON.stringify(item));
}

function getSalvageReplayRewards(item) {
    if (!item || !Object.prototype.hasOwnProperty.call(item, 'salvageRecoveryRewards')) return null;
    return normalizeSalvageRecoveryRewards(item.salvageRecoveryRewards);
}

function recordSalvagedEquipment(item, rewards, targetGame = game) {
    if (!isSalvageRecoveryItem(item)) return null;
    let state = ensureSalvageRecoveryState(targetGame);
    let entry = {
        id: ++state.sequence,
        loop: getSalvageRecoveryLoop(targetGame),
        salvagedAt: Date.now(),
        item: cloneSalvageRecoveryItem(item),
        rewards: normalizeSalvageRecoveryRewards(rewards)
    };
    state.entries.unshift(entry);
    state.entries = state.entries.slice(0, SALVAGE_RECOVERY_CAP);
    dispatchRuntimeEvent('salvage-recovery-changed', { action: 'recorded', entryId: entry.id });
    return entry;
}

function getSalvageRecoveryEntry(entryId, targetGame = game) {
    let id = Math.max(0, Math.floor(Number(entryId) || 0));
    return ensureSalvageRecoveryState(targetGame).entries.find(entry => entry.id === id) || null;
}

function getSalvageRestoreAvailability(entryId, targetGame = game) {
    let entry = getSalvageRecoveryEntry(entryId, targetGame);
    if (!entry) return { canRestore: false, reason: '복구할 장비를 찾을 수 없습니다.', missing: {} };
    let inventory = Array.isArray(targetGame.inventory) ? targetGame.inventory : [];
    if (inventory.length >= getInventoryLimit()) return { canRestore: false, reason: '인벤토리 공간이 부족합니다.', missing: {} };
    let missing = {};
    Object.entries(entry.rewards).forEach(([key, amount]) => {
        let owned = Math.max(0, Math.floor(Number(targetGame.currencies && targetGame.currencies[key]) || 0));
        if (owned < amount) missing[key] = amount - owned;
    });
    if (Object.keys(missing).length > 0) return { canRestore: false, reason: '반환할 해체 재화가 부족합니다.', missing };
    return { canRestore: true, reason: '', missing: {} };
}

function assignRecoveredEquipmentId(item, state, targetGame) {
    let owned = (targetGame.inventory || []).concat(Object.values(targetGame.equipment || {}).filter(Boolean));
    if (!owned.some(entry => entry && entry.id === item.id)) return item;
    let highest = owned.reduce((value, entry) => Math.max(value, Number(entry && entry.id) || 0), 0);
    item.id = Math.max(Date.now(), highest + 1) + state.sequence;
    return item;
}

function restoreSalvagedEquipment(entryId, targetGame = game) {
    let availability = getSalvageRestoreAvailability(entryId, targetGame);
    if (!availability.canRestore) return { restored: false, ...availability };
    let state = ensureSalvageRecoveryState(targetGame);
    let index = state.entries.findIndex(entry => entry.id === Math.floor(Number(entryId)));
    if (index < 0) return { restored: false, reason: '복구할 장비를 찾을 수 없습니다.', missing: {} };
    let entry = state.entries[index];
    Object.entries(entry.rewards).forEach(([key, amount]) => { targetGame.currencies[key] -= amount; });
    let item = assignRecoveredEquipmentId(cloneSalvageRecoveryItem(entry.item), state, targetGame);
    item.salvageRecoveryRewards = { ...entry.rewards };
    targetGame.inventory.push(item);
    state.entries.splice(index, 1);
    dispatchRuntimeEvent('salvage-recovery-changed', { action: 'restored', entryId: entry.id });
    return { restored: true, item, returned: { ...entry.rewards } };
}

function getSalvageRecoveryEntries(targetGame = game) {
    return ensureSalvageRecoveryState(targetGame).entries.slice();
}

const salvageRecoveryRuntime = Object.freeze({
    ensureState: ensureSalvageRecoveryState,
    record: recordSalvagedEquipment,
    getReplayRewards: getSalvageReplayRewards,
    getEntries: getSalvageRecoveryEntries,
    getAvailability: getSalvageRestoreAvailability,
    restore: restoreSalvagedEquipment
});

safeExposeGlobals({ salvageRecoveryRuntime });
