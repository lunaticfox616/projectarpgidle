import { buildGetMonsterLoopHpMultiplier, buildGetEliteLoopHpMultiplier, buildGetBossHpEase } from '../domain/enemy-loop-difficulty.mjs';
import { buildGetDifficultyBenchmarkProfile, buildGetEntryBossTuning } from '../domain/enemy-content-difficulty.mjs';

/** A monster's life before its look and traits: the tier and loop curves, each content's own scale, elites and bosses. */
export function buildGetEnemyBaseHp(env, zone, ctx) {
    const { loopInputs, tierProgress, isBoss, isElite } = ctx;
    const lateGameHpScale = 1 + (tierProgress * 9);
    let hp = Math.floor(((56 + zone.tier * 30) * 1.15) * lateGameHpScale * buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress));
    if (loopInputs.exempt) hp = Math.floor(hp * (Number(zone.fixedDifficultyMul) || 1));
    hp = buildApplyContentEnemyHp(env, zone, hp, isBoss, isElite);
    if (isElite) hp = Math.floor(hp * buildGetEliteLoopHpMultiplier(zone, loopInputs.loopCount));
    if (isBoss) hp = Math.floor(hp * (1.8 + zone.tier * 0.6) * buildGetBossHpEase(env, zone.tier, buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress)));
    if (isBoss) hp = Math.floor(hp * (1 + (tierProgress * 4)));
    return buildApplyEnemyHpScales(zone, hp, isBoss, ctx.abyssScale);
}

/** Deep chaos's normal monsters, the chaos realm, a benchmark profile or the sky tower, underworld and ocean, the boundary. */
export function buildApplyContentEnemyHp(env, zone, hp, isBoss, isElite) {
    if (zone.type === 'abyss' && !isElite && !isBoss) hp = buildApplyDeepChaosNormalHp(env, zone, hp);
    if (zone.type === 'chaosRealm') {
        const realmFloor = Math.max(1, Math.floor(zone.floor || 1));
        // 혼돈계 1층 기준 난이도를 심화 혼돈 30급으로 맞추고, 층이 오를수록 완만히 추가 상승.
        const realmBaseMul = 5;
        const realmFloorMul = 1 + Math.max(0, realmFloor - 1) * 0.06;
        hp = Math.floor(hp * realmBaseMul * realmFloorMul);
    }
    hp = buildApplyFloorContentEnemyHp(zone, hp);
    if (zone.type === 'beyondBoundary') hp = Math.floor(hp * Math.max(1, Number(zone.boundaryHpMul) || 1));
    return hp;
}

export function buildApplyDeepChaosNormalHp(env, zone, hp) {
    const abyssDepth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    const hpRamp = Math.min(0.20, Math.max(0, abyssDepth - 1) * 0.015);
    const deepNormalHpMul = abyssDepth >= 21 && abyssDepth <= 30 ? 1.2 : 1;
    return Math.floor(hp * (1 + hpRamp) * deepNormalHpMul);
}

/** A benchmark profile's life scale, else the sky tower's, underworld's or ocean's by floor. */
export function buildApplyFloorContentEnemyHp(zone, hp) {
    const benchmarkProfile = buildGetDifficultyBenchmarkProfile(zone);
    if (benchmarkProfile) return Math.floor(hp * benchmarkProfile.hp);
    if (zone.type === 'skyTower') {
        const towerFloor = Math.max(1, Math.floor(zone.floor || 1));
        return Math.floor(hp * 4.2 * (1 + Math.max(0, towerFloor - 1) * 0.035));
    }
    if (zone.type === 'underworld') {
        const underFloor = Math.max(1, Math.floor(zone.floor || 1));
        return Math.floor(hp * 5 * (1 + Math.max(0, underFloor - 1) * 0.045));
    }
    if (zone.type !== 'oceanDepth') return hp;
    const depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    // 수심 0m 진입 시점 난이도를 혼돈심화 21층 부근(혼돈계 floor1 hp배율 5와 유사한 강도)에 맞추고, 100m(depthTier 1)마다 완만히 추가 상승.
    const oceanBaseMul = 5;
    const oceanTierMul = 1 + depthTier * 0.05;
    return Math.floor(hp * oceanBaseMul * oceanTierMul);
}

/** The underworld entry boss, the map's and the abyss's life scales, the flat 0.92, at least 1, and trial 3's boss at 85%. */
export function buildApplyEnemyHpScales(zone, hp, isBoss, abyssScale) {
    const entryTuning = buildGetEntryBossTuning(zone, isBoss);
    hp = Math.floor(hp * entryTuning.hp * (zone.mapHpMul || 1));
    hp = Math.floor(hp * (abyssScale.hpMul || 1) * (isBoss ? (abyssScale.bossMul || 1) : 1));
    hp = Math.max(1, Math.floor(hp * 0.92));
    if (isBoss && zone.type === 'trial' && zone.id === 'trial_3') hp = Math.floor(hp * 0.85);
    return hp;
}

/** Life scaled by the trait, the cosmos modifiers and the cosmos exclusive trait, in that order. */
export function buildApplyEnemyTraitHp(hp, mods) {
    for (const source of [mods.trait, mods.cosmosMods, mods.cosmosExclusiveTrait]) if (source && source.hpMul) hp = Math.floor(hp * source.hpMul);
    return hp;
}
