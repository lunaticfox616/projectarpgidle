// Read-only summaries; choices and payouts stay in their existing owners.
const sideEncounterUi = (() => {
    let lastHudHtml = '';

    function rows(values, empty) {
        const counts = new Map();
        values.filter(Boolean).forEach(value => counts.set(String(value), (counts.get(String(value)) || 0) + 1));
        if (!counts.size) return `<li class="expedition-empty">${empty}</li>`;
        return [...counts].map(([text,count]) => `<li>${escapeHTML(text)}${count > 1 ? ` <small>×${count}</small>` : ''}</li>`).join('');
    }

    function hiveSummary(hive) {
        const penalties = Array.isArray(hive.penaltyLedger) ? hive.penaltyLedger : [];
        const rewards = (Array.isArray(hive.rewardLedger) ? hive.rewardLedger : []).filter(row => row !== '보상 획득 실패');
        const queen = (Array.isArray(hive.pendingQueenRewards) ? hive.pendingQueenRewards : [])
            .map(reward => String(reward.text || '').replace(/^\[[^\]]+\]\s*/, ''));
        const power = Math.max(0, Math.floor(hive.enemyEmpower || 0));
        return `<section class="expedition-ledger" aria-label="벌집 위험과 보상">
            <div class="expedition-ledger-risk"><h3>누적 위험 <b>군체 강화 ${power}</b></h3><ul>${rows(penalties,'선택한 위험 없음')}</ul></div>
            <div><h3>확보 보상 <b>이미 지급됨</b></h3><ul>${rows(rewards,'아직 없음')}</ul>
                ${hive.pendingWaveRewardText ? `<p>이번 무리 처치 후 · ${escapeHTML(hive.pendingWaveRewardText)}</p>` : ''}</div>
            <div class="expedition-ledger-queen"><h3>여왕 처치 시 <b>보류 중</b></h3>
                <ul>${rows(queen,'아직 보류한 보상 없음')}</ul><p>확률 보상은 처치 시 추첨</p></div>
        </section>`;
    }

    function grandSummary(run) {
        const reward = getGrandBreachRewardSummary(run.kills);
        const nextKills = 10 - reward.kills % 10;
        const heading = run.phase === 'survival' ? '균열 쇄도' : '균열 군주';
        const next = run.phase === 'survival' ? `다음 보상까지 ${nextKills}마리` : '군주 처치 시 지급';
        return `<strong>${heading}</strong><span>처치 <b>${reward.kills}</b></span>
            <span>격파 보상 <b>공허의 끌 ${reward.voidChisel}</b></span><small>${next}</small>`;
    }

    function updateHud(zone) {
        const host = document.getElementById('side-encounter-hud');
        if (!host) return;
        const run = game.voidRift && game.voidRift.grandRun;
        const active = zone.type === 'grandBreach' && run && run.inRun;
        host.hidden = !active;
        if (!active) { lastHudHtml = ''; return; }
        const html = grandSummary(run);
        if (html !== lastHudHtml) { host.innerHTML = html; lastHudHtml = html; }
        const seconds = Math.max(0, run.timeLeft);
        const survival = run.phase === 'survival';
        setTextById('ui-progress-label', survival ? '남은 시간' : '최종 전투');
        setTextById('ui-move-time-text', survival ? `${Math.ceil(seconds)}초` : '군주 처치');
        setCombatProgressGaugePercent(survival ? seconds / GRAND_BREACH_ENCOUNTER.durationSeconds * 100 : 100);
    }

    function destinations() {
        const blocked = isBeehiveRunLockedForMapTravel();
        return [
            {id:'beehive',name:'벌집 원정',active:game.beehive.inRun,ready:!blocked && game.currencies.hiveKey>0},
            {id:'voidrift',name:'대균열',active:game.voidRift.grandRun?.inRun,ready:!blocked && game.voidRift.grandBreachUnlock},
            {id:'meteor',name:'운석 낙하',active:game.currentZoneId===METEOR_FALL_ZONE_ID,ready:!blocked && game.starWedge.skyRiftReady}
        ];
    }

    function refreshDestinations() {
        const host = document.getElementById('map-ready-destinations');
        if (!host) return;
        const available = destinations().filter(row => isMapExploreSubtabOpenable('map-explore-'+row.id) && (row.active || row.ready));
        const current = escapeHTML(getZone(game.currentZoneId).name);
        const html = `<button type="button" onclick="switchTab('tab-battle')"><small>현재</small>${current}</button>` + available.map(row =>
            `<button type="button" onclick="switchMapExploreSubtab('map-explore-${row.id}')"><small>${row.active ? '진행 중' : '입장 가능'}</small>${row.name}</button>`).join('');
        host.hidden = false;
        if (host.innerHTML !== html) host.innerHTML = html;
    }

    function hivePanel(hive, choices, power) {
        const keys = Math.max(0,game.currencies.hiveKey || 0);
        if (!hive.inRun) return `<div class="map-expedition-intro"><p class="map-expedition-type">갈림길을 직접 고르는 원정 · 10갈래 후 여왕</p>
            <dl><div><dt>주요 전리품</dt><dd>꽃가루 · 독벌침 · 벌꿀 · 밀랍</dd></div>
            <div><dt>입장 비용</dt><dd>벌집 열쇠 1개 <small>보유 ${keys}개</small></dd></div></dl>
            ${power}<div class="map-expedition-actions"><button type="button" onclick="startBeehiveRun()" ${keys>0?'':'disabled'}>벌집 입장</button>
            ${keys>0?'':'<span>벌집 열쇠가 필요합니다.</span>'}</div></div>`;
        const level = getBeekeeperLevelForHive();
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${hive.queenActive?'여왕벌 전투':`갈림길 ${Math.min(10,hive.branchStep)}/10`}</strong>${power}</div>
            ${hiveSummary(hive)}${choices}<details class="map-expedition-details"><summary>원정 정보 · 보유 재료</summary>
            <p>양봉업자 Lv.${level} · 카오스 Lv.3 · 신성한 오브 Lv.5</p>
            <p>꽃가루 ${game.currencies.pollen||0} · 독벌침 ${game.currencies.venomStinger||0} · 벌꿀 ${game.currencies.enchantedHoney||0} · 밀랍 ${game.currencies.beeswax||0}</p></details>
            <div class="map-expedition-actions"><button type="button" onclick="switchTab('tab-battle')">전투 보기</button><button type="button" onclick="forfeitBeehiveRun()">원정 포기</button></div></div>`;
    }

    function grandPanel(rift, power) {
        const run = rift.grandRun;
        const current = run?.inRun;
        const waves = rift.active ? `${rift.activeKills}/${rift.requiredKills} 처치` : '일반 사냥 중 발생';
        return `<div class="map-expedition-intro"><p class="map-expedition-type">공허 균열 · ${waves}</p>
            <div class="map-expedition-heading"><strong>대균열 ${current?'진행 중':''}</strong>${power}</div>
            ${current ? `<p>${run.phase==='survival'?`남은 시간 ${Math.max(0,Math.ceil(run.timeLeft))}초`:'균열 군주 전투'}</p><div class="map-grand-summary">${grandSummary(run)}</div>` :
            `<dl><div><dt>전투 방식</dt><dd>${GRAND_BREACH_ENCOUNTER.durationSeconds}초간 몬스터 쇄도 → 균열 군주</dd></div><div><dt>격파 보상</dt><dd>공허의 끌 2개부터 · 10마리 처치마다 +1개</dd></div></dl>`}
            <div class="map-expedition-actions">${current?'<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>':
            `<button type="button" onclick="enterGrandBreach()" ${rift.grandBreachUnlock?'':'disabled'}>대균열 입장</button>${rift.grandBreachUnlock?'':'<span>공허 균열을 완료하면 입장할 수 있습니다.</span>'}`}</div></div>`;
    }

    function meteorPanel(power) {
        const active = game.currentZoneId === METEOR_FALL_ZONE_ID;
        const ready = game.starWedge.skyRiftReady;
        const percent = Math.min(100,Math.floor(game.starWedge.skyRiftGauge || 0));
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${active?'운석 원정 진행 중':ready?'원정 준비 완료':`하늘의 균열 충전 ${percent}%`}</strong>${power}</div>
            <dl><div><dt>주요 전리품</dt><dd>별쐐기 해금 전: 희귀 이상 장비<br>해금 후: 운석 파편 · 별쐐기</dd></div>
            <div><dt>난이도</dt><dd>티어 ${getZone(METEOR_FALL_ZONE_ID).tier}<small>충전 중 기록한 최저 티어 기준</small></dd></div></dl>
            <div class="map-expedition-actions">${active?'<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>':
            `<button type="button" onclick="changeZone('${METEOR_FALL_ZONE_ID}')" ${ready?'':'disabled'}>운석 원정 입장</button>${ready?'':'<span>충전을 완료하면 1회 입장할 수 있습니다.</span>'}`}</div></div>`;
    }

    return { hiveSummary, updateHud, refreshDestinations, hivePanel, grandPanel, meteorPanel };
})();
