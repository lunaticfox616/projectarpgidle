import { BeehiveChoices } from './domain/beehive-choices.mjs';
import { BeehiveRun } from './combat/beehive-run.mjs';
import { RealmRunControls } from './combat/realm-run-controls.mjs';
import { BeehiveView } from './ui/beehive-view.mjs';
import { RealmPanelsView } from './ui/realm-panels-view.mjs';
import { RealmContentControls } from './ui/realm-content-controls.mjs';

const deps = {
    get game() { return window.GameModules.state.game; },
    get CHAOS_REALM_ZONE_ID() { return CHAOS_REALM_ZONE_ID; },
    get CURRENCY_LEGACY_MERGE() { return CURRENCY_LEGACY_MERGE; },
    get OCEAN_ZONE_ID() { return OCEAN_ZONE_ID; },
    get _t() { return _t; },
    get actExplorationDoors() { return actExplorationDoors; },
    get actExplorationProgress() { return actExplorationProgress; },
    get actExplorationState() { return actExplorationState; },
    get addItemToInventory() { return addItemToInventory; },
    get addLog() { return addLog; },
    get awardCurrency() { return awardCurrency; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get canEnterChaosRealm() { return canEnterChaosRealm; },
    get contentProgression() { return contentProgression; },
    get colonyRun() { return window.GameModules.colonyRun; },
    get countBeehiveWaveAlive() { return countBeehiveWaveAlive; },
    get createEnemy() { return createEnemy; },
    get document() { return document; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get ensureOceanState() { return ensureOceanState; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get escapeHTML() { return escapeHTML; },
    get generateUniqueItem() { return generateUniqueItem; },
    get getBeehiveRoomRun() { return getBeehiveRoomRun; },
    get getChaosRealmAffixes() { return getChaosRealmAffixes; },
    get getChaosRealmTier() { return getChaosRealmTier; },
    get getColonyWaveEnemyCount() { return getColonyWaveEnemyCount; },
    get getContentReturnZoneId() { return getContentReturnZoneId; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get getCurrencyInfo() { return getCurrencyInfo; },
    get getItemStatToneColor() { return getItemStatToneColor; },
    get getRealmEquipmentHiddenTierCap() { return getRealmEquipmentHiddenTierCap; },
    get getRecordsView() { return getRecordsView; },
    get getZone() { return getZone; },
    get isBeehiveRunLockedForMapTravel() { return isBeehiveRunLockedForMapTravel; },
    get i18n() { return i18n; },
    get levelProgression() { return levelProgression; },
    get markLoopSpecialBossKill() { return markLoopSpecialBossKill; },
    get placeBeehiveRoomWave() { return placeBeehiveRoomWave; },
    random: () => Math.random(),
    get queueImportantSave() { return queueImportantSave; },
    get renderColonyWardView() { return renderColonyWardView; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get resetBeehiveRunModifiers() { return resetBeehiveRunModifiers; },
    get sideEncounterUi() { return sideEncounterUi; },
    get spawnColonyWave() { return spawnColonyWave; },
    get startEncounterRun() { return startEncounterRun; },
    get tuneBeehiveWaveEnemy() { return tuneBeehiveWaveEnemy; },
    get unlockJournalEntry() { return unlockJournalEntry; },
    get updateStaticUI() { return updateStaticUI; },
    get writeHtmlIfChanged() { return writeHtmlIfChanged; }
};
const choices = new BeehiveChoices(deps);
const bees = new BeehiveRun(deps, choices);
const runs = new RealmRunControls(deps);
const hive = new BeehiveView(deps, choices);
const panels = new RealmPanelsView(deps);
const controls = new RealmContentControls(deps, hive, bees, runs);
// Compatibility names retire once native composition owns all consumers.
safeExposeGlobals({
    closeBeehiveChoiceOverlay: (dismiss) => hive.close(deps.game, dismiss),
    openBeehiveChoiceOverlay: (reasonText) => hive.open(deps.game, reasonText),
    renderLoop8BeehivePanel: (shouldRenderPanel) => controls.renderHive(deps.game, shouldRenderPanel),
    renderLoop15ColonyPanel: () => controls.renderColony(deps.game),
    startColonyRun: () => controls.consume(runs.startColony(deps.game)),
    forfeitColonyRun: () => controls.forfeitColony(),
    renderLoop9VoidRiftPanel: () => controls.renderGrand(deps.game),
    canPayBeehivePenalty: (penalty) => choices.canPay(deps.game, penalty),
    getBeehiveRewardPool: (branchStep) => choices.rewardPool(deps.game, branchStep),
    startBeehiveRun: () => controls.consume(bees.start(deps.game)),
    resolveBeehiveChoice: (key, displayedPenalty, revision) => controls.resolveChoice(deps.game, key, displayedPenalty, revision),
    exitBeehiveRun: (message, logType) => controls.consume(bees.exit(deps.game, message, logType)),
    onBeehiveWaveCleared: () => controls.consume(bees.cleared(deps.game)),
    forfeitBeehiveRun: () => controls.forfeitHive(deps.game),
    autoEnterGrandBreachIfReady: () => controls.consume(runs.autoEnter(deps.game)),
    enterGrandBreach: (options) => controls.consume(runs.enterGrand(deps.game, options)),
    toggleMeteorAutoEnter: () => controls.consume(runs.toggleMeteor(deps.game)),
    toggleGrandBreachAutoEnter: () => controls.consume(runs.toggleGrand(deps.game)),
    renderChaosRealmMapPanel: () => panels.chaos(),
    renderSkyTowerMapPanel: () => panels.sky(),
    updateCombatOxygenBar: () => panels.oxygen(deps.game)
});
window.GameModules.realmContentViews = Object.freeze({dispose: () => { controls.dispose(); hive.dispose(); panels.dispose(); }});
