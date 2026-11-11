// 메뉴와 탭: 휴대폰 메뉴, 탭 묶음과 순서 끌기, 알림 점, 묶인 창의 탭 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function isMobilePrimaryNavigationEnabled() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    if (document.body.classList.contains('desktop-windowed-ui')) return false;
    return uiDisplay.matches('(max-width: 1080px)');
}

function setMobileTabDrawerOpen(open) {
    const wasOpen = document.body.classList.contains('mobile-tab-drawer-open');
    let enabled = isMobilePrimaryNavigationEnabled();
    let nextOpen = enabled && !!open;
    let goalDrawer = document.getElementById('ui-goal-drawer');
    if (nextOpen && goalDrawer && goalDrawer.classList.contains('expanded') && typeof toggleGoalDrawer === 'function') {
        toggleGoalDrawer(false);
    }
    document.body.classList.toggle('mobile-tab-drawer-open', nextOpen);
    let more = document.getElementById('btn-mobile-nav-more');
    if (more) more.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    let header = document.getElementById('tab-header-main');
    if (header && enabled) header.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
    syncMobileMenuFocus(header, more, wasOpen, nextOpen);
}

function syncMobileMenuFocus(header, more, wasOpen, nextOpen) {
    if (wasOpen === nextOpen || !header) return;
    if (nextOpen) {
        header.querySelector('.mobile-tab-drawer-head button')?.focus({ preventScroll: true });
        return;
    }
    if (header.contains(document.activeElement) || document.activeElement.id === 'mobile-tab-drawer-backdrop') {
        more?.focus({ preventScroll: true });
    }
}

function handleMobileMenuKey(event) {
    if (!document.body.classList.contains('mobile-tab-drawer-open') || !['Tab', 'Escape'].includes(event.key)) return;
    if (document.querySelector('dialog:modal')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { setMobileTabDrawerOpen(false); return; }
    const header = document.getElementById('tab-header-main');
    const buttons = Array.from(header.querySelectorAll('button:not([disabled]),[data-mobile-tab-button]')).filter(button => button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
}

function restoreMobileMenuFocus(focused) {
    if (!document.body.classList.contains('mobile-tab-drawer-open')) return;
    const header = document.getElementById('tab-header-main');
    if (!header.contains(focused)) return;
    const target = focused.getClientRects().length ? focused : header.querySelector('.mobile-tab-drawer-head button');
    target?.focus({ preventScroll: true });
}

function prepareMobileTabButtons(headers) {
    headers.forEach(header => header.querySelectorAll('.tab-btn:not(button)').forEach(button => {
        button.setAttribute('data-mobile-tab-button', '');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
    }));
}

function handleMobileTabActivation(event) {
    if (!document.body.classList.contains('mobile-primary-navigation')) return;
    if (!event.target.matches('[data-mobile-tab-button]') || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.click();
}

function toggleMobileTabDrawer() {
    setMobileTabDrawerOpen(!document.body.classList.contains('mobile-tab-drawer-open'));
}

function createMobileTabDrawerHead() {
    let head = document.createElement('div');
    head.className = 'mobile-tab-drawer-head';
    let title = document.createElement('strong');
    title.textContent = '전체 메뉴';
    title.dataset.i18n = '';
    let actions = document.createElement('span');
    actions.className = 'mobile-tab-drawer-actions';
    let close = document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.dataset.i18n = '';
    close.setAttribute('aria-label', '전체 메뉴 닫기');
    close.dataset.i18nAttr = 'aria-label';
    close.addEventListener('click', () => setMobileTabDrawerOpen(false));
    actions.append(close);
    head.append(title, actions);
    i18n.applyStatic(head);
    return head;
}

function createMobileMoreButton() {
    let button = document.createElement('button');
    button.id = 'btn-mobile-nav-more';
    button.type = 'button';
    button.className = 'mobile-nav-more';
    button.setAttribute('aria-controls', 'tab-header-main');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', '전체 메뉴 열기');
    button.dataset.i18nAttr = 'aria-label';
    button.innerHTML = '<span data-i18n>전체</span><span class="noti-dot"></span>';
    i18n.applyStatic(button);
    button.addEventListener('click', toggleMobileTabDrawer);
    return button;
}

function ensureMobilePrimaryNavigation(topHeader, bottomHeader) {
    if (!topHeader || !bottomHeader) return null;
    document.body.classList.add('mobile-primary-navigation', 'has-bottom-tabs');
    topHeader.setAttribute('role', 'dialog');
    topHeader.setAttribute('aria-modal', 'true');
    topHeader.setAttribute('aria-label', _t('전체 메뉴'));
    topHeader.setAttribute('aria-hidden', String(!document.body.classList.contains('mobile-tab-drawer-open')));
    bottomHeader.setAttribute('role', 'navigation');
    bottomHeader.setAttribute('aria-label', _t('빠른 탭 메뉴'));
    let head = topHeader.querySelector(':scope > .mobile-tab-drawer-head');
    if (!head) topHeader.prepend(createMobileTabDrawerHead());
    let more = document.getElementById('btn-mobile-nav-more');
    if (!more) more = createMobileMoreButton();
    bottomHeader.appendChild(more);
    let backdrop = document.getElementById('mobile-tab-drawer-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('button');
        backdrop.id = 'mobile-tab-drawer-backdrop';
        backdrop.type = 'button';
        backdrop.setAttribute('aria-label', _t('전체 메뉴 닫기'));
        backdrop.addEventListener('click', () => setMobileTabDrawerOpen(false));
        document.body.appendChild(backdrop);
    }
    if (!mobileNavigationKeyBound) {
        mobileNavigationKeyBound = true;
        document.addEventListener('keydown', handleMobileMenuKey, true);
        document.addEventListener('keydown', handleMobileTabActivation, true);
    }
    prepareMobileTabButtons([topHeader, bottomHeader]);
    return more;
}

function teardownMobilePrimaryNavigation(topHeader, bottomHeader) {
    setMobileTabDrawerOpen(false);
    document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.removeAttribute('data-mobile-tab-button');
        button.removeAttribute('role');
        button.removeAttribute('tabindex');
    });
    document.body.classList.remove('mobile-primary-navigation', 'mobile-tab-drawer-open', 'has-bottom-tabs');
    if (topHeader && bottomHeader) {
        Array.from(bottomHeader.querySelectorAll(':scope > .tab-btn')).forEach(button => topHeader.appendChild(button));
    }
    if (topHeader) {
        topHeader.removeAttribute('role');
        topHeader.removeAttribute('aria-modal');
        topHeader.removeAttribute('aria-label');
        topHeader.removeAttribute('aria-hidden');
        topHeader.querySelector(':scope > .mobile-tab-drawer-head')?.remove();
        topHeader.querySelectorAll('.mobile-menu-group-title').forEach(title => title.remove());
    }
    if (bottomHeader) {
        bottomHeader.removeAttribute('role');
        bottomHeader.removeAttribute('aria-label');
        bottomHeader.style.removeProperty('display');
    }
    document.getElementById('btn-mobile-nav-more')?.remove();
    document.getElementById('mobile-tab-drawer-backdrop')?.remove();
    document.body.style.setProperty('--bottom-tab-height', '0px');
}

function syncMobilePrimaryNavigationState() {
    let more = document.getElementById('btn-mobile-nav-more');
    let topHeader = document.getElementById('tab-header-main');
    if (!more || !topHeader) return;
    document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    let activeSecondary = !!topHeader.querySelector(':scope > .tab-btn.active');
    more.classList.toggle('active', activeSecondary);
    let hasNotice = Array.from(topHeader.querySelectorAll('.tab-btn .noti-dot'))
        .some(dot => dot.style.display !== 'none' && getComputedStyle(dot).display !== 'none');
    let dot = more.querySelector('.noti-dot');
    if (dot) dot.style.display = hasNotice ? 'block' : 'none';
}

function renderTabOrderSettings() {
    tabLayoutUi.render();
}

function renderMobileMenuGroups(header) {
    for (const group of getOrderedTabGroups()) {
        const buttons = group.tabs.map(id => document.getElementById('btn-' + id))
            .filter(button => button && button.parentElement === header && button.style.display !== 'none'
                && !button.hidden && button.dataset.mergedTabMember !== '1');
        let title = header.querySelector('[data-mobile-group="' + group.key + '"]');
        if (!title) {
            title = document.createElement('div');
            title.className = 'mobile-menu-group-title';
            title.dataset.mobileGroup = group.key;
        }
        title.textContent = _t(group.label);
        title.hidden = buttons.length === 0;
        header.appendChild(title);
        buttons.forEach(button => header.appendChild(button));
    }
}

function getOrderedTabGroups() {
    game.settings = game.settings || {};
    let order = Array.isArray(tabLayoutUi.current().tabGroupOrder) ? tabLayoutUi.current().tabGroupOrder : [];
    let byKey = {};
    TAB_GROUPS.forEach(group => { byKey[group.key] = group; });
    return order.concat(TAB_GROUPS.map(group => group.key))
        .filter((key, idx, arr) => byKey[key] && arr.indexOf(key) === idx)
        .map(key => byKey[key]);
}

function moveTabGroupBefore(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    let groups = getOrderedTabGroups();
    let sourceIdx = groups.findIndex(group => group.key === sourceKey);
    let targetIdx = groups.findIndex(group => group.key === targetKey);
    if (sourceIdx < 0 || targetIdx < 0) return;
    let moved = groups.slice();
    let source = moved.splice(sourceIdx, 1)[0];
    let insertIdx = moved.findIndex(group => group.key === targetKey);
    moved.splice(Math.max(0, insertIdx), 0, source);
    game.settings = game.settings || {};
    tabLayoutUi.current().tabGroupOrder = moved.map(group => group.key);
    lastTabHeaderUiSignature = null;
    renderTabCategoryBar();
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
    renderTabOrderSettings();
    queueImportantSave(300);
}

function onTabGroupDragStart(event, groupKey) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', groupKey);
    event.dataTransfer.effectAllowed = 'move';
}

function onTabGroupDrop(event, targetKey) {
    if (!event || !event.dataTransfer) return;
    event.preventDefault();
    moveTabGroupBefore(event.dataTransfer.getData('text/plain'), targetKey);
}

function getTabGroupForId(tabId) {
    // 버튼 id('btn-tab-x')와 탭 id('tab-x')를 모두 허용한다.
    let id = String(tabId || '').replace(/^btn-/, '');
    let g = TAB_GROUPS.find(group => group.tabs.includes(id));
    return g ? g.key : 'etc';
}

function isTabGroupingActive() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    // 데스크톱 창형 UI에서는 좌측 레일이 모든 창 실행 버튼을 보여야 하므로
    // 2단 그룹핑(활성 그룹 외 버튼 숨김)을 적용하지 않는다.
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('desktop-windowed-ui')) return false;
    return uiDisplay.matches('(min-width: 1081px)');
}

function getActiveTabGroup() {
    game.settings = game.settings || {};
    let cur = game.settings.activeTabGroup;
    if (!TAB_GROUPS.some(g => g.key === cur)) cur = 'character';
    return cur;
}

function selectTabGroup(groupKey) {
    if (!TAB_GROUPS.some(g => g.key === groupKey)) return;
    game.settings = game.settings || {};
    game.settings.activeTabGroup = groupKey;
    // 현재 활성 탭이 이 그룹에 없으면 그룹의 첫 번째 사용 가능한 탭으로 이동.
    let activeInGroup = lastActiveTabId && getTabGroupForId(lastActiveTabId) === groupKey;
    applyTabGroupFilter();
    if (!activeInGroup) {
        let group = getOrderedTabGroups().find(g => g.key === groupKey);
        let firstVisible = group.tabs.find(id => {
            let btn = document.getElementById('btn-' + id);
            return btn && btn.style.display !== 'none' && !btn.dataset.groupHidden;
        });
        if (firstVisible) switchTab(firstVisible);
    }
    renderTabCategoryBar();
}

// 해금 판정 + 그룹 필터를 한 번에 적용한다(권위 지점은 updateTabUnlockButtons).
function applyTabGroupFilter() {
    updateTabUnlockButtons();
}

function ensureTabCategoryBarPlacement(bar) {
    let header = document.querySelector('.tab-header');
    if (bar && header && header.parentElement && bar.nextElementSibling !== header) {
        header.parentElement.insertBefore(bar, header);
    }
}

function renderTabCategoryBar() {
    let bar = document.getElementById('tab-category-bar');
    if (!bar) return;
    ensureTabCategoryBarPlacement(bar);
    if (!isTabGroupingActive()) {
        bar.style.display = 'none';
        syncMapCompleteActionQuickControl();
        return;
    }
    bar.style.display = 'inline-flex';
    let active = getActiveTabGroup();
    let unlocks = game.unlocks || {};
    bar.innerHTML = getOrderedTabGroups().map(group => {
        // 그룹 내 알림 점 집계. 잠긴(미해금) 탭은 열어서 알림을 끌 방법이 없으므로,
        // 저장 데이터에 남은 stale 알림이 그룹 점을 영구히 켜지 않도록 집계에서 제외한다.
        let hasNoti = group.key !== active && group.tabs.some(id => {
            let key = id.replace('tab-', '');
            let gate = (typeof TAB_UNLOCK_GATES !== 'undefined') ? TAB_UNLOCK_GATES[id] : null;
            if (gate && !(game.unlocks && game.unlocks[gate])) return false;
            return game.noti && game.noti[key] && isNotiEnabled(key);
        });
        return `<button class="tab-category-btn${group.key === active ? ' active' : ''}" draggable="true" ondragstart="onTabGroupDragStart(event,'${group.key}')" ondragover="event.preventDefault()" ondrop="onTabGroupDrop(event,'${group.key}')" onclick="selectTabGroup('${group.key}')">${_t(group.label)}${hasNoti ? ' <span class="noti-dot" style="display:inline-block; position:static; margin-left:2px;"></span>' : ''}</button>`;
    }).join('');
    syncMapCompleteActionQuickControl();
}

function getTabButtonFromTarget(target) {
    return target && target.closest ? target.closest('.tab-header .tab-btn') : null;
}

function getTabHeaders() {
    return Array.from(document.querySelectorAll('.tab-header'));
}

function getTabHeaderOrderSnapshot(headers) {
    return (headers || getTabHeaders()).flatMap(header => Array.from(header.querySelectorAll('.tab-btn')).map(el => el.id).filter(Boolean));
}

function getTabHeaderUnderPoint(clientX, clientY) {
    let hit = document.elementFromPoint ? document.elementFromPoint(clientX, clientY) : null;
    let hitHeader = hit && hit.closest ? hit.closest('.tab-header') : null;
    if (hitHeader) return hitHeader;
    return getTabHeaders().find(header => {
        let rect = header.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
}

function updateTabDragGhost(state, clientX, clientY) {
    if (!state || !state.ghost) return;
    let offsetX = Number.isFinite(state.grabOffsetX) ? state.grabOffsetX : 0;
    let offsetY = Number.isFinite(state.grabOffsetY) ? state.grabOffsetY : 0;
    state.ghost.style.left = `${(clientX - offsetX) / uiDisplay.factor}px`;
    state.ghost.style.top = `${(clientY - offsetY) / uiDisplay.factor}px`;
}

function beginTabHeaderDrag(state) {
    if (!state || state.dragging) return;
    state.dragging = true;
    let rect = state.button.getBoundingClientRect();
    state.grabOffsetX = clampNumber(state.lastX - rect.left, 0, rect.width);
    state.grabOffsetY = clampNumber(state.lastY - rect.top, 0, rect.height);
    state.ghost = document.createElement('div');
    state.ghost.className = 'tab-drag-ghost';
    state.ghost.setAttribute('aria-hidden', 'true');
    state.ghost.innerHTML = state.button.innerHTML;
    state.ghost.style.width = `${Math.max(1, rect.width / uiDisplay.factor)}px`;
    state.ghost.style.height = `${Math.max(1, rect.height / uiDisplay.factor)}px`;
    document.body.appendChild(state.ghost);
    updateTabDragGhost(state, state.lastX, state.lastY);
    state.button.classList.add('dragging');
    document.body.classList.add('tab-drag-active');
}

/** Whether menu buttons drag only inside the phone's bottom dock (they never move into the full menu drawer). */
function isMobileDockDrag() {
    return document.body.classList.contains('mobile-primary-navigation');
}

function moveDraggedTabToPoint(state, clientX, clientY) {
    let header = isMobileDockDrag() ? state.header : getTabHeaderUnderPoint(clientX, clientY);
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
function commitMobileDockOrder() {
    const layout = tabLayoutUi.current();
    const dock = Array.from(document.querySelectorAll('#tab-header-bottom > .tab-btn')).map(button => button.id);
    dock.forEach(id => { layout.tabPlacement[id] = 'top'; });
    layout.tabOrder = [...dock, ...layout.tabOrder.filter(id => !dock.includes(id))];
}

function commitTabHeaderDragOrder() {
    if (isMobileDockDrag()) { commitMobileDockOrder(); return; }
    let headers = getTabHeaders();
    game.settings = game.settings || {};
    tabLayoutUi.current().tabPlacement = tabLayoutUi.current().tabPlacement || {};
    headers.forEach(header => {
        let placement = header.id === 'tab-header-bottom' ? 'bottom' : 'top';
        Array.from(header.querySelectorAll('.tab-btn')).forEach(btn => { tabLayoutUi.current().tabPlacement[btn.id] = placement; });
    });
    tabLayoutUi.current().tabOrder = getTabHeaderOrderSnapshot(headers);
}

function activateTabButtonFromDrag(button) {
    // 하단 메뉴에서는 자리만 바꾼다(끌어 놓은 탭이 열리지 않는다)
    if (!button || !button.id || typeof switchTab !== 'function' || isMobileDockDrag()) return;
    if (!button.id.startsWith('btn-tab-')) return;
    switchTab(button.id.replace(/^btn-/, ''));
}

function clearTabHeaderDragState(saveOrder) {
    let state = tabHeaderDragState;
    tabHeaderDragState = null;
    if (!state) return;
    clearTimeout(state.longPressTimer);
    if (state.ghost) state.ghost.remove();
    state.button.classList.remove('dragging');
    document.body.classList.remove('tab-drag-active');
    if (saveOrder && state.dragging) {
        commitTabHeaderDragOrder();
        tabHeaderSuppressClickUntil = Date.now() + 450;
        applyTabHeaderOrder(true);
        queueImportantSave(300);
        activateTabButtonFromDrag(state.button);
    }
}

/** How long a press waits before the button drags (ms), or 0 where menu buttons do not drag: the PC window rail, and on phones
 * everything but the bottom dock. */
function tabDragPressMs(button) {
    const classes = document.body.classList;
    if (classes.contains('desktop-windowed-ui')) return 0;
    if (!classes.contains('mobile-primary-navigation')) return TAB_DRAG_LONG_PRESS_MS;
    return button.closest('#tab-header-bottom') ? MOBILE_DOCK_LONG_PRESS_MS : 0;
}

function onTabHeaderPointerDown(event) {
    if (tabHeaderDragState) return;
    let button = getTabButtonFromTarget(event.target);
    let pressMs = button ? tabDragPressMs(button) : 0;
    if (!pressMs || (event.pointerType === 'mouse' && event.button !== 0)) return;
    let header = button.closest ? button.closest('.tab-header') : null;
    tabHeaderDragState = {
        button,
        header,
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
        longPressTimer: setTimeout(() => beginTabHeaderDrag(tabHeaderDragState), pressMs)
    };
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
}

function onTabHeaderPointerMove(event) {
    let state = tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    let dx = Math.abs(event.clientX - state.startX);
    let dy = Math.abs(event.clientY - state.startY);
    // 가로 스와이프로 탭 헤더를 좌우 스크롤한다(모바일). touch-action:pan-y 때문에
    // 브라우저가 가로 스크롤을 처리하지 않으므로 scrollLeft을 직접 갱신한다.
    if (state.scrolling) {
        if (state.header) state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
        event.preventDefault();
        return;
    }
    // While waiting for the long-press, a clear vertical swipe means the user is
    // scrolling the page (touch-action: pan-y) — let it through by cancelling the drag.
    if (!state.dragging && state.pointerType === 'touch' && dy > dx && dy > TAB_DRAG_CANCEL_PX) {
        clearTabHeaderDragState(false);
        return;
    }
    // 아직 재정렬 드래그 전에 가로 이동이 우세하면 스크롤 모드로 전환한다.
    if (!state.dragging && state.pointerType === 'touch' && dx > dy && dx > TAB_DRAG_CANCEL_PX
        && state.header && state.header.scrollWidth > state.header.clientWidth + 1) {
        state.scrolling = true;
        clearTimeout(state.longPressTimer);
        state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
        event.preventDefault();
        return;
    }
    let cancelPx = state.pointerType === 'touch' ? 16 : TAB_DRAG_CANCEL_PX;
    if (!state.dragging && (dx + dy) > cancelPx) {
        clearTabHeaderDragState(false);
        return;
    }
    if (!state.dragging) return;
    event.preventDefault();
    updateTabDragGhost(state, event.clientX, event.clientY);
    moveDraggedTabToPoint(state, event.clientX, event.clientY);
}

function onTabHeaderPointerEnd(event) {
    let state = tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    if (state.scrolling) {
        // 스와이프 스크롤 직후의 탭 전환(클릭)을 막는다.
        if (Math.abs(state.lastX - state.startX) > 6) tabHeaderSuppressClickUntil = Date.now() + 350;
        clearTabHeaderDragState(false);
        return;
    }
    clearTabHeaderDragState(true);
}

function onTabHeaderClickCapture(event) {
    if (Date.now() <= tabHeaderSuppressClickUntil && getTabButtonFromTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        return;
    }
    returnToBattleFromOpenTab(event);
}

/** 휴대폰 하단 메뉴에서 이미 열린 탭을 다시 누르면(두 번 누르면) 전투 화면으로 돌아간다(2026-11-07 사용자). */
function returnToBattleFromOpenTab(event) {
    const button = event.target.closest && event.target.closest('#tab-header-bottom > .tab-btn.active');
    if (!button || button.id === 'btn-tab-battle' || !document.body.classList.contains('mobile-primary-navigation')) return;
    event.preventDefault();
    event.stopPropagation();
    switchTab('tab-battle');
}

function installTabHeaderDragReorder() {
    if (window.__tabHeaderDragReorderBound) return;
    window.__tabHeaderDragReorderBound = true;
    document.addEventListener('pointerdown', onTabHeaderPointerDown, true);
    document.addEventListener('pointermove', onTabHeaderPointerMove, { capture: true, passive: false });
    document.addEventListener('pointerup', onTabHeaderPointerEnd, true);
    document.addEventListener('pointercancel', event => clearTabHeaderDragState(false), true);
    document.addEventListener('click', onTabHeaderClickCapture, true);
}

function applyTabHeaderOrder(shouldRenderSettings){
    const focused = document.activeElement;
    game.settings=game.settings||{};
    tabLayoutUi.current().tabPlacement = tabLayoutUi.current().tabPlacement || {};
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    let topHeader = headers.find(header => header.id !== 'tab-header-bottom');
    let bottomHeader = document.getElementById('tab-header-bottom');
    // 데스크톱 창형 레일의 버튼 배치(고정 탭 + 더보기 메뉴)는 창 관리자가 소유한다.
    // 여기서 버튼을 다시 헤더 루트로 옮기면 더보기 메뉴가 비워져 레일이 깨진다.
    if (document.body.classList.contains('desktop-windowed-ui')) {
        teardownMobilePrimaryNavigation(topHeader, bottomHeader);
        if (typeof syncDesktopRailGroups === 'function') syncDesktopRailGroups();
        if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
        return;
    }
    if(!topHeader) return;
    let mobilePrimary = isMobilePrimaryNavigationEnabled();
    let primaryIds = new Set(tabLayoutUi.mobilePrimaryIds());
    if (!mobilePrimary) teardownMobilePrimaryNavigation(topHeader, bottomHeader);
    else ensureMobilePrimaryNavigation(topHeader, bottomHeader);
    installTabHeaderDragReorder();
    let allTabButtons = headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')));
    let ids=allTabButtons.map(el=>el.id);
    let order = Array.from(new Set(['btn-tab-battle', ...tabLayoutUi.current().tabOrder, ...tabLayoutUi.defaultOrder]));
    let map={}; allTabButtons.forEach(el=>map[el.id]=el);
    order.forEach(id=>{
        if(!map[id]) return;
        let target = mobilePrimary
            ? (primaryIds.has(id) ? bottomHeader : topHeader)
            : ((game.settings.twoRowTabs && tabLayoutUi.current().tabPlacement[id] === 'bottom' && bottomHeader) ? bottomHeader : topHeader);
        target.appendChild(map[id]);
    });
    ids.forEach(id=>{
        if(order.includes(id) || !map[id]) return;
        let target = mobilePrimary && primaryIds.has(id) ? bottomHeader : topHeader;
        target.appendChild(map[id]);
    });
    if (mobilePrimary) primaryIds.forEach(id => { if (map[id]) bottomHeader.appendChild(map[id]); });
    if (bottomHeader) {
        let more = document.getElementById('btn-mobile-nav-more');
        if (more) bottomHeader.appendChild(more);
        let hasBottomTabs = bottomHeader.children.length > 0;
        bottomHeader.style.display = hasBottomTabs ? 'flex' : 'none';
        document.body.classList.toggle('has-bottom-tabs', hasBottomTabs);
        updateBottomTabSpacing();
    }
    if (mobilePrimary) renderMobileMenuGroups(topHeader);
    syncMobilePrimaryNavigationState();
    restoreMobileMenuFocus(focused);
    if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
}

// Reserve scroll space at the bottom of the page so the fixed bottom tab bar
// does not overlap (and block taps on) the last buttons in the content.
function updateBottomTabSpacing(){
    let bottomHeader = document.getElementById('tab-header-bottom');
    let visible = bottomHeader && document.body.classList.contains('has-bottom-tabs') &&
        window.getComputedStyle(bottomHeader).display !== 'none';
    let height = visible ? Math.ceil(bottomHeader.getBoundingClientRect().height) : 0;
    // body의 변수는 문서 전체가 물려받는다: 같은 값을 다시 쓰면 모든 요소의 스타일을 다시 계산했다(2026-10-07 프레임 드랍).
    if (document.body.style.getPropertyValue('--bottom-tab-height') !== height + 'px') document.body.style.setProperty('--bottom-tab-height', height + 'px');
}

function scheduleTabHeaderViewportSync() {
    clearTabHeaderDragState(false);
    requestAnimationFrame(() => {
        updateBottomTabSpacing();
        lastTabHeaderUiSignature = null;
        refreshTabHeaderUiIfNeeded();
    });
}

function getTabHeaderUiSignature() {
    let unlocks = game.unlocks || {};
    let mobileBattle = uiDisplay.matches(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`) ? 'mobileBattle' : 'desktopBattle';
    return [
        i18n.language,
        mobileBattle,
        isMobilePrimaryNavigationEnabled() ? 'mobilePrimary' : 'legacyTabs',
        (game.settings && game.settings.tabNotiEnabled === false) ? 'notiOff' : 'notiOn',
        // 알림 점은 getTabNotiSignature가 따로 본다(점 하나에 머리 전체를 다시 그리지 않게).
        TAB_HEADER_NOTI_KEYS.map(key => `${key}:${unlocks[key] ? 1 : 0}`).join('|'),
        contentProgression.opening.signature(game),
        Array.isArray(game.settings && tabLayoutUi.current().tabOrder) ? tabLayoutUi.current().tabOrder.join(',') : '',
        JSON.stringify((game.settings && tabLayoutUi.current().tabPlacement) || {}),
        Array.isArray(game.settings && tabLayoutUi.current().tabGroupOrder) ? tabLayoutUi.current().tabGroupOrder.join(',') : '',
        isTabGroupingActive() ? ('grp:' + getActiveTabGroup()) : 'nogrp'
    ].join('::');
}

function updateTabNotificationDots() {
    // 데스크톱 창형 모드에서 커뮤니티는 탭 전환 없이 도킹 패널로 열리므로,
    // 패널이 열려 있는 동안은 채팅을 읽고 있는 것으로 간주해 알림을 꺼 둔다.
    if (typeof isSocialTabActive === 'function' && isSocialTabActive()) game.noti.social = false;
    TAB_HEADER_NOTI_KEYS.forEach(key => {
        // 이미 보고 있는 탭에서 계속 발생하는 이벤트(전투 중 드랍 등)가 알림을 되살리지 않도록,
        // 활성 탭에 해당하는 알림은 매 갱신마다 계속 꺼둔다.
        if (lastActiveTabId === 'tab-' + key) game.noti[key] = false;
        let el = document.getElementById('noti-' + key);
        if (el) el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none';
    });
    // 도킹 토글 버튼(💬)의 미읽음 점은 커뮤니티 탭 알림과 동일한 상태를 미러링한다.
    let dockDot = document.getElementById('noti-social-dock');
    if (dockDot) dockDot.style.display = (game.noti.social && isNotiEnabled('social')) ? 'block' : 'none';
    syncMergedTabLauncherState();
    // 첫 루프의 시작 무기가 장착을 기다리면 장비 단추에 표시를 단다
    let itemsTabButton = document.getElementById('btn-tab-items');
    if (itemsTabButton) itemsTabButton.classList.toggle('starter-equip-tutorial-pending', !!getStarterWeaponTutorialTarget());
}

/** 해금 단추 표시. 휴대폰 하단 메뉴의 지도는 열리기 전에도 흐린 잠금 칸으로 자리를 지킨다 — 액트 1을 마쳐 지도가 열리는 순간
 * 메뉴 칸이 넷에서 다섯으로 늘며 스킬룬 칸이 밀리던 것을 막는다(누르면 notifyLockedTab이 여는 조건을 알린다). */
function syncTabUnlockButton(key) {
    let button = document.getElementById('btn-tab-' + key);
    let reserved = key === 'map' && !game.unlocks.map && isMobilePrimaryNavigationEnabled()
        && !contentProgression.opening.applies(game) && game.settings.tabLayouts.mobile.tabPlacement['btn-tab-map'] !== 'bottom';
    button.classList.toggle('nav-locked', reserved);
    if (reserved) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    button.style.display = game.unlocks[key] || reserved ? 'flex' : 'none';
}

function updateTabUnlockButtons() {
    TAB_UNLOCK_BUTTON_KEYS.forEach(syncTabUnlockButton);
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = isMobilePrimaryNavigationEnabled() ? 'flex' : 'none';
    syncMergedTabLauncherVisibility();
    // 해금 상태가 바뀌면 "열려 있는" 병합 창의 내부 탭 목록과 표시 중인 화면도 다시 맞춘다.
    // 이게 없으면 루프 정산으로 큐브가 잠긴 뒤에도 큐브 화면이 그대로 남고,
    // 내부 탭 버튼에 잠긴 탭이 계속 보인다(선택 상태만 조용히 다른 탭으로 바뀐다).
    Object.entries(MERGED_TAB_GROUPS).forEach(([groupKey, group]) => {
        let root = document.getElementById(group.launcher);
        if (root && root.classList.contains('active')) renderMergedTabPanels(groupKey);
    });
    // 다시 잠긴 탭의 창/패널이 열린 채로 남지 않게 정리한다(갱신이 멈춘 잔상 방지).
    closeRelockedTabSurfaces();
    // 2단 그룹핑이 활성이면 해금 판정 직후 활성 그룹 외 탭을 숨긴다(단일 권위 지점).
    hideOutOfGroupTabButtons();
    // 데스크톱 창형 레일은 그룹 섹션 단위로 표시되므로, 해금 변경 시 빈 그룹을 함께 숨긴다.
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
}

function isUngatedPersistentTabButton(btn) {
    return btn && (btn.id === 'btn-tab-settings' || btn.id === 'btn-tab-character');
}

// updateTabUnlockButtons 뒤에서 호출되는 그룹 가시성 적용부. 재진입 없이 display만 조정한다.
function hideOutOfGroupTabButtons() {
    let grouping = isTabGroupingActive();
    let active = getActiveTabGroup();
    Array.from(document.querySelectorAll('.tab-header .tab-btn')).forEach(btn => {
        if (!grouping) {
            delete btn.dataset.groupHidden;
            if (isUngatedPersistentTabButton(btn)) btn.style.display = 'flex';
            return;
        }
        if (getTabGroupForId(btn.id) !== active) {
            btn.dataset.groupHidden = '1';
            btn.style.display = 'none';
            return;
        }
        delete btn.dataset.groupHidden;
        if (isUngatedPersistentTabButton(btn)) btn.style.display = 'flex';
    });
}

/** Which tabs show a notification dot (filters applied). Kept apart from the header's signature: a dot that came or went rebuilt
 * the whole tab header and phone menu, and the restyle that followed, every few seconds of combat (2026-10-07 frame drops: about
 * 75 ms on a 4x-throttled phone). */
function getTabNotiSignature() {
    let noti = game.noti || {};
    let filters = (game.settings && game.settings.notiFilters) || {};
    return TAB_HEADER_NOTI_KEYS.map(key => (noti[key] && filters[key] !== false ? 1 : 0)).join('');
}

/** 쓸 포인트가 남은 동안 스킬트리와 전직 알림 점을 켜 둔다(2026-10-26 사용자: "1포인트라도 있으면"). 그 화면을 보는 동안은 끈다. */
function applyStandingTabNotices() {
    const standing = { char: game.passivePoints > 0, traits: !!game.unlocks.traits && (game.ascendPoints > 0 || game.ascendKeystonePoints > 0), season: worldTreeBark.barkHasFreePoints(game) };
    Object.entries(standing).forEach(([key, on]) => { if (on && lastActiveTabId !== 'tab-' + key) game.noti[key] = true; });
}

function refreshTabHeaderUiIfNeeded() {
    applyStandingTabNotices();
    let signature = getTabHeaderUiSignature();
    if (signature === lastTabHeaderUiSignature) {
        if (getTabNotiSignature() === lastTabNotiSignature) return false;
        updateTabNotificationDots();
        if (isTabGroupingActive()) renderTabCategoryBar(); // its group buttons carry the dots too
        lastTabNotiSignature = getTabNotiSignature();
        return false;
    }
    lastTabHeaderUiSignature = signature;
    updateTabUnlockButtons();
    applyTabHeaderOrder();
    updateTabNotificationDots();
    applyTabGroupFilter();
    renderTabCategoryBar();
    lastTabNotiSignature = getTabNotiSignature();
    return true;
}

function isNotiEnabled(key){ game.settings=game.settings||{}; if (game.settings.tabNotiEnabled === false) return false; game.settings.notiFilters=game.settings.notiFilters||{}; return game.settings.notiFilters[key] !== false; }

function isMergedTabAvailable(tab) {
    let tabId = typeof tab === 'string' ? tab : tab.id;
    if (window.playerGuideUi?.allowsTab(tabId) === false) return false;
    if (game.contentProgression) return contentProgression.canOpen(tabId);
    let gateKey = typeof tab === 'string' ? TAB_UNLOCK_GATES[tabId] : tab.gate || TAB_UNLOCK_GATES[tabId];
    // 저널은 루프를 건너 유지되는 영구 기록이라 고유 아이템 보유 여부와 무관하게 열려 있어야 한다.
    // (도감은 game.unlocks.codex가 권위이며 checkUnlocks가 루프마다 다시 판정한다. 여기서
    //  "지금 고유를 들고 있는가"를 다시 보면, 고유를 처분하거나 루프를 넘긴 직후 기록 메뉴 자체가
    //  사라져 저널·도감을 열 수 없게 된다.)
    if (gateKey === 'journal') return isJournalTabUnlockReady();
    return !gateKey || !!(game.unlocks && game.unlocks[gateKey]);
}

function getMergedTabGroup(tabId) {
    return Object.entries(MERGED_TAB_GROUPS).find(([, group]) => group.tabs.some(tab => tab.id === tabId)) || null;
}

function getSelectedMergedTabId(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return null;
    game.settings = game.settings || {};
    game.settings.mergedTabSelection = game.settings.mergedTabSelection || {};
    let selected = game.settings.mergedTabSelection[groupKey];
    if (group.tabs.some(tab => tab.id === selected && isMergedTabAvailable(tab))) return selected;
    let firstAvailable = group.tabs.find(isMergedTabAvailable);
    return firstAvailable ? firstAvailable.id : null;
}

// 지금 보고 있는 "최상위" 탭 화면. 병합 그룹의 하위 패널(.merged-subtab-pane)은 각 창의
// 안쪽 선택을 표현하려고 .active를 계속 유지하므로 반드시 제외해야 한다. 하위 패널은
// 런처 안으로 옮겨져 문서 순서가 바뀌기 때문에(예: tab-traits는 tab-char 안 = tab-skills보다 앞),
// 제외하지 않으면 병합 창을 한 번 연 뒤부터 다른 탭이 전부 그 패널로 오인식된다.
function getActiveTopLevelTabElement() {
    return document.querySelector('.tab-content.active:not(.merged-subtab-pane)');
}

function getActiveUiTabId() {
    let activeContent = getActiveTopLevelTabElement();
    if (!activeContent) return '';
    return resolveRenderedTabId(activeContent.id);
}

// 최상위 탭 id를 "실제로 내용을 그려야 하는" 탭 id로 바꾼다.
// 병합 그룹의 런처는 안쪽에서 선택된 탭이 곧 렌더 대상이다.
function resolveRenderedTabId(tabId) {
    let mergedEntry = getMergedTabGroup(tabId);
    if (!mergedEntry || mergedEntry[1].launcher !== tabId) return tabId;
    return getSelectedMergedTabId(mergedEntry[0]) || tabId;
}

// 지금 화면에 내용이 보이는 탭 전체. 데스크톱 창 모드는 창을 여러 개 동시에 띄우므로
// 포커스된 창 하나만 그리면 나머지 창은 보이는 채로 갱신이 멈춘다(레일 버튼으로 다시
// 열기 전까지 계속 옛 내용이 남아 "탭이 고장난" 것처럼 보인다).
function getRenderingUiTabIds() {
    let ids = new Set();
    let desktop = document.body.classList.contains('desktop-windowed-ui');
    let active = getActiveTopLevelTabElement();
    // PC 창 모드에서는 창을 닫아도 그 탭이 active로 남는다. 닫히거나 접힌 창의 탭은 그리지 않는다(2026-10-25: 닫힌 스킬룬 화면을
    // 처치마다 290ms씩 다시 그려 사냥이 끊겼다).
    let closed = active && desktop && active.classList.contains('ui-window')
        && (!active.classList.contains('ui-window-open') || active.classList.contains('ui-window-minimized'));
    if (active && !closed) ids.add(resolveRenderedTabId(active.id));
    if (!desktop) return ids;
    // ui-window-open은 창 관리자가 준비한 최상위 창에만 붙는다(하위 패널에는 붙지 않는다).
    document.querySelectorAll('.tab-content.ui-window-open:not(.ui-window-minimized)').forEach(el => {
        if (el.id) ids.add(resolveRenderedTabId(el.id));
    });
    return ids;
}

// Keep timed stock progression independent of whether its management panel is visible.
function renderVisibleManagementPanels(tabIds) {
    if (tabIds.has('tab-talent')) talentUi.render();
    if (tabIds.has('tab-stump')) stumpBoxUi.renderStumpBoxTab();
    if (tabIds.has('tab-trade')) renderMarketUI();
    else refreshBlackMarket(false);
}

// 지금 이 탭 화면(창/패널)을 열어 둘 수 있는지 판정한다.
// 병합 그룹의 런처는 안쪽에 열 수 있는 탭이 하나라도 남아 있어야 유효하다.
function isTabSurfaceAvailable(tabId) {
    if (!tabId || window.playerGuideUi?.allowsTab(tabId, true) === false) return false;
    let mergedEntry = getMergedTabGroup(tabId);
    if (mergedEntry) {
        if (mergedEntry[1].launcher === tabId) return !!getSelectedMergedTabId(mergedEntry[0]);
        return isMergedTabAvailable(mergedEntry[1].tabs.find(tab => tab.id === tabId) || tabId);
    }
    if (!contentProgression.canOpen(tabId)) return false;
    let gateKey = TAB_UNLOCK_GATES[tabId];
    return !gateKey || !!(game.unlocks && game.unlocks[gateKey]);
}

// 루프 정산처럼 런타임 판정이 탭을 다시 잠그면 실행 버튼만 사라지고, 이미 열려 있던
// 창/패널은 화면에 그대로 남는다. 그 화면은 updateStaticUI의 렌더 대상(getActiveUiTabId)에서도
// 빠지므로 갱신이 멈춘 잔상이 닫을 방법도 없이 남아 "탭이 고장난" 것처럼 보인다.
// 해금 판정 직후 이 함수가 잠긴 표면을 함께 닫는다.
function closeRelockedTabSurfaces() {
    Array.from(document.querySelectorAll('.tab-content:not(.merged-subtab-pane)')).forEach(el => {
        if (!el.id || isTabSurfaceAvailable(el.id)) return;
        let wasActive = el.classList.contains('active');
        let windowOpen = el.classList.contains('ui-window-open') || el.classList.contains('ui-window-minimized');
        if (!wasActive && !windowOpen) return;
        el.classList.remove('active');
        let btn = document.getElementById('btn-' + el.id);
        if (btn) btn.classList.remove('active');
        // ui-window-open은 창 관리자가 준비한 창에만 붙으므로, 이 조건에서만 closeWindow를 부른다.
        if (windowOpen && typeof closeWindow === 'function') closeWindow(el.id);
        if (lastActiveTabId === el.id) lastActiveTabId = null;
        if (wasActive) pendingRelockedTabFallback = true;
    });
}

function mountMergedTabGroup(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let root = group && document.getElementById(group.launcher);
    if (!root) return null;
    let host = root.querySelector(':scope > .ui-window-body') || root;
    let shell = host.querySelector(':scope > .merged-tab-shell');
    if (shell) return shell;

    shell = document.createElement('div');
    shell.className = 'merged-tab-shell';
    let nav = document.createElement('div');
    nav.className = 'subtab-row merged-tab-subtabs';
    let panels = document.createElement('div');
    panels.className = 'merged-tab-panels';
    let hostPane = document.createElement('div');
    hostPane.className = 'merged-subtab-pane';
    hostPane.dataset.tabId = group.launcher;
    Array.from(host.childNodes).forEach(node => hostPane.appendChild(node));
    panels.appendChild(hostPane);
    group.tabs.filter(tab => tab.id !== group.launcher).forEach(tab => {
        let source = document.getElementById(tab.id);
        if (!source) return;
        source.classList.add('merged-subtab-pane');
        source.dataset.tabId = tab.id;
        panels.appendChild(source);
    });
    shell.append(nav, panels);
    host.replaceChildren(shell);
    return shell;
}

function renderMergedTabPanels(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let shell = mountMergedTabGroup(groupKey);
    if (!group || !shell) return;
    let selectedId = getSelectedMergedTabId(groupKey);
    renderMergedTabStrip(groupKey);
    shell.querySelectorAll('.merged-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tabId === selectedId);
    });
}

/** 탭에 붙는 표시: 쓸 포인트가 있으면 그 수, 없고 새 소식이 있으면 점. */
function mergedTabMarkHtml(tab) {
    let key = tab.id.replace(/^tab-/, ''), count = Math.max(0, Math.floor(Number(tab.count ? tab.count() : 0) || 0));
    if (count > 0) return `<b class="window-tab-count">${count}</b>`;
    return game.noti && game.noti[key] && isNotiEnabled(key) ? '<i class="window-tab-dot"></i>' : '';
}

/** 그 화면을 바로 여는 단축키(PC)의 작은 자판: 메뉴 단추가 하나로 합쳐져도 키는 화면마다 그대로다. */
function mergedTabHotkeyHtml(tab) {
    let source = document.getElementById('btn-' + tab.id);
    return source && source.dataset.hotkey ? `<kbd class="window-tab-key"><span class="px-center">${escapeHTML(source.dataset.hotkey)}</span></kbd>` : '';
}

/** 묶음 창의 탭 하나: 그 화면의 그림과 이름, 표시(mergedTabMarkHtml), 단축키. */
function mergedTabButtonHtml(groupKey, tab, selectedId) {
    let icon = Number.isInteger(tab.icon) ? `<span class="window-tab-icon" style="--px-icon:${tab.icon}"></span>` : '';
    let active = tab.id === selectedId;
    return `<button type="button" class="subtab-btn window-tab${active ? ' active' : ''}" role="tab" aria-selected="${active}" data-tab-id="${tab.id}" onclick="switchMergedTabSubtab('${groupKey}','${tab.id}')">${icon}<span class="window-tab-name">${_t(tab.label)}</span>${mergedTabMarkHtml(tab)}${mergedTabHotkeyHtml(tab)}</button>`;
}

/** PC의 창이면 창 머리(제목 줄) 안의 탭 자리, 창이 아니면(휴대폰) null. 창 머리는 화면 크기가 바뀔 때 다시 지어지므로 없으면 만든다. */
function mergedTabTitleHost(root) {
    let titlebar = root.querySelector(':scope > .ui-window-titlebar');
    if (!titlebar) return null;
    let host = titlebar.querySelector(':scope > .ui-window-tabs');
    if (host) return host;
    host = document.createElement('div');
    host.className = 'ui-window-tabs';
    host.setAttribute('role', 'tablist');
    // 창 머리를 두 번 누르면 창을 키운다: 탭을 잇달아 누른 것은 그 뜻이 아니다
    host.addEventListener('dblclick', event => { if (event.target.closest('button')) event.stopPropagation(); });
    titlebar.insertBefore(host, titlebar.querySelector(':scope > .ui-window-actions'));
    return host;
}

/** 묶음 창의 탭 줄을 그린다. PC의 창에서는 제목 대신 창 머리에 놓이고(본문의 높이를 쓰지 않는다), 휴대폰에서는 화면 맨 위의 줄이다.
 * 내용이 같으면 손대지 않는다(화면을 고칠 때마다 불린다: 쓸 포인트의 수와 새 소식의 점이 따라온다). */
function renderMergedTabStrip(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey], root = group && document.getElementById(group.launcher);
    let nav = root && root.querySelector('.merged-tab-subtabs');
    if (!nav) return;
    let selectedId = getSelectedMergedTabId(groupKey), visibleTabs = group.tabs.filter(isMergedTabAvailable), many = visibleTabs.length > 1;
    let html = many ? visibleTabs.map(tab => mergedTabButtonHtml(groupKey, tab, selectedId)).join('') : '';
    let titleHost = mergedTabTitleHost(root);
    root.classList.toggle('ui-window-tabbed', !!titleHost && many);
    nav.classList.add('window-tab-strip');
    // 창 머리에 탭이 놓이면 본문의 줄은 비운다
    setMergedTabStripHtml(titleHost, html, many);
    setMergedTabStripHtml(nav, titleHost ? '' : html, many && !titleHost);
}

function setMergedTabStripHtml(host, html, shown) {
    if (!host) return;
    host.hidden = !shown;
    if (host.dataset.rendered !== html) { host.innerHTML = html; host.dataset.rendered = html; }
}

/** 창이 열리거나 창 안의 화면이 바뀌어 그 화면에 들어섰다: 장비 화면이면 첫 탭(장비)으로 돌리고 세팅 분석을 돌린다. */
function enterShownTab(tabId) {
    if (tabId !== 'tab-items') return;
    if (game.noti) game.noti.items = false;
    if (window.equipmentTriage) window.equipmentTriage.onOpen();
    switchItemSubtab('item-tab-equip');
}

/** switchTab이 지금부터 보일 화면을 정한다. 묶음의 문을 여는 탭을 이름으로 부르면(단축키, 안내, "장비 열기" 같은 단추) 마지막에 보던
 * 화면이 아니라 그 탭 자신의 화면을 고른다(단추와 창 머리의 탭은 switchMergedTabSubtab으로 고른 화면을 그대로 연다).
 * @returns {{id: string, changed: boolean}} 보일 화면과, 같은 묶음 창에서 방금까지 다른 화면이 보였는지 */
function resolveShownTab(tabId, mergedEntry) {
    if (!mergedEntry) return { id: tabId, changed: false };
    let groupKey = mergedEntry[0], own = mergedEntry[1].tabs.find(tab => tab.id === tabId);
    if (!mergedTabSwitching && isMergedTabAvailable(own)) game.settings.mergedTabSelection[groupKey] = tabId;
    let id = resolveRenderedTabId(tabId), changed = mergedPaneShown.get(groupKey) !== id;
    mergedPaneShown.set(groupKey, id);
    return { id, changed };
}

/** 이미 열려 있는 묶음 창을 다시 불렀다: 탭 줄을 맞추고, 화면이 바뀌었으면 그 화면에 들어서는 일을 한다. */
function refreshShownMergedTab(mergedEntry, shown) {
    if (!mergedEntry) return;
    renderMergedTabSubtabs(mergedEntry[0]);
    if (shown.changed) enterShownTab(shown.id);
    tutorialActionUi.followOpeningTab(shown.id);
}

function switchMergedTabSubtab(groupKey, tabId, options = {}) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let tab = group && group.tabs.find(entry => entry.id === tabId);
    if (!tab || !isMergedTabAvailable(tab)) return;
    game.settings = game.settings || {};
    game.settings.mergedTabSelection = game.settings.mergedTabSelection || {};
    game.settings.mergedTabSelection[groupKey] = tabId;
    let wasCodexNotified = !!(game.noti && game.noti.codex);
    if (game.noti) game.noti[tabId.replace(/^tab-/, '')] = false;
    if (tabId === 'tab-codex' && wasCodexNotified) game.codexFocusNewOnOpen = true;
    // 고른 화면 그대로 문을 여는 탭을 부른다(switchTab은 문을 여는 탭을 이름으로 부르면 그 탭 자신의 화면을 고른다)
    mergedTabSwitching = true;
    try { window.switchTab(group.launcher, { keepWindowOpen: options.keepWindowOpen !== false }); }
    finally { mergedTabSwitching = false; }
    updateStaticUI();
}

function syncMergedTabLauncherVisibility() {
    contentUnlockUi.sync();
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = document.getElementById('btn-' + group.launcher);
        if (launcher) launcher.style.display = group.tabs.some(isMergedTabAvailable) ? 'flex' : 'none';
    });
}

function syncMergedTabLauncherState() {
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = document.getElementById('btn-' + group.launcher);
        if (!launcher) return;
        let root = document.getElementById(group.launcher);
        launcher.classList.toggle('active', !!(root && root.classList.contains('active')));
        let sourceKeys = group.tabs.map(tab => tab.id.replace(/^tab-/, ''));
        let dot = launcher.querySelector('.noti-dot');
        if (dot) dot.style.display = sourceKeys.some(key => game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none';
        // 열려 있는 묶음 창의 탭 줄(쓸 포인트의 수, 새 소식의 점)도 함께 맞춘다
        if (root && (root.classList.contains('active') || root.classList.contains('ui-window-open'))) renderMergedTabStrip(getMergedTabGroup(group.launcher)[0]);
    });
    // 휴대폰 하단의 전체 단추도 탭을 바꿀 때마다 맞춘다(알림 점이 바뀔 때만 맞추면 커뮤니티를 열어도 켜지지 않았다)
    syncMobilePrimaryNavigationState();
}

function openMergedTabPicker(event, groupKey) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return;
    const firstGear = groupKey === 'gear' && contentProgression.opening.applies(game)
        && game.tutorialHistory.some(row => row.key === 'tutorial_first_gear' && row.status === 'unread');
    let selectedTabId = firstGear ? 'tab-items' : getSelectedMergedTabId(groupKey);
    if (!selectedTabId) return;
    switchMergedTabSubtab(groupKey, selectedTabId, { keepWindowOpen: false });
}

// 특정 탭을 "그 탭이 실제로 보이는 상태"로 연다.
// tab-char처럼 병합 그룹의 런처인 탭은 switchTab만으로는 창만 열리고 안쪽 화면은
// 마지막에 보던 탭(직업전직 등)이 그대로여서, 누른 것과 다른 화면이 뜬다.
function openTabPane(tabId) {
    let mergedEntry = getMergedTabGroup(tabId);
    if (mergedEntry) {
        switchMergedTabSubtab(mergedEntry[0], tabId);
        return;
    }
    switchTab(tabId);
}

function renderMergedTabSubtabs(tabId) {
    renderMergedTabPanels(tabId);
}

/** 휴대폰: 메뉴 띠가 옆으로 넘칠 때만 고른 단추를 가운데로 굴린다. 화면을 그린 뒤에 재므로 탭 전환이 강제 레이아웃을
 * 기다리지 않는다(전환마다 부르던 scrollIntoView가 CPU 4배 감속 휴대폰에서 한 번에 약 40ms였다 — 지금 하단 메뉴는 넘치지 않는다). */
function revealActiveTabButton(button) {
    requestAnimationFrame(() => setTimeout(() => {
        const bar = button.parentElement;
        if (bar && bar.scrollWidth > bar.clientWidth + 1) button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, 0));
}

exposeFileGlobals({ isMobilePrimaryNavigationEnabled, setMobileTabDrawerOpen, renderTabOrderSettings, onTabGroupDragStart, onTabGroupDrop, getTabGroupForId, isTabGroupingActive, getActiveTabGroup, selectTabGroup, applyTabGroupFilter, renderTabCategoryBar, commitMobileDockOrder, applyTabHeaderOrder, scheduleTabHeaderViewportSync, updateTabNotificationDots, syncTabUnlockButton, updateTabUnlockButtons, hideOutOfGroupTabButtons, refreshTabHeaderUiIfNeeded, isNotiEnabled, getMergedTabGroup, getSelectedMergedTabId, getActiveTopLevelTabElement, getActiveUiTabId, getRenderingUiTabIds, renderVisibleManagementPanels, isTabSurfaceAvailable, closeRelockedTabSurfaces, resolveShownTab, refreshShownMergedTab, switchMergedTabSubtab, syncMergedTabLauncherVisibility, syncMergedTabLauncherState, openMergedTabPicker, openTabPane, renderMergedTabSubtabs, revealActiveTabButton });
})();

safeExposeGlobals({ isTabSurfaceAvailable, closeRelockedTabSurfaces, openMergedTabPicker, switchMergedTabSubtab, openTabPane });

if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleTabHeaderViewportSync);
    window.addEventListener('orientationchange', scheduleTabHeaderViewportSync);
    window.addEventListener('game:languagechange', () => {
        playerStatCache.invalidate();
        cachedTooltipStats = null;
        gemTooltipCache = null;
        if (document.getElementById('info-tooltip')) hideInfoTooltip();
        const pip = document.getElementById('mobile-battle-pip');
        if (pip) setMobileBattlePipCollapsed(pip, pip.classList.contains('is-collapsed'));
        scheduleTabHeaderViewportSync();
    });
}
