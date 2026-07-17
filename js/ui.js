// Phase-2 extracted UI/tab/render helper block.
let lastHeavyUiRefreshAt = 0;
let lastPassiveTreeDrawAt = 0;
// 전장 캔버스 렌더 주기를 제한해 고주사율 모니터에서의 과도한 재계산/렉을 완화한다.
// (idle ARPG 특성상 30fps 부근이면 충분히 부드럽고, 메인 스레드 여유를 확보해 끊김을 줄인다.)
let lastBattlefieldRenderAt = 0;
const BATTLEFIELD_MIN_FRAME_MS = 22;
let lastPassiveTreeSignature = '';
// 패시브 도달/가시 노드 재계산은 패시브 상태가 바뀔 때만 필요하다. 실제 변경 시에는
// 할당/환불/장착/로드 등 전용 호출부가 직접 재계산하므로, 매 UI 갱신마다 도는
// 방어적 재계산은 상태 시그니처가 바뀐 경우에만 수행해 탭 전환 비용을 줄인다.
let lastReachableSignature = '';
let passiveTreeSearch = '';
let passiveTreeFilter = 'all';
let cachedTooltipStats = null;
let lastSkillPanelRenderSignature = '';
let battleSkillVisualCache = { key: '', value: null };
let gemTooltipCache = null;
let mapZoneGroupCollapseState = { hunting: false, chaos: false };

let mobilePipCanvas = null;
var lod = 1; // fallback for any legacy FX paths
let mobilePipCtx = null;
let mobilePipDrag = { active: false, moved: false, startX: 0, startY: 0, baseRight: 10, baseBottom: 94, lastTapAt: 0 };
let mobilePipRefreshHandle = null;
let mobilePipRefreshErrorReported = false;
let battleAssetDeferredInitHandle = null;
let playerHpDamageGhostPct = null;
let playerHpDamageGhostLastPct = null;
let playerHpDamageGhostLastAt = 0;
let playerHpDamageGhostHoldUntil = 0;
let enemyHpDamageGhostStates = new Map();
const PLAYER_HP_DAMAGE_GHOST_HOLD_MS = 260;
const PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC = 34;
const ENEMY_HP_DAMAGE_GHOST_SNAP_MS = 680;

function isMapZoneGroupCollapsed(groupKey) {
    return !!(mapZoneGroupCollapseState && mapZoneGroupCollapseState[groupKey]);
}

function toggleMapZoneGroup(groupKey) {
    if (!Object.prototype.hasOwnProperty.call(mapZoneGroupCollapseState, groupKey)) return;
    mapZoneGroupCollapseState[groupKey] = !mapZoneGroupCollapseState[groupKey];
    lastRenderedMapListHtml = '';
    lastRenderedChaosMapListHtml = '';
    updateStaticUI();
}

function buildMapZoneGroupHtml(groupKey, title, cards) {
    if (!cards.length) return '';
    let collapsed = isMapZoneGroupCollapsed(groupKey);
    let icon = collapsed ? '▶' : '▼';
    let countText = `${cards.length}개`;
    let gridHtml = collapsed ? '' : `<div class="map-zone-grid map-zone-grid--${groupKey}">${cards.map(card => card.html).join('')}</div>`;
    return `<section class="map-zone-group ${collapsed ? 'collapsed' : ''}" data-map-zone-group="${groupKey}">
        <button type="button" class="map-zone-group-header" onclick="toggleMapZoneGroup('${groupKey}')" aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="map-zone-group-title"><span class="map-zone-group-icon">${icon}</span>${title}</span>
            <span class="map-zone-group-count">${countText}</span>
        </button>
        ${gridHtml}
    </section>`;
}

function getDefaultUiPlayerStats() {
    return {
        maxHp: 1, energyShield: 0, baseDmg: 0, directDps: 0, dps: 0, totalDps: 0, summonDps: 0,
        aspd: 1, crit: 0, critDmg: 150, move: 100, moveSpeed: 100, dr: 0, armor: 0, evasion: 0,
        resF: 0, rawResF: 0, resC: 0, rawResC: 0, resL: 0, rawResL: 0, resChaos: 0, rawResChaos: 0, regen: 0, regenSuppress: 0, leech: 0, ds: 0,
        igniteChance: 0, chillChance: 0, freezeChance: 0, poisonChance: 0, bleedChance: 0,
        blockChance: 0, blockChanceMax: 50, deflectChance: 0, deflectDamageReduce: 0,
        suppCap: 0, summonCap: 1, runeResonancePower: 0, uniqueResonanceFloor: 0, inquisitorResonanceBonus: 0, breakdowns: {}
    };
}

function normalizeUiPlayerStats(stats, fallback = {}) {
    let fromFallback = !!((stats && stats.__uiFallbackStats) || (fallback && fallback.__uiFallbackStats));
    let normalized = Object.assign(getDefaultUiPlayerStats(), fallback || {}, (stats && typeof stats === 'object') ? stats : {});
    if (fromFallback) normalized.__uiFallbackStats = true;
    let numericDefaults = getDefaultUiPlayerStats();
    Object.keys(numericDefaults).forEach(key => {
        if (key === 'breakdowns') return;
        let value = Number(normalized[key]);
        normalized[key] = Number.isFinite(value) ? value : numericDefaults[key];
    });
    normalized.maxHp = Math.max(1, Number(normalized.maxHp) || 1);
    normalized.aspd = Math.max(0.01, Number(normalized.aspd) || 1);
    normalized.move = Math.max(0, Number(normalized.move) || 100);
    normalized.moveSpeed = Math.max(0, Number(normalized.moveSpeed) || 100);
    normalized.critDmg = Number.isFinite(Number(normalized.critDmg)) ? Number(normalized.critDmg) : 150;
    normalized.breakdowns = (normalized.breakdowns && typeof normalized.breakdowns === 'object') ? normalized.breakdowns : {};
    return normalized;
}

function getUiGlobalFunction(name) {
    if (typeof window === 'undefined') return null;
    let provider = window[name];
    if (typeof provider !== 'function' || provider.__placeholderGlobal === true) return null;
    return provider;
}

function callUiProvider(name, provider, args = []) {
    try {
        return provider.apply(null, args);
    } catch (error) {
        console.error(`${name} failed:`, error);
        throw error;
    }
}

function getUiPlayerStats(fallback = {}) {
    let provider = getUiGlobalFunction('getPlayerStats');
    if (provider) return normalizeUiPlayerStats(callUiProvider('getPlayerStats', provider), fallback);
    if (cachedTooltipStats && cachedTooltipStats.__uiFallbackStats !== true) return normalizeUiPlayerStats(cachedTooltipStats, fallback);
    return normalizeUiPlayerStats(Object.assign({}, fallback || {}, { __uiFallbackStats: true }), fallback);
}

function isUiDamageAilmentType(type) {
    let provider = getUiGlobalFunction('isDamageAilmentType');
    if (provider) return !!callUiProvider('isDamageAilmentType', provider, [type]);
    return type === 'ignite' || type === 'poison' || type === 'bleed';
}

function getUiStoredAilmentHitDamage(ail) {
    let provider = getUiGlobalFunction('getStoredAilmentHitDamage');
    if (provider) return Math.max(0, Number(callUiProvider('getStoredAilmentHitDamage', provider, [ail])) || 0);
    return Math.max(0, Number((ail && (ail.sourceHitDamage || ail.hitDamage)) || 0) || 0);
}

function getUiPlayerDamageAilmentDps(ail, stats) {
    let provider = getUiGlobalFunction('getPlayerDamageAilmentDps');
    if (provider) return Math.max(0, Math.floor(Number(callUiProvider('getPlayerDamageAilmentDps', provider, [ail, stats])) || 0));
    let source = getUiStoredAilmentHitDamage(ail);
    if (source <= 0 && stats && stats.maxHp) source = Math.max(1, Math.floor((stats.maxHp || 1) * 0.08));
    return Math.max(0, Math.floor(source * 0.9));
}

function getUiEnemyDamageAilmentDps(ail, stats) {
    let provider = getUiGlobalFunction('getEnemyDamageAilmentDps');
    if (provider) return Math.max(0, Math.floor(Number(callUiProvider('getEnemyDamageAilmentDps', provider, [ail, stats])) || 0));
    return Math.max(0, Math.floor(getUiStoredAilmentHitDamage(ail) * 0.9));
}

function getUiPlayerShockTakenDamageIncreasePct(power, stats) {
    let provider = getUiGlobalFunction('getPlayerShockTakenDamageIncreasePct');
    if (provider) return Number(callUiProvider('getPlayerShockTakenDamageIncreasePct', provider, [stats || {}, power])) || 0;
    let reduction = Math.max(0, Math.min(0.95, Number(stats && stats.shockEffectReducePct || 0) / 100));
    let value = 22 * (1 - reduction);
    return (stats && stats.uniqueShockInvertTaken) ? -value : value;
}

function getUiEnemyShockTakenDamageIncreasePct(power, stats) {
    let provider = getUiGlobalFunction('getEnemyShockTakenDamageIncreasePct');
    if (provider) return Math.max(0, Number(callUiProvider('getEnemyShockTakenDamageIncreasePct', provider, [{ type: 'shock', time: 1, power }, stats || {}])) || 0);
    let base = Math.min(35, 8 + Math.max(0, Number(power || 0)) * 12);
    let bonus = Math.max(0, Number(stats && stats.shockEffectBonusPct) || 0);
    return Math.max(0, Math.min(50, base * (1 + bonus / 100)));
}

function formatUiTakenDamageShockLine(value) {
    let pct = Math.abs(Number(value) || 0).toFixed(1).replace(/\.0$/, '');
    return value < 0 ? `받는 피해 감소: ${pct}%` : `받는 피해 증가: ${pct}%`;
}

function getUiSkillTargets(stats) {
    let provider = getUiGlobalFunction('getSkillTargets');
    return provider ? (callUiProvider('getSkillTargets', provider, [stats]) || []) : [];
}

function getUiCrowdProgressPaused() {
    let provider = getUiGlobalFunction('isCrowdProgressPaused');
    return provider ? !!callUiProvider('isCrowdProgressPaused', provider) : false;
}

function getUiCrowdPauseLimit() {
    if (typeof ENEMY_CROWD_PAUSE_LIMIT !== 'undefined') return ENEMY_CROWD_PAUSE_LIMIT;
    if (typeof window !== 'undefined' && Number.isFinite(Number(window.ENEMY_CROWD_PAUSE_LIMIT))) return Number(window.ENEMY_CROWD_PAUSE_LIMIT);
    return 20;
}

function runUiGlobalFunction(name, args = []) {
    let provider = getUiGlobalFunction(name);
    return provider ? callUiProvider(name, provider, args) : undefined;
}

function runUiStartEncounter() {
    return runUiGlobalFunction('startEncounterRun');
}

function runUiCoreLoop() {
    return runUiGlobalFunction('coreLoop');
}

// HUD에 표시할 플레이어 직업(전직 후) 또는 재능 라벨.
function getUiPlayerClassLabel() {
    let classLabel = (game.ascendClass && typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[game.ascendClass]) ? CLASS_TEMPLATES[game.ascendClass].name : '';
    if (classLabel) return classLabel;
    let heroDef = typeof getHeroSelectionDef === 'function' ? getHeroSelectionDef(game.selectedHeroId) : null;
    return heroDef ? heroDef.label : '재능';
}



const BACKGROUND_PROGRESS_MIN_REAL_MS = 60 * 1000;
const BACKGROUND_PROGRESS_RATE = 0.1;
const BACKGROUND_PROGRESS_MAX_SIMULATED_MS = 30 * 60 * 1000;
const BACKGROUND_COMBAT_STEP_MS = 100;
const BACKGROUND_COMBAT_CHUNK_BUDGET_MS = 10;
const BACKGROUND_COMBAT_SYNC_CHUNK_STEPS = 500;
let backgroundCombatRuntime = { hiddenAtMs: 0, snapshot: null, signature: '', processing: false };

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
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return true;
    if (typeof isLoadingOverlayOpen === 'function' && isLoadingOverlayOpen()) return true;
    if (typeof isRewardOpen === 'function' && isRewardOpen()) return true;
    if (typeof isDeathOverlayOpen === 'function' && isDeathOverlayOpen()) return true;
    if (typeof isLoopHeroSelectOpen === 'function' && isLoopHeroSelectOpen()) return true;
    let overlayPause = !!(game && game.settings && game.settings.pauseGameOnOverlay);
    return !!(overlayPause && typeof isPauseSettingOverlayOpen === 'function' && isPauseSettingOverlayOpen());
}

function isBackgroundCombatEligible(state) {
    if (!state || typeof state !== 'object') return false;
    if (isForegroundGameplayPausedForBackground()) return false;
    if (state.pendingLoopDecision || state.pendingLoopReady || state.combatHalted) return false;
    if ((Number(state.playerHp) || 0) <= 0) return false;
    if (Array.isArray(state.enemies) && state.enemies.some(enemy => enemy && enemy.hp > 0)) return true;
    if (Number(state.moveTimer) > 0) return true;
    return Array.isArray(state.encounterPlan) && state.encounterPlan.length > 0;
}

function cloneBackgroundCombatState(state) {
    return JSON.parse(JSON.stringify(state));
}

function recordBackgroundCombatEntry(nowMs) {
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    backgroundCombatRuntime.hiddenAtMs = now;
    backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
    backgroundCombatRuntime.snapshot = isBackgroundCombatEligible(game) ? cloneBackgroundCombatState(game) : null;
}

function consumeBackgroundElapsedTime(nowMs) {
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    let hiddenAt = Number(backgroundCombatRuntime.hiddenAtMs || 0);
    backgroundCombatRuntime.hiddenAtMs = 0;
    if (!Number.isFinite(hiddenAt) || hiddenAt <= 0 || now < hiddenAt) return 0;
    return Math.max(0, Math.floor(now - hiddenAt));
}

function getBackgroundCurrencyLabel(key) {
    let def = (typeof ORB_DB !== 'undefined' && ORB_DB) ? ORB_DB[key] : null;
    return (def && def.name) ? def.name : key;
}

function countInventoryByRarity(list) {
    let counts = {};
    (Array.isArray(list) ? list : []).forEach(item => {
        if (!item || !item.rarity) return;
        counts[item.rarity] = (counts[item.rarity] || 0) + 1;
    });
    return counts;
}

function getBackgroundTotalExperience(state) {
    if (!state || typeof state !== 'object') return 0;
    let level = Math.max(1, Math.floor(Number(state.level) || 1));
    let total = Math.max(0, Math.floor(Number(state.exp) || 0));
    if (typeof getExpReq !== 'function') return total;
    for (let currentLevel = 1; currentLevel < level; currentLevel++) {
        total += Math.max(0, Math.floor(Number(getExpReq(currentLevel)) || 0));
    }
    return total;
}

function createBackgroundCombatMetrics(state) {
    return {
        kills: 0,
        exp: 0,
        expLost: 0,
        deaths: 0,
        previousLevel: Math.max(1, Math.floor(Number(state && state.level) || 1)),
        previousExp: Math.max(0, Math.floor(Number(state && state.exp) || 0)),
        previousKills: Math.max(0, Math.floor(Number(state && state.loopKills) || 0)),
        previousDeaths: Math.max(0, Math.floor(Number(state && state.loopDeaths) || 0)),
        previousDeathAt: Math.max(0, Number(state && state.lastDeathLog && state.lastDeathLog.at) || 0)
    };
}

function updateBackgroundCombatMetrics(metrics, state) {
    if (!metrics || !state) return;
    let kills = Math.max(0, Math.floor(Number(state.loopKills) || 0));
    metrics.kills += kills >= metrics.previousKills ? kills - metrics.previousKills : kills;
    metrics.previousKills = kills;
    let deaths = Math.max(0, Math.floor(Number(state.loopDeaths) || 0));
    metrics.deaths += deaths >= metrics.previousDeaths ? deaths - metrics.previousDeaths : deaths;
    metrics.previousDeaths = deaths;
    let deathAt = Math.max(0, Number(state.lastDeathLog && state.lastDeathLog.at) || 0);
    let lostThisStep = deathAt > metrics.previousDeathAt
        ? Math.max(0, Math.floor(Number(state.lastDeathLog && state.lastDeathLog.expLost) || 0))
        : 0;
    metrics.previousDeathAt = Math.max(metrics.previousDeathAt, deathAt);
    let level = Math.max(1, Math.floor(Number(state.level) || 1));
    let exp = Math.max(0, Math.floor(Number(state.exp) || 0));
    let earnedThisStep = exp - metrics.previousExp;
    if (level > metrics.previousLevel && typeof getExpReq === 'function') {
        for (let currentLevel = metrics.previousLevel; currentLevel < level; currentLevel++) {
            earnedThisStep += Math.max(0, Math.floor(Number(getExpReq(currentLevel)) || 0));
        }
    } else if (level < metrics.previousLevel) {
        earnedThisStep = getBackgroundTotalExperience(state) - getBackgroundTotalExperience({ level: metrics.previousLevel, exp: metrics.previousExp });
    }
    metrics.exp += Math.max(0, earnedThisStep + lostThisStep);
    metrics.expLost += lostThisStep;
    metrics.previousLevel = level;
    metrics.previousExp = exp;
}

function getBackgroundRewardSummary(beforeState, afterState, combatMetrics) {
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
        uniqueNames
    };
}

function formatBackgroundDuration(ms) {
    let totalSeconds = Math.max(0, Math.floor((Number(ms) || 0) / 1000));
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    let seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}시간 ${minutes}분`;
    if (minutes > 0) return `${minutes}분 ${seconds}초`;
    return `${seconds}초`;
}

function getBackgroundProgressOverlay() {
    if (typeof document === 'undefined' || !document.body) return null;
    let overlay = document.getElementById('background-combat-progress-overlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'background-combat-progress-overlay';
    overlay.className = 'background-combat-progress-overlay';
    overlay.innerHTML = '<div class="background-combat-progress-card"><strong>백그라운드 전투 계산 중</strong><div id="background-combat-progress-percent">계산 진행 0%</div><div class="background-combat-progress-track" role="progressbar" aria-label="백그라운드 전투 계산 진행률" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="background-combat-progress-bar-fill"></div></div><div id="background-combat-progress-duration"></div></div>';
    document.body.appendChild(overlay);
    return overlay;
}

function updateBackgroundProgressOverlay(doneMs, totalMs, actualElapsedMs) {
    let overlay = getBackgroundProgressOverlay();
    if (!overlay) return;
    let pct = totalMs > 0 ? Math.min(100, Math.floor(doneMs / totalMs * 100)) : 100;
    let percent = document.getElementById('background-combat-progress-percent');
    let progressBar = document.querySelector('.background-combat-progress-track');
    let progressFill = document.getElementById('background-combat-progress-bar-fill');
    let duration = document.getElementById('background-combat-progress-duration');
    if (percent) percent.textContent = `계산 진행 ${pct}%`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (duration) duration.textContent = `${formatBackgroundDuration(actualElapsedMs)}의 진행을 반영하고 있습니다`;
}

function hideBackgroundProgressOverlay() {
    let overlay = typeof document !== 'undefined' ? document.getElementById('background-combat-progress-overlay') : null;
    if (overlay) overlay.remove();
}

function showBackgroundCombatResult(result) {
    if (typeof document === 'undefined' || !document.body) return;
    let old = document.getElementById('background-combat-result-overlay');
    if (old) old.remove();
    let overlay = document.createElement('div');
    overlay.id = 'background-combat-result-overlay';
    overlay.className = 'background-combat-result-overlay';
    let summary = result.summary || {};
    let rarityLabels = { normal: '일반', magic: '매직', rare: '레어', unique: '고유' };
    let rarityColor = rarity => (typeof getRarityColor === 'function' ? getRarityColor(rarity) : '#e4eefb');
    let currencyHtml = (summary.currencies || []).slice(0, 6)
        .map(entry => (entry && typeof entry === 'object')
            ? `<span style="color:#ffd36b;">${entry.name}</span> <strong>+${entry.gain}</strong>`
            : String(entry))
        .join(', ') || '없음';
    let rarityGains = summary.rarityGains || {};
    let itemHtml = ['normal', 'magic', 'rare', 'unique']
        .filter(rarity => rarityGains[rarity] > 0)
        .map(rarity => `<span style="color:${rarityColor(rarity)};">${rarityLabels[rarity]} ${rarityGains[rarity]}개</span>`)
        .join(' · ') || (summary.items > 0 ? `${summary.items}개` : '없음');
    let uniqueLine = (summary.uniqueNames || []).length > 0
        ? `<br>고유 획득: <span style="color:${rarityColor('unique')};font-weight:700;">${summary.uniqueNames.slice(0, 5).join(', ')}</span>`
        : '';
    let rewards = [
        `총 처치: <strong>${summary.kills || 0}</strong>`,
        `총 경험치: <strong>+${summary.exp || 0}</strong> <span class="background-combat-exp-lost">(잃은 경험치 -${summary.expLost || 0})</span>`,
        `사망 횟수: <strong>${summary.deaths || 0}</strong>`,
        `아이템: ${itemHtml}${uniqueLine}`,
        `재화: ${currencyHtml}`
    ].join('<br>');
    overlay.innerHTML = `<div class="tutorial-card background-combat-result-card"><h2>백그라운드 전투 결과</h2><p>자리를 비운 시간: ${formatBackgroundDuration(result.actualElapsedMs)}</p><p>적용된 전투 진행: ${formatBackgroundDuration(result.effectiveProgressMs)}</p><p>${rewards}</p>${result.capped ? '<p class="background-combat-capped">백그라운드 진행 최대치에 도달했습니다.</p>' : ''}<button type="button" onclick="document.getElementById('background-combat-result-overlay').remove()">닫기</button></div>`;
    document.body.appendChild(overlay);
}

function shouldApplyBackgroundCombatResult(signature) {
    if (getBackgroundCombatSignature(game) !== signature) return false;
    return !(game.pendingLoopDecision || game.pendingLoopReady || game.inTicketBossFight);
}

function simulateBackgroundCombat(options) {
    let elapsedMs = Math.max(0, Math.floor(Number(options && options.elapsedMs) || 0));
    let stepCount = Math.floor(elapsedMs / BACKGROUND_COMBAT_STEP_MS);
    let simGame = cloneBackgroundCombatState(options.snapshot);
    let stepFn = options.stepFn || runUiCoreLoop;
    let previousGame = game;
    let originalDateNow = Date.now;
    let simulatedNow = Math.max(0, Math.floor(Number(options && options.startNowMs) || originalDateNow()));
    let metrics = createBackgroundCombatMetrics(simGame);
    try {
        Date.now = () => simulatedNow;
        game = simGame;
        let processed = 0;
        while (processed < stepCount) {
            let chunkEnd = Math.min(stepCount, processed + BACKGROUND_COMBAT_SYNC_CHUNK_STEPS);
            for (; processed < chunkEnd; processed++) {
                if (game.pendingLoopDecision || game.pendingLoopReady) break;
                stepFn();
                simulatedNow += BACKGROUND_COMBAT_STEP_MS;
                updateBackgroundCombatMetrics(metrics, game);
            }
            if (game.pendingLoopDecision || game.pendingLoopReady) break;
        }
        simGame = game;
    } finally {
        Date.now = originalDateNow;
        game = previousGame;
    }
    return { game: simGame, steps: stepCount, simulatedNow, metrics };
}

function shouldStopBackgroundReplay(state) {
    return !state || (Number(state.playerHp) || 0) <= 0 || !!state.pendingLoopDecision || !!state.pendingLoopReady;
}

function restoreBattlefieldBeforeBackgroundReplay() {
    if (typeof syncBattleTabLayout === 'function') syncBattleTabLayout(false);
    if (typeof scheduleStableResize === 'function') scheduleStableResize();
    else if (typeof resizeCanvas === 'function') resizeCanvas();
    if (typeof updateStaticUI === 'function') updateStaticUI();
    if (typeof renderBattlefield === 'function') renderBattlefield(true);
}

function waitBackgroundReplayFrame() {
    return new Promise(resolve => {
        let raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : fn => setTimeout(fn, 0);
        raf(() => setTimeout(resolve, 0));
    });
}

async function simulateBackgroundCombatChunked(options) {
    let elapsedMs = Math.max(0, Math.floor(Number(options && options.elapsedMs) || 0));
    let stepCount = Math.floor(elapsedMs / BACKGROUND_COMBAT_STEP_MS);
    let simGame = cloneBackgroundCombatState(options.snapshot);
    let stepFn = options.stepFn || runUiCoreLoop;
    let previousGame = game;
    let originalDateNow = Date.now;
    let simulatedNow = Math.max(0, Math.floor(Number(options && options.startNowMs) || originalDateNow()));
    let processed = 0;
    let metrics = createBackgroundCombatMetrics(simGame);
    try {
        Date.now = () => simulatedNow;
        game = simGame;
        while (processed < stepCount && !shouldStopBackgroundReplay(game)) {
            let chunkStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : originalDateNow();
            do {
                stepFn();
                simulatedNow += BACKGROUND_COMBAT_STEP_MS;
                processed++;
                updateBackgroundCombatMetrics(metrics, game);
            } while (processed < stepCount && !shouldStopBackgroundReplay(game) && (((typeof performance !== 'undefined' && performance.now) ? performance.now() : originalDateNow()) - chunkStart) < BACKGROUND_COMBAT_CHUNK_BUDGET_MS);
            if (typeof options.onProgress === 'function') options.onProgress(processed * BACKGROUND_COMBAT_STEP_MS, elapsedMs);
            if (processed < stepCount && !shouldStopBackgroundReplay(game)) await waitBackgroundReplayFrame();
        }
        simGame = game;
    } finally {
        Date.now = originalDateNow;
        game = previousGame;
    }
    return { game: simGame, steps: processed, simulatedNow, stopped: processed < stepCount, metrics };
}

function handleBackgroundCombatReturn(nowMs) {
    if (backgroundCombatRuntime.processing) return false;
    let snapshot = backgroundCombatRuntime.snapshot;
    let signature = backgroundCombatRuntime.signature;
    let startedAtMs = Number(backgroundCombatRuntime.hiddenAtMs || 0);
    let actualElapsedMs = consumeBackgroundElapsedTime(nowMs);
    backgroundCombatRuntime.snapshot = null;
    backgroundCombatRuntime.signature = '';
    let effectiveProgressMs = calculateBackgroundProgressMs(actualElapsedMs, BACKGROUND_PROGRESS_MIN_REAL_MS, BACKGROUND_PROGRESS_RATE, BACKGROUND_PROGRESS_MAX_SIMULATED_MS);
    if (!snapshot || effectiveProgressMs <= 0) return false;
    backgroundCombatRuntime.processing = true;
    try {
        let result = simulateBackgroundCombat({ elapsedMs: effectiveProgressMs, snapshot, startNowMs: startedAtMs });
        if (!shouldApplyBackgroundCombatResult(signature)) return false;
        let summary = getBackgroundRewardSummary(snapshot, result.game, result.metrics);
        game = mergeDefaults(result.game || game);
        showBackgroundCombatResult({ actualElapsedMs, effectiveProgressMs, summary, capped: effectiveProgressMs >= BACKGROUND_PROGRESS_MAX_SIMULATED_MS });
        updateStaticUI();
        return true;
    } finally {
        backgroundCombatRuntime.processing = false;
    }
}

async function startBackgroundCombatReturn(nowMs) {
    if (backgroundCombatRuntime.processing) return false;
    let snapshot = backgroundCombatRuntime.snapshot;
    let signature = backgroundCombatRuntime.signature;
    let startedAtMs = Number(backgroundCombatRuntime.hiddenAtMs || 0);
    let actualElapsedMs = consumeBackgroundElapsedTime(nowMs);
    backgroundCombatRuntime.snapshot = null;
    backgroundCombatRuntime.signature = '';
    let effectiveProgressMs = calculateBackgroundProgressMs(actualElapsedMs, BACKGROUND_PROGRESS_MIN_REAL_MS, BACKGROUND_PROGRESS_RATE, BACKGROUND_PROGRESS_MAX_SIMULATED_MS);
    if (!snapshot || effectiveProgressMs <= 0) {
        if (actualElapsedMs > 0) restoreBattlefieldBeforeBackgroundReplay();
        return false;
    }
    backgroundCombatRuntime.processing = true;
    restoreBattlefieldBeforeBackgroundReplay();
    updateBackgroundProgressOverlay(0, effectiveProgressMs, actualElapsedMs);
    await waitBackgroundReplayFrame();
    try {
        let result = await simulateBackgroundCombatChunked({
            elapsedMs: effectiveProgressMs,
            snapshot,
            startNowMs: startedAtMs,
            onProgress: (done, total) => updateBackgroundProgressOverlay(done, total, actualElapsedMs)
        });
        if (!shouldApplyBackgroundCombatResult(signature)) return false;
        let summary = getBackgroundRewardSummary(snapshot, result.game, result.metrics);
        game = mergeDefaults(result.game || game);
        showBackgroundCombatResult({ actualElapsedMs, effectiveProgressMs, summary, capped: effectiveProgressMs >= BACKGROUND_PROGRESS_MAX_SIMULATED_MS });
        updateStaticUI();
        restoreBattlefieldBeforeBackgroundReplay();
        return true;
    } finally {
        backgroundCombatRuntime.processing = false;
        hideBackgroundProgressOverlay();
    }
}

function handleBackgroundVisibilityChange() {
    if (typeof document === 'undefined') return;
    if (document.hidden) recordBackgroundCombatEntry(Date.now());
    else startBackgroundCombatReturn(Date.now());
}

function syncLoop10PanelCopies() {
    let panels = Array.from(document.querySelectorAll('[data-loop10-panel]'));
    if (panels.length <= 1) return;
    let source = panels[0];
    panels.slice(1).forEach(panel => {
        panel.style.display = source.style.display;
        panel.innerHTML = source.innerHTML;
    });
}

function getUiConditionGemStatDelta(name, type) {
    let provider = getUiGlobalFunction('getConditionGemStatDelta');
    return provider ? (callUiProvider('getConditionGemStatDelta', provider, [name, type]) || {}) : {};
}

function getUiGemPresentation(name, isSupport) {
    let provider = getUiGlobalFunction('getGemPresentation');
    if (provider) return callUiProvider('getGemPresentation', provider, [name, isSupport]) || {};
    let db = isSupport ? (SUPPORT_GEM_DB[name] || {}) : (SKILL_DB[name] || {});
    let store = isSupport ? (game.supportGemData || {}) : (game.gemData || {});
    let level = Math.max(1, Math.floor(((store[name] || {}).level) || 1));
    if (isSupport) {
        return { baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || '', statName: db.name || name, statId: db.stat || null, activeTier: 1 };
    }
    return { baseLevel: db.isGem || db.levelable ? level : 0, totalLevel: db.isGem || db.levelable ? level : 0, finalLevel: db.isGem || db.levelable ? level : 0, desc: db.desc || '', statName: name, skill: db, tags: getSkillTagList(db) };
}

function startBattleAssetLoadNow() {
    window.__battleAssetAutoloadEnabled = true;
    if (battleAssetDeferredInitHandle) {
        clearTimeout(battleAssetDeferredInitHandle);
        battleAssetDeferredInitHandle = null;
    }
    return initBattleAssets();
}

function scheduleDeferredBattleAssetLoad() {
    if (battleAssets.ready || battleAssets.loading || battleAssets.failed) return;
    if (battleAssetDeferredInitHandle) return;
    battleAssetDeferredInitHandle = setTimeout(() => {
        battleAssetDeferredInitHandle = null;
        startBattleAssetLoadNow();
    }, 1800);
}


async function ensureBattleAssetsLoadedBeforeEntry() {
    if (battleAssets.ready) return true;
    advanceLoadingOverlay({
        title: '전장 에셋을 불러오는 중...',
        detail: '첫 전투에 필요한 이미지 에셋을 모두 확인하고 있습니다.',
        caption: 'Loading Battle Assets',
        progress: 56
    });
    let result = false;
    try {
        result = await startBattleAssetLoadNow();
    } catch (error) {
        console.warn('battle asset preload failed:', error);
    }
    if (battleAssets.failed && !battleAssets.ready) {
        advanceLoadingOverlay({
            detail: '일부 에셋 확인에 실패했습니다. 기본 렌더링으로 계속 준비합니다.',
            caption: 'Asset Fallback',
            progress: 92
        });
    } else {
        advanceLoadingOverlay({
            detail: '전장 에셋 로딩이 완료되었습니다.',
            caption: 'Assets Ready',
            progress: 92
        });
    }
    return result;
}

function ensureMobileBattlePip() {
    let host = document.getElementById('mobile-battle-pip');
    if (!host) {
        host = document.createElement('div');
        host.id = 'mobile-battle-pip';
        host.style.cssText = 'position:fixed; right:10px; bottom:94px; width:148px; height:84px; border:1px solid #4c6b93; border-radius:10px; overflow:hidden; background:#0a1320; z-index:9997; display:none; box-shadow:0 8px 20px rgba(0,0,0,.35);';
        host.style.touchAction = 'none';
        host.addEventListener('pointerdown', (e) => {
            mobilePipDrag.active = true;
            mobilePipDrag.moved = false;
            mobilePipDrag.startX = e.clientX;
            mobilePipDrag.startY = e.clientY;
            mobilePipDrag.baseRight = parseFloat(host.dataset.right || '10') || 10;
            mobilePipDrag.baseBottom = parseFloat(host.dataset.bottom || '94') || 94;
            host.setPointerCapture && host.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        host.addEventListener('pointermove', (e) => {
            if (!mobilePipDrag.active) return;
            let dx = e.clientX - mobilePipDrag.startX;
            let dy = e.clientY - mobilePipDrag.startY;
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) mobilePipDrag.moved = true;
            let right = Math.max(6, mobilePipDrag.baseRight - dx);
            let bottom = Math.max(72, mobilePipDrag.baseBottom - dy);
            host.dataset.right = String(right);
            host.dataset.bottom = String(bottom);
            host.style.right = right + 'px';
            host.style.bottom = bottom + 'px';
            e.preventDefault();
        });
        host.addEventListener('pointerup', (e) => {
            let wasMoved = mobilePipDrag.moved;
            mobilePipDrag.active = false;
            host.releasePointerCapture && host.releasePointerCapture(e.pointerId);
            if (wasMoved) return;
            let now = Date.now();
            if (now - mobilePipDrag.lastTapAt < 320) {
                mobilePipDrag.lastTapAt = 0;
                switchTab('tab-battle');
            } else {
                mobilePipDrag.lastTapAt = now;
            }
        });
        let c = document.createElement('canvas');
        c.width = 296; c.height = 168;
        c.style.cssText = 'width:100%; height:100%; display:block;';
        host.appendChild(c);
        document.body.appendChild(host);
    }
    if (!mobilePipCanvas) {
        mobilePipCanvas = host.querySelector('canvas');
        mobilePipCtx = mobilePipCanvas ? mobilePipCanvas.getContext('2d') : null;
    }
    return host;
}

function updateMobileBattlePipVisibility() {
    let host = ensureMobileBattlePip();
    if (!host) return;
    let isMobile = (window.matchMedia && window.matchMedia('(max-width: 1080px)').matches) || ('ontouchstart' in window);
    let activeBattle = (document.getElementById('tab-battle') || {}).classList.contains('active');
    let blocked = isStartupOverlayOpen() || isLoadingOverlayOpen();
    host.style.display = (isMobile && !activeBattle && !blocked && game.settings && game.settings.showMobileBattlePip !== false) ? 'block' : 'none';
    host.style.right = (host.dataset.right || '10') + 'px';
    host.style.bottom = (host.dataset.bottom || '94') + 'px';
    if (host.style.display !== 'none') {
        let src = document.getElementById('battlefield-canvas');
        if (src && !activeBattle && mobilePipCanvas) {
            // 캔버스 width/height에 값을 대입하면 (같은 값이어도) 드로잉 버퍼가
            // 투명 검정으로 초기화된다. 이 함수는 메인 게임 루프와 PiP 갱신 루프
            // 양쪽에서 매 프레임 호출되므로, 매번 초기화하면 다른 루프가 그려 둔
            // 프레임이 지워져 모바일 PiP가 검게 깜빡인다. 크기가 실제로 달라질
            // 때만 재설정한다.
            if (src.width !== mobilePipCanvas.width) src.width = mobilePipCanvas.width;
            if (src.height !== mobilePipCanvas.height) src.height = mobilePipCanvas.height;
            if (src.dataset.renderScale !== '1') src.dataset.renderScale = '1';
        } else if (src && (src.width < 32 || src.height < 32)) {
            src.width = 960;
            src.height = 540;
        }
    }
}

function isMobileBattlePipVisible() {
    let host = document.getElementById('mobile-battle-pip');
    return !!(host && host.style.display !== 'none');
}

function renderMobileBattlePipFrame() {
    if (!mobilePipCtx || !mobilePipCanvas) return;
    let host = document.getElementById('mobile-battle-pip');
    if (!host || host.style.display === 'none') return;
    let src = document.getElementById('battlefield-canvas');
    if (!src) return;
    if (src.width < 32 || src.height < 32) { src.width = mobilePipCanvas.width; src.height = mobilePipCanvas.height; }
    mobilePipCtx.clearRect(0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
    mobilePipCtx.drawImage(src, 0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
}


// PiP는 다른 탭을 보고 있을 때 전장을 작게 미리 보여준다. 풀 전장 렌더는
// 비싸므로, 고정 주기 대신 렌더 비용에 따라 다음 주기를 조절(adaptive)해
// 전경 탭의 프레임 예산을 빼앗지 않도록 한다.
const MOBILE_PIP_BASE_INTERVAL_MS = 150;
function runMobilePipRefreshTick() {
    let nextDelay = MOBILE_PIP_BASE_INTERVAL_MS;
    try {
        if (document.hidden) {
            nextDelay = 500;
        } else {
            updateMobileBattlePipVisibility();
            if (isMobileBattlePipVisible()) {
                let t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
                renderBattlefield(true);
                renderMobileBattlePipFrame();
                let cost = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
                // 렌더가 무거우면(기기가 버거우면) 다음 주기를 늘려 전경 탭 끊김을 줄인다.
                if (cost > 16) nextDelay = Math.min(420, Math.round(MOBILE_PIP_BASE_INTERVAL_MS + cost * 8));
                else if (cost > 9) nextDelay = MOBILE_PIP_BASE_INTERVAL_MS + 70;
            } else {
                // PiP가 보이지 않으면 노출 전환만 감지하면 되므로 느리게 폴링한다.
                nextDelay = 420;
            }
            mobilePipRefreshErrorReported = false;
        }
    } catch (error) {
        if (!mobilePipRefreshErrorReported) console.error('mobile battle PIP refresh failed:', error);
        mobilePipRefreshErrorReported = true;
    }
    mobilePipRefreshHandle = setTimeout(runMobilePipRefreshTick, nextDelay);
}

function startMobilePipRefreshLoop() {
    if (mobilePipRefreshHandle) clearTimeout(mobilePipRefreshHandle);
    mobilePipRefreshHandle = setTimeout(runMobilePipRefreshTick, MOBILE_PIP_BASE_INTERVAL_MS);
}


function isOverlayElementOpen(selector) {
    let el = document.querySelector(selector);
    if (!el) return false;
    if (el.classList && el.classList.contains('active')) return true;
    let style = (typeof window !== 'undefined' && typeof window.getComputedStyle === 'function') ? window.getComputedStyle(el) : null;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0);
}

function isPauseSettingOverlayOpen() {
    let modalSelectors = [
        '.tutorial-overlay.active:not(#tutorial-overlay)',
        '#condition-gem-overlay',
        '#beehive-choice-overlay',
        '#spore-mode-overlay',
        '#mobile-craft-currency-overlay',
        '#craft-item-picker-overlay',
        '#void-jewel-overlay',
        '#jewel-fusion-overlay',
        '#void-socket-jewel-overlay'
    ];
    return modalSelectors.some(selector => isOverlayElementOpen(selector));
}

function tickShrineState(){
    game.shrineState = game.shrineState || { active: null, nextRollAt: 0 };
    let now = Date.now();
    if (game.shrineBuff && now > (game.shrineBuff.expiresAt || 0)) game.shrineBuff = null;
    if (game.shrineState.active && now > (game.shrineState.active.expiresAt || 0)) game.shrineState.active = null;
    if (!game.shrineState.active && now >= (game.shrineState.nextRollAt || 0) && Math.random() < 0.01) {
        game.shrineState.active = { name: rndChoice(['힘의 성소','수호의 성소','질주의 성소']), expiresAt: now + 30000 };
        game.shrineState.nextRollAt = now + 240000;
    }
}
function clickActiveShrine(){
    let active = game.shrineState && game.shrineState.active; if (!active) return;
    let stat = active.name.includes('힘') ? 'pctDmg' : active.name.includes('수호') ? 'dr' : 'aspd';
    let value = active.name.includes('수호') ? 10 : 16;
    game.shrineBuff = { name: active.name, stat: stat, value: value, expiresAt: Date.now() + 45000 };
    game.shrineState.active = null;
    addLog(`🛕 ${active.name} 축복 활성화!`, 'loot-rare');
    updateStaticUI();
}

function renderTabOrderSettings() {
    let tabOrderEl = document.getElementById('ui-tab-order-settings');
    if (!tabOrderEl) return;
    if (!(document.getElementById('tab-settings') || {}).classList.contains('active')) return;
    let tabs = Array.from(document.querySelectorAll('.tab-header .tab-btn'));
    let groupRows = getOrderedTabGroups().map(group => `<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>${group.label}</span><span style="display:flex;gap:4px;"><button onclick="moveTabGroup('${group.key}',-1)">▲</button><button onclick="moveTabGroup('${group.key}',1)">▼</button></span></div>`).join('');
    let tabRows = tabs.map(el => {
        let place = (game.settings.tabPlacement[el.id] === 'bottom') ? 'bottom' : 'top';
        return `<div style="display:flex;justify-content:space-between;gap:6px;align-items:center;"><span>${el.innerText.replace(/\s*●?\s*$/,'')}</span><span style="display:flex;gap:4px;"><button onclick="moveTabButton('${el.id}',-1)">▲</button><button onclick="moveTabButton('${el.id}',1)">▼</button><button onclick="setTabPlacement('${el.id}','top')" ${place === 'top' ? 'disabled' : ''}>상단</button><button onclick="setTabPlacement('${el.id}','bottom')" ${place === 'bottom' ? 'disabled' : ''}>하단</button></span></div>`;
    }).join('');
    tabOrderEl.innerHTML = `<div style="font-weight:800;color:#f1c40f;margin-bottom:2px;">상위 그룹 탭</div>${groupRows}<div style="font-weight:800;color:#f1c40f;margin:8px 0 2px;">일반 탭</div>${tabRows}`;
}
const TAB_DRAG_LONG_PRESS_MS = 180;
const TAB_DRAG_CANCEL_PX = 8;
let tabHeaderDragState = null;
let tabHeaderSuppressClickUntil = 0;
let lastTabHeaderUiSignature = '';
let lastActiveTabId = null;
const TAB_HEADER_NOTI_KEYS = ['char', 'season', 'items', 'skills', 'flask', 'codex', 'talisman', 'cube', 'map', 'traits', 'expertise', 'jewel', 'journal', 'currency', 'fossil', 'ascend', 'loop', 'social'];
const TAB_UNLOCK_BUTTON_KEYS = ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'cube', 'map', 'traits', 'expertise'];

// 탭 2단 그룹핑: 상단 카테고리 바에서 그룹을 고르면 해당 그룹의 탭만 보인다.
// 넓은 화면(데스크톱)에서만 활성화되고, 좁은 화면에서는 기존 방식(전체 탭 + 스와이프)을 유지한다.
const TAB_GROUP_FIXED_TAB_IDS = ['tab-social', 'tab-settings'];
const TAB_GROUPS = [
    { key: 'character', label: '캐릭터', icon: '👤', tabs: ['tab-character'] },
    { key: 'growth', label: '성장', icon: '📈', tabs: ['tab-char', 'tab-traits', 'tab-talent', 'tab-expertise', 'tab-season', 'tab-skills'] },
    { key: 'content', label: '콘텐츠', icon: '🗺️', tabs: ['tab-map', 'tab-codex', 'tab-journal'] },
    { key: 'gear', label: '장비', icon: '⚔️', tabs: ['tab-items', 'tab-jewel', 'tab-flask', 'tab-talisman', 'tab-cube'] },
    { key: 'etc', label: '기타', icon: '⚙️', tabs: ['tab-social', 'tab-settings', 'tab-battle'] }
];
function getOrderedTabGroups() {
    game.settings = game.settings || {};
    let order = Array.isArray(game.settings.tabGroupOrder) ? game.settings.tabGroupOrder : [];
    let byKey = {};
    TAB_GROUPS.forEach(group => { byKey[group.key] = group; });
    return order.concat(TAB_GROUPS.map(group => group.key))
        .filter((key, idx, arr) => byKey[key] && arr.indexOf(key) === idx)
        .map(key => byKey[key]);
}
function moveTabGroup(groupKey, dir) {
    let groups = getOrderedTabGroups();
    let idx = groups.findIndex(group => group.key === groupKey);
    if (idx < 0) return;
    let nextIdx = Math.max(0, Math.min(groups.length - 1, idx + dir));
    if (nextIdx === idx) return;
    let moved = groups.slice();
    let tmp = moved[idx];
    moved[idx] = moved[nextIdx];
    moved[nextIdx] = tmp;
    game.settings = game.settings || {};
    game.settings.tabGroupOrder = moved.map(group => group.key);
    lastTabHeaderUiSignature = null;
    renderTabCategoryBar();
    renderTabOrderSettings();
    queueImportantSave(300);
}
function moveTabGroupBefore(sourceKey, targetKey) {
    if (!sourceKey || !targetKey || sourceKey === targetKey) return;
    let groups = getOrderedTabGroups();
    let sourceIdx = groups.findIndex(group => group.key === sourceKey);
    let targetIdx = groups.findIndex(group => group.key === targetKey);
    if (sourceIdx < 0 || targetIdx < 0) return;
    let moved = groups.slice();
    let source = moved.splice(sourceIdx, 1)[0];
    let insertIdx = moved.findIndex(group => group.key === targetKey);
    moved.splice(Math.max(0, insertIdx), 0, source);
    game.settings = game.settings || {};
    game.settings.tabGroupOrder = moved.map(group => group.key);
    lastTabHeaderUiSignature = null;
    renderTabCategoryBar();
    renderTabOrderSettings();
    queueImportantSave(300);
}
function onTabGroupDragStart(event, groupKey) {
    if (!event || !event.dataTransfer) return;
    event.dataTransfer.setData('text/plain', groupKey);
    event.dataTransfer.effectAllowed = 'move';
}
function onTabGroupDrop(event, targetKey) {
    if (!event || !event.dataTransfer) return;
    event.preventDefault();
    moveTabGroupBefore(event.dataTransfer.getData('text/plain'), targetKey);
}
function isFixedTabGroupButton() {
    return false;
}
function getTabGroupForId(tabId) {
    // 버튼 id('btn-tab-x')와 탭 id('tab-x')를 모두 허용한다.
    let id = String(tabId || '').replace(/^btn-/, '');
    let g = TAB_GROUPS.find(group => group.tabs.includes(id));
    return g ? g.key : 'etc';
}
function isTabGroupingActive() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    // 데스크톱 창형 UI에서는 좌측 레일이 모든 창 실행 버튼을 보여야 하므로
    // 2단 그룹핑(활성 그룹 외 버튼 숨김)을 적용하지 않는다.
    if (typeof document !== 'undefined' && document.body && document.body.classList.contains('desktop-windowed-ui')) return false;
    return window.matchMedia('(min-width: 1081px)').matches;
}
function getActiveTabGroup() {
    game.settings = game.settings || {};
    let cur = game.settings.activeTabGroup;
    if (!TAB_GROUPS.some(g => g.key === cur)) cur = 'character';
    return cur;
}
function selectTabGroup(groupKey) {
    if (!TAB_GROUPS.some(g => g.key === groupKey)) return;
    game.settings = game.settings || {};
    game.settings.activeTabGroup = groupKey;
    // 현재 활성 탭이 이 그룹에 없으면 그룹의 첫 번째 사용 가능한 탭으로 이동.
    let activeInGroup = lastActiveTabId && getTabGroupForId(lastActiveTabId) === groupKey;
    applyTabGroupFilter();
    if (!activeInGroup) {
        let group = getOrderedTabGroups().find(g => g.key === groupKey);
        let firstVisible = group.tabs.find(id => {
            let btn = document.getElementById('btn-' + id);
            return btn && btn.style.display !== 'none' && !btn.dataset.groupHidden;
        });
        if (firstVisible) switchTab(firstVisible);
    }
    renderTabCategoryBar();
}
// 해금 판정 + 그룹 필터를 한 번에 적용한다(권위 지점은 updateTabUnlockButtons).
function applyTabGroupFilter() {
    updateTabUnlockButtons();
}
function ensureTabCategoryBarPlacement(bar) {
    let header = document.querySelector('.tab-header');
    if (bar && header && header.parentElement && bar.nextElementSibling !== header) {
        header.parentElement.insertBefore(bar, header);
    }
}
function renderTabCategoryBar() {
    let bar = document.getElementById('tab-category-bar');
    if (!bar) return;
    ensureTabCategoryBarPlacement(bar);
    if (!isTabGroupingActive()) { bar.style.display = 'none'; return; }
    bar.style.display = 'inline-flex';
    let active = getActiveTabGroup();
    let unlocks = game.unlocks || {};
    bar.innerHTML = getOrderedTabGroups().map(group => {
        // 그룹 내 알림 점 집계. 잠긴(미해금) 탭은 열어서 알림을 끌 방법이 없으므로,
        // 저장 데이터에 남은 stale 알림이 그룹 점을 영구히 켜지 않도록 집계에서 제외한다.
        let hasNoti = group.key !== active && group.tabs.some(id => {
            let key = id.replace('tab-', '');
            let gate = (typeof TAB_UNLOCK_GATES !== 'undefined') ? TAB_UNLOCK_GATES[id] : null;
            if (gate && !(game.unlocks && game.unlocks[gate])) return false;
            return game.noti && game.noti[key] && isNotiEnabled(key);
        });
        return `<button class="tab-category-btn${group.key === active ? ' active' : ''}" draggable="true" ondragstart="onTabGroupDragStart(event,'${group.key}')" ondragover="event.preventDefault()" ondrop="onTabGroupDrop(event,'${group.key}')" onclick="selectTabGroup('${group.key}')">${group.label}${hasNoti ? ' <span class="noti-dot" style="display:inline-block; position:static; margin-left:2px;"></span>' : ''}</button>`;
    }).join('');
}

function getTabButtonFromTarget(target) {
    return target && target.closest ? target.closest('.tab-header .tab-btn') : null;
}

function getTabHeaders() {
    return Array.from(document.querySelectorAll('.tab-header'));
}

function getTabHeaderOrderSnapshot(headers) {
    return (headers || getTabHeaders()).flatMap(header => Array.from(header.querySelectorAll('.tab-btn')).map(el => el.id).filter(Boolean));
}

function getTabHeaderUnderPoint(clientX, clientY) {
    let hit = document.elementFromPoint ? document.elementFromPoint(clientX, clientY) : null;
    let hitHeader = hit && hit.closest ? hit.closest('.tab-header') : null;
    if (hitHeader) return hitHeader;
    return getTabHeaders().find(header => {
        let rect = header.getBoundingClientRect();
        return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
    }) || null;
}

function updateTabDragGhost(state, clientX, clientY) {
    if (!state || !state.ghost) return;
    let offsetX = Number.isFinite(state.grabOffsetX) ? state.grabOffsetX : 0;
    let offsetY = Number.isFinite(state.grabOffsetY) ? state.grabOffsetY : 0;
    state.ghost.style.left = `${clientX - offsetX}px`;
    state.ghost.style.top = `${clientY - offsetY}px`;
}

function beginTabHeaderDrag(state) {
    if (!state || state.dragging) return;
    state.dragging = true;
    let rect = state.button.getBoundingClientRect();
    state.grabOffsetX = clampNumber(state.lastX - rect.left, 0, rect.width);
    state.grabOffsetY = clampNumber(state.lastY - rect.top, 0, rect.height);
    state.ghost = document.createElement('div');
    state.ghost.className = 'tab-drag-ghost';
    state.ghost.setAttribute('aria-hidden', 'true');
    state.ghost.innerHTML = state.button.innerHTML;
    state.ghost.style.width = `${Math.max(1, rect.width)}px`;
    state.ghost.style.height = `${Math.max(1, rect.height)}px`;
    document.body.appendChild(state.ghost);
    updateTabDragGhost(state, state.lastX, state.lastY);
    state.button.classList.add('dragging');
    document.body.classList.add('tab-drag-active');
}

function moveDraggedTabToPoint(state, clientX, clientY) {
    let header = getTabHeaderUnderPoint(clientX, clientY) || state.button.parentElement;
    if (!header) return;
    if (state.button.parentElement !== header) header.appendChild(state.button);
    let siblings = Array.from(header.querySelectorAll('.tab-btn')).filter(el => el !== state.button);
    let before = siblings.find(el => {
        let rect = el.getBoundingClientRect();
        return clientX < rect.left + rect.width / 2;
    });
    header.insertBefore(state.button, before || null);
}

function commitTabHeaderDragOrder() {
    let headers = getTabHeaders();
    game.settings = game.settings || {};
    game.settings.tabPlacement = game.settings.tabPlacement || {};
    headers.forEach(header => {
        let placement = header.id === 'tab-header-bottom' ? 'bottom' : 'top';
        Array.from(header.querySelectorAll('.tab-btn')).forEach(btn => { game.settings.tabPlacement[btn.id] = placement; });
    });
    game.settings.tabOrder = getTabHeaderOrderSnapshot(headers);
}

function activateTabButtonFromDrag(button) {
    if (!button || !button.id || typeof switchTab !== 'function') return;
    if (!button.id.startsWith('btn-tab-')) return;
    switchTab(button.id.replace(/^btn-/, ''));
}

function clearTabHeaderDragState(saveOrder) {
    let state = tabHeaderDragState;
    tabHeaderDragState = null;
    if (!state) return;
    clearTimeout(state.longPressTimer);
    if (state.ghost) state.ghost.remove();
    state.button.classList.remove('dragging');
    document.body.classList.remove('tab-drag-active');
    if (saveOrder && state.dragging) {
        commitTabHeaderDragOrder();
        tabHeaderSuppressClickUntil = Date.now() + 450;
        applyTabHeaderOrder(true);
        queueImportantSave(300);
        activateTabButtonFromDrag(state.button);
    }
}

function onTabHeaderPointerDown(event) {
    if (tabHeaderDragState) return;
    let button = getTabButtonFromTarget(event.target);
    if (!button || (event.pointerType === 'mouse' && event.button !== 0)) return;
    let header = button.closest ? button.closest('.tab-header') : null;
    tabHeaderDragState = {
        button,
        header,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        startScrollLeft: header ? header.scrollLeft : 0,
        grabOffsetX: 0,
        grabOffsetY: 0,
        ghost: null,
        dragging: false,
        scrolling: false,
        longPressTimer: setTimeout(() => beginTabHeaderDrag(tabHeaderDragState), TAB_DRAG_LONG_PRESS_MS)
    };
    if (button.setPointerCapture) button.setPointerCapture(event.pointerId);
}

function onTabHeaderPointerMove(event) {
    let state = tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
    let dx = Math.abs(event.clientX - state.startX);
    let dy = Math.abs(event.clientY - state.startY);
    // 가로 스와이프로 탭 헤더를 좌우 스크롤한다(모바일). touch-action:pan-y 때문에
    // 브라우저가 가로 스크롤을 처리하지 않으므로 scrollLeft을 직접 갱신한다.
    if (state.scrolling) {
        if (state.header) state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
        event.preventDefault();
        return;
    }
    // While waiting for the long-press, a clear vertical swipe means the user is
    // scrolling the page (touch-action: pan-y) — let it through by cancelling the drag.
    if (!state.dragging && state.pointerType === 'touch' && dy > dx && dy > TAB_DRAG_CANCEL_PX) {
        clearTabHeaderDragState(false);
        return;
    }
    // 아직 재정렬 드래그 전에 가로 이동이 우세하면 스크롤 모드로 전환한다.
    if (!state.dragging && state.pointerType === 'touch' && dx > dy && dx > TAB_DRAG_CANCEL_PX
        && state.header && state.header.scrollWidth > state.header.clientWidth + 1) {
        state.scrolling = true;
        clearTimeout(state.longPressTimer);
        state.header.scrollLeft = state.startScrollLeft - (event.clientX - state.startX);
        event.preventDefault();
        return;
    }
    let cancelPx = state.pointerType === 'touch' ? 16 : TAB_DRAG_CANCEL_PX;
    if (!state.dragging && (dx + dy) > cancelPx) {
        clearTabHeaderDragState(false);
        return;
    }
    if (!state.dragging) return;
    event.preventDefault();
    updateTabDragGhost(state, event.clientX, event.clientY);
    moveDraggedTabToPoint(state, event.clientX, event.clientY);
}

function onTabHeaderPointerEnd(event) {
    let state = tabHeaderDragState;
    if (!state || event.pointerId !== state.pointerId) return;
    if (state.scrolling) {
        // 스와이프 스크롤 직후의 탭 전환(클릭)을 막는다.
        if (Math.abs(state.lastX - state.startX) > 6) tabHeaderSuppressClickUntil = Date.now() + 350;
        clearTabHeaderDragState(false);
        return;
    }
    clearTabHeaderDragState(true);
}

function onTabHeaderClickCapture(event) {
    if (Date.now() <= tabHeaderSuppressClickUntil && getTabButtonFromTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
    }
}

function installTabHeaderDragReorder() {
    if (window.__tabHeaderDragReorderBound) return;
    window.__tabHeaderDragReorderBound = true;
    document.addEventListener('pointerdown', onTabHeaderPointerDown, true);
    document.addEventListener('pointermove', onTabHeaderPointerMove, { capture: true, passive: false });
    document.addEventListener('pointerup', onTabHeaderPointerEnd, true);
    document.addEventListener('pointercancel', event => clearTabHeaderDragState(false), true);
    document.addEventListener('click', onTabHeaderClickCapture, true);
}

function applyTabHeaderOrder(shouldRenderSettings){
    game.settings=game.settings||{};
    game.settings.tabPlacement = game.settings.tabPlacement || {};
    // 데스크톱 창형 레일의 버튼 배치(고정 탭 + 더보기 메뉴)는 창 관리자가 소유한다.
    // 여기서 버튼을 다시 헤더 루트로 옮기면 더보기 메뉴가 비워져 레일이 깨진다.
    if (document.body.classList.contains('desktop-windowed-ui')) {
        if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
        return;
    }
    installTabHeaderDragReorder();
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    let topHeader = headers[0];
    if(!topHeader) return;
    let bottomHeader = document.getElementById('tab-header-bottom');
    if (game.settings.twoRowTabs && !game.settings.tabPlacementInitialized && window.matchMedia('(max-width: 1080px)').matches) {
        game.settings.tabPlacementInitialized = true;
        let autoIds = Array.from(topHeader.querySelectorAll('.tab-btn')).map(el => el.id);
        autoIds.forEach((id, idx) => { game.settings.tabPlacement[id] = idx === 0 ? 'top' : 'bottom'; });
    }
    let allTabButtons = headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')));
    let ids=allTabButtons.map(el=>el.id);
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder:ids;
    let map={}; allTabButtons.forEach(el=>map[el.id]=el);
    order.forEach(id=>{
        if(!map[id]) return;
        let target = (game.settings.twoRowTabs && game.settings.tabPlacement[id] === 'bottom' && bottomHeader) ? bottomHeader : topHeader;
        target.appendChild(map[id]);
    });
    ids.forEach(id=>{ if(!order.includes(id) && map[id]) topHeader.appendChild(map[id]); });
    if (bottomHeader) {
        let hasBottomTabs = bottomHeader.children.length > 0;
        bottomHeader.style.display = hasBottomTabs ? 'flex' : 'none';
        document.body.classList.toggle('has-bottom-tabs', hasBottomTabs);
        updateBottomTabSpacing();
    }
    if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
}
// Reserve scroll space at the bottom of the page so the fixed bottom tab bar
// does not overlap (and block taps on) the last buttons in the content.
function updateBottomTabSpacing(){
    let bottomHeader = document.getElementById('tab-header-bottom');
    let visible = bottomHeader && document.body.classList.contains('has-bottom-tabs') &&
        window.getComputedStyle(bottomHeader).display !== 'none';
    let height = visible ? Math.ceil(bottomHeader.getBoundingClientRect().height) : 0;
    document.body.style.setProperty('--bottom-tab-height', height + 'px');
}
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => { updateBottomTabSpacing(); lastTabHeaderUiSignature = null; refreshTabHeaderUiIfNeeded(); });
    window.addEventListener('orientationchange', () => { updateBottomTabSpacing(); lastTabHeaderUiSignature = null; refreshTabHeaderUiIfNeeded(); });
}
function setTabPlacement(tabId, placement){
    game.settings = game.settings || {};
    game.settings.tabPlacement = game.settings.tabPlacement || {};
    game.settings.tabPlacement[tabId] = placement === 'bottom' ? 'bottom' : 'top';
    applyTabHeaderOrder(true);
}
function moveTabButton(tabId, dir){
    game.settings=game.settings||{};
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    if (!headers.length) return;
    let ids=headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')).map(el=>el.id));
    let order=Array.isArray(game.settings.tabOrder)?game.settings.tabOrder.slice():ids.slice();
    if(order.length!==ids.length) order=ids.slice();
    let idx=order.indexOf(tabId); if(idx<0) return;
    let ni=Math.max(0, Math.min(order.length-1, idx+dir)); if(ni===idx) return;
    let t=order[idx]; order[idx]=order[ni]; order[ni]=t; game.settings.tabOrder=order;
    applyTabHeaderOrder(true);
}

function getTabHeaderUiSignature() {
    let unlocks = game.unlocks || {};
    let noti = game.noti || {};
    let filters = (game.settings && game.settings.notiFilters) || {};
    let mobileBattle = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches ? 'mobileBattle' : 'desktopBattle';
    return [
        mobileBattle,
        (game.settings && game.settings.tabNotiEnabled === false) ? 'notiOff' : 'notiOn',
        TAB_HEADER_NOTI_KEYS.map(key => `${key}:${unlocks[key] ? 1 : 0}:${noti[key] && filters[key] !== false ? 1 : 0}`).join('|'),
        Array.isArray(game.settings && game.settings.tabOrder) ? game.settings.tabOrder.join(',') : '',
        JSON.stringify((game.settings && game.settings.tabPlacement) || {}),
        Array.isArray(game.settings && game.settings.tabGroupOrder) ? game.settings.tabGroupOrder.join(',') : '',
        isTabGroupingActive() ? ('grp:' + getActiveTabGroup()) : 'nogrp'
    ].join('::');
}

function updateTabNotificationDots() {
    // 데스크톱 창형 모드에서 커뮤니티는 탭 전환 없이 도킹 패널로 열리므로,
    // 패널이 열려 있는 동안은 채팅을 읽고 있는 것으로 간주해 알림을 꺼 둔다.
    if (document.body.classList.contains('community-dock-open')) game.noti.social = false;
    TAB_HEADER_NOTI_KEYS.forEach(key => {
        // 이미 보고 있는 탭에서 계속 발생하는 이벤트(전투 중 드랍 등)가 알림을 되살리지 않도록,
        // 활성 탭에 해당하는 알림은 매 갱신마다 계속 꺼둔다.
        if (lastActiveTabId === 'tab-' + key) game.noti[key] = false;
        let el = document.getElementById('noti-' + key);
        if (el) el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none';
    });
    // 도킹 토글 버튼(💬)의 미읽음 점은 커뮤니티 탭 알림과 동일한 상태를 미러링한다.
    let dockDot = document.getElementById('noti-social-dock');
    if (dockDot) dockDot.style.display = (game.noti.social && isNotiEnabled('social')) ? 'block' : 'none';
}

function updateTabUnlockButtons() {
    TAB_UNLOCK_BUTTON_KEYS.forEach(key => {
        document.getElementById('btn-tab-' + key).style.display = game.unlocks[key] ? 'flex' : 'none';
    });
    let jewelTabBtn = document.getElementById('btn-tab-jewel');
    if (jewelTabBtn) jewelTabBtn.style.display = game.unlocks.jewel ? 'flex' : 'none';
    let cubeTabBtn = document.getElementById('btn-tab-cube');
    let cubeOpen = (game.unlocks && game.unlocks.cube) || (typeof isCoreCubeUnlocked === 'function' && isCoreCubeUnlocked());
    if (cubeTabBtn) cubeTabBtn.style.display = cubeOpen ? 'flex' : 'none';
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches ? 'flex' : 'none';
    // 2단 그룹핑이 활성이면 해금 판정 직후 활성 그룹 외 탭을 숨긴다(단일 권위 지점).
    hideOutOfGroupTabButtons();
    // 데스크톱 창형 레일은 그룹 섹션 단위로 표시되므로, 해금 변경 시 빈 그룹을 함께 숨긴다.
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
}

function isUngatedPersistentTabButton(btn) {
    return btn && (btn.id === 'btn-tab-social' || btn.id === 'btn-tab-settings' || btn.id === 'btn-tab-character' || btn.id === 'btn-tab-journal' || btn.id === 'btn-tab-flask');
}
// updateTabUnlockButtons 뒤에서 호출되는 그룹 가시성 적용부. 재진입 없이 display만 조정한다.
function hideOutOfGroupTabButtons() {
    let grouping = isTabGroupingActive();
    let active = getActiveTabGroup();
    Array.from(document.querySelectorAll('.tab-header .tab-btn')).forEach(btn => {
        if (!grouping) {
            delete btn.dataset.groupHidden;
            if (isUngatedPersistentTabButton(btn)) btn.style.display = 'flex';
            return;
        }
        if (getTabGroupForId(btn.id) !== active) {
            btn.dataset.groupHidden = '1';
            btn.style.display = 'none';
            return;
        }
        delete btn.dataset.groupHidden;
        if (isUngatedPersistentTabButton(btn)) btn.style.display = 'flex';
    });
}

function refreshTabHeaderUiIfNeeded() {
    let signature = getTabHeaderUiSignature();
    if (signature === lastTabHeaderUiSignature) return false;
    lastTabHeaderUiSignature = signature;
    applyTabHeaderOrder();
    updateTabNotificationDots();
    updateTabUnlockButtons();
    applyTabGroupFilter();
    renderTabCategoryBar();
    return true;
}

function isNotiEnabled(key){ game.settings=game.settings||{}; if (game.settings.tabNotiEnabled === false) return false; game.settings.notiFilters=game.settings.notiFilters||{}; return game.settings.notiFilters[key] !== false; }
function toggleNotiFilter(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; game.settings.notiFilters[key]=!(game.settings.notiFilters[key] !== false); updateStaticUI(); }

function switchTab(tabId) {
    hideInfoTooltip();
    hideItemTooltip();
    if (typeof window.hidePassiveNodeTooltip === 'function') window.hidePassiveNodeTooltip();
    syncDerivedTabUnlock(tabId);
    let gateKey = TAB_UNLOCK_GATES[tabId];
    if (gateKey && !game.unlocks[gateKey]) {
        addLog(getLockedTabMessage(tabId), 'attack-monster');
        return;
    }
    // 이미 활성인 탭을 다시 누르면 전체 UI 재구성(+ 캐릭터 탭의 패시브 트리 재드로우)을
    // 반복해 게임이 멈춘 것처럼 느껴진다. 같은 탭 재클릭은 무거운 재렌더를 생략한다.
    // (탭 내용 갱신은 게임 동작/주기 갱신이 별도로 처리한다.)
    if (tabId === 'tab-items' && game.noti) game.noti.items = false;
    let tabEl = document.getElementById(tabId);
    if (lastActiveTabId === tabId && tabEl && tabEl.classList.contains('active')) {
        updateTabNotificationDots();
        return;
    }
    document.querySelectorAll('.tab-content, .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    let activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.add('active');
    if (activeBtn && activeBtn.scrollIntoView && window.matchMedia('(max-width: 1080px)').matches) {
        try {
            activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        } catch (error) {
            activeBtn.scrollIntoView();
        }
    }
    // 2단 그룹핑: 이동한 탭이 속한 그룹을 활성화하고 카테고리 바를 갱신.
    if (isTabGroupingActive()) {
        game.settings = game.settings || {};
        let grp = getTabGroupForId(tabId);
        if (game.settings.activeTabGroup !== grp) { game.settings.activeTabGroup = grp; applyTabGroupFilter(); }
        renderTabCategoryBar();
    }
    if (tabId === 'tab-codex' && game.noti && game.noti.codex) game.codexFocusNewOnOpen = true;
    // 알림 키 전체(TAB_HEADER_NOTI_KEYS)를 대상으로 해제한다. 과거에 하드코딩 목록에서
    // 'jewel'이 빠져 있어 주얼 탭을 방문해도 알림이 꺼지지 않았고, 저장 데이터에 true로
    // 남아 장비 상위탭 그룹 점이 영구히 켜져 있는 문제가 있었다.
    TAB_HEADER_NOTI_KEYS.concat(['talent']).forEach(key => { if (tabId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-map') acknowledgeMapMainAlarm();
    // 도감 탭에서 다른 탭으로 벗어날 때, 신규 등록 강조를 해제(처음 열었을 때만 강조).
    if (lastActiveTabId === 'tab-codex' && tabId !== 'tab-codex') game.codexNewlyRegistered = {};
    lastActiveTabId = tabId;
    if (tabId === 'tab-social' && typeof renderSocialTab === 'function') renderSocialTab();
    else if (typeof stopChatPolling === 'function') stopChatPolling();
    if (tabId === 'tab-talent' && typeof renderTalentTab === 'function') renderTalentTab();
    if (tabId === 'tab-items') switchItemSubtab('item-tab-equip');
    updateMobileBattlePipVisibility();
    // 탭 전환 직후 PiP가 보이면 한 번 즉시 갱신해, 적응형 루프 다음 주기를
    // 기다리는 동안 직전 프레임이 잠깐 남아 보이는 것을 막는다.
    if (isMobileBattlePipVisible()) { renderBattlefield(true); renderMobileBattlePipFrame(); }
    updateStaticUI();
    if (tabId === 'tab-char') {
        setTimeout(function() {
            fitPassiveCameraToBounds(false);
            resizePassiveTreeCanvas(true);
            drawPassiveTree();
            resizeCanvas();
        }, 40);
    } else if (tabId === 'tab-battle') {
        startBattleAssetLoadNow();
        setTimeout(function () {
            syncBattleTabLayout(false);
            scheduleStableResize();
        }, 40);
    } else if (tabId === 'tab-settings') {
        renderTabOrderSettings();
    }
}

function craftSelectInventoryItemById(itemId) {
    let id = Number(itemId);
    if (!Number.isFinite(id) || !(game.inventory || []).some(item => item && item.id === id)) return;
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    if (typeof switchTab === 'function') switchTab('tab-items');
    // 데스크톱 창 모드의 switchTab은 이미 포커스된 탭을 다시 누르면 창을 닫는 토글이다.
    // 카드 안의 바로가기는 단방향 이동이어야 하므로 닫혔더라도 즉시 다시 열고 포커스한다.
    if (document.body.classList.contains('desktop-windowed-ui') && typeof openWindow === 'function') openWindow('tab-items');
    if (typeof switchItemSubtab === 'function') switchItemSubtab('item-tab-craft');
    if (typeof selectForCrafting === 'function') selectForCrafting(id, false);
    setTimeout(() => {
        let el = document.getElementById('forge-item-display');
        if (el && el.scrollIntoView) {
            try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
            catch (error) { el.scrollIntoView(); }
        }
    }, 60);
}

function switchItemSubtab(subtabId) {
    if (subtabId === 'item-tab-equip' && game.noti) game.noti.items = false;
    if (subtabId === game.itemSubtab) {
        let currentPanel = document.getElementById(subtabId);
        let currentBtn = document.getElementById('btn-' + subtabId);
        if (currentPanel && currentPanel.classList.contains('active') && currentBtn && currentBtn.classList.contains('active')) return;
    }
    if (subtabId === 'item-tab-market' && !isMarketUnlocked()) {
        addLog('액트 5를 먼저 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    if (subtabId === 'item-tab-infuser' && (typeof isChaosInfuserUnlocked !== 'function' || !isChaosInfuserUnlocked())) {
        addLog('나무꾼을 한 번 이상 마주치면 혼돈 주입기가 해금됩니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    game.itemSubtab = subtabId;
    document.querySelectorAll('#tab-items .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-items .subtab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(subtabId).classList.add('active');
    document.getElementById('btn-' + subtabId).classList.add('active');
}



function getDefaultSkillAutoRule() {
    return {
        id: `rule_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        enabled: true,
        priority: ((game.skillAutoRules || []).length + 1),
        hpThreshold: 40,
        triggerType: 'hp_below',
        skillName: ''
    };
}

function addSkillAutoRule() {
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];

    game.skillAutoRules.push(getDefaultSkillAutoRule());
    renderSkillAutoRulePanel();
}

function sortSkillAutoRules() {
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];

    game.skillAutoRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    game.skillAutoRules.forEach((rule, idx) => rule.priority = idx + 1);
    renderSkillAutoRulePanel();
}

function getAllConditionGemEntries() {
    let db = window.CONDITION_GEM_DB || {};
    return [].concat(db.curse || [], db.warcry || [], db.guard || [], db.utility || []);
}

function rollConditionGemChoices() {
    if (!game.conditionGemUnlocked) return addLog('컨디션 젬이 아직 잠겨 있습니다. 루프2 뿌리 보스를 먼저 쓰러뜨리세요.', 'attack-monster');
    if ((game.currencies.bossCore || 0) <= 0) return addLog('군주의 핵이 부족합니다.', 'attack-monster');
    let all = getAllConditionGemEntries();
    let ownedSet = new Set(Array.isArray(game.conditionGemPool) ? game.conditionGemPool : []);
    let unownedPool = all.filter(entry => !ownedSet.has(entry.name));
    let upgradablePool = all.filter(entry => ownedSet.has(entry.name) && Math.max(1, Math.floor(((game.conditionGemLevels || {})[entry.name] || 1))) < 5);
    let pool = unownedPool.length > 0 ? unownedPool.slice() : upgradablePool.slice();
    if (pool.length === 0) return addLog('해금/강화 가능한 컨디션 젬이 더 이상 없습니다.', 'attack-monster');
    game.currencies.bossCore--;
    let choices = [];
    while (choices.length < Math.min(3, pool.length)) {
        let pick = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        choices.push(pick);
    }
    game.pendingConditionGemChoices = choices;
    renderSkillAutoRulePanel();
    openConditionGemChoiceOverlay();
}

function getConditionGemDetail(entry) {
    if (!entry) return '';
    let d = getUiConditionGemStatDelta(entry.name, entry.type);
    let out = [];
    let pct = value => Math.round(Math.abs(value) * 100);
    let signed = value => `${value > 0 ? '+' : ''}${Math.round(value)}`;
    [
        ['enemyTakenMul', '받는피해', value => `+${pct(value - 1)}%`],
        ['enemyLightTakenMul', '번개 받는피해', value => `+${pct(value - 1)}%`],
        ['enemyChaosTakenMul', '카오스 받는피해', value => `+${pct(value - 1)}%`],
        ['enemyProjectileTakenMul', '투사체 받는피해', value => `+${pct(value - 1)}%`],
        ['enemyCritDmgTakenMul', '치명타 피해 취약', value => `+${pct(value - 1)}%`],
        ['igniteTakenMul', '점화 받는피해', value => `+${pct(value - 1)}%`],
        ['chillTakenMul', '냉각 대상 피해', value => `+${pct(value - 1)}%`],
        ['freezeTakenMul', '동결 대상 피해', value => `+${pct(value - 1)}%`],
        ['shockTakenMul', '감전 받는피해', value => `+${pct(value - 1)}%`],
        ['poisonTakenMul', '중독 받는피해', value => `+${pct(value - 1)}%`],
        ['bleedTakenMul', '출혈 받는피해', value => `+${pct(value - 1)}%`],
        ['fireDotTakenMul', '화염 지속피해', value => `+${pct(value - 1)}%`],
        ['enemyDmgMul', '적 피해', value => `-${pct(1 - value)}%`],
        ['enemyRegenRateMul', '적 재생 효율', value => `-${pct(1 - value)}%`]
    ].forEach(row => { if (Number.isFinite(Number(d[row[0]]))) out.push(`${row[1]} ${row[2](Number(d[row[0]]))}`); });
    [
        ['enemyResShred', '모든 저항 감소'], ['enemyResFShred', '화염 저항 감소'], ['enemyResCShred', '냉기 저항 감소'],
        ['enemyResLShred', '번개 저항 감소'], ['enemyResChaosShred', '카오스 저항 감소'], ['enemyPhysDrShred', '물리 피해감소 감소'],
        ['resPen', '저항 관통'], ['resAll', '원소 저항'], ['maxResAll', '최대 원소 저항'], ['resChaos', '카오스 저항'],
        ['physIgnore', '물피감 무시'], ['crit', '치명타 확률'], ['critDmg', '치명타 피해'], ['targetAny', '스킬 대상'],
        ['projectileExtraHits', '투사체 추가 적중'], ['energyShieldRegen', '보호막 회복속도']
    ].forEach(row => { if (d[row[0]]) out.push(`${row[1]} +${Math.round(d[row[0]] * 10) / 10}`); });
    if (d.pctDmg) out.push(`피해 +${Math.round(d.pctDmg)}%`);
    if (d.aspd) out.push(`공속 ${signed(d.aspd)}%`);
    if (d.dr) out.push(`물피감 ${signed(d.dr)}%`);
    if (d.move) out.push(`이속 ${signed(d.move)}%`);
    if (d.regen) out.push(`재생 +${d.regen}%/s`);
    if (d.leech) out.push(`흡수 +${d.leech}%`);
    if (d.fireBonus) out.push(`화염 스킬 증폭 +${pct(d.fireBonus)}%`);
    if (d.coldBonus) out.push(`냉기 스킬 증폭 +${pct(d.coldBonus)}%`);
    if (d.slamEchoPct) out.push(`강타 메아리 ${pct(d.slamEchoPct)}% 피해`);
    if (d.thorns) out.push(`피격 반격 ${pct(d.thorns)}%`);
    if (d.armorMul) out.push(`현재 물피감 추가 +${pct(d.armorMul)}%`);
    if (d.delayedRegenFromTakenDamage) out.push(`피해 일부 지연회복 ${pct(d.delayedRegenFromTakenDamage)}%`);
    if (d.hpSacrificePct) out.push(`시전 시 생명력 ${Math.round(d.hpSacrificePct)}% 소모`);
    if (d.poisonToHeal) out.push('중독 피해를 회복으로 전환');
    if (d.disableEnemyLeech) out.push('적 흡혈 차단');
    if (d.doomMark) out.push('체력이 낮은 적에게 피해 증폭');
    Object.entries({ Ignite: '점화', Shock: '감전', Chill: '냉각', Freeze: '동결', Poison: '중독', Bleed: '출혈' }).forEach(([key, label]) => {
        if (d[`cleanse${key}`]) out.push(`${label} 해제`);
        if (d[`immune${key}`]) out.push(`${label} 면역`);
    });
    return out.join(' · ') || (entry.desc || '조건부 전투 효과');
}
function getConditionGemTooltip(entry) {
    if (!entry) return '';
    let cast = Number(entry.castTime || 1).toFixed(1);
    let duration = Number(entry.duration || 4).toFixed(1);
    let cooldown = Math.max(2, Math.floor((entry.castTime || 1) * 1000 + 2500) / 1000).toFixed(1);
    return `${entry.name}\n유형: ${entry.type}\n시전 시간: ${cast}초\n지속 시간: ${duration}초\n쿨타임: ${cooldown}초\n효과: ${getConditionGemDetail(entry)}`;
}


function getConditionGemTooltipHtml(entry) {
    if (!entry) return '';
    let cast = Number(entry.castTime || 1).toFixed(1);
    let duration = Number(entry.duration || 4).toFixed(1);
    let cooldown = Math.max(2, Math.floor((entry.castTime || 1) * 1000 + 2500) / 1000).toFixed(1);
    let lv = Math.max(1, Math.min(5, Math.floor(((game.conditionGemLevels || {})[entry.name] || 1))));
    let html = `<div class="tooltip-title">${entry.name} · Lv.${lv}</div>`;
    html += `<div class="tooltip-line">${entry.desc || '컨디션 젬 효과'}</div>`;
    html += `<div class="tooltip-line" style="margin-top:6px;">시전 시간 ${cast}초 · 지속 ${duration}초 · 쿨타임 ${cooldown}초</div>`;
    html += `<div class="tooltip-line">효과: ${getConditionGemDetail(entry)}</div>`;
    if ((entry.tags || []).length > 0) html += `<div class="tooltip-line">태그: ${entry.tags.join(' / ')}</div>`;
    return html;
}
function showConditionGemTooltip(event, name) {
    let entry = getAllConditionGemEntries().find(e => e.name === name);
    if (!entry) return;
    showInfoTooltipHtml(event.clientX, event.clientY, getConditionGemTooltipHtml(entry), '#ff5252');
}

function openConditionGemChoiceOverlay() {
    let pending = Array.isArray(game.pendingConditionGemChoices) ? game.pendingConditionGemChoices : [];
    if (pending.length <= 0 || document.getElementById('condition-gem-overlay')) return;
    let html = `<div id="condition-gem-overlay" style="position:fixed;inset:0;background:rgba(9,12,20,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;">
        <div style="width:min(980px,95vw);background:#0f1520;border:1px solid #3e5472;border-radius:12px;padding:12px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;"><strong>군주의 핵 컨디션 젬 가공</strong><button onclick="closeConditionGemChoiceOverlay()">닫기</button></div>
            <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">${pending.map(e => `<button onclick="pickConditionGem('${e.name}')" style="text-align:left;padding:10px;"><div><strong>${e.name}</strong></div><div style="color:#9ac3e8;font-size:.82em;">${e.type} · ${(e.tags||[]).join('/')}</div><div style="color:#f2d79c;font-size:.8em;margin-top:4px;">${getConditionGemDetail(e)}</div></button>`).join('')}</div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
function closeConditionGemChoiceOverlay() { let el = document.getElementById('condition-gem-overlay'); if (el) el.remove(); }

function pickConditionGem(name) {
    game.conditionGemPool = Array.isArray(game.conditionGemPool) ? game.conditionGemPool : [];
    game.conditionGemLevels = game.conditionGemLevels || {};
    if (!game.conditionGemPool.includes(name)) {
        game.conditionGemPool.push(name);
        game.conditionGemLevels[name] = Math.max(1, Math.floor(game.conditionGemLevels[name] || 1));
        addLog(`✨ 컨디션 젬 [${name}] 해금!`, 'loot-unique');
    } else {
        let prev = Math.max(1, Math.floor(game.conditionGemLevels[name] || 1));
        let next = Math.min(5, prev + 1);
        game.conditionGemLevels[name] = next;
        addLog(next > prev ? `🔺 컨디션 젬 [${name}] 레벨 ${next} 달성!` : `ℹ️ 컨디션 젬 [${name}]은 이미 최대 레벨입니다.`, 'loot-rare');
    }
    game.pendingConditionGemChoices = null;
    closeConditionGemChoiceOverlay();
    renderSkillAutoRulePanel();
}

function renderSkillAutoRulePanel() {
    let panel = document.getElementById('ui-skill-rules-panel');
    if (!panel) return;
    let unlocked = !!game.conditionGemUnlocked;
    let owned = Array.isArray(game.conditionGemPool) ? game.conditionGemPool : [];
    let pending = Array.isArray(game.pendingConditionGemChoices) ? game.pendingConditionGemChoices : [];
    if (!unlocked) {
        panel.innerHTML = `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">잠금 상태: 루프2 뿌리 보스를 처음 처치하면 컨디션 젬이 해금됩니다.</div>`;
        return;
    }
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];
    let summary = `<div style="background:#101722; border:1px solid #324a66; border-radius:8px; padding:10px;">해금 젬 수: <strong>${owned.length}</strong> / ${getAllConditionGemEntries().length} · 군주의 핵: <strong>${game.currencies.bossCore || 0}</strong> · 선택지 <strong>3</strong>개 <button style="margin-left:8px;" onclick="rollConditionGemChoices()">군주의 핵으로 컨디션 젬 가공</button></div>`;
    let choiceHtml = pending.length > 0 ? `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">${pending.map(entry => `<button onclick="pickConditionGem('${entry.name}')"><strong>${entry.name}</strong><br><small>${entry.type} · ${entry.tags.join('/')}</small></button>`).join('')}</div>` : '';
    let ownedEntries = getAllConditionGemEntries().filter(entry => owned.includes(entry.name));
    let ownedHtml = ownedEntries.length > 0 ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">${ownedEntries.map(entry => {
        let safeName = String(entry.name || '').replace(/'/g, "\\'");
        return `<div class="condition-gem-card" style="border:1px solid #314761;border-radius:8px;padding:7px; cursor:help;" onmouseover="showConditionGemTooltip(event,'${safeName}')" onmouseenter="showConditionGemTooltip(event,'${safeName}')" onmousemove="showConditionGemTooltip(event,'${safeName}')" onmouseleave="hideInfoTooltip()"><strong>${entry.name}</strong><small style="margin-left:6px;color:#9ec1e1;">Lv.${Math.max(1,Math.min(5,Math.floor(((game.conditionGemLevels||{})[entry.name]||1))))}</small></div>`;
    }).join('')}</div>` : '';

    if (game.skillAutoRules.length === 0) {
        panel.innerHTML = summary + choiceHtml + ownedHtml + `<div style="color:#7f8c8d; border:1px dashed #39506c; border-radius:8px; padding:12px; margin-top:8px;">아직 규칙이 없습니다. 규칙 추가 버튼으로 시작하세요.</div>`;
        return;
    }
    panel.innerHTML = summary + choiceHtml + ownedHtml + game.skillAutoRules.map((rule, idx) => `
        <div style="background:#111722; border:1px solid #304a67; border-radius:10px; padding:10px; display:grid; gap:6px;">
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                <label><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="game.skillAutoRules[${idx}].enabled=this.checked;"> 사용</label>
                <label>우선순위 <input type="number" min="1" value="${rule.priority || (idx+1)}" style="width:60px;" onchange="game.skillAutoRules[${idx}].priority=Math.max(1,Math.floor(this.value||1));"></label>
                <button onclick="game.skillAutoRules.splice(${idx},1); renderSkillAutoRulePanel();">삭제</button>
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:#c7d7ea;">
                <span>IF</span>
                <select onchange="game.skillAutoRules[${idx}].triggerType=this.value;">
                    <option value="hp_below" ${(rule.triggerType||'hp_below')==='hp_below'?'selected':''}>HP ≤</option>
                    <option value="hp_above" ${(rule.triggerType||'hp_below')==='hp_above'?'selected':''}>HP ≥</option>
                    <option value="enemy_many" ${(rule.triggerType||'hp_below')==='enemy_many'?'selected':''}>적 수 ≥</option>
                    <option value="enemy_few" ${(rule.triggerType||'hp_below')==='enemy_few'?'selected':''}>적 수 ≤</option>
                    <option value="es_below" ${(rule.triggerType||'hp_below')==='es_below'?'selected':''}>ES ≤</option>
                    <option value="es_above" ${(rule.triggerType||'hp_below')==='es_above'?'selected':''}>ES ≥</option>
                    <option value="boss_present" ${(rule.triggerType||'hp_below')==='boss_present'?'selected':''}>보스 등장 시</option>
                    <option value="boss_absent" ${(rule.triggerType||'hp_below')==='boss_absent'?'selected':''}>보스 없음</option>
                </select>
                <input type="number" min="1" max="100" value="${rule.hpThreshold || 40}" style="width:64px;" onchange="game.skillAutoRules[${idx}].hpThreshold=Math.min(100,Math.max(1,Math.floor(this.value||40)));">
                <span>%</span>
                <span>THEN</span>
                <select onchange="game.skillAutoRules[${idx}].skillName=this.value;" style="min-width:180px;">
                    <option value="">사용할 젬 선택</option>
                    ${ownedEntries.map(entry => `<option value="${entry.name}" title="${escapeHTML(getConditionGemTooltip(entry))}" ${rule.skillName===entry.name?'selected':''}>${entry.name} (${entry.type})</option>`).join('')}
                </select>
            </div>
        </div>`).join('');
}

function switchSkillSubtab(subtabId) {
    if (subtabId === game.skillSubtab) {
        let currentPanel = document.getElementById(subtabId);
        let currentBtn = document.getElementById('btn-' + subtabId);
        if (currentPanel && currentPanel.classList.contains('active') && currentBtn && currentBtn.classList.contains('active')) return;
    }
    game.skillSubtab = subtabId;
    document.querySelectorAll('#tab-skills .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-skills .subtab-btn').forEach(el => el.classList.remove('active'));
    let panel = document.getElementById(subtabId);
    let btn = document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
}



function closeBeehiveChoiceOverlay() {
    let el = document.getElementById('beehive-choice-overlay');
    if (el) el.remove();
}

function getBeehiveChoiceButtonsHtml(c) {
    if (!c) return '';
    if (c.a && c.b && c.c) {
        return `<button onclick="resolveBeehiveChoice('a')" style="text-align:left;padding:10px;">${c.a.text}</button><button onclick="resolveBeehiveChoice('b')" style="text-align:left;padding:10px;">${c.b.text}</button><button onclick="resolveBeehiveChoice('c')" style="text-align:left;padding:10px;">${c.c.text}</button>`;
    }
    return `<button onclick="resolveBeehiveChoice('legacy_now')" style="text-align:left;padding:10px;">${c.nowText || '즉시 보상'}</button><button onclick="resolveBeehiveChoice('legacy_later')" style="text-align:left;padding:10px;">${c.laterText || '지연 보상'}</button>`;
}

function openBeehiveChoiceOverlay(reasonText) {
    let b = game.beehive || {};
    let alive = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (!b.inRun || !b.pendingChoice || b.awaitingClear || alive > 0 || document.getElementById('beehive-choice-overlay')) return;
    let next = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    let html = `<div id="beehive-choice-overlay" style="position:fixed;inset:0;background:rgba(8,8,5,.76);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;">
        <div style="width:min(920px,95vw);background:#17130b;border:1px solid #9b7a30;border-radius:14px;padding:14px;box-shadow:0 18px 60px rgba(0,0,0,.45);">
            <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;"><strong style="color:#ffd978;font-size:18px;">🐝 벌떼 웨이브 처치 완료</strong><button onclick="closeBeehiveChoiceOverlay()">닫기</button></div>
            <div style="color:#d9c08a;margin-bottom:10px;line-height:1.45;">${reasonText || '다음 갈림길을 선택하세요.'}<br>갈림길 ${next}/10 · 선택 즉시 다음 벌떼 웨이브가 시작됩니다.</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;">${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>
            <div style="color:#95835d;font-size:.82em;margin-top:10px;">닫아도 벌집 패널에서 다시 선택할 수 있습니다.</div>
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
    if (b.inRun && b.awaitingClear && (game.enemies || []).filter(e => e.hp > 0).length === 0) {
        onBeehiveWaveCleared();
    }
    let aliveBeeEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (b.inRun && b.pendingChoice && !b.awaitingClear && aliveBeeEnemies <= 0) {
        openBeehiveChoiceOverlay();
        let c = b.pendingChoice;
        if (c.a && c.b && c.c) {
            choiceHtml = `<div style="margin-top:8px; display:grid; gap:6px;"><div style="color:#ffd978; font-weight:700;">갈림길 선택 (${Math.min(10, (b.branchStep || 0) + 1)}/10) · 선택 즉시 벌떼 웨이브가 시작됩니다.</div><button onclick="resolveBeehiveChoice('a')">${c.a.text}</button><button onclick="resolveBeehiveChoice('b')">${c.b.text}</button><button onclick="resolveBeehiveChoice('c')">${c.c.text}</button></div>`;
        } else {
            // Legacy save compatibility: old shape used now/later keys.
            choiceHtml = `<div style="margin-top:8px; display:grid; gap:6px;"><div style="color:#ffd978; font-weight:700;">갈림길 선택 (${Math.min(10, (b.branchStep || 0) + 1)}/10)</div><button onclick="resolveBeehiveChoice('legacy_now')">${c.nowText || '즉시 보상'}</button><button onclick="resolveBeehiveChoice('legacy_later')">${c.laterText || '지연 보상'}</button></div>`;
        }
    } else if (b.inRun && b.awaitingClear) {
        choiceHtml = `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? '여왕벌 전투 진행 중' : `벌떼 웨이브 진행 중 (${Math.max(0, Math.floor(b.branchStep || 0))}/10)`} · 남은 적 <strong>${aliveBeeEnemies}</strong>마리를 모두 처치해야 진행할 수 있습니다.</div>`;
    }
    if (!shouldRenderPanel || !panel) return;
    let beekeeperLv = getBeekeeperLevelForHive();
    let hiveUnlockText = `양봉업자 Lv.${beekeeperLv} · 카오스 ${beekeeperLv >= 3 ? '해금' : 'Lv.3'} · 신성한오브 ${beekeeperLv >= 5 ? '해금' : 'Lv.5'}`;
    panel.innerHTML = `<div style="color:#f6d68e; margin-bottom:6px;">벌집 열쇠: <strong>${game.currencies.hiveKey||0}</strong> · 꽃가루: <strong>${game.currencies.pollen||0}</strong> · 독벌침: <strong>${game.currencies.venomStinger||0}</strong> · 벌꿀: <strong>${game.currencies.enchantedHoney||0}</strong> · 밀랍: <strong>${game.currencies.beeswax||0}</strong></div>
    <div style="color:#b8c7d8; font-size:0.82em; margin-bottom:8px;">자동 맵 진행 없이 갈림길 선택 → 벌떼 웨이브 → 전멸 확인 순서로 진행됩니다. 선택마다 진행도 10%가 오르고, 10개 갈림길 완료 후 여왕벌이 등장합니다.<br>${hiveUnlockText}</div>
    <div style="color:#f6d68e; margin-bottom:8px;">진행도: <strong>${Math.min(100, Math.max(0, Math.floor(b.branchStep || 0) * 10))}%</strong> · 완료한 갈림길: <strong>${Math.min(10, Math.max(0, Math.floor(b.branchStep || 0)))}/10</strong>${b.queenActive ? ' · <strong>여왕벌 등장</strong>' : ''}</div>
    <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="startBeehiveRun()" ${(game.currencies.hiveKey||0)<=0 || b.inRun ? 'disabled':''}>벌집 입장</button><button onclick="forfeitBeehiveRun()" ${b.inRun ? '':'disabled'}>던전 포기</button></div>${choiceHtml}`;
}

const COLONY_WARD_MAX_SLOTS = 4;
const COLONY_WARD_SLOT_UNLOCK_COSTS = {
    2: { colonyShard: 25 },
    3: { colonyShard: 75 },
    4: { colonyShard: 150, colonyTrace: 1 }
};

function normalizeColonyWardState() {
    let c = game.colony || (game.colony = {});
    c.wardInventory = Array.isArray(c.wardInventory) ? c.wardInventory : [];
    c.wardEquipped = Array.isArray(c.wardEquipped) ? c.wardEquipped.slice(0, COLONY_WARD_MAX_SLOTS) : [null, null, null, null];
    while (c.wardEquipped.length < COLONY_WARD_MAX_SLOTS) c.wardEquipped.push(null);
    let fixWardName = ward => {
        if (ward && ward.stat === 'resAll' && typeof ward.name === 'string' && ward.name.includes('모든 저항') && !ward.name.includes('모든 원소 저항')) {
            ward.name = ward.name.replace('모든 저항', '모든 원소 저항');
        }
        return ward;
    };
    c.wardInventory.forEach(fixWardName);
    c.wardEquipped.forEach(fixWardName);
    let highestEquipped = c.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    c.wardSlots = Math.max(1, Math.min(COLONY_WARD_MAX_SLOTS, Math.max(highestEquipped, Math.floor(c.wardSlots || 1))));
    c.wardSlotVersion = 1;
    return c;
}

function getColonyWardStatLabel(stat) {
    const labels = {
        flatHp: '최대 생명력', armor: '방어도', evasion: '회피', energyShield: '에너지 보호막', resAll: '모든 원소 저항',
        maxResF: '최대 화염 저항', maxResC: '최대 냉기 저항', maxResL: '최대 번개 저항', resChaos: '카오스 저항',
        ailResIgnite: '점화 저항', ailResFreeze: '냉각/동결 저항', ailResShock: '감전 저항', ailResPoison: '중독 저항', ailResBleed: '출혈 저항',
        regenFlat: '생명력 재생', energyShieldRegen: '에너지 보호막 회복속도', critResist: '치명타 저항', dr: '받는 물리 피해 감소',
        fireTakenDamageReducePct: '받는 화염 피해 감소', coldTakenDamageReducePct: '받는 냉기 피해 감소', lightTakenDamageReducePct: '받는 번개 피해 감소', chaosTakenDamageReducePct: '받는 카오스 피해 감소',
        dotTakenDamageReducePct: '받는 지속 피해 감소', takenDamageReduceWhen2EnemiesPct: '받는 피해 감소(2마리 이상)', takenDamageReduceWhen1EnemyPct: '받는 피해 감소(1마리)',
        igniteDamageReducePct: '받는 점화 피해 감소', bleedDamageReducePct: '받는 출혈 피해 감소', poisonDamageReducePct: '받는 중독 피해 감소'
    };
    return labels[stat] || getStatName(stat || '');
}

function getColonyWardValueText(ward) {
    if (!ward) return '';
    return `${getColonyWardStatLabel(ward.stat)} +${formatValue(ward.stat, Number(ward.val || 0))}`;
}

function getColonyWardSearchText(ward) {
    if (!ward) return '';
    return `${ward.name || ''} ${ward.stat || ''} ${getColonyWardStatLabel(ward.stat)} ${getColonyWardValueText(ward)} ${ward.val || ''}`;
}

function getColonyWardSearchFilterState() {
    game.settings = game.settings || {};
    game.settings.searchFilters = (game.settings.searchFilters && typeof game.settings.searchFilters === 'object') ? game.settings.searchFilters : {};
    game.settings.searchFilters.colonyWard = String(game.settings.searchFilters.colonyWard || '');
    return game.settings.searchFilters;
}

function matchColonyWardSearchQuery(raw, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const text = String(raw || '').toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(tok => text.includes(tok));
}

function highlightColonyWardSearchText(text, query) {
    const raw = String(text || '');
    const tokens = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length <= 0) return escapeHTML(raw);
    let ranges = [];
    const lower = raw.toLowerCase();
    tokens.forEach(token => {
        let from = 0;
        while (from < lower.length) {
            let idx = lower.indexOf(token, from);
            if (idx < 0) break;
            ranges.push([idx, idx + token.length]);
            from = idx + Math.max(1, token.length);
        }
    });
    if (ranges.length <= 0) return escapeHTML(raw);
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let merged = [];
    ranges.forEach(range => {
        let last = merged[merged.length - 1];
        if (!last || range[0] > last[1]) merged.push(range.slice());
        else last[1] = Math.max(last[1], range[1]);
    });
    let out = '';
    let cursor = 0;
    merged.forEach(([start, end]) => {
        if (start > cursor) out += escapeHTML(raw.slice(cursor, start));
        out += `<mark style="background:#365a2b;color:#dfffe8;padding:0 1px;border-radius:2px;">${escapeHTML(raw.slice(start, end))}</mark>`;
        cursor = end;
    });
    if (cursor < raw.length) out += escapeHTML(raw.slice(cursor));
    return out;
}

function getColonyWardSearchQuery() {
    return getColonyWardSearchFilterState().colonyWard;
}

function updateColonyWardSearchFilter(value) {
    getColonyWardSearchFilterState().colonyWard = String(value || '');
    if (typeof updateStaticUI === 'function') updateStaticUI();
}

function resetColonyWardSearchFilter() {
    updateColonyWardSearchFilter('');
}

function getColonyWardDismantleReward(ward) {
    if (!ward) return 1;
    let value = Math.abs(Number(ward.val || 0));
    return Math.max(1, Math.min(6, 1 + Math.floor(value / 40)));
}


function isLockedInventoryObject(obj) {
    return !!(obj && obj.locked);
}

function getLockButtonLabel(obj) {
    return isLockedInventoryObject(obj) ? '🔒 잠금' : '🔓 잠금';
}

function toggleTalismanLock(talismanId) {
    let target = (game.talismanInventory || []).find(t => t && t.id === talismanId);
    if (!target) return;
    target.locked = !target.locked;
    addLog(`${target.locked ? '🔒' : '🔓'} 부적 잠금 ${target.locked ? '설정' : '해제'}: ${getTalismanDisplayName(target)}`, 'loot-normal');
    updateStaticUI();
}

function toggleColonyWardLock(id) {
    let c = normalizeColonyWardState();
    let ward = (c.wardInventory || []).find(w => w && w.id === id);
    if (!ward) return;
    ward.locked = !ward.locked;
    addLog(`${ward.locked ? '🔒' : '🔓'} 액막이 부적 잠금 ${ward.locked ? '설정' : '해제'}: ${ward.name || '액막이'}`, 'loot-normal');
    updateStaticUI();
}

function buildColonyWardTooltipHtml(ward) {
    if (!ward) return '<div class="tooltip-title">빈 액막이 슬롯</div>';
    return `<div class="tooltip-title">${escapeHTML(ward.name || '군락지 액막이 부적')}</div>
        <div class="tooltip-line" style="color:#bfffd1;">효과: ${escapeHTML(getColonyWardValueText(ward))}</div>
        <div class="tooltip-line" style="color:#9fb7ca;">장착 중인 액막이 부적은 플레이어 방어 능력치에 즉시 합산됩니다.</div>
        <div class="tooltip-line" style="color:#ffd98a;">획득처: 군락지 웨이브 보상 / 여왕 보상</div>`;
}

function getColonyWardSlotCost(slot) {
    return COLONY_WARD_SLOT_UNLOCK_COSTS[Math.max(2, Math.min(COLONY_WARD_MAX_SLOTS, Math.floor(slot || 2)))] || null;
}

function formatColonyWardCost(cost) {
    if (!cost) return '최대 해금';
    let names = { colonyShard: '군락지 편린', colonyTrace: '군락지 흔적' };
    return Object.keys(cost).map(key => `${names[key] || key} ${Math.floor(game.currencies[key] || 0)}/${cost[key]}`).join(' · ');
}

function canPayColonyWardCost(cost) {
    if (!cost) return false;
    return Object.keys(cost).every(key => Math.floor(game.currencies[key] || 0) >= cost[key]);
}

function renderColonyWardPanel(targetId) {
    let panel = document.getElementById(targetId || 'ui-colony-ward-talisman-panel');
    if (!panel) return;
    let open = (game.season || 1) >= 15;
    let c = normalizeColonyWardState();
    let wardQuery = getColonyWardSearchQuery();
    let slotMax = Math.max(1, Math.min(COLONY_WARD_MAX_SLOTS, Math.floor(c.wardSlots || 1)));
    let nextSlot = slotMax + 1;
    let nextCost = nextSlot <= COLONY_WARD_MAX_SLOTS ? getColonyWardSlotCost(nextSlot) : null;
    let total = {};
    c.wardEquipped.slice(0, slotMax).forEach(w => { if (w && w.stat) total[w.stat] = (total[w.stat] || 0) + Number(w.val || 0); });
    let totalRows = Object.keys(total).map(stat => `<span style="color:${getItemStatToneColor(stat)};">${escapeHTML(getColonyWardStatLabel(stat))} +${formatValue(stat, total[stat])}</span>`);
    let slots = Array.from({ length: COLONY_WARD_MAX_SLOTS }, (_, i) => {
        let unlocked = i < slotMax;
        let ward = c.wardEquipped[i];
        let inner = ward ? `<div style="font-weight:800;color:#eafff0;">${escapeHTML(ward.name || '액막이')}</div><div style="margin-top:4px;color:#aaf7c2;">${escapeHTML(getColonyWardValueText(ward))}</div><button style="margin-top:8px;" onclick="unequipColonyWard(${i})">해제</button>` : (unlocked ? `<div style="font-weight:800;color:#dfffe8;">빈 슬롯 ${i + 1}</div><div style="margin-top:4px;color:#7fa08a;">보유 액막이를 장착하세요.</div>` : `<div style="font-weight:800;color:#7f8d87;">잠김 ${i + 1}</div><div style="margin-top:4px;color:#60766c;">슬롯 확장 필요</div>`);
        let hover = ward ? ` data-info-tooltip-anchor="1" onmouseenter="showColonyWardTooltip(event,'equipped',${i})" onmousemove="showColonyWardTooltip(event,'equipped',${i})" onmouseleave="hideInfoTooltip()"` : '';
        return `<div class="colony-ward-slot ${unlocked ? 'unlocked' : 'locked'}"${hover}>${inner}</div>`;
    }).join('');
    let filteredInventory = c.wardInventory.filter(w => matchColonyWardSearchQuery(getColonyWardSearchText(w), wardQuery));
    let inv = c.wardInventory.length > 0 ? (filteredInventory.length > 0 ? filteredInventory.map(w => `<div class="colony-ward-chip" data-info-tooltip-anchor="1" onmouseenter="showColonyWardTooltip(event,'inventory','${w.id}')" onmousemove="showColonyWardTooltip(event,'inventory','${w.id}')" onmouseleave="hideInfoTooltip()"><button type="button" onclick="equipColonyWardById('${w.id}')"><strong>${isLockedInventoryObject(w) ? '🔒 ' : ''}${highlightColonyWardSearchText(w.name || '액막이', wardQuery)}</strong><span>${highlightColonyWardSearchText(getColonyWardValueText(w), wardQuery)}</span></button><button type="button" onclick="toggleColonyWardLock('${w.id}')">${getLockButtonLabel(w)}</button><button type="button" class="colony-ward-dismantle" onclick="dismantleColonyWardById('${w.id}')" ${isLockedInventoryObject(w) ? 'disabled' : ''}>해체 +${getColonyWardDismantleReward(w)}</button></div>`).join('') : '<div style="color:#6f8f7a;">검색 조건에 맞는 액막이가 없습니다.</div>') : '<div style="color:#6f8f7a;">보유한 액막이 부적이 없습니다.</div>';
    let wardTools = `<button onclick="bulkDismantleColonyWardsBySearch(false)" style="background:#6e3f3f; border-color:#8f5959;">검색 항목 해체</button><button onclick="bulkDismantleColonyWardsBySearch(true)" style="background:#4b2f55; border-color:#6e4a78;">미검색 항목 해체</button>`;
    panel.innerHTML = `<div class="colony-ward-panel">
        <div class="colony-ward-hero"><div><div class="colony-ward-kicker">Colony Ward Charm</div><div class="colony-ward-title">군락지 액막이 부적</div><div class="colony-ward-desc">군락지에서 얻는 방어형 부적입니다. 슬롯은 처음 1/4에서 시작하며, 군락지 재화를 사용해 4/4까지 해금합니다.</div></div><div class="colony-ward-currency">군락지 흔적 <b>${game.currencies.colonyTrace || 0}</b><br>군락지 편린 <b>${game.currencies.colonyShard || 0}</b></div></div>
        ${open ? '' : '<div class="colony-ward-locked">루프 15 이후 군락지와 액막이 부적이 해금됩니다.</div>'}
        <div class="colony-ward-actions"><span>해금 슬롯 <b>${slotMax}/${COLONY_WARD_MAX_SLOTS}</b></span><button onclick="unlockColonyWardSlot()" ${!open || slotMax >= COLONY_WARD_MAX_SLOTS || !canPayColonyWardCost(nextCost) ? 'disabled' : ''}>다음 슬롯 확장</button><span class="colony-ward-cost">${slotMax >= COLONY_WARD_MAX_SLOTS ? '모든 슬롯 해금 완료' : `다음 비용: ${formatColonyWardCost(nextCost)}`}</span></div>
        <div class="colony-ward-grid">${slots}</div>
        <div class="colony-ward-section"><div class="colony-ward-section-title">보유 액막이 <span style="color:#8fbf9b; font-weight:600;">(${filteredInventory.length}/${c.wardInventory.length})</span></div><div class="search-filter-panel colony-ward-search"><input class="search-filter-input" data-search-key="colonyWard" placeholder="액막이 옵션 검색 (이름/옵션/수치)" value="${escapeHTML(wardQuery)}" oninput="updateColonyWardSearchFilter(this.value)"><div class="search-action-row"><button onclick="resetColonyWardSearchFilter()">검색어 리셋</button>${wardTools}</div></div><div class="colony-ward-inventory">${inv}</div></div>
        <div class="colony-ward-section"><div class="colony-ward-section-title">적용 효과 합계</div><div class="colony-ward-total">${totalRows.length ? totalRows.map(row => `<div>• <strong>${row}</strong></div>`).join('') : '<span style="color:#8da99a;">장착된 액막이가 없습니다.</span>'}</div></div>
    </div>`;
}

function showColonyWardTooltip(event, source, ref) {
    let c = normalizeColonyWardState();
    let ward = source === 'equipped' ? c.wardEquipped[Math.floor(ref || 0)] : c.wardInventory.find(w => w && w.id === ref);
    showInfoTooltipHtml(event.clientX, event.clientY, buildColonyWardTooltipHtml(ward), '#76e6a0');
}

function switchTalismanSubtab(tabId) {
    let active = tabId === 'talisman-sub-colony-ward' ? tabId : 'talisman-sub-board';
    ['talisman-sub-board', 'talisman-sub-colony-ward'].forEach(id => {
        let el = document.getElementById(id);
        let btn = document.getElementById(id === 'talisman-sub-board' ? 'btn-talisman-sub-board' : 'btn-talisman-sub-colony-ward');
        if (el) el.classList.toggle('active', id === active);
        if (btn) btn.classList.toggle('active', id === active);
    });
    game.talismanSubtab = active;
    if (active === 'talisman-sub-colony-ward') renderColonyWardPanel('ui-colony-ward-talisman-panel');
}

function renderLoop15ColonyPanel() {
    let open = (game.season || 1) >= 15;
    let header = document.getElementById('ui-colony-header');
    let panel = document.getElementById('ui-colony-panel');
    if (!header || !panel) return;
    header.style.display = open ? 'block' : 'none';
    panel.style.display = open ? 'block' : 'none';
    if (!open) return;
    let c = normalizeColonyWardState();
    let status = c.inRun ? `진행중 · 웨이브 ${Math.max(1,Math.floor(c.wave||1))} · 처치 ${Math.max(0,Math.floor(c.kills||0))}/${Math.max(1,Math.floor(c.requiredKills||1))}` : '대기중';
    panel.innerHTML = `<div style="color:#c9f7d6; margin-bottom:6px;">군락지 흔적: <strong>${game.currencies.colonyTrace||0}</strong> · 군락지 편린: <strong>${game.currencies.colonyShard||0}</strong></div>
    <div style="color:#9fd3b1; font-size:.84em; margin-bottom:8px;">루프 15 이후 해금. 혼돈 심화(21+), 벌집, 대균열에서 아주 낮은 확률로 군락지 흔적 획득. 입장 시 마지막 혼돈 심화 층 기준 난이도로 웨이브가 진행됩니다.</div>
    <div style="color:#e3ffe8; margin-bottom:8px;">상태: <strong>${status}</strong></div>
    <div style="margin-top:8px;color:#a5e3bc;">액막이 슬롯: <strong>${Math.max(1, Math.floor(c.wardSlots || 1))}/4</strong> · 장착/확장은 <button onclick="switchTab('tab-talisman'); switchTalismanSubtab('talisman-sub-colony-ward')">부적 &gt; 군락지 액막이</button>에서 관리합니다.</div>
    <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;"><button onclick="startColonyRun()" ${(game.currencies.colonyTrace||0)<=0 || c.inRun ? 'disabled':''}>군락지 입장</button><button onclick="forfeitColonyRun()" ${c.inRun ? '' : 'disabled'}>군락지 포기</button></div>`;
}

function generateColonyWard(){
    const pool = [
        { id:'flatHp', min:40, max:120, label:'최대 생명력 +' },
        { id:'armor', min:30, max:140, label:'방어도 +' },
        { id:'evasion', min:30, max:140, label:'회피 +' },
        { id:'energyShield', min:20, max:120, label:'에너지 보호막 +' },
        { id:'resAll', min:4, max:12, label:'모든 원소 저항 +' },
        { id:'maxResF', min:1, max:2, label:'최대 화염 저항 +' },
        { id:'maxResC', min:1, max:2, label:'최대 냉기 저항 +' },
        { id:'maxResL', min:1, max:2, label:'최대 번개 저항 +' },
        { id:'resChaos', min:4, max:12, label:'카오스 저항 +' },
        { id:'ailResIgnite', min:6, max:20, label:'점화 저항 +' },
        { id:'ailResFreeze', min:6, max:20, label:'냉각/동결 저항 +' },
        { id:'ailResShock', min:6, max:20, label:'감전 저항 +' },
        { id:'ailResPoison', min:6, max:20, label:'중독 저항 +' },
        { id:'ailResBleed', min:6, max:20, label:'출혈 저항 +' },
        { id:'regenFlat', min:2, max:8, label:'생명력 재생 +' },
        { id:'energyShieldRegen', min:2, max:10, label:'에너지 보호막 회복속도 +' },
        { id:'critResist', min:4, max:18, label:'치명타 저항 +' },
        { id:'dr', min:1, max:4, label:'받는 물리 피해 감소 +' },
        { id:'fireTakenDamageReducePct', min:2, max:8, label:'받는 화염 피해 감소 +' },
        { id:'coldTakenDamageReducePct', min:2, max:8, label:'받는 냉기 피해 감소 +' },
        { id:'lightTakenDamageReducePct', min:2, max:8, label:'받는 번개 피해 감소 +' },
        { id:'chaosTakenDamageReducePct', min:2, max:8, label:'받는 카오스 피해 감소 +' },
        { id:'dotTakenDamageReducePct', min:2, max:8, label:'받는 지속 피해 감소 +' },
        { id:'takenDamageReduceWhen2EnemiesPct', min:1, max:5, label:'받는 피해 감소(2마리 이상) +' },
        { id:'takenDamageReduceWhen1EnemyPct', min:1, max:5, label:'받는 피해 감소(1마리) +' },
        { id:'igniteDamageReducePct', min:3, max:10, label:'받는 점화 피해 감소 +' },
        { id:'bleedDamageReducePct', min:3, max:10, label:'받는 출혈 피해 감소 +' },
        { id:'poisonDamageReducePct', min:3, max:10, label:'받는 중독 피해 감소 +' }
    ];
    let pick = pool[Math.floor(Math.random()*pool.length)];
    let val = pick.min + Math.floor(Math.random() * (pick.max-pick.min+1));
    return { id: `colony_ward_${Date.now()}_${Math.floor(Math.random()*99999)}`, stat: pick.id, val: val, name: `액막이 부적 · ${pick.label}${val}` };
}
function dismantleColonyWardById(id) {
    if (!assertBuildEditable()) return;
    let c = normalizeColonyWardState();
    let idx = c.wardInventory.findIndex(w => w && w.id === id);
    if (idx < 0) return addLog('해체할 액막이 부적을 찾을 수 없습니다.', 'attack-monster');
    let ward = c.wardInventory[idx];
    if (isLockedInventoryObject(ward)) return addLog('잠금된 액막이 부적은 해체할 수 없습니다.', 'attack-monster');
    let gain = getColonyWardDismantleReward(ward);
    c.wardInventory.splice(idx, 1);
    game.currencies.colonyShard = Math.max(0, Math.floor(game.currencies.colonyShard || 0)) + gain;
    addLog(`🛡️ 액막이 부적 해체 완료 · 군락지 편린 +${gain}`, 'loot-normal');
    updateStaticUI();
}

async function bulkDismantleColonyWardsBySearch(salvageUnmatched) {
    if (!assertBuildEditable()) return;
    let c = normalizeColonyWardState();
    let wardQuery = getColonyWardSearchQuery();
    let targets = [];
    let lockedSkipped = 0;
    (c.wardInventory || []).forEach((ward, idx) => {
        let matched = matchColonyWardSearchQuery(getColonyWardSearchText(ward), wardQuery);
        if (!(salvageUnmatched ? !matched : matched)) return;
        if (isLockedInventoryObject(ward)) { lockedSkipped++; return; }
        targets.push({ ward, idx });
    });
    if (targets.length <= 0) return addLog(`해체 대상 액막이 부적이 없습니다.${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'attack-monster');
    if (!await requestGameConfirmation(`액막이 부적 ${targets.length}개를 해체합니다.\n장착 중이거나 잠긴 액막이는 보호됩니다.`, {
        title: '액막이 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targets.length}개 해체`
    })) return;
    let targetIds = new Set(targets.map(row => row.ward && row.ward.id).filter(Boolean));
    let gained = 0;
    c.wardInventory = (c.wardInventory || []).filter(ward => {
        if (!ward || !targetIds.has(ward.id)) return true;
        gained += getColonyWardDismantleReward(ward);
        return false;
    });
    game.currencies.colonyShard = Math.max(0, Math.floor(game.currencies.colonyShard || 0)) + gained;
    addLog(`🛡️ 액막이 부적 ${targets.length}개 해체 완료 · 군락지 편린 +${gained}${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}

function equipColonyWardById(id){
    let c = normalizeColonyWardState();
    let idx = c.wardInventory.findIndex(w => w && w.id === id); if (idx < 0) return;
    let slotMax = Math.max(1, Math.min(COLONY_WARD_MAX_SLOTS, Math.floor(c.wardSlots || 1)));
    let slot = -1; for (let i = 0; i < slotMax; i++) { if (!c.wardEquipped[i]) { slot = i; break; } }
    if (slot < 0) return addLog('장착 가능한 액막이 부적 슬롯이 없습니다. 부적 탭에서 슬롯을 확장하세요.', 'attack-monster');
    c.wardEquipped[slot] = c.wardInventory[idx]; c.wardInventory.splice(idx, 1); updateStaticUI();
}
function unequipColonyWard(slot){ let c = normalizeColonyWardState(); slot = Math.floor(slot || 0); if(!c.wardEquipped[slot]) return; c.wardInventory.push(c.wardEquipped[slot]); c.wardEquipped[slot]=null; updateStaticUI(); }
function unlockColonyWardSlot(){
    let c = normalizeColonyWardState();
    let nextSlot = Math.max(2, Math.floor(c.wardSlots || 1) + 1);
    if (nextSlot > COLONY_WARD_MAX_SLOTS) return addLog('🛡️ 액막이 부적 슬롯은 이미 4/4입니다.', 'level-up');
    let cost = getColonyWardSlotCost(nextSlot);
    if (!canPayColonyWardCost(cost)) return addLog(`액막이 슬롯 확장 재화가 부족합니다. 필요: ${formatColonyWardCost(cost)}`, 'attack-monster');
    let paidLabel = formatColonyWardCost(cost);
    Object.keys(cost).forEach(key => { game.currencies[key] = Math.max(0, Math.floor(game.currencies[key] || 0) - cost[key]); });
    c.wardSlots = nextSlot;
    addLog(`🛡️ 액막이 부적 슬롯 ${nextSlot}/4 해금 (${paidLabel})`, 'level-up');
    updateStaticUI();
}

function startColonyRun(){
    let c = game.colony || (game.colony = {});
    if ((game.currencies.colonyTrace||0)<=0 || c.inRun) return;
    game.currencies.colonyTrace--;
    c.inRun = true; c.wave = 1; c.kills = 0; c.requiredKills = 16; c.entryDeepChaosDepth = Math.max(21, Math.floor(game.abyssEndlessDepth||21));
    c.returnZoneId = game.currentZoneId;
    game.currentZoneId = 'colony_run';
    game.enemies = []; game.encounterPlan = []; game.encounterIndex = 0; game.runProgress = 0; game.moveTimer = 0;
    spawnColonyWave();
    addLog(`🪲 군락지 방어전 시작! 기준 난이도: 혼돈 심화 ${c.entryDeepChaosDepth}`, 'season-up');
    updateStaticUI();
}
function forfeitColonyRun(){ let c=game.colony||{}; if(!c.inRun)return; c.inRun=false; game.currentZoneId = c.returnZoneId!==undefined&&c.returnZoneId!==null?c.returnZoneId:getAutoProgressZoneId(game.maxZoneId); addLog('군락지 방어전을 포기했습니다.', 'attack-monster'); updateStaticUI(); }
function spawnColonyWave(){
    let c = game.colony || {}; let zone = getZone('colony_run') || getZone(0);
    let count = Math.max(10, Math.min(36, 10 + Math.floor((c.wave||1)*2)));
    game.enemies=[];
    for (let i=0;i<count;i++){
        let marker = { elite: Math.random() < 0.22 + Math.min(0.35, (c.wave||1)*0.02), boss: false };
        if (i===count-1 && (c.wave||1)%5===0) { marker.elite=true; marker.boss=true; }
        let enemy = createEnemy(zone, marker, i);
        let hpMul = marker.boss ? 9.5 : (marker.elite ? 4.8 : 3.4);
        enemy.maxHp = Math.floor(enemy.maxHp * hpMul); enemy.hp = enemy.maxHp;
        enemy.atkMul *= marker.boss ? 1.45 : (marker.elite ? 1.2 : 1.05);
        enemy.moveSpeed = marker.boss ? 0.35 : (marker.elite ? 0.55 : 0.8);
        enemy.name = marker.boss ? '🦂 군락지 지배체' : (marker.elite ? '정예 🪲 군락지 벌레' : '🪲 군락지 벌레');
        game.enemies.push(enemy);
    }
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
        autoBtn.innerText = `대균열 자동입장 ${game.settings && game.settings.autoEnterGrandBreach ? 'ON' : 'OFF'}`;
    }
    if (!open) return;
    let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun || {};
    if (g.inRun && game.currentZoneId !== 'grand_breach_run') {
        g.inRun = false;
        g.phase = 'failed';
        g.timeLeft = 0;
        v.grandRun = g;
    }
    let progress = v.active ? `${Math.max(0, Math.floor(v.activeKills || 0))}/${Math.max(1, Math.floor(v.requiredKills || 0))}` : '-';
    let phase = g.phase === 'survival' ? '생존전' : '보스전';
    let grandText = (g.inRun && game.currentZoneId === 'grand_breach_run') ? ` · 대균열: <strong>${phase}</strong> · 남은시간: <strong>${Math.max(0, Math.ceil(g.timeLeft || 0))}초</strong> · 처치: <strong>${Math.floor(g.kills || 0)}</strong>` : '';
    let canEnter = v.grandBreachUnlock && !g.inRun;
    panel.innerHTML = `<div style="color:#c7d2ff;">활성 균열: <strong>${v.active ? '진행중' : '없음'}</strong> · 균열 진행: <strong>${progress}</strong> · 대균열 해금: <strong>${v.grandBreachUnlock ? '가능' : '잠김'}</strong>${grandText}</div><div style="display:flex; gap:6px; margin-top:8px;"><button class="ominous-entry-btn" onclick="enterGrandBreach()" ${canEnter ? '' : 'disabled'}>대균열 진입</button></div>`;
}

function spawnBeehiveWave(isBoss){
    let b = game.beehive || {};
    let zone = getZone('beehive_run') || getZone(0);
    let step = Math.max(1, Math.floor(b.branchStep || 1));
    let count = isBoss ? 1 : Math.min(10, 5 + Math.floor(step / 2) + Math.floor(Math.random() * 2));
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    for (let i = 0; i < count; i++) {
        let marker = { elite: !isBoss && Math.random() < 0.78, boss: isBoss };
        let enemy = createEnemy(zone, marker, i);
        let depthScale = 1 + Math.max(0, step) * 0.16 + Math.max(0, Math.floor(b.enemyEmpower || 0)) * 0.22;
        enemy.maxHp = Math.floor(enemy.maxHp * depthScale);
        enemy.hp = enemy.maxHp;
        enemy.atkMul *= (1 + Math.max(0, Math.floor(b.enemyEmpower || 0)) * 0.12);
        if (isBoss) {
            enemy.name = '👑 벌집 여왕';
            enemy.maxHp = Math.floor(enemy.maxHp * 2.4);
            enemy.hp = enemy.maxHp;
            enemy.atkMul *= 1.75;
            enemy.critChance = (enemy.critChance || 0) + 14;
            enemy.penetration = (enemy.penetration || 0) + 18;
            enemy.traitName = `분노한 군체 (강화 ${Math.floor(b.enemyEmpower || 0)})`;
        } else {
            enemy.name = `${enemy.isElite ? '정예 ' : ''}🐝 벌집 전투벌`;
            enemy.traitName = enemy.traitName || '벌떼 돌격';
        }
        game.enemies.push(enemy);
    }
    if (isBoss) addLog('👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다.', 'loot-unique');
    else addLog(`🐝 벌떼 웨이브 시작! 진행도 ${Math.min(100, step * 10)}% · 남은 적을 모두 처치해야 다음 갈림길이 열립니다.`, 'attack-monster');
}
function getBeekeeperLevelForHive() {
    return typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
}
function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = [];
    b.queenActive = false;
}
function getBeehiveRewardAmount(base, branchStep, expertLevel) {
    let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
    let expertBonus = Math.max(0, expertLevel - 1) * 0.03;
    let nodeBonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('beehiveRewardPct') || 0) / 100 : 0;
    return Math.max(1, Math.floor(base * (1 + depthBonus + expertBonus + nodeBonus)));
}
function getBeehivePenaltyPool(expertLevel, branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { key: 'swarm', text: '군체 분노 +1', power: 1, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 1)); } },
        { key: 'sting', text: '독침 상처(체력 -5%)', power: 1, apply: () => { game.playerHp = Math.max(1, Math.floor((game.playerHp || 1) * 0.95)); } },
        { key: 'pollen_tax', text: '꽃가루 -6', power: 1, apply: () => { game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 6); } }
    ];
    if (depth >= 4) pool.push({ key: 'deep_swarm', text: '심층 군체 분노 +2', power: 2, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 2)); } });
    if (expertLevel >= 4) pool.push({ key: 'venom_tax', text: '독벌침 소모 가능', power: 1, apply: () => { if (Math.random() < 0.25) game.currencies.venomStinger = Math.max(0, (game.currencies.venomStinger || 0) - 1); } });
    if (expertLevel >= 6) pool.push({ key: 'honey_tax', text: '벌꿀 소모 가능', power: 1, apply: () => { if (Math.random() < 0.20) game.currencies.enchantedHoney = Math.max(0, (game.currencies.enchantedHoney || 0) - 1); } });
    if (expertLevel >= 10) pool.push({ key: 'royal_swarm', text: '왕실 군체 분노 +3', power: 3, apply: b => { b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + 3)); } });
    return pool;
}
function getBeehiveRewardPool(expertLevel, branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { type: 'pollen', weight: 42 },
        { type: 'honey', weight: expertLevel >= 2 ? 18 : 8 },
        { type: 'stinger', weight: expertLevel >= 4 ? 16 : 6 }
    ];
    if (expertLevel >= 3) pool.push({ type: 'chaos', weight: 14 + Math.min(8, depth) });
    if (expertLevel >= 5) pool.push({ type: 'divine', weight: 2 + Math.floor(depth / 4) + (expertLevel >= 13 ? 2 : 0) });
    if (expertLevel >= 7 || depth >= 6) pool.push({ type: 'jewelShard', weight: 10 }, { type: 'meteorShard', weight: 5 });
    if (expertLevel >= 8) pool.push({ type: 'spore', weight: 8 }, { type: 'beeswax', weight: 10 });
    if (expertLevel >= 15) pool.push({ type: 'bundle', weight: 4 });
    let rarePct = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('expertRareChancePct')) : 0;
    if (rarePct > 0) pool.forEach(row => { if (row.type === 'divine' || row.type === 'bundle') row.weight = Math.max(0, (row.weight || 0) * (1 + rarePct / 100)); });
    return pool;
}
function pickWeightedBeehiveReward(expertLevel, branchStep, usedTypes) {
    let used = usedTypes || new Set();
    let pool = getBeehiveRewardPool(expertLevel, branchStep).filter(row => !used.has(row.type));
    if (pool.length <= 0) pool = getBeehiveRewardPool(expertLevel, branchStep);
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
    let lv = getBeekeeperLevelForHive();
    let used = new Set();
    let immediate = pickWeightedBeehiveReward(lv, nextStep, used);
    used.add(immediate);
    let wave = pickWeightedBeehiveReward(lv, nextStep, used);
    used.add(wave);
    let queen = pickWeightedBeehiveReward(lv, nextStep, used);
    b.pendingChoice = {
        a: buildBeehiveChoiceOption(immediate, lv, nextStep, 'immediate'),
        b: buildBeehiveChoiceOption(wave, lv, nextStep, 'wave'),
        c: buildBeehiveChoiceOption(queen, lv, nextStep, 'queen'),
        expertLevel: lv,
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

function buildBeehiveChoiceOption(type, expertLevel, branchStep, timing = 'wave') {
    let lv = Math.max(1, Math.floor(expertLevel || getBeekeeperLevelForHive()));
    let step = Math.max(1, Math.floor(branchStep || ((game.beehive || {}).branchStep || 1)));
    let penaltyPool = getBeehivePenaltyPool(lv, step);
    let penalty = penaltyPool[Math.floor(Math.random() * penaltyPool.length)];
    let label = getBeehiveRewardTimingLabel(timing);
    let mk = (text, effect, amount, chance) => ({ text: `[${label}] ${text} / 대가: ${penalty.text}`, effect, amount, chance, penalty, expertLevel: lv, timing });
    if (type === 'pollen') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(12 + Math.floor(Math.random() * 7), step, lv), timing); return mk(`꽃가루 +${amount}`, 'pollen', amount); }
    if (type === 'honey') { let chance = scaleBeehiveRewardChance(lv >= 2 ? 0.30 : 0.12, timing); return mk(`벌꿀 획득 확률 ${Math.floor(chance * 100)}%`, 'honey', 1, chance); }
    if (type === 'stinger') { let chance = scaleBeehiveRewardChance(lv >= 4 ? 0.38 : 0.14, timing); return mk(`독벌침 획득 확률 ${Math.floor(chance * 100)}%`, 'stinger', 1, chance); }
    if (type === 'chaos') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(1 + (step >= 7 ? 1 : 0), step, lv), timing); return mk(`카오스 오브 +${amount}`, 'chaos', amount); }
    if (type === 'divine') { let chance = scaleBeehiveRewardChance(lv >= 13 || step >= 8 ? 1 : 0.35, timing); return mk(chance >= 1 ? '신성한 오브 +1' : `신성한 오브 획득 확률 ${Math.floor(chance * 100)}%`, 'divine', 1, chance); }
    if (type === 'jewelShard') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step, lv), timing); return mk(`주얼 파편 +${amount}`, 'jewelShard', amount); }
    if (type === 'meteorShard') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(`운석 파편 +${amount}`, 'meteorShard', amount); }
    if (type === 'beeswax') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(`밀랍 +${amount}`, 'beeswax', amount); }
    if (type === 'spore') {
        let sporeType = rndChoice(['sporeFire', 'sporeCold', 'sporeLight']);
        let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step, lv), timing);
        return mk(`${ORB_DB[sporeType].name} +${amount}`, sporeType, amount);
    }
    if (type === 'bundle') {
        let amount = scaleBeehiveRewardAmount(1, timing);
        return mk(amount > 1 ? `중첩 보상 x${amount}: 꽃가루 + 독벌침 + 카오스` : '중첩 보상: 꽃가루 + 독벌침 + 카오스', 'bundle', amount);
    }
    let amount = scaleBeehiveRewardAmount(10, timing);
    return mk(`꽃가루 +${amount}`, 'pollen', amount);
}
function applyBeehiveChoicePenalty(penalty, b) {
    if (!penalty) return '';
    if (typeof penalty.apply === 'function') { penalty.apply(b); return penalty.text || ''; }
    let power = Math.max(1, Math.floor(penalty.power || 1));
    if (['swarm', 'deep_swarm', 'royal_swarm'].includes(penalty.key)) b.enemyEmpower = Math.max(0, Math.floor((b.enemyEmpower || 0) + power));
    else if (penalty.key === 'sting') game.playerHp = Math.max(1, Math.floor((game.playerHp || 1) * 0.95));
    else if (penalty.key === 'pollen_tax') game.currencies.pollen = Math.max(0, (game.currencies.pollen || 0) - 6);
    else if (penalty.key === 'venom_tax' && Math.random() < 0.25) game.currencies.venomStinger = Math.max(0, (game.currencies.venomStinger || 0) - 1);
    else if (penalty.key === 'honey_tax' && Math.random() < 0.20) game.currencies.enchantedHoney = Math.max(0, (game.currencies.enchantedHoney || 0) - 1);
    return penalty.text || '';
}
function applyBeehiveChoiceReward(pick) {
    if (!pick) return '';
    let chance = Number.isFinite(pick.chance) ? pick.chance : 1;
    if (chance < 1 && Math.random() >= chance) return '보상 획득 실패';
    let amount = Math.max(1, Math.floor(pick.amount || 1));
    if (pick.effect === 'honey') { game.currencies.enchantedHoney = (game.currencies.enchantedHoney || 0) + amount; return `벌꿀 +${amount}`; }
    if (pick.effect === 'stinger') { game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount; return `독벌침 +${amount}`; }
    if (pick.effect === 'bundle') {
        game.currencies.pollen = (game.currencies.pollen || 0) + (20 * amount);
        game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount;
        game.currencies.chaos = (game.currencies.chaos || 0) + amount;
        return `꽃가루 +${20 * amount} / 독벌침 +${amount} / 카오스 +${amount}`;
    }
    if (pick.effect) {
        game.currencies[pick.effect] = (game.currencies[pick.effect] || 0) + amount;
        return `${ORB_DB[pick.effect] ? ORB_DB[pick.effect].name : pick.effect} +${amount}`;
    }
    return '';
}
function startBeehiveRun(){
    let b = game.beehive || (game.beehive = {});
    if ((game.currencies.hiveKey || 0) <= 0 || b.inRun) return;
    let lastDeepChaosDepth = Math.max(21, Math.floor(game.abyssEndlessDepth || 21));
    resetBeehiveRunModifiers(b);
    game.currencies.hiveKey--;
    b.entryDeepChaosDepth = lastDeepChaosDepth;
    b.inRun = true;
    b.branchStep = 0;
    b.inMapZoneId = 'beehive_run';
    b.returnZoneId = game.currentZoneId;
    b.queenActive = false;
    game.currentZoneId = 'beehive_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = true;
    prepareBeehiveBranchChoices(b);
    addLog(`🐝 벌집 원정 시작! 기준 난이도: 혼돈 심화 ${Math.max(21, Math.floor(b.entryDeepChaosDepth || 21))} · 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.`, 'season-up');
    updateStaticUI();
}
function advanceBeehivePath(){
    let b = game.beehive;
    if (!b || !b.inRun || b.awaitingClear || b.pendingChoice || b.queenActive) return;
    prepareBeehiveBranchChoices(b);
    updateStaticUI();
}
function resolveBeehiveChoice(key){
    closeBeehiveChoiceOverlay();
    let b = game.beehive;
    let liveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (!b || !b.pendingChoice || b.awaitingClear || liveEnemies > 0) return;
    let pick = b.pendingChoice[key];
    let nextStep = Math.min(10, Math.max(1, Math.floor((b.branchStep || 0) + 1)));
    if (!pick && (key === 'legacy_now' || key === 'legacy_later')) pick = buildBeehiveChoiceOption(key === 'legacy_now' ? 'pollen' : 'honey', getBeekeeperLevelForHive(), nextStep);
    if (!pick) return;
    let penaltyText = applyBeehiveChoicePenalty(pick.penalty, b);
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
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_branch_choice');
    b.pendingChoice = null;
    b.branchStep = nextStep;
    b.awaitingClear = true;
    b.queenActive = false;
    game.runProgress = Math.min(100, b.branchStep * 10);
    game.combatHalted = false;
    let timingText = pick.timing === 'immediate' ? `즉시 지급(${rewardResult || '보상 없음'})` : (pick.timing === 'queen' ? `여왕벌 처치 후 지급(${rewardText || '보상 없음'})` : `웨이브 처치 후 지급(${rewardText || '보상 없음'})`);
    addLog(`🐝 갈림길 ${b.branchStep}/10 선택 완료: ${timingText} · 대가: ${penaltyText || '없음'} · 벌떼 웨이브 시작`, 'loot-magic');
    spawnBeehiveWave(false);
    updateStaticUI();
}
function exitBeehiveRun(message, logType){
    closeBeehiveChoiceOverlay();
    let b = game.beehive || {};
    b.inRun = false;
    b.branchStep = 0;
    resetBeehiveRunModifiers(b);
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    if (message) addLog(message, logType || 'attack-monster');
    updateStaticUI();
}
function completeBeehiveRun(){
    closeBeehiveChoiceOverlay();
    let b = game.beehive || {};
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
    game.currentZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    b.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    markLoopSpecialBossKill('beehive_queen');
    unlockJournalEntry('beehive_queen');
    if (Math.random() < 0.08) {
        let item = generateUniqueItem(Math.max(12, (getZone(game.currentZoneId) || { tier: 12 }).tier), '무기');
        addItemToInventory(item);
    }
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_clear');
    addLog(`👑 여왕벌 처치! 벌집 클리어 체크가 영구 적용되고 벌집 패널티가 초기화되었습니다.${queenRewardResults.length ? ` 여왕벌 보상: ${queenRewardResults.join(' / ')}` : ''}`, 'level-up');
    updateStaticUI();
}
function onBeehiveWaveCleared(){
    let b = game.beehive || {};
    if (!b.inRun || !b.awaitingClear) return;
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
    if ((b.branchStep || 0) >= 10) {
        b.awaitingClear = true;
        b.queenActive = true;
        game.combatHalted = false;
        spawnBeehiveWave(true);
        if (rewardResult) addLog(`🐝 벌떼 웨이브 정리 완료: ${rewardResult}. 여왕벌이 등장합니다.`, 'loot-unique');
        updateStaticUI();
        return;
    }
    prepareBeehiveBranchChoices(b);
    addLog(`🐝 벌떼 웨이브 정리 완료${rewardResult ? `: ${rewardResult}` : ''}. 다음 갈림길을 선택할 수 있습니다. (${b.branchStep}/10)`, 'loot-magic');
    openBeehiveChoiceOverlay(rewardResult ? `웨이브 보상: ${rewardResult}` : '웨이브를 정리했습니다.');
    updateStaticUI();
}
function forfeitBeehiveRun(){ let b=game.beehive; if(!b.inRun) return; exitBeehiveRun('벌집 원정을 포기하고 탈출했습니다.', 'attack-monster'); }
function craftBeehiveCurrency(type){ let beeLv=typeof getExpertLevel==='function'?Math.max(1,Math.floor(getExpertLevel('beekeeper')||1)):1; if(type==='wax'&&beeLv<8) return addLog('밀랍 제작은 양봉업자 Lv.8에 해금됩니다.', 'attack-monster'); if(type!=='key'&&type!=='wax'&&beeLv<6) return addLog('벌꿀/독벌침 교환은 양봉업자 Lv.6에 해금됩니다.', 'attack-monster'); let cost= type==='key'?200:type==='wax'?350:type==='stinger'?600:2000; let discount=typeof getExpertCombinedCostReduction==='function'?getExpertCombinedCostReduction(type==='wax'?'waxCostReducePct':null):0; cost=Math.max(1,Math.floor(cost*(1-discount))); if((game.currencies.pollen||0)<cost) return; game.currencies.pollen-=cost; if(type==='key') { game.currencies.hiveKey=(game.currencies.hiveKey||0)+1; } if(type==='stinger') game.currencies.venomStinger=(game.currencies.venomStinger||0)+1; if(type==='honey') game.currencies.enchantedHoney=(game.currencies.enchantedHoney||0)+1; if(type==='wax') game.currencies.beeswax=(game.currencies.beeswax||0)+1; if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_currency_craft'); updateStaticUI(); }
function triggerVoidBreach(){ let v=game.voidRift; v.active=true; addLog('🕳️ 공허의 구멍이 열렸습니다! 몬스터가 쏟아집니다.', 'attack-monster'); updateStaticUI(); }
function clearVoidBreach(){ let v=game.voidRift; if(!v.active) return; v.active=false; v.breachClears=(v.breachClears||0)+1; if((v.breachClears||0) >= 1 || Math.random()<0.12) v.grandBreachUnlock=true; game.currencies.voidChisel=(game.currencies.voidChisel||0)+(Math.random()<0.03?1:0); addLog('공허 균열 정리 완료. 낮은 확률로 큰 구멍이 열립니다.', 'loot-magic'); autoEnterGrandBreachIfReady(); updateStaticUI(); }
function canAutoEnterGrandBreach(){
    let v = game.voidRift || {};
    let g = v.grandRun || {};
    let beehiveRunning = typeof isBeehiveRunLockedForMapTravel === 'function' ? isBeehiveRunLockedForMapTravel() : !!(game.beehive && game.beehive.inRun);
    return !!(game.settings && game.settings.autoEnterGrandBreach && v.grandBreachUnlock && !g.inRun && !beehiveRunning && game.currentZoneId !== 'grand_breach_run');
}
function autoEnterGrandBreachIfReady(){
    if (!canAutoEnterGrandBreach()) return false;
    enterGrandBreach({ automatic: true });
    addLog('🌌 자동입장: 대균열이 열려 즉시 진입합니다.', 'season-up');
    return true;
}
function enterGrandBreach(options){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let v = game.voidRift;
    if (!v.grandBreachUnlock) return;
    if (v.grandRun && v.grandRun.inRun && game.currentZoneId !== 'grand_breach_run') {
        v.grandRun.inRun = false;
        v.grandRun.phase = 'failed';
        v.grandRun.timeLeft = 0;
    }
    if (v.grandRun && v.grandRun.inRun) return;
    v.grandBreachUnlock = false;
    v.grandRun = { inRun: true, phase: 'survival', timeLeft: 35, kills: 0, nextRefillAt: 0, lastTickAt: Date.now(), returnZoneId: game.currentZoneId };
    game.currentZoneId = 'grand_breach_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = false;
    if (!options || !options.automatic) addLog('🌌 대균열 진입! 제한 시간 동안 몬스터가 계속 리필됩니다.', 'season-up');
    updateStaticUI();
}

function toggleMeteorAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterMeteor = !game.settings.autoEnterMeteor; addLog(`☄️ 운석 낙하 자동입장 ${game.settings.autoEnterMeteor ? 'ON' : 'OFF'}`, 'season-up'); updateStaticUI(); }
function toggleGrandBreachAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterGrandBreach = !game.settings.autoEnterGrandBreach; addLog(`🌌 대균열 자동입장 ${game.settings.autoEnterGrandBreach ? 'ON' : 'OFF'}`, 'season-up'); autoEnterGrandBreachIfReady(); updateStaticUI(); }

function renderChaosRealmMapPanel() {
    let panel = document.getElementById('ui-chaos-realm-panel');
    let list = document.getElementById('ui-chaos-realm-list');
    if (!panel || !list) return;
    let st = ensureChaosRealmState();
    let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
    if (!st.unlocked) {
        panel.innerHTML = `<div style="font-weight:700; color:#e9d7ff; margin-bottom:6px;">해금 조건</div><div>혼돈 밖 최종보스 나무꾼에게 <strong style="color:#ffd36b;">최대 생명력 10% 이상</strong>의 피해를 준 전투 종료 시 해금됩니다.</div><div style="margin-top:6px; color:#aebde0;">현재 최고 피해율: <strong style="color:${best >= 10 ? '#7dffb2' : '#ffd36b'};">${best.toFixed(1)}%</strong></div>`;
        list.innerHTML = `<div class="map-item"><div class="map-item-main"><span>🔒</span><span>혼돈계 봉인<br><span class="map-zone-status">나무꾼 피해율 10% 이상 필요</span></span></div><div class="map-item-actions"><span class="map-zone-status">${best.toFixed(1)} / 10%</span></div></div>`;
        return;
    }
    let entryReady = canEnterChaosRealm();
    let floor = Math.max(1, Math.floor(st.currentFloor || 1));
    let highest = Math.max(1, Math.floor(st.highestFloor || 1));
    let affixes = getChaosRealmAffixes(floor);
    let bonus = st.permanentBonuses || {};
    let bonusLine = [`피해 +${(bonus.pctDmg||0).toFixed(1)}%`, `이속 +${(bonus.move||0).toFixed(1)}%`, `생명력 +${(bonus.pctHp||0).toFixed(1)}%`, `카오스저항 +${Math.floor(bonus.resChaos||0)}%`, `치명 +${Math.floor(bonus.crit||0)}%`, `관통 +${Math.floor(bonus.resPen||0)}%`, `방어/회피/보호막 +${Math.floor(bonus.armorPct||0)}%`, `치피 +${Math.floor(bonus.critDmg||0)}%`, `공속 +${Math.floor(bonus.aspd||0)}%`].join(' · ');
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;"><div><div style="font-weight:800; color:#efd6ff; font-size:1.05em;">혼돈계 영구 레이어</div><div style="color:#aebde0; margin-top:4px;">루프로 초기화되지 않습니다. 최고 입장층 <strong style="color:#ffd36b;">${highest}층</strong> · 클리어 ${st.clearedFloors.length}층 · 나무꾼 최고 피해율 ${best.toFixed(1)}%</div></div><button onclick="enterChaosRealmPrompt()" ${entryReady ? '' : 'disabled'}>층 선택 입장</button></div><div style="margin-top:8px; color:${entryReady ? '#d6e4ff' : '#ffcf8a'};">${entryReady ? `영구 보너스: ${bonusLine}` : '입장 조건: 이번 루프에서 혼돈 20 클리어 필요 · 진행도/보너스는 보존됨'}</div><div style="margin-top:8px; color:#bda8ff;">현재 선택층 특징: ${affixes.map(a => `${a.name}(${a.desc})`).join(' · ')}</div>${highest >= 10 ? '<div style="margin-top:6px; color:#7dffb2;">혼돈계 10층 효과 활성: 모든 액트 구간 지도 길이 50% 축소</div>' : ''}`;
    let zone = getZone(CHAOS_REALM_ZONE_ID);
    let echo = (game.woodsmanEchoRun && typeof game.woodsmanEchoRun === 'object') ? game.woodsmanEchoRun : { bestDps: 0 };
    let woodsmanEchoUnlocked = Array.isArray(game.journalEntries) && game.journalEntries.includes('woodsman_echo');
    list.innerHTML = `<div class="map-item ${game.currentZoneId === CHAOS_REALM_ZONE_ID ? 'current' : ''}" ${entryReady ? 'onclick="enterChaosRealmPrompt()"' : ''}><div class="map-item-main"><span>🌌</span><span>혼돈계 ${floor}층<br><span class="map-zone-status">난이도 기준: 혼돈 심화 ${zone ? zone.tier : getChaosRealmTier(floor)}급 · 특징 ${affixes.length}개</span></span></div><div class="map-item-actions"><span class="map-zone-status">${entryReady ? `입장 가능: 1 ~ ${highest}` : '혼돈 20 필요'}</span></div></div>`
        + (woodsmanEchoUnlocked ? `<div class="map-item ${game.currentZoneId === WOODSMAN_ECHO_ZONE_ID ? 'current' : ''}" onclick="enterWoodsmanEchoChallenge()"><div class="map-item-main"><span>🪵</span><span>나무꾼의 잔상 (전투력 측정)<br><span class="map-zone-status">30초 전투 · 체력 ? · 공격하지 않는 허수아비(실체력 1000배)</span></span></div><div class="map-item-actions"><span class="map-zone-status">최고 DPS ${Math.floor(echo.bestDps || 0).toLocaleString()}</span></div></div>` : '');
}
function renderSkyTowerMapPanel() {
    let panel = document.getElementById('ui-sky-tower-panel');
    let list = document.getElementById('ui-sky-tower-list');
    if (!panel || !list) return;
    let tower = ensureSkyTowerState();
    let unlocked = !!tower.unlocked;
    let ready = typeof canEnterSkyTower === 'function' && canEnterSkyTower();
    let currentFloor = Math.max(1, Math.floor(tower.currentFloor || 1));
    let highest = Math.max(1, Math.floor(tower.highestFloor || 1));
    let remaining = typeof getSkyTowerRemainingClears === 'function' ? getSkyTowerRemainingClears() : 0;
    let limit = typeof getSkyTowerLoopClearLimit === 'function' ? getSkyTowerLoopClearLimit() : 25;
    let cleared = Array.isArray(tower.clearedFloors) ? tower.clearedFloors.length : 0;
    let condensed = Math.floor(tower.condensedPower || 0);
    let zone = getZone(SKY_TOWER_ZONE_ID);
    if (!unlocked) {
        panel.innerHTML = `<div class="sky-tower-head">
            <div>
                <div class="sky-tower-title">☁️ 창공의 탑</div>
                <div class="sky-tower-sub">해금 후 다음 루프부터는 혼돈 입성 시 바로 입장할 수 있습니다.</div>
            </div>
            <span class="sky-tower-lock-chip">🔒 봉인됨</span>
        </div>
        <div class="sky-tower-chips">
            <span class="sky-tower-chip ${(game.season || 1) >= 15 ? 'done' : ''}">루프 15 이후 ${(game.season || 1) >= 15 ? '✔' : `(현재 루프 ${game.season || 1})`}</span>
            <span class="sky-tower-chip">이번 루프 혼돈계 20층 클리어</span>
        </div>`;
        list.innerHTML = `<div class="map-item map-item--sky-tower" style="opacity:.65; cursor:not-allowed;"><div class="map-item-main"><span>🔒</span><span>창공의 탑 봉인<br><span class="map-zone-status">${(game.season || 1) >= 15 ? '혼돈계 20층 클리어 필요' : '루프 15 필요'}</span></span></div><div class="map-item-actions"><button disabled>층 선택 입장</button></div></div>`;
        return;
    }
    panel.innerHTML = `<div class="sky-tower-head">
        <div>
            <div class="sky-tower-title">☁️ 창공의 탑</div>
            <div class="sky-tower-sub">일반 맵보다 길이가 5배입니다. 처음 클리어하는 층은 응축된 창공의 힘을 확정 지급하고, 이미 클리어한 층은 낮은 확률로 지급합니다.</div>
        </div>
        <button onclick="enterSkyTowerPrompt()" ${ready ? '' : 'disabled'}>층 선택 입장</button>
    </div>
    <div class="sky-tower-chips">
        <span class="sky-tower-chip">남은 클리어 <b>${remaining}/${limit}</b></span>
        <span class="sky-tower-chip">영구 클리어 <b>${cleared}층</b></span>
        <span class="sky-tower-chip">최고 입장층 <b>${highest}층</b></span>
        <span class="sky-tower-chip">응축된 창공의 힘 <b>${condensed}</b></span>
        <span class="sky-tower-chip">선택층 난이도 <b>${zone ? zone.tier : getSkyTowerTier(currentFloor)}급</b></span>
    </div>
    <div class="sky-tower-note" style="color:${ready ? '#7dffb2' : '#ffcf8a'};">${ready ? '입장 가능: 1층부터 최고 입장층까지 원하는 층을 선택할 수 있습니다.' : '이번 루프 혼돈 입성 후 입장할 수 있습니다.'}</div>`;
    list.innerHTML = `<div class="map-item map-item--sky-tower ${game.currentZoneId === SKY_TOWER_ZONE_ID ? 'current' : ''}" ${ready ? 'onclick="enterSkyTowerPrompt()"' : ''} style="${ready ? '' : 'opacity:.65; cursor:not-allowed;'}"><div class="map-item-main"><span>☁️</span><span>창공의 탑 ${currentFloor}층<br><span class="map-zone-status">입장 가능 층 1 ~ ${highest} · 영구 클리어 ${cleared}층</span></span></div><div class="map-item-actions"><span class="map-zone-status">${ready ? `잔여 클리어 ${remaining}/${limit}` : '혼돈 입성 필요'}</span><button ${ready ? '' : 'disabled'}>층 선택 입장</button></div></div>`;
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

function renderOceanPermanentUpgradeRows(st) {
    if (typeof OCEAN_PERMANENT_UPGRADE_KEYS === 'undefined') return '';
    return OCEAN_PERMANENT_UPGRADE_KEYS.map(key => {
        let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
        let level = getOceanPermanentUpgradeLevel(key);
        let value = getOceanPermanentUpgradeEffect(key);
        let cost = typeof getOceanPermanentUpgradeCost === 'function' ? getOceanPermanentUpgradeCost(key) : null;
        let costText = typeof getOceanUpgradeCostText === 'function' ? getOceanUpgradeCostText(cost) : '';
        let disabled = !cost || (typeof canPayOceanUpgradeCost === 'function' && !canPayOceanUpgradeCost(cost));
        return `<div style="border:1px solid rgba(79,209,255,.22); border-radius:8px; padding:8px; background:rgba(6,18,32,.45);">
            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center; flex-wrap:wrap;">
                <div><b style="color:#8fe3ff;">${def.label}</b> Lv.${level}/${def.maxLevel} <span style="color:#cdefff;">(+${value}${def.unit})</span><br><span style="color:#9fb4d1; font-size:.86em;">${def.desc}</span></div>
                <button onclick="upgradeOceanPermanent('${key}'); renderOceanDepthMapPanel(); renderFishingPanel();" ${disabled ? 'disabled' : ''}>강화</button>
            </div>
            <div style="margin-top:4px; color:#b7c9de; font-size:.84em;">필요: ${costText || '최대 단계'}</div>
        </div>`;
    }).join('');
}

function renderOceanDepthMapPanel() {
    let panel = document.getElementById('ui-ocean-panel');
    let list = document.getElementById('ui-ocean-list');
    if (!panel || !list) return;
    let st = ensureOceanState();
    if (!st.unlocked) {
        panel.innerHTML = `<div class="sky-tower-head"><div><div class="sky-tower-title">🌊 심해</div><div class="sky-tower-sub">루프 ${OCEAN_UNLOCK_LOOP} 이후 해금됩니다.</div></div><span class="sky-tower-lock-chip">🔒 봉인됨</span></div>`;
        list.innerHTML = '';
        return;
    }
    let oxygenPct = Math.round((st.oxygenCur / Math.max(1, st.oxygenMax)) * 100);
    let drainPerSec = getOceanOxygenDrainPerSec();
    let perAttackCost = typeof getOceanOxygenPerAttackCost === 'function' ? getOceanOxygenPerAttackCost() : 0;
    let secsLeft = drainPerSec > 0 ? Math.floor(st.oxygenCur / drainPerSec) : 0;
    let depthTier = getOceanDepthTier(st.depthM);
    let upgradeRows = renderOceanPermanentUpgradeRows(st);
    panel.innerHTML = `<div class="sky-tower-head">
        <div>
            <div class="sky-tower-title">🌊 심해 잠수 <span style="color:#ffce6b; font-size:0.7em; border:1px solid #ffce6b; border-radius:4px; padding:1px 5px; vertical-align:middle;">⚠ 테스트 중</span></div>
            <div class="sky-tower-sub" style="color:#ffce6b;">⚠ 현재 테스트 중인 컨텐츠입니다. 밸런스·보상·기능이 예고 없이 변경되거나 초기화될 수 있습니다.</div>
            <div class="sky-tower-sub">수심이 깊어질수록 수압 디버프(공속/피해/이동속도 감소)가 강해지고, 산소가 다 떨어지면 시간이 지날수록 커지는 익사 피해를 입습니다. 쓰러지기 직전에는 수면으로 복귀합니다.</div>
        </div>
        ${st.diving ? `<button onclick="forceSurfaceOcean('manual'); changeZone(Math.max(0, game.maxZoneId || 0)); updateStaticUI();">수면으로 복귀</button>` : `<button onclick="enterOceanDive(); changeZone(OCEAN_ZONE_ID); updateStaticUI();">잠수 시작 (${st.checkpointM}m부터)</button>`}
    </div>
    <div class="sky-tower-chips">
        <span class="sky-tower-chip">현재 수심 <b>${Math.floor(st.depthM)}m</b></span>
        <span class="sky-tower-chip">체크포인트 <b>${st.checkpointM}m</b></span>
        <span class="sky-tower-chip">수압 단계 <b>${depthTier}</b></span>
        <span class="sky-tower-chip" title="산소 최대치 ${st.oxygenMax}. 이동 속도가 높을수록 시간당 소모가 빨라지고(현재 ${drainPerSec.toFixed(2)}/초), 공격 1회마다 추가로 ${perAttackCost}씩 소모됩니다. 잔여 약 ${secsLeft}초">🫧 산소 <b>${oxygenPct}%</b> (${Math.ceil(st.oxygenCur)}/${st.oxygenMax})</span>
    </div>
    <div style="margin-top:10px; display:grid; gap:8px;">
        <div style="color:#8fe3ff; font-weight:bold;">🌊 심해 영구 업그레이드</div>
        <div class="sky-tower-sub">창공의 힘을 주재료로, 군주의 핵은 3단계마다, 심해 재화는 매 단계 소모합니다. 루프가 진행되어도 유지됩니다.</div>
        ${upgradeRows}
    </div>
    <div class="sky-tower-sub" style="margin-top:8px;">🎣 낚시·암초 조각·바다의 선물(제작)은 상단 <b>🎣 낚시</b> 탭에서 관리할 수 있습니다.</div>`;
    list.innerHTML = `<div class="map-item ${game.currentZoneId === OCEAN_ZONE_ID ? 'current' : ''}" ${st.diving ? `onclick="changeZone(OCEAN_ZONE_ID)"` : ''} style="${st.diving ? '' : 'opacity:.65;'}"><div class="map-item-main"><span>🌊</span><span>심해 ${Math.floor(st.depthM)}m<br><span class="map-zone-status">${st.diving ? '잠수 중' : '잠수를 시작하세요'}</span></span></div></div>`;
}

function renderFishingPanel() {
    let panel = document.getElementById('ui-fishing-panel');
    if (!panel) return;
    let st = ensureOceanState();
    if (!st.unlocked) {
        panel.innerHTML = `<div class="sky-tower-head"><div><div class="sky-tower-title">🎣 낚시</div><div class="sky-tower-sub">루프 ${OCEAN_UNLOCK_LOOP} 이후 심해가 해금되면 낚시를 할 수 있습니다.</div></div><span class="sky-tower-lock-chip">🔒 봉인됨</span></div>`;
        return;
    }
    let fishRows = Object.keys(OCEAN_FISH_DB).map(key => {
        let f = OCEAN_FISH_DB[key];
        let n = st.fishStock[key] || 0;
        return `<span class="sky-tower-chip" title="${f.desc || ''}">${f.name} <b>${n}</b></span>`;
    }).join('');
    panel.innerHTML = `<div class="sky-tower-head">
        <div>
            <div class="sky-tower-title">🎣 낚시</div>
            <div class="sky-tower-sub">심해에서 잠수하며 전투로 낚시 게이지를 채우면 수심에 맞는 어종을 낚습니다. 낚은 어종은 아래 <b>🎁 바다의 선물</b> 제작에 사용됩니다.</div>
        </div>
    </div>
    <div class="sky-tower-chips">
        <span class="sky-tower-chip">낚시 게이지 <b>${Math.floor(st.fishingGauge)}%</b></span>
        <span class="sky-tower-chip">설치된 암초 조각 <b>${st.reefInstalled}/10</b> (게이지 +${st.reefInstalled * 15}%)</span>
    </div>
    <div style="margin-top:8px; display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
        <button onclick="installOceanReefFragment(); renderFishingPanel();">암초 조각 설치 (보유 ${game.currencies.reefFragment || 0})</button>
    </div>
    <div style="margin-top:12px; color:#8fe3ff; font-weight:bold;">보유 어종</div>
    <div class="sky-tower-chips" style="margin-top:4px;">${fishRows}</div>`;
}

const OCEAN_MOD_CATEGORY_OPTIONS = ['공격', '방어·생명', '속도·치명', '저항'];
function renderSeaGiftRecipeCard(recipe, st) {
    let ready = Object.keys(recipe.requires).every(key => (st.fishStock[key] || 0) >= recipe.requires[key]);
    let reqText = Object.keys(recipe.requires).map(key => `${OCEAN_FISH_DB[key].name} ${st.fishStock[key] || 0}/${recipe.requires[key]}`).join(', ');
    let needsCategory = recipe.effect.type === 'guaranteedTaggedMod' || recipe.effect.type === 'taggedReroll' || recipe.effect.type === 'convertCategoryMod' || (recipe.effect.type === 'lockMod' && recipe.effect.bonusTaggedReroll);
    let inlineId = `seaGiftCategory_${recipe.id}`;
    let categorySelect = needsCategory ? `<select id="${inlineId}" style="margin-top:4px;">${OCEAN_MOD_CATEGORY_OPTIONS.map(cat => `<option value="${cat}">${cat}</option>`).join('')}</select>` : '';
    let onclick = needsCategory
        ? `craftSeaGift('${recipe.id}', null, { category: document.getElementById('${inlineId}').value }); renderSeaGiftPanel(); renderFishingPanel();`
        : `craftSeaGift('${recipe.id}'); renderSeaGiftPanel(); renderFishingPanel();`;
    return `<div style="border-bottom:1px solid #1f5b73; padding:8px 0;">
        <div style="color:#8fe3ff;">${recipe.desc}</div>
        <div style="font-size:0.85em; color:#9fcbe0;">필요: ${reqText}</div>
        ${categorySelect}
        <button onclick="${onclick}" ${ready ? '' : 'disabled'} style="margin-top:4px;">제작</button>
    </div>`;
}
function renderSeaGiftPanel() {
    let panel = document.getElementById('ui-sea-gift-panel');
    if (!panel) return;
    let st = ensureOceanState();
    if (!st.unlocked) { panel.innerHTML = ''; return; }
    let ultraRareIds = new Set(['tidelordKoi', 'prismaticHorror', 'kingLeviathan']);
    let normalRecipes = SEA_GIFT_RECIPES.filter(r => !Object.keys(r.requires).some(key => ultraRareIds.has(key)));
    let ultraRecipes = SEA_GIFT_RECIPES.filter(r => Object.keys(r.requires).some(key => ultraRareIds.has(key)));
    panel.innerHTML = `<div style="color:#ffce6b; font-size:0.85em; border:1px solid #ffce6b; border-radius:4px; padding:4px 8px; margin:4px 0;">⚠ 테스트 중인 컨텐츠입니다. 레시피 효과·재료·밸런스가 예고 없이 변경될 수 있습니다.</div>`
        + `<div style="color:#8fe3ff; font-weight:bold; margin:4px 0;">일반 레시피</div>`
        + normalRecipes.map(recipe => renderSeaGiftRecipeCard(recipe, st)).join('')
        + `<div style="color:#ffce6b; font-weight:bold; margin:10px 0 4px;">초강력 레시피 (초희귀 어종 필요)</div>`
        + ultraRecipes.map(recipe => renderSeaGiftRecipeCard(recipe, st)).join('');
}

function renderUnderworldMapPanel() {
    let panel = document.getElementById('ui-underworld-panel');
    let list = document.getElementById('ui-underworld-list');
    if (!panel || !list) return;
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
    let highest = Math.max(1, Math.floor(uw.highestFloor || 1));
    let canEnter = typeof canEnterUnderworld === 'function' && canEnterUnderworld();
    let runeState = game.underworldRunes || { unlockedSlots: 0, unlockedRunesMaxNumber: 0 };
    let runeCountMap = getUnderworldRuneCountMap(runeState.obtainedRunes);
    let runeLine = Object.keys(runeCountMap).sort((a,b)=>Number(a)-Number(b)).slice(0, 12).map(k => {
        let runeNo = Number(k);
        let def = getUnderworldRuneDef(runeNo);
        let label = def ? def.name : ('룬' + k);
        return `<button type="button" class="underworld-rune-chip" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${runeNo})" onmousemove="showUnderworldRuneTooltip(event,${runeNo})" onmouseleave="hideInfoTooltip()">${label}×${runeCountMap[k]}</button>`;
    }).join('');
    let equippedLine = (Array.isArray(runeState.equippedRunes) ? runeState.equippedRunes : []).slice(0, 6).map((no, idx) => {
        if (idx >= Math.max(0, Math.floor(runeState.unlockedSlots || 0))) return '';
        let def = no ? getUnderworldRuneDef(no) : null;
        let label = def ? `${def.name} (${getUnderworldRuneEffectHtml(no)})` : '비어있음';
        return `<div class="underworld-equipped-row">[${idx + 1}] ${label}</div>`;
    }).filter(Boolean).join('');
    let runeShardCount = Math.max(0, Math.floor((game.currencies || {}).runeShard || 0));
    let ticketLine = [
        `화염 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFlame || 0))}`,
        `냉기 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFrost || 0))}`,
        `번개 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketStorm || 0))}`,
        `카오스 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketChaos || 0))}`
    ].join(' · ');
    let skyTower = ensureSkyTowerState();
    let skyStoneLevel = Math.max(0, Math.floor(((skyTower.skyStone || {}).level) || 0));
    let skyStonePct = typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0;
    let skyStoneCost = typeof getSkyStoneNextCost === 'function' ? getSkyStoneNextCost() : 20;
    let skyStoneMaxed = skyStoneLevel >= (typeof getSkyStoneMaxLevel === 'function' ? getSkyStoneMaxLevel() : 15);
    let skyStonePanel = `<div style="margin-top:10px; padding:9px; border:1px solid #44637c; border-radius:10px; background:rgba(35,54,72,0.42);"><div style="font-weight:800; color:#bfe8ff;">☁️ 창공석 ${skyStoneLevel > 0 ? `+${skyStoneLevel}` : '(미제작)'}</div><div style="margin-top:3px; color:#9fc6dd;">주변의 중력이 일그러질 정도로 창공의 힘이 응축된 돌</div><div style="margin-top:4px; color:#d6e4ff;">지하계 패널티 감소: <strong>${skyStonePct}%</strong> / 75% · 응축된 창공의 힘 <strong>${Math.floor(skyTower.condensedPower || 0)}</strong></div><button style="margin-top:6px;" onclick="upgradeSkyStone()" ${skyStoneMaxed ? 'disabled' : ''}>${skyStoneLevel > 0 ? '창공석 강화' : '창공석 제작'} (${skyStoneMaxed ? '최대' : `필요 ${skyStoneCost}`})</button></div>`;
    let slots = Array.from({ length: 6 }).map((_, idx) => {
        let no = (Array.isArray(runeState.equippedRunes) ? runeState.equippedRunes : [])[idx];
        let unlocked = idx < Math.max(0, Math.floor(runeState.unlockedSlots || 0));
        let def = no ? getUnderworldRuneDef(no) : null;
        let label = unlocked ? (def ? def.name : (no ? `룬${no}` : '비어있음')) : '잠김';
        let effect = unlocked && def ? getUnderworldRuneEffectHtml(no) : (unlocked ? '클릭해 장착' : '슬롯 해금 필요');
        let tooltip = no ? `showUnderworldRuneTooltip(event,${no})` : '';
        let attrs = unlocked ? `onclick="openUnderworldRuneOverlay(${idx})" data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"` : 'disabled';
        return `<button type="button" class="underworld-rune-slot ${unlocked ? 'unlocked' : 'locked'}" ${attrs}><span class="underworld-rune-slot-no">${idx + 1}</span><strong>${label}</strong><small>${effect}</small></button>`;
    }).join('');
    panel.innerHTML = `<div style="font-weight:800; color:#e4d8ff;">지하계: 핵으로 하강</div><div style="margin-top:4px; color:${canEnter ? '#d6e4ff' : '#ffcf8a'};">입장 조건: 이번 루프 혼돈 20 클리어 필요 · 고중력으로 층이 깊어질수록 이속/공속 감소 · 15층부터 지속 피해</div><div style="margin-top:6px; color:#c9b8ff;">룬 슬롯 ${Math.max(0, Math.floor(runeState.unlockedSlots || 0))}/6 · 해금된 룬 번호 1~${Math.max(0, Math.floor(runeState.unlockedRunesMaxNumber || 0))}</div><div class=\"underworld-rune-slots\">${slots}</div><div style="margin-top:4px; color:#9fe3d6;">룬 조각: <strong>${runeShardCount}</strong></div><div style="margin-top:4px; color:#d7c6a0;">지하계 재화: 구리 <strong>${Math.floor((game.currencies||{}).underCopper||0)}</strong> · 은 <strong>${Math.floor((game.currencies||{}).underSilver||0)}</strong> · 금 <strong>${Math.floor((game.currencies||{}).underGold||0)}</strong></div><div style="margin-top:4px; color:#ffd8a8;">우버 뿌리 입장권: ${ticketLine}</div><div style="margin-top:6px;"><button onclick="craftUnderworldRune()">룬 가공 (룬조각 10)</button><button onclick="openUnderworldRuneUpgradeOverlay()" style="margin-left:6px;">룬 승급 (동일 룬 3개 + 룬조각)</button><button onclick="applyUnderworldEnchant()" style="margin-left:6px;">지하계 인챈트</button><button onclick="attemptUnderworldLimitBreak()" style="margin-left:6px;">20% 한계돌파</button><button onclick="enhanceUnderworldRune()" style="margin-left:6px;">룬 강화</button><button onclick="rerollUnderworldRuneBonus()" style="margin-left:6px;">룬 옵션 리롤</button></div>${skyStonePanel}<div style="margin-top:6px; color:#aebde0;">보유 룬:<div class=\"underworld-rune-inventory\">${runeLine || '<span style=\"color:#7f8c8d;\">없음</span>'}${Object.keys(runeCountMap).length > 12 ? '<span style=\"color:#8fa0c4;\">...</span>' : ''}</div></div><div style="margin-top:6px; color:#d6e4ff;">장착 룬(영구 적용):<div class=\"underworld-equipped-list\">${equippedLine || '<span style=\"color:#7f8c8d;\">없음</span>'}</div></div>`;
    list.innerHTML = `<div class="map-item ${game.currentZoneId === UNDERWORLD_ZONE_ID ? 'current' : ''}" ${canEnter ? 'onclick="enterUnderworldPrompt()"' : ''} style="${canEnter ? '' : 'opacity:.65; cursor:not-allowed;'}"><div class="map-item-main"><span>🕳️</span><span>지하계 ${floor}층</span></div><div class="map-item-actions"><button ${canEnter ? '' : 'disabled'}>층 선택 입장</button></div></div>`;
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
    if (!def) return `<span style="color:#8fa0c4;">룬 정보 없음</span>`;
    let tone = typeof getItemStatToneColor === 'function' ? getItemStatToneColor(def.stat) : '#dce6ff';
    return `<span style="color:${tone};">${getStatName(def.stat)} +${formatValue(def.stat, def.val)}</span>`;
}
function buildUnderworldRuneTooltipHtml(no) {
    let def = getUnderworldRuneDef(no);
    if (!def) return '<div class="tooltip-title">알 수 없는 룬</div><div class="tooltip-line">룬 효과 정보가 없습니다.</div>';
    let st = ensureUnderworldRuneState();
    let lv = Math.max(0, Math.floor((st.enhanceLvByNo || {})[def.no] || 0));
    let boosted = Number(def.val || 0) * (1 + lv * 0.01);
    let mainLine = `${getStatName(def.stat)} +${formatValue(def.stat, boosted)}${lv > 0 ? ` <span style="color:#9fb4d1;">(+${lv} 강화)</span>` : ''}`;
    let bonusLines = ((st.bonusLinesByNo || {})[def.no] || []).map(line => `<div class="tooltip-line" style="color:${getItemStatToneColor(line.stat)};">보너스 · ${getStatName(line.stat)} +${formatValue(line.stat, line.val)}</div>`).join('');
    return `<div class="tooltip-title">${escapeHTML(def.name)} <span style="color:#9fb4d1;">룬${def.no}</span></div><div class="tooltip-line" style="color:${getItemStatToneColor(def.stat)};">${mainLine}</div>${bonusLines || '<div class="tooltip-line" style="color:#8fa0c4;">강화 보너스 옵션 없음</div>'}`;
}
function showUnderworldRuneTooltip(event, no) {
    showInfoTooltipHtml(event.clientX, event.clientY, buildUnderworldRuneTooltipHtml(no), '#9b7cff');
}
function autoEquipUnderworldRune(no) {
    let st = ensureUnderworldRuneState();
    let cap = Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)));
    if (cap <= 0) return;
    for (let i = 0; i < cap; i++) {
        if (!st.equippedRunes[i]) {
            // 인벤토리에서 해당 룬 1개 제거 후 슬롯에 장착
            let ownedIdx = st.obtainedRunes.findIndex(n => Math.floor(n || 0) === Math.floor(no || 0));
            if (ownedIdx !== -1) st.obtainedRunes.splice(ownedIdx, 1);
            st.equippedRunes[i] = no;
            return;
        }
    }
}
function closeUnderworldRuneOverlay() {
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    let overlay = document.getElementById('underworld-rune-overlay');
    if (overlay) overlay.remove();
}
function equipUnderworldRuneToSlot(slotIndex, no) {
    let st = ensureUnderworldRuneState();
    let idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    let cap = Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)));
    let runeNo = Math.max(1, Math.floor(Number(no) || 0));
    if (idx >= cap || !getUnderworldRuneDef(runeNo)) return;
    // 보유 인벤토리에 해당 룬이 있는지 확인
    let ownedIdx = st.obtainedRunes.findIndex(n => Math.floor(n || 0) === runeNo);
    if (ownedIdx === -1) return; // 보유하지 않은 룬은 장착 불가
    // 기존에 슬롯에 장착된 룬이 있으면 인벤토리로 반환
    let prevRune = st.equippedRunes[idx];
    if (prevRune) st.obtainedRunes.push(Math.floor(prevRune));
    // 인벤토리에서 룬 1개 제거 후 슬롯에 장착
    st.obtainedRunes.splice(ownedIdx, 1);
    st.equippedRunes[idx] = runeNo;
    closeUnderworldRuneOverlay();
    updateStaticUI();
}
function unequipUnderworldRuneSlot(slotIndex) {
    let st = ensureUnderworldRuneState();
    let idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    if (idx >= Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)))) return;
    let prevRune = st.equippedRunes[idx];
    if (prevRune) st.obtainedRunes.push(Math.floor(prevRune)); // 인벤토리로 반환
    st.equippedRunes[idx] = null;
    closeUnderworldRuneOverlay();
    updateStaticUI();
}
function getUnderworldRuneOverlayOptionsHtml(slotIndex, runeCountMap) {
    let keys = Object.keys(runeCountMap).sort((a, b) => Number(a) - Number(b));
    if (keys.length === 0) return '<div class="deathlog-empty">보유한 룬이 없습니다.</div>';
    return keys.map(key => {
        let no = Number(key);
        let def = getUnderworldRuneDef(no);
        let title = def ? def.name : `룬${no}`;
        return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="equipUnderworldRuneToSlot(${slotIndex},${no})"><strong>${title}</strong><span>보유 ${runeCountMap[key]}개 · ${getUnderworldRuneEffectHtml(no)}</span></button>`;
    }).join('');
}
function openUnderworldRuneOverlay(slotIndex) {
    closeUnderworldRuneOverlay();
    let st = ensureUnderworldRuneState();
    let idx = Math.max(0, Math.floor(Number(slotIndex) || 0));
    let cap = Math.max(0, Math.min(6, Math.floor(st.unlockedSlots || 0)));
    if (idx >= cap) return;
    let runeCountMap = getUnderworldRuneCountMap(st.obtainedRunes);
    let current = st.equippedRunes[idx] ? buildUnderworldRuneTooltipHtml(st.equippedRunes[idx]) : '<div class="tooltip-line">현재 비어있음</div>';
    let overlay = document.createElement('div');
    overlay.id = 'underworld-rune-overlay';
    overlay.className = 'underworld-rune-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeUnderworldRuneOverlay(); };
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">룬 슬롯 ${idx + 1} 선택</div><div class="underworld-rune-overlay-desc">보유한 룬을 클릭해 장착하거나 현재 슬롯을 비울 수 있습니다.</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">닫기</button></div><div class="underworld-rune-current">${current}</div><div class="underworld-rune-option-grid">${getUnderworldRuneOverlayOptionsHtml(idx, runeCountMap)}</div><div class="underworld-rune-overlay-actions"><button type="button" onclick="unequipUnderworldRuneSlot(${idx})" ${st.equippedRunes[idx] ? '' : 'disabled'}>이 슬롯 해제</button></div></div>`;
    document.body.appendChild(overlay);
}
function craftUnderworldRune() {
    let st = ensureUnderworldRuneState();
    let maxNo = Math.max(0, Math.floor(st.unlockedRunesMaxNumber || 0));
    if (maxNo <= 0) return addLog('먼저 지하계 10층 단위 보상으로 룬 번호를 해금하세요.', 'attack-monster');
    let need = 10;
    if ((game.currencies.runeShard || 0) < need) return addLog(`룬 조각이 부족합니다. (필요: ${need})`, 'attack-monster');
    game.currencies.runeShard -= need;
    let roll = 1 + Math.floor(Math.random() * maxNo);
    st.obtainedRunes.push(roll);
    autoEquipUnderworldRune(roll);
    let def = getUnderworldRuneDef(roll);
    addLog(`🧿 룬 가공 성공: ${def ? def.name : ('룬'+roll)} 획득 (${def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : ''})`, 'loot-unique');
    updateStaticUI();
}
function getUnderworldRuneUpgradeOptionHtml(no, count, unlockedMax) {
    let shardNeed = Math.max(5, no);
    let canPay = (game.currencies.runeShard || 0) >= shardNeed;
    let canUpgrade = no < unlockedMax && canPay;
    let target = Math.min(unlockedMax, no + 1);
    let def = getUnderworldRuneDef(no);
    let toDef = getUnderworldRuneDef(target);
    let status = canUpgrade ? `룬${target}으로 승급 · 룬조각 ${shardNeed}` : (no >= unlockedMax ? `해금 최대 번호 ${unlockedMax} 필요` : `룬조각 부족 (${shardNeed})`);
    let title = def ? `${def.name} 룬${no}` : `룬${no}`;
    let targetName = toDef ? `${toDef.name} 룬${target}` : `룬${target}`;
    return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="upgradeUnderworldRune(${no})" ${canUpgrade ? '' : 'disabled'}><strong>${title} ×${count}</strong><span>${getUnderworldRuneEffectHtml(no)}</span><span>→ ${targetName} · ${status}</span></button>`;
}
function openUnderworldRuneUpgradeOverlay() {
    closeUnderworldRuneOverlay();
    let st = ensureUnderworldRuneState();
    let count = getUnderworldRuneCountMap(st.obtainedRunes);
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    let rows = Object.keys(count).map(Number).sort((a, b) => a - b).filter(no => count[no] >= 3 && no < 30);
    if (rows.length === 0) return addLog('동일 번호 룬 3개가 필요합니다. (룬30은 승급 불가)', 'attack-monster');
    let overlay = document.createElement('div');
    overlay.id = 'underworld-rune-overlay';
    overlay.className = 'underworld-rune-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeUnderworldRuneOverlay(); };
    let options = rows.map(no => getUnderworldRuneUpgradeOptionHtml(no, count[no], unlockedMax)).join('');
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">룬 승급 대상 선택</div><div class="underworld-rune-overlay-desc">동일 번호 룬 3개와 룬조각을 사용해 어떤 룬을 다음 번호로 승급할지 선택하세요.</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">닫기</button></div><div class="underworld-rune-option-grid">${options}</div></div>`;
    document.body.appendChild(overlay);
}
function upgradeUnderworldRune(fromNo) {
    if (fromNo === undefined || fromNo === null) return openUnderworldRuneUpgradeOverlay();
    let st = ensureUnderworldRuneState();
    let count = getUnderworldRuneCountMap(st.obtainedRunes);
    let from = Math.max(1, Math.floor(Number(fromNo) || 0));
    if ((count[from] || 0) < 3 || from >= 30) return addLog('동일 번호 룬 3개가 필요합니다. (룬30은 승급 불가)', 'attack-monster');
    let shardNeed = Math.max(5, from);
    if ((game.currencies.runeShard || 0) < shardNeed) return addLog(`룬 조각이 부족합니다. (필요: ${shardNeed})`, 'attack-monster');
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    if (from >= unlockedMax) return addLog(`현재는 룬${from}을 승급할 수 없습니다. (해금된 최대 번호: ${unlockedMax})`, 'attack-monster');
    game.currencies.runeShard -= shardNeed;
    let removed = 0;
    st.obtainedRunes = st.obtainedRunes.filter(n => Math.floor(n || 0) === from && removed++ < 3 ? false : true);
    let equipRemoved = 0;
    st.equippedRunes = Array.isArray(st.equippedRunes) ? st.equippedRunes.map(n => Math.floor(n || 0) === from && equipRemoved++ < 3 ? null : n) : [null, null, null, null, null, null];
    let to = Math.min(unlockedMax, from + 1);
    st.obtainedRunes.push(to);
    autoEquipUnderworldRune(to);
    closeUnderworldRuneOverlay();
    let def = getUnderworldRuneDef(to);
    addLog(`🧿 룬 승급 성공: 룬${from}×3 + 룬조각 ${shardNeed} → ${def ? def.name : ('룬'+to)} (${def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : ''})`, 'loot-unique');
    updateStaticUI();
}

function switchMapSubtab(subtabId) {
    if (subtabId === game.mapSubtab) {
        let currentPanel = document.getElementById(subtabId);
        let currentBtn = document.getElementById('btn-' + subtabId);
        if (currentPanel && currentPanel.classList.contains('active') && currentBtn && currentBtn.classList.contains('active')) {
            if (subtabId === 'map-tab-zones') switchMapExploreSubtab(game.mapExploreSubtab || 'map-explore-hunting');
            return;
        }
    }
    game.mapSubtab = subtabId;
    document.querySelectorAll('#tab-map .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-map .map-primary-tabs .subtab-btn').forEach(el => el.classList.remove('active'));
    let panel = document.getElementById(subtabId);
    let btn = document.getElementById('btn-' + subtabId);
    if (panel) panel.classList.add('active');
    if (btn) btn.classList.add('active');
    if (subtabId === 'map-tab-zones') switchMapExploreSubtab(game.mapExploreSubtab || 'map-explore-hunting');
}

function switchMapExploreSubtab(subtabId) {
    const fallback = 'map-explore-hunting';
    const panel = document.getElementById(subtabId) ? document.getElementById(subtabId) : document.getElementById(fallback);
    const activeId = panel ? panel.id : fallback;
    let currentBtn = document.getElementById('btn-' + activeId);
    if (activeId === game.mapExploreSubtab && panel && panel.classList.contains('active') && currentBtn && currentBtn.classList.contains('active')) return;
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
}

// 새 지도 해금 알람 대상 세부 탭(혼돈/심화/벌집/대균열/운석/고대미궁은 제외).
const MAP_EXPLORE_ALARM_SUBTABS = ['map-explore-hunting', 'map-explore-root-boss', 'map-explore-colony', 'map-explore-trials'];

// 알람 대상 세부 탭별 "해금된 지도 수" 시그니처. 값이 증가하면 새 지도가 열린 것이다.
// 나무(일반 사냥터) 탭은 스토리 액트 존만 표시하므로(혼돈 1~20층은 별도의 혼돈 탭에 렌더링됨),
// 그 시그니처도 스토리 존 범위(LAST_STORY_ZONE_ID)까지만 세야 한다. getVisibleHuntingMapCapZoneId()는
// 혼돈 20층까지 포함하는 범위라 그대로 쓰면 혼돈 층수 개방만으로도 나무 탭에 알람이 잘못 뜬다.
function getMapExploreUnlockSignatures() {
    const huntingMapCap = typeof LAST_STORY_ZONE_ID === 'number'
        ? LAST_STORY_ZONE_ID : Math.max(0, Math.floor(game.maxZoneId || 0));
    const season = game.season || 1;
    const rootBossZones = typeof SEASON_BOSS_ZONES !== 'undefined' ? SEASON_BOSS_ZONES : [];
    const trialZones = typeof TRIAL_ZONES !== 'undefined' ? TRIAL_ZONES : [];
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
    if (!MAP_EXPLORE_ALARM_SUBTABS.includes(subtabId)) return;
    ensureMapAlarmState();
    game.mapAlarmSeen[subtabId] = getMapExploreUnlockSignatures()[subtabId];
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

// 탐험 좌측 세부 탭 버튼 노출 여부를 갱신한다. subtabId는 패널/버튼 id의 공통 키
// (예: 'map-explore-chaos')다. 잠긴 세부 탭이 현재 선택되어 있으면 나무 탭으로 되돌린다.
function setExploreSubtabAvailable(subtabId, available) {
    let btn = document.getElementById('btn-' + subtabId);
    if (btn) btn.style.display = available ? '' : 'none';
    if (!available && game.mapExploreSubtab === subtabId) switchMapExploreSubtab('map-explore-hunting');
}
function enterLabyrinthFloor(floor){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); game.labyrinthFloor=Math.max(1,Math.floor(floor||1)); changeZone(LABYRINTH_ZONE_ID); updateStaticUI(); }

async function enterSkyTowerPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let st = ensureSkyTowerState();
    if (!st.unlocked) return addLog('창공의 탑은 루프 15 이후 이번 루프 혼돈 20층 클리어 시 해금됩니다.', 'attack-monster');
    if (!(typeof canEnterSkyTower === 'function' && canEnterSkyTower())) return addLog('창공의 탑은 영구 해금 후 해당 루프에서 혼돈에 입성하면 입장할 수 있습니다.', 'attack-monster');
    if ((game.settings && game.settings.mapCompleteAction) === 'repeatZone') {
        let ok = await requestGameConfirmation("현재 맵 완료 행동이 '같은 지역 반복'으로 설정되어 있습니다.\n창공의 탑에 입장해도 설정은 유지됩니다.", {
            title: '반복 설정 확인',
            tone: 'warning',
            confirmLabel: '그대로 입장'
        });
        if (!ok) return;
    }
    let max = Math.max(1, Math.floor(st.highestFloor || 1));
    let v = await requestGameNumber({
        title: '창공의 탑 층 선택',
        message: `이번 루프 남은 클리어 가능 층수: ${getSkyTowerRemainingClears()}/${getSkyTowerLoopClearLimit()}`,
        min: 1,
        max,
        value: Math.max(1, Math.floor(st.currentFloor || max)),
        confirmLabel: '입장'
    });
    if (v === null) return;
    let floor = Math.floor(Number(v) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    st.currentFloor = floor;
    changeZone(SKY_TOWER_ZONE_ID);
    updateStaticUI();
}
function upgradeSkyStone() {
    let st = ensureSkyTowerState();
    let max = getSkyStoneMaxLevel();
    let lv = Math.max(0, Math.floor(((st.skyStone || {}).level) || 0));
    if (lv >= max) return addLog('창공석은 이미 최종 강화 상태입니다.', 'attack-monster');
    let cost = getSkyStoneNextCost();
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return addLog(`응축된 창공의 힘이 부족합니다. (필요: ${cost})`, 'attack-monster');
    st.condensedPower -= cost;
    st.skyStone = st.skyStone || { crafted: false, level: 0 };
    st.skyStone.crafted = true;
    st.skyStone.level = lv + 1;
    addLog(`☁️ 창공석 ${lv === 0 ? '제작' : '강화'} 완료: 지하계 패널티 감소 ${getSkyStoneReductionPct()}%`, 'loot-unique');
    updateStaticUI();
}

async function enterChaosRealmPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let st = ensureChaosRealmState();
    if (!st.unlocked) return addLog('혼돈계는 혼돈 밖 나무꾼에게 최대 생명력 10% 이상의 피해를 준 전투 종료 시 해금됩니다.', 'attack-monster');
    if (!canEnterChaosRealm()) return addLog('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.', 'attack-monster');
    let max = Math.max(1, Math.floor(st.highestFloor || 1));
    let v = await requestGameNumber({
        title: '혼돈계 층 선택',
        message: `입장 가능한 최고 층은 ${max}층입니다.`,
        min: 1,
        max,
        value: max,
        confirmLabel: '입장'
    });
    if (v === null) return;
    let floor = Math.floor(Number(v) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    st.currentFloor = floor;
    changeZone(CHAOS_REALM_ZONE_ID);
    updateStaticUI();
}
async function enterUnderworldPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return addLog('지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어', 'attack-monster');
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    let max = Math.max(1, Math.floor(uw.highestFloor || 1));
    let v = await requestGameNumber({
        title: '지하계 층 선택',
        message: `입장 가능한 최고 층은 ${max}층입니다.`,
        min: 1,
        max,
        value: max,
        confirmLabel: '입장'
    });
    if (v === null) return;
    let floor = Math.floor(Number(v) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    uw.currentFloor = floor;
    changeZone(UNDERWORLD_ZONE_ID);
    updateStaticUI();
}

function enterTrialWithTicket(trialId) {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!['trial_3','trial_4'].includes(trialId)) return changeZone(trialId);
    if ((game.currencies.trialKey3 || 0) <= 0) return addLog('시련의 증표가 부족합니다.', 'attack-monster');
    game.currencies.trialKey3 -= 1;
    addLog(`🗝️ 시련의 증표 1개 소모 (남은 ${game.currencies.trialKey3 || 0})`, 'season-up');
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
function enterTalentBloomTrial() {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!isWoodsmanEchoUnlocked()) return addLog('🔒 나무꾼의 잔상이 아직 열리지 않았습니다. 혼돈 밖 나무꾼을 100% 처치하세요.', 'attack-monster');
    if (!game.ascendClass) return addLog('🔒 재능 개화는 직업(전직) 선택 후 도전할 수 있습니다.', 'attack-monster');
    if ((game.currencies.chaosKey || 0) < 1 || (game.currencies.coreKey || 0) < 1) return addLog('🔒 카오스 키와 코어 키가 각각 1개씩 필요합니다.', 'attack-monster');
    changeZone('trial_5');
}

async function enterDeepChaosPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let unlocked = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : [];
    let max = Math.max(20, unlocked.length ? Math.max(...unlocked) : Math.floor(game.abyssEndlessDepth || 20));
    let depth = await requestGameNumber({
        title: '혼돈 심화층 선택',
        message: unlocked.length > 0 ? `해금된 심화층 범위: 21 ~ ${max}` : `입장 가능한 심화층 범위: 21 ~ ${max}`,
        min: 21,
        max,
        value: max,
        confirmLabel: '입장'
    });
    if (depth === null) return;
    depth = Math.floor(Number(depth) || 0);
    if (unlocked.length > 0 && !unlocked.includes(depth)) return addLog(`해금된 심화 혼돈 층수만 입장 가능합니다.`, 'attack-monster');
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
    return `<div class="map-item map-item--deep-chaos ${current}" onclick="enterDeepChaosPrompt()">
        <div class="map-item-main"><span>♾️</span><span>혼돈 심화층<br><span class="map-zone-status">현재 심화층: ${state.currentDepth}층 · 최고 기록: ${state.highestDepth}층</span></span></div>
        <div class="map-item-actions"><span class="map-zone-status">입장 가능: 21 ~ ${state.highestDepth}</span></div>
    </div>`;
}
async function enterLabyrinthPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    let max = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
    let floor = await requestGameNumber({
        title: '고대 미궁 층 선택',
        message: `입장 가능한 최고 층은 ${max}층입니다.`,
        min: 1,
        max,
        value: max,
        confirmLabel: '입장'
    });
    if (floor === null) return;
    enterLabyrinthFloor(Math.floor(Number(floor) || 1));
}


function toggleChallengeContract(key) {
    let c = getChallengeContractState();
    if (!(key in c)) return;
    c[key] = !c[key];
    c.enabled = getChallengeContractScore() > 0;
    let bonus = Math.round((getChallengeContractRewardMultiplier({ type: 'act' }) - 1) * 100);
    let zone = getZone(game.currentZoneId);
    let restarted = false;
    if (isChallengeContractEligibleZone(zone)) {
        game.killsInZone = 0;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        if (typeof startMoving === 'function') startMoving(false);
        restarted = true;
    }
    addLog(`📜 도전 계약 변경: 활성 계약 ${getChallengeContractScore()}개 · 일반 액트 보상 +${bonus}%${restarted ? ' · 현재 사냥 재시작' : ''}`, 'season-up', { noToast: true });
    updateStaticUI();
}

function renderChallengeContractPanel() {
    let panel = document.getElementById('ui-challenge-contract-panel');
    if (!panel) return;
    let unlocked = Math.max(0, Math.floor(game.maxZoneId || 0)) >= 2 || Math.max(0, Math.floor(game.loopCount || 0)) > 0;
    panel.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) return;
    let c = getChallengeContractState();
    let score = getChallengeContractScore();
    let bonus = Math.round((getChallengeContractRewardMultiplier({ type: 'act' }) - 1) * 100);
    let zone = getZone(game.currentZoneId);
    let activeHere = isChallengeContractEligibleZone(zone) && score > 0;
    panel.innerHTML = `
        <div class="challenge-contract-head"><div><strong>📜 도전 계약</strong><span>일반 액트 사냥터 전용</span></div><div class="challenge-contract-reward">보상 +${bonus}%</div></div>
        <div class="challenge-contract-desc">불리한 조건 1개마다 경험치와 주요 드랍 확률이 8% 증가합니다. 혼돈·뿌리 보스·특수 콘텐츠에는 적용되지 않으며, 일반 액트에서 변경하면 현재 사냥을 다시 시작합니다.</div>
        <div class="challenge-contract-status ${activeHere ? 'active' : ''}">${score <= 0 ? '계약 없음' : (activeHere ? `현재 사냥터에 ${score}개 적용 중` : `계약 ${score}개 준비됨 · 일반 액트에서 적용`)}</div>
        <div class="challenge-contract-options">
            <button class="${c.enemyPower ? 'active' : ''}" onclick="toggleChallengeContract('enemyPower')"><b>맹공</b><span>적 공격력 +25%</span></button>
            <button class="${c.fragileArmor ? 'active' : ''}" onclick="toggleChallengeContract('fragileArmor')"><b>취약한 갑주</b><span>물리 피해 감소 -12%p</span></button>
            <button class="${c.shortHunt ? 'active' : ''}" onclick="toggleChallengeContract('shortHunt')"><b>강인한 적</b><span>적 최대 생명력 +30%</span></button>
            <button class="${c.greedPact ? 'active' : ''}" onclick="toggleChallengeContract('greedPact')"><b>탐욕의 대가</b><span>생명력·보호막 회복 -35%</span></button>
        </div>
    `;
}
function toggleSeasonBossRepeat() {
    game.autoRepeatSeasonBoss = !game.autoRepeatSeasonBoss;
    addLog(`🗝️ 뿌리 보스 반복 도전: ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`, 'season-up');
    updateStaticUI();
}

function renderStarWedgePanel() {
    let panel = document.getElementById('ui-star-wedge-panel');
    if (!panel) return;
    let st = ensureStarWedgeState();
    tryUnlockMeteorContentByProgress();
    st = ensureStarWedgeState();
    recalculateStarWedgeMutations();
    if (!st.unlocked) {
        panel.innerHTML = `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">잠금 상태: 루프 ${STAR_WEDGE_UNLOCK_LOOP}에서 액트 ${STAR_WEDGE_UNLOCK_ACT} 이후에 도달하면 별쐐기와 운석 낙하 지점이 해금됩니다.</div>`;
        return;
    }
    let astronomerLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    let rerollLockedAttr = astronomerLv >= 5 ? '' : 'disabled';
    let rerollTitle = astronomerLv >= 5 ? '' : ' (천문학자 Lv.5 필요)';
    let maxEquippedStarWedges = typeof getMaxEquippedStarWedges === 'function' ? getMaxEquippedStarWedges() : MAX_STAR_WEDGES;
    let constellationText = st.constellationBuff ? `${st.constellationBuff.label || getStatName(st.constellationBuff.stat)} +${st.constellationBuff.val}${st.constellationBuff.stat === 'flatHp' ? '' : '%'}${st.constellationBuff.permanent ? ' · 영원' : ''}` : '미관측';
    let socketNodeText = (st.sockets || []).map(entry => {
        let node = PASSIVE_TREE.nodes[entry.nodeId];
        return node ? getPassiveNodeDisplayName(node) : entry.nodeId;
    }).join(', ') || '미장착';
    let wedgeCards = (st.wedges || []).slice(0, 12).map(wedge => {
        let uniqueDef = wedge.unique && typeof getStarWedgeUniqueDef === 'function' ? getStarWedgeUniqueDef(wedge.uniqueType) : null;
        let lines = wedge.lines.map((line, idx) => {
            let lineTitle = idx === 3 ? '핵심노드' : `${idx + 1}경로`;
            if (line && line.disabled) return `<div style="color:#788497;">${lineTitle}. 적용 안 됨</div>`;
            return `<div style="color:${line.boosted ? '#ffd36f' : '#d4deea'};">${lineTitle}. ${getStatName(line.stat)} +${formatValue(line.stat, line.val)}${P_STATS[line.stat] && P_STATS[line.stat].isPct ? '%' : ''}${line.boosted ? ' <strong>★</strong>' : ''}</div>`;
        }).join('');
        let socketedEntry = (st.sockets || []).find(v => v.wedgeId === wedge.id) || null;
        let selecting = st.selectedWedgeId === wedge.id;
        let eternalBadge = wedge.eternal ? '<span style="color:#b7f6ff; font-size:0.8em;">영원</span>' : '';
        let eternalLockedAttr = astronomerLv >= 12 && !wedge.eternal ? '' : 'disabled';
        let eternalTitle = wedge.eternal ? '고정됨' : (astronomerLv >= 12 ? '별가루 25' : '천문학자 Lv.12 필요');
        let affectedCount = Object.values(st.nodeMutations || {}).filter(mut => mut && mut.wedgeId === wedge.id).length;
        let disabledCount = Object.values(st.disabledNodeEffectSources || {}).filter(ids => Array.isArray(ids) && ids.includes(wedge.id)).length;
        let conflictCount = Object.values(st.mutationConflictSources || {}).filter(ids => Array.isArray(ids) && ids.includes(wedge.id)).length;
        let recordedHub = wedge.recordedHubNodeId && PASSIVE_TREE.nodes[wedge.recordedHubNodeId];
        let statusBits = socketedEntry
            ? [`변성 ${affectedCount}`, disabledCount ? `비활성 ${disabledCount}` : '', conflictCount ? `충돌 ${conflictCount}` : ''].filter(Boolean)
            : [];
        let uniqueHtml = uniqueDef ? `<div style="margin:5px 0 7px; padding:7px 8px; border:1px solid rgba(191,132,255,.38); border-radius:7px; background:rgba(78,42,105,.2); color:#d9c3ef;"><strong style="color:#f0d7ff;">◆ ${uniqueDef.name}</strong><div style="margin-top:3px; font-size:.8em; line-height:1.4;">${uniqueDef.desc}${recordedHub ? `<br><span style="color:#b99be0;">기록 슬롯: ${getPassiveNodeDisplayName(recordedHub)}</span>` : ''}</div></div>` : '';
        return `<div style="border:1px solid #3e3352; border-radius:8px; padding:8px; background:#121224;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;"><strong style="color:#efd8ff;">${uniqueDef ? uniqueDef.name : '별쐐기'} #${wedge.id % 10000} ${eternalBadge}</strong>${socketedEntry ? `<button style="min-height:24px; padding:3px 8px; font-size:0.72em; background:#5c3448; border-color:#81506b;" onclick="unsocketStarWedge('${socketedEntry.nodeId}')">장착 해제</button>` : ''}</div>
            ${uniqueHtml}
            ${lines}
            ${statusBits.length ? `<div style="margin-top:6px; color:${conflictCount ? '#ffb58f' : '#8fd9c1'}; font-size:.76em;">장착 효과 · ${statusBits.join(' · ')}</div>` : ''}
            <div style="display:flex; flex-wrap:wrap; gap:4px; margin-top:6px;">
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; ${selecting ? 'background:#2f6a42; border-color:#3f9b5c;' : ''}" onclick="beginStarWedgeSocketSelection(${wedge.id})">${selecting ? '슬롯 선택 취소' : '장착할 슬롯 선택'}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id})" ${rerollLockedAttr || wedge.eternal || (wedge.unique && wedge.uniqueType === 'comet') ? 'disabled' : ''}>리롤${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'single')" ${rerollLockedAttr || wedge.eternal || (wedge.unique && wedge.uniqueType === 'comet') ? 'disabled' : ''}>1줄 고정${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="rerollStarWedge(${wedge.id}, 'double')" ${rerollLockedAttr || wedge.eternal || (wedge.unique && wedge.uniqueType === 'comet') ? 'disabled' : ''}>2줄 고정 (파편x10)${rerollTitle}</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em;" onclick="stabilizeStarWedge(${wedge.id})" ${eternalLockedAttr}>영원 고정 (${eternalTitle})</button>
                <button style="min-height:26px; padding:3px 8px; font-size:0.76em; background:#63383f; border-color:#8f5963;" onclick="destroyStarWedge(${wedge.id})" ${wedge.eternal ? 'disabled' : ''}>파괴하기</button>
            </div>
        </div>`;
    }).join('');
    panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-bottom:8px;">
            <div style="color:#d6e0ec;">운석 파편: <strong style="color:#ffd36f;">${game.currencies.meteorShard || 0}</strong> · 별가루: <strong style="color:#b7f6ff;">${game.currencies.starDust || 0}</strong> · 불완전한 별쐐기: <strong style="color:#b9d3ff;">${game.currencies.incompleteStarWedge || 0}</strong> · 별쐐기: <strong style="color:#f0ccff;">${game.currencies.starWedge || 0}</strong></div>
            <div style="color:#8ea5c1;">장착 슬롯: ${(st.sockets || []).length}/${maxEquippedStarWedges} · ${socketNodeText} · 별자리: ${constellationText}</div>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:8px;"><button onclick="craftIncompleteStarWedge()">파편 49 → 불완전한 별쐐기</button><button onclick="craftCompleteStarWedge()">불완전 1 + 파편 77 → 별쐐기</button></div>
        <div style="color:#93a4bb; font-size:0.8em; margin-bottom:8px;">1/2/3경로 노드를 1~3번째 줄로 변성하고, 4번째 [핵심노드] 줄은 슬롯 자신에 적용됩니다. 장착은 [장착할 슬롯 선택] 후 패시브 트리에서 슬롯을 클릭하세요.</div>
        <div style="display:grid; gap:8px;">${wedgeCards || '<div style="color:#7f89a0;">별쐐기가 없습니다. 운석 낙하 지점을 공략하거나 제작하세요.</div>'}</div>
    `;
}

function getTalismanShapeStyle(shape) {
    return TALISMAN_SHAPE_STYLE[shape] || { color: '#9fb3c7', glow: 'rgba(159,179,199,0.22)', symbol: '◆' };
}

function renderTalismanMiniShape(shape, options = {}) {
    return renderTalismanMiniShapeFromCells((TALISMAN_SHAPES[shape] || []).map(cell => ({ x: cell[0], y: cell[1] })), shape, options);
}

function renderTalismanMiniShapeFromCells(cellsInput, shape, options = {}) {
    let cells = Array.isArray(cellsInput) ? cellsInput.map(cell => ({ x: cell.x || 0, y: cell.y || 0 })) : [];
    let style = getTalismanShapeStyle(shape);
    let cellSize = Math.max(4, Math.floor(options.cellSize || 6));
    let gap = Math.max(1, Math.floor(options.gap || 1));
    let minX = cells.length > 0 ? Math.min(...cells.map(cell => cell.x)) : 0;
    let minY = cells.length > 0 ? Math.min(...cells.map(cell => cell.y)) : 0;
    let maxX = cells.length > 0 ? Math.max(...cells.map(cell => cell.x)) : 2;
    let maxY = cells.length > 0 ? Math.max(...cells.map(cell => cell.y)) : 1;
    let cols = Math.max(1, (maxX - minX + 1));
    let rows = Math.max(1, (maxY - minY + 1));
    let width = (cols * cellSize) + ((cols - 1) * gap);
    let height = (rows * cellSize) + ((rows - 1) * gap);
    let filled = new Set(cells.map(cell => `${cell.x - minX},${cell.y - minY}`));
    let html = '';
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            let isFilled = filled.has(`${x},${y}`);
            let fillStyle = isFilled
                ? `background:linear-gradient(145deg, rgba(255,255,255,0.28) 0%, ${style.color} 42%, rgba(8,12,18,0.2) 100%); box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 1px 2px rgba(0,0,0,0.45), 0 0 4px ${style.glow};`
                : 'background:transparent; box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);';
            html += `<span style="width:${cellSize}px; height:${cellSize}px; border-radius:2px; border:1px solid ${isFilled ? style.color : 'rgba(120,140,160,0.35)'}; ${fillStyle} display:block;"></span>`;
        }
    }
    let dir = options.markDir;
    let arrow = '';
    if (dir === 'up' || dir === 'right' || dir === 'down' || dir === 'left') {
        let ch = dir === 'up' ? '↑' : (dir === 'right' ? '→' : (dir === 'down' ? '↓' : '←'));
        arrow = `<span style="position:absolute; right:-4px; bottom:-5px; font-size:${Math.max(10, cellSize + 2)}px; color:#ffd27a; text-shadow:0 0 4px rgba(255,200,110,0.9), 0 0 8px rgba(255,130,60,0.5); line-height:1;">${ch}</span>`;
    }
    return `<span style="position:relative; display:grid; grid-template-columns:repeat(${cols}, ${cellSize}px); grid-auto-rows:${cellSize}px; gap:${gap}px; width:${width}px; height:${height}px; padding:2px; border:1px solid rgba(120,145,175,0.4); border-radius:4px; background:rgba(8,14,22,0.45); box-shadow:0 0 0 1px ${style.glow};">${html}${arrow}</span>`;
}

function getTalismanAnchorCell(talisman) {
    if (typeof getTalismanEffectAnchorCell === 'function') return getTalismanEffectAnchorCell(talisman);
    if (!talisman || !Array.isArray(talisman.cells) || talisman.cells.length <= 0) return { x: 0, y: 0 };
    let cells = talisman.cells.map(cell => ({ x: cell.x || 0, y: cell.y || 0 }));
    let filled = new Set(cells.map(cell => `${cell.x},${cell.y}`));
    let centerX = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length;
    let centerY = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length;
    let ranked = cells.map(cell => {
        let neighbors = 0;
        if (filled.has(`${cell.x - 1},${cell.y}`)) neighbors++;
        if (filled.has(`${cell.x + 1},${cell.y}`)) neighbors++;
        if (filled.has(`${cell.x},${cell.y - 1}`)) neighbors++;
        if (filled.has(`${cell.x},${cell.y + 1}`)) neighbors++;
        let dist = Math.hypot(cell.x - centerX, cell.y - centerY);
        return { cell, neighbors, dist };
    });
    ranked.sort((a, b) => {
        if (b.neighbors !== a.neighbors) return b.neighbors - a.neighbors;
        if (a.dist !== b.dist) return a.dist - b.dist;
        if (a.cell.y !== b.cell.y) return a.cell.y - b.cell.y;
        return a.cell.x - b.cell.x;
    });
    return ranked[0].cell;
}


const TALISMAN_BOARD_W = 8;
const TALISMAN_BOARD_H = 8;
const TALISMAN_BOARD_MASK = new Set([
'2,0','3,0','4,0','5,0',
'1,1','2,1','5,1','6,1',
'0,2','1,2','2,2','3,2','4,2','5,2','6,2','7,2',
'0,3','2,3','3,3','4,3','5,3','7,3',
'0,4','2,4','3,4','4,4','5,4','7,4',
'0,5','1,5','2,5','3,5','4,5','5,5','6,5','7,5',
'1,6','2,6','5,6','6,6',
'2,7','3,7','4,7','5,7'
]);
function talismanCellKey(x,y){ return `${x},${y}`; }
function talismanCellIndex(x,y){ return y * TALISMAN_BOARD_W + x; }
function isTalismanBoardCellValid(x,y){ return TALISMAN_BOARD_MASK.has(talismanCellKey(x,y)); }
function isTalismanCellInitiallyUnlocked(x, y){ return x >= 2 && x <= 5 && y >= 2 && y <= 5; }

function renderSealShardBadge(source) {
    let isRadiant = source === 'radiantSealShard';
    let isStrong = source === 'strongSealShard';
    let color = isRadiant ? '#ffe38a' : (isStrong ? '#f3c266' : '#9ed2ff');
    let label = isRadiant ? '찬란 편린' : (isStrong ? '강력 편린' : '편린');
    let icon = isRadiant ? '✹' : (isStrong ? '✦' : '◆');
    let bg = isRadiant ? 'rgba(120,95,18,0.5)' : (isStrong ? 'rgba(94,64,17,0.45)' : 'rgba(21,54,83,0.38)');
    return `<span style="display:inline-flex; align-items:center; gap:4px; font-size:0.72em; color:${color}; border:1px solid ${color}66; border-radius:999px; padding:2px 7px; background:${bg};">${icon} ${label}</span>`;
}

function rollTalismanRevealCount() {
    let r = Math.random();
    if (r < 0.002) return 6;
    if (r < 0.01) return 5;
    if (r < 0.06) return 4;
    if (r < 0.28) return 3;
    return 2;
}


const TALISMAN_SUMMON_OPTION_STATS = new Set(['summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonResPen']);
const TALISMAN_SUMMON_OPTION_GROUP = { stat: '__summonOptionGroup', label: '소환수 옵션군' };

function getTalismanRollOptionPool() {
    let hasSummon = TALISMAN_OPTION_POOL.some(option => TALISMAN_SUMMON_OPTION_STATS.has(option.stat));
    let pool = TALISMAN_OPTION_POOL.filter(option => !TALISMAN_SUMMON_OPTION_STATS.has(option.stat));
    if (hasSummon) pool.push(TALISMAN_SUMMON_OPTION_GROUP);
    return pool.length > 0 ? pool : TALISMAN_OPTION_POOL;
}

function resolveTalismanRollOption(option) {
    if (!option || option.stat !== TALISMAN_SUMMON_OPTION_GROUP.stat) return option || null;
    let pool = TALISMAN_OPTION_POOL.filter(row => TALISMAN_SUMMON_OPTION_STATS.has(row.stat));
    return rndChoice(pool.length > 0 ? pool : TALISMAN_OPTION_POOL);
}

function rollTalismanOption() {
    return resolveTalismanRollOption(rndChoice(getTalismanRollOptionPool()));
}

function rollTalismanStatLine(multiplier) {
    let option = rollTalismanOption();
    let mul = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
    let step = Number(option.step || 1);
    let value = (option.min * mul) + Math.random() * ((option.max * mul) - (option.min * mul));
    return { stat: option.stat, label: option.label, value: Number(value.toFixed(step < 1 ? 1 : 0)) };
}

const TALISMAN_UNIQUE_POOL = [
    { id:'ut_z_1', name:'굽이치는 전류', shape:'Z', stats:[{stat:'aspd',value:9,label:'공격 속도(%)'},{stat:'lightPctDmg',value:16,label:'번개 피해(%)'}] },
    { id:'ut_z_2', name:'균열의 발걸음', shape:'Z', stats:[{stat:'move',value:11,label:'이동 속도(%)'},{stat:'resPen',value:8,label:'저항 관통(%)'}] },
    { id:'ut_s_1', name:'감긴 덩굴', shape:'S', stats:[{stat:'flatHp',value:90,label:'최대 생명력'},{stat:'regen',value:1.4,label:'생명력 재생(%)'}] },
    { id:'ut_s_2', name:'쐐기 관통', shape:'S', stats:[{stat:'physPctDmg',value:16,label:'물리 피해(%)'},{stat:'crit',value:3,label:'치명타 확률(%)'}] },
    { id:'ut_l_1', name:'황혼의 궤적', shape:'L', stats:[{stat:'dotPctDmg',value:18,label:'지속 피해 배율(%)'},{stat:'chaosPctDmg',value:14,label:'카오스 피해(%)'}] },
    { id:'ut_l_2', name:'강철 결의', shape:'L', stats:[{stat:'armorPct',value:18,label:'방어도 증가(%)'},{stat:'dr',value:7,label:'받는 물리 피해 감소(%)'}] },
    { id:'ut_j_1', name:'냉광의 비늘', shape:'J', stats:[{stat:'coldPctDmg',value:16,label:'냉기 피해(%)'},{stat:'freezeChance',value:10,label:'동결 확률(%)'}] },
    { id:'ut_j_2', name:'파열의 첨탑', shape:'J', stats:[{stat:'critDmg',value:30,label:'치명타 피해 배율(%)'},{stat:'maxDmgRoll',value:6,label:'최대 피해 보정(%)'}] },
    { id:'ut_i_1', name:'장궁의 선', shape:'I', stats:[{stat:'projectilePctDmg',value:18,label:'투사체 피해(%)'},{stat:'targetProjectile',value:1,label:'투사체 타겟 +'}] },
    { id:'ut_i_2', name:'붉은 맥동', shape:'I', stats:[{stat:'firePctDmg',value:17,label:'화염 피해(%)'},{stat:'igniteChance',value:12,label:'점화 확률(%)'}] },
    { id:'ut_o_1', name:'쌍환의 방패', shape:'O', stats:[{stat:'resAll',value:12,label:'모든 저항(%)'},{stat:'energyShieldPct',value:16,label:'에너지 보호막 증가(%)'}] },
    { id:'ut_o_2', name:'이중 심장', shape:'O', stats:[{stat:'pctHp',value:12,label:'생명력 증가(%)'},{stat:'regen',value:1.2,label:'생명력 재생(%)'}] },
    { id:'ut_t_1', name:'왕좌의 창끝', shape:'T', stats:[{stat:'pctDmg',value:18,label:'피해 증가(%)'},{stat:'aspd',value:10,label:'공격 속도(%)'}] },
    { id:'ut_t_2', name:'교차 절개', shape:'T', stats:[{stat:'meleePctDmg',value:18,label:'근접 피해(%)'},{stat:'crit',value:3.5,label:'치명타 확률(%)'}] },
    { id:'ut_soul_shepherd', name:'영혼 목자의 계약', shape:'T', stats:[{stat:'summonGemLevel',value:2,label:'소환수 공격 스킬 젬 레벨'},{stat:'summonPctDmg',value:20,label:'소환수 피해 증가(%)'},{stat:'summonHpPct',value:16,label:'소환수 생명력 증가(%)'}] },
    { id:'ut_gravity', name:'중력', shape:'DOT', rarity:'매우 희귀', special:'gravity' },
    { id:'ut_simple', name:'단순한 부적', shape:'MARK_DOT', rarity:'매우 희귀', special:'simpleCopy' },
    { id:'ut_temperance', name:'절제의 미덕', shape:'G', rarity:'희귀', special:'temperance' },
    { id:'ut_pride', name:'오만', shape:'PLUS', rarity:'희귀', special:'pride' },
    { id:'ut_moment', name:'찰나', shape:'DASH2', rarity:'희귀', special:'moment', bossFinalDmgMin:5, bossFinalDmgMax:15 },
    { id:'ut_fire_focus', name:'불타는 부적', rarity:'희귀', special:'elementFocus', elem:'fire' },
    { id:'ut_cold_focus', name:'서릿빛 부적', rarity:'희귀', special:'elementFocus', elem:'cold' },
    { id:'ut_light_focus', name:'뇌전의 부적', rarity:'희귀', special:'elementFocus', elem:'light' },
    { id:'ut_phys_focus', name:'쇄격의 부적', rarity:'희귀', special:'elementFocus', elem:'phys' },
    { id:'ut_chaos_focus', name:'심연의 부적', rarity:'희귀', special:'elementFocus', elem:'chaos' }
];

function rollTalismanCandidate(currencyKey) {
    let isStrong = currencyKey === 'strongSealShard';
    let isRadiant = currencyKey === 'radiantSealShard';
    let forceUnique = Math.random() < (isRadiant ? 0.24 : (isStrong ? 0.03 : 0.005));
    if (forceUnique) {
        let row = rndChoice(TALISMAN_UNIQUE_POOL);
        let shapeKey = row.shape || rndChoice(['Z','S','L','J','I','O','T']);
        let tal = { id: Date.now() + Math.floor(Math.random() * 100000), shape: shapeKey, cells: TALISMAN_SHAPES[shapeKey].map(([x,y]) => ({x,y})), rarity: row.rarity || '고유', source: isRadiant ? 'radiantSealShard' : (isStrong ? 'strongSealShard' : 'sealShard'), isUnique: true, uniqueId: row.id, name: row.name, special: row.special || null, markDir: rndChoice(['up','right','down','left']) };
        if (row.special === 'moment') {
            tal.bossFinalDmgMin = row.bossFinalDmgMin || 5;
            tal.bossFinalDmgMax = row.bossFinalDmgMax || 15;
            tal.bossFinalDmgRoll = typeof getTalismanMomentRoll === 'function' ? getTalismanMomentRoll(tal) : (tal.bossFinalDmgMin + Math.floor(Math.random() * ((tal.bossFinalDmgMax - tal.bossFinalDmgMin) + 1)));
            tal.value = tal.bossFinalDmgRoll;
        }
        if (row.special === 'temperance') {
            tal.stats = Array.from({ length: 3 }, () => rollTalismanStatLine(1));
        } else if (row.special === 'elementFocus') {
            let gemLv = 1 + Math.floor(Math.random()*3);
            let inc = 5 + Math.floor(Math.random()*11);
            let res = 5 + Math.floor(Math.random()*11);
            let map = { fire:['fireGemLevel','firePctDmg','resF','화염'], cold:['coldGemLevel','coldPctDmg','resC','냉기'], light:['lightGemLevel','lightPctDmg','resL','번개'], phys:['physGemLevel','physPctDmg','dr','물리'], chaos:['chaosGemLevel','chaosPctDmg','resChaos','카오스'] }[row.elem];
            tal.shape = rndChoice(['Z','S','L','J','I','O','T']); tal.cells = TALISMAN_SHAPES[tal.shape].map(([x,y])=>({x,y}));
            tal.stats=[{stat:map[0],label:`${map[3]} 스킬 젬 레벨`,value:gemLv},{stat:map[1],label:`${map[3]} 스킬 피해(%)`,value:inc},{stat:map[2],label:`${map[3]} 저항(%)`,value:res}];
        } else if (row.stats) tal.stats=row.stats.map(v=>({...v}));
        tal.stat = tal.stats && tal.stats[0] ? tal.stats[0].stat : null;
        tal.statName = row.name;
        tal.value = tal.stats && tal.stats[0] ? tal.stats[0].value : (row.special === 'moment' ? (tal.bossFinalDmgRoll || tal.bossFinalDmgMin || 5) : 0);
        return tal;
    }
    let shapeKey = rndChoice(Object.keys(TALISMAN_SHAPES).filter(k => ['I','O','T','S','Z','J','L'].includes(k)));
    let multiplier = isRadiant ? 1.6 : (isStrong ? 1.35 : 1.0);
    let statLine = rollTalismanStatLine(multiplier);
    let option = TALISMAN_OPTION_POOL.find(row => row.stat === statLine.stat) || { min: statLine.value, max: statLine.value, step: 1 };
    let step = Number(option.step || 1);
    return { id: Date.now() + Math.floor(Math.random() * 100000), shape: shapeKey, cells: TALISMAN_SHAPES[shapeKey].map(([x, y]) => ({ x: x, y: y })), stat: statLine.stat, statName: statLine.label, value: statLine.value, valueMin: Number(((option.min * multiplier)).toFixed(step < 1 ? 1 : 0)), valueMax: Number(((option.max * multiplier)).toFixed(step < 1 ? 1 : 0)), rarity: isRadiant ? '찬란한 기운' : (isStrong ? '강력한 기운' : '일반'), source: isRadiant ? 'radiantSealShard' : (isStrong ? 'strongSealShard' : 'sealShard') };
}

function startTalismanUnseal(currencyKey) {
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('봉인편린이 부족합니다.', 'attack-monster');
    if (game.talismanUnseal) return addLog('이미 봉인 해제 중입니다. 먼저 선택/파괴를 완료하세요.', 'attack-monster');
    game.currencies[currencyKey]--;
    let total = rollTalismanRevealCount();
    game.talismanUnseal = {
        rollsLeft: total,
        totalRolls: total,
        current: rollTalismanCandidate(currencyKey),
        source: currencyKey
    };
    addLog(`🧿 봉인 해제 시작! 총 확인 기회 ${total}회`, 'season-up');
    updateStaticUI();
}

function startBulkTalismanUnseal(currencyKey) {
    let count = Math.min(10, Math.max(0, Math.floor(game.currencies[currencyKey] || 0)));
    if (count <= 0) return addLog('봉인편린이 부족합니다.', 'attack-monster');
    if (game.talismanUnseal) return addLog('이미 봉인 해제 중입니다. 먼저 선택/파괴를 완료하세요.', 'attack-monster');
    game.currencies[currencyKey] -= count;
    game.talismanInventory = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let talismans = Array.from({ length: count }, () => rollTalismanCandidate(currencyKey)).filter(Boolean);
    game.talismanInventory.push(...talismans);
    game.noti = game.noti || {};
    game.noti.talisman = true;
    let uniqueCount = talismans.filter(talisman => talisman && (talisman.isUnique || talisman.rarity === '고유' || talisman.rarity === '매우 희귀')).length;
    addLog(`🧿 봉인편린 빠른 해제: 부적 ${talismans.length}개 획득${uniqueCount > 0 ? ` · 고유/특수 ${uniqueCount}개` : ''}`, uniqueCount > 0 ? 'loot-unique' : 'loot-rare');
    updateStaticUI();
}

function previewNextTalismanShape() {
    let state = game.talismanUnseal;
    if (!state || state.rollsLeft <= 1) return;
    state.rollsLeft--;
    state.current = rollTalismanCandidate(state.source);
    updateStaticUI();
}

function acceptCurrentTalisman() {
    let state = game.talismanUnseal;
    if (!state || !state.current) return;
    game.talismanInventory = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    game.talismanInventory.push(state.current);
    game.noti = game.noti || {};
    game.noti.talisman = true;
    addLog(`✅ 부적 획득: ${getTalismanDisplayName(state.current)}${state.current.stat ? ` +${formatValue(state.current.stat, state.current.value)}` : ''}`, 'loot-rare');
    game.talismanUnseal = null;
    updateStaticUI();
}

function discardCurrentTalisman() {
    if (!game.talismanUnseal) return;
    addLog('🗑️ 봉인 후보를 파괴했습니다.', 'attack-monster');
    game.talismanUnseal = null;
    updateStaticUI();
}


async function exchangeTalismanShards(kind) {
    let cfg = kind === 'radiant'
        ? { from: 'strongSealShard', to: 'radiantSealShard', need: 40, fromName: '강력한 기운의 봉인편린', toName: '찬란한 봉인편린' }
        : { from: 'sealShard', to: 'strongSealShard', need: 80, fromName: '봉인편린', toName: '강력한 기운의 봉인편린' };
    game.currencies = game.currencies || {};
    let have = Math.max(0, Math.floor(game.currencies[cfg.from] || 0));
    let maxCount = Math.floor(have / cfg.need);
    if (maxCount <= 0) return addLog(`${cfg.fromName}이 부족합니다. (${cfg.need}개 필요)`, 'attack-monster');
    let raw = await requestGameNumber({
        title: '부적 파편 교환',
        message: `${cfg.fromName} ${cfg.need}개 → ${cfg.toName} 1개`,
        min: 1,
        max: maxCount,
        value: maxCount,
        confirmLabel: '교환'
    });
    if (raw === null) return;
    let count = Math.max(0, Math.min(maxCount, Math.floor(Number(raw))));
    if (!Number.isFinite(count) || count <= 0) return addLog('교환 횟수가 올바르지 않습니다.', 'attack-monster');
    game.currencies[cfg.from] = have - (cfg.need * count);
    game.currencies[cfg.to] = Math.max(0, Math.floor(game.currencies[cfg.to] || 0)) + count;
    addLog(`🧿 편린 교환 완료: ${cfg.fromName} ${cfg.need * count}개 → ${cfg.toName} ${count}개`, 'loot-rare');
    updateStaticUI();
}


function getTalismanWaxSourceStats(talisman) {
    if (!talisman) return [];
    let stats = Array.isArray(talisman.stats) && talisman.stats.length > 0
        ? talisman.stats.map(st => st && st.stat ? { ...st } : null).filter(Boolean)
        : [];
    if (stats.length === 0 && talisman.stat) stats.push({ stat: talisman.stat, label: talisman.statName || getStatName(talisman.stat), value: talisman.value || 0 });
    return stats.filter(st => st && st.stat && Number.isFinite(Number(st.value)));
}

function getTalismanBeeswaxPreview(talisman) {
    let baseStats = getTalismanWaxSourceStats(talisman).filter(st => !st.waxBonus);
    let candidates = baseStats.map((stat, index) => ({ stat, index })).filter(entry => Number(entry.stat.value || 0) > 0);
    if (candidates.length <= 0) return null;
    let source = candidates.sort((a, b) => Math.abs(Number(a.stat.value || 0)) - Math.abs(Number(b.stat.value || 0)) || a.index - b.index)[0].stat;
    let raw = Number(source.value || 0) * 0.35;
    let waxValue = Number(raw.toFixed(Math.abs(raw) < 1 ? 2 : 1));
    let waxStat = { stat: source.stat, label: `${source.label || getStatName(source.stat)} 밀랍`, value: waxValue, waxBonus: true };
    return { baseStats, source, waxStat };
}

function applyBeeswaxToTalisman(talismanId) {
    let beeLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
    if (beeLv < 8) return addLog('부적 밀랍 처리는 양봉업자 Lv.8에 해금됩니다.', 'attack-monster');
    let talisman = (game.talismanInventory || []).find(t => t && t.id === talismanId);
    if (!talisman) return;
    if (talisman.waxedByBeeswax) return openWaxedItemRestrictionOverlay(getTalismanDisplayName(talisman), '밀랍 재처리');
    if ((game.currencies.beeswax || 0) < 1) return addLog('밀랍이 부족합니다.', 'attack-monster');
    if (!getTalismanBeeswaxPreview(talisman)) return addLog('밀랍으로 복제할 양수 부적 옵션이 없습니다.', 'attack-monster');
    return openBeeswaxApplicationOverlay('talisman', talismanId);
}

function commitBeeswaxToTalisman(talismanId) {
    let talisman = (game.talismanInventory || []).find(t => t && t.id === talismanId);
    if (!talisman || talisman.waxedByBeeswax || (game.currencies.beeswax || 0) < 1) return false;
    let preview = getTalismanBeeswaxPreview(talisman);
    if (!preview) return false;
    game.currencies.beeswax--;
    talisman.stats = preview.baseStats.concat([preview.waxStat]);
    talisman.waxedByBeeswax = true;
    talisman.name = `밀랍 ${String(talisman.name || talisman.statName || '부적').replace(/^밀랍\s+/, '')}`;
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_resource_use');
    addLog(`🐝 부적 밀랍 처리 완료: ${getStatName(preview.waxStat.stat)} +${formatValue(preview.waxStat.stat, preview.waxStat.value)}`, 'loot-rare');
    updateStaticUI();
    return true;
}

function removeBeeswaxFromTalisman(talismanId) {
    let talisman = (game.talismanInventory || []).find(t => t && t.id === talismanId);
    if (!talisman || !talisman.waxedByBeeswax) return;
    return openWaxedItemRestrictionOverlay(getTalismanDisplayName(talisman), '밀랍 제거');
}

let pendingBeeswaxApplication = null;

function closeBeeswaxWarningOverlay() {
    pendingBeeswaxApplication = null;
    let overlay = document.getElementById('beeswax-warning-overlay');
    if (overlay) overlay.classList.remove('active');
}

function renderBeeswaxWarningOverlay(kicker, title, bodyHtml, confirmVisible) {
    let overlay = document.getElementById('beeswax-warning-overlay');
    if (!overlay) return;
    let kickerEl = document.getElementById('beeswax-warning-kicker');
    let titleEl = document.getElementById('beeswax-warning-title');
    let bodyEl = document.getElementById('beeswax-warning-body');
    let confirmEl = document.getElementById('beeswax-warning-confirm');
    if (kickerEl) kickerEl.textContent = kicker;
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = bodyHtml;
    if (confirmEl) confirmEl.style.display = confirmVisible ? '' : 'none';
    overlay.classList.add('active');
}

function openBeeswaxApplicationOverlay(kind, itemId) {
    let item = null;
    let sourceLabel = '';
    let resultLabel = '';
    if (kind === 'jewel') {
        item = (game.jewelInventory || [])[itemId];
        let preview = item && typeof getJewelBeeswaxPreview === 'function' ? getJewelBeeswaxPreview(item) : null;
        if (!item || !preview) return;
        sourceLabel = `${getStatName(preview.source.id)} +${formatJewelStatValue(preview.source.id, preview.source.val)}`;
        resultLabel = `밀랍 ${getStatName(preview.waxStat.id)} +${formatJewelStatValue(preview.waxStat.id, preview.waxStat.val)}`;
    } else {
        item = (game.talismanInventory || []).find(t => t && t.id === itemId);
        let preview = item ? getTalismanBeeswaxPreview(item) : null;
        if (!item || !preview) return;
        sourceLabel = `${preview.source.label || getStatName(preview.source.stat)} +${formatValue(preview.source.stat, preview.source.value)}`;
        resultLabel = `밀랍 ${getStatName(preview.waxStat.stat)} +${formatValue(preview.waxStat.stat, preview.waxStat.value)}`;
    }
    pendingBeeswaxApplication = { kind, itemId };
    let itemName = escapeHTML(item.name || item.statName || (kind === 'jewel' ? '주얼' : '부적'));
    renderBeeswaxWarningOverlay('되돌릴 수 없는 밀랍 처리', `${itemName} 밀랍 적용`, `
        <div style="padding:10px 12px; margin:8px 0; border:1px solid #8b6a2f; border-radius:8px; background:rgba(217,164,65,.08);">
            <div style="color:#b8c8dd;">복제 대상: ${escapeHTML(sourceLabel)}</div>
            <div style="color:#ffd98a; font-size:1.08em; font-weight:800; margin-top:5px;">획득 옵션: ${escapeHTML(resultLabel)}</div>
        </div>
        <div style="color:#ffb8a8; font-weight:800; margin-top:10px;">⚠️ 적용 후 영구 고정됩니다.</div>
        <ul style="margin:7px 0 0; padding-left:20px; color:#d7dee9; line-height:1.65;">
            <li>밀랍 제거가 불가능합니다.</li>
            <li>주얼 합성 및 이 아이템을 재료로 쓰는 기타 제작이 불가능합니다.</li>
            <li>장착·주얼 슬롯 증폭·부적 보드 배치·잠금·해체는 기존처럼 가능합니다.</li>
        </ul>
        <div style="margin-top:10px; color:#ffd98a;">밀랍 1개를 소모해 적용하시겠습니까?</div>`, true);
}

function confirmBeeswaxApplication() {
    let pending = pendingBeeswaxApplication;
    if (!pending) return closeBeeswaxWarningOverlay();
    let applied = pending.kind === 'jewel'
        ? (typeof commitBeeswaxToJewel === 'function' && commitBeeswaxToJewel(pending.itemId))
        : commitBeeswaxToTalisman(pending.itemId);
    closeBeeswaxWarningOverlay();
    if (!applied) addLog('밀랍 처리를 완료하지 못했습니다. 대상과 밀랍 보유량을 확인하세요.', 'attack-monster');
}

function openWaxedItemRestrictionOverlay(itemName, actionLabel) {
    pendingBeeswaxApplication = null;
    renderBeeswaxWarningOverlay('밀랍 고정 아이템', `${actionLabel || '제작'} 불가`, `
        <div style="color:#ffd98a; font-weight:800; margin-bottom:8px;">${escapeHTML(itemName || '밀랍 아이템')}</div>
        <div style="color:#ffb8a8; line-height:1.6;">밀랍 처리된 주얼과 부적은 옵션이 영구 고정되어 <strong>${escapeHTML(actionLabel || '해당 작업')}</strong>을 진행할 수 없습니다.</div>
        <div style="color:#b8c8dd; margin-top:8px;">밀랍 제거, 합성 및 제작 재료 사용이 제한됩니다. 주얼 슬롯 증폭은 가능합니다.</div>`, false);
}


function rotateTalismanCells90(cells){
    if (!Array.isArray(cells)) return [];
    let rotated = cells.map(cell => ({ x: -(cell.y || 0), y: (cell.x || 0) }));
    let minX = Math.min(...rotated.map(c => c.x));
    let minY = Math.min(...rotated.map(c => c.y));
    return rotated.map(c => ({ x: c.x - minX, y: c.y - minY }));
}
function rotateTalismanInInventory(talismanId){
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let target = inv.find(t => t && t.id === talismanId);
    if (!target || !Array.isArray(target.cells)) return;
    target.cells = rotateTalismanCells90(target.cells);
    if (target.markDir) { let rot={up:'right',right:'down',down:'left',left:'up'}; target.markDir=rot[target.markDir]||target.markDir; }
    addLog(`🔄 부적 회전: ${getTalismanDisplayName(target)}`, 'loot-normal');
    updateStaticUI();
}

let pendingTalismanDismantle = null;

function closeTalismanDismantleOverlay() {
    pendingTalismanDismantle = null;
    let overlay = document.getElementById('talisman-dismantle-overlay');
    if (overlay) overlay.classList.remove('active');
}

function openTalismanDismantleOverlay(ids, title, description, logLabel) {
    let idSet = new Set((ids || []).map(id => String(id)));
    let targets = (game.talismanInventory || []).filter(t => t && idSet.has(String(t.id)) && !isLockedInventoryObject(t));
    if (targets.length <= 0) return addLog('해체할 수 있는 부적이 없습니다.', 'attack-monster');
    pendingTalismanDismantle = { ids: targets.map(t => t.id), logLabel: logLabel || '부적 해체' };
    let overlay = document.getElementById('talisman-dismantle-overlay');
    let titleEl = document.getElementById('talisman-dismantle-title');
    let bodyEl = document.getElementById('talisman-dismantle-body');
    if (titleEl) titleEl.textContent = title || '부적을 해체할까요?';
    if (bodyEl) bodyEl.innerHTML = `<div style="color:#ffb8a8; line-height:1.6;"><strong>${targets.length}개</strong>의 부적이 영구적으로 사라집니다.</div><div style="color:#b8c8dd; margin-top:8px;">${escapeHTML(description || '이 작업은 되돌릴 수 없습니다.')}</div>`;
    if (overlay) overlay.classList.add('active');
}

function confirmTalismanDismantle() {
    let pending = pendingTalismanDismantle;
    if (!pending) return closeTalismanDismantleOverlay();
    let idSet = new Set((pending.ids || []).map(id => String(id)));
    let removed = [];
    game.talismanInventory = (game.talismanInventory || []).filter(t => {
        if (!t || !idSet.has(String(t.id)) || isLockedInventoryObject(t)) return true;
        removed.push(t);
        return false;
    });
    if (!game.talismanInventory.some(t => t && t.id === game.talismanSelectedId)) game.talismanSelectedId = null;
    closeTalismanDismantleOverlay();
    if (removed.length <= 0) return addLog('해체할 수 있는 부적이 없습니다.', 'attack-monster');
    let detail = removed.length === 1 ? `: ${getTalismanDisplayName(removed[0])}` : `: ${removed.length}개`;
    addLog(`🗑️ ${pending.logLabel}${detail}`, 'attack-monster');
    updateStaticUI();
}

function destroyTalismanFromInventory(talismanId) {
    let target = (game.talismanInventory || []).find(t => t && t.id === talismanId);
    if (!target) return;
    if (isLockedInventoryObject(target)) return addLog('잠금된 부적은 해체할 수 없습니다.', 'attack-monster');
    openTalismanDismantleOverlay([talismanId], `${getTalismanDisplayName(target)} 해체`, '선택한 부적을 해체하면 복구할 수 없습니다.', '부적 해체');
}

function salvageAllTalismansInInventory() {
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    if (inv.length <= 0) return addLog('일괄 해체할 부적이 없습니다.', 'attack-monster');
    let removable = inv.filter(t => !isLockedInventoryObject(t));
    let lockedSkipped = inv.length - removable.length;
    if (removable.length <= 0) return addLog(`일괄 해체할 부적이 없습니다. (잠금 ${lockedSkipped}개 보호)`, 'attack-monster');
    openTalismanDismantleOverlay(removable.map(t => t.id), '인벤토리 부적 일괄 해체', `보드와 잠금 부적은 유지됩니다.${lockedSkipped > 0 ? ` 잠금 ${lockedSkipped}개는 보호됩니다.` : ''}`, '부적 일괄 해체');
}

function getTalismanUnlockedCellsSet() {
    let cells = Array.isArray(game.talismanUnlockedCells) ? game.talismanUnlockedCells : [];
    let set = new Set(cells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)));
    for (let y = 2; y <= 5; y++) for (let x = 2; x <= 5; x++) if (isTalismanBoardCellValid(x,y)) set.add(talismanCellIndex(x,y));
    return set;
}

function getTalismanExpandCost(extraUnlockedCount) {
    if (extraUnlockedCount >= 28) return { sealShard: 0, strongSealShard: 0 };
    let sealCost = 1 + Math.floor(extraUnlockedCount / 3);
    let strongCost = extraUnlockedCount >= 20 ? 1 : 0; // 마지막 8칸부터 강력 봉인편린 추가 소모
    return { sealShard: sealCost, strongSealShard: strongCost };
}

function formatTalismanUnlockCostLabel(cost) {
    if (!cost || cost.sealShard <= 0) return '완료';
    let parts = [`봉인편린 ${cost.sealShard}`];
    if ((cost.strongSealShard || 0) > 0) parts.push(`강력 봉인편린 ${cost.strongSealShard}`);
    return parts.join(' + ');
}

function expandTalismanBoard() {
    addLog('🧩 잠긴 칸을 클릭하면 즉시 해금됩니다. 칸 위에 마우스를 올리면 비용을 볼 수 있습니다.', 'season-up');
    updateStaticUI();
}

function unlockTalismanCell(x, y) {
    if (x < 0 || y < 0 || x >= TALISMAN_BOARD_W || y >= TALISMAN_BOARD_H) return false;
    if (!isTalismanBoardCellValid(x, y)) return false;
    let idx = talismanCellIndex(x, y);
    let unlockedSet = getTalismanUnlockedCellsSet();
    if (unlockedSet.has(idx)) return false;
    let extraUnlocked = Math.max(0, unlockedSet.size - 16);
    let cost = getTalismanExpandCost(extraUnlocked);
    if ((game.currencies.sealShard || 0) < (cost.sealShard || 0) || (game.currencies.strongSealShard || 0) < (cost.strongSealShard || 0)) {
        addLog(`봉인편린이 부족합니다. (필요: ${formatTalismanUnlockCostLabel(cost)})`, 'attack-monster');
        return false;
    }
    game.currencies.sealShard -= (cost.sealShard || 0);
    game.currencies.strongSealShard -= (cost.strongSealShard || 0);
    game.talismanUnlockedCells = Array.isArray(game.talismanUnlockedCells) ? game.talismanUnlockedCells : [];
    game.talismanUnlockedCells.push(idx);
    game.talismanUnlockedCells = Array.from(new Set(game.talismanUnlockedCells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H))));
    game.talismanUnlockPickMode = false;
    addLog(`🧩 부적 보드 칸 해금! (${x + 1},${y + 1})`, 'season-up');
    return true;
}

function isTalismanCellUnlocked(x, y) {
    let idx = talismanCellIndex(x, y);
    return getTalismanUnlockedCellsSet().has(idx);
}

function canPlaceTalismanAt(talisman, baseX, baseY) {
    if (!talisman || !Array.isArray(talisman.cells)) return false;
    let board = game.talismanBoard || [];
    for (let cell of talisman.cells) {
        let x = baseX + cell.x;
        let y = baseY + cell.y;
        if (x < 0 || y < 0 || x >= TALISMAN_BOARD_W || y >= TALISMAN_BOARD_H || !isTalismanCellUnlocked(x, y)) return false;
        if (board[talismanCellIndex(x, y)]) return false;
    }
    return true;
}

function placeSelectedTalismanAt(x, y) {
    let selectedId = game.talismanSelectedId;
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let talisman = inv.find(t => t.id === selectedId);
    if (!talisman) return;
    let anchor = getTalismanAnchorCell(talisman);
    let baseX = x - anchor.x;
    let baseY = y - anchor.y;
    if (!canPlaceTalismanAt(talisman, baseX, baseY)) return addLog('해당 위치에는 부적을 배치할 수 없습니다.', 'attack-monster');
    game.talismanBoard = Array.isArray(game.talismanBoard) ? game.talismanBoard : Array(TALISMAN_BOARD_W * TALISMAN_BOARD_H).fill(null);
    talisman.cells.forEach(cell => {
        let idx = talismanCellIndex(baseX + cell.x, baseY + cell.y);
        game.talismanBoard[idx] = talisman.id;
    });
    game.talismanPlacements = game.talismanPlacements || {};
    game.talismanPlacements[talisman.id] = { x: baseX, y: baseY, talisman: talisman };
    game.talismanInventory = inv.filter(t => t.id !== talisman.id);
    game.talismanSelectedId = null;
    updateStaticUI();
}

function removePlacedTalisman(talismanId) {
    if (!talismanId) return;
    let board = Array.isArray(game.talismanBoard) ? game.talismanBoard : [];
    for (let i = 0; i < board.length; i++) if (board[i] === talismanId) board[i] = null;
    let placed = (game.talismanPlacements || {})[talismanId];
    if (!placed) return updateStaticUI();
    if (placed.talisman) {
        game.talismanInventory = game.talismanInventory || [];
        game.talismanInventory.push(placed.talisman);
    }
    delete game.talismanPlacements[talismanId];
    updateStaticUI();
}

function selectTalismanInventoryItem(talismanId) {
    game.talismanSelectedId = game.talismanSelectedId === talismanId ? null : talismanId;
    updateStaticUI();
}

function onTalismanBoardCellClick(x, y) {
    if (!isTalismanCellUnlocked(x, y)) {
        if (unlockTalismanCell(x, y)) updateStaticUI();
        return;
    }
    let idx = talismanCellIndex(x, y);
    let board = game.talismanBoard || [];
    let occupant = board[idx];
    if (occupant) return removePlacedTalisman(occupant);
    if (game.talismanSelectedId) return placeSelectedTalismanAt(x, y);
}

function toggleGemFoldMode(mode) {
    if (mode === 'all') {
        game.gemFoldInactiveAttack = false;
        game.gemFoldInactiveSupport = false;
    } else if (mode === 'attack') {
        game.gemFoldInactiveAttack = !game.gemFoldInactiveAttack;
    } else if (mode === 'support') {
        game.gemFoldInactiveSupport = !game.gemFoldInactiveSupport;
    }
    updateStaticUI();
}

function getGemCardMeta(def) {
    let tags = Array.isArray(def && def.tags) ? def.tags : [];
    let element = String((def && def.ele) || (tags.includes('fire') ? 'fire' : tags.includes('cold') ? 'cold' : tags.includes('lightning') ? 'light' : tags.includes('chaos') ? 'chaos' : 'phys'));
    let elementMap = {
        fire: { icon: '◆', label: '화염', className: 'fire' },
        cold: { icon: '✦', label: '냉기', className: 'cold' },
        light: { icon: 'ϟ', label: '번개', className: 'lightning' },
        lightning: { icon: 'ϟ', label: '번개', className: 'lightning' },
        chaos: { icon: '◈', label: '카오스', className: 'chaos' },
        phys: { icon: '◇', label: '물리', className: 'physical' },
        physical: { icon: '◇', label: '물리', className: 'physical' }
    };
    let typeLabel = tags.includes('summon_attack') ? '소환' : tags.includes('spell') ? '주문' : tags.includes('projectile') ? '투사체' : tags.includes('slam') ? '강타' : '공격';
    let presentation = elementMap[element] || elementMap.phys;
    return { typeLabel: typeLabel, icon: presentation.icon, elementLabel: presentation.label, className: presentation.className };
}

function getSkillGemArtPath(name) {
    return typeof SKILL_GEM_ART_PATHS !== 'undefined' && SKILL_GEM_ART_PATHS[name]
        ? SKILL_GEM_ART_PATHS[name]
        : '';
}

function renderSkillGemArt(name, className, options) {
    let def = SKILL_DB[name] || {};
    let meta = getGemCardMeta(def);
    let artPath = getSkillGemArtPath(name);
    let opts = options || {};
    let loading = opts.eager ? 'eager' : 'lazy';
    let fallbackHidden = artPath ? ' hidden' : '';
    let image = artPath
        ? `<img src="${escapeHTML(artPath)}" alt="" loading="${loading}" decoding="async" onerror="this.hidden=true; this.nextElementSibling.hidden=false">`
        : '';
    return `<span class="${className || 'gem-art'}" aria-label="${escapeHTML(name)} 젬 이미지">${image}<span class="gem-art-fallback" aria-hidden="true"${fallbackHidden}>${meta.icon}</span></span>`;
}

function renderGemTagChips(def, maxTags) {
    let rawTags = Array.isArray(def && def.tags) ? def.tags : [];
    let getTone = tag => {
        if (['fire', 'cold', 'light', 'lightning', 'chaos', 'phys', 'physical'].includes(tag)) return tag === 'light' ? 'lightning' : tag === 'phys' ? 'physical' : tag;
        if (['summon_attack', 'minion', 'summon'].includes(tag)) return 'summon';
        if (['spell', 'projectile', 'melee', 'slam', 'chain', 'pierce', 'dot', 'aoe', 'utility'].includes(tag)) return tag;
        return 'neutral';
    };
    return rawTags.slice(0, maxTags || 4).map(tag => {
        let label = typeof translateSkillTag === 'function' ? translateSkillTag(tag) : tag;
        return `<span class="gem-tag gem-tag--${getTone(tag)}">${escapeHTML(label)}</span>`;
    }).join('');
}

function renderAttackGemCard(name, highlightedName) {
    let def = SKILL_DB[name] || {};
    let gemInfo = getUiGemPresentation(name, false);
    let meta = getGemCardMeta(def);
    let isSummon = Array.isArray(def.tags) && def.tags.includes('summon_attack');
    let summonEquipped = isSummon && Array.isArray(game.equippedSummonSkills) && game.equippedSummonSkills.includes(name);
    let active = name === game.activeSkill || summonEquipped;
    let usageLabel = active ? '클릭하여 강화 · 각인' : '클릭하여 장착';
    let summonControls = summonEquipped ? `<span class="summon-gem-controls"><button class="summon-gem-count-btn" title="소환 해제" onclick="event.stopPropagation(); changeSummonSkillCount('${name}', -1)">−</button><span class="summon-gem-count">${getSummonSkillCount(name)}기</span><button class="summon-gem-count-btn" title="추가 소환" onclick="event.stopPropagation(); changeSummonSkillCount('${name}', 1)">+</button></span>` : '';
    let sealButton = active || name === '기본 공격' ? '' : `<button class="gem-card-utility" onclick="event.stopPropagation(); sealSkillGem('${name}')">봉인</button>`;
    return `<article class="skill-gem gem-library-card element-${meta.className} ${active ? 'active' : ''}" onclick="${active ? `openEquippedGemManagement('${name}')` : `changeSkill('${name}')`}" aria-pressed="${active}" onmouseenter="showGemTooltip(event,'active','${name}')" onmousemove="showGemTooltip(event,'active','${name}')" onmouseleave="hideInfoTooltip()">
        <div class="gem-card-head">${renderSkillGemArt(name, 'gem-card-sigil gem-card-art')}<div><small>${meta.elementLabel} · ${meta.typeLabel}</small><strong>${highlightedName}</strong></div><span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${gemInfo.totalLevel}</span></div>
        <p>${escapeHTML(def.desc || '공격 스킬 젬')}</p>
        <div class="gem-card-tags">${renderGemTagChips(def, 4)}</div>
        <div class="gem-card-footer"><span class="gem-usage-state">${active ? '● ' : ''}${usageLabel}</span>${summonControls}${sealButton}</div>
    </article>`;
}

function renderSupportGemCard(name, highlightedName) {
    let def = SUPPORT_GEM_DB[name] || {};
    let gemInfo = getUiGemPresentation(name, true);
    let active = Array.isArray(game.equippedSupports) && game.equippedSupports.includes(name);
    let tierCap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    let unlockedTier = Math.max(1, Math.min(tierCap, Math.floor((((game.supportGemData || {})[name]) || {}).unlockedTier || 1)));
    let activeTier = getSupportActiveTier(name);
    let tierLabel = typeof getSupportTierLabel === 'function' ? getSupportTierLabel(name, activeTier) : (activeTier === 3 ? '상급' : activeTier === 2 ? '중급' : '하급');
    let cost = getSupportTierResonanceCost(name);
    let tierButtons = tierCap <= 1 ? '' : [1, 2, 3].map(tier => `<button class="${tier === activeTier ? 'active' : ''}" title="${tier <= unlockedTier ? `${tier}등급 사용` : '미해금 등급'}" onclick="event.stopPropagation(); setSupportActiveTier('${name}', ${tier})" ${tier <= unlockedTier ? '' : 'disabled'}>${tier}</button>`).join('');
    let sealButton = active ? '' : `<button class="gem-card-utility" onclick="event.stopPropagation(); sealSupportGem('${name}')">봉인</button>`;
    return `<article class="skill-gem support-gem gem-library-card ${active ? 'active' : ''}" onclick="toggleSupport('${name}')" aria-pressed="${active}" onmouseenter="showGemTooltip(event,'support','${name}')" onmousemove="showGemTooltip(event,'support','${name}')" onmouseleave="hideInfoTooltip()">
        <div class="gem-card-head"><span class="gem-card-sigil">✚</span><div><small>${tierLabel} 보조 · 공명 ${cost}</small><strong>${highlightedName}</strong></div><span class="gem-level-badge ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${gemInfo.totalLevel}</span></div>
        <p>${escapeHTML(def.desc || '보조 젬 효과')}</p>
        <div class="gem-card-tags"><span class="gem-tag gem-tag--support">${escapeHTML(def.name || getStatName(def.stat || ''))}</span><span class="gem-tag gem-tag--resonance">공명 ${cost}</span></div>
        <div class="gem-card-footer"><span class="gem-usage-state">${active ? '● 장착 중' : '클릭하여 장착'}</span>${tierButtons ? `<span class="support-tier-switch" aria-label="보조 젬 등급">${tierButtons}</span>` : ''}${sealButton}</div>
    </article>`;
}

function renderSealedGemCard(name, highlightedName, isSupport) {
    let releaseCall = isSupport ? `unsealSupportGem('${name}')` : `unsealSkillGem('${name}')`;
    let art = isSupport ? '<span class="gem-card-sigil">✚</span>' : renderSkillGemArt(name, 'gem-card-sigil gem-card-art');
    return `<article class="skill-gem gem-library-card sealed-gem-card"><div class="gem-card-head">${art}<div><small>봉인 보관함</small><strong>${highlightedName}</strong></div></div><p>봉인을 해제하면 공명력 1을 사용해 보유 목록으로 되돌립니다.</p><div class="gem-card-footer"><span class="gem-usage-state">공명력으로 복원</span><button class="gem-card-utility" onclick="${releaseCall}">봉인 해제</button></div></article>`;
}

function renderSkillLoadoutSummary(pStats, resonanceCap) {
    let root = document.getElementById('ui-skill-loadout-summary');
    if (!root) return;
    let activeName = game.activeSkill || '기본 공격';
    let activeInfo = getUiGemPresentation(activeName, false);
    let usedResonance = (game.equippedSupports || []).reduce((sum, name) => sum + getSupportTierResonanceCost(name), 0);
    let summonCount = getEquippedSummonCount();
    let summonCap = getSummonEquipCapFromStats(pStats);
    root.innerHTML = `<div><span>주 공격</span><strong>${escapeHTML(activeName)}</strong><small>Lv.${activeInfo.totalLevel || 1}</small></div><div><span>보조 젬</span><strong>${(game.equippedSupports || []).length}/${Math.max(0, Math.floor(pStats.suppCap || 0))}</strong><small>장착 수</small></div><div><span>공명력</span><strong>${Math.max(0, resonanceCap - usedResonance)}</strong><small>${usedResonance}/${resonanceCap} 사용</small></div><div><span>소환 한도</span><strong>${summonCount}/${summonCap}</strong><small>현재 소환</small></div>`;
}

function renderGemResearchCandidate(kind, name, cost, availableFragments) {
    let isSupport = kind === 'support';
    let def = isSupport ? (SUPPORT_GEM_DB[name] || {}) : (SKILL_DB[name] || {});
    let meta = getGemCardMeta(def);
    let encodedName = encodeURIComponent(name);
    let affordable = availableFragments >= cost;
    let tags = renderGemTagChips(def, 3);
    if (!tags && isSupport) {
        tags = `<span class="gem-tag gem-tag--support">${escapeHTML(def.name || getStatName(def.stat || '') || '보조 효과')}</span>`;
    }
    let art = isSupport ? '<span>✚</span>' : renderSkillGemArt(name, 'gem-research-card-art');
    return `<article class="gem-research-card element-${meta.className}">
        <div class="gem-research-card-head">${art}<div><small>${isSupport ? '보조 젬' : `${meta.elementLabel} · ${meta.typeLabel}`}</small><strong>${escapeHTML(name)}</strong></div></div>
        <p>${escapeHTML(def.desc || '연구를 완료하면 보유 젬 목록에 추가됩니다.')}</p>
        <div class="gem-card-tags">${tags}</div>
        <button type="button" onclick="researchMissingGem('${kind}', decodeURIComponent('${encodedName}'))" ${affordable ? '' : 'disabled'}>
            ${affordable ? `확정 연구 · 잔향 ${cost}` : `잔향 부족 · ${availableFragments}/${cost}`}
        </button>
    </article>`;
}

function renderGemResearchPanel() {
    let root = document.getElementById('ui-gem-research-panel');
    if (!root || typeof getGemResearchCollectionState !== 'function' || typeof getGemResearchCost !== 'function') return;
    let state = getGemResearchCollectionState();
    let fragments = Math.max(0, Math.floor((game.currencies && game.currencies.gemShard) || 0));
    let attackCost = getGemResearchCost('attack');
    let supportCost = getGemResearchCost('support');
    let attackCards = state.attack.missing.map(name => renderGemResearchCandidate('attack', name, attackCost, fragments)).join('');
    let supportCards = state.support.missing.map(name => renderGemResearchCandidate('support', name, supportCost, fragments)).join('');
    let allComplete = state.attack.missing.length === 0 && state.support.missing.length === 0;
    root.innerHTML = `<div class="gem-research-summary">
        <div><span class="skill-panel-kicker">DETERMINISTIC ACQUISITION</span><h3>젬 연구</h3><p>젬 드랍마다 잔향을 모읍니다. 무작위 드랍을 기다리지 않고 원하는 미보유 젬을 확정 해금할 수 있습니다.</p></div>
        <div class="gem-research-resource"><span>젬 잔향</span><strong>${fragments}</strong><small>공격 ${attackCost} · 보조 ${supportCost}</small></div>
        <div class="gem-research-progress"><span>공격 <b>${state.attack.owned}/${state.attack.total}</b></span><span>보조 <b>${state.support.owned}/${state.support.total}</b></span></div>
    </div>
    ${allComplete ? '<div class="gem-research-complete">모든 젬 연구 완료 · 이후 젬 드랍은 추가 젬 잔향으로 환원됩니다.</div>' : `<div class="gem-research-columns">
        <details ${fragments >= attackCost && state.attack.missing.length > 0 ? 'open' : ''}><summary>미보유 공격 젬 <b>${state.attack.missing.length}</b></summary><div class="gem-research-grid">${attackCards || '<div class="gem-process-empty">공격 젬 수집 완료</div>'}</div></details>
        <details ${fragments >= supportCost && state.attack.missing.length === 0 && state.support.missing.length > 0 ? 'open' : ''}><summary>미보유 보조 젬 <b>${state.support.missing.length}</b></summary><div class="gem-research-grid">${supportCards || '<div class="gem-process-empty">보조 젬 수집 완료</div>'}</div></details>
    </div>`}`;
}

function getGemGrowthSummaryHtml(name, presentation) {
    if (!presentation || !presentation.skill) return '';
    let skill = presentation.skill;
    let sourceBonus = Math.max(0, (presentation.totalLevel || 0) - (presentation.baseLevel || 0) - (presentation.materialBonus || 0));
    let parts = [
        `<span>기본 Lv.<b>${presentation.baseLevel || 1}</b></span>`,
        `<span>재료·각성 <b>+${presentation.materialBonus || 0}</b></span>`,
        `<span>장비·패시브 <b>+${sourceBonus}</b></span>`,
        `<span>최종 Lv.<b>${presentation.totalLevel || presentation.finalLevel || 1}</b></span>`
    ];
    let combatParts = [];
    if (Number.isFinite(skill.dmg)) combatParts.push(`피해 계수 ${skill.dmg.toFixed(2)}`);
    if (Number.isFinite(skill.spd)) combatParts.push(`속도 ${skill.spd.toFixed(2)}`);
    if (Number.isFinite(skill.crit)) combatParts.push(`치명타 ${skill.crit.toFixed(1)}%`);
    return `<div class="gem-growth-breakdown">${parts.join('')}</div>${combatParts.length > 0 ? `<div class="gem-growth-output">${escapeHTML(combatParts.join(' · '))}</div>` : ''}`;
}

function renderGemEnhanceTargetCard(name, selected) {
    let def = SKILL_DB[name] || {};
    let rec = normalizeGemRecord((game.gemData || {})[name]);
    let info = getUiGemPresentation(name, false);
    let meta = getGemCardMeta(def);
    let enhanceCount = getSkyEnhancementForSkill(name).length;
    return `<button class="gem-target-card element-${meta.className} ${selected ? 'selected' : ''}" onclick="selectGemEnhanceTargetSkill('${name}')">${renderSkillGemArt(name, 'gem-target-icon')}<span><strong>${escapeHTML(name)}</strong><small>Lv.${info.totalLevel} · 퀄리티 ${rec.quality || 0}% · 각인 ${enhanceCount}/${rec.skyEnhanceCap || 1}</small></span>${selected ? '<b>선택</b>' : ''}</button>`;
}

function renderGemResourceStrip(activeGem, gemExpertLv, condensedPower) {
    let root = document.getElementById('ui-gem-resource-strip');
    if (!root) return;
    root.innerHTML = `<div><span>젬 각인사</span><strong>Lv.${gemExpertLv}</strong></div><div><span>젬 잔향</span><strong>${game.currencies.gemShard || 0}</strong></div><div><span>군주의 핵</span><strong>${game.currencies.bossCore || 0}</strong></div><div><span>창공의 힘</span><strong>${game.currencies.skyEssence || 0}</strong></div><div><span>응축 창공</span><strong>${Math.floor(condensedPower || 0)}</strong></div><div><span>각성 잔향</span><strong>${game.currencies.awakenedEcho || 0}</strong></div><div><span>선택 젬</span><strong>${activeGem && activeGem.awakened ? '각성' : '일반'}</strong></div>`;
}

function renderGemEngraveSlots(activeSlots, engraveCap) {
    let root = document.getElementById('ui-gem-engrave-slots');
    if (!root) return;
    let active = getGemEnhanceTargetSkill();
    if (typeof isEnhanceableAttackGem === 'function' && !isEnhanceableAttackGem(active)) {
        root.innerHTML = '<div class="gem-process-empty">장착 중인 공격 젬을 선택하면 중앙 각인 장치가 활성화됩니다.</div>';
        return;
    }
    let selectedSlot = typeof getSelectedGemEngraveSlot === 'function' ? getSelectedGemEngraveSlot() : 0;
    let slots = [];
    for (let index = 0; index < 5; index++) {
        let enhancement = activeSlots[index] ? GEM_SKY_ENHANCEMENTS[activeSlots[index]] : null;
        let unlocked = index < engraveCap;
        let nextUnlock = index === engraveCap && engraveCap < 5;
        let stateClass = enhancement ? 'filled' : unlocked ? 'open' : nextUnlock ? 'unlockable' : 'locked';
        let title = enhancement ? `${index + 1}번 슬롯 · ${enhancement.name}` : unlocked ? `${index + 1}번 빈 각인 슬롯` : nextUnlock ? `${index + 1}번 슬롯 해금 · 창공의 힘 ${index + 1}` : '앞 슬롯부터 해금 필요';
        let group = enhancement ? getSkyEnhancementGroup(enhancement) : null;
        let glyph = enhancement ? getSkyEnhancementGlyph(enhancement) : unlocked ? '◇' : nextUnlock ? '+' : '×';
        slots.push(`<button type="button" class="gem-orbit-slot slot-${index + 1} ${stateClass} ${selectedSlot === index ? 'selected' : ''} ${group ? `group-${group.className}` : ''}" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}" data-slot-index="${index}" onpointerdown="event.stopPropagation()" onclick="event.stopPropagation(); openGemEngraveSlotOverlay(${index})"><span>${glyph}</span><small>${index + 1}</small>${enhancement ? `<em>${escapeHTML(enhancement.name)}</em>` : nextUnlock ? `<em>슬롯 해금</em>` : ''}</button>`);
    }
    root.innerHTML = `<div class="gem-orbit-stage"><div class="gem-orbit-rings" aria-hidden="true"></div><div class="gem-orbit-center element-${getGemCardMeta(SKILL_DB[active] || {}).className}">${renderSkillGemArt(active, 'gem-orbit-art', { eager: true })}<span>각인 대상</span><strong>${escapeHTML(active)}</strong></div>${slots.join('')}</div><div class="gem-orbit-copy"><strong>슬롯을 눌러 각인</strong><span>빈 슬롯은 옵션 선택 · 채워진 슬롯은 교체 또는 해제 · + 슬롯은 창공의 힘으로 확장</span></div>`;
}

function getSkyEnhancementGlyph(enhancement) {
    let stat = String((enhancement && enhancement.stat) || '');
    if (stat.includes('crit')) return '✧';
    if (stat.includes('aspd')) return '»';
    if (stat.includes('leech')) return '◉';
    if (stat.includes('targets')) return '⑂';
    if (stat.includes('resPen') || stat.includes('physIgnore')) return '⌁';
    if (stat.includes('dot')) return '∞';
    if (stat.includes('GemLevel')) return '⬆';
    if (stat.includes('awakened')) return '✹';
    return '✦';
}

function getSkyEnhancementGroup(enhancement) {
    if (String(enhancement.id || '').startsWith('sky_awakened')) return { label: '각성', className: 'awakened' };
    if (String(enhancement.id || '').startsWith('sky_gemcraft')) return { label: '조율', className: 'crafted' };
    return { label: '기본', className: 'basic' };
}

function renderSkyEnhancementOption(enhancement, activeSlots, gemExpertLv, isGem) {
    let applied = activeSlots.includes(enhancement.id);
    let unlockLv = typeof getSkyEnhancementUnlockLevel === 'function' ? getSkyEnhancementUnlockLevel(enhancement.id) : 1;
    let locked = gemExpertLv < unlockLv;
    let removeCost = typeof getSkyGemEnhancementRemoveCost === 'function' ? getSkyGemEnhancementRemoveCost() : 0;
    let group = getSkyEnhancementGroup(enhancement);
    let actionLabel = applied ? (removeCost > 0 ? `다시 눌러 해제 · 창공 ${removeCost}` : '다시 눌러 무료 해제') : locked ? `각인사 Lv.${unlockLv}` : '빈 슬롯에 각인 · 창공 1';
    return `<button class="gem-engrave-option group-${group.className} ${applied ? 'applied' : ''}" onclick="toggleSkyGemEnhancement('${enhancement.id}')" ${!isGem || (locked && !applied) ? 'disabled' : ''}><span class="gem-engrave-top"><em>${group.label}</em><b>${applied ? '적용 중' : actionLabel}</b></span><strong>${escapeHTML(enhancement.name)}</strong><small>${escapeHTML(enhancement.desc)}</small></button>`;
}

function closeGemEngraveSlotOverlay() {
    let overlay = document.getElementById('gem-engrave-slot-overlay');
    if (overlay) overlay.remove();
}

function renderGemEngraveOverlayOption(enhancement, slots, slotIndex, gemExpertLv) {
    let current = slots[slotIndex] === enhancement.id;
    let usedElsewhere = slots.some((id, index) => index !== slotIndex && id === enhancement.id);
    let unlockLv = getSkyEnhancementUnlockLevel(enhancement.id);
    let locked = gemExpertLv < unlockLv;
    let group = getSkyEnhancementGroup(enhancement);
    let state = current ? '현재 각인 · 누르면 해제' : usedElsewhere ? '다른 슬롯에 적용 중' : locked ? `각인사 Lv.${unlockLv}` : '이 슬롯에 각인';
    return `<button type="button" class="gem-engrave-option group-${group.className} ${current ? 'applied' : ''}" data-engrave-id="${enhancement.id}" data-action="${current ? 'remove' : 'apply'}" ${usedElsewhere || (locked && !current) ? 'disabled' : ''}><span class="gem-engrave-top"><em>${group.label}</em><b>${state}</b></span><strong>${escapeHTML(enhancement.name)}</strong><small>${escapeHTML(enhancement.desc)}</small></button>`;
}

function openGemEngraveSlotOverlay(index) {
    let active = getGemEnhanceTargetSkill();
    let gem = normalizeGemRecord((game.gemData || {})[active]);
    if (!isEnhanceableAttackGem(active) || !gem) return;
    let slotIndex = Math.max(0, Math.min(4, Math.floor(Number(index) || 0)));
    let cap = Math.max(1, Math.min(5, Math.floor(gem.skyEnhanceCap || 1)));
    if (slotIndex >= cap && !selectGemEngraveSlot(slotIndex)) return;
    gem = normalizeGemRecord((game.gemData || {})[active]);
    cap = Math.max(1, Math.min(5, Math.floor(gem.skyEnhanceCap || 1)));
    if (slotIndex >= cap) return;
    game.gemEngraveSelectedSlot = slotIndex;
    let slots = getSkyEnhancementSlotsForSkill(active);
    let current = slots[slotIndex] && GEM_SKY_ENHANCEMENTS[slots[slotIndex]];
    let expertLevel = getGemEngraverLevelForUnlocks();
    closeGemEngraveSlotOverlay();
    let overlay = document.createElement('div');
    overlay.id = 'gem-engrave-slot-overlay';
    overlay.className = 'game-choice-overlay gem-engrave-slot-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `${slotIndex + 1}번 각인 슬롯 선택`);
    overlay.tabIndex = -1;
    overlay.innerHTML = `<section class="gem-engrave-slot-dialog"><header><div class="gem-engrave-dialog-identity">${renderSkillGemArt(active, 'gem-engrave-dialog-art', { eager: true })}<div><span>SKY INSCRIPTION</span><h3>${escapeHTML(active)} · ${slotIndex + 1}번 슬롯</h3><p>${current ? `현재 ${escapeHTML(current.name)} · 다른 각인을 누르면 교체됩니다.` : '이 슬롯에 넣을 각인을 선택하세요.'}</p></div></div><button type="button" data-action="close" aria-label="닫기">닫기</button></header><div class="gem-engrave-overlay-grid">${Object.values(GEM_SKY_ENHANCEMENTS).map(enhancement => renderGemEngraveOverlayOption(enhancement, slots, slotIndex, expertLevel)).join('')}</div></section>`;
    overlay.addEventListener('click', event => {
        if (event.target === overlay) return closeGemEngraveSlotOverlay();
        let button = event.target.closest('button[data-action]');
        if (!button || button.disabled) return;
        let action = button.dataset.action;
        if (action === 'close') return closeGemEngraveSlotOverlay();
        let enhancementId = button.dataset.engraveId;
        let changed = action === 'remove'
            ? removeSkyGemEnhancementFromActive(enhancementId, slotIndex)
            : applySkyGemEnhancementToActive(enhancementId, slotIndex);
        if (changed) closeGemEngraveSlotOverlay();
    });
    overlay.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeGemEngraveSlotOverlay();
    });
    document.body.appendChild(overlay);
    overlay.focus({ preventScroll: true });
}
window.openGemEngraveSlotOverlay = openGemEngraveSlotOverlay;
window.closeGemEngraveSlotOverlay = closeGemEngraveSlotOverlay;

function renderSupportGemProcessList(gemExpertLv) {
    let root = document.getElementById('ui-support-process-list');
    if (!root) return;
    let supports = Array.isArray(game.supports) ? game.supports : [];
    if (supports.length <= 0) {
        root.innerHTML = '<div class="gem-process-empty">보유한 보조 젬이 없습니다.</div>';
        return;
    }
    root.innerHTML = supports.map(name => {
        let state = typeof getSupportGemSkyProcessState === 'function' ? getSupportGemSkyProcessState(name) : null;
        let rec = state ? state.record : normalizeGemRecord(((game.supportGemData || {})[name]) || {});
        let tierLabel = typeof getSupportTierLabel === 'function' ? getSupportTierLabel(name, rec.unlockedTier || 1) : `${rec.unlockedTier || 1}등급`;
        let nextLabel = state && state.improvingTier ? `${state.nextTier}등급 해금` : '젬 레벨 +1';
        let disabled = gemExpertLv < 5 || !state || state.maxed || (game.currencies.skyEssence || 0) < state.need;
        let actionLabel = state && state.maxed ? '최대 성장' : gemExpertLv < 5 ? '각인사 Lv.5 필요' : `${nextLabel} · ${state ? state.need : 0}`;
        return `<div class="gem-support-process-card"><div><small>${tierLabel} · Lv.${rec.level || 1}</small><strong>${escapeHTML(name)}</strong><span>${escapeHTML((SUPPORT_GEM_DB[name] || {}).desc || '')}</span></div><button onclick="processSupportGemWithSkyEssence('${name}')" ${disabled ? 'disabled' : ''}>${actionLabel}</button></div>`;
    }).join('');
}

function getUniqueCodexProgress() {
    let keys = new Set(UNIQUE_DB.filter(entry => !entry.realmCodexOnly).map(entry => `${entry.slots[0]}|${entry.name}`));
    let codex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    let stored = Object.keys(codex).filter(key => !!codex[key] && keys.has(key)).length;
    return { stored: stored, total: keys.size };
}

function getCodexBonusPctFromCount(storedCount) {
    let count = Math.max(0, Math.floor(Number(storedCount) || 0));
    let preSoftCap = Math.min(50, count) * 0.2;
    let postSoftCap = Math.max(0, count - 50) * 0.1;
    return preSoftCap + postSoftCap;
}

function getCodexBonusPct() {
    return getCodexBonusPctFromCount(getUniqueCodexProgress().stored);
}

function tryGrantCodexCompletionReward() {
    let progress = getUniqueCodexProgress();
    if (progress.total <= 0 || progress.stored < progress.total) return;
    if (game.uniqueCodexCompletedRewardClaimed) return;
    game.uniqueCodexCompletedRewardClaimed = true;
    addLog('📚 도감 완성! 다음 루프 환생부터 부위별 최하위 고유 선택 특전이 활성화됩니다.', 'loot-unique');
}

function storeUniqueToCodexByItemId(itemId) {
    let idx = (game.inventory || []).findIndex(item => item && item.id === itemId);
    if (idx < 0) return addLog('도감에 등록할 아이템을 찾지 못했습니다.', 'attack-monster');
    let item = game.inventory[idx];
    let key = getUniqueCodexKeyByItem(item);
    if (!key) return addLog('고유 아이템만 도감에 등록할 수 있습니다.', 'attack-monster');
    game.uniqueCodex = game.uniqueCodex || {};
    let existing = game.uniqueCodex[key];
    game.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    if (existing && existing.baseName) {
        let swapped = normalizeItem(JSON.parse(JSON.stringify(existing)));
        swapped.id = ++itemIdCounter;
        game.inventory[idx] = swapped;
        addLog(`🔁 도감 교체: [${item.name}] 등록, [${swapped.name}] 인벤토리로 반환`, 'season-up');
    } else {
        game.inventory.splice(idx, 1);
        addLog(`📚 도감 등록: [${item.name}]`, 'season-up');
    }
    tryGrantCodexCompletionReward();
    updateStaticUI();
}

function withdrawUniqueFromCodex(key) {
    game.uniqueCodex = game.uniqueCodex || {};
    let stored = game.uniqueCodex[key];
    if (!stored) return addLog('해당 도감 아이템은 비어 있습니다.', 'attack-monster');
    if (stored.revealed && !stored.baseName) return addLog('이번 루프에는 도감 정보만 남아 있어 꺼낼 수 없습니다.', 'attack-monster');
    if ((game.inventory || []).length >= getInventoryLimit()) return addLog('인벤토리가 가득 차서 꺼낼 수 없습니다.', 'attack-monster');
    let clone = normalizeItem(JSON.parse(JSON.stringify(stored)));
    clone.id = ++itemIdCounter;
    game.inventory.push(clone);
    let parts = String(key).split('|');
    game.uniqueCodex[key] = { revealed: true, slot: parts[0] || clone.slot || '', name: parts[1] || clone.name || '' };
    addLog(`📦 도감에서 [${clone.name}] 꺼냈습니다.`, 'loot-rare');
    updateStaticUI();
}

function getCodexSlotOrder() {
    return ['무기', '방패', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
}

function getFirstNewCodexSlot(pool, newlyRegistered) {
    let slots = getCodexSlotOrder();
    for (let slot of slots) {
        let found = pool.some(entry => {
            let key = `${slot}|${entry.name}`;
            return (entry.slots || [])[0] === slot && !!newlyRegistered[key] && !!game.uniqueCodex[key];
        });
        if (found) return slot;
    }
    return null;
}

function toggleCodexSlotCollapse(slot) {
    game.codexCollapsedSlots = (game.codexCollapsedSlots && typeof game.codexCollapsedSlots === 'object') ? game.codexCollapsedSlots : {};
    game.codexCollapsedSlots[slot] = !game.codexCollapsedSlots[slot];
    updateStaticUI();
}

function setCodexSlotFilter(slot) {
    if (!getCodexSlotOrder().includes(slot)) return;
    game.codexSelectedSlot = slot;
    updateStaticUI();
}

function renderCodexStatsHtml(entry, stored, codexKey) {
    let statList = [];
    if (stored && stored.baseName) {
        if (stored.uniqueEffect) statList.push(`<span style="color:#d7b8ff;">[고유 효과] ${escapeHTML(stored.uniqueEffect)}</span>`);
        (stored.baseStats || []).forEach(stat => {
            statList.push(`<span style="color:#95a5a6">${stat.statName} +${formatValue(stat.id, stat.val)}</span>`);
        });
        (stored.stats || []).forEach(stat => {
            let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatValue(stat.id, stat.valMin)}~${formatValue(stat.id, stat.valMax)})` : '';
            statList.push(`<span>${stat.statName} +${formatValue(stat.id, stat.val)}${range}</span>`);
        });
    } else if (stored) {
        if (entry.uniqueEffect) statList.push(`<span style="color:#d7b8ff;">[고유 효과] ${escapeHTML(entry.uniqueEffect)}</span>`);
        (entry.stats || []).forEach(stat => {
            let min = Number.isFinite(Number(stat.min)) ? Number(stat.min) : Number(stat.base || 0);
            let max = Number.isFinite(Number(stat.max)) ? Number(stat.max) : min;
            statList.push(`<span>${getStatName(stat.id)} +${formatValue(stat.id, min)}~+${formatValue(stat.id, max)}</span>`);
        });
    }
    return statList.join('<br>');
}

function renderUniqueCodexUI() {
    let summary = document.getElementById('ui-codex-summary');
    let listEl = document.getElementById('ui-codex-list');
    if (!summary || !listEl) return;
    game.uniqueCodex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    let newlyRegistered = (game.codexNewlyRegistered && typeof game.codexNewlyRegistered === 'object') ? game.codexNewlyRegistered : {};
    game.codexCollapsedSlots = (game.codexCollapsedSlots && typeof game.codexCollapsedSlots === 'object') ? game.codexCollapsedSlots : {};
    game.codexSubtab = (game.codexSubtab === 'realm') ? 'realm' : 'main';
    let realmOnly = game.codexSubtab === 'realm';
    syncCodexSubtabButtons();
    let pool = UNIQUE_DB.filter(entry => realmOnly ? !!entry.realmCodexOnly : !entry.realmCodexOnly);
    let keySet = new Set(pool.map(entry => `${entry.slots[0]}|${entry.name}`));
    let storedCount = Object.keys(game.uniqueCodex).filter(key => !!game.uniqueCodex[key] && keySet.has(key)).length;
    let progress = { stored: storedCount, total: keySet.size };
    let bonus = getCodexBonusPctFromCount(progress.stored);
    let rewardState = progress.stored >= progress.total ? '완성' : '미완성';
    let newCodexLines = Object.keys(newlyRegistered)
        .filter(key => keySet.has(key) && game.uniqueCodex[key])
        .map(key => {
            let parts = key.split('|');
            return `${parts[0] || '기타'} > ${parts.slice(1).join('|') || '이름 없음'}`;
        });
    let newCodexSummary = newCodexLines.length > 0
        ? `<div style="margin-top:6px; color:#ffdf80; font-weight:700;">신규 등록: ${newCodexLines.map(escapeHTML).join(' · ')}</div>`
        : '';
    summary.innerHTML = `[${realmOnly ? '계(Realm) 도감' : '기존 도감'}] 등록 수 / 전체: <strong>${progress.stored}</strong> / ${progress.total} · 도감 보너스: 피해/생명력/드랍률 +${bonus.toFixed(1)}% <span style="color:#9fb4d1;">(50개까지 0.2%, 이후 0.1%)</span> · 완성 상태: <strong>${rewardState}</strong>${newCodexSummary}`;
    let bySlot = getCodexSlotOrder();
    let availableSlots = bySlot.filter(slot => pool.some(entry => (entry.slots || [])[0] === slot));
    let firstNewSlot = getFirstNewCodexSlot(pool, newlyRegistered);
    if (firstNewSlot && game.codexFocusNewOnOpen) {
        game.codexSelectedSlot = firstNewSlot;
        game.codexFocusNewOnOpen = false;
    }
    let selectedSlot = availableSlots.includes(game.codexSelectedSlot) ? game.codexSelectedSlot : (firstNewSlot || availableSlots[0] || bySlot[0]);
    game.codexSelectedSlot = selectedSlot;
    let slotTabsHtml = availableSlots.map(slot => {
        let entries = pool.filter(entry => (entry.slots || [])[0] === slot);
        let slotStored = entries.filter(entry => !!game.uniqueCodex[`${slot}|${entry.name}`]).length;
        let hasNewInSlot = entries.some(entry => !!newlyRegistered[`${slot}|${entry.name}`] && !!game.uniqueCodex[`${slot}|${entry.name}`]);
        let activeClass = slot === selectedSlot ? ' active' : '';
        let newBadge = hasNewInSlot ? '<span class="codex-slot-new">NEW</span>' : '';
        return `<button class="codex-slot-tab${activeClass}" onclick="setCodexSlotFilter('${slot}')"><span>${slot}</span><small>${slotStored}/${entries.length}</small>${newBadge}</button>`;
    }).join('');
    let selectedEntries = pool.filter(entry => (entry.slots || [])[0] === selectedSlot);
    let cardsHtml = selectedEntries.map(entry => {
        let key = `${selectedSlot}|${entry.name}`;
        let stored = game.uniqueCodex[key];
        let infoLine = stored ? (stored.baseName ? `${stored.baseName} / 숨겨진 티어 ${getTierBadgeHtml(stored.hiddenTier || stored.itemTier || 1, 'T')}` : '정보만 유지됨 (루프 리셋됨)') : '미등록';
        let statHtml = stored ? renderCodexStatsHtml(entry, stored, key) : '';
        let isNew = stored && newlyRegistered[key];
        let newBadge = isNew ? ` <span style="color:#ff4d4f; font-weight:800; font-size:0.82em;">● NEW</span>` : '';
        let statusHtml = stored ? `<span style="color:#4cd964; font-weight:700;">등록됨</span>` : `<span style="color:#7f8c8d;">미등록</span>`;
        return `<div class="item-card codex-card${isNew ? ' codex-card-new' : ''}"><div><div class="item-title unique">[${selectedSlot}] ${stored ? entry.name : '???'}${newBadge}</div><div class="item-base-line">${infoLine}</div><div class="item-stats">${statHtml || '옵션 정보 없음'}</div></div><div class="item-actions">${statusHtml}</div></div>`;
    }).join('');
    listEl.innerHTML = `<div class="codex-layout"><div class="codex-slot-tabs">${slotTabsHtml}</div><div class="codex-slot-content"><div class="codex-slot-heading">${selectedSlot} <span>${selectedEntries.filter(entry => !!game.uniqueCodex[`${selectedSlot}|${entry.name}`]).length}/${selectedEntries.length}</span></div><div class="codex-card-grid">${cardsHtml}</div></div></div>`;
}
function syncCodexSubtabButtons() {
    const activeTab = game.codexSubtab === 'realm' ? 'realm' : 'main';
    ['main', 'realm'].forEach(tab => {
        let btn = document.getElementById('btn-codex-' + tab);
        if (btn) btn.classList.toggle('active', tab === activeTab);
    });
}

function setCodexSubtab(tab) {
    game.codexSubtab = (tab === 'realm') ? 'realm' : 'main';
    syncCodexSubtabButtons();
    updateStaticUI();
}

function grantCodexLegacyStarterUniques() {
    if (!game.uniqueCodexCompletedRewardClaimed) return;
    let act1Pool = UNIQUE_DB.filter(entry => {
        if (!entry) return false;
        if ((entry.reqTier || 1) > 1) return false;
        if (entry.dropOnly || entry.contentOnly || entry.bossOnly) return false;
        return !!((entry.slots || [])[0]);
    });
    if (act1Pool.length === 0) return;
    if ((game.inventory || []).length >= getInventoryLimit()) return;
    let pick = rndChoice(act1Pool);
    let uniqueTier = pick.reqTier || 1;
    let base = chooseItemBase(pick.slots[0], uniqueTier);
    let item = {
        id: ++itemIdCounter,
        slot: pick.slots[0],
        baseName: base.name,
        name: pick.name,
        rarity: 'unique',
        itemTier: uniqueTier,
        hiddenTier: uniqueTier,
        baseStats: rollBaseStats(base, uniqueTier),
        stats: []
    };
    pick.stats.forEach(stat => item.stats.push({ id: stat.id, statName: getStatName(stat.id), val: stat.min, valMin: stat.min, valMax: stat.max, tier: 1 }));
    game.inventory.push(normalizeItem(item));
    addLog(`🎁 도감 완성 특전 지급: [${pick.slots[0]}] ${pick.name} (액트1 고유 랜덤 1개)`, 'loot-unique');
}

function assertBuildEditable() {
    if (game.woodsmanBuildLock) {
        addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
        return false;
    }
    return true;
}

function isSummonGuardSupport(name) {
    let def = SUPPORT_GEM_DB[name] || {};
    return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_guard'));
}

function getEquippedSummonGuardSupports() {
    let supports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    return supports.filter(name => isSummonGuardSupport(name));
}

function isSummonAttackSkillGem(name) {
    let gemDef = SKILL_DB[name] || {};
    return !!(gemDef && Array.isArray(gemDef.tags) && gemDef.tags.includes('summon_attack'));
}

function normalizeEquippedSummonAttackSkills() {
    game.equippedSummonSkills = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    game.summonSkillCounts = (game.summonSkillCounts && typeof game.summonSkillCounts === 'object') ? game.summonSkillCounts : {};
    let owned = Array.isArray(game.skills) ? game.skills : [];
    game.equippedSummonSkills = Array.from(new Set(game.equippedSummonSkills.filter(gemName => isSummonAttackSkillGem(gemName) && owned.includes(gemName))));
    Object.keys(game.summonSkillCounts).forEach(gemName => {
        if (!game.equippedSummonSkills.includes(gemName)) delete game.summonSkillCounts[gemName];
    });
    game.equippedSummonSkills.forEach(gemName => {
        let count = Math.max(1, Math.floor(Number(game.summonSkillCounts[gemName]) || 1));
        game.summonSkillCounts[gemName] = count;
    });
    return game.equippedSummonSkills;
}

function getSummonSkillCount(name) {
    normalizeEquippedSummonAttackSkills();
    return Math.max(0, Math.floor(Number((game.summonSkillCounts || {})[name]) || 0));
}

function getEquippedSummonAttackCount() {
    return normalizeEquippedSummonAttackSkills().reduce((sum, name) => sum + getSummonSkillCount(name), 0);
}

function getEquippedSummonCount() {
    return getEquippedSummonAttackCount() + getEquippedSummonGuardSupports().length;
}

function getSummonEquipCapFromStats(stats) {
    return Math.max(1, Math.min(8, Math.floor((stats && stats.summonCap) || 1)));
}

function normalizeSummonLoadout(logChange, stats) {
    normalizeEquippedSummonAttackSkills();
    let cap = getSummonEquipCapFromStats(stats || getUiPlayerStats(null));
    let guardSupports = getEquippedSummonGuardSupports();
    let changed = false;
    if (guardSupports.length > cap) {
        let keepGuards = new Set(guardSupports.slice(0, cap));
        game.equippedSupports = (game.equippedSupports || []).filter(name => !isSummonGuardSupport(name) || keepGuards.has(name));
        guardSupports = getEquippedSummonGuardSupports();
        changed = true;
    }
    let guardCount = guardSupports.length;
    let attackCap = Math.max(0, cap - guardCount);
    let used = 0;
    game.equippedSummonSkills.slice().forEach(name => {
        let current = getSummonSkillCount(name);
        let allowed = Math.max(0, Math.min(current, attackCap - used));
        if (allowed <= 0) {
            game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
            delete game.summonSkillCounts[name];
            changed = true;
            return;
        }
        if (allowed !== current) {
            game.summonSkillCounts[name] = allowed;
            changed = true;
        }
        used += allowed;
    });
    if (changed && logChange) addLog(`🐾 소환수 한도(${cap})에 맞춰 초과 소환수가 자동 해제되었습니다.`, 'attack-monster');
    return changed;
}

function changeSummonSkillCount(name, delta) { if (!assertBuildEditable()) return;
    if (!isSummonAttackSkillGem(name) || !Array.isArray(game.skills) || !game.skills.includes(name)) return;
    normalizeEquippedSummonAttackSkills();
    game.summonLoadoutInitialized = true;
    let current = getSummonSkillCount(name);
    if (delta > 0) {
        let cap = getSummonEquipCapFromStats(getUiPlayerStats(null));
        if (getEquippedSummonCount() >= cap) return addLog(`소환수 한도(${cap})로 인해 [${name}]을(를) 추가 소환할 수 없습니다.`, 'attack-monster');
        if (!game.equippedSummonSkills.includes(name)) game.equippedSummonSkills.push(name);
        game.summonSkillCounts[name] = current + 1;
        if (SKILL_DB[name] && SKILL_DB[name].isGem) game.gemEnhanceTargetSkill = name;
        if (game.activeSkill === name) game.activeSkill = '기본 공격';
        updateStaticUI();
        return;
    }
    if (current <= 1) {
        game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
        delete game.summonSkillCounts[name];
    } else {
        game.summonSkillCounts[name] = current - 1;
    }
    if (game.activeSkill === name) game.activeSkill = '기본 공격';
    updateStaticUI();
}

function changeSkill(name) { if (!assertBuildEditable()) return;
    let def = SKILL_DB[name] || {};
    if (def && Array.isArray(def.tags) && def.tags.includes('summon_attack')) {
        normalizeEquippedSummonAttackSkills();
        if (game.equippedSummonSkills.includes(name)) {
            game.summonLoadoutInitialized = true;
            game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
            delete game.summonSkillCounts[name];
            if (game.activeSkill === name) game.activeSkill = '기본 공격';
            updateStaticUI();
            return;
        }
        changeSummonSkillCount(name, 1);
        return;
    }
    game.activeSkill = name;
    if (SKILL_DB[name] && SKILL_DB[name].isGem) game.gemEnhanceTargetSkill = name;
    updateStaticUI();
}

function openEquippedGemManagement(name) {
    if (!game.gemEnhanceUnlocked) return addLog('젬 강화는 군주의 핵 또는 창공의 힘을 획득하면 개방됩니다.', 'attack-monster');
    let equipped = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
    if (!equipped.includes(name)) return addLog('장착 중인 공격 젬만 강화할 수 있습니다.', 'attack-monster');
    game.gemEnhanceTargetSkill = name;
    game.gemEngraveSelectedSlot = 0;
    switchSkillSubtab('skill-tab-enhance');
    updateStaticUI();
}
safeExposeGlobals({ openEquippedGemManagement });
function getSupportResonanceCost(name) {
    let db = SUPPORT_GEM_DB[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[0])) return Math.max(1, Math.floor(db.resonanceCosts[0]));
    if (Number.isFinite(db.resonanceCost)) return Math.max(1, Math.floor(db.resonanceCost));
    let stat = db.stat || '';
    if (['flatDmg', 'critDmg', 'resPen', 'physIgnore', 'ds'].includes(stat)) return 3;
    if (['aspd', 'crit', 'dotPctDmg', 'elementalPctDmg', 'meleePctDmg', 'projectilePctDmg'].includes(stat)) return 2;
    return 1;
}

function getEffectiveResonanceCap() {
    let base = Math.max(0, Math.floor(game.resonancePower || 0));
    let runeBonus = 0;
    let stats = getUiPlayerStats(null);
    if (stats) {
        runeBonus = Math.max(0, Math.floor((stats && stats.runeResonancePower) || 0));
        let tempFloor = Math.max(0, Math.floor((stats && stats.uniqueResonanceFloor) || 0));
        let inquisitorBonus = Math.max(0, Math.floor((stats && stats.inquisitorResonanceBonus) || 0));
        base = Math.max(base, tempFloor) + inquisitorBonus;
    }
    return base + runeBonus;
}

function getSupportTierResonanceCost(name) {
    let base = getSupportResonanceCost(name);
    let tier = getSupportActiveTier(name);
    let db = SUPPORT_GEM_DB[name] || {};
    if (Array.isArray(db.resonanceCosts) && Number.isFinite(db.resonanceCosts[tier - 1])) return Math.max(1, Math.floor(db.resonanceCosts[tier - 1]));
    if (tier <= 1) return base;
    if (tier === 2) return Math.max(base + 2, Math.floor(base * 2.4));
    return Math.max(base + 5, Math.floor(base * 3.8));
}
function getSupportActiveTier(name) {
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    let unlocked = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let active = Math.max(1, Math.min(unlocked, Math.floor(rec.activeTier || 1)));
    rec.unlockedTier = unlocked;
    rec.activeTier = active;
    game.supportGemData = game.supportGemData || {};
    game.supportGemData[name] = rec;
    return active;
}
function setSupportActiveTier(name, tier) { if (!assertBuildEditable()) return;
    if (!SUPPORT_GEM_DB[name]) return;
    let rec = normalizeGemRecord(((game.supportGemData || {})[name]) || { level: 1, exp: 0 });
    let cap = typeof getSupportTierCap === 'function' ? getSupportTierCap(name) : 3;
    rec.unlockedTier = Math.max(1, Math.min(cap, Math.floor(rec.unlockedTier || 1)));
    let nextTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(tier || 1)));
    let prevTier = Math.max(1, Math.min(rec.unlockedTier, Math.floor(rec.activeTier || 1)));
    let equipped = (game.equippedSupports || []).includes(name);
    if (equipped && nextTier !== prevTier) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
        let nextUsed = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let resonancePower = getEffectiveResonanceCap();
        if (nextUsed > resonancePower) {
            rec.activeTier = prevTier;
            game.supportGemData[name] = rec;
            let need = Math.max(0, nextUsed - used);
            let remain = Math.max(0, resonancePower - used);
            return addLog(`공명력 부족 (${remain}/${need})`, 'attack-monster');
        }
    } else {
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
    }
    normalizeSupportLoadout(false);
    updateStaticUI();
}
function toggleSupport(name) { if (!assertBuildEditable()) return;
    normalizeSupportLoadout(false);
    game.equippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let idx = game.equippedSupports.indexOf(name);
    if (idx > -1) game.equippedSupports.splice(idx, 1);
    else {
        let stats = getUiPlayerStats();
        if (game.equippedSupports.length >= stats.suppCap) {
            updateStaticUI();
            return;
        }
        if (isSummonGuardSupport(name)) {
            let cap = getSummonEquipCapFromStats(stats);
            if (getEquippedSummonCount() >= cap) return addLog(`소환수 한도(${cap})로 인해 [${name}]은(는) 장착할 수 없습니다.`, 'attack-monster');
        }
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let remain = Math.max(0, getEffectiveResonanceCap() - used);
        let activeTier = getSupportActiveTier(name);
        let cost = getSupportTierResonanceCost(name);
        if (remain < cost) return addLog(`공명력 부족 (${remain}/${cost})`, 'attack-monster');
        game.equippedSupports.push(name);
    }
    updateStaticUI();
}


let mobileToastQueue = [];
let mobileToastActive = false;

function shouldShowMobileToast(msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    let isMobile = (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) || ('ontouchstart' in window);
    let logHidden = game && game.settings && game.settings.showCombatLog === false;
    if (!isMobile && !logHidden) return false;
    let text = stripHtmlMessage(msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || '');
    if (importantFailure) return true;
    let level = cls || '';
    if (level === 'attack-monster') {
        let noisyCombat = /(피격|상태이상|점화|중독|출혈|감전|냉각|도트|지속\s*피해)/.test(text || '');
        if (noisyCombat) return false;
        return true;
    }
    if (level === 'season-up' || level === 'loot-unique') return true;
    return false;
}

function getMobileToastRoot() {
    let root = document.getElementById('mobile-toast-root');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'mobile-toast-root';
    root.style.position = 'fixed';
    root.style.left = '50%';
    root.style.bottom = '84px';
    root.style.transform = 'translateX(-50%)';
    root.style.zIndex = '9999';
    root.style.pointerEvents = 'none';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '8px';
    root.style.width = 'min(92vw, 560px)';
    document.body.appendChild(root);
    return root;
}

function stripHtmlMessage(raw) {
    let div = document.createElement('div');
    div.innerHTML = String(raw || '');
    return (div.textContent || div.innerText || '').trim();
}

function enqueueMobileToast(msg, cls) {
    mobileToastQueue.push({ msg: stripHtmlMessage(msg), cls: cls || '' });
    if (!mobileToastActive) showNextMobileToast();
}

function showNextMobileToast() {
    if (mobileToastQueue.length <= 0) { mobileToastActive = false; return; }
    mobileToastActive = true;
    let entry = mobileToastQueue.shift();
    let root = getMobileToastRoot();
    let toast = document.createElement('div');
    toast.textContent = entry.msg;
    toast.style.background = entry.cls === 'attack-monster' ? 'rgba(120,35,35,0.94)' : 'rgba(22,30,45,0.94)';
    toast.style.border = entry.cls === 'attack-monster' ? '1px solid #b76464' : '1px solid #4f6f96';
    toast.style.color = '#eef5ff';
    toast.style.padding = '10px 12px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '13px';
    toast.style.lineHeight = '1.35';
    toast.style.boxShadow = '0 6px 20px rgba(0,0,0,0.35)';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .2s ease';
    root.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
            showNextMobileToast();
        }, 220);
    }, 1700);
}

let logQueue = [];
let logFlushRaf = 0;
let combatLogRateState = {};
let combatLogAggregateState = {};
function flushLogQueue() {
    logFlushRaf = 0;
    const log = document.getElementById('log');
    if (!log || logQueue.length === 0) return;
    let frag = document.createDocumentFragment();
    logQueue.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'log-msg ' + (entry.cls || '');
        div.innerHTML = entry.msg;
        frag.appendChild(div);
    });
    logQueue = [];
    log.appendChild(frag);
    while (log.childElementCount > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
}
function addLog(msg, cls, opts = {}) {
    let now = performance.now();
    let settings = game.settings || {};
    if (opts.rateKey && settings.combatLogRateLimit !== false) {
        let nextAt = combatLogRateState[opts.rateKey] || 0;
        let interval = Math.max(60, Number(opts.minIntervalMs || 180));
        if (now < nextAt) return;
        combatLogRateState[opts.rateKey] = now + interval;
    }
    if (opts.aggregateKey && settings.combatLogAggregate !== false) {
        let key = `${opts.aggregateKey}:${cls || ''}`;
        let state = combatLogAggregateState[key];
        let winMs = Math.max(120, Number(opts.aggregateWindowMs || 500));
        if (state && (now - state.lastAt) <= winMs) {
            state.count++;
            state.lastAt = now;
            state.msg = msg;
            return;
        }
        if (state && state.count > 0) {
            let merged = state.count > 1 ? `${state.msg} <span style="color:#9fb6cc;">x${state.count}</span>` : state.msg;
            logQueue.push({ msg: merged, cls: state.cls });
        }
        combatLogAggregateState[key] = { msg: msg, cls: cls, count: 1, lastAt: now };
        setTimeout(() => {
            let s = combatLogAggregateState[key];
            if (!s) return;
            if ((performance.now() - s.lastAt) >= winMs) {
                let merged = s.count > 1 ? `${s.msg} <span style="color:#9fb6cc;">x${s.count}</span>` : s.msg;
                logQueue.push({ msg: merged, cls: s.cls });
                delete combatLogAggregateState[key];
                if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
            }
        }, winMs + 10);
        if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
        return;
    }
    logQueue.push({ msg, cls });
    if (shouldShowMobileToast(msg, cls, opts)) enqueueMobileToast(msg, cls);
    if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
}

function applyThemeMode(mode) {
    let finalMode = mode === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('light-mode', finalMode === 'light');
}

function getHeroSelectionDef(heroId) {
    return HERO_SELECTION_DEFS[heroId] || HERO_SELECTION_DEFS.hero1;
}

function syncHeroSelectionState(source, options = {}) {
    if (!Array.isArray(game.discoveredHeroIds)) game.discoveredHeroIds = [];
    game.discoveredHeroIds = game.discoveredHeroIds.filter(id => HERO_SELECTION_DEFS[id]);
    if (!HERO_SELECTION_DEFS[game.selectedHeroId]) game.selectedHeroId = 'hero1';
    if (game.appearanceHeroId && !HERO_SELECTION_DEFS[game.appearanceHeroId]) game.appearanceHeroId = null;
    let shouldRecordSelected = !!options.recordSelected || !!game.heroSelectionInitialized || !!game.heroFreeSwitchUnlocked;
    if (shouldRecordSelected && !game.discoveredHeroIds.includes(game.selectedHeroId)) game.discoveredHeroIds.push(game.selectedHeroId);
    if (game.heroSelectionInitialized && game.unlocks) game.unlocks.char = true;
    let unlockedBefore = !!game.heroFreeSwitchUnlocked;
    if (game.discoveredHeroIds.length >= HERO_SELECTION_ORDER.length) game.heroFreeSwitchUnlocked = true;
    if (!unlockedBefore && game.heroFreeSwitchUnlocked) addLog('🧬 모든 캐릭터 재능을 확인했습니다. 설정에서 언제든 외형 변경이 가능합니다.', 'season-up');
    if (source === 'init') return;
    let summaryEl = document.getElementById('ui-hero-talent-summary');
    if (summaryEl) {
        let def = getHeroSelectionDef(game.selectedHeroId);
        let appearanceDef = getHeroSelectionDef(typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId);
        let discovered = Math.min(HERO_SELECTION_ORDER.length, game.discoveredHeroIds.length);
        let unlockText = game.heroFreeSwitchUnlocked ? `외형 변경 해금됨 · 외형: ${appearanceDef.label}` : `해금 진행 ${discovered}/${HERO_SELECTION_ORDER.length}`;
        summaryEl.innerText = `${def.label} · 실제 재능: ${def.talentsText} · ${unlockText}`;
    }
}

function renderHeroSelectionControls() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    selectEl.innerHTML = HERO_SELECTION_ORDER.map(id => {
        let def = HERO_SELECTION_DEFS[id];
        return `<option value="${id}">${def.label}</option>`;
    }).join('');
    selectEl.value = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.selectedHeroId || 'hero1');
    if (!game.heroFreeSwitchUnlocked) {
        selectEl.disabled = true;
        selectEl.title = '모든 캐릭터를 한 번씩 선택하면 자유 변경이 해금됩니다.';
    } else {
        selectEl.disabled = false;
        selectEl.title = '';
    }
    syncHeroSelectionState();
}

function persistHeroSelectionChange(reason) {
    if (!saveGame({ skipCloudSync: true })) return;
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave(reason || '캐릭터 재능 변경');
}

function applyHeroSelection(heroId, options = {}) {
    if (!HERO_SELECTION_DEFS[heroId]) return false;
    if (options.cosmeticOnly) {
        if (!game.heroFreeSwitchUnlocked) return false;
        let prevAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.appearanceHeroId || game.selectedHeroId || 'hero1');
        game.appearanceHeroId = heroId;
        syncHeroSelectionState();
        if (prevAppearance !== heroId && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
        renderHeroSelectionControls();
        if (!options.silent && prevAppearance !== heroId) addLog(`🧬 캐릭터 외형 변경: ${getHeroSelectionDef(heroId).label}`, 'season-up');
        if (!options.skipSave) persistHeroSelectionChange('캐릭터 외형 변경');
        return true;
    }
    let prev = game.selectedHeroId;
    game.selectedHeroId = heroId;
    syncHeroSelectionState(null, { recordSelected: true });
    if (prev !== heroId && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
    renderHeroSelectionControls();
    if (!options.silent && prev !== heroId) addLog(`🧬 캐릭터 변경: ${getHeroSelectionDef(heroId).label}`, 'season-up');
    if (!options.skipSave) persistHeroSelectionChange('캐릭터 재능 변경');
    return true;
}

function onHeroSelectionChanged() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    if (!game.heroFreeSwitchUnlocked) {
        addLog('🔒 아직 자유 변경이 잠겨 있습니다. 루프를 돌며 모든 캐릭터를 확인하세요.', 'attack-monster');
        selectEl.value = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.selectedHeroId || 'hero1');
        return;
    }
    applyHeroSelection(selectEl.value, { cosmeticOnly: true });
    updateStaticUI();
}

// ── 몬스터 외형 수집 시스템 ──
// 일반 잡몹/정예가 사용하는 스프라이트 시트 프레임(아틀라스 enemies.frames)과
// 보스 전용 이미지(BOSS_ASSET_MANIFEST)를 플레이어 외형으로 수집/적용한다.
const MONSTER_SKIN_FRAME_DEFS = [
    { id: 'slime', label: '슬라임' },
    { id: 'bandit', label: '도적' },
    { id: 'shadow', label: '그림자' },
    { id: 'wraith', label: '망령' },
    { id: 'knight', label: '기사' },
    { id: 'skeleton', label: '해골' },
    { id: 'boss', label: '마수 군주' }
];

function getMonsterSkinLabel(id) {
    let frameDef = MONSTER_SKIN_FRAME_DEFS.find(def => def.id === id);
    if (frameDef) return frameDef.label;
    let m = /^bossAct(\d+)(?:_(\d+))?$/.exec(id || '');
    if (m) {
        let act = Number(m[1]);
        let base = (typeof ACT_BOSS_NAMES !== 'undefined' && ACT_BOSS_NAMES[act - 1]) ? ACT_BOSS_NAMES[act - 1] : `${act}막 보스`;
        let variants = (typeof BOSS_ASSET_VARIANTS_BY_ACT !== 'undefined') ? BOSS_ASSET_VARIANTS_BY_ACT[act] : null;
        if (m[2] && variants && variants.length > 1) {
            let roman = ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ'][Number(m[2]) - 1] || m[2];
            return `${base} ${roman}`;
        }
        return base;
    }
    return id || '';
}

function getMonsterSkinDefs() {
    let defs = MONSTER_SKIN_FRAME_DEFS.map(def => ({ id: def.id, label: def.label, type: 'frame' }));
    if (typeof BOSS_ASSET_MANIFEST !== 'undefined') {
        Object.keys(BOSS_ASSET_MANIFEST).forEach(key => defs.push({ id: key, label: getMonsterSkinLabel(key), type: 'boss' }));
    }
    return defs;
}

// 처치한 적이 화면에 표시한 외형의 스킨 id를 반환한다.
// (렌더러 pickBattleEnemyVariant / getBossAssetVariantEntry 의 선택 로직과 동일하게 맞춘다.)
function getEnemySkinId(enemy) {
    if (!enemy) return null;
    if (enemy.bossAssetKey) return enemy.bossAssetKey;
    let normalPool = ['slime', 'bandit', 'shadow', 'wraith'];
    let elitePool = ['knight', 'skeleton', 'shadow', 'wraith', 'bandit'];
    let bossPool = ['boss'];
    let pool = enemy.isBoss ? bossPool : (enemy.isElite ? elitePool : normalPool);
    if (pool.length === 0) return null;
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function resolveMonsterSkinSprite(id) {
    if (!id || !battleAssets.ready || !battleAssets.atlas || !battleAssets.atlas.enemies) return null;
    let enemyAtlas = battleAssets.atlas.enemies;
    let bossImage = (enemyAtlas.bossImages || {})[id];
    if (bossImage) {
        return {
            type: 'boss',
            image: bossImage,
            frame: { x: 0, y: 0, width: bossImage.width, height: bossImage.height, basisHeight: bossImage.height }
        };
    }
    let frame = (enemyAtlas.frames || {})[id];
    if (frame) return { type: 'frame', image: enemyAtlas.image, frame: frame };
    return null;
}

function getSelectedMonsterSkinId() {
    let id = game && game.selectedMonsterSkin;
    if (!id) return null;
    return (game.unlockedMonsterSkins && game.unlockedMonsterSkins[id]) ? id : null;
}

// 몬스터 처치 시 0.002% 확률 해금 (handleEnemyDeath 에서 확률 판정 후 호출)
function tryUnlockMonsterSkinFromEnemy(enemy) {
    let id = getEnemySkinId(enemy);
    if (!id) return;
    game.unlockedMonsterSkins = game.unlockedMonsterSkins || {};
    if (game.unlockedMonsterSkins[id]) return;
    game.unlockedMonsterSkins[id] = true;
    addLog(`🎭 극희귀 발견! 몬스터 외형 [${getMonsterSkinLabel(id)}]을(를) 획득했습니다! (설정 > 몬스터 외형에서 적용)`, 'loot-unique');
    if (typeof renderMonsterSkinControls === 'function') renderMonsterSkinControls();
    if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
}

function renderMonsterSkinControls() {
    let selectEl = document.getElementById('sel-monster-skin');
    if (!selectEl) return;
    let unlocked = (game && game.unlockedMonsterSkins) ? game.unlockedMonsterSkins : {};
    let allDefs = getMonsterSkinDefs();
    let ownedDefs = allDefs.filter(def => unlocked[def.id]);
    let options = ['<option value="">사용 안 함 (기본 캐릭터)</option>'];
    ownedDefs.forEach(def => options.push(`<option value="${def.id}">${def.label}</option>`));
    selectEl.innerHTML = options.join('');
    selectEl.value = (game && game.selectedMonsterSkin && unlocked[game.selectedMonsterSkin]) ? game.selectedMonsterSkin : '';
    selectEl.disabled = ownedDefs.length === 0;
    selectEl.title = ownedDefs.length === 0
        ? '아직 획득한 몬스터 외형이 없습니다. 몬스터 처치 시 극히 낮은 확률로 외형을 얻습니다.'
        : `획득한 몬스터 외형 ${ownedDefs.length}/${allDefs.length}`;
}

function onMonsterSkinChanged() {
    let selectEl = document.getElementById('sel-monster-skin');
    if (!selectEl) return;
    let id = selectEl.value || null;
    if (id && !(game.unlockedMonsterSkins && game.unlockedMonsterSkins[id])) {
        renderMonsterSkinControls();
        return;
    }
    game.selectedMonsterSkin = id;
    addLog(`🎭 몬스터 외형 변경: ${id ? getMonsterSkinLabel(id) : '기본 캐릭터'}`, 'season-up');
    if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
    updateStaticUI();
}

function ensureInitialHeroSelection() {
    if (game.heroSelectionInitialized) return;
    openLoopHeroSelection((pickedId) => {
        game.heroSelectionInitialized = true;
        if (game.unlocks) game.unlocks.char = true;
        addLog(`🧬 첫 루프 캐릭터가 정해졌습니다: ${HERO_SELECTION_DEFS[pickedId].blindLabel}`, 'season-up');
        persistHeroSelectionChange('첫 루프 캐릭터 선택');
    }, {
        kicker: 'Character Selection',
        title: '시작 캐릭터 선택',
        body: '첫 루프에서 사용할 캐릭터를 선택하세요.'
    });
}

function playLoopRewriteEffect() {
    let overlay = document.getElementById('loop-rewrite-overlay');
    if (!overlay) return;
    overlay.innerHTML = '<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">흔적을 거슬러, 이전 루프로 복귀합니다.</div></div>';
    document.body.classList.add('loop-rewrite-active');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
        document.body.classList.remove('loop-rewrite-active');
    }, 1950);
}

window.addEventListener('project-idle:loop-hero-selection-requested', event => {
    let detail = event && event.detail;
    if (!detail || typeof detail.select !== 'function') return;
    if (isLoopHeroSelectOpen() || isStartupOverlayOpen() || isLoadingOverlayOpen() || isDeathOverlayOpen()) return;
    detail.handled = true;
    openLoopHeroSelection(detail.select, detail.options || {});
});

window.addEventListener('project-idle:loop-hero-selection-completed', event => {
    let detail = event && event.detail;
    if (!detail) return;
    if (detail.changed) addLog(`🧬 루프 전환으로 ${getHeroSelectionDef(detail.heroId).label} 캐릭터를 선택했습니다.`, 'season-up');
    switchTab('tab-character');
});

window.addEventListener('project-idle:loop-rewrite-started', playLoopRewriteEffect);

window.addEventListener('project-idle:talent-tab-refresh-requested', () => {
    let talentTab = document.getElementById('tab-talent');
    if (typeof renderTalentTab === 'function' && talentTab && talentTab.classList.contains('active')) renderTalentTab();
});

function updateSettings() {
    let previousSocialChatNotifications = game.settings.socialChatNotifications !== false;
    game.settings.showCombatScene = document.getElementById('chk-combat-scene').checked;
    let cameraShakeCheckbox = document.getElementById('chk-camera-shake');
    game.settings.cameraShake = !cameraShakeCheckbox || cameraShakeCheckbox.checked;
    game.settings.showCombatLog = document.getElementById('chk-log-combat').checked;
    game.settings.combatLogAggregate = document.getElementById('chk-log-aggregate').checked;
    game.settings.combatLogRateLimit = document.getElementById('chk-log-rate-limit').checked;
    game.settings.showSpawnLog = document.getElementById('chk-log-spawn').checked;
    game.settings.showExpLog = document.getElementById('chk-log-exp').checked;
    game.settings.showLootLog = document.getElementById('chk-log-loot').checked;
    game.settings.showCrowdPauseLog = document.getElementById('chk-log-crowd').checked;
    game.settings.showDeathNotice = document.getElementById('chk-death-notice').checked;
    game.settings.showMobileBattlePip = document.getElementById('chk-mobile-battle-pip').checked;
    let tabNotiCheckbox = document.getElementById('chk-tab-noti');
    if (tabNotiCheckbox) game.settings.tabNotiEnabled = tabNotiCheckbox.checked;
    let socialChatNotiCheckbox = document.getElementById('chk-social-chat-noti');
    if (socialChatNotiCheckbox) game.settings.socialChatNotifications = socialChatNotiCheckbox.checked;
    if (game.settings.socialChatNotifications === false && game.noti) game.noti.social = false;
    if (previousSocialChatNotifications !== (game.settings.socialChatNotifications !== false)
        && typeof syncSocialChatNotificationSetting === 'function') syncSocialChatNotificationSetting();
    let twoRowTabsCheckbox = document.getElementById('chk-two-row-tabs');
    game.settings.twoRowTabs = !!(twoRowTabsCheckbox && twoRowTabsCheckbox.checked);
    lastTabHeaderUiSignature = null;
    let pauseOverlayCheckbox = document.getElementById('chk-pause-overlay');
    game.settings.pauseGameOnOverlay = !!(pauseOverlayCheckbox && pauseOverlayCheckbox.checked);
    let damageFormatSelect = document.getElementById('sel-damage-number-format');
    let damageFormat = damageFormatSelect ? damageFormatSelect.value : game.settings.damageNumberFormat;
    game.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(damageFormat) ? damageFormat : 'comma';
    game.settings.showExpComma = document.getElementById('chk-exp-comma').checked;
    game.settings.showHpComma = document.getElementById('chk-hp-comma').checked;
    game.settings.showEnemyHpComma = document.getElementById('chk-enemy-hp-comma').checked;
    game.settings.showCharacterComma = document.getElementById('chk-character-comma').checked;
    game.settings.itemFilterEnabled = document.getElementById('chk-item-filter-enabled').checked;
    game.settings.itemFilterRarities = game.settings.itemFilterRarities || { normal: true, magic: true, rare: true, unique: true };
    game.settings.itemFilterRarities.normal = document.getElementById('chk-item-filter-normal').checked;
    game.settings.itemFilterRarities.magic = document.getElementById('chk-item-filter-magic').checked;
    game.settings.itemFilterRarities.rare = document.getElementById('chk-item-filter-rare').checked;
    game.settings.itemFilterRarities.unique = document.getElementById('chk-item-filter-unique').checked;
    game.settings.itemFilterTierThreshold = Math.max(1, Math.floor(Number(document.getElementById('inp-item-filter-tier-threshold').value) || 1));
    game.settings.itemFilterMinTierCount = Math.max(0, Math.floor(Number(document.getElementById('inp-item-filter-tier-count').value) || 0));
    game.settings.itemFilterMinHiddenTier = Math.max(1, Math.floor(Number(document.getElementById('inp-item-filter-hidden-tier').value) || 1));
    game.settings.itemFilterOnlyNewCodexUnique = document.getElementById('chk-item-filter-unique-new-codex').checked;
    game.settings.mapCompleteAction = (document.getElementById('sel-map-complete-action') || {}).value || 'nextZone';
    game.settings.townReturnAction = (document.getElementById('sel-town-return-action') || {}).value || 'retry';
    let themeSelect = document.getElementById('sel-theme-mode');
    game.settings.themeMode = themeSelect ? themeSelect.value : (game.settings.themeMode || 'dark');
    applyThemeMode(game.settings.themeMode);
    toggleDeathNoticeSetting(game.settings.showDeathNotice);
    updateStaticUI();
}

function positionTooltipElement(el, x, y) {
    if (!el) return;
    el.style.left = '0px';
    el.style.top = '0px';
    let rect = el.getBoundingClientRect();
    let left = x + 18;
    let top = y + 18;
    if (left + rect.width > window.innerWidth - 10) left = x - rect.width - 18;
    if (top + rect.height > window.innerHeight - 10) top = y - rect.height - 18;
    left = clampNumber(left, 8, Math.max(8, window.innerWidth - rect.width - 8));
    top = clampNumber(top, 8, Math.max(8, window.innerHeight - rect.height - 8));
    el.style.left = left + 'px';
    el.style.top = top + 'px';
}
function setActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') activeTooltipId = null;
    activeTooltipId = id;
    let el = document.getElementById(id);
    if (el && el.style.display !== 'none') positionTooltipElement(el, mouseX, mouseY);
}
function clearActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') return;
    if (activeTooltipId === id) activeTooltipId = null;
}

function showInfoTooltipHtml(x, y, html, borderColor) {
    let tt = document.getElementById('info-tooltip');
    tt.innerHTML = html;
    tt.style.borderColor = borderColor || '#777';
    tt.style.display = 'block';
    positionTooltipElement(tt, x, y);
    setActiveTooltip('info-tooltip');
}
function hideInfoTooltip() {
    clearActiveTooltip('info-tooltip');
    document.getElementById('info-tooltip').style.display = 'none';
}
document.addEventListener('mousemove', function(evt) {
    let tt = document.getElementById('info-tooltip');
    if (!tt || tt.style.display === 'none') return;
    let anchor = evt.target && evt.target.closest ? evt.target.closest('[data-info-tooltip-anchor="1"]') : null;
    if (!anchor && evt.target && evt.target.closest) anchor = evt.target.closest('.tip, .skill-gem, .support-gem, .item-card, .currency-card, .condition-gem-card');
    let overTooltip = evt.target && evt.target.closest ? evt.target.closest('#info-tooltip') : null;
    if (!anchor && !overTooltip) hideInfoTooltip();
});
let activeTalismanHoverId = null;
function setTalismanHoverGroup(talismanId) {
    if (activeTalismanHoverId === talismanId) return;
    document.querySelectorAll('.talisman-board-cell.talisman-hover-group').forEach(el => el.classList.remove('talisman-hover-group'));
    activeTalismanHoverId = talismanId || null;
    if (!activeTalismanHoverId) return;
    document.querySelectorAll(`[data-talisman-hover-id="${activeTalismanHoverId}"]`).forEach(el => el.classList.add('talisman-hover-group'));
}
function getTalismanDisplayName(talisman) {
    if (!talisman) return '부적';
    return talisman.name || talisman.statName || '부적';
}

function getTalismanPrimaryStatLine(talisman, min, max) {
    if (!talisman || !talisman.stat) return '';
    let label = talisman.statName || getStatName(talisman.stat);
    return `${label} +${formatValue(talisman.stat, talisman.value)} (${formatValue(talisman.stat, min)}~${formatValue(talisman.stat, max)})`;
}

function getTalismanTooltipStatLines(talisman) {
    if (!talisman) return [];
    let stats = getTalismanWaxSourceStats(talisman);
    if (stats.length > 0) return stats.map(st => `${st.waxBonus ? '밀랍 · ' : ''}${st.label || getStatName(st.stat)} +${formatValue(st.stat, st.value)}`);
    let min = Number.isFinite(talisman.valueMin) ? talisman.valueMin : talisman.value;
    let max = Number.isFinite(talisman.valueMax) ? talisman.valueMax : talisman.value;
    let line = getTalismanPrimaryStatLine(talisman, min, max);
    return line ? [line] : [];
}

function getTalismanRollQuality(talisman) {
    if (!talisman || talisman.isUnique || talisman.special || !Number.isFinite(Number(talisman.value))) return null;
    let min = Number(talisman.valueMin);
    let max = Number(talisman.valueMax);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    return Math.max(0, Math.min(100, Math.round(((Number(talisman.value) - min) / (max - min)) * 100)));
}

function buildTalismanTooltipHtml(talisman) {
    if (!talisman) return '<div class="tooltip-title">부적</div>';
    let statLine = getTalismanTooltipStatLines(talisman).map(line => `<div class="tooltip-line">${escapeHTML(line)}</div>`).join('');
    let specialDesc = getTalismanSpecialDescription(talisman);
    let momentRollLine = talisman.special === 'moment' ? `<div class="tooltip-line" style="color:#ffe38a;">찰나 롤: +${typeof getTalismanMomentRoll === 'function' ? getTalismanMomentRoll(talisman) : (talisman.bossFinalDmgRoll || talisman.bossFinalDmgMin || 5)}% (가능 범위 +${talisman.bossFinalDmgMin || 5}~${talisman.bossFinalDmgMax || 15}%)</div>` : '';
    let rollQuality = getTalismanRollQuality(talisman);
    let qualityLine = rollQuality === null ? '' : `<div class="tooltip-line" style="color:${rollQuality >= 75 ? '#8fe7b0' : (rollQuality >= 40 ? '#ffd68a' : '#9fb4d1')};">옵션 품질: 상한 대비 ${rollQuality}%</div>`;
    let sourceLine = talisman.source ? `<div class="tooltip-line" style="color:#9fc4ea;">${escapeHTML(talisman.rarity || '부적')} · 형태 ${escapeHTML(talisman.shape || '-')}</div>` : '';
    return `<div class="tooltip-title">${escapeHTML(getTalismanDisplayName(talisman))}</div>${sourceLine}${qualityLine}${statLine}${specialDesc ? `<div class="tooltip-line" style="color:#ffd6a0;">고유 효과: ${escapeHTML(specialDesc)}</div>` : ''}${momentRollLine}`;
}

function showTalismanBoardTooltip(event, talismanId) {
    let placed = talismanId ? ((game.talismanPlacements || {})[talismanId] || {}).talisman : null;
    if (!placed) return;
    setTalismanHoverGroup(talismanId);
    showInfoTooltipHtml(event.clientX, event.clientY, buildTalismanTooltipHtml(placed), '#8fd3ff');
}

function getTalismanSpecialDescription(talisman) {
    if (!talisman || !talisman.special) return '';
    if (talisman.special === 'gravity') return '인접(상하좌우) 부적들의 능력치를 25%씩 복제해 합산.';
    if (talisman.special === 'simpleCopy') return `화살표 방향(현재: ${talisman.markDir || 'up'})의 인접 부적 1개의 모든 능력치를 동일 수치로 복제.`;
    if (talisman.special === 'temperance') return '무작위 능력치 3줄을 동시에 부여(각 줄 독립 수치).';
    if (talisman.special === 'pride') return '인접 부적 수에 따라 보너스 부여: 0개(젬레벨+1/보조한도+1), 1개(보조한도+1), 2~4개(피해+15%/공속+10%), 5개 이상(치확+5%/치피+25% 포함).';
    if (talisman.special === 'moment') {
        let min = talisman.bossFinalDmgMin || 5;
        let max = talisman.bossFinalDmgMax || 15;
        let roll = typeof getTalismanMomentRoll === 'function' ? getTalismanMomentRoll(talisman) : (talisman.bossFinalDmgRoll || min);
        return `보스 최종 피해 +${roll}% (롤 범위 +${min}~${max}%) 및 보스 체력 5% 이하 즉시 처형.`;
    }
    if (talisman.special === 'cosmosChoice') return '가로 배치 시 모든 스킬 젬 레벨 +2. 세로 배치 시 모든 스킬 젬 레벨 -2, 보조 젬 한도 +2.';
    if (talisman.special === 'cosmosLightningVariance') return '번개 피해의 최종 피해가 타격마다 0.8배~1.5배 사이에서 무작위로 결정됩니다.';
    if (talisman.special === 'cosmosRepulsion') return '인접한 부적의 모든 효과를 무효화하고, 인접하지 않은 부적의 기본 능력치를 25% 증가시키는 전용 부적입니다.';
    if (talisman.special === 'elementFocus') {
        let list = Array.isArray(talisman.stats) ? talisman.stats : [];
        if (list.length >= 3) return `${getStatName(list[0].stat)} +${formatValue(list[0].stat, list[0].value)}, ${getStatName(list[1].stat)} +${formatValue(list[1].stat, list[1].value)}, ${getStatName(list[2].stat)} +${formatValue(list[2].stat, list[2].value)}`;
        return '해당 계열 젬 레벨/해당 계열 피해/해당 계열 저항 3종을 동시에 부여.';
    }
    return talisman.special;
}

function showTalismanInventoryTooltip(event, talismanId) {
    let inv = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    let t = inv.find(row => row && row.id === talismanId);
    if (!t) return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildTalismanTooltipHtml(t), '#8fd3ff');
}

function showTalismanUnsealTooltip(event) {
    let current = game.talismanUnseal && game.talismanUnseal.current;
    if (!current) return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildTalismanTooltipHtml(current), '#8fd3ff');
}

function showTalismanUnlockTooltip(event, x, y) {
    let unlockedSet = getTalismanUnlockedCellsSet();
    let extraUnlocked = Math.max(0, unlockedSet.size - 16);
    let unlockCost = getTalismanExpandCost(extraUnlocked);
    let html = `<div class="tooltip-title">잠긴 부적 칸</div><div class="tooltip-line">좌표: (${x + 1}, ${y + 1})</div><div class="tooltip-line">해금 비용: ${formatTalismanUnlockCostLabel(unlockCost)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7ea6d3');
}

function getTalismanPlacementPreviewAt(x, y) {
    let talisman = (game.talismanInventory || []).find(row => row && row.id === game.talismanSelectedId);
    if (!talisman) return null;
    let anchor = getTalismanAnchorCell(talisman);
    let baseX = x - anchor.x;
    let baseY = y - anchor.y;
    let invalidReason = '';
    for (let cell of (talisman.cells || [])) {
        let cellX = baseX + (Number(cell.x) || 0);
        let cellY = baseY + (Number(cell.y) || 0);
        if (cellX < 0 || cellY < 0 || cellX >= TALISMAN_BOARD_W || cellY >= TALISMAN_BOARD_H) {
            invalidReason = '형태가 보드 바깥으로 나갑니다.';
            break;
        }
        if (!isTalismanCellUnlocked(cellX, cellY)) {
            invalidReason = '형태가 잠긴 칸을 포함합니다.';
            break;
        }
        if ((game.talismanBoard || [])[talismanCellIndex(cellX, cellY)]) {
            invalidReason = '다른 부적과 겹칩니다.';
            break;
        }
    }
    if (invalidReason) return { talisman, valid: false, baseX, baseY, invalidReason };
    let current = calculateTalismanBoardEffects(game.talismanPlacements || {}, game.talismanBoard || []);
    let board = Array.isArray(game.talismanBoard) ? game.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (board.length < TALISMAN_BOARD_W * TALISMAN_BOARD_H) board.push(null);
    (talisman.cells || []).forEach(cell => {
        board[talismanCellIndex(baseX + (Number(cell.x) || 0), baseY + (Number(cell.y) || 0))] = talisman.id;
    });
    let placements = { ...(game.talismanPlacements || {}) };
    placements[talisman.id] = { x: baseX, y: baseY, talisman };
    let next = calculateTalismanBoardEffects(placements, board);
    let statIds = Array.from(new Set(Object.keys(current.stats || {}).concat(Object.keys(next.stats || {}))));
    let deltas = statIds.map(stat => ({
        stat,
        value: (Number((next.stats || {})[stat]) || 0) - (Number((current.stats || {})[stat]) || 0)
    })).filter(row => Math.abs(row.value) > 0.0001);
    let nameById = Object.fromEntries((next.entries || []).map(entry => [entry.talisman.id, getTalismanDisplayName(entry.talisman)]));
    let currentSuppressed = new Set(current.suppressedIds || []);
    let currentAmplified = new Set(current.amplifiedIds || []);
    return {
        talisman,
        valid: true,
        baseX,
        baseY,
        current,
        next,
        deltas,
        adjacentCount: ((next.adjacency || {})[talisman.id] || []).length,
        suppressedNames: (next.suppressedIds || []).filter(id => !currentSuppressed.has(id)).map(id => nameById[id] || '부적'),
        amplifiedNames: (next.amplifiedIds || []).filter(id => !currentAmplified.has(id)).map(id => nameById[id] || '부적')
    };
}

function showTalismanPlacementTooltip(event, x, y) {
    if (typeof calculateTalismanBoardEffects !== 'function') return;
    let preview = getTalismanPlacementPreviewAt(x, y);
    if (!preview) return hideInfoTooltip();
    let title = `<div class="tooltip-title">${escapeHTML(getTalismanDisplayName(preview.talisman))} 배치 미리보기</div>`;
    if (!preview.valid) {
        return showInfoTooltipHtml(event.clientX, event.clientY, `${title}<div class="tooltip-line" style="color:#ff9a9a;">배치 불가 · ${escapeHTML(preview.invalidReason)}</div>`, '#d26f78');
    }
    let deltaRows = preview.deltas.filter(row => row.stat !== 'cosmosLightningVariance').map(row => {
        let positive = row.value > 0;
        return `<div class="tooltip-line" style="color:${positive ? '#8fe7b0' : '#ff9a9a'};">${escapeHTML(getStatName(row.stat))} ${positive ? '+' : '-'}${formatValue(row.stat, Math.abs(row.value))}</div>`;
    }).join('');
    let specialRows = '';
    let bossDelta = (Number(preview.next.bossFinalDmgBonusPct) || 0) - (Number(preview.current.bossFinalDmgBonusPct) || 0);
    if (bossDelta) specialRows += `<div class="tooltip-line" style="color:${bossDelta > 0 ? '#ffe38a' : '#ff9a9a'};">보스 최종 피해 ${bossDelta > 0 ? '+' : ''}${bossDelta}%</div>`;
    if ((preview.next.stats.cosmosLightningVariance || 0) > (preview.current.stats.cosmosLightningVariance || 0)) specialRows += '<div class="tooltip-line" style="color:#ffe083;">번개 피해 0.8~1.5배 변동 활성</div>';
    if (preview.suppressedNames.length > 0) specialRows += `<div class="tooltip-line" style="color:#ff9a9a;">반발로 비활성: ${preview.suppressedNames.map(escapeHTML).join(', ')}</div>`;
    if (preview.amplifiedNames.length > 0) specialRows += `<div class="tooltip-line" style="color:#8fe7b0;">반발로 기본 능력치 +25%: ${preview.amplifiedNames.map(escapeHTML).join(', ')}</div>`;
    let specialDesc = getTalismanSpecialDescription(preview.talisman);
    let body = `<div class="tooltip-line" style="color:#9fc4ea;">배치 가능 · 인접 부적 ${preview.adjacentCount}개</div>${deltaRows || '<div class="tooltip-line" style="color:#9fb4d1;">직접 수치 변화 없음</div>'}${specialRows}${specialDesc ? `<div class="tooltip-line" style="color:#ffd6a0;">${escapeHTML(specialDesc)}</div>` : ''}`;
    showInfoTooltipHtml(event.clientX, event.clientY, title + body, '#79c79a');
}

function hideTalismanBoardTooltip(event, talismanId) {
    let next = event && event.relatedTarget && event.relatedTarget.closest ? event.relatedTarget.closest(`[data-talisman-hover-id="${talismanId}"]`) : null;
    if (next) return;
    setTalismanHoverGroup(null);
    hideInfoTooltip();
}

function renderBreakdownHtml(data) {
    let html = `<div class="tooltip-title">${data.title}</div>`;
    (data.lines || []).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">최종 수치: ${data.final}</div>`;
    return html;
}

function showStatTooltip(event, key) {
    let stats = cachedTooltipStats;
    if (!stats || !stats.breakdowns || !stats.breakdowns[key]) {
        let statsProvider = (typeof getPlayerStats === 'function')
            ? getPlayerStats
            : ((typeof window !== 'undefined' && typeof window.getPlayerStats === 'function') ? window.getPlayerStats : null);
        if (!statsProvider) return;
        stats = statsProvider();
        cachedTooltipStats = stats;
    }
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    showInfoTooltipHtml(event.clientX, event.clientY, renderBreakdownHtml(data), '#f39c12');
}


function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈' };
    let p = Math.max(0.1, Number(power || 0.1));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let detail = '';
    if (isUiDamageAilmentType(type)) {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let dps = getUiPlayerDamageAilmentDps({ type: type, power: p, sourceHitDamage: source }, tooltipStats);
        let basis = source > 0 ? `받은 피해 ${Math.floor(source)} 기준` : '최대 생명력 기반';
        detail = `초당 피해: 약 ${dps} <span style="color:#9fb4d1;">(${basis})</span>`;
    } else if (type === 'chill') detail = `공격 속도 약 32% 감소`;
    else if (type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let shockTakenIncrease = getUiPlayerShockTakenDamageIncreasePct(p, tooltipStats);
        detail = formatUiTakenDamageShockLine(shockTakenIncrease);
    }
    else if (type === 'freeze') detail = '행동 불가';
    let html = `<div class="tooltip-title">${labels[type] || type}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(timeLeft||0)))}초</div><div class="tooltip-line">위력: ${p.toFixed(2)}</div><div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ff7f7f');
}
function showPlayerBuffTooltip(event, name, type, remainSec) {
    let entry = getAllConditionGemEntries().find(row => row && row.name === name) || { name, type: type || 'buff' };
    let typeLabel = { curse: '저주', warcry: '함성', guard: '가드', buff: '버프' }[type || entry.type] || (type || entry.type || '버프');
    let html = `<div class="tooltip-title">${name}</div><div class="tooltip-line">분류: ${typeLabel}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(remainSec||0)))}초</div><div class="tooltip-line">효과: ${getConditionGemDetail(entry)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}
// 플라스크 발동은 전투 중 자주 반복되어 전투 로그에 띄우면 스팸이 되므로, 캐릭터 효과
// 줄(생명력 바 아래)에 아이콘으로만 표시하고 상세 정보는 이 커스텀 툴팁으로 보여준다.
function showPlayerFlaskTooltip(event, kind, key) {
    if (typeof ensureFlaskState !== 'function') return;
    let st = ensureFlaskState();
    let now = Date.now();
    let html = '';
    if (kind === 'heal') {
        let def = getFlaskHealDef(key);
        let remain = Math.max(0, Math.ceil(((st.healOverTimeUntil || 0) - now) / 1000));
        html = `<div class="tooltip-title">🧪 ${def.name}</div>`
            + `<div class="tooltip-line">남은 시간: ${remain}초</div>`
            + `<div class="tooltip-line">지속 회복: 초당 약 ${(st.healOverTimePerSec || 0).toLocaleString()}</div>`
            + `<div class="tooltip-line" style="color:#9fb4d1;">생명력 ${def.autoBelowHpPct}% 이하 시 자동 발동 · ${Math.round((def.durationMs || 4000) / 1000)}초간 총 ${def.healPct}% 회복</div>`
            + `<div class="tooltip-line" style="color:#9fb4d1;">남은 충전: ${st.healCharges}/${def.maxCharges}</div>`;
    } else {
        let def = FLASK_UTILITY_POOL[key];
        if (!def) return;
        let entry = (st.utils || []).find(u => u && u.key === key);
        let remain = entry ? Math.max(0, Math.ceil(((entry.until || 0) - now) / 1000)) : 0;
        html = `<div class="tooltip-title">🧪 ${def.name}</div>`
            + `<div class="tooltip-line">남은 시간: ${remain}초</div>`
            + `<div class="tooltip-line">효과: ${def.desc}</div>`
            + `<div class="tooltip-line" style="color:#9fb4d1;">남은 충전: ${entry ? entry.charges : 0}/${def.maxCharges}</div>`;
    }
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#9ed6ff');
}
function showEnemyAilmentTooltip(event, type, timeLeft, power, sourceHitDamage, specialDps, critDotBonusPct, stackCount, rawTickDamage, tickInterval, enemyRes, abyssPlayerMul, igniteTakenMultiplier) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈', flameDecay: '화염 부패', hunterExpose: '약점 노출' };
    let p = Math.max(0, Number(power || 0));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let remainSec = Math.max(0, Number(timeLeft || 0));
    let stacks = Math.max(1, Math.floor(Number(stackCount || 1)));
    let detail = '';
    if (isUiDamageAilmentType(type)) {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let ailmentDps = getUiEnemyDamageAilmentDps({ type: type, power: p, sourceHitDamage: source, critDotBonusPct: critDotBonusPct }, tooltipStats);
        let totalDamage = Math.max(0, Math.floor(ailmentDps * stacks * remainSec));
        let stackText = stacks > 1 ? ` · ${stacks}중첩` : '';
        detail = `총 피해량: 약 ${totalDamage} <span style="color:#9fb4d1;">(원천피해: ${Math.floor(source)} / 초당 피해: 약 ${ailmentDps}${stackText})</span>`;
    } else if (type === 'flameDecay') {
        let dps = Math.max(0, Math.floor(Number(specialDps || 0)));
        let totalDamage = Math.max(0, Math.floor(dps * remainSec));
        let rawTick = Math.max(0, Math.floor(Number(rawTickDamage || 0)));
        let interval = Math.max(0.02, Number(tickInterval || 0));
        let rawDps = rawTick > 0 ? Math.floor(rawTick / interval) : 0;
        let res = Number.isFinite(Number(enemyRes)) ? Number(enemyRes) : null;
        let abyss = Number.isFinite(Number(abyssPlayerMul)) ? Number(abyssPlayerMul) : 1;
        let igniteMul = Math.max(1, Number(igniteTakenMultiplier || 1));
        let resistText = res !== null ? ` · 적 화염 저항/관통 후 ${res.toFixed(1)}%` : '';
        let abyssText = Math.abs(abyss - 1) > 0.001 ? ` · 심연/지역 배율 ${abyss.toFixed(2)}x` : '';
        detail = `총 피해량: 약 ${totalDamage} <span style="color:#9fb4d1;">(최종 초당 피해: 약 ${dps}, 원시 ${rawDps}/s${resistText}${abyssText})</span><br><span style="color:#ffb48a;">점화 피해 증폭: ${igniteMul.toFixed(2)}x (생명력 기반 시너지)</span>`;
    }
    else if (type === 'chill') detail = '이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)';
    else if (type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let shockTakenIncrease = getUiEnemyShockTakenDamageIncreasePct(p, tooltipStats);
        detail = `${formatUiTakenDamageShockLine(shockTakenIncrease)} <span style="color:#9fb4d1;">(최대 생명력 대비 타격 비율 반영)</span>`;
    }
    else if (type === 'freeze') detail = '행동 불가 (최대 생명력 대비 타격 비율 반영)';
    else if (type === 'hunterExpose') detail = '헌터 전직 키스톤 효과로 받는 모든 피해가 20% 증가합니다.';
    let powerLine = isUiDamageAilmentType(type) || type === 'hunterExpose' ? '' : `<div class="tooltip-line">위력: ${p.toFixed(2)}</div>`;
    let html = `<div class="tooltip-title">${labels[type] || type}</div><div class="tooltip-line">남은 시간: ${Math.ceil(remainSec)}초</div>${powerLine}<div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ffcf88');
}

function showGemTooltip(event, type, name) {
    let info = getUiGemPresentation(name, type === 'support');
    let stats = getUiPlayerStats();
    let cacheKey = `${type || 'active'}:${name}:${info && (info.totalLevel || info.finalLevel || info.baseLevel || 1)}`;
    let html = `<div class="tooltip-title">${name}</div>`;
    if (type === 'support') {
        html += `<div class="tooltip-line">${info.desc}</div>`;
        let tierText = typeof getSupportTierLabel === 'function' ? getSupportTierLabel(name, info.activeTier) : (info.activeTier === 3 ? '상급' : info.activeTier === 2 ? '중급' : '하급');
        let valueText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.value) : Number(info.value || 0).toFixed(1);
        html += `<div class="tooltip-line" style="margin-top:6px;">효과(${tierText}): ${info.statName} +${valueText}${SUPPORT_GEM_DB[name].isPct ? '%' : ''}</div>`;
        if (info.scaleWithOwnStat) {
            let baseText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.scaleBase) : Number(info.scaleBase || 0).toFixed(1);
            let ratioText = typeof formatSupportGemEffectValue === 'function' ? formatSupportGemEffectValue(info.scaleRatioPct) : Number(info.scaleRatioPct || 0).toFixed(1);
            html += `<div class="tooltip-line" style="color:#9fd4ff;">계산: 보조 젬 제외 ${info.statName} ${baseText}% × 공명 계수 ${ratioText}% = +${valueText}%</div>`;
            html += `<div class="tooltip-line" style="color:#b8a6ff;">제외: 이 보조 젬 및 다른 보조 젬으로 얻은 ${info.statName} 증가</div>`;
        }
        if (Number.isFinite(SUPPORT_GEM_DB[name].heraldExplodeBase)) {
            let chancePct = Math.min(85, ((SUPPORT_GEM_DB[name].heraldExplodeBase + ((info.totalLevel - 1) * (SUPPORT_GEM_DB[name].heraldExplodeScale || 0))) * 100));
            html += `<div class="tooltip-line">시체폭발: 처치 시 ${chancePct.toFixed(1)}% 확률 발동</div>`;
            html += `<div class="tooltip-line">시체폭발 피해: 처치한 적 최대 생명력의 10%</div>`;
        }
        if (TAGGED_DAMAGE_STAT_BY_TAG && Object.values(TAGGED_DAMAGE_STAT_BY_TAG).includes(info.statId)) {
            let tag = Object.keys(TAGGED_DAMAGE_STAT_BY_TAG).find(key => TAGGED_DAMAGE_STAT_BY_TAG[key] === info.statId);
            html += `<div class="tooltip-line">적용 태그: ${translateSkillTag(tag)}</div>`;
        }
        if (SUPPORT_GEM_DB[name] && Array.isArray(SUPPORT_GEM_DB[name].tags) && SUPPORT_GEM_DB[name].tags.includes('summon')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? ` · 특징: ${preview.trait}` : ''}</div>`;
                html += `<div class="tooltip-line">소환수 레벨: ${preview.gemLevel}</div>`;
                if (preview.maxHp > 0) html += `<div class="tooltip-line">수액 골렘 생명력: 약 ${Math.floor(preview.maxHp).toLocaleString()}</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">피해 대리: 히트 피해 ${preview.redirectPct.toFixed ? preview.redirectPct.toFixed(1) : preview.redirectPct}%</div>`;
            }
        }
    } else {
        let skill = info.skill || SKILL_DB[name];
        let rawSkillTags = Array.isArray(skill.tags) ? skill.tags : [];
        let isSummonAttackTooltip = rawSkillTags.includes('summon_attack');
        html += `<div class="tooltip-line">${info.desc}</div>`;
        if (!isSummonAttackTooltip && typeof describeSkillGridProfile === 'function') {
            html += `<div class="tooltip-line" style="margin-top:6px;color:#7fffd4;">${describeSkillGridProfile(name, skill)}</div>`;
        }
        if (!isSummonAttackTooltip) {
            html += `<div class="tooltip-line" style="margin-top:6px;">피해 배율 ${formatPercentMultiplier(skill.dmg || skill.baseDmg || 1)}</div>`;
            html += `<div class="tooltip-line">공속 배율 ${formatPercentMultiplier(skill.spd || skill.baseSpd || 1)}</div>`;
        }
        if (rawSkillTags.includes('spell')) {
            let spellLv = Math.max(1, info.finalLevel || 1);
            let spellLog = Math.log2(spellLv);
            let spellFlat = ((skill.spellFlatBase || 0) * 3) + Math.max(0, spellLv - 1) * (skill.spellFlatScale || 0) + ((skill.spellFlatBase || 0) * 0.8 * spellLog * spellLog);
            html += `<div class="tooltip-line">주문 내장 피해 ${Math.floor(spellFlat)}</div>`;
        }
        if ((skill.hpDmgScale || 0) > 0) {
            let per100 = (skill.hpDmgScale || 0) * 10000;
            html += `<div class="tooltip-line">생명력 계수: 최대 생명력 100당 약 +${per100.toFixed(1)}% 내장 피해 (주문 내장 피해처럼 피해 증가 적용)</div>`;
        }
        if ((skill.regenDmgScale || 0) > 0) html += `<div class="tooltip-line">재생 계수: 재생 1%당 ${skill.regenDmgScale.toFixed(2)}% 추가 배율</div>`;
        if ((skill.fireResDmgScale || 0) > 0) html += `<div class="tooltip-line">화염 저항 계수: 화염 저항 1%당 ${(skill.fireResDmgScale * 100).toFixed(2)}% 추가 배율</div>`;
        if ((skill.fireResOvercapMulPerPct || 0) > 0) {
            let stats = cachedTooltipStats || null;
            let rawFireRes = stats && Number.isFinite(stats.rawResF) ? stats.rawResF : null;
            let maxFireRes = stats && Number.isFinite(stats.maxResF) ? stats.maxResF : null;
            let overcapCap = Number.isFinite(Number(skill.fireResOvercapCap)) ? Math.max(0, Number(skill.fireResOvercapCap)) : Infinity;
            let appliedOvercap = rawFireRes !== null && maxFireRes !== null ? Math.max(0, rawFireRes - maxFireRes) : null;
            let effectiveOvercap = appliedOvercap !== null ? Math.min(appliedOvercap, overcapCap) : null;
            let capText = Number.isFinite(overcapCap) ? ` (최대 ${overcapCap.toFixed(0)}%까지 적용)` : '';
            let currentText = rawFireRes !== null && maxFireRes !== null
                ? ` · 현재 초과 ${appliedOvercap.toFixed(1)}% 중 적용 ${effectiveOvercap.toFixed(1)}% (미적용 화염 저항 ${Math.floor(rawFireRes)}% / 최대 ${Math.floor(maxFireRes)}%)`
                : ' · 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준';
            html += `<div class="tooltip-line">초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +${Number(skill.fireResOvercapMulPerPct || 0).toFixed(2)}배${capText}${currentText}</div>`;
        }
        if (name === '화염 부패') html += `<div class="tooltip-line">특수 규칙: 공격력(기본 피해) 미적용 · 적에게 화염 부패 디버프 적용 · 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭(최대 ${(Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1)}x)</div>`;
        if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">지속 피해 배율 ${(skill.dotMultiplier || 1).toFixed(2)}x</div>`;
        if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.randomTargetEachHit ? ' (타격마다 무작위 대상)' : ''}</div>`;
        if (skill.extraProjectileDamagePct) html += `<div class="tooltip-line">추가 투사체 타격 배율: 기본 타격의 ${Number(skill.extraProjectileDamagePct).toFixed(0)}%</div>`;
        if (skill.ailmentChanceBonus && skill.ailmentChanceBonus.ignite) html += `<div class="tooltip-line">점화 확률 보너스: +${skill.ailmentChanceBonus.ignite}%</div>`;
        if (skill.ailmentChanceBonus && skill.ailmentChanceBonus.poison) html += `<div class="tooltip-line">중독 확률 보너스: +${skill.ailmentChanceBonus.poison}%</div>`;
        if (skill.activeAilmentDamageMore) html += `<div class="tooltip-line">활성 ${skill.activeAilmentDamageMore.type === 'ignite' ? '점화' : skill.activeAilmentDamageMore.type} 대상 적중 피해: ${skill.activeAilmentDamageMore.pct}% 증폭</div>`;
        if (skill.consumeAilmentDamageMore) {
            let ailmentLabels = { chill: '냉각', freeze: '동결' };
            let consumeText = skill.consumeAilmentDamageMore.map(row => `${ailmentLabels[row.type] || row.type} 소모 시 ${row.pct}%`).join(' / ');
            html += `<div class="tooltip-line">상태 소모 증폭: ${consumeText} 증폭</div>`;
        }
        if (skill.ailmentSpreadOnHit) html += `<div class="tooltip-line">전파: ${Math.round(skill.ailmentSpreadOnHit.chance * 100)}% 확률로 다른 적 ${skill.ailmentSpreadOnHit.targets}기</div>`;
        if (skill.missingLifeDamagePct) html += `<div class="tooltip-line">잃은 생명력 비례 피해: 최대 +${skill.missingLifeDamagePct}%</div>`;
        if (skill.executeThreshold) html += `<div class="tooltip-line">처형: 일반 적 생명력 ${(skill.executeThreshold * 100).toFixed(0)}% 미만</div>`;
        if (skill.periodicOnHit) html += `<div class="tooltip-line">반복 타격: ${skill.periodicOnHit.interval}초 간격 · ${skill.periodicOnHit.hits}회 · 적중 피해의 ${skill.periodicOnHit.damagePct}%</div>`;
        if (skill.dotStackCap) html += `<div class="tooltip-line">누적: 최대 ${skill.dotStackCap}중첩 · 중첩당 피해 +${skill.dotStackDamagePct}% / 둔화 +${skill.dotStackSlowPct}%</div>`;
        if (skill.dotTransferOnDeath) html += `<div class="tooltip-line">처치 전파: 남은 지속 피해의 ${skill.dotTransferOnDeath.remainingDamagePct}%를 다른 적 ${skill.dotTransferOnDeath.targets}기에게 이전</div>`;
        if (!isSummonAttackTooltip) {
            html += `<div class="tooltip-line">타겟 방식: ${skill.targetMode === 'all' ? '광역' : skill.targetMode === 'whirl' ? '광역 회전' : skill.targetMode === 'cleave' ? '전방 다중' : skill.targetMode === 'chain' ? '연쇄' : skill.targetMode === 'pierce' ? '관통' : '단일'}</div>`;
            let maxTargetsView = Math.max(1, skill.targets || 1);
            if (skill.targetMode === 'all') maxTargetsView = Math.min(8, Math.max(6, skill.targets || 6));
            html += `<div class="tooltip-line">최대 타겟 수: ${maxTargetsView}</div>`;
        }
        if ((info.tags || []).length > 0) html += `<div class="tooltip-line">태그: ${info.tags.join(' / ')}</div>`;
        if (skill.crit) html += `<div class="tooltip-line">추가 치명타 +${Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1)}%</div>`;
        if (skill.critScale) html += `<div class="tooltip-line">치명타 성장: 젬 레벨당 +${skill.critScale}%</div>`;
        if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">특수 옵션: 각 원본 타겟의 초과 피해가 다른 적에게 연속 관통</div>`;
        if (skill.leech) html += `<div class="tooltip-line">추가 흡혈 +${skill.leech}%</div>`;
        if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">특수 옵션: 이 젬을 사용해서 주는 피해에는 흡혈 즉시 적용</div>`;
        if (rawSkillTags.includes('summon')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? ` · 특징: ${preview.trait}` : ''}</div>`;
                html += `<div class="tooltip-line">소환수 레벨: ${preview.gemLevel}</div>`;
                html += `<div class="tooltip-line">예상 1타 피해: ${preview.hitDamageMin} ~ ${preview.hitDamageMax}${preview.attackPerSecond > 0 ? ` · 공속 ${preview.attackPerSecond}/s` : ''}</div>`;
                if (preview.critChancePct > 0) html += `<div class="tooltip-line">치명타: ${preview.critChancePct}% · 치명 피해 ${Math.floor(preview.critDmgPct)}%</div>`;
                if (preview.resPenBonus > 0) html += `<div class="tooltip-line">소환수 자체 저항 관통 +${preview.resPenBonus}%</div>`;
                if (preview.physIgnoreBonus > 0) html += `<div class="tooltip-line">소환수 자체 물리 피해 감소 무시 +${preview.physIgnoreBonus}%</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">피해 대리: 히트 피해 ${preview.redirectPct}%</div>`;
            }
        }
    }
    if (type === 'support' || SKILL_DB[name].isGem || SKILL_DB[name].levelable) {
        let gemBonusSources = info.gemBonusSources || stats.gemBonusSources;
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">총 레벨 ${type === 'support' ? info.totalLevel : info.finalLevel}</div>`;
        if (type === 'support') {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${gemBonusSources.passive} + 장비 ${gemBonusSources.gear} + 보상 ${gemBonusSources.reward})</div>`;
        } else {
            html += `<div class="tooltip-line">(Lv.${info.baseLevel} + 패시브 ${gemBonusSources.passive} + 장비 ${gemBonusSources.gear} + 보상 ${gemBonusSources.reward} + 군주의핵 ${info.bossCoreLevel || 0} + 창공의힘 ${info.skyCoreLevel || 0} + 응축창공 ${info.permanentSkyBonus || 0})</div>`;
        }
    }
    let border = type === 'support' ? '#2bcbba' : '#ff5252';
    gemTooltipCache = { key: cacheKey, html: html, border: border };
    showInfoTooltipHtml(event.clientX, event.clientY, html, border);
}

function getItemStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    let id = String(statId);
    let low = id.toLowerCase();

    if (['firePctDmg', 'resF', 'igniteChance', 'fireResOvercapMulPerPct'].includes(id)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance'].includes(id)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance'].includes(id)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'].includes(id)) return '#c7a6ff';
    if (['armor', 'armorPct', 'dr'].includes(id)) return '#ffd2a6';
    if (['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce'].includes(id)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(id)) return '#b9c6ff';
    if (['flatHp', 'pctHp', 'regen', 'regenFlat'].includes(id)) return '#ffb3b3';
    if (['crit', 'critDmg'].includes(id)) return '#ffd6f2';
    if (['aspd', 'move'].includes(id)) return '#fff3a8';
    if (['flatDmg', 'pctDmg', 'physPctDmg', 'meleePctDmg', 'aoePctDmg', 'minDmgRoll', 'maxDmgRoll'].includes(id)) return '#ffcf9f';
    if (['spellFlatPct', 'spellFlatDmg'].includes(id)) return '#d4a8ff';
    if (['leech'].includes(id)) return '#ff8fa3';
    if (['resPen', 'resAll', 'ds'].includes(id)) return '#ffcb8e';
    if (['gemLevel', 'suppCap'].includes(id)) return '#a8e6cf';
    if (id === 'flaskUtilSlots') return '#9ed6ff';

    if (low.includes('res') || low.includes('pen')) return '#ffcb8e';
    if (low.includes('chaos') || low.includes('dot') || low.includes('poison') || low.includes('bleed')) return '#c7a6ff';
    if (low.includes('fire') || low.includes('ignite') || low.includes('burn')) return '#ff9a76';
    if (low.includes('cold') || low.includes('freeze') || low.includes('chill')) return '#8fd3ff';
    if (low.includes('light') || low.includes('shock')) return '#ffe083';
    if (low.includes('hp') || low.includes('life') || low.includes('regen') || low.includes('leech')) return '#ffb3b3';
    if (low.includes('armor') || low.includes('block') || low.includes('guard') || low.includes('dr')) return '#ffd2a6';
    if (low.includes('evasion') || low.includes('dodge') || low.includes('deflect')) return '#baffc2';
    if (low.includes('energyshield') || low.includes('es')) return '#b9c6ff';
    if (low.includes('crit')) return '#ffd6f2';
    if (low.includes('aspd') || low.includes('speed') || low.includes('move')) return '#fff3a8';
    if (low.includes('spell')) return '#d4a8ff';
    if (low.includes('gem') || low.includes('supp')) return '#a8e6cf';
    if (low.includes('dmg') || low.includes('atk') || low.includes('phys') || low.includes('melee') || low.includes('aoe')) return '#ffcf9f';

    return '#d7e9ff';
}

function getItemSlotDisplayLabel(item, fallbackLabel) {
    let rawSlot = item && item.slot !== undefined && item.slot !== null ? item.slot : null;
    if (rawSlot === null && item && Array.isArray(item.slots) && item.slots.length > 0) rawSlot = item.slots[0];
    let label = rawSlot !== null ? rawSlot : (fallbackLabel || '장비');
    return String(label || '장비').replace(/[12]$/, '');
}


function getItemStatRollRange(stat, options) {
    if (!stat) return null;
    let min = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : Number(stat.baseRollMin);
    let max = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.baseRollMax);
    if ((!Number.isFinite(min) || !Number.isFinite(max)) && options && options.estimateFromValue) {
        let cur = Number(stat.val || 0);
        min = Number((cur * 0.8).toFixed(2));
        max = Number((cur * 1.2).toFixed(2));
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (max < min) {
        let tmp = min;
        min = max;
        max = tmp;
    }
    return { min, max };
}

function getItemStatRollRangeHtml(stat, options) {
    let statKey = stat && (stat.id || stat.stat);
    let range = getItemStatRollRange(stat, options);
    if (!range) return '';
    return ` <span style="color:#888;">(${formatValue(statKey, range.min)}~${formatValue(statKey, range.max)})</span>`;
}

function getUniqueEffectApplicationHint(item, isEquipped, equipSlotKey) {
    if (!item || item.rarity !== 'unique' || !item.uniqueEffectKey) return '';
    let key = String(item.uniqueEffectKey || '');
    let statePrefix = isEquipped ? '현재 적용' : '장착 시 적용';
    if (key === 'rightRingSummonCap') {
        if (isEquipped && equipSlotKey !== '반지2') return '현재 조건 미충족 · 오른쪽 반지 슬롯에 장착해야 적용';
        return `${statePrefix} · 오른쪽 반지 슬롯 전용`;
    }
    let triggerLabels = {
        summonDeathDamageBuff: '소환수 사망 시 발동',
        summonCritAspdStacks: '소환수 치명타 적중 시 발동',
        blockRecoverEnergyShieldPct: '막기 성공 시 발동',
        deflectGrantShadowStealth: '비껴내기 성공 시 발동',
        hitShockedEnemyDamageMorePct: '감전된 적을 타격할 때 적용',
        stackingElementalResDownOnHit: '원소 피해 적중 시 중첩',
        projectileExtraShotChance: '투사체 공격 시 확률 발동',
        maxRollBonusHit: '최대 피해 조건을 만족한 타격 시 발동',
        leechEfficiencyOnKill: '적 처치 시 발동',
        corpseExplodeOnKill: '적 처치 시 확률 발동',
        stealEliteTrait: '정예 처치 시 발동',
        realmRiftWaveOnHit: '적중 시 확률 발동',
        realmInvulnerableBarrierOnHit: '피격 시 확률 발동',
        realmAllResDownOnHit: '적중 시 중첩',
        realmKillMoveStacks: '적 처치 시 중첩',
        meteorFootsteps: '이동 중 확률 발동',
        queenBeeSummonOnHit: '적중 시 확률 발동'
    };
    if (triggerLabels[key]) return `${statePrefix} · ${triggerLabels[key]}`;
    if (key === 'uniqueTakenReduceWhen1Enemy') return `${statePrefix} · 생존한 적이 1명일 때만 적용`;
    if (key === 'uniqueTakenReduceWhen2Enemies') return `${statePrefix} · 생존한 적이 2명 이상일 때만 적용`;
    if (key === 'crowdEvasionMore') return `${statePrefix} · 요구 적 수를 만족할 때만 적용`;
    if (key === 'mirrorOppositeRing') return `${statePrefix} · 반대쪽 반지의 옵션을 복제`;
    if (key === 'kaleidoscopeShield') return `${statePrefix} · 이 장비의 추가 옵션에 적용`;
    if (/OnHit|onHit|OnKill|onKill|OnCrit|onCrit|OnBlock|onBlock/.test(key)) return `${statePrefix} · 전투 조건 충족 시 발동`;
    return `${statePrefix} · 상시 효과`;
}

let itemTooltipHideTimer = null;

function showItemTooltip(event, idx, isEquip) {
    let item = isEquip ? game.equipment[idx] : game.inventory[idx];
    let resolveItemStatTone = (statId) => getItemStatToneColor(statId);
    if (!item) return;
    if (itemTooltipHideTimer) {
        clearTimeout(itemTooltipHideTimer);
        itemTooltipHideTimer = null;
    }
    let nextTooltipToken = isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`;
    let tt = document.getElementById('item-tooltip-box');
    if (activeItemTooltipToken === nextTooltipToken && tt.style.display === 'block' && tt.innerHTML) {
        positionTooltipElement(tt, event.clientX, event.clientY);
        return;
    }
    activeItemTooltipToken = nextTooltipToken;
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    let html = `<div class="tooltip-title" style="color:${getRarityColor(item.rarity)}">[${getItemSlotDisplayLabel(item)}] ${item.name}${exceptionalStars}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}${item.loopSealed ? ' <span style="color:#7fd99a;" title="나무꾼의 손길로 봉인됨: 루프가 지나도 유지">🌿봉인</span>' : ''}</div>`;
    let baseChainInfo = typeof getItemBaseChainInfo === 'function' ? getItemBaseChainInfo(item) : null;
    let baseChainBadge = (baseChainInfo && baseChainInfo.total > 1)
        ? ` <span style="color:#7fd1a8;" title="업그레이드 단계 (낮을수록 하위, 높을수록 상위 베이스)">[${baseChainInfo.step}/${baseChainInfo.total}]</span>`
        : '';
    html += `<div class="tooltip-line" style="color:#95a5a6;">베이스: ${item.baseName}${baseChainBadge}</div>`;
    html += `<div class="tooltip-line" style="color:#a8c0da;">숨겨진 티어 ${getTierBadgeHtml(item.hiddenTier || item.itemTier || 1, 'T')}</div>`;
    if (item.rarity === 'unique' && item.uniqueEffect) {
        let uniqueGlow = 'display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);';
        html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ 고유 효과: ${escapeHTML(item.uniqueEffect)}</span></div>`;
        let applicationHint = getUniqueEffectApplicationHint(item, !!isEquip, isEquip ? idx : null);
        if (applicationHint) html += `<div class="tooltip-line" style="color:#bda9d8; margin-top:3px;">◆ ${escapeHTML(applicationHint)}</div>`;
    }
    if (item.fusedRelic) {
        let fusionGradeLabel = item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합');
        html += `<div class="tooltip-line" style="color:#8fd8ff;">⌛ ${fusionGradeLabel}${item.fusedRareName ? ` · [${escapeHTML(item.fusedRareName)}]의 기억` : ''} — 신성한/타락/축복의 오브만 사용 가능</div>`;
    }
    function getItemDefenseView(target) {
        let base = { armor: 0, evasion: 0, energyShield: 0 };
        let flat = { armor: 0, evasion: 0, energyShield: 0 };
        let pct = { armor: 0, evasion: 0, energyShield: 0 };
        (target.baseStats || []).forEach(stat => { if (base[stat.id] !== undefined) base[stat.id] += Number(stat.val || 0); });
        let explicitForDefense = (target.stats || []).slice();
        if (target.chaosInfusion) explicitForDefense.push(target.chaosInfusion);
        // 복합 옵션(한 줄에 두 스탯)의 추가 스탯도 방어 계산에 포함한다.
        (target.stats || []).forEach(stat => { if (stat && Array.isArray(stat.extraStats)) explicitForDefense.push(...stat.extraStats); });
        explicitForDefense.forEach(stat => {
            if (flat[stat.id] !== undefined) flat[stat.id] += Number(stat.val || 0);
            if (stat.id === 'armorPct') pct.armor += Number(stat.val || 0);
            if (stat.id === 'evasionPct') pct.evasion += Number(stat.val || 0);
            if (stat.id === 'energyShieldPct') pct.energyShield += Number(stat.val || 0);
        });
        return {
            armor: Math.floor((base.armor + flat.armor) * (1 + pct.armor / 100)),
            evasion: Math.floor((base.evasion + flat.evasion) * (1 + pct.evasion / 100)),
            energyShield: Math.floor((base.energyShield + flat.energyShield) * (1 + pct.energyShield / 100)),
            base: base
        };
    }
    let defenseView = getItemDefenseView(item);
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#f1c40f; font-weight:800;">베이스 옵션</div>`;
        item.baseStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            if (statKey === 'armor' || statKey === 'evasion' || statKey === 'energyShield') return;
            let cur = Number(stat.val || 0);
            let rangeText = getItemStatRollRangeHtml(stat, { estimateFromValue: true });
            let label = stat.statName || getStatName(statKey) || statKey;
            let valueColor = stat.exceptional ? '#ffb454' : resolveItemStatTone(statKey);
            let exMark = stat.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '';
            html += `<div class="tooltip-line"><span style="color:${resolveItemStatTone(statKey)};">${label} </span><span style="color:${valueColor};">+${formatValue(statKey, cur)}</span>${rangeText}${exMark}</div>`;
        });
        ['armor','evasion','energyShield'].forEach(id => {
            let label = getStatName(id);
            let finalVal = defenseView[id];
            let baseVal = defenseView.base[id];
            if (finalVal <= 0 && baseVal <= 0) return;
            let src = (item.baseStats || []).find(stat => stat && stat.id === id);
            let rangeText = '';
            if (src) {
                rangeText = getItemStatRollRangeHtml(src, { estimateFromValue: true });
            }
            let valueColor = (src && src.exceptional) ? '#ffb454' : resolveItemStatTone(id);
            let exMark = (src && src.exceptional) ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '';
            if (Math.floor(finalVal) === Math.floor(baseVal)) {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(baseVal)}</span>${rangeText}${exMark}</div>`;
            } else {
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(finalVal)}</span> <span style="color:#9fb4d1;">(${Math.floor(baseVal)})</span>${rangeText}${exMark}</div>`;
            }
        });
    }
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: `[주입] ${item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)}` });
    if (explicitStats.length > 0) {
        function getItemTooltipGroupOrder(statId) {
            let key = String(statId || '').toLowerCase();
            if (['energyshield', 'energyshieldpct', 'energyshieldregen'].includes(key) || key.includes('energyshield') || key === 'es') return 1;
            if (['armor', 'armorpct', 'dr'].includes(key) || key.includes('armor')) return 2;
            if (['evasion', 'evasionpct', 'deflectchance', 'deflectdamagereduce'].includes(key) || key.includes('evasion') || key.includes('deflect')) return 3;
            if (['flathp', 'pcthp', 'regen', 'regenflat'].includes(key) || key.includes('hp') || key.includes('life')) return 4;
            if (['resf', 'resc', 'resl', 'resall', 'reschaos'].includes(key) || key.includes('res')) return 5;
            if (['firepctdmg', 'coldpctdmg', 'lightpctdmg', 'chaospctdmg', 'dotpctdmg', 'pctdmg'].includes(key) || key.includes('dmg') || key.includes('dot')) return 6;
            if (['crit', 'critdmg'].includes(key) || key.includes('crit')) return 7;
            if (['aspd', 'move'].includes(key) || key.includes('speed') || key.includes('move')) return 8;
            return 99;
        }
        explicitStats.sort((a, b) => {
            let aKey = a && (a.id || a.stat);
            let bKey = b && (b.id || b.stat);
            let g = getItemTooltipGroupOrder(aKey) - getItemTooltipGroupOrder(bKey);
            if (g !== 0) return g;
            return String(aKey || '').localeCompare(String(bKey || ''));
        });
        html += `<div class="tooltip-line" style="margin-top:6px; color:#3498db; font-weight:800;">추가 옵션 (${explicitStats.length}/6)</div>`;
        explicitStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let rangeText = `${getItemStatRollRangeHtml(stat)}${tierText}`;
            let label = stat.statName || getStatName(statKey) || statKey;
            // 복합 옵션은 한 줄에 두 스탯까지 표기하고, 듀얼+복합처럼 길어지는 경우 다음 줄로 넘긴다.
            if (Array.isArray(stat.extraStats) && stat.extraStats.length > 0) {
                let parts = [`<span style="color:${resolveItemStatTone(statKey)};">${getStatName(statKey)} +${formatValue(statKey, stat.val)}</span>`];
                stat.extraStats.forEach(extra => {
                    let exKey = extra && (extra.id || extra.stat);
                    parts.push(`<span style="color:${resolveItemStatTone(exKey)};">${getStatName(exKey)} +${formatValue(exKey, extra.val)}</span>`);
                });
                for (let i = 0; i < parts.length; i += 2) {
                    let chunk = parts.slice(i, i + 2).join(' <span style="color:#7f8c8d;">·</span> ');
                    let continuation = i > 0 ? ' compound-option-continuation' : '';
                    let indent = i > 0 ? 'padding-left:14px;' : '';
                    let suffix = i === 0 ? rangeText : '';
                    html += `<div class="tooltip-line${continuation}" style="${indent}">${chunk}${suffix}</div>`;
                }
                return;
            }
            html += `<div class="tooltip-line"><span style="color:${resolveItemStatTone(statKey)};">${label} +${formatValue(statKey, stat.val)}</span>${rangeText}</div>`;
        });
    } else {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#7f8c8d;">노멀 아이템: 추가 옵션 없음</div>`;
    }
    if (item.encroached) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">잠식 특수 옵션</div>`;
        if (item.encroached.liberated && item.encroached.chosen) {
            let st = item.encroached.chosen;
            html += `<div class="tooltip-line" style="color:#d7b8ff;">[잠식] ${st.statName || getStatName(st.id)} +${formatValue(st.id, st.val)} ${getTierBadgeHtml(st.tier || 10, 'T')}</div>`;
        } else {
            html += `<div class="tooltip-line" style="color:#8d7bb3;">해방 전에는 효과 없음 · 모든 제작으로도 변하지 않음</div>`;
        }
    }

    let itemTooltipMainHtml = html;
    let hasItemCompareSections = false;
    if (!isEquip) {
        let compareSlots = getEquipCandidateSlots(item).filter(slotKey => !!game.equipment[slotKey]);
        if (compareSlots.length === 0 && item.slot !== '반지') compareSlots = getEquipCandidateSlots(item);
        let compareSections = [];
        let before = getUiPlayerStats();
        compareSlots.forEach((targetSlot, idx) => {
            let backup = game.equipment[targetSlot];
            let after = before;
            try {
                game.equipment[targetSlot] = item;
                after = getUiPlayerStats();
            } finally {
                game.equipment[targetSlot] = backup;
            }
            let changedLines = Object.keys(COMPARE_STAT_META).map(key => {
                let diff = (after[key] || 0) - (before[key] || 0);
                if (Math.abs(diff) < 0.001) return null;
                let meta = COMPARE_STAT_META[key];
                let color = diff > 0 ? '#2ecc71' : '#e74c3c';
                let sign = diff > 0 ? '▲' : '▼';
                return `<div class="tooltip-line item-compare-line"><span style="color:${color}">${sign}</span> ${meta.label}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
            }).filter(Boolean);
            if ((backup && backup.uniqueEffect) !== item.uniqueEffect) {
                if (item.uniqueEffect) {
                    let hint = getUniqueEffectApplicationHint(item, true, targetSlot);
                    changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#d8b5ff;">◆ 획득: ${escapeHTML(item.uniqueEffect)}${hint ? `<small style="display:block;color:#a995bf;">${escapeHTML(hint)}</small>` : ''}</div>`);
                }
                if (backup && backup.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#c98f9f;">◇ 상실: ${escapeHTML(backup.uniqueEffect)}</div>`);
            }
            let label = getDualSlotDisplayLabel(targetSlot);
            if (changedLines.length > 0) {
                compareSections.push(`<div class="item-compare-panel"><div class="tooltip-line item-compare-title">${label} 기준 착용 시 변화</div>${changedLines.join('')}</div>`);
            } else if (isDualSlotItem(item.slot)) {
                compareSections.push(`<div class="item-compare-panel item-compare-empty"><div class="tooltip-line item-compare-title">${label}</div><div class="tooltip-line">교체 시 변화 없음</div></div>`);
            }
        });
        if (compareSections.length > 0) {
            hasItemCompareSections = true;
            let layoutClass = compareSections.length > 1 ? 'item-compare-grid' : 'item-compare-single';
            html = `<div class="item-tooltip-main">${itemTooltipMainHtml}</div><div class="${layoutClass}">${compareSections.join('')}</div>`;
        }
    }

    tt.classList.toggle('item-compare-tooltip', hasItemCompareSections);
    tt.classList.toggle('dual-compare-tooltip', !isEquip && isDualSlotItem(item.slot));
    tt.innerHTML = html;
    tt.style.display = 'block';
    positionTooltipElement(tt, event.clientX, event.clientY);
    setActiveTooltip('item-tooltip-box');
}
function dismissItemTooltipNow() {
    activeItemTooltipToken = null;
    clearActiveTooltip('item-tooltip-box');
    document.getElementById('item-tooltip-box').style.display = 'none';
}

function hideItemTooltip(event) {
    if (itemTooltipHideTimer) clearTimeout(itemTooltipHideTimer);
    itemTooltipHideTimer = null;
    if (!event || !Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
        dismissItemTooltipNow();
        return;
    }
    let pointerX = event.clientX;
    let pointerY = event.clientY;
    itemTooltipHideTimer = setTimeout(() => {
        itemTooltipHideTimer = null;
        let hovered = document.elementFromPoint(pointerX, pointerY);
        if (hovered && hovered.closest('[data-item-tooltip-anchor="1"]')) return;
        dismissItemTooltipNow();
    }, 24);
}

function validateItemTooltipAnchor() {
    if (!activeItemTooltipToken) return;
    let [scope, key, idText] = String(activeItemTooltipToken).split(':');
    let expectedId = Number(idText);
    if (!Number.isFinite(expectedId)) return hideItemTooltip();
    let valid = false;
    if (scope === 'equip') {
        let eqItem = game.equipment && game.equipment[key];
        valid = !!eqItem && eqItem.id === expectedId;
    } else if (scope === 'inv') {
        let idx = Number(key);
        let invItem = Array.isArray(game.inventory) ? game.inventory[idx] : null;
        valid = !!invItem && invItem.id === expectedId;
    }
    if (!valid) hideItemTooltip();
}

let lastBattlefieldCanvasSize = { width: 0, height: 0, dpr: 1 };
function resizeBattlefieldCanvas() {
    const canvas = document.getElementById('battlefield-canvas');
    if (!canvas || canvas.offsetParent === null) return;
    const parent = canvas.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    if (rect.width < 50 || rect.height < 50) return;
    const cssWidth = Math.max(1, Math.round(rect.width || 1));
    const cssHeight = Math.max(1, Math.round(rect.height || 1));
    const dpr = clampNumber(window.devicePixelRatio || 1, 1, 2);
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.dataset.renderScale = String(dpr);
    lastBattlefieldCanvasSize = { width: cssWidth, height: cssHeight, dpr };
}

// 8x8 전장 그리드 → 아이소메트릭 화면 좌표 투영. 전장 캔버스 렌더러가 공용으로 사용한다.
function getBattleGridProjection(width, height) {
    const size = COMBAT_GRID_CONFIG.size;
    const tileW = Math.min(width * 0.115, height * 0.185);
    const tileH = tileW * 0.5;
    const originX = width * 0.5;
    const originY = height * 0.56 - ((size - 1) * tileH) / 2;
    return {
        tileW: tileW,
        tileH: tileH,
        cellToScreen(gx, gy) {
            return { x: originX + (gx - gy) * (tileW / 2), y: originY + (gx + gy) * (tileH / 2) };
        }
    };
}

function getBattleLayout(enemies, width, height) {
    let list = enemies || [];
    if (list.length === 0) return [];
    let proj = getBattleGridProjection(width, height);
    let fallbackCell = COMBAT_GRID_CONFIG.bossSpawn;
    return list.map(enemy => {
        let cell = hasGridCell(enemy) ? enemy : fallbackCell;
        let pos = proj.cellToScreen(cell.gx, cell.gy);
        return { enemy: enemy, x: pos.x, y: pos.y };
    }).sort((a, b) => a.y - b.y || (a.enemy.id - b.enemy.id));
}

function drawPixelShadow(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function getBattleZoneTheme(zone) {
    zone = zone || getZone(game.currentZoneId);
    let theme = {
        skyTop: '#17324c',
        skyBottom: '#0c1b28',
        floorA: '#245a3b',
        floorB: '#2d6b48',
        pathA: '#355d46',
        pathB: '#3f6c54',
        propA: '#7cb86f',
        propB: '#4e8f52',
        accent: '#d7f0a1',
        ruin: '#6f876b',
        water: '#183b57',
        mist: 'rgba(173,223,255,0.08)'
    };
    if (zone.ele === 'fire') {
        theme = { skyTop: '#4a2419', skyBottom: '#1d1010', floorA: '#5e3224', floorB: '#70392a', pathA: '#744436', pathB: '#8a5540', propA: '#f59e55', propB: '#9b3f2d', accent: '#ffcf72', ruin: '#7f5a47', water: '#4b170f', mist: 'rgba(255,149,91,0.08)' };
    } else if (zone.ele === 'cold') {
        theme = { skyTop: '#18354d', skyBottom: '#0f1828', floorA: '#506b86', floorB: '#64839c', pathA: '#7897ae', pathB: '#88a7bc', propA: '#d7f7ff', propB: '#9cd7ea', accent: '#effcff', ruin: '#8d9eb1', water: '#244c6b', mist: 'rgba(219,250,255,0.12)' };
    } else if (zone.ele === 'light') {
        theme = { skyTop: '#25344f', skyBottom: '#121626', floorA: '#61613e', floorB: '#706d46', pathA: '#7f7a4b', pathB: '#978f57', propA: '#ffe27d', propB: '#d7bf58', accent: '#fff4a8', ruin: '#918764', water: '#3a4465', mist: 'rgba(255,235,158,0.09)' };
    } else if (zone.ele === 'chaos') {
        theme = { skyTop: '#25173b', skyBottom: '#0f0a1a', floorA: '#35244d', floorB: '#473065', pathA: '#563776', pathB: '#654589', propA: '#b98cff', propB: '#7b59be', accent: '#f2d1ff', ruin: '#6d5b84', water: '#271f3a', mist: 'rgba(193,140,255,0.08)' };
    }
    if (zone.type === 'trial') {
        theme.pathA = '#7f6840';
        theme.pathB = '#9f8251';
        theme.accent = '#ffe2a4';
        theme.ruin = '#9a7d54';
    } else if (zone.type === 'abyss') {
        theme.skyTop = '#111421';
        theme.skyBottom = '#07080d';
        theme.floorA = '#1c2431';
        theme.floorB = '#252f3d';
        theme.pathA = '#30394a';
        theme.pathB = '#3b4660';
        theme.mist = 'rgba(126,162,255,0.07)';
    } else if (zone.type === 'meteor') {
        theme.skyTop = '#1a1026';
        theme.skyBottom = '#07050c';
        theme.floorA = '#241736';
        theme.floorB = '#332248';
        theme.pathA = '#4a2f68';
        theme.pathB = '#5c3a78';
        theme.mist = 'rgba(189,120,255,0.1)';
    }
    return theme;
}

function getBattleSkillVisual(skillName, skillData) {
    skillData = skillData || SKILL_DB[skillName] || SKILL_DB['기본 공격'];
    let rawTags = Array.isArray(skillData.tags) ? skillData.tags : [];
    let ele = String(skillData.ele || '').toLowerCase();
    let targetMode = String(skillData.targetMode || '').toLowerCase();
    let cacheKey = `${skillName || ''}|${ele}|${targetMode}|${rawTags.join('/')}`;
    if (battleSkillVisualCache.key === cacheKey && battleSkillVisualCache.value) return battleSkillVisualCache.value;
    let tags = rawTags.map(tag => String(tag).toLowerCase());
    let group = 'physical';
    let primary = '#d7dde6';
    let secondary = '#ffffff';
    let aura = null;
    if (tags.includes('chaos') || ele === 'chaos') {
        group = 'chaos';
        primary = '#ba83ff';
        secondary = '#f2ddff';
        aura = 'rgba(176,118,255,0.16)';
    } else if (tags.includes('cold') || ele === 'cold') {
        group = 'cold';
        primary = '#8de7ff';
        secondary = '#eefbff';
        aura = 'rgba(133,235,255,0.14)';
    } else if (tags.includes('lightning') || tags.includes('light') || ele === 'light' || ele === 'lightning') {
        group = 'lightning';
        primary = '#ffd84f';
        secondary = '#fff7cc';
        aura = 'rgba(255,216,79,0.14)';
    } else if (tags.includes('fire') || ele === 'fire') {
        group = 'fire';
        primary = '#ff8a4a';
        secondary = '#ffe3b0';
        aura = 'rgba(255,126,74,0.14)';
    } else if (tags.includes('physical') && tags.includes('slam')) {
        group = 'physical_slam';
        primary = '#c7a27b';
        secondary = '#f3e1cf';
    }
    const normalizedName = String(skillName || '').toLowerCase();
    let variant = 'melee';
    if (tags.includes('corpse') || tags.includes('corpse_explosion') || normalizedName.includes('시체')) variant = 'corpse_burst';
    else if (tags.includes('slam')) variant = 'slam';
    else if (tags.includes('chain') || targetMode === 'chain') variant = 'chain';
    else if (tags.includes('pierce') || targetMode === 'pierce') variant = 'pierce';
    else if (tags.includes('summon') || targetMode === 'summon') variant = 'summon';
    else if (tags.includes('dot')) variant = 'dot';
    else if (tags.includes('aoe') || targetMode === 'all' || targetMode === 'whirl') variant = 'nova';
    else if (tags.includes('projectile') || targetMode === 'projectile') variant = 'projectile';
    let visual = {
        pose: tags.includes('projectile') ? 'bow' : 'sword',
        group: group,
        effect: group,
        primary: primary,
        secondary: secondary,
        aura: aura,
        isSlam: variant === 'slam',
        variant: variant,
        targetMode: targetMode,
        tags: tags
    };
    battleSkillVisualCache = { key: cacheKey, value: visual };
    return visual;
}

function getBattleEffectFrame(effectName, phase) {
    if (!battleAssets.ready || !battleAssets.atlas || !battleAssets.atlas.effects) return null;
    let effectAtlas = battleAssets.atlas.effects;
    let frames = effectAtlas.frames;
    let animations = effectAtlas.animations || {};
    function pickEffectClipFrame(name) {
        let clip = (animations[name] || []).filter(Boolean);
        if (clip.length === 0) return null;
        return phase === 'hit' ? clip[clip.length - 1] : clip[0];
    }
    if (effectName === 'flurry') return pickEffectClipFrame('sword_slash_vfx') || null;
    if (effectName === 'flameSlash') return pickEffectClipFrame('fireball_vfx') || (phase === 'hit' ? frames.fireball : frames.flurry);
    if (effectName === 'iceLance') return pickEffectClipFrame('ice_projectile_vfx') || frames.iceLance;
    if (effectName === 'chain' || effectName === 'storm') return pickEffectClipFrame('lightning_vfx') || (phase === 'hit' ? frames.lightningBurst : frames.chain);
    if (effectName === 'poisonDart') return pickEffectClipFrame('dark_magic_projectile_vfx') || frames.poison;
    if (effectName === 'nova') return null;
    if (effectName === 'lightSpear') return pickEffectClipFrame('lightning_vfx') || (phase === 'hit' ? frames.lightningBurst : frames.chain);
    if (effectName === 'quake' || effectName === 'slam') return pickEffectClipFrame('impact_vfx') || frames.quake;
    if (effectName === 'magma') return pickEffectClipFrame('fireball_vfx') || (phase === 'hit' ? frames.eruption : frames.magma);
    if (effectName === 'arrow' || effectName === 'projectile') return null;
    if (effectName === 'voidSlash' || effectName === 'shadowSlash') return pickEffectClipFrame('dark_magic_projectile_vfx') || (phase === 'hit' ? frames.voidOrb : frames.voidSlash);
    if (effectName === 'drain') return pickEffectClipFrame('impact_vfx') || (phase === 'hit' ? frames.drain : frames.crimsonSlash);
    if (effectName === 'whirl') return pickEffectClipFrame('sword_slash_vfx') || null;
    return pickEffectClipFrame('sword_slash_vfx') || null;
}

function getBattleGroundFrames(zone) {
    if (!battleAssets.ready || !battleAssets.atlas || !battleAssets.atlas.tiles) return null;
    let frames = battleAssets.atlas.tiles.frames;
    if (zone.type === 'trial') return { floor: frames.stone, path: frames.temple, pathAlt: frames.templeAlt, prop: frames.templeAlt };
    if (zone.type === 'abyss') return { floor: frames.abyss, path: frames.ruin, pathAlt: frames.abyss, prop: frames.roots };
    if (zone.ele === 'fire') return { floor: frames.dirt, path: frames.dirtWarm, pathAlt: frames.lava, prop: frames.dirtWarm };
    if (zone.ele === 'cold') return { floor: frames.frost, path: frames.stone, pathAlt: frames.frost, prop: frames.stone };
    if (zone.ele === 'light') return { floor: frames.stone, path: frames.temple, pathAlt: frames.templeAlt, prop: frames.stone };
    if (zone.ele === 'chaos') return { floor: frames.abyss, path: frames.roots, pathAlt: frames.ruin, prop: frames.abyss };
    return { floor: frames.grass, path: frames.stone, pathAlt: frames.moss, prop: frames.grassDeep };
}

function getBattleBackdropKeyForZone(zone) {
    if (!zone) return 'bgAct1';
    if (zone.type === 'chaosRealm') {
        let floor = Math.max(1, Number(zone.floor || zone.stage || zone.id || 1) || 1);
        return floor % 20 === 0 ? 'bgChaos18' : `bgChaos${(floor - 1) % 18}`;
    }
    if (zone.type === 'act') {
        let actNo = Math.max(1, Math.min(10, (Number(zone.id) || 0) + 1));
        return `bgAct${actNo}`;
    }
    if (zone.type === 'labyrinth') return 'bgAct5';
    if (zone.type === 'abyss' || zone.type === 'seasonBoss') return 'bgAct10';
    if (zone.ele === 'fire') return 'bgAct2';
    if (zone.ele === 'cold') return 'bgAct3';
    if (zone.ele === 'light') return 'bgAct4';
    if (zone.ele === 'chaos') return 'bgAct9';
    return 'bgAct1';
}

function getBattleBackdropForZone(zone) {
    let list = (battleAssets.backdrops || {});
    let key = getBattleBackdropKeyForZone(zone);
    let fallbackLegacy = { bgAct1:'backdropAct1', bgAct2:'backdropAct2_6', bgAct3:'backdropAct3_7', bgAct4:'backdropAct4_8', bgAct5:'backdropAct5', bgAct6:'backdropAct2_6', bgAct7:'backdropAct3_7', bgAct8:'backdropAct4_8', bgAct9:'backdropAct9_10', bgAct10:'backdropAct9_10' };
    let image = list[key] || list[fallbackLegacy[key]] || list.backdropAct1 || Object.values(list)[0];
    if (!image) return null;
    let zoneSeed = Number.isFinite(zone && zone.id) ? zone.id : 0;
    if (!zoneSeed && zone && zone.name) zoneSeed = zone.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    let variant = BATTLE_BACKDROP_VARIANTS[Math.abs(zoneSeed) % BATTLE_BACKDROP_VARIANTS.length] || BATTLE_BACKDROP_VARIANTS[0];
    return { image: image, variant: variant };
}

// 액트 배경(512x512 아이소 디오라마)의 바닥 다이아몬드 보정값.
// centerX/centerY는 바닥 다이아몬드 중심의 이미지 내 위치(비율), halfWidthFrac는
// 바닥 다이아몬드 반폭이 이미지 폭에서 차지하는 비율이다. 배경 세트가 동일한 구도로
// 제작되어 공통 보정값을 쓰며, 전장 그리드가 이 다이아몬드 중앙에 얹히도록 정렬한다.
const BATTLE_BACKDROP_FLOOR = { centerX: 0.5, centerY: 0.5, halfWidthFrac: 0.39 };

// 배경 이미지를 두 겹으로 그린다: (1) 캔버스 전체를 채우는 어두운 cover 언더레이,
// (2) 바닥 다이아몬드가 8x8 그리드와 일치하도록 그리드 투영에 정렬한 본 이미지.
function drawGridAlignedBackdrop(ctx, width, height, image, gridProj) {
    let srcW = image.width || width;
    let srcH = image.height || height;
    let coverScale = Math.max(width / srcW, height / srcH) * 1.2;
    let underW = srcW * coverScale;
    let underH = srcH * coverScale;
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(image, (width - underW) / 2, (height - underH) / 2, underW, underH);
    ctx.restore();
    ctx.fillStyle = 'rgba(4, 8, 14, 0.6)';
    ctx.fillRect(0, 0, width, height);
    if (!gridProj) return;
    let cellFirst = gridProj.cellToScreen(0, 0);
    let cellLast = gridProj.cellToScreen(COMBAT_GRID_CONFIG.size - 1, COMBAT_GRID_CONFIG.size - 1);
    let gridCenterY = (cellFirst.y + cellLast.y) / 2;
    let gridHalfW = gridProj.tileW * (COMBAT_GRID_CONFIG.size / 2);
    let drawW = gridHalfW / BATTLE_BACKDROP_FLOOR.halfWidthFrac;
    let drawH = drawW * (srcH / srcW);
    ctx.drawImage(image, width / 2 - drawW * BATTLE_BACKDROP_FLOOR.centerX, gridCenterY - drawH * BATTLE_BACKDROP_FLOOR.centerY, drawW, drawH);
}

function drawBattleBackdrop(ctx, width, height, theme, now, zone, gridProj) {
    let backdropEntry = getBattleBackdropForZone(zone);
    if (backdropEntry && backdropEntry.image) {
        drawGridAlignedBackdrop(ctx, width, height, backdropEntry.image, gridProj);
        return true;
    }

    let sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, theme.skyTop);
    sky.addColorStop(1, theme.skyBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);

    let horizon = Math.floor(height * 0.2);
    let fieldTop = horizon;
    let pathTop = Math.floor(height * 0.6);
    let pathBottom = Math.floor(height * 0.84);
    let lowerBand = Math.floor(height * 0.92);

    ctx.fillStyle = theme.water;
    ctx.fillRect(0, 0, width, horizon);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, horizon + 10, width, 5);
    ctx.fillRect(0, horizon + 48, width, 4);

    ctx.fillStyle = theme.floorA;
    ctx.fillRect(0, fieldTop, width, pathTop - fieldTop);
    ctx.fillStyle = theme.pathA;
    ctx.fillRect(0, pathTop, width, pathBottom - pathTop);
    ctx.fillStyle = theme.floorB;
    ctx.fillRect(0, pathBottom, width, lowerBand - pathBottom);
    ctx.fillStyle = '#0c1621';
    ctx.fillRect(0, lowerBand, width, height - lowerBand);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, pathTop - 1);
    ctx.lineTo(width, pathTop - 1);
    ctx.moveTo(0, pathBottom);
    ctx.lineTo(width, pathBottom);
    ctx.stroke();

    ctx.save();
    let vignette = ctx.createRadialGradient(width * 0.5, height * 0.55, width * 0.12, width * 0.5, height * 0.55, width * 0.78);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.26)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
    return false;
}

function getLocalBattleHeroVisualTuning() {
    const defaultTuning = {
        baseHeight: 55.2,
        minHeight: 50,
        maxHeight: 55.2,
        downShrink: 6.5,
        maxScaleBoost: 1,
        shadowWidth: 10,
        shadowHeight: 4,
        shadowAlpha: 0.16,
        offsetY: 0
    };
    if (typeof isLocalRuntimeHost !== 'function' || !isLocalRuntimeHost()) return defaultTuning;
    const localTuningByHero = {
        hero1: { baseHeight: 68, minHeight: 60, maxHeight: 84, downShrink: 8.2, maxScaleBoost: 1.24, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero2: { baseHeight: 66, minHeight: 58, maxHeight: 81, downShrink: 8, maxScaleBoost: 1.23, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero3: { baseHeight: 66, minHeight: 58, maxHeight: 81, downShrink: 8, maxScaleBoost: 1.23, shadowWidth: 12.5, shadowHeight: 5, shadowAlpha: 0.18, offsetY: 2 },
        hero4: { baseHeight: 67, minHeight: 59, maxHeight: 82, downShrink: 8.1, maxScaleBoost: 1.24, shadowWidth: 13, shadowHeight: 5.2, shadowAlpha: 0.18, offsetY: 2 }
    };
    let heroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId;
    return { ...defaultTuning, ...(localTuningByHero[heroId] || localTuningByHero.hero1) };
}

function drawPlayerSprite(ctx, x, y, scale, flash, swingPower, skillVisual, now, motionState) {
    let activeSkillPlayback = getSkillPlaybackState(now);
    let monsterSkinId = typeof getSelectedMonsterSkinId === 'function' ? getSelectedMonsterSkinId() : null;
    if (monsterSkinId) {
        let monsterSkinSprite = resolveMonsterSkinSprite(monsterSkinId);
        if (monsterSkinSprite) {
            let drawSize = (monsterSkinSprite.type === 'boss' ? 52 : 38) * clampNumber((Number(scale) || 1) / 1.9, 1, 2.4);
            drawPixelShadow(ctx, x, y + 5, monsterSkinSprite.type === 'boss' ? 14 : 10, monsterSkinSprite.type === 'boss' ? 5 : 4, 0.18);
            // 몬스터는 기본적으로 왼쪽(플레이어 방향)을 보므로 좌우반전해 오른쪽을 바라보게 한다.
            drawBattleSprite(ctx, monsterSkinSprite.image, monsterSkinSprite.frame, x, y, drawSize, { smoothing: monsterSkinSprite.type === 'boss' ? 'high' : 'low', flipX: true });
            if (flash) {
                ctx.save();
                ctx.globalAlpha = 0.16;
                ctx.fillStyle = '#fff3c5';
                ctx.beginPath();
                ctx.ellipse(x, y + 4, 14, 7, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }
    }
    if (battleAssets.images.hero) {
        motionState = motionState || {};
        let motionName = 'idle';
        let frameIndex = HERO_MOTIONS.idle[0];
        if (activeSkillPlayback) {
            motionName = activeSkillPlayback.skillCfg.motion;
            frameIndex = activeSkillPlayback.frameIndex;
        } else {
            let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
            let attackBlend = clampNumber(Number.isFinite(motionState.attackBlend) ? motionState.attackBlend : 0, 0, 1);
            let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
            if (hurtBlend > 0.55) {
                motionName = 'idle';
            } else if (attackBlend > 0.2 || Math.abs(swingPower) > 0.16) {
                let effect = skillVisual && skillVisual.effect ? skillVisual.effect : 'slash';
                if (effect === 'arrow' || effect === 'projectile') motionName = 'bow';
                else if (effect === 'poisonDart' || effect === 'lightSpear') motionName = 'throw';
                else if (effect === 'chain' || effect === 'storm' || effect === 'iceLance' || effect === 'nova') motionName = 'cast';
                else motionName = 'slash';
            } else if (advanceBlend > 0.08) {
                motionName = advanceBlend > 0.6 ? 'run' : 'walk';
            } else {
                motionName = 'idle';
            }
            let frames = HERO_MOTIONS[motionName] || HERO_MOTIONS.idle;
            const _motionMs = { walk: 285, run: 190, slash: 160, throw: 170, cast: 180, bow: 175, hit: 200, idle: 320 };
            let _frameMs = _motionMs[motionName] || 220;
            if (motionName === 'walk' || motionName === 'run') {
                let moveSpeed = Number(getUiPlayerStats().moveSpeed) || 100;
                let moveRatio = clampNumber(moveSpeed / 100, 0.6, 3.2);
                _frameMs = clampNumber(_frameMs / moveRatio, 62, 460);
            }
            let localFrame = Math.floor((now / _frameMs)) % frames.length;
            frameIndex = frames[localFrame];
        }
        let heroFrame = getSpriteFrameRectByIndex(battleAssets.images.hero, frameIndex, HERO_SPRITE_CONFIG);
        if (heroFrame) {
            let frameMeta = getHeroFrameMeta(frameIndex);
            let metrics = getHeroDrawMetrics(x, y, heroFrame, frameMeta);
            drawPixelShadow(ctx, x, y + 5, 11, 4, 0.18);
            ctx.save();
            ctx.filter = 'brightness(1.15) contrast(1.08) saturate(1.05)';
            ctx.drawImage(
                battleAssets.images.hero,
                heroFrame.sx, heroFrame.sy, heroFrame.sw, heroFrame.sh,
                metrics.dx, metrics.dy, metrics.drawW, metrics.drawH
            );
            ctx.restore();
            if (DEBUG_BATTLE_ANCHORS) {
                ctx.save();
                ctx.strokeStyle = '#22c55e';
                ctx.lineWidth = 1;
                ctx.strokeRect(metrics.dx, metrics.dy, metrics.drawW, metrics.drawH);
                let handX = metrics.dx + ((frameMeta.hand.x / 300) * heroFrame.sw) * metrics.scaleX;
                let handY = metrics.dy + ((frameMeta.hand.y / 300) * heroFrame.sh) * metrics.scaleY;
                ctx.fillStyle = '#ef4444';
                ctx.beginPath();
                ctx.arc(handX, handY, 2.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            return;
        }
    }
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.hero) {
        motionState = motionState || {};
        let frames = battleAssets.atlas.hero.frames;
        let bodyClips = frames.characterAnimations || {};
        let clipLoop = frames.clipLoop || {};
        let activeEnemies = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
        let isAdvancing = activeEnemies === 0 && game.moveTimer <= 0 && game.runProgress < 100;
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : (isAdvancing ? 1 : 0), 0, 1);
        let attackBlend = clampNumber(Number.isFinite(motionState.attackBlend) ? motionState.attackBlend : 0, 0, 1);
        let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
        let downFx = battleFx.filter(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration).slice(-1)[0];
        let downPhase = downFx ? clampNumber((now - downFx.start) / downFx.duration, 0, 0.999) : null;
        let downBlend = clampNumber(Number.isFinite(motionState.downBlend) ? motionState.downBlend : (downPhase !== null ? 1 : 0), 0, 1);
        let isAttacking = !isAdvancing && (attackBlend > 0.12 || Math.abs(swingPower) > 0.14);
        let idleCycle = Array.isArray(bodyClips.idle) && bodyClips.idle.length > 0 ? bodyClips.idle : (Array.isArray(frames.idle) && frames.idle.length > 0 ? frames.idle : [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
        let walkCycle = Array.isArray(bodyClips.walk_or_run) && bodyClips.walk_or_run.length > 0 ? bodyClips.walk_or_run : (Array.isArray(frames.walk) && frames.walk.length > 0 ? frames.walk : [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
        let runCycle = walkCycle;
        let hurtCycle = Array.isArray(bodyClips.hurt) && bodyClips.hurt.length > 0 ? bodyClips.hurt : (Array.isArray(frames.hurt) && frames.hurt.length > 0 ? frames.hurt : [frames.frontGuard, frames.sideIdle].filter(Boolean));
        let downCycle = Array.isArray(bodyClips.down_or_knockdown) && bodyClips.down_or_knockdown.length > 0 ? bodyClips.down_or_knockdown : (Array.isArray(frames.down) && frames.down.length > 0 ? frames.down : hurtCycle);
        function pickCycle(list, speed, phaseOffset) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let baseSpeed = speed || 110;
            let sequenceSpeedScale = sequence.length <= 3 ? 1.32 : (sequence.length <= 5 ? 1.14 : 1);
            let adjustedSpeed = baseSpeed * sequenceSpeedScale;
            let phase = ((now / adjustedSpeed) + (phaseOffset || 0)) % sequence.length;
            return sequence[Math.floor(phase)];
        }
        function pickProgressFrame(list, phase) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let idx = Math.floor(clampNumber(phase, 0, 0.999) * sequence.length);
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        function pickSkillAttackCycle() {
            let activeSkillName = game && typeof game.activeSkill === 'string' ? game.activeSkill : '';
            let activeSkillData = (SKILL_DB && activeSkillName && SKILL_DB[activeSkillName]) ? SKILL_DB[activeSkillName] : null;
            let activeTags = activeSkillData && Array.isArray(activeSkillData.tags)
                ? activeSkillData.tags.map(tag => String(tag).toLowerCase())
                : [];
            let isSlamGem = activeTags.includes('slam');
            if (isSlamGem && Array.isArray(frames.greatswordCombo) && frames.greatswordCombo.length > 0) {
                return frames.greatswordCombo;
            }
            if (!isSlamGem && Array.isArray(frames.quakeCombo) && frames.quakeCombo.length > 0) {
                return frames.quakeCombo;
            }
            if (Array.isArray(bodyClips.sword_attack_body) && bodyClips.sword_attack_body.length > 0) {
                return bodyClips.sword_attack_body;
            }
            return frames.swordCombo || frames.greatswordCombo || frames.quakeCombo || frames.castCombo || frames.bowCombo || frames.projectileCombo || frames.whirlCombo;
        }
        function pickAttackFrame(list) {
            let sequence = (list || []).filter(Boolean);
            if (sequence.length === 0) return frames.attack || frames.sideIdle || frames.sideWalk;
            let attackProgress = Number.isFinite(motionState.attackProgress) ? motionState.attackProgress : Math.abs(swingPower);
            let phase = clampNumber(attackProgress, 0, 0.999);
            let idx = Math.floor(phase * sequence.length);
            if (clipLoop.sword_attack_body === true) {
                let aspd = Math.max(0.1, Number(getUiPlayerStats().aspd) || 1);
                let loopFrameMs = clampNumber(120 / aspd, 38, 170);
                idx = Math.floor((now / loopFrameMs) % sequence.length);
            }
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        let idleFrame = pickCycle(idleCycle, 920, 0);
        let moveStat = Math.max(70, Number(getUiPlayerStats().move) || 100);
        let moveRatio = clampNumber(moveStat / 100, 0.85, 2.25);
        const WALK_ANIM_SPEED_MULT = 2;
        let moveCycleSpeed = clampNumber((1040 / moveRatio) / WALK_ANIM_SPEED_MULT, 310, 490);
        let walkFrame = pickCycle(walkCycle, moveCycleSpeed, 0);
        let movingFrame = pickCycle(runCycle, moveCycleSpeed, 0) || walkFrame;
        let frame = downPhase !== null || downBlend > 0.24
            ? pickProgressFrame(downCycle, downPhase !== null ? downPhase : clampNumber(downBlend * 0.999, 0, 0.999))
            : (advanceBlend > 0.08 ? movingFrame : idleFrame);
        if (downPhase === null && hurtBlend > 0.8 && !isAttacking && hurtCycle.length > 0) frame = hurtCycle[0];
        if (downPhase === null && isAttacking) {
            frame = pickAttackFrame(pickSkillAttackCycle());
        }
        const _walkBobPeriod = Math.max(80, moveCycleSpeed / Math.max(1, (walkCycle.length || 4)) / 2);
        let stepOffset = (downPhase === null && advanceBlend > 0.08)
            ? Math.sin(now / _walkBobPeriod) * lerpNumber(0.08, 0.24, advanceBlend)
            : 0;
        let localHeroTuning = getLocalBattleHeroVisualTuning();
        let heroScaleBoost = clampNumber((Number(scale) || 1) / 1.85, 1, localHeroTuning.maxScaleBoost);
        let normalizedHeroSize = (localHeroTuning.baseHeight * heroScaleBoost) - downBlend * localHeroTuning.downShrink;
        normalizedHeroSize = clampNumber(normalizedHeroSize, localHeroTuning.minHeight, localHeroTuning.maxHeight);
        drawPixelShadow(ctx, x, y + 5, localHeroTuning.shadowWidth * heroScaleBoost, localHeroTuning.shadowHeight * heroScaleBoost, localHeroTuning.shadowAlpha);
        let drawOptions = {
            alpha: downPhase !== null ? 0.98 : 1,
            smoothing: 'high',
            outlineColor: '#ffffff',
            outlineAlpha: 0.86,
            outlineThickness: 1
        };
        let attackXOffset = (downPhase === null && isAttacking && (typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId) === 'hero3') ? 6 : 0;
        drawBattleSprite(ctx, battleAssets.atlas.hero.image, frame, x + stepOffset + attackXOffset, y + localHeroTuning.offsetY - advanceBlend * 0.18 + hurtBlend * 0.08 + downBlend * 2.2, normalizedHeroSize, drawOptions);
        if (flash && downPhase === null) {
            ctx.save();
            ctx.globalAlpha = 0.42;
            ctx.strokeStyle = '#dff6ff';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x - 11, y - 10);
            ctx.lineTo(x - 3, y - 16);
            ctx.moveTo(x + 2, y - 14);
            ctx.lineTo(x + 10, y - 19);
            ctx.moveTo(x - 9, y - 1);
            ctx.lineTo(x - 2, y - 7);
            ctx.stroke();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = '#dff6ff';
            ctx.fillRect(Math.round(x - 4), Math.round(y - 15), 8, 2);
            ctx.restore();
        }
        return;
    }
    let s = scale;
    let bob = Math.sin(now / 180) * 0.7 * s;
    let tunic = flash ? '#9fe5ff' : '#4f7cff';
    let trim = flash ? '#fefefe' : '#dff3ff';
    let shield = '#f2d27c';
    drawPixelShadow(ctx, x, y + 18 * s, 13 * s, 5 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    ctx.fillStyle = '#2f4571';
    ctx.fillRect(-4 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillRect(1 * s, 4 * s, 3 * s, 5 * s);
    ctx.fillStyle = tunic;
    ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
    ctx.fillStyle = '#28456b';
    ctx.fillRect(-3 * s, 2 * s, 6 * s, 4 * s);
    ctx.fillStyle = trim;
    ctx.fillRect(-4 * s, -2 * s, 8 * s, 2 * s);
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(-4 * s, -11 * s, 8 * s, 7 * s);
    ctx.fillStyle = '#7c4e2e';
    ctx.fillRect(-5 * s, -13 * s, 10 * s, 4 * s);
    ctx.fillStyle = '#b8d2ff';
    ctx.fillRect(-8 * s, -1 * s, 3 * s, 5 * s);
    ctx.fillStyle = shield;
    ctx.fillRect(-11 * s, -1 * s, 3 * s, 6 * s);
    ctx.fillStyle = '#cfa44f';
    ctx.fillRect(-10 * s, 1 * s, 1 * s, 2 * s);

    let handOffset = 4 * s + swingPower * 4 * s;
    ctx.fillStyle = '#f0c79a';
    ctx.fillRect(5 * s, -1 * s, 3 * s, 5 * s);
    if (skillVisual.pose === 'hammer') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, -1 * s, 8 * s + handOffset, 2 * s);
        ctx.fillStyle = '#d3d8e5';
        ctx.fillRect(14 * s + handOffset, -4 * s, 6 * s, 8 * s);
    } else if (skillVisual.pose === 'spear') {
        ctx.fillStyle = '#9c7a4a';
        ctx.fillRect(8 * s, 0, 12 * s + handOffset, 1.5 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(19 * s + handOffset, -2 * s, 6 * s, 5 * s);
    } else if (skillVisual.pose === 'staff') {
        ctx.fillStyle = '#846038';
        ctx.fillRect(8 * s, -3 * s, 2 * s, 11 * s);
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(8 * s, -7 * s, 4 * s, 4 * s);
    } else if (skillVisual.pose === 'bow') {
        ctx.strokeStyle = '#d1b37a';
        ctx.lineWidth = Math.max(2, 1.5 * s);
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.quadraticCurveTo(18 * s + handOffset, 0, 11 * s, 5 * s);
        ctx.stroke();
        ctx.strokeStyle = '#f1ede7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(11 * s, -5 * s);
        ctx.lineTo(11 * s, 5 * s);
        ctx.stroke();
    } else if (skillVisual.pose === 'throw') {
        ctx.fillStyle = skillVisual.primary;
        ctx.fillRect(11 * s + handOffset, -2 * s, 5 * s, 3 * s);
    } else if (skillVisual.pose === 'dual' || skillVisual.pose === 'dagger') {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -4 * s, 7 * s + handOffset, 2 * s);
        ctx.fillRect(7 * s, 3 * s, 5 * s + handOffset * 0.5, 2 * s);
    } else {
        ctx.fillStyle = '#f7efdc';
        ctx.fillRect(9 * s, -3 * s, 9 * s + handOffset, 2 * s);
        ctx.fillStyle = '#e2b25c';
        ctx.fillRect(7 * s, -3 * s, 2 * s, 3 * s);
    }
    ctx.restore();
}


function getBossAssetVariantEntry(enemy, enemyAtlas) {
    if (!enemy || !enemy.isBoss || !enemy.bossAssetKey || !enemyAtlas) return null;
    let bossImage = (enemyAtlas.bossImages || {})[enemy.bossAssetKey];
    if (!bossImage) return null;
    return {
        image: bossImage,
        frame: { x: 0, y: 0, width: bossImage.width, height: bossImage.height, basisHeight: bossImage.height }
    };
}

function pickBattleEnemyVariant(enemy, enemyAtlas) {
    if (!enemyAtlas) return null;
    let pools = enemyAtlas.variants || {};
    let frames = enemyAtlas.frames || {};
    let baseImage = enemyAtlas.image;
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let normalPool = (pools.normal || []).slice();
    let elitePool = (pools.elite || []).slice();
    let bossPool = (pools.boss || []).slice();
    if (normalPool.length === 0) {
        normalPool = [
            { image: baseImage, frame: frames.slime },
            { image: baseImage, frame: frames.bandit },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (elitePool.length === 0) {
        elitePool = [
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton },
            { image: baseImage, frame: frames.shadow },
            { image: baseImage, frame: frames.wraith }
        ].filter(entry => entry.frame);
    }
    if (bossPool.length === 0) {
        bossPool = [
            { image: baseImage, frame: frames.boss },
            { image: baseImage, frame: frames.knight },
            { image: baseImage, frame: frames.skeleton }
        ].filter(entry => entry.frame);
    }
    let pool = enemy.isBoss ? bossPool : (enemy.isElite ? elitePool : normalPool);
    if (pool.length === 0) return null;
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function drawEnemySprite(ctx, enemy, x, y, scale, flash, now) {
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.enemies) {
        let enemyAtlas = battleAssets.atlas.enemies;
        let variantEntry = getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant(enemy, enemyAtlas) || {};
        let frame = variantEntry.frame || enemyAtlas.frames.bandit || enemyAtlas.frames.slime;
        let frameImage = variantEntry.image || enemyAtlas.image;
        let drawSize = enemy.isBoss ? 70 : (enemy.isElite ? 50 : 38);
        drawSize *= scale / (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95));
        drawPixelShadow(ctx, x, y + (enemy.isBoss ? 16 : 13), enemy.isBoss ? 15 : 9, enemy.isBoss ? 5 : 4, 0.17);
        drawBattleSprite(ctx, frameImage, frame, x, y + 5, drawSize, { smoothing: enemy.bossAssetKey ? 'high' : 'low' });
        if (flash) {
            ctx.save();
            ctx.globalAlpha = 0.16;
            ctx.fillStyle = '#fff3c5';
            ctx.beginPath();
            ctx.ellipse(x, y + 11, enemy.isBoss ? 20 : 13, enemy.isBoss ? 10 : 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        return;
    }
    let s = scale;
        let wobble = Math.sin((now / 170) + (enemy.variantSeed || enemy.id)) * 1.4 * s;
    let main = enemy.isBoss ? '#8b4cc7' : (enemy.isElite ? '#cc7a28' : '#c24d3f');
    let accent = enemy.isBoss ? '#e4b8ff' : (enemy.isElite ? '#ffd07b' : '#ff9c73');
    if (enemy.ele === 'cold') {
        main = enemy.isBoss ? '#6493d8' : '#5f88b6';
        accent = '#dbf7ff';
    } else if (enemy.ele === 'light') {
        main = enemy.isBoss ? '#9f8e37' : '#b6992f';
        accent = '#fff5a1';
    } else if (enemy.ele === 'chaos') {
        main = enemy.isBoss ? '#6e38a4' : '#7a49af';
        accent = '#f1cbff';
    } else if (enemy.ele === 'fire') {
        main = enemy.isBoss ? '#b2422d' : '#bd5540';
        accent = '#ffbb8e';
    }
    let variant = enemy.isBoss ? 'boss' : (enemy.isElite ? 'knight' : (enemy.id % 3 === 0 ? 'slime' : (enemy.id % 3 === 1 ? 'bat' : 'cultist')));
    drawPixelShadow(ctx, x, y + 13 * s, (enemy.isBoss ? 15 : 11) * s, 4 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + wobble));
    if (variant === 'slime') {
        ctx.fillStyle = flash ? '#fff8e2' : accent;
        ctx.fillRect(-5 * s, -5 * s, 10 * s, 8 * s);
        ctx.fillStyle = flash ? '#fffbe9' : main;
        ctx.fillRect(-7 * s, -1 * s, 14 * s, 7 * s);
        ctx.fillStyle = '#111';
        ctx.fillRect(-3 * s, -1 * s, 1.5 * s, 1.5 * s);
        ctx.fillRect(2 * s, -1 * s, 1.5 * s, 1.5 * s);
    } else if (variant === 'bat') {
        ctx.fillStyle = flash ? '#fff8d9' : main;
        ctx.fillRect(-3 * s, -3 * s, 6 * s, 6 * s);
        ctx.fillRect(-10 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(4 * s, -6 * s, 6 * s, 3 * s);
        ctx.fillRect(-9 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillRect(4 * s, -2 * s, 5 * s, 2 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-2 * s, -6 * s, 4 * s, 3 * s);
    } else if (variant === 'knight') {
        ctx.fillStyle = '#41444f';
        ctx.fillRect(-5 * s, -4 * s, 10 * s, 10 * s);
        ctx.fillStyle = flash ? '#fff4cc' : main;
        ctx.fillRect(-4 * s, -2 * s, 8 * s, 9 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -10 * s, 6 * s, 6 * s);
        ctx.fillStyle = '#d8dce4';
        ctx.fillRect(-6 * s, -1 * s, 2 * s, 5 * s);
        ctx.fillRect(4 * s, -1 * s, 2 * s, 5 * s);
    } else if (variant === 'boss') {
        ctx.fillStyle = flash ? '#fff1c8' : main;
        ctx.fillRect(-8 * s, -6 * s, 16 * s, 12 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-6 * s, -14 * s, 12 * s, 8 * s);
        ctx.fillStyle = '#28152d';
        ctx.fillRect(-7 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillRect(3 * s, 5 * s, 4 * s, 5 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-8 * s, -17 * s, 3 * s, 4 * s);
        ctx.fillRect(5 * s, -17 * s, 3 * s, 4 * s);
    } else {
        ctx.fillStyle = flash ? '#fff7d1' : main;
        ctx.fillRect(-4 * s, -5 * s, 8 * s, 10 * s);
        ctx.fillStyle = accent;
        ctx.fillRect(-3 * s, -12 * s, 6 * s, 7 * s);
        ctx.fillStyle = '#241717';
        ctx.fillRect(-3 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillRect(1 * s, 4 * s, 2 * s, 5 * s);
        ctx.fillStyle = '#f8ef8f';
        ctx.fillRect(-2 * s, -9 * s, 1 * s, 1 * s);
        ctx.fillRect(1 * s, -9 * s, 1 * s, 1 * s);
    }
    ctx.restore();
}

function drawBattleZigZag(ctx, x1, y1, x2, y2, amplitude, segments) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segments; i++) {
        let t = i / segments;
        let px = x1 + (x2 - x1) * t;
        let py = y1 + (y2 - y1) * t + (i % 2 === 0 ? amplitude : -amplitude);
        ctx.lineTo(px, py);
    }
    ctx.lineTo(x2, y2);
}

const GEM_IMPACT_THEME = {
    phys: { primary: '#f5d7a1', secondary: '#ffffff' }, fire: { primary: '#ff7a42', secondary: '#ffd36b' }, cold: { primary: '#8fd6ff', secondary: '#dff7ff' },
    light: { primary: '#f7e36a', secondary: '#fff8bf' }, chaos: { primary: '#b56bff', secondary: '#e9d2ff' }
};
window.BATTLE_EFFECT_OVERRIDES = window.BATTLE_EFFECT_OVERRIDES || {};
function getImpactThemeByElement(ele){ return (window.BATTLE_EFFECT_OVERRIDES[ele] || GEM_IMPACT_THEME[ele] || GEM_IMPACT_THEME.phys); }

function normalizeBattleElement(ele) {
    let id = String(ele || 'phys').toLowerCase();
    if (id === 'physical') return 'phys';
    if (id === 'lightning' || id === 'thunder') return 'light';
    if (id === 'ice') return 'cold';
    return id;
}

function drawBattleImpactBurst(ctx, x, y, primary, secondary, t) {
    const fxLoad = Math.max(0, Math.floor((Array.isArray(battleFx) ? battleFx.length : 0)));
    const lod = fxLoad >= 40 ? 0.45 : (fxLoad >= 22 ? 0.65 : 1);
    ctx.save();
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 3;
    for (let i = 0; i < Math.max(3, Math.floor(6 * lod)); i++) {
        let angle = (Math.PI * 2 * i) / 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * (6 + t * 16), y + Math.sin(angle) * (6 + t * 16));
        ctx.stroke();
    }
    ctx.fillStyle = secondary;
    ctx.beginPath();
    ctx.arc(x, y, 3 + t * 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawGemAttackTrail(ctx, element, sx, sy, tx, ty, t) {
    const e = normalizeBattleElement(element);
    if (e === 'fire') {
        ctx.globalAlpha = (1 - t) * 0.35;
        ctx.strokeStyle = 'rgba(255,120,60,0.9)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + tx) * 0.5, Math.min(sy, ty) - 16, tx, ty);
        ctx.stroke();
    } else if (e === 'cold') {
        ctx.globalAlpha = (1 - t) * 0.3;
        ctx.strokeStyle = 'rgba(184,238,255,0.9)';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (e === 'light') {
        ctx.globalAlpha = (1 - t) * 0.55;
        ctx.strokeStyle = 'rgba(255,238,150,0.95)';
        ctx.lineWidth = 2.4;
        drawBattleZigZag(ctx, sx, sy, tx, ty, 7, 9);
        ctx.stroke();
    } else if (e === 'chaos') {
        ctx.globalAlpha = (1 - t) * 0.38;
        ctx.strokeStyle = 'rgba(214,120,255,0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(sx + 18, sy - 18, tx - 24, ty + 14, tx, ty);
        ctx.stroke();
    } else {
        ctx.globalAlpha = (1 - t) * 0.25;
        ctx.strokeStyle = 'rgba(245,225,190,0.8)';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
    }
}

function drawBattleSwingFx(ctx, fx, t, playerPos) {
    // Keep playerSwing events for attack animation timing, but do not draw the
    // extra slash/arc strokes around the player sprite.
    return;
}

function drawElementalHitAccent(ctx, element, tx, ty, t, crit) {
    const e = normalizeBattleElement(element || 'phys');
    const boost = crit ? 1.2 : 1;
    if (e === 'fire') {
        ctx.globalAlpha = (1 - t) * 0.62;
        ctx.fillStyle = 'rgba(255,120,64,0.65)';
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            let spread = (i - 1) * 5;
            ctx.beginPath();
            ctx.ellipse(tx + spread, ty + 2 - t * 9, (3 + t * 5) * boost, (6 + t * 10) * boost, spread * 0.03, 0, Math.PI * 2);
            ctx.fill();
        }
    } else if (e === 'cold') {
        ctx.globalAlpha = (1 - t) * 0.7;
        ctx.strokeStyle = 'rgba(187,236,255,0.95)';
        ctx.lineWidth = 1.6;
        for (let i = 0; i < Math.max(2, Math.floor(3 * lod)); i++) {
            let a = (Math.PI * 2 * i) / 3 + t * 0.2;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(a) * (8 + t * 14), ty + Math.sin(a) * (8 + t * 14));
            ctx.stroke();
        }
    } else if (e === 'light') {
        ctx.globalAlpha = (1 - t) * 0.82;
        ctx.strokeStyle = 'rgba(255,244,150,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx - 6, ty - 7);
        ctx.lineTo(tx + 1, ty - 1);
        ctx.lineTo(tx - 2, ty + 5);
        ctx.lineTo(tx + 7, ty + 1);
        ctx.stroke();
    } else if (e === 'chaos') {
        ctx.globalAlpha = (1 - t) * 0.58;
        ctx.strokeStyle = 'rgba(220,128,255,0.86)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(tx, ty, 7 + t * 11, t * 4.4, t * 4.4 + Math.PI * 1.2);
        ctx.stroke();
    } else {
        ctx.globalAlpha = (1 - t) * 0.44;
        ctx.strokeStyle = 'rgba(255,235,205,0.72)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(tx, ty + 2, 6 + t * 8, 0, Math.PI * 2);
        ctx.stroke();
    }
}


function drawBattleHitFx(ctx, fx, t, playerPos, enemyPosMap) {
    // The elemental impact body/particles are owned by the attack-fx engine
    // (js/canvas-attack-fx.js), spawned once per hit. This keeps only the
    // generic critical-hit flourish layered above that effect.
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry || fx.dot || !fx.crit) return;
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    ctx.save();
    {
        ctx.globalAlpha = (1 - t) * 0.75;
        ctx.strokeStyle = '#fff4a8';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
            let angle = (Math.PI * 2 * i) / 4 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * (10 + t * 20), ty + Math.sin(angle) * (10 + t * 20));
            ctx.stroke();
        }
    }
    ctx.restore();
}



function setTextById(id, value) {
    let el = document.getElementById(id);
    if (!el) return;
    el.innerText = value;
}

function updateHpDamageGhostState(state, actualPct, now, options) {
    actualPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
    if (!state || state.ghostPct === null || state.lastPct === null) {
        let initialPct = Math.max(actualPct, Math.min(100, Number((options && options.initialGhostPct) || actualPct) || actualPct));
        return { ghostPct: initialPct, lastPct: initialPct, lastAt: now, holdUntil: initialPct > actualPct + 0.05 ? now + PLAYER_HP_DAMAGE_GHOST_HOLD_MS : 0 };
    }
    let elapsedSec = Math.max(0, Math.min(0.5, (now - (state.lastAt || now)) / 1000));
    let continuousDecay = !!(options && options.continuousDecay);
    if (actualPct < state.lastPct - 0.05) {
        let isAlreadyTrailing = state.ghostPct > actualPct + 0.05;
        state.ghostPct = Math.max(state.ghostPct, state.lastPct);
        if (!continuousDecay || !isAlreadyTrailing) {
            state.holdUntil = now + PLAYER_HP_DAMAGE_GHOST_HOLD_MS;
        }
    } else if (actualPct > state.ghostPct) {
        state.ghostPct = actualPct;
    }
    if (now >= state.holdUntil && state.ghostPct > actualPct) {
        state.ghostPct = Math.max(actualPct, state.ghostPct - PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC * elapsedSec);
    }
    state.lastPct = actualPct;
    state.lastAt = now;
    return state;
}

function updatePlayerHpDamageGhost(actualPct) {
    let state = updateHpDamageGhostState({
        ghostPct: playerHpDamageGhostPct,
        lastPct: playerHpDamageGhostLastPct,
        lastAt: playerHpDamageGhostLastAt,
        holdUntil: playerHpDamageGhostHoldUntil
    }, actualPct, Date.now());
    playerHpDamageGhostPct = state.ghostPct;
    playerHpDamageGhostLastPct = state.lastPct;
    playerHpDamageGhostLastAt = state.lastAt;
    playerHpDamageGhostHoldUntil = state.holdUntil;
    return playerHpDamageGhostPct;
}

function primeEnemyHpDamageGhost(enemyId, actualPct) {
    if (enemyId === null || enemyId === undefined) return;
    let key = String(enemyId);
    if (enemyHpDamageGhostStates.has(key)) return;
    enemyHpDamageGhostStates.set(key, updateHpDamageGhostState(null, actualPct === undefined ? 100 : actualPct, Date.now()));
}

function updateEnemyHpDamageGhost(enemyId, actualPct) {
    if (enemyId === null || enemyId === undefined) return Math.max(0, Math.min(100, Number(actualPct) || 0));
    let key = String(enemyId);
    let now = Date.now();
    let state = updateHpDamageGhostState(enemyHpDamageGhostStates.get(key) || null, actualPct, now);
    if (state.ghostPct > actualPct + 0.05) {
        if (!Number.isFinite(state.snapAt) || state.snapAt <= 0) state.snapAt = now + ENEMY_HP_DAMAGE_GHOST_SNAP_MS;
        if (now >= state.snapAt) {
            state.ghostPct = Math.max(0, Math.min(100, Number(actualPct) || 0));
            state.holdUntil = 0;
            state.snapAt = 0;
        }
    } else {
        state.snapAt = 0;
    }
    enemyHpDamageGhostStates.set(key, state);
    return state.ghostPct;
}

function pruneEnemyHpDamageGhostStates(activeEnemyIds) {
    if (!enemyHpDamageGhostStates || enemyHpDamageGhostStates.size <= 0) return;
    let activeSet = new Set((activeEnemyIds || []).map(id => String(id)));
    Array.from(enemyHpDamageGhostStates.keys()).forEach(key => {
        if (!activeSet.has(key)) enemyHpDamageGhostStates.delete(key);
    });
}


function shouldUseCommaSetting(settingKey) {
    return !(game && game.settings && game.settings[settingKey] === false);
}

function formatCommaNumber(value, options = {}) {
    let amount = Number(value) || 0;
    if (options.decimals !== undefined) return amount.toFixed(options.decimals);
    return Math.floor(amount).toLocaleString('ko-KR');
}

function formatSettingNumber(value, settingKey, options = {}) {
    if (!shouldUseCommaSetting(settingKey)) {
        if (options.decimals !== undefined) return (Number(value) || 0).toFixed(options.decimals);
        return String(Math.floor(Number(value) || 0));
    }
    return formatCommaNumber(value, options);
}

function formatCappedResistanceValue(appliedValue, uncappedValue) {
    let applied = Math.floor(Number(appliedValue) || 0);
    let uncapped = Number.isFinite(Number(uncappedValue)) ? Math.floor(Number(uncappedValue)) : applied;
    return applied === uncapped ? `${applied}` : `${applied} (${uncapped})`;
}

function renderCombatFlaskHud() {
    let host = document.getElementById('ui-combat-flasks');
    if (!host || typeof ensureFlaskState !== 'function') return;
    let st = ensureFlaskState();
    let now = Date.now();
    let healDef = getFlaskHealDef(st.healTier);
    let entries = [{ key: healDef.key, name: healDef.name, charges: st.healCharges, maxCharges: healDef.maxCharges, active: st.healOverTimeUntil > now, type: 'heal' }];
    let maxUtility = typeof getMaxFlaskUtilitySlotCount === 'function' ? getMaxFlaskUtilitySlotCount() : 0;
    for (let index = 0; index < maxUtility; index++) {
        let runtime = st.utils[index];
        let def = runtime && FLASK_UTILITY_POOL[runtime.key];
        entries.push(def
            ? { key: def.key, name: def.name, charges: runtime.charges, maxCharges: def.maxCharges, active: runtime.until > now, type: 'utility' }
            : { key: '', name: `빈 유틸리티 슬롯 ${index + 1}`, charges: 0, maxCharges: 0, active: false, type: 'empty' });
    }
    let signature = entries.map(entry => `${entry.key}:${entry.charges}:${entry.active ? 1 : 0}`).join('|');
    if (host.dataset.signature === signature) return;
    host.dataset.signature = signature;
    host.innerHTML = entries.map(entry => `<button type="button" class="combat-flask-mini ${entry.type} ${entry.active ? 'active' : ''} ${entry.maxCharges > 0 && entry.charges <= 0 ? 'empty-charge' : ''}" title="${escapeHTML(entry.name)} · ${entry.charges}/${entry.maxCharges}회" onclick="switchTab('tab-flask')"><span>🧪</span><b>${entry.charges}</b></button>`).join('');
}

function updateCombatUI(pStats) {
    pStats = normalizeUiPlayerStats(pStats, cachedTooltipStats || {});
    if (pStats.__uiFallbackStats) pStats.maxHp = Math.max(pStats.maxHp, Math.max(1, Number(game.playerHp) || 1));
    if (pStats && pStats.breakdowns && !pStats.__uiFallbackStats) cachedTooltipStats = pStats;
    if (!pStats.__uiFallbackStats) game.playerHp = Math.min(game.playerHp, pStats.maxHp);
    let safeHp = Math.max(0, Number(game.playerHp) || 0);
    setTextById('ui-hp', formatSettingNumber(safeHp, 'showHpComma', safeHp >= 100 ? {} : { decimals: 1 }));
    setTextById('ui-maxhp', formatSettingNumber(pStats.maxHp, 'showHpComma'));
    setTextById('ui-maxhp-stat', formatSettingNumber(pStats.maxHp, 'showCharacterComma'));
    let hpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let hpBar = document.getElementById('ui-hp-bar');
    hpBar.style.width = hpPct + '%';
    hpBar.classList.toggle('player-danger', hpPct > 0 && hpPct <= 25);
    renderCombatFlaskHud();
    let hpWrap = hpBar.parentElement;
    let hpGhostBar = document.getElementById('ui-hp-damage-ghost-bar');
    if (!hpGhostBar && hpWrap) {
        hpGhostBar = document.createElement('div');
        hpGhostBar.id = 'ui-hp-damage-ghost-bar';
        hpGhostBar.className = 'hp-bar-fill player-damage-ghost';
        hpWrap.insertBefore(hpGhostBar, hpBar);
    }
    if (hpGhostBar) {
        let ghostPct = updatePlayerHpDamageGhost(hpPct);
        hpGhostBar.style.width = `${ghostPct}%`;
        hpGhostBar.style.display = ghostPct > hpPct + 0.2 ? 'block' : 'none';
    }
    let hpAilBar = document.getElementById('ui-hp-ailment-bar');
    if (!hpAilBar && hpWrap) {
        hpAilBar = document.createElement('div');
        hpAilBar.id = 'ui-hp-ailment-bar';
        hpAilBar.className = 'hp-bar-fill player-ailment-pending';
        hpWrap.insertBefore(hpAilBar, hpBar);
    }
    let esPct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
    let esInlineEl = document.getElementById('ui-es-inline');
    if (esInlineEl) esInlineEl.innerText = (pStats.energyShield || 0) > 0 ? ` · ES ${Math.floor(game.playerEnergyShield || 0)}/${Math.floor(pStats.energyShield)}` : '';
    let esBar = document.getElementById('ui-es-bar');
    if (!esBar) {
        let hpWrap = document.querySelector('#ui-hp-bar').parentElement;
        esBar = document.createElement('div');
        esBar.id = 'ui-es-bar';
        esBar.className = 'hp-bar-fill';
        esBar.style.backgroundColor = '#55c1ff';
        esBar.style.opacity = '0.75';
        esBar.style.position = 'absolute';
        esBar.style.left = '0';
        esBar.style.top = '0';
        esBar.style.zIndex = '5';
        hpWrap.insertBefore(esBar, document.getElementById('ui-hp-bar'));
    }
    esBar.style.zIndex = '5';
    esBar.style.width = esPct + '%';
    esBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    setTextById('ui-exp', formatSettingNumber(game.exp, 'showExpComma'));
    setTextById('ui-maxexp', formatSettingNumber(getExpReq(game.level), 'showExpComma'));
    document.getElementById('ui-exp-bar').style.width = ((game.exp / getExpReq(game.level)) * 100) + '%';
    setTextById('ui-player-level', 'Lv.' + game.level);
    // 경험치바 왼쪽에 레벨·직업(또는 재능)을, 오른쪽에 진행률과 남은 경험치를 표기한다.
    let expLevelEl = document.getElementById('ui-exp-level-label');
    if (expLevelEl) {
        let levelText = `Lv.${game.level} ${getUiPlayerClassLabel()}`;
        if (expLevelEl.innerText !== levelText) expLevelEl.innerText = levelText;
    }
    let expNoteEl = document.getElementById('ui-exp-note');
    if (expNoteEl) {
        let expReq = Math.max(1, getExpReq(game.level));
        let expPct = Math.max(0, Math.min(100, (game.exp / expReq) * 100));
        let expRemain = Math.max(0, Math.floor(expReq - game.exp));
        let noteText = `${expPct.toFixed(1)}% · 남은 ${formatSettingNumber(expRemain, 'showExpComma')}`;
        if (expNoteEl.innerText !== noteText) expNoteEl.innerText = noteText;
    }
    [['ui-hp', 'ui-hp-mobile'], ['ui-maxhp', 'ui-maxhp-mobile'], ['ui-exp', 'ui-exp-mobile'], ['ui-maxexp', 'ui-maxexp-mobile'], ['ui-player-level', 'ui-player-level-mobile']].forEach(([src, dst]) => {
        let sourceEl = document.getElementById(src);
        let targetEl = document.getElementById(dst);
        if (sourceEl && targetEl) targetEl.innerText = sourceEl.innerText;
    });
    let hpBarMobile = document.getElementById('ui-hp-bar-mobile');
    if (hpBarMobile) hpBarMobile.style.width = document.getElementById('ui-hp-bar').style.width;
    let expBarMobile = document.getElementById('ui-exp-bar-mobile');
    if (expBarMobile) expBarMobile.style.width = document.getElementById('ui-exp-bar').style.width;
    let ailmentEl = document.getElementById('ui-player-ailments');
    if (ailmentEl) {
        let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈' };
        let ailmentColors = { ignite: '#ff9f43', chill: '#9be7ff', freeze: '#4da3ff', shock: '#ffe66d', poison: '#c56cff', bleed: '#ff6b6b', flameDecay: '#ff7a3d', assassinWeakness: '#ff9bd1' };
        let text = (game.playerAilments || []).map(ail => `<span data-info-tooltip-anchor=\"1\" style=\"color:${ailmentColors[ail.type] || '#ffffff'};font-weight:700;cursor:help;\" onmouseenter=\"showPlayerAilmentTooltip(event,'${ail.type}',${Math.ceil(Math.max(0,(ail.time||0)))},${Number(ail.power||0.1).toFixed(3)},${Math.floor(getUiStoredAilmentHitDamage(ail))})\" onmouseleave=\"hideInfoTooltip()\">${labels[ail.type] || ail.type} ${Math.ceil(Math.max(0, (ail.time || 0)))}s</span>`).join(' · ');
        if (game.woodsmanCurseActive) {
            let curseTaken = (Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.01).toFixed(2);
            let curseText = `<span style=\"color:#d0a8ff;font-weight:700;\">나무꾼의 저주 +${curseTaken}%</span>`;
            text = text ? `${text} · ${curseText}` : curseText;
        }
        let activeBuffs = (game.playerConditionBuffs || []).filter(buff => (buff.expiresAt || 0) > Date.now());
        let guardWarcryText = activeBuffs.filter(buff => ['guard', 'warcry'].includes(buff.type)).map(buff => `<span data-info-tooltip-anchor=\"1\" style=\"color:#9be7ff;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerBuffTooltip(event,'${buff.name}','${buff.type || ''}',${Math.ceil(Math.max(0,((buff.expiresAt||0)-Date.now())/1000))})\" onmouseleave=\"hideInfoTooltip()\">${buff.name} ${Math.ceil(Math.max(0, ((buff.expiresAt || 0) - Date.now()) / 1000))}s</span>`).join(' · ');
        // 플라스크 발동은 전투 로그에 띄우지 않고(자주 반복돼 스팸이 됨) 이 효과 줄에만 표시한다.
        let flaskBuffText = '';
        if (typeof ensureFlaskState === 'function') {
            let flaskNow = Date.now();
            let flaskSt = ensureFlaskState();
            let flaskParts = [];
            // 효과 줄은 공간이 좁으므로 '플라스크' 단어를 빼고 짧게 표시한다(예: '생명력 플라스크 I' → '생명력 I').
            let healDef = getFlaskHealDef(flaskSt.healTier);
            if ((flaskSt.healOverTimeUntil || 0) > flaskNow) {
                let remain = Math.ceil((flaskSt.healOverTimeUntil - flaskNow) / 1000);
                let shortName = healDef.name.replace(' 플라스크', '');
                flaskParts.push(`<span data-info-tooltip-anchor=\"1\" style=\"color:#7fd99a;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerFlaskTooltip(event,'heal','${healDef.key}')\" onmouseleave=\"hideInfoTooltip()\">🧪${shortName} ${remain}s</span>`);
            }
            // 현재 허리띠가 지원하는 슬롯 수만큼만 표시(초과분은 배열엔 남아있지만 비활성).
            let maxUtilSlotsForDisplay = typeof getMaxFlaskUtilitySlotCount === 'function' ? getMaxFlaskUtilitySlotCount() : (flaskSt.utils || []).length;
            (flaskSt.utils || []).slice(0, maxUtilSlotsForDisplay).forEach(u => {
                if (!u || (u.until || 0) <= flaskNow) return;
                let def = FLASK_UTILITY_POOL[u.key];
                if (!def) return;
                let remain = Math.ceil((u.until - flaskNow) / 1000);
                let shortName = def.name.replace(' 플라스크', '');
                flaskParts.push(`<span data-info-tooltip-anchor=\"1\" style=\"color:#ffd27a;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerFlaskTooltip(event,'util','${u.key}')\" onmouseleave=\"hideInfoTooltip()\">🧪${shortName} ${remain}s</span>`);
            });
            flaskBuffText = flaskParts.join(' · ');
        }
        let realmBuffParts = [];
        let realmNow = Date.now();
        if (pStats.uniqueDeathWard && game.realmDeathWard) {
            let wardAmount = Math.max(0, Math.floor(Number(game.realmDeathWard.amount) || 0));
            let wardMax = Math.max(0, Math.floor(Number(game.realmDeathWard.maxAmount) || 0));
            let wardReadyAt = Math.max(0, Number(game.realmDeathWard.readyAt) || 0);
            if (wardAmount > 0) {
                realmBuffParts.push(`<span style="color:#b9c8d8;font-weight:700;">감시 보호막 ${wardAmount}/${Math.max(wardAmount, wardMax)}</span>`);
            } else if (wardReadyAt > realmNow) {
                realmBuffParts.push(`<span style="color:#8292a6;font-weight:700;">감시 보호막 ${Math.ceil((wardReadyAt - realmNow) / 1000)}s</span>`);
            }
        }
        if ((game.realmInvulnerableBarrierUntil || 0) > realmNow) {
            realmBuffParts.push(`<span style="color:#c49bff;font-weight:700;">균열 장막 ${Math.ceil((game.realmInvulnerableBarrierUntil - realmNow) / 1000)}s</span>`);
        }
        let realmBuffText = realmBuffParts.join(' · ');
        let effectGroupText = [guardWarcryText, flaskBuffText, realmBuffText].filter(Boolean).join(' · ');
        let ailmentText = [text, effectGroupText].filter(Boolean).join(' · ');
        // 데스크톱에서 터치 디바이스 플래그가 잡히더라도 상태 표시를 숨기지 않도록
        // 화면 너비 기준으로만 모바일 UI 분기를 판단한다.
        let isMobile = !!(window.matchMedia && window.matchMedia('(max-width: 1080px)').matches);
        let fallbackText = '<span style="color:#8da1b8;">효과 없음</span>';
        let desktopText = ailmentText || fallbackText;
        // 데스크톱에서는 생명력 바 "아래"에 효과를 고정 노출한다.
        if (ailmentEl.__lastHtml !== '') { ailmentEl.innerHTML = ''; ailmentEl.__lastHtml = ''; }
        // 이 블록은 100ms마다 호출되므로, 내용이 같으면 innerHTML 재작성(리플로우)을 생략해
        // 상시 스터터링을 줄인다.
        let ailmentUnderEl = document.getElementById('ui-player-ailments-under');
        if (ailmentUnderEl) { let v = isMobile ? '' : desktopText; if (ailmentUnderEl.__lastHtml !== v) { ailmentUnderEl.innerHTML = v; ailmentUnderEl.__lastHtml = v; } }
        let mobileAilmentEl = document.getElementById('ui-player-ailments-mobile');
        if (mobileAilmentEl) { let v = isMobile ? desktopText : ''; if (mobileAilmentEl.__lastHtml !== v) { mobileAilmentEl.innerHTML = v; mobileAilmentEl.__lastHtml = v; } }
        let projectedPlayerAilDmg = (game.playerAilments || []).reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (!isUiDamageAilmentType(ail.type)) return sum;
            return sum + Math.floor(getUiPlayerDamageAilmentDps(ail, pStats) * Math.max(0, ail.time || 0));
        }, 0);
        let playerHpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
        let pendingPlayerPct = Math.max(0, Math.min(playerHpPct, (projectedPlayerAilDmg / Math.max(1, pStats.maxHp)) * 100));
        hpAilBar.style.width = `${pendingPlayerPct}%`;
        hpAilBar.style.left = 'auto';
        hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
        hpAilBar.style.display = pendingPlayerPct > 0.05 ? 'block' : 'none';
    }
    let hpCombatBar = document.getElementById('ui-player-hp-combat');
    if (hpCombatBar) hpCombatBar.style.width = `${Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100))}%`;
    let esCombatBar = document.getElementById('ui-player-es-combat');
    if (esCombatBar) {
        let pct = (pStats.energyShield || 0) > 0 ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
        esCombatBar.style.width = `${pct}%`;
        esCombatBar.style.display = (pStats.energyShield || 0) > 0 ? 'block' : 'none';
    }

    let zone = getZone(game.currentZoneId);
    let combatTitle = zone.name;
    if (zone.type === 'act') {
        let storyAct = getStoryActByZoneId(zone.id);
        if (storyAct) combatTitle = `⚔️ 전투 ${formatStoryActLabel(storyAct)}: ${storyAct.title}`;
    } else if (zone.type !== 'trial') {
        combatTitle = `⚔️ 전투 ${zone.name}`;
    }
    let zoneText = zone.type === 'trial' ? zone.name : combatTitle;
    let compactZoneText = zoneText.replace(/^⚔️\s*전투\s*/,'');
    setTextById('ui-combat-zone', compactZoneText);
    let inlineZoneEl = document.getElementById('ui-combat-zone-inline');
    // 레벨·직업은 경험치바 왼쪽(ui-exp-level-label)으로 이동했으므로 여기는 지역 이름만 표기한다.
    if (inlineZoneEl && inlineZoneEl.innerText !== compactZoneText) inlineZoneEl.innerText = compactZoneText;
    let contractStatus = document.getElementById('ui-combat-contract-status');
    if (contractStatus) {
        let contractScore = getChallengeContractScore();
        let contractActive = isChallengeContractEligibleZone(zone) && contractScore > 0;
        contractStatus.style.display = contractActive ? 'inline-flex' : 'none';
        if (contractActive) contractStatus.innerText = `📜 계약 ${contractScore} · 보상 +${Math.round((getChallengeContractRewardMultiplier(zone) - 1) * 100)}%`;
    }

    let pendingWoodsmanEntrance = !!game.woodsmanEntrancePending && zone && zone.type === 'outsideChaos';
    if (pendingWoodsmanEntrance) {
        let totalTime = Math.max(0.1, Number(game.moveTotalTime) || 3);
        let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, game.moveTimer || 0) / totalTime) * 100));
        setTextById('ui-progress-label', '☠️ 나무꾼 등장 대기');
        setTextById('ui-move-time-text', game.moveTimer > 0 ? `${Math.max(0, game.moveTimer).toFixed(1)}초` : '등장 임박');
        document.getElementById('ui-move-bar').style.width = readyPct + '%';
    } else if (game.moveTimer > 0) {
        let readyPct = Math.min(100, (1 - game.moveTimer / game.moveTotalTime) * 100);
        setTextById('ui-progress-label', game.isTownReturning ? '🏕️ 재정비 중...' : '🚶 다음 구간 준비');
        setTextById('ui-move-time-text', `${Math.max(0, game.moveTimer).toFixed(1)}초`);
        document.getElementById('ui-move-bar').style.width = readyPct + '%';
    } else if (zone && zone.type === 'oceanDepth') {
        // 심해는 전투 진행도 대신 현재 수심(m)만 표기한다. 수심은 시간에 따라 1m 단위로 꾸준히 증가한다.
        let oceanSt = (typeof ensureOceanState === 'function') ? ensureOceanState() : null;
        let depthM = oceanSt ? Math.floor(oceanSt.depthM || 0) : 0;
        // 진행 바는 현재 100m 구간 내 진행도를 표시해 수심 1m마다 약 1%씩 차오른다.
        let segPct = Math.min(100, Math.max(0, depthM - Math.floor(depthM / 100) * 100));
        let isDrowning = !!(oceanSt && oceanSt.drowning);
        setTextById('ui-progress-label', isDrowning ? '🫨 익사 위험' : '🌊 수심');
        setTextById('ui-move-time-text', isDrowning ? `${depthM}m · 산소 고갈! 익사 피해 누적` : `${depthM}m`);
        document.getElementById('ui-move-bar').style.width = (isDrowning ? 100 : segPct) + '%';
    } else if (getUiCrowdProgressPaused()) {
        setTextById('ui-progress-label', '⛔ 전장 정리 중');
        setTextById('ui-move-time-text', `적 ${getUiCrowdPauseLimit()}기 이상`);
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    } else {
        setTextById('ui-progress-label', '🧭 진행도');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        document.getElementById('ui-move-bar').style.width = game.runProgress + '%';
    }

    setTextById('ui-total-dps', formatSettingNumber(pStats.totalDps || ((pStats.dps || 0) + (pStats.summonDps || 0)), 'showCharacterComma'));
    setTextById('ui-dps', formatSettingNumber(pStats.directDps || pStats.dps || 0, 'showCharacterComma'));
    setTextById('ui-summon-dps', formatSettingNumber(pStats.summonDps || 0, 'showCharacterComma'));
    document.getElementById('ui-atk').innerText = formatSettingNumber(pStats.baseDmg, 'showCharacterComma');
    document.getElementById('ui-aps').innerText = pStats.aspd.toFixed(2);
    document.getElementById('ui-crit').innerText = pStats.crit.toFixed(1);
    setTextById('ui-core-attrs', `${Math.floor(pStats.strength || 0)} / ${Math.floor(pStats.dexterity || 0)} / ${Math.floor(pStats.intelligence || 0)}`);
    setTextById('ui-accuracy', formatSettingNumber(Math.floor(pStats.accuracy || 0), 'showCharacterComma'));
    document.getElementById('ui-crit-dmg').innerText = Math.floor(pStats.critDmg);
    document.getElementById('ui-ignite-chance').innerText = Math.max(0, pStats.igniteChance || 0).toFixed(1);
    document.getElementById('ui-chill-chance').innerText = Math.max(0, pStats.chillChance || 0).toFixed(1);
    document.getElementById('ui-freeze-chance').innerText = Math.max(0, pStats.freezeChance || 0).toFixed(1);
    document.getElementById('ui-poison-chance').innerText = Math.max(0, pStats.poisonChance || 0).toFixed(1);
    document.getElementById('ui-bleed-chance').innerText = Math.max(0, pStats.bleedChance || 0).toFixed(1);
    document.getElementById('ui-move-spd').innerText = Math.floor(pStats.moveSpeed);
    document.getElementById('ui-dr').innerText = Math.floor(pStats.dr);
    let armorEl = document.getElementById('ui-armor'); if (armorEl) armorEl.innerText = formatSettingNumber(pStats.armor || 0, 'showCharacterComma');
    let evasionEl = document.getElementById('ui-evasion'); if (evasionEl) evasionEl.innerText = formatSettingNumber(pStats.evasion || 0, 'showCharacterComma');
    let esEl = document.getElementById('ui-es'); if (esEl) esEl.innerText = formatSettingNumber(pStats.energyShield || 0, 'showCharacterComma');
    let blockEl = document.getElementById('ui-block-chance'); if (blockEl) blockEl.innerText = Math.max(0, Number(pStats.blockChance || 0)).toFixed(1);
    let deflectEl = document.getElementById('ui-deflect-chance'); if (deflectEl) deflectEl.innerText = Math.max(0, Number(pStats.deflectChance || 0)).toFixed(1);
    document.getElementById('ui-phys-ignore').innerText = Math.floor(pStats.physIgnore || 0);
    document.getElementById('ui-res-pen').innerText = Math.floor(pStats.resPen || 0);
    document.getElementById('ui-res-fire').innerText = formatCappedResistanceValue(pStats.resF, pStats.rawResF);
    document.getElementById('ui-res-cold').innerText = formatCappedResistanceValue(pStats.resC, pStats.rawResC);
    document.getElementById('ui-res-light').innerText = formatCappedResistanceValue(pStats.resL, pStats.rawResL);
    document.getElementById('ui-res-chaos').innerText = formatCappedResistanceValue(pStats.resChaos, pStats.rawResChaos);
    let setStatText = (id, value, formatter) => {
        let el = document.getElementById(id);
        if (el) el.innerText = formatter ? formatter(value) : value;
    };
    let formatInlinePct = (value) => {
        let n = Number(value || 0);
        if (!Number.isFinite(n)) n = 0;
        let rounded = Math.round(n * 10) / 10;
        return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
    };
    setStatText('ui-ignite-chance', pStats.igniteChance || 0, formatInlinePct);
    setStatText('ui-chill-chance', pStats.chillChance || 0, formatInlinePct);
    setStatText('ui-freeze-chance', pStats.freezeChance || 0, formatInlinePct);
    setStatText('ui-shock-chance', pStats.shockChance || 0, formatInlinePct);
    setStatText('ui-poison-chance', pStats.poisonChance || 0, formatInlinePct);
    setStatText('ui-bleed-chance', pStats.bleedChance || 0, formatInlinePct);
    setStatText('ui-ail-res-ignite', pStats.ailmentResistIgniteChance || 0, formatInlinePct);
    setStatText('ui-ail-res-chill', pStats.ailmentResistChillChance || 0, formatInlinePct);
    setStatText('ui-ail-res-freeze', pStats.ailmentResistFreezeChance || 0, formatInlinePct);
    setStatText('ui-ail-res-shock', pStats.ailmentResistShockChance || 0, formatInlinePct);
    setStatText('ui-ail-res-poison', pStats.ailmentResistPoisonChance || 0, formatInlinePct);
    setStatText('ui-ail-res-bleed', pStats.ailmentResistBleedChance || 0, formatInlinePct);
    document.getElementById('ui-min-dmg-roll').innerText = Math.floor(pStats.minDmgRoll || 80);
    document.getElementById('ui-max-dmg-roll').innerText = Math.floor(pStats.maxDmgRoll || 100);
    document.getElementById('ui-loop-deaths').innerText = Math.max(0, Math.floor(game.loopDeaths || 0));
    document.getElementById('ui-loop-kills').innerText = Math.max(0, Math.floor(game.loopKills || 0));

    document.getElementById('row-phys-ignore').style.display = (pStats.physIgnore || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-res-pen').style.display = (pStats.resPen || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-regen').style.display = pStats.regen > 0 ? 'grid' : 'none';
    document.getElementById('row-regen-suppress').style.display = (pStats.regenSuppress || 0) > 0 ? 'grid' : 'none';
    document.getElementById('row-leech').style.display = pStats.leech > 0 ? 'grid' : 'none';
    document.getElementById('row-ds').style.display = pStats.ds > 0 ? 'grid' : 'none';
    document.getElementById('row-gemlv').style.display = pStats.gemLv > 0 ? 'grid' : 'none';
    if (pStats.regen > 0) document.getElementById('ui-regen').innerText = formatValue('regen', pStats.regen);
    if ((pStats.regenSuppress || 0) > 0) document.getElementById('ui-regen-suppress').innerText = formatValue('regenSuppress', pStats.regenSuppress);
    if (pStats.leech > 0) document.getElementById('ui-leech').innerText = formatValue('leech', pStats.leech);
    if (pStats.ds > 0) document.getElementById('ui-ds').innerText = formatSettingNumber(pStats.ds, 'showCharacterComma');
    if (pStats.gemLv > 0) document.getElementById('ui-gemlv').innerText = `+${pStats.gemLv}`;
    let specialSummaryEl = document.getElementById('ui-unique-special-summary');
    if (specialSummaryEl) {
        let notes = [];
        if ((pStats.glovePairAspdBonus || 0) > 0) notes.push(`🧤 동형 장갑 세트 보너스 활성화: 기본 공속 +${(pStats.glovePairAspdBonus || 0).toFixed(2)}`);
        let heroDef = getHeroSelectionDef(game.selectedHeroId);
        if (heroDef) notes.push(`🧬 ${heroDef.label} 재능: ${heroDef.talentsText}`);
        if (game.ascendClass && Array.isArray(game.ascendKeystones) && game.ascendKeystones.length > 0) {
            let defs = getClassKeystoneDefs(game.ascendClass);
            let pickedNames = game.ascendKeystones.map(id => ((defs.find(node => node.id === id) || {}).name || id));
            notes.push(`★ 키스톤: ${pickedNames.join(' / ')}`);
        }
        if ((pStats.minDmgRoll || 80) >= (pStats.maxDmgRoll || 100)) notes.push(`⚖️ 최소 피해 보정(${Math.floor(pStats.minDmgRoll || 80)}%)이 최대 보정 이상이라 최대 피해 보정이 동일 값으로 조정됩니다.`);
        specialSummaryEl.innerText = notes.join(' · ');
    }

    let enemies = (game.enemies || []).filter(enemy => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(enemies.map(enemy => enemy.id));
    let targetIds = getUiSkillTargets(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let focusedEnemy = enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = document.getElementById('ui-enemy-list');
    if (!focusedEnemy) {
        if (enemyListEl.dataset.enemyId !== '') {
            enemyListEl.dataset.enemyId = '';
            enemyListEl.innerHTML = `<div class="enemy-empty">현재 조준 중인 적이 없습니다.</div>`;
        }
    } else {
        let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
        let tags = getEnemyTraitSummary(focusedEnemy);
        if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map(a => a.name));
        let ailmentLabels = { ignite: '🔥 점화', chill: '❄ 냉각', freeze: '🧊 동결', shock: '⚡ 감전', poison: '☠ 중독', bleed: '🩸 출혈', flameDecay: '🔥 화염 부패', assassinWeakness: '🗡 독점 약점', hunterExpose: '🎯 약점 노출' };
        let activeAilments = (focusedEnemy.ailments || []).filter(ail => ail && (ail.time || 0) > 0);
        let enemyDebuffs = (((game.enemyConditionDebuffs || {})[focusedEnemy.id]) || []).filter(row => row && (row.expiresAt || 0) > Date.now());
        let ailmentColors = { ignite: '#ff9f43', chill: '#9be7ff', freeze: '#4da3ff', shock: '#ffe66d', poison: '#c56cff', bleed: '#ff6b6b', flameDecay: '#ff7a3d', assassinWeakness: '#ff9bd1', hunterExpose: '#ffd36b' };
        let ailmentText = activeAilments.map(ail => `<span data-info-tooltip-anchor=\"1\" style=\"color:${ailmentColors[ail.type] || '#ffffff'};font-weight:700;cursor:help;\" onmouseenter=\"showEnemyAilmentTooltip(event,'${ail.type}',${Math.ceil(ail.time || 0)},${Number(ail.power || 0).toFixed(3)},${Math.floor(getUiStoredAilmentHitDamage(ail))},${Math.floor(ail.flameDecayDps || 0)},${Number(ail.critDotBonusPct || 0).toFixed(3)},${Math.max(1, Math.floor(ail.stacks || 1))},${Math.floor(ail.rawTickDamage || 0)},${Number(ail.tickInterval || 0).toFixed(3)},${Number(ail.enemyRes || 0).toFixed(3)},${Number(ail.abyssPlayerMul || 1).toFixed(3)},${Number(ail.igniteTakenMultiplier || 1).toFixed(3)})\" onmouseleave=\"hideInfoTooltip()\">${ailmentLabels[ail.type] || ail.type}${ail.type === 'assassinWeakness' ? ` ${Math.floor(ail.power || 0)}중첩` : ''} ${Math.ceil(ail.time || 0)}s</span>`).join(' · ');
        let curseText = enemyDebuffs.map(row => `<span data-info-tooltip-anchor=\"1\" style=\"color:#ff9bd1;font-weight:700;cursor:help;\" onmouseenter=\"showPlayerBuffTooltip(event,'${row.name}','curse',${Math.ceil(Math.max(0,((row.expiresAt||0)-Date.now())/1000))})\" onmouseleave=\"hideInfoTooltip()\">🕯 저주:${row.name} ${Math.ceil(Math.max(0, ((row.expiresAt || 0) - Date.now()) / 1000))}s</span>`).join(' · ');
        ailmentText = [ailmentText, curseText].filter(Boolean).join(' · ');
        let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (ail.type === 'flameDecay') return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
            if (!isUiDamageAilmentType(ail.type)) return sum;
            let dps = getUiEnemyDamageAilmentDps(ail, cachedTooltipStats || getUiPlayerStats());
            let stacks = Math.max(1, Math.floor(ail.stacks || 1));
            return sum + Math.floor(dps * stacks * Math.max(0, ail.time || 0));
        }, 0);
        let pendingPct = Math.max(0, Math.min(pct, (projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1)) * 100));
        let pendingStartPct = Math.max(0, pct - pendingPct);
        let ghostPct = updateEnemyHpDamageGhost(focusedEnemy.id, pct);
        let ghostDisplay = ghostPct > pct + 0.2 ? 'block' : 'none';
        let focusedKey = String(focusedEnemy.id) + '|' + enemies.length;
        if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector('.enemy-card.targeted')) {
            enemyListEl.dataset.enemyId = focusedKey;
            enemyListEl.innerHTML = `
                <div class="enemy-card targeted${focusedEnemy.isBoss || focusedEnemy.bossPhase ? ' enemy-boss' : (focusedEnemy.isElite ? ' enemy-elite' : '')}">
                    <div class="enemy-name"></div>
                    <div class="hp-bar-bg">
                        <div class="hp-bar-fill enemy-damage-ghost"></div>
                        <div class="hp-bar-fill enemy-es"></div>
                        <div class="hp-bar-fill enemy"></div>
                        <div class="hp-bar-fill enemy-pending"></div>
                        <div class="hp-text"></div>
                    </div>
                    <div class="enemy-tags muted enemy-ailments"></div>
                    <div class="enemy-tags muted enemy-traits"></div>
                </div>
            `;
        }
        let nameEl = enemyListEl.querySelector('.enemy-name');
        let ghostEl = enemyListEl.querySelector('.enemy-damage-ghost');
        let esEl = enemyListEl.querySelector('.hp-bar-fill.enemy-es');
        let hpEl = enemyListEl.querySelector('.hp-bar-fill.enemy');
        let pendingEl = enemyListEl.querySelector('.enemy-pending');
        let hpTextEl = enemyListEl.querySelector('.hp-text');
        let ailmentEl = enemyListEl.querySelector('.enemy-ailments');
        let traitEl = enemyListEl.querySelector('.enemy-traits');
        if (nameEl) nameEl.innerText = getEnemyDisplayName(focusedEnemy);
        if (ghostEl) { ghostEl.style.width = `${ghostPct}%`; ghostEl.style.display = ghostDisplay; }
        if (esEl) {
            let esPct = (focusedEnemy.maxEnergyShield || 0) > 0 ? Math.max(0, Math.min(100, ((focusedEnemy.energyShield || 0) / Math.max(1, focusedEnemy.maxEnergyShield)) * 100)) : 0;
            esEl.style.width = `${esPct}%`;
            esEl.style.display = esPct > 0 ? 'block' : 'none';
        }
        if (hpEl) hpEl.style.width = `${pct}%`;
        if (pendingEl) { pendingEl.style.left = `${pendingStartPct}%`; pendingEl.style.width = `${pendingPct}%`; }
        if (hpTextEl) {
            let zoneNow = getZone(game.currentZoneId);
            if (zoneNow && zoneNow.type === 'woodsmanEcho') {
                let totalDealt = Math.max(0, Math.floor((focusedEnemy.echoStartHp || focusedEnemy.maxHp || 0) - Math.max(0, focusedEnemy.hp || 0)));
                hpTextEl.innerText = `${focusedEnemy.energyShield > 0 ? `ES ${formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma')} · ` : ''}${formatSettingNumber(totalDealt, 'showEnemyHpComma')} / ?`;
            } else hpTextEl.innerText = `${focusedEnemy.energyShield > 0 ? `ES ${formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma')} · ` : ''}${formatSettingNumber(Math.max(0, focusedEnemy.hp), 'showEnemyHpComma')}/${formatSettingNumber(focusedEnemy.maxHp, 'showEnemyHpComma')}`;
        }
        if (ailmentEl) ailmentEl.innerHTML = ailmentText ? `상태이상: ${ailmentText}` : '상태이상: 없음';
        if (traitEl) {
            let showTraits = !!(focusedEnemy.isElite || focusedEnemy.isBoss || focusedEnemy.bossPhase);
            traitEl.innerText = showTraits ? `특성: ${tags.join(' · ') || (focusedEnemy.isBoss || focusedEnemy.bossPhase ? '보스' : '정예')}` : '';
            traitEl.title = focusedEnemy.patternMode && typeof getBossPatternDescription === 'function'
                ? getBossPatternDescription(focusedEnemy.patternMode)
                : '';
            traitEl.style.display = showTraits ? '' : 'none';
        }
    }
}

// passive render cache dirty helper: 구조 변경/노드 상태 변경 시 호출
function markPassiveRenderCacheDirty(type) {
    if (!passiveRenderCache) return;
    if (type === 'structure') passiveRenderCache.structureDirty = true;
    passiveRenderCache.stateDirty = true;
}

function getPassiveStateSignature() {
    let passives = (game.passives || []).slice().sort().join('|');
    let discovered = Array.from(discoveredPassiveNodes || []).sort().join('|');
    let reachable = Array.from(reachableNodes || []).sort().join('|');
    let starState = game.starWedge || {};
    let virtual = Object.keys(starState.virtualLearnNodes || {}).sort().join('|');
    let disabled = Object.keys(starState.disabledNodeEffects || {}).sort().join('|');
    let conflicts = Object.keys(starState.mutationConflictSources || {}).sort().join('|');
    return `${passives}::${discovered}::${reachable}::${virtual}::${disabled}::${conflicts}`;
}

function rebuildPassiveStructureCache() {
    let nodes = Object.values(PASSIVE_TREE.nodes || {});
    let edges = (PASSIVE_TREE.edges || []).map(edge => {
        let a = PASSIVE_TREE.nodes[edge.from];
        let b = PASSIVE_TREE.nodes[edge.to];
        if (!a || !b) return null;
        return { ...edge, a, b };
    }).filter(Boolean);
    passiveRenderCache.nodes = nodes;
    passiveRenderCache.edges = edges;
    passiveRenderCache.hoverGrid = new Map();
    let cellSize = passiveRenderCache.cellSize;
    nodes.forEach(node => {
        let cx = Math.floor(node.x / cellSize);
        let cy = Math.floor(node.y / cellSize);
        let key = `${cx},${cy}`;
        if (!passiveRenderCache.hoverGrid.has(key)) passiveRenderCache.hoverGrid.set(key, []);
        passiveRenderCache.hoverGrid.get(key).push(node);
    });
    passiveRenderCache.structureDirty = false;
}

function rebuildPassiveStateCache() {
    passiveRenderCache.glowNodes = [];
    passiveRenderCache.activeEdges = passiveRenderCache.edges.filter(edge => {
        if (!isPassiveNodeAvailable(edge.a) || !isPassiveNodeAvailable(edge.b)) return false;
        let va = getPassiveVisibility(edge.a.id);
        let vb = getPassiveVisibility(edge.b.id);
        return va !== 'hidden' && vb !== 'hidden';
    });
    passiveRenderCache.stateSignature = getPassiveStateSignature();
    passiveRenderCache.stateDirty = false;
}

function ensurePassiveRenderCache() {
    if (passiveRenderCache.structureDirty) rebuildPassiveStructureCache();
    let signature = getPassiveStateSignature();
    if (passiveRenderCache.stateDirty || passiveRenderCache.stateSignature !== signature) rebuildPassiveStateCache();
}

function getPassiveWorldViewport(displayWidth, displayHeight) {
    let halfW = displayWidth / 2;
    let halfH = displayHeight / 2;
    return {
        minX: (-halfW - camX) / camZoom,
        maxX: (halfW - camX) / camZoom,
        minY: (-halfH - camY) / camZoom,
        maxY: (halfH - camY) / camZoom
    };
}

function isNodeInViewport(node, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    return node.x >= viewport.minX - m && node.x <= viewport.maxX + m && node.y >= viewport.minY - m && node.y <= viewport.maxY + m;
}

function isEdgeInViewport(edge, viewport, margin) {
    let m = Number.isFinite(margin) ? margin : 0;
    let minX = Math.min(edge.a.x, edge.b.x);
    let maxX = Math.max(edge.a.x, edge.b.x);
    let minY = Math.min(edge.a.y, edge.b.y);
    let maxY = Math.max(edge.a.y, edge.b.y);
    return !(maxX < viewport.minX - m || minX > viewport.maxX + m || maxY < viewport.minY - m || minY > viewport.maxY + m);
}




// Phase-2 appended static UI renderer block.
let uiRefreshQueued = false;
let uiRefreshRunning = false;
let uiPointerInteraction = null;
let uiPointerFlushTimer = null;
const UI_REFRESH_POINTER_FLUSH_DELAY_MS = 35;
const UI_REFRESH_LONG_POINTER_LIMIT_MS = 8000;

function isClickSensitiveTarget(target) {
    return !!(target && target.closest && target.closest('button, .tab-btn, .subtab-btn, a, input, select, textarea, [onclick], [role="button"], .item-card, .skill-gem, .slot-box, .map-item'));
}

function beginUiPointerInteraction(event) {
    if (event && event.pointerType === 'mouse' && event.button !== 0) return;
    if (!isClickSensitiveTarget(event && event.target)) return;
    uiPointerInteraction = { pointerId: event.pointerId, startedAt: Date.now() };
}

function scheduleDeferredStaticUiFlush(delayMs) {
    if (uiPointerFlushTimer) return;
    uiPointerFlushTimer = setTimeout(() => {
        uiPointerFlushTimer = null;
        if (uiRefreshQueued && !uiRefreshRunning) requestAnimationFrame(processQueuedUIRefresh);
    }, Math.max(0, delayMs || 0));
}

function finishUiPointerInteraction(event) {
    if (!uiPointerInteraction) return;
    if (event && event.pointerId !== uiPointerInteraction.pointerId) return;
    uiPointerInteraction = null;
    if (uiRefreshQueued) scheduleDeferredStaticUiFlush(UI_REFRESH_POINTER_FLUSH_DELAY_MS);
}

function isUiPointerInteractionActive(now = Date.now()) {
    if (!uiPointerInteraction) return false;
    return (now - uiPointerInteraction.startedAt) < UI_REFRESH_LONG_POINTER_LIMIT_MS;
}

if (!window.__uiRefreshPointerGuardBound) {
    window.__uiRefreshPointerGuardBound = true;
    document.addEventListener('pointerdown', beginUiPointerInteraction, true);
    document.addEventListener('pointerup', finishUiPointerInteraction, true);
    document.addEventListener('pointercancel', finishUiPointerInteraction, true);
}

function getJournalEntryAction(entryId) {
    let mapUnlocked = !!(game && game.unlocks && game.unlocks.map);
    let charUnlocked = !!(game && game.unlocks && game.unlocks.char);
    let loop = Math.max(1, Math.floor(Number((game && game.season) || 1)));
    if (/^act_\d+$/.test(entryId) || entryId === 'immortal') {
        return mapUnlocked ? { label: '사냥터 보기', tabId: 'tab-map', subtabId: 'map-explore-hunting' } : null;
    }
    if (entryId === 'woodsman') {
        return mapUnlocked ? { label: '뿌리 보스 보기', tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    }
    if (entryId === 'woodsman_echo') {
        let realmUnlocked = !!(game && game.chaosRealm && game.chaosRealm.unlocked);
        return mapUnlocked && realmUnlocked ? { label: '혼돈계 보기', tabId: 'tab-map', subtabId: 'map-tab-chaos-realm' } : null;
    }
    if (entryId === 'star_wedge') {
        let starUnlocked = !!(game && game.starWedge && game.starWedge.unlocked);
        return charUnlocked && (starUnlocked || loop >= STAR_WEDGE_UNLOCK_LOOP) ? { label: '패시브 트리 보기', tabId: 'tab-char' } : null;
    }
    if (entryId === 'passive_star_evolution') {
        return charUnlocked ? { label: '성좌 확인', tabId: 'tab-char' } : null;
    }
    if (entryId === 'level_200') {
        return { label: '캐릭터 성장 확인', tabId: 'tab-character' };
    }
    if (entryId === 'beehive_queen') {
        return mapUnlocked && loop >= 8 ? { label: '벌집 원정 보기', tabId: 'tab-map', subtabId: 'map-explore-beehive' } : null;
    }
    if (entryId === 'void_grand_breach') {
        return mapUnlocked && loop >= 9 ? { label: '공허 균열 보기', tabId: 'tab-map', subtabId: 'map-explore-voidrift' } : null;
    }
    if (entryId === 'labyrinth_10') return mapUnlocked ? { label: '고대 미궁 보기', tabId: 'tab-map', subtabId: 'map-explore-labyrinth' } : null;
    if (entryId === 'ocean_500') return mapUnlocked && loop >= OCEAN_UNLOCK_LOOP ? { label: '심해 보기', tabId: 'tab-map', subtabId: 'map-tab-ocean' } : null;
    if (entryId === 'sky_tower_10') return mapUnlocked && game && game.skyTower && game.skyTower.unlocked ? { label: '창공의 탑 보기', tabId: 'tab-map', subtabId: 'map-tab-sky' } : null;
    if (entryId === 'time_rift_fusion') return mapUnlocked && loop >= TIME_RIFT_UNLOCK_LOOP ? { label: '시간의 균열 보기', tabId: 'tab-map', subtabId: 'map-explore-timerift' } : null;
    if (entryId === 'colony_wave_10') return mapUnlocked && loop >= 15 ? { label: '군락지 보기', tabId: 'tab-map', subtabId: 'map-explore-colony' } : null;
    if (/^rival_/.test(entryId)) {
        return mapUnlocked && loop >= 31 ? { label: '버려진 날 보기', tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    }
    if (entryId === 'cosmos_astra') {
        if (!mapUnlocked || loop < 31) return null;
        let progress = typeof getCosmosCapstoneProgress === 'function' ? getCosmosCapstoneProgress((game && game.cosmosAtlas) || {}) : null;
        return progress && progress.canChallenge
            ? { label: '아스트라 도전 보기', tabId: 'tab-map', subtabId: 'map-explore-root-boss' }
            : { label: '우주계 진행 보기', tabId: 'tab-map', subtabId: 'map-tab-cosmos' };
    }
    return null;
}

function openJournalEntryAction(entryId) {
    let action = getJournalEntryAction(entryId);
    if (!action || !action.tabId) return;
    switchTab(action.tabId);
    if (action.tabId !== 'tab-map' || !action.subtabId) return;
    if (action.subtabId.startsWith('map-tab-')) {
        switchMapSubtab(action.subtabId);
        return;
    }
    switchMapSubtab('map-tab-zones');
    switchMapExploreSubtab(action.subtabId);
}

function updateStaticUI(forceImmediate) {
    void forceImmediate;
    if (uiRefreshQueued || uiRefreshRunning) return;
    uiRefreshQueued = true;
    requestAnimationFrame(processQueuedUIRefresh);
}

function processQueuedUIRefresh() {
    uiRefreshQueued = false;
    if (isUiPointerInteractionActive()) {
        uiRefreshQueued = true;
        scheduleDeferredStaticUiFlush(UI_REFRESH_POINTER_FLUSH_DELAY_MS);
        return;
    }
    uiRefreshRunning = true;
    try {
        performUpdateStaticUI();
    } finally {
        uiRefreshRunning = false;
        if (uiRefreshQueued) requestAnimationFrame(processQueuedUIRefresh);
    }
}

function shouldRedrawPassiveTree(now) {
    let signature = [
        game.passivePoints || 0,
        (game.passives || []).length,
        (game.discoveredPassives || []).length,
        game.startNode || '',
        game.ascendClass || '',
        game.season || 1,
        (game.starWedge && game.starWedge._mutationSignature) || '',
        (game.settings && game.settings.passiveTreeSearch) || '',
        (game.settings && game.settings.passiveTreeFilter) || 'all'
    ].join('|');
    let changed = signature !== lastPassiveTreeSignature;
    let due = (now - lastPassiveTreeDrawAt) >= 500;
    if (changed) lastPassiveTreeSignature = signature;
    return changed || due;
}

function renderEquipmentLoadoutSummary(pStats) {
    let host = document.getElementById('ui-equipment-loadout-summary');
    let countBadge = document.getElementById('ui-equipped-count');
    let equipment = game.equipment || {};
    let slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
    if (equipment['반지3']) slots.push('반지3');
    let equipped = slots.map(slot => equipment[slot]).filter(Boolean);
    if (countBadge) countBadge.textContent = `${equipped.length} / ${slots.length}`;
    if (host) {
        let qualityItems = equipped.filter(item => Number(item && item.quality) > 0);
        let averageQuality = qualityItems.length
            ? Math.round(qualityItems.reduce((sum, item) => sum + Number(item.quality || 0), 0) / qualityItems.length)
            : 0;
        let averageTier = typeof getAverageExplicitAffixTier === 'function' ? getAverageExplicitAffixTier(equipped) : 0;
        let dps = Math.max(0, Math.floor(Number(pStats && (pStats.totalDps || pStats.dps)) || 0));
        let defense = Math.max(0, Math.floor((Number(pStats && pStats.armor) || 0) + (Number(pStats && pStats.evasion) || 0) + (Number(pStats && pStats.energyShield) || 0)));
        host.innerHTML = `
            <div class="equipment-summary-stat"><span>전투력</span><strong>${formatSettingNumber(dps, 'showCharacterComma')}</strong></div>
            <div class="equipment-summary-stat"><span>방어 합계</span><strong>${formatSettingNumber(defense, 'showCharacterComma')}</strong></div>
            <div class="equipment-summary-stat"><span>추가옵션 평균 티어</span><strong>${averageTier > 0 ? `T${averageTier.toFixed(1)}` : '—'}</strong></div>
            <div class="equipment-summary-stat"><span>평균 품질</span><strong>${averageQuality > 0 ? `${averageQuality}%` : '—'}</strong></div>`;
    }
    let capacityFill = document.getElementById('ui-inventory-capacity-fill');
    if (capacityFill) {
        let limit = Math.max(1, Number(getInventoryLimit()) || 1);
        let pct = Math.max(0, Math.min(100, (game.inventory.length / limit) * 100));
        capacityFill.style.width = `${pct}%`;
        capacityFill.classList.toggle('near-capacity', pct >= 80);
    }
}

function performUpdateStaticUI() {
    // 진단용 단계별 타이밍. 한 번의 갱신이 150ms를 넘으면(또는 window.__perfLog가 켜져
    // 있으면) 어느 단계가 느린지 콘솔에 한 줄 남긴다. 정상 갱신에는 거의 영향이 없다.
    const __perfNow = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
    const __pm = [['start', __perfNow()]];
    const __mark = (n) => __pm.push([n, __perfNow()]);

    ensureStarWedgeState();
    tryUnlockMeteorContentByProgress();
    recalculateStarWedgeMutations();
    // 목표 선정은 js/goal-system.js가 담당한다(디바운스 포함).
    if (typeof requestGoalSystemRefresh === 'function') requestGoalSystemRefresh();
    renderFlaskPanel();
    validateItemTooltipAnchor();
    applySeasonContentProgression({ silent: false });
    tickShrineState();
    refreshTabHeaderUiIfNeeded();
    let passiveStateSig = [
        game.passivePoints || 0,
        (game.passives || []).length,
        (game.discoveredPassives || []).length,
        game.startNode || '',
        game.ascendClass || '',
        game.season || 1,
        (game.starWedge && game.starWedge._mutationSignature) || ''
    ].join('|');
    if (passiveStateSig !== lastReachableSignature) {
        lastReachableSignature = passiveStateSig;
        calculateReachableNodes();
        refreshPassiveVisibility();
    }
    normalizeSupportLoadout(true);
    let pStats = getUiPlayerStats();
    if (typeof normalizeSummonLoadout === 'function' && normalizeSummonLoadout(true, pStats)) pStats = getUiPlayerStats();
    __mark('stats');
    cachedTooltipStats = pStats;
    updateCombatUI(pStats);
    __mark('combatUI');
    let showCombatScene = game.settings.showCombatScene !== false;
    let canvas = document.getElementById('battlefield-canvas');
    let caption = document.getElementById('ui-battlefield-caption');
    let battlefieldWrap = document.getElementById('battlefield-wrap');
    let combatDashboard = document.querySelector('.combat-dashboard');
    if (canvas) canvas.style.display = showCombatScene ? 'block' : 'none';
    if (battlefieldWrap) battlefieldWrap.classList.toggle('compressed', !showCombatScene);
    if (combatDashboard) combatDashboard.classList.toggle('combat-scene-hidden', !showCombatScene);
    applyPanelLayoutSettings();
    if (!showCombatScene && caption) caption.innerText = '전투가 진행중입니다.';
    let loopDecisionOverlay = document.getElementById('loop-decision-overlay');
    if (loopDecisionOverlay) loopDecisionOverlay.classList.toggle('active', !!game.pendingLoopDecision);
    updateLoopDecisionOverlayUi();
    let loopReadyBanner = document.getElementById('loop-ready-banner');
    if (loopReadyBanner) loopReadyBanner.classList.toggle('active', !!game.pendingLoopReady);
    let combatLoopBtn = document.getElementById('btn-combat-loop-advance');
    if (combatLoopBtn) combatLoopBtn.style.display = canShowCombatLoopAdvanceButton() ? 'inline-flex' : 'none';
    let shrineBox = document.getElementById('ui-shrine-box');
    if (shrineBox) {
        let active = game.shrineState && game.shrineState.active;
        let buff = game.shrineBuff;
        let now = Date.now();
        let activeRemain = active ? Math.max(0, Math.ceil(((active.expiresAt || 0) - now) / 1000)) : 0;
        let buffRemain = buff ? Math.max(0, Math.ceil(((buff.expiresAt || 0) - now) / 1000)) : 0;
        let shrineStateKey = active ? `active:${active.name}` : (buff ? `buff:${buff.name}` : 'idle');
        if (shrineBox.dataset.stateKey !== shrineStateKey) {
            shrineBox.innerHTML = active ? `<button onclick="clickActiveShrine()">${active.name} 클릭 (${activeRemain}s)</button>` : (buff ? `<div style="color:#ffd36b;">${buff.name} 지속중 (${buffRemain}s)</div>` : '<div style="color:#7f8c8d;">성소 대기중</div>');
            shrineBox.dataset.stateKey = shrineStateKey;
        } else if (active) {
            let btn = shrineBox.querySelector('button');
            if (btn) btn.innerText = `${active.name} 클릭 (${activeRemain}s)`;
        } else if (buff) {
            shrineBox.innerHTML = `<div style="color:#ffd36b;">${buff.name} 지속중 (${buffRemain}s)</div>`;
        }
    }
    let charTabActive = document.getElementById('tab-char') && document.getElementById('tab-char').classList.contains('active');
    if (charTabActive) {
        let drawNow = Date.now();
        if (shouldRedrawPassiveTree(drawNow)) {
            resizePassiveTreeCanvas(false);
            drawPassiveTree();
            lastPassiveTreeDrawAt = drawNow;
        }
        renderStarWedgePanel();
    }
    __mark('tree');
    if (typeof maybeUnlockCoreCube === 'function') maybeUnlockCoreCube({ silent: false });
    let cubeTabActive = document.getElementById('tab-cube') && document.getElementById('tab-cube').classList.contains('active');
    if (cubeTabActive && typeof renderCoreCubePanel === 'function') renderCoreCubePanel();

    TAB_HEADER_NOTI_KEYS.forEach(key => { let el=document.getElementById('noti-' + key); if(!el) return; el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none'; });
    ['char', 'season', 'items', 'skills', 'codex', 'talisman', 'cube', 'map', 'traits', 'talent', 'expertise'].forEach(key => document.getElementById('btn-tab-' + key).style.display = game.unlocks[key] ? 'flex' : 'none');
    let jewelTabBtn = document.getElementById('btn-tab-jewel');
    if (jewelTabBtn) jewelTabBtn.style.display = game.unlocks.jewel ? 'flex' : 'none';
    let cubeTabBtn = document.getElementById('btn-tab-cube');
    if (cubeTabBtn) cubeTabBtn.style.display = (game.unlocks && game.unlocks.cube) || (typeof isCoreCubeUnlocked === 'function' && isCoreCubeUnlocked()) ? 'flex' : 'none';
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches ? 'flex' : 'none';
    // 매 프레임 해금 판정으로 재노출된 탭에 2단 그룹 필터를 다시 적용한다.
    if (typeof hideOutOfGroupTabButtons === 'function') hideOutOfGroupTabButtons();
    let summarySkillTreeBtn = document.getElementById('btn-summary-tab-char');
    if (summarySkillTreeBtn) {
        summarySkillTreeBtn.disabled = !game.unlocks.char;
        summarySkillTreeBtn.innerText = game.unlocks.char ? '스킬트리' : '스킬트리 (Lv.2)';
    }
    let activeContent = document.querySelector('.tab-content.active');
    if (activeContent) syncDerivedTabUnlock(activeContent.id);
    let activeGate = activeContent ? TAB_UNLOCK_GATES[activeContent.id] : null;
    if (activeGate && !game.unlocks[activeGate]) {
        switchTab('tab-character');
        return;
    }

    // 보이지 않는 탭의 무거운 패널(인벤토리/주얼/부적)을 매 갱신마다 innerHTML로
    // 재구성하면 탭 전환·주기적 갱신마다 큰 렉이 발생한다. 활성 탭의 패널만 재구성한다.
    // (탭 전환 시 switchTab이 updateStaticUI를 다시 호출하므로 진입 시 정상 갱신된다.)
    let activeTabId = activeContent ? activeContent.id : '';
    let itemsTabActive = activeTabId === 'tab-items';
    let jewelTabActive = activeTabId === 'tab-jewel';
    let talismanTabActive = activeTabId === 'tab-talisman';
    const sf = getSearchFilterState();
    document.getElementById('ui-passive-points').innerText = game.passivePoints;
    document.getElementById('ui-season-text-tab').innerText = game.season;
    document.getElementById('ui-season-pts').innerText = game.seasonPoints;
    document.getElementById('ui-ascend-pts').innerText = game.ascendPoints;

    if (itemsTabActive) {
    syncSalvageControlsFromSettings();
    renderEquipmentLoadoutSummary(pStats);
    renderPaperdoll('ui-equip-list', false);
    renderPaperdoll('ui-craft-equip-list', true);
    renderPaperdoll('ui-fossil-equip-list', true);
    if (document.getElementById('ui-infuser-equip-list')) renderPaperdoll('ui-infuser-equip-list', true);
    document.getElementById('ui-inv-count').innerText = game.inventory.length;
    document.getElementById('ui-inv-limit').innerText = getInventoryLimit();
    let invRarityFilterHost = document.getElementById('ui-inventory-rarity-filter');
    if (invRarityFilterHost) invRarityFilterHost.innerHTML = renderRarityFilterChips('inventory');
    const equipInvRows = game.inventory.map((item, idx) => ({ item, idx })).filter(row => {
        let item = row.item || {};
        if (!isItemRarityVisible(item)) return false;
        let underEnchantHay = item.underEnchant ? `${item.underEnchant.id || ''} ${item.underEnchant.statName || getStatName(item.underEnchant.id || '') || ''} ${item.underEnchant.val || ''}` : '';
        let hay = `${item.name || ''} ${item.slot || ''} ${item.rarity || ''} ${(item.baseStats||[]).map(s => `${s&&s.id||''} ${s&&s.statName||''}`).join(' ')} ${(item.stats || []).map(s2 => `${s2&&s2.id||''} ${s2&&s2.statName||getStatName((s2&&s2.id)||'')||''}`).join(' ')} ${underEnchantHay}`;
        return matchSearchQuery(hay, sf.equip);
    });
    let equipSearchTools = `<button onclick="bulkSalvageEquipBySearch(false)" style="background:#6e3f3f; border-color:#8f5959;">검색 항목 해체</button><button onclick="bulkSalvageEquipBySearch(true)" style="background:#4b2f55; border-color:#6e4a78;">미검색 항목 해체</button>`;
    renderSearchSection('ui-inventory-list', 'equip', '장비 검색 (이름/슬롯/옵션)', equipInvRows.map(row => renderInventoryCard(row.item, row.idx, 'equip')).join(''), '', equipSearchTools);
    const visibleInvRows = game.inventory.map((item, idx) => ({ item, idx })).filter(row => isItemRarityVisible(row.item));
    document.getElementById('ui-craft-inventory-list').innerHTML = visibleInvRows.map(row => renderInventoryCard(row.item, row.idx, 'craft')).join('');
    document.getElementById('ui-fossil-inventory-list').innerHTML = visibleInvRows.map(row => renderInventoryCard(row.item, row.idx, 'fossil')).join('');
    let infuserInv = document.getElementById('ui-infuser-inventory-list');
    if (infuserInv) infuserInv.innerHTML = visibleInvRows.map(row => renderInventoryCard(row.item, row.idx, 'infuser')).join('');
    }
    let jewelUnlocked = !!game.unlocks.jewel;
    document.getElementById('ui-jewel-header').style.display = jewelUnlocked ? 'block' : 'none';
    document.getElementById('ui-jewel-panel').style.display = jewelUnlocked ? 'block' : 'none';
    if (jewelUnlocked && jewelTabActive) {
        let maxJewelSlots = typeof getMaxJewelSlotCount === 'function' ? getMaxJewelSlotCount() : 2;
        game.jewelSlots = Array.isArray(game.jewelSlots) ? game.jewelSlots : [];
        while (game.jewelSlots.length < maxJewelSlots) game.jewelSlots.push(null);
        game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
        jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length);
        let jewelCraftTarget = typeof getSelectedJewelCraftTarget === 'function' ? getSelectedJewelCraftTarget() : null;
        let jewelCraftKeys = ['transmute', 'augment', 'alteration', 'regal', 'exalted', 'chaos', 'divine', 'annulment'];
        let jewelCraftButtons = jewelCraftKeys.map(key => {
            let state = typeof getJewelCurrencyUseState === 'function' ? getJewelCurrencyUseState(key, jewelCraftTarget) : { enabled: false, reason: '사용 불가' };
            let count = (game.currencies || {})[key] || 0;
            return `<button data-info-tooltip-anchor="1" onmouseenter="showCurrencyCardTooltip(event,'${key}','${escapeHTML(state.reason)}')" onmousemove="showCurrencyCardTooltip(event,'${key}','${escapeHTML(state.reason)}')" onmouseleave="hideInfoTooltip()" onclick="useCurrencyOnJewel('${key}')" ${state.enabled && count > 0 ? '' : 'disabled'}>${getStyledOrbName(key)} (${count})</button>`;
        }).join('');
        let jewelCraftStats = jewelCraftTarget ? getJewelStats(jewelCraftTarget).map(stat => {
            let tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let petite = isJewelPetiteStat(stat) ? '쁘띠 ' : '';
            return `${petite}${escapeHTML(getStatName(stat.id))} +${formatJewelStatValue(stat.id, stat.val)}${tier}`;
        }).join('<br>') : '';
        let jewelCraftOptionHtml = jewelCraftTarget
            ? `<div class="item-stats" style="margin:5px 0 7px; line-height:1.45; color:#d7e9ff;">${jewelCraftStats || '<span style="color:#7f8c8d;">옵션 없음</span>'}</div>`
            : `<div style="margin:5px 0 7px; color:#7f8c8d; font-size:0.8em;">제작대상 주얼을 선택하면 현재 옵션이 표시됩니다.</div>`;
        let jewelInventoryLimit = getJewelInventoryLimit();
        let jewelOverflow = Math.max(0, game.jewelInventory.length - jewelInventoryLimit);
        document.getElementById('ui-jewel-cap').innerHTML = `<div class="jewel-cap-summary ${jewelOverflow > 0 ? 'is-overflow' : ''}"><span>주얼 인벤토리 <strong>${game.jewelInventory.length}/${jewelInventoryLimit}</strong></span><span>융합 선택 <strong>${(jewelFusionSelection||[]).length}</strong></span>${jewelOverflow > 0 ? `<span class="jewel-overflow-warning">고급 주얼 보호로 ${jewelOverflow}칸 초과 · 정리 필요</span>` : ''}</div>`;
        syncJewelSalvageControlsFromSettings();
        game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [];
        while (game.jewelSlotAmplify.length < maxJewelSlots) game.jewelSlotAmplify.push(0);
        document.getElementById('ui-jewel-core-craft').innerHTML = `<div style="color:#f1c67d; margin-bottom:4px;">주얼 제작 재화 (주얼 결정: ${game.currencies.jewelShard || 0})</div>
        <div style="font-size:0.8em; color:#8fb6d9; margin-bottom:6px;">일반 융합: 1줄 주얼 2개 + 주얼 결정 6개 → 2줄 주얼</div>
        <label style="display:block; font-size:0.78em; color:#e2c9a4; margin-bottom:4px;"><input type="checkbox" id="chk-jewel-amplified-fusion"> 증폭합성 사용 (주얼 결정 8 추가 소모, 랜덤 패널티 + 랜덤 추가옵션)</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap;"><button onclick="craftJewelFusion()" ${(game.currencies.jewelShard || 0) < 6 ? 'disabled' : ''}>선택한 주얼 융합</button><button onclick="drawJewelRefine()" ${(game.currencies.jewelShard || 0) < 12 || (game.jewelInventory||[]).length >= getJewelInventoryLimit() ? 'disabled' : ''}>주얼 가공 (주얼 결정 12)</button></div>
        <div style="margin-top:8px; font-size:0.8em; color:#8fb6d9;">슬롯 증폭: 강화 단계당 주얼 수치 +3% (최대 20강, 실패 가능)</div>
        <div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">${Array.from({ length: maxJewelSlots }, (_, slotIdx) => slotIdx).map(slotIdx => `<button onclick="tryAmplifyJewelSlot(${slotIdx})">슬롯${slotIdx + 1} 증폭 (${game.jewelSlotAmplify[slotIdx] || 0}/20 · 비용 ${getJewelAmplifyCost(game.jewelSlotAmplify[slotIdx] || 0)} · 성공 ${Math.floor(getJewelAmplifySuccessChance(game.jewelSlotAmplify[slotIdx] || 0) * 100)}%)</button>`).join('')}</div>
        <div style="margin-top:8px; color:#b4c9e2; font-size:0.8em;">공허 주얼: 최대 4줄까지 지원</div>
        <div style="display:flex; gap:6px; margin-top:4px;"><button onclick="openVoidJewelCraftOverlay()" ${(game.currencies.voidChisel || 0) <= 0 || (typeof getVoidJewelCraftMaterialIndices === 'function' ? getVoidJewelCraftMaterialIndices().length < 2 : (game.jewelInventory||[]).filter(j => j && !j.locked && !j.waxedByBeeswax).length < 2) ? 'disabled' : ''}>공허 주얼 제작 (끌 1 + 주얼2)</button><button onclick="openVoidJewelFusionOverlay()">선택 공허융합</button></div>
        <div style="margin-top:10px; border-top:1px solid #2b3a4d; padding-top:8px;"><div style="color:#d7e9ff; font-size:0.84em; margin-bottom:5px;">선택 주얼 오브 제작: <strong>${jewelCraftTarget ? escapeHTML(jewelCraftTarget.name || '주얼') : '없음'}</strong></div>${jewelCraftOptionHtml}<div style="display:flex; gap:6px; flex-wrap:wrap;">${jewelCraftButtons}</div></div>`;
        document.getElementById('ui-jewel-slots').innerHTML = Array.from({ length: maxJewelSlots }, (_, slotIdx) => slotIdx).map(slotIdx => {
            let jewel = game.jewelSlots[slotIdx];
            let ampLv = (game.jewelSlotAmplify && game.jewelSlotAmplify[slotIdx]) || 0;
            let ampBonus = ampLv * 3;
            // 심연 군주(워록 wlk8)로 추가된 키스톤 슬롯(2번 인덱스 이상)은 보라색 테두리/배지로 구분 표시한다.
            let isKeystoneSlot = slotIdx >= 2;
            let keystoneEmptyBorder = isKeystoneSlot ? 'border:1px dashed #9b59b6; box-shadow:0 0 12px rgba(155,89,182,.28) inset;' : 'border:1px solid #4a5f87; box-shadow:0 0 12px rgba(90,130,200,.18) inset;';
            let keystoneFilledShadow = isKeystoneSlot ? 'box-shadow:0 0 10px rgba(155,89,182,.45);' : 'box-shadow:0 0 12px rgba(90,130,200,.18) inset;';
            let keystoneBadge = isKeystoneSlot ? ` <span style="font-size:0.68em;color:#c39bff;border:1px solid #9b59b6;border-radius:6px;padding:0 4px;vertical-align:middle;">심연 군주</span>` : '';
            if (!jewel) return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:70px; cursor:default; ${keystoneEmptyBorder} background:linear-gradient(170deg,#101722,#152238);">💠 주얼 슬롯 ${slotIdx + 1}${keystoneBadge} <span style="color:#f1c40f;">(+${ampLv})</span><br><span style="color:#7f8c8d;">비어있음</span><br><span style="font-size:0.75em;color:#9dc3ff;">강화효과 +${ampBonus}%</span></div>`;
            let desc = getJewelStats(jewel).map(stat => {
                let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatJewelStatValue(stat.id, stat.valMin)}~${formatJewelStatValue(stat.id, stat.valMax)})` : '';
                let tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
                let petite = isJewelPetiteStat(stat) ? '쁘띠 ' : '';
                let tone = getJewelStatToneColor(stat.id);
                return `<span style="color:${tone};">${petite}${highlightSearchText(getStatName(stat.id), sf.jewel)} +${formatJewelStatValue(stat.id, stat.val)}</span>${range}${tier}`;
            }).join('<br>');
            return `<div id="jewel-slot-card-${slotIdx}" class="slot-box" style="min-height:86px; border:2px solid ${isKeystoneSlot ? '#9b59b6' : getRarityColor(jewel.rarity || 'normal')}; background:linear-gradient(170deg,#101722,#152238); ${keystoneFilledShadow}" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'slot',${slotIdx})" onmousemove="showSocketedJewelTooltip(event,'slot',${slotIdx})" onmouseleave="hideInfoTooltip()">💠 주얼 슬롯 ${slotIdx + 1}${keystoneBadge} <span style="color:#f1c40f;">(+${ampLv})</span><br><span class="item-title ${getJewelRarityClass(jewel.rarity)}">${jewel.name}</span><div class="item-stats" style="margin-top:3px;line-height:1.4;color:#d7e9ff;">${desc}</div><span style="font-size:0.75em;color:#9dc3ff;">강화효과 +${ampBonus}%</span><br><button style="margin-top:4px; font-size:0.72em;" onclick="unequipJewel(${slotIdx})">해제</button></div>`;
        }).join('');
        const jewelRows = game.jewelInventory.map((jewel, idx) => ({ jewel, idx })).filter(row => {
            const jewel = row.jewel || {};
            const statText = getJewelStats(jewel).map(stat => `${getStatName(stat.id)} ${stat.id} ${stat.val}`).join(' ');
            return matchSearchQuery(`${jewel.name || ''} ${jewel.rarity || ''} ${statText}`, sf.jewel);
        });
        let jewelRowsHtml = jewelRows.map(({jewel, idx}) => {
            let selected = (jewelFusionSelection || []).includes(idx) || (jewelCraftTarget && jewelCraftTarget === jewel) ? 'selected' : '';
            let q = sf.jewel;
            let desc = getJewelStats(jewel).map(stat => {
                let range = (stat.valMin !== undefined && stat.valMax !== undefined) ? ` (${formatJewelStatValue(stat.id, stat.valMin)}~${formatJewelStatValue(stat.id, stat.valMax)})` : '';
                let tier = Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
                let petite = isJewelPetiteStat(stat) ? '쁘띠 ' : '';
                let tone = getJewelStatToneColor(stat.id);
                return `<span style="color:${tone};">${petite}${highlightSearchText(getStatName(stat.id), q)} +${formatJewelStatValue(stat.id, stat.val)}</span>${range}${tier}`;
            }).join('<br>');
            let uniqueCardClass = jewel.rarity === 'unique' ? 'item-card--unique-special' : '';
            let uniqueBadge = jewel.rarity === 'unique' ? '<span class="unique-inventory-badge">✨ 고유</span>' : '';
            let quality = typeof getJewelQualityProfile === 'function' ? getJewelQualityProfile(jewel) : { optionCount: getJewelCoreStats(jewel).length, averageTier: null, qualityPct: null };
            let qualityText = jewel.rarity === 'unique'
                ? `고유 고정 옵션 ${quality.optionCount}개`
                : (quality.optionCount > 0 ? `옵션 ${quality.optionCount}개 · 평균 T${quality.averageTier.toFixed(1)} · 품질 ${quality.qualityPct}%` : '미가공 · 오브 제작 가능');
            let equipSlotBtns = Array.from({ length: maxJewelSlots }, (_, slotIdx) => slotIdx).map(slotIdx => `<button onclick="equipJewel(${idx}, ${slotIdx})">슬롯${slotIdx + 1}</button>`).join('');
            return `<div class="item-card ${selected} ${uniqueCardClass}" style="min-height:72px;" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'inventory',${idx})" onmousemove="showSocketedJewelTooltip(event,'inventory',${idx})" onmouseleave="hideInfoTooltip()"><div class="item-title ${getJewelRarityClass(jewel.rarity)}">${jewel.locked ? '🔒 ' : ''}${uniqueBadge}[${jewel.isVoid ? '공허' : getJewelRarityLabel(jewel.rarity)} 주얼] ${highlightSearchText(jewel.name, q)}${jewel.isVoid ? ' ✦융합계열' : ''}</div><div class="jewel-quality-line">${qualityText}</div><div class="item-stats" style="line-height:1.45;color:#d7e9ff;">${desc || '<span style="color:#7f8c8d;">옵션 없음</span>'}</div><div class="item-actions">${equipSlotBtns}<button onclick="selectJewelCraftTarget(${idx})">제작대상</button><button onclick="toggleJewelFusionSelection(${idx})">융합선택</button>${jewel.waxedByBeeswax ? `<button disabled>밀랍</button>` : `<button onclick="applyBeeswaxToJewel(${idx})" ${(game.currencies.beeswax || 0) > 0 ? '' : 'disabled'}>밀랍</button>`}<button onclick="toggleJewelLock(${idx})">${jewel.locked ? '🔒 잠금' : '🔓 잠금'}</button><button onclick="salvageJewel(${idx})" ${jewel.locked ? 'disabled' : ''}>해체 +${getJewelSalvageShardGain(jewel)}</button></div></div>`;
        }).join('');
        let jewelTools = `<button onclick="bulkSalvageJewelsBySearch(false)" style="background:#6e3f3f; border-color:#8f5959;">검색 항목 해체</button><button onclick="bulkSalvageJewelsBySearch(true)" style="background:#4b2f55; border-color:#6e4a78;">미검색 항목 해체</button>`;
        renderSearchSection('ui-jewel-inventory', 'jewel', '주얼 검색 (이름/옵션)', jewelRowsHtml, `<div style="color:#7f8c8d;">주얼 인벤토리가 비었습니다.</div>`, jewelTools);
    }

function getJewelStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    if (['firePctDmg', 'resF', 'igniteChance'].includes(statId)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance'].includes(statId)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance'].includes(statId)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'].includes(statId)) return '#c7a6ff';
    if (['armor', 'armorPct', 'dr'].includes(statId)) return '#ffd2a6';
    if (['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce'].includes(statId)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(statId)) return '#b9c6ff';
    if (['flatHp', 'pctHp', 'regen'].includes(statId)) return '#ffb3b3';
    if (['crit', 'critDmg'].includes(statId)) return '#ffd6f2';
    if (['aspd', 'move'].includes(statId)) return '#fff3a8';
    return '#d7e9ff';
}

function getSearchTokens(query) {
    return String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
}
function highlightSearchText(text, query) {
    let raw = String(text || '');
    let lower = raw.toLowerCase();
    let tokens = getSearchTokens(query).sort((a,b)=>b.length-a.length);
    if (tokens.length <= 0) return escapeHTML(raw);

    let ranges = [];
    tokens.forEach(tok => {
        if (!tok) return;
        let needle = tok.toLowerCase();
        let from = 0;
        while (from < lower.length) {
            let idx = lower.indexOf(needle, from);
            if (idx < 0) break;
            let start = idx;
            let end = idx + needle.length;
            if (needle.length > 0) ranges.push([start, end]);
            from = idx + Math.max(1, needle.length);
        }
    });
    if (ranges.length <= 0) return escapeHTML(raw);

    ranges.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
    let merged = [];
    for (let i=0;i<ranges.length;i++) {
        let cur = ranges[i];
        if (merged.length <= 0) { merged.push(cur.slice()); continue; }
        let last = merged[merged.length-1];
        if (cur[0] <= last[1]) last[1] = Math.max(last[1], cur[1]);
        else merged.push(cur.slice());
    }

    let out = '';
    let cursor = 0;
    merged.forEach(([start,end]) => {
        if (start > cursor) out += escapeHTML(raw.slice(cursor, start));
        out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${escapeHTML(raw.slice(start, end))}</mark>`;
        cursor = end;
    });
    if (cursor < raw.length) out += escapeHTML(raw.slice(cursor));
    return out;
}

function renderSearchSection(containerId, key, placeholder, rowsHtml, emptyHtml, actionButtonsHtml) {
    let root = document.getElementById(containerId);
    if (!root) return;
    let sf = getSearchFilterState();
    let input = root.querySelector(`input[data-search-key="${key}"]`);
    let list = root.querySelector('.search-result-list');
    if (!input || !list) {
        root.innerHTML = `<div class="search-filter-panel" style="grid-column:1/-1; margin-bottom:6px; width:100%; max-width:100%;"><input class="search-filter-input" data-search-key="${key}" placeholder="${placeholder}" value="${escapeHTML(sf[key] || '')}" oninput="updateSearchFilter('${key}', this.value)" style="display:block; width:100%; max-width:100%; box-sizing:border-box; padding:6px 8px; border-radius:8px; border:1px solid #45556f; background:#111a28; color:#dbe9ff;"><div class="search-action-row" style="margin-top:6px; display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;"><button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">검색어 리셋</button>${actionButtonsHtml || ''}</div></div><div class="search-result-list" style="display:contents;"></div>`;
        input = root.querySelector(`input[data-search-key="${key}"]`);
        list = root.querySelector('.search-result-list');
    }
    let actionRow = root.querySelector('.search-action-row');
    if (actionRow) {
        actionRow.style.flexWrap = 'nowrap';
        actionRow.style.overflowX = 'auto';
        actionRow.style.webkitOverflowScrolling = 'touch';
        actionRow.innerHTML = `<button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">검색어 리셋</button>${actionButtonsHtml || ''}`;
        actionRow.querySelectorAll('button').forEach(btn => {
            btn.style.flex = '0 0 auto';
            btn.style.whiteSpace = 'nowrap';
        });
    }
    if (input && input.value !== String(sf[key] || '')) input.value = String(sf[key] || '');
    // 내용이 같으면 innerHTML 재작성(파싱+리플로우)을 생략한다. 탭 전환·주기 갱신마다
    // 동일한 목록을 다시 그리는 비용을 없애 끊김을 줄인다.
    if (list) { let v = rowsHtml || emptyHtml || ''; if (list.__lastHtml !== v) { list.innerHTML = v; list.__lastHtml = v; } }
}
function getSearchFilterState() {
    game.settings = game.settings || {};
    game.settings.searchFilters = (game.settings.searchFilters && typeof game.settings.searchFilters === 'object') ? game.settings.searchFilters : {};
    const d = game.settings.searchFilters;
    d.equip = String(d.equip || '');
    d.jewel = String(d.jewel || '');
    d.talisman = String(d.talisman || '');
    d.colonyWard = String(d.colonyWard || '');
    d.skill = String(d.skill || '');
    d.support = String(d.support || '');
    return d;
}
function getInventoryRarityFilterKeys() { return ['normal', 'magic', 'rare', 'unique']; }
function getInventoryRarityFilterLabels() { return { normal: '일반', magic: '매직', rare: '레어', unique: '고유' }; }
function getInventoryRarityFilter() {
    game.settings = game.settings || {};
    let f = game.settings.inventoryViewRarities;
    if (!f || typeof f !== 'object') f = game.settings.inventoryViewRarities = {};
    getInventoryRarityFilterKeys().forEach(r => { if (typeof f[r] !== 'boolean') f[r] = true; });
    return f;
}
function isItemRarityVisible(item) {
    let rarity = (item && item.rarity) || 'normal';
    if (!getInventoryRarityFilterKeys().includes(rarity)) return true;
    return !!getInventoryRarityFilter()[rarity];
}
function applyInventoryRarityFilterChange() {
    // Update the picker overlay in place (no close/reopen flash) when it is open.
    if (document.getElementById('craft-item-picker-overlay') && window.__craftPickerKind) {
        refreshCraftItemPickerOverlay();
    }
    if (typeof updateStaticUI === 'function') updateStaticUI();
}
function toggleInventoryRarityFilter(rarity) {
    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getInventoryRarityFilter();
    f[rarity] = !f[rarity];
    applyInventoryRarityFilterChange();
}
function isAllInventoryRarityFilterOn() {
    let f = getInventoryRarityFilter();
    return getInventoryRarityFilterKeys().every(k => !!f[k]);
}
function toggleAllInventoryRarityFilter() {
    let f = getInventoryRarityFilter();
    let next = !isAllInventoryRarityFilterOn();
    getInventoryRarityFilterKeys().forEach(k => { f[k] = next; });
    applyInventoryRarityFilterChange();
}
function renderRarityFilterChips(scope) {
    let f = getInventoryRarityFilter();
    let labels = getInventoryRarityFilterLabels();
    let stop = scope === 'picker' ? 'event.stopPropagation(); ' : '';
    let allOn = isAllInventoryRarityFilterOn();
    let allChip = `<button type="button" class="rarity-filter-chip rarity-all${allOn ? ' active' : ''}" aria-pressed="${allOn}" onclick="${stop}toggleAllInventoryRarityFilter()">전체</button>`;
    let chips = getInventoryRarityFilterKeys().map(key => {
        let active = !!f[key];
        return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? ' active' : ''}" aria-pressed="${active}" onclick="${stop}toggleInventoryRarityFilter('${key}')">${labels[key]}</button>`;
    }).join('');
    return allChip + chips;
}

/* ── Auto-salvage config (independent from the view filter) ──────────── */
function getAutoSalvageRarities() {
    game.settings = game.settings || {};
    let f = game.settings.autoSalvageRarities;
    if (!f || typeof f !== 'object') f = game.settings.autoSalvageRarities = { normal: true, magic: true, rare: false, unique: false };
    getInventoryRarityFilterKeys().forEach(r => { if (typeof f[r] !== 'boolean') f[r] = false; });
    return f;
}
function toggleAutoSalvageRarity(rarity) {
    if (!getInventoryRarityFilterKeys().includes(rarity)) return;
    let f = getAutoSalvageRarities();
    f[rarity] = !f[rarity];
    refreshAutoSalvageConfigOverlay();
    if (typeof syncSalvageControlsFromSettings === 'function') syncSalvageControlsFromSettings();
    if (typeof queueImportantSave === 'function') queueImportantSave(400);
}
function renderAutoSalvageRarityChips() {
    let f = getAutoSalvageRarities();
    let labels = getInventoryRarityFilterLabels();
    return getInventoryRarityFilterKeys().map(key => {
        let active = !!f[key];
        return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? ' active' : ''}" aria-pressed="${active}" onclick="toggleAutoSalvageRarity('${key}')">${labels[key]}</button>`;
    }).join('');
}
function renderAutoSalvageConfigPanel() {
    let enabled = !!game.settings.autoSalvageEnabled;
    return `<div class="craft-picker-panel" style="width:min(460px,100%);">
        <div class="craft-picker-head"><div><div class="craft-picker-title">⚙️ 자동해체 설정</div><div class="craft-picker-desc">획득 시 선택한 등급을 자동으로 해체합니다.<br>인벤토리 표시 필터와는 별개로 동작합니다.</div></div><button type="button" onclick="closeAutoSalvageConfigOverlay()">닫기</button></div>
        <div class="craft-picker-filter" style="border-bottom:none; margin-bottom:10px; padding-bottom:0;"><span class="inventory-view-filter-label">대상 등급</span><span id="auto-salvage-rarity-chips" style="display:flex; gap:6px; flex-wrap:wrap;">${renderAutoSalvageRarityChips()}</span></div>
        <div style="display:flex; gap:10px; align-items:center;">
            <button type="button" id="auto-salvage-toggle-btn" class="bulk-salvage-action" onclick="toggleAutoSalvage(); refreshAutoSalvageConfigOverlay();">${enabled ? '자동해체 끄기' : '자동해체 켜기'}</button>
            <span id="auto-salvage-status" style="font-weight:700; color:${enabled ? '#2ecc71' : '#9fb4d1'};">현재: ${enabled ? 'ON' : 'OFF'}</span>
        </div>
    </div>`;
}
function refreshAutoSalvageConfigOverlay() {
    let overlay = document.getElementById('auto-salvage-config-overlay');
    if (!overlay) return;
    let chipHost = overlay.querySelector('#auto-salvage-rarity-chips');
    if (chipHost) chipHost.innerHTML = renderAutoSalvageRarityChips();
    let enabled = !!game.settings.autoSalvageEnabled;
    let toggleBtn = overlay.querySelector('#auto-salvage-toggle-btn');
    if (toggleBtn) toggleBtn.innerText = enabled ? '자동해체 끄기' : '자동해체 켜기';
    let statusEl = overlay.querySelector('#auto-salvage-status');
    if (statusEl) { statusEl.innerText = `현재: ${enabled ? 'ON' : 'OFF'}`; statusEl.style.color = enabled ? '#2ecc71' : '#9fb4d1'; }
}
function closeAutoSalvageConfigOverlay() {
    let overlay = document.getElementById('auto-salvage-config-overlay');
    if (overlay) overlay.remove();
}
function openAutoSalvageConfigOverlay() {
    closeAutoSalvageConfigOverlay();
    let overlay = document.createElement('div');
    overlay.id = 'auto-salvage-config-overlay';
    overlay.className = 'craft-picker-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeAutoSalvageConfigOverlay(); };
    overlay.innerHTML = renderAutoSalvageConfigPanel();
    document.body.appendChild(overlay);
}

function resetSearchFilter(key) { updateSearchFilter(key, ''); }
function updateSearchFilter(key, value) {
    const d = getSearchFilterState();
    d[key] = String(value || '');
    let cursor = null;
    let active = document.activeElement;
    let activeTabId = null;
    if (active && active.tagName === 'INPUT' && active.dataset && active.dataset.searchKey === key) {
        let pos = Number(active.selectionStart);
        cursor = Number.isFinite(pos) ? pos : String(value || '').length;
        let activeTab = active.closest('.tab-content.active');
        activeTabId = activeTab ? activeTab.id : null;
    }
    if (typeof updateStaticUI === 'function') updateStaticUI();
    if (cursor !== null) {
        let scope = activeTabId ? document.getElementById(activeTabId) : null;
        let next = scope ? scope.querySelector(`input[data-search-key="${key}"]`) : document.querySelector(`input[data-search-key="${key}"]`);
        if (next) {
            next.focus();
            let len = next.value.length;
            let pos = Math.max(0, Math.min(cursor, len));
            next.setSelectionRange(pos, pos);
        }
    }
}
function matchSearchQuery(raw, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const text = String(raw || '').toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(tok => text.includes(tok));
}
function shouldBulkSalvageBySearch(isMatched, salvageUnmatched) { return salvageUnmatched ? !isMatched : isMatched; }
async function bulkSalvageEquipBySearch(salvageUnmatched) {
    if (!assertBuildEditable()) return;
    const sf = getSearchFilterState();
    const survivors = [];
    let removed = 0, lockedSkipped = 0;
    const targetItems = (game.inventory || []).filter(item => {
        if (!item) return false;
        const underEnchantHay = item.underEnchant ? `${item.underEnchant.id || ''} ${item.underEnchant.statName || getStatName(item.underEnchant.id || '') || ''} ${item.underEnchant.val || ''}` : '';
        const hay = `${item.name || ''} ${item.slot || ''} ${item.rarity || ''} ${(item.baseStats||[]).map(s => `${s&&s.id||''} ${s&&s.statName||''}`).join(' ')} ${(item.stats || []).map(s2 => `${s2&&s2.id||''} ${s2&&s2.statName||getStatName((s2&&s2.id)||'')||''}`).join(' ')} ${underEnchantHay}`;
        const matched = matchSearchQuery(hay, sf.equip);
        return shouldBulkSalvageBySearch(matched, !!salvageUnmatched) && !item.locked;
    });
    const targetCount = targetItems.length;
    if (targetCount <= 0) return addLog('해체 대상이 없습니다.', 'attack-monster');
    if (!await requestGameConfirmation(`검색 조건에 해당하는 장비 ${targetCount}개를 해체합니다.\n잠긴 장비는 보호됩니다.`, {
        title: '검색 장비 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targetCount}개 해체`
    })) return;
    const targetSet = new Set(targetItems);
    let rewards = {};
    (game.inventory || []).forEach(item => {
        if (!item) return;
        if (!targetSet.has(item)) return survivors.push(item);
        if (item.locked) { lockedSkipped++; return survivors.push(item); }
        if (typeof mergeSalvageRewards === 'function') mergeSalvageRewards(rewards, salvageItemObject(item, true));
        else salvageItemObject(item, true);
        removed++;
    });
    game.inventory = survivors;
    let rewardText = typeof formatSalvageRewardSummary === 'function' ? ` · ${formatSalvageRewardSummary(rewards)}` : '';
    addLog(`🧪 장비 ${removed}개 해체 완료${rewardText}${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}
async function bulkSalvageJewelsBySearch(salvageUnmatched) {
    if (!assertBuildEditable()) return;
    const sf = getSearchFilterState();
    const targets = [];
    let lockedSkipped = 0;
    for (let i = (game.jewelInventory || []).length - 1; i >= 0; i--) {
        const jewel = game.jewelInventory[i] || {};
        const statText = getJewelStats(jewel).map(stat => `${getStatName(stat.id)} ${stat.id} ${stat.val}`).join(' ');
        const matched = matchSearchQuery(`${jewel.name || ''} ${jewel.rarity || ''} ${statText}`, sf.jewel);
        if (!shouldBulkSalvageBySearch(matched, !!salvageUnmatched)) continue;
        if (jewel.locked) { lockedSkipped++; continue; }
        targets.push(jewel);
    }
    if (targets.length <= 0) return addLog(`해체 대상 주얼이 없습니다.${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'attack-monster');
    if (!await requestGameConfirmation(`검색 조건에 해당하는 주얼 ${targets.length}개를 해체합니다.\n잠긴 주얼은 보호됩니다.`, {
        title: '검색 주얼 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targets.length}개 해체`
    })) return;
    let removed = 0;
    let shardGain = 0;
    const targetSet = new Set(targets);
    game.jewelInventory = (game.jewelInventory || []).filter(jewel => {
        if (!targetSet.has(jewel)) return true;
        if (jewel.locked) { lockedSkipped++; return true; }
        shardGain += salvageJewelObject(jewel, true);
        removed++;
        return false;
    });
    jewelFusionSelection = [];
    addLog(`💠 주얼 ${removed}개 해체 · 주얼 결정 +${shardGain}${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal'); updateStaticUI();
}
function bulkSalvageTalismansBySearch(salvageUnmatched) {
    if (!assertBuildEditable()) return;
    const sf = getSearchFilterState();
    const targets = [];
    let lockedSkipped = 0;
    (game.talismanInventory || []).forEach(t => {
        const stats = (Array.isArray(t.stats) ? t.stats.map(s => `${s.stat || s.id || ''} ${s.label || ''} ${getStatName(s.stat || s.id || '')}`).join(' ') : '');
        const matched = matchSearchQuery(`${t.name || ''} ${t.shape || ''} ${t.rarity || ''} ${t.statName || ''} ${stats}`, sf.talisman);
        if (!shouldBulkSalvageBySearch(matched, !!salvageUnmatched)) return;
        if (isLockedInventoryObject(t)) { lockedSkipped++; return; }
        targets.push(t);
    });
    if (targets.length <= 0) return addLog(`해체 대상 부적이 없습니다.${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'attack-monster');
    let targetLabel = salvageUnmatched ? '미검색 항목' : '검색 항목';
    openTalismanDismantleOverlay(targets.map(t => t.id), `${targetLabel} 부적 해체`, `${targetLabel}에 해당하는 부적만 해체합니다.${lockedSkipped > 0 ? ` 잠금 ${lockedSkipped}개는 보호됩니다.` : ''}`, `${targetLabel} 부적 해체`);
}

function getStyledOrbName(orbKey) {
    let name = (ORB_DB[orbKey] && ORB_DB[orbKey].name) ? ORB_DB[orbKey].name : String(orbKey || '');
    if (orbKey === 'transmute' || orbKey === 'augment' || orbKey === 'alteration') return `<span style="color:#9fd3ff;">${name}</span>`;
    if (orbKey === 'alchemy' || orbKey === 'regal' || orbKey === 'scour' || orbKey === 'blessing') return `<span style="color:#ffe07a;">${name}</span>`;
    if (orbKey === 'chaos' || orbKey === 'exalted') return `<span style="color:#ffbc8a;">${name}</span>`;
    if (orbKey === 'divine') return `<span style="color:#ffffff; border:1px solid #7a1f1f; border-radius:4px; padding:0 4px; background:#0f1116;">${name}</span>`;
    if (orbKey === 'woodsmanTouch') return `<span class="woodsman-touch-name">${name}</span>`;
    if (orbKey === 'tainted') return `<span style="color:#8a2f3f;">${name}</span>`;
    return name;
}

function getJewelComparisonTotals(jewel, multiplier) {
    let totals = {};
    let scale = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
    getJewelStats(jewel).forEach(stat => {
        if (!stat || !stat.id) return;
        totals[stat.id] = (totals[stat.id] || 0) + (Number(stat.val) || 0) * scale;
    });
    return totals;
}

function createJewelSlotComparisonHtml(candidate) {
    if (!candidate) return '';
    let maxSlots = typeof getMaxJewelSlotCount === 'function' ? getMaxJewelSlotCount() : 2;
    let slots = Array.isArray(game.jewelSlots) ? game.jewelSlots : [];
    let amplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [];
    let rows = Array.from({ length: maxSlots }, (_, slotIndex) => {
        let current = slots[slotIndex] || null;
        let multiplier = 1 + (Math.max(0, Math.floor(Number(amplify[slotIndex]) || 0)) * 0.03);
        let nextTotals = getJewelComparisonTotals(candidate, multiplier);
        let currentTotals = getJewelComparisonTotals(current, multiplier);
        let statIds = Array.from(new Set(Object.keys(nextTotals).concat(Object.keys(currentTotals))));
        let deltas = statIds.map(statId => ({
            statId,
            value: (nextTotals[statId] || 0) - (currentTotals[statId] || 0)
        })).filter(row => Math.abs(row.value) > 0.0001);
        deltas.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
        let deltaHtml = deltas.slice(0, 5).map(row => {
            let positive = row.value > 0;
            let sign = positive ? '+' : '-';
            let value = formatJewelStatValue(row.statId, Math.abs(row.value));
            return `<span style="color:${positive ? '#8fe7b0' : '#ff9a9a'};">${escapeHTML(getStatName(row.statId))} ${sign}${value}</span>`;
        }).join(' · ');
        if (deltas.length > 5) deltaHtml += ` <span style="color:#8fa7c3;">외 ${deltas.length - 5}개</span>`;
        let uniqueChange = '';
        if ((current && current.uniqueId) !== candidate.uniqueId || (current && current.uniqueEffect) !== candidate.uniqueEffect) {
            if (candidate.uniqueEffect) uniqueChange = `<div style="color:#d7b8ff;">획득: ${escapeHTML(candidate.uniqueEffect)}</div>`;
            if (current && current.uniqueEffect) uniqueChange += `<div style="color:#c98f9f;">상실: ${escapeHTML(current.uniqueEffect)}</div>`;
        }
        let currentName = current ? escapeHTML(current.name || '주얼') : '빈 슬롯';
        return `<div class="tooltip-line" style="border-top:1px solid rgba(120,150,190,.22);padding-top:5px;margin-top:5px;"><strong>슬롯 ${slotIndex + 1}</strong> · ${currentName}<div style="margin-top:2px;">${deltaHtml || '<span style="color:#9fb4d1;">수치 변화 없음</span>'}</div>${uniqueChange}</div>`;
    }).join('');
    return `<div class="tooltip-line" style="color:#9fd6ff;font-weight:800;margin-top:7px;">장착 시 슬롯별 변화</div>${rows}`;
}

const createJewelRangeTooltipHtml = function createJewelRangeTooltipHtml(jewel, options) {
    if (!jewel) return '<div class="tooltip-title">주얼</div><div class="tooltip-line">정보 없음</div>';
    let opts = options || {};
    let stats = getJewelStats(jewel);
    let coreStats = stats.filter(stat => !isJewelPetiteStat(stat));
    let tierSummary = jewel.rarity !== 'unique' && coreStats.length > 0
        ? coreStats.reduce((sum, stat) => sum + Math.max(1, Math.floor(Number(stat.tier) || 1)), 0) / coreStats.length
        : null;
    let lines = stats.map(stat => {
        let min = (stat.valMin !== undefined && stat.valMin !== null) ? formatJewelStatValue(stat.id, stat.valMin) : formatJewelStatValue(stat.id, stat.val);
        let max = (stat.valMax !== undefined && stat.valMax !== null) ? formatJewelStatValue(stat.id, stat.valMax) : formatJewelStatValue(stat.id, stat.val);
        let petite = isJewelPetiteStat(stat);
        let tier = Number.isFinite(Number(stat.tier)) && !petite ? ` <span style="color:#ffd68a;">T${Math.floor(stat.tier)}</span>` : '';
        let petiteLabel = petite ? '<span style="color:#b6d7ff;">쁘띠 </span>' : '';
        let waxLabel = stat.waxBonus ? '<span style="color:#ffd98a;">밀랍 </span>' : '';
        let expireText = petite ? ' · 융합 시 소멸' : '';
        let tone = getJewelStatToneColor(stat.id);
        return `<div class="tooltip-line"><span style="color:${tone};">${waxLabel}${petiteLabel}${getStatName(stat.id)}: +${formatJewelStatValue(stat.id, stat.val)}${tier}</span> <span style="color:#9fb4d1;">(고정 범위 ${min}~${max}${expireText})</span></div>`;
    }).join('');
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:#9fb4d1;">옵션 평균 티어: T${tierSummary.toFixed(1)}</div>` : '';
    let fixedTierLine = jewel.rarity === 'unique' ? `<div class="tooltip-line" style="color:#bca7dc;">고유 고정 옵션 · 티어 평가 제외</div>` : '';
    let uniqueLine = jewel.rarity === 'unique' && jewel.uniqueEffect ? `<div class="tooltip-line" style="color:#d7b8ff;">✨ 고유 효과: ${escapeHTML(jewel.uniqueEffect)}</div>` : '';
    let keystoneLine = '';
    if (jewel.cosmosKeystoneJewel && jewel.cosmosKeystone) {
        let ksName = typeof getAscendKeystoneName === 'function' ? getAscendKeystoneName(jewel.cosmosKeystone) : jewel.cosmosKeystone;
        let active = Array.isArray(game.cosmosTwinKeystones) && game.cosmosTwinKeystones.includes(jewel.cosmosKeystone);
        keystoneLine = `<div class="tooltip-line" style="color:${active ? '#8fe7b0' : '#ffd68a'};">🔯 배정 키스톤: ${escapeHTML(ksName)}${active ? ' (할당 중)' : ' · 쌍둥이 주얼과 일치 시 할당'}</div>`;
    }
    let voidChargesLine = '';
    if (jewel.uniqueId === 'uj_void') {
        let charges = Math.max(0, Math.floor(Number(jewel.voidFusionCharges) || 0));
        let blocked = charges <= 0 ? ' · 합성/공허융합 불가' : '';
        voidChargesLine = `<div class="tooltip-line" style="color:${charges <= 0 ? '#ff8a8a' : '#d7b8ff'};">공허 합성 가능 수: ${charges}회 남음${blocked}</div>`;
    }
    let comparison = opts.showSlotComparison ? createJewelSlotComparisonHtml(jewel) : '';
    return `<div class="tooltip-title">${escapeHTML(jewel.name || '주얼')}</div>${uniqueLine}${keystoneLine}${voidChargesLine}${fixedTierLine}${tierLine}${lines || '<div class="tooltip-line">옵션 정보 없음</div>'}${comparison}`;
};


function showSocketedJewelTooltip(event, socketType, socketIdx) {
    let jewel = null;
    let idx = Math.max(0, Math.floor(Number(socketIdx) || 0));
    if (socketType === 'slot') {
        jewel = (game.jewelSlots || [])[idx];
    } else if (socketType === 'inventory') {
        jewel = (game.jewelInventory || [])[idx];
    } else if (socketType === 'void') {
        let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
        if (!item) return hideInfoTooltip();
        jewel = item.voidSocket && item.voidSocket.jewel ? item.voidSocket.jewel : null;
    } else if (socketType === 'abyss') {
        let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
        if (!item) return hideInfoTooltip();
        let sockets = Array.isArray(item.abyssSockets) ? item.abyssSockets : [];
        jewel = sockets[idx] && sockets[idx].jewel ? sockets[idx].jewel : null;
    }
    if (!jewel) return hideInfoTooltip();
    let html = createJewelRangeTooltipHtml(jewel, { showSlotComparison: socketType === 'inventory' });
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}


function getCraftActionValidators(item) {
    let hasHoneyLocked = (item.stats || []).some(v => v.lockedByHoney);
    return {
        honey: !!item && (game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
        stinger: !!item && (game.currencies.venomStinger || 0) > 0 && item.slot === '무기',
        baseUpgrade: !!item,
        voidSocket: !!item && (typeof isVoidSocketAccessoryItem === 'function' ? isVoidSocketAccessoryItem(item) : (String(item.slot || '').replace(/[12]$/, '') === '반지' || String(item.slot || '').replace(/[12]$/, '') === '목걸이'))
    };
}



function getCraftOrbUseState(key, item) {
    if (!item) return { enabled: false, reason: '아이템 미선택' };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '재화 부족' };
    if (item.corrupted && key !== 'tainted') return { enabled: false, reason: '타락 아이템은 일반 제작 불가' };
    if (item.fusedRelic && !['divine', 'tainted', 'blessing'].includes(key)) return { enabled: false, reason: '융합 유물: 신성한/타락/축복만 사용 가능' };
    let ok = false;
    if (key === 'transmute') ok = item.rarity === 'normal';
    else if (key === 'augment') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 2;
    else if (key === 'alteration') ok = item.rarity === 'magic';
    else if (key === 'alchemy') ok = item.rarity === 'normal';
    else if (key === 'exalted') ok = item.rarity === 'rare' && getItemExplicitOptionCount(item) < 6;
    else if (key === 'regal') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 6;
    else if (key === 'chaos') ok = item.rarity === 'rare';
    else if (key === 'divine') ok = item.rarity !== 'normal';
    else if (key === 'chance') ok = item.rarity === 'normal';
    else if (key === 'annulment') ok = Array.isArray(item.stats) && item.stats.some(stat => stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
    else if (key === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (key === 'tainted') ok = !item.corrupted || (typeof isKaleidoscopeShieldItem === 'function' && isKaleidoscopeShieldItem(item) && getItemExplicitOptionCount(item) <= 6);
    else if (key === 'blessing') ok = Array.isArray(item.baseStats) && item.baseStats.length > 0;
    else if (key === 'abyssCatalyst') ok = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
    if (!ok) return { enabled: false, reason: '현재 아이템 조건 불일치' };
    let sporeMode = game.sporeCraftModes && game.sporeCraftModes[key] || 'none';
    if (['transmute','augment','alteration','alchemy','exalted','regal','chaos'].includes(key)
        && sporeMode !== 'none'
        && typeof hasSporeCraftCost === 'function'
        && !hasSporeCraftCost(sporeMode)) {
        let cost = typeof getSporeCraftCost === 'function' ? getSporeCraftCost() : 10;
        let costText = (sporeMode === 'chaos' || sporeMode === 'damage')
            ? `화염·냉기·번개 홀씨 각 ${cost}개 필요`
            : `${({ fire: '화염', cold: '냉기', light: '번개' })[sporeMode] || '선택'} 홀씨 ${cost}개 필요`;
        return { enabled: false, reason: `홀씨 부족 · ${costText}` };
    }
    return { enabled: ok, reason: ok ? '사용 가능' : '현재 아이템 조건 불일치' };
}

function renderFlaskChargeMeter(charges, maxCharges, progress, chargeNeed) {
    let current = Math.max(0, Math.floor(Number(charges) || 0));
    let max = Math.max(1, Math.floor(Number(maxCharges) || 1));
    let need = Math.max(1, Math.floor(Number(chargeNeed) || 1));
    let value = current >= max ? need : Math.max(0, Math.min(need, Math.floor(Number(progress) || 0)));
    let pct = current >= max ? 100 : Math.max(0, Math.min(100, value / need * 100));
    let label = current >= max ? '충전 완료' : `다음 충전 ${value}/${need} 처치`;
    return `<div class="flask-charge-row"><span>${label}</span><span>${current}/${max}회</span></div>
        <div class="flask-charge-meter" aria-label="${label}"><span style="width:${pct.toFixed(1)}%"></span></div>`;
}

// 플라스크 패널: 충전 상태 표시 + 발견한 플라스크 중 교체.
function renderFlaskPanel() {
    let host = document.getElementById('ui-flask-panel');
    if (!host || typeof ensureFlaskState !== 'function' || typeof FLASK_HEAL_TIERS === 'undefined') return;
    let st = ensureFlaskState();
    let now = Date.now();
    let found = typeof ensureFlaskFoundKeys === 'function' ? ensureFlaskFoundKeys() : (st.foundKeys || []);
    let healDef = getFlaskHealDef(st.healTier);
    let healActive = (st.healOverTimeUntil || 0) > now;
    // 유틸리티 슬롯 표시(개수는 장착한 허리띠가 결정 — getMaxFlaskUtilitySlotCount). 선택은 오버레이.
    let maxUtilSlots = typeof getMaxFlaskUtilitySlotCount === 'function' ? getMaxFlaskUtilitySlotCount() : 0;
    let utilSlots = Array.from({ length: maxUtilSlots }, (_, idx) => {
        let cur = st.utils[idx];
        let def = cur ? FLASK_UTILITY_POOL[cur.key] : null;
        let active = cur && (cur.until || 0) > now;
        let status = cur ? `${active ? `발동 중 · ${Math.ceil((cur.until - now) / 1000)}초` : '대기 중'}` : '비어 있음';
        let triggerLabel = cur && typeof getUtilityFlaskTriggerLabel === 'function' ? getUtilityFlaskTriggerLabel(cur.trigger) : '전투 시작';
        return `<div class="flask-slot-box utility ${active ? 'active' : ''}">
            <div class="flask-slot-label">유틸리티 ${idx + 1}</div>
            <div class="flask-slot-name">${def ? def.name : '빈 플라스크 슬롯'}</div>
            <div class="flask-slot-status">${status}</div>
            ${def ? `<div class="flask-slot-effect">${def.desc}</div>${renderFlaskChargeMeter(cur.charges, def.maxCharges, cur.chargeProgress, getFlaskEffectiveChargesPerKills(def.chargesPerKills))}` : ''}
            <div class="flask-slot-actions">
                <button type="button" class="flask-slot-select" onclick="openFlaskPickerOverlay('utility', ${idx})" title="${def ? def.desc : '유틸리티 플라스크 선택'}">변경</button>
                <button type="button" class="flask-trigger-select" onclick="cycleUtilityFlaskTrigger(${idx})" ${cur ? '' : 'disabled'}>자동: ${triggerLabel}</button>
            </div>
        </div>`;
    }).join('');
    let beltHint = maxUtilSlots <= 0
        ? `<div class="flask-slot-box utility empty-hint"><div class="flask-slot-label">유틸리티</div><div class="flask-slot-name" style="color:#7f8c8d;">허리띠 필요</div><div class="flask-slot-status">플라스크 슬롯 옵션이 있는 허리띠를 장착하면 유틸리티 슬롯이 열립니다.</div></div>`
        : '';
    let undiscoveredCount = FLASK_HEAL_TIERS.filter(t => !found.includes(t.key)).length + Object.keys(FLASK_UTILITY_POOL).filter(key => !found.includes(key)).length;
    let totalFlasks = FLASK_HEAL_TIERS.length + Object.keys(FLASK_UTILITY_POOL).length;
    let activeSlots = 1 + st.utils.slice(0, maxUtilSlots).filter(u => u && FLASK_UTILITY_POOL[u.key]).length;
    let chargeRateBonus = typeof getFlaskChargeRateBonusPct === 'function' ? Math.max(0, Math.floor(getFlaskChargeRateBonusPct())) : 0;
    let craftCandidates = typeof getFlaskDiscoveryCandidates === 'function' ? getFlaskDiscoveryCandidates(game.level, found) : [];
    let craftCards = craftCandidates.map(key => {
        let def = FLASK_DB[key];
        let cost = typeof getFlaskCraftCost === 'function' ? getFlaskCraftCost(key) : 0;
        let affordable = st.alchemyGlass >= cost;
        return `<div class="flask-craft-card"><div><span>${def.kind === 'heal' ? '회복' : '유틸리티'} · ${def.tier}단계</span><strong>${escapeHTML(def.name)}</strong><small>${escapeHTML(def.desc || `최대 생명력의 ${def.healPct}% 회복`)}</small></div><button type="button" onclick="craftFlask('${key}')" ${affordable ? '' : 'disabled'}>${affordable ? '제작' : '재료 부족'} · ${cost}</button></div>`;
    }).join('');
    host.innerHTML = `<div class="flask-overview">
        <div><span>발견</span><strong>${found.length}/${totalFlasks}</strong></div>
        <div><span>장착</span><strong>${activeSlots}/${1 + maxUtilSlots}</strong></div>
        <div><span>충전 속도</span><strong>${chargeRateBonus > 0 ? `+${chargeRateBonus}%` : '기본'}</strong></div>
    </div><div class="flask-paperdoll">
        <div class="flask-slot-box heal ${healActive ? 'active' : ''}">
            <div class="flask-slot-label">회복</div>
            <div class="flask-slot-name">${healDef.name}</div>
            <div class="flask-slot-status">${healActive ? `회복 중 · ${Math.ceil((st.healOverTimeUntil - now) / 1000)}초` : `생명력 ${healDef.autoBelowHpPct}% 이하 자동 사용`}</div>
            <div class="flask-slot-effect">최대 생명력의 ${healDef.healPct}%를 ${Math.round(healDef.durationMs / 1000)}초에 걸쳐 회복</div>
            ${renderFlaskChargeMeter(st.healCharges, healDef.maxCharges, st.healChargeProgress, getFlaskEffectiveChargesPerKills(healDef.chargesPerKills))}
            <button type="button" class="flask-slot-select" onclick="openFlaskPickerOverlay('heal')">변경</button>
        </div>
        ${utilSlots}${beltHint}
    </div>
    <section class="flask-workbench"><div class="flask-workbench-head"><div><span>ALCHEMY BENCH</span><strong>플라스크 제작</strong><small>처치로 모은 연금 유리로 각 계열의 다음 단계를 확정 제작합니다.</small></div><div class="flask-glass-balance"><span>연금 유리</span><b>${st.alchemyGlass}</b></div></div><div class="flask-craft-grid">${craftCards || '<div class="gem-process-empty">현재 레벨에서 제작 가능한 다음 단계가 없습니다.</div>'}</div></section>
    <div class="flask-help-text"><strong>운용 안내</strong> 낮은 단계는 전투에서 비교적 쉽게 발견되지만 높은 단계일수록 드랍 확률이 낮아집니다. 제작은 무작위 발견을 보완하며, 같은 계열은 앞 단계부터 순서대로 진행합니다(미발견 ${undiscoveredCount}종).</div>`;
}

// 플라스크 선택 오버레이: 스크롤 드롭다운 대신 카드 그리드로 고른다. 발견하지 못했거나
// 레벨 미달인 플라스크, 다른 슬롯에 이미 장착된 같은 종류의 유틸리티 플라스크는
// 비활성(disabled) 처리되어 선택할 수 없다 — 오직 발견한 플라스크만 활성화된다.
function openFlaskPickerOverlay(kind, slotIndex) {
    if (typeof ensureFlaskState !== 'function') return;
    let st = ensureFlaskState();
    let lvl = Math.max(1, Math.floor(game.level || 1));
    let found = typeof ensureFlaskFoundKeys === 'function' ? ensureFlaskFoundKeys() : (st.foundKeys || []);
    let maxUtilSlots = typeof getMaxFlaskUtilitySlotCount === 'function' ? getMaxFlaskUtilitySlotCount() : 0;
    let idx = Math.max(0, Math.min(Math.max(0, maxUtilSlots - 1), Math.floor(slotIndex || 0)));
    let old = document.getElementById('flask-picker-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    let overlay = document.createElement('div');
    overlay.id = 'flask-picker-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(5,8,14,0.74); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    let panel = document.createElement('div');
    panel.style.cssText = 'width:min(560px, 94vw); max-height:86vh; overflow-y:auto; border:1px solid #405a8f; border-radius:12px; background:linear-gradient(160deg, #182544, #0f1629); padding:14px; box-shadow:0 12px 28px rgba(0,0,0,0.45);';

    let title = kind === 'heal' ? '🧪 회복 플라스크 선택' : `🧪 유틸리티 플라스크 선택 (슬롯 ${idx + 1})`;
    let header = document.createElement('div');
    header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;';
    header.innerHTML = `<div style="font-size:17px; font-weight:700; color:#e5efff;">${title}</div><button type="button" id="flask-picker-close" style="background:#22365e; color:#d6e4ff; border:1px solid #4669a9; border-radius:8px; padding:4px 9px; cursor:pointer;">닫기</button>`;
    panel.appendChild(header);
    panel.insertAdjacentHTML('beforeend', `<div style="color:#9fb4d1; font-size:12.5px; margin-bottom:10px;">발견한 플라스크만 선택할 수 있습니다. 잠긴 카드는 전투 중 처치로 발견해야 합니다.</div>`);

    function makeOptionButton(opts) {
        let btn = document.createElement('button');
        btn.type = 'button';
        btn.disabled = opts.locked;
        let borderColor = opts.selected ? '#89a7ff' : '#3f547f';
        let bgColor = opts.selected ? '#304f91' : '#1d2e4f';
        let textColor = opts.locked ? '#5d6d86' : (opts.selected ? '#ffffff' : '#d6e3ff');
        btn.style.cssText = `text-align:left; padding:10px; border-radius:9px; border:1px solid ${borderColor}; background:${opts.locked ? '#141d2c' : bgColor}; color:${textColor}; cursor:${opts.locked ? 'not-allowed' : 'pointer'}; font-weight:700;`;
        let subColor = opts.locked ? '#5d6d86' : '#b7c6df';
        btn.innerHTML = `${opts.name}${opts.selected ? ' ✓' : ''}<br><span style="font-weight:400; font-size:0.78em; color:${subColor};">${opts.desc}${opts.lockLabel ? ` · ${opts.lockLabel}` : ''}</span>`;
        if (!opts.locked) btn.onclick = () => { opts.onSelect(); overlay.remove(); };
        return btn;
    }

    let body = document.createElement('div');
    if (kind === 'heal') {
        let grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px;';
        FLASK_HEAL_TIERS.forEach(t => {
            let levelLocked = lvl < t.reqLevel;
            let undiscovered = !levelLocked && !found.includes(t.key);
            grid.appendChild(makeOptionButton({
                name: t.name,
                desc: `총 ${t.healPct}% / ${Math.round(t.durationMs / 1000)}초 · ${t.maxCharges}회 · 충전 ${getFlaskEffectiveChargesPerKills(t.chargesPerKills)}처치`,
                locked: levelLocked || undiscovered,
                lockLabel: levelLocked ? `Lv.${t.reqLevel} 필요` : (undiscovered ? '미발견' : ''),
                selected: st.healTier === t.key,
                onSelect: () => selectHealFlaskTier(t.key)
            }));
        });
        body.appendChild(grid);
    } else {
        FLASK_UTILITY_CATEGORIES.forEach(cat => {
            body.insertAdjacentHTML('beforeend', `<div style="color:#9fb4d1; font-size:0.86em; font-weight:700; margin:10px 0 6px;">${cat.label}</div>`);
            let grid = document.createElement('div');
            grid.style.cssText = 'display:grid; grid-template-columns:repeat(2, minmax(0,1fr)); gap:8px;';
            FLASK_UTILITY_TIER_REQ_LEVELS.forEach((reqLevel, tierIdx) => {
                let key = `${cat.category}${tierIdx + 1}`;
                let def = FLASK_UTILITY_POOL[key];
                let usedElsewhere = st.utils.some((u, i) => i < maxUtilSlots && u && FLASK_UTILITY_POOL[u.key] && FLASK_UTILITY_POOL[u.key].category === cat.category && i !== idx);
                let levelLocked = lvl < reqLevel;
                let undiscovered = !levelLocked && !found.includes(key);
                grid.appendChild(makeOptionButton({
                    name: def.name,
                    desc: `${def.desc} · ${def.maxCharges}회 · 충전 ${getFlaskEffectiveChargesPerKills(def.chargesPerKills)}처치`,
                    locked: usedElsewhere || levelLocked || undiscovered,
                    lockLabel: levelLocked ? `Lv.${reqLevel} 필요` : (undiscovered ? '미발견' : (usedElsewhere ? '다른 슬롯 장착 중' : '')),
                    selected: !!(st.utils[idx] && st.utils[idx].key === key),
                    onSelect: () => equipUtilityFlask(idx, key)
                }));
            });
            body.appendChild(grid);
        });
    }
    panel.appendChild(body);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    let closeBtn = panel.querySelector('#flask-picker-close');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();
}
window.openFlaskPickerOverlay = openFlaskPickerOverlay;

// 시간의 균열 패널: 시간압 선택 → 과거 진입 → 제단 배치 → 미래 진입.
function renderTimeRiftPanel() {
    let host = document.getElementById('ui-timerift-panel');
    let header = document.getElementById('ui-timerift-header');
    if (!host) return;
    if (header) header.style.display = 'block';
    host.style.display = 'block';
    let rift = ensureTimeRiftState();
    let odds = getTimeRiftFusionOdds(rift.pressure);
    let pct = v => `${Math.round(v * 100)}%`;
    let altarFull = !!(rift.altarUnique && rift.altarRare);
    let altarLine = slotItem => slotItem ? `<strong>${slotItem.name}</strong> <span style="color:#9fb4d1;">[${slotItem.slot}]</span>` : '<span style="color:#7f8c8d;">비어 있음</span>';
    let selected = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
    let selectedLine = selected ? `선택됨: [${selected.slot}] ${selected.name} (${selected.rarity})` : '인벤토리에서 아이템을 선택하세요';
    host.innerHTML = `
        <div style="margin-bottom:8px; color:#bfd3ea; font-size:0.85em;">과거를 클리어해 제단을 열고, 같은 부위의 <strong>고유 1개·희귀 1개</strong>를 올린 뒤 미래를 클리어하면 희귀의 추가 옵션을 계승한 <strong>융합 유물</strong>이 됩니다. 융합 유물은 신성한/타락/축복의 오브만 사용할 수 있습니다. 제단은 루프를 건너도 보존됩니다.</div>
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
            <span>시간압</span>
            <button onclick="setTimeRiftPressure(-1)" ${rift.pressure <= 1 ? 'disabled' : ''}>-</button>
            <strong>${rift.pressure}</strong>
            <button onclick="setTimeRiftPressure(1)" ${rift.pressure >= TIME_RIFT_MAX_PRESSURE ? 'disabled' : ''}>+</button>
            <span style="color:#9fb4d1; font-size:0.83em;">완벽 ${pct(odds.perfect)} · 보통 ${pct(odds.normal)} · 불안정 ${pct(odds.unstable)}</span>
        </div>
        <div class="map-grid" style="margin-bottom:8px;">
            <div class="map-item ${game.currentZoneId === TIME_RIFT_PAST_ZONE_ID ? 'current' : ''}" onclick="changeZone('time_rift_past')">
                <div class="map-item-main"><span>⏳</span><span>과거 (제단 개방)</span></div>
                <div class="map-item-actions"><span class="map-zone-status">${rift.altarOpen ? '제단 열림' : '클리어 필요'}</span></div>
            </div>
            <div class="map-item ${game.currentZoneId === TIME_RIFT_FUTURE_ZONE_ID ? 'current' : ''}" onclick="changeZone('time_rift_future')">
                <div class="map-item-main"><span>⌛</span><span>미래 (융합 정산)</span></div>
                <div class="map-item-actions"><span class="map-zone-status">${altarFull ? '융합 준비 완료' : '제단 2자리 필요'}</span></div>
            </div>
        </div>
        <div style="background:#0f1420; border:1px solid #35507a; border-radius:8px; padding:8px;">
            <div style="margin-bottom:4px;">제단 · 고유: ${altarLine(rift.altarUnique)}</div>
            <div style="margin-bottom:6px;">제단 · 희귀: ${altarLine(rift.altarRare)}</div>
            <div style="color:#9fb4d1; font-size:0.8em; margin-bottom:6px;">${selectedLine}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button onclick="placeItemOnTimeAltar()" ${rift.altarOpen ? '' : 'disabled'}>선택 아이템 올리기</button>
                <button onclick="retrieveTimeAltarItems()" ${(rift.altarUnique || rift.altarRare) ? '' : 'disabled'}>제단 회수</button>
            </div>
        </div>`;
}

function renderCraftSelectedSummary(item) {
    let host = document.getElementById('ui-craft-selected-summary');
    if (!host) return;
    if (!item) {
        host.innerHTML = '아이템을 선택하세요.';
        return;
    }
    let statCount = getItemExplicitOptionCount(item);
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    host.innerHTML = `<div><strong>[${getItemSlotDisplayLabel(item)}] ${item.name}${exceptionalStars}</strong> · ${item.rarity.toUpperCase()} · 추가 옵션 ${statCount}/6</div><div style="color:#a9bfd6; font-size:0.83em;">${item.baseName || ''}</div>`;
}


function renderChaosInfuserPanel(selectedItem) {
    let host = document.getElementById('ui-chaos-infuser-panel');
    if (!host) return;
    let unlocked = typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked();
    let infuserBtn = document.getElementById('btn-item-tab-infuser');
    if (infuserBtn) infuserBtn.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) {
        host.innerHTML = '<div style="color:#9fb4d1;">나무꾼을 한 번 이상 마주치면 혼돈 주입기가 영구 해금됩니다.</div>';
        return;
    }
    if (!selectedItem) {
        host.innerHTML = '<div style="color:#9fb4d1;">장착 장비나 인벤토리 아이템을 선택하세요. 혼돈 주입 옵션은 아이템당 한 줄만 유지되며 언제든 교체할 수 있습니다.</div>';
        return;
    }
    let current = selectedItem.chaosInfusion
        ? `<div style="color:#d7a8ff; margin-bottom:8px;">현재 주입: <strong>${selectedItem.chaosInfusion.statName || getStatName(selectedItem.chaosInfusion.id)} +${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.val)}</strong> <span style="color:#9fb4d1;">(${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.valMin)}~${formatValue(selectedItem.chaosInfusion.id, selectedItem.chaosInfusion.valMax)})</span> <button onclick="removeChaosInfusionFromSelectedItem()" ${(game.currencies.scour || 0) > 0 ? '' : 'disabled'}>제거(정화 1)</button></div>`
        : '<div style="color:#7f8c8d; margin-bottom:8px;">현재 주입 옵션 없음</div>';
    let eligibility = typeof isChaosInfusionEligibleItem === 'function' ? isChaosInfusionEligibleItem(selectedItem) : { ok: true, reason: '' };
    let explicitCount = typeof getItemExplicitOptionCount === 'function' ? getItemExplicitOptionCount(selectedItem) : ((selectedItem.stats || []).length + (selectedItem.chaosInfusion ? 1 : 0));
    let options = typeof getChaosInfuserOptionsForItem === 'function' ? getChaosInfuserOptionsForItem(selectedItem) : (Array.isArray(window.CHAOS_INFUSER_OPTIONS) ? window.CHAOS_INFUSER_OPTIONS : []);
    let buttons = eligibility.ok ? options.map(opt => {
        let costs = typeof getChaosInfusionCost === 'function' ? getChaosInfusionCost(opt, selectedItem) : [{ key: opt.currency, amount: opt.cost }];
        let canPay = costs.every(row => (game.currencies[row.key] || 0) >= row.amount);
        let costText = typeof formatCurrencyCosts === 'function' ? formatCurrencyCosts(costs) : `${opt.currency} ${opt.cost}`;
        let key = opt.optionId || opt.id;
        let same = selectedItem.chaosInfusion && (selectedItem.chaosInfusion.sourceOptionId === key || selectedItem.chaosInfusion.id === opt.id);
        let rangeText = `${formatValue(opt.id, opt.min)}~${formatValue(opt.id, opt.max)}`;
        return `<button onclick="applyChaosInfusionToSelectedItem('${key}')" ${canPay && !same ? '' : 'disabled'}>${opt.label || getStatName(opt.id)} +${rangeText}<br><span style="font-size:0.78em;color:#b7c6df;">${same ? '적용 중' : costText}</span></button>`;
    }).join('') : `<div style="grid-column:1/-1; color:#ffb4b4;">${eligibility.reason}</div>`;
    if (eligibility.ok && !buttons) buttons = '<div style="grid-column:1/-1; color:#9fb4d1;">이 부위에 추가할 수 있는 주입 옵션이 없습니다.</div>';
    host.innerHTML = `<div style="margin-bottom:8px;"><strong>[${getItemSlotDisplayLabel(selectedItem)}] ${selectedItem.name}</strong><div style="font-size:0.82em;color:#9fb4d1;">T5급 범위 옵션 한 줄을 추가 옵션으로 부여합니다. 추가 옵션 제한: ${explicitCount}/6. 교체/제거 시 정화의 오브가 추가로 필요합니다.</div></div>${current}<div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px;">${buttons}</div>`;
}

function renderCraftOrbActions(selectedItem) {
    let host = document.getElementById('ui-craft-orb-actions');
    if (!host) return;
    host.innerHTML = '';
}

function openSporeModeOverlay(currencyKey) {
    let allowed = ['transmute','augment','alteration','alchemy','regal','chaos','exalted'];
    if (!allowed.includes(currencyKey)) return;
    let modeOptions = [
        { id: 'none', label: '미사용' },
        { id: 'fire', label: '화염' },
        { id: 'cold', label: '냉기' },
        { id: 'light', label: '번개' },
        { id: 'chaos', label: '카오스', minMyco: 10 },
        { id: 'damage', label: '피해', minMyco: 10 }
    ];
    let mycoLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    modeOptions = modeOptions.filter(opt => !opt.minMyco || mycoLv >= opt.minMyco);
    game.sporeCraftModes = game.sporeCraftModes || {};
    let cur = game.sporeCraftModes[currencyKey] || 'none';
    let sporeCost = typeof getSporeCraftCost === 'function' ? getSporeCraftCost() : 10;
    if (!modeOptions.some(opt => opt.id === cur)) cur = 'none';
    let old = document.getElementById('spore-mode-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    let overlay = document.createElement('div');
    overlay.id = 'spore-mode-overlay';
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(5,8,14,0.74); display:flex; align-items:center; justify-content:center; z-index:9999;';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

    let panel = document.createElement('div');
    panel.style.cssText = 'width:min(560px, 92vw); border:1px solid #405a8f; border-radius:12px; background:linear-gradient(160deg, #182544, #0f1629); padding:14px; box-shadow:0 12px 28px rgba(0,0,0,0.45);';
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><div style="font-size:17px; font-weight:700; color:#e5efff;">홀씨 모드 선택</div><button id="spore-overlay-close" style="background:#22365e; color:#d6e4ff; border:1px solid #4669a9; border-radius:8px; padding:4px 9px; cursor:pointer;">닫기</button></div><div style="color:#9fb4d1; font-size:13px; margin-bottom:10px;">오브 사용 시 적용할 홀씨 태그를 고르세요. 단일 속성은 ${sporeCost}개, 카오스/피해는 세 속성 홀씨를 각각 ${sporeCost}개 사용합니다.${mycoLv >= 10 ? '' : ' 카오스/피해 태그는 균사학자 Lv.10에 해금됩니다.'}</div><div style="color:#b7d9b7;font-size:12px;margin-bottom:10px;">보유: 화염 ${game.currencies.sporeFire || 0} · 냉기 ${game.currencies.sporeCold || 0} · 번개 ${game.currencies.sporeLight || 0}</div>`;

    let buttons = document.createElement('div');
    buttons.style.cssText = 'display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:8px;';
    modeOptions.forEach(opt => {
        let btn = document.createElement('button');
        let selected = cur === opt.id;
        btn.type = 'button';
        btn.textContent = opt.label + (selected ? ' ✓' : '');
        btn.style.cssText = `padding:10px 8px; border-radius:9px; border:1px solid ${selected ? '#89a7ff' : '#3f547f'}; background:${selected ? '#304f91' : '#1d2e4f'}; color:${selected ? '#ffffff' : '#d6e3ff'}; cursor:pointer; font-weight:700;`;
        btn.onclick = () => {
            game.sporeCraftModes[currencyKey] = opt.id;
            updateStaticUI();
            overlay.remove();
        };
        buttons.appendChild(btn);
    });

    panel.appendChild(buttons);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    let closeBtn = panel.querySelector('#spore-overlay-close');
    if (closeBtn) closeBtn.onclick = () => overlay.remove();
}
window.openSporeModeOverlay = openSporeModeOverlay;

function showCurrencyCardTooltip(event, key, reason) {
    let orb = ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title">${orb.name}</div><div class="tooltip-line">${orb.desc || ''}</div><div class="tooltip-line" style="margin-top:6px; color:#9fb4d1;">상태: ${reason || '-'}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#f1c40f');
}
window.showCurrencyCardTooltip = showCurrencyCardTooltip;
window.showOrbTooltip = showCurrencyCardTooltip;


const MOBILE_CRAFT_CURRENCY_KEYS = ['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos', 'divine', 'chance', 'annulment', 'scour', 'tainted', 'blessing', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'enchantedHoney', 'venomStinger', 'voidChisel'];
const MOBILE_CRAFT_ORB_KEYS = ['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos', 'divine', 'chance', 'annulment', 'scour', 'tainted', 'blessing', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst'];

function getMobileCraftCurrencyOptions() {
    return MOBILE_CRAFT_CURRENCY_KEYS.filter(key => {
        if (!ORB_DB[key]) return false;
        if ((game.currencies[key] || 0) <= 0) return false;
        if (key === 'tainted' && (game.season || 1) < 5) return false;
        return true;
    });
}

function getMobileCraftCurrencyUseState(key, item) {
    if (!key || !ORB_DB[key]) return { enabled: false, reason: '재화를 선택하세요.' };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '보유량 없음' };
    if (!item) return { enabled: false, reason: '아이템을 선택하세요.' };
    if (item && item.fusedRelic && !['divine', 'tainted', 'blessing'].includes(key)) return { enabled: false, reason: '융합 유물: 신성한/타락/축복만 사용 가능' };
    if (key === 'enchantedHoney') {
        let v = getCraftActionValidators(item);
        return { enabled: !!v.honey, reason: v.honey ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'venomStinger') {
        let v = getCraftActionValidators(item);
        return { enabled: !!v.stinger, reason: v.stinger ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'voidChisel') {
        let enabled = (typeof isVoidSocketAccessoryItem === 'function' ? isVoidSocketAccessoryItem(item) : (String(item.slot || '').replace(/[12]$/, '') === '반지' || String(item.slot || '').replace(/[12]$/, '') === '목걸이')) && !(item.voidSocket && item.voidSocket.open);
        return { enabled: enabled, reason: enabled ? '사용 가능' : '반지/목걸이의 빈 공허 소켓에만 사용 가능' };
    }
    if (MOBILE_CRAFT_ORB_KEYS.includes(key)) {
        if (item.corrupted && key !== 'tainted') return { enabled: false, reason: '타락한 아이템에는 사용 불가' };
        if (key === 'blessing') return { enabled: Array.isArray(item.baseStats) && item.baseStats.length > 0, reason: Array.isArray(item.baseStats) && item.baseStats.length > 0 ? '사용 가능' : '베이스 옵션 없음' };
        if (['deepWhetstone', 'rootIron', 'jewelPolish'].includes(key)) {
            let slot = String(item.slot || '');
            let isWeapon = slot === '무기';
            let isArmor = ['투구', '갑옷', '장갑', '신발', '허리띠'].includes(slot);
            let isAccessory = ['목걸이', '반지'].includes(slot);
            let slotOk = (key === 'deepWhetstone' && isWeapon) || (key === 'rootIron' && isArmor) || (key === 'jewelPolish' && isAccessory);
            let qualityOk = Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
            return { enabled: slotOk && qualityOk, reason: slotOk && qualityOk ? '사용 가능' : '현재 아이템 조건 불일치' };
        }
        if (key === 'abyssCatalyst') {
            let enabled = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
            return { enabled: enabled, reason: enabled ? '사용 가능' : '퀄리티와 추가 옵션이 있는 장비에만 사용 가능' };
        }
        return getCraftOrbUseState(key, item);
    }
    return { enabled: false, reason: '지원하지 않는 재화' };
}

function selectMobileCraftCurrency(key) {
    if (!getMobileCraftCurrencyOptions().includes(key)) return;
    game.mobileCraftCurrencyKey = key;
    updateStaticUI();
}
window.selectMobileCraftCurrency = selectMobileCraftCurrency;

function useSelectedMobileCraftCurrency() {
    let key = game.mobileCraftCurrencyKey;
    if (!key) return addLog('사용할 재화를 먼저 선택하세요.', 'attack-monster');
    if (key === 'enchantedHoney') return applyEnchantedHoneyToSelectedItem();
    if (key === 'venomStinger') return applyVenomStingerToSelectedItem();
    if (key === 'voidChisel') return applyVoidChiselToSelectedItem();
    return useCurrency(key);
}
window.useSelectedMobileCraftCurrency = useSelectedMobileCraftCurrency;

function openMobileCraftCurrencyOverlay() {
    let options = getMobileCraftCurrencyOptions();
    let old = document.getElementById('mobile-craft-currency-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    let overlay = document.createElement('div');
    overlay.id = 'mobile-craft-currency-overlay';
    overlay.className = 'mobile-craft-currency-overlay';
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    let current = game.mobileCraftCurrencyKey || '';
    let listHtml = options.length ? options.map(key => {
        let selected = key === current ? ' selected' : '';
        return `<button type="button" class="mobile-craft-currency-option${selected}" onclick="selectMobileCraftCurrency('${key}'); var overlayEl = document.getElementById('mobile-craft-currency-overlay'); if (overlayEl) overlayEl.remove();"><div style="font-weight:800;">${getStyledOrbName(key)}${selected ? ' ✓' : ''}</div><div style="font-size:0.82em; color:#9fb4d1; margin-top:3px;">보유 x ${game.currencies[key] || 0}</div></button>`;
    }).join('') : '<div style="grid-column:1/-1; color:#8fa7be; padding:12px; text-align:center;">보유 중인 사용 가능 재화가 없습니다.</div>';
    overlay.innerHTML = `<div class="mobile-craft-currency-panel"><div class="mobile-craft-currency-head" style="margin-bottom:10px;"><div><div style="color:#e6f1ff; font-size:1.02em; font-weight:900;">사용할 재화 선택</div><div style="color:#8fa7be; font-size:0.78em; margin-top:2px;">보유하고 해금된 재화만 표시됩니다.</div></div><button type="button" onclick="var overlayEl = document.getElementById('mobile-craft-currency-overlay'); if (overlayEl) overlayEl.remove();">닫기</button></div><div class="mobile-craft-currency-list">${listHtml}</div></div>`;
    document.body.appendChild(overlay);
}
window.openMobileCraftCurrencyOverlay = openMobileCraftCurrencyOverlay;

function renderMobileCraftCurrencyPicker(item) {
    let host = document.getElementById('ui-mobile-craft-currency-picker');
    if (!host) return;
    let options = getMobileCraftCurrencyOptions();
    if (!options.includes(game.mobileCraftCurrencyKey)) game.mobileCraftCurrencyKey = options[0] || '';
    let key = game.mobileCraftCurrencyKey;
    if (!key) {
        host.innerHTML = `<div class="mobile-craft-currency-card"><div class="mobile-craft-currency-head"><div class="mobile-craft-currency-title">빠른 제작</div><button type="button" onclick="openMobileCraftCurrencyOverlay()">사용할 재화 선택</button></div><div class="mobile-craft-currency-meta">보유하고 해금된 제작 재화가 없습니다.</div></div>`;
        return;
    }
    let state = getMobileCraftCurrencyUseState(key, item);
    host.innerHTML = `<div class="mobile-craft-currency-card"><div class="mobile-craft-currency-head"><div class="mobile-craft-currency-title">빠른 제작</div><button type="button" onclick="openMobileCraftCurrencyOverlay()">변경</button></div><div class="mobile-craft-currency-row" style="margin-top:7px;"><div class="mobile-craft-currency-selected">${getStyledOrbName(key)}</div><div class="currency-count" style="margin:0; white-space:nowrap;">x <strong>${game.currencies[key] || 0}</strong></div></div><div class="mobile-craft-currency-meta">${state.reason || '사용 가능'}</div><div class="mobile-craft-currency-actions"><button type="button" onclick="openMobileCraftCurrencyOverlay()">사용할 재화 선택</button><button type="button" onclick="useSelectedMobileCraftCurrency()" ${state.enabled ? '' : 'disabled'}>사용</button></div></div>`;
}

function buildSporeSummaryHtml() {
    return `<div style="border:1px solid #3d4f71; border-radius:10px; padding:8px; margin-bottom:8px; background:linear-gradient(160deg, rgba(39,51,86,0.25), rgba(16,22,38,0.5));">
            <div style="font-weight:700; color:#d7e6ff; margin-bottom:6px; font-size:0.92em;">🌱 홀씨 보유량</div>
            <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:6px;">
                <div style="padding:5px; border:1px solid #6b3a3a; border-radius:8px; color:#ff9f9f; font-size:0.86em;">화염 홀씨<br><strong>x ${game.currencies.sporeFire || 0}</strong></div>
                <div style="padding:5px; border:1px solid #3a5a7a; border-radius:8px; color:#9fd6ff; font-size:0.86em;">냉기 홀씨<br><strong>x ${game.currencies.sporeCold || 0}</strong></div>
                <div style="padding:5px; border:1px solid #7a6a2a; border-radius:8px; color:#ffe08a; font-size:0.86em;">번개 홀씨<br><strong>x ${game.currencies.sporeLight || 0}</strong></div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button onclick="applyCorruptSporeToSelectedItem()" ${typeof getExpertLevel === 'function' && getExpertLevel('mycologist') >= 7 ? '' : 'disabled'}>부패 홀씨 (각 8)</button>
                <button onclick="applyRiftSporeToSelectedItem()" ${typeof getExpertLevel === 'function' && getExpertLevel('mycologist') >= 9 ? '' : 'disabled'}>균열 홀씨 (화석1+각5)</button>
            </div>
        </div>`;
}


function getCraftTargetControlsHtml() {
    return `<div class="craft-target-actions"><button type="button" onclick="event.stopPropagation(); openCraftItemPickerOverlay('equip')">장비</button><button type="button" onclick="event.stopPropagation(); openCraftItemPickerOverlay('inventory')">인벤토리</button></div>`;
}

function closeCraftItemPickerOverlay() {
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    let overlay = document.getElementById('craft-item-picker-overlay');
    if (overlay) overlay.remove();
}

function selectCraftPickerEquipment(slot) {
    if (!slot || !(game.equipment || {})[slot]) return;
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    selectForCrafting(slot, true);
    closeCraftItemPickerOverlay();
}

function selectCraftPickerInventoryItem(itemId) {
    let id = Number(itemId);
    if (!Number.isFinite(id) || !(game.inventory || []).some(item => item && item.id === id)) return;
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    selectForCrafting(id, false);
    closeCraftItemPickerOverlay();
}

function getCraftPickerItemLines(item) {
    if (!item) return '';
    let rows = [];
    (item.baseStats || []).slice(0, 1).forEach(stat => rows.push(`${stat.statName || getStatName(stat.id)} +${formatValue(stat.id, stat.val)}`));
    (item.stats || []).slice(0, 2).forEach(stat => rows.push(`${stat.statName || getStatName(stat.id)} +${formatValue(stat.id, stat.val)}`));
    if (item.chaosInfusion) rows.push(`[주입] ${item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)} +${formatValue(item.chaosInfusion.id, item.chaosInfusion.val)}`);
    if (item.encroached && !item.encroached.liberated) rows.push('[잠식] 해방 전');
    return rows.map(row => `<div style="color:#9fb4d1; font-size:.7em; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(row)}</div>`).join('');
}

function getCraftPickerCardHtml(item, options) {
    options = options || {};
    let selected = !!options.selected;
    let rarity = item && item.rarity ? item.rarity : 'normal';
    let slotLabel = options.slotLabel || (item && item.slot ? item.slot : '장비');
    let sourceMeta = item && typeof getDropOnlyItemSourceMeta === 'function' ? getDropOnlyItemSourceMeta(item) : null;
    let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${sourceMeta.label}</span>` : '';
    let extraClass = options.extraClass || '';
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    return `<button type="button" class="craft-picker-card ${extraClass} ${selected ? 'selected' : ''}" onclick="${options.onclick || ''}" ${options.tooltip || ''}>
        <div class="item-title ${rarity}" style="font-size:.9em;">[${escapeHTML(getItemSlotDisplayLabel(item, slotLabel))}] ${escapeHTML(item.name || '장비')}${exceptionalStars}${sourceBadge}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.locked ? ' 🔒' : ''}</div>
        <div class="item-base-line" style="font-size:.78em;">${escapeHTML(item.baseName || '')}</div>
        ${getCraftPickerItemLines(item)}
    </button>`;
}

function getCraftPickerBodyHtml(kind) {
    let isEquip = kind === 'equip';
    let currentRef = getCraftSelectionRef();
    let currentIsEquip = isCraftSelectionEquip();
    if (isEquip) {
        let slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
        return `<div class="paperdoll craft-picker-equip-grid">${slots.map(slot => {
            let item = game.equipment && game.equipment[slot];
            let slotClass = `slot-box slot-${slot}`;
            if (!item) return `<button type="button" class="craft-picker-card ${slotClass} empty" disabled><div style="font-weight:800;">[${slot.replace(/[12]/, '')}]</div><div style="color:#7f8c8d; margin-top:5px;">비어있음</div></button>`;
            return getCraftPickerCardHtml(item, {
                slotLabel: slot,
                selected: currentIsEquip && currentRef === slot,
                onclick: `selectCraftPickerEquipment('${slot}')`,
                extraClass: slotClass,
                tooltip: `onmouseenter="showItemTooltip(event, '${slot}', true)" onmousemove="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"`
            });
        }).join('')}</div>`;
    }
    let totalInv = (game.inventory || []).length;
    let rows = (game.inventory || []).filter(item => item && isItemRarityVisible(item)).map(item => getCraftPickerCardHtml(item, {
        selected: !currentIsEquip && currentRef === item.id,
        onclick: `selectCraftPickerInventoryItem(${item.id})`
    })).join('');
    return rows
        ? `<div class="craft-picker-grid">${rows}</div>`
        : `<div class="deathlog-empty">${totalInv > 0 ? '선택한 등급 필터에 해당하는 장비가 없습니다.' : '인벤토리에 제작할 장비가 없습니다.'}</div>`;
}

function refreshCraftItemPickerOverlay() {
    let overlay = document.getElementById('craft-item-picker-overlay');
    if (!overlay || !window.__craftPickerKind) return;
    let filterEl = overlay.querySelector('.craft-picker-filter');
    if (filterEl) filterEl.innerHTML = `<span class="inventory-view-filter-label">표시</span>${renderRarityFilterChips('picker')}`;
    let bodyEl = overlay.querySelector('.craft-picker-body');
    if (bodyEl) bodyEl.innerHTML = getCraftPickerBodyHtml(window.__craftPickerKind);
}

function openCraftItemPickerOverlay(kind) {
    closeCraftItemPickerOverlay();
    let isEquip = kind === 'equip';
    window.__craftPickerKind = kind;
    let overlay = document.createElement('div');
    overlay.id = 'craft-item-picker-overlay';
    overlay.className = 'craft-picker-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeCraftItemPickerOverlay(); };
    let bodyHtml = getCraftPickerBodyHtml(kind);
    let filterRowHtml = isEquip ? '' : `<div class="craft-picker-filter"><span class="inventory-view-filter-label">표시</span>${renderRarityFilterChips('picker')}</div>`;
    overlay.innerHTML = `<div class="craft-picker-panel"><div class="craft-picker-head"><div><div class="craft-picker-title">${isEquip ? '장착 장비에서 제작 대상 선택' : '인벤토리에서 제작 대상 선택'}</div><div class="craft-picker-desc">카드를 클릭하면 제작실 대상 장비로 바로 선택됩니다.</div></div><button type="button" onclick="closeCraftItemPickerOverlay()">닫기</button></div>${filterRowHtml}<div class="craft-picker-body">${bodyHtml}</div></div>`;
    document.body.appendChild(overlay);
}

function exposeUiRenderHelpersOnce() {
    if (window.__uiRenderHelperGlobalsExposed) return;
    let helpers = {
        getStyledOrbName,
        getItemStatToneColor,
        updateSearchFilter,
        resetSearchFilter,
        toggleInventoryRarityFilter,
        toggleAllInventoryRarityFilter,
        renderRarityFilterChips,
        openAutoSalvageConfigOverlay,
        closeAutoSalvageConfigOverlay,
        refreshAutoSalvageConfigOverlay,
        toggleAutoSalvageRarity,
        bulkSalvageEquipBySearch,
        bulkSalvageJewelsBySearch,
        bulkSalvageTalismansBySearch,
        bulkDismantleColonyWardsBySearch,
        dismantleColonyWardById,
        updateColonyWardSearchFilter,
        resetColonyWardSearchFilter,
        exchangeTalismanShards,
        applyBeeswaxToTalisman,
        removeBeeswaxFromTalisman,
        openBeeswaxApplicationOverlay,
        confirmBeeswaxApplication,
        closeBeeswaxWarningOverlay,
        openWaxedItemRestrictionOverlay,
        closeTalismanDismantleOverlay,
        confirmTalismanDismantle,
        toggleTalismanLock,
        toggleColonyWardLock,
        openCraftItemPickerOverlay,
        closeCraftItemPickerOverlay,
        craftSelectInventoryItemById,
        selectCraftPickerEquipment,
        selectCraftPickerInventoryItem,
        showSocketedJewelTooltip,
        openUnderworldRuneOverlay,
        openUnderworldRuneUpgradeOverlay,
        closeUnderworldRuneOverlay,
        equipUnderworldRuneToSlot,
        unequipUnderworldRuneSlot,
        showUnderworldRuneTooltip,
        handleCombatLoopAdvanceButton
    };
    let pending = {};
    Object.keys(helpers).forEach(key => {
        let current = window[key];
        if (typeof current === 'undefined' || (current && current.__placeholderGlobal === true) || current === helpers[key]) pending[key] = helpers[key];
    });
    if (Object.keys(pending).length > 0) safeExposeGlobals(pending);
    window.__uiRenderHelperGlobalsExposed = true;
}
exposeUiRenderHelpersOnce();


function canShowCombatLoopAdvanceButton() {
    if (game && (game.pendingLoopReady || game.pendingLoopDecision)) return true;
    if (!game || (game.season || 1) < 10) return false;
    return typeof hasCurrentLoopAbyssRequirementClear === 'function'
        ? hasCurrentLoopAbyssRequirementClear(game.season || 1)
        : !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared);
}

function updateLoopDecisionOverlayUi() {
    let season = game ? (game.season || 1) : 1;
    let chaosReady = typeof hasCurrentLoopChaosRequirementClear === 'function'
        ? hasCurrentLoopChaosRequirementClear(season)
        : (typeof hasCurrentLoopAbyssRequirementClear === 'function' && hasCurrentLoopAbyssRequirementClear(season));
    let cosmosReady = typeof hasCurrentLoopCosmosRequirementClear === 'function'
        ? hasCurrentLoopCosmosRequirementClear(season)
        : false;
    let showPathChoices = season >= 31 && cosmosReady;
    let body = document.getElementById('loop-decision-body');
    if (body) body.innerText = showPathChoices
        ? '다음 루프로 사용할 경로를 선택하거나, 이번 루프를 유지하고 심화 등반을 계속하세요.'
        : '다음 루프로 즉시 넘어갈지, 이번 루프를 유지하고 심화 등반을 계속할지 선택하세요.';
    let genericBtn = document.getElementById('loop-decision-generic-btn');
    let chaosBtn = document.getElementById('loop-decision-chaos-btn');
    let cosmosBtn = document.getElementById('loop-decision-cosmos-btn');
    if (genericBtn) genericBtn.style.display = showPathChoices ? 'none' : '';
    if (chaosBtn) {
        chaosBtn.style.display = showPathChoices ? '' : 'none';
        chaosBtn.disabled = !chaosReady;
    }
    if (cosmosBtn) {
        cosmosBtn.style.display = showPathChoices ? '' : 'none';
        cosmosBtn.disabled = !cosmosReady;
    }
}

function handleCombatLoopAdvanceButton() {
    if (game && game.pendingLoopReady && typeof confirmLoopReady === 'function') {
        confirmLoopReady();
        return;
    }
    if (game && game.pendingLoopDecision && typeof chooseLoopAdvance === 'function') {
        chooseLoopAdvance(true);
        return;
    }
    if (canShowCombatLoopAdvanceButton() && typeof triggerSeasonReset === 'function') {
        let available = typeof getAvailableLoopAdvancePaths === 'function' ? getAvailableLoopAdvancePaths(game.season || 1) : [];
        if (available.length > 1) {
            game.pendingLoopDecision = true;
            let overlay = document.getElementById('loop-decision-overlay');
            if (overlay) overlay.classList.toggle('active', true);
            updateLoopDecisionOverlayUi();
            if (typeof addLog === 'function') addLog('진행할 루프 경로를 선택하세요.', 'season-up');
            return;
        }
        triggerSeasonReset();
        return;
    }
    if (typeof addLog === 'function') addLog('아직 루프 진행 조건을 달성하지 못했습니다.', 'attack-monster');
}

function buildCraftActionButtons(item) {
    let v = getCraftActionValidators(item);
    let defs = [
        { key:'honey', label:'🍯 벌꿀 고정', onclick:'applyEnchantedHoneyToSelectedItem()' },
        { key:'stinger', label:'🦂 독벌침 부여', onclick:'applyVenomStingerToSelectedItem()' },
        { key:'baseUpgrade', label:'⬆️ 베이스 업그레이드', onclick:'upgradeSelectedItemBase()' }
    ];
    return defs.map(d => `<button onclick="${d.onclick}" ${v[d.key] ? '' : 'disabled'}>${d.label}</button>`).join('');
}

    if (itemsTabActive) {
    let selectedItem = getSelectedCraftItem();
    renderCraftSelectedSummary(selectedItem);
    renderMobileCraftCurrencyPicker(selectedItem);
    let craftTargetControls = getCraftTargetControlsHtml();
    let craftSelectedBodyHtml = `<div style="color:#9fb4d1;">아이템을 클릭하여 선택</div>`;
    if (selectedItem) {
        let lines = [];
        (selectedItem.baseStats || []).forEach(stat => {
            let rangeText = getItemStatRollRangeHtml(stat, { estimateFromValue: true });
            lines.push(`<div class="tooltip-line craft-option-line craft-option-line--base" style="color:${getItemStatToneColor(stat.id)}">${stat.statName} +${formatValue(stat.id, stat.val)}${rangeText}</div>`);
        });
        let selectedExplicitStats = (selectedItem.stats || []).slice();
        if (selectedItem.chaosInfusion) selectedExplicitStats.push({ ...selectedItem.chaosInfusion, statName: `[주입] ${selectedItem.chaosInfusion.statName || getStatName(selectedItem.chaosInfusion.id)}` });
        selectedExplicitStats.forEach(stat => {
            let tierText = stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '';
            let honeyTag = stat.lockedByHoney ? ` <span style="color:#ffd166; font-weight:700;">[고정됨]</span>` : '';
            let stingerTag = stat.venomStingerBonus ? ` <span style="color:#9bff9e;">[독벌침]</span>` : '';
            let rangeText = getItemStatRollRangeHtml(stat);
            lines.push(`<div class="tooltip-line craft-option-line" style="color:${getItemStatToneColor(stat.id)}">${stat.statName} +${formatValue(stat.id, stat.val)}${rangeText}${tierText}${honeyTag}${stingerTag}</div>`);
        });
        if (selectedExplicitStats.length === 0) lines.push(`<div class="tooltip-line" style="color:#7f8c8d">추가 옵션 없음</div>`);
        if (selectedItem.encroached) {
            if (selectedItem.encroached.liberated && selectedItem.encroached.chosen) {
                let st = selectedItem.encroached.chosen;
                lines.push(`<div class="tooltip-line" style="color:#d7b8ff;">[잠식] ${st.statName || getStatName(st.id)} +${formatValue(st.id, st.val)} ${getTierBadgeHtml(st.tier || 10, 'T')}</div>`);
            } else {
                lines.push(`<div class="tooltip-line" style="color:#8d7bb3;">[잠식] 해방 전 효과 없음 · 제작으로 변하지 않음</div>`);
            }
        }
        let equipSelectedButtonHtml = isCraftSelectionEquip() ? '' : `<button onclick="equipSelectedCraftInventoryItem()">착용</button>`;
        let voidSocketHtml = '';
        let abyssSocketHtml = '';
        if (typeof isVoidSocketAccessoryItem === 'function' ? isVoidSocketAccessoryItem(selectedItem) : (String(selectedItem.slot || '').replace(/[12]$/, '') === '반지' || String(selectedItem.slot || '').replace(/[12]$/, '') === '목걸이')) {
            selectedItem.voidSocket = selectedItem.voidSocket || { open: false, jewel: null };
            if (!selectedItem.voidSocket.open) {
                voidSocketHtml = `<button onclick="applyVoidChiselToSelectedItem()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>🕳️ 공허 소켓 생성</button>`;
            } else if (selectedItem.voidSocket.jewel) {
                voidSocketHtml = `<div style="color:#9fd6ff;">소켓 주얼: <span class="${getJewelRarityClass(selectedItem.voidSocket.jewel.rarity || 'normal')}" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'void',0)" onmousemove="showSocketedJewelTooltip(event,'void',0)" onmouseleave="hideInfoTooltip()">${selectedItem.voidSocket.jewel.name}</span></div><button onclick="removeJewelFromVoidSocket()" ${(game.currencies.voidChisel||0)<=0?'disabled':''}>주얼 제거(끌 1)</button>`;
            } else {
                let hasSocketJewelCandidates = (game.jewelInventory || []).some(Boolean);
                voidSocketHtml = `<div style="color:#9fd6ff;">빈 공허 소켓</div><button onclick="openVoidSocketJewelOverlay()" ${hasSocketJewelCandidates ? '' : 'disabled'}>주얼 장착</button>${hasSocketJewelCandidates ? '' : '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>'}`;
            }
        }
        let abyssCap = typeof getAbyssSocketCapacity === 'function' ? getAbyssSocketCapacity(selectedItem) : 0;
        if (abyssCap > 0) {
            if (typeof ensureAbyssSockets === 'function') ensureAbyssSockets(selectedItem);
            selectedItem.abyssSockets = Array.isArray(selectedItem.abyssSockets) ? selectedItem.abyssSockets : [];
            let makeBtn = `<div style="color:#9fd6ff;">심연 소켓: ${selectedItem.abyssSockets.length}/${abyssCap} (아이템 고유 옵션으로 제공)</div>`;
            let rows = selectedItem.abyssSockets.map((sock, sidx) => {
                if (sock && sock.jewel) {
                    let j = sock.jewel;
                    return `<div style="margin-top:4px; color:#9fd6ff;">심연 소켓 #${sidx + 1}: <span class="${getJewelRarityClass(j.rarity || 'normal')}" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'abyss',${sidx})" onmousemove="showSocketedJewelTooltip(event,'abyss',${sidx})" onmouseleave="hideInfoTooltip()">${j.name}</span> <button onclick="removeJewelFromAbyssSocket(${sidx})">제거</button></div>`;
                }
                let jewelBtns = (game.jewelInventory || []).map((j, i) => `<button data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'inventory',${i})" onmousemove="showSocketedJewelTooltip(event,'inventory',${i})" onmouseleave="hideInfoTooltip()" onclick="insertJewelIntoAbyssSocket(${i}, ${sidx})">${j.name} 장착</button>`).join('');
                return `<div style="margin-top:4px; color:#9fd6ff;">심연 소켓 #${sidx + 1}: 빈 슬롯</div>${jewelBtns || '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>'}`;
            }).join('');
            abyssSocketHtml = `<div class="craft-section-title">심연 소켓</div>${makeBtn}${rows}`;
        }
        let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(selectedItem) : '';
        let explicitCount = typeof getItemExplicitOptionCount === 'function' ? getItemExplicitOptionCount(selectedItem) : selectedExplicitStats.length;
        let averageAffixTier = typeof getAverageExplicitAffixTier === 'function' ? getAverageExplicitAffixTier([selectedItem]) : 0;
        let protectedAffixCount = (selectedItem.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift || stat.unremovable)).length;
        let craftMetrics = `<div class="craft-target-metrics">
            <span>추가 옵션 <b>${explicitCount}/6</b></span>
            <span>평균 티어 <b>${averageAffixTier > 0 ? `T${averageAffixTier.toFixed(1)}` : '—'}</b></span>
            <span>품질 <b>${Math.max(0, Math.floor(Number(selectedItem.quality) || 0))}%</b></span>
            <span>보호 옵션 <b>${protectedAffixCount}</b></span>
        </div>`;
        let selectedUniqueEffectHtml = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
            ? `<div class="craft-unique-effect"><strong>고유 효과</strong><span>${escapeHTML(selectedItem.uniqueEffect)}</span><small>${escapeHTML(getUniqueEffectApplicationHint(selectedItem, typeof isCraftSelectionEquip === 'function' && isCraftSelectionEquip(), typeof getCraftSelectionRef === 'function' ? getCraftSelectionRef() : null))}</small></div>`
            : '';
        craftSelectedBodyHtml = `<div><div class="item-title ${selectedItem.rarity}">[${getItemSlotDisplayLabel(selectedItem)}] ${selectedItem.name}${exceptionalStars}${selectedItem.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}</div><div class="item-base-line">${selectedItem.baseName}</div>${craftMetrics}${selectedUniqueEffectHtml}</div><div class="craft-section-title">옵션</div>${lines.join('')}<div class="craft-section-title">베이스</div><div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">${equipSelectedButtonHtml}<button onclick="upgradeSelectedItemBase()">⬆️ 베이스 업그레이드</button></div><div style="margin-top:8px; display:grid; gap:6px;">${selectedItem.encroached && !selectedItem.encroached.liberated ? `<button onclick="liberateSelectedEncroachedItem()">🕳️ 잠식 해방</button>` : ''}${voidSocketHtml}${abyssSocketHtml}</div>`;
    }
    document.getElementById('forge-item-display').innerHTML = `${craftTargetControls}<div class="craft-selected-body">${craftSelectedBodyHtml}</div>`;
    document.getElementById('fossil-item-display').innerHTML = craftSelectedBodyHtml;
    let fossilButtons = [];
    let mycologistLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    if ((game.currencies.fossil || 0) > 0) fossilButtons.push(`<button onclick="applyFossilCraft()">기본 화석 정제 (${game.currencies.fossil || 0})</button>`);
    if ((game.currencies.fossilPrimal || 0) > 0) fossilButtons.push(`<button onclick="restorePrimalFossil('normal')" ${mycologistLv < 4 ? 'disabled' : ''}>원시 화석 복원 (${game.currencies.fossilPrimal || 0})${mycologistLv < 4 ? ' · 균사학자 Lv.4 필요' : ''}</button>`);
    if ((game.currencies.fossilAncientPrimal || 0) > 0) fossilButtons.push(`<button onclick="restorePrimalFossil('ancient')" ${mycologistLv < 5 ? 'disabled' : ''}>원시 고대 화석 복원 (${game.currencies.fossilAncientPrimal || 0})${mycologistLv < 5 ? ' · 균사학자 Lv.5 필요' : ''}</button>`);
    FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).forEach(fossil => {
        fossilButtons.push(`<button onclick="applyFossilChaosCraft('${fossil.key}')" ${!selectedItem ? 'disabled' : ''}>${fossil.name} 사용 (${game.currencies[fossil.key] || 0})</button>`);
    });
    document.getElementById('ui-fossil-actions').innerHTML = fossilButtons.join('') || `<div style="color:#7f8c8d;">보유한 화석이 없습니다.</div>`;
    document.getElementById('ui-fossil-info').innerHTML = `<div style="margin-bottom:6px; color:#f1c67d;">원하는 옵션 1개가 확정인 카오스 재련</div>${FOSSIL_DB.filter(fossil => (game.currencies[fossil.key] || 0) > 0).map(fossil => `<div style="margin-bottom:6px;"><strong>${fossil.name}</strong> - ${fossil.desc}</div>`).join('') || `<div style="color:#7f8c8d;">보유 중인 타입 화석이 없습니다.</div>`}<div style="margin-top:8px; color:#8fb6d9;">기본 화석 정제는 항상 가능하며, 균사학자 Lv.4부터 원시 화석(복원 전용), Lv.5부터 원시 고대 화석(태고 화석 추가/고급 재화 확률 증가)이 미궁에서 드랍됩니다. 화석 전용 옵션은 Lv.6부터 제작이 아니라 장비 드랍 시 일정 확률로 붙습니다.</div>`;

    let hiddenCurrencyKeys = new Set(['chaosKey', 'coreKey', 'bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'rivalKey', 'cosmosSovereignKey', 'bossCore', 'skyEssence', 'gemShard', 'fossil', 'fossilPrimal', 'fossilAncientPrimal', 'fossilPrimordial', 'fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic', 'fossilAbyssal', 'fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift', 'sealShard', 'strongSealShard', 'radiantSealShard', 'jewelCore', 'jewelShard', 'hiveKey', 'colonyTrace', 'colonyShard', 'meteorShard', 'incompleteStarWedge', 'starWedge', 'pollen', 'beeswax', 'starDust', 'awakenedEcho', 'trialKey3', 'runeShard', 'underCopper', 'underSilver', 'underGold', 'uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos', 'reefFragment', 'oceanRerollShard']);
    hiddenCurrencyKeys.add('condensedSkyPower');
    document.getElementById('ui-currency-grid').innerHTML = Object.keys(ORB_DB).filter(key => {
        if (hiddenCurrencyKeys.has(key)) return false;
        if (key === 'tainted') return (game.season || 1) >= 5 && (game.currencies[key] || 0) > 0;
        if (key === 'enchantedHoney' || key === 'venomStinger' || key === 'voidChisel') return (game.currencies[key] || 0) > 0;
        if (key === 'deepWhetstone' || key === 'rootIron' || key === 'jewelPolish' || key === 'abyssCatalyst') return (game.currencies[key] || 0) > 0;
        if (key === 'sporeFire' || key === 'sporeCold' || key === 'sporeLight') return false;
        // 나무꾼의 손길: 한 번이라도 획득(또는 보유)한 적이 있을 때만 재화 탭에 노출.
        if (key === 'woodsmanTouch') return !!game.woodsmanTouchSeen || (game.currencies[key] || 0) > 0;
        return true;
    }).map(key => {
        let useBtn = '';
        if (key === 'enchantedHoney') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyEnchantedHoneyToSelectedItem()">사용</button></div>`;
        if (key === 'woodsmanTouch') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyWoodsmanTouchToSelectedItem()">봉인</button></div>`;
        if (key === 'venomStinger') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyVenomStingerToSelectedItem()">사용</button></div>`;
        if (key === 'voidChisel') useBtn = `<div style="display:flex; justify-content:flex-end; margin-top:6px;"><button onclick="applyVoidChiselToSelectedItem()">사용</button></div>`;
        let sporeModes = game.sporeCraftModes || {};
        let modeLabelMap = { none: '미사용', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스', damage: '피해' };
        let isCraftOrb = ['transmute','augment','alteration','alchemy','exalted','regal','chaos','divine','chance','annulment','scour','tainted','blessing','deepWhetstone','rootIron','jewelPolish','abyssCatalyst'].includes(key);
        let canUseSporeMode = ['transmute','augment','alteration','alchemy','exalted','regal','chaos'].includes(key);
        let mode = sporeModes[key] || 'none';
        let useState = key === 'voidChisel' ? getMobileCraftCurrencyUseState(key, getSelectedCraftItem()) : getCraftOrbUseState(key, getSelectedCraftItem());
        let reason = useState.reason;
        if (isCraftOrb) {
            let rightButtons = '';
            if (canUseSporeMode) rightButtons += `<button style="padding:6px 10px; font-size:0.9em; line-height:1; white-space:nowrap;" onclick="openSporeModeOverlay('${key}')">홀씨:${modeLabelMap[mode] || '미사용'}</button>`;
            rightButtons += `<button style="padding:6px 10px; font-size:0.9em; line-height:1; white-space:nowrap;" onclick="useCurrency('${key}')" ${useState.enabled ? '' : 'disabled'}>사용</button>`;
            useBtn += `<div style="display:flex; justify-content:flex-end; margin-top:4px;"><div style="display:flex; flex-wrap:nowrap; align-items:center; gap:4px;">${rightButtons}</div></div>`;
        }
        let premiumGray = (key === 'deepWhetstone' || key === 'rootIron' || key === 'jewelPolish' || key === 'abyssCatalyst') ? 'style="background:linear-gradient(180deg,#656d78,#4f5660); -webkit-background-clip:text; background-clip:text; color:transparent; text-shadow:0 0 6px rgba(220,225,235,.2);"' : '';
        let rareCurrencyClass = key === 'woodsmanTouch' ? ' woodsman-touch-currency' : '';
        return `<div class="currency-card${rareCurrencyClass}" onmouseenter="showCurrencyCardTooltip(event,'${key}','${reason.replace(/'/g, "\\'")}')" onmouseleave="hideInfoTooltip()"><div style="display:flex; justify-content:space-between; align-items:center; gap:8px;"><div class="currency-name" ${premiumGray}>${getStyledOrbName(key)}</div><div class="currency-count" style="margin:0; white-space:nowrap;">x <strong>${game.currencies[key] || 0}</strong></div></div>${useBtn}</div>`;
    }).join('');
    let sporeHtml = buildSporeSummaryHtml();
    ['ui-spore-summary', 'ui-spore-summary-mobile'].forEach(id => {
        let sporeHost = document.getElementById(id);
        if (sporeHost) sporeHost.innerHTML = sporeHtml;
    });

    renderChaosInfuserPanel(selectedItem);
    renderCraftOrbActions(selectedItem);
    }
    let fossilTabBtn = document.getElementById('btn-item-tab-fossil');
    if (fossilTabBtn) fossilTabBtn.style.display = (game.season || 1) >= 3 ? 'block' : 'none';
    let marketTabBtn = document.getElementById('btn-item-tab-market');
    if (marketTabBtn) marketTabBtn.style.display = isMarketUnlocked() ? 'block' : 'none';
    let infuserTabBtn = document.getElementById('btn-item-tab-infuser');
    let chaosInfuserOpen = typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked();
    if (infuserTabBtn) infuserTabBtn.style.display = chaosInfuserOpen ? 'block' : 'none';
    if (!isMarketUnlocked() && game.itemSubtab === 'item-tab-market') switchItemSubtab('item-tab-equip');
    if (!chaosInfuserOpen && game.itemSubtab === 'item-tab-infuser') switchItemSubtab('item-tab-equip');
    let underworldBtn = document.getElementById('btn-map-tab-underworld');
    let underworldUnlocked = (typeof isUnderworldUnlockedPermanent === 'function') && isUnderworldUnlockedPermanent();
    if (underworldBtn) underworldBtn.style.display = underworldUnlocked ? 'block' : 'none';
    if (game.mapSubtab === 'map-tab-underworld' && !underworldUnlocked) switchMapSubtab('map-tab-zones');
    __mark('midRender');
    renderMarketUI();
    renderExpertiseUI();
    __mark('market+expertise');

    let mapTabActive = (document.getElementById('tab-map') || {}).classList.contains('active');
    let activeMapExploreId = game.mapExploreSubtab || 'map-explore-hunting';
    // 벌집 진행 상태 갱신은 UI 표시와 무관하게 항상 돌아야 한다.
    // (awaitingClear -> pendingChoice 전환이 여기서 처리됨)
    renderLoop8BeehivePanel(mapTabActive && activeMapExploreId === 'map-explore-beehive');
    if (mapTabActive && activeMapExploreId === 'map-explore-colony') renderLoop15ColonyPanel();
    if (mapTabActive) {
    renderChallengeContractPanel();
    let legacyMapOverview = document.querySelector('#tab-map .map-overview-card');
    if (legacyMapOverview) legacyMapOverview.remove();
    document.querySelectorAll('#tab-map img').forEach(node => node.remove());

    let seasonMapCap = typeof getVisibleHuntingMapCapZoneId === 'function' ? getVisibleHuntingMapCapZoneId() : Math.min(getCurrentSeasonFinalZoneId(), getAbyssZoneIdForDepth(20));
    let highestMapZone = Math.min(Math.max(0, Math.floor(game.maxZoneId || 0)), seasonMapCap);
    let mapZones = Array.from({ length: highestMapZone + 1 }, (_, idx) => getZone(idx)).filter(Boolean);
    let contractScore = getChallengeContractScore();
    let contractBonusPct = Math.round((getChallengeContractRewardMultiplier({ type: 'act' }) - 1) * 100);
    let mapCards = mapZones.map(zone => {
        let idx = Number(zone.id);
        let isChaosMap = zone.type === 'abyss';
        let current = idx === game.currentZoneId ? 'current' : '';
        let unlockReveal = idx === pendingMapRevealZoneId ? 'map-unlock-reveal' : '';
        let icon = zone.ele === 'fire' ? '🔥' : (zone.ele === 'cold' ? '❄️' : (zone.ele === 'light' ? '⚡' : (zone.ele === 'chaos' ? '☠️' : '🩸')));
        let rewardReady = (game.claimableActRewards || []).includes(idx);
        let rewardClaimed = (game.claimedActRewards || []).includes(idx);
        let isActRewardZone = zone.type === 'act' && idx <= 9;
        let chaos20Conquered = (getAbyssDepthFromZoneId(idx) === 20) && (
            !!(game.loopProgressCurrent && game.loopProgressCurrent.chaos20Cleared) ||
            (Array.isArray(game.abyssClearedDepths) && game.abyssClearedDepths.includes(20)) ||
            Math.floor(game.abyssEndlessDepth || 0) >= 21
        );
        let cleared = idx < game.maxZoneId || rewardReady || rewardClaimed || chaos20Conquered;
        let actionHtml = '';
        let mapZoneText = zone.name;
        if (zone.type === 'act') {
            let storyAct = getStoryActByZoneId(idx);
            if (storyAct) mapZoneText = `${zone.name}<br><span class="map-zone-status">보스: ${storyAct.bossName}</span>`;
            if (contractScore > 0) mapZoneText += `<br><span class="map-zone-status" style="color:#e9b97d;">📜 계약 ${contractScore} · 보상 +${contractBonusPct}%</span>`;
        }
        if (isActRewardZone && rewardReady) actionHtml = `<button class="map-reward-btn" onclick="event.stopPropagation(); openActReward(${idx})">보상 받기</button>`;
        else if (isActRewardZone && rewardClaimed) actionHtml = `<button class="map-reward-btn claimed" disabled>보상 완료</button>`;
        else if (cleared) actionHtml = `<span class="map-zone-status">정복 완료</span>`;
        return {
            isChaosMap,
            html: `
            <div class="map-item ${isChaosMap ? 'map-item--chaos' : ''} ${current} ${unlockReveal}" onclick="changeZone(${idx})">
                <div class="map-item-main"><span>${icon}</span><span>${mapZoneText}</span></div>
                <div class="map-item-actions">${actionHtml}</div>
            </div>
        `
        };
    });
    let huntingMapCards = mapCards.filter(card => !card.isChaosMap);
    let chaosMapCards = mapCards.filter(card => card.isChaosMap);
    let deepChaosCardHtml = getDeepChaosMapEntryHtml();
    if (deepChaosCardHtml) chaosMapCards.push({ isChaosMap: true, html: deepChaosCardHtml });
    // 나무(일반 사냥터)와 혼돈을 탐험 좌측 세부 탭으로 분리해 각각의 컨테이너에 렌더링한다.
    let mapListHtml = buildMapZoneGroupHtml('hunting', '일반 나무', huntingMapCards);
    let chaosListHtml = buildMapZoneGroupHtml('chaos', '혼돈', chaosMapCards);
    if (lastRenderedMapListHtml !== mapListHtml) {
        let mapListEl = document.getElementById('ui-map-list');
        mapListEl.classList.add('map-grid--split');
        mapListEl.innerHTML = mapListHtml;
        lastRenderedMapListHtml = mapListHtml;
    }
    let chaosMapListEl = document.getElementById('ui-chaos-map-list');
    if (chaosMapListEl && lastRenderedChaosMapListHtml !== chaosListHtml) {
        chaosMapListEl.classList.add('map-grid--split');
        chaosMapListEl.innerHTML = chaosListHtml;
        lastRenderedChaosMapListHtml = chaosListHtml;
    }
    setExploreSubtabAvailable('map-explore-chaos', chaosMapCards.length > 0);
    setExploreSubtabAvailable('map-explore-beehive', (game.season || 1) >= 8);
    setExploreSubtabAvailable('map-explore-voidrift', (game.season || 1) >= 9);
    setExploreSubtabAvailable('map-explore-colony', (game.season || 1) >= 15);

    let seasonBosses = SEASON_BOSS_ZONES.filter(zone => (game.season || 1) >= (zone.reqSeason || 2));
    document.getElementById('ui-season-boss-header').style.display = seasonBosses.length > 0 ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-root-boss', seasonBosses.length > 0);
    let seasonBossRepeatWrap = document.getElementById('ui-season-boss-repeat-wrap');
    let seasonBossRepeatBtn = document.getElementById('btn-season-boss-repeat');
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = 'none';
    if (seasonBossRepeatBtn) {
        seasonBossRepeatBtn.style.display = seasonBosses.length > 0 ? 'inline-block' : 'none';
        seasonBossRepeatBtn.innerText = `반복 도전 ${game.autoRepeatSeasonBoss ? 'ON' : 'OFF'}`;
        seasonBossRepeatBtn.style.background = game.autoRepeatSeasonBoss ? '#2f6a42' : '#5b4a2f';
        seasonBossRepeatBtn.style.minWidth = '0';
    }
    let rootBossListHtml = seasonBosses.map(zone => {
        let keys = game.currencies[zone.key] || 0;
        let gateReason = '';
        if (Array.isArray(zone.requiresRivals)) {
            let killedRivals = (game.loopProgressCurrent && Array.isArray(game.loopProgressCurrent.specialBosses)) ? game.loopProgressCurrent.specialBosses : [];
            let remainingRivals = zone.requiresRivals.filter(id => !killedRivals.includes(id));
            if (remainingRivals.length > 0) gateReason = `이번 루프 선행 결투 ${zone.requiresRivals.length - remainingRivals.length}/${zone.requiresRivals.length}`;
        }
        if (Array.isArray(zone.requiresCosmosBosses)) {
            let progress = typeof getCosmosCapstoneProgress === 'function'
                ? getCosmosCapstoneProgress(game.cosmosAtlas)
                : null;
            let clearedBosses = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.bossClears)) ? game.cosmosAtlas.bossClears : [];
            let clearedCount = progress ? progress.clearedCount : zone.requiresCosmosBosses.filter(id => clearedBosses.includes(id)).length;
            if (clearedCount < zone.requiresCosmosBosses.length) gateReason = `이번 루프 은하 보스 ${clearedCount}/${zone.requiresCosmosBosses.length}`;
        }
        let disabled = keys <= 0 || !!gateReason;
        let statusText = gateReason || `${ORB_DB[zone.key].name}: ${keys}`;
        return `<div class="map-item ${game.currentZoneId === zone.id ? 'current' : ''}" ${disabled ? '' : `onclick="changeZone('${zone.id}')"`}>
            <div class="map-item-main"><span>🗝️</span><span>${zone.name}</span></div>
            <div class="map-item-actions"><span class="map-zone-status">${statusText}</span>${gateReason ? `<button type="button" disabled>선행 조건 필요</button>` : ''}</div>
        </div>`;
    }).join('');
    document.getElementById('ui-season-boss-list').innerHTML = rootBossListHtml;

    let timeRiftOpen = (game.season || 1) >= TIME_RIFT_UNLOCK_LOOP;
    setExploreSubtabAvailable('map-explore-timerift', timeRiftOpen);
    if (timeRiftOpen) renderTimeRiftPanel();

    let labyrinthOpen = (game.season || 1) >= 3;
    document.getElementById('ui-labyrinth-header').style.display = labyrinthOpen ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-labyrinth', labyrinthOpen);
    if (labyrinthOpen) {
        let maxFloor = Math.max(1, Math.floor(game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1));
        document.getElementById('ui-labyrinth-list').innerHTML = `<div class="map-item ${game.currentZoneId === LABYRINTH_ZONE_ID ? 'current' : ''}" onclick="enterLabyrinthPrompt()">
            <div class="map-item-main"><span>🏛️</span><span>고대 미궁 ${game.labyrinthFloor || 1}층</span></div>
            <div class="map-item-actions"><span class="map-zone-status">미궁 화석: ${game.currencies.fossil || 0}</span></div>
        </div><div class="map-item-actions"><span class="map-zone-status">해금 최고층: ${maxFloor}층 · 클릭하여 층수 선택 입장</span></div></div>`;
    } else document.getElementById('ui-labyrinth-list').innerHTML = '';

    // 혼돈 심화 입장은 혼돈 탭의 카드 목록으로 노출한다.
    // 기존 전용 섹션/사이드 탭은 중복 표시를 피하기 위해 비우고 숨긴다.
    document.getElementById('ui-deep-chaos-header').style.display = 'none';
    document.getElementById('ui-deep-chaos-list').innerHTML = '';
    let deepChaosTabBtn = document.getElementById('btn-map-explore-deep-chaos');
    if (deepChaosTabBtn) deepChaosTabBtn.style.display = 'none';
    if (game.mapExploreSubtab === 'map-explore-deep-chaos') switchMapExploreSubtab('map-explore-hunting');

    let meteorUnlocked = !!(game.starWedge && game.starWedge.unlocked);
    let meteorReady = !!(game.starWedge && game.starWedge.skyRiftReady);
    let meteorGauge = Math.floor((game.starWedge && game.starWedge.skyRiftGauge) || 0);
    document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-meteor', meteorUnlocked);

    let meteorAutoBtn = document.getElementById('btn-meteor-auto-enter');
    if (meteorAutoBtn) {
        meteorAutoBtn.style.display = meteorUnlocked ? 'inline-block' : 'none';
        meteorAutoBtn.innerText = `자동입장 ${game.settings.autoEnterMeteor ? 'ON' : 'OFF'}`;
    }

    document.getElementById('ui-meteor-list').innerHTML = meteorUnlocked ? `<div class="map-item ${game.currentZoneId === METEOR_FALL_ZONE_ID ? 'current' : ''}" ${meteorReady ? `onclick="changeZone('${METEOR_FALL_ZONE_ID}')"` : ''}>
        <div class="map-item-main"><span>☄️</span><span>운석 낙하 지점<br><span class="map-zone-status">하늘의 균열 ${meteorGauge}% ${meteorReady ? '· 입장 가능' : '· 충전 중'}</span></span></div>
        <div class="map-item-actions" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;"><span class="map-zone-status">난이도: 혼돈 ${Math.max(1, Math.floor((game.starWedge && game.starWedge.skyRiftMinTier) || 1))}</span></div>
    </div>` : '';

    renderChaosRealmMapPanel();
    renderSkyTowerMapPanel();
    renderUnderworldMapPanel();
    renderOceanDepthMapPanel();
    renderFishingPanel();
    renderSeaGiftPanel();

    let availTrials = TRIAL_ZONES.filter(trial => {
        if (trial.bloomTrial) return canSeeTalentBloomTrial();
        return (trial.reqZone !== -1 && game.maxZoneId >= trial.reqZone) || game.unlockedTrials.includes(trial.id);
    });
    document.getElementById('ui-trials-header').style.display = availTrials.length > 0 ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-trials', availTrials.length > 0);
    renderMapExploreNotiDots();

    renderLoop9VoidRiftPanel();
    document.getElementById('ui-trial-list').innerHTML = availTrials.map(trial => {
        if (trial.bloomTrial) {
            let isCurrent = game.currentZoneId === trial.id;
            let chaosKeys = Math.floor(game.currencies.chaosKey || 0);
            let coreKeys = Math.floor(game.currencies.coreKey || 0);
            let ready = canEnterTalentBloomTrial();
            let hint;
            if (ready) hint = '개화 도전';
            else if (chaosKeys < 1 || coreKeys < 1) hint = `카오스 ${chaosKeys}/1 · 코어 ${coreKeys}/1`;
            else if (!isWoodsmanEchoUnlocked()) hint = '🔒 나무꾼의 잔상 필요';
            else if (!game.ascendClass) hint = '🔒 직업(전직) 필요';
            else hint = '🔒 조건 미충족';
            return `<div class="map-item ${isCurrent ? 'current' : 'trial'}" ${ready ? `onclick="enterTalentBloomTrial()"` : ''}><span>${ready ? '🔔 ' : ''}🌸 ${trial.name}</span><span style="font-size:0.8em; font-weight:normal; ${ready ? 'color:#ffd76b;' : ''}">${ready ? '도전 가능 ' : ''}${hint}</span></div>`;
        }
        let isCurrent = game.currentZoneId === trial.id;
        let isCompleted = game.completedTrials.includes(trial.id);
        let needsTicket = isCompleted && (trial.id === 'trial_3' || trial.id === 'trial_4');
        let hasTicket = (game.currencies.trialKey3 || 0) > 0;
        let cls = isCurrent ? 'current' : 'trial';
        if (isCompleted) cls = '';
        return `<div class="map-item ${cls}" ${(isCompleted && needsTicket && !hasTicket) ? '' : `onclick="${(isCompleted && needsTicket) ? `enterTrialWithTicket('${trial.id}')` : `changeZone('${trial.id}')`}"`}><span>${trial.name} ${isCompleted ? '(완료)' : ''}</span><span style="font-size:0.8em; font-weight:normal;">${isCompleted ? (needsTicket ? `재도전권 ${game.currencies.trialKey3||0}` : '✔️') : '도전하기'}</span></div>`;
    }).join('');
    }
    __mark('mapPanels');

    let mapAbyssUnlocked = (game.maxZoneId || 0) >= ABYSS_START_ZONE_ID;
    let mapAbyssBtn = document.getElementById('btn-map-tab-abyss');
    if (mapAbyssBtn) mapAbyssBtn.style.display = mapAbyssUnlocked ? 'block' : 'none';
    if (!mapAbyssUnlocked && game.mapSubtab === 'map-tab-abyss') game.mapSubtab = 'map-tab-zones';

    if (activeTabId === 'tab-season' || (activeTabId === 'tab-map' && game.mapSubtab === 'map-tab-abyss')) {
    let seasonVisible = game.season > 1 || game.seasonPoints > 0;
    document.getElementById('trait-season-section').style.display = seasonVisible ? 'block' : 'none';
    document.getElementById('season-content-section').style.display = seasonVisible ? 'block' : 'none';
    if (mapAbyssUnlocked) {
        let abyssState = getAbyssPassiveState();
        let total = Math.max(0, Math.floor(game.abyssPassivePoints || 0));
        let spent = getAbyssPassiveSpent();
        let free = getAbyssPassiveFreePoints();
        let cleared = (game.abyssClearedDepths || []).length;
        document.getElementById('ui-abyss-passive-summary').innerHTML = `획득 포인트 <strong>${total}</strong> / 사용 <strong>${spent}</strong> / 남은 <strong>${free}</strong> · 밝혀낸 혼돈 ${cleared}개`;
        document.getElementById('ui-abyss-passive-grid').innerHTML = ABYSS_PASSIVE_NODES.map(node => {
            let rank = Math.max(0, Math.floor(abyssState[node.key] || 0));
            let pointCost = Math.max(1, Math.floor(node.cost || 1));
            let disabled = free < pointCost || rank >= node.max;
            return `<div style="background:#141e2b; border:1px solid #2e4361; border-radius:10px; padding:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:6px;">
                    <strong style="color:#d5e7fa;">${node.name}</strong><span style="color:#f8d37c; font-weight:700;">${rank}/${node.max}</span>
                </div>
                <div style="font-size:0.82em; color:#9ec0df; min-height:34px; margin-bottom:8px;">${node.desc}</div>
                <button style="width:100%;" onclick="tryAllocateAbyssPassive('${node.key}')" ${disabled ? 'disabled' : ''}>+1 투자 (비용 ${pointCost})</button>
            </div>`;
        }).join('');
        let loop10Panel = document.getElementById('ui-loop10-panel');
        if (loop10Panel) {
            let loop10Open = (game.season || 1) >= 10;
            loop10Panel.style.display = loop10Open ? 'block' : 'none';
            if (loop10Open) {
                game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
                game.loopProgressBase = game.loopProgressBase || { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] };
                game.loopProgressCurrent = game.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false };
                let deepChaosUnlocked = (typeof hasCurrentLoopChaos20Clear === 'function') ? hasCurrentLoopChaos20Clear() : !!game.loopProgressCurrent.chaos20Cleared;
                let loopRequirementMet = (typeof hasCurrentLoopAbyssRequirementClear === 'function') ? hasCurrentLoopAbyssRequirementClear(game.season || 1) : deepChaosUnlocked;
                let chaosLoopReady = (typeof hasCurrentLoopChaosRequirementClear === 'function') ? hasCurrentLoopChaosRequirementClear(game.season || 1) : loopRequirementMet;
                let cosmosLoopReady = (typeof hasCurrentLoopCosmosRequirementClear === 'function') ? hasCurrentLoopCosmosRequirementClear(game.season || 1) : false;
                let loopRequirementText = getLoopAbyssRequirementText(game.season || 1);
                let loopButtonsHtml = (game.season || 1) >= 31
                    ? `<button onclick="chooseLoopAdvancePath('chaos')" ${chaosLoopReady ? '' : 'disabled'}>혼돈 루프</button><button onclick="chooseLoopAdvancePath('cosmos')" ${cosmosLoopReady ? '' : 'disabled'}>우주계 루프</button>`
                    : `<button onclick="triggerSeasonReset()" ${loopRequirementMet ? '' : 'disabled'}>지금 즉시 루프</button>`;
                let unlockedDepthsForReward = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 21) : []; let highestUnlockedForReward = unlockedDepthsForReward.length > 0 ? Math.max(...unlockedDepthsForReward) : Math.floor(game.abyssEndlessDepth || 20); let clearedDepthForReward = Math.max(20, highestUnlockedForReward >= 21 ? (highestUnlockedForReward - 1) : highestUnlockedForReward); let expectedDepthGain = Math.max(0, Math.floor(clearedDepthForReward - (game.loopProgressBase.abyssEndlessDepth || 20)));
                let expectedLabGain = Math.max(0, Math.floor((game.labyrinthUnlockedMaxFloor || game.labyrinthFloor || 1) - (game.loopProgressBase.labyrinthUnlockedMaxFloor || 1)));
                let expectedBossGain = (game.loopProgressCurrent.specialBosses || []).filter(id => !(game.loopProgressBase.specialBosses || []).includes(id)).length;
                let woodsmanScore = Math.max(0, Math.floor(game.woodsmanPendingScore || 0));
                let woodsmanSettled = Math.max(0, Math.floor(game.woodsmanSettledScore || 0));
                let expectedWoodsmanGain = Math.floor(Math.sqrt(Math.max(0, woodsmanScore - woodsmanSettled)) / 25);
                let deepStats = game.loopDeepStats || {};
                let deepTotalLine = `총합 보너스: 생명력 +${Math.floor((deepStats.flatHp||0)*10)}, 피해 +${Math.floor((deepStats.flatDmg||0)*2)}, 공속 +${((deepStats.aspd||0)*1.2).toFixed(1)}%, 이속 +${((deepStats.move||0)*0.8).toFixed(1)}%, 물피감 +${((deepStats.dr||0)*0.5).toFixed(1)}%, 치명 +${((deepStats.crit||0)*0.6).toFixed(1)}%`;
                loop10Panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:8px;"><div><div style="color:#eedbff; font-weight:700; font-size:1.05em;">∞ 혼돈 심화 등반</div><div style="color:#aebde0; font-size:0.82em;">${loopRequirementText} 이후 무한 등반 · 현재 심화층 <strong style="color:#ffd68a;">${Math.floor(game.abyssEndlessDepth || 20)}</strong></div></div><div style="color:#e8dcff;">심화 루프 포인트: <strong style="color:#ffd68a;">${game.loopDeepPoints || 0}</strong></div></div>
                <div style="background:linear-gradient(160deg, rgba(84,59,136,0.22), rgba(26,31,56,0.35)); border:1px solid #5f4a93; border-radius:10px; padding:10px; margin-bottom:8px;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap;">${loopButtonsHtml}<button class="ominous-entry-btn" onclick="enterOutsideChaos()" ${(game.season||1)>=10 && loopRequirementMet?'':'disabled'}>☠️ 혼돈 밖 진입</button></div>
                    <div style="margin-top:6px; color:#9fb4d1;">기록된 층수 재진입</div><div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:6px;"><button onclick="enterDeepChaosPrompt()" ${deepChaosUnlocked ? '' : 'disabled'}>심화 혼돈 층수 선택 입장</button><span style="color:#9fb4d1;">21 ~ ${Math.max(21, Math.floor(game.abyssEndlessDepth || 20))}${deepChaosUnlocked ? '' : ` (혼돈 20 클리어 필요)`}</span></div>
                </div>
                <div style="margin-top:6px; color:#e0d4ff;">다음 루프 예상 획득: 혼돈심화 +${expectedDepthGain}층, 미궁 +${expectedLabGain}층, 특수보스 +${expectedBossGain}종, 나무꾼 +${expectedWoodsmanGain}</div>
                <div style="margin-top:4px; color:#9ec4f0;">${deepTotalLine}</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">${['flatHp','flatDmg','aspd','move','dr','crit'].map(key => `<button onclick="allocateLoopDeepStat('${key}')">심화 ${getStatName(key)} Lv.${(game.loopDeepStats||{})[key]||0} (+ 비용 ${getLoopDeepStatCost(key)})</button>`).join('')}</div>`;
            }
        }
    } else {
        document.getElementById('ui-abyss-passive-summary').innerHTML = `<span style="color:#7f8c8d;">혼돈(지도 ${ABYSS_START_ZONE_ID}번 이후)부터 개방됩니다.</span>`;
        document.getElementById('ui-abyss-passive-grid').innerHTML = '';
        let loop10Panel = document.getElementById('ui-loop10-panel');
        if (loop10Panel) {
            let loop10Open = (game.season || 1) >= 10;
            loop10Panel.style.display = loop10Open ? 'block' : 'none';
            if (loop10Open) {
                let deepStats = game.loopDeepStats || {};
                let deepTotalLine = `총합 보너스: 생명력 +${Math.floor((deepStats.flatHp||0)*10)}, 피해 +${Math.floor((deepStats.flatDmg||0)*2)}, 공속 +${((deepStats.aspd||0)*1.2).toFixed(1)}%, 이속 +${((deepStats.move||0)*0.8).toFixed(1)}%, 물피감 +${((deepStats.dr||0)*0.5).toFixed(1)}%, 치명 +${((deepStats.crit||0)*0.6).toFixed(1)}%`;
                loop10Panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-end; flex-wrap:wrap; margin-bottom:8px;"><div><div style="color:#eedbff; font-weight:700; font-size:1.05em;">∞ 혼돈 심화 등반</div><div style="color:#aebde0; font-size:0.82em;">루프 조건 달성 후 해금됩니다.</div></div><div style="color:#e8dcff;">심화 루프 포인트: <strong style="color:#ffd68a;">${game.loopDeepPoints || 0}</strong></div></div><div style="margin-top:4px; color:#9ec4f0;">${deepTotalLine}</div><div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-top:6px;">${['flatHp','flatDmg','aspd','move','dr','crit'].map(key => `<button onclick="allocateLoopDeepStat('${key}')">심화 ${getStatName(key)} Lv.${(game.loopDeepStats||{})[key]||0} (+ 비용 ${getLoopDeepStatCost(key)})</button>`).join('')}</div>`;
            }
        }
    }
    syncLoop10PanelCopies();
    let seasonRoadmapKeys = (game.unlockedSeasonContents || []).map(id => parseInt(String(id).replace('season_', ''), 10)).filter(v => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    document.getElementById('ui-season-content-roadmap').innerHTML = seasonRoadmapKeys.map(seasonNum => {
        let def = SEASON_CONTENT_ROADMAP[seasonNum];
        if (!def) return '';
        let unlocked = seasonNum <= game.season;
        let current = seasonNum === game.season;
        let stateColor = current ? '#f1c40f' : (unlocked ? '#2ecc71' : '#7f8c8d');
        let stateText = current ? '진행 중' : (unlocked ? '해금됨' : '잠김');
        let reqText = getLoopAbyssRequirementText(seasonNum);
        return `<div style="background:#121822; border:1px solid ${stateColor}; border-radius:8px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <strong style="color:${stateColor};">루프 ${seasonNum} - ${def.title}</strong><span style="color:${stateColor}; font-size:0.8em;">${stateText}</span>
            </div>
            <div style="color:#a8bdd3; font-size:0.82em; line-height:1.5;">• ${reqText}<br>${(def.features || []).map(v => `• ${v}`).join('<br>')}</div>
        </div>`;
    }).join('') || `<div style="color:#7f8c8d;">루프 1을 클리어하면 루프 이정표가 열립니다.</div>`;
    let renderSeasonNode = id => {
        let node = SEASON_NODES[id];
        let lv = getSeasonNodeLevel(id);
        let active = lv > 0;
        let evolved = isSeasonTreeEvolved();
        let cap = evolved ? 5 : 1;
        let reqMet = isSeasonNodeRequirementMet(node);
        let lockedHint = !!node.req && !reqMet ? `<br><span style="color:#d39ca7;">🔒 연결된 이전 노드를 먼저 활성화하세요</span>` : '';
        let statInfo = P_STATS[node.stat] || {};
        let suffix = statInfo.isPct ? '%' : '';
        let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
        let levelText = active ? ` (${lv}/${cap})` : '';
        let effectText = `${statInfo.name || node.stat} +${formatValue(node.stat, scaled)}${suffix}${levelText}`;
        let stateText = !reqMet
            ? '선행 노드 필요'
            : (active ? (lv >= cap ? (evolved ? '최대 레벨' : '트리 진화 후 강화 가능') : '클릭하여 강화') : '클릭하여 활성화');
        let refundLink = active ? `<br><span style=\"color:#e4b4b4; font-size:0.78em; text-decoration:underline; cursor:pointer;\" onclick=\"event.stopPropagation(); askRefundSeasonNode('${id}')\">환불</span>` : '';
        return `<div class=\"trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}\" ${reqMet ? `onclick=\"buySeason('${id}')\"` : ''}><div class=\"trait-title\">${node.name}</div><div class=\"trait-desc\">${node.desc}${lockedHint}<br><span style=\"color:#9bb9d4;\">${effectText}</span><span class=\"trait-card-state\">${stateText}</span>${refundLink}</div></div>`;
    };
    let visibleSeasonRows = SEASON_NODE_ROWS.filter((row, idx) => idx < 4 || (game.season || 1) >= 5);
    let seasonNodeIds = Object.keys(SEASON_NODES || {});
    let activeSeasonNodeCount = seasonNodeIds.filter(id => getSeasonNodeLevel(id) > 0).length;
    let seasonEvolved = isSeasonTreeEvolved();
    let seasonSummary = `<div class="trait-progress-summary"><div><strong>${seasonEvolved ? '진화 완료' : '기본 트리'}</strong><span>${activeSeasonNodeCount}/${seasonNodeIds.length} 노드 활성화</span></div><div><strong>${Math.max(0, Math.floor(game.seasonPoints || 0))} 포인트</strong><span>${seasonEvolved ? '각 노드를 5레벨까지 강화 가능' : `진화까지 ${Math.max(0, seasonNodeIds.length - activeSeasonNodeCount)}개 남음`}</span></div></div>`;
    document.getElementById('ui-season-tree').innerHTML = seasonSummary + visibleSeasonRows.map(row => `<div class="trait-row">${row.map(renderSeasonNode).join('')}</div>`).join('');

    }

    if (activeTabId === 'tab-traits') {
    if (game.ascendClass) {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'block';
        document.getElementById('ui-selected-class-name').innerText = `[ ${CLASS_TEMPLATES[game.ascendClass].name} ]`;
        let tree = getClassTreeDef(game.ascendClass);
        let renderAscend = id => {
            let node = tree[id];
            if (!node) return '';
            let active = game.ascendNodes.includes(id);
            let reqMet = isAscendNodeRequirementMet(node);
            let statLines = Array.isArray(node.stats) ? node.stats : [{ stat: node.stat, val: node.val }];
            let desc = statLines.map(line => {
                let statInfo = P_STATS[line.stat] || { name: getStatName(line.stat), isPct: false };
                return line.stat === 'suppCap' ? '보조스킬 장착 한도 +1' : `${statInfo.name || line.stat} +${line.val}${statInfo.isPct ? '%' : ''}`;
            }).join('<br>');
            let titleText = statLines.map(line => (P_STATS[line.stat] || { name: getStatName(line.stat) }).name || line.stat).join(' / ');
            let title = id === 'n10' ? '👑 궁극기' : ((id === 'n11' || id === 'n12') ? '💠 4차 핵심' : ((id === 'n13a' || id === 'n13b') ? '🌸 재능특화' : ((id === 'n13c' || id === 'n13d') ? '🌸 전직특화' : titleText)));
            let stateText = active ? '선택됨 · 클릭하여 반환' : (reqMet ? '선택 가능' : '선행 노드 필요');
            return `<div class="trait-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" ${active ? `onclick="askRefundAscendNode('${id}')"` : (!reqMet ? '' : `onclick="buyAscend('${id}')"`)}><div class="trait-title">${title}</div><div class="trait-desc">${desc}<span class="trait-card-state">${stateText}</span></div></div>`;
        };
        let coreRow = (tree.n11 || tree.n12) ? `<div class="trait-row">${renderAscend('n11')}${renderAscend('n12')}</div>` : '';
        let bloomRow = (tree.n13a || tree.n13c) ? `<div class="trait-row">${renderAscend('n13a')}${renderAscend('n13b')}</div><div class="trait-row">${renderAscend('n13c')}${renderAscend('n13d')}</div>` : '';
        let ascendSummary = `<div class="trait-progress-summary"><div><strong>${game.ascendNodes.length}개 노드 선택</strong><span>${CLASS_TEMPLATES[game.ascendClass].name} 전직 패시브</span></div><div><strong>${Math.max(0, Math.floor(game.ascendPoints || 0))} 포인트</strong><span>${game.bloomedClassThisLoop === game.ascendClass ? '5차 개화 노드 해금' : ((game.completedTrials || []).includes('trial_4') ? '4차 핵심 노드 해금' : '시련 진행으로 추가 해금')}</span></div></div>`;
        document.getElementById('ui-ascend-tree-container').innerHTML = ascendSummary + `<div class="trait-row">${renderAscend('n1')}</div><div class="trait-row">${renderAscend('n2')}${renderAscend('n3')}</div><div class="trait-row">${renderAscend('n4')}${renderAscend('n5')}${renderAscend('n6')}</div><div class="trait-row">${renderAscend('n7')}${renderAscend('n8')}${renderAscend('n9')}</div><div class="trait-row">${renderAscend('n10')}</div>${coreRow}${bloomRow}`;
        let kDefs = getClassKeystoneDefs(game.ascendClass);
        if (kDefs.length > 0) {
            game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
            // 선행 관계를 직관적으로 보여주기 위해 키스톤을 의존 깊이(티어)별 행으로 배치하고
            // 각 카드에 선행 키스톤 라벨 + 호버 시 선행 체인 강조를 부여한다.
            let kById = {};
            kDefs.forEach(k => { kById[k.id] = k; });
            let reqIdsOf = k => { let a = []; if (k.req) a.push(k.req); if (Array.isArray(k.reqAny)) a.push.apply(a, k.reqAny); return a.filter(id => kById[id]); };
            let depthCache = {};
            let depthOf = id => { if (depthCache[id] != null) return depthCache[id]; depthCache[id] = 0; let k = kById[id]; if (!k) return 0; if (k.fifthJobOnly) return depthCache[id] = kDefs.length; let rs = reqIdsOf(k); let d = rs.length ? 1 + Math.max.apply(null, rs.map(depthOf)) : 0; return depthCache[id] = d; };
            let kTiers = [];
            kDefs.forEach(k => { let d = depthOf(k.id); (kTiers[d] = kTiers[d] || []).push(k); });
            let kPts = Math.max(0, Math.floor(game.ascendKeystonePoints || 0));
            let kHtml = `<div style="margin-top:12px; color:#f0d7a6; font-weight:700; display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;"><span>키스톤 선택 (${game.ascendKeystones.length}/${CLASS_KEYSTONE_PICK_LIMIT}) · 보유 포인트 ${kPts}</span><button onclick="resetAscendKeystones()" style="padding:3px 8px; font-size:0.75em;">키스톤 초기화</button></div><div style="font-size:0.78em; color:#a7bdd9; margin-top:4px;">해제 비용: 정화의 오브 1개 · 전체 초기화 비용: 선택 개수만큼 · <span style="color:#9bc7ff;">카드에 마우스를 올리면 선행 키스톤이 연결되어 강조됩니다.</span></div>` + kTiers.filter(Boolean).map((tier, ti) => `<div class="trait-row${ti > 0 ? ' ks-tier-linked' : ''}">${tier.map(k => {
                let active = game.ascendKeystones.includes(k.id);
                let reqMet = isAscendKeystoneRequirementMet(k);
                let reqIds = reqIdsOf(k);
                let reqLabel = '';
                if (k.fifthJobOnly) {
                    reqLabel = `<div class="ks-prereq ${reqMet ? 'met' : 'unmet'}">⤴ 해금: 5차 전직(재능 개화)</div>`;
                } else if (reqIds.length > 0) {
                    let names = reqIds.map(id => (kById[id] || {}).name || id);
                    let joiner = Array.isArray(k.reqAny) ? ' 또는 ' : ', ';
                    reqLabel = `<div class="ks-prereq ${reqMet ? 'met' : 'unmet'}">⤴ 선행: ${names.join(joiner)}</div>`;
                }
                let clickAttr = active ? `onclick="refundAscendKeystone('${k.id}')"` : (!reqMet || game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT || kPts <= 0 ? '' : `onclick="buyAscendKeystone('${k.id}')"`);
                return `<div id="ks-card-${k.id}" data-ks-req="${reqIds.join(',')}" class="trait-card ks-card ${active ? 'active' : (!reqMet ? 'locked' : '')}" onmouseenter="highlightKeystoneChain('${k.id}', true)" onmouseleave="highlightKeystoneChain('${k.id}', false)" ${clickAttr}>${reqLabel}<div class="trait-title">★ ${k.name}${active ? ' ✓' : ''}</div><div class="trait-desc">${k.desc}${active ? '<br><span style="color:#9bc7ff;">(클릭 시 해제)</span>' : ''}</div></div>`;
            }).join('')}</div>`).join('');
            document.getElementById('ui-ascend-tree-container').innerHTML += kHtml;
        }
    } else if (game.ascendPoints > 0) {
        document.getElementById('ui-class-select').style.display = 'block';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'none';
        document.getElementById('ui-class-grid').innerHTML = Object.keys(CLASS_TEMPLATES).map(key => `<div class="class-card" onclick="selectClass('${key}')"><div style="font-weight:bold; color:#f1c40f; margin-bottom:5px;">${CLASS_TEMPLATES[key].name}</div><div style="font-size:0.85em; color:#aaa;">${CLASS_TEMPLATES[key].desc}</div></div>`).join('');
    } else {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'block';
        document.getElementById('ui-class-tree').style.display = 'none';
    }

    }

    __mark('progressionTabs');
    if (activeTabId === 'tab-codex') renderUniqueCodexUI();

    if (activeTabId === 'tab-skills') {
    let foldAttackInactive = !!game.gemFoldInactiveAttack;
    let foldSupportInactive = !!game.gemFoldInactiveSupport;
    let foldActiveBtn = document.getElementById('btn-skill-fold-active');
    let foldAttackBtn = document.getElementById('btn-skill-fold-inactive-attack');
    let foldSupportBtn = document.getElementById('btn-skill-fold-inactive-support');
    if (foldActiveBtn) foldActiveBtn.classList.toggle('active', !foldAttackInactive && !foldSupportInactive);
    if (foldAttackBtn) foldAttackBtn.classList.toggle('active', foldAttackInactive);
    if (foldSupportBtn) foldSupportBtn.classList.toggle('active', foldSupportInactive);
    let effectiveResonanceCap = getEffectiveResonanceCap();
    renderSkillLoadoutSummary(pStats, effectiveResonanceCap);
    let skyTowerSignatureState = (typeof ensureSkyTowerState === 'function') ? ensureSkyTowerState() : null;
    let skillPanelRenderSignature = JSON.stringify({
        activeSkill: game.activeSkill || '',
        skills: game.skills || [],
        supports: game.supports || [],
        equippedSupports: game.equippedSupports || [],
        equippedSummonSkills: game.equippedSummonSkills || [],
        summonSkillCounts: game.summonSkillCounts || {},
        sealedSkills: game.sealedSkills || [],
        sealedSupports: game.sealedSupports || [],
        gemData: game.gemData || {},
        supportGemData: game.supportGemData || {},
        skyGemEnhancements: game.skyGemEnhancements || {},
        gemEnhanceTargetSkill: game.gemEnhanceTargetSkill || '',
        currencies: {
            bossCore: game.currencies.bossCore || 0,
            skyEssence: game.currencies.skyEssence || 0,
            awakenedEcho: game.currencies.awakenedEcho || 0,
            gemShard: game.currencies.gemShard || 0
        },
        skyTower: {
            condensedPower: Math.max(0, Math.floor((skyTowerSignatureState && skyTowerSignatureState.condensedPower) || 0)),
            gemBoosts: (skyTowerSignatureState && skyTowerSignatureState.gemBoosts) || {}
        },
        filters: { skill: sf.skill || '', support: sf.support || '' },
        foldAttackInactive: foldAttackInactive,
        foldSupportInactive: foldSupportInactive,
        suppCap: pStats.suppCap || 0,
        resonanceCap: effectiveResonanceCap,
        gemEnhanceUnlocked: !!game.gemEnhanceUnlocked,
        gemEngraverLevel: typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1,
        inscriptionCostReduction: typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('inscriptionCostReducePct') : 0,
        gemQualityCostReduction: typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('gemQualityCostReducePct') : 0,
        season: game.season || 1
    });
    if (skillPanelRenderSignature !== lastSkillPanelRenderSignature) {
        lastSkillPanelRenderSignature = skillPanelRenderSignature;
    renderGemResearchPanel();
    let resonancePower = effectiveResonanceCap;
    let sealedSkills = Array.isArray(game.sealedSkills) ? game.sealedSkills : [];
    let sealedSupports = Array.isArray(game.sealedSupports) ? game.sealedSupports : [];
    let skillsRows = game.skills.filter(name => {
        let def = SKILL_DB[name] || {};
        let statText = Array.isArray(def.stats) ? def.stats.map(st => getStatName(st.id || st.stat || '')).join(' ') : '';
        let searchable = [
            name,
            Array.isArray(def.tags) ? def.tags.join(' ') : '',
            String(def.desc || ''),
            String(def.type || ''),
            String(def.ele || ''),
            String(def.targetMode || ''),
            statText
        ].join(' ');
        if (!matchSearchQuery(searchable, sf.skill)) return false;
        if (!foldAttackInactive) return true;
        return name === game.activeSkill || (isSummonAttackSkillGem(name) && Array.isArray(game.equippedSummonSkills) && game.equippedSummonSkills.includes(name));
    }).map(name => renderAttackGemCard(name, highlightSearchText(name, sf.skill))).join('');
    let sealedSkillRows = sealedSkills.filter(name => {
        let def = SKILL_DB[name] || {};
        let statText = Array.isArray(def.stats) ? def.stats.map(st => getStatName(st.id || st.stat || '')).join(' ') : '';
        let searchable = [
            name,
            Array.isArray(def.tags) ? def.tags.join(' ') : '',
            String(def.desc || ''),
            String(def.type || ''),
            String(def.ele || ''),
            String(def.targetMode || ''),
            statText
        ].join(' ');
        return matchSearchQuery(searchable, sf.skill);
    }).map(name => renderSealedGemCard(name, highlightSearchText(name, sf.skill), false)).join('');
    let skillsHtml = skillsRows;
    if (!foldAttackInactive && sealedSkillRows) skillsHtml += sealedSkillRows;
    let skillsListEl = document.getElementById('ui-skills-list');
    let skillActions = foldAttackInactive ? '' : '<button onclick="sealAllInactiveSkillGems()">미사용 공격 젬 일괄 봉인</button>';
    let skillsRenderSig = `${skillsHtml}::${skillActions}`;
    if (skillsListEl && skillsListEl.dataset.renderSig !== skillsRenderSig) {
        renderSearchSection('ui-skills-list', 'skill', '공격 젬 이름·태그 검색', skillsHtml, '', skillActions);
        skillsListEl = document.getElementById('ui-skills-list');
        skillsListEl.dataset.renderSig = skillsRenderSig;
    }

    let suppCountEl = document.getElementById('ui-supp-count');
    let suppMaxEl = document.getElementById('ui-supp-max');
    let suppResonanceEl = document.getElementById('ui-resonance');
    if (suppCountEl) suppCountEl.innerText = game.equippedSupports.length;
    if (suppMaxEl) suppMaxEl.innerText = pStats.suppCap;
    if (suppResonanceEl) {
        let used = (game.equippedSupports || []).reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        suppResonanceEl.innerText = `${Math.max(0, getEffectiveResonanceCap() - used)}`;
    }
    let supportRows = game.supports.filter(name => {
        let def = SUPPORT_GEM_DB[name] || {};
        let statText = Array.isArray(def.stats) ? def.stats.map(st => getStatName(st.id || st.stat || '')).join(' ') : '';
        let searchable = [
            name,
            Array.isArray(def.tags) ? def.tags.join(' ') : '',
            String(def.desc || ''),
            String(def.type || ''),
            String(def.ele || ''),
            String(def.targetMode || ''),
            statText
        ].join(' ');
        if (!matchSearchQuery(searchable, sf.support)) return false;
        if (!foldSupportInactive) return true;
        return game.equippedSupports.includes(name);
    }).map(name => renderSupportGemCard(name, highlightSearchText(name, sf.support))).join('');
    let sealedSupportRows = sealedSupports.filter(name => {
        let def = SUPPORT_GEM_DB[name] || {};
        let statText = Array.isArray(def.stats) ? def.stats.map(st => getStatName(st.id || st.stat || '')).join(' ') : '';
        let searchable = [
            name,
            Array.isArray(def.tags) ? def.tags.join(' ') : '',
            String(def.desc || ''),
            String(def.type || ''),
            String(def.ele || ''),
            String(def.targetMode || ''),
            statText
        ].join(' ');
        return matchSearchQuery(searchable, sf.support);
    }).map(name => renderSealedGemCard(name, highlightSearchText(name, sf.support), true)).join('');
    let supportHtml = supportRows;
    if (!foldSupportInactive && sealedSupportRows) supportHtml += sealedSupportRows;
    let supportListEl = document.getElementById('ui-support-list');
    let supportActions = foldSupportInactive ? '' : '<button onclick="sealAllInactiveSupportGems()">미사용 보조 젬 일괄 봉인</button>';
    let supportRenderSig = `${supportHtml}::${supportActions}`;
    if (supportListEl && supportListEl.dataset.renderSig !== supportRenderSig) {
        renderSearchSection('ui-support-list', 'support', '보조 젬 이름·효과 검색', supportHtml, '', supportActions);
        supportListEl = document.getElementById('ui-support-list');
        supportListEl.dataset.renderSig = supportRenderSig;
    }

    let gemEnhanceOpen = !!game.gemEnhanceUnlocked;
    let gemEnhanceHeader = document.getElementById('ui-gem-enhance-header');
    let gemEnhancePanel = document.getElementById('ui-gem-enhance-panel');
    let skillEnhanceBtn = document.getElementById('btn-skill-tab-enhance');
    if (gemEnhanceHeader && gemEnhancePanel) {
        gemEnhanceHeader.style.display = gemEnhanceOpen ? '' : 'none';
        gemEnhancePanel.style.display = gemEnhanceOpen ? '' : 'none';
        if (skillEnhanceBtn) {
            skillEnhanceBtn.disabled = !gemEnhanceOpen;
            skillEnhanceBtn.style.opacity = gemEnhanceOpen ? '1' : '0.45';
            skillEnhanceBtn.title = gemEnhanceOpen ? '' : '군주의 핵 또는 창공의 힘을 처음 획득하면 개방됩니다.';
        }
        if (!gemEnhanceOpen && game.skillSubtab === 'skill-tab-enhance') game.skillSubtab = 'skill-tab-equip';
        if (gemEnhanceOpen) {
            let active = (typeof getGemEnhanceTargetSkill === 'function') ? getGemEnhanceTargetSkill() : game.activeSkill;
            let equippedEnhanceTargets = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
            if ((!active || !equippedEnhanceTargets.includes(active)) && equippedEnhanceTargets.length > 0) active = equippedEnhanceTargets[0];
            let targetButtons = equippedEnhanceTargets.map(name => renderGemEnhanceTargetCard(name, name === active)).join('');
            let isGem = !!(SKILL_DB[active] && SKILL_DB[active].isGem);
            let activeSlots = isGem && typeof getSkyEnhancementSlotsForSkill === 'function' ? getSkyEnhancementSlotsForSkill(active) : [null, null, null, null, null];
            let activeEnh = getSkyEnhancementForSkill(active);
            let activeGem = isGem ? normalizeGemRecord((game.gemData || {})[active]) : null;
            let bossNeed = activeGem ? ((activeGem.bossCoreLevel || 0) + 1) : 1;
            let gemExpertLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('gemEngraver') || 1)) : 1;
            let qualityDiscount = typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('gemQualityCostReducePct') : 0;
            let qualityNeed = activeGem ? Math.max(1, Math.floor((1 + Math.floor((activeGem.quality || 0) / 5)) * (1 - qualityDiscount))) : 1;
            let awakenReady = !!(activeGem && !activeGem.awakened && (activeGem.level || 1) >= 20 && gemExpertLv >= 15);
            let skyNeed = activeGem ? ((activeGem.skyCoreLevel || 0) + 1) : 1;
            let engraveCap = activeGem ? (activeGem.skyEnhanceCap || 1) : 1;
            let selectedSlot = typeof getSelectedGemEngraveSlot === 'function' ? getSelectedGemEngraveSlot() : 0;
            if (selectedSlot >= engraveCap) selectedSlot = Math.max(0, engraveCap - 1);
            game.gemEngraveSelectedSlot = selectedSlot;
            let permanentSkyBoost = isGem && typeof getSkyTowerGemBoostLevel === 'function' ? getSkyTowerGemBoostLevel(active) : 0;
            let permanentSkyCost = isGem && typeof getSkyTowerGemBoostCost === 'function' ? getSkyTowerGemBoostCost(active) : 0;
            let permanentSkyMax = typeof getSkyTowerGemBoostMaxLevel === 'function' ? getSkyTowerGemBoostMaxLevel() : 3;
            let condensedPower = (typeof ensureSkyTowerState === 'function' ? ensureSkyTowerState().condensedPower : 0) || 0;
            let coreDone = !!(activeGem && activeGem.bossCoreLevel >= 5 && activeGem.skyCoreLevel >= 5);
            let slotDone = !!(activeGem && engraveCap >= 5);
            let engraveFilled = !!(activeGem && activeEnh.length >= engraveCap);
            let activeDef = SKILL_DB[active] || {};
            let activeMeta = getGemCardMeta(activeDef);
            let activePresentation = isGem ? getUiGemPresentation(active, false) : null;
            let growthSummary = isGem ? getGemGrowthSummaryHtml(active, activePresentation) : '';
            let activeOptions = activeEnh.map(id => GEM_SKY_ENHANCEMENTS[id] ? GEM_SKY_ENHANCEMENTS[id].name : id).join(', ') || '적용된 각인 없음';
            document.getElementById('ui-gem-enhance-target').innerHTML = `<div class="gem-target-list">${targetButtons || '<span class="gem-process-empty">장착 중인 공격 젬 없음</span>'}</div>` + (isGem
                ? `<div class="gem-target-profile element-${activeMeta.className}">${renderSkillGemArt(active, 'gem-target-profile-icon', { eager: true })}<div><small>현재 선택 · ${activeMeta.elementLabel} ${activeMeta.typeLabel}</small><strong>${escapeHTML(active)}</strong><p>${escapeHTML(activeDef.desc || '')}</p></div></div>${growthSummary}<div class="gem-enhance-status"><span class="gem-status-chip ${coreDone ? 'done' : ''}">${coreDone ? '핵 강화 완료' : '핵 강화 진행 중'}</span><span class="gem-status-chip ${slotDone ? 'done' : ''}">${slotDone ? '슬롯 최대' : `각인 슬롯 ${engraveCap}/5`}</span><span class="gem-status-chip ${engraveFilled ? 'done' : ''}">${engraveFilled ? '슬롯 사용 완료' : `빈 슬롯 ${Math.max(0, engraveCap - activeEnh.length)}`}</span></div><div class="gem-current-inscriptions"><span>현재 각인</span><strong>${escapeHTML(activeOptions)}</strong></div>`
                : '<div class="gem-process-empty">공격 젬을 선택하면 성장 정보가 표시됩니다.</div>');
            renderGemResourceStrip(activeGem, gemExpertLv, condensedPower);
            renderGemEngraveSlots(activeSlots, engraveCap);
            renderSupportGemProcessList(gemExpertLv);
            let upgradeBtns = [];
            let currentTotalGemLevel = Math.max(1, Math.floor((activePresentation && activePresentation.totalLevel) || 1));
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.bossCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('bossCore', 1)" ${!isGem || (activeGem && activeGem.bossCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.bossCoreLevel >= 5 ? '✅ 군주의 핵 강화 완료' : '군주의 핵 강화'}</strong><br><small>보유 ${game.currencies.bossCore || 0} / 필요 ${bossNeed} · ${activeGem && activeGem.bossCoreLevel >= 5 ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.skyCoreLevel >= 5 ? 'done' : ''}" onclick="upgradeActiveGem('skyEssence', 1)" ${!isGem || (activeGem && activeGem.skyCoreLevel >= 5) ? 'disabled' : ''}><strong>${activeGem && activeGem.skyCoreLevel >= 5 ? '✅ 창공의 힘 강화 완료' : '창공의 힘 강화'}</strong><br><small>보유 ${game.currencies.skyEssence || 0} / 필요 ${skyNeed} · ${activeGem && activeGem.skyCoreLevel >= 5 ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${permanentSkyBoost >= permanentSkyMax ? 'done' : ''}" onclick="upgradeActiveGemWithCondensedSkyPower()" ${!isGem || permanentSkyBoost >= permanentSkyMax ? 'disabled' : ''}><strong>${permanentSkyBoost >= permanentSkyMax ? '✅ 응축 창공 강화 완료' : '응축 창공 영구 강화'}</strong><br><small>루프 초기화 없음 · 보유 ${Math.floor(condensedPower)} / 필요 ${permanentSkyCost} · ${permanentSkyBoost >= permanentSkyMax ? '최대 단계' : `적용 후 최종 Lv.${currentTotalGemLevel + 1}`}</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && (activeGem.quality || 0) >= 20 ? 'done' : ''}" onclick="upgradeActiveGemQuality()" ${!isGem || gemExpertLv < 8 || (activeGem && (activeGem.quality || 0) >= 20) ? 'disabled' : ''}><strong>${activeGem && (activeGem.quality || 0) >= 20 ? '✅ 퀄리티 완료' : '젬 퀄리티 강화'}</strong><br><small>젬 각인사 Lv.8 · 군주의 핵 ${game.currencies.bossCore || 0}/${qualityNeed} · 피해·속도 배율 +0.5%</small></button>`);
            upgradeBtns.push(`<button class="gem-upgrade-btn ${activeGem && activeGem.awakened ? 'done' : ''}" onclick="awakenActiveGemCandidate()" ${!isGem || !awakenReady || (game.currencies.awakenedEcho || 0) < 3 ? 'disabled' : ''}><strong>${activeGem && activeGem.awakened ? '✅ 각성 젬' : '각성 젬 변환'}</strong><br><small>각인사 Lv.15 · 기본 Lv.20 · 각성 잔향 ${game.currencies.awakenedEcho || 0}/3 · ${activeGem && activeGem.awakened ? '각성 완료' : `적용 후 최종 Lv.${currentTotalGemLevel + 2}`}</small></button>`);
            document.getElementById('ui-gem-upgrade-actions').innerHTML = upgradeBtns.join('') || `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 젬 강화 재료가 없습니다.</div>`;
            if ((game.season || 1) >= 4) {
                document.getElementById('ui-gem-enhance-options').innerHTML = `<div class="gem-engrave-slot-guide"><strong>전체 각인</strong><span>각인을 누르면 빈 슬롯에 적용되고, 적용 중인 각인을 다시 누르면 해제됩니다. 특정 슬롯을 교체하려면 위 슬롯을 누르세요.</span></div>` + Object.values(GEM_SKY_ENHANCEMENTS).map(enh => renderSkyEnhancementOption(enh, activeSlots, gemExpertLv, isGem)).join('');
            } else {
                document.getElementById('ui-gem-enhance-options').innerHTML = '<div class="gem-process-empty">창공 각인은 루프 4부터 해금됩니다.</div>';
            }
        }
    }

    }

    }

    __mark('codex+skills');
    game.talismanBoard = Array.isArray(game.talismanBoard) ? game.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (game.talismanBoard.length < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)) game.talismanBoard.push(null);
    game.talismanInventory = Array.isArray(game.talismanInventory) ? game.talismanInventory : [];
    game.talismanPlacements = (game.talismanPlacements && typeof game.talismanPlacements === 'object') ? game.talismanPlacements : {};
    if (talismanTabActive) {
    let talismanUnlockedSet = getTalismanUnlockedCellsSet();
    document.getElementById('ui-talisman-board-size').innerText = talismanUnlockedSet.size;
    document.getElementById('ui-talisman-board-size2').innerText = TALISMAN_BOARD_MASK.size;
    document.getElementById('ui-talisman-currency').innerHTML = `${renderSealShardBadge('sealShard')} <strong>${game.currencies.sealShard || 0}</strong> &nbsp; ${renderSealShardBadge('strongSealShard')} <strong>${game.currencies.strongSealShard || 0}</strong> &nbsp; ${renderSealShardBadge('radiantSealShard')} <strong>${game.currencies.radiantSealShard || 0}</strong>`;
    let unseal = game.talismanUnseal;
    if (!unseal) {
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:8px; color:#9fc4ea;">개별 해제는 여러 후보 중 하나를 고를 수 있습니다. 빠른 해제는 선택 과정 없이 최대 10개를 즉시 보관합니다.</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="startTalismanUnseal('sealShard')" ${(game.currencies.sealShard || 0) <= 0 ? 'disabled' : ''}>봉인편린 해제</button>
                <button onclick="startBulkTalismanUnseal('sealShard')" ${(game.currencies.sealShard || 0) <= 0 ? 'disabled' : ''}>봉인편린 일괄 해제 (최대 10)</button>
                <button onclick="startTalismanUnseal('strongSealShard')" ${(game.currencies.strongSealShard || 0) <= 0 ? 'disabled' : ''}>[강력한 기운] 봉인편린 해제</button>
                <button onclick="startBulkTalismanUnseal('strongSealShard')" ${(game.currencies.strongSealShard || 0) <= 0 ? 'disabled' : ''}>[강력] 일괄 해제 (최대 10)</button>
                <button onclick="startTalismanUnseal('radiantSealShard')" ${(game.currencies.radiantSealShard || 0) <= 0 ? 'disabled' : ''}>[찬란한 기운] 봉인편린 해제</button>
                <button onclick="startBulkTalismanUnseal('radiantSealShard')" ${(game.currencies.radiantSealShard || 0) <= 0 ? 'disabled' : ''}>[찬란] 일괄 해제 (최대 10)</button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px; padding-top:8px; border-top:1px solid #29415a;">
                <button onclick="exchangeTalismanShards('strong')" ${(game.currencies.sealShard || 0) < 80 ? 'disabled' : ''}>편린 80 → 강력 편린 1</button>
                <button onclick="exchangeTalismanShards('radiant')" ${(game.currencies.strongSealShard || 0) < 40 ? 'disabled' : ''}>강력 편린 40 → 찬란 편린 1</button>
            </div>
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                <button onclick="salvageAllTalismansInInventory()" ${(game.talismanInventory || []).some(t => !isLockedInventoryObject(t)) ? '' : 'disabled'} style="background:#6e3f3f; border-color:#8f5959;">부적 일괄 해체</button>
            </div>`;
    } else {
        let shapeStyle = getTalismanShapeStyle(unseal.current.shape);
        let currentLabel = unseal.current.special ? `${getTalismanDisplayName(unseal.current)} · ${getTalismanSpecialDescription(unseal.current)}` : `${unseal.current.statName} +${formatValue(unseal.current.stat, unseal.current.value)}`;
        document.getElementById('ui-talisman-unseal').innerHTML = `<div style="margin-bottom:6px; display:flex; align-items:center; gap:8px; flex-wrap:wrap;" data-info-tooltip-anchor="1" onmouseenter="showTalismanUnsealTooltip(event)" onmousemove="showTalismanUnsealTooltip(event)" onmouseleave="hideInfoTooltip()">${renderTalismanMiniShape(unseal.current.shape, { cellSize: 8, gap: 1, markDir: unseal.current.markDir })}<span>후보: <strong style="color:${shapeStyle.color};">${escapeHTML(currentLabel)}</strong> <span style="color:#9cb5d0;">(${unseal.current.rarity})</span></span>${renderSealShardBadge(unseal.source)}</div>
            <div style="margin-bottom:8px; color:#8fa7c3;">남은 형태 확인 기회: ${unseal.rollsLeft}/${unseal.totalRolls}</div>
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button onclick="acceptCurrentTalisman()">선택</button>
                <button onclick="previewNextTalismanShape()" ${unseal.rollsLeft <= 1 ? 'disabled' : ''}>다음 형태 보기</button>
                <button onclick="discardCurrentTalisman()" style="background:#6e3f3f; border-color:#8f5959;">파괴</button>
            </div>`;
    }
    let selectedTalismanId = game.talismanSelectedId;
    const talismanRows = game.talismanInventory.filter(t => {
        const stats = (Array.isArray(t.stats) ? t.stats.map(s => `${s.stat || s.id || ''} ${s.label || ''} ${getStatName(s.stat || s.id || '')}`).join(' ') : '');
        return matchSearchQuery(`${t.name || ''} ${t.shape || ''} ${t.rarity || ''} ${t.statName || ''} ${stats}`, sf.talisman);
    });
    let talismanRowsHtml = talismanRows.map(t => {
        let selected = selectedTalismanId === t.id;
        let shapeStyle = getTalismanShapeStyle(t.shape);
        let q = sf.talisman;
        let isUniqueTalisman = !!t.isUnique || t.rarity === '고유' || t.rarity === 'unique';
        let talismanCardClass = isUniqueTalisman ? 'item-card--unique-special' : '';
        let talismanTitleClass = isUniqueTalisman ? 'unique' : (selected ? 'rare' : 'magic');
        let talismanUniqueBadge = isUniqueTalisman ? '<span class="unique-inventory-badge">✨ 고유</span>' : '';
        let rollQuality = getTalismanRollQuality(t);
        let qualityBadge = rollQuality === null ? '' : `<span class="talisman-quality-badge ${rollQuality >= 75 ? 'high' : (rollQuality < 40 ? 'low' : '')}">품질 ${rollQuality}%</span>`;
        return `<div class="item-card ${selected ? 'selected' : ''} ${talismanCardClass}" style="min-height:72px;" onclick="selectTalismanInventoryItem(${t.id})" data-info-tooltip-anchor="1" onmouseenter="showTalismanInventoryTooltip(event, ${t.id})" onmousemove="showTalismanInventoryTooltip(event, ${t.id})" onmouseleave="hideInfoTooltip()"><div style="display:flex; align-items:flex-start; justify-content:space-between; gap:8px;"><div style="display:flex; align-items:center; gap:7px;">${renderTalismanMiniShapeFromCells(t.cells, t.shape, { markDir: t.markDir })}<div><div class="item-title ${talismanTitleClass}" style="${isUniqueTalisman ? '' : `color:${shapeStyle.color};`}">${isLockedInventoryObject(t) ? '🔒 ' : ''}${talismanUniqueBadge}${highlightSearchText(getTalismanDisplayName(t), q)} ${t.stat ? ` · ${highlightSearchText(t.statName, q)} +${formatValue(t.stat, t.value)}` : ''}</div><div class="item-base-line" style="color:#b7d4f2;">${t.rarity} ${renderSealShardBadge(t.source || 'sealShard')} ${qualityBadge} ${t.special ? `· 효과: ${highlightSearchText(getTalismanSpecialDescription(t), q)}` : ''}</div></div></div><div style="display:flex; gap:4px;"><button onclick="event.stopPropagation(); rotateTalismanInInventory(${t.id})" style="padding:4px 8px; min-height:30px;">회전</button><button onclick="event.stopPropagation(); toggleTalismanLock(${t.id})" style="padding:4px 8px; min-height:30px;">${getLockButtonLabel(t)}</button>${t.waxedByBeeswax ? `<button disabled style="padding:4px 8px; min-height:30px;">밀랍</button>` : `<button onclick="event.stopPropagation(); applyBeeswaxToTalisman(${t.id})" ${(game.currencies.beeswax || 0) > 0 ? '' : 'disabled'} style="padding:4px 8px; min-height:30px;">밀랍</button>`}<button onclick="event.stopPropagation(); destroyTalismanFromInventory(${t.id})" ${isLockedInventoryObject(t) ? 'disabled' : ''} style="background:#6e3f3f; border-color:#8f5959; padding:4px 8px; min-height:30px;">해체</button></div></div></div>`;
    }).join('');
    let talismanTools = `<button onclick="bulkSalvageTalismansBySearch(false)" style="background:#6e3f3f; border-color:#8f5959;">검색 항목 해체</button><button onclick="bulkSalvageTalismansBySearch(true)" style="background:#4b2f55; border-color:#6e4a78;">미검색 항목 해체</button>`;
    renderSearchSection('ui-talisman-inventory', 'talisman', '부적 검색 (이름/형태/옵션)', talismanRowsHtml, `<div style="grid-column:1/-1; color:#7f8c8d;">보유한 부적이 없습니다.</div>`, talismanTools);
    let selectedPlacementTalisman = (game.talismanInventory || []).find(row => row && row.id === game.talismanSelectedId) || null;
    document.getElementById('ui-talisman-board').innerHTML = Array.from({ length: TALISMAN_BOARD_W * TALISMAN_BOARD_H }, (_, i) => {
        let x = i % TALISMAN_BOARD_W;
        let y = Math.floor(i / TALISMAN_BOARD_W);
        let unlocked = isTalismanCellUnlocked(x, y);
        let id = game.talismanBoard[i];
        let placed = id ? (game.talismanPlacements && game.talismanPlacements[id] ? game.talismanPlacements[id].talisman : null) : null;
        let shape = placed ? placed.shape : null;
        let shapeStyle = shape ? getTalismanShapeStyle(shape) : null;
        let valid = isTalismanBoardCellValid(x,y);
        let coreOpen = isTalismanCellInitiallyUnlocked(x, y);
        if (!valid) return `<div style="width:42px; height:42px; border:0; background:transparent; border-radius:8px; opacity:0; pointer-events:none;"></div>`;
        let cellColor = coreOpen ? 'radial-gradient(circle at 30% 25%, #595f69 0%, #3a3f48 52%, #1f2329 100%)' : (!unlocked ? 'linear-gradient(180deg, #05070c 0%, #0b0e14 100%)' : 'radial-gradient(circle at 30% 25%, #666c76 0%, #434a54 58%, #252b32 100%)');
        if (id) cellColor = (shapeStyle ? `linear-gradient(145deg, rgba(255,255,255,0.3) 0%, ${shapeStyle.color} 42%, rgba(10,12,17,0.22) 100%)` : '#355d46');
        let label = '';
        let border = !unlocked ? '#5a616b' : (id && shapeStyle ? shapeStyle.color : '#767d88');
        let textColor = !unlocked ? '#d5dbe6' : (id && shapeStyle ? shapeStyle.color : '#d7dbe2');
        let unlockedSet = getTalismanUnlockedCellsSet();
        let extraUnlocked = Math.max(0, unlockedSet.size - 16);
        let unlockCost = getTalismanExpandCost(extraUnlocked);
        let lockTitle = ''; // 기본 브라우저 툴팁 비활성화 (커스텀 툴팁 사용)
        let isHoverGroup = !!(id && activeTalismanHoverId && id === activeTalismanHoverId);
        let surfaceShadow = id
            ? `inset 0 1px 0 rgba(255,255,255,0.34), 0 2px 6px rgba(0,0,0,0.35), 0 0 8px ${shapeStyle ? shapeStyle.glow : 'rgba(120,180,240,0.25)'}`
            : 'inset 0 2px 4px rgba(0,0,0,0.55), inset 0 -1px 2px rgba(255,255,255,0.08), 0 1px 2px rgba(0,0,0,0.25)';
        if (isHoverGroup) surfaceShadow = `0 0 0 2px rgba(255,230,140,.85), 0 0 18px rgba(255,210,110,.55), ${surfaceShadow}`;
        let placedTitle = '';
        let hoverHandlers = id
            ? ` data-info-tooltip-anchor="1" data-talisman-hover-id="${id}" onmouseenter="showTalismanBoardTooltip(event, ${id})" onmousemove="showTalismanBoardTooltip(event, ${id})" onmouseleave="hideTalismanBoardTooltip(event, ${id})"`
            : (!unlocked
                ? ` data-info-tooltip-anchor="1" onmouseenter="showTalismanUnlockTooltip(event, ${x}, ${y})" onmousemove="showTalismanUnlockTooltip(event, ${x}, ${y})" onmouseleave="hideInfoTooltip()"`
                : (selectedPlacementTalisman ? ` data-info-tooltip-anchor="1" onmouseenter="showTalismanPlacementTooltip(event, ${x}, ${y})" onmousemove="showTalismanPlacementTooltip(event, ${x}, ${y})" onmouseleave="hideInfoTooltip()"` : ''));
        let placementClass = '';
        if (!id && unlocked && selectedPlacementTalisman) {
            let anchor = getTalismanAnchorCell(selectedPlacementTalisman);
            placementClass = canPlaceTalismanAt(selectedPlacementTalisman, x - anchor.x, y - anchor.y)
                ? ' talisman-placement-valid'
                : ' talisman-placement-invalid';
        }
        return `<button class="talisman-board-cell${placementClass}" onclick="onTalismanBoardCellClick(${x},${y})"${lockTitle}${placedTitle}${hoverHandlers} style="width:42px; height:42px; border:1px solid ${border}; background:${cellColor}; color:${textColor}; border-radius:10px; font-weight:bold; box-shadow:${surfaceShadow};">${label}</button>`;
    }).join('');
    }
    let talismanTotalEl = talismanTabActive ? document.getElementById('ui-talisman-total') : null;
    if (talismanTotalEl) {
        let summary = typeof calculateTalismanBoardEffects === 'function'
            ? calculateTalismanBoardEffects(game.talismanPlacements || {}, game.talismanBoard || [])
            : { entries: [], stats: {}, bossFinalDmgBonusPct: 0, suppressedIds: [], amplifiedIds: [] };
        let total = summary.stats || {};
        let rows = Object.keys(total).filter(stat => stat !== 'cosmosLightningVariance').map(stat => {
            let tone = getItemStatToneColor(stat);
            let label = stat === 'dr' ? '물리 피해 감소(%)' : getStatName(stat);
            let value = Number(total[stat]) || 0;
            return `<span style="color:${tone};">${label} ${value >= 0 ? '+' : '-'}${formatValue(stat, Math.abs(value))}</span>`;
        });
        let specialRows = [];
        if ((Number(summary.bossFinalDmgBonusPct) || 0) > 0) specialRows.push(`<span style="color:#ffe38a;">찰나: 보스 최종 피해 +${summary.bossFinalDmgBonusPct}%, 보스 체력 5% 이하 처형</span>`);
        if ((Number(total.cosmosLightningVariance) || 0) > 0) specialRows.push('<span style="color:#ffe083;">번개 피해 변동: 타격마다 최종 피해 0.8~1.5배</span>');
        let entryNames = Object.fromEntries((summary.entries || []).map(entry => [entry.talisman.id, getTalismanDisplayName(entry.talisman)]));
        if ((summary.suppressedIds || []).length > 0) specialRows.push(`<span style="color:#ff9a9a;">반발로 비활성: ${summary.suppressedIds.map(id => escapeHTML(entryNames[id] || '부적')).join(', ')}</span>`);
        if ((summary.amplifiedIds || []).length > 0) specialRows.push(`<span style="color:#8fe7b0;">반발로 기본 능력치 +25%: ${summary.amplifiedIds.map(id => escapeHTML(entryNames[id] || '부적')).join(', ')}</span>`);
        let allRows = rows.concat(specialRows);
        talismanTotalEl.innerHTML = allRows.length > 0
            ? `<div style="font-weight:800; color:#eaf3ff; border-bottom:1px solid #35506b; padding-bottom:6px; margin-bottom:6px;">부적으로 얻은 능력치 총합</div><div style="display:grid; gap:3px;">${allRows.map(row => `<div>• <strong>${row}</strong></div>`).join('')}</div>`
            : `<div style="font-weight:800; color:#eaf3ff; border-bottom:1px solid #35506b; padding-bottom:6px; margin-bottom:6px;">부적으로 얻은 능력치 총합</div><div style="color:#9fb4cb;">없음</div>`;
    }
    if (talismanTabActive && document.getElementById('talisman-sub-colony-ward')) {
        switchTalismanSubtab(game.talismanSubtab === 'talisman-sub-colony-ward' ? 'talisman-sub-colony-ward' : 'talisman-sub-board');
    }
    let journalList = activeTabId === 'tab-journal' ? document.getElementById('ui-journal-list') : null;
    if (journalList) {
        let unlocked = new Set((game.journalEntries || []).filter(id => JOURNAL_DB[id]));
        let orderedIds = JOURNAL_ENTRY_ORDER.filter(id => !!JOURNAL_DB[id]);
        let entries = orderedIds.map(id => ({ id: id, def: JOURNAL_DB[id] }));
        let getJournalCategory = id => {
            if (id === 'prologue' || /^act_\d+$/.test(id)) return '스토리';
            if (JOURNAL_DB[id] && JOURNAL_DB[id].hidden) return '숨겨진 기록';
            if (/^rival_/.test(id)) return '버려진 날';
            if (id === 'cosmos_astra') return '우주계 기록';
            if (['labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10'].includes(id)) return '탐험 기록';
            return '세계의 흔적';
        };
        let journalHintById = {
            prologue: '게임 시작',
            woodsman: '혼돈 밖의 나무꾼 격파',
            woodsman_echo: '혼돈 밖에서 나무꾼 완전 격파',
            star_wedge: '별쐐기를 획득해 패시브 트리에 장착',
            beehive_queen: '루프 8 벌집 여왕 격파',
            void_grand_breach: '루프 9 큰 구멍의 지배자 격파',
            labyrinth_10: '고대 미궁 10층 클리어',
            ocean_500: '심해 500m 가디언 격파',
            sky_tower_10: '창공의 탑 10층 클리어',
            time_rift_fusion: '시간의 균열에서 유물 1회 융합',
            colony_wave_10: '군락지 웨이브 10 클리어',
            rival_overheat: '버려진 두 번째 날 「과열」 격파',
            rival_dull: '버려진 세 번째 날 「무딤」 격파',
            rival_glutton: '버려진 네 번째 날 「탐식」 격파',
            rival_afterimage: '버려진 다섯 번째 날 「잔영」 격파',
            rival_backedge: '버려진 여섯 번째 날 「역린」 격파',
            rival_masterwork: '일곱 번째 날 「완성작」 격파',
            cosmos_astra: '우주계의 잔향체 아스트라 격파'
        };
        let getJournalHint = (id, def) => {
            if (def && def.hint) return def.hint;
            let actMatch = /^act_(\d+)$/.exec(id);
            if (actMatch) return `액트 ${actMatch[1]} 보스 처치`;
            return journalHintById[id] || '관련 콘텐츠 탐험';
        };
        let categoryOrder = ['스토리', '세계의 흔적', '탐험 기록', '버려진 날', '우주계 기록', '숨겨진 기록'];
        let categoryCounts = {};
        entries.forEach(({ id }) => {
            let category = getJournalCategory(id);
            if (!categoryCounts[category]) categoryCounts[category] = { total: 0, unlocked: 0 };
            categoryCounts[category].total++;
            if (unlocked.has(id)) categoryCounts[category].unlocked++;
        });
        let standardEntries = entries.filter(({ def }) => !def.hidden);
        let hiddenEntries = entries.filter(({ def }) => !!def.hidden);
        let unlockedCount = entries.filter(({ id }) => unlocked.has(id)).length;
        let standardUnlockedCount = standardEntries.filter(({ id }) => unlocked.has(id)).length;
        let hiddenUnlockedCount = hiddenEntries.filter(({ id }) => unlocked.has(id)).length;
        let rewardCount = entries.filter(({ id, def }) => unlocked.has(id) && !!(def.bonus || def.displayEffect)).length;
        let progressPct = standardEntries.length > 0 ? Math.floor(standardUnlockedCount / standardEntries.length * 100) : 0;
        let nextLocked = standardEntries.find(({ id }) => !unlocked.has(id) && !!getJournalEntryAction(id))
            || standardEntries.find(({ id }) => !unlocked.has(id))
            || hiddenEntries.find(({ id }) => !unlocked.has(id) && !!getJournalEntryAction(id))
            || hiddenEntries.find(({ id }) => !unlocked.has(id));
        let nextTarget = '';
        if (nextLocked) {
            let nextAction = getJournalEntryAction(nextLocked.id);
            let nextTitle = nextLocked.def.hidden ? '숨겨진 기록' : nextLocked.def.title;
            nextTarget = `<div class="journal-next-target">
                <div><span>다음 기록</span><strong>${nextTitle}</strong><small>${getJournalHint(nextLocked.id, nextLocked.def)}</small></div>
                ${nextAction ? `<button type="button" onclick="openJournalEntryAction('${nextLocked.id}')">${nextAction.label}</button>` : ''}
            </div>`;
        } else if (entries.length > 0) {
            nextTarget = `<div class="journal-next-target is-complete"><div><span>기록 완성</span><strong>모든 저널을 해금했습니다.</strong><small>영구 효과와 세계의 단서가 모두 활성화되었습니다.</small></div></div>`;
        }
        let summary = `<div class="journal-summary">
            <div class="journal-summary-main">
                <div><strong>주요 기록 ${standardUnlockedCount}/${standardEntries.length}</strong><span>전체 ${unlockedCount}/${entries.length} · 숨겨진 기록 ${hiddenUnlockedCount}/${hiddenEntries.length} · 영구 효과 ${rewardCount}개</span></div>
                <b>${progressPct}%</b>
            </div>
            <div class="journal-progress"><i style="width:${progressPct}%"></i></div>
            <div class="journal-category-strip">${categoryOrder.filter(name => categoryCounts[name]).map(name => {
                let count = categoryCounts[name];
                return `<span>${name} <b>${count.unlocked}/${count.total}</b></span>`;
            }).join('')}</div>
        </div>${nextTarget}`;
        let cards = categoryOrder.map(category => {
            let rows = entries.filter(({ id }) => getJournalCategory(id) === category);
            if (rows.length === 0) return '';
            return `<section class="journal-section">
                <div class="journal-section-title">${category}<span>${rows.filter(({ id }) => unlocked.has(id)).length}/${rows.length}</span></div>
                <div class="journal-card-grid">${rows.map(({ id, def }) => {
                    let isUnlocked = unlocked.has(id);
                    let displayTitle = isUnlocked || !def.hidden ? def.title : '히든 저널 - ???';
                    let rewardText = def.bonus ? def.bonus.label : def.displayEffect;
                    let action = !isUnlocked ? getJournalEntryAction(id) : null;
                    return `<article class="journal-card ${isUnlocked ? 'is-unlocked' : 'is-locked'} ${def.hidden ? 'is-hidden' : ''}">
                        <div class="journal-card-head"><strong>${displayTitle}</strong><span>${isUnlocked ? '해금' : '미해금'}</span></div>
                        <div class="journal-card-body">${isUnlocked
                            ? (def.lines || []).map(line => `<p>${line}</p>`).join('')
                            : `<p class="journal-hint">해금 조건 · ${getJournalHint(id, def)}</p>`}</div>
                        ${rewardText ? `<div class="journal-reward ${isUnlocked ? '' : 'is-preview'}">${isUnlocked ? '영구 효과' : '기록 보상'} · ${rewardText}</div>` : ''}
                        ${action ? `<button type="button" class="journal-card-action" onclick="openJournalEntryAction('${id}')">${action.label}</button>` : ''}
                    </article>`;
                }).join('')}</div>
            </section>`;
        }).join('');
        journalList.innerHTML = summary + cards;
    }

    __mark('talisman+journal');
    if (itemsTabActive) switchItemSubtab(game.itemSubtab || 'item-tab-equip');
    if (activeTabId === 'tab-skills') {
        renderSkillAutoRulePanel();
        switchSkillSubtab(game.skillSubtab || 'skill-tab-equip');
    }
    if (activeTabId === 'tab-map') switchMapSubtab(game.mapSubtab || 'map-tab-zones');
    __mark('end');
    let __ptot = __perfNow() - __pm[0][1];
    if (__ptot > 150 || (typeof window !== 'undefined' && window.__perfLog)) {
        let __parts = [];
        for (let i = 1; i < __pm.length; i++) __parts.push(`${__pm[i][0]}:${Math.round(__pm[i][1] - __pm[i - 1][1])}`);
        console.warn(`[perf] updateStaticUI ${Math.round(__ptot)}ms | ${__parts.join(' ')}`);
    }
}


function ensurePassiveTreeSearchSettings() {
    if (typeof game !== 'undefined' && game) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        if (typeof game.settings.passiveTreeSearch !== 'string') game.settings.passiveTreeSearch = passiveTreeSearch || '';
        if (typeof game.settings.passiveTreeFilter !== 'string') game.settings.passiveTreeFilter = passiveTreeFilter || 'all';
        passiveTreeSearch = game.settings.passiveTreeSearch;
        passiveTreeFilter = game.settings.passiveTreeFilter;
    }
    return { search: passiveTreeSearch || '', filter: passiveTreeFilter || 'all' };
}

function getPassiveTreeSearchState() {
    return ensurePassiveTreeSearchSettings();
}

function getPassiveTreeNodeSearchText(node) {
    if (!node) return '';
    let parts = [
        node.id,
        node.title,
        node.desc,
        getPassiveNodeDisplayName(node),
        getPassiveEffectLabel(node),
        getStatName(node.stat)
    ];
    return parts.filter(Boolean).join(' ').toLowerCase();
}

function getPassiveTreeNodeCategory(node) {
    let stat = node && node.stat;
    if (node && node.kind === 'void') return 'utility';
    if (['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'projectilePctDmg', 'crit', 'critDmg', 'ds', 'physIgnore', 'igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'].includes(stat)) return 'offense';
    if (['flatHp', 'pctHp', 'regen', 'leech', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'energyShieldRegen', 'deflectChance', 'dr', 'blockChance', 'blockChancePct', 'resF', 'resC', 'resL', 'resAll', 'resChaos', 'ailResIgnite', 'ailResShock', 'ailResFreeze', 'ailResPoison', 'ailResBleed'].includes(stat)) return 'defense';
    if (['firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg', 'elementalPctDmg', 'dotPctDmg', 'resPen'].includes(stat)) return 'element';
    if (['aspd', 'move', 'suppCap', 'gemLevel', 'expGain'].includes(stat) || (node && node.socketType === 'star_wedge')) return 'utility';
    return 'other';
}

function doesPassiveNodeMatchSearch(node, query) {
    let q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    return q.split(/\s+/).filter(Boolean).every(token => getPassiveTreeNodeSearchText(node).includes(token));
}

function doesPassiveNodeMatchFilter(node, filter) {
    let f = filter || 'all';
    if (f === 'all') return true;
    if (f === 'offense') return getPassiveTreeNodeCategory(node) === 'offense' || getPassiveTreeNodeCategory(node) === 'element';
    return getPassiveTreeNodeCategory(node) === f;
}

function getPassiveNodeSearchMatch(node) {
    let state = getPassiveTreeSearchState();
    let query = String(state.search || '').trim();
    let filter = state.filter || 'all';
    let active = !!query || filter !== 'all';
    if (!active) return { active: false, matches: true, query, filter };
    if (node && typeof getPassiveVisibility === 'function' && getPassiveVisibility(node.id) === 'hidden') {
        return { active: true, matches: false, query, filter };
    }
    return {
        active: true,
        matches: doesPassiveNodeMatchSearch(node, query) && doesPassiveNodeMatchFilter(node, filter),
        query,
        filter
    };
}

function setPassiveTreeSearchState(next) {
    let cur = ensurePassiveTreeSearchSettings();
    let search = next && next.search !== undefined ? String(next.search || '') : cur.search;
    let filter = next && next.filter !== undefined ? String(next.filter || 'all') : cur.filter;
    if (!['all', 'offense', 'defense', 'element', 'utility'].includes(filter)) filter = 'all';
    passiveTreeSearch = search;
    passiveTreeFilter = filter;
    if (typeof game !== 'undefined' && game) {
        if (!game.settings || typeof game.settings !== 'object') game.settings = {};
        game.settings.passiveTreeSearch = passiveTreeSearch;
        game.settings.passiveTreeFilter = passiveTreeFilter;
    }
    syncPassiveTreeSearchControls();
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
    if (document.getElementById('tab-char') && document.getElementById('tab-char').classList.contains('active')) {
        resizePassiveTreeCanvas(false);
        drawPassiveTree();
        lastPassiveTreeDrawAt = Date.now();
    }
}

function syncPassiveTreeSearchControls() {
    let state = ensurePassiveTreeSearchSettings();
    let input = document.getElementById('passive-search-input');
    if (input && input.value !== state.search) input.value = state.search;
    document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        let active = btn.dataset.passiveFilter === state.filter;
        btn.style.background = active ? '#2c5878' : '';
        btn.style.borderColor = active ? '#7fc7ff' : '';
        btn.style.color = active ? '#e8f7ff' : '';
        btn.style.boxShadow = active ? '0 0 10px rgba(127,199,255,0.24)' : '';
    });
}

function setupPassiveTreeSearchControls() {
    if (window.__passiveTreeSearchControlsBound) {
        syncPassiveTreeSearchControls();
        return;
    }
    window.__passiveTreeSearchControlsBound = true;
    let input = document.getElementById('passive-search-input');
    if (input) {
        input.addEventListener('input', () => setPassiveTreeSearchState({ search: input.value }));
    }
    document.querySelectorAll('[data-passive-filter]').forEach(btn => {
        btn.addEventListener('click', () => setPassiveTreeSearchState({ filter: btn.dataset.passiveFilter || 'all' }));
    });
    let clear = document.getElementById('passive-search-clear');
    if (clear) {
        clear.addEventListener('click', () => setPassiveTreeSearchState({ search: '', filter: 'all' }));
    }
    syncPassiveTreeSearchControls();
}

Object.assign(window, { getPassiveTreeSearchState, getPassiveNodeSearchMatch, setupPassiveTreeSearchControls, setPassiveTreeSearchState });


function closeVoidPassiveCraftOverlay() {
    let overlay = document.getElementById('void-passive-craft-overlay');
    if (overlay) overlay.remove();
}

function getVoidPassiveRefundState(nodeId) {
    let active = (game.passives || []).includes(nodeId);
    let hasScour = (game.currencies.scour || 0) >= 1;
    let connected = typeof canRefundPassiveNode === 'function' && canRefundPassiveNode(nodeId);
    return {
        enabled: active && hasScour && connected,
        reason: !active ? '활성화된 공허 패시브만 반환할 수 있습니다.'
            : (!connected ? '연결 유지에 필요한 노드는 반환할 수 없습니다.'
                : (!hasScour ? '정화의 오브가 부족합니다.' : '정화의 오브 1개를 소모해 반환합니다.'))
    };
}

function craftVoidPassiveFromOverlay(nodeId, currencyKey) {
    if (typeof applyVoidPassiveCurrency === 'function') applyVoidPassiveCurrency(nodeId, currencyKey);
    openVoidPassiveCraftOverlay(nodeId);
}

function refundVoidPassiveFromOverlay(nodeId) {
    let state = getVoidPassiveRefundState(nodeId);
    if (!state.enabled) return addLog(state.reason, 'attack-monster');
    closeVoidPassiveCraftOverlay();
    refundPassiveNode(nodeId);
}

async function askRefundPassiveNode(id) {
    if (!await requestGameConfirmation('선택한 패시브 노드를 반환하고 정화의 오브 1개를 소모합니다.', {
        title: '패시브 노드 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    refundPassiveNode(id);
}

function openVoidPassiveCraftOverlay(nodeId) {
    closeVoidPassiveCraftOverlay();
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog('공허 패시브만 제작할 수 있습니다.', 'attack-monster');
    let active = (game.passives || []).includes(node.id);
    let entry = typeof getVoidPassiveCraft === 'function' ? getVoidPassiveCraft(node.id) : { stats: [] };
    let stats = entry && Array.isArray(entry.stats) ? entry.stats : [];
    let hasStats = stats.length > 0;
    let canAugment = hasStats && stats.length < 2;
    let refundState = getVoidPassiveRefundState(node.id);
    let effectLabel = typeof getVoidPassiveEffectLabel === 'function' ? getVoidPassiveEffectLabel(node.id) : getPassiveEffectLabel(node);
    let overlay = document.createElement('div');
    overlay.id = 'void-passive-craft-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:10040;background:rgba(3,8,14,0.72);display:flex;align-items:center;justify-content:center;padding:18px;';
    overlay.onclick = event => { if (event.target === overlay) closeVoidPassiveCraftOverlay(); };
    overlay.innerHTML = `<div style="width:min(560px,94vw);max-height:90vh;overflow:auto;background:#0f1724;border:1px solid #3f9fbd;border-radius:14px;padding:14px;box-shadow:0 20px 70px rgba(0,0,0,.55);">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px;">
            <div><div style="font-weight:900;color:#c7f7ff;font-size:18px;">🕳️ ${escapeHTML(getPassiveNodeDisplayName(node))}</div><div style="color:#8fb7ca;margin-top:3px;">공허 패시브 제작</div></div>
            <button type="button" onclick="closeVoidPassiveCraftOverlay()">닫기</button>
        </div>
        <div style="border:1px solid rgba(114,184,208,0.45);background:rgba(8,18,28,0.72);border-radius:10px;padding:10px;margin-bottom:10px;color:#d7f8ff;line-height:1.45;">${effectLabel}</div>
        <div style="color:${active ? '#b9d7e8' : '#ffcf8a'};margin-bottom:10px;">${active ? '진화/확장/변화의 오브로 최대 2줄까지 옵션을 조율합니다.' : '먼저 패시브 트리에서 이 공허 패시브를 활성화해야 제작할 수 있습니다.'}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-bottom:12px;">
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','transmute')" ${active && !hasStats && (game.currencies.transmute || 0) > 0 ? '' : 'disabled'}>진화의 오브<br><span style="font-size:12px;color:#aebed4;">보유 ${game.currencies.transmute || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','augment')" ${active && canAugment && (game.currencies.augment || 0) > 0 ? '' : 'disabled'}>확장의 오브<br><span style="font-size:12px;color:#aebed4;">보유 ${game.currencies.augment || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','alteration')" ${active && hasStats && (game.currencies.alteration || 0) > 0 ? '' : 'disabled'}>변화의 오브<br><span style="font-size:12px;color:#aebed4;">보유 ${game.currencies.alteration || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','chance')" ${active && (game.currencies.chance || 0) > 0 ? '' : 'disabled'}>기회의 오브<br><span style="font-size:12px;color:#aebed4;">보유 ${game.currencies.chance || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','divine')" ${active && entry.transcendent && typeof TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' && TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min))) && (game.currencies.divine || 0) > 0 ? '' : 'disabled'}>신성한 오브<br><span style="font-size:12px;color:#aebed4;">보유 ${game.currencies.divine || 0}</span></button>
        </div>
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;border-top:1px solid rgba(143,183,202,0.25);padding-top:10px;">
            <div style="color:${refundState.enabled ? '#c8f7d5' : '#8fa0ad'};font-size:13px;">${refundState.reason}</div>
            <button type="button" onclick="refundVoidPassiveFromOverlay('${node.id}')" ${refundState.enabled ? '' : 'disabled'}>공허 패시브 반환 (정화의 오브 1)</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function setupCanvasEvents() {
    setupPassiveTreeSearchControls();
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    const canvasTooltip = document.getElementById('canvas-tooltip');
    let pinchStartDistance = 0;
    let touchStartZoom = camZoom;
    let pinchAnchorWorldX = 0;
    let pinchAnchorWorldY = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    let pendingTouchPassiveId = null;
    let pendingTouchPassiveAt = 0;
    let pendingTouchPassiveRefundId = null;
    let pendingTouchPassiveRefundAt = 0;

    function hideCanvasTooltip() {
        if (!canvasTooltip) return;
        canvasTooltip.style.display = 'none';
        clearActiveTooltip('canvas-tooltip');
    }

    window.hidePassiveNodeTooltip = hideCanvasTooltip;

    function getPassiveNodeAtClientPosition(clientX, clientY) {
        ensurePassiveRenderCache();
        const rect = canvas.getBoundingClientRect();
        const viewW = passiveCanvasMetrics.width || rect.width;
        const viewH = passiveCanvasMetrics.height || rect.height;
        const worldX = (clientX - rect.left - viewW / 2 - camX) / camZoom;
        const worldY = (clientY - rect.top - viewH / 2 - camY) / camZoom;
        let found = null;
        let foundDistance = Infinity;
        let cellSize = passiveRenderCache.cellSize;
        let cx = Math.floor(worldX / cellSize);
        let cy = Math.floor(worldY / cellSize);
        let candidates = [];
        let starState = ensureStarWedgeState();
        let selectingStarWedge = Number.isFinite(starState.selectedWedgeId);
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                let bucket = passiveRenderCache.hoverGrid.get(`${cx + ox},${cy + oy}`);
                if (bucket && bucket.length) candidates.push(...bucket);
            }
        }
        let nearbyNodes = (candidates.length > 0 ? candidates : passiveRenderCache.nodes);
        let nearestStarSlot = null;
        let nearestStarSlotDistance = Infinity;
        nearbyNodes.forEach(node => {
            if (getPassiveVisibility(node.id) === 'hidden') return;
            let radius = getPassiveNodeVisualRadius(node) + 8;
            let distance = Math.hypot(node.x - worldX, node.y - worldY);
            if (distance > radius) return;
            if (selectingStarWedge && node.socketType === 'star_wedge' && distance < nearestStarSlotDistance) {
                nearestStarSlot = node;
                nearestStarSlotDistance = distance;
            }
            if (!found || distance < foundDistance) {
                found = node;
                foundDistance = distance;
            }
        });
        if (selectingStarWedge && nearestStarSlot) return nearestStarSlot;
        return found;
    }

    function renderPassiveTooltip(node, clientX, clientY) {
        if (!canvasTooltip || !node) return;
        recalculateStarWedgeMutations();
        let starState = ensureStarWedgeState();
        let mutation = (starState.nodeMutations || {})[node.id];
        let virtualLearned = !!((starState.virtualLearnNodes || {})[node.id]);
        let effectDisabled = !!((starState.disabledNodeEffects || {})[node.id]);
        let mutationConflict = (starState.mutationConflictSources || {})[node.id];
        let passiveAccent = getPassiveStatAccent(node.stat);
        let state = getPassiveVisibility(node.id);
        let ownedApexCount = getPassiveApexNodeIds().filter(id => (game.passives || []).includes(id)).length;
        let msg = virtualLearned
            ? '🌀 블랙홀이 연결한 가상 거점 · 포인트 없이 인접 경로를 시작할 수 있습니다.'
            : (game.passives || []).includes(node.id)
            ? '✔️ 활성화됨'
            : (reachableNodes.has(node.id)
                ? '🖱️ 클릭해 활성화하고 주변 노드를 밝혀내기'
                : '🌒 아직 길이 이어지지 않은 노드');

        if (state === 'preview' && !discoveredPassiveNodes.has(node.id)) {
            msg = '🌫️ 안개 속 노드입니다. 활성화하여 주변을 밝힐 수 있습니다.';
        }
        if (node.kind === 'apex' && !(game.passives || []).includes(node.id)) {
            msg = `★ 별끝 특수 노드 ${ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.`;
        } else if ((node.kind === 'evolved' || node.kind === 'transcendent') && game.passiveStarEvolution) {
            msg = (game.passives || []).includes(node.id)
                ? '✔️ 각성된 별자리를 이미 받아들였습니다.'
                : '✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.';
        } else if (node.socketType === 'star_wedge') {
            let hasSocket = (starState.sockets || []).find(entry => String(entry.nodeId) === String(node.id));
            msg = hasSocket ? '🌑 별쐐기가 장착된 슬롯입니다.' : '🌑 별쐐기 장착 가능 슬롯입니다.';
        }

        let effectBadge = (label, accent, caption) => {
            let tone = accent || passiveAccent;
            return `<div class="tooltip-line" style="flex:1 1 160px; margin-top:6px; padding:8px 10px; border-radius:9px; border:1px solid ${tone.activeOuter}; background:linear-gradient(135deg, ${tone.activeGlow || 'rgba(120,160,200,0.18)'}, rgba(8,12,20,0.72)); box-shadow:inset 0 0 14px rgba(255,255,255,0.04), 0 0 12px ${tone.previewGlow || 'rgba(120,160,200,0.12)'}; color:${tone.text}; font-weight:800; font-size:1.04em; line-height:1.35;">
                <div style="font-size:0.72em; color:#9fb6cc; font-weight:700; margin-bottom:2px;">${caption}</div>
                ${label}
            </div>`;
        };
        let effectHtml = effectBadge(getPassiveEffectLabel(node), passiveAccent, '효과');
        if (mutation) {
            let originalAccent = getPassiveStatAccent(mutation.originalStat);
            let currentAccent = getPassiveStatAccent(mutation.currentStat);
            let originalLabel = `${getStatName(mutation.originalStat)} +${formatValue(mutation.originalStat, mutation.originalVal)}${P_STATS[mutation.originalStat] && P_STATS[mutation.originalStat].isPct ? '%' : ''}`;
            let currentLabel = `${getStatName(mutation.currentStat)} +${formatValue(mutation.currentStat, mutation.currentVal)}${P_STATS[mutation.currentStat] && P_STATS[mutation.currentStat].isPct ? '%' : ''}`;
            effectHtml = `<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:stretch;">${effectBadge(originalLabel, originalAccent, '기존 효과')}${effectBadge(currentLabel, currentAccent, '변성 효과')}</div>`;
        }
        if (effectDisabled) effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,122,122,.5); border-radius:8px; color:#ffb4b4; background:rgba(92,26,36,.28);">이 노드의 효과는 장착 중인 고유 별쐐기로 인해 비활성화되어 스탯에 적용되지 않습니다.</div>`;
        if (Array.isArray(mutationConflict) && mutationConflict.length > 1) effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,184,106,.48); border-radius:8px; color:#ffd0a2; background:rgba(91,52,20,.28);">별쐐기 변성 범위가 겹쳐 충돌했습니다. 이 노드에는 어느 변성도 적용되지 않습니다.</div>`;
        let voidCraftHtml = '';
        if (node.kind === 'void' && (game.passives || []).includes(node.id)) {
            voidCraftHtml = `<div class="tooltip-line" style="margin-top:8px; color:#bfefff;">🕳️ 클릭하면 공허 제작 창이 열립니다.</div>`;
        }

        canvasTooltip.innerHTML =
            `<div class="tooltip-title" style="color:${node.tier >= 3 || node.kind === 'apex' || node.kind === 'transcendent' ? '#e7bf73' : '#b9d0df'}">${getPassiveNodeDisplayName(node)}</div>
             <div class="tooltip-line">${getPassiveKindLabel(node)}</div>
             ${effectHtml}
             ${node.desc ? `<div class="tooltip-line" style="margin-top:6px; color:#c6d4e2;">${node.desc}</div>` : ''}
             ${voidCraftHtml}
             <div class="tooltip-line" style="margin-top:6px;">${msg}</div>`;

        canvasTooltip.style.display = 'block';
        positionTooltipElement(canvasTooltip, clientX, clientY);
        setActiveTooltip('canvas-tooltip');
    }

    function updateHoverNode(clientX, clientY) {
        let oldHover = hoverNode;
        hoverNode = getPassiveNodeAtClientPosition(clientX, clientY);
        if (oldHover !== hoverNode) {
            drawPassiveTree();
            if (hoverNode) renderPassiveTooltip(hoverNode, clientX, clientY);
            else hideCanvasTooltip();
        } else if (hoverNode) {
            positionTooltipElement(canvasTooltip, clientX, clientY);
        }
    }

    function updateDrag(clientX, clientY, deltaX, deltaY) {
        camX = clientX - dragStartX;
        camY = clientY - dragStartY;
        clampPassiveCamera();
        dragDist += Math.abs(deltaX) + Math.abs(deltaY);
        if (dragDist >= 10) {
            pendingTouchPassiveId = null;
            pendingTouchPassiveRefundId = null;
        }
        drawPassiveTree();
        hideCanvasTooltip();
    }

    async function activateHoveredPassive(opts) {
        let options = opts || {};
        if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) {
            hoverNode = getPassiveNodeAtClientPosition(options.clientX, options.clientY);
        }
        if (dragDist >= 10 || !hoverNode) return;
        const targetNode = hoverNode;
        const targetNodeId = targetNode.id;
        let starState = ensureStarWedgeState();
        if (Number.isFinite(starState.selectedWedgeId)) {
            let hoveredNodeId = hoverNode && hoverNode.id;
            let resolvedNode = hoveredNodeId != null ? (PASSIVE_TREE.nodes[hoveredNodeId] || PASSIVE_TREE.nodes[String(hoveredNodeId)] || null) : null;
            let isStarWedgeSlot = !!(resolvedNode && resolvedNode.socketType === 'star_wedge');
            if (!isStarWedgeSlot && hoveredNodeId != null) {
                let hoveredKey = String(hoveredNodeId);
                isStarWedgeSlot = !!Object.values(PASSIVE_TREE.nodes || {}).find(node => node && node.socketType === 'star_wedge' && String(node.id) === hoveredKey);
            }
            if (isStarWedgeSlot) {
                socketStarWedgeOnNode(hoverNode.id, starState.selectedWedgeId);
                starState.selectedWedgeId = null;
                updateStaticUI();
            } else {
                addLog('별쐐기 슬롯을 클릭해 장착하세요.', 'attack-monster');
            }
            return;
        }
        let activationPath = getPassiveActivationPath(targetNodeId);
        let canActivate = activationPath.length === 1 && reachableNodes.has(targetNodeId);
        let canPathActivate = activationPath.length > 1;
        if (!canActivate && !canPathActivate) {
            if ((game.passives || []).includes(hoverNode.id)) {
                if (hoverNode.kind === 'void') {
                    pendingTouchPassiveId = null;
                    pendingTouchPassiveRefundId = null;
                    return openVoidPassiveCraftOverlay(hoverNode.id);
                }
                if (options.fromTouch) {
                    let now = Date.now();
                    if (pendingTouchPassiveRefundId !== hoverNode.id || (now - pendingTouchPassiveRefundAt) > 1200) {
                        pendingTouchPassiveRefundId = hoverNode.id;
                        pendingTouchPassiveRefundAt = now;
                        renderPassiveTooltip(hoverNode, options.clientX || 0, options.clientY || 0);
                        addLog('👆 반환 확인: 같은 노드를 한 번 더 탭하면 환불 창이 열립니다.', 'loot-magic');
                        return;
                    }
                }
                pendingTouchPassiveId = null;
                pendingTouchPassiveRefundId = null;
                return askRefundPassiveNode(hoverNode.id);
            }
            if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(hoverNode, options.clientX, options.clientY);
            return addLog("연결된 노드가 아니라 활성화할 수 없습니다.", "attack-monster");
        }
        let pointCost = activationPath.length;
        if (game.passivePoints < pointCost) {
            if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(hoverNode, options.clientX, options.clientY);
            return addLog(`패시브 포인트가 부족합니다. (필요: ${pointCost})`, "attack-monster");
        }
        if (options.fromTouch && (canActivate || canPathActivate)) {
            let now = Date.now();
            if (pendingTouchPassiveId !== hoverNode.id || (now - pendingTouchPassiveAt) > 1200) {
                pendingTouchPassiveId = hoverNode.id;
                pendingTouchPassiveAt = now;
                renderPassiveTooltip(hoverNode, options.clientX || 0, options.clientY || 0);
                addLog("👆 패시브 노드 정보 확인됨. 같은 노드를 한 번 더 탭하면 활성화됩니다.", "loot-magic");
                return;
            }
        }
        if (canActivate || canPathActivate) {
            if (canPathActivate && !await requestGameConfirmation(`최단 경로에 있는 노드를 함께 활성화하며 패시브 포인트 ${pointCost}점을 소모합니다.`, {
                title: '최단 경로 활성화',
                confirmLabel: `${pointCost}포인트 사용`
            })) return;
            pendingTouchPassiveId = null;
            let activationResult = activatePassivePath(targetNodeId, { forcePulseNodeId: targetNodeId });
            if (!activationResult.activated) {
                calculateReachableNodes();
                let reason = activationResult.reason === 'points'
                    ? `패시브 포인트가 부족합니다. (필요: ${activationResult.cost})`
                    : '확인 중 패시브 트리 상태가 변경되었습니다. 노드를 다시 선택해 주세요.';
                addLog(reason, 'attack-monster');
                updateStaticUI();
                return;
            }
            unlockPassiveStarEvolution();
            tickShrineState();
            calculateReachableNodes();
            let nodeName = getPassiveNodeDisplayName(targetNode);
            let routeText = canPathActivate ? ` (최단 경로 ${pointCost}개 노드)` : '';
            addLog(`🌟 ${nodeName} 활성화!${routeText}`, "loot-magic");
            updateStaticUI();
        }
    }

    canvas.addEventListener('mousedown', e => {
        isDragging = true;
        dragDist = 0;
        dragStartX = e.clientX - camX;
        dragStartY = e.clientY - camY;
        hoverNode = getPassiveNodeAtClientPosition(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('mousemove', e => {
        if (isDragging) {
            updateDrag(e.clientX, e.clientY, e.movementX, e.movementY);
            return;
        }
        updateHoverNode(e.clientX, e.clientY);
    });
    canvas.addEventListener('mouseup', e => {
        isDragging = false;
        canvas.style.cursor = 'grab';
        activateHoveredPassive({ clientX: e.clientX, clientY: e.clientY });
    });
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        hoverNode = null;
        pendingTouchPassiveId = null;
        canvas.style.cursor = 'grab';
        drawPassiveTree();
        hideCanvasTooltip();
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let centerX = rect.width / 2;
        let centerY = rect.height / 2;
        let localX = e.clientX - rect.left;
        let localY = e.clientY - rect.top;
        let worldX = (localX - centerX - camX) / camZoom;
        let worldY = (localY - centerY - camY) / camZoom;
        camZoom *= (e.deltaY > 0 ? 0.74 : 1.32);
        camZoom = clampNumber(camZoom, 0.12, 2.5);
        camX = localX - centerX - worldX * camZoom;
        camY = localY - centerY - worldY * camZoom;
        clampPassiveCamera();
        drawPassiveTree();
    });
    canvas.addEventListener('touchstart', e => {
        if (!e.touches.length) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            const rect = canvas.getBoundingClientRect();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance = Math.hypot(dx, dy);
            touchStartZoom = camZoom;
            let midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            let centerX = rect.width / 2;
            let centerY = rect.height / 2;
            pinchAnchorWorldX = (midX - rect.left - centerX - camX) / camZoom;
            pinchAnchorWorldY = (midY - rect.top - centerY - camY) / camZoom;
            isDragging = false;
            pendingTouchPassiveId = null;
            hideCanvasTooltip();
            return;
        }
        let touch = e.touches[0];
        isDragging = true;
        dragDist = 0;
        dragStartX = touch.clientX - camX;
        dragStartY = touch.clientY - camY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        hoverNode = getPassiveNodeAtClientPosition(touch.clientX, touch.clientY);
        canvas.style.cursor = 'grabbing';
    }, { passive: false });
    canvas.addEventListener('touchmove', e => {
        if (!e.touches.length) return;
        e.preventDefault();
        if (e.touches.length >= 2) {
            const rect = canvas.getBoundingClientRect();
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            let distance = Math.hypot(dx, dy);
            if (!pinchStartDistance) {
                pinchStartDistance = distance;
                touchStartZoom = camZoom;
            }
            camZoom = clampNumber(touchStartZoom * (distance / pinchStartDistance), 0.12, 2.5);
            let midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            let midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            let centerX = rect.width / 2;
            let centerY = rect.height / 2;
            camX = (midX - rect.left - centerX) - (pinchAnchorWorldX * camZoom);
            camY = (midY - rect.top - centerY) - (pinchAnchorWorldY * camZoom);
            clampPassiveCamera();
            pendingTouchPassiveId = null;
            drawPassiveTree();
            hideCanvasTooltip();
            return;
        }
        let touch = e.touches[0];
        if (isDragging) {
            updateDrag(touch.clientX, touch.clientY, touch.clientX - lastTouchX, touch.clientY - lastTouchY);
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
        }
    }, { passive: false });
    canvas.addEventListener('touchend', e => {
        e.preventDefault();
        if (e.touches.length >= 2) {
            let dx = e.touches[0].clientX - e.touches[1].clientX;
            let dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDistance = Math.hypot(dx, dy);
            touchStartZoom = camZoom;
            return;
        }
        if (e.touches.length === 1) {
            let touch = e.touches[0];
            isDragging = true;
            dragStartX = touch.clientX - camX;
            dragStartY = touch.clientY - camY;
            lastTouchX = touch.clientX;
            lastTouchY = touch.clientY;
            pinchStartDistance = 0;
            return;
        }
        isDragging = false;
        pinchStartDistance = 0;
        canvas.style.cursor = 'grab';
        if (e.changedTouches && e.changedTouches.length) {
            let touch = e.changedTouches[0];
            hoverNode = getPassiveNodeAtClientPosition(touch.clientX, touch.clientY);
            activateHoveredPassive({ fromTouch: true, clientX: touch.clientX, clientY: touch.clientY });
        }
    }, { passive: false });
    canvas.addEventListener('touchcancel', () => {
        isDragging = false;
        pinchStartDistance = 0;
        hoverNode = null;
        pendingTouchPassiveId = null;
        canvas.style.cursor = 'grab';
        drawPassiveTree();
        hideCanvasTooltip();
    }, { passive: false });
    resizePassiveTreeCanvas(true);
}

function resizePassiveTreeCanvas(force) {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return false;
    let parent = canvas.parentElement || document.getElementById('tree-container');
    if (!parent || canvas.offsetParent === null) return false;
    let rect = parent.getBoundingClientRect();
    let displayWidth = Math.max(1, Math.floor(rect.width));
    let displayHeight = Math.max(1, Math.floor(rect.height));
    if (displayWidth < 50 || displayHeight < 50) return false;
    let dpr = Math.max(1, window.devicePixelRatio || 1);
    let bufferWidth = Math.max(1, Math.round(displayWidth * dpr));
    let bufferHeight = Math.max(1, Math.round(displayHeight * dpr));
    let changed = !!force
        || canvas.width !== bufferWidth
        || canvas.height !== bufferHeight
        || passiveCanvasMetrics.width !== displayWidth
        || passiveCanvasMetrics.height !== displayHeight
        || Math.abs((passiveCanvasMetrics.dpr || 1) - dpr) > 0.001;
    if (!changed) return false;

    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;
    passiveCanvasMetrics.width = displayWidth;
    passiveCanvasMetrics.height = displayHeight;
    passiveCanvasMetrics.dpr = dpr;
    if (typeof updatePassiveTreeOverlayTransform === 'function') updatePassiveTreeOverlayTransform(displayWidth, displayHeight);

    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

function resizeCanvas() {
    handleResponsiveLayoutChange();
    const canvas = document.getElementById('tree-canvas');
    if (canvas && canvas.offsetParent !== null) {
        fitPassiveCameraToBounds(false);
        if (resizePassiveTreeCanvas(false)) drawPassiveTree();
    }
    resizeBattlefieldCanvas();
    renderBattlefield();
}

function scheduleStableResize() {
    requestAnimationFrame(() => requestAnimationFrame(() => resizeCanvas()));
}

function handleResponsiveLayoutChange() {
    let isMobileLayout = window.matchMedia('(max-width: 1080px)').matches;
    if (window.__lastResponsiveMobile === undefined) {
        window.__lastResponsiveMobile = isMobileLayout;
        return;
    }
    if (window.__lastResponsiveMobile && !isMobileLayout) {
        function resetDesktopScroll() {
            window.scrollTo(0, 0);
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
            let leftPane = document.getElementById('left-pane');
            if (leftPane) leftPane.scrollTop = 0;
            let rightPane = document.getElementById('right-pane');
            if (rightPane) rightPane.scrollTop = 0;
            document.querySelectorAll('.tab-content').forEach(node => {
                node.scrollTop = 0;
            });
        }
        resetDesktopScroll();
        requestAnimationFrame(resetDesktopScroll);
    }
    window.__lastResponsiveMobile = isMobileLayout;
}


function ensureLoopChallengeState() {
    if (!game.loopChallenge) {
        let loopTier = Math.max(1, Math.floor(game.loopCount || game.season || 1));
        game.loopChallenge = {
            id: `loop-${Date.now()}`,
            tier: loopTier,
            targetKills: 50 + (loopTier * 10),
            kills: 0,
            completed: false,
            rewardClaimed: false
        };
    }
}

function mergeDefaults(save) {
    function clampFiniteNumber(value, fallback, min, max) {
        let num = Number(value);
        if (!Number.isFinite(num)) num = fallback;
        if (Number.isFinite(min)) num = Math.max(min, num);
        if (Number.isFinite(max)) num = Math.min(max, num);
        return num;
    }
    function normalizePassiveNodeId(rawId) {
        if (typeof rawId === 'string') {
            if (PASSIVE_TREE.nodes[rawId]) return rawId;
            if (/^\d+$/.test(rawId)) {
                let converted = 'n' + rawId;
                if (PASSIVE_TREE.nodes[converted]) return converted;
            }
            return null;
        }
        if (typeof rawId === 'number' && Number.isFinite(rawId)) {
            let converted = 'n' + Math.floor(rawId);
            return PASSIVE_TREE.nodes[converted] ? converted : null;
        }
        return null;
    }
    function normalizeAllocatedPassiveTreeNodes(rawIds, passiveStarEvolution) {
        let rawList = Array.isArray(rawIds) ? rawIds : [];
        let seen = new Set();
        let kept = [];
        let refunded = 0;
        rawList.forEach(rawId => {
            let id = normalizePassiveNodeId(rawId);
            if (!id) { refunded++; return; }
            if (seen.has(id)) return;
            seen.add(id);
            let node = PASSIVE_TREE.nodes[id];
            if (!node || (node.requiresEvolution && !passiveStarEvolution)) {
                if (id !== 'n0') refunded++;
                return;
            }
            kept.push(id);
        });
        let owned = new Set(kept);
        owned.add('n0');
        let savedStarWedge = save && save.starWedge && typeof save.starWedge === 'object' ? save.starWedge : {};
        let savedWedges = new Map((Array.isArray(savedStarWedge.wedges) ? savedStarWedge.wedges : [])
            .filter(wedge => wedge && Number.isFinite(Number(wedge.id)))
            .map(wedge => [Number(wedge.id), wedge]));
        let virtualRoots = new Set();
        (Array.isArray(savedStarWedge.sockets) ? savedStarWedge.sockets : []).forEach(socket => {
            let wedge = socket && savedWedges.get(Number(socket.wedgeId));
            let recordedId = wedge && wedge.unique && wedge.uniqueType === 'black_hole' ? normalizePassiveNodeId(wedge.recordedHubNodeId) : null;
            if (recordedId && PASSIVE_TREE.nodes[recordedId] && PASSIVE_TREE.nodes[recordedId].kind === 'hub') virtualRoots.add(recordedId);
        });
        virtualRoots.forEach(id => owned.add(id));
        let traversalRoots = ['n0', ...virtualRoots];
        let connected = new Set(traversalRoots);
        let queue = traversalRoots.slice();
        let passiveEdges = (PASSIVE_TREE && Array.isArray(PASSIVE_TREE.edges)) ? PASSIVE_TREE.edges : [];
        while (queue.length > 0) {
            let current = queue.shift();
            passiveEdges.forEach(edge => {
                let next = null;
                if (edge.from === current && owned.has(edge.to)) next = edge.to;
                else if (edge.to === current && owned.has(edge.from)) next = edge.from;
                if (next && !connected.has(next)) {
                    connected.add(next);
                    queue.push(next);
                }
            });
        }
        let connectedPassives = [];
        kept.forEach(id => {
            if (id === 'n0' || connected.has(id)) connectedPassives.push(id);
            else refunded++;
        });
        return { passives: connectedPassives, refunded: refunded };
    }
    function normalizeEncounterMarker(marker) {
        if (!marker || typeof marker !== 'object') return null;
        let at = clampFiniteNumber(marker.at, NaN, 0, 100);
        if (!Number.isFinite(at)) return null;
        return {
            at: at,
            count: Math.max(1, Math.floor(clampFiniteNumber(marker.count, 1, 1, 99))),
            elite: !!marker.elite,
            boss: !!marker.boss
        };
    }
    function normalizeEnemyRecord(enemy) {
        if (!enemy || typeof enemy !== 'object') return null;
        let hp = clampFiniteNumber(enemy.hp, NaN, 0);
        let maxHp = clampFiniteNumber(enemy.maxHp, hp, 1);
        if (!Number.isFinite(hp)) hp = maxHp;
        return normalizeEnemyGridFields({
            ...enemy,
            id: Math.max(1, Math.floor(clampFiniteNumber(enemy.id, 1, 1))),
            hp: Math.min(maxHp, hp),
            maxHp: maxHp,
            attackTimer: clampFiniteNumber(enemy.attackTimer, 0, 0),
            regenBank: Math.round(clampFiniteNumber(enemy.regenBank, 0, 0) * 10) / 10,
            spawnAt: clampFiniteNumber(enemy.spawnAt, 0, 0, 100),
            spawnStamp: 0,
            groupIndex: Math.max(0, Math.floor(clampFiniteNumber(enemy.groupIndex, 0, 0))),
            variantSeed: Math.floor(clampFiniteNumber(enemy.variantSeed, 1)),
            ele: enemy.ele || 'phys',
            name: enemy.name || '이름 없는 적',
            atkMul: clampFiniteNumber(enemy.atkMul, 1, 0.1),
            dr: clampFiniteNumber(enemy.dr, 0, 0),
            resF: clampFiniteNumber(enemy.resF, 0),
            resC: clampFiniteNumber(enemy.resC, 0),
            resL: clampFiniteNumber(enemy.resL, 0),
            resChaos: clampFiniteNumber(enemy.resChaos, 0),
            isElite: !!enemy.isElite,
            isBoss: !!enemy.isBoss
        });
    }

    // 그리드 필드 정리: 잘못된 좌표/유형은 버려서 다음 전투 틱의 그리드 복구가 다시 배치하게 한다.
    function normalizeEnemyGridFields(record) {
        delete record.battleSlot;
        let maxCell = COMBAT_GRID_CONFIG.size - 1;
        let gx = Math.floor(clampFiniteNumber(record.gx, NaN, 0, maxCell));
        let gy = Math.floor(clampFiniteNumber(record.gy, NaN, 0, maxCell));
        if (Number.isFinite(gx) && Number.isFinite(gy)) {
            record.gx = gx;
            record.gy = gy;
        } else {
            delete record.gx;
            delete record.gy;
        }
        record.gridMoveTimer = 0;
        if (record.attackKind !== 'melee' && record.attackKind !== 'ranged') {
            delete record.attackKind;
            delete record.attackRange;
        } else {
            record.attackRange = Math.max(1, Math.floor(clampFiniteNumber(record.attackRange, 1, 1, 99)));
        }
        return record;
    }
    function normalizeRecentDamageEvent(entry) {
        if (!entry || typeof entry !== 'object') return null;
        let ele = normalizeDamageElementKey(entry.ele);
        let amount = Math.max(0, Math.floor(clampFiniteNumber(entry.amount, 0, 0)));
        return {
            at: clampFiniteNumber(entry.at, Date.now(), 0),
            ele: ele,
            amount: amount,
            source: typeof entry.source === 'string' ? entry.source : ''
        };
    }
    function normalizeDeathDamageSummaryRows(rows) {
        let damageSummary = Array.isArray(rows) ? rows.map(entry => {
            if (!entry || typeof entry !== 'object') return null;
            let ele = normalizeDamageElementKey(entry.ele);
            let value = Math.max(0, Math.floor(clampFiniteNumber(entry.value, entry.amount, 0)));
            return { ele: ele, value: value };
        }).filter(Boolean) : [];
        let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
        damageSummary.forEach(entry => {
            totals[entry.ele] += Math.max(0, Math.floor(entry.value || 0));
        });
        return Object.keys(totals)
            .map(ele => ({ ele: ele, value: totals[ele] }))
            .filter(entry => entry.value > 0)
            .sort((a, b) => b.value - a.value);
    }
    function normalizeDeathLog(log) {
        if (!log || typeof log !== 'object') return null;
        let primaryElement = normalizeDamageElementKey(log.primaryElement);
        let damageSummary = normalizeDeathDamageSummaryRows(log.damageSummary);
        let ailmentDamageSummary = normalizeDeathDamageSummaryRows(log.ailmentDamageSummary);
        let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.map(row => {
            if (!row || typeof row !== 'object') return null;
            let type = typeof row.type === 'string' && row.type ? row.type : 'unknown';
            return {
                type: type,
                label: typeof row.label === 'string' && row.label ? row.label : getAilmentDisplayLabel(type),
                time: Math.max(0, Math.ceil(clampFiniteNumber(row.time, 0, 0, 30))),
                power: Math.max(0, clampFiniteNumber(row.power, 0, 0, 1.5)),
                sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0)))
            };
        }).filter(Boolean) : [];
        return {
            primaryElement: primaryElement,
            reasonText: typeof log.reasonText === 'string' && log.reasonText.trim() ? log.reasonText : (DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys),
            expLost: Math.max(0, Math.floor(clampFiniteNumber(log.expLost, 0, 0))),
            damageSummary: damageSummary,
            ailmentDamageSummary: ailmentDamageSummary,
            activeAilments: activeAilments,
            sourceName: typeof log.sourceName === 'string' ? log.sourceName : '',
            at: clampFiniteNumber(log.at, Date.now(), 0)
        };
    }
    function estimateSummonEquipCapForMergedSave(state) {
        let bonus = 0;
        function statValue(stat) {
            if (!stat || typeof stat !== 'object') return 0;
            if (Number.isFinite(stat.val)) return stat.val;
            if (Number.isFinite(stat.value)) return stat.value;
            if (Number.isFinite(stat.base)) return stat.base;
            return 0;
        }
        Object.values((state && state.equipment) || {}).forEach(item => {
            if (!item) return;
            [...(item.baseStats || []), ...(item.stats || []), ...(typeof getImmutableItemSpecialStats === 'function' ? getImmutableItemSpecialStats(item) : [])].forEach(stat => {
                if (stat && stat.id === 'summonCap') bonus += statValue(stat);
            });
        });
        (state && Array.isArray(state.passives) ? state.passives : []).forEach(id => {
            if (state.starWedge && state.starWedge.disabledNodeEffects && state.starWedge.disabledNodeEffects[String(id)]) return;
            let node = PASSIVE_TREE.nodes[id];
            let mut = state.starWedge && state.starWedge.nodeMutations ? state.starWedge.nodeMutations[id] : null;
            let statId = mut && mut.currentStat ? mut.currentStat : (node && node.stat);
            let statVal = mut && Number.isFinite(mut.currentVal) ? mut.currentVal : (node && node.val);
            if (node && statId === 'summonCap') bonus += statVal || 0;
        });
        let ownedPassiveIds = new Set(state && Array.isArray(state.passives) ? state.passives.map(String) : []);
        Object.keys((state && state.starWedge && state.starWedge.nodeMutations) || {}).forEach(id => {
            let mut = state.starWedge.nodeMutations[id];
            if (!mut || mut.lineIndex !== 3 || mut.currentStat !== 'summonCap' || ownedPassiveIds.has(String(id))) return;
            if (state.starWedge.disabledNodeEffects && state.starWedge.disabledNodeEffects[String(id)]) return;
            bonus += Number(mut.currentVal) || 0;
        });
        (state && Array.isArray(state.actRewardBonuses) ? state.actRewardBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        (state && Array.isArray(state.journalBonuses) ? state.journalBonuses : []).forEach(entry => { if (entry && entry.stat === 'summonCap') bonus += Number(entry.value) || 0; });
        let keystones = (state && Array.isArray(state.ascendKeystones)) ? state.ascendKeystones : [];
        if (state && state.ascendClass === 'soulbinder') {
            if (keystones.includes('sb4')) bonus += 1;
            if (keystones.includes('sb8')) bonus += 3;
        }
        return Math.max(1, Math.min(8, Math.floor(1 + bonus)));
    }

    let savedColony = (save && save.colony && typeof save.colony === 'object') ? save.colony : null;
    let savedColonyHadWardSlotVersion = !!(savedColony && Object.prototype.hasOwnProperty.call(savedColony, 'wardSlotVersion'));
    let merged = {
        ...defaultGame,
        ...save,
        settings: { ...defaultGame.settings, ...(save.settings || {}) },
        unlocks: { ...defaultGame.unlocks, ...(save.unlocks || {}) },
        noti: { ...defaultGame.noti, ...(save.noti || {}) },
        currencies: { ...defaultGame.currencies, ...(save.currencies || {}) },
        equipment: { ...defaultGame.equipment, ...(save.equipment || {}) },
        saveMeta: { ...defaultGame.saveMeta, ...(save.saveMeta || {}) }
    };
    const legacyHiveTrace = Math.max(0, Math.floor(Number(merged.currencies.hiveTrace) || 0));
    if (legacyHiveTrace > 0) {
        merged.currencies.colonyTrace = Math.max(0, Math.floor(Number(merged.currencies.colonyTrace) || 0)) + legacyHiveTrace;
    }
    delete merged.currencies.hiveTrace;
    merged.cosmosAtlas = (merged.cosmosAtlas && typeof merged.cosmosAtlas === 'object') ? { ...merged.cosmosAtlas } : {};
    const legacyAtlasStarDust = Math.max(0, Math.floor(Number(merged.cosmosAtlas.starDust) || 0));
    const hasSavedStarDustWallet = !!(save && save.currencies && Object.prototype.hasOwnProperty.call(save.currencies, 'starDust'));
    merged.currencies.starDust = hasSavedStarDustWallet
        ? Math.max(0, Math.floor(Number(merged.currencies.starDust) || 0))
        : legacyAtlasStarDust;
    delete merged.cosmosAtlas.starDust;
    merged.saveMeta.lastCloudUploadProfile = normalizeCloudUploadProfile(merged.saveMeta.lastCloudUploadProfile);
    merged.ocean = (merged.ocean && typeof merged.ocean === 'object') ? { ...createDefaultOceanState(), ...merged.ocean } : createDefaultOceanState();
    merged.ocean.permanentUpgrades = { ...(createDefaultOceanState().permanentUpgrades || {}), ...(merged.ocean.permanentUpgrades || {}) };
    Object.keys(merged.ocean.permanentUpgrades).forEach(key => {
        let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
        merged.ocean.permanentUpgrades[key] = def ? Math.max(0, Math.min(def.maxLevel, Math.floor(merged.ocean.permanentUpgrades[key] || 0))) : 0;
    });
    merged.unlocks.jewel = !!merged.unlocks.jewel;
    merged.unlocks.cube = !!merged.unlocks.cube;
    if (typeof syncPermanentTalentTabUnlock === 'function') syncPermanentTalentTabUnlock(merged);
    if (!save.currencies && save.materials) {
        merged.currencies.transmute += Math.floor(save.materials / 2);
        merged.currencies.augment += Math.floor(save.materials / 4);
        merged.currencies.alchemy += Math.floor(save.materials / 10);
    }
    let normalizedEquipment = { ...defaultGame.equipment };
    Object.keys(normalizedEquipment).forEach(slot => {
        normalizedEquipment[slot] = merged.equipment[slot] || null;
    });
    if (save && save.equipment && save.equipment['장갑'] && !save.equipment['장갑1'] && !save.equipment['장갑2']) {
        normalizedEquipment['장갑1'] = save.equipment['장갑'];
    }
    merged.equipment = normalizedEquipment;
    merged.inventory = (merged.inventory || []).map(normalizeItem);
    Object.keys(merged.equipment).forEach(slot => merged.equipment[slot] = normalizeItem(merged.equipment[slot]));
    merged.gemData = (merged.gemData && typeof merged.gemData === 'object') ? merged.gemData : {};
    merged.gemData['기본 공격'] = normalizeGemRecord(merged.gemData['기본 공격']);
    Object.keys(merged.gemData).forEach(name => merged.gemData[name] = normalizeGemRecord(merged.gemData[name]));
    merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
    Object.keys(merged.supportGemData).forEach(name => merged.supportGemData[name] = normalizeGemRecord(merged.supportGemData[name]));
    if ((save.saveVersion || 0) < 9) {
        merged.passives = [];
        merged.discoveredPassives = ['n0'];
    }
    if ((save.saveVersion || 0) < 13) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 10) merged.currentZoneId += (ABYSS_START_ZONE_ID - 10);
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 10) merged.maxZoneId += (ABYSS_START_ZONE_ID - 10);
    } else if ((save.saveVersion || 0) < 14) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 11) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 11) merged.maxZoneId -= 1;
    } else if ((save.saveVersion || 0) < 15) {
        if (typeof merged.currentZoneId === 'number' && merged.currentZoneId >= 5) merged.currentZoneId -= 1;
        if (typeof merged.maxZoneId === 'number' && merged.maxZoneId >= 5) merged.maxZoneId -= 1;
    }
    let passiveAllocationNormalization = normalizeAllocatedPassiveTreeNodes(merged.passives, !!merged.passiveStarEvolution);
    merged.passives = passiveAllocationNormalization.passives;
    merged.autoRefundedPassivePoints = Math.max(0, Math.floor(passiveAllocationNormalization.refunded || 0));
    function getPassiveTierValueForLoad(statKey, tier) {
        let statDef = P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
        if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
        return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
    }
    Object.values(PASSIVE_TREE.nodes || {}).forEach(node => {
        if (!node || node.stat !== 'critDmg') return;
        node.val = getPassiveTierValueForLoad('critDmg', Math.max(0, Math.floor(node.tier || 1)));
    });
    merged.discoveredPassives = Array.from(new Set((merged.discoveredPassives || []).map(normalizePassiveNodeId).filter(Boolean)));
    if (merged.passiveLayoutVersion !== PASSIVE_LAYOUT_VERSION) {
        merged.discoveredPassives = Array.from(new Set(['n0'].concat(merged.passives || [])));
        merged.passiveLayoutVersion = PASSIVE_LAYOUT_VERSION;
    }
    merged.claimableActRewards = (merged.claimableActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.claimedActRewards = (merged.claimedActRewards || []).filter(id => typeof id === 'number' && id >= 0 && id <= 9);
    merged.actRewardBonuses = (merged.actRewardBonuses || []).filter(entry => entry && entry.stat);
    merged.seasonChaseUniqueDrops = Array.from(new Set((Array.isArray(merged.seasonChaseUniqueDrops) ? merged.seasonChaseUniqueDrops : []).filter(name => typeof name === 'string' && name)));
    // Old saves only had a boolean flag and could not identify which chase unique dropped.
    // Do not treat that unknown legacy flag as a full chase-unique blacklist.
    merged.seasonChaseUniqueDropped = merged.seasonChaseUniqueDrops.length > 0;
    if (Array.isArray(merged.skills) && merged.skills.includes('수액 골렘 소환')) {
        merged.supports = Array.isArray(merged.supports) ? merged.supports : [];
        if (!merged.supports.includes('수액 골렘 소환')) merged.supports.push('수액 골렘 소환');
        merged.supportGemData = (merged.supportGemData && typeof merged.supportGemData === 'object') ? merged.supportGemData : {};
        if (!merged.supportGemData['수액 골렘 소환']) {
            merged.supportGemData['수액 골렘 소환'] = normalizeGemRecord((merged.gemData || {})['수액 골렘 소환'] || { level: 1, exp: 0, unlockedTier: 1, activeTier: 1 });
        }
        merged.equippedSupports = Array.isArray(merged.equippedSupports) ? merged.equippedSupports : [];
        if (!merged.equippedSupports.includes('수액 골렘 소환')) merged.equippedSupports.push('수액 골렘 소환');
        if (merged.activeSkill === '수액 골렘 소환') {
            merged.activeSkill = '기본 공격';
        }
    }
    merged.skills = dedupeList(Array.isArray(merged.skills) ? merged.skills.filter(name => !!SKILL_DB[name]) : []);
    if (!merged.skills.includes('기본 공격')) merged.skills.unshift('기본 공격');
    merged.sealedSkills = dedupeList(Array.isArray(merged.sealedSkills) ? merged.sealedSkills.filter(name => !!SKILL_DB[name] && name !== '기본 공격' && !merged.skills.includes(name)) : []);
    merged.supports = dedupeList(Array.isArray(merged.supports) ? merged.supports.filter(name => !!SUPPORT_GEM_DB[name]) : []);
    merged.sealedSupports = dedupeList(Array.isArray(merged.sealedSupports) ? merged.sealedSupports.filter(name => !!SUPPORT_GEM_DB[name] && !merged.supports.includes(name)) : []);
    merged.equippedSupports = Array.isArray(merged.equippedSupports) ? dedupeList(merged.equippedSupports.filter(name => merged.supports.includes(name))) : [];
    merged.seasonNodes = Array.isArray(merged.seasonNodes) ? merged.seasonNodes.filter(id => !!SEASON_NODES[id]) : [];
    merged.seasonNodeLevels = (merged.seasonNodeLevels && typeof merged.seasonNodeLevels === 'object') ? merged.seasonNodeLevels : {};
    merged.seasonNodes.forEach(id => {
        let lv = Math.max(1, Math.floor(merged.seasonNodeLevels[id] || 1));
        merged.seasonNodeLevels[id] = Math.min(5, lv);
    });
    merged.unlockedSeasonContents = Array.isArray(merged.unlockedSeasonContents) ? merged.unlockedSeasonContents.filter(id => typeof id === 'string') : ['season_1'];
    merged.seenSeasonContentNotices = Array.isArray(merged.seenSeasonContentNotices) ? merged.seenSeasonContentNotices.filter(id => typeof id === 'string') : ['season_1'];
    merged.labyrinthFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.labyrinthFloor, defaultGame.labyrinthFloor || 1, 1)));
    merged.labyrinthUnlockedMaxFloor = Math.max(
        merged.labyrinthFloor,
        Math.floor(clampFiniteNumber(merged.labyrinthUnlockedMaxFloor, defaultGame.labyrinthUnlockedMaxFloor || 1, 1))
    );
    merged.abyssEndlessDepth = Math.max(20, Math.floor(clampFiniteNumber(merged.abyssEndlessDepth, defaultGame.abyssEndlessDepth || 20, 20)));
    merged.abyssUnlockedDepths = Array.isArray(merged.abyssUnlockedDepths)
        ? Array.from(new Set(merged.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b)
        : [20];
    if (!merged.abyssUnlockedDepths.includes(20)) merged.abyssUnlockedDepths.unshift(20);
    if (merged.abyssEndlessDepth >= 21 && !merged.abyssUnlockedDepths.includes(merged.abyssEndlessDepth)) merged.abyssUnlockedDepths.push(merged.abyssEndlessDepth);
    function normalizeJewelRecord(jewel) {
        if (!jewel || typeof jewel !== 'object') return null;
        let stats = typeof getJewelStats === 'function' ? getJewelStats(jewel) : (Array.isArray(jewel.stats) ? jewel.stats.filter(stat => stat && stat.id) : []);
        if (stats.length === 0 && jewel.stat && jewel.stat.id) stats = typeof normalizeJewelStat === 'function' ? [normalizeJewelStat(jewel.stat)].filter(Boolean) : [jewel.stat];
        if (stats.length === 0) return null;
        let hiddenTier = Math.max(1, Math.floor(Math.max(...stats.map(stat => Math.floor(stat.tier || 1)))));
        let hasWaxBonus = stats.some(stat => stat && stat.waxBonus);
        let statLimit = jewel.waxedByBeeswax || hasWaxBonus ? 5 : 4;
        return { ...jewel, rarity: ['normal', 'magic', 'rare', 'unique'].includes(jewel.rarity) ? jewel.rarity : 'normal', waxedByBeeswax: !!jewel.waxedByBeeswax || hasWaxBonus, hiddenTier: hiddenTier, stats: stats.slice(0, statLimit), locked: !!jewel.locked };
    }
    merged.jewelInventory = Array.isArray(merged.jewelInventory) ? merged.jewelInventory.map(normalizeJewelRecord).filter(Boolean) : [];
    let jewelInventoryCap = JEWEL_INVENTORY_LIMIT + (Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0))) * 5);
    merged.jewelInventory = merged.jewelInventory.slice(0, jewelInventoryCap);
    // 심연 군주(워록 wlk8)가 주얼 슬롯을 2칸 추가로 제공하므로 최대 4슬롯까지 보존한다.
    merged.jewelSlots = Array.isArray(merged.jewelSlots) ? merged.jewelSlots.slice(0, 4).map(normalizeJewelRecord) : [null, null];
    while (merged.jewelSlots.length < 2) merged.jewelSlots.push(null);
    merged.jewelSlotAmplify = Array.isArray(merged.jewelSlotAmplify) ? merged.jewelSlotAmplify.slice(0, 4).map(v => Math.max(0, Math.min(20, Math.floor(v || 0)))) : [0, 0];
    while (merged.jewelSlotAmplify.length < 2) merged.jewelSlotAmplify.push(0);
    merged.skyGemEnhancements = (merged.skyGemEnhancements && typeof merged.skyGemEnhancements === 'object') ? merged.skyGemEnhancements : {};
    Object.keys(merged.skyGemEnhancements).forEach(skill => {
        let arr = Array.isArray(merged.skyGemEnhancements[skill]) ? merged.skyGemEnhancements[skill] : [];
        merged.skyGemEnhancements[skill] = typeof normalizeSkyGemEnhancementSlots === 'function'
            ? normalizeSkyGemEnhancementSlots(arr)
            : arr.slice(0, 5);
    });
    merged.ascendNodes = Array.isArray(merged.ascendNodes) ? merged.ascendNodes.filter(id => typeof id === 'string') : [];
    merged.ascendKeystonePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendKeystonePoints, 0, 0)));
    let classKeystoneSet = new Set(getClassKeystoneDefs(merged.ascendClass).map(node => node.id));
    merged.ascendKeystones = Array.isArray(merged.ascendKeystones)
        ? Array.from(new Set(merged.ascendKeystones.filter(id => typeof id === 'string' && classKeystoneSet.has(id)))).slice(0, CLASS_KEYSTONE_PICK_LIMIT)
        : [];
    if (!merged.ascendClass && (!Array.isArray(merged.completedTrials) || merged.completedTrials.length === 0)) {
        merged.ascendKeystonePoints = 0;
        merged.ascendKeystones = [];
    }
    if (merged.ascendClass) {
        let legacyTrialCount = Array.isArray(merged.completedTrials)
            ? merged.completedTrials.filter(id => ['trial_1', 'trial_2', 'trial_3', 'trial_4'].includes(id)).length
            : 0;
        let legacyAscendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, 0, 0, 4)));
        let legacyKeystoneTotal = Math.min(CLASS_KEYSTONE_PICK_LIMIT, Math.max(legacyAscendRank, legacyTrialCount));
        let minExpectedPoints = Math.max(0, legacyKeystoneTotal - merged.ascendKeystones.length);
        merged.ascendKeystonePoints = Math.max(merged.ascendKeystonePoints, minExpectedPoints);
    }
    merged.starWedge = (merged.starWedge && typeof merged.starWedge === 'object') ? merged.starWedge : {};
    merged.starWedge.unlocked = !!merged.starWedge.unlocked;
    merged.starWedge.unlockNoticeSeen = !!merged.starWedge.unlockNoticeSeen;
    merged.starWedge.skyRiftGauge = clampFiniteNumber(merged.starWedge.skyRiftGauge, 0, 0, 100);
    merged.starWedge.skyRiftReady = !!merged.starWedge.skyRiftReady;
    merged.starWedge.skyRiftMinTier = Number.isFinite(merged.starWedge.skyRiftMinTier) ? Math.max(1, Math.floor(merged.starWedge.skyRiftMinTier)) : null;
    merged.starWedge.activeMeteorTier = Number.isFinite(merged.starWedge.activeMeteorTier) ? Math.max(1, Math.floor(merged.starWedge.activeMeteorTier)) : null;
    let meteorReturnZoneId = merged.starWedge.meteorReturnZoneId;
    merged.starWedge.meteorReturnZoneId = (typeof meteorReturnZoneId === 'number' || typeof meteorReturnZoneId === 'string') && meteorReturnZoneId !== METEOR_FALL_ZONE_ID ? meteorReturnZoneId : null;
    merged.starWedge.lastAnomalyAt = Number.isFinite(merged.starWedge.lastAnomalyAt) ? Math.max(0, Math.floor(merged.starWedge.lastAnomalyAt)) : 0;
    merged.starWedge.skyRiftCarryGauge = clampFiniteNumber(merged.starWedge.skyRiftCarryGauge, 0, 0, 99);
    merged.starWedge.constellationBuff = (merged.starWedge.constellationBuff && typeof merged.starWedge.constellationBuff === 'object') ? merged.starWedge.constellationBuff : null;
    merged.starWedge.entriesCleared = Math.max(0, Math.floor(clampFiniteNumber(merged.starWedge.entriesCleared, 0, 0)));
    merged.starWedge.firstClearDone = !!merged.starWedge.firstClearDone;
    merged.starWedge.selectedWedgeId = Number.isFinite(merged.starWedge.selectedWedgeId) ? merged.starWedge.selectedWedgeId : null;
    merged.starWedge.wedges = Array.isArray(merged.starWedge.wedges) ? merged.starWedge.wedges.filter(w => w && Number.isFinite(w.id) && Array.isArray(w.lines)).slice(0, 60) : [];
    let mergedAstronomerLevel = merged.expertise && merged.expertise.levels ? merged.expertise.levels.astronomer : 1;
    let starWedgeSocketCap = typeof getMaxEquippedStarWedgesForLevel === 'function' ? getMaxEquippedStarWedgesForLevel(mergedAstronomerLevel) : MAX_STAR_WEDGES;
    merged.starWedge.sockets = Array.isArray(merged.starWedge.sockets) ? merged.starWedge.sockets.filter(s => s && typeof s.nodeId === 'string' && Number.isFinite(s.wedgeId)).slice(0, starWedgeSocketCap) : [];
    merged.starWedge.nodeMutations = (merged.starWedge.nodeMutations && typeof merged.starWedge.nodeMutations === 'object') ? merged.starWedge.nodeMutations : {};
    let validVoidPassiveIds = new Set(typeof getVoidPassiveNodeIds === 'function' ? getVoidPassiveNodeIds() : []);
    let rawVoidPassives = (merged.voidPassives && typeof merged.voidPassives === 'object') ? merged.voidPassives : {};
    merged.voidPassives = {};
    let legacyVoidMigration = !(save.voidPassives && typeof save.voidPassives === 'object');
    let allocatedVoidIds = legacyVoidMigration ? new Set((merged.passives || []).map(id => String(id))) : new Set();
    validVoidPassiveIds.forEach(nodeId => {
        let rawEntry = rawVoidPassives[nodeId] && typeof rawVoidPassives[nodeId] === 'object' ? rawVoidPassives[nodeId] : {};
        let stats = Array.isArray(rawEntry.stats) ? rawEntry.stats : [];
        if (legacyVoidMigration && allocatedVoidIds.has(String(nodeId)) && stats.length <= 0) {
            let node = PASSIVE_TREE.nodes[nodeId];
            if (node && P_STATS[node.legacyVoidStat] && Number.isFinite(Number(node.legacyVoidVal))) {
                stats = [{ id: node.legacyVoidStat, val: Number(node.legacyVoidVal) }];
            }
        }
        stats = stats.filter(line => line && P_STATS[line.id] && Number.isFinite(Number(line.val))).slice(0, 2).map(line => ({ id: line.id, val: Number(line.val) }));
        let transcendent = (typeof normalizeTranscendentVoidPassive === 'function') ? normalizeTranscendentVoidPassive(rawEntry.transcendent) : null;
        if (stats.length > 0 || transcendent || rawVoidPassives[nodeId] || allocatedVoidIds.has(String(nodeId))) merged.voidPassives[nodeId] = { rarity: transcendent ? 'transcendent' : (stats.length > 0 ? 'magic' : 'normal'), stats, transcendent };
    });
    merged.completedTrials = Array.isArray(merged.completedTrials) ? merged.completedTrials.filter(id => typeof id === 'string') : [];
    merged.unlockedTrials = Array.isArray(merged.unlockedTrials) ? merged.unlockedTrials.filter(id => typeof id === 'string') : [];
    merged.itemSubtab = ['item-tab-equip', 'item-tab-craft', 'item-tab-fossil', 'item-tab-market', 'item-tab-infuser'].includes(merged.itemSubtab) ? merged.itemSubtab : 'item-tab-equip';
    merged.skillSubtab = ['skill-tab-equip','skill-tab-enhance','skill-tab-condition'].includes(merged.skillSubtab) ? merged.skillSubtab : 'skill-tab-equip';
    merged.skillAutoRules = Array.isArray(merged.skillAutoRules) ? merged.skillAutoRules : [];
    merged.conditionGemUnlocked = !!merged.conditionGemUnlocked;
    merged.conditionGemPool = Array.isArray(merged.conditionGemPool) ? merged.conditionGemPool : [];
    merged.pendingConditionGemChoices = Array.isArray(merged.pendingConditionGemChoices) ? merged.pendingConditionGemChoices : null;
    merged.clearedRootBosses = Array.isArray(merged.clearedRootBosses) ? merged.clearedRootBosses : [];
    // 과거 루프 정산 시 컨디션 젬 해금이 잘못 초기화되던 버그로 잠긴 기존 플레이어 복구:
    // 뿌리 보스를 한 번이라도 클리어한 적이 있다면 영구 해금 처리한다.
    if (!merged.conditionGemUnlocked && merged.clearedRootBosses.length > 0) merged.conditionGemUnlocked = true;
    merged.mapSubtab = ['map-tab-zones', 'map-tab-abyss', 'map-tab-chaos-realm', 'map-tab-sky', 'map-tab-underworld', 'map-tab-cosmos', 'map-tab-ocean'].includes(merged.mapSubtab) ? merged.mapSubtab : 'map-tab-zones';
    merged.mapExploreSubtab = ['map-explore-hunting', 'map-explore-chaos', 'map-explore-root-boss', 'map-explore-labyrinth', 'map-explore-deep-chaos', 'map-explore-meteor', 'map-explore-beehive', 'map-explore-colony', 'map-explore-voidrift', 'map-explore-timerift', 'map-explore-trials'].includes(merged.mapExploreSubtab) ? merged.mapExploreSubtab : 'map-explore-hunting';
    merged.coreCube = (typeof normalizeCoreCubeState === 'function') ? normalizeCoreCubeState(merged.coreCube) : (merged.coreCube || (defaultGame.coreCube || {}));
    if (merged.coreCube && merged.coreCube.unlocked) merged.unlocks.cube = true;
    merged.gemFoldInactiveAttack = !!merged.gemFoldInactiveAttack;
    merged.gemFoldInactiveSupport = !!merged.gemFoldInactiveSupport;
    if (merged.gemFoldInactive) {
        merged.gemFoldInactiveAttack = true;
        merged.gemFoldInactiveSupport = true;
    }
    merged.autoRepeatSeasonBoss = !!merged.autoRepeatSeasonBoss;
    if (((merged.currencies || {}).talismanCore || 0) > 0) {
        merged.currencies.sealShard = (merged.currencies.sealShard || 0) + (merged.currencies.talismanCore || 0);
        merged.currencies.talismanCore = 0;
    }
    if (((merged.currencies || {}).jewelCore || 0) > 0) {
        merged.currencies.jewelShard = (merged.currencies.jewelShard || 0) + Math.max(0, Math.floor(merged.currencies.jewelCore || 0));
        merged.currencies.jewelCore = 0;
    }
    merged.talismanUnlocked = !!merged.talismanUnlocked || ((merged.currencies.sealShard || 0) > 0) || ((merged.currencies.strongSealShard || 0) > 0);
    merged.talismanUnlockedCells = Array.isArray(merged.talismanUnlockedCells) ? merged.talismanUnlockedCells.map(v => Math.floor(v)).filter(v => v >= 0 && v < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)).filter(v => isTalismanBoardCellValid(v % TALISMAN_BOARD_W, Math.floor(v / TALISMAN_BOARD_W))) : [];
    merged.talismanBoardUnlock = Math.max(3, Math.min(5, Math.floor(clampFiniteNumber(merged.talismanBoardUnlock, 3, 3, 5))));
    if (merged.talismanUnlockedCells.length === 0 && merged.talismanBoardUnlock > 3) {
        for (let y = 0; y < merged.talismanBoardUnlock; y++) {
            for (let x = 0; x < merged.talismanBoardUnlock; x++) {
                if (x < 4 && y < 4) continue;
                if (!isTalismanBoardCellValid(x, y)) continue;
                merged.talismanUnlockedCells.push(talismanCellIndex(x, y));
            }
        }
    }
    merged.talismanUnlockPickMode = !!merged.talismanUnlockPickMode;
    merged.talismanSubtab = merged.talismanSubtab === 'talisman-sub-colony-ward' ? 'talisman-sub-colony-ward' : 'talisman-sub-board';
    merged.talismanInventory = Array.isArray(merged.talismanInventory) ? merged.talismanInventory.filter(t => t && t.id && t.shape && (t.stat || (Array.isArray(t.stats) && t.stats.length > 0) || t.special || t.isUnique)).map(t => ({ ...t, locked: !!t.locked, waxedByBeeswax: !!t.waxedByBeeswax })) : [];
    merged.talismanBoard = Array.isArray(merged.talismanBoard) ? merged.talismanBoard.slice(0, TALISMAN_BOARD_W * TALISMAN_BOARD_H) : [];
    while (merged.talismanBoard.length < (TALISMAN_BOARD_W * TALISMAN_BOARD_H)) merged.talismanBoard.push(null);
    merged.talismanPlacements = (merged.talismanPlacements && typeof merged.talismanPlacements === 'object') ? merged.talismanPlacements : {};
    merged.talismanSelectedId = Number.isFinite(merged.talismanSelectedId) ? merged.talismanSelectedId : null;
    merged.talismanUnseal = (merged.talismanUnseal && merged.talismanUnseal.current) ? merged.talismanUnseal : null;
    if (merged.talismanUnlocked) merged.unlocks.talisman = true;
    merged.gemEnhanceUnlocked = !!merged.gemEnhanceUnlocked;
    merged.gemEngraveSelectedSlot = Math.max(0, Math.min(4, Math.floor(clampFiniteNumber(merged.gemEngraveSelectedSlot, 0, 0, 4))));
    merged.gemEnhanceTargetSkill = (typeof merged.gemEnhanceTargetSkill === 'string' && SKILL_DB[merged.gemEnhanceTargetSkill] && SKILL_DB[merged.gemEnhanceTargetSkill].isGem && Array.isArray(merged.skills) && merged.skills.includes(merged.gemEnhanceTargetSkill)) ? merged.gemEnhanceTargetSkill : null;
    merged.uniqueCodex = (merged.uniqueCodex && typeof merged.uniqueCodex === 'object') ? merged.uniqueCodex : {};
    merged.codexNewlyRegistered = (merged.codexNewlyRegistered && typeof merged.codexNewlyRegistered === 'object') ? merged.codexNewlyRegistered : {};
    merged.codexCollapsedSlots = (merged.codexCollapsedSlots && typeof merged.codexCollapsedSlots === 'object') ? merged.codexCollapsedSlots : {};
    merged.codexSubtab = (merged.codexSubtab === 'realm') ? 'realm' : 'main';
    merged.codexSelectedSlot = getCodexSlotOrder().includes(merged.codexSelectedSlot) ? merged.codexSelectedSlot : '무기';
    merged.uniqueCodexCompletedRewardClaimed = !!merged.uniqueCodexCompletedRewardClaimed;
    if (!merged.gemEnhanceUnlocked && (((merged.currencies || {}).bossCore || 0) > 0 || ((merged.currencies || {}).skyEssence || 0) > 0)) merged.gemEnhanceUnlocked = true;
    merged.inTicketBossFight = !!merged.inTicketBossFight;
    merged.beehive = (merged.beehive && typeof merged.beehive === 'object') ? merged.beehive : { unlockedPermanent:false, inRun:false, branchStep:0, cleared:false, routeSeed:0 };
    merged.colony = (merged.colony && typeof merged.colony === 'object') ? { ...defaultGame.colony, ...merged.colony } : { ...defaultGame.colony };
    merged.colony.wave = Math.max(0, Math.floor(clampFiniteNumber(merged.colony.wave, 0, 0)));
    merged.colony.highestWave = Math.max(merged.colony.wave, Math.floor(clampFiniteNumber(merged.colony.highestWave, merged.colony.wave, 0)));
    merged.colony.wardInventory = Array.isArray(merged.colony.wardInventory) ? merged.colony.wardInventory.map(w => w && typeof w === 'object' ? { ...w, locked: !!w.locked } : w).filter(Boolean) : [];
    merged.colony.wardEquipped = Array.isArray(merged.colony.wardEquipped) ? merged.colony.wardEquipped.slice(0, 4) : [null,null,null,null];
    while (merged.colony.wardEquipped.length < 4) merged.colony.wardEquipped.push(null);
    let highestWardSlot = merged.colony.wardEquipped.reduce((max, ward, idx) => ward ? Math.max(max, idx + 1) : max, 1);
    if (!savedColonyHadWardSlotVersion) merged.colony.wardSlots = highestWardSlot;
    else merged.colony.wardSlots = Math.max(1, Math.min(4, Math.floor(merged.colony.wardSlots || 1)));
    merged.colony.wardSlots = Math.max(merged.colony.wardSlots, highestWardSlot);
    merged.colony.wardSlotVersion = 1;
    let beeHasReturnZone = merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null;
    let beeHasStartedRoute = Math.max(0, Math.floor(merged.beehive.branchStep || 0)) > 0;
    let activeBeehiveRuntime = !!(merged.beehive.inRun && merged.currentZoneId === 'beehive_run' && (
        merged.beehive.awaitingClear
        || (merged.beehive.pendingChoice && (beeHasReturnZone || beeHasStartedRoute))
        || merged.beehive.queenActive
        || merged.beehive.pendingWaveReward
        || (Array.isArray(merged.beehive.pendingQueenRewards) && merged.beehive.pendingQueenRewards.length > 0)
        || (Array.isArray(merged.enemies) && merged.enemies.some(enemy => enemy && enemy.hp > 0))
    ));
    if (!activeBeehiveRuntime) {
        let staleBeehiveReturnZone = beeHasReturnZone ? merged.beehive.returnZoneId : merged.maxZoneId;
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
        if (merged.currentZoneId === 'beehive_run') merged.currentZoneId = staleBeehiveReturnZone;
    }
    if (merged.beehive && merged.beehive.inRun) {
        merged.combatHalted = !merged.beehive.awaitingClear;
    } else {
        merged.combatHalted = !!merged.combatHalted;
    }
    merged.seenTutorials = Array.isArray(merged.seenTutorials) ? merged.seenTutorials.filter(id => typeof id === 'string') : [];
    merged.journalEntries = Array.isArray(merged.journalEntries) ? Array.from(new Set(merged.journalEntries.filter(id => typeof id === 'string' && JOURNAL_DB[id]))) : ['prologue'];
    merged.voidRift = (merged.voidRift && typeof merged.voidRift === 'object') ? merged.voidRift : {};
    merged.voidRift.grandBreachCleared = !!merged.voidRift.grandBreachCleared;
    merged.timeRift = (merged.timeRift && typeof merged.timeRift === 'object') ? { ...defaultGame.timeRift, ...merged.timeRift } : { ...defaultGame.timeRift };
    merged.timeRift.fusionCount = Math.max(0, Math.floor(clampFiniteNumber(merged.timeRift.fusionCount, 0, 0)));
    repairJournalEntriesFromProgress(merged);
    // 저널 보너스는 기록 정의에서 항상 재구축한다. 저장 배열을 그대로 신뢰하면
    // 클라우드 병합·구버전 이관 과정에서 같은 기록이 중복되어 능력치가 누적될 수 있다.
    let journalLoadState = rebuildJournalBonusStateForLoad(merged);
    let pendingJournalPassivePoints = Math.max(0, Math.floor(journalLoadState.pendingPassivePoints || 0));
    merged.passiveStarEvolution = !!merged.passiveStarEvolution;
    merged.settings.showDeathNotice = merged.settings.showDeathNotice !== false;
    merged.settings.themeMode = merged.settings.themeMode === 'light' ? 'light' : 'dark';
    merged.settings.twoRowTabs = !!merged.settings.twoRowTabs;
    merged.settings.leftPaneCollapsed = !!merged.settings.leftPaneCollapsed;
    merged.settings.combatLogCollapsed = !!merged.settings.combatLogCollapsed;
    merged.settings.autoSalvageEnabled = !!merged.settings.autoSalvageEnabled;
    merged.settings.autoEnterGrandBreach = !!merged.settings.autoEnterGrandBreach;
    merged.settings.autoSalvageRarities = { ...(defaultGame.settings.autoSalvageRarities || {}), ...(merged.settings.autoSalvageRarities || {}) };
    merged.settings.inventoryViewRarities = { ...(defaultGame.settings.inventoryViewRarities || {}), ...(merged.settings.inventoryViewRarities || {}) };
    merged.settings.jewelAutoSalvageEnabled = !!merged.settings.jewelAutoSalvageEnabled;
    merged.settings.jewelAutoSalvageRarities = { ...(defaultGame.settings.jewelAutoSalvageRarities || {}), ...(merged.settings.jewelAutoSalvageRarities || {}) };
    merged.settings.mapCompleteAction = ['nextZone', 'repeatZone', 'nextLoopBestPlusOne', 'stop'].includes(merged.settings.mapCompleteAction) ? merged.settings.mapCompleteAction : 'nextZone';
    merged.settings.townReturnAction = ['retry', 'stop'].includes(merged.settings.townReturnAction) ? merged.settings.townReturnAction : 'retry';
    merged.heroSelectionInitialized = !!merged.heroSelectionInitialized;
    merged.selectedHeroId = HERO_SELECTION_DEFS[merged.selectedHeroId] ? merged.selectedHeroId : 'hero1';
    merged.appearanceHeroId = HERO_SELECTION_DEFS[merged.appearanceHeroId] ? merged.appearanceHeroId : null;
    merged.discoveredHeroIds = Array.isArray(merged.discoveredHeroIds) ? merged.discoveredHeroIds.filter(id => HERO_SELECTION_DEFS[id]) : [];
    if (!merged.heroSelectionInitialized && !merged.heroFreeSwitchUnlocked && merged.selectedHeroId === 'hero1' && merged.discoveredHeroIds.length === 1 && merged.discoveredHeroIds[0] === 'hero1') {
        merged.discoveredHeroIds = [];
    }
    if ((merged.heroSelectionInitialized || merged.heroFreeSwitchUnlocked) && !merged.discoveredHeroIds.includes(merged.selectedHeroId)) merged.discoveredHeroIds.push(merged.selectedHeroId);
    merged.heroFreeSwitchUnlocked = !!merged.heroFreeSwitchUnlocked || merged.discoveredHeroIds.length >= HERO_SELECTION_ORDER.length;
    if (merged.heroSelectionInitialized && merged.unlocks) merged.unlocks.char = true;
    if (!merged.heroFreeSwitchUnlocked) merged.appearanceHeroId = null;
    merged.pendingLoopHeroSelection = !!merged.pendingLoopHeroSelection;
    merged.abyssPassivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.abyssPassivePoints, defaultGame.abyssPassivePoints, 0)));
    merged.abyssClearedDepths = Array.isArray(merged.abyssClearedDepths) ? merged.abyssClearedDepths.map(v => Math.max(1, Math.floor(v || 1))).filter(v => v <= 20) : [];
    merged.abyssPassives = { ...(defaultGame.abyssPassives || {}), ...(merged.abyssPassives || {}) };
    merged.playerAilments = Array.isArray(merged.playerAilments) ? merged.playerAilments.map(row => ({ type: row.type, time: Math.max(0, clampFiniteNumber(row.time, 0, 0, 30)), power: Math.max(0, clampFiniteNumber(row.power, 0.1, 0, 1.5)), sourceHitDamage: Math.max(0, Math.floor(clampFiniteNumber(row.sourceHitDamage || row.hitDamage, 0, 0))) })).filter(row => row.type) : [];
    merged.playerLeechInstances = Array.isArray(merged.playerLeechInstances) ? merged.playerLeechInstances.map(row => ({ remaining: Math.max(0, clampFiniteNumber(row.remaining, 0, 0)), rate: Math.max(0, clampFiniteNumber(row.rate, 0, 0)), target: row.target === 'energyShield' ? 'energyShield' : 'life' })).filter(row => row.remaining > 0 && row.rate > 0).slice(0, 80) : [];
    merged.recentDamageEvents = Array.isArray(merged.recentDamageEvents) ? merged.recentDamageEvents.map(normalizeRecentDamageEvent).filter(Boolean) : [];
    merged.lastDeathLog = normalizeDeathLog(merged.lastDeathLog);
    merged.enemies = Array.isArray(merged.enemies) ? merged.enemies.map(normalizeEnemyRecord).filter(Boolean) : [];
    let aliveEnemyIds = new Set((merged.enemies || []).map(enemy => String(enemy.id)));
    function pruneEnemyRuntimeMap(rawMap, options = {}) {
        let map = (rawMap && typeof rawMap === 'object') ? rawMap : {};
        let keys = Object.keys(map);
        let maxKeys = Math.max(0, Math.floor(options.maxKeys || 200));
        let out = {};
        for (let i = 0; i < keys.length; i++) {
            let key = keys[i];
            if (!aliveEnemyIds.has(String(key))) continue;
            out[key] = map[key];
            if (Object.keys(out).length >= maxKeys) break;
        }
        return out;
    }
    merged.enemyKeystoneDebuffs = pruneEnemyRuntimeMap(merged.enemyKeystoneDebuffs, { maxKeys: 120 });
    merged.rangerWeakpointMarks = pruneEnemyRuntimeMap(merged.rangerWeakpointMarks, { maxKeys: 120 });
    merged.enemyUniqueChaosResDown = pruneEnemyRuntimeMap(merged.enemyUniqueChaosResDown, { maxKeys: 120 });
    merged.enemyUniqueElementalResDown = pruneEnemyRuntimeMap(merged.enemyUniqueElementalResDown, { maxKeys: 120 });
    merged.enemyCurseExpirePayloads = pruneEnemyRuntimeMap(merged.enemyCurseExpirePayloads, { maxKeys: 120 });
    merged.encounterPlan = Array.isArray(merged.encounterPlan) ? merged.encounterPlan.map(normalizeEncounterMarker).filter(Boolean).sort((a, b) => a.at - b.at) : [];
    merged.level = Math.max(1, Math.floor(clampFiniteNumber(merged.level, defaultGame.level, 1, MAX_PLAYER_LEVEL)));
    merged.exp = Math.max(0, Math.floor(clampFiniteNumber(merged.exp, defaultGame.exp, 0)));
    merged.season = Math.max(1, Math.floor(clampFiniteNumber(merged.season, defaultGame.season, 1)));
    merged.loopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.loopCount, defaultGame.loopCount, 0)));
    merged.woodsmanDefeatAttempts = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanDefeatAttempts, defaultGame.woodsmanDefeatAttempts, 0)));
    merged.woodsmanSimulatorSeenLoop = !!merged.woodsmanSimulatorSeenLoop;
    merged.woodsmanEntrancePending = !!(merged.woodsmanEntrancePending && merged.currentZoneId === OUTSIDE_CHAOS_ZONE_ID);
    merged.woodsmanCurseActive = !!merged.woodsmanCurseActive;
    merged.woodsmanCurseDamageTakenStacks = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseDamageTakenStacks, defaultGame.woodsmanCurseDamageTakenStacks || 0, 0)));
    merged.woodsmanCurseLastTickAt = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseLastTickAt, defaultGame.woodsmanCurseLastTickAt || 0, 0)));
    merged.woodsmanCurseNextLogStack = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanCurseNextLogStack, defaultGame.woodsmanCurseNextLogStack || 0, 0)));
    merged.chaosInfuserUnlocked = !!merged.chaosInfuserUnlocked || merged.woodsmanSimulatorSeenLoop || Math.max(0, Math.floor(merged.woodsmanDefeatAttempts || 0)) > 0 || (Array.isArray(merged.journalEntries) && merged.journalEntries.includes('woodsman'));
    merged.killsInZone = Math.max(0, Math.floor(clampFiniteNumber(merged.killsInZone, defaultGame.killsInZone, 0)));
    merged.passivePoints = Math.max(0, Math.floor(clampFiniteNumber(merged.passivePoints, defaultGame.passivePoints, 0))) + Math.max(0, Math.floor(merged.autoRefundedPassivePoints || 0)) + pendingJournalPassivePoints;
    merged.inventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.inventoryExpandLevel, defaultGame.inventoryExpandLevel, 0)));
    merged.jewelInventoryExpandLevel = Math.max(0, Math.floor(clampFiniteNumber(merged.jewelInventoryExpandLevel, defaultGame.jewelInventoryExpandLevel, 0)));
    merged.settings = { ...defaultGame.settings, ...(merged.settings || {}) };
    merged.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(merged.settings.damageNumberFormat) ? merged.settings.damageNumberFormat : 'comma';
    merged.settings.showExpComma = merged.settings.showExpComma !== false;
    merged.settings.showHpComma = merged.settings.showHpComma !== false;
    merged.settings.showEnemyHpComma = merged.settings.showEnemyHpComma !== false;
    merged.settings.showCharacterComma = merged.settings.showCharacterComma !== false;
    merged.settings.notiFilters = { ...(defaultGame.settings.notiFilters || {}), ...(merged.settings.notiFilters || {}) };
    merged.playerHp = Math.max(0, Math.floor(clampFiniteNumber(merged.playerHp, defaultGame.playerHp, 0)));
    merged.playerEnergyShield = Math.max(0, Math.floor(clampFiniteNumber(merged.playerEnergyShield, defaultGame.playerEnergyShield, 0))); 
    merged.moveTimer = clampFiniteNumber(merged.moveTimer, defaultGame.moveTimer, 0);
    merged.moveTotalTime = clampFiniteNumber(merged.moveTotalTime, defaultGame.moveTotalTime, 0);
    merged.runProgress = clampFiniteNumber(merged.runProgress, defaultGame.runProgress, 0, 100);
    merged.encounterIndex = Math.max(0, Math.floor(clampFiniteNumber(merged.encounterIndex, defaultGame.encounterIndex, 0)));
    merged.nextEnemyId = Math.max(1, Math.floor(clampFiniteNumber(merged.nextEnemyId, defaultGame.nextEnemyId, 1)));
    merged.seasonPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.seasonPoints, defaultGame.seasonPoints, 0)));
    merged.loopDeepPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.loopDeepPoints, defaultGame.loopDeepPoints, 0)));
    merged.loopDeepStats = { ...(defaultGame.loopDeepStats || {}), ...(merged.loopDeepStats || {}) };
    merged.chaosRealm = { ...createDefaultChaosRealmState(), ...(merged.chaosRealm || {}) };
    merged.skyTower = { ...createDefaultSkyTowerState(), ...(merged.skyTower || {}) };
    const legacyCondensedSkyPower = Math.max(0, Math.floor(Number(merged.currencies.condensedSkyPower) || 0));
    if (legacyCondensedSkyPower > 0) {
        merged.skyTower.condensedPower = Math.max(0, Math.floor(Number(merged.skyTower.condensedPower) || 0)) + legacyCondensedSkyPower;
    }
    delete merged.currencies.condensedSkyPower;
    merged.skyTower.skyStone = { ...(createDefaultSkyTowerState().skyStone || {}), ...((merged.skyTower || {}).skyStone || {}) };
    merged.skyTower.gemBoosts = { ...((merged.skyTower || {}).gemBoosts || {}) };
    merged.chaosRealm.permanentBonuses = { ...CHAOS_REALM_DEFAULT_BONUSES, ...((merged.chaosRealm || {}).permanentBonuses || {}) };
    merged.chaosRealm.unlocked = !!merged.chaosRealm.unlocked;
    merged.chaosRealm.highestFloor = Math.max(0, Math.floor(clampFiniteNumber(merged.chaosRealm.highestFloor, 0, 0)));
    merged.chaosRealm.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.chaosRealm.currentFloor, 1, 1)));
    let hasSavedUnderworldProgress = !!(save && typeof save === 'object' && save.underworldProgress && typeof save.underworldProgress === 'object');
    let legacyUnderworldProgress = {};
    if (!hasSavedUnderworldProgress) {
        let legacyHighest = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).highestFloor, 1, 1)));
        let legacyCurrent = Math.max(1, Math.floor(clampFiniteNumber(((save && save.chaosRealm) || {}).currentFloor, 1, 1)));
        legacyUnderworldProgress = { highestFloor: legacyHighest, currentFloor: legacyCurrent, floor10Cleared: legacyHighest >= 11 };
    }
    merged.underworldProgress = { ...(defaultGame.underworldProgress || { highestFloor: 1, currentFloor: 1 }), ...legacyUnderworldProgress, ...(merged.underworldProgress || {}) };
    merged.underworldProgress.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.highestFloor, 1, 1)));
    merged.underworldProgress.currentFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.underworldProgress.currentFloor, 1, 1)));
    let savedRunes = (merged.underworldRunes && typeof merged.underworldRunes === 'object') ? merged.underworldRunes : {};
    let underworld10ClearCredit = !!merged.underworldProgress.floor10Cleared
        || Math.max(0, Math.floor(Number(savedRunes.unlockedSlots) || 0)) >= 1
        || Math.max(0, Math.floor(Number(savedRunes.unlockedRunesMaxNumber) || 0)) >= 1;
    merged.underworldProgress.floor10Cleared = underworld10ClearCredit;
    if (!underworld10ClearCredit) {
        merged.underworldProgress.highestFloor = Math.min(merged.underworldProgress.highestFloor, 10);
        merged.underworldProgress.currentFloor = Math.min(merged.underworldProgress.currentFloor, merged.underworldProgress.highestFloor);
    }
    merged.chaosRealm.clearedFloors = Array.isArray(merged.chaosRealm.clearedFloors) ? Array.from(new Set(merged.chaosRealm.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.chaosRealm.woodsmanBestDamagePct = Math.max(0, Math.min(100, Number(merged.chaosRealm.woodsmanBestDamagePct) || 0));
    Object.keys(CHAOS_REALM_DEFAULT_BONUSES).forEach(key => { merged.chaosRealm.permanentBonuses[key] = Math.max(0, Number(merged.chaosRealm.permanentBonuses[key]) || 0); });
    if (merged.chaosRealm.unlocked && merged.chaosRealm.highestFloor < 1) merged.chaosRealm.highestFloor = 1;
    merged.skyTower.unlocked = !!merged.skyTower.unlocked;
    merged.skyTower.highestFloor = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.highestFloor, 1, 1)));
    merged.skyTower.currentFloor = Math.max(1, Math.min(merged.skyTower.highestFloor, Math.floor(clampFiniteNumber(merged.skyTower.currentFloor, 1, 1))));
    merged.skyTower.loopSeason = Math.max(1, Math.floor(clampFiniteNumber(merged.skyTower.loopSeason, merged.season || 1, 1)));
    if (merged.skyTower.loopSeason !== Math.max(1, Math.floor(merged.season || 1))) { merged.skyTower.loopSeason = Math.max(1, Math.floor(merged.season || 1)); merged.skyTower.clearedThisLoop = 0; }
    merged.skyTower.clearedThisLoop = Math.max(0, Math.min(getSkyTowerLoopClearLimit(), Math.floor(clampFiniteNumber(merged.skyTower.clearedThisLoop, 0, 0))));
    merged.skyTower.clearedFloors = Array.isArray(merged.skyTower.clearedFloors) ? Array.from(new Set(merged.skyTower.clearedFloors.map(v => Math.floor(v || 0)).filter(v => v >= 1))).sort((a, b) => a - b) : [];
    merged.skyTower.condensedPower = Math.max(0, Math.floor(clampFiniteNumber(merged.skyTower.condensedPower, 0, 0)));
    merged.skyTower.skyStone.level = Math.max(0, Math.min(getSkyStoneMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.skyStone.level, 0, 0))));
    merged.skyTower.skyStone.crafted = !!merged.skyTower.skyStone.crafted || merged.skyTower.skyStone.level > 0;
    Object.keys(merged.skyTower.gemBoosts).forEach(name => { merged.skyTower.gemBoosts[name] = Math.max(0, Math.min(getSkyTowerGemBoostMaxLevel(), Math.floor(clampFiniteNumber(merged.skyTower.gemBoosts[name], 0, 0)))); if (merged.skyTower.gemBoosts[name] <= 0) delete merged.skyTower.gemBoosts[name]; });
    if (!merged.skyTower.unlocked && ((merged.season || 1) > 15 || ((merged.season || 1) >= 15 && (merged.loopProgressCurrent && merged.loopProgressCurrent.chaos20Cleared)))) merged.skyTower.unlocked = true;
    merged.woodsmanPendingScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanPendingScore, defaultGame.woodsmanPendingScore || 0, 0)));
    merged.woodsmanLifetimeScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanLifetimeScore, defaultGame.woodsmanLifetimeScore || 0, 0)));
    merged.woodsmanSettledScore = Math.max(0, Math.floor(clampFiniteNumber(merged.woodsmanSettledScore, defaultGame.woodsmanSettledScore || 0, 0)));
    merged.woodsmanEchoRun = (merged.woodsmanEchoRun && typeof merged.woodsmanEchoRun === 'object') ? merged.woodsmanEchoRun : { active:false, timeLeft:0, duration:30, lastTickAt:0, totalDamage:0, bestDps:0 };
    merged.woodsmanEchoRun.active = !!merged.woodsmanEchoRun.active;
    merged.woodsmanEchoRun.timeLeft = Math.max(0, Number(merged.woodsmanEchoRun.timeLeft || 0));
    merged.woodsmanEchoRun.duration = 30;
    merged.woodsmanEchoRun.totalDamage = Math.max(0, Math.floor(Number(merged.woodsmanEchoRun.totalDamage || 0)));
    merged.woodsmanEchoRun.bestDps = Math.max(0, Number(merged.woodsmanEchoRun.bestDps || 0));
    merged.loopProgressBase = { ...(defaultGame.loopProgressBase || {}), ...(merged.loopProgressBase || {}) };
    merged.loopProgressCurrent = { ...(defaultGame.loopProgressCurrent || {}), ...(merged.loopProgressCurrent || {}) };
    merged.loopProgressBase.specialBosses = Array.isArray(merged.loopProgressBase.specialBosses) ? merged.loopProgressBase.specialBosses : [];
    merged.loopProgressCurrent.specialBosses = Array.isArray(merged.loopProgressCurrent.specialBosses) ? merged.loopProgressCurrent.specialBosses : [];
    merged.loopProgressCurrent.cosmosPlanets = Array.isArray(merged.loopProgressCurrent.cosmosPlanets) ? Array.from(new Set(merged.loopProgressCurrent.cosmosPlanets.filter(Boolean))) : [];
    merged.cosmosLoopCount = Math.max(0, Math.floor(clampFiniteNumber(merged.cosmosLoopCount, defaultGame.cosmosLoopCount || 0, 0)));
    merged.lastLoopAdvancePath = ['chaos', 'cosmos'].includes(merged.lastLoopAdvancePath) ? merged.lastLoopAdvancePath : null;
    merged.loopProgressCurrent.chaos20Cleared = !!merged.loopProgressCurrent.chaos20Cleared || (Array.isArray(merged.abyssClearedDepths) && merged.abyssClearedDepths.map(v => Math.floor(v || 0)).includes(20));
    if (!merged.skyTower.unlocked && (merged.season || 1) >= 15 && merged.loopProgressCurrent.chaos20Cleared) merged.skyTower.unlocked = true;
    merged.pendingLoopDecision = !!merged.pendingLoopDecision;
    merged.pendingLoopReady = !!merged.pendingLoopReady;
    merged.ascendPoints = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendPoints, defaultGame.ascendPoints, 0)));
    merged.ascendRank = Math.max(0, Math.floor(clampFiniteNumber(merged.ascendRank, defaultGame.ascendRank, 0, 4)));
    merged.activeSkill = SKILL_DB[merged.activeSkill] ? merged.activeSkill : (merged.skills[0] || '기본 공격');
    if (merged.activeSkill && SKILL_DB[merged.activeSkill] && Array.isArray(SKILL_DB[merged.activeSkill].tags) && SKILL_DB[merged.activeSkill].tags.includes('summon_attack')) {
        if (!merged.gemEnhanceTargetSkill) merged.gemEnhanceTargetSkill = merged.activeSkill;
        merged.activeSkill = '기본 공격';
    }
    merged.equippedSummonSkills = Array.isArray(merged.equippedSummonSkills)
        ? Array.from(new Set(merged.equippedSummonSkills.filter(name => {
            let def = SKILL_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack') && merged.skills.includes(name));
        })))
        : [];
    let hasSavedSummonSkillCounts = !!(save && Object.prototype.hasOwnProperty.call(save, 'summonSkillCounts') && save.summonSkillCounts && typeof save.summonSkillCounts === 'object');
    merged.summonSkillCounts = hasSavedSummonSkillCounts ? { ...merged.summonSkillCounts } : {};
    Object.keys(merged.summonSkillCounts).forEach(name => { if (!merged.equippedSummonSkills.includes(name)) delete merged.summonSkillCounts[name]; });
    if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    let ownedSummonAttackSkills = (Array.isArray(merged.skills) ? merged.skills : []).filter(name => {
        let def = SKILL_DB[name] || {};
        return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_attack'));
    });
    let saveSummonCap = estimateSummonEquipCapForMergedSave(merged);
    if (!merged.summonLoadoutInitialized && merged.equippedSummonSkills.length === 0 && ownedSummonAttackSkills.length > 0) {
        merged.equippedSummonSkills = ownedSummonAttackSkills.slice(0, saveSummonCap);
        if (hasSavedSummonSkillCounts) merged.equippedSummonSkills.forEach(name => { merged.summonSkillCounts[name] = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1)); });
    }
    if (!hasSavedSummonSkillCounts) {
        let legacySummonCounts = {};
        let guardCount = (Array.isArray(merged.equippedSupports) ? merged.equippedSupports : []).filter(name => {
            let def = SUPPORT_GEM_DB[name] || {};
            return !!(def && Array.isArray(def.tags) && def.tags.includes('summon_guard'));
        }).length;
        let baseAttackSlots = Math.max(0, Math.min(merged.equippedSummonSkills.length, saveSummonCap - guardCount));
        merged.equippedSummonSkills.slice(0, baseAttackSlots).forEach(name => { legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1; });
        let usedSlots = Math.min(saveSummonCap, guardCount + baseAttackSlots);
        let cursor = 0;
        while (usedSlots < saveSummonCap && merged.equippedSummonSkills.length > 0) {
            let name = merged.equippedSummonSkills[cursor % merged.equippedSummonSkills.length];
            legacySummonCounts[name] = (legacySummonCounts[name] || 0) + 1;
            usedSlots++;
            cursor++;
        }
        merged.summonSkillCounts = legacySummonCounts;
    }
    let saveSummonUsed = 0;
    merged.equippedSummonSkills.slice().forEach(name => {
        let current = Math.max(1, Math.floor(Number(merged.summonSkillCounts[name]) || 1));
        let allowed = Math.max(0, Math.min(current, saveSummonCap - saveSummonUsed));
        if (allowed <= 0) {
            merged.equippedSummonSkills = merged.equippedSummonSkills.filter(gemName => gemName !== name);
            delete merged.summonSkillCounts[name];
            return;
        }
        merged.summonSkillCounts[name] = allowed;
        saveSummonUsed += allowed;
    });
    merged.summonLoadoutInitialized = true;
    let equippedEnhanceTargets = [];
    if (SKILL_DB[merged.activeSkill] && SKILL_DB[merged.activeSkill].isGem) equippedEnhanceTargets.push(merged.activeSkill);
    merged.equippedSummonSkills.forEach(name => {
        if (SKILL_DB[name] && SKILL_DB[name].isGem && !equippedEnhanceTargets.includes(name)) equippedEnhanceTargets.push(name);
    });
    if (!equippedEnhanceTargets.includes(merged.gemEnhanceTargetSkill)) {
        if (equippedEnhanceTargets.includes(merged.activeSkill)) merged.gemEnhanceTargetSkill = merged.activeSkill;
        else if (merged.equippedSummonSkills.length > 0) merged.gemEnhanceTargetSkill = merged.equippedSummonSkills[0];
        else merged.gemEnhanceTargetSkill = null;
    }
    if (typeof merged.currentZoneId === 'string' && /^\d+$/.test(merged.currentZoneId)) merged.currentZoneId = parseInt(merged.currentZoneId, 10);
    if (typeof merged.maxZoneId === 'string' && /^\d+$/.test(merged.maxZoneId)) merged.maxZoneId = parseInt(merged.maxZoneId, 10);
    if (typeof merged.maxZoneId !== 'string') {
        let mergedSeasonCap = getSeasonFinalZoneId(merged.season || 1);
        merged.maxZoneId = clampNumber(Number.isFinite(merged.maxZoneId) ? merged.maxZoneId : 0, 0, Math.max(MAP_ZONES.length - 1, mergedSeasonCap));
    }
    if (typeof merged.currentZoneId !== 'string') {
        let numericZoneId = Number.isFinite(merged.currentZoneId) ? merged.currentZoneId : 0;
        let savedDepth = Math.max(Math.floor(merged.abyssEndlessDepth || 20), getAbyssDepthFromZoneId(numericZoneId), ...((Array.isArray(merged.abyssUnlockedDepths) ? merged.abyssUnlockedDepths : [20]).map(v => Math.floor(v || 0))));
        let maxDeepZoneId = getAbyssZoneIdForDepth(Math.max(20, savedDepth));
        merged.currentZoneId = clampNumber(numericZoneId, 0, Math.max(MAP_ZONES.length - 1, maxDeepZoneId));
    }
    if (typeof merged.currentZoneId === 'string' && !merged.currentZoneId.startsWith('trial_') && !merged.currentZoneId.includes('_boss_') && merged.currentZoneId !== 'beehive_run' && merged.currentZoneId !== 'colony_run' && merged.currentZoneId !== 'cosmos_challenge' && merged.currentZoneId !== LABYRINTH_ZONE_ID && merged.currentZoneId !== METEOR_FALL_ZONE_ID && merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID && merged.currentZoneId !== CHAOS_REALM_ZONE_ID && merged.currentZoneId !== SKY_TOWER_ZONE_ID && merged.currentZoneId !== UNDERWORLD_ZONE_ID) merged.currentZoneId = 0;
    if (typeof merged.currentZoneId === 'string' && !getZone(merged.currentZoneId)) merged.currentZoneId = 0;
    if (merged.currentZoneId === 'beehive_run' && !(merged.beehive && merged.beehive.inRun)) merged.currentZoneId = merged.beehive && merged.beehive.returnZoneId !== undefined && merged.beehive.returnZoneId !== null ? merged.beehive.returnZoneId : merged.maxZoneId;
    if (merged.beehive && merged.beehive.inRun && merged.currentZoneId !== 'beehive_run') {
        merged.beehive.inRun = false;
        resetBeehiveRunModifiers(merged.beehive);
    }
    if (merged.woodsmanBuildLock && (merged.currentZoneId !== OUTSIDE_CHAOS_ZONE_ID || !merged.woodsmanBuildSnapshot)) {
        merged.woodsmanBuildLock = false;
        merged.woodsmanBuildSnapshot = null;
    }
    let currentAbyssDepth = typeof merged.currentZoneId !== 'string' ? getAbyssDepthFromZoneId(merged.currentZoneId) : 0;
    let legacyDeepChaosSlot = (merged.season || 1) >= 10 && currentAbyssDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
    if (typeof merged.maxZoneId !== 'string' && typeof merged.currentZoneId !== 'string' && merged.currentZoneId > merged.maxZoneId && currentAbyssDepth <= 20 && !legacyDeepChaosSlot) merged.currentZoneId = merged.maxZoneId;
    if (merged.discoveredPassives.length === 0) merged.discoveredPassives = ['n0'];
    let seasonCap = getSeasonFinalZoneId(merged.season || 1);
    if (typeof merged.maxZoneId !== 'string') merged.maxZoneId = clampNumber(merged.maxZoneId, 0, seasonCap);
    if (typeof merged.currentZoneId !== 'string') {
        let normalizedDepth = getAbyssDepthFromZoneId(merged.currentZoneId);
        let keepLegacyDeepChaosSlot = (merged.season || 1) >= 10 && normalizedDepth === 20 && Math.floor(merged.abyssEndlessDepth || 0) > 20;
        if ((normalizedDepth <= 20 && !keepLegacyDeepChaosSlot) || (merged.season || 1) < 10) merged.currentZoneId = clampNumber(merged.currentZoneId, 0, seasonCap);
    }
    if ((merged.season || 1) >= STAR_WEDGE_UNLOCK_LOOP && (merged.maxZoneId || 0) >= STAR_WEDGE_UNLOCK_ACT) {
        merged.starWedge.unlocked = true;
    }
    merged.saveVersion = defaultGame.saveVersion;
    return merged;
}

function cloneDefaultGame() {
    return JSON.parse(JSON.stringify(defaultGame));
}

function isStartupOverlayOpen() {
    return !!startupOverlayActive;
}

function setStartupOverlayActive(active) {
    startupOverlayActive = !!active;
    document.body.classList.toggle('startup-active', startupOverlayActive);
    let overlay = document.getElementById('startup-overlay');
    if (overlay) overlay.classList.toggle('active', startupOverlayActive);
}

function setLoadingOverlayState(active, options = {}) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (loadingOverlayTimer) {
        clearInterval(loadingOverlayTimer);
        loadingOverlayTimer = null;
    }
    if (!active) {
        overlay.classList.remove('active');
        document.body.classList.remove('loading-active');
        loadingOverlayProgress = 0;
        if (barEl) barEl.style.width = '0%';
        return;
    }
    loadingOverlayProgress = Math.max(0, Math.min(92, options.progress || 12));
    if (titleEl) titleEl.innerText = options.title || '차원을 정렬하는 중...';
    if (detailEl) detailEl.innerText = options.detail || '세이브 상태를 점검하고 전장을 준비하고 있습니다.';
    if (captionEl) captionEl.innerText = options.caption || 'Syncing Timeline';
    if (barEl) barEl.style.width = `${loadingOverlayProgress}%`;
    overlay.classList.add('active');
    document.body.classList.add('loading-active');
    loadingOverlayTimer = setInterval(() => {
        loadingOverlayProgress = Math.min(93, loadingOverlayProgress + (Math.random() * 7 + 2));
        if (barEl) barEl.style.width = `${loadingOverlayProgress}%`;
    }, 260);
}

function advanceLoadingOverlay(options = {}) {
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (titleEl && options.title) titleEl.innerText = options.title;
    if (detailEl && options.detail) detailEl.innerText = options.detail;
    if (captionEl && options.caption) captionEl.innerText = options.caption;
    if (barEl && Number.isFinite(options.progress)) {
        loadingOverlayProgress = Math.max(loadingOverlayProgress, options.progress);
        barEl.style.width = `${loadingOverlayProgress}%`;
    }
}

async function finishLoadingOverlay() {
    advanceLoadingOverlay({
        progress: 100,
        title: '전장을 여는 중...',
        detail: '진입 준비를 마무리하고 있습니다.',
        caption: 'Opening Gate'
    });
    await new Promise(resolve => setTimeout(resolve, 320));
    setLoadingOverlayState(false);
}

function openStartupGate(options = {}) {
    if (options.accountOnly && cloudState.user) setCloudMessage('계정 화면을 열었습니다. 다른 계정을 쓰려면 "다른 계정 사용"을 눌러주세요.');
    else if (options.accountOnly && !cloudState.user) setCloudMessage('계정 화면을 열었습니다. 로그인하거나 회원가입할 수 있습니다.');
    else setCloudMessage('시작 화면을 다시 열었습니다.');
    setStartupOverlayActive(true);
    updateCloudSaveUI();
}

function getCurrentZoneLabel() {
    let zone = getZone && typeof getZone === 'function' ? getZone(game.currentZoneId) : null;
    return zone && zone.name ? zone.name : '액트 1: 버려진 해안';
}

function updateStartupScreenUI() {
    let overlay = document.getElementById('startup-overlay');
    if (!overlay) return;
    let config = getCloudConfig();
    let localSummaryEl = document.getElementById('startup-local-summary');
    let localTimeEl = document.getElementById('startup-local-time');
    let statusEl = document.getElementById('startup-status');
    let authFormEl = document.getElementById('startup-auth-form');
    let authActionsEl = document.getElementById('startup-auth-actions');
    let socialActionsEl = document.getElementById('startup-social-actions');
    let continueBtn = document.getElementById('btn-startup-continue');
    let switchBtn = document.getElementById('btn-startup-switch-account');
    let guestBtn = document.getElementById('btn-startup-guest');
    let backBtn = document.getElementById('btn-startup-back');
    let loginBtn = document.getElementById('btn-startup-login');
    let signupBtn = document.getElementById('btn-startup-signup');
    let googleBtn = document.getElementById('btn-startup-google');
    let kakaoBtn = document.getElementById('btn-startup-kakao');
    let localStamp = game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0;
    let zoneLabel = getCurrentZoneLabel();
    let loopLabel = Math.max(1, Math.floor((game && game.season) || 1));
    if (localSummaryEl) localSummaryEl.innerText = `Lv.${game.level || 1} · 루프 ${loopLabel} · ${zoneLabel}`;
    if (localTimeEl) localTimeEl.innerText = formatCloudTime(localStamp);
    if (statusEl) statusEl.innerHTML = `<strong>안내</strong><br>${cloudState.lastMessage || '시작 방식을 선택해주세요.'}`;
    if (backBtn) {
        backBtn.style.display = gameplayStarted ? 'block' : 'none';
        backBtn.disabled = cloudState.busy;
    }

    if (!config.enabled) {
        if (authFormEl) authFormEl.classList.remove('hidden');
        if (authActionsEl) authActionsEl.style.display = 'grid';
        if (socialActionsEl) socialActionsEl.style.display = 'grid';
        if (continueBtn) continueBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (loginBtn) loginBtn.disabled = true;
        if (signupBtn) signupBtn.disabled = true;
        if (googleBtn) googleBtn.disabled = true;
        if (kakaoBtn) kakaoBtn.disabled = true;
        if (guestBtn) guestBtn.disabled = false;
        return;
    }

    if (cloudState.user) {
        if (authFormEl) authFormEl.classList.add('hidden');
        if (authActionsEl) authActionsEl.style.display = 'none';
        if (socialActionsEl) socialActionsEl.style.display = 'none';
        if (continueBtn) {
            continueBtn.style.display = 'block';
            continueBtn.disabled = cloudState.busy;
        }
        if (switchBtn) {
            switchBtn.style.display = 'block';
            switchBtn.disabled = cloudState.busy;
        }
        if (guestBtn) guestBtn.disabled = cloudState.busy;
        return;
    }

    if (authFormEl) authFormEl.classList.remove('hidden');
    if (authActionsEl) authActionsEl.style.display = 'grid';
    if (socialActionsEl) socialActionsEl.style.display = 'grid';
    if (continueBtn) continueBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (loginBtn) loginBtn.disabled = cloudState.busy;
    if (signupBtn) signupBtn.disabled = cloudState.busy;
    if (googleBtn) googleBtn.disabled = cloudState.busy;
    if (kakaoBtn) kakaoBtn.disabled = cloudState.busy;
    if (guestBtn) guestBtn.disabled = cloudState.busy;
}

function getCloudConfig() {
    let raw = window.CLOUD_SAVE_CONFIG || {};
    let supabaseUrl = String(raw.supabaseUrl || '').trim().replace(/\/+$/, '');
    let supabaseAnonKey = String(raw.supabaseAnonKey || '').trim();
    let enabled = raw.enabled !== false && !!supabaseUrl && !!supabaseAnonKey;
    return { enabled, supabaseUrl, supabaseAnonKey };
}

const CLOUD_TOKEN_REFRESH_LEEWAY_MS = 5 * 60 * 1000;
const CLOUD_TOKEN_EXPIRY_WARNING_MS = 10 * 60 * 1000;

const CLOUD_SKIP_OAUTH_RESTORE_KEY = 'projectidle_cloud_skip_oauth_restore';

function markSkipOAuthRestoreOnce() {
    try { localStorage.setItem(CLOUD_SKIP_OAUTH_RESTORE_KEY, '1'); } catch (error) { console.warn('failed to mark OAuth restore skip:', error); }
}

function consumeSkipOAuthRestoreOnce() {
    try {
        let marked = localStorage.getItem(CLOUD_SKIP_OAUTH_RESTORE_KEY) === '1';
        if (marked) localStorage.removeItem(CLOUD_SKIP_OAUTH_RESTORE_KEY);
        return marked;
    } catch (e) {
        return false;
    }
}

async function clearSupabasePersistedSession() {
    let client = getSupabaseClient();
    if (!client) return;
    try {
        await client.auth.signOut({ scope: 'local' });
    } catch (error) {
        console.warn('supabase local signout failed:', error);
    }
}

let supabaseClient = null;

function getSupabaseClient() {
    if (window.supabaseClient) return window.supabaseClient;
    if (supabaseClient) return supabaseClient;
    let config = getCloudConfig();
    if (!config.enabled) return null;
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        console.warn('supabase-js is not loaded.');
        return null;
    }
    supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    window.supabaseClient = supabaseClient;
    return supabaseClient;
}

function getOAuthRedirectUrl() {
    let origin = window.location.origin || '';
    let pathname = window.location.pathname || '/';
    let normalizedPath = pathname.endsWith('/') ? pathname : pathname.replace(/\/[^/]*$/, '/');
    return `${origin}${normalizedPath}`;
}

async function loginWithGoogle() {
    await loginWithOAuthProvider('google');
}

async function loginWithKakao() {
    await loginWithOAuthProvider('kakao');
}

function getSocialOAuthOptions(provider) {
    let redirectTo = getOAuthRedirectUrl();
    let options = { redirectTo };
    if (provider === 'kakao') {
        // 카카오 로그인에서 account_email scope를 요청하지 않습니다.
        options.scopes = 'profile_nickname';
        options.queryParams = { scope: 'profile_nickname' };
    }
    return options;
}


function sanitizeKakaoScopeInUrl(rawUrl) {
    if (!rawUrl) return rawUrl;
    try {
        let url = new URL(rawUrl);
        let scopeRaw = url.searchParams.get('scope') || '';
        let scopes = scopeRaw.split(/\s+/).map(v => v.trim()).filter(Boolean);
        let filtered = scopes.filter(scope => scope !== 'account_email');
        if (filtered.length === 0) filtered = ['profile_nickname'];
        url.searchParams.set('scope', filtered.join(' '));
        return url.toString();
    } catch (e) {
        return rawUrl;
    }
}

async function loginWithOAuthProvider(provider) {
    let client = getSupabaseClient();
    if (!client) return setCloudMessage('OAuth 클라이언트를 초기화하지 못했습니다.');
    if (cloudState.busy) return;
    cloudState.busy = true;
    setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 로그인으로 이동 중입니다...`);
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        if (provider === 'kakao') options.skipBrowserRedirect = true;
        let { data, error } = await client.auth.signInWithOAuth({ provider, options });
        if (error) throw error;
        if (provider === 'kakao') {
            let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
            if (!safeUrl) throw new Error('Kakao OAuth URL을 생성하지 못했습니다.');
            window.location.assign(safeUrl);
            return;
        }
    } catch (error) {
        cloudState.busy = false;
        setCloudMessage('OAuth 로그인 시작 실패: ' + (error.message || error));
        updateCloudSaveUI();
    }
}

function recoverBusyStateAfterOAuthBack() {
    if (!cloudState.busy) return;
    let href = window.location.href || '';
    let hasOAuthParams = /[?#].*(access_token|code|error|state)=/i.test(href);
    if (hasOAuthParams) return;
    cloudState.busy = false;
    setCloudMessage('인증이 취소되었습니다. 다시 시도해주세요.');
    updateCloudSaveUI();
}

window.addEventListener('pageshow', function(event) { recoverBusyStateAfterOAuthBack(event); startBackgroundCombatReturn(Date.now()); });
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) recoverBusyStateAfterOAuthBack();
});

async function tryRestoreSupabaseOAuthSession() {
    let client = getSupabaseClient();
    if (!client) return false;
    try {
        let { data, error } = await client.auth.getSession();
        if (error) throw error;
        let session = data && data.session;
        if (!session || !session.access_token) return false;
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        let userLabel = (session.user && session.user.email) ? session.user.email : (session.user && session.user.id ? session.user.id : '알 수 없음');
        setCloudMessage('로그인됨: ' + userLabel);
        return true;
    } catch (error) {
        console.warn('supabase oauth session restore failed:', error);
        return false;
    }
}

function escapeHTML(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

let __patchNotesCache = null;

// changelog.md 파싱: "## 버전 — 날짜" 헤더와 "- 항목" 불릿을 엔트리로 변환합니다.
function parseChangelogMarkdown(text) {
    let entries = [];
    let current = null;
    String(text || '').split(/\r?\n/).forEach(line => {
        let header = line.match(/^##\s+(.+?)\s*$/);
        if (header) {
            let title = header[1].trim();
            let version = title;
            let date = '';
            let parts = title.split(/\s+[—–-]\s+/);
            if (parts.length >= 2) {
                version = parts[0].trim();
                date = parts.slice(1).join(' - ').trim();
            }
            current = { version: version, date: date, items: [] };
            entries.push(current);
            return;
        }
        let bullet = line.match(/^\s*[-*]\s+(.+?)\s*$/);
        if (bullet && current) current.items.push(bullet[1].trim());
    });
    return entries;
}

function buildPatchNotesHTML(notes) {
    if (!Array.isArray(notes) || !notes.length) return '<div class="patch-note-empty">등록된 패치 노트가 없습니다.</div>';
    return notes.map(entry => {
        let items = (entry.items || []).map(it => `<li>${escapeHTML(it)}</li>`).join('');
        return `<div class="patch-note-entry">`
            + `<div class="patch-note-head">`
            + `<span class="patch-note-version">${escapeHTML(entry.version || '')}</span>`
            + `<span class="patch-note-date">${escapeHTML(entry.date || '')}</span>`
            + `</div>`
            + `<ul class="patch-note-list">${items}</ul>`
            + `</div>`;
    }).join('');
}

function applyPatchNotesHTML(html) {
    let el = document.getElementById('patch-notes-overlay-body');
    if (el) el.innerHTML = html;
}

function openPatchNotes() {
    renderPatchNotes();
    let overlay = document.getElementById('patch-notes-overlay');
    if (overlay) overlay.classList.add('active');
}

function closePatchNotes() {
    let overlay = document.getElementById('patch-notes-overlay');
    if (overlay) overlay.classList.remove('active');
}

function renderPatchNotes() {
    if (__patchNotesCache) {
        applyPatchNotesHTML(buildPatchNotesHTML(__patchNotesCache));
        return;
    }
    applyPatchNotesHTML('<div class="patch-note-empty">패치 노트를 불러오는 중입니다.</div>');
    fetch('changelog.md', { cache: 'no-cache' })
        .then(res => res.ok ? res.text() : Promise.reject(new Error('changelog load failed')))
        .then(text => {
            __patchNotesCache = parseChangelogMarkdown(text);
            applyPatchNotesHTML(buildPatchNotesHTML(__patchNotesCache));
        })
        .catch(() => {
            applyPatchNotesHTML('<div class="patch-note-empty">패치 노트를 불러오지 못했습니다.</div>');
        });
}

function persistCloudSession(session) {
    try {
        localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
        console.warn('failed to persist cloud session:', error);
    }
}

function clearCloudSessionStorage() {
    try {
        localStorage.removeItem(CLOUD_SESSION_STORAGE_KEY);
    } catch (error) {
        console.warn('failed to clear cloud session storage:', error);
    }
}

function loadStoredCloudSession() {
    try {
        let raw = localStorage.getItem(CLOUD_SESSION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('failed to load cloud session:', error);
        return null;
    }
}

function refreshSocialAfterCloudStateChange() {
    if (typeof syncSocialBackgroundTasks === 'function') syncSocialBackgroundTasks();
    if (typeof renderSocialTab !== 'function') return;
    let socialTab = document.getElementById('tab-social');
    let socialVisible = socialTab && (
        socialTab.classList.contains('active')
        || socialTab.classList.contains('ui-community-dock')
        || socialTab.classList.contains('ui-community-overlay')
        || document.body.classList.contains('community-dock-open')
        || document.body.classList.contains('community-overlay-open')
    );
    if (socialVisible) renderSocialTab();
    if (cloudState.user && typeof checkSocialChatNotification === 'function') {
        Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification refresh failed:', error));
    }
}

function applyCloudSession(session) {
    let previousUserId = cloudState.user && cloudState.user.id;
    if (!session || !session.access_token) {
        cloudState.session = null;
        cloudState.user = null;
        cloudState.isLoaded = false;
        clearCloudSessionStorage();
        updateCloudSaveUI();
        if (previousUserId) refreshSocialAfterCloudStateChange();
        return;
    }
    let expiresAt = Number(session.expires_at) || 0;
    if (!expiresAt && Number(session.expires_in) > 0) expiresAt = Math.floor(Date.now() / 1000) + Math.floor(Number(session.expires_in));
    cloudState.session = {
        access_token: session.access_token,
        refresh_token: session.refresh_token || (cloudState.session && cloudState.session.refresh_token) || '',
        expires_at: expiresAt,
        token_type: session.token_type || 'bearer',
        user: session.user || cloudState.user || null
    };
    cloudState.user = cloudState.session.user;
    cloudState.isLoaded = false;
    cloudState.tokenExpiryWarned = false;
    persistCloudSession(cloudState.session);
    updateCloudSaveUI();
    if (previousUserId !== (cloudState.user && cloudState.user.id)) refreshSocialAfterCloudStateChange();
}

function getCloudSessionExpiresAtMs() {
    let expiresAt = cloudState.session ? Number(cloudState.session.expires_at || 0) : 0;
    return expiresAt > 0 ? expiresAt * 1000 : 0;
}

function notifyCloudSessionExpired(message) {
    let text = message || '클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.';
    setCloudMessage(text);
    if (!cloudState.tokenExpiryWarned && typeof addLog === 'function') addLog(`⚠️ ${text}`, 'loot-rare');
    cloudState.tokenExpiryWarned = true;
}

async function refreshCloudSession(reason) {
    if (!cloudState.session || !cloudState.session.refresh_token) {
        notifyCloudSessionExpired('클라우드 로그인 갱신 정보가 없습니다. 다시 로그인해주세요.');
        return false;
    }
    if (cloudState.tokenRefreshPromise) return await cloudState.tokenRefreshPromise;
    cloudState.tokenRefreshPromise = (async () => {
        try {
            setCloudMessage(reason ? `클라우드 로그인 갱신 중... (${reason})` : '클라우드 로그인 갱신 중...');
            let refreshed = await cloudJsonRequest('/auth/v1/token?grant_type=refresh_token', {
                method: 'POST',
                useAuth: false,
                body: { refresh_token: cloudState.session.refresh_token }
            });
            applyCloudSession(refreshed);
            setCloudMessage('클라우드 로그인 세션을 자동 갱신했습니다.');
            return true;
        } catch (error) {
            console.warn('cloud token refresh failed:', error);
            applyCloudSession(null);
            notifyCloudSessionExpired('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
            return false;
        } finally {
            cloudState.tokenRefreshPromise = null;
            updateCloudSaveUI();
        }
    })();
    return await cloudState.tokenRefreshPromise;
}

async function ensureCloudSessionFresh(reason) {
    if (!cloudState.session || !cloudState.session.access_token) return false;
    let expiresAtMs = getCloudSessionExpiresAtMs();
    if (!expiresAtMs) return true;
    let remaining = expiresAtMs - Date.now();
    if (remaining <= CLOUD_TOKEN_REFRESH_LEEWAY_MS) return await refreshCloudSession(reason || '만료 예정');
    if (remaining <= CLOUD_TOKEN_EXPIRY_WARNING_MS && !cloudState.tokenExpiryWarned) notifyCloudSessionExpired('클라우드 로그인 세션이 곧 만료됩니다. 만료 전 자동 갱신 예정입니다.');
    return true;
}

async function cloudJsonRequest(path, options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) throw new Error('cloud-save-config.js 설정이 비어 있습니다.');
    if (options.useAuth !== false) {
        let fresh = await ensureCloudSessionFresh('요청 전 확인');
        if (!fresh) throw new Error('클라우드 로그인 세션이 만료되었습니다. 다시 로그인해주세요.');
    }
    let headers = { apikey: config.supabaseAnonKey, ...(options.headers || {}) };
    if (options.useAuth !== false && cloudState.session && cloudState.session.access_token) headers.Authorization = `Bearer ${cloudState.session.access_token}`;
    let body = options.body;
    if (body !== undefined && typeof body !== 'string' && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    let response = await fetch(config.supabaseUrl + path, {
        method: options.method || 'GET',
        headers,
        body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    });
    let text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text;
        }
    }
    if (!response.ok) {
        let message = data && (data.msg || data.error_description || data.message || data.error);
        throw new Error(message || `HTTP ${response.status}`);
    }
    return data;
}

function collectCloudCredentials() {
    let emailEl = document.getElementById('startup-email');
    let passwordEl = document.getElementById('startup-password');
    return {
        email: emailEl ? String(emailEl.value || '').trim() : '',
        password: passwordEl ? String(passwordEl.value || '') : ''
    };
}

function clearCloudPasswordInput() {
    let passwordEl = document.getElementById('startup-password');
    if (passwordEl) passwordEl.value = '';
}

async function enterGameWorld() {
    advanceLoadingOverlay({
        title: '전장을 불러오는 중...',
        detail: '전투 로그와 캐릭터 상태를 복원하고 있습니다.',
        caption: 'Restoring Battlefield',
        progress: 48
    });
    await ensureBattleAssetsLoadedBeforeEntry();
    gameplayStarted = true;
    setStartupOverlayActive(false);
    try {
        let settingsTab = document.getElementById('tab-settings');
        if (settingsTab && settingsTab.classList.contains('active')) {
            try {
                switchTab('tab-character');
            } catch (error) {
                console.error('switchTab on enterGameWorld failed:', error);
            }
        }
        updateStaticUI();
    } catch (error) {
        console.error('updateStaticUI on enterGameWorld failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield on enterGameWorld failed:', error);
    } finally {
        try {
            await finishLoadingOverlay();
        } catch (error) {
            console.error('finishLoadingOverlay on enterGameWorld failed:', error);
        }
        setLoadingOverlayState(false);
    }
}

async function continueWithCloudSession() {
    if (!cloudState.user || cloudState.busy) return;
    cloudState.busy = true;
    setLoadingOverlayState(true, {
        title: '클라우드 세이브를 여는 중...',
        detail: '계정 연결을 확인하고 최신 진행도를 비교하고 있습니다.',
        caption: 'Checking Cloud Save',
        progress: 14
    });
    setCloudMessage('클라우드 세이브를 확인하고 있습니다...');
    updateCloudSaveUI();
    try {
        advanceLoadingOverlay({
            title: '클라우드 저장을 불러오는 중...',
            detail: '클라우드 저장 전체를 로컬에 적용할 준비를 하고 있습니다.',
            caption: 'Comparing Timelines',
            progress: 48
        });
        await reconcileCloudSaveState({ preferRemoteOnResume: true, strictRemoteResume: true });
        await enterGameWorld();
    } catch (error) {
        setCloudMessage('클라우드 세이브 연결 실패: ' + (error.message || error));
        setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        refreshSocialAfterCloudStateChange();
    }
}

function prepareStartupAccountSwitch() {
    markSkipOAuthRestoreOnce();
    clearSupabasePersistedSession();
    applyCloudSession(null);
    cloudState.lastRemoteUpdatedAt = 0;
    cloudState.lastRemoteLoop = 0;
    setCloudMessage('다른 계정으로 로그인할 수 있습니다.');
    updateCloudSaveUI();
}

function returnFromStartupGate() {
    if (!gameplayStarted || cloudState.busy) return;
    setStartupOverlayActive(false);
    updateCloudSaveUI();
}

async function startGuestMode() {
    if (cloudState.busy) return;
    if (cloudState.user && !await requestGameConfirmation('복원된 로그인 세션을 사용하지 않고 이 기기의 로컬 저장으로 시작합니다.', {
        title: '게스트 모드로 시작',
        tone: 'warning',
        confirmLabel: '로컬 저장으로 시작'
    })) return;
    if (cloudState.user) {
        markSkipOAuthRestoreOnce();
        clearSupabasePersistedSession();
        applyCloudSession(null);
        cloudState.linkedProviders = [];
        cloudState.lastRemoteUpdatedAt = 0;
        cloudState.lastRemoteLoop = 0;
    }
    setCloudMessage('게스트 모드로 시작합니다. 이 기기 저장만 사용합니다.');
    setLoadingOverlayState(true, {
        title: '게스트 세션을 준비하는 중...',
        detail: '현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다.',
        caption: 'Starting Local Session',
        progress: 22
    });
    enterGameWorld();
}

function startupLogin() {
    cloudLogin({ source: 'startup', enterGame: true });
}

function startupSignUp() {
    cloudSignUp({ source: 'startup', enterGame: true });
}


async function refreshCloudLinkedIdentities() {
    let client = getSupabaseClient();
    if (!client || !cloudState.user) {
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = cloudState.user ? 'needs_login' : 'idle';
        return [];
    }
    try {
        if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
            try {
                await client.auth.setSession({
                    access_token: cloudState.session.access_token,
                    refresh_token: cloudState.session.refresh_token
                });
            } catch (sessionSyncError) {
                console.warn('supabase session sync failed before identity lookup:', sessionSyncError);
            }
        }
        let sessionResult = await client.auth.getSession();
        if (sessionResult && sessionResult.error) throw sessionResult.error;
        let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
        if (!session || !session.access_token) {
            cloudState.linkedProviders = [];
            cloudState.identityLookupState = 'needs_login';
            setCloudMessage('로그인 후 이용 가능합니다');
            return [];
        }
        let providers = [];
        if (client.auth && typeof client.auth.getUserIdentities === 'function') {
            let { data, error } = await client.auth.getUserIdentities();
            if (error) throw error;
            let identities = data && (data.identities || data.user_identities) ? (data.identities || data.user_identities) : [];
            providers = identities.map(it => it && (it.provider || it.identity_provider)).filter(Boolean);
        } else {
            let { data, error } = await client.auth.getUser();
            if (error) throw error;
            let identities = data && data.user && Array.isArray(data.user.identities) ? data.user.identities : [];
            providers = identities.map(it => it && it.provider).filter(Boolean);
        }
        cloudState.linkedProviders = Array.from(new Set(providers));
        cloudState.identityLookupState = 'ready';
        return cloudState.linkedProviders;
    } catch (error) {
        console.warn('failed to load linked identities:', error);
        cloudState.linkedProviders = [];
        cloudState.identityLookupState = 'needs_login';
        return [];
    }
}

async function linkGoogleAccount() {
    return await linkSocialIdentityProvider('google');
}

async function linkKakaoAccount() {
    return await linkSocialIdentityProvider('kakao');
}

async function linkSocialIdentityProvider(provider) {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    await refreshCloudLinkedIdentities();
    let providerKey = String(provider || '').toLowerCase();
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
    let alreadyLinked = linkedProviders.some(it => String(it || '').toLowerCase() === providerKey);
    if (alreadyLinked) return setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 계정은 이미 연동되어 있습니다.`);
    let client = getSupabaseClient();
    if (!client) return setCloudMessage('Supabase OAuth 클라이언트를 초기화하지 못했습니다.');
    // Supabase Dashboard > Authentication에서 Manual Identity Linking 옵션이 켜져 있어야 동작합니다.
    if (typeof client.auth.linkIdentity !== 'function') return setCloudMessage('현재 Supabase 클라이언트에서 계정 연결 API를 지원하지 않습니다.');
    if (cloudState.session && cloudState.session.access_token && cloudState.session.refresh_token && client.auth && typeof client.auth.setSession === 'function') {
        try {
            await client.auth.setSession({
                access_token: cloudState.session.access_token,
                refresh_token: cloudState.session.refresh_token
            });
        } catch (sessionSyncError) {
            console.warn('supabase session sync failed before linkIdentity:', sessionSyncError);
        }
    }
    let sessionResult = await client.auth.getSession();
    if (sessionResult && sessionResult.error) return setCloudMessage('로그인 후 이용 가능합니다');
    let session = sessionResult && sessionResult.data ? sessionResult.data.session : null;
    if (!session || !session.access_token) return setCloudMessage('로그인 후 이용 가능합니다');
    cloudState.busy = true;
    setCloudMessage(`${provider === 'google' ? 'Google' : '카카오'} 계정 연결을 시작합니다...`);
    updateCloudSaveUI();
    try {
        let options = getSocialOAuthOptions(provider);
        let { data, error } = await client.auth.linkIdentity({ provider, options });
        if (error) throw error;
        if (provider === 'kakao') {
            let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
            if (!safeUrl) throw new Error('카카오 연동 페이지 URL을 받지 못했습니다.');
            window.location.assign(safeUrl);
            return;
        }
    } catch (error) {
        setCloudMessage('소셜 계정 연결 시작 실패: ' + (error.message || error));
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function updateCloudSaveUI() {
    let pill = document.getElementById('ui-cloud-status-pill');
    let config = getCloudConfig();
    cloudState.configured = config.enabled;
    let hintEl = document.getElementById('ui-cloud-config-hint');
    let userEl = document.getElementById('ui-cloud-user');
    let localEl = document.getElementById('ui-cloud-local-save');
    let remoteEl = document.getElementById('ui-cloud-remote-save');
    let uploadProfileEl = document.getElementById('ui-cloud-upload-profile');
    let msgEl = document.getElementById('ui-cloud-message');
    let openGateBtn = document.getElementById('btn-cloud-open-gate');
    let switchGateBtn = document.getElementById('btn-cloud-return-startup');
    let canSync = config.enabled && !cloudState.busy && !!cloudState.user;

    if (pill) {
        pill.className = 'cloud-status-pill';
        if (!config.enabled) {
            pill.innerText = '미설정';
        } else if (cloudState.busy) {
            pill.classList.add('syncing');
            pill.innerText = '처리 중';
        } else if (cloudState.user) {
            pill.classList.add('online');
            pill.innerText = '연결됨';
        } else {
            pill.innerText = '대기 중';
        }
    }
    if (!config.enabled) {
        if (hintEl) hintEl.innerText = 'cloud-save-config.js에 Supabase URL과 publishable key를 넣으면 클라우드 세이브가 켜집니다.';
    } else if (cloudState.busy) {
        if (hintEl) hintEl.innerText = '시작 화면 또는 현재 세션에서 저장 데이터를 서버와 동기화하고 있습니다.';
    } else if (cloudState.user) {
        if (hintEl) hintEl.innerText = '로그인된 계정은 수동 저장 시 자동 업로드됩니다. 계정 변경은 시작 화면을 다시 열어 진행할 수 있습니다.';
    } else {
        if (hintEl) hintEl.innerText = '로그인과 회원가입은 시작 화면에서 진행합니다. 여기서는 상태 확인과 시작 화면 재열기만 제공합니다.';
    }
    if (pill && cloudState.lastMessage && /실패|오류/.test(cloudState.lastMessage) && !cloudState.busy) pill.classList.add('error');

    if (openGateBtn) openGateBtn.disabled = cloudState.busy;
    if (switchGateBtn) switchGateBtn.disabled = cloudState.busy || (!cloudState.user && !gameplayStarted);
    ['btn-cloud-logout', 'btn-cloud-push', 'btn-cloud-pull'].forEach(id => {
        let el = document.getElementById(id);
        if (el) el.disabled = !canSync;
    });
    let linkedProviders = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders.map(it => String(it || '').toLowerCase()) : [];
    let isGoogleLinked = linkedProviders.includes('google');
    let isKakaoLinked = linkedProviders.includes('kakao');
    let linkGoogleBtn = document.getElementById('btn-cloud-link-google');
    let linkKakaoBtn = document.getElementById('btn-cloud-link-kakao');
    if (linkGoogleBtn) {
        linkGoogleBtn.disabled = !canSync || isGoogleLinked;
        linkGoogleBtn.innerHTML = isGoogleLinked
            ? '<span>Google 연동됨</span>'
            : '<img src="assets/google_login.png" alt="Google 계정 연결">';
    }
    if (linkKakaoBtn) {
        linkKakaoBtn.disabled = !canSync || isKakaoLinked;
        linkKakaoBtn.innerHTML = isKakaoLinked
            ? '<span>카카오 연동됨</span>'
            : '<img src="assets/kakao_login.png" alt="카카오 계정 연결">';
    }
    if (userEl) userEl.innerText = cloudState.user && cloudState.user.email ? cloudState.user.email : (cloudState.user && cloudState.user.id ? cloudState.user.id : (config.enabled ? '로그인 안 됨' : '설정 필요'));
    if (localEl) localEl.innerText = formatCloudTime(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0);
    if (remoteEl) remoteEl.innerText = formatCloudTime(cloudState.lastRemoteUpdatedAt || (game && game.saveMeta ? game.saveMeta.lastCloudSyncAt : 0));
    if (uploadProfileEl) uploadProfileEl.innerText = formatCloudUploadProfile(game && game.saveMeta ? game.saveMeta.lastCloudUploadProfile : null);
    let identitiesEl = document.getElementById('ui-cloud-identities');
    if (identitiesEl) {
        let providers = Array.isArray(cloudState.linkedProviders) ? cloudState.linkedProviders : [];
        if (!cloudState.user || cloudState.identityLookupState === 'needs_login') {
            identitiesEl.innerText = '로그인 필요';
        } else {
            identitiesEl.innerText = providers.length ? providers.join(', ') : '연결된 소셜 계정 없음';
        }
    }
    if (msgEl) msgEl.innerText = cloudState.lastMessage || '대기 중';
    updateStartupScreenUI();
}

function normalizeCloudUploadProfile(profile) {
    if (!profile || typeof profile !== 'object') return null;
    return {
        at: Math.max(0, Math.floor(Number(profile.at) || 0)),
        fetchMs: Math.max(0, Math.floor(Number(profile.fetchMs) || 0)),
        serializeMs: Math.max(0, Math.floor(Number(profile.serializeMs) || 0)),
        uploadMs: Math.max(0, Math.floor(Number(profile.uploadMs) || 0)),
        totalMs: Math.max(0, Math.floor(Number(profile.totalMs) || 0)),
        payloadBytes: Math.max(0, Math.floor(Number(profile.payloadBytes) || 0))
    };
}

function formatCloudUploadProfile(profile) {
    let normalized = normalizeCloudUploadProfile(profile);
    if (!normalized || normalized.totalMs <= 0) return '없음';
    let sizeKb = (normalized.payloadBytes / 1024).toFixed(1);
    return `${normalized.totalMs}ms (조회 ${normalized.fetchMs}ms · 직렬화 ${normalized.serializeMs}ms · 전송 ${normalized.uploadMs}ms · ${sizeKb}KB)`;
}

function rememberCloudUploadProfile(profile) {
    let normalized = normalizeCloudUploadProfile(profile);
    if (!normalized) return null;
    ensureSaveMeta();
    normalized.at = normalized.at || Date.now();
    game.saveMeta.lastCloudUploadProfile = normalized;
    cloudState.lastSyncProfile = normalized;
    return normalized;
}

function applyExternalSave(snapshot, sourceStamp) {
    game = mergeDefaults(snapshot || {});
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    if (sourceStamp) {
        cloudState.lastRemoteUpdatedAt = sourceStamp;
        cloudState.lastRemoteLoop = getSaveLoopNumber(game);
        game.saveMeta.lastCloudSyncAt = Math.max(game.saveMeta.lastCloudSyncAt || 0, sourceStamp);
        if (!game.saveMeta.lastModifiedAt) game.saveMeta.lastModifiedAt = sourceStamp;
    }
    if (!persistLocalSave({ touchModifiedAt: false, allowRecoveryWrite: true })) {
        throw new Error('클라우드 저장을 로컬에 기록하지 못했습니다.');
    }
    recoverRuntimeState();
    refreshPassiveVisibility();
    tickShrineState();
    refreshTabHeaderUiIfNeeded();
    calculateReachableNodes();
    normalizeSupportLoadout(false);
    try {
        updateStaticUI();
    } catch (error) {
        console.error('updateStaticUI after cloud load failed:', error);
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('renderBattlefield after cloud load failed:', error);
    }
    updateCloudSaveUI();
}

async function fetchCloudUser() {
    return await cloudJsonRequest('/auth/v1/user');
}

async function restoreCloudSession() {
    let stored = loadStoredCloudSession();
    if (!stored || !stored.access_token) return false;
    if (stored.refresh_token) {
        cloudState.session = stored;
        cloudState.user = stored.user || null;
        return await refreshCloudSession('저장된 세션 복원');
    }
    clearCloudSessionStorage();
    setCloudMessage('저장된 클라우드 세션에 갱신 토큰이 없습니다. 다시 로그인해주세요.');
    return false;
}

async function fetchCloudSaveRecord() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    try {
        let userId = encodeURIComponent(cloudState.user.id);
        let rows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=user_id,save_data,updated_at&order=updated_at.desc.nullslast&limit=1`, {
            headers: { Accept: 'application/json' }
        });
        let record = Array.isArray(rows) ? rows[0] : null;
        if (!record) {
            let fallbackRows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=user_id,save_data,updated_at`, {
                headers: { Accept: 'application/json' }
            });
            if (Array.isArray(fallbackRows) && fallbackRows.length > 0) {
                record = fallbackRows
                    .filter(Boolean)
                    .sort((a, b) => {
                        let at = a && a.updated_at ? (new Date(a.updated_at).getTime() || 0) : 0;
                        let bt = b && b.updated_at ? (new Date(b.updated_at).getTime() || 0) : 0;
                        return bt - at;
                    })[0] || null;
            }
        }
        cloudState.isLoaded = true;
        cloudState.lastRemoteCheckedAt = Date.now();
        if (record && record.updated_at) cloudState.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
        if (record && record.save_data) updateRemoteLoopFromRecord(record);
        updateCloudSaveUI();
        return record;
    } catch (error) {
        cloudState.isLoaded = false;
        updateCloudSaveUI();
        throw error;
    }
}

function getLocalSaveStamp() {
    ensureSaveMeta();
    return game.saveMeta.lastModifiedAt || 0;
}

function getRemoteSaveStamp(record) {
    if (!record) return 0;
    return record.updated_at ? (new Date(record.updated_at).getTime() || 0) : ((record.save_data && record.save_data.saveMeta && record.save_data.saveMeta.lastModifiedAt) || 0);
}

function getSaveLoopNumber(snapshot) {
    let s = snapshot || {};
    let season = Math.max(1, Math.floor(Number(s.season) || 1));
    let loopCount = Math.max(0, Math.floor(Number(s.loopCount) || 0));
    return Math.max(season, loopCount + 1);
}

function updateRemoteLoopFromRecord(record) {
    if (!record || !record.save_data) return 0;
    let remoteLoop = getSaveLoopNumber(record.save_data);
    cloudState.lastRemoteLoop = remoteLoop;
    return remoteLoop;
}

function shouldBlockLocalPushForRemoteLoop(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    if (remoteLoop > localLoop) return { blocked: true, reason: 'higher-loop', localLoop, remoteLoop };
    if (record && record.save_data && isLikelyBootstrapLocalSave(localSnapshot)) return { blocked: true, reason: 'bootstrap-local', localLoop, remoteLoop };
    return { blocked: false, reason: 'safe', localLoop, remoteLoop };
}

function getLoopCompareSummary(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    return { localLoop, remoteLoop, safeToPush: localLoop >= remoteLoop };
}

function getSaveContentRichnessScore(snapshot) {
    let s = snapshot || {};
    let score = 0;
    score += Array.isArray(s.inventory) ? Math.min(200, s.inventory.length) : 0;
    score += Array.isArray(s.jewelInventory) ? Math.min(120, s.jewelInventory.length * 2) : 0;
    score += Array.isArray(s.talismanInventory) ? Math.min(120, s.talismanInventory.length * 2) : 0;
    score += (s.equipment && typeof s.equipment === 'object') ? Object.values(s.equipment).filter(Boolean).length * 8 : 0;
    score += (s.gemData && typeof s.gemData === 'object') ? Object.keys(s.gemData).length * 3 : 0;
    score += (s.supportGemData && typeof s.supportGemData === 'object') ? Object.keys(s.supportGemData).length * 3 : 0;
    score += (s.uniqueCodex && typeof s.uniqueCodex === 'object') ? Math.min(300, Object.keys(s.uniqueCodex).length * 2) : 0;
    score += (s.expertise && s.expertise.levels && typeof s.expertise.levels === 'object')
        ? Object.values(s.expertise.levels).reduce((sum, v) => sum + Math.max(0, Math.floor(Number(v) || 0)), 0)
        : 0;
    score += Math.max(0, Math.floor(Number(s.abyssEndlessDepth) || 0));
    score += Math.max(0, Math.floor(Number(s.labyrinthUnlockedMaxFloor) || 0));
    return score;
}

function isLikelyBootstrapLocalSave(snapshot) {
    let s = snapshot || game || {};
    let hasProgress = false;
    if ((s.level || 1) > 1) hasProgress = true;
    if ((s.exp || 0) > 0) hasProgress = true;
    if ((s.season || 1) > 1) hasProgress = true;
    if ((s.loopCount || 0) > 0) hasProgress = true;
    if ((s.maxZoneId || 0) > 0) hasProgress = true;
    if ((s.killsInZone || 0) > 0) hasProgress = true;
    if ((s.loopKills || 0) > 0) hasProgress = true;
    if ((s.loopDeaths || 0) > 0) hasProgress = true;
    if (Array.isArray(s.inventory) && s.inventory.length > 0) hasProgress = true;
    if (s.equipment && Object.values(s.equipment).some(Boolean)) hasProgress = true;
    if (Array.isArray(s.passives) && s.passives.length > 0) hasProgress = true;
    if ((s.passivePoints || 0) > 0) hasProgress = true;
    if (Array.isArray(s.skills) && s.skills.some(name => name && name !== '기본 공격')) hasProgress = true;
    if (s.activeSkill && s.activeSkill !== '기본 공격') hasProgress = true;
    if (s.gemData && Object.keys(s.gemData).length > 0) hasProgress = true;
    if (Array.isArray(s.supports) && s.supports.length > 0) hasProgress = true;
    if (s.supportGemData && Object.keys(s.supportGemData).length > 0) hasProgress = true;
    if (s.currencies && Object.keys(s.currencies).some(key => (s.currencies[key] || 0) > 0)) hasProgress = true;
    return !hasProgress;
}

function shouldPreferRemoteOverBootstrapLocal(record) {
    if (!record || !record.save_data) return false;
    return getRemoteSaveStamp(record) > 0 && isLikelyBootstrapLocalSave(game);
}

async function guardAgainstStaleLocalOverwrite(options = {}) {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) return { record, status: 'no-remote' };
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        applyExternalSave(record.save_data, remoteStamp);
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '로컬 세이브가 새로 생성된 기본 상태라 클라우드 업로드를 차단하고 서버 저장을 불러왔습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 로컬 업로드를 차단하고 클라우드를 불러왔습니다.`;
        setCloudMessage(guardMessage);
        if (!options.silentLog) addLog('클라우드 루프가 더 높아 로컬 저장으로 서버를 덮어쓰지 않았습니다.', 'loot-magic');
        return { record, status: 'pulled-remote-higher-loop' };
    }
    if (remoteStamp > localStamp + CLOUD_STALE_OVERWRITE_GUARD_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage(options.automatic ? '클라우드 저장이 더 최신이라 로컬에 먼저 반영했습니다.' : '클라우드 저장이 더 최신이라 덮어쓰기를 막고 자동으로 불러왔습니다.');
        if (!options.silentLog) addLog('클라우드가 더 최신이라 자동으로 불러왔습니다.', 'loot-magic');
        return { record, status: 'pulled-remote' };
    }
    return { record, status: 'safe-to-push' };
}

async function pushCloudSave(options = {}) {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    if (typeof canPersistLocalSave === 'function' && !canPersistLocalSave()) {
        let status = getLocalSaveStatus();
        throw new Error(status.message || '로컬 저장이 차단되어 클라우드 업로드를 중단했습니다.');
    }
    let t0 = Date.now();
    let remoteRecord = null;
    try {
        remoteRecord = await fetchCloudSaveRecord();
    } catch (loadError) {
        console.warn('cloud push preflight remote load failed:', loadError);
        throw new Error('클라우드 상태를 확인할 수 없어 업로드를 중단했습니다: ' + (loadError.message || loadError));
    }
    let tFetch = Date.now();
    let loopGuard = shouldBlockLocalPushForRemoteLoop(remoteRecord);
    if (loopGuard.blocked) {
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '로컬 세이브가 새로 생성된 기본 상태라 기존 클라우드 저장을 덮어쓸 수 없습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 로컬 저장으로 덮어쓸 수 없습니다.`;
        setCloudMessage(guardMessage);
        throw new Error(guardMessage);
    }
    if (!persistLocalSave({ touchModifiedAt: options.touchModifiedAt === true })) {
        throw new Error('로컬 저장에 실패하여 클라우드 업로드를 중단했습니다.');
    }
    let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
    let payloadSize = JSON.stringify(payload).length;
    if (payloadSize > 900000 && typeof addLog === 'function') addLog(`☁️ 클라우드 저장 데이터 최적화 적용 (${Math.round(payloadSize / 1024)}KB)`, 'attack-monster', { noToast: true });
    let tSerialize = Date.now();
    let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: { user_id: cloudState.user.id, save_data: payload }
    });
    let tUpload = Date.now();
    let row = Array.isArray(rows) ? rows[0] : null;
    let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
    ensureSaveMeta();
    game.saveMeta.lastCloudSyncAt = syncedAt;
    cloudState.lastRemoteUpdatedAt = syncedAt;
    cloudState.lastRemoteLoop = getSaveLoopNumber(game);
    persistLocalSave({ touchModifiedAt: false });
    let fetchMs = Math.max(0, tFetch - t0);
    let serializeMs = Math.max(0, tSerialize - tFetch);
    let uploadMs = Math.max(0, tUpload - tSerialize);
    let totalMs = Math.max(0, tUpload - t0);
    rememberCloudUploadProfile({ at: syncedAt, fetchMs, serializeMs, uploadMs, totalMs, payloadBytes: payloadSize });
    persistLocalSave({ touchModifiedAt: false });
    updateCloudSaveUI();
    if (typeof syncPlayerProfileQuiet === 'function') syncPlayerProfileQuiet();
    return row;
}

async function pullCloudSave(options = {}) {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) {
        setCloudMessage('클라우드에 저장된 데이터가 아직 없습니다.');
        return null;
    }
    let remoteStamp = record.updated_at ? (new Date(record.updated_at).getTime() || 0) : 0;
    applyExternalSave(record.save_data, remoteStamp);
    setCloudMessage('클라우드 저장을 로컬로 불러왔습니다.');
    if (!options.silent) addLog('클라우드 세이브를 불러왔습니다.', 'loot-magic');
    return record;
}

async function reconcileCloudSaveState(options = {}) {
    let preferRemoteOnResume = options.preferRemoteOnResume === true;
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) {
        if (options.createRemoteFromLocal) {
            await pushCloudSave({ touchModifiedAt: false });
            setCloudMessage('클라우드에 저장이 없어 현재 로컬 세이브를 업로드했습니다.');
            return 'pushed-local';
        }
        setCloudMessage('클라우드 저장을 찾지 못했습니다. 데이터를 확인한 뒤 수동 업로드를 진행해주세요.');
        return 'no-remote';
    }
    ensureSaveMeta();
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        applyExternalSave(record.save_data, remoteStamp);
        let guardMessage = loopGuard.reason === 'bootstrap-local'
            ? '새 기기 기본 로컬 저장으로 판단되어 클라우드 세이브를 우선 적용했습니다.'
            : `클라우드 루프(${loopGuard.remoteLoop})가 로컬 루프(${loopGuard.localLoop})보다 높아 클라우드 세이브를 우선 적용했습니다.`;
        setCloudMessage(guardMessage);
        if (!options.silent) addLog('클라우드 루프가 더 높아 로컬 저장 업로드를 차단하고 서버 저장을 적용했습니다.', 'loot-magic');
        return 'pulled-remote-higher-loop';
    }
    if (preferRemoteOnResume) {
        if (remoteStamp >= localStamp) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage('이어하기는 서버 저장이 로컬보다 최신이거나 같은 상태라 클라우드를 적용했습니다.');
            if (!options.silent) addLog('이어하기(클라우드 우선)로 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-resume-preferred';
        }
        let loopSummary = getLoopCompareSummary(record);
        if (!loopSummary.safeToPush) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage(`클라우드 루프(${loopSummary.remoteLoop})가 로컬 루프(${loopSummary.localLoop})보다 높아 클라우드를 적용했습니다.`);
            if (!options.silent) addLog('루프 비교 결과 클라우드 진행이 더 높아 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-higher-loop-late-guard';
        }
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 로컬 저장을 업로드했습니다.`);
        if (!options.silent) addLog(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 클라우드에 업로드했습니다.`, 'loot-magic');
        return 'pushed-local-newer-than-remote-resume';
    }
    if (isLikelyBootstrapLocalSave(game) && remoteStamp > 0) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('새 기기 기본 로컬 저장으로 판단되어 클라우드 세이브를 우선 적용했습니다.');
        if (!options.silent) addLog('클라우드 세이브를 우선 적용했습니다.', 'loot-magic');
        return 'pulled-remote-bootstrap';
    }
    if (remoteStamp > localStamp + CLOUD_REMOTE_TIME_SKEW_MS) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('클라우드 저장이 더 최신이라 자동으로 불러왔습니다.');
        if (!options.silent) addLog('더 최신인 클라우드 세이브를 적용했습니다.', 'loot-magic');
        return 'pulled-remote';
    }
    if (localStamp > remoteStamp) {
        let loopSummary = getLoopCompareSummary(record);
        if (!loopSummary.safeToPush) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage(`클라우드 루프(${loopSummary.remoteLoop})가 로컬 루프(${loopSummary.localLoop})보다 높아 클라우드를 적용했습니다.`);
            if (!options.silent) addLog('루프 비교 결과 클라우드 진행이 더 높아 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-higher-loop-late-guard';
        }
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 로컬 저장을 업로드했습니다.`);
        if (!options.silent) addLog(`루프 비교(로컬 ${loopSummary.localLoop} / 클라우드 ${loopSummary.remoteLoop}) 후 클라우드에 업로드했습니다.`, 'loot-magic');
        return localStamp > remoteStamp + CLOUD_REMOTE_TIME_SKEW_MS ? 'pushed-local' : 'pushed-local-within-skew';
    }
    applyExternalSave(record.save_data, remoteStamp);
    setCloudMessage('로컬과 클라우드 저장 시간이 같거나 클라우드가 근소하게 최신이라 클라우드 저장을 우선 적용했습니다.');
    if (!options.silent) addLog('저장 시간 차이가 작아 클라우드 세이브를 우선 적용했습니다.', 'loot-magic');
    return 'pulled-remote-within-skew';
}

let cloudSyncTimer = null;
let lastPageExitCloudPushAt = 0;
function isCloudSaveDirty() {
    let localStamp = game && game.saveMeta ? Math.max(0, Number(game.saveMeta.lastModifiedAt || 0)) : 0;
    // IMPORTANT: only use confirmed sync watermark.
    // game.saveMeta.lastCloudSyncAt can be set optimistically in page-exit path before network success.
    let syncedStamp = Math.max(0, Number(cloudState.lastSyncedLocalModifiedAt || 0));
    return localStamp > syncedStamp;
}
function scheduleCloudAutoSync() {
    if (!cloudState.configured || !cloudState.user || cloudState.busy || isStartupOverlayOpen()) return;
    if (!isCloudSaveDirty()) {
        cloudState.pendingAutoSyncDirty = false;
        return;
    }
    let now = Date.now();
    cloudState.pendingAutoSyncDirty = true;
    if (now - cloudState.lastSyncAttemptAt < CLOUD_SYNC_MIN_INTERVAL_MS) return;
    if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
    cloudSyncTimer = setTimeout(() => {
        cloudSyncTimer = null;
        if (!cloudState.pendingAutoSyncDirty || !isCloudSaveDirty()) return;
        cloudState.pendingAutoSyncDirty = false;
        syncCloudSave({ automatic: true }).catch(error => {
            console.warn('auto cloud sync failed:', error);
            setCloudMessage('자동 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 5000);
}


function schedulePendingForcedCloudSyncDrain() {
    if (cloudState.pendingForcedSyncRetryTimer) return;
    cloudState.pendingForcedSyncRetryTimer = setTimeout(() => {
        cloudState.pendingForcedSyncRetryTimer = null;
        let pendingForced = cloudState.pendingForcedSyncOptions;
        if (!pendingForced || !cloudState.configured || !cloudState.user) return;
        if (cloudState.busy) {
            schedulePendingForcedCloudSyncDrain();
            return;
        }
        cloudState.pendingForcedSyncOptions = null;
        syncCloudSave(pendingForced).catch(error => {
            console.warn(`queued cloud save failed (${pendingForced.reason || 'important'}):`, error);
            setCloudMessage('대기 중이던 클라우드 저장 실패: ' + (error.message || error));
        });
    }, 500);
}

async function syncCloudSave(options = {}) {
    if (!cloudState.configured || !cloudState.user) return;
    if (cloudState.busy) {
        if (options.force === true) {
            cloudState.pendingForcedSyncOptions = { ...options, force: true, reason: options.reason || 'important' };
            setCloudMessage(`클라우드 업로드 대기 중... (${cloudState.pendingForcedSyncOptions.reason})`);
            updateCloudSaveUI();
            schedulePendingForcedCloudSyncDrain();
        }
        return;
    }
    cloudState.busy = true;
    cloudState.lastSyncAttemptAt = Date.now();
    setCloudMessage(options.reason ? `클라우드 업로드 중... (${options.reason})` : (options.automatic ? '자동 클라우드 업로드 중...' : '클라우드 업로드 중...'));
    updateCloudSaveUI();
    try {
        let fresh = await ensureCloudSessionFresh(options.reason || '클라우드 저장');
        if (!fresh) return;
        let guardResult = await guardAgainstStaleLocalOverwrite({ automatic: !!options.automatic, silentLog: !!options.automatic });
        if (guardResult.status === 'pulled-remote' || guardResult.status === 'pulled-remote-higher-loop') return;
        await pushCloudSave({ touchModifiedAt: options.automatic !== true });
        cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0));
        setCloudMessage(options.automatic ? '클라우드 자동 저장을 완료했습니다.' : '클라우드 업로드를 완료했습니다.');
        if (!options.automatic) addLog('클라우드 세이브를 업로드했습니다.', 'loot-magic');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        if (cloudState.pendingForcedSyncOptions) schedulePendingForcedCloudSyncDrain();
    }
}

async function initializeCloudSave() {
    cloudState.initialized = true;
    cloudState.configured = getCloudConfig().enabled;
    if (!cloudState.configured) {
        setCloudMessage('cloud-save-config.js를 설정하면 클라우드 세이브를 켤 수 있습니다.');
        updateCloudSaveUI();
        return;
    }
    ['startup-password'].forEach(id => {
        let passwordEl = document.getElementById(id);
        if (passwordEl && !passwordEl.dataset.boundCloudEnter) {
            passwordEl.dataset.boundCloudEnter = '1';
            passwordEl.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    startupLogin();
                }
            });
        }
    });
    try {
        cloudState.busy = true;
        setCloudMessage('저장된 로그인 세션을 확인하는 중입니다...');
        updateCloudSaveUI();
        let skipOAuthRestore = consumeSkipOAuthRestoreOnce();
        let restored = false;
        if (!skipOAuthRestore) restored = await tryRestoreSupabaseOAuthSession();
        if (!restored) restored = await restoreCloudSession();
        if (restored && cloudState.user) {
            await refreshCloudLinkedIdentities();
            if (isStartupOverlayOpen()) setCloudMessage('이전 로그인 세션을 복원했습니다. 클라우드 세이브로 계속할 수 있습니다.');
            else {
                setCloudMessage('이전 로그인 세션을 복원했습니다.');
                await reconcileCloudSaveState({ silent: true, createRemoteFromLocal: true });
            }
        } else {
            setCloudMessage('로그인하면 클라우드 저장을 사용할 수 있습니다.');
        }
    } catch (error) {
        console.warn('cloud init failed:', error);
        applyCloudSession(null);
        setCloudMessage('클라우드 세션 복원 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        refreshSocialAfterCloudStateChange();
    }
}

async function cloudSignUp(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage('먼저 cloud-save-config.js를 설정해주세요.');
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage('이메일과 비밀번호를 입력해주세요.');
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: '계정을 생성하는 중...',
            detail: '인증 정보를 등록하고 첫 클라우드 세이브를 준비하고 있습니다.',
            caption: 'Creating Account',
            progress: 12
        });
    }
    setCloudMessage('회원가입을 진행 중입니다...');
    updateCloudSaveUI();
    try {
        let result = await cloudJsonRequest('/auth/v1/signup', {
            method: 'POST',
            useAuth: false,
            body: { email: credentials.email, password: credentials.password }
        });
        if (result && result.session && result.user) {
            applyCloudSession({ ...result.session, user: result.user });
            await refreshCloudLinkedIdentities();
            clearCloudPasswordInput();
            advanceLoadingOverlay({
                title: '첫 세이브를 연결하는 중...',
                detail: '새 계정에 현재 진행도를 연결하고 있습니다.',
                caption: 'Binding Save Data',
                progress: 54
            });
            await reconcileCloudSaveState({ createRemoteFromLocal: true });
            addLog('클라우드 계정을 만들고 저장을 연결했습니다.', 'loot-magic');
            if (options.enterGame) await enterGameWorld();
        } else {
            setCloudMessage('회원가입은 완료되었습니다. Supabase 이메일 인증을 사용하는 경우 메일 확인 후 로그인해주세요.');
            if (options.enterGame) setLoadingOverlayState(false);
        }
    } catch (error) {
        setCloudMessage('회원가입 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudLogin(options = {}) {
    let config = getCloudConfig();
    if (!config.enabled) return setCloudMessage('먼저 cloud-save-config.js를 설정해주세요.');
    let credentials = collectCloudCredentials();
    if (!credentials.email || !credentials.password) return setCloudMessage('이메일과 비밀번호를 입력해주세요.');
    cloudState.busy = true;
    if (options.enterGame) {
        setLoadingOverlayState(true, {
            title: '계정을 확인하는 중...',
            detail: '인증 정보를 검증하고 연결된 클라우드 세이브를 찾고 있습니다.',
            caption: 'Authenticating',
            progress: 14
        });
    }
    setCloudMessage('로그인하는 중입니다...');
    updateCloudSaveUI();
    try {
        let session = await cloudJsonRequest('/auth/v1/token?grant_type=password', {
            method: 'POST',
            useAuth: false,
            body: { email: credentials.email, password: credentials.password }
        });
        applyCloudSession(session);
        await refreshCloudLinkedIdentities();
        clearCloudPasswordInput();
        advanceLoadingOverlay({
            title: '저장 데이터를 불러오는 중...',
            detail: '계정에 저장된 클라우드 세이브가 있으면 전체 데이터를 우선 적용합니다.',
            caption: 'Syncing Save Data',
            progress: 58
        });
        await reconcileCloudSaveState({
            createRemoteFromLocal: true,
            preferRemoteOnResume: options.enterGame === true,
            strictRemoteResume: options.enterGame === true
        });
        addLog('클라우드 세이브 계정에 로그인했습니다.', 'loot-magic');
        if (options.enterGame) await enterGameWorld();
    } catch (error) {
        setCloudMessage('로그인 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudLogout() {
    if (!cloudState.user) return setCloudMessage('이미 로그아웃 상태입니다.');
    cloudState.busy = true;
    setCloudMessage('로그아웃하는 중입니다...');
    updateCloudSaveUI();
    try {
        let client = getSupabaseClient();
        if (client) {
            try { await client.auth.signOut(); } catch (oauthLogoutError) { console.warn('supabase oauth logout failed:', oauthLogoutError); }
        }
        if (cloudState.session && cloudState.session.access_token) {
            try {
                await cloudJsonRequest('/auth/v1/logout', { method: 'POST' });
            } catch (logoutError) {
                console.warn('cloud logout request failed:', logoutError);
            }
        }
        applyCloudSession(null);
        cloudState.linkedProviders = [];
        cloudState.lastRemoteUpdatedAt = 0;
        cloudState.lastRemoteLoop = 0;
        setCloudMessage('클라우드 계정에서 로그아웃했습니다.');
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}


function requestImmediateCloudSave(reason) {
    if (!cloudState.configured || !cloudState.user) return false;
    if (!saveGame({ skipCloudSync: true })) return false;
    syncCloudSave({ automatic: true, force: true, reason: reason || 'important' }).catch(error => {
        console.warn(`immediate cloud save failed (${reason || 'important'}):`, error);
        setCloudMessage('즉시 클라우드 저장 실패: ' + (error.message || error));
    });
    return true;
}


function pushCloudSaveOnPageExit(reason) {
    let config = getCloudConfig();
    if (typeof canPersistLocalSave === 'function' && !canPersistLocalSave()) return false;
    if (!config.enabled || !cloudState.user || !cloudState.user.id || !cloudState.session || !cloudState.session.access_token) return false;
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return false;
    if (!gameplayStarted) return false;
    let localLoop = getSaveLoopNumber(game);
    if ((cloudState.lastRemoteLoop || 0) > localLoop) {
        setCloudMessage(`클라우드 루프(${cloudState.lastRemoteLoop})가 로컬 루프(${localLoop})보다 높아 종료 전 업로드를 차단했습니다.`);
        return false;
    }
    if ((cloudState.lastRemoteLoop || 0) > 0 && isLikelyBootstrapLocalSave(game)) {
        setCloudMessage('로컬 세이브가 새로 생성된 기본 상태라 종료 전 클라우드 업로드를 차단했습니다.');
        return false;
    }
    let exitPushStartedAt = Date.now();
    if (exitPushStartedAt - lastPageExitCloudPushAt < 1500) return false;
    try {
        if (!persistLocalSave({ touchModifiedAt: true })) return false;
        ensureSaveMeta();
        let optimisticSyncAt = Date.now();
        game.saveMeta.lastCloudSyncAt = optimisticSyncAt;
        cloudState.lastRemoteUpdatedAt = optimisticSyncAt;
        if (!persistLocalSave({ touchModifiedAt: false })) {
            throw new Error('로컬 저장에 실패하여 경량화 업로드를 중단했습니다.');
        }
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        let body = JSON.stringify({ user_id: cloudState.user.id, save_data: payload });
        let headers = {
            apikey: config.supabaseAnonKey,
            Authorization: `Bearer ${cloudState.session.access_token}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal'
        };
        let endpoint = config.supabaseUrl + '/rest/v1/cloud_saves';
        // NOTE: sendBeacon cannot attach Authorization/apikey headers required by Supabase RLS.
        // Always use authenticated keepalive fetch on exit path to avoid silent unauthenticated drops.
        fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            keepalive: true
        }).catch(error => {
            let msg = String((error && error.message) || error || '');
            let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
            if (expectedAbort && reason === 'visibilitychange') {
                console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
            } else {
                console.warn(`cloud save on ${reason || 'page exit'} failed:`, error);
            }
        });
        lastPageExitCloudPushAt = exitPushStartedAt;
        cloudState.lastSyncAttemptAt = optimisticSyncAt;
        setCloudMessage('페이지 종료 전 클라우드 저장을 시도했습니다.');
        return true;
    } catch (error) {
        console.warn(`cloud save on ${reason || 'page exit'} setup failed:`, error);
        return false;
    }
}

async function cloudPushNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    try {
        await syncCloudSave({ automatic: false });
    } catch (error) {
        setCloudMessage('업로드 실패: ' + (error.message || error));
    }
}

async function cloudCompactAndPushNow() {
    if (!cloudState.user || !cloudState.user.id) return setCloudMessage('먼저 로그인해주세요.');
    if (!await requestGameConfirmation('임시 전투 데이터를 제거한 경량 저장으로 클라우드를 덮어씁니다.\n장비, 인벤토리, 패시브와 재화는 유지됩니다.', {
        title: '클라우드 저장 경량화',
        tone: 'danger',
        confirmLabel: '경량화 후 덮어쓰기'
    })) return;
    cloudState.busy = true;
    setCloudMessage('클라우드 저장 경량화 업로드 중...');
    updateCloudSaveUI();
    try {
        ensureSaveMeta();
        game.saveMeta.lastModifiedAt = Date.now();
        persistLocalSave({ touchModifiedAt: false });
        let t0 = Date.now();
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        let payloadBytes = JSON.stringify(payload).length;
        let tSerialize = Date.now();
        let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
            body: { user_id: cloudState.user.id, save_data: payload }
        });
        let tUpload = Date.now();
        let row = Array.isArray(rows) ? rows[0] : null;
        let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
        game.saveMeta.lastCloudSyncAt = syncedAt;
        cloudState.lastRemoteUpdatedAt = syncedAt;
        cloudState.lastSyncAttemptAt = Date.now();
        cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game.saveMeta.lastModifiedAt || 0));
        rememberCloudUploadProfile({
            at: syncedAt,
            fetchMs: 0,
            serializeMs: Math.max(0, tSerialize - t0),
            uploadMs: Math.max(0, tUpload - tSerialize),
            totalMs: Math.max(0, tUpload - t0),
            payloadBytes
        });
        persistLocalSave({ touchModifiedAt: false });
        setCloudMessage(`경량화 업로드 완료 (${(payloadBytes / 1024).toFixed(1)}KB)`);
        addLog(`☁️ 경량화 클라우드 저장 완료 (${(payloadBytes / 1024).toFixed(1)}KB)`, 'loot-magic');
    } catch (error) {
        setCloudMessage('경량화 업로드 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudForcePullNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    if (!await requestGameConfirmation('서버 저장으로 현재 기기의 진행 데이터를 강제로 교체합니다.\n복구하기 어려운 작업입니다.', {
        title: '서버 저장 강제 불러오기',
        tone: 'danger',
        confirmLabel: '기기 저장 교체'
    })) return;
    cloudState.busy = true;
    setCloudMessage('서버 저장을 강제로 불러오는 중입니다...');
    updateCloudSaveUI();
    try {
        await pullCloudSave({ silent: false });
        setCloudMessage('서버 저장을 현재 기기에 강제로 적용했습니다.');
        addLog('☁️ 서버 저장 강제 불러오기를 완료했습니다.', 'loot-magic');
    } catch (error) {
        setCloudMessage('서버 강제 불러오기 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function cloudPullNow() {
    if (!cloudState.user) return setCloudMessage('먼저 로그인해주세요.');
    if (!await requestGameConfirmation('클라우드 저장으로 현재 기기의 진행 데이터를 교체합니다.', {
        title: '클라우드 저장 불러오기',
        tone: 'danger',
        confirmLabel: '불러오기'
    })) return;
    cloudState.busy = true;
    setCloudMessage('클라우드 저장을 불러오는 중입니다...');
    updateCloudSaveUI();
    try {
        await pullCloudSave();
    } catch (error) {
        setCloudMessage('클라우드 불러오기 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

function reportFatalError(stage, error) {
    let message = error && error.message ? error.message : String(error);
    let stack = error && error.stack ? String(error.stack).split('\n').slice(0, 4).join('\n') : '';
    console.error(stage + ' failed:', error);
    try {
        let label = document.getElementById('ui-progress-label');
        if (label) label.innerText = '⚠️ 오류';
        let pct = document.getElementById('ui-move-time-text');
        if (pct) pct.innerText = stage;
        let caption = document.getElementById('ui-battlefield-caption');
        if (caption) caption.innerText = `${stage}: ${message}`;
        let log = document.getElementById('log');
        if (log) {
            let detail = stack ? `<pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:0.78em;">${escapeHTML(stack)}</pre>` : '';
            log.innerHTML = `<div class="log-item attack-monster">[${stage}] ${escapeHTML(message)}${detail}</div>`;
        }
    } catch (uiError) {
        console.error('fatal error UI update failed:', uiError);
    }
}

function recoverRuntimeState() {
    game = mergeDefaults(game || {});
    if (game.moveTimer <= 0 && (!Array.isArray(game.encounterPlan) || game.encounterPlan.length === 0)) runUiStartEncounter();
}

function runStartupSmokeChecks() {
    // 기본 배포에서는 상태 오염 가능성이 있는 런타임 시뮬레이션을 실행하지 않는다.
    // 필요 시 콘솔에서 window.__ENABLE_STARTUP_SMOKE__ = true 로 활성화.
    if (!(typeof window !== 'undefined' && window.__ENABLE_STARTUP_SMOKE__ === true)) return;
    let snapshot = JSON.parse(JSON.stringify(game));
    let issues = [];
    try {
        // 저장 데이터 상태(맵 잠금/이벤트 러닝 상태)에 영향받지 않도록 최소 런타임을 정규화한다.
        game.moveTimer = 0;
        game.combatHalted = false;
        game.isTownReturning = false;
        game.woodsmanEntrancePending = false;
        game.enemies = [];
        game.encounterPlan = [];
        game.encounterIndex = 0;
        game.runProgress = 0;
        runUiStartEncounter();
        if (!Array.isArray(game.encounterPlan) || game.encounterPlan.length === 0) issues.push('encounterPlan-empty');
        let before = game.runProgress;
        let stats = getUiPlayerStats();
        for (let i = 0; i < 6; i++) runUiCoreLoop();
        ensureLoopChallengeState();
        if (game.moveTimer <= 0 && game.runProgress <= before) issues.push('runProgress-stalled');
        if (!Number.isFinite(stats.maxHp) || stats.maxHp <= 0) issues.push('invalid-player-stats');
    } catch (error) {
        issues.push('smoke-exception:' + (error && error.message ? error.message : String(error)));
    } finally {
        game = snapshot;
        tickShrineState();
        refreshTabHeaderUiIfNeeded();
        calculateReachableNodes();
        refreshPassiveVisibility();
        normalizeSupportLoadout(false);
    }
    if (issues.length > 0) console.warn('[SmokeCheck] startup issues:', issues.join(', '));
}

async function resetGame() {
    if (!await requestGameConfirmation('현재 기기의 모든 진행 데이터를 초기화합니다.', {
        title: '게임 진행 초기화',
        tone: 'danger',
        confirmLabel: '진행 초기화'
    })) return;
    let resetCloudToo = false;
    if (cloudState.user && getCloudConfig().enabled) {
        resetCloudToo = !!await requestGameConfirmation('클라우드 저장도 새 게임 상태로 덮어쓸 수 있습니다.\n취소하면 이 기기만 초기화하고 현재 계정에서 로그아웃합니다.', {
            title: '클라우드 저장도 초기화',
            tone: 'danger',
            confirmLabel: '클라우드도 초기화',
            cancelLabel: '기기만 초기화'
        });
    }
    try {
        window.__skipUnloadSaveOnce = true;
        localStorage.removeItem(LOCAL_SAVE_KEY);
        LEGACY_SAVE_KEYS.forEach(key => localStorage.removeItem(key));
        try {
            Object.keys(localStorage).forEach(key => {
                if (/^poeIdleSaveData_/i.test(String(key || ''))) localStorage.removeItem(key);
            });
        } catch (error) {
            console.warn('failed to enumerate legacy local saves during reset:', error);
        }
        if (resetCloudToo) {
            cloudState.busy = true;
            setCloudMessage('클라우드 저장을 초기화하는 중입니다...');
            updateCloudSaveUI();
            game = cloneDefaultGame();
            await pushCloudSave({ touchModifiedAt: true });
        } else if (cloudState.user) {
            applyCloudSession(null);
        }
    } catch (error) {
        console.error('resetGame failed:', error);
        if (resetCloudToo) showGameToast('클라우드 초기화 중 문제가 발생했습니다: ' + (error.message || error), { tone: 'danger', duration: 5200 });
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
        location.reload();
    }
}

function init() {
    if (!window.__startupFirstPaintDone) {
        window.__startupFirstPaintDone = true;
        gameplayStarted = false;
        setStartupOverlayActive(true);
        renderPatchNotes();
        setLoadingOverlayState(false);
        let localSaveStatus = loadGame();
        if (localSaveStatus.writable === false) {
            setCloudMessage(localSaveStatus.message);
            addLog(`⚠️ ${localSaveStatus.message}`, 'loot-rare');
        }
        updateCloudSaveUI();
        setTimeout(init, 0);
        return;
    }
    applySeasonContentProgression({ silent: true });
    recoverRuntimeState();
    unlockPassiveStarEvolution({ silent: true });
    window.__battleAssetAutoloadEnabled = false;
    scheduleDeferredBattleAssetLoad();
    refreshPassiveVisibility();
    tickShrineState();
    refreshTabHeaderUiIfNeeded();
    calculateReachableNodes();
    document.getElementById('chk-combat-scene').checked = game.settings.showCombatScene !== false;
    let cameraShakeCheckboxInit = document.getElementById('chk-camera-shake');
    if (cameraShakeCheckboxInit) cameraShakeCheckboxInit.checked = game.settings.cameraShake !== false;
    document.getElementById('chk-log-combat').checked = game.settings.showCombatLog !== false;
    document.getElementById('chk-log-aggregate').checked = game.settings.combatLogAggregate !== false;
    document.getElementById('chk-log-rate-limit').checked = game.settings.combatLogRateLimit !== false;
    document.getElementById('chk-log-spawn').checked = game.settings.showSpawnLog !== false;
    document.getElementById('chk-log-exp').checked = game.settings.showExpLog !== false;


    document.getElementById('chk-log-loot').checked = game.settings.showLootLog !== false;
    document.getElementById('chk-log-crowd').checked = game.settings.showCrowdPauseLog !== false;
    document.getElementById('chk-death-notice').checked = game.settings.showDeathNotice !== false;
    document.getElementById('chk-mobile-battle-pip').checked = game.settings.showMobileBattlePip !== false;
    let tabNotiCheckboxInit = document.getElementById('chk-tab-noti');
    if (tabNotiCheckboxInit) tabNotiCheckboxInit.checked = game.settings.tabNotiEnabled !== false;
    let socialChatNotiCheckboxInit = document.getElementById('chk-social-chat-noti');
    if (socialChatNotiCheckboxInit) socialChatNotiCheckboxInit.checked = game.settings.socialChatNotifications !== false;
    document.getElementById('chk-pause-overlay').checked = !!game.settings.pauseGameOnOverlay;
    document.getElementById('chk-two-row-tabs').checked = !!game.settings.twoRowTabs;
    document.getElementById('sel-damage-number-format').value = ['comma', 'korean', 'korean_short', 'english'].includes(game.settings.damageNumberFormat) ? game.settings.damageNumberFormat : 'comma';
    document.getElementById('chk-exp-comma').checked = game.settings.showExpComma !== false;
    document.getElementById('chk-hp-comma').checked = game.settings.showHpComma !== false;
    document.getElementById('chk-enemy-hp-comma').checked = game.settings.showEnemyHpComma !== false;
    document.getElementById('chk-character-comma').checked = game.settings.showCharacterComma !== false;
    game.settings.itemFilterRarities = { normal: true, magic: true, rare: true, unique: true, ...(game.settings.itemFilterRarities || {}) };
    document.getElementById('chk-item-filter-enabled').checked = !!game.settings.itemFilterEnabled;
    document.getElementById('chk-item-filter-normal').checked = game.settings.itemFilterRarities.normal !== false;
    document.getElementById('chk-item-filter-magic').checked = game.settings.itemFilterRarities.magic !== false;
    document.getElementById('chk-item-filter-rare').checked = game.settings.itemFilterRarities.rare !== false;
    document.getElementById('chk-item-filter-unique').checked = game.settings.itemFilterRarities.unique !== false;
    document.getElementById('inp-item-filter-tier-threshold').value = Math.max(1, Math.floor(game.settings.itemFilterTierThreshold || 10));
    document.getElementById('inp-item-filter-tier-count').value = Math.max(0, Math.floor(game.settings.itemFilterMinTierCount || 0));
    document.getElementById('inp-item-filter-hidden-tier').value = Math.max(1, Math.floor(game.settings.itemFilterMinHiddenTier || 1));
    document.getElementById('chk-item-filter-unique-new-codex').checked = !!game.settings.itemFilterOnlyNewCodexUnique;
    document.getElementById('sel-map-complete-action').value = game.settings.mapCompleteAction || 'nextZone';
    document.getElementById('sel-town-return-action').value = game.settings.townReturnAction || 'retry';
    document.getElementById('sel-theme-mode').value = game.settings.themeMode === 'light' ? 'light' : 'dark';
    applyThemeMode(game.settings.themeMode);
    ensureInitialHeroSelection();
    renderHeroSelectionControls();
    renderMonsterSkinControls();
    toggleDeathNoticeSetting(game.settings.showDeathNotice !== false);
    syncSalvageControlsFromSettings();
    syncJewelSalvageControlsFromSettings();
    checkUnlocks();
    renderExpertiseUI();
    normalizeSupportLoadout(false);
    if (game.moveTimer <= 0 && (!game.encounterPlan || game.encounterPlan.length === 0)) runUiStartEncounter();
    runStartupSmokeChecks();
    if (!(game.discoveredPassives || []).includes('n0')) game.discoveredPassives.push('n0');
    window.addEventListener('resize', function() {
        syncBattleTabLayout(false);
        scheduleStableResize();
    });
    if (!window.__mobileViewportResizeBound) {
        window.__mobileViewportResizeBound = true;
        window.addEventListener('orientationchange', function() {
            syncBattleTabLayout(false);
            scheduleStableResize();
        });
        if (window.visualViewport) window.visualViewport.addEventListener('resize', function() {
            syncBattleTabLayout(false);
            scheduleStableResize();
        });
    }
    syncBattleTabLayout(true);
    updateMobileBattlePipVisibility();
    startMobilePipRefreshLoop();
    setupCanvasEvents();
    resizeCanvas();
    if (!window.__cloudVisibilitySaveBound) {
        window.__cloudVisibilitySaveBound = true;
        document.addEventListener('visibilitychange', function() {
            handleBackgroundVisibilityChange();
            if (document.hidden) {
                if (window.__skipUnloadSaveOnce) return;
                saveGame({ skipCloudSync: true });
                pushCloudSaveOnPageExit('visibilitychange');
            }
        });
        window.addEventListener('pagehide', function() {
            recordBackgroundCombatEntry(Date.now());
            if (window.__skipUnloadSaveOnce) return;
            saveGame({ skipCloudSync: true });
            pushCloudSaveOnPageExit('pagehide');
        });
        window.addEventListener('beforeunload', function() {
            recordBackgroundCombatEntry(Date.now());
            if (window.__skipUnloadSaveOnce) return;
            saveGame({ skipCloudSync: true });
            pushCloudSaveOnPageExit('beforeunload');
        });
    }
    initializeCloudSave();
    if (!window.__cloudTokenRefreshBound) {
        window.__cloudTokenRefreshBound = true;
        setInterval(() => {
            if (cloudState.user && cloudState.session) ensureCloudSessionFresh('주기 확인').catch(error => console.warn('periodic cloud token refresh failed:', error));
        }, 60000);
    }
    window.runStartupSmokeChecks = runStartupSmokeChecks;
    if (!window.__globalTouchTooltipCleanup) {
        window.__globalTouchTooltipCleanup = true;
        document.addEventListener('touchstart', function(e) {
            let target = e.target;
            let keep = target && target.closest && (target.closest('.item-card') || target.closest('.skill-gem') || target.closest('#tree-canvas'));
            if (!keep) {
                hideInfoTooltip();
                hideItemTooltip();
            }
        }, { passive: true });
    }
    try {
        updateStaticUI();
    } catch (error) {
        console.error('initial updateStaticUI failed:', error);
        game = mergeDefaults(game || {});
        try { updateStaticUI(); } catch (retryError) { console.error('retry updateStaticUI failed:', retryError); }
    }
    try {
        updateMobileBattlePipVisibility();
        renderBattlefield();
        updateMobileBattlePipVisibility();
        renderMobileBattlePipFrame();
    } catch (error) {
        console.error('initial battlefield render failed:', error);
    } finally {
        if (gameTickHandle) clearInterval(gameTickHandle);
        gameTickHandle = setInterval(() => {
            try {
                let overlayPause = !!(game.settings && game.settings.pauseGameOnOverlay);
                let blockingOverlayOpen = isStartupOverlayOpen() || isLoadingOverlayOpen() || isRewardOpen() || isDeathOverlayOpen() || isLoopHeroSelectOpen();
                let optionalOverlayOpen = overlayPause && isPauseSettingOverlayOpen();
                if (blockingOverlayOpen || optionalOverlayOpen) return;
                runUiCoreLoop();
                ensureLoopChallengeState();
                let now = Date.now();
                if (typeof tickOceanOxygen === 'function') tickOceanOxygen(now);
                if (typeof updateCombatOxygenBar === 'function') updateCombatOxygenBar();
                if (pendingHeavyUiRefresh) {
                    if (now - lastHeavyUiRefreshAt >= 1200) {
                        pendingHeavyUiRefresh = false;
                        lastHeavyUiRefreshAt = now;
                        // 킬 이후 드랍/인벤/재화/지도 상태가 누락되지 않도록
                        // 스로틀된 정적 UI 갱신을 복구한다.
                        updateStaticUI();
                    }
                }
                let recentStats = game.lastCombatStats && (Date.now() - (game.lastCombatStatsAt || 0) < 250) ? game.lastCombatStats : getUiPlayerStats();
                updateCombatUI(recentStats);
            } catch (error) {
                console.error('gameTick error:', error);
                recoverRuntimeState();
                try {
                    let recentStats = game.lastCombatStats && (Date.now() - (game.lastCombatStatsAt || 0) < 250) ? game.lastCombatStats : getUiPlayerStats();
                    updateCombatUI(recentStats);
                } catch (uiError) { console.error('tick UI recovery failed:', uiError); }
            }
        }, 100);
        requestAnimationFrame(gameLoop);
        if (autoSaveHandle) clearInterval(autoSaveHandle);
        autoSaveHandle = setInterval(() => {
            if (isStartupOverlayOpen() || isLoadingOverlayOpen()) return;
            saveGame();
        }, 15000);
    }
}

function renderBattlefieldThrottled(frameNow) {
    // 직전 렌더 이후 최소 간격이 지나지 않았으면 이번 프레임은 건너뛴다.
    // 60Hz에서는 약 30fps로 균등하게, 고주사율 화면에서는 더 큰 폭으로 부하를 줄인다.
    if (frameNow - lastBattlefieldRenderAt < BATTLEFIELD_MIN_FRAME_MS) return;
    lastBattlefieldRenderAt = frameNow;
    updateMobileBattlePipVisibility();
    // 전투 탭에서 캔버스가 실제로 보일 때만 풀 렌더한다.
    // 다른 탭의 모바일 PiP는 별도의 적응형 루프가 렌더 직후 곧바로 복사하므로,
    // 여기서 매 프레임 다시 복사하면 같은 화면을 30~45fps로 중복 복사하게 된다.
    // (전투 탭일 때 PiP는 숨겨져 어차피 복사가 일어나지 않는다.)
    renderBattlefield(false);
}

function gameLoop() {
    try {
        if (document.hidden) return;
        let frameNow = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (isRewardOpen() || isDeathOverlayOpen() || isLoopHeroSelectOpen()) {
            if (document.getElementById('tab-char').classList.contains('active')) {
                let passiveNow = Date.now();
                if (shouldRedrawPassiveTree(passiveNow)) {
                    resizePassiveTreeCanvas(false);
                    drawPassiveTree();
                    lastPassiveTreeDrawAt = passiveNow;
                }
            }
            renderBattlefieldThrottled(frameNow);
            return;
        }
        if (document.getElementById('tab-char').classList.contains('active')) {
            let passiveNow = Date.now();
            if (shouldRedrawPassiveTree(passiveNow)) {
                resizePassiveTreeCanvas(false);
                drawPassiveTree();
                lastPassiveTreeDrawAt = passiveNow;
            }
        }
        renderBattlefieldThrottled(frameNow);
    } catch (error) {
        console.error('gameLoop error:', error);
        recoverRuntimeState();
    } finally {
        requestAnimationFrame(gameLoop);
    }
}



// Phase-4 extracted unlock/class/tab helper block.

function getExpertiseOverviewHtml(total, spent, free) {
    const branchSummary = `균사 ${getExpertBranchSpent('mycologist')} · 젬 ${getExpertBranchSpent('gemEngraver')} · 천문 ${getExpertBranchSpent('astronomer')} · 양봉 ${getExpertBranchSpent('beekeeper')}`;
    return `<div class="expertise-panel">전문가 포인트 · 총 <b>${total}</b> / 사용 <b>${spent}</b> / 남은 <b style="color:#ffd36b;">${free}</b> <button style="margin-left:8px;" onclick="askResetExpertTree()" title="전문가 트리 전체 초기화 (정화의 오브 ${spent}개 소모)">트리 초기화${spent > 0 ? ` (정화의 오브 ${spent})` : ''}</button><div class="expertise-summary">분기 투자: ${branchSummary}</div></div>`;
}



function formatExpertFavorEffect(effect) {
    let map = {
        chillEffectReducePct:'냉각 효과 감소', freezeDurationReducePct:'동결 지속시간 감소', shockEffectReducePct:'감전 효과 감소',
        igniteDamageReducePct:'점화 피해 감소', bleedDamageReducePct:'출혈 피해 감소', poisonDamageReducePct:'중독 피해 감소',
        dotTakenDamageReducePct:'받는 지속 피해 감소', takenDamageReduceWhen2EnemiesPct:'적 2명+ 받는 피해 감소', takenDamageReduceWhen1EnemyPct:'적 1명 받는 피해 감소',
        igniteChance:'점화 확률', igniteDamageMultiplierPct:'점화 피해', accuracyBonusPct:'정확도 보정', minDmgRoll:'최소 피해 보정',
        projectilePctDmg:'투사체 피해', crit:'치명타 확률', critDmg:'치명타 피해 배율', aspd:'공격 속도', regen:'생명력 재생',
        energyShieldPct:'에너지 보호막', evasionPct:'회피', pctDmg:'피해', armorPct:'방어도'
    };
    return Object.entries(effect||{}).map(([k,v])=>`${map[k]||k} +${v}%`).join('<br>');
}
function selectExpertFavor(expertId, optionId){
    if (!expertId || !optionId) return;
    if (typeof setSelectedExpertFavor !== 'function') return;
    let ok = setSelectedExpertFavor(expertId, optionId);
    if (!ok) return addLog('해당 호의 선택지는 아직 해금되지 않았습니다.', 'attack-monster');
    addLog(`✨ 전문가의 호의 선택: ${(EXPERT_DEFS[expertId]||{}).name || expertId}`, 'loot-magic');
    updateStaticUI();
}
function getExpertiseCardHtml(id) {
    let d = EXPERT_DEFS[id], lv = getExpertLevel(id), cur = getCurrentExpertUnlock(id), next = getNextExpertUnlock(id), pt = Math.max(0, lv - 15);
    let exp = getExpertExp(id), req = getExpertExpReq(lv);
    let pct = Math.max(0, Math.min(100, req > 0 ? (exp / req) * 100 : 0));
    let cap = ((game.expertise || {}).loopExpCaps || {});
    let used = (((cap.total || {})[id]) || 0);
    let loopCap = (((EXPERT_EXP_RULES || {})[id] || {}).loopCap) || 250;
    let currentUnlockLine = cur ? `현재 적용 해금(Lv.${cur.level}): ${cur.title} - ${cur.desc}` : '해금 대기: 아직 해금된 컨텐츠가 없습니다.';
    let nextUnlockLine = next ? `다음(Lv.${next.level}): ${next.title}` : '다음 해금 없음';
    let history = typeof getExpertUnlockHistory === 'function' ? getExpertUnlockHistory(id) : getExpertUnlocks(id).filter(row => row.level <= lv);
    let historyHtml = history.length > 0
        ? `<div class="expertise-unlock-log"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">해금 기록</div>${history.map(row => `<div class="expertise-unlock-entry">Lv.${row.level} · <strong>${row.title}</strong><br><span>${row.desc || ''}</span></div>`).join('')}</div>`
        : '<div class="expertise-muted">해금 기록 없음</div>';
    let favorOptions = (typeof getExpertFavorOptions === 'function') ? getExpertFavorOptions(id) : [];
    let favorSelected = (typeof getSelectedExpertFavor === 'function') ? getSelectedExpertFavor(id) : null;
    let favorHtml = favorOptions.length > 0
        ? `<div class="expertise-panel" style="margin-top:8px;"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">전문가의 호의 (영구 1개 선택)</div>${favorOptions.map(opt => { let unlocked = lv >= (opt.level || 1); let active = favorSelected === opt.id; return `<button ${unlocked ? `onclick="selectExpertFavor('${id}','${opt.id}')"` : 'disabled'} style="display:block; width:100%; text-align:left; margin:4px 0; ${active ? 'border-color:#ffd36b; color:#ffd36b;' : ''}">${active ? '✓ ' : ''}${opt.name} ${unlocked ? '' : `(Lv.${opt.level} 필요)`}<br><span class='expertise-muted'>${formatExpertFavorEffect(opt.effect)}</span></button>`; }).join('')}</div>`
        : '';
    let guideRows = ((typeof EXPERT_EXP_GUIDES !== 'undefined' && EXPERT_EXP_GUIDES[id]) || []).map(line => `<li>${line}</li>`).join('');
    let guideHtml = guideRows ? `<div class="expertise-panel" style="margin-top:8px;"><div style="color:#dce9ff; font-weight:700; margin-bottom:4px;">경험치 획득 가이드</div><ul style="margin:0 0 0 18px; padding:0; color:#b8c7d8; line-height:1.55;">${guideRows}</ul></div>` : '';
    return `<div class="expertise-card"><h4>${d.icon} ${d.name} <span class="expertise-muted">Lv.${lv}</span> ${lv>=16?`<span style='color:#ffd36b;'>+${pt}pt</span>`:''}</h4><div class="expertise-muted">EXP ${exp}/${req} · 이번 루프 ${used}/${loopCap}</div><div style="margin:6px 0 8px 0; height:8px; border-radius:999px; background:#1c2a3a; border:1px solid #344b66;"><div style="width:${pct.toFixed(1)}%; height:100%; border-radius:999px; background:linear-gradient(90deg,#3f84ff,#72d1ff);"></div></div><div class="expertise-muted">${currentUnlockLine}</div><div class="expertise-muted">${nextUnlockLine}</div>${guideHtml}${historyHtml}${favorHtml}</div>`;
}

const EXPERT_BRANCH_COLORS = { common:'#ffd36b', mycologist:'#6fcf72', gemEngraver:'#5cc8ff', astronomer:'#a98bff', beekeeper:'#f5c451' };
function getExpertBranchTheme(branch) {
    let color = EXPERT_BRANCH_COLORS[branch] || '#9fb4d1';
    if (branch === 'common') return { label: '전문가 공통', icon: '🧠', color };
    let d = EXPERT_DEFS[branch] || {};
    return { label: d.name || branch, icon: d.icon || '🧠', color };
}
function buildExpertNodeTooltipHtml(node) {
    let theme = getExpertBranchTheme(node.branch);
    let cur = Math.max(0, Math.floor((game.expertise.nodes[node.id] || 0)));
    let effectLines = Object.entries(node.effect || {}).map(([k, v]) => {
        let unit = /Pct$/.test(k) ? '%' : '';
        return `레벨당 +${v}${unit}${cur > 0 ? ` · 현재 합계 +${v * cur}${unit}` : ''}`;
    }).join('<br>') || '효과 정보 없음';
    let keystoneTag = node.requireBranchPoints ? `<div class="tooltip-line" style="color:#ffd36b;">★ 핵심 노드</div>` : '';
    let reqLine = '';
    if (node.requireBranchPoints) {
        let spent = getExpertBranchSpent(node.branch);
        let met = spent >= node.requireBranchPoints;
        reqLine = `<div class="tooltip-line" style="color:${met ? '#7fe0a0' : '#ff9b9b'};">${met ? '✓ 할당 가능' : '✗ 할당 잠김'} · 조건: ${theme.label} 분기에 ${node.requireBranchPoints}포인트 투자 (현재 ${spent})</div>`;
    }
    return `<div class="tooltip-title" style="color:${theme.color};">${theme.icon} ${node.name}</div><div class="tooltip-line" style="color:${theme.color};">${theme.label} 영역</div>${keystoneTag}<div class="tooltip-line">${node.desc}</div><div class="tooltip-line" style="color:#cfe3ff;">${effectLines}</div><div class="tooltip-line">투자 ${cur}/${node.max} · 포인트 비용 ${node.cost}</div>${reqLine}`;
}
function showExpertNodeTooltip(event, nodeId) {
    let node = EXPERT_TREE_NODES.find(v => v.id === nodeId);
    if (!node || typeof showInfoTooltipHtml !== 'function') return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildExpertNodeTooltipHtml(node), getExpertBranchTheme(node.branch).color);
}
async function askUntrainExpertNode(nodeId) {
    let node = EXPERT_TREE_NODES.find(v => v.id === nodeId);
    if (!node) return;
    if ((game.currencies.scour || 0) < 1) return addLog('전문가 노드 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    if (!canUntrainExpertNode(nodeId)) return addLog('핵심 노드 조건을 유지해야 하므로 이 노드는 반환할 수 없습니다.', 'attack-monster');
    if (!await requestGameConfirmation(`[${node.name}] 노드를 반환하고 정화의 오브 1개를 소모합니다.`, {
        title: '전문가 노드 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    if (!untrainExpertNode(nodeId)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    addLog(`♻️ 전문가 노드 반환: ${node.name} (정화의 오브 1개 소모)`, 'season-up');
    updateStaticUI();
}
async function askResetExpertTree() {
    let cost = (typeof getExpertPointSpent === 'function') ? getExpertPointSpent() : 0;
    if (cost <= 0) return;
    if ((game.currencies.scour || 0) < cost) return addLog(`전문가 트리 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`전문가 트리를 모두 초기화하고 정화의 오브 ${cost}개를 소모합니다.`, {
        title: '전문가 트리 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    resetExpertTree();
    addLog(`♻️ 전문가 트리 전체 초기화 (정화의 오브 ${cost}개 소모)`, 'season-up');
    updateStaticUI();
}
function getExpertiseNodeButtonHtml(node) {
    let lv = (game.expertise.nodes[node.id] || 0);
    let can = canAllocateExpertNode(node.id);
    let canUn = (typeof canUntrainExpertNode === 'function') && canUntrainExpertNode(node.id) && (game.currencies.scour || 0) >= 1;
    let keystoneCls = node.requireBranchPoints ? ' keystone' : '';
    let reqHtml = '';
    if (node.requireBranchPoints) {
        let theme = getExpertBranchTheme(node.branch);
        let spent = getExpertBranchSpent(node.branch);
        let met = spent >= node.requireBranchPoints;
        reqHtml = `<br><span class="expertise-node-req ${met ? 'met' : 'unmet'}">${met ? '✓' : '🔒'} ${theme.label} 분기 ${spent}/${node.requireBranchPoints}</span>`;
    }
    // Use a `locked` class instead of the disabled attribute so hover tooltips still fire
    // on nodes the player cannot yet allocate; the click handlers guard their own conditions.
    let hover = `data-info-tooltip-anchor="1" onmouseenter="showExpertNodeTooltip(event,'${node.id}')" onmousemove="showExpertNodeTooltip(event,'${node.id}')" onmouseleave="hideInfoTooltip()"`;
    return `<div class="expertise-node-row" ${hover}><button class="expertise-node branch-${node.branch}${keystoneCls}${can ? '' : ' locked'}" onclick="allocateExpertNode('${node.id}')&&updateStaticUI()">${node.requireBranchPoints ? '★ ' : ''}${node.name} (${lv}/${node.max}) · ${node.cost}pt${reqHtml}</button><button class="expertise-node-untrain${canUn ? '' : ' locked'}" onclick="askUntrainExpertNode('${node.id}')" title="반환 (정화의 오브 1개 소모)">−</button></div>`;
}

function renderExpertiseUI() {
    ensureExpertiseState();
    let ov = document.getElementById('ui-expertise-overview');
    let subtabs = document.getElementById('ui-expert-subtabs');
    let detail = document.getElementById('ui-expertise-detail');
    let tree = document.getElementById('ui-expert-tree');
    let treeTitle = document.getElementById('ui-expert-tree-title');
    if (!ov || !subtabs || !detail || !tree) return;
    const total = getExpertPointTotal(), spent = getExpertPointSpent(), free = getExpertPointFree();
    ov.innerHTML = '';
    let unlocked = EXPERT_IDS.filter(id => (game.expertise.unlockedExperts||[]).includes(id));
    let treeUnlocked = hasExpertTreeUnlocked();
    let validTabs = [...unlocked, '__tree'];
    game.expertise.selectedExpertTab = validTabs.includes(game.expertise.selectedExpertTab) ? game.expertise.selectedExpertTab : (unlocked[0] || '__tree');
    let expertBtns = unlocked.map(id => `<button class="subtab-btn ${game.expertise.selectedExpertTab===id?'active':''}" onclick="game.expertise.selectedExpertTab='${id}';updateStaticUI();">${EXPERT_DEFS[id].icon} ${EXPERT_DEFS[id].name}</button>`).join('');
    let treeLabel = treeUnlocked ? '전문가 노드 트리' : '전문가 노드 트리(잠김)';
    let treeBtn = `<button class="subtab-btn ${game.expertise.selectedExpertTab==='__tree'?'active':''}" onclick="game.expertise.selectedExpertTab='__tree';updateStaticUI();">${treeLabel}</button>`;
    subtabs.innerHTML = expertBtns + treeBtn;
    let showingTree = game.expertise.selectedExpertTab === '__tree';
    if (treeTitle) treeTitle.style.display = showingTree ? '' : 'none';
    tree.style.display = showingTree ? '' : 'none';
    if (!showingTree) {
        ov.innerHTML = '';
        detail.innerHTML = unlocked.filter(id => !game.expertise.selectedExpertTab || id === game.expertise.selectedExpertTab).map(id => getExpertiseCardHtml(id)).join('') || '<div style="color:#98abc0;">아직 조우한 전문가가 없습니다.</div>';
        tree.innerHTML = '';
        return;
    }
    ov.innerHTML = '';
    detail.innerHTML = '';
    let treeOverview = getExpertiseOverviewHtml(total, spent, free);
    if (!treeUnlocked) { tree.innerHTML = treeOverview + '<div class="expertise-panel" style="color:#c7b6d9;">전문가 노드 트리는 전문가 중 한 명이 Lv.16에 도달해 첫 전문가 포인트를 획득하면 해금됩니다.</div>'; return; }
    let groups = { common:[], mycologist:[], gemEngraver:[], astronomer:[], beekeeper:[] };
    EXPERT_TREE_NODES.forEach(n => { if (groups[n.branch]) groups[n.branch].push(n); });
    tree.innerHTML = treeOverview + getExpertiseTreeHubHtml(groups);
}

function getExpertBranchZoneHtml(branch, groups, posClass) {
    let theme = getExpertBranchTheme(branch);
    let center = branch === 'common';
    return `<div class="expert-zone-cell ${posClass}"><div class="expert-branch-zone branch-${branch}${center ? ' expert-hub-center' : ''}"><div class="expert-branch-head" style="color:${theme.color};">${theme.icon} ${theme.label}${center ? ' · 중앙 허브' : ''}</div>${(groups[branch] || []).map(getExpertiseNodeButtonHtml).join('')}</div></div>`;
}

function getExpertiseTreeHubHtml(groups) {
    return `<div class="expertise-tree-hub">`
        + getExpertBranchZoneHtml('astronomer', groups, 'pos-top')
        + getExpertBranchZoneHtml('mycologist', groups, 'pos-left')
        + getExpertBranchZoneHtml('common', groups, 'pos-center')
        + getExpertBranchZoneHtml('gemEngraver', groups, 'pos-right')
        + getExpertBranchZoneHtml('beekeeper', groups, 'pos-bottom')
        + `</div>`;
}

function isJewelTabUnlockReady() {
    return (game.season || 1) >= 5
        || (Array.isArray(game.jewelInventory) && game.jewelInventory.length > 0)
        || ((game.currencies || {}).jewelShard || 0) > 0;
}

function syncDerivedTabUnlock(tabId) {
    if (tabId === 'tab-jewel' && game.unlocks && !game.unlocks.jewel && isJewelTabUnlockReady()) {
        game.unlocks.jewel = true;
        game.noti.jewel = true;
    }
    if (tabId === 'tab-cube' && typeof maybeUnlockCoreCube === 'function') maybeUnlockCoreCube({ silent: false });
}

function checkUnlocks() {
    let u = game.unlocks;
    if (!(game.seenTutorials || []).includes('tutorial_battle_basics')) {
        queueTutorialNotice('tutorial_battle_basics', '전투 기본 가이드', '전투 화면, 피해 숫자, 스킬 범위와 성장 순서를 차례로 알아봅니다.', 'tab-character');
    }
    if (game.level >= 2 && !u.char) {
        u.char = true;
        game.noti.char = true;
        queueTutorialNotice('unlock_char', '스킬트리 개방', '레벨 2에 도달해 성좌를 찍을 수 있게 되었습니다.\n패시브 포인트를 사용해 성장 방향을 정해보세요.', 'tab-char');
    }
    if ((game.inventory.length > 0 || Object.values(game.currencies).some(v => v > 0)) && !u.items) {
        u.items = true;
        game.noti.items = true;
        queueTutorialNotice('unlock_items', '장비/제작 개방', '첫 장비 또는 제작 재화를 얻었습니다.\n아이템을 장착하고, 오브를 사용해 장비를 강화할 수 있습니다.', 'tab-items');
    }
    if (isJewelTabUnlockReady() && !u.jewel) {
        u.jewel = true;
        game.noti.jewel = true;
        queueTutorialNotice('unlock_jewel', '주얼 탭 개방', '주얼과 주얼 결정을 사용할 수 있게 되었습니다.', 'tab-jewel');
    }
    if ((game.skills.length > 1 || game.supports.length > 0) && !u.skills) {
        u.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('unlock_skills', '스킬 젬 개방', '새로운 젬을 얻었습니다.\n공격 스킬을 교체하거나 보조 젬을 연결해 전투 스타일을 바꿔보세요.', 'tab-skills');
    }
    // 도감이 잠겨 있을 때만 인벤토리 전체를 훑는다. (이미 해금된 뒤에도 매 드랍마다
    // O(인벤토리) 스캔을 돌면 대량 처치/드랍 시 스파이크가 생긴다.)
    if (!u.codex) {
        let hasUniqueForCodex = (game.inventory || []).some(item => item && item.rarity === 'unique')
            || Object.values(game.equipment || {}).some(item => item && item.rarity === 'unique')
            || Object.keys(game.uniqueCodex || {}).length > 0;
        if (hasUniqueForCodex) {
            u.codex = true;
            game.noti.codex = true;
            queueTutorialNotice('unlock_codex', '도감 탭 개방', '첫 고유 아이템을 획득해 도감이 열렸습니다.\n고유 아이템을 등록/보관하고 도감 보너스를 받을 수 있습니다.', 'tab-codex');
        }
    }
    if (game.maxZoneId >= 1 && !u.map) {
        u.map = true;
        game.noti.map = true;
        queueTutorialNotice('unlock_map', '지도 개방', '새 사냥터가 열렸습니다.\n원하는 지역으로 이동해 드랍과 속성을 조절할 수 있습니다.', 'tab-map');
    }
    if (game.maxZoneId >= 5 && !(game.seenTutorials || []).includes('unlock_market')) {
        game.noti.items = true;
        queueTutorialNotice('unlock_market', '거래소 개방', '액트 5를 클리어해 거래소가 열렸습니다.\n장비/제작 탭의 거래소에서 재화 교환과 특수 서비스를 이용할 수 있습니다.', 'tab-items', 'item-tab-market');
    }
    if (typeof maybeUnlockCoreCube === 'function') maybeUnlockCoreCube({ silent: false });
    if (game.season > 1 && !u.season) {
        u.season = true;
        game.noti.season = true;
        queueTutorialNotice('unlock_season_tab', '루프 탭 개방', `루프 ${game.season}에 도달했습니다!\n루프 이정표와 루프 패시브 트리를 루프 탭에서 확인할 수 있습니다.`, 'tab-season');
    }
    if (((game.completedTrials || []).length > 0 || game.ascendPoints > 0 || !!game.ascendClass) && !u.traits) {
        u.traits = true;
        game.noti.traits = true;
        queueTutorialNotice('unlock_traits', '전직 탭 개방', '전직 시련을 통과해 직업전직 탭이 열렸습니다.\n클래스를 선택하고 전직 노드를 활성화하세요.', 'tab-traits');
    }
    if ((((game.currencies || {}).sealShard || 0) > 0 || ((game.currencies || {}).strongSealShard || 0) > 0) && !u.talisman) {
        u.talisman = true;
        game.talismanUnlocked = true;
        game.noti.talisman = true;
        addLog('🧿 봉인편린을 얻어 부적 탭이 개방되었습니다!', 'loot-unique');
    }
    if (typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked() && !game.chaosInfuserUnlocked) {
        game.chaosInfuserUnlocked = true;
        game.noti.items = true;
        addLog('🧪 나무꾼의 흔적을 해석해 혼돈 주입기가 해금되었습니다.', 'loot-unique');
    }
    ensureExpertiseState();
    const beforeExperts = new Set(game.expertise.unlockedExperts || []);
    if ((game.season||1) >= 2 && (game.currencies.sporeFire||0) > 0) game.expertise.unlockedExperts.push('mycologist');
    if (((game.season||1) >= 2 && (game.currencies.bossCore||0) > 0) || ((game.season||1) >= 4 && (game.currencies.skyEssence||0) > 0)) game.expertise.unlockedExperts.push('gemEngraver');
    if ((game.season||1) >= 7 && ((game.starWedge||{}).unlocked || getStarWedgeUnlockReady())) game.expertise.unlockedExperts.push('astronomer');
    if ((game.season||1) >= 8 && (((game.beehive||{}).unlockedPermanent) || (game.currencies.hiveKey||0) > 0)) game.expertise.unlockedExperts.push('beekeeper');
    game.expertise.unlockedExperts = Array.from(new Set(game.expertise.unlockedExperts));
    if (!game.unlocks.expertise && game.expertise.unlockedExperts.length > 0) { game.unlocks.expertise = true; game.noti.expertise = true; queueTutorialNotice('unlock_expertise','전문가 탭 개방','전문가 조우를 통해 전문가 시스템이 개방되었습니다.','tab-expertise'); }
    let newlyUnlockedExperts = (game.expertise.unlockedExperts||[]).filter(id => !beforeExperts.has(id));
    if (newlyUnlockedExperts.length > 0) game.noti.expertise = true;
    if (game.unlocks.expertise) newlyUnlockedExperts.forEach(id => {
        let key = `unlock_expert_${id}`;
        if ((game.seenTutorials||[]).includes(key)) return;
        let def = EXPERT_DEFS[id] || { name: id, desc: '전문가를 조우했습니다.' };
        queueTutorialNotice(key, `${def.icon || '🧠'} ${def.name} 조우`, `${def.desc}\n전문가 탭에서 레벨과 해금, 노드 트리를 확인해보세요.`, 'tab-expertise');
    });
    if (game.level >= 200) unlockJournalEntry('level_200');
    if (game.level >= 100 && (game.completedTrials || []).includes('trial_3') && !(game.unlockedTrials || []).includes('trial_4')) {
        game.unlockedTrials.push('trial_4');
        game.noti.map = true;
        addLog('🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!', 'loot-unique');
    }
    detectNewMapUnlockAlarms();
}

function isSeasonNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.seasonNodes.includes(req));
    return game.seasonNodes.includes(node.req);
}
function getSeasonNodeLevel(id) {
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (game.seasonNodes.includes(id)) return Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1));
    return 0;
}
function isSeasonTreeEvolved() {
    let keys = Object.keys(SEASON_NODES || {});
    if (keys.length <= 0) return false;
    return keys.every(id => getSeasonNodeLevel(id) >= 1);
}

function isAscendNodeRequirementMet(node) {
    if (!node || !node.req) return true;
    if (Array.isArray(node.req)) return node.req.some(req => game.ascendNodes.includes(req));
    return game.ascendNodes.includes(node.req);
}


function canRefundPassiveNode(nodeId) {
    if (nodeId === 'n0') return false;
    let owned = new Set((game.passives || []).filter(id => id !== nodeId));
    if (!owned.has('n0')) owned.add('n0');
    let virtualRoots = typeof getPassiveConnectionNodeIds === 'function' ? getPassiveConnectionNodeIds() : new Set();
    virtualRoots.forEach(id => owned.add(id));
    let roots = ['n0', ...Array.from(virtualRoots).filter(id => id !== 'n0')];
    let seen = new Set(roots);
    let q = roots.slice();
    while (q.length > 0) {
        let cur = q.shift();
        let passiveEdges = (PASSIVE_TREE && Array.isArray(PASSIVE_TREE.edges)) ? PASSIVE_TREE.edges : [];
        passiveEdges.forEach(edge => {
            let next = null;
            if (edge.from === cur && owned.has(edge.to)) next = edge.to;
            else if (edge.to === cur && owned.has(edge.from)) next = edge.from;
            if (next && !seen.has(next)) { seen.add(next); q.push(next); }
        });
    }
    return Array.from(owned).every(id => seen.has(id));
}

function refundPassiveNode(id) { if (!assertBuildEditable()) return;
    game.passives = Array.isArray(game.passives) ? game.passives : ['n0'];
    if (!game.passives.includes(id) || id === 'n0') return;
    if ((game.currencies.scour || 0) < 1) return addLog('패시브 노드 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    if (!canRefundPassiveNode(id)) return addLog('연결 유지에 필요한 노드는 반환할 수 없습니다.', 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.passives = game.passives.filter(nodeId => nodeId !== id);
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + 1;
    calculateReachableNodes();
    addLog(`♻️ 패시브 노드 반환: ${id} (정화의 오브 1개 소모)`, 'season-up');
    updateStaticUI();
}

async function askRefundSeasonNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation('선택한 루프 패시브를 반환하고 정화의 오브 1개를 소모합니다.', {
        title: '루프 패시브 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    return refundSeasonNode(id);
}

function refundSeasonNode(id) { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (!game.seasonNodes.includes(id)) return;
    let blockers = Object.keys(SEASON_NODES).filter(key => {
        if (key === id || !game.seasonNodes.includes(key)) return false;
        let req = SEASON_NODES[key].req;
        if (!req) return false;
        if (Array.isArray(req)) return req.includes(id) && req.filter(v => v !== id).every(v => !game.seasonNodes.includes(v));
        return req === id;
    });
    if (blockers.length > 0) return addLog('선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.', 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('루프 패시브 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    let lv = getSeasonNodeLevel(id);
    game.seasonNodes = game.seasonNodes.filter(nodeId => nodeId !== id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    delete game.seasonNodeLevels[id];
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + lv;
    updateStaticUI();
}

async function askRefundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation('선택한 전직 패시브를 반환하고 정화의 오브 1개를 소모합니다.', {
        title: '전직 패시브 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    return refundAscendNode(id);
}

function refundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (!game.ascendNodes.includes(id)) return;
    let tree = getClassTreeDef(game.ascendClass);
    let blockers = Object.keys(tree).filter(key => {
        if (key === id || !game.ascendNodes.includes(key)) return false;
        let req = tree[key].req;
        let reqAny = Array.isArray(tree[key].reqAny) ? tree[key].reqAny : [];
        let blockedByReq = false;
        if (req) {
            if (Array.isArray(req)) blockedByReq = req.includes(id) && req.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
            else blockedByReq = req === id;
        }
        let blockedByReqAny = reqAny.includes(id) && reqAny.filter(v => v !== id).every(v => !game.ascendNodes.includes(v));
        return blockedByReq || blockedByReqAny;
    });
    if (blockers.length > 0) return addLog('선행 조건으로 연결된 전직 패시브가 있어 반환할 수 없습니다.', 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('전직 패시브 반환에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.ascendNodes = game.ascendNodes.filter(nodeId => nodeId !== id);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 1;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

async function buySeason(id) { if (!assertBuildEditable()) return;
    let node = SEASON_NODES[id];
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (!node || !isSeasonNodeRequirementMet(node)) return;
    let lv = getSeasonNodeLevel(id);
    let evolved = isSeasonTreeEvolved();
    let cap = evolved ? 5 : 1;
    if (lv >= cap && lv > 0) {
        if (!await requestGameConfirmation('이미 최대 단계인 노드입니다.\n정화의 오브 1개를 사용해 반환하시겠습니까?', {
            title: '최대 단계 노드 반환',
            tone: 'danger',
            confirmLabel: '노드 반환'
        })) return;
        return refundSeasonNode(id);
    }
    if (game.seasonPoints <= 0) return;
    if (lv <= 0) game.seasonNodes.push(id);
    game.seasonNodeLevels[id] = lv + 1;
    game.seasonPoints--;
    updateStaticUI();
}


function getClassKeystoneDefs(clsKey) {
    let defs = (CLASS_KEYSTONE_DEFS && CLASS_KEYSTONE_DEFS[clsKey]) || [];
    return Array.isArray(defs) ? defs : [];
}

function isAscendKeystoneRequirementMet(node) {
    if (!node) return false;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    // 9번째(5차) 키스톤은 선행 키스톤 없이 "이번 루프에 해당 직업으로 재능 개화"만 요구한다(영구 아님).
    if (node.fifthJobOnly) {
        return !!game.ascendClass && game.bloomedClassThisLoop === game.ascendClass;
    }
    if (node.req) return game.ascendKeystones.includes(node.req);
    if (Array.isArray(node.reqAny) && node.reqAny.length > 0) return node.reqAny.some(id => game.ascendKeystones.includes(id));
    return true;
}


function enforceWarriorDualTrainingEquipment(onEnable) {
    if (game.ascendClass !== 'warrior') return true;
    game.equipment = game.equipment || {};
    game.inventory = Array.isArray(game.inventory) ? game.inventory : [];
    let shield = game.equipment['방패'];
    if (onEnable) {
        if (shield && shield.slot === '방패') {
            if (game.inventory.length >= getInventoryLimit()) {
                addLog('쌍수 훈련 활성화를 위해 방패를 해제해야 하지만 인벤토리가 가득 찼습니다.', 'attack-monster');
                return false;
            }
            game.inventory.push(shield);
            game.equipment['방패'] = null;
            addLog('🛡️ 쌍수 훈련 활성화: 기존 방패를 인벤토리로 이동했습니다.', 'loot-normal');
        }
        return true;
    }
    if (shield && shield.slot === '무기') {
        if (game.inventory.length >= getInventoryLimit()) {
            addLog('쌍수 훈련 해제를 위해 방패 슬롯 무기를 해제해야 하지만 인벤토리가 가득 찼습니다.', 'attack-monster');
            return false;
        }
        game.inventory.push(shield);
        game.equipment['방패'] = null;
        addLog('🧰 쌍수 훈련 해제: 방패 슬롯 무기를 인벤토리로 이동했습니다.', 'loot-normal');
    }
    return true;
}
function buyAscendKeystone(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    let defs = getClassKeystoneDefs(game.ascendClass);
    let node = defs.find(row => row.id === id);
    if (!node) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.includes(id)) return;
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0));
    if (game.ascendKeystonePoints <= 0) return addLog('키스톤 포인트가 부족합니다.', 'attack-monster');
    if (game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT) return addLog(`키스톤은 최대 ${CLASS_KEYSTONE_PICK_LIMIT}개 선택할 수 있습니다.`, 'attack-monster');
    if (!isAscendKeystoneRequirementMet(node)) return addLog('선행 키스톤 조건이 필요합니다.', 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(true)) return;
    game.ascendKeystones.push(id);
    game.ascendKeystonePoints -= 1;
    updateStaticUI();
}

// 키스톤 카드 호버 시 해당 키스톤의 선행 체인(루트까지)을 파란 테두리로 연결 강조한다.
function highlightKeystoneChain(id, on) {
    let visited = {};
    let stack = [id];
    let first = true;
    while (stack.length > 0) {
        let cur = stack.pop();
        if (visited[cur]) continue;
        visited[cur] = true;
        let card = document.getElementById('ks-card-' + cur);
        if (!card) continue;
        if (first) { card.classList.toggle('ks-self-hi', on); first = false; }
        else card.classList.toggle('ks-prereq-hi', on);
        (card.getAttribute('data-ks-req') || '').split(',').filter(Boolean).forEach(r => stack.push(r));
    }
}

async function refundAscendKeystone(id) { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (!game.ascendKeystones.includes(id)) return;
    let blockers = getClassKeystoneDefs(game.ascendClass).filter(node => {
        if (!game.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        if (Array.isArray(node.reqAny) && node.reqAny.includes(id)) {
            let hasAlt = node.reqAny.some(reqId => reqId !== id && game.ascendKeystones.includes(reqId));
            return !hasAlt;
        }
        return false;
    });
    if (blockers.length > 0) return addLog(`선행 키스톤입니다: ${blockers.map(v => v.name).join(', ')}`, 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('키스톤 환불에는 정화의 오브 1개가 필요합니다.', 'attack-monster');
    if (!await requestGameConfirmation('선택한 키스톤을 반환하고 정화의 오브 1개를 소모합니다.', {
        title: '키스톤 반환',
        tone: 'danger',
        confirmLabel: '키스톤 반환'
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (!game.ascendKeystones.includes(id)) return addLog('확인 중 키스톤 상태가 변경되어 반환을 취소했습니다.', 'attack-monster');
    blockers = getClassKeystoneDefs(game.ascendClass).filter(node => {
        if (!game.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        if (!Array.isArray(node.reqAny) || !node.reqAny.includes(id)) return false;
        return !node.reqAny.some(reqId => reqId !== id && game.ascendKeystones.includes(reqId));
    });
    if (blockers.length > 0) return addLog(`확인 중 선행 상태가 변경되었습니다: ${blockers.map(v => v.name).join(', ')}`, 'attack-monster');
    if ((game.currencies.scour || 0) < 1) return addLog('확인 중 정화의 오브가 부족해져 반환을 취소했습니다.', 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - 1);
    game.ascendKeystones = game.ascendKeystones.filter(key => key !== id);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState([id]);
    if (id === 'wlk8' && typeof reclaimKeystoneJewelSlots === 'function') reclaimKeystoneJewelSlots();
    updateStaticUI();
}

async function resetAscendKeystones() { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return;
    let cost = game.ascendKeystones.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`키스톤 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`선택한 키스톤을 모두 반환하고 정화의 오브 ${cost}개를 소모합니다.`, {
        title: '키스톤 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return addLog('확인 중 키스톤 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    cost = game.ascendKeystones.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`확인 중 정화의 오브가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    if (game.ascendKeystones.includes('w3') && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + game.ascendKeystones.length;
    let removedKeystones = game.ascendKeystones.slice();
    let hadAbyssLord = game.ascendKeystones.includes('wlk8');
    game.ascendKeystones = [];
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(removedKeystones);
    if (hadAbyssLord && typeof reclaimKeystoneJewelSlots === 'function') reclaimKeystoneJewelSlots();
    updateStaticUI();
}

async function resetSeasonNodes() { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return;
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    let totalLv = game.seasonNodes.reduce((s, id) => s + Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1)), 0);
    let cost = game.seasonNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`루프 패시브 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`루프 패시브를 모두 초기화하고 정화의 오브 ${cost}개를 소모합니다.`, {
        title: '루프 패시브 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return addLog('확인 중 루프 패시브 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    totalLv = game.seasonNodes.reduce((sum, nodeId) => sum + Math.max(1, Math.floor(game.seasonNodeLevels[nodeId] || 1)), 0);
    cost = game.seasonNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`확인 중 정화의 오브가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + totalLv;
    game.seasonNodes = [];
    game.seasonNodeLevels = {};
    updateStaticUI();
}

async function resetAscendNodes() { if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return;
    let cost = game.ascendNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`전직 패시브 트리 전체 초기화에는 정화의 오브 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`전직 패시브 트리를 모두 초기화하고 정화의 오브 ${cost}개를 소모합니다.`, {
        title: '전직 패시브 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return addLog('확인 중 전직 패시브 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    cost = game.ascendNodes.length;
    if ((game.currencies.scour || 0) < cost) return addLog(`확인 중 정화의 오브가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.scour = Math.max(0, Math.floor(game.currencies.scour || 0) - cost);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + game.ascendNodes.length;
    game.ascendNodes = [];
    normalizeSupportLoadout(true);
    updateStaticUI();
}

async function selectClass(key) {
    if (await requestGameConfirmation(`[${CLASS_TEMPLATES[key].name}] 직업을 선택합니다.\n이번 루프에는 다시 변경할 수 없습니다.`, {
        title: '전직 선택',
        confirmLabel: '이 직업 선택'
    })) {
        let previousKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones.slice() : [];
        game.ascendClass = key;
        game.ascendKeystones = [];
        if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(previousKeystones, { force: true });
        updateStaticUI();
    }
}

function buyAscend(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    let tree = getClassTreeDef(game.ascendClass);
    let node = tree[id];
    let reqMet = isAscendNodeRequirementMet(node);
    if (node && node.exclusive && game.ascendNodes.includes(node.exclusive)) return addLog('같은 계열의 노드는 둘 중 하나만 선택할 수 있습니다.', 'attack-monster');
    if (!node || game.ascendPoints <= 0 || game.ascendNodes.includes(id) || !reqMet) return;
    game.ascendNodes.push(id);
    game.ascendPoints--;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function getLockedTabMessage(tabId) {
    if (tabId === 'tab-char') return '레벨 2에 도달하면 스킬트리가 열립니다.';
    if (tabId === 'tab-season') return '루프 1을 클리어하면 루프 탭이 열립니다.';
    if (tabId === 'tab-items') return '장비나 제작 재화를 얻으면 장비/제작 탭이 열립니다.';
    if (tabId === 'tab-jewel') return '루프 5에 도달하거나 주얼 또는 주얼 결정을 얻으면 주얼 탭이 열립니다.';
    if (tabId === 'tab-skills') return '새 스킬 젬이나 보조 젬을 획득하면 스킬 젬 탭이 열립니다.';
    if (tabId === 'tab-codex') return '첫 고유 아이템을 획득하면 도감 탭이 열립니다.';
    if (tabId === 'tab-talisman') return '봉인편린을 획득하면 부적 탭이 열립니다.';
    if (tabId === 'tab-cube') return '지하계 10층을 클리어하고 루프 20에 도달하면 큐브 탭이 열립니다.';
    if (tabId === 'tab-map') return '새 사냥터를 발견하면 지도 탭이 열립니다.';
    if (tabId === 'tab-traits') return '전직 시련을 통과하면 직업전직 탭이 열립니다.';
    if (tabId === 'tab-talent') return '재능 개화 시련을 클리어하면 재능 탭이 열립니다.';
    return '아직 해금되지 않은 탭입니다.';
}




async function pickEquippedSlotByPrompt(validSlots){
    return requestGameChoice({
        title: '장비 대상 선택',
        message: '작업을 적용할 장비 부위를 선택하세요.',
        choices: validSlots.map(slot => ({
            value: slot,
            label: slot,
            detail: game.equipment && game.equipment[slot] ? (game.equipment[slot].name || '장착 장비') : '장비 없음'
        })),
        confirmLabel: '대상 선택'
    });
}
async function applyUnderworldEnchant(){
    if (!assertBuildEditable()) return;
    let slot = await pickEquippedSlotByPrompt(['무기','갑옷','투구']); if(!slot) return;
    let item = game.equipment && game.equipment[slot]; if(!item) return addLog('해당 부위 장비가 없습니다.','attack-monster');
    let pools = {
      '무기':[ ['pctDmg',8,24,2], ['spellFlatPct',6,18,2], ['projectileExtraShots',1,1,3], ['resPen',5,14,2], ['physIgnore',5,14,2], ['flatDmg',12,38,1] ],
      '갑옷':[ ['pctHp',4,12,1], ['flatHp',45,140,1], ['armorPct',8,24,1], ['evasionPct',8,24,1], ['energyShieldPct',8,24,1], ['maxResF',1,2,3], ['maxResC',1,2,3], ['maxResL',1,2,3], ['resChaos',4,10,2] ],
      '투구':[ ['targetAny',1,1,3], ['critDmg',18,25,2], ['armor',40,120,1], ['evasion',40,120,1], ['energyShield',35,105,1], ['crit',2,6,2] ]
    };
    let row = pools[slot][Math.floor(Math.random()*pools[slot].length)];
    let [id,min,max,str]=row; let val = min + Math.random()*(max-min); if(max===min) val=max;
    val = Number((Math.round(val*10)/10).toFixed(1));
    let costC = Math.max(4, str*6), costS=Math.max(2,str*3), costG=Math.max(1,str-1);
    if((game.currencies.underCopper||0)<costC || (game.currencies.underSilver||0)<costS || (game.currencies.underGold||0)<costG) return addLog(`지하계 재화 부족 (구리 ${costC}/은 ${costS}/금 ${costG})`,'attack-monster');
    game.currencies.underCopper-=costC; game.currencies.underSilver-=costS; game.currencies.underGold-=costG;
    item.stats = Array.isArray(item.stats) ? item.stats.filter(st => !(st && st.underEnchant)) : [];
    item.underEnchant = { id, statName:getStatName(id), val, valMin:val, valMax:val, underEnchant:true };
    addLog(`⛏️ 지하계 인챈트 성공: [${item.name}] ${getStatName(id)} +${formatValue(id,val)} (비용 구리${costC}/은${costS}/금${costG})`,'loot-rare');
    updateStaticUI();
}
async function attemptUnderworldLimitBreak(){
    if (!assertBuildEditable()) return;
    let slot = await pickEquippedSlotByPrompt(['무기','투구','갑옷','장갑1','장갑2','신발','목걸이','반지1','반지2','허리띠']); if(!slot) return;
    let item = game.equipment && game.equipment[slot]; if(!item) return addLog('해당 부위 장비가 없습니다.','attack-monster');
    let q=Math.floor(item.quality||0); if(q!==20) return addLog('한계돌파는 퀄리티 20%에서만 가능합니다.','attack-monster');
    if(item.qualityLockedByLimitBreak) return addLog('이미 한계돌파를 시도한 장비입니다. 퀄리티 재부여 불가 상태입니다.','attack-monster');
    let baseCost = (slot.includes('반지')||slot==='목걸이'||slot==='허리띠')? [24,12,4] : (slot==='무기'?[30,16,6]:[28,14,5]);
    if((game.currencies.underCopper||0)<baseCost[0]||(game.currencies.underSilver||0)<baseCost[1]||(game.currencies.underGold||0)<baseCost[2]) return addLog(`지하계 재화 부족 (구리 ${baseCost[0]}/은 ${baseCost[1]}/금 ${baseCost[2]})`,'attack-monster');
    game.currencies.underCopper-=baseCost[0]; game.currencies.underSilver-=baseCost[1]; game.currencies.underGold-=baseCost[2];
    let delta = -10 + Math.floor(Math.random()*21);
    item.quality = Math.max(0,Math.min(30, q + delta));
    item.qualityLockedByLimitBreak = true;
    addLog(`🧱 한계돌파 시도: [${item.name}] 퀄리티 ${q}% → ${item.quality}% (변동 ${delta>=0?'+':''}${delta}%, 재부여 잠김)`,'season-up');
    updateStaticUI();
}
function getUnderworldRuneBonusPool(){
    return [
        { stat:'flatHp', min:10, max:30 }, { stat:'flatDmg', min:2, max:6 }, { stat:'aspd', min:0.4, max:1.2 },
        { stat:'move', min:0.4, max:1.2 }, { stat:'crit', min:0.2, max:0.8 }, { stat:'critDmg', min:1.5, max:4.0 },
        { stat:'resPen', min:0.3, max:1.0 }, { stat:'physIgnore', min:0.3, max:1.0 }, { stat:'resAll', min:0.2, max:0.6 }
    ];
}
function rollUnderworldRuneBonusLine(){
    let pool = getUnderworldRuneBonusPool();
    let row = pool[Math.floor(Math.random()*pool.length)];
    let v = row.min + Math.random()*(row.max-row.min);
    let val = Number((Math.round(v*10)/10).toFixed(1));
    return { stat: row.stat, val: val };
}
function ensureUnderworldRuneBonusMilestones(no){
    let st=ensureUnderworldRuneState();
    let lv=Math.max(0, Math.floor((st.enhanceLvByNo||{})[no]||0));
    let target = lv >= 15 ? 3 : (lv >= 10 ? 2 : (lv >= 5 ? 1 : 0));
    st.bonusLinesByNo[no] = Array.isArray(st.bonusLinesByNo[no]) ? st.bonusLinesByNo[no] : [];
    while (st.bonusLinesByNo[no].length < target) st.bonusLinesByNo[no].push(rollUnderworldRuneBonusLine());
}
async function enhanceUnderworldRune(){
    if (!assertBuildEditable()) return;
    let st=ensureUnderworldRuneState();
    let no = await requestGameNumber({
        title: '지하세계 룬 강화',
        message: '강화할 룬 번호를 선택하세요.',
        min: 1,
        max: 30,
        step: 1,
        value: 1,
        confirmLabel: '룬 강화'
    });
    if(no===null) return;
    let have=(st.obtainedRunes||[]).some(n=>Math.floor(n||0)===no);
    if(!have) return addLog('해당 번호 룬을 보유해야 강화할 수 있습니다.','attack-monster');
    let lv=Math.max(0,Math.floor(st.enhanceLvByNo[no]||0)); if(lv>=15) return addLog('룬 강화는 최대 +15입니다.','attack-monster');
    let c=260 + lv*220, s=150 + lv*150, g=55 + lv*58, shard=120 + lv*90;
    if((game.currencies.underCopper||0)<c||(game.currencies.underSilver||0)<s||(game.currencies.underGold||0)<g||(game.currencies.runeShard||0)<shard) return addLog(`강화 재화 부족 (구리${c}/은${s}/금${g}/룬조각${shard})`,'attack-monster');
    game.currencies.underCopper-=c; game.currencies.underSilver-=s; game.currencies.underGold-=g; game.currencies.runeShard-=shard;
    st.enhanceLvByNo[no]=lv+1;
    ensureUnderworldRuneBonusMilestones(no);
    let bonusCnt = (st.bonusLinesByNo[no]||[]).length;
    addLog(`🧿 룬 강화 성공: 룬${no} +${lv+1} (보너스 옵션 ${bonusCnt}줄)`, 'loot-unique');
    updateStaticUI();
}
async function rerollUnderworldRuneBonus(){
    if (!assertBuildEditable()) return;
    let st=ensureUnderworldRuneState();
    let no = await requestGameNumber({
        title: '룬 보너스 리롤',
        message: '보너스 옵션을 다시 굴릴 룬 번호를 선택하세요.',
        min: 1,
        max: 30,
        step: 1,
        value: 1,
        confirmLabel: '옵션 리롤'
    });
    if(no===null) return;
    let lv=Math.max(0,Math.floor((st.enhanceLvByNo||{})[no]||0));
    let lineCount = lv >= 15 ? 3 : (lv >= 10 ? 2 : (lv >= 5 ? 1 : 0));
    if(lineCount<=0) return addLog('해당 룬은 +5 이상부터 리롤할 보너스 옵션이 생깁니다.','attack-monster');
    let c=180 + lv*110, s=95 + lv*80, g=36 + lv*34;
    if((game.currencies.underCopper||0)<c||(game.currencies.underSilver||0)<s||(game.currencies.underGold||0)<g) return addLog(`리롤 재화 부족 (구리${c}/은${s}/금${g})`,'attack-monster');
    game.currencies.underCopper-=c; game.currencies.underSilver-=s; game.currencies.underGold-=g;
    st.bonusLinesByNo[no] = Array.from({length:lineCount}, ()=>rollUnderworldRuneBonusLine());
    let txt = st.bonusLinesByNo[no].map(r=>`${getStatName(r.stat)} +${formatValue(r.stat,r.val)}`).join(' / ');
    addLog(`🎲 룬 옵션 리롤: 룬${no} 보너스 ${lineCount}줄 재설정 → ${txt}`,'season-up');
    updateStaticUI();
}
