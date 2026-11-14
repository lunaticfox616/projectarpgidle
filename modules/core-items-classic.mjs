import { createCoreItems } from './domain/core-items.mjs';
// Same public surface and script slot until consumers use the native composition root.
const cores = createCoreItems({ options: CORE_OPTION_POOL, rules: CORE_ITEM_RULES }, {
    translate: (...args) => _t(...args), nextId: () => ++window.GameModules.state.session.itemIdCounter, random: () => Math.random(),
    get visuals() { return ITEM_VISUAL_ASSET_DB; }, isUnlocked: (id, state) => contentProgression.isUnlocked(id, state)
});
const coreItems = Object.freeze({ ...cores,
    stats: (state = game) => cores.stats(state), canDrop: (state = game) => cores.canDrop(state),
    resetForLoop: (state = game) => cores.resetForLoop(state), ownedItems: (state = game) => cores.ownedItems(state),
    // Legacy convenience only: core rules never depend on the bag that normalizes cores.
    keep: (core, state = game) => bagItems.addCore(core, state)
});
safeExposeGlobals({ coreItems });
