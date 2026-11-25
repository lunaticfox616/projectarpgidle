import { atlasLateKills, atlasLateCountKill, atlasLateAwakened } from './atlas-endgame-ledger.mjs';
import { atlasLateKeepHeld, atlasLateBossMaterial, atlasLateFightSpoils, atlasLateWitnessKill } from './atlas-endgame-spoils.mjs';
import { atlasLateCleanseBlight, atlasLateSpreadBlight } from './atlas-endgame-blight.mjs';

/** Boss down in a late-atlas run or a map (js/atlas.js complete): kills, awakening, materials, blight, witness and the fight's spoils.
 * A fight a chart boss plays (atlas gateOf: 벨라-루, 아리안로드, 정원사의 메아리, 나무꾼, 베일라) opens before the awakening, so its
 * spoils, its unique (the first kill's guarantee included) and a final boss's stump gifts do not wait for it; the rest still does.
 * @returns {object} what the result screen and the log tell. */
export function* atlasLateOnComplete(env, state, node, run) {
    const out = { items: [], rewards: [], unique: null, awakened: false, invite: 0, blight: null };
    const apostle = env.APOSTLES.get(run.endgame && run.endgame.apostle) || null, first = atlasLateKills(state, node.id) < 1;
    out.awakened = atlasLateCountKill(env, state, node, apostle);
    const awake = atlasLateAwakened(state);
    if (!awake && !env.deps.atlas.gateOf(node.id)) return out;
    atlasLateFightSpoils(env, state, node, out, first);
    if (node.kind === 'apex') yield* atlasLateApexStumpDrops(state); // 그루터기 함 불씨의 흉터(포식이 열린 뒤)와 고대 씨앗(루프 42)
    if (awake) atlasLateAwakeSpoils(env, state, { node, run, apostle }, out);
    return out;
}

/** What only an awakened atlas adds to a kill: the late materials the run held, the boss's own material, blight and the weaver's witness. */
function atlasLateAwakeSpoils(env, state, kill, out) {
    const { node, run, apostle } = kill;
    atlasLateKeepHeld(env, state, run, out);
    atlasLateBossMaterial(env, state, node, run, out);
    if (node.kind === 'map' && atlasLateKills(state, 'apex_gardener') > 0) out.blight = apostle ? atlasLateCleanseBlight(state, node.region) : atlasLateSpreadBlight(env, state, node.region);
    if (!out.awakened) out.invite = atlasLateWitnessKill(env, state, node, apostle);
}

/** A final boss's stump box gifts: a scar (once devouring opens) and, from loop 42, sometimes an ancient seed (js/stump-nursery.js). */
export function* atlasLateApexStumpDrops(state) {
    yield { kind: 'grantApexScar', args: [state] };
    yield { kind: 'grantApexAncient', args: [state] };
}
