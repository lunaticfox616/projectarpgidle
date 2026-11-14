

export function voidRuleEnsureVoidPassiveState(env, owner) {
    owner.voidPassives = (owner.voidPassives && typeof owner.voidPassives === 'object') ? owner.voidPassives : {};
    Object.keys(owner.voidPassives).forEach(nodeId => {
        // The tree is indexed by node id. Visit owned entries, not the entire tree on every stat read.
        let node = env.deps.PASSIVE_TREE.nodes[nodeId];
        if (!node || node.kind !== 'void' || String(node.id) !== nodeId) {
            delete owner.voidPassives[nodeId];
            return;
        }
        let entry = owner.voidPassives[nodeId] && typeof owner.voidPassives[nodeId] === 'object' ? owner.voidPassives[nodeId] : {};
        let stats = Array.isArray(entry.stats) ? entry.stats : [];
        entry.stats = stats
            .filter(line => line && voidRuleIsVoidPassiveLineStat(env, line.id) && Number.isFinite(Number(line.val)))
            .slice(0, 2)
            .map(line => ({ id: line.id, val: Number(line.val) }));
        entry.transcendent = voidRuleNormalizeTranscendentVoidPassive(env, entry.transcendent);
        entry.rarity = entry.transcendent ? 'transcendent' : (entry.stats.length > 0 ? 'magic' : 'normal');
        owner.voidPassives[nodeId] = entry;
    });
    return owner.voidPassives;
}

export function voidRuleGetVoidPassiveCraft(env, owner, nodeId) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    let key = String(nodeId || '');
    if (!state[key]) state[key] = { rarity: 'normal', stats: [] };
    return state[key];
}

/** 줄이 될 수 있는 능력치: 아이템 능력치와, 이름만 있는 패시브 전용 능력치(무기 조건 줄, 지속시간). */
export function voidRuleIsVoidPassiveLineStat(env, statId) {
    return !!(env.deps.P_STATS[statId] || env.deps.STAT_DISPLAY_NAMES[statId]);
}

export function voidRuleNormalizeTranscendentVoidPassive(env, raw) {
    if (!raw || typeof raw !== 'object') return null;
    let def = env.deps.TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === raw.id);
    if (!def) return null;
    let value = Number.isFinite(Number(raw.value)) ? Number(raw.value) : (def.fixed || def.min || 0);
    let value2 = Number.isFinite(Number(raw.value2)) ? Number(raw.value2) : (def.min2 || 0);
    return { id: def.id, value: voidRuleClampTranscendentValue(def, value), value2 };
}

/** 범위가 바뀐 옵션(9단계)은 불러올 때 새 범위로 맞춘다: 예전 범위의 낮은 값은 새 최솟값으로, 범위 안의 값은 그대로. */
export function voidRuleClampTranscendentValue(def, value) {
    if (!Number.isFinite(def.min) || !Number.isFinite(def.max)) return value;
    return Math.min(def.max, Math.max(def.min, value));
}

export function voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, exceptNodeId) {
    let state = voidRuleEnsureVoidPassiveState(env, owner);
    return new Set(Object.keys(state).filter(nodeId => String(nodeId) !== String(exceptNodeId))
        .map(nodeId => state[nodeId] && state[nodeId].transcendent && state[nodeId].transcendent.id).filter(Boolean));
}

/** 카멜레온이 바꿀 수 있는 초월: 카멜레온 자신, 다른 노드에 이미 있는 초월(초월은 트리에 하나씩), 태양(카멜레온 노드에는 지킬 옵션이
 * 없어 아무 효과가 없다)은 빠진다. */
export function voidRuleGetChameleonChoices(env, owner, nodeId) {
    const owned = voidRuleGetOwnedTranscendentVoidPassiveIds(env, owner, nodeId);
    return env.deps.TRANSCENDENT_VOID_PASSIVE_DB.filter(def => !['chameleon', 'sun'].includes(def.id) && !owned.has(def.id));
}

/** 활성화한 카멜레온 공허 노드의 기록, 아니면 null. */
export function voidRuleActiveChameleonEntry(env, owner, nodeId) {
    const node = env.deps.PASSIVE_TREE.nodes[nodeId], entry = node && node.kind === 'void' ? voidRuleGetVoidPassiveCraft(env, owner, node.id) : null;
    return entry && (owner.passives || []).includes(node.id) && entry.transcendent && entry.transcendent.id === 'chameleon' ? entry : null;
}
