import { effectGetDamageAilmentEffectiveDotScale } from '../domain/ailment-hit-scaling.mjs';
import { effectGetPassiveBleedMultiplier } from '../domain/ailment-probabilities.mjs';

export function hitIsDamageAilmentType(type) {
    return type === 'ignite' || type === 'poison' || type === 'bleed';
}

export function hitGetStoredAilmentHitDamage(ail) {
    if (!ail) return 0;
    return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
}

export function hitGetDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
    let source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    let mul = effectGetDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
    return Math.max(1, Math.floor(source * 0.90 * mul));
}

export function hitGetEnemyDamageAilmentDps(env, ail, pStats) {
    let dps = enemyAilmentBaseDps(ail, pStats);
    dps = scaledEnemyAilmentDps(dps, ail, pStats);
    if (ail && (ail.talentDamageMorePct || 0) > 0) dps = Math.floor(dps * (1 + ail.talentDamageMorePct / 100));
    if (typeof env.deps.getTalentDotDamageMultiplier === 'function') dps = Math.floor(dps * env.deps.getTalentDotDamageMultiplier());
    if (ail && ail.type === 'bleed') dps = Math.floor(dps * effectGetPassiveBleedMultiplier(pStats));
    return dps;
}

function enemyAilmentBaseDps(ail, pStats) {
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    return hitGetDamageAilmentBaseDpsFromHit(hitGetStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
}

function scaledEnemyAilmentDps(dps, ail, pStats) {
    const damageStat = { ignite: 'igniteDamageMultiplierPct', poison: 'poisonDamageMultiplierPct' }[ail?.type];
    dps = Math.floor(dps * (1 + (Math.max(0, Number(pStats?.[damageStat]) || 0) + Math.max(0, Number(pStats?.ailmentDamagePct) || 0)) / 100));
    if (ail && pStats && ail.type === pStats.mystiqueAilmentType) {
        dps = Math.floor(dps * (1 + Math.max(0, Number(pStats.mystiqueAilmentDamagePct) || 0) / 100));
    }
    return dps;
}

export function hitGetPlayerDamageAilmentDps(env, ail, pStats) {
    let source = hitGetStoredAilmentHitDamage(ail);
    let dps = source > 0 ? hitGetDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, 1) : hitGetPlayerDamageAilmentFallbackDps(env, ail ? ail.type : null, ail ? ail.power : 0, pStats);
    if (pStats && pStats.uniqueArmorAppliesToDot) {
        let armor = Math.max(0, Number(pStats.armor) || 0);
        let armorRed = Math.min(0.8, armor / (armor + 1200));
        dps = Math.max(0, Math.floor(dps * (1 - armorRed)));
    }
    return dps;
}

export function hitGetPlayerDamageAilmentFallbackDps(env, type, power, pStats) {
    let stats = pStats || (typeof env.deps.getPlayerStats === 'function' ? env.deps.getPlayerStats() : null);
    let maxHp = Math.max(1, Math.floor((stats && stats.maxHp) || 0));
    if (maxHp <= 1) return 0;
    let p = Math.max(0.1, Number(power || 0.1));
    let perTick = fallbackAilmentTickDamage(type, p, maxHp);
    return perTick > 0 ? perTick * 10 : 0;
}

function fallbackAilmentTickDamage(type, p, maxHp) {
    let perTick = 0;
    if (type === 'ignite') perTick = Math.max(1, Math.floor(maxHp * (0.0035 + p * 0.0040)));
    else if (type === 'poison') perTick = Math.max(1, Math.floor(maxHp * (0.0030 + p * 0.0034)));
    else if (type === 'bleed') perTick = Math.max(1, Math.floor(maxHp * (0.0032 + p * 0.0032)));
    return perTick;
}
