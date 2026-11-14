// GENERATED from modules/act-exploration-motion*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/combat/exploration-motion-cells.mjs
  function motionSameCell(a, b) {
    return a.gx === b.gx && a.gy === b.gy;
  }
  function motionCellOf(p) {
    return { gx: Math.round(p.gx), gy: Math.round(p.gy) };
  }
  function motionDuration(interval) {
    return Math.max(120, Math.min(1e4, Math.round(interval * 1e3 / 20) * 20));
  }
  function motionStart(run, player, next, interval, now) {
    if (run.motion) return false;
    const duration = motionDuration(interval);
    run.motion = { from: { gx: player.gx, gy: player.gy }, to: { gx: next.gx, gy: next.gy }, startedAt: now, elapsed: 0, duration };
    if (next.gx !== player.gx) run.motionDirection = next.gx < player.gx ? "west" : "east";
    else run.motionDirection = next.gy < player.gy ? "north" : "south";
    return true;
  }
  function motionCancel(memo, run) {
    if (run) {
      run.motion = null;
      memo.free.delete(run);
    }
  }
  function motionRebase(run, now) {
    if (now <= run.motionTimeMs) return;
    if (run.motion) run.motion.startedAt += now - run.motionTimeMs;
    run.motionTimeMs = now;
  }
  function motionAdvance(memo, run, player, now, canEnter) {
    const motion = run.motion;
    if (!motion) return;
    const expected = motion.elapsed < motion.duration / 2 ? motion.from : motion.to;
    if (!motionSameCell(player, expected)) {
      motionCancel(memo, run);
      return;
    }
    const next = Math.min(motion.duration, Math.max(motion.elapsed, now - motion.startedAt));
    if (motion.elapsed < motion.duration / 2 && next >= motion.duration / 2) {
      if (!canEnter) {
        motionCancel(memo, run);
        return;
      }
      Object.assign(player, motion.to, { gridMoveTimer: 0 });
    }
    motion.elapsed = next;
    if (next === motion.duration) motionCancel(memo, run);
  }
  function motionPosition(memo, run, player) {
    const pose = memo.free.get(run)?.pose;
    if (pose && motionSameCell(player, motionCellOf(pose))) return pose;
    const motion = run.motion;
    if (!motion) return { gx: player.gx, gy: player.gy };
    const progress = motion.elapsed / motion.duration;
    return {
      gx: motion.from.gx + (motion.to.gx - motion.from.gx) * progress,
      gy: motion.from.gy + (motion.to.gy - motion.from.gy) * progress
    };
  }
  function motionValidate(walkable, run, player, map) {
    if (run.motion === void 0) {
      run.motion = null;
      run.motionTimeMs = 0;
      run.motionDirection = "south";
    }
    if (!Number.isFinite(run.motionTimeMs) || run.motionTimeMs < 0) throw Error("탐험 이동 시각이 잘못되었습니다.");
    if (!["north", "south", "east", "west"].includes(run.motionDirection)) throw Error("탐험 이동 방향이 잘못되었습니다.");
    const motion = run.motion;
    if (motion === null) return;
    motionValidateTiming(motion, run.motionTimeMs);
    motionValidateCells(walkable, motion, player, map);
  }
  function motionValidateTiming(motion, now) {
    if (!motion || ![motion.startedAt, motion.duration, motion.elapsed].every(Number.isFinite)) throw Error("탐험 이동 수치가 잘못되었습니다.");
    if (motion.startedAt < 0) throw Error("탐험 이동 시작 시각이 잘못되었습니다.");
    if (motion.duration < 120 || motion.duration > 1e4) throw Error("탐험 이동 시간이 잘못되었습니다.");
    if (motion.elapsed < 0 || motion.elapsed >= motion.duration) throw Error("탐험 이동 진행이 잘못되었습니다.");
    if (Math.abs(now - motion.startedAt - motion.elapsed) > 1e-3) throw Error("탐험 이동 시각과 진행이 일치하지 않습니다.");
  }
  function motionValidateCells(walkable, motion, player, map) {
    for (const cell of [motion.from, motion.to]) {
      if (!cell || !walkable(map, cell)) throw Error("탐험 이동 경로가 지형 밖입니다.");
    }
    if (Math.max(Math.abs(motion.from.gx - motion.to.gx), Math.abs(motion.from.gy - motion.to.gy)) !== 1) throw Error("탐험 보행은 인접 칸으로만 가능합니다.");
    const expected = motion.elapsed < motion.duration / 2 ? motion.from : motion.to;
    if (!motionSameCell(player, expected)) throw Error("탐험 보행 위치와 판정 칸이 일치하지 않습니다.");
  }

  // modules/combat/exploration-motion-free.mjs
  function motionFreeState(env, run, player) {
    if (!env.free.has(run)) env.free.set(run, { pose: motionPosition(env, run, player), input: null, target: null, moved: false });
    run.motion = null;
    return env.free.get(run);
  }
  function motionSetFreeInput(env, run, player, dx, dy) {
    if (!dx && !dy) {
      const row2 = env.free.get(run);
      if (row2) row2.input = null;
      return;
    }
    const row = motionFreeState(env, run, player);
    row.target = null;
    row.input = { dx, dy };
  }
  function motionStartFree(env, run, player, target, interval) {
    const row = motionFreeState(env, run, player);
    if (row.input || row.target || motionSameCell(row.pose, target)) return false;
    row.target = target;
    row.duration = motionDuration(interval);
    return true;
  }
  function motionFreeDelta(env, row, interval) {
    if (row.input) return { dx: row.input.dx, dy: row.input.dy / env.depth(), step: 20 / motionDuration(interval) };
    if (!row.target) return null;
    return { dx: row.target.gx - row.pose.gx, dy: row.target.gy - row.pose.gy, step: 20 / row.duration };
  }
  function motionAdvanceFree(env, run, player, interval, canEnter) {
    const row = motionFreeState(env, run, player);
    if (!motionSameCell(player, motionCellOf(row.pose))) {
      row.pose = motionCellOf(player);
      row.target = null;
    }
    const delta = motionFreeDelta(env, row, interval), before = row.pose;
    row.moved = false;
    if (!delta) return;
    motionApplyFreeDelta(env, row, delta, canEnter);
    row.moved = !motionSameCell(before, row.pose);
    if (row.moved) motionUpdateFreePlayer(env, run, player, before, row.pose);
    if (row.target && (!row.moved || motionSameCell(row.pose, row.target))) row.target = null;
  }
  function motionApplyFreeDelta(env, row, delta, canEnter) {
    const length = Math.hypot(delta.dx, delta.dy * env.depth()), scale = length ? Math.min(1, delta.step / length) : 0;
    const end = scale === 1 && row.target ? row.target : { gx: row.pose.gx + delta.dx * scale, gy: row.pose.gy + delta.dy * scale };
    motionMoveFreeAxis(row, "gx", end.gx, canEnter);
    motionMoveFreeAxis(row, "gy", end.gy, canEnter);
  }
  function motionUpdateFreePlayer(env, run, player, before, pose) {
    const dx = pose.gx - before.gx, dy = pose.gy - before.gy;
    run.motionDirection = Math.abs(dx) + 1e-6 >= Math.abs(dy) * env.depth() ? dx < 0 ? "west" : "east" : dy < 0 ? "north" : "south";
    Object.assign(player, motionCellOf(pose), { gridMoveTimer: 0 });
  }
  function motionMoveFreeAxis(row, axis, value, canEnter) {
    if (row.pose[axis] === value) return;
    const next = { ...row.pose, [axis]: value };
    const cell = motionCellOf(next), from = motionCellOf(row.pose);
    if (motionSameCell(cell, from) || canEnter(cell)) {
      row.pose = next;
      return;
    }
    const edge = from[axis] + Math.sign(value - row.pose[axis]) * 0.499;
    if (Math.abs(edge - from[axis]) > Math.abs(row.pose[axis] - from[axis])) row.pose = { ...row.pose, [axis]: edge };
  }
  function motionAimFree(env, run, point) {
    env.preciseGoals.set(run, { point, command: run.destination });
    const row = env.free.get(run);
    if (row) row.target = null;
  }
  function motionPreciseTarget(env, run, cell) {
    const goal = env.preciseGoals.get(run);
    return goal && goal.command === run.destination && motionSameCell(goal.command, cell) ? goal.point : null;
  }
  function motionTakeDirectAim(env, run) {
    const goal = env.preciseGoals.get(run);
    if (!goal || goal.command !== run.destination || goal.tried) return null;
    goal.tried = true;
    return goal.point;
  }

  // modules/combat/exploration-motion.mjs
  function createExplorationMotion({ depth, walkable }) {
    const memo = { free: /* @__PURE__ */ new WeakMap(), preciseGoals: /* @__PURE__ */ new WeakMap(), depth };
    return {
      start: motionStart,
      advance: (run, player, now, canEnter) => motionAdvance(memo, run, player, now, canEnter),
      cancel: (run) => motionCancel(memo, run),
      rebase: motionRebase,
      position: (run, player) => motionPosition(memo, run, player),
      validate: (run, player, map) => motionValidate(walkable, run, player, map),
      setFreeInput: (run, player, dx, dy) => motionSetFreeInput(memo, run, player, dx, dy),
      startFree: (run, player, target, interval) => motionStartFree(memo, run, player, target, interval),
      advanceFree: (run, player, interval, canEnter) => motionAdvanceFree(memo, run, player, interval, canEnter),
      freeMoving: (run) => !!memo.free.get(run)?.moved,
      freeBusy: (run) => !!(memo.free.get(run)?.input || memo.free.get(run)?.target),
      stopFree: (run) => memo.free.delete(run),
      aimFree: (run, point) => motionAimFree(memo, run, point),
      preciseTarget: (run, cell) => motionPreciseTarget(memo, run, cell),
      takeDirectAim: (run) => motionTakeDirectAim(memo, run)
    };
  }

  // modules/act-exploration-motion-classic.mjs
  var actExplorationMotion = createExplorationMotion({
    depth: () => STAGE_VIEW.depth,
    walkable: (map, cell) => actExplorationMap.walkable(map, cell)
  });
  safeExposeGlobals({ actExplorationMotion });
})();
