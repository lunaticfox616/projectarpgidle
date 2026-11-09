// 자리를 비운 시간의 정산(2026-11-10에 js/ui.js에서 그대로 옮겼다): 화면이 가려지거나 앱이 멈춘 때와 게임을 켠 때의 기록
// (recordBackgroundCombatEntry, recordOfflineCombatEntry), 되돌려 싸우기와 반영(startBackgroundCombatReturn, commitBackgroundCombat),
// 진행 화면과 결과 창. 화면 앞의 게임이 멈추는 조건(isForegroundGameplayPausedForBackground)도 여기 있다. 전투 재생 자체는
// js/combat-replay.js. js/ui.js 바로 뒤에 읽는다.

const BACKGROUND_PROGRESS_MIN_REAL_MS = 60 * 1000;

function getBackgroundProgressResultLimits(state) {
    let config = getOfflineProgressConfig(state || game);
    return { ...config, effectiveLimitMs: Math.max(0, Number(config.effectiveLimitMs) || 0) };
}

function calculateBackgroundProgressMs(actualElapsedMs, minRealMs, rate, maxProgressMs) {
    let elapsed = Math.max(0, Number.isFinite(actualElapsedMs) ? actualElapsedMs : 0);
    let minElapsed = Math.max(0, Number.isFinite(minRealMs) ? minRealMs : 0);
    if (elapsed < minElapsed) return 0;
    let progress = elapsed * Math.max(0, Number.isFinite(rate) ? rate : 0);
    let capped = Math.min(progress, Math.max(0, Number.isFinite(maxProgressMs) ? maxProgressMs : 0));
    return Math.max(0, Math.floor(capped));
}

function getBackgroundCombatSignature(state) {
    if (!state || typeof state !== 'object') return '';
    return [state.currentZoneId, state.inTicketBossFight ? 1 : 0, state.pendingLoopDecision ? 1 : 0, state.pendingLoopReady ? 1 : 0].join('|');
}

function isForegroundGameplayPausedForBackground() {
    if (typeof gameplayStarted !== 'undefined' && !gameplayStarted) return true;
    if (game && !game.heroSelectionInitialized) return true;
    if (isStartupOverlayOpen()) return true;
    if (typeof isLoadingOverlayOpen === 'function' && isLoadingOverlayOpen()) return true;
    if (typeof isRewardOpen === 'function' && isRewardOpen()) return true;
    // 사망 기록은 읽을거리일 뿐 — 열려 있어도 방치 진행은 멈추지 않는다(예전에는 닫을 때까지 전투 시간이 멈췄다).
    if (typeof isLoopHeroSelectOpen === 'function' && isLoopHeroSelectOpen()) return true;
    if (actExplorationUi.departurePending() || sideEncounterUi.withdrawalPending()) return true;
    // 입구 방의 인사나 고스트 대결처럼 주인공이 장면 앞에 서 있는 동안(isHeroHeldByScene)
    if (isHeroHeldByScene()) return true;
    // "창을 열면 전투 일시정지"가 꺼져 있으면 아래 창 검사의 답은 쓰이지 않는다: 묻지 않는다(2026-10-17 측정: 8초에 2,083번 검사).
    if (!game?.settings?.pauseGameOnOverlay) return false;
    // 안내 카드뿐 아니라 따라 하기의 대상 화면이 열려 있는 동안도(검토 7차) — isTutorialPausingCombat이 함께 본다.
    return !!(isTutorialPausingCombat() || isPauseSettingOverlayOpenNow());
}
/** 주인공이 장면 앞에 서 있는 동안: 입구 방의 인사(js/canvas-act-title-card.js greeting, 이야기 팝업처럼 서서 듣는다: 2026-10-15 사용자
 * "처음에 바로 막 진행하는데")와 고스트 대결의 방(js/ghost-duel-stage-ui.js, 전장이 덮여 있다). */
function isHeroHeldByScene() {
    if (typeof actTitleCard === 'object' && actTitleCard.greeting()) return true;
    return typeof ghostDuelStage === 'object' && ghostDuelStage.playing();
}


/** 일시정지를 거는 창이 열려 있는지(isPauseSettingOverlayOpen)를 16ms 동안 한 번만 찾는다. 주 루프, 탐험 걸음, 전장 그림이 한 프레임에
 * 여러 번 묻는다. 창은 입력으로 열리고 닫히므로 다음 프레임이 바뀐 상태를 본다. */
const pauseOverlayMemo = { at: -Infinity, open: false };
function isPauseSettingOverlayOpenNow() {
    const now = performance.now();
    if (now - pauseOverlayMemo.at >= 16 || now < pauseOverlayMemo.at) Object.assign(pauseOverlayMemo, { at: now, open: isPauseSettingOverlayOpen() });
    return pauseOverlayMemo.open;
}

function isBackgroundCombatEligible(state) {
    if (!state || typeof state !== 'object') return false;
    if (isForegroundGameplayPausedForBackground()) return false;
    if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
    if ((Number(state.playerHp) || 0) <= 0) return false;
    if (Array.isArray(state.enemies) && state.enemies.some(enemy => enemy && enemy.hp > 0)) return true;
    if (Number(state.moveTimer) > 0) return true;
    return hasBackgroundEncounterWork(state);
}

/** Work left for a hidden tab to replay: the board's encounter plan, or a wide map still being explored (walking between rooms,
 * or its settlement pause) — its encounter plan stays empty. */
function hasBackgroundEncounterWork(state) {
    if (Array.isArray(state.encounterPlan) && state.encounterPlan.length > 0) return true;
    return !!actExplorationState.current(state) && !actExplorationProgress.waiting(state);
}

function isOfflineCombatEligible(state) {
    if (!state || typeof state !== 'object') return false;
    if (!state.heroSelectionInitialized) return false;
    if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
    if ((Number(state.playerHp) || 0) <= 0) return false;
    return state.currentZoneId !== undefined && state.currentZoneId !== null;
}

/** The page went away (hidden, closing, the app paused): play stops here, and the return or the next launch settles from this time.
 * Nothing plays before the game starts (the title screen); the launch's offline settlement covers that time. */
function recordBackgroundCombatEntry(nowMs) {
    if (backgroundCombatRuntime.processing || backgroundCombatRuntime.failed || !gameplayStarted) return;
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    backgroundCombatRuntime.hiddenAtMs = now;
    backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
    backgroundCombatRuntime.snapshot = isBackgroundCombatEligible(game) ? cloneBackgroundCombatState(game) : null;
}

/** The launch's away span: from the loaded save's saveMeta.playedUntil to nowMs. Saves made while entering leave that time alone
 * (js/save.js touchSaveMeta, launchSettlementPending) until this has read it. */
function recordOfflineCombatEntry(nowMs) {
    let savedAt = Math.max(0, Math.floor(Number(game.saveMeta.playedUntil) || 0));
    backgroundCombatRuntime.launchSettlementPending = false;
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    // 저장 칸마다 한 번 정산한다: 게임 안에서 다른 계정으로 들어가도 그 계정의 자리 비운 시간이 남는다(전: 화면마다 한 번이라 먼저 들어간 저장만).
    const slotKey = getSaveSlot().key;
    if (backgroundCombatRuntime.offlineSettledSlots.includes(slotKey) || savedAt <= 0 || now <= savedAt) return false;
    backgroundCombatRuntime.offlineSettledSlots.push(slotKey);
    backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
    backgroundCombatRuntime.snapshot = isOfflineCombatEligible(game) ? cloneBackgroundCombatState(game) : null;
    // Nothing to settle keeps no away span: a stale one would be stamped by a save made while the app is paused (js/save.js
    // getPlayedUntil).
    backgroundCombatRuntime.hiddenAtMs = backgroundCombatRuntime.snapshot ? savedAt : 0;
    return !!backgroundCombatRuntime.snapshot;
}

function getBackgroundCurrencyLabel(key) {
    return getCurrencyInfo(key).name;
}

function countInventoryByRarity(list) {
    let counts = {};
    (Array.isArray(list) ? list : []).forEach(item => {
        if (!item || !item.rarity) return;
        counts[item.rarity] = (counts[item.rarity] || 0) + 1;
    });
    return counts;
}

function getBackgroundRewardSummary(beforeState, afterState, combatMetrics, overflowSalvaged) {
    let currencies = [];
    let beforeCurrencies = (beforeState && beforeState.currencies) || {};
    let afterCurrencies = (afterState && afterState.currencies) || {};
    Object.keys(afterCurrencies).forEach(key => {
        let gain = Math.floor((afterCurrencies[key] || 0) - (beforeCurrencies[key] || 0));
        if (gain > 0) currencies.push({ key, name: getBackgroundCurrencyLabel(key), gain });
    });
    let beforeInv = Array.isArray(beforeState && beforeState.inventory) ? beforeState.inventory.length : 0;
    let afterInv = Array.isArray(afterState && afterState.inventory) ? afterState.inventory.length : 0;
    // 등급별 획득 수와 새로 얻은 고유 아이템 이름(전후 등급 개수 차이 기준).
    let beforeRarity = countInventoryByRarity(beforeState && beforeState.inventory);
    let afterRarity = countInventoryByRarity(afterState && afterState.inventory);
    let rarityGains = {};
    Object.keys(afterRarity).forEach(rarity => {
        let gain = afterRarity[rarity] - (beforeRarity[rarity] || 0);
        if (gain > 0) rarityGains[rarity] = gain;
    });
    let beforeUniqueNames = (Array.isArray(beforeState && beforeState.inventory) ? beforeState.inventory : [])
        .filter(item => item && item.rarity === 'unique').map(item => item.name);
    let uniqueNames = (Array.isArray(afterState && afterState.inventory) ? afterState.inventory : [])
        .filter(item => item && item.rarity === 'unique').map(item => item.name)
        .filter(name => {
            let idx = beforeUniqueNames.indexOf(name);
            if (idx < 0) return true;
            beforeUniqueNames.splice(idx, 1);
            return false;
        });
    return {
        kills: combatMetrics ? combatMetrics.kills : Math.max(0, Math.floor((afterState.loopKills || 0) - (beforeState.loopKills || 0))),
        exp: combatMetrics ? combatMetrics.exp : Math.max(0, getBackgroundTotalExperience(afterState) - getBackgroundTotalExperience(beforeState)),
        expLost: combatMetrics ? combatMetrics.expLost : 0,
        deaths: combatMetrics ? combatMetrics.deaths : Math.max(0, Math.floor((afterState.loopDeaths || 0) - (beforeState.loopDeaths || 0))),
        currencies,
        items: Math.max(0, afterInv - beforeInv),
        rarityGains,
        uniqueNames,
        highlights: equipmentLootPolicy.collectHighlights(beforeState, afterState),
        overflowSalvaged: Math.max(0, Math.floor(Number(overflowSalvaged) || 0)),
        masteryGains: getBackgroundMasteryGains(beforeState, afterState),
        knitting: knitting.gainedBetween(beforeState.knitting, afterState.knitting),
        atlas: getBackgroundAtlasGains(beforeState, afterState)
    };
}

/** 아틀라스(방치 중 지도): 끝낸 지도, 보물 무리(그중 황금 보물), 기억의 잎과 처음 본 잎 이름. 아무 일도 없으면 null. */
function getBackgroundAtlasGains(beforeState, afterState) {
    const before = beforeState && beforeState.atlas, after = afterState && afterState.atlas;
    if (!before || !after || !after.tally || typeof memoryLeaves !== 'object') return null;
    const tally = key => Math.max(0, (Number(after.tally[key]) || 0) - (Number((before.tally || {})[key]) || 0));
    const leaves = memoryLeaves.gainedBetween(before.leaves, after.leaves);
    const gains = { maps: tally('maps'), treasure: tally('treasure'), golden: tally('golden'), leaves: leaves.total, newLeaves: leaves.fresh };
    return gains.maps || gains.treasure || gains.leaves ? gains : null;
}

/** The result line for those levels ('' when none rose). */
function formatBackgroundMasteryLine(gains) {
    return typeof weaponMasteryUi === 'object' ? weaponMasteryUi.settlementLine(gains) : '';
}

/** Weapon mastery levels the settlement raised (js/weapon-mastery.js); none in harnesses without it. */
function getBackgroundMasteryGains(beforeState, afterState) {
    return typeof weaponMastery === 'object' && beforeState && afterState ? weaponMastery.gains(beforeState, afterState) : [];
}

function formatBackgroundDuration(ms) {
    let totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    if (hours > 0) return minutes > 0 ? _t('{hours}시간 {minutes}분', { hours, minutes }) : _t('{hours}시간', { hours });
    if (minutes > 0) return seconds > 0 ? _t('{minutes}분 {seconds}초', { minutes, seconds }) : _t('{minutes}분', { minutes });
    return _t('{seconds}초', { seconds });
}

function getBackgroundProgressOverlay() {
    if (typeof document === 'undefined' || !document.body) return null;
    let overlay = document.getElementById('background-combat-progress-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'background-combat-progress-overlay';
    overlay.className = 'background-combat-progress-overlay';
    overlay.innerHTML = '<div class="background-combat-progress-card" role="dialog" aria-modal="true" aria-label="방치 정산"><h2>방치 정산</h2><div id="background-combat-progress-percent" aria-live="polite">계산 진행 0%</div><div class="background-combat-progress-track" role="progressbar" aria-label="방치 정산 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="background-combat-progress-bar-fill"></div></div><div id="background-combat-progress-duration"></div><div class="background-combat-speed-guide"></div><p id="background-combat-sacrifice">가속할 때마다 남은 전투 시간의 절반과 그 보상 기회를 포기합니다. 이미 계산한 보상은 유지됩니다.</p><p id="background-combat-skipped" aria-live="polite"></p><div class="background-combat-actions"><button type="button" id="background-combat-fast-button" onclick="requestFasterBackgroundCombat()">2배 가속, 남은 시간 ½</button><button type="button" id="background-combat-finish-button" onclick="requestFasterBackgroundCombat(true)">즉시 종료, 남은 시간 포기</button></div></div>';
    document.body.appendChild(overlay);
    return overlay;
}

function requestFasterBackgroundCombat(finish = false) {
    if (!backgroundCombatRuntime.processing || backgroundCombatRuntime.finishRequested) return;
    backgroundCombatRuntime.finishRequested = finish;
    backgroundCombatRuntime.accelerationTier = Math.min(4, backgroundCombatRuntime.accelerationTier + (finish ? 0 : 1));
    renderBackgroundSpeedControls(finish);
}

function renderBackgroundSpeedControls(finish) {
    let button = typeof document !== 'undefined' ? document.getElementById('background-combat-fast-button') : null;
    if (!button) return;
    button.disabled = finish || backgroundCombatRuntime.accelerationTier >= 4;
    button.textContent = finish ? _t('계산한 보상 저장 중…') : backgroundCombatRuntime.accelerationTier >= 4
        ? '16배 가속 적용됨' : _t('{value}배 가속, 남은 시간 ½', { value: 2 ** (backgroundCombatRuntime.accelerationTier + 1) });
    const stop = document.getElementById('background-combat-finish-button');
    if (stop) stop.disabled = finish;
}


function updateBackgroundProgressOverlay(doneMs, totalMs, actualElapsedMs, skippedMs = 0, phase) {
    let overlay = getBackgroundProgressOverlay();
    if (!overlay) return;
    let pct = totalMs > 0 ? Math.max(0, Math.min(100, Math.floor(doneMs / totalMs * 1000) / 10)) : 100;
    const signature = `${pct}:${skippedMs}:${phase}`;
    if (overlay.dataset.progressPercent === signature) return;
    overlay.dataset.progressPercent = signature;
    updateBackgroundSkippedTime(skippedMs);
    let percent = document.getElementById('background-combat-progress-percent');
    let progressBar = document.querySelector('.background-combat-progress-track');
    let progressFill = document.getElementById('background-combat-progress-bar-fill');
    let duration = document.getElementById('background-combat-progress-duration');
    let guide = document.querySelector('.background-combat-speed-guide');
    if (percent) percent.textContent = _t('계산 진행 {pct}%{phase}', { pct, phase: backgroundProgressPhaseText(phase) });
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (duration) duration.textContent = _t('자리 비움 {actualElapsedMs}, 계산 {max}', { actualElapsedMs: formatBackgroundDuration(actualElapsedMs), max: formatBackgroundDuration(Math.max(0, doneMs - skippedMs)) });
    if (guide) {
        let limits = getBackgroundProgressResultLimits(game);
        guide.textContent = _t('진행 한도 {recognitionHours}시간, 효율 {round}%', { recognitionHours: limits.recognitionHours, round: Math.round(limits.efficiencyRate * 100) });
    }
}

/** 빠른 계산(js/combat-replay-projection.js)은 앞부분 실제 전투로 속도를 잰 뒤 나머지를 한꺼번에 계산한다. 재는 동안은 막대가
 * 거의 움직이지 않으므로 무엇을 하는지 적는다. */
function backgroundProgressPhaseText(phase) {
    return phase === 'measure' ? ' (전투 속도 재는 중)' : '';
}

function hideBackgroundProgressOverlay() {
    let overlay = typeof document !== 'undefined' ? document.getElementById('background-combat-progress-overlay') : null;
    if (overlay) overlay.remove();
}

function updateBackgroundSkippedTime(skippedMs) {
    const skipped = document.getElementById('background-combat-skipped');
    if (skipped) skipped.textContent = formatBackgroundSkippedReward(skippedMs);
}

/** 빠른 계산을 했으면 한 줄(흐린 글): 실제로 싸운 시간의 속도로 나머지를 계산했다. */
function formatBackgroundProjection(result) {
    if (!(result.projectedMs > 0)) return '';
    return _t('빠른 계산: 실제 전투 {realMs}의 속도로 나머지 {projectedMs}도 계산했습니다.', { realMs: formatBackgroundDuration(result.realMs), projectedMs: formatBackgroundDuration(result.projectedMs) });
}

function formatBackgroundSkippedReward(skippedMs) {
    return skippedMs > 0 ? _t('포기한 전투 시간 {skippedMs}, 해당 시간 보상 미지급', { skippedMs: formatBackgroundDuration(skippedMs) }) : '';
}

/** 빠른 계산을 못 탄 긴 실제 전투(data/offline-progress.js OFFLINE_PROJECTION realHoldMs, realCapMs): [알림 색, 한 줄]. */
function formatBackgroundRealLimits(result) {
    const minutes = ms => Math.round(ms / 60000);
    return [
        ['info', result.heldZone ? _t('실제 전투가 {realHoldMs}분을 넘어 그 뒤로는 지금 지역을 반복했습니다.', { realHoldMs: minutes(OFFLINE_PROJECTION.realHoldMs) }) : ''],
        ['bad', result.cutMs > 0 ? _t('빠른 계산을 못 하는 곳이라 실제 전투 {realCapMs}분까지만 계산했고, 남은 {cutMs}의 보상은 없습니다.', { realCapMs: minutes(OFFLINE_PROJECTION.realCapMs), cutMs: formatBackgroundDuration(result.cutMs) }) : '']
    ];
}

/** 정산 결과 창(2026-10-09 사용자 "간단하면서도 필요한 정보만 딱 딱 강조해서 색상 배분한 깔끔한 ux"): 시간 한 줄, 큰 숫자 넷,
 * 장비, 재화, 성장, 알림 순. 색은 뜻마다 하나다: 경험치와 숙련은 초록, 재화는 제 색(getCurrencyTone), 장비는 희귀도 색, 잃은 것은 빨강,
 * 한도와 멈춤은 주황, 계산 설명은 흐린 글. */
function showBackgroundCombatResult(result) {
    if (typeof document === 'undefined' || !document.body) return;
    if (typeof yieldTutorialCardToResult === 'function') yieldTutorialCardToResult();
    document.getElementById('background-combat-result-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'background-combat-result-overlay';
    overlay.className = 'background-combat-result-overlay';
    const summary = result.summary || {};
    const limits = result.limits || getBackgroundProgressResultLimits(game);
    const body = renderBackgroundStoryLine() + renderBackgroundResultTiles(summary) + renderBackgroundResultLoot(summary) + renderBackgroundResultAtlas(summary.atlas) + knittingUi.offlineHtml(summary.knitting)
        + renderBackgroundResultCurrencies(summary.currencies) + renderBackgroundResultGrowth(summary) + renderBackgroundResultNotes(result, summary, limits);
    const close = "hideItemTooltip();document.getElementById('background-combat-result-overlay').remove()";
    overlay.innerHTML = `<div class="background-combat-result-card" role="dialog" aria-modal="true" aria-labelledby="background-result-title">${renderBackgroundResultHeader(result, limits)}`
        + `<div class="background-result-body">${body}</div><footer><button type="button" onclick="${close};switchTab('tab-items', {keepWindowOpen:true})">${_t('장비 확인')}</button>`
        + `<button type="button" class="background-result-continue" onclick="${close}">${_t('계속하기')}</button></footer></div>`;
    document.body.appendChild(overlay);
}

/** 맨 위: 비운 시간 → 실제로 싸운 시간(금빛). 그 아래 한 줄은 왜 줄었는지(효율과 한도)라 흐리게 두지 않는다. */
function renderBackgroundResultHeader(result, limits) {
    const away = formatBackgroundResultTime(result.actualElapsedMs);
    const fought = formatBackgroundResultTime(result.effectiveProgressMs);
    return `<header><h2 id="background-result-title">${_t('정산 결과')}</h2><p class="background-result-times"><span>${_t('자리 비움')} <strong>${away}</strong></span>`
        + `<span class="background-result-arrow" aria-hidden="true">→</span><span class="fought">${_t('전투 진행')} <strong>${fought}</strong></span></p>`
        + `<p class="background-result-formula">${_t('효율 {round}%, 한도 {recognitionHours}시간.', { round: Math.round(limits.efficiencyRate * 100), recognitionHours: limits.recognitionHours })}</p></header>`;
}

/** 결과 창의 시간은 분까지 적는다(정산 중 창은 초까지 센다). */
function formatBackgroundResultTime(ms) {
    const value = Math.max(0, Number(ms) || 0);
    return formatBackgroundDuration(value >= 60000 ? value - value % 60000 : value);
}

/** 큰 숫자 넷: 처치, 경험치(초록, 잃은 경험치는 그 아래 빨강), 장비(얻은 가장 높은 희귀도 색), 사망(있으면 빨강, 없으면 흐리게). */
function renderBackgroundResultTiles(summary) {
    const deaths = Math.max(0, Number(summary.deaths) || 0);
    const lost = Math.max(0, Number(summary.expLost) || 0);
    const best = ['unique', 'rare', 'magic'].find(rarity => (summary.rarityGains || {})[rarity] > 0);
    const tiles = [
        { label: _t('처치'), value: formatNumberKR(summary.kills) },
        { label: _t('경험치'), value: `+${formatNumberKR(summary.exp)}`, tone: 'exp', note: lost > 0 ? _t('-{lost} 잃음', { lost: formatNumberKR(lost) }) : '' },
        { label: _t('장비'), value: `+${formatNumberKR(summary.items)}`, color: best ? getRarityColor(best) : '' },
        { label: _t('사망'), value: String(deaths), tone: deaths > 0 ? 'bad' : 'quiet' }
    ];
    return `<div class="background-result-tiles">${tiles.map(renderBackgroundResultTile).join('')}</div>`;
}

function renderBackgroundResultTile(tile) {
    const style = tile.color ? ` style="--tile-tone:${tile.color}"` : '';
    const size = tile.value.length > 9 ? ' long' : '';
    return `<div class="background-result-tile ${tile.tone || ''}${size}"${style}><span>${_t(tile.label)}</span><strong>${tile.value}</strong>${tile.note ? `<small>${_t(tile.note)}</small>` : ''}</div>`;
}

/** 장비: 희귀도별 개수(높은 등급부터 그 색으로), 방치 보관함과 자동해체는 흐린 칩, 그 아래 주요 장비 카드(고유는 늘 여기 있다). */
function renderBackgroundResultLoot(summary) {
    const gains = summary.rarityGains || {};
    const chips = ['unique', 'rare', 'magic', 'normal'].filter(rarity => gains[rarity] > 0)
        .map(rarity => `<span class="background-result-chip" style="--chip-tone:${getRarityColor(rarity)}">${_t(ITEM_RARITY_LABELS[rarity])} <b>${gains[rarity]}</b></span>`);
    const salvaged = Math.max(0, Number(summary.overflowSalvaged) || 0);
    if (salvaged > 0) chips.push(`<span class="background-result-chip quiet" data-tip="가방이 차서 해체했습니다. 해체 보상은 재화에 들어 있습니다.">자동해체 <b>${salvaged}</b></span>`);
    const row = chips.length ? `<div class="background-result-chips">${chips.join('')}</div>` : '';
    return row + equipmentLootUi.renderHighlights(summary.highlights);
}

/** 아틀라스 칸: 끝낸 지도, 보물 무리(금테), 황금 보물(체이싱 티어 색), 기억의 잎(잎 그림)과 처음 본 잎. */
function renderBackgroundResultAtlas(atlas) {
    if (!atlas) return '';
    const chips = [];
    if (atlas.maps) chips.push(`<span class="background-result-chip">지도 <b>${formatNumberKR(atlas.maps)}판</b></span>`);
    if (atlas.treasure) chips.push(`<span class="background-result-chip major">보물 무리 <b>${formatNumberKR(atlas.treasure)}</b></span>`);
    if (atlas.golden) chips.push(`<span class="background-result-chip jackpot">황금 보물 <b>${formatNumberKR(atlas.golden)}</b></span>`);
    if (atlas.leaves) chips.push(`<span class="background-result-chip leaf">${renderPixelIcon('leaf', 'background-result-leaf')}기억의 잎 <b>+${formatNumberKR(atlas.leaves)}</b></span>`);
    (atlas.newLeaves || []).forEach(name => chips.push(`<span class="background-result-chip leaf new"><em>새 잎</em>${escapeHTML(name)}</span>`));
    return `<section class="background-result-section"><h3>${_t('아틀라스')}</h3><div class="background-result-chips">${chips.join('')}</div></section>`;
}

/** 재화: 재화마다 제 색의 칸(2026-11-02 사용자). 바닥에서 빛기둥을 세우는 재화(js/loot.js lootMoments)가 높은 등급부터 앞에 오고 테가 빛난다. 나머지는 지갑 순서. */
function renderBackgroundResultCurrencies(currencies) {
    const rows = (Array.isArray(currencies) ? currencies : []).filter(entry => entry && entry.gain > 0);
    if (!rows.length) return '';
    const rank = entry => lootMoments.rank(lootMoments.ofCurrency(entry.key));
    const coins = rows.slice().sort((a, b) => rank(b) - rank(a)).map(renderBackgroundResultCoin);
    return `<section class="background-result-section"><h3>${_t('재화')}</h3><div class="background-result-wallet">${coins.join('')}</div></section>`;
}

function renderBackgroundResultCoin(entry) {
    const moment = lootMoments.ofCurrency(entry.key);
    return `<span class="background-result-coin${moment ? ` is-${moment}` : ''}" style="--coin-tone:${getCurrencyTone(entry.key)}">${backgroundResultCurrencyIcon(entry.key)}`
        + `<span class="background-result-coin-name">${escapeHTML(_t(entry.name))}</span><b>+${formatNumberKR(entry.gain)}</b></span>`;
}

/** 재화 원화, 그림이 없는 재화는 그 색의 작은 마름모. 지갑 창의 getCurrencyIconHtml은 performUpdateStaticUI 안에 있어 여기서 못 부른다. */
function backgroundResultCurrencyIcon(key) {
    const icon = ORB_DB[key] && ORB_DB[key].icon;
    return icon ? `<img class="background-result-icon" src="${icon}" alt="" aria-hidden="true">` : '<i class="background-result-coin-mark" aria-hidden="true"></i>';
}

/** 성장(초록): 오른 무기 숙련. */
function renderBackgroundResultGrowth(summary) {
    const mastery = formatBackgroundMasteryLine(summary.masteryGains);
    return mastery ? `<p class="background-result-growth">${mastery}</p>` : '';
}

/** 알림은 뜻마다 색 하나: 잃은 것은 빨강(bad), 한도와 멈춤은 주황(warn), 계산 방식은 흐린 글(info). */
function renderBackgroundResultNotes(result, summary, limits) {
    const notes = [
        ['bad', formatBackgroundSkippedReward(result.skippedMs - (result.cutMs || 0))],
        ...formatBackgroundRealLimits(result),
        ['warn', backgroundNoExpReason(summary)],
        ['warn', result.stopped ? '사냥이 멈추거나 선택 창이 열려 여기까지만 진행했습니다.' : ''],
        ['warn', result.capped ? _t('방치 한도 {recognitionHours}시간을 다 채웠습니다.', { recognitionHours: limits.recognitionHours }) : ''],
        ['info', formatBackgroundProjection(result)]
    ].filter(([, text]) => text);
    return notes.length ? `<ul class="background-result-notes">${notes.map(([tone, text]) => `<li class="${tone}">${text}</li>`).join('')}</ul>` : '';
}

/** 레벨이 지역보다 높아 경험치가 크게 줄었으면 그 까닭(주황 알림): 레벨 차이가 클수록 줄어, 한참 높으면 처치당 0이 된다
 * (검토 7차 "+0", 8차 "+1" — 합계가 딱 0일 때만 붙였다). 절반 밑으로 줄었을 때 적는다. */
const BACKGROUND_EXP_NOTE_BELOW = 0.5;
function backgroundNoExpReason(summary) {
    if (!((Number(summary.kills) || 0) > 0)) return '';
    const zone = getZone(game.currentZoneId);
    const rate = levelProgression.rewardMultiplier(zone, { level: levelProgression.areaLevel(zone) }, game.level, 'experience');
    if (rate >= BACKGROUND_EXP_NOTE_BELOW) return '';
    const pct = Math.round(rate * 100);
    return `레벨 차이로 이 지역 경험치가 ${pct > 0 ? _t('{pct}%로 줄었습니다', { pct }) : _t('거의 없습니다')}.`;
}

/** 자리를 비운 동안 지나온 이야기(한 장씩 띄우지 않고 기록으로): "지난 이야기 2편이 기록에 실렸습니다" + 기록 열기. */
function renderBackgroundStoryLine() {
    const scenes = typeof storyJournalUi === 'object' ? storyJournalUi.foldPassedScenes() : [];
    if (!scenes.length) return '';
    return `<p class="background-result-story"><span>${_t('지난 이야기 {length}편이 기록에 실렸습니다.', { length: scenes.length })}</span>
        <button type="button" onclick="hideItemTooltip();document.getElementById('background-combat-result-overlay').remove();switchTab('tab-journal')">${_t('기록에서 읽기')}</button></p>`;
}

/** An entry-ticket boss fight settles too: the replay fights it for real (js/combat.js departSeasonBoss, defeatInRootBossFight).
 * It used to be refused here after the whole replay, so every 다시 계산 and every reload failed the same way (2026-11-03). */
function shouldApplyBackgroundCombatResult(signature) {
    if (getBackgroundCombatSignature(game) !== signature) return false;
    return !(game.pendingLoopDecision || game.pendingLoopReady);
}


function restoreBattlefieldBeforeBackgroundReplay(refreshUi = true) {
    if (typeof syncBattleTabLayout === 'function') syncBattleTabLayout(false);
    if (typeof scheduleStableResize === 'function') scheduleStableResize();
    else if (typeof resizeCanvas === 'function') resizeCanvas();
    if (refreshUi && typeof updateStaticUI === 'function') updateStaticUI();
    if (typeof renderBattlefield === 'function') renderBattlefield(true);
}


function commitBackgroundCombat(result, expectedGame) {
    if (game !== expectedGame) throw new Error('정산 중 저장 계정 또는 게임 상태가 변경되었습니다.');
    let candidate = mergeDefaults(result.game);
    candidate.saveMeta = { ...expectedGame.saveMeta };
    candidate.settings.mapCompleteAction = expectedGame.settings.mapCompleteAction;
    game = candidate;
    backgroundCombatRuntime.processing = false;
    // The settled state is stamped now: a save made while hidden keeps hiddenAtMs (js/save.js getPlayedUntil), which would settle
    // the same time again at the next launch.
    const awaySince = backgroundCombatRuntime.hiddenAtMs;
    backgroundCombatRuntime.hiddenAtMs = 0;
    try {
        if (!persistLocalSave({allowRecoveryWrite: getLocalSaveStatus().status === 'write-failed'})) throw new Error('방치 보상 저장에 실패했습니다. 이전 진행은 유지됩니다.');
        restoreCombatRuntime(result.runtime);
        backgroundCombatRuntime.snapshot = null;
        backgroundCombatRuntime.signature = '';
    } catch (error) {
        game = expectedGame;
        backgroundCombatRuntime.hiddenAtMs = awaySince;
        throw error;
    }
    if (document.hidden || backgroundCombatRuntime.appInactive) recordBackgroundCombatEntry(Date.now());
}

const backgroundReturnWaits = () => backgroundCombatRuntime.processing || backgroundCombatRuntime.appInactive || document.hidden;

/** Settles the time away from backgroundCombatRuntime.hiddenAtMs to nowMs. While the page is hidden or the app paused it waits: the
 * span and snapshot stay, and the visible return (js/main.js visibilitychange, js/android-app-ui.js resume) settles the whole time. */
async function startBackgroundCombatReturn(nowMs) {
    if (backgroundReturnWaits()) return false;
    let snapshot = backgroundCombatRuntime.snapshot;
    let original = game;
    let startedAtMs = backgroundCombatRuntime.hiddenAtMs;
    let actualElapsedMs = Math.max(0, nowMs - startedAtMs);
    let limits = getBackgroundProgressResultLimits(snapshot || game);
    let effectiveProgressMs = calculateBackgroundProgressMs(actualElapsedMs, BACKGROUND_PROGRESS_MIN_REAL_MS, limits.efficiencyRate, limits.effectiveLimitMs);
    if (!snapshot || effectiveProgressMs <= 0) {
        backgroundCombatRuntime.snapshot = null;
        backgroundCombatRuntime.hiddenAtMs = 0;
        return false;
    }
    backgroundCombatRuntime.processing = true;
    backgroundCombatRuntime.failed = false;
    backgroundCombatRuntime.accelerationTier = 0;
    backgroundCombatRuntime.finishRequested = false;
    let committed = false;
    setBattleFxSuppressed(true);
    try {
        restoreBattlefieldBeforeBackgroundReplay(false);
        hideBackgroundProgressOverlay();
        updateBackgroundProgressOverlay(0, effectiveProgressMs, actualElapsedMs);
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        let result = await simulateBackgroundCombatChunked({
            elapsedMs: effectiveProgressMs, snapshot, startNowMs: startedAtMs, project: true,
            isPaused: () => document.hidden || backgroundCombatRuntime.appInactive,
            // Back after leaving again mid-settlement: the replay goes on and takes the time away since hiddenAtMs (it used to start
            // over, and on a phone a long settlement could start over at every glance away).
            getElapsedMs: () => {
                actualElapsedMs = Math.max(actualElapsedMs, Date.now() - startedAtMs);
                return calculateBackgroundProgressMs(actualElapsedMs, BACKGROUND_PROGRESS_MIN_REAL_MS, limits.efficiencyRate, limits.effectiveLimitMs);
            },
            getControl: () => ({tier: backgroundCombatRuntime.accelerationTier, finish: backgroundCombatRuntime.finishRequested}),
            onProgress: (done, total, skipped, phase) => updateBackgroundProgressOverlay(done, total, actualElapsedMs, skipped, phase)
        });
        if (!shouldApplyBackgroundCombatResult(backgroundCombatRuntime.signature)) throw new Error('정산 중 사냥 상태가 변경되었습니다.');
        let summary = getBackgroundRewardSummary(snapshot, result.game, result.metrics, result.overflowSalvaged);
        commitBackgroundCombat(result, original);
        committed = true;
        updateBackgroundProgressOverlay(result.processedMs + result.skippedMs, result.processedMs + result.skippedMs, actualElapsedMs, result.skippedMs);
        document.getElementById('background-combat-progress-percent').textContent = _t('정산 완료');
        await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
        showBackgroundCombatResult({ actualElapsedMs, effectiveProgressMs: result.processedMs, summary,
            capped: actualElapsedMs >= limits.recognitionLimitMs, limits, stopped: result.stopped, stopReason: result.stopReason,
            skippedMs: result.skippedMs, realMs: result.realMs, projectedMs: result.projectedMs, heldZone: result.heldZone, cutMs: result.cutMs });
        restoreBattlefieldBeforeBackgroundReplay();
        return true;
    } catch (error) {
        reportBackgroundCombatFailure(error, committed);
        return committed;
    } finally {
        backgroundCombatRuntime.processing = false;
        setBattleFxSuppressed(false);
        if (!backgroundCombatRuntime.failed) hideBackgroundProgressOverlay();
    }
}

function reportBackgroundCombatFailure(error, committed) {
    console.error('offline combat settlement failed:', error);
    if (committed) {
        addLog('방치 보상은 저장되었습니다. 결과 화면을 표시하지 못했습니다: ' + error.message, 'loot-rare');
        return;
    }
    backgroundCombatRuntime.failed = true;
    const overlay = getBackgroundProgressOverlay();
    overlay.innerHTML = `<div class="background-combat-progress-card" role="alert"><strong>${_t('방치 정산을 완료하지 못했습니다')}</strong><p>${escapeHTML(error.message)}</p><p>${_t('이전 저장과 방치 시간은 보존됩니다. 다시 계산하거나 새로고침해 주세요.')}</p><button type="button" onclick="startBackgroundCombatReturn(Date.now())">${_t('다시 계산')}</button></div>`;
}

async function startOfflineCombatReturn(nowMs) {
    if (!recordOfflineCombatEntry(nowMs)) return false;
    return startBackgroundCombatReturn(nowMs);
}

function handleBackgroundVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.hidden) recordBackgroundCombatEntry(Date.now());
    else startBackgroundCombatReturn(Date.now());
}

safeExposeGlobals({ requestFasterBackgroundCombat });
