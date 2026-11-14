import { busy, items, askValue, suggestedPrice, listingTerms, inspectedListing, selected } from './player-stall-markup.mjs';
import { stallRender, resetDraft } from './player-stall-render.mjs';

export function stallBlocked(runtime, manage = true) {
    const reason = busy(runtime, manage);
    if (!reason) return false;
    runtime.state.view_message = reason;
    stallRender(runtime, true);
    return true;
}

export function select(runtime, value) {
    const id = Number(value);
    if (id !== runtime.state.view_selectedId || runtime.state.view_selectedListingId) resetDraft(runtime);
    runtime.state.view_selectedId = id; runtime.state.view_selectedListingId = null; runtime.state.view_message = '';
    stallRender(runtime, true);
}

export function inspect(runtime, id) { runtime.state.view_selectedId = null; runtime.state.view_selectedListingId = id; resetDraft(runtime); runtime.state.view_message = ''; stallRender(runtime, true); revealTerms(runtime); }

export function openOffers(runtime) {
    const row = runtime.deps.game.playerStall.listings.filter(entry => entry.offer).sort((a, b) => b.offer.id - a.offer.id)[0];
    if (row) inspect(runtime, row.id);
    runtime.deps.document.querySelector('#market-panel-stall .shop-info')?.scrollIntoView({ block: 'nearest' });
}

export function cancelPlacement(runtime) { runtime.state.view_pendingSlot = null; runtime.state.view_message = '놓기를 취소했습니다.'; stallRender(runtime, true); }

export function revealTerms(runtime) {
    if (!runtime.deps.uiDisplay.matches('(max-width: 720px)')) return;
    const behavior = runtime.deps.uiDisplay.matches('(prefers-reduced-motion: reduce)') ? 'auto' : 'smooth';
    runtime.deps.document.querySelector('#market-panel-stall .shop-info')?.scrollIntoView({ block: 'nearest', behavior });
}

export function tapStand(runtime, slot) {
    const source = runtime.state.view_selectedListingId ? { kind: 'listing', id: runtime.state.view_selectedListingId } : { kind: 'inventory', id: runtime.state.view_selectedId };
    stallPlace(runtime, source, slot);
}

export function stallPlace(runtime, source, slot, quick = false) {
    if (stallBlocked(runtime)) return;
    if (!standFree(runtime, slot)) { stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('비어 있는 진열칸을 골라 주세요.') }); return; }
    if (source.kind === 'listing') { stallMoveListing(runtime, source.id, slot); return; }
    const item = items(runtime).find(entry => entry.id === source.id);
    if (!item) { stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('가방에서 진열할 장비를 먼저 고르세요.') }); return; }
    if (quick) stallQuickList(runtime, item, slot);
    else stallStage(runtime, item, slot);
}

export function standFree(runtime, slot) {
    return Number.isInteger(slot) && slot >= 0 && slot < runtime.deps.PLAYER_STALL_RULES.slots && !runtime.deps.game.playerStall.listings.some(row => row.slot === slot);
}

export function stallStage(runtime, item, slot) {
    if (item.id !== runtime.state.view_selectedId || runtime.state.view_selectedListingId) resetDraft(runtime);
    runtime.state.view_selectedId = item.id; runtime.state.view_selectedListingId = null;
    runtime.state.view_pendingSlot = slot;
    runtime.state.view_message = (0, runtime.deps._t)('{value}번 칸: 가격을 적고 진열하세요.', { value: slot + 1 });
    stallRender(runtime, true);
    revealTerms(runtime);
}

export function stallQuickList(runtime, item, slot) {
    const currency = (item.id === runtime.state.view_selectedId && runtime.state.view_draftCurrency) || runtime.deps.itemAppraisal.quote(item).recommendedCurrency;
    const price = (item.id === runtime.state.view_selectedId && askValue(runtime, runtime.state.view_draftAsk)) || suggestedPrice(runtime, item, currency);
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const result = runtime.deps.playerStall.list(runtime.deps.game, item.id, price, now, { slot, currency, negotiate: runtime.state.view_draftNegotiate });
    if (result.ok) {
        runtime.state.view_selectedListingId = runtime.deps.game.playerStall.listings.find(row => row.item.id === item.id).id;
        runtime.state.view_selectedId = null; resetDraft(runtime);
        result.reason = (0, runtime.deps._t)('{value}번 칸에 진열했습니다. 가격은 바로 바꿀 수 있습니다.', { value: slot + 1 });
    }
    stallFinish(runtime, result, settled);
    revealTerms(runtime);
}

export function stallMoveListing(runtime, id, slot) {
    const result = runtime.deps.playerStall.moveListing(runtime.deps.game, id, slot);
    if (result.ok) { resetDraft(runtime); runtime.state.view_selectedId = null; runtime.state.view_selectedListingId = id; }
    stallFinish(runtime, result);
}

export function stallFinish(runtime, result, settled = false) {
    runtime.state.view_message = result.reason || '가판대를 정리했습니다.';
    if (result.ok || settled) { (0, runtime.deps.ensureCraftSelectionValid)(); (0, runtime.deps.saveGame)(); (0, runtime.deps.updateStaticUI)(); }
    stallRender(runtime, true);
}

export function list(runtime) {
    if (stallBlocked(runtime)) return;
    const terms = listingTerms(runtime);
    if (terms.reason) { stallFinish(runtime, { ok: false, reason: terms.reason }); return; }
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const result = runtime.deps.playerStall.list(runtime.deps.game, runtime.state.view_selectedId, terms.price, now, terms.placement);
    if (result.ok) {
        runtime.state.view_selectedListingId = runtime.deps.game.playerStall.listings.find(row => row.item.id === runtime.state.view_selectedId).id;
        runtime.state.view_selectedId = null; resetDraft(runtime);
        result.reason = '진열했습니다.';
    }
    stallFinish(runtime, result, settled);
}

export function withdraw(runtime, id, place = null) {
    if (stallBlocked(runtime)) return;
    const settled = stallSettleSales(runtime, runtime.deps.Date.now()) > 0, result = runtime.deps.playerStall.withdraw(runtime.deps.game, id, place);
    if (result.ok) {
        if (runtime.state.view_selectedListingId === id) { runtime.state.view_selectedListingId = null; resetDraft(runtime); }
        result.reason = '물건을 가방으로 회수했습니다.';
    }
    stallFinish(runtime, result, settled);
}

export function reprice(runtime, id) {
    if (stallBlocked(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-price-${id}`), price = askValue(runtime, input ? input.value : '');
    if (price === null) { stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('새 가격은 1~1,000,000 사이의 정수로 적어 주세요.') }); return; }
    const currency = runtime.deps.document.getElementById('stall-currency')?.value, now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find(entry => entry.id === id);
    if (!row) { stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('이미 판매되었거나 회수된 물건입니다.') }, settled); return; }
    if (row.price === price && row.currency === (currency || row.currency)) {
        runtime.state.view_draftAsk = ''; runtime.state.view_draftCurrency = '';
        stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('지금 가격 그대로입니다.') }, settled); return;
    }
    const hadOffer = !!row.offer, ok = runtime.deps.playerStall.reprice(runtime.deps.game, id, price, now, currency);
    if (ok) { runtime.state.view_draftAsk = ''; runtime.state.view_draftCurrency = ''; }
    stallFinish(runtime, { ok, reason: repriceMessage(runtime, ok, hadOffer) }, settled);
}

export function repriceMessage(runtime, ok, hadOffer) {
    if (!ok) return '가격을 바꾸지 못했습니다. 물건을 다시 확인해 주세요.';
    return hadOffer ? '가격을 바꿨습니다. 받아 둔 가격 제안은 취소됐습니다.' : '가격을 바꿨습니다. 잠시 뒤부터 새 가격으로 거래됩니다.';
}

export function negotiate(runtime, id, enabled) {
    if (stallBlocked(runtime)) return;
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const ok = runtime.deps.playerStall.setNegotiation(runtime.deps.game, id, enabled, now);
    stallFinish(runtime, { ok, reason: ok ? (enabled ? '손님의 다른 가격 제안을 받습니다.' : '표시한 가격으로만 판매합니다. 이전 제안은 취소됩니다.') : '진열품을 확인해 주세요.' }, settled);
}

export function respond(runtime, id, offerId, accept) {
    if (stallBlocked(runtime)) return;
    const now = runtime.deps.Date.now(), settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find(entry => entry.id === id), offer = row?.offer;
    const action = accept ? runtime.deps.playerStall.acceptOffer : runtime.deps.playerStall.rejectOffer;
    const result = action(runtime.deps.game, id, offerId, now);
    if (result.ok && accept && offer?.id === offerId) {
        announceSales(runtime, [{ name: row.item.name, price: offer.amount, currency: row.currency }], [{ key: row.currency, amount: offer.amount }]);
    }
    stallFinish(runtime, result, settled);
}

export function counter(runtime, id, offerId) {
    if (stallBlocked(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-counter-${offerId}`);
    if (!input) { stallFinish(runtime, { ok: false, reason: (0, runtime.deps._t)('이미 처리되었거나 기한이 지난 제안입니다.') }); return; }
    const amount = Number(input.value), now = runtime.deps.Date.now();
    const settled = stallSettleSales(runtime, now) > 0;
    const row = runtime.deps.game.playerStall.listings.find(entry => entry.id === id), item = row?.item, currency = row?.currency;
    const result = runtime.deps.playerStall.counterOffer(runtime.deps.game, { listingId: id, offerId, amount }, now);
    if (result.ok && item && !runtime.deps.game.playerStall.listings.includes(row)) {
        announceSales(runtime, [{ name: item.name, price: amount, currency }], [{ key: currency, amount }]);
    }
    stallFinish(runtime, result, settled);
}

export function collect(runtime) {
    if (stallBlocked(runtime, false)) return;
    const settled = stallSettleSales(runtime, runtime.deps.Date.now()) > 0;
    const funds = runtime.deps.playerStall.payouts(runtime.deps.game.playerStall);
    const gain = runtime.deps.playerStall.collect(runtime.deps.game);
    const reason = gain ? (0, runtime.deps._t)('{funds}개를 받았습니다.', { funds: (0, runtime.deps.formatCurrencyCosts)(funds) })
        : funds.length ? '재화 보유 한도를 넘어 받지 못했습니다. 판매 대금은 가판대에 남아 있습니다.' : '수령할 판매 대금이 없습니다.';
    stallFinish(runtime, { ok: gain > 0, reason }, settled);
}

export function stallSettleSales(runtime, now) {
    const result = runtime.deps.playerStall.settle(runtime.deps.game, now);
    if (result.paid > 0) announceSales(runtime, result.sold, result.gains);
    if (result.offers.length) announceOffers(runtime, result.offers);
    if (result.changed) stallRender(runtime);
    return result.paid;
}

export function announceSales(runtime, sold, gains) {
    runtime.deps.game.noti.items = true;
    const complete = gains.every(gain => sold.filter(event => event.currency === gain.key).reduce((sum, event) => sum + event.price, 0) === gain.amount);
    const goods = !complete ? '물건' : sold.length === 1 ? `[${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(sold[0].name))}]` : (0, runtime.deps._t)('물건 {length}개', { length: sold.length });
    (0, runtime.deps.addLog)((0, runtime.deps._t)('가판대 판매: {goods}, {gains}개. 거래 → 가판대에서 수령하세요.', { goods, gains: (0, runtime.deps.formatCurrencyCosts)(gains) }), 'loot-rare', { toast: true });
}

export function announceOffers(runtime, rows) {
    runtime.deps.game.noti.items = true;
    const detail = rows.length === 1 ? `[${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(rows[0].item.name))}]에 ${(0, runtime.deps.formatCurrencyCosts)([{ key: rows[0].currency, amount: rows[0].offer.amount }])}개` : (0, runtime.deps._t)('물건 {length}개', { length: rows.length });
    (0, runtime.deps.addLog)((0, runtime.deps._t)('가판대 가격 제안: {detail}. 가판대에서 수락하거나 거절할 수 있습니다.', { detail }), 'loot-rare', { toast: true });
}

export function changeCurrency(runtime, currency) {
    if (!runtime.deps.PLAYER_STALL_RULES.currencies.includes(currency) || !(inspectedListing(runtime) || selected(runtime))) return;
    runtime.state.view_draftAsk = '';
    runtime.state.view_draftCurrency = currency;
    stallRender(runtime, true);
}
