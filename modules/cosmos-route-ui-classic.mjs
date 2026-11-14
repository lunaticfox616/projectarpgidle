import { createCosmosRouteView } from './ui/cosmos-route-view.mjs';
const cosmosRouteUi = createCosmosRouteView({
    get document() { return document; },
    get cosmosRouteRuntime() { return cosmosRouteRuntime; },
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; },
    get escapeHTML() { return escapeHTML; },
    get COSMOS_ROUTE_G1() { return COSMOS_ROUTE_G1; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get EXPLORATION_REGIONS() { return EXPLORATION_REGIONS; },
    get window() { return window; }
});
safeExposeGlobals({ cosmosRouteUi });
