/**
 * 출품(game.listings, 2026-11-26)의 단일 소유자: 진열대 칸(modules/domain/listing-rows.mjs), 정산함(collect), 루프 막기, 불러올 때의 복원
 * (modules/domain/listing-restore.mjs). 가판대 종류(kind 'stall')의 손님 규칙도 여기 있다. 경매장 종류(kind 'auction')의 출품, 회수, 상인 수요는
 * 경매장 규칙(modules/domain/auction-my-lots.mjs, auction-demand.mjs)이 같은 저장에 쓴다. 전역 이름 playerStall은 옛 이름 그대로다.
 *
 * Escrow and deterministic NPC visits, independent of combat speed and loot bonuses.
 * owner.listings: rows own their items exclusively; proceeds maps each currency to its integer unclaimed balance (stall and auction sales).
 * row.currency defines the integer units of row.price and row.offer.amount; missing legacy currency means dew.
 * advance/collect return a reporting-only dew equivalent. Stored currencies remain integers.
 * lastAt is a monotonic wall-clock watermark (UTC ms); nextVisitAt and rng survive reloads.
 * Arrivals are irregular; a crowd is 2..rules.maxCrowd sequential visitors at the same UTC ms.
 * Appraisals live only inside one synchronous settlement, never in saved state or across price edits.
 * Each visitor buys independently within the appraisal ceiling, without an accumulated shop-wide budget.
 * Pending offers never block buy-now purchases; whichever transaction sells the item first invalidates the others.
 * Legacy listings keep their negotiation opt-in. Listing age in ms increases interest up to matureAgeMs.
 * row.slot is the persistent physical display position on the one shelf (integer 0..slotMax-1), independent of listing order.
 * priceChangedAt is UTC ms; repricing preserves listedAt and adds a short independent exposure delay.
 * sales contains read-only sold-item snapshots, never inventory or collectible currency.
 * @typedef {{id:number, amount:number, customerId:number, createdAt:number, expiresAt:number, buyerLimit:number, negotiated:boolean}} StallOffer
 */
import { stallRulesUnlocked, stallRulesEligible, stallRulesListBlockReason } from './stall-access.mjs';
import { stallRulesChance } from './stall-appraisal.mjs';
import { stallRulesAdvance } from './stall-visits.mjs';
import { stallRulesSettle } from './stall-settlement.mjs';
import { stallRulesPayouts, stallRulesCollect, stallRulesLoopBlockReason } from './stall-ledger.mjs';
import { stallRulesList, stallRulesMoveListing, stallRulesWithdraw, stallRulesReprice, stallRulesSetNegotiation } from './stall-listings.mjs';
import { listingRestore } from './listing-restore.mjs';
import { stallRulesAcceptOffer, stallRulesRejectOffer, stallRulesCounterOffer } from './stall-negotiation.mjs';
import { listingCapacity, listingShelfBlock, listingSlotMax } from './listing-rows.mjs';

/** The owner supplies escrow, saved RNG, and clocks. Appraisals last for one settlement only;
 * the service never polls time, creates timers, or reads the current browser save. */
export function createPlayerStall(deps) {
    const env = { deps };
    env.rules = env.deps.PLAYER_STALL_RULES;
    env.FLAG_REASONS = [['locked', '잠근 장비입니다.'], ['loopSealed', '봉인한 장비입니다.'], ['tradeLocked', '거래할 수 없는 장비입니다.'],
        ['hallReplica', '거래할 수 없는 장비입니다.'], ['hallRelistBlocked', '거래할 수 없는 장비입니다.']];
    return Object.freeze({
        slotMax: listingSlotMax(env.rules),
        /** The places owner may fill now (4 with the market unlock, 3 more with the auction unlock). */
        capacity: owner => listingCapacity(env.deps, owner),
        /** Why owner cannot put up another listing of any kind, or ''. */
        shelfBlock: owner => listingShelfBlock(env.deps, owner),
        unlocked: (...args) => stallRulesUnlocked(env, ...args),
        eligible: (...args) => stallRulesEligible(env, ...args),
        listBlockReason: (...args) => stallRulesListBlockReason(env, ...args),
        chance: (...args) => stallRulesChance(env, ...args),
        advance: (...args) => stallRulesAdvance(env, ...args),
        settle: (...args) => stallRulesSettle(env, ...args),
        payouts: (...args) => stallRulesPayouts(env, ...args),
        list: (...args) => stallRulesList(env, ...args),
        moveListing: (...args) => stallRulesMoveListing(env, ...args),
        withdraw: (...args) => stallRulesWithdraw(env, ...args),
        reprice: (...args) => stallRulesReprice(env, ...args),
        collect: (...args) => stallRulesCollect(env, ...args),
        loopBlockReason: (...args) => stallRulesLoopBlockReason(env, ...args),
        restore: owner => listingRestore(env, owner),
        acceptOffer: (...args) => stallRulesAcceptOffer(env, ...args),
        rejectOffer: (...args) => stallRulesRejectOffer(env, ...args),
        counterOffer: (...args) => stallRulesCounterOffer(env, ...args),
        setNegotiation: (...args) => stallRulesSetNegotiation(env, ...args)
    });
}
