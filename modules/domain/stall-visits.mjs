import { stallRulesRandom, stallRulesReadyAt, stallRulesVisitDelay, stallRulesStallClock } from './stall-clock.mjs';
import { stallRulesSell, stallRulesRecord } from './stall-ledger.mjs';
import { stallRulesPurchaseChance, stallRulesAppraiseListings } from './stall-appraisal.mjs';
import { stallRulesPropose, stallRulesExpireOffers } from './stall-offers.mjs';
import { stallRulesValidClock, stallRulesUnlocked } from './stall-access.mjs';

export function stallRulesVisit(env, stall, at, appraisals) {
    const customerId = Math.floor(stallRulesRandom(stall) * env.deps.PLAYER_STALL_CUSTOMERS.length);
    const customer = env.deps.PLAYER_STALL_CUSTOMERS[customerId];
    const candidates = appraisals.filter(entry => stall.listings.includes(entry.row) && at >= stallRulesReadyAt(env, entry.row))
        .map(entry => ({ row: entry.row, value: entry.value, fit: entry.fits[customerId],
            chance: stallRulesPurchaseChance(env, entry.value, entry.row.price, entry.fits[customerId], at - entry.row.listedAt, customer) }))
        .sort((a, b) => b.chance - a.chance || a.row.id - b.row.id);
    const candidate = candidates.find(entry => entry.chance > 0);
    if (!candidate || stallRulesRandom(stall) >= candidate.chance) {
        if (stallRulesPropose(env, stall, candidates, customerId, at)) return 0;
        stallRulesRecord(env, stall, { at, kind: 'visit', customerId, slot: candidates[0]?.row.slot, nextSlot: candidates[1]?.row.slot,
            customer: customer.name, sold: false, reason: env.deps._t('물건을 둘러보고 떠났습니다.') });
        return 0;
    }
    return stallRulesSell(env, stall, candidate.row, at, customer.name, candidate.row.price);
}

export function stallRulesBargainHeat(env, entry, at) {
    const { row, value } = entry;
    if (at < stallRulesReadyAt(env, row) || value.demand < env.rules.crowdMinDemand || row.price > value.ceiling) return 0;
    if (value.marketValue < env.rules.crowdMinMarketValue || Math.max(...entry.fits) < env.rules.crowdMinFit) return 0;
    return Math.max(0, 1 - row.price / value.fair / env.rules.crowdPriceRatio);
}

export function stallRulesArrival(env, stall, at, appraisals) {
    stallRulesExpireOffers(env, stall, at);
    const heat = Math.max(0, ...appraisals.filter(entry => stall.listings.includes(entry.row)).map(entry => stallRulesBargainHeat(env, entry, at)));
    let visitors = 1;
    if (heat > 0) {
        const probability = env.rules.crowdBaseChance + heat * env.rules.crowdDiscountChance, roll = stallRulesRandom(stall);
        if (roll < probability) visitors = 2 + Math.floor(roll / probability * (env.rules.maxCrowd - 1));
    }
    if (visitors > 1) stallRulesRecord(env, stall, { at, kind: 'crowd', visitors, customer: '몰려든 손님들', sold: false,
        reason: env.deps._t('가격표를 본 손님 {visitors}명이 한꺼번에 가판대 앞으로 모여들었습니다.', { visitors }) });
    let paid = 0;
    for (let index = 0; index < visitors; index++) paid += stallRulesVisit(env, stall, at, appraisals);
    return paid;
}

export function stallRulesFinishVisits(env, stall, now, end) {
    stall.lastAt = now;
    stallRulesExpireOffers(env, stall, now);
    if (!stall.listings.length) stall.nextVisitAt = 0;
    // Discard excess absence once. Never replay the capped tail on reload.
    else if (now > end) stall.nextVisitAt = now + stallRulesVisitDelay(env, stall);
}

export function stallRulesAdvance(env, owner, now) {
    const stall = owner.playerStall;
    if (!stallRulesValidClock(now) || owner.isBackgroundCalculation) return 0;
    const clock = stallRulesStallClock(stall, now);
    if (clock === stall.lastAt) return 0;
    if (!stall.lastAt || !stallRulesUnlocked(env, owner)) {
        stall.lastAt = clock; stall.nextVisitAt = stall.listings.length ? clock + stallRulesVisitDelay(env, stall) : 0;
        return 0;
    }
    const end = Math.min(clock, stall.lastAt + env.rules.offlineLimitMs);
    const first = Math.max(stall.nextVisitAt, stall.lastAt + 1);
    const appraisals = first <= end ? stallRulesAppraiseListings(env, stall) : [];
    let paid = 0;
    for (let at = first; at <= end && stall.listings.length; at = stall.nextVisitAt) {
        paid += stallRulesArrival(env, stall, at, appraisals);
        stall.nextVisitAt = at + stallRulesVisitDelay(env, stall);
    }
    stallRulesFinishVisits(env, stall, clock, end);
    return paid;
}
