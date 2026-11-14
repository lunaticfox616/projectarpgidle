// GENERATED from modules/canvas-stage-stride*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/common/step-interpolation.mjs
  function linearStepLag(elapsedMs, durationMs) {
    return Math.max(0, 1 - Math.max(0, elapsedMs) / durationMs);
  }

  // modules/rendering/stage-stride.mjs
  var StageStride = class {
    constructor(deps) {
      this.deps = deps;
      this.states = /* @__PURE__ */ new WeakMap();
      this.stepMs = (unit) => this.deps.getGridUnitStepSec(unit) * 1e3;
      this.cellDots = () => [this.deps.STAGE_VIEW.heroTile, this.deps.STAGE_VIEW.heroTile * this.deps.STAGE_VIEW.depth];
      this.share = (state, now) => Math.min(1, Math.max(0, (now - state.seen) / state.stepMs));
      this.lag = (elapsedMs, unit) => linearStepLag(elapsedMs, this.stepMs(unit));
    }
    /** A new step starts where the drawn unit is now (still short of the cell it left if the last step had not finished).
     * It began when the combat clock says it did, so a unit first seen long after its last step is already standing. */
    begin(unit, state, now) {
      const left = state ? 1 - this.share(state, now) : 0, from = unit.gridStepFrom, [wide, deep] = this.cellDots();
      const dx = (state ? state.dx * left : 0) + from.gx - unit.gx, dy = (state ? state.dy * left : 0) + from.gy - unit.gy;
      const walked = state ? state.walked + state.dots * (1 - left) : 0;
      const step = this.stepMs(unit), since = Math.min(step, Math.max(0, this.deps.getCombatTime() - unit.gridStepAt));
      return { at: unit.gridStepAt, seen: now - since, stepMs: step, dx, dy, walked, dots: Math.hypot(dx * wide, dy * deep) };
    }
    /** How far the drawn unit still is from its cell (cells), whether it is walking, and the dots it has walked so far.
     * null → not on the stage, or the unit has not stepped yet. now = the frame's time (ms). */
    read(unit, now) {
      if (unit && !unit.gridStepFrom) this.states.delete(unit);
      if (!unit || !unit.gridStepFrom || !Number.isFinite(Number(unit.gridStepAt))) return null;
      let state = this.states.get(unit);
      if (!state || state.at !== unit.gridStepAt) {
        state = this.begin(unit, state, now);
        this.states.set(unit, state);
      }
      const done = this.share(state, now), left = 1 - done;
      return { dx: state.dx * left, dy: state.dy * left, moving: done < 1, walked: state.walked + state.dots * done };
    }
    /** The dots a unit has walked, as last read this frame (0 for a unit that never stepped). */
    walked(unit, now) {
      const state = this.states.get(unit);
      return state ? state.walked + state.dots * this.share(state, now) : 0;
    }
  };
  function createStageStride(deps) {
    const instance = new StageStride(deps);
    return Object.freeze({ read: instance.read.bind(instance), walked: instance.walked.bind(instance), lag: instance.lag });
  }

  // modules/canvas-stage-stride-classic.mjs
  var native = createStageStride({
    get getGridUnitStepSec() {
      return getGridUnitStepSec;
    },
    get STAGE_VIEW() {
      return STAGE_VIEW;
    },
    get getCombatTime() {
      return getCombatTime;
    }
  });
  var stageStride = Object.freeze({
    read: native.read,
    walked: native.walked,
    lag: native.lag
  });
  safeExposeGlobals({ stageStride });
})();
