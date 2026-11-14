import { mapName, nodeLabel } from './atlas-view-model.mjs';
import { nodeHtml, linkModel, stashRowHtml, hint, paintChart } from './atlas-view-map.mjs';
import { itemFind, leafFind, yarnFind, currencyFind } from './atlas-view-results.mjs';
import { setView, refresh, openPanel, selectRegion, selectNode, selectMap, revealDevice, revealStash, craft, flowerOmen, goldenFlowerOmen, discard, discardLow, combine, combineAll, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto, toggleAutoGuardians, openNode } from './atlas-view-actions.mjs';
import { render, updateHud, pages, progressLine, journeyState, mapsViewHtml } from './atlas-view-screen.mjs';
import { announce } from './atlas-view-announcements.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { mapName, nodeHtml, linkModel, stashRowHtml, itemFind, leafFind, yarnFind, currencyFind, setView, render, refresh, updateHud, openPanel, pages, progressLine, journeyState, selectRegion, selectNode, openNode, selectMap, revealDevice, revealStash, hint, nodeLabel, craft, flowerOmen, goldenFlowerOmen, discard, discardLow, combine, combineAll, toggleFragment, open, openPinnacle, reenter, abandon, toggleAuto, toggleAutoGuardians };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ dispose: () => disposeAtlasScreen(runtime), render: runtime.handlers.render, refresh: runtime.handlers.refresh, updateHud: runtime.handlers.updateHud, openPanel: runtime.handlers.openPanel, setView: runtime.handlers.setView, pages: runtime.handlers.pages, progressLine: runtime.handlers.progressLine, journey: runtime.handlers.journeyState, selectRegion: runtime.handlers.selectRegion, selectNode: runtime.handlers.selectNode, openNode: runtime.handlers.openNode, selectMap: runtime.handlers.selectMap, revealDevice: runtime.handlers.revealDevice, revealStash: runtime.handlers.revealStash, hint: runtime.handlers.hint, nodeLabel: runtime.handlers.nodeLabel, craft: runtime.handlers.craft, flowerOmen: runtime.handlers.flowerOmen, goldenFlowerOmen: runtime.handlers.goldenFlowerOmen, discard: runtime.handlers.discard, discardLow: runtime.handlers.discardLow, combine: runtime.handlers.combine, combineAll: runtime.handlers.combineAll, toggleFragment: runtime.handlers.toggleFragment, open: runtime.handlers.open, openPinnacle: runtime.handlers.openPinnacle, reenter: runtime.handlers.reenter, abandon: runtime.handlers.abandon, toggleAuto: runtime.handlers.toggleAuto, toggleAutoGuardians: runtime.handlers.toggleAutoGuardians });
    runtime.onMap = event => announce(runtime, event.detail);
    runtime.deps.window.addEventListener('project-idle:atlas-map', runtime.onMap);
    return runtime.api;
}

function disposeAtlasScreen(runtime) {
    runtime.deps.window.removeEventListener('project-idle:atlas-map', runtime.onMap);
    runtime.state.panelObserver?.disconnect();
    runtime.state.panelObserver = null;
}

function initialize(runtime) {
    runtime.state.signature = '';
    runtime.state.hudSignature = '';
    runtime.state.selectedNode = null;
    runtime.state.selectedRegion = 'roots';
    runtime.state.selectedUid = null;
    runtime.state.view = 'maps';
    runtime.state.panelObserver = null;
    runtime.state.bloomedUid = null;
    runtime.state.STATUS = { locked: '잠김', open: '열림', complete: '완료', bonus: '보너스' };
    runtime.state.STATUS_TONE = { locked: '#8d826e', open: '#f3d28c', complete: '#efe6d2', bonus: '#fff1c9' };
    runtime.state.CRAFT_ORDER = ['magicBud', 'sapBud', 'formlessDew', 'blightSpore', 'pruningShears', 'goldenRule', 'deepWhetstone', 'emberBranch'];
    runtime.state.FLOWER_COLORS = Object.keys(runtime.deps.LOOT_OMENS.flowers);
    runtime.state.PAINT = { maps: () => (runtime.deps.atlasSheetUi.on() ? runtime.deps.atlasSheetUi.paint() : paintChart(runtime)), passives: () => runtime.deps.atlasPassivesUi.paint(), epoch: () => {}, late: () => {}, memory: () => {}, board: () => {} };
    runtime.state.LEAF_RANK = 1.5;
    runtime.state.VIEW_TABS = Object.freeze([['maps', '지도'], ['passives', '패시브'], ['late', '최종'], ['memory', '기억'], ['epoch', '시대'], ['board', '나이테 원정']]);
    runtime.state.VIEWS = { maps: () => mapsViewHtml(runtime), passives: () => runtime.deps.atlasPassivesUi.html(), epoch: () => runtime.deps.atlasEpochUi.html(), late: () => runtime.deps.atlasEndgameUi.html(),
        memory: () => runtime.deps.memoryDungeonUi.html(), board: () => runtime.deps.atlasBoardUi.html() };
    runtime.state.RUN_KIND = { pinnacle: '정점', apex: '최종 보스', league: '리그 우두머리' };
    runtime.state.REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
}
