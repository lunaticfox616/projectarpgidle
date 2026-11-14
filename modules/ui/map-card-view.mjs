import { getMapEstimateElementName, buildTrialMapItemHtml, toggleMapZoneGroup, buildMapZoneGroupHtml, formatApproximateMapPower, getMapPowerEstimateParts, buildMapPowerEstimateHtml, formatLoopDeepValue, buildMapRewardRow, showMapPowerEstimateTooltip, getRecommendedHuntingZone, buildMapRouteSummaryHtml, getMapCardState, buildMapCardActionsHtml, renderTrialMapList } from './map-card-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createMapCardView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { getMapEstimateElementName, buildTrialMapItemHtml, toggleMapZoneGroup, buildMapZoneGroupHtml, formatApproximateMapPower, getMapPowerEstimateParts, buildMapPowerEstimateHtml, formatLoopDeepValue, buildMapRewardRow, showMapPowerEstimateTooltip, getRecommendedHuntingZone, buildMapRouteSummaryHtml, getMapCardState, buildMapCardActionsHtml, renderTrialMapList };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = { toggleMapZoneGroup: runtime.handlers.toggleMapZoneGroup, buildMapZoneGroupHtml: runtime.handlers.buildMapZoneGroupHtml, formatApproximateMapPower: runtime.handlers.formatApproximateMapPower, getMapPowerEstimateParts: runtime.handlers.getMapPowerEstimateParts, buildMapPowerEstimateHtml: runtime.handlers.buildMapPowerEstimateHtml, getMapEstimateElementName: runtime.handlers.getMapEstimateElementName, formatLoopDeepValue: runtime.handlers.formatLoopDeepValue, buildMapRewardRow: runtime.handlers.buildMapRewardRow, showMapPowerEstimateTooltip: runtime.handlers.showMapPowerEstimateTooltip, getRecommendedHuntingZone: runtime.handlers.getRecommendedHuntingZone, buildMapRouteSummaryHtml: runtime.handlers.buildMapRouteSummaryHtml, getMapCardState: runtime.handlers.getMapCardState, buildMapCardActionsHtml: runtime.handlers.buildMapCardActionsHtml, buildTrialMapItemHtml: runtime.handlers.buildTrialMapItemHtml, renderTrialMapList: runtime.handlers.renderTrialMapList };

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.mapZoneGroupCollapseState = { availableBosses: false, rootBosses: null, rivalBosses: null, pinnacleBosses: null, finalGate: null };
}
