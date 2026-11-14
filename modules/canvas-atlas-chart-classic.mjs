import { createAtlasChartArt } from './rendering/atlas-chart-view.mjs';
const atlasChartArt = createAtlasChartArt({
    get ImageData() { return typeof ImageData === 'undefined' ? undefined : ImageData; },
    get ATLAS() { return ATLAS; }
});
safeExposeGlobals({ atlasChartArt });
