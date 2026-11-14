import { summonGetSummonGemLevel, summonGetSummonLevelGrowthSteps, summonGetSummonMaxHp, summonGetSummonRegenPerSec, summonGetSummonEvasionRating, summonGetSummonScaledBaseDamage } from './summon-growth.mjs';
import { coreGetSummonProfile } from './core-summons.mjs';
import { getGemHighLevelGrowth } from '../domain/gem-growth.mjs';

export function summonBuildSummonRuntimeStats(env, row, pStats, now, gemLv = summonGetSummonGemLevel(env, row.name, row.source, pStats)) {
    pStats = env.deps.summonSupports.localStats({ gemName: row.name }, pStats);
    let profile = coreGetSummonProfile(row.name);
    let isGuard = profile.role === 'guard';
    let levelSteps = summonGetSummonLevelGrowthSteps(profile, gemLv);
    const exponent = profile.armorScaleExp || 1.1;
    let armorGrowth = 1 + getGemHighLevelGrowth(Math.pow(levelSteps, exponent), Math.pow(summonGetSummonLevelGrowthSteps(profile, 19), exponent)) * (profile.armorScaleBase || 0.015);
    let maxHp = Math.max(1, Math.floor(summonGetSummonMaxHp(profile, gemLv, pStats) * env.deps.summonSupports.hpMultiplier(pStats)));
    return {
        gemName: row.name,
        slotIdx: row.slotIdx,
        duplicateIndex: row.duplicateIndex || 0,
        role: isGuard ? 'guard' : 'attack',
        gemLevel: gemLv,
        trait: profile.trait || '',
        hp: maxHp,
        maxHp: maxHp,
        regenPerSec: summonGetSummonRegenPerSec(maxHp),
        ...summonRuntimeDefenses(profile, armorGrowth, gemLv, pStats),
        redirectPct: isGuard ? 100 : Math.max(0, Math.min(100, profile.redirectPct || 0)),
        respawnMs: summonRuntimeRespawnMs(profile, isGuard, pStats),
        ...summonRuntimeAttackStats(profile, gemLv, pStats),
        alive: true,
        respawnAt: 0,
        nextAttackAt: now + 300
    };
}

function summonRuntimeDefenses(profile, armorGrowth, gemLv, pStats) {
    return {
        armor: Math.max(0, Math.floor((profile.baseArmor || 0) * armorGrowth)),
        evasion: summonGetSummonEvasionRating(profile, gemLv, pStats),
        resFire: Math.max(-60, Math.min(90, profile.baseRes.fire || 0)),
        resCold: Math.max(-60, Math.min(90, profile.baseRes.cold || 0)),
        resLight: Math.max(-60, Math.min(90, profile.baseRes.light || 0)),
        resChaos: Math.max(-60, Math.min(90, profile.baseRes.chaos || 0))
    };
}

function summonRuntimeRespawnMs(profile, isGuard, pStats) {
    return Math.max(4000, Math.floor((profile.respawnMs || (isGuard ? 8000 : 4000))
        * (((isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.proxyCovenant)
            || (!isGuard && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion)) ? 2 : 1)));
}

function summonRuntimeAttackStats(profile, gemLv, pStats) {
    return {
        baseDamage: summonGetSummonScaledBaseDamage(profile, gemLv, pStats),
        ele: profile.ele || 'phys',
        attackSpeedMul: Math.max(0, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40))),
        gridRange: Math.max(1, Math.floor(profile.gridRange || 1))
    };
}

/** The share of a hit the summons take for the hero: the guard redirect stat rounded down, at least 50 with 나눠갖기 (sb2, the closest
 * summon of any role takes it then; otherwise the living guards). */
export function summonGetSummonRedirectPct(env, pStats) {
    const golem = env.deps.buildActiveSummonRuntimeDefs(pStats).some(row => row.db.tags.includes('summon_guard'));
    const pct = Math.max(0, Math.min(100, Math.floor((pStats.summonGuardRedirectPct || 0) + (golem ? env.deps.SKILL_DB['수액 골렘 소환'].guardRedirectPct : 0))));
    return env.deps.hasKeystone('sb2') ? Math.max(pct, 50) : pct;
}
