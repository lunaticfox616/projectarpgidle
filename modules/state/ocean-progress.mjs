/** state/ocean-progress: native owner; state is read from the supplied current-game port. */
export class OceanProgressState {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.normalizedFishingStates = new WeakSet();
        this.createDefaultOceanState = this.createDefaultOceanState.bind(this);
        this.getOceanPermanentUpgradeLevel = this.getOceanPermanentUpgradeLevel.bind(this);
        this.getOceanPermanentUpgradeEffect = this.getOceanPermanentUpgradeEffect.bind(this);
        this.ensureOceanPermanentUpgrades = this.ensureOceanPermanentUpgrades.bind(this);
        this.mergeOceanState = this.mergeOceanState.bind(this);
        this.ensureOceanState = this.ensureOceanState.bind(this);
        this.normalizeOceanDiveRecord = this.normalizeOceanDiveRecord.bind(this);
        this.getOceanOxygenMax = this.getOceanOxygenMax.bind(this);
        this.normalizeOceanFishingProgress = this.normalizeOceanFishingProgress.bind(this);
    }

    createDefaultOceanState() {
        return {
            unlocked: false,
            depthM: 0,
            checkpointM: 0,
            oxygenMax: 100,
            oxygenCur: 100,
            pressureLevel: 0,
            fishingGauge: 0,
            fishingStrategy: 'balanced',
            rareFishPity: 0,
            reefInstalled: 0,
            fishStock: {},
            fishCaughtTotal: {},
            claimedCollectionMilestones: [],
            lastCatch: null,
            diving: false,
            lastTickAt: 0,
            bossClearM: 0,
            // 쓰러뜨린 몬스터가 쌓았지만 아직 내려가지 않은 거리(m, js/passives.js tickOceanDepth)
            descentPendingM: 0,
            // 자동 재잠수(js/combat-kill-rewards.js autoRediveOceanAfterClear): 마지막으로 떠오른 까닭('oxygen' | 'guardian' | 'defeat' | 'manual' | ''),
            // 잠수를 시작할 때의 소득 기록(getOceanDiveRecord), 소득 없이 떠오른 잠수가 이어진 수. 떠오르면 돌아갈 사냥터(잠수를
            // 시작한 액트나 혼돈 구역 id, 없으면 null)와 이 잠수가 자동 재잠수로 들어왔는지
            lastSurfaceReason: '',
            diveStartProgress: 0,
            fruitlessDives: 0,
            returnZoneId: null,
            autoDive: false,
            permanentUpgrades: { oxygenMax: 0, oxygenSaving: 0, pressureResist: 0 }
        };
    }

    getOceanPermanentUpgradeLevel(key, owner = this.deps.game) {
        let upgrades = (owner && owner.ocean && owner.ocean.permanentUpgrades && typeof owner.ocean.permanentUpgrades === 'object') ? owner.ocean.permanentUpgrades : {};
        let def = this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key];
        if (!def) return 0;
        return Math.max(0, Math.min(def.maxLevel, Math.floor(upgrades[key] || 0)));
    }

    getOceanPermanentUpgradeEffect(key, owner = this.deps.game) {
        let def = this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key];
        if (!def) return 0;
        return this.getOceanPermanentUpgradeLevel(key, owner) * def.valuePerLevel;
    }

    ensureOceanPermanentUpgrades(st) {
        st.permanentUpgrades = (st.permanentUpgrades && typeof st.permanentUpgrades === 'object') ? st.permanentUpgrades : {};
        this.data.OCEAN_PERMANENT_UPGRADE_KEYS.forEach(key => {
            st.permanentUpgrades[key] = Math.max(0, Math.min(this.data.OCEAN_PERMANENT_UPGRADE_DEFS[key].maxLevel, Math.floor(st.permanentUpgrades[key] || 0)));
        });
    }

    mergeOceanState(savedOcean) {
        let source = savedOcean && typeof savedOcean === 'object' && !Array.isArray(savedOcean) ? savedOcean : {};
        let merged = { ...this.createDefaultOceanState(), ...source };
        merged.permanentUpgrades = { ...this.createDefaultOceanState().permanentUpgrades, ...(source.permanentUpgrades || {}) };
        this.ensureOceanPermanentUpgrades(merged);
        if (!Object.prototype.hasOwnProperty.call(source, 'fishCaughtTotal')) merged.fishCaughtTotal = null;
        this.normalizeOceanFishingProgress(merged);
        return merged;
    }

    ensureOceanState(owner = this.deps.game) {
        // The owning game must exist; only its saved ocean state may be absent.
        let st = (owner.ocean && typeof owner.ocean === 'object') ? owner.ocean : (owner.ocean = this.createDefaultOceanState());
        st.unlocked = !!st.unlocked;
        this.normalizeDiveVitals(st, owner);
        this.normalizeFishingRuntime(st);
        st.diving = !!st.diving;
        st.drowning = !!st.drowning;
        st.drownSec = Math.max(0, Number(st.drownSec) || 0);
        this.normalizeOceanDiveRecord(st);
        if (!st.unlocked && (owner.season || 1) >= this.deps.OCEAN_UNLOCK_LOOP) st.unlocked = true;
        return st;
    }

    normalizeOceanDiveRecord(st) {
        const pending = Number(st.descentPendingM);
        st.descentPendingM = st.diving && Number.isFinite(pending) ? Math.max(0, pending) : 0;
        st.lastSurfaceReason = ['oxygen', 'guardian', 'defeat', 'manual'].includes(st.lastSurfaceReason) ? st.lastSurfaceReason : '';
        st.diveStartProgress = Math.max(0, Math.floor(Number(st.diveStartProgress) || 0));
        st.fruitlessDives = Math.max(0, Math.min(this.deps.OCEAN_AUTO_REDIVE.missLimit, Math.floor(Number(st.fruitlessDives) || 0)));
        const back = st.returnZoneId;
        st.returnZoneId = Number.isInteger(back) || (typeof back === 'string' && back !== '') ? back : null;
        st.autoDive = st.autoDive === true;
    }

    getOceanOxygenMax(owner = this.deps.game) {
        // 산소 최대치는 영구 심해 업그레이드로만 증가합니다.
        return 100 + this.getOceanPermanentUpgradeEffect('oxygenMax', owner);
    }

    normalizeOceanFishingProgress(st) {
        st.fishStock = (st.fishStock && typeof st.fishStock === 'object' && !Array.isArray(st.fishStock)) ? st.fishStock : {};
        let hasCaughtHistory = !!(st.fishCaughtTotal && typeof st.fishCaughtTotal === 'object' && !Array.isArray(st.fishCaughtTotal));
        let caught = hasCaughtHistory ? st.fishCaughtTotal : st.fishStock;
        if (!hasCaughtHistory) st.fishCaughtTotal = {};
        this.data.OCEAN_STATE_FISH_KEYS.forEach(key => {
            let stock = Math.max(0, Math.floor(Number(st.fishStock[key]) || 0));
            let total = Math.max(0, Math.floor(Number(caught[key]) || 0));
            st.fishStock[key] = stock;
            st.fishCaughtTotal[key] = Math.max(stock, total);
        });
        this.normalizeCollectionClaims(st);
        this.normalizeLastCatch(st);
        this.normalizedFishingStates.add(st);
    }

    normalizeLastCatch(st) {
        if (!st.lastCatch || !this.deps.OCEAN_FISH_DB[st.lastCatch.key]) st.lastCatch = null;
        else {
            st.lastCatch.at = Math.max(0, Math.floor(st.lastCatch.at || 0));
            st.lastCatch.guaranteed = !!st.lastCatch.guaranteed;
        }
    }

    normalizeFishingRuntime(st) {
        st.fishingGauge = Math.max(0, Math.min(100, Number(st.fishingGauge) || 0));
        st.fishingStrategy = this.deps.OCEAN_FISHING_STRATEGIES[st.fishingStrategy] ? st.fishingStrategy : 'balanced';
        st.rareFishPity = Math.max(0, Math.min(100, Number(st.rareFishPity) || 0));
        st.reefInstalled = Math.max(0, Math.min(10, Math.floor(st.reefInstalled || 0)));
        if (!this.normalizedFishingStates.has(st)) this.normalizeOceanFishingProgress(st);
    }

    normalizeDiveVitals(st, owner) {
        // 수심은 짧은 프레임 간격에도 누적되어야 한다. 여기서 매번 정수로 내리면
        // 0.1~0.3m씩 들어오는 시간 기반 진행이 전부 사라지고 전투 종료 보너스만 보인다.
        st.depthM = Math.max(0, Number(st.depthM) || 0);
        st.checkpointM = Math.max(0, Math.floor(st.checkpointM || 0));
        st.bossClearM = Math.max(0, Math.floor(st.bossClearM || 0));
        this.ensureOceanPermanentUpgrades(st);
        st.oxygenMax = Math.max(1, Math.floor(this.getOceanOxygenMax(owner)));
        st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, Number.isFinite(st.oxygenCur) ? st.oxygenCur : st.oxygenMax));
        st.pressureLevel = Math.max(0, Math.floor(st.pressureLevel || 0));
    }

    normalizeCollectionClaims(st) {
        let claims = st.claimedCollectionMilestones;
        let validClaims = Array.isArray(claims) && claims.every((value, index) => Number.isInteger(value)
            && this.data.OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value) && claims.indexOf(value) === index);
        if (!validClaims) {
            let sourceClaims = Array.isArray(claims) ? claims : [];
            st.claimedCollectionMilestones = Array.from(new Set(sourceClaims.map(value => Math.floor(value || 0))))
                .filter(value => this.data.OCEAN_COLLECTION_REQUIRED_COUNTS.includes(value));
        }
    }
}
