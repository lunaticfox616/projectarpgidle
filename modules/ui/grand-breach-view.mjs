export class GrandBreachView {
    constructor(deps) {
        this.deps = deps;
    }

    grandRewardPreview(reward) {
        const parts = [];
        if (this.deps.contentProgression.canDropCurrency('voidChisel')) parts.push(`공허의 끌 ${reward.voidChisel}`);
        if (reward.jewelShard && this.deps.contentProgression.canDropCurrency('jewelShard')) parts.push(`주얼 결정 ${reward.jewelShard}`);
        return parts.join(', ') || '제작 재화 해금 후 획득';
    }

    usesGrandBreachArena() {
        const expedition = this.deps.actExplorationState.current(this.deps.game);
        if (expedition?.zoneId === 'grand_breach_run') return !!this.deps.actExplorationMap.forRun(expedition).grandBreach;
        return !!(0, this.deps.getZone)('grand_breach_run')?.exploration?.arena;
    }

    /** Time left before the lord must be called (GRAND_BREACH_ENCOUNTER.survivalLimitSeconds), as m:ss. */
    grandTimeLeft(run) {
        const left = Number.isFinite(run.survivalEndsAt) ? run.survivalEndsAt - (0, this.deps.getCombatTime)() : this.deps.GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1000;
        const seconds = Math.max(0, Math.ceil(left / 1000));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }

    grandSummary(run) {
        if (run.phase === 'loot') return `<strong>${(0, this.deps._t)('군주 격파')}</strong><span>${(0, this.deps._t)('전리품 수거 중')}</span><small>${(0, this.deps._t)('바닥 아이템을 모두 획득하면 귀환')}</small>`;
        const progress = (0, this.deps.getGrandBreachProgress)(run.gauge);
        const reward = (0, this.deps.getGrandBreachRewardSummary)(run.kills);
        const nextKills = 10 - reward.kills % 10;
        const pressure = Math.min(6, Math.floor(reward.kills / 10));
        const heading = (0, this.deps._t)({ survival: '균열 쇄도', bossPending: '군주 소환' }[run.phase] || '균열 군주');
        const next = run.phase === 'survival' ? (0, this.deps._t)('남은 시간 {time}, 다음 보상 증가까지 {n}마리', { time: this.grandTimeLeft(run), n: nextKills })
            : (0, this.deps._t)(run.phase === 'bossPending' ? '군주 소환 중' : '군주 처치 시 지급');
        const config = this.usesGrandBreachArena() ? this.deps.GRAND_BREACH_ENCOUNTER.arena : this.deps.GRAND_BREACH_ENCOUNTER;
        const crowd = run.inRun && run.phase === 'survival'
            ? `<span>${(0, this.deps._t)('현장 적')} <b>${this.deps.game.enemies.filter(enemy => enemy.hp > 0).length}/${config.capacities[progress.stage]}</b></span>` : '';
        return `<strong>${heading}</strong><span>${(0, this.deps._t)('게이지')} <b>${progress.percent}%</b></span>
            <span>${(0, this.deps._t)('군주 압박')} <b>${(0, this.deps._t)('{n}단계', { n: pressure })}</b></span>
            ${crowd}<span>${(0, this.deps._t)('보관 전리품')} <b>${(0, this.deps._t)('{n}묶음', { n: run.pendingLoot?.length || 0 })}</b></span><span class="grand-breach-reward">${(0, this.deps._t)('격파 보상')} <b>${this.grandRewardPreview(reward)}</b></span><small>${next}</small>`;
    }

    grandActions(rift) {
        if (rift.grandRun?.inRun) return `<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>
            <button type="button" onclick="sideEncounterUi.withdrawGrandBreach()">${(0, this.deps._t)(rift.grandRun.phase === 'loot' ? '귀환' : '원정 포기')}</button>`;
        const hint = rift.grandBreachUnlock ? '' : `<span>${(0, this.deps._t)('공허 균열 완료 시 {pct}% 확률로 열립니다.', { pct: Math.round(this.deps.GRAND_BREACH_ENCOUNTER.unlockChance * 100) })}</span>`;
        return `<button type="button" data-exploration-departure onclick="enterGrandBreach()" ${rift.grandBreachUnlock?'':'disabled'}>${(0, this.deps._t)('대균열 입장')}</button>${hint}`;
    }

    grandResultReward(run) {
        if (run.phase !== 'done') return '군주 보상 없음';
        const pieces = [];
        if (run.rewardVoidChisel > 0) pieces.push(`공허의 끌 +${run.rewardVoidChisel}`);
        if (run.rewardJewelShard > 0) pieces.push(`주얼 결정 +${run.rewardJewelShard}`);
        return pieces.join(', ') || (run.rewardVoidChisel == null ? '정산 완료' : '지급된 제작 재화 없음');
    }

    grandResult(run) {
        if (!run || run.inRun || !['done','failed'].includes(run.phase)) return '';
        const cleared = run.phase === 'done';
        return `<div class="map-expedition-result" aria-label="${(0, this.deps._t)('최근 원정 결과')}"><span>${(0, this.deps._t)('최근 원정')}</span>
            <strong>${(0, this.deps._t)(cleared?'군주 격파':'군주 격파 실패')}</strong><span>${(0, this.deps._t)('균열 몬스터 {n}처치', { n: Math.max(0,Math.floor(run.kills||0)) })}</span>
            <b>${this.grandResultReward(run)}</b></div>`;
    }

    grandEntryRewardDescription() {
        const rewards = [
            this.deps.contentProgression.canDropCurrency('voidChisel') ? '공허의 끌 2개부터, 10마리 처치마다 +1개' : '',
            this.deps.contentProgression.canDropCurrency('jewelShard') ? '15마리마다 주얼 결정 +1개(최대 3개)' : ''
        ];
        return rewards.filter(Boolean).join(', ') || '제작 재화 해금 후 획득';
    }

    grandEncounterDescription() {
        const rule = this.deps.GRAND_BREACH_ENCOUNTER;
        const normal = rule.normalGaugeGain / rule.requiredGauge * 100;
        const elite = rule.eliteGaugeGain / rule.requiredGauge * 100;
        if (this.usesGrandBreachArena()) {
            return (0, this.deps._t)('균열 게이지 100%까지 몬스터 쇄도 (일반 {normal}%, 정예 {elite}%) → 균열 군주', { normal, elite });
        }
        return (0, this.deps._t)('몬스터를 처치해 게이지 100% 달성(일반 {normal}%, 정예 {elite}%) → 균열 군주. 10마리마다 군주 압박 증가', { normal, elite });
    }

    grandPanelProgress(run) {
        if (run.phase === 'loot') return '군주 격파, 바닥 전리품을 다 주우면 귀환';
        if (run.phase === 'bossPending') return '균열 군주 소환 중';
        if (run.phase !== 'survival') return '균열 군주 전투';
        const progress = (0, this.deps.getGrandBreachProgress)(run.gauge);
        return (0, this.deps._t)('균열 게이지 {percent}%, 몬스터 {max}처치, 남은 시간 {run}', { percent: progress.percent, max: Math.max(0, Math.floor(run.kills || 0)), run: this.grandTimeLeft(run) });
    }

    grandPanel(rift, power) {
        const run = rift.grandRun;
        const current = run?.inRun;
        const waves = rift.active ? `${rift.defeatedCount || 0}/${rift.totalToSpawn || 0} ${(0, this.deps._t)('처치')}` : (0, this.deps._t)('혼돈 사냥 중 발생');
        const reward = this.grandEntryRewardDescription();
        return `<div class="map-expedition-intro"><p class="map-expedition-type">${(0, this.deps._t)('공허 균열')}, ${waves}</p>
            <div class="map-expedition-heading"><strong>${(0, this.deps._t)('대균열')} ${current?(0, this.deps._t)('진행 중'):''}</strong>${power}</div>
            ${current ? `<p>${this.grandPanelProgress(run)}</p><div class="map-grand-summary">${this.grandSummary(run)}</div>` :
            `<dl><div><dt>${(0, this.deps._t)('전투 방식')}</dt><dd>${this.grandEncounterDescription()}</dd></div><div><dt>${(0, this.deps._t)('격파 보상')}</dt><dd>${reward}</dd></div></dl>`}
            ${this.grandResult(run)}<div class="map-expedition-actions">${this.grandActions(rift)}</div></div>`;
    }
}
