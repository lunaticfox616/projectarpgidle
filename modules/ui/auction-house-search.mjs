/**
 * 경매장 아이템 칸의 검색: 검색 단추(이름 칸의 Enter, 저장한 검색)를 누를 때만 그때의 조건(규칙이 고친 query 하나, 고른 순서)으로 지금 놓인
 * 팔리지 않은 매물의 번호를 한 번 찍어 둔다(runtime.search). 머리만으로 고를 수 있는 검색(종류, 부위, 장비 등급, 판매자만 고르고 새것 순이나
 * 남은 시간 순)은 바로 끝난다. 몸이 필요한 검색(이름, 계열, 아이템 Lv., 가격, 옵션 조건, 변형, 장비 아닌 종류의 등급, 몸의 값으로 늘어세우기)은
 * 후보의 몸이 다 굴러갈 때까지 기다린 뒤(그동안 미리 굴리기가 후보부터 굴린다) 매물의 검색 값(modules/ui/auction-house-index.mjs)으로 거른다.
 * 값이 다 있으면 거르기와 늘어세우기는 누른 그 자리에서 끝난다. 다른 플레이어의 전시품(출처)은 끝에서 같이 거른다.
 * 찍어 둔 결과는 다시 검색할 때까지 그대로다: 그사이 새로 놓인 매물 가운데 검색에 맞는 수만 센다(countNewLots).
 */
import { userLots } from './auction-house-hall.mjs';
import { statLineText } from './auction-house-kinds.mjs';
import { lotFields, fieldsOf, fieldsPass, queryWords } from './auction-house-index.mjs';

/** Rows a result shows at first and adds per 더 보기. */
export const PAGE_ROWS = 50;
// Orders a head can give (arriveAt, expireAt): no body is needed for them.
const HEAD_SORTS = new Set(['newest', 'left']);
const NEVER = () => false;

/** Whether the 부위 condition applies: on 전체 and 장비 (the other kinds have no slot). */
export function slotApplies(query) { return query.kind === 'all' || query.kind === 'gear'; }

/**
 * A search view of query (any shape: the rules normalize it) in an order: { query, sort, dir, words, unit } (unit: the dew value of one unit of
 * the price limit's currency). The saved searches are counted with the same view.
 */
export function searchViewOf(runtime, raw, sort = 'newest', dir = -1) {
    const query = runtime.deps.auctionHouse.normalizeQuery(raw);
    if (!slotApplies(query)) query.slot = 'all';
    return { query, sort, dir: dir === 1 ? 1 : -1, words: queryWords(runtime, query.name), unit: runtime.deps.itemAppraisal.unitValue(query.currency) };
}

/** Whether a merchant head passes what a head can tell: source, kind, slot, seller, a gear lot's rarity. */
export function headPasses(view, head) {
    const query = view.query;
    if (query.source === 'user' || (query.kind !== 'all' && head.kind !== query.kind)) return false;
    if (query.slot !== 'all' && (head.kind !== 'gear' || head.slot !== query.slot)) return false;
    return sellerPasses(query.seller, head.seller) && (query.rarity === 'all' || !head.rarity || head.rarity === query.rarity);
}

const sellerPasses = (want, seller) => !want || (seller[0] === want[0] && seller[1] === want[1]);

/** Whether the search needs bodies: a body condition, an order by a body value, or a rarity over kinds whose heads do not know it. */
export function needsBodies(view) {
    const query = view.query;
    return view.words.length > 0 || !!query.family || !HEAD_SORTS.has(view.sort) || (query.rarity !== 'all' && query.kind !== 'gear')
        || query.levelMin !== null || query.levelMax !== null || query.priceMax !== null || query.options.length > 0
        || Object.values(query.variants).some(want => want !== 'any');
}

/** Each order's key of a lot's fields and head (a hall show has no times: it goes last on the time orders). */
const ORDER_KEYS = Object.freeze({
    newest: (fields, lot) => (Number.isFinite(lot.arriveAt) ? lot.arriveAt : -Infinity),
    left: (fields, lot) => (Number.isFinite(lot.expireAt) ? lot.expireAt : Infinity),
    price: fields => fields.dew,
    level: fields => fields.level || 0,
    options: fields => fields.options,
    name: fields => fields.sortName
});

/** The column ids a header click may order by. */
export const SORTABLE = Object.freeze(['name', 'level', 'options', 'left', 'price']);

/** Orders entries ({ id, key }) by the view's order in place (names by the player's language, one collator per language). */
function orderEntries(runtime, view, entries) {
    const dir = view.dir;
    if (view.sort === 'name') {
        const locale = runtime.deps.i18n.locale;
        if (!runtime.collator || runtime.collator.locale !== locale) runtime.collator = { locale, compare: new Intl.Collator(locale).compare };
        return entries.sort((a, b) => dir * runtime.collator.compare(a.key, b.key));
    }
    return entries.sort((a, b) => dir * (a.key === b.key ? 0 : a.key < b.key ? -1 : 1));
}

/** The hall shows the search keeps (source, kind, slot, seller, then the body conditions), as entries with their order key. */
function userEntries(runtime, search) {
    const view = search.view, query = view.query;
    if (query.source === 'merchant' || query.seller || (query.kind !== 'all' && query.kind !== 'gear')) return [];
    return userLots(runtime).filter(lot => query.slot === 'all' || lot.item.slot === query.slot).flatMap(lot => {
        const fields = lotFields(runtime, lot);
        if (!fieldsPass(view, fields)) return [];
        search.users.set(lot.id, lot);
        return [{ id: lot.id, key: ORDER_KEYS[view.sort](fields, lot) }];
    });
}

/** The auction clock now (max(now, lastAt)). */
function clockNow(runtime) { return Math.max(runtime.deps.now(), runtime.deps.game.auction.lastAt); }

/** Starts a search with the panel's conditions: the snapshot is taken at once when the heads are ready (else once they are). When every
 * candidate is warm and indexed the result is made here, under stop (default: no limit). */
export function startSearch(runtime, stop = NEVER) {
    const view = runtime.state.gear;
    runtime.search = { serial: (runtime.search ? runtime.search.serial : 0) + 1, view: searchViewOf(runtime, view.query, view.sort, view.dir), clock: clockNow(runtime),
        phase: 'heads', candidates: [], prefer: null, cursor: 0, kept: [], ids: [], users: new Map(), limit: PAGE_ROWS, progress: { done: 0, total: 0 } };
    if (runtime.headsReady) takeCandidates(runtime, runtime.search);
    if (runtime.search.phase === 'scan') scanCandidates(runtime, runtime.search, stop);
}

/** The open merchant lots the head conditions pass, taken from the heads now. A head-only search ends here, ordered by its head key. */
function takeCandidates(runtime, search) {
    const { auctionHouse, game } = runtime.deps, view = search.view;
    const heads = auctionHouse.lotHeads(game, runtime.deps.now()).filter(head => head.phase === 'open' && headPasses(view, head));
    search.clock = clockNow(runtime);
    search.candidates = heads.map(head => head.id);
    search.heads = new Map(heads.map(head => [head.id, head]));
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

/** Filters and keys candidates from the cursor until stop() says stop (checked after each, so a call scans at least one); at the end adds
 * the hall shows, orders everything and ends. A lot whose fields are kept costs a few comparisons; a missing one is made here. */
function scanCandidates(runtime, search, stop) {
    const view = search.view, keyOf = ORDER_KEYS[view.sort];
    while (search.cursor < search.candidates.length) {
        const id = search.candidates[search.cursor++], fields = fieldsOf(runtime, id);
        if (fields && fieldsPass(view, fields)) search.kept.push({ id, key: keyOf(fields, search.heads.get(id)) });
        if (stop()) return;
    }
    search.ids = orderEntries(runtime, view, [...search.kept, ...userEntries(runtime, search)]).map(entry => entry.id);
    search.kept = [];
    search.heads = null;
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

/** How many open merchant lots of heads pass view (a body search counts only lots whose bodies were rolled; their fields are made when
 * missing). */
export function countMatches(runtime, view, heads) {
    const bodies = needsBodies(view);
    return heads.filter(head => head.phase === 'open' && headPasses(view, head) && (!bodies || (head.warm && passesById(runtime, view, head.id)))).length;
}

function passesById(runtime, view, id) {
    const fields = fieldsOf(runtime, id);
    return !!fields && fieldsPass(view, fields);
}

/** How many open lots arrived after the snapshot and match the search. */
export function countNewLots(runtime, heads) {
    const search = runtime.search;
    if (!search || search.phase !== 'done') return 0;
    return countMatches(runtime, search.view, heads.filter(head => head.arriveAt > search.clock));
}

/** The lot of a row id: a hall show of the result, or the merchant lot priced now (its body rolled when missing), with the line of the
 * search's first option row and, for a sold lot or one I bought this session, agoMs. null when it is gone from the list's batches. */
export function rowLot(runtime, id) {
    const search = runtime.search, user = search && search.users.get(id);
    if (user) return user;
    const lot = runtime.deps.auctionHouse.lot(runtime.deps.game, id, runtime.deps.now());
    if (!lot) return null;
    const first = search && search.view.query.options[0];
    lot.matchLine = first ? statLineText(runtime, lot, first.stat) : '';
    const mine = runtime.myBuys.get(id);
    if (mine) lot.agoMs = clockNow(runtime) - mine.at;
    else if (lot.soldAt !== null) lot.agoMs = clockNow(runtime) - lot.soldAt;
    return lot;
}
