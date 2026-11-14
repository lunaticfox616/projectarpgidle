import { bloomPreciseGetPreciseTalentLevel, bloomPreciseGetPreciseTalentRatio } from './talent-precise-levels.mjs';
import { bloomPreciseGetTalentPreciseDerivedBonuses, bloomPreciseGetTalentAttackSpeedSoftcapKnee, bloomPreciseApplyTalentPrecisePostStats, bloomPreciseGetTalentRemainingResonance } from './talent-precise-stats.mjs';
import { bloomPreciseRollTalentPlayerCrit, bloomPreciseGetTalentCritDamageMultiplier, bloomPreciseGetTalentPrecisePlayerHitMultiplier, bloomPreciseGetTalentDotDamageMultiplier, bloomPreciseGetTalentButcherBossMultiplier, bloomPreciseGetTalentDamageConversion } from './talent-precise-damage.mjs';
import { bloomPreciseGetTalentAilmentReplacement, bloomPreciseShouldTalentSkipColdFreeze, bloomPreciseEnhanceTalentAilmentReapplication, bloomPreciseDecorateTalentAilmentPayload, bloomPreciseAfterTalentAilmentApplied, bloomPreciseStoreExpiredTalentAilmentSeed, bloomPreciseGetTalentDotOccupancyDamage, bloomPreciseGetTalentEnemyRegenMultiplier } from './talent-precise-ailments.mjs';
import { bloomPreciseIsTalentMonsterAlwaysHit, bloomPreciseIsTalentPlayerAttackDisabled, bloomPreciseEnforceTalentCombatState } from './talent-precise-limits.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createTalentPrecise(deps) {
    const env = { deps };

    return Object.freeze({
        getPreciseTalentLevel: (...args) => bloomPreciseGetPreciseTalentLevel(env, ...args),
        getPreciseTalentRatio: (...args) => bloomPreciseGetPreciseTalentRatio(env, ...args),
        getTalentPreciseDerivedBonuses: (...args) => bloomPreciseGetTalentPreciseDerivedBonuses(env, ...args),
        getTalentAttackSpeedSoftcapKnee: (...args) => bloomPreciseGetTalentAttackSpeedSoftcapKnee(env, ...args),
        applyTalentPrecisePostStats: (...args) => bloomPreciseApplyTalentPrecisePostStats(env, ...args),
        rollTalentPlayerCrit: (...args) => bloomPreciseRollTalentPlayerCrit(env, ...args),
        getTalentCritDamageMultiplier: (...args) => bloomPreciseGetTalentCritDamageMultiplier(env, ...args),
        getTalentPrecisePlayerHitMultiplier: (...args) => bloomPreciseGetTalentPrecisePlayerHitMultiplier(env, ...args),
        getTalentRemainingResonance: (...args) => bloomPreciseGetTalentRemainingResonance(env, ...args),
        getTalentDotDamageMultiplier: (...args) => bloomPreciseGetTalentDotDamageMultiplier(env, ...args),
        getTalentButcherBossMultiplier: (...args) => bloomPreciseGetTalentButcherBossMultiplier(env, ...args),
        getTalentDamageConversion: (...args) => bloomPreciseGetTalentDamageConversion(env, ...args),
        getTalentAilmentReplacement: (...args) => bloomPreciseGetTalentAilmentReplacement(env, ...args),
        shouldTalentSkipColdFreeze: (...args) => bloomPreciseShouldTalentSkipColdFreeze(env, ...args),
        enhanceTalentAilmentReapplication: (...args) => bloomPreciseEnhanceTalentAilmentReapplication(env, ...args),
        decorateTalentAilmentPayload: (...args) => bloomPreciseDecorateTalentAilmentPayload(env, ...args),
        afterTalentAilmentApplied: (...args) => bloomPreciseAfterTalentAilmentApplied(env, ...args),
        storeExpiredTalentAilmentSeed: (...args) => bloomPreciseStoreExpiredTalentAilmentSeed(env, ...args),
        getTalentDotOccupancyDamage: (...args) => bloomPreciseGetTalentDotOccupancyDamage(env, ...args),
        getTalentEnemyRegenMultiplier: (...args) => bloomPreciseGetTalentEnemyRegenMultiplier(env, ...args),
        isTalentMonsterAlwaysHit: (...args) => bloomPreciseIsTalentMonsterAlwaysHit(env, ...args),
        isTalentPlayerAttackDisabled: (...args) => bloomPreciseIsTalentPlayerAttackDisabled(env, ...args),
        enforceTalentCombatState: (...args) => bloomPreciseEnforceTalentCombatState(env, ...args)
    });
}
