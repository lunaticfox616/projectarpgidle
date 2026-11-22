/**
 * 경매장 아이템 칸의 저장한 검색: 검색 전의 첫 화면에서 방금 올라온 매물 위에 단추로 선다(조건 칩과 같은 글로 지은 이름, ✕ 지우기, 몸이 다
 * 굴러가고 검색 값이 다 만들어진 뒤에는 맞는 매물 수). 누르면 그 조건을 불러와 검색한다. 수는 그림 틀의 예산 안에서 검색 하나씩 세고
 * (savedCountStep), 저장한 검색이나 1분이 바뀌면 다시 센다. 저장과 지우기는 규칙(auctionHouse.saveSearch, deleteSearch)이 owner.auction에 한다.
 */
import { esc, num, paint } from './auction-house-format.mjs';
import { querySummary } from './auction-house-conditions.mjs';
import { searchViewOf, countMatches } from './auction-house-search.mjs';
import { indexReady } from './auction-house-index.mjs';

const RECOUNT_MS = 60000;

/** What the counts are made for: the saved list and the minute (lots come and go). */
function countsKey(runtime) {
    const clock = Math.max(runtime.deps.now(), runtime.deps.game.auction.lastAt);
    return `${JSON.stringify(runtime.deps.game.auction.searches)}|${Math.floor(clock / RECOUNT_MS)}`;
}

/** Whether the first view is shown (판매 중 with no search yet). */
function landingShown(runtime) { return runtime.state.tab === 'gear' && runtime.state.gear.mode === 'open' && !runtime.search; }

/** Whether saved searches wait to be counted (the first view is shown and every listed lot's search fields are made). */
export function savedCountsPending(runtime) {
    if (!landingShown(runtime) || !runtime.deps.game.auction.searches.length || !indexReady(runtime)) return false;
    const saved = runtime.saved;
    return !saved || saved.key !== countsKey(runtime) || saved.counts.length < runtime.deps.game.auction.searches.length;
}

/** Counts the saved searches one by one until stop() says stop (checked after each). Returns whether a count was added. */
export function savedCountStep(runtime, stop) {
    if (!savedCountsPending(runtime)) return false;
    const key = countsKey(runtime), list = runtime.deps.game.auction.searches;
    if (!runtime.saved || runtime.saved.key !== key) runtime.saved = { key, counts: [], heads: runtime.deps.auctionHouse.lotHeads(runtime.deps.game, runtime.deps.now()) };
    const saved = runtime.saved;
    while (saved.counts.length < list.length) {
        saved.counts.push(countMatches(runtime, searchViewOf(runtime, list[saved.counts.length]), saved.heads));
        if (stop()) break;
    }
    if (saved.counts.length >= list.length) saved.heads = null;
    return true;
}

/** The saved searches as buttons (each with its delete button and, once counted, its count); '' without any. */
function savedHtml(runtime) {
    const list = runtime.deps.game.auction.searches, saved = runtime.saved, fresh = saved && saved.key === countsKey(runtime) ? saved.counts : [];
    if (!list.length) return '';
    const rows = list.map((query, index) => {
        const label = querySummary(runtime, query), count = fresh[index];
        return `<li><button type="button" class="ah-saved-run" data-ah-saved="${index}"><span>${esc(runtime, label)}</span>${count === undefined ? '' : `<small>${runtime.deps._t('매물 {count}', { count: num(runtime, count) })}</small>`}</button>
            <button type="button" class="ah-saved-x" data-ah-unsave="${index}" aria-label="${esc(runtime, runtime.deps._t('{name} 지우기', { name: label }))}">✕</button></li>`;
    }).join('');
    return `<section class="ah-landing ah-saved"><h4>${runtime.deps._t('저장한 검색')}</h4><ul class="ah-saved-list">${rows}</ul></section>`;
}

/** Paints the saved searches into the first view's slot (when it is shown). */
export function paintSaved(runtime, root) {
    paint(root && root.querySelector('[data-ah-saved-box]'), landingShown(runtime) ? savedHtml(runtime) : '');
}
