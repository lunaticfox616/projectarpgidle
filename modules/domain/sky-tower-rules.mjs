/** domain/sky-tower-rules: native owner; state is read from the supplied current-game port. */
export class SkyTowerRules {
    constructor(deps, data, { sky, progress }) {
        this.deps = deps;
        this.data = data;
        this.sky = sky;
        this.progress = progress;
        this.getSkyTowerRemainingClears = this.getSkyTowerRemainingClears.bind(this);
        this.isSkyTowerAtRewardLimit = this.isSkyTowerAtRewardLimit.bind(this);
        this.maybeUnlockSkyTowerFromChaos20 = this.maybeUnlockSkyTowerFromChaos20.bind(this);
        this.canEnterSkyTower = this.canEnterSkyTower.bind(this);
        this.getSkyTowerTier = this.getSkyTowerTier.bind(this);
        this.getSkyTowerRewardAmount = this.getSkyTowerRewardAmount.bind(this);
        this.getSkyStoneReductionPct = this.getSkyStoneReductionPct.bind(this);
        this.getSkyStoneNextCost = this.getSkyStoneNextCost.bind(this);
        this.getSkyTowerGemBoostLevel = this.getSkyTowerGemBoostLevel.bind(this);
        this.getSkyTowerGemBoostCost = this.getSkyTowerGemBoostCost.bind(this);
    }

    getSkyTowerRemainingClears() {
        let st = this.sky.ensureSkyTowerState();
        return Math.max(0, this.sky.getSkyTowerLoopClearLimit() - Math.max(0, Math.floor(st.clearedThisLoop || 0)));
    }

    isSkyTowerAtRewardLimit(zone) {
        return zone?.type === 'skyTower' && this.getSkyTowerRemainingClears() === 0;
    }

    *maybeUnlockSkyTowerFromChaos20() {
        let st = this.sky.ensureSkyTowerState();
        if (!st.unlocked && (this.deps.game.season || 1) >= 15 && this.progress.hasCurrentLoopChaos20Clear()) {
            st.unlocked = true;
            if ((this.deps.canAddLog ? 'function' : 'undefined') === 'function') (yield { kind: 'addLog', args: [this.deps._t('☁️ 창공의 탑이 열렸습니다. 이후 루프에서는 혼돈 입성부터 도전할 수 있습니다.'), 'loot-unique'] });
            return true;
        }
        return false;
    }

    canEnterSkyTower() {
        let st = this.sky.ensureSkyTowerState();
        return !!st.unlocked && this.progress.hasCurrentLoopChaosAccess();
    }

    getSkyTowerTier(floor) {
        let safeFloor = Math.max(1, Math.floor(floor || 1));
        return 48 + Math.floor((safeFloor - 1) * 0.38);
    }

    getSkyTowerRewardAmount(floor) {
        let safeFloor = Math.max(1, Math.floor(floor || 1));
        return 3 + Math.floor(safeFloor / 5);
    }

    getSkyStoneReductionPct() {
        let st = this.sky.ensureSkyTowerState();
        return Math.max(0, Math.min(75, Math.floor(((st.skyStone || {}).level || 0) * 5)));
    }

    getSkyStoneNextCost() {
        let st = this.sky.ensureSkyTowerState();
        let lv = Math.max(0, Math.floor(((st.skyStone || {}).level || 0)));
        return 20 + lv * 10 + Math.floor(lv * lv * 2);
    }

    getSkyTowerGemBoostLevel(skillName) {
        let st = this.sky.ensureSkyTowerState();
        return Math.max(0, Math.min(this.sky.getSkyTowerGemBoostMaxLevel(), Math.floor((st.gemBoosts || {})[skillName] || 0)));
    }

    getSkyTowerGemBoostCost(skillName) {
        let lv = this.getSkyTowerGemBoostLevel(skillName);
        return [60, 120, 240][lv] || 999999;
    }
}
