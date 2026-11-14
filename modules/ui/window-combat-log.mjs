import { clampNumberLocal, saveLayoutState } from './window-layout-store.mjs';
import { beginCapturedWindowGesture, cancelWindowGesture } from './window-gesture-lifetime.mjs';
import { queueWindowFrame, cancelWindowFrame } from './window-frame-queue.mjs';
import { listenWindow } from './window-view-lifetime.mjs';

export function saveCombatLogReserve(runtime, px) {
    runtime.state.layoutState.combatLog.reserve = clampNumberLocal(runtime, px, runtime.state.COMBAT_LOG_RESERVE_MIN, 4000, runtime.state.COMBAT_LOG_RESERVE_MIN);
    applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve);
    saveLayoutState(runtime);
}

/** What the stage leaves now (CSS px; a stage held by its 4:3 width leaves more than the stored share) and the most it may leave.
* The stage's limit read with a zero share is the whole height the stage and the log split. Null outside the stacked layout. */
export function measureCombatLogShare(runtime) {
    const stage = runtime.deps.document.querySelector('#tab-battle .combat-stage');
    if (!stage) return null;
    const root = runtime.deps.document.documentElement.style, stored = runtime.state.layoutState.combatLog.reserve || runtime.state.COMBAT_LOG_RESERVE_MIN;
    root.setProperty('--combat-log-reserve', '0px');
    const whole = (0, runtime.deps.parseFloat)((0, runtime.deps.getComputedStyle)(stage).maxHeight);
    root.setProperty('--combat-log-reserve', stored + 'px');
    if (!Number.isFinite(whole)) return null;
    const factor = (runtime.deps.window.uiDisplay && runtime.deps.window.uiDisplay.factor) || 1;
    return { now: whole - stage.getBoundingClientRect().height / factor, most: Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, whole - runtime.state.COMBAT_LOG_MIN_STAGE), factor };
}

export function startCombatLogResize(runtime, event) {
    if (event.button > 0) return;
    cancelWindowGesture(runtime);
    const share = measureCombatLogShare(runtime);
    if (!share) return;
    const handle = event.currentTarget, startY = event.clientY;
    let reserve = share.now;
    event.preventDefault();
    handle.classList.add('is-dragging');
    const move = moved => {
        reserve = Math.min(share.most, Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, share.now + (startY - moved.clientY) / share.factor));
        queueWindowFrame(runtime, 'combatLogResizeFrame', () => applyCombatLogReserve(runtime, reserve));
    };
    const finish = commit => {
        cancelWindowFrame(runtime, 'combatLogResizeFrame');
        handle.classList.remove('is-dragging');
        if (commit) saveCombatLogReserve(runtime, reserve);
        else applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve || runtime.state.COMBAT_LOG_RESERVE_MIN);
    };
    beginCapturedWindowGesture(runtime, handle, event.pointerId, { move, finish });
}

export function nudgeCombatLogResize(runtime, event) {
    const step = { ArrowUp: runtime.state.COMBAT_LOG_KEY_STEP, ArrowDown: -runtime.state.COMBAT_LOG_KEY_STEP }[event.key];
    const share = step ? measureCombatLogShare(runtime) : null;
    if (!share) return;
    event.preventDefault();
    saveCombatLogReserve(runtime, Math.min(share.most, Math.max(runtime.state.COMBAT_LOG_RESERVE_MIN, share.now + step)));
}

export function setupCombatLogResize(runtime) {
    // #battle-column moves into #tab-battle after boot (index.html keeps it outside), so the feed is found on its own.
    const feed = runtime.deps.document.querySelector('.combat-feed');
    if (!feed || runtime.deps.document.getElementById('combat-log-resize')) return;
    const handle = runtime.deps.document.createElement('div');
    handle.id = 'combat-log-resize';
    handle.className = 'combat-log-resize';
    handle.tabIndex = 0;
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'horizontal');
    handle.setAttribute('aria-label', typeof runtime.deps._t === 'function' ? (0, runtime.deps._t)('전투 기록 높이 조절') : '전투 기록 높이 조절');
    feed.parentNode.insertBefore(handle, feed);
    listenWindow(runtime, handle, 'pointerdown', runtime.handlers.startCombatLogResize);
    listenWindow(runtime, handle, 'keydown', runtime.handlers.nudgeCombatLogResize);
    listenWindow(runtime, handle, 'dblclick', () => saveCombatLogReserve(runtime, runtime.state.COMBAT_LOG_RESERVE_MIN));
    if (runtime.state.layoutState.combatLog.reserve) applyCombatLogReserve(runtime, runtime.state.layoutState.combatLog.reserve);
}

export function applyCombatLogReserve(runtime, px) {
    runtime.deps.document.documentElement.style.setProperty('--combat-log-reserve', Math.round(px) + 'px');
    const log = runtime.deps.document.getElementById('log');
    if (log && log.combatLogAtBottom !== false && typeof runtime.deps.window.scrollCombatLogToLatest === 'function') runtime.deps.window.scrollCombatLogToLatest(log);
}
