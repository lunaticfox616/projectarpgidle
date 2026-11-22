/**
 * 경매장(거래 창의 넷째 칸, 루프 20 해금 'auction') 규칙의 단일 소유자. 저장은 owner.auction(modules/state/default-game.mjs), 수치는
 * modules/data/auction-house.mjs. 입찰은 없고 모두 즉시 체결된다: 상인 장비 매물 구매, 재료 매매, 내 장비 출품(상인 수요가 구간마다 산다).
 * 타이머를 두지 않는다: 부르는 쪽이 벽시계(UTC ms)를 넘기고, 명령은 먼저 시계를 그 시각으로 옮긴다(advance). 화면과 서버 시세 서비스는
 * 이 API만 쓴다. 생성기(function*) 명령은 효과를 { kind, args }로 내고 classic 어댑터(modules/auction-house-classic.mjs)가 처리한다.
 * 세션 상태(env.session: 운영 모드; env.lotCache: 이번 구간 매물)는 저장하지 않는다. 서버 시세 보정은 다음 구간 것으로 저장에 남는다(owner.auction.delta).
 */
import { AUCTION_HOUSE } from '../data/auction-house.mjs';
import { auctionFactor, auctionPulse, auctionEventAt, auctionItemFamily, auctionSetPulseDelta, auctionSetMode, auctionPulseKeys, auctionFamilyLabel } from './auction-pulse.mjs';
import { auctionBucketOf, auctionNeedsAdvance, auctionAdvance, auctionUseBlock, auctionNoticeText, auctionLotName, auctionLoopBlockReason } from './auction-clock.mjs';
import { auctionMaterialRows, auctionMaterialQuote, auctionMaterialTrade } from './auction-materials.mjs';
import { auctionGearLots, auctionBuyGearLot, auctionGearLotReason } from './auction-gear-lots.mjs';
import { auctionListIssue, auctionListQuote, auctionList, auctionWithdraw, auctionClaim, auctionClaimAll } from './auction-my-lots.mjs';
import { auctionRestore } from './auction-restore.mjs';

/**
 * deps: contentProgression, itemAppraisal (quote, unitValue), playerStall (listBlockReason), getZone, the generator primitives
 * (levelProgression, rollRealmItemDropTier, getRealmEquipmentAffixTierCap, getDroppedAffixTierRange, EQUIPMENT_DROP_SLOTS, chooseItemBase,
 * UNIQUE_DB, BASE_ITEM_DB, UNIQUE_EQUIPMENT_RULES, generateUniqueItem (the black market's uniques), boostExceptionalBaseLine, equipmentSockets, MOD_DB,
 * EQUIPMENT_DROP_VARIANTS, getAffixTierRange (variants),
 * createItemFromBase, maybeApplyExceptionalBase, DROPPED_AFFIX_TIER_WEIGHT_FALLOFF), getItemCraftTier, getItemDisplayName, readItemIdCounter, writeItemIdCounter, canStoreEquipmentItems(items, owner), normalizeItem, escapeHTML, console, ORB_DB, _t,
 * defaultGame, PLAYER_STALL_RULES, STAT_AFFIX_TAGS, AFFIX_TAG_LABELS, getEquipmentLoadoutOwnedItems, actExplorationLoot, actExplorationState.
 */
export function createAuctionHouse(deps) {
    const env = { deps, session: { mode: AUCTION_HOUSE.defaultMode }, lotCache: { key: '', lots: [] } };
    return Object.freeze({
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
        materialTrade: (owner, order, now) => auctionMaterialTrade(env, owner, order, now),
        gearLots: owner => auctionGearLots(env, owner),
        buyGearLot: (owner, lotId, now) => auctionBuyGearLot(env, owner, lotId, now),
        /** Why lot (a row of gearLots) cannot be bought now, or '': the reason buyGearLot would give, for the screen's buy button. */
        gearLotIssue: (owner, lot) => auctionUseBlock(env, owner) || auctionGearLotReason(env, owner, lot),
        listIssue: (owner, item) => auctionListIssue(env, owner, item),
        listQuote: (owner, item) => auctionListQuote(env, owner, item),
        list: (owner, itemId, ask, now) => auctionList(env, owner, itemId, ask, now),
        withdraw: (owner, lotId, now) => auctionWithdraw(env, owner, lotId, now),
        claim: (owner, lotId) => auctionClaim(env, owner, lotId),
        claimAll: owner => auctionClaimAll(env, owner),
        loopBlockReason: owner => auctionLoopBlockReason(env, owner),
        restore: owner => auctionRestore(env, owner)
    });
}
