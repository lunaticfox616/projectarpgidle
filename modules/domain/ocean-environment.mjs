/** domain/ocean-environment: native owner; state is read from the supplied current-game port. */
export class OceanEnvironment {
    constructor(deps, data, { ocean, difficulty }) {
        this.deps = deps;
        this.data = data;
        this.ocean = ocean;
        this.difficulty = difficulty;
        this.canEnterOceanDepth = this.canEnterOceanDepth.bind(this);
        this.getOceanOxygenSavingPct = this.getOceanOxygenSavingPct.bind(this);
        this.getOceanPressureResistUpgradePct = this.getOceanPressureResistUpgradePct.bind(this);
        this.getOceanOxygenDrainPerSec = this.getOceanOxygenDrainPerSec.bind(this);
        this.getOceanOxygenPerAttackCost = this.getOceanOxygenPerAttackCost.bind(this);
        this.getOceanDepthTier = this.getOceanDepthTier.bind(this);
        this.getOceanBossBoundaryInterval = this.getOceanBossBoundaryInterval.bind(this);
        this.getOceanPendingBossBoundary = this.getOceanPendingBossBoundary.bind(this);
        this.getOceanDiveRecord = this.getOceanDiveRecord.bind(this);
        this.getOceanFishingGaugeGainMul = this.getOceanFishingGaugeGainMul.bind(this);
    }

    canEnterOceanDepth() {
        return !!this.ocean.ensureOceanState().unlocked;
    }

    getOceanOxygenSavingPct(owner = this.deps.game) {
        return Math.max(0, Math.min(60, this.ocean.getOceanPermanentUpgradeEffect('oxygenSaving', owner)));
    }

    getOceanPressureResistUpgradePct(owner = this.deps.game) {
        return Math.max(0, Math.min(80, this.ocean.getOceanPermanentUpgradeEffect('pressureResist', owner)));
    }

    getOceanOxygenDrainPerSec(owner = this.deps.game) {
        // 산소 소모는 시간 기반입니다. 이동 속도는 더 이상 산소 소모를 늘리지 않습니다
        // (이속이 높을수록 도달 수심이 오히려 줄어들던 역설을 제거).
        let base = 0.5 * (1 - this.getOceanOxygenSavingPct(owner) / 100);
        // 수압 과부하: 깊이 내려갈수록 산소 소모가 가속됩니다(최대 +100%). 수압 저항 영구 업그레이드로 완화됩니다.
        let depthTier = this.getOceanDepthTier((owner && owner.ocean && owner.ocean.depthM) || 0);
        let pressureResistPct = Math.max(0, Math.min(80, this.getOceanPressureResistUpgradePct(owner)));
        let pressureDrainMul = 1 + Math.min(1.0, depthTier * 0.07) * (1 - pressureResistPct / 100);
        if (this.difficulty.getOceanCurrentAffixes(depthTier).some(current => current.id === 'still_water')) pressureDrainMul *= 1.35;
        return Math.max(0.1, base * pressureDrainMul);
    }

    getOceanOxygenPerAttackCost() {
        // 산소는 잠수 시간으로만 소모한다. 타격당 비용은 공속 10 빌드를 같은 DPS의
        // 느린 빌드보다 열 배 불리하게 만들어 심해 진행 자체를 막았으므로 폐지했다.
        return 0;
    }

    getOceanDepthTier(depthM) {
        return Math.floor(Math.max(0, Math.floor(depthM || 0)) / 100);
    }

    getOceanBossBoundaryInterval() {
        // 심해 가디언(보스)이 등장하는 수심 간격(m).
        return 500;
    }

    getOceanPendingBossBoundary(st) {
        // 다음 보스 경계에 도달했고 아직 처치하지 않았다면 그 경계 수심을 반환한다(없으면 0).
        if (!st) return 0;
        let interval = this.getOceanBossBoundaryInterval();
        let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
        let nextBoundary = Math.floor(cleared / interval) * interval + interval;
        return (Math.floor(Math.max(0, Number(st.depthM) || 0)) >= nextBoundary) ? nextBoundary : 0;
    }

    getOceanDiveRecord(st) {
        const caught = Object.values(st.fishCaughtTotal || {}).reduce((sum, count) => sum + Math.max(0, Math.floor(Number(count) || 0)), 0);
        return Math.max(0, Math.floor(st.checkpointM || 0)) + Math.max(0, Math.floor(st.bossClearM || 0)) + caught;
    }

    getOceanFishingGaugeGainMul(owner = this.deps.game) {
        let st = this.ocean.ensureOceanState(owner);
        return 1 + Math.max(0, Math.min(10, st.reefInstalled || 0)) * 0.15;
    }
}
