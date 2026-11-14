import { stumpDevourOpen, stumpBreedingOpen } from './stump-box-unlocks.mjs';
import { stumpAddScar } from './stump-box-seals.mjs';
import { stumpCreateItem } from './stump-box-items.mjs';
import { stumpCompostOverflow } from './stump-box-drops.mjs';
import { stumpPlacedItems } from './stump-box-board-items.mjs';
import { stumpIsMature } from './stump-box-item-values.mjs';
import { stumpInvalidatePlacementUndo } from './stump-box-state.mjs';
import { stumpDevour } from './stump-box-devour.mjs';

/** One spec per grown fruit: usually its colour; a mutation gives another colour, a golden seed, or a scar instead. */
export function stumpBreedSpec(env, state, fruit, random) {
    const odds = env.deps.STUMP_BOX_BREEDING.mutation;
    if (stumpDevourOpen(env, state) && random() < odds.scar) return { scar: true, parent: fruit.color };
    const others = env.COLORS.filter(color => color !== fruit.color);
    const color = random() < odds.color ? others[Math.floor(random() * others.length)] : fruit.color;
    const roll = env.deps.STUMP_BOX_DROPS.roll.min + random() * (env.deps.STUMP_BOX_DROPS.roll.max - env.deps.STUMP_BOX_DROPS.roll.min);
    return { family: 'seed', color, roll, golden: random() < odds.golden, parent: fruit.color };
}

/** Puts the bred seeds in storage (a full storage turns a seed into compost, as drops do). @returns {object[]} { spec, item, compost } */
export function stumpBreed(env, state, specs, random) {
    return specs.map(spec => {
        if (spec.scar) return { spec, item: stumpAddScar(env, state, true), compost: null };
        const item = stumpCreateItem(env, state, spec);
        if (item) return { spec, item, compost: null };
        return { spec, item: null, compost: stumpCompostOverflow(env, state, spec, random) };
    });
}

/** New loop (2026-11-04 사용자): every item outside the seal cells goes, on the board, in storage and in the nursery (seeds,
 * talismans and scars); what the seal cells hold stays as it is. Gear sockets are not the box and keep theirs.
 * @returns {{count: number, sealed: number}} items gone and items kept */
export function stumpClearUnsealed(box) {
    const kept = new Set(box.sealed.map(cell => box.board[cell]).filter(id => id !== null));
    const count = box.items.filter(item => !kept.has(item.id)).length;
    box.items = box.items.filter(item => kept.has(item.id));
    box.board = box.board.map(id => (id !== null && kept.has(id) ? id : null));
    box.nursery = box.nursery.map(() => null);
    return { count, sealed: box.items.length };
}

/** The grown fruits on the board that leave a seed this loop (번식 open). */
export function stumpGrownFruits(env, state, box) {
    return box.acquired && stumpBreedingOpen(env, state) ? stumpPlacedItems(box).filter(item => item.path === 'fruit' && stumpIsMature(item)) : [];
}

/** New loop: grown scars in seal cells bite (포식), grown fruits are noted for breeding, everything outside the seal cells goes,
 * then the bred seeds arrive in storage. @returns {number} how many items went. */
export function* stumpRegress(env, state, random = Math.random) {
    stumpInvalidatePlacementUndo(env, state);
    const box = state.stumpBox;
    if (!box || !Array.isArray(box.items)) return 0;
    if (!Array.isArray(box.sealed)) box.sealed = [];
    const eaten = box.acquired ? stumpDevour(env, state, random) : [], fruits = stumpGrownFruits(env, state, box);
    const back = stumpClearUnsealed(box);
    box.wallet = {}; // 화폐화한 재화도 초기화(2026-11-03 사용자)
    const bred = stumpBreed(env, state, fruits.map(fruit => stumpBreedSpec(env, state, fruit, random)), random);
    if (back.count || back.sealed || eaten.length || bred.length) yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-regressed', { ...back, eaten, bred }] };
    return back.count;
}
