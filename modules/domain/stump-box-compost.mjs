import { stumpClampRoll, stumpIsMature, stumpIsPlainHarvest, stumpNeed } from './stump-box-item-values.mjs';
import { stumpRollCap, stumpBulkCompostOpen } from './stump-box-unlocks.mjs';
import { stumpOf, stumpFindItem, stumpEditable, stumpIsPlaced } from './stump-box-state.mjs';
import { stumpGrowingItems, stumpGrowBy } from './stump-box-growth.mjs';
import { stumpStorage } from './stump-box-storage.mjs';
import { stumpAddToWallet } from './stump-box-wallet.mjs';

// ── 거름 ───────────────────────────────────────────────
/** The growth a seed gives as compost (its quality scales it, up to the box's cap: past 130% from loop 35, 2026-10-20). */
export function stumpCompostGrowth(env, item, state) { return Math.round(env.deps.STUMP_BOX_COMPOST.growth * stumpClampRoll(env, item.roll, stumpRollCap(env, state))); }

/** '' when the stored seed can go on the board as compost, otherwise why not. */
export function stumpCompostReason(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    if (item && item.locked) return '잠긴 아이템은 거름으로 쓸 수 없습니다.';
    if (item && item.albino) return '알비노는 거름 대신 조합 재료로 사용할 수 있습니다.';
    if (!item || !env.FAMILIES.includes(item.family) || stumpIsPlaced(env, state, id)) return '보관함의 씨앗만 거름으로 쓸 수 있습니다.';
    return stumpGrowingItems(env, state).length ? '' : '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.';
}

/** Spreads a stored seed: it is used up and every growing item gains its compost growth.
 * @returns {?{growth: number, fed: number, ripened: object[]}} null when not allowed. */
export function stumpCompost(env, state, id) {
    if (stumpCompostReason(env, state, id)) return null;
    const box = stumpOf(env, state), item = stumpFindItem(box, id), growth = stumpCompostGrowth(env, item, state), fed = stumpGrowingItems(env, state).length;
    box.items = box.items.filter(other => other.id !== id);
    return { growth, fed, ripened: stumpGrowBy(env, state, growth) };
}

/** Ashes of an item a burning branch burned away (12번 루프 30, js/ember-corruption-ui.js): every growing item gains `growth`,
 * and what ripens is announced as a kill's ripening is. @returns {?{growth: number, fed: number, ripened: object[]}} null when nothing grows. */
export function* stumpFeedAsh(env, state, growth) {
    const fed = stumpGrowingItems(env, state).length;
    if (!fed) return null;
    const ripened = stumpGrowBy(env, state, growth);
    if (ripened.length) yield { kind: 'dispatchRuntimeEvent', args: ['stump-box-changed', { ripened, drop: null, compost: null }] };
    return { growth, fed, ripened };
}

/** The colours a storage filter covers: one colour, or all five ('all'); none for the talisman filter. */
export function stumpFilterColors(env, filter) { return env.COLORS.includes(filter) ? [filter] : filter === 'all' ? env.COLORS : []; }

/** The stored seeds a storage filter covers. */
export function stumpStoredSeeds(env, state, filter) {
    const colors = stumpFilterColors(env, filter);
    return stumpStorage(env, state).filter(item => env.FAMILIES.includes(item.family) && colors.includes(item.color));
}

/** What 일괄 거름 사용 takes of a storage filter: its stored seeds but the best STUMP_BOX_BULK_COMPOST.keep of each colour
 * and kind (merging material) and golden or ancient ones. */
export function stumpBulkItems(env, state, filter) {
    const groups = new Map();
    stumpStoredSeeds(env, state, filter).forEach(item => {
        const key = `${item.color}-${item.path || 'seed'}`;
        groups.set(key, (groups.get(key) || []).concat(item));
    });
    return [...groups.values()].flatMap(list => list.sort((a, b) => b.roll - a.roll || a.id - b.id).slice(env.deps.STUMP_BOX_BULK_COMPOST.keep))
        .filter(item => !item.golden && !item.ancient && !item.albino && !item.locked);
}

/** What 일괄 버리기 takes of a storage filter: every stored seed but golden, ancient and growing ones, plain grown ones (they
 * become currency, discardMany), and under 전체 and 부적 the stored talismans but unique and grown ones (2026-10-23 사용자: 부적이 빠져 있었다).
 * Locked items always stay. It used to keep the best three of each kind as compost does (2026-10-17 사용자: 75개 중 25개만). */
export function stumpBulkDiscardItems(env, state, filter) {
    const seeds = stumpStoredSeeds(env, state, filter).filter(item => (stumpIsMature(item) ? stumpIsPlainHarvest(env, item) : !item.golden && !item.ancient && !item.albino && !item.xp));
    const talismanItems = filter === 'all' || filter === 'talisman'
        ? stumpStorage(env, state).filter(item => item.family === 'talisman' && item.rarity !== 'unique' && !item.xp && !stumpIsMature(item)) : [];
    return seeds.concat(talismanItems).filter(item => !item.locked);
}

/** The bulk-compost items in use order (lowest quality first), cut where everything growing has ripened as pressing them one by
 * one would stop: each compost feeds every growing item alike, so the item furthest from ripe decides. */
export function stumpBulkCompostPlan(env, state, filter) {
    const growing = stumpGrowingItems(env, state), plan = [];
    let left = growing.length ? Math.max(...growing.map(item => stumpNeed(env, item) - item.xp)) : 0;
    for (const item of stumpBulkItems(env, state, filter).sort((a, b) => a.roll - b.roll || a.id - b.id)) {
        if (left <= 0) break;
        plan.push(item);
        left -= stumpCompostGrowth(env, item, state);
    }
    return plan;
}

/** '' when bulk compost of this filter can run now, otherwise why not. */
export function stumpBulkCompostReason(env, state, filter) {
    if (!stumpBulkCompostOpen(env, state)) return `수확 일지를 ${env.deps.STUMP_BOX_UNLOCKS.find(row => row.bulkCompost).when.harvestCells}칸 채우면 열립니다.`;
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    if (!stumpGrowingItems(env, state).length) return '그루터기 함에서 성장 중인 그루터기 아이템이 없습니다.';
    return stumpBulkItems(env, state, filter).length ? '' : '거름으로 쓸 씨앗이 없습니다.';
}

/** Spreads the filter's bulk-compost plan one by one. @returns {?{count, growth, fed, ripened}} null when not allowed. */
export function stumpCompostMany(env, state, filter) {
    if (stumpBulkCompostReason(env, state, filter)) return null;
    const out = { count: 0, growth: 0, fed: stumpGrowingItems(env, state).length, ripened: [] };
    for (const item of stumpBulkCompostPlan(env, state, filter)) {
        const one = stumpCompost(env, state, item.id);
        if (!one) break;
        out.count++;
        out.growth += one.growth;
        out.ripened.push(...one.ripened);
    }
    return out;
}

/** '' when the filter's bulkDiscardItems can be thrown away now (일괄 버리기), otherwise why not. */
export function stumpBulkDiscardReason(env, state, filter) {
    if (!stumpEditable(env, state)) return '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.';
    return stumpBulkDiscardItems(env, state, filter).length ? '' : '버릴 아이템이 없습니다.';
}

/** 잠금(2026-10-23): a locked item stays out of 일괄 거름 사용 and 일괄 버리기 and cannot be composted or thrown away one by
 * one. @returns {boolean} whether it turned */
export function stumpToggleLock(env, state, id) {
    const item = stumpFindItem(stumpOf(env, state), id);
    if (!item || !stumpEditable(env, state)) return false;
    if (item.locked) delete item.locked;
    else item.locked = true;
    return true;
}

/** 일괄 버리기: throws the filter's bulkDiscardItems away, the grown ones into currency (2026-11-03 사용자). @returns {?object[]} what went, null when not allowed. */
export function stumpDiscardMany(env, state, filter) {
    if (stumpBulkDiscardReason(env, state, filter)) return null;
    const box = stumpOf(env, state), gone = stumpBulkDiscardItems(env, state, filter), ids = new Set(gone.map(item => item.id));
    box.items = box.items.filter(item => !ids.has(item.id));
    gone.filter(item => env.FAMILIES.includes(item.family) && stumpIsMature(item)).forEach(item => stumpAddToWallet(box, item));
    return gone;
}
