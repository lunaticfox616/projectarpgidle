/** domain/world-zone-catalog: native owner; state is read from the supplied current-game port. */
export class WorldZoneCatalog {
    constructor(deps, data, { challenges, difficulty, chaos, sky, skyRules, rift, ocean, oceanRules }) {
        this.deps = deps;
        this.data = data;
        this.challenges = challenges;
        this.difficulty = difficulty;
        this.chaos = chaos;
        this.sky = sky;
        this.skyRules = skyRules;
        this.rift = rift;
        this.ocean = ocean;
        this.oceanRules = oceanRules;
        this.getRunZone = this.getRunZone.bind(this);
        this.getFloorZone = this.getFloorZone.bind(this);
        this.getUnderworldZoneNow = this.getUnderworldZoneNow.bind(this);
        this.getChaosRealmZoneNow = this.getChaosRealmZoneNow.bind(this);
        this.getSkyTowerZoneNow = this.getSkyTowerZoneNow.bind(this);
        this.getTimeRiftZone = this.getTimeRiftZone.bind(this);
        this.meteorSiteKind = this.meteorSiteKind.bind(this);
        this.getMeteorSiteZone = this.getMeteorSiteZone.bind(this);
        this.getOceanZoneNow = this.getOceanZoneNow.bind(this);
        this.getLabyrinthZoneNow = this.getLabyrinthZoneNow.bind(this);
        this.getChaosDepthZone = this.getChaosDepthZone.bind(this);
        this.getZone = this.getZone.bind(this);
    }

    getRunZone(id) {
        if (id === this.deps.ATLAS.zoneId) return this.deps.atlas.zone(this.deps.game);
        if (id === 'cosmos_challenge') {
            const challengeZone = this.challenges.createCosmosChallengeZone(this.deps.game);
            return challengeZone ? this.deps.contentMaps.withRooms(challengeZone) : undefined;
        }
        if (id === this.deps.BEYOND_BOUNDARY_ZONE_ID) return this.deps.contentMaps.withRooms(this.challenges.createBeyondBoundaryZone(this.deps.game));
        if (id === 'beehive_run') return this.challenges.createBeehiveZone(this.deps.game);
        // 판에서 싸우던 콘텐츠: 방 단위 무대에서는 제 지도를 걷는다(js/content-maps.js withRooms). 그 밖에서는 판 그대로다.
        if (id === 'colony_run') return this.deps.contentMaps.withRooms(this.challenges.createColonyZone(this.deps.game));
        if (id === 'grand_breach_run') {
            return this.deps.contentMaps.withRooms({
                id: 'grand_breach_run', name: '대균열', type: 'grandBreach', tier: 14, maxKills: 9999, ele: 'chaos',
                bossMods: { hpMul: 4, atkMul: 1.25, damageMul: 1.5, patternMode: 'intro' }
            });
        }
        if (id === this.data.OUTSIDE_CHAOS_ZONE_ID) return this.deps.contentMaps.withRooms({ id: this.data.OUTSIDE_CHAOS_ZONE_ID, name: '혼돈 밖', type: 'outsideChaos', bossVisualId: 'woodsman', tier: 25, maxKills: 1, ele: 'chaos', fixedDifficultyMul: 1 });
        if (id === this.data.WOODSMAN_ECHO_ZONE_ID) return this.deps.contentMaps.withRooms({ id: this.data.WOODSMAN_ECHO_ZONE_ID, name: '나무꾼의 잔상', type: 'woodsmanEcho', bossVisualId: 'woodsman_echo', tier: this.difficulty.getChaosRealmTier(30), maxKills: 1, ele: 'chaos' });
        return undefined;
    }

    getFloorZone(id) {
        if (id === this.data.CHAOS_REALM_ZONE_ID) return this.getChaosRealmZoneNow();
        if (id === this.data.SKY_TOWER_ZONE_ID) return this.getSkyTowerZoneNow();
        if (id === this.deps.TIME_RIFT_PAST_ZONE_ID || id === this.deps.TIME_RIFT_FUTURE_ZONE_ID) return this.getTimeRiftZone(id);
        if (id === this.data.UNDERWORLD_ZONE_ID) return this.getUnderworldZoneNow();
        if (id === this.deps.METEOR_FALL_ZONE_ID) return this.getMeteorSiteZone();
        if (id === this.deps.OCEAN_ZONE_ID) return this.getOceanZoneNow();
        if (id === this.deps.LABYRINTH_ZONE_ID) return this.getLabyrinthZoneNow();
        return undefined;
    }

    getUnderworldZoneNow() {
        let uw = (this.deps.game && this.deps.game.underworldProgress) || {};
        let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
        return this.challenges.getUnderworldZone(floor);
    }

    getChaosRealmZoneNow() {
        let realm = this.chaos.ensureChaosRealmState();
        let floor = Math.max(1, Math.floor(realm.currentFloor || 1));
        return { id: this.data.CHAOS_REALM_ZONE_ID, name: `혼돈계 ${floor}층`, type: 'chaosRealm', tier: this.difficulty.getChaosRealmTier(floor), maxKills: 1, ele: 'chaos', floor: floor, affixes: this.difficulty.getChaosRealmAffixes(floor), ...this.deps.contentMaps.chaosRealm(floor) };
    }

    getSkyTowerZoneNow() {
        let st = this.sky.ensureSkyTowerState();
        let floor = Math.max(1, Math.floor(st.currentFloor || 1));
        return { id: this.data.SKY_TOWER_ZONE_ID, name: `창공의 탑 ${floor}층`, type: 'skyTower', tier: this.skyRules.getSkyTowerTier(floor), maxKills: 1, ele: 'chaos', floor: floor, ...this.deps.contentMaps.skyTower(floor) };
    }

    getTimeRiftZone(id) {
        let rift = this.rift.ensureTimeRiftState();
        let phase = id === this.deps.TIME_RIFT_PAST_ZONE_ID ? 'past' : 'future';
        // 시간압이 유일한 난이도 손잡이: 세계수 아틀라스 지도처럼 그 혼돈 깊이 · 고정 루프의 몬스터다(js/combat-enemy-build.js getLoopDifficultyInputs,
        // getAbyssMonsterScales). 지역 레벨도 아틀라스와 같은 셈(깊이 2마다 3, data/atlas.js)이다. 미래는 같은 시간압에서 생명력이 18% 더 많다.
        let activePressure = this.deps.game.currentZoneId === id && rift.activePressure ? rift.activePressure : rift.pressure;
        let depth = this.difficulty.getTimeRiftEquivalentChaosDepth(activePressure);
        let areaLevel = Math.round(this.deps.ATLAS.areaLevel.base + (depth - this.deps.ATLAS.difficulty.baseDepth) * this.deps.ATLAS.areaLevel.perTier / this.deps.ATLAS.difficulty.depthPerTier);
        return { id: id, name: `시간의 균열, ${phase === 'past' ? '과거' : '미래'} (시간압 ${activePressure})`, type: 'timeRift', riftPhase: phase, tier: this.difficulty.getAbyssZoneTier(depth), maxKills: 1, ele: 'chaos',
            fixedSeason: this.difficulty.getTimeRiftFixedSeason(activePressure), equivalentDepth: depth, equivalentChaosDepth: depth, areaLevel: areaLevel, mapHpMul: phase === 'past' ? 1 : 1.18,
            pressure: activePressure, ...this.deps.contentMaps.timeRift(phase, activePressure) };
    }

    meteorSiteKind(star) {
        const decided = this.deps.METEOR_KINDS.find(row => row.id === star.kind), kind = decided || this.deps.METEOR_KINDS[0];
        return { id: kind.id, ele: kind.ele, bossHpMul: kind.bossHpMul || 1, extraEquipment: kind.extraEquipment || 0,
            zoneName: decided ? `운석 낙하 지점 (${decided.name})` : '운석 낙하 지점' };
    }

    getMeteorSiteZone() {
        let star = (this.deps.game && this.deps.game.meteorSite) || {};
        let allowBeyond20 = !!star.skyRiftAllCosmos;
        let tierCap = allowBeyond20 ? 40 : 20;
        let tier = star.activeMeteorTier || Math.max(8, Math.min(tierCap, Math.floor(star.skyRiftMinTier || 13)));
        const rooms = typeof this.deps.actExplorationDoors === 'object' && this.deps.actExplorationDoors.session();
        const kind = this.meteorSiteKind(star);
        return {
            id: this.deps.METEOR_FALL_ZONE_ID,
            name: kind.zoneName,
            type: 'meteor',
            meteorKind: kind.id,
            tier: tier,
            rewardEquipmentCount: 1 + Math.min(2, Math.floor(tier / 20)) + kind.extraEquipment,
            maxKills: 1,
            ele: kind.ele, bossVisualId: 'meteor-heart',
            bossMods: { hpMul: 2.2 * kind.bossHpMul, atkMul: 1.1, damageMul: 1.4, patternMode: 'slam' },
            // 파편 무리 → 정예 호위 → 핵. 기존 운석 투기장은 핵만 세워 앞의 조우가 생략되었다.
            exploration: rooms ? { style: 'act', act: this.deps.contentMaps.actForBiome('ruins'), seed: `meteor:${tier}`, chain: 2 }
                : this.deps.contentMaps.arena('meteor', 'ruins')
        };
    }

    getOceanZoneNow() {
        let ocean = this.ocean.ensureOceanState();
        let depthM = Math.max(0, Math.floor(ocean.depthM || 0));
        let depthTier = this.oceanRules.getOceanDepthTier(depthM);
        return this.deps.contentMaps.withRooms({ id: this.deps.OCEAN_ZONE_ID, name: `심해 ${depthM}m`, type: 'oceanDepth', tier: this.difficulty.getChaosRealmTier(21) + depthTier, maxKills: 1, ele: 'chaos', depthM: depthM, depthTier: depthTier, currents: this.difficulty.getOceanCurrentAffixes(depthTier) });
    }

    getLabyrinthZoneNow(requestedFloor = this.deps.game.labyrinthFloor) {
        let floor = Math.max(1, Math.floor(requestedFloor || 1));
        let baseTier = Math.min(20, 7 + Math.floor(floor / 3));
        let over50 = Math.max(0, floor - 50);
        let over100 = Math.max(0, floor - 100);
        let extraTier = Math.floor(over50 / 5) + Math.floor(over100 / 3);
        return { id: this.deps.LABYRINTH_ZONE_ID, name: `고대 미궁 ${floor}층`, type: 'labyrinth', bossVisualId: 'labyrinth_guardian', tier: baseTier + extraTier, maxKills: 1, ele: 'chaos', floor: floor, exploration: this.deps.contentMaps.labyrinth(floor) };
    }

    getChaosDepthZone(id) {
        let depth = this.difficulty.getAbyssDepthFromZoneId(id);
        let displayDepth = depth;
        let baseZone = this.data.MAP_ZONES[Math.min(id, this.difficulty.getAbyssZoneIdForDepth(20))];
        return {
            ...(baseZone || {}),
            id: id,
            name: displayDepth > 20 ? `혼돈 심화 ${displayDepth}` : `혼돈 ${displayDepth}`,
            type: 'abyss',
            tier: this.difficulty.getAbyssZoneTier(displayDepth),
            maxKills: 1,
            ele: 'chaos',
            depth: displayDepth,
            baseDepth: Math.min(20, depth),
            isEndlessDepth: displayDepth > 20, ...this.deps.contentMaps.chaos(displayDepth)
        };
    }

    getZone(id) {
        let zone = this.getRunZone(id);
        if (zone === undefined) zone = this.getFloorZone(id);
        if (zone !== undefined) return zone;
        if (typeof id === 'string') {
            if (id.startsWith('trial_')) return this.deps.contentMaps.trialCorridor(this.deps.TRIAL_ZONES.find(t => t.id === id));
            let seasonBossZone = this.deps.SEASON_BOSS_ZONES.find(t => t.id === id);
            if (seasonBossZone) return this.deps.contentMaps.withArena(seasonBossZone, this.deps.contentMaps.bossBiome(seasonBossZone));
        }
        if (Number.isFinite(id) && id >= this.data.ABYSS_START_ZONE_ID) return this.getChaosDepthZone(id);
        return this.data.MAP_ZONES[id];
    }
}
