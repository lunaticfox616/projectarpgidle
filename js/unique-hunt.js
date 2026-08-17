const UNIQUE_HUNT_TARGET_LIMIT = 3;

function getUniqueHuntEntryKey(entry) {
    if (!entry || typeof entry.name !== 'string' || !Array.isArray(entry.slots) || !entry.slots[0]) return '';
    return `${entry.slots[0]}|${entry.name}`;
}

function getUniqueHuntEntry(key) {
    let targetKey = typeof key === 'string' ? key : '';
    return UNIQUE_DB.find(entry => !entry.realmCodexOnly && getUniqueHuntEntryKey(entry) === targetKey) || null;
}

function ensureUniqueHuntState(targetGame = game) {
    let source = Array.isArray(targetGame.uniqueHuntTargets) ? targetGame.uniqueHuntTargets : [];
    let seen = new Set();
    targetGame.uniqueHuntTargets = source.filter(key => {
        if (typeof key !== 'string' || seen.has(key) || !getUniqueHuntEntry(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, UNIQUE_HUNT_TARGET_LIMIT);
    return targetGame.uniqueHuntTargets;
}

function getUniqueHuntTargets(targetGame = game) {
    return ensureUniqueHuntState(targetGame).map(getUniqueHuntEntry).filter(Boolean);
}

function toggleUniqueHuntTarget(key, targetGame = game) {
    let entry = getUniqueHuntEntry(key);
    if (!entry) return { ok: false, tracked: false, reason: '추적할 수 없는 고유 아이템입니다.' };
    let targets = ensureUniqueHuntState(targetGame);
    let index = targets.indexOf(key);
    if (index >= 0) {
        targetGame.uniqueHuntTargets = targets.filter(target => target !== key);
        dispatchRuntimeEvent('unique-hunt-changed', { action: 'removed', key });
        return { ok: true, tracked: false, entry };
    }
    if (targets.length >= UNIQUE_HUNT_TARGET_LIMIT) {
        return { ok: false, tracked: false, reason: `파밍 목표는 최대 ${UNIQUE_HUNT_TARGET_LIMIT}개까지 지정할 수 있습니다.` };
    }
    targetGame.uniqueHuntTargets = targets.concat(key);
    dispatchRuntimeEvent('unique-hunt-changed', { action: 'added', key });
    return { ok: true, tracked: true, entry };
}

function isUniqueHuntTargetItem(item, targetGame = game) {
    if (!item || item.rarity !== 'unique' || typeof item.slot !== 'string' || typeof item.name !== 'string') return false;
    return ensureUniqueHuntState(targetGame).includes(`${item.slot}|${item.name}`);
}

function completeUniqueHuntTarget(item, targetGame = game) {
    if (!isUniqueHuntTargetItem(item, targetGame)) return null;
    let key = `${item.slot}|${item.name}`;
    let entry = getUniqueHuntEntry(key);
    targetGame.uniqueHuntTargets = ensureUniqueHuntState(targetGame).filter(target => target !== key);
    dispatchRuntimeEvent('unique-hunt-changed', { action: 'completed', key });
    return entry;
}

const uniqueHuntRuntime = Object.freeze({
    limit: UNIQUE_HUNT_TARGET_LIMIT,
    ensureState: ensureUniqueHuntState,
    getKey: getUniqueHuntEntryKey,
    getEntry: getUniqueHuntEntry,
    getTargets: getUniqueHuntTargets,
    toggle: toggleUniqueHuntTarget,
    isTargetItem: isUniqueHuntTargetItem,
    complete: completeUniqueHuntTarget
});

safeExposeGlobals({ uniqueHuntRuntime });
