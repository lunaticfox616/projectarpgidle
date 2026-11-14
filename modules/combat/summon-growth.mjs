import { getGemHighLevelGrowth } from '../domain/gem-growth.mjs';
import { coreGetSummonProfile } from './core-summons.mjs';
import { summonGetSummonAverageSharedIncreasePct } from './summon-damage-rules.mjs';
import { SUMMON_EVASION_POST_20_STEP_MULTIPLIER, SUMMON_EFFICIENCY_EVASION_RATIO } from './core-values.mjs';
import { SUMMON_REGEN_PCT_PER_SEC } from './summon-values.mjs';

export function summonGetSummonGemLevel(env, gemName, source, pStats, evaluation) {
    let isSupport = source === 'support';
    let records = isSupport ? (env.owner.supportGemData || {}) : (env.owner.gemData || {});
    let record = records[gemName] || {};
    let baseLevel = Math.max(1, record.level || 1);
    let sources = env.deps.getTargetGemBonusSources(gemName, pStats && pStats.gemBonusSources, undefined, evaluation);
    let bonus = Math.max(0, Math.floor((sources && sources.total) || 0));
    let engraveBonus = typeof env.deps.getGemSkyEnhanceGemLevelBonus === 'function' ? env.deps.getGemSkyEnhanceGemLevelBonus(gemName) : 0;
    // 활성 스킬룬, 룬 표시와 같은 재료 레벨(getSkillRuneBonusLevels: 군주의핵 + 창공의힘 + 각성 + 응축창공). 이게 빠져 있으면 소환 공격 룬에
    // 이 재료들을 투자해도 룬 자체의 "총 레벨" 표시만 오르고 실제 소환수 전투력은 그대로였다.
    let materialBonus = summonMaterialLevelBonus(env, gemName, record, isSupport);
    return Math.max(1, baseLevel + bonus + engraveBonus + materialBonus);
}

function summonMaterialLevelBonus(env, gemName, record, isSupport) {
    let isGem = !isSupport && typeof env.deps.SKILL_DB !== 'undefined' && env.deps.SKILL_DB[gemName] && env.deps.SKILL_DB[gemName].isGem;
    return isGem ? env.deps.getSkillRuneBonusLevels(gemName, record).materialBonus : 0;
}

export function summonGetAttackSummonGrowthSteps(gemLv) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
    let pre10Steps = Math.min(8, levelSteps);
    let level10Steps = Math.min(11, Math.max(0, levelSteps - 8));
    // 레벨 21~30 구간(80 → 130으로 상향)과 레벨 31+ 구간(신설, 스텝당 260)을 분리해
    // 20레벨 이상 스케일링을 전반적으로 올리고, 30레벨을 넘기면 훨씬 더 가파르게 오르게 함.
    let level20Steps = Math.min(10, Math.max(0, levelSteps - 19));
    let post30Steps = Math.max(0, levelSteps - 29);
    return 9 + (pre10Steps * 6) + (level10Steps * 29) + (level20Steps * 130) + (post30Steps * 260);
}

export function summonGetSummonLevelGrowthSteps(profile, gemLv) {
    return profile && profile.role === 'attack'
        ? summonGetAttackSummonGrowthSteps(gemLv)
        : Math.max(0, Math.floor(Number(gemLv || 1)) - 1);
}

export function summonGetSummonScaledBaseDamage(profile, gemLv, pStats) {
    let dmgGrowth = 1 + getGemHighLevelGrowth(summonGetSummonLevelGrowthSteps(profile, gemLv), summonGetSummonLevelGrowthSteps(profile, 19)) * (profile.dmgPerLevelPct || 0.1);
    let flat = Math.max(0, (pStats && pStats.summonFlatDmg) || 0);
    return Math.max(1, Math.floor(((profile.baseDamage || 20) * dmgGrowth) + flat));
}

// complement bonus — keeping the cross-share free of any feedback loop.
export function summonGetRepresentativeSummonAttackPower(env, summonStats, evaluation) {
    let names = (Array.isArray(env.owner.equippedSummonSkills) ? env.owner.equippedSummonSkills : [])
        .filter(name => env.deps.SKILL_DB[name] && Array.isArray(env.deps.SKILL_DB[name].tags) && env.deps.SKILL_DB[name].tags.includes('summon_attack'));
    let best = 0;
    names.forEach(name => {
        let profile = coreGetSummonProfile(name);
        if (profile.role === 'guard') return;
        const local = env.deps.summonSupports.localStats({ gemName: name }, summonStats);
        let gemLv = summonGetSummonGemLevel(env, name, 'skill', summonStats, evaluation);
        let base = summonGetSummonScaledBaseDamage(profile, gemLv, local);
        let sharedInc = summonGetSummonAverageSharedIncreasePct(env, { gemName: name }, local);
        let ownMul = (1 + ((local.summonPctDmg || 0) + sharedInc) / 100) * (1 + ((local.summonEfficiency || 0) / 100)) * local.summonSupportEffects.damageMultiplier;
        best = Math.max(best, base * ownMul * env.deps.gemCoreForge.effects(env.owner.gemData?.[name]).damage);
    });
    return Math.max(0, best);
}

export function summonGetSummonMaxHp(profile, gemLevel, pStats) {
    let levelSteps = summonGetSummonLevelGrowthSteps(profile, gemLevel);
    const exponent = profile.hpScaleExp || 1.12;
    let hpGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(summonGetSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.hpScaleBase || 0.04);
    let hpMul = 1 + ((pStats.summonHpPct || 0) / 100);
    let effMul = 1 + ((pStats.summonEfficiency || 0) / 100);
    hpMul = summonKeystoneHpMultiplier(hpMul, profile, pStats);
    return Math.max(1, Math.floor(profile.baseHp * hpGrowth * hpMul * effMul));
}

function summonKeystoneHpMultiplier(hpMul, profile, pStats) {
    let flags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (flags.proxyCovenant && profile.role === 'guard') hpMul *= 2;
    if (flags.soleMinion && profile.role === 'attack') hpMul *= 1 + Math.max(0, pStats.passiveSoleMinionLostCap || 0) * 0.5;
    return hpMul;
}

export function summonGetSummonEvasionGrowthSteps(gemLevel) {
    let levelSteps = Math.max(0, Math.floor(Number(gemLevel || 1)) - 1);
    let earlySteps = Math.min(19, levelSteps);
    let post20Steps = Math.max(0, levelSteps - 19);
    return earlySteps + post20Steps * SUMMON_EVASION_POST_20_STEP_MULTIPLIER;
}

export function summonGetSummonEvasionRating(profile, gemLevel, pStats) {
    let steps = summonGetSummonEvasionGrowthSteps(gemLevel);
    let growth = 1 + getGemHighLevelGrowth(Math.pow(steps, profile.evasionScaleExp || 1.1), Math.pow(summonGetSummonEvasionGrowthSteps(19), profile.evasionScaleExp || 1.1)) * (profile.evasionScaleBase || 0.015);
    let efficiencyPct = Math.max(0, Number(pStats && pStats.summonEfficiency) || 0);
    let efficiencyMultiplier = 1 + (efficiencyPct * SUMMON_EFFICIENCY_EVASION_RATIO / 100);
    return Math.max(0, Math.floor((profile.baseEvasion || 0) * growth * efficiencyMultiplier));
}

export function summonGetSummonRegenPerSec(maxHp) {
    return Math.max(1, Math.floor(Math.max(1, maxHp) * SUMMON_REGEN_PCT_PER_SEC / 100));
}
