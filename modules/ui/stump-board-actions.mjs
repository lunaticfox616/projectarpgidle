import { listenView } from './view-events.mjs';
import { clearMissingStumpSelection } from './stump-board-lifetime.mjs';
import { stumpMoreTabs, onNursery, shownCells, selectedItem, stumpItemName, stumpRulesHtml } from './stump-board-summary.mjs';
import { renderStumpBoxTab } from './stump-board-render.mjs';
import { clearPlacementPreview, previewBoardCell, placementTip, renderPlacementPreview } from './stump-board-placement.mjs';
import { storageLayout, storageShowsSlots } from './stump-board-storage.mjs';
import { announceStumpRipened } from './stump-board-notices.mjs';

/** A records shortcut reveals its journal without toggling a previously open tab shut. */
export function revealMoreTab(runtime, id) {
    if (!stumpMoreTabs(runtime).some(([key]) => key === id)) return false;
    runtime.state.moreTab = id;
    runtime.state.moreOpen = true;
    renderStumpBoxTab(runtime, true);
    return true;
}

export function notifyStump(runtime, message) { (0, runtime.deps.showGameToast)(message, { tone: 'info' }); }

export function commitStumpChange(runtime) {
    if (clearPlacementPreview(runtime)) (0, runtime.deps.hideInfoTooltip)();
    runtime.state.lastSignature = '';
    (0, runtime.deps.queueImportantSave)(300);
    renderStumpBoxTab(runtime, true);
    (0, runtime.deps.updateStaticUI)();
}

export function selectStumpItem(runtime, id) {
    if (clearPlacementPreview(runtime)) (0, runtime.deps.hideInfoTooltip)();
    runtime.state.compareOpen = false;
    runtime.state.comparedId = null;
    runtime.state.selectedId = runtime.state.selectedId === id ? null : id;
    runtime.state.selectedCell = null;
    renderStumpBoxTab(runtime, true);
}

export function beginStumpGuideView(runtime, owner = runtime.state.owner) {
    const previous = { frameView: runtime.state.frameView, rightView: runtime.state.rightView, storagePage: runtime.state.storagePage, stateFilter: runtime.state.stateFilter, colorFilter: runtime.state.colorFilter };
    runtime.state.frameView = 'box';
    runtime.state.rightView = 'storage';
    runtime.state.storagePage = 0;
    runtime.state.stateFilter = runtime.state.colorFilter = 'all';
    selectStumpItem(runtime, null);
    return () => {
        if (!runtime.active || owner !== runtime.deps.game) return;
        // The replay caller restores its live save first; rendering clears the example's selection.
        selectStumpItem(runtime, null);
        ({ frameView: runtime.state.frameView, rightView: runtime.state.rightView, storagePage: runtime.state.storagePage, stateFilter: runtime.state.stateFilter, colorFilter: runtime.state.colorFilter } = previous);
    };
}

export function undoPlacement(runtime) {
    if (!runtime.deps.stumpBox.undoPlacement(runtime.deps.game)) {
        notifyStump(runtime, '지금은 이전 배치로 되돌릴 수 없습니다.');
        renderStumpBoxTab(runtime, true);
        return;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
}

export function stumpRefusal(runtime, item) {
    if (runtime.deps.game.woodsmanBuildLock) return '나무꾼 전투 중에는 그루터기 함 배치를 바꿀 수 없습니다.';
    return (0, runtime.deps._t)('{label}: 이 칸에는 놓을 수 없습니다.', { label: runtime.deps.stumpBox.label(item) });
}

/**
* Puts an item on a board cell: an empty cell takes it, a filled one trades places (stumpBox.move). Shared by
* pressing and dragging. Returns whether the box changed; a refusal is shown as a toast.
*/
export function dropOnCell(runtime, id, cell) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (onNursery(runtime)) return dropOnNurseryCell(runtime, item, cell);
    if (!item || runtime.deps.game.stumpBox.board[cell] === id) return false;
    const uniqueReason = runtime.deps.stumpBox.onePerBoardReason(runtime.deps.game, id, cell);
    if (uniqueReason) { notifyStump(runtime, uniqueReason); return false; }
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) {
        notifyStump(runtime, (0, runtime.deps._t)('이 칸은 루프 {opensAt}에 열립니다.', { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
        return false;
    }
    if (!runtime.deps.stumpBox.move(runtime.deps.game, id, cell)) {
        notifyStump(runtime, stumpRefusal(runtime, item));
        return false;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
    return true;
}

export function dropOnNurseryCell(runtime, item, cell) {
    if (!item || runtime.deps.game.stumpBox.nursery[cell] === item.id) return false;
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) {
        notifyStump(runtime, (0, runtime.deps._t)('이 칸은 루프 {opensAt}에 열립니다.', { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
        return false;
    }
    if (!runtime.deps.stumpBox.nurseryMove(runtime.deps.game, item.id, cell)) {
        notifyStump(runtime, runtime.deps.game.woodsmanBuildLock ? '나무꾼 전투 중에는 생육함 배치를 바꿀 수 없습니다.' : '보관함이 가득 찼습니다.');
        return false;
    }
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    commitStumpChange(runtime);
    return true;
}

/** 다른 정렬에서 끌어 놓으면 지금 보이는 칸을 자리로 삼고 직접 배치로 간다(정렬이 그대로면 옮긴 것이 보이지 않는다). 거르지 않은 보관함의
* slot은 보이는 칸 번호 그대로, 거른 보관함의 slot은 카드가 가진 칸 번호라 그 아이템의 새 칸이 된다. 잠근 것의 칸은 그대로다. */
export function adoptStorageOrder(runtime, slot) {
    if (runtime.state.storageSort === 'manual') return slot;
    const layout = storageLayout(runtime, runtime.deps.stumpBox.storage(runtime.deps.game).sort(runtime.handlers.compareStorageItems)), over = layout.find(item => item && item.slot === slot);
    const target = storageShowsSlots(runtime) ? slot : (over ? layout.indexOf(over) : layout.length);
    runtime.deps.stumpBox.orderStorage(runtime.deps.game, layout);
    runtime.state.storageSort = 'manual';
    return target;
}

/** 끌어 놓은 칸으로 옮긴다. slot이 null이면(칸 사이) 그대로 둔다. */
export function arrangeStorage(runtime, id, slot) {
    if (slot === null || slot === undefined) return false;
    if (!runtime.deps.stumpBox.moveInStorage(runtime.deps.game, id, adoptStorageOrder(runtime, slot))) return false;
    commitStumpChange(runtime);
    return true;
}

/** 끄는 동안 쪽 단추 위에 머물면 그 쪽으로 넘어간다. */
export function showStoragePage(runtime, page) {
    if (page === runtime.state.storagePage) return;
    runtime.state.storagePage = page;
    renderStumpBoxTab(runtime, true);
}

/** Takes a board item back to storage (pressing the storage, dragging onto it, or [보관함으로]), onto slot when dragged onto a cell.
* An item already stored just moves to that cell. */
export function dropOnStorage(runtime, id, slot = null) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (item && !runtime.deps.stumpBox.isPlaced(runtime.deps.game, id)) return arrangeStorage(runtime, id, slot);
    if (!item) return false;
    if (!(runtime.deps.stumpBox.inNursery(runtime.deps.game, id) ? runtime.deps.stumpBox.nurseryUnplace(runtime.deps.game, id) : runtime.deps.stumpBox.unplace(runtime.deps.game, id))) {
        notifyStump(runtime, runtime.deps.game.woodsmanBuildLock ? stumpRefusal(runtime, item) : '보관함이 가득 찼습니다.');
        return false;
    }
    runtime.state.selectedId = null;
    if (slot !== null) runtime.deps.stumpBox.moveInStorage(runtime.deps.game, id, adoptStorageOrder(runtime, slot));
    commitStumpChange(runtime);
    return true;
}

export function selectStumpCell(runtime, cell) {
    runtime.state.selectedCell = runtime.state.selectedCell === cell ? null : cell;
    renderStumpBoxTab(runtime, true);
}

export function clickStumpCell(runtime, cell, confirm) {
    const occupant = shownCells(runtime)[cell];
    if (!runtime.deps.stumpBox.isOpen(runtime.deps.game, cell)) return notifyStump(runtime, (0, runtime.deps._t)('이 칸은 루프 {opensAt}에 열립니다.', { opensAt: runtime.deps.stumpBox.opensAt(runtime.deps.game, cell) }));
    if (runtime.state.selectedId !== null && occupant === runtime.state.selectedId) return selectStumpItem(runtime, null);
    if (runtime.state.selectedId !== null) return confirm ? confirmCell(runtime, runtime.state.selectedId, cell) : dropOnCell(runtime, runtime.state.selectedId, cell);
    if (occupant !== null) return selectStumpItem(runtime, occupant);
    if (!onNursery(runtime) && (runtime.deps.stumpBox.graftOpen(runtime.deps.game) || runtime.deps.stumpBox.sealLimit(runtime.deps.game))) selectStumpCell(runtime, cell);
}

export function graftStumpCell(runtime, cell, raise) {
    const reason = raise ? runtime.deps.stumpBox.graftRaiseReason(runtime.deps.game, cell) : runtime.deps.stumpBox.graftLowerReason(runtime.deps.game, cell);
    if (reason) return notifyStump(runtime, reason);
    (raise ? runtime.deps.stumpBox.graftRaise : runtime.deps.stumpBox.graftLower)(runtime.deps.game, cell);
    commitStumpChange(runtime);
}

export function claimHarvestGift(runtime, row, color) {
    const item = runtime.deps.stumpBox.claimHarvestGift(runtime.deps.game, row, color);
    if (!item) return notifyStump(runtime, '보관함이 가득 찼거나 이미 받은 보상입니다.');
    runtime.state.selectedId = item.id;
    notifyStump(runtime, (0, runtime.deps._t)('수확 일지 보상: {label}', { label: runtime.deps.stumpBox.label(item) }));
    commitStumpChange(runtime);
}

export function unsealTalisman(runtime, source) {
    const item = runtime.deps.stumpTalismanUi.unseal(source);
    if (!item) return;
    runtime.state.selectedId = item.id;
    commitStumpChange(runtime);
}

export function compostStumpItem(runtime) {
    const item = selectedItem(runtime), reason = item ? runtime.deps.stumpBox.compostReason(runtime.deps.game, item.id) : '';
    if (!item || reason) return reason && notifyStump(runtime, reason);
    const name = stumpItemName(runtime, item), result = runtime.deps.stumpBox.compost(runtime.deps.game, item.id);
    runtime.state.selectedId = null;
    notifyStump(runtime, (0, runtime.deps._t)('거름 사용: {name} 소모, 성장 중인 {fed}개 경험치 +{growth}', { name, fed: result.fed, growth: result.growth }));
    announceStumpRipened(runtime, result.ripened);
    commitStumpChange(runtime);
}

export function toggleStumpLock(runtime) {
    const item = selectedItem(runtime);
    if (!item) return;
    if (!runtime.deps.stumpBox.toggleLock(runtime.deps.game, item.id)) return notifyStump(runtime, '나무꾼 전투 중에는 그루터기 함을 바꿀 수 없습니다.');
    notifyStump(runtime, `${stumpItemName(runtime, item)} ${item.locked ? (0, runtime.deps._t)('잠금') : (0, runtime.deps._t)('잠금 해제')}`);
    commitStumpChange(runtime);
}

export async function discardTalisman(runtime) {
    const owner = runtime.deps.game, selected = runtime.state.selectedId;
    if (runtime.state.selectedId === null || !await runtime.deps.stumpTalismanUi.discard(runtime.state.selectedId)) return;
    if (!runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.selectedId === selected) runtime.state.selectedId = null;
    commitStumpChange(runtime);
}

export async function discardScar(runtime) {
    const owner = runtime.deps.game, selected = runtime.state.selectedId;
    if (runtime.state.selectedId === null || !await runtime.deps.stumpRipeningUi.discardScar(runtime.state.selectedId)) return;
    if (!runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.selectedId === selected) runtime.state.selectedId = null;
    commitStumpChange(runtime);
}

/** A stored seed thrown away (golden and ancient ones ask first). */
export async function discardStumpSeed(runtime) {
    const owner = runtime.deps.game;
    const item = selectedItem(runtime);
    if (!item || !item.color || !await runtime.deps.stumpRipeningUi.confirmDiscard(item)) return;
    if (!runtime.active || runtime.deps.game !== owner || selectedItem(runtime) !== item) return;
    if (!runtime.deps.stumpBox.discard(owner, item.id)) return;
    runtime.state.selectedId = null;
    commitStumpChange(runtime);
}

/** A stored grown item into currency (golden, ancient and albino ones ask first). */
export async function monetizeStumpItem(runtime) {
    const owner = runtime.deps.game;
    const item = selectedItem(runtime);
    if (!item || !await runtime.deps.stumpRipeningUi.confirmMonetize(item)) return;
    if (!runtime.active || runtime.deps.game !== owner || selectedItem(runtime) !== item) return;
    const name = runtime.deps.stumpBox.shortName(item);
    if (!runtime.deps.stumpBox.monetize(runtime.deps.game, item.id)) return notifyStump(runtime, stumpRefusal(runtime, item));
    runtime.state.selectedId = null;
    notifyStump(runtime, (0, runtime.deps._t)('화폐화: {name}', { name }));
    commitStumpChange(runtime);
}

export function sealStumpCell(runtime, cell) {
    const reason = runtime.deps.stumpBox.sealReason(runtime.deps.game, cell);
    if (reason) return notifyStump(runtime, reason);
    runtime.deps.stumpBox.toggleSeal(runtime.deps.game, cell);
    commitStumpChange(runtime);
}

export function chooseStumpPouch(runtime, id, index) {
    const item = runtime.deps.stumpBox.choosePouch(runtime.deps.game, id, index);
    if (!item) return notifyStump(runtime, '보관함이 가득 찼습니다.');
    runtime.state.selectedId = item.id;
    notifyStump(runtime, (0, runtime.deps._t)('씨앗 주머니: {label}', { label: runtime.deps.stumpBox.label(item) }));
    commitStumpChange(runtime);
}

export function runBulkCompost(runtime, filter) {
    const result = runtime.deps.stumpBox.compostMany(runtime.deps.game, filter);
    if (!result) return false;
    notifyStump(runtime, (0, runtime.deps._t)('일괄 거름 사용: {count}개 소모, 성장 중인 {fed}개 경험치 +{growth}', { count: result.count, fed: result.fed, growth: result.growth }));
    announceStumpRipened(runtime, result.ripened);
    return true;
}

export function runBulkDiscard(runtime, filter) {
    const gone = runtime.deps.stumpBox.discardMany(runtime.deps.game, filter), money = (gone || []).filter(runtime.deps.stumpBox.isMature).length;
    if (gone) notifyStump(runtime, money ? (0, runtime.deps._t)('일괄 버리기: 버림 {value}개, 화폐화 {money}개', { value: gone.length - money, money }) : (0, runtime.deps._t)('일괄 버리기: {length}개', { length: gone.length }));
    return !!gone;
}

export async function bulkStump(runtime, kind) {
    const owner = runtime.deps.game;
    if (runtime.state.stateFilter !== 'all') return;
    const filter = runtime.state.colorFilter;
    const approval = await runtime.deps.stumpRipeningUi.confirmBulk(kind, filter);
    if (!approval || !runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.stateFilter !== 'all' || runtime.state.colorFilter !== filter || !runtime.deps.stumpRipeningUi.bulkConfirmationCurrent(kind, filter, approval)) {
        notifyStump(runtime, '대상이 바뀌었습니다. 확인 후 다시 눌러 주세요.');
        renderStumpBoxTab(runtime, true);
        return;
    }
    if (!(kind === 'compost' ? runBulkCompost(runtime, filter) : runBulkDiscard(runtime, filter))) return;
    clearMissingStumpSelection(runtime);
    commitStumpChange(runtime);
}

export function ensureRulesDialog(runtime) {
    if (runtime.state.rulesDialog) return runtime.state.rulesDialog;
    runtime.state.rulesDialog = runtime.deps.document.createElement('dialog');
    runtime.state.rulesDialog.className = 'stump-rules-dialog';
    runtime.state.rulesDialog.setAttribute('aria-labelledby', 'stump-rules-title');
    listenView(runtime, runtime.state.rulesDialog, 'click', event => {
        if (event.target === runtime.state.rulesDialog || event.target.closest('[data-rules-close]')) runtime.state.rulesDialog.close();
    });
    runtime.deps.document.body.appendChild(runtime.state.rulesDialog);
    return runtime.state.rulesDialog;
}

export function showStumpRules(runtime) {
    const dialog = ensureRulesDialog(runtime);
    dialog.innerHTML = '<div class="stump-rules-panel"><div class="stump-rules-top"><h3 id="stump-rules-title" class="tooltip-title">그루터기 함</h3>'
        + '<button type="button" class="stump-rules-close" data-rules-close aria-label="닫기">✕</button></div>' + stumpRulesHtml(runtime) + '</div>';
    (0, runtime.deps.hideInfoTooltip)();
    dialog.showModal();
    dialog.querySelector('.stump-rules-tip').scrollTop = 0;
}

/** The empty open cell where the item turns off the fewest board items (상극 colours touching), the earliest opened first. */
export function bestStumpCell(runtime, id) {
    let best = null;
    for (const cell of runtime.deps.STUMP_BOX_CELL_ORDER) {
        const preview = runtime.deps.game.stumpBox.board[cell] === null ? runtime.deps.stumpBox.previewMove(runtime.deps.game, id, cell) : null;
        const off = preview ? runtime.deps.stumpBox.evaluate(preview).suppressed.size : Infinity;
        if (off < (best ? best.off : Infinity)) best = { cell, off };
    }
    return best ? best.cell : null;
}

/** A stored item into the cube (double-click while the frame shows it, or a drop on a cube cell); the cube says why when it cannot. */
export function dropOnCube(runtime, id, cell) {
    runtime.state.selectedId = null;
    return runtime.deps.stumpCubeUi.putStumpItem(id, cell);
}

/** A cube item dragged to another cube cell moves there (to = its new top left); dragged to the storage or the bag (to = null) it comes out. */
export function dropCubeItem(runtime, from, to) {
    return to === null ? runtime.deps.stumpCubeUi.takeOutCubeCell(from) : runtime.deps.stumpCubeUi.moveCubeItem(from, to);
}

/** Where a double-clicked stored item goes: an albino or a scar trades places with the one on the board (one fits on it), the rest take
* the best empty cell. */
export function quickStumpCell(runtime, item) {
    const worn = runtime.deps.stumpBox.wornOneId(runtime.deps.game, item);
    return worn === null ? bestStumpCell(runtime, item.id) : runtime.deps.game.stumpBox.board.indexOf(worn);
}

/** A board item goes to storage; a stored one onto the best empty cell, or into the cube while the frame shows it. */
export function quickMoveStumpItem(runtime, id) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    if (!item) return;
    clearPlacementPreview(runtime);
    if (runtime.deps.stumpBox.isPlaced(runtime.deps.game, id)) return dropOnStorage(runtime, id);
    if (runtime.state.frameView === 'cube') return dropOnCube(runtime, id);
    if (runtime.deps.game.woodsmanBuildLock) return notifyStump(runtime, stumpRefusal(runtime, item));
    const cell = onNursery(runtime) ? runtime.deps.stumpBox.firstNurseryCell(runtime.deps.game) : quickStumpCell(runtime, item);
    if (cell === null) return notifyStump(runtime, (0, runtime.deps._t)('{value}에 빈 칸이 없습니다.', { value: onNursery(runtime) ? (0, runtime.deps._t)('생육함') : (0, runtime.deps._t)('그루터기 함') }));
    dropOnCell(runtime, id, cell);
}

export function unplaceAllStump(runtime) {
    const reason = onNursery(runtime) ? runtime.deps.stumpBox.nurseryClearReason(runtime.deps.game) : runtime.deps.stumpBox.unplaceAllReason(runtime.deps.game);
    if (reason) return notifyStump(runtime, reason);
    const count = onNursery(runtime) ? runtime.deps.stumpBox.nurseryClear(runtime.deps.game) : runtime.deps.stumpBox.unplaceAll(runtime.deps.game);
    runtime.state.selectedId = null;
    runtime.state.selectedCell = null;
    notifyStump(runtime, (0, runtime.deps._t)('전체 해제: {count}개를 보관함으로 옮겼습니다.', { count }));
    commitStumpChange(runtime);
}

/** A reward picked in the rewards window (js/stump-harvest-ui.js): a journal row's gift or a seed pouch's offer. */
export function claimReward(runtime, kind, key, choice) {
    if (kind === 'gift') claimHarvestGift(runtime, key, choice);
    else chooseStumpPouch(runtime, key, choice);
}

/** The nursery has no effects to compare: a touch drop (pinned) goes straight in. hover: a mouse over the cell with an item selected. */
export function previewCell(runtime, id, cell, pinned = false, hover = false) {
    if (!onNursery(runtime)) previewBoardCell(runtime, id, cell, pinned, hover);
    else if (pinned) dropOnCell(runtime, id, cell);
}

/** Touch and keyboard: the first press on a cell pins its preview, a second press on the same cell applies it like [배치]. */
export function confirmCell(runtime, id, cell) {
    if (runtime.state.placement?.pinned && runtime.state.placement.id === id && runtime.state.placement.cell === cell) return applyPlacement(runtime);
    previewCell(runtime, id, cell, true);
}

/**
* A cell under the mouse (tip) or the keyboard focus with an item selected previews its placement.
* @returns {{ html: string, tone: string } | null} for the mouse: the preview as a tooltip, an empty html while a pinned preview holds
* the box (no tooltip then), null without a preview (the cell's own tooltip).
*/
export function hoverCell(runtime, cell, tip = false) {
    if (runtime.state.selectedId !== null && !onNursery(runtime)) previewCell(runtime, runtime.state.selectedId, cell, false, tip);
    if (!runtime.state.placement?.result) return null;
    return placementTip(runtime) || { html: '', tone: '' };
}

export function applyPlacement(runtime) {
    if (!runtime.state.placement) return;
    // Re-evaluate on confirmation, including newly grown pieces or a challenge lock since the preview.
    const key = runtime.state.placement.effectKey;
    renderPlacementPreview(runtime);
    if (!runtime.state.placement) return;
    if (key !== runtime.state.placement.effectKey) return notifyStump(runtime, '배치 효과가 바뀌었습니다. 확인 후 다시 눌러 주세요.');
    dropOnCell(runtime, runtime.state.placement.id, runtime.state.placement.cell);
}
