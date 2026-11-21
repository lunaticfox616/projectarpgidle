import { createAuctionHouseView } from './ui/auction-house-view.mjs';

// 경매장 칸(거래 창, modules/ui/auction-house-view.mjs)을 전역 객체 auctionHouseUi 하나로 잇는다. 장비 전당은 window.GameModules.equipmentHall
// (js/player-exchange.js), 정산 알림은 게임 틱과 같은 함수(window.GameModules.application.announceAuction)를 쓴다.
const auctionHouseUi = createAuctionHouseView({
    get auctionHouse() { return auctionHouse; },
    get game() { return window.GameModules.state.game; },
    get document() { return document; },
    get window() { return window; },
    get console() { return console; },
    get i18n() { return i18n; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get shopView() { return shopView; },
    get itemAppraisal() { return itemAppraisal; },
    get contentProgression() { return contentProgression; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getRarityColor() { return getRarityColor; },
    get getPersistentBuildSignature() { return getPersistentBuildSignature; },
    get showGameToast() { return showGameToast; },
    get saveGame() { return saveGame; },
    get updateStaticUI() { return updateStaticUI; },
    get ensureCraftSelectionValid() { return ensureCraftSelectionValid; },
    get hideItemTooltip() { return hideItemTooltip; },
    get loadPlayerExchange() { return loadPlayerExchange; },
    get hall() { return window.GameModules.equipmentHall; },
    get announceAuction() { return window.GameModules.application.announceAuction; },
    now: () => Date.now()
});
safeExposeGlobals({ auctionHouseUi });
