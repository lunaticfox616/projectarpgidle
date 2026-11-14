import { stumpParseHarvestPrice, stumpHarvestPriceKey } from './stump-box-harvest-price.mjs';
import { stumpStorage } from './stump-box-storage.mjs';
import { stumpIsMature, stumpYieldKind, stumpIsPlainHarvest, stumpQualityOf, stumpIsGoldenHarvest } from './stump-box-item-values.mjs';
import { stumpDiscard } from './stump-box-items.mjs';
import { stumpOf, stumpEditable, stumpIsPlaced, stumpFindItem } from './stump-box-state.mjs';

export function stumpHarvestForPrice(env, state, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key);
    return stumpStorage(env, state).filter(item => stumpIsMature(item) && !item.locked && (kind === env.ANY_KIND || stumpYieldKind(item) === kind) && (!color || item.color === color))
        .sort((a, b) => stumpIsPlainHarvest(env, b) - stumpIsPlainHarvest(env, a) || stumpQualityOf(a) - stumpQualityOf(b));
}

export function stumpHarvestPriceHeld(env, state, key) { return stumpHarvestForPrice(env, state, key).length + stumpWalletForPrice(env, state, key).reduce((sum, stack) => sum + stumpWalletCount(env, state, stack), 0); }

/** 값을 치른다: 화폐화한 재화부터 내고, 없으면 보관함의 실물을 낸다. 낸 것을 돌려주고, 가진 것이 없으면 null. */
export function stumpPayHarvestPrice(env, state, key) {
    const stack = stumpWalletForPrice(env, state, key)[0];
    if (stack) return stumpSpendWallet(env, state, stack) ? { walletKey: stack } : null;
    const item = stumpHarvestForPrice(env, state, key)[0];
    return item && stumpDiscard(env, state, item.id) ? item : null;
}

// ── 화폐화(2026-11-03 사용자: 보관함 칸 이득) ───────────────
// box.wallet은 'flower-fire': 개수. 실물의 품질과 황금 같은 표식은 남지 않고, 루프가 바뀌면 사라진다(2026-11-03 사용자). 값을 치를 때 실물보다 먼저 나간다.
// 조합창은 재화 조각(walletPiece)을 가리키기만 해서, 꺼내면 그대로이고 조합할 때만 줄어든다(js/stump-cube.js).
export function stumpWalletCount(env, state, key) { return Number(stumpOf(env, state).wallet[key]) || 0; }

export function stumpWalletTotal(env, state) { return env.HARVEST_KEYS.reduce((sum, key) => sum + stumpWalletCount(env, state, key), 0); }

export function stumpAddToWallet(box, item) {
    const key = `${stumpYieldKind(item)}-${item.color}`;
    box.wallet[key] = (Number(box.wallet[key]) || 0) + 1;
}

/** The stacks a price can take: its colour's (every kind's for any), or with no colour the biggest first. */
export function stumpWalletForPrice(env, state, key) {
    const { kind, color } = stumpParseHarvestPrice(env, key), kinds = kind === env.ANY_KIND ? env.KINDS : [kind];
    return kinds.flatMap(one => (color ? [color] : env.COLORS).map(tone => `${one}-${tone}`)).filter(stack => stumpWalletCount(env, state, stack) > 0)
        .sort((a, b) => stumpWalletCount(env, state, b) - stumpWalletCount(env, state, a));
}

export function stumpSpendWallet(env, state, key) {
    const left = stumpWalletCount(env, state, key);
    if (left < 1) return false;
    if (left === 1) delete stumpOf(env, state).wallet[key];
    else stumpOf(env, state).wallet[key] = left - 1;
    return true;
}

/** A grown seed in storage, not locked. */
export function stumpCanMonetize(env, state, item) {
    return !!item && stumpEditable(env, state) && env.FAMILIES.includes(item.family) && stumpIsMature(item) && !item.locked && !stumpIsPlaced(env, state, item.id);
}

/** Turns one stored grown item into currency for good. @returns {boolean} whether it went */
export function stumpMonetize(env, state, id) {
    const box = stumpOf(env, state), item = stumpFindItem(box, id);
    if (!stumpCanMonetize(env, state, item)) return false;
    box.items = box.items.filter(row => row !== item);
    stumpAddToWallet(box, item);
    return true;
}

/** What one kind and colour ('flower-fire') comes to as money: stored unlocked items and currency. */
export function stumpHarvestHoldings(env, state, key) {
    const [kind, color] = key.split('-');
    return { real: stumpHarvestForPrice(env, state, stumpHarvestPriceKey(kind, color)).length, wallet: stumpWalletCount(env, state, key) };
}

/** A cube material standing for one unit of a stack: always the same object for one id. */
export function stumpWalletPiece(env, key, index) {
    const id = `${key}#${index}`;
    if (!env.walletPieceMemo.has(id)) {
        const [kind, color] = key.split('-');
        env.walletPieceMemo.set(id, Object.freeze({ id, walletKey: key, family: 'seed', path: kind, color, xp: 0, ripe: true, roll: env.deps.STUMP_BOX_ROLL_LIMIT.min }));
    }
    return env.walletPieceMemo.get(id);
}

/** The piece of this id while the stack still holds it, else null. */
export function stumpWalletPieceById(env, state, id) {
    const [key, index] = String(id).split('#');
    return env.HARVEST_KEYS.includes(key) && Number(index) < stumpWalletCount(env, state, key) ? stumpWalletPiece(env, key, Number(index)) : null;
}

/** Up to limit pieces of each stack. */
export function stumpWalletPieces(env, state, limit) { return env.HARVEST_KEYS.flatMap(key => Array.from({ length: Math.min(limit, stumpWalletCount(env, state, key)) }, (_, index) => stumpWalletPiece(env, key, index))); }

export function stumpStoredFlowers(env, state, color, golden) { return stumpHarvestForPrice(env, state, stumpHarvestPriceKey('flower', color)).filter(golden ? (...args) => stumpIsGoldenHarvest(env, ...args) : (...args) => stumpIsPlainHarvest(env, ...args)); }

export function stumpStoredFlowerCount(env, state, color, golden) { return stumpStoredFlowers(env, state, color, golden).length + (golden ? 0 : stumpWalletCount(env, state, `flower-${color}`)); }

/** 꽃 하나를 쓴다: 화폐화한 꽃이면 { walletKey }, 실물이면 낸 꽃을 돌려주고, 가진 것이 없으면 null. */
export function stumpPayFlower(env, state, color, golden) {
    const stack = `flower-${color}`;
    if (!golden && stumpSpendWallet(env, state, stack)) return { walletKey: stack };
    const item = stumpStoredFlowers(env, state, color, golden)[0];
    return item && stumpDiscard(env, state, item.id) ? item : null;
}
