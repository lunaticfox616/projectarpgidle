import { stallRulesRecord, stallRulesSell } from './stall-ledger.mjs';
import { stallRulesViewingInterest, stallRulesBuyerLimit } from './stall-appraisal.mjs';
import { stallRulesRandom } from './stall-clock.mjs';

export function stallRulesReleaseOffer(env, stall, row, at) {
    if (!row.offer) return;
    row.offer = null;
    stall.nextOfferAt = Math.max(stall.nextOfferAt, at + env.rules.offerCooldownMs);
}

export function stallRulesExpireOffers(env, stall, at) {
    for (const row of stall.listings) {
        if (!row.offer || row.offer.expiresAt > at) continue;
        const deadline = row.offer.expiresAt;
        stallRulesRecord(env, stall, { at: deadline, currency: row.currency, customer: env.deps.PLAYER_STALL_CUSTOMERS[row.offer.customerId].name,
            sold: false, reason: env.deps._t('{name} 가격 제안의 기한이 지났습니다.', { name: row.item.name }) });
        stallRulesReleaseOffer(env, stall, row, deadline);
    }
}

export function stallRulesProposalCandidate(env, entry) {
    const { row, value, fit } = entry;
    if (!row.negotiate || row.offer || row.price <= 1) return null;
    if (value.marketValue < env.deps.itemAppraisal.unitValue(row.currency)) return null;
    return { row, value, fit };
}

export function stallRulesPropose(env, stall, candidates, customerId, at) {
    if (at < stall.nextOfferAt) return false;
    const customer = env.deps.PLAYER_STALL_CUSTOMERS[customerId];
    const selected = candidates.map((...args) => stallRulesProposalCandidate(env, ...args)).filter(Boolean)
        .sort((a, b) => b.fit - a.fit || a.row.id - b.row.id)[0];
    if (!selected) return false;
    const { row, value, fit } = selected;
    const bargain = row.price <= value.fair ? env.rules.bargainOfferRate * row.price / value.fair : 1;
    const decision = Math.min(0.95, (0.35 + fit * 0.4) * value.demand * bargain * customer.offerRate);
    const probability = (1 - Math.pow(1 - decision, env.rules.visitMs / env.rules.decisionWindowMs))
        * stallRulesViewingInterest(env, row.price, value.fair, at - row.listedAt);
    if (stallRulesRandom(stall) >= probability) return false;
    const basis = Math.min(row.price, value.fair);
    // Partition one stored RNG draw: low bids do not reroll future visitors or accelerate sales.
    const roll = stallRulesRandom(stall);
    const lowball = env.rules.lowballOfferRate * customer.lowballRate;
    const ratio = roll < lowball
        ? env.rules.lowballOfferMin + (env.rules.lowballOfferMax - env.rules.lowballOfferMin) * roll / lowball
        : 0.65 + fit * 0.2 + 0.1 * (roll - lowball) / (1 - lowball);
    const limit = stallRulesBuyerLimit(value, fit, customer);
    const amount = Math.min(row.price - 1, limit, Math.max(1, Math.floor(basis * ratio)));
    row.offer = { id: ++stall.offerSequence, amount, customerId, createdAt: at, expiresAt: at + env.rules.offerLifetimeMs, buyerLimit: limit, negotiated: false };
    stall.nextOfferAt = at + env.rules.offerCooldownMs;
    stallRulesRecord(env, stall, { at, kind: 'offer', slot: row.slot, customerId, currency: row.currency, customer: customer.name, sold: false, reason: env.deps._t('{name}에 {name2} {amount}개를 제안했습니다.', { name: row.item.name, name2: env.deps._t(env.deps.ORB_DB[row.currency].name), amount }) });
    return true;
}

export function stallRulesResolveCounter(env, stall, row, amount, now) {
    const offer = row.offer, customer = env.deps.PLAYER_STALL_CUSTOMERS[offer.customerId];
    const value = env.deps.itemAppraisal.quote(row.item, row.currency), fit = env.deps.itemAppraisal.affinity(row.item, customer);
    const limit = Math.min(offer.buyerLimit, stallRulesBuyerLimit(value, fit, customer));
    const gap = (amount - offer.amount) / Math.max(1, limit - offer.amount);
    const acceptChance = amount <= limit ? Math.max(0.05, 0.85 - gap * (1 - customer.flexibility * 0.4)) : 0;
    const roll = stallRulesRandom(stall);
    if (roll < acceptChance) {
        const paid = stallRulesSell(env, stall, row, now, customer.name, amount);
        return { ok: paid > 0, reason: paid ? '손님이 역제안을 수락했습니다.' : '판매 대금을 먼저 수령해 주세요.' };
    }
    const finalAmount = Math.min(amount - 1, row.price - 1, limit, Math.floor(offer.amount + (limit - offer.amount) * customer.flexibility));
    if (finalAmount > offer.amount && roll < acceptChance + (1 - acceptChance) * customer.flexibility) {
        row.offer = { ...offer, id: ++stall.offerSequence, amount: finalAmount, negotiated: true };
        stallRulesRecord(env, stall, { at: now, kind: 'offer', slot: row.slot, customerId: offer.customerId, currency: row.currency, customer: customer.name,
            sold: false, reason: env.deps._t('{name}에 {name2} {finalAmount}개를 마지막으로 제안했습니다.', { name: row.item.name, name2: env.deps._t(env.deps.ORB_DB[row.currency].name), finalAmount }) });
        return { ok: true, reason: env.deps._t('손님이 마지막 가격을 제안했습니다.') };
    }
    stallRulesReleaseOffer(env, stall, row, now);
    stallRulesRecord(env, stall, { at: now, customer: customer.name, sold: false, reason: env.deps._t('역제안을 듣고 손님이 떠났습니다.') });
    return { ok: true, reason: env.deps._t('손님이 떠났습니다. 물건은 계속 진열됩니다.') };
}
