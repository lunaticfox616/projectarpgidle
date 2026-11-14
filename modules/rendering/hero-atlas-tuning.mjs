import { clampNumber } from '../common/numbers.mjs';

export function getLocalBattleHeroVisualTuning(heroId, spriteScale) {
    const defaultTuning = {
        baseHeight: 63,
        minHeight: 58,
        maxHeight: 71,
        downShrink: 7,
        minScaleBoost: 0.56,
        maxScaleBoost: 1.12,
        shadowWidth: 11.5,
        shadowHeight: 4.6,
        shadowAlpha: 0.18,
        offsetY: 0
    };
    const tuningByHero = {
        hero1: { baseHeight: 63, maxHeight: 71 },
        hero2: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero3: { baseHeight: 63, maxHeight: 71 },
        hero4: { baseHeight: 62, maxHeight: 70 },
        hero5: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero6: { baseHeight: 62, maxHeight: 70 },
        hero7: { baseHeight: 63, maxHeight: 71 },
        hero8: { baseHeight: 65, maxHeight: 73, shadowWidth: 12.5 },
        hero9: { baseHeight: 63, maxHeight: 71 },
        hero10: { baseHeight: 63, maxHeight: 71 },
        occultist: { baseHeight: 63, maxHeight: 71 },
        wanderer: { baseHeight: 63, maxHeight: 71 },
        cleric: { baseHeight: 64, maxHeight: 72 },
        archer: { baseHeight: 63, maxHeight: 71 },
        alchemist: { baseHeight: 63, maxHeight: 71 },
        warrior: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 }
    };
    let tuning = { ...defaultTuning, ...(tuningByHero[heroId] || {}) };
    let requestedScale = Number(spriteScale);
    tuning.scaleBoost = Number.isFinite(requestedScale) && requestedScale > 0
        ? clampNumber(requestedScale / 1.85, tuning.minScaleBoost, tuning.maxScaleBoost)
        : 1;
    return tuning;
}

export function pickAttackVariantCycle(cycles, configuredWeights, seed) {
    let variants = Array.isArray(cycles)
        ? cycles.filter(cycle => Array.isArray(cycle) && cycle.length > 0)
        : [];
    if (variants.length === 0) return null;
    let variantSeed = clampNumber(Number(seed) || 0, 0, 0.999999);
    let uniformVariant = variants[Math.floor(variantSeed * variants.length)];
    if (!Array.isArray(configuredWeights) || configuredWeights.length !== variants.length) {
        return uniformVariant;
    }
    let weights = configuredWeights.map(weight => Math.max(0, Number(weight) || 0));
    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return uniformVariant;
    let weightedRoll = variantSeed * totalWeight;
    for (let index = 0; index < weights.length; index++) {
        weightedRoll -= weights[index];
        if (weightedRoll < 0) return variants[index];
    }
    return variants[variants.length - 1];
}
