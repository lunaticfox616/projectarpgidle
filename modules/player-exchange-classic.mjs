import { windowSetTimeout } from './browser/window-methods.mjs';
import { createEquipmentHallState } from './state/equipment-hall.mjs';
import { EquipmentHallRules } from './domain/equipment-hall.mjs';
import { EquipmentHallService } from './application/equipment-hall-service.mjs';
import { EquipmentHallView } from './ui/equipment-hall-view.mjs';
import { EquipmentHallActions } from './ui/equipment-hall-actions.mjs';

const state = createEquipmentHallState();
const deps = {
    get hideInfoTooltip() { return hideInfoTooltip; },
    get openStartupGate() { return openStartupGate; },
    get _t() { return _t; },
    get backgroundCombatRuntime() { return backgroundCombatRuntime; },
    get buildItemSnapshot() { return typeof buildItemSnapshot === 'undefined' ? undefined : buildItemSnapshot; },
    get canStoreEquipmentItems() { return canStoreEquipmentItems; },
    get cloudJsonRequest() { return cloudJsonRequest; },
    get cloudState() { return cloudState; },
    get console() { return console; },
    get crypto() { return typeof crypto === 'undefined' ? undefined : crypto; },
    get document() { return document; },
    get ensureSaveMeta() { return ensureSaveMeta; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get getPersistentBuildSignature() { return getPersistentBuildSignature; },
    get getRarityColor() { return getRarityColor; },
    get i18n() { return i18n; },
    get normalizeItem() { return normalizeItem; },
    get persistLocalSave() { return persistLocalSave; },
    get pushCloudSave() { return pushCloudSave; },
    get renderInventoryItemVisual() { return renderInventoryItemVisual; },
    get renderProfileItemCard() { return typeof renderProfileItemCard === 'undefined' ? undefined : renderProfileItemCard; },
    get requestGameConfirmation() { return typeof requestGameConfirmation === 'undefined' ? undefined : requestGameConfirmation; },
    get saveGame() { return saveGame; },
    get setTimeout() { return windowSetTimeout; },
    get shopView() { return shopView; },
    get showInfoTooltipHtml() { return showInfoTooltipHtml; },
    get uiDisplay() { return uiDisplay; },
    get updateStaticUI() { return updateStaticUI; },
    get weaponCategorySlotLabel() { return weaponCategorySlotLabel; },
};
const rules = new EquipmentHallRules({
    get equipmentSockets() { return equipmentSockets; },
    get bagItems() { return bagItems; },
    get equipmentLoadoutRuntime() { return equipmentLoadoutRuntime; },
    get normalizeItem() { return normalizeItem; },
    get _t() { return _t; },
    nextItemId: () => ++window.GameModules.state.session.itemIdCounter
});
const service = new EquipmentHallService(deps, state, rules);
const view = new EquipmentHallView(deps, state, service);
const actions = new EquipmentHallActions(deps, state, service, view);
// The auction's 다른 플레이어 lots (modules/ui/auction-house-hall.mjs) read the hall rows and buy through the hall's own purchase. The 출품 tab
// (modules/ui/listings-hall.mjs) shows my shows (mine: open or every copy gone) among the listings and lists and withdraws through the hall's own
// flows (appraisal, confirmation, server RPC); itemIssue is the hall's item rule, busy a trade or its dialog under way, loaded the rows read.
window.GameModules.equipmentHall = { state, dispose: () => actions.dispose(), isServerReady: () => service.isPlayerExchangeServerReady(),
    listings: () => service.getPlayerHallListings(), buyBlockReason: listing => service.getHallBuyBlockReason(listing),
    buyReplica: listingId => actions.buyPlayerHallReplica(listingId),
    loaded: () => !!service.getPlayerHallData(), load: () => actions.loadPlayerExchange(),
    mine: () => { const data = service.getPlayerHallData(); return (Array.isArray(data && data.mine) ? data.mine : []).filter(row => row && ['open', 'sold_out'].includes(row.status)); },
    itemIssue: item => rules.hallItemIssue(item), busy: () => state.loading || state.asking,
    list: itemId => { state.selectedItemId = Number(itemId); return actions.createPlayerHallListing(); },
    withdraw: listingId => actions.withdrawPlayerHallListing(listingId) };
// Existing market/navigation consumers keep these two bridges until their composition is native.
safeExposeGlobals({
    loadPlayerExchange: actions.loadPlayerExchange.bind(actions),
    renderPlayerExchange: view.renderPlayerExchange.bind(view),
});
