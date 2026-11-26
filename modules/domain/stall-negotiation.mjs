import { stallRulesValidPrice, stallRulesCanManage, stallRulesUnlocked, stallRulesValidClock, stallRulesRow } from './stall-access.mjs';
import { stallRulesResolveCounter, stallRulesReleaseOffer } from './stall-offers.mjs';
import { stallRulesStallClock } from './stall-clock.mjs';
import { stallRulesAdvance } from './stall-visits.mjs';
import { stallRulesSell, stallRulesRecord } from './stall-ledger.mjs';

/** One counter per offer. Invalid/stale actions cannot draw RNG; refusal and a final bid consume the opportunity. */
export function stallRulesCounterOffer(env, owner, request, now) {
    const { listingId, offerId, amount } = request;
    const refusal = stallRulesCounterRefusal(env, stallRulesRow(owner.listings, listingId), offerId, amount);
    if (refusal) return { ok: false, reason: refusal };
    const live = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!live) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    if (!Number.isSafeInteger((owner.listings.proceeds[live.currency] || 0) + amount)) return { ok: false, reason: env.deps._t('판매 대금을 먼저 수령해 주세요.') };
    return stallRulesResolveCounter(env, owner.listings, live, amount, stallRulesStallClock(owner.listings, now));
}

/** Why a counter of amount to offer offerId on row cannot be made, or '' (no clock, no RNG). */
export function stallRulesCounterRefusal(env, row, offerId, amount) {
    const original = row ? row.offer : null;
    if (!original || original.id !== offerId || original.negotiated) return env.deps._t('역제안할 수 없는 제안입니다.');
    return !stallRulesValidPrice(env, amount) || amount <= original.amount || amount > row.price ? env.deps._t('손님의 제안보다 높고 희망가 이하인 정수를 입력하세요.') : '';
}

/** Settle wall time once at this transaction boundary, then resolve the exact still-live proposal. */
export function stallRulesActionableOffer(env, owner, listingId, offerId, now) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner) || !stallRulesValidClock(now)) return null;
    const row = stallRulesRow(owner.listings, listingId);
    const offer = row?.offer;
    if (!offer || offer.id !== offerId) return null;
    const clock = stallRulesStallClock(owner.listings, now);
    stallRulesAdvance(env, owner, clock);
    return owner.listings.rows.includes(row) && row.offer === offer && offer.expiresAt > clock ? row : null;
}

export function stallRulesAcceptOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    const offer = row.offer;
    if (offer.amount >= row.price || offer.amount > env.deps.itemAppraisal.quote(row.item, row.currency).ceiling) return { ok: false, reason: env.deps._t('제안의 금액을 확인해 주세요.') };
    const paid = stallRulesSell(env, owner.listings, row, stallRulesStallClock(owner.listings, now), env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId].name, offer.amount);
    return { ok: paid > 0, reason: paid ? env.deps._t('제안을 수락했습니다. 판매 대금에 {name} {amount}개가 적립되었습니다.', { name: env.deps._t(env.deps.ORB_DB[row.currency].name), amount: offer.amount }) : '판매 대금을 먼저 수령해 주세요.' };
}

export function stallRulesRejectOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    const clock = stallRulesStallClock(owner.listings, now);
    stallRulesRecord(env, owner.listings, { at: clock, currency: row.currency, customer: env.deps.PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
        sold: false, reason: env.deps._t('{name}의 가격 제안을 거절했습니다.', { name: row.item.name }) });
    stallRulesReleaseOffer(env, owner.listings, row, clock);
    return { ok: true, reason: env.deps._t('제안을 거절했습니다. 물건은 계속 진열됩니다.') };
}
