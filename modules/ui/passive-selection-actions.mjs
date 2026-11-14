/** 따라 하기 안내가 트리 캔버스와 상세의 "포인트 사용" 단추 사이로 표시를 옮긴다. */
export function refreshGuide(ctx) {
    if (typeof ctx.deps.tutorialActionUi === 'object') ctx.deps.tutorialActionUi.refresh();
}

export function hide(ctx) {
    ctx.state.selection = null;
    const panel = ctx.deps.document.getElementById('passive-mobile-detail');
    if (panel) panel.hidden = true;
    refreshGuide(ctx);
}

/** 확인 단추 글씨: 가진 노드는 반환(공허는 제작), 직업 시작점은 늘 열린 출발점, 나머지는 드는 포인트. */
export function confirmLabel(ctx, node, owned, cost) {
    if (owned) return node.kind === 'void' ? '공허 제작' : '노드 반환 (포자 1개)';
    return node.kind === 'start' ? '시작점, 이미 열림' : (0, ctx.deps._t)('{cost}포인트 사용', { cost });
}

export function canAct(ctx, node, cost) {
    if (ctx.deps.game.passives.includes(node.id) && node.kind === 'void') return true;
    if (ctx.deps.game.woodsmanBuildLock) return false;
    if (!ctx.deps.game.passives.includes(node.id)) return cost > 0 && ctx.deps.game.passivePoints >= cost;
    return (0, ctx.deps.canRefundPassiveNode)(node.id) && ctx.deps.game.currencies.blightSpore > 0;
}

export function actionHint(ctx, node, owned, cost) {
    if (owned && node.kind === 'void') return '할당한 공허의 옵션을 확인하고 제작합니다.';
    if (ctx.deps.game.woodsmanBuildLock) return '나무꾼 전투 중에는 스킬트리를 변경할 수 없습니다.';
    if (node.kind === 'start') return '시작점은 무료입니다.';
    if (owned) return refundHint(ctx, node);
    if (!cost) return '먼저 연결된 노드를 할당해 주세요.';
    return (0, ctx.deps._t)('필요 {cost}포인트, 보유 {passivePoints}포인트{value}', { cost, passivePoints: ctx.deps.game.passivePoints, value: ctx.deps.game.passivePoints < cost ? (0, ctx.deps._t)(', 포인트 부족') : '' });
}

export function refundHint(ctx, node) {
    if (!(0, ctx.deps.canRefundPassiveNode)(node.id)) return '연결이나 포인트 한도 유지에 필요한 노드입니다.';
    return (0, ctx.deps._t)('반환 비용: 마름병 포자 1개, 보유 {blightSpore}개', { blightSpore: ctx.deps.game.currencies.blightSpore || 0 });
}

/** Keep the canvas density bounded on phones while preserving UI-scale coordinate and text mapping. */
export function pixelRatio(ctx) {
    const deviceDpr = ctx.deps.window.devicePixelRatio || 1;
    return Math.max(1, (ctx.deps.uiDisplay.matches('(max-width: 1080px)') ? Math.min(2, deviceDpr) : deviceDpr) * ctx.deps.uiDisplay.factor);
}

export function pathNodeDescription(ctx, id, index) {
    const node = ctx.deps.PASSIVE_TREE.nodes[id];
    const name = (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node);
    const effect = node.kind === 'attribute' ? '힘, 민첩, 지능 중 다음 단계에서 선택'
        : (0, ctx.deps.normalizePassiveTooltipText)((0, ctx.deps.passiveNodePresentation.getPassiveEffectLabel)(node).replace(/<br\s*\/?>/gi, ' / '));
    const description = effect.startsWith(name + ' ') ? effect : `${name}${effect ? '\n' + effect : ''}`;
    return `${index + 1}. ${description}`;
}

/** Show the same node descriptions as the tree, not a guessed final character-stat total. */
export function confirmPath(ctx, node, path) {
    const notes = [];
    if (path.some(id => ctx.deps.PASSIVE_TREE.nodes[id].kind === 'attribute')) {
        notes.push('능력치 노드는 다음 단계에서 선택하며, 선택을 취소하면 포인트를 쓰지 않습니다.');
    }
    if (path.some(id => ctx.deps.PASSIVE_TREE.nodes[id].activationRequirement || ctx.deps.PASSIVE_TREE.nodes[id].connectedDevotionPenalty)) {
        notes.push('조건부 효과와 연결 보정은 현재 투자 상태 기준입니다.');
    }
    const message = ['함께 활성화할 노드', ...path.map(ctx.handlers.pathNodeDescription), ...notes].join('\n\n');
    return (0, ctx.deps.requestGameConfirmation)(message, {
        title: (0, ctx.deps._t)('{node}까지 활성화', { node: (0, ctx.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) }),
        kicker: (0, ctx.deps._t)('최단 경로 노드 {length}개', { length: path.length }),
        confirmLabel: (0, ctx.deps._t)('{length}포인트 사용', { length: path.length })
    });
}

export function present(ctx, node, tooltip, position) {
    if (!ctx.deps.uiDisplay.matches('(max-width: 1080px)')) {
        (0, ctx.deps.invalidateTooltipSize)(tooltip); tooltip.style.display = 'block';
        (0, ctx.deps.positionTooltipElement)(tooltip, position.x, position.y); (0, ctx.deps.setActiveTooltip)('canvas-tooltip'); return;
    }
    tooltip.style.display = 'none'; (0, ctx.deps.clearActiveTooltip)('canvas-tooltip');
    let panel = ctx.deps.document.getElementById('passive-mobile-detail');
    if (!panel) {
        panel = ctx.deps.document.createElement('section'); panel.id = 'passive-mobile-detail';
        panel.setAttribute('aria-label', (0, ctx.deps._t)('선택한 노드'));
        ctx.deps.document.getElementById('tab-char').appendChild(panel);
    }
    const owned = ctx.deps.game.passives.includes(node.id);
    const path = (0, ctx.deps.getPassiveActivationPath)(node.id);
    const cost = path.length;
    const enabled = canAct(ctx, node, cost);
    const label = confirmLabel(ctx, node, owned, cost);
    panel.dataset.nodeId = node.id;
    panel.innerHTML = `<header><strong>${(0, ctx.deps._t)('선택한 노드')}</strong><button type="button" data-passive-close aria-label="${(0, ctx.deps._t)('노드 설명 닫기')}">${(0, ctx.deps._t)('닫기')}</button></header><div class="passive-mobile-description">${tooltip.innerHTML}</div><footer><p id="passive-mobile-action-hint" role="status">${actionHint(ctx, node, owned, cost)}</p><button type="button" data-passive-confirm aria-describedby="passive-mobile-action-hint" ${enabled ? '' : 'disabled'}>${label}</button></footer>`;
    panel.hidden = false;
    panel.querySelector('[data-passive-close]').onclick = ctx.handlers.hide;
    panel.querySelector('[data-passive-confirm]').onclick = ctx.handlers.confirmSelection;
    refreshGuide(ctx);
}

export async function confirmSelection(ctx) {
    const current = ctx.state.selection;
    if (!current) return;
    const panel = ctx.deps.document.getElementById('passive-mobile-detail');
    const button = panel.querySelector('[data-passive-confirm]');
    if (panel.hidden || button.disabled) return;
    button.disabled = true;
    hide(ctx);
    await current.actions.activate({ nodeId: current.node.id, ...current.point });
}

export function touch(ctx, node, point, actions) {
    if (ctx.deps.dragDist >= 10 || !node) return;
    if (ctx.deps.uiDisplay.matches('(max-width: 1080px)')) {
        ctx.state.selection = { node, point: { clientX: point.clientX, clientY: point.clientY }, actions };
        actions.preview(node, point.clientX, point.clientY);
        return;
    }
    actions.activate({ fromTouch: true, nodeId: node.id, clientX: point.clientX, clientY: point.clientY });
}

export function bindTools(ctx, listen) {
    const toolbar = ctx.deps.document.querySelector('.passive-tree-toolbar');
    listen(toolbar, 'click', event => {
        if (!ctx.deps.uiDisplay.matches('(max-width: 1080px)')) return;
        const trigger = event.target.closest('summary, .passive-investment-summary-toggle');
        if (!trigger) return;
        hide(ctx);
        for (const drawer of toolbar.querySelectorAll('details')) {
            if (!drawer.contains(trigger)) drawer.open = false;
        }
        if (trigger.tagName === 'SUMMARY') {
            ctx.deps.game.settings.passiveInvestmentSummaryCollapsed = true;
            (0, ctx.deps.renderPassiveInvestmentSummary)();
        }
        }, true);
    bindCameraTools(ctx, listen);
}

export function bindCameraTools(ctx, listen) {
    const container = ctx.deps.document.getElementById('tree-container');
    const controls = ctx.deps.document.createElement('nav');
    controls.className = 'passive-mobile-camera';
    controls.setAttribute('aria-label', (0, ctx.deps._t)('스킬트리 화면 조절'));
    controls.innerHTML = '<button type="button" data-tree-view="out" aria-label="스킬트리 축소">−</button><button type="button" data-tree-view="fit">내 트리</button><button type="button" data-tree-view="in" aria-label="스킬트리 확대">+</button>';
    listen(controls, 'click', event => {
        const button = event.target.closest('[data-tree-view]');
        if (!button) return;
        hide(ctx);
        if (button.dataset.treeView === 'fit') (0, ctx.deps.fitPassiveCameraToBounds)(true);
        else {
            const zoom = (0, ctx.deps.clampNumber)(ctx.deps.camZoom * (button.dataset.treeView === 'in' ? 1.3 : 1 / 1.3), 0.09, 2.5);
            ctx.deps.camX *= zoom / ctx.deps.camZoom; ctx.deps.camY *= zoom / ctx.deps.camZoom; ctx.deps.camZoom = zoom;
            (0, ctx.deps.clampPassiveCamera)();
        }
        (0, ctx.deps.drawPassiveTree)();
    });
    container.appendChild(controls);
    ctx.state.controls = controls;
}

/** Touch positions use the same CSS coordinate space as the canvas camera, including the UI display scale. */
export function pinchPoint(ctx, canvas, touches) {
    const rect = canvas.getBoundingClientRect();
    return {
        distance: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY),
        x: ((touches[0].clientX + touches[1].clientX) / 2 - rect.left) * canvas.clientWidth / rect.width - canvas.clientWidth / 2,
        y: ((touches[0].clientY + touches[1].clientY) / 2 - rect.top) * canvas.clientHeight / rect.height - canvas.clientHeight / 2
    };
}

export function startPinch(ctx, canvas, touches, gesture) {
    const point = pinchPoint(ctx, canvas, touches);
    Object.assign(gesture, { pinched: true, distance: point.distance, zoom: ctx.deps.camZoom,
        anchorX: (point.x - ctx.deps.camX) / ctx.deps.camZoom, anchorY: (point.y - ctx.deps.camY) / ctx.deps.camZoom });
    ctx.deps.isDragging = false;
    ctx.deps.dragDist = 10; // Any multi-finger gesture remains ineligible for node selection until every finger lifts.
}

export function startDrag(ctx, point, gesture) {
    ctx.deps.isDragging = true;
    ctx.deps.dragStartX = point.clientX / ctx.deps.uiDisplay.factor - ctx.deps.camX;
    ctx.deps.dragStartY = point.clientY / ctx.deps.uiDisplay.factor - ctx.deps.camY;
    gesture.x = point.clientX; gesture.y = point.clientY;
}

export function moveTouch(ctx, event, canvas, gesture, handlers) {
    event.preventDefault();
    if (event.touches.length >= 2) {
        if (!gesture.distance) startPinch(ctx, canvas, event.touches, gesture);
        const point = pinchPoint(ctx, canvas, event.touches);
        if (!gesture.distance) return;
        ctx.deps.camZoom = (0, ctx.deps.clampNumber)(gesture.zoom * point.distance / gesture.distance, 0.09, 2.5);
        ctx.deps.camX = point.x - gesture.anchorX * ctx.deps.camZoom; ctx.deps.camY = point.y - gesture.anchorY * ctx.deps.camZoom;
        (0, ctx.deps.clampPassiveCamera)(); (0, ctx.deps.drawPassiveTree)(); handlers.hideTooltip();
        return;
    }
    if (!ctx.deps.isDragging || !event.touches.length) return;
    const point = event.touches[0];
    handlers.drag(point.clientX, point.clientY, point.clientX - gesture.x, point.clientY - gesture.y);
    gesture.x = point.clientX; gesture.y = point.clientY;
}

export function endTouch(ctx, event, canvas, gesture, handlers) {
    event.preventDefault();
    if (event.touches.length >= 2) return startPinch(ctx, canvas, event.touches, gesture);
    gesture.distance = 0;
    if (event.touches.length) return startDrag(ctx, event.touches[0], gesture);
    ctx.deps.isDragging = false;
    canvas.style.cursor = 'grab';
    if (gesture.pinched || ctx.deps.dragDist >= 10) return;
    const point = event.changedTouches[0];
    if (!point) return;
    ctx.deps.hoverNode = handlers.nodeAt(point);
    if (ctx.deps.hoverNode) touch(ctx, ctx.deps.hoverNode, point, handlers);
    else handlers.hideTooltip();
    (0, ctx.deps.drawPassiveTree)();
}

export function bindTouch(ctx, canvas, handlers, listen) {
    const gesture = { distance: 0, pinched: false, x: 0, y: 0 };
    listen(canvas, 'touchstart', event => {
        if (!event.touches.length) return;
        event.preventDefault();
        if (event.touches.length >= 2) {
            startPinch(ctx, canvas, event.touches, gesture);
            handlers.hideTooltip();
            return;
        }
        gesture.pinched = false; gesture.distance = 0; ctx.deps.dragDist = 0;
        startDrag(ctx, event.touches[0], gesture);
        ctx.deps.hoverNode = handlers.nodeAt(event.touches[0]);
        canvas.style.cursor = 'grabbing';
        }, { passive: false });
    listen(canvas, 'touchmove', event => moveTouch(ctx, event, canvas, gesture, handlers), { passive: false });
    listen(canvas, 'touchend', event => endTouch(ctx, event, canvas, gesture, handlers), { passive: false });
    listen(canvas, 'touchcancel', () => {
        ctx.deps.isDragging = false; gesture.distance = 0; gesture.pinched = true; ctx.deps.dragDist = 10; ctx.deps.hoverNode = null;
        canvas.style.cursor = 'grab'; (0, ctx.deps.drawPassiveTree)(); handlers.hideTooltip();
        }, { passive: false });
}

export function dispose(ctx) {
    hide(ctx);
    ctx.state.controls?.remove();
    ctx.state.controls = null;
}
