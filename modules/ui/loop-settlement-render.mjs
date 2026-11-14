import { firstPreservationHtml, unlockRewardText, summaryHtml } from './loop-settlement-markup.mjs';
import { showFreshReveal, syncSettlementOwner } from './loop-settlement-reveal.mjs';

export function render(runtime) {
    if (!runtime.active) return;
    syncSettlementOwner(runtime);
    const ready = !!runtime.deps.game.pendingLoopReady;
    const decision = !!runtime.deps.game.pendingLoopDecision;
    const overlay = runtime.deps.document.getElementById('loop-ready-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active', ready && runtime.state.dismissedReadyLoop !== runtime.deps.game.season);
    runtime.deps.document.getElementById('loop-decision-overlay').classList.toggle('active', decision);
    if (!ready && !decision) { runtime.state.renderedKey = ''; runtime.state.dismissedReadyLoop = 0; return; }
    const preservation = firstPreservationHtml(runtime);
    const key = `${runtime.deps.game.season}:${ready}:${decision}:${unlockRewardText(runtime)}:${(0, runtime.deps.getHeldGearLoopBlockReason)()}:${runtime.deps.game.settings.autoLoop}:${runtime.deps.game.settings.autoLoopClass}:${runtime.deps.worldTreeBark.barkPoints(runtime.deps.game).free}:${preservation}`;
    if (key === runtime.state.renderedKey) return;
    // A new loop's summary starts at its top: shown again, the cards came back at the last loop's scroll spot.
    if (!runtime.state.renderedKey.startsWith(`${runtime.deps.game.season}:`)) runtime.deps.document.querySelectorAll('#loop-ready-overlay .tutorial-card, #loop-decision-overlay .tutorial-card').forEach(card => card.scrollTo(0, 0));
    runtime.state.renderedKey = key;
    const html = summaryHtml(runtime, preservation);
    runtime.deps.document.getElementById('loop-ready-summary').innerHTML = html;
    runtime.deps.document.getElementById('loop-decision-summary').innerHTML = html;
    showFreshReveal(runtime);
}

export function getLoopPathUiState(runtime) {
    let season = runtime.deps.game ? (runtime.deps.game.season || 1) : 1;
    let chaosReady = typeof runtime.deps.hasCurrentLoopChaosRequirementClear === 'function'
        ? (0, runtime.deps.hasCurrentLoopChaosRequirementClear)(season)
        : (typeof runtime.deps.hasCurrentLoopAbyssRequirementClear === 'function' && (0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(season));
    let cosmosReady = typeof runtime.deps.hasCurrentLoopCosmosRequirementClear === 'function'
        ? (0, runtime.deps.hasCurrentLoopCosmosRequirementClear)(season) : false;
    return { chaosReady, cosmosReady, showPathChoices: season >= 31 && cosmosReady };
}

export function updateLoopDecisionOverlayUi(runtime) {
    runtime.api.render();
    let state = getLoopPathUiState(runtime);
    let body = runtime.deps.document.getElementById('loop-decision-body');
    if (body) body.innerText = state.showPathChoices
        ? (0, runtime.deps._t)('다음 루프로 사용할 경로를 선택하거나, 이번 루프를 유지하고 심화 등반을 계속하세요.')
        : (0, runtime.deps._t)('다음 루프로 즉시 넘어갈지, 이번 루프를 유지하고 심화 등반을 계속할지 선택하세요.');
    let genericBtn = runtime.deps.document.getElementById('loop-decision-generic-btn');
    let chaosBtn = runtime.deps.document.getElementById('loop-decision-chaos-btn');
    let cosmosBtn = runtime.deps.document.getElementById('loop-decision-cosmos-btn');
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
