/** 자동 환생 (docs/atlas-endgame-20260930.md 5절): 루프 관문을 채우면 정산 화면에서 몇 초를 센 뒤 "루프 진행"을 대신 누르고,
 * 설정대로 다음 루프의 직업을 고른다(같은 직업 유지). 누르는 버튼과 같은 함수만 부르므로 보상 · 판정은 루프 코드 그대로다.
 * 직업 선택을 기다리는 저장을 불러오면 선택 창을 다시 연다 — 예전에는 창 없이 전투만 멈춘 채 남았다.
 * 화면이 떠 있는 동안에만 돈다: 오프라인 재생은 여전히 루프 관문에서 멈추고, 돌아오면 여기서 이어간다.
 */
const loopAutomationUi = (() => {
    const DELAY_MS = 5000, REOPEN_MS = 3000;
    let deadline = 0, reopenedAt = 0;
    const selectionOpen = () => !!document.getElementById('loop-hero-select-overlay')?.classList.contains('active');

    /** 다음 루프 직업: '같은 직업'이면 바로 고르고, 아니면 창이 열려 있는지만 챙긴다. */
    function heroSelection(now) {
        const classId = game.selectedClassId;
        if (game.settings.autoLoopClass === 'keep' && PLAYER_CLASS_DEFS[classId]) {
            if (selectionOpen()) return chooseLoopHero(classId);
            applyHeroSelection(classId, { silent: true, skipSave: true, alignTalent: true });
            return applyLoopHeroSelection(classId, classId);
        }
        if (selectionOpen() || now - reopenedAt < REOPEN_MS) return;
        reopenedAt = now;
        requestLoopHeroSelection({});
    }
    /** "루프 진행"과 같은 길: 경로가 둘이면 혼돈 루프를, 우주계만 채웠으면 우주계 루프를 고른다. */
    function advanceLoop() {
        if (game.pendingLoopReady) return confirmLoopReady();
        const paths = getAvailableLoopAdvancePaths(game.season || 1);
        if (paths.includes('chaos') || !paths.length) return chooseLoopAdvance(true);
        chooseLoopAdvancePath(paths[0]);
    }
    /** The loop screen is up, automation is on and nothing (the stall) blocks the reset. */
    const armed = () => !!(game.pendingLoopReady || game.pendingLoopDecision) && game.settings.autoLoop && !playerStall.loopBlockReason(game);
    function autoTick(now = Date.now()) {
        if (typeof game === 'undefined' || !game || !game.settings) return;
        if (game.pendingLoopHeroSelection) return heroSelection(now);
        if (!armed()) { deadline = 0; return showStatus(); }
        if (!deadline) deadline = now + DELAY_MS;
        if (now < deadline) return showStatus(now);
        deadline = 0;
        advanceLoop();
    }
    function showStatus(now = Date.now()) {
        const text = deadline ? `자동 환생까지 ${Math.max(0, Math.ceil((deadline - now) / 1000))}초` : '';
        document.querySelectorAll('[data-loop-auto-status]').forEach(node => { node.textContent = text; });
    }
    function setAuto(on) {
        game.settings.autoLoop = !!on;
        deadline = 0;
        queueImportantSave(200);
        loopSettlementUi.render();
    }
    function setClassMode(mode) {
        game.settings.autoLoopClass = mode === 'keep' ? 'keep' : 'ask';
        queueImportantSave(200);
        loopSettlementUi.render();
    }
    function controlsHtml() {
        const s = game.settings;
        return `<section class="loop-automation" aria-label="자동 환생"><label><input type="checkbox" ${s.autoLoop ? 'checked' : ''}
            onchange="loopAutomationUi.setAuto(this.checked)"> 자동 환생 <small>관문을 채우면 ${DELAY_MS / 1000}초 뒤 다음 루프로</small></label>
            <label>다음 직업 <select onchange="loopAutomationUi.setClassMode(this.value)"><option value="ask" ${s.autoLoopClass === 'keep' ? '' : 'selected'}>매번 고르기</option>
            <option value="keep" ${s.autoLoopClass === 'keep' ? 'selected' : ''}>같은 직업 유지</option></select></label>
            <p class="loop-automation-status" data-loop-auto-status aria-live="polite"></p></section>`;
    }
    if (typeof setInterval === 'function') setInterval(() => autoTick(), 500);
    return Object.freeze({ autoTick, advanceLoop, setAuto, setClassMode, controlsHtml });
})();
safeExposeGlobals({ loopAutomationUi });
