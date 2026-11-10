// 지도 콘텐츠: 벌집과 군락지, 대균열, 혼돈계, 창공의 탑, 지하계 룬, 지도 알림, 입장 확인 (2026-11-10에 js/ui.js에서 그대로 옮겼다. js/ui.js 뒤에 읽는다.)
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function closeBeehiveChoiceOverlay(dismiss = false) {
    if (dismiss && game.beehive.pendingChoice) dismissedBeehiveChoices.add(game.beehive.pendingChoice);
    let el = document.getElementById('beehive-choice-overlay');
    if (el) el.remove();
}

function getBeehiveChoiceButtonsHtml(c) {
    if (!c) return '';
    if (c.a && c.b && c.c) {
        return ['a', 'b', 'c'].map(key => {
            const pick = getBeehiveSelectableChoice(c, key);
            const cost = getBeehivePenaltyCost(pick.penalty);
            const disabled = !canPayBeehivePenalty(pick.penalty);
            const reward = String(pick.text || '').split(' / 대가:')[0].replace(/^\[[^\]]*\]\s*/, '');
            const price = cost ? `${cost.name} ${cost.amount}개${cost.chance < 1 ? _t(' 소모 확률 {value}%', { value: cost.chance * 100 }) : _t(' 소모')}` : pick.penalty.text;
            const stock = cost ? _t('보유 {currencies}개{value}', { currencies: game.currencies[cost.key] || 0, value: disabled ? _t(', 재료 부족') : '' }) : '';
            const changed = pick !== c[key] ? '재료 부족으로 대가 변경' : '';
            return `<button class="hive-choice" onclick="resolveBeehiveChoice('${key}',${escapeHTML(JSON.stringify(pick.penalty.key))})" ${disabled ? 'disabled' : ''}>
                <span class="hive-choice-timing">${getBeehiveRewardTimingLabel(pick.timing)}</span><strong>${escapeHTML(reward)}</strong>
                <span class="hive-choice-price">${_t('대가, {price}', { price: escapeHTML(price) })}</span><small>${escapeHTML(stock || changed)}</small></button>`;
        }).join('');
    }
    return `<button onclick="resolveBeehiveChoice('legacy_now')">${escapeHTML(c.nowText || '즉시 보상')}</button><button onclick="resolveBeehiveChoice('legacy_later')">${escapeHTML(c.laterText || '지연 보상')}</button>`;
}

function openBeehiveChoiceOverlay(reasonText) {
    // The visible map panel already offers the same choices and run controls.
    if (document.querySelector('#tab-map.active:not(.ui-window-minimized) #map-tab-zones.active #map-explore-beehive.active')) {
        closeBeehiveChoiceOverlay();
        return;
    }
    let b = game.beehive;
    if (dismissedBeehiveChoices.has(b.pendingChoice)) return;
    let alive = countBeehiveWaveAlive();
    if (!b.inRun || !b.pendingChoice || b.awaitingClear || alive > 0 || document.getElementById('beehive-choice-overlay')) return;
    let next = Math.min(10, Math.max(1, Math.floor(b.branchStep + 1)));
    let html = `<div id="beehive-choice-overlay" class="beehive-choice-overlay" role="dialog" aria-modal="true" aria-label="${_t('벌집 갈림길')}">
        <div class="beehive-choice-card">
            <div class="beehive-choice-heading"><strong>${_t('벌집 갈림길 {next}/10', { next })}</strong><button onclick="closeBeehiveChoiceOverlay(true)">${_t('닫기')}</button></div>
            <p>${escapeHTML(reasonText || '다음 갈림길을 선택하세요.')}, 선택하면 전투가 시작됩니다.</p>
            ${sideEncounterUi.hiveSummary(b)}
            <div class="beehive-choice-actions">${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>
            <p>${_t('닫아도 벌집 패널에서 다시 선택할 수 있습니다.')}</p>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

function renderLoop8BeehivePanel(shouldRenderPanel = true) {
    let open = (game.season || 1) >= 8;
    let header = document.getElementById('ui-beehive-header');
    let panel = document.getElementById('ui-beehive-panel');
    if (header) header.style.display = open && shouldRenderPanel ? 'block' : 'none';
    if (panel) panel.style.display = open && shouldRenderPanel ? 'block' : 'none';
    if (!open) return;
    let b = game.beehive || (game.beehive = { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 });
    if (b.inRun && !b.pendingChoice && !b.awaitingClear && !b.queenActive) prepareBeehiveBranchChoices(b);
    let choiceHtml = '';
    if (b.inRun && b.awaitingClear && countBeehiveWaveAlive() === 0) {
        onBeehiveWaveCleared();
    }
    let aliveBeeEnemies = countBeehiveWaveAlive();
    if (b.inRun && b.pendingChoice && !b.awaitingClear && aliveBeeEnemies <= 0) {
        openBeehiveChoiceOverlay();
        choiceHtml = `<div class="map-hive-choices"><strong>${_t('갈림길 선택 ({min}/10), 선택하면 전투가 시작됩니다.', { min: Math.min(10, (b.branchStep || 0) + 1) })}</strong>${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>`;
    } else if (b.inRun && b.awaitingClear) {
        choiceHtml = `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? _t('여왕벌 전투 진행 중') : _t('벌떼 웨이브 진행 중 ({max}/10)', { max: Math.max(0, Math.floor(b.branchStep || 0)) })}, 남은 적 <strong>${aliveBeeEnemies}</strong>${_t('마리를 모두 처치해야 진행할 수 있습니다.')}</div>`;
    }
    if (!shouldRenderPanel || !panel) return;
    const html = sideEncounterUi.hivePanel(b, choiceHtml, buildMapPowerEstimateHtml(getZone('beehive_run')));
    sideEncounterUi.renderPanel(panel, html);
}

// 군락지 화면: 방어전 패널 아래에 액막이 안내(2026-10-10부터 액막이는 가방과 장비창 액막이 칸, js/colony-wards-ui.js)를 함께 그린다.
function renderLoop15ColonyPanel() {
    let open = (game.season || 1) >= 15;
    let header = document.getElementById('ui-colony-header');
    let panel = document.getElementById('ui-colony-panel');
    let wardHost = document.getElementById('ui-colony-ward-panel');
    if (!header || !panel || !wardHost) return;
    header.style.display = open ? 'block' : 'none';
    panel.style.display = open ? 'block' : 'none';
    wardHost.hidden = !open;
    if (!open) return;
    let c = game.colony || (game.colony = {});
    sideEncounterUi.renderPanel(panel, sideEncounterUi.colonyPanel(c, getZone('colony_run')));
    renderColonyWardView('ui-colony-ward-panel');
}

function startColonyRun(){
    let c = game.colony || (game.colony = {});
    if ((game.currencies.colonyTrace||0)<=0 || c.inRun) return;
    const held = getContentStartBlockReason();
    if (held) return addLog(held, 'attack-monster');
    game.currencies.colonyTrace--;
    c.entryDeepChaosDepth = getZone('colony_run').entryDeepChaosDepth;
    c.inRun = true; c.wave = 1; c.kills = 0; c.requiredKills = getColonyWaveEnemyCount(1);
    c.coreMaxHp = 0; c.coreHp = 0; c.failedWave = 0;
    c.returnAfterWave = 0; c.lastResult = null;
    c.pendingLoot = []; c.lootPending = false; c.bossLootCell = null;
    c.returnZoneId = getContentReturnZoneId();
    actExplorationProgress.depart(game);
    game.currentZoneId = 'colony_run';
    game.combatHalted = false;
    game.enemies = []; game.encounterPlan = []; game.encounterIndex = 0; game.runProgress = 0; game.moveTimer = 0;
    spawnColonyWave();
    addLog(_t('🪲 군락지 방어전 시작! 기준 난이도: 혼돈 심화 {entryDeepChaosDepth}', { entryDeepChaosDepth: c.entryDeepChaosDepth }), 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

function forfeitColonyRun(){
    if (window.GameModules.colonyRun.finish()) updateStaticUI();
}

function renderLoop9VoidRiftPanel(){
    let open = (game.season || 1) >= 9;
    let header = document.getElementById('ui-voidrift-header');
    let panel = document.getElementById('ui-voidrift-panel');
    if (!header || !panel) return;
    header.style.display = open ? 'block' : 'none';
    panel.style.display = open ? 'block' : 'none';
    let autoBtn = document.getElementById('btn-grand-breach-auto-enter');
    if (autoBtn) {
        autoBtn.style.display = open ? 'inline-block' : 'none';
        autoBtn.innerText = _t('대균열 자동입장 {value}', { value: game.settings && game.settings.autoEnterGrandBreach ? _t('켜짐') : _t('꺼짐') });
    }
    if (!open) return;
    let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun || {};
    if (g.inRun && game.currentZoneId !== 'grand_breach_run') {
        actExplorationState.groundLoot.discardEncounter(game, 'grand_breach_run');
        g.inRun = false;
        g.phase = 'failed';
        v.grandRun = g;
    }
    sideEncounterUi.renderPanel(panel, sideEncounterUi.grandPanel(v, buildMapPowerEstimateHtml(getZone('grand_breach_run'))));
}

function spawnBeehiveWave(isBoss){
    let b = game.beehive || {};
    let zone = getZone('beehive_run') || getZone(0);
    let step = Math.max(1, Math.floor(b.branchStep || 1));
    let count = isBoss ? 1 : Math.min(8, 6 + Math.floor((step - 1) / 4)) + (b.waveExtra || 0);
    let eliteCount = step >= 6 ? 3 : 2;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    let wave = [];
    for (let i = 0; i < count; i++) {
        let marker = { elite: !isBoss && i < eliteCount, boss: isBoss };
        let enemy = createEnemy(zone, marker, i);
        wave.push(tuneBeehiveWaveEnemy(enemy, zone, isBoss, b.enemyEmpower));
    }
    // 방 단위 무대: 벌집 전용 지도의 다음 방(여왕은 여왕의 방)에 세운다(js/combat-encounters.js placeBeehiveRoomWave). 그 밖에서는 판에 바로 선다.
    let roomRun = getBeehiveRoomRun();
    if (roomRun) placeBeehiveRoomWave(roomRun, wave, step, isBoss);
    else game.enemies.push(...wave);
    if (isBoss) addLog(_t('👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다.'), 'loot-unique');
    else addLog(_t('🐝 벌떼 웨이브 시작! 진행도 {min}%, 남은 적을 모두 처치해야 다음 갈림길이 열립니다.', { min: Math.min(100, step * 10) }), 'attack-monster');
}

function getBeehiveRewardAmount(base, branchStep) {
    let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
    return Math.max(1, Math.floor(base * (1 + depthBonus)));
}

function getBeehivePenaltyPool(branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { key: 'swarm', text: _t('군체 분노 +1'), power: 1 },
        { key: 'pursuit', text: _t('이번 무리 벌 +2마리'), power: 2 },
        { key: 'pollen_tax', text: _t('꽃가루 -6'), power: 1 }
    ];
    if (depth >= 4) pool.push({ key: 'deep_swarm', text: _t('심층 군체 분노 +2'), power: 2 });
    pool.push({ key: 'venom_tax', text: _t('독벌침 1개 소모 확률 25%'), power: 1 },
        { key: 'honey_tax', text: _t('벌꿀 1개 소모 확률 20%'), power: 1 });
    if (depth >= 6) pool.push({ key: 'royal_swarm', text: _t('왕실 군체 분노 +3'), power: 3 });
    return pool.filter(canPayBeehivePenalty);
}

// Costs are resolved by saved key, never by closures or amounts supplied by a save.
function getBeehivePenaltyCost(penalty) {
    const costs = {
        pollen_tax: { key: 'pollen', name: '꽃가루', amount: 6, chance: 1 },
        venom_tax: { key: 'venomStinger', name: '독벌침', amount: 1, chance: 0.25 },
        honey_tax: { key: 'enchantedHoney', name: '벌꿀', amount: 1, chance: 0.2 }
    };
    return penalty ? costs[penalty.key] : undefined;
}

function canPayBeehivePenalty(penalty) {
    if (!penalty) return false;
    const cost = getBeehivePenaltyCost(penalty);
    if (cost) return (game.currencies[cost.key] || 0) >= cost.amount;
    return ['swarm', 'sting', 'pursuit', 'deep_swarm', 'royal_swarm'].includes(penalty.key);
}

function getBeehiveSelectableChoice(choices, key) {
    if (!['a', 'b', 'c'].includes(key)) return null;
    const pick = choices[key];
    if (!pick || key !== 'c' || ['a', 'b', 'c'].some(id => canPayBeehivePenalty(choices[id]?.penalty))) return pick;
    // Old saves or spending between waves can exhaust all three costs. Keep rewards
    // fixed and visibly offer one combat penalty so the expedition cannot softlock.
    return { ...pick, penalty: { key: 'swarm', text: _t('군체 분노 +1'), power: 1 } };
}

function getBeehiveRewardPool(branchStep) {
    // Filter new offers only; already saved choices and promised rewards retain their original payouts.
    let depth = Math.max(1, Math.floor(branchStep || 1));
    const currencies = { honey: ['enchantedHoney'], stinger: ['venomStinger'],
        bundle: ['pollen', 'venomStinger', 'formlessDew'] };
    return [
        { type: 'pollen', weight: 42 }, { type: 'honey', weight: 18 }, { type: 'stinger', weight: 16 },
        { type: 'formlessDew', weight: 14 + Math.min(8, depth) }, { type: 'goldenRule', weight: 2 + Math.floor(depth / 4) },
        { type: 'jewelShard', weight: 10 }, { type: 'beeswax', weight: 10 }, { type: 'bundle', weight: 4 }
    ].filter(row => (currencies[row.type] || [row.type]).every(key => contentProgression.canDropCurrency(key)));
}

function pickWeightedBeehiveReward(branchStep, usedTypes) {
    let used = usedTypes || new Set();
    let pool = getBeehiveRewardPool(branchStep).filter(row => !used.has(row.type));
    if (pool.length <= 0) pool = getBeehiveRewardPool(branchStep);
    let total = pool.reduce((sum, row) => sum + Math.max(0, row.weight || 0), 0);
    let roll = Math.random() * Math.max(1, total);
    for (let row of pool) {
        roll -= Math.max(0, row.weight || 0);
        if (roll <= 0) return row.type;
    }
    return pool[0].type;
}

function prepareBeehiveBranchChoices(b) {
    if (!b || !b.inRun || b.awaitingClear || b.queenActive) return;
    let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    let used = new Set();
    let immediate = pickWeightedBeehiveReward(nextStep, used);
    used.add(immediate);
    let wave = pickWeightedBeehiveReward(nextStep, used);
    used.add(wave);
    let queen = pickWeightedBeehiveReward(nextStep, used);
    b.pendingChoice = {
        a: buildBeehiveChoiceOption(immediate, nextStep, 'immediate'),
        b: buildBeehiveChoiceOption(wave, nextStep, 'wave'),
        c: buildBeehiveChoiceOption(queen, nextStep, 'queen'),
        branchStep: nextStep
    };
}

function getBeehiveRewardTimingLabel(timing) {
    if (timing === 'immediate') return '즉시 보상';
    if (timing === 'queen') return '여왕벌 보상';
    return '웨이브 보상';
}

function getBeehiveRewardTimingMultiplier(timing) {
    if (timing === 'immediate') return 0.55;
    if (timing === 'queen') return 2.25;
    return 1;
}

function scaleBeehiveRewardAmount(baseAmount, timing) {
    return Math.max(1, Math.floor(Math.max(1, baseAmount || 1) * getBeehiveRewardTimingMultiplier(timing)));
}

function scaleBeehiveRewardChance(baseChance, timing) {
    let chance = Number.isFinite(baseChance) ? baseChance : 1;
    if (timing === 'immediate') return Math.max(0.05, Math.min(1, chance * 0.75));
    if (timing === 'queen') return Math.min(1, chance + 0.35);
    return chance;
}

function buildBeehiveChoiceOption(type, branchStep, timing = 'wave') {
    let step = Math.max(1, Math.floor(branchStep || ((game.beehive || {}).branchStep || 1)));
    let penaltyPool = getBeehivePenaltyPool(step);
    let penalty = penaltyPool[Math.floor(Math.random() * penaltyPool.length)];
    let label = getBeehiveRewardTimingLabel(timing);
    let mk = (text, effect, amount, chance) => ({ text: _t('[{label}] {text} / 대가: {text2}', { label, text, text2: penalty.text }), effect, amount, chance, penalty, timing });
    if (type === 'pollen') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(12 + Math.floor(Math.random() * 7), step), timing); return mk(_t('꽃가루 +{amount}', { amount }), 'pollen', amount); }
    if (type === 'honey') { let chance = scaleBeehiveRewardChance(0.30, timing); return mk(_t('벌꿀 획득 확률 {floor}%', { floor: Math.floor(chance * 100) }), 'honey', 1, chance); }
    if (type === 'stinger') { let chance = scaleBeehiveRewardChance(0.38, timing); return mk(_t('독벌침 획득 확률 {floor}%', { floor: Math.floor(chance * 100) }), 'stinger', 1, chance); }
    if (type === 'formlessDew') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(1 + (step >= 7 ? 1 : 0), step), timing); return mk(_t('형체 없는 이슬 +{amount}', { amount }), 'formlessDew', amount); }
    if (type === 'goldenRule') { let chance = scaleBeehiveRewardChance(step >= 8 ? 1 : 0.35, timing); return mk(chance >= 1 ? '황금률 +1' : _t('황금률 획득 확률 {floor}%', { floor: Math.floor(chance * 100) }), 'goldenRule', 1, chance); }
    if (type === 'jewelShard') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step), timing); return mk(_t('주얼 결정 +{amount}', { amount }), 'jewelShard', amount); }
    if (type === 'beeswax') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(_t('밀랍 +{amount}', { amount }), 'beeswax', amount); }
    if (type === 'bundle') {
        let amount = scaleBeehiveRewardAmount(1, timing);
        return mk(_t('꽃가루 +{value}, 독벌침 +{amount}, 형체 없는 이슬 +{amount2}', { value: 20 * amount, amount, amount2: amount }), 'bundle', amount);
    }
    let amount = scaleBeehiveRewardAmount(10, timing);
    return mk(_t('꽃가루 +{amount}', { amount }), 'pollen', amount);
}

function applyBeehiveChoicePenalty(penalty, b) {
    if (!canPayBeehivePenalty(penalty)) return null;
    b.waveExtra = Number(penalty.key === 'pursuit') * 2;
    const cost = getBeehivePenaltyCost(penalty);
    if (cost) {
        if (cost.chance < 1 && Math.random() >= cost.chance) return _t('{name} 소모 없음', { name: cost.name });
        game.currencies[cost.key] -= cost.amount;
        return `${cost.name} -${cost.amount}`;
    }
    let power = Math.max(1, Math.floor(penalty.power || 1));
    if (['swarm', 'deep_swarm', 'royal_swarm'].includes(penalty.key)) b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + power));
    else if (penalty.key === 'sting') game.playerHp = Math.max(1, Math.floor((game.playerHp || 1) * 0.95));
    return penalty.text || '';
}

function applyBeehiveChoiceReward(pick) {
    if (!pick) return '';
    let chance = Number.isFinite(pick.chance) ? pick.chance : 1;
    if (chance < 1 && Math.random() >= chance) return '보상 획득 실패';
    let amount = Math.max(1, Math.floor(pick.amount || 1));
    if (pick.effect === 'honey') { game.currencies.enchantedHoney = (game.currencies.enchantedHoney || 0) + amount; return _t('벌꿀 +{amount}', { amount }); }
    if (pick.effect === 'stinger') { game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount; return _t('독벌침 +{amount}', { amount }); }
    if (pick.effect === 'bundle') {
        game.currencies.pollen = (game.currencies.pollen || 0) + (20 * amount);
        game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount;
        game.currencies.formlessDew = (game.currencies.formlessDew || 0) + amount;
        return _t('꽃가루 +{value} / 독벌침 +{amount} / 형체 없는 이슬 +{amount2}', { value: 20 * amount, amount, amount2: amount });
    }
    if (pick.effect) {
        let merged = Object.entries(CURRENCY_LEGACY_MERGE || {}).find(([, legacyKeys]) => legacyKeys.includes(pick.effect));
        let currencyKey = merged ? merged[0] : pick.effect;
        game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + amount;
        return `${getCurrencyInfo(currencyKey).name} +${amount}`;
    }
    return '';
}

function startBeehiveRun(){
    let b = game.beehive || (game.beehive = {});
    if ((game.currencies.hiveKey || 0) <= 0 || b.inRun) return;
    const block = getContentStartBlockReason();
    if (block) return addLog(block, 'attack-monster');
    let lastDeepChaosDepth = Math.max(21, Math.min(game.abyssEndlessDepth || 21, game.loopProgressCurrent.bestAbyssDepth || 21));
    resetBeehiveRunModifiers(b);
    game.currencies.hiveKey--;
    b.entryDeepChaosDepth = lastDeepChaosDepth;
    b.inRun = true;
    b.branchStep = 0;
    b.inMapZoneId = 'beehive_run';
    b.returnZoneId = getContentReturnZoneId();
    b.queenActive = false;
    actExplorationProgress.depart(game);
    game.currentZoneId = 'beehive_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    if (actExplorationDoors.session()) startEncounterRun(); // 방 단위 무대: 벌집 전용 지도를 열고 입구에 선다(js/content-maps.js hive)
    game.combatHalted = true;
    prepareBeehiveBranchChoices(b);
    addLog(_t('🐝 벌집 원정 시작! 기준 난이도: 혼돈 심화 {max}, 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.', { max: Math.max(21, Math.floor(b.entryDeepChaosDepth || 21)) }), 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

function canResolveBeehiveChoice(b) {
    return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear
        && countBeehiveWaveAlive() === 0;
}

function validateBeehiveChoicePayment(pick, displayedPenalty) {
    if (canPayBeehivePenalty(pick.penalty) && (!displayedPenalty || displayedPenalty === pick.penalty.key)) return true;
    closeBeehiveChoiceOverlay();
    openBeehiveChoiceOverlay('보유 재료가 바뀌었습니다. 대가를 확인하고 다시 선택하세요.');
    updateStaticUI();
    return false;
}

function resolveBeehiveChoice(key, displayedPenalty){
    let b = game.beehive;
    if (!canResolveBeehiveChoice(b)) return;
    let pick = getBeehiveSelectableChoice(b.pendingChoice, key);
    let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    if (!pick && (key === 'legacy_now' || key === 'legacy_later')) pick = buildBeehiveChoiceOption(key === 'legacy_now' ? 'pollen' : 'honey', nextStep);
    if (!pick) return;
    if (!validateBeehiveChoicePayment(pick, displayedPenalty)) return;
    let penaltyText = applyBeehiveChoicePenalty(pick.penalty, b);
    closeBeehiveChoiceOverlay();
    b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
    b.penaltyLedger = Array.isArray(b.penaltyLedger) ? b.penaltyLedger : [];
    let rewardText = String(pick.text || '').split(' / 대가:')[0];
    let rewardResult = '';
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = Array.isArray(b.pendingQueenRewards) ? b.pendingQueenRewards : [];
    if (pick.timing === 'immediate') {
        rewardResult = applyBeehiveChoiceReward(pick);
        if (rewardResult) b.rewardLedger.push(rewardResult);
    } else if (pick.timing === 'queen') {
        b.pendingQueenRewards.push({ effect: pick.effect, amount: pick.amount, chance: pick.chance, text: rewardText });
    } else {
        b.pendingWaveReward = { effect: pick.effect, amount: pick.amount, chance: pick.chance };
        b.pendingWaveRewardText = rewardText;
    }
    b.penaltyLedger.push(penaltyText || '');
    b.pendingChoice = null;
    b.branchStep = nextStep;
    b.awaitingClear = true;
    b.queenActive = false;
    game.runProgress = Math.min(100, b.branchStep * 10);
    game.combatHalted = false;
    let timingText = pick.timing === 'immediate' ? _t('즉시 지급({rewardResult})', { rewardResult: rewardResult || _t('보상 없음') }) : (pick.timing === 'queen' ? _t('여왕벌 처치 후 지급({rewardText})', { rewardText: rewardText || _t('보상 없음') }) : _t('웨이브 처치 후 지급({rewardText})', { rewardText: rewardText || _t('보상 없음') }));
    addLog(_t('🐝 갈림길 {step}/10 선택 완료: {timing}, 대가: {penalty}, 벌떼 웨이브 시작', { step: b.branchStep, timing: timingText, penalty: penaltyText || _t('없음') }), 'loot-magic');
    spawnBeehiveWave(false);
    updateStaticUI();
    queueImportantSave(200);
}

function exitBeehiveRun(message, logType){
    closeBeehiveChoiceOverlay();
    let b = game.beehive || {};
    b.inRun = false;
    b.branchStep = 0;
    resetBeehiveRunModifiers(b);
    actExplorationProgress.depart(game); // 벌집 전용 지도를 걷던 중이면 바닥의 전리품을 거두고 그 탐험을 닫는다
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    if (message) addLog(message, logType || 'attack-monster');
    updateStaticUI();
    queueImportantSave(200);
}

function completeBeehiveRun(){
    let b = game.beehive || {};
    if (!b.inRun || !b.queenActive) return;
    const rewardZone = getZone('beehive_run');
    const risk = Math.max(0, Math.min(30, Math.floor(b.enemyEmpower || 0)));
    closeBeehiveChoiceOverlay();
    let queenRewardResults = [];
    if (Array.isArray(b.pendingQueenRewards)) {
        b.pendingQueenRewards.forEach(reward => {
            let result = applyBeehiveChoiceReward(reward);
            if (result) queenRewardResults.push(result);
        });
    }
    b.inRun = false;
    b.cleared = true;
    b.unlockedPermanent = true;
    resetBeehiveRunModifiers(b);
    b.branchStep = 0;
    actExplorationProgress.depart(game); // 벌집 전용 지도를 걷던 중이면 여왕이 떨군 것까지 거두고 그 탐험을 닫는다
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    markLoopSpecialBossKill('beehive_queen');
    unlockJournalEntry('beehive_queen');
    const wax = awardCurrency('beeswax', 1 + Math.floor(risk / 6), 'reward');
    const stinger = awardCurrency('venomStinger', 1 + Math.floor(risk / 10), 'reward');
    if (Math.random() < 0.08) {
        const itemLevel = levelProgression.itemLevel(rewardZone, { isBoss: true });
        const tier = Math.min(getRealmEquipmentHiddenTierCap(rewardZone), levelProgression.maxDropTier(itemLevel));
        let item = levelProgression.stampItem(generateUniqueItem(tier, '무기', null, rewardZone), itemLevel);
        addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true });
    }
    addLog(_t('👑 여왕벌 처치! 밀랍 +{wax}, 독벌침 +{stinger} (군체 강화 {risk} 정산).{picked}', { wax, stinger, risk, picked: queenRewardResults.length ? ` ${_t('여왕벌 선택 보상')}: ${queenRewardResults.join(' / ')}` : '' }), 'level-up');
    updateStaticUI();
    queueImportantSave(200);
}

function onBeehiveWaveCleared(){
    let b = game.beehive || {};
    if (!b.inRun || !b.awaitingClear) return;
    // HP 0 victims still in the field need their own loot and pack death records before the wave can advance.
    if (countBeehiveWaveAlive() > 0) return;
    b.waveExtra = 0;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    if (b.queenActive) return completeBeehiveRun();
    let rewardResult = '';
    if (b.pendingWaveReward) {
        rewardResult = applyBeehiveChoiceReward(b.pendingWaveReward);
        b.rewardLedger = Array.isArray(b.rewardLedger) ? b.rewardLedger : [];
        if (rewardResult) b.rewardLedger.push(rewardResult);
        b.pendingWaveReward = null;
        b.pendingWaveRewardText = '';
    }
    b.awaitingClear = false;
    game.combatHalted = true;
    game.runProgress = Math.min(100, Math.max(0, Math.floor(b.branchStep || 0)) * 10);
    queueImportantSave(200);
    if (b.branchStep >= 10) {
        b.awaitingClear = true;
        b.queenActive = true;
        game.combatHalted = false;
        spawnBeehiveWave(true);
        if (rewardResult) addLog(_t('🐝 벌떼 웨이브 정리 완료: {rewardResult}. 여왕벌이 등장합니다.', { rewardResult }), 'loot-unique');
        updateStaticUI();
        return;
    }
    prepareBeehiveBranchChoices(b);
    addLog(_t('🐝 벌떼 웨이브 정리 완료{reward}. 다음 갈림길을 선택할 수 있습니다. ({step}/10)', { reward: rewardResult ? `: ${rewardResult}` : '', step: b.branchStep }), 'loot-magic');
    openBeehiveChoiceOverlay(rewardResult ? _t('웨이브 보상: {rewardResult}', { rewardResult }) : '웨이브를 정리했습니다.');
    updateStaticUI();
}

async function forfeitBeehiveRun() {
    const b = game.beehive;
    if (!b.inRun || pendingBeehiveForfeits.has(b)) return;
    const queenRewards = b.pendingQueenRewards;
    pendingBeehiveForfeits.add(b);
    try {
        const confirmed = await requestGameConfirmation(_t('이미 받은 보상은 유지됩니다.\n아직 받지 않은 웨이브/여왕 보상은 사라지며, 입장 열쇠는 반환되지 않습니다.'), {
            title: _t('벌집 원정을 포기할까요?'), tone: 'danger', confirmLabel: _t('포기하고 귀환'), cancelLabel: _t('계속 탐험')
        });
        if (confirmed && game.beehive === b && b.inRun && b.pendingQueenRewards === queenRewards) {
            exitBeehiveRun('벌집 원정을 포기하고 탈출했습니다.', 'attack-monster');
        }
    } finally {
        pendingBeehiveForfeits.delete(b);
    }
}

function canAutoEnterGrandBreach(){
    if (actExplorationState.current(game)?.status === 'active') return false;
    let v = game.voidRift;
    let g = v.grandRun || {};
    let beehiveRunning = isBeehiveRunLockedForMapTravel();
    return !!(game.settings && game.settings.autoEnterGrandBreach && v.grandBreachUnlock && !g.inRun && !beehiveRunning && game.currentZoneId !== 'grand_breach_run');
}

/** 대균열 자동입장: 이야기 액트를 깰 때는 들어가지 않는다(2026-10-20: 지난 루프에 열린 대균열이 새 루프의 액트 1을 깨는 순간 1레벨
 * 영웅을 들여보내 패배했다). 혼돈 구역이나 아틀라스 지도에서 들어간다. */
function autoEnterGrandBreachIfReady(){
    // 콘텐츠 시작이 막힌 곳(열린 아틀라스 지도 같은)에서는 조용히 기다린다: 거절과 "진입" 기록이 지도마다 쌓였다(2026-10-20 검토)
    if (!canAutoEnterGrandBreach() || getZone(game.currentZoneId)?.type === 'act' || getContentStartBlockReason()) return false;
    enterGrandBreach({ automatic: true });
    if (game.currentZoneId !== 'grand_breach_run') return false;
    addLog(_t('🌌 자동입장: 대균열이 열려 즉시 진입합니다.'), 'season-up');
    return true;
}

function enterGrandBreach(options){
    const held = getContentStartBlockReason();
    if (held) return addLog(held, 'attack-monster');
    let v = game.voidRift;
    if (!v.grandBreachUnlock) return;
    if (v.grandRun && v.grandRun.inRun && game.currentZoneId !== 'grand_breach_run') {
        actExplorationState.groundLoot.discardEncounter(game, 'grand_breach_run');
        v.grandRun.inRun = false;
        v.grandRun.phase = 'failed';
    }
    if (v.grandRun && v.grandRun.inRun) return;
    v.grandBreachUnlock = false;
    v.grandRun = { inRun: true, phase: 'survival', survivalStarted: false, kills: 0, gauge: 0, pendingLoot: [],
        rewardVoidChisel: null, rewardJewelShard: null, nextRefillAt: 0, returnZoneId: getContentReturnZoneId() };
    actExplorationProgress.depart(game);
    game.currentZoneId = 'grand_breach_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = false;
    if (!options || !options.automatic) addLog(_t('🌌 대균열 진입! 일반 몬스터 0.5%, 정예 3%씩 게이지를 채워 균열 군주를 소환합니다. 전리품은 군주 처치 시 쏟아집니다.'), 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

function toggleMeteorAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterMeteor = !game.settings.autoEnterMeteor; addLog(`☄️ ${_t('운석 낙하 자동입장')} ${_t(game.settings.autoEnterMeteor ? '켜짐' : '꺼짐')}`, 'season-up'); updateStaticUI(); }

function toggleGrandBreachAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterGrandBreach = !game.settings.autoEnterGrandBreach; addLog(`🌌 ${_t('대균열 자동입장')} ${_t(game.settings.autoEnterGrandBreach ? '켜짐' : '꺼짐')}`, 'season-up'); autoEnterGrandBreachIfReady(); updateStaticUI(); }

/** 혼돈계 지도 화면(2026-10-25 사용자: 혼돈계도 다듬으면서 탭 스타일 맞춤): 지하계와 같은 층 입장 카드, 고른 층의 특징, 영구 보너스,
 * 나무꾼의 잔상. 카드 모양은 지하계 쪽(css/components.css underworld-*)을 함께 쓴다. */
function renderChaosRealmMapPanel() {
    let panel = document.getElementById('ui-chaos-realm-panel');
    let list = document.getElementById('ui-chaos-realm-list');
    if (!panel || !list) return;
    let st = ensureChaosRealmState();
    let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
    writeHtmlIfChanged(panel, st.unlocked ? chaosRealmEntryHtml(st) : chaosRealmLockedHtml(best));
    writeHtmlIfChanged(list, st.unlocked ? chaosRealmDetailHtml(st, best) : '');
    list.hidden = !st.unlocked;
}

function chaosRealmLockedHtml(best) {
    return `<section class="underworld-entry-card"><div class="underworld-entry-copy"><span>${_t('혼돈계 봉인')}</span><strong>${_t('나무꾼 피해율 {best} / 10%', { best: best.toFixed(1) })}</strong>`
        + '<small class="underworld-lock">혼돈 밖 최종보스 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투가 끝나면 열립니다</small></div></section>';
}

function chaosRealmEntryHtml(st) {
    let ready = canEnterChaosRealm(), floor = Math.max(1, Math.floor(st.currentFloor || 1)), highest = Math.max(1, Math.floor(st.highestFloor || 1));
    let lock = ready ? '' : '<small class="underworld-lock">이번 루프에서 혼돈 20을 클리어해야 들어갑니다. 진행과 보너스는 남습니다</small>';
    return `<section class="underworld-entry-card ${game.currentZoneId === CHAOS_REALM_ZONE_ID ? 'current' : ''}"><div class="underworld-entry-copy">`
        + `<span>${_t('루프로 초기화되지 않는 층, 선택 {floor}층, 클리어 {length}층', { floor, length: st.clearedFloors.length })}</span><strong>${_t('최고 입장 {highest}층', { highest })}</strong>`
        + `<div>${buildMapPowerEstimateHtml(getZone(CHAOS_REALM_ZONE_ID))}</div>${lock}</div><div class="underworld-entry-actions">`
        + `<button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterChaosRealmPrompt()" ${ready ? '' : 'disabled'}>${_t('층 골라 입장')}</button></div></section>`;
}

function chaosRealmDetailHtml(st, best) {
    let floor = Math.max(1, Math.floor(st.currentFloor || 1)), zone = getZone(CHAOS_REALM_ZONE_ID), bonus = st.permanentBonuses || {};
    let traits = getChaosRealmAffixes(floor).map(affix => `<span class="is-affix"><b>${_t(affix.name)}</b> ${_t(affix.desc)}</span>`).join('');
    let bonuses = CHAOS_REALM_BONUS_CHIPS.map(([name, key, digits]) => `<span class="has-stat${bonus[key] ? '' : ' is-zero'}" style="--stat-tone:${getItemStatToneColor(key)}">${name} <b>+${(Number(bonus[key]) || 0).toFixed(digits)}%</b></span>`).join('');
    return `<div class="chaos-realm-body"><section class="underworld-upgrade-card underworld-reward-card"><div><strong>${_t('{floor}층 특징', { floor })}</strong>`
        + `<span>${_t('난이도 혼돈 심화 {value}급', { value: zone ? zone.tier : getChaosRealmTier(floor) })}</span></div><div class="underworld-ticket-strip">${traits}</div></section>`
        + `<section class="underworld-upgrade-card underworld-reward-card"><div><strong>${_t('영구 보너스')}</strong><span>${_t('층을 처음 깰 때 쌓이고, 루프가 지나도 남습니다.')}`
        + ` ${_t('나무꾼 최고 피해율 {best}%', { best: best.toFixed(1) })}</span></div><div class="underworld-ticket-strip">${bonuses}</div></section>${woodsmanEchoCardHtml()}</div>`;
}

function woodsmanEchoCardHtml() {
    if (!(Array.isArray(game.journalEntries) && game.journalEntries.includes('woodsman_echo'))) return '';
    const echo = getRecordsView(game).echo;
    const recent = echo.last ? `<span>${_t('최근 DPS')} <b>${Math.floor(echo.last.dps).toLocaleString()}</b></span>` : '';
    const change = echo.changePct === null ? '' : `<span>${_t('이전 대비')} <b>${echo.changePct >= 0 ? '+' : ''}${echo.changePct.toFixed(1)}%</b></span>`;
    const best = Math.max(echo.bestDps, game.woodsmanEchoRun.bestDps);
    return `<section class="underworld-upgrade-card"><div><strong>${_t('나무꾼의 잔상')}</strong><span>${_t('30초 피해 측정')}</span>`
        + `<div class="underworld-ticket-strip">${recent}${change}<span>${_t('최고 DPS')} <b>${Math.floor(best).toLocaleString()}</b></span></div></div>`
        + '<button type="button" data-exploration-departure onclick="enterWoodsmanEchoChallenge()">측정</button></section>';
}

function renderSkyTowerMapPanel() {
    const panel = document.getElementById('ui-sky-tower-panel');
    const list = document.getElementById('ui-sky-tower-list');
    if (!panel || !list) return;
    const tower = ensureSkyTowerState();
    sideEncounterUi.renderPanel(panel, sideEncounterUi.skyPanel(tower));
    sideEncounterUi.renderPanel(list, tower.unlocked ? sideEncounterUi.skyGrowth(tower) : '');
}

function updateCombatOxygenBar() {
    let box = document.getElementById('ui-ocean-oxygen-box');
    if (!box) return;
    let st = (typeof ensureOceanState === 'function') ? ensureOceanState() : null;
    let active = st && st.unlocked && st.diving && game.currentZoneId === OCEAN_ZONE_ID;
    if (!active) { if (box.style.display !== 'none') box.style.display = 'none'; return; }
    box.style.display = '';
    let max = Math.max(1, st.oxygenMax || 100);
    let cur = Math.max(0, Math.min(max, st.oxygenCur || 0));
    let pct = (cur / max) * 100;
    let bar = document.getElementById('ui-ocean-oxygen-bar');
    let text = document.getElementById('ui-ocean-oxygen-text');
    if (bar) {
        bar.style.width = pct + '%';
        // 산소가 20% 이하로 떨어지면 경고색(붉은 그라데이션)으로 전환합니다.
        bar.style.background = pct <= 20 ? 'linear-gradient(90deg,#d63031,#ff7675)' : 'linear-gradient(90deg,#1f9bd6,#4fd1ff)';
    }
    if (text) text.textContent = `${Math.ceil(cur)} / ${max}`;
}

/** 지하계 지도 화면(탐사, 지하석, 장비 가공 쪽)은 js/underworld-rune-ui.js가 그린다. */
function renderUnderworldMapPanel() {
    underworldRuneUi.render();
}

function ensureUnderworldRuneState() {
    if (!game.underworldRunes || typeof game.underworldRunes !== 'object') game.underworldRunes = { unlockedSlots: 0, unlockedRunesMaxNumber: 0, obtainedRunes: [], equippedRunes: [null, null, null, null, null, null], enhanceLvByNo: {} };
    game.underworldRunes.obtainedRunes = Array.isArray(game.underworldRunes.obtainedRunes) ? game.underworldRunes.obtainedRunes : [];
    game.underworldRunes.equippedRunes = Array.isArray(game.underworldRunes.equippedRunes) ? game.underworldRunes.equippedRunes.slice(0, 6) : [null, null, null, null, null, null];
    while (game.underworldRunes.equippedRunes.length < 6) game.underworldRunes.equippedRunes.push(null);
    game.underworldRunes.enhanceLvByNo = (game.underworldRunes.enhanceLvByNo && typeof game.underworldRunes.enhanceLvByNo === 'object') ? game.underworldRunes.enhanceLvByNo : {};
    game.underworldRunes.bonusLinesByNo = (game.underworldRunes.bonusLinesByNo && typeof game.underworldRunes.bonusLinesByNo === 'object') ? game.underworldRunes.bonusLinesByNo : {};
    return game.underworldRunes;
}

function getUnderworldRuneDef(no) {
    return (Array.isArray(UNDERWORLD_RUNE_DB) ? UNDERWORLD_RUNE_DB : []).find(row => row.no === Math.max(1, Math.floor(no || 0))) || null;
}

function getUnderworldRuneCountMap(runes) {
    return (Array.isArray(runes) ? runes : []).reduce((acc, n) => {
        let key = Math.max(1, Math.floor(n || 1));
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});
}

function getUnderworldRuneEffectHtml(no) {
    let def = getUnderworldRuneDef(no);
    if (!def) return `<span style="color:var(--copy-muted);">${_t('지하석 정보 없음')}</span>`;
    let tone = typeof getItemStatToneColor === 'function' ? getItemStatToneColor(def.stat) : '#dce6ff';
    let level = Math.max(0, Number(game.underworldRunes?.enhanceLvByNo?.[no]) || 0);
    return `<span style="color:${tone};">${getStatName(def.stat)} +${formatValue(def.stat, def.val*(1+level*0.01))}${P_STATS[def.stat]?.isPct ? '%' : ''}${level ? `, +${level}` : ''}</span>`;
}

function buildUnderworldRuneTooltipHtml(no) {
    let def = getUnderworldRuneDef(no);
    if (!def) return '<div class="tooltip-title">알 수 없는 지하석</div><div class="tooltip-line">지하석 효과 정보가 없습니다.</div>';
    let st = ensureUnderworldRuneState();
    let lv = Math.max(0, Math.floor(st.enhanceLvByNo[def.no] || 0));
    let boosted = Number(def.val || 0) * (1 + lv * 0.01);
    let mainLine = `${getStatName(def.stat)} +${formatValue(def.stat, boosted)}${P_STATS[def.stat]?.isPct ? '%' : ''}${lv > 0 ? ` <span style="color:var(--copy-bright);">${_t('(+{lv} 강화)', { lv })}</span>` : ''}`;
    let bonusLines = (st.bonusLinesByNo[def.no] || []).map(line => `<div class="tooltip-line" style="color:${getItemStatToneColor(line.stat)};">${_t('보너스, {stat} +{stat2}{value}', { stat: getStatName(line.stat), stat2: formatValue(line.stat, line.val), value: P_STATS[line.stat]?.isPct ? '%' : '' })}</div>`).join('');
    return `<div class="tooltip-title">${escapeHTML(_t(def.name))} <span style="color:var(--copy-bright);">${_t('지하석{no}', { no: def.no })}</span></div><div class="tooltip-line" style="color:${getItemStatToneColor(def.stat)};">${mainLine}</div>${bonusLines || _t('<div class="tooltip-line" style="color:var(--copy-muted);">강화 보너스 옵션 없음</div>')}`;
}

function showUnderworldRuneTooltip(event, no) {
    if (event.type !== 'click' && !window.matchMedia('(hover: hover)').matches) return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildUnderworldRuneTooltipHtml(no), '#9b7cff');
}

function autoEquipUnderworldRune(no) {
    let st = ensureUnderworldRuneState();
    let cap = Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)));
    if (cap <= 0) return;
    for (let i = 0; i < cap; i++) {
        if (!st.equippedRunes[i]) {
            // 인벤토리에서 해당 지하석 1개 제거 후 슬롯에 장착
            let ownedIdx = st.obtainedRunes.findIndex(n => Math.floor(n || 0) === Math.floor(no || 0));
            if (ownedIdx !== -1) st.obtainedRunes.splice(ownedIdx, 1);
            st.equippedRunes[i] = no;
            return;
        }
    }
}

function closeUnderworldRuneOverlay() {
    underworldRuneUi.closeOverlay();
}

function equipUnderworldRuneToSlot(slotIndex, no) {
    if (!assertBuildEditable()) return;
    let st = ensureUnderworldRuneState();
    let idx = slotIndex, runeNo = no;
    if (!underworldRuneUi.validSlot(st, idx) || !Number.isInteger(runeNo) || runeNo < 1 || !getUnderworldRuneDef(runeNo)) return;
    // 보유 인벤토리에 해당 지하석이 있는지 확인
    let ownedIdx = st.obtainedRunes.findIndex(n => Math.floor(n || 0) === runeNo);
    if (ownedIdx === -1) return; // 보유하지 않은 지하석은 장착 불가
    // 기존에 슬롯에 장착된 지하석이 있으면 인벤토리로 반환
    let prevRune = st.equippedRunes[idx];
    if (prevRune) st.obtainedRunes.push(Math.floor(prevRune));
    // 인벤토리에서 지하석 1개 제거 후 슬롯에 장착
    st.obtainedRunes.splice(ownedIdx, 1);
    st.equippedRunes[idx] = runeNo;
    closeUnderworldRuneOverlay();
    updateStaticUI();
    queueImportantSave(200);
}

function unequipUnderworldRuneSlot(slotIndex) {
    if (!assertBuildEditable()) return;
    let st = ensureUnderworldRuneState();
    let idx = slotIndex;
    if (!underworldRuneUi.validSlot(st, idx)) return;
    let prevRune = st.equippedRunes[idx];
    if (prevRune) st.obtainedRunes.push(Math.floor(prevRune)); // 인벤토리로 반환
    st.equippedRunes[idx] = null;
    closeUnderworldRuneOverlay();
    updateStaticUI();
    queueImportantSave(200);
}

function getUnderworldRuneOverlayOptionsHtml(slotIndex, runeCountMap) {
    let keys = Object.keys(runeCountMap).sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return '<div class="underworld-rune-empty">보관 중인 지하석이 없습니다.</div>';
    return keys.map(key => {
        let no = Number(key);
        let def = getUnderworldRuneDef(no);
        let title = def ? def.name : _t('지하석{no}', { no });
        return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="equipUnderworldRuneToSlot(${slotIndex},${no})">${underworldRuneUi.iconHtml(no)}<strong>${title}</strong><span>${_t('보유 {runeCountMap}개, {no}', { runeCountMap: runeCountMap[key], no: getUnderworldRuneEffectHtml(no) })}</span></button>`;
    }).join('');
}

function openUnderworldRuneOverlay(slotIndex) {
    closeUnderworldRuneOverlay();
    let st = ensureUnderworldRuneState();
    let idx = slotIndex;
    if (!underworldRuneUi.validSlot(st, idx)) return;
    let runeCountMap = getUnderworldRuneCountMap(st.obtainedRunes);
    let current = st.equippedRunes[idx] ? buildUnderworldRuneTooltipHtml(st.equippedRunes[idx]) : '<div class="tooltip-line">현재 비어있음</div>';
    let overlay = document.createElement('div');
    overlay.id = 'underworld-rune-overlay';
    overlay.className = 'underworld-rune-overlay';
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">${_t('지하석 슬롯 {value} 선택', { value: idx + 1 })}</div><div class="underworld-rune-overlay-desc">${_t('보유한 룬을 클릭해 장착하거나 현재 슬롯을 비울 수 있습니다.')}</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">${_t('닫기')}</button></div><div class="underworld-rune-current">${current}</div><div class="underworld-rune-option-grid">${getUnderworldRuneOverlayOptionsHtml(idx, runeCountMap)}</div><div class="underworld-rune-overlay-actions"><button type="button" onclick="unequipUnderworldRuneSlot(${idx})" ${st.equippedRunes[idx] ? '' : 'disabled'}>${_t('이 슬롯 해제')}</button></div></div>`;
    document.body.appendChild(overlay);
    underworldRuneUi.mountOverlay(overlay, `.underworld-rune-slot:nth-child(${idx+1})`);
}

function craftUnderworldRune() {
    if (!assertBuildEditable()) return;
    let st = ensureUnderworldRuneState();
    let maxNo = Math.max(0, Math.floor(st.unlockedRunesMaxNumber || 0));
    if (maxNo <= 0) return addLog(_t('먼저 지하계 10층 단위 보상으로 지하석 번호를 해금하세요.'), 'attack-monster');
    let need = 10;
    if ((game.currencies.runeShard || 0) < need) return addLog(_t('지하석 조각이 부족합니다. (필요: {need})', { need }), 'attack-monster');
    game.currencies.runeShard -= need;
    let roll = 1 + Math.floor(Math.random() * maxNo);
    st.obtainedRunes.push(roll);
    autoEquipUnderworldRune(roll);
    let def = getUnderworldRuneDef(roll);
    addLog(_t('🧿 지하석 가공 성공: {name} 획득 ({detail})', { name: def ? _t(def.name) : _t('지하석{n}', { n: roll }), detail: def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : '' }), 'loot-unique');
    updateStaticUI();
    queueImportantSave(200);
}

function getUnderworldRuneUpgradeOptionHtml(no, count, unlockedMax) {
    let shardNeed = Math.max(5, no);
    let canPay = (game.currencies.runeShard || 0) >= shardNeed;
    let canUpgrade = no < unlockedMax && canPay;
    let target = no + 1;
    let def = getUnderworldRuneDef(no);
    let toDef = getUnderworldRuneDef(target);
    let status = canUpgrade ? `${withDirectionParticle(_t('지하석{target}', { target }))} 승급, 지하석 조각 ${shardNeed}` : (no >= unlockedMax ? _t('지하석{target} 해금 필요', { target }) : _t('지하석 조각 부족 ({shardNeed})', { shardNeed }));
    let title = def ? _t('{name} 지하석{no}', { name: def.name, no }) : _t('지하석{no}', { no });
    let targetName = toDef ? _t('{name} 지하석{target}', { name: toDef.name, target }) : _t('지하석{target}', { target });
    return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="upgradeUnderworldRune(${no})" ${canUpgrade ? '' : 'disabled'}>${underworldRuneUi.iconHtml(no)}<strong>${title} ×${count}</strong><span>${getUnderworldRuneEffectHtml(no)}</span><span>→ ${targetName}, ${status}</span></button>`;
}

function openUnderworldRuneUpgradeOverlay() {
    closeUnderworldRuneOverlay();
    let st = ensureUnderworldRuneState();
    let count = getUnderworldRuneCountMap(st.obtainedRunes);
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    let rows = Object.keys(count).map(Number).sort((a, b) => a - b).filter(no => count[no] >= 3 && no < 30);
    if (rows.length === 0) return addLog(_t('동일 번호 지하석 3개가 필요합니다. (지하석30은 승급 불가)'), 'attack-monster');
    let overlay = document.createElement('div');
    overlay.id = 'underworld-rune-overlay';
    overlay.className = 'underworld-rune-overlay';
    let options = rows.map(no => getUnderworldRuneUpgradeOptionHtml(no, count[no], unlockedMax)).join('');
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">${_t('지하석 승급 대상 선택')}</div><div class="underworld-rune-overlay-desc">${_t('동일 번호 룬 3개와 룬조각을 사용해 어떤 룬을 다음 번호로 승급할지 선택하세요.')}</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">${_t('닫기')}</button></div><div class="underworld-rune-option-grid">${options}</div></div>`;
    document.body.appendChild(overlay);
    underworldRuneUi.mountOverlay(overlay, '.underworld-action-grid button[onclick="openUnderworldRuneUpgradeOverlay()"]');
}

function upgradeUnderworldRune(fromNo) {
    if (!assertBuildEditable()) return;
    if (fromNo == null) return openUnderworldRuneUpgradeOverlay();
    let st = ensureUnderworldRuneState();
    let count = getUnderworldRuneCountMap(st.obtainedRunes);
    let from = Number.isInteger(fromNo) ? fromNo : 0;
    if (!(count[from] >= 3) || from >= 30) return addLog(_t('동일 번호 지하석 3개가 필요합니다. (지하석30은 승급 불가)'), 'attack-monster');
    let shardNeed = Math.max(5, from);
    if ((game.currencies.runeShard || 0) < shardNeed) return addLog(_t('지하석 조각이 부족합니다. (필요: {shardNeed})', { shardNeed }), 'attack-monster');
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    if (from >= unlockedMax) return addLog(_t('현재는 {stone} 승급할 수 없습니다. (해금된 최대 번호: {max})', { stone: withObjectParticle(_t('지하석{n}', { n: from })), max: unlockedMax }), 'attack-monster');
    game.currencies.runeShard -= shardNeed;
    let removed = 0;
    st.obtainedRunes = st.obtainedRunes.filter(n => Math.floor(n || 0) === from && removed++ < 3 ? false : true);
    let to = Math.min(unlockedMax, from + 1);
    st.obtainedRunes.push(to);
    autoEquipUnderworldRune(to);
    closeUnderworldRuneOverlay();
    let def = getUnderworldRuneDef(to);
    addLog(_t('🧿 지하석 승급 성공: {from}×3 + 지하석 조각 {shards} → {to} ({detail})', { from: _t('지하석{n}', { n: from }), shards: shardNeed, to: def ? _t(def.name) : _t('지하석{n}', { n: to }), detail: def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : '' }), 'loot-unique');
    updateStaticUI();
    queueImportantSave(200);
}

function getMapPrimaryTabEntryCondition(contentId) {
    let condition = getMapPrimaryContentEntryCondition(contentId, game);
    if (contentId !== 'map-tab-pvp') return condition;
    if (typeof socialCloudReady !== 'function' || !socialCloudReady()) return '로그인 필요';
    if (typeof getMyNickname === 'function' && !getMyNickname()) return '닉네임 설정 필요';
    return '';
}

function revealMapPrimaryTab(button, contentId) {
    if (!button || !pendingMapPrimaryTabReveals.has(contentId)) return;
    pendingMapPrimaryTabReveals.delete(contentId);
    button.classList.add('map-primary-tab-unlock-reveal');
    button.addEventListener('animationend', () => {
        button.classList.remove('map-primary-tab-unlock-reveal');
    }, { once: true });
    setTimeout(() => button.classList.remove('map-primary-tab-unlock-reveal'), 1400);
}

function syncMapPrimaryContentTabs() {
    let activeUnlocked = false;
    MAP_PRIMARY_CONTENTS.forEach(def => {
        let button = document.getElementById('btn-' + def.id);
        let unlocked = isMapPrimaryContentUnlocked(game, def.id);
        if (def.id === game.mapSubtab) activeUnlocked = unlocked;
        if (!button) return;
        button.style.display = unlocked ? '' : 'none';
        let condition = unlocked ? getMapPrimaryTabEntryCondition(def.id) : '';
        button.classList.toggle('map-primary-tab--entry-locked', !!condition);
        button.dataset.entryCondition = condition;
        button.setAttribute('aria-label', condition ? `${def.label}, ${condition}` : def.label);
        button.dataset.tip = condition;
        if (unlocked) revealMapPrimaryTab(button, def.id);
    });
    if (!activeUnlocked && game.mapSubtab !== 'map-tab-zones') switchMapSubtab('map-tab-zones');
}

function announceMapPrimaryContentUnlocks() {
    let newlyUnlocked = reconcileMapPrimaryContentUnlocks(game);
    if (newlyUnlocked.length === 0) return newlyUnlocked;
    game.noti.map = true;
    newlyUnlocked.forEach(id => pendingMapPrimaryTabReveals.add(id));
    let queuedKeys = new Set();
    newlyUnlocked.forEach(id => {
        let def = MAP_PRIMARY_CONTENTS.find(row => row.id === id);
        if (!def || !def.noticeKey || queuedKeys.has(def.noticeKey)) return;
        queuedKeys.add(def.noticeKey);
        queueTutorialNotice(def.noticeKey, def.noticeTitle, def.noticeBody, 'tab-map', def.noticeTargetId || def.id);
    });
    syncMapPrimaryContentTabs();
    return newlyUnlocked;
}

function switchMapExploreSubtab(subtabId) {
    if (!contentProgression.canOpen(subtabId)) return;
    const fallback = 'map-explore-atlas';
    const panel = document.getElementById(subtabId) ? document.getElementById(subtabId) : document.getElementById(fallback);
    const activeId = panel ? panel.id : fallback;
    if (activeId === game.mapExploreSubtab && isSelectedSubtab(activeId)) return;
    game.mapExploreSubtab = activeId;
    document.querySelectorAll('#map-tab-zones .vertical-tab-panel').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#map-tab-zones .vertical-tab-btn').forEach(el => el.classList.remove('active'));
    if (panel) panel.classList.add('active');
    let btn = document.getElementById('btn-' + activeId);
    if (btn) btn.classList.add('active');
    clearMapExploreAlarm(activeId);
    renderMapExploreNotiDots();
    if (activeId === 'map-explore-beehive') renderLoop8BeehivePanel(true);
    if (activeId === 'map-explore-colony') renderLoop15ColonyPanel();
    if (activeId === 'map-explore-beyond') renderBeyondBoundaryPanel();
    if (activeId === 'map-explore-worldtree') atlasUi.render();
    renderMobileMapNavigation();
    explorationAtlasUi.render();
}

// 알람 대상 세부 탭별 "해금된 지도 수" 시그니처. 값이 증가하면 새 지도가 열린 것이다.
// 나무(일반 사냥터) 탭은 스토리 액트 존만 표시하므로(혼돈 1~20층은 별도의 혼돈 탭에 렌더링됨),
// 그 시그니처도 스토리 존 범위(LAST_STORY_ZONE_ID)까지만 세야 한다. getVisibleHuntingMapCapZoneId()는
// 혼돈 20층까지 포함하는 범위라 그대로 쓰면 혼돈 층수 개방만으로도 나무 탭에 알람이 잘못 뜬다.
function getMapExploreUnlockSignatures() {
    const huntingMapCap = typeof LAST_STORY_ZONE_ID === 'number'
        ? LAST_STORY_ZONE_ID : Math.max(0, Math.floor(game.maxZoneId || 0));
    const season = game.season || 1;
    const rootBossZones = typeof SEASON_BOSS_ZONES !== 'undefined' ? SEASON_BOSS_ZONES : [];
    const trialZones = contentProgression.isUnlocked('battleTrials') ? TRIAL_ZONES : [];
    const isTrialAvailable = trial => trial.bloomTrial
        ? canSeeTalentBloomTrial()
        : ((trial.reqZone !== -1 && game.maxZoneId >= trial.reqZone) || (game.unlockedTrials || []).includes(trial.id));
    return {
        'map-explore-hunting': Math.min(Math.max(0, Math.floor(game.maxZoneId || 0)), huntingMapCap),
        'map-explore-root-boss': rootBossZones.filter(zone => season >= (zone.reqSeason || 2)).length,
        'map-explore-colony': season >= 15 ? 1 : 0,
        'map-explore-trials': trialZones.filter(isTrialAvailable).length
    };
}

function ensureMapAlarmState() {
    if (!game.mapAlarmSeen || typeof game.mapAlarmSeen !== 'object') game.mapAlarmSeen = {};
    if (!game.mapAlarmMainSeen || typeof game.mapAlarmMainSeen !== 'object') game.mapAlarmMainSeen = {};
}

// 새 지도 해금 감지. 두 기준선을 둔다: 세부 탭 배지(mapAlarmSeen)는 해당 세부 탭을 열 때,
// 지도 메인 탭 알람(mapAlarmMainSeen)은 지도 탭을 열 때 각각 확인 처리된다. 최초 1회는
// 기준선만 설정해 기존 해금분에는 알람을 띄우지 않는다.
function detectNewMapUnlockAlarms() {
    ensureMapAlarmState();
    const sigs = getMapExploreUnlockSignatures();
    MAP_EXPLORE_ALARM_SUBTABS.forEach(key => {
        if (game.mapAlarmSeen[key] === undefined) game.mapAlarmSeen[key] = sigs[key];
        if (game.mapAlarmMainSeen[key] === undefined) { game.mapAlarmMainSeen[key] = sigs[key]; return; }
        if (sigs[key] > game.mapAlarmMainSeen[key]) game.noti.map = true;
    });
}

// 해당 세부 탭을 열어 확인하면 그 탭의 배지를 끈다(마지막 확인 시그니처를 현재값으로 갱신).
function clearMapExploreAlarm(subtabId) {
    // 세계 지도에 액트가 다 보이므로 새로 열린 액트의 알림도 거기서 본 것으로 친다(2026-11-09).
    const key = subtabId === 'map-explore-atlas' ? 'map-explore-hunting' : subtabId;
    if (!MAP_EXPLORE_ALARM_SUBTABS.includes(key)) return;
    ensureMapAlarmState();
    game.mapAlarmSeen[key] = getMapExploreUnlockSignatures()[key];
}

// 지도 메인 탭을 열면 메인 알람 기준선을 현재값으로 맞춰 메인 빨간점을 끈다.
// (세부 탭 배지는 각 세부 탭을 열 때까지 유지된다.)
function acknowledgeMapMainAlarm() {
    ensureMapAlarmState();
    const sigs = getMapExploreUnlockSignatures();
    MAP_EXPLORE_ALARM_SUBTABS.forEach(key => { game.mapAlarmMainSeen[key] = sigs[key]; });
}

function renderMapExploreNotiDots() {
    if (!game.mapAlarmSeen || typeof game.mapAlarmSeen !== 'object') return;
    const sigs = getMapExploreUnlockSignatures();
    MAP_EXPLORE_ALARM_SUBTABS.forEach(key => {
        const dot = document.getElementById('noti-' + key);
        if (!dot) return;
        const seen = game.mapAlarmSeen[key];
        dot.style.display = (seen !== undefined && sigs[key] > seen) ? 'block' : 'none';
    });
}

// 좌측 탐험 목록에서 이 세부 탭 버튼이 실제로 노출 중인지(해금됐는지) 본다.
function isMapExploreSubtabOpenable(subtabId) {
    let btn = document.getElementById('btn-' + subtabId);
    return !!btn && btn.style.display !== 'none';
}

// 지도 탭의 빨간 점을 켠 원인 세부 화면을 돌려준다. 액트 보상 미수령이 우선이고,
// 그다음이 아직 열어 보지 않은 신규 해금이다.
function getMapAlarmSourceSubtab() {
    if (getAvailableActRewardZoneIds().length > 0) return 'map-explore-atlas';
    ensureMapAlarmState();
    let sigs = getMapExploreUnlockSignatures();
    const source = MAP_EXPLORE_ALARM_SUBTABS.find(key => {
        let seen = game.mapAlarmSeen[key];
        return seen !== undefined && sigs[key] > seen && isMapExploreSubtabOpenable(key);
    }) || null;
    // 받을 액트 보상과 새로 열린 액트는 세계 지도에서 그 액트를 고른 설명 칸으로 연다(액트 목록 대신, 2026-11-09).
    return source === 'map-explore-hunting' ? 'map-explore-atlas' : source;
}

// 알람을 보고 지도를 열었으면 마지막에 보던 화면이 아니라 알람을 띄운 화면부터 연다.
// (알림 플래그를 끄기 전에 판정해야 하므로 switchTab의 알림 해제보다 앞에서 호출한다.)
function focusMapAlarmSourceSubtab() {
    if (!(game.noti && game.noti.map && isNotiEnabled('map'))) return;
    let source = getMapAlarmSourceSubtab();
    if (!source) return;
    game.mapSubtab = 'map-tab-zones';
    game.mapExploreSubtab = source;
    if (source === 'map-explore-atlas') worldMapUi.pickAct(getAvailableActRewardZoneIds()[0] ?? Math.floor(Number(game.maxZoneId) || 0));
}

// 탐험 좌측 세부 탭 버튼 노출 여부를 갱신한다. subtabId는 패널/버튼 id의 공통 키
// (예: 'map-explore-chaos')다. 잠긴 세부 탭이 현재 선택되어 있으면 나무 탭으로 되돌린다.
function setExploreSubtabAvailable(subtabId, available) {
    let btn = document.getElementById('btn-' + subtabId);
    if (btn) btn.style.display = available ? '' : 'none';
    if (!available && game.mapExploreSubtab === subtabId) switchMapExploreSubtab('map-explore-atlas');
}

function enterLabyrinthFloor(requestedFloor) {
    const blocked = floorEntryBlockReason(LABYRINTH_ZONE_ID);
    if (blocked) return addLog(blocked, 'attack-monster');
    const max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    const floor = Number(requestedFloor);
    if (!Number.isInteger(floor) || floor < 1 || floor > max) {
        return addLog(_t('1~{max} 범위의 층수를 입력하세요.', { max }), 'attack-monster');
    }
    game.labyrinthFloor = floor;
    changeZone(LABYRINTH_ZONE_ID);
}

async function confirmSkyTowerEntry() {
    if (getSkyTowerRemainingClears() === 0) return requestGameConfirmation(_t('등반 보상 없이 한 층을 연습합니다.'), {
        title: _t('연습 전투'), tone: 'warning', confirmLabel: _t('연습 입장')
    });
    if (game.settings.mapCompleteAction !== 'repeatZone') return true;
    return requestGameConfirmation(_t("현재 맵 완료 행동이 '같은 지역 반복'입니다. 돌파 후 같은 층에 머무릅니다."), {
        title: _t('반복 설정 확인'), tone: 'warning', confirmLabel: _t('그대로 입장')
    });
}

async function selectSkyTowerFloor(tower, selectedFloor) {
    const max = tower.highestFloor;
    let value = selectedFloor;
    if (value === undefined && max > 1) value = await requestGameNumber({
        title: _t('창공의 탑 층 선택'),
        message: _t('이번 루프 남은 보상 전투: {skyTowerRemainingClears}/{skyTowerLoopClearLimit}', { skyTowerRemainingClears: getSkyTowerRemainingClears(), skyTowerLoopClearLimit: getSkyTowerLoopClearLimit() }),
        min: 1, max, value: tower.currentFloor, confirmLabel: _t('입장')
    });
    if (value === undefined) value = 1;
    if (value === null) return null;
    const floor = Number(value);
    if (Number.isInteger(floor) && floor >= 1 && floor <= max) return floor;
    addLog(_t('1~{max} 범위의 층수를 입력하세요.', { max }), 'attack-monster');
    return null;
}

/** What changeZone would refuse for a floor prompt's zone (its travel rule, then a held run), asked before the prompt opens. */
function floorEntryBlockReason(zoneId) {
    return getZoneTravelBlockReason(zoneId) || getHeldRunBlockReason();
}

function floorEntryStillCurrent(context, canEnter) {
    return game === context.owner && game[context.field] === context.progress && game.season === context.season && canEnter();
}

async function enterSkyTowerPrompt(selectedFloor) {
    const held = floorEntryBlockReason(SKY_TOWER_ZONE_ID);
    if (held) return addLog(held, 'attack-monster');
    const st = ensureSkyTowerState();
    if (!st.unlocked) return addLog(_t('창공의 탑은 루프 15 이후 이번 루프 혼돈 20층 클리어 시 해금됩니다.'), 'attack-monster');
    if (!canEnterSkyTower()) return addLog(_t('창공의 탑은 영구 해금 후 해당 루프에서 혼돈에 입성하면 입장할 수 있습니다.'), 'attack-monster');
    const context = { owner: game, progress: st, field: 'skyTower', season: game.season };
    if (!await confirmSkyTowerEntry()) return;
    const floor = await selectSkyTowerFloor(st, selectedFloor);
    if (floor === null) return;
    if (!floorEntryStillCurrent(context, canEnterSkyTower)) return;
    const stillHeld = floorEntryBlockReason(SKY_TOWER_ZONE_ID);
    if (stillHeld) return addLog(stillHeld, 'attack-monster');
    if (floor > st.highestFloor) return;
    st.currentFloor = floor;
    changeZone(SKY_TOWER_ZONE_ID);
    updateStaticUI();
}

function upgradeSkyStone() {
    if (!assertBuildEditable()) return;
    let st = ensureSkyTowerState();
    if (!st.unlocked) return addLog(_t('창공의 탑이 열린 뒤 창공석을 만들 수 있습니다.'), 'attack-monster', { toast: true });
    let max = getSkyStoneMaxLevel();
    let lv = Math.max(0, Math.floor(((st.skyStone || {}).level) || 0));
    if (lv >= max) return addLog(_t('창공석은 이미 최종 강화 상태입니다.'), 'attack-monster');
    let cost = getSkyStoneNextCost();
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return addLog(_t('응축된 창공의 정수가 부족합니다. (필요: {cost})', { cost }), 'attack-monster');
    st.condensedPower -= cost;
    st.skyStone = st.skyStone || { crafted: false, level: 0 };
    st.skyStone.crafted = true;
    st.skyStone.level = lv + 1;
    addLog(_t(lv === 0 ? '창공석 제작 완료: 지하계 중력 패널티 감소 {pct}%' : '창공석 강화 완료: 지하계 중력 패널티 감소 {pct}%', { pct: getSkyStoneReductionPct() }), 'loot-unique');
    queueImportantSave(200);
    updateStaticUI();
}

async function enterChaosRealmPrompt(){
    const held = floorEntryBlockReason(CHAOS_REALM_ZONE_ID);
    if (held) return addLog(held, 'attack-monster');
    let st = ensureChaosRealmState();
    if (!st.unlocked) return addLog(_t('혼돈계는 혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투 종료 시 해금됩니다.'), 'attack-monster');
    if (!canEnterChaosRealm()) return addLog(_t('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.'), 'attack-monster');
    const context = { owner: game, progress: st, field: 'chaosRealm', season: game.season };
    const max = st.highestFloor;
    let v = await requestGameNumber({
        title: _t('혼돈계 층 선택'),
        message: _t('입장 가능한 최고 층은 {max}층입니다.', { max }),
        min: 1,
        max,
        value: max,
        confirmLabel: _t('입장')
    });
    if (v === null || !floorEntryStillCurrent(context, canEnterChaosRealm)) return;
    const blocked = floorEntryBlockReason(CHAOS_REALM_ZONE_ID);
    if (blocked) return addLog(blocked, 'attack-monster');
    let floor = Number(v);
    if (!Number.isInteger(floor) || floor < 1 || floor > st.highestFloor) return addLog(_t('1~{highestFloor} 범위의 층수를 입력하세요.', { highestFloor: st.highestFloor }), 'attack-monster');
    st.currentFloor = floor;
    changeZone(CHAOS_REALM_ZONE_ID);
    updateStaticUI();
}

function enterUnderworldFloor(requestedFloor) {
    const held = floorEntryBlockReason(UNDERWORLD_ZONE_ID);
    if (held) return addLog(held, 'attack-monster');
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return addLog(_t('지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어'), 'attack-monster');
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    let max = Math.max(1, Math.floor(uw.highestFloor || 1));
    let floor = Number(requestedFloor);
    if (!Number.isInteger(floor) || floor < 1 || floor > max) return addLog(_t('1~{max} 범위의 층수를 입력하세요.', { max }), 'attack-monster');
    uw.currentFloor = floor;
    changeZone(UNDERWORLD_ZONE_ID);
    updateStaticUI();
}

async function enterUnderworldPrompt(){
    const held = floorEntryBlockReason(UNDERWORLD_ZONE_ID);
    if (held) return addLog(held, 'attack-monster');
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return enterUnderworldFloor(1);
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    const context = { owner: game, progress: uw, field: 'underworldProgress', season: game.season };
    let max = Math.max(1, Math.floor(uw.highestFloor || 1));
    let v = await requestGameNumber({
        title: _t('지하계 층 선택'),
        message: _t('입장 가능한 최고 층은 {max}층입니다.', { max }),
        min: 1,
        max,
        value: max,
        confirmLabel: _t('입장')
    });
    if (v === null || !floorEntryStillCurrent(context, canEnterUnderworld)) return;
    enterUnderworldFloor(v);
}

function enterTrialWithTicket(trialId) {
    if (!contentProgression.isUnlocked('battleTrials')) return addLog(_t('루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.'), 'attack-monster');
    if (!['trial_3','trial_4'].includes(trialId)) return changeZone(trialId);
    const block = getContentStartBlockReason() || getZoneTravelBlockReason(trialId);
    if (block) return addLog(block, 'attack-monster');
    if ((game.currencies.trialKey3 || 0) <= 0) return addLog(_t('시련의 증표가 부족합니다.'), 'attack-monster');
    game.currencies.trialKey3 -= 1;
    addLog(_t('🗝️ 시련의 증표 1개 소모 (남은 {value})', { value: game.currencies.trialKey3 || 0 }), 'season-up');
    changeZone(trialId);
}

// 나무꾼의 잔상(전투력 측정기) 해금 여부 = 혼돈 밖 나무꾼 100% 처치
function isWoodsmanEchoUnlocked() {
    if (typeof ensureChaosRealmState !== 'function') return false;
    return (ensureChaosRealmState().woodsmanBestDamagePct || 0) >= 100;
}

// 시련 노출: 카오스/코어 키 중 1개 이상 보유
function canSeeTalentBloomTrial() {
    return (game.currencies.chaosKey || 0) >= 1 || (game.currencies.coreKey || 0) >= 1;
}

// 입장/개화 가능: 나무꾼의 잔상 해금 + 직업 보유 + 카오스/코어 키 각 1개 이상
function canEnterTalentBloomTrial() {
    return isWoodsmanEchoUnlocked() && !!game.ascendClass
        && (game.currencies.chaosKey || 0) >= 1 && (game.currencies.coreKey || 0) >= 1;
}

/** 개화 재능은 고르지 않는다: 지금 전직이 속한 직업의 대표 재능(2026-10-02 재능 정리). */
async function chooseTalentBloomHeroId() {
    return getTalentBloomHeroIdForAscendancy(game.ascendClass) || HERO_SELECTION_ORDER[0];
}

async function enterTalentBloomTrial() {
    const held = getHeldRunBlockReason();
    if (held) return addLog(held, 'attack-monster');
    if (!isWoodsmanEchoUnlocked()) return addLog(_t('🔒 나무꾼의 잔상이 아직 열리지 않았습니다. 혼돈 밖 나무꾼을 100% 처치하세요.'), 'attack-monster');
    if (!game.ascendClass) return addLog(_t('🔒 재능 개화는 전직을 고른 뒤 도전할 수 있습니다.'), 'attack-monster');
    if ((game.currencies.chaosKey || 0) < 1 || (game.currencies.coreKey || 0) < 1) return addLog(_t('🔒 카오스 키와 코어 키가 각각 1개씩 필요합니다.'), 'attack-monster');
    let heroId = await chooseTalentBloomHeroId();
    if (!HERO_SELECTION_DEFS[heroId]) return;
    game.pendingTalentBloomHeroId = heroId;
    addLog(_t('개화 시련 도전: [{bloomName}] ({label} 재능 × {name})', { bloomName: getTalentCardName(heroId, game.ascendClass).bloomName, label: HERO_SELECTION_DEFS[heroId].label, name: CLASS_TEMPLATES[game.ascendClass].name }), 'season-up');
    if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
    changeZone('trial_5');
}

async function enterDeepChaosPrompt(){
    const held = getHeldRunBlockReason();
    if (held) return addLog(held, 'attack-monster');
    let unlocked = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    let max = Math.max(20, unlocked.length ? Math.max(...unlocked) : Math.floor(game.abyssEndlessDepth || 20));
    let depth = await requestGameNumber({
        title: _t('혼돈 심화층 선택'),
        message: unlocked.length > 0 ? _t('해금된 심화층 범위: 21 ~ {max}', { max }) : _t('입장 가능한 심화층 범위: 21 ~ {max}', { max }),
        min: 21,
        max,
        value: max,
        confirmLabel: _t('입장')
    });
    if (depth === null) return;
    depth = Math.floor(Number(depth) || 0);
    if (unlocked.length > 0 && !unlocked.includes(depth)) return addLog(_t('해금된 심화 혼돈 층수만 입장 가능합니다.'), 'attack-monster');
    enterUnlockedEndlessDepth(depth);
}

function getDeepChaosEntryState() {
    let open = (game.season || 1) >= 10 && (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared));
    if (!open) return { open: false, highestDepth: 20, currentDepth: Math.floor(game.abyssEndlessDepth || 20) };
    let unlocked = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    let highest = Math.max(21, unlocked.length ? Math.max(...unlocked) : Math.floor(game.abyssEndlessDepth || 21));
    return { open: true, highestDepth: highest, currentDepth: Math.floor(game.abyssEndlessDepth || 21) };
}

function getDeepChaosMapEntryHtml() {
    let state = getDeepChaosEntryState();
    if (!state.open) return '';
    let current = getAbyssDepthFromZoneId(game.currentZoneId) >= 21 ? 'current' : '';
    let powerEstimate = buildMapPowerEstimateHtml(getZone(getAbyssZoneIdForDepth(state.currentDepth)));
    return `<div class="map-item map-item--deep-chaos ${current}" data-exploration-departure onclick="enterDeepChaosPrompt()">
        <div class="map-item-main"><span>♾️</span><span>${_t('혼돈 심화층')}<br><span class="map-zone-status">${_t('현재 심화층: {currentDepth}층, 최고 기록: {highestDepth}층', { currentDepth: state.currentDepth, highestDepth: state.highestDepth })}</span><br>${powerEstimate}</span></div>
        <div class="map-item-actions"><span class="map-zone-status">${_t('입장 가능: 21 ~ {highestDepth}', { highestDepth: state.highestDepth })}</span></div>
    </div>`;
}

function toggleSeasonBossRepeat() {
    game.autoRepeatSeasonBoss = !game.autoRepeatSeasonBoss;
    addLog(`🗝️ ${_t('뿌리 보스 반복 도전')}: ${_t(game.autoRepeatSeasonBoss ? '켜짐' : '꺼짐')}`, 'season-up');
    updateStaticUI();
}

exposeFileGlobals({ closeBeehiveChoiceOverlay, openBeehiveChoiceOverlay, renderLoop8BeehivePanel, renderLoop15ColonyPanel, startColonyRun, forfeitColonyRun, renderLoop9VoidRiftPanel, canPayBeehivePenalty, getBeehiveRewardPool, startBeehiveRun, resolveBeehiveChoice, exitBeehiveRun, onBeehiveWaveCleared, forfeitBeehiveRun, autoEnterGrandBreachIfReady, enterGrandBreach, toggleMeteorAutoEnter, toggleGrandBreachAutoEnter, renderChaosRealmMapPanel, renderSkyTowerMapPanel, updateCombatOxygenBar, renderUnderworldMapPanel, ensureUnderworldRuneState, getUnderworldRuneDef, getUnderworldRuneCountMap, getUnderworldRuneEffectHtml, showUnderworldRuneTooltip, closeUnderworldRuneOverlay, equipUnderworldRuneToSlot, unequipUnderworldRuneSlot, openUnderworldRuneOverlay, craftUnderworldRune, openUnderworldRuneUpgradeOverlay, upgradeUnderworldRune, syncMapPrimaryContentTabs, announceMapPrimaryContentUnlocks, switchMapExploreSubtab, detectNewMapUnlockAlarms, acknowledgeMapMainAlarm, renderMapExploreNotiDots, isMapExploreSubtabOpenable, focusMapAlarmSourceSubtab, setExploreSubtabAvailable, enterLabyrinthFloor, enterSkyTowerPrompt, upgradeSkyStone, enterChaosRealmPrompt, enterUnderworldFloor, enterUnderworldPrompt, enterTrialWithTicket, isWoodsmanEchoUnlocked, canSeeTalentBloomTrial, canEnterTalentBloomTrial, enterTalentBloomTrial, enterDeepChaosPrompt, getDeepChaosEntryState, getDeepChaosMapEntryHtml, toggleSeasonBossRepeat });
})();

safeExposeGlobals({ syncMapPrimaryContentTabs, enterUnderworldFloor, enterUnderworldPrompt });
