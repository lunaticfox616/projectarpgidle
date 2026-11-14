// Remove this boundary/build entry when all classic consumers import the module.
import { createStageRegionFit } from './stage-region-fit.mjs';
// Headless map readers may deliberately omit the art table.
const stageRegionFit = createStageRegionFit(typeof STAGE_REGIONS === 'object' ? STAGE_REGIONS : undefined);
safeExposeGlobals({ stageRegionFit });
