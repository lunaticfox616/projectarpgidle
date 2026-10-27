// Presentation only: opening or closing the settlement never awards points or rewrites a loop.
/** The roadmap's per-loop stump line (data/maps.js, loop 2): the screen says this loop's count instead (loopSettlementUi.stumpCellLine). */
const LOOP_STUMP_ROADMAP_LINE = /^그루터기 함: 루프마다/;
const loopSettlementUi = {
    renderedKey: '',
    dismissedReadyLoop: 0,
    revealLoop: 0,
    revealStep: 3,
    freshTimer: 0,
    rolledLoop: 0,
    unlockRewardText() {
        const points = contentProgression.points();
        // 넘치는 해금 포인트는 그루터기 함 접붙이기 점수가 된다(contentProgression.overflow, js/stump-box.js graftEarned).
        const overflow = `넘치는 해금 포인트는 루프마다 그루터기 함 접붙이기 점수 +${CONTENT_UNLOCK_POINT_AWARDS.perLoop}가 됩니다.`;
        if (points.complete) return `전체 해금 완료. ${overflow}`;
        if (!points.nextAward) return `남은 해금에 필요한 포인트를 모두 모았습니다. ${overflow}`;
        return `해금 포인트 +${points.nextAward}`;
    },
    /** Three parts, shown one press at a time like the opening (2026-10-27 사용자: 이야기 / 루프 달성과 다음 루프 / 설정과 단추가 확실하게
     * 갈라지고 누를 때마다 한 칸씩): data-loop-section 1~3, the card's data-loop-step says how many show (reveal). The overlay's note and
     * buttons (index.html) are part 3. */
    summaryHtml() {
        const loop = game.season || 1;
        const record = game.records && game.records.currentLoop;
        const time = record ? formatRecordDuration(record.activeMs) : '기록 없음';
        return `<section class="loop-settlement-story" data-loop-section="1">${this.storyHtml()}</section>
            <section class="loop-settlement-result" data-loop-section="2"><h2 aria-label="루프 ${loop + 1} 달성">루프 <span class="loop-settlement-count${this.rolledLoop === loop ? ' is-rolled' : ''}" data-loop-count aria-hidden="true"><span><b>${loop}</b><b>${loop + 1}</b></span></span> 달성</h2>
            <dl class="loop-settlement-stats"><div><dt>도달 레벨</dt><dd>${game.level}</dd></div><div><dt>처치</dt><dd>${Number(game.loopKills || 0).toLocaleString()}</dd></div><div><dt>활동 시간</dt><dd>${time}</dd></div></dl>${this.barkHtml(loop)}
            <div class="loop-settlement-next"><ul>${this.nextLoopLines(loop).map(row => `<li class="is-${row.kind}">${escapeHTML(row.text).replace(/\+\d+/g, gain => `<b>${gain}</b>`)}</li>`).join('')}</ul></div>
            <p class="loop-settlement-reset">루프 시 레벨, 장비 및 재화를 포함한 대부분의 진행도가 초기화됩니다.</p></section>
            <section class="loop-settlement-controls" data-loop-section="3">${this.stallWarningHtml()}${loopAutomationUi.controlsHtml()}</section>
            <button type="button" class="loop-settlement-continue" data-loop-continue>눌러서 계속</button>`;
    },
    /** What the next loop brings (2026-10-27 사용자: 짧게), each with its kind for its colour (css/ui-polish.css .loop-settlement-next):
     * unlock points, the stump box's next cell, the loop point, the roadmap lines, the next loop's mutations. */
    nextLoopLines(loop) {
        const roadmap = game.contentProgression ? this.milestoneLines(loop + 1)
            : (SEASON_CONTENT_ROADMAP[loop + 1] || { features: ['심화 도전을 이어갑니다.'] }).features.filter(text => !LOOP_STUMP_ROADMAP_LINE.test(text));
        return [
            { kind: 'unlock', text: game.contentProgression ? this.unlockRewardText() : '' },
            { kind: 'stump', text: this.stumpCellLine() },
            { kind: 'loop', text: `루프 포인트 +1${this.loopPointLockText()}` },
            ...roadmap.map(text => ({ kind: 'road', text })),
            ...loopMutationUi.nextLoopLines(loop + 1).map(text => ({ kind: 'mutation', text }))
        ].filter(row => row.text);
    },
    /** The stump box's cells the next loop opens (js/stump-box.js openCount: one a loop up to 25), none before the box or at 25. */
    stumpCellLine() {
        const now = stumpBox.openCount(game), next = stumpBox.openCount({ ...game, season: (game.season || 1) + 1 });
        return next > now ? `그루터기 함 슬롯 +${next - now} (현재 ${now}칸)` : '';
    },
    /** Until 루프 패시브 is bought the loop point only piles up (2026-10-27). */
    loopPointLockText() {
        return game.contentProgression && !contentProgression.isUnlocked('loopTree') ? ' (해금 후 사용 가능)' : '';
    },
    /** The loop's close (data/story-journal.js STORY_LOOP_MILESTONES.default): the narration only. Its woodsman line is not shown
     * (2026-10-27 사용자: 지금 이야기와 맞지 않는다); the story pack keeps the field. */
    storyHtml() {
        return `<p>${STORY_LOOP_MILESTONES.default.narration.map(escapeHTML).join('<br>')}</p>`;
    },
    /** A new loop's screen shows part 1 (all three with 자동 루프 진행 on: its countdown is in part 3); the same loop drawn again keeps
     * its step. */
    startReveal() {
        if (this.revealLoop === game.season) return false;
        this.revealLoop = game.season;
        this.revealStep = game.settings.autoLoop ? 3 : 1;
        return true;
    },
    /** fresh: the part that fades in now ('1', '2', '3' or 'all'), cleared once it has (a redraw does not fade it again). */
    showReveal(fresh) {
        const cards = document.querySelectorAll('#loop-ready-overlay .loop-settlement-card, #loop-decision-overlay .loop-settlement-card');
        cards.forEach(card => {
            card.dataset.loopStep = String(this.revealStep);
            if (fresh) card.dataset.loopFresh = fresh;
        });
        if (!fresh) return;
        clearTimeout(this.freshTimer);
        this.freshTimer = setTimeout(() => cards.forEach(card => delete card.dataset.loopFresh), 800);
    },
    /** A press on the card shows the next part; presses on its controls stay theirs (눌러서 계속 is the keyboard's way). */
    advanceReveal(event) {
        if (this.revealStep >= 3) return;
        if (!event.target.closest('[data-loop-continue]') && event.target.closest('button, select, input, label, a, summary')) return;
        this.revealStep += 1;
        this.showReveal(String(this.revealStep));
        if (this.revealStep === 2) this.rollLoop();
        // 새로 나타난 칸의 끝(셋째 칸이면 단추 줄)이 카드 안에 보이게 내린다
        const card = event.currentTarget.querySelector('.loop-settlement-card');
        const parts = card ? card.querySelectorAll(`[data-loop-section="${this.revealStep}"]`) : [];
        if (parts.length) parts[parts.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        card?.querySelector('[data-loop-continue]')?.focus({ preventScroll: true });
    },
    /** 제목의 루프 숫자가 지금 루프에서 들어갈 루프로 한 번 굴러 바뀐다(2026-10-27 사용자: 루프 1을 끝내면 "루프 2 달성", 1에서 2로 바뀌는
     * 연출): 둘째 칸이 나타나고 지금 번호를 잠깐 보인 뒤 위로 민다(css/ui-polish.css .loop-settlement-count). 한 루프에 한 번이고, 그 뒤로
     * 다시 그린 화면은 들어갈 번호로 그린다. 그 아래 목록이 들어갈 루프에서 생기는 것이라 "다음 루프 N" 제목줄은 없다. */
    rollLoop() {
        if (this.rolledLoop === game.season) return;
        this.rolledLoop = game.season;
        const roll = () => document.querySelectorAll('.loop-settlement-card [data-loop-count]').forEach(node => node.classList.add('is-rolled'));
        if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) roll();
        else setTimeout(roll, 650);
    },
    /** 세계수 껍질 the hero wears at this loop (data/maps.js WORLD_TREE_BARK), nothing before loop 55. */
    barkHtml(loop) {
        const layers = getWorldTreeBarkLayers(loop);
        return layers ? `<p class="loop-settlement-bark">세계수 껍질 ${layers}겹: 최대 생명력 +${layers * WORLD_TREE_BARK.pctHp}%, 받는 피해 -${layers * WORLD_TREE_BARK.taken}%</p>` : '';
    },
    /** What the next loop adds beside unlock points (the unlock map's roadmap lines), only that loop's: the nearest milestone ahead
     * ("루프 N까지 M루프 남음") is not shown (2026-10-27 사용자). */
    milestoneLines(next) {
        return contentUnlockUi.roadmapAdditions(next).filter(text => !LOOP_STUMP_ROADMAP_LINE.test(text));
    },
    /** A loop button that resets at once (loop-10 panel): disabled until ready, and while the stall still holds gear or dew or the hall shows an original. */
    resetButtonAttr(ready) {
        return ready && !getHeldGearLoopBlockReason() ? '' : 'disabled';
    },
    /** A refused loop click flashes the warning: toasts are hidden while the loop screen is up. */
    nudgeStallWarning() {
        document.querySelectorAll('.loop-settlement-warning').forEach(node => {
            node.classList.remove('is-nudged');
            node.getBoundingClientRect(); // restart the animation
            node.classList.add('is-nudged');
        });
    },
    /** Gear or dew left on the stall, or an original on show in the hall, blocks the reset (triggerSeasonReset): say so where the loop button is. */
    stallWarningHtml() {
        const reason = getHeldGearLoopBlockReason();
        return reason ? `<p class="loop-settlement-warning" role="alert">${escapeHTML(reason)}</p>` : '';
    },
    render() {
        const ready = !!game.pendingLoopReady;
        const decision = !!game.pendingLoopDecision;
        const overlay = document.getElementById('loop-ready-overlay');
        if (!overlay) return;
        overlay.classList.toggle('active', ready && this.dismissedReadyLoop !== game.season);
        document.getElementById('loop-decision-overlay').classList.toggle('active', decision);
        if (!ready && !decision) { this.renderedKey = ''; this.dismissedReadyLoop = 0; return; }
        const key = `${game.season}:${ready}:${decision}:${this.unlockRewardText()}:${getHeldGearLoopBlockReason()}:${game.settings.autoLoop}:${game.settings.autoLoopClass}`;
        if (key === this.renderedKey) return;
        // A new loop's summary starts at its top: shown again, the cards came back at the last loop's scroll spot.
        if (!this.renderedKey.startsWith(`${game.season}:`)) document.querySelectorAll('#loop-ready-overlay .tutorial-card, #loop-decision-overlay .tutorial-card').forEach(card => card.scrollTo(0, 0));
        this.renderedKey = key;
        const html = this.summaryHtml();
        document.getElementById('loop-ready-summary').innerHTML = html;
        document.getElementById('loop-decision-summary').innerHTML = html;
        this.showFreshReveal();
    },
    /** After a redraw: a new loop's screen starts its reveal (part 1, or all three with 자동 루프 진행 on); the same loop keeps its step. */
    showFreshReveal() {
        if (!this.startReveal()) return this.showReveal('');
        this.showReveal(this.revealStep === 3 ? 'all' : '1');
        if (this.revealStep >= 2) this.rollLoop();
    },
    organize() {
        this.dismissedReadyLoop = game.season;
        this.render();
        switchTab('tab-items');
        // When the stall or the hall is what blocks the loop, open it directly.
        if (playerStall.loopBlockReason(game)) { switchItemSubtab('item-tab-market'); marketUi.show('stall'); }
        else if (getHeldGearLoopBlockReason()) switchItemSubtab('item-tab-hall'); // 장비 전당에 전시한 원본
    },
    reopen() {
        this.dismissedReadyLoop = 0;
        this.render();
    }
};

['loop-ready-overlay', 'loop-decision-overlay'].forEach(id => document.getElementById(id)?.addEventListener('click', event => loopSettlementUi.advanceReveal(event)));

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

    function requestManualLoopAdvanceConfirmation() {
        // The reset would be refused anyway: show why instead of asking to confirm.
        const stallReason = getHeldGearLoopBlockReason();
        if (stallReason) {
            if (typeof addLog === 'function') addLog(stallReason, 'attack-monster', { toast: true });
            loopSettlementUi.nudgeStallWarning();
            return Promise.resolve(false);
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
