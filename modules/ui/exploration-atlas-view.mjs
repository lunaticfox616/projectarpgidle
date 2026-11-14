import { clearAtlasTurn, available, routeLabel, routeSummary, actActionsHtml, trackedRewardHtml, rewardNamesHtml, open, openAct, enter, discovered, bosses, trials, showAtlasMap, enterAtlasRegion, enterAtlasNode, page, openEntryPage, hunt, render, syncLocation, bossRewardLabel, bossEntry, rewardTooltip, bossSummary, trialRouteSummary, hiveRouteSummary, colonyRouteSummary, chaosDepthLine, meteorLine, floorProgress } from './exploration-atlas-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createExplorationAtlasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { available, routeLabel, routeSummary, actActionsHtml, trackedRewardHtml, rewardNamesHtml, open, openAct, enter, discovered, bosses, trials, showAtlasMap, enterAtlasRegion, enterAtlasNode, page, openEntryPage, hunt, render, syncLocation, bossRewardLabel, bossEntry, rewardTooltip };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = {open: runtime.handlers.open,openAct: runtime.handlers.openAct,enter: runtime.handlers.enter,available: runtime.handlers.available,discovered: runtime.handlers.discovered,bosses: runtime.handlers.bosses,trials: runtime.handlers.trials,routeLabel: runtime.handlers.routeLabel,showAtlasMap: runtime.handlers.showAtlasMap,enterAtlasRegion: runtime.handlers.enterAtlasRegion,enterAtlasNode: runtime.handlers.enterAtlasNode,page: runtime.handlers.page,openEntryPage: runtime.handlers.openEntryPage,hunt: runtime.handlers.hunt,render: runtime.handlers.render,syncLocation: runtime.handlers.syncLocation,bossRewardLabel: runtime.handlers.bossRewardLabel,bossEntry: runtime.handlers.bossEntry,rewardTooltip: runtime.handlers.rewardTooltip};

    runtime.api.dispose = () => disposeExplorationAtlasView(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.signature = '';
    runtime.state.atlasTurn = null;
    runtime.state.atlasPlate = null;
    runtime.state.discoveredBy = Object.freeze({
        'map-explore-chaos': () => Math.min(runtime.deps.game.maxZoneId, (0, runtime.deps.getVisibleHuntingMapCapZoneId)()) >= runtime.deps.ABYSS_START_ZONE_ID || (0, runtime.deps.getDeepChaosEntryState)().open,
        'map-explore-root-boss': () => bosses(runtime).length > 0,
        'map-explore-beehive': () => runtime.deps.game.season >= 8,
        'map-explore-voidrift': () => runtime.deps.game.season >= 9,
        'map-explore-colony': () => runtime.deps.game.season >= 15,
        'map-explore-beyond': () => !!runtime.deps.game.beyondBoundary?.unlocked,
        'map-explore-timerift': () => runtime.deps.game.season >= runtime.deps.TIME_RIFT_UNLOCK_LOOP,
        'map-explore-labyrinth': () => runtime.deps.game.season >= 3,
        'map-explore-meteor': () => !!runtime.deps.game.meteorSite?.unlocked,
        'map-explore-trials': () => trials(runtime).length > 0
    });
    runtime.state.ROUTE_SUMMARIES = {
        'map-explore-root-boss': () => bossSummary(runtime),
        'map-explore-trials': () => trialRouteSummary(runtime),
        'map-explore-beehive': () => hiveRouteSummary(runtime),
        'map-explore-colony': () => colonyRouteSummary(runtime),
        'map-explore-labyrinth': () => ({status:(0, runtime.deps._t)('최고 입장 {n}층', { n: runtime.deps.game.labyrinthUnlockedMaxFloor })}),
        'map-tab-chaos-realm': () => ({status:(0, runtime.deps._t)('최고 입장 {n}층', { n: runtime.deps.game.chaosRealm.highestFloor })}),
        'map-explore-chaos': () => ({status:chaosDepthLine(runtime)}),
        'map-explore-meteor': () => ({status:meteorLine(runtime)}),
        'map-tab-underworld': () => ({status:floorProgress(runtime, Math.max(0,runtime.deps.game.underworldProgress.highestFloor-1),runtime.deps.game.loopProgressCurrent.bestUnderworldFloor)}),
        'map-tab-sky': () => ({status:floorProgress(runtime, (0, runtime.deps.getClearedSkyTowerFloor)(runtime.deps.game),runtime.deps.game.loopProgressCurrent.bestSkyFloor)}),
        'map-tab-ocean': () => ({status:(0, runtime.deps._t)('현재 {depth}m, 거점 {checkpoint}m', { depth: Math.floor(runtime.deps.game.ocean.depthM), checkpoint: Math.floor(runtime.deps.game.ocean.checkpointM) })}),
        'map-tab-cosmos': () => ({status:`${(0, runtime.deps._t)('보스 격파 기록')} ${(runtime.deps.game.cosmosAtlas?.bossClears || []).length}`})
    };
    runtime.state.ROUTE_PAGES = {
        'map-explore-worldtree': () => runtime.deps.atlasUi.pages(),
        'map-tab-cosmos': () => runtime.deps.cosmosRouteUi.pages(),
        'map-tab-underworld': () => runtime.deps.underworldRuneUi.pages()
    };
    runtime.state.PAGE_NAMES = { 'map-explore-hunting': '세부 지역' };
    runtime.state.LISTING_REGIONS = new Set(['trail', 'roots']);
}

function disposeExplorationAtlasView(runtime) {
    clearAtlasTurn(runtime);
    runtime.state.atlasPlate = null;
    runtime.state.signature = '';
}
