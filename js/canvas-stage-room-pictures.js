// GENERATED from modules/canvas-stage-room-pictures*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-room-pictures.mjs
  var StageRoomPictures = class {
    constructor(deps) {
      this.deps = deps;
      this.KEEP = 2;
      this.PIXELS = 5 * 1024 * 1024;
      this.BUDGET_MS = 4;
      this.RETRY_MS = 3e3;
      this.kept = /* @__PURE__ */ new Map();
      this.failed = /* @__PURE__ */ new Map();
      this.mapIds = /* @__PURE__ */ new WeakMap();
      this.lastMapId = 0;
      this.wanted = [];
      this.job = null;
      this.pumping = false;
      this.modeOf = (map) => ({ kit: this.deps.scenePreparation.ready(map) });
      this.stillWanted = (key) => this.wanted.some((row) => row.key === key);
      this.failedLately = (key) => this.failed.has(key) && this.deps.performance.now() - this.failed.get(key) < this.RETRY_MS;
      this.STEPS = Object.freeze([
        (row) => {
          const spec = row.spec;
          row.box = this.boxOf(spec.room);
          row.fitter = this.deps.stageDots.fitter(this.deps.scenePreparation.paintRoom(spec.map, spec.room, row.box), spec.dot);
          row.pieces = this.deps.scenePreparation.fitJobs(spec.map, spec.room, spec.dot);
          return true;
        },
        (row) => row.fitter.step(),
        (row) => {
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
      const mode = this.modeOf(map), version = typeof this.deps.STAGE_REGIONS === "object" ? this.deps.STAGE_REGIONS.version : "";
      if (!this.mapIds.has(map)) this.mapIds.set(map, ++this.lastMapId);
      return { map, room, dot, mode, key: [this.mapIds.get(map), room.id, mode.kit, version, dot, this.deps.uiDisplay.battleRenderScale].join("|") };
    }
    roomPictureFor(map, room, dot, ahead) {
      const spec = this.specOf(map, room, dot), next = ahead ? this.specOf(map, ahead, dot) : null, hit = this.kept.get(spec.key) || null;
      this.wanted = next ? [spec, next] : [spec];
      if (hit) {
        this.kept.delete(spec.key);
        this.kept.set(spec.key, hit);
      }
      if (this.wanted.some((row) => !this.kept.has(row.key))) this.schedulePump();
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
      const spec = this.wanted.find((row) => !this.kept.has(row.key) && !this.failedLately(row.key));
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
        this.deps.console.error("방 그림을 준비하지 못했습니다", error);
        return;
      }
      row.spentMs += this.deps.performance.now() - from;
      if (row.stage === this.STEPS.length) this.keepPicture(row);
    }
    keepPicture(row) {
      const spec = row.spec, canvas = row.fitter.canvas;
      this.kept.set(spec.key, {
        map: spec.map,
        room: spec.room,
        box: row.box,
        kit: spec.mode.kit,
        key: spec.key,
        canvas,
        pixels: canvas.width * canvas.height
      });
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
        row.canvas.width = row.canvas.height = 1;
      }
    }
  };
  function createStageRoomPictures(deps) {
    const instance = new StageRoomPictures(deps);
    return Object.freeze({ roomPictureFor: instance.roomPictureFor.bind(instance), roomPictureWaiting: instance.roomPictureWaiting.bind(instance) });
  }

  // modules/canvas-stage-room-pictures-classic.mjs
  var stageRoomPictures = createStageRoomPictures({
    get STAGE_ROOMS() {
      return STAGE_ROOMS;
    },
    get scenePreparation() {
      return stageScene.preparation;
    },
    get STAGE_REGIONS() {
      return typeof STAGE_REGIONS === "undefined" ? void 0 : STAGE_REGIONS;
    },
    get uiDisplay() {
      return uiDisplay;
    },
    get setTimeout() {
      return setTimeout.bind(globalThis);
    },
    get performance() {
      return performance;
    },
    get stageDots() {
      return stageDots;
    },
    get console() {
      return console;
    },
    get battleFrameStats() {
      return battleFrameStats;
    }
  });
  safeExposeGlobals({ stageRoomPictures });
})();
