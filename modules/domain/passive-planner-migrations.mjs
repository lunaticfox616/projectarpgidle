export function plannerGetCurrentPassiveNodeId(env, rawId) {
    if (typeof rawId !== 'string') return rawId;
    if (typeof env.deps.PASSIVE_NODE_ID_MIGRATIONS !== 'object') return rawId;
    if (env.deps.PASSIVE_NODE_ID_MERGED[rawId]) return env.deps.PASSIVE_NODE_ID_MERGED[rawId];
    if (!env.deps.PASSIVE_NODE_ID_LEGACY_PREFIX.test(rawId)) return rawId;
    return env.deps.PASSIVE_NODE_ID_MIGRATIONS[rawId.replace(env.deps.PASSIVE_NODE_ID_LEGACY_PREFIX, '')] || rawId;
}

export function plannerMigratePassiveNodeIdList(env, rawIds) {
    const ids = Array.isArray(rawIds) ? rawIds : [];
    return Array.from(new Set(ids.map(id => plannerGetCurrentPassiveNodeId(env, id))));
}

export function plannerMigratePassiveNodeIdRecord(env, rawRecord) {
    if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) return {};
    const migrated = {};
    Object.entries(rawRecord).forEach(([rawId, value]) => {
        const id = plannerGetCurrentPassiveNodeId(env, rawId);
        if (id === rawId || !Object.prototype.hasOwnProperty.call(migrated, id)) migrated[id] = value;
    });
    return migrated;
}
