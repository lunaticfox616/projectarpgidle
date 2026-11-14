import { syncStallOwner } from './player-stall-state.mjs';
import { coinHtml, history } from './player-stall-markup.mjs';

export function watchingStall(runtime) {
    if (runtime.deps.document.hidden || runtime.deps.backgroundCombatRuntime.appInactive || runtime.deps.backgroundCombatRuntime.snapshot || runtime.deps.backgroundCombatRuntime.processing) return false;
    const host = runtime.deps.document.getElementById('market-panel-stall');
    if (runtime.deps.marketUi.section !== 'stall' || !host?.getClientRects?.().length) return false;
    return host.checkVisibility ? host.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }) : true;
}

export function tickVisitors(runtime, now) {
    if (!runtime.active) return;
    syncStallOwner(runtime);
    if (now - runtime.state.view_visitorTickAt < 500) return;
    runtime.state.view_visitorTickAt = now;
    const stall = runtime.deps.game.playerStall, visible = watchingStall(runtime);
    if (!visible || !runtime.state.view_visitorsVisible) {
        runtime.state.view_visitors = []; runtime.state.view_visitorCursor = stall.eventSequence;
    } else {
        const fresh = stall.history.filter(event => event.id > runtime.state.view_visitorCursor && now - event.at <= 20000
                && ['visit','sale','offer'].includes(event.kind) && event.slot !== undefined).reverse();
        runtime.state.view_visitors = runtime.state.view_visitors.filter(visitor => visitor.until > now);
        for (const event of fresh.slice(-4)) runtime.state.view_visitors.push({ event, startedAt: now, until: now + 11000 });
        runtime.state.view_visitors = runtime.state.view_visitors.slice(-4);
        runtime.state.view_visitorCursor = stall.eventSequence;
    }
    runtime.state.view_visitorsVisible = visible;
    paintVisitors(runtime, visible);
}

export function paintVisitors(runtime, visible) {
    const lane = runtime.deps.document.getElementById('stall-visitors');
    if (!lane) return;
    const key = visible ? runtime.state.view_visitors.map(visitor => visitor.event.id).join(',') : '';
    if (lane.dataset.visitors === key) return;
    lane.dataset.visitors = key;
    lane.innerHTML = visible && runtime.state.view_visitors.length ? `<span class="stall-visitor-total">${(0, runtime.deps._t)('{length}명 구경 중', { length: runtime.state.view_visitors.length })}</span>` : '';
}

export function saleRecord(runtime, sale) {
    const date = new runtime.deps.Date(sale.at).toLocaleString(runtime.deps.i18n.locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const duration = sale.listedAt === null ? '' : (0, runtime.deps._t)(' ({value} 만에 판매)', { value: (0, runtime.deps.formatRecordDuration)(sale.at - sale.listedAt) });
    const name = sale.item?.name || sale.name || '이전 거래';
    return `<details class="stall-sale" data-sale-id="${sale.id}" data-ui-disclosure="stall-sale-${sale.id}"><summary>${sale.item ? `<img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(sale.item)}" alt="">` : ''}<span>${(0, runtime.deps.escapeHTML)(name)}</span><strong>${coinHtml(runtime, sale.currency, sale.price)}</strong></summary>
            <p class="stall-note">${date}, ${(0, runtime.deps.escapeHTML)(sale.customer || '방문객')}${duration}</p>${sale.item ? `<div class="stall-sale-card" data-sale-card="${sale.id}"></div>` : ''}</details>`;
}

export function visitsHtml(runtime, stall) {
    return `<ol class="stall-history">${stall.history.map(event => history(runtime, event)).join('') || (0, runtime.deps._t)('<li>아직 방문객이 없습니다.</li>')}</ol>`;
}

export function fillSaleCards(runtime, host) {
    host.querySelectorAll('.stall-sale[open] [data-sale-card]:empty').forEach(node => {
        const sale = runtime.deps.game.playerStall.sales.find(entry => entry.id === Number(node.dataset.saleCard));
        if (sale?.item) node.innerHTML = runtime.deps.shopView.itemCardHtml(sale.item, { rating: false });
    });
}

export function salesLedger(runtime) {
    const sales = runtime.deps.game.playerStall.sales, pages = Math.max(1, Math.ceil(sales.length / 10));
    runtime.state.view_ledgerPage = Math.max(0, Math.min(runtime.state.view_ledgerPage, pages - 1));
    return `<div class="stall-ledger">
            ${sales.slice(runtime.state.view_ledgerPage * 10, runtime.state.view_ledgerPage * 10 + 10).map(sale => saleRecord(runtime, sale)).join('') || (0, runtime.deps._t)('<p class="stall-note">아직 판매 기록이 없습니다.</p>')}
            ${pages > 1 ? `<div class="stall-ledger-pages"><button type="button" onclick="playerStallUi.showSales(${runtime.state.view_ledgerPage - 1})" ${runtime.state.view_ledgerPage === 0 ? 'disabled' : ''}>${(0, runtime.deps._t)('이전')}</button><span>${runtime.state.view_ledgerPage + 1} / ${pages}</span>
            <button type="button" onclick="playerStallUi.showSales(${runtime.state.view_ledgerPage + 1})" ${runtime.state.view_ledgerPage + 1 === pages ? 'disabled' : ''}>${(0, runtime.deps._t)('다음')}</button></div>` : ''}</div>`;
}
