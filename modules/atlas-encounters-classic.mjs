import { createAtlasEncounters } from './domain/atlas-encounters.mjs';

const rules = createAtlasEncounters({
    get ATLAS() { return ATLAS; },
    get contentProgression() { return contentProgression; },
    get hashSeed() { return hashSeed; },
    get getRealmMonsterVisualDefinitionById() { return getRealmMonsterVisualDefinitionById; },
    get actExplorationState() { return actExplorationState; }
});
const atlasEncounters = Object.freeze({ ...rules,
    roll: (bonus, forced, random, capacity = Infinity, ...selection) => rules.roll(bonus, forced, random, capacity, selection[0] ?? false, selection[1] ?? game),
    roomLimit: (bonus, loop) => rules.roomLimit(bonus, loop, game),
    isOpen: (type, loop, owner = game) => rules.isOpen(type, loop, owner),
    rewards: (zone, type, bonus, random) => rules.rewards(zone, type, bonus, random, game),
    chestReward: (zone, random) => rules.chestReward(zone, random, game)
});
safeExposeGlobals({ atlasEncounters });
