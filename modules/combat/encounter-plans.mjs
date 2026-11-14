import { buildGetZoneEncounterProfile } from '../combat/zone-encounter-profiles.mjs';
import { clampNumber } from '../common/numbers.mjs';

export function effectGetEncounterDifficultyValue(zone) {
    if (!zone) return 1;
    if (Number.isFinite(zone.floor)) return Math.max(1, Math.floor(zone.floor));
    if (Number.isFinite(zone.depthTier)) return Math.max(1, Math.floor(zone.depthTier));
    if (Number.isFinite(zone.pressure)) return Math.max(1, Math.floor(zone.pressure));
    return Math.max(1, Math.floor(Number(zone.tier) || Number(zone.id) || 1));
}

export function effectGetFrequentSpawnEncounterProfile(env, zone) {
    let profile = { ...buildGetZoneEncounterProfile(env, zone) };
    let difficulty = effectGetEncounterDifficultyValue(zone);
    if (difficulty >= 8 && profile.markerCount > 0) {
        let ramp = clampNumber((difficulty - 8) / 24, 0, 1);
        let markerCap = 20;
        let baseMarkerCount = profile.markerCount;
        if (profile.markerCount < markerCap) {
            let targetMarkers = Math.round(profile.markerCount * (1.35 + ramp * 1.35));
            profile.markerCount = clampNumber(targetMarkers, profile.markerCount + 1, markerCap);
        }
        if (profile.markerCount > baseMarkerCount) {
            let packMul = 1 - ramp * 0.25;
            profile.minPack = Math.max(1, Math.floor(profile.minPack * packMul));
            profile.maxPack = Math.max(profile.minPack, Math.floor(profile.maxPack * packMul));
        }
    }
    if (zone.type === 'underworld') profile.markerCount = Math.max(1, Math.floor(profile.markerCount * 0.5));
    return profile;
}

export function effectGenerateChaosRealmEncounterPlan(env, zone) {
    const profile = buildGetZoneEncounterProfile(env, zone);
    return [{at:28,count:profile.minPack+1,elite:true}, {at:62,count:profile.maxPack,elite:true},
        {at:100,count:1+profile.bossAdds,boss:true}];
}

export function effectGenerateMeteorEncounterPlan(zone) {
    const tier = Math.max(1, Math.floor(zone.tier || 1));
    return [{ at: 36, count: 4 + Math.min(2, Math.floor(tier / 20)) },
        { at: 76, count: 2 + Number(tier >= 40), elite: true },
        { at: 100, count: 1 + Math.min(2, Math.floor(tier / 20)), boss: true }];
}

export function effectGenerateEncounterPlan(env, zone) {
    if (zone.type === 'beyondBoundary') return boundaryEncounterPlan(env, zone);
    if (zone.type === 'cosmos') return cosmosEncounterPlan(env, zone);
    if (zone.type === 'meteor') return effectGenerateMeteorEncounterPlan(zone);
    if (zone.type === 'trial') return [{ at: 18, count: 1, elite: true }, { at: 54, count: 2, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.type === 'seasonBoss') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'outsideChaos') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'chaosRealm') return effectGenerateChaosRealmEncounterPlan(env, zone);
    if (zone.type === 'oceanDepth') return oceanEncounterPlan(env, zone);
    return ordinaryEncounterPlan(env, zone);
}

function boundaryEncounterPlan(env, zone) {
    let profile = buildGetZoneEncounterProfile(env, zone);
    if (zone.boundaryFinalWave) {
        let plan = [{ at:28, count:profile.minPack, elite:true }, { at:65, count:profile.maxPack, elite:true }];
        if (profile.bossAdds > 0) plan.push({ at:86, count:profile.bossAdds, elite:true });
        plan.push({ at:100, count:1, boss:true });
        return plan;
    }
    return [{ at:24, count:profile.minPack }, { at:58, count:profile.maxPack, elite:true }, { at:100, count:profile.minPack + 1, elite:true }];
}

function cosmosEncounterPlan(env, zone) {
    let p = buildGetZoneEncounterProfile(env, zone);
    let plan = [];
    for (let i = 1; i <= p.markerCount; i++) {
        plan.push({
            at: Math.min(98, Math.floor((100 / (p.markerCount + 1)) * i)),
            count: p.minPack + Math.floor(Math.random() * Math.max(1, (p.maxPack - p.minPack + 1))),
            elite: Math.random() < p.eliteChance
        });
    }
    plan.push({ at: 100, count: 1, boss: true });
    return plan;
}

function oceanEncounterPlan(env, zone) {
    let oceanSt = env.deps.ensureOceanState();
    // 500m 경계에 도달해 보스가 대기 중이면 이번 런은 심해 가디언 단일 전투로 구성한다.
    if (typeof env.deps.getOceanPendingBossBoundary === 'function' && env.deps.getOceanPendingBossBoundary(oceanSt) > 0) {
        env.owner.oceanBossRunPending = true;
        return [{ at: 100, count: 1, boss: true }];
    }
    env.owner.oceanBossRunPending = false;
    let profile = buildGetZoneEncounterProfile(env, zone);
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
        let at = clampNumber(Math.floor(((i + 1) / (profile.markerCount + 1)) * 96), 6, 94);
        let count = profile.minPack + Math.floor(Math.random() * Math.max(1, profile.maxPack - profile.minPack + 1));
        markers.push({ at: at, count: count, elite: Math.random() < profile.eliteChance });
    }
    markers.sort((a, b) => a.at - b.at);
    return markers;
}

function ordinaryEncounterPlan(env, zone) {
    let profile = effectGetFrequentSpawnEncounterProfile(env, zone);
    let rng = zone.type === 'act' ? env.deps.createSeededRng(`act:${zone.id}`) : Math.random;
    let markers = [];
    for (let i = 0; i < profile.markerCount; i++) {
        let at = Math.floor(((i + 1) / (profile.markerCount + 1)) * 96 + (rng() * 8 - 4));
        let spread = profile.maxPack - profile.minPack;
        let count = profile.minPack + Math.floor(Math.pow(rng(), 0.78) * (spread + 1));
        markers.push({
            at: clampNumber(at, 6, 94),
            count: clampNumber(count, profile.minPack, profile.maxPack),
            elite: rng() < profile.eliteChance
        });
    }
    markers.push({ at: 100, count: 1 + profile.bossAdds, boss: true });
    markers.sort((a, b) => a.at - b.at);
    return markers;
}
