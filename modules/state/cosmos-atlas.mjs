import { COSMOS_LAYOUT_VERSION, COSMOS_MASTERY_NODES, DEFAULT_COSMOS_CAMERA_SCALE } from '../data/cosmos-atlas.mjs';

/** Owns normalization of the existing game.cosmosAtlas save shape. Reads the current game at each call. */
export class CosmosAtlasState {
    constructor(deps) { this.deps = deps;  }

    normalizeCosmosExpeditionState(state) {
        const cycles = state.directiveCycles && typeof state.directiveCycles === 'object'
            && !Array.isArray(state.directiveCycles)
            ? state.directiveCycles : {};
        Object.keys(cycles).forEach(nodeId => {
            cycles[nodeId] = Math.max(0, Math.min(999999, Math.floor(Number(cycles[nodeId]) || 0)));
        });
        const selected = state.selectedDirectives && typeof state.selectedDirectives === 'object'
            && !Array.isArray(state.selectedDirectives)
            ? state.selectedDirectives : {};
        Object.keys(selected).forEach(nodeId => {
            if (typeof selected[nodeId] !== 'string' || !selected[nodeId]) delete selected[nodeId];
        });
        state.directiveCycles = cycles;
        state.selectedDirectives = selected;
    }

    getState() {
        if (!this.deps.game) this.deps.game = {};
        const state = this.deps.game.cosmosAtlas && typeof this.deps.game.cosmosAtlas === 'object'
            ? this.deps.game.cosmosAtlas
            : (this.deps.game.cosmosAtlas = {});
        state.cleared = Array.isArray(state.cleared) ? Array.from(new Set(state.cleared.filter(id => typeof id === 'string'))) : [];
        state.selectedId = state.selectedId || 'planet-0';
        this.normalizeCosmosCamera(state);
        delete state.starDust;
        this.normalizeCosmosBossRecords(state);
        this.normalizeCosmosStones(state);
        state.equippedStoneGalaxy = this.getEquippedCosmosStoneCount(state);
        this.normalizeCosmosExpeditionState(state);
        this.normalizeCosmosMastery(state);
        if (!state.camera) state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
        return state;
    }

    getEquippedCosmosStoneCount(state) {
        const equipped = state && state.equippedStones && typeof state.equippedStones === 'object' ? state.equippedStones : {};
        return Object.keys(equipped).filter(key => !!equipped[key]).length;
    }

    hasSixthCosmosStoneUnlock() {
        return this.deps.getSocketedJewels().some(({ jewel }) => jewel.uniqueId === 'cbj_enifron_faded_stone' || jewel.id === 'cbj_enifron_faded_stone' || jewel.name === '바래진 우주석');
    }

    isCosmosStoneAcquired(state, galaxy) {
        const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
        if (g === 6) return this.hasSixthCosmosStoneUnlock();
        return !!(state && state.bossStones && state.bossStones[String(g)]);
    }

    normalizeCosmosCamera(state) {
        state.camera = state.camera && typeof state.camera === 'object' ? state.camera : null;
        if (state.layoutVersion !== COSMOS_LAYOUT_VERSION) {
            state.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
            state.layoutVersion = COSMOS_LAYOUT_VERSION;
        }
    }


    normalizeCosmosBossRecords(state) {
        state.bossClears = Array.isArray(state.bossClears) ? Array.from(new Set(state.bossClears.filter(id => typeof id === 'string'))) : [];
        state.bossKills = state.bossKills && typeof state.bossKills === 'object' ? state.bossKills : {};
        Object.keys(state.bossKills).forEach(id => { state.bossKills[id] = Math.max(0, Math.floor(Number(state.bossKills[id]) || 0)); });
        state.bossRelics = Array.isArray(state.bossRelics) ? state.bossRelics.filter(relic => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) >= 1 && Math.floor(Number(relic.galaxy) || 0) <= 5) : [];
        state.bossExclusiveMisses = state.bossExclusiveMisses && typeof state.bossExclusiveMisses === 'object' ? state.bossExclusiveMisses : {};
        Object.keys(state.bossExclusiveMisses).forEach(id => { state.bossExclusiveMisses[id] = Math.max(0, Math.min(39, Math.floor(Number(state.bossExclusiveMisses[id]) || 0))); });
    }


    normalizeCosmosStones(state) {
        state.bossStones = state.bossStones && typeof state.bossStones === 'object' ? state.bossStones : {};
        Object.keys(state.bossStones).forEach(g => { if (!/^[1-5]$/.test(g) || !state.bossStones[g]) delete state.bossStones[g]; });
        state.bossStoneOptions = state.bossStoneOptions && typeof state.bossStoneOptions === 'object' ? state.bossStoneOptions : {};
        state.equippedStones = state.equippedStones && typeof state.equippedStones === 'object' ? state.equippedStones : {};
        Object.keys(state.equippedStones).forEach(g => {
            const galaxy = Math.floor(Number(g) || 0);
            if (galaxy < 1 || galaxy > 6 || !state.equippedStones[g] || !this.isCosmosStoneAcquired(state, galaxy)) delete state.equippedStones[g];
        });
    }


    normalizeCosmosMastery(state) {
        state.masteryPointsSpent = Math.max(0, Math.floor(state.masteryPointsSpent || 0));
        state.mastery = state.mastery && typeof state.mastery === 'object' ? state.mastery : {};
        COSMOS_MASTERY_NODES.forEach(node => {
            state.mastery[node.key] = Math.max(0, Math.min(node.max, Math.floor(state.mastery[node.key] || 0)));
        });
    }

}
