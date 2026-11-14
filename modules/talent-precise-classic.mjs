import { createTalentPrecise } from './domain/talent-precise.mjs';

const rules = createTalentPrecise({
    get isTalentCardActive() { return typeof isTalentCardActive === 'undefined' ? undefined : isTalentCardActive; },
    get applyCritDamageSoftcap() { return typeof applyCritDamageSoftcap === 'undefined' ? undefined : applyCritDamageSoftcap; },
    get getEvasionChancePct() { return typeof getEvasionChancePct === 'undefined' ? undefined : getEvasionChancePct; },
    get gemDropRewards() { return gemDropRewards; },
    get getSupportTierResonanceCost() { return typeof getSupportTierResonanceCost === 'undefined' ? undefined : getSupportTierResonanceCost; },
    get SUPPORT_GEM_DB() { return typeof SUPPORT_GEM_DB === 'undefined' ? undefined : SUPPORT_GEM_DB; },
    talentRandom: () => Math.random(),
    get getEnemyDamageAilmentDps() { return getEnemyDamageAilmentDps; },
    get applyDamageToEnemyResource() { return applyDamageToEnemyResource; },
    get getPlayerAilmentChance() { return getPlayerAilmentChance; },
    get isDamageAilmentType() { return isDamageAilmentType; }
});

const getPreciseTalentLevel = (...args) => rules.getPreciseTalentLevel(game, ...args);
const getPreciseTalentRatio = (...args) => rules.getPreciseTalentRatio(game, ...args);
const getTalentPreciseDerivedBonuses = (...args) => rules.getTalentPreciseDerivedBonuses(game, ...args);
const getTalentAttackSpeedSoftcapKnee = (...args) => rules.getTalentAttackSpeedSoftcapKnee(game, ...args);
const applyTalentPrecisePostStats = (...args) => rules.applyTalentPrecisePostStats(game, ...args);
const rollTalentPlayerCrit = (...args) => rules.rollTalentPlayerCrit(game, ...args);
const getTalentCritDamageMultiplier = (...args) => rules.getTalentCritDamageMultiplier(game, ...args);
const getTalentPrecisePlayerHitMultiplier = (...args) => rules.getTalentPrecisePlayerHitMultiplier(game, ...args);
const getTalentRemainingResonance = (...args) => rules.getTalentRemainingResonance(game, ...args);
const getTalentDotDamageMultiplier = (...args) => rules.getTalentDotDamageMultiplier(game, ...args);
const getTalentButcherBossMultiplier = (...args) => rules.getTalentButcherBossMultiplier(game, ...args);
const getTalentDamageConversion = (...args) => rules.getTalentDamageConversion(game, ...args);
const getTalentAilmentReplacement = (...args) => rules.getTalentAilmentReplacement(game, ...args);
const shouldTalentSkipColdFreeze = (...args) => rules.shouldTalentSkipColdFreeze(game, ...args);
const enhanceTalentAilmentReapplication = (...args) => rules.enhanceTalentAilmentReapplication(game, ...args);
const decorateTalentAilmentPayload = (...args) => rules.decorateTalentAilmentPayload(game, ...args);
const afterTalentAilmentApplied = (...args) => rules.afterTalentAilmentApplied(game, ...args);
const storeExpiredTalentAilmentSeed = (...args) => rules.storeExpiredTalentAilmentSeed(game, ...args);
const getTalentDotOccupancyDamage = (...args) => rules.getTalentDotOccupancyDamage(game, ...args);
const getTalentEnemyRegenMultiplier = (...args) => rules.getTalentEnemyRegenMultiplier(game, ...args);
const isTalentMonsterAlwaysHit = (...args) => rules.isTalentMonsterAlwaysHit(game, ...args);
const isTalentPlayerAttackDisabled = (...args) => rules.isTalentPlayerAttackDisabled(game, ...args);
const enforceTalentCombatState = (...args) => rules.enforceTalentCombatState(game, ...args);
safeExposeGlobals({ getPreciseTalentLevel, getPreciseTalentRatio, getTalentPreciseDerivedBonuses, getTalentAttackSpeedSoftcapKnee, applyTalentPrecisePostStats, rollTalentPlayerCrit, getTalentCritDamageMultiplier, getTalentPrecisePlayerHitMultiplier, getTalentRemainingResonance, getTalentDotDamageMultiplier, getTalentButcherBossMultiplier, getTalentDamageConversion, getTalentAilmentReplacement, shouldTalentSkipColdFreeze, enhanceTalentAilmentReapplication, decorateTalentAilmentPayload, afterTalentAilmentApplied, storeExpiredTalentAilmentSeed, getTalentDotOccupancyDamage, getTalentEnemyRegenMultiplier, isTalentMonsterAlwaysHit, isTalentPlayerAttackDisabled, enforceTalentCombatState });
