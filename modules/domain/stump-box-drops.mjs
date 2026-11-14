import { stumpKillKind, stumpGrowingItems, stumpGrowBy, stumpGrow } from './stump-box-growth.mjs';
import { stumpSeedDropSpec } from './stump-box-seed-spec.mjs';
import { stumpCreateItem } from './stump-box-items.mjs';
import { stumpCompostGrowth } from './stump-box-compost.mjs';

/** What a kill dropped (seedDropSpec at the kill's chance), or null. */
export function stumpRollDropSpec(env, state, enemy, random) {
    return random() < env.deps.STUMP_BOX_DROPS.chance[stumpKillKind(enemy)] ? stumpSeedDropSpec(env, state, random) : null;
}

/** A rolled drop reaches the box. One that finds the storage full is not lost: it goes on the board as compost (nothing
 * happens when nothing grows). @returns {{item: ?object, compost: ?object}} compost = { family, color, growth, fed, ripened }. */
export function stumpReceiveDrop(env, state, spec, random = Math.random) {
    const item = stumpCreateItem(env, state, spec);
    if (item) return { item, compost: null };
    return { item: null, compost: stumpCompostOverflow(env, state, spec, random) };
}

/** The box's own drop roll, independent of gear drops. @returns {?{item: ?object, compost: ?object}} null when nothing dropped. */
export function stumpRollDrop(env, state, enemy, random) {
    const spec = stumpRollDropSpec(env, state, enemy, random);
    return spec ? stumpReceiveDrop(env, state, spec, random) : null;
}

/** A seed a full storage could not take feeds the growing items as compost instead (drops, breeding, nursery gifts).
 * @returns {{family:string, color:string, growth:number, fed:number, ripened:object[]}} fed: growing items that got it */
export function stumpCompostOverflow(env, state, spec, random = Math.random) {
    const growth = stumpCompostGrowth(env, spec, state), fed = stumpGrowingItems(env, state).length;
    return { family: spec.family, color: spec.color, growth, fed, ripened: stumpGrowBy(env, state, growth, random) };
}

export function stumpDropsHere(env, state) { return !(typeof env.deps.actExplorationState === 'object' && env.deps.actExplorationState.current(state)?.act != null); }

/** A kill's drop roll, where the box drops: story-act expeditions do not roll it (growth still counts); generated maps
 * (chaos, realm, the atlas) and places without a map do. */
export function stumpRollKillDrop(env, state, enemy) {
    return state.stumpBox && state.stumpBox.acquired && stumpDropsHere(env, state) ? stumpRollDropSpec(env, state, enemy, Math.random) : null;
}

/** One call per kill (live and offline replay alike). drop: what reaches the box from this kill; a live map's kill lays it on the
 * floor instead and passes null (js/combat-skill-effects.js layStumpDrop, 2026-11-02 사용자: 그냥 획득되어 뭘 먹었는지 몰랐다). */
export function* stumpOnEnemyKilled(env, state, enemy, drop = stumpRollKillDrop(env, state, enemy)) {
    const box = state.stumpBox;
    if (!box || !box.acquired) return;
    const ripened = stumpGrow(env, state, enemy), rolled = drop ? stumpReceiveDrop(env, state, drop) : env.NO_DROP;
    if (rolled.compost) ripened.push(...rolled.compost.ripened);
    if (!ripened.length && !rolled.item && !rolled.compost) return;
    if (state.noti) state.noti.stump = true;
    yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-changed', { ripened, drop: rolled.item, compost: rolled.compost }] };
}
