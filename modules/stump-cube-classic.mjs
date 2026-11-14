import { createStumpCube } from './domain/stump-cube.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createStumpCube({
    get STUMP_CUBE_RECIPES() { return STUMP_CUBE_RECIPES; },
    get contentProgression() { return contentProgression; },
    get stumpBox() { return stumpBox; },
    get equipmentLoadoutRuntime() { return equipmentLoadoutRuntime; },
    get getEquipmentInventoryFootprint() { return getEquipmentInventoryFootprint; },
    get equipmentSockets() { return equipmentSockets; },
    get stumpCubeRecipes() { return stumpCubeRecipes; },
    get _t() { return _t; },
    get withSubjectParticle() { return withSubjectParticle; },
    get ORB_DB() { return ORB_DB; },
    get bagItems() { return bagItems; },
    get STUMP_CUBE_SIZE() { return STUMP_CUBE_SIZE; }
});
const effects = Object.freeze({
    storeCubeEquipment: item => addItemToInventory(item, { guaranteedKeep: true, skipAutoEquip: true }),
    awardCubeCurrency: (key, amount) => awardCurrency(key, amount)
});
const stumpCube = Object.freeze({ ...rules,
    isRevealed: (recipe, state = game) => rules.isRevealed(recipe, state),
    revealed: (state = game) => rules.revealed(state),
    learn: (state = game) => rules.learn(state),
    entries: (state = game) => rules.entries(state),
    clear: (state = game) => rules.clear(state),
    match: (state = game) => rules.match(state),
    missingRecipes: (state = game) => rules.missingRecipes(state),
    preview: (state = game) => rules.preview(state),
    missingCost: (recipe, state = game) => rules.missingCost(recipe, state),
    transmute: (state = game, random = Math.random) => consumeDomainCommands(rules.transmute(state, random), effects),
    candidates: (kind, state = game) => rules.candidates(kind, state),
    readyCubeSets: (state = game) => rules.readyCubeSets(state),
    autoMergeSets: (state = game, filter = 'all') => rules.autoMergeSets(state, filter),
    autoMerge: (state = game, filter = 'all', random = Math.random) => rules.autoMerge(state, filter, random)
});
safeExposeGlobals({ stumpCube });
