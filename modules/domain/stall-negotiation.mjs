import { stallRulesValidPrice, stallRulesBankKey, stallRulesCanManage, stallRulesUnlocked, stallRulesValidClock } from './stall-access.mjs';
import { stallRulesResolveCounter, stallRulesReleaseOffer } from './stall-offers.mjs';
import { stallRulesStallClock } from './stall-clock.mjs';
import { stallRulesAdvance } from './stall-visits.mjs';
import { stallRulesSell, stallRulesRecord } from './stall-ledger.mjs';

/** One counter per offer. Invalid/stale actions cannot draw RNG; refusal and a final bid consume the opportunity. */
export function stallRulesCounterOffer(env, owner, request, now) {
    const { listingId, offerId, amount } = request;
    const original = owner.playerStall.listings.find(entry => entry.id === listingId)?.offer;
    if (!original || original.id !== offerId || original.negotiated) return { ok: false, reason: env.deps._t('역제안할 수 없는 제안입니다.') };
    const row = owner.playerStall.listings.find(entry => entry.id === listingId);
    if (!stallRulesValidPrice(env, amount) || amount <= original.amount || amount > row.price) return { ok: false, reason: env.deps._t('손님의 제안보다 높고 희망가 이하인 정수를 입력하세요.') };
    const live = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!live) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    if (!Number.isSafeInteger(owner.playerStall[stallRulesBankKey(env, live.currency)] + amount)) return { ok: false, reason: env.deps._t('판매 대금을 먼저 수령해 주세요.') };
    return stallRulesResolveCounter(env, owner.playerStall, live, amount, stallRulesStallClock(owner.playerStall, now));
}

/** Settle wall time once at this transaction boundary, then resolve the exact still-live proposal. */
export function stallRulesActionableOffer(env, owner, listingId, offerId, now) {
    if (!stallRulesCanManage(owner) || !stallRulesUnlocked(env, owner) || !stallRulesValidClock(now)) return null;
    const row = owner.playerStall.listings.find(entry => entry.id === listingId);
    const offer = row?.offer;
    if (!offer || offer.id !== offerId) return null;
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesAdvance(env, owner, clock);
    return owner.playerStall.listings.includes(row) && row.offer === offer && offer.expiresAt > clock ? row : null;
}

export function stallRulesAcceptOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    const offer = row.offer;
    if (offer.amount >= row.price || offer.amount > env.deps.itemAppraisal.quote(row.item, row.currency).ceiling) return { ok: false, reason: env.deps._t('제안의 금액을 확인해 주세요.') };
    const paid = stallRulesSell(env, owner.playerStall, row, stallRulesStallClock(owner.playerStall, now), env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId].name, offer.amount);
    return { ok: paid > 0, reason: paid ? env.deps._t('제안을 수락했습니다. 판매 대금에 {name} {amount}개가 적립되었습니다.', { name: env.deps._t(env.deps.ORB_DB[row.currency].name), amount: offer.amount }) : '판매 대금을 먼저 수령해 주세요.' };
}

export function stallRulesRejectOffer(env, owner, listingId, offerId, now) {
    const row = stallRulesActionableOffer(env, owner, listingId, offerId, now);
    if (!row) return { ok: false, reason: env.deps._t('이미 처리되었거나 기한이 지난 제안입니다.') };
    const clock = stallRulesStallClock(owner.playerStall, now);
    stallRulesRecord(env, owner.playerStall, { at: clock, currency: row.currency, customer: env.deps.PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
        sold: false, reason: env.deps._t('{name}의 가격 제안을 거절했습니다.', { name: row.item.name }) });
    stallRulesReleaseOffer(env, owner.playerStall, row, clock);
    return { ok: true, reason: env.deps._t('제안을 거절했습니다. 물건은 계속 진열됩니다.') };
}
