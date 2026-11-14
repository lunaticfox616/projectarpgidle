import { COSMOS_CAPSTONE_BOSS_IDS, GALAXY_SEQUENCE, GALAXY_BOSS_PLANET_INDEX, GALAXY_BOSS_REQUIRED_CLEARS } from '../data/cosmos-atlas.mjs';

/** Native atlas rules; no DOM or renderer dependency. */
export class CosmosAtlasRules {
    constructor(deps, services) { this.deps = deps; this.progress = services.progress; this.stones = services.stones; this.graph = services.graph; this.directives = services.directives; this.state = services.state; }

    getDisplayedNodeTier(node, state) {
        const bossTier = this.progress.getCosmosBossTier(node);
        if (bossTier != null) return bossTier;
        return Math.max(Math.floor(node.tier || 1), this.stones.getCosmosTierFloor(state));
    }

    canChallengeNode(node) {
        if (!node) return false;
        if (this.deps.game.cosmosRoute?.phase === 'failed' && this.deps.cosmosRouteRuntime.retryRemaining(this.deps.game)) return false;
        const status = this.progress.getNodeStatus(node);
        return status === 'available' || status === 'cleared';
    }

    getCosmosEquivalentUnderworldFloor(node) {
        const tier = Math.max(1, Math.floor(this.getDisplayedNodeTier(node) || 1));
        return 30 + (tier - 1);
    }

    getCosmosChallengeTier(node) {
        // 우주계 전투 난이도는 "지하계 30층 이상"을 기준으로 한다.
        // 우주계 tier 1 → 지하계 30층, tier 25 → 지하계 54층.
        // 이를 지하계와 동일한 적 스케일링 tier(getChaosRealmTier)로 환산해 적용한다.
        const equivFloor = this.getCosmosEquivalentUnderworldFloor(node); // 30 + (표시 tier - 1)
        const baseCombatTier = (typeof this.deps.getChaosRealmTier === 'function')
            ? this.deps.getChaosRealmTier(equivFloor)
            : (30 + Math.floor((equivFloor - 1) * 0.85) + Math.floor(Math.max(0, equivFloor - 10) * 0.18));
        const generalEase = Math.floor(this.progress.getCosmosMasteryValue('challengeEase') / 4)
            + Math.floor(this.progress.getCosmosMasteryValue('routeInsight') / 7);
        const routeEase = node && node.kind === 'planet'
            ? Math.floor(this.progress.getCosmosMasteryValue('planetRelief') / 10)
            : Math.floor(this.progress.getCosmosMasteryValue('voidSurvey') / 8);
        const riskTier = Math.floor(this.progress.getCosmosMasteryValue('highRisk') / 4);
        const tierAdjustment = Math.max(-8, Math.min(6, riskTier - generalEase - routeEase));
        const cosmosLoopBonus = Math.max(0, Math.floor((this.deps.game && this.deps.game.cosmosLoopCount) || 0)) * 2;
        return Math.max(1, baseCombatTier + tierAdjustment + cosmosLoopBonus);
    }

    getCosmosNodeMechanic(node) {
        if (!node || typeof this.deps.resolveCosmosMechanic !== 'function') return null;
        const environment = Array.isArray(this.deps.COSMOS_GALAXY_ENVIRONMENT_DB)
            ? this.deps.COSMOS_GALAXY_ENVIRONMENT_DB.find(row => row && row.galaxy === node.orbit) : null;
        const boss = typeof this.deps.getCosmosGalaxyBossMechanic === 'function'
            ? this.deps.getCosmosGalaxyBossMechanic(node.id) : null;
        if (boss) return this.cosmosBossMechanic(boss, environment);
        const mechanic = this.deps.resolveCosmosMechanic(node.tag, this.graph.hashSeed(node.id));
        if (!mechanic || !environment) return mechanic;
        return {
            ...mechanic,
            name: `${environment.name}, ${mechanic.name}`,
            summary: `${environment.summary} ${mechanic.summary}`,
            counter: `${environment.counter} ${mechanic.counter}`
        };
    }

    cosmosBossMechanic(boss, environment) {
            const element = boss.elementRule === 'physical' ? 'phys'
                : (boss.elementRule === 'chaos' ? 'chaos' : 'weakest');
            return {
                ...boss, element,
                summary: environment ? `${environment.summary} ${boss.summary}` : boss.summary,
                counter: environment ? `${environment.counter} ${boss.counter}` : boss.counter
            };
    }

    createCosmosEstimateZone(node, mechanic) {
        const directive = this.directives.getSelectedCosmosDirective(node);
        return {
            id: 'cosmos_challenge',
            name: this.deps._t('우주계 {name}', { name: node.name }),
            type: 'cosmos',
            tier: this.getCosmosChallengeTier(node),
            lootTier: this.getDisplayedNodeTier(node),
            ele: mechanic && ['phys', 'fire', 'cold', 'light', 'chaos'].includes(mechanic.element)
                ? mechanic.element : 'chaos',
            cosmosNodeId: node.id,
            cosmosGalaxy: node.orbit,
            cosmosTag: node.baseTag || node.tag || '',
            cosmosMechanicId: mechanic ? mechanic.id : '',
            gravity: Math.max(1, Number(node.gravity || 1)),
            sizeClass: Math.max(1, Math.floor(node.sizeClass || 1)),
            cosmosDirective: this.directives.createCosmosDirectiveSnapshot(directive),
            cosmosHabitat: this.deps.cosmosRouteRuntime.habitat(this.deps.game, node.id)
        };
    }

    getCosmosReadinessStats(node) {
        const stats = typeof this.deps.getPlayerStats === 'function' ? this.deps.getPlayerStats() : {};
        const currentZone = typeof this.deps.getZone === 'function' ? this.deps.getZone(this.deps.game && this.deps.game.currentZoneId) : null;
        const masteryAlreadyActive = currentZone && currentZone.type === 'cosmos';
        const { damageBonus, bossBonus, guardMul } = this.cosmosReadinessBonuses(node, masteryAlreadyActive);
        const totalDps = Math.max(0, Number(stats.totalDps)
            || (Number(stats.dps) || 0) + (Number(stats.summonDps) || 0));
        return {
            ...stats,
            totalDps: totalDps * damageBonus * bossBonus,
            genericTakenDamageMultiplier: Math.max(0.01, Number(stats.genericTakenDamageMultiplier) || 1) * guardMul
        };
    }

    getCosmosNodeRecommendation(nodeOrId) {
        this.graph.buildCosmosAtlasData();
        const node = typeof nodeOrId === 'string' ? this.graph.byId.get(nodeOrId) : nodeOrId;
        if (!node || typeof this.deps.calculateCosmosDifficultyTarget !== 'function') return null;
        const mechanic = this.getCosmosNodeMechanic(node);
        const directive = this.directives.getSelectedCosmosDirective(node);
        const estimateZone = this.createCosmosEstimateZone(node, mechanic);
        const actualEstimate = typeof this.deps.estimateMapZonePowerRequirements === 'function'
            ? this.deps.estimateMapZonePowerRequirements(estimateZone) : null;
        const target = actualEstimate || this.deps.calculateCosmosDifficultyTarget({
            combatTier: this.getCosmosChallengeTier(node),
            sizeClass: node.sizeClass,
            gravity: node.gravity,
            isGalaxyBoss: node.tag === 'boss',
            element: mechanic ? mechanic.element : 'chaos',
            directive
        });
        if (mechanic && mechanic.element === 'weakest') target.element = 'weakest';
        const stats = this.getCosmosReadinessStats(node);
        const readiness = typeof this.deps.getMapPowerReadiness === 'function'
            ? this.deps.getMapPowerReadiness(stats, target) : null;
        return { nodeId: node.id, mechanic, directive, target, readiness };
    }

    getCosmosProgressGuide() {
        this.graph.buildCosmosAtlasData();
        const state = this.state.getState();
        const woodsmanCleared = Array.isArray(this.deps.game && this.deps.game.journalEntries)
            && this.deps.game.journalEntries.includes('woodsman');
        if (!woodsmanCleared) return { stage: 'unlock', title: this.deps._t('혼돈 밖의 나무꾼 격파'), detail: this.deps._t('나무꾼을 넘은 뒤 지하계 30층에서 우주계 관문을 찾을 수 있습니다.'), targetId: null };
        if (!this.progress.isCosmosUnlocked()) return { stage: 'unlock', title: this.deps._t('지하계 30층 도달'), detail: this.deps._t('나무꾼 이후 지하계를 내려가 우주계 관문을 여세요.'), targetId: null };
        if (!state.cleared.includes('planet-0')) return { stage: 'entry', title: this.deps._t('시리온 관문 돌파'), detail: this.deps._t('중앙 관문을 클리어하면 첫 은하의 별길이 열립니다.'), targetId: 'planet-0' };
        for (const galaxy of GALAXY_SEQUENCE) {
            const bossId = `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`;
            if (state.bossClears.includes(bossId)) continue;
            return this.cosmosGalaxyGuide(state, galaxy, bossId);
        }
        const capstone = this.progress.getCosmosCapstoneProgress(state);
        if (!capstone.eligibleSeason) {
            return { stage: 'season', title: this.deps._t('루프 31 도달'), detail: this.deps._t('다섯 은하를 정복했습니다. 루프를 이어 최종 관문이 열리는 시점에 도달하세요.'), targetId: null };
        }
        return capstone.canChallenge
            ? { stage: 'capstone', title: this.deps._t('잔향체 아스트라 도전'), detail: this.deps._t('다섯 은하의 준비가 끝났습니다.'), targetId: null }
            : { stage: 'key', title: this.deps._t('표식: 잔향 확보'), detail: this.deps._t('은하 보스를 반복 처치해 아스트라 도전권을 확보하세요.'), targetId: COSMOS_CAPSTONE_BOSS_IDS[0] };
    }

    cosmosGalaxyGuide(state, galaxy, bossId) {
            const clearCount = this.progress.getGalaxyClearCount(state, galaxy);
            const bossReady = clearCount >= GALAXY_BOSS_REQUIRED_CLEARS;
            const candidates = this.graph.nodes.filter(node => node.orbit === galaxy
                && this.progress.getNodeStatus(node, state) === 'available' && (bossReady || node.tag !== 'boss'))
                .sort((a, b) => a.routeOrder - b.routeOrder);
            const target = bossReady ? this.graph.byId.get(bossId) : candidates[0];
            return {
                stage: bossReady ? 'boss' : 'stabilize', galaxy,
                title: bossReady ? this.deps._t('G{galaxy} 은하 보스 격파', { galaxy }) : this.deps._t('G{galaxy} 별길 안정화 {clearCount}/{value}', { galaxy, clearCount, value: GALAXY_BOSS_REQUIRED_CLEARS }),
                detail: bossReady ? '보스를 격파해 우주석과 다음 은하를 여세요.' : '연결된 노드를 클리어하고 성도술 포인트를 얻으세요.',
                targetId: target ? target.id : bossId,
                current: clearCount,
                target: GALAXY_BOSS_REQUIRED_CLEARS
            };
    }

    getCosmosNodeEstimateZone(id) {
        this.graph.buildCosmosAtlasData();
        const node = this.graph.byId.get(id);
        return node ? this.createCosmosEstimateZone(node, this.getCosmosNodeMechanic(node)) : null;
    }

    cosmosReadinessBonuses(node, masteryAlreadyActive) {
        const damageBonus = masteryAlreadyActive ? 1 : 1 + this.progress.getCosmosMasteryValue('resonanceDrive') * 0.006;
        const bossBonus = !masteryAlreadyActive && node && node.tag === 'boss'
            ? 1 + this.progress.getCosmosMasteryValue('starbreaker') * 0.018 : 1;
        const guardMul = masteryAlreadyActive ? 1 : Math.max(0.5, 1 - this.progress.getCosmosMasteryValue('riftGuard') * 0.007);
        return { damageBonus, bossBonus, guardMul };
    }

}
