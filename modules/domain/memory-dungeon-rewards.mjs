import { memoryArenaValidTier, memoryArenaOpen, memoryArenaMaxTier, memoryArenaMapTier } from './memory-dungeon-access.mjs';
import { memoryArenaGive, memoryArenaLedger } from './memory-dungeon-ledger.mjs';

// ---------------------------------------------------------------- a boss falls
/** The entry snapshot's 되감긴 기억 bonus survives closing the run before completion rewards are settled. */
export function memoryArenaMemoryDropMul(bonus) { return 1 + (Number(bonus.memoryDrop) || 0) / 100; }

/** The memory a fallen atlas boss leaves: tier 1 by chance after an ordinary fight, the next tier by the ladder after a memory fight. */
export function memoryArenaRollTicket(env, state, node, map, ...selection) {
const [random, bonus] = selection;
    const tier = memoryArenaValidTier(env, map.memory) ? map.memory + 1 : 1;
    if (!memoryArenaOpen(env, state) || tier > memoryArenaMaxTier(env, state)) return null;
    const chance = tier > 1 ? env.M.ladder[tier - 2] : (env.M.ticketDrop[node.kind] || 0) * memoryArenaMemoryDropMul(bonus);
    return random() < chance && memoryArenaGive(env, state, node.id, tier) ? { node: node.id, name: node.boss, tier } : null;
}

/** The boss's own unique: one of them when random is given (a boss may have two, data/atlas-endgame.js), else their names for show. */
export function memoryArenaOwnUnique(env, node, random = null) {
    const list = [].concat((env.deps.atlasEndgame.def(node.id) || {}).unique || []);
    if (!list.length) return null;
    return random ? list[Math.floor(random() * list.length)] : list.join(' 또는 ');
}

/** Shared reward expectations for settlement and the pre-entry preview; deriving them never rolls entropy. */
export function memoryArenaRewardExpectations(env, tier, mapTierValue) {
    const scale = Math.max(env.M.rewardScale.min, Math.min(env.M.rewardScale.max, mapTierValue / env.M.rewardTier));
    return [...env.M.rewards.map(([key, base, perTier]) => [key, base + perTier * tier]), ['burningEmberBranch', env.M.burning[tier - 1]]]
        .map(([key, expected]) => [key, expected * scale]);
}

/** Currency for a won tier. Keep one random draw per configured reward, including currently locked ones. */
export function memoryArenaRolledRewards(env, state, tier, mapTierValue, random) {
    return memoryArenaRewardExpectations(env, tier, mapTierValue)
        .map(([key, expected]) => [key, Math.floor(expected) + Number(random() < expected % 1)])
        .filter(([key, amount]) => amount > 0 && env.deps.contentProgression.canDropCurrency(key, state));
}

/** A won memory fight: its spoils (currency by tier, a unique by chance, a rare piece from gearFrom) and the best tier record. */
export function memoryArenaSpoils(env, state, node, tier, random) {
    const own = memoryArenaOwnUnique(env, node, random), book = memoryArenaLedger(state), best = (book.best[node.id] || 0) < tier;
    if (best) book.best[node.id] = tier;
    const unique = random() < env.M.uniqueChance[own ? 'own' : 'other'][tier - 1] ? (own || 'any') : null;
    return { tier, rewards: memoryArenaRolledRewards(env, state, tier, memoryArenaMapTier(env, state, node, tier), random), unique, gear: tier >= env.M.gearFrom, best };
}

/** Boss down in an atlas run (js/atlas.js complete): the memory it leaves and, after a memory fight, its spoils.
 * @returns {{ticket: ?object, spoils: ?object}} */
export function memoryArenaSettle(env, state, node, map, ...selection) {
const [random = Math.random, bonus = {}] = selection;
    const fight = memoryArenaValidTier(env, map.memory) ? memoryArenaSpoils(env, state, node, map.memory, random) : null;
    return { ticket: memoryArenaRollTicket(env, state, node, map, random, bonus), spoils: fight };
}
