export class SideExpeditionView {
    constructor(deps, links) {
        this.deps = deps;
        this.links = links;
    }

    hiveSummary(hive) {
        const penalties = Array.isArray(hive.penaltyLedger) ? hive.penaltyLedger : [];
        const rewards = (Array.isArray(hive.rewardLedger) ? hive.rewardLedger : []).filter(row => row !== '보상 획득 실패');
        const queen = (Array.isArray(hive.pendingQueenRewards) ? hive.pendingQueenRewards : [])
            .map(reward => String(reward.text || '').replace(/^\[[^\]]+\]\s*/, ''));
        const power = Math.max(0, Math.floor(hive.enemyEmpower || 0));
        const wax = 1 + Math.floor(Math.min(30, power) / 6);
        const stinger = 1 + Math.floor(Math.min(30, power) / 10);
        return `<section class="expedition-ledger" aria-label="${(0, this.deps._t)('벌집 위험과 보상')}">
            <div class="expedition-ledger-risk"><h3>${(0, this.deps._t)('누적 대가')} <b>${(0, this.deps._t)('군체 강화 {power}', { power })}</b></h3><ul>${this.links.markup.rows(penalties,'선택한 대가 없음')}</ul></div>
            <div><h3>${(0, this.deps._t)('확보 보상')} <b>${(0, this.deps._t)('이미 지급됨')}</b></h3><ul>${this.links.markup.rows(rewards,'아직 없음')}</ul>
                ${hive.pendingWaveRewardText ? `<p>${(0, this.deps._t)('이번 무리 처치 후, {pendingWaveRewardText}', { pendingWaveRewardText: (0, this.deps.escapeHTML)(hive.pendingWaveRewardText) })}</p>` : ''}</div>
            <div class="expedition-ledger-queen"><h3>${(0, this.deps._t)('여왕 처치 시')} <b>${(0, this.deps._t)('보류 중')}</b></h3>
                <ul>${this.links.markup.rows(queen,'아직 보류한 선택 보상 없음')}</ul><p>${(0, this.deps._t)('기본 전리품: 밀랍 {wax}, 독벌침 {stinger}. 확률 보상은 처치 시 추첨', { wax, stinger })}</p></div>
        </section>`;
    }

    hivePanel(hive, choices, power) {
        const keys = Math.max(0,this.deps.game.currencies.hiveKey || 0);
        if (!hive.inRun) return `<div class="map-expedition-intro"><p class="map-expedition-type">${(0, this.deps._t)('갈림길을 직접 고르는 원정, 10갈래 후 여왕')}</p>
            <dl><div><dt>${(0, this.deps._t)('전투 방식')}</dt><dd>${(0, this.deps._t)('벌떼 열 방과 여왕의 방. 강화 대가를 고를수록 여왕 전리품 증가')}</dd></div>
            <div><dt>${(0, this.deps._t)('주요 전리품')}</dt><dd>${(0, this.deps._t)('꽃가루, 독벌침, 벌꿀, 밀랍')}</dd></div>
            <div><dt>${(0, this.deps._t)('입장 비용')}</dt><dd>${(0, this.deps._t)('벌집 열쇠 1개')} <small>${(0, this.deps._t)('보유 {n}개', { n: keys })}</small></dd></div></dl>
            ${power}<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startBeehiveRun()" ${keys>0?'':'disabled'}>${(0, this.deps._t)('벌집 입장')}</button>
            ${keys>0?'':`<span>${(0, this.deps._t)('벌집 열쇠가 필요합니다.')}</span>`}</div></div>`;
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${hive.queenActive?(0, this.deps._t)('여왕벌 전투'):(0, this.deps._t)('갈림길 {n}/10', { n: Math.min(10,hive.branchStep) })}</strong>${power}</div>
            ${this.hiveSummary(hive)}${choices}<details class="map-expedition-details"><summary>${(0, this.deps._t)('원정 정보, 보유 재료')}</summary>
            <p>${(0, this.deps._t)('꽃가루')} ${this.deps.game.currencies.pollen||0}, ${(0, this.deps._t)('독벌침')} ${this.deps.game.currencies.venomStinger||0}, ${(0, this.deps._t)('마력 깃든 벌꿀')} ${this.deps.game.currencies.enchantedHoney||0}, ${(0, this.deps._t)('밀랍')} ${this.deps.game.currencies.beeswax||0}</p></details>
            <div class="map-expedition-actions"><button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button><button type="button" onclick="forfeitBeehiveRun()">${(0, this.deps._t)('원정 포기')}</button></div></div>`;
    }

    meteorPanel(power) {
        const active = this.deps.game.currentZoneId === this.deps.METEOR_FALL_ZONE_ID;
        const ready = this.deps.game.meteorSite.skyRiftReady;
        const percent = Math.min(100,Math.floor(this.deps.game.meteorSite.skyRiftGauge || 0));
        const site = (0, this.deps.getZone)(this.deps.METEOR_FALL_ZONE_ID);
        const reward = (0, this.deps._t)('희귀 이상 장비 {rewardEquipmentCount}개 확정, 운석 고유 장비(낮은 확률). 가방이 차도 보상은 보관됩니다', { rewardEquipmentCount: site.rewardEquipmentCount });
        const escort = site.tier >= 40 ? '정예 호위 2기' : site.tier >= 20 ? '정예 호위 1기' : '보스 단독';
        const kind = (0, this.deps.getMeteorKind)();
        const kindText = kind ? `<span class="meteor-kind is-${kind.id}">${(0, this.deps._t)(kind.name)}</span> (${kind.element})` : '충전 완료 시 정해짐';
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${active?(0, this.deps._t)('운석 원정 진행 중'):ready?(0, this.deps._t)('원정 준비 완료'):(0, this.deps._t)('하늘의 균열 충전 {pct}%', { pct: percent })}</strong>${power}</div>
            <dl><div><dt>${(0, this.deps._t)('운석')}</dt><dd>${kindText}</dd></div>
            <div><dt>${(0, this.deps._t)('주요 전리품')}</dt><dd>${reward}</dd></div>
            <div><dt>${(0, this.deps._t)('난이도')}</dt><dd>${(0, this.deps._t)('티어')} ${site.tier}<small>${(0, this.deps._t)('충전 중 기록한 최저 티어 기준')}</small></dd></div>
            <div><dt>${(0, this.deps._t)('전투 방식')}</dt><dd>${(0, this.deps._t)('파편 무리 → 별철 관통 사수 → 운석 핵({escort}). 핵 체력 절반부터 연속 예고 공격', { escort })}</dd></div></dl>
            <div class="map-expedition-actions">${active?`<button type="button" onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>`:
            `<button type="button" data-exploration-departure onclick="changeZone('${this.deps.METEOR_FALL_ZONE_ID}')" ${ready?'':'disabled'}>${(0, this.deps._t)('운석 원정 입장')}</button>${ready?'':(0, this.deps._t)('<span>충전을 완료하면 1회 입장할 수 있습니다.</span>')}`}</div></div>`;
    }
}
