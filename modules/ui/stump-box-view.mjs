import { clearStumpFrameMotion, clearStumpTabBinding, initializeStumpSelection } from './stump-board-lifetime.mjs';
import { moveEquipmentBag } from './stump-board-render.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { stumpRuleLineHtml } from './stump-board-summary.mjs';
import { stumpStorageCard, stumpFilterMatch, stumpStateMatch, compareStorageItems } from './stump-board-storage.mjs';
import { onStumpTabClick, onStumpTabDoubleClick, onStumpSelectionChange, onStumpOutsidePress, onBagDoubleClick } from './stump-board-input.mjs';
import { refreshStumpTabIfVisible, placeStumpDetail, renderStumpBoxTab, refreshStumpTabNow, syncEquipmentBag, frameShowsCube } from './stump-board-render.mjs';
import { stumpRipeName, checkStumpBoxUnlock, announceStumpChange } from './stump-board-notices.mjs';
import { emptyStumpCube, emptyStumpBoard, switchFrame, toggleRightView, pressNurseryGem, pressFrameButton, autoMergeStump } from './stump-board-frame.mjs';
import { unplaceAllStump, revealMoreTab, dropOnCell, dropOnStorage, showStoragePage, dropOnCube, dropCubeItem, claimReward, previewCell, hoverCell, beginStumpGuideView, showStumpRules, clickStumpCell, applyPlacement, undoPlacement, selectStumpItem, compostStumpItem, discardStumpSeed, monetizeStumpItem, toggleStumpLock, bulkStump, unsealTalisman, commitStumpChange, discardTalisman, graftStumpCell, sealStumpCell, discardScar } from './stump-board-actions.mjs';
import { tipFor, itemTipHtml } from './stump-board-detail.mjs';
import { placementTip, clearPlacementPreview, cancelPlacement } from './stump-board-placement.mjs';

export function createStumpBoxView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { stumpRuleLineHtml, stumpStorageCard, stumpFilterMatch, stumpStateMatch, compareStorageItems, onStumpTabClick, onStumpTabDoubleClick, onStumpSelectionChange, refreshStumpTabIfVisible, placeStumpDetail, onStumpOutsidePress, onBagDoubleClick, stumpRipeName, emptyStumpCube, emptyStumpBoard, unplaceAllStump, renderStumpBoxTab, refreshStumpTabNow, revealMoreTab, checkStumpBoxUnlock, tipFor, dropOnCell, dropOnStorage, showStoragePage, dropOnCube, dropCubeItem, claimReward, itemTipHtml, previewCell, hoverCell, placementTip, clearPlacementPreview, syncEquipmentBag, frameShowsCube, beginStumpGuideView };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpBoxViewApi(runtime);
    installStumpBoxViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    initializeStumpSelection(runtime);
    initializeStumpConstants(runtime);
    runtime.state.ACTIONS = {};
    initializeStumpActions0(runtime);
    initializeStumpActions1(runtime);
    initializeStumpActions2(runtime);
}
function initializeStumpConstants(runtime) {
    runtime.state.COLORS = Object.keys(runtime.deps.STUMP_BOX_COLORS);
    runtime.state.TALISMAN_CURRENCIES = ['sealShard', 'strongSealShard', 'radiantSealShard', 'beeswax'];
    runtime.state.bound = false;
    runtime.state.ticker = null;
    runtime.state.frameSwitching = false;
    runtime.state.firedTimer = 0;
    runtime.state.FRAME_FIRE_MS = 320;
    runtime.state.detailGuard = 0;
    runtime.state.DETAIL_GUARD_MS = 450;
    runtime.state.FRAME_REVEAL_MS = 700;
    runtime.state.STORAGE_PAGE_CELLS = 100;
    runtime.state.STORAGE_STATES = { all: '모든 상태', ripe: '성장 완료', unripe: '성장 전', locked: '잠금' };
    runtime.state.STORAGE_SORTS = { manual: '직접 배치', 'quality-desc': '품질 높은 순', 'quality-asc': '품질 낮은 순', name: '이름순', recent: '최근 획득순' };
    runtime.state.NO_EFFECT = Object.freeze({ suppressed: new Set(), stoppedBy: {}, synergy: {}, groups: { resonance: [], discipline: [], feed: [] },
        resonant: new Set(), values: {}, extras: {} });
    runtime.state.FRAME_NAME_TONES = Object.freeze({ '그루터기 함': '#e8a95a', '조합창': '#6fd0e6', '생육함': '#8fd17a' });
    runtime.state.FRAME_BUTTONS = Object.freeze({
        top: button => switchFrame(runtime, button, runtime.state.frameView === 'box' ? 'cube' : 'box'),
        left: () => toggleRightView(runtime),
        right: () => ({ cube: runtime.handlers.emptyStumpCube, box: runtime.handlers.emptyStumpBoard, nursery: runtime.handlers.unplaceAllStump })[runtime.state.frameView](),
        bottom: button => pressNurseryGem(runtime, button)
    });
    runtime.state.RULES_BUTTON = '<button type="button" class="stump-rules-button" data-stump-action="rules" data-tip="그루터기 함 규칙" aria-label="그루터기 함 규칙" aria-haspopup="dialog"><span class="px-center">?</span></button>';
    runtime.state.STUMP_MORE_BODIES = Object.freeze({
        harvest: () => runtime.deps.stumpHarvestUi.journalHtml(),
        unlocks: () => runtime.deps.stumpHarvestUi.unlocksHtml(),
        wallet: () => runtime.deps.stumpHarvestUi.walletHtml(runtime.state.frameView === 'cube'),
        talisman: () => runtime.deps.stumpTalismanUi.unsealHtml() + runtime.deps.stumpRipeningUi.codexHtml()
    });
    runtime.state.rulesDialog = null;
    runtime.state.STUMP_LOG_ICONS = Object.freeze({ talisman: '🧿', scar: '🔥' });
}
function initializeStumpActions0(runtime) {
    Object.assign(runtime.state.ACTIONS, {
        rules: () => showStumpRules(runtime),
        cell: (data, button, event) => clickStumpCell(runtime, Number(data.cell), event.pointerType === 'touch' || event.detail === 0
                || runtime.deps.uiDisplay.matches('(hover: none), (max-width: 680px)')),
        'placement-apply': () => applyPlacement(runtime),
        'placement-cancel': () => cancelPlacement(runtime),
        'placement-undo': () => undoPlacement(runtime),
        'unplace-all': () => unplaceAllStump(runtime),
        compare: () => { runtime.state.compareOpen = !runtime.state.compareOpen; renderStumpBoxTab(runtime, true); },
        item: data => selectStumpItem(runtime, Number(data.item)),
        storage: () => { if (runtime.state.selectedId !== null) dropOnStorage(runtime, runtime.state.selectedId); },
        unplace: () => { if (runtime.state.selectedId !== null) dropOnStorage(runtime, runtime.state.selectedId); },
        compost: () => compostStumpItem(runtime),
        discard: () => discardStumpSeed(runtime),
        monetize: () => monetizeStumpItem(runtime),
        'wallet-put': data => runtime.deps.stumpCubeUi.putWalletUnit(data.key),
        lock: () => toggleStumpLock(runtime),
        bulk: data => bulkStump(runtime, data.kind),
        'more-tab': data => { runtime.state.moreOpen = !(runtime.state.moreOpen && runtime.state.moreTab === data.tab); runtime.state.moreTab = data.tab; renderStumpBoxTab(runtime, true); },
        'frame-button': (data, button) => pressFrameButton(runtime, data.side, button)
    });
}
function initializeStumpActions1(runtime) {
    Object.assign(runtime.state.ACTIONS, {
        'frame-action': () => runtime.deps.stumpCubeUi.transmuteCube(),
        'auto-merge': () => autoMergeStump(runtime),
        summary: () => { runtime.state.summaryOpen = !runtime.state.summaryOpen; renderStumpBoxTab(runtime, true); },
        'storage-page': data => { runtime.state.storagePage = Number(data.page) || 0; renderStumpBoxTab(runtime, true); },
        deselect: () => selectStumpItem(runtime, null),
        rewards: () => runtime.deps.stumpHarvestUi.openRewards(),
        filter: data => { runtime.state.colorFilter = data.filter; runtime.state.storagePage = 0; renderStumpBoxTab(runtime, true); },
        'talisman-unseal': data => unsealTalisman(runtime, data.source),
        'talisman-exchange': data => { if (runtime.deps.stumpTalismanUi.exchange(Number(data.index))) commitStumpChange(runtime); },
        'talisman-wax': () => { if (runtime.deps.stumpTalismanUi.wax(runtime.state.selectedId)) commitStumpChange(runtime); },
        'talisman-turn': () => { if (runtime.deps.stumpTalismanUi.turn(runtime.state.selectedId)) commitStumpChange(runtime); },
        'talisman-discard': () => discardTalisman(runtime),
        'graft-raise': data => graftStumpCell(runtime, Number(data.cell), true),
        'graft-lower': data => graftStumpCell(runtime, Number(data.cell), false),
        seal: data => sealStumpCell(runtime, Number(data.cell)),
        'scar-discard': () => discardScar(runtime),
        'cube-cell': data => runtime.deps.stumpCubeUi.takeOutCubeCell(Number(data.cell)),
        'cube-open': (data, button, event) => { if (event.detail < 2) runtime.deps.stumpCubeUi.openCubePicker(); }
    });
}
function initializeStumpActions2(runtime) {
    Object.assign(runtime.state.ACTIONS, {
        'cube-quick': data => runtime.deps.stumpCubeUi.quickFillCube(data.recipe),
        'recipe-book': (data, button) => runtime.deps.stumpCubeUi.openRecipeBook(button)
    });
}


function installStumpBoxViewEvents(runtime) {
    if (typeof runtime.deps.window !== 'undefined' && typeof runtime.deps.window.addEventListener === 'function') {
        listenView(runtime, runtime.deps.window, 'project-idle:stump-box-changed', event => announceStumpChange(runtime, event.detail || {}));
    }
}
function StumpBoxViewApi(runtime) {
    return {
        renderStumpBoxTab: runtime.handlers.renderStumpBoxTab,
        refreshStumpTabNow: runtime.handlers.refreshStumpTabNow,
        revealMoreTab: runtime.handlers.revealMoreTab,
        checkStumpBoxUnlock: runtime.handlers.checkStumpBoxUnlock,
        tipFor: runtime.handlers.tipFor,
        dropOnCell: runtime.handlers.dropOnCell,
        dropOnStorage: runtime.handlers.dropOnStorage,
        showStoragePage: runtime.handlers.showStoragePage,
        dropOnCube: runtime.handlers.dropOnCube,
        dropCubeItem: runtime.handlers.dropCubeItem,
        claimReward: runtime.handlers.claimReward,
        itemTipHtml: runtime.handlers.itemTipHtml,
        previewCell: runtime.handlers.previewCell,
        hoverCell: runtime.handlers.hoverCell,
        placementTip: runtime.handlers.placementTip,
        clearPlacementPreview: runtime.handlers.clearPlacementPreview,
        syncEquipmentBag: runtime.handlers.syncEquipmentBag,
        frameShowsCube: runtime.handlers.frameShowsCube,
        beginStumpGuideView: runtime.handlers.beginStumpGuideView,
        dispose: () => disposeStumpBoxView(runtime)
    };
}

function disposeStumpBoxView(runtime) {
    releaseViewEvents(runtime);
    clearStumpTabBinding(runtime);
    clearStumpFrameMotion(runtime);
    runtime.deps.clearInterval(runtime.state.ticker);
    runtime.deps.clearTimeout(runtime.state.detailGuard);
    runtime.state.ticker = runtime.state.detailGuard = 0;
    const panel = runtime.deps.document.getElementById('stump-box-detail');
    if (panel) { if (panel.matches(':popover-open')) panel.hidePopover(); panel.inert = false; }
    runtime.state.rulesDialog?.close();
    runtime.state.rulesDialog?.remove();
    runtime.state.rulesDialog = null;
    moveEquipmentBag(runtime, false);
}
