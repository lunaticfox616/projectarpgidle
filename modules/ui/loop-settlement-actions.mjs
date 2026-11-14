import { render, updateLoopDecisionOverlayUi } from './loop-settlement-render.mjs';

export function announceCodexStarter(runtime, { item, pick }) {
    const { deps } = runtime;
    deps.addLog(deps._t('🎁 도감 완성 특전 지급: [{itemSlotDisplayLabel}] {name} (액트1 고유 랜덤 1개)', {
        itemSlotDisplayLabel: deps.getItemSlotDisplayLabel(item, pick.slots[0]), name: deps._t(pick.name)
    }), 'loot-unique');
}

export function organize(runtime) {
    runtime.state.dismissedReadyLoop = runtime.deps.game.season;
    render(runtime);
    (0, runtime.deps.switchTab)('tab-items');
    // When the stall or the hall is what blocks the loop, open it directly.
    if (runtime.deps.playerStall.loopBlockReason(runtime.deps.game)) runtime.deps.marketUi.open('stall');
    else if ((0, runtime.deps.getHeldGearLoopBlockReason)()) runtime.deps.marketUi.open('hall'); // 장비 전당에 전시한 원본
}

export function reopen(runtime) {
    runtime.state.dismissedReadyLoop = 0;
    render(runtime);
}

export function canShowCombatLoopAdvanceButton(runtime) {
    if (runtime.deps.game && (runtime.deps.game.pendingLoopReady || runtime.deps.game.pendingLoopDecision)) return true;
    if (!runtime.deps.game) return false;
    return typeof runtime.deps.hasCurrentLoopAbyssRequirementClear === 'function'
        ? (0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(runtime.deps.game.season || 1)
        : !!(runtime.deps.game.loopProgressCurrent && runtime.deps.game.loopProgressCurrent.chaos20Cleared);
}

export async function requestManualLoopAdvanceConfirmation(runtime) {
    if (!runtime.active) return false;
    const owner = runtime.deps.game, season = owner.season;
    // The reset would be refused anyway: show why instead of asking to confirm.
    const stallReason = (0, runtime.deps.getHeldGearLoopBlockReason)();
    if (stallReason) {
        if (typeof runtime.deps.addLog === 'function') (0, runtime.deps.addLog)(stallReason, 'attack-monster', { toast: true });
        runtime.api.nudgeStallWarning();
        return Promise.resolve(false);
    }
    const confirmed = await (0, runtime.deps.requestGameConfirmation)(
        (0, runtime.deps._t)('정말 지금 루프하시겠습니까?\n현재 루프를 정산하고 다음 루프로 이동합니다.'),
        { title: (0, runtime.deps._t)('루프 진행 확인'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('루프 진행'),
        cancelLabel: (0, runtime.deps._t)('취소'), dismissOnBackdrop: false }
    );
    return !!confirmed && runtime.active && runtime.deps.game === owner && owner.season === season;
}

export async function handleLoopDecisionAdvanceButton(runtime, path) {
    if (!runtime.deps.game || !runtime.deps.game.pendingLoopDecision) return;
    let selectedPath = path === 'chaos' || path === 'cosmos' ? path : null;
    if (!await requestManualLoopAdvanceConfirmation(runtime)) return;
    if (!runtime.deps.game || !runtime.deps.game.pendingLoopDecision) return;
    if (selectedPath) (0, runtime.deps.chooseLoopAdvancePath)(selectedPath);
    else (0, runtime.deps.chooseLoopAdvance)(true);
}

export function openLoopPathChoice(runtime) {
    runtime.deps.game.pendingLoopDecision = true;
    let overlay = runtime.deps.document.getElementById('loop-decision-overlay');
    if (overlay) overlay.classList.toggle('active', true);
    updateLoopDecisionOverlayUi(runtime);
    if (typeof runtime.deps.addLog === 'function') (0, runtime.deps.addLog)((0, runtime.deps._t)('진행할 루프 경로를 선택하세요.'), 'season-up');
}

export async function handleCombatLoopAdvanceButton(runtime) {
    if (!runtime.active) return;
    if (canConfirmReadyLoop(runtime)) {
        return confirmReadyLoop(runtime);
    }
    if (runtime.deps.game && runtime.deps.game.pendingLoopDecision && typeof runtime.deps.chooseLoopAdvance === 'function') {
        await handleLoopDecisionAdvanceButton(runtime);
        return;
    }
    if (canShowCombatLoopAdvanceButton(runtime) && typeof runtime.deps.triggerSeasonReset === 'function') {
        return confirmDirectLoop(runtime);
    }
    if (typeof runtime.deps.addLog === 'function') (0, runtime.deps.addLog)((0, runtime.deps._t)('아직 루프 진행 조건을 달성하지 못했습니다.'), 'attack-monster');
}

function canConfirmReadyLoop(runtime) {
    return runtime.deps.game && runtime.deps.game.pendingLoopReady && typeof runtime.deps.confirmLoopReady === 'function';
}

function availablePaths(runtime) {
    return typeof runtime.deps.getAvailableLoopAdvancePaths === 'function'
        ? runtime.deps.getAvailableLoopAdvancePaths(runtime.deps.game.season || 1) : [];
}

async function confirmReadyLoop(runtime) {
    if (availablePaths(runtime).length > 1) return (0, runtime.deps.confirmLoopReady)();
    if (!await requestManualLoopAdvanceConfirmation(runtime) || !runtime.deps.game.pendingLoopReady) return;
    (0, runtime.deps.confirmLoopReady)();
}

async function confirmDirectLoop(runtime) {
    if (availablePaths(runtime).length > 1) return openLoopPathChoice(runtime);
    const season = runtime.deps.game.season || 1;
    if (!await requestManualLoopAdvanceConfirmation(runtime)) return;
    if (!runtime.deps.game || (runtime.deps.game.season || 1) !== season || !canShowCombatLoopAdvanceButton(runtime)) return;
    (0, runtime.deps.triggerSeasonReset)();
}
