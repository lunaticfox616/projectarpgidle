export function playLoopRewriteEffect(runtime) {
    if (!runtime.active) return;
    const overlay = runtime.deps.document.getElementById('loop-rewrite-overlay');
    if (!overlay) return;
    cancelLoopRewrite(runtime);
    runtime.state.rewriteOverlay = overlay;
    overlay.innerHTML = '<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">전투의 기억을 간직한 채, 새로운 루프를 시작합니다.</div></div>';
    runtime.deps.document.body.classList.add('loop-rewrite-active');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    runtime.state.rewriteTimer = runtime.deps.setTimeout(() => cancelLoopRewrite(runtime), 1950);
}

function cancelLoopRewrite(runtime) {
    runtime.deps.clearTimeout(runtime.state.rewriteTimer);
    runtime.state.rewriteTimer = 0;
    if (!runtime.state.rewriteOverlay) return;
    runtime.state.rewriteOverlay.classList.remove('active');
    runtime.deps.document.body.classList.remove('loop-rewrite-active');
    runtime.state.rewriteOverlay = null;
}

export function togglePastLoopMilestones(runtime) {
    if (!runtime.active) return;
    const settings = runtime.deps.game.settings;
    settings.collapsePastLoopMilestones = settings.collapsePastLoopMilestones === false;
    runtime.deps.updateStaticUI();
}

export function startReveal(runtime) {
    if (runtime.state.revealLoop === runtime.deps.game.season) return false;
    runtime.state.revealLoop = runtime.deps.game.season;
    runtime.state.revealStep = runtime.deps.game.settings.autoLoop ? 3 : 1;
    return true;
}

export function showReveal(runtime, fresh) {
    if (!runtime.active) return;
    const cards = runtime.deps.document.querySelectorAll('#loop-ready-overlay .loop-settlement-card, #loop-decision-overlay .loop-settlement-card');
    cards.forEach(card => {
        card.dataset.loopStep = String(runtime.state.revealStep);
        if (fresh) card.dataset.loopFresh = fresh;
    });
    if (!fresh) return;
    (0, runtime.deps.clearTimeout)(runtime.state.freshTimer);
    const owner = runtime.deps.game;
    runtime.state.freshTimer = (0, runtime.deps.setTimeout)(() => {
        runtime.state.freshTimer = 0;
        if (runtime.active && runtime.deps.game === owner) cards.forEach(card => delete card.dataset.loopFresh);
        }, 800);
}

export function advanceReveal(runtime, event) {
    if (!runtime.active || runtime.state.owner !== runtime.deps.game) return;
    if (runtime.state.revealStep >= 3) return;
    if (!event.target.closest('[data-loop-continue]') && event.target.closest('button, select, input, label, a, summary')) return;
    runtime.state.revealStep += 1;
    showReveal(runtime, String(runtime.state.revealStep));
    if (runtime.state.revealStep === 2) rollLoop(runtime);
    focusRevealedSection(runtime, event.currentTarget);
}

function focusRevealedSection(runtime, overlay) {
    // 새로 나타난 칸의 끝(셋째 칸이면 단추 줄)이 카드 안에 보이게 내린다
    const card = overlay.querySelector('.loop-settlement-card');
    const parts = card ? card.querySelectorAll(`[data-loop-section="${runtime.state.revealStep}"]`) : [];
    if (parts.length) parts[parts.length - 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    card?.querySelector('[data-loop-continue]')?.focus({ preventScroll: true });
}

export function rollLoop(runtime) {
    if (!runtime.active) return;
    if (runtime.state.rolledLoop === runtime.deps.game.season) return;
    runtime.state.rolledLoop = runtime.deps.game.season;
    const owner = runtime.deps.game, season = owner.season;
    const roll = () => {
        runtime.state.rollTimer = 0;
        if (!runtime.active || runtime.deps.game !== owner || owner.season !== season) return;
        runtime.deps.document.querySelectorAll('.loop-settlement-card [data-loop-count]').forEach(node => node.classList.add('is-rolled'));
    };
    (0, runtime.deps.clearTimeout)(runtime.state.rollTimer);
    if (typeof runtime.deps.matchMedia === 'function' && (0, runtime.deps.matchMedia)('(prefers-reduced-motion: reduce)').matches) roll();
    else runtime.state.rollTimer = (0, runtime.deps.setTimeout)(roll, 650);
}

export function nudgeStallWarning(runtime) {
    runtime.deps.document.querySelectorAll('.loop-settlement-warning').forEach(node => {
        node.classList.remove('is-nudged');
        node.getBoundingClientRect(); // restart the animation
        node.classList.add('is-nudged');
    });
}

export function showFreshReveal(runtime) {
    if (!startReveal(runtime)) return showReveal(runtime, '');
    showReveal(runtime, runtime.state.revealStep === 3 ? 'all' : '1');
    if (runtime.state.revealStep >= 2) rollLoop(runtime);
}

export function cancelSettlementTimers(runtime) {
    cancelLoopRewrite(runtime);
    (0, runtime.deps.clearTimeout)(runtime.state.freshTimer);
    (0, runtime.deps.clearTimeout)(runtime.state.rollTimer);
    runtime.state.freshTimer = 0;
    runtime.state.rollTimer = 0;
    runtime.deps.document.querySelectorAll('.loop-settlement-card').forEach(card => delete card.dataset.loopFresh);
}

export function syncSettlementOwner(runtime) {
    if (runtime.state.owner === runtime.deps.game) return;
    cancelSettlementTimers(runtime);
    runtime.state.owner = runtime.deps.game;
    runtime.state.renderedKey = '';
    runtime.state.dismissedReadyLoop = 0;
    runtime.state.revealLoop = 0;
    runtime.state.revealStep = 3;
    runtime.state.rolledLoop = 0;
}
