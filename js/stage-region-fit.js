// GENERATED from modules/stage-region-fit*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/stage-region-fit.mjs
  function createStageRegionFit(regions) {
    const WIDE = 64, DEEP = 32;
    const regionRow = (id) => typeof regions === "object" && id && regions.regions[id] || null;
    function coverScale(region, columns, rows) {
      const fit = regions.fit, above = fit.floorBottom - rows * DEEP, span = Math.max(fit.width, columns * WIDE + fit.margin);
      return Math.max(span / region.width, above / region.ground, (fit.height - above) / (region.height - region.ground));
    }
    const regionScale = (region, columns, rows) => Math.max(1, coverScale(region, columns, rows));
    function regionNorthColumn(id, columns, mirror, frame) {
      const region = regionRow(id), middle = Math.floor(columns / 2);
      if (!region || region.door === null) return middle;
      const offset = (mirror ? -1 : 1) * (region.door - 0.5) * region.width * coverScale(region, frame.columns, frame.rows) / WIDE;
      return Math.max(1, Math.min(columns - 2, middle + Math.round(offset)));
    }
    return Object.freeze({ of: regionRow, scale: regionScale, northColumn: regionNorthColumn });
  }

  // modules/stage-region-fit-classic.mjs
  var stageRegionFit = createStageRegionFit(typeof STAGE_REGIONS === "object" ? STAGE_REGIONS : void 0);
  safeExposeGlobals({ stageRegionFit });
})();
