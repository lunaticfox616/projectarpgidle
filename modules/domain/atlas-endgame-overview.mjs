import { atlasLateAwakened, atlasLateLedger, atlasLateKills, atlasLateEntryOf, atlasLateCount } from './atlas-endgame-ledger.mjs';
import { atlasLateUnlocked, atlasLateLockText, atlasLateEntryReason, atlasLateChartGate, atlasLateFreeEntry } from './atlas-endgame-access.mjs';

/** 루프가 바뀌어도 남는 지갑의 제단 재료(성화 잉걸, 허기의 즙): 루프 정산이 지갑을 비운 뒤 되돌린다(js/combat.js).
 * 2026-10-10 지갑으로 옮긴 뒤 루프마다 사라지고 있었다. @returns {Array<[string, number]>} [재화, 수] */
export function atlasLateLoopKeptCurrencies(env, state) {
    return Object.values(env.WALLET).map(key => [key, Math.max(0, Math.floor(Number(state.currencies[key]) || 0))]);
}

/** Everything the late-atlas view shows. */
/** lock: the unlock condition a card shows once the atlas is awake and the fight is still closed (asleep, the view's head says it).
 * A fight of a chart boss shows its chart condition awake or not (it does not wait for the awakening). */
export function atlasLateLockOf(env, state, row) {
    const shown = atlasLateAwakened(state) || !!atlasLateChartGate(env, row.id);
    return shown && !atlasLateUnlocked(env, state, row) ? atlasLateLockText(env, state, row) : '';
}

/** The offering a card lists as have/need chips: none for the free first fight of a chart boss. */
function atlasLateEntryChips(env, state, row) {
    if (atlasLateFreeEntry(env, state, row.id)) return [];
    return atlasLateEntryOf(row).map(([item, need]) => ({ item, name: env.E.items[item].name, have: atlasLateCount(env, state, item), need }));
}

export function atlasLateOverview(env, state) {
    const fight = row => ({ row, unlocked: atlasLateUnlocked(env, state, row), reason: atlasLateEntryReason(env, state, row.id), lock: atlasLateLockOf(env, state, row), kills: atlasLateKills(state, row.id),
        entry: atlasLateEntryChips(env, state, row) });
    const book = atlasLateLedger(state);
    return { awakened: atlasLateAwakened(state), apexes: env.E.apexes.map(row => fight({ ...row, kind: 'apex' })), leagues: env.E.leagues.map(row => fight({ ...row, kind: 'league' })),
        blight: env.deps.ATLAS.regions.map(region => ({ region, level: book.blight[region.id] || 0 })), witness: book.witness, witnessPer: env.E.witness.per,
        gardenerDown: atlasLateKills(state, 'apex_gardener') > 0 };
}
