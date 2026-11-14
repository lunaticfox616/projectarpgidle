import { createMemoryDungeon } from './domain/memory-dungeon.mjs';

const rules = createMemoryDungeon({
    get contentProgression() { return contentProgression; },
    get atlas() { return atlas; },
    get _t() { return _t; },
    get ATLAS() { return ATLAS; },
    get bossVariants() { return typeof bossVariants === 'undefined' ? undefined : bossVariants; },
    get atlasEndgame() { return atlasEndgame; },
    get atlasMaps() { return atlasMaps; },
    get MEMORY_DUNGEON() { return MEMORY_DUNGEON; }
});
const memoryDungeon = rules;
safeExposeGlobals({ memoryDungeon });
