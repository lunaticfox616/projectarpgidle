export class SideEncounterDestinations {
    constructor(deps) {
        this.deps = deps;
    }

    destinations() {
        const blocked = (0, this.deps.isBeehiveRunLockedForMapTravel)();
        return [
            {id:'beehive',name:(0, this.deps._t)('벌집 원정'),active:this.deps.game.beehive.inRun,ready:!blocked && this.deps.game.currencies.hiveKey>0},
            {id:'voidrift',name:(0, this.deps._t)('대균열'),active:this.deps.game.voidRift.grandRun?.inRun,ready:!blocked && this.deps.game.voidRift.grandBreachUnlock},
            {id:'meteor',name:(0, this.deps._t)('운석 낙하'),active:this.deps.game.currentZoneId===this.deps.METEOR_FALL_ZONE_ID,ready:!blocked && this.deps.game.meteorSite.skyRiftReady}
        ];
    }

    refreshDestinations() {
        const host = this.deps.document.getElementById('map-ready-destinations');
        if (!host) return;
        const available = this.destinations().filter(row => (0, this.deps.isMapExploreSubtabOpenable)('map-explore-'+row.id) && (row.active || row.ready));
        const current = (0, this.deps.escapeHTML)((0, this.deps._t)((0, this.deps.getZone)(this.deps.game.currentZoneId).name));
        const expanded = host.querySelector('details')?.open;
        const focused = host.querySelector('summary') === this.deps.document.activeElement;
        const links = available.map(row => `<button type="button" onclick="switchMapExploreSubtab('map-explore-${row.id}')"><small>${(0, this.deps._t)(row.active ? '진행 중' : '입장 가능')}</small>${(0, this.deps._t)(row.name)}</button>`).join('');
        const html = `<button type="button" class="map-ready-current" onclick="switchTab('tab-battle')"><small>${(0, this.deps._t)('현재 위치')}</small>${current}</button>`
            + (available.length ? `<details><summary>${(0, this.deps._t)('입장 가능한 원정')} ${available.length}</summary><div>${links}</div></details>` : '');
        host.hidden = false;
        if (host._destinationsMarkup === html) return;
        host.innerHTML = html;
        host._destinationsMarkup = html;
        const details = host.querySelector('details');
        if (details) details.open = !!expanded;
        if (focused) host.querySelector('summary')?.focus({preventScroll:true});
    }
}
