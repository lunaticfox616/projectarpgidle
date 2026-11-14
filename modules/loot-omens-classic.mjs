import { createLootOmens } from './domain/loot-omens.mjs';

const rules = createLootOmens({
    get contentProgression() { return contentProgression; },
    get atlasEndgame() { return atlasEndgame; },
    get LOOT_OMENS() { return LOOT_OMENS; },
    get hashSeed() { return hashSeed; }
});
const lootOmens = rules;
safeExposeGlobals({ lootOmens });
