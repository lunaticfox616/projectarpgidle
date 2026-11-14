import { isMobilePrimaryNavigationEnabled, getOrderedTabGroups } from './tab-navigation-queries.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

export function setMobileTabDrawerOpen(runtime, open) {
    const wasOpen = runtime.deps.document.body.classList.contains('mobile-tab-drawer-open');
    let enabled = isMobilePrimaryNavigationEnabled(runtime);
    let nextOpen = enabled && !!open;
    closeGoalDrawerForMenu(runtime, nextOpen);
    runtime.deps.document.body.classList.toggle('mobile-tab-drawer-open', nextOpen);
    let more = runtime.deps.document.getElementById('btn-mobile-nav-more');
    if (more) more.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    let header = runtime.deps.document.getElementById('tab-header-main');
    if (header && enabled) header.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
    syncMobileMenuFocus(runtime, header, more, wasOpen, nextOpen);
}

function closeGoalDrawerForMenu(runtime, nextOpen) {
    let goalDrawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (nextOpen && goalDrawer && goalDrawer.classList.contains('expanded') && typeof runtime.deps.toggleGoalDrawer === 'function') {
        (0, runtime.deps.toggleGoalDrawer)(false);
    }
}

export function syncMobileMenuFocus(runtime, header, more, wasOpen, nextOpen) {
    if (wasOpen === nextOpen || !header) return;
    if (nextOpen) {
        header.querySelector('.mobile-tab-drawer-head button')?.focus({ preventScroll: true });
        return;
    }
    if (header.contains(runtime.deps.document.activeElement) || runtime.deps.document.activeElement.id === 'mobile-tab-drawer-backdrop') {
        more?.focus({ preventScroll: true });
    }
}

export function handleMobileMenuKey(runtime, event) {
    if (!runtime.deps.document.body.classList.contains('mobile-tab-drawer-open') || !['Tab', 'Escape'].includes(event.key)) return;
    if (runtime.deps.document.querySelector('dialog:modal')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { setMobileTabDrawerOpen(runtime, false); return; }
    const header = runtime.deps.document.getElementById('tab-header-main');
    const buttons = Array.from(header.querySelectorAll('button:not([disabled]),[data-mobile-tab-button]')).filter(button => button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(runtime.deps.document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
}

export function restoreMobileMenuFocus(runtime, focused) {
    if (!runtime.deps.document.body.classList.contains('mobile-tab-drawer-open')) return;
    const header = runtime.deps.document.getElementById('tab-header-main');
    if (!header.contains(focused)) return;
    const target = focused.getClientRects().length ? focused : header.querySelector('.mobile-tab-drawer-head button');
    target?.focus({ preventScroll: true });
}

export function prepareMobileTabButtons(runtime, headers) {
    headers.forEach(header => header.querySelectorAll('.tab-btn:not(button)').forEach(button => {
        button.setAttribute('data-mobile-tab-button', '');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
    }));
}

export function handleMobileTabActivation(runtime, event) {
    if (!runtime.deps.document.body.classList.contains('mobile-primary-navigation')) return;
    if (!event.target.matches('[data-mobile-tab-button]') || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.click();
}

export function toggleMobileTabDrawer(runtime) {
    setMobileTabDrawerOpen(runtime, !runtime.deps.document.body.classList.contains('mobile-tab-drawer-open'));
}

export function createMobileTabDrawerHead(runtime) {
    let head = runtime.deps.document.createElement('div');
    head.className = 'mobile-tab-drawer-head';
    let title = runtime.deps.document.createElement('strong');
    title.textContent = '전체 메뉴';
    title.dataset.i18n = '';
    let actions = runtime.deps.document.createElement('span');
    actions.className = 'mobile-tab-drawer-actions';
    let close = runtime.deps.document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.dataset.i18n = '';
    close.setAttribute('aria-label', '전체 메뉴 닫기');
    close.dataset.i18nAttr = 'aria-label';
    listenView(runtime, close, 'click', () => runtime.handlers.setMobileTabDrawerOpen(false));
    actions.append(close);
    head.append(title, actions);
    runtime.deps.i18n.applyStatic(head);
    return head;
}

export function createMobileMoreButton(runtime) {
    let button = runtime.deps.document.createElement('button');
    button.id = 'btn-mobile-nav-more';
    button.type = 'button';
    button.className = 'mobile-nav-more';
    button.setAttribute('aria-controls', 'tab-header-main');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', '전체 메뉴 열기');
    button.dataset.i18nAttr = 'aria-label';
    button.innerHTML = '<span data-i18n>전체</span><span class="noti-dot"></span>';
    runtime.deps.i18n.applyStatic(button);
    listenView(runtime, button, 'click', runtime.handlers.toggleMobileTabDrawer);
    return button;
}

export function ensureMobilePrimaryNavigation(runtime, topHeader, bottomHeader) {
    if (!topHeader || !bottomHeader) return null;
    runtime.deps.document.body.classList.add('mobile-primary-navigation', 'has-bottom-tabs');
    topHeader.setAttribute('role', 'dialog');
    topHeader.setAttribute('aria-modal', 'true');
    topHeader.setAttribute('aria-label', (0, runtime.deps._t)('전체 메뉴'));
    topHeader.setAttribute('aria-hidden', String(!runtime.deps.document.body.classList.contains('mobile-tab-drawer-open')));
    bottomHeader.setAttribute('role', 'navigation');
    bottomHeader.setAttribute('aria-label', (0, runtime.deps._t)('빠른 탭 메뉴'));
    let head = topHeader.querySelector(':scope > .mobile-tab-drawer-head');
    if (!head) topHeader.prepend(createMobileTabDrawerHead(runtime));
    let more = runtime.deps.document.getElementById('btn-mobile-nav-more');
    if (!more) more = createMobileMoreButton(runtime);
    bottomHeader.appendChild(more);
    let backdrop = runtime.deps.document.getElementById('mobile-tab-drawer-backdrop');
    if (!backdrop) {
        backdrop = runtime.deps.document.createElement('button');
        backdrop.id = 'mobile-tab-drawer-backdrop';
        backdrop.type = 'button';
        backdrop.setAttribute('aria-label', (0, runtime.deps._t)('전체 메뉴 닫기'));
        listenView(runtime, backdrop, 'click', () => runtime.handlers.setMobileTabDrawerOpen(false));
        runtime.deps.document.body.appendChild(backdrop);
    }
    if (!runtime.state.mobileNavigationKeyBound) {
        runtime.state.mobileNavigationKeyBound = true;
        listenView(runtime, runtime.deps.document, 'keydown', runtime.handlers.handleMobileMenuKey, true);
        listenView(runtime, runtime.deps.document, 'keydown', runtime.handlers.handleMobileTabActivation, true);
    }
    prepareMobileTabButtons(runtime, [topHeader, bottomHeader]);
    return more;
}

export function teardownMobilePrimaryNavigation(runtime, topHeader, bottomHeader) {
    setMobileTabDrawerOpen(runtime, false);
    runtime.deps.document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.removeAttribute('data-mobile-tab-button');
        button.removeAttribute('role');
        button.removeAttribute('tabindex');
        button.removeAttribute('aria-pressed');
    });
    runtime.deps.document.body.classList.remove('mobile-primary-navigation', 'mobile-tab-drawer-open', 'has-bottom-tabs');
    if (topHeader && bottomHeader) {
        Array.from(bottomHeader.querySelectorAll(':scope > .tab-btn')).forEach(button => topHeader.appendChild(button));
    }
    if (topHeader) {
        topHeader.removeAttribute('role');
        topHeader.removeAttribute('aria-modal');
        topHeader.removeAttribute('aria-label');
        topHeader.removeAttribute('aria-hidden');
        const head = topHeader.querySelector(':scope > .mobile-tab-drawer-head');
        if (head) releaseViewTarget(runtime, head.querySelector('button'));
        head?.remove();
        topHeader.querySelectorAll('.mobile-menu-group-title').forEach(title => title.remove());
    }
    if (bottomHeader) {
        bottomHeader.removeAttribute('role');
        bottomHeader.removeAttribute('aria-label');
        bottomHeader.style.removeProperty('display');
    }
    for (const id of ['btn-mobile-nav-more', 'mobile-tab-drawer-backdrop']) {
        const element = runtime.deps.document.getElementById(id);
        if (element) releaseViewTarget(runtime, element);
        element?.remove();
    }
    runtime.deps.document.body.style.setProperty('--bottom-tab-height', '0px');
}

export function syncMobilePrimaryNavigationState(runtime) {
    let more = runtime.deps.document.getElementById('btn-mobile-nav-more');
    let topHeader = runtime.deps.document.getElementById('tab-header-main');
    if (!more || !topHeader) return;
    runtime.deps.document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    let activeSecondary = !!topHeader.querySelector(':scope > .tab-btn.active');
    more.classList.toggle('active', activeSecondary);
    let hasNotice = Array.from(topHeader.querySelectorAll('.tab-btn .noti-dot'))
        .some(dot => dot.style.display !== 'none' && (0, runtime.deps.getComputedStyle)(dot).display !== 'none');
    let dot = more.querySelector('.noti-dot');
    if (dot) dot.style.display = hasNotice ? 'block' : 'none';
}

export function renderTabOrderSettings(runtime) {
    runtime.deps.tabLayoutUi.render();
}

export function renderMobileMenuGroups(runtime, header) {
    for (const group of getOrderedTabGroups(runtime)) {
        const buttons = group.tabs.map(id => runtime.deps.document.getElementById('btn-' + id))
            .filter(button => button && button.parentElement === header && button.style.display !== 'none'
                && !button.hidden && button.dataset.mergedTabMember !== '1');
        let title = header.querySelector('[data-mobile-group="' + group.key + '"]');
        if (!title) {
            title = runtime.deps.document.createElement('div');
            title.className = 'mobile-menu-group-title';
            title.dataset.mobileGroup = group.key;
        }
        title.textContent = (0, runtime.deps._t)(group.label);
        title.hidden = buttons.length === 0;
        header.appendChild(title);
        buttons.forEach(button => header.appendChild(button));
    }
}
