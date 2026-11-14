import { COSMOS_CAPSTONE_BOSS_IDS, COSMOS_MASTERY_NODES, COSMOS_MASTERY_LINKS, GALAXY_BOSS_REQUIRED_CLEARS, GALAXY_BOSS_PLANET_INDEX } from '../data/cosmos-atlas.mjs';
import { COSMOS_PLANETS } from '../data/cosmos-atlas-planets.mjs';

/** Native atlas progress; no DOM or renderer dependency. */
export class CosmosAtlasProgress {
    constructor(deps, services) { this.deps = deps; this.state = services.state; this.graph = services.graph; }

    getSkyPowerBalance() {
        if (!this.deps.game.currencies || typeof this.deps.game.currencies !== 'object') this.deps.game.currencies = {};
        return Math.max(0, Math.floor(Number(this.deps.game.currencies.skyEssence) || 0));
    }

    grantCosmosSkyPower(rewardPoints) {
        const gain = Math.max(1, Math.round(Math.max(0, Number(rewardPoints) || 0) / this.deps.COSMOS_SKY_POWER_PER_REWARD));
        const balance = this.getSkyPowerBalance();
        this.deps.game.currencies.skyEssence = balance + gain;
        return gain;
    }

    getCosmosCapstoneProgress(stateOverride) {
        const state = stateOverride && typeof stateOverride === 'object' ? stateOverride : this.state.getState();
        const clearedSet = new Set(Array.isArray(state.bossClears) ? state.bossClears : []);
        const bosses = COSMOS_CAPSTONE_BOSS_IDS.map((id, index) => {
            const planetIndex = Math.max(0, Math.floor(Number(String(id).replace('planet-', ''))) || 0);
            const def = COSMOS_PLANETS[planetIndex] || {};
            return {
                id,
                galaxy: index + 1,
                name: def.name || id,
                cleared: clearedSet.has(id)
            };
        });
        const clearedCount = bosses.filter(row => row.cleared).length;
        const keyCount = this.getCosmosSovereignKeys();
        const season = Math.max(1, Math.floor(Number(this.deps.game && this.deps.game.season) || 1));
        return {
            bosses,
            clearedCount,
            total: bosses.length,
            missing: bosses.filter(row => !row.cleared),
            ready: clearedCount === bosses.length,
            eligibleSeason: season >= 31,
            keyCount,
            canChallenge: season >= 31 && clearedCount === bosses.length && keyCount > 0
        };
    }

    getCosmosSovereignKeys() {
        const owner = this.deps.game;
        return Math.max(0, Math.floor(Number(owner && owner.currencies && owner.currencies.cosmosSovereignKey) || 0));
    }

    getCosmosMasteryValue(key) {
        const state = this.state.getState();
        return Math.max(0, Math.floor((state.mastery || {})[key] || 0));
    }

    getCosmosMasteryTotalPoints() {
        const state = this.state.getState();
        return this.graph.nodes.reduce((sum, node) => sum + (state.cleared.includes(node.id) ? 1 : 0), 0);
    }

    getCosmosMasteryFreePoints() {
        const state = this.state.getState();
        const spent = COSMOS_MASTERY_NODES.reduce((sum, node) => sum + state.mastery[node.key] * node.cost, 0);
        state.masteryPointsSpent = spent;
        return Math.max(0, this.getCosmosMasteryTotalPoints() - spent);
    }

    *allocateCosmosMastery(nodeKey) {
        const state = this.state.getState();
        const node = COSMOS_MASTERY_NODES.find(n => n.key === nodeKey);
        if (!node) return;
        const reqFail = this.getCosmosMasteryLockReason(node.key);
        if (reqFail) return this.deps.canLog && (yield { kind: 'addLog', args: [reqFail, 'attack-monster'] });
        const current = this.getCosmosMasteryValue(node.key);
        if (current >= node.max) return this.deps.canLog && (yield { kind: 'addLog', args: ['해당 성도술 노드는 이미 최대 단계입니다.', 'attack-monster'] });
        if (this.getCosmosMasteryFreePoints() < node.cost) return this.deps.canLog && (yield { kind: 'addLog', args: [this.deps._t('성도술 포인트가 부족합니다. (필요: {cost})', { cost: node.cost }), 'attack-monster'] });
        state.mastery[node.key] = current + 1;
        state.masteryPointsSpent += node.cost;
        if (this.deps.canLog) (yield { kind: 'addLog', args: [this.deps._t('✨ 성도술 강화: {name} {value}/{max}', { name: node.name, value: current + 1, max: node.max }), 'season-up'] });
        (yield { kind: 'renderCosmosAtlas', args: [] });
    }

    getCosmosMasteryLockReason(nodeKey) {
        const node = COSMOS_MASTERY_NODES.find(n => n.key === nodeKey);
        if (!node) return null;
        const reqs = COSMOS_MASTERY_LINKS[node.key] || [];
        for (let i = 0; i < reqs.length; i++) {
            const [reqKey, reqLvRaw] = String(reqs[i]).split(':');
            const reqLv = Math.max(1, Math.floor(Number(reqLvRaw || 1)));
            if (this.getCosmosMasteryValue(reqKey) < reqLv) {
                const reqNode = COSMOS_MASTERY_NODES.find(n => n.key === reqKey);
                return this.deps._t('선행 노드 필요: {reqNode} {reqLv}레벨', { reqNode: (reqNode && reqNode.name) || reqKey, reqLv });
            }
        }
        return null;
    }

    isCosmosUnlocked() {
        if (!this.deps.game) return false;
        return this.deps.isMapPrimaryContentUnlocked(this.deps.game, 'map-tab-cosmos')
            || this.deps.isCosmosContentUnlockReady(this.deps.game);
    }

    getNodeStatus(node, state = this.state.getState()) {
        if (!this.isCosmosUnlocked()) return 'locked';
        if (state.cleared.includes(node.id)) return 'cleared';
        if (node.id === 'planet-0') return 'available';
        if (this.isCosmosRouteDestination(node)) return 'available';
        if (!this.isCosmosPreviousGalaxyCleared(node, state)) return 'locked';
        if (node.tag === 'boss') {
            const galaxyClears = this.graph.nodes.filter(row => row.orbit === node.orbit
                && row.id !== node.id && state.cleared.includes(row.id)).length;
            if (galaxyClears < GALAXY_BOSS_REQUIRED_CLEARS) return 'locked';
            return 'available';
        }
        const neighbors = this.graph.getNeighbors(node.id);
        return neighbors.some(id => state.cleared.includes(id)) ? 'available' : 'locked';
    }

    isCosmosPreviousGalaxyCleared(node, state) {
        if (node.orbit <= 1) return true;
        return state.bossClears.includes(`planet-${GALAXY_BOSS_PLANET_INDEX[node.orbit - 1]}`);
    }

    isCosmosRouteDestination(node) {
        const intermediate = this.deps.game.cosmosRoute?.version >= 3 ? node.id !== this.deps.game.cosmosRoute.plan.at(-1).at(-1) : node.tag !== 'boss';
        return intermediate && this.deps.cosmosRouteRuntime.current(this.deps.game) === node.id;
    }

    getCosmosBossTier(node) {
        if (!node || node.tag !== 'boss') return null;
        const g = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
        // 은하 보스는 해당 은하 밴드의 최고 티어 (G1→5, G2→10, G3→15, G4→20, G5→25)
        return Math.min(25, g * 5);
    }

    getBossStage(node) {
        if (!node || node.tag !== 'boss') return null;
        const state = this.state.getState();
        const clears = Math.max(0, Math.floor((state.bossKills && state.bossKills[node.id]) || 0));
        if (clears >= 3) return 3;
        if (clears >= 1) return 2;
        return 1;
    }

    getGalaxyClearCount(state, galaxy) {
        return this.graph.nodes.filter(node => node.orbit === galaxy && node.tag !== 'boss'
            && state.cleared.includes(node.id)).length;
    }

    getCosmosBossPityProgress(node) {
        if (!node || node.tag !== 'boss') return null;
        const misses = Math.max(0, Math.min(39, Math.floor((this.state.getState().bossExclusiveMisses || {})[node.id] || 0)));
        return { misses, guaranteeAt: 40, remaining: Math.max(1, 40 - misses) };
    }
}
