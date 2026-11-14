import { renderMaterialDetail, pickerBodyHtml } from './stump-cube-picker.mjs';
import { syncStumpCubeOwner } from './stump-book-motion.mjs';
import { itemName } from './stump-cube-items.mjs';

/** Indices only address the rendered snapshot, never a newly reordered inventory. Insertion revalidates the same object. */
export function selectCubeItem(runtime, index) {
    if (syncStumpCubeOwner(runtime)) return;
    const item = runtime.state.pickerItems[index];
    if (!item || !runtime.deps.stumpCube.candidates(runtime.state.pickerKind).includes(item)) {
        (0, runtime.deps.showGameToast)((0, runtime.deps._t)('재료 상태가 바뀌었습니다. 다시 선택해 주세요.'), { tone: 'warning' });
        return openCubePicker(runtime, runtime.state.pickerKind);
    }
    runtime.state.pickerSelection = { kind: runtime.state.pickerKind, item };
    const panel = runtime.deps.document.getElementById(runtime.state.OVERLAY_ID)?.querySelector('.selection-overlay-panel');
    if (!panel) return;
    panel.querySelectorAll('[data-cube-candidate]').forEach(button => {
        const selected = Number(button.dataset.cubeCandidate) === index;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
    });
    renderMaterialDetail(runtime, panel);
}

/** Opens the picker, or redraws it in place (another kind, or after putting an item in). */
export function openCubePicker(runtime, kind) {
    syncStumpCubeOwner(runtime);
    if (!runtime.deps.selectionDialog.isOpen(runtime.state.OVERLAY_ID) || (kind && kind !== runtime.state.pickerKind)) runtime.state.pickerSelection = null;
    if (runtime.deps.stumpCube.KINDS.includes(kind)) runtime.state.pickerKind = kind;
    const panel = runtime.deps.selectionDialog.show({ id: runtime.state.OVERLAY_ID, title: (0, runtime.deps._t)('조합창에 넣을 재료'), panelClass: 'stump-cube-picker-panel', body: pickerBodyHtml(runtime) });
    runtime.state.pickerPanel = panel;
    renderMaterialDetail(runtime, panel);
}

export function closeCubePicker(runtime) {
    runtime.state.pickerSelection = null;
    runtime.deps.selectionDialog.close(runtime.state.OVERLAY_ID);
}

export function refreshCube(runtime) {
    if (runtime.deps.selectionDialog.isOpen(runtime.state.OVERLAY_ID)) openCubePicker(runtime, runtime.state.pickerKind);
    runtime.deps.stumpBoxUi.refreshStumpTabNow();
}

export function pickCubeItem(runtime) {
    if (!runtime.active || syncStumpCubeOwner(runtime)) return;
    const selected = runtime.state.pickerSelection;
    const usable = selected && runtime.deps.stumpCube.candidates(selected.kind).includes(selected.item);
    const reason = usable ? runtime.deps.stumpCube.put(runtime.deps.game, selected.kind, selected.item) : '재료 상태가 바뀌었습니다. 다시 선택해 주세요.';
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    runtime.state.pickerSelection = null;
    refreshCube(runtime);
}

export function takeOutCubeCell(runtime, cell) {
    if (runtime.deps.stumpCube.takeOut(runtime.deps.game, cell)) refreshCube(runtime);
}

/** A cube item dragged onto another cell: moves there, or swaps with a same-size item sitting exactly there. */
export function moveCubeItem(runtime, from, to) {
    const reason = runtime.deps.stumpCube.move(runtime.deps.game, from, to);
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    refreshCube(runtime);
}

/** A stored stump item into the cube: double-clicked in storage, or dropped on a cube cell (it goes there when it fits). */
export function putStumpItem(runtime, id, cell) {
    const item = runtime.deps.stumpBox.itemById(runtime.deps.game, id);
    const reason = item ? runtime.deps.stumpCube.put(runtime.deps.game, 'stump', item, cell) : '재료 상태가 바뀌었습니다. 다시 선택해 주세요.';
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    refreshCube(runtime);
    return !reason;
}

/** One unit of currency into the cube (a press on the 재화 tab while the frame shows the cube). It stays in the wallet until a recipe spends it. */
export function putWalletUnit(runtime, key) {
    const piece = runtime.deps.stumpCube.candidates('wallet').find(row => row.walletKey === key);
    const reason = piece ? runtime.deps.stumpCube.put(runtime.deps.game, 'wallet', piece) : '조합창에 더 넣을 수 없습니다.';
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    refreshCube(runtime);
}

export function quickFillCube(runtime, recipeId) {
    const reason = runtime.deps.stumpCube.fillCubeRecipe(runtime.deps.game, recipeId);
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    refreshCube(runtime);
}

/** 틀 아래 단추(조합창): 맞는 조합법대로 조합한다. */
export function transmuteCube(runtime) {
    const result = runtime.deps.stumpCube.transmute();
    (0, runtime.deps.playUiFeedbackSound)(result.ok ? 'craftSuccess' : 'craftFailure');
    if (!result.ok) return (0, runtime.deps.showGameToast)(result.reason, { tone: 'warning' });
    runtime.state.lastResult = { state: runtime.deps.game, season: runtime.deps.game.season, outputs: JSON.parse(JSON.stringify(result.outputs)) };
    const names = result.outputs.map(row => itemName(runtime, row.kind, row.item)).join(', ');
    const paid = Object.entries(result.paid).map(([key, need]) => (0, runtime.deps._t)('{name} {need}개', { name: (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name), need })).join(', ');
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🧩 조합창 {recipe}: {names}{paid}', { recipe: (0, runtime.deps._t)(result.recipe.name), names, paid: paid ? ` ${(0, runtime.deps._t)('({cost} 사용)', { cost: paid })}` : '' }), 'loot-rare');
    // 완전한 코어(js/core-items.js rollPerfect)는 드랍처럼 체이싱 티어 알림도
    result.outputs.filter(row => row.kind === 'core' && row.item && row.item.perfect)
        .forEach(row => (0, runtime.deps.dispatchRuntimeEvent)('incident', { text: (0, runtime.deps._t)('체이싱 코어를 획득했습니다. 「{name}」', { name: row.item.name }), tone: 'chase', chase: true }));
    (0, runtime.deps.queueImportantSave)(300);
    (0, runtime.deps.updateStaticUI)();
    refreshCube(runtime);
}

/** Bag gear into the cube (a drop on a cube cell, or a double-click while the frame shows the cube). @returns {boolean} true when the
* frame shows the cube (the bag then does nothing else with it), whether or not it went in. */
export function putBagItem(runtime, item, cell) {
    if (!runtime.deps.stumpBoxUi.frameShowsCube()) return false;
    const usable = runtime.deps.stumpCube.candidates('equipment').includes(item);
    const reason = usable ? runtime.deps.stumpCube.put(runtime.deps.game, 'equipment', item, cell) : '조합창에 넣을 수 없는 장비입니다.';
    if (reason) (0, runtime.deps.showGameToast)(reason, { tone: 'warning' });
    refreshCube(runtime);
    return true;
}
