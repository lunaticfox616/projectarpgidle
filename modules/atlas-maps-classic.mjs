import { createAtlasMaps } from './domain/atlas-maps.mjs';

const rules = createAtlasMaps({
    get ATLAS() { return ATLAS; },
    get lootOmens() { return lootOmens; },
    get LOOT_OMENS() { return LOOT_OMENS; },
    get memoryDungeon() { return typeof memoryDungeon === 'undefined' ? undefined : memoryDungeon; }
});
const atlasMaps = rules;
safeExposeGlobals({ atlasMaps });
