import { listenView, releaseViewEvents } from './view-events.mjs';
import { initializeUnlockSelection, releaseUnlockPanel } from './unlock-tree-lifetime.mjs';
import { boardTextWidth, boardIsStep, boardFamilyOf } from './unlock-tree-metrics.mjs';
import { boardBuilt, boardLayout, boardEdgePoints, createBoardPlaceAlong, createBoardClearRun } from './unlock-tree-layout.mjs';
import { stateOf, readyRows, tipOf, nodeClass, unseenIds, nodeHtml, edgesHtml, nowEntry, nowLeft, railLabelsHtml, canvasHtml, overviewHtml, pointsHtml, headHtml, view_parentsOpen, view_openCount, view_unseenHtml } from './unlock-tree-markup.mjs';
import { upgradeEffect, gainOf, cardGain, view_cardName } from './unlock-tree-labels.mjs';
import { goalHtml, planStepsHtml, planHtml, lifecycleSummaryHtml, pinHtml, lifecycleHtml, relatedHtml, loreHtml, moreHtml, nextHtml, actionHtml, requirementsHtml, detailDescriptionHtml, detailHtml } from './unlock-tree-detail.mjs';
import { settleSelection, readMarks, readPlans, render, fillBoard, syncOverlays, scrollToNode, select, jumpOffscreen, cycleReady, pin, handleClick, markPath, startPan, startOverview, onPointerDown, onWheel, bindPanel } from './unlock-tree-render.mjs';

export function createUnlockTreeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [], frames: new Set() };
    const handlers = { boardTextWidth, boardIsStep, boardBuilt, boardLayout, boardEdgePoints, boardFamilyOf, stateOf, readyRows, upgradeEffect, gainOf, cardGain, tipOf, nodeClass, unseenIds, nodeHtml, edgesHtml, nowEntry, nowLeft, railLabelsHtml, canvasHtml, overviewHtml, pointsHtml, headHtml, goalHtml, planStepsHtml, planHtml, lifecycleSummaryHtml, pinHtml, lifecycleHtml, relatedHtml, loreHtml, moreHtml, nextHtml, actionHtml, requirementsHtml, detailDescriptionHtml, detailHtml, settleSelection, readMarks, readPlans, render, fillBoard, syncOverlays, scrollToNode, select, jumpOffscreen, cycleReady, pin, handleClick, markPath, startPan, startOverview, onPointerDown, onWheel, bindPanel, view_parentsOpen, view_openCount, view_cardName, view_unseenHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);
    runtime.handlers.boardPlaceAlong = createBoardPlaceAlong(runtime);
    runtime.handlers.boardClearRun = createBoardClearRun();
    runtime.api = UnlockTreeViewApi(runtime);
    installUnlockTreeViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.UNLOCK_BOARD_SIZE = Object.freeze({ cardGap: 10, minCardText: 36, gainFrom: 32, left: 38, ruler: 24, pip: 44, pipH: 22, minPitch: 24, maxPitch: 52, maxCard: 44, minRows: 8, maxRows: 24 });
    runtime.state.UNLOCK_FAMILIES = Object.freeze([
        { id: 'gear', root: 'craft', side: -1, at: 0.22 },
        { id: 'rune', root: 'support', side: 1, at: 0.56 },
        { id: 'growth', root: 'loopTree', side: 1, at: 0.84 }
    ]);
    runtime.state.UNLOCK_LOOSE_FAMILY = Object.freeze({ passiveTree: 'growth', deepChaos: 'rune' });
    runtime.state.UNLOCK_UNSEEN_STATES = Object.freeze(new Set(['ready', 'short', 'owned']));
    runtime.state.boardSIZE = runtime.state.UNLOCK_BOARD_SIZE;
    runtime.state.boardById = new Map(runtime.deps.CONTENT_UNLOCK_CATALOG.map(def => [def.id, def]));
    runtime.state.boardRows = runtime.deps.CONTENT_UNLOCK_CATALOG.filter(def => def.minLoop > 1);
    runtime.state.boardBase = null;
    runtime.state.unlockBoard = Object.freeze({ rows: runtime.state.boardRows, built: runtime.handlers.boardBuilt, layout: runtime.handlers.boardLayout, edgePoints: runtime.handlers.boardEdgePoints, familyOf: runtime.handlers.boardFamilyOf, isStep: runtime.handlers.boardIsStep, has: id => runtime.state.boardRows.some(def => def.id === id) });
    initializeUnlockSelection(runtime);
}

function UnlockTreeViewApi(runtime) {
    const names = [
        "stateOf", "readyRows", "upgradeEffect", "gainOf", "cardGain", "tipOf",
        "nodeClass", "unseenIds", "nodeHtml", "edgesHtml", "nowEntry", "nowLeft",
        "railLabelsHtml", "canvasHtml", "overviewHtml", "pointsHtml", "headHtml", "goalHtml",
        "planStepsHtml", "planHtml", "lifecycleSummaryHtml", "pinHtml", "lifecycleHtml", "relatedHtml",
        "loreHtml", "moreHtml", "nextHtml", "actionHtml", "requirementsHtml", "detailDescriptionHtml",
        "detailHtml", "settleSelection", "readMarks", "readPlans", "render", "fillBoard",
        "syncOverlays", "scrollToNode", "select", "jumpOffscreen", "cycleReady", "pin",
        "handleClick", "markPath", "startPan", "startOverview", "onPointerDown", "onWheel",
        "bindPanel"
    ];
    const api = Object.fromEntries(names.map(name => [name, runtime.handlers[name]]));
    api.unlockBoard = runtime.state.unlockBoard;
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(UnlockTreeViewFields(runtime)));
    Object.defineProperties(api, Object.getOwnPropertyDescriptors(UnlockTreeLayoutFields(runtime)));
    api.dispose = () => disposeUnlockTreeView(runtime);
    return api;
}

function UnlockTreeViewFields(runtime) {
    return {
        get selectedId() { return runtime.state.view_selectedId; },
        set selectedId(value) { runtime.state.view_selectedId = value; },
        get shownKey() { return runtime.state.view_shownKey; },
        set shownKey(value) { runtime.state.view_shownKey = value; },
        get centerNow() { return runtime.state.view_centerNow; },
        set centerNow(value) { runtime.state.view_centerNow = value; },
        get revealId() { return runtime.state.view_revealId; },
        set revealId(value) { runtime.state.view_revealId = value; },
        get jump() { return runtime.state.view_jump; },
        set jump(value) { runtime.state.view_jump = value; },
        get shownOwned() { return runtime.state.view_shownOwned; },
        set shownOwned(value) { runtime.state.view_shownOwned = value; },
        get shownOpenParents() { return runtime.state.view_shownOpenParents; },
        set shownOpenParents(value) { runtime.state.view_shownOpenParents = value; },
    };
}

function UnlockTreeLayoutFields(runtime) {
    return {
        get layoutNow() { return runtime.state.view_layoutNow; },
        set layoutNow(value) { runtime.state.view_layoutNow = value; },
        get plannedPath() { return runtime.state.view_plannedPath; },
        set plannedPath(value) { runtime.state.view_plannedPath = value; },
        get parentsOpen() { return runtime.handlers.view_parentsOpen; },
        set parentsOpen(value) { runtime.handlers.view_parentsOpen = value; },
        get openCount() { return runtime.handlers.view_openCount; },
        set openCount(value) { runtime.handlers.view_openCount = value; },
        get cardName() { return runtime.handlers.view_cardName; },
        set cardName(value) { runtime.handlers.view_cardName = value; },
        get unseenHtml() { return runtime.handlers.view_unseenHtml; },
        set unseenHtml(value) { runtime.handlers.view_unseenHtml = value; },
        get shownSeason() { return runtime.state.view_shownSeason; },
        set shownSeason(value) { runtime.state.view_shownSeason = value; }
    };
}

function installUnlockTreeViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', event => runtime.api.handleClick(event));
    listenView(runtime, runtime.deps.window, 'game:languagechange', () => runtime.api.render());
}

function disposeUnlockTreeView(runtime) {
    if (!runtime.active) return;
    releaseUnlockPanel(runtime);
    releaseViewEvents(runtime);
}
