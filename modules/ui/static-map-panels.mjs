import { renderStaticSideMaps, renderStaticMeteor, renderStaticRealmMaps, renderStaticTrials } from './static-map-destinations.mjs';

export function renderStaticMaps(runtime) {
    let mapTabActive = (runtime.deps.document.getElementById('tab-map') || {}).classList.contains('active');
    let activeMapExploreId = runtime.deps.game.mapExploreSubtab || 'map-explore-hunting';
    // 벌집 진행 상태 갱신은 UI 표시와 무관하게 항상 돌아야 한다.
    // (awaitingClear -> pendingChoice 전환이 여기서 처리됨)
    (0, runtime.deps.renderLoop8BeehivePanel)(mapTabActive && activeMapExploreId === 'map-explore-beehive');
    if (mapTabActive && activeMapExploreId === 'map-explore-colony') (0, runtime.deps.renderLoop15ColonyPanel)();
    if (mapTabActive) {
        renderStaticHuntingMaps(runtime);
        renderStaticBossMaps(runtime);
        renderStaticSideMaps(runtime);
        renderStaticMeteor(runtime);
        renderStaticRealmMaps(runtime);
        renderStaticTrials(runtime);
    }
    return mapTabActive;
}

export function renderStaticHuntingMaps(runtime) {
    let legacyMapOverview = runtime.deps.document.querySelector('#tab-map .map-overview-card');
    if (legacyMapOverview) legacyMapOverview.remove();

    let seasonMapCap = typeof runtime.deps.getVisibleHuntingMapCapZoneId === 'function' ? (0, runtime.deps.getVisibleHuntingMapCapZoneId)() : Math.min((0, runtime.deps.getCurrentSeasonFinalZoneId)(), (0, runtime.deps.getAbyssZoneIdForDepth)(20));
    let highestMapZone = Math.min(Math.max(0, Math.floor(runtime.deps.game.maxZoneId || 0)), seasonMapCap);
    let mapZones = Array.from({ length: highestMapZone + 1 }, (_, idx) => (0, runtime.deps.getZone)(idx)).filter(Boolean);
    let recommendedHuntingZone = (0, runtime.deps.getRecommendedHuntingZone)(mapZones);
    let recommendedHuntingZoneId = recommendedHuntingZone ? Number(recommendedHuntingZone.id) : null;
    let mapRouteSummary = runtime.deps.document.getElementById('ui-map-route-summary');
    let routeSummaryHtml = (0, runtime.deps.buildMapRouteSummaryHtml)((0, runtime.deps.getZone)(runtime.deps.game.currentZoneId), recommendedHuntingZone);
    (0, runtime.deps.writeHtmlIfChanged)(mapRouteSummary, routeSummaryHtml);
    // 나무(일반 사냥터)와 혼돈을 탐험 좌측 세부 탭으로 나눠 그린다(js/map-list-ui.js: 액트 카드, 혼돈 층 타일).
    runtime.deps.mapListUi.render(mapZones, recommendedHuntingZoneId);
    for (const route of ['map-explore-chaos', 'map-explore-beehive', 'map-explore-voidrift', 'map-explore-colony']) {
        (0, runtime.deps.setExploreSubtabAvailable)(route, runtime.deps.explorationAtlasUi.discovered(route));
    }
    let boundaryState = (0, runtime.deps.ensureBeyondBoundaryState)(runtime.deps.game);
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-beyond', runtime.deps.explorationAtlasUi.discovered('map-explore-beyond'));
    if (boundaryState.unlocked) (0, runtime.deps.renderBeyondBoundaryPanel)();

}

export function renderStaticBossMaps(runtime) {
    let seasonBosses = runtime.deps.explorationAtlasUi.bosses();
    runtime.deps.document.getElementById('ui-season-boss-header').style.display = seasonBosses.length > 0 ? 'block' : 'none';
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-root-boss', seasonBosses.length > 0);
    let seasonBossRepeatWrap = runtime.deps.document.getElementById('ui-season-boss-repeat-wrap');
    let seasonBossRepeatBtn = runtime.deps.document.getElementById('btn-season-boss-repeat');
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = 'none';
    if (seasonBossRepeatBtn) {
        seasonBossRepeatBtn.style.display = seasonBosses.length > 0 ? 'inline-block' : 'none';
        seasonBossRepeatBtn.innerText = (0, runtime.deps._t)('입장권 보스 반복 {value}', { value: runtime.deps.game.autoRepeatSeasonBoss ? (0, runtime.deps._t)('켜짐') : (0, runtime.deps._t)('꺼짐') });
        seasonBossRepeatBtn.style.background = runtime.deps.game.autoRepeatSeasonBoss ? '#2f6a42' : '#5b4a2f';
        seasonBossRepeatBtn.style.minWidth = '0';
    }
    runtime.deps.mapListUi.renderBosses(seasonBosses);

}
