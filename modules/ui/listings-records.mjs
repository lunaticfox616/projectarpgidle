/**
 * 출품의 기록: 진열대 아래 손님 수 한 줄과 기록 단추 셋(판매 기록, 최근 방문, 판매 규칙), 누르면 기록 창. 판매 기록에는 가판대 판매와 경매장
 * 판매(구매자, 수수료)가 함께 있다(game.listings.sales). 손님과 방문은 가판대 종류의 것이다.
 */
import { sellerName } from './auction-house-format.mjs';

function esc(runtime, text) { return runtime.deps.escapeHTML(String(text ?? '')); }
function tr(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }

export function coinHtml(runtime, key, amount) {
    return `<span class="stall-coin" data-tip="${esc(runtime, runtime.deps.shopView.currencyName(key))}">${runtime.deps.shopView.coinHtml(key)}<b>${Number(amount).toLocaleString(runtime.deps.i18n.locale)}</b></span>`;
}

/** Whether event is a customer's own (a crowd line is not). */
export function isCustomerEvent(event) { return event.kind !== 'crowd'; }

export function outcomeOf(event) {
    if (event.sold) return ['구매', 'is-bought'];
    if (event.kind === 'offer') return ['가격 제안', 'is-offer'];
    return event.kind === 'crowd' ? ['손님 몰림', 'is-crowd'] : ['구매 안 함', 'is-passed'];
}

export function recordButtonsHtml(runtime) {
    const store = runtime.deps.game.listings, callers = store.history.filter(isCustomerEvent), bought = callers.filter(event => event.sold).length;
    const button = (kind, label, sub) => `<button type="button" class="stall-record-btn" data-lst-records="${kind}"><b>${label}</b><small>${sub}</small></button>`;
    return `<div class="stall-records" data-latest="${store.history[0]?.id || 0}">${button('sales', tr(runtime, '판매 기록'), tr(runtime, '{count}건', { count: store.sales.length }))}
        ${button('visits', tr(runtime, '최근 방문'), tr(runtime, '{callers}명 중 {bought}명 구매', { callers: callers.length, bought }))}${button('terms', tr(runtime, '판매 규칙'), tr(runtime, '진열, 제안, 방문'))}</div>`;
}

function historyHtml(runtime, event) {
    const time = new runtime.deps.Date(event.at).toLocaleTimeString(runtime.deps.i18n.locale, { hour: '2-digit', minute: '2-digit' });
    const [word, tone] = outcomeOf(event);
    const detail = event.sold ? `${esc(runtime, runtime.deps._t(event.name || ''))} ${coinHtml(runtime, event.currency, event.price)}` : esc(runtime, event.reason || '');
    return `<li class="${tone}"><time>${time}</time><em class="stall-outcome">${tr(runtime, word)}</em><span><strong>${esc(runtime, runtime.deps._t(event.customer || '방문객'))}</strong> ${detail}</span></li>`;
}

export function visitsHtml(runtime) {
    return `<ol class="stall-history">${runtime.deps.game.listings.history.map(event => historyHtml(runtime, event)).join('') || `<li>${tr(runtime, '아직 방문객이 없습니다.')}</li>`}</ol>`;
}

export function termsHtml(runtime) {
    return `<div class="stall-terms">
        <p>${tr(runtime, '진열 1분 뒤부터 팔립니다. 가격을 바꿔도 진열 시간은 이어집니다.')}</p>
        <p>${tr(runtime, '가격 제안은 24시간 유효합니다. 진열가로 팔리거나 가격을 바꾸면 사라집니다.')}</p>
        <p>${tr(runtime, '오프라인 방문은 최대 12시간입니다. 루프를 넘기기 전에 진열품과 대금을 회수하세요.')}</p></div>`;
}

/** Who bought: a stall customer's name, or the auction merchant's (its [prefix, suffix] pair). */
function buyerText(runtime, sale) {
    if (sale.kind === 'auction') return sellerName(runtime, sale.buyer);
    return runtime.deps._t(sale.customer || '방문객');
}

function saleRecordHtml(runtime, sale) {
    const date = new runtime.deps.Date(sale.at).toLocaleString(runtime.deps.i18n.locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const duration = sale.listedAt === null ? '' : runtime.deps._t(' ({value} 만에 판매)', { value: runtime.deps.formatRecordDuration(sale.at - sale.listedAt) });
    const fee = sale.kind === 'auction' && sale.fee ? runtime.deps._t(', 수수료 {fee}', { fee: Number(sale.fee).toLocaleString(runtime.deps.i18n.locale) }) : '';
    const name = sale.item ? runtime.deps.getItemDisplayName(sale.item) : runtime.deps._t(sale.name || '이전 거래');
    const way = sale.kind === 'auction' ? '경매장' : '가판대';
    return `<details class="stall-sale" data-sale-id="${sale.id}" data-ui-disclosure="stall-sale-${sale.id}"><summary>${sale.item ? `<img src="${esc(runtime, runtime.deps.getEquipmentGridVisualAsset(sale.item))}" alt="">` : ''}<em class="lst-kind is-${sale.kind}">${tr(runtime, way)}</em><span>${esc(runtime, name)}</span><strong>${coinHtml(runtime, sale.currency, sale.price)}</strong></summary>
        <p class="stall-note">${esc(runtime, `${date}, ${buyerText(runtime, sale)}${duration}${fee}`)}</p>${sale.item ? `<div class="stall-sale-card" data-sale-card="${sale.id}"></div>` : ''}</details>`;
}

export function salesLedgerHtml(runtime) {
    const sales = runtime.deps.game.listings.sales, pages = Math.max(1, Math.ceil(sales.length / 10));
    const page = runtime.state.ledgerPage = Math.max(0, Math.min(runtime.state.ledgerPage, pages - 1));
    const nav = pages > 1 ? `<div class="stall-ledger-pages"><button type="button" class="psd-btn" data-lst-ledger="${page - 1}" ${page === 0 ? 'disabled' : ''}>${tr(runtime, '이전')}</button><span>${page + 1} / ${pages}</span>
        <button type="button" class="psd-btn" data-lst-ledger="${page + 1}" ${page + 1 === pages ? 'disabled' : ''}>${tr(runtime, '다음')}</button></div>` : '';
    const rows = sales.slice(page * 10, page * 10 + 10).map(sale => saleRecordHtml(runtime, sale)).join('') || `<p class="stall-note">${tr(runtime, '아직 판매 기록이 없습니다.')}</p>`;
    return `<div class="stall-ledger">${rows}${nav}</div>`;
}

export function fillSaleCards(runtime, host) {
    host.querySelectorAll('.stall-sale[open] [data-sale-card]:empty').forEach(node => {
        const sale = runtime.deps.game.listings.sales.find(entry => entry.id === Number(node.dataset.saleCard));
        if (sale?.item) node.innerHTML = runtime.deps.shopView.itemCardHtml(sale.item, { rating: false });
    });
}

/** Opens (or redraws) the records window on kind ('sales', 'visits', 'terms'), keeping the opened sale records open. */
export function openRecords(runtime, kind) {
    const page = { sales: () => salesLedgerHtml(runtime), visits: () => visitsHtml(runtime), terms: () => termsHtml(runtime) }[kind];
    if (!runtime.active || !page) return;
    runtime.state.recordsKind = kind;
    const before = runtime.deps.document.getElementById(runtime.state.RECORDS_DIALOG);
    const open = new Set(before ? [...before.querySelectorAll('details.stall-sale[open]')].map(node => node.dataset.saleId) : []);
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.RECORDS_DIALOG, title: tr(runtime, runtime.state.RECORD_TITLES[kind]), panelClass: 'stall-records-panel',
        body: `<div class="stall-records-body">${page()}</div>` });
    if (!panel) return;
    runtime.recordsPanel = panel;
    panel.querySelectorAll('details.stall-sale').forEach(node => { node.open = open.has(node.dataset.saleId); });
    fillSaleCards(runtime, panel);
}

/** Whether the 출품 screen can be seen now (the visitors are drawn only then). */
export function watching(runtime) {
    const { document, backgroundCombatRuntime } = runtime.deps;
    if (document.hidden || backgroundCombatRuntime.appInactive || backgroundCombatRuntime.snapshot || backgroundCombatRuntime.processing) return false;
    const host = document.getElementById('market-panel-listings');
    if (runtime.deps.marketUi.section !== 'listings' || !host?.getClientRects?.().length) return false;
    return host.checkVisibility ? host.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : true;
}

export function paintVisitors(runtime, visible) {
    const lane = runtime.deps.document.getElementById('stall-visitors');
    if (!lane) return;
    const key = visible ? runtime.state.visitors.map(visitor => visitor.event.id).join(',') : '';
    if (lane.dataset.visitors === key) return;
    lane.dataset.visitors = key;
    lane.innerHTML = visible && runtime.state.visitors.length ? `<span class="stall-visitor-total">${tr(runtime, '{length}명 구경 중', { length: runtime.state.visitors.length })}</span>` : '';
}

/** Twice a second at most: the customers of the last 20 seconds who looked at a stall listing, while the screen can be seen. */
export function tickVisitors(runtime, now) {
    if (now - runtime.state.visitorTickAt < 500) return;
    runtime.state.visitorTickAt = now;
    const store = runtime.deps.game.listings, visible = watching(runtime);
    if (!visible || !runtime.state.visitorsVisible) {
        runtime.state.visitors = [];
    } else {
        const fresh = store.history.filter(event => event.id > runtime.state.visitorCursor && now - event.at <= 20000
            && ['visit', 'sale', 'offer'].includes(event.kind) && event.slot !== undefined).reverse();
        runtime.state.visitors = runtime.state.visitors.filter(visitor => visitor.until > now);
        for (const event of fresh.slice(-4)) runtime.state.visitors.push({ event, startedAt: now, until: now + 11000 });
        runtime.state.visitors = runtime.state.visitors.slice(-4);
    }
    runtime.state.visitorCursor = store.eventSequence;
    runtime.state.visitorsVisible = visible;
    paintVisitors(runtime, visible);
}
