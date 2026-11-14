import { memoryArenaCount } from './memory-dungeon-ledger.mjs';

export function memoryArenaOpen(env, state) { return env.deps.contentProgression.holds('memoryDungeon', state); }

export function memoryArenaValidTier(env, value) { return Number.isInteger(value) && value >= 1 && value <= env.M.tiers; }

/** The highest tier that drops and opens now: 3, then 5 with the 기억 던전 4, 5 unlock. */
export function memoryArenaMaxTier(env, state) { return env.deps.contentProgression.holds('memoryDeep', state) ? env.M.tiers : env.M.highTiers.from - 1; }

/** '' when the memory fight can open now, otherwise why not. */
export function memoryArenaEntryReason(env, state, nodeId, tier) {
    if (!memoryArenaOpen(env, state)) return '기억 던전 해금 뒤에 열립니다.';
    if (!env.deps.atlas.node(nodeId) || !memoryArenaValidTier(env, tier)) return '없는 기억입니다.';
    if (tier > memoryArenaMaxTier(env, state)) return env.deps._t('{tier}단계는 기억 던전 4, 5 해금 뒤에 도전할 수 있습니다.', { tier });
    const lock = env.deps.atlas.lockReason(state);
    if (lock) return lock;
    if (state.atlas.run) return env.deps.atlas.runOpenReason(state);
    return memoryArenaCount(state, nodeId, tier) > 0 ? '' : '그 단계의 기억이 없습니다.';
}

// ---------------------------------------------------------------- the fight
/** The memory map's tier: the node's tier + tierStep × tier, under the atlas cap. */
export function memoryArenaMapTier(env, state, node, tier) { return Math.min(env.deps.ATLAS.tierCap, env.deps.atlas.effectiveTier(state, node) + env.M.fight.tierStep * tier); }
