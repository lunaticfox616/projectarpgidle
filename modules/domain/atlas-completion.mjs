import { atlasCoreAddFragments, atlasCoreStore } from './atlas-inventory.mjs';
import { atlasCoreCompleted } from './atlas-graph.mjs';
import { atlasCoreBossSpoils } from './atlas-boss-rewards.mjs';
import { atlasCoreNormalizeResultEndgame, atlasCoreCompletedMemoryResult, atlasCoreNormalizeLoot, atlasCoreNormalizeResultMaterials, atlasCoreNormalizeResultMemory } from './atlas-receipts.mjs';

/** Travel failed right after opening: the untouched map (or the pinnacle's tickets) and its fragments go back. */
export function atlasCoreCancel(env, state) {
    const run = state.atlas.run;
    if (!run) return;
    if (run.board) { state.atlas.run = null; return; }
    if (run.map.memory) env.deps.memoryDungeon.refund(state, run.map);
    else if (run.map.node === env.PINNACLE.id) for (const key of env.deps.ATLAS.pinnacle.tickets) state.currencies[key] += 1;
    else if (env.deps.atlasEndgame.isFight(run.map.node)) env.deps.atlasEndgame.refund(state, run.map.node);
    else state.atlas.stash.unshift(run.map);
    atlasCoreAddFragments(env, state, run.spent);
    state.atlas.run = null;
}

/** A ring board map down (js/atlas-board.js complete): its rewards go to the board, never completion, bonus or the stash. */
export function atlasCoreCompleteBoard(env, state, run) {
    const board = env.deps.atlasBoard.complete(state, run.board);
    if (!board) return null;
    state.atlas.run = null;
    state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome: 'complete', first: false, bonus: false, drops: 0, lost: 0,
        fragments: 0, lostFragments: 0, lostMaterials: [], memory: null };
    return { ...state.atlas.lastResult, board, returnZoneId: run.returnZoneId };
}

/** Boss down: completion (and the bonus for a rare map) count once per node; the run's drops go to the stash. */
export function atlasCoreComplete(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board) return atlasCoreCompleteBoard(env, state, run);
    // 기억 싸움은 노드를 끝낸 것으로 치지 않는다: 시대 재생 뒤 기억으로 길을 건너뛰어 노드를 열거나, 정점의 기억이 아틀라스를 깨우거나,
    // 머리줄 완료가 51을 넘던 문제(2026-10-18).
    const id = run.map.node, recalled = !!run.map.memory, first = !recalled && !atlasCoreCompleted(state, id);
    if (first) state.atlas.completed.push(id);
    const bonus = !recalled && run.map.rarity === 'rare' && !state.atlas.bonus.includes(id);
    if (bonus) state.atlas.bonus.push(id);
    const stored = atlasCoreStore(env, state, run.drops), fragments = atlasCoreAddFragments(env, state, run.found);
    state.atlas.run = null;
    state.atlas.tally.maps += 1;
    state.atlas.lastResult = { nodeId: id, tier: run.map.tier, outcome: 'complete', first, bonus, drops: stored,
        lost: run.drops.length - stored, fragments, lostFragments: run.found.length - fragments, lostMaterials: [] };
    // 기억 싸움은 그 보스의 기억 보상만(입장권, 씨앗, 후반부 보상과 처치 수는 원래 싸움의 몫), 다른 싸움은 기억을 남길 수 있다.
    const node = env.BY_ID.get(id), memory = env.deps.memoryDungeon.settle(state, node, run.map, Math.random, run.bonus);
    const endgame = recalled ? null : env.deps.atlasEndgame.onComplete(state, node, run);
    const spoils = recalled ? {} : atlasCoreBossSpoils(env, state, node);
    Object.assign(state.atlas.lastResult, { seed: spoils.seed === true, seeds: state.atlas.seeds, endgame: atlasCoreNormalizeResultEndgame(env, endgame),
        memory: atlasCoreCompletedMemoryResult(env, run.map, memory) });
    // The event keeps its payout contract; only lastResult stores the bounded presentation receipt above.
    return { ...state.atlas.lastResult, ...spoils, endgame, memory, returnZoneId: run.returnZoneId };
}

/** An ordinary room emptied in the open map stays empty when a portal re-enters it: it is the same map. */
export function atlasCoreMarkCleared(state, roomId) {
    const run = state.atlas.run;
    if (run && !run.cleared.includes(roomId)) run.cleared.push(roomId);
}

/** The finished map's loot receipt stays with its result (a chained map starts a new receipt). */
export function atlasCoreKeepLoot(env, state, receipt) {
    if (state.atlas.lastResult && receipt) state.atlas.lastResult.loot = atlasCoreNormalizeLoot(env, receipt);
}

/** Death, a town return or leaving the map spends a portal; the last one closes the map and loses its held drops. */
export function atlasCoreUsePortal(env, state) {
    const run = state.atlas.run;
    if (!run) return null;
    run.portals = run.board ? 0 : Math.max(0, run.portals - 1);
    if (run.portals > 0) return { closed: false, portals: run.portals };
    return { closed: true, ...atlasCoreClose(env, state, 'failed') };
}

export function atlasCoreClose(env, state, outcome) {
    const run = state.atlas.run;
    if (!run) return null;
    if (run.board && outcome === 'failed') env.deps.atlasBoard.fail(state, run.board);
    state.atlas.run = null;
    state.atlas.lastResult = { nodeId: run.map.node, tier: run.map.tier, outcome, first: false, bonus: false, drops: 0,
        lost: run.drops.length, fragments: 0, lostFragments: run.found.length,
        lostMaterials: atlasCoreNormalizeResultMaterials(env, Object.entries(run.endgame.items), env.deps.ATLAS_ENDGAME.itemCap * 10),
        seed: false, seeds: state.atlas.seeds, endgame: null,
        memory: atlasCoreNormalizeResultMemory(env, { foughtTier: run.map.memory }, true) };
    // Floor drops already entered this receipt when produced; the existing departure still collects them exactly once.
    atlasCoreKeepLoot(env, state, state.explorationLoot);
    return { returnZoneId: run.returnZoneId };
}
