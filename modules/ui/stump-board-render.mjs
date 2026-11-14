import { listenView } from './view-events.mjs';
import { clearStumpTabBinding, syncStumpBoardOwner } from './stump-board-lifetime.mjs';
import { stumpHeadHtml, stumpSummaryHtml, stumpMoreHtml } from './stump-board-summary.mjs';
import { stumpBoardHtml } from './stump-board-markup.mjs';
import { stumpDetailHtml } from './stump-board-detail.mjs';
import { stumpStorageHtml } from './stump-board-storage.mjs';
import { renderPlacementPreview, refreshStumpTutorial } from './stump-board-placement.mjs';

export function paintStumpPart(runtime, id, html) {
    const node = runtime.deps.document.getElementById(id);
    if (node && node.__stumpHtml !== html) { node.innerHTML = html; node.__stumpHtml = html; }
}

export function stumpTabSignature(runtime) {
    const talismanInputs = [runtime.deps.contentProgression.isUnlocked('talisman'), runtime.state.TALISMAN_CURRENCIES.map(key => Math.floor(runtime.deps.game.currencies[key] || 0))];
    const graftInputs = [runtime.state.selectedCell, runtime.deps.stumpBox.graftPoints(runtime.deps.game).free, Math.floor(runtime.deps.game.currencies.blightSpore || 0)];
    // 함 해금(보관함 한도, 뿌리 기억, 봉인 칸, 품질 상한, 씨앗 주머니 …)은 저널과 루프에서 계산된다(함이 그대로여도 바뀐다).
    const unlockInputs = [runtime.deps.stumpBox.storageLimit(runtime.deps.game), runtime.deps.stumpBox.openUnlocks(runtime.deps.game).map(row => row.id)];
    return JSON.stringify([runtime.deps.i18n.language, runtime.deps.game.stumpBox, runtime.state.selectedId, runtime.state.moreTab, runtime.state.moreOpen, runtime.state.colorFilter, runtime.state.storageSort, runtime.state.stateFilter, runtime.state.compareOpen, runtime.state.comparedId,
        runtime.deps.stumpBox.canUndoPlacement(runtime.deps.game), runtime.deps.stumpBox.openCount(runtime.deps.game), !!runtime.deps.game.woodsmanBuildLock, talismanInputs,
        graftInputs, unlockInputs, runtime.state.frameView, runtime.state.rightView, runtime.state.summaryOpen, runtime.state.storagePage, runtime.deps.stumpCubeUi.cubeSignature()]);
}

/** Called for the visible tab (renderVisibleManagementPanels) and once a second while it stays open. */
export function renderStumpBoxTab(runtime, force) {
    if (!runtime.active) return;
    syncStumpBoardOwner(runtime);
    const root = runtime.deps.document.getElementById('tab-stump');
    if (!root || !runtime.deps.game.stumpBox || !runtime.deps.game.stumpBox.acquired) return;
    bindStumpBoxTab(runtime, root);
    const key = stumpTabSignature(runtime);
    if (!force && key === runtime.state.lastSignature) return;
    runtime.state.lastSignature = key;
    const result = runtime.deps.stumpBox.evaluate(runtime.deps.game);
    paintStumpPart(runtime, 'stump-box-head', stumpHeadHtml(runtime, result));
    paintStumpPart(runtime, 'stump-box-board', stumpBoardHtml(runtime, result));
    // 틀 아래: 판이면 옵션 합계, 조합창이면 조합 단추와 조합법(빈 칸은 CSS가 숨긴다)
    paintStumpPart(runtime, 'stump-cube', runtime.state.frameView === 'cube' ? runtime.deps.stumpCubeUi.cubeHtml() : '');
    paintStumpPart(runtime, 'stump-box-summary', runtime.state.frameView === 'box' ? stumpSummaryHtml(runtime, result) : '');
    paintStumpPart(runtime, 'stump-box-detail', stumpDetailHtml(runtime, result));
    paintStumpPart(runtime, 'stump-box-storage', stumpStorageHtml(runtime));
    paintStumpPart(runtime, 'stump-box-more', stumpMoreHtml(runtime));
    showRightView(runtime);
    placeStumpDetail(runtime);
    renderPlacementPreview(runtime);
    // 따라 하기(시작 선물 놓기)는 고를 때마다 가리키는 칸을 옮긴다: 보관함의 씨앗 → 판의 빈 칸(룬 고르기 창과 같은 방식).
    refreshStumpTutorial(runtime);
}

/** The right column's parts for rightView: the storage and the tabs, or the host the equipment bag moves into. */
export function showRightView(runtime) {
    const bag = runtime.state.rightView === 'bag';
    [['stump-box-storage', bag], ['stump-box-more', bag], ['stump-equip-host', !bag]].forEach(([id, hidden]) => {
        const node = runtime.deps.document.getElementById(id);
        if (node && node.hidden !== hidden) node.hidden = hidden;
    });
}

export function moveEquipmentBag(runtime, toStump) {
    const card = runtime.deps.document.querySelector('.equipment-inventory-panel'), inspector = runtime.deps.document.getElementById('ui-equipment-inventory-inspector');
    const target = runtime.deps.craftPickerHostUi.bagHome() || runtime.deps.document.querySelector(toStump ? '#stump-equip-host > .equipment-window' : '#item-tab-equip .equipment-window');
    if (!card || !inspector || !target || card.parentElement === target) return;
    runtime.deps.equipmentInventoryInteraction.focus(null);
    target.append(card, inspector);
}

/** From updateStaticUI: puts the bag where it shows. @returns {boolean} true when this tab shows it (the caller then draws it). Both
* windows open on a PC: the equipment window keeps its bag and this column goes back to the storage. */
export function syncEquipmentBag(runtime, itemsTabDrawn) {
    const drawn = isStumpTabDrawn(runtime);
    if (itemsTabDrawn && drawn && runtime.state.rightView === 'bag') {
        runtime.state.rightView = 'storage';
        renderStumpBoxTab(runtime, true);
    }
    const shown = !itemsTabDrawn && drawn && runtime.state.rightView === 'bag';
    moveEquipmentBag(runtime, shown);
    return shown;
}

export function refreshStumpTabIfVisible(runtime) {
    if (typeof runtime.deps.getRenderingUiTabIds !== 'function' || !(0, runtime.deps.getRenderingUiTabIds)().has('tab-stump')) return;
    if (!(0, runtime.deps.isUiPointerInteractionActive)()) renderStumpBoxTab(runtime); // 누르는 중인 칸을 바꾸면 그 클릭이 칸에 닿지 않는다
}

/** The panel floats in the top layer (index.html popover="manual"): beside the window on a PC (right, else left, else next to the
* picked item), a sheet above the bottom bar up to 1080px wide (css/stump-box.css). It hides under a selection overlay, and a
* window or tab that closes drops its pick. */
export function placeStumpDetail(runtime) {
    const panel = runtime.deps.document.getElementById('stump-box-detail'), tab = runtime.deps.document.getElementById('tab-stump');
    if (!panel || typeof panel.showPopover !== 'function') return;
    if (!stumpDetailWanted(runtime, panel, tab)) {
        if (panel.matches(':popover-open')) panel.hidePopover();
        return;
    }
    if (!panel.matches(':popover-open')) openStumpDetail(runtime, panel);
    if (runtime.deps.uiDisplay.matches('(max-width: 1080px)')) ['left', 'top', 'max-height'].forEach(name => panel.style.removeProperty(name));
    else floatStumpDetail(runtime, panel, tab);
}

/** The box is on screen, something is picked and no selection overlay is up. A box that left the screen drops its pick. */
export function stumpDetailWanted(runtime, panel, tab) {
    const visible = !!tab?.getClientRects().length, picked = runtime.state.selectedId !== null || runtime.state.selectedCell !== null;
    if (!visible && picked) forgetStumpSelection(runtime);
    return visible && picked && panel.childElementCount > 0 && !runtime.deps.document.querySelector('body > .selection-overlay');
}

/** Just opened, the panel lets presses through (inert) for a moment: the second press of a double-click or double-tap reaches the
* item under a phone's sheet instead of the sheet's [버리기]. */
export function openStumpDetail(runtime, panel) {
    panel.showPopover();
    panel.inert = true;
    (0, runtime.deps.clearTimeout)(runtime.state.detailGuard);
    runtime.state.detailGuard = (0, runtime.deps.setTimeout)(() => { panel.inert = false; }, runtime.state.DETAIL_GUARD_MS);
}

/** No repaint here: the next render reads the cleared pick. */
export function forgetStumpSelection(runtime) {
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    runtime.state.compareOpen = false;
    runtime.state.lastSignature = '';
}

export function floatStumpDetail(runtime, panel, tab) {
    const scale = runtime.deps.uiDisplay.factor || 1, gap = 8, nav = runtime.deps.document.getElementById('tab-header-bottom');
    const bottom = nav?.getClientRects().length ? nav.getBoundingClientRect().top : runtime.deps.innerHeight;
    panel.style.maxHeight = `${Math.max(160, bottom - gap * 2) / scale}px`;
    const size = panel.getBoundingClientRect(), spot = besideStumpWindow(runtime, tab, size, gap) || besideStumpPick(runtime, tab, size, gap);
    panel.style.left = `${spot.x / scale}px`;
    panel.style.top = `${Math.max(gap, Math.min(bottom - size.height - gap, spot.y)) / scale}px`;
}

/** Right of the window, else left of it, level with the storage. */
export function besideStumpWindow(runtime, tab, size, gap) {
    const column = ['stump-box-storage', 'stump-equip-host'].map(id => runtime.deps.document.getElementById(id)).find(node => node?.getClientRects().length);
    const win = tab.getBoundingClientRect(), y = column ? column.getBoundingClientRect().top : win.top;
    if (win.right + gap + size.width <= runtime.deps.innerWidth - gap) return { x: win.right + gap, y };
    return win.left - gap - size.width >= gap ? { x: win.left - gap - size.width, y } : null;
}

/** No room beside the window (a maximized one): next to the picked item, over the box. */
export function besideStumpPick(runtime, tab, size, gap) {
    const pick = (tab.querySelector('.stump-item.is-selected, .stump-cell.is-selected') || tab).getBoundingClientRect();
    const x = pick.right + gap + size.width <= runtime.deps.innerWidth - gap ? pick.right + gap : pick.left - gap - size.width;
    return { x: Math.max(gap, Math.min(runtime.deps.innerWidth - gap - size.width, x)), y: pick.top };
}

export function bindStumpBoxTab(runtime, root) {
    if (runtime.state.bound === root) return;
    clearStumpTabBinding(runtime);
    runtime.state.bound = root;
    const doc = runtime.deps.document, host = doc.getElementById('stump-equip-host');
    runtime.state.boundTargets = [root, host].filter(Boolean);
    listenView(runtime, root, 'click', runtime.handlers.onStumpTabClick);
    listenView(runtime, root, 'dblclick', runtime.handlers.onStumpTabDoubleClick);
    listenView(runtime, root, 'change', runtime.handlers.onStumpSelectionChange);
    if (host) listenView(runtime, host, 'dblclick', runtime.handlers.onBagDoubleClick, true);
    if (!runtime.state.ticker) {
        listenView(runtime, runtime.deps.window, 'resize', runtime.handlers.placeStumpDetail);
        listenView(runtime, doc, 'pointerdown', runtime.handlers.onStumpOutsidePress, true);
    }
    runtime.state.ticker ||= runtime.deps.setInterval(runtime.handlers.refreshStumpTabIfVisible, 1000);
    for (const [target, options] of [[root, { attributes: true, attributeFilter: ['class', 'style'] }], [doc.body, { childList: true }]]) {
        const observer = new runtime.deps.MutationObserver(runtime.handlers.placeStumpDetail);
        observer.observe(target, options);
        runtime.state.observers.push(observer);
    }
}

/** Repaints now (the cube and its picker change outside the tab's own clicks). */
export function refreshStumpTabNow(runtime) {
    runtime.state.lastSignature = '';
    renderStumpBoxTab(runtime, true);
}

export function isStumpTabDrawn(runtime) { return typeof runtime.deps.getRenderingUiTabIds === 'function' && (0, runtime.deps.getRenderingUiTabIds)().has('tab-stump'); }

export function frameShowsCube(runtime) { return runtime.state.frameView === 'cube'; }
