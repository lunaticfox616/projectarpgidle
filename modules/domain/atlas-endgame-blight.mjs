import { atlasLateLedger } from './atlas-endgame-ledger.mjs';

export function atlasLateSpreadBlight(env, state, region) {
    const book = atlasLateLedger(state).blight;
    book[region] = Math.min(env.E.blight.max, (book[region] || 0) + env.E.blight.perMap);
    return { region, level: book[region] };
}

/** A fallen apostle lifts its region's blight (2026-10-10): it builds up again map by map, so an apostle holds about one map in
 * five instead of four in five, and the rot shards come about as fast as the other final bosses' offerings. */
export function atlasLateCleanseBlight(state, region) {
    atlasLateLedger(state).blight[region] = 0;
    return { region, level: 0, cleansed: true };
}
