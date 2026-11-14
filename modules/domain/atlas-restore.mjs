import { atlasCoreRenameSavedIds, atlasCoreNodeList, atlasCoreNormalizeRun, atlasCoreNormalizeFragments, atlasCoreNormalizeMemory } from './atlas-restore-values.mjs';
import { atlasCoreDefaults } from './atlas-state.mjs';
import { atlasCoreNormalizeResult, atlasCoreNormalizeTally } from './atlas-receipts.mjs';
import { atlasCoreSetLoadout } from './atlas-loadout.mjs';

/** Defaults, the one-time move from the world-tree journey (its unlock carries over), corrupt entries dropped, unique uids. */
export function atlasCoreNormalize(env, state) {
    atlasCoreRenameSavedIds(env, [state.atlas, state.actExploration, state.enemies]);
    const raw = state.atlas && typeof state.atlas === 'object' ? state.atlas : {};
    env.deps.atlasEndgame.moveAltarMaterials(state, raw.endgame);
    const journeyUnlocked = !!(state.worldTreeJourney && state.worldTreeJourney.unlocked === true);
    delete state.worldTreeJourney;
    const uids = new Set(), validMap = entry => {
        const map = env.deps.atlasMaps.normalize(entry, id => env.BY_ID.has(id));
        if (!map || uids.has(map.uid)) return null;
        uids.add(map.uid);
        return map;
    };
    // The open map claims its uid first: a stash entry sharing it is the duplicate.
    const done = atlasCoreNodeList(env, raw.completed, () => true), bonus = atlasCoreNodeList(env, raw.bonus, id => done.includes(id)), run = atlasCoreNormalizeRun(env, raw.run, validMap);
    const epoch = env.deps.atlasEpoch.normalize(raw.epoch), epochPoints = env.deps.atlasEpoch.points({ atlas: { epoch } });
    const next = { ...atlasCoreDefaults(env), unlocked: raw.unlocked === true || journeyUnlocked, completed: done, bonus,
        passives: env.deps.atlasPassives.normalize(raw.passives, done.length + bonus.length + epochPoints), epoch,
        stash: (Array.isArray(raw.stash) ? raw.stash : []).map(validMap).filter(map => map && env.NODES.includes(env.BY_ID.get(map.node)) && map.node !== env.PINNACLE.id).slice(0, env.deps.ATLAS.stashCap),
        fragments: atlasCoreNormalizeFragments(env, raw.fragments), run, lastResult: atlasCoreNormalizeResult(env, raw.lastResult), endgame: env.deps.atlasEndgame.normalize(raw.endgame, done.includes(env.PINNACLE.id)),
        memory: atlasCoreNormalizeMemory(env, raw.memory), leaves: env.deps.memoryLeaves.normalize(raw.leaves), board: env.deps.atlasBoard.normalize(raw.board), tally: atlasCoreNormalizeTally(raw.tally),
        seeds: Math.max(0, Math.min(env.deps.ATLAS.seeds.max, Math.floor(Number(raw.seeds) || 0))),
        autoMap: raw.autoMap === true, autoGuardians: raw.autoGuardians !== false, starterSeason: Math.max(0, Math.floor(Number(raw.starterSeason) || 0)) };
    const savedNext = Math.floor(Number(raw.nextUid));
    next.nextUid = Math.min(Number.MAX_SAFE_INTEGER, Math.max(Number.isSafeInteger(savedNext) ? savedNext : 1, ...[...uids].map(uid => uid + 1), 1));
    state.atlas = next;
    atlasCoreRestoreBoardRun(env, raw, state);
    atlasCoreSetLoadout(env, state, Array.isArray(raw.loadout) ? raw.loadout : []);
    return next;
}

export function atlasCoreRestoreBoardRun(env, raw, state) {
    const next = state.atlas;
    if (!raw.run?.board || !next.run) return;
    const board = env.deps.atlasBoard.normalizeRun(raw.run.board, state);
    if (board && board.node === next.run.map.node && board.tier === next.run.map.tier) {
        next.run.board = board;
        next.run.portals = 1;
    }
    else next.run = null;
}
