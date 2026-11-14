import { memoryArenaEmptyRow } from './memory-dungeon-ledger.mjs';
import { memoryArenaValidTier } from './memory-dungeon-access.mjs';

// ---------------------------------------------------------------- save boundary and view
export function memoryArenaNormalizeRow(env, raw) {
    const row = memoryArenaEmptyRow(env).map((zero, index) => Math.max(0, Math.min(env.refundCap, Math.floor(Number(Array.isArray(raw) ? raw[index] : 0) || 0))));
    return row.some(value => value > 0) ? row : null;
}

export function memoryArenaNormalizeTickets(env, raw) {
    const out = {};
    for (const [id, row] of Object.entries(raw && typeof raw === 'object' ? raw : {})) {
        const kept = env.deps.atlas.node(id) ? memoryArenaNormalizeRow(env, row) : null;
        if (kept) out[id] = kept;
    }
    return out;
}

export function memoryArenaNormalizeBest(env, raw) {
    return Object.fromEntries(Object.entries(raw && typeof raw === 'object' ? raw : {}).filter(([id, tier]) => env.deps.atlas.node(id) && memoryArenaValidTier(env, tier)));
}

/** The boss variant record (12번 루프 33, js/boss-variants.js) lives with the memories. */
export function memoryArenaNormalizeVariants(env, raw) { return typeof env.deps.bossVariants === 'object' ? env.deps.bossVariants.normalizeKills(raw) : {}; }

/** Known nodes only, whole counts including one reserved refund, best tiers 1..5. Older rows need no migration. */
export function memoryArenaNormalize(env, raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    return { tickets: memoryArenaNormalizeTickets(env, source.tickets), best: memoryArenaNormalizeBest(env, source.best), variants: memoryArenaNormalizeVariants(env, source.variants) };
}
