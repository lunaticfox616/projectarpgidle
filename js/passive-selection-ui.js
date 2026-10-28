// Reuses the tree's tooltip and activation controller; mobile selection never allocates a node.
const passiveSelectionUi = (() => {
    let selection = null;
    /** 따라 하기 안내가 트리 캔버스와 상세의 "포인트 사용" 단추 사이로 표시를 옮긴다. */
    function refreshGuide() {
        if (typeof tutorialActionUi === 'object') tutorialActionUi.refresh();
    }

    function hide() {
        selection = null;
        const panel = document.getElementById('passive-mobile-detail');
        if (panel) panel.hidden = true;
        refreshGuide();
    }

    /** 확인 단추 글씨: 가진 노드는 반환(공허는 제작), 직업 시작점은 늘 열린 출발점, 나머지는 드는 포인트. */
    function confirmLabel(node, owned, cost) {
        if (owned) return node.kind === 'void' ? '공허 제작' : '노드 반환 (포자 1개)';
        return node.kind === 'start' ? '시작점, 이미 열림' : `${cost}포인트 사용`;
    }

    function canAct(node, cost) {
        if (game.passives.includes(node.id) && node.kind === 'void') return true;
        if (game.woodsmanBuildLock) return false;
        if (!game.passives.includes(node.id)) return cost > 0 && game.passivePoints >= cost;
        return canRefundPassiveNode(node.id) && game.currencies.blightSpore > 0;
    }

    function actionHint(node, owned, cost) {
        if (owned && node.kind === 'void') return '할당한 공허의 옵션을 확인하고 제작합니다.';
        if (game.woodsmanBuildLock) return '나무꾼 전투 중에는 스킬트리를 변경할 수 없습니다.';
        if (node.kind === 'start') return '시작점은 무료입니다.';
        if (owned) return refundHint(node);
        if (!cost) return '먼저 연결된 노드를 할당해 주세요.';
        return `필요 ${cost}포인트, 보유 ${game.passivePoints}포인트${game.passivePoints < cost ? ', 포인트 부족' : ''}`;
    }

    function refundHint(node) {
        if (!canRefundPassiveNode(node.id)) return '연결이나 포인트 한도 유지에 필요한 노드입니다.';
        return `반환 비용: 마름병 포자 1개, 보유 ${game.currencies.blightSpore || 0}개`;
    }

    /** Keep the canvas density bounded on phones while preserving UI-scale coordinate and text mapping. */
    function pixelRatio() {
        const deviceDpr = window.devicePixelRatio || 1;
        return Math.max(1, (uiDisplay.matches('(max-width: 1080px)') ? Math.min(2, deviceDpr) : deviceDpr) * uiDisplay.factor);
    }

    function pathNodeDescription(id, index) {
        const node = PASSIVE_TREE.nodes[id];
        const name = getPassiveNodeDisplayName(node);
        const effect = node.kind === 'attribute' ? '힘, 민첩, 지능 중 다음 단계에서 선택'
            : normalizePassiveTooltipText(getPassiveEffectLabel(node).replace(/<br\s*\/?>/gi, ' / '));
        const description = effect.startsWith(name + ' ') ? effect : `${name}${effect ? '\n' + effect : ''}`;
        return `${index + 1}. ${description}`;
    }

    /** Show the same node descriptions as the tree, not a guessed final character-stat total. */
    function confirmPath(node, path) {
        const notes = [];
        if (path.some(id => PASSIVE_TREE.nodes[id].kind === 'attribute')) {
            notes.push('능력치 노드는 다음 단계에서 선택하며, 선택을 취소하면 포인트를 쓰지 않습니다.');
        }
        if (path.some(id => PASSIVE_TREE.nodes[id].activationRequirement || PASSIVE_TREE.nodes[id].connectedDevotionPenalty)) {
            notes.push('조건부 효과와 연결 보정은 현재 투자 상태 기준입니다.');
        }
        const message = ['함께 활성화할 노드', ...path.map(pathNodeDescription), ...notes].join('\n\n');
        return requestGameConfirmation(message, {
            title: `${getPassiveNodeDisplayName(node)}까지 활성화`,
            kicker: `최단 경로 노드 ${path.length}개`,
            confirmLabel: `${path.length}포인트 사용`
        });
    }

    function present(node, tooltip, position) {
        if (!uiDisplay.matches('(max-width: 1080px)')) {
            invalidateTooltipSize(tooltip); tooltip.style.display = 'block';
            positionTooltipElement(tooltip, position.x, position.y); setActiveTooltip('canvas-tooltip'); return;
        }
        tooltip.style.display = 'none'; clearActiveTooltip('canvas-tooltip');
        let panel = document.getElementById('passive-mobile-detail');
        if (!panel) {
            panel = document.createElement('section'); panel.id = 'passive-mobile-detail';
            panel.setAttribute('aria-label', '선택한 노드');
            document.getElementById('tab-char').appendChild(panel);
        }
        const owned = game.passives.includes(node.id);
        const path = getPassiveActivationPath(node.id);
        const cost = path.length;
        const enabled = canAct(node, cost);
        const label = confirmLabel(node, owned, cost);
        panel.dataset.nodeId = node.id;
        panel.innerHTML = `<header><strong>선택한 노드</strong><button type="button" data-passive-close aria-label="노드 설명 닫기">닫기</button></header><div class="passive-mobile-description">${tooltip.innerHTML}</div><footer><p id="passive-mobile-action-hint" role="status">${actionHint(node, owned, cost)}</p><button type="button" data-passive-confirm aria-describedby="passive-mobile-action-hint" ${enabled ? '' : 'disabled'}>${label}</button></footer>`;
        panel.hidden = false;
        panel.querySelector('[data-passive-close]').onclick = hide;
        panel.querySelector('[data-passive-confirm]').onclick = confirmSelection;
        refreshGuide();
    }

    async function confirmSelection() {
        const current = selection;
        if (!current) return;
        const panel = document.getElementById('passive-mobile-detail');
        const button = panel.querySelector('[data-passive-confirm]');
        if (panel.hidden || button.disabled) return;
        button.disabled = true;
        hide();
        await current.actions.activate({ nodeId: current.node.id, ...current.point });
    }

    function touch(node, point, actions) {
        if (dragDist >= 10 || !node) return;
        if (uiDisplay.matches('(max-width: 1080px)')) {
            selection = { node, point: { clientX: point.clientX, clientY: point.clientY }, actions };
            actions.preview(node, point.clientX, point.clientY);
            return;
        }
        actions.activate({ fromTouch: true, nodeId: node.id, clientX: point.clientX, clientY: point.clientY });
    }
    function bindTools() {
        const toolbar = document.querySelector('.passive-tree-toolbar');
        toolbar.addEventListener('click', event => {
            if (!uiDisplay.matches('(max-width: 1080px)')) return;
            const trigger = event.target.closest('summary, .passive-investment-summary-toggle');
            if (!trigger) return;
            hide();
            for (const drawer of toolbar.querySelectorAll('details')) {
                if (!drawer.contains(trigger)) drawer.open = false;
            }
            if (trigger.tagName === 'SUMMARY') {
                game.settings.passiveInvestmentSummaryCollapsed = true;
                renderPassiveInvestmentSummary();
            }
        }, true);
        bindCameraTools();
    }

    function bindCameraTools() {
        const container = document.getElementById('tree-container');
        const controls = document.createElement('nav');
        controls.className = 'passive-mobile-camera';
        controls.setAttribute('aria-label', '스킬트리 화면 조절');
        controls.innerHTML = '<button type="button" data-tree-view="out" aria-label="스킬트리 축소">−</button><button type="button" data-tree-view="fit">내 트리</button><button type="button" data-tree-view="in" aria-label="스킬트리 확대">+</button>';
        controls.addEventListener('click', event => {
            const button = event.target.closest('[data-tree-view]');
            if (!button) return;
            hide();
            if (button.dataset.treeView === 'fit') fitPassiveCameraToBounds(true);
            else {
                const zoom = clampNumber(camZoom * (button.dataset.treeView === 'in' ? 1.3 : 1 / 1.3), 0.09, 2.5);
                camX *= zoom / camZoom; camY *= zoom / camZoom; camZoom = zoom;
                clampPassiveCamera();
            }
            drawPassiveTree();
        });
        container.appendChild(controls);
    }

    /** Touch positions use the same CSS coordinate space as the canvas camera, including the UI display scale. */
    function pinchPoint(canvas, touches) {
        const rect = canvas.getBoundingClientRect();
        return {
            distance: Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY),
            x: ((touches[0].clientX + touches[1].clientX) / 2 - rect.left) * canvas.clientWidth / rect.width - canvas.clientWidth / 2,
            y: ((touches[0].clientY + touches[1].clientY) / 2 - rect.top) * canvas.clientHeight / rect.height - canvas.clientHeight / 2
        };
    }

    function startPinch(canvas, touches, gesture) {
        const point = pinchPoint(canvas, touches);
        Object.assign(gesture, { pinched: true, distance: point.distance, zoom: camZoom,
            anchorX: (point.x - camX) / camZoom, anchorY: (point.y - camY) / camZoom });
        isDragging = false;
        dragDist = 10; // Any multi-finger gesture remains ineligible for node selection until every finger lifts.
    }

    function startDrag(point, gesture) {
        isDragging = true;
        dragStartX = point.clientX / uiDisplay.factor - camX;
        dragStartY = point.clientY / uiDisplay.factor - camY;
        gesture.x = point.clientX; gesture.y = point.clientY;
    }

    function moveTouch(event, canvas, gesture, handlers) {
        event.preventDefault();
        if (event.touches.length >= 2) {
            if (!gesture.distance) startPinch(canvas, event.touches, gesture);
            const point = pinchPoint(canvas, event.touches);
            if (!gesture.distance) return;
            camZoom = clampNumber(gesture.zoom * point.distance / gesture.distance, 0.09, 2.5);
            camX = point.x - gesture.anchorX * camZoom; camY = point.y - gesture.anchorY * camZoom;
            clampPassiveCamera(); drawPassiveTree(); handlers.hideTooltip();
            return;
        }
        if (!isDragging || !event.touches.length) return;
        const point = event.touches[0];
        handlers.drag(point.clientX, point.clientY, point.clientX - gesture.x, point.clientY - gesture.y);
        gesture.x = point.clientX; gesture.y = point.clientY;
    }

    function endTouch(event, canvas, gesture, handlers) {
        event.preventDefault();
        if (event.touches.length >= 2) return startPinch(canvas, event.touches, gesture);
        gesture.distance = 0;
        if (event.touches.length) return startDrag(event.touches[0], gesture);
        isDragging = false;
        canvas.style.cursor = 'grab';
        if (gesture.pinched || dragDist >= 10) return;
        const point = event.changedTouches[0];
        if (!point) return;
        hoverNode = handlers.nodeAt(point);
        if (hoverNode) touch(hoverNode, point, handlers);
        else handlers.hideTooltip();
        drawPassiveTree();
    }

    function bindTouch(canvas, handlers) {
        const gesture = { distance: 0, pinched: false, x: 0, y: 0 };
        canvas.addEventListener('touchstart', event => {
            if (!event.touches.length) return;
            event.preventDefault();
            if (event.touches.length >= 2) {
                startPinch(canvas, event.touches, gesture);
                handlers.hideTooltip();
                return;
            }
            gesture.pinched = false; gesture.distance = 0; dragDist = 0;
            startDrag(event.touches[0], gesture);
            hoverNode = handlers.nodeAt(event.touches[0]);
            canvas.style.cursor = 'grabbing';
        }, { passive: false });
        canvas.addEventListener('touchmove', event => moveTouch(event, canvas, gesture, handlers), { passive: false });
        canvas.addEventListener('touchend', event => endTouch(event, canvas, gesture, handlers), { passive: false });
        canvas.addEventListener('touchcancel', () => {
            isDragging = false; gesture.distance = 0; gesture.pinched = true; dragDist = 10; hoverNode = null;
            canvas.style.cursor = 'grab'; drawPassiveTree(); handlers.hideTooltip();
        }, { passive: false });
    }
    return { present, hide, touch, bindTools, confirmPath, bindTouch, pixelRatio };
})();
safeExposeGlobals({ passiveSelectionUi });
