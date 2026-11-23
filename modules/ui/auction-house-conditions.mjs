/**
 * 경매장 아이템 칸의 검색 조건을 화면이 다루는 일: 지금 고른 조건(state.gear.query, 규칙의 query 모양)의 칩 글(조건마다 하나, 저장한 검색의
 * 이름도 같은 글로 짓는다), 칩의 ✕로 조건 하나 지우기, 조건 단추의 수, 분류 줄(전체, 부위, 장비 아닌 종류)과 무기 대분류 고르기, 옵션 조건
 * 더하기와 변형 고치기. 여기서는 조건만 고친다: 검색은 부르는 쪽(modules/ui/auction-house-actions.mjs)이 한다.
 */
import { tr, num, familyLabel, sellerName } from './auction-house-format.mjs';

// 변형 이름: 게임이 이미 쓰는 이름(전리품 고르기 칩, modules/ui/equipment-loot-view.mjs).
export const VARIANT_LABELS = Object.freeze({ exceptional: '특출난 베이스', socket: '소켓', corrupted: '타락', quality: '퀄리티' });
const VARIANT_CYCLE = Object.freeze({ any: 'yes', yes: 'no', no: 'any' });
const SOURCE_LABELS = Object.freeze({ merchant: '상인', user: '다른 플레이어' });
const KIND_LABELS = Object.freeze({ gear: '장비' });
// The conditions the 조건 panel holds (the others have their own controls: the search box, the category strip, the rarity select, the option
// chips).
const PANEL_KEYS = new Set(['source', 'level', 'price', 'variant']);

/** The conditions being chosen (made once from the rules' empty query). */
export function liveQuery(runtime) {
    const view = runtime.state.gear;
    if (!view.query) view.query = runtime.deps.auctionHouse.normalizeQuery({});
    return view.query;
}

/** A stat's shown name: its line name from the rules' table, else the game's stat name. */
export function statName(runtime, id) {
    const row = statRows(runtime).byId.get(id);
    return row ? row.label : runtime.deps.getStatName(id);
}

/** The stats option conditions may name with their shown names in the player's language, made once per language: { list: [{ id, label, low }],
 * byId }. */
export function statRows(runtime) {
    const locale = runtime.deps.i18n.locale, kept = runtime.statRows;
    if (kept && kept.locale === locale) return kept;
    const list = runtime.deps.auctionHouse.searchStats().map(({ id, name }) => {
        const label = name ? tr(runtime, name) : runtime.deps.getStatName(id);
        return { id, label, low: label.toLocaleLowerCase(locale) };
    });
    runtime.statRows = { locale, list, byId: new Map(list.map(row => [row.id, row])) };
    return runtime.statRows;
}

export function kindLabel(runtime, kind) {
    const row = runtime.deps.auctionHouse.rules.kinds.lots.find(entry => entry.kind === kind);
    return tr(runtime, KIND_LABELS[kind] || (row ? row.label : kind));
}

/** A slot's shown name (the game's own label: the shield slot reads 완갑). */
export function slotName(runtime, slot) { return runtime.deps.getItemSlotDisplayLabel({ slot }, tr(runtime, slot)); }

/** A weapon category's shown name ('' for an unknown one). */
export function weaponName(runtime, id) {
    const row = runtime.deps.auctionHouse.searchRules.weapons.find(entry => entry.id === id);
    return row ? tr(runtime, row.name) : '';
}

function levelText(runtime, query) {
    const { levelMin: low, levelMax: high } = query, _t = runtime.deps._t;
    if (low !== null && high !== null) return _t('Lv. {min}부터 {max}까지', { min: num(runtime, low), max: num(runtime, high) });
    return low !== null ? _t('Lv. {level} 이상', { level: num(runtime, low) }) : _t('Lv. {level} 이하', { level: num(runtime, high) });
}

function optionText(runtime, row) {
    const name = statName(runtime, row.stat);
    return row.min === null ? name : runtime.deps._t('{name} {min} 이상', { name, min: num(runtime, row.min) });
}

/** The head chips of a query: name, kind, slot, weapon category, rarity, source, family. */
function headChips(runtime, query) {
    const chips = [];
    if (query.name) chips.push(['name', runtime.deps._t('이름 {name}', { name: query.name })]);
    if (query.kind !== 'all' && query.slot === 'all') chips.push(['kind', kindLabel(runtime, query.kind)]);
    if (query.slot !== 'all' && query.weapon === 'all') chips.push(['slot', slotName(runtime, query.slot)]);
    if (query.weapon !== 'all') chips.push(['weapon', weaponName(runtime, query.weapon)]);
    if (query.rarity !== 'all') chips.push(['rarity', tr(runtime, runtime.deps.ITEM_RARITY_LABELS[query.rarity])]);
    if (query.source !== 'all') chips.push(['source', tr(runtime, SOURCE_LABELS[query.source])]);
    if (query.family) chips.push(['family', familyLabel(runtime, query.family)]);
    return chips;
}

/** The body chips of a query: level, price, each option condition, each variant asked for or against, the seller. */
function bodyChips(runtime, query) {
    const chips = [], _t = runtime.deps._t;
    if (query.levelMin !== null || query.levelMax !== null) chips.push(['level', levelText(runtime, query)]);
    if (query.priceMax !== null) chips.push(['price', _t('{currency} {price} 이하', { currency: runtime.deps.shopView.currencyName(query.currency), price: num(runtime, query.priceMax) })]);
    query.options.forEach((row, index) => { if (row.stat) chips.push([`option:${index}`, optionText(runtime, row)]); });
    for (const [key, want] of Object.entries(query.variants)) {
        const label = tr(runtime, VARIANT_LABELS[key]);
        if (want !== 'any') chips.push([`variant:${key}`, want === 'yes' ? label : _t('{name} 없음', { name: label })]);
    }
    if (query.seller) chips.push(['seller', _t('{name}의 매물', { name: sellerName(runtime, query.seller) })]);
    return chips;
}

/** One chip per condition of query: [[key, text]] in a fixed order. */
export function conditionChips(runtime, query) {
    return [...headChips(runtime, query), ...bodyChips(runtime, query)];
}

const chipPart = key => String(key).split(':')[0];

/** The chips the line under the search bar shows: the conditions without a control of their own on screen (source, family, level, price,
 * variants, seller). The option conditions stand in the same line as chips with a minimum box (modules/ui/auction-house-panel.mjs). */
export function lineChips(runtime, query) {
    const shown = new Set(['source', 'family', 'level', 'price', 'variant', 'seller']);
    return conditionChips(runtime, query).filter(([key]) => shown.has(chipPart(key)));
}

/** The chip of the 살 수 있는 매물만 switch (a condition of this screen, not of the query: a saved search does not keep it). */
export const AFFORD_CHIP = Object.freeze(['afford', '살 수 있는 매물만']);

/** How many conditions the 조건 panel holds now. */
export function panelCount(runtime, query) {
    return conditionChips(runtime, query).filter(([key]) => PANEL_KEYS.has(chipPart(key))).length + (runtime.state.gear.afford ? 1 : 0);
}

/** Whether a condition is chosen at all (the query's, or the payable switch). */
export function hasConditions(runtime, query) { return runtime.state.gear.afford || conditionChips(runtime, query).length > 0; }

/** A saved search's label: its chips' text, or 전체 for a search without conditions. */
export function querySummary(runtime, query) {
    const chips = conditionChips(runtime, query);
    return chips.length ? chips.map(([, text]) => text).join(', ') : tr(runtime, '전체');
}

/** Clears the condition of chip key from the live query. */
export function clearCondition(runtime, key) {
    const query = liveQuery(runtime), [part, sub] = String(key).split(':');
    const reset = { name: '', kind: 'all', slot: 'all', weapon: 'all', rarity: 'all', source: 'all', family: '', seller: null };
    if (part === 'level') Object.assign(query, { levelMin: null, levelMax: null });
    else if (part === 'price') query.priceMax = null;
    else if (part === 'option') query.options.splice(Number(sub), 1);
    else if (part === 'variant' && sub in query.variants) query.variants[sub] = 'any';
    else if (Object.prototype.hasOwnProperty.call(reset, part)) query[part] = reset[part];
    if (query.slot === 'all') query.weapon = 'all';
}

/** The category strip's value of a query: 'all', 'slot:{slot}', 'kind:{kind}'. */
export function categoryOf(query) {
    if (query.slot !== 'all') return `slot:${query.slot}`;
    return query.kind === 'all' ? 'all' : `kind:${query.kind}`;
}

/** Puts a category strip value in the live query (a slot is a piece of gear; another category drops the weapon category). */
export function setCategory(runtime, value) {
    const query = liveQuery(runtime), [part, key] = String(value).split(':');
    if (part === 'slot') Object.assign(query, { kind: 'gear', slot: key, weapon: 'all' });
    else Object.assign(query, { kind: part === 'kind' ? key : 'all', slot: 'all', weapon: 'all' });
}

/** A variant chip of the panel: 상관없음, 있음, 없음 in turn. */
export function cycleVariant(runtime, key) {
    const variants = liveQuery(runtime).variants;
    if (key in variants) variants[key] = VARIANT_CYCLE[variants[key]] || 'any';
}

/** Whether another option condition fits (the rules keep four). */
export function optionRoom(runtime) { return liveQuery(runtime).options.length < runtime.deps.auctionHouse.searchRules.options; }

/** Adds stat as an option condition (once, while there is room). Returns whether it was added. */
export function addOption(runtime, stat) {
    const options = liveQuery(runtime).options;
    if (!optionRoom(runtime) || !statRows(runtime).byId.has(stat) || options.some(row => row.stat === stat)) return false;
    options.push({ stat, min: null });
    return true;
}
