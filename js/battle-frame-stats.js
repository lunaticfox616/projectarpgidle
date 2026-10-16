/** 전장 그리기의 실제 수치 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 화면이 프레임을 부르는 횟수(requestAnimationFrame)와 전장이 실제로 그려진 횟수는 다른 수다. 전장은 정해진 박자로만 그린다
 * (js/ui.js renderBattlefieldThrottled: PC의 탐험은 초당 60번, 그 밖의 전투는 45번, 휴대폰은 30번, 쉬는 동안은 더 느리게).
 * 여기는 전장 그리기가 끝까지 간 것만 세고, 박자에 견줘 읽는다.
 *   draws     초당 끝까지 그린 횟수와 그때의 박자(pace)
 *   gapMs     그리기와 그리기 사이의 시간
 *   cpuMs     한 번 그리는 데 메인 스레드가 쓴 시간. GPU가 쓴 시간도, 메모리도 아니다.
 *   late      박자보다 화면 한 프레임(1/60초) 넘게 늦은 그리기의 수. 정해진 30번 박자나 쉬는 박자를 따른 것은 늦은 것이 아니다.
 *   rooms     방 그림 한 장을 준비하는 데 쓴 시간(js/canvas-stage-room-pictures.js)
 * 창이 가려졌다 돌아온 사이처럼 1초 넘게 벌어진 간격은 세지 않는다: 브라우저가 쉬게 한 것이지 느려진 것이 아니다.
 * 최근 KEEP번의 그리기만 든다. 읽기만 하는 기록이다: 게임 상태를 바꾸지 않고 저장하지 않는다.
 */
const battleFrameStats = (() => {
    const KEEP = 240, PAUSE_MS = 1000, DISPLAY_FRAME_MS = 1000 / 60;
    const gaps = new Float32Array(KEEP), costs = new Float32Array(KEEP), paces = new Float32Array(KEEP);
    const rooms = { count: 0, lastMs: 0, worstMs: 0 };
    let noted = 0, lastDone = 0;

    /** 전장을 끝까지 한 번 그렸다. began, done = performance.now(), paceMs = 그때의 박자(그리기 사이의 목표 시간). */
    function noteBattleDraw(began, done, paceMs) {
        const gap = lastDone ? done - lastDone : 0;
        lastDone = done;
        if (!(gap > 0) || gap > PAUSE_MS) return; // 첫 그리기, 또는 쉬다 돌아온 그리기
        const at = noted % KEEP;
        gaps[at] = gap;
        costs[at] = done - began;
        paces[at] = paceMs;
        noted++;
    }
    /** 방 그림 한 장을 준비하는 데 ms가 걸렸다. */
    function noteRoomPicture(ms) {
        rooms.count++;
        rooms.lastMs = ms;
        rooms.worstMs = Math.max(rooms.worstMs, ms);
    }
    const round = value => Math.round(value * 10) / 10;
    /** 평균, 95번째 백분위, 가장 큰 값(ms). */
    function spreadOf(values, size) {
        const sorted = Array.from(values.subarray(0, size)).sort((a, b) => a - b);
        const mean = sorted.reduce((sum, value) => sum + value, 0) / size;
        return { mean: round(mean), p95: round(sorted[Math.min(size - 1, Math.floor(size * 0.95))]), worst: round(sorted[size - 1]) };
    }
    /** @returns {?{draws:number, pace:number, gapMs:object, cpuMs:object, late:number, samples:number, rooms:object}} 아직 그린 적이 없으면 null */
    function frameSummary() {
        const size = Math.min(noted, KEEP);
        if (!size) return null;
        const gapMs = spreadOf(gaps, size), paceMs = spreadOf(paces, size).mean;
        let late = 0;
        for (let at = 0; at < size; at++) if (gaps[at] > paces[at] + DISPLAY_FRAME_MS) late++;
        return { draws: round(1000 / gapMs.mean), pace: round(1000 / paceMs), gapMs, cpuMs: spreadOf(costs, size), late, samples: size, rooms: { ...rooms } };
    }
    return Object.freeze({ noteBattleDraw, noteRoomPicture, frameSummary });
})();
safeExposeGlobals({ battleFrameStats });
