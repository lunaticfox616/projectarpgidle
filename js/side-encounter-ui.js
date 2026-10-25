// Read-only summaries; choices and payouts stay in their existing owners.
const sideEncounterUi = (() => {
    let lastHudHtml = '';
    let labyrinthChoice = { owner: null, season: 0, floor: 1, current: 1 };

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
        const wax = 1 + Math.floor(Math.min(30, power) / 6);
        const stinger = 1 + Math.floor(Math.min(30, power) / 10);
        return `<section class="expedition-ledger" aria-label="벌집 위험과 보상">
            <div class="expedition-ledger-risk"><h3>누적 위험 <b>군체 강화 ${power}</b></h3><ul>${rows(penalties,'선택한 위험 없음')}</ul></div>
            <div><h3>확보 보상 <b>이미 지급됨</b></h3><ul>${rows(rewards,'아직 없음')}</ul>
                ${hive.pendingWaveRewardText ? `<p>이번 무리 처치 후, ${escapeHTML(hive.pendingWaveRewardText)}</p>` : ''}</div>
            <div class="expedition-ledger-queen"><h3>여왕 처치 시 <b>보류 중</b></h3>
                <ul>${rows(queen,'아직 보류한 선택 보상 없음')}</ul><p>기본 전리품: 밀랍 ${wax}, 독벌침 ${stinger}. 확률 보상은 처치 시 추첨</p></div>
        </section>`;
    }

    function grandRewardPreview(reward) {
        const parts = [];
        if (contentProgression.canDropCurrency('voidChisel')) parts.push(`공허의 끌 ${reward.voidChisel}`);
        if (reward.jewelShard && contentProgression.canDropCurrency('jewelShard')) parts.push(`주얼 결정 ${reward.jewelShard}`);
        return parts.join(', ') || '제작 재화 해금 후 획득';
    }
    function usesGrandBreachArena() {
        const expedition = actExplorationState.current(game);
        if (expedition?.zoneId === 'grand_breach_run') return !!actExplorationMap.forRun(expedition).grandBreach;
        return !!getZone('grand_breach_run')?.exploration?.arena;
    }
    /** Time left before the lord must be called (GRAND_BREACH_ENCOUNTER.survivalLimitSeconds), as m:ss. */
    function grandTimeLeft(run) {
        const left = Number.isFinite(run.survivalEndsAt) ? run.survivalEndsAt - getCombatTime() : GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1000;
        const seconds = Math.max(0, Math.ceil(left / 1000));
        return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    }
    function grandSummary(run) {
        if (run.phase === 'loot') return `<strong>군주 격파</strong><span>전리품 수거 중</span><small>바닥 아이템을 모두 획득하면 귀환</small>`;
        const progress = getGrandBreachProgress(run.gauge);
        const reward = getGrandBreachRewardSummary(run.kills);
        const nextKills = 10 - reward.kills % 10;
        const pressure = Math.min(6, Math.floor(reward.kills / 10));
        const heading = { survival: '균열 쇄도', bossPending: '군주 소환' }[run.phase] || '균열 군주';
        const next = run.phase === 'survival' ? `남은 시간 ${grandTimeLeft(run)}, 다음 보상 증가까지 ${nextKills}마리`
            : run.phase === 'bossPending' ? '군주 소환 중' : '군주 처치 시 지급';
        const config = usesGrandBreachArena() ? GRAND_BREACH_ENCOUNTER.arena : GRAND_BREACH_ENCOUNTER;
        const crowd = run.inRun && run.phase === 'survival'
            ? `<span>현장 적 <b>${game.enemies.filter(enemy => enemy.hp > 0).length}/${config.capacities[progress.stage]}</b></span>` : '';
        return `<strong>${heading}</strong><span>게이지 <b>${progress.percent}%</b></span>
            <span>군주 압박 <b>${pressure}단계</b></span>
            ${crowd}<span class="grand-breach-reward">격파 보상 <b>${grandRewardPreview(reward)}</b></span><small>${next}</small>`;
    }

    function updateGrandBreachGauge(run) {
        if (run.phase === 'loot') { updateLootCollectionProgress(); return; }
        const progress = getGrandBreachProgress(run.gauge);
        const survival = run.phase === 'survival';
        const pending = run.phase === 'bossPending';
        setTextById('ui-progress-label', survival ? '균열 게이지' : pending ? '군주 소환' : '최종 전투');
        setTextById('ui-move-time-text', survival ? `${progress.percent}%, ${grandTimeLeft(run)}` : pending ? '100%' : '군주 처치');
        setCombatProgressGaugePercent(survival ? progress.percent : 100);
    }

    function updateHud(zone) {
        updateMeteorProgress(zone);
        updateColonyProgress(zone);
        updateEchoProgress(zone);
        const host = document.getElementById('side-encounter-hud');
        if (!host) return;
        const run = game.voidRift && game.voidRift.grandRun;
        const active = zone.type === 'grandBreach' && run && run.inRun;
        host.toggleAttribute('hidden', !active);
        if (!active) { lastHudHtml = ''; return; }
        const html = grandSummary(run);
        if (html !== lastHudHtml) { host.innerHTML = html; lastHudHtml = html; }
        updateGrandBreachGauge(run);
    }

    function updateMeteorProgress(zone) {
        if (zone.type !== 'meteor' || game.moveTimer > 0) return;
        const bossAlive = game.enemies.some(enemy => enemy.isBoss && enemy.hp > 0);
        setTextById('ui-progress-label', bossAlive ? '운석 핵 파괴' : '운석 접근');
        setTextById('ui-move-time-text', bossAlive ? '처치 중' : `${game.runProgress.toFixed(0)}%`);
    }

    /** 나무꾼의 잔상: 남은 시간. 방 단위 지도에서는 잔상이 일어설 때까지 30초 그대로 서 있다. */
    function updateEchoProgress(zone) {
        const run = game.woodsmanEchoRun;
        if (zone.type !== 'woodsmanEcho' || !run || !run.active) return;
        setTextById('ui-progress-label', '남은 시간');
        setTextById('ui-move-time-text', `${Math.ceil(Math.max(0, run.timeLeft))}초`);
        setCombatProgressGaugePercent(run.duration > 0 ? run.timeLeft / run.duration * 100 : 0);
    }

    function updateColonyProgress(zone) {
        if (zone.type !== 'colony' || !game.colony.inRun) return;
        if (game.colony.lootPending) { updateLootCollectionProgress(); return; }
        const {wave, kills, requiredKills, coreHp, coreMaxHp} = game.colony;
        if (!coreMaxHp) {
            setTextById('ui-progress-label', `${wave}웨이브`);
            setTextById('ui-move-time-text', `${kills}/${requiredKills} 처치`);
            setCombatProgressGaugePercent(requiredKills > 0 ? kills / requiredKills * 100 : 0);
            return;
        }
        const durability = Math.max(0, Math.ceil(coreHp / coreMaxHp * 100));
        setTextById('ui-progress-label', `${wave}웨이브, 군락 핵`);
        setTextById('ui-move-time-text', `${durability}%, ${kills}/${requiredKills} 처치`);
        setCombatProgressGaugePercent(durability);
    }
    function updateLootCollectionProgress() {
        const remaining = actExplorationState.current(game)?.groundLoot?.length || 0;
        setTextById('ui-progress-label', '전리품 수거');
        setTextById('ui-move-time-text', `${remaining}개 남음`);
        setCombatProgressGaugePercent(100);
    }

    function destinations() {
        const blocked = isBeehiveRunLockedForMapTravel();
        return [
            {id:'beehive',name:'벌집 원정',active:game.beehive.inRun,ready:!blocked && game.currencies.hiveKey>0},
            {id:'voidrift',name:'대균열',active:game.voidRift.grandRun?.inRun,ready:!blocked && game.voidRift.grandBreachUnlock},
            {id:'meteor',name:'운석 낙하',active:game.currentZoneId===METEOR_FALL_ZONE_ID,ready:!blocked && game.meteorSite.skyRiftReady}
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
        const html = `<button type="button" class="map-ready-current" onclick="switchTab('tab-battle')"><small>현재 위치</small>${current}</button>`
            + (available.length ? `<details><summary>입장 가능한 원정 ${available.length}</summary><div>${links}</div></details>` : '');
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
        if (!hive.inRun) return `<div class="map-expedition-intro"><p class="map-expedition-type">갈림길을 직접 고르는 원정, 10갈래 후 여왕</p>
            <dl><div><dt>전투 방식</dt><dd>벌떼 열 방과 여왕의 방. 강화 대가를 고를수록 여왕 전리품 증가</dd></div>
            <div><dt>주요 전리품</dt><dd>꽃가루, 독벌침, 벌꿀, 밀랍</dd></div>
            <div><dt>입장 비용</dt><dd>벌집 열쇠 1개 <small>보유 ${keys}개</small></dd></div></dl>
            ${power}<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startBeehiveRun()" ${keys>0?'':'disabled'}>벌집 입장</button>
            ${keys>0?'':'<span>벌집 열쇠가 필요합니다.</span>'}</div></div>`;
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${hive.queenActive?'여왕벌 전투':`갈림길 ${Math.min(10,hive.branchStep)}/10`}</strong>${power}</div>
            ${hiveSummary(hive)}${choices}<details class="map-expedition-details"><summary>원정 정보, 보유 재료</summary>
            <p>꽃가루 ${game.currencies.pollen||0}, 독벌침 ${game.currencies.venomStinger||0}, 벌꿀 ${game.currencies.enchantedHoney||0}, 밀랍 ${game.currencies.beeswax||0}</p></details>
            <div class="map-expedition-actions"><button type="button" onclick="switchTab('tab-battle')">전투 보기</button><button type="button" onclick="forfeitBeehiveRun()">원정 포기</button></div></div>`;
    }

    function grandActions(rift) {
        if (rift.grandRun?.inRun) return '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>';
        const hint = rift.grandBreachUnlock ? '' : `<span>공허 균열 완료 시 ${Math.round(GRAND_BREACH_ENCOUNTER.unlockChance * 100)}% 확률로 열립니다.</span>`;
        return `<button type="button" data-exploration-departure onclick="enterGrandBreach()" ${rift.grandBreachUnlock?'':'disabled'}>대균열 입장</button>${hint}`;
    }

    function grandResultReward(run) {
        if (run.phase !== 'done') return '군주 보상 없음';
        const pieces = [];
        if (run.rewardVoidChisel > 0) pieces.push(`공허의 끌 +${run.rewardVoidChisel}`);
        if (run.rewardJewelShard > 0) pieces.push(`주얼 결정 +${run.rewardJewelShard}`);
        return pieces.join(', ') || (run.rewardVoidChisel == null ? '정산 완료' : '지급된 제작 재화 없음');
    }

    function grandResult(run) {
        if (!run || run.inRun || !['done','failed'].includes(run.phase)) return '';
        const cleared = run.phase === 'done';
        return `<div class="map-expedition-result" aria-label="최근 원정 결과"><span>최근 원정</span>
            <strong>${cleared?'군주 격파':'군주 격파 실패'}</strong><span>균열 몬스터 ${Math.max(0,Math.floor(run.kills||0))}처치</span>
            <b>${grandResultReward(run)}</b></div>`;
    }

    function grandEntryRewardDescription() {
        const rewards = [
            contentProgression.canDropCurrency('voidChisel') ? '공허의 끌 2개부터, 10마리 처치마다 +1개' : '',
            contentProgression.canDropCurrency('jewelShard') ? '15마리마다 주얼 결정 +1개(최대 3개)' : ''
        ];
        return rewards.filter(Boolean).join(', ') || '제작 재화 해금 후 획득';
    }
    function grandEncounterDescription() {
        const rule = GRAND_BREACH_ENCOUNTER;
        const normal = rule.normalGaugeGain / rule.requiredGauge * 100;
        const elite = rule.eliteGaugeGain / rule.requiredGauge * 100;
        if (usesGrandBreachArena()) {
            return `균열 게이지 100%까지 몬스터 쇄도 (일반 ${normal}%, 정예 ${elite}%) → 균열 군주`;
        }
        return `몬스터를 처치해 게이지 100% 달성(일반 ${normal}%, 정예 ${elite}%) → 균열 군주. 10마리마다 군주 압박 증가`;
    }
    function grandPanelProgress(run) {
        if (run.phase === 'loot') return '군주 격파, 바닥 전리품을 다 주우면 귀환';
        if (run.phase === 'bossPending') return '균열 군주 소환 중';
        if (run.phase !== 'survival') return '균열 군주 전투';
        const progress = getGrandBreachProgress(run.gauge);
        return `균열 게이지 ${progress.percent}%, 몬스터 ${Math.max(0, Math.floor(run.kills || 0))}처치, 남은 시간 ${grandTimeLeft(run)}`;
    }
    function grandPanel(rift, power) {
        const run = rift.grandRun;
        const current = run?.inRun;
        const waves = rift.active ? `${rift.defeatedCount || 0}/${rift.totalToSpawn || 0} 처치` : '혼돈 사냥 중 발생';
        const reward = grandEntryRewardDescription();
        return `<div class="map-expedition-intro"><p class="map-expedition-type">공허 균열, ${waves}</p>
            <div class="map-expedition-heading"><strong>대균열 ${current?'진행 중':''}</strong>${power}</div>
            ${current ? `<p>${grandPanelProgress(run)}</p><div class="map-grand-summary">${grandSummary(run)}</div>` :
            `<dl><div><dt>전투 방식</dt><dd>${grandEncounterDescription()}</dd></div><div><dt>격파 보상</dt><dd>${reward}</dd></div></dl>`}
            ${grandResult(run)}<div class="map-expedition-actions">${grandActions(rift)}</div></div>`;
    }

    function meteorPanel(power) {
        const active = game.currentZoneId === METEOR_FALL_ZONE_ID;
        const ready = game.meteorSite.skyRiftReady;
        const percent = Math.min(100,Math.floor(game.meteorSite.skyRiftGauge || 0));
        const site = getZone(METEOR_FALL_ZONE_ID);
        const reward = `희귀 이상 장비 ${site.rewardEquipmentCount}개 확정, 운석 고유 장비(낮은 확률). 가방이 차도 보상은 보관됩니다`;
        const escort = site.tier >= 40 ? '정예 호위 2기' : site.tier >= 20 ? '정예 호위 1기' : '보스 단독';
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${active?'운석 원정 진행 중':ready?'원정 준비 완료':`하늘의 균열 충전 ${percent}%`}</strong>${power}</div>
            <dl><div><dt>주요 전리품</dt><dd>${reward}</dd></div>
            <div><dt>난이도</dt><dd>티어 ${site.tier}<small>충전 중 기록한 최저 티어 기준</small></dd></div>
            <div><dt>전투 방식</dt><dd>파편 무리 → 별철 관통 사수 → 운석 핵(${escort}). 핵 체력 절반부터 연속 예고 공격</dd></div></dl>
            <div class="map-expedition-actions">${active?'<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>':
            `<button type="button" data-exploration-departure onclick="changeZone('${METEOR_FALL_ZONE_ID}')" ${ready?'':'disabled'}>운석 원정 입장</button>${ready?'':'<span>충전을 완료하면 1회 입장할 수 있습니다.</span>'}`}</div></div>`;
    }

    function labyrinthSelectedFloor() {
        const current = Math.max(1, Math.floor(game.labyrinthFloor || 1));
        const max = Math.max(current, Math.floor(game.labyrinthUnlockedMaxFloor || 1));
        const choice = labyrinthChoice;
        if (choice.owner !== game || choice.season !== game.season) {
            labyrinthChoice = { owner: game, season: game.season, floor: current, current };
        } else {
            if (choice.floor === choice.current) choice.floor = current;
            choice.current = current;
            choice.floor = Math.min(max, choice.floor);
        }
        return labyrinthChoice.floor;
    }
    function selectLabyrinthFloor(floor) {
        labyrinthSelectedFloor();
        const max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        if (!Number.isInteger(floor) || floor < 1 || floor > max) return;
        labyrinthChoice.floor = floor;
        renderPanel(document.getElementById('ui-labyrinth-list'), labyrinthPanel());
    }
    async function chooseLabyrinthFloor() {
        const owner = game, season = game.season;
        const max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        const floor = await requestGameNumber({ title: '고대 미궁 층 선택', min: 1, max,
            value: labyrinthSelectedFloor(), confirmLabel: '살펴보기' });
        if (game !== owner || game.season !== season || floor === null) return;
        selectLabyrinthFloor(Number(floor));
    }
    function labyrinthRewards(floor) {
        const rows = [];
        if (contentProgression.isUnlocked('fossil')) rows.push(['화석', '미궁 화석, 속성 화석, 심연 화석']);
        if (contentProgression.isUnlocked('fossilRestore')) rows.push(['복원용 화석', '원시 화석, 원시 고대 화석']);
        if ((game.season || 1) >= 6 && contentProgression.canDropCurrency('sealShard')) {
            rows.push(['부적 재료', `봉인편린, 강력한 기운의 봉인편린${floor >= 30 ? ', 찬란한 봉인편린' : ''}`]);
        }
        return rows.length ? rows.map(([title, text]) => `<div><dt>${title}</dt><dd>${text}</dd></div>`).join('')
            : '<div><dd>화석 제작 미해금</dd></div>';
    }
    function labyrinthUniques(zone) {
        const tier = Math.min(getRealmEquipmentHiddenTierCap(zone),
            levelProgression.maxDropTier(levelProgression.itemLevel(zone, { isBoss: true }, () => 1 - Number.EPSILON)));
        const names = UNIQUE_DB.filter(item => item.dropOnly?.type === 'labyrinth' && uniqueDropsInZone(item, zone)
            && uniqueMeetsTier(item, tier)).map(item => escapeHTML(item.name));
        return names.length ? `<div class="labyrinth-unique-pool"><span>전용 고유</span>${names.map(name => `<b>${name}</b>`).join('')}</div>` : '';
    }
    function labyrinthResult() {
        const result = game.labyrinthLastResult;
        if (!result || result.season !== game.season) return '';
        const rewards = Object.entries(result.currencies).filter(([key, count]) => ORB_DB[key] && count > 0)
            .map(([key, count]) => `<span>${escapeHTML(ORB_DB[key].name)} <b>+${count}</b></span>`).join('');
        return `<div class="map-expedition-result labyrinth-result"><strong>${result.floor}층 돌파 보상</strong>${rewards || '<span>추가 재료 없음</span>'}</div>`;
    }
    function labyrinthEntryActions(floor, max, current, blocked) {
        const action = current ? '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>'
            : `<button type="button" data-exploration-departure onclick="enterLabyrinthFloor(${floor})" ${blocked ? 'disabled' : ''}>${floor}층 입장</button>`;
        const picks = [...new Set([1, Math.max(1, floor - 1), Math.min(max, floor + 1), max])].filter(value => value !== floor);
        const navigation = picks.map(value => `<button type="button" class="labyrinth-floor-link" onclick="sideEncounterUi.selectLabyrinthFloor(${value})">${value === max ? '최고 ' : ''}${value}층</button>`).join('');
        return `<div class="map-expedition-actions">${action}${navigation}${max > 1 ? '<button type="button" onclick="sideEncounterUi.chooseLabyrinthFloor()">층 선택</button>' : ''}
            ${blocked ? `<span>${escapeHTML(blocked)}</span>` : ''}</div>`;
    }
    function labyrinthPanel() {
        const floor = labyrinthSelectedFloor(), zone = getLabyrinthZoneNow(floor);
        const max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        const active = game.currentZoneId === LABYRINTH_ZONE_ID && !game.combatHalted;
        const current = active && game.labyrinthFloor === floor;
        const blocked = getZoneTravelBlockReason(LABYRINTH_ZONE_ID) || getHeldRunBlockReason();
        return `<div class="map-expedition-intro labyrinth-panel"><div class="map-expedition-heading"><strong>${floor}층 ${current ? '탐험 중' : '입장 준비'}</strong>
            <span class="labyrinth-floor-record">입장 가능 1 ~ ${max}층</span>${buildMapPowerEstimateHtml(zone)}</div>
            <div class="labyrinth-rewards"><small>확률 전리품</small><dl>${labyrinthRewards(floor)}</dl>${labyrinthUniques(zone)}</div>
            ${labyrinthResult()}${active && !current ? `<p class="labyrinth-current">${game.labyrinthFloor}층 탐험 중</p>` : ''}
            ${labyrinthEntryActions(floor, max, current, blocked)}</div>`;
    }

    function timePressure(rift) {
        const pressure = rift.pressure;
        const locked = rift.altarOpen || [TIME_RIFT_PAST_ZONE_ID,TIME_RIFT_FUTURE_ZONE_ID].includes(game.currentZoneId);
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>시간압 ${pressure}</strong>
            <span>혼돈 심화 ${getTimeRiftEquivalentChaosDepth(pressure)} 상당, 루프 ${getTimeRiftFixedSeason(pressure)} 기준</span></div>
            ${timeOddsHtml(pressure)}
            <div class="map-expedition-actions time-rift-stepper"><button type="button" aria-label="시간압 낮추기" onclick="setTimeRiftPressure(-1)" ${locked||pressure<=1?'disabled':''}>−</button>
            <b>${pressure}</b><button type="button" aria-label="시간압 높이기" onclick="setTimeRiftPressure(1)" ${locked||pressure>=TIME_RIFT_MAX_PRESSURE?'disabled':''}>+</button><span>${locked?'이번 제단의 시간압 고정':'높일수록 전투가 어렵고 옵션이 더 많이 남습니다.'}</span></div></div>`;
    }

    /** Fusion outcomes for a six-option rare as a column graph: one column per kept count (0 to 6), its height against the likeliest
     * count and its chance on top (2026-10-25 사용자: 자잘한 설명 말고 개수별 확률만 그래프로). */
    function timeOddsHtml(pressure) {
        const kept = getTimeRiftLossOdds(pressure, 6).reverse(), top = Math.max(...kept);
        const percent = value => `${(value * 100).toFixed(value >= 0.1 ? 0 : value >= 0.01 ? 1 : 2)}%`;
        const columns = kept.map((value, count) => `<div class="time-rift-column loss-${6 - count}"><small>${percent(value)}</small>`
            + `<span><i style="height:${(value / top * 100).toFixed(1)}%"></i></span><b>${count}개</b></div>`).join('');
        return `<div class="time-rift-odds" role="img" aria-label="남는 옵션 개수별 확률: ${kept.map((value, count) => `${count}개 ${percent(value)}`).join(', ')}">${columns}</div>`;
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
        const issue = getTimeRiftFutureEntryReason(rift); // 입장과 같은 까닭(가방 자리도)
        const action = current ? '<button type="button" onclick="switchTab(\'tab-battle\')">전투 보기</button>' :
            `<button type="button" data-exploration-departure onclick="changeZone('${TIME_RIFT_FUTURE_ZONE_ID}')" ${issue?'disabled':''}>미래 입장</button>`;
        return `<div class="map-expedition-intro"><h3>3. 미래</h3><strong>희귀 옵션을 고유에 계승</strong>
            ${buildMapPowerEstimateHtml(getZone(TIME_RIFT_FUTURE_ZONE_ID))}<p>${escapeHTML(issue||'융합 준비 완료')}</p>
            <details class="map-expedition-details" id="time-rift-fusion-rules"><summary>융합 규칙</summary>
            <p>미래 클리어 시 두 장비를 소모해 융합 유물 1개를 만듭니다. 희귀 옵션은 하나씩 시간압의 확률로 남고(${TIME_RIFT_KEEP_CAP}개가 남은 뒤로는 훨씬 낮은 확률), 나머지는 사라집니다.</p>
            <p>융합 후에는 황금률/잿불가지/축복의 꽃잎만 사용할 수 있습니다.</p></details>
            <div class="map-expedition-actions">${action}</div></div>`;
    }

    function timeRiftPanel(host,rift) {
        if (!host.querySelector('.time-rift-stages')) host.innerHTML = '<div class="time-rift-pressure"></div><div class="time-rift-stages"><section aria-label="과거" data-rift-stage="past"></section><section aria-label="제단" data-rift-stage="altar"></section><section aria-label="미래" data-rift-stage="future"></section></div>';
        renderPanel(host.querySelector('.time-rift-pressure'),timePressure(rift));
        renderPanel(host.querySelector('[data-rift-stage="past"]'),timePast(rift));
        renderPanel(host.querySelector('[data-rift-stage="altar"]'),timeAltar(rift));
        renderPanel(host.querySelector('[data-rift-stage="future"]'),timeFuture(rift));
    }

    function colonyWavePattern(zone) {
        const patterns = {charge:'굴착 돌격 (근접 무리)',sharpshooters:'독침 사격 (예고 관통탄)',carapace:'갑각 호위 (높은 방어)',mixed:'혼합 파상 (여러 역할)',overlord:'지배체 (예고 강타)'};
        return patterns[zone.wavePattern] || '군락 방어전';
    }
    function colonyNextBossReward(colony) {
        const wave = Math.ceil(Math.max(1,colony.wave||1) / 5) * 5;
        const rule = COLONY_WARD_RULES.colonyWave;
        const floor = Math.min(rule.maxRollFloor, rule.bossRollFloor + (wave / rule.every - 1) * rule.bossRollStep);
        return `5웨이브마다 액막이 확정, 다음 지배체의 일반 액막이 최소 굴림 ${Math.round(floor*100)}%`;
    }
    function colonyPanelActions(colony, traces) {
        const entryDisabled = traces <= 0 || colony.inRun ? 'disabled' : '';
        const withdrawDisabled = colony.inRun ? '' : 'disabled';
        return `<div class="map-expedition-actions"><button type="button" data-exploration-departure onclick="startColonyRun()" ${entryDisabled}>군락지 입장</button>
            <button type="button" onclick="forfeitColonyRun()" ${withdrawDisabled}>철수</button>
            <button type="button" onclick="document.getElementById('ui-colony-ward-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' })">액막이 관리</button>
            <span>액막이 칸 ${colonyWards.slotCount()}/${COLONY_WARD_RULES.maxSlots}, 편린 ${game.currencies.colonyShard||0}개</span></div>`;
    }
    function colonyPanel(colony,zone) {
        const traces = Math.max(0,game.currencies.colonyTrace||0);
        const completed = Math.max(0,Math.floor(colony.wave||0)-1);
        const stage = colony.inRun ? `${colony.wave}웨이브, ${colony.kills}/${colony.requiredKills}처치` : colony.failedWave > 0 ? `${colony.failedWave}웨이브, 군락 핵 파괴` : '방어전 입장 준비';
        const returnNote = colony.inRun ? '현재 원정' : '최근 원정';
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${stage}</strong>${buildMapPowerEstimateHtml(zone)}</div>
            <dl><div><dt>입장 비용</dt><dd>군락지 흔적 1개<small>보유 ${traces}개, 기준 혼돈 심화 ${zone.entryDeepChaosDepth}</small></dd></div>
            <div><dt>현재 적 무리</dt><dd>${colonyWavePattern(zone)}</dd></div>
            <div><dt>방어 목표</dt><dd>군락 핵 보호<small>${colony.coreMaxHp > 0 ? `${Math.ceil(colony.coreHp).toLocaleString()} / ${colony.coreMaxHp.toLocaleString()} 내구도` : '입장 시 핵 내구도 충전'}, 파괴되면 실패</small></dd></div>
            <div><dt>웨이브 돌파 보상</dt><dd>군락지 편린, 액막이 부적<small>${colonyNextBossReward(colony)}</small></dd></div></dl>
            <div class="map-expedition-result"><span>${returnNote}</span><strong>완료 ${completed}웨이브</strong><span>최고 도달 ${Math.max(0,colony.highestWave||0)}웨이브</span></div>
            <details class="map-expedition-details" id="colony-entry-guide"><summary>입장권 획득처, 진행 규칙</summary>
            <p>혼돈 심화 21층 이상/벌집/대균열에서 군락지 흔적을 얻습니다. 웨이브를 돌파하면 보상을 즉시 받고 다음 무리가 시작됩니다.</p>
            <p>철수해도 받은 보상은 유지됩니다. 새 도전은 1웨이브부터 시작합니다.</p></details>
            ${colonyPanelActions(colony, traces)}</div>`;
    }

    function skyPanel(tower) {
        if (!tower.unlocked) return `<div class="map-expedition-intro"><h3>창공의 탑, 봉인됨</h3>
            <p>루프 15에서 혼돈 20을 돌파하면 해금됩니다. 루프 16부터는 해금을 유지합니다.</p>
            <div class="map-expedition-actions"><button disabled>혼돈 입성 필요</button></div></div>`;
        const floor = tower.currentFloor;
        const remaining = getSkyTowerRemainingClears();
        const first = !tower.clearedFloors.includes(floor);
        const reward = getSkyTowerRewardAmount(floor);
        // 지도 완료 행동 '중단'으로 멈춘 탑은 탐험 중이 아니다: 그 층에 다시 들어가는 단추를 보인다(미궁과 같다)
        const current = game.currentZoneId === SKY_TOWER_ZONE_ID && !game.combatHalted;
        const ready = canEnterSkyTower();
        const rewardText = first ? `${reward}개 확정` : `${Math.max(1,Math.floor(reward*.35))}개, 16% 확률`;
        const title = !remaining ? (current ? `${floor}층 연습 중` : '이번 루프 보상 완료') : `${floor}층 ${current?'탐험 중':'입장 준비'}`;
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>${title}</strong>${buildMapPowerEstimateHtml(getZone(SKY_TOWER_ZONE_ID))}</div>
            <dl><div><dt>${first?'첫 돌파 보상':'반복 돌파 보상'}</dt><dd>응축된 창공의 정수<small>${remaining?rewardText:'이번 루프 보상 소진, 다음 루프에 재개'}</small></dd></div>
            <div><dt>이번 루프 남은 보상 전투</dt><dd>${remaining} / ${getSkyTowerLoopClearLimit()}회<small>첫 돌파/반복 돌파 모두 1회 사용</small></dd></div></dl>
            <div class="map-expedition-result"><span>영구 기록</span><strong>${tower.clearedFloors.length}개 층 돌파</strong><span>최고 입장 ${tower.highestFloor}층</span></div>
            ${skyLastResult(tower)}
            ${ready?'':'<p>이번 루프 혼돈 입성 후 입장할 수 있습니다.</p>'}
            <details class="map-expedition-details" id="sky-tower-guide"><summary>등반, 보상 규칙</summary>
            <p>보상 25회를 마치면 멈춥니다. 이후 연습은 한 층씩 진행합니다.</p>
            <p>돌파 기록/응축된 창공의 정수/영구 강화는 루프를 넘어 유지됩니다. 보상 전투 횟수만 루프마다 회복됩니다.</p></details>
            <div class="map-expedition-actions">${skyEntryActions(tower,remaining)}</div></div>`;
    }

    function skyLastResult(tower) {
        const result = tower.lastResult;
        if (!result) return '';
        const title = result.kind === 'practice' ? '연습 완료' : result.kind === 'first' ? '첫 돌파' : '반복 돌파';
        const reward = result.kind === 'practice' ? '등반 보상 없음' : result.condensedPower > 0
            ? `응축된 창공의 정수 +${result.condensedPower}` : '정수 미발견';
        return `<div class="map-expedition-result"><strong>${result.floor}층 ${title}</strong><span>${reward}</span></div>`;
    }

    function skyEntryActions(tower,remaining) {
        const disabled = canEnterSkyTower() ? '' : 'disabled';
        const action = game.currentZoneId === SKY_TOWER_ZONE_ID && !game.combatHalted ? '<button onclick="switchTab(\'tab-battle\')">전투 보기</button>' :
            `<button data-exploration-departure onclick="enterSkyTowerPrompt(${tower.currentFloor})" ${disabled}>${tower.currentFloor}층 ${remaining?'입장':'연습 입장'}</button>`;
        return action + (tower.highestFloor>1?`<button data-exploration-departure onclick="enterSkyTowerPrompt()" ${disabled}>다른 층 선택</button>`:'');
    }

    function skyGrowth(tower) {
        const level = tower.skyStone.level;
        const max = getSkyStoneMaxLevel();
        const cost = getSkyStoneNextCost();
        const gemUnlocked = contentProgression.isUnlocked('gemForge');
        return `<div class="map-expedition-intro"><div class="map-expedition-heading"><strong>영구 강화</strong><span>응축된 창공의 정수 ${tower.condensedPower}개</span></div>
            <dl><div><dt>창공석, ${level}/${max}</dt><dd>지하계 중력 패널티 감소 ${getSkyStoneReductionPct()}%<small>${level>=max?'최대 강화':`다음 단계 ${getSkyStoneReductionPct()+5}%, 필요 ${cost}개`}</small></dd></div>
            <div><dt>공격 룬 영구 강화</dt><dd>룬 레벨 최대 +${getSkyTowerGemBoostMaxLevel()}<small>${gemUnlocked?'룬별 60 → 120 → 240개':'룬 강화 해금 필요'}</small></dd></div></dl>
            <div class="map-expedition-actions"><button onclick="upgradeSkyStone()" ${level>=max||tower.condensedPower<cost?'disabled':''}>창공석 ${level?'강화':'제작'}</button>
            <button onclick="switchTab('tab-skills'); switchSkillSubtab('skill-tab-enhance')" ${gemUnlocked?'':'disabled'}>룬 강화로 이동</button></div></div>`;
    }

    return { hiveSummary, updateHud, refreshDestinations, hivePanel, grandPanel, meteorPanel, labyrinthPanel, selectLabyrinthFloor, chooseLabyrinthFloor, timeRiftPanel, colonyPanel, skyPanel, skyGrowth, renderPanel };
})();
