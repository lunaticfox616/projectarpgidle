import { createStageAssetRetry } from './browser/stage-asset-retry.mjs';
// Same owner-scoped wanted() callbacks and retry timings. Retire with Canvas consumers.
const stageAssetRetry = createStageAssetRetry({ createImage: () => new Image(), scheduleImageRetry: (fn, ms) => setTimeout(fn, ms) });
safeExposeGlobals({ stageAssetRetry });
