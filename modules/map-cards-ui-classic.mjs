import { createMapCardView } from './ui/map-card-view.mjs';
const mapCardView = createMapCardView({
    get updateStaticUI() { return updateStaticUI; },
    get _t() { return _t; },
    get i18n() { return i18n; },
    get getMapPowerReadiness() { return typeof getMapPowerReadiness === 'undefined' ? undefined : getMapPowerReadiness; },
    get cachedTooltipStats() { return window.GameModules.uiRuntime.stats.snapshot(); },
    set cachedTooltipStats(value) { window.GameModules.uiRuntime.stats.store(value); },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get estimateMapZonePowerRequirements() { return typeof estimateMapZonePowerRequirements === 'undefined' ? undefined : estimateMapZonePowerRequirements; },
    get getChaosBossElements() { return getChaosBossElements; },
    get levelProgressionUi() { return levelProgressionUi; },
    get escapeHTML() { return escapeHTML; },
    get showInfoTooltipHtml() { return showInfoTooltipHtml; },
    get getActRewardChoices() { return getActRewardChoices; },
    get isActRewardChoiceAvailable() { return isActRewardChoiceAvailable; },
    get game() { return window.GameModules.state.game; },
    get getTrialSkillGemRewardChance() { return typeof getTrialSkillGemRewardChance === 'undefined' ? undefined : getTrialSkillGemRewardChance; },
    get canEnterTalentBloomTrial() { return canEnterTalentBloomTrial; },
    get isWoodsmanEchoUnlocked() { return isWoodsmanEchoUnlocked; },
    get document() { return document; }
});
safeExposeGlobals({
    toggleMapZoneGroup: mapCardView.toggleMapZoneGroup,
    buildMapZoneGroupHtml: mapCardView.buildMapZoneGroupHtml,
    formatApproximateMapPower: mapCardView.formatApproximateMapPower,
    getMapPowerEstimateParts: mapCardView.getMapPowerEstimateParts,
    buildMapPowerEstimateHtml: mapCardView.buildMapPowerEstimateHtml,
    getMapEstimateElementName: mapCardView.getMapEstimateElementName,
    formatLoopDeepValue: mapCardView.formatLoopDeepValue,
    buildMapRewardRow: mapCardView.buildMapRewardRow,
    showMapPowerEstimateTooltip: mapCardView.showMapPowerEstimateTooltip,
    getRecommendedHuntingZone: mapCardView.getRecommendedHuntingZone,
    buildMapRouteSummaryHtml: mapCardView.buildMapRouteSummaryHtml,
    getMapCardState: mapCardView.getMapCardState,
    buildMapCardActionsHtml: mapCardView.buildMapCardActionsHtml,
    buildTrialMapItemHtml: mapCardView.buildTrialMapItemHtml,
    renderTrialMapList: mapCardView.renderTrialMapList
});
