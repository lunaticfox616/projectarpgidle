/** 무대 그림 캐시의 공통 규칙 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 무대는 한 가지 색으로 칠한 프레임, 합성한 포즈, 정수배로 키운 그림을 캔버스로 들고 있는다(js/canvas-stage-roster.js,
 * js/canvas-stage-dots.js). 캐시마다 넓이(px)의 합과 장수에 상한이 있고, 넘으면 가장 오래 안 쓴 것부터 놓는다.
 * 다만 방금까지 쓰인 것(limit.hotMs 안)은 놓지 않는다. 화면에 있는 그림을 놓으면 다음 프레임에 다시 만들어야 하고 그것이 프레임마다
 * 되풀이된다: 몬스터 28마리가 싸우는 방에서 캔버스가 초당 400장(화면 배율 125%에서는 600장) 넘게 만들어지고 버려졌다.
 * 자리가 없으면 새 그림은 들이지 않는다. 부르는 쪽은 그 그림을 들고 있지 않고 작업면에서 바로 그린다.
 * 지키는 시간은 캐시마다 다르다. 작은 그림(한 가지 색 프레임, 합성한 포즈)은 걷기와 공격 한 바퀴가 모두 들어가므로 HOT_MS 동안
 * 지키고, 큰 그림(정수배로 키운 그림)은 한 프레임에 쓰는 것만 들어가므로 그 프레임 동안만 지킨다(js/canvas-stage-dots.js).
 * 넓이만 센다(RGBA라 바이트는 넓이의 네 배). 게임 상태를 읽지 않는다.
 */
const stageCache = (() => {
    const HOT_MS = 1500;
    /** @param {{pixels:number, entries:number, hotMs:number}} limit 넓이의 합(px)과 장수의 상한, 쓴 뒤에 지키는 시간
     * @param {function(*):void} release 그림을 놓을 때 부른다(캔버스를 줄여 메모리를 바로 돌려준다) */
    function stageCacheOf(limit, release) {
        const rows = new Map(); // 열쇠 → { value, pixels, at }: 가장 오래 안 쓴 것이 맨 앞
        let held = 0;
        /** 들고 있는 그림(쓴 때를 적고 맨 뒤로 옮긴다), 없으면 null. now = performance.now(). */
        function cachedValue(key, now) {
            const row = rows.get(key);
            if (!row) return null;
            row.at = now;
            rows.delete(key);
            rows.set(key, row);
            return row.value;
        }
        /** pixels만 한 자리를 낸다. false면 들이지 않는다: 상한보다 크거나, 들고 있는 것이 모두 방금까지 쓰였다. */
        function cacheRoomFor(pixels, now) {
            if (pixels > limit.pixels) return false;
            while (rows.size >= limit.entries || held + pixels > limit.pixels) {
                const [key, row] = rows.entries().next().value;
                if (now - row.at < limit.hotMs) return false;
                rows.delete(key);
                held -= row.pixels;
                release(row.value);
            }
            return true;
        }
        /** cacheRoomFor가 자리를 낸 뒤에 부른다. */
        function cacheKeep(key, value, pixels, now) {
            rows.set(key, { value, pixels, at: now });
            held += pixels;
        }
        return Object.freeze({ cachedValue, cacheRoomFor, cacheKeep });
    }
    return Object.freeze({ HOT_MS, stageCacheOf });
})();
safeExposeGlobals({ stageCache });
