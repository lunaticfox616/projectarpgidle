import { PLAYER_EHP_ELEMENT_KEYS } from './combat-ehp-values.mjs';
import { ehpCalculatePlayerRawHitTaken, ehpCalculatePlayerEhpProfile } from './player-ehp.mjs';

export function ehpGetMapReadinessGrade(env, ratio) {
    const value = Math.max(0, Number(ratio) || 0);
    if (value < 0.85) return { id: 'low', label: env.deps._t('부족') };
    if (value < 1.30) return { id: 'fit', label: env.deps._t('적정') };
    return { id: 'high', label: env.deps._t('여유') };
}

export function ehpGetMapEstimateElements(estimate) {
    const source = Array.isArray(estimate && estimate.elements) ? estimate.elements : [estimate && estimate.element];
    const elements = source.filter(element => PLAYER_EHP_ELEMENT_KEYS.includes(element));
    return elements.length > 0 ? Array.from(new Set(elements)) : PLAYER_EHP_ELEMENT_KEYS.slice();
}

export function ehpGetPenetratedStats(stats, element, pressure) {
    if (element === 'phys' || pressure <= 0) return stats;
    const suffix = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' }[element];
    const adjusted = { ...stats };
    const resistanceKey = `res${suffix}`;
    const rawResistanceKey = `rawRes${suffix}`;
    adjusted[resistanceKey] = Number(stats && stats[resistanceKey] || 0) - pressure;
    if (Number.isFinite(Number(stats && stats[rawResistanceKey]))) {
        adjusted[rawResistanceKey] = Number(stats[rawResistanceKey]) - pressure;
    }
    return adjusted;
}

export function ehpGetBossTakenMultiplierRelativeToProfile(stats) {
    const bossTaken = Math.max(0.01, Number(stats && stats.bossTakenDamageMultiplier) || 1);
    const guardian = stats && stats.uniqueGuardianArmor;
    if (!guardian) return bossTaken;
    const normalLess = Math.max(0, Math.min(95, Number(guardian.takenLessPct) || 0));
    const bossLess = Math.max(0, Math.min(95, Number(guardian.bossTakenLessPct) || 0));
    return bossTaken * (1 - bossLess / 100) / Math.max(0.05, 1 - normalLess / 100);
}

export function ehpGetBossEquivalentEhpTarget(stats, profile, estimate, element) {
    const row = profile.elements[element];
    const peakHit = Math.max(1, Number(estimate.peakHit) || Number(estimate.ehp) || 1);
    const threatWindow = Math.max(peakHit, Number(estimate.ehp) || peakHit);
    const pressure = Math.max(0, Number(estimate.resistancePressure) || 0);
    const adjusted = ehpGetPenetratedStats(stats, element, pressure);
    const bossTakenMul = ehpGetBossTakenMultiplierRelativeToProfile(stats);
    const basePeakTaken = Math.max(0.0001, ehpCalculatePlayerRawHitTaken(stats, element, peakHit));
    const baseWindowTaken = Math.max(0.0001, ehpCalculatePlayerRawHitTaken(stats, element, threatWindow));
    const peakPenalty = ehpCalculatePlayerRawHitTaken(adjusted, element, peakHit) * bossTakenMul / basePeakTaken;
    const windowPenalty = ehpCalculatePlayerRawHitTaken(adjusted, element, threatWindow) * bossTakenMul / baseWindowTaken;
    const entropyPerDirect = row.entropy / Math.max(1, row.direct);
    return Math.max(threatWindow * windowPenalty, peakHit * peakPenalty * entropyPerDirect);
}

export function ehpGetMapEstimateDpsMultiplier(env, stats, estimate, alreadyInZone) {
    if (alreadyInZone) return ehpGetMapUnderworldFloorDpsRatio(env, stats, estimate);
    let multiplier = Math.max(0.1, Number(estimate && estimate.playerDpsMultiplier) || 1);
    multiplier = ehpApplyUnderworldGravity(env, stats, estimate, multiplier);
    return ehpApplyOceanPressure(stats, estimate, multiplier);
}

function ehpApplyUnderworldGravity(env, stats, estimate, multiplier) {
    const gravityFloor = Math.max(0, Math.floor(Number(estimate && estimate.underworldGravityFloor) || 0));
    if (gravityFloor > 0) {
        const ignoresReduction = !!(estimate && estimate.underworldGravityIgnoresReduction);
        const reduction = ignoresReduction ? 0
            : Math.max(0, Math.min(75, Number(stats && stats.underworldGravityReductionPct) || 0));
        multiplier *= env.deps.getUnderworldGravityActionMultiplier(gravityFloor, reduction);
    }
    return multiplier;
}

function ehpApplyOceanPressure(stats, estimate, multiplier) {
    const depthTier = Math.max(0, Math.floor(Number(estimate && estimate.oceanPressureDepthTier) || 0));
    if (depthTier <= 0) return multiplier;
    const pressureResist = Math.max(0, Math.min(80, Number(stats && stats.oceanPressureResist) || 0));
    const pressureSlow = Math.min(0.65, depthTier * 0.05) * (1 - pressureResist / 100);
    return multiplier * Math.max(0.1, 1 - pressureSlow);
}

/** Sustained baseline only: conditional leech, talents and temporary shields are excluded. */
export function ehpGetMapEnvironmentReadiness(env, stats, estimate) {
    const floor = Number(estimate?.underworldLifeDrainFloor) || 0;
    if (floor < 15) return null;
    const maxHp = Math.max(1, Number(stats?.maxHp) || 1);
    const loss = env.deps.getUnderworldLifeDrainPerTick(maxHp, floor, stats?.underworldGravityReductionPct) * 10;
    const lossPct = loss / maxHp * 100;
    const regenPct = Math.max(0, Number(stats?.regen) || 0);
    return { lossPct, regenPct, deficitPct: Math.max(0, lossPct - regenPct) };
}

/** Another zone's card starts from the DPS without what the current zone takes away (underworld gravity, ocean pressure: js/combat.js
 * getPlayerStats zoneSpeedMultiplier), then applies its own. There the hero's attacks lose speed and damage, summons only the damage. */
export function ehpGetMapEstimateBaseDps(stats, playerDps, alreadyInZone) {
    if (alreadyInZone || !stats) return playerDps;
    const speed = Math.max(0.01, Number(stats.zoneSpeedMultiplier) || 1);
    const damage = Math.max(0.01, Number(stats.zoneDamageMultiplier) || 1);
    const summon = Math.min(playerDps, Math.max(0, Number(stats.summonDps) || 0));
    return (playerDps - summon) / (speed * damage) + summon / damage;
}

export function ehpGetMapUnderworldFloorDpsRatio(env, stats, estimate) {
    const activeFloor = Number(stats.activeUnderworldFloor) || 0;
    const targetFloor = Number(estimate.underworldLifeDrainFloor) || 0;
    if (!activeFloor || !targetFloor || activeFloor === targetFloor) return 1;
    const reduction = stats.underworldGravityReductionPct;
    return env.deps.getUnderworldGravityActionMultiplier(targetFloor, reduction)
        / env.deps.getUnderworldGravityActionMultiplier(activeFloor, reduction);
}

/**
 * @param {Readonly<object>} stats
 * @param {Readonly<object>} estimate
 * @returns {{dps:object,ehp:object,element:string,playerDps:number,playerEhp:number,recommendedDps:number,recommendedEhp:number,meetsRecommendation:boolean}}
 */
export function ehpGetMapPowerReadiness(env, stats, estimate) {
    const profile = ehpCalculatePlayerEhpProfile(stats || {});
    const elements = ehpGetMapEstimateElements(estimate);
    let limiting = null;
    elements.forEach(element => {
        const row = profile.elements[element];
        const recommended = ehpGetBossEquivalentEhpTarget(stats || {}, profile, estimate || {}, element);
        const ratio = row.entropy / Math.max(1, recommended);
        if (!limiting || ratio < limiting.ratio) limiting = { element, ratio, player: row.entropy, recommended };
    });
    // 앞 구간의 껍질 효과는 그 지역에서만이라, 지도의 권장 전투력 비교에는 넣지 않는다.
    const playerDps = ehpReadinessPlayerDps(env, stats);
    const activeZoneId = stats && stats.activeZoneId;
    const estimateZoneId = estimate && estimate.zoneId;
    const alreadyInZone = activeZoneId != null && estimateZoneId != null
        && String(activeZoneId) === String(estimateZoneId);
    const zoneDpsMultiplier = ehpGetMapEstimateDpsMultiplier(env, stats || {}, estimate || {}, alreadyInZone);
    const effectivePlayerDps = ehpGetMapEstimateBaseDps(stats, playerDps, alreadyInZone) * zoneDpsMultiplier;
    const recommendedDps = Math.max(1, Number(estimate && estimate.dps) || 1);
    const dpsRatio = effectivePlayerDps / recommendedDps;
    const environment = ehpGetMapEnvironmentReadiness(env, stats, estimate);
    return {
        meetsRecommendation: ehpMeetsMapRecommendation(dpsRatio, limiting.ratio, environment),
        dps: { ...ehpGetMapReadinessGrade(env, dpsRatio), ratio: dpsRatio },
        ehp: { ...ehpGetMapReadinessGrade(env, limiting.ratio), ratio: limiting.ratio },
        environment,
        element: limiting.element,
        playerDps: effectivePlayerDps,
        playerEhp: limiting.player,
        recommendedDps,
        recommendedEhp: limiting.recommended
    };
}

function ehpReadinessPlayerDps(env, stats) {
    return Math.max(0, Number(stats && stats.totalDps)
        || (Number(stats && stats.dps) || 0) + (Number(stats && stats.summonDps) || 0)) / (1 + env.deps.getWorldTreeBarkEffect().damagePct / 100);
}

export function ehpMeetsMapRecommendation(dpsRatio, ehpRatio, environment) {
    return dpsRatio >= 1 && ehpRatio >= 1 && !(environment?.deficitPct > 0);
}
