/** domain/challenge-zone-definitions: native owner; state is read from the supplied current-game port. */
export class ChallengeZoneDefinitions {
    constructor(deps, data, { difficulty }) {
        this.deps = deps;
        this.data = data;
        this.difficulty = difficulty;
        this.normalizeCosmosDirectiveSnapshot = this.normalizeCosmosDirectiveSnapshot.bind(this);
        this.createCosmosChallengeZone = this.createCosmosChallengeZone.bind(this);
        this.getBeyondBoundaryTierProfile = this.getBeyondBoundaryTierProfile.bind(this);
        this.createBeyondBoundaryZone = this.createBeyondBoundaryZone.bind(this);
        this.createBeehiveZone = this.createBeehiveZone.bind(this);
        this.getGrandBreachProgress = this.getGrandBreachProgress.bind(this);
        this.createColonyZone = this.createColonyZone.bind(this);
        this.getUnderworldZone = this.getUnderworldZone.bind(this);
    }

    normalizeCosmosDirectiveSnapshot(source) {
        if (!source || typeof source !== 'object') return null;
        const directive = this.canonicalCosmosDirective(source);
        return {
            id: String(directive.id || 'survey'),
            name: String(directive.name || '안정 관측').slice(0, 40),
            ...this.cosmosDirectiveEffects(directive),
            rare: directive.rare === true
        };
    }

    createCosmosChallengeZone(state) {
        const challenge = this.activeCosmosChallenge(state);
        if (!challenge) return null;
        const galaxy = Math.max(0, Math.min(5, Math.floor(Number(challenge.galaxy) || 0)));
        return {
            id: 'cosmos_challenge', name: `우주계 ${challenge.name || '행성'}`, type: 'cosmos',
            tier: Math.max(1, Math.floor(challenge.tier || 1)),
            lootTier: Math.max(1, Math.floor(Number(challenge.lootTier) || (Math.max(1, galaxy) - 1) * 5 + 1)),
            maxKills: 1, ele: challenge.ele || 'chaos', cosmosNodeId: challenge.nodeId || null,
            cosmosGalaxy: galaxy, cosmosTag: challenge.tag || '', cosmosMechanicId: challenge.mechanicId || '',
            ...this.cosmosChallengeMechanics(challenge)
        };
    }

    getBeyondBoundaryTierProfile(tierValue) {
        const tier = this.deps.clampNumber(Math.floor(Number(tierValue) || 1), 1, this.deps.BEYOND_BOUNDARY_TIER_CAP);
        const difficultyTier = tier + this.deps.BEYOND_BOUNDARY_DIFFICULTY_OFFSET;
        const mutatorIds = this.deps.BEYOND_BOUNDARY_MUTATOR_DB.filter(row => tier >= row.tier).map(row => row.id);
        let hpMul = Math.pow(this.deps.BEYOND_BOUNDARY_HP_GROWTH, difficultyTier - 1);
        let damageMul = Math.pow(this.deps.BEYOND_BOUNDARY_DAMAGE_GROWTH, difficultyTier - 1);
        let attackSpeedMul = 1;
        if (mutatorIds.includes('hardened')) hpMul *= 1.2;
        if (mutatorIds.includes('onslaught')) { damageMul *= 1.15; attackSpeedMul = 1.1; }
        return {
            tier, difficultyTier, hpMul, damageMul, attackSpeedMul, mutatorIds,
            drBonus: mutatorIds.includes('iron') ? 10 : 0,
            penetrationBonus: mutatorIds.includes('piercing') ? 10 : 0,
            regenRate: mutatorIds.includes('renewal') ? 0.0025 : 0
        };
    }

    createBeyondBoundaryZone(state) {
        const { run, profile, focus, intensity } = this.boundarySelection(state);
        const wave = run ? this.deps.clampNumber(Math.floor(Number(run.wave) || 1), 1, this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER) : 1;
        return {
            id: this.deps.BEYOND_BOUNDARY_ZONE_ID, name: `경계 너머 ${profile.tier}단계, ${wave}/${this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER}`,
            type: 'beyondBoundary', tier: this.difficulty.getUnderworldTier(30) + Math.floor((profile.difficultyTier - 1) / 2),
            maxKills: 1, ele: 'chaos', difficultyBenchmark: 'underworld30',
            boundaryTier: profile.tier, boundaryWave: wave,
            boundaryDifficultyTier: profile.difficultyTier,
            boundaryFinalWave: wave === this.deps.BEYOND_BOUNDARY_ENCOUNTERS_PER_TIER,
            boundaryHpMul: profile.hpMul * (focus.hpMul || 1) * intensity.hpMul,
            boundaryDamageMul: profile.damageMul * (focus.damageMul || 1) * intensity.damageMul,
            boundaryAttackSpeedMul: profile.attackSpeedMul * (focus.attackSpeedMul || 1) * intensity.attackSpeedMul,
            boundaryDrBonus: profile.drBonus,
            boundaryPenetrationBonus: profile.penetrationBonus + (focus.penetrationBonus || 0),
            boundaryRegenRate: profile.regenRate,
            boundaryRewardMul: this.deps.getBeyondBoundaryRewardMul(profile.tier),
            boundaryRewardFocusId: focus.id, boundaryIntensityId: intensity.id,
            boundaryCompletionRewardMul: intensity.rewardMul,
            boundaryMutatorIds: profile.mutatorIds
        };
    }

    createBeehiveZone(state) {
        const hive = state.beehive;
        const step = Math.max(1, Math.min(10, Math.floor(hive.branchStep || 1)));
        const entryDepth = Math.max(21, Math.floor(hive.entryDeepChaosDepth || 21));
        const empower = Math.max(0, Math.min(30, Math.floor(hive.enemyEmpower || 0)));
        const waveHpMul = 1.4 + (step - 1) * 0.16 + empower * 0.16;
        const waveAttackRateMul = 1.1 + empower * 0.025;
        const waveDamageMul = 1.2 + empower * 0.02;
        // Entry recommendations must already cover the final queen, not the current wave.
        const queenHpMul = (1 + 9 * 0.16 + empower * 0.22) * 2.6;
        // 방 단위 무대에서는 벌집 전용 지도를 걷는다(js/content-maps.js hive). 그 밖에서는 판에서 싸운다.
        const rooms = typeof this.deps.actExplorationDoors === 'object' && this.deps.actExplorationDoors.session();
        return {
            id: 'beehive_run', name: `벌집 심층 ${step}갈래`, type: 'beehive', tier: entryDepth,
            maxKills: 1, ele: 'chaos', entryDeepChaosDepth: entryDepth, waveHpMul, waveAttackRateMul, waveDamageMul,
            bossMods: { hpMul: queenHpMul, atkMul: 1.35 + empower * 0.02,
                damageMul: 1.35 + empower * 0.025, critChanceBonus: 6, penetration: 8, patternMode: 'burst' },
            ...(rooms ? { exploration: this.deps.contentMaps.hive(state) } : null)
        };
    }

    getGrandBreachProgress(value) {
        const number = Number(value);
        const requiredGauge = this.deps.GRAND_BREACH_ENCOUNTER.requiredGauge;
        const gauge = Number.isFinite(number) ? Math.min(requiredGauge, Math.max(0, Math.floor(number))) : 0;
        return { gauge, requiredGauge, percent: gauge * 100 / requiredGauge,
            stage: Number(gauge * 3 >= requiredGauge) + Number(gauge * 3 >= requiredGauge * 2),
            complete: gauge >= requiredGauge };
    }

    createColonyZone(state) {
        const colony = state.colony;
        const wave = colony.inRun ? Math.max(1,Math.floor(colony.wave||1)) : 1;
        const depth = colony.inRun ? Math.max(21,Math.floor(colony.entryDeepChaosDepth||21))
            : Math.max(21,Math.min(state.abyssEndlessDepth||21,state.loopProgressCurrent.bestAbyssDepth||21));
        const wavePattern = ['charge', 'sharpshooters', 'carapace', 'mixed', 'overlord'][(wave - 1) % 5];
        const name = colony.inRun && colony.lootPending ? `군락지 ${wave - 1}웨이브 전리품 수거` : `군락지 방어 ${wave}웨이브`;
        return { id:'colony_run', name, type:'colony', tier:depth+Math.floor(wave/2),
            maxKills:1, ele:'chaos', entryDeepChaosDepth:depth, wavePattern,
            bossMods: { patternMode: 'slam' } };
    }

    getUnderworldZone(floor) {
        return { id: this.data.UNDERWORLD_ZONE_ID, name: `지하계 ${floor}층`, type: 'underworld', tier: this.difficulty.getUnderworldTier(floor), maxKills: 1, ele: 'chaos', floor, ...this.deps.contentMaps.underworld(floor) };
    }

    canonicalCosmosDirective(source) {
        const definitions = Array.isArray(this.deps.COSMOS_EXPEDITION_DIRECTIVE_DB)
            ? this.deps.COSMOS_EXPEDITION_DIRECTIVE_DB : [];
        const requestedId = String(source.id || 'survey');
        const canonical = definitions.find(row => row && row.id === requestedId)
            || definitions.find(row => row && row.id === 'survey');
        return canonical || source;
    }

    cosmosDirectiveEffects(directive) {
        return {
            enemyHpMul: Math.max(0.5, Math.min(3, Number(directive.enemyHpMul) || 1)),
            enemyDamageMul: Math.max(0.5, Math.min(3, Number(directive.enemyDamageMul) || 1)),
            enemyAttackSpeedMul: Math.max(0.5, Math.min(2, Number(directive.enemyAttackSpeedMul) || 1)),
            rewardMul: Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1)),
            jackpotChance: Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0)),
            jackpotBonusMul: Math.max(0, Math.min(5, Number(directive.jackpotBonusMul) || 0))
        };
    }

    activeCosmosChallenge(state) {
        const cosmos = state && state.cosmosAtlas && typeof state.cosmosAtlas === 'object' ? state.cosmosAtlas : {};
        return cosmos.activeChallenge && typeof cosmos.activeChallenge === 'object' ? cosmos.activeChallenge : null;
    }

    cosmosChallengeMechanics(challenge) {
        return {
            recommendedDps: Math.max(0, Math.floor(Number(challenge.recommendedDps) || 0)),
            recommendedEhp: Math.max(0, Math.floor(Number(challenge.recommendedEhp) || 0)),
            gravity: Math.max(1, Number(challenge.gravity || 1)),
            sizeClass: Math.max(1, Math.floor(challenge.sizeClass || 1)), theme: challenge.theme || '',
            cosmosDirective: this.normalizeCosmosDirectiveSnapshot(challenge.directive),
            cosmosHabitat: challenge.habitat
        };
    }

    boundarySelection(state) {
        const boundary = this.boundaryState(state);
        const run = boundary.activeRun && typeof boundary.activeRun === 'object' ? boundary.activeRun : null;
        const selectedTier = run ? run.tier : boundary.selectedTier;
        const profile = this.getBeyondBoundaryTierProfile(selectedTier);
        const focusId = run ? run.rewardFocusId : boundary.selectedRewardFocusId;
        const intensityId = run ? run.intensityId : boundary.selectedIntensityId;
        const focus = this.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB.find(row => row.id === focusId)
            || this.deps.BEYOND_BOUNDARY_REWARD_FOCUS_DB[0];
        const intensity = this.deps.BEYOND_BOUNDARY_INTENSITY_DB.find(row => row.id === intensityId)
            || this.deps.BEYOND_BOUNDARY_INTENSITY_DB[0];
        return { run, profile, focus, intensity };
    }

    boundaryState(state) {
        return state && state.beyondBoundary && typeof state.beyondBoundary === 'object'
            ? state.beyondBoundary : {};
    }
}
