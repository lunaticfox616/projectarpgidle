import { windowSetTimeout } from './browser/window-methods.mjs';
import { createEquipmentHallState } from './state/equipment-hall.mjs';
import { EquipmentHallRules } from './domain/equipment-hall.mjs';
import { EquipmentHallService } from './application/equipment-hall-service.mjs';
import { EquipmentHallView } from './ui/equipment-hall-view.mjs';
import { EquipmentHallActions } from './ui/equipment-hall-actions.mjs';

const state = createEquipmentHallState();
const deps = {
    get hideInfoTooltip() { return hideInfoTooltip; },
    get marketUi() { return marketUi; },
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
window.GameModules.equipmentHall = { state, dispose: () => actions.dispose() };
// Existing market/navigation consumers keep these four bridges until their composition is native.
safeExposeGlobals({
    hallItemIssue: rules.hallItemIssue.bind(rules),
    loadPlayerExchange: actions.loadPlayerExchange.bind(actions),
    selectPlayerHallItem: view.selectPlayerHallItem.bind(view),
    renderPlayerExchange: view.renderPlayerExchange.bind(view),
});
