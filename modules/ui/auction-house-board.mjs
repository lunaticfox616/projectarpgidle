/**
 * 경매장 아이템 칸의 목록 상자(data-ah-board). 상자가 보이는 것은 넷 가운데 하나다: 검색 전의 첫 화면(방금 올라온 매물 8개와 최근 거래 10개),
 * 기다리는 검색(머리줄과 빈 목록, 진행은 매물 수 자리에), 끝난 검색(새 매물 줄, 머리줄, 50개씩 더 보기), 최근 거래 30개. 무엇을 보이는지가
 * 바뀔 때만 상자를 새로 짓고, 행은 한 번에 그리지 않고 시간 예산 안에서 몇 개씩 붙인다(appendRows, 화면의 그림 틀이 부른다).
 * 1초 확인은 목록을 다시 짓지 않는다: 그려진 행 가운데 방금 팔렸거나 산 매물만 고치고(patchRows), 남은 시간 글을 고치고, 새 매물 줄을 센다.
 * 내려간 행은 다음 검색까지 남고 구매는 규칙의 말로 거절된다.
 */
import { esc, num, tr } from './auction-house-format.mjs';
import { lotRowHtml, headHtml, badgeHtml, minutesText } from './auction-house-rows.mjs';
import { PAGE_ROWS, rowLot, countNewLots } from './auction-house-search.mjs';

// The first view: how many newest lots and latest trades it shows.
const LANDING = Object.freeze({ newest: 8, trades: 10 });

/** What the board shows now: one key per structure (a change rebuilds the board). */
function boardKey(runtime) {
    const view = runtime.state.gear, search = runtime.search;
    if (view.mode === 'recent') return `recent|${view.kind}|${runtime.headsReady ? 1 : 0}`;
    if (!search) return `landing|${runtime.headsReady ? 1 : 0}`;
    return `search|${search.serial}|${search.phase === 'done' ? 'done' : 'wait'}`;
}

/** Queues ids to be drawn into list (tail: 'open' rows with time left and price, 'recent' rows with price and how long ago). */
function queueRows(runtime, list, ids, tail) {
    if (list && ids.length) runtime.jobs.push({ list, ids, at: 0, tail });
}

function listHtml(name) { return `<ul class="ah-lots" role="list" data-ah-rows="${name}"></ul>`; }

/** The first view: the newest open lots and the latest trades, each block with its title. */
function landingBoard(runtime, board) {
    if (!runtime.headsReady) return;
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now();
    const newest = auctionHouse.lotHeads(game, now).filter(head => head.phase === 'open').sort((a, b) => b.arriveAt - a.arriveAt).slice(0, LANDING.newest);
    const trades = auctionHouse.recentHeads(game, now).slice(0, LANDING.trades);
    if (!newest.length && !trades.length) { board.innerHTML = `<p class="ah-empty">${runtime.deps._t('아직 매물이 없습니다.')}</p>`; return; }
    board.innerHTML = `<section class="ah-landing"><h4>${runtime.deps._t('방금 올라온 매물')}</h4>${listHtml('newest')}</section>
        <details class="ah-landing is-recent"><summary>${esc(runtime, tr(runtime, '최근 거래'))}</summary>${listHtml('trades')}</details>`;
    queueRows(runtime, board.querySelector('[data-ah-rows="newest"]'), newest.map(head => head.id), 'open');
    queueRows(runtime, board.querySelector('[data-ah-rows="trades"]'), trades.map(head => head.id), 'recent');
}

/** The 최근 거래 list: the latest trades of the chosen kind. */
function recentBoard(runtime, board) {
    if (!runtime.headsReady) return;
    const kind = runtime.state.gear.kind, trades = runtime.deps.auctionHouse.recentHeads(runtime.deps.game, runtime.deps.now())
        .filter(head => kind === 'all' || head.kind === kind);
    board.innerHTML = trades.length ? `${headHtml(runtime, 'recent')}${listHtml('recent')}` : `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`;
    queueRows(runtime, board.querySelector('[data-ah-rows]'), trades.map(head => head.id), 'recent');
}

/** The more button of a result ('' when every row is queued). */
function moreHtml(runtime) {
    const search = runtime.search;
    return search && search.limit < search.ids.length ? `<button type="button" class="ah-more" data-ah-more>${runtime.deps._t('더 보기')}</button>` : '';
}

/** A search: the header and an empty list while it waits; the result's first page once it is done. */
function searchBoard(runtime, board) {
    const search = runtime.search, done = search.phase === 'done';
    if (done && !search.ids.length) { board.innerHTML = `<p class="ah-empty">${runtime.deps._t('조건에 맞는 매물이 없습니다.')}</p>`; return; }
    board.innerHTML = `<div class="ah-new-slot" data-ah-new></div>${headHtml(runtime, 'open')}${listHtml('result')}<div class="ah-more-slot" data-ah-more-slot>${done ? moreHtml(runtime) : ''}</div>`;
    if (done) queueRows(runtime, board.querySelector('[data-ah-rows]'), search.ids.slice(0, search.limit), 'open');
}

/** Rebuilds the board when what it shows changed (force: the board element is new). */
export function paintBoard(runtime, root, force) {
    const board = root.querySelector('[data-ah-board]'), key = boardKey(runtime);
    if (!board || (!force && board.ahKey === key)) return;
    board.ahKey = key;
    board.innerHTML = '';
    board.classList.toggle('is-recent', runtime.state.gear.mode === 'recent');
    if (runtime.state.gear.mode === 'recent') recentBoard(runtime, board);
    else if (runtime.search) searchBoard(runtime, board);
    else landingBoard(runtime, board);
}

/** 더 보기: the next page of the result is queued under the rows already drawn. */
export function showMore(runtime, root) {
    const search = runtime.search, list = root.querySelector('[data-ah-board] [data-ah-rows="result"]');
    if (!search || search.phase !== 'done' || !list) return;
    queueRows(runtime, list, search.ids.slice(search.limit, search.limit + PAGE_ROWS), 'open');
    search.limit += PAGE_ROWS;
    const slot = root.querySelector('[data-ah-more-slot]');
    if (slot) slot.innerHTML = moreHtml(runtime);
}

/** Draws queued rows until stop() says stop (checked before each row; a row may roll its lot's body). Returns whether rows are left. */
export function appendRows(runtime, stop) {
    runtime.jobs = runtime.jobs.filter(job => job.list.isConnected && job.at < job.ids.length);
    for (const job of runtime.jobs) {
        while (job.at < job.ids.length) {
            if (stop()) return true;
            const lot = rowLot(runtime, job.ids[job.at++]);
            if (lot) job.list.insertAdjacentHTML('beforeend', lotRowHtml(runtime, lot, job.tail));
        }
    }
    runtime.jobs = [];
    return false;
}

/** A drawn row whose lot was just sold or bought: dimmed, its price replaced by 팔림 or 구매함 (the 최근 거래 rows are drawn sold). */
function closeRow(runtime, row, head) {
    row.dataset.ahState = head.phase;
    if (head.phase !== 'sold' && head.phase !== 'bought') return;
    row.classList.add('is-closed');
    const price = row.querySelector('.ah-cell-price'), left = row.querySelector('.ah-cell-left');
    if (price && !row.closest('.is-recent')) price.innerHTML = badgeHtml(runtime, { soldOut: head.phase === 'sold', boughtByMe: head.phase === 'bought' });
    if (left) left.textContent = '';
}

/** Patches the drawn rows from the heads (live lots by id): the chosen mark, a lot just sold or bought, the minutes left of an open lot. */
export function patchRows(runtime, root, heads) {
    const byId = new Map(heads.map(head => [head.id, head])), chosen = runtime.state.gear.selected;
    const clock = Math.max(runtime.deps.now(), runtime.deps.game.auction.lastAt);
    for (const row of root.querySelectorAll('[data-ah-board] .ah-lot')) {
        const id = row.dataset.ahLot, head = byId.get(id);
        if (row.classList.contains('is-chosen') !== (id === chosen)) { row.classList.toggle('is-chosen', id === chosen); row.setAttribute('aria-pressed', String(id === chosen)); }
        if (head && row.dataset.ahState !== head.phase) closeRow(runtime, row, head);
        const left = head && head.phase === 'open' ? row.querySelector('.ah-cell-left') : null;
        if (left) left.textContent = minutesText(runtime, head.expireAt - clock);
    }
}

/** The line above a result: 새 매물 {count}건 as a button that searches again ('' while none arrived). */
export function paintNewLots(runtime, root, heads) {
    const slot = root.querySelector('[data-ah-new]');
    if (!slot) return;
    const count = countNewLots(runtime, heads);
    const html = count ? `<button type="button" class="ah-new-lots" data-ah-research>${runtime.deps._t('새 매물 {count}건', { count: num(runtime, count) })}</button>` : '';
    if (slot.ahHtml !== html) { slot.innerHTML = html; slot.ahHtml = html; }
}
