// 전투 기록과 채팅 창(PC, 2026-10-03 사용자 요청, 라그나로크와 마비노기 채팅창처럼). 작은 창 하나에 [전투][채팅] 탭이 있고,
// 탭을 창 밖으로 끌거나 ⇱를 누르면 보던 탭이 따로 창이 된다. ⇲로 다시 합친다. 두 창 모두 탭 줄을 끌어 옮기고 테두리(위, 아래,
// 양옆, 네 모서리)로 크기를 바꾼다. 범위는 떠 있는 관리 창과 같아서(js/ui-window-manager.js getFreeWindowRect) 하단 HUD를 덮고
// 화면 아래 끝까지 둘 수 있고(2026-10-03, 2026-10-04 사용자 요청), 관리 창보다는 아래에 깔린다.
// 전투 기록(#log)과 채팅(#tab-social)은 원래 요소를 창으로 옮겨 쓰고, 휴대폰 배치에서는 원래 자리로 돌려놓는다.
// 채팅 설정(닉네임, 프로필, 동기화, 접속자)은 ⚙ 하나(social.js openChatSettings)에 모았다.
const messageFrames = (() => {
    const STORAGE_KEY = 'rignin-message-frames-v1';
    const TABS = Object.freeze({ log: { label: '전투', paneId: 'log' }, chat: { label: '채팅', paneId: 'tab-social' } });
    const FRAMES = Object.freeze(['main', 'side']);
    const MIN_WIDTH = 220;
    const MIN_HEIGHT = 120;
    // 접은 창은 탭 줄만 남는다. 아래 끝을 그대로 두고 위를 줄여, 전처럼 접어도 같은 자리에 줄이 남는다.
    const COLLAPSED_HEIGHT = 34;
    const DRAG_OUT_PX = 24;
    const DEFAULT_WIDTH = 300;
    const DEFAULT_HEIGHT = 420;
    const GAP = 10;
    // 처음 자리의 위끝은 오른쪽 위 귀환(지역 줄)과 그 아래 목표 단추(css/themes/rift-stage.css, 아래 끝 약 96px) 밑이다.
    // 둘이 오른쪽 끝으로 옮겨 오며(2026-10-07) 작은 화면(높이 720)에서 기록 창이 목표 단추를 덮었다.
    const TOP_RESERVE = 96;
    // 크기 조절 테두리: 오른쪽 아래 모서리(보이는 손잡이) 말고도 위, 아래, 양옆과 나머지 세 모서리.
    const EDGES = Object.freeze(['n', 's', 'e', 'w', 'nw', 'ne', 'sw']);
    const homes = new Map();
    let state = readFrameState();
    let env = null;
    let mounted = false;
    let stash = null;
    let dot = null;
    let visible = new Set();
    let suppressClick = false;

    function defaultFrameState() {
        return { split: false, active: 'log', side: 'chat', main: null, sideRect: null, collapsed: { main: false, side: false } };
    }

    function validFrameRect(rect) {
        if (!rect || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(Number(rect[key])))) return null;
        return { x: Number(rect.x), y: Number(rect.y), width: Number(rect.width), height: Number(rect.height) };
    }

    function normalizeFrameState(saved) {
        const base = defaultFrameState();
        if (!saved || typeof saved !== 'object') return base;
        const collapsed = saved.collapsed || {};
        return {
            split: saved.split === true, active: TABS[saved.active] ? saved.active : base.active, side: TABS[saved.side] ? saved.side : base.side,
            main: validFrameRect(saved.main), sideRect: validFrameRect(saved.sideRect), collapsed: { main: collapsed.main === true, side: collapsed.side === true }
        };
    }

    function readFrameState() {
        try {
            return normalizeFrameState(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'));
        } catch (error) {
            console.warn('message frame layout ignored:', error);
            return defaultFrameState();
        }
    }

    function saveFrameState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.warn('message frame layout was not saved:', error);
        }
    }

    const otherTab = tab => (tab === 'log' ? 'chat' : 'log');
    const frameEl = frame => document.getElementById(`message-frame-${frame}`);
    const frameScale = () => (typeof uiDisplay === 'object' && uiDisplay.factor) || 1;

    function frameTabs(frame) {
        if (!state.split) return frame === 'main' ? ['log', 'chat'] : [];
        return [frame === 'side' ? state.side : otherTab(state.side)];
    }

    /** The tab a frame shows now: none while folded or while the frame is not in use. */
    function shownTab(frame) {
        const tabs = frameTabs(frame);
        if (!tabs.length || state.collapsed[frame]) return null;
        return tabs.length > 1 ? state.active : tabs[0];
    }

    function isFrameTabVisible(tab) {
        return mounted && FRAMES.some(frame => shownTab(frame) === tab);
    }

    /** Where a frame may go: the floating windows' range, down over the bottom HUD to the screen edge (a layer above the HUD). */
    function frameWorkspace() {
        if (env && typeof env.workspaceRect === 'function') return env.workspaceRect();
        return { left: 8, top: 8, width: window.innerWidth / frameScale() - 16, height: window.innerHeight / frameScale() - 16 };
    }

    const clampFrameValue = (value, min, max) => Math.round(Math.max(min, Math.min(max, Number(value) || 0)));

    /** Inside the workspace. A resize keeps the corner where it is and stops at the workspace edge. */
    function clampRect(rect, keepPosition) {
        const ws = frameWorkspace();
        const maxWidth = keepPosition ? ws.left + ws.width - rect.x : ws.width;
        const maxHeight = keepPosition ? ws.top + ws.height - rect.y : ws.height;
        const width = clampFrameValue(rect.width, Math.min(MIN_WIDTH, maxWidth), maxWidth);
        const height = clampFrameValue(rect.height, Math.min(MIN_HEIGHT, maxHeight), maxHeight);
        return { width, height, x: clampFrameValue(rect.x, ws.left, ws.left + ws.width - width), y: clampFrameValue(rect.y, ws.top, ws.top + ws.height - height) };
    }

    /** Where the docked log used to be: the right edge, just above the bottom HUD box (its raised map and orbs included). */
    /** The width the battle shell keeps for the log (--combat-log-width, a clamp of the screen width). */
    function shellLogWidth() {
        const probe = document.createElement('div');
        probe.style.cssText = 'position:absolute;visibility:hidden;width:var(--combat-log-width, 300px)';
        document.body.appendChild(probe);
        const width = probe.getBoundingClientRect().width / frameScale();
        probe.remove();
        return width > 100 ? width : DEFAULT_WIDTH;
    }

    function defaultMainRect() {
        const ws = frameWorkspace(), width = shellLogWidth();
        const hud = document.querySelector('.player-hud');
        const hudTop = hud ? hud.getBoundingClientRect().top / frameScale() : 0;
        const bottom = hudTop > ws.top + 240 ? hudTop - GAP : ws.top + ws.height;
        const height = Math.min(DEFAULT_HEIGHT, bottom - ws.top - TOP_RESERVE);
        return { width, height, x: ws.left + ws.width - width, y: bottom - height };
    }

    /** A split-off frame opens beside the shared one. */
    function defaultRect(frame) {
        if (frame !== 'side') return defaultMainRect();
        const main = state.main || defaultMainRect();
        return { ...main, x: main.x - main.width - GAP };
    }

    const rectFor = frame => (frame === 'main' ? state.main : state.sideRect) || defaultRect(frame);

    function applyRect(frame, rect) {
        const el = frameEl(frame), folded = state.collapsed[frame];
        el.style.left = `${rect.x}px`;
        el.style.top = `${folded ? rect.y + rect.height - COLLAPSED_HEIGHT : rect.y}px`;
        el.style.width = `${rect.width}px`;
        el.style.height = `${folded ? COLLAPSED_HEIGHT : rect.height}px`;
    }

    function setRect(frame, rect, keepPosition) {
        const next = clampRect(rect, keepPosition);
        if (frame === 'main') state.main = next;
        else state.sideRect = next;
        applyRect(frame, next);
    }

    function actionsHtml(frame, tabs) {
        const folded = state.collapsed[frame];
        const buttons = tabs.includes('chat') ? [['settings', '⚙', '채팅 설정']] : [];
        buttons.push(state.split ? ['merge', '⇲', '합치기'] : ['split', '⇱', '보는 탭을 따로 띄우기']);
        buttons.push(folded ? ['collapse', '▢', '펼치기'] : ['collapse', '—', '접기']);
        return buttons.map(([action, glyph, label]) => `<button type="button" data-message-action="${action}" title="${label}" aria-label="${label}">${glyph}</button>`).join('');
    }

    function renderBar(frame, tabs) {
        const el = frameEl(frame), shown = tabs.length > 1 ? state.active : tabs[0];
        el.querySelector('.message-frame-tabs').innerHTML = tabs.map(tab => `<button type="button" class="message-frame-tab${tab === shown ? ' active' : ''}" `
            + `role="tab" aria-selected="${tab === shown}" data-message-tab="${tab}">${TABS[tab].label}</button>`).join('');
        el.querySelector('.message-frame-actions').innerHTML = actionsHtml(frame, tabs);
        const chatTab = el.querySelector('[data-message-tab="chat"]');
        if (chatTab && dot) chatTab.appendChild(dot);
    }

    function renderFrame(frame) {
        const el = frameEl(frame), tabs = frameTabs(frame);
        el.style.display = tabs.length ? '' : 'none';
        if (!tabs.length) return;
        el.classList.toggle('collapsed', state.collapsed[frame]);
        renderBar(frame, tabs);
        // 다시 그릴 때는 작업 영역 안으로만 맞춘다. 사용자가 옮기기 전의 기본 자리는 저장하지 않는다.
        applyRect(frame, clampRect(rectFor(frame)));
    }

    function placePanes() {
        Object.keys(TABS).forEach(tab => {
            const pane = document.getElementById(TABS[tab].paneId);
            const frame = FRAMES.find(name => shownTab(name) === tab);
            const target = frame ? frameEl(frame).querySelector('.message-frame-body') : stash;
            if (pane && pane.parentElement !== target) target.appendChild(pane);
        });
    }

    /** A tab that comes into view catches up: chat draws and starts receiving, the log jumps to its newest line. */
    function noticeFrameVisibility() {
        const now = new Set(Object.keys(TABS).filter(isFrameTabVisible));
        if (now.has('chat') && !visible.has('chat') && typeof renderSocialTab === 'function') renderSocialTab();
        const log = document.getElementById('log');
        if (now.has('log') && !visible.has('log') && log) log.scrollTop = log.scrollHeight;
        visible = now;
        if (typeof syncSocialChatPolling === 'function') syncSocialChatPolling();
        if (typeof updateTabNotificationDots === 'function') updateTabNotificationDots();
    }

    function renderFrames() {
        if (!mounted) return;
        FRAMES.forEach(renderFrame);
        placePanes();
        saveFrameState();
        noticeFrameVisibility();
    }

    function splitTab(tab, point) {
        if (state.split) return;
        state.split = true;
        state.side = tab;
        state.collapsed.side = false;
        state.sideRect = clampRect(point ? { ...rectFor('main'), x: point.x - rectFor('main').width / 2, y: point.y - 14 } : defaultRect('side'));
        renderFrames();
    }

    function mergeTabs(tab) {
        state.split = false;
        state.active = tab;
        state.collapsed.main = false;
        renderFrames();
    }

    function runAction(action, frame) {
        if (action === 'settings' && typeof openChatSettings === 'function') return openChatSettings();
        if (action === 'split') return splitTab(state.active, null);
        if (action === 'merge') return mergeTabs(frameTabs(frame)[0]);
        if (action !== 'collapse') return undefined;
        state.collapsed[frame] = !state.collapsed[frame];
        return renderFrames();
    }

    function onFrameClick(event, frame) {
        if (suppressClick) { suppressClick = false; return; }
        const action = event.target.closest('[data-message-action]');
        if (action) return runAction(action.dataset.messageAction, frame);
        const tab = event.target.closest('[data-message-tab]');
        if (!tab || state.split) return undefined;
        state.active = tab.dataset.messageTab;
        state.collapsed.main = false;
        return renderFrames();
    }

    function trackPointer(onMove, onEnd) {
        const end = event => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', end);
            window.removeEventListener('pointercancel', end);
            onEnd(event);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
    }

    function beginMove(event, frame) {
        event.preventDefault();
        const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(frame) } };
        trackPointer(move => setRect(frame, { ...start.rect, x: start.rect.x + (move.clientX - start.x) / frameScale(), y: start.rect.y + (move.clientY - start.y) / frameScale() }),
            () => saveFrameState());
    }

    /** One axis of a resize: the dragged edge moves, the other stays. The size keeps its minimum and the workspace. */
    function frameResizeAxis(pos, size, delta, movesStart, limits) {
        const [min, lo, hi] = limits;
        if (!movesStart) return [pos, Math.max(Math.min(min, hi - pos), Math.min(hi - pos, size + delta))];
        const end = pos + size, start = Math.max(lo, Math.min(end - min, pos + delta));
        return [start, end - start];
    }

    /** The rect after dragging the given edges (n, s, e, w or a corner such as nw) by dx, dy. */
    function frameResizedRect(rect, edges, dx, dy) {
        const ws = frameWorkspace();
        const [x, width] = /[ew]/.test(edges) ? frameResizeAxis(rect.x, rect.width, dx, edges.includes('w'), [MIN_WIDTH, ws.left, ws.left + ws.width]) : [rect.x, rect.width];
        const [y, height] = /[ns]/.test(edges) ? frameResizeAxis(rect.y, rect.height, dy, edges.includes('n'), [MIN_HEIGHT, ws.top, ws.top + ws.height]) : [rect.y, rect.height];
        return { x, y, width, height };
    }

    function beginResize(event, frame, edges) {
        if (event.button !== undefined && event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        const start = { x: event.clientX, y: event.clientY, rect: { ...rectFor(frame) } };
        trackPointer(move => setRect(frame, frameResizedRect(start.rect, edges, (move.clientX - start.x) / frameScale(), (move.clientY - start.y) / frameScale()), true),
            () => saveFrameState());
    }

    function leftFrame(event, frame) {
        const box = frameEl(frame).getBoundingClientRect();
        return event.clientX < box.left - DRAG_OUT_PX || event.clientX > box.right + DRAG_OUT_PX
            || event.clientY < box.top - DRAG_OUT_PX || event.clientY > box.bottom + DRAG_OUT_PX;
    }

    /** A tab dragged out of the shared frame becomes its own frame under the pointer, and keeps following it until release. */
    function beginTabDrag(event, tab) {
        let dragged = false;
        trackPointer(move => {
            if (!dragged && !leftFrame(move, 'main')) return;
            const point = { x: move.clientX / frameScale(), y: move.clientY / frameScale() };
            if (!dragged) {
                dragged = true;
                suppressClick = true;
                return splitTab(tab, point);
            }
            return setRect('side', { ...rectFor('side'), x: point.x - rectFor('side').width / 2, y: point.y - 14 });
        }, () => {
            if (!dragged) return;
            saveFrameState();
            // 놓은 자리가 창 밖이면 click이 창에 오지 않는다. 다음 click을 삼키지 않게 바로 푼다.
            setTimeout(() => { suppressClick = false; }, 0);
        });
    }

    function onBarPointerDown(event, frame) {
        if (event.button !== undefined && event.button !== 0) return;
        if (event.target.closest('[data-message-action]')) return;
        const tab = event.target.closest('[data-message-tab]');
        if (tab && !state.split) beginTabDrag(event, tab.dataset.messageTab);
        else beginMove(event, frame);
    }

    function buildFrame(frame) {
        const el = document.createElement('section');
        el.id = `message-frame-${frame}`;
        el.className = 'message-frame';
        el.setAttribute('aria-label', frame === 'main' ? '전투 기록과 채팅' : '따로 띄운 탭');
        el.innerHTML = '<div class="message-frame-bar"><div class="message-frame-tabs" role="tablist"></div><div class="message-frame-actions"></div></div>'
            + '<div class="message-frame-body"></div><div class="message-frame-resize" data-edges="se" aria-hidden="true"></div>'
            + EDGES.map(edges => `<div class="message-frame-edge" data-edges="${edges}" aria-hidden="true"></div>`).join('');
        el.querySelector('.message-frame-bar').addEventListener('pointerdown', event => onBarPointerDown(event, frame));
        el.querySelectorAll('[data-edges]').forEach(handle => handle.addEventListener('pointerdown', event => beginResize(event, frame, handle.dataset.edges)));
        el.addEventListener('click', event => onFrameClick(event, frame));
        return el;
    }

    function createFrames(layer) {
        FRAMES.forEach(frame => layer.appendChild(buildFrame(frame)));
        stash = document.createElement('div');
        stash.className = 'message-frame-stash';
        stash.hidden = true;
        layer.appendChild(stash);
        dot = document.getElementById('noti-social-dock');
    }

    function rememberHome(element) {
        if (element && !homes.has(element)) homes.set(element, { parent: element.parentElement, next: element.nextSibling });
    }

    function mountFrames() {
        const layer = document.getElementById('right-pane');
        if (!layer) return;
        if (!stash) createFrames(layer);
        if (!mounted) {
            [...Object.values(TABS).map(tab => document.getElementById(tab.paneId)), dot].forEach(rememberHome);
            mounted = true;
            document.body.classList.add('message-frames-on');
            document.getElementById('tab-social')?.classList.add('ui-community-dock');
        }
        renderFrames();
    }

    /** Phone layout: the log and chat go back where the page put them. */
    function unmountFrames() {
        if (!mounted) return;
        mounted = false;
        homes.forEach((home, element) => home.parent.insertBefore(element, home.next && home.next.parentNode === home.parent ? home.next : null));
        document.body.classList.remove('message-frames-on');
        document.getElementById('tab-social')?.classList.remove('ui-community-dock');
        FRAMES.forEach(frame => { const el = frameEl(frame); if (el) el.style.display = 'none'; });
        visible = new Set();
    }

    /** Called by js/ui-window-manager.js whenever the layout is (re)applied: { desktop, workspaceRect }. */
    function syncFrames(environment) {
        const changed = !env || env.desktop !== environment?.desktop;
        env = environment || env;
        if (env && env.desktop) mountFrames();
        else unmountFrames();
        if (changed && typeof applyPanelLayoutSettings === 'function') applyPanelLayoutSettings();
    }

    /** Brings a tab into view: its own frame when splitTab, otherwise the shared frame's active tab. */
    function showFrameTab(tab) {
        if (!mounted || !TABS[tab]) return false;
        if (state.split) state.collapsed[state.side === tab ? 'side' : 'main'] = false;
        else {
            state.active = tab;
            state.collapsed.main = false;
        }
        renderFrames();
        return true;
    }

    function resetFrames() {
        state = defaultFrameState();
        renderFrames();
    }

    return Object.freeze({ sync: syncFrames, showTab: showFrameTab, isTabVisible: isFrameTabVisible, isActive: () => mounted, reset: resetFrames });
})();
safeExposeGlobals({ messageFrames });
