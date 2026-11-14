import { isMobilePrimaryNavigationEnabled } from './tab-navigation-queries.mjs';
import { listenView } from './view-events.mjs';
import { teardownMobilePrimaryNavigation, ensureMobilePrimaryNavigation, renderMobileMenuGroups, syncMobilePrimaryNavigationState, restoreMobileMenuFocus, renderTabOrderSettings } from './tab-mobile-menu.mjs';

export function getTabButtonFromTarget(runtime, target) {
    return target && target.closest ? target.closest('.tab-header .tab-btn') : null;
}

export function getTabHeaders(runtime) {
    return Array.from(runtime.deps.document.querySelectorAll('.tab-header'));
}

export function getTabHeaderOrderSnapshot(runtime, headers) {
    return (headers || getTabHeaders(runtime)).flatMap(header => Array.from(header.querySelectorAll('.tab-btn')).map(el => el.id).filter(Boolean));
}

export function getTabHeaderUnderPoint(runtime, clientX, clientY) {
    let hit = runtime.deps.document.elementFromPoint ? runtime.deps.document.elementFromPoint(clientX, clientY) : null;
    let hitHeader = hit && hit.closest ? hit.closest('.tab-header') : null;
    if (hitHeader) return hitHeader;
    return getTabHeaders(runtime).find(header => {
        let rect = header.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
}

export function updateTabDragGhost(runtime, state, clientX, clientY) {
    if (!state || !state.ghost) return;
    let offsetX = Number.isFinite(state.grabOffsetX) ? state.grabOffsetX : 0;
    let offsetY = Number.isFinite(state.grabOffsetY) ? state.grabOffsetY : 0;
    state.ghost.style.left = `${(clientX - offsetX) / runtime.deps.uiDisplay.factor}px`;
    state.ghost.style.top = `${(clientY - offsetY) / runtime.deps.uiDisplay.factor}px`;
}

export function beginTabHeaderDrag(runtime, state) {
    if (!runtime.active || !state || state.dragging || state !== runtime.state.tabHeaderDragState
            || state.owner !== runtime.deps.game || !state.button.isConnected) return;
    state.dragging = true;
    let rect = state.button.getBoundingClientRect();
    state.grabOffsetX = (0, runtime.deps.clampNumber)(state.lastX - rect.left, 0, rect.width);
    state.grabOffsetY = (0, runtime.deps.clampNumber)(state.lastY - rect.top, 0, rect.height);
    state.ghost = runtime.deps.document.createElement('div');
    state.ghost.className = 'tab-drag-ghost';
    state.ghost.setAttribute('aria-hidden', 'true');
    state.ghost.innerHTML = state.button.innerHTML;
    state.ghost.style.width = `${Math.max(1, rect.width / runtime.deps.uiDisplay.factor)}px`;
    state.ghost.style.height = `${Math.max(1, rect.height / runtime.deps.uiDisplay.factor)}px`;
    runtime.deps.document.body.appendChild(state.ghost);
    updateTabDragGhost(runtime, state, state.lastX, state.lastY);
    state.button.classList.add('dragging');
    runtime.deps.document.body.classList.add('tab-drag-active');
}

/** Whether menu buttons drag only inside the phone's bottom dock (they never move into the full menu drawer). */
export function isMobileDockDrag(runtime) {
    return runtime.deps.document.body.classList.contains('mobile-primary-navigation');
}

export function moveDraggedTabToPoint(runtime, state, clientX, clientY) {
    let header = isMobileDockDrag(runtime) ? state.header : getTabHeaderUnderPoint(runtime, clientX, clientY);
    header = header || state.button.parentElement;
    if (!header) return;
    if (state.button.parentElement !== header) header.appendChild(state.button);
    let siblings = Array.from(header.querySelectorAll('.tab-btn')).filter(el => el !== state.button);
    let before = siblings.find(el => {
        let rect = el.getBoundingClientRect();
        return clientX < rect.left + rect.width / 2;
    });
    // 하단 메뉴의 전체 단추는 늘 맨 끝이다
    header.insertBefore(state.button, before || header.querySelector(':scope > #btn-mobile-nav-more'));
}

/** The phone dock's order after a drag: its buttons first in their new order (each kept on the dock), the rest as they were. */
export function commitMobileDockOrder(runtime) {
    const layout = runtime.deps.tabLayoutUi.current();
    const dock = Array.from(runtime.deps.document.querySelectorAll('#tab-header-bottom > .tab-btn')).map(button => button.id);
    dock.forEach(id => { layout.tabPlacement[id] = 'top'; });
    layout.tabOrder = [...dock, ...layout.tabOrder.filter(id => !dock.includes(id))];
}

export function commitTabHeaderDragOrder(runtime) {
    if (isMobileDockDrag(runtime)) { commitMobileDockOrder(runtime); return; }
    let headers = getTabHeaders(runtime);
    runtime.deps.game.settings = runtime.deps.game.settings || {};
    runtime.deps.tabLayoutUi.current().tabPlacement = runtime.deps.tabLayoutUi.current().tabPlacement || {};
    headers.forEach(header => {
        let placement = header.id === 'tab-header-bottom' ? 'bottom' : 'top';
        Array.from(header.querySelectorAll('.tab-btn')).forEach(btn => { runtime.deps.tabLayoutUi.current().tabPlacement[btn.id] = placement; });
    });
    runtime.deps.tabLayoutUi.current().tabOrder = getTabHeaderOrderSnapshot(runtime, headers);
}

export function activateTabButtonFromDrag(runtime, button) {
    // 하단 메뉴에서는 자리만 바꾼다(끌어 놓은 탭이 열리지 않는다)
    if (!button || !button.id || typeof runtime.deps.switchTab !== 'function' || isMobileDockDrag(runtime)) return;
    if (!button.id.startsWith('btn-tab-')) return;
    (0, runtime.deps.switchTab)(button.id.replace(/^btn-/, ''));
}

export function clearTabHeaderDragState(runtime, saveOrder) {
    let state = runtime.state.tabHeaderDragState;
    runtime.state.tabHeaderDragState = null;
    if (!state) return;
    (0, runtime.deps.clearTimeout)(state.longPressTimer);
    if (state.ghost) state.ghost.remove();
    state.button.classList.remove('dragging');
    runtime.deps.document.body.classList.remove('tab-drag-active');
    const commit = saveOrder && state.owner === runtime.deps.game;
    releaseTabDragPointer(state, commit);
    if (commit && state.dragging) {
        commitTabHeaderDragOrder(runtime);
        runtime.state.tabHeaderSuppressClickUntil = runtime.deps.Date.now() + 450;
        applyTabHeaderOrder(runtime, true);
        (0, runtime.deps.queueImportantSave)(300);
        activateTabButtonFromDrag(runtime, state.button);
    }
}

function releaseTabDragPointer(state, commit) {
    if (state.button.hasPointerCapture?.(state.pointerId)) state.button.releasePointerCapture(state.pointerId);
    if (commit || !state.dragging || !state.originalParent.isConnected) return;
    const next = state.originalNext?.parentElement === state.originalParent ? state.originalNext : null;
    state.originalParent.insertBefore(state.button, next);
}

/** How long a press waits before the button drags (ms), or 0 where menu buttons do not drag: the PC window rail, and on phones
 * everything but the bottom dock. */
export function tabDragPressMs(runtime, button) {
    const classes = runtime.deps.document.body.classList;
    if (classes.contains('desktop-windowed-ui')) return 0;
    if (!classes.contains('mobile-primary-navigation')) return runtime.state.TAB_DRAG_LONG_PRESS_MS;
    return button.closest('#tab-header-bottom') ? runtime.state.MOBILE_DOCK_LONG_PRESS_MS : 0;
}

export function onTabHeaderPointerDown(runtime, event) {
    if (runtime.state.tabHeaderDragState) return;
    let button = getTabButtonFromTarget(runtime, event.target);
    let pressMs = button ? tabDragPressMs(runtime, button) : 0;
    if (!pressMs || (event.pointerType === 'mouse' && event.button !== 0)) return;
    let header = button.closest ? button.closest('.tab-header') : null;
    runtime.state.tabHeaderDragState = {
        button,
        header,
        owner: runtime.deps.game,
        originalParent: button.parentElement,
        originalNext: button.nextSibling,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        startScrollLeft: header ? header.scrollLeft : 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        ghost: null,
        dragging: false,
        scrolling: false,
        longPressTimer: null
    };
    const state = runtime.state.tabHeaderDragState;
    state.longPressTimer = runtime.deps.setTimeout(() => beginTabHeaderDrag(runtime, state), pressMs);
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
}

export function onTabHeaderPointerMove(runtime, event) {
    let state = runtime.state.tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    if (scrollTabHeaderGesture(runtime, state, event)) return;
    let dx = Math.abs(event.clientX - state.startX);
    let dy = Math.abs(event.clientY - state.startY);
    let cancelPx = state.pointerType === 'touch' ? 16 : runtime.state.TAB_DRAG_CANCEL_PX;
    if (!state.dragging && (dx + dy) > cancelPx) {
        clearTabHeaderDragState(runtime, false);
        return;
    }
    if (!state.dragging) return;
    event.preventDefault();
    updateTabDragGhost(runtime, state, event.clientX, event.clientY);
    moveDraggedTabToPoint(runtime, state, event.clientX, event.clientY);
}

function scrollTabHeaderGesture(runtime, state, event) {
    // 가로 스와이프로 탭 헤더를 좌우 스크롤한다(모바일). touch-action:pan-y 때문에
    // 브라우저가 가로 스크롤을 처리하지 않으므로 scrollLeft을 직접 갱신한다.
    if (state.scrolling) {
        if (state.header) state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
        event.preventDefault();
        return true;
    }
    if (state.dragging || state.pointerType !== 'touch') return false;
    const dx = Math.abs(event.clientX - state.startX), dy = Math.abs(event.clientY - state.startY);
    // While waiting for the long-press, a clear vertical swipe means the user is
    // scrolling the page (touch-action: pan-y) — let it through by cancelling the drag.
    if (dy > dx && dy > runtime.state.TAB_DRAG_CANCEL_PX) {
        clearTabHeaderDragState(runtime, false);
        return true;
    }
    // 아직 재정렬 드래그 전에 가로 이동이 우세하면 스크롤 모드로 전환한다.
    if (!(dx > dy && dx > runtime.state.TAB_DRAG_CANCEL_PX)) return false;
    return beginTabHeaderSwipe(runtime, state, event);
}

function beginTabHeaderSwipe(runtime, state, event) {
    if (!state.header || state.header.scrollWidth <= state.header.clientWidth + 1) return false;
    state.scrolling = true;
    (0, runtime.deps.clearTimeout)(state.longPressTimer);
    state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
    event.preventDefault();
    return true;
}

export function onTabHeaderPointerEnd(runtime, event) {
    let state = runtime.state.tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    if (state.scrolling) {
        // 스와이프 스크롤 직후의 탭 전환(클릭)을 막는다.
        if (Math.abs(state.lastX - state.startX) > 6) runtime.state.tabHeaderSuppressClickUntil = runtime.deps.Date.now() + 350;
        clearTabHeaderDragState(runtime, false);
        return;
    }
    clearTabHeaderDragState(runtime, true);
}

export function onTabHeaderClickCapture(runtime, event) {
    if (runtime.deps.Date.now() <= runtime.state.tabHeaderSuppressClickUntil && getTabButtonFromTarget(runtime, event.target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    returnToBattleFromOpenTab(runtime, event);
}

/** 휴대폰 하단 메뉴에서 이미 열린 탭을 다시 누르면(두 번 누르면) 전투 화면으로 돌아간다(2026-11-07 사용자). */
export function returnToBattleFromOpenTab(runtime, event) {
    const button = event.target.closest && event.target.closest('#tab-header-bottom > .tab-btn.active');
    if (!button || button.id === 'btn-tab-battle' || !runtime.deps.document.body.classList.contains('mobile-primary-navigation')) return;
    event.preventDefault();
    event.stopPropagation();
    (0, runtime.deps.switchTab)('tab-battle');
}

export function installTabHeaderDragReorder(runtime) {
    if (runtime.state.tabHeaderDragBound) return;
    runtime.state.tabHeaderDragBound = true;
    listenView(runtime, runtime.deps.document, 'pointerdown', runtime.handlers.onTabHeaderPointerDown, true);
    listenView(runtime, runtime.deps.document, 'pointermove', runtime.handlers.onTabHeaderPointerMove, { capture: true, passive: false });
    listenView(runtime, runtime.deps.document, 'pointerup', runtime.handlers.onTabHeaderPointerEnd, true);
    listenView(runtime, runtime.deps.document, 'pointercancel', () => clearTabHeaderDragState(runtime, false), true);
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.onTabHeaderClickCapture, true);
}

export function applyTabHeaderOrder(runtime, shouldRenderSettings) {
    const focused = runtime.deps.document.activeElement;
    runtime.deps.game.settings=runtime.deps.game.settings||{};
    runtime.deps.tabLayoutUi.current().tabPlacement = runtime.deps.tabLayoutUi.current().tabPlacement || {};
    let headers = Array.from(runtime.deps.document.querySelectorAll('.tab-header'));
    let topHeader = headers.find(header => header.id !== 'tab-header-bottom');
    let bottomHeader = runtime.deps.document.getElementById('tab-header-bottom');
    // 데스크톱 창형 레일의 버튼 배치(고정 탭 + 더보기 메뉴)는 창 관리자가 소유한다.
    // 여기서 버튼을 다시 헤더 루트로 옮기면 더보기 메뉴가 비워져 레일이 깨진다.
    if (runtime.deps.document.body.classList.contains('desktop-windowed-ui')) {
        teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
        if (typeof runtime.deps.syncDesktopRailGroups === 'function') (0, runtime.deps.syncDesktopRailGroups)();
        refreshOrderSettings(runtime, shouldRenderSettings);
        return;
    }
    if(!topHeader) return;
    let mobilePrimary = isMobilePrimaryNavigationEnabled(runtime);
    if (!mobilePrimary) teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
    else ensureMobilePrimaryNavigation(runtime, topHeader, bottomHeader);
    installTabHeaderDragReorder(runtime);
    placeTabHeaderButtons(runtime, headers, topHeader, bottomHeader, mobilePrimary);
    syncBottomHeader(runtime, bottomHeader);
    if (mobilePrimary) renderMobileMenuGroups(runtime, topHeader);
    syncMobilePrimaryNavigationState(runtime);
    restoreMobileMenuFocus(runtime, focused);
    refreshOrderSettings(runtime, shouldRenderSettings);
}

function syncBottomHeader(runtime, bottomHeader) {
    if (!bottomHeader) return;
    let more = runtime.deps.document.getElementById('btn-mobile-nav-more');
    if (more) bottomHeader.appendChild(more);
    let hasBottomTabs = bottomHeader.children.length > 0;
    bottomHeader.style.display = hasBottomTabs ? 'flex' : 'none';
    runtime.deps.document.body.classList.toggle('has-bottom-tabs', hasBottomTabs);
    updateBottomTabSpacing(runtime);
}

function refreshOrderSettings(runtime, force) {
    const settings = runtime.deps.document.getElementById('tab-settings');
    if (force || settings?.classList.contains('active')) renderTabOrderSettings(runtime);
}

function placeTabHeaderButtons(runtime, headers, topHeader, bottomHeader, mobilePrimary) {
    const primaryIds = new Set(runtime.deps.tabLayoutUi.mobilePrimaryIds());
    let allTabButtons = headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')));
    let ids=allTabButtons.map(el=>el.id);
    let order = Array.from(new Set(['btn-tab-battle', ...runtime.deps.tabLayoutUi.current().tabOrder, ...runtime.deps.tabLayoutUi.defaultOrder]));
    let map={}; allTabButtons.forEach(el=>map[el.id]=el);
    order.forEach(id=>{
        if(!map[id]) return;
        let target = mobilePrimary
            ? (primaryIds.has(id) ? bottomHeader : topHeader)
            : ((runtime.deps.game.settings.twoRowTabs && runtime.deps.tabLayoutUi.current().tabPlacement[id] === 'bottom' && bottomHeader) ? bottomHeader : topHeader);
        target.appendChild(map[id]);
    });
    ids.forEach(id=>{
        if(order.includes(id) || !map[id]) return;
        let target = mobilePrimary && primaryIds.has(id) ? bottomHeader : topHeader;
        target.appendChild(map[id]);
    });
    if (mobilePrimary) primaryIds.forEach(id => { if (map[id]) bottomHeader.appendChild(map[id]); });
}

export function updateBottomTabSpacing(runtime) {
    let bottomHeader = runtime.deps.document.getElementById('tab-header-bottom');
    let visible = bottomHeader && runtime.deps.document.body.classList.contains('has-bottom-tabs') &&
    runtime.deps.window.getComputedStyle(bottomHeader).display !== 'none';
    let height = visible ? Math.ceil(bottomHeader.getBoundingClientRect().height) : 0;
    // body의 변수는 문서 전체가 물려받는다: 같은 값을 다시 쓰면 모든 요소의 스타일을 다시 계산했다(2026-10-07 프레임 드랍).
    if (runtime.deps.document.body.style.getPropertyValue('--bottom-tab-height') !== height + 'px') runtime.deps.document.body.style.setProperty('--bottom-tab-height', height + 'px');
}
