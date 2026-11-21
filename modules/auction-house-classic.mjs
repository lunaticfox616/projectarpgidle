import { createAuctionHouse } from './domain/auction-house.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

// 경매장 규칙(modules/domain/auction-house.mjs)을 전역 auctionHouse 하나로 잇는다. 생성기 명령의 효과(재화 지급, 아이템 번호, 가방에 넣기)는
// 지금 게임(game)에 적용되므로 그 명령은 지금 게임만 받는다. tick은 전투 틱과 시작할 때 부른다(modules/application/foreground-loop.mjs, startup.mjs).
const auctionHouse = (() => {
    const rules = createAuctionHouse({
        get contentProgression() { return contentProgression; },
        get itemAppraisal() { return itemAppraisal; },
        get playerStall() { return playerStall; },
        get getZone() { return getZone; },
        get levelProgression() { return levelProgression; },
        get rollRealmItemDropTier() { return rollRealmItemDropTier; },
        get getRealmEquipmentAffixTierCap() { return getRealmEquipmentAffixTierCap; },
        get getDroppedAffixTierRange() { return getDroppedAffixTierRange; },
        get getEquipmentDropSlot() { return getEquipmentDropSlot; },
        get chooseItemBase() { return chooseItemBase; },
        get createItemFromBase() { return createItemFromBase; },
        get maybeApplyExceptionalBase() { return maybeApplyExceptionalBase; },
        get DROPPED_AFFIX_TIER_WEIGHT_FALLOFF() { return DROPPED_AFFIX_TIER_WEIGHT_FALLOFF; },
        get getItemCraftTier() { return getItemCraftTier; },
        readItemIdCounter: () => window.GameModules.state.session.itemIdCounter,
        writeItemIdCounter: value => { window.GameModules.state.session.itemIdCounter = value; },
        get canStoreEquipmentItems() { return canStoreEquipmentItems; },
        get normalizeItem() { return normalizeItem; },
        get escapeHTML() { return escapeHTML; },
        get console() { return console; },
        get ORB_DB() { return ORB_DB; },
        get _t() { return _t; },
        get defaultGame() { return defaultGame; },
        get PLAYER_STALL_RULES() { return PLAYER_STALL_RULES; },
        get STAT_AFFIX_TAGS() { return STAT_AFFIX_TAGS; },
        get getEquipmentLoadoutOwnedItems() { return getEquipmentLoadoutOwnedItems; },
        get actExplorationLoot() { return actExplorationLoot; },
        get actExplorationState() { return actExplorationState; }
    });
    const effects = {
        auctionGrantCurrency: (key, amount) => awardCurrency(key, amount),
        auctionAllocateItemId: () => ++window.GameModules.state.session.itemIdCounter,
        auctionStowItem: item => stowBoughtItem(item)
    };
    const live = owner => {
        if (owner !== game) throw new Error('auctionHouse: commands with effects take the current game');
        return owner;
    };
    const run = commands => consumeDomainCommands(commands, effects);
    const idle = Object.freeze({ ok: true, bucketChanged: false, settled: [] });
    return Object.freeze({
        rules: rules.rules,
        isUnlocked: rules.isUnlocked, useBlock: rules.useBlock, bucketOf: rules.bucketOf, needsAdvance: rules.needsAdvance,
        advance: rules.advance, noticeText: rules.noticeText, pulseKeys: rules.pulseKeys, factor: rules.factor, event: rules.event,
        pulse: rules.pulse, setPulseDelta: rules.setPulseDelta, get mode() { return rules.mode; }, setMode: rules.setMode,
        itemFamily: rules.itemFamily, materials: rules.materials, materialQuote: rules.materialQuote,
        materialTrade: (owner, order, now) => run(rules.materialTrade(live(owner), order, now)),
        gearLots: rules.gearLots, gearLotIssue: rules.gearLotIssue,
        buyGearLot: (owner, lotId, now) => run(rules.buyGearLot(live(owner), lotId, now)),
        listIssue: rules.listIssue, listQuote: rules.listQuote,
        list: rules.list, withdraw: rules.withdraw,
        claim: (owner, lotId) => run(rules.claim(live(owner), lotId)),
        claimAll: owner => run(rules.claimAll(live(owner))),
        loopBlockReason: rules.loopBlockReason,
        restore: rules.restore,
        /** Per-tick settlement of the current game at now (UTC ms): nothing (one integer compare) unless unlocked and the bucket has
         * turned. Returns advance's result; the caller announces result.settled (modules/application/foreground-loop.mjs announceAuction). */
        tick(now) {
            if (!game || game.isBackgroundCalculation || !rules.isUnlocked(game) || !rules.needsAdvance(game, now)) return idle;
            return rules.advance(game, now);
        }
    });
})();
safeExposeGlobals({ auctionHouse });
