import { createFrames } from './message-frame-interaction.mjs';
import { renderFrames, noticeFrameVisibility } from './message-frame-presentation.mjs';
import { frameEl } from './message-frame-queries.mjs';
import { defaultFrameState } from './message-frame-store.mjs';
import { cancelMessagePointer, clearMessageClickTimer } from './message-frame-lifetime.mjs';
import { releaseViewEvents } from './view-events.mjs';

export function rememberHome(runtime, element) {
    if (element && !runtime.state.homes.has(element)) runtime.state.homes.set(element, { parent: element.parentElement, next: element.nextSibling });
}

export function mountFrames(runtime) {
    const layer = runtime.deps.document.getElementById('right-pane');
    if (!layer) return;
    if (!runtime.state.stash) createFrames(runtime, layer);
    if (!runtime.state.mounted) {
        [...Object.values(runtime.state.TABS).map(tab => runtime.deps.document.getElementById(tab.paneId)), runtime.state.dot].forEach(runtime.handlers.rememberHome);
        runtime.state.mounted = true;
        runtime.deps.document.body.classList.add('message-frames-on');
        runtime.deps.document.getElementById('tab-social')?.classList.add('ui-community-dock');
    }
    renderFrames(runtime);
}

/** Phone layout: the log and chat go back where the page put them. */
export function unmountFrames(runtime) {
    if (!runtime.state.mounted) return;
    cancelMessagePointer(runtime);
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalWatch = runtime.state.goalTarget = null;
    runtime.state.mounted = false;
    runtime.state.homes.forEach((home, element) => home.parent.insertBefore(element, home.next && home.next.parentNode === home.parent ? home.next : null));
    runtime.deps.document.body.classList.remove('message-frames-on');
    runtime.deps.document.getElementById('tab-social')?.classList.remove('ui-community-dock');
    runtime.state.FRAMES.forEach(frame => { const el = frameEl(runtime, frame); if (el) el.style.display = 'none'; });
    runtime.state.visible = new Set();
}

/** Phone layout: the battle screen's log panel switches between the log and the chat (2026-11-07 사용자: 커뮤니티 탭을 지우고 전투
* 로그와 채팅을 판에서 바꾼다). The chat is the page's own #tab-social, moved into the panel while picked and home again otherwise. */
export function placePhoneFeed(runtime) {
    const feed = runtime.deps.document.querySelector('#tab-battle .combat-feed'), social = runtime.deps.document.getElementById('tab-social');
    if (!feed || !social) return;
    const chat = !runtime.state.mounted && runtime.state.phoneTab === 'chat';
    rememberHome(runtime, social);
    if (chat && social.parentElement !== feed) feed.appendChild(social);
    if (!chat && social.parentElement === feed) {
        const home = runtime.state.homes.get(social);
        home.parent.insertBefore(social, home.next && home.next.parentNode === home.parent ? home.next : null);
    }
    social.classList.toggle('is-feed-chat', chat);
    feed.classList.toggle('is-chat', chat);
    feed.querySelectorAll('.combat-feed-title > .ui-context-dock-tab').forEach(button => {
        const on = (button.id === 'btn-combat-chat-tab') === chat;
        button.classList.toggle('active', on);
        button.setAttribute('aria-selected', String(on));
    });
}

/** Picks the phone log panel's tab. The folded bar of a low landscape phone (uiDisplay.battleHudAtSide) unfolds to show it. */
export function showPhoneTab(runtime, tab) {
    if (runtime.state.mounted || !runtime.state.TABS[tab]) return false;
    runtime.state.phoneTab = tab;
    placePhoneFeed(runtime);
    if (runtime.deps.uiDisplay.battleHudAtSide && runtime.deps.document.body.classList.contains('combat-log-collapsed')) (0, runtime.deps.toggleCombatLogCollapse)();
    noticeFrameVisibility(runtime);
    return true;
}

/** Called by js/ui-window-manager.js whenever the layout is (re)applied: { desktop, workspaceRect }. */
export function syncFrames(runtime, environment) {
    const changed = !runtime.state.env || runtime.state.env.desktop !== environment?.desktop;
    runtime.state.env = environment || runtime.state.env;
    if (runtime.state.env && runtime.state.env.desktop) mountFrames(runtime);
    else unmountFrames(runtime);
    placePhoneFeed(runtime);
    if (changed && typeof runtime.deps.applyPanelLayoutSettings === 'function') (0, runtime.deps.applyPanelLayoutSettings)();
}

/** Brings a tab into view: its own frame when splitTab, otherwise the shared frame's active tab. */
export function showFrameTab(runtime, tab, expand = true) {
    if (!runtime.state.mounted || !runtime.state.TABS[tab]) return false;
    cancelMessagePointer(runtime);
    if (runtime.state.state.split) {
        if (expand) runtime.state.state.collapsed[runtime.state.state.side === tab ? 'side' : 'main'] = false;
    }
    else {
        runtime.state.state.active = tab;
        if (expand) runtime.state.state.collapsed.main = false;
    }
    renderFrames(runtime);
    return true;
}

export function resetFrames(runtime) {
    cancelMessagePointer(runtime);
    runtime.state.state = defaultFrameState();
    renderFrames(runtime);
}

/** Move the real log/chat nodes home before removing their temporary frames. */
export function disposeMessageFrames(runtime) {
    if (!runtime.active) return;
    runtime.active = false;
    cancelMessagePointer(runtime);
    clearMessageClickTimer(runtime);
    releaseViewEvents(runtime);
    runtime.state.goalWatch?.disconnect();
    runtime.state.goalWatch = runtime.state.goalTarget = null;
    unmountFrames(runtime);
    runtime.state.phoneTab = 'log';
    placePhoneFeed(runtime);
    runtime.state.homes.forEach((home, element) => home.parent.insertBefore(element, home.next?.parentNode === home.parent ? home.next : null));
    for (const frame of runtime.state.FRAMES) frameEl(runtime, frame)?.remove();
    runtime.state.stash?.remove();
    runtime.state.homes.clear();
    runtime.state.stash = runtime.state.dot = runtime.state.env = runtime.state.stageBox = null;
    runtime.state.visible.clear();
}
