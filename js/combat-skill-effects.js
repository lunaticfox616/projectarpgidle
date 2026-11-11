// 지도 위협 추정, 스킬 적중 효과, 상태 이상과 주기 효과 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function getMapBossPatternMultiplier(bossMods, zone) {
    let fixedMode = String((bossMods && bossMods.patternMode) || '');
    let cosmosBossMechanic = fixedMode === 'cosmosBoss' && typeof getCosmosGalaxyBossMechanic === 'function'
        ? getCosmosGalaxyBossMechanic(zone && zone.cosmosNodeId) : null;
    return cosmosBossMechanic
        ? Math.max(1, Number(cosmosBossMechanic.damageMul) || 1)
        : fixedMode
        ? getBossPatternPeakDamageMultiplier(fixedMode)
        : getMaximumBossPatternDamageMultiplierForLoop(game.season || 1);
}

/** [main, added] damage elements of a chaos depth's boss; null for any other zone. */
function getChaosBossElements(zone) {
    if (!zone || zone.type !== 'abyss') return null;
    const depth = Math.max(1, Math.floor(zone.depth || getAbyssDepthFromZoneId(zone.id) || 1));
    return [CHAOS_BOSS_ELEMENTS[depth % 4], CHAOS_BOSS_ELEMENTS[(depth + 1) % 4]];
}

/** Current rules, authored boss body, chaos depth, then the ordinary random element pool. */
function pickEnemyElement(zone, pool, isBoss) {
    if (hasOceanCurrent(zone, 'cold_current')) return 'cold';
    if (hasOceanCurrent(zone, 'warm_current')) return 'fire';
    const own = isBoss && BOSS_BODY_ELEMENTS[zone.bossVisualId];
    if (own) return own;
    const chaosBoss = isBoss ? getChaosBossElements(zone) : null;
    return chaosBoss ? chaosBoss[0] : rndChoice(pool);
}

function getMapEstimateDamageElements(zone) {
    const cosmosBoss = zone && zone.type === 'cosmos' && typeof getCosmosGalaxyBossMechanic === 'function'
        ? getCosmosGalaxyBossMechanic(zone.cosmosNodeId) : null;
    if (cosmosBoss) {
        if (cosmosBoss.elementRule === 'physical') return ['phys'];
        if (cosmosBoss.elementRule === 'chaos') return ['chaos'];
        if (cosmosBoss.elementRule === 'weakestResistance') return ['fire', 'cold', 'light', 'chaos'];
        if (cosmosBoss.elementRule === 'alternatingWeakest') return ['phys', 'fire', 'cold', 'light', 'chaos'];
    }
    return zone && zone.ele === 'chaos'
        ? ['fire', 'cold', 'light', 'chaos']
        : ['phys', 'fire', 'cold', 'light', 'chaos'];
}

function getMapEstimateAffixPressure(zone) {
    const sourceFloor = zone && (zone.bloomTrialAffixFloor || (zone.type === 'chaosRealm' && zone.floor));
    const floor = Math.max(0, Math.floor(Number(sourceFloor) || 0));
    const result = { penetration: 0, critChance: 0, critDamageMul: ENEMY_CRITICAL_DAMAGE_MULTIPLIER, attackRateMul: 1, doubleStrikeChance: 0 };
    if (floor <= 0 || typeof getChaosRealmAffixes !== 'function') return result;
    getChaosRealmAffixes(floor).forEach(affix => {
        const scale = Number(affix.scale) || (typeof getChaosRealmAffixScale === 'function' ? getChaosRealmAffixScale(floor) : 1);
        if (affix.id === 'curse_blade') { result.attackRateMul *= 1.18 + floor * 0.006; result.penetration += Math.floor(8 * scale); }
        if (affix.id === 'deadly_crit') { result.critChance += Math.floor(18 * scale); result.critDamageMul = Math.max(result.critDamageMul, 1.95 + floor * 0.01); }
        if (affix.id === 'multi_strike') result.doubleStrikeChance = Math.max(result.doubleStrikeChance, Math.min(45, 18 + floor * 0.6));
        if (affix.id === 'deep_penetration') result.penetration += Math.floor(18 * scale);
    });
    return result;
}

function getMapEstimateThreatProfile(zone, bossMods, baseHit, seasonDepth, tier) {
    const affix = getMapEstimateAffixPressure(zone);
    const benchmark = getDifficultyBenchmarkProfile(zone);
    const contentAttackRateMul = benchmark ? benchmark.attackRate
        : zone.type === 'underworld' ? 0.76
        : zone.type === 'skyTower' ? 1.05 : 1;
    const critChance = Math.max(0, ((game.season || 1) >= 2 ? 16 : 0)
        + Number(bossMods.critChanceBonus || 0) + affix.critChance);
    const critDamageMul = Math.max(ENEMY_CRITICAL_DAMAGE_MULTIPLIER, affix.critDamageMul);
    const peakHit = baseHit * getMapBossPatternMultiplier(bossMods, zone)
        * (critChance > 0 ? critDamageMul : 1);
    const tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    const attackRate = (0.26 + tier * 0.013) * 1.10
        * (1 + seasonDepth * (0.012 + tierPressure * 0.018)) * 1.16 * 1.18
        * Math.max(0.1, Number(bossMods.atkMul || 1))
        * Math.max(0.1, Number(bossMods.attackSpeedMul || 1))
        * affix.attackRateMul * contentAttackRateMul
        * (zone.type === 'beyondBoundary' ? Math.max(1, Number(zone.boundaryAttackSpeedMul) || 1) : 1);
    // 2.5초 안의 이어지는 타격 수는 연속값으로 센다(2026-10-06). 정수로 세면 공격 속도 몇 %로 한 대가 통째로 붙어, 루프 20부터
    // 액트 10(초당 0.757)은 0대, 혼돈 1(초당 0.804)은 1대라 1.2배 센 타격에 권장 EHP가 1.8배로 보였다. 예전 계단의 가운데를
    // 지나는 직선이라 평균 권장값은 그대로다.
    const followUpHits = Math.max(0, Math.min(2, attackRate * 2.5 - 1.5));
    const averageCritMul = 1 + Math.min(1, critChance / 100) * (critDamageMul - 1);
    return {
        peakHit,
        threatWindow: peakHit + baseHit * averageCritMul * (followUpHits + affix.doubleStrikeChance / 100),
        resistancePressure: ((game.season || 1) >= 4 ? 14 : 0)
            + Math.max(0, Number(bossMods.penetration || 0)) + affix.penetration
            + (zone.type === 'beyondBoundary' ? Math.max(0, Number(zone.boundaryPenetrationBonus) || 0) : 0)
    };
}

/** Keep environmental HP drain separate from zones that only inherit underworld gravity. */
function getMapEstimateZonePenalties(zone) {
    const underworldGravityFloor = Math.max(0, Math.floor(Number(
        zone.type === 'underworld' ? zone.floor : zone.underworldPenaltyFloor) || 0));
    return {
        underworldGravityFloor,
        underworldLifeDrainFloor: zone.type === 'underworld' ? underworldGravityFloor : 0,
        underworldGravityIgnoresReduction: false,
        oceanPressureDepthTier: Math.max(0, Math.floor(Number(zone.oceanPressureDepthTier) || 0))
    };
}

/**
 * 지도 카드에 표시할 대략적인 보스전 기준치다.
 * @param {{type:string,tier:number,id:(number|string),ele?:string}} zone
 * @returns {{dps:number,ehp:number,element:string,clearTimeSec:number,basis:string}|null}
 */
/** The power a zone asks for (its boss's life against the clear time, the boss threat window, peak hit, resistance pressure), for
 * the map and atlas readiness; null for kinds it cannot estimate. Split into its parts on 2026-10-18; the products keep their order. */
function estimateMapZonePowerRequirements(zone) {
    const supportedTypes = ['act', 'abyss', 'labyrinth', 'underworld', 'chaosRealm', 'oceanDepth', 'skyTower', 'seasonBoss', 'timeRift', 'meteor', 'beehive', 'colony', 'grandBreach', 'trial', 'cosmos', 'beyondBoundary', 'atlasMap'];
    if (!zone || !supportedTypes.includes(zone.type)) return null;
    let tier = Math.max(1, Number(levelProgression.combatZone(zone).tier) || 1);
    let loopInputs = getLoopDifficultyInputs(zone);
    let seasonDepth = getSoftenedLoopDepth(loopInputs.seasonLoops);
    let tierProgress = clampNumber((tier - 1) / 18, 0, 1);
    let hp = getMapEstimateMonsterHp(zone, tier, loopInputs, tierProgress);
    let abyssScale = getAbyssMonsterScales(zone);
    let contentScale = resolveMapEstimateContentScale(zone);
    const { bossMods, cosmosTrait } = getMapEstimateBossMods(zone);
    const entryTuning = getEntryBossTuning(zone, true);
    const parts = { hp, tier, tierProgress, loopInputs, seasonDepth, abyssScale, contentScale, bossMods, cosmosTrait, entryTuning };
    let bossHp = getMapEstimateBossHp(zone, parts);
    let bossHit = getMapEstimateBossHit(zone, parts);
    const threat = getMapEstimateThreatProfile(zone, getMapEstimateThreatMods(bossMods, cosmosTrait), bossHit, seasonDepth, tier);
    return getAtlasPackReadiness(zone, hp, {
        dps: Math.max(1, Math.round(getMapBossRequiredDps(bossHp, contentScale.clearTimeSec, zone.boundaryRegenRate))),
        ehp: Math.max(1, Math.round(threat.threatWindow)),
        peakHit: Math.max(1, Math.round(threat.peakHit)),
        resistancePressure: threat.resistancePressure,
        elements: getChaosBossElements(zone) || getMapEstimateDamageElements(zone),
        playerDpsMultiplier: 1,
        ...getMapEstimateZonePenalties(zone),
        zoneId: zone.id,
        element: String(zone.ele || 'phys'),
        clearTimeSec: contentScale.clearTimeSec,
        basis: 'bossThreatWindow'
    });
}

/** A normal monster's life at the zone's tier and loop (a fixed-difficulty zone by its scale). */
function getMapEstimateMonsterHp(zone, tier, loopInputs, tierProgress) {
    let hp = ((56 + tier * 30) * 1.15)
        * (1 + tierProgress * 9)
        * getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress);
    if (loopInputs.exempt) hp *= Number(zone.fixedDifficultyMul) || 1;
    return hp;
}

/** The zone's boss modifiers (a cosmos encounter's, else the zone's own) and a cosmos boss's exclusive trait. */
function getMapEstimateBossMods(zone) {
    let bossMods = (zone.bossMods && typeof zone.bossMods === 'object') ? zone.bossMods : {};
    if (zone.type === 'cosmos') bossMods = getCosmosEnemyModifiers(zone, false, true) || bossMods;
    let cosmosTrait = zone.type === 'cosmos' ? getCosmosExclusiveEnemyTrait(zone, false, true, hashSeed(zone.cosmosNodeId || zone.id)) : null;
    return { bossMods, cosmosTrait };
}

/** The boss's life with its energy shield, the underworld entry tuning and trial 3's 85%. */
function getMapEstimateBossHp(zone, p) {
    const { hp, tier, tierProgress, loopInputs, contentScale, bossMods, cosmosTrait } = p;
    const k = getMapEstimateBossHpFactors(zone, p);
    let bossHp = hp * (1.8 + tier * 0.6) * (1 + tierProgress * 4) * getBossHpEase(tier, getMonsterLoopHpMultiplier(zone, loopInputs, tierProgress))
        * k.abyssHp * k.abyssBoss * 0.92
        * contentScale.hp * k.modHp * k.mapHp
        * k.traitHp;
    let estimateEnergyShieldPct = Math.max(Number(bossMods.energyShieldPct || 0), Number(cosmosTrait && cosmosTrait.energyShieldPct || 0));
    if (estimateEnergyShieldPct > 0) bossHp *= 1 + estimateEnergyShieldPct / 100;
    bossHp *= p.entryTuning.hp;
    if (zone.type === 'trial' && zone.id === 'trial_3') bossHp *= 0.85;
    return bossHp;
}

/** The boss's hit: tier and loop growth, the abyss, content, modifier and map scales, the early-act ease from loop 3, the underworld
 * entry tuning and the loop power scale. */
function getMapEstimateBossHit(zone, p) {
    const { tier, seasonDepth, contentScale } = p;
    let tierPressure = clampNumber((tier - 1) / 10, 0, 1);
    const k = getMapEstimateBossHitFactors(zone, p);
    let bossHit = (2.4 + tier * 3.35) * 1.15
        * getMonsterLoopGrowthScale(zone, 'damage', seasonDepth, tierPressure)
        * (1.14 + tier * 0.16) * 1.34
        * k.abyssDmg * k.abyssTaken * k.abyssBoss
        * contentScale.damage * k.modDmg * k.mapDmg
        * k.traitDmg;
    if (zone.type === 'act' && Number(zone.id) <= 1 && (game.season || 1) >= 3) bossHit *= 0.58;
    bossHit *= p.entryTuning.damage * getMonsterLoopPowerScale(zone, 'damage');
    return bossHit;
}

/** The boss life's scales that default to 1: the abyss life and boss scales, the modifiers' and map's life, a cosmos trait's life. */
function getMapEstimateBossHpFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return { abyssHp: abyssScale.hpMul || 1, abyssBoss: abyssScale.bossMul || 1, modHp: bossMods.hpMul || 1, mapHp: zone.mapHpMul || 1,
        traitHp: cosmosTrait && cosmosTrait.hpMul ? cosmosTrait.hpMul : 1 };
}

/** The boss hit's scales that default to 1: the abyss damage, taken and boss scales, the modifiers' and map's damage, a cosmos trait's
 * damage. */
function getMapEstimateBossHitFactors(zone, p) {
    const { abyssScale, bossMods, cosmosTrait } = p;
    return { abyssDmg: abyssScale.dmgMul || 1, abyssTaken: abyssScale.playerTakenMul || 1, abyssBoss: abyssScale.bossMul || 1, modDmg: bossMods.damageMul || 1,
        mapDmg: zone.mapDamageMul || 1, traitDmg: cosmosTrait && cosmosTrait.damageMul ? cosmosTrait.damageMul : 1 };
}

/** The boss modifiers the threat reads, with a cosmos trait's penetration, attack and speed added. */
function getMapEstimateThreatMods(bossMods, cosmosTrait) {
    return cosmosTrait ? {
        ...bossMods,
        penetration: Number(bossMods.penetration || 0) + Number(cosmosTrait.penetration || 0),
        atkMul: Number(bossMods.atkMul || 1) * Number(cosmosTrait.atkMul || 1),
        attackSpeedMul: Number(bossMods.attackSpeedMul || 1) * Number(cosmosTrait.attackSpeedVarMul || 1)
    } : bossMods;
}

/** Atlas map readiness covers both an elite-led room pack (3 + the pack-size mod) and the node boss. */
function getAtlasPackReadiness(zone, baseHp, bossEstimate) {
    if (zone.type !== 'atlasMap') return bossEstimate;
    const pack = 3 + zone.packExtra;
    const tier = levelProgression.combatZone(zone).tier;
    const loops = getLoopDifficultyInputs(zone);
    const depth = getSoftenedLoopDepth(loops.seasonLoops);
    const rank = {hp:getEliteLoopHpMultiplier(zone, loops.loopCount), hit:1.28, crit:10, rate:1.16, pressure:8};
    const loop = game.season || 1;
    const hp = baseHp * resolveMapEstimateContentScale(zone).hp * 0.92 * rank.hp * (zone.mapHpMul || 1);
    const affix = getMapEstimateAffixPressure(zone);
    const hit = getMonsterBaseHitDamage(zone, depth, clampNumber((tier - 1) / 10, 0, 1), null)
        * rank.hit * (zone.mapDamageMul || 1);
    const critChance = (loop >= 2 ? rank.crit : 0) + affix.critChance;
    const peak = hit * (critChance > 0 ? affix.critDamageMul : 1);
    const rate = (0.26 + tier * 0.013) * 1.10
        * (1 + depth * (0.012 + clampNumber((tier - 1) / 10, 0, 1) * 0.018))
        * rank.rate * 1.03 * affix.attackRateMul;
    const hits = Math.max(1, Math.ceil(rate * 2.5)) * pack;
    return {
        ...bossEstimate,
        dps: Math.max(bossEstimate.dps, Math.round(hp * pack / bossEstimate.clearTimeSec)),
        peakHit: Math.max(bossEstimate.peakHit, Math.round(peak)),
        ehp: Math.max(bossEstimate.ehp, Math.round(peak + hit * (hits - 1)
            * (1 + Math.min(1, critChance / 100) * (affix.critDamageMul - 1)))),
        resistancePressure: (loop >= 4 ? rank.pressure : 0) + affix.penetration,
        basis: 'packThreatWindow'
    };
}

function getEncounterDifficultyValue(zone) {
    if (!zone) return 1;
    if (Number.isFinite(zone.floor)) return Math.max(1, Math.floor(zone.floor));
    if (Number.isFinite(zone.depthTier)) return Math.max(1, Math.floor(zone.depthTier));
    if (Number.isFinite(zone.pressure)) return Math.max(1, Math.floor(zone.pressure));
    return Math.max(1, Math.floor(Number(zone.tier) || Number(zone.id) || 1));
}

function getFrequentSpawnEncounterProfile(zone) {
    let profile = { ...getZoneEncounterProfile(zone) };
    let difficulty = getEncounterDifficultyValue(zone);
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

function generateChaosRealmEncounterPlan(zone) {
    const profile = getZoneEncounterProfile(zone);
    return [{at:28,count:profile.minPack+1,elite:true}, {at:62,count:profile.maxPack,elite:true},
        {at:100,count:1+profile.bossAdds,boss:true}];
}

function generateMeteorEncounterPlan(zone) {
    const tier = Math.max(1, Math.floor(zone.tier || 1));
    return [{ at: 36, count: 4 + Math.min(2, Math.floor(tier / 20)) },
        { at: 76, count: 2 + Number(tier >= 40), elite: true },
        { at: 100, count: 1 + Math.min(2, Math.floor(tier / 20)), boss: true }];
}

function generateEncounterPlan(zone) {
    if (zone.type === 'beyondBoundary') {
        let profile = getZoneEncounterProfile(zone);
        if (zone.boundaryFinalWave) {
            let plan = [{ at:28, count:profile.minPack, elite:true }, { at:65, count:profile.maxPack, elite:true }];
            if (profile.bossAdds > 0) plan.push({ at:86, count:profile.bossAdds, elite:true });
            plan.push({ at:100, count:1, boss:true });
            return plan;
        }
        return [{ at:24, count:profile.minPack }, { at:58, count:profile.maxPack, elite:true }, { at:100, count:profile.minPack + 1, elite:true }];
    }
    if (zone.type === 'cosmos') {
        let p = getZoneEncounterProfile(zone);
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
    if (zone.type === 'meteor') return generateMeteorEncounterPlan(zone);
    if (zone.type === 'trial') return [{ at: 18, count: 1, elite: true }, { at: 54, count: 2, elite: true }, { at: 100, count: 2, boss: true }];
    if (zone.type === 'seasonBoss') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'outsideChaos') return [{ at: 100, count: 1, boss: true }];
    if (zone.type === 'chaosRealm') return generateChaosRealmEncounterPlan(zone);
    if (zone.type === 'oceanDepth') {
        let oceanSt = ensureOceanState();
        // 500m 경계에 도달해 보스가 대기 중이면 이번 런은 심해 가디언 단일 전투로 구성한다.
        if (typeof getOceanPendingBossBoundary === 'function' && getOceanPendingBossBoundary(oceanSt) > 0) {
            game.oceanBossRunPending = true;
            return [{ at: 100, count: 1, boss: true }];
        }
        game.oceanBossRunPending = false;
        let profile = getZoneEncounterProfile(zone);
        let markers = [];
        for (let i = 0; i < profile.markerCount; i++) {
            let at = clampNumber(Math.floor(((i + 1) / (profile.markerCount + 1)) * 96), 6, 94);
            let count = profile.minPack + Math.floor(Math.random() * Math.max(1, profile.maxPack - profile.minPack + 1));
            markers.push({ at: at, count: count, elite: Math.random() < profile.eliteChance });
        }
        markers.sort((a, b) => a.at - b.at);
        return markers;
    }
    let profile = getFrequentSpawnEncounterProfile(zone);
    let rng = zone.type === 'act' ? createSeededRng(`act:${zone.id}`) : Math.random;
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

function resetBattleRuntimeVisuals() {
    battleFx = [];
    battleFxId = 0;
    pendingSkillStageHits = [];
    pendingEnemyCombatAttacks = [];
    latestPlayerSwingImpactAt = 0;
    nextPlayerDamageTextGroupId = 1;
    battleVisualState = createBattleVisualState();
    crowdPauseActive = false;
    trialHazardRuntime = { nextAt: 0, active: null };
}

function getTrialHazardProfile(zone) {
    let source = zone && zone.trialHazard ? zone.trialHazard : {};
    return {
        pattern: ['line', 'pool', 'cross', 'block'].includes(source.pattern) ? source.pattern : 'line',
        reach: Math.max(1, Math.floor(Number(source.reach) || 1)),
        warningMs: Math.max(800, Math.min(3000, Number(source.warningMs) || 1700)),
        intervalMs: Math.max(2400, Math.min(12000, Number(source.intervalMs) || 6000)),
        initialDelayMs: Math.max(1000, Math.min(6000, Number(source.initialDelayMs) || 2200)),
        persistent: source.persistent === true
    };
}

function primeTrialHazardTimer(zone) {
    // 개화 시련 밖으로 나가면 누적된 재생 억제를 해제한다.
    if (!zone || !zone.bloomTrial) game.bloomTrialRegenSuppress = 0;
    if (!zone || (zone.type !== 'trial' && !zone.trialHazard)) {
        trialHazardRuntime = { nextAt: 0, active: null };
        game.trialHazardIndex = 0;
        return;
    }
    game.trialHazardIndex = 0;
    trialHazardRuntime = {
        nextAt: getCombatTime() + getTrialHazardProfile(zone).initialDelayMs,
        active: null
    };
}

/** 개화 재능은 지금 전직이 속한 직업의 대표 재능이다(2026-10-02 재능 정리). 카드도 그 재능 × 전직으로 정해진다. */
function resolveTalentBloomHeroId() {
    const heroId = typeof getTalentBloomHeroIdForAscendancy === 'function' ? getTalentBloomHeroIdForAscendancy(game.ascendClass) : null;
    if (heroId) return heroId;
    if (HERO_SELECTION_DEFS[game.pendingTalentBloomHeroId]) return game.pendingTalentBloomHeroId;
    return HERO_SELECTION_DEFS[game.selectedHeroId] ? game.selectedHeroId : 'hero1';
}

function unlockLoopBloomSpecialization(heroId, classKey, classLabel, firstEverBloomOfClass) {
    if (!classKey || classKey === 'none' || game.bloomLoopSpecGranted === classKey) return false;
    game.bloomLoopSpecGranted = classKey;
    game.bloomedClassThisLoop = classKey;
    game.bloomedTalentThisLoop = heroId;
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 2;
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    game.ascendRank = Math.max(game.ascendRank || 0, 5);
    if (firstEverBloomOfClass && typeof queueTutorialNotice === 'function') {
        queueTutorialNotice('unlock_fifth_node', _t('5차 특화 노드'), _t('이번 루프에 처음 피운 개화 조합으로 5차 특화 노드가 열렸습니다.\n‘스킬트리 → 전직’에서 재능과 전직 특화 노드를 확인하세요.'), 'tab-traits');
    }
    addLog(_t('[{classLabel}] 5차 특화 개방: 전직 포인트 +2, 키스톤 포인트 +1', { classLabel }), 'loot-unique');
    return true;
}

function awardTalentBloomCard(comboKey, heroLabel, classLabel) {
    if (typeof recordTalentBloomCard !== 'function') return;
    let result = recordTalentBloomCard(comboKey);
    if (!game.unlocks) game.unlocks = {};
    let firstUnlock = !game.unlocks.talent;
    game.unlocks.talent = true;
    game.noti.talent = true;
    if (firstUnlock && typeof queueTutorialNotice === 'function') {
        queueContentNotice('unlock_talent_tab', '재능 개화', 'talent', { open: '재능 개화 카드를 얻었습니다.\n‘재능’에서 가진 카드와 효과를 확인하세요.',
            locked: '재능 개화 카드를 얻었습니다.\n‘해금’에서 재능을 열면 카드와 효과를 관리할 수 있습니다.' }, 'tab-talent');
    }
    addLog(_t('개화 카드 [{hero} × {cls}] Lv.{level} (점수 {score}){up}', { hero: heroLabel, cls: classLabel, level: result.card.level, score: result.score, up: result.leveledUp ? `, ${_t('레벨 상승')}` : '' }), 'loot-unique');
    dispatchRuntimeEvent('talent-tab-refresh-requested');
}

// 재능 개화 시련 클리어 처리. 카드 조합은 입장 시 고르고, 5차 특화 포인트는 루프당 한 번만 지급한다.
function handleTalentBloomClear(zone) {
    game.currencies.chaosKey = Math.max(0, Math.floor(game.currencies.chaosKey || 0) - 1);
    game.currencies.coreKey = Math.max(0, Math.floor(game.currencies.coreKey || 0) - 1);
    game.bloomTrialRegenSuppress = 0;
    let heroId = resolveTalentBloomHeroId(), classKey = game.ascendClass || 'none';
    let comboKey = `${heroId}__${classKey}`;
    game.pendingTalentBloomHeroId = null;
    game.talentBloomClears = Math.max(0, Math.floor(game.talentBloomClears || 0)) + 1;
    game.talentBloomCombos = Array.isArray(game.talentBloomCombos) ? game.talentBloomCombos : [];
    let isNewCombo = !game.talentBloomCombos.includes(comboKey);
    if (isNewCombo) game.talentBloomCombos.push(comboKey);
    let heroLabel = HERO_SELECTION_DEFS[heroId]?.label || heroId;
    let classLabel = CLASS_TEMPLATES[classKey]?.name || '미전직';
    addLog(_t('재능 개화 성공: [{hero} × {cls}]{fresh}', { hero: heroLabel, cls: classLabel, fresh: isNewCombo ? `, ${_t('신규 조합')}` : '' }), 'loot-unique');
    game.bloomedClasses = Array.isArray(game.bloomedClasses) ? game.bloomedClasses : [];
    let firstEverBloomOfClass = classKey !== 'none' && !game.bloomedClasses.includes(classKey);
    if (firstEverBloomOfClass) game.bloomedClasses.push(classKey);
    unlockLoopBloomSpecialization(heroId, classKey, classLabel, firstEverBloomOfClass);
    awardTalentBloomCard(comboKey, heroLabel, classLabel);
    game.currentZoneId = getAutoProgressZoneId(game.maxZoneId);
    game.killsInZone = 0;
    game.inTicketBossFight = false;
    startMoving(false);
    updateStaticUI();
    queueImportantSave(200);
}

function getDotStackMultiplier(stacks) {
    let safeStacks = Math.max(1, Math.min(DOT_STACK_MAX, Math.floor(stacks || 1)));
    return Math.pow(1 + DOT_STACK_GROWTH_PER_STACK, safeStacks - 1);
}

function applyEnemyDotFromHit(enemy, hitDamage, pStats) {
    if (!enemy || enemy.hp <= 0) return;
    let prev = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
    let nextStacks = Math.min(DOT_STACK_MAX, Math.max(0, (prev && prev.stacks) || 0) + 1);
    let skillStackCap = Math.max(1, Math.floor(Number(pStats && pStats.sSkill && pStats.sSkill.dotStackCap) || DOT_STACK_MAX));
    nextStacks = Math.min(skillStackCap, nextStacks);
    let skillStackGrowth = Math.max(0, Number(pStats && pStats.sSkill && pStats.sSkill.dotStackDamagePct) || 0) / 100;
    let stackMultiplier = skillStackGrowth > 0 ? Math.pow(1 + skillStackGrowth, nextStacks - 1) : getDotStackMultiplier(nextStacks);
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let baseTick = Math.max(1, Math.floor(Math.max(1, hitDamage) * DOT_TICK_FROM_HIT_RATIO * dotDamageScale));
    let nextRawTickDamage = Math.max(1, Math.floor(baseTick * stackMultiplier));
    let tickInterval = DOT_TICK_INTERVAL * Math.max(0.05, (pStats && Number.isFinite(pStats.dotTickIntervalMultiplier)) ? pStats.dotTickIntervalMultiplier : 1);
    let duration = DOT_EFFECT_DURATION * Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1);
    enemy.dotState = {
        stacks: nextStacks,
        rawTickDamage: Math.max(nextRawTickDamage, (prev && prev.rawTickDamage) || 0),
        tickInterval: tickInterval,
        tickTimer: (prev && Number.isFinite(prev.tickTimer)) ? Math.min(prev.tickTimer, tickInterval) : tickInterval,
        timeLeft: duration,
        ele: (pStats && pStats.sSkill && pStats.sSkill.ele) || 'chaos',
        skillName: game.activeSkill || 'dot'
    };
    enemy.skillSlowPct = Math.min(95, Math.max(0, Number(pStats && pStats.sSkill && pStats.sSkill.dotStackSlowPct) || 0) * nextStacks);
    if (pStats && pStats.sSkill && pStats.sSkill.flameDecayDebuff) syncEnemyFlameDecayAilment(enemy, enemy.dotState, pStats);
    enemy.dotStacks = nextStacks;
}

function isFlameDecayLit(enemy) {
    const dot = enemy && enemy.dotState;
    return !!dot && dot.skillName === '화염 부패' && dot.timeLeft > 0;
}

/** 지속 피해 룬의 타격: 화염 부패가 터지면 새로 걸지 않고, 아니면 지속 피해를 건다(걸린 때를 적어 둔다). */
function applySkillDotFromHit(enemy, hitDamage, pStats) {
    if (pStats.sSkill && pStats.sSkill.flameDecayDebuff && detonateFlameDecay(enemy, hitDamage, pStats)) return;
    applyEnemyDotFromHit(enemy, hitDamage, pStats);
    markFlameDecayLit(enemy, hitDamage);
}

/** 막 붙인 불에 붙인 때와 터질 때의 피해를 적어 둔다(이미 적힌 불은 그대로). */
function markFlameDecayLit(enemy, hitDamage) {
    if (enemy.dotState && !enemy.dotState.appliedAt) Object.assign(enemy.dotState, { appliedAt: getCombatTime(), burstDamage: Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100) });
}

/** 그 적의 불을 끈다(지속 피해, 느려짐, 화염 부패 표시). */
function clearFlameDecay(enemy) {
    enemy.dotState = null;
    enemy.dotStacks = 0;
    enemy.skillSlowPct = 0;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter(ail => ail && ail.type !== 'flameDecay') : [];
}

/** 터짐: 그 적 둘레(마름모 radius칸)의 다른 적에게 burst 피해를 준다. @returns {object[]} 휘말린 적(가까운 차례) */
function burstFlameDecay(enemy, burstDamage, pStats) {
    const reach = cell => Math.abs(cell.gx - enemy.gx) + Math.abs(cell.gy - enemy.gy) <= FLAME_DECAY_BURST.radius;
    const near = (game.enemies || []).filter(other => other && other !== enemy && other.hp > 0 && hasGridCell(other) && getGridUnitCells(other).some(reach))
        .sort((a, b) => getGridUnitDistance(enemy, a) - getGridUnitDistance(enemy, b));
    for (const other of near) {
        const damage = applyDamageToEnemyResource(other, flameDecayMitigated(other, burstDamage, pStats));
        addBattleFx('hit', { enemyId: other.id, damage, element: 'fire', color: getElementColor('fire'), duration: 240, noLine: true });
    }
    enemy.flameDecayBurstAt = getCombatTime(); // 무대 연출이 그 자리에서 폭발을 그린다(js/canvas-stage-skill-rules.js)
    return near;
}

/** 이미 걸린 적에게 다시 맞혔다. @returns {boolean} 터뜨렸는지 */
function detonateFlameDecay(enemy, hitDamage, pStats) {
    if (!hasGridCell(enemy) || !isFlameDecayLit(enemy) || getCombatTime() - (enemy.dotState.appliedAt || 0) < FLAME_DECAY_BURST.settleMs) return false;
    const dot = enemy.dotState, burst = Math.max(1, Math.floor(hitDamage * FLAME_DECAY_BURST.pct / 100));
    const ticks = Math.floor(dot.timeLeft / Math.max(0.02, Number(dot.tickInterval) || DOT_TICK_INTERVAL));
    clearFlameDecay(enemy);
    const damage = applyDamageToEnemyResource(enemy, flameDecayMitigated(enemy, ticks * (dot.rawTickDamage || 0) + burst, pStats));
    addBattleFx('hit', { enemyId: enemy.id, damage, element: 'fire', color: getElementColor('fire'), duration: 240, noLine: true });
    const spread = burstFlameDecay(enemy, burst, pStats).filter(other => other.hp > 0 && !isFlameDecayLit(other)).slice(0, FLAME_DECAY_BURST.spread);
    for (const other of spread) { applyEnemyDotFromHit(other, hitDamage, pStats); markFlameDecayLit(other, hitDamage); }
    enemy.flameDecaySpread = spread.map(other => other.id); // 불길 줄기를 그릴 대상
    return true;
}

/** 화염 부패가 걸린 채 죽은 적: 둘레가 터진다(옮겨 붙지는 않는다). 터짐에 죽은 적은 다음 전투 틱의 정리(coreLoop sanitizeCombatRuntimeState)가 거둔다. */
function burstFlameDecayOnDeath(enemy, pStats) {
    if (!isFlameDecayLit(enemy) || !hasGridCell(enemy)) return;
    const burst = Math.max(1, Math.floor((enemy.dotState.burstDamage || 0)));
    clearFlameDecay(enemy);
    if (burst > 1) burstFlameDecay(enemy, burst, pStats);
}

function getSkillAilmentStats(pStats, hitElement, curseFx) {
    let skill = pStats.sSkill || {};
    let bonus = skill.ailmentChanceBonus || {};
    let curseChance = curseFx && curseFx.ailmentChanceAdd ? curseFx.ailmentChanceAdd : {};
    return {
        ...pStats,
        igniteChance: (pStats.igniteChance || 0) + (bonus.ignite || 0) + ((curseChance.ignite || 0) * 100),
        chillChance: (pStats.chillChance || 0) + (bonus.chill || 0) + ((curseChance.chill || 0) * 100),
        freezeChance: (pStats.freezeChance || 0) + (bonus.freeze || 0) + ((curseChance.freeze || 0) * 100),
        shockChance: (pStats.shockChance || 0) + (bonus.shock || 0) + ((curseChance.shock || 0) * 100),
        poisonChance: (pStats.poisonChance || 0) + (bonus.poison || 0) + ((curseChance.poison || 0) * 100),
        bleedChance: (pStats.bleedChance || 0) + ((bonus.bleed || 0) + ((curseChance.bleed || 0) * 100)) * getPassiveBleedMultiplier(pStats),
        sSkill: { ...skill, ele: hitElement }
    };
}

function getSkillConditionalDamageMultiplier(skill, enemy, onCue) {
    let multiplier = 1;
    let active = skill.activeAilmentDamageMore;
    let ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    if (active && ailments.some(ail => ail && ail.type === active.type && (ail.time || 0) > 0)) {
        let pct = Math.max(0, Number(active.pct) || 0);
        multiplier *= 1 + pct / 100;
        if (typeof onCue === 'function') onCue({
            key: `ailment-${active.type}`,
            text: _t('{type} 연계: 피해 {pct}% 증폭', { type: getAilmentDisplayLabel(active.type), pct }),
            color: getElementColor(skill.ele)
        });
    }
    let consumed = false;
    (skill.consumeAilmentDamageMore || []).forEach(config => {
        if (consumed) return;
        let index = ailments.findIndex(ail => ail && ail.type === config.type && (ail.time || 0) > 0);
        if (index < 0) return;
        let pct = Math.max(0, Number(config.pct) || 0);
        multiplier *= 1 + pct / 100;
        ailments.splice(index, 1);
        consumed = true;
        if (typeof onCue === 'function') onCue({
            key: `consume-${config.type}`,
            text: _t('{type} 소모: 피해 {pct}% 증폭', { type: getAilmentDisplayLabel(config.type), pct }),
            color: getElementColor(skill.ele)
        });
    });
    let missingPct = 1 - Math.max(0, enemy.hp || 0) / Math.max(1, enemy.maxHp || 1);
    multiplier *= 1 + missingPct * Math.max(0, Number(skill.missingLifeDamagePct) || 0) / 100;
    if ((enemy.hp || 0) >= Math.max(1, enemy.maxHp || 1)) {
        let pct = Math.max(0, Number(skill.fullLifeDamageMorePct) || 0);
        multiplier *= 1 + pct / 100;
        if (pct > 0 && typeof onCue === 'function') onCue({ key:'full-life', text:_t('선제: 피해 {pct}% 증폭', { pct }), color:'#ffd27a' });
    }
    if (game.gridPlayer && hasGridCell(enemy)) {
        let distance = getGridUnitDistance(game.gridPlayer, enemy);
        let distanceBonus = Math.max(0, distance - 1) * Math.max(0, Number(skill.distanceDamageMorePerCellPct) || 0);
        let cap = Math.max(0, Number(skill.distanceDamageMoreCapPct) || 0);
        let applied = Math.min(cap, distanceBonus);
        multiplier *= 1 + applied / 100;
        if (cap > 0 && applied >= cap && typeof onCue === 'function') onCue({ key:'max-distance', text:_t('최대 거리: 피해 {cap}% 증폭', { cap }), color:'#bdeaff' });
    }
    let nearbyEnemies = (game.enemies || []).filter(row => row && row.hp > 0).length;
    let crowdBonus = Math.max(0, nearbyEnemies - 1) * Math.max(0, Number(skill.crowdDamageMorePerEnemyPct) || 0);
    let crowdCap = Math.max(0, Number(skill.crowdDamageMoreCapPct) || 0);
    let appliedCrowdBonus = Math.min(crowdCap, crowdBonus);
    multiplier *= 1 + appliedCrowdBonus / 100;   // 최대 포위 문구는 띄우지 않는다(2026-11-12 사용자: 회오리가 칠 때마다 떠서)
    return multiplier;
}

function getSkillRepeatDamageMultiplier(skill, hitIndex, nativeRepeats) {
    if (hitIndex <= 0) return 1;
    if (hitIndex < nativeRepeats) {
        let repeatPct = Number(skill && skill.repeatHitDamagePct);
        return Number.isFinite(repeatPct) ? Math.max(0, repeatPct) / 100 : 1;
    }
    return Math.max(0, Number(skill && skill.extraProjectileDamagePct) || PROJECTILE_BONUS_SHOT_DAMAGE_PCT) / 100;
}

/** The cast snapshot owns a targeted pull destination; legacy player pulls follow the player. */
function getSkillGridPullGeometry(skill, options) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill?.pullTowardImpactCells || skill?.pullTowardPlayerCells) || 0)));
    let center = skill?.pullTowardImpactCells ? options.attackFootprint?.center : game.gridPlayer;
    return { cells, center };
}

function pushEnemyAwayOnHit(enemy, skill) {
    let cells = Math.max(0, Math.min(3, Math.floor(Number(skill && skill.pushAwayCells) || 0)));
    if (cells <= 0 || !canPushEnemy(enemy) || !hasGridCell(game.gridPlayer)) return false;
    let moved = false;
    for (let step = 0; step < cells; step++) {
        const cell = findGridRetreatCell(enemy, game.gridPlayer, 99, null);
        if (!cell) break;
        Object.assign(enemy, cell);
        moved = true;
    }
    if (moved) addBattleFx('statusText', { enemyId: enemy.id, text: _t('밀려남'), color: '#f0c993', duration: 300 });
    return moved;
}

/** 철벽 척력화(uniqueRepelMelee): 근접 공격으로 주인공에게 닿은(회피되지 않은) 몬스터를 룬의 밀어내기로 밀어낸다. 막아낸 공격도
 * 닿은 공격이다. 보스는 밀리지 않고(pushEnemyAwayOnHit), 같은 몬스터는 cooldownMs에 한 번만 밀린다. */
function repelMeleeAttacker(enemy, pStats) {
    const repel = pStats.uniqueRepelMelee;
    if (!repel || enemy.attackKind !== 'melee' || !(enemy.hp > 0)) return;
    const now = getCombatTime();
    if (now < (Number(enemy.repelledAt) || -Infinity) + repel.cooldownMs) return;
    if (pushEnemyAwayOnHit(enemy, { pushAwayCells: repel.cells })) enemy.repelledAt = now;
}

/** 철벽 척력화의 값(data/items.js realm effects): 밀어내는 칸과 같은 몬스터를 다시 밀기까지의 ms. */
function readRepelMeleeParams(ep) {
    return { cells: Math.max(1, Math.floor(Number(ep.cells) || 1)), cooldownMs: Math.max(0, Number(ep.cooldownSec ?? 1.5)) * 1000 };
}

/** 추적자의 값: 적에게 다가가는 걸음의 이동 속도 증가(%). */
function readPursuitMovePct(ep) {
    return Math.max(0, Number(ep.pct) || 40);
}

/** 맞은 몬스터를 skill.launchMs 동안 띄운다(올려 베기): 그동안 움직이지도 새 공격을 시작하지도 못한다. 보스는 뜨지 않는다. */
function launchEnemyOnHit(enemy, skill) {
    let ms = Math.max(0, Math.floor(Number(skill && skill.launchMs) || 0));
    if (ms <= 0 || enemy.isBoss) return false;
    enemy.skillHeldUntil = Math.max(Number(enemy.skillHeldUntil) || 0, getCombatTime() + ms);
    addBattleFx('statusText', { enemyId: enemy.id, text: _t('띄움'), color: '#f0c993', duration: 300 });
    return true;
}

/** 맞은 몬스터를 밀고 띄운다(룬에 있을 때만). 위치 제어를 끈 단계(skipGridControl)와 죽은 몬스터는 그대로 둔다. */
function displaceEnemyOnHit(enemy, skill, options) {
    if (options.skipGridControl || !enemy || enemy.hp <= 0) return;
    pushEnemyAwayOnHit(enemy, skill);
    launchEnemyOnHit(enemy, skill);
}

function applySkillGridControlOnHit(enemy, skill, options = {}) {
    displaceEnemyOnHit(enemy, skill, options);
    let { cells, center } = getSkillGridPullGeometry(skill, options);
    if (cells <= 0 || options.skipGridControl || !enemy || enemy.hp <= 0 || !center || !hasGridCell(enemy)) return false;
    let moved = false;
    for (let step = 0; step < cells; step++) {
        if (!gridStepToward(enemy, center.gx, center.gy, getGridBlockedCells(enemy))) break;
        moved = true;
    }
    if (moved) addBattleFx('statusText', { enemyId: enemy.id, text: _t('중력 견인'), color: '#c5a8ff', duration: 300 });
    return moved;
}

function spreadSkillAilmentOnHit(source, skill, pStats) {
    let config = skill.ailmentSpreadOnHit;
    if (!config || Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0))) return;
    let ailment = (source.ailments || []).find(ail => ail && ail.type === config.type && (ail.time || 0) > 0);
    let copy = cloneEnemyAilmentForSpread(ailment, pStats);
    if (!copy) return;
    let targets = (game.enemies || []).filter(enemy => enemy && enemy.id !== source.id && enemy.hp > 0);
    targets.slice(0, Math.max(1, Math.floor(config.targets || 1))).forEach(target => {
        mergeEnemyAilment(target, copy, pStats);
        addBattleFx('statusText', {
            enemyId: target.id,
            text: _t('{type} 전파', { type: getAilmentDisplayLabel(config.type) }),
            color: getElementColor(skill.ele),
            duration: 650,
            dedupeKey: `ailment-spread:${source.id}:${target.id}`,
            dedupeWindowMs: 650
        });
    });
}

function queueSkillPeriodicHit(enemy, config, damage, ele, visual) {
    if (!config || enemy.hp <= 0 || Math.random() >= Math.max(0, Math.min(1, Number(config.chance) || 0))) return;
    enemy.skillPeriodics = Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : [];
    let queuedHits = enemy.skillPeriodics.reduce((sum, fx) => sum + Math.max(0, fx.hitsLeft || 0), 0);
    let allowedHits = Math.max(0, SKILL_PERIODIC_CHAIN_CAP - queuedHits);
    if (allowedHits <= 0) return;
    let hits = Math.min(Math.max(1, Math.floor(config.hits || 1)), allowedHits);
    let interval = Math.max(0.05, Number(config.interval) || 1);
    enemy.skillPeriodics.push({
        hitsLeft: hits, visual,
        interval: interval,
        timer: interval,
        damage: Math.max(1, Math.floor(damage * Math.max(0, Number(config.damagePct) || 0) / 100)),
        ele: config.ele || ele || 'phys'
    });
}

function applySkillPeriodicOnHit(enemy, skill, damage, skillName) {
    queueSkillPeriodicHit(enemy, skill.periodicOnHit, damage, skill.ele, {skillName,sourceCell:copyCombatGridCell(game.gridPlayer)});
}

/** Native confirmedPeriodic/confirmedTransfer contract; only called after a real resolution. */
function addConfirmedSkillEffect(kind, visual, target, element) {
    if (!visual?.skillName || !hasGridCell(target) || !hasGridCell(visual.sourceCell)) return;
    addBattleFx('combatTravel', {owner:'player',delivery:kind,skillName:visual.skillName,
        sourceCell:visual.sourceCell,targetCells:[getGridUnitCenter(target)],element,
        duration:kind==='confirmedPeriodic' ? 180 : 220});
}

function applySupportEchoOnHit(enemy, pStats, damage) {
    let echoPower = pStats.echoPower || 0;
    if (echoPower <= 0) return;
    let config = {
        chance: Math.min(0.6, 0.2 + echoPower / 100),
        hits: 2 + Math.floor(echoPower / 20),
        interval: 0.45,
        damagePct: 15 + echoPower * 0.6
    };
    queueSkillPeriodicHit(enemy, config, damage, pStats.sSkill && pStats.sSkill.ele);
}

function applySupportChaosErosionOnHit(enemy, pStats, hitElement) {
    let erosionPerHit = pStats.chaosErosion || 0;
    if (erosionPerHit <= 0 || hitElement !== 'chaos' || !enemy || enemy.hp <= 0) return;
    let cap = pStats.chaosErosionCap || 20;
    enemy.chaosErosionShred = Math.min(cap, (enemy.chaosErosionShred || 0) + erosionPerHit);
}

function transferPassiveChaosErosionToTarget(enemy, pStats) {
    let flags = pStats && pStats.passiveKeystoneFlags;
    let pending = Math.max(0, Number(game.passiveChaosErosionTransfer) || 0);
    if (!flags || !flags.erosionLegacy || pending <= 0 || !enemy || enemy.hp <= 0) return false;
    enemy.chaosErosionShred = Math.min(pStats.chaosErosionCap || 40, (enemy.chaosErosionShred || 0) + pending);
    game.passiveChaosErosionTransfer = 0;
    return true;
}

function getAilmentTypeFromElement(ele) {
    if (ele === 'fire') return 'ignite';
    if (ele === 'cold') return 'chill';
    if (ele === 'light') return 'shock';
    if (ele === 'chaos') return 'poison';
    return 'bleed';
}

function getPlayerAilmentChance(pStats, type) {
    let base = 0;
    if (type === 'ignite') base = pStats.igniteChance || 0;
    else if (type === 'chill') base = pStats.chillChance || 0;
    else if (type === 'freeze') base = pStats.freezeChance || 0;
    else if (type === 'shock') base = pStats.shockChance || 0;
    else if (type === 'poison') base = pStats.poisonChance || 0;
    else if (type === 'bleed') base = pStats.bleedChance || 0;
    return Math.max(0, Math.min(1, base / 100));
}

function getPassiveBleedMultiplier(pStats) {
    return pStats?.passiveKeystoneFlags?.bloodCradle ? 0.7 : 1;
}

function getPlayerAilmentProcChance(pStats, type, isCrit, forcedChance) {
    const multiplier = type === 'bleed' ? getPassiveBleedMultiplier(pStats) : 1;
    const base = Number.isFinite(forcedChance) ? forcedChance * multiplier : getPlayerAilmentChance(pStats, type);
    const supportChance = type === 'ignite' ? (pStats.sSkill?.supportEffects?.ignite?.chancePct || 0) / 100 : 0;
    return Math.max(0, Math.min(1, base + supportChance + (isCrit ? 0.25 * multiplier : 0)));
}

function getFreezeApplyChanceFromHitRatio(hitRatio, enemyMaxHp) {
    let ratio = Math.max(0, Number(hitRatio) || 0);
    let hp = Math.max(1, Number(enemyMaxHp) || 1);
    let hpFactor = Math.max(0.18, 1 / Math.log10(hp + 10));
    return Math.max(0.01, Math.min(0.7, ratio * 1.8 * hpFactor));
}

function getPlayerShockTakenDamageIncreasePct(pStats, power) {
    let base = 22;
    let reduction = Math.max(0, Math.min(0.95, Number(pStats && pStats.shockEffectReducePct || 0) / 100));
    let value = Math.max(0, base * (1 - reduction));
    return (pStats && pStats.uniqueShockInvertTaken) ? -value : value;
}

function getEnemyShockTakenDamageIncreasePct(ail, pStats) {
    if (!ail || ail.type !== 'shock' || (ail.time || 0) <= 0) return 0;
    let power = Math.max(0, Number(ail.power || 0));
    let base = Math.min(35, 8 + power * 12);
    let bonus = Math.max(0, Number(pStats && pStats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
}

function getActiveEnemyShockTakenDamageIncreasePct(enemy, pStats) {
    if (!enemy || !Array.isArray(enemy.ailments)) return 0;
    return enemy.ailments.reduce((best, ail) => Math.max(best, getEnemyShockTakenDamageIncreasePct(ail, pStats)), 0);
}

function getShockedEnemyHitDamageIncreaseMultiplier(enemy, pStats) {
    let isShocked = enemy && Array.isArray(enemy.ailments)
        && enemy.ailments.some(ail => ail && ail.type === 'shock' && (ail.time || 0) > 0);
    let bonus = Math.max(0, Number(pStats && pStats.shockedEnemyHitDamagePct) || 0);
    if (!isShocked || bonus <= 0) return 1;
    let existingIncrease = Math.max(0, Number(pStats && pStats.damageIncreasePct) || 0);
    return (100 + existingIncrease + bonus) / (100 + existingIncrease);
}

function getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale) {
    let baseScale = Math.max(0.01, Number(scale) || 1);
    let bonusPct = Math.max(0, Number(critDotBonusPct) || 0);
    let bonusScale = Math.max(0.01, Number(critDotBonusScale) || 1);
    return baseScale + (bonusPct / 100) * bonusScale;
}

function getDamageAilmentScore(sourceDamage, critDotBonusPct, scale, critDotBonusScale) {
    let source = Math.max(0, Number(sourceDamage) || 0);
    return source * getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
}

function getEnemyDamageAilmentMaxStacks(type, pStats) {
    if (type === 'bleed' && getPassiveBleedMultiplier(pStats) < 1) return 5;
    let cap = 1;
    if (hasKeystone('ct6')) cap += 1;
    if (hasKeystone('ct8')) cap += 2;
    if (type === 'poison') cap += Math.max(0, Math.floor(Number(pStats && pStats.uniquePoisonExtraStacks) || 0));
    return Math.max(1, cap);
}

function cloneEnemyAilmentForSpread(ail, pStats) {
    if (!ail || (ail.time || 0) <= 0) return null;
    const spreadableTypes = ['ignite', 'poison', 'bleed', 'chill', 'shock', 'freeze'];
    if (!spreadableTypes.includes(ail.type)) return null;
    let copy = { type: ail.type, time: Math.max(0, Number(ail.time) || 0), power: Math.max(0, Number(ail.power) || 0) };
    if (isDamageAilmentType(ail.type)) {
        let maxStacks = getEnemyDamageAilmentMaxStacks(ail.type, pStats);
        if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(ail.stacks || 1));
        copy.stacks = Math.max(1, Math.min(maxStacks, Math.floor(ail.stacks || 1)));
        copy.sourceHitDamage = getStoredAilmentHitDamage(ail);
        copy.critDotBonusPct = Math.max(0, Number(ail.critDotBonusPct) || 0);
        copy.ailmentDotScore = Math.max(0, Number(ail.ailmentDotScore) || 0);
        copy.talentDamageMorePct = Math.max(0, Number(ail.talentDamageMorePct) || 0);
    }
    return copy;
}

function mergeEnemyAilment(target, incoming, pStats) {
    if (!target || !incoming || (incoming.time || 0) <= 0) return false;
    if (typeof canTalentCardApplyEnemyAilment === 'function' && !canTalentCardApplyEnemyAilment(incoming.type)) return false;
    target.ailments = Array.isArray(target.ailments) ? target.ailments : [];
    let row = target.ailments.find(ail => ail && ail.type === incoming.type);
    if (!row) {
        target.ailments.push({ ...incoming });
        return true;
    }
    row.time = Math.max(row.time || 0, incoming.time || 0);
    row.power = Math.max(row.power || 0, incoming.power || 0);
    if (isDamageAilmentType(incoming.type)) {
        let maxStacks = getEnemyDamageAilmentMaxStacks(incoming.type, pStats);
        if (!pStats) maxStacks = Math.max(maxStacks, Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1));
        row.stacks = Math.max(1, Math.min(maxStacks, Math.max(Math.floor(row.stacks || 1), Math.floor(incoming.stacks || 1))));
        let rowScore = Math.max(0, Number(row.ailmentDotScore) || getStoredAilmentHitDamage(row));
        let incomingScore = Math.max(0, Number(incoming.ailmentDotScore) || getStoredAilmentHitDamage(incoming));
        if (incomingScore >= rowScore) {
            row.sourceHitDamage = getStoredAilmentHitDamage(incoming);
            row.critDotBonusPct = Math.max(0, Number(incoming.critDotBonusPct) || 0);
            row.ailmentDotScore = incomingScore;
            row.talentDamageMorePct = Math.max(0, Number(incoming.talentDamageMorePct) || 0);
        }
    }
    return true;
}

/** Kill records that grow outside the fight: the stump box, the boss variant record (12번 루프 33, js/boss-variants.js) and the nursery's
 * seeds and saps (루프 39, js/stump-nursery.js). */
function recordKillProgress(enemy) {
    if (typeof stumpBox === 'object') stumpBox.onEnemyKilled(game, enemy, layStumpDrop(enemy));
    if (typeof bossVariants === 'object') combatLootReceipts.capture(game, () => bossVariants.onKilled(game, enemy));
    if (typeof stumpNursery === 'object') stumpNursery.onKilled(game, enemy);
    if (typeof weaponMastery === 'object') weaponMastery.onKilled(game, enemy);
}

/** The kill's stump box drop, on the floor when there is one; what is left reaches the box at once. */
function layStumpDrop(enemy) {
    const spec = stumpBox.rollKillDrop(game, enemy);
    return spec && placeFloorItem(enemy, 'stump', spec) ? null : spec;
}

/** Core items, the stump box and weapon mastery (js/weapon-mastery.js): account-wide reward lines of getPlayerStats. */
function applyAccountRewardStats(reward) {
    coreItems.stats().forEach(stat => addStatToBucket(reward, stat.id, stat.val));
    if (typeof stumpBox === 'object') stumpBox.applyStats(reward, game);
    if (typeof weaponMastery === 'object') weaponMastery.applyStats(reward, game);
}

/** What a death passes on: the ct3 keystone spread and the region lines (poison, shock and ignite spread, ice shards). */
function applyAilmentEffectsOnDeath(enemy, pStats) {
    burstFlameDecayOnDeath(enemy, pStats);
    spreadCatalystAilmentsOnDeath(enemy, pStats);
    regionAffixEffects.onEnemyDeath(enemy, pStats);
}

function spreadCatalystAilmentsOnDeath(enemy, pStats) {
    if (!hasKeystone('ct3')) return;
    if (!enemy || !Array.isArray(enemy.ailments)) return;
    let ailments = enemy.ailments.map(ail => cloneEnemyAilmentForSpread(ail, pStats)).filter(Boolean);
    if (ailments.length <= 0) return;
    let sourceGroup = Number.isFinite(enemy.groupIndex) ? enemy.groupIndex : 0;
    let targets = (game.enemies || [])
        .filter(target => target && target.id !== enemy.id && target.hp > 0)
        .sort((a, b) => {
            let ga = Math.abs((Number.isFinite(a.groupIndex) ? a.groupIndex : 0) - sourceGroup);
            let gb = Math.abs((Number.isFinite(b.groupIndex) ? b.groupIndex : 0) - sourceGroup);
            if (ga !== gb) return ga - gb;
            return (a.id || 0) - (b.id || 0);
        });
    if (targets.length <= 0) return;
    targets.forEach(target => ailments.forEach(ail => mergeEnemyAilment(target, ail, pStats)));
    if (game.settings && game.settings.showCombatLog) addLog(_t('🧪 확산 반응: 남은 상태이상이 주변 적 {length}마리에게 퍼졌습니다.', { length: targets.length }), 'attack-player', { rateKey: 'catalyst:spread', minIntervalMs: 500 });
}

function syncEnemyFlameDecayAilment(enemy, dotState, pStats) {
    if (!enemy || !dotState || dotState.skillName !== '화염 부패') return;
    if (typeof canTalentCardApplyEnemyAilment === 'function' && !canTalentCardApplyEnemyAilment('flameDecay')) return;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    let zone = getZone(game.currentZoneId) || getZone(0);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || DOT_TICK_INTERVAL);
    let decayEle = dotState.ele || 'fire';
    let enemyRes = getEffectiveEnemyMitigation(decayEle, zoneTier, enemy, pStats);
    let dps = Math.floor(Math.max(1, Math.floor(((dotState.rawTickDamage || 1) / tickInterval) * (1 - enemyRes / 100) * abyssPlayerMul))
        * loopMutation.takenMul(enemy, decayEle));
    let row = enemy.ailments.find(ail => ail && ail.type === 'flameDecay');
    let payload = {
        type: 'flameDecay',
        time: Math.max(0, dotState.timeLeft || 0),
        power: Math.max(0, dotState.stacks || 1),
        flameDecayDps: dps,
        rawTickDamage: Math.max(0, Number(dotState.rawTickDamage || 0)),
        tickInterval: tickInterval,
        enemyRes: enemyRes,
        abyssPlayerMul: abyssPlayerMul,
        igniteTakenMultiplier: Math.max(1, Number(pStats && pStats.flameDecayIgniteTakenMultiplier) || getFlameDecayIgniteTakenMultiplier(pStats))
    };
    if (row) Object.assign(row, payload);
    else enemy.ailments.push(payload);
}

function getFlameDecayIgniteTakenMultiplier(pStats) {
    let skill = pStats && pStats.sSkill;
    let per100 = Math.max(0, Number(skill && skill.igniteTakenHpScalePer100) || 0);
    if (per100 <= 0) return 1;
    let uncapped = 1 + (Math.max(0, Number(pStats && pStats.maxHp) || 0) / 100) * per100;
    let cap = Math.max(1, Number(skill && skill.igniteTakenMaxMultiplier) || Infinity);
    return Math.min(uncapped, cap);
}

function getPlayerDamageAilmentFallbackDps(type, power, pStats) {
    let stats = pStats || (typeof getPlayerStats === 'function' ? getPlayerStats() : null);
    let maxHp = Math.max(1, Math.floor((stats && stats.maxHp) || 0));
    if (maxHp <= 1) return 0;
    let p = Math.max(0.1, Number(power || 0.1));
    let perTick = 0;
    if (type === 'ignite') perTick = Math.max(1, Math.floor(maxHp * (0.0035 + p * 0.0040)));
    else if (type === 'poison') perTick = Math.max(1, Math.floor(maxHp * (0.0030 + p * 0.0034)));
    else if (type === 'bleed') perTick = Math.max(1, Math.floor(maxHp * (0.0032 + p * 0.0032)));
    return perTick > 0 ? perTick * 10 : 0;
}

/** How long an ailment from a hit lasts, as a multiplier: damage ailments follow the DoT duration, poison its unique bonus, ignite
 * the region line. */
function getAilmentDurationMultiplier(type, damageAilment, pStats) {
    let durationMul = damageAilment ? Math.max(0.05, (pStats && Number.isFinite(pStats.dotDurationMultiplier)) ? pStats.dotDurationMultiplier : 1) : 1;
    if (type === 'poison' && pStats && (pStats.uniquePoisonDurationPct || 0) > 0) durationMul *= 1 + Math.max(0, Number(pStats.uniquePoisonDurationPct) || 0) / 100;
    return durationMul * getPassiveAilmentDurationMultiplier(type, pStats) * regionAffixEffects.ailmentDurationMultiplier(pStats, type);
}

/** 패시브 트리의 상태이상별 지속시간(getPlayerStats의 ailmentDurationPct). 줄이 없는 능력치 묶음(소환수 등)은 1이다. */
function getPassiveAilmentDurationMultiplier(type, pStats) {
    const table = pStats && pStats.ailmentDurationPct;
    return 1 + ((table && table[type]) || 0) / 100;
}

/** One ailment from a hit (hit: the target, the hero's stats, crit, options, the hit's ratio and power, its ailment source damage
 * and crit DoT bonus): the gates, then its power and duration, then a new row or the stronger existing row. Returns whether it took.
 * Out of applyEnemyAilmentFromHit on 2026-10-18 with the same rolls in the same order. */
function applyHitAilment(hit, sourceType, forceChance, manifestation) {
    const gate = passHitAilmentGates(hit, sourceType, forceChance, manifestation);
    if (!gate) return false;
    const { enemy, pStats } = hit;
    let type = gate.appliedType;
    let damageAilment = isDamageAilmentType(type);
    let power = getHitAilmentPower(hit, type, damageAilment, gate);
    let row = enemy.ailments.find(a => a.type === type);
    let durationMul = getAilmentDurationMultiplier(type, damageAilment, pStats);
    let dur = window.GameModules.combat.supports.igniteDuration(pStats, type, (damageAilment ? 3 : (type === 'freeze' ? (0.8 + hit.hitRatio * 4) : (2 + hit.hitRatio * 10))) * durationMul);
    let payload = { type: type, time: dur, duration: dur, power: power, stacks: 1 };
    if (damageAilment) fillDamageAilmentPayload(hit, payload, { type, gate });
    if (typeof decorateTalentAilmentPayload === 'function') decorateTalentAilmentPayload(type, payload, pStats);
    if (row && typeof enhanceTalentAilmentReapplication === 'function') enhanceTalentAilmentReapplication(enemy, row, type, pStats);
    if (row) refreshAilmentRow(row, payload, { type, dur, power, damageAilment, critDotBonusPct: hit.critDotBonusPct, pStats });
    else enemy.ailments.push(payload);
    trackHiddenJournalAilment(type, enemy);
    if (typeof afterTalentAilmentApplied === 'function') afterTalentAilmentApplied(enemy, sourceType);
    return true;
}

/** Whether the ailment gets through: the talent replacing it, keystones that forbid it, the talent card rule, the proc chance, the
 * enemy's ailment resistance (less the hero's penetration), and for freeze the hit's freeze roll. Null when it does not. */
function passHitAilmentGates(hit, sourceType, forceChance, manifestation) {
    const { pStats } = hit;
    let appliedType = typeof getTalentAilmentReplacement === 'function' ? getTalentAilmentReplacement(sourceType) : sourceType;
    if (hitAilmentForbidden(pStats, appliedType, sourceType, hit.element)) return null;
    if (!rollHitAilmentProc(hit, sourceType, forceChance)) return null;
    let mystiquePotency = sourceType === pStats.mystiqueAilmentType
        ? 1 + Math.max(0, Number(pStats.mystiqueAilmentPotencyPct) || 0) / 100 : 1;
    let manifestationPotency = manifestation ? 0.5 : 1;
    let effectiveHitRatio = hit.hitRatio * mystiquePotency * manifestationPotency;
    if (sourceType === 'freeze' && Math.random() >= getFreezeApplyChanceFromHitRatio(effectiveHitRatio, hit.enemy.maxHp || 1)) return null;
    return { appliedType, mystiquePotency, manifestationPotency };
}

/** The proc roll, then the enemy's ailment resistance roll (less the hero's penetration, at most 95%). */
function rollHitAilmentProc(hit, sourceType, forceChance) {
    const { enemy, pStats, isCrit } = hit;
    let tryProc = getPlayerAilmentProcChance(pStats, sourceType, isCrit, forceChance);
    if (Math.random() >= tryProc) return false;
    let resKey = 'ailRes' + sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
    let ailResPen = (pStats && pStats.ailmentResistPenPct) || 0;
    let resistChance = Math.max(0, Math.min(0.95, ((enemy[resKey] || 0) - ailResPen) / 100));
    return !(Math.random() < resistChance);
}

const ELEMENTAL_HIT_AILMENTS = ['ignite', 'chill', 'freeze', 'shock'];

function isElementalAilmentHit(element, sourceType, appliedType) {
    return ['fire', 'cold', 'light'].includes(element)
        || ELEMENTAL_HIT_AILMENTS.includes(sourceType) || ELEMENTAL_HIT_AILMENTS.includes(appliedType);
}

/** Keystones and talent cards that forbid the ailment. */
function hitAilmentForbidden(pStats, appliedType, sourceType, element) {
    let passiveFlags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (passiveFlags.threeBranchLight && isElementalAilmentHit(element, sourceType, appliedType)) return true;
    if (passiveFlags.singleMystique && appliedType !== pStats.mystiqueAilmentType) return true;
    if (passiveFlags.blackDistill && ELEMENTAL_HIT_AILMENTS.includes(appliedType)) return true;
    return typeof canTalentCardApplyEnemyAilment === 'function' && !canTalentCardApplyEnemyAilment(appliedType);
}

/** A damage ailment's power is 0.9; another's follows the hit's power and ratio (chill raised by its effect bonus), 0.05 to 1.5. */
function getHitAilmentPower(hit, type, damageAilment, gate) {
    const { pStats } = hit;
    let power = damageAilment
        ? 0.90
        : Math.max(0.05, Math.min(1.5, (hit.hitPower + (hit.hitRatio * 1.8)) * gate.mystiquePotency * gate.manifestationPotency));
    if (type === 'chill') {
        let chillEfficiency = 1 + Math.max(0, Number(pStats && pStats.chillEffectBonusPct) || 0) / 100;
        power = Math.min(1.5, power * chillEfficiency);
    }
    return power;
}

/** A damage ailment's source hit, crit DoT bonus, DoT score and its more damage (the hit's, 폭발성 증류 +75, 오염된 탄두 +50). */
function fillDamageAilmentPayload(hit, payload, at) {
    const { pStats } = hit;
    let damageMorePct = getHitAilmentDamageMorePct(hit, at.type, at.gate.appliedType);
    payload.sourceHitDamage = Math.floor(hit.ailmentPowerSourceDamage * at.gate.mystiquePotency * at.gate.manifestationPotency);
    payload.critDotBonusPct = hit.critDotBonusPct;
    payload.ailmentDotScore = getDamageAilmentScore(payload.sourceHitDamage, hit.critDotBonusPct,
        pStats && Number.isFinite(pStats.dotDamageScale) ? pStats.dotDamageScale : 1,
        pStats && Number.isFinite(pStats.dotCritBonusScale) ? pStats.dotCritBonusScale : 1) * (1 + damageMorePct / 100);
    payload.talentDamageMorePct = damageMorePct;
}

function getHitAilmentDamageMorePct(hit, type, appliedType) {
    const { pStats, opts } = hit;
    let damageMorePct = Math.max(0, Number(opts.ailmentDamageMorePct && opts.ailmentDamageMorePct[type]) || 0);
    let passiveFlags = (pStats && pStats.passiveKeystoneFlags) || {};
    if (passiveFlags.explosiveDistill && isDamageAilmentType(appliedType)) damageMorePct += 75;
    if (passiveFlags.taintedWarhead && ['ignite', 'poison', 'bleed'].includes(appliedType)) damageMorePct += 50;
    return damageMorePct;
}

/** The ailment again on a row: the longer time and the stronger power (as rolled, before talents decorate the payload); a damage
 * ailment keeps the stronger hit and gains a stack. */
function refreshAilmentRow(row, payload, at) {
    row.time = Math.max(row.time || 0, at.dur);
    row.duration = row.time;
    row.power = Math.max(row.power || 0, at.power);
    if (!at.damageAilment) return;
    let rowScore = Math.max(0, Number(row.ailmentDotScore) || getStoredAilmentHitDamage(row));
    let incomingScore = payload.ailmentDotScore;
    if (incomingScore >= rowScore) {
        row.sourceHitDamage = payload.sourceHitDamage;
        row.critDotBonusPct = at.critDotBonusPct;
        row.ailmentDotScore = incomingScore;
        row.talentDamageMorePct = Math.max(0, Number(payload.talentDamageMorePct) || 0);
        row.talentNitroAmplified = !!payload.talentNitroAmplified;
    }
    let maxStacks = getEnemyDamageAilmentMaxStacks(at.type, at.pStats);
    row.stacks = Math.max(1, Math.min(maxStacks, Math.floor((row.stacks || 1) + 1)));
}

/** 독초(숲지기 gw2, 2026-11-11): 냉기 타격도 중독을 건다. 중독의 원천 피해는 타격의 coldPoisonPct%. */
function applyGroveColdPoison(hit, ele) {
    if (ele !== 'cold' || !hasKeystone('gw2')) return;
    applyHitAilment({ ...hit, ailmentPowerSourceDamage: Math.floor(hit.ailmentPowerSourceDamage * ASCENDANCY_KEYSTONE_VALUES.gw2.coldPoisonPct / 100) }, 'poison');
}

function applyEnemyAilmentFromHit(enemy, pStats, hitDamage, isCrit, options) {
    if (!enemy || enemy.hp <= 0) return;
    let ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
    let primaryType = getAilmentTypeFromElement(ele);
    let opts = (options && typeof options === 'object') ? options : {};
    let sourceHitDamage = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : hitDamage) || 0));
    let catalystAilmentMul = (hasKeystone('ct1')) ? 2 : 1;
    let ailmentPowerSourceDamage = Math.max(0, Math.floor(sourceHitDamage * Math.max(0.01, Number(pStats && pStats.ailmentPowerMultiplier) || 1) * catalystAilmentMul));
    let critDotBonusPct = Math.max(0, Number(opts.critDotBonusPct !== undefined ? opts.critDotBonusPct : (isCrit ? 50 : 0)) || 0);
    let hitRatio = Math.max(0.001, Math.min(0.35, ailmentPowerSourceDamage / Math.max(1, enemy.maxHp || 1)));
    let hitPower = Math.sqrt(Math.max(1, ailmentPowerSourceDamage)) * 0.01;
    enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
    const hit = { enemy, pStats, isCrit, opts, element: ele, hitRatio, hitPower, ailmentPowerSourceDamage, critDotBonusPct };
    const applyAilmentType = (type, forceChance, manifestation) => applyHitAilment(hit, type, forceChance, manifestation);
    applyAilmentType(primaryType, opts.primaryAilmentChance);
    if (ele === 'cold' && !(typeof shouldTalentSkipColdFreeze === 'function' && shouldTalentSkipColdFreeze())) applyAilmentType('freeze');
    applyGroveColdPoison(hit, ele);
    if (pStats.passiveForbiddenManifestation) {
        ['ignite', 'chill', 'shock', 'poison', 'bleed'].forEach(type => {
            if (type !== primaryType) applyAilmentType(type, undefined, true);
        });
    }
    Object.entries(opts.additionalAilmentChances || {}).forEach(([type, chance]) => {
        if (type !== primaryType) applyAilmentType(type, chance);
    });
    if (hasKeystone('ct8')) {
        let now = getCombatTime();
        if ((game.catalystBurstReadyAt || 0) <= now) {
            let burstReady = (enemy.ailments || []).some(a => {
                if (!a || !['ignite','poison','bleed'].includes(a.type) || (a.time || 0) <= 0) return false;
                let maxDamageAilmentStacks = getEnemyDamageAilmentMaxStacks(a.type, pStats);
                return (a.stacks || 1) >= maxDamageAilmentStacks;
            });
            if (burstReady) {
                let burst = 0;
                (enemy.ailments || []).forEach(a => {
                    if (!a || !['ignite','poison','bleed'].includes(a.type) || (a.time || 0) <= 0) return;
                    let dps = getEnemyDamageAilmentDps(a, pStats);
                    burst += Math.max(0, Math.floor(dps * Math.min(2, a.time || 0)));
                    a.time = 0;
                });
                if (burst > 0) {
                    applyDamageToEnemyResource(enemy, burst);
                    game.catalystBurstReadyAt = now + 1000;
                }
            }
        }
    }
}

function tickEnemyAilments(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
        if (enemy.ailments.length <= 0) return;
        enemyAttackRules.interrupt(enemy,getCombatTime());
        let next = [];
        const poisonHeld = ascendancyNodeRules.poisonHeld(enemy), dotMul = ascendancyNodeRules.dotMultiplier(getCombatTime());
        enemy.ailments.forEach(ail => {
            let previousAilmentTime = Math.max(0, Number(ail.time) || 0);
            ail.time = Math.max(0, (ail.time || 0) - ascendancyNodeRules.ailmentStep(ail, poisonHeld, dt));
            let power = Math.max(0, ail.power || 0);
            let type = ail.type;
        if (ail.time > 0 && (type === 'ignite' || type === 'poison' || type === 'bleed')) {
                let ele = type === 'ignite' ? 'fire' : (type === 'poison' ? 'chaos' : 'phys');
                let enemyRes = getEffectiveEnemyMitigation(ele, zoneTier, enemy, pStats);
                let dps = getEnemyDamageAilmentDps(ail, pStats);
                let igniteMul = (type === 'ignite' && (enemy.ailments || []).some(row => row && row.type === 'flameDecay' && (row.time || 0) > 0)) ? getFlameDecayIgniteTakenMultiplier(pStats) : 1;
                let stackMul = Math.max(1, Math.floor(ail.stacks || 1));
                let dotDmg = dps > 0 ? Math.floor(Math.max(1, Math.floor(dps * stackMul * dt * (1 - enemyRes / 100) * abyssPlayerMul * igniteMul * dotMul))
                    * loopMutation.takenMul(enemy, ele)) : 0;
                let dealt = applyDamageToEnemyResource(enemy, dotDmg);
                // 출혈/점화/중독 도트는 0.1초마다 틱이 들어와 모바일에서 히트 FX가 과도하게 누적될 수 있다.
                // 특히 출혈 빌드는 틱 빈도/대상 수가 높아 화면이 하얗게 번쩍이며 프레임이 급락하는 증상이 보고됨.
                let fxState = game.dotFxThrottle || (game.dotFxThrottle = {});
                let fxKey = `${enemy.id}:${type}`;
                let now = getCombatTime();
                let prev = Number(fxState[fxKey] || 0);
                if (dealt > 0 && (now - prev) >= 240) {
                    fxState[fxKey] = now;
                    addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(ele), damage: dealt, duration: 160, element: ele, noLine: true, dot: true });
                }
            }
            if (previousAilmentTime > 0 && ail.time <= 0 && typeof storeExpiredTalentAilmentSeed === 'function') {
                let remainingAtExpiry = getEnemyDamageAilmentDps(ail, pStats) * previousAilmentTime * Math.max(1, ail.stacks || 1);
                storeExpiredTalentAilmentSeed(enemy, ail, remainingAtExpiry);
            }
            if (ail.time > 0) next.push(ail);
            if (type === 'poison' && enemy.hp <= 0) enemy.lastHitElement = 'chaos';
        });
        enemy.ailments = next;
        if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    });
    tickEnemySkillPeriodicEffects(pStats, dt);
}

function tickEnemySkillPeriodicEffects(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    (game.enemies || []).forEach(enemy => {
        let effects = enemy && enemy.hp > 0 && Array.isArray(enemy.skillPeriodics) ? enemy.skillPeriodics : null;
        if (!effects || effects.length <= 0) return;
        effects.forEach(effect => {
            if (effect.hitsLeft <= 0 || enemy.hp <= 0) return;
            effect.timer -= dt;
            while (effect.timer <= 0 && effect.hitsLeft > 0 && enemy.hp > 0) {
                effect.timer += effect.interval;
                effect.hitsLeft--;
                let mitigation = getEffectiveEnemyMitigation(effect.ele, zoneTier, enemy, pStats);
                let periodicMul = ascendancyNodeRules.dotMultiplier(getCombatTime());
                applyDamageToEnemyResource(enemy, Math.floor(Math.max(1, Math.floor(effect.damage * (1 - mitigation / 100) * periodicMul)) * loopMutation.takenMul(enemy, effect.ele)));
                addConfirmedSkillEffect('confirmedPeriodic',effect.visual,enemy,effect.ele);
            }
        });
        enemy.skillPeriodics = effects.filter(fx => fx.hitsLeft > 0 && enemy.hp > 0);
        if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    });
}

function tickEnemyDotEffects(pStats, dt) {
    let zone = getZone(game.currentZoneId);
    let zoneTier = (zone && zone.tier) || 1;
    let abyssPlayerMul = (getAbyssMonsterScales(zone).playerDamageMul || 1);
    (game.enemies || []).forEach(enemy => {
        if (!enemy || enemy.hp <= 0) return;
        let dotState = (enemy.dotState && typeof enemy.dotState === 'object') ? enemy.dotState : null;
        if (!dotState) return;
        dotState.timeLeft = Math.max(0, (dotState.timeLeft || 0) - dt);
        let tickInterval = Math.max(0.02, Number(dotState.tickInterval) || DOT_TICK_INTERVAL);
        syncEnemyFlameDecayAilment(enemy, dotState, pStats);
        dotState.tickTimer = (dotState.tickTimer || tickInterval) - dt;
        while (dotState.tickTimer <= 0 && dotState.timeLeft > 0 && enemy.hp > 0) {
            dotState.tickTimer += tickInterval;
            let dotEle = dotState.ele || 'chaos';
            let enemyRes = getEffectiveEnemyMitigation(dotEle, zoneTier, enemy, pStats);
            let dotDmg = Math.max(1, Math.floor((dotState.rawTickDamage || 1) * (1 - (enemyRes / 100))));
            dotDmg = Math.floor(Math.max(1, Math.floor(dotDmg * abyssPlayerMul)) * loopMutation.takenMul(enemy, dotEle));
            let dealt = applyDamageToEnemyResource(enemy, dotDmg);
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(dotEle), damage: dealt, duration: 240, element: dotEle, noLine: true, dot: true });
            if (enemy.hp <= 0) {
                if (dotEle === 'chaos') enemy.lastHitElement = 'chaos';
                handleEnemyDeath(enemy, pStats);
                break;
            }
        }
        if (dotState.timeLeft <= 0 || enemy.hp <= 0) {
            enemy.dotState = null;
            enemy.dotStacks = 0;
            enemy.skillSlowPct = 0;
            enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments.filter(ail => ail && ail.type !== 'flameDecay') : [];
        }
    });
}

function syncCrowdPauseState() {
    let paused = isCrowdProgressPaused();
    if (paused === crowdPauseActive) return paused;
    crowdPauseActive = paused;
    if (game.settings.showCrowdPauseLog !== false) {
        if (paused) addLog(_t('⛔ 적이 {ENEMY_CROWD_PAUSE_LIMIT}기 이상 몰려 맵 진행이 멈췄습니다. 적 수를 줄이면 다시 전진합니다.', { ENEMY_CROWD_PAUSE_LIMIT }), 'attack-monster');
        else addLog(_t('🧭 적 숫자가 줄어 맵 진행을 재개합니다.'), 'loot-normal');
    }
    return paused;
}

function resetWoodsmanCurse() {
    game.woodsmanCurseActive = false;
    game.woodsmanCurseDamageTakenStacks = 0;
    game.woodsmanCurseLastTickAt = 0;
    game.woodsmanCurseNextLogStack = 0;
}

function startWoodsmanCurse() {
    game.woodsmanCurseActive = true;
    game.woodsmanCurseDamageTakenStacks = 0;
    game.woodsmanCurseLastTickAt = getCombatTime();
    game.woodsmanCurseNextLogStack = 100;
    addLog(_t('🪓 나무꾼의 저주: 전투가 끝날 때까지 매초 받는 피해가 0.01%씩 증가합니다.'), 'attack-monster');
}

function tickWoodsmanCurse() {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !game.woodsmanCurseActive) return;
    let now = getCombatTime();
    game.woodsmanCurseLastTickAt = Number.isFinite(game.woodsmanCurseLastTickAt) && game.woodsmanCurseLastTickAt > 0 ? game.woodsmanCurseLastTickAt : now;
    let elapsed = now - game.woodsmanCurseLastTickAt;
    if (elapsed < 1000) return;
    let ticks = Math.floor(elapsed / 1000);
    game.woodsmanCurseLastTickAt += ticks * 1000;
    game.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) + ticks;
    if ((game.settings && game.settings.showCombatLog !== false) && game.woodsmanCurseDamageTakenStacks >= Math.max(100, Math.floor(game.woodsmanCurseNextLogStack || 100))) {
        addLog(_t('🪓 나무꾼의 저주 중첩: 받는 피해 +{value}%', { value: (game.woodsmanCurseDamageTakenStacks * 0.01).toFixed(2) }), 'attack-monster', { noToast: true });
        game.woodsmanCurseNextLogStack = Math.floor(game.woodsmanCurseDamageTakenStacks / 100 + 1) * 100;
    }
}

function getWoodsmanCurseDamageTakenMul() {
    let zone = getZone(game.currentZoneId);
    if (!zone || zone.type !== 'outsideChaos' || !game.woodsmanCurseActive) return 1;
    return 1 + Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.0001;
}

function getWoodsmanPhaseProgress(enemy) {
    if (!enemy || !(enemy.maxHp > 0)) return 0;
    let rawProgress = clampNumber(1 - ((enemy.hp || 0) / enemy.maxHp), 0, 1);
    if (rawProgress <= WOODSMAN_PHASE_NEW_FINAL_PROGRESS) {
        return rawProgress * (WOODSMAN_PHASE_OLD_FINAL_PROGRESS / WOODSMAN_PHASE_NEW_FINAL_PROGRESS);
    }
    let finalWindow = 1 - WOODSMAN_PHASE_NEW_FINAL_PROGRESS;
    let finalProgress = (rawProgress - WOODSMAN_PHASE_NEW_FINAL_PROGRESS) / finalWindow;
    return clampNumber(WOODSMAN_PHASE_OLD_FINAL_PROGRESS + finalProgress * (1 - WOODSMAN_PHASE_OLD_FINAL_PROGRESS), 0, 1);
}

function woodsmanElementAt(progress) {
    return WOODSMAN_ELEMENTS[Math.max(0, Math.floor(progress / 0.05)) % WOODSMAN_ELEMENTS.length];
}

function woodsmanAttackFxElement(enemy) {
    return enemy.isWoodsman && game.currentZoneId === OUTSIDE_CHAOS_ZONE_ID
        ? woodsmanElementAt(getWoodsmanPhaseProgress(enemy)) : null;
}

function getEncounterTelemetryContext(zone) {
    if (!zone) return {};
    let context = { tier: Math.max(0, Math.floor(Number(zone.tier) || 0)) };
    if (game.voidRift && game.voidRift.active) context.mode = 'voidBreach';
    if (zone.type === 'beehive') {
        context.branch = Math.max(1, Math.floor(Number(game.beehive && game.beehive.branchStep) || 1));
    } else if (zone.type === 'colony') {
        context.wave = Math.max(1, Math.floor(Number(game.colony && game.colony.wave) || 1));
    } else if (zone.type === 'timeRift') {
        context.phase = zone.riftPhase || 'unknown';
        context.pressure = Math.max(0, Math.floor(Number(zone.pressure) || 0));
    } else if (zone.type === 'meteor') {
        context.meteorTier = Math.max(0, Math.floor(Number(zone.meteorTier || zone.tier) || 0));
    } else if (zone.type === 'trial') {
        context.trialId = String(zone.id || '');
    } else if (zone.type === 'oceanDepth') {
        context.depth = Math.max(0, Math.floor(Number(game.ocean && game.ocean.depthM) || 0));
    } else if (zone.type === 'grandBreach') {
        context.phase = String((game.voidRift && game.voidRift.grandRun && game.voidRift.grandRun.phase) || 'horde');
    }
    return context;
}

function applyCosmosAstraStance(enemy) {
    if (!enemy || !enemy.astraBase) return;
    let base = enemy.astraBase;
    let idx = Math.floor(getCombatTime() / COSMOS_ASTRA_STANCE_CYCLE_MS) % COSMOS_ASTRA_STANCES.length;
    let stance = COSMOS_ASTRA_STANCES[idx];
    if (enemy.astraStanceIdx !== idx) {
        enemy.astraStanceIdx = idx;
        addLog(_t('🌌 아스트라의 표식이 바뀝니다: {name}', { name: _t(stance.name) }), 'attack-monster', { noToast: true });
    }
    enemy.ele = stance.ele || enemy.ele;
    enemy.dr = Math.min(90, base.dr + (stance.drAdd || 0));
    enemy.armor = Math.floor(base.armor * (stance.armorMul || 1));
    enemy.evasion = Math.floor(base.evasion * (stance.evasionMul || 1));
    let resAdd = stance.resAllAdd || 0;
    enemy.resF = Math.min(95, base.resF + resAdd);
    enemy.resC = Math.min(95, base.resC + resAdd);
    enemy.resL = Math.min(95, base.resL + resAdd);
    enemy.resChaos = Math.min(95, base.resChaos + resAdd + (stance.resChaosAdd || 0));
    enemy.penetration = base.penetration + (stance.penetrationAdd || 0);
    enemy.critChance = base.critChance + (stance.critChanceAdd || 0);
    enemy.atkMul = base.atkMul * (stance.atkMulMul || 1);
    enemy.attackSpeedVar = base.attackSpeedVar * (stance.attackSpeedVarMul || 1);
    enemy.regenRate = base.regenRate * (stance.regenMul || 1);
}

exposeFileGlobals({ getChaosBossElements, pickEnemyElement, estimateMapZonePowerRequirements, getAtlasPackReadiness, generateEncounterPlan, resetBattleRuntimeVisuals, getTrialHazardProfile, primeTrialHazardTimer, handleTalentBloomClear, getDotStackMultiplier, applySkillDotFromHit, detonateFlameDecay, getSkillAilmentStats, getSkillConditionalDamageMultiplier, getSkillRepeatDamageMultiplier, pushEnemyAwayOnHit, repelMeleeAttacker, readRepelMeleeParams, readPursuitMovePct, launchEnemyOnHit, applySkillGridControlOnHit, spreadSkillAilmentOnHit, applySkillPeriodicOnHit, addConfirmedSkillEffect, applySupportEchoOnHit, applySupportChaosErosionOnHit, transferPassiveChaosErosionToTarget, getAilmentTypeFromElement, getPlayerAilmentChance, getPassiveBleedMultiplier, getPlayerShockTakenDamageIncreasePct, getEnemyShockTakenDamageIncreasePct, getActiveEnemyShockTakenDamageIncreasePct, getShockedEnemyHitDamageIncreaseMultiplier, getDamageAilmentEffectiveDotScale, getDamageAilmentScore, cloneEnemyAilmentForSpread, mergeEnemyAilment, recordKillProgress, layStumpDrop, applyAccountRewardStats, applyAilmentEffectsOnDeath, getFlameDecayIgniteTakenMultiplier, getPlayerDamageAilmentFallbackDps, applyEnemyAilmentFromHit, tickEnemyAilments, tickEnemyDotEffects, syncCrowdPauseState, resetWoodsmanCurse, startWoodsmanCurse, tickWoodsmanCurse, getWoodsmanCurseDamageTakenMul, getWoodsmanPhaseProgress, woodsmanAttackFxElement, getEncounterTelemetryContext, applyCosmosAstraStance });
})();


// A chaos depth's boss always strikes with the same element and adds the next one (2026-10-04): a random element decided a chaos 20
// clear more than the build did (a build with low chaos resistance lived or died by the draw). Depth d: CHAOS_BOSS_ELEMENTS[d mod 4]
// then the following one, so chaos 20 is fire with cold and the map estimate names the two resistances to prepare.
const CHAOS_BOSS_ELEMENTS = Object.freeze(['fire', 'cold', 'light', 'chaos']);


const getMapBossRequiredDps = function (bossHp, clearTimeSec, regenRate) {
    const duration = Math.max(1, Number(clearTimeSec) || 1);
    // regenRate is a life fraction per 0.1 s step (applyEnemyRegen); until 2026-10-04 it was read as per second, a tenth of the healing.
    const recoveryPerSecond = Math.max(0, Number(regenRate) || 0) * (1000 / ENEMY_REGEN_STEP_MS);
    // Average of the tiring regeneration over the fight (applyEnemyRegen): 1 − t/F before F, F/(2t) after.
    const fatigueSec = ENEMY_REGEN_FATIGUE_MS / 1000;
    const averageRegen = duration <= fatigueSec ? 1 - duration / (2 * fatigueSec) : fatigueSec / (2 * duration);
    return bossHp / duration + bossHp * recoveryPerSecond * averageRegen;
};


function isCrowdProgressPaused() {
    if (game.moveTimer > 0) return false;
    // 방 단위 무대: 방 안의 몬스터를 다 잡아야 문이 열린다. 따로 멈출 진행이 없으니 무리가 많다는 알림도 내지 않는다.
    if (actExplorationDoors.stageMap(actExplorationState.current(game))) return false;
    return (game.enemies || []).filter(enemy => enemy.hp > 0).length >= ENEMY_CROWD_PAUSE_LIMIT;
}


/** 화염 부패(2026-10-17 스킬룬 인계 v32): 이미 걸린 적에게 다시 맞히면 남은 틱 피해를 한 번에 주고 둘레 마름모 2칸에 그 타격의 70%로 터지며,
 * 폭발에 휘말린 가까운 적 가운데 아직 타지 않는 셋에게 새로 옮겨 붙는다. 걸린 채 죽어도 같은 폭발이 터진다(옮겨 붙지는 않는다).
 * 같은 시전이 막 붙인 불은 그 시전 안에서 다시 터지지 않는다(settleMs). 수치는 인계의 제안 값이다. */
const FLAME_DECAY_BURST = Object.freeze({ radius: 2, pct: 70, spread: 3, settleMs: 100 });
const flameDecayMitigated = (enemy, damage, pStats) => Math.floor(Math.max(1, Math.floor(damage * (1 - getEffectiveEnemyMitigation('fire', (getZone(game.currentZoneId) || {}).tier || 1, enemy, pStats) / 100)))
    * loopMutation.takenMul(enemy, 'fire'));


/** 맞은 몬스터를 주인공 반대쪽으로 skill.pushAwayCells칸 민다(불사르기, 돌진: 2026-10-17 스킬룬 인계). 보스는 밀리지 않는다. */
const canPushEnemy = enemy => !enemy.isBoss && !isEnemyPetrified(enemy) && hasGridCell(enemy);


const SKILL_PERIODIC_CHAIN_CAP = 12;


function isDamageAilmentType(type) {
    return type === 'ignite' || type === 'poison' || type === 'bleed';
}


function getStoredAilmentHitDamage(ail) {
    if (!ail) return 0;
    return Math.max(0, Number(ail.sourceHitDamage || ail.hitDamage || 0) || 0);
}

function getDamageAilmentBaseDpsFromHit(hitDamage, power, scale, critDotBonusPct, critDotBonusScale) {
    let source = Math.max(0, Number(hitDamage) || 0);
    if (source <= 0) return 0;
    let mul = getDamageAilmentEffectiveDotScale(scale, critDotBonusPct, critDotBonusScale);
    return Math.max(1, Math.floor(source * 0.90 * mul));
}


function getEnemyDamageAilmentDps(ail, pStats) {
    let dotDamageScale = Math.max(0.01, (pStats && Number.isFinite(pStats.dotDamageScale)) ? pStats.dotDamageScale : 1);
    let dps = getDamageAilmentBaseDpsFromHit(getStoredAilmentHitDamage(ail), ail ? ail.power : 0, dotDamageScale, ail ? ail.critDotBonusPct : 0, pStats ? pStats.dotCritBonusScale : 1);
    const damageStat = { ignite: 'igniteDamageMultiplierPct', poison: 'poisonDamageMultiplierPct' }[ail?.type];
    dps = Math.floor(dps * (1 + (Math.max(0, Number(pStats?.[damageStat]) || 0) + Math.max(0, Number(pStats?.ailmentDamagePct) || 0)) / 100));
    if (ail && pStats && ail.type === pStats.mystiqueAilmentType) {
        dps = Math.floor(dps * (1 + Math.max(0, Number(pStats.mystiqueAilmentDamagePct) || 0) / 100));
    }
    if (ail && (ail.talentDamageMorePct || 0) > 0) dps = Math.floor(dps * (1 + ail.talentDamageMorePct / 100));
    if (typeof getTalentDotDamageMultiplier === 'function') dps = Math.floor(dps * getTalentDotDamageMultiplier());
    if (ail && ail.type === 'bleed') dps = Math.floor(dps * getPassiveBleedMultiplier(pStats));
    return dps;
}


function getPlayerDamageAilmentDps(ail, pStats) {
    let source = getStoredAilmentHitDamage(ail);
    let dps = source > 0 ? getDamageAilmentBaseDpsFromHit(source, ail ? ail.power : 0, 1, ail ? ail.critDotBonusPct : 0, 1) : getPlayerDamageAilmentFallbackDps(ail ? ail.type : null, ail ? ail.power : 0, pStats);
    if (pStats && pStats.uniqueArmorAppliesToDot) {
        let armor = Math.max(0, Number(pStats.armor) || 0);
        let armorRed = Math.min(0.8, armor / (armor + 1200));
        dps = Math.max(0, Math.floor(dps * (1 - armorRed)));
    }
    return dps;
}


const WOODSMAN_PHASE_OLD_FINAL_PROGRESS = 0.75;
const WOODSMAN_PHASE_NEW_FINAL_PROGRESS = 0.95;
const WOODSMAN_ELEMENTS = Object.freeze(['phys', 'fire', 'cold', 'light', 'chaos']);


// 잔향체 아스트라(cosmos_astra): 우주 5개 은하 보스를 모두 격파해야 도전할 수 있는 최종 보스.
// 그 다섯 보스의 정체성(견고/흡수/균형/심판/충격)을 4.5초 주기로 순환하며 방어·공격 프로필이 계속 바뀐다.
const COSMOS_ASTRA_STANCES = [
    { name: '하말리스의 메아리: 견고', ele: 'phys', drAdd: 20, armorMul: 1.7 },
    { name: '디프다르의 메아리: 흡수', ele: 'chaos', regenMul: 8, resChaosAdd: 22 },
    { name: '주베누비아의 메아리: 균형', ele: 'phys', resAllAdd: 18, drAdd: 8 },
    { name: '주벤샤말의 메아리: 심판', ele: 'light', penetrationAdd: 26, critChanceAdd: 18, atkMulMul: 1.15 },
    { name: '에니프론의 메아리: 충격', ele: 'fire', atkMulMul: 1.75, attackSpeedVarMul: 1.4 }
];
const COSMOS_ASTRA_STANCE_CYCLE_MS = 4500;


// A compact cluster (not a repeated line), rotated per room. Existing pack-size modifiers fill its 3×3.
const explorationPackFormation=(()=>{
    const offsets=[[0,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[0,-1],[-1,1],[1,0]];
    function cells(room,count,turns) {
        return offsets.slice(0,count).map(([dx,dy])=>{
            for(let turn=0;turn<turns;turn++)[dx,dy]=[-dy,dx];
            return {gx:room.gx+dx,gy:room.gy+dy};
        });
    }
    function roomCount(zone,stage,encounter,shape) {
        if(stage!==null)return 1;
        const extra=(zone.packExtra||0)+(encounter?ATLAS.encounters[encounter].packExtra:0);
        return shape.count || Math.min(9,3+extra);
    }
    /** 방 가운데의 3×3 바깥 자리들: 가운데에서 가까운 둘레부터, 방 바닥 안에서. */
    function outerOffsets(room) {
        const list=[],reach=cell=>Math.max(Math.abs(cell[0]),Math.abs(cell[1]));
        for(let dy=-room.radiusY;dy<=room.radiusY;dy++)for(let dx=-room.radiusX;dx<=room.radiusX;dx++)list.push([dx,dy]);
        return list.filter(cell=>reach(cell)>1).sort((a,b)=>reach(a)-reach(b));
    }
    /** 방 가운데 둘레의 자리 count개(무리가 서는 차례 그대로). 아홉을 넘으면 3×3 바깥 둘레로 넓혀 선다(군락지의 웨이브는 서른여섯까지다). */
    const spots=(room,count)=>cells(room,Math.min(count,offsets.length),0).concat(count>offsets.length?around(room,count-offsets.length):[]);
    /** 방 가운데의 3×3을 비워 두고 그 둘레에 서는 자리 count개: 가운데에 보스(2×2)가 서는 무리의 나머지. */
    const around=(room,count)=>outerOffsets(room).slice(0,count).map(([dx,dy])=>({gx:room.gx+dx,gy:room.gy+dy}));
    /** 무리의 열쇠와, 정예를 세우지 않는 무리인지(plain): 길목, 덧무리(extraN), 이어지는 무리(waveN). 그 밖은 방의 보통 무리나 보스 단계다. */
    function packIdentity(room,stage,shape,patrol) {
        if(patrol)return {key:room.id+':patrol',plain:true};
        if(shape.extra)return {key:`${room.id}:extra${shape.extra}`,plain:true};
        if(shape.wave)return {key:`${room.id}:wave${shape.wave}`,plain:true};
        return {key:explorationPackKey(room,stage),plain:false};
    }
    function prepare(zone,room,stage,encounter,formation) {
        const shape=formation || {},patrol=Object.hasOwn(shape,'anchor'),{key,plain}=packIdentity(room,stage,shape,patrol),at=explorationPackSpawnAt(zone,key,stage);
        const elite=!plain && (room.role==='elite' || !!encounter || isAtlasExtraEliteRoom(zone,room));
        return {key,at,elite,anchor:shape.anchor,extra:shape.extra,wave:shape.wave,cells:shape.cells || cells(shape.center || room,roomCount(zone,stage,encounter,shape),at%4)};
    }
    /** Leave the entry's five-tile notice radius empty when a larger first-room group spreads toward it. */
    function roomCenter(map,room) {
        const dx=room.gx-map.entry.gx,dy=room.gy-map.entry.gy;
        if(Math.abs(dx)+Math.abs(dy)>6)return room;
        const center={gx:room.gx,gy:room.gy};
        if(Math.abs(dx)>Math.abs(dy))center.gx+=Math.sign(dx);else center.gy+=Math.sign(dy);
        return offsets.every(([x,y])=>actExplorationMap.walkable(map,{gx:center.gx+x,gy:center.gy+y}))?center:room;
    }
    function fillRooms(rooms,counts,budget) {
        while(budget>0) {
            const eligible=rooms.filter(room=>counts.get(room.id).count<9);
            if(!eligible.length)break;
            for(const room of eligible) {
                if(!budget)break;
                counts.get(room.id).count++;budget--;
            }
        }
    }
    function growLargeRoom(rooms,counts,budget,base) {
        const spacious=rooms.filter(room=>room.role==='battle' && room.radiusX>=2 && room.radiusY>=2)
            .sort((a,b)=>b.radiusX*b.radiusY-a.radiusX*a.radiusY);
        if(!spacious.length || budget<=0)return budget;
        const extra=Math.min(budget,Math.max(0,Math.min(8,base+3)-base));
        counts.get(spacious[0].id).count+=extra;return budget-extra;
    }
    function plan(zone,map) {
        if(!['act','abyss'].includes(zone.type))return {counts:new Map(),patrol:null};
        const rooms=actExplorationState.packRooms(map),base=Math.min(9,3+(zone.packExtra||0));
        const counts=new Map(rooms.map(room=>[room.id,{count:base,center:roomCenter(map,room)}])),patrol=actExplorationMap.roadGroup(map);
        const budget=Math.round(rooms.length*base*.28)-(patrol?patrol.cells.length:0);
        const remainder=growLargeRoom(rooms,counts,budget,base);
        const varied=[...rooms].sort((a,b)=>explorationPackSpawnAt(zone,a.id,null)-explorationPackSpawnAt(zone,b.id,null));
        fillRooms(varied,counts,remainder);return {counts,patrol};
    }
    /** 그 방의 무리가 설 수(자리를 따로 정하는 쪽이 쓴다: stageRoomArranger). */
    const count=(zone,encounter,shape)=>roomCount(zone,null,encounter,shape||{});
    /** 보통 무리는 두 종을 중심으로 전열·지원 비중이 다르다. 희귀 위습/무기 뿌리 굴림과 별도 콘텐츠 배역은 그대로다. */
    function rosterPair(zone,seed) {
        const pool=getActMonsterPool(zone);
        const melee=pool.filter(id=>getMonsterVisualAttackKind(id)==='melee'),ranged=pool.filter(id=>getMonsterVisualAttackKind(id)==='ranged');
        const front=melee.length?melee:pool,back=ranged.length?ranged:pool;
        return [front[seed%front.length],back[Math.floor(seed/7)%back.length]];
    }
    /** Keep the elite leader and the original wisp/root rolls before choosing ordinary species. No combat RNG is consumed. */
    function ordinarySlots(zone,shape) {
        return shape.cells.map((_,index)=>index).filter(index=>{
            if(shape.elite && index===0)return false;
            const seed=Math.abs(getEnemySeeds(zone,{at:shape.at},index).variantSeed);
            return seed%WISP_ENEMY_RULES.spawnOneIn!==0 && !getRootMonsterVisualDefinition(seed);
        });
    }
    /** Content reserves evenly spaced ordinary slots before spawn. Rare eligibility depends only on the existing variant seed,
     * not on the element that createEnemy will roll once. Other slots keep their natural species, even duplicate roster members. */
    function encounterOrdinaryRoster(zone,encounter,shape) {
        const desired=ATLAS.encounters[encounter]?.ordinaryRoster;
        if(zone.type!=='atlasMap' || !desired)return [];
        const slots=ordinarySlots(zone,shape);
        const roster=[],count=Math.min(slots.length,desired.length);
        if(!count)return roster;
        if(count===1){
            // Keep the original salt so renaming the setting does not reroll a one-slot garden room.
            const seed=Math.abs(hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:ordinaryPair`));
            roster[slots[0]]=desired[seed%desired.length];
            return roster;
        }
        for(let index=0;index<count;index++){
            const slot=slots[Math.round(index*(slots.length-1)/(count-1))];
            roster[slot]=desired[Math.round(index*(desired.length-1)/(count-1))];
        }
        return roster;
    }
    /** A labyrinth room has both roles when two ordinary slots survive. The run seed includes the floor;
     * use higher hash bits for the extra role so neighboring room IDs do not all pick the same emphasis. */
    function labyrinthRoomRoster(zone,shape) {
        const slots=ordinarySlots(zone,shape),roster=[];
        if(!slots.length)return roster;
        const seed=Math.abs(hashSeed(`${zone.exploration.seed}:${shape.key}:roster`)),pair=rosterPair(zone,seed);
        const pattern=Math.floor(seed/13)%2?[0,1,1]:[0,1,0];
        slots.forEach((slot,index)=>{roster[slot]=pair[slots.length===1?seed%2:pattern[index%pattern.length]];});
        return roster;
    }
    function ordinaryRoomRoster(zone,shape) {
        if(zone.type==='labyrinth')return labyrinthRoomRoster(zone,shape);
        const seed=Math.abs(hashSeed(`${zone.atlasSeed || zone.id}:${shape.key}:roster`)),pair=rosterPair(zone,seed);
        const pattern=[[0,0,1],[0,0,1],[0,0,0,1],[0,1,1]][seed%4];
        return shape.cells.map((_,index)=>pair[pattern[index%pattern.length]]);
    }
    function roster(zone,stage,encounter,shape,formation) {
        if(stage!==null || formation?.cast || formation?.rescue)return [];
        if(!['act','abyss','atlasMap','labyrinth'].includes(zone.type) || getRealmMonsterVisualSet(zone))return [];
        if(encounter)return encounterOrdinaryRoster(zone,encounter,shape);
        return ordinaryRoomRoster(zone,shape);
    }
    /** 이미 확보한 칸의 주인만 바꾼다. 몬스터 수, 칸 점유, 무리의 열쇠와 목록 순서를 바꾸지 않는다. */
    function placeRanks(waiting,formation) {
        if(!formation?.front || formation.cast || formation.rescue)return;
        const front=formation.front,depth=cell=>Math.abs(cell.gx-front.gx)+Math.abs(cell.gy-front.gy);
        const cells=waiting.map(({gx,gy})=>({gx,gy})).sort((a,b)=>depth(a)-depth(b));
        const rank=enemy=>enemy.attackKind==='ranged'?10+enemy.attackRange:-enemy.attackRange;
        [...waiting].sort((a,b)=>rank(a)-rank(b)).forEach((enemy,index)=>Object.assign(enemy,cells[index]));
    }
    return {prepare,plan,spots,around,count,roster,placeRanks};
})();

safeExposeGlobals({ estimateMapZonePowerRequirements, isCrowdProgressPaused, generateEncounterPlan, isDamageAilmentType, getPlayerShockTakenDamageIncreasePct, getEnemyShockTakenDamageIncreasePct, getActiveEnemyShockTakenDamageIncreasePct, getStoredAilmentHitDamage, getDamageAilmentBaseDpsFromHit, getEnemyDamageAilmentDps, getPlayerDamageAilmentDps, getPlayerDamageAilmentFallbackDps });
