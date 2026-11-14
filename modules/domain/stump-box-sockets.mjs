import { stumpFindItem, stumpOf, stumpIsPlaced } from './stump-box-state.mjs';
import { stumpIsMature, stumpYieldKind, stumpQualityOf, stumpGoldenMul, stumpYieldOf, stumpAlbinoLines } from './stump-box-item-values.mjs';
import { stumpStorage } from './stump-box-storage.mjs';
import { stumpStorageFull } from './stump-box-unlocks.mjs';

// ── 고유 장비의 수확물 소켓(2026-11-03 사용자, js/equipment-sockets.js) ─────────
// 소켓에 든 꽃, 열매, 덩굴, 뿌리는 함을 떠나 장비에 산다(판의 공명과 접붙이기는 없다). 새 루프에 사라지는 것은 함의 것뿐이라 소켓의 것은 다 자란 채 남는다.
/** A stored, unlocked grown flower, fruit, vine or root that may go into a gear socket, else null. */
export function stumpSocketable(env, state, id) {
    const item = stumpFindItem(stumpOf(env, state), id);
    return item && !stumpIsPlaced(env, state, item.id) && !item.locked && env.FAMILIES.includes(item.family) && stumpIsMature(item) && stumpYieldKind(item) ? item : null;
}

/** Stored grown items of these kinds ('flower', 'fruit', 'vine', 'root') a socket could take, best quality first. */
export function stumpSocketCandidates(env, state, kinds) { return stumpStorage(env, state).filter(item => stumpSocketable(env, state, item.id) && kinds.includes(stumpYieldKind(item)))
    .sort((a, b) => stumpQualityOf(b) * stumpGoldenMul(env, b) - stumpQualityOf(a) * stumpGoldenMul(env, a)); }

/** Out of the box: it now lives in the socket. */
export function stumpTakeForSocket(env, state, item) {
    const box = stumpOf(env, state);
    box.items = box.items.filter(row => row !== item);
}

/** Back into storage from a socket. false when storage is full, unless forced (the gear is being destroyed): then it goes in past
 * the limit, never lost (2026-11-03 사용자). */
export function stumpReturnFromSocket(env, state, item, force = false) {
    if (!force && stumpStorageFull(env, state)) return false;
    delete item.slot;
    stumpOf(env, state).items.push(item);
    return true;
}

/** A socketed grown item's lines: its yield and ripening lines at its quality and golden, as on the board (no resonance, no graft). */
export function stumpSocketLines(env, item) {
    const made = stumpIsMature(item) ? stumpYieldOf(env, item) : null;
    if (!made) return [];
    const scale = stumpQualityOf(item) * stumpGoldenMul(env, item), round = value => Math.round(value * scale * 100) / 100;
    return [{ stat: made.stat, value: round(made.value) }]
        .concat(((item.harvest && item.harvest.lines) || []).map(line => ({ stat: line.stat, value: round(line.value) })), stumpAlbinoLines(env, item));
}
