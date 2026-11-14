

/** Core items, the stump box and weapon mastery (js/weapon-mastery.js): account-wide reward lines of getPlayerStats. */
export function hitApplyAccountRewardStats(env, reward) {
    env.deps.coreItems.stats().forEach(stat => env.deps.addStatToBucket(reward, stat.id, stat.val));
    if (typeof env.deps.stumpBox === 'object') env.deps.stumpBox.applyStats(reward, env.owner);
    if (typeof env.deps.weaponMastery === 'object') env.deps.weaponMastery.applyStats(reward, env.owner);
}
