import { clearStumpFrameMotion, clearMissingStumpSelection } from './stump-board-lifetime.mjs';
import { onNursery } from './stump-board-summary.mjs';
import { canEnterNursery } from './stump-board-markup.mjs';
import { notifyStump, unplaceAllStump, commitStumpChange } from './stump-board-actions.mjs';
import { renderStumpBoxTab } from './stump-board-render.mjs';
import { clearPlacementPreview } from './stump-board-placement.mjs';

/** Bottom gem (2026-11-03 사용자): the frame turns into the nursery and back. What it did before lives in the button under the frame (frame-action). */
export function pressNurseryGem(runtime, button) {
    if (onNursery(runtime)) return switchFrame(runtime, button, 'box');
    if (!canEnterNursery(runtime)) return notifyStump(runtime, '해금 탭에서 생육함을 열 수 있습니다.');
    switchFrame(runtime, button, 'nursery');
}

export function pressFrameButton(runtime, side, button) {
    if (!runtime.state.FRAME_BUTTONS[side]) return;
    fireFrameButton(runtime, side);
    runtime.state.FRAME_BUTTONS[side](button);
}

/** The pressed piece and a short glow stay on the button a moment after the click. The mark sits on #stump-box-board, which outlives
* the board's repaints (css/stump-box.css [data-fired]). */
export function fireFrameButton(runtime, side) {
    const holder = runtime.deps.document.getElementById('stump-box-board');
    if (!holder) return;
    holder.dataset.fired = side;
    (0, runtime.deps.clearTimeout)(runtime.state.firedTimer);
    runtime.state.firedTimer = (0, runtime.deps.setTimeout)(() => { delete holder.dataset.fired; }, runtime.state.FRAME_FIRE_MS);
}

/** Right gem empties only the window on show (2026-10-31 사용자). On the board: the items back to storage, one move [배치 되돌리기] undoes. */
export function emptyStumpBoard(runtime) {
    if (!runtime.deps.game.stumpBox.board.some(id => id !== null)) return notifyStump(runtime, '그루터기 함이 비어 있습니다.');
    const refusal = runtime.deps.stumpBox.unplaceAllReason(runtime.deps.game);
    if (refusal) return notifyStump(runtime, refusal);
    (0, runtime.deps.playUiFeedbackSound)('uiCancel');
    unplaceAllStump(runtime);
}

/** Right gem on the cube: what lies in it goes back where it came from (stumpCube.clear). */
export function emptyStumpCube(runtime) {
    if (!runtime.deps.stumpCube.entries().length) return notifyStump(runtime, '조합창이 비어 있습니다.');
    (0, runtime.deps.playUiFeedbackSound)('uiCancel');
    runtime.deps.stumpCube.clear();
    commitStumpChange(runtime);
}

/** 자동합성 above storage (2026-11-04 사용자): every set of three growing seeds of one colour in the storage filter merges after a
* confirmation that lists them (js/stump-ripening-ui.js confirmAutoMerge), checked again right before it runs. */
export async function autoMergeStump(runtime) {
    const owner = runtime.deps.game;
    if (runtime.state.stateFilter !== 'all') return;
    const filter = runtime.state.colorFilter, approval = await runtime.deps.stumpRipeningUi.confirmAutoMerge(filter);
    if (!approval || !runtime.active || runtime.deps.game !== owner) return;
    if (runtime.state.stateFilter !== 'all' || runtime.state.colorFilter !== filter || !runtime.deps.stumpRipeningUi.autoMergeCurrent(filter, approval)) {
        notifyStump(runtime, '대상이 바뀌었습니다. 확인 후 다시 눌러 주세요.');
        renderStumpBoxTab(runtime, true);
        return;
    }
    const result = runtime.deps.stumpCube.autoMerge(runtime.deps.game, filter);
    (0, runtime.deps.playUiFeedbackSound)(result.ok ? 'craftSuccess' : 'craftFailure');
    if (!result.ok) return notifyStump(runtime, result.reason);
    const best = Math.max(...result.items.map(item => Math.round(item.roll * 100)));
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🧩 자동합성: 씨앗 {length}개 (최고 품질 {best}%)', { length: result.items.length, best }), 'loot-rare');
    notifyStump(runtime, (0, runtime.deps._t)('자동합성: 씨앗 {length}개 (최고 품질 {best}%)', { length: result.items.length, best }));
    clearMissingStumpSelection(runtime);
    commitStumpChange(runtime);
}

/** Left gem: the right column shows the stump storage or the equipment window's bag (drawn by updateStaticUI). */
export function toggleRightView(runtime) {
    (0, runtime.deps.playUiFeedbackSound)('uiSelect');
    runtime.state.rightView = runtime.state.rightView === 'bag' ? 'storage' : 'bag';
    renderStumpBoxTab(runtime, true);
    (0, runtime.deps.updateStaticUI)();
}

/** The gem: the wood latch sounds, the frame shows the other side at once under a copy of the old board, and a ring of light
* spreads from the gem uncovering it (2026-10-27 사용자: 보석 빛 번짐, 그루터기 함 안에서만, 목재 장치 소리; css/stump-box.css). */
export function switchFrame(runtime, button, next) {
    if (runtime.state.frameSwitching) return;
    (0, runtime.deps.playUiFeedbackSound)('stumpFrameSwitch');
    const side = button.classList.contains('is-bottom') ? 'bottom' : 'top';
    const ghost = runtime.deps.uiDisplay.matches('(prefers-reduced-motion: reduce)') ? null : frameGhost(runtime, button.closest('.stump-board'), side);
    // A pick does not cross into or out of the nursery: a press there would mean the other board.
    if (onNursery(runtime) || next === 'nursery') { runtime.state.selectedId = null; runtime.state.selectedCell = null; }
    runtime.state.frameView = next;
    clearPlacementPreview(runtime);
    renderStumpBoxTab(runtime, true);
    const board = runtime.deps.document.querySelector('#stump-box-board .stump-board');
    board?.querySelector(`.stump-frame-button.is-${side}`)?.focus({ preventScroll: true });
    if (!ghost) return;
    runtime.state.frameSwitching = true;
    runtime.state.frameGhost = ghost;
    runtime.state.frameBoard = board;
    board?.classList.add('is-revealing', `is-from-${side}`);
    runtime.state.frameTimer = runtime.deps.setTimeout(() => clearStumpFrameMotion(runtime), runtime.state.FRAME_REVEAL_MS);
}

/** A still copy of the board before the switch, laid over its place in the board section (#stump-board-section is the offset parent). */
export function frameGhost(runtime, board, side) {
    const section = runtime.deps.document.getElementById('stump-board-section');
    if (!board || !section) return null;
    const ghost = board.cloneNode(true);
    ghost.classList.add('stump-board-ghost', `is-from-${side}`);
    ghost.removeAttribute('role');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.cssText = `left:${board.offsetLeft}px;top:${board.offsetTop}px;width:${board.offsetWidth}px;height:${board.offsetHeight}px`;
    section.appendChild(ghost);
    return ghost;
}
