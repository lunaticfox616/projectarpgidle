import { createGardenOils } from './domain/garden-oils.mjs';

const rules = createGardenOils({
    get contentProgression() { return contentProgression; },
    get createEmptyStatBucket() { return createEmptyStatBucket; },
    get PASSIVE_TREE() { return PASSIVE_TREE; },
    get hashSeed() { return hashSeed; },
    get _t() { return _t; },
    get withSubjectParticle() { return withSubjectParticle; },
    get getStatName() { return getStatName; },
    get GARDEN_OILS() { return GARDEN_OILS; }
});
const gardenOils = rules;
safeExposeGlobals({ gardenOils });
