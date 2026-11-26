import { createListingsView } from './ui/listings-view.mjs';

// 출품 탭(modules/ui/listings-view.mjs: 가판대, 경매장, 장비 전당 출품을 한 화면에). 전역 이름은 옛 가판대 화면의 playerStallUi 그대로다.
// 장비 전당은 window.GameModules.equipmentHall(js/player-exchange.js), 경매장 정산 알림은 게임 틱과 같은 함수를 쓴다.
const playerStallUi = createListingsView({
    get shopView() { return shopView; },
    get game() { return window.GameModules.state.game; },
    get playerStall() { return playerStall; },
    get auctionHouse() { return auctionHouse; },
    get hall() { return window.GameModules.equipmentHall; },
    get cloudState() { return cloudState; },
    get contentProgression() { return contentProgression; },
    get announceAuction() { return window.GameModules.application.announceAuction; },
    get openStartupGate() { return openStartupGate; },
    get document() { return document; },
    get console() { return console; },
    get _t() { return _t; },
    get PLAYER_STALL_RULES() { return PLAYER_STALL_RULES; },
    get itemAppraisal() { return itemAppraisal; },
    get Date() { return Date; },
    get ensureCraftSelectionValid() { return ensureCraftSelectionValid; },
    get saveGame() { return saveGame; },
    get updateStaticUI() { return updateStaticUI; },
    get formatCurrencyCosts() { return formatCurrencyCosts; },
    get escapeHTML() { return escapeHTML; },
    get addLog() { return addLog; },
    get ORB_DB() { return ORB_DB; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get getItemDisplayName() { return getItemDisplayName; },
    get PLAYER_STALL_CUSTOMERS() { return PLAYER_STALL_CUSTOMERS; },
    get i18n() { return i18n; },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get marketUi() { return marketUi; },
    get formatRecordDuration() { return formatRecordDuration; },
    get selectionDialog() { return selectionDialog; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; }
});
safeExposeGlobals({ playerStallUi });
