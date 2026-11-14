

export function huntGetUniqueHuntEntryKey(entry) {
    if (!entry || typeof entry.name !== 'string' || !Array.isArray(entry.slots) || !entry.slots[0]) return '';
    return `${entry.slots[0]}|${entry.name}`;
}

export function huntGetUniqueHuntEntry(env, key) {
    let targetKey = typeof key === 'string' ? key : '';
    return env.deps.UNIQUE_DB.find(entry => !entry.realmCodexOnly && huntGetUniqueHuntEntryKey(entry) === targetKey) || null;
}

export function huntEnsureUniqueHuntState(env, targetGame) {
    let source = Array.isArray(targetGame.uniqueHuntTargets) ? targetGame.uniqueHuntTargets : [];
    let seen = new Set();
    targetGame.uniqueHuntTargets = source.filter(key => {
        if (typeof key !== 'string' || seen.has(key) || !huntGetUniqueHuntEntry(env, key)) return false;
        seen.add(key);
        return true;
    }).slice(0, env.UNIQUE_HUNT_TARGET_LIMIT);
    return targetGame.uniqueHuntTargets;
}

export function huntGetUniqueHuntTargets(env, targetGame) {
    return huntEnsureUniqueHuntState(env, targetGame).map((...args) => huntGetUniqueHuntEntry(env, ...args)).filter(Boolean);
}

export function* huntToggleUniqueHuntTarget(env, key, targetGame) {
    let entry = huntGetUniqueHuntEntry(env, key);
    if (!entry) return { ok: false, tracked: false, reason: env.deps._t('추적할 수 없는 고유 아이템입니다.') };
    let targets = huntEnsureUniqueHuntState(env, targetGame);
    let index = targets.indexOf(key);
    if (index >= 0) {
        targetGame.uniqueHuntTargets = targets.filter(target => target !== key);
        yield { kind: 'dispatchRuntimeEvent', args: ['unique-hunt-changed', { action: 'removed', key }] };
        return { ok: true, tracked: false, entry };
    }
    if (targets.length >= env.UNIQUE_HUNT_TARGET_LIMIT) {
        return { ok: false, tracked: false, reason: env.deps._t('파밍 목표는 최대 {UNIQUE_HUNT_TARGET_LIMIT}개까지 지정할 수 있습니다.', { UNIQUE_HUNT_TARGET_LIMIT: env.UNIQUE_HUNT_TARGET_LIMIT }) };
    }
    targetGame.uniqueHuntTargets = targets.concat(key);
    yield { kind: 'dispatchRuntimeEvent', args: ['unique-hunt-changed', { action: 'added', key }] };
    return { ok: true, tracked: true, entry };
}

export function huntIsUniqueHuntTargetItem(env, item, targetGame) {
    if (!item || item.rarity !== 'unique' || typeof item.slot !== 'string' || typeof item.name !== 'string') return false;
    return huntEnsureUniqueHuntState(env, targetGame).includes(`${item.slot}|${item.name}`);
}

export function* huntCompleteUniqueHuntTarget(env, item, targetGame, notify) {
    if (!huntIsUniqueHuntTargetItem(env, item, targetGame)) return null;
    let key = `${item.slot}|${item.name}`;
    let entry = huntGetUniqueHuntEntry(env, key);
    targetGame.uniqueHuntTargets = huntEnsureUniqueHuntState(env, targetGame).filter(target => target !== key);
    if (notify) yield { kind: 'dispatchRuntimeEvent', args: ['unique-hunt-changed', { action: 'completed', key }] };
    return entry;
}
