import { atlasCoreNormalizeTally } from './atlas-receipts.mjs';

export function atlasCoreDefaults(env) {
    return { version: 1, unlocked: false, completed: [], bonus: [], passives: [], seeds: 0, stash: [], fragments: {}, loadout: [], nextUid: 1,
        run: null, lastResult: null, autoMap: false, autoGuardians: true, starterSeason: 0, epoch: { count: 0, essence: 0, perks: {} }, endgame: env.deps.atlasEndgame.defaults(),
        memory: { tickets: {}, best: {}, variants: {} }, leaves: env.deps.memoryLeaves.defaults(), board: env.deps.atlasBoard.defaults(), tally: atlasCoreNormalizeTally(null) };
}
