import { summonGetSummonAverageSharedIncreasePct, summonGetSummonAttackIntervalMs, summonGetLimitedSummonPenetrationStats } from '../combat/summon-damage-rules.mjs';
import { summonGetSummonHitDamageInfo, summonGetSummonCritProfile } from '../combat/summon-hit-roll.mjs';
import { coreGetSummonProfile } from '../combat/core-summons.mjs';
import { summonGetSummonGemLevel, summonGetSummonMaxHp, summonGetSummonEvasionRating, summonGetSummonRegenPerSec } from '../combat/summon-growth.mjs';
import { summonEstimateHitProfile } from '../combat/summon-dps.mjs';
import { summonGetSummonRedirectPct } from '../combat/summon-runtime-stats.mjs';

export function summonBuildSummonDpsDescriptionGroup(env, row, pStats, estimate, sbShare) {
    const { s, hit, dps } = estimate;
    pStats = env.deps.summonSupports.localStats(s, pStats);
    const sharedInc = summonGetSummonAverageSharedIncreasePct(env, s, pStats);
    const dmgMul = (1 + (((pStats.summonPctDmg || 0) + sharedInc) / 100)) * (1 + ((pStats.summonEfficiency || 0) / 100))
        * pStats.summonSupportEffects.damageMultiplier;
    const ownAttackPower = (s.baseDamage * dmgMul * env.deps.gemCoreForge.effects(env.owner.gemData?.[s.gemName]).damage) + sbShare;
    const critChance = Math.max(0.05, Math.min(0.95, ((s.crit || 0) + (pStats.summonCrit || 0)) / 100));
    const critMul = Math.max(1.2, ((s.critDmg || 140) + (pStats.summonCritDmg || 0)) / 100);
    const aps = 1000 / summonGetSummonAttackIntervalMs(env, pStats, s);
    const penResPen = summonGetLimitedSummonPenetrationStats(env, pStats, s).resPen;
    return { gemLv: row.gemLevel, s, sharedInc, dmgMul, ownAttackPower, critChance, critMul, aps, penResPen, hit, dps, count: 0 };
}

export function summonDescribeSummonDps(env, rows, estimates, pStats, activeCount) {
    const groups = new Map();
    const sbActive = env.deps.hasKeystone('sb7');
    const sbShare = sbActive ? 0.5 * Math.max(0, Number(pStats.sbPlayerAttackPower || 0)) : 0;
    rows.forEach(row => {
        const estimate = estimates.get(`${row.gemLevel}:${row.name}`);
        if (!estimate) return;
        if (!groups.has(row.name)) groups.set(row.name, summonBuildSummonDpsDescriptionGroup(env, row, pStats, estimate, sbShare));
        groups.get(row.name).count++;
    });
    const lines = [env.deps._t('공격 소환수 {activeCount}기, 소환수별 공격 주기로 합산', { activeCount })];
    groups.forEach((group, name) => lines.push(...summonDescribeSummonDpsGroup(env, name, group, pStats, sbShare)));
    if (sbActive && sbShare > 0) {
        lines.push(env.deps._t('상호 보완: 내 공격력 {floor}의 50%(+{floor2})가 소환수 타격마다 가산', { floor: Math.floor(pStats.sbPlayerAttackPower), floor2: Math.floor(sbShare) }));
    }
    if (rows.length > activeCount) lines.push(env.deps._t('방어/보조 소환수 {count}기는 DPS에서 제외', { count: rows.length - activeCount }));
    lines.push(env.deps._t('소환수 공격력은 피해 증가가 적용된 값이며, 적 저항/최종 피해/보스 피해/관통은 소환수 제한 계수로 반영됩니다.'));
    if (rows.some(row => row.duplicateIndex > 0)) lines.push(env.deps._t('남는 소환수 한도는 공격 소환수 중복 소환으로 사용'));
    return lines;
}

export function summonDescribeSummonDpsGroup(env, name, g, pStats, sbShare) {
    const lines = [];
    const eleLabel = ele => env.deps._t(typeof env.deps.getDamageElementLabel === 'function' ? env.deps.getDamageElementLabel(ele) : (ele || 'phys'));
    let mute = (txt) => `<span style="color:var(--copy-muted);">${txt}</span>`;
    const elements = (env.deps.wispSummons.elements(name) || [g.s.ele]).map(eleLabel).join('/');
    lines.push(`<span style="color:var(--copy-bright); font-weight:600;">${env.deps._t(name)}${g.count > 1 ? ` ×${g.count}` : ''}</span>, ${env.deps._t('룬 Lv.{level}', { level: g.gemLv })}, ${elements}`);
    lines.push(mute(env.deps._t('&nbsp;&nbsp;공격력 {floor} = 기본 피해 {floor2} × 피해증가 {dmgMul}{bonus}', { floor: Math.floor(g.ownAttackPower), floor2: Math.floor(g.s.baseDamage), dmgMul: g.dmgMul.toFixed(2), bonus: sbShare > 0 ? env.deps._t(' + 상호보완 {floor}', { floor: Math.floor(sbShare) }) : '' })));
    lines.push(mute(env.deps._t('&nbsp;&nbsp;피해 증가 {floor}% (소환수 피해 {floor2}% + 공유 {floor3}%) × 효율 +{floor4}% = ×{dmgMul}', { floor: Math.floor((pStats.summonPctDmg || 0) + g.sharedInc), floor2: Math.floor(pStats.summonPctDmg || 0), floor3: Math.floor(g.sharedInc), floor4: Math.floor(pStats.summonEfficiency || 0), dmgMul: g.dmgMul.toFixed(2) })));
    lines.push(mute(env.deps._t('&nbsp;&nbsp;치명타 {value}% × 피해 {floor}%, 공속 {aps}/초, 저항 관통 {floor2}%', { value: (g.critChance * 100).toFixed(1), floor: Math.floor(g.critMul * 100), aps: g.aps.toFixed(2), floor2: Math.floor(g.penResPen) })));
    lines.push(mute(env.deps._t('&nbsp;&nbsp;기대 타격 {floor} → 1기당 {floor2} DPS (적 저항/제한 계수 반영)', { floor: Math.floor(g.hit.damage), floor2: Math.floor(g.dps) })));
    return lines;
}

/** Lowest (low roll, no crit) to highest (full roll, crit) hit; a wisp that rolls its element per attack spans them all. */
export function summonGetSummonTooltipHitRange(env, hitProfile, stats) {
    const profiles = (env.deps.wispSummons.elements(hitProfile.gemName) || [hitProfile.ele]).map(ele => ({ ...hitProfile, ele }));
    const hits = options => profiles.map(profile => summonGetSummonHitDamageInfo(env, profile, stats, null, options).damage || 1);
    return {
        min: Math.min(...hits({ rollOverridePct: hitProfile.dmgRollMinPct, forceCrit: false })),
        max: Math.max(...hits({ rollOverridePct: 100, forceCrit: true }))
    };
}

export function summonGetSummonTooltipPreview(env, gemName, pStats) {
    let stats = summonTooltipStats(env, gemName, pStats);
    let profile = coreGetSummonProfile(gemName);
    let gemLv = summonGetSummonGemLevel(env, gemName, env.deps.SUPPORT_GEM_DB[gemName] ? 'support' : 'skill', stats);
    let hitProfile = summonEstimateHitProfile(gemName, profile, gemLv, stats);
    // 실제 전투에서 나올 수 있는 진짜 최소(편차 하한 · 비치명타)~최대(편차 상한 · 치명타) 피해를
    // 그대로 보여준다(이전에는 배율 적용 전 원시 기본값을 "최소"로 잘못 표시했음).
    let hitRange = summonGetSummonTooltipHitRange(env, hitProfile, stats);
    let maxHp = Math.max(1, Math.floor(summonGetSummonMaxHp(profile, gemLv, stats) * env.deps.summonSupports.hpMultiplier(stats)));
    let evasion = summonGetSummonEvasionRating(profile, gemLv, stats);
    const crit = summonGetSummonCritProfile(env, hitProfile, stats);
    return {
        roleLabel: profile.role === 'guard' ? '방어 소환수' : '공격 소환수',
        trait: profile.trait || '',
        gemLevel: gemLv,
        maxHp: maxHp,
        regenPerSec: summonGetSummonRegenPerSec(maxHp),
        evasion: evasion,
        evadeChancePct: Math.round(env.deps.getSummonEvadeChance({ evasion: evasion }, null) * 10) / 10,
        hitDamageMin: Math.max(1, Math.floor(hitRange.min)),
        hitDamageMax: Math.max(1, Math.floor(hitRange.max)),
        attackPerSecond: profile.role === 'guard' ? 0 : (Math.round((1000 / summonGetSummonAttackIntervalMs(env, stats, hitProfile)) * 100) / 100),
        critChancePct: Math.round(crit.critChance * 1000) / 10,
        critDmgPct: Math.round(crit.critMul * 100),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        redirectPct: profile.role === 'guard' || env.deps.hasKeystone('sb2') ? summonGetSummonRedirectPct(env, stats) : 0
    };
}

function summonTooltipStats(env, gemName, pStats) {
    const stats = pStats || (typeof env.deps.getPlayerStats === 'function' ? env.deps.getPlayerStats() : null) || {};
    return env.deps.summonSupports.localStats({ gemName }, stats);
}
