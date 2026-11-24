import { createAtlasPassives } from './domain/atlas-passives.mjs';

const atlasPassives = createAtlasPassives({
    get ATLAS() { return ATLAS; },
    get atlasEpoch() { return atlasEpoch; }
});
safeExposeGlobals({ atlasPassives });
