export function isClickSensitiveTarget(target) {
    return !!(target && target.closest && target.closest('button, .tab-btn, .subtab-btn, a, input, select, textarea, [onclick], [role="button"], .item-card, .skill-gem, .slot-box, .map-item'));
}

export function beginUiPointerInteraction(runtime, event) {
    if (event && event.pointerType === 'mouse' && event.button !== 0) return;
    if (!runtime.handlers.isClickSensitiveTarget(event && event.target)) return;
    runtime.state.uiPointerInteraction = { pointerId: event.pointerId, startedAt: runtime.deps.Date.now() };
}

export function finishUiPointerInteraction(runtime, event) {
    if (!runtime.state.uiPointerInteraction) return;
    if (event && event.pointerId !== runtime.state.uiPointerInteraction.pointerId) return;
    runtime.state.uiPointerInteraction = null;
    if (runtime.state.uiRefreshQueued) runtime.handlers.scheduleDeferredStaticUiFlush(runtime.state.UI_REFRESH_POINTER_FLUSH_DELAY_MS);
}

export function isUiPointerInteractionActive(runtime, now = runtime.deps.Date.now()) {
    if (!runtime.state.uiPointerInteraction) return false;
    return (now - runtime.state.uiPointerInteraction.startedAt) < runtime.state.UI_REFRESH_LONG_POINTER_LIMIT_MS;
}

export function getUiDisclosureKey(details) {
    if (!details || !details.dataset) return '';
    if (details.dataset.uiDisclosure) return `named:${details.dataset.uiDisclosure}`;
    if (details.id) return `id:${details.id}`;
    let owner = typeof details.closest === 'function' ? details.closest('[id]') : null;
    if (!owner || typeof owner.querySelectorAll !== 'function') return '';
    let siblings = Array.from(owner.querySelectorAll('details'));
    let index = siblings.indexOf(details);
    return index >= 0 ? `owner:${owner.id}:${index}` : '';
}

export function captureUiDisclosureState(runtime, root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('details').forEach(details => {
        let key = runtime.handlers.getUiDisclosureKey(details);
        if (key) runtime.state.uiDisclosureState[key] = !!details.open;
    });
}

export function restoreUiDisclosureState(runtime, root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('details').forEach(details => {
        let key = runtime.handlers.getUiDisclosureKey(details);
        if (key && Object.prototype.hasOwnProperty.call(runtime.state.uiDisclosureState, key)) details.open = runtime.state.uiDisclosureState[key];
    });
}

export function isUiSelectInteractionActive(runtime) {
    let active = typeof runtime.deps.document !== 'undefined' ? runtime.deps.document.activeElement : null;
    return !!(active && active.tagName === 'SELECT' && active.isConnected !== false);
}

/** Redraw only when the build, view settings, canvas size or pixel ratio changed. */
export function shouldRedrawPassiveTree(runtime) {
    let signature = [
        runtime.deps.game.passivePoints || 0,
        (runtime.deps.game.passives || []).length,
        (runtime.deps.game.discoveredPassives || []).length,
        runtime.deps.game.startNode || '',
        runtime.deps.game.ascendClass || '',
        runtime.deps.game.season || 1,
        ...passiveTreeSettingsKey(runtime.deps.game.settings),
        runtime.handlers.passiveTreeBoxKey()
    ].join('|');
    let changed = signature !== runtime.state.lastPassiveTreeSignature;
    if (changed) runtime.state.lastPassiveTreeSignature = signature;
    return changed;
}

function passiveTreeSettingsKey(settings) {
    return [
        (settings && settings.passiveTreeSearch) || '',
        (settings && settings.passiveTreeFilter) || 'all',
        settings && settings.passiveTreeShowLabels === false ? 'labels-off' : 'labels-on'
    ];
}

export function passiveTreeBoxKey(runtime) {
    const canvas = runtime.deps.document.getElementById('tree-canvas'), box = canvas && canvas.parentElement;
    return box ? `${box.clientWidth}x${box.clientHeight}@${runtime.deps.passiveSelectionUi.pixelRatio()}` : '';
}
export function canEditBuild(runtime) {
    if (!runtime.deps.game.woodsmanBuildLock) return true;
    runtime.deps.addLog(runtime.deps._t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    return false;
}

