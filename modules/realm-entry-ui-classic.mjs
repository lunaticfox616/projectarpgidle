import { RealmFloorEntry } from './ui/realm-floor-entry.mjs';
import { RealmTrialEntry } from './ui/realm-trial-entry.mjs';

const deps = {
    get game() { return window.GameModules.state.game; },
    get CHAOS_REALM_ZONE_ID() { return CHAOS_REALM_ZONE_ID; },
    get CLASS_TEMPLATES() { return CLASS_TEMPLATES; },
    get HERO_SELECTION_DEFS() { return HERO_SELECTION_DEFS; },
    get HERO_SELECTION_ORDER() { return HERO_SELECTION_ORDER; },
    get LABYRINTH_ZONE_ID() { return LABYRINTH_ZONE_ID; },
    get SKY_TOWER_ZONE_ID() { return SKY_TOWER_ZONE_ID; },
    get UNDERWORLD_ZONE_ID() { return UNDERWORLD_ZONE_ID; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    get assertBuildEditable() { return assertBuildEditable; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get canEnterChaosRealm() { return canEnterChaosRealm; },
    get canEnterSkyTower() { return canEnterSkyTower; },
    get canEnterUnderworld() { return canEnterUnderworld; },
    get changeZone() { return changeZone; },
    get contentProgression() { return contentProgression; },
    get ensureChaosRealmState() { return ensureChaosRealmState; },
    get ensureSkyTowerState() { return ensureSkyTowerState; },
    get enterUnlockedEndlessDepth() { return enterUnlockedEndlessDepth; },
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get getAbyssZoneIdForDepth() { return getAbyssZoneIdForDepth; },
    get getContentStartBlockReason() { return getContentStartBlockReason; },
    get getHeldRunBlockReason() { return getHeldRunBlockReason; },
    get getSkyStoneMaxLevel() { return getSkyStoneMaxLevel; },
    get getSkyStoneNextCost() { return getSkyStoneNextCost; },
    get getSkyStoneReductionPct() { return getSkyStoneReductionPct; },
    get getSkyTowerLoopClearLimit() { return getSkyTowerLoopClearLimit; },
    get getSkyTowerRemainingClears() { return getSkyTowerRemainingClears; },
    get getTalentBloomHeroIdForAscendancy() { return getTalentBloomHeroIdForAscendancy; },
    get getTalentCardName() { return getTalentCardName; },
    get getZone() { return getZone; },
    get getZoneTravelBlockReason() { return getZoneTravelBlockReason; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get queueImportantSave() { return queueImportantSave; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get requestGameNumber() { return requestGameNumber; },
    get saveGame() { return saveGame; },
    get updateStaticUI() { return updateStaticUI; }
};
const floors = new RealmFloorEntry(deps);
const trials = new RealmTrialEntry(deps);
// Retire these aliases when their classic consumers move into application composition.
safeExposeGlobals({
    enterLabyrinthFloor: (requestedFloor) => floors.labyrinth(requestedFloor),
    enterSkyTowerPrompt: (selectedFloor) => floors.sky(selectedFloor),
    upgradeSkyStone: () => floors.skyStone(),
    enterChaosRealmPrompt: () => floors.chaos(),
    enterUnderworldFloor: (requestedFloor) => floors.underworld(requestedFloor),
    enterUnderworldPrompt: () => floors.pickUnderworld(),
    enterTrialWithTicket: (trialId) => trials.trial(trialId),
    isWoodsmanEchoUnlocked: () => trials.echoOpen(),
    canEnterTalentBloomTrial: () => trials.bloomOpen(),
    enterTalentBloomTrial: () => trials.bloom(),
    enterDeepChaosPrompt: () => trials.deepChaos(),
    getDeepChaosEntryState: () => trials.deepStatus(),
    getDeepChaosMapEntryHtml: () => trials.deepHtml(),
    toggleSeasonBossRepeat: () => trials.toggleRepeat()
});
window.GameModules.realmEntryViews = Object.freeze({dispose: () => { floors.dispose(); trials.dispose(); }});
