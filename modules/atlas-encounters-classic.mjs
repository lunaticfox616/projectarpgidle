import { createAtlasEncounters } from './domain/atlas-encounters.mjs';

const rules = createAtlasEncounters({
    get ATLAS() { return ATLAS; },
    get contentProgression() { return contentProgression; },
    get hashSeed() { return hashSeed; },
    get getRealmMonsterVisualDefinitionById() { return getRealmMonsterVisualDefinitionById; },
    get actExplorationState() { return actExplorationState; }
});
const atlasEncounters = Object.freeze({ ...rules,
    roll: (bonus, forced, random, capacity = Infinity, context = false) => rules.roll(bonus, forced, random, capacity, context, game),
    roomLimit: (bonus, loop) => rules.roomLimit(bonus, loop, game),
    isOpen: (type, loop) => rules.isOpen(type, loop, game),
    rewards: (zone, type, bonus, random) => rules.rewards(zone, type, bonus, random, game),
    chestReward: (zone, random) => rules.chestReward(zone, random, game)
});
safeExposeGlobals({ atlasEncounters });
