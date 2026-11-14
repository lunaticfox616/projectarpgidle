import { watchCombatLogScroll, isCombatLogHidden, captureCombatLogScroll, settleCombatLogScroll } from './combat-log-scroll.mjs';
import { stripHtmlMessage } from './combat-log-markup.mjs';
import { queueCombatLogFrame, queueCombatLogTimer, cancelCombatLogTimer } from './combat-log-lifetime.mjs';

/** 지난번에 붙인 뒤 COMBAT_LOG_FLUSH_MS가 안 지났으면 다음 프레임에 다시 본다. @returns {boolean} 미뤘는지 */
export function deferCombatLogFlush(runtime, frameNow) {
    if (frameNow - runtime.state.lastLogFlushAt >= runtime.state.COMBAT_LOG_FLUSH_MS || frameNow < runtime.state.lastLogFlushAt) { runtime.state.lastLogFlushAt = frameNow; return false; }
    runtime.state.logFlushRaf = queueCombatLogFrame(runtime, runtime.handlers.flushLogQueue);
    return true;
}

export function flushLogQueue(runtime, frameNow = runtime.deps.performance.now()) {
    runtime.state.logFlushRaf = 0;
    const log = runtime.deps.document.getElementById('log');
    if (!log || runtime.state.logQueue.length === 0 || deferCombatLogFlush(runtime, frameNow)) return;
    watchCombatLogScroll(runtime, log);
    // 숨은 로그는 재지 않고, 다시 보이면 최신 줄을 따라간다. 이전 줄을 읽는 중이면 그 줄을 계속 보게 둔다.
    const hidden = isCombatLogHidden(log), reading = !hidden && log.combatLogAtBottom === false;
    let scrollState = reading ? captureCombatLogScroll(log) : null;
    // 백그라운드 재계산처럼 로그가 폭주하면 어차피 60줄만 남으므로,
    // DOM에 만들 필요가 없는 초과분은 만들기 전에 버린다.
    if (runtime.state.logQueue.length > 60) runtime.state.logQueue = runtime.state.logQueue.slice(-60);
    let frag = runtime.deps.document.createDocumentFragment();
    runtime.state.logQueue.forEach(entry => {
        const div = runtime.deps.document.createElement('div');
        div.className = 'log-msg ' + (entry.cls || '');
        div.innerHTML = entry.msg;
        frag.appendChild(div);
    });
    noteCombatLogLatest(runtime, runtime.state.logQueue[runtime.state.logQueue.length - 1]);
    runtime.state.logQueue = [];
    log.appendChild(frag);
    while (log.childElementCount > 60) log.removeChild(log.firstChild);
    settleCombatLogScroll(runtime, log, { hidden, scrollState });
}

/** 휴대폰에서 접힌 전투 기록 막대에 보일 최근 한 줄(접기 단추의 data-latest, ui-responsive-refine.css가 '전투 로그' 대신 쓴다). */
export function noteCombatLogLatest(runtime, entry) {
    if (!runtime.deps.document.body.classList.contains('mobile-battle-tab')) return; // PC에는 이 줄을 읽는 규칙이 없다: 기록마다 단추 스타일만 다시 계산했다
    const toggle = runtime.deps.document.getElementById('btn-combat-log-toggle'), text = entry ? stripHtmlMessage(runtime, entry.msg) : '';
    if (toggle && text && toggle.dataset.latest !== text) toggle.dataset.latest = text;
}

export function isCombatLogRateLimited(runtime, opts, settings, now) {
    if (!opts.rateKey || settings.combatLogRateLimit === false) return false;
    if (now < (runtime.state.combatLogRateState[opts.rateKey] || 0)) return true;
    runtime.state.combatLogRateState[opts.rateKey] = now + Math.max(60, Number(opts.minIntervalMs || 180));
    return false;
}

/** One line into the log queue. The queue is trimmed while drawing is paused (a hidden tab): only 60 lines are ever shown. */
export function pushCombatLogLine(runtime, msg, cls) {
    runtime.state.logQueue.push({ msg, cls });
    if (runtime.state.logQueue.length > 240) runtime.state.logQueue = runtime.state.logQueue.slice(-60);
    if (!runtime.state.logFlushRaf) runtime.state.logFlushRaf = queueCombatLogFrame(runtime, runtime.handlers.flushLogQueue);
}

export function mergedCombatLogLine(state) {
    return state.count > 1 ? `${state.msg} <span style="color:var(--copy-bright);">x${state.count}</span>` : state.msg;
}

/** Flushes a merged log line once its window has passed quietly. A line hit again inside the window waits for the rest of the
 * window (the timer re-arms), so the last line of a burst always shows and the entry is freed (2026-10-26: it used to stay, one per
 * enemy ever hit, until that enemy was hit again). */
export function flushCombatLogAggregate(runtime, key, winMs) {
    let state = runtime.state.combatLogAggregateState[key];
    if (!state) return;
    let quiet = runtime.deps.performance.now() - state.lastAt;
    if (quiet < winMs) {
        state.timer = queueCombatLogTimer(runtime, runtime.handlers.flushCombatLogAggregate.bind(undefined, key, winMs), winMs - quiet + 10);
        return;
    }
    pushCombatLogLine(runtime, mergedCombatLogLine(state), state.cls);
    delete runtime.state.combatLogAggregateState[key];
}

/** Lines with an aggregateKey merge inside their window into one line with a count. */
export function queueAggregatedCombatLog(runtime, msg, cls, opts, now) {
    let key = `${opts.aggregateKey}:${cls || ''}`;
    let state = runtime.state.combatLogAggregateState[key];
    let winMs = Math.max(120, Number(opts.aggregateWindowMs || 500));
    if (state && (now - state.lastAt) <= winMs) {
        state.count++;
        state.lastAt = now;
        state.msg = msg;
        return;
    }
    if (state) {
        cancelCombatLogTimer(runtime, state.timer);
        pushCombatLogLine(runtime, mergedCombatLogLine(state), state.cls);
    }
    runtime.state.combatLogAggregateState[key] = { msg: msg, cls: cls, count: 1, lastAt: now };
    runtime.state.combatLogAggregateState[key].timer = queueCombatLogTimer(runtime, runtime.handlers.flushCombatLogAggregate.bind(undefined, key, winMs), winMs + 10);
}
