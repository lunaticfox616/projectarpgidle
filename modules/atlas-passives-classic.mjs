import { createAtlasPassives } from './domain/atlas-passives.mjs';

const rules = createAtlasPassives({
    get atlas() { return atlas; },
    get _t() { return _t; },
    get ATLAS_PASSIVES() { return ATLAS_PASSIVES; },
    get ATLAS() { return ATLAS; }
});
const atlasPassives = rules;
safeExposeGlobals({ atlasPassives });
