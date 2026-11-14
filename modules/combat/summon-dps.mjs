import { summonGetSummonGemLevel, summonGetSummonScaledBaseDamage } from './summon-growth.mjs';
import { coreGetSummonProfile } from './core-summons.mjs';
import { summonGetSummonAttackIntervalMs } from './summon-damage-rules.mjs';
import { summonGetSummonHitDamageInfo } from './summon-hit-roll.mjs';

export function summonResolveActiveSummonGemLevels(env, pStats, evaluation) {
    // A refresh owns this cache; no stale gem/gear values can survive into another tick.
    const levels = new Map();
    return env.deps.buildActiveSummonRuntimeDefs(pStats).map(row => {
        const key = `${row.source}:${row.name}`;
        if (!levels.has(key)) levels.set(key, summonGetSummonGemLevel(env, row.name, row.source, pStats, evaluation));
        return { ...row, gemLevel: levels.get(key) };
    });
}

export function summonCalculateSummonDpsRow(env, row, pStats, target) {
    const profile = coreGetSummonProfile(row.name);
    let gemLv = row.gemLevel;
    let s = summonEstimateHitProfile(row.name, profile, gemLv, pStats);
    let intervalSec = summonGetSummonAttackIntervalMs(env, pStats, s) / 1000;
    let hit = summonGetSummonExpectedHit(env, s, pStats, target);
    let dps = hit.damage / intervalSec
        * env.deps.combatSupports.expectedMultiplier(env.deps.summonSupports.skill(s));
    return { s, hit, dps };
}

/** Shared estimate/tooltip input. Live summon ASPD still uses its distinct zero floor. */
export function summonEstimateHitProfile(gemName, profile, gemLv, pStats) {
    return {
        gemName,
        ele: profile.ele || 'phys',
        baseDamage: summonGetSummonScaledBaseDamage(profile, gemLv, pStats),
        attackSpeedMul: Math.max(0.1, Number(profile.attackSpeedMul || 1)),
        resPenBonus: Math.max(0, Number(profile.resPenBonus || 0)),
        physIgnoreBonus: Math.max(0, Number(profile.physIgnoreBonus || 0)),
        crit: Math.max(0, profile.baseCrit || 0),
        critDmg: Math.max(100, profile.baseCritDmg || 140),
        dmgRollMinPct: Math.max(1, Math.min(100, Math.floor(profile.dmgRollMinPct || 40)))
    };
}

/** Expected hit; a wisp that rolls its element per attack (분광) averages over its elements. */
export function summonGetSummonExpectedHit(env, s, pStats, target) {
    const elements = env.deps.wispSummons.elements(s.gemName);
    if (!elements) return summonGetSummonHitDamageInfo(env, s, pStats, target, { expected: true });
    const hits = elements.map(ele => summonGetSummonHitDamageInfo(env, { ...s, ele }, pStats, target, { expected: true }));
    return { ...hits[0], damage: hits.reduce((sum, hit) => sum + hit.damage, 0) / hits.length };
}

/** Numeric consumers skip presentation; repeated identical summons share work within this call only. */
export function* summonEstimateSummonDps(env, pStats, includeBreakdowns = true, evaluation) {
    if (env.deps.hasKeystone('sb5')) {
        return { total: 0, activeCount: 0, lines: includeBreakdowns ? [(yield { kind: 'disabledSummonDpsLine', args: [] })] : [] };
    }
    const target = (env.owner.enemies || []).find(e => e && e.hp > 0) || null;
    const rows = summonResolveActiveSummonGemLevels(env, pStats, evaluation);
    const estimates = new Map();
    let total = 0;
    let activeCount = 0;
    rows.forEach(row => {
        if (coreGetSummonProfile(row.name).role === 'guard') return;
        const key = `${row.gemLevel}:${row.name}`;
        if (!estimates.has(key)) estimates.set(key, summonCalculateSummonDpsRow(env, row, pStats, target));
        // Keep repeated addition (rather than multiplying by count) to preserve rounding.
        total += estimates.get(key).dps;
        activeCount++;
    });
    const lines = includeBreakdowns ? (yield { kind: 'presentSummonDps', args: [rows, estimates, pStats, activeCount] }) : [];
    return { total: Math.max(0, total), activeCount, lines };
}
