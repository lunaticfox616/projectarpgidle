import { createTalismanEffects } from './domain/talisman-effects.mjs';

const rules = createTalismanEffects({
    get STUMP_BOX_SIZE() { return STUMP_BOX_SIZE; },
    get talismans() { return talismans; },
    get stumpBox() { return stumpBox; }
});
const talismanEffects = Object.freeze({ summarize: (state = game) => rules.summarize(state) });
safeExposeGlobals({ talismanEffects });
