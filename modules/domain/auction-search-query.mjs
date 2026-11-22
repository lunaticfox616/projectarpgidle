/**
 * 경매장 아이템 칸 검색의 조건 한 모양(query)과 저장한 검색(owner.auction.searches). 화면이 고르는 조건, 저장한 검색, 불러온 저장이 모두
 * auctionNormalizeQuery 하나로 고쳐진다: 모르는 종류, 부위, 등급, 출처, 계열, 재화, 능력치, 판매자는 버리거나 '전체'로 돌린다.
 * query: { name (40자까지), kind ('all' | 'gear' | 열린 종류), slot ('all' | 부위 열쇠), rarity, source ('all' | 'merchant' | 'user'),
 * family ('' | 계열), levelMin, levelMax (1..999 또는 null, 거꾸로면 바꾼다), priceMax (양의 정수 또는 null), currency (priceMax의 재화),
 * options ([{ stat, min }] 4개까지, min은 수 또는 null), variants ({ 변형 열쇠: 'any' | 'yes' | 'no' }), seller ([머리 번호, 꼬리 번호] 또는 null) }.
 * 능력치는 매물 줄이 가질 수 있는 것(추가 옵션, 베이스, 고유, 주얼, 액막이, 부적의 줄)만 안다. 저장한 검색은 AUCTION_SAVED_SEARCHES개까지이고
 * 넘치면 거절한다(오래된 것을 지우지 않는다). 같은 조건은 두 번 저장하지 않는다.
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { AUCTION_VARIANT_KEYS } from './auction-gear-rolls.mjs';

/** How many searches a save keeps, and how many option rows a query holds. */
export const AUCTION_SAVED_SEARCHES = 5;
export const AUCTION_QUERY_OPTIONS = 4;
/** The currencies a price limit can be written in (the appraisal's unit table converts between them). */
export const AUCTION_QUERY_CURRENCIES = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
const KINDS = Object.freeze(['all', 'gear', ...AUCTION_HOUSE.kinds.lots.map(row => row.kind)]);
const RARITIES = Object.freeze(['all', 'normal', 'magic', 'rare', 'unique']);
const SOURCES = Object.freeze(['all', 'merchant', 'user']);
const VARIANT_STATES = Object.freeze(['any', 'yes', 'no']);
const NAME_MAX = 40;
const LEVEL_MAX = 999;
const PRICE_MAX = 1e9;

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const pick = (allowed, value) => (allowed.includes(value) ? value : allowed[0]);

/** The stats lot lines can carry, made once: Map stat id -> its Korean line name ('' when the game's stat names give it). */
function statTable(env) {
    if (env.searchStats) return env.searchStats;
    const { MOD_DB, JEWEL_OPTION_POOL, BASE_ITEM_DB, UNIQUE_DB, COLONY_WARD_POOL, TALISMAN_STAT_POOL } = env.deps;
    const rows = [...MOD_DB.map(mod => [mod.statId || mod.id, mod.statName]), ...JEWEL_OPTION_POOL.map(row => [row.id]), ...BASE_ITEM_DB.flatMap(base => (base.baseStats || []).map(stat => [stat.id])),
        ...UNIQUE_DB.flatMap(unique => (unique.stats || []).map(stat => [stat.id])), ...COLONY_WARD_POOL.map(row => [row.id, row.name]),
        ...TALISMAN_STAT_POOL.map(row => [row.id])];
    const table = new Map();
    for (const [id, name] of rows) if (typeof id === 'string' && id && !table.get(id)) table.set(id, name || '');
    env.searchStats = table;
    return table;
}

/** The stats a query's option rows may name: [{ id, name }] (name: the Korean line name, '' when the stat names give it). */
export function auctionSearchStats(env) {
    return [...statTable(env)].map(([id, name]) => ({ id, name }));
}

/** The names a lot can carry for the name box's suggestions (Korean source names): every base name, then every unique name, once each. */
export function auctionSearchNames(env) {
    if (!env.searchNames) {
        env.searchNames = Object.freeze([...new Set([...env.deps.BASE_ITEM_DB.map(base => base.name), ...env.deps.UNIQUE_DB.map(unique => unique.name)]
            .filter(name => typeof name === 'string' && name))]);
    }
    return env.searchNames;
}

/** A level bound: an integer 1..999, else null. */
function levelBound(value) {
    const level = Math.floor(Number(value));
    return value !== null && value !== '' && Number.isFinite(level) && level >= 1 ? Math.min(LEVEL_MAX, level) : null;
}

/** A price limit: a positive integer up to PRICE_MAX, else null. */
function priceBound(value) {
    const price = Math.floor(Number(value));
    return value !== null && value !== '' && Number.isFinite(price) && price >= 1 ? Math.min(PRICE_MAX, price) : null;
}

/** The option rows a query keeps: known stats only, a finite minimum or null, at most AUCTION_QUERY_OPTIONS. */
function optionRows(env, rows) {
    const known = statTable(env);
    return (Array.isArray(rows) ? rows : []).filter(row => isObject(row) && known.has(row.stat)).slice(0, AUCTION_QUERY_OPTIONS).map(row => {
        const min = row.min === null || row.min === '' || row.min === undefined ? NaN : Number(row.min);
        return { stat: row.stat, min: Number.isFinite(min) ? min : null };
    });
}

/** A merchant seller: a [prefix index, suffix index] pair inside gear.sellers, else null. */
function sellerPair(seller) {
    const { prefixes, suffixes } = AUCTION_HOUSE.gear.sellers, index = (value, list) => Number.isSafeInteger(value) && value >= 0 && value < list.length;
    return Array.isArray(seller) && seller.length === 2 && index(seller[0], prefixes) && index(seller[1], suffixes) ? [seller[0], seller[1]] : null;
}

/** Whether slot is one a merchant lot can have (the drop slots and the uniques' own slots). */
function knownSlot(env, slot) {
    return typeof slot === 'string' && (env.deps.EQUIPMENT_DROP_SLOTS.includes(slot) || env.deps.UNIQUE_DB.some(unique => (unique.slots || []).includes(slot)));
}

/** The level bounds of a query, the lower first. */
function levelRange(source) {
    const low = levelBound(source.levelMin), high = levelBound(source.levelMax);
    return low !== null && high !== null && low > high ? { levelMin: high, levelMax: low } : { levelMin: low, levelMax: high };
}

/** raw (the screen's conditions, a saved search, anything) as a sound query (see the file head). */
export function auctionNormalizeQuery(env, raw) {
    const source = isObject(raw) ? raw : {}, variants = isObject(source.variants) ? source.variants : {};
    return {
        name: typeof source.name === 'string' ? source.name.trim().slice(0, NAME_MAX) : '',
        kind: pick(KINDS, source.kind), slot: knownSlot(env, source.slot) ? source.slot : 'all',
        rarity: pick(RARITIES, source.rarity), source: pick(SOURCES, source.source),
        family: AUCTION_HOUSE.families.includes(source.family) ? source.family : '',
        ...levelRange(source), priceMax: priceBound(source.priceMax), currency: pick(AUCTION_QUERY_CURRENCIES, source.currency),
        options: optionRows(env, source.options),
        variants: Object.fromEntries(AUCTION_VARIANT_KEYS.map(key => [key, pick(VARIANT_STATES, variants[key])])),
        seller: sellerPair(source.seller)
    };
}

/** The saved searches of a save: each object entry normalized (other entries dropped), repeats dropped, at most AUCTION_SAVED_SEARCHES; [] for
 * anything but a list. */
export function auctionRestoreSearches(env, source) {
    const seen = new Set();
    return (Array.isArray(source) ? source : []).filter(isObject).map(row => auctionNormalizeQuery(env, row)).filter(query => {
        const key = JSON.stringify(query);
        return !seen.has(key) && seen.add(key);
    }).slice(0, AUCTION_SAVED_SEARCHES);
}

/** Keeps raw (normalized) in owner's saved searches: refused when the same search is kept or AUCTION_SAVED_SEARCHES are. */
export function auctionSaveSearch(env, owner, raw) {
    const list = owner.auction.searches, query = auctionNormalizeQuery(env, raw), key = JSON.stringify(query);
    if (list.some(row => JSON.stringify(row) === key)) return { ok: false, reason: env.deps._t('이미 저장한 검색입니다.') };
    if (list.length >= AUCTION_SAVED_SEARCHES) return { ok: false, reason: env.deps._t('검색은 {count}개까지 저장할 수 있습니다.', { count: AUCTION_SAVED_SEARCHES }) };
    list.push(query);
    return { ok: true, query };
}

/** Removes saved search index from owner (an index outside the list changes nothing). Returns whether it removed one. */
export function auctionDeleteSearch(owner, index) {
    const list = owner.auction.searches;
    if (!Number.isSafeInteger(index) || index < 0 || index >= list.length) return false;
    list.splice(index, 1);
    return true;
}

/**
 * The facade's search calls (modules/domain/auction-house.mjs): searchRules (the option rows a query holds, the searches a save keeps, the
 * currencies of a price limit), normalizeQuery(raw), searchStats() ([{ id, name }]), searchNames() (base and unique names), saveSearch(owner, raw)
 * ({ ok, reason? }) and deleteSearch(owner, index).
 */
export function auctionSearchApi(env) {
    return {
        searchRules: Object.freeze({ options: AUCTION_QUERY_OPTIONS, saved: AUCTION_SAVED_SEARCHES, currencies: AUCTION_QUERY_CURRENCIES }),
        normalizeQuery: raw => auctionNormalizeQuery(env, raw), searchStats: () => auctionSearchStats(env), searchNames: () => auctionSearchNames(env),
        saveSearch: (owner, raw) => auctionSaveSearch(env, owner, raw), deleteSearch: (owner, index) => auctionDeleteSearch(owner, index)
    };
}
