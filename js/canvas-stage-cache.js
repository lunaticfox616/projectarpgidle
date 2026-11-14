// GENERATED from modules/canvas-stage-cache*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/rendering/stage-cache.mjs
  var HOT_MS = 1500;
  function createStageCache(limit, release) {
    const rows = /* @__PURE__ */ new Map();
    let held = 0;
    function cachedValue(key, now) {
      const row = rows.get(key);
      if (!row) return null;
      row.at = now;
      rows.delete(key);
      rows.set(key, row);
      return row.value;
    }
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
    function cacheKeep(key, value, pixels, now) {
      rows.set(key, { value, pixels, at: now });
      held += pixels;
    }
    return Object.freeze({ cachedValue, cacheRoomFor, cacheKeep });
  }
  var stageCache = Object.freeze({ HOT_MS, stageCacheOf: createStageCache });

  // modules/canvas-stage-cache-classic.mjs
  safeExposeGlobals({ stageCache });
})();
