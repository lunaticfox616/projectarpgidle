/** common/realm-difficulty: native owner; state is read from the supplied current-game port. */
export class RealmDifficulty {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.getChaosRealmTier = this.getChaosRealmTier.bind(this);
        this.getUnderworldTier = this.getUnderworldTier.bind(this);
        this.getUnderworldGravityActionMultiplier = this.getUnderworldGravityActionMultiplier.bind(this);
        this.getUnderworldLifeDrainPerTick = this.getUnderworldLifeDrainPerTick.bind(this);
        this.getChaosRealmAffixCount = this.getChaosRealmAffixCount.bind(this);
        this.getChaosRealmAffixScale = this.getChaosRealmAffixScale.bind(this);
        this.getChaosRealmAffixes = this.getChaosRealmAffixes.bind(this);
        this.getOceanCurrentAffixes = this.getOceanCurrentAffixes.bind(this);
        this.hasOceanCurrent = this.hasOceanCurrent.bind(this);
        this.getColonyWaveEnemyCount = this.getColonyWaveEnemyCount.bind(this);
        this.getAbyssDepthFromZoneId = this.getAbyssDepthFromZoneId.bind(this);
        this.getAbyssZoneIdForDepth = this.getAbyssZoneIdForDepth.bind(this);
        this.getAbyssZoneTier = this.getAbyssZoneTier.bind(this);
        this.getTimeRiftEquivalentChaosDepth = this.getTimeRiftEquivalentChaosDepth.bind(this);
        this.getTimeRiftFixedSeason = this.getTimeRiftFixedSeason.bind(this);
        this.getChaosDepthScales = this.getChaosDepthScales.bind(this);
        this.getAbyssMonsterScales = this.getAbyssMonsterScales.bind(this);
        this.getContentDropRateMultiplier = this.getContentDropRateMultiplier.bind(this);
        this.capEndlessContentDropMultiplier = this.capEndlessContentDropMultiplier.bind(this);
        this.underworldMilestoneReward = this.underworldMilestoneReward.bind(this);
    }

    getChaosRealmTier(floor) {
        let safeFloor = Math.max(1, Math.floor(floor || 1));
        return 30 + Math.floor((safeFloor - 1) * 0.85) + Math.floor(Math.max(0, safeFloor - 10) * 0.18);
    }

    getUnderworldTier(floor) {
        let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
        let deepFloor = this.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor;
        let tierGain = Math.max(0, safeFloor - deepFloor) * this.deps.UNDERWORLD_DIFFICULTY_CONFIG.tierGainPerFloorAfterDeep;
        return this.getChaosRealmTier(30) + tierGain;
    }

    getUnderworldGravityActionMultiplier(floor, reductionPct) {
        let safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
        let reduction = Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
        let baseSlow = Math.min(0.75, 0.12 + Math.max(0, safeFloor - 1) * 0.018) * (1 - reduction);
        let deepFloors = Math.max(0, safeFloor - this.deps.UNDERWORLD_DIFFICULTY_CONFIG.deepDamageThroughFloor);
        let deepMultiplier = Math.pow(1 - this.deps.UNDERWORLD_DIFFICULTY_CONFIG.gravityActionLossPerFloorAfterDeep, deepFloors);
        return Math.max(0.0001, (1 - baseSlow) * deepMultiplier);
    }

    getUnderworldLifeDrainPerTick(maxHp, floor, reductionPct) {
        if (floor < 15) return 0;
        const fraction = floor >= 40 ? 0.02 : (floor >= 30 ? 0.015 : 0.01);
        const mitigation = 1 - Math.max(0, Math.min(75, Number(reductionPct) || 0)) / 100;
        return Math.max(1, Math.floor((maxHp || 1) * fraction * mitigation));
    }

    getChaosRealmAffixCount(floor) {
        let safeFloor = Math.max(1, Math.floor(floor || 1));
        if (safeFloor >= 35) return 5 + Math.floor((safeFloor - 35) / 20);
        if (safeFloor >= 20) return 4;
        if (safeFloor >= 10) return 3;
        if (safeFloor >= 5) return 2;
        return 1;
    }

    getChaosRealmAffixScale(floor) {
        return 1 + Math.floor(Math.max(1, Math.floor(floor || 1)) / 10) * 0.25;
    }

    getChaosRealmAffixes(floor) {
        let safeFloor = Math.max(1, Math.floor(floor || 1));
        let count = Math.min(this.data.CHAOS_REALM_AFFIX_POOL.length, this.getChaosRealmAffixCount(safeFloor));
        let start = Math.abs(this.deps.hashSeed('chaosRealm:' + safeFloor)) % this.data.CHAOS_REALM_AFFIX_POOL.length;
        let out = [];
        for (let i = 0; i < this.data.CHAOS_REALM_AFFIX_POOL.length && out.length < count; i++) {
            let affix = this.data.CHAOS_REALM_AFFIX_POOL[(start + (i * 5)) % this.data.CHAOS_REALM_AFFIX_POOL.length];
            if (!out.some(row => row.id === affix.id)) out.push({ ...affix, scale: this.getChaosRealmAffixScale(safeFloor) });
        }
        return out;
    }

    getOceanCurrentAffixes(depthTier) {
        let safeTier = Math.max(0, Math.floor(depthTier || 0));
        let count = Math.min(this.data.OCEAN_CURRENT_POOL.length, 1 + Math.floor(safeTier / 3));
        let start = Math.abs(this.deps.hashSeed('oceanCurrent:' + safeTier)) % this.data.OCEAN_CURRENT_POOL.length;
        let out = [];
        for (let i = 0; i < this.data.OCEAN_CURRENT_POOL.length && out.length < count; i++) {
            let affix = this.data.OCEAN_CURRENT_POOL[(start + (i * 5)) % this.data.OCEAN_CURRENT_POOL.length];
            if (!out.some(row => row.id === affix.id)) out.push({ ...affix });
        }
        return out;
    }

    hasOceanCurrent(zone, currentId) {
        return !!(zone && Array.isArray(zone.currents) && zone.currents.some(current => current && current.id === currentId));
    }

    getColonyWaveEnemyCount(wave) {
        return Math.max(12, Math.min(36, 10 + Math.max(1, Math.floor(wave || 1)) * 2));
    }

    getAbyssDepthFromZoneId(id) {
        if (!Number.isFinite(id) || id < this.data.ABYSS_START_ZONE_ID) return 0;
        return Math.max(1, Math.floor(id - this.data.ABYSS_START_ZONE_ID + 1));
    }

    getAbyssZoneIdForDepth(depth) {
        return this.data.ABYSS_START_ZONE_ID + Math.max(1, Math.floor(depth || 1)) - 1;
    }

    getAbyssZoneTier(depth) {
        let safeDepth = Math.max(1, Math.floor(depth || 1));
        return this.data.abyssTiers[Math.min(20, safeDepth) - 1] || this.data.abyssTiers[this.data.abyssTiers.length - 1] || 20;
    }

    getTimeRiftEquivalentChaosDepth(pressure) {
        let safePressure = Math.max(1, Math.min(this.deps.TIME_RIFT_MAX_PRESSURE, Math.floor(Number(pressure) || 1)));
        return this.deps.TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS[safePressure - 1];
    }

    getTimeRiftFixedSeason(pressure) {
        return this.getTimeRiftEquivalentChaosDepth(pressure) - this.deps.TIME_RIFT_LOOP_BEHIND_DEPTH;
    }

    getChaosDepthScales(endlessDepth) {
        let endlessOver = Math.max(0, endlessDepth - 20);
        let endlessMul = 1;
        if (endlessOver > 0) {
            let steepBand = Math.min(10, endlessOver);
            let smoothBand = Math.max(0, endlessOver - 10);
            endlessMul = Math.pow(this.data.ABYSS_ENDLESS_STEEP_FLOOR_HP_MUL, steepBand) * Math.pow(1.06, smoothBand);
        }
        // 루프 11~30에 혼돈에만 붙던 생명력 +4% · 피해 +5% · 받는 피해 +3%(루프당)는 뺐다(2026-10-06): 같은 루프의 액트보다 혼돈만
        // 한꺼번에 몇 배 세지는 원인이었다. 루프 몫은 모든 지역이 같은 곡선(data/maps.js MONSTER_LOOP_HP_CURVE)으로 받고,
        // 여기에는 층(레벨)에 따른 몫만 남긴다.
        return {
            dmgMul: 1 + endlessOver * 0.022,
            hpMul: endlessMul,
            hordeMul: 1,
            dropMul: 1,
            expMul: 1,
            playerTakenMul: 1 + Math.min(10, endlessOver) * this.data.ABYSS_ENDLESS_STEEP_PLAYER_TAKEN_PER_FLOOR + Math.max(0, endlessOver - 10) * 0.012,
            playerDamageMul: 1,
            resistBonus: 0,
            eliteBonus: 0,
            bossMul: 1,
            bossExtraCurrencyChance: 0,
            mapProgressMul: 1,
            mapLengthMul: 1
        };
    }

    getAbyssMonsterScales(zone) {
        if (zone && (zone.type === 'atlasMap' || zone.type === 'timeRift')) return this.getChaosDepthScales(zone.equivalentDepth);
        if (!zone || zone.type !== 'abyss') return { dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1, playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0, bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1 };
        let depth = Math.max(1, Math.floor(zone.depth || this.getAbyssDepthFromZoneId(zone.id) || 1));
        // 난이도는 그 층의 깊이만 따른다(2026-10-11): 예전에는 심화층(21+)에 지난 루프의 기록(game.abyssEndlessDepth)을 겹쳐 읽어
        // "혼돈 심화 21"이 기록한 최고 층의 난이도로 나왔다. 층마다 제 지역 id가 있어 기록을 겹칠 까닭이 없다.
        return this.getChaosDepthScales(depth);
    }

    getContentDropRateMultiplier(zone) {
        return zone && zone.type === 'underworld' ? this.data.UNDERWORLD_DROP_RATE_MULTIPLIER : 1;
    }

    capEndlessContentDropMultiplier(zone, multiplier) {
        let value = Math.max(0, Number(multiplier) || 0);
        if (!zone || !['abyss', 'chaosRealm', 'labyrinth', 'underworld', 'beyondBoundary'].includes(zone.type)) return value;
        return Math.min(this.data.ENDLESS_CONTENT_DROP_MULTIPLIER_CAP, value);
    }

    underworldMilestoneReward(floor) {
        const rule = this.deps.UNDERWORLD_DEEP_FLOOR_REWARD;
        if (!Number.isSafeInteger(floor) || floor < 10) return null;
        if (floor <= rule.fromFloor) {
            if (floor % 10 !== 0) return null;
            return { floor, slots: Math.min(6, floor / 10), rune: this.data.UNDERWORLD_RUNE_DB.find(row => row.no === floor / 10), currencies: {} };
        }
        const depth = floor - rule.fromFloor;
        if (depth % rule.every !== 0) return null;
        return { floor, slots: 0, rune: null, currencies: {
            runeShard: Math.floor(rule.runeShard[0] + rule.runeShard[1] * depth),
            underGold: Math.floor(rule.underGold[0] + rule.underGold[1] * depth)
        } };
    }
}
