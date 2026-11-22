/**
 * 경매장(거래 창의 넷째 칸, 루프 20 해금 'auction') 규칙의 단일 소유자. 저장은 owner.auction(modules/state/default-game.mjs), 수치는
 * modules/data/auction-house.mjs. 입찰은 없고 모두 즉시 체결된다: 상인 매물(장비, 주얼, 액막이, 부적) 구매, 재료 매매, 내 장비 출품(상인 수요가 구간마다 산다).
 * 타이머를 두지 않는다: 부르는 쪽이 벽시계(UTC ms)를 넘기고, 명령은 먼저 시계를 그 시각으로 옮긴다(advance). 화면과 서버 시세 서비스는
 * 이 API만 쓴다. 생성기(function*) 명령은 효과를 { kind, args }로 내고 classic 어댑터(modules/auction-house-classic.mjs)가 처리한다.
 * 세션 상태(env.session: 운영 모드; env.lotCache: 매물 묶음의 머리와 굴린 몸; env.contentCache, env.contentPools: 콘텐츠 고유 매물과 파는 고유; env.uniquePools: 티어마다의 암거래상 고유; env.warmPlan: 미리 굴릴 매물 목록;
 * env.searchStats, env.searchNames: 검색이 아는 능력치와 이름)는 저장하지 않는다. 서버 시세 보정은 다음 구간 것으로 저장에 남는다(owner.auction.deltas).
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionFactor, auctionPulse, auctionEventAt, auctionItemFamily, auctionSetPulseDelta, auctionSetMode, auctionPulseKeys, auctionFamilyLabel } from './auction-pulse.mjs';
import { auctionBucketOf, auctionNeedsAdvance, auctionAdvance, auctionUseBlock, auctionNoticeText, auctionLotName, auctionLoopBlockReason } from './auction-clock.mjs';
import { auctionMaterialRows, auctionMaterialQuote, auctionMaterialTrade, auctionMaterialBook, auctionMaterialPriceHistory } from './auction-materials.mjs';
import { auctionBuyGearLot, auctionGearLotReason, auctionLotAt } from './auction-gear-lots.mjs';
import { auctionLotHeads, auctionRecentHeads, auctionWarmLots, auctionDropLots } from './auction-lot-list.mjs';
import { auctionOpenKinds } from './auction-kind-lots.mjs';
import { auctionListIssue, auctionListQuote, auctionList, auctionWithdraw, auctionClaim, auctionClaimAll } from './auction-my-lots.mjs';
import { auctionRestore } from './auction-restore.mjs';
import { auctionSearchApi } from './auction-search-query.mjs';

/**
 * deps: contentProgression, itemAppraisal (quote, unitValue), playerStall (listBlockReason), getZone, the generator primitives
 * (levelProgression, rollRealmItemDropTier, getRealmEquipmentAffixTierCap, getDroppedAffixTierRange, EQUIPMENT_DROP_SLOTS, chooseItemBase,
 * UNIQUE_DB, BASE_ITEM_DB, UNIQUE_EQUIPMENT_RULES, generateUniqueItem (the black market's uniques), boostExceptionalBaseLine, equipmentSockets, MOD_DB,
 * EQUIPMENT_DROP_VARIANTS, getAffixTierRange (variants),
 * createItemFromBase, maybeApplyExceptionalBase, DROPPED_AFFIX_TIER_WEIGHT_FALLOFF), getItemCraftTier, getItemDisplayName, readItemIdCounter, writeItemIdCounter, canStoreEquipmentItems(items, owner), normalizeItem, escapeHTML, console, ORB_DB, _t,
 * defaultGame, PLAYER_STALL_RULES, STAT_AFFIX_TAGS, AFFIX_TAG_LABELS, getEquipmentLoadoutOwnedItems, actExplorationLoot, actExplorationState,
 * the other kinds of merchant lots (generateJewelDrop, bagItems, colonyWards, talismans, stumpBox, CONTENT_UNLOCK_CATALOG), the clear records of the
 * content unique lots (ATLAS_ENDGAME, COSMOS_ROUTE_GALAXIES), the line tables the
 * search knows stats from (JEWEL_OPTION_POOL, COLONY_WARD_POOL, TALISMAN_STAT_POOL). The search calls (auctionSearchApi) are added to the facade
 * as plain values, so the mode getter stays a getter.
 */
export function createAuctionHouse(deps) {
    const env = { deps, session: { mode: AUCTION_HOUSE.defaultMode }, lotCache: new Map(), contentCache: new Map(), uniquePools: new Map(), warmPlan: null };
    return Object.freeze(Object.assign({
        rules: AUCTION_HOUSE,
        isUnlocked: owner => deps.contentProgression.isUnlocked('auction', owner),
        /** Whether the section opens and the tick settles: unlocked, or lots are left (so a loop is never blocked by lots out of reach).
         * Buying, material trades and new listings still need the unlock (useBlock). */
        canOpen: owner => deps.contentProgression.isUnlocked('auction', owner) || (Array.isArray(owner?.auction?.lots) && owner.auction.lots.length > 0),
        useBlock: owner => auctionUseBlock(env, owner),
        bucketOf: auctionBucketOf,
        needsAdvance: auctionNeedsAdvance,
        advance: (owner, now) => auctionAdvance(env, owner, now),
        noticeText: row => auctionNoticeText(env, row),
        /** A lot's saved Korean name as the player's language shows it (the notice and the sold stand). */
        lotName: name => auctionLotName(env, name),
        pulseKeys: auctionPulseKeys,
        /** The price factor of key in bucket for owner (with owner's saved server correction when it is for that bucket). */
        factor: (owner, key, bucket) => auctionFactor(owner.auction, key, bucket),
        event: auctionEventAt,
        pulse: owner => auctionPulse(owner),
        /** Saves the server correction fetched during bucket for bucket + 1 in owner (never changes the current bucket's prices). */
        setPulseDelta: (owner, bucket, values) => auctionSetPulseDelta(owner, bucket, values),
        get mode() { return env.session.mode; },
        setMode: mode => auctionSetMode(env, mode),
        itemFamily: item => auctionItemFamily(env, item),
        /** A family's Korean name (its affix tag's label); the screen translates it. */
        familyLabel: family => auctionFamilyLabel(env, family),
        materials: owner => auctionMaterialRows(env, owner),
        materialQuote: (owner, key, side, count) => auctionMaterialQuote(env, owner, key, side, count),
        /** This bucket's book of key for owner: { buy, sell }, each [{ mult, size, left, price }] (price: one bundle at that step, sale before the fee). */
        materialBook: (owner, key) => auctionMaterialBook(owner, key),
        /** One bundle's first-step buy cost of key over the last pulse.history buckets, oldest first. */
        materialPrices: (owner, key) => auctionMaterialPriceHistory(owner, key),        materialTrade: (owner, order, now) => auctionMaterialTrade(env, owner, order, now),
        /** The merchant lots listed at now (UTC ms; read at max(now, lastAt)) as heads only: id, kind, rarity, slot, times, phase, boughtByMe, warm. */
        lotHeads: (owner, now) => auctionLotHeads(env, owner, now),
        /** Merchant lot lotId priced at now (its body rolled when missing), with its phase; null outside the list's batches. */
        lot: (owner, lotId, now) => auctionLotAt(env, owner, lotId, now),
        /** Rolls missing bodies of the listed lots and recent trades (prefer first) until stop() says stop: { done, total, heads, preferred }. dropLots forgets them. */
        warmLots: (owner, now, options) => auctionWarmLots(env, owner, now, options), dropLots: () => auctionDropLots(env),
        /** The lot kinds owner can see and buy: 'gear', then each unlocked kind of rules.kinds.lots in its order. */
        lotKinds: owner => [...auctionOpenKinds(env, owner)],
        /** The merchant lots sold to someone else by now, newest first, as head views (lotHeads' shape). */
        recentHeads: (owner, now) => auctionRecentHeads(env, owner, now),
        buyGearLot: (owner, lotId, now) => auctionBuyGearLot(env, owner, lotId, now),
        /** Why lot (a priced lot) cannot be bought now, or '': the reason buyGearLot would give, for the screen's buy button. */
        gearLotIssue: (owner, lot) => auctionUseBlock(env, owner) || auctionGearLotReason(env, owner, lot),
        listIssue: (owner, item) => auctionListIssue(env, owner, item),
        listQuote: (owner, item) => auctionListQuote(env, owner, item),
        list: (owner, itemId, ask, now) => auctionList(env, owner, itemId, ask, now),
        withdraw: (owner, lotId, now) => auctionWithdraw(env, owner, lotId, now),
        claim: (owner, lotId) => auctionClaim(env, owner, lotId),
        claimAll: owner => auctionClaimAll(env, owner),
        loopBlockReason: owner => auctionLoopBlockReason(env, owner),
        restore: owner => auctionRestore(env, owner)
    }, auctionSearchApi(env)));
}
