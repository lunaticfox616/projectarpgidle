import { syncStallOwner } from './player-stall-state.mjs';
import { fillSaleCards, salesLedger, visitsHtml, paintVisitors } from './player-stall-visitors.mjs';
import { stallTerms, inspectedListing, items, shelfHtml, infoHtml, preview, bagPick } from './player-stall-markup.mjs';

export function resetDraft(runtime) { runtime.state.view_draftAsk = ''; runtime.state.view_draftCurrency = ''; runtime.state.view_pendingSlot = null; }

export function openRecords(runtime, kind) {
    if (!runtime.active) return;
    const page = { sales: () => salesLedger(runtime), visits: () => visitsHtml(runtime, runtime.deps.game.playerStall), terms: () => stallTerms(runtime) }[kind];
    if (!page) return;
    runtime.state.view_recordsKind = kind;
    const before = runtime.deps.document.getElementById(runtime.state.STALL_RECORDS_DIALOG);
    const open = new Set(before ? [...before.querySelectorAll('details.stall-sale[open]')].map(node => node.dataset.saleId) : []);
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.STALL_RECORDS_DIALOG, title: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(runtime.state.STALL_RECORD_TITLES[kind])), panelClass: 'stall-records-panel',
        body: `<div class="stall-records-body">${page()}</div>` });
    if (!panel) return;
    runtime.recordsPanel = panel;
    panel.querySelectorAll('details.stall-sale').forEach(node => { node.open = open.has(node.dataset.saleId); });
    fillSaleCards(runtime, panel);
}

export function showSales(runtime, page) {
    runtime.state.view_ledgerPage = Math.max(0, Math.min(Math.ceil(runtime.deps.game.playerStall.sales.length / 10) - 1, page));
    openRecords(runtime, 'sales');
}

export function editing(runtime, host) {
    const active = runtime.deps.document.activeElement;
    return active && host.contains(active) && ['INPUT','SELECT','TEXTAREA'].includes(active.tagName);
}

export function syncSelection(runtime) {
    if (runtime.state.view_selectedListingId && !inspectedListing(runtime)) { runtime.state.view_selectedListingId = null; resetDraft(runtime); }
    if (runtime.state.view_selectedId !== null && !items(runtime).some(item => item.id === runtime.state.view_selectedId)) { runtime.state.view_selectedId = null; resetDraft(runtime); }
}

export function stallRender(runtime, force = false) {
    if (!runtime.active) return;
    if (syncStallOwner(runtime)) force = true;
    const host = runtime.deps.document.getElementById('market-panel-stall');
    if (!host || runtime.deps.shopView.dragging() || (editing(runtime, host) && !force)) return;
    syncSelection(runtime);
    const stall = runtime.deps.game.playerStall;
    const html = `<div class="shop-view is-stall" data-shop-kind="stall"><div class="shop-body"><section class="shop-shelf" aria-label="${(0, runtime.deps._t)('가판대')}">${shelfHtml(runtime, stall)}</section>
                <div class="shop-info" aria-live="polite">${infoHtml(runtime)}</div>
            <section class="shop-bag" aria-label="${(0, runtime.deps._t)('가방')}">${runtime.deps.shopView.bagHtml(item => bagPick(runtime, item))}</section></div></div>`;
    if (host.stallMarkup === html) return;
    // 판매 기록의 펼침과 장비 카드는 기록 창이 맡는다(openRecords). 가판대 판에는 펼치는 칸이 없다.
    host.innerHTML = html;
    host.stallMarkup = html;
    paintVisitors(runtime, runtime.state.view_visitorsVisible);
    preview(runtime);
    if (runtime.deps.selectionDialog.isOpen(runtime.state.STALL_RECORDS_DIALOG)) openRecords(runtime, runtime.state.view_recordsKind); // a new visit or sale reaches the open window
}
