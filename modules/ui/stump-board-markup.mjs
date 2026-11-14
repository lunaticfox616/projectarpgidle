import { stumpIcon, stumpBar, stumpCellMarks, cellGraftRank, isSealedCell, shownCells, stumpCellClasses, escStump, stumpCellLabel, itemTone, onNursery, stumpTone } from './stump-board-summary.mjs';

/** The lock (top right) of a locked item (stumpBox.toggleLock), drawn at the icon's own 11 dots. */
export function stumpLockMark(runtime, item) {
    return item.locked ? `<span class="stump-lock-mark">${(0, runtime.deps.renderPixelIcon)('lock', 'stump-lock-icon')}</span>` : '';
}

export function stumpCellBody(runtime, cell, item, open) {
    if (item) return stumpIcon(runtime, item) + (runtime.deps.stumpBox.isMature(item) ? '' : stumpBar(runtime, item)) + stumpCellMarks(runtime, cell) + stumpLockMark(runtime, item);
    return open ? stumpCellMarks(runtime, cell) : `<span class="stump-cell-lock">${runtime.deps.stumpBox.opensAt(runtime.deps.game, cell)}</span>`;
}

/** Hover and drag hooks: items drag, every cell takes drops, cells with something to say carry the tooltip. */
export function stumpCellHooks(runtime, cell, item, open) {
    const tip = item || !open || cellGraftRank(runtime, cell) || isSealedCell(runtime, cell) ? ' data-stump-tip="cell" data-info-tooltip-anchor="1"' : '';
    return `${item ? ` data-stump-drag="${item.id}"` : ''} data-stump-drop-cell="${cell}"${tip}`;
}

export function stumpCellHtml(runtime, cell, result) {
    const id = shownCells(runtime)[cell], item = id === null ? null : runtime.deps.stumpBox.itemById(runtime.deps.game, id), open = runtime.deps.stumpBox.isOpen(runtime.deps.game, cell);
    const classes = stumpCellClasses(runtime, item, open, result, cell), body = stumpCellBody(runtime, cell, item, open);
    return `<button type="button" class="${classes.join(' ')}" data-stump-action="cell" data-cell="${cell}"${stumpCellHooks(runtime, cell, item, open)}`
        + ` aria-label="${escStump(runtime, stumpCellLabel(runtime, cell, item, open))}"${open ? '' : ' aria-disabled="true"'}`
        + ` style="--stump-tone:${item ? itemTone(runtime, item) : 'transparent'};${stumpCellPlace(runtime, cell)}">${body}</button>`;
}

/** What each frame button does now: its name (aria-label) and the part of it that names a frame (coloured in the tooltip). */
export function frameButtonLabels(runtime) {
    const box = runtime.state.frameView === 'box', cube = runtime.state.frameView === 'cube';
    const turn = (frame, rest = '') => ({ frame, text: (0, runtime.deps._t)('{frame}으로 전환{rest}', { frame: (0, runtime.deps._t)(frame), rest }) }), here = cube ? '조합창' : box ? '그루터기 함' : '생육함';
    return { top: turn(box ? '조합창' : '그루터기 함'), left: { text: (0, runtime.deps._t)(runtime.state.rightView === 'bag' ? '그루터기 보관함 보기' : '장비 인벤토리 보기') },
        right: { frame: here, text: (0, runtime.deps._t)('{here} 비우기', { here: (0, runtime.deps._t)(here) }) },
        bottom: onNursery(runtime) ? turn('그루터기 함') : turn('생육함', canEnterNursery(runtime) ? '' : ` (${(0, runtime.deps._t)('해금 필요')})`) };
}

/** The frame art (dark holds the board, ivory the cube, green the nursery) and its four buttons, in the art's own 256px canvas. */
export function stumpFrameHtml(runtime) {
    const buttons = Object.entries(frameButtonLabels(runtime)).map(([side, label]) => `<button type="button" class="stump-frame-button is-${side}"`
            + ` data-stump-action="frame-button" data-side="${side}" aria-label="${escStump(runtime, label.text)}" data-stump-tip="frame" data-info-tooltip-anchor="1"`
            + `${side === 'left' ? ` aria-pressed="${runtime.state.rightView === 'bag'}"` : ''}></button>`).join('');
    return `<div class="stump-frame">${buttons}</div>`;
}

/** A frame button's tooltip: the frame it turns to in that frame's colour. */
export function frameTipHtml(runtime, side) {
    const label = frameButtonLabels(runtime)[side];
    if (!label) return '';
    const frameName = escStump(runtime, (0, runtime.deps._t)(label.frame || ''));
    const named = label.frame ? escStump(runtime, label.text).replace(frameName, `<span style="color:${runtime.state.FRAME_NAME_TONES[label.frame]}">${frameName}</span>`) : escStump(runtime, label.text);
    return `<div class="tooltip-line plain-tip">${named}</div>`;
}

/** The grid area a run of cells covers, bars between them included. */
export function stumpSpanPlace(runtime, cells) {
    const cols = cells.map(cell => cell % runtime.deps.STUMP_BOX_SIZE), rows = cells.map(cell => Math.floor(cell / runtime.deps.STUMP_BOX_SIZE));
    return `grid-column:${Math.min(...cols) * 2 + 1} / ${Math.max(...cols) * 2 + 2};grid-row:${Math.min(...rows) * 2 + 1} / ${Math.max(...rows) * 2 + 2}`;
}

/** The bar between two side-by-side cells. */
export function stumpBarPlace(runtime, a, b) {
    const [low, high] = [Math.min(a, b), Math.max(a, b)], col = low % runtime.deps.STUMP_BOX_SIZE, row = Math.floor(low / runtime.deps.STUMP_BOX_SIZE);
    return high - low === 1 ? `grid-column:${col * 2 + 2};grid-row:${row * 2 + 1}` : `grid-column:${col * 2 + 1};grid-row:${row * 2 + 2}`;
}

/** The board's synergies drawn over the frame (2026-11-04 사용자: 해당 칸 묶어서 강조): each 공명 line in its colour, each 규율 line in
* its five colours, a green knot on the bar between a 상생 pair. */
export function stumpLinksHtml(runtime, result) {
    const toneOf = cell => itemTone(runtime, runtime.deps.stumpBox.itemById(runtime.deps.game, runtime.deps.game.stumpBox.board[cell]));
    const resonance = result.groups.resonance.map(line => `<span class="stump-link is-resonance" style="--stump-tone:${line.color ? stumpTone(runtime, line.color) : '#f3d28c'};${stumpSpanPlace(runtime, line.cells)}"></span>`);
    const discipline = result.groups.discipline.map(line => `<span class="stump-link is-discipline" style="--rule-tones:linear-gradient(${line.axis === 'row' ? 90 : 180}deg,${line.cells.map(toneOf).join(',')});${stumpSpanPlace(runtime, line.cells)}"></span>`);
    const feed = result.groups.feed.map(([a, b]) => `<span class="stump-link is-feed" style="${stumpBarPlace(runtime, a, b)}"></span>`);
    return resonance.concat(discipline, feed).join('');
}

export function stumpBoardHtml(runtime, result) {
    const cube = runtime.state.frameView === 'cube', shown = onNursery(runtime) ? runtime.state.NO_EFFECT : result;
    const grid = cube ? runtime.deps.stumpCubeUi.cubeGridHtml()
        : Array.from({ length: runtime.deps.STUMP_BOX_SIZE * runtime.deps.STUMP_BOX_SIZE }, (_, cell) => stumpCellHtml(runtime, cell, shown)).join('');
    const links = runtime.state.frameView === 'box' ? `<div class="stump-board-links" aria-hidden="true">${stumpLinksHtml(runtime, result)}</div>` : '';
    return `<div class="stump-board is-${runtime.state.frameView}"${cube ? '' : (0, runtime.deps._t)(' role="grid" aria-label="{value} 판"', { value: onNursery(runtime) ? (0, runtime.deps._t)('생육함') : (0, runtime.deps._t)('그루터기 함') })}>`
        + `<div class="stump-board-grid">${grid}</div>${stumpFrameHtml(runtime)}${links}</div>`
        + `<div class="stump-board-foot">${runtime.deps.stumpCubeUi.bookButtonHtml()}`
        + `${cube ? (0, runtime.deps._t)('<button type="button" class="stump-frame-action" data-stump-action="frame-action">조합하기</button>') : ''}</div>`
        + '<div id="stump-placement-preview" class="stump-placement-preview" role="status" aria-live="polite" hidden></div>';
}

export function stumpCellPlace(runtime, cell) { return `grid-column:${cell % runtime.deps.STUMP_BOX_SIZE * 2 + 1};grid-row:${Math.floor(cell / runtime.deps.STUMP_BOX_SIZE) * 2 + 1}`; }

export function canEnterNursery(runtime) { return runtime.deps.stumpBox.nurseryOpen(runtime.deps.game) || runtime.deps.game.stumpBox.nursery.some(id => id !== null); }
