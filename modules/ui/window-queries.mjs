export function closeRailMiscPanel(runtime) {
    let panel = runtime.deps.document.getElementById('ui-rail-misc-panel');
    let trigger = runtime.deps.document.getElementById('btn-ui-rail-misc');
    if (panel) panel.hidden = true;
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
}

export function isDesktopWindowed(runtime) {
    return !!(runtime.deps.window.matchMedia && runtime.deps.uiDisplay.matches(runtime.state.DESKTOP_MEDIA));
}

export function isMenuUnlocked(runtime, tabId) {
    let button = runtime.deps.document.getElementById('btn-' + tabId);
    return !!button && !button.hidden && button.style.display !== 'none';
}

/** 그 화면이 묶음 창에 들어 있으면 그 창과 지금 보이는 화면, 아니면 null. 묶음은 메뉴 단추의 표시에서 읽는다(index.html:
* 문을 여는 단추의 data-merged-tab-launcher, 그 안의 화면 단추의 data-merged-tab-group). */
export function mergedWindowOf(runtime, tabId) {
    let button = runtime.deps.document.getElementById('btn-' + tabId), groupKey = button ? button.dataset.mergedTabGroup || button.dataset.mergedTabLauncher : '';
    let launcher = groupKey ? runtime.deps.document.querySelector('.tab-btn[data-merged-tab-launcher="' + groupKey + '"]') : null;
    if (!launcher) return null;
    let windowId = launcher.id.replace(/^btn-/, ''), pane = runtime.deps.document.querySelector('#' + windowId + ' .merged-subtab-pane.active');
    return { windowId, shownId: pane ? pane.dataset.tabId : '' };
}
