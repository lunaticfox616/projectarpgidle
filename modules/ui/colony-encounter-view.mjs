export class ColonyEncounterView {
    constructor(deps) {
        this.deps = deps;
    }

    colonyWavePattern(zone) {
        const patterns = {charge:'굴착 돌격 (근접 무리)',sharpshooters:'독침 사격 (예고 관통탄)',carapace:'갑각 호위 (높은 방어)',mixed:'혼합 파상 (여러 역할)',overlord:'지배체 (예고 강타)'};
        return patterns[zone.wavePattern] || '군락 방어전';
    }

    colonyPanelActions(colony, traces) {
        const entryDisabled = traces <= 0 || colony.inRun ? 'disabled' : '';
        const withdrawDisabled = colony.inRun ? '' : 'disabled';
        const scheduled = colony.inRun ? `<button type="button" aria-pressed="${!!colony.returnAfterWave}" onclick="sideEncounterUi.toggleColonyReturn()">${colony.returnAfterWave ? (0, this.deps._t)('철수 예약 취소') : (0, this.deps._t)('{returnWave}웨이브 후 철수', { returnWave: this.deps.colonyRun.returnWave(colony) })}</button>` : '';
        return `<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startColonyRun()" ${entryDisabled}>${(0, this.deps._t)('군락지 입장')}</button>
            <button type="button" onclick="sideEncounterUi.withdrawColony()" ${withdrawDisabled}>${(0, this.deps._t)('지금 철수')}</button>${scheduled}
            <button type="button" onclick="document.getElementById('ui-colony-ward-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' })">${(0, this.deps._t)('액막이 관리')}</button>
            <span>${(0, this.deps._t)('액막이 칸 {slotCount}/{maxSlots}, 편린 {colonyShard}개', { slotCount: this.deps.colonyWards.slotCount(), maxSlots: this.deps.COLONY_WARD_RULES.maxSlots, colonyShard: this.deps.game.currencies.colonyShard||0 })}</span></div>`;
    }

    colonyStage(colony) {
        if (colony.inRun) return colony.lootPending ? (0, this.deps._t)('{value}웨이브 전리품 수거 중', { value: colony.wave - 1 }) : (0, this.deps._t)('{wave}웨이브, {kills}/{requiredKills}처치', { wave: colony.wave, kills: colony.kills, requiredKills: colony.requiredKills });
        const result = colony.lastResult;
        const labels = { left: '지역 이동', core: '군락 핵 파괴', defeat: '전투 불능' };
        if (result && ['scheduled', 'withdraw'].includes(result.kind)) return result.completed ? (0, this.deps._t)('{completed}웨이브 방어 후 철수', { completed: result.completed }) : '철수 완료';
        if (result) return (0, this.deps._t)('{wave}웨이브, {labels}', { wave: result.wave, labels: labels[result.kind] });
        return colony.failedWave > 0 ? (0, this.deps._t)('{failedWave}웨이브, 군락 핵 파괴', { failedWave: colony.failedWave }) : '방어전 입장 준비';
    }

    colonyResultHtml(colony) {
        const completed = Math.max(0,Math.floor(colony.wave||0)-1);
        const returnNote = colony.inRun ? '현재 원정' : '최근 원정';
        return `<div class="map-expedition-result"><span>${returnNote}</span><strong>${(0, this.deps._t)('완료 {completed}웨이브', { completed })}</strong><span>${(0, this.deps._t)('최고 도달 {max}웨이브', { max: Math.max(0,colony.highestWave||0) })}</span>
            ${colony.returnAfterWave ? `<span>${(0, this.deps._t)('{returnAfterWave}웨이브 후 철수', { returnAfterWave: colony.returnAfterWave })}</span>` : ''}
            ${!colony.inRun && colony.lastResult?.lostHeld ? `<span>${(0, this.deps._t)('보관 전리품 {lostHeld}묶음 소멸', { lostHeld: colony.lastResult.lostHeld })}</span>` : ''}</div>`;
    }

    colonyPanel(colony,zone) {
        const traces = Math.max(0,this.deps.game.currencies.colonyTrace||0);
        const loot = this.deps.colonyRun.uncollected();
        const stage = this.colonyStage(colony);
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${stage}</strong>${(0, this.deps.buildMapPowerEstimateHtml)(zone)}</div>
            <dl><div><dt>${(0, this.deps._t)('입장 비용')}</dt><dd>${(0, this.deps._t)('군락지 흔적 1개')}<small>${(0, this.deps._t)('보유 {traces}개, 기준 혼돈 심화 {entryDeepChaosDepth}', { traces, entryDeepChaosDepth: zone.entryDeepChaosDepth })}</small></dd></div>
            <div><dt>${colony.lootPending ? (0, this.deps._t)('다음 적 무리') : (0, this.deps._t)('현재 적 무리')}</dt><dd>${this.colonyWavePattern(zone)}</dd></div>
            <div><dt>${(0, this.deps._t)('방어 목표')}</dt><dd>${(0, this.deps._t)('군락 핵 보호')}<small>${colony.coreMaxHp > 0 ? (0, this.deps._t)('{ceil} / {coreMaxHp} 내구도', { ceil: Math.ceil(colony.coreHp).toLocaleString(), coreMaxHp: colony.coreMaxHp.toLocaleString() }) : (0, this.deps._t)('입장 시 핵 내구도 충전')}, 파괴되면 실패</small></dd></div>
            <div><dt>${(0, this.deps._t)('웨이브 돌파 보상')}</dt><dd>${(0, this.deps._t)('군락지 편린, 액막이 부적')}<small>${(0, this.deps._t)('{every}웨이브마다 액막이 확정', { every: this.deps.COLONY_WARD_RULES.colonyWave.every })}</small></dd></div>
            ${loot.held ? `<div><dt>${(0, this.deps._t)('보관 전리품')}</dt><dd>${(0, this.deps._t)('{held}묶음', { held: loot.held })}<small>${(0, this.deps._t)('지배체 처치 전 철수하면 소멸')}</small></dd></div>` : ''}
            ${loot.floor ? `<div><dt>${(0, this.deps._t)('바닥 전리품')}</dt><dd>${(0, this.deps._t)('{floor}묶음', { floor: loot.floor })}<small>${colony.returnAfterWave && colony.wave > colony.returnAfterWave ? (0, this.deps._t)('수거 후 철수') : (0, this.deps._t)('수거 후 다음 웨이브')}</small></dd></div>` : ''}</dl>
            ${this.colonyResultHtml(colony)}
            <details class="map-expedition-details" id="colony-entry-guide"><summary>${(0, this.deps._t)('입장권 획득처, 진행 규칙')}</summary>
            <p>${(0, this.deps._t)('혼돈 심화 21층 이상/벌집/대균열에서 군락지 흔적을 얻습니다. 웨이브 보상은 바로 받고, 보관 전리품은 지배체를 처치해야 떨어집니다.')}</p>
            <p>${(0, this.deps._t)('철수 시 보관 전리품은 사라지고, 바닥 전리품은 받습니다. 새 도전은 1웨이브부터 시작합니다.')}</p></details>
            ${this.colonyPanelActions(colony, traces)}</div>`;
    }
}
