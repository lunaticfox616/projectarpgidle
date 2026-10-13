// Reuses the tree's tooltip and activation controller; mobile selection never allocates a node.
const passiveSelectionUi = (() => {
    /** 따라 하기 안내가 트리 캔버스와 상세의 "포인트 사용" 단추 사이로 표시를 옮긴다. */
    function refreshGuide() {
        if (typeof tutorialActionUi === 'object') tutorialActionUi.refresh();
    }

    function hide() {
        const panel = document.getElementById('passive-mobile-detail');
        if (panel) panel.hidden = true;
        refreshGuide();
    }

    /** 확인 단추 글씨: 가진 노드는 반환(공허는 제작), 직업 시작점은 늘 열린 출발점, 나머지는 드는 포인트. */
    function confirmLabel(node, owned, cost) {
        if (owned) return node.kind === 'void' ? '공허 제작' : '노드 반환';
        return node.kind === 'start' ? '시작점, 이미 열림' : `${cost}포인트 사용`;
    }

    function canAct(node, cost) {
        if (!game.passives.includes(node.id)) return cost > 0 && game.passivePoints >= cost;
        if (node.kind === 'void') return true;
        return canRefundPassiveNode(node.id) && game.currencies.blightSpore > 0;
    }

    function pathNodeDescription(id, index) {
        const node = PASSIVE_TREE.nodes[id];
        const name = getPassiveNodeDisplayName(node);
        const effect = node.kind === 'attribute' ? '힘·민첩·지능 중 다음 단계에서 선택'
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
            kicker: `최단 경로 · ${path.length}개 노드`,
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
        panel.innerHTML = `<header><strong>선택한 노드</strong><button type="button" data-passive-close>닫기</button></header><div class="passive-mobile-description">${tooltip.innerHTML}</div><footer><button type="button" data-passive-confirm ${enabled ? '' : 'disabled'}>${label}</button></footer>`;
        panel.hidden = false;
        panel.querySelector('[data-passive-close]').onclick = hide;
        refreshGuide();
    }

    function touch(node, point, actions) {
        if (dragDist >= 10 || !node) return;
        if (uiDisplay.matches('(max-width: 1080px)')) {
            actions.preview(node, point.clientX, point.clientY);
            document.querySelector('[data-passive-confirm]').onclick = () => {
                if (document.getElementById('passive-mobile-detail').hidden) return;
                hide(); return actions.activate({ nodeId: node.id, clientX: point.clientX, clientY: point.clientY });
            };
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
    }
    return { present, hide, touch, bindTools, confirmPath };
})();
safeExposeGlobals({ passiveSelectionUi });
