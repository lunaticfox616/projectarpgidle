import { createAtlas } from './domain/atlas.mjs';

const rules = createAtlas({
    get ATLAS() { return ATLAS; },
    get atlasEpoch() { return atlasEpoch; },
    get atlasEndgame() { return atlasEndgame; },
    get memoryLeaves() { return memoryLeaves; },
    get atlasBoard() { return atlasBoard; },
    get atlasPassives() { return atlasPassives; },
    get hasCurrentLoopChaos20Clear() { return hasCurrentLoopChaos20Clear; },
    get _t() { return _t; },
    get atlasMaps() { return atlasMaps; },
    get lootOmens() { return lootOmens; },
    get stumpBox() { return stumpBox; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get atlasEncounters() { return atlasEncounters; },
    get memoryDungeon() { return typeof memoryDungeon === 'undefined' ? undefined : memoryDungeon; },
    get ATLAS_ENDGAME() { return ATLAS_ENDGAME; },
    get contentProgression() { return contentProgression; },
    get actExplorationMap() { return actExplorationMap; },
    get getAbyssZoneTier() { return getAbyssZoneTier; },
    get ATLAS_BOARD() { return ATLAS_BOARD; },
    get actExplorationState() { return actExplorationState; },
    get combatLootReceipts() { return combatLootReceipts; },
    get ORB_DB() { return ORB_DB; },
    get ATLAS_BOSS_BODIES() { return ATLAS_BOSS_BODIES; }
});
const atlas = Object.freeze({
    ...rules,
    fragmentOpen: (fragment, loop) => rules.fragmentOpen(fragment, loop, game)
});
safeExposeGlobals({ atlas });
