export class SkyTowerEncounterView {
    constructor(deps) {
        this.deps = deps;
    }

    skyPanel(tower) {
        if (!tower.unlocked) return `<div class="map-expedition-intro"><h3>${(0, this.deps._t)('창공의 탑, 봉인됨')}</h3>
            <p>${(0, this.deps._t)('루프 15에서 혼돈 20을 돌파하면 해금됩니다. 루프 16부터는 해금을 유지합니다.')}</p>
            <div class="map-expedition-actions"><button disabled>${(0, this.deps._t)('혼돈 입성 필요')}</button></div></div>`;
        const floor = tower.currentFloor;
        const remaining = (0, this.deps.getSkyTowerRemainingClears)();
        const first = !tower.clearedFloors.includes(floor);
        const reward = (0, this.deps.getSkyTowerRewardAmount)(floor);
        // 지도 완료 행동 '중단'으로 멈춘 탑은 탐험 중이 아니다: 그 층에 다시 들어가는 단추를 보인다(미궁과 같다)
        const current = this.deps.game.currentZoneId === this.deps.SKY_TOWER_ZONE_ID && !this.deps.game.combatHalted;
        const ready = (0, this.deps.canEnterSkyTower)();
        const rewardText = first ? (0, this.deps._t)('{reward}개 확정', { reward }) : (0, this.deps._t)('{max}개, 16% 확률', { max: Math.max(1,Math.floor(reward*.35)) });
        const title = !remaining ? (current ? (0, this.deps._t)('{floor}층 연습 중', { floor }) : '이번 루프 보상 완료') : (0, this.deps._t)('{floor}층 {value}', { floor, value: current?(0, this.deps._t)('탐험 중'):(0, this.deps._t)('입장 준비') });
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${title}</strong>${(0, this.deps.buildMapPowerEstimateHtml)((0, this.deps.getZone)(this.deps.SKY_TOWER_ZONE_ID))}</div>
            <dl><div><dt>${first?(0, this.deps._t)('첫 돌파 보상'):(0, this.deps._t)('반복 돌파 보상')}</dt><dd>${(0, this.deps._t)('응축된 창공의 정수')}<small>${remaining?rewardText:(0, this.deps._t)('이번 루프 보상 소진, 다음 루프에 재개')}</small></dd></div>
            <div><dt>${(0, this.deps._t)('이번 루프 남은 보상 전투')}</dt><dd>${(0, this.deps._t)('{remaining} / {skyTowerLoopClearLimit}회', { remaining, skyTowerLoopClearLimit: (0, this.deps.getSkyTowerLoopClearLimit)() })}<small>${(0, this.deps._t)('첫 돌파/반복 돌파 모두 1회 사용')}</small></dd></div></dl>
            <div class="map-expedition-result"><span>${(0, this.deps._t)('영구 기록')}</span><strong>${(0, this.deps._t)('{length}개 층 돌파', { length: tower.clearedFloors.length })}</strong><span>${(0, this.deps._t)('최고 입장 {highestFloor}층', { highestFloor: tower.highestFloor })}</span></div>
            ${this.skyLastResult(tower)}
            ${ready?'':(0, this.deps._t)('<p>이번 루프 혼돈 입성 후 입장할 수 있습니다.</p>')}
            <details class="map-expedition-details" id="sky-tower-guide"><summary>${(0, this.deps._t)('등반, 보상 규칙')}</summary>
            <p>${(0, this.deps._t)('새 층을 돌파하면 다음 층이 열립니다. 25회 소진 후에는 등반 기록과 응축 보상이 늘지 않습니다.')}</p>
            <p>${(0, this.deps._t)('돌파 기록/응축된 창공의 정수/영구 강화는 루프를 넘어 유지됩니다. 보상 전투 횟수만 루프마다 회복됩니다.')}</p></details>
            <div class="map-expedition-actions">${this.skyEntryActions(tower, remaining, ready)}</div></div>`;
    }

    skyLastResult(tower) {
        const result = tower.lastResult;
        if (!result) return '';
        const title = result.kind === 'practice' ? '연습 완료' : result.kind === 'first' ? '첫 돌파' : '반복 돌파';
        const reward = result.kind === 'practice' ? '등반 보상 없음' : result.condensedPower > 0
            ? (0, this.deps._t)('응축된 창공의 정수 +{condensedPower}', { condensedPower: result.condensedPower }) : '정수 없음';
        return `<div class="map-expedition-result"><strong>${(0, this.deps._t)('{floor}층 {title}', { floor: result.floor, title })}</strong><span>${reward}</span></div>`;
    }

    skyEntryActions(tower, remaining, ready) {
        const disabled = ready ? '' : 'disabled';
        const action = this.deps.game.currentZoneId === this.deps.SKY_TOWER_ZONE_ID && !this.deps.game.combatHalted ? `<button onclick="switchTab('tab-battle')">${(0, this.deps._t)('전투 보기')}</button>` :
            `<button data-exploration-departure onclick="enterSkyTowerPrompt(${tower.currentFloor})" ${disabled}>${(0, this.deps._t)('{currentFloor}층 {value}', { currentFloor: tower.currentFloor, value: remaining?(0, this.deps._t)('입장'):(0, this.deps._t)('연습 입장') })}</button>`;
        const other = tower.highestFloor > 1 ? `<button data-exploration-departure onclick="enterSkyTowerPrompt()" ${disabled}>${(0, this.deps._t)('다른 층 선택')}</button>` : '';
        const next = ready ? '' : this.deps.contentUnlockUi.progressButton('map-explore-chaos', '혼돈으로 가는 길 보기');
        return action + other + next;
    }

    skyGrowth(tower) {
        const level = tower.skyStone.level;
        const max = (0, this.deps.getSkyStoneMaxLevel)();
        const cost = (0, this.deps.getSkyStoneNextCost)();
        const gemUnlocked = this.deps.contentProgression.isUnlocked('gemForge');
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${(0, this.deps._t)('영구 강화')}</strong><span>${(0, this.deps._t)('응축된 창공의 정수 {condensedPower}개', { condensedPower: tower.condensedPower })}</span></div>
            <dl><div><dt>${(0, this.deps._t)('창공석, {level}/{max}', { level, max })}</dt><dd>${(0, this.deps._t)('지하계 중력 패널티 감소 {skyStoneReductionPct}%', { skyStoneReductionPct: (0, this.deps.getSkyStoneReductionPct)() })}<small>${level>=max?(0, this.deps._t)('최대 강화'):(0, this.deps._t)('다음 단계 {value}%, 필요 {cost}개', { value: (0, this.deps.getSkyStoneReductionPct)()+5, cost })}</small></dd></div>
            <div><dt>${(0, this.deps._t)('공격 룬 영구 강화')}</dt><dd>${(0, this.deps._t)('룬 레벨 최대 +{skyTowerGemBoostMaxLevel}', { skyTowerGemBoostMaxLevel: (0, this.deps.getSkyTowerGemBoostMaxLevel)() })}<small>${gemUnlocked?(0, this.deps._t)('룬별 60 → 120 → 240개'):(0, this.deps._t)('룬 강화 해금 필요')}</small></dd></div></dl>
            <div class="map-expedition-actions"><button onclick="upgradeSkyStone()" ${level>=max||tower.condensedPower<cost?'disabled':''}>${(0, this.deps._t)('창공석 {value}', { value: level?(0, this.deps._t)('강화'):(0, this.deps._t)('제작') })}</button>
            <button onclick="switchTab('tab-skills'); switchSkillSubtab('skill-tab-enhance')" ${gemUnlocked?'':'disabled'}>${(0, this.deps._t)('룬 강화로 이동')}</button></div></div>`;
    }
}
