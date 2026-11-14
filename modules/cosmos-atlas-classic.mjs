import { CosmosAtlasGraph } from './domain/cosmos-atlas-graph.mjs';
import { CosmosAtlasState } from './state/cosmos-atlas.mjs';
import { CosmosAtlasProgress } from './domain/cosmos-atlas-progress.mjs';
import { CosmosAtlasStones } from './domain/cosmos-atlas-stones.mjs';
import { CosmosAtlasDirectives } from './domain/cosmos-atlas-directives.mjs';
import { CosmosAtlasRules } from './domain/cosmos-atlas-rules.mjs';
import { CosmosAtlasRewards } from './domain/cosmos-atlas-rewards.mjs';
import { CosmosAtlasEncounters } from './combat/cosmos-atlas-encounters.mjs';
import { CosmosAtlasView } from './ui/cosmos-atlas-view.mjs';

const graphDeps = {
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
};
const graph = new CosmosAtlasGraph(graphDeps);

const stateDeps = {
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get getSocketedJewels() { return typeof getSocketedJewels === 'undefined' ? undefined : getSocketedJewels; },
};
const state = new CosmosAtlasState(stateDeps);

const progressDeps = {
    get COSMOS_SKY_POWER_PER_REWARD() { return typeof COSMOS_SKY_POWER_PER_REWARD === 'undefined' ? undefined : COSMOS_SKY_POWER_PER_REWARD; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get canLog() { return typeof window.addLog === 'function'; },
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get isCosmosContentUnlockReady() { return typeof isCosmosContentUnlockReady === 'undefined' ? undefined : isCosmosContentUnlockReady; },
    get isMapPrimaryContentUnlocked() { return typeof isMapPrimaryContentUnlocked === 'undefined' ? undefined : isMapPrimaryContentUnlocked; },
};
const progress = new CosmosAtlasProgress(progressDeps, { state, graph });

const stonesDeps = {
    get COSMOS_BOSS_STONE_OPTION_POOLS() { return typeof COSMOS_BOSS_STONE_OPTION_POOLS === 'undefined' ? undefined : COSMOS_BOSS_STONE_OPTION_POOLS; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get canLog() { return typeof window.addLog === 'function'; },
    get canRefresh() { return typeof window.updateStaticUI === 'function'; },
};
const stones = new CosmosAtlasStones(stonesDeps, { state });

const directivesDeps = {
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get getCosmosExpeditionDirectiveChoices() { return typeof getCosmosExpeditionDirectiveChoices === 'undefined' ? undefined : getCosmosExpeditionDirectiveChoices; },
};
const directives = new CosmosAtlasDirectives(directivesDeps, { state, graph, progress });

const rulesDeps = {
    get COSMOS_GALAXY_ENVIRONMENT_DB() { return typeof COSMOS_GALAXY_ENVIRONMENT_DB === 'undefined' ? undefined : COSMOS_GALAXY_ENVIRONMENT_DB; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get calculateCosmosDifficultyTarget() { return typeof calculateCosmosDifficultyTarget === 'undefined' ? undefined : calculateCosmosDifficultyTarget; },
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get estimateMapZonePowerRequirements() { return typeof estimateMapZonePowerRequirements === 'undefined' ? undefined : estimateMapZonePowerRequirements; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get getChaosRealmTier() { return typeof getChaosRealmTier === 'undefined' ? undefined : getChaosRealmTier; },
    get getCosmosGalaxyBossMechanic() { return typeof getCosmosGalaxyBossMechanic === 'undefined' ? undefined : getCosmosGalaxyBossMechanic; },
    get getMapPowerReadiness() { return typeof getMapPowerReadiness === 'undefined' ? undefined : getMapPowerReadiness; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get getZone() { return typeof getZone === 'undefined' ? undefined : getZone; },
    get resolveCosmosMechanic() { return typeof resolveCosmosMechanic === 'undefined' ? undefined : resolveCosmosMechanic; },
};
const rules = new CosmosAtlasRules(rulesDeps, { progress, stones, graph, directives, state });

const rewardsDeps = {
    get COSMOS_BOSS_RELIC_DB() { return typeof COSMOS_BOSS_RELIC_DB === 'undefined' ? undefined : COSMOS_BOSS_RELIC_DB; },
    get COSMOS_BOSS_REWARD_DB() { return typeof COSMOS_BOSS_REWARD_DB === 'undefined' ? undefined : COSMOS_BOSS_REWARD_DB; },
    get COSMOS_SKY_POWER_PER_REWARD() { return typeof COSMOS_SKY_POWER_PER_REWARD === 'undefined' ? undefined : COSMOS_SKY_POWER_PER_REWARD; },
    get UNIQUE_DB() { return typeof UNIQUE_DB === 'undefined' ? undefined : UNIQUE_DB; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get addItemToInventory() { return typeof addItemToInventory === 'undefined' ? undefined : addItemToInventory; },
    get bagItems() { return typeof bagItems === 'undefined' ? undefined : bagItems; },
    get canLog() { return typeof window.addLog === 'function'; },
    get canRefresh() { return typeof window.updateStaticUI === 'function'; },
    get canToast() { return typeof window.showGameToast === 'function'; },
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get generateUniqueItem() { return typeof generateUniqueItem === 'undefined' ? undefined : generateUniqueItem; },
    get getStatName() { return typeof getStatName === 'undefined' ? undefined : getStatName; },
    get markLoopCosmosPlanetClear() { return typeof markLoopCosmosPlanetClear === 'undefined' ? undefined : markLoopCosmosPlanetClear; },
    get pickRandomAscendKeystoneId() { return typeof pickRandomAscendKeystoneId === 'undefined' ? undefined : pickRandomAscendKeystoneId; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get talismans() { return typeof talismans === 'undefined' ? undefined : talismans; },
};
const rewards = new CosmosAtlasRewards(rewardsDeps, { rules, state, progress, graph, directives, stones });

const encountersDeps = {
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get canLog() { return typeof window.addLog === 'function'; },
    get canToast() { return typeof window.showGameToast === 'function'; },
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get startMoving() { return typeof startMoving === 'undefined' ? undefined : startMoving; },
};
const encounters = new CosmosAtlasEncounters(encountersDeps, { rules, directives, state, graph });

const viewDeps = {
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog; },
    get captureUiDisclosureState() { return typeof captureUiDisclosureState === 'undefined' ? undefined : captureUiDisclosureState; },
    get closeAllWindows() { return typeof closeAllWindows === 'undefined' ? undefined : closeAllWindows; },
    get cosmosRouteRuntime() { return typeof cosmosRouteRuntime === 'undefined' ? undefined : cosmosRouteRuntime; },
    get cosmosRouteUi() { return typeof cosmosRouteUi === 'undefined' ? undefined : cosmosRouteUi; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get escapeHTML() { return typeof escapeHTML === 'undefined' ? undefined : escapeHTML; },
    get game() { return window.GameModules.state.game; },
    set game(value) { window.GameModules.state.game = value; },
    get hideInfoTooltip() { return typeof hideInfoTooltip === 'undefined' ? undefined : hideInfoTooltip; },
    get queueImportantSave() { return typeof queueImportantSave === 'undefined' ? undefined : queueImportantSave; },
    get restoreUiDisclosureState() { return typeof restoreUiDisclosureState === 'undefined' ? undefined : restoreUiDisclosureState; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get showInfoTooltipHtml() { return typeof showInfoTooltipHtml === 'undefined' ? undefined : showInfoTooltipHtml; },
    get showMapPowerEstimateTooltip() { return typeof showMapPowerEstimateTooltip === 'undefined' ? undefined : showMapPowerEstimateTooltip; },
    get switchMapExploreSubtab() { return typeof switchMapExploreSubtab === 'undefined' ? undefined : switchMapExploreSubtab; },
    get switchMapSubtab() { return typeof switchMapSubtab === 'undefined' ? undefined : switchMapSubtab; },
    get switchTab() { return typeof switchTab === 'undefined' ? undefined : switchTab; },
    get syncMapPrimaryContentTabs() { return typeof syncMapPrimaryContentTabs === 'undefined' ? undefined : syncMapPrimaryContentTabs; },
    get updateStaticUI() { return typeof updateStaticUI === 'undefined' ? undefined : updateStaticUI; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
};
const view = new CosmosAtlasView(viewDeps, { state, graph, progress, rules, encounters, directives, stones, rewards });

window.GameModules.cosmosAtlas = { graph, state, progress, stones, directives, rules, rewards, encounters, view };
// Retire these aliases when the remaining classic consumers move to application composition.
safeExposeGlobals({
    renderCosmosAtlas: view.renderCosmosAtlas.bind(view),
    challengeSelectedCosmosNode: view.challengeSelectedCosmosNode.bind(view),
    getCosmosMasteryValue: progress.getCosmosMasteryValue.bind(progress),
    getCosmosBossPityProgress: progress.getCosmosBossPityProgress.bind(progress),
    switchCosmosInnerTab: view.switchCosmosInnerTab.bind(view),
    focusCosmosAtlasOnSelected: view.focusCosmosAtlasOnSelected.bind(view),
    installCosmosAtlas: view.installCosmosAtlas.bind(view),
    openCosmosStoneOverlay: view.openCosmosStoneOverlay.bind(view),
    getCosmosCapstoneProgress: progress.getCosmosCapstoneProgress.bind(progress),
    getCosmosNodeRecommendation: rules.getCosmosNodeRecommendation.bind(rules),
    getCosmosProgressGuide: rules.getCosmosProgressGuide.bind(rules),
    focusRecommendedCosmosNode: view.focusRecommendedCosmosNode.bind(view),
    grantCosmosSkyPower: progress.grantCosmosSkyPower.bind(progress),
    handleCosmosRouteAction: view.handleCosmosRouteAction.bind(view),
});
view.mount();
