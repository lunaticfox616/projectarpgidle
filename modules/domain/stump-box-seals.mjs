import { stumpOf, stumpEditable } from './stump-box-state.mjs';
import { stumpSealLimit, stumpDevourOpen, stumpStorageFull } from './stump-box-unlocks.mjs';
import { stumpIsOpen } from './stump-box-geometry.mjs';
import { stumpIsSealed } from './stump-box-seals-read.mjs';

/** '' when the cell can be sealed (or unsealed) now, otherwise why not. */
export function stumpSealReason(env, state, cell) {
    const box = stumpOf(env, state);
    if (!stumpSealLimit(env, state)) return '봉인 칸 해금 뒤에 열립니다.';
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    if (!stumpIsOpen(env, state, cell)) return '닫힌 칸입니다.';
    if (stumpIsSealed(box, cell)) return '';
    return box.sealed.length < stumpSealLimit(env, state) ? '' : env.deps._t('봉인 칸은 {state}개까지입니다.', { state: stumpSealLimit(env, state) });
}

export function stumpToggleSeal(env, state, cell) {
    if (stumpSealReason(env, state, cell)) return false;
    const box = stumpOf(env, state);
    box.sealed = stumpIsSealed(box, cell) ? box.sealed.filter(at => at !== cell) : box.sealed.concat(cell);
    return true;
}

/** A new 불씨의 흉터 in storage (force: a reward that must not be lost to a full storage); null before devouring opens. */
export function stumpAddScar(env, state, force) {
    const box = stumpOf(env, state);
    if (!box.acquired || !stumpDevourOpen(env, state) || (!force && stumpStorageFull(env, state))) return null;
    const item = { id: box.nextId++, family: 'scar', color: null, path: null, xp: 0, ripe: false, roll: 1, absorbed: {}, meals: 0, misses: 0 };
    box.items.push(item);
    return item;
}

/** The first 불씨의 흉터 comes with 포식 (once; box.scarGift is the receipt). @returns {?object} the scar when given now. */
export function stumpGrantScar(env, state) {
    const box = stumpOf(env, state);
    if (box.scarGift || !stumpDevourOpen(env, state)) return null;
    const item = stumpAddScar(env, state, true);
    if (item) box.scarGift = true;
    return item;
}

/** An atlas final boss kill: a 불씨의 흉터 now and then (STUMP_BOX_SCAR.bossChance, once devouring is open). */
export function* stumpRollScarDrop(env, state, random = Math.random) {
    if (!stumpDevourOpen(env, state) || random() >= env.deps.STUMP_BOX_SCAR.bossChance) return null;
    const item = stumpAddScar(env, state, true);
    if (item) yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-changed', { ripened: [], drop: item, compost: null }] };
    return item;
}
