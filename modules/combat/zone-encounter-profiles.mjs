

// Each content owns its encounter formula; unknown zone types keep the ordinary map profile.
const encounterProfiles = /* @__PURE__ */ Object.freeze({
    beyondBoundary: encounterForBeyondBoundary,
    cosmos: encounterForCosmos,
    chaosRealm: buildGetChaosRealmEncounterProfile,
    skyTower: encounterForSkyTower,
    underworld: buildGetUnderworldEncounterProfile,
    meteor: encounterForMeteor,
    trial: encounterForTrial,
    timeRift: encounterForTimeRift,
    seasonBoss: encounterForSeasonBoss,
    labyrinth: buildGetLabyrinthEncounterProfile,
    abyss: buildGetAbyssEncounterProfile,
    oceanDepth: encounterForOceanDepth
});

export function buildGetZoneEncounterProfile(env, zone) {
    if (Object.hasOwn(encounterProfiles, zone.type)) return encounterProfiles[zone.type](env, zone);
    let minPack = 1;
    let zoneIdNum = Number.isFinite(zone.id) ? zone.id : (Number(zone.tier) || 1);
    let maxPack = Math.min(3, 1 + Math.floor((zoneIdNum + 2) / 3));
    return {
        markerCount: 3 + Math.floor(zone.tier * 0.8),
        minPack: minPack,
        maxPack: maxPack,
        eliteChance: 0.05 + zone.tier * 0.015,
        bossAdds: zone.tier >= 4 ? 1 : 0,
        label: env.deps._t('{minPack}-{maxPack}기', { minPack, maxPack })
    };
}

function encounterForBeyondBoundary(env, zone) {
    let difficulty = Math.max(1, Math.floor(Number(zone.boundaryDifficultyTier) || Number(zone.boundaryTier) || 1));
    let displayTier = Math.max(1, Math.floor(Number(zone.boundaryTier) || 1));
    return {
        markerCount: Math.min(8, 3 + Math.floor(difficulty / 20)), minPack: 2,
        maxPack: Math.min(7, 3 + Math.floor(difficulty / 12)),
        eliteChance: Math.min(0.65, 0.2 + difficulty * 0.008),
        bossAdds: Math.min(4, Math.floor(difficulty / 15)), label: env.deps._t('경계 너머 {displayTier}단계', { displayTier })
    };
}

function encounterForCosmos(env, zone) {
    let gravity = Math.max(1, Number(zone.gravity || 1));
    let sizeClass = Math.max(1, Math.floor(zone.sizeClass || 1));
    let markerCount = Math.max(4, Math.min(12, 4 + sizeClass + Math.floor((gravity - 1) * 4)));
    let minPack = Math.max(2, Math.min(6, 2 + Math.floor(sizeClass / 2)));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor((gravity - 1) * 2)));
    return env.deps.cosmosRouteRuntime.encounterProfile(zone, { markerCount, minPack, maxPack, eliteChance: Math.min(0.75, 0.16 + sizeClass * 0.05), bossAdds: 2 + Math.floor(sizeClass / 2), label: zone.name || '우주계' });
}

function encounterForSkyTower(env, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(9, 2 + Math.floor(floor / 10));
    let maxPack = Math.min(10, minPack + 2 + Math.floor(floor / 18));
    return { markerCount: 40 + Math.floor(floor / 3), minPack: minPack, maxPack: Math.max(minPack, maxPack), eliteChance: Math.min(0.5, 0.18 + floor * 0.006), bossAdds: 2 + Math.floor(floor / 12), label: env.deps._t('창공의 탑 {floor}층', { floor }) };
}

function encounterForMeteor(env) {
    return { markerCount: 2, minPack: 2, maxPack: 3, eliteChance: 0.5, bossAdds: 0, label: env.deps._t('운석') };
}

function encounterForTrial(env) {
    return { markerCount: 3, minPack: 1, maxPack: 2, eliteChance: 1, bossAdds: 2, label: env.deps._t('시련') };
}

function encounterForTimeRift(env, zone) {
    let pressure = Math.max(1, Math.floor(zone.pressure || 1));
    return { markerCount: 3 + Math.floor(pressure / 3), minPack: 2, maxPack: Math.min(6, 3 + Math.floor(pressure / 4)), eliteChance: Math.min(0.8, 0.3 + pressure * 0.05), bossAdds: 1 + Math.floor(pressure / 5), label: env.deps._t('시간의 균열 (시간압 {pressure})', { pressure }) };
}

function encounterForSeasonBoss(env) {
    return { markerCount: 1, minPack: 1, maxPack: 1, eliteChance: 1, bossAdds: 0, label: env.deps._t('보스') };
}

function encounterForOceanDepth(env, zone) {
    let depthTier = Math.max(0, Math.floor(zone.depthTier || 0));
    let minPack = Math.min(6, 2 + Math.floor(depthTier / 4));
    let maxPack = Math.min(8, minPack + 2);
    return {
        markerCount: 4 + Math.floor(depthTier * 0.5),
        minPack: minPack,
        maxPack: maxPack,
        eliteChance: Math.min(0.4, 0.08 + depthTier * 0.01),
        bossAdds: 0,
        label: zone.name || '심해'
    };
}

export function buildGetChaosRealmEncounterProfile(env, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    return {
        markerCount: Math.min(16, 4 + Math.floor(floor / 8)),
        minPack: 2,
        maxPack: Math.min(8, 3 + Math.floor(floor / 6)),
        eliteChance: 0.35,
        bossAdds: Math.min(6, 2 + Math.floor(floor / 12)),
        label: env.deps._t('혼돈계 {floor}층', { floor })
    };
}

export function buildGetUnderworldEncounterProfile(env, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 3 + Math.floor(floor / 12));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2 + Math.floor(floor / 20)));
    return {
        markerCount: Math.min(16, 5 + Math.floor(floor / 8)), minPack, maxPack,
        eliteChance: Math.min(0.55, 0.2 + floor * 0.012),
        bossAdds: Math.min(6, 2 + Math.floor(floor / 20)), label: env.deps._t('지하계 {floor}층', { floor })
    };
}

export function buildGetLabyrinthEncounterProfile(env, zone) {
    let floor = Math.max(1, Math.floor(zone.floor || 1));
    let minPack = Math.min(7, 2 + Math.floor(floor / 10));
    let maxPack = Math.max(minPack, Math.min(9, minPack + 2));
    return {
        markerCount: Math.min(18, 5 + Math.floor(floor / 5)), minPack, maxPack,
        eliteChance: Math.min(0.46, 0.14 + floor * 0.009),
        bossAdds: floor % 5 === 0 ? 2 : 1, label: env.deps._t('미궁 {floor}층', { floor })
    };
}

export function buildGetAbyssEncounterProfile(env, zone) {
    let scale = env.deps.getAbyssMonsterScales(zone);
    let depth = Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1));
    let minPack = Math.max(1, Math.floor((2 + Math.floor(zone.tier / 7)) * (scale.hordeMul || 1)));
    let maxPack = Math.max(minPack, Math.floor(Math.min(10, 4 + Math.floor(zone.tier * 0.42)) * (scale.hordeMul || 1)));
    let markerCount = Math.max(6, Math.floor((8 + Math.floor(zone.tier * 0.48)) * (scale.mapLengthMul || 1)));
    let bossAdds = 2 + Math.floor(zone.tier / 4);
    if (depth >= 21) {
        minPack = Math.min(7, minPack);
        maxPack = Math.max(minPack, Math.min(11, maxPack));
        markerCount = Math.min(20, markerCount);
        bossAdds = Math.min(7, bossAdds);
    }
    return {
        markerCount, minPack, maxPack,
        eliteChance: Math.min(0.8, 0.13 + zone.tier * 0.012 + (scale.eliteBonus || 0)),
        bossAdds, label: env.deps._t('{minPack}-{maxPack}기', { minPack, maxPack })
    };
}
