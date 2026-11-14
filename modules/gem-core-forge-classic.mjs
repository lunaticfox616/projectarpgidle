import { forgeRuneEffects, forgeRuneTier, forgeRuneEffectText } from './domain/gem-forge-values.mjs';
import { inspectRuneForge, attemptRuneForge } from './domain/gem-core-forge.mjs';

const forgeEnv = { rules: GEM_CORE_FORGE, deps: {
    isUnlocked: (id, owner) => contentProgression.isUnlocked(id, owner),
    enhanceableNames: owner => getEquippedEnhanceableGemNames(owner),
    normalizeGem: record => normalizeGemRecord(record),
    spareCount: (owner, name) => gemDropRewards.spareCount(owner, name),
    takeSpare: (owner, name) => gemDropRewards.takeSpare(owner, name),
    resetMobility: () => mobilitySkill.reset()
} };
const gemCoreForge = Object.freeze({
    effects: record => forgeRuneEffects(forgeEnv.rules, record),
    forSkill: name => forgeRuneEffects(forgeEnv.rules, game.gemData[name]),
    tierOf: level => forgeRuneTier(forgeEnv.rules, level),
    effectText: level => forgeRuneEffectText(forgeEnv.rules, _t, level),
    inspect: (name, options) => inspectRuneForge(forgeEnv, game, name, options),
    attempt: (name, options) => attemptRuneForge(forgeEnv, game, name, options)
});
safeExposeGlobals({ gemCoreForge });
