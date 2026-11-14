import { createUnderworldRuneView } from './ui/underworld-rune-view.mjs';
import { UnderworldCrafting, underworldRuneDef, underworldRuneCountMap } from './domain/underworld-crafting.mjs';
import { underworldRuneState } from './state/underworld-runes.mjs';
import { UnderworldRuneDetails } from './ui/underworld-rune-details.mjs';
import { UnderworldRuneInventory } from './ui/underworld-rune-inventory.mjs';

const ensureUnderworldRuneState = () => underworldRuneState(window.GameModules.state.game);
const getUnderworldRuneDef = no => underworldRuneDef(no,UNDERWORLD_RUNE_DB);
const getUnderworldRuneCountMap = underworldRuneCountMap;

const crafting = new UnderworldCrafting({
    get enchantPools() { return UNDERWORLD_ENCHANT_POOLS; },
    get limitBreak() { return UNDERWORLD_LIMIT_BREAK; },
    statName: id => getStatName(id), runeDef: no => getUnderworldRuneDef(no), random: () => Math.random()
});

// Transitional classic API; remove when the application supplies this view directly.
const deps = {
    crafting,
    get updateStaticUI() { return updateStaticUI; },
    get queueImportantSave() { return queueImportantSave; },
    get enterUnderworldFloor() { return enterUnderworldFloor; },
    get enterUnderworldPrompt() { return enterUnderworldPrompt; },
    get upgradeSkyStone() { return upgradeSkyStone; },
    get P_STATS() { return P_STATS; },
    get UNDERWORLD_DEEP_FLOOR_REWARD() { return UNDERWORLD_DEEP_FLOOR_REWARD; },
    get UNDERWORLD_ENCHANT_POOLS() { return UNDERWORLD_ENCHANT_POOLS; },
    get UNDERWORLD_LIMIT_BREAK() { return UNDERWORLD_LIMIT_BREAK; },
    get UNDERWORLD_ZONE_ID() { return UNDERWORLD_ZONE_ID; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get assertBuildEditable() { return assertBuildEditable; },
    get bindGamePicker() { return bindGamePicker; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get captureUiDisclosureState() { return captureUiDisclosureState; },
    get contentUnlockUi() { return contentUnlockUi; },
    get document() { return document; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get ensureUnderworldRuneState() { return ensureUnderworldRuneState; },
    get escapeHTML() { return escapeHTML; },
    get formatValue() { return formatValue; },
    get game() { return window.GameModules.state.game; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get getSkyStoneMaxLevel() { return getSkyStoneMaxLevel; },
    get getSkyStoneNextCost() { return getSkyStoneNextCost; },
    get getSkyStoneReductionPct() { return getSkyStoneReductionPct; },
    get getStatName() { return getStatName; },
    get getUnderworldEntryBlock() { return getUnderworldEntryBlock; },
    get getUnderworldRuneCountMap() { return getUnderworldRuneCountMap; },
    get getUnderworldRuneDef() { return getUnderworldRuneDef; },
    get getUnderworldZone() { return getUnderworldZone; },
    get hideInfoTooltip() { return hideInfoTooltip; },
    get showInfoTooltipHtml() { return showInfoTooltipHtml; },
    get withObjectParticle() { return withObjectParticle; },
    get withDirectionParticle() { return withDirectionParticle; },
    get requestGameChoice() { return requestGameChoice; },
    get restoreUiDisclosureState() { return restoreUiDisclosureState; },
    get updateGamePanelMarkup() { return updateGamePanelMarkup; },
    get window() { return window; }
};
const details = new UnderworldRuneDetails(deps);
const inventory = new UnderworldRuneInventory(deps,crafting,details);
const underworldRuneUi = createUnderworldRuneView(deps,inventory,details);
safeExposeGlobals({ underworldRuneUi,ensureUnderworldRuneState,getUnderworldRuneDef,getUnderworldRuneCountMap,
    applyUnderworldEnchant:underworldRuneUi.applyUnderworldEnchant,attemptUnderworldLimitBreak:underworldRuneUi.attemptUnderworldLimitBreak,
    enhanceUnderworldRune:underworldRuneUi.enhanceUnderworldRune,rerollUnderworldRuneBonus:underworldRuneUi.rerollUnderworldRuneBonus,
    renderUnderworldMapPanel:underworldRuneUi.render,
    getUnderworldRuneEffectHtml:no => details.effectHtml(no),showUnderworldRuneTooltip:(event,no) => details.showTooltip(event,no),
    closeUnderworldRuneOverlay:() => inventory.closeOverlay(),openUnderworldRuneOverlay:index => inventory.openSlot(index),
    equipUnderworldRuneToSlot:(index,no) => inventory.equip(index,no),unequipUnderworldRuneSlot:index => inventory.unequip(index),
    craftUnderworldRune:() => inventory.craft(),openUnderworldRuneUpgradeOverlay:() => inventory.openUpgrade(),
    upgradeUnderworldRune:no => inventory.upgrade(no) });

