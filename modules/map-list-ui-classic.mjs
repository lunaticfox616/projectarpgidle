import { createMapListView } from './ui/map-list-view.mjs';
const mapListUi = createMapListView({
    get getAbyssDepthFromZoneId() { return getAbyssDepthFromZoneId; },
    get game() { return window.GameModules.state.game; },
    get pendingMapRevealZoneId() { return pendingMapRevealZoneId; },
    get _t() { return _t; },
    get EXPLORATION_REGIONS() { return EXPLORATION_REGIONS; },
    get URL() { return URL; },
    get document() { return document; },
    get getMapCardState() { return getMapCardState; },
    get buildMapCardActionsHtml() { return buildMapCardActionsHtml; },
    get getStoryActByZoneId() { return getStoryActByZoneId; },
    get worldTreeBarkUi() { return worldTreeBarkUi; },
    get buildMapPowerEstimateHtml() { return buildMapPowerEstimateHtml; },
    get getMapPowerEstimateParts() { return getMapPowerEstimateParts; },
    get getChaosBossElements() { return getChaosBossElements; },
    get getMapEstimateElementName() { return getMapEstimateElementName; },
    get getDeepChaosMapEntryHtml() { return getDeepChaosMapEntryHtml; },
    get ORB_DB() { return ORB_DB; },
    get explorationAtlasUi() { return explorationAtlasUi; },
    get renderPixelIcon() { return renderPixelIcon; },
    get levelProgressionUi() { return levelProgressionUi; },
    get buildMapZoneGroupHtml() { return buildMapZoneGroupHtml; },
    get escapeHTML() { return escapeHTML; }
});
safeExposeGlobals({ mapListUi });
