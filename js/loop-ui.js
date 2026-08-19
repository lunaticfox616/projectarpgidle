(function () {
    'use strict';

    function canShowCombatLoopAdvanceButton() {
        if (game && (game.pendingLoopReady || game.pendingLoopDecision)) return true;
        if (!game || (game.season || 1) < 10) return false;
        return typeof hasCurrentLoopAbyssRequirementClear === 'function'
            ? hasCurrentLoopAbyssRequirementClear(game.season || 1)
            : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared);
    }

    function getLoopPathUiState() {
        let season = game ? (game.season || 1) : 1;
        let chaosReady = typeof hasCurrentLoopChaosRequirementClear === 'function'
            ? hasCurrentLoopChaosRequirementClear(season)
            : (typeof hasCurrentLoopAbyssRequirementClear === 'function' && hasCurrentLoopAbyssRequirementClear(season));
        let cosmosReady = typeof hasCurrentLoopCosmosRequirementClear === 'function'
            ? hasCurrentLoopCosmosRequirementClear(season)
            : false;
        return { chaosReady, cosmosReady, showPathChoices: season >= 31 && cosmosReady };
    }

    function updateLoopDecisionOverlayUi() {
        let state = getLoopPathUiState();
        let body = document.getElementById('loop-decision-body');
        if (body) body.innerText = state.showPathChoices
            ? '다음 루프로 사용할 경로를 선택하거나, 이번 루프를 유지하고 심화 등반을 계속하세요.'
            : '다음 루프로 즉시 넘어갈지, 이번 루프를 유지하고 심화 등반을 계속할지 선택하세요.';
        let genericBtn = document.getElementById('loop-decision-generic-btn');
        let chaosBtn = document.getElementById('loop-decision-chaos-btn');
        let cosmosBtn = document.getElementById('loop-decision-cosmos-btn');
        if (genericBtn) genericBtn.style.display = state.showPathChoices ? 'none' : '';
        if (chaosBtn) {
            chaosBtn.style.display = state.showPathChoices ? '' : 'none';
            chaosBtn.disabled = !state.chaosReady;
        }
        if (cosmosBtn) {
            cosmosBtn.style.display = state.showPathChoices ? '' : 'none';
            cosmosBtn.disabled = !state.cosmosReady;
        }
    }

    function requestManualLoopAdvanceConfirmation() {
        return requestGameConfirmation(
            '정말 지금 루프하시겠습니까?\n현재 루프를 정산하고 다음 루프로 이동합니다.',
            { title: '루프 진행 확인', tone: 'danger', confirmLabel: '루프 진행',
                cancelLabel: '취소', dismissOnBackdrop: false }
        );
    }

    async function handleLoopDecisionAdvanceButton(path) {
        if (!game || !game.pendingLoopDecision) return;
        let selectedPath = path === 'chaos' || path === 'cosmos' ? path : null;
        if (!await requestManualLoopAdvanceConfirmation()) return;
        if (!game || !game.pendingLoopDecision) return;
        if (selectedPath) chooseLoopAdvancePath(selectedPath);
        else chooseLoopAdvance(true);
    }

    function openLoopPathChoice() {
        game.pendingLoopDecision = true;
        let overlay = document.getElementById('loop-decision-overlay');
        if (overlay) overlay.classList.toggle('active', true);
        updateLoopDecisionOverlayUi();
        if (typeof addLog === 'function') addLog('진행할 루프 경로를 선택하세요.', 'season-up');
    }

    async function handleCombatLoopAdvanceButton() {
        if (game && game.pendingLoopReady && typeof confirmLoopReady === 'function') {
            let available = typeof getAvailableLoopAdvancePaths === 'function'
                ? getAvailableLoopAdvancePaths(game.season || 1) : [];
            if (available.length > 1) return confirmLoopReady();
            if (!await requestManualLoopAdvanceConfirmation() || !game.pendingLoopReady) return;
            confirmLoopReady();
            return;
        }
        if (game && game.pendingLoopDecision && typeof chooseLoopAdvance === 'function') {
            await handleLoopDecisionAdvanceButton();
            return;
        }
        if (canShowCombatLoopAdvanceButton() && typeof triggerSeasonReset === 'function') {
            let available = typeof getAvailableLoopAdvancePaths === 'function'
                ? getAvailableLoopAdvancePaths(game.season || 1) : [];
            if (available.length > 1) return openLoopPathChoice();
            let season = game.season || 1;
            if (!await requestManualLoopAdvanceConfirmation()) return;
            if (!game || (game.season || 1) !== season || !canShowCombatLoopAdvanceButton()) return;
            triggerSeasonReset();
            return;
        }
        if (typeof addLog === 'function') addLog('아직 루프 진행 조건을 달성하지 못했습니다.', 'attack-monster');
    }

    safeExposeGlobals({ canShowCombatLoopAdvanceButton, updateLoopDecisionOverlayUi,
        handleCombatLoopAdvanceButton, handleLoopDecisionAdvanceButton });
}());
