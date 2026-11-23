/**
 * 경매장 아이템 칸의 목록 상자(data-ah-board). 상자는 위의 붙박이 줄(새 매물 줄, 머리줄)과 그 아래에서 혼자 미는 칸(data-ah-scroll) 둘이다:
 * 창은 밀리지 않고 이 칸만 민다(좁은 화면에서는 이 칸이 밀지 않고 화면이 민다). 상자가 보이는 것은 넷 가운데 하나다: 검색 전의 첫 화면
 * (저장한 검색, 방금 올라온 매물 8개와 최근 거래 10개, 최근 거래는 이 세션에 내가 산 매물이 위에),
 * 기다리는 검색(머리줄과 빈 목록, 진행은 매물 수 자리에), 끝난 검색(새 매물 줄, 머리줄, 50개씩), 최근 거래 30개. 무엇을 보이는지가
 * 바뀔 때만 상자를 새로 짓고, 행은 한 번에 그리지 않고 시간 예산 안에서 몇 개씩 붙인다(appendRows, 화면의 그림 틀이 부른다).
 * 결과의 다음 50개는 목록 끝이 가까워지면 저절로 붙는다(더 보기 자리의 눈을 IntersectionObserver가 본다; 더 보기 단추도 같은 일을 한다).
 * 1초 확인은 목록을 다시 짓지 않는다: 그려진 행 가운데 방금 팔렸거나 산 매물만 고치고(patchRows), 남은 시간 글을 고치고, 새 매물 줄을 센다.
 * 내려간 행은 다음 검색까지 남고 구매는 규칙의 말로 거절된다.
 */
import { esc, num, tr } from './auction-house-format.mjs';
import { lotRowHtml, headHtml, badgeHtml, minutesText, leftMinutes } from './auction-house-rows.mjs';
import { PAGE_ROWS, rowLot, countNewLots } from './auction-house-search.mjs';
import { liveQuery } from './auction-house-conditions.mjs';
import { hidePeek } from './auction-house-peek.mjs';
import { canPay } from './auction-house-format.mjs';

// The first view: how many newest lots and latest trades it shows.
const LANDING = Object.freeze({ newest: 8, trades: 10 });

/** What the board shows now: one key per structure (a change rebuilds the board). */
function boardKey(runtime) {
    const view = runtime.state.gear, search = runtime.search, ready = runtime.headsReady ? 1 : 0;
    if (view.mode === 'recent') return `recent|${liveQuery(runtime).kind}|${liveQuery(runtime).slot}|${ready}|${runtime.myBuys.size}`;
    if (!search) return `landing|${ready}|${runtime.myBuys.size}`;
    return `search|${search.serial}|${search.phase === 'done' ? 'done' : 'wait'}`;
}

/** Queues ids to be drawn into list (tail: 'open' rows with time left and price, 'recent' rows with price and how long ago). */
function queueRows(runtime, list, ids, tail) {
    if (list && ids.length) runtime.jobs.push({ list, ids, at: 0, tail });
}

function listHtml(name) { return `<ul class="ah-lots" role="list" data-ah-rows="${name}"></ul>`; }

/** The board's two parts: the fixed lines on top and the one box that scrolls. */
function frameHtml(top, body) { return `<div class="ah-board-top">${top}</div><div class="ah-scroll" data-ah-scroll>${body}</div>`; }

/** The latest trades of a category ({ kind, slot }, 'all' for every one) as ids: my purchases of this session first (newest first), then the
 * trades with others. */
function tradeIds(runtime, { kind, slot }, limit = Infinity) {
    const fits = row => (kind === 'all' || row.kind === kind) && (slot === 'all' || row.slot === slot);
    const mine = [...runtime.myBuys].filter(([, row]) => fits(row)).sort((a, b) => b[1].at - a[1].at).map(([id]) => id);
    const others = runtime.deps.auctionHouse.recentHeads(runtime.deps.game, runtime.deps.now()).filter(fits).slice(0, limit);
    return [...mine, ...others.map(head => head.id)];
}

/** The first view: the saved searches' slot (modules/ui/auction-house-saved.mjs), the newest open lots and the latest trades. */
function landingBoard(runtime, board) {
    const slot = '<div class="ah-saved-slot" data-ah-saved-box></div>';
    if (!runtime.headsReady) { board.innerHTML = frameHtml('', slot); return; }
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now();
    const newest = auctionHouse.lotHeads(game, now).filter(head => head.phase === 'open').sort((a, b) => b.arriveAt - a.arriveAt).slice(0, LANDING.newest);
    const trades = tradeIds(runtime, { kind: 'all', slot: 'all' }, LANDING.trades);
    if (!newest.length && !trades.length) { board.innerHTML = frameHtml('', `${slot}<p class="ah-empty">${runtime.deps._t('아직 매물이 없습니다.')}</p>`); return; }
    board.innerHTML = frameHtml(headHtml(runtime, 'open'), `${slot}<section class="ah-landing"><h4>${runtime.deps._t('방금 올라온 매물')}</h4>${listHtml('newest')}</section>
        <details class="ah-landing is-recent"><summary>${esc(runtime, tr(runtime, '최근 거래'))}</summary>${listHtml('trades')}</details>`);
    queueRows(runtime, board.querySelector('[data-ah-rows="newest"]'), newest.map(head => head.id), 'open');
    queueRows(runtime, board.querySelector('[data-ah-rows="trades"]'), trades, 'recent');
}

/** The 최근 거래 list: the latest trades of the chosen category (my purchases of this session on top). */
function recentBoard(runtime, board) {
    if (!runtime.headsReady) return;
    const trades = tradeIds(runtime, liveQuery(runtime));
    board.innerHTML = trades.length ? frameHtml(headHtml(runtime, 'recent'), listHtml('recent')) : `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`;
    queueRows(runtime, board.querySelector('[data-ah-rows]'), trades, 'recent');
}

/** The more button of a result with the eye the observer watches ('' when every row is queued). */
function moreHtml(runtime) {
    const search = runtime.search;
    return search && search.limit < search.ids.length ? `<i class="ah-more-eye" data-ah-more-eye aria-hidden="true"></i><button type="button" class="ah-more" data-ah-more>${runtime.deps._t('더 보기')}</button>` : '';
}

/** Watches the eye of the more slot under root: when it comes near the visible end of the list and no rows wait to be drawn, the next page
 * is asked for (runtime.moreStep, made once with the view). Called again after each page so a list still at its end keeps loading. */
function watchMore(runtime, root) {
    const Observer = runtime.deps.window.IntersectionObserver, eye = root && root.querySelector('[data-ah-more-eye]');
    if (runtime.moreObserver) runtime.moreObserver.disconnect();
    runtime.moreObserver = null;
    if (!Observer || !eye) return;
    runtime.moreObserver = new Observer(entries => { if (!runtime.jobs.length && entries.some(entry => entry.isIntersecting)) runtime.moreStep(); });
    runtime.moreObserver.observe(eye);
}

/** A search: the header and an empty list while it waits; the result's first page once it is done. */
function searchBoard(runtime, board) {
    const search = runtime.search, done = search.phase === 'done';
    if (done && !search.ids.length) { board.innerHTML = `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`; return; }
    board.innerHTML = frameHtml(`<div class="ah-new-slot" data-ah-new></div>${headHtml(runtime, 'open')}`, `${listHtml('result')}<div class="ah-more-slot" data-ah-more-slot>${done ? moreHtml(runtime) : ''}</div>`);
    if (done) queueRows(runtime, board.querySelector('[data-ah-rows]'), search.ids.slice(0, search.limit), 'open');
}

/** Rebuilds the board when what it shows changed (force: the board element is new). */
export function paintBoard(runtime, root, force) {
    const board = root.querySelector('[data-ah-board]'), key = boardKey(runtime);
    if (!board || (!force && board.ahKey === key)) return;
    board.ahKey = key;
    hidePeek(runtime);
    board.innerHTML = '';
    board.classList.toggle('is-recent', runtime.state.gear.mode === 'recent');
    if (runtime.state.gear.mode === 'recent') recentBoard(runtime, board);
    else if (runtime.search) searchBoard(runtime, board);
    else landingBoard(runtime, board);
    watchMore(runtime, board);
}

/** 더 보기 (the button, or the list's end came near): the next page of the result is queued under the rows already drawn. */
export function showMore(runtime, root) {
    const search = runtime.search, list = root && root.querySelector('[data-ah-board] [data-ah-rows="result"]');
    if (!search || search.phase !== 'done' || !list) return;
    queueRows(runtime, list, search.ids.slice(search.limit, search.limit + PAGE_ROWS), 'open');
    search.limit += PAGE_ROWS;
    const slot = root.querySelector('[data-ah-more-slot]');
    if (slot) slot.innerHTML = moreHtml(runtime);
    if (runtime.moreObserver) runtime.moreObserver.disconnect();
    runtime.moreObserver = null;
}

/** Draws queued rows until stop() says stop (checked before each row; a row may roll its lot's body). Returns whether rows are left. When the
 * last queued row is drawn the more slot is watched again. */
export function appendRows(runtime, stop) {
    runtime.jobs = runtime.jobs.filter(job => job.list.isConnected && job.at < job.ids.length);
    const last = runtime.jobs.length ? runtime.jobs[runtime.jobs.length - 1].list : null;
    for (const job of runtime.jobs) {
        while (job.at < job.ids.length) {
            if (stop()) return true;
            const lot = rowLot(runtime, job.ids[job.at++]);
            if (lot) job.list.insertAdjacentHTML('beforeend', lotRowHtml(runtime, lot, job.tail));
        }
    }
    runtime.jobs = [];
    if (last) watchMore(runtime, last.closest('[data-ah-board]'));
    return false;
}

/** A drawn row whose lot was just sold or bought: dimmed, its price replaced by 팔림 or 구매함 (the 최근 거래 rows are drawn sold). */
function closeRow(runtime, row, head) {
    row.dataset.ahState = head.phase;
    if (head.phase !== 'sold' && head.phase !== 'bought') return;
    row.classList.add('is-closed');
    row.removeAttribute('data-ah-cost');
    const price = row.querySelector('.ah-cell-price'), left = row.querySelector('.ah-cell-left');
    if (price) price.classList.remove('is-short');
    if (price && !row.closest('.is-recent')) price.innerHTML = badgeHtml(runtime, { soldOut: head.phase === 'sold', boughtByMe: head.phase === 'bought' });
    if (left) left.textContent = '';
}

/** The open rows' prices marked or unmarked as more than the hero holds, only when the purse changed since the last look (board.ahPurse). */
function patchCosts(runtime, root, rows) {
    const board = root.querySelector('[data-ah-board]'), purse = runtime.deps.shopView.WALLET_ORDER.map(key => runtime.deps.shopView.held(key)).join(':');
    if (!board || board.ahPurse === purse) return;
    board.ahPurse = purse;
    for (const row of rows) {
        const [coin, price] = (row.dataset.ahCost || '').split(':'), cell = coin ? row.querySelector('.ah-cell-price') : null;
        if (cell) cell.classList.toggle('is-short', !canPay(runtime, coin, Number(price)));
    }
}

/** The heads of the drawn rows' ids, found in one pass over heads (null for an id no longer listed). */
function drawnHeads(rows, heads) {
    const byId = new Map(rows.map(row => [row.dataset.ahLot, null]));
    for (const head of heads) if (byId.has(head.id)) byId.set(head.id, head);
    return byId;
}

/** Patches the drawn rows from the heads (live lots): the chosen mark, a lot just sold or bought, and the minutes left of an open lot when the
 * shown minute changed (row.ahLeft keeps the minute this patch drew). */
export function patchRows(runtime, root, heads) {
    const rows = [...root.querySelectorAll('[data-ah-board] .ah-lot')], byId = drawnHeads(rows, heads), chosen = runtime.state.gear.selected;
    const clock = Math.max(runtime.deps.now(), runtime.deps.game.auction.lastAt);
    for (const row of rows) {
        const id = row.dataset.ahLot, head = byId.get(id);
        if (row.classList.contains('is-chosen') !== (id === chosen)) { row.classList.toggle('is-chosen', id === chosen); row.setAttribute('aria-pressed', String(id === chosen)); }
        if (head && row.dataset.ahState !== head.phase) closeRow(runtime, row, head);
        if (head && head.phase === 'open') patchLeft(runtime, row, head.expireAt - clock);
    }
    patchCosts(runtime, root, rows);
}

/** An open row's minutes left (ms), written only when the shown minute changed. */
function patchLeft(runtime, row, ms) {
    const minute = leftMinutes(ms), left = row.ahLeft === minute ? null : row.querySelector('.ah-cell-left');
    row.ahLeft = minute;
    if (left) left.textContent = minutesText(runtime, ms);
}

/** The line above a result: 새 매물 {count}건 as a button that searches again ('' while none arrived). */
export function paintNewLots(runtime, root, heads) {
    const slot = root.querySelector('[data-ah-new]');
    if (!slot) return;
    const count = countNewLots(runtime, heads);
    const html = count ? `<button type="button" class="ah-new-lots" data-ah-research>${runtime.deps._t('새 매물 {count}건', { count: num(runtime, count) })}</button>` : '';
    if (slot.ahHtml !== html) { slot.innerHTML = html; slot.ahHtml = html; }
}
