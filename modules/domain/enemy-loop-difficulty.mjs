import { buildGetDifficultyBenchmarkProfile } from '../domain/enemy-content-difficulty.mjs';

// 루프 20 이후 적 강화(특히 생명력) 곡선을 완만하게 만든다.
// 20루프까지는 그대로 누적하고, 그 이후 추가되는 루프의 기울기를 절반으로 줄인다.
// (season/loopCount 기준 depth 19 = 루프 20)
export function buildGetSoftenedLoopDepth(depth) {
    let d = Math.max(0, depth || 0);
    const knee = 19;
    if (d <= knee) return d;
    return knee + (d - knee) * 0.5;
}

// 존 성격별 루프 난이도 입력값(시즌·루프 카운트)을 결정한다. HP·방어·공격 스케일이 공통으로 사용.
//  - trial/outsideChaos 또는 zone.loopScaleExempt(데이터 플래그, 예: 버려진 날붙이 결투):
//    특정 조합/빌드의 실력을 시험하는 고정 관문 — 루프 인플레이션을 받지 않고
//    zone.fixedDifficultyMul(데이터)로만 난이도를 조절한다.
//  - act: 매 루프 레벨 1부터 다시 지나는 재성장 구간 — ACT_LOOP_SCALE_CAP까지만 세지고 이후 고정.
//  - cosmos: 나무꾼 이후 고정 성장계단. 일반 루프 인플레이션은 30에서 고정하고
//    우주계 루프와 노드 티어로만 추가 난이도를 올린다.
//  - 그 외(엔드리스 파밍 콘텐츠): 제한 없이 루프 스케일을 따른다.
export function buildGetLoopDifficultyInputs(env, zone) {
    const fixed = buildGetFixedLoopDifficultyInputs(zone);
    if (fixed) return fixed;
    let exempt = !!zone && (zone.type === 'trial' || zone.type === 'outsideChaos' || !!zone.loopScaleExempt);
    if (exempt) return { exempt: true, seasonLoops: 0, loopCount: 0 };
    let cap = buildGetLoopScaleCap(env, zone);
    return {
        exempt: false,
        seasonLoops: Math.min(cap, Math.max(0, (env.owner.season || 1) - 1)),
        loopCount: Math.min(cap, Math.max(0, Math.floor(env.owner.loopCount || 0)))
    };
}

/** 지역이 세는 루프 상한: 액트 ACT_LOOP_SCALE_CAP, 혼돈은 그 위로 층마다 CHAOS_LOOP_RAMP_PER_DEPTH씩(data/maps.js), 우주계 30, 그 밖은 없음. */
export function buildGetLoopScaleCap(env, zone) {
    if (!zone) return Infinity;
    if (zone.type === 'act') return env.deps.ACT_LOOP_SCALE_CAP;
    if (zone.type === 'abyss') return env.deps.ACT_LOOP_SCALE_CAP + env.deps.getAbyssDepthFromZoneId(zone.id) * env.deps.CHAOS_LOOP_RAMP_PER_DEPTH;
    return zone.type === 'cosmos' ? 30 : Infinity;
}

// 고정 난이도: 벤치마크 콘텐츠는 루프 30으로, 세계수 아틀라스 지도는 등급이 정한 루프(zone.fixedSeason)로 계산한다.
export function buildGetFixedLoopDifficultyInputs(zone) {
    if (buildGetDifficultyBenchmarkProfile(zone)) return { exempt: false, seasonLoops: 30, loopCount: 30 };
    if (!zone || !Number.isFinite(zone.fixedSeason)) return null;
    const loops = Math.max(0, Math.floor(zone.fixedSeason) - 1);
    return { exempt: false, seasonLoops: loops, loopCount: loops };
}

// 방어(장갑/회피) 루프 배율: 루프24까지는 기존과 동일하게 커지고(2.2 상한 도달),
// 그 이후로도 getLoopHpScale처럼 완만하게 계속 증가한다(하드 상한 없음).
// 기존에는 루프24 이후 완전히 동결되어, 무한히 성장하는 플레이어 관통/저항무시 스탯에
// 보스 방어가 전혀 대응하지 못하고 "고루프 보스가 너무 쉬워지는" 원인이 되었다.
export function buildGetLoopDefenseScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
        { upTo: 24, rate: 0.05 },
        { upTo: 60, rate: 0.02 },
        { upTo: Infinity, rate: 0.008 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
        scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
        prevBound = band.upTo;
        if (loop <= band.upTo) break;
    }
    return scale;
}

/** 1 + depth × per-loop growth of monster life or damage (data/maps.js MONSTER_LOOP_GROWTH); tierShare is the zone's 0..1 tier share.
 * Cosmos keeps the values it was tuned on (its own node tiers carry its difficulty). */
export function buildGetMonsterLoopGrowthScale(env, zone, kind, seasonDepth, tierShare) {
    const growth = (zone && zone.type === 'cosmos' ? env.deps.MONSTER_LOOP_GROWTH.fixed : env.deps.MONSTER_LOOP_GROWTH)[kind];
    return 1 + seasonDepth * (growth.base + tierShare * growth.tier);
}

/** 우주계 은하와 그 최종 보스(잔향체 아스트라, 벤치마크 cosmosFinal): 노드 등급으로 난이도를 올리는 별도 사다리라 예전 루프 공식을 쓴다. */
export function buildIsCosmosLadderZone(zone) {
    return !!zone && (zone.type === 'cosmos' || zone.difficultyBenchmark === 'cosmosFinal');
}

/** 몬스터 생명력의 루프 배율. 루프를 타는 지역은 지역 단계와 무관한 한 곡선(data/maps.js MONSTER_LOOP_HP_CURVE), 루프를 타지 않는
 * 지역(시련 등)은 플레이어 루프의 보정 곡선, 우주계는 노드 등급에 맞춰 둔 예전 공식(성장 × 루프 카운트 × 보정)을 쓴다.
 * 전투(createEnemy)와 권장 전투력(estimateMapZonePowerRequirements)이 같은 값을 쓴다. */
export function buildGetMonsterLoopHpMultiplier(env, zone, loopInputs, tierProgress) {
    if (buildIsCosmosLadderZone(zone)) {
        return buildGetMonsterLoopGrowthScale(env, zone, 'hp', buildGetSoftenedLoopDepth(loopInputs.seasonLoops), tierProgress)
            * buildGetLoopHpScale(loopInputs.loopCount) * buildGetMonsterLoopPowerScale(env, zone, 'hp');
    }
    if (loopInputs.exempt) return buildGetMonsterLoopPowerScale(env, zone, 'hp');
    return buildInterpolateLoopCurve(env.deps.MONSTER_LOOP_HP_CURVE, loopInputs.seasonLoops + 1);
}

/** 보스 생명력에 더 곱하는 완화 배율(data/maps.js): 지역 단계(tier)의 BOSS_TIER_HP_EASE 곡선, 그리고 루프 생명력 배율(loopMul)
 * 가운데 1을 넘는 몫은 BOSS_LOOP_HP_SHARE만 남긴다(1 이하는 그대로). 전투(createEnemy)와 권장 전투력이 같은 값을 쓴다. */
export function buildGetBossHpEase(env, tier, loopMul) {
    const loopShare = loopMul > 1 ? (1 + (loopMul - 1) * env.deps.BOSS_LOOP_HP_SHARE) / loopMul : 1;
    return loopShare * buildInterpolateLoopCurve(env.deps.BOSS_TIER_HP_EASE, Number(tier) || 1);
}

/** 정예 생명력 배율 1.4 + 루프 몫. 루프 몫은 +0.3까지(2026-10-06): 예전엔 상한 없이 루프 30에 2.6배까지 커져 루프 배율과 겹쳤다.
 * 우주계 사다리는 예전 그대로. 전투(createEnemy)와 아틀라스 무리 권장 전투력(getAtlasPackReadiness)이 같은 값을 쓴다. */
export function buildGetEliteLoopHpMultiplier(zone, loopCount) {
    const share = buildGetSoftenedLoopDepth(loopCount) * 0.05;
    return 1.4 + (buildIsCosmosLadderZone(zone) ? share : Math.min(0.3, share));
}

/** 몬스터 생명력 · 피해의 루프 배율(data/maps.js MONSTER_LOOP_POWER_SCALE). 루프는 지역 난이도가 쓰는 루프(액트 상한 ·
 * 아틀라스 지도의 고정 루프 그대로), 루프를 타지 않는 지역(시련 등)은 플레이어의 루프. 전투와 권장 전투력 표시가 같은 값을 쓴다. */
export function buildGetMonsterLoopPowerScale(env, zone, kind) {
    const inputs = buildGetLoopDifficultyInputs(env, zone);
    const loop = inputs.exempt ? Math.max(1, Math.floor(env.owner.season || 1)) : inputs.seasonLoops + 1;
    return buildInterpolateLoopCurve(env.deps.MONSTER_LOOP_POWER_SCALE[kind], loop);
}

/** [[루프, 값], …] 사이를 직선으로 잇는다. 첫 점 앞은 첫 값, 마지막 점 뒤는 마지막 값. */
export function buildInterpolateLoopCurve(points, loop) {
    if (!Array.isArray(points) || !points.length) return 1;
    if (loop <= points[0][0]) return points[0][1];
    const next = points.findIndex(point => loop <= point[0]);
    if (next < 0) return points[points.length - 1][1];
    const [x0, y0] = points[next - 1], [x1, y1] = points[next];
    return y0 + (y1 - y0) * (loop - x0) / (x1 - x0);
}

export function buildGetLoopHpScale(loopCount) {
    let loop = Math.max(0, loopCount || 0);
    const bands = [
        { upTo: 1, rate: 0.12 },
        { upTo: 10, rate: 0.10 },
        { upTo: 20, rate: 0.08 },
        { upTo: 40, rate: 0.04 },
        { upTo: 100, rate: 0.018 },
        { upTo: Infinity, rate: 0.006 }
    ];
    let scale = 1, prevBound = 0;
    for (let band of bands) {
        scale += Math.max(0, Math.min(loop, band.upTo) - prevBound) * band.rate;
        prevBound = band.upTo;
        if (loop <= band.upTo) break;
    }
    return scale;
}
