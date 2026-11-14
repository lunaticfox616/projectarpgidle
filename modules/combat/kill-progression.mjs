

/** Kill records that grow outside the fight: the stump box, the boss variant record (12번 루프 33, js/boss-variants.js) and the nursery's
 * seeds and saps (루프 39, js/stump-nursery.js). */
export function hitRecordKillProgress(env, enemy) {
    if (typeof env.deps.stumpBox === 'object') env.deps.stumpBox.onEnemyKilled(env.owner, enemy, hitLayStumpDrop(env, enemy));
    if (typeof env.deps.bossVariants === 'object') env.deps.combatLootReceipts.capture(env.owner, () => env.deps.bossVariants.onKilled(env.owner, enemy));
    if (typeof env.deps.stumpNursery === 'object') env.deps.stumpNursery.onKilled(env.owner, enemy);
    if (typeof env.deps.weaponMastery === 'object') env.deps.weaponMastery.onKilled(env.owner, enemy);
}

/** The kill's stump box drop, on the floor when there is one; what is left reaches the box at once. */
export function hitLayStumpDrop(env, enemy) {
    const spec = env.deps.stumpBox.rollKillDrop(env.owner, enemy);
    return spec && env.deps.placeFloorItem(enemy, 'stump', spec) ? null : spec;
}
