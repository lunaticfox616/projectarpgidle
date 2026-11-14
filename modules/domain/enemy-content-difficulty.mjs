import { UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER, ENTRY_BOSS_EASING } from '../data/enemy-entry-tuning.mjs';

export function buildIsUnderworldEntryBenchmark(zone) {
    return !!zone && zone.difficultyBenchmark === 'underworld1';
}

export function buildGetDifficultyBenchmarkProfile(zone) {
    const benchmark = String(zone && zone.difficultyBenchmark || '');
    if (benchmark === 'rival31') return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === 'underworld1') return { hp: 5, damage: 0.78, attackRate: 0.76, clearTimeSec: 24 };
    if (benchmark === 'underworld30') return { hp: 5 * (1 + 29 * 0.045), damage: 0.78, attackRate: 0.76, clearTimeSec: 30 };
    if (benchmark === 'ocean1000') return { hp: 5 * (1 + 10 * 0.05), damage: 1, attackRate: 1, clearTimeSec: 30 };
    if (benchmark === 'sky30') return { hp: 4.2 * (1 + 29 * 0.035), damage: 1.08, attackRate: 1.05, clearTimeSec: 30 };
    if (benchmark === 'cosmosFinal') return { hp: 1, damage: 1, attackRate: 1, clearTimeSec: 45 };
    return null;
}

/** A boss's entry easing: the underworld entry benchmark's own, else its floor's in ENTRY_BOSS_EASING (the underworld's floor 1, the sky
 * tower's floors 1-5), else none. Boss life, boss hits and the panel's recommended power all read it. */
export function buildGetEntryBossTuning(zone, isBoss) {
    if (!isBoss || !zone) return { hp: 1, damage: 1 };
    if (buildIsUnderworldEntryBenchmark(zone)) {
        return { hp: UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER, damage: UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER };
    }
    const floors = Object.hasOwn(ENTRY_BOSS_EASING, zone.type) ? ENTRY_BOSS_EASING[zone.type] : [];
    return floors[Math.max(1, Math.floor(Number(zone.floor) || 1)) - 1] || { hp: 1, damage: 1 };
}

export function buildGetUnderworldEnemyDamageMultiplier(env, zone) {
    if (!zone || zone.type !== 'underworld') return 1;
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    let mediumStart = env.deps.UNDERWORLD_DIFFICULTY_CONFIG.flatDamageThroughFloor;
    let deepStart = env.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamageThroughFloor;
    let deepEnd = env.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
    let mediumFloors = Math.min(Math.max(0, floor - mediumStart), deepStart - mediumStart);
    let deepFloors = Math.min(Math.max(0, floor - deepStart), deepEnd - deepStart);
    return 1
        + mediumFloors * env.deps.UNDERWORLD_DIFFICULTY_CONFIG.mediumDamagePerFloor
        + deepFloors * env.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamagePerFloor;
}

export function buildResolveMapEstimateContentScale(env, zone) {
    const benchmark = buildGetDifficultyBenchmarkProfile(zone);
    if (benchmark) return benchmarkContentScale(zone, benchmark);
    let scale = { hp: 1, damage: 1, clearTimeSec: 24 };
    let floor = Math.max(1, Math.floor(Number(zone.floor) || 1));
    if (zone.type === 'act') scale.clearTimeSec = 18;
    if (zone.type === 'chaosRealm') scale.hp = 5 * (1 + (floor - 1) * 0.06);
    if (zone.type === 'underworld') {
        scale.hp = 5 * (1 + (floor - 1) * 0.045);
        scale.damage = 0.78 * buildGetUnderworldEnemyDamageMultiplier(env, zone);
    }
    if (zone.type === 'oceanDepth') scale.hp = 5 * (1 + Math.max(0, Math.floor(zone.depthTier || 0)) * 0.05);
    applyChallengeEstimateScale(env, zone, scale);
    return scale;
}

function benchmarkContentScale(zone, benchmark) {
    return {
        hp: benchmark.hp * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryHpMul) || 1) : 1),
        damage: benchmark.damage * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryDamageMul) || 1) : 1),
        clearTimeSec: benchmark.clearTimeSec
    };
}

function applyChallengeEstimateScale(env, zone, scale) {
    if (zone.type === 'timeRift' || zone.type === 'seasonBoss') scale.clearTimeSec = 30;
    if (zone.type === 'beehive') scale.clearTimeSec = 30;
    if (zone.type === 'colony') {
        scale.hp = 3.4;
        scale.damage = 1.45;
    }
    if (zone.type === 'grandBreach') scale.clearTimeSec = 35;
    if (zone.type === 'cosmos') {
        const galaxyBoss = typeof env.deps.getCosmosGalaxyBossMechanic === 'function'
            && !!env.deps.getCosmosGalaxyBossMechanic(zone.cosmosNodeId);
        scale.clearTimeSec = galaxyBoss ? 55 : 40;
    }
}
