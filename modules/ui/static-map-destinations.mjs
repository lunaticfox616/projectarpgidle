export function renderTimeRiftPanel(runtime) {

    const host = runtime.deps.document.getElementById('ui-timerift-panel');
    if (!host) return;
    runtime.deps.document.getElementById('ui-timerift-header').style.display = 'block';
    host.style.display = 'block';
    runtime.deps.sideEncounterUi.timeRiftPanel(host, (0, runtime.deps.ensureTimeRiftState)());

}

export function renderStaticSideMaps(runtime) {
    let timeRiftOpen = runtime.deps.explorationAtlasUi.discovered('map-explore-timerift');
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-timerift', timeRiftOpen);
    if (timeRiftOpen) renderTimeRiftPanel(runtime);

    let labyrinthOpen = runtime.deps.explorationAtlasUi.discovered('map-explore-labyrinth');
    runtime.deps.document.getElementById('ui-labyrinth-header').style.display = labyrinthOpen ? 'block' : 'none';
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-labyrinth', labyrinthOpen);
    if (labyrinthOpen) {
        runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById('ui-labyrinth-list'), runtime.deps.sideEncounterUi.labyrinthPanel());
    } else runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById('ui-labyrinth-list'), '');

    // 혼돈 심화 입장은 혼돈 탭의 카드 목록으로 노출한다.
    // 기존 전용 섹션/사이드 탭은 중복 표시를 피하기 위해 비우고 숨긴다.
    runtime.deps.document.getElementById('ui-deep-chaos-header').style.display = 'none';
    (0, runtime.deps.writeHtmlIfChanged)(runtime.deps.document.getElementById('ui-deep-chaos-list'), '');
    let deepChaosTabBtn = runtime.deps.document.getElementById('btn-map-explore-deep-chaos');
    if (deepChaosTabBtn) deepChaosTabBtn.style.display = 'none';
    if (runtime.deps.game.mapExploreSubtab === 'map-explore-deep-chaos') (0, runtime.deps.switchMapExploreSubtab)('map-explore-hunting');

}

export function renderStaticMeteor(runtime) {
    let meteorUnlocked = runtime.deps.explorationAtlasUi.discovered('map-explore-meteor');
    runtime.deps.document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-meteor', meteorUnlocked);

    let meteorAutoBtn = runtime.deps.document.getElementById('btn-meteor-auto-enter');
    if (meteorAutoBtn) {
        meteorAutoBtn.style.display = meteorUnlocked ? 'inline-block' : 'none';
        meteorAutoBtn.innerText = (0, runtime.deps._t)('자동입장 {value}', { value: runtime.deps.game.settings.autoEnterMeteor ? (0, runtime.deps._t)('켜짐') : (0, runtime.deps._t)('꺼짐') });
    }

    runtime.deps.sideEncounterUi.renderPanel(runtime.deps.document.getElementById('ui-meteor-list'), meteorUnlocked ? runtime.deps.sideEncounterUi.meteorPanel((0, runtime.deps.buildMapPowerEstimateHtml)((0, runtime.deps.getZone)(runtime.deps.METEOR_FALL_ZONE_ID))) : '');

}

export function renderStaticRealmMaps(runtime) {
    runtime.deps.atlasUi.render();
    (0, runtime.deps.renderChaosRealmMapPanel)();
    (0, runtime.deps.renderSkyTowerMapPanel)();
    if (runtime.deps.game.mapSubtab === 'map-tab-underworld') (0, runtime.deps.renderUnderworldMapPanel)();
    // Keep normalization/unlock timing independent from the selected map panel.
    (0, runtime.deps.ensureOceanState)();
    if (runtime.deps.game.mapSubtab === 'map-tab-ocean') runtime.deps.oceanDiveUi.render();
    if (runtime.deps.game.mapSubtab === 'map-tab-fishing') {
        runtime.deps.fishingUi.render();
    }

}

export function renderStaticTrials(runtime) {
    let availTrials = runtime.deps.explorationAtlasUi.trials().sort((a, b) => Number(runtime.deps.game.completedTrials.includes(a.id)) - Number(runtime.deps.game.completedTrials.includes(b.id)));
    runtime.deps.document.getElementById('ui-trials-header').style.display = availTrials.length > 0 ? 'block' : 'none';
    (0, runtime.deps.setExploreSubtabAvailable)('map-explore-trials', availTrials.length > 0);
    runtime.deps.sideEncounterUi.refreshDestinations();
    (0, runtime.deps.renderMapExploreNotiDots)();

    (0, runtime.deps.renderLoop9VoidRiftPanel)();
    (0, runtime.deps.renderTrialMapList)(availTrials);
    (0, runtime.deps.renderMobileMapNavigation)();
}
