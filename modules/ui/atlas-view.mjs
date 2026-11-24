import { enterHub, leaveHub } from './atlas-wheel-hub.mjs';
import { mapName } from './atlas-view-model.mjs';
import { itemFind, leafFind, yarnFind, currencyFind } from './atlas-view-results.mjs';
import { setView, refresh, openPanel, selectNode, selectMap, revealDevice, revealStash, craft, flowerOmen, goldenFlowerOmen, discard, bulkDiscard, combine, combineAll, toggleFragment, open, openGate, reenter, abandon, toggleAuto, toggleAutoGuardians, openNode, activateSextant, toggleDew, toggleCraft, showProgress } from './atlas-view-actions.mjs';
import { render, updateHud, pages, progressLine, journeyState, mapsViewHtml } from './atlas-view-screen.mjs';
import { announce } from './atlas-view-announcements.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createAtlasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { mapName, itemFind, leafFind, yarnFind, currencyFind, setView, render, refresh, updateHud, openPanel, pages, progressLine, journeyState, selectNode, openNode, selectMap, revealDevice, revealStash, craft, flowerOmen, goldenFlowerOmen, discard, bulkDiscard, combine, combineAll, toggleFragment, open, openGate, reenter, abandon, toggleAuto, toggleAutoGuardians, activateSextant, toggleDew, toggleCraft, showProgress };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.enterHub = () => enterHub(runtime);
    runtime.handlers.leaveHub = () => leaveHub(runtime);
    runtime.api = Object.freeze({ enterHub: runtime.handlers.enterHub, leaveHub: runtime.handlers.leaveHub, dispose: () => disposeAtlasScreen(runtime), render: runtime.handlers.render, refresh: runtime.handlers.refresh, updateHud: runtime.handlers.updateHud, openPanel: runtime.handlers.openPanel, setView: runtime.handlers.setView, pages: runtime.handlers.pages, progressLine: runtime.handlers.progressLine, journey: runtime.handlers.journeyState, selectNode: runtime.handlers.selectNode, openNode: runtime.handlers.openNode, selectMap: runtime.handlers.selectMap, revealDevice: runtime.handlers.revealDevice, revealStash: runtime.handlers.revealStash, craft: runtime.handlers.craft, flowerOmen: runtime.handlers.flowerOmen, goldenFlowerOmen: runtime.handlers.goldenFlowerOmen, discard: runtime.handlers.discard, bulkDiscard: runtime.handlers.bulkDiscard, combine: runtime.handlers.combine, combineAll: runtime.handlers.combineAll, toggleFragment: runtime.handlers.toggleFragment, open: runtime.handlers.open, openGate: runtime.handlers.openGate, reenter: runtime.handlers.reenter, abandon: runtime.handlers.abandon, toggleAuto: runtime.handlers.toggleAuto, toggleAutoGuardians: runtime.handlers.toggleAutoGuardians, activateSextant: runtime.handlers.activateSextant, toggleDew: runtime.handlers.toggleDew, toggleCraft: runtime.handlers.toggleCraft, showProgress: runtime.handlers.showProgress });
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
    runtime.state.selectedUid = null;
    runtime.state.useDew = false;
    runtime.state.craftOpen = false;
    runtime.state.progressFace = 'progress';
    runtime.state.resultSeen = null;
    // 천문도의 표지 중 고를 수 있는 것: 시작 육분의, 피나클 장치(외부 피나클 둘이 선다).
    runtime.state.MARKS = Object.freeze(['entry', 'device']);
    runtime.state.view = 'maps';
    runtime.state.panelObserver = null;
    runtime.state.bloomedUid = null;
    runtime.state.STATUS = { locked: '잠김', open: '열림', complete: '완료', bonus: '완료', failed: '실패' };
    runtime.state.CRAFT_ORDER = ['magicBud', 'sapBud', 'formlessDew', 'blightSpore', 'pruningShears', 'goldenRule', 'deepWhetstone', 'emberBranch'];
    runtime.state.FLOWER_COLORS = Object.keys(runtime.deps.LOOT_OMENS.flowers);
    runtime.state.LEAF_RANK = 1.5;
    runtime.state.VIEW_TABS = Object.freeze([['maps', '지도'], ['passives', '패시브'], ['late', '최종'], ['memory', '기억'], ['epoch', '시대'], ['board', '나이테 원정']]);
    runtime.state.VIEWS = { maps: () => mapsViewHtml(runtime), passives: () => runtime.deps.atlasPassivesUi.html(), epoch: () => runtime.deps.atlasEpochUi.html(), late: () => runtime.deps.atlasEndgameUi.html(),
        memory: () => runtime.deps.memoryDungeonUi.html(), board: () => runtime.deps.atlasBoardUi.html() };
    runtime.state.RUN_KIND = { pinnacle: '정점', apex: '최종 보스', league: '리그 우두머리' };
    runtime.state.REASON = { defeat: '쓰러졌습니다', travel: '지도를 떠났습니다', '마을 귀환': '마을로 귀환했습니다' };
}
