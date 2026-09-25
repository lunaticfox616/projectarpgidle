// Read-only summaries; choices and payouts stay in their existing owners.
const sideEncounterUi = (() => {
    let lastHudHtml = '';

    // Keep the action row connected while combat estimates and countdowns change.
    function renderPanel(panel, html) {
        if (panel.__lastHtml === html) return;
        if (!html) { panel.replaceChildren(); panel.__lastHtml = html; return; }
        const template = document.createElement('template');
        template.innerHTML = html;
        const intro = template.content.firstElementChild;
        const actions = intro.querySelector('.map-expedition-actions');
        actions.remove();
        const bodyHtml = intro.innerHTML;
        let body = panel.querySelector('.map-expedition-content');
        if (!body) {
            intro.innerHTML = '<div class="map-expedition-content"></div>';
            intro.append(actions);
            panel.replaceChildren(intro);
            body = intro.firstElementChild;
        }
        if (body.innerHTML !== bodyHtml) {
            captureUiDisclosureState(body);
            body.innerHTML = bodyHtml;
            restoreUiDisclosureState(body);
        }
        refreshActions(panel.querySelector('.map-expedition-actions'), actions);
        panel.__lastHtml = html;
    }

    function refreshActions(current, next) {
        const signature = row => [...row.children].map(el => `${el.tagName}:${el.getAttribute('onclick')}`).join('|');
        if (signature(current) !== signature(next)) { current.replaceChildren(...next.children); return; }
        [...next.children].forEach((child, index) => {
            const target = current.children[index];
            if (target.textContent !== child.textContent) target.textContent = child.textContent;
            if (child.tagName === 'BUTTON') target.disabled = child.disabled;
        });
    }

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
        if (!contentProgression.canDropCurrency('voidChisel')) return `<strong>${heading}</strong><span>처치 <b>${reward.kills}</b></span><small>주얼 해금 후 제작 재화 획득</small>`;
        const next = run.phase === 'survival' ? `다음 보상까지 ${nextKills}마리` : '군주 처치 시 지급';
        return `<strong>${heading}</strong><span>처치 <b>${reward.kills}</b></span>
            <span>격파 보상 <b>공허의 끌 ${reward.voidChisel}</b></span><small>${next}</small>`;
    }

    function updateHud(zone) {
        updateMeteorProgress(zone);
        updateColonyProgress(zone);
        const host = document.getElementById('side-encounter-hud');
        if (!host) return;
        const run = game.voidRift && game.voidRift.grandRun;
        const active = zone.type === 'grandBreach' && run && run.inRun;
        host.toggleAttribute('hidden', !active);
        if (!active) { lastHudHtml = ''; return; }
        const html = grandSummary(run);
        if (html !== lastHudHtml) { host.innerHTML = html; lastHudHtml = html; }
        const seconds = Math.max(0, run.timeLeft);
        const survival = run.phase === 'survival';
        setTextById('ui-progress-label', survival ? '남은 시간' : '최종 전투');
        setTextById('ui-move-time-text', survival ? `${Math.ceil(seconds)}초` : '군주 처치');
        setCombatProgressGaugePercent(survival ? seconds / GRAND_BREACH_ENCOUNTER.durationSeconds * 100 : 100);
    }

    function updateMeteorProgress(zone) {
        if (zone.type !== 'meteor' || game.moveTimer > 0) return;
        const bossAlive = game.enemies.some(enemy => enemy.isBoss && enemy.hp > 0);
        setTextById('ui-progress-label', bossAlive ? '운석 핵 파괴' : '운석 접근');
        setTextById('ui-move-time-text', bossAlive ? '처치 중' : `${game.runProgress.toFixed(0)}%`);
    }

    function updateColonyProgress(zone) {
        if (zone.type !== 'colony' || !game.colony.inRun) return;
        const {wave, kills, requiredKills} = game.colony;
        setTextById('ui-progress-label', `${wave}웨이브`);
        setTextById('ui-move-time-text', `${kills}/${requiredKills} 처치`);
        setCombatProgressGaugePercent(requiredKills > 0 ? kills / requiredKills * 100 : 0);
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
        const expanded = host.querySelector('details')?.open;
        const focused = host.querySelector('summary') === document.activeElement;
        const links = available.map(row => `<button type="button" onclick="switchMapExploreSubtab('map-explore-${row.id}')"><small>${row.active ? '진행 중' : '입장 가능'}</small>${row.name}</button>`).join('');
        const html = `<button type="button" onclick="switchTab('tab-battle')"><small>현재 위치</small>${current}</button>`
            + (available.length ? `<details><summary>원정 ${available.length}</summary><div>${links}</div></details>` : '');
        host.hidden = false;
        if (host._destinationsMarkup === html) return;
        host.innerHTML = html;
        host._destinationsMarkup = html;
        const details = host.querySelector('details');
        if (details) details.open = !!expanded;
        if (focused) host.querySelector('summary')?.focus({preventScroll:true});
    }

    function hivePanel(hive, choices, power) {
        const keys = Math.max(0,game.currencies.hiveKey || 0);
        if (!hive.inRun) return `<div class="map-expedition-intro"><p class="map-expedition-type">갈림길을 직접 고르는 원정 · 10갈래 후 여왕</p>
            <dl><div><dt>주요 전리품</dt><dd>꽃가루 · 독벌침 · 벌꿀 · 밀랍</dd></div>
            <div><dt>입장 비용</dt><dd>벌집 열쇠 1개 <small>보유 ${keys}개</small></dd></div></dl>
            ${power}<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startBeehiveRun()" ${keys>0?'':'disabled'}>벌집 입장</button>
            ${keys>0?'':'<span>벌집 열쇠가 필요합니다.</span>'}</div></div>`;
        const level = getBeekeeperLevelForHive();
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${hive.queenActive?'여왕벌 전투':`갈림길 ${Math.min(10,hive.branchStep)}/10`}</strong>${power}</div>
            ${hiveSummary(hive)}${choices}<details class="map-expedition-details"><summary>원정 정보 · 보유 재료</summary>
            <p>양봉업자 Lv.${level} · 형체 없는 이슬 Lv.3 · 황금률 Lv.5</p>
            <p>꽃가루 ${game.currencies.pollen||0} · 독벌침 ${game.currencies.venomStinger||0} · 벌꿀 ${game.currencies.enchantedHoney||0} · 밀랍 ${game.currencies.beeswax||0}</p></details>
            <div class="map-expedition-actions"><button type="button" onclick="switchTab('tab-battle')">전투 보기</button><button type="button" onclick="forfeitBeehiveRun()">원정 포기</button></div></div>`;
    }

    function grandActions(rift) {
        if (rift.grandRun?.inRun) return '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>';
        const hint = rift.grandBreachUnlock ? '' : `<span>공허 균열 완료 시 ${Math.round(GRAND_BREACH_ENCOUNTER.unlockChance * 100)}% 확률로 열립니다.</span>`;
        return `<button type="button" data-exploration-departure onclick="enterGrandBreach()" ${rift.grandBreachUnlock?'':'disabled'}>대균열 입장</button>${hint}`;
    }

    function grandResult(run) {
        if (!run || run.inRun || !['done','failed'].includes(run.phase)) return '';
        const cleared = run.phase === 'done';
        const paid = run.rewardVoidChisel;
        let reward = '군주 보상 없음';
        if (cleared) reward = paid == null ? '정산 완료' : '지급된 제작 재화 없음';
        if (cleared && paid > 0) reward = `공허의 끌 +${paid}`;
        return `<div class="map-expedition-result" aria-label="최근 원정 결과"><span>최근 원정</span>
            <strong>${cleared?'군주 격파':'군주 격파 실패'}</strong><span>생존 구간 ${Math.max(0,Math.floor(run.kills||0))}처치</span>
            <b>${reward}</b></div>`;
    }

    function grandPanel(rift, power) {
        const run = rift.grandRun;
        const current = run?.inRun;
        const waves = rift.active ? `${rift.defeatedCount || 0}/${rift.totalToSpawn || 0} 처치` : '혼돈 사냥 중 발생';
        const reward = contentProgression.canDropCurrency('voidChisel') ? '공허의 끌 2개부터 · 10마리 처치마다 +1개' : '주얼 해금 후 제작 재화 획득';
        return `<div class="map-expedition-intro"><p class="map-expedition-type">공허 균열 · ${waves}</p>
            <div class="map-expedition-heading"><strong>대균열 ${current?'진행 중':''}</strong>${power}</div>
            ${current ? `<p>${run.phase==='survival'?`남은 시간 ${Math.max(0,Math.ceil(run.timeLeft))}초`:'균열 군주 전투'}</p><div class="map-grand-summary">${grandSummary(run)}</div>` :
            `<dl><div><dt>전투 방식</dt><dd>${GRAND_BREACH_ENCOUNTER.durationSeconds}초간 몬스터 쇄도 → 균열 군주</dd></div><div><dt>격파 보상</dt><dd>${reward}</dd></div></dl>`}
            ${grandResult(run)}<div class="map-expedition-actions">${grandActions(rift)}</div></div>`;
    }

    function meteorPanel(power) {
        const active = game.currentZoneId === METEOR_FALL_ZONE_ID;
        const ready = game.starWedge.skyRiftReady;
        const percent = Math.min(100,Math.floor(game.starWedge.skyRiftGauge || 0));
        const reward = contentProgression.isUnlocked('meteor') ? '운석 파편 · 불완전한 별쐐기 · 천문학자 성장에 따른 추가 전리품' : '희귀 이상 장비';
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${active?'운석 원정 진행 중':ready?'원정 준비 완료':`하늘의 균열 충전 ${percent}%`}</strong>${power}</div>
            <dl><div><dt>주요 전리품</dt><dd>${reward}</dd></div>
            <div><dt>난이도</dt><dd>티어 ${getZone(METEOR_FALL_ZONE_ID).tier}<small>충전 중 기록한 최저 티어 기준</small></dd></div></dl>
            <div class="map-expedition-actions">${active?'<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>':
            `<button type="button" data-exploration-departure onclick="changeZone('${METEOR_FALL_ZONE_ID}')" ${ready?'':'disabled'}>운석 원정 입장</button>${ready?'':'<span>충전을 완료하면 1회 입장할 수 있습니다.</span>'}`}</div></div>`;
    }

    function labyrinthPanel(power) {
        const floor = Math.max(1,Math.floor(game.labyrinthFloor||1));
        const max = Math.max(floor,Math.floor(game.labyrinthUnlockedMaxFloor||1));
        const current = game.currentZoneId === LABYRINTH_ZONE_ID;
        const fossils = contentProgression.isUnlocked('fossil');
        const reward = fossils ? '미궁 화석 · 속성 화석' : '화석 제작 해금 후 전리품 획득';
        const owned = fossils ? `<small>미궁 화석 ${game.currencies.fossil||0}개 보유</small>` : '';
        const action = current ? '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>' : `<button type="button" data-exploration-departure onclick="enterLabyrinthFloor(${floor})">${floor}층 입장</button>`;
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${floor}층 ${current?'탐험 중':'입장 준비'}</strong>${power}</div>
            <dl><div><dt>층 돌파</dt><dd>다음 층 개방<small>입장 가능 1 ~ ${max}층</small></dd></div>
            <div><dt>층 완료 시 확률 획득</dt><dd>${reward}${owned}</dd></div></dl>
            <div class="map-expedition-actions">${action}${max>1?'<button type="button" data-exploration-departure onclick="enterLabyrinthPrompt()">층 선택</button>':''}</div></div>`;
    }

    function timePressure(rift) {
        const pressure = rift.pressure;
        const odds = getTimeRiftFusionOdds(pressure);
        const locked = rift.altarOpen || [TIME_RIFT_PAST_ZONE_ID,TIME_RIFT_FUTURE_ZONE_ID].includes(game.currentZoneId);
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>시간압 ${pressure}</strong>
            <span>혼돈 ${getTimeRiftEquivalentChaosDepth(pressure)} 상당 · 전투 난이도 ${getTimeRiftDifficultyTier(pressure)}</span></div>
            <div class="time-rift-odds"><span>완벽 <b>${Math.round(odds.perfect*100)}%</b><small>옵션 손실 없음</small></span>
            <span>보통 <b>${Math.round(odds.normal*100)}%</b><small>희귀 옵션 1개 손실</small></span>
            <span>불안정 <b>${Math.round(odds.unstable*100)}%</b><small>희귀 옵션 2개 손실</small></span></div>
            <div class="map-expedition-actions"><button type="button" aria-label="시간압 낮추기" onclick="setTimeRiftPressure(-1)" ${locked||pressure<=1?'disabled':''}>−</button>
            <button type="button" aria-label="시간압 높이기" onclick="setTimeRiftPressure(1)" ${locked||pressure>=TIME_RIFT_MAX_PRESSURE?'disabled':''}>+</button><span>${locked?'이번 제단의 시간압 고정':'시간압을 높이면 전투가 어려워지고 완벽 확률이 증가합니다.'}</span></div></div>`;
    }

    function timePast(rift) {
        const current = game.currentZoneId === TIME_RIFT_PAST_ZONE_ID;
        const action = current ? '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>' :
            `<button type="button" data-exploration-departure onclick="changeZone('${TIME_RIFT_PAST_ZONE_ID}')" ${rift.altarOpen?'disabled':''}>과거 입장</button>`;
        return `<div class="map-expedition-intro"><h3>1. 과거</h3><strong>${rift.altarOpen?'제단 개방 완료':'과거를 돌파해 제단 개방'}</strong>
            ${buildMapPowerEstimateHtml(getZone(TIME_RIFT_PAST_ZONE_ID))}<p>제단을 열면 장비 두 개를 올릴 수 있습니다.</p>
            <div class="map-expedition-actions">${action}</div></div>`;
    }

    function timeAltar(rift) {
        const selected = getSelectedCraftItem();
        const issue = isCraftSelectionEquip() ? '장착 중인 장비는 먼저 해제하세요.' : getTimeAltarItemIssue(selected,rift);
        const filled = [rift.altarUnique,rift.altarRare].some(Boolean);
        const ready = [rift.altarUnique,rift.altarRare].every(Boolean);
        const selection = timeAltarSelection(selected,issue,ready);
        return `<div class="map-expedition-intro"><h3>2. 제단</h3><strong>같은 부위의 고유 + 희귀</strong>
            <dl><div><dt>고유</dt><dd>${rift.altarUnique?escapeHTML(rift.altarUnique.name):'비어 있음'}</dd></div>
            <div><dt>희귀</dt><dd>${rift.altarRare?escapeHTML(rift.altarRare.name):'비어 있음'}</dd></div></dl>
            ${selection}
            <div class="map-expedition-actions"><button type="button" onclick="openCraftItemPickerOverlay('altar')" ${!rift.altarOpen||ready?'disabled':''}>장비 고르기</button>
            <button type="button" onclick="placeItemOnTimeAltar()" ${issue?'disabled':''}>선택 장비 올리기</button>
            <button type="button" onclick="retrieveTimeAltarItems()" ${rift.altarOpen?'':'disabled'}>${filled?'제단 회수':'빈 제단 닫기'}</button></div></div>`;
    }

    function timeAltarSelection(selected,issue,ready) {
        if (ready) return '<p>두 장비가 준비되었습니다.</p>';
        const name = selected ? `<p class="time-rift-selected">${escapeHTML(selected.name)}</p>` : '';
        return `${name}<p>${escapeHTML(issue||'이 장비를 제단에 올릴 수 있습니다.')}</p>`;
    }

    function timeFuture(rift) {
        const current = game.currentZoneId === TIME_RIFT_FUTURE_ZONE_ID;
        const issue = getTimeRiftFusionMismatchReason(rift.altarUnique,rift.altarRare);
        const action = current ? '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>' :
            `<button type="button" data-exploration-departure onclick="changeZone('${TIME_RIFT_FUTURE_ZONE_ID}')" ${issue?'disabled':''}>미래 입장</button>`;
        return `<div class="map-expedition-intro"><h3>3. 미래</h3><strong>희귀 옵션을 고유에 계승</strong>
            ${buildMapPowerEstimateHtml(getZone(TIME_RIFT_FUTURE_ZONE_ID))}<p>${escapeHTML(issue||'융합 준비 완료')}</p>
            <details class="map-expedition-details" id="time-rift-fusion-rules"><summary>융합 규칙</summary>
            <p>미래 클리어 시 두 장비를 소모해 융합 유물 1개를 만듭니다. 등급에 따라 희귀 옵션 0~2개가 사라집니다.</p>
            <p>융합 후에는 황금률·잿불가지·축복의 꽃잎만 사용할 수 있습니다. 실패해도 제단 장비는 남고, 루프를 건너도 보존됩니다.</p></details>
            <div class="map-expedition-actions">${action}</div></div>`;
    }

    function timeRiftPanel(host,rift) {
        if (!host.querySelector('.time-rift-stages')) host.innerHTML = '<div class="time-rift-pressure"></div><div class="time-rift-stages"><section aria-label="과거" data-rift-stage="past"></section><section aria-label="제단" data-rift-stage="altar"></section><section aria-label="미래" data-rift-stage="future"></section></div>';
        renderPanel(host.querySelector('.time-rift-pressure'),timePressure(rift));
        renderPanel(host.querySelector('[data-rift-stage="past"]'),timePast(rift));
        renderPanel(host.querySelector('[data-rift-stage="altar"]'),timeAltar(rift));
        renderPanel(host.querySelector('[data-rift-stage="future"]'),timeFuture(rift));
    }

    function colonyPanel(colony,zone) {
        const traces = Math.max(0,game.currencies.colonyTrace||0);
        const completed = Math.max(0,Math.floor(colony.wave||0)-1);
        const stage = colony.inRun ? `${colony.wave}웨이브 · ${colony.kills}/${colony.requiredKills}처치` : '방어전 입장 준비';
        const returnNote = colony.inRun ? '현재 원정' : '최근 원정';
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${stage}</strong>${buildMapPowerEstimateHtml(zone)}</div>
            <dl><div><dt>입장 비용</dt><dd>군락지 흔적 1개<small>보유 ${traces}개 · 기준 혼돈 심화 ${zone.entryDeepChaosDepth}</small></dd></div>
            <div><dt>웨이브 돌파 보상</dt><dd>군락지 편린 · 액막이 부적<small>5웨이브마다 액막이 확정 · 10웨이브마다 흔적 1개</small></dd></div></dl>
            <div class="map-expedition-result"><span>${returnNote}</span><strong>완료 ${completed}웨이브</strong><span>최고 도달 ${Math.max(0,colony.highestWave||0)}웨이브</span></div>
            <details class="map-expedition-details" id="colony-entry-guide"><summary>입장권 획득처 · 진행 규칙</summary>
            <p>혼돈 심화 21층 이상·벌집·대균열에서 군락지 흔적을 얻습니다. 웨이브를 돌파하면 보상을 즉시 받고 다음 무리가 시작됩니다.</p>
            <p>철수해도 받은 보상은 유지됩니다. 새 도전은 1웨이브부터 시작합니다.</p></details>
            <div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startColonyRun()" ${traces<=0||colony.inRun?'disabled':''}>군락지 입장</button>
            <button type="button" onclick="forfeitColonyRun()" ${colony.inRun?'':'disabled'}>철수</button>
            <button type="button" onclick="switchTab('tab-talisman'); switchTalismanSubtab('talisman-sub-colony-ward')">액막이 관리</button>
            <span>보조장비 · ${colony.wardSlots}/4슬롯 · 편린 ${game.currencies.colonyShard||0}개</span></div></div>`;
    }

    function skyPanel(tower) {
        if (!tower.unlocked) return `<div class="map-expedition-intro"><h3>창공의 탑 · 봉인됨</h3>
            <p>루프 15에서 혼돈 20을 돌파하면 해금됩니다. 루프 16부터는 해금을 유지합니다.</p>
            <div class="map-expedition-actions"><button disabled>혼돈 입성 필요</button></div></div>`;
        const floor = tower.currentFloor;
        const remaining = getSkyTowerRemainingClears();
        const first = !tower.clearedFloors.includes(floor);
        const reward = getSkyTowerRewardAmount(floor);
        const current = game.currentZoneId === SKY_TOWER_ZONE_ID;
        const ready = canEnterSkyTower();
        const rewardText = first ? `${reward}개 확정` : `${Math.max(1,Math.floor(reward*.35))}개 · 16% 확률`;
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${floor}층 ${current?'탐험 중':'입장 준비'}</strong>${buildMapPowerEstimateHtml(getZone(SKY_TOWER_ZONE_ID))}</div>
            <dl><div><dt>${first?'첫 돌파 보상':'반복 돌파 보상'}</dt><dd>응축된 창공의 힘<small>${remaining?rewardText:'이번 루프 보상 소진 · 다음 루프에 재개'}</small></dd></div>
            <div><dt>이번 루프 남은 보상 전투</dt><dd>${remaining} / ${getSkyTowerLoopClearLimit()}회<small>첫 돌파·반복 돌파 모두 1회 사용</small></dd></div></dl>
            <div class="map-expedition-result"><span>영구 기록</span><strong>${tower.clearedFloors.length}개 층 돌파</strong><span>최고 입장 ${tower.highestFloor}층</span></div>
            ${ready?'':'<p>이번 루프 혼돈 입성 후 입장할 수 있습니다.</p>'}
            <details class="map-expedition-details" id="sky-tower-guide"><summary>등반 · 보상 규칙</summary>
            <p>일반 지역의 5배 길이입니다. 새 층을 돌파하면 다음 층이 열립니다. 25회 소진 후에는 등반 기록과 응축 보상이 늘지 않습니다.</p>
            <p>돌파 기록·응축된 창공의 힘·영구 강화는 루프를 넘어 유지됩니다. 보상 전투 횟수만 루프마다 회복됩니다.</p></details>
            <div class="map-expedition-actions">${skyEntryActions(tower,remaining)}</div></div>`;
    }

    function skyEntryActions(tower,remaining) {
        const disabled = canEnterSkyTower() ? '' : 'disabled';
        const action = game.currentZoneId === SKY_TOWER_ZONE_ID ? '<button onclick="switchTab(\'tab-battle\')">전투 보기</button>' :
            `<button data-exploration-departure onclick="enterSkyTowerPrompt(${tower.currentFloor})" ${disabled}>${tower.currentFloor}층 ${remaining?'입장':'연습 입장'}</button>`;
        return action + (tower.highestFloor>1?`<button data-exploration-departure onclick="enterSkyTowerPrompt()" ${disabled}>다른 층 선택</button>`:'');
    }

    function skyGrowth(tower) {
        const level = tower.skyStone.level;
        const max = getSkyStoneMaxLevel();
        const cost = getSkyStoneNextCost();
        const gemUnlocked = contentProgression.isUnlocked('gemForge');
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>영구 강화</strong><span>응축된 창공의 힘 ${tower.condensedPower}개</span></div>
            <dl><div><dt>창공석 · ${level}/${max}</dt><dd>지하계 패널티 감소 ${getSkyStoneReductionPct()}%<small>${level>=max?'최대 강화':`다음 단계 ${getSkyStoneReductionPct()+5}% · 필요 ${cost}개`}</small></dd></div>
            <div><dt>공격 젬 영구 강화</dt><dd>젬 레벨 최대 +${getSkyTowerGemBoostMaxLevel()}<small>${gemUnlocked?'젬별 60 → 120 → 240개':'젬 강화 해금 필요'}</small></dd></div></dl>
            <div class="map-expedition-actions"><button onclick="upgradeSkyStone()" ${level>=max||tower.condensedPower<cost?'disabled':''}>창공석 ${level?'강화':'제작'}</button>
            <button onclick="switchTab('tab-skills'); switchSkillSubtab('skill-tab-enhance')" ${gemUnlocked?'':'disabled'}>젬 강화로 이동</button></div></div>`;
    }

    return { hiveSummary, updateHud, refreshDestinations, hivePanel, grandPanel, meteorPanel, labyrinthPanel, timeRiftPanel, colonyPanel, skyPanel, skyGrowth, renderPanel };
})();
