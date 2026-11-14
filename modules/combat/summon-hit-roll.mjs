import { summonGetSummonSharedDamageIncreasePct } from './summon-damage-rules.mjs';

/** One summon hit on target (none for an estimate): the base hit, its crit, then the target's scales. options.expected averages the
 * roll and the crit; rollOverridePct and forceCrit fix them. Split into its stages on 2026-10-18; the damage and the ailment source
 * damage change in the same order. */
export function summonGetSummonHitDamageInfo(env, s, pStats, target, options) {
    pStats = env.deps.summonSupports.localStats(s, pStats);
    let expected = !!(options && options.expected);
    let ele = s.ele || 'phys';
    let zone = env.deps.getZone(env.owner.currentZoneId) || env.deps.getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    const hit = summonGetSummonBaseHit(env, s, pStats, options, expected);
    summonApplySummonHitCrit(hit, pStats, options, expected);
    env.deps.summonSupports.scaleHit(hit, { s, pStats, target, ele, zone, zoneTier, expected });
    const converted = pStats.summonSupportEffects.conversion;
    return { damage: Math.max(0, Math.floor(hit.dmg)), ailmentSourceDamage: Math.max(0, Math.floor(hit.ailmentSourceDmg)), crit: hit.crit, critChance: hit.critChance, element: converted?.pct === 100 ? converted.element : ele, parts: hit.parts };
}

/** The hit before crits: base damage (keystone sb1 more), increases and efficiency, the summon's roll and keystone sb7's share of the
 * hero's attack power. */
export function summonGetSummonBaseHit(env, s, pStats, options, expected) {
    let base = Math.max(1, Math.floor(s.baseDamage || 20));
    if (env.deps.hasKeystone('sb1')) base = Math.max(1, Math.floor(base * (1 + env.deps.ASCENDANCY_KEYSTONE_VALUES.sb1.summonBaseMorePct / 100)));
    let dmgMul = summonGetSummonHitDamageMultiplier(env, s, pStats);
    const { critChance, critMul } = summonGetSummonCritProfile(env, s, pStats);
    const hit = { dmg: Math.max(1, base * dmgMul), ailmentSourceDmg: Math.max(1, base * dmgMul), crit: false, critChance, critMul };
    let rollPct = summonGetSummonHitRollPct(s, options, expected);
    hit.dmg *= rollPct / 100;
    hit.ailmentSourceDmg *= rollPct / 100;
    // 상호 보완(sb7): 플레이어 공격력(타격당 기본 피해)의 일부(ASCENDANCY_KEYSTONE_VALUES.sb7)를 소환수 타격에 가산(치명타 적용 전).
    if (env.deps.hasKeystone('sb7')) {
        let sbPlayerShare = env.deps.ASCENDANCY_KEYSTONE_VALUES.sb7.sharePct / 100 * Math.max(0, Number((pStats && pStats.sbPlayerAttackPower) || 0));
        if (sbPlayerShare > 0) {
            hit.dmg += sbPlayerShare;
            hit.ailmentSourceDmg += sbPlayerShare;
        }
    }
    return hit;
}

/** Crit chance 5% to 95% and crit damage at least 120%: the summon's own plus the hero's summon crit stats. */
export function summonGetSummonCritProfile(env, s, pStats) {
    pStats = env.deps.summonSupports.localStats(s, pStats);
    let critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    let critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    return { critChance, critMul };
}

export function summonGetSummonHitDamageMultiplier(env, s, pStats) {
    pStats = env.deps.summonSupports.localStats(s, pStats);
    let sharedIncreasePct = summonGetSummonSharedDamageIncreasePct(env, s, pStats);
    // 소환수 효율은 피해 증가(소환수 피해/공유)와 합산이 아니라 별도 곱연산으로 적용합니다.
    let dmgMul = (1 + ((pStats.summonPctDmg || 0) + sharedIncreasePct) / 100)
        * (1 + ((pStats.summonEfficiency || 0) / 100)) * env.deps.gemCoreForge.forSkill(s.gemName).damage;
    if (s.role === 'attack' && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) {
        dmgMul *= 1 + Math.max(0, Number(pStats.passiveSoleMinionLostCap) || 0) * 0.75;
    }
    return dmgMul * pStats.summonSupportEffects.damageMultiplier;
}

/** 소환수마다 다른 일격 편차(dmgRollMinPct~100%): 버스트형(화염 위습 등)은 편차가 크고 연사형(냉기 위습 등)은 작아, "최소 피해"가
 * 최대 피해 대비 지나치게 미미해지지 않게 한다. An estimate takes the middle; rollOverridePct fixes it. */
export function summonGetSummonHitRollPct(s, options, expected) {
    let rollMinPct = Math.max(1, Math.min(100, Math.floor(s.dmgRollMinPct || 40)));
    if (Number.isFinite(options && options.rollOverridePct)) return Math.max(1, Math.min(100, options.rollOverridePct));
    return expected ? ((rollMinPct + 100) / 2) : (rollMinPct + Math.random() * (100 - rollMinPct));
}

/** The crit: an estimate averages it; forceCrit decides it; else a roll. A unique can make a hit that does not crit deal nothing. */
export function summonApplySummonHitCrit(hit, pStats, options, expected) {
    if (expected) {
        hit.dmg *= pStats.uniqueSummonNonCritNoDamage ? (hit.critChance * hit.critMul) : ((1 - hit.critChance) + (hit.critChance * hit.critMul));
        return;
    }
    const forced = typeof (options && options.forceCrit) === 'boolean';
    const crits = forced ? options.forceCrit : Math.random() < hit.critChance;
    if (crits) {
        hit.dmg *= hit.critMul;
        hit.crit = true;
    } else if (pStats.uniqueSummonNonCritNoDamage) {
        hit.dmg = 0;
        hit.ailmentSourceDmg = 0;
    }
}

/** Scales both parts of the hit by mul and floors them (each step floors). */
export function summonScaleSummonHit(hit, mul) {
    hit.dmg = Math.floor(hit.dmg * mul);
    hit.ailmentSourceDmg = Math.floor(hit.ailmentSourceDmg * mul);
}
