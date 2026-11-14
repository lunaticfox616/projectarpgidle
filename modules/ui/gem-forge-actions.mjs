import { renderOverlay, revealMs, lerp, trackCard } from './gem-forge-markup.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

export function announce(runtime, name, { status, level, lost }) {
    if (status === 'destroyed') {
        (0, runtime.deps.playUiFeedbackSound)('danger');
        (0, runtime.deps.addLog)((0, runtime.deps._t)('💥 [{name}] +{level} 강화 중 룬이 파괴되었습니다.{lost}', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name)), level, lost: lost ? ` ${(0, runtime.deps._t)('남은 룬이 없습니다.')}` : '' }), 'attack-monster');
        return;
    }
    if (status === 'failure') { (0, runtime.deps.playUiFeedbackSound)('cancel'); return; }
    const next = level + 1;
    (0, runtime.deps.playUiFeedbackSound)(next >= 15 ? 'lootBurst' : next >= 10 ? 'levelUp' : 'success');
    if (next >= runtime.state.FORGE.riskFromLevel) (0, runtime.deps.addLog)((0, runtime.deps._t)('✨ [{name}] 룬 강화 +{next} 달성!', { name: (0, runtime.deps.escapeHTML)(name), next }), 'loot-unique');
}

export function reveal(runtime) {
    runtime.state.busy = false;
    (0, runtime.deps.updateStaticUI)();
    renderOverlay(runtime);
    announce(runtime, runtime.state.target, runtime.state.result);
    const button = runtime.state.dialog.querySelector('[data-forge-attempt]');
    (button.disabled ? runtime.state.dialog.querySelector('[data-forge-close]') : button).focus();
}

export function commit(runtime, timed) {
    if (!forgeIsCurrent(runtime)) { abandonForge(runtime); return; }
    runtime.state.timing = null;
    runtime.state.result = { ...runtime.deps.gemCoreForge.attempt(runtime.state.target, { cores: runtime.state.cores, timed }), timed };
    if (runtime.state.result.status === 'blocked') { runtime.state.busy = false; renderOverlay(runtime); return; }
    runtime.state.busy = true;
    (0, runtime.deps.queueImportantSave)(200);
    renderOverlay(runtime);
    deferForge(runtime, runtime.handlers.reveal, revealMs(runtime, runtime.state.result.level));
}

export function cancelTiming(runtime) {
    if (!runtime.state.timing) return;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.timing.frame);
    runtime.state.timing = null;
}

export function moveMarker(runtime, now) {
    if (!forgeIsCurrent(runtime)) { abandonForge(runtime); return; }
    if (!runtime.state.timing) return;
    if (!runtime.state.dialog.open || now - runtime.state.timing.startedAt > runtime.state.TIMING_IDLE_MS) { cancelTiming(runtime); if (runtime.state.dialog.open) renderOverlay(runtime); return; }
    const phase = ((now - runtime.state.timing.startedAt) / runtime.state.timing.periodMs) % 2;
    runtime.state.timing.at = (phase < 1 ? phase : 2 - phase) * 100;
    runtime.state.dialog.querySelector('.gem-forge-timing-marker').style.left = `${runtime.state.timing.at}%`;
    runtime.state.timing.frame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.moveMarker);
}

/** 담금질: 값은 멈춘 뒤에 치른다. 칸과 표시는 단계에 따라 좁아지고 빨라진다. */
export function startTiming(runtime) {
    const state = runtime.deps.gemCoreForge.inspect(runtime.state.target, { cores: runtime.state.cores });
    const t = state.level / (runtime.state.FORGE.maxLevel - 1), width = lerp(runtime, runtime.state.FORGE.timing.zonePct, t);
    const from = 8 + Math.random() * (84 - width);
    runtime.state.result = null;
    runtime.state.timing = { zone: [from, from + width], periodMs: lerp(runtime, runtime.state.FORGE.timing.periodMs, t), startedAt: runtime.deps.performance.now(), frame: 0, at: 0 };
    renderOverlay(runtime);
    runtime.state.dialog.querySelector('[data-forge-stop]').focus();
    runtime.state.timing.frame = (0, runtime.deps.requestAnimationFrame)(runtime.handlers.moveMarker);
}

export function stopTiming(runtime) {
    if (!runtime.state.timing) return;
    (0, runtime.deps.cancelAnimationFrame)(runtime.state.timing.frame);
    const hit = runtime.state.timing.at >= runtime.state.timing.zone[0] && runtime.state.timing.at <= runtime.state.timing.zone[1];
    runtime.state.dialog.querySelector('.gem-forge-timing').classList.add(hit ? 'is-hit' : 'is-miss');
    runtime.state.busy = true;     // 맞혔는지 보여 주는 동안은 닫거나 다시 누를 수 없다
    deferForge(runtime, () => commit(runtime, hit), 320);
}

export function pressAttempt(runtime) {
    if (runtime.state.timing) return;
    if (runtime.deps.game.settings.runeTimingOff) commit(runtime, false);
    else startTiming(runtime);
}

export function stepCores(runtime, button) {
    const state = runtime.deps.gemCoreForge.inspect(runtime.state.target, { cores: runtime.state.cores });
    runtime.state.cores = Math.max(0, state.coresUsed + Number(button.dataset.forgeCores));
    runtime.state.result = null;
    renderOverlay(runtime);
}

export function toggleSkip(runtime, input) { runtime.deps.game.settings.runeTimingOff = input.checked; }

export function handleClick(runtime, event) {
    if (!forgeIsCurrent(runtime)) { abandonForge(runtime); return; }
    if (runtime.state.busy) return;
    for (const [selector, run] of runtime.state.CLICK_ACTIONS) {
        const hit = event.target.closest(selector);
        if (hit) { run(hit); return; }
    }
}

export function open(runtime, name) {
    if (!runtime.active) return;
    if (runtime.state.owner && runtime.state.owner !== runtime.deps.game) abandonForge(runtime);
    if (runtime.state.busy) return;
    runtime.state.owner = runtime.deps.game;
    runtime.state.target = name; runtime.state.result = null; runtime.state.cores = 0;
    if (!runtime.state.dialog) {
        runtime.state.dialog = runtime.deps.document.createElement('dialog');
        runtime.state.dialog.id = 'gem-core-forge-overlay';
        runtime.state.dialog.setAttribute('aria-labelledby', 'gem-forge-title');
        listenView(runtime, runtime.state.dialog, 'click', runtime.handlers.handleClick);
        listenView(runtime, runtime.state.dialog, 'cancel', event => { if (runtime.state.busy) event.preventDefault(); });
        listenView(runtime, runtime.state.dialog, 'close', () => {
            if (runtime.state.dialog.open) return;
            abandonForge(runtime);
            runtime.deps.document.querySelector('[data-forge-open]')?.focus();
        });
        runtime.deps.document.body.appendChild(runtime.state.dialog);
    }
    renderOverlay(runtime);
    if (!runtime.state.dialog.open) runtime.state.dialog.showModal();
}

export function renderSection(runtime, name) {
    if (!runtime.active) return;
    const container = runtime.deps.document.getElementById('ui-gem-core-forge');
    if (!container) return;
    if (runtime.state.section) releaseViewTarget(runtime, runtime.state.section);
    runtime.state.section = container;
    container.innerHTML = name ? trackCard(runtime, name) : '<p class="gem-process-empty">장착한 공격 룬을 선택하세요.</p>';
    listenView(runtime, container, 'click', event => { if (name && event.target.closest('[data-forge-open]')) open(runtime, name); });
}

function forgeIsCurrent(runtime) {
    return runtime.active && runtime.state.owner === runtime.deps.game;
}

function deferForge(runtime, action, delay) {
    const owner = runtime.deps.game;
    const timer = runtime.deps.setTimeout(() => {
        runtime.state.timers.delete(timer);
        if (!runtime.active || runtime.deps.game !== owner) { abandonForge(runtime); return; }
        action();
        }, delay);
    runtime.state.timers.add(timer);
}

function abandonForge(runtime) {
    cancelTiming(runtime);
    for (const timer of runtime.state.timers) runtime.deps.clearTimeout(timer);
    runtime.state.timers.clear();
    runtime.state.busy = false;
    runtime.state.result = null;
    runtime.state.owner = null;
    if (runtime.state.dialog?.open) runtime.state.dialog.close();
}

export function disposeGemForge(runtime) {
    abandonForge(runtime);
    runtime.state.dialog?.remove();
    runtime.state.dialog = null;
    runtime.state.target = null;
    runtime.state.section = null;
}
