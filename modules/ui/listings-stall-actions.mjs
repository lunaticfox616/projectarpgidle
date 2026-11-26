/** 가판대 출품의 관리 명령(예전 가판대 화면의 것): 값 바꾸기, 제안 허용, 제안 수락과 거절, 역제안, 거래 재화 바꾸기. */
import { pickParts } from './listings-state.mjs';
import { busy, finish, settleSales, announceSales } from './listings-actions.mjs';
import { askValue } from './listings-stall.mjs';

function refused(runtime) {
    const reason = busy(runtime);
    if (reason) finish(runtime, { ok: false, reason });
    return !!reason;
}

function stallRow(runtime, id) { return runtime.deps.game.listings.rows.find(entry => entry.kind === 'stall' && entry.id === id); }

function repriceMessage(runtime, ok, hadOffer) {
    if (!ok) return runtime.deps._t('가격을 바꾸지 못했습니다. 물건을 다시 확인해 주세요.');
    return hadOffer ? runtime.deps._t('가격을 바꿨습니다. 받아 둔 가격 제안은 취소됐습니다.') : runtime.deps._t('가격을 바꿨습니다. 잠시 뒤부터 새 가격으로 거래됩니다.');
}

export function reprice(runtime, id) {
    if (refused(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-price-${id}`), price = askValue(runtime, input ? input.value : '');
    if (price === null) { finish(runtime, { ok: false, reason: runtime.deps._t('새 가격은 1~1,000,000 사이의 정수로 적어 주세요.') }); return; }
    const currency = runtime.deps.document.getElementById('stall-currency')?.value, now = runtime.deps.Date.now(), settled = settleSales(runtime, now) > 0;
    const row = stallRow(runtime, id);
    if (!row) { finish(runtime, { ok: false, reason: runtime.deps._t('이미 판매되었거나 회수된 물건입니다.') }, settled); return; }
    if (row.price === price && row.currency === (currency || row.currency)) {
        Object.assign(runtime.state, { draftAsk: '', draftCurrency: '' });
        finish(runtime, { ok: false, reason: runtime.deps._t('지금 가격 그대로입니다.') }, settled); return;
    }
    const hadOffer = !!row.offer, ok = runtime.deps.playerStall.reprice(runtime.deps.game, id, price, now, currency);
    if (ok) Object.assign(runtime.state, { draftAsk: '', draftCurrency: '' });
    finish(runtime, { ok, reason: repriceMessage(runtime, ok, hadOffer) }, settled);
}

export function negotiate(runtime, id, enabled) {
    if (refused(runtime)) return;
    const now = runtime.deps.Date.now(), settled = settleSales(runtime, now) > 0;
    const ok = runtime.deps.playerStall.setNegotiation(runtime.deps.game, id, enabled, now);
    const reason = !ok ? '진열품을 확인해 주세요.' : enabled ? '손님의 다른 가격 제안을 받습니다.' : '표시한 가격으로만 판매합니다. 이전 제안은 취소됩니다.';
    finish(runtime, { ok, reason: runtime.deps._t(reason) }, settled);
}

export function respond(runtime, id, offerId, accept) {
    if (refused(runtime)) return;
    const now = runtime.deps.Date.now(), settled = settleSales(runtime, now) > 0;
    const row = stallRow(runtime, id), offer = row?.offer;
    const action = accept ? runtime.deps.playerStall.acceptOffer : runtime.deps.playerStall.rejectOffer;
    const result = action(runtime.deps.game, id, offerId, now);
    if (result.ok && accept && offer?.id === offerId) {
        announceSales(runtime, [{ name: row.item.name, price: offer.amount, currency: row.currency }], [{ key: row.currency, amount: offer.amount }]);
    }
    finish(runtime, result, settled);
}

export function counter(runtime, id, offerId) {
    if (refused(runtime)) return;
    const input = runtime.deps.document.getElementById(`stall-counter-${offerId}`);
    if (!input) { finish(runtime, { ok: false, reason: runtime.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') }); return; }
    const amount = Number(input.value), now = runtime.deps.Date.now(), settled = settleSales(runtime, now) > 0;
    const row = stallRow(runtime, id), item = row?.item, currency = row?.currency;
    const result = runtime.deps.playerStall.counterOffer(runtime.deps.game, { listingId: id, offerId, amount }, now);
    if (result.ok && item && !runtime.deps.game.listings.rows.includes(row)) {
        announceSales(runtime, [{ name: item.name, price: amount, currency }], [{ key: currency, amount }]);
    }
    finish(runtime, { ...result, reason: runtime.deps._t(result.reason || '') }, settled);
}

/** The currency select changed: the new listing's or the chosen stall listing's price starts over in it. */
export function changeCurrency(runtime, currency) {
    const [kind] = pickParts(runtime.state.pick);
    if (!runtime.deps.PLAYER_STALL_RULES.currencies.includes(currency) || !['bag', 'listing'].includes(kind)) return;
    Object.assign(runtime.state, { draftAsk: '', draftCurrency: currency });
    runtime.api.render(true);
}
