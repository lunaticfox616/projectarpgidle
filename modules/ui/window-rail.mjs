import { MERGED_TAB_GROUPS } from './tab-definitions.mjs';
import { isDesktopWindowed, closeRailMiscPanel } from './window-queries.mjs';
import { toggleGoalDrawer } from './window-goal-drawer.mjs';
import { listenWindow } from './window-view-lifetime.mjs';
import { queueWindowFrame, cancelWindowFrame } from './window-frame-queue.mjs';

export function closeCommunityDock(runtime) {
    // Startup closes the community dock too: switching back must not unfold the saved/default combat log.
    if (typeof runtime.deps.messageFrames !== 'object') return;
    if (isDesktopWindowed(runtime)) runtime.deps.messageFrames.showTab('log', false);
    else runtime.deps.messageFrames.showPhoneTab('log');
}

export function getOrderedRailButtons(runtime, header) {
    let buttons = Array.from(header.querySelectorAll('.tab-btn'))
        .filter(button => !runtime.state.RAIL_EXTERNAL_TAB_IDS.has(button.id));
    let savedTabOrder = [...runtime.deps.tabLayoutUi.current().tabOrder, ...runtime.deps.tabLayoutUi.defaultOrder];
    let originalRank = new Map(buttons.map((button, index) => [
        button.id, Number(button.dataset.railOriginalOrder ?? index)
    ]));
    let ordered = buttons.sort((left, right) => {
        let leftSaved = savedTabOrder.indexOf(left.id);
        let rightSaved = savedTabOrder.indexOf(right.id);
        if (leftSaved >= 0 || rightSaved >= 0) {
            if (leftSaved < 0) return 1;
            if (rightSaved < 0) return -1;
            return leftSaved - rightSaved;
        }
        return originalRank.get(left.id) - originalRank.get(right.id);
    });
    return ordered;
}

export function railCaption(runtime, id, label) {
    return runtime.deps.tabLayoutUi.shortCaptions[id] || label;
}

export function wrapRailButtonLabel(runtime, button) {
    if (!button || !button.childNodes || button.querySelector(':scope > .ui-rail-label')) return;
    let textNodes = Array.from(button.childNodes)
        .filter(node => node.nodeType === 3 && node.textContent.trim());
    if (textNodes.length === 0) return;
    let label = runtime.deps.document.createElement('span');
    label.className = 'ui-rail-label';
    // 한국어 원문을 적고 data-i18n으로 두면 지금과 언어가 바뀔 때 i18n이 옮긴다(글 마디가 이미 옮겨져 있어도 원문을 쓴다).
    label.dataset.i18n = '';
    label.textContent = textNodes.map(node => runtime.deps.i18n.sourceOf(node).trim()).join(' ');
    // 아래 바의 짧은 이름: 다른 언어에서는 '|하단 메뉴' 문맥의 짧은 번역을 쓰고, 없으면 그 글의 보통 번역을 쓴다(js/i18n.js).
    button.dataset.caption = `${railCaption(runtime, button.id, label.textContent)}|하단 메뉴`;
    button.dataset.i18nAttr = 'data-caption';
    // 화면 여럿을 여는 단추(장비 단추는 장비와 스킬룬)는 묶음 이름 하나만 적는다(스킬트리, 장비, 루프, 기록). 화면들을 모두 나열하면
    // 좁은 화면의 아래 탭에 "스킬트리, 전직, 재능"처럼 길게 보였다(사용자 2026-10-27). 안의 화면은 창 머리의 탭에서 고른다.
    let merged = button.dataset.mergedTabLauncher && typeof MERGED_TAB_GROUPS === 'object' ? MERGED_TAB_GROUPS[button.dataset.mergedTabLauncher] : null;
    if (merged) label.textContent = (0, runtime.deps._t)(merged.title);
    if (button.dataset.hotkey) label.dataset.hotkey = button.dataset.hotkey;
    textNodes.forEach(node => button.removeChild(node));
    button.insertBefore(label, button.firstChild);
    runtime.deps.i18n.applyStatic(button);
}

export function createRailMiscButton(runtime) {
    let button = runtime.deps.document.createElement('button');
    button.id = 'btn-ui-rail-misc';
    button.type = 'button';
    button.className = 'ui-rail-external-btn ui-rail-misc-btn';
    // 글과 이름표는 원문으로 두고 data-i18n이 옮긴다: 이 단추는 저장의 언어가 정해지기 전에 만들어진다
    button.setAttribute('aria-label', '기타 메뉴 열기');
    button.dataset.i18n = '';
    button.dataset.i18nAttr = 'aria-label';
    button.setAttribute('aria-controls', 'ui-rail-misc-panel');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '기타|하단 메뉴<span id="noti-ui-rail-misc" class="noti-dot"></span>';
    runtime.deps.i18n.applyStatic(button);
    listenWindow(runtime, button, 'click', runtime.handlers.toggleRailMiscPanel);
    return button;
}

export function installRailLayers(runtime, header) {
    let tabLayer = runtime.deps.document.createElement('div');
    tabLayer.className = 'ui-rail-tab-layer';
    tabLayer.setAttribute('aria-label', (0, runtime.deps._t)('메뉴'));
    header.appendChild(tabLayer);
    let controls = runtime.deps.document.createElement('div');
    controls.className = 'ui-rail-external-controls';
    controls.appendChild(createRailMiscButton(runtime));
    header.appendChild(controls);
    let miscPanel = runtime.deps.document.createElement('div');
    miscPanel.id = 'ui-rail-misc-panel';
    miscPanel.className = 'ui-rail-misc-panel';
    miscPanel.hidden = true;
    listenWindow(runtime, header, 'click', runtime.handlers.closeRailMiscPanelAfterSelection);
    listenWindow(runtime, runtime.deps.document, 'pointerdown', runtime.handlers.closeRailMiscPanelFromOutside, true);
    listenWindow(runtime, runtime.deps.document, 'keydown', runtime.handlers.closeRailMiscPanelOnEscape, true);
    header.appendChild(miscPanel);
}

export function isRailButtonVisible(runtime, button) {
    return button.style.display !== 'none' && !button.hidden && button.dataset.mergedTabMember !== '1';
}

export function toggleRailMiscPanel(runtime) {
    let panel = runtime.deps.document.getElementById('ui-rail-misc-panel');
    let trigger = runtime.deps.document.getElementById('btn-ui-rail-misc');
    if (!panel || !trigger) return;
    panel.hidden = !panel.hidden;
    trigger.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    let drawer = runtime.deps.document.getElementById('ui-goal-drawer');
    if (!panel.hidden && drawer && drawer.classList.contains('expanded')) toggleGoalDrawer(runtime, false);
}

export function closeRailMiscPanelFromOutside(runtime, event) {
    let panel = runtime.deps.document.getElementById('ui-rail-misc-panel');
    if (!panel || panel.hidden || !event.target.closest) return;
    if (event.target.closest('#ui-rail-misc-panel, #btn-ui-rail-misc')) return;
    closeRailMiscPanel(runtime);
}

export function closeRailMiscPanelOnEscape(runtime, event) {
    let panel = runtime.deps.document.getElementById('ui-rail-misc-panel');
    if (event.key !== 'Escape' || !panel || panel.hidden) return;
    closeRailMiscPanel(runtime);
    event.stopPropagation();
}

export function closeRailMiscPanelAfterSelection(runtime, event) {
    if (!event.target.closest || !event.target.closest('.tab-btn')) return;
    closeRailMiscPanel(runtime);
}

export function hasVisibleRailNotice(runtime, button) {
    if (button.classList.contains('starter-equip-tutorial-pending')) return true;
    return Array.from(button.querySelectorAll('.noti-dot, .inventory-full-warning'))
        .some(notice => {
        let style = runtime.deps.window.getComputedStyle ? runtime.deps.window.getComputedStyle(notice) : notice.style;
        return style.display !== 'none' && style.visibility !== 'hidden';
    });
}

export function moveRailAuxiliaryTabs(runtime, miscPanel) {
    ['btn-tab-settings', 'btn-map-complete-action-picker'].forEach(id => {
        let button = runtime.deps.document.getElementById(id);
        if (button) miscPanel.appendChild(button);
    });
}

export function updateRailMiscNotice(runtime, miscPanel) {
    let notice = runtime.deps.document.getElementById('noti-ui-rail-misc');
    if (!notice) return;
    let visible = Array.from(miscPanel.querySelectorAll('.tab-btn')).filter(runtime.handlers.isRailButtonVisible);
    notice.style.display = visible.some(runtime.handlers.hasVisibleRailNotice) ? 'block' : 'none';
}

export function installDesktopRailMenu(runtime) {
    let header = runtime.deps.document.querySelector('.tab-header');
    if (!header) return;
    if (!header.querySelector(':scope > .ui-rail-tab-layer')) {
        Array.from(header.querySelectorAll('.tab-btn')).forEach((button, index) => {
            button.dataset.railOriginalOrder = String(index);
        });
        installRailLayers(runtime, header);
    }
    installCloseAllButton(runtime);
    dockRailIntoHud(runtime, header);
    syncDesktopRailGroups(runtime);
}

export function dockRailIntoHud(runtime, header) {
    let shell = runtime.deps.document.querySelector('.player-hud-shell');
    if (!shell || runtime.state.railDockHome) return;
    runtime.state.railDockHome = { parent: header.parentElement, next: header.nextElementSibling };
    let rightWing = runtime.deps.document.createElement('div');
    rightWing.className = 'ui-rail-tab-layer ui-rail-wing-right';
    rightWing.setAttribute('aria-label', (0, runtime.deps._t)('메뉴'));
    header.querySelector(':scope > .ui-rail-tab-layer').classList.add('ui-rail-wing-left');
    header.insertBefore(rightWing, header.querySelector(':scope > .ui-rail-external-controls'));
    shell.appendChild(header);
    header.classList.add('ui-rail-docked');
    runtime.deps.document.body.classList.add('hud-menu-docked');
    observeDockedHud(runtime, [runtime.deps.document.querySelector('.player-hud'), header.querySelector(':scope > .ui-rail-wing-left'), rightWing]);
}

export function undockRailFromHud(runtime, header) {
    if (!runtime.state.railDockHome) return;
    runtime.state.railDockHome.parent.insertBefore(header, runtime.state.railDockHome.next);
    runtime.state.railDockHome = null;
    header.classList.remove('ui-rail-docked');
    runtime.deps.document.body.classList.remove('hud-menu-docked');
    if (runtime.state.dockedHudWatch) runtime.state.dockedHudWatch.disconnect();
    cancelWindowFrame(runtime, 'hudLayoutFrame');
    runtime.state.dockedHudSizes.clear();
}

export function observeDockedHud(runtime, targets) {
    if (typeof runtime.deps.ResizeObserver !== 'function') return;
    runtime.state.dockedHudWatch = runtime.state.dockedHudWatch || new runtime.deps.ResizeObserver(runtime.handlers.noteDockedHudResize);
    targets.forEach(target => { if (target) runtime.state.dockedHudWatch.observe(target); });
}

export function noteDockedHudResize(runtime, entries) {
    if (!runtime.active) return;
    let changed = entries.filter(entry => {
        let size = Math.round(entry.contentRect.width) + 'x' + Math.round(entry.contentRect.height);
        if (runtime.state.dockedHudSizes.get(entry.target) === size) return false;
        runtime.state.dockedHudSizes.set(entry.target, size);
        return true;
    });
    if (runtime.state.railDockHome && changed.length) queueWindowFrame(runtime, 'hudLayoutFrame', runtime.handlers.relayoutDockedHud);
}

export function relayoutDockedHud(runtime) {
    if (!runtime.state.railDockHome) return;
    syncDesktopRailGroups(runtime);
    Object.keys(runtime.state.WINDOW_DEFS).forEach(runtime.handlers.applyWindowState);
    // 전투 기록 창의 기본 자리(HUD 상자 바로 위)와 작업 영역도 HUD 높이를 따른다(탐험 지도가 나타나면 HUD가 솟는다).
    if (typeof runtime.deps.messageFrames === 'object') runtime.deps.messageFrames.sync();
}

/** Shown on screen: a tab can be unlocked (no inline display: none) yet still hidden by a stylesheet (해금 before its first unlock). */
export function isRailButtonDisplayed(runtime, button) {
    return typeof button.getClientRects !== 'function' || button.getClientRects().length > 0;
}

/** How many of the buttons sit on the wing's single row (the rest wrap below its bottom edge). */
export function countRailWingRoom(runtime, wing, buttons) {
    let bottom = wing.getBoundingClientRect().bottom;
    return buttons.filter(button => button.getBoundingClientRect().bottom <= bottom + 0.5).length;
}

export function spreadRailWings(runtime, header, visible) {
    let left = header.querySelector(':scope > .ui-rail-wing-left');
    let right = header.querySelector(':scope > .ui-rail-wing-right');
    if (!left || !right) return [];
    let shown = visible.filter(runtime.handlers.isRailButtonDisplayed);
    let leftRoom = countRailWingRoom(runtime, left, shown);
    shown.forEach(button => right.appendChild(button));
    let rightRoom = countRailWingRoom(runtime, right, shown);
    let overflow = pickRailOverflow(runtime, shown, leftRoom + rightRoom);
    let kept = shown.filter(button => !overflow.includes(button));
    let leftCount = Math.min(leftRoom, Math.max(Math.ceil(kept.length / 2), kept.length - rightRoom));
    kept.slice(0, leftCount).forEach(button => left.appendChild(button));
    return overflow;
}

/** The buttons that go to 기타 when only `room` fit on the bar: auxiliary tabs from the back first, core windows last. */
export function pickRailOverflow(runtime, shown, room) {
    let spare = shown.length - room;
    if (spare <= 0) return [];
    let auxiliary = shown.filter(button => !runtime.state.RAIL_CORE_TAB_IDS.has(button.id)).reverse();
    let core = shown.filter(button => runtime.state.RAIL_CORE_TAB_IDS.has(button.id)).reverse();
    return [...auxiliary, ...core].slice(0, spare);
}

export function measureRailOverflow(runtime, tabLayer, visible) {
    // Measure in viewport coordinates so UI scale and actual row/gap sizes agree.
    tabLayer.scrollTop = 0;
    const bottom = tabLayer.getBoundingClientRect().bottom;
    return visible.filter(button => button.getBoundingClientRect().bottom > bottom + 0.5);
}

export function syncDesktopRailGroups(runtime) {
    let header = runtime.deps.document.querySelector('.tab-header');
    let tabLayer = header && header.querySelector(':scope > .ui-rail-tab-layer');
    let miscPanel = header && header.querySelector(':scope > .ui-rail-misc-panel');
    if (!tabLayer || !miscPanel) return;
    let buttons = getOrderedRailButtons(runtime, header);
    let visible = buttons.filter(button => isRailButtonVisible(runtime, button) && !runtime.deps.tabLayoutUi.isMisc(button.id));
    buttons.forEach(button => {
        wrapRailButtonLabel(runtime, button);
        tabLayer.appendChild(button);
    });
    buttons.filter(button => runtime.deps.tabLayoutUi.isMisc(button.id)).forEach(button => miscPanel.appendChild(button));
    moveRailAuxiliaryTabs(runtime, miscPanel);
    const overflow = runtime.state.railDockHome ? spreadRailWings(runtime, header, visible) : measureRailOverflow(runtime, tabLayer, visible);
    overflow.forEach(button => miscPanel.appendChild(button));
    miscPanel.dataset.railOverflow = String(overflow.length);
    updateRailMiscNotice(runtime, miscPanel);
}

export function installCloseAllButton(runtime) {
    let header = runtime.deps.document.querySelector('.tab-header');
    if (!header || runtime.deps.document.getElementById('btn-close-all-windows')) return;
    let btn = runtime.deps.document.createElement('button');
    btn.id = 'btn-close-all-windows';
    btn.type = 'button';
    btn.className = 'ui-rail-external-btn ui-close-all-btn';
    btn.textContent = '정리|하단 메뉴';
    btn.setAttribute('aria-label', '열린 창 모두 닫기');
    btn.dataset.i18n = '';
    btn.dataset.i18nAttr = 'aria-label';
    runtime.deps.i18n.applyStatic(btn);
    listenWindow(runtime, btn, 'click', runtime.handlers.closeAllWindows);
    let logo = runtime.deps.document.createElement('button');
    logo.id = 'ui-rail-logo';
    logo.type = 'button';
    logo.setAttribute('aria-label', (0, runtime.deps._t)('RIGNIN, 열린 창 모두 닫기'));
    logo.dataset.tip = (0, runtime.deps._t)('열린 창 모두 닫기');
    logo.innerHTML = '<img src="assets/ui/pixel/rignin-logo-52.png" alt="" width="52" height="52">';
    listenWindow(runtime, logo, 'click', runtime.handlers.closeAllWindows);
    header.prepend(logo);
    let controls = header.querySelector(':scope > .ui-rail-external-controls');
    (controls || header).appendChild(btn);
}
