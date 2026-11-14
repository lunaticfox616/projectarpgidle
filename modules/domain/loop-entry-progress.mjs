/** domain/loop-entry-progress: native owner; state is read from the supplied current-game port. */
export class LoopEntryProgress {
    constructor(deps, data, { progress, difficulty }) {
        this.deps = deps;
        this.data = data;
        this.progress = progress;
        this.difficulty = difficulty;
        this.getSeasonAbyssDepthCap = this.getSeasonAbyssDepthCap.bind(this);
        this.getLoopAbyssRequirementText = this.getLoopAbyssRequirementText.bind(this);
        this.getLoopAbyssRequirementPrompt = this.getLoopAbyssRequirementPrompt.bind(this);
        this.hasCurrentLoopChaosRequirementClear = this.hasCurrentLoopChaosRequirementClear.bind(this);
        this.hasCurrentLoopCosmosRequirementClear = this.hasCurrentLoopCosmosRequirementClear.bind(this);
        this.hasCurrentLoopAbyssRequirementClear = this.hasCurrentLoopAbyssRequirementClear.bind(this);
        this.getAvailableLoopAdvancePaths = this.getAvailableLoopAdvancePaths.bind(this);
        this.markLoopCosmosPlanetClear = this.markLoopCosmosPlanetClear.bind(this);
        this.getSeasonFinalZoneId = this.getSeasonFinalZoneId.bind(this);
        this.getCurrentSeasonFinalZoneId = this.getCurrentSeasonFinalZoneId.bind(this);
        this.getVisibleHuntingMapCapZoneId = this.getVisibleHuntingMapCapZoneId.bind(this);
        this.applySeasonContentProgression = this.applySeasonContentProgression.bind(this);
        this.loopGateDepthName = this.loopGateDepthName.bind(this);
        this.hasLoopGateCosmosPath = this.hasLoopGateCosmosPath.bind(this);
    }

    getSeasonAbyssDepthCap(seasonValue) {
        let season = Math.max(1, Math.floor(seasonValue || 1));
        if (season > 30) return this.deps.LOOP_GATE_ABYSS_DEPTH_CAP + (season - 30);
        let uncapped = season <= 9 ? (10 + (season - 1)) : (20 + (season - 10));
        return Math.min(this.deps.LOOP_GATE_ABYSS_DEPTH_CAP, uncapped);
    }

    getLoopAbyssRequirementText(seasonValue) {
        let depth = this.loopGateDepthName(this.getSeasonAbyssDepthCap(seasonValue));
        if (!this.hasLoopGateCosmosPath(seasonValue)) return `루프 조건: ${depth} 클리어`;
        return `루프 조건(이번 루프 안): ${depth} 클리어는 혼돈 루프, 우주계 ${this.deps.LOOP_GATE_ALT_COSMOS_PLANET_NAME} 행성 돌파는 우주계 루프`;
    }

    getLoopAbyssRequirementPrompt(seasonValue) {
        const cap = this.getSeasonAbyssDepthCap(seasonValue);
        const depth = `${this.deps._t(cap > 20 ? '혼돈 심화' : '혼돈')} ${cap}`;
        return this.hasLoopGateCosmosPath(seasonValue)
            ? this.deps._t('이번 루프에 {depth} 클리어나 우주계 {planet} 행성 돌파가 먼저 필요합니다.', { depth, planet: this.deps._t(this.deps.LOOP_GATE_ALT_COSMOS_PLANET_NAME) })
            : this.deps._t('이번 루프에 {depth} 클리어가 먼저 필요합니다.', { depth });
    }

    hasCurrentLoopChaosRequirementClear(seasonValue) {
        let season = Math.max(1, Math.floor(seasonValue || (this.deps.game && this.deps.game.season) || 1));
        let cap = this.getSeasonAbyssDepthCap(season);
        let progress = (this.deps.game && this.deps.game.loopProgressCurrent) || {};
        // Ordinary chaos clears reset each loop; the early target is 10–18, not 20.
        if (cap < 20) return (this.deps.game.abyssClearedDepths || []).some(depth => depth >= cap);
        return cap === 20
            ? this.progress.hasCurrentLoopChaos20Clear()
            : Math.max(0, Math.floor(progress.bestAbyssDepth || 0)) >= cap;
    }

    hasCurrentLoopCosmosRequirementClear(seasonValue) {
        let season = Math.max(1, Math.floor(seasonValue || (this.deps.game && this.deps.game.season) || 1));
        if (season < this.deps.LOOP_GATE_ALT_START_SEASON) return false;
        let progress = (this.deps.game && this.deps.game.loopProgressCurrent) || {};
        return Array.isArray(progress.cosmosPlanets) && progress.cosmosPlanets.includes(this.deps.LOOP_GATE_ALT_COSMOS_PLANET_ID);
    }

    hasCurrentLoopAbyssRequirementClear(seasonValue) {
        return this.hasCurrentLoopChaosRequirementClear(seasonValue) || this.hasCurrentLoopCosmosRequirementClear(seasonValue);
    }

    getAvailableLoopAdvancePaths(seasonValue) {
        let paths = [];
        if (this.hasCurrentLoopChaosRequirementClear(seasonValue)) paths.push('chaos');
        if (this.hasCurrentLoopCosmosRequirementClear(seasonValue)) paths.push('cosmos');
        return paths;
    }

    markLoopCosmosPlanetClear(nodeId) {
        if (!nodeId || !this.deps.game || (this.deps.game.season || 1) < this.deps.LOOP_GATE_ALT_START_SEASON) return false;
        this.deps.game.loopProgressCurrent = this.deps.game.loopProgressCurrent || {};
        let planets = Array.isArray(this.deps.game.loopProgressCurrent.cosmosPlanets) ? this.deps.game.loopProgressCurrent.cosmosPlanets : [];
        let fresh = !planets.includes(nodeId);
        if (fresh) planets.push(nodeId);
        this.deps.game.loopProgressCurrent.cosmosPlanets = planets;
        // True once per loop, when this loop's clear of the alternative planet is first recorded.
        return fresh && nodeId === this.deps.LOOP_GATE_ALT_COSMOS_PLANET_ID;
    }

    getSeasonFinalZoneId(seasonValue) {
        return this.data.LAST_STORY_ZONE_ID + this.getSeasonAbyssDepthCap(seasonValue);
    }

    getCurrentSeasonFinalZoneId() {
        return this.getSeasonFinalZoneId(this.deps.game.season || 1);
    }

    getVisibleHuntingMapCapZoneId() {
        return Math.min(this.getCurrentSeasonFinalZoneId(), this.difficulty.getAbyssZoneIdForDepth(20));
    }

    *applySeasonContentProgression(options) {
        const opts = options;
        this.deps.game.unlockedSeasonContents = Array.isArray(this.deps.game.unlockedSeasonContents) ? this.deps.game.unlockedSeasonContents : [];
        this.deps.game.seenSeasonContentNotices = Array.isArray(this.deps.game.seenSeasonContentNotices) ? this.deps.game.seenSeasonContentNotices : [];
        let roadmapMaxLoop = Math.max(...Object.keys(this.deps.SEASON_CONTENT_ROADMAP).map(Number));
        let maxSeason = Math.max(1, Math.min(roadmapMaxLoop, this.deps.game.season || 1));
        for (let s = 1; s <= maxSeason; s++) {
            yield* this.recordSeasonUnlock(s, opts);
        }
        this.clampSeasonZoneProgress();
    }

    loopGateDepthName(cap) { return `${cap > 20 ? '혼돈 심화' : '혼돈'} ${cap}`; }

    hasLoopGateCosmosPath(seasonValue) { return Math.max(1, Math.floor(seasonValue || 1)) >= this.deps.LOOP_GATE_ALT_START_SEASON; }

    *recordSeasonUnlock(s, opts) {
            let key = `season_${s}`;
            if (!this.deps.game.unlockedSeasonContents.includes(key)) this.deps.game.unlockedSeasonContents.push(key);
            if (!opts.silent && !this.deps.game.contentProgression && !this.deps.game.seenSeasonContentNotices.includes(key) && this.deps.SEASON_CONTENT_ROADMAP[s]) {
                let def = this.deps.SEASON_CONTENT_ROADMAP[s];
                (yield { kind: 'addLog', args: [this.deps._t('🧩 루프 {s} [{title}] 이정표 개방', { s, title: this.deps._t(def.title) }), 'season-up'] });
                for (const line of (def.features || []).slice(0, 2)) (yield { kind: 'addLog', args: [`   - ${line}`, 'loot-magic'] });
                this.deps.game.seenSeasonContentNotices.push(key);
            }
    }

    clampSeasonZoneProgress() {
        let finalZone = this.getCurrentSeasonFinalZoneId();
        this.deps.game.maxZoneId = this.deps.clampNumber(Number.isFinite(this.deps.game.maxZoneId) ? this.deps.game.maxZoneId : 0, 0, finalZone);
        if (typeof this.deps.game.currentZoneId !== 'string') {
            let currentZone = Number.isFinite(this.deps.game.currentZoneId) ? this.deps.game.currentZoneId : 0;
            let deepChaosZone = (this.deps.game.season || 1) >= 10 && this.difficulty.getAbyssDepthFromZoneId(currentZone) > 20;
            this.deps.game.currentZoneId = deepChaosZone ? currentZone : this.deps.clampNumber(currentZone, 0, finalZone);
        }
    }
}
