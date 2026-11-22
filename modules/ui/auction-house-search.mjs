/**
 * 경매장 아이템 칸의 검색: 검색 단추(또는 찾기 칸의 Enter)를 누를 때만 그때의 고르기(종류 단추, 부위, 등급, 출처, 시세 띠의 계열, 찾는 말,
 * 고른 순서)로 지금 놓인 팔리지 않은 매물의 번호를 한 번 찍어 둔다(runtime.search). 머리만으로 고를 수 있는 검색(새것 순과 남은 시간 순)은
 * 바로 끝나고, 몸이 필요한 검색(찾는 말, 계열, 값과 레벨과 옵션과 이름 순, 장비 아닌 종류의 등급)은 후보의 몸이 다 굴러갈 때까지 기다린 뒤
 * (그동안 미리 굴리기가 후보부터 굴린다) 시간 예산 안에서 조금씩 걸러 늘어세운다. 다른 플레이어의 전시품(출처)은 끝에서 같이 거른다.
 * 찍어 둔 결과는 다시 검색할 때까지 그대로다: 그사이 새로 놓인 매물 가운데 검색에 맞는 수만 센다(countNewLots).
 */
import { tr } from './auction-house-format.mjs';
import { lotName, lotSlot, lotLevel, optionCount, lotLines } from './auction-house-kinds.mjs';
import { userLots } from './auction-house-hall.mjs';

/** Rows a result shows at first and adds per 더 보기. */
export const PAGE_ROWS = 50;
// Orders a head can give (arriveAt, expireAt): no body is needed for them.
const HEAD_SORTS = new Set(['newest', 'left']);
const MISS = Object.freeze({ ok: false, line: '' });

/** Whether the 부위 select applies: on 전체 and 장비 (the other kinds have no slot). */
export function slotApplies(view) { return view.kind === 'all' || view.kind === 'gear'; }

/** The search words of the box: its text split on whitespace, lower case in the player's language. */
function searchWords(runtime) {
    return String(runtime.state.gear.query || '').toLocaleLowerCase(runtime.deps.i18n.locale).split(/\s+/).filter(Boolean);
}

/** The filters a search takes from the toolbar now. */
function searchView(runtime) {
    const view = runtime.state.gear;
    return { kind: view.kind, slot: slotApplies(view) ? view.slot : 'all', rarity: view.rarity, source: view.source, family: view.family,
        sort: view.sort, dir: view.dir === 1 ? 1 : -1, words: searchWords(runtime) };
}

/** Whether a merchant head passes what a head can tell: the kind chip, the slot, a gear lot's rarity (the source 다른 플레이어 keeps none). */
export function headPasses(view, head) {
    if (view.source === 'user' || (view.kind !== 'all' && head.kind !== view.kind)) return false;
    if (view.slot !== 'all' && (head.kind !== 'gear' || head.slot !== view.slot)) return false;
    return view.rarity === 'all' || !head.rarity || head.rarity === view.rarity;
}

/** Whether the search needs bodies: words, a family, an order by a body value, or a rarity over kinds whose heads do not know it. */
export function needsBodies(view) {
    return view.words.length > 0 || !!view.family || !HEAD_SORTS.has(view.sort) || (view.rarity !== 'all' && view.kind !== 'gear');
}

/** What the search reads of a lot's item in the player's language, made once per item and language (kept by item): name (shown name, base
 * name and the 부위 cell, lower case) and lines ({ text, low } of every line its card shows). */
function searchText(runtime, lot) {
    const item = lot.item, locale = runtime.deps.i18n.locale, kept = runtime.state.search.get(item);
    if (kept && kept.locale === locale) return kept;
    const low = text => String(text).toLocaleLowerCase(locale);
    const made = { locale, name: low([lotName(runtime, lot), item.baseName ? tr(runtime, item.baseName) : '', lotSlot(runtime, lot)].join('\n')),
        lines: lotLines(runtime, lot).map(text => ({ text, low: low(text) })) };
    runtime.state.search.set(item, made);
    return made;
}

/** Whether lot's item has every word in its names or its lines: { ok, line } where line is the first line a word matched that the names did
 * not ('' when the names held every word). */
function searchMatch(runtime, words, lot) {
    if (!words.length) return { ok: true, line: '' };
    const text = searchText(runtime, lot);
    let line = '';
    for (const word of words) {
        if (text.name.includes(word)) continue;
        const hit = text.lines.find(row => row.low.includes(word));
        if (!hit) return MISS;
        line = line || hit.text;
    }
    return { ok: true, line };
}

/** Whether a priced lot passes the body filters (rarity, family, words): { ok, line }. */
export function bodyPasses(runtime, view, lot) {
    if ((view.rarity !== 'all' && lot.item.rarity !== view.rarity) || (view.family && lot.family !== view.family)) return MISS;
    return searchMatch(runtime, view.words, lot);
}

/** What a lot is worth in dew, to order lots priced in different currencies together. */
export function dewValue(runtime, lot) { return lot.price * runtime.deps.itemAppraisal.unitValue(lot.currency); }

/** Each order's key of a priced lot (a hall show has no times: it goes last on the time orders). */
const LOT_KEYS = Object.freeze({
    newest: (runtime, lot) => (Number.isFinite(lot.arriveAt) ? lot.arriveAt : -Infinity),
    left: (runtime, lot) => (Number.isFinite(lot.expireAt) ? lot.expireAt : Infinity),
    price: dewValue,
    level: (runtime, lot) => lotLevel(lot) || 0,
    options: (runtime, lot) => optionCount(lot),
    name: (runtime, lot) => lotName(runtime, lot)
});

/** The column ids a header click may order by. */
export const SORTABLE = Object.freeze(['name', 'level', 'options', 'left', 'price']);

/** Orders entries ({ id, key }) by the view's order in place (names by the player's language). */
function orderEntries(runtime, view, entries) {
    const dir = view.dir, collator = view.sort === 'name' ? new Intl.Collator(runtime.deps.i18n.locale) : null;
    const compare = collator ? (a, b) => collator.compare(a.key, b.key) : (a, b) => (a.key === b.key ? 0 : a.key < b.key ? -1 : 1);
    return entries.sort((a, b) => dir * compare(a, b));
}

/** The hall shows the search keeps (source, kind, slot, then the body filters), as entries with their order key. */
function userEntries(runtime, search) {
    const view = search.view;
    if (view.source === 'merchant' || (view.kind !== 'all' && view.kind !== 'gear')) return [];
    return userLots(runtime).filter(lot => view.slot === 'all' || lot.item.slot === view.slot).flatMap(lot => {
        const hit = bodyPasses(runtime, view, lot);
        if (!hit.ok) return [];
        search.users.set(lot.id, lot);
        search.lines.set(lot.id, hit.line);
        return [{ id: lot.id, key: LOT_KEYS[view.sort](runtime, lot) }];
    });
}

/** The auction clock now (max(now, lastAt)). */
function clockNow(runtime) { return Math.max(runtime.deps.now(), runtime.deps.game.auction.lastAt); }

/** Starts a search with the toolbar's filters: the snapshot is taken at once when the heads are ready (else once they are). */
export function startSearch(runtime) {
    runtime.search = { serial: (runtime.search ? runtime.search.serial : 0) + 1, view: searchView(runtime), clock: clockNow(runtime), phase: 'heads',
        candidates: [], prefer: null, cursor: 0, kept: [], ids: [], lines: new Map(), users: new Map(), limit: PAGE_ROWS,
        progress: { done: 0, total: 0 } };
    if (runtime.headsReady) takeCandidates(runtime, runtime.search);
}

/** The open merchant lots the head filters pass, taken from the heads now. A head-only search ends here, ordered by its head key. */
function takeCandidates(runtime, search) {
    const { auctionHouse, game } = runtime.deps, view = search.view;
    const heads = auctionHouse.lotHeads(game, runtime.deps.now()).filter(head => head.phase === 'open' && headPasses(view, head));
    search.clock = clockNow(runtime);
    search.candidates = heads.map(head => head.id);
    search.progress = { done: heads.filter(head => head.warm).length, total: heads.length };
    if (needsBodies(view)) {
        const wanted = new Set(search.candidates);
        // One function for the whole wait: warming keeps its plan while the filter is the same function.
        search.prefer = head => wanted.has(head.id);
        search.phase = search.progress.done === search.progress.total ? 'scan' : 'warm';
        return;
    }
    const key = view.sort === 'left' ? 'expireAt' : 'arriveAt';
    const entries = orderEntries(runtime, view, heads.map(head => ({ id: head.id, key: head[key] })));
    search.ids = [...entries, ...orderEntries(runtime, view, userEntries(runtime, search))].map(entry => entry.id);
    search.phase = 'done';
}

/** The head filter warming should take first: the waiting search's candidates, else none. */
export function searchPrefer(runtime) {
    const search = runtime.search;
    return search && search.phase === 'warm' ? search.prefer : null;
}

/** Filters and keys candidates from the cursor until stop() says stop (checked after each, so a frame scans at least one); at the end adds
 * the hall shows, orders everything and ends. */
function scanCandidates(runtime, search, stop) {
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now(), view = search.view;
    while (search.cursor < search.candidates.length) {
        const id = search.candidates[search.cursor++], lot = auctionHouse.lot(game, id, now);
        const hit = lot && lot.phase === 'open' ? bodyPasses(runtime, view, lot) : MISS;
        if (hit.ok) search.kept.push({ id, key: LOT_KEYS[view.sort](runtime, lot) });
        if (hit.line) search.lines.set(id, hit.line);
        if (stop()) return;
    }
    // Ordering takes a frame of its own when the scan used this one up.
    if (stop()) return;
    search.ids = orderEntries(runtime, view, [...search.kept, ...userEntries(runtime, search)]).map(entry => entry.id);
    search.kept = [];
    search.phase = 'done';
}

/** A waiting search takes its candidates' progress from a warming result made with its own filter; all warm, it scans. */
function followWarm(search, warm) {
    if (!warm || !warm.heads || warm.prefer !== search.prefer) return;
    search.progress = { done: warm.preferred.done, total: warm.preferred.total };
    if (warm.preferred.done >= warm.preferred.total) search.phase = 'scan';
}

/**
 * One frame of the search under stop(): takes the snapshot once the heads are ready, follows the candidates' warming (warm: the latest
 * warmLots result), then scans. Returns whether the search still has work.
 */
export function stepSearch(runtime, stop, warm) {
    const search = runtime.search;
    if (!search || search.phase === 'done') return false;
    if (search.phase === 'heads' && runtime.headsReady) takeCandidates(runtime, search);
    if (search.phase === 'warm') followWarm(search, warm);
    if (search.phase === 'scan') scanCandidates(runtime, search, stop);
    return search.phase !== 'done';
}

/** How many open lots arrived after the snapshot and match the search (a body search counts only lots whose bodies were rolled). */
export function countNewLots(runtime, heads) {
    const search = runtime.search;
    if (!search || search.phase !== 'done') return 0;
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now(), view = search.view, bodies = needsBodies(view);
    return heads.filter(head => head.phase === 'open' && head.arriveAt > search.clock && headPasses(view, head)
        && (!bodies || (head.warm && bodyPasses(runtime, view, auctionHouse.lot(game, head.id, now)).ok))).length;
}

/** The lot of a row id: a hall show of the result, or the merchant lot priced now (its body rolled when missing), with the option line the
 * search matched and, for a sold lot, agoMs. null when it is gone from the list's batches. */
export function rowLot(runtime, id) {
    const search = runtime.search, user = search && search.users.get(id);
    if (user) return user;
    const lot = runtime.deps.auctionHouse.lot(runtime.deps.game, id, runtime.deps.now());
    if (!lot) return null;
    lot.matchLine = (search && search.lines.get(id)) || '';
    if (lot.soldAt !== null) lot.agoMs = clockNow(runtime) - lot.soldAt;
    return lot;
}
