/**
 * 경매장 칸 그리기. 칸이 보일 때(marketUi가 이 칸을 그릴 때)와 명령 전에 시계를 지금으로 옮기고(advance), 거래 창의 기존 갱신
 * (renderMarketUI)이 부를 때는 저장과 화면 상태의 짧은 서명이 같으면 아무것도 다시 만들지 않는다. 맨 위 줄(칸 단추와 지갑), 한 줄 시세
 * (이번 구간의 사건 이름, 오른 것과 내린 것, 다음 시세 시각; 사건의 설명은 이름에 마우스를 올리면 보인다), 본문을 따로 칠해 바뀐 부분만 바꾼다(칸 단추는 제자리에서 속성만 고친다: 화살표 키의 초점이 남는다). 닫힌 칸은 일을 하지 않는다.
 * 칸이 보이는 동안 그림 틀마다 한 번(requestAnimationFrame) 예산(FRAME_BUDGET_MS) 안에서만 일한다: 목록 행 붙이기, 검색, 매물의 몸 미리 굴리기
 * (auctionHouse.warmLots, 머리 만들기도 같은 예산). 할 일이 없으면 틀을 더 걸지 않는다. 1초마다 도는 확인 하나는 시계를 옮기고, 새로 놓인 매물의
 * 몸을 굴리고, 아이템 칸이면 그려진 행만 고친다(목록을 다시 짓지 않는다). 칸이나 창이 닫히면 다음 확인에서 둘 다 멈추고, 만든 매물은 3분 동안
 * 남겼다가(DROP_MS, 그 안에 다시 열면 그대로 쓴다) 버린다. 화면을 치우면 바로 멈춘다.
 */
import { trHtml, esc, pct, trendClass, familyLabel, paint } from './auction-house-format.mjs';
import { gearViewHtml, fillGear, liveHeads } from './auction-house-gear.mjs';
import { paintCount } from './auction-house-panel.mjs';
import { appendRows } from './auction-house-board.mjs';
import { indexStep, dropIndex } from './auction-house-index.mjs';
import { savedCountStep, savedCountsPending, paintSaved } from './auction-house-saved.mjs';
import { stepSearch, searchPrefer } from './auction-house-search.mjs';
import { materialsViewHtml, listScroll, keepListScroll } from './auction-house-materials.mjs';
import { standsViewHtml, claimable } from './auction-house-stands.mjs';
import { watchHall } from './auction-house-hall.mjs';
import { hidePeek } from './auction-house-peek.mjs';

const TABS = Object.freeze([['gear', '아이템'], ['materials', '재료'], ['mine', '내 출품']]);
const MOVERS = 3;
const WALLET = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
// The work one animation frame may do (ms of performance.now): drawing rows, the search and warming the lots' bodies. A 240 Hz frame is 4 ms.
const FRAME_BUDGET_MS = 1.5;
/** What a search click may spend making its result at once (the rest goes to the frames). */
export const SEARCH_CLICK_MS = 6;
// The check while the section is shown, and how long the generated lots are kept after it closed.
const TICK_MS = 1000;
const DROP_MS = 180000;

/** Moves the auction clock to now and announces what settled (as the game tick does). Returns whether the bucket turned. */
export function syncClock(runtime) {
    const { auctionHouse, game } = runtime.deps, now = runtime.deps.now();
    if (!auctionHouse.needsAdvance(game, now)) return false;
    const result = auctionHouse.advance(game, now);
    announce(runtime, result.settled);
    return result.bucketChanged;
}

/** Announces settled rows through the game's own announcer (modules/application/foreground-loop.mjs announceAuction). */
export function announce(runtime, settled) {
    if (settled && settled.length) runtime.deps.announceAuction(settled);
}

function moverRows(runtime, pulse) {
    const seen = new Set(runtime.deps.auctionHouse.materials(runtime.deps.game).filter(row => row.seen).map(row => row.key));
    const rows = [...runtime.deps.auctionHouse.rules.families.map(key => ({ key, kind: 'family' })), ...[...seen].map(key => ({ key, kind: 'material' }))]
        .map(row => ({ ...row, factor: pulse.factors[row.key] }));
    const up = rows.filter(row => row.factor > 1).sort((a, b) => b.factor - a.factor).slice(0, MOVERS);
    const down = rows.filter(row => row.factor < 1).sort((a, b) => a.factor - b.factor).slice(0, MOVERS);
    // Risers and fallers take turns (the largest of each first): the band shows only the chips that fit whole, so both kinds stay in view.
    return up.flatMap((row, at) => [row, down[at]]).concat(down.slice(up.length)).filter(Boolean);
}

function chipHtml(runtime, row) {
    const material = row.kind === 'material', name = material ? runtime.deps.shopView.currencyName(row.key) : familyLabel(runtime, row.key);
    const attr = material ? `data-ah-jump="${esc(runtime, row.key)}"` : `data-ah-family="${esc(runtime, row.key)}"`;
    const art = material ? runtime.deps.shopView.coinHtml(row.key) : '';
    return `<li><button type="button" class="ah-chip ${trendClass(row.factor)}" ${attr}>${art}<span>${esc(runtime, name)}</span><b>${pct(runtime, row.factor)}</b></button></li>`;
}

function nextChangeText(runtime, bucket) {
    const at = new Date((bucket + 1) * runtime.deps.auctionHouse.rules.bucketMs);
    const time = at.toLocaleTimeString(runtime.deps.i18n.locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return runtime.deps._t('{time}에 시세가 바뀝니다', { time });
}

/** The one-line market: the event's title (its description as a tip), the movers, the time of the next change. */
function bandHtml(runtime) {
    const pulse = runtime.deps.auctionHouse.pulse(runtime.deps.game), event = pulse.event;
    return `<strong class="ah-event" data-tip="${trHtml(runtime, event.description)}">${trHtml(runtime, event.title)}</strong>
        <ul class="ah-movers" aria-label="${runtime.deps._t('시세 변화')}">${moverRows(runtime, pulse).map(row => chipHtml(runtime, row)).join('')}</ul>
        <span class="ah-next">${nextChangeText(runtime, pulse.bucket)}</span>`;
}

/** The frame: the head (market band and purse) and the view. The three tabs stand outside it, on the trade window's tab row
 * (index.html #market-exchange-tabs, beside the stall and the hall): paintTabs writes their names and marks there. */
function skeletonHtml(runtime) {
    return `<div class="ah-root" data-locale="${esc(runtime, runtime.deps.i18n.locale)}"><header class="ah-top"><div class="ah-band"></div><div class="ah-purse"></div></header>
        <div class="ah-view" id="ah-view"></div></div>`;
}

function tabLabelHtml(runtime, id, label) {
    if (id !== 'mine') return `<span class="px-center">${trHtml(runtime, label)}</span>`;
    const lots = runtime.deps.game.auction.lots.length, waiting = claimable(runtime).length;
    const dot = waiting ? `<i class="ah-dot" role="img" aria-label="${runtime.deps._t('수령할 출품이 있습니다')}"></i>` : '';
    return `<span class="px-center">${trHtml(runtime, label)} <small>${lots}/${runtime.deps.auctionHouse.rules.myLots.slots}</small></span>${dot}`;
}

/** Writes the three tabs' names and marks on the trade window's tab row (which one is chosen is the market's to say: the row also holds
 * the stall and the hall) and, with the section's root, which tab its view shows. */
export function paintTabs(runtime, root) {
    const row = runtime.deps.document.getElementById('market-exchange-tabs');
    for (const [id, label] of TABS) {
        const button = row && row.querySelector(`[data-ah-tab="${id}"]`);
        if (button) paint(button.querySelector('.ah-tab-label'), tabLabelHtml(runtime, id, label));
    }
    if (root) root.dataset.tab = runtime.state.tab;
    // 칸 안의 동작(시세 칩, 재료 칩, 출품할 장비 고르기)이 탭을 바꿔도 그 줄의 고른 표시가 따라간다(경매장이 보일 때만: 그 줄에는 가판대와 전당도 있다)
    const panel = runtime.deps.document.getElementById('market-panel-auction');
    if (row && panel && !panel.hidden) for (const button of row.querySelectorAll('[data-market-section]')) {
        const chosen = button.dataset.ahTab === runtime.state.tab;
        button.setAttribute('aria-selected', String(chosen));
        button.tabIndex = chosen ? 0 : -1;
    }
}

const VIEWS = Object.freeze({ gear: gearViewHtml, materials: materialsViewHtml, mine: standsViewHtml });

/** The attribute that names a focused control (its first data-ah-* attribute), to focus its successor after a repaint. */
function focusKey(view) {
    const active = view.ownerDocument.activeElement;
    if (!active || !view.contains(active)) return '';
    const attr = [...active.attributes].find(row => row.name.startsWith('data-ah-'));
    return attr ? `[${attr.name}="${attr.value.replace(/["\\]/g, '\\$&')}"]` : '';
}

function paintView(runtime, view) {
    const key = focusKey(view), top = listScroll(view), painted = paint(view, VIEWS[runtime.state.tab](runtime));
    if (painted) keepListScroll(view, top);
    // The 아이템 view paints its boxes in place (its rows stay); its frame is drawn once.
    if (runtime.state.tab === 'gear') fillGear(runtime, view.querySelector('.ah-gear'), painted);
    if (painted && key) view.querySelector(key)?.focus({ preventScroll: true });
}

/** A short print of everything this section shows: the same print means nothing to redraw. */
function signature(runtime) {
    const game = runtime.deps.game, state = game.auction, view = runtime.state;
    const purse = ['magicBud', 'formlessDew', 'goldenRule', ...runtime.deps.auctionHouse.rules.materials.keys].map(key => game.currencies[key] || 0);
    const bag = game.inventory.length ? `${game.inventory.length}:${game.inventory[game.inventory.length - 1].id}` : '0';
    const worn = Object.values(game.equipment || {}).map(item => (item ? item.id : 0));
    return JSON.stringify([state.bucket, state.lots.map(lot => [lot.id, lot.status, lot.rolls]), state.bought, state.quota, purse, bag, worn,
        game.woodsmanBuildLock ? 1 : 0, view.tab, view.gear, view.materials, view.mine.draft, view.hall.version, runtime.deps.i18n.locale,
        runtime.deps.auctionHouse.mode, runtime.deps.auctionPulse.version,
        runtime.deps.shopView.busyReason()]);
}

function editingInput(host) {
    const active = host.ownerDocument.activeElement;
    return !!active && host.contains(active) && active.tagName === 'INPUT';
}

/** The section's host when it is shown and usable, else null (a closed or hidden section does no work). */
function shownHost(runtime) {
    const { document, auctionHouse, game } = runtime.deps, host = runtime.active ? document.getElementById('market-panel-auction') : null;
    return host && !host.hidden && game && auctionHouse.canOpen(game) ? host : null;
}

/** Puts the frame (band, tabs, view) in when it is missing or was drawn in another language. Returns whether it did. */
function ensureSkeleton(runtime, host) {
    if (host.querySelector('.ah-root')?.dataset.locale === runtime.deps.i18n.locale) return false;
    host.innerHTML = skeletonHtml(runtime);
    return true;
}

/** The section's host when it can be seen now (shown, and its window open), else null. The observer (watchVisibility) tells without reading
 * the layout; without one a closed window is the one that lays out no boxes. */
function seenHost(runtime) {
    const host = shownHost(runtime);
    if (!host) return null;
    if (runtime.observer) return runtime.visible ? host : null;
    return host.getClientRects().length ? host : null;
}

/** Watches whether the host is on screen (an IntersectionObserver reports it after layout, so the check never forces one). */
function watchVisibility(runtime, host) {
    const Observer = runtime.deps.window.IntersectionObserver;
    if (runtime.observer || !Observer) return;
    runtime.visible = true;
    runtime.observer = new Observer(entries => { runtime.visible = entries[entries.length - 1].isIntersecting; });
    runtime.observer.observe(host);
}

/** The 아이템 view's root inside a seen host when it is the shown tab, else null. */
function gearRoot(runtime, host) {
    return runtime.state.tab === 'gear' ? host.querySelector('.ah-gear') : null;
}

/** A stop() for the domain and the row drawing: true once ms (default FRAME_BUDGET_MS) passed since it was made. */
export function budgetStop(runtime, ms = FRAME_BUDGET_MS) {
    const clock = runtime.deps.window.performance, start = clock.now();
    return () => clock.now() - start > ms;
}

/** Asks for one animation frame (none when one is pending). runtime.frameStep is made once with the view. */
export function wantFrame(runtime) {
    if (!runtime.frame) runtime.frame = runtime.deps.window.requestAnimationFrame(runtime.frameStep);
}

/** Warms the lots' bodies under stop (the waiting search's candidates first) and notes whether the heads are ready and every body is warm.
 * When the heads just became ready the 아이템 view must be filled again (its first view needs them): runtime.refill. */
function warmStep(runtime, stop, now = runtime.deps.now()) {
    const { auctionHouse, game } = runtime.deps, prefer = searchPrefer(runtime), warm = auctionHouse.warmLots(game, now, { stop, prefer });
    // A waiting search reads the progress of its own candidates only (warm.prefer is the filter this result was made with).
    runtime.lastWarm = { ...warm, prefer };
    if (warm.heads && !runtime.headsReady) runtime.refill = true;
    runtime.headsReady = warm.heads;
    runtime.warmDone = warm.heads && warm.done >= warm.total;
    return warm;
}

/** The budgeted work of a frame: queued rows, the search, then the bodies with what is left (a waiting search follows the latest warming),
 * then the lots' search fields and the saved searches' counts; a search that changed phase asks for a refill of the 아이템 view. */
function budgetWork(runtime, root) {
    const stop = budgetStop(runtime), phase = runtime.search?.phase;
    appendRows(runtime, stop);
    stepSearch(runtime, stop, runtime.lastWarm);
    if (!stop() || !runtime.search || runtime.search.phase === 'warm') warmStep(runtime, stop);
    if (!stop()) searchFieldsStep(runtime, root, stop);
    if (runtime.search && runtime.search.phase !== phase) runtime.refill = true;
    paintCount(runtime, root);
}

/** With the time left: the lots' search fields, then the saved searches' counts (painted when one was added). */
function searchFieldsStep(runtime, root, stop) {
    indexStep(runtime, stop);
    if (!stop() && savedCountStep(runtime, stop) && root) paintSaved(runtime, root);
}

/** Whether another frame has work: a refill to paint, a search, bodies to warm, search fields to make, saved searches to count, rows to draw. */
function frameWorkLeft(runtime, root) {
    return (runtime.refill && !!root) || (!!runtime.search && runtime.search.phase !== 'done') || !runtime.warmDone || runtime.jobs.length > 0
        || !(runtime.index && runtime.index.done) || savedCountsPending(runtime);
}

/** One animation frame of work: a pending refill of the 아이템 view alone (it takes a frame of its own), else the budgeted work. Asks for the
 * next frame while work is left. No layout is read here (it would force a style pass on a frame the game is drawing): the check and
 * renderAuction keep runtime.seen. */
export function frameStep(runtime) {
    runtime.frame = 0;
    const host = runtime.seen ? shownHost(runtime) : null, root = host && gearRoot(runtime, host);
    if (!host) return;
    if (runtime.refill && root) {
        runtime.refill = false;
        fillGear(runtime, root, false);
    } else budgetWork(runtime, root);
    if (frameWorkLeft(runtime, root)) wantFrame(runtime);
}

/** Stops the frame work and the check (the section closed or the screen was disposed; disposing also stops watching the host and the list's end). */
export function stopWork(runtime, disposing = false) {
    if (disposing && runtime.observer) runtime.observer.disconnect();
    if (disposing && runtime.moreObserver) runtime.moreObserver.disconnect();
    if (runtime.frame) runtime.deps.window.cancelAnimationFrame(runtime.frame);
    if (runtime.tick) runtime.deps.window.clearInterval(runtime.tick);
    runtime.frame = 0;
    runtime.tick = 0;
}

/** The section closed: the work stops and the generated lots are dropped DROP_MS later unless it opens again. */
function closeSection(runtime) {
    runtime.seen = false;
    hidePeek(runtime);
    stopWork(runtime);
    if (!runtime.dropTimer) runtime.dropTimer = runtime.deps.window.setTimeout(runtime.dropLots, DROP_MS);
}

/** Drops the generated lots (runtime.dropLots, made once with the view): the next opening builds them again. */
export function dropGeneratedLots(runtime) {
    runtime.dropTimer = 0;
    runtime.headsReady = false;
    runtime.warmDone = false;
    dropIndex(runtime);
    runtime.deps.auctionHouse.dropLots();
}

/** The section is shown: a pending drop is called off, the check runs once a second and the frame work starts. */
function openSection(runtime, host) {
    watchVisibility(runtime, host);
    if (runtime.dropTimer) runtime.deps.window.clearTimeout(runtime.dropTimer);
    runtime.dropTimer = 0;
    runtime.seen = true;
    if (!runtime.tick) runtime.tick = runtime.deps.window.setInterval(runtime.tickStep, TICK_MS);
    wantFrame(runtime);
}

/** The check: closes when the section cannot be seen; else moves the clock (a turned bucket repaints the band), warms the lots that just
 * arrived under the budget and, on the 아이템 view, patches the drawn rows, the new lots line, the chips and the detail. */
export function tickStep(runtime) {
    const host = seenHost(runtime);
    if (!host) { closeSection(runtime); return; }
    const root = host.querySelector('.ah-root'), gear = gearRoot(runtime, host);
    if (syncClock(runtime)) paint(root.querySelector('.ah-band'), bandHtml(runtime));
    // One clock for the warming and the patches: the rules read the list once for both.
    const now = runtime.deps.now();
    warmStep(runtime, budgetStop(runtime), now);
    if (!runtime.warmDone || runtime.refill || savedCountsPending(runtime)) wantFrame(runtime);
    if (gear) fillGear(runtime, gear, false, liveHeads(runtime, now), true);
}

/** Draws the section when it is shown (force: a user action or the section was just opened). */
export function renderAuction(runtime, force = false) {
    const host = shownHost(runtime);
    if (!host) { closeSection(runtime); return; }
    if (syncClock(runtime)) force = true;
    // The server pulse (modules/application/auction-pulse-service.mjs): at most one request per bucket and 10 minutes; its reply redraws.
    runtime.deps.auctionPulse.sync();
    watchHall(runtime);
    if (ensureSkeleton(runtime, host)) force = true;
    openSection(runtime, host);
    const print = signature(runtime);
    if (!force && (print === runtime.state.print || editingInput(host))) return;
    runtime.state.print = print;
    const root = host.querySelector('.ah-root');
    paint(root.querySelector('.ah-band'), bandHtml(runtime));
    paint(root.querySelector('.ah-purse'), runtime.deps.shopView.walletHtml(WALLET));
    paintTabs(runtime, root);
    paintView(runtime, root.querySelector('.ah-view'));
}
