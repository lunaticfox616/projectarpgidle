export class TimeRiftEncounterView {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
    }

    timePressure(rift) {
        const pressure = rift.pressure;
        const locked = rift.altarOpen || [this.deps.TIME_RIFT_PAST_ZONE_ID,this.deps.TIME_RIFT_FUTURE_ZONE_ID].includes(this.deps.game.currentZoneId);
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${(0, this.deps._t)('시간압')} ${pressure}</strong>
            <span>${(0, this.deps._t)('혼돈 심화 {depth} 상당, 루프 {loop} 기준', { depth: (0, this.deps.getTimeRiftEquivalentChaosDepth)(pressure), loop: (0, this.deps.getTimeRiftFixedSeason)(pressure) })}</span></div>
            ${this.timeOddsHtml(rift)}
            <div class="map-expedition-actions time-rift-stepper"><button type="button" aria-label="${(0, this.deps._t)('시간압 낮추기')}" onclick="setTimeRiftPressure(-1)" ${locked||pressure<=1?'disabled':''}>−</button>
            <b>${pressure}</b><button type="button" aria-label="${(0, this.deps._t)('시간압 높이기')}" onclick="setTimeRiftPressure(1)" ${locked||pressure>=this.deps.TIME_RIFT_MAX_PRESSURE?'disabled':''}>+</button><span>${locked?(0, this.deps._t)('이번 제단의 시간압 고정'):(0, this.deps._t)('높일수록 전투가 어렵고 옵션이 더 많이 남습니다.')}</span></div></div>`;
    }

    /** Fusion outcomes for the actual rare (six options before selection): one column per kept count, its height against the likeliest
     * count and its chance on top (2026-10-25 사용자: 자잘한 설명 말고 개수별 확률만 그래프로). */
    timeOddsHtml(rift) {
        const stats = Array.isArray(rift.altarRare?.stats) ? rift.altarRare.stats : [];
        const count = rift.altarRare ? stats.filter(Boolean).length : 6;
        const kept = (0, this.deps.getTimeRiftLossOdds)(rift.pressure, count).reverse(), top = Math.max(...kept);
        const percent = value => `${(value * 100).toFixed(value >= 0.1 ? 0 : value >= 0.01 ? 1 : 2)}%`;
        const columns = kept.map((value, keptCount) => `<div class="time-rift-column loss-${count - keptCount}"><small>${percent(value)}</small>`
            + `<span><i style="height:${(value / top * 100).toFixed(1)}%"></i></span><b>${(0, this.deps._t)('{keptCount}개', { keptCount })}</b></div>`).join('');
        return `<div class="time-rift-odds" style="--time-rift-columns:${count + 1}" role="img" aria-label="남는 옵션 개수별 확률: ${kept.map((value, keptCount) => (0, this.deps._t)('{keptCount}개 {value}', { keptCount, value: percent(value) })).join(', ')}">${columns}</div>`;
    }

    timePast(rift) {
        const current = this.deps.game.currentZoneId === this.deps.TIME_RIFT_PAST_ZONE_ID;
        const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>` :
            `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.TIME_RIFT_PAST_ZONE_ID}')" ${rift.altarOpen?'disabled':''}>${(0, this.deps._t)('과거 입장')}</button>`;
        return `<div class="map-expedition-intro"><h3>1. ${(0, this.deps._t)('과거')}</h3><strong>${(0, this.deps._t)(rift.altarOpen?'제단 개방 완료':'과거를 돌파해 제단 개방')}</strong>
            ${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.TIME_RIFT_PAST_ZONE_ID))}<p>${(0, this.deps._t)('제단을 열면 장비 두 개를 올릴 수 있습니다.')}</p>
            <div class="map-expedition-actions">${action}</div></div>`;
    }

    timeAltar(rift) {
        const selected = (0, this.deps.getSelectedCraftItem)();
        const issue = (0, this.deps.isCraftSelectionEquip)() ? '장착 중인 장비는 먼저 해제하세요.' : (0, this.deps.getTimeAltarItemIssue)(selected,rift);
        const filled = [rift.altarUnique,rift.altarRare].some(Boolean);
        const ready = [rift.altarUnique,rift.altarRare].every(Boolean);
        const selection = this.timeAltarSelection(selected,issue,ready);
        return `<div class="map-expedition-intro"><h3>2. ${(0, this.deps._t)('제단')}</h3><strong>${(0, this.deps._t)('같은 부위의 고유 + 희귀')}</strong>
            <div class="time-rift-items">${this.timeItemDetails(rift.altarUnique,'altarUnique',(0, this.deps._t)('고유'))}${this.timeItemDetails(rift.altarRare,'altarRare',(0, this.deps._t)('희귀'))}</div>
            ${selection}
            <div class="map-expedition-actions"><button type="button" onclick="openCraftItemPickerOverlay('altar')" ${!rift.altarOpen||ready?'disabled':''}>${(0, this.deps._t)('장비 고르기')}</button>
            <button type="button" onclick="placeItemOnTimeAltar()" ${issue?'disabled':''}>${(0, this.deps._t)('선택 장비 올리기')}</button>
            <button type="button" onclick="retrieveTimeAltarItems()" ${rift.altarOpen?'':'disabled'}>${(0, this.deps._t)(filled?'제단 회수':'빈 제단 닫기')}</button></div></div>`;
    }

    timeAltarSelection(selected,issue,ready) {
        if (ready) return `<p>${(0, this.deps._t)('두 장비가 준비되었습니다.')}</p>`;
        const name = selected ? `<p class="time-rift-selected">${(0, this.deps.escapeHTML)((0, this.deps._t)(selected.name))}</p>` : '';
        return `${name}<p>${(0, this.deps.escapeHTML)(issue||'이 장비를 제단에 올릴 수 있습니다.')}</p>`;
    }

    timeItemDetails(item, source, label) {
        if (!item) return `<div class="time-rift-item-empty"><span>${label}</span><span>${(0, this.deps._t)('비어 있음')}</span></div>`;
        return `<details class="time-rift-item" id="time-rift-item-${source}" data-rift-inspect="${source}" ontoggle="sideEncounterUi.inspectTimeItem(this)">
            <summary><span>${label}</span><strong>${(0, this.deps.escapeHTML)((0, this.deps.getItemDisplayName)(item))}</strong></summary><div class="time-rift-item-body"></div></details>`;
    }

    timeResultItem(rift) {
        const result = rift.lastFusion;
        if (!result) return null;
        return (0, this.deps.getEquipmentLoadoutOwnedItems)(this.deps.game).find(item => item.fusedRelic && item.id === result.id
            && (0, this.deps.getEquipmentLoadoutItemIdentity)(item) === result.instanceId) || null;
    }

    inspectTimeItem(details) {
        if (!details.open || !details.isConnected) return;
        const source = details.dataset.riftInspect, rift = (0, this.deps.ensureTimeRiftState)();
        const item = source === 'lastFusion' ? this.timeResultItem(rift)
            : ['altarUnique','altarRare'].includes(source) ? rift[source] : null;
        const body = details.querySelector('.time-rift-item-body');
        const signature = JSON.stringify(item);
        if (body.dataset.signature === signature) return;
        body.replaceChildren(...(item ? [this.deps.equipmentInspectionUi.tooltipBox(item, null, false)] : []));
        body.dataset.signature = signature;
    }

    timeResult(rift) {
        const result = rift.lastFusion;
        if (!result) return '';
        const item = this.timeResultItem(rift);
        const equipment = item ? this.timeItemDetails(item,'lastFusion','융합 유물') : `<strong>${(0, this.deps.escapeHTML)((0, this.deps._t)(result.name))}</strong>`;
        return `<div class="map-expedition-intro time-rift-result-card"><div class="map-expedition-heading"><strong>${(0, this.deps._t)('최근 융합')}</strong>
            <span>${(0, this.deps._t)('루프')} ${result.season}, ${(0, this.deps._t)('시간압')} ${result.pressure}</span></div>${equipment}
            <dl><div><dt>${(0, this.deps._t)('계승')}</dt><dd>${(0, this.deps._t)('{inherited}개', { inherited: result.inherited })}</dd></div><div><dt>${(0, this.deps._t)('유실')}</dt><dd>${(0, this.deps._t)('{lost}개', { lost: result.lost })}</dd></div></dl><div class="map-expedition-actions"></div></div>`;
    }

    timeFuture(rift) {
        const current = this.deps.game.currentZoneId === this.deps.TIME_RIFT_FUTURE_ZONE_ID;
        const issue = (0, this.deps.getTimeRiftFutureEntryReason)(rift); // 입장과 같은 까닭(가방 자리도)
        const action = current ? `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>` :
            `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.TIME_RIFT_FUTURE_ZONE_ID}')" ${issue?'disabled':''}>${(0, this.deps._t)('미래 입장')}</button>`;
        return `<div class="map-expedition-intro"><h3>${(0, this.deps._t)('3. 미래')}</h3><strong>${(0, this.deps._t)('희귀 옵션을 고유에 계승')}</strong>
            ${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.TIME_RIFT_FUTURE_ZONE_ID))}<p>${(0, this.deps.escapeHTML)(issue||'융합 준비 완료')}</p>
            <p class="time-rift-risk">${(0, this.deps._t)('실패하면 제단 장비가 파괴됩니다.')}</p>
            <details class="map-expedition-details" id="time-rift-fusion-rules"><summary>${(0, this.deps._t)('융합 규칙')}</summary>
            <p>${(0, this.deps._t)('미래 클리어 시 두 장비를 소모해 융합 유물 1개를 만듭니다. 희귀 옵션은 하나씩 시간압의 확률로 남고({TIME_RIFT_KEEP_CAP}개가 남은 뒤로는 훨씬 낮은 확률), 나머지는 사라집니다.', { TIME_RIFT_KEEP_CAP: this.deps.TIME_RIFT_KEEP_CAP })}</p>
            <p>${(0, this.deps._t)('융합 후에는 황금률/잿불가지/축복의 꽃잎만 사용할 수 있습니다.')}</p></details>
            <div class="map-expedition-actions">${action}</div></div>`;
    }

    timeRiftPanel(host,rift) {
        if (!host.querySelector('.time-rift-stages')) host.innerHTML = '<div class="time-rift-pressure"></div><section class="time-rift-result" aria-label="최근 융합"></section><div class="time-rift-stages"><section aria-label="과거" data-rift-stage="past"></section><section aria-label="제단" data-rift-stage="altar"></section><section aria-label="미래" data-rift-stage="future"></section></div>';
        this.links.markup.renderPanel(host.querySelector('.time-rift-pressure'),this.timePressure(rift));
        host.querySelector('.time-rift-result').hidden = !rift.lastFusion;
        this.links.markup.renderPanel(host.querySelector('.time-rift-result'),this.timeResult(rift));
        this.links.markup.renderPanel(host.querySelector('[data-rift-stage="past"]'),this.timePast(rift));
        this.links.markup.renderPanel(host.querySelector('[data-rift-stage="altar"]'),this.timeAltar(rift));
        this.links.markup.renderPanel(host.querySelector('[data-rift-stage="future"]'),this.timeFuture(rift));
        host.querySelectorAll('[data-rift-inspect][open]').forEach(this.inspectTimeItem.bind(this));
    }
}
