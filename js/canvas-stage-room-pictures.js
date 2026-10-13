/** 방 그림의 준비 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 방 하나의 그림(바닥과 뒤쪽 띠, 또는 걸을 수 있는 자리 바깥의 그늘)은 조립한 다음 화면 배율로 옮겨야 쓸 수 있다. 예전에는 새 방을
 * 처음 그리는 프레임 안에서 한꺼번에 했다. 여기서는 요청, 나누어 준비, 완성된 그림 쓰기로 나눈다.
 *   roomPictureFor(map, room, dot, ahead)  지금 방의 다 된 그림을 돌려준다. 아직 없으면 준비를 맡기고 null을 돌려준다: 그리는 쪽
 *       (js/canvas-stage-rooms.js)은 그동안 어둠을 두고, 다른 방의 그림을 대신 쓰지 않는다. ahead는 주인공이 걸어가는 문 너머의
 *       방이다: 있으면 지금 방 다음으로 미리 준비한다. 모든 방을 미리 준비하지는 않는다.
 *   roomPictureWaiting(map, room)  그 방의 그림을 아직 준비하는 중인가(그동안은 방의 소품과 문도 그리지 않는다).
 * 준비는 그리기 밖에서 한다(pump, 타이머): 한 차례에 BUDGET_MS까지만 일하고 다음 차례로 넘긴다. 첫 걸음은 조립, 그 뒤로는 화면
 * 배율로 옮기기를 조각마다 한 걸음씩(js/canvas-stage-dots.js fitter), 그 방이 쓰는 소품과 문 조각을 한 장씩
 * (js/canvas-stage-scene.js fitJobs), 마지막은 테마의 문 그림이다.
 * 열쇠에는 지도, 방, 그리는 방식(조각 묶음, 벽 없는 방, 불러와진 층의 수), 지역 그림의 판 번호, 도트 하나의 화면 크기, 캔버스의
 * 해상도 배율이 든다. 탐험이나 화면 크기가 바뀌면 열쇠가 달라지므로 준비하던 그림은 버려지고 다 된 옛 그림은 쓰이지 않는다.
 * 들고 있는 그림은 KEEP장, 넓이의 합 PIXELS까지다: 지금 방, 다음 방, 방금 나온 방.
 * 준비가 늦거나 실패해도 걸음과 전투는 그대로 간다(그림만의 일이다). 실패한 그림은 RETRY_MS 뒤에 다시 해 본다.
 */
const stageRoomPictures = (() => {
    const KEEP = 3, PIXELS = 8 * 1024 * 1024; // RGBA 합계 32MB
    const BUDGET_MS = 4, RETRY_MS = 3000;
    const kept = new Map();                    // 열쇠 → 다 된 그림: 가장 오래 안 쓴 것이 맨 앞
    const failed = new Map();                  // 열쇠 → 준비하지 못한 때(performance.now)
    const mapIds = new WeakMap();
    let lastMapId = 0, wanted = [], job = null, pumping = false;

    /** 방 그림이 담는 칸 범위: 방과 둘레의 벽. 배경 그림을 쓰는 방(open)은 바닥과 길이 화면 끝까지 가도록 더 넓게 담는다. */
    function boxOf(map, room, open) {
        const frame = open ? STAGE_ROOMS.openFrame : STAGE_ROOMS.frame;
        const x = Math.max(0, room.x0 - frame.side), y = Math.max(0, room.y0 - frame.top);
        return { x, y, columns: Math.min(map.columns, room.x1 + frame.side + 1) - x, rows: Math.min(map.rows, room.y1 + frame.bottom + 1) - y };
    }
    /** 이 지도의 방을 무엇으로 그리는가: kit 조각 묶음, open 벽 없는 방(묶음이나 배경 그림), layers 불러와진 층 그림의 수. */
    function modeOf(map) {
        const kit = stageScene.ready(map), open = kit || stageBackdrop.ready(map);
        return { kit, open, layers: open && !kit ? stageBackdrop.layersReady(map) : 0 };
    }
    /** 조각 묶음이 있으면 그 바닥과 뒤쪽 띠, 배경 그림만 있으면 코드로 그린 벽 없는 방, 둘 다 없으면 벽돌 뒷벽이 선 방. */
    function assembled(map, room, box, mode) {
        if (mode.kit) return stageScene.paintRoom(map, room, box);
        return mode.open ? stageTerrain.paintOpen(map, room, box, stageBackdrop.look(map)) : stageTerrain.paint(map, box);
    }
    /** 테마가 있는 방의 문 그림(문 id → 잠긴 그림과 열린 그림). 없으면 쇠창살과 화살표로 그린다. */
    function gatesOf(map, room, open) {
        const look = open ? stageBackdrop.look(map) : null;
        return look && look.theme === 'sanctum' ? stageSanctum.doorPictures(map, room, look) : null;
    }
    /** 그 방의 그림 한 장을 가리키는 말. */
    function specOf(map, room, dot) {
        const mode = modeOf(map), version = typeof STAGE_REGIONS === 'object' ? STAGE_REGIONS.version : '';
        if (!mapIds.has(map)) mapIds.set(map, ++lastMapId);
        return { map, room, dot, mode, key: [mapIds.get(map), room.id, mode.open, mode.kit, mode.layers, version, dot, uiDisplay.battleRenderScale].join('|') };
    }
    function roomPictureFor(map, room, dot, ahead) {
        const spec = specOf(map, room, dot), next = ahead ? specOf(map, ahead, dot) : null, hit = kept.get(spec.key) || null;
        wanted = next ? [spec, next] : [spec];
        if (hit) { kept.delete(spec.key); kept.set(spec.key, hit); }
        if (wanted.some(row => !kept.has(row.key))) schedulePump();
        return hit;
    }
    /** 그 방의 그림을 아직 준비하는 중인가: 그동안은 방의 소품과 문도 그리지 않는다(js/canvas-stage-scene.js). 그 조각들도 방 그림과
     * 함께 준비되므로, 먼저 그리면 그 프레임에서 화면 배율로 옮기게 된다. */
    function roomPictureWaiting(map, room) {
        const spec = wanted[0];
        return !!spec && spec.map === map && spec.room === room && !kept.has(spec.key);
    }

    // ---------------------------------------------------------------- preparing, outside the draw
    function schedulePump() {
        if (pumping) return;
        pumping = true;
        setTimeout(pump, 0);
    }
    const stillWanted = key => wanted.some(row => row.key === key);
    const failedLately = key => failed.has(key) && performance.now() - failed.get(key) < RETRY_MS;
    /** 준비할 다음 그림: 바라는 것 가운데 아직 없고 방금 실패하지 않은 첫 번째(지금 방이 먼저다). */
    function nextJob() {
        const spec = wanted.find(row => !kept.has(row.key) && !failedLately(row.key));
        return spec ? { spec, stage: 0, spentMs: 0, box: null, fitter: null, pieces: null, gates: null } : null;
    }
    /** 한 차례: BUDGET_MS 동안 준비를 한 걸음씩 나아간다. 더는 바라지 않는 그림을 준비하던 중이면 버린다. */
    function pump() {
        pumping = false;
        const until = performance.now() + BUDGET_MS;
        while (performance.now() < until) {
            if (job && !stillWanted(job.spec.key)) job = null;
            job = job || nextJob();
            if (!job) return;
            stepJob(job);
        }
        schedulePump();
    }
    /** 준비의 걸음들(차례대로): 조립, 화면 배율로 옮기기 한 조각, 조각 그림 한 장, 테마의 문 그림. 저마다 그 걸음이 끝났으면 true. */
    const STEPS = Object.freeze([
        row => {
            const spec = row.spec;
            row.box = boxOf(spec.map, spec.room, spec.mode.open);
            row.fitter = stageDots.fitter(assembled(spec.map, spec.room, row.box, spec.mode), spec.dot);
            row.pieces = stageScene.fitJobs(spec.map, spec.room, spec.dot);
            return true;
        },
        row => row.fitter.step(),
        row => {
            const fit = row.pieces.pop();
            if (fit) fit();
            return !row.pieces.length;
        },
        row => {
            row.gates = row.spec.mode.kit ? null : gatesOf(row.spec.map, row.spec.room, row.spec.mode.open);
            return true;
        }
    ]);
    /** 한 걸음 나아간다. 다 되면 들여 놓고, 실패하면 적어 두고 그 그림은 놓는다. */
    function stepJob(row) {
        const from = performance.now();
        try {
            if (STEPS[row.stage](row)) row.stage++;
        } catch (error) {
            if (failed.size > 16) failed.clear();
            failed.set(row.spec.key, performance.now());
            job = null;
            console.error('방 그림을 준비하지 못했습니다', error);
            return;
        }
        row.spentMs += performance.now() - from;
        if (row.stage === STEPS.length) keepPicture(row);
    }
    function keepPicture(row) {
        const spec = row.spec, canvas = row.fitter.canvas;
        kept.set(spec.key, { map: spec.map, room: spec.room, box: row.box, open: spec.mode.open, kit: spec.mode.kit, key: spec.key, canvas, gates: row.gates,
            pixels: canvas.width * canvas.height });
        job = null;
        failed.delete(spec.key);
        battleFrameStats.noteRoomPicture(row.spentMs);
        trimKept();
    }
    /** KEEP장과 PIXELS를 넘으면 가장 오래 안 쓴 것부터 놓는다. 지금 바라는 그림은 놓지 않는다. */
    function trimKept() {
        let held = 0;
        for (const row of kept.values()) held += row.pixels;
        for (const [key, row] of [...kept]) {
            if (kept.size <= KEEP && held <= PIXELS) return;
            if (stillWanted(key)) continue;
            kept.delete(key);
            held -= row.pixels;
            row.canvas.width = row.canvas.height = 1; // 방 그림은 여기서 만든 캔버스다: 줄여서 메모리를 바로 돌려준다
        }
    }
    return Object.freeze({ roomPictureFor, roomPictureWaiting });
})();
safeExposeGlobals({ stageRoomPictures });
