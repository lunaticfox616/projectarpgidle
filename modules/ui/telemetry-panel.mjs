import { telemetryGetLiveFrameAverage, telemetryGetPlaytestFrameSummary } from '../browser/telemetry-frames.mjs';

export function telemetryIsPerformancePanelEnabled(env) {
    return typeof env.deps.location !== 'undefined' && typeof env.deps.URLSearchParams !== 'undefined'
        && new env.deps.URLSearchParams(env.deps.location.search).get('debug') === 'perf';
}

export function telemetryEnsurePerformancePanel(env) {
    if (!telemetryIsPerformancePanelEnabled(env)) return null;
    let panel = env.deps.document.getElementById('playtest-performance-panel');
    if (panel) return panel;
    panel = env.deps.document.createElement('aside');
    panel.id = 'playtest-performance-panel';
    panel.setAttribute('aria-label', env.deps._t('실시간 성능'));
    panel.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:20000;min-width:170px;padding:9px 11px;border:1px solid #5b7698;border-radius:8px;background:rgba(7,13,22,.92);color:#eaf4ff;font:12px/1.5 monospace;pointer-events:none;white-space:pre;';
    env.deps.document.body.appendChild(panel);
    return panel;
}

/** 성능 패널(주소에 debug=perf). 두 가지 수를 갈라 적는다(2026-10-13 성능 작업): 화면이 프레임을 부른 횟수는 화면의 주사율과 메인
 * 스레드가 막힌 시간을 말할 뿐 게임이 그린 횟수가 아니다. 전장이 실제로 그려진 횟수와 그 박자, 그리는 데 쓴 메인 스레드 시간은
 * js/battle-frame-stats.js가 센다. 메모리는 JS 힙만이다(그림과 GPU가 쓰는 메모리는 여기에 없다). */
export function telemetryUpdatePerformancePanel(env) {
    let panel = telemetryEnsurePerformancePanel(env);
    if (!panel) return;
    let average = telemetryGetLiveFrameAverage(env);
    let summary = telemetryGetPlaytestFrameSummary(env);
    let calls = average > 0 ? Math.min(999, 1000 / average) : 0;
    let lines = [
        env.deps._t('화면 갱신 {calls}/s (브라우저가 프레임을 부른 횟수)', { calls: calls.toFixed(0) }),
        env.deps._t('갱신 간격 평균 {average}ms, p95 {p95}ms, 50ms 넘음 {longFrames}', { average: average.toFixed(1), p95: (summary.p95 || 0).toFixed(1), longFrames: summary.longFrames })
    ].concat(telemetryGetBattleDrawPanelLines(env), [`FX ${env.playtestRuntime.currentFx} / ${summary.peakFx}`]);
    if (env.deps.performance && env.deps.performance.memory) lines.push(`JS 힙 ${(env.deps.performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB (그림과 GPU 메모리는 빼고)`);
    panel.textContent = lines.join('\n');
}

export function telemetryGetBattleDrawPanelLines(env) {
    let frame = env.deps.battleFrameStats.frameSummary();
    if (!frame) return ['전장 그리기 아직 없음'];
    return [
        env.deps._t('전장 그리기 {draws}/s (박자 {pace}/s, 박자보다 늦음 {late}/{samples})', { draws: frame.draws, pace: frame.pace, late: frame.late, samples: frame.samples }),
        env.deps._t('그리기 간격 평균 {mean}ms, p95 {p95}ms, 최대 {worst}ms', { mean: frame.gapMs.mean, p95: frame.gapMs.p95, worst: frame.gapMs.worst }),
        env.deps._t('그리기 CPU 평균 {mean}ms, p95 {p95}ms, 최대 {worst}ms (메인 스레드)', { mean: frame.cpuMs.mean, p95: frame.cpuMs.p95, worst: frame.cpuMs.worst }),
        env.deps._t('방 그림 준비 {count}번, 최근 {lastMs}ms, 최대 {worstMs}ms', { count: frame.rooms.count, lastMs: frame.rooms.lastMs.toFixed(1), worstMs: frame.rooms.worstMs.toFixed(1) })
    ];
}
