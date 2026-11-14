import { frameEl, frameTabs, shownTab } from './message-frame-queries.mjs';
import { applyRect, clampRect, rectFor, defaultRect } from './message-frame-geometry.mjs';
import { saveFrameState } from './message-frame-store.mjs';

export function actionsHtml(runtime, frame, tabs) {
    const folded = runtime.state.state.collapsed[frame];
    const buttons = tabs.includes('chat') ? [['settings', '⚙', '채팅 설정']] : [];
    buttons.push(runtime.state.state.split ? ['merge', '⇲', '합치기'] : ['split', '⇱', '보는 탭을 따로 띄우기']);
    buttons.push(folded ? ['collapse', '▢', '펼치기'] : ['collapse', '—', '접기']);
    return buttons.map(([action, glyph, label]) => `<button type="button" data-message-action="${action}" data-tip="${label}" aria-label="${label}">${glyph}</button>`).join('');
}

export function renderBar(runtime, frame, tabs) {
    const el = frameEl(runtime, frame), shown = tabs.length > 1 ? runtime.state.state.active : tabs[0];
    el.querySelector('.message-frame-tabs').innerHTML = tabs.map(tab => `<button type="button" class="message-frame-tab${tab === shown ? ' active' : ''}" `
            + `role="tab" aria-selected="${tab === shown}" data-message-tab="${tab}">${(0, runtime.deps._t)(runtime.state.TABS[tab].label)}</button>`).join('');
    el.querySelector('.message-frame-actions').innerHTML = actionsHtml(runtime, frame, tabs);
    const chatTab = el.querySelector('[data-message-tab="chat"]');
    if (chatTab && runtime.state.dot) chatTab.appendChild(runtime.state.dot);
}

export function renderFrame(runtime, frame) {
    const el = frameEl(runtime, frame), tabs = frameTabs(runtime, frame);
    el.style.display = tabs.length ? '' : 'none';
    if (!tabs.length) return;
    el.classList.toggle('collapsed', runtime.state.state.collapsed[frame]);
    renderBar(runtime, frame, tabs);
    // 다시 그릴 때는 작업 영역 안으로만 맞춘다. 사용자가 옮기기 전의 기본 자리는 저장하지 않는다.
    applyRect(runtime, frame, clampRect(runtime, rectFor(runtime, frame)));
}

export function placePanes(runtime) {
    Object.keys(runtime.state.TABS).forEach(tab => {
        const pane = runtime.deps.document.getElementById(runtime.state.TABS[tab].paneId);
        const frame = runtime.state.FRAMES.find(name => shownTab(runtime, name) === tab);
        const target = frame ? frameEl(runtime, frame).querySelector('.message-frame-body') : runtime.state.stash;
        if (pane && pane.parentElement !== target) target.appendChild(pane);
    });
}

/** A tab that comes into view catches up: chat draws and starts receiving, the log jumps to its newest line. */
export function noticeFrameVisibility(runtime) {
    const now = new Set(Object.keys(runtime.state.TABS).filter(runtime.handlers.isFrameTabVisible));
    if (now.has('chat') && !runtime.state.visible.has('chat') && typeof runtime.deps.renderSocialTab === 'function') (0, runtime.deps.renderSocialTab)();
    const log = runtime.deps.document.getElementById('log');
    if (now.has('log') && !runtime.state.visible.has('log') && log) log.scrollTop = log.scrollHeight;
    runtime.state.visible = now;
    if (typeof runtime.deps.syncSocialChatPolling === 'function') (0, runtime.deps.syncSocialChatPolling)();
    if (typeof runtime.deps.updateTabNotificationDots === 'function') (0, runtime.deps.updateTabNotificationDots)();
}

export function followGoalDrawer(runtime) {
    if (!runtime.active || !runtime.state.mounted) return;
    runtime.state.FRAMES.forEach(frame => {
        if (frameTabs(runtime, frame).length && !(frame === 'main' ? runtime.state.state.main : runtime.state.state.sideRect)) applyRect(runtime, frame, clampRect(runtime, defaultRect(runtime, frame)));
    });
}

export function watchGoalDrawer(runtime) {
    const body = runtime.deps.document.getElementById('ui-goal-body');
    if (!body || typeof runtime.deps.ResizeObserver !== 'function' || runtime.state.goalTarget === body) return;
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalTarget = body;
    runtime.state.goalWatch = new runtime.deps.ResizeObserver(runtime.handlers.followGoalDrawer);
    runtime.state.goalWatch.observe(body);
}

export function renderFrames(runtime, persist = true) {
    if (!runtime.active || !runtime.state.mounted) return;
    watchGoalDrawer(runtime);
    runtime.state.FRAMES.forEach(runtime.handlers.renderFrame);
    placePanes(runtime);
    if (persist) saveFrameState(runtime);
    noticeFrameVisibility(runtime);
}
