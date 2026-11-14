// GENERATED from modules/data/offline-progress.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/offline-progress.mjs
  var OFFLINE_PROGRESS_RECOGNITION_HOURS = Object.freeze([3, 6, 9, 12, 15, 18, 21, 24]);
  var OFFLINE_PROGRESS_EFFICIENCY_RATES = Object.freeze([0.3, 0.32, 0.34, 0.36, 0.38, 0.4]);
  var OFFLINE_PROGRESS_EFFICIENCY_CAP = 0.75;
  var OFFLINE_PROJECTION = Object.freeze({
    minRealMs: 12e4,
    minCycles: 3,
    minMeasuredMs: 18e4,
    remeasureEveryMs: 12e5,
    realBudgetMs: 6e5,
    realHoldMs: 18e5,
    realCapMs: 36e5,
    objectSampleMin: 6,
    timeScale: Object.freeze([0.5, 2]),
    zoneTypes: Object.freeze(["act", "abyss", "atlasMap"])
  });

  // modules/data/offline-progress.mjs:classic
  Object.assign(globalThis, { OFFLINE_PROGRESS_RECOGNITION_HOURS, OFFLINE_PROGRESS_EFFICIENCY_RATES, OFFLINE_PROGRESS_EFFICIENCY_CAP, OFFLINE_PROJECTION });
  if (typeof safeExposeData === "function") safeExposeData({ OFFLINE_PROGRESS_RECOGNITION_HOURS, OFFLINE_PROGRESS_EFFICIENCY_RATES, OFFLINE_PROGRESS_EFFICIENCY_CAP, OFFLINE_PROJECTION });
})();
