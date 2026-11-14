/** 방 그림의 준비 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 방 하나의 그림(바닥과 뒤쪽 띠, 또는 걸을 수 있는 자리 바깥의 그늘)은 조립한 다음 화면 배율로 옮겨야 쓸 수 있다. 예전에는 새 방을
 * 처음 그리는 프레임 안에서 한꺼번에 했다. 여기서는 요청, 나누어 준비, 완성된 그림 쓰기로 나눈다.
 *   roomPictureFor(map, room, dot, ahead)  지금 방의 다 된 그림을 돌려준다. 아직 없으면 준비를 맡기고 null을 돌려준다: 그리는 쪽
 *       (js/canvas-stage-rooms.js)은 그동안 어둠을 두고, 다른 방의 그림을 대신 쓰지 않는다. ahead는 주인공이 걸어가는 문 너머의
 *       방이다: 있으면 지금 방 다음으로 미리 준비한다. 모든 방을 미리 준비하지는 않는다.
 *   roomPictureWaiting(map, room)  그 방의 그림을 아직 준비하는 중인가(그동안은 방의 소품과 문도 그리지 않는다).
 * 준비는 그리기 밖에서 한다(pump, 타이머): 한 차례에 BUDGET_MS까지만 일하고 다음 차례로 넘긴다. 첫 걸음은 조립, 그 뒤로는 화면
 * 배율로 옮기기를 조각마다 한 걸음씩(js/canvas-stage-dots.js fitter), 그 방이 쓰는 소품을 한 장씩 준비한다
 * (js/canvas-stage-scene.js fitJobs). 공용 뿌리 봉인은 방 그림 밖에서 하나의 시트를 공유한다.
 * 열쇠에는 지도, 방, 그리는 묶음(지역 그림이나 조각 묶음), 지역 그림의 판 번호, 도트 하나의 화면 크기, 캔버스의
 * 해상도 배율이 든다. 탐험이나 화면 크기가 바뀌면 열쇠가 달라지므로 준비하던 그림은 버려지고 다 된 옛 그림은 쓰이지 않는다.
 * 들고 있는 그림은 KEEP장, 넓이의 합 PIXELS까지다: 지금 방과 다음 방. 방금 나온 방의 그림은 놓는다(화면 배율 125%에서 한 장이
 * 8MB쯤이다): 되돌아가면 그 방이 다시 '걸어가는 문 너머의 방'이 되어 도착하기 전에 준비된다.
 * 준비가 늦거나 실패해도 걸음과 전투는 그대로 간다(그림만의 일이다). 실패한 그림은 RETRY_MS 뒤에 다시 해 본다.
 */
class StageRoomPictures {
    constructor(deps) {
        this.deps = deps;
        this.KEEP = 2;
        this.PIXELS = 5 * 1024 * 1024;
        this.BUDGET_MS = 4;
        this.RETRY_MS = 3000;
        this.kept = new Map();
        this.failed = new Map();
        this.mapIds = new WeakMap();
        this.lastMapId = 0;
        this.wanted = [];
        this.job = null;
        this.pumping = false;
        this.modeOf = map => ({ kit: this.deps.scenePreparation.ready(map) });
        this.stillWanted = key => this.wanted.some(row => row.key === key);
        this.failedLately = key => this.failed.has(key) && this.deps.performance.now() - this.failed.get(key) < this.RETRY_MS;
        this.STEPS = Object.freeze([
            row => {
                const spec = row.spec;
                row.box = this.boxOf(spec.room);
                row.fitter = this.deps.stageDots.fitter(this.deps.scenePreparation.paintRoom(spec.map, spec.room, row.box), spec.dot);
                row.pieces = this.deps.scenePreparation.fitJobs(spec.map, spec.room, spec.dot);
                return true;
            },
            row => row.fitter.step(),
            row => {
                const fit = row.pieces.pop();
                if (fit) fit();
                return !row.pieces.length;
            }
        ]);
    }

    /** 방 그림이 담는 칸 범위: 방과 바닥이 화면 끝까지 가도록 둘레까지. 그림 묶음은 지도의 칸을 읽지 않으므로 지도 끝에서 자르지 않는다.
     * 2026-10-30 사용자 "에셋 틈사이사이의 선": 지도 아래 끝에서 그늘이 끊겨 바닥을 가로지르는 곧은 선이 보였다. */
    boxOf(room) {
        const frame = this.deps.STAGE_ROOMS.frame;
        const left = room.x0 - frame.side, top = room.y0 - frame.top, right = room.x1 + frame.side + 1, bottom = room.y1 + frame.bottom + 1;
        return { x: left, y: top, columns: right - left, rows: bottom - top };
    }

    /** 그 방의 그림 한 장을 가리키는 말. */
    specOf(map, room, dot) {
        const mode = this.modeOf(map), version = typeof this.deps.STAGE_REGIONS === 'object' ? this.deps.STAGE_REGIONS.version : '';
        if (!this.mapIds.has(map)) this.mapIds.set(map, ++this.lastMapId);
        return { map, room, dot, mode, key: [this.mapIds.get(map), room.id, mode.kit, version, dot, this.deps.uiDisplay.battleRenderScale].join('|') };
    }

    roomPictureFor(map, room, dot, ahead) {
        const spec = this.specOf(map, room, dot), next = ahead ? this.specOf(map, ahead, dot) : null, hit = this.kept.get(spec.key) || null;
        this.wanted = next ? [spec, next] : [spec];
        if (hit) { this.kept.delete(spec.key); this.kept.set(spec.key, hit); }
        if (this.wanted.some(row => !this.kept.has(row.key))) this.schedulePump();
        return hit;
    }

    /** 그 방의 그림을 아직 준비하는 중인가: 그동안은 방의 소품과 문도 그리지 않는다(js/canvas-stage-scene.js). 그 조각들도 방 그림과
     * 함께 준비되므로, 먼저 그리면 그 프레임에서 화면 배율로 옮기게 된다. */
    roomPictureWaiting(map, room) {
        const spec = this.wanted[0];
        return !!spec && spec.map === map && spec.room === room && !this.kept.has(spec.key);
    }

    // ---------------------------------------------------------------- preparing, outside the draw
    schedulePump() {
        if (this.pumping) return;
        this.pumping = true;
        this.deps.setTimeout(this.pump.bind(this), 0);
    }

    /** 준비할 다음 그림: 바라는 것 가운데 아직 없고 방금 실패하지 않은 첫 번째(지금 방이 먼저다). */
    nextJob() {
        const spec = this.wanted.find(row => !this.kept.has(row.key) && !this.failedLately(row.key));
        return spec ? { spec, stage: 0, spentMs: 0, box: null, fitter: null, pieces: null } : null;
    }

    /** 한 차례: BUDGET_MS 동안 준비를 한 걸음씩 나아간다. 더는 바라지 않는 그림을 준비하던 중이면 버린다. */
    pump() {
        this.pumping = false;
        const until = this.deps.performance.now() + this.BUDGET_MS;
        while (this.deps.performance.now() < until) {
            if (this.job && !this.stillWanted(this.job.spec.key)) this.job = null;
            this.job = this.job || this.nextJob();
            if (!this.job) return;
            this.stepJob(this.job);
        }
        this.schedulePump();
    }

    /** 한 걸음 나아간다. 다 되면 들여 놓고, 실패하면 적어 두고 그 그림은 놓는다. */
    stepJob(row) {
        const from = this.deps.performance.now();
        try {
            if (this.STEPS[row.stage](row)) row.stage++;
        } catch (error) {
            if (this.failed.size > 16) this.failed.clear();
            this.failed.set(row.spec.key, this.deps.performance.now());
            this.job = null;
            this.deps.console.error('방 그림을 준비하지 못했습니다', error);
            return;
        }
        row.spentMs += this.deps.performance.now() - from;
        if (row.stage === this.STEPS.length) this.keepPicture(row);
    }

    keepPicture(row) {
        const spec = row.spec, canvas = row.fitter.canvas;
        this.kept.set(spec.key, { map: spec.map, room: spec.room, box: row.box, kit: spec.mode.kit, key: spec.key, canvas,
            pixels: canvas.width * canvas.height });
        this.job = null;
        this.failed.delete(spec.key);
        this.deps.battleFrameStats.noteRoomPicture(row.spentMs);
        this.trimKept();
    }

    /** KEEP장과 PIXELS를 넘으면 가장 오래 안 쓴 것부터 놓는다. 지금 바라는 그림은 놓지 않는다. */
    trimKept() {
        let held = 0;
        for (const row of this.kept.values()) held += row.pixels;
        for (const [key, row] of [...this.kept]) {
            if (this.kept.size <= this.KEEP && held <= this.PIXELS) return;
            if (this.stillWanted(key)) continue;
            this.kept.delete(key);
            held -= row.pixels;
            row.canvas.width = row.canvas.height = 1; // 방 그림은 여기서 만든 캔버스다: 줄여서 메모리를 바로 돌려준다
        }
    }
}

export function createStageRoomPictures(deps) {
    const instance = new StageRoomPictures(deps);
    return Object.freeze({ roomPictureFor: instance.roomPictureFor.bind(instance), roomPictureWaiting: instance.roomPictureWaiting.bind(instance) });
}
