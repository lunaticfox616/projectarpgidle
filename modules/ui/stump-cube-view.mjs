import { releaseViewEvents } from './view-events.mjs';
import { stopStumpBookMotion } from './stump-book-motion.mjs';
import { entryHtml, cubeHtml, cubeGridHtml, cubeSignature, recipeToneHtml } from './stump-cube-markup.mjs';
import { resultCardHtml, inspectCubeResult } from './stump-cube-picker.mjs';
import { onBookClick, bookButtonHtml, openRecipeBook } from './stump-recipe-book.mjs';
import { openCubePicker, closeCubePicker, selectCubeItem, pickCubeItem, takeOutCubeCell, moveCubeItem, transmuteCube, putStumpItem, putWalletUnit, quickFillCube, putBagItem } from './stump-cube-actions.mjs';

export function createStumpCubeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { entryHtml, resultCardHtml, onBookClick, cubeHtml, cubeGridHtml, cubeSignature, openCubePicker, closeCubePicker, selectCubeItem, pickCubeItem, inspectCubeResult, takeOutCubeCell, moveCubeItem, transmuteCube, recipeToneHtml, putStumpItem, putWalletUnit, quickFillCube, putBagItem, bookButtonHtml, openRecipeBook };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpCubeViewApi(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.owner = runtime.deps.game;
    runtime.state.bookAnimations = new Set();
    runtime.state.OVERLAY_ID = 'stump-cube-picker';
    runtime.state.KIND_LABELS = { equipment: '장비', stump: '그루터기', jewel: '주얼', core: '코어', wallet: '화폐화' };
    runtime.state.pickerKind = 'equipment';
    runtime.state.pickerItems = [];
    runtime.state.pickerSelection = null;
    runtime.state.lastResult = null;
    runtime.state.ICONS = Object.freeze({
        equipment: item => (0, runtime.deps.getEquipmentGridVisualAsset)(item),
        stump: item => runtime.deps.stumpBox.iconPath(item),
        wallet: item => runtime.deps.stumpBox.iconPath(item),
        jewel: item => (0, runtime.deps.getInventoryItemVisualAsset)(item, 'jewel'),
        core: item => runtime.deps.coreItems.icon(item)
    });
    runtime.state.GROUP_TONES = Object.freeze({ 장비: '#e6c67f', 그루터기: '#9fd46a', 부적: '#c9a0f0', 주얼: '#7fd6cf', 코어: '#f0a35a' });
    runtime.state.KIND_TONES = Object.freeze([['장신구', '#e6c67f'], ['장비', '#e6c67f'], ['씨앗', '#9fd46a'], ['꽃', '#f0a8c8'], ['열매', '#e8955a'],
        ['덩굴', '#7cc9a0'], ['뿌리', '#d0a070'], ['부적', '#c9a0f0'], ['주얼', '#7fd6cf'], ['코어', '#f0a35a'], ['기폭제', '#f3d28c'], ['기름', '#f3d28c']]);
    runtime.state.recipeTone = null;
    runtime.state.bookDialog = null;
    runtime.state.bookSpread = 0;
    runtime.state.bookOpening = 0;
    runtime.state.bookButton = null;
    runtime.state.bookTurning = null;
    runtime.state.BOOK_GROW_MS = 360;
    runtime.state.BOOK_FRAME_MS = 104;
    runtime.state.BOOK_STRIP = 8;
    runtime.state.BOOK_OPEN = [0, 1, 2, 3, 4];
    runtime.state.BOOK_TURN = [5, 6, 7, 4];
}


function StumpCubeViewApi(runtime) {
    return Object.freeze({
        cubeHtml: runtime.handlers.cubeHtml,
        cubeGridHtml: runtime.handlers.cubeGridHtml,
        cubeSignature: runtime.handlers.cubeSignature,
        openCubePicker: runtime.handlers.openCubePicker,
        closeCubePicker: runtime.handlers.closeCubePicker,
        selectCubeItem: runtime.handlers.selectCubeItem,
        pickCubeItem: runtime.handlers.pickCubeItem,
        inspectCubeResult: runtime.handlers.inspectCubeResult,
        takeOutCubeCell: runtime.handlers.takeOutCubeCell,
        moveCubeItem: runtime.handlers.moveCubeItem,
        transmuteCube: runtime.handlers.transmuteCube,
        recipeToneHtml: runtime.handlers.recipeToneHtml,
        putStumpItem: runtime.handlers.putStumpItem,
        putWalletUnit: runtime.handlers.putWalletUnit,
        quickFillCube: runtime.handlers.quickFillCube,
        putBagItem: runtime.handlers.putBagItem,
        bookButtonHtml: runtime.handlers.bookButtonHtml,
        openRecipeBook: runtime.handlers.openRecipeBook,
        dispose: () => disposeStumpCubeView(runtime)
    });
}

function disposeStumpCubeView(runtime) {
    releaseViewEvents(runtime);
    stopStumpBookMotion(runtime);
    if (runtime.state.pickerPanel?.isConnected) runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
    if (runtime.state.resultPanel?.isConnected) runtime.deps.selectionDialog.close('stump-cube-result');
    runtime.state.bookDialog?.close();
    runtime.state.bookDialog?.remove();
    runtime.state.bookDialog = runtime.state.pickerPanel = runtime.state.resultPanel = null;
}
