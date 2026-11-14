export class LabyrinthEncounterView {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
        this.active = true;
        this.labyrinthChoice = { owner: null, season: 0, floor: 1, current: 1 };
    }

    labyrinthSelectedFloor() {
        const current = Math.max(1, Math.floor(this.deps.game.labyrinthFloor || 1));
        const max = Math.max(current, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || 1));
        const choice = this.labyrinthChoice;
        if (choice.owner !== this.deps.game || choice.season !== this.deps.game.season) {
            this.labyrinthChoice = { owner: this.deps.game, season: this.deps.game.season, floor: current, current };
        } else {
            if (choice.floor === choice.current) choice.floor = current;
            choice.current = current;
            choice.floor = Math.min(max, choice.floor);
        }
        return this.labyrinthChoice.floor;
    }

    selectLabyrinthFloor(floor) {
        if (!this.active) return;
        this.labyrinthSelectedFloor();
        const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
        if (!Number.isInteger(floor) || floor < 1 || floor > max) return;
        this.labyrinthChoice.floor = floor;
        this.links.markup.renderPanel(this.deps.document.getElementById('ui-labyrinth-list'), this.labyrinthPanel());
    }

    async chooseLabyrinthFloor() {
        if (!this.active) return;
        const owner = this.deps.game, season = this.deps.game.season;
        const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
        const floor = await (0, this.deps.requestGameNumber)({ title: (0, this.deps._t)('고대 미궁 층 선택'), min: 1, max,
            value: this.labyrinthSelectedFloor(), confirmLabel: (0, this.deps._t)('살펴보기') });
        if (!this.active || this.deps.game !== owner || this.deps.game.season !== season || floor === null) return;
        this.selectLabyrinthFloor(Number(floor));
    }

    dispose() {
        this.active = false;
        this.labyrinthChoice = { owner: null, season: 0, floor: 1, current: 1 };
    }

    labyrinthRewards(floor) {
        const rows = [];
        if (this.deps.contentProgression.isUnlocked('fossil')) rows.push(['화석', '미궁 화석, 속성 화석, 심연 화석']);
        if (this.deps.contentProgression.isUnlocked('fossilRestore')) rows.push(['복원용 화석', '원시 화석, 원시 고대 화석']);
        if ((this.deps.game.season || 1) >= 6 && this.deps.contentProgression.canDropCurrency('sealShard')) {
            rows.push(['부적 재료', (0, this.deps._t)('봉인편린, 강력한 기운의 봉인편린{value}', { value: floor >= 30 ? (0, this.deps._t)(', 찬란한 봉인편린') : '' })]);
        }
        return rows.length ? rows.map(([title, text]) => `<div><dt>${title}</dt><dd>${text}</dd></div>`).join('')
            : '<div><dd>화석 제작 해금 후 획득</dd></div>';
    }

    labyrinthUniques(zone) {
        const tier = Math.min((0, this.deps.getRealmEquipmentHiddenTierCap)(zone),
            this.deps.levelProgression.maxDropTier(this.deps.levelProgression.itemLevel(zone, { isBoss: true }, () => 1 - Number.EPSILON)));
        const names = this.deps.UNIQUE_DB.filter(item => item.dropOnly?.type === 'labyrinth' && (0, this.deps.uniqueDropsInZone)(item, zone)
            && (0, this.deps.uniqueMeetsTier)(item, tier)).map(item => (0, this.deps.escapeHTML)((0, this.deps.getItemDisplayName)(item)));
        return names.length ? `<div class="labyrinth-unique-pool"><span>${(0, this.deps._t)('전용 고유')}</span>${names.map(name => `<b>${name}</b>`).join('')}</div>` : '';
    }

    labyrinthResult() {
        const result = this.deps.game.labyrinthLastResult;
        if (!result || result.season !== this.deps.game.season) return '';
        const rewards = Object.entries(result.currencies).filter(([key, count]) => this.deps.ORB_DB[key] && count > 0)
            .map(([key, count]) => `<span>${(0, this.deps.escapeHTML)((0, this.deps._t)(this.deps.ORB_DB[key].name))} <b>+${count}</b></span>`).join('');
        return `<div class="map-expedition-result labyrinth-result"><strong>${(0, this.deps._t)('{n}층 돌파 보상', { n: result.floor })}</strong>${rewards || `<span>${(0, this.deps._t)('재료 없음')}</span>`}</div>`;
    }

    labyrinthEntryActions(floor, max, current, blocked) {
        const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>`
            : `<button type="button" data-exploration-departure onclick="enterLabyrinthFloor(${floor})" ${blocked ? `disabled data-tip="${(0, this.deps.escapeHTML)(blocked)}"` : ''}>${(0, this.deps._t)('{n}층 입장', { n: floor })}</button>`;
        const picks = [...new Set([1, Math.max(1, floor - 1), Math.min(max, floor + 1), max])].filter(value => value !== floor);
        const navigation = picks.map(value => `<button type="button" class="labyrinth-floor-link" onclick="sideEncounterUi.selectLabyrinthFloor(${value})">${value === max ? `${(0, this.deps._t)('최고')} ` : ''}${(0, this.deps._t)('{n}층', { n: value })}</button>`).join('');
        return `<div class="map-expedition-actions">${action}${navigation}${max > 1 ? `<button type="button" onclick="sideEncounterUi.chooseLabyrinthFloor()">${(0, this.deps._t)('층 선택')}</button>` : ''}</div>`;
    }

    labyrinthPanel() {
        const floor = this.labyrinthSelectedFloor(), zone = (0, this.deps.getLabyrinthZoneNow)(floor);
        const max = Math.max(1, Math.floor(this.deps.game.labyrinthUnlockedMaxFloor || this.deps.game.labyrinthFloor || 1));
        const active = this.deps.game.currentZoneId === this.deps.LABYRINTH_ZONE_ID && !this.deps.game.combatHalted;
        const current = active && this.deps.game.labyrinthFloor === floor;
        const blocked = (0, this.deps.getZoneTravelBlockReason)(this.deps.LABYRINTH_ZONE_ID) || (0, this.deps.getHeldRunBlockReason)();
        return `<div class="map-expedition-intro labyrinth-panel"><div class="map-expedition-heading"><strong>${(0, this.deps._t)('{n}층', { n: floor })} ${(0, this.deps._t)(current ? '탐험 중' : '입장 준비')}</strong>
            <span class="labyrinth-floor-record">${(0, this.deps._t)('입장 가능 1 ~ {max}층', { max })}</span>${(0, this.deps.buildMapPowerEstimateHtml)(zone)}</div>
            <div class="labyrinth-rewards"><small>${(0, this.deps._t)('나올 수 있는 전리품')}</small><dl>${this.labyrinthRewards(floor)}</dl>${this.labyrinthUniques(zone)}</div>
            ${this.labyrinthResult()}${active && !current ? `<p class="labyrinth-current">${(0, this.deps._t)('{n}층 탐험 중', { n: this.deps.game.labyrinthFloor })}</p>` : ''}
            ${this.labyrinthEntryActions(floor, max, current, blocked)}</div>`;
    }
}
