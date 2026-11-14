

/** A picked-up memory leaf (js/memory-leaves.js): counted, then announced ('memory-leaf', js/memory-leaves-ui.js). */
export function* atlasFindReceiveMemoryLeaf(env, owner, id) {
    const result = env.deps.memoryLeaves.receive(owner, id);
    if (!result) return result;
    env.deps.combatLootReceipts.leaf(owner, id);
    (yield { kind: 'atlasFindEffectDispatchRuntimeEvent', args: ['memory-leaf', result] });
    return result;
}

/** A leaf waits on the map floor like other drops (offline or off a map it is received at once). */
export function* atlasFindGrantMemoryLeaf(env, owner, enemy, id) {
    const run = env.deps.explorationFloorFor(enemy);
    if (run) env.deps.actExplorationState.groundLoot.placeLeaf(run, enemy, id);
    else (yield* atlasFindReceiveMemoryLeaf(env, owner, id));
}
