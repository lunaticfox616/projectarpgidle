import { createAtlasEpoch } from './domain/atlas-epoch.mjs';

const rules = createAtlasEpoch({
    get atlas() { return atlas; },
    get ATLAS() { return ATLAS; },
    get _t() { return _t; },
    get atlasEndgame() { return atlasEndgame; }
});
const atlasEpoch = rules;
safeExposeGlobals({ atlasEpoch });
