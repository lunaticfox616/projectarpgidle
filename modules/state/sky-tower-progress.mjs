/** state/sky-tower-progress: native owner; state is read from the supplied current-game port. */
export class SkyTowerProgressState {
    constructor(deps, data, { progress }) {
        this.deps = deps;
        this.data = data;
        this.progress = progress;
        this.createDefaultSkyTowerState = this.createDefaultSkyTowerState.bind(this);
        this.ensureSkyTowerState = this.ensureSkyTowerState.bind(this);
        this.normalizeSkyTowerGemBoosts = this.normalizeSkyTowerGemBoosts.bind(this);
        this.getSkyTowerLoopClearLimit = this.getSkyTowerLoopClearLimit.bind(this);
        this.normalizeSkyTowerResult = this.normalizeSkyTowerResult.bind(this);
        this.getSkyStoneMaxLevel = this.getSkyStoneMaxLevel.bind(this);
        this.getSkyTowerGemBoostMaxLevel = this.getSkyTowerGemBoostMaxLevel.bind(this);
    }

    createDefaultSkyTowerState() {
        return {
            unlocked: false,
            highestFloor: 1,
            currentFloor: 1,
            clearedThisLoop: 0,
            clearedFloors: [],
            loopSeason: 1,
            lastResult: null,
            condensedPower: 0,
            skyStone: { crafted: false, level: 0 },
            gemBoosts: {}
        };
    }

    ensureSkyTowerState(owner = this.deps.game) {
        let st = (owner && owner.skyTower && typeof owner.skyTower === 'object') ? owner.skyTower : (owner.skyTower = this.createDefaultSkyTowerState());
        let currentSeason = Math.max(1, Math.floor((owner && owner.season) || 1));
        st.unlocked = !!st.unlocked;
        this.normalizeFloorProgress(st, currentSeason);
        this.normalizeSkyStone(st);
        this.normalizeSkyTowerGemBoosts(st);
        if (!st.unlocked && this.skyUnlockReached(owner, currentSeason)) st.unlocked = true;
        return st;
    }

    skyUnlockReached(owner, currentSeason) {
        return currentSeason > 15 || (currentSeason >= 15 && this.progress.hasCurrentLoopChaos20Clear(owner));
    }

    normalizeSkyTowerGemBoosts(st) {
        st.gemBoosts = (st.gemBoosts && typeof st.gemBoosts === 'object') ? st.gemBoosts : {};
        Object.keys(st.gemBoosts).forEach(name => {
            let lv = Math.max(0, Math.min(this.getSkyTowerGemBoostMaxLevel(), Math.floor(st.gemBoosts[name] || 0)));
            if (lv > 0) st.gemBoosts[name] = lv;
            else delete st.gemBoosts[name];
        });
    }

    getSkyTowerLoopClearLimit() { return 25; }

    normalizeSkyTowerResult(result, season) {
        if (!result || result.season !== season || !Number.isSafeInteger(result.floor) || result.floor < 1
            || !Number.isSafeInteger(result.condensedPower) || result.condensedPower < 0
            || !['first', 'repeat', 'practice'].includes(result.kind)) return null;
        return { season, floor: result.floor, kind: result.kind, condensedPower: result.condensedPower };
    }

    getSkyStoneMaxLevel() { return 15; }

    getSkyTowerGemBoostMaxLevel() { return 3; }

    normalizeFloorProgress(st, currentSeason) {
        st.highestFloor = Math.max(1, Math.floor(st.highestFloor || 1));
        st.currentFloor = Math.max(1, Math.min(st.highestFloor, Math.floor(st.currentFloor || 1)));
        st.loopSeason = Math.max(1, Math.floor(st.loopSeason || currentSeason));
        if (st.loopSeason !== currentSeason) {
            st.loopSeason = currentSeason;
            st.clearedThisLoop = 0;
        }
        st.lastResult = this.normalizeSkyTowerResult(st.lastResult, currentSeason);
        st.clearedThisLoop = Math.max(0, Math.min(this.getSkyTowerLoopClearLimit(), Math.floor(st.clearedThisLoop || 0)));
        st.clearedFloors = Array.isArray(st.clearedFloors) ? Array.from(new Set(st.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
        st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0));
    }

    normalizeSkyStone(st) {
        st.skyStone = (st.skyStone && typeof st.skyStone === 'object') ? st.skyStone : { crafted: false, level: 0 };
        st.skyStone.level = Math.max(0, Math.min(this.getSkyStoneMaxLevel(), Math.floor(st.skyStone.level || 0)));
        st.skyStone.crafted = !!st.skyStone.crafted || st.skyStone.level > 0;
    }
}
