// GENERATED from modules/battle-frame-stats*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/battle-frame-stats.mjs
  function createBattleFrameStats() {
    const KEEP = 240, PAUSE_MS = 1e3, DISPLAY_FRAME_MS = 1e3 / 60;
    const gaps = new Float32Array(KEEP), costs = new Float32Array(KEEP), paces = new Float32Array(KEEP);
    const rooms = { count: 0, lastMs: 0, worstMs: 0 };
    let noted = 0, lastDone = 0;
    function noteBattleDraw(began, done, paceMs) {
      const gap = lastDone ? done - lastDone : 0;
      lastDone = done;
      if (!(gap > 0) || gap > PAUSE_MS) return;
      const at = noted % KEEP;
      gaps[at] = gap;
      costs[at] = done - began;
      paces[at] = paceMs;
      noted++;
    }
    function noteRoomPicture(ms) {
      rooms.count++;
      rooms.lastMs = ms;
      rooms.worstMs = Math.max(rooms.worstMs, ms);
    }
    const round = (value) => Math.round(value * 10) / 10;
    function spreadOf(values, size) {
      const sorted = Array.from(values.subarray(0, size)).sort((a, b) => a - b);
      const mean = sorted.reduce((sum, value) => sum + value, 0) / size;
      return { mean: round(mean), p95: round(sorted[Math.min(size - 1, Math.floor(size * 0.95))]), worst: round(sorted[size - 1]) };
    }
    function frameSummary() {
      const size = Math.min(noted, KEEP);
      if (!size) return null;
      const gapMs = spreadOf(gaps, size), paceMs = spreadOf(paces, size).mean;
      let late = 0;
      for (let at = 0; at < size; at++) if (gaps[at] > paces[at] + DISPLAY_FRAME_MS) late++;
      return { draws: round(1e3 / gapMs.mean), pace: round(1e3 / paceMs), gapMs, cpuMs: spreadOf(costs, size), late, samples: size, rooms: { ...rooms } };
    }
    return Object.freeze({ noteBattleDraw, noteRoomPicture, frameSummary });
  }

  // modules/battle-frame-stats-classic.mjs
  var battleFrameStats = createBattleFrameStats();
  safeExposeGlobals({ battleFrameStats });
})();
