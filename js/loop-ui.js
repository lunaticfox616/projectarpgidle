// Presentation only: opening or closing the settlement never awards points or rewrites a loop.
const loopSettlementUi = {
    renderedKey: '',
    dismissedReadyLoop: 0,
    unlockRewardText() {
        const points = contentProgression.points();
        if (points.complete) return '전체 해금 완료';
        if (!points.nextAward) return '남은 해금에 필요한 포인트를 모두 모았습니다.';
        return `해금 포인트 +${points.nextAward} · 해금 탭에서 다음 콘텐츠를 직접 선택하세요.`;
    },
    summaryHtml() {
        const loop = game.season || 1;
        const record = game.records && game.records.currentLoop;
        const time = record ? formatRecordDuration(record.activeMs) : '기록 없음';
        const features = game.contentProgression ? [this.unlockRewardText()]
            : (SEASON_CONTENT_ROADMAP[loop + 1] || { features: ['심화 도전을 이어갑니다.'] }).features;
        return `<p class="loop-settlement-story">발밑의 뿌리가 잠잠해집니다.<br>당신이 지나온 길 위로, 새로운 가지가 뻗어 나갑니다.</p>
            <h2>루프 ${loop} 달성</h2>
            <dl class="loop-settlement-stats"><div><dt>도달 레벨</dt><dd>${game.level}</dd></div><div><dt>처치</dt><dd>${Number(game.loopKills || 0).toLocaleString()}</dd></div><div><dt>활동 시간</dt><dd>${time}</dd></div></dl>
            <section class="loop-settlement-next"><h3>다음 루프 · ${loop + 1}</h3><ul>${features.map(row => `<li>${escapeHTML(row)}</li>`).join('')}</ul><p>진행 시 루프 포인트 1점 획득</p></section>`;
    },
    render() {
        const ready = !!game.pendingLoopReady;
        const decision = !!game.pendingLoopDecision;
        const overlay = document.getElementById('loop-ready-overlay');
        if (!overlay) return;
        overlay.classList.toggle('active', ready && this.dismissedReadyLoop !== game.season);
        document.getElementById('loop-decision-overlay').classList.toggle('active', decision);
        if (!ready && !decision) { this.renderedKey = ''; this.dismissedReadyLoop = 0; return; }
        const key = `${game.season}:${ready}:${decision}:${this.unlockRewardText()}`;
        if (key === this.renderedKey) return;
        this.renderedKey = key;
        const html = this.summaryHtml();
        document.getElementById('loop-ready-summary').innerHTML = html;
        document.getElementById('loop-decision-summary').innerHTML = html;
    },
    organize() {
        this.dismissedReadyLoop = game.season;
        this.render();
        switchTab('tab-items');
    },
    reopen() {
        this.dismissedReadyLoop = 0;
        this.render();
    }
};

(function () {
    'use strict';

    function canShowCombatLoopAdvanceButton() {
        if (game && (game.pendingLoopReady || game.pendingLoopDecision)) return true;
        if (!game) return false;
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
        loopSettlementUi.render();
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

    async function requestManualLoopAdvanceConfirmation() {
        if (!bountyRuntime.canAdvanceLoop()) {
            await bountyUi.openTreasure();
            return false;
        }
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
