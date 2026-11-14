import { frameScale, frameEl } from './message-frame-queries.mjs';

/** Where a frame may go: the floating windows' range, down over the bottom HUD to the screen edge (a layer above the HUD). */
export function frameWorkspace(runtime) {
    if (runtime.state.env && typeof runtime.state.env.workspaceRect === 'function') return runtime.state.env.workspaceRect();
    return { left: 8, top: 8, width: runtime.deps.window.innerWidth / frameScale(runtime) - 16, height: runtime.deps.window.innerHeight / frameScale(runtime) - 16 };
}

/** Inside the workspace. A resize keeps the corner where it is and stops at the workspace edge. */
export function clampRect(runtime, rect, keepPosition) {
    const ws = frameWorkspace(runtime);
    const maxWidth = keepPosition ? ws.left + ws.width - rect.x : ws.width;
    const maxHeight = keepPosition ? ws.top + ws.height - rect.y : ws.height;
    const width = clampFrameValue(rect.width, Math.min(runtime.state.MIN_WIDTH, maxWidth), maxWidth);
    const height = clampFrameValue(rect.height, Math.min(runtime.state.MIN_HEIGHT, maxHeight), maxHeight);
    return { width, height, x: clampFrameValue(rect.x, ws.left, ws.left + ws.width - width), y: clampFrameValue(rect.y, ws.top, ws.top + ws.height - height) };
}

/** The width the battle shell keeps for the log (--combat-log-width, a clamp of the screen width). */
export function shellLogWidth(runtime) {
    const probe = runtime.deps.document.createElement('div');
    probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--combat-log-width, 300px)';
    runtime.deps.document.body.appendChild(probe);
    const width = probe.getBoundingClientRect().width / frameScale(runtime);
    probe.remove();
    return width > 100 ? width : runtime.state.DEFAULT_WIDTH;
}

/** The bottom of the open goal drawer's panel (js/ui-window-manager.js #ui-goal-body) in frame px, 0 while it is folded. */
export function openGoalBottom(runtime) {
    const body = runtime.deps.document.querySelector('#ui-goal-drawer.expanded #ui-goal-body');
    const box = body && body.getClientRects().length ? body.getBoundingClientRect() : null;
    return box && box.height ? box.bottom / frameScale(runtime) : 0;
}

export function defaultMainRect(runtime) {
    const ws = frameWorkspace(runtime), width = shellLogWidth(runtime);
    const hud = runtime.deps.document.querySelector('.player-hud');
    const hudTop = hud ? hud.getBoundingClientRect().top / frameScale(runtime) : 0;
    const bottom = hudTop > ws.top + 240 ? hudTop - runtime.state.GAP : ws.top + ws.height;
    const room = bottom - Math.max(ws.top + runtime.state.TOP_RESERVE, openGoalBottom(runtime) + runtime.state.GAP);
    const height = Math.min(runtime.state.DEFAULT_HEIGHT, bottom - ws.top - runtime.state.TOP_RESERVE, Math.max(runtime.state.MIN_HEIGHT, room));
    return { width, height, x: ws.left + ws.width - width, y: bottom - height };
}

/** A split-off frame opens beside the shared one. */
export function defaultRect(runtime, frame) {
    if (frame !== 'side') return defaultMainRect(runtime);
    const main = runtime.state.state.main || defaultMainRect(runtime);
    return { ...main, x: main.x - main.width - runtime.state.GAP };
}

export function applyRect(runtime, frame, rect) {
    const el = frameEl(runtime, frame), folded = runtime.state.state.collapsed[frame];
    runtime.state.placedRects[frame] = { ...rect };
    el.style.left = `${rect.x}px`;
    el.style.top = `${folded ? rect.y + rect.height - runtime.state.COLLAPSED_HEIGHT : rect.y}px`;
    el.style.width = `${rect.width}px`;
    el.style.height = `${folded ? runtime.state.COLLAPSED_HEIGHT : rect.height}px`;
}

export function setRect(runtime, frame, rect, keepPosition) {
    const next = clampRect(runtime, rect, keepPosition);
    if (frame === 'main') runtime.state.state.main = next;
    else runtime.state.state.sideRect = next;
    applyRect(runtime, frame, next);
}

/** One axis of a resize: the dragged edge moves, the other stays. The size keeps its minimum and the workspace. */
export function createFrameResizeAxis() {
    return function frameResizeAxis(pos, size, delta, movesStart, limits) {
        const [min, lo, hi] = limits;
        if (!movesStart) return [pos, Math.max(Math.min(min, hi - pos), Math.min(hi - pos, size + delta))];
        const end = pos + size, start = Math.max(lo, Math.min(end - min, pos + delta));
        return [start, end - start];
    };
}

/** The rect after dragging the given edges (n, s, e, w or a corner such as nw) by dx, dy. */
export function frameResizedRect(runtime, rect, edges, dx, dy) {
    const ws = frameWorkspace(runtime);
    const [x, width] = /[ew]/.test(edges) ? runtime.handlers.frameResizeAxis(rect.x, rect.width, dx, edges.includes('w'), [runtime.state.MIN_WIDTH, ws.left, ws.left + ws.width]) : [rect.x, rect.width];
    const [y, height] = /[ns]/.test(edges) ? runtime.handlers.frameResizeAxis(rect.y, rect.height, dy, edges.includes('n'), [runtime.state.MIN_HEIGHT, ws.top, ws.top + ws.height]) : [rect.y, rect.height];
    return { x, y, width, height };
}

export function clampFrameValue(value, min, max) { return Math.round(Math.max(min, Math.min(max, Number(value) || 0))); }

export function rectFor(runtime, frame) { return (frame === 'main' ? runtime.state.state.main : runtime.state.state.sideRect) || defaultRect(runtime, frame); }
