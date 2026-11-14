import { createCosmosRules } from './domain/cosmos-rules.mjs';

const rules = createCosmosRules({
    get COSMOS_EXPEDITION_DIRECTIVE_DB() { return globalThis.COSMOS_EXPEDITION_DIRECTIVE_DB; },
    get createSeededRng() { return createSeededRng; },
    get COSMOS_MECHANIC_DB() { return globalThis.COSMOS_MECHANIC_DB; },
    get _t() { return _t; },
    get MONSTER_LOOP_GROWTH() { return MONSTER_LOOP_GROWTH; },
    get getMaximumBossPatternDamageMultiplier() { return getMaximumBossPatternDamageMultiplier; },
    get ENEMY_CRITICAL_DAMAGE_MULTIPLIER() { return ENEMY_CRITICAL_DAMAGE_MULTIPLIER; }
});
const getCosmosExpeditionDirectiveChoices = rules.getCosmosExpeditionDirectiveChoices;
const resolveCosmosMechanic = rules.resolveCosmosMechanic;
const getCosmosGalaxyBossMechanic = rules.getCosmosGalaxyBossMechanic;
const getCosmosBossPatternState = rules.getCosmosBossPatternState;
const calculateCosmosDifficultyTarget = rules.calculateCosmosDifficultyTarget;
const evaluateCosmosReadiness = rules.evaluateCosmosReadiness;
safeExposeGlobals({ getCosmosExpeditionDirectiveChoices, resolveCosmosMechanic, getCosmosGalaxyBossMechanic, getCosmosBossPatternState, calculateCosmosDifficultyTarget, evaluateCosmosReadiness });
