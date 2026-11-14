/** 툴팁의 보이는 크기(화면 화소). 화면보다 크면 줄여서 다 보이게 한다(2026-11-12 사용자: 긴 비교 툴팁에 스크롤이 생김. 툴팁은 마우스가 지나가므로
* 스크롤할 수 없고 잘린 줄은 볼 수 없었다). 손가락으로 끄는 툴팁(pointer-events auto)은 제 스크롤을 쓴다. 바뀔 때만 잰다(내용, 화면 배율). */
export function measureTooltip(runtime, el) {
    let size = runtime.state.tooltipSizeCache.get(el);
    if (size && size.factor === runtime.deps.uiDisplay.factor) return size;
    el.style.transform = 'none';   // 지난번에 줄인 배율이 아니라 원래 크기를 잰다
    const rect = el.getBoundingClientRect(), fixed = (0, runtime.deps.getComputedStyle)(el).pointerEvents === 'none';
    const fit = fixed ? Math.max(0.5, Math.min(1, (runtime.deps.window.innerHeight - 16) / rect.height, (runtime.deps.window.innerWidth - 16) / rect.width)) : 1;
    size = { width: rect.width * fit, height: rect.height * fit, fit, factor: runtime.deps.uiDisplay.factor };
    runtime.state.tooltipSizeCache.set(el, size);
    return size;
}

export function applyTooltipPosition(runtime, el, x, y) {
    if (!el || el.style.display === 'none') return;
    if (el.style.left !== '0px' || el.style.top !== '0px') {
        el.style.left = '0px';
        el.style.top = '0px';
    }
    const size = measureTooltip(runtime, el);
    let left = x + 18;
    let top = y + 18;
    if (left + size.width > runtime.deps.window.innerWidth - 10) left = x - size.width - 18;
    if (top + size.height > runtime.deps.window.innerHeight - 10) top = y - size.height - 18;
    left = (0, runtime.deps.clampNumber)(left, 8, Math.max(8, runtime.deps.window.innerWidth - size.width - 8));
    top = (0, runtime.deps.clampNumber)(top, 8, Math.max(8, runtime.deps.window.innerHeight - size.height - 8));
    ({ left, top } = runtime.deps.tutorialActionUi.clearTooltipSpot({ left, top, width: size.width, height: size.height }, x, y));
    const deviceScale = Math.max(1, Number(runtime.deps.window.devicePixelRatio) || 1);
    const snappedLeft = Math.round(left * deviceScale) / deviceScale;
    const snappedTop = Math.round(top * deviceScale) / deviceScale;
    el.style.transform = `translate(${snappedLeft / runtime.deps.uiDisplay.factor}px, ${snappedTop / runtime.deps.uiDisplay.factor}px)${size.fit < 1 ? ` scale(${size.fit})` : ''}`;
}

export function flushTooltipPositions(runtime) {
    runtime.state.tooltipPositionFrame = null;
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    let positions = Array.from(runtime.state.pendingTooltipPositions.entries());
    runtime.state.pendingTooltipPositions.clear();
    positions.forEach(([el, point]) => applyTooltipPosition(runtime, el, point.x, point.y));
}

export function positionTooltipElement(runtime, el, x, y) {
    if (!el) return;
    runtime.state.pendingTooltipPositions.set(el, { x: Number(x) || 0, y: Number(y) || 0 });
    if (runtime.state.tooltipPositionFrame !== null) return;
    runtime.state.tooltipPositionFrame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.flushTooltipPositions);
}

export function invalidateTooltipSize(runtime, el) {
    if (!el) return;
    runtime.state.tooltipSizeCache.delete(el);
}

export function reuseInfoTooltip(runtime, event, token) {
    let tt = runtime.deps.document.getElementById('info-tooltip');
    if (!token || runtime.state.activeInfoTooltipToken !== token || !tt || tt.style.display !== 'block' || !tt.innerHTML) return false;
    positionTooltipElement(runtime, tt, event.clientX, event.clientY);
    return true;
}

export function setActiveTooltip(runtime, id) {
    if (typeof runtime.state.activeTooltipId === 'undefined') runtime.state.activeTooltipId = null;
    runtime.state.activeTooltipId = id;
}

export function clearActiveTooltip(runtime, id) {
    if (typeof runtime.state.activeTooltipId === 'undefined') return;
    if (runtime.state.activeTooltipId === id) runtime.state.activeTooltipId = null;
}

export function checkTooltipAnchors(runtime) {
    runtime.state.tooltipAnchorCheck = 0;
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    for (const [id, el] of [...runtime.state.tooltipAnchors]) if (!anchorShown(runtime, el)) runtime.state.TOOLTIP_CLOSERS[id]();
}

export function queueTooltipAnchorCheck(runtime) {
    if (!runtime.active || runtime.owner !== runtime.deps.game) return;
    if (!runtime.state.tooltipAnchorCheck) runtime.state.tooltipAnchorCheck = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.checkTooltipAnchors);
}

export function watchTooltipAnchor(runtime, id, el) {
    if (!el || el === runtime.deps.document.body || el === runtime.deps.document.documentElement || typeof runtime.deps.MutationObserver !== 'function') return;
    runtime.state.tooltipAnchors.set(id, el);
    if (runtime.state.tooltipAnchorWatch) return;
    runtime.state.tooltipAnchorWatch = new runtime.deps.MutationObserver(runtime.handlers.queueTooltipAnchorCheck);
    runtime.state.tooltipAnchorWatch.observe(runtime.deps.document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
}

export function releaseTooltipAnchor(runtime, id) {
    runtime.state.tooltipAnchors.delete(id);
    if (runtime.state.tooltipAnchors.size || !runtime.state.tooltipAnchorWatch) return;
    runtime.state.tooltipAnchorWatch.disconnect();
    runtime.state.tooltipAnchorWatch = null;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.tooltipAnchorCheck);
    runtime.state.tooltipAnchorCheck = 0;
}

export function closeEveryTooltip(runtime) {
    hideInfoTooltip(runtime);
    dismissItemTooltipNow(runtime);
    if (typeof runtime.deps.window.hidePassiveNodeTooltip === 'function') runtime.deps.window.hidePassiveNodeTooltip();
}

export function createShowInfoTooltipHtml(runtime) {
    return function showInfoTooltipHtml(x, y, html, borderColor, contentToken) {
        if (runtime.deps.tutorialActionUi.hushesTooltipAt(x, y)) return;
        let tt = runtime.deps.document.getElementById('info-tooltip');
        let hadComparison = tt.classList.contains('item-compare-tooltip');
        if (hadComparison) tt.classList.remove('item-compare-tooltip');
        const fresh = tt.style.display !== 'block' || tt.innerHTML !== html || hadComparison;
        if (tt.innerHTML !== html || hadComparison) {
            tt.innerHTML = html;
            invalidateTooltipSize(runtime, tt);
        }
        runtime.state.activeInfoTooltipToken = contentToken || null;
        tt.style.borderColor = borderColor || '#777';
        tt.style.display = 'block';
        positionTooltipElement(runtime, tt, x, y);
        setActiveTooltip(runtime, 'info-tooltip');
        if (fresh) watchTooltipAnchor(runtime, 'info-tooltip', tooltipAnchorAt(runtime, null, x, y));
    };
}

export function hideInfoTooltip(runtime) {
    clearActiveTooltip(runtime, 'info-tooltip');
    releaseTooltipAnchor(runtime, 'info-tooltip');
    runtime.state.activeInfoTooltipToken = null;
    const element = runtime.deps.document.getElementById('info-tooltip');
    if (element) element.style.display = 'none';
}

export function dismissItemTooltipNow(runtime) {
    runtime.state.itemTooltipComparisonScheduler.cancel();
    runtime.state.itemTooltipComparisonScheduler.setPointer(null);
    runtime.state.activeItemTooltipToken = null;
    clearActiveTooltip(runtime, 'item-tooltip-box');
    releaseTooltipAnchor(runtime, 'item-tooltip-box');
    const element = runtime.deps.document.getElementById('item-tooltip-box');
    if (element) element.style.display = 'none';
}

export function cancelTooltipComparison(runtime) {
    let job = runtime.state.tooltipComparisonJob;
    runtime.state.tooltipComparisonJob = null;
    if (!job) return;
    if (job.delayHandle !== null) (0, runtime.deps.cancelAnimationFrame)(job.delayHandle);
    if (job.workHandle === null) return;
    if (job.workKind === 'idle' && typeof runtime.deps.cancelIdleCallback === 'function') (0, runtime.deps.cancelIdleCallback)(job.workHandle);
    else (0, runtime.deps.clearTimeout)(job.workHandle);
}

export function hideItemTooltip(runtime, event) {
    if (event && runtime.deps.equipmentInventoryInteraction.getFocusedKey()) return;
    if (runtime.state.itemTooltipHideTimer) (0, runtime.deps.clearTimeout)(runtime.state.itemTooltipHideTimer);
    runtime.state.itemTooltipHideTimer = null;
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
        dismissItemTooltipNow(runtime);
        return;
    }
    let pointerX = event.clientX;
    let pointerY = event.clientY;
    runtime.state.itemTooltipHideTimer = (0, runtime.deps.setTimeout)(() => {
        runtime.state.itemTooltipHideTimer = null;
        if (!runtime.active || runtime.owner !== runtime.deps.game) return;
        let hovered = runtime.deps.document.elementFromPoint(pointerX, pointerY);
        if (hovered && hovered.closest('[data-item-tooltip-anchor="1"]')) return;
        dismissItemTooltipNow(runtime);
        }, 24);
}

export function anchorShown(runtime, el) { return el.isConnected && (typeof el.checkVisibility === 'function' ? el.checkVisibility() : el.getClientRects().length > 0); }

export function tooltipAnchorAt(runtime, el, x, y) { return el && el.nodeType === 1 ? el : runtime.deps.document.elementFromPoint(x, y); }
