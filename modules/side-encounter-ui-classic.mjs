import { SideEncounterMarkup } from './ui/side-encounter-markup.mjs';
import { SideExpeditionView } from './ui/side-expedition-view.mjs';
import { GrandBreachView } from './ui/grand-breach-view.mjs';
import { SideEncounterProgress } from './ui/side-encounter-progress.mjs';
import { SideEncounterDestinations } from './ui/side-encounter-destinations.mjs';
import { LabyrinthEncounterView } from './ui/labyrinth-encounter-view.mjs';
import { TimeRiftEncounterView } from './ui/time-rift-encounter-view.mjs';
import { ColonyEncounterView } from './ui/colony-encounter-view.mjs';
import { SkyTowerEncounterView } from './ui/sky-tower-encounter-view.mjs';
import { SideEncounterActions } from './ui/side-encounter-actions.mjs';

const deps = {
    get COLONY_WARD_RULES() { return COLONY_WARD_RULES; },
    get GRAND_BREACH_ENCOUNTER() { return GRAND_BREACH_ENCOUNTER; },
    get LABYRINTH_ZONE_ID() { return LABYRINTH_ZONE_ID; },
    get METEOR_FALL_ZONE_ID() { return METEOR_FALL_ZONE_ID; },
    get ORB_DB() { return ORB_DB; },
    get SKY_TOWER_ZONE_ID() { return SKY_TOWER_ZONE_ID; },
    get TIME_RIFT_FUTURE_ZONE_ID() { return TIME_RIFT_FUTURE_ZONE_ID; },
    get TIME_RIFT_KEEP_CAP() { return TIME_RIFT_KEEP_CAP; },
    get TIME_RIFT_MAX_PRESSURE() { return TIME_RIFT_MAX_PRESSURE; },
    get TIME_RIFT_PAST_ZONE_ID() { return TIME_RIFT_PAST_ZONE_ID; },
    get UNIQUE_DB() { return UNIQUE_DB; },
    get _t() { return _t; },
    get actExplorationMap() { return actExplorationMap; },
    get actExplorationState() { return actExplorationState; },
    get addLog() { return addLog; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get canEnterSkyTower() { return canEnterSkyTower; },
    get captureUiDisclosureState() { return captureUiDisclosureState; },
    get colonyRun() { return window.GameModules.colonyRun; },
    get colonyWards() { return colonyWards; },
    get contentProgression() { return contentProgression; },
    get contentUnlockUi() { return contentUnlockUi; },
    get document() { return document; },
    get ensureTimeRiftState() { return ensureTimeRiftState; },
    get equipmentInspectionUi() { return equipmentInspectionUi; },
    get escapeHTML() { return escapeHTML; },
    get forfeitColonyRun() { return forfeitColonyRun; },
    get game() { return window.GameModules.state.game; },
    get getCombatTime() { return getCombatTime; },
    get getEquipmentLoadoutItemIdentity() { return getEquipmentLoadoutItemIdentity; },
    get getEquipmentLoadoutOwnedItems() { return getEquipmentLoadoutOwnedItems; },
    get getGrandBreachProgress() { return getGrandBreachProgress; },
    get getGrandBreachRewardSummary() { return getGrandBreachRewardSummary; },
    get getHeldRunBlockReason() { return getHeldRunBlockReason; },
    get getItemDisplayName() { return getItemDisplayName; },
    get getLabyrinthZoneNow() { return getLabyrinthZoneNow; },
    get getMeteorKind() { return getMeteorKind; },
    get getRealmEquipmentHiddenTierCap() { return getRealmEquipmentHiddenTierCap; },
    get getSelectedCraftItem() { return getSelectedCraftItem; },
    get getSkyStoneMaxLevel() { return getSkyStoneMaxLevel; },
    get getSkyStoneNextCost() { return getSkyStoneNextCost; },
    get getSkyStoneReductionPct() { return getSkyStoneReductionPct; },
    get getSkyTowerGemBoostMaxLevel() { return getSkyTowerGemBoostMaxLevel; },
    get getSkyTowerLoopClearLimit() { return getSkyTowerLoopClearLimit; },
    get getSkyTowerRemainingClears() { return getSkyTowerRemainingClears; },
    get getSkyTowerRewardAmount() { return getSkyTowerRewardAmount; },
    get getTimeAltarItemIssue() { return getTimeAltarItemIssue; },
    get getTimeRiftEquivalentChaosDepth() { return getTimeRiftEquivalentChaosDepth; },
    get getTimeRiftFixedSeason() { return getTimeRiftFixedSeason; },
    get getTimeRiftFutureEntryReason() { return getTimeRiftFutureEntryReason; },
    get getTimeRiftLossOdds() { return getTimeRiftLossOdds; },
    get getZone() { return getZone; },
    get getZoneTravelBlockReason() { return getZoneTravelBlockReason; },
    get isBeehiveRunLockedForMapTravel() { return isBeehiveRunLockedForMapTravel; },
    get isCraftSelectionEquip() { return isCraftSelectionEquip; },
    get isMapExploreSubtabOpenable() { return isMapExploreSubtabOpenable; },
    get levelProgression() { return levelProgression; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get requestGameNumber() { return requestGameNumber; },
    get restoreUiDisclosureState() { return restoreUiDisclosureState; },
    get returnToTown() { return returnToTown; },
    get setCombatProgressGaugePercent() { return setCombatProgressGaugePercent; },
    get setTextById() { return setTextById; },
    get uniqueDropsInZone() { return uniqueDropsInZone; },
    get uniqueMeetsTier() { return uniqueMeetsTier; },
    get updateStaticUI() { return updateStaticUI; },
};
const markup = new SideEncounterMarkup(deps);
const expedition = new SideExpeditionView(deps, { markup });
const grand = new GrandBreachView(deps);
const progress = new SideEncounterProgress(deps, { grand });
const destinations = new SideEncounterDestinations(deps);
const labyrinth = new LabyrinthEncounterView(deps, { markup });
const time = new TimeRiftEncounterView(deps, { markup });
const colony = new ColonyEncounterView(deps);
const sky = new SkyTowerEncounterView(deps);
const actions = new SideEncounterActions(deps);

// Retire this bridge once remaining classic/template consumers receive the view directly.
const sideEncounterUi = Object.freeze({
    dispose() { actions.dispose(); labyrinth.dispose(); progress.dispose(); },
    hiveSummary: expedition.hiveSummary.bind(expedition),
    updateHud: progress.updateHud.bind(progress),
    returnLabel: progress.returnLabel.bind(progress),
    withdrawalPending: actions.withdrawalPending.bind(actions),
    refreshDestinations: destinations.refreshDestinations.bind(destinations),
    hivePanel: expedition.hivePanel.bind(expedition),
    grandPanel: grand.grandPanel.bind(grand),
    meteorPanel: expedition.meteorPanel.bind(expedition),
    labyrinthPanel: labyrinth.labyrinthPanel.bind(labyrinth),
    selectLabyrinthFloor: labyrinth.selectLabyrinthFloor.bind(labyrinth),
    chooseLabyrinthFloor: labyrinth.chooseLabyrinthFloor.bind(labyrinth),
    timeRiftPanel: time.timeRiftPanel.bind(time),
    inspectTimeItem: time.inspectTimeItem.bind(time),
    colonyPanel: colony.colonyPanel.bind(colony),
    toggleColonyReturn: actions.toggleColonyReturn.bind(actions),
    withdrawColony: actions.withdrawColony.bind(actions),
    withdrawGrandBreach: actions.withdrawGrandBreach.bind(actions),
    returnFromBattle: actions.returnFromBattle.bind(actions),
    skyPanel: sky.skyPanel.bind(sky),
    skyGrowth: sky.skyGrowth.bind(sky),
    renderPanel: markup.renderPanel.bind(markup),
});
window.GameModules.sideEncounterView = sideEncounterUi;
safeExposeGlobals({ sideEncounterUi });
