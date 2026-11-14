import { memoryArenaCount, memoryArenaLedger, memoryArenaEmptyRow } from './memory-dungeon-ledger.mjs';
import { memoryArenaMaxTier, memoryArenaValidTier, memoryArenaMapTier, memoryArenaEntryReason } from './memory-dungeon-access.mjs';
import { memoryArenaOwnUnique, memoryArenaRewardExpectations } from './memory-dungeon-rewards.mjs';

export function memoryArenaNextMemoryPreview(env, state, node, tier) {
    if (tier >= env.M.tiers) return null;
    const nextTier = tier + 1, have = memoryArenaCount(state, node.id, nextTier);
    const reason = nextTier > memoryArenaMaxTier(env, state) ? env.deps._t('{nextTier}단계 기억은 기억 던전 4, 5 해금 뒤에 얻을 수 있습니다.', { nextTier })
        : have >= env.M.ticketCap ? env.deps._t('다음 단계 기억의 보관 한도 {ticketCap}개에 도달했습니다.', { ticketCap: env.M.ticketCap }) : '';
    return { tier: nextTier, chance: reason ? 0 : env.M.ladder[tier - 1], reason, have, cap: env.M.ticketCap };
}

/** Read-only preparation for a held memory or a past record. Choosing it never consumes a memory or advances random rolls. */
export function memoryArenaPreview(env, state, nodeId, tier) {
    const node = env.deps.atlas.node(nodeId);
    if (!node || !memoryArenaValidTier(env, tier)) return null;
    const map = env.deps.atlasMaps.create(nodeId, memoryArenaMapTier(env, state, node, tier), 'normal', () => 0), own = memoryArenaOwnUnique(env, node);
    map.memory = tier;
    const rewards = memoryArenaRewardExpectations(env, tier, map.tier).filter(([key, expected]) => expected > 0 && env.deps.contentProgression.canDropCurrency(key, state))
        .map(([key, expected]) => ({ key, min: Math.floor(expected), max: Math.ceil(expected), extraChance: expected % 1 }));
    return { node, tier, have: memoryArenaCount(state, nodeId, tier), map, best: memoryArenaLedger(state).best[nodeId] || 0,
        reason: memoryArenaEntryReason(env, state, nodeId, tier), rewards,
        unique: { name: own, chance: env.M.uniqueChance[own ? 'own' : 'other'][tier - 1], swapChance: env.M.swap[tier - 1] },
        gear: tier >= env.M.gearFrom, next: memoryArenaNextMemoryPreview(env, state, node, tier) };
}

/** Held memories and past victories: spending the last ticket must not hide a boss's best-tier record. */
export function memoryArenaOverview(env, state) {
    const book = memoryArenaLedger(state), ids = new Set([...Object.keys(book.tickets), ...Object.keys(book.best)]);
    return [...ids].map(id => {
        const node = env.deps.atlas.node(id), row = book.tickets[id] || memoryArenaEmptyRow(env);
        return { node, counts: row.slice(), best: memoryArenaLedger(state).best[id] || 0, unique: memoryArenaOwnUnique(env, node),
            tiers: row.map((have, index) => ({ tier: index + 1, have, mapTier: memoryArenaMapTier(env, state, node, index + 1), reason: memoryArenaEntryReason(env, state, id, index + 1) })) };
    }).sort((a, b) => b.counts.findLastIndex(value => value > 0) - a.counts.findLastIndex(value => value > 0) || a.node.boss.localeCompare(b.node.boss));
}
