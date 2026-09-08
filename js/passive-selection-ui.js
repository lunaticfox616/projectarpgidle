// Reuses the tree's tooltip and activation controller; mobile selection never allocates a node.
const passiveSelectionUi = (() => {
    function hide() {
        const panel = document.getElementById('passive-mobile-detail');
        if (panel) panel.hidden = true;
    }

    function canAct(node, cost) {
        if (!game.passives.includes(node.id)) return cost > 0 && game.passivePoints >= cost;
        if (node.kind === 'void') return true;
        return canRefundPassiveNode(node.id) && game.currencies.blightSpore > 0;
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
            panel.setAttribute('aria-label', '선택한 패시브');
            document.getElementById('tab-char').appendChild(panel);
        }
        const owned = game.passives.includes(node.id);
        const path = getPassiveActivationPath(node.id);
        const cost = path.length;
        const crafting = owned && node.kind === 'void';
        const enabled = canAct(node, cost);
        const label = owned ? (crafting ? '공허 제작' : '노드 반환') : `${cost}포인트 사용`;
        panel.innerHTML = `<header><strong>선택한 패시브</strong><button type="button" data-passive-close>닫기</button></header><div class="passive-mobile-description">${tooltip.innerHTML}</div><footer><button type="button" data-passive-confirm ${enabled ? '' : 'disabled'}>${label}</button></footer>`;
        panel.hidden = false;
        panel.querySelector('[data-passive-close]').onclick = hide;
    }

    function touch(node, point, actions) {
        if (dragDist >= 10 || !node) return;
        if (uiDisplay.matches('(max-width: 1080px)') && !Number.isFinite(ensureStarWedgeState().selectedWedgeId)) {
            actions.preview(node, point.clientX, point.clientY);
            document.querySelector('[data-passive-confirm]').onclick = () => {
                hide(); actions.activate({ clientX: point.clientX, clientY: point.clientY });
            };
            return;
        }
        actions.activate({ fromTouch: true, clientX: point.clientX, clientY: point.clientY });
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
    return { present, hide, touch, bindTools };
})();
safeExposeGlobals({ passiveSelectionUi });
