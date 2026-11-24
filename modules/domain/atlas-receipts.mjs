

/** Lifetime counts the away result compares (js/away-settlement-ui.js getBackgroundAtlasGains): maps finished, treasure packs and golden ones. */
export function atlasCoreNormalizeTally(raw) {
    const count = key => Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(Number(raw && raw[key]) || 0)));
    return { maps: count('maps'), treasure: count('treasure'), golden: count('golden') };
}

/** A result's loot receipt: wallet currencies (ORB_DB) with whole positive amounts, the equipment count, its finds and leaves. */
export function atlasCoreNormalizeLoot(env, raw) {
    if (!raw || typeof raw !== 'object') return null;
    const currencies = {};
    for (const [key, value] of Object.entries(raw.currencies || {})) {
        const amount = Math.floor(Number(value));
        if (Object.hasOwn(env.deps.ORB_DB, key) && amount > 0) currencies[key] = Math.min(Number.MAX_SAFE_INTEGER, amount);
    }
    return { currencies, equipmentCount: Math.max(0, Math.min(1e6, Math.floor(Number(raw.equipmentCount) || 0))),
        items: env.deps.combatLootReceipts.cleanItems(raw.items), leaves: env.deps.combatLootReceipts.cleanLeaves(raw.leaves), yarns: env.deps.combatLootReceipts.cleanYarns(raw.yarns) };
}

/** A result's material quantities: gains use the stock cap; losses use the open run's held-material cap. */
export function atlasCoreNormalizeResultMaterials(env, raw, cap) {
    return (Array.isArray(raw) ? raw : []).filter(row => Array.isArray(row)
        && Object.hasOwn(env.deps.ATLAS_ENDGAME.items, row[0]) && Number.isFinite(row[1]) && row[1] > 0)
        .slice(0, Object.keys(env.deps.ATLAS_ENDGAME.items).length).map(([id, amount]) => [id, Math.min(cap, Math.floor(amount))]);
}

/** Presentation-only progress receipt. Restoring it never grants materials or advances progression. */
export function atlasCoreNormalizeResultEndgame(env, raw) {
    if (!raw || typeof raw !== 'object') return null;
    const count = value => Math.max(0, Math.min(env.deps.ATLAS_ENDGAME.itemCap, Math.floor(Number(value) || 0)));
    return { items: atlasCoreNormalizeResultMaterials(env, raw.items, env.deps.ATLAS_ENDGAME.itemCap), invite: count(raw.invite), awakened: raw.awakened === true };
}

export function atlasCoreNormalizeResultMemoryTicket(env, raw) {
    if (!raw || !env.BY_ID.has(raw.node) || !env.deps.memoryDungeon.validTier(raw.tier)) return null;
    return { node: raw.node, tier: raw.tier };
}

export function atlasCoreCompletedMemoryResult(env, map, settled) {
    return atlasCoreNormalizeResultMemory(env, { foughtTier: map.memory, newBest: settled.spoils?.best, ticket: settled.ticket }, false);
}

/** This names a completed or failed memory fight and its actual ticket drop; loading it never pays rewards. */
export function atlasCoreNormalizeResultMemory(env, raw, failed) {
    if (!raw || typeof raw !== 'object') return null;
    const foughtTier = env.deps.memoryDungeon.validTier(raw.foughtTier) ? raw.foughtTier : 0;
    const ticket = failed ? null : atlasCoreNormalizeResultMemoryTicket(env, raw.ticket);
    if (!foughtTier && !ticket) return null;
    return { foughtTier, newBest: !failed && foughtTier > 0 && raw.newBest === true, ticket };
}

/** A given stone on the result card: { node, tier } of a chart map (the first clear's new maps, the last portal's refund). */
export function atlasCoreNormalizeGivenStone(env, raw) {
    const node = raw && env.BY_ID.get(raw.node);
    return node?.kind === 'map' ? { node: node.id, tier: node.tier } : null;
}

/** 장비 상자 on the result card: how many were opened (fine: how many of them were 상급), how many items they gave and the notable ones
 * (the loot receipt's item rows). null: none. */
export function atlasCoreNormalizeBoxes(env, raw) {
    const count = Math.min(9, Math.floor(Number(raw && raw.count)));
    if (!(count >= 1)) return null;
    return { count, fine: Math.max(0, Math.min(count, Math.floor(Number(raw.fine) || 0))), total: Math.max(0, Math.min(99, Math.floor(Number(raw.total) || 0))),
        items: env.deps.combatLootReceipts.cleanItems(raw.items) };
}

/** What the passive stars added to a clear: 형체 없는 이슬 found (0 or 1), the dew kept at entry, the stones given. null: nothing. */
export function atlasCoreNormalizeStarGains(env, raw) {
    if (!raw || typeof raw !== 'object') return null;
    const stones = (Array.isArray(raw.stones) ? raw.stones : []).slice(0, 2).map(row => atlasCoreNormalizeGivenStone(env, row)).filter(Boolean);
    const gains = { dew: raw.dew === 1 ? 1 : 0, dewKept: raw.dewKept === true, stones };
    return gains.dew || gains.dewKept || stones.length ? gains : null;
}

/** What the clear or the failure gave besides loot (presentation only: loading it never grants anything). */
function normalizeGiven(env, raw, failed) {
    const granted = failed || !Array.isArray(raw.granted) ? [] : raw.granted.slice(0, env.MAP_NODES.length).map(row => atlasCoreNormalizeGivenStone(env, row)).filter(Boolean);
    return { granted, boxes: failed ? null : atlasCoreNormalizeBoxes(env, raw.boxes), refund: failed ? atlasCoreNormalizeGivenStone(env, raw.refund) : null,
        stars: failed ? null : atlasCoreNormalizeStarGains(env, raw.stars) };
}

export function atlasCoreNormalizeResult(env, raw) {
    if (!raw || !env.BY_ID.has(raw.nodeId) || !['complete', 'failed'].includes(raw.outcome)) return null;
    const count = value => Math.max(0, Math.min(env.deps.ATLAS.stashCap, Math.floor(Number(value) || 0)));
    const failed = raw.outcome === 'failed';
    return { nodeId: raw.nodeId, tier: Math.max(1, Math.min(env.deps.ATLAS.tierCap, Math.floor(Number(raw.tier) || 1))), outcome: raw.outcome,
        first: raw.first === true, bonus: raw.bonus === true, drops: count(raw.drops), lost: count(raw.lost), fragments: count(raw.fragments),
        lostFragments: Math.min(env.deps.ATLAS.fragmentRules.held, count(raw.lostFragments)),
        lostMaterials: failed ? atlasCoreNormalizeResultMaterials(env, raw.lostMaterials, env.deps.ATLAS_ENDGAME.itemCap * 10) : [],
        seed: !failed && raw.seed === true, seeds: Math.min(env.deps.ATLAS.seeds.max, count(raw.seeds)), endgame: failed ? null : atlasCoreNormalizeResultEndgame(env, raw.endgame),
        loot: atlasCoreNormalizeLoot(env, raw.loot), memory: atlasCoreNormalizeResultMemory(env, raw.memory, failed), ...normalizeGiven(env, raw, failed) };
}
