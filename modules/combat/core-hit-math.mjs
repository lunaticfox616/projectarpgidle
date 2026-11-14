import { ARMOR_MITIGATION_SCALE, EVASION_ACCURACY_SCALE, SUMMON_EVASION_CAP_PCT, EVASION_ENTROPY_RESET_MS, PLAYER_ACCURACY_PER_LEVEL, PLAYER_ACCURACY_PER_DEXTERITY, PLAYER_ACCURACY_BASE } from '../combat/core-values.mjs';

/** @param {number} damage @param {number} chancePct @param {number} damagePct @param {boolean} overflow */
export function coreGetAverageCriticalHitDamage(damage, chancePct, damagePct, overflow) {
    let chance = Math.max(0, chancePct / 100);
    if (!overflow) chance = Math.min(1, chance);
    return damage * (1 + (Math.max(1, damagePct / 100) - 1) * chance);
}

export function coreApplyCritDamageSoftcap(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    let capped = Math.min(raw, 200);
    if (raw > 200) capped += (Math.min(raw, 400) - 200) * 0.95;
    if (raw > 400) capped += (Math.min(raw, 800) - 400) * 0.90;
    if (raw > 800) capped += (Math.min(raw, 1200) - 800) * 0.80;
    if (raw > 1200) capped += (raw - 1200) * 0.67;
    return capped;
}

export function coreGetCritDamageSoftcapReduction(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    return Math.max(0, raw - coreApplyCritDamageSoftcap(raw));
}

export function coreGetArmorPhysicalReductionPct(armor, incomingPhysical) {
    let armorValue = Math.max(0, Number(armor) || 0);
    let hitValue = Math.max(1, Number(incomingPhysical) || 1);
    return Math.min(90, (armorValue / (armorValue + hitValue * ARMOR_MITIGATION_SCALE)) * 100);
}

export function coreGetEvasionChancePct(evasion, enemyAccuracy) {
    let evasionValue = Math.max(0, Number(evasion) || 0);
    let accuracyValue = Math.max(1, Number(enemyAccuracy) || 1);
    return Math.min(90, (evasionValue / (evasionValue + accuracyValue * EVASION_ACCURACY_SCALE)) * 100);
}

export function coreGetEnemyAccuracyForZone(zone) {
    let tier = Math.max(1, Number(zone && zone.tier) || 1);
    return Math.max(60, Math.floor(90 + tier * 24));
}

export function coreGetCombatEnemyAccuracy(env, enemy) {
    let explicitAccuracy = Number(enemy && enemy.accuracy);
    if (Number.isFinite(explicitAccuracy) && explicitAccuracy > 0) return explicitAccuracy;
    return coreGetEnemyAccuracyForZone(env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0));
}

export function coreGetSummonEvadeChance(env, summon, enemy) {
    let rating = Math.max(0, Number(summon && summon.evasion) || 0);
    return Math.min(SUMMON_EVASION_CAP_PCT, coreGetEvasionChancePct(rating, coreGetCombatEnemyAccuracy(env, enemy)));
}

export function coreResolveEntropyEvasion(env, defender, evadeChance, now) {
    let chance = Math.max(0, Math.min(90, Number(evadeChance) || 0));
    if (chance <= 0 || !defender || typeof defender !== 'object') return false;
    let hitChance = 100 - chance;
    let currentTime = Number.isFinite(now) ? now : env.deps.getCombatTime();
    let state = env.memo.evasionEntropyByDefender.get(defender);
    if (!state || currentTime - state.lastAt > EVASION_ENTROPY_RESET_MS) {
        state = { value: Math.floor(env.deps.random() * 100), lastAt: currentTime };
    }
    state.lastAt = currentTime;
    state.value += hitChance;
    let wasHit = state.value >= 100;
    if (wasHit) state.value -= 100;
    env.memo.evasionEntropyByDefender.set(defender, state);
    return !wasHit;
}

export function coreCalculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct) {
    let levelPart = Math.max(1, Math.floor(Number(level) || 1)) * PLAYER_ACCURACY_PER_LEVEL;
    let dexterityPart = Math.max(0, Number(dexterity) || 0) * PLAYER_ACCURACY_PER_DEXTERITY;
    let itemPart = Math.max(0, Number(flatAccuracy) || 0);
    let multiplier = 1 + Math.max(0, Number(bonusPct) || 0) / 100;
    return Math.max(1, Math.floor((PLAYER_ACCURACY_BASE + levelPart + dexterityPart + itemPart) * multiplier));
}

export function coreGetEnemyTotalEvadeChance(enemy, playerAccuracy) {
    if (!enemy) return 0;
    let flatChance = Math.max(0, Number(enemy.evasionChance) || 0);
    let ratingChance = coreGetEvasionChancePct(Math.max(0, enemy.evasion || 0), Math.max(1, playerAccuracy || 1));
    return Math.min(70, flatChance + Math.min(45, ratingChance * 0.65));
}
