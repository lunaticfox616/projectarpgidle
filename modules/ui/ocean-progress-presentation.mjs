export class OceanProgressPresentation {
    constructor(deps) { this.deps = deps; }

    getOceanUpgradeCostText(cost) {
        if (!cost) return '최대';
        return Object.keys(cost)
            .filter(key => (cost[key] || 0) > 0)
            .map(key => `${this.deps.getCurrencyInfo(key).name} ${cost[key]}`)
            .join(' / ');
    }

    moveAfterSurfacing(returnZoneId) {
        if (typeof this.deps.changeZone !== 'function') return;
        this.deps.changeZone(returnZoneId);
        if (this.deps.game.currentZoneId === this.deps.OCEAN_ZONE_ID) this.deps.changeZone(Math.max(0, this.deps.game.maxZoneId || 0));
    }

    getSelectedSeaGiftEquipmentTarget() {
        let item = typeof this.deps.getSelectedCraftItem === 'function' ? this.deps.getSelectedCraftItem() : null;
        return this.deps.isSeaGiftEquipmentTarget(item) ? item : null;
    }
}
