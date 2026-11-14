/** 다음 루프 직업: '같은 직업'이면 바로 고르고, 아니면 창이 열려 있는지만 챙긴다. */
export function heroSelection(runtime, now) {
    const classId = runtime.deps.game.selectedClassId;
    if (runtime.deps.game.settings.autoLoopClass === 'keep' && runtime.deps.PLAYER_CLASS_DEFS[classId]) {
        if (selectionOpen(runtime)) return (0, runtime.deps.chooseLoopHero)(classId);
        (0, runtime.deps.applyHeroSelection)(classId, { silent: true, skipSave: true, alignTalent: true });
        runtime.deps.basicSkills.grant(runtime.deps.game, classId, runtime.deps.basicSkills.autoPick(runtime.deps.game)); // as the class window's element step does (same element when offered)
        return (0, runtime.deps.applyLoopHeroSelection)(classId, classId);
    }
    if (selectionOpen(runtime) || now - runtime.state.reopenedAt < runtime.state.REOPEN_MS) return;
    runtime.state.reopenedAt = now;
    (0, runtime.deps.requestLoopHeroSelection)({});
}

/** "루프 진행"과 같은 길: 경로가 둘이면 혼돈 루프를, 우주계만 채웠으면 우주계 루프를 고른다. */
export function advanceLoop(runtime) {
    if (!runtime.active) return;
    if (runtime.deps.game.pendingLoopReady) return (0, runtime.deps.confirmLoopReady)();
    const paths = (0, runtime.deps.getAvailableLoopAdvancePaths)(runtime.deps.game.season || 1);
    if (paths.includes('chaos') || !paths.length) return (0, runtime.deps.chooseLoopAdvance)(true);
    (0, runtime.deps.chooseLoopAdvancePath)(paths[0]);
}

export function autoTick(runtime, now = runtime.deps.Date.now()) {
    if (!syncAutomationOwner(runtime)) return;
    if (!screenFree(runtime)) { runtime.state.deadline = 0; return; }
    if (runtime.deps.game.pendingLoopHeroSelection) return heroSelection(runtime, now);
    if (!armed(runtime)) { runtime.state.deadline = 0; return showStatus(runtime); }
    if (!runtime.state.deadline) runtime.state.deadline = now + runtime.state.DELAY_MS;
    if (now < runtime.state.deadline) return showStatus(runtime, now);
    runtime.state.deadline = 0;
    advanceLoop(runtime);
}

function syncAutomationOwner(runtime) {
    const owner = runtime.deps.game;
    if (!runtime.active || !owner || !owner.settings) return false;
    if (runtime.state.owner === owner && runtime.state.season === owner.season) return true;
    runtime.state.owner = owner;
    runtime.state.season = owner?.season;
    runtime.state.deadline = 0;
    runtime.state.reopenedAt = 0;
    return true;
}

export function showStatus(runtime, now = runtime.deps.Date.now()) {
    const offline = runtime.deps.game.loopGateOffline && runtime.deps.game.settings.autoLoop ? '오프라인에서 채운 관문이라 자동으로 넘기지 않습니다.' : '';
    const text = runtime.state.deadline ? (0, runtime.deps._t)('자동 루프 진행까지 {max}초', { max: Math.max(0, Math.ceil((runtime.state.deadline - now) / 1000)) }) : offline;
    runtime.deps.document.querySelectorAll('[data-loop-auto-status]').forEach(node => { node.textContent = text; });
}

export function setAuto(runtime, on) {
    runtime.deps.game.settings.autoLoop = !!on;
    runtime.state.deadline = 0;
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.loopSettlementUi.render();
}

export function setClassMode(runtime, mode) {
    runtime.deps.game.settings.autoLoopClass = mode === 'keep' ? 'keep' : 'ask';
    (0, runtime.deps.queueImportantSave)(200);
    runtime.deps.loopSettlementUi.render();
}

export function controlsHtml(runtime) {
    const s = runtime.deps.game.settings;
    return `<section class="loop-automation" aria-label="${(0, runtime.deps._t)('자동 루프 진행')}"><label><input type="checkbox" ${s.autoLoop ? 'checked' : ''}
            onchange="loopAutomationUi.setAuto(this.checked)"> ${(0, runtime.deps._t)('자동 루프 진행')} <small>${(0, runtime.deps._t)('조건 달성 시 {value}초 후 자동으로 루프합니다.', { value: runtime.state.DELAY_MS / 1000 })}</small></label>
            <label>${(0, runtime.deps._t)('다음 직업')} <select onchange="loopAutomationUi.setClassMode(this.value)"><option value="ask" ${s.autoLoopClass === 'keep' ? '' : 'selected'}>${(0, runtime.deps._t)('매번 고르기')}</option>
            <option value="keep" ${s.autoLoopClass === 'keep' ? 'selected' : ''}>${(0, runtime.deps._t)('같은 직업 유지')}</option></select></label>
            <p class="loop-automation-status" data-loop-auto-status aria-live="polite"></p></section>`;
}

export function selectionOpen(runtime) { return !!runtime.deps.document.getElementById('loop-hero-select-overlay')?.classList.contains('active'); }

export function screenFree(runtime) { return runtime.deps.gameplayStarted && !(0, runtime.deps.isStartupOverlayOpen)() && !(0, runtime.deps.isLoadingOverlayOpen)() && !(0, runtime.deps.isRewardOpen)()
        && !runtime.deps.document.getElementById('game-dialog-overlay')?.classList.contains('active') && !runtime.deps.worldTreeBarkUi.barkDialogOpen(); }

export function armed(runtime) { return !!(runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision) && runtime.deps.game.settings.autoLoop && !runtime.deps.game.loopGateOffline
        && !runtime.deps.document.hidden && runtime.deps.loopSettlementUi.dismissedReadyLoop !== runtime.deps.game.season && !(0, runtime.deps.getHeldGearLoopBlockReason)(); }
