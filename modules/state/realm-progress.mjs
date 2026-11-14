/** Preserve the existing underworld progress shape at the entry boundary. */
export function underworldEntryProgress(owner) {
    const progress = owner.underworldProgress;
    if (!progress || typeof progress !== 'object') owner.underworldProgress = {highestFloor:1,currentFloor:1};
    return owner.underworldProgress;
}

/** Legacy panel fallbacks; existing saved objects and promised rewards stay intact. */
export function beehivePanelProgress(owner) {
    return owner.beehive || (owner.beehive = { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 });
}

export function colonyPanelProgress(owner) {
    return owner.colony || (owner.colony = {});
}

export function grandBreachPanelProgress(owner) {
    return owner.voidRift || (owner.voidRift = { meter:0, active:false, breachClears:0, grandBreachUnlock:false, activeKills:0, requiredKills:0 });
}

/** state/realm-progress: native owner; state is read from the supplied current-game port. */
export class RealmProgress {
    constructor(deps, data, { difficulty }) {
        this.deps = deps;
        this.data = data;
        this.difficulty = difficulty;
        this.hasCurrentLoopChaos20Clear = this.hasCurrentLoopChaos20Clear.bind(this);
        this.hasCurrentLoopChaosAccess = this.hasCurrentLoopChaosAccess.bind(this);
        this.getHighestUnlockedEndlessChaosDepth = this.getHighestUnlockedEndlessChaosDepth.bind(this);
        this.getLoopDeepChaosFrontierDepth = this.getLoopDeepChaosFrontierDepth.bind(this);
        this.getMeteorSiteUnlockReady = this.getMeteorSiteUnlockReady.bind(this);
        this.getClearedSkyTowerFloor = this.getClearedSkyTowerFloor.bind(this);
    }

    hasCurrentLoopChaos20Clear(source) {
        let state = source || this.deps.game;
        return !!(state && state.loopProgressCurrent && state.loopProgressCurrent.chaos20Cleared)
            || (Array.isArray(state && state.abyssClearedDepths) && state.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
    }

    hasCurrentLoopChaosAccess(source) {
        let state = source || this.deps.game;
        if (this.hasCurrentLoopChaos20Clear(state)) return true;
        if (!state) return false;
        let maxZone = Number.isFinite(state.maxZoneId) ? state.maxZoneId : 0;
        if (maxZone >= this.data.ABYSS_START_ZONE_ID) return true;
        if (Array.isArray(state.abyssClearedDepths) && state.abyssClearedDepths.length > 0) return true;
        let currentDepth = typeof state.currentZoneId !== 'string' ? this.difficulty.getAbyssDepthFromZoneId(state.currentZoneId) : 0;
        return currentDepth >= 1;
    }

    getHighestUnlockedEndlessChaosDepth(source) {
        let state = source || this.deps.game;
        let depths = [];
        if (Array.isArray(state && state.abyssUnlockedDepths)) {
            depths = state.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21);
        }
        let currentDepth = Math.floor((state && state.abyssEndlessDepth) || 0);
        if (currentDepth >= 21) depths.push(currentDepth);
        return depths.length > 0 ? Math.max(...depths) : 0;
    }

    getLoopDeepChaosFrontierDepth(source) {
        let state = source || this.deps.game;
        let best = Math.floor((state && state.loopProgressCurrent && state.loopProgressCurrent.bestAbyssDepth) || 0);
        return Math.max(21, best + 1);
    }

    getMeteorSiteUnlockReady(owner = this.deps.game) {
        return (owner.season || 1) >= this.deps.METEOR_SITE_UNLOCK_LOOP && (owner.maxZoneId || 0) >= this.deps.METEOR_SITE_UNLOCK_ACT;
    }

    getClearedSkyTowerFloor(source) {
        const tower = source && source.skyTower && typeof source.skyTower === 'object' ? source.skyTower : {};
        const cleared = Array.isArray(tower.clearedFloors) ? tower.clearedFloors : [];
        const recorded = cleared.reduce((highest, floor) => Math.max(highest, Math.floor(Number(floor) || 0)), 0);
        return Math.max(recorded, Math.max(0, Math.floor(Number(tower.highestFloor) || 1) - 1));
    }
}
