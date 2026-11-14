import { damageEnemyResource, enemyLifeAndShield, enemyLifeDamagePct } from './domain/enemy-resources.mjs';
import { createEnemyRegeneration, ENEMY_REGEN_FATIGUE_MS, ENEMY_REGEN_STEP_MS } from './domain/enemy-regeneration.mjs';
import { createEnemyMitigation } from './domain/enemy-mitigation.mjs';
import { createRegionAffixStats } from './domain/region-affix-stats.mjs';
import { createPlayerRecoveryCaps } from './domain/player-recovery-caps.mjs';
import { createPlayerRecovery } from './domain/player-recovery.mjs';
import { createPlayerWards } from './domain/player-wards.mjs';
// Retire with the classic combat consumers. Resource mutation precedes the existing incident boundary.
const applyDamageToEnemyResource = (enemy, damage) => {
    const dealt = damageEnemyResource(enemy, damage);
    if (dealt === null) return 0;
    combatIncidents.noteDamage(enemy, dealt);
    return dealt;
};
const getEnemyLifeAndShield = enemyLifeAndShield;
const applyEnemyRegen = createEnemyRegeneration({
    clock: () => getCombatTime(),
    conditionDebuffs: enemy => getEnemyConditionDebuffFactor(enemy),
    talentMultiplier: enemy => typeof getTalentEnemyRegenMultiplier === 'function' ? getTalentEnemyRegenMultiplier(enemy) : 1,
    finisherWarningMs: ATLAS_ENDGAME.combo.finisherWarningMs
});
const regionAffixes = createRegionAffixStats(REGION_AFFIX_MODS, REGION_AFFIX_EFFECTS);
const caps = createPlayerRecoveryCaps({ LEECH_SOFTCAP_START, LEECH_SOFTCAP_MID, LEECH_SOFTCAP_MID_EFF,
    LEECH_SOFTCAP_HIGH_EFF, LEECH_BASE_INSTANCE_CAP_PCT, LEECH_BASE_TOTAL_CAP_PCT, LEECH_BASE_RATE_CAP_PCT });
const player = createPlayerRecovery({ caps, lifeCap: stats => getPlayerRecoveryHpCap(stats), ownsKeystone: key => hasKeystone(key) });
const wards = createPlayerWards(() => getCombatTime());
window.GameModules.combat.resources = Object.freeze({ lifeDamagePct: enemyLifeDamagePct, regionAffixes, caps, player, wards });
// State replacement, clock and the late combat constant remain visible at this temporary classic boundary.
const mitigation = createEnemyMitigation({
    clock: () => getCombatTime(), ownsKeystone: key => hasKeystone(key),
    keptResistancePct: () => ASCENDANCY_KEYSTONE_VALUES.iq4.resistanceKeptPct,
    minimumResistance: () => MIN_PENETRATED_RESISTANCE,
    regionAffixes
});
const getEnemyMitigationBeforeWeak = (element, tier, enemy, stats) => mitigation.beforeWeak(element, tier, enemy, stats, game);
const getEffectiveEnemyMitigation = (element, tier, enemy, stats) => mitigation.effective(element, tier, enemy, stats, game);
const getHitEnemyResistance = (element, tier, enemy, stats, curse) => mitigation.hit(element, tier, enemy, { stats, curse, state: game });
const applyVoidWeakMitigation = (enemy, amount) => mitigation.weak(enemy, amount);
const applyAilingTargetDamage = (stats, enemy, element, crit, damages) => mitigation.ailing(enemy, element, crit, damages, { stats, state: game });
safeExposeGlobals({ applyDamageToEnemyResource, getEnemyLifeAndShield, applyEnemyRegen, ENEMY_REGEN_FATIGUE_MS, ENEMY_REGEN_STEP_MS,
    getEnemyMitigationBeforeWeak, getEffectiveEnemyMitigation, getHitEnemyResistance, applyVoidWeakMitigation, applyAilingTargetDamage });
