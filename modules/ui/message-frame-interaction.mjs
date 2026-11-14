import { clampRect, rectFor, defaultRect, setRect, frameResizedRect } from './message-frame-geometry.mjs';
import { renderFrames } from './message-frame-presentation.mjs';
import { frameTabs, frameScale, frameEl } from './message-frame-queries.mjs';
import { saveFrameState } from './message-frame-store.mjs';
import { listenView, releaseViewEvents } from './view-events.mjs';
import { listenMessage, cancelMessagePointer, clearMessageClickTimer } from './message-frame-lifetime.mjs';

export function splitTab(runtime, tab, point) {
    if (runtime.state.state.split) return;
    runtime.state.state.split = true;
    runtime.state.state.side = tab;
    runtime.state.state.collapsed.side = false;
    runtime.state.state.sideRect = clampRect(runtime, point ? { ...rectFor(runtime, 'main'), x: point.x - rectFor(runtime, 'main').width / 2, y: point.y - 14 } : defaultRect(runtime, 'side'));
    renderFrames(runtime);
}

export function mergeTabs(runtime, tab) {
    runtime.state.state.split = false;
    runtime.state.state.active = tab;
    runtime.state.state.collapsed.main = false;
    renderFrames(runtime);
}

export function runAction(runtime, action, frame) {
    if (action === 'settings' && typeof runtime.deps.openChatSettings === 'function') return (0, runtime.deps.openChatSettings)();
    if (action === 'split') return splitTab(runtime, runtime.state.state.active, null);
    if (action === 'merge') return mergeTabs(runtime, frameTabs(runtime, frame)[0]);
    if (action !== 'collapse') return undefined;
    runtime.state.state.collapsed[frame] = !runtime.state.state.collapsed[frame];
    return renderFrames(runtime);
}

export function onFrameClick(runtime, event, frame) {
    if (runtime.state.suppressClick) { runtime.state.suppressClick = false; return; }
    cancelMessagePointer(runtime);
    const action = event.target.closest('[data-message-action]');
    if (action) return runAction(runtime, action.dataset.messageAction, frame);
    const tab = event.target.closest('[data-message-tab]');
    if (!tab || runtime.state.state.split) return undefined;
    runtime.state.state.active = tab.dataset.messageTab;
    runtime.state.state.collapsed.main = false;
    return renderFrames(runtime);
}

export function trackPointer(runtime, event, onMove, onEnd) {
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    const owner = runtime.deps.game, snapshot = runtime.deps.structuredClone(runtime.state.state);
    const pointer = { active: true, listeners: [], cancelMessagePointer: () => finishMessagePointer(false) };
    const finishMessagePointer = commit => {
        if (!pointer.active) return;
        releaseViewEvents(pointer);
        runtime.state.pointer = null;
        if (commit && runtime.active && owner === runtime.deps.game && runtime.state.mounted) onEnd();
        else {
            runtime.state.state = snapshot;
            clearMessageClickTimer(runtime);
            renderFrames(runtime, false);
        }
    };
    runtime.state.pointer = pointer;
    listenView(pointer, runtime.deps.window, 'pointermove', moved => {
        if (moved.pointerId !== event.pointerId) return;
        if (!runtime.active || owner !== runtime.deps.game || !runtime.state.mounted) { finishMessagePointer(false); return; }
        onMove(moved);
    });
    listenView(pointer, runtime.deps.window, 'pointerup', ended => { if (ended.pointerId === event.pointerId) finishMessagePointer(true); });
    listenView(pointer, runtime.deps.window, 'pointercancel', ended => { if (ended.pointerId === event.pointerId) finishMessagePointer(false); });
    listenView(pointer, runtime.deps.window, 'blur', () => finishMessagePointer(false));
}

export function beginMove(runtime, event, frame) {
    cancelMessagePointer(runtime);
    event.preventDefault();
    const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(runtime, frame) } };
    trackPointer(runtime, event, move => setRect(runtime, frame, { ...start.rect, x: start.rect.x + (move.clientX - start.x) / frameScale(runtime), y: start.rect.y + (move.clientY - start.y) / frameScale(runtime) }),
        () => saveFrameState(runtime));
}

export function beginResize(runtime, event, frame, edges) {
    if (event.button !== undefined && event.button !== 0) return;
    cancelMessagePointer(runtime);
    event.preventDefault();
    event.stopPropagation();
    const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(runtime, frame) } };
    trackPointer(runtime, event, move => setRect(runtime, frame, frameResizedRect(runtime, start.rect, edges, (move.clientX - start.x) / frameScale(runtime), (move.clientY - start.y) / frameScale(runtime)), true),
        () => saveFrameState(runtime));
}

export function leftFrame(runtime, event, frame) {
    const box = frameEl(runtime, frame).getBoundingClientRect();
    return event.clientX < box.left - runtime.state.DRAG_OUT_PX || event.clientX > box.right + runtime.state.DRAG_OUT_PX
        || event.clientY < box.top - runtime.state.DRAG_OUT_PX || event.clientY > box.bottom + runtime.state.DRAG_OUT_PX;
}

/** A tab dragged out of the shared frame becomes its own frame under the pointer, and keeps following it until release. */
export function beginTabDrag(runtime, event, tab) {
    let dragged = false;
    trackPointer(runtime, event, move => {
        if (!dragged && !leftFrame(runtime, move, 'main')) return;
        const point = { x: move.clientX / frameScale(runtime), y: move.clientY / frameScale(runtime) };
        if (!dragged) {
            dragged = true;
            runtime.state.suppressClick = true;
            return splitTab(runtime, tab, point);
        }
        return setRect(runtime, 'side', { ...rectFor(runtime, 'side'), x: point.x - rectFor(runtime, 'side').width / 2, y: point.y - 14 });
        }, () => {
        if (!dragged) return;
        saveFrameState(runtime);
        // 놓은 자리가 창 밖이면 click이 창에 오지 않는다. 다음 click을 삼키지 않게 바로 푼다.
        runtime.state.clickTimer = (0, runtime.deps.setTimeout)(() => clearMessageClickTimer(runtime), 0);
    });
}

export function onBarPointerDown(runtime, event, frame) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest('[data-message-action]')) return;
    const tab = event.target.closest('[data-message-tab]');
    if (tab && !runtime.state.state.split) beginTabDrag(runtime, event, tab.dataset.messageTab);
    else beginMove(runtime, event, frame);
}

export function buildFrame(runtime, frame) {
    const el = runtime.deps.document.createElement('section');
    el.id = `message-frame-${frame}`;
    el.className = 'message-frame';
    el.setAttribute('aria-label', frame === 'main' ? '전투 기록과 채팅' : '따로 띄운 탭');
    el.innerHTML = '<div class="message-frame-bar"><div class="message-frame-tabs" role="tablist"></div><div class="message-frame-actions"></div></div>'
        + '<div class="message-frame-body"></div>'
        + runtime.state.EDGES.map(edges => `<div class="message-frame-edge" data-edges="${edges}" aria-hidden="true"></div>`).join('');
    listenMessage(runtime, el.querySelector('.message-frame-bar'), 'pointerdown', event => onBarPointerDown(runtime, event, frame));
    el.querySelectorAll('[data-edges]').forEach(handle => listenMessage(runtime, handle, 'pointerdown', event => beginResize(runtime, event, frame, handle.dataset.edges)));
    listenMessage(runtime, el, 'click', event => onFrameClick(runtime, event, frame));
    return el;
}

export function createFrames(runtime, layer) {
    runtime.state.FRAMES.forEach(frame => layer.appendChild(buildFrame(runtime, frame)));
    runtime.state.stash = runtime.deps.document.createElement('div');
    runtime.state.stash.className = 'message-frame-stash';
    runtime.state.stash.hidden = true;
    layer.appendChild(runtime.state.stash);
    runtime.state.dot = runtime.deps.document.getElementById('noti-social-dock');
}
