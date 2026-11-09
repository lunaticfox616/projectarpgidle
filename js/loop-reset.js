// 루프 넘기기(2026-11-10에 js/combat.js의 끝을 그대로 옮겼다): 루프 조건 달성과 관문(handleSeasonLoopConditionMet), 다음 루프로 가는 정산과
// 초기화(triggerSeasonReset과 그 단계들), 루프의 직업 고르기, 나무꾼 등장과 혼돈 밖. js/combat.js 바로 뒤에 읽는다.
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function applyLoopHeroSelection(classId, previousClassId) {
    game.pendingLoopHeroSelection = false;
    saveGame({ skipCloudSync: true });
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 직업 선택 완료');
    startMoving(true);
    dispatchRuntimeEvent('loop-hero-selection-completed', {
        classId,
        changed: classId !== previousClassId
    });
}

function requestLoopHeroSelection(options = {}) {
    let previousClassId = game.selectedClassId || 'archer';
    let detail = {
        handled: false,
        options,
        select: classId => applyLoopHeroSelection(classId, previousClassId)
    };
    return dispatchRuntimeEvent('loop-hero-selection-requested', detail);
}

function markLoopSpecialBossKill(bossKey) {
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    game.loopProgressCurrent.specialBosses = Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : [];
    if (!game.loopProgressCurrent.specialBosses.includes(bossKey)) game.loopProgressCurrent.specialBosses.push(bossKey);
}

function addWoodsmanPendingScore(scoreGain) {
    let score = Math.max(0, Math.floor(scoreGain || 0));
    if (score <= 0) return;
    // 나무꾼 점수는 누적합이 아니라 '최고 기록' 기반으로 관리
    game.woodsmanPendingScore = Math.max(Math.floor(game.woodsmanPendingScore || 0), score);
    game.woodsmanLifetimeScore = Math.max(Math.floor(game.woodsmanLifetimeScore || 0), score);
}

function finishWoodsmanEntrance() {
    if (!game.woodsmanEntrancePending) return false;
    game.woodsmanEntrancePending = false;
    game.currentZoneId = OUTSIDE_CHAOS_ZONE_ID;
    let zone = getZone(OUTSIDE_CHAOS_ZONE_ID);
    if (!zone || zone.type !== 'outsideChaos') return false;
    game.moveTimer = 0;
    game.moveTotalTime = 0;
    game.runProgress = 0;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.enemies = [];
    game.inEncounter = true;
    addLog(_t('☠️ 하늘이 갈라지고 도끼날의 그림자가 전장을 뒤덮습니다.'), 'loot-unique');
    // 방 단위 무대: 입구와 나무꾼의 방, 두 칸의 투기장을 연다. 저주는 나무꾼이 깨어날 때 걸린다(beginRoomBossRules).
    if (getZoneExplorationPlan(zone)) startEncounterRun();
    else {
        startWoodsmanCurse();
        game.enemies = [createEnemy(zone, { at: 0, count: 1, boss: true }, 0)];
    }
    updateStaticUI();
    return true;
}

function enterOutsideChaos() {
    const held = getContentStartBlockReason();
    if (held) return addLog(held, 'attack-monster');
    if ((game.season || 1) < 10) return addLog(_t('혼돈 밖은 루프 10 이후 개방됩니다.'), 'attack-monster');
    let outsideChaosRequirementMet = typeof hasCurrentLoopAbyssRequirementClear === 'function'
        ? hasCurrentLoopAbyssRequirementClear(game.season || 1)
        : ((getSeasonAbyssDepthCap(game.season || 1) <= 20)
            ? (typeof hasCurrentLoopChaos20Clear === 'function' ? hasCurrentLoopChaos20Clear() : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared))
            : Math.max(0, Math.floor((game.loopProgressCurrent && game.loopProgressCurrent.bestAbyssDepth) || 0)) >= getSeasonAbyssDepthCap(game.season || 1));
    if (!outsideChaosRequirementMet) return addLog(getLoopAbyssRequirementPrompt(game.season || 1), 'attack-monster');
    actExplorationProgress.depart(game); // 바닥의 전리품을 잠금 사본보다 먼저 거둔다: 뒤에 거두면 다음 틱에 가방이 되돌아가 사라졌다(2026-10-20)
    game.woodsmanBuildSnapshot = snapshotWoodsmanBuildState();
    game.woodsmanBuildLock = true;
    game.currentZoneId = OUTSIDE_CHAOS_ZONE_ID;
    game.killsInZone = 0;
    game.runProgress = 0;
    game.moveTotalTime = WOODSMAN_ENTRANCE_DELAY_SECONDS;
    game.moveTimer = WOODSMAN_ENTRANCE_DELAY_SECONDS;
    game.isTownReturning = false;
    game.combatHalted = false;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.enemies = [];
    game.inEncounter = false;
    game.woodsmanEntrancePending = true;
    resetWoodsmanCurse();
    prepareActExplorationArrival(); // 방 단위 무대: 기다리는 몇 초 동안 투기장의 입구에 서 있다
    addLog(_t('☠️ 금단의 경계 너머로 발을 들였습니다. 혼돈이 몇 초간 숨을 고릅니다.'), 'loot-unique');
    updateStaticUI();
}

/** 나무꾼의 잔상: 혼돈 밖의 나무꾼을 생명력 1000배의, 공격하지 않는 허수아비로 꾸민다. */
function dressWoodsmanEchoDummy(dummy) {
    dummy.name = '나무꾼의 잔상';
    dummy.maxHp = Math.max(1, Math.floor((dummy.maxHp || 1) * 1000));
    dummy.hp = dummy.maxHp;
    dummy.echoStartHp = dummy.maxHp;
    dummy.noAttack = true;
    dummy.regenRate = 0;
    dummy.regenBank = 0;
    return dummy;
}

function enterWoodsmanEchoChallenge() {
    const held = getContentStartBlockReason();
    if (held) return addLog(held, 'attack-monster');
    let st = ensureChaosRealmState();
    if (!st.unlocked) return addLog(_t('혼돈계 해금 이후 이용 가능합니다.'), 'attack-monster');
    if (!(Array.isArray(game.journalEntries) && game.journalEntries.includes('woodsman_echo'))) return addLog(_t('나무꾼 완전 격파 이후에만 도전할 수 있습니다.'), 'attack-monster');
    let run = ensureWoodsmanEchoRunState();
    run.active = true;
    run.duration = 30;
    run.timeLeft = 30;
    run.lastTickAt = getCombatTime();
    run.totalDamage = 0;
    // 잔상 안에서 다시 시작하면 처음 시작한 곳을 지킨다. 측정이므로 미리 받은 숨결(js/combat-incidents.js breathe)은 지운다.
    if (game.currentZoneId !== WOODSMAN_ECHO_ZONE_ID || run.returnZoneId === undefined || run.returnZoneId === null) run.returnZoneId = getContentReturnZoneId();
    game.incidentBreath = null;
    actExplorationProgress.depart(game);
    game.currentZoneId = WOODSMAN_ECHO_ZONE_ID;
    game.killsInZone = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.moveTotalTime = 0;
    game.combatHalted = false;
    game.encounterPlan = [];
    game.encounterIndex = 0;
    // 방 단위 무대: 입구와 잔상의 방, 두 칸의 투기장(잔상은 createExplorationBossStage가 세운다). 30초는 잔상이 일어선 뒤부터 흐른다.
    if (getZoneExplorationPlan(getZone(WOODSMAN_ECHO_ZONE_ID))) {
        game.enemies = [];
        startEncounterRun();
    } else game.enemies = [dressWoodsmanEchoDummy(createEnemy(getZone(OUTSIDE_CHAOS_ZONE_ID), { at: 0, count: 1, boss: true }, 0))];
    addLog(_t('📏 나무꾼의 잔상 도전 시작: 30초 동안 최대 피해를 기록하세요. (허수아비는 공격하지 않습니다)'), 'season-up');
    updateStaticUI();
}

function awardLoopProgressPoints() {
    game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
    game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [] };
    let baseDepth = Math.max(20, Math.floor(game.loopProgressBase.abyssEndlessDepth || 20));
    let unlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    let highestUnlocked = unlockedDepths.length > 0 ? Math.max(...unlockedDepths) : Math.max(20, Math.floor(game.abyssEndlessDepth || 20));
    let nowDepth = Math.max(20, highestUnlocked >= 21 ? (highestUnlocked - 1) : highestUnlocked);
    let depthGain = Math.max(0, nowDepth - baseDepth);
    let baseLab = Math.max(1, Math.floor(game.loopProgressBase.labyrinthUnlockedMaxFloor || 1));
    let nowLab = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let labGain = Math.max(0, nowLab - baseLab);
    let baseBosses = new Set(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []);
    let newBosses = (Array.isArray(game.loopProgressCurrent.specialBosses) ? game.loopProgressCurrent.specialBosses : []).filter(id => !baseBosses.has(id));
    let bonus = (depthGain * 2) + Math.floor(labGain / 5) + (newBosses.length * 3);
    let woodsmanScore = Math.max(0, Math.floor(game.woodsmanPendingScore || 0));
    let woodsmanSettled = Math.max(0, Math.floor(game.woodsmanSettledScore || 0));
    let woodsmanDelta = Math.max(0, woodsmanScore - woodsmanSettled);
    let woodsmanGain = Math.floor(Math.sqrt(woodsmanDelta) / 25);
    bonus += woodsmanGain;
    if (bonus > 0) game.loopDeepPoints = Math.max(0, Math.floor(game.loopDeepPoints || 0)) + bonus;
    // 미궁은 5층마다 1점: 남은 층은 다음 루프로 넘긴다(2026-10-19 전에는 루프마다 버려 4층씩 오르면 점수가 없었다)
    game.loopProgressBase = { abyssEndlessDepth: nowDepth, labyrinthUnlockedMaxFloor: Math.min(nowLab, baseLab + Math.floor(labGain / 5) * 5), specialBosses: Array.from(new Set([...(Array.isArray(game.loopProgressBase.specialBosses) ? game.loopProgressBase.specialBosses : []), ...newBosses])) };
    game.loopProgressCurrent = { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, bestSkyFloor: 0, bestUnderworldFloor: 0, cosmosPlanets: [] };
    game.woodsmanSettledScore = Math.max(woodsmanSettled, woodsmanScore);
    game.woodsmanPendingScore = game.woodsmanSettledScore;
    return { bonus, depthGain, labGain, bossGain: newBosses.length, woodsmanGain: woodsmanGain, woodsmanScore: woodsmanScore, woodsmanDelta: woodsmanDelta };
}

function resolveLoopAdvancePath(requestedPath) {
    let requested = requestedPath === 'cosmos' ? 'cosmos' : (requestedPath === 'chaos' ? 'chaos' : null);
    let available = typeof getAvailableLoopAdvancePaths === 'function'
        ? getAvailableLoopAdvancePaths(game.season || 1)
        : (typeof hasCurrentLoopAbyssRequirementClear === 'function' && hasCurrentLoopAbyssRequirementClear(game.season || 1) ? ['chaos'] : []);
    if (requested) return available.includes(requested) ? requested : null;
    if (available.length === 1) return available[0];
    return null;
}

function getLoopAdvancePathLabel(path) {
    return path === 'cosmos' ? '우주계 루프' : '혼돈 루프';
}

/** 루프 밖에 맡겨 두어 루프를 막는 장비: 가판대(js/player-stall.js)와 장비 전당에 전시한 원본(js/player-exchange.js, 가판대와 같은
 * 까닭). 루프 화면의 단추, 경고 줄, 자동 루프도 이것을 묻는다(js/loop-ui.js, js/loop-automation-ui.js). 없으면 ''. */
function getHeldGearLoopBlockReason() {
    const stallReason = typeof playerStall === 'object' ? playerStall.loopBlockReason(game) : '';
    if (stallReason) return stallReason;
    return typeof playerHallTrade === 'object' ? playerHallTrade.loopBlockReason() : '';
}

function getSeasonResetBlockReason(loopPath) {
    const heldReason = getHeldGearLoopBlockReason();
    if (heldReason) return heldReason;
    const season = game.season || 1;
    if (season < 31 || loopPath) return '';
    let available = typeof getAvailableLoopAdvancePaths === 'function' ? getAvailableLoopAdvancePaths(season) : [];
    return available.length > 1
        ? '혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요.'
        : getLoopAbyssRequirementPrompt(season);
}

/** Sealed gear survives the loop wherever it waits: in the bag or in the temporary storage. */
function collectLoopSealedBagItems(owner) {
    return [...(owner.inventory || []), ...(owner.equipmentTemporaryStorage || [])]
        .filter(item => item && item.loopSealed).map(item => JSON.parse(JSON.stringify(item)));
}

/** A new loop starts with an empty bag and an empty temporary storage; sealed gear comes back into the bag afterwards.
 * The temporary storage had no cap and survived loops, so it could grow past the browser's save quota (user, 2026-10-03). */
function clearLoopItemStorage(owner) {
    owner.inventory = [];
    owner.equipmentTemporaryStorage = [];
}

/** The map the hero stands on closes before the loop is settled (2026-10-20 hunt): its floor is picked up into the old loop, so the
 * currencies a loop keeps stay and the rest goes with the old bag and wallet (it came into the new loop when the class was picked or
 * the save loaded), and no saved map counts the fight's monsters alive once game.enemies is cleared (looping mid-fight wrote a save
 * that threw on load: 탐험 저장에서 살아 있는 적이 누락되었습니다). */
function closeLoopMap() {
    if (game.actExploration) actExplorationProgress.depart(game);
}

/** The loop goes on (by chaos unless the cosmos path is chosen): its record closed, points settled, then the game reset for the next
 * loop with what it keeps. Split into its phases on 2026-10-18; the phases run the same lines in the same order. */
function triggerSeasonReset(options) {
    let loopPath = resolveLoopAdvancePath(typeof options === 'string' ? options : (options && options.path));
    let blockedReason = getSeasonResetBlockReason(loopPath);
    if (blockedReason) {
        addLog(blockedReason, 'attack-monster');
        return false;
    }
    if (!loopPath) loopPath = 'chaos';
    if (isRewardOpen()) closeRewardOverlay();
    endWoodsmanFightForLoop(addLog);
    clearLoopGate();
    closeLoopMap();
    game.pendingLoopHeroSelection = true;
    let codexReveal = getLoopCodexReveal();
    // 전적: 상태를 초기화하기 전에 이번 루프 기록(소요 시간·도달 액트·액트별 돌파 시간)을 닫는다.
    if (typeof closeLoopRecord === 'function') closeLoopRecord(loopPath);
    dispatchRuntimeEvent('loop-rewrite-started');
    const kept = captureLoopKeptState();
    let loopDeepBeforeReset = loopDeepPointsNow();
    let loopReward = awardLoopProgressPoints();
    let loopDeepExpectedAfterSettle = loopDeepPointsNow();
    advanceLoopCounters(loopPath, addLog);
    queueLoopArrivalNotices();
    addLog(...getLoopSettleLogLine(loopReward));
    resetLoopProgress();
    resetLoopBuild();
    resetLoopItems(kept, codexReveal);
    resetLoopContents(kept);
    applyLoopSettings();
    game.loopDeepPoints = Math.max(loopDeepBeforeReset, loopDeepExpectedAfterSettle);
    grantCodexLegacyStarterUniques();
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    progressStallTicks = 0;
    clearCraftSelection();
    applySeasonContentProgression({ silent: false });
    calculateReachableNodes();
    refreshPassiveVisibility();
    let presetInvest = typeof runPassiveTreeAutoInvest === 'function' ? runPassiveTreeAutoInvest() : { nodes: 0 };
    if (presetInvest.nodes > 0) addLog(_t('🧭 새 루프 프리셋 자동 투자: {nodes}개 노드 활성화', { nodes: presetInvest.nodes }), 'season-up');
    game.playerHp = getPlayerHpCap(getPlayerStats());
    ensureActJournalCompletionForLoop({ silent: false });
    addLog(_t('🌟 [루프 포인트 1점] 획득. 밝혀낸 성좌 지형은 유지됩니다.'), "season-up");
    worldTreeBark.noticeFirstBark();
    checkUnlocks();
    saveGame({ skipCloudSync: true });
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave('루프 진행');
    requestLoopHeroSelection();
}

/** A woodsman fight still on when the loop goes on ends, its build lock lifted. */
function endWoodsmanFightForLoop(say) {
    if (game.woodsmanBuildLock) {
        clearWoodsmanBuildLock();
        say('☠️ 혼돈 밖 전투를 중단하고 루프를 진행합니다. 세팅 잠금이 해제되었습니다.', 'season-up');
    }
}

/** The unique codex for the next loop: each found entry only revealed (its slot and name), the items not kept. */
function getLoopCodexReveal() {
    let codexReveal = {};
    Object.keys(game.uniqueCodex || {}).forEach(key => {
        if (!key || !game.uniqueCodex[key]) return;
        let parts = key.split('|');
        codexReveal[key] = { revealed: true, slot: parts[0] || '', name: parts[1] || '' };
    });
    return codexReveal;
}

/** What the loop keeps, read before the reset: its content states, then its gear and currencies. */
function captureLoopKeptState() {
    return { ...captureLoopKeptContents(), ...captureLoopKeptItems() };
}

/** The constellation buff, labyrinth floor, chaos realm, time rift, sky tower, ocean and rune enhancement the loop keeps. */
function captureLoopKeptContents() {
    let prevMeteorSite = ensureMeteorSiteState();
    let preservedConstellationBuff = (prevMeteorSite.constellationBuff && prevMeteorSite.constellationBuff.permanent)
        ? JSON.parse(JSON.stringify(prevMeteorSite.constellationBuff))
        : null;
    let prevLabMax = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let preservedChaosRealm = JSON.parse(JSON.stringify(ensureChaosRealmState()));
    // 시간의 균열은 시간압 기록만 루프를 건넌다: 제단은 정산이 비운다(resetLoopContents, 2026-10-20 사용자).
    let preservedTimeRift = JSON.parse(JSON.stringify(ensureTimeRiftState()));
    let preservedSkyTower = JSON.parse(JSON.stringify(ensureSkyTowerState()));
    let preservedOcean = JSON.parse(JSON.stringify(ensureOceanState()));
    let preservedGemEnhanceUnlocked = !!game.gemEnhanceUnlocked;
    return { preservedConstellationBuff, prevLabMax, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked };
}

/** Loop-sealed gear and bag items, 나무꾼의 손길, time remnants, altar materials and offline progress the loop keeps. */
function captureLoopKeptItems() {
    // 나무꾼의 손길로 봉인된 장비(장착/인벤)와 나무꾼의 손길 보유분은 루프가 지나도 유지한다.
    let preservedSealedEquipment = {};
    Object.keys(game.equipment || {}).forEach(slot => {
        let it = game.equipment[slot];
        if (it && it.loopSealed) preservedSealedEquipment[slot] = JSON.parse(JSON.stringify(it));
    });
    let preservedSealedInventory = collectLoopSealedBagItems(game);
    let preservedWoodsmanTouch = Math.max(0, Math.floor((game.currencies && game.currencies.ouroboros) || 0));
    let preservedAltarMaterials = atlasEndgame.loopKeptCurrencies(game);
    let preservedWoodsmanTouchSeen = !!game.woodsmanTouchSeen;
    return { preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedAltarMaterials, preservedWoodsmanTouchSeen };
}

/** The loop counters: the cosmos path count, the path, the season, the loop count and the loop point, with the arrival line. */
function advanceLoopCounters(loopPath, say) {
    if (loopPath === 'cosmos') game.cosmosLoopCount = Math.max(0, Math.floor(game.cosmosLoopCount || 0)) + 1;
    game.lastLoopAdvancePath = loopPath;
    game.season++;
    loopMutation.begin(game);
    game.loopCount = Math.max(0, Math.floor(game.loopCount || 0)) + 1;
    game.seasonPoints++;
    say(`🔁 ${getLoopAdvancePathLabel(loopPath)}로 다음 루프에 진입합니다.${loopPath === 'cosmos' ? _t(' (우주계 난이도 +{max}단계)', { max: Math.max(0, Math.floor(game.cosmosLoopCount || 0)) }) : ''}`, 'season-up');
}

/** The one-time notices of the loop the hero arrives at (exploration events, time rift, rival blades). */
function queueLoopArrivalNotices() {
    Object.entries(EXPLORATION_EVENT_NOTICES).forEach(([kind, notice]) => {
        if (game.season === notice.loop) queueTutorialNotice('exploration_event_' + kind, notice.title, notice.body);
    });
    if (game.season === 13 && typeof queueTutorialNotice === 'function') {
        queueOpenContentNotice('timerift', 'unlock_time_rift', '시간의 균열', '루프 13에 도달해 시간의 균열이 열렸습니다.\n‘지도 → 탐험 → 시간의 균열’에서 과거를 클리어해 제단을 여세요.\n제단에 같은 부위의 고유 1개/희귀 1개를 올리고 미래를 클리어하면 두 아이템이 융합된 유물이 됩니다.\n시간압이 높을수록 어렵지만 완벽한 융합(추가 옵션 전부 계승) 확률이 오릅니다.', 'tab-map');
    }
    if (game.season === 31 && typeof queueTutorialNotice === 'function') {
        queueTutorialNotice('unlock_rival_blades', _t('버려진 날붙이들'), _t('나무꾼이 벼리다 버린 다른 날들이 당신을 찾아옵니다.\n‘지도 → 탐험 → 강대한 적’에서 결투에 도전하세요.\n도전권 [표식: 버려진 날]은 심층 보스가 떨어뜨립니다.\n한 루프 안에 다섯 날을 모두 꺾으면 「완성작」이 모습을 드러냅니다.'), 'tab-map');
    }
}

/** The deep loop settlement line: its points and their sources, as a log line and its tone. */
function getLoopSettleLogLine(loopReward) {
    return [_t('🧬 심화 루프 정산: +{bonus}pt (혼돈 심화 +{depthGain}, 미궁 +{labGain}, 특수보스 +{bossGain}, 나무꾼 +{woodsmanGain})', { bonus: loopReward.bonus, depthGain: loopReward.depthGain, labGain: loopReward.labGain, bossGain: loopReward.bossGain, woodsmanGain: loopReward.woodsmanGain || 0 }), loopReward.bonus > 0 ? 'season-up' : 'attack-monster'];
}

/** Level, experience, kills, deaths, the zone and frontier back to the start; cosmos boss stones cleared; fighting resumes. */
function resetLoopProgress() {
    game.level = 1;
    game.exp = 0;
    game.killsInZone = 0;
    game.loopDeaths = 0;
    game.loopKills = 0;
    game.woodsmanSimulatorSeenLoop = false;
    game.currentZoneId = 0;
    game.maxZoneId = 0;
    if (game.cosmosAtlas && typeof game.cosmosAtlas === 'object') {
        game.cosmosAtlas.bossStones = {};
        game.cosmosAtlas.bossStoneOptions = {};
        game.cosmosAtlas.bossRelics = [];
        game.cosmosAtlas.bossKills = {};
        game.cosmosAtlas.bossClears = [];
        game.cosmosAtlas.equippedStoneGalaxy = 0;
        game.cosmosAtlas.equippedStones = {};
    }
    game.combatHalted = false;
}

/** The build back to its start: passive points from the journal, passives, runes and supports, trials and ascendancy. */
function resetLoopBuild() {
    game.passivePoints = typeof getClaimedJournalPassivePointTotal === 'function' ? getClaimedJournalPassivePointTotal(game) : 0;
    game.passives = [];
    game.passiveAttributeChoices = {};
    game.voidPassives = {};
    game.skills = ['기본 공격'];
    game.activeSkill = '기본 공격';
    game.weaponBlockedSkill = '';
    game.mobilitySkill = '';
    game.loopStarterWeaponGranted = false;
    game.starterWeaponTutorialPending = null;
    game.basicSkillOffer = null;
    game.gemData = { '기본 공격': { level: 1, exp: 0 } };
    game.runeSpares = {};
    game.skyGemEnhancements = {};
    game.supports = [];
    game.equippedSupports = [];
    game.supportGemData = {};
    // 전술 규칙은 영구 빌드 설정이다. 루프는 적에게 걸린 저주만 비운다.
    game.enemyConditionDebuffs = {};
    game.dotFxThrottle = {};
    game.sealedSkills = [];
    game.sealedSupports = [];
    game.resonancePower = 10;
    game.completedTrials = [];
    game.unlockedTrials = [];
    // 지난 루프의 전직 배치는 노드를 비우기 전에 기억한다('지난 루프처럼'이 키스톤만 되살리던 문제).
    let clearedAscendKeystones = rememberLoopAscendancyPlan(game);
    game.ascendNodes = [];
    game.ascendPoints = 0;
    clearAscendKeystoneRuntimeState(clearedAscendKeystones, { force: true, forceAll: true });
    game.ascendKeystones = [];
    game.ascendKeystonePoints = 0;
    game.cosmosTwinKeystones = [];
    game.realmDeathWard = null;
    game.realmInvulnerableBarrierUntil = 0;
    game.ascendRank = 0;
    game.ascendClass = null;
    game.bloomLoopSpecGranted = null;
    game.bloomedClassThisLoop = null;
    game.bloomedTalentThisLoop = null;
    game.pendingTalentBloomHeroId = null;
}

/** Items and rewards: loop storage, gear and currencies emptied, then what the loop keeps restored; act rewards, chase uniques and
 * the codex for the new loop. */
function resetLoopItems(kept, codexReveal) {
    const { preservedAltarMaterials, preservedSealedEquipment, preservedSealedInventory, preservedWoodsmanTouch, preservedWoodsmanTouchSeen, prevLabMax } = kept;
    clearLoopItemStorage(game);
    game.equipment = { ...defaultGame.equipment };
    craftingWorkspaceState.capture(game);
    currencyExchange.capture(game);
    game.currencies = { ...defaultGame.currencies };
    preservedAltarMaterials.forEach(([key, value]) => { game.currencies[key] = value; });
    // 봉인된 장비/나무꾼의 손길 복원(루프 유지)
    // 봉인 장비도 요구 레벨과 능력치를 따른다(2026-10-31 사용자). 입던 칸에 두면 1레벨 영웅의 칸이 꺼진 채 막히므로 가방으로 돌아온다.
    game.inventory.push(...Object.values(preservedSealedEquipment), ...preservedSealedInventory);
    if (preservedWoodsmanTouch > 0) game.currencies.ouroboros = preservedWoodsmanTouch;
    game.woodsmanTouchSeen = preservedWoodsmanTouchSeen;
    game.labyrinthFloor = 1;
    game.labyrinthLastResult = null;
    game.labyrinthUnlockedMaxFloor = Math.max(1, Math.floor(prevLabMax || 1));
    game.jewelInventory = [];
    game.abyssClearedDepths = [];
    game.claimableActRewards = [];
    game.claimedActRewards = [];
    game.actRewardBonuses = [];
    game.seasonChaseUniqueDropped = false;
    game.seasonChaseUniqueDrops = [];
    game.uniqueCodex = codexReveal;
    game.codexNewlyRegistered = {};
}

/** Contents back to their loop start with what they keep: colony, hive, void rift, meteor site (its permanent constellation), unlocks,
 * notices, cores and the stump box, the open sub tabs, the chaos realm, atlas, time rift, sky tower, ocean. */
function resetLoopContents(kept) {
    const { preservedConstellationBuff, preservedChaosRealm, preservedTimeRift, preservedSkyTower, preservedOcean, preservedGemEnhanceUnlocked } = kept;
    // 군락지 액막이 부적(보유/장착/슬롯)도 루프 시 초기화한다.
    game.colony = JSON.parse(JSON.stringify(defaultGame.colony));
    clearBeehiveRuntimeState(game.beehive);
    abandonBeyondBoundaryRun(game); // a 경계 너머 run held over would refuse every move and content start of the new loop
    // 열린 대균열도 닫는다(2026-10-20 사용자: 지난 루프의 대균열이 새 루프의 1레벨 영웅을 들여보냈다)
    Object.assign(game.voidRift, {active:false, activeKills:0, requiredKills:0, pendingWave:false, totalToSpawn:0, spawnedCount:0, spawnTick:0, grandRun:null, grandBreachUnlock:false});
    if (game.woodsmanEchoRun) Object.assign(game.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null }); // 잔상도 끝낸다
    game.meteorSite = JSON.parse(JSON.stringify(defaultGame.meteorSite));
    game.meteorSite.constellationBuff = preservedConstellationBuff;
    game.unlocks = { ...defaultGame.unlocks };
    if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(game);
    game.noti = { ...defaultGame.noti };
    coreItems.resetForLoop(); stumpCube.clear();
    if (typeof stumpBox === 'object') stumpBox.regress(game);
    game.itemSubtab = 'item-tab-equip';
    game.skillSubtab = 'skill-tab-equip';
    game.mapSubtab = 'map-tab-zones';
    game.mapExploreSubtab = 'map-explore-atlas';
    game.chaosRealm = preservedChaosRealm;
    atlas.onLoopReset(game);
    knitting.resetForLoop(game);
    game.timeRift = preservedTimeRift;
    // 제단은 루프마다 비운다(2026-10-20 사용자: 루프를 넘기는 보관함이 되면 안 된다): 올린 장비는 가방처럼 사라지고 제단은 닫힌다
    Object.assign(game.timeRift, { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    game.skyTower = preservedSkyTower;
    game.ocean = preservedOcean;
    forgetOceanAutoDive(game.ocean);
    game.skyTower.loopSeason = Math.max(1, Math.floor(game.season || 1));
    game.skyTower.clearedThisLoop = 0;
    game.skyTower.lastResult = null;
    game.gemEnhanceUnlocked = preservedGemEnhanceUnlocked;
    game.inTicketBossFight = false;
}

/** After a loop the item automation can switch off and the map action becomes the post-loop choice; a chosen hero keeps the
 * character tab. */
function applyLoopSettings() {
    if (game.settings) {
        if (game.settings.disableItemAutomationAfterLoop !== false) {
            game.settings.autoSalvageEnabled = false;
            game.settings.itemFilterEnabled = false;
        }
        game.settings.mapCompleteAction = game.settings.postLoopMapCompleteAction || 'nextLoopBestPlusOne';
    }
    if (game.heroSelectionInitialized && game.unlocks) game.unlocks.char = true;
}

/**
 * 루프 조건 달성 시 진입점. 루프 10 미만에서는 즉시 리셋하지 않고
 * 시간을 멈춘 상태(pendingLoopReady)로 전환해 아이템 정리·도감 등록 시간을 준다.
 * 루프 10부터는 정산을 확인한 뒤 다음 루프로 가거나 심화 등반을 계속한다.
 */
function handleSeasonLoopConditionMet() {
    game.pendingLoopReady = (game.season || 1) < 10;
    game.pendingLoopDecision = !game.pendingLoopReady;
    // Reached while nobody watched (offline / hidden-tab replay): the auto-loop leaves this gate to the player.
    game.loopGateOffline = !!game.isBackgroundCalculation;
    game.combatHalted = true;
    clearDefeatedEncounter();
    addLog(_t('루프 {value} 달성. 이번 여정의 기록과 다음 해금 요소를 확인하세요.', { value: game.season || 1 }), 'season-up');
    updateStaticUI();
}

/** The waiting loop gate is resolved (loop taken or climbing continued): its offline mark goes with it. */
function clearLoopGate() {
    game.pendingLoopDecision = false;
    game.pendingLoopReady = false;
    game.loopGateOffline = false;
}

function confirmLoopReady() {
    if (!game.pendingLoopReady) return;
    let available = typeof getAvailableLoopAdvancePaths === 'function' ? getAvailableLoopAdvancePaths(game.season || 1) : [];
    if (available.length > 1) {
        game.pendingLoopReady = false;
        game.pendingLoopDecision = true;
        addLog(_t('혼돈 루프와 우주계 루프 조건을 모두 달성했습니다. 진행할 루프 경로를 선택하세요.'), 'season-up');
        updateStaticUI();
        return;
    }
    triggerSeasonReset();
}

function chooseLoopAdvancePath(path) {
    let loopPath = resolveLoopAdvancePath(path);
    if (!loopPath) return addLog(getLoopAbyssRequirementPrompt(game.season || 1), 'attack-monster');
    triggerSeasonReset({ path: loopPath });
}

function chooseLoopAdvance(shouldLoop) {
    if (!game.pendingLoopDecision) return;
    if (shouldLoop) {
        triggerSeasonReset({ path: 'chaos' });
        return;
    }
    clearLoopGate();
    addLog(_t('♾️ 루프를 보류하고 혼돈 심화 등반을 이어갑니다. (혼돈 {max}부터 시작)', { max: Math.max(21, Math.floor((game.abyssEndlessDepth || 20) + 1)) }), 'season-up');
    enterNextEndlessChaosDepth();
}

exposeFileGlobals({ applyLoopHeroSelection, requestLoopHeroSelection, markLoopSpecialBossKill, addWoodsmanPendingScore, finishWoodsmanEntrance, enterOutsideChaos, dressWoodsmanEchoDummy, enterWoodsmanEchoChallenge, getHeldGearLoopBlockReason, clearLoopItemStorage, triggerSeasonReset, handleSeasonLoopConditionMet, confirmLoopReady, chooseLoopAdvancePath, chooseLoopAdvance });
})();


const WOODSMAN_ENTRANCE_DELAY_SECONDS = 3;


const loopDeepPointsNow = () => Math.max(0, Math.floor(game.loopDeepPoints || 0));


safeExposeGlobals({ enterWoodsmanEchoChallenge, triggerSeasonReset, handleSeasonLoopConditionMet, confirmLoopReady, chooseLoopAdvance, chooseLoopAdvancePath, markLoopSpecialBossKill, addWoodsmanPendingScore, enterOutsideChaos });
