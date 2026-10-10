// Phase-2 extracted UI/tab/render helper block.
let lastHeavyUiRefreshAt = 0;
let lastPassiveTreeDrawAt = 0;
// 전장 캔버스 렌더 주기를 제한해 고주사율 모니터에서의 과도한 재계산/렉을 완화한다.
// (idle ARPG 특성상 30fps 부근이면 충분히 부드럽고, 메인 스레드 여유를 확보해 끊김을 줄인다.)
let lastBattlefieldRenderAt = 0;
let lastPassiveTreeSignature = '';
// 패시브 도달/가시 노드 재계산은 패시브 상태가 바뀔 때만 필요하다. 실제 변경 시에는
// 할당/환불/장착/로드 등 전용 호출부가 직접 재계산하므로, 매 UI 갱신마다 도는
// 방어적 재계산은 상태 시그니처가 바뀐 경우에만 수행해 탭 전환 비용을 줄인다.
let lastReachableSignature = '';
let passiveTreeSearch = '';
let passiveTreeFilter = 'all';
let cachedTooltipStats = null;
let battleSkillVisualCache = { key: '', value: null };
let gemTooltipCache = null;
let activeInfoTooltipToken = null;
let tooltipPositionFrame = null;
let pendingTooltipPositions = new Map();
let tooltipSizeCache = new WeakMap();
// Boss groups choose their initial state from entry readiness; explicit user choices take precedence.
let mapZoneGroupCollapseState = { availableBosses: false, rootBosses: null, rivalBosses: null, pinnacleBosses: null, finalGate: null };
let pendingMapPrimaryTabReveals = new Set();

let mobilePipCanvas = null;
var lod = 1; // fallback for any legacy FX paths
let mobilePipCtx = null;
let mobilePipRefreshHandle = null;
let mobilePipRefreshErrorReported = false;
let gameLoopFrameHandle = null;
let playerHpDamageGhostPct = null;
let playerHpDamageGhostLastPct = null;
let playerHpDamageGhostLastAt = 0;
let playerHpDamageGhostHoldUntil = 0;
let enemyHpDamageGhostStates = new Map();
const PLAYER_HP_DAMAGE_GHOST_HOLD_MS = 260;
const PLAYER_HP_DAMAGE_GHOST_DECAY_PCT_PER_SEC = 34;
const ENEMY_HP_DAMAGE_GHOST_SNAP_MS = 680;

function isMapZoneGroupCollapsed(groupKey, defaultCollapsed = false) {
    return mapZoneGroupCollapseState[groupKey] ?? defaultCollapsed;
}

function toggleMapZoneGroup(groupKey, collapsed = isMapZoneGroupCollapsed(groupKey)) {
    if (!Object.prototype.hasOwnProperty.call(mapZoneGroupCollapseState, groupKey)) return;
    mapZoneGroupCollapseState[groupKey] = !collapsed;
    updateStaticUI();
}

function buildMapZoneGroupHtml(groupKey, title, cards, defaultCollapsed = false) {
    if (!cards.length) return '';
    let collapsed = isMapZoneGroupCollapsed(groupKey, defaultCollapsed);
    let icon = collapsed ? '▶' : '▼';
    let countText = `${cards.length}개`;
    let gridHtml = collapsed ? '' : `<div class="map-zone-grid map-zone-grid--${groupKey}">${cards.map(card => card.html).join('')}</div>`;
    return `<section class="map-zone-group ${collapsed ? 'collapsed' : ''}" data-map-zone-group="${groupKey}">
        <button type="button" class="map-zone-group-header" onclick="toggleMapZoneGroup('${groupKey}',this.getAttribute('aria-expanded')==='false')" aria-expanded="${collapsed ? 'false' : 'true'}">
            <span class="map-zone-group-title"><span class="map-zone-group-icon">${icon}</span>${title}</span>
            <span class="map-zone-group-count">${countText}</span>
        </button>
        ${gridHtml}
    </section>`;
}

function formatApproximateMapPower(value) {
    return Math.max(0, Math.round(Number(value) || 0)).toLocaleString('ko-KR', {
        notation: 'compact', maximumSignificantDigits: 2
    });
}

function getMapPowerReadinessModel(estimate) {
    if (typeof getMapPowerReadiness !== 'function') return null;
    if (!cachedTooltipStats && typeof getPlayerStats === 'function') cachedTooltipStats = getPlayerStats();
    return cachedTooltipStats ? getMapPowerReadiness(cachedTooltipStats, estimate) : null;
}

/** What the 권장 전투력 tooltip reads (data-* attributes), whether the hero meets it and the hidden environment line; null without
 * an estimate. The chaos tiles (js/map-list-ui.js) carry the same attributes on their own button. */
function getMapPowerEstimateParts(zone) {
    let estimate = typeof estimateMapZonePowerRequirements === 'function' ? estimateMapZonePowerRequirements(zone) : null;
    let model = estimate ? getMapPowerReadinessModel(estimate) : null;
    if (!model) return null;
    let bossElements = getChaosBossElements(zone) ? getChaosBossElements(zone).join(',') : '';
    let attrs = `data-info-tooltip-anchor="1" ${levelProgressionUi.rewardData(zone)} data-player-dps="${Math.round(model.playerDps)}" data-recommended-dps="${Math.round(model.recommendedDps)}" data-player-ehp="${Math.round(model.playerEhp)}" data-recommended-ehp="${Math.round(model.recommendedEhp)}" data-limiting-element="${model.element}" data-boss-elements="${bossElements}"`;
    return { met: model.meetsRecommendation, attrs, environment: buildMapEnvironmentEstimateHtml(model.environment) };
}

/** The 권장 전투력 chip and, unless options.hideReward (a list that says it once), the 보상 감소 chip. */
function buildMapPowerEstimateHtml(zone, options = {}) {
    let parts = getMapPowerEstimateParts(zone);
    if (!parts) return '';
    let label = `권장 전투력 ${parts.met ? '달성' : '미달성'}`;
    let reward = options.hideReward ? '' : levelProgressionUi.rewardHint(zone);
    return `<span class="map-zone-status map-power-estimate" tabindex="0" aria-label="${label}" ${parts.attrs} onmouseenter="showMapPowerEstimateTooltip(event)" onmousemove="showMapPowerEstimateTooltip(event)" onfocus="showMapPowerEstimateTooltip(event)" ontouchstart="event.stopPropagation(); showMapPowerEstimateTooltip(event)" onclick="event.stopPropagation(); this.focus(); showMapPowerEstimateTooltip(event)" onblur="hideInfoTooltip()" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()"><span class="map-power-grade grade-${parts.met ? 'high' : 'low'}">${label}</span>${parts.environment}${reward ? `<span class="map-power-grade grade-low">${reward}</span>` : ''}</span>`;
}

function buildMapEnvironmentEstimateHtml(environment) {
    if (!environment) return '';
    return `<span hidden data-environment-loss="${environment.lossPct}" data-environment-regen="${environment.regenPct}"></span>`;
}

function buildMapEnvironmentTooltipHtml(target) {
    const environment = target.querySelector('[data-environment-loss]');
    if (!environment) return '';
    const loss = Number(environment.dataset.environmentLoss).toFixed(1);
    const regen = Number(environment.dataset.environmentRegen).toFixed(1);
    return `<div class="map-power-tip-row is-hazard"><span>환경 피해</span><b>초당 생명력 ${loss}%</b><em>재생 ${regen}%/초, 방어로 못 막음</em></div>`;
}

function getMapEstimateElementName(key) {
    return { phys: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' }[key] || '';
}
/** A chaos depth's boss has fixed elements (getChaosBossElements): name them so the player knows which resistances to raise. */
/** Total of one deep loop line (LOOP_DEEP_STATS) at its level, e.g. 9% for three levels of 3%. */
function formatLoopDeepValue(def, level) {
    const total = Math.max(0, Number(level) || 0) * def.per;
    return `${Number.isInteger(total) ? total : total.toFixed(1)}${def.unit}`;
}
function buildMapBossElementLine(keys) {
    const chips = String(keys || '').split(',').filter(getMapEstimateElementName)
        .map(key => `<i class="map-power-element is-${key}">${getMapEstimateElementName(key)}</i>`);
    return chips.length ? `<div class="map-power-tip-row"><span>보스 속성</span><b>${chips.join('')}</b><em></em></div>` : '';
}

/** One compared row of the 권장 전투력 tooltip: mine / recommended, green when met, red when short. */
function buildMapPowerCompareRow(label, mine, recommended) {
    const ratio = Number(recommended) > 0 ? Number(mine) / Number(recommended) : 1;
    return `<div class="map-power-tip-row ${ratio >= 1 ? 'is-met' : 'is-short'}"><span>${label}</span><b>${formatApproximateMapPower(mine)}</b><em>권장 ${formatApproximateMapPower(recommended)}, ${Math.round(ratio * 100)}%</em></div>`;
}

/** 보상 줄: 지역 레벨과 경험치 · 드랍 배율, 100% 미만이면 붉게(levelProgressionUi.rewardData의 data 속성). */
function buildMapRewardRow(data) {
    const xp = Number(data.rewardXp), loot = Number(data.rewardLoot);
    return `<div class="map-power-tip-row ${xp < 100 || loot < 100 ? 'is-short' : 'is-met'}"><span>보상</span><b>Lv.${escapeHTML(data.areaLevel)}</b><em>경험치 ${xp}%, 드랍 ${loot}%</em></div>`;
}

function showMapPowerEstimateTooltip(event) {
    let target = event.currentTarget;
    let rect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    let x = Number.isFinite(event.clientX) && event.clientX > 0 ? event.clientX : (rect ? rect.left + rect.width / 2 : 0);
    let y = Number.isFinite(event.clientY) && event.clientY > 0 ? event.clientY : (rect ? rect.bottom : 0);
    let data = target ? target.dataset : {};
    let elementLabel = getMapEstimateElementName(data.limitingElement) || '취약 속성';
    // 줄마다 항목 · 내 값 · 권장(비율) 세 칸, 달성은 초록 · 미달은 빨강(2026-10-06 사용자 요청 — 한 색의 긴 문장이라 읽기 힘들었다).
    let html = `<div class="tooltip-title">권장 전투력</div><div class="map-power-tip">
        ${buildMapPowerCompareRow('공격 DPS', data.playerDps, data.recommendedDps)}
        ${buildMapPowerCompareRow('생존 EHP', data.playerEhp, data.recommendedEhp)}
        ${buildMapBossElementLine(data.bossElements)}${buildMapEnvironmentTooltipHtml(target)}
        ${buildMapRewardRow(data)}</div>
        <div class="tooltip-line tooltip-muted">${elementLabel} 피해 기준, 지속 피해, 회복 제외</div>`;
    showInfoTooltipHtml(x, y, html, '#6ba7d8');
}

function getRecommendedHuntingZone(zones) {
    let huntingZones = (Array.isArray(zones) ? zones : []).filter(zone => zone && zone.type !== 'abyss');
    return huntingZones.length > 0 ? huntingZones[huntingZones.length - 1] : null;
}

function buildMapRouteSummaryHtml(currentZone, recommendedZone) {
    if (!recommendedZone) return '';
    let currentName = currentZone ? escapeHTML(currentZone.name) : '선택 없음';
    let recommendedName = escapeHTML(recommendedZone.name);
    let sameZone = currentZone && Number(currentZone.id) === Number(recommendedZone.id);
    let action = sameZone ? "switchTab('tab-battle')" : `changeZone(${Number(recommendedZone.id)})`;
    let actionLabel = sameZone ? '전투로 돌아가기' : '즉시 이동';
    return `<div class="map-route-copy"><span class="map-route-kicker">${sameZone ? '현재 위치' : '다음 진행 지역'}</span><strong>${recommendedName}</strong><small>현재, ${currentName}</small></div><button type="button" class="map-route-action" ${sameZone ? '' : 'data-exploration-departure'} onclick="${action}">${actionLabel}</button>`;
}

function getMapCardState(isCurrent, cleared, recommended) {
    if (isCurrent) return { label: '현재', className: 'current' };
    if (cleared) return { label: '완료', className: 'cleared' };
    if (recommended) return { label: '다음', className: 'recommended' };
    return { label: '도전', className: 'available' };
}

function buildMapCardActionsHtml(options) {
    let state = options.state;
    let rewardButton = options.isActRewardZone && options.rewardReady && getActRewardChoices(options.zoneId).some(choice => isActRewardChoiceAvailable(choice))
        ? `<button class="map-reward-btn" onclick="event.stopPropagation(); openActReward(${options.zoneId})">보상 받기</button>` : '';
    let stateLabel = options.isActRewardZone && options.rewardClaimed ? `${state.label}, 보상 수령` : state.label;
    let stateBadge = rewardButton ? '' : `<span class="map-state-badge ${state.className}${options.rewardClaimed ? ' reward-claimed' : ''}">${stateLabel}</span>`;
    let enterButton = `<button type="button" class="map-enter-btn" ${options.enterAction.startsWith('changeZone(') ? 'data-exploration-departure' : ''} onclick="event.stopPropagation(); ${options.enterAction}">${options.enterLabel}</button>`;
    return stateBadge + rewardButton + enterButton;
}

function buildTrialMapItemHtml(trial) {
    if (trial.bloomTrial) {
        let isCurrent = game.currentZoneId === trial.id;
        let chaosKeys = Math.floor(game.currencies.chaosKey || 0);
        let coreKeys = Math.floor(game.currencies.coreKey || 0);
        let ready = canEnterTalentBloomTrial();
        let hint = '조건 미충족';
        if (ready) hint = '개화 도전';
        else if (chaosKeys < 1 || coreKeys < 1) hint = `카오스 ${chaosKeys}/1, 코어 ${coreKeys}/1`;
        else if (!isWoodsmanEchoUnlocked()) hint = '나무꾼의 잔상 필요';
        else if (!game.ascendClass) hint = '직업(전직) 필요';
        return `<div class="map-item encounter-card ${isCurrent ? 'current' : 'trial'}"><div class="encounter-heading"><strong>${trial.name}</strong><span class="encounter-state">재능 개화</span></div><p>${trial.trialDesc}</p>${buildMapPowerEstimateHtml(trial)}<div class="encounter-footer"><span>${hint}</span><button ${ready ? 'data-exploration-departure onclick="enterTalentBloomTrial()"' : 'disabled'}>개화 도전</button></div></div>`;
    }
    let isCurrent = game.currentZoneId === trial.id;
    let isCompleted = game.completedTrials.includes(trial.id);
    let needsTicket = isCompleted && (trial.id === 'trial_3' || trial.id === 'trial_4');
    let hasTicket = (game.currencies.trialKey3 || 0) > 0;
    let cls = `${isCompleted ? 'trial-completed' : 'trial-pending'}${isCurrent ? ' current' : ''}`;
    let action = (isCompleted && needsTicket) ? `enterTrialWithTicket('${trial.id}')` : `changeZone('${trial.id}')`;
    let repeatGemChance = typeof getTrialSkillGemRewardChance === 'function' ? getTrialSkillGemRewardChance(trial, false) : 0;
    let repeatReward = repeatGemChance >= 1 ? '젬 확정' : `젬 ${Math.round(repeatGemChance * 100)}%`;
    let status = isCompleted ? (needsTicket ? `재도전권 ${game.currencies.trialKey3 || 0}개, 입장 시 1개` : '무료 재도전') : '첫 도전, 입장권 불필요';
    let state = isCompleted ? '완료' : '미완료';
    return `<div class="map-item encounter-card ${cls}" data-trial-id="${trial.id}"><div class="encounter-heading"><strong>${trial.name}</strong><span class="encounter-state trial-state-badge">${state}</span></div>
        <p>${trial.trialDesc || '수호자와 함정을 돌파하세요'}</p>${buildMapPowerEstimateHtml(trial)}
        <div class="encounter-reward"><small>${isCompleted ? '재도전 보상' : '첫 격파 보상'}</small><span>${isCompleted ? repeatReward : '전직 포인트'}</span></div>
        <div class="encounter-footer"><span>${status}</span><button data-exploration-departure ${(isCompleted && needsTicket && !hasTicket) ? 'disabled' : `onclick="${action}"`}>${isCurrent ? '다시 시작' : isCompleted ? '재도전' : '도전'}</button></div></div>`;
}

function renderTrialMapList(trials) {
    const panel = document.getElementById('ui-trial-list');
    const html = trials.map(buildTrialMapItemHtml).join('');
    // An unchanged destination must stay connected during departure confirmation.
    // Changed/reordered destinations are replaced so the stale-click guard still applies.
    if (panel.__lastHtml !== html) panel.innerHTML = panel.__lastHtml = html;
}

safeExposeGlobals({ showMapPowerEstimateTooltip });

function getDefaultUiPlayerStats() {
    return {
        maxHp: 1, energyShield: 0, baseDmg: 0, directDps: 0, dps: 0, totalDps: 0, summonDps: 0,
        aspd: 1, crit: 0, critDmg: 150, move: 100, moveSpeed: 100, dr: 0, armor: 0, evasion: 0,
        resF: 0, rawResF: 0, resC: 0, rawResC: 0, resL: 0, rawResL: 0, resChaos: 0, rawResChaos: 0, regen: 0, regenSuppress: 0, leech: 0, ds: 0,
        igniteChance: 0, chillChance: 0, freezeChance: 0, poisonChance: 0, bleedChance: 0,
        blockChance: 0, blockChanceMax: 50, deflectChance: 0, deflectDamageReduce: 0,
        suppCap: 0, summonCap: 1, mystique: 0, devotion: 0, cycle: 0,
        passiveFanaticismStacks: 0, passiveRevelationCombatDamageMorePct: 0,
        passiveRevelationGuardTakenLessPct: 0, passiveRevelationLifeBonusPct: 0,
        runeResonancePower: 0, uniqueResonanceFloor: 0, inquisitorResonanceBonus: 0, breakdowns: {}
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

function getUiPlayerStats(fallback = {}, includeBreakdowns) {
    let provider = getUiGlobalFunction('getPlayerStats');
    if (provider) return normalizeUiPlayerStats(callUiProvider('getPlayerStats', provider, [includeBreakdowns]), fallback);
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

function runUiGlobalFunction(name, args = []) {
    let provider = getUiGlobalFunction(name);
    return provider ? callUiProvider(name, provider, args) : undefined;
}

function runUiStartEncounter() {
    return runUiGlobalFunction('startEncounterRun');
}

function runUiCoreLoop(nowMs) {
    return runUiGlobalFunction('coreLoop', [nowMs]);
}

function getUiPlayerHudIdentity() {
    let identityId = game.selectedClassId || game.selectedHeroId;
    let heroDef = typeof getHeroSelectionDef === 'function' ? getHeroSelectionDef(identityId) : null;
    let classDef = game.ascendClass && typeof CLASS_TEMPLATES !== 'undefined'
        ? CLASS_TEMPLATES[game.ascendClass]
        : null;
    return {
        name: heroDef ? heroDef.label : '플레이어',
        className: classDef ? classDef.name : '미전직'
    };
}

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
    if (actExplorationUi.departurePending()) return true;
    let overlayPause = !!game?.settings?.pauseGameOnOverlay;
    // 안내 카드뿐 아니라 따라 하기의 대상 화면이 열려 있는 동안도(검토 7차) — isTutorialPausingCombat이 함께 본다.
    let tutorialOpen = isTutorialPausingCombat();
    let optionalOverlayOpen = typeof isPauseSettingOverlayOpen === 'function' && isPauseSettingOverlayOpen();
    return !!(overlayPause && (tutorialOpen || optionalOverlayOpen));
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

function recordBackgroundCombatEntry(nowMs) {
    if (backgroundCombatRuntime.processing || backgroundCombatRuntime.failed) return;
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    backgroundCombatRuntime.hiddenAtMs = now;
    backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
    backgroundCombatRuntime.snapshot = isBackgroundCombatEligible(game) ? cloneBackgroundCombatState(game) : null;
}

function recordOfflineCombatEntry(nowMs) {
    let savedAt = Math.max(0, Math.floor(Number(game && game.saveMeta && game.saveMeta.lastModifiedAt) || 0));
    let now = Number.isFinite(nowMs) ? nowMs : Date.now();
    if (backgroundCombatRuntime.offlineConsumed || savedAt <= 0 || now <= savedAt) return false;
    backgroundCombatRuntime.offlineConsumed = true;
    backgroundCombatRuntime.hiddenAtMs = savedAt;
    backgroundCombatRuntime.signature = getBackgroundCombatSignature(game);
    backgroundCombatRuntime.snapshot = isOfflineCombatEligible(game) ? cloneBackgroundCombatState(game) : null;
    return !!backgroundCombatRuntime.snapshot;
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
    let beforeStash = Array.isArray(beforeState && beforeState.offlineProgress && beforeState.offlineProgress.stash) ? beforeState.offlineProgress.stash.length : 0;
    let afterStash = Array.isArray(afterState && afterState.offlineProgress && afterState.offlineProgress.stash) ? afterState.offlineProgress.stash.length : 0;
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
        stashItems: Math.max(0, afterStash - beforeStash),
        stashTotal: afterStash,
        overflowSalvaged: Math.max(0, Math.floor(Number(overflowSalvaged) || 0)),
        masteryGains: getBackgroundMasteryGains(beforeState, afterState),
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
    if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
    if (minutes > 0) return seconds > 0 ? `${minutes}분 ${seconds}초` : `${minutes}분`;
    return `${seconds}초`;
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
    button.textContent = finish ? '계산한 보상 저장 중…' : backgroundCombatRuntime.accelerationTier >= 4
        ? '16배 가속 적용됨' : `${2 ** (backgroundCombatRuntime.accelerationTier + 1)}배 가속, 남은 시간 ½`;
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
    if (percent) percent.textContent = `계산 진행 ${pct}%${backgroundProgressPhaseText(phase)}`;
    if (progressBar) progressBar.setAttribute('aria-valuenow', String(pct));
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (duration) duration.textContent = `자리 비움 ${formatBackgroundDuration(actualElapsedMs)}, 계산 ${formatBackgroundDuration(Math.max(0, doneMs - skippedMs))}`;
    if (guide) {
        let limits = getBackgroundProgressResultLimits(game);
        guide.textContent = `진행 한도 ${limits.recognitionHours}시간, 효율 ${Math.round(limits.efficiencyRate * 100)}%`;
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
    return `빠른 계산: 실제 전투 ${formatBackgroundDuration(result.realMs)}의 속도로 나머지 ${formatBackgroundDuration(result.projectedMs)}도 계산했습니다.`;
}

function formatBackgroundSkippedReward(skippedMs) {
    return skippedMs > 0 ? `포기한 전투 시간 ${formatBackgroundDuration(skippedMs)}, 해당 시간 보상 미지급` : '';
}

/** 빠른 계산을 못 탄 긴 실제 전투(data/offline-progress.js OFFLINE_PROJECTION realHoldMs, realCapMs): [알림 색, 한 줄]. */
function formatBackgroundRealLimits(result) {
    const minutes = ms => Math.round(ms / 60000);
    return [
        ['info', result.heldZone ? `실제 전투가 ${minutes(OFFLINE_PROJECTION.realHoldMs)}분을 넘어 그 뒤로는 지금 지역을 반복했습니다.` : ''],
        ['bad', result.cutMs > 0 ? `빠른 계산을 못 하는 곳이라 실제 전투 ${minutes(OFFLINE_PROJECTION.realCapMs)}분까지만 계산했고, 남은 ${formatBackgroundDuration(result.cutMs)}의 보상은 없습니다.` : '']
    ];
}

/** 방치 결과 창(2026-10-09 사용자 "간단하면서도 필요한 정보만 딱 딱 강조해서 색상 배분한 깔끔한 ux"): 시간 한 줄, 큰 숫자 넷,
 * 장비, 재화, 성장, 알림 순. 색은 뜻마다 하나다: 경험치와 숙련은 초록, 재화 수는 금빛, 장비는 희귀도 색, 잃은 것은 빨강,
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
    const body = renderBackgroundStoryLine() + renderBackgroundResultTiles(summary) + renderBackgroundResultLoot(summary) + renderBackgroundResultAtlas(summary.atlas)
        + renderBackgroundResultCurrencies(summary.currencies) + renderBackgroundResultGrowth(summary) + renderBackgroundResultNotes(result, summary, limits);
    const close = "hideItemTooltip();document.getElementById('background-combat-result-overlay').remove()";
    overlay.innerHTML = `<div class="background-combat-result-card" role="dialog" aria-modal="true" aria-labelledby="background-result-title">${renderBackgroundResultHeader(result, limits)}`
        + `<div class="background-result-body">${body}</div><footer><button type="button" onclick="${close};switchTab('tab-items', {keepWindowOpen:true})">장비 확인</button>`
        + `<button type="button" class="background-result-continue" onclick="${close}">계속하기</button></footer></div>`;
    document.body.appendChild(overlay);
}

/** 맨 위: 비운 시간 → 실제로 싸운 시간(금빛). 그 아래 한 줄은 왜 줄었는지(효율과 한도)라 흐리게 두지 않는다. */
function renderBackgroundResultHeader(result, limits) {
    const away = formatBackgroundResultTime(result.actualElapsedMs);
    const fought = formatBackgroundResultTime(result.effectiveProgressMs);
    return `<header><h2 id="background-result-title">방치 결과</h2><p class="background-result-times"><span>자리 비움 <strong>${away}</strong></span>`
        + `<span class="background-result-arrow" aria-hidden="true">→</span><span class="fought">전투 진행 <strong>${fought}</strong></span></p>`
        + `<p class="background-result-formula">효율 ${Math.round(limits.efficiencyRate * 100)}%, 한도 ${limits.recognitionHours}시간. 기록 창에서 올릴 수 있습니다.</p></header>`;
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
        { label: '처치', value: formatNumberKR(summary.kills) },
        { label: '경험치', value: `+${formatNumberKR(summary.exp)}`, tone: 'exp', note: lost > 0 ? `-${formatNumberKR(lost)} 잃음` : '' },
        { label: '장비', value: `+${formatNumberKR(summary.items)}`, color: best ? getRarityColor(best) : '' },
        { label: '사망', value: String(deaths), tone: deaths > 0 ? 'bad' : 'quiet' }
    ];
    return `<div class="background-result-tiles">${tiles.map(renderBackgroundResultTile).join('')}</div>`;
}

function renderBackgroundResultTile(tile) {
    const style = tile.color ? ` style="--tile-tone:${tile.color}"` : '';
    const size = tile.value.length > 9 ? ' long' : '';
    return `<div class="background-result-tile ${tile.tone || ''}${size}"${style}><span>${tile.label}</span><strong>${tile.value}</strong>${tile.note ? `<small>${tile.note}</small>` : ''}</div>`;
}

/** 장비: 희귀도별 개수(높은 등급부터 그 색으로), 방치 보관함과 자동해체는 흐린 칩, 그 아래 주요 장비 카드(고유는 늘 여기 있다). */
function renderBackgroundResultLoot(summary) {
    const gains = summary.rarityGains || {};
    const chips = ['unique', 'rare', 'magic', 'normal'].filter(rarity => gains[rarity] > 0)
        .map(rarity => `<span class="background-result-chip" style="--chip-tone:${getRarityColor(rarity)}">${ITEM_RARITY_LABELS[rarity]} <b>${gains[rarity]}</b></span>`);
    const stash = Math.max(0, Number(summary.stashItems) || 0), salvaged = Math.max(0, Number(summary.overflowSalvaged) || 0);
    if (stash > 0) chips.push(`<span class="background-result-chip quiet" title="방치 보관함에 모두 ${Math.max(0, Number(summary.stashTotal) || 0)}개">방치 보관함 <b>+${stash}</b></span>`);
    if (salvaged > 0) chips.push(`<span class="background-result-chip quiet" title="가방이 차서 해체했습니다. 해체 보상은 재화에 들어 있습니다.">자동해체 <b>${salvaged}</b></span>`);
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
    return `<section class="background-result-section"><h3>아틀라스</h3><div class="background-result-chips">${chips.join('')}</div></section>`;
}

/** 재화 칩: 바닥에서 빛기둥을 세우는 재화(큰 발견 이상, js/loot.js lootMoments)는 금테로 맨 앞, 나머지는 지갑 순서. */
function renderBackgroundResultCurrencies(currencies) {
    const rows = (Array.isArray(currencies) ? currencies : []).filter(entry => entry && entry.gain > 0);
    if (!rows.length) return '';
    const major = entry => lootMoments.rank(lootMoments.ofCurrency(entry.key)) >= 2;
    const chips = rows.filter(major).concat(rows.filter(entry => !major(entry))).map(entry => `<span class="background-result-chip currency${major(entry) ? ' major' : ''}">`
        + `${backgroundResultCurrencyIcon(entry.key)}${escapeHTML(entry.name)} <b>+${formatNumberKR(entry.gain)}</b></span>`);
    return `<section class="background-result-section"><h3>재화</h3><div class="background-result-chips">${chips.join('')}</div></section>`;
}

/** 재화 그림(js/utils.js pixelIconPath). 지갑 창의 getCurrencyIconHtml은 performUpdateStaticUI 안에 있어 여기서 못 부른다. */
function backgroundResultCurrencyIcon(key) {
    const icon = pixelIconPath(ORB_DB[key] && ORB_DB[key].icon);
    return icon ? `<img class="background-result-icon" src="${icon}" alt="" aria-hidden="true">` : '';
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
        ['bad', summary.deaths > 0 ? '쓰러진 탐험에서 모은 임시 전리품은 사라집니다.' : ''],
        ['warn', backgroundNoExpReason(summary)],
        ['warn', result.stopped ? '사냥이 멈추거나 선택 창이 열려 여기까지만 진행했습니다.' : ''],
        ['warn', result.capped ? `방치 한도 ${limits.recognitionHours}시간을 다 채웠습니다.` : ''],
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
    return `레벨 차이로 이 지역 경험치가 ${pct > 0 ? `${pct}%로 줄었습니다` : '거의 없습니다'}.`;
}

/** 자리를 비운 동안 지나온 이야기(한 장씩 띄우지 않고 기록으로): "지난 이야기 2편이 기록에 실렸습니다" + 기록 열기. */
function renderBackgroundStoryLine() {
    const scenes = typeof storyJournalUi === 'object' ? storyJournalUi.foldPassedScenes() : [];
    if (!scenes.length) return '';
    return `<p class="background-result-story"><span>지난 이야기 ${scenes.length}편이 기록에 실렸습니다.</span>
        <button type="button" onclick="hideItemTooltip();document.getElementById('background-combat-result-overlay').remove();switchTab('tab-journal')">기록에서 읽기</button></p>`;
}

function shouldApplyBackgroundCombatResult(signature) {
    if (getBackgroundCombatSignature(game) !== signature) return false;
    return !(game.pendingLoopDecision || game.pendingLoopReady || game.inTicketBossFight);
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
    delete candidate.offlineHuntMode;
    game = candidate;
    backgroundCombatRuntime.processing = false;
    try {
        if (!persistLocalSave({allowRecoveryWrite: getLocalSaveStatus().status === 'write-failed'})) throw new Error('방치 보상 저장에 실패했습니다. 이전 진행은 유지됩니다.');
        restoreCombatRuntime(result.runtime);
        backgroundCombatRuntime.snapshot = null;
        backgroundCombatRuntime.signature = '';
        backgroundCombatRuntime.hiddenAtMs = 0;
    } catch (error) {
        game = expectedGame;
        throw error;
    }
}

async function startBackgroundCombatReturn(nowMs) {
    if (backgroundCombatRuntime.processing || backgroundCombatRuntime.appInactive) return false;
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
            getControl: () => ({tier: backgroundCombatRuntime.accelerationTier, finish: backgroundCombatRuntime.finishRequested}),
            onProgress: (done, total, skipped, phase) => updateBackgroundProgressOverlay(done, total, actualElapsedMs, skipped, phase)
        });
        if (!shouldApplyBackgroundCombatResult(backgroundCombatRuntime.signature)) throw new Error('정산 중 사냥 상태가 변경되었습니다.');
        let summary = getBackgroundRewardSummary(snapshot, result.game, result.metrics, result.overflowSalvaged);
        commitBackgroundCombat(result, original);
        committed = true;
        updateBackgroundProgressOverlay(result.processedMs + result.skippedMs, result.processedMs + result.skippedMs, actualElapsedMs, result.skippedMs);
        document.getElementById('background-combat-progress-percent').textContent = '정산 완료';
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
    overlay.innerHTML = `<div class="background-combat-progress-card" role="alert"><strong>방치 정산을 완료하지 못했습니다</strong><p>${escapeHTML(error.message)}</p><p>이전 저장과 방치 시간은 보존됩니다. 다시 계산하거나 새로고침해 주세요.</p><button type="button" onclick="startBackgroundCombatReturn(Date.now())">다시 계산</button></div>`;
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

function getUiGemPresentation(name, isSupport, stats) {
    let provider = getUiGlobalFunction('getGemPresentation');
    if (provider) return callUiProvider('getGemPresentation', provider, [name, isSupport, stats]) || {};
    let db = isSupport ? (SUPPORT_GEM_DB[name] || {}) : (SKILL_DB[name] || {});
    let store = isSupport ? (game.supportGemData || {}) : (game.gemData || {});
    let level = Math.max(1, Math.floor(((store[name] || {}).level) || 1));
    if (isSupport) {
        return { baseLevel: level, totalLevel: level, value: Number(db.baseVal || 0), desc: db.desc || '', statName: db.name || name, statId: db.stat || null, activeTier: 1 };
    }
    return { baseLevel: db.isGem || db.levelable ? level : 0, totalLevel: db.isGem || db.levelable ? level : 0, finalLevel: db.isGem || db.levelable ? level : 0, desc: db.desc || '', statName: name, skill: db, tags: getSkillTagList(db) };
}

function startBattleAssetLoadNow() {
    if (isStartupOverlayOpen() && !isLoadingOverlayOpen()) return Promise.resolve(false);
    window.__battleAssetAutoloadEnabled = true;
    return initBattleAssets();
}


async function ensureBattleAssetsLoadedBeforeEntry() {
    if (battleAssets.ready) return true;
    advanceLoadingOverlay({
        title: '전장을 준비하는 중...',
        detail: '첫 전투에 필요한 그림을 불러오고 있습니다.',
        caption: '전투 그림 불러오기',
        progress: 56
    });
    let result = false;
    let timeout;
    try {
        // Bound the entry screen's wait, not the shared download lifetime. Slow login
        // preloading must not finalize an incomplete atlas or discard queued images.
        result = await Promise.race([startBattleAssetLoadNow(), new Promise(resolve => {
            timeout = setTimeout(() => {
                console.warn('battle asset entry wait timed out; images continue loading');
                resolve(false);
            }, 30000);
        })]);
    } catch (error) {
        console.warn('battle asset preload failed:', error);
    } finally {
        clearTimeout(timeout);
    }
    if (!result) {
        advanceLoadingOverlay({
            detail: '일부 그림을 불러오지 못해 기본 그림으로 준비합니다.',
            caption: '기본 그림 사용',
            progress: 92
        });
    } else {
        advanceLoadingOverlay({
            detail: '전장 준비를 마쳤습니다.',
            caption: '준비 완료',
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
        host.className = 'mobile-battle-dock';
        host.style.display = 'none';
        host.setAttribute('role', 'button');
        host.setAttribute('tabindex', '0');
        host.setAttribute('aria-label', '전투 화면으로 이동');
        host.addEventListener('click', () => switchTab('tab-battle'));
        host.addEventListener('keydown', event => {
            if (!['Enter', ' '].includes(event.key)) return;
            event.preventDefault();
            switchTab('tab-battle');
        });
        let c = document.createElement('canvas');
        c.width = 296; c.height = 168;
        host.appendChild(c);
        let label = document.createElement('span');
        label.className = 'mobile-battle-dock-label';
        label.textContent = '전투로 돌아가기';
        host.appendChild(label);
        let rightPane = document.getElementById('right-pane');
        let firstTab = rightPane && rightPane.querySelector('.tab-content');
        if (rightPane && firstTab) rightPane.insertBefore(host, firstTab);
        else document.body.appendChild(host);
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
    let isMobile = window.matchMedia ? uiDisplay.matches('(max-width: 1080px)') : window.innerWidth <= 1080;
    let activeBattle = (document.getElementById('tab-battle') || {}).classList.contains('active');
    let blocked = isStartupOverlayOpen() || isLoadingOverlayOpen();
    host.style.display = (isMobile && !activeBattle && !blocked && game.settings && game.settings.showMobileBattlePip !== false) ? 'grid' : 'none';
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

function refreshMobileBattlePip() {
    renderBattlefield(true);
    renderMobileBattlePipFrame();
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
function isBattlePresentationSuspended() {
    return document.hidden || backgroundCombatRuntime.appInactive || backgroundCombatRuntime.processing
        || isStartupOverlayOpen() || isLoadingOverlayOpen();
}
function runMobilePipRefreshTick() {
    mobilePipRefreshHandle = null;
    let nextDelay = MOBILE_PIP_BASE_INTERVAL_MS;
    try {
        if (isBattlePresentationSuspended()) {
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
    mobilePipRefreshHandle = null;
    if (isStartupOverlayOpen()) return;
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
        '.tutorial-overlay.active:not(#tutorial-overlay):not(#death-overlay)',
        '#act-exploration-dialog[open]',
        '#beehive-choice-overlay',
        // 선택 창 다섯(코어, 주얼 보관함과 소켓, 혼돈 주입, 조합창 재료, 홀씨 모드). 없어진 예전 주얼 창들의 자리도 이것이 맡는다.
        '.selection-overlay',
        '#mobile-craft-currency-overlay',
        '#craft-item-picker-overlay'
    ];
    return modalSelectors.some(selector => isOverlayElementOpen(selector));
}

function setupBattlefieldMovementInteraction() {
    let canvas = document.getElementById('battlefield-canvas');
    if (!canvas || canvas.dataset.movementInteractionBound === 'true') return;
    canvas.dataset.movementInteractionBound = 'true';
    canvas.addEventListener('click', event => {
        event.preventDefault();
        commandBattlefieldMove(canvas, event);
    });
}

/** 탐험 중 전장을 누르면 그 칸으로 걸어간다(미니맵 클릭과 같은 이동 명령 · 자동 이동은 그대로). */
function commandBattlefieldMove(canvas, event) {
    let cell = actExplorationView.cellAt(getBattlefieldClientPoint(canvas, event.clientX, event.clientY));
    if (cell) actExplorationUi.commandMove(cell);
}

let mobileNavigationKeyBound = false;

function isMobilePrimaryNavigationEnabled() {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    if (document.body.classList.contains('desktop-windowed-ui')) return false;
    return uiDisplay.matches('(max-width: 1080px)');
}

function setMobileTabDrawerOpen(open) {
    const wasOpen = document.body.classList.contains('mobile-tab-drawer-open');
    let enabled = isMobilePrimaryNavigationEnabled();
    let nextOpen = enabled && !!open;
    let goalDrawer = document.getElementById('ui-goal-drawer');
    if (nextOpen && goalDrawer && goalDrawer.classList.contains('expanded') && typeof toggleGoalDrawer === 'function') {
        toggleGoalDrawer(false);
    }
    document.body.classList.toggle('mobile-tab-drawer-open', nextOpen);
    let more = document.getElementById('btn-mobile-nav-more');
    if (more) more.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
    let header = document.getElementById('tab-header-main');
    if (header && enabled) header.setAttribute('aria-hidden', nextOpen ? 'false' : 'true');
    syncMobileMenuFocus(header, more, wasOpen, nextOpen);
}

function syncMobileMenuFocus(header, more, wasOpen, nextOpen) {
    if (wasOpen === nextOpen || !header) return;
    if (nextOpen) {
        header.querySelector('.mobile-tab-drawer-head button')?.focus({ preventScroll: true });
        return;
    }
    if (header.contains(document.activeElement) || document.activeElement.id === 'mobile-tab-drawer-backdrop') {
        more?.focus({ preventScroll: true });
    }
}

function handleMobileMenuKey(event) {
    if (!document.body.classList.contains('mobile-tab-drawer-open') || !['Tab', 'Escape'].includes(event.key)) return;
    if (document.querySelector('dialog:modal')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === 'Escape') { setMobileTabDrawerOpen(false); return; }
    const header = document.getElementById('tab-header-main');
    const buttons = Array.from(header.querySelectorAll('button:not([disabled]),[data-mobile-tab-button]')).filter(button => button.getClientRects().length > 0);
    if (!buttons.length) return;
    const current = buttons.indexOf(document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
    buttons[next].focus();
}

function restoreMobileMenuFocus(focused) {
    if (!document.body.classList.contains('mobile-tab-drawer-open')) return;
    const header = document.getElementById('tab-header-main');
    if (!header.contains(focused)) return;
    const target = focused.getClientRects().length ? focused : header.querySelector('.mobile-tab-drawer-head button');
    target?.focus({ preventScroll: true });
}

function prepareMobileTabButtons(headers) {
    headers.forEach(header => header.querySelectorAll('.tab-btn:not(button)').forEach(button => {
        button.setAttribute('data-mobile-tab-button', '');
        button.setAttribute('role', 'button');
        button.tabIndex = 0;
    }));
}

function handleMobileTabActivation(event) {
    if (!document.body.classList.contains('mobile-primary-navigation')) return;
    if (!event.target.matches('[data-mobile-tab-button]') || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    event.target.click();
}

function toggleMobileTabDrawer() {
    setMobileTabDrawerOpen(!document.body.classList.contains('mobile-tab-drawer-open'));
}

function createMobileTabDrawerHead() {
    let head = document.createElement('div');
    head.className = 'mobile-tab-drawer-head';
    let title = document.createElement('strong');
    title.textContent = '전체 메뉴';
    let actions = document.createElement('span');
    actions.className = 'mobile-tab-drawer-actions';
    let close = document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.setAttribute('aria-label', '전체 메뉴 닫기');
    close.addEventListener('click', () => setMobileTabDrawerOpen(false));
    actions.append(close);
    head.append(title, actions);
    return head;
}

function createMobileMoreButton() {
    let button = document.createElement('button');
    button.id = 'btn-mobile-nav-more';
    button.type = 'button';
    button.className = 'mobile-nav-more';
    button.setAttribute('aria-controls', 'tab-header-main');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', '전체 메뉴 열기');
    button.innerHTML = '<span>전체</span><span class="noti-dot"></span>';
    button.addEventListener('click', toggleMobileTabDrawer);
    return button;
}

function ensureMobilePrimaryNavigation(topHeader, bottomHeader) {
    if (!topHeader || !bottomHeader) return null;
    document.body.classList.add('mobile-primary-navigation', 'has-bottom-tabs');
    topHeader.setAttribute('role', 'dialog');
    topHeader.setAttribute('aria-modal', 'true');
    topHeader.setAttribute('aria-label', '전체 메뉴');
    topHeader.setAttribute('aria-hidden', String(!document.body.classList.contains('mobile-tab-drawer-open')));
    bottomHeader.setAttribute('role', 'navigation');
    bottomHeader.setAttribute('aria-label', '빠른 탭 메뉴');
    let head = topHeader.querySelector(':scope > .mobile-tab-drawer-head');
    if (!head) topHeader.prepend(createMobileTabDrawerHead());
    let more = document.getElementById('btn-mobile-nav-more');
    if (!more) more = createMobileMoreButton();
    bottomHeader.appendChild(more);
    let backdrop = document.getElementById('mobile-tab-drawer-backdrop');
    if (!backdrop) {
        backdrop = document.createElement('button');
        backdrop.id = 'mobile-tab-drawer-backdrop';
        backdrop.type = 'button';
        backdrop.setAttribute('aria-label', '전체 메뉴 닫기');
        backdrop.addEventListener('click', () => setMobileTabDrawerOpen(false));
        document.body.appendChild(backdrop);
    }
    if (!mobileNavigationKeyBound) {
        mobileNavigationKeyBound = true;
        document.addEventListener('keydown', handleMobileMenuKey, true);
        document.addEventListener('keydown', handleMobileTabActivation, true);
    }
    prepareMobileTabButtons([topHeader, bottomHeader]);
    return more;
}

function teardownMobilePrimaryNavigation(topHeader, bottomHeader) {
    setMobileTabDrawerOpen(false);
    document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.removeAttribute('data-mobile-tab-button');
        button.removeAttribute('role');
        button.removeAttribute('tabindex');
    });
    document.body.classList.remove('mobile-primary-navigation', 'mobile-tab-drawer-open', 'has-bottom-tabs');
    if (topHeader && bottomHeader) {
        Array.from(bottomHeader.querySelectorAll(':scope > .tab-btn')).forEach(button => topHeader.appendChild(button));
    }
    if (topHeader) {
        topHeader.removeAttribute('role');
        topHeader.removeAttribute('aria-modal');
        topHeader.removeAttribute('aria-label');
        topHeader.removeAttribute('aria-hidden');
        topHeader.querySelector(':scope > .mobile-tab-drawer-head')?.remove();
        topHeader.querySelectorAll('.mobile-menu-group-title').forEach(title => title.remove());
    }
    if (bottomHeader) {
        bottomHeader.removeAttribute('role');
        bottomHeader.removeAttribute('aria-label');
        bottomHeader.style.removeProperty('display');
    }
    document.getElementById('btn-mobile-nav-more')?.remove();
    document.getElementById('mobile-tab-drawer-backdrop')?.remove();
    document.body.style.setProperty('--bottom-tab-height', '0px');
}

function syncMobilePrimaryNavigationState() {
    let more = document.getElementById('btn-mobile-nav-more');
    let topHeader = document.getElementById('tab-header-main');
    if (!more || !topHeader) return;
    document.querySelectorAll('[data-mobile-tab-button]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.classList.contains('active')));
    });
    let activeSecondary = !!topHeader.querySelector(':scope > .tab-btn.active');
    more.classList.toggle('active', activeSecondary);
    let hasNotice = Array.from(topHeader.querySelectorAll('.tab-btn .noti-dot'))
        .some(dot => dot.style.display !== 'none' && getComputedStyle(dot).display !== 'none');
    let dot = more.querySelector('.noti-dot');
    if (dot) dot.style.display = hasNotice ? 'block' : 'none';
}

function renderTabOrderSettings() {
    tabLayoutUi.render();
}

function renderMobileMenuGroups(header) {
    for (const group of getOrderedTabGroups()) {
        const buttons = group.tabs.map(id => document.getElementById('btn-' + id))
            .filter(button => button && button.parentElement === header && button.style.display !== 'none'
                && !button.hidden && button.dataset.mergedTabMember !== '1');
        let title = header.querySelector('[data-mobile-group="' + group.key + '"]');
        if (!title) {
            title = document.createElement('div');
            title.className = 'mobile-menu-group-title';
            title.dataset.mobileGroup = group.key;
            title.textContent = group.label;
        }
        title.hidden = buttons.length === 0;
        header.appendChild(title);
        buttons.forEach(button => header.appendChild(button));
    }
}
const TAB_DRAG_LONG_PRESS_MS = 180;
const TAB_DRAG_CANCEL_PX = 8;
let tabHeaderDragState = null;
let tabHeaderSuppressClickUntil = 0;
let lastTabHeaderUiSignature = '';
let lastActiveTabId = null;
const TAB_HEADER_NOTI_KEYS = ['char', 'season', 'items', 'skills', 'codex', 'map', 'traits', 'talent', 'journal', 'currency', 'fossil', 'ascend', 'loop', 'social', 'stump'];
const TAB_UNLOCK_BUTTON_KEYS = ['char', 'season', 'items', 'skills', 'codex', 'map', 'traits', 'talent', 'stump'];
const MERGED_TAB_GROUPS = Object.freeze({
    growth: { launcher: 'tab-char', title: '스킬트리', tabs: [{ id: 'tab-char', label: '스킬트리', detail: '스킬트리 노드에 포인트를 씁니다.' }, { id: 'tab-traits', label: '전직', detail: '전직과 키스톤을 선택합니다.' }] },
    records: { launcher: 'tab-journal', title: '기록', tabs: [{ id: 'tab-journal', gate: 'journal', label: '저널', detail: '진행 기록과 안내를 확인합니다.' }, { id: 'tab-codex', gate: 'codex', label: '도감', detail: '발견한 항목과 수집 현황을 확인합니다.' }, { id: 'tab-records', gate: 'journal', label: '기록', detail: '루프 소요 시간과 최고 기록을 확인합니다.' }] }
});

// 탭 2단 그룹핑: 상단 카테고리 바에서 그룹을 고르면 해당 그룹의 탭만 보인다.
// 넓은 화면(데스크톱)에서만 활성화되고, 좁은 화면에서는 기존 방식(전체 탭 + 스와이프)을 유지한다.
const TAB_GROUP_FIXED_TAB_IDS = ['tab-social', 'tab-settings'];
const TAB_GROUPS = [
    { key: 'character', label: '캐릭터', icon: '👤', tabs: ['tab-character'] },
    { key: 'growth', label: '성장', icon: '📈', tabs: ['tab-char', 'tab-traits', 'tab-talent', 'tab-unlocks', 'tab-season', 'tab-stump', 'tab-skills'] },
    { key: 'content', label: '콘텐츠', icon: '🗺️', tabs: ['tab-map', 'tab-codex', 'tab-journal', 'tab-records'] },
    { key: 'gear', label: '장비', icon: '⚔️', tabs: ['tab-items'] },
    { key: 'etc', label: '기타', icon: '⚙️', tabs: ['tab-social', 'tab-settings', 'tab-battle'] }
];
function getOrderedTabGroups() {
    game.settings = game.settings || {};
    let order = Array.isArray(tabLayoutUi.current().tabGroupOrder) ? tabLayoutUi.current().tabGroupOrder : [];
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
    tabLayoutUi.current().tabGroupOrder = moved.map(group => group.key);
    lastTabHeaderUiSignature = null;
    renderTabCategoryBar();
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
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
    tabLayoutUi.current().tabGroupOrder = moved.map(group => group.key);
    lastTabHeaderUiSignature = null;
    renderTabCategoryBar();
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
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
    return uiDisplay.matches('(min-width: 1081px)');
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
    if (!isTabGroupingActive()) {
        bar.style.display = 'none';
        syncMapCompleteActionQuickControl();
        return;
    }
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
    syncMapCompleteActionQuickControl();
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
    state.ghost.style.left = `${(clientX - offsetX) / uiDisplay.factor}px`;
    state.ghost.style.top = `${(clientY - offsetY) / uiDisplay.factor}px`;
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
    state.ghost.style.width = `${Math.max(1, rect.width / uiDisplay.factor)}px`;
    state.ghost.style.height = `${Math.max(1, rect.height / uiDisplay.factor)}px`;
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
    tabLayoutUi.current().tabPlacement = tabLayoutUi.current().tabPlacement || {};
    headers.forEach(header => {
        let placement = header.id === 'tab-header-bottom' ? 'bottom' : 'top';
        Array.from(header.querySelectorAll('.tab-btn')).forEach(btn => { tabLayoutUi.current().tabPlacement[btn.id] = placement; });
    });
    tabLayoutUi.current().tabOrder = getTabHeaderOrderSnapshot(headers);
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
    if (document.body && document.body.classList.contains('desktop-windowed-ui')) return;
    if (document.body && document.body.classList.contains('mobile-primary-navigation')) return;
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
    const focused = document.activeElement;
    game.settings=game.settings||{};
    tabLayoutUi.current().tabPlacement = tabLayoutUi.current().tabPlacement || {};
    let headers = Array.from(document.querySelectorAll('.tab-header'));
    let topHeader = headers.find(header => header.id !== 'tab-header-bottom');
    let bottomHeader = document.getElementById('tab-header-bottom');
    // 데스크톱 창형 레일의 버튼 배치(고정 탭 + 더보기 메뉴)는 창 관리자가 소유한다.
    // 여기서 버튼을 다시 헤더 루트로 옮기면 더보기 메뉴가 비워져 레일이 깨진다.
    if (document.body.classList.contains('desktop-windowed-ui')) {
        teardownMobilePrimaryNavigation(topHeader, bottomHeader);
        if (typeof syncDesktopRailGroups === 'function') syncDesktopRailGroups();
        if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
        return;
    }
    if(!topHeader) return;
    let mobilePrimary = isMobilePrimaryNavigationEnabled();
    let primaryIds = new Set(tabLayoutUi.mobilePrimaryIds());
    if (!mobilePrimary) teardownMobilePrimaryNavigation(topHeader, bottomHeader);
    else ensureMobilePrimaryNavigation(topHeader, bottomHeader);
    if (!mobilePrimary) installTabHeaderDragReorder();
    let allTabButtons = headers.flatMap(header => Array.from(header.querySelectorAll('.tab-btn')));
    let ids=allTabButtons.map(el=>el.id);
    let order = Array.from(new Set(['btn-tab-battle', ...tabLayoutUi.current().tabOrder, ...tabLayoutUi.defaultOrder]));
    let map={}; allTabButtons.forEach(el=>map[el.id]=el);
    order.forEach(id=>{
        if(!map[id]) return;
        let target = mobilePrimary
            ? (primaryIds.has(id) ? bottomHeader : topHeader)
            : ((game.settings.twoRowTabs && tabLayoutUi.current().tabPlacement[id] === 'bottom' && bottomHeader) ? bottomHeader : topHeader);
        target.appendChild(map[id]);
    });
    ids.forEach(id=>{
        if(order.includes(id) || !map[id]) return;
        let target = mobilePrimary && primaryIds.has(id) ? bottomHeader : topHeader;
        target.appendChild(map[id]);
    });
    if (bottomHeader) {
        let more = document.getElementById('btn-mobile-nav-more');
        if (more) bottomHeader.appendChild(more);
        let hasBottomTabs = bottomHeader.children.length > 0;
        bottomHeader.style.display = hasBottomTabs ? 'flex' : 'none';
        document.body.classList.toggle('has-bottom-tabs', hasBottomTabs);
        updateBottomTabSpacing();
    }
    if (mobilePrimary) renderMobileMenuGroups(topHeader);
    syncMobilePrimaryNavigationState();
    restoreMobileMenuFocus(focused);
    if (shouldRenderSettings || (document.getElementById('tab-settings') || {}).classList.contains('active')) renderTabOrderSettings();
}
// Reserve scroll space at the bottom of the page so the fixed bottom tab bar
// does not overlap (and block taps on) the last buttons in the content.
function updateBottomTabSpacing(){
    let bottomHeader = document.getElementById('tab-header-bottom');
    let visible = bottomHeader && document.body.classList.contains('has-bottom-tabs') &&
        window.getComputedStyle(bottomHeader).display !== 'none';
    let height = visible ? Math.ceil(bottomHeader.getBoundingClientRect().height) : 0;
    // body의 변수는 문서 전체가 물려받는다: 같은 값을 다시 쓰면 모든 요소의 스타일을 다시 계산했다(2026-10-07 프레임 드랍).
    if (document.body.style.getPropertyValue('--bottom-tab-height') !== height + 'px') document.body.style.setProperty('--bottom-tab-height', height + 'px');
}
function scheduleTabHeaderViewportSync() {
    clearTabHeaderDragState(false);
    requestAnimationFrame(() => {
        updateBottomTabSpacing();
        lastTabHeaderUiSignature = null;
        refreshTabHeaderUiIfNeeded();
    });
}
if (typeof window !== 'undefined') {
    window.addEventListener('resize', scheduleTabHeaderViewportSync);
    window.addEventListener('orientationchange', scheduleTabHeaderViewportSync);
}
function setTabPlacement(tabId, placement) {
    tabLayoutUi.place(tabId, placement);
}
function moveTabButton(tabId, dir) {
    tabLayoutUi.move(tabId, dir);
}

function getTabHeaderUiSignature() {
    let unlocks = game.unlocks || {};
    let mobileBattle = uiDisplay.matches(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`) ? 'mobileBattle' : 'desktopBattle';
    return [
        mobileBattle,
        isMobilePrimaryNavigationEnabled() ? 'mobilePrimary' : 'legacyTabs',
        (game.settings && game.settings.tabNotiEnabled === false) ? 'notiOff' : 'notiOn',
        // 알림 점은 getTabNotiSignature가 따로 본다(점 하나에 머리 전체를 다시 그리지 않게).
        TAB_HEADER_NOTI_KEYS.map(key => `${key}:${unlocks[key] ? 1 : 0}`).join('|'),
        Array.isArray(game.settings && tabLayoutUi.current().tabOrder) ? tabLayoutUi.current().tabOrder.join(',') : '',
        JSON.stringify((game.settings && tabLayoutUi.current().tabPlacement) || {}),
        Array.isArray(game.settings && tabLayoutUi.current().tabGroupOrder) ? tabLayoutUi.current().tabGroupOrder.join(',') : '',
        isTabGroupingActive() ? ('grp:' + getActiveTabGroup()) : 'nogrp'
    ].join('::');
}

function updateTabNotificationDots() {
    // 데스크톱 창형 모드에서 커뮤니티는 탭 전환 없이 도킹 패널로 열리므로,
    // 패널이 열려 있는 동안은 채팅을 읽고 있는 것으로 간주해 알림을 꺼 둔다.
    if (typeof isSocialTabActive === 'function' && isSocialTabActive()) game.noti.social = false;
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
    syncMergedTabLauncherState();
    let skillTabButton = document.getElementById('btn-tab-skills');
    if (skillTabButton) skillTabButton.classList.toggle('starter-gem-tutorial-pending', !!getStarterGemTutorialTarget());
    syncMobilePrimaryNavigationState();
}

/** 해금 단추 표시. 휴대폰 하단 메뉴의 지도는 열리기 전에도 흐린 잠금 칸으로 자리를 지킨다 — 액트 1을 마쳐 지도가 열리는 순간
 * 메뉴 칸이 넷에서 다섯으로 늘며 스킬 젬 칸이 밀리던 것을 막는다(누르면 notifyLockedTab이 여는 조건을 알린다). */
function syncTabUnlockButton(key) {
    let button = document.getElementById('btn-tab-' + key);
    let reserved = key === 'map' && !game.unlocks.map && isMobilePrimaryNavigationEnabled()
        && game.settings.tabLayouts.mobile.tabPlacement['btn-tab-map'] !== 'bottom';
    button.classList.toggle('nav-locked', reserved);
    if (reserved) button.setAttribute('aria-disabled', 'true');
    else button.removeAttribute('aria-disabled');
    button.style.display = game.unlocks[key] || reserved ? 'flex' : 'none';
}

function updateTabUnlockButtons() {
    TAB_UNLOCK_BUTTON_KEYS.forEach(syncTabUnlockButton);
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = isMobilePrimaryNavigationEnabled() ? 'flex' : 'none';
    syncMergedTabLauncherVisibility();
    // 해금 상태가 바뀌면 "열려 있는" 병합 창의 내부 탭 목록과 표시 중인 화면도 다시 맞춘다.
    // 이게 없으면 루프 정산으로 큐브가 잠긴 뒤에도 큐브 화면이 그대로 남고,
    // 내부 탭 버튼에 잠긴 탭이 계속 보인다(선택 상태만 조용히 다른 탭으로 바뀐다).
    Object.entries(MERGED_TAB_GROUPS).forEach(([groupKey, group]) => {
        let root = document.getElementById(group.launcher);
        if (root && root.classList.contains('active')) renderMergedTabPanels(groupKey);
    });
    // 다시 잠긴 탭의 창/패널이 열린 채로 남지 않게 정리한다(갱신이 멈춘 잔상 방지).
    closeRelockedTabSurfaces();
    // 2단 그룹핑이 활성이면 해금 판정 직후 활성 그룹 외 탭을 숨긴다(단일 권위 지점).
    hideOutOfGroupTabButtons();
    // 데스크톱 창형 레일은 그룹 섹션 단위로 표시되므로, 해금 변경 시 빈 그룹을 함께 숨긴다.
    if (typeof syncDesktopRailGroups === 'function' && document.body.classList.contains('desktop-windowed-ui')) syncDesktopRailGroups();
}

function isUngatedPersistentTabButton(btn) {
    return btn && (btn.id === 'btn-tab-social' || btn.id === 'btn-tab-settings' || btn.id === 'btn-tab-character');
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

let lastTabNotiSignature = '';
/** Which tabs show a notification dot (filters applied). Kept apart from the header's signature: a dot that came or went rebuilt
 * the whole tab header and phone menu, and the restyle that followed, every few seconds of combat (2026-10-07 frame drops: about
 * 75 ms on a 4x-throttled phone). */
function getTabNotiSignature() {
    let noti = game.noti || {};
    let filters = (game.settings && game.settings.notiFilters) || {};
    return TAB_HEADER_NOTI_KEYS.map(key => (noti[key] && filters[key] !== false ? 1 : 0)).join('');
}

function refreshTabHeaderUiIfNeeded() {
    let signature = getTabHeaderUiSignature();
    if (signature === lastTabHeaderUiSignature) {
        if (getTabNotiSignature() === lastTabNotiSignature) return false;
        updateTabNotificationDots();
        if (isTabGroupingActive()) renderTabCategoryBar(); // its group buttons carry the dots too
        lastTabNotiSignature = getTabNotiSignature();
        return false;
    }
    lastTabHeaderUiSignature = signature;
    updateTabUnlockButtons();
    applyTabHeaderOrder();
    updateTabNotificationDots();
    applyTabGroupFilter();
    renderTabCategoryBar();
    lastTabNotiSignature = getTabNotiSignature();
    return true;
}

function isNotiEnabled(key){ game.settings=game.settings||{}; if (game.settings.tabNotiEnabled === false) return false; game.settings.notiFilters=game.settings.notiFilters||{}; return game.settings.notiFilters[key] !== false; }
function toggleNotiFilter(key){ game.settings=game.settings||{}; game.settings.notiFilters=game.settings.notiFilters||{}; game.settings.notiFilters[key]=!(game.settings.notiFilters[key] !== false); updateStaticUI(); }

function isMergedTabAvailable(tab) {
    let tabId = typeof tab === 'string' ? tab : tab.id;
    if (game.contentProgression) return contentProgression.canOpen(tabId);
    let gateKey = typeof tab === 'string' ? TAB_UNLOCK_GATES[tabId] : tab.gate || TAB_UNLOCK_GATES[tabId];
    // 저널은 루프를 건너 유지되는 영구 기록이라 고유 아이템 보유 여부와 무관하게 열려 있어야 한다.
    // (도감은 game.unlocks.codex가 권위이며 checkUnlocks가 루프마다 다시 판정한다. 여기서
    //  "지금 고유를 들고 있는가"를 다시 보면, 고유를 처분하거나 루프를 넘긴 직후 기록 메뉴 자체가
    //  사라져 저널·도감을 열 수 없게 된다.)
    if (gateKey === 'journal') return isJournalTabUnlockReady();
    return !gateKey || !!(game.unlocks && game.unlocks[gateKey]);
}

function getMergedTabGroup(tabId) {
    return Object.entries(MERGED_TAB_GROUPS).find(([, group]) => group.tabs.some(tab => tab.id === tabId)) || null;
}

function getSelectedMergedTabId(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return null;
    game.settings = game.settings || {};
    game.settings.mergedTabSelection = game.settings.mergedTabSelection || {};
    let selected = game.settings.mergedTabSelection[groupKey];
    if (group.tabs.some(tab => tab.id === selected && isMergedTabAvailable(tab))) return selected;
    let firstAvailable = group.tabs.find(isMergedTabAvailable);
    return firstAvailable ? firstAvailable.id : null;
}

// 지금 보고 있는 "최상위" 탭 화면. 병합 그룹의 하위 패널(.merged-subtab-pane)은 각 창의
// 안쪽 선택을 표현하려고 .active를 계속 유지하므로 반드시 제외해야 한다. 하위 패널은
// 런처 안으로 옮겨져 문서 순서가 바뀌기 때문에(예: tab-traits는 tab-char 안 = tab-skills보다 앞),
// 제외하지 않으면 병합 창을 한 번 연 뒤부터 다른 탭이 전부 그 패널로 오인식된다.
function getActiveTopLevelTabElement() {
    return document.querySelector('.tab-content.active:not(.merged-subtab-pane)');
}

function getActiveUiTabId() {
    let activeContent = getActiveTopLevelTabElement();
    if (!activeContent) return '';
    return resolveRenderedTabId(activeContent.id);
}

// 최상위 탭 id를 "실제로 내용을 그려야 하는" 탭 id로 바꾼다.
// 병합 그룹의 런처는 안쪽에서 선택된 탭이 곧 렌더 대상이다.
function resolveRenderedTabId(tabId) {
    let mergedEntry = getMergedTabGroup(tabId);
    if (!mergedEntry || mergedEntry[1].launcher !== tabId) return tabId;
    return getSelectedMergedTabId(mergedEntry[0]) || tabId;
}

// 지금 화면에 내용이 보이는 탭 전체. 데스크톱 창 모드는 창을 여러 개 동시에 띄우므로
// 포커스된 창 하나만 그리면 나머지 창은 보이는 채로 갱신이 멈춘다(레일 버튼으로 다시
// 열기 전까지 계속 옛 내용이 남아 "탭이 고장난" 것처럼 보인다).
function getRenderingUiTabIds() {
    let ids = new Set();
    let activeId = getActiveUiTabId();
    if (activeId) ids.add(activeId);
    if (!document.body.classList.contains('desktop-windowed-ui')) return ids;
    // ui-window-open은 창 관리자가 준비한 최상위 창에만 붙는다(하위 패널에는 붙지 않는다).
    document.querySelectorAll('.tab-content.ui-window-open:not(.ui-window-minimized)').forEach(el => {
        if (el.id) ids.add(resolveRenderedTabId(el.id));
    });
    return ids;
}

// Keep timed stock progression independent of whether its management panel is visible.
function renderVisibleManagementPanels(tabIds) {
    if (tabIds.has('tab-talent')) talentUi.render();
    if (tabIds.has('tab-stump')) stumpBoxUi.renderStumpBoxTab();
    if (tabIds.has('tab-items') && game.itemSubtab === 'item-tab-market') renderMarketUI();
    else refreshBlackMarket(false);
}

// 지금 이 탭 화면(창/패널)을 열어 둘 수 있는지 판정한다.
// 병합 그룹의 런처는 안쪽에 열 수 있는 탭이 하나라도 남아 있어야 유효하다.
function isTabSurfaceAvailable(tabId) {
    if (!tabId) return false;
    let mergedEntry = getMergedTabGroup(tabId);
    if (mergedEntry) {
        if (mergedEntry[1].launcher === tabId) return !!getSelectedMergedTabId(mergedEntry[0]);
        return isMergedTabAvailable(mergedEntry[1].tabs.find(tab => tab.id === tabId) || tabId);
    }
    if (!contentProgression.canOpen(tabId)) return false;
    let gateKey = TAB_UNLOCK_GATES[tabId];
    return !gateKey || !!(game.unlocks && game.unlocks[gateKey]);
}

// 보고 있던 화면이 다시 잠겨 닫혔음을 알리는 표시. 다음 정적 UI 갱신이 안전한 탭으로
// 되돌린다(활성 탭이 하나도 없어 아무것도 렌더되지 않는 빈 화면 방지).
let pendingRelockedTabFallback = false;

// 루프 정산처럼 런타임 판정이 탭을 다시 잠그면 실행 버튼만 사라지고, 이미 열려 있던
// 창/패널은 화면에 그대로 남는다. 그 화면은 updateStaticUI의 렌더 대상(getActiveUiTabId)에서도
// 빠지므로 갱신이 멈춘 잔상이 닫을 방법도 없이 남아 "탭이 고장난" 것처럼 보인다.
// 해금 판정 직후 이 함수가 잠긴 표면을 함께 닫는다.
function closeRelockedTabSurfaces() {
    Array.from(document.querySelectorAll('.tab-content:not(.merged-subtab-pane)')).forEach(el => {
        if (!el.id || isTabSurfaceAvailable(el.id)) return;
        let wasActive = el.classList.contains('active');
        let windowOpen = el.classList.contains('ui-window-open') || el.classList.contains('ui-window-minimized');
        if (!wasActive && !windowOpen) return;
        el.classList.remove('active');
        let btn = document.getElementById('btn-' + el.id);
        if (btn) btn.classList.remove('active');
        // ui-window-open은 창 관리자가 준비한 창에만 붙으므로, 이 조건에서만 closeWindow를 부른다.
        if (windowOpen && typeof closeWindow === 'function') closeWindow(el.id);
        if (lastActiveTabId === el.id) lastActiveTabId = null;
        if (wasActive) pendingRelockedTabFallback = true;
    });
}

safeExposeGlobals({ isTabSurfaceAvailable, closeRelockedTabSurfaces });

function mountMergedTabGroup(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let root = group && document.getElementById(group.launcher);
    if (!root) return null;
    let host = root.querySelector(':scope > .ui-window-body') || root;
    let shell = host.querySelector(':scope > .merged-tab-shell');
    if (shell) return shell;

    shell = document.createElement('div');
    shell.className = 'merged-tab-shell';
    let nav = document.createElement('div');
    nav.className = 'subtab-row merged-tab-subtabs';
    let panels = document.createElement('div');
    panels.className = 'merged-tab-panels';
    let hostPane = document.createElement('div');
    hostPane.className = 'merged-subtab-pane';
    hostPane.dataset.tabId = group.launcher;
    Array.from(host.childNodes).forEach(node => hostPane.appendChild(node));
    panels.appendChild(hostPane);
    group.tabs.filter(tab => tab.id !== group.launcher).forEach(tab => {
        let source = document.getElementById(tab.id);
        if (!source) return;
        source.classList.add('merged-subtab-pane');
        source.dataset.tabId = tab.id;
        panels.appendChild(source);
    });
    shell.append(nav, panels);
    host.replaceChildren(shell);
    return shell;
}

function renderMergedTabPanels(groupKey) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let shell = mountMergedTabGroup(groupKey);
    if (!group || !shell) return;
    let selectedId = getSelectedMergedTabId(groupKey);
    let nav = shell.querySelector('.merged-tab-subtabs');
    let visibleTabs = group.tabs.filter(isMergedTabAvailable);
    nav.hidden = visibleTabs.length <= 1;
    nav.innerHTML = visibleTabs.map(tab =>
        `<button type="button" class="subtab-btn${tab.id === selectedId ? ' active' : ''}" onclick="switchMergedTabSubtab('${groupKey}','${tab.id}')" ${isMergedTabAvailable(tab) ? '' : 'disabled title="루프 25에 해금"'}>${tab.label}${isMergedTabAvailable(tab) ? '' : ' 🔒 루프 25'}</button>`
    ).join('');
    shell.querySelectorAll('.merged-subtab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.dataset.tabId === selectedId);
    });
}

function switchMergedTabSubtab(groupKey, tabId, options = {}) {
    let group = MERGED_TAB_GROUPS[groupKey];
    let tab = group && group.tabs.find(entry => entry.id === tabId);
    if (!tab || !isMergedTabAvailable(tab)) return;
    game.settings = game.settings || {};
    game.settings.mergedTabSelection = game.settings.mergedTabSelection || {};
    game.settings.mergedTabSelection[groupKey] = tabId;
    let wasCodexNotified = !!(game.noti && game.noti.codex);
    if (game.noti) game.noti[tabId.replace(/^tab-/, '')] = false;
    if (tabId === 'tab-codex' && wasCodexNotified) game.codexFocusNewOnOpen = true;
    window.switchTab(group.launcher, { keepWindowOpen: options.keepWindowOpen !== false });
    updateStaticUI();
}

function syncMergedTabLauncherVisibility() {
    contentUnlockUi.sync();
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = document.getElementById('btn-' + group.launcher);
        if (launcher) launcher.style.display = group.tabs.some(isMergedTabAvailable) ? 'flex' : 'none';
    });
}

function syncMergedTabLauncherState() {
    Object.values(MERGED_TAB_GROUPS).forEach(group => {
        let launcher = document.getElementById('btn-' + group.launcher);
        if (!launcher) return;
        let root = document.getElementById(group.launcher);
        launcher.classList.toggle('active', !!(root && root.classList.contains('active')));
        let sourceKeys = group.tabs.map(tab => tab.id.replace(/^tab-/, ''));
        let dot = launcher.querySelector('.noti-dot');
        if (dot) dot.style.display = sourceKeys.some(key => game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none';
    });
}

function openMergedTabPicker(event, groupKey) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    let group = MERGED_TAB_GROUPS[groupKey];
    if (!group) return;
    let selectedTabId = getSelectedMergedTabId(groupKey);
    if (!selectedTabId) return;
    switchMergedTabSubtab(groupKey, selectedTabId, { keepWindowOpen: false });
}

// 특정 탭을 "그 탭이 실제로 보이는 상태"로 연다.
// tab-char처럼 병합 그룹의 런처인 탭은 switchTab만으로는 창만 열리고 안쪽 화면은
// 마지막에 보던 탭(직업전직 등)이 그대로여서, 누른 것과 다른 화면이 뜬다.
function openTabPane(tabId) {
    let mergedEntry = getMergedTabGroup(tabId);
    if (mergedEntry) {
        switchMergedTabSubtab(mergedEntry[0], tabId);
        return;
    }
    switchTab(tabId);
}

safeExposeGlobals({ openMergedTabPicker, switchMergedTabSubtab, openTabPane });

function renderMergedTabSubtabs(tabId) {
    renderMergedTabPanels(tabId);
}

/** 휴대폰: 메뉴 띠가 옆으로 넘칠 때만 고른 단추를 가운데로 굴린다. 화면을 그린 뒤에 재므로 탭 전환이 강제 레이아웃을
 * 기다리지 않는다(전환마다 부르던 scrollIntoView가 CPU 4배 감속 휴대폰에서 한 번에 약 40ms였다 — 지금 하단 메뉴는 넘치지 않는다). */
function revealActiveTabButton(button) {
    requestAnimationFrame(() => setTimeout(() => {
        const bar = button.parentElement;
        if (bar && bar.scrollWidth > bar.clientWidth + 1) button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }, 0));
}

function switchTab(tabId) {
    hideInfoTooltip();
    hideItemTooltip();
    if (typeof window.hidePassiveNodeTooltip === 'function') window.hidePassiveNodeTooltip();
    let mergedEntry = getMergedTabGroup(tabId);
    if (mergedEntry && mergedEntry[1].launcher !== tabId) {
        switchMergedTabSubtab(mergedEntry[0], tabId);
        return;
    }
    if (mergedEntry && !getSelectedMergedTabId(mergedEntry[0])) return;
    if (!isTabSurfaceAvailable(tabId)) {
        notifyLockedTab(tabId);
        return;
    }
    setMobileTabDrawerOpen(false);
    // 이미 활성인 탭을 다시 누르면 전체 UI 재구성(+ 캐릭터 탭의 패시브 트리 재드로우)을
    // 반복해 게임이 멈춘 것처럼 느껴진다. 같은 탭 재클릭은 무거운 재렌더를 생략한다.
    // (탭 내용 갱신은 게임 동작/주기 갱신이 별도로 처리한다.)
    if (tabId === 'tab-items' && game.noti) game.noti.items = false;
    let tabEl = document.getElementById(tabId);
    if (lastActiveTabId === tabId && tabEl && tabEl.classList.contains('active')) {
        if (mergedEntry) renderMergedTabSubtabs(mergedEntry[0]);
        updateTabNotificationDots();
        return;
    }
    // 병합 창 안의 하위 패널은 각 창이 독립적으로 표시 상태를 소유한다.
    // 다른 최상위 창을 열 때까지 함께 비활성화하면, 이미 열려 있던 도감·전직·주얼·부적
    // 창의 선택 패널이 사라져 빈 창만 남는다. 전역 전환은 최상위 탭과 메뉴 버튼만 해제한다.
    document.querySelectorAll('.tab-content:not(.merged-subtab-pane), .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    // 장비 창을 열면 현재 세팅 분석을 한 번 돌린다(js/equipment-triage.js autoStart).
    if (tabId === 'tab-items' && window.equipmentTriage) window.equipmentTriage.onOpen();
    document.body.classList.toggle('mobile-community-sheet-open', tabId === 'tab-social' && uiDisplay.matches('(max-width: 1080px)'));
    // 열 수 있는 화면을 다시 세웠으므로 잠금 정리 후의 복귀 예약은 소진된다.
    pendingRelockedTabFallback = false;
    let activeBtn = document.getElementById('btn-' + tabId);
    activeBtn.classList.add('active');
    if (mergedEntry) renderMergedTabSubtabs(mergedEntry[0]);
    syncMergedTabLauncherState();
    if (activeBtn && activeBtn.scrollIntoView && uiDisplay.matches('(max-width: 1080px)')) revealActiveTabButton(activeBtn);
    // 2단 그룹핑: 이동한 탭이 속한 그룹을 활성화하고 카테고리 바를 갱신.
    if (isTabGroupingActive()) {
        game.settings = game.settings || {};
        let grp = getTabGroupForId(tabId);
        if (game.settings.activeTabGroup !== grp) { game.settings.activeTabGroup = grp; applyTabGroupFilter(); }
        renderTabCategoryBar();
    }
    if (tabId === 'tab-codex' && game.noti && game.noti.codex) game.codexFocusNewOnOpen = true;
    // 알림을 지우기 전에, 그 알림을 띄운 세부 화면을 먼저 선택한다.
    if (tabId === 'tab-map') focusMapAlarmSourceSubtab();
    // 알림 키 전체(TAB_HEADER_NOTI_KEYS)를 대상으로 해제한다. 과거에 하드코딩 목록에서
    // 'jewel'이 빠져 있어 주얼 탭을 방문해도 알림이 꺼지지 않았고, 저장 데이터에 true로
    // 남아 장비 상위탭 그룹 점이 영구히 켜져 있는 문제가 있었다.
    TAB_HEADER_NOTI_KEYS.forEach(key => { if (tabId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-map') acknowledgeMapMainAlarm();
    // 도감 탭에서 다른 탭으로 벗어날 때, 신규 등록 강조를 해제(처음 열었을 때만 강조).
    if (lastActiveTabId === 'tab-codex' && tabId !== 'tab-codex') game.codexNewlyRegistered = {};
    lastActiveTabId = tabId;
    if (tabId === 'tab-social' && typeof renderSocialTab === 'function') renderSocialTab();
    else if (typeof syncSocialChatPolling === 'function') syncSocialChatPolling();
    if (tabId === 'tab-talent') talentUi.render();
    if (tabId === 'tab-items') switchItemSubtab('item-tab-equip');
    updateMobileBattlePipVisibility();
    // 탭 전환 직후 PiP가 보이면 한 번 즉시 갱신해, 적응형 루프 다음 주기를
    // 기다리는 동안 직전 프레임이 잠깐 남아 보이는 것을 막는다.
    // 다음 프레임(그리기 전)에 그린다 — 여기서 그리면 전장 크기를 재느라 바뀐 탭의 스타일을 미리 한 번 더 계산했다.
    if (isMobileBattlePipVisible()) requestAnimationFrame(refreshMobileBattlePip);
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
        syncCombatTacticsSettingsControls();
        renderTabOrderSettings();
    }
}

function craftSelectInventoryItemById(itemId) {
    if (!contentProgression.canOpen('item-tab-craft')) return;
    let id = Number(itemId);
    if (!Number.isFinite(id) || !(game.inventory || []).some(item => item && item.id === id)) return;
    if (typeof hideItemTooltip === 'function') hideItemTooltip();
    if (typeof hideInfoTooltip === 'function') hideInfoTooltip();
    if (typeof switchTab === 'function') switchTab('tab-items');
    // 데스크톱 창 모드의 switchTab은 이미 포커스된 탭을 다시 누르면 창을 닫는 토글이다.
    // 카드 안의 바로가기는 단방향 이동이어야 하므로 닫혔더라도 즉시 다시 열고 포커스한다.
    if (document.body.classList.contains('desktop-windowed-ui') && typeof openWindow === 'function') openWindow('tab-items');
    if (typeof switchItemSubtab === 'function') switchItemSubtab('item-tab-craft');
    selectForCrafting(id, false);
    setTimeout(() => {
        let el = document.getElementById('forge-item-display');
        if (el && el.scrollIntoView) {
            try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
            catch (error) { el.scrollIntoView(); }
        }
    }, 60);
}

function isSelectedSubtab(subtabId) {
    const panel = document.getElementById(subtabId);
    const button = document.getElementById('btn-' + subtabId);
    return !!(panel && button && panel.classList.contains('active') && button.classList.contains('active'));
}

function switchItemSubtab(subtabId) {
    if(subtabId==='item-tab-fossil')subtabId='item-tab-craft';
    if(subtabId!==game.itemSubtab)craftingWorkspaceUi.stopAuto('');
    if (!contentProgression.canOpen(subtabId)) return;
    if (subtabId === 'item-tab-equip' && game.noti) game.noti.items = false;
    if (subtabId === game.itemSubtab) {
        if (isSelectedSubtab(subtabId)) return;
    }
    if (subtabId === 'item-tab-market' && !isMarketUnlocked()) {
        addLog('장비 제련을 해금하면 거래소를 이용할 수 있습니다.', 'attack-monster');
        subtabId = 'item-tab-equip';
    }
    game.itemSubtab = subtabId;
    if (subtabId === 'item-tab-equip' && window.equipmentTriage) window.equipmentTriage.onOpen();
    document.querySelectorAll('#tab-items .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-items .subtab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(subtabId).classList.add('active');
    document.getElementById('btn-' + subtabId).classList.add('active');
    if (subtabId === 'item-tab-hall' && typeof loadPlayerExchange === 'function') loadPlayerExchange();
    updateStaticUI();
}

function getDefaultSkillAutoRule() {
    return {
        id: `rule_${Date.now()}_${Math.floor(Math.random()*10000)}`,
        enabled: true,
        priority: ((game.skillAutoRules || []).length + 1),
        hpThreshold: 40,
        triggerValue: 40,
        triggerType: 'hp_below',
        actionType: 'target_nearest'
    };
}

const TACTICS_RULES_LOCK_MESSAGE = '전술 규칙은 루프 2부터, 액트 3에서 전술을 배운 뒤 씁니다.';

/** The rules panel (예전 컨디션 젬 창의 자동 사용 규칙) opens with the tactics it drives. */
function isTacticsRulesOpen() {
    return contentProgression.canOpen('skill-tab-condition');
}

function addSkillAutoRule() {
    if (!isTacticsRulesOpen()) return addLog(TACTICS_RULES_LOCK_MESSAGE, 'attack-monster');
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];
    game.skillAutoRules.push(getDefaultSkillAutoRule());
    renderSkillAutoRulePanel();
    document.querySelector('#ui-skill-rules-panel .condition-pattern-rule:last-child')?.scrollIntoView({ block: 'nearest' });
}

function sortSkillAutoRules() {
    if (!isTacticsRulesOpen()) return addLog(TACTICS_RULES_LOCK_MESSAGE, 'attack-monster');
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];

    game.skillAutoRules.sort((a, b) => (a.priority || 0) - (b.priority || 0));
    game.skillAutoRules.forEach((rule, idx) => rule.priority = idx + 1);
    renderSkillAutoRulePanel();
}

function setEquipmentInventoryView(key, value) {
    game.settings = game.settings || {};
    if (key === 'slot') game.settings.equipmentSlotFilter = String(value || 'all');
    if (key === 'sort') game.settings.equipmentSort = ['recent', 'rarity', 'tier', 'slot'].includes(value) ? value : 'recent';
    updateStaticUI();
}

safeExposeGlobals({ setEquipmentInventoryView });

function syncEquipmentSlotFilterOptions(select, slots) {
    if (!select) return;
    let signature = JSON.stringify(slots);
    if (select.dataset.optionSignature === signature) return;
    select.innerHTML = `<option value="all">모든 칸</option>${slots.map(slot => `<option value="${escapeHTML(slot)}">${escapeHTML(slot)}</option>`).join('')}`;
    select.dataset.optionSignature = signature;
}

function syncEquipmentMobilePane() {
    game.settings = game.settings || {};
    let pane = game.settings.equipmentMobilePane === 'loadout' ? 'loadout' : 'inventory';
    game.settings.equipmentMobilePane = pane;
    let workspace = document.querySelector('#item-tab-equip .equipment-workspace');
    if (workspace) workspace.dataset.mobilePane = pane;
}

function setEquipmentMobilePane(pane) {
    if (!['inventory', 'loadout'].includes(pane)) return;
    game.settings = game.settings || {};
    game.settings.equipmentMobilePane = pane;
    syncEquipmentMobilePane();
    if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
}

safeExposeGlobals({ setEquipmentMobilePane });

function getSortedEquipmentInventoryRows(query) {
    game.settings = game.settings || {};
    let slotValue = game.settings.equipmentSlotFilter || 'all';
    let sortValue = game.settings.equipmentSort || 'recent';
    if (!['recent', 'rarity', 'tier', 'slot'].includes(sortValue)) sortValue = 'recent';
    let slots = Array.from(new Set(game.inventory.map(item => item && item.slot).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'));
    if (!slots.includes(slotValue)) slotValue = 'all';
    let slotSelect = document.getElementById('ui-equipment-slot-filter');
    let sortSelect = document.getElementById('ui-equipment-sort');
    syncEquipmentSlotFilterOptions(slotSelect, slots);
    if (slotSelect) slotSelect.value = slotValue;
    if (sortSelect) sortSelect.value = sortValue;
    let ranks = { unique: 4, rare: 3, magic: 2, normal: 1 };
    let visualFilterActive = [slotValue !== 'all', String(query || '').trim().length > 0,
        game.inventory.some(item => item && !isItemRarityVisible(item))].some(Boolean);
    let rows = game.inventory.map((item, idx) => ({ item, idx })).map(row => {
        let item = row.item || {};
        let searchMatched = matchSearchQuery(getEquipmentSearchText(item), query);
        return { ...row, filterActive: visualFilterActive,
            filterMatched: ['all', item.slot].includes(slotValue) && isItemRarityVisible(item) && searchMatched };
    }).sort((a, b) => {
        if (sortValue === 'rarity') return (ranks[b.item.rarity] || 0) - (ranks[a.item.rarity] || 0) || b.idx - a.idx;
        if (sortValue === 'tier') return Number(b.item.hiddenTier || b.item.itemTier || 0) - Number(a.item.hiddenTier || a.item.itemTier || 0) || b.idx - a.idx;
        if (sortValue === 'slot') return String(a.item.slot || '').localeCompare(String(b.item.slot || ''), 'ko') || b.idx - a.idx;
        return b.idx - a.idx;
    });
    return window.equipmentTriage ? window.equipmentTriage.filterRows(rows) : rows;
}

function moveSkillAutoRule(index, delta) {
    if (!isTacticsRulesOpen()) return;
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [];
    let from = Math.max(0, Math.min(game.skillAutoRules.length - 1, Math.floor(index || 0)));
    let to = Math.max(0, Math.min(game.skillAutoRules.length - 1, from + Math.sign(delta || 0)));
    if (from === to) return;
    let moved = game.skillAutoRules.splice(from, 1)[0];
    game.skillAutoRules.splice(to, 0, moved);
    game.skillAutoRules.forEach((rule, idx) => rule.priority = idx + 1);
    renderSkillAutoRulePanel();
}




function setConditionPatternTrigger(index, triggerType) {
    let rule = normalizeConditionPatternRule((game.skillAutoRules || [])[index]);
    let trigger = getConditionPatternTriggers(game, false).find(row => row.id === triggerType);
    if (!rule || !trigger) return;
    rule.triggerType = trigger.id;
    normalizeConditionPatternRule(rule);
    renderSkillAutoRulePanel();
}

function setConditionPatternAction(index, actionType) {
    let rule = normalizeConditionPatternRule((game.skillAutoRules || [])[index]);
    let action = getConditionPatternActions(game, false).find(row => row.id === actionType);
    if (!rule || !action) return;
    rule.actionType = action.id;
    renderSkillAutoRulePanel();
}

function setConditionPatternValue(index, value) {
    let rule = normalizeConditionPatternRule((game.skillAutoRules || [])[index]);
    if (!rule) return;
    rule.triggerValue = Number(value);
    rule.hpThreshold = rule.triggerValue;
}

function renderConditionPatternValueControl(rule, index, trigger) {
    if (!trigger || trigger.valueKind === 'none') return '';
    if (trigger.valueKind === 'ailment') {
        let values = [['any', '아무 상태이상'], ['ignite', '점화'], ['chill', '냉각'], ['freeze', '동결'], ['shock', '감전'], ['poison', '중독'], ['bleed', '출혈']];
        return `<select onchange="game.skillAutoRules[${index}].ailmentType=this.value;">${values.map(([value, label]) => `<option value="${value}" ${rule.ailmentType === value ? 'selected' : ''}>${label}</option>`).join('')}</select>`;
    }
    let config = trigger.valueKind === 'cells' ? { min:1, max:7, suffix:'칸' }
        : (trigger.valueKind === 'seconds' ? { min:1, max:10, suffix:'초 이내' }
            : (trigger.valueKind === 'count' ? { min:1, max:30, suffix:'마리' } : { min:1, max:100, suffix:'%' }));
    return `<input type="number" min="${config.min}" max="${config.max}" value="${rule.triggerValue}" onchange="setConditionPatternValue(${index},Math.min(${config.max},Math.max(${config.min},Number(this.value)||${config.min})));"><span>${config.suffix}</span>`;
}

function renderConditionPatternRoadmap() {
    let lockedTriggers = getConditionPatternTriggers(game, true).filter(row => !isConditionPatternRequirementMet(row.unlock, game));
    let lockedActions = getConditionPatternActions(game, true).filter(row => !isConditionPatternRequirementMet(row.unlock, game));
    let entries = lockedTriggers.map(row => `${row.label}, ${getConditionPatternRequirementLabel(row.unlock)}`)
        .concat(lockedActions.map(row => `${row.label}, ${getConditionPatternRequirementLabel(row.unlock)}`));
    if (entries.length === 0) return '<div class="condition-pattern-roadmap is-complete">모든 조건과 행동 패턴을 해금했습니다.</div>';
    return `<details class="condition-pattern-roadmap"><summary>다음 패턴 해금 ${entries.length}개</summary><div>${entries.map(text => `<span>${escapeHTML(text)}</span>`).join('')}</div></details>`;
}


function renderConditionRuleStatus(rule) {
    return rule.enabled ? '' : '<div class="condition-rule-draft">사용 중지, 조건을 확인한 뒤 ‘사용’을 켜세요.</div>';
}

function renderConditionPatternRule(rule, idx, options) {
    const { triggers, actions } = options;
    let trigger = triggers.find(row => row.id === rule.triggerType) || triggers[0];
    let action = actions.find(row => row.id === rule.actionType) || actions[0];
    return `
    <div class="condition-pattern-rule">
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <label><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="game.skillAutoRules[${idx}].enabled=this.checked; renderSkillAutoRulePanel();"> 사용</label>
            <span>우선순위 ${idx + 1}</span>
            <button aria-label="규칙 위로 이동" onclick="moveSkillAutoRule(${idx},-1)" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button aria-label="규칙 아래로 이동" onclick="moveSkillAutoRule(${idx},1)" ${idx === game.skillAutoRules.length - 1 ? 'disabled' : ''}>↓</button>
            <button onclick="game.skillAutoRules.splice(${idx},1); renderSkillAutoRulePanel();">삭제</button>
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; color:var(--copy-bright);">
            <span>이때</span>
            <select aria-label="발동 조건" onchange="setConditionPatternTrigger(${idx},this.value);">${triggers.map(row => `<option value="${row.id}" ${trigger && trigger.id === row.id ? 'selected' : ''}>${row.label}</option>`).join('')}</select>
            ${renderConditionPatternValueControl(rule, idx, trigger)}
            <span>실행</span>
            <select aria-label="실행 행동" onchange="setConditionPatternAction(${idx},this.value);">${actions.map(row => `<option value="${row.id}" ${action && action.id === row.id ? 'selected' : ''}>${row.label}</option>`).join('')}</select>
        </div>
        ${renderConditionRuleStatus(rule)}
    </div>`;
}

function paintSkillRulesPanel(panel, html) {
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
}

function renderSkillAutoRulePanel() {
    let panel = document.getElementById('ui-skill-rules-panel');
    if (!panel) return;
    let unlocked = isTacticsRulesOpen();
    let addButton = document.getElementById('btn-condition-rule-add');
    let sortButton = document.getElementById('btn-condition-rule-sort');
    if (addButton) addButton.disabled = !unlocked;
    if (sortButton) sortButton.disabled = !unlocked;
    if (!unlocked) return paintSkillRulesPanel(panel, `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">잠금 상태: ${TACTICS_RULES_LOCK_MESSAGE}</div>`);
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules.map(normalizeConditionPatternRule) : [];
    let summary = `<div class="condition-pattern-summary"><div><strong>수호, 함성, 저주</strong><span>그루터기 함에서 깨어난 부적의 조건부 줄이 맡습니다.</span></div></div>${renderConditionPatternRoadmap()}`;
    if (game.skillAutoRules.length === 0) {
        return paintSkillRulesPanel(panel, summary + '<div style="color:var(--copy-muted); border:1px dashed #39506c; border-radius:8px; padding:12px; margin-top:8px;">[규칙 추가]로 조건과 행동을 고르세요.</div>');
    }
    const options = { triggers: getConditionPatternTriggers(game, false), actions: getConditionPatternActions(game, false) };
    paintSkillRulesPanel(panel, summary + game.skillAutoRules.map((rule, idx) => renderConditionPatternRule(rule, idx, options)).join(''));
}

safeExposeGlobals({ setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue });

function switchSkillSubtab(subtabId) {
    if (!contentProgression.canOpen(subtabId)) return;
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

// A dismissal belongs to this pending choice only; the next branch can prompt again.
const dismissedBeehiveChoices = new WeakSet();
const pendingBeehiveForfeits = new WeakSet();

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
            const price = cost ? `${cost.name} ${cost.amount}개${cost.chance < 1 ? ` 소모 확률 ${cost.chance * 100}%` : ' 소모'}` : pick.penalty.text;
            const stock = cost ? `보유 ${game.currencies[cost.key] || 0}개${disabled ? ', 재료 부족' : ''}` : '';
            const changed = pick !== c[key] ? '재료 부족으로 대가 변경' : '';
            return `<button class="hive-choice" onclick="resolveBeehiveChoice('${key}',${escapeHTML(JSON.stringify(pick.penalty.key))})" ${disabled ? 'disabled' : ''}>
                <span class="hive-choice-timing">${getBeehiveRewardTimingLabel(pick.timing)}</span><strong>${escapeHTML(reward)}</strong>
                <span class="hive-choice-price">대가, ${escapeHTML(price)}</span><small>${escapeHTML(stock || changed)}</small></button>`;
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
    let alive = (game.enemies || []).filter(e => e && e.hp > 0).length;
    if (!b.inRun || !b.pendingChoice || b.awaitingClear || alive > 0 || document.getElementById('beehive-choice-overlay')) return;
    let next = Math.min(10, Math.max(1, Math.floor(b.branchStep + 1)));
    let html = `<div id="beehive-choice-overlay" class="beehive-choice-overlay" role="dialog" aria-modal="true" aria-label="벌집 갈림길">
        <div class="beehive-choice-card">
            <div class="beehive-choice-heading"><strong>벌집 갈림길 ${next}/10</strong><button onclick="closeBeehiveChoiceOverlay(true)">닫기</button></div>
            <p>${escapeHTML(reasonText || '다음 갈림길을 선택하세요.')}, 선택하면 전투가 시작됩니다.</p>
            ${sideEncounterUi.hiveSummary(b)}
            <div class="beehive-choice-actions">${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>
            <p>닫아도 벌집 패널에서 다시 선택할 수 있습니다.</p>
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
        choiceHtml = `<div class="map-hive-choices"><strong>갈림길 선택 (${Math.min(10, (b.branchStep || 0) + 1)}/10), 선택하면 전투가 시작됩니다.</strong>${getBeehiveChoiceButtonsHtml(b.pendingChoice)}</div>`;
    } else if (b.inRun && b.awaitingClear) {
        choiceHtml = `<div style="margin-top:8px; color:#f3d28a;">${b.queenActive ? '여왕벌 전투 진행 중' : `벌떼 웨이브 진행 중 (${Math.max(0, Math.floor(b.branchStep || 0))}/10)`}, 남은 적 <strong>${aliveBeeEnemies}</strong>마리를 모두 처치해야 진행할 수 있습니다.</div>`;
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
    game.currencies.colonyTrace--;
    c.entryDeepChaosDepth = getZone('colony_run').entryDeepChaosDepth;
    c.inRun = true; c.wave = 1; c.kills = 0; c.requiredKills = getColonyWaveEnemyCount(1);
    c.returnZoneId = game.currentZoneId;
    actExplorationProgress.depart(game);
    game.currentZoneId = 'colony_run';
    game.combatHalted = false;
    game.enemies = []; game.encounterPlan = []; game.encounterIndex = 0; game.runProgress = 0; game.moveTimer = 0;
    spawnColonyWave();
    addLog(`🪲 군락지 방어전 시작! 기준 난이도: 혼돈 심화 ${c.entryDeepChaosDepth}`, 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}
function forfeitColonyRun(){
    let c = game.colony || {};
    if (!c.inRun) return;
    c.inRun = false;
    game.currentZoneId = c.returnZoneId !== undefined && c.returnZoneId !== null ? c.returnZoneId : getAutoProgressZoneId(game.maxZoneId);
    c.returnZoneId = null;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    addLog(`🪲 군락지 ${Math.max(0, Math.floor(c.wave || 1) - 1)}웨이브 정산 후 철수했습니다. 획득 보상은 유지됩니다.`, 'season-up');
    updateStaticUI();
    queueImportantSave(200);
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
        autoBtn.innerText = `대균열 자동입장 ${game.settings && game.settings.autoEnterGrandBreach ? '켜짐' : '꺼짐'}`;
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
    sideEncounterUi.renderPanel(panel, sideEncounterUi.grandPanel(v, buildMapPowerEstimateHtml(getZone('grand_breach_run'))));
}

function spawnBeehiveWave(isBoss){
    let b = game.beehive || {};
    let zone = getZone('beehive_run') || getZone(0);
    let step = Math.max(1, Math.floor(b.branchStep || 1));
    let count = isBoss ? 1 : Math.min(8, 6 + Math.floor((step - 1) / 4));
    let eliteCount = step >= 6 ? 3 : 2;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.moveTimer = 0;
    for (let i = 0; i < count; i++) {
        let marker = { elite: !isBoss && i < eliteCount, boss: isBoss };
        let enemy = createEnemy(zone, marker, i);
        if (isBoss) {
            enemy.name = '👑 벌집 여왕';
            enemy.traitName = `분노한 군체 (강화 ${Math.floor(b.enemyEmpower || 0)})`;
        } else {
            enemy.maxHp = Math.floor(enemy.maxHp * zone.waveHpMul);
            enemy.hp = enemy.maxHp;
            enemy.atkMul *= zone.waveAttackRateMul;
            enemy.damageMul *= zone.waveDamageMul;
            enemy.name = `${enemy.isElite ? '정예 ' : ''}벌집 전투벌`;
            enemy.traitName = enemy.traitName || '벌떼 돌격';
        }
        game.enemies.push(enemy);
    }
    if (isBoss) addLog('👑 10개 갈림길을 완료해 여왕벌이 등장했습니다. 여왕벌을 처치하면 벌집 원정이 완료됩니다.', 'loot-unique');
    else addLog(`🐝 벌떼 웨이브 시작! 진행도 ${Math.min(100, step * 10)}%, 남은 적을 모두 처치해야 다음 갈림길이 열립니다.`, 'attack-monster');
}
function getBeehiveRewardAmount(base, branchStep) {
    let depthBonus = Math.max(0, Math.floor(branchStep || 0)) * 0.08;
    return Math.max(1, Math.floor(base * (1 + depthBonus)));
}
function getBeehivePenaltyPool(branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    let pool = [
        { key: 'swarm', text: '군체 분노 +1', power: 1 },
        { key: 'sting', text: '독침 상처(체력 -5%)', power: 1 },
        { key: 'pollen_tax', text: '꽃가루 -6', power: 1 }
    ];
    if (depth >= 4) pool.push({ key: 'deep_swarm', text: '심층 군체 분노 +2', power: 2 });
    pool.push({ key: 'venom_tax', text: '독벌침 1개 소모 확률 25%', power: 1 },
        { key: 'honey_tax', text: '벌꿀 1개 소모 확률 20%', power: 1 });
    if (depth >= 6) pool.push({ key: 'royal_swarm', text: '왕실 군체 분노 +3', power: 3 });
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
    return ['swarm', 'sting', 'deep_swarm', 'royal_swarm'].includes(penalty.key);
}
function getBeehiveSelectableChoice(choices, key) {
    if (!['a', 'b', 'c'].includes(key)) return null;
    const pick = choices[key];
    if (!pick || key !== 'c' || ['a', 'b', 'c'].some(id => canPayBeehivePenalty(choices[id]?.penalty))) return pick;
    // Old saves or spending between waves can exhaust all three costs. Keep rewards
    // fixed and visibly offer one combat penalty so the expedition cannot softlock.
    return { ...pick, penalty: { key: 'swarm', text: '군체 분노 +1', power: 1 } };
}
function getBeehiveRewardPool(branchStep) {
    let depth = Math.max(1, Math.floor(branchStep || 1));
    return [
        { type: 'pollen', weight: 42 }, { type: 'honey', weight: 18 }, { type: 'stinger', weight: 16 },
        { type: 'formlessDew', weight: 14 + Math.min(8, depth) }, { type: 'goldenRule', weight: 2 + Math.floor(depth / 4) },
        { type: 'jewelShard', weight: 10 }, { type: 'spore', weight: 8 }, { type: 'beeswax', weight: 10 }, { type: 'bundle', weight: 4 }
    ];
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
    let mk = (text, effect, amount, chance) => ({ text: `[${label}] ${text} / 대가: ${penalty.text}`, effect, amount, chance, penalty, timing });
    if (type === 'pollen') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(12 + Math.floor(Math.random() * 7), step), timing); return mk(`꽃가루 +${amount}`, 'pollen', amount); }
    if (type === 'honey') { let chance = scaleBeehiveRewardChance(0.30, timing); return mk(`벌꿀 획득 확률 ${Math.floor(chance * 100)}%`, 'honey', 1, chance); }
    if (type === 'stinger') { let chance = scaleBeehiveRewardChance(0.38, timing); return mk(`독벌침 획득 확률 ${Math.floor(chance * 100)}%`, 'stinger', 1, chance); }
    if (type === 'formlessDew') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(1 + (step >= 7 ? 1 : 0), step), timing); return mk(`형체 없는 이슬 +${amount}`, 'formlessDew', amount); }
    if (type === 'goldenRule') { let chance = scaleBeehiveRewardChance(step >= 8 ? 1 : 0.35, timing); return mk(chance >= 1 ? '황금률 +1' : `황금률 획득 확률 ${Math.floor(chance * 100)}%`, 'goldenRule', 1, chance); }
    if (type === 'jewelShard') { let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step), timing); return mk(`주얼 파편 +${amount}`, 'jewelShard', amount); }
    if (type === 'beeswax') { let amount = scaleBeehiveRewardAmount(step >= 8 ? 2 : 1, timing); return mk(`밀랍 +${amount}`, 'beeswax', amount); }
    if (type === 'spore') {
        let sporeType = rndChoice(['sporeFire', 'sporeCold', 'sporeLight']);
        let amount = scaleBeehiveRewardAmount(getBeehiveRewardAmount(2 + Math.floor(Math.random() * 3), step), timing);
        return mk(`${ORB_DB[sporeType].name} +${amount}`, sporeType, amount);
    }
    if (type === 'bundle') {
        let amount = scaleBeehiveRewardAmount(1, timing);
        return mk(amount > 1 ? `중첩 보상 x${amount}: 꽃가루 + 독벌침 + 형체 없는 이슬` : '중첩 보상: 꽃가루 + 독벌침 + 형체 없는 이슬', 'bundle', amount);
    }
    let amount = scaleBeehiveRewardAmount(10, timing);
    return mk(`꽃가루 +${amount}`, 'pollen', amount);
}
function applyBeehiveChoicePenalty(penalty, b) {
    if (!canPayBeehivePenalty(penalty)) return null;
    const cost = getBeehivePenaltyCost(penalty);
    if (cost) {
        if (cost.chance < 1 && Math.random() >= cost.chance) return `${cost.name} 소모 없음`;
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
    if (pick.effect === 'honey') { game.currencies.enchantedHoney = (game.currencies.enchantedHoney || 0) + amount; return `벌꿀 +${amount}`; }
    if (pick.effect === 'stinger') { game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount; return `독벌침 +${amount}`; }
    if (pick.effect === 'bundle') {
        game.currencies.pollen = (game.currencies.pollen || 0) + (20 * amount);
        game.currencies.venomStinger = (game.currencies.venomStinger || 0) + amount;
        game.currencies.formlessDew = (game.currencies.formlessDew || 0) + amount;
        return `꽃가루 +${20 * amount} / 독벌침 +${amount} / 형체 없는 이슬 +${amount}`;
    }
    if (pick.effect) {
        let merged = Object.entries(CURRENCY_LEGACY_MERGE || {}).find(([, legacyKeys]) => legacyKeys.includes(pick.effect));
        let currencyKey = merged ? merged[0] : pick.effect;
        game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + amount;
        return `${ORB_DB[currencyKey] ? ORB_DB[currencyKey].name : currencyKey} +${amount}`;
    }
    return '';
}
function startBeehiveRun(){
    let b = game.beehive || (game.beehive = {});
    if ((game.currencies.hiveKey || 0) <= 0 || b.inRun) return;
    if (atlas.inMap(game)) return addLog('진행 중인 지도를 마친 후 벌집에 입장하세요.', 'attack-monster');
    let lastDeepChaosDepth = Math.max(21, Math.min(game.abyssEndlessDepth || 21, game.loopProgressCurrent.bestAbyssDepth || 21));
    resetBeehiveRunModifiers(b);
    game.currencies.hiveKey--;
    b.entryDeepChaosDepth = lastDeepChaosDepth;
    b.inRun = true;
    b.branchStep = 0;
    b.inMapZoneId = 'beehive_run';
    b.returnZoneId = game.currentZoneId;
    b.queenActive = false;
    actExplorationProgress.depart(game);
    game.currentZoneId = 'beehive_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = true;
    prepareBeehiveBranchChoices(b);
    addLog(`🐝 벌집 원정 시작! 기준 난이도: 혼돈 심화 ${Math.max(21, Math.floor(b.entryDeepChaosDepth || 21))}, 갈림길을 선택하면 즉시 벌떼 웨이브가 시작됩니다.`, 'season-up');
    updateStaticUI();
}
function advanceBeehivePath(){
    let b = game.beehive;
    if (!b || !b.inRun || b.awaitingClear || b.pendingChoice || b.queenActive) return;
    prepareBeehiveBranchChoices(b);
    updateStaticUI();
}
function canResolveBeehiveChoice(b) {
    return !!b?.inRun && !!b.pendingChoice && !b.awaitingClear
        && !(game.enemies || []).some(enemy => enemy && enemy.hp > 0);
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
    let timingText = pick.timing === 'immediate' ? `즉시 지급(${rewardResult || '보상 없음'})` : (pick.timing === 'queen' ? `여왕벌 처치 후 지급(${rewardText || '보상 없음'})` : `웨이브 처치 후 지급(${rewardText || '보상 없음'})`);
    addLog(`🐝 갈림길 ${b.branchStep}/10 선택 완료: ${timingText}, 대가: ${penaltyText || '없음'}, 벌떼 웨이브 시작`, 'loot-magic');
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
    let b = game.beehive || {};
    if (!b.inRun || !b.queenActive) return;
    const rewardZone = getZone('beehive_run');
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
        const itemLevel = levelProgression.itemLevel(rewardZone, { isBoss: true });
        const tier = Math.min(getRealmEquipmentHiddenTierCap(rewardZone), levelProgression.maxDropTier(itemLevel));
        let item = levelProgression.stampItem(generateUniqueItem(tier, '무기', null, rewardZone), itemLevel);
        addItemToInventory(item);
    }
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
async function forfeitBeehiveRun() {
    const b = game.beehive;
    if (!b.inRun || pendingBeehiveForfeits.has(b)) return;
    const queenRewards = b.pendingQueenRewards;
    pendingBeehiveForfeits.add(b);
    try {
        const confirmed = await requestGameConfirmation('이미 받은 보상은 유지됩니다.\n아직 받지 않은 웨이브/여왕 보상은 사라지며, 입장 열쇠는 반환되지 않습니다.', {
            title: '벌집 원정을 포기할까요?', tone: 'danger', confirmLabel: '포기하고 귀환', cancelLabel: '계속 탐험'
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
    v.grandRun = { inRun: true, phase: 'survival', timeLeft: GRAND_BREACH_ENCOUNTER.durationSeconds, kills: 0, rewardVoidChisel: null, nextRefillAt: 0, lastTickAt: getCombatTime(), returnZoneId: game.currentZoneId };
    actExplorationProgress.depart(game);
    game.currentZoneId = 'grand_breach_run';
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.moveTimer = 0;
    game.combatHalted = false;
    if (!options || !options.automatic) addLog('🌌 대균열 진입! 35초 동안 무리가 점차 늘어납니다. 많이 처치할수록 군주 격파 보상이 증가합니다.', 'season-up');
    updateStaticUI();
}

function toggleMeteorAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterMeteor = !game.settings.autoEnterMeteor; addLog(`☄️ 운석 낙하 자동입장 ${game.settings.autoEnterMeteor ? '켜짐' : '꺼짐'}`, 'season-up'); updateStaticUI(); }
function toggleGrandBreachAutoEnter(){ game.settings = game.settings || {}; game.settings.autoEnterGrandBreach = !game.settings.autoEnterGrandBreach; addLog(`🌌 대균열 자동입장 ${game.settings.autoEnterGrandBreach ? '켜짐' : '꺼짐'}`, 'season-up'); autoEnterGrandBreachIfReady(); updateStaticUI(); }

function renderChaosRealmMapPanel() {
    let panel = document.getElementById('ui-chaos-realm-panel');
    let list = document.getElementById('ui-chaos-realm-list');
    if (!panel || !list) return;
    let st = ensureChaosRealmState();
    let best = Math.max(0, Number(st.woodsmanBestDamagePct || 0));
    if (!st.unlocked) {
        panel.innerHTML = `<div style="font-weight:700; color:#e9d7ff; margin-bottom:6px;">해금 조건</div><div>혼돈 밖 최종보스 나무꾼에게 <strong style="color:#ffd36b;">최대 생명력 10% 이상</strong>의 피해를 준 전투 종료 시 해금됩니다.</div><div style="margin-top:6px; color:var(--copy-bright);">현재 최고 피해율: <strong style="color:${best >= 10 ? '#7dffb2' : '#ffd36b'};">${best.toFixed(1)}%</strong></div>`;
        list.innerHTML = `<div class="map-item"><div class="map-item-main"><span>🔒</span><span>혼돈계 봉인<br><span class="map-zone-status">나무꾼 피해율 10% 이상 필요</span></span></div><div class="map-item-actions"><span class="map-zone-status">${best.toFixed(1)} / 10%</span></div></div>`;
        return;
    }
    let entryReady = canEnterChaosRealm();
    let floor = Math.max(1, Math.floor(st.currentFloor || 1));
    let highest = Math.max(1, Math.floor(st.highestFloor || 1));
    let affixes = getChaosRealmAffixes(floor);
    let bonus = st.permanentBonuses || {};
    let bonusLine = [`피해 +${(bonus.pctDmg||0).toFixed(1)}%`, `이속 +${(bonus.move||0).toFixed(1)}%`, `생명력 +${(bonus.pctHp||0).toFixed(1)}%`, `카오스저항 +${Math.floor(bonus.resChaos||0)}%`, `치명 +${Math.floor(bonus.crit||0)}%`, `관통 +${Math.floor(bonus.resPen||0)}%`, `방어/회피/보호막 +${Math.floor(bonus.armorPct||0)}%`, `치피 +${Math.floor(bonus.critDmg||0)}%`, `공속 +${Math.floor(bonus.aspd||0)}%`].join(', ');
    panel.innerHTML = `<div style="display:flex; justify-content:space-between; gap:10px; align-items:flex-start; flex-wrap:wrap;"><div><div style="font-weight:800; color:#efd6ff; font-size:15px;">혼돈계 영구 레이어</div><div style="color:var(--copy-bright); margin-top:4px;">루프로 초기화되지 않습니다. 최고 입장층 <strong style="color:#ffd36b;">${highest}층</strong>, 클리어 ${st.clearedFloors.length}층, 나무꾼 최고 피해율 ${best.toFixed(1)}%</div></div><button data-exploration-departure onclick="enterChaosRealmPrompt()" ${entryReady ? '' : 'disabled'}>층 선택 입장</button></div><div style="margin-top:8px; color:${entryReady ? '#d6e4ff' : '#ffcf8a'};">${entryReady ? `영구 보너스: ${bonusLine}` : '입장 조건: 이번 루프에서 혼돈 20 클리어 필요, 진행도/보너스는 보존됨'}</div><div style="margin-top:8px; color:#bda8ff;">현재 선택층 특징: ${affixes.map(a => `${a.name}(${a.desc})`).join(', ')}</div>${highest >= 10 ? '<div style="margin-top:6px; color:#7dffb2;">혼돈계 10층 효과 활성: 모든 액트 구간 지도 길이 50% 축소</div>' : ''}`;
    let zone = getZone(CHAOS_REALM_ZONE_ID);
    let echo = (game.woodsmanEchoRun && typeof game.woodsmanEchoRun === 'object') ? game.woodsmanEchoRun : { bestDps: 0 };
    let woodsmanEchoUnlocked = Array.isArray(game.journalEntries) && game.journalEntries.includes('woodsman_echo');
    list.innerHTML = `<div class="map-item ${game.currentZoneId === CHAOS_REALM_ZONE_ID ? 'current' : ''}" ${entryReady ? 'data-exploration-departure onclick="enterChaosRealmPrompt()"' : ''}><div class="map-item-main"><span>🌌</span><span>혼돈계 ${floor}층<br><span class="map-zone-status">난이도 기준: 혼돈 심화 ${zone ? zone.tier : getChaosRealmTier(floor)}급, 특징 ${affixes.length}개</span><br>${buildMapPowerEstimateHtml(zone)}</span></div><div class="map-item-actions"><span class="map-zone-status">${entryReady ? `입장 가능: 1 ~ ${highest}` : '혼돈 20 필요'}</span></div></div>`
        + (woodsmanEchoUnlocked ? `<div class="map-item ${game.currentZoneId === WOODSMAN_ECHO_ZONE_ID ? 'current' : ''}" data-exploration-departure onclick="enterWoodsmanEchoChallenge()"><div class="map-item-main"><span>🪵</span><span>나무꾼의 잔상 (전투력 측정)<br><span class="map-zone-status">30초 전투, 체력 ?, 공격하지 않는 허수아비(실체력 1000배)</span></span></div><div class="map-item-actions"><span class="map-zone-status">최고 DPS ${Math.floor(echo.bestDps || 0).toLocaleString()}</span></div></div>` : '');
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

function renderUnderworldMapPanel() {
    let panel = document.getElementById('ui-underworld-panel');
    let list = document.getElementById('ui-underworld-list');
    if (!panel || !list) return;
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    captureUiDisclosureState(panel);
    let floor = Math.max(1, Math.floor(uw.currentFloor || 1));
    let highest = Math.max(1, Math.floor(uw.highestFloor || 1));
    let canEnter = typeof canEnterUnderworld === 'function' && canEnterUnderworld();
    let entryLockReason = typeof getUnderworldEntryLockReason === 'function' ? getUnderworldEntryLockReason(game) : '';
    let runeState = game.underworldRunes || { unlockedSlots: 0, unlockedRunesMaxNumber: 0 };
    let runeCountMap = getUnderworldRuneCountMap(runeState.obtainedRunes);
    let runeLine = Object.keys(runeCountMap).sort((a,b)=>Number(a)-Number(b)).map(k => {
        let runeNo = Number(k);
        let def = getUnderworldRuneDef(runeNo);
        let label = def ? def.name : ('룬' + k);
        return `<button type="button" class="underworld-rune-chip" onclick="showUnderworldRuneTooltip(event,${runeNo})" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${runeNo})" onmousemove="showUnderworldRuneTooltip(event,${runeNo})" onmouseleave="hideInfoTooltip()">${label}×${runeCountMap[k]}</button>`;
    }).join('');
    let runeShardCount = Math.max(0, Math.floor((game.currencies || {}).runeShard || 0));
    let ticketLine = [
        `화염 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFlame || 0))}`,
        `냉기 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketFrost || 0))}`,
        `번개 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketStorm || 0))}`,
        `카오스 ${Math.max(0, Math.floor((game.currencies || {}).uberRootTicketChaos || 0))}`
    ].join(', ');
    let skyTower = ensureSkyTowerState();
    let skyStoneLevel = Math.max(0, Math.floor(((skyTower.skyStone || {}).level) || 0));
    let skyStonePct = typeof getSkyStoneReductionPct === 'function' ? getSkyStoneReductionPct() : 0;
    let skyStoneCost = typeof getSkyStoneNextCost === 'function' ? getSkyStoneNextCost() : 20;
    let skyStoneMaxed = skyStoneLevel >= (typeof getSkyStoneMaxLevel === 'function' ? getSkyStoneMaxLevel() : 15);
    let skyStonePanel = `<section class="underworld-upgrade-card"><div><strong>창공석 ${skyStoneLevel > 0 ? `+${skyStoneLevel}` : '미제작'}</strong><span>중력 패널티 감소 ${skyStonePct}% / 75%</span></div><div><span>응축된 창공의 정수 ${Math.floor(skyTower.condensedPower || 0)}</span><button onclick="upgradeSkyStone()" ${skyStoneMaxed ? 'disabled' : ''}>${skyStoneLevel > 0 ? '강화' : '제작'}, ${skyStoneMaxed ? '최대' : skyStoneCost}</button></div></section>`;
    let slots = Array.from({ length: 6 }).map((_, idx) => {
        let no = (Array.isArray(runeState.equippedRunes) ? runeState.equippedRunes : [])[idx];
        let unlocked = idx < Math.max(0, Math.floor(runeState.unlockedSlots || 0));
        let def = no ? getUnderworldRuneDef(no) : null;
        let label = unlocked ? (def ? def.name : (no ? `룬${no}` : '비어있음')) : '잠김';
        let effect = unlocked && def ? getUnderworldRuneEffectHtml(no) : (unlocked ? '클릭해 장착' : `${(idx+1)*10}층 격파`);
        let tooltip = no ? `showUnderworldRuneTooltip(event,${no})` : '';
        let attrs = unlocked ? `onclick="openUnderworldRuneOverlay(${idx})" data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"` : 'disabled';
        return `<button type="button" class="underworld-rune-slot ${unlocked ? 'unlocked' : 'locked'}" ${attrs}><span class="underworld-rune-slot-no">${idx + 1}</span><strong>${label}</strong><small>${effect}</small></button>`;
    }).join('');
    let powerEstimate = buildMapPowerEstimateHtml(getUnderworldZone(highest));
    let currentFloorButton = floor === highest ? '' : `<button type="button" data-exploration-departure onclick="enterUnderworldFloor(${floor})" ${canEnter ? '' : 'disabled'}>${floor}층 입장</button>`;
    underworldRuneUi.updateMarkup(list, `<section class="underworld-entry-card ${game.currentZoneId === UNDERWORLD_ZONE_ID ? 'current' : ''}"><div class="underworld-entry-copy"><span>최고층 도전 기준, 현재 선택 ${floor}층</span><strong>도달 최고 ${highest}층</strong><div>${powerEstimate}</div></div><div class="underworld-entry-actions"><button type="button" class="underworld-primary-action" data-exploration-departure onclick="enterUnderworldFloor(${highest})" ${canEnter ? '' : 'disabled'}>최고층 ${highest} 입장</button>${currentFloorButton}<button type="button" data-exploration-departure onclick="enterUnderworldPrompt()" ${canEnter ? '' : 'disabled'}>다른 층…</button></div></section>`);
    underworldRuneUi.updateMarkup(panel, `<div class="underworld-panel-head"><div><strong>룬 장착과 영구 강화</strong><span class="${canEnter ? '' : 'locked'}">${canEnter ? '입장 가능' : entryLockReason}, 15층부터 지속 피해</span></div><div class="underworld-resource-strip"><span>룬 조각 <b>${runeShardCount}</b></span><span>구리 <b>${Math.floor((game.currencies||{}).underCopper||0)}</b></span><span>은 <b>${Math.floor((game.currencies||{}).underSilver||0)}</b></span><span>금 <b>${Math.floor((game.currencies||{}).underGold||0)}</b></span></div></div>
        <section class="underworld-rune-console"><div class="underworld-section-head"><div><strong>장착 룬</strong><span>${underworldRuneUi.progressLabel(runeState)}</span></div></div><div class="underworld-rune-slots">${slots}</div></section>
        <div class="underworld-action-grid"><section><h4>룬 제작, 성장</h4><div><button onclick="craftUnderworldRune()" ${runeShardCount < 10 || !runeState.unlockedRunesMaxNumber || game.woodsmanBuildLock ? 'disabled' : ''}><strong>룬 가공</strong><span>조각 10</span></button><button onclick="openUnderworldRuneUpgradeOverlay()"><strong>룬 승급</strong><span>동일 룬 3개</span></button><button onclick="enhanceUnderworldRune()"><strong>룬 강화</strong><span>수치 성장</span></button><button onclick="rerollUnderworldRuneBonus()"><strong>옵션 리롤</strong><span>추가 옵션 변경</span></button></div></section><section><h4>장비 가공</h4><div><button onclick="applyUnderworldEnchant()"><strong>장비 인챈트</strong><span>지하계 제작</span></button><button onclick="attemptUnderworldLimitBreak()"><strong>한계돌파</strong><span>성공률 20%</span></button></div></section></div>
        <div class="underworld-lower-grid">${skyStonePanel}<details class="underworld-inventory-card" data-ui-disclosure="underworld-rune-inventory"><summary>보유 룬 ${Object.values(runeCountMap).reduce((sum, count) => sum + count, 0)}개, 그림자 뿌리 입장권</summary><div class="underworld-rune-inventory">${runeLine || '<span class="core-cube-muted">없음</span>'}</div><p>그림자 뿌리 입장권: ${ticketLine}</p></details></div>`);
    restoreUiDisclosureState(panel);
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
    if (!def) return `<span style="color:var(--copy-muted);">룬 정보 없음</span>`;
    let tone = typeof getItemStatToneColor === 'function' ? getItemStatToneColor(def.stat) : '#dce6ff';
    let level = Math.max(0, Number(game.underworldRunes?.enhanceLvByNo?.[no]) || 0);
    return `<span style="color:${tone};">${getStatName(def.stat)} +${formatValue(def.stat, def.val*(1+level*0.01))}${P_STATS[def.stat]?.isPct ? '%' : ''}${level ? `, +${level}` : ''}</span>`;
}
function buildUnderworldRuneTooltipHtml(no) {
    let def = getUnderworldRuneDef(no);
    if (!def) return '<div class="tooltip-title">알 수 없는 룬</div><div class="tooltip-line">룬 효과 정보가 없습니다.</div>';
    let st = ensureUnderworldRuneState();
    let lv = Math.max(0, Math.floor(st.enhanceLvByNo[def.no] || 0));
    let boosted = Number(def.val || 0) * (1 + lv * 0.01);
    let mainLine = `${getStatName(def.stat)} +${formatValue(def.stat, boosted)}${P_STATS[def.stat]?.isPct ? '%' : ''}${lv > 0 ? ` <span style="color:var(--copy-bright);">(+${lv} 강화)</span>` : ''}`;
    let bonusLines = (st.bonusLinesByNo[def.no] || []).map(line => `<div class="tooltip-line" style="color:${getItemStatToneColor(line.stat)};">보너스, ${getStatName(line.stat)} +${formatValue(line.stat, line.val)}${P_STATS[line.stat]?.isPct ? '%' : ''}</div>`).join('');
    return `<div class="tooltip-title">${escapeHTML(def.name)} <span style="color:var(--copy-bright);">룬${def.no}</span></div><div class="tooltip-line" style="color:${getItemStatToneColor(def.stat)};">${mainLine}</div>${bonusLines || '<div class="tooltip-line" style="color:var(--copy-muted);">강화 보너스 옵션 없음</div>'}`;
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
            // 인벤토리에서 해당 룬 1개 제거 후 슬롯에 장착
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
    if (keys.length === 0) return '<div class="underworld-rune-empty">보관 중인 룬이 없습니다.</div>';
    return keys.map(key => {
        let no = Number(key);
        let def = getUnderworldRuneDef(no);
        let title = def ? def.name : `룬${no}`;
        return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="equipUnderworldRuneToSlot(${slotIndex},${no})"><strong>${title}</strong><span>보유 ${runeCountMap[key]}개, ${getUnderworldRuneEffectHtml(no)}</span></button>`;
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
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">룬 슬롯 ${idx + 1} 선택</div><div class="underworld-rune-overlay-desc">보유한 룬을 클릭해 장착하거나 현재 슬롯을 비울 수 있습니다.</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">닫기</button></div><div class="underworld-rune-current">${current}</div><div class="underworld-rune-option-grid">${getUnderworldRuneOverlayOptionsHtml(idx, runeCountMap)}</div><div class="underworld-rune-overlay-actions"><button type="button" onclick="unequipUnderworldRuneSlot(${idx})" ${st.equippedRunes[idx] ? '' : 'disabled'}>이 슬롯 해제</button></div></div>`;
    document.body.appendChild(overlay);
    underworldRuneUi.mountOverlay(overlay, `.underworld-rune-slot:nth-child(${idx+1})`);
}
function craftUnderworldRune() {
    if (!assertBuildEditable()) return;
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
    queueImportantSave(200);
}
function getUnderworldRuneUpgradeOptionHtml(no, count, unlockedMax) {
    let shardNeed = Math.max(5, no);
    let canPay = (game.currencies.runeShard || 0) >= shardNeed;
    let canUpgrade = no < unlockedMax && canPay;
    let target = no + 1;
    let def = getUnderworldRuneDef(no);
    let toDef = getUnderworldRuneDef(target);
    let status = canUpgrade ? `룬${target}으로 승급, 룬조각 ${shardNeed}` : (no >= unlockedMax ? `룬${target} 해금 필요` : `룬조각 부족 (${shardNeed})`);
    let title = def ? `${def.name} 룬${no}` : `룬${no}`;
    let targetName = toDef ? `${toDef.name} 룬${target}` : `룬${target}`;
    return `<button type="button" class="underworld-rune-option" data-info-tooltip-anchor="1" onmouseenter="showUnderworldRuneTooltip(event,${no})" onmousemove="showUnderworldRuneTooltip(event,${no})" onmouseleave="hideInfoTooltip()" onclick="upgradeUnderworldRune(${no})" ${canUpgrade ? '' : 'disabled'}><strong>${title} ×${count}</strong><span>${getUnderworldRuneEffectHtml(no)}</span><span>→ ${targetName}, ${status}</span></button>`;
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
    let options = rows.map(no => getUnderworldRuneUpgradeOptionHtml(no, count[no], unlockedMax)).join('');
    overlay.innerHTML = `<div class="underworld-rune-overlay-panel"><div class="underworld-rune-overlay-head"><div><div class="underworld-rune-overlay-title">룬 승급 대상 선택</div><div class="underworld-rune-overlay-desc">동일 번호 룬 3개와 룬조각을 사용해 어떤 룬을 다음 번호로 승급할지 선택하세요.</div></div><button type="button" onclick="closeUnderworldRuneOverlay()">닫기</button></div><div class="underworld-rune-option-grid">${options}</div></div>`;
    document.body.appendChild(overlay);
    underworldRuneUi.mountOverlay(overlay, '.underworld-action-grid button[onclick="openUnderworldRuneUpgradeOverlay()"]');
}
function upgradeUnderworldRune(fromNo) {
    if (!assertBuildEditable()) return;
    if (fromNo == null) return openUnderworldRuneUpgradeOverlay();
    let st = ensureUnderworldRuneState();
    let count = getUnderworldRuneCountMap(st.obtainedRunes);
    let from = Number.isInteger(fromNo) ? fromNo : 0;
    if (!(count[from] >= 3) || from >= 30) return addLog('동일 번호 룬 3개가 필요합니다. (룬30은 승급 불가)', 'attack-monster');
    let shardNeed = Math.max(5, from);
    if ((game.currencies.runeShard || 0) < shardNeed) return addLog(`룬 조각이 부족합니다. (필요: ${shardNeed})`, 'attack-monster');
    let unlockedMax = Math.max(1, Math.min(30, Math.floor(st.unlockedRunesMaxNumber || 1)));
    if (from >= unlockedMax) return addLog(`현재는 룬${from}을 승급할 수 없습니다. (해금된 최대 번호: ${unlockedMax})`, 'attack-monster');
    game.currencies.runeShard -= shardNeed;
    let removed = 0;
    st.obtainedRunes = st.obtainedRunes.filter(n => Math.floor(n || 0) === from && removed++ < 3 ? false : true);
    let to = Math.min(unlockedMax, from + 1);
    st.obtainedRunes.push(to);
    autoEquipUnderworldRune(to);
    closeUnderworldRuneOverlay();
    let def = getUnderworldRuneDef(to);
    addLog(`🧿 룬 승급 성공: 룬${from}×3 + 룬조각 ${shardNeed} → ${def ? def.name : ('룬'+to)} (${def ? `${getStatName(def.stat)} +${formatValue(def.stat, def.val)}` : ''})`, 'loot-unique');
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
        if (condition) button.title = condition;
        else button.removeAttribute('title');
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

safeExposeGlobals({ syncMapPrimaryContentTabs });

function switchMapSubtab(subtabId) {
    if (!contentProgression.canOpen(subtabId)) return;
    if (!isMapPrimaryContentUnlocked(game, subtabId)) subtabId = 'map-tab-zones';
    if (subtabId === game.mapSubtab) {
        if (isSelectedSubtab(subtabId)) {
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
    if (subtabId === 'map-tab-pvp' && typeof renderGhostArena === 'function') renderGhostArena();
    const renderRegion = {
        'map-tab-underworld': renderUnderworldMapPanel,
        'map-tab-ocean': () => oceanDiveUi.render(),
        'map-tab-fishing': () => fishingUi.render()
    };
    renderRegion[subtabId]?.();
    renderMobileMapNavigation();
    explorationAtlasUi.syncLocation();
}

function switchMapExploreSubtab(subtabId) {
    if (!contentProgression.canOpen(subtabId)) return;
    const fallback = 'map-explore-hunting';
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

// 좌측 탐험 목록에서 이 세부 탭 버튼이 실제로 노출 중인지(해금됐는지) 본다.
function isMapExploreSubtabOpenable(subtabId) {
    let btn = document.getElementById('btn-' + subtabId);
    return !!btn && btn.style.display !== 'none';
}

// 지도 탭의 빨간 점을 켠 원인 세부 화면을 돌려준다. 액트 보상 미수령이 우선이고,
// 그다음이 아직 열어 보지 않은 신규 해금이다.
function getMapAlarmSourceSubtab() {
    if (getAvailableActRewardZoneIds().length > 0) return 'map-explore-hunting';
    ensureMapAlarmState();
    let sigs = getMapExploreUnlockSignatures();
    return MAP_EXPLORE_ALARM_SUBTABS.find(key => {
        let seen = game.mapAlarmSeen[key];
        return seen !== undefined && sigs[key] > seen && isMapExploreSubtabOpenable(key);
    }) || null;
}

// 알람을 보고 지도를 열었으면 마지막에 보던 화면이 아니라 알람을 띄운 화면부터 연다.
// (알림 플래그를 끄기 전에 판정해야 하므로 switchTab의 알림 해제보다 앞에서 호출한다.)
function focusMapAlarmSourceSubtab() {
    if (!(game.noti && game.noti.map && isNotiEnabled('map'))) return;
    let source = getMapAlarmSourceSubtab();
    if (!source) return;
    game.mapSubtab = 'map-tab-zones';
    game.mapExploreSubtab = source;
}

// 탐험 좌측 세부 탭 버튼 노출 여부를 갱신한다. subtabId는 패널/버튼 id의 공통 키
// (예: 'map-explore-chaos')다. 잠긴 세부 탭이 현재 선택되어 있으면 나무 탭으로 되돌린다.
function setExploreSubtabAvailable(subtabId, available) {
    let btn = document.getElementById('btn-' + subtabId);
    if (btn) btn.style.display = available ? '' : 'none';
    if (!available && game.mapExploreSubtab === subtabId) switchMapExploreSubtab('map-explore-hunting');
}
function enterLabyrinthFloor(floor){ if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked(); game.labyrinthFloor=Math.max(1,Math.floor(floor||1)); changeZone(LABYRINTH_ZONE_ID); updateStaticUI(); }

async function confirmSkyTowerEntry() {
    if (getSkyTowerRemainingClears() === 0) return requestGameConfirmation('이번 루프의 등반 기록과 응축 보상은 더 늘지 않습니다.', {
        title: '보상 없는 연습 전투', tone: 'warning', confirmLabel: '연습 입장'
    });
    if (game.settings.mapCompleteAction !== 'repeatZone') return true;
    return requestGameConfirmation("현재 맵 완료 행동이 '같은 지역 반복'입니다. 돌파 후 같은 층에 머무릅니다.", {
        title: '반복 설정 확인', tone: 'warning', confirmLabel: '그대로 입장'
    });
}
async function selectSkyTowerFloor(tower, selectedFloor) {
    const max = tower.highestFloor;
    let value = selectedFloor;
    if (value === undefined && max > 1) value = await requestGameNumber({
        title: '창공의 탑 층 선택',
        message: `이번 루프 남은 보상 전투: ${getSkyTowerRemainingClears()}/${getSkyTowerLoopClearLimit()}`,
        min: 1, max, value: tower.currentFloor, confirmLabel: '입장'
    });
    if (value === undefined) value = 1;
    if (value === null) return null;
    const floor = Number(value);
    if (Number.isInteger(floor) && floor >= 1 && floor <= max) return floor;
    addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    return null;
}
function skyEntryStillCurrent(tower, season, zoneId) {
    return game.skyTower === tower && game.season === season &&
        game.currentZoneId === zoneId && canEnterSkyTower();
}
async function enterSkyTowerPrompt(selectedFloor) {
    if (isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    const st = ensureSkyTowerState();
    if (!st.unlocked) return addLog('창공의 탑은 루프 15 이후 이번 루프 혼돈 20층 클리어 시 해금됩니다.', 'attack-monster');
    if (!canEnterSkyTower()) return addLog('창공의 탑은 영구 해금 후 해당 루프에서 혼돈에 입성하면 입장할 수 있습니다.', 'attack-monster');
    const season = game.season;
    const zoneId = game.currentZoneId;
    if (!await confirmSkyTowerEntry()) return;
    const floor = await selectSkyTowerFloor(st, selectedFloor);
    if (floor === null) return;
    if (!skyEntryStillCurrent(st, season, zoneId)) return;
    if (isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (floor > st.highestFloor) return;
    st.currentFloor = floor;
    changeZone(SKY_TOWER_ZONE_ID);
    updateStaticUI();
}
function upgradeSkyStone() {
    if (!assertBuildEditable()) return;
    let st = ensureSkyTowerState();
    if (!st.unlocked) return;
    let max = getSkyStoneMaxLevel();
    let lv = Math.max(0, Math.floor(((st.skyStone || {}).level) || 0));
    if (lv >= max) return addLog('창공석은 이미 최종 강화 상태입니다.', 'attack-monster');
    let cost = getSkyStoneNextCost();
    if (Math.max(0, Math.floor(st.condensedPower || 0)) < cost) return addLog(`응축된 창공의 정수가 부족합니다. (필요: ${cost})`, 'attack-monster');
    st.condensedPower -= cost;
    st.skyStone = st.skyStone || { crafted: false, level: 0 };
    st.skyStone.crafted = true;
    st.skyStone.level = lv + 1;
    addLog(`창공석 ${lv === 0 ? '제작' : '강화'} 완료: 지하계 패널티 감소 ${getSkyStoneReductionPct()}%`, 'loot-unique');
    queueImportantSave(200);
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
function enterUnderworldFloor(requestedFloor) {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return addLog('지하계 입장 조건: 야수왕 케르베로스 클리어 + 혼돈 심화 30층 + 고대 미궁 100층 + 이번 루프 혼돈20 클리어', 'attack-monster');
    let uw = (game.underworldProgress && typeof game.underworldProgress === 'object') ? game.underworldProgress : { highestFloor: 1, currentFloor: 1 };
    game.underworldProgress = uw;
    let max = Math.max(1, Math.floor(uw.highestFloor || 1));
    let floor = Math.floor(Number(requestedFloor) || 0);
    if (floor < 1 || floor > max) return addLog(`1~${max} 범위의 층수를 입력하세요.`, 'attack-monster');
    uw.currentFloor = floor;
    changeZone(UNDERWORLD_ZONE_ID);
    updateStaticUI();
}

async function enterUnderworldPrompt(){
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!(typeof canEnterUnderworld === 'function' && canEnterUnderworld())) return enterUnderworldFloor(1);
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
    enterUnderworldFloor(v);
}

safeExposeGlobals({ enterUnderworldFloor, enterUnderworldPrompt });

function enterTrialWithTicket(trialId) {
    if (!contentProgression.isUnlocked('battleTrials')) return addLog('루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.', 'attack-monster');
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
/** 개화 재능은 고르지 않는다: 지금 전직이 속한 직업의 대표 재능(2026-10-02 재능 정리). */
async function chooseTalentBloomHeroId() {
    return getTalentBloomHeroIdForAscendancy(game.ascendClass) || HERO_SELECTION_ORDER[0];
}

async function enterTalentBloomTrial() {
    if (typeof isBeehiveRunLockedForMapTravel === 'function' && isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    if (!isWoodsmanEchoUnlocked()) return addLog('🔒 나무꾼의 잔상이 아직 열리지 않았습니다. 혼돈 밖 나무꾼을 100% 처치하세요.', 'attack-monster');
    if (!game.ascendClass) return addLog('🔒 재능 개화는 전직을 고른 뒤 도전할 수 있습니다.', 'attack-monster');
    if ((game.currencies.chaosKey || 0) < 1 || (game.currencies.coreKey || 0) < 1) return addLog('🔒 카오스 키와 코어 키가 각각 1개씩 필요합니다.', 'attack-monster');
    let heroId = await chooseTalentBloomHeroId();
    if (!HERO_SELECTION_DEFS[heroId]) return;
    game.pendingTalentBloomHeroId = heroId;
    addLog(`개화 시련 도전: [${getTalentCardName(heroId, game.ascendClass).bloomName}] (${HERO_SELECTION_DEFS[heroId].label} 재능 × ${CLASS_TEMPLATES[game.ascendClass].name})`, 'season-up');
    if (typeof saveGame === 'function') saveGame({ skipCloudSync: true });
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
    let powerEstimate = buildMapPowerEstimateHtml(getZone(getAbyssZoneIdForDepth(state.currentDepth)));
    return `<div class="map-item map-item--deep-chaos ${current}" data-exploration-departure onclick="enterDeepChaosPrompt()">
        <div class="map-item-main"><span>♾️</span><span>혼돈 심화층<br><span class="map-zone-status">현재 심화층: ${state.currentDepth}층, 최고 기록: ${state.highestDepth}층</span><br>${powerEstimate}</span></div>
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


function toggleSeasonBossRepeat() {
    game.autoRepeatSeasonBoss = !game.autoRepeatSeasonBoss;
    addLog(`🗝️ 뿌리 보스 반복 도전: ${game.autoRepeatSeasonBoss ? '켜짐' : '꺼짐'}`, 'season-up');
    updateStaticUI();
}

/** The gem picker's "worn only" fold, one per library ('attack' | 'support'). */
function toggleGemFoldMode(mode) {
    if (mode === 'attack') {
        game.gemFoldInactiveAttack = !game.gemFoldInactiveAttack;
    } else if (mode === 'support') {
        game.gemFoldInactiveSupport = !game.gemFoldInactiveSupport;
    }
    updateStaticUI();
}

// The first matching tag names a gem card's kind (이동: worn in the 이동 스킬 slot, js/mobility-skill.js).
const GEM_TYPE_LABELS = Object.freeze([['summon_attack', '소환'], ['mobility', '이동'], ['spell', '주문'], ['projectile', '투사체'], ['slam', '강타']]);
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
    let typeLabel = GEM_TYPE_LABELS.find(([tag]) => tags.includes(tag))?.[1] || '공격';
    let presentation = elementMap[element] || elementMap.phys;
    // elementLabel: a gem that hits with more than one element (분광 위습 소환) names them itself.
    return { typeLabel: typeLabel, icon: presentation.icon, elementLabel: def?.elementLabel || presentation.label, className: presentation.className };
}

function getSkillGemArtPath(name) {
    return typeof SKILL_GEM_ART_PATHS !== 'undefined' && SKILL_GEM_ART_PATHS[name]
        ? pixelIconPath(SKILL_GEM_ART_PATHS[name])
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
    // 젬 상세(getUiGemPresentation)는 이미 한글로 바꾼 꼬리표를 넘긴다: 색을 고르려면 원래 키로 되돌린다(근접 → melee).
    let tagKey = tag => SKILL_TAG_LABELS[tag] ? tag : (Object.keys(SKILL_TAG_LABELS).find(key => SKILL_TAG_LABELS[key] === tag) || tag);
    let getTone = rawTag => {
        let tag = tagKey(rawTag);
        if (['fire', 'cold', 'light', 'lightning', 'chaos', 'phys', 'physical'].includes(tag)) return tag === 'light' ? 'lightning' : tag === 'phys' ? 'physical' : tag;
        if (['summon_attack', 'minion', 'summon'].includes(tag)) return 'summon';
        if (['spell', 'projectile', 'melee', 'slam', 'chain', 'pierce', 'dot', 'aoe', 'utility', 'curse', 'warcry', 'guard'].includes(tag)) return tag;
        return 'neutral';
    };
    return rawTags.slice(0, maxTags || 4).map(tag => {
        let label = typeof translateSkillTag === 'function' ? translateSkillTag(tag) : tag;
        return `<span class="gem-tag gem-tag--${getTone(tag)}">${escapeHTML(label)}</span>`;
    }).join('');
}

/** One line under a tile: how the gem attacks (range kind and reach), or the summon's element and kind. */
function getGemTileSummary(name, def) {
    let meta = getGemCardMeta(def);
    if ((def.tags || []).includes('summon_attack')) return `${meta.elementLabel} ${meta.typeLabel}`;
    let profile = getSkillGridProfile(name, def);
    return `${getSkillGridProfileKindLabel(profile.kind)}, ${Math.max(1, profile.range || 1)}칸`;
}

/** Tiles open the detail on click / Enter / Space (js/gem-selection-ui.js); a mouse hover shows the short hint. */
function getGemTileHandlers(type, name) {
    let action = `gemSelectionUi.open(this,'${type}','${name}')`;
    return `role="button" tabindex="0" onclick="${action}" onkeydown="if(event.target===this&&(event.key==='Enter'||event.key===' ')){event.preventDefault();${action};}" onpointerenter="showGemCardHint(event,'${type}','${name}')" onpointerleave="hideInfoTooltip()"`;
}

function renderGemTileLevel(gemInfo) {
    return `<span class="gem-tile-level ${gemInfo.totalLevel > gemInfo.baseLevel ? 'effective' : ''}">Lv.${formatValue('', gemInfo.totalLevel)}</span>`;
}

/** 2026-10-04 젬 보드: the library lists compact tiles (art · name · Lv · one line). Range numbers, tags, seal and summon
 * count live in the detail the tile opens. */
function renderAttackGemCard(name, highlightedName, stats) {
    let def = SKILL_DB[name] || {};
    let gemInfo = getUiGemPresentation(name, false, stats);
    let meta = getGemCardMeta(def);
    let summonEquipped = (def.tags || []).includes('summon_attack') && (game.equippedSummonSkills || []).includes(name);
    let active = summonEquipped || [game.activeSkill, game.mobilitySkill].includes(name);
    let equipmentReady = typeof canUseSkillWithCurrentEquipment !== 'function' || canUseSkillWithCurrentEquipment(name);
    let tutorialTarget = getStarterGemTutorialTarget() === name && !active;
    let state = equipmentReady ? getGemTileSummary(name, def) : '방패 필요';
    let classes = ['skill-gem', 'gem-library-card', 'gem-tile', `element-${meta.className}`, active ? 'active' : '', equipmentReady ? '' : 'equipment-blocked', tutorialTarget ? 'starter-gem-tutorial-target' : ''].filter(Boolean).join(' ');
    let worn = active ? `<span class="gem-tile-worn">${summonEquipped ? `소환 ×${getSummonSkillCount(name)}` : '장착'}</span>` : '';
    let guide = tutorialTarget ? '<span class="starter-gem-equip-guide">첫 스킬 젬, 눌러서 장착</span>' : '';
    return `<article class="${classes}" ${getGemTileHandlers('active', name)} aria-label="${escapeHTML(name)} Lv.${formatValue('', gemInfo.totalLevel)}${active ? ', 장착 중' : ''}${equipmentReady ? '' : ', 방패 필요'}">
        ${guide}${renderGemTileLevel(gemInfo)}${worn}${renderSkillGemArt(name, 'gem-card-sigil gem-card-art gem-tile-art')}
        <strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">${escapeHTML(state)}</small>
    </article>`;
}

/** Why a support gem cannot go on right now ('' when it can, or when it is already worn). */
function getSupportEquipFailure(name, stats) {
    if ((game.equippedSupports || []).includes(name)) return '';
    let equippedSupports = game.equippedSupports || [];
    let supportCap = Math.max(0, Math.floor((stats && stats.suppCap) || 0));
    if (equippedSupports.length >= supportCap) return `장착 한도 부족 (${equippedSupports.length}/${supportCap})`;
    if (isSummonGuardSupport(name) && getEquippedSummonCount() >= getSummonEquipCapFromStats(stats)) {
        return `소환수 한도 부족 (${getEquippedSummonCount()}/${getSummonEquipCapFromStats(stats)})`;
    }
    let used = equippedSupports.reduce((sum, supportName) => sum + getSupportTierResonanceCost(supportName), 0);
    let available = Math.max(0, getEffectiveResonanceCap(stats) - used);
    let cost = getSupportTierResonanceCost(name);
    return available < cost ? `공명력 부족 (${available}/${cost})` : '';
}

function renderSupportGemCard(name, highlightedName, stats) {
    let def = SUPPORT_GEM_DB[name] || {};
    let gemInfo = getUiGemPresentation(name, true, stats);
    let active = (game.equippedSupports || []).includes(name);
    let failure = getSupportEquipFailure(name, stats);
    let tier = getSupportActiveTier(name);
    let state = failure || `${def.name || getStatName(def.stat || '')}, 공명 ${getSupportTierResonanceCost(name)}`;
    let classes = ['skill-gem', 'support-gem', 'gem-library-card', 'gem-tile', active ? 'active' : '', failure ? 'equipment-blocked' : ''].filter(Boolean).join(' ');
    return `<article class="${classes}" ${getGemTileHandlers('support', name)} aria-label="${escapeHTML(name)}${active ? ', 장착 중' : (failure ? `, ${escapeHTML(failure)}` : '')}">
        ${renderGemTileLevel(gemInfo)}${active ? '<span class="gem-tile-worn">장착</span>' : ''}<span class="gem-card-sigil gem-tile-art gem-tile-support-art" aria-hidden="true">✚<em>${'◆'.repeat(Math.max(1, Math.min(3, tier)))}</em></span>
        <strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">${escapeHTML(state)}</small>
    </article>`;
}

/** Gem card hover, mouse only (a tap opens the detail instead): the name and full description. Range, numbers and tags
 * live in the detail popover that a click, Enter or Space opens (js/gem-selection-ui.js). */
function showGemCardHint(event, type, name) {
    if (event.pointerType !== 'mouse' || document.getElementById('gem-selection')?.matches(':popover-open')) return;
    const support = type === 'support';
    const info = getUiGemPresentation(name, support, cachedTooltipStats || getUiPlayerStats());
    const html = `<div class="tooltip-title">${escapeHTML(name)}</div><div class="tooltip-line">${statToneText.markup(keepKoreanUnitParticles(escapeHTML(info.desc || '')))}</div>`
        + '<div class="tooltip-line gem-card-hint">클릭하면 범위, 수치, 태그 상세</div>';
    showInfoTooltipHtml(event.clientX, event.clientY, html, support ? '#2bcbba' : '#ff5252', `hint:${type}:${name}`);
}

function renderSealedGemCard(name, highlightedName, isSupport) {
    let releaseCall = isSupport ? `unsealSupportGem('${name}')` : `unsealSkillGem('${name}')`;
    let art = isSupport ? '<span class="gem-card-sigil gem-tile-art gem-tile-support-art" aria-hidden="true">✚</span>' : renderSkillGemArt(name, 'gem-card-sigil gem-card-art gem-tile-art');
    return `<article class="skill-gem gem-library-card gem-tile sealed-gem-card">${art}<strong class="gem-tile-name">${highlightedName}</strong><small class="gem-usage-state">봉인됨, 공명력 1로 복원</small><button type="button" class="gem-card-utility" onclick="${releaseCall}">봉인 해제</button></article>`;
}

/** 젬 레벨 구성(2026-10-09): 최종 레벨을 크게, 기본/재료와 각성/장비와 패시브를 한 막대에 나눠 칠하고, 그 아래 전투 수치 칩. 작은 4칸 표였다. */
function getGemGrowthSummaryHtml(name, presentation) {
    if (!presentation || !presentation.skill) return '';
    const base = Number(presentation.baseLevel) || 1, material = Number(presentation.materialBonus) || 0;
    const total = Number(presentation.totalLevel || presentation.finalLevel) || 1;
    const parts = [['base', '기본', base], ['material', '재료/각성', material], ['source', '장비/패시브', Math.max(0, total - base - material)]];
    const bar = parts.map(([key, , value]) => `<i class="is-${key}" style="flex-grow:${value}"></i>`).join('');
    const legend = parts.map(([key, label, value]) => `<span class="is-${key}">${label} <b>${key === 'base' ? '' : '+'}${formatValue('', value)}</b></span>`).join('');
    return `<div class="gem-level"><div class="gem-level-final"><small>최종</small><b>Lv.${formatValue('', total)}</b></div><div class="gem-level-bar" aria-hidden="true">${bar}</div>`
        + `<div class="gem-level-legend">${legend}</div></div>${getGemCombatChipsHtml(presentation.skill)}`;
}

function getGemCombatChipsHtml(skill) {
    const chips = [Number.isFinite(skill.dmg) ? ['피해 계수', skill.dmg.toFixed(2)] : null, Number.isFinite(skill.spd) ? ['속도', skill.spd.toFixed(2)] : null,
        Number.isFinite(skill.crit) ? ['치명타', `${skill.crit.toFixed(1)}%`] : null].filter(Boolean);
    return chips.length ? `<div class="gem-level-stats">${chips.map(([label, value]) => `<span><small>${label}</small><b>${value}</b></span>`).join('')}</div>` : '';
}

function renderGemEnhanceTargetCard(name, selected, stats) {
    let def = SKILL_DB[name] || {};
    let rec = normalizeGemRecord((game.gemData || {})[name]);
    let info = getUiGemPresentation(name, false, stats);
    let meta = getGemCardMeta(def);
    let enhanceCount = getSkyEnhancementForSkill(name).length;
    return `<button class="gem-target-card element-${meta.className} ${selected ? 'selected' : ''}" onclick="selectGemEnhanceTargetSkill('${name}')">${renderSkillGemArt(name, 'gem-target-icon')}<span><strong>${escapeHTML(name)}</strong><small>Lv.${formatValue('', info.totalLevel)}, 퀄리티 ${rec.quality || 0}%, 각인 ${enhanceCount}/${rec.skyEnhanceCap || 1}</small></span>${selected ? '<b>선택</b>' : ''}</button>`;
}

function renderGemResourceStrip(activeGem, condensedPower) {
    let root = document.getElementById('ui-gem-resource-strip');
    if (!root) return;
    root.innerHTML = `<div><span>젬 잔향</span><strong>${game.currencies.gemShard || 0}</strong></div><div><span>군주의 핵</span><strong>${game.currencies.bossCore || 0}</strong></div><div><span>창공의 정수</span><strong>${game.currencies.skyEssence || 0}</strong></div><div><span>응축 창공</span><strong>${Math.floor(condensedPower || 0)}</strong></div><div><span>각성 잔향</span><strong>${game.currencies.awakenedEcho || 0}</strong></div><div><span>고른 젬</span><strong>${!activeGem ? '없음' : activeGem.awakened ? '각성' : '각성 전'}</strong></div>`;
}

function bindGemEngraveSlotControls(root) {
    if (!root || root.dataset.engraveSlotControlsBound === 'true') return;
    root.dataset.engraveSlotControlsBound = 'true';
    root.addEventListener('pointerdown', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (button && root.contains(button)) event.stopPropagation();
    });
    root.addEventListener('click', event => {
        let button = event.target && event.target.closest ? event.target.closest('button[data-slot-index]') : null;
        if (!button || !root.contains(button) || button.disabled || button.dataset.slotState === 'locked') return;
        event.stopPropagation();
        openGemEngraveSlotOverlay(button.dataset.slotIndex);
    });
}

function renderGemEngraveSlots(activeSlots, engraveCap) {
    let root = document.getElementById('ui-gem-engrave-slots');
    if (!root) return;
    bindGemEngraveSlotControls(root);
    let active = getGemEnhanceTargetSkill();
    if (typeof isEnhanceableAttackGem === 'function' && !isEnhanceableAttackGem(active)) {
        let emptySignature = `empty:${active || ''}`;
        if (root.dataset.renderSig !== emptySignature) {
            root.innerHTML = '<div class="gem-process-empty">장착 중인 공격 젬을 선택하면 중앙 각인 장치가 활성화됩니다.</div>';
            root.dataset.renderSig = emptySignature;
        }
        return;
    }
    let normalizedCap = Math.max(1, Math.min(5, Math.floor(Number(engraveCap) || 1)));
    let sourceSlots = Array.isArray(activeSlots) ? activeSlots : [];
    let normalizedSlots = Array.from({ length: 5 }, (_, index) => sourceSlots[index] || null);
    let nextUnlockCost = normalizedCap < 5 ? normalizedCap + 1 : 0;
    let canAffordNextSlot = nextUnlockCost > 0 && (game.currencies.skyEssence || 0) >= nextUnlockCost;
    let renderSignature = JSON.stringify([active, normalizedCap, normalizedSlots, canAffordNextSlot]);
    if (root.dataset.renderSig === renderSignature) return;
    let slots = [];
    let spokes = [];
    for (let index = 0; index < 5; index++) {
        let enhancement = normalizedSlots[index] ? GEM_SKY_ENHANCEMENTS[normalizedSlots[index]] : null;
        let unlocked = index < normalizedCap;
        let nextUnlock = index === normalizedCap && normalizedCap < 5;
        let unlockReady = nextUnlock && canAffordNextSlot;
        let stateClass = enhancement ? 'filled' : unlocked ? 'open' : unlockReady ? 'unlockable' : nextUnlock ? 'unaffordable' : 'locked';
        let title = enhancement
            ? `${index + 1}번 슬롯, ${enhancement.name}, 눌러서 교체 또는 해제`
            : unlocked
                ? `${index + 1}번 빈 각인 슬롯, 눌러서 각인 선택`
                : nextUnlock
                    ? `${index + 1}번 슬롯 해금, 창공의 정수 ${index + 1}${unlockReady ? '' : ', 재화 부족'}`
                    : `${index + 1}번 잠긴 슬롯, 앞 슬롯부터 해금 필요`;
        let group = enhancement ? getSkyEnhancementGroup(enhancement) : null;
        let glyph = enhancement ? renderSkyEnhancementIcon(enhancement) : unlocked ? '' : nextUnlock ? '+' : '×';
        let orbitAngle = -90 + index * 72;
        let orbitRadius = 38.5;
        let orbitX = 50 + Math.cos(orbitAngle * Math.PI / 180) * orbitRadius;
        let orbitY = 50 + Math.sin(orbitAngle * Math.PI / 180) * orbitRadius;
        spokes.push(`<span class="gem-orbit-spoke" aria-hidden="true" style="--orbit-angle:${orbitAngle}deg"></span>`);
        slots.push(`<button type="button" class="gem-orbit-slot slot-${index + 1} ${stateClass} ${group ? `group-${group.className}` : ''}" style="--slot-x:${orbitX.toFixed(3)}%;--slot-y:${orbitY.toFixed(3)}%" title="${escapeHTML(title)}" aria-label="${escapeHTML(title)}" aria-pressed="${enhancement ? 'true' : 'false'}" aria-disabled="${!unlocked && !nextUnlock ? 'true' : 'false'}" data-slot-index="${index}" data-slot-state="${stateClass}" ${!unlocked && !nextUnlock ? 'tabindex="-1"' : ''}><span class="gem-orbit-slot-glyph" aria-hidden="true"><b>${glyph}</b></span>${enhancement ? `<em>${escapeHTML(enhancement.name)}</em>` : nextUnlock ? `<em>${unlockReady ? '슬롯 해금' : '재화 부족'}</em>` : ''}</button>`);
    }
    root.innerHTML = `<div class="gem-orbit-stage"><div class="gem-orbit-rings" aria-hidden="true"></div>${spokes.join('')}<div class="gem-orbit-center element-${getGemCardMeta(SKILL_DB[active] || {}).className}">${renderSkillGemArt(active, 'gem-orbit-art', { eager: true })}<span>각인 대상</span><strong>${escapeHTML(active)}</strong></div>${slots.join('')}</div><div class="gem-orbit-copy"><strong>중앙 젬과 연결된 슬롯을 선택하세요</strong><span class="gem-orbit-legend"><b class="is-empty"><i></i>빈 슬롯</b><b class="is-filled"><i></i>각인됨</b><b class="is-unlockable"><i>+</i>해금 가능</b></span></div>`;
    root.dataset.renderSig = renderSignature;
}

/** 11×11 pixel icons ('#' outline, 'o' fill), drawn as crisp SVG rects — a syllable of a name read as clutter (사용자 요청
  * 2026-10-04 각인, 2026-10-06 루프 패시브). Engravings (board ring, 강화 · 각인 orbit) tint them by group; loop passive nodes by state. */
const PIXEL_ICONS = Object.freeze({
    sword: ['.........##', '........#o#', '.......#o#.', '......#o#..', '.#...#o#...', '..#.#o#....', '...#o#.....', '..#.##.....', '.#...#.....', '#..........', '...........'],
    speed: ['...........', '##...##....', '.##...##...', '..##...##..', '...##...##.', '....##...##', '...##...##.', '..##...##..', '.##...##...', '##...##....', '...........'],
    eye: ['...........', '...#####...', '..#ooooo#..', '.#oo###oo#.', '#oo#ooo#oo#', '#oo#o#o#oo#', '#oo#ooo#oo#', '.#oo###oo#.', '..#ooooo#..', '...#####...', '...........'],
    star: ['.....#.....', '.....#.....', '....#o#....', '....#o#....', '.###ooo###.', '##ooooooo##', '.###ooo###.', '....#o#....', '....#o#....', '.....#.....', '.....#.....'],
    drop: ['.....#.....', '....#o#....', '....#o#....', '...#ooo#...', '...#ooo#...', '..#ooooo#..', '.#o#ooooo#.', '.#o#ooooo#.', '.#oo#oooo#.', '..#ooooo#..', '...#####...'],
    fork: ['#....#....#', '#....#....#', '.#...#...#.', '..#..#..#..', '...#.#.#...', '....###....', '.....#.....', '.....#.....', '.....#.....', '....###....', '....###....'],
    split: ['##...#...##', '#.#.###.#.#', '...#.#.#...', '....###....', '.....#.....', '.....#.....', '.....#.....', '.....#.....', '....###....', '....#o#....', '....###....'],
    reticle: ['...#####...', '..#.....#..', '.#...#...#.', '#....#....#', '#...ooo...#', '#.###o###.#', '#...ooo...#', '#....#....#', '.#...#...#.', '..#.....#..', '...#####...'],
    boomerang: ['...######..', '..#oooooo#.', '.#o######..', '.#o#.......', '.#o#....#..', '.#o#....##.', '.#o#######.', '.#oooooo##.', '..#######..', '........#..', '...........'],
    pierce: ['.....#.....', '....###....', '...##o##...', '.....#.....', '.###.#.###.', '.#oo.#.oo#.', '.#oo.#.oo#.', '.#oo.#.oo#.', '..#o.#.o#..', '...#.#.#...', '....###....'],
    flame: ['.....#.....', '....#o#....', '..#.#o#.#..', '.#o##o##o#.', '.#oo#o#oo#.', '.#ooooooo#.', '#oo#ooo#oo#', '#o#.#o#.#o#', '#oo#ooo#oo#', '.#ooooooo#.', '..#######..'],
    up: ['.....#.....', '....#o#....', '...#ooo#...', '..#ooooo#..', '.####o####.', '....#o#....', '....#o#....', '....#o#....', '....#o#....', '....###....', '...........'],
    heart: ['...........', '.###...###.', '#ooo#.#ooo#', '#ooooooooo#', '#ooooooooo#', '.#ooooooo#.', '..#ooooo#..', '...#ooo#...', '....#o#....', '.....#.....', '...........'],
    shield: ['.#########.', '#ooooooooo#', '#ooo###ooo#', '#ooo#o#ooo#', '#ooo#o#ooo#', '.#oo#o#oo#.', '.#ooo#ooo#.', '..#ooooo#..', '...#ooo#...', '....#o#....', '.....#.....'],
    boot: ['...####....', '...#oo#....', '...#oo#....', '...#oo#....', '...#oo#....', '...#oo#....', '...#oo####.', '..#ooooooo#', '.#oooooooo#', '.##########', '...........'],
    // 낚시 창의 물고기(js/fishing-ui.js, 희귀도 색으로 칠한다).
    fish: ['...........', '...........', '...####...#', '.##oooo#.##', '#o#ooooo#o#', '#oooooooo##', '#ooooooo#o#', '.##oooo#.##', '...####...#', '...........', '...........'],
    // 그림이 없는 재화(심해 잠수 강화 비용, js/ocean-dive-ui.js): 창공의 정수 구름, 심해의 파편 수정, 암초 조각 산호, 군주의 핵 보석.
    cloud: ['...........', '...........', '....###....', '...#ooo#...', '.###ooo##..', '#ooo#oooo#.', '#oooooooo##', '#ooooooooo#', '.#########.', '...........', '...........'],
    shard: ['.....#.....', '....#o#....', '...#oo##...', '...#oo#o#..', '..#ooo#oo#.', '..#ooo#oo#.', '..#ooo#oo#.', '...#oo#o#..', '...#oo##...', '....#o#....', '.....#.....'],
    coral: ['.#......#..', '#o#..#.#o#.', '#o#.#o##o#.', '.#o##o#o#..', '..#oo#o#.#.', '...#ooo##o#', '....#oo#o#.', '....#ooo#..', '...#ooo#...', '..#ooooo#..', '.#########.'],
    gem: ['...........', '..#######..', '.#o#ooo#o#.', '#oo#ooo#oo#', '###########', '.#ooo#ooo#.', '..#oo#oo#..', '...#o#o#...', '....#o#....', '.....#.....', '...........'],
    // 기억의 잎(js/memory-leaves-ui.js 도감 카드, js/battle-ground-loot-ui.js 바닥 더미): 잎맥이 있는 비스듬한 잎.
    leaf: ['.......###.', '.....##ooo#', '....#oooo#.', '...#ooo#o#.', '..#oo#oo#..', '.#oo#ooo#..', '.#o#ooo#...', '..#oo##....', '.#.##......', '#..........', '...........']
});
const SKY_ENHANCEMENT_ICON_BY_STAT = Object.freeze({
    pctDmg: 'sword', flatSkillDmgPct: 'sword', hybrid: 'sword', awakenedDamageMul: 'sword',
    aspd: 'speed', ds: 'speed', awakenedAspdMul: 'speed',
    crit: 'eye', awakenedNoCritDouble: 'eye', critDmg: 'star', awakenedSpellFlatMul: 'star',
    leech: 'drop', leechRegenHybrid: 'drop', targets: 'fork', dotMulti: 'flame', dotMultiplier: 'flame',
    physIgnore: 'pierce', resPen: 'pierce', awakenedGemLevel: 'up'
});
const SKY_PROJECTILE_ICONS = Object.freeze({ split: 'split', focus: 'reticle', return: 'boomerang' });

/** @returns {string} SVG markup for the engraving's icon (class sky-engrave-icon is-<group>). */
function renderSkyEnhancementIcon(enhancement) {
    let name = enhancement.projectilePatternMode ? SKY_PROJECTILE_ICONS[enhancement.projectilePatternMode] : SKY_ENHANCEMENT_ICON_BY_STAT[enhancement.stat];
    return renderPixelIcon(name, `sky-engrave-icon is-${getSkyEnhancementGroup(enhancement).className}`);
}

/** @param {string} name a PIXEL_ICONS key (unknown → star) @param {string} className svg class @returns {string} crisp 11×11 SVG */
function renderPixelIcon(name, className) {
    let rects = [];
    (PIXEL_ICONS[name] || PIXEL_ICONS.star).forEach((row, y) => {
        for (let match of row.matchAll(/#+|o+/g)) rects.push(`<rect class="${match[0][0] === '#' ? 'm' : 'f'}" x="${match.index}" y="${y}" width="${match[0].length}" height="1"/>`);
    });
    return `<svg class="${className}" viewBox="0 0 11 11" shape-rendering="crispEdges" aria-hidden="true">${rects.join('')}</svg>`;
}

function getSkyEnhancementGroup(enhancement) {
    if (enhancement.projectilePatternMode) return { label: '탄도', className: 'crafted' };
    if (String(enhancement.id || '').startsWith('sky_awakened')) return { label: '각성', className: 'awakened' };
    if (String(enhancement.id || '').startsWith('sky_gemcraft')) return { label: '조율', className: 'crafted' };
    return { label: '기본', className: 'basic' };
}

function renderSkyEnhancementOption(enhancement, activeSlots, isGem) {
    let applied = activeSlots.includes(enhancement.id);
    let locked = !canUseSkyEnhancement(enhancement.id);
    let removeCost = typeof getSkyGemEnhancementRemoveCost === 'function' ? getSkyGemEnhancementRemoveCost() : 0;
    let group = getSkyEnhancementGroup(enhancement);
    let compatible = typeof isSkyEnhancementCompatibleWithSkill !== 'function' || isSkyEnhancementCompatibleWithSkill(enhancement.id, getGemEnhanceTargetSkill());
    let actionLabel = applied ? `적용 중, 해제 창공 ${removeCost}` : !compatible ? '투사체 젬 전용' : locked ? '젬 각성 해금 필요' : '창공 1';
    return `<button class="gem-engrave-option group-${group.className} ${applied ? 'applied' : ''}" onclick="toggleSkyGemEnhancement('${enhancement.id}')" ${!isGem || !compatible || (locked && !applied) ? 'disabled' : ''}><span class="gem-engrave-top"><em>${group.label}</em><b>${actionLabel}</b></span><strong>${escapeHTML(enhancement.name)}</strong><small>${escapeHTML(enhancement.desc)}</small></button>`;
}

function closeGemEngraveSlotOverlay() {
    let overlay = document.getElementById('gem-engrave-slot-overlay');
    if (!overlay) return;
    let triggerIndex = overlay.dataset.triggerSlotIndex;
    overlay.remove();
    let trigger = document.querySelector(`#ui-gem-engrave-slots button[data-slot-index="${triggerIndex}"]`);
    if (trigger && !trigger.disabled) trigger.focus({ preventScroll: true });
}

function renderGemEngraveOverlayOption(enhancement, slots, slotIndex) {
    let current = slots[slotIndex] === enhancement.id;
    let usedElsewhere = slots.some((id, index) => index !== slotIndex && id === enhancement.id);
    let locked = !canUseSkyEnhancement(enhancement.id);
    let group = getSkyEnhancementGroup(enhancement);
    let compatible = typeof isSkyEnhancementCompatibleWithSkill !== 'function' || isSkyEnhancementCompatibleWithSkill(enhancement.id, getGemEnhanceTargetSkill());
    let state = current ? '현재 각인, 누르면 해제' : usedElsewhere ? '다른 슬롯에 적용 중' : !compatible ? '투사체 젬 전용' : locked ? '젬 각성 해금 필요' : '이 슬롯에 각인';
    return `<button type="button" class="gem-engrave-option group-${group.className} ${current ? 'applied' : ''}" data-engrave-id="${enhancement.id}" data-action="${current ? 'remove' : 'apply'}" ${usedElsewhere || !compatible || (locked && !current) ? 'disabled' : ''}><span class="gem-engrave-top"><em>${group.label}</em><b>${state}</b></span><strong>${escapeHTML(enhancement.name)}</strong><small>${escapeHTML(enhancement.desc)}</small></button>`;
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
    closeGemEngraveSlotOverlay();
    let overlay = document.createElement('div');
    overlay.id = 'gem-engrave-slot-overlay';
    overlay.className = 'game-choice-overlay gem-engrave-slot-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', `${slotIndex + 1}번 각인 슬롯 선택`);
    overlay.dataset.triggerSlotIndex = String(slotIndex);
    overlay.tabIndex = -1;
    overlay.innerHTML = `<section class="gem-engrave-slot-dialog"><header><div class="gem-engrave-dialog-identity">${renderSkillGemArt(active, 'gem-engrave-dialog-art', { eager: true })}<div><span>하늘 각인</span><h3>${escapeHTML(active)}, ${slotIndex + 1}번 슬롯</h3><p>${current ? `현재 ${escapeHTML(current.name)}, 다른 각인을 누르면 교체됩니다.` : '이 슬롯에 넣을 각인을 선택하세요.'}</p></div></div><button type="button" data-action="close" aria-label="닫기">닫기</button></header><div class="gem-engrave-overlay-grid">${Object.values(GEM_SKY_ENHANCEMENTS).map(enhancement => renderGemEngraveOverlayOption(enhancement, slots, slotIndex)).join('')}</div></section>`;
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

function renderSupportGemProcessList() {
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
        let disabled = !state || state.maxed || (game.currencies.skyEssence || 0) < state.need;
        let actionLabel = state && state.maxed ? '최대 성장' : `${nextLabel}, 창공 ${state ? state.need : 0}`;
        return `<div class="gem-support-process-card"><div><small>${tierLabel}, Lv.${rec.level || 1}</small><strong>${escapeHTML(name)}</strong><span>${statToneText.html((SUPPORT_GEM_DB[name] || {}).desc || '')}</span></div><button onclick="processSupportGemWithSkyEssence('${name}')" ${disabled ? 'disabled' : ''}>${actionLabel}</button></div>`;
    }).join('');
}


function tryGrantCodexCompletionReward() {
    let progress = getUniqueCodexProgress();
    if (progress.total <= 0 || progress.stored < progress.total) return;
    if (game.uniqueCodexCompletedRewardClaimed) return;
    game.uniqueCodexCompletedRewardClaimed = true;
    addLog('📚 도감 완성! 다음 루프부터 루프마다 액트 1 고유 하나를 무작위로 받습니다.', 'loot-unique');
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
    if (!canStoreEquipmentItems([stored], game)) return addLog('인벤토리가 가득 차서 꺼낼 수 없습니다.', 'attack-monster');
    let clone = normalizeItem(JSON.parse(JSON.stringify(stored)));
    clone.id = ++itemIdCounter;
    game.inventory.push(clone);
    let parts = String(key).split('|');
    game.uniqueCodex[key] = { revealed: true, slot: parts[0] || clone.slot || '', name: parts[1] || clone.name || '' };
    addLog(`📦 도감에서 [${clone.name}] 꺼냈습니다.`, 'loot-rare');
    updateStaticUI();
}


function grantCodexLegacyStarterUniques() {
    if (!game.uniqueCodexCompletedRewardClaimed) return;
    // 액트 1 일반 고유만(체이싱 고유 제외). 드롭과 같은 생성기로 만들어 고유 효과와 옵션 굴림이 붙는다(2026-10-09).
    let act1Pool = UNIQUE_DB.filter(entry => (entry.reqTier || 1) <= 1 && !entry.ultraRare && !entry.dropOnly);
    if (act1Pool.length === 0) return;
    let pick = rndChoice(act1Pool);
    let item = generateUniqueItem(1, null, pick.name, {});
    if (!canStoreEquipmentItems([item], game)) return;
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

function getStarterGemTutorialTarget() {
    let name = typeof game.starterGemTutorialPending === 'string' ? game.starterGemTutorialPending : '';
    if (!name || !Array.isArray(game.skills) || !game.skills.includes(name)) return null;
    let equipped = [game.activeSkill, game.mobilitySkill].includes(name)
        || (Array.isArray(game.equippedSummonSkills) && game.equippedSummonSkills.includes(name));
    return equipped ? null : name;
}

function completeStarterGemTutorial(name) {
    if (name && game.starterGemTutorialPending === name) game.starterGemTutorialPending = null;
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
    let maximum = typeof getSummonCapMaximum === 'function'
        ? getSummonCapMaximum()
        : (typeof hasKeystone === 'function' && hasKeystone('sb9') ? 12 : 8);
    return Math.max(1, Math.min(maximum, Math.floor((stats && stats.summonCap) || 1)));
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
        completeStarterGemTutorial(name);
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
    if (mobilitySkill.isMobilityGem(name) && game.mobilitySkill === name) return wearMobilityGem('');
    if (typeof canUseSkillWithCurrentEquipment === 'function' && !canUseSkillWithCurrentEquipment(name)) {
        return addLog(`[${name}]은(는) 방패를 장착해야 사용할 수 있습니다.`, 'attack-monster');
    }
    if ((SKILL_DB[name]?.tags || []).includes('summon_attack')) return toggleSummonAttackGem(name);
    if (mobilitySkill.isMobilityGem(name)) return wearMobilityGem(name);
    game.activeSkill = name;
    completeStarterGemTutorial(name);
    if (SKILL_DB[name]?.isGem) game.gemEnhanceTargetSkill = name;
    updateStaticUI();
}

/** A worn summon gem comes off its slots; another one goes on (as far as the summon cap allows). */
function toggleSummonAttackGem(name) {
    normalizeEquippedSummonAttackSkills();
    if (!game.equippedSummonSkills.includes(name)) return changeSummonSkillCount(name, 1);
    game.summonLoadoutInitialized = true;
    game.equippedSummonSkills = game.equippedSummonSkills.filter(gemName => gemName !== name);
    delete game.summonSkillCounts[name];
    if (game.activeSkill === name) game.activeSkill = '기본 공격';
    updateStaticUI();
}

/** 이동 스킬 칸 (js/mobility-skill.js): a mobility gem is worn in its own slot next to the main gem ('' takes it off). */
function wearMobilityGem(name) {
    game.mobilitySkill = name;
    mobilitySkill.reset();
    if (name) { completeStarterGemTutorial(name); game.gemEnhanceTargetSkill = name; }
    updateStaticUI();
}

function openEquippedGemManagement(name) {
    if (!game.gemEnhanceUnlocked) return addLog('젬 강화는 군주의 핵 또는 창공의 정수를 획득하면 개방됩니다.', 'attack-monster');
    let equipped = typeof getEquippedEnhanceableGemNames === 'function' ? getEquippedEnhanceableGemNames() : [];
    if (!equipped.includes(name)) return addLog('장착 중인 공격 젬만 강화할 수 있습니다.', 'attack-monster');
    game.gemEnhanceTargetSkill = name;
    game.gemEngraveSelectedSlot = 0;
    switchSkillSubtab('skill-tab-enhance');
    updateStaticUI();
}
safeExposeGlobals({ openEquippedGemManagement });
function getEffectiveResonanceCap(statsOverride) {
    let base = Math.max(0, Math.floor(game.resonancePower || 0));
    let runeBonus = 0;
    let stats = statsOverride || getUiPlayerStats(null);
    if (stats) {
        runeBonus = Math.max(0, Math.floor((stats && stats.runeResonancePower) || 0));
        let tempFloor = Math.max(0, Math.floor((stats && stats.uniqueResonanceFloor) || 0));
        let inquisitorBonus = Math.max(0, Math.floor((stats && stats.inquisitorResonanceBonus) || 0));
        base = Math.max(base, tempFloor) + inquisitorBonus;
    }
    return base + runeBonus;
}

function getSupportTierResonanceCost(name) {
    return getSupportResonanceCostAtTier(name,getSupportActiveTier(name));
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
            return addLog(`공명력 부족 (${remain}/${need})`, 'attack-monster', { toast: true });
        }
    } else {
        rec.activeTier = nextTier;
        game.supportGemData[name] = rec;
    }
    normalizeSupportLoadout(false);
    updateStaticUI();
}
function toggleSupport(name) { if (!assertBuildEditable()) return;
    if (!contentProgression.isUnlocked('support')) return;
    normalizeSupportLoadout(false);
    game.equippedSupports = Array.isArray(game.equippedSupports) ? game.equippedSupports : [];
    let idx = game.equippedSupports.indexOf(name);
    if (idx > -1) game.equippedSupports.splice(idx, 1);
    else {
        let stats = getUiPlayerStats();
        if (game.equippedSupports.length >= stats.suppCap) {
            addLog(`보조 젬 장착 한도 부족 (${game.equippedSupports.length}/${Math.max(0, Math.floor(stats.suppCap || 0))}), 다른 보조 젬을 먼저 해제하세요.`, 'attack-monster', { toast: true });
            updateStaticUI();
            return;
        }
        if (isSummonGuardSupport(name)) {
            let cap = getSummonEquipCapFromStats(stats);
            if (getEquippedSummonCount() >= cap) return addLog(`소환수 한도(${cap})로 인해 [${name}]은(는) 장착할 수 없습니다.`, 'attack-monster', { toast: true });
        }
        let used = game.equippedSupports.reduce((sum, n) => sum + getSupportTierResonanceCost(n), 0);
        let remain = Math.max(0, getEffectiveResonanceCap(stats) - used);
        let activeTier = getSupportActiveTier(name);
        let cost = getSupportTierResonanceCost(name);
        if (remain < cost) return addLog(`공명력 부족 (${remain}/${cost})`, 'attack-monster', { toast: true });
        game.equippedSupports.push(name);
    }
    updateStaticUI();
}


let mobileToastQueue = [];

let mobileToastResultHoldTimer = null;
let mobileToastActiveCount = 0;
const MOBILE_TOAST_MAX_CONCURRENT = 1;

function shouldShowMobileToast(msg, cls, opts = {}) {
    if (opts && opts.noToast) return false;
    let isMobile = (window.matchMedia && uiDisplay.matches('(max-width: 900px)')) || ('ontouchstart' in window);
    let logHidden = game && game.settings && game.settings.showCombatLog === false;
    if (!isMobile && !logHidden) return false;
    let text = stripHtmlMessage(msg);
    let importantFailure = /(부족|실패|불가|필요|없습니다|찾을 수 없습니다|잠겨|환불|반환)/.test(text || '');
    if (importantFailure) return true;
    let level = cls || '';
    if (level === 'attack-monster') {
        return false;
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
    root.style.bottom = 'var(--mobile-toast-bottom, 84px)'; // 전투 화면은 CSS가 HUD 판 위로 올린다(pixel-mobile.css)
    root.style.transform = 'translateX(-50%)';
    root.style.zIndex = '22000';
    root.style.pointerEvents = 'none';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '8px';
    root.style.width = 'min(calc(92vw / var(--scale-display-factor, 1)), 420px)';
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
    pumpMobileToastQueue();
}

// 알림이 많이 밀려 있을수록: (1) 동시에 최대 1개까지만 보여 화면을 가리지 않고, (2) 쌓인 개수가 많을수록
// 표시 시간을 점점 줄여 더 빨리 다음 알림이 나오게 한다(밀린 알림이 한 줄씩 느긋하게
// 빠지는 대신, 밀린 만큼 더 빠르게 소화됨).
/** The offline result card covers the phone screen: notices wait and are looked at again shortly after. */
function resumeMobileToastsAfterResult() {
    mobileToastResultHoldTimer = null;
    pumpMobileToastQueue();
}

function pumpMobileToastQueue() {
    // A guide card sits where these notices appear on phones: hold them until it closes (dismissTutorial pumps again).
    if (typeof isTutorialOpen === 'function' && isTutorialOpen()) return;
    if (document.getElementById('background-combat-result-overlay')) {
        mobileToastResultHoldTimer = mobileToastResultHoldTimer || setTimeout(resumeMobileToastsAfterResult, 600);
        return;
    }
    while (mobileToastActiveCount < MOBILE_TOAST_MAX_CONCURRENT && mobileToastQueue.length > 0) {
        showNextMobileToast();
    }
}

function getMobileToastDisplayDurationMs() {
    let backlog = mobileToastQueue.length;
    return Math.max(650, 1700 - (backlog * 180));
}

function showNextMobileToast() {
    if (mobileToastQueue.length <= 0) return;
    let entry = mobileToastQueue.shift();
    mobileToastActiveCount++;
    let root = getMobileToastRoot();
    let toast = document.createElement('div');
    toast.textContent = entry.msg;
    toast.className = entry.cls === 'attack-monster' ? 'mobile-log-toast mobile-log-toast--error' : 'mobile-log-toast';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .2s ease';
    root.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    // A tap clears it at once and the next one follows; otherwise it fades out on its own.
    toast.addEventListener('click', () => releaseMobileToast(toast, 90));
    setTimeout(() => releaseMobileToast(toast, 220), getMobileToastDisplayDurationMs());
}

/** Frees a phone toast's slot once: fade out, remove, then let the next queued toast in. */
function releaseMobileToast(toast, fadeMs) {
    if (toast.dataset.released) return;
    toast.dataset.released = '1';
    toast.style.transition = `opacity ${fadeMs}ms ease`;
    toast.style.opacity = '0';
    setTimeout(() => {
        toast.remove();
        mobileToastActiveCount = Math.max(0, mobileToastActiveCount - 1);
        setTimeout(pumpMobileToastQueue, 0);
    }, fadeMs);
}

let logQueue = [];
let logFlushRaf = 0;
let combatLogRateState = {};
let combatLogAggregateState = {};
let combatLogItemSequence = 0;
let combatLogItemSnapshots = new Map();

function registerCombatLogItemSnapshot(item) {
    let token = ++combatLogItemSequence;
    let snapshot = JSON.parse(JSON.stringify(item));
    combatLogItemSnapshots.set(token, snapshot);
    while (combatLogItemSnapshots.size > 80) {
        const expired=[...combatLogItemSnapshots.keys()].find(key=>
            !document.querySelector(`#background-combat-result-overlay [data-log-item-token="${key}"]`));
        combatLogItemSnapshots.delete(expired);
    }
    return token;
}

function decorateCombatLogItemMessage(msg, item) {
    if (!item || typeof item !== 'object' || !item.name) return msg;
    let token = registerCombatLogItemSnapshot(item);
    let label = `[${item.name}]`;
    let link = `<span class="combat-log-item-link" role="button" tabindex="0" title="장비창 열기" data-item-tooltip-anchor="1" data-log-item-token="${token}" onmouseenter="showCombatLogItemTooltip(event,${token})" onmousemove="showCombatLogItemTooltip(event,${token})" onmouseleave="hideCombatLogItemTooltip(event)" onclick="openCombatLogItemEquipment(event)" onkeydown="if(event.key==='Enter'||event.key===' '){openCombatLogItemEquipment(event)}">${escapeHTML(label)}</span>`;
    return String(msg).replace(label, link);
}

function stripCombatLogEmoji(raw) {
    return stripDecorativeEmoji(raw);
}

function getCombatLogElementFromText(message) {
    let text = String(message || '');
    if (/(화염|점화)/.test(text)) return 'fire';
    if (/(냉기|한기|동결)/.test(text)) return 'cold';
    if (/(번개|감전)/.test(text)) return 'light';
    if (/(카오스|중독|독)/.test(text)) return 'chaos';
    if (/(물리|출혈)/.test(text)) return 'phys';
    return '';
}

function getCombatLogIconKind(message, cls, options) {
    let opts = options || {};
    if (opts.item) return 'item';
    if (['attack', 'phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.logIcon)) return opts.logIcon;
    if (['phys', 'fire', 'cold', 'light', 'chaos'].includes(opts.element)) return opts.element;
    let text = String(message || '');
    let element = getCombatLogElementFromText(message);
    if (element && /(피격|피해|상태이상|점화|냉각|동결|감전|중독|출혈)/.test(text)) return element;
    if (cls === 'attack-player' && /(피해|타격|공격)/.test(text)) return 'attack';
    if (cls === 'attack-monster' && /피해/.test(text)) return element || 'phys';
    return '';
}

function renderCombatLogIcon(kind, options) {
    let opts = options || {};
    if (kind === 'item') {
        let asset = typeof getInventoryItemVisualAsset === 'function'
            ? getInventoryItemVisualAsset(opts.item, opts.itemKind) : '';
        return asset ? `<img class="combat-log-icon combat-log-item-icon" src="${escapeHTML(asset)}" alt="" aria-hidden="true">` : '';
    }
    return kind ? `<span class="combat-log-icon combat-log-icon--${kind}" aria-hidden="true"></span>` : '';
}

/** A critical hit colours only its damage number and keeps the player-hit line colour: whole grey and orange lines in turn made the log
 * busier (2026-10-06 user: "치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"). critValue is the formatted number before "피해". */
function markCombatLogCritNumber(message, critValue) {
    let at = critValue ? message.lastIndexOf(`${critValue} 피해`) : -1;
    if (at < 0) return message;
    return `${message.slice(0, at)}<span class="combat-log-crit">${critValue}</span>${message.slice(at + critValue.length)}`;
}

function decorateCombatLogMessage(message, cls, options) {
    let cleanMessage = stripCombatLogEmoji(message);
    let icon = renderCombatLogIcon(getCombatLogIconKind(cleanMessage, cls, options), options);
    return `${icon}${markCombatLogCritNumber(cleanMessage, options && options.critValue)}`;
}

/** null while the log sits in a hidden tab (phone, another menu open): measuring it then forced a style recalculation of
 * the page twice per flush (about 20 ms each on a 4x-throttled phone). Rows added meanwhile show from the latest. */
function captureCombatLogScroll(log) {
    if (isCombatLogHidden(log)) return null;
    let bottomGap = log.scrollHeight - log.scrollTop - log.clientHeight;
    return {
        followsLatest: bottomGap <= 24 || log.followLatestPending === true,
        scrollTop: log.scrollTop,
        scrollHeight: log.scrollHeight
    };
}

/** Hidden tab (phone, another menu open), a folded combat feed, or the PC message frames' stash (the other tab is showing, or the
 * frame is folded; js/message-frames-ui.js): #log is display:none there and measuring forces a style recalculation. */
function isCombatLogHidden(log) {
    if (typeof log.closest !== 'function') return false;
    const pane = log.closest('.tab-content');
    return (!!pane && !pane.classList.contains('active')) || !!log.closest('.combat-feed.collapsed') || !!log.closest('.message-frame-stash');
}

function restoreCombatLogScroll(log, scrollState) {
    log.followLatestPending = !scrollState;
    if (!scrollState) return;
    if (scrollState.followsLatest) {
        log.scrollTop = log.scrollHeight;
        return;
    }
    let heightDelta = log.scrollHeight - scrollState.scrollHeight;
    let maxScrollTop = Math.max(0, log.scrollHeight - log.clientHeight);
    log.scrollTop = Math.min(maxScrollTop, Math.max(0, scrollState.scrollTop + heightDelta));
}

function flushLogQueue() {
    logFlushRaf = 0;
    const log = document.getElementById('log');
    if (!log || logQueue.length === 0) return;
    let scrollState = captureCombatLogScroll(log);
    // 백그라운드 재계산처럼 로그가 폭주하면 어차피 60줄만 남으므로,
    // DOM에 만들 필요가 없는 초과분은 만들기 전에 버린다.
    if (logQueue.length > 60) logQueue = logQueue.slice(-60);
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
    restoreCombatLogScroll(log, scrollState);
}
function isCombatLogRateLimited(opts, settings, now) {
    if (!opts.rateKey || settings.combatLogRateLimit === false) return false;
    if (now < (combatLogRateState[opts.rateKey] || 0)) return true;
    combatLogRateState[opts.rateKey] = now + Math.max(60, Number(opts.minIntervalMs || 180));
    return false;
}

function addLog(msg, cls, opts = {}) {
    if (game.isBackgroundCalculation) return;
    let now = performance.now();
    let settings = game.settings || {};
    if (isCombatLogRateLimited(opts, settings, now)) return;
    if (opts.item) msg = decorateCombatLogItemMessage(msg, opts.item);
    msg = decorateCombatLogMessage(msg, cls, opts);
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
            let merged = state.count > 1 ? `${state.msg} <span style="color:var(--copy-bright);">x${state.count}</span>` : state.msg;
            logQueue.push({ msg: merged, cls: state.cls });
        }
        combatLogAggregateState[key] = { msg: msg, cls: cls, count: 1, lastAt: now };
        setTimeout(() => {
            let s = combatLogAggregateState[key];
            if (!s) return;
            if ((performance.now() - s.lastAt) >= winMs) {
                let merged = s.count > 1 ? `${s.msg} <span style="color:var(--copy-bright);">x${s.count}</span>` : s.msg;
                logQueue.push({ msg: merged, cls: s.cls });
                delete combatLogAggregateState[key];
                if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
            }
        }, winMs + 10);
        if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
        return;
    }
    logQueue.push({ msg, cls });
    if (opts.toast && typeof showGameToast === 'function') {
        let tone = opts.toastTone || (cls === 'loot-unique' ? 'success' : (cls === 'attack-monster' ? 'warning' : 'info'));
        showGameToast(stripHtmlMessage(msg) || String(msg || ''), { tone: tone });
    } else if (shouldShowMobileToast(msg, cls, opts)) enqueueMobileToast(msg, cls);
    if (!logFlushRaf) logFlushRaf = requestAnimationFrame(flushLogQueue);
}

function applyUiSkin(skin) {
    document.body.dataset.uiSkin = normalizeUiSkin(skin);
}

// 고대비 모드(접근성): 글자·테두리 대비를 높이고 전장 조명 패스를 끈다. 색은 css/themes/high-contrast.css가 소유한다.
function applyHighContrast(enabled) {
    document.body.classList.toggle('high-contrast', enabled === true);
}

function getHeroSelectionDef(id) {
    return PLAYER_CLASS_DEFS[id] || HERO_SELECTION_DEFS[id] || PLAYER_CLASS_DEFS.archer;
}

function syncHeroSelectionState(source, options = {}) {
    if (!Array.isArray(game.discoveredClassIds)) game.discoveredClassIds = [];
    game.discoveredClassIds = game.discoveredClassIds.filter(id => PLAYER_CLASS_DEFS[id]);
    if (!PLAYER_CLASS_DEFS[game.selectedClassId]) game.selectedClassId = 'archer';
    if (!HERO_SELECTION_DEFS[game.selectedHeroId]) game.selectedHeroId = 'hero1';
    game.talentSelectionInitialized = !!game.talentSelectionInitialized;
    if (game.appearanceClassId && !PLAYER_CLASS_DEFS[game.appearanceClassId]) game.appearanceClassId = null;
    let shouldRecordSelected = !!options.recordSelected || !!game.heroSelectionInitialized || !!game.classFreeSwitchUnlocked;
    if (shouldRecordSelected && !game.discoveredClassIds.includes(game.selectedClassId)) game.discoveredClassIds.push(game.selectedClassId);
    let unlockedBefore = !!game.classFreeSwitchUnlocked;
    if (game.discoveredClassIds.length >= PLAYER_CLASS_ORDER.length) game.classFreeSwitchUnlocked = true;
    if (!unlockedBefore && game.classFreeSwitchUnlocked) addLog('모든 직업을 경험했습니다. 설정에서 외형을 자유롭게 변경할 수 있습니다.', 'season-up');
    if (source === 'init') return;
    let summaryEl = document.getElementById('ui-hero-talent-summary');
    if (summaryEl) {
        let def = getHeroSelectionDef(game.selectedClassId);
        let appearanceDef = getHeroSelectionDef(typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedClassId);
        let discovered = Math.min(PLAYER_CLASS_ORDER.length, game.discoveredClassIds.length);
        let unlockText = game.classFreeSwitchUnlocked ? `외형 변경 해금됨, 외형: ${appearanceDef.label}` : `경험한 직업 ${discovered}/${PLAYER_CLASS_ORDER.length}`;
        let modeText = game.settings && game.settings.heroAppearanceMode === 'fixed' ? '고정' : '현재 직업 연동';
        summaryEl.innerText = `${def.label}, ${unlockText}, 외형: ${modeText}`;
    }
}

function renderHeroSelectionControls() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    let mode = game.settings && game.settings.heroAppearanceMode === 'fixed' ? 'fixed' : 'loop';
    let modeEl = document.getElementById('sel-hero-appearance-mode');
    if (modeEl) modeEl.value = mode;
    selectEl.innerHTML = PLAYER_CLASS_ORDER.map(id => {
        let def = PLAYER_CLASS_DEFS[id];
        return `<option value="${id}">${def.label}</option>`;
    }).join('');
    selectEl.value = typeof getHeroAppearanceId === 'function'
        ? getHeroAppearanceId()
        : (game.selectedClassId || 'archer');
    if (mode !== 'fixed') {
        selectEl.disabled = true;
        selectEl.title = '루프마다 선택한 현재 직업의 외형을 사용합니다.';
    } else if (!game.classFreeSwitchUnlocked) {
        selectEl.disabled = true;
        selectEl.title = '다른 외형 선택은 여섯 직업을 한 번씩 경험하면 해금됩니다.';
    } else {
        selectEl.disabled = false;
        selectEl.title = '';
    }
    syncHeroSelectionState();
}

function persistHeroSelectionChange(reason) {
    if (!saveGame({ skipCloudSync: true })) return;
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave(reason || '플레이어 직업 변경');
}

const applyHeroAppearanceMode = function(mode, options = {}) {
    let nextMode = mode === 'fixed' ? 'fixed' : 'loop';
    let previousMode = game.settings && game.settings.heroAppearanceMode === 'fixed' ? 'fixed' : 'loop';
    let previousAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.selectedClassId || 'archer');
    game.settings.heroAppearanceMode = nextMode;
    if (nextMode === 'fixed') game.appearanceClassId = previousAppearance;
    syncHeroSelectionState();
    let nextAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.selectedClassId || 'archer');
    if (previousAppearance !== nextAppearance && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
    renderHeroSelectionControls();
    if (!options.silent && previousMode !== nextMode) {
        let label = nextMode === 'fixed' ? '고정' : '현재 직업 연동';
        addLog(`캐릭터 외형 방식: ${label}`, 'season-up');
    }
    if (!options.skipSave && previousMode !== nextMode) persistHeroSelectionChange('캐릭터 외형 방식 변경');
    return previousMode !== nextMode;
};

function applyHeroSelection(classId, options = {}) {
    let classDef = PLAYER_CLASS_DEFS[classId];
    if (!classDef) return false;
    if (options.cosmeticOnly) {
        if (!game.classFreeSwitchUnlocked || game.settings.heroAppearanceMode !== 'fixed') return false;
        let prevAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (game.appearanceClassId || game.selectedClassId || 'archer');
        game.appearanceClassId = classId;
        syncHeroSelectionState();
        if (prevAppearance !== classId && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
        renderHeroSelectionControls();
        if (!options.silent && prevAppearance !== classId) addLog(`캐릭터 외형 변경: ${classDef.label}`, 'season-up');
        if (!options.skipSave) persistHeroSelectionChange('캐릭터 외형 변경');
        return true;
    }
    let prev = game.selectedClassId;
    let prevAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : (prev || 'archer');
    let wasInitialized = !!game.heroSelectionInitialized;
    let refundedPassiveCount = typeof rebasePassiveTreeForClassChange === 'function'
        ? rebasePassiveTreeForClassChange(prev, classId) : 0;
    game.selectedClassId = classId;
    if (options.alignTalent || !wasInitialized || !game.talentSelectionInitialized) {
        game.selectedHeroId = classDef.recommendedTalentHeroId;
        game.talentSelectionInitialized = true;
    }
    // 직업이 바뀌면 시작점이 달라진다: 반환할 패시브가 없는 새 캐릭터도 닿는 노드를 새 시작점 기준으로 다시 센다
    // (예전에는 기본 직업의 시작점이 "닿는 노드"로 남아 트리를 처음 열면 트리 절반을 담는 배율로 물러나 있었다).
    if (prev !== classId || refundedPassiveCount > 0) {
        if (typeof calculateReachableNodes === 'function') calculateReachableNodes();
        if (typeof refreshPassiveVisibility === 'function') refreshPassiveVisibility();
    }
    if (game.settings.heroAppearanceMode === 'fixed' && (!wasInitialized || !PLAYER_CLASS_DEFS[game.appearanceClassId])) {
        game.appearanceClassId = wasInitialized ? prevAppearance : classId;
    }
    syncHeroSelectionState(null, { recordSelected: true });
    let nextAppearance = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : classId;
    if (prevAppearance !== nextAppearance && battleAssets && battleAssets.ready) battleAssets.atlas = buildBattleAssetAtlas();
    renderHeroSelectionControls();
    if (!options.silent && prev !== classId) addLog(`직업 변경: ${classDef.label}`, 'season-up');
    if (!options.silent && refundedPassiveCount > 0) addLog(`직업 시작점 변경으로 패시브 ${refundedPassiveCount}개를 반환했습니다.`, 'season-up');
    if (!options.skipSave) persistHeroSelectionChange('플레이어 직업 변경');
    return true;
}

function onHeroAppearanceModeChanged() {
    let selectEl = document.getElementById('sel-hero-appearance-mode');
    if (!selectEl) return;
    applyHeroAppearanceMode(selectEl.value);
    updateStaticUI();
}
safeExposeGlobals({ onHeroAppearanceModeChanged });

/** 장비 창 "빈 칸 채우기": 가방에서 빈 장비 칸에 맞는 장비를 티어 · 등급 높은 것부터 장착한다. */
function fillEmptyEquipmentSlots() {
    const equipped = equipIntoEmptySlots(game.inventory.slice());
    if (equipped) showGameToast(`빈 장비 칸 ${equipped}개를 채웠습니다`, { tone: 'success' });
    updateStaticUI();
}
safeExposeGlobals({ fillEmptyEquipmentSlots });

function onHeroSelectionChanged() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    if (!game.classFreeSwitchUnlocked) {
        addLog('아직 자유 변경이 잠겨 있습니다. 루프를 돌며 여섯 직업을 모두 경험하세요.', 'attack-monster');
        selectEl.value = typeof getHeroAppearanceId === 'function'
            ? getHeroAppearanceId() : (game.selectedClassId || 'archer');
        return;
    }
    applyHeroSelection(selectEl.value, { cosmeticOnly: true });
    updateStaticUI();
}

// ── 몬스터 외형 수집 시스템 ──
// 액트 몬스터(data/bosses.js ACT_MONSTER_VISUALS, 그림은 js/canvas-monster-actors.js) · 영역 세트 · 위습과
// 보스 전용 이미지(BOSS_ASSET_MANIFEST)를 플레이어 외형으로 수집/적용한다. 예전 목재 몬스터 넷은 저장을 불러올 때
// 새 몬스터로 바뀐다(js/save-migrations.js migrateRetiredWoodMonsters).
const MONSTER_SKIN_FRAME_DEFS = [
    { id: 'boss', label: '마수 군주' }
];

/** 이름표가 정해진 외형(마수 군주, 액트 몬스터)의 이름. */
function getNamedMonsterSkinLabel(id) {
    const frameDef = MONSTER_SKIN_FRAME_DEFS.find(def => def.id === id);
    return frameDef ? frameDef.label : (ACT_MONSTER_VISUAL_BY_ID[id] || {}).name;
}

function getMonsterSkinLabel(id) {
    let named = getNamedMonsterSkinLabel(id);
    if (named) return named;
    const wispDef = typeof WISP_MONSTER_VISUALS !== 'undefined'
        ? WISP_MONSTER_VISUALS.find(def => def.id === id)
        : null;
    if (wispDef) return wispDef.name;
    const realmDef = typeof getRealmMonsterVisualDefinitionById === 'function'
        ? getRealmMonsterVisualDefinitionById(id)
        : null;
    if (realmDef) return realmDef.name;
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
    ACT_MONSTER_VISUALS.forEach(def => defs.push({ id: def.id, label: def.name, type: 'frame' }));
    if (typeof REALM_MONSTER_VISUAL_SETS !== 'undefined') {
        // 군락지 세트는 다른 세트의 개미, 웜, 벌을 다시 쓴다: 한 외형은 목록에 한 번만(2026-10-07 검토: 이름만 다른 줄이 겹쳤다).
        const listed = new Set(defs.map(def => def.id));
        Object.values(REALM_MONSTER_VISUAL_SETS).forEach(set => {
            set.members.filter(member => !listed.has(member.id)).forEach(member => {
                listed.add(member.id);
                defs.push({ id: member.id, label: member.name, type: 'frame' });
            });
        });
    }
    if (typeof WISP_MONSTER_VISUALS !== 'undefined') {
        WISP_MONSTER_VISUALS.forEach(wisp => defs.push({ id: wisp.id, label: wisp.name, type: 'frame' }));
    }
    if (typeof BOSS_ASSET_MANIFEST !== 'undefined') {
        Object.keys(BOSS_ASSET_MANIFEST).forEach(key => defs.push({ id: key, label: getMonsterSkinLabel(key), type: 'boss' }));
    }
    return defs;
}

// 처치한 적의 외형 스킨 id. 보스 그림, 제 시트로 그리는 몬스터는 그 id, 나머지는 위습 외형 하나를 렌더러와 같은 규칙
// (pickSeededEnemyVariant)으로 데이터에서 고른다. 옛 위습 그림은 그 외형을 입을 때만 불러오므로 그림을 보지 않는다.
function getEnemySkinId(enemy) {
    if (!enemy) return null;
    if (enemy.bossAssetKey) return enemy.bossAssetKey;
    const sheetId = enemy.spriteVariantId || enemy.monsterVisualId;
    if (MONSTER_SPRITE_SHEETS[sheetId]) return sheetId;
    if (enemy.isBoss) return 'boss';
    const wisps = typeof WISP_MONSTER_VISUALS !== 'undefined' ? WISP_MONSTER_VISUALS : [];
    return battleAssets && battleAssets.ready && wisps.length ? pickSeededEnemyVariant(enemy, wisps).id : null;
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
    let woodVariant = (enemyAtlas.skinVariants || {})[id];
    if (woodVariant) return {
        type: 'frame',
        image: woodVariant.image,
        frame: woodVariant.frame,
        frames: woodVariant.frames
    };
    ensureWispSkinAtlas(id);
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
    if (game.heroSelectionInitialized || isLoopHeroSelectOpen()) return true;
    return openLoopHeroSelection((pickedId) => {
        game.heroSelectionInitialized = true;
        const stats = getUiPlayerStats();
        game.playerHp = getPlayerHpCap(stats);
        game.playerEnergyShield = stats.energyShield;
        updateCombatUI(stats);
        addLog(`시작 직업을 선택했습니다: ${PLAYER_CLASS_DEFS[pickedId].blindLabel}`, 'season-up');
        persistHeroSelectionChange('시작 직업 선택');
    }, {
        kicker: '첫 루프',
        title: '시작 직업 선택',
        body: '첫 루프에서 사용할 직업을 선택하세요.'
    });
}

/** A save swapped in under an open class pick (a cloud save on a new device) that already has its class closes that stale pick;
 * a pending loop class is asked again by loopAutomationUi. A save without a class keeps the start pick open. */
function resetHeroSelectionForSave() {
    const overlay = document.getElementById('loop-hero-select-overlay');
    if (!game.heroSelectionInitialized || !overlay || !overlay.classList.contains('active')) return;
    overlay.classList.remove('active');
    loopHeroSelectionCallback = null;
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
    if (detail.changed) addLog(`루프 전환 직업: ${getHeroSelectionDef(detail.classId).label}`, 'season-up');
    switchTab('tab-character');
});

window.addEventListener('project-idle:loop-rewrite-started', () => {
    loopSettlementUi.render();
    playLoopRewriteEffect();
});

window.addEventListener('project-idle:talent-tab-refresh-requested', () => {
    let talentTab = document.getElementById('tab-talent');
    if (talentTab && talentTab.classList.contains('active')) talentUi.render();
});

function togglePastLoopMilestones() {
    game.settings.collapsePastLoopMilestones = game.settings.collapsePastLoopMilestones === false;
    updateStaticUI();
}
safeExposeGlobals({ togglePastLoopMilestones });

function getMapCompleteActionOptions() {
    return [
        { value: 'repeatZone', label: '반복', detail: '현재 지역 또는 층을 다시 진행합니다.' },
        { value: 'nextZone', label: '다음 지역', detail: '일반 자동 진행 규칙에 따라 다음 지역으로 이동합니다.' },
        { value: 'nextLoopBestPlusOne', label: '최고층', detail: '이번 루프의 최고 심화/미궁 기록 다음 층으로 이동합니다.' },
        { value: 'stop', label: '중단', detail: '전투를 멈추고 현재 위치에서 대기합니다.' }
    ];
}

function getMapCompleteActionOption(action) {
    return getMapCompleteActionOptions().find(option => option.value === action)
        || getMapCompleteActionOptions().find(option => option.value === 'nextZone');
}

function syncMapCompleteActionQuickControl() {
    let button = document.getElementById('btn-map-complete-action-picker');
    if (!button) return;
    let settingsButton = document.getElementById('btn-tab-settings');
    if (settingsButton && settingsButton.parentElement && settingsButton.nextElementSibling !== button) {
        settingsButton.parentElement.insertBefore(button, settingsButton.nextElementSibling);
    }
    let show = !isTabGroupingActive() || getActiveTabGroup() === 'etc';
    button.hidden = !show;
    if (!show) return;
    let option = getMapCompleteActionOption((game.settings || {}).mapCompleteAction);
    button.textContent = `전투 완료: ${option.label}`;
    // 전체 메뉴 서랍에는 짧은 이름이 뜬다: "다음 지역"만으로는 이동 단추로 읽혀 무엇을 고르는 칸인지 붙인다.
    button.dataset.mobileLabel = `완료 후 행동: ${option.label}`;
    button.setAttribute('aria-label', `전투 완료 후 행동: ${option.label}`);
    button.title = `현재: ${option.label}, ${option.detail}`;
}

function applyMapCompleteAction(action) {
    let option = getMapCompleteActionOption(action);
    game.settings = game.settings || {};
    game.settings.mapCompleteAction = option.value;
    let select = document.getElementById('sel-map-complete-action');
    if (select) select.value = option.value;
    syncMapCompleteActionQuickControl();
    if (typeof queueImportantSave === 'function') queueImportantSave(180);
    if (typeof showGameToast === 'function') showGameToast(`전투 완료 후 행동: ${option.label}`, { tone: 'success' });
    updateStaticUI();
}

let mapCompleteActionPickerOpen = false;
async function openMapCompleteActionPicker(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    if (mapCompleteActionPickerOpen) return;
    let current = getMapCompleteActionOption((game.settings || {}).mapCompleteAction).value;
    let choices = getMapCompleteActionOptions().slice().sort((left, right) => (right.value === current) - (left.value === current));
    mapCompleteActionPickerOpen = true;
    try {
        let selected = await requestGameChoice({
            title: '전투 완료 후 행동',
            kicker: '자동 전투',
            message: '항목을 누르면 즉시 적용됩니다.',
            submitOnChoice: true,
            dismissOnBackdrop: true,
            choices
        });
        if (selected !== null) applyMapCompleteAction(selected);
    } finally {
        mapCompleteActionPickerOpen = false;
    }
}

safeExposeGlobals({ openMapCompleteActionPicker });

function syncCombatTacticsSettingsControls() {
    let targetSelect = document.getElementById('sel-combat-target-priority');
    let positionSelect = document.getElementById('sel-combat-position-mode');
    let help = document.getElementById('combat-tactics-help');
    if (!targetSelect || !positionSelect) return;
    let tactics = normalizeCombatTacticsSettings(game.settings);
    let unlocked = !!game.combatTacticsUnlocked;
    targetSelect.value = tactics.targetPriority;
    positionSelect.value = tactics.positionMode;
    targetSelect.disabled = !unlocked;
    positionSelect.disabled = !unlocked;
    if (help) help.textContent = unlocked
        ? '전술 이동이 실제로 발생하면 이동 속도에 따라 다음 공격이 0.3~0.65초 미뤄집니다.'
        : '액트 3을 처음 클리어하면 영구 해금됩니다.';
}

function applyChatMessageSize(size) {
    let normalized = ['small', 'medium', 'large'].includes(size) ? size : 'medium';
    if (document.body && document.body.dataset) document.body.dataset.chatMessageSize = normalized;
    return normalized;
}

function updateSettings() {
    let previousSocialChatNotifications = game.settings.socialChatNotifications !== false;
    game.settings.showCombatScene = document.getElementById('chk-combat-scene').checked;
    let cameraShakeCheckbox = document.getElementById('chk-camera-shake');
    game.settings.cameraShake = !cameraShakeCheckbox || cameraShakeCheckbox.checked;
    game.settings.hitEmphasis = document.getElementById('sel-hit-emphasis')?.value === 'mild' ? 'mild' : 'normal';
    let uiSoundsCheckbox = document.getElementById('chk-ui-sounds');
    game.settings.uiSounds = !uiSoundsCheckbox || uiSoundsCheckbox.checked;
    playUiFeedbackSound.syncSettings();
    game.settings.showCombatLog = document.getElementById('chk-log-combat').checked;
    let detailedDamageLogCheckbox = document.getElementById('chk-log-damage-detail');
    game.settings.showDetailedDamageLog = !!(detailedDamageLogCheckbox && detailedDamageLogCheckbox.checked);
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
    let chatMessageSizeSelect = document.getElementById('sel-chat-message-size');
    game.settings.chatMessageSize = applyChatMessageSize(chatMessageSizeSelect ? chatMessageSizeSelect.value : game.settings.chatMessageSize);
    if (game.settings.socialChatNotifications === false && game.noti) game.noti.social = false;
    if (previousSocialChatNotifications !== (game.settings.socialChatNotifications !== false)
        && typeof syncSocialChatNotificationSetting === 'function') syncSocialChatNotificationSetting();
    game.settings.twoRowTabs = false;
    lastTabHeaderUiSignature = null;
    let pauseOverlayCheckbox = document.getElementById('chk-pause-overlay');
    game.settings.pauseGameOnOverlay = !!(pauseOverlayCheckbox && pauseOverlayCheckbox.checked);
    let autoEquipCheckbox = document.getElementById('chk-auto-equip-empty');
    game.settings.autoEquipEmptySlots = !autoEquipCheckbox || autoEquipCheckbox.checked;
    if (game.combatTacticsUnlocked) {
        let targetSelect = document.getElementById('sel-combat-target-priority');
        let positionSelect = document.getElementById('sel-combat-position-mode');
        let tactics = normalizeCombatTacticsSettings({
            combatTargetPriority: targetSelect && targetSelect.value,
            combatPositionMode: positionSelect && positionSelect.value
        });
        game.settings.combatTargetPriority = tactics.targetPriority;
        game.settings.combatPositionMode = tactics.positionMode;
    }
    let damageFormatSelect = document.getElementById('sel-damage-number-format');
    let damageFormat = damageFormatSelect ? damageFormatSelect.value : game.settings.damageNumberFormat;
    game.settings.damageNumberFormat = ['comma', 'korean', 'korean_short', 'english'].includes(damageFormat) ? damageFormat : 'comma';
    game.settings.showExpComma = document.getElementById('chk-exp-comma').checked;
    game.settings.showHpComma = document.getElementById('chk-hp-comma').checked;
    game.settings.showEnemyHpComma = document.getElementById('chk-enemy-hp-comma').checked;
    game.settings.showCharacterComma = document.getElementById('chk-character-comma').checked;
    game.settings.mapCompleteAction = getMapCompleteActionOption((document.getElementById('sel-map-complete-action') || {}).value).value;
    let disableItemAutomationAfterLoop = document.getElementById('chk-loop-disable-item-automation');
    let postLoopMapCompleteAction = document.getElementById('sel-loop-map-complete-action');
    game.settings.disableItemAutomationAfterLoop = !disableItemAutomationAfterLoop || disableItemAutomationAfterLoop.checked;
    game.settings.postLoopMapCompleteAction = getMapCompleteActionOption(postLoopMapCompleteAction ? postLoopMapCompleteAction.value : game.settings.postLoopMapCompleteAction).value;
    let townReturnValue = (document.getElementById('sel-town-return-action') || {}).value;
    game.settings.townReturnAction = ['retry', 'stop'].includes(townReturnValue) ? townReturnValue : 'retry';
    let skinSelect = document.getElementById('sel-ui-skin');
    game.settings.uiSkin = normalizeUiSkin(skinSelect ? skinSelect.value : game.settings.uiSkin);
    let highContrastToggle = document.getElementById('chk-high-contrast');
    game.settings.highContrast = highContrastToggle ? highContrastToggle.checked : game.settings.highContrast === true;
    applyUiSkin(game.settings.uiSkin);
    applyHighContrast(game.settings.highContrast);
    toggleDeathNoticeSetting(game.settings.showDeathNotice);
    syncMapCompleteActionQuickControl();
    updateStaticUI();
}

function applyTooltipPosition(el, x, y) {
    if (!el || el.style.display === 'none') return;
    if (el.style.left !== '0px' || el.style.top !== '0px') {
        el.style.left = '0px';
        el.style.top = '0px';
    }
    let size = tooltipSizeCache.get(el);
    if (!size || size.factor !== uiDisplay.factor) {
        let rect = el.getBoundingClientRect();
        size = { width: rect.width, height: rect.height, factor: uiDisplay.factor };
        tooltipSizeCache.set(el, size);
    }
    let left = x + 18;
    let top = y + 18;
    if (left + size.width > window.innerWidth - 10) left = x - size.width - 18;
    if (top + size.height > window.innerHeight - 10) top = y - size.height - 18;
    left = clampNumber(left, 8, Math.max(8, window.innerWidth - size.width - 8));
    top = clampNumber(top, 8, Math.max(8, window.innerHeight - size.height - 8));
    ({ left, top } = tutorialActionUi.clearTooltipSpot({ left, top, width: size.width, height: size.height }, x, y));
    const deviceScale = Math.max(1, Number(window.devicePixelRatio) || 1);
    const snappedLeft = Math.round(left * deviceScale) / deviceScale;
    const snappedTop = Math.round(top * deviceScale) / deviceScale;
    el.style.transform = `translate(${snappedLeft / uiDisplay.factor}px, ${snappedTop / uiDisplay.factor}px)`;
}

function flushTooltipPositions() {
    tooltipPositionFrame = null;
    let positions = Array.from(pendingTooltipPositions.entries());
    pendingTooltipPositions.clear();
    positions.forEach(([el, point]) => applyTooltipPosition(el, point.x, point.y));
}

function positionTooltipElement(el, x, y) {
    if (!el) return;
    pendingTooltipPositions.set(el, { x: Number(x) || 0, y: Number(y) || 0 });
    if (tooltipPositionFrame !== null) return;
    tooltipPositionFrame = requestAnimationFrame(flushTooltipPositions);
}

function invalidateTooltipSize(el) {
    if (!el) return;
    tooltipSizeCache.delete(el);
}

function reuseInfoTooltip(event, token) {
    let tt = document.getElementById('info-tooltip');
    if (!token || activeInfoTooltipToken !== token || !tt || tt.style.display !== 'block' || !tt.innerHTML) return false;
    positionTooltipElement(tt, event.clientX, event.clientY);
    return true;
}
function setActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') activeTooltipId = null;
    activeTooltipId = id;
}
function clearActiveTooltip(id) {
    if (typeof activeTooltipId === 'undefined') return;
    if (activeTooltipId === id) activeTooltipId = null;
}

function showInfoTooltipHtml(x, y, html, borderColor, contentToken) {
    if (tutorialActionUi.hushesTooltipAt(x, y)) return;
    let tt = document.getElementById('info-tooltip');
    let hadComparison = tt.classList.contains('item-compare-tooltip');
    if (hadComparison) tt.classList.remove('item-compare-tooltip');
    if (tt.innerHTML !== html || hadComparison) {
        tt.innerHTML = html;
        invalidateTooltipSize(tt);
    }
    activeInfoTooltipToken = contentToken || null;
    tt.style.borderColor = borderColor || '#777';
    tt.style.display = 'block';
    positionTooltipElement(tt, x, y);
    setActiveTooltip('info-tooltip');
}
function hideInfoTooltip() {
    clearActiveTooltip('info-tooltip');
    activeInfoTooltipToken = null;
    document.getElementById('info-tooltip').style.display = 'none';
}
function showSporeCraftTooltip(event, kind) {
    let info = kind === 'corrupt'
        ? { name: '부패 홀씨', desc: '잠기지 않은 원소 피해/원소 저항 옵션 1개를 무작위로 제거합니다.', color: '#b58ad9' }
        : { name: '균열 홀씨', desc: '빈 옵션 1칸에 해당 부위의 화석 전용 옵션 1개를 추가합니다.', color: '#72c8d8' };
    let html = `<div class="tooltip-title">${info.name}</div><div class="tooltip-line">${info.desc}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, info.color);
}
safeExposeGlobals({ showSporeCraftTooltip });
document.addEventListener('mousemove', function(evt) {
    let tt = document.getElementById('info-tooltip');
    if (!tt || tt.style.display === 'none') return;
    let anchor = evt.target && evt.target.closest ? evt.target.closest('[data-info-tooltip-anchor="1"]') : null;
    if (!anchor && evt.target && evt.target.closest) anchor = evt.target.closest('.tip, .skill-gem, .support-gem, .item-card, .currency-card');
    let overTooltip = evt.target && evt.target.closest ? evt.target.closest('#info-tooltip') : null;
    if (!anchor && !overTooltip) hideInfoTooltip();
    else positionTooltipElement(tt, evt.clientX, evt.clientY);
});
window.addEventListener('resize', function() {
    tooltipSizeCache = new WeakMap();
});

function renderBreakdownHtml(data) {
    let html = `<div class="tooltip-title">${data.title}</div>`;
    (data.lines || []).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">최종 수치: ${data.final}</div>`;
    return html;
}

function showStatTooltip(event, key) {
    // Combat ticks keep numeric stats only; build current explanations on explicit inspection.
    let stats = getUiPlayerStats();
    cachedTooltipStats = stats;
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    const rect = event.currentTarget.getBoundingClientRect();
    showInfoTooltipHtml(event.clientX ?? rect.left, event.clientY ?? rect.bottom, renderBreakdownHtml(data), '#f39c12');
}


function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
    let visual = getUiCombatEffectPresentation(type);
    let p = Math.max(0.1, Number(power || 0.1));
    let source = Math.max(0, Number(sourceHitDamage || 0));
    let detail = '';
    if (isUiDamageAilmentType(type)) {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let dps = getUiPlayerDamageAilmentDps({ type: type, power: p, sourceHitDamage: source }, tooltipStats);
        let basis = source > 0 ? `받은 피해 ${Math.floor(source)} 기준` : '최대 생명력 기반';
        detail = `초당 피해: 약 ${dps} <span style="color:var(--copy-bright);">(${basis})</span>`;
    } else if (type === 'chill') detail = `공격 속도 약 32% 감소`;
    else if (type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let shockTakenIncrease = getUiPlayerShockTakenDamageIncreasePct(p, tooltipStats);
        detail = formatUiTakenDamageShockLine(shockTakenIncrease);
    }
    else if (type === 'freeze') detail = '행동 불가';
    let html = `<div class="tooltip-title">${escapeHTML(visual.label)}</div><div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(timeLeft||0)))}초</div><div class="tooltip-line">위력: ${p.toFixed(2)}</div><div class="tooltip-line">${detail}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ff7f7f');
}

function showPlayerEhpTooltip(event) {
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    const html = `<div class="tooltip-title">속성별 실효 체력</div><div class="tooltip-line">${escapeHTML(anchor.dataset.ehpDetail)}</div><div class="tooltip-line tooltip-muted">공격 EHP는 회피를 포함한 평균 내구도, 직격 EHP는 회피하지 못한 타격 기준입니다.</div>`;
    showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}

function showMapProgressTooltip(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const speed = Math.max(1, Number(cachedTooltipStats?.moveSpeed) || 100);
    const multiplier = speed / 100;
    const saved = (1 - 1 / multiplier) * 100;
    const html = `<div class="tooltip-title">이동 속도와 진행도</div><div class="tooltip-line">이동 속도 ${speed.toFixed(1)}, 기본 대비 ${multiplier.toFixed(2)}배</div><div class="tooltip-line">같은 이동 구간의 소요 시간 ${Math.abs(saved).toFixed(1)}% ${saved >= 0 ? '단축' : '증가'}</div>`;
    showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}
safeExposeGlobals({ showPlayerEhpTooltip, showMapProgressTooltip });

function showPlayerExperienceTooltip(event) {
    let progress = getUiExperienceProgress(game.level, game.exp);
    let current = formatSettingNumber(progress.current, 'showExpComma');
    let required = formatSettingNumber(progress.required, 'showExpComma');
    let remaining = formatSettingNumber(progress.remaining, 'showExpComma');
    let html = '<div class="tooltip-title">경험치</div>'
        + `<div class="tooltip-line">현재: ${current} / ${required}</div>`
        + `<div class="tooltip-line">다음 레벨까지: ${remaining}</div>`
        + `<div class="tooltip-line">진행도: ${progress.percent.toFixed(1)}%</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#c89be8');
}

function showPlayerRuntimeEffectTooltip(event, type, value, maxValue, remainSec) {
    let visual = getUiCombatEffectPresentation(type);
    let detail = getUiRuntimeEffectDetail(type, value, maxValue);
    let duration = Number(remainSec || 0) > 0
        ? `<div class="tooltip-line">남은 시간: ${Math.ceil(remainSec)}초</div>` : '';
    let html = `<div class="tooltip-title">${escapeHTML(visual.label)}</div>${duration}<div class="tooltip-line">${escapeHTML(detail)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}

function showPlayerNamedEffectTooltip(event, type, name, detail, remainSec) {
    let visual = getUiCombatEffectPresentation(type);
    let duration = Number(remainSec || 0) > 0
        ? `<div class="tooltip-line">남은 시간: ${Math.ceil(remainSec)}초</div>` : '';
    let html = `<div class="tooltip-title">${escapeHTML(name || visual.label)}</div>${duration}`
        + `<div class="tooltip-line">${escapeHTML(detail || '효과가 적용 중입니다.')}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}

function showPlayerCosmosDebuffTooltip(event, type, value, remainSec, label) {
    let visual = getUiCombatEffectPresentation(type);
    let safeLabel = escapeHTML(label || visual.label);
    let html = `<div class="tooltip-title">${safeLabel}</div>`
        + `<div class="tooltip-line">남은 시간: ${Math.ceil(Math.max(0, Number(remainSec || 0)))}초</div>`
        + `<div class="tooltip-line">${safeLabel} -${Math.max(0, Number(value || 0)).toFixed(0)}%</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
}
function findConditionEffectDelta(name, type) {
    if (type !== 'curse') return (talismanCombat.active().find(row => row.buff.name === name) || {}).delta || null;
    for (const rows of Object.values(game.enemyConditionDebuffs || {})) {
        const row = (rows || []).find(entry => entry && entry.name === name);
        if (row) return row.delta;
    }
    return null;
}

function showPlayerBuffTooltip(event, name, type, remainSec) {
    const typeLabel = { curse: '저주', warcry: '함성', guard: '수호' }[type] || '효과';
    let html = `<div class="tooltip-title">${escapeHTML(getConditionEffectTitle(name))}</div><div class="tooltip-line">분류: ${typeLabel}, 부적 조건부 줄</div>`;
    if (Number(remainSec) > 0) html += `<div class="tooltip-line">남은 시간: ${Math.ceil(Number(remainSec))}초</div>`;
    html += `<div class="tooltip-line">${escapeHTML(talismans.describeDelta(findConditionEffectDelta(name, type)) || '효과 없음')}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}

const UI_ENEMY_AILMENT_DETAIL_FORMATTERS = Object.freeze({
    chill: () => '이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)',
    freeze: () => '행동 불가 (최대 생명력 대비 타격 비율 반영)',
    hunterExpose: () => `헌터 전직 키스톤 효과로 받는 모든 피해가 ${ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct}% 증가합니다.`,
    assassinWeakness: state => `${Math.floor(state.power)}중첩, 중첩당 받는 피해 ${ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack}% 증가`,
    cosmosJudgment: state => `모든 저항 ${state.power.toFixed(0)}% 감소`,
    realmAllResDown: state => `모든 저항 약화 ${state.stacks}중첩`
});

function getUiEnemyDamageAilmentTooltipDetail(state) {
    let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
    let ailmentDps = getUiEnemyDamageAilmentDps({
        type: state.type,
        power: state.power,
        sourceHitDamage: state.sourceHitDamage,
        critDotBonusPct: state.critDotBonusPct
    }, tooltipStats);
    let totalDamage = Math.max(0, Math.floor(ailmentDps * state.stacks * state.timeLeft));
    let stackText = state.stacks > 1 ? `, ${state.stacks}중첩` : '';
    return `총 피해량: 약 ${totalDamage} <span style="color:var(--copy-bright);">(원천피해: ${Math.floor(state.sourceHitDamage)} / 초당 피해: 약 ${ailmentDps}${stackText})</span>`;
}

function getUiFlameDecayTooltipDetail(state) {
    let dps = Math.max(0, Math.floor(state.specialDps));
    let totalDamage = Math.max(0, Math.floor(dps * state.timeLeft));
    let rawTick = Math.max(0, Math.floor(state.rawTickDamage));
    let interval = Math.max(0.02, state.tickInterval);
    let rawDps = rawTick > 0 ? Math.floor(rawTick / interval) : 0;
    let resistText = Number.isFinite(state.enemyRes) ? `, 적 화염 저항/관통 후 ${state.enemyRes.toFixed(1)}%` : '';
    let abyssText = Math.abs(state.abyssPlayerMul - 1) > 0.001 ? `, 심연/지역 배율 ${state.abyssPlayerMul.toFixed(2)}x` : '';
    return `총 피해량: 약 ${totalDamage} <span style="color:var(--copy-bright);">(최종 초당 피해: 약 ${dps}, 원시 ${rawDps}/s${resistText}${abyssText})</span><br><span style="color:#ffb48a;">점화 피해 증폭: ${state.igniteTakenMultiplier.toFixed(2)}x (생명력 기반 시너지)</span>`;
}

function getUiEnemyAilmentTooltipDetail(state) {
    if (isUiDamageAilmentType(state.type)) return getUiEnemyDamageAilmentTooltipDetail(state);
    if (state.type === 'flameDecay') return getUiFlameDecayTooltipDetail(state);
    if (state.type === 'shock') {
        let tooltipStats = cachedTooltipStats || getUiPlayerStats(null);
        let increase = getUiEnemyShockTakenDamageIncreasePct(state.power, tooltipStats);
        return `${formatUiTakenDamageShockLine(increase)} <span style="color:var(--copy-bright);">(최대 생명력 대비 타격 비율 반영)</span>`;
    }
    let formatter = UI_ENEMY_AILMENT_DETAIL_FORMATTERS[state.type];
    return formatter ? formatter(state) : '효과가 적용 중입니다.';
}

function showEnemyAilmentTooltip(event, payload) {
    let source = payload && typeof payload === 'object' ? payload : {};
    let state = {
        type: String(source.type || 'unknown'),
        timeLeft: Math.max(0, Number(source.timeLeft) || 0),
        power: Math.max(0, Number(source.power) || 0),
        sourceHitDamage: Math.max(0, Number(source.sourceHitDamage) || 0),
        specialDps: Math.max(0, Number(source.specialDps) || 0),
        critDotBonusPct: Number(source.critDotBonusPct) || 0,
        stacks: Math.max(1, Math.floor(Number(source.stacks) || 1)),
        rawTickDamage: Math.max(0, Number(source.rawTickDamage) || 0),
        tickInterval: Math.max(0.02, Number(source.tickInterval) || 0.02),
        enemyRes: Number.isFinite(Number(source.enemyRes)) ? Number(source.enemyRes) : NaN,
        abyssPlayerMul: Number.isFinite(Number(source.abyssPlayerMul)) ? Number(source.abyssPlayerMul) : 1,
        igniteTakenMultiplier: Math.max(1, Number(source.igniteTakenMultiplier) || 1)
    };
    let visual = getUiCombatEffectPresentation(state.type);
    let powerLine = isUiDamageAilmentType(state.type) || state.type === 'hunterExpose'
        ? '' : `<div class="tooltip-line">위력: ${state.power.toFixed(2)}</div>`;
    let html = `<div class="tooltip-title">${escapeHTML(visual.label)}</div><div class="tooltip-line">남은 시간: ${Math.ceil(state.timeLeft)}초</div>${powerLine}<div class="tooltip-line">${getUiEnemyAilmentTooltipDetail(state)}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#ffcf88');
}

function getGemTargetSummaryHtml(skill) {
    const label = { all: '광역', whirl: '광역 회전', cleave: '전방 다중', chain: '연쇄', pierce: '관통' }[skill.targetMode] || '단일';
    let maxTargets = Math.max(1, skill.targets || 1);
    if (skill.targetMode === 'all') maxTargets = Math.min(8, Math.max(6, skill.targets || 6));
    return `<div class="tooltip-line">타겟 방식: ${label}</div><div class="tooltip-line">최대 타겟 수: ${maxTargets}</div>`;
}

function showGemTooltip(event, type, name, target = null) {
    if (!target && document.getElementById('gem-selection')?.matches(':popover-open')) return;
    let cacheKey = `${type || 'active'}:${name}`;
    if (!target && reuseInfoTooltip(event, cacheKey)) return;
    let stats = cachedTooltipStats || getUiPlayerStats();
    if (gemTooltipCache && gemTooltipCache.key === cacheKey && gemTooltipCache.stats === stats) {
        if (target) { target.innerHTML = gemTooltipCache.html; return; }
        showInfoTooltipHtml(event.clientX, event.clientY, gemTooltipCache.html, gemTooltipCache.border, cacheKey);
        return;
    }
    let info = getUiGemPresentation(name, type === 'support', stats);
    let html = `<div class="tooltip-title">${name}</div>`;
    if (type === 'support') {
        html += `<div class="tooltip-line">${keepKoreanUnitParticles(info.desc)}</div>`;
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
            html += `<div class="tooltip-line">적용 태그: <span class="gem-card-tags gem-tooltip-tags">${renderGemTagChips({ tags: [tag] }, 1)}</span></div>`;
        }
        if (SUPPORT_GEM_DB[name] && Array.isArray(SUPPORT_GEM_DB[name].tags) && SUPPORT_GEM_DB[name].tags.includes('summon')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? `, 특징: ${preview.trait}` : ''}</div>`;
                html += `<div class="tooltip-line">소환수 레벨: ${preview.gemLevel}</div>`;
                if (preview.maxHp > 0) html += `<div class="tooltip-line">수액 골렘 생명력: 약 ${Math.floor(preview.maxHp).toLocaleString()}</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">피해 대리: 히트 피해 ${preview.redirectPct.toFixed ? preview.redirectPct.toFixed(1) : preview.redirectPct}%</div>`;
            }
        }
    } else {
        let skill = info.skill || SKILL_DB[name];
        let rawSkillTags = Array.isArray(skill.tags) ? skill.tags : [];
        let isSummonAttackTooltip = rawSkillTags.includes('summon_attack');
        html += `<div class="tooltip-line">${keepKoreanUnitParticles(info.desc)}</div>`;
        if (!isSummonAttackTooltip && typeof describeSkillGridProfile === 'function') {
            html += `<div class="tooltip-line" style="margin-top:6px;color:#7fffd4;">${describeSkillGridProfile(name, skill)}</div>`;
        }
        if (!isSummonAttackTooltip) {
            html += `<div class="tooltip-line" style="margin-top:6px;color:${getItemStatToneColor('pctDmg')};">피해 배율 ${formatPercentMultiplier(skill.dmg || skill.baseDmg || 1)}</div>`;
            html += `<div class="tooltip-line" style="color:${getItemStatToneColor('aspd')};">공속 배율 ${formatPercentMultiplier(skill.spd || skill.baseSpd || 1)}</div>`;
        }
        if (rawSkillTags.includes('spell')) {
            let spellLv = Math.max(1, info.finalLevel || 1);
            let spellFlat = getGemSpellBaseDamage(skill, spellLv);
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
                ? `, 현재 초과 ${appliedOvercap.toFixed(1)}% 중 적용 ${effectiveOvercap.toFixed(1)}% (미적용 화염 저항 ${Math.floor(rawFireRes)}% / 최대 ${Math.floor(maxFireRes)}%)`
                : ', 현재 최대 화염 저항을 초과한 미적용 화염 저항 기준';
            html += `<div class="tooltip-line">초과 화염 저항 계수: 최대 화염 저항 초과 1%당 배율 +${Number(skill.fireResOvercapMulPerPct || 0).toFixed(2)}배${capText}${currentText}</div>`;
        }
        if (name === '화염 부패') html += `<div class="tooltip-line">특수 규칙: 공격력(기본 피해) 미적용, 적에게 화염 부패 디버프 적용, 화염 부패 대상은 점화 피해가 생명력 100당 8% 증폭(최대 ${(Math.max(1, Number(skill.igniteTakenMaxMultiplier || 0)) || 1).toFixed(1)}x)</div>`;
        if ((skill.dotMultiplier || 1) !== 1) html += `<div class="tooltip-line">지속 피해 배율 ${(skill.dotMultiplier || 1).toFixed(2)}x</div>`;
        if ((skill.multiHit || 1) > 1) html += `<div class="tooltip-line">다단 히트: 1회 시전당 ${Math.floor(skill.multiHit)}회 타격${skill.repeatHitDamagePct ? `, 후속 타격 ${skill.repeatHitDamagePct}%` : ''}${skill.randomTargetEachHit ? ' (타격마다 무작위 대상)' : ''}</div>`;
        if (skill.extraProjectileDamagePct) html += `<div class="tooltip-line">추가 투사체 타격 배율: 기본 타격의 ${Number(skill.extraProjectileDamagePct).toFixed(0)}%</div>`;
        if (skill.ailmentChanceBonus) {
            let bonusText = Object.entries(skill.ailmentChanceBonus).map(([type, value]) => `${getAilmentDisplayLabel(type)} +${value}%`).join(' / ');
            html += `<div class="tooltip-line">상태이상 확률 보너스: ${bonusText}</div>`;
        }
        if (skill.activeAilmentDamageMore) html += `<div class="tooltip-line">${getAilmentDisplayLabel(skill.activeAilmentDamageMore.type)} 상태인 적에게 적중 피해 ${skill.activeAilmentDamageMore.pct}% 증폭</div>`;
        if (skill.consumeAilmentDamageMore) {
            let consumeText = skill.consumeAilmentDamageMore.map(row => `${getAilmentDisplayLabel(row.type)} 소모 시 ${row.pct}%`).join(' / ');
            html += `<div class="tooltip-line">상태 소모 증폭: ${consumeText} 증폭</div>`;
        }
        if (skill.ailmentSpreadOnHit) html += `<div class="tooltip-line">전파: ${Math.round(skill.ailmentSpreadOnHit.chance * 100)}% 확률로 다른 적 ${skill.ailmentSpreadOnHit.targets}기</div>`;
        if (skill.missingLifeDamagePct) html += `<div class="tooltip-line">잃은 생명력 비례 피해: 최대 +${skill.missingLifeDamagePct}%</div>`;
        if (skill.executeThreshold) html += `<div class="tooltip-line">처형: 일반 적 생명력 ${(skill.executeThreshold * 100).toFixed(0)}% 미만</div>`;
        if (skill.periodicOnHit) html += `<div class="tooltip-line">반복 타격: ${skill.periodicOnHit.interval}초 간격, ${skill.periodicOnHit.hits}회, 적중 피해의 ${skill.periodicOnHit.damagePct}%</div>`;
        if (skill.dotStackCap) html += `<div class="tooltip-line">누적: 최대 ${skill.dotStackCap}중첩, 중첩당 피해 +${skill.dotStackDamagePct}% / 둔화 +${skill.dotStackSlowPct}%</div>`;
        if (skill.dotTransferOnDeath) html += `<div class="tooltip-line">처치 전파: 남은 지속 피해의 ${skill.dotTransferOnDeath.remainingDamagePct}%를 다른 적 ${skill.dotTransferOnDeath.targets}기에게 이전</div>`;
        if (!isSummonAttackTooltip) html += getGemTargetSummaryHtml(skill);
        if ((info.tags || []).length > 0) html += `<div class="tooltip-line">태그: <span class="gem-card-tags gem-tooltip-tags">${renderGemTagChips(info, info.tags.length)}</span></div>`;
        if (skill.crit) html += `<div class="tooltip-line">추가 치명타 +${Number(skill.crit).toFixed(Number.isInteger(skill.crit) ? 0 : 1)}%</div>`;
        if (skill.critScale) html += `<div class="tooltip-line">치명타 성장: 젬 레벨당 +${skill.critScale}%</div>`;
        if (skill.pierceOverkillCarry) html += `<div class="tooltip-line" style="color:#8fffe0;">특수 옵션: 각 원본 타겟의 초과 피해가 다른 적에게 연속 관통</div>`;
        if (skill.leech) html += `<div class="tooltip-line">추가 흡혈 +${skill.leech}%</div>`;
        if (skill.instantLeech) html += `<div class="tooltip-line" style="color:#ffb3d1;">특수 옵션: 이 젬을 사용해서 주는 피해에는 흡혈 즉시 적용</div>`;
        if (rawSkillTags.includes('summon')) {
            const preview = (typeof getSummonTooltipPreview === 'function') ? getSummonTooltipPreview(name, stats) : null;
            if (preview) {
                html += `<div class="tooltip-line" style="margin-top:6px;color:#9fd4ff;">소환수 유형: ${preview.roleLabel}${preview.trait ? `, 특징: ${preview.trait}` : ''}</div>`;
                html += `<div class="tooltip-line">소환수 레벨: ${preview.gemLevel}</div>`;
                html += `<div class="tooltip-line">예상 1타 피해: ${preview.hitDamageMin} ~ ${preview.hitDamageMax}${preview.attackPerSecond > 0 ? `, 공속 ${preview.attackPerSecond}/s` : ''}</div>`;
                html += `<div class="tooltip-line">소환수 생명력: ${Math.floor(preview.maxHp).toLocaleString()}, 자체 재생 ${Math.floor(preview.regenPerSec).toLocaleString()}/s</div>`;
                html += `<div class="tooltip-line">회피 ${Math.floor(preview.evasion).toLocaleString()}, 현재 지역 적 기준 ${preview.evadeChancePct.toFixed(1)}%</div>`;
                if (preview.critChancePct > 0) html += `<div class="tooltip-line">치명타: ${preview.critChancePct}%, 치명 피해 ${Math.floor(preview.critDmgPct)}%</div>`;
                if (preview.resPenBonus > 0) html += `<div class="tooltip-line">소환수 자체 저항 관통 +${preview.resPenBonus}%</div>`;
                if (preview.physIgnoreBonus > 0) html += `<div class="tooltip-line">소환수 자체 물리 피해 감소 무시 +${preview.physIgnoreBonus}%</div>`;
                if (preview.redirectPct > 0) html += `<div class="tooltip-line">피해 대리: 히트 피해 ${preview.redirectPct}%</div>`;
            }
        }
    }
    if (type === 'support' || SKILL_DB[name].isGem || SKILL_DB[name].levelable) {
        let gemBonusSources = info.gemBonusSources || stats.gemBonusSources;
        html += `<div class="tooltip-line" style="margin-top:8px; color:#2ecc71;">총 레벨 ${type === 'support' ? info.totalLevel : info.finalLevel}</div>`;
        const sources = [['패시브', gemBonusSources.passive], ['장비', gemBonusSources.gear], ['보상', gemBonusSources.reward],
            ['군주의 핵', info.bossCoreLevel === 5 ? 1 : 0], ['창공의 정수', info.skyCoreLevel === 5 ? 1 : 0],
            ['응축 창공', info.permanentSkyBonus], ['각성', info.awakened ? 2 : 0]];
        const levels = sources.filter(([, value]) => value > 0).map(([label, value]) => `${label} +${value}`);
        levels.unshift(`젬 Lv.${type === 'support' ? info.baseLevel : Math.min(20, info.baseLevel)}`);
        html += `<div class="tooltip-line">${levels.join(', ')}</div>`;
    }
    if (info.bossCoreLevel > 0) html += `<div class="tooltip-line gem-core-tone">군주의 핵 피해 ${info.bossCoreLevel * GEM_CORE_FORGE.tracks.bossCore.stepPct}% 증폭</div>`;
    if (info.skyCoreLevel > 0) html += `<div class="tooltip-line gem-sky-tone">창공의 정수 공격/시전 속도 ${info.skyCoreLevel * GEM_CORE_FORGE.tracks.skyEssence.stepPct}% 증폭</div>`;
    let border = type === 'support' ? '#2bcbba' : '#ff5252';
    // 설명 글의 핵심어와 수치는 장비 옵션 색(2026-10-06). 이미 색이 있는 줄, 꼬리표, 제목은 그대로다.
    html = statToneText.markup(html);
    gemTooltipCache = { key: cacheKey, html: html, border: border, stats: stats };
    if (target) { target.innerHTML = html; return; }
    showInfoTooltipHtml(event.clientX, event.clientY, html, border, cacheKey);
}

// 능력치 → 옵션 색(장비 옵션 줄과 설명 글이 함께 쓴다, js/stat-tone-text-ui.js). 표에 없는 능력치는 이름 조각으로 고른다.
// 2026-10-06: 흰색으로 떨어지거나 글자 조각 때문에 엉뚱한 색이 나던 능력치(그루터기 열매, 루프 노드, 받는 피해 감소)를 표에 넣었다.
const ITEM_STAT_TONE_BY_ID = Object.freeze(Object.fromEntries([
    ['#ff9a76', ['firePctDmg', 'resF', 'igniteChance', 'fireResOvercapMulPerPct']],
    ['#8fd3ff', ['coldPctDmg', 'resC', 'freezeChance']],
    ['#ffe083', ['lightPctDmg', 'resL', 'shockChance']],
    ['#c7a6ff', ['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance']],
    ['#ffd2a6', ['armor', 'armorPct', 'dr', 'takenDamageReduceWhen1EnemyPct', 'takenDamageReduceWhen2EnemiesPct']],
    ['#baffc2', ['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce']],
    ['#8fdcff', ['energyShield', 'energyShieldPct', 'energyShieldRegen', 'energyShieldRechargeFaster']],
    ['#ffb3b3', ['flatHp', 'pctHp', 'regen', 'regenFlat']],
    ['#ffd6f2', ['crit', 'critDmg']],
    ['#fff3a8', ['aspd', 'move', 'sight']],
    ['#ffcf9f', ['flatDmg', 'pctDmg', 'physPctDmg', 'meleePctDmg', 'aoePctDmg', 'minDmgRoll', 'maxDmgRoll',
        'bossDamagePct', 'eliteDamagePct', 'firstStrikeDamagePct', 'doubleDamageChance']],
    ['#d4a8ff', ['spellFlatPct', 'spellFlatDmg']],
    ['#ff8fa3', ['leech']],
    ['#ffcb8e', ['resPen', 'resAll', 'ds']],
    ['#a8e6cf', ['gemLevel', 'suppCap', 'expGain', 'summonEfficiency', 'summonCap']],
    // 세계수 기운(12번 루프 27): 지역 줄은 그 지역 색(data/region-affixes.js REGION_AFFIX_TONES).
    ...REGION_AFFIX_MODS.map(row => [REGION_AFFIX_TONES[row.regions[0]], [row.statId]])
].flatMap(([tone, ids]) => ids.map(id => [id, tone]))));

/** The '세계수 기운' line of an item that remembers its atlas region (item.dropRegion), in the region's colour; '' otherwise. */
function getItemDropRegionLineHtml(item) {
    const region = item && item.dropRegion ? ATLAS.regions.find(row => row.id === item.dropRegion) : null;
    return region ? `<div class="tooltip-line" style="color:${REGION_AFFIX_TONES[region.id]};">🌳 세계수 기운: ${escapeHTML(region.name)}</div>` : '';
}

function getItemStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    let id = String(statId);
    let low = id.toLowerCase();
    if (ITEM_STAT_TONE_BY_ID[id]) return ITEM_STAT_TONE_BY_ID[id];

    if (low.includes('res') || low.includes('pen')) return '#ffcb8e';
    if (low.includes('chaos') || low.includes('dot') || low.includes('poison') || low.includes('bleed')) return '#c7a6ff';
    if (low.includes('fire') || low.includes('ignite') || low.includes('burn')) return '#ff9a76';
    if (low.includes('cold') || low.includes('freeze') || low.includes('chill')) return '#8fd3ff';
    if (low.includes('light') || low.includes('shock')) return '#ffe083';
    if (low.includes('hp') || low.includes('life') || low.includes('regen') || low.includes('leech')) return '#ffb3b3';
    if (low.includes('armor') || low.includes('block') || low.includes('guard') || low.includes('dr')) return '#ffd2a6';
    if (low.includes('evasion') || low.includes('dodge') || low.includes('deflect')) return '#baffc2';
    if (low.includes('energyshield') || low.includes('es')) return '#8fdcff';
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
    return weaponCategorySlotLabel(item, String(label || '장비').replace(/[12]$/, ''));
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

function getHoneyLockBadgeHtml(stat) {
    return stat && stat.lockedByHoney
        ? ' <span class="item-affix-lock item-affix-lock--honey" title="마력 깃든 벌꿀로 고정되어 재련/소멸되지 않는 옵션">🍯 벌꿀 고정</span>'
        : '';
}

function getUniqueEffectApplicationHint(item, isEquipped, equipSlotKey) {
    if (!item || item.rarity !== 'unique' || !item.uniqueEffectKey) return '';
    let key = String(item.uniqueEffectKey || '');
    if (key === 'rightRingSummonCap') {
        if (isEquipped && equipSlotKey !== '반지2') return '현재 조건 미충족: 오른쪽 반지 슬롯에 장착해야 적용';
        return '오른쪽 반지 슬롯 전용';
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
        queenBeeSummonOnHit: '적중 시 확률 발동',
        implicitAmp: '이 장비의 기본 옵션에 적용',
        loopGrowth: '지금 루프 수만큼 적용',
        familyBond: '장착한 수평 베이스 수만큼 적용',
        sightBeyond: '탐험 지도에서 적용',
        chestLuck: '탐험 지도를 열 때 적용',
        emberHeart: '장착한 타락 장비 수만큼 적용',
        amberTime: '장착한 장비의 품질 합만큼 적용',
        witheredEcho: '목걸이에 새긴 노드 수만큼 적용',
        nurseryBloom: '그루터기 함의 성장 완료된 씨앗과 수액 수만큼 적용'
    };
    if (triggerLabels[key]) return triggerLabels[key];
    if (key === 'uniqueTakenReduceWhen1Enemy') return '생존한 적이 1명일 때만 적용';
    if (key === 'uniqueTakenReduceWhen2Enemies') return '생존한 적이 2명 이상일 때만 적용';
    if (key === 'crowdEvasionMore') return '요구 적 수를 만족할 때만 적용';
    if (key === 'mirrorOppositeRing') return '반대쪽 반지의 옵션을 복제';
    if (key === 'kaleidoscopeShield') return '이 장비의 추가 옵션에 적용';
    if (/OnHit|onHit|OnKill|onKill|OnCrit|onCrit|OnBlock|onBlock/.test(key)) return '전투 조건 충족 시 발동';
    return '';
}

function getPlayerStatComparisonLines(before, after) {
    return Object.keys(COMPARE_STAT_META).map(key => {
        let diff = (after[key] || 0) - (before[key] || 0);
        if (Math.abs(diff) < 0.001) return null;
        let meta = COMPARE_STAT_META[key];
        let color = diff > 0 ? '#2ecc71' : '#e74c3c';
        let sign = diff > 0 ? '▲' : '▼';
        return `<div class="tooltip-line item-compare-line"><span style="color:${color}">${sign}</span> ${meta.label}: <span style="color:${color}">${meta.format(Math.abs(diff))}</span></div>`;
    }).filter(Boolean);
}

let itemTooltipHideTimer = null;

const itemTooltipComparisonScheduler = (() => {
let activeJob = null;
let pointer = { x: 0, y: 0 };

function cancel() {
    let job = activeJob;
    activeJob = null;
    if (!job) return;
    if (job.delayHandle !== null) cancelAnimationFrame(job.delayHandle);
    if (job.workHandle === null) return;
    if (job.workKind === 'idle' && typeof cancelIdleCallback === 'function') cancelIdleCallback(job.workHandle);
    else clearTimeout(job.workHandle);
}

function setPointer(event) {
    pointer = {
        x: Number.isFinite(event && event.clientX) ? event.clientX : 0,
        y: Number.isFinite(event && event.clientY) ? event.clientY : 0
    };
}

function getComparisonSlots(item) {
    let slots = getEquipCandidateSlots(item).filter(slotKey => !!game.equipment[slotKey]);
    if (slots.length === 0) slots = getEquipCandidateSlots(item);
    return slots;
}

function isActive(job) {
    if (activeJob !== job) return false;
    if (job.receiver) return job.receiver.isActive();
    if (activeItemTooltipToken !== job.tooltipToken) return false;
    return !(typeof equipmentInventoryInteraction !== 'undefined'
        && equipmentInventoryInteraction && typeof equipmentInventoryInteraction.isCarrying === 'function'
        && equipmentInventoryInteraction.isCarrying());
}

function keepActive(job) {
    if (isActive(job)) return true;
    if (activeJob === job) cancel();
    return false;
}

function buildSlotPanel(item, targetSlot) {
    const before = getUiPlayerStats({}, false);
    let equipment = game.equipment;
    let hadSlot = Object.prototype.hasOwnProperty.call(equipment, targetSlot);
    let backup = equipment[targetSlot];
    let twinBackup = Array.isArray(game.cosmosTwinKeystones)
        ? game.cosmosTwinKeystones.slice() : game.cosmosTwinKeystones;
    let after = before;
    try {
        equipment[targetSlot] = item;
        after = getUiPlayerStats({}, false);
    } finally {
        if (hadSlot) equipment[targetSlot] = backup;
        else delete equipment[targetSlot];
        game.cosmosTwinKeystones = twinBackup;
    }
    let changedLines = getPlayerStatComparisonLines(before, after);
    if ((backup && backup.uniqueEffect) !== item.uniqueEffect) {
        let hint = item.uniqueEffect ? getUniqueEffectApplicationHint(item, true, targetSlot) : '';
        if (item.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#d8b5ff;">◆ 획득: ${escapeHTML(item.uniqueEffect)}${hint ? `<small style="display:block;color:#a995bf;">${escapeHTML(hint)}</small>` : ''}</div>`);
        if (backup && backup.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#c98f9f;">◇ 상실: ${escapeHTML(backup.uniqueEffect)}</div>`);
    }
    let label = getDualSlotDisplayLabel(targetSlot);
    if (changedLines.length > 0) return `<div class="item-compare-panel"><div class="tooltip-line item-compare-title">${label} 기준 착용 시 변화</div>${changedLines.join('')}</div>`;
    if (!isDualSlotItem(item.slot)) return '';
    return `<div class="item-compare-panel item-compare-empty"><div class="tooltip-line item-compare-title">${label}</div><div class="tooltip-line">교체 시 변화 없음</div></div>`;
}

function apply(job, result) {
    if (!keepActive(job)) return;
    if (job.receiver) { job.receiver.apply(result); return; }
    let tt = document.getElementById('item-tooltip-box');
    if (!tt) return;
    tt.classList.toggle('item-compare-tooltip', result.hasSections);
    tt.classList.toggle('dual-compare-tooltip', result.hasSections && isDualSlotItem(job.item.slot));
    tt.innerHTML = result.hasSections
        ? `<div class="item-tooltip-main">${job.mainHtml}</div>${result.markup}` : job.mainHtml;
    invalidateTooltipSize(tt);
    positionTooltipElement(tt, pointer.x, pointer.y);
}

function finish(job) {
    let sections = job.sections.filter(Boolean);
    let layoutClass = sections.length > 1 ? 'item-compare-grid' : 'item-compare-single';
    let result = {
        hasSections: sections.length > 0,
        markup: sections.length > 0 ? `<div class="${layoutClass}">${sections.join('')}</div>` : ''
    };
    apply(job, result);
    if (activeJob === job) activeJob = null;
}

function fail(job, error) {
    console.error('equipment tooltip comparison failed:', error);
    let result = {
        hasSections: true,
        markup: '<div class="item-compare-single"><div class="item-compare-panel item-compare-empty"><div class="tooltip-line">장비 비교를 표시하지 못했습니다.</div></div></div>'
    };
    apply(job, result);
    if (activeJob === job) activeJob = null;
}

function queueWork(job) {
    if (!keepActive(job)) return;
    let run = () => {
        job.workHandle = null;
        if (!keepActive(job)) return;
        let slot = job.slots[job.index++];
        try {
            job.sections.push(buildSlotPanel(job.item, slot));
        } catch (error) {
            fail(job, error);
            return;
        }
        if (job.index >= job.slots.length) finish(job);
        else queueWork(job);
    };
    if (typeof requestIdleCallback === 'function') {
        job.workKind = 'idle';
        job.workHandle = requestIdleCallback(run, { timeout: 240 });
    } else {
        job.workKind = 'timeout';
        job.workHandle = setTimeout(run, 0);
    }
}

/** @param {{isActive: () => boolean, apply: (result: {hasSections: boolean, markup: string}) => void} | null} receiver */
function schedule(item, tooltipToken, mainHtml, receiver = null) {
    cancel();
    let slots = getComparisonSlots(item);
    if (slots.length === 0) return;
    let job = {
        item, tooltipToken, mainHtml, receiver, slots, sections: [], index: 0,
        delayHandle: null, workHandle: null, workKind: ''
    };
    activeJob = job;
    // Paint details first; each idle slice compares one slot against fresh stats.
    job.delayHandle = requestAnimationFrame(() => {
        job.delayHandle = null;
        queueWork(job);
    });
}

return Object.freeze({ cancel, schedule, setPointer });
})();

/** The tooltip context; a jewel or a core draws its own card here and the equipment tooltip stops (js/bag-items-ui.js). */
function prepareItemTooltip(event, item, idx, isEquip, options) {
    const context = prepareItemTooltipContext(event, item, idx, isEquip, options);
    return context && bagItemsUi.presentTooltip(context, event, item) ? null : context;
}

function prepareItemTooltipContext(event, item, idx, isEquip, options) {
    if (options.target) return { target: options.target, inline: true };
    if (equipmentInventoryInteraction.getFocusedKey()) return null;
    if (itemTooltipHideTimer) {
        clearTimeout(itemTooltipHideTimer);
        itemTooltipHideTimer = null;
    }
    let nextTooltipToken = options.token || (isEquip ? `equip:${idx}:${item.id}` : `inv:${idx}:${item.id}`);
    let tt = document.getElementById('item-tooltip-box');
    itemTooltipComparisonScheduler.setPointer(event);
    if (activeItemTooltipToken === nextTooltipToken && tt.style.display === 'block' && tt.innerHTML) {
        positionTooltipElement(tt, event.clientX, event.clientY);
        return null;
    }
    itemTooltipComparisonScheduler.cancel();
    activeItemTooltipToken = nextTooltipToken;
    return { target: tt, token: nextTooltipToken, inline: false };
}

function presentItemTooltip(context, event, item, html, isEquip) {
    let tt = context.target;
    tt.innerHTML = html;
    itemInfluencesUi.markTooltip(tt, item);
    if (context.inline) return;
    // 스킨이 희귀도별 머리띠·테두리를 그릴 수 있도록 표시 중인 장비의 희귀도를 남긴다.
    tt.dataset.rarity = item.rarity || 'normal';
    tt.classList.toggle('item-compare-tooltip', false);
    tt.classList.toggle('dual-compare-tooltip', false);
    invalidateTooltipSize(tt);
    tt.style.display = 'block';
    positionTooltipElement(tt, event.clientX, event.clientY);
    setActiveTooltip('item-tooltip-box');
    if (!isEquip) itemTooltipComparisonScheduler.schedule(item, context.token, html);
}

function getItemAffixTierHtml(stat) {
    const tier = isFixedEquipmentAffix(stat) ? ' <span class="tier-badge tier-badge-fixed">[T0]</span>'
        : (stat.tier !== undefined ? ` ${getTierBadgeHtml(stat.tier, 'T')}` : '');
    const source = equipmentCrafting.getLabel(stat);
    return `${tier}${source ? ` <span class="equipment-craft-source">, ${source}</span>` : ''}`;
}

/**
 * Renders complete equipment details, either in the hover tooltip or an inline comparison column.
 * @param {{token?: string, target?: HTMLElement}} options Inline targets do not change hover state.
 */
/** 추가 옵션 머리말: 마법과 희귀는 "추가 옵션 5/6 (접두 2/3, 접미 3/3)"(2026-10-07 접두 3, 접미 3). 예전 규칙으로 한도를 넘은
 * 장비는 머리말을 경고색으로, 아래에 한 줄 안내. */
function itemExplicitAffixHeaderHtml(item, count) {
    const used = EXPLICIT_AFFIX_RULES[item.rarity] ? equipmentCrafting.affixCounts(item) : null;
    const header = equipmentCrafting.affixHeader(item.rarity, count, used);
    const style = header.over ? ' style="color:#ffb454;"' : '';
    const note = header.over ? '<div class="tooltip-line" style="color:#ffb454;">예전 규칙으로 한도를 넘은 장비: 넘친 종류에는 더 붙지 않습니다.</div>' : '';
    const kept = equipmentCrafting.keptKind(item);
    const keep = kept ? `<div class="tooltip-line" style="color:#9fd6ff;">다음 재굴림에서 ${AFFIX_KEEP_RULES.labels[kept]} 보존</div>` : '';
    return `<div class="tooltip-line tooltip-section tooltip-section-explicit"${style}>${header.text}</div>${note}${keep}`;
}

/** The base line's badges: the upgrade step ([2/4]) and 수평 for a horizontal base (a base with a family, 2026-10-09). */
function getItemBaseBadgesHtml(item) {
    let info = typeof getItemBaseChainInfo === 'function' ? getItemBaseChainInfo(item) : null;
    let step = info && info.total > 1
        ? ` <span style="color:#7fd1a8;" title="업그레이드 단계 (낮을수록 하위, 높을수록 상위 베이스)">[${info.step}/${info.total}]</span>` : '';
    let base = BASE_ITEM_DB.find(row => row.id === item.baseId);
    let family = base && base.family
        ? ' <span style="color:#e3c37a;" title="수평 베이스: 같은 등급 베이스보다 세지 않은 대신 기본 옵션이 다르고, 같은 계열 안에서만 승급합니다.">수평</span>' : '';
    return step + family;
}

function showItemTooltip(event, idx, isEquip, itemOverride, options = {}) {
    let item = itemOverride || (isEquip ? game.equipment[idx] : game.inventory[idx]);
    let resolveItemStatTone = (statId) => getItemStatToneColor(statId);
    if (!item) return;
    let context = prepareItemTooltip(event, item, idx, isEquip, options);
    if (!context) return;
    const inactiveAffixes = equipmentInspectionUi.getInactiveAffixIds(cachedTooltipStats, game.equippedSummonSkills);
    const affixClass = statId => inactiveAffixes.has(statId) ? ' class="equipment-affix-inactive"' : '';
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    let html = `<div class="tooltip-title" style="color:${getRarityColor(item.rarity)}">[${getItemSlotDisplayLabel(item)}] ${escapeHTML(item.name)}${exceptionalStars}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.corrupted ? ' <span style="color:#e74c3c;">(타락)</span>' : ''}${item.loopSealed ? ' <span style="color:#7fd99a;" title="나무꾼의 손길로 봉인됨: 루프가 지나도 유지">🌿봉인</span>' : ''}</div>${itemInfluencesUi.tooltipHtml(item)}`;
    if (item.hallReplica) html += `<div class="tooltip-line" style="color:#d2b878;">🏛️ 전당 소장품, 전시자 ${escapeHTML(item.hallCuratorName || '익명')}, 감정 ${Math.max(0, Math.floor(Number(item.hallAppraisalScore) || 0)).toLocaleString()}, 제작/재등록 불가</div>`;
    else if (item.hallRelistBlocked) html += '<div class="tooltip-line" style="color:#bda979;">🏛️ 전당 복제 이력, 재등록 불가</div>';
    html += `<div class="tooltip-line tooltip-meta tooltip-meta-base">베이스: ${item.baseName}${getItemBaseBadgesHtml(item)}</div>`;
    html += `<div class="tooltip-line tooltip-meta">아이템 Lv.${item.itemLevel || levelProgression.tierLevel(item.hiddenTier || item.itemTier)} &ensp; 등급 ${getTierBadgeHtml(getItemCraftTier(item), 'T')}</div>${levelProgressionUi.item(item, isEquip, idx)}`;
    if (item.rarity === 'unique' && item.uniqueEffect) {
        let uniqueGlow = 'display:inline-block;padding:1px 6px;border-radius:6px;border:1px solid rgba(198,162,255,0.55);background:linear-gradient(135deg, rgba(73,52,108,0.45) 0%, rgba(31,23,56,0.5) 100%);color:#f0dcff;font-weight:700;text-shadow:0 0 6px rgba(196,154,255,0.8),0 0 12px rgba(142,109,214,0.55);box-shadow:0 0 10px rgba(140,94,220,0.4),inset 0 0 10px rgba(229,205,255,0.2);';
        html += `<div class="tooltip-line" style="margin-top:6px;"><span style="${uniqueGlow}">✨ 고유 효과: ${escapeHTML(item.uniqueEffect)}</span></div>`;
        let applicationHint = getUniqueEffectApplicationHint(item, !!isEquip, isEquip ? idx : null);
        if (applicationHint) html += `<div class="tooltip-line" style="color:#bda9d8; margin-top:3px;">◆ ${escapeHTML(applicationHint)}</div>`;
    }
    html += equipmentSocketsUi.tooltipHtml(item) + getItemDropRegionLineHtml(item);
    if (item.fusedRelic) {
        let fusionGradeLabel = item.fusionGrade === 'perfect' ? '완벽한 융합' : (item.fusionGrade === 'unstable' ? '불안정한 융합' : '보통 융합');
        html += `<div class="tooltip-line" style="color:#8fd8ff;">⌛ ${fusionGradeLabel}${item.fusedRareName ? `, [${escapeHTML(item.fusedRareName)}]의 기억` : ''}, 황금률/잿불가지/축복의 꽃잎만 사용 가능</div>`;
    }
    let defenseView = itemTooltipRules.defenseView(item);
    if ((item.baseStats || []).length > 0) {
        html += `<div class="tooltip-line tooltip-section tooltip-section-base">베이스 옵션</div>${colonyWardsUi.beltLineHtml(item)}`;
        item.baseStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            if (statKey === 'armor' || statKey === 'evasion' || statKey === 'energyShield') return;
            let cur = Number(stat.val || 0);
            let rangeText = getItemStatRollRangeHtml(stat, { estimateFromValue: true });
            let label = stat.statName || getStatName(statKey) || statKey;
            let valueColor = stat.exceptional ? '#ffb454' : resolveItemStatTone(statKey);
            let exMark = (stat.exceptional ? ' <span style="color:#ffb454; font-weight:700;">✦+20%</span>' : '') + itemInfluencesUi.lineBadgeHtml(item, stat);
            html += `<div class="tooltip-line"><span${affixClass(statKey)}><span style="color:${resolveItemStatTone(statKey)};">${label} </span><span style="color:${valueColor};">+${formatValue(statKey, cur)}</span></span>${rangeText}${exMark}</div>`;
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
                html += `<div class="tooltip-line">${label}: <span style="color:${valueColor};">${Math.floor(finalVal)}</span> <span style="color:var(--copy-bright);">(${Math.floor(baseVal)})</span>${rangeText}${exMark}</div>`;
            }
        });
    }
    let explicitStats = (item.stats || []).slice();
    if (item.chaosInfusion) explicitStats.push({ ...item.chaosInfusion, statName: `[주입] ${item.chaosInfusion.statName || getStatName(item.chaosInfusion.id)}` });
    if (explicitStats.length > 0) {
        explicitStats.sort(itemTooltipRules.compareStats);
        html += itemExplicitAffixHeaderHtml(item, explicitStats.length);
        explicitStats.forEach(stat => {
            let statKey = stat && (stat.id || stat.stat);
            let tierText = getItemAffixTierHtml(stat);
            let rangeText = `${getItemStatRollRangeHtml(stat)}${tierText}`;
            let honeyLockText = getHoneyLockBadgeHtml(stat) + emberCorruptionUi.scaleBadgeHtml(stat) + itemInfluencesUi.lineBadgeHtml(item, stat);
            let label = stat.statName || getStatName(statKey) || statKey;
            // 복합 옵션은 한 줄에 두 스탯까지 표기하고, 듀얼+복합처럼 길어지는 경우 다음 줄로 넘긴다.
            if (Array.isArray(stat.extraStats) && stat.extraStats.length > 0) {
                let parts = [`<span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${getStatName(statKey)} +${formatValue(statKey, stat.val)}</span>`];
                stat.extraStats.forEach(extra => {
                    let exKey = extra && (extra.id || extra.stat);
                    parts.push(`<span${affixClass(exKey)} style="color:${resolveItemStatTone(exKey)};">${getStatName(exKey)} +${formatValue(exKey, extra.val)}</span>`);
                });
                for (let i = 0; i < parts.length; i += 2) {
                    let chunk = parts.slice(i, i + 2).join(' <span style="color:var(--copy-muted);">/</span> ');
                    let continuation = i > 0 ? ' compound-option-continuation' : '';
                    let indent = i > 0 ? 'padding-left:14px;' : '';
                    let suffix = i === 0 ? `${rangeText}${honeyLockText}` : '';
                    html += `<div class="tooltip-line${continuation}" style="${indent}">${chunk}${suffix}</div>`;
                }
                return;
            }
            html += `<div class="tooltip-line"><span${affixClass(statKey)} style="color:${resolveItemStatTone(statKey)};">${label} +${formatValue(statKey, stat.val)}</span>${rangeText}${honeyLockText}</div>`;
        });
    } else {
        html += itemTooltipRules.emptyExplicitHtml(item);
    }
    if (item.encroached) {
        html += `<div class="tooltip-line" style="margin-top:6px; color:#b084ff;">잠식 특수 옵션</div>`;
        if (item.encroached.liberated && item.encroached.chosen) {
            let st = item.encroached.chosen;
            html += `<div class="tooltip-line" style="color:#d7b8ff;">[잠식] ${st.statName || getStatName(st.id)} +${formatValue(st.id, st.val)} ${getTierBadgeHtml(st.tier || 10, 'T')}</div>`;
        } else {
            html += `<div class="tooltip-line" style="color:#8d7bb3;">해방 전에는 효과 없음, 모든 제작으로도 변하지 않음</div>`;
        }
    }

    presentItemTooltip(context, event, item, html + sapCatalystsUi.qualityHtml(item) + gardenOilsUi.tooltipHtml(item) + emberCorruptionUi.tooltipHtml(item) + weaponMasteryUi.tooltipHtml(item), isEquip);
}

function showCombatLogItemTooltip(event, token) {
    let item = combatLogItemSnapshots.get(Number(token));
    if (!item) return;
    showItemTooltip(event, null, false, item, { token: `log:${token}:snapshot` });
}

function openCombatLogItemEquipment(event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    dismissItemTooltipNow();
    switchTab('tab-items');
    if (document.body.classList.contains('desktop-windowed-ui') && typeof openWindow === 'function') openWindow('tab-items');
    switchItemSubtab('item-tab-equip');
}

function hideCombatLogItemTooltip(event) {
    hideItemTooltip(event);
}

function dismissItemTooltipNow() {
    itemTooltipComparisonScheduler.cancel();
    itemTooltipComparisonScheduler.setPointer(null);
    activeItemTooltipToken = null;
    clearActiveTooltip('item-tooltip-box');
    document.getElementById('item-tooltip-box').style.display = 'none';
}

function hideItemTooltip(event) {
    if (event && equipmentInventoryInteraction.getFocusedKey()) return;
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
    if (scope === 'log') {
        if (!combatLogItemSnapshots.has(Number(key))) hideItemTooltip();
        return;
    }
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
    const cssWidth = Math.max(1, Math.round(rect.width / uiDisplay.factor || 1));
    const cssHeight = Math.max(1, Math.round(rect.height / uiDisplay.factor || 1));
    const dpr = uiDisplay.battleRenderScale;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.dataset.renderScale = String(dpr);
    lastBattlefieldCanvasSize = { width: cssWidth, height: cssHeight, dpr };
    if (typeof battleCanvasBox === 'object') battleCanvasBox.forget();
}

// ACT 맵과 9x8 판정은 같은 변환을 쓴다. grid-contain은 장식만 잘라내고 전투 칸 전체를 보인다.
function getBattleGridProjection(width, height, fitMode) {
    if(actExplorationState.current(game))return actExplorationView.projection(width,height);
    return getFixedBattleGridProjection(width,height,fitMode);
}

function getFixedBattleGridProjection(width,height,fitMode) {
    const layout = ACT_BATTLE_MAP_LAYOUT;
    const gridContain = fitMode === 'grid-contain';
    const contain = fitMode === 'contain' || gridContain;
    const frameLeft = gridContain ? layout.gridOriginX - 48 : 0;
    const frameTop = gridContain ? layout.gridOriginY - 64 : 0;
    const frameWidth = gridContain ? layout.columns * layout.cellWidth + 96 : layout.width;
    const frameHeight = gridContain ? layout.rows * layout.cellHeight + 112 : layout.height;
    const scale = contain
        ? Math.min(width / frameWidth, height / frameHeight)
        : Math.max(width / layout.width, height / layout.height) * layout.viewScale;
    const mapWidth = layout.width * scale;
    const mapHeight = layout.height * scale;
    const frameX = (width - frameWidth * scale) / 2;
    const frameY = gridContain ? (height - frameHeight * scale) / 2 : height - frameHeight * scale;
    const mapX = contain ? frameX - frameLeft * scale : (width - mapWidth) / 2;
    const mapY = contain ? frameY - frameTop * scale : (height - mapHeight) / 2;
    const tileW = layout.cellWidth * scale;
    const tileH = layout.cellHeight * scale;
    return {
        tileW,
        tileH,
        actorGroundOffsetY: Math.round(tileH * 0.22),
        mapX,
        mapY,
        mapWidth,
        mapHeight,
        cellToScreen(gx, gy) {
            return {
                x: mapX + (layout.gridOriginX + (gx + 0.5) * layout.cellWidth) * scale,
                y: mapY + (layout.gridOriginY + (gy + 0.5) * layout.cellHeight) * scale
            };
        }
    };
}

function getBattleLayout(enemies, width, height, projection) {
    let list = enemies || [];
    if (list.length === 0) return [];
    let proj = projection || getBattleGridProjection(width, height);
    let fallbackCell = COMBAT_GRID_CONFIG.bossSpawn;
    return list.map(enemy => {
        let cell = hasGridCell(enemy) ? enemy : fallbackCell;
        let center = hasGridCell(enemy) ? getGridUnitCenter(enemy) : cell;
        let footprint = hasGridCell(enemy) ? getGridUnitFootprint(enemy) : { columns: 1, rows: 1 };
        // 다칸 유닛의 몸은 점유 영역 중앙에 두되, 발은 마지막 행의 중앙을 딛게 한다.
        // 2x2 보스가 네 칸 사이 교차점 위에 떠 있는 듯 보이는 것을 막는다.
        let groundCell = {
            gx: center.gx,
            gy: center.gy + (footprint.rows - 1) / 2
        };
        let pos = proj.cellToScreen(groundCell.gx, groundCell.gy);
        return { enemy: enemy, x: pos.x, y: pos.y + proj.actorGroundOffsetY };
    }).sort((a, b) => a.y - b.y || (a.enemy.id - b.enemy.id));
}

function drawPixelShadow(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx,alpha);
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

function getBattleBackdropForZone(zone) {
    let list = (battleAssets.backdrops || {});
    let key = getBattleBackdropKeyForZone(zone);
    if (!list[key]) requestSpecialBattleBackdrop(key);
    // Read only the destination and the already prepared first-act fallback; enumerating
    // deferred getters here would start downloading every background on the first frame.
    let image = list[key];
    if (!image) { image = list.bgAct1; key = 'bgAct1'; }
    if (!image) return null;
    let zoneSeed = Number.isFinite(zone && zone.id) ? zone.id : 0;
    if (!zoneSeed && zone && zone.name) zoneSeed = zone.name.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    let variant = BATTLE_BACKDROP_VARIANTS[Math.abs(zoneSeed) % BATTLE_BACKDROP_VARIANTS.length] || BATTLE_BACKDROP_VARIANTS[0];
    return { image: image, variant: variant, key: key };
}

function isActBattleMapBackdropKey(key) {
    return /^bgAct(?:[1-9]|10)$/.test(String(key || ''));
}

// ACT와 웨이브 콘텐츠 판(벌집 원정, 군락지)은 912×624, 지하계·운석은 816×624. 중앙 9×8칸은 동일한 48px 격자를 사용한다.
// 나머지 정사각형 엔드게임 배경은 기존 cover 표시를 유지한다.
function drawGridAlignedBackdrop(ctx, width, height, image, gridProj, backdropKey) {
    let srcW = image.width || width;
    let srcH = image.height || height;
    let actMap = (isActBattleMapBackdropKey(backdropKey) || GRID_ALIGNED_SPECIAL_BACKDROPS.includes(backdropKey)) && gridProj;
    let coverScale = Math.max(width / srcW, height / srcH);
    let drawW = srcW * coverScale;
    let drawH = srcH * coverScale;
    let drawX = (width - drawW) / 2;
    let drawY = (height - drawH) / 2;
    if (actMap) {
        ({ mapWidth: drawW, mapHeight: drawH, mapX: drawX, mapY: drawY } = gridProj);
        const scale = drawW / ACT_BATTLE_MAP_LAYOUT.width;
        drawX += (ACT_BATTLE_MAP_LAYOUT.width - srcW) * scale / 2;
        drawW = srcW * scale;
    }
    ctx.fillStyle = '#070b12';
    ctx.fillRect(0, 0, width, height);
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, drawX, drawY, drawW, drawH);
    ctx.imageSmoothingEnabled = smoothing;
    ctx.fillStyle = actMap ? 'rgba(4, 8, 14, 0.16)' : 'rgba(4, 8, 14, 0.42)';
    ctx.fillRect(0, 0, width, height);
    return {x:drawX,y:drawY,width:drawW,height:drawH};
}

function drawActMapEffect(ctx, rect, key, now) {
    const effect = ACT_BATTLE_MAP_EFFECTS[key];
    if (!effect) return;
    const image = battleAssets.backdrops[effect.key];
    if (!image) return;
    const frame = Math.floor(now / effect.frameMs) % effect.frames;
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image,(frame % effect.columns)*effect.width,Math.floor(frame/effect.columns)*effect.height,
        effect.width,effect.height,rect.x,rect.y,rect.width,rect.height);
    ctx.imageSmoothingEnabled = smoothing;
}

function drawBattleBackdrop(ctx, width, height, theme, now, zone, gridProj) {
    if(actExplorationView.background(ctx,width,height,gridProj))return true;
    let backdropEntry = getBattleBackdropForZone(zone);
    if (backdropEntry && backdropEntry.image) {
        const rect = drawGridAlignedBackdrop(ctx, width, height, backdropEntry.image, gridProj, backdropEntry.key);
        drawActMapEffect(ctx,rect,backdropEntry.key,now);
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

function getLocalBattleHeroVisualTuning(spriteScale) {
    const defaultTuning = {
        baseHeight: 63,
        minHeight: 58,
        maxHeight: 71,
        downShrink: 7,
        minScaleBoost: 0.56,
        maxScaleBoost: 1.12,
        shadowWidth: 11.5,
        shadowHeight: 4.6,
        shadowAlpha: 0.18,
        offsetY: 0
    };
    const tuningByHero = {
        hero1: { baseHeight: 63, maxHeight: 71 },
        hero2: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero3: { baseHeight: 63, maxHeight: 71 },
        hero4: { baseHeight: 62, maxHeight: 70 },
        hero5: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 },
        hero6: { baseHeight: 62, maxHeight: 70 },
        hero7: { baseHeight: 63, maxHeight: 71 },
        hero8: { baseHeight: 65, maxHeight: 73, shadowWidth: 12.5 },
        hero9: { baseHeight: 63, maxHeight: 71 },
        hero10: { baseHeight: 63, maxHeight: 71 },
        occultist: { baseHeight: 63, maxHeight: 71 },
        wanderer: { baseHeight: 63, maxHeight: 71 },
        cleric: { baseHeight: 64, maxHeight: 72 },
        archer: { baseHeight: 63, maxHeight: 71 },
        alchemist: { baseHeight: 63, maxHeight: 71 },
        warrior: { baseHeight: 64, maxHeight: 72, shadowWidth: 12 }
    };
    let heroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId;
    let tuning = { ...defaultTuning, ...(tuningByHero[heroId] || {}) };
    let requestedScale = Number(spriteScale);
    tuning.scaleBoost = Number.isFinite(requestedScale) && requestedScale > 0
        ? clampNumber(requestedScale / 1.85, tuning.minScaleBoost, tuning.maxScaleBoost)
        : 1;
    return tuning;
}

/**
 * @param {Array<Array<object>>} cycles
 * @param {?Array<number>} configuredWeights
 * @param {number} seed
 * @returns {?Array<object>}
 */
function pickAttackVariantCycle(cycles, configuredWeights, seed) {
    let variants = Array.isArray(cycles)
        ? cycles.filter(cycle => Array.isArray(cycle) && cycle.length > 0)
        : [];
    if (variants.length === 0) return null;
    let variantSeed = clampNumber(Number(seed) || 0, 0, 0.999999);
    let uniformVariant = variants[Math.floor(variantSeed * variants.length)];
    if (!Array.isArray(configuredWeights) || configuredWeights.length !== variants.length) {
        return uniformVariant;
    }
    let weights = configuredWeights.map(weight => Math.max(0, Number(weight) || 0));
    let totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight <= 0) return uniformVariant;
    let weightedRoll = variantSeed * totalWeight;
    for (let index = 0; index < weights.length; index++) {
        weightedRoll -= weights[index];
        if (weightedRoll < 0) return variants[index];
    }
    return variants[variants.length - 1];
}

function drawPlayerSprite(ctx, x, y, scale, flash, swingPower, skillVisual, now, motionState) {
    let activeSkillPlayback = getSkillPlaybackState(now);
    let monsterSkinId = typeof getSelectedMonsterSkinId === 'function' ? getSelectedMonsterSkinId() : null;
    if (monsterSkinId) {
        let monsterSkinSprite = resolveMonsterSkinSprite(monsterSkinId);
        if (monsterSkinSprite) {
            let drawSize = (monsterSkinSprite.type === 'boss' ? 52 : 38) * clampNumber((Number(scale) || 1) / 1.9, 1, 2.4);
            drawPixelShadow(ctx, x, y + 2, monsterSkinSprite.type === 'boss' ? 14 : 10, monsterSkinSprite.type === 'boss' ? 5 : 4, 0.18);
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
        let animationStats = motionState.playerStats || getUiPlayerStats();
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
        let motionName = 'idle';
        let frameIndex = HERO_MOTIONS.idle[0];
        if (activeSkillPlayback && advanceBlend <= 0.08) {
            motionName = activeSkillPlayback.skillCfg.motion;
            frameIndex = activeSkillPlayback.frameIndex;
        } else {
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
                let moveSpeed = Number(animationStats.moveSpeed) || 100;
                let moveRatio = clampNumber(moveSpeed / 100, 0.6, 3.2);
                _frameMs = clampNumber(_frameMs / moveRatio, 62, 460);
            }
            let localFrame = Math.floor((now / _frameMs)) % frames.length;
            if ((motionName === 'walk' || motionName === 'run') && Number.isFinite(motionState.moveProgress)) {
                localFrame = Math.floor(clampNumber(motionState.moveProgress, 0, 0.999) * frames.length);
            }
            frameIndex = frames[localFrame];
        }
        let heroFrame = getSpriteFrameRectByIndex(battleAssets.images.hero, frameIndex, HERO_SPRITE_CONFIG);
        if (heroFrame) {
            let frameMeta = getHeroFrameMeta(frameIndex);
            let metrics = getHeroDrawMetrics(x, y, heroFrame, frameMeta);
            drawPixelShadow(ctx, x, y + 2, 11, 4, 0.18);
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
        let animationStats = motionState.playerStats || getUiPlayerStats();
        let frames = battleAssets.atlas.hero.frames;
        let bodyClips = frames.characterAnimations || {};
        let clipLoop = frames.clipLoop || {};
        let advanceBlend = clampNumber(Number.isFinite(motionState.advanceBlend) ? motionState.advanceBlend : 0, 0, 1);
        let isAdvancing = advanceBlend > 0.08;
        let moveProgress = clampNumber(Number(motionState.moveProgress) || 0, 0, 1);
        let hurtBlend = clampNumber(Number.isFinite(motionState.hurtBlend) ? motionState.hurtBlend : (flash ? 1 : 0), 0, 1);
        let downFx = battleFx.filter(fx => fx.type === 'playerDown' && now - fx.start <= fx.duration).slice(-1)[0];
        let downPhase = downFx ? clampNumber((now - downFx.start) / downFx.duration, 0, 0.999) : null;
        let downBlend = clampNumber(Number.isFinite(motionState.downBlend) ? motionState.downBlend : (downPhase !== null ? 1 : 0), 0, 1);
        // 칸을 좁히는 동안 남은 타격 이펙트가 있어도 공격 포즈로 미끄러지지 않게
        // 걷기 상태를 우선한다. 공격은 실제 이동이 끝난 다음 프레임부터 재개한다.
        let isAttacking = !isAdvancing && motionState.attackActive === true;
        let defaultIdleCycle = Array.isArray(bodyClips.idle) && bodyClips.idle.length > 0 ? bodyClips.idle : (Array.isArray(frames.idle) && frames.idle.length > 0 ? frames.idle : [frames.sideIdle, frames.frontIdle, frames.frontGuard].filter(Boolean));
        let facingDirection = motionState.facingDirection || motionState.attackDirection || 'east';
        let directionalIdles = bodyClips.idleDirections || frames.idleDirections || {};
        let idleCycle = Array.isArray(directionalIdles[facingDirection])
            && directionalIdles[facingDirection].length > 0
            ? directionalIdles[facingDirection]
            : defaultIdleCycle;
        let defaultWalkCycle = Array.isArray(bodyClips.walk_or_run) && bodyClips.walk_or_run.length > 0 ? bodyClips.walk_or_run : (Array.isArray(frames.walk) && frames.walk.length > 0 ? frames.walk : [frames.sideWalk, frames.sideIdle, frames.frontGuard].filter(Boolean));
        let directionalWalks = bodyClips.walkDirections || frames.walkDirections || {};
        let walkCycle = Array.isArray(directionalWalks[motionState.moveDirection])
            && directionalWalks[motionState.moveDirection].length > 0
            ? directionalWalks[motionState.moveDirection]
            : defaultWalkCycle;
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
            let directionalAttacks = bodyClips.attackDirections || frames.attackDirections || {};
            let directionVariants = directionalAttacks[motionState.attackDirection];
            let attackVariant = pickAttackVariantCycle(
                Array.isArray(directionVariants) ? directionVariants : frames.attackVariants,
                frames.attackVariantWeights,
                motionState.attackVariantSeed
            );
            if (attackVariant) return attackVariant;
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
                let aspd = Math.max(0.1, Number(animationStats.aspd) || 1);
                let loopFrameMs = clampNumber(120 / aspd, 38, 170);
                idx = Math.floor((now / loopFrameMs) % sequence.length);
            }
            return sequence[clampNumber(idx, 0, sequence.length - 1)];
        }
        let idleFrame = pickCycle(idleCycle, 920, 0);
        let moveStat = Math.max(70, Number(animationStats.move) || 100);
        let moveRatio = clampNumber(moveStat / 100, 0.85, 2.25);
        let walkSequenceLength = Math.max(1, walkCycle.length || 1);
        let walkCycleDuration = clampNumber(960 / moveRatio, 560, 1130);
        let moveFrameDuration = clampNumber(walkCycleDuration / walkSequenceLength, 45, 105);
        let walkFrame = pickCycle(walkCycle, moveFrameDuration, 0);
        let movingFrame = Number.isFinite(motionState.moveProgress)
            ? pickProgressFrame(runCycle, moveProgress)
            : (pickCycle(runCycle, moveFrameDuration, 0) || walkFrame);
        let frame = downPhase !== null || downBlend > 0.24
            ? pickProgressFrame(downCycle, downPhase !== null ? downPhase : clampNumber(downBlend * 0.999, 0, 0.999))
            : (advanceBlend > 0.08 ? movingFrame : idleFrame);
        if (downPhase === null && hurtBlend > 0.8 && !isAttacking && hurtCycle.length > 0) {
            frame = ['north', 'south'].includes(facingDirection) ? idleFrame : hurtCycle[0];
        }
        if (downPhase === null && isAttacking) {
            frame = pickAttackFrame(pickSkillAttackCycle());
        }
        let walkMotion = downPhase === null && advanceBlend > 0.08 && typeof getPlayableHeroWalkMotion === 'function'
            ? getPlayableHeroWalkMotion(getHeroAppearanceId(), moveProgress, advanceBlend)
            : { x: 0, y: 0 };
        let localHeroTuning = getLocalBattleHeroVisualTuning(scale);
        let heroScaleBoost = localHeroTuning.scaleBoost;
        let normalizedHeroSize = (localHeroTuning.baseHeight * heroScaleBoost) - downBlend * localHeroTuning.downShrink;
        let scaledMinHeight = localHeroTuning.minHeight * Math.min(1, heroScaleBoost);
        normalizedHeroSize = clampNumber(normalizedHeroSize, scaledMinHeight, localHeroTuning.maxHeight) * HERO_SIZE_SCALE;
        drawPixelShadow(ctx, x, y + 2, localHeroTuning.shadowWidth * heroScaleBoost * HERO_SIZE_SCALE, localHeroTuning.shadowHeight * heroScaleBoost * HERO_SIZE_SCALE, localHeroTuning.shadowAlpha);
        let drawOptions = {
            alpha: downPhase !== null ? 0.98 : 1,
            smoothing: 'high',
            devicePixelSnap: true,
            outlineColor: '#ddd6bd',
            outlineAlpha: 0.22,
            outlineThickness: 0.5
        };
        drawBattleSprite(ctx, battleAssets.atlas.hero.image, frame, x + walkMotion.x, y + walkMotion.y + localHeroTuning.offsetY - advanceBlend * 0.18 + hurtBlend * 0.08 + downBlend * 2.2, normalizedHeroSize, drawOptions);
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
    return pickSeededEnemyVariant(enemy, pool);
}

/** The pool entry an enemy shows: its assigned variant when the pool has it, otherwise one picked by its seed and element. */
function pickSeededEnemyVariant(enemy, pool) {
    if (enemy.spriteVariantId) {
        let assignedVariant = pool.find(entry => entry && entry.id === enemy.spriteVariantId);
        if (assignedVariant) return assignedVariant;
    }
    let variantSeed = Math.abs(enemy.variantSeed || enemy.id || 1);
    let elementOffset = enemy.ele === 'fire' ? 1 : (enemy.ele === 'cold' ? 2 : (enemy.ele === 'light' ? 3 : (enemy.ele === 'chaos' ? 4 : 0)));
    return pool[(variantSeed + elementOffset) % pool.length];
}

function resolveEnemySpriteMotion(variantEntry, moving, now, enemy, attackMotion, facingDirection) {
    let directionalEntry = variantEntry && variantEntry.directions
        ? (variantEntry.directions[facingDirection] || variantEntry.directions.south)
        : variantEntry;
    let animations = directionalEntry && directionalEntry.animations;
    let attackFrames = Array.isArray(directionalEntry && directionalEntry.attackFrames)
        ? directionalEntry.attackFrames
        : (animations && Array.isArray(animations.attack) ? animations.attack : []);
    if (attackMotion && attackFrames.length > 0) {
        let index = Math.floor(clampNumber(attackMotion.progress, 0, 0.999) * attackFrames.length);
        return { entry: attackFrames[index] || {}, x: 0, y: 0 };
    }
    let movementFrames = Array.isArray(directionalEntry && directionalEntry.frames) ? directionalEntry.frames : [];
    let movementIndex = moving === true && movementFrames.length > 0
        ? Math.floor(((Number(now) || 0) + Math.abs(Number(enemy.variantSeed || enemy.id || 0)) * 41) / 190) % movementFrames.length
        : 0;
    return {
        entry: movementFrames[movementIndex] || {},
        x: attackMotion ? attackMotion.x : 0,
        y: attackMotion ? attackMotion.y : 0
    };
}

/** Sprite rim (data BATTLE_SPRITE_OUTLINES): bosses a stronger red, elites their trait colour, every other monster red. */
function getEnemyOutlineStyle(enemy) {
    // 보스 변이체(js/boss-variants.js)는 그 변이의 색 테.
    if (enemy.isBoss) return enemy.variantOutline ? { ...BATTLE_SPRITE_OUTLINES.boss, color: enemy.variantOutline } : BATTLE_SPRITE_OUTLINES.boss;
    // 잿불 터 무리(data/atlas.js encounters outline): 일반 몬스터의 테를 잿불 색으로. 정예는 특성 색을 지킨다.
    if (!enemy.isElite) return enemy.encounterOutline ? { ...BATTLE_SPRITE_OUTLINES.enemy, color: enemy.encounterOutline } : BATTLE_SPRITE_OUTLINES.enemy;
    const color = enemy.traitOutlineColor || (enemy.trait && enemy.trait.outlineColor) || BATTLE_SPRITE_OUTLINES.elite.color;
    return { ...BATTLE_SPRITE_OUTLINES.elite, color };
}

function drawEnemySprite(ctx, enemy, x, y, scale, flash, now, moving, attackMotion, facingDirection) {
    if (battleAssets.ready && battleAssets.atlas && battleAssets.atlas.enemies) {
        let enemyAtlas = battleAssets.atlas.enemies;
        let variantEntry = getBossAssetVariantEntry(enemy, enemyAtlas) || pickBattleEnemyVariant(enemy, enemyAtlas) || {};
        let spriteMotion = resolveEnemySpriteMotion(variantEntry, moving, now, enemy, attackMotion, facingDirection);
        x += spriteMotion.x;
        y += spriteMotion.y;
        let groundY = y + 2;
        let animatedEntry = spriteMotion.entry;
        let frame = animatedEntry.frame || variantEntry.frame || enemyAtlas.frames.bandit || enemyAtlas.frames.slime;
        let frameImage = animatedEntry.image || variantEntry.image || enemyAtlas.image;
        let drawSize = enemy.isBoss ? 70 : (enemy.isElite ? 52 : 44);
        let outline = getEnemyOutlineStyle(enemy);
        drawSize *= scale / (enemy.isBoss ? 2.55 : (enemy.isElite ? 2.2 : 1.95)); noteEnemyDrawnHeight(enemy, drawSize);
        let bossScaleRatio = enemy.isBoss ? scale / 2.55 : 1;
        drawPixelShadow(ctx, x, groundY, enemy.isBoss ? 22 * bossScaleRatio : 9, enemy.isBoss ? 7 * bossScaleRatio : 4, 0.17);
        ctx.save();
        if (enemy.bossVisualTint != null) ctx.filter = `hue-rotate(${enemy.bossVisualTint}deg) saturate(1.28) brightness(1.08)`;
        drawBattleSprite(ctx, frameImage, frame, x, groundY, drawSize, {
            smoothing: enemy.bossAssetKey ? 'high' : 'low',
            outlineColor: outline.color,
            outlineThickness: outline.thickness,
            outlineAlpha: outline.alpha,
            flipX: shouldMirrorEnemySprite(enemy),
            offsetY: bossAttackView.spriteOffsetY(attackMotion, frame),
            flash
        });
        ctx.restore();
        return;
    }
    if (attackMotion) {
        x += attackMotion.x;
        y += attackMotion.y;
    }
    let groundY = y + 2;
    let s = scale;
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
    drawPixelShadow(ctx, x, groundY + 2 * s, (enemy.isBoss ? 15 : 11) * s, 4 * s, 0.22);
    ctx.save();
    ctx.translate(Math.round(x), Math.round(groundY));
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
    setElementText(document.getElementById(id), value);
}

// Per-tick HUD writes: an identical write still dirties styles, so only real changes touch the DOM.
function setElementText(el, value) {
    if (!el) return;
    const text = value == null ? '' : String(value);
    if (el.textContent !== text) el.textContent = text;
}

function setElementAttribute(el, name, value) {
    if (el && el.getAttribute(name) !== value) el.setAttribute(name, value);
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

/** Combat HUD skill tray: 주 공격, 이동 스킬(재사용 대기 표시), 장착 소환. */
const COMBAT_SKILL_HUD_LIMIT = 6;
const COMBAT_SKILL_SLOT_LABELS = Object.freeze({ primary: '주 공격', mobility: '이동 스킬', summon: '소환' });
// 표시 전용: 재사용 시작 시각을 저장 상태에 늘리지 않고, readyAt이 바뀐 순간의 남은 시간(ms)을 전체 길이로 삼는다.
const combatSkillCooldownSpans = new Map();

function getCombatSkillHudEntries() {
    let summons = (Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : []).filter(name => {
        let def = SKILL_DB[name];
        return def && Array.isArray(def.tags) && def.tags.includes('summon_attack');
    });
    let gems = [game.activeSkill || '기본 공격']
        .concat(summons)
        .filter((name, index, list) => name && list.indexOf(name) === index)
        .slice(0, 4)
        .map((name, index) => ({ kind: index === 0 ? 'primary' : 'summon', name }));
    let mobility = SKILL_DB[game.mobilitySkill] ? [{ kind: 'mobility', name: game.mobilitySkill, hotkey: getHotkeyLabel('combat:mobility') }] : [];
    return gems.slice(0, 1).concat(mobility, gems.slice(1)).slice(0, COMBAT_SKILL_HUD_LIMIT);
}

/** Short key name of a PC hotkey action for HUD key caps ('' when unbound). */
function getHotkeyLabel(actionId) {
    return hotkeyBindings.label(hotkeyBindings.codeFor(game.settings.hotkeyOverrides, actionId));
}

function renderCombatSkillSlot(entry) {
    let name = escapeHTML(entry.name);
    let art = renderSkillGemArt(entry.name, 'combat-skill-gem-art', { eager: true });
    let cooldown = entry.kind === 'mobility' ? '<span class="player-hud-skill-cooldown" aria-hidden="true" hidden></span>' : '';
    // 이동 스킬 칸은 누르거나 단축키(기본 E)로 쓴다: 키 표시는 자동 이동 단추와 같다.
    let key = entry.hotkey ? escapeHTML(entry.hotkey) : '';
    let keyAttrs = key ? ` aria-keyshortcuts="${key}"` : '';
    let keyCap = key ? `<i class="combat-hud-key" aria-hidden="true">${key}</i>` : '';
    return `<button type="button" class="player-hud-skill-slot ${entry.kind}" data-gem-name="${name}" data-slot-kind="${entry.kind}"${keyAttrs} data-info-tooltip-anchor="1" aria-label="${COMBAT_SKILL_SLOT_LABELS[entry.kind]}, ${name}">${art}${cooldown}${keyCap}</button>`;
}

function bindCombatSkillSlot(button) {
    let name = button.dataset.gemName;
    // 올려 두면 뜨는 설명은 마우스만: 터치는 떼도 mouseleave가 없어 이동 스킬을 누를 때마다 설명이 전장을 덮은 채 남았다.
    let show = event => { if (event.pointerType === 'mouse') showGemTooltip(event, 'active', name); };
    button.addEventListener('pointerenter', show);
    button.addEventListener('pointermove', show);
    button.addEventListener('pointerleave', hideInfoTooltip);
    button.addEventListener('click', () => {
        if (button.dataset.slotKind === 'mobility') { hotkeysUi.useMobility(button); return; }
        openTabPane('tab-skills');
    });
}

function getCombatSkillCooldownSpan(name, readyAt, remaining) {
    let known = combatSkillCooldownSpans.get(name);
    if (!known || known.readyAt !== readyAt) {
        known = { readyAt, totalMs: Math.max(1, remaining) };
        combatSkillCooldownSpans.set(name, known);
    }
    return known.totalMs;
}

function paintCombatSkillCooldown(button, readyAt, now, justCast) {
    let name = button.dataset.gemName;
    let remaining = Math.max(0, readyAt - now);
    let badge = button.querySelector('.player-hud-skill-cooldown');
    let seconds = remaining > 0 ? String(Math.ceil(remaining / 1000)) : '';
    button.style.setProperty('--cooldown', remaining > 0 ? (remaining / getCombatSkillCooldownSpan(name, readyAt, remaining)).toFixed(3) : '0');
    button.classList.toggle('cooling', remaining > 0);
    button.classList.toggle('just-cast', justCast);
    if (badge.textContent !== seconds) badge.textContent = seconds;
    badge.hidden = !seconds;
}

function refreshCombatSkillCooldowns(host) {
    let now = getCombatTime();
    host.querySelectorAll('.player-hud-skill-slot.mobility').forEach(button => paintCombatSkillCooldown(button, now + mobilitySkill.cooldownLeft(now), now, false));
}

function renderCombatSkillHud() {
    let host = document.getElementById('ui-combat-skill-gems');
    if (!host) return;
    let entries = getCombatSkillHudEntries();
    let signature = entries.map(entry => `${entry.kind}:${entry.name}:${entry.hotkey || ''}`).join('|');
    if (host.dataset.signature !== signature) {
        entries.forEach(entry => {
            const spec = SKILL_SIGNATURE_SPRITES[SKILL_GEM_VFX_PROFILES[entry.name]?.signature];
            if (spec) getSkillGemVfxImage(spec.asset);
        });
        host.dataset.signature = signature;
        host.dataset.slotCount = String(entries.length);
        host.innerHTML = entries.map(renderCombatSkillSlot).join('');
        host.querySelectorAll('.player-hud-skill-slot').forEach(bindCombatSkillSlot);
    }
    refreshCombatSkillCooldowns(host);
}

function setUiImageGaugePercent(element, percent) {
    if (!element) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    // 같은 값은 다시 쓰지 않는다: 같은 값이라도 인라인 스타일을 쓰면 다음 프레임에 스타일 계산이 다시 돈다.
    if (element.__gaugePercent === safePercent) return;
    element.__gaugePercent = safePercent;
    element.style.width = '100%';
    element.style.setProperty('--gauge-fill', `${safePercent}%`);
    if (element.parentElement && element.parentElement.style) {
        element.parentElement.style.setProperty('--gauge-fill', `${safePercent}%`);
    }
}

/** The progress gauge speaks only for special content — a timer, waves, depth, a boss wait or a floor run. Story acts
 * are explored on the map (the minimap ring shows how much is revealed), so the gauge is hidden there. */
/** Wide maps (story acts and every content with its own map) show progress on the minimap, not the bar. */
function syncMapProgressRow(zone) {
    const row = document.getElementById('ui-map-progress-row');
    if (row) row.toggleAttribute('hidden', !!zone && (zone.type === 'act' || !!zone.exploration));
}

function setCombatProgressGaugePercent(percent) {
    let bar = document.getElementById('ui-move-bar');
    if (!bar) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    bar.style.width = `${safePercent}%`;
    if (bar.parentElement && bar.parentElement.style) {
        bar.parentElement.style.setProperty('--progress-fill', `${safePercent}%`);
    }
}

const UI_COMBAT_EFFECT_PRESENTATION = Object.freeze({
    ignite: { sprite: 0, label: '점화', color: '#ff9f43' },
    chill: { sprite: 1, label: '냉각', color: '#9be7ff' },
    freeze: { sprite: 2, label: '동결', color: '#4da3ff' },
    shock: { sprite: 3, label: '감전', color: '#ffe66d' },
    poison: { sprite: 4, label: '중독', color: '#c56cff' },
    bleed: { sprite: 5, label: '출혈', color: '#ff6b6b' },
    flameDecay: { sprite: 6, label: '화염 부패', color: '#ff7a3d' },
    assassinWeakness: { sprite: 7, label: '독점 약점', color: '#ff9bd1' },
    hunterExpose: { sprite: 8, label: '약점 노출', color: '#ffd36b' },
    cosmosJudgment: { sprite: 9, label: '우주 심판', color: '#b6a2ff' },
    realmAllResDown: { sprite: 10, label: '모든 저항 약화', color: '#d89cff' },
    cosmos_regen_down: { sprite: 11, label: '재생 효율 감소', color: '#d89cff' },
    cosmos_leech_down: { sprite: 12, label: '흡혈 효율 감소', color: '#d89cff' },
    cosmos_res_down: { sprite: 13, label: '저항 감소', color: '#d89cff' },
    cosmos_aspd_down: { sprite: 14, label: '공격 속도 감소', color: '#d89cff' },
    curse: { sprite: 15, label: '저주', color: '#d0a8ff' },
    guard: { sprite: 16, label: '수호', color: '#9be7ff' },
    warcry: { sprite: 17, label: '함성', color: '#ffd36b' },
    utility: { sprite: 18, label: '기능', color: '#8fe3b0' },
    buff: { sprite: 18, label: '강화 효과', color: '#8fe3b0' },
    woodsmanCurse: { sprite: 21, label: '나무꾼의 저주', color: '#d0a8ff' },
    deathWard: { sprite: 22, label: '감시 보호막', color: '#b9d9ff' },
    invulnerableBarrier: { sprite: 23, label: '균열 장막', color: '#c49bff' },
    warriorRage: { sprite: 24, label: '격노 순환', color: '#ff9f43' },
    playerUniqueGuard: { sprite: 25, label: '용맥의 수호', color: '#b9d9ff' },
    stoneShield: { sprite: 16, label: '돌 보호막', color: '#d8b77a' },
    shadowStealth: { sprite: 26, label: '그림자 은신', color: '#c9a8ff' },
    leechEfficiency: { sprite: 27, label: '흡혈 효율 강화', color: '#d989a2' },
    lifeLeech: { sprite: 27, label: '생명력 흡혈', color: '#df8396' },
    energyShieldLeech: { sprite: 27, label: '에너지 보호막 흡혈', color: '#8fcbe8' },
    meleeArmorAmp: { sprite: 28, label: '깨지지 않는 비늘', color: '#c9b59a' },
    killMoveStacks: { sprite: 29, label: '질주의 발자국', color: '#e1c58a' },
    lifeRecoup: { sprite: 30, label: '생명력 회생', color: '#e58f9a' },
    warriorRhythm: { sprite: 31, label: '전장의 리듬', color: '#d9ad7d' },
    gladiatorFlurry: { sprite: 32, label: '연참 호흡', color: '#e0c9a8' },
    gladiatorVeteran: { sprite: 33, label: '노련함', color: '#e2b88d' },
    gladiatorSwift: { sprite: 34, label: '속공 전개', color: '#e7d1aa' },
    assassinBlurred: { sprite: 35, label: '그림자 질주', color: '#a8b6c8' },
    elementalistOverload: { sprite: 36, label: '원소 과부하', color: '#c9a2ff' },
    catalystEvade: { sprite: 37, label: '연막 포션', color: '#b8c3ca' },
    crusaderLightningAegis: { sprite: 38, label: '번개 불사', color: '#ffe08a' },
    guardianEndurance: { sprite: 39, label: '인내 장전', color: '#d1bd9d' },
    colosseumReady: { sprite: 41, label: '투기장 일격 준비', color: '#e0ad78' },
    summonDeathDamageBuff: { sprite: 42, label: '소환수 사망 피해 강화', color: '#b7d8e5' },
    summonCritAspd: { sprite: 43, label: '소환수 치명타 공속', color: '#c4a7e8' },
    eliteTraitBuff: { sprite: 45, label: '무한한 허기', color: '#d98f88' },
    enemyWither: { sprite: 46, label: '위축', color: '#b58be0' },
    talentInquisitorMark: { sprite: 9, label: '심판 표식', color: '#efb16e' },
    talentButcherMark: { sprite: 47, label: '도살자 표식', color: '#e58a7d' },
    rangerWeakpointMark: { sprite: 7, label: '급소 표식', color: '#efbd7a' },
    enemyChaosResDown: { sprite: 13, label: '카오스 저항 약화', color: '#b58be0' },
    enemyElementalResDown: { sprite: 13, label: '원소 저항 약화', color: '#9bcbe8' },
    chaosErosion: { sprite: 13, label: '카오스 침식', color: '#b58be0' },
    regenSuppress: { sprite: 11, label: '생명력 재생 억제', color: '#c99b9b' },
    bloomRegenSuppress: { sprite: 11, label: '혹독한 한기', color: '#9fc9e8' },
    delayedGuardHeal: { sprite: 30, label: '지연 회복', color: '#8fdaa8' },
    riderCompassReady: { sprite: 33, label: '기수의 나침반', color: '#d5b778' },
    fletcherCharge: { sprite: 34, label: '플레쳐', color: '#d9ae76' },
    colosseumCharge: { sprite: 41, label: '관중의 함성', color: '#e0ad78' },
    queenBeeSwarm: { sprite: 43, label: '여왕벌', color: '#e4c45f' },
    enemySkillDot: { sprite: 46, label: '지속 피해', color: '#a4c7df' }
});

const UI_RUNTIME_EFFECT_DETAILS = Object.freeze({
    woodsmanCurse: value => `받는 피해 +${Number(value || 0).toFixed(2)}%`,
    deathWard: (value, maximum) => `남은 피해 흡수량: ${Math.floor(value || 0)} / ${Math.floor(maximum || 0)}`,
    invulnerableBarrier: () => '모든 피해를 받지 않습니다.',
    warriorRage: (value, maximum) => `${Math.floor(value || 0)} / ${Math.floor(maximum || 0)}중첩, 물리 피해 +${Math.floor(value || 0) * (typeof WARRIOR_RAGE_STACK_DAMAGE_PCT === 'number' ? WARRIOR_RAGE_STACK_DAMAGE_PCT : 10)}%`,
    playerUniqueGuard: (value, maximum) => `남은 피해 흡수량: ${Math.floor(value || 0)} / ${Math.floor(maximum || 0)}`,
    stoneShield: (value, maximum) => `남은 돌 보호막: ${Math.floor(value || 0)} / ${Math.floor(maximum || 0)}`,
    shadowStealth: value => `이동 속도/회피/치명타 피해 +${Number(value || 0).toFixed(0)}%`,
    leechEfficiency: value => `모든 흡혈 효율 +${Number(value || 0).toFixed(0)}%`,
    lifeLeech: (value, rate) => `남은 회복 ${Math.floor(value || 0)}, 초당 ${Math.floor(rate || 0)}`,
    energyShieldLeech: (value, rate) => `남은 보호막 회복 ${Math.floor(value || 0)}, 초당 ${Math.floor(rate || 0)}`,
    lifeRecoup: (value, rate) => `남은 회생 ${Math.floor(value || 0)}, 초당 ${Math.floor(rate || 0)}`,
    meleeArmorAmp: (stacks, perStack) => `방어도 ${Math.floor(stacks || 0)}중첩, 중첩당 ${Number(perStack || 0).toFixed(0)}% 증폭`,
    killMoveStacks: (stacks, perStack) => `${Math.floor(stacks || 0)}중첩, 이동 속도 +${Math.floor(stacks || 0) * Number(perStack || 0)}%`,
    warriorRhythm: (critStacks, doubleStacks) => `치명타 ${Math.floor(critStacks || 0)}/5, 연속 공격 ${Math.floor(doubleStacks || 0)}/5`,
    gladiatorFlurry: stacks => `${Math.floor(stacks || 0)}/12중첩, 공격 속도 +${Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.g2.aspdPctPerStack}%, 회피 +${Math.floor(stacks || 0) * 3}%`,
    gladiatorVeteran: value => `다음 타격 치명타 확률 +${Math.floor(value || 0)}%p`,
    gladiatorSwift: (attackReady, guardReady) => `다음 타격 강화 ${attackReady ? '준비' : '소모'}, 다음 피격 경감 ${guardReady ? '준비' : '소모'}`,
    assassinBlurred: () => '이동 속도/회피 +20%, 치명타 피해 +25%',
    elementalistOverload: stacks => `${Math.floor(stacks || 0)}중첩, 원소 피해 +${Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.e8.morePctPerStack}%, 치명타 확률 -${Math.floor(stacks || 0)}%p`,
    catalystEvade: () => '다음 회피 판정이 30% 증폭됩니다.',
    crusaderLightningAegis: () => '초당 최대 ES 25% 회복, 번개 피해 +75%',
    guardianEndurance: stacks => `${Math.floor(stacks || 0)}/5중첩, 방어도 +${Math.floor(stacks || 0) * 11}%`,
    colosseumReady: () => '다음 공격이 투기장 일격으로 강화됩니다.',
    summonDeathDamageBuff: value => `소환수 피해 +${Number(value || 0).toFixed(0)}%`,
    summonCritAspd: (stacks, perStack) => `${Math.floor(stacks || 0)}중첩, 소환수 공격 속도 +${Math.floor(stacks || 0) * Number(perStack || 0)}%`,
    enemyWither: stacks => `${Math.floor(stacks || 0)}/10중첩, 받는 카오스 피해 +${Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack}%`,
    enemyChaosResDown: (stacks, perStack) => `${Math.floor(stacks || 0)}중첩, 카오스 저항 -${Math.floor(stacks || 0) * Number(perStack || 0)}%`,
    enemyElementalResDown: (stacks, perStack) => `${Math.floor(stacks || 0)}중첩, 원소 저항 -${Math.floor(stacks || 0) * Number(perStack || 0)}%`,
    chaosErosion: value => `카오스 저항 -${Number(value || 0).toFixed(0)}%`,
    regenSuppress: value => `생명력 재생 -${Number(value || 0).toFixed(0)}%`,
    talentInquisitorMark: value => `폭발 예정 누적 피해 ${Math.floor(value || 0)}`,
    talentButcherMark: value => `${Math.floor(value || 0)}/4회 적중`,
    rangerWeakpointMark: value => `${Math.floor(value || 0)}/3회 적중`,
    bloomRegenSuppress: value => `생명력 재생 ${Number(value || 0).toFixed(0)}% 억제`,
    delayedGuardHeal: value => `남은 회복량 ${Math.floor(value || 0)}`,
    riderCompassReady: () => '이동 후 첫 타격 피해 +100%',
    fletcherCharge: value => `${Math.floor(value || 0)}/3회 공격, 3번째 공격 피해 +33%`,
    colosseumCharge: value => `${Math.floor(value || 0)}/5중첩, 5중첩 시 다음 공격 강화`,
    queenBeeSwarm: (count, attacksLeft) => `${Math.floor(count || 0)}마리, 남은 공격 ${Math.floor(attacksLeft || 0)}회`
});

function getUiCombatEffectPresentation(key) {
    return UI_COMBAT_EFFECT_PRESENTATION[key] || { sprite: 48, label: String(key || '알 수 없는 효과'), color: '#d8d8d8' };
}

function renderCombatEffectIcon(options) {
    let visual = getUiCombatEffectPresentation(options.key);
    let label = options.label || visual.label;
    let safeKey = String(options.key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    let sprite = Math.max(0, Math.min(48, Math.floor(Number(visual.sprite) || 0)));
    let spriteX = ((sprite % 7) / 6 * 100).toFixed(4);
    let spriteY = (Math.floor(sprite / 7) / 6 * 100).toFixed(4);
    let tooltip = options.tooltip || '';
    let tooltipAttrs = tooltip
        ? ` data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"`
        : '';
    let remainingSec = Math.max(0, Number(options.remainingSec) || 0);
    let durationSec = Math.max(0, Number(options.durationSec) || 0);
    let timedClass = remainingSec > 0 ? ' timed' : '';
    let remainingAngle = durationSec > 0 ? Math.max(0, Math.min(360, remainingSec / durationSec * 360)) : 360;
    let time = remainingSec > 0 ? `<span class="combat-effect-time">${remainingSec >= 100 ? '99+' : Math.ceil(remainingSec)}</span>` : '';
    let badge = options.badge ? `<span class="combat-effect-badge">${escapeHTML(options.badge)}</span>` : '';
    return `<span class="combat-effect-icon effect-${safeKey}${timedClass}" role="img" aria-label="${escapeHTML(label)}" style="--effect-color:${visual.color};--effect-sprite-x:${spriteX}%;--effect-sprite-y:${spriteY}%;--effect-remaining-angle:${remainingAngle.toFixed(2)}deg;"${tooltipAttrs}><span class="combat-effect-art" aria-hidden="true"></span>${time}${badge}</span>`;
}

function getUiRuntimeEffectDetail(type, value, maxValue) {
    let formatter = UI_RUNTIME_EFFECT_DETAILS[type];
    return formatter ? formatter(value, maxValue) : '효과가 적용 중입니다.';
}

function getUiExperienceProgress(level, experience) {
    let required = Math.max(1, Number(getExpReq(level)) || 1);
    let current = Math.max(0, Number(experience) || 0);
    return {
        current,
        required,
        remaining: Math.max(0, Math.floor(required - current)),
        percent: Math.max(0, Math.min(100, current / required * 100))
    };
}

function getUiEffectRemainingSeconds(expiresAt, now) {
    return Math.ceil(Math.max(0, (Number(expiresAt || 0) - now) / 1000));
}

function renderUiRuntimeEffectIcon(options, now) {
    let keyArg = escapeHTML(JSON.stringify(String(options.key || '')));
    let value = Number(options.value || 0);
    let maxValue = Number(options.maxValue || 0);
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(options.expiresAt, now);
    let tooltip = `showPlayerRuntimeEffectTooltip(event,${keyArg},${value},${maxValue},${remain})`;
    return renderCombatEffectIcon({ key: options.key, label: options.label, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}

function renderUiNamedEffectIcon(options, now) {
    let keyArg = escapeHTML(JSON.stringify(String(options.key || '')));
    let nameArg = escapeHTML(JSON.stringify(String(options.name || '')));
    let detailArg = escapeHTML(JSON.stringify(String(options.detail || '')));
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(options.expiresAt, now);
    let tooltip = `showPlayerNamedEffectTooltip(event,${keyArg},${nameArg},${detailArg},${remain})`;
    return renderCombatEffectIcon({ key: options.key, label: options.name, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}

function getUiRecoveryEffectSummary(instances, target) {
    let active = (Array.isArray(instances) ? instances : []).filter(row => {
        if (!row || Number(row.remaining) <= 0 || Number(row.rate) <= 0) return false;
        return !target || (row.target === 'energyShield' ? 'energyShield' : 'life') === target;
    });
    if (active.length === 0) return null;
    return active.reduce((summary, row) => {
        let remaining = Math.max(0, Number(row.remaining) || 0);
        let rate = Math.max(0, Number(row.rate) || 0);
        summary.remaining += remaining;
        summary.rate += rate;
        summary.remainSec = Math.max(summary.remainSec, rate > 0 ? remaining / rate : 0);
        return summary;
    }, { remaining: 0, rate: 0, remainSec: 0 });
}

function getUiEliteTraitBuffDetail(trait) {
    let source = trait && typeof trait === 'object' ? trait : {};
    let parts = [];
    if (Number(source.atkMul) > 1) parts.push(`피해 +${Math.round((source.atkMul - 1) * 100)}%`);
    if (Number(source.attackSpeedVarMul) > 1) parts.push(`공격 속도 +${Math.round((source.attackSpeedVarMul - 1) * 100)}%`);
    if (Number(source.hpMul) > 1) parts.push(`최대 생명력 +${Math.round((source.hpMul - 1) * 100)}%`);
    if (Number(source.critChanceBonus)) parts.push(`치명타 확률 +${Number(source.critChanceBonus)}%p`);
    if (Number(source.dr)) parts.push(`피해 감소 +${Number(source.dr)}%`);
    let resistance = ['resF', 'resC', 'resL', 'resChaos'].reduce((sum, stat) => sum + Math.max(0, Number(source[stat]) || 0), 0);
    if (resistance > 0) parts.push(`저항 보너스 합계 +${resistance}%`);
    if (Number(source.hitRateGuard)) parts.push(`회피 +${Math.round(Number(source.hitRateGuard) * 100)}%`);
    return parts.join(', ') || '훔친 정예 특성이 적용됩니다.';
}

function buildPlayerAilmentEffectIcons() {
    return (game.playerAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let typeArg = escapeHTML(JSON.stringify(type));
        let visual = getUiCombatEffectPresentation(type);
        let stacks = Math.max(1, Math.floor(ail.stacks || 1));
        let tooltip = `showPlayerAilmentTooltip(event,${typeArg},${remain},${Number(ail.power || 0.1).toFixed(3)},${Math.floor(getUiStoredAilmentHitDamage(ail))})`;
        return renderCombatEffectIcon({ key: type, label: visual.label, tooltip, badge: stacks > 1 ? `${stacks}` : '', remainingSec: remain, durationSec: ail.duration });
    }).join('');
}

/** Icon title of a condition effect: the talisman line's gem name (or its kind), or 함성 공명 for the belt. */
function getConditionEffectTitle(name) {
    const id = String(name || '').replace(/^talisman:/, '');
    if (id === 'resonance') return '함성 공명';
    const def = talismans.conditionDef(id);
    return def ? (def.name || { guard: '수호', warcry: '함성', curse: '저주' }[def.kind]) : String(name || '');
}

function buildPlayerConditionEffectIcons(now) {
    let icons = [];
    if (game.woodsmanCurseActive) {
        let taken = Math.max(0, Math.floor(game.woodsmanCurseDamageTakenStacks || 0)) * 0.01;
        let tooltip = `showPlayerRuntimeEffectTooltip(event,'woodsmanCurse',${taken.toFixed(2)},0,0)`;
        icons.push(renderCombatEffectIcon({ key: 'woodsmanCurse', tooltip }));
    }
    talismanCombat.active().forEach(({ buff }) => {
        let nameArg = escapeHTML(JSON.stringify(String(buff.name || '')));
        let typeArg = escapeHTML(JSON.stringify(String(buff.type || 'buff')));
        let key = ['guard', 'warcry'].includes(buff.type) ? buff.type : 'buff';
        icons.push(renderCombatEffectIcon({ key, label: getConditionEffectTitle(buff.name), tooltip: `showPlayerBuffTooltip(event,${nameArg},${typeArg},0)` }));
    });
    (game.cosmosPlayerDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).forEach(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let type = String(row.type || 'unknown');
        let typeArg = escapeHTML(JSON.stringify(type));
        let labelArg = escapeHTML(JSON.stringify(String(row.label || '')));
        let tooltip = `showPlayerCosmosDebuffTooltip(event,${typeArg},${Number(row.value || 0).toFixed(2)},${remain},${labelArg})`;
        icons.push(renderCombatEffectIcon({ key: type, label: row.label, tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 }));
    });
    return icons.join('');
}

function buildPlayerUniqueEffectIcons(pStats, now) {
    let icons = [];
    let talentRuntime = game.talentCardRuntime;
    if (talentRuntime && Number(talentRuntime.stoneShieldAmount) > 0 && Number(talentRuntime.stoneShieldExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'stoneShield', value: talentRuntime.stoneShieldAmount, maxValue: talentRuntime.stoneShieldMax, expiresAt: talentRuntime.stoneShieldExpiresAt }, now));
    }
    let guard = game.playerUniqueGuard;
    if (guard && Number(guard.amount) > 0 && Number(guard.expiresAt) > now) {
        let hpPct = Number((pStats.uniqueDragonVeinGuard || {}).hpPct || 8);
        let maximum = Math.max(Number(guard.amount) || 0, Math.floor(Number(pStats.maxHp || 0) * hpPct / 100));
        icons.push(renderUiRuntimeEffectIcon({ key: 'playerUniqueGuard', value: guard.amount, maxValue: maximum, expiresAt: guard.expiresAt }, now));
    }
    let stealth = pStats.uniqueDeflectStealth;
    if (stealth && Number(game.shadowStealthExpiresAt) > now) {
        let detail = `이동 속도 +${Number(stealth.move || 20)}%, 회피 +${Number(stealth.evasionPct || 20)}%, 치명타 피해 +${Number(stealth.critDmg || 20)}%`;
        icons.push(renderUiNamedEffectIcon({ key: 'shadowStealth', name: '그림자 은신', detail, expiresAt: game.shadowStealthExpiresAt }, now));
    }
    let leech = pStats.uniqueLeechEfficiencyOnKill;
    if (leech && Number(game.uniqueLeechEfficiencyUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'leechEfficiency', value: leech.efficiencyPct, expiresAt: game.uniqueLeechEfficiencyUntil }, now));
    }
    let armorAmp = pStats.uniqueMeleeArmorAmp;
    let armorStacks = Math.max(0, Math.floor(Number(game.uniqueMeleeArmorAmpStacks) || 0));
    if (armorAmp && armorStacks > 0 && Number(game.uniqueMeleeArmorAmpExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'meleeArmorAmp', value: armorStacks, maxValue: armorAmp.ampPct, expiresAt: game.uniqueMeleeArmorAmpExpiresAt, badge: `${armorStacks}` }, now));
    }
    let moveState = game.uniqueKillMoveStacksState;
    if (pStats.uniqueKillMoveStacks && moveState && Number(moveState.stacks) > 0 && Number(moveState.expiresAt) > now) {
        let stacks = Math.floor(moveState.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'killMoveStacks', value: stacks, maxValue: pStats.uniqueKillMoveStacks.movePerStack, expiresAt: moveState.expiresAt, badge: `${stacks}` }, now));
    }
    if (pStats.uniqueRiderCompass && Number(game.lastMoveEndedAt) > 0 && !game.uniqueRiderCompassConsumed) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'riderCompassReady' }, now));
    }
    let elite = game.uniqueEliteTraitBuff;
    if (elite && Number(elite.expiresAt) > now) {
        icons.push(renderUiNamedEffectIcon({ key: 'eliteTraitBuff', name: (elite.trait || {}).name || '무한한 허기', detail: getUiEliteTraitBuffDetail(elite.trait), expiresAt: elite.expiresAt }, now));
    }
    return icons.join('');
}

function getUiLeechEffectDetail(summary, pStats, target) {
    let resource = target === 'energyShield' ? '보호막' : '생명력';
    let remaining = Math.floor(summary.remaining || 0);
    let rate = Math.floor(summary.rate || 0);
    if (typeof getLeechCaps !== 'function') return `남은 ${resource} 회복 ${remaining}, 초당 ${rate}`;
    let caps = getLeechCaps(pStats, target);
    return `남은 ${resource} 회복 ${remaining} / 저장 한도 ${Math.floor(caps.totalCap)}, 현재 초당 ${rate}, 개별 초당 상한 ${Math.floor(caps.rateCap)}`;
}

function buildPlayerRecoveryEffectIcons(pStats) {
    let icons = [];
    let lifeLeech = getUiRecoveryEffectSummary(game.playerLeechInstances, 'life');
    let esLeech = getUiRecoveryEffectSummary(game.playerLeechInstances, 'energyShield');
    let recoup = getUiRecoveryEffectSummary(game.playerRecoupInstances);
    if (lifeLeech) icons.push(renderUiNamedEffectIcon({ key:'lifeLeech', name:'생명력 흡혈', detail:getUiLeechEffectDetail(lifeLeech, pStats, 'life'), remainSec:lifeLeech.remainSec }, 0));
    if (esLeech) icons.push(renderUiNamedEffectIcon({ key:'energyShieldLeech', name:'에너지 보호막 흡혈', detail:getUiLeechEffectDetail(esLeech, pStats, 'energyShield'), remainSec:esLeech.remainSec }, 0));
    if (recoup) icons.push(renderUiRuntimeEffectIcon({ key: 'lifeRecoup', value: recoup.remaining, maxValue: recoup.rate, remainSec: recoup.remainSec }, 0));
    if (Number(game.delayedGuardHealPool) >= 1) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'delayedGuardHeal', value: game.delayedGuardHealPool }, 0));
    }
    return icons.join('');
}

function buildPlayerAscendStackEffectIcons(now) {
    let icons = [];
    let owns = id => typeof hasKeystone === 'function' && hasKeystone(id);
    if (owns('w2')) {
        let crit = Number(game.warriorRhythmExpiresAt) > now ? Math.min(5, Math.floor(game.warriorRhythmStacks || 0)) : 0;
        let chain = Number(game.warriorRhythmDoubleExpiresAt) > now ? Math.min(5, Math.floor(game.warriorRhythmDoubleStacks || 0)) : 0;
        if (crit + chain > 0) {
            let expiresAt = Math.max(Number(game.warriorRhythmExpiresAt) || 0, Number(game.warriorRhythmDoubleExpiresAt) || 0);
            icons.push(renderUiRuntimeEffectIcon({ key: 'warriorRhythm', value: crit, maxValue: chain, expiresAt, badge: `${crit + chain}` }, now));
        }
    }
    if (owns('g2') && Number(game.gladiatorFlurryExpiresAt) > now) {
        let stacks = Math.min(12, Math.floor(game.gladiatorFlurryStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorFlurry', value: stacks, expiresAt: game.gladiatorFlurryExpiresAt, badge: `${stacks}` }, now));
    }
    if (owns('g3') && Number(game.gladiatorVeteranCritBonus) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorVeteran', value: game.gladiatorVeteranCritBonus, badge: `${Math.floor(game.gladiatorVeteranCritBonus)}` }, now));
    }
    if (owns('e8') && Number(game.elementalistOverloadStacks) > 0) {
        let stacks = Math.floor(game.elementalistOverloadStacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'elementalistOverload', value: stacks, badge: `${stacks}` }, now));
    }
    if (owns('gd6') && Number(game.guardianEnduranceExpiresAt) > now) {
        let stacks = Math.min(5, Math.floor(game.guardianEnduranceStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'guardianEndurance', value: stacks, expiresAt: game.guardianEnduranceExpiresAt, badge: `${stacks}` }, now));
    }
    return icons.join('');
}

function buildPlayerAscendReadyEffectIcons(now) {
    let icons = [];
    let owns = id => typeof hasKeystone === 'function' && hasKeystone(id);
    if (owns('g5') && (game.gladiatorSwiftOpeningReady || game.gladiatorSwiftGuardReady)) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'gladiatorSwift', value: game.gladiatorSwiftOpeningReady ? 1 : 0, maxValue: game.gladiatorSwiftGuardReady ? 1 : 0 }, now));
    }
    if (owns('a2') && game.assassinBlurred) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'assassinBlurred' }, now));
    }
    if (owns('ct4') && game.catalystEvadeBoostReady) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'catalystEvade' }, now));
    }
    if (owns('cr8') && Number(game.crusaderLightningAegisUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'crusaderLightningAegis', expiresAt: game.crusaderLightningAegisUntil }, now));
    }
    return icons.join('');
}

function buildPlayerTalentAndSummonEffectIcons(now) {
    let icons = [];
    let talent = game.talentRuntime && typeof game.talentRuntime === 'object' ? game.talentRuntime : {};
    let talentActive = id => typeof isTalentCardActive !== 'function' || isTalentCardActive(id);
    let fletcherCount = Math.max(0, Math.min(3, Math.floor(talent.fletcherCount || 0)));
    if (talentActive('hero1__gladiator') && fletcherCount > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'fletcherCharge', value: fletcherCount, badge: `${fletcherCount}` }, now));
    }
    if (talentActive('hero2__gladiator') && talent.colosseumReady) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'colosseumReady' }, now));
    } else if (talentActive('hero2__gladiator') && Number(talent.colosseumKills) > 0) {
        let kills = Math.min(4, Math.floor(talent.colosseumKills));
        icons.push(renderUiRuntimeEffectIcon({ key: 'colosseumCharge', value: kills, badge: `${kills}` }, now));
    }
    if (Number(game.bloomTrialRegenSuppress) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'bloomRegenSuppress', value: game.bloomTrialRegenSuppress * 100 }, now));
    }
    let bees = (Array.isArray(game.queenBees) ? game.queenBees : [])
        .filter(bee => bee && Number(bee.expiresAt) > now && Number(bee.attacksLeft) > 0);
    if (bees.length > 0) {
        let attacksLeft = bees.reduce((sum, bee) => sum + Math.floor(bee.attacksLeft), 0);
        let expiresAt = Math.max(...bees.map(bee => Number(bee.expiresAt) || 0));
        icons.push(renderUiRuntimeEffectIcon({ key: 'queenBeeSwarm', value: bees.length, maxValue: attacksLeft, expiresAt, badge: `${bees.length}` }, now));
    }
    if (Number(game.summonDeathDamageBuffExpiresAt) > now && Number(game.summonDeathDamageBuffPct) > 0) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'summonDeathDamageBuff', value: game.summonDeathDamageBuffPct, expiresAt: game.summonDeathDamageBuffExpiresAt }, now));
    }
    if (Number(game.summonCritAspdExpiresAt) > now && Number(game.summonCritAspdStacks) > 0) {
        let stacks = Math.floor(game.summonCritAspdStacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'summonCritAspd', value: stacks, maxValue: game.summonCritAspdPerStack, expiresAt: game.summonCritAspdExpiresAt, badge: `${stacks}` }, now));
    }
    return icons.join('');
}

function buildPlayerRealmEffectIcons(pStats, now) {
    let icons = [];
    if (pStats.uniqueDeathWard && game.realmDeathWard && Number(game.realmDeathWard.amount) > 0) {
        let amount = Math.max(0, Math.floor(Number(game.realmDeathWard.amount) || 0));
        let maximum = Math.max(amount, Math.floor(Number(game.realmDeathWard.maxAmount) || 0));
        icons.push(renderCombatEffectIcon({ key: 'deathWard', tooltip: `showPlayerRuntimeEffectTooltip(event,'deathWard',${amount},${maximum},0)` }));
    }
    if ((game.realmInvulnerableBarrierUntil || 0) > now) {
        let remain = Math.ceil((game.realmInvulnerableBarrierUntil - now) / 1000);
        icons.push(renderCombatEffectIcon({ key: 'invulnerableBarrier', tooltip: `showPlayerRuntimeEffectTooltip(event,'invulnerableBarrier',0,0,${remain})`, remainingSec: remain, durationSec: 1.5 }));
    }
    if (typeof hasKeystone === 'function' && hasKeystone('w5')) {
        let stacks = typeof getWarriorRageStacks === 'function' ? getWarriorRageStacks(now) : 0;
        if (stacks > 0) {
            let remain = Math.ceil(Math.max(0, (game.warriorRageExpiresAt - now) / 1000));
            icons.push(renderCombatEffectIcon({ key: 'warriorRage', tooltip: `showPlayerRuntimeEffectTooltip(event,'warriorRage',${stacks},5,${remain})`, badge: `${stacks}`, remainingSec: remain, durationSec: 5 }));
        }
    }
    return icons.join('');
}

function buildPlayerCombatEffectIcons(pStats, now) {
    return buildPlayerAilmentEffectIcons()
        + buildPlayerConditionEffectIcons(now)
        + buildPlayerUniqueEffectIcons(pStats, now)
        + buildPlayerRecoveryEffectIcons(pStats)
        + buildPlayerAscendStackEffectIcons(now)
        + buildPlayerAscendReadyEffectIcons(now)
        + buildPlayerTalentAndSummonEffectIcons(now)
        + buildPlayerRealmEffectIcons(pStats, now);
}

/** An effect icon strip's new markup. Its timer rings turn every tick (--effect-remaining-angle), and rebuilding the strip for that
 * removed and re-added its elements ten times a second, so the page re-checked every body:has() rule each time (2026-10-07 frame
 * drops: the costliest style passes of the endgame). While the icons keep their shape, only the changed attributes and texts move. */
function patchCombatEffectStrip(host, markup) {
    if (!host || host.__lastHtml === markup) return;
    host.__lastHtml = markup;
    const parsed = document.createElement('template');
    parsed.innerHTML = markup;
    if (!parsed.content || !host.children) { host.innerHTML = markup; return; } // no template parsing here (script tests' stand-in DOM)
    const fresh = [...parsed.content.children], live = [...host.children];
    if (fresh.length === live.length && fresh.every((node, index) => sameEffectShape(node, live[index]))) {
        fresh.forEach((node, index) => syncEffectNode(live[index], node));
    } else host.innerHTML = markup;
}

/** Same tags and classes all the way down (a new icon, a timer appearing, or a badge coming means a rebuild). */
function sameEffectShape(fresh, live) {
    const pairs = [[fresh, live]];
    while (pairs.length) {
        const [a, b] = pairs.pop();
        if (a.tagName !== b.tagName || a.className !== b.className || a.children.length !== b.children.length) return false;
        for (let index = 0; index < a.children.length; index++) pairs.push([a.children[index], b.children[index]]);
    }
    return true;
}

function syncEffectNode(live, fresh) {
    const pairs = [[live, fresh]];
    while (pairs.length) {
        const [to, from] = pairs.pop();
        for (const { name, value } of from.attributes) if (to.getAttribute(name) !== value) to.setAttribute(name, value);
        if (from.children.length) for (let index = 0; index < from.children.length; index++) pairs.push([to.children[index], from.children[index]]);
        else if (to.textContent !== from.textContent) to.textContent = from.textContent;
    }
}

function updatePlayerCombatEffectHud(pStats, hpAilBar) {
    let markup = buildPlayerCombatEffectIcons(pStats, getCombatTime());
    patchCombatEffectStrip(document.getElementById('ui-player-ailments-under'), markup);
    let projectedDamage = (game.playerAilments || []).reduce((sum, ail) => {
        if (!ail || (ail.time || 0) <= 0 || !isUiDamageAilmentType(ail.type)) return sum;
        return sum + Math.floor(getUiPlayerDamageAilmentDps(ail, pStats) * Math.max(0, ail.time || 0));
    }, 0);
    let playerHpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let pendingPct = Math.max(0, Math.min(playerHpPct, projectedDamage / Math.max(1, pStats.maxHp) * 100));
    if (!hpAilBar) return;
    hpAilBar.style.width = `${pendingPct}%`;
    hpAilBar.style.left = 'auto';
    hpAilBar.style.right = `${Math.max(0, 100 - playerHpPct)}%`;
    hpAilBar.style.display = pendingPct > 0.05 ? 'block' : 'none';
}

function getUiEnemyTraitLabels(tags) {
    return (Array.isArray(tags) ? tags : []).filter(tag => {
        let label = String(tag || '').trim();
        return label && label !== '보스' && label !== '정예';
    });
}

function getUiEnemyTraitDisplayText(tags) {
    let labels = getUiEnemyTraitLabels(tags);
    let fullText = labels.join(', ');
    let compactLabels = labels.map(label => String(label)
        .replace(/^패턴:\s*/, '')
        .replace(/^다음:\s*/, '다음 ')
        .split(/\s+[—–]\s+/)[0]
        .replace(/\s+전개$/, ''));
    let compactText = compactLabels.join(', ');
    if (compactText.length > 25) {
        compactText = compactLabels.map(label => label.length > 7 ? `${label.slice(0, 6)}…` : label).join(', ');
    }
    return { fullText, compactText };
}

function clearUiEnemyTraitRotation(traitEl) {
    if (!traitEl || traitEl.__traitRotationTimer == null) return;
    clearInterval(traitEl.__traitRotationTimer);
    traitEl.__traitRotationTimer = null;
}

/** Trait text with its keywords and numbers in the item tone colours (2026-10-06: the line was one colour). One wrapping span:
 * the ticker track is a flex box, and spaces between coloured pieces would be dropped as separate flex items. */
function setUiEnemyTraitText(target, text) {
    target.innerHTML = `<span class="enemy-trait-text">${statToneText.html(text)}</span>`;
}

function scheduleUiEnemyTraitOverflow(traitEl, track, content, signature) {
    setUiEnemyTraitText(track, content);
    traitEl.__traitOverflowPending = true;
    if (typeof document !== 'undefined' && document.hidden) return;
    let generation = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
    traitEl.__traitOverflowGeneration = generation;
    let measure = () => {
        if (!traitEl.isConnected || traitEl.__traitOverflowGeneration !== generation || traitEl.__traitSignature !== signature) return;
        if (typeof document !== 'undefined' && document.hidden) return;
        setUiEnemyTraitText(track, content);
        let panelWidth = Math.max(0, traitEl.clientWidth);
        let singleWidth = Math.max(0, track.scrollWidth);
        let overflowing = singleWidth > panelWidth + 4;
        traitEl.classList.toggle('is-overflowing', overflowing);
        if (overflowing) {
            let loopText = statToneText.html(`${content}　　　`);
            track.innerHTML = `<span class="enemy-trait-marquee-copy">${loopText}</span><span class="enemy-trait-marquee-copy" aria-hidden="true">${loopText}</span>`;
            let loopDistance = Math.max(singleWidth, track.scrollWidth / 2);
            track.style.setProperty('--trait-duration', `${Math.max(8, Math.min(20, loopDistance / 20)).toFixed(2)}s`);
        }
        traitEl.__traitOverflowPending = false;
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(measure);
    else measure();
}

function updateUiEnemyTraitMarqueeCopies(traitEl, track, content) {
    if (!traitEl.classList.contains('is-overflowing')) return false;
    let copies = track.querySelectorAll('.enemy-trait-marquee-copy');
    if (copies.length !== 2) return false;
    let loopText = `${content}　　　`;
    copies.forEach(copy => {
        if (copy.textContent !== loopText) setUiEnemyTraitText(copy, loopText);
    });
    return true;
}

function updateUiEnemyTraitPanel(traitEl, labels, display, fullTooltip, isBoss) {
    if (!traitEl) return;
    let track = traitEl.querySelector('.enemy-trait-marquee');
    if (!track) return;
    let visible = Array.isArray(labels) && labels.length > 0;
    traitEl.style.display = visible ? '' : 'none';
    traitEl.removeAttribute('title');
    setElementAttribute(traitEl, 'data-enemy-trait-tooltip', fullTooltip || display.fullText || '');
    setElementAttribute(traitEl, 'data-enemy-trait-kind', isBoss ? '보스 특성' : '정예 특성');
    setElementAttribute(traitEl, 'aria-label', fullTooltip || display.fullText || '');
    if (!visible) {
        clearUiEnemyTraitRotation(traitEl);
        traitEl.__traitSignature = '';
        traitEl.__traitOverflowPending = false;
        traitEl.__traitOverflowGeneration = Math.max(0, Math.floor(traitEl.__traitOverflowGeneration || 0)) + 1;
        track.textContent = '';
        return;
    }
    let mobile = isBoss && typeof matchMedia === 'function' && uiDisplay.matches('(max-width: 1080px)');
    let reducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let signature = `${isBoss ? 'boss' : 'elite'}|${mobile}|${reducedMotion}|${labels.join('\u001f')}`;
    if (traitEl.__traitSignature === signature) {
        if (traitEl.__traitOverflowPending && isBoss && (!mobile || reducedMotion || labels.length === 1)) {
            if (typeof document !== 'undefined' && document.hidden) return;
            scheduleUiEnemyTraitOverflow(traitEl, track, display.fullText, signature);
        }
        return;
    }
    traitEl.__traitSignature = signature;
    if (isBoss && !mobile && !reducedMotion
        && updateUiEnemyTraitMarqueeCopies(traitEl, track, display.fullText)) return;
    clearUiEnemyTraitRotation(traitEl);
    traitEl.classList.remove('is-overflowing', 'is-rotating');
    if (!isBoss) {
        traitEl.removeAttribute('tabindex');
        setUiEnemyTraitText(track, display.compactText);
        return;
    }
    traitEl.setAttribute('tabindex', '0');
    if (!mobile || reducedMotion || labels.length === 1) {
        scheduleUiEnemyTraitOverflow(traitEl, track, display.fullText, signature);
        return;
    }
    let index = 0;
    traitEl.classList.add('is-rotating');
    setUiEnemyTraitText(track, labels[index]);
    traitEl.__traitRotationTimer = setInterval(() => {
        if (!traitEl.isConnected) return clearUiEnemyTraitRotation(traitEl);
        if (traitEl.matches(':hover') || (typeof document !== 'undefined' && document.activeElement === traitEl)) return;
        index = (index + 1) % labels.length;
        setUiEnemyTraitText(track, labels[index]);
    }, 2600);
}

function showEnemyTraitTooltip(event) {
    let anchor = event.currentTarget || (event.target && event.target.closest
        ? event.target.closest('.enemy-traits') : null);
    if (!anchor) return;
    let detail = anchor.getAttribute('data-enemy-trait-tooltip') || '';
    if (!detail) return hideInfoTooltip();
    let title = anchor.getAttribute('data-enemy-trait-kind') || '적 특성';
    let html = `<div class="tooltip-title">${escapeHTML(title)}</div>`
        + String(detail).split('\n').map(line => `<div class="tooltip-line">${statToneText.html(line)}</div>`).join('');
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#d99a8f');
}

function buildEnemyCombatEffectIcons(activeAilments, enemyDebuffs, now, enemy) {
    let ailmentIcons = (activeAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let stacks = type === 'assassinWeakness'
            ? Math.max(1, Math.floor(ail.power || 1))
            : Math.max(1, Math.floor(ail.stacks || 1));
        let badge = stacks > 1 ? `${stacks}` : '';
        let tooltipPayload = {
            type,
            timeLeft: remain,
            power: Number(ail.power || 0),
            sourceHitDamage: Math.floor(getUiStoredAilmentHitDamage(ail)),
            specialDps: Math.floor(ail.flameDecayDps || 0),
            critDotBonusPct: Number(ail.critDotBonusPct || 0),
            stacks,
            rawTickDamage: Math.floor(ail.rawTickDamage || 0),
            tickInterval: Number(ail.tickInterval || 0),
            enemyRes: Number(ail.enemyRes || 0),
            abyssPlayerMul: Number(ail.abyssPlayerMul || 1),
            igniteTakenMultiplier: Number(ail.igniteTakenMultiplier || 1)
        };
        let tooltip = `showEnemyAilmentTooltip(event,${escapeHTML(JSON.stringify(tooltipPayload))})`;
        return renderCombatEffectIcon({ key: type, tooltip, badge, remainingSec: remain, durationSec: ail.duration });
    });
    let curseIcons = (enemyDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).map(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let nameArg = escapeHTML(JSON.stringify(String(row.name || '')));
        let tooltip = `showPlayerBuffTooltip(event,${nameArg},'curse',${remain})`;
        return renderCombatEffectIcon({ key: 'curse', label: getConditionEffectTitle(row.name), tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 });
    });
    return ailmentIcons.concat(curseIcons).join('') + buildEnemyRuntimeEffectIcons(enemy, now);
}

function buildEnemyRuntimeEffectIcons(enemy, now) {
    if (!enemy || enemy.id == null) return '';
    let icons = [];
    let id = enemy.id;
    let dot = enemy.dotState && typeof enemy.dotState === 'object' ? enemy.dotState : null;
    if (dot && Number(dot.timeLeft) > 0 && dot.skillName !== '화염 부패') {
        let stacks = Math.max(1, Math.floor(Number(dot.stacks) || Number(enemy.dotStacks) || 1));
        let slow = Math.max(0, Number(enemy.skillSlowPct) || 0);
        let name = dot.skillName && dot.skillName !== 'dot' ? dot.skillName : '지속 피해';
        let detail = `${stacks}중첩, 틱 피해 ${Math.floor(Number(dot.rawTickDamage) || 0)}${slow > 0 ? `, 둔화 ${slow.toFixed(0)}%` : ''}`;
        icons.push(renderUiNamedEffectIcon({ key: 'enemySkillDot', name, detail, remainSec: dot.timeLeft, badge: `${stacks}` }, now));
    }
    let witherStacks = Math.max(0, Math.floor(Number((game.enemyWitherStacks || {})[id]) || 0));
    if (witherStacks > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'enemyWither', value: witherStacks, badge: `${witherStacks}` }, now));
    let chaosRow = (game.enemyUniqueChaosResDown || {})[id];
    if (chaosRow && Number(chaosRow.stacks) > 0) {
        let stacks = Math.floor(chaosRow.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'enemyChaosResDown', value: stacks, maxValue: chaosRow.perHit, badge: `${stacks}` }, now));
    }
    let elementalRow = (game.enemyUniqueElementalResDown || {})[id];
    if (elementalRow && Number(elementalRow.stacks) > 0) {
        let stacks = Math.floor(elementalRow.stacks);
        icons.push(renderUiRuntimeEffectIcon({ key: 'enemyElementalResDown', value: stacks, maxValue: elementalRow.perHit, badge: `${stacks}` }, now));
    }
    let judgment = (game.talentInquisitorMarks || {})[id];
    if (judgment && Number(judgment.accumulated) > 0 && Number(judgment.explodeAt) > now) {
        icons.push(renderUiRuntimeEffectIcon({ key: 'talentInquisitorMark', value: judgment.accumulated, expiresAt: judgment.explodeAt }, now));
    }
    let butcherHits = Math.max(0, Math.floor(Number(((game.talentButcherMarks || {})[id] || {}).hits) || 0));
    if (butcherHits > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'talentButcherMark', value: butcherHits, badge: `${butcherHits}` }, now));
    let weakpointHits = Math.max(0, Math.floor(Number(((game.rangerWeakpointMarks || {})[id] || {}).hits) || 0));
    if (weakpointHits > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'rangerWeakpointMark', value: weakpointHits, badge: `${weakpointHits}` }, now));
    if (Number(enemy.chaosErosionShred) > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'chaosErosion', value: enemy.chaosErosionShred }, now));
    if (Number(enemy.regenSuppressPct) > 0) icons.push(renderUiRuntimeEffectIcon({ key: 'regenSuppress', value: enemy.regenSuppressPct }, now));
    return icons.join('');
}

/** 모바일 HUD는 보호막이 없으면 생명력 아래 보호막 줄 자리를 접는다(css/components/bars.css). */
function markPlayerEnergyShieldRow(hpTrack, hasEnergyShield) {
    let frame = hpTrack && hpTrack.closest && hpTrack.closest('.player-health-frame');
    if (frame) frame.toggleAttribute('data-energy-shield', hasEnergyShield);
}

/** 생명 구슬 안 보호막 글자: "보호막 현재/최대". 휴대폰의 작은 구슬(50px)에서는 CSS가 이름과 최대를 숨기고 파란 현재값만 남긴다(pixel-hud.css). */
/** 틱마다 숫자 글자만 바꾼다: innerHTML을 갈면 새 요소가 끼어들어 body의 :has() 규칙까지 다시 따졌다(2026-10-07 프레임 드랍). */
function renderEnergyShieldInline(el, hasEnergyShield, current, max) {
    if (!el) return;
    const display = hasEnergyShield ? '' : 'none';
    if (el.style.display !== display) el.style.display = display;
    if (!hasEnergyShield) return;
    const parts = energyShieldInlineParts(el);
    const nowText = String(Math.floor(current || 0)), maxText = `/${Math.floor(max || 0)}`;
    if (parts.now.data !== nowText) parts.now.data = nowText;
    if (parts.max.data !== maxText) parts.max.data = maxText;
}

/** The two number text nodes of the ES line, built once ("보호막 " label, current, "/max"). */
function energyShieldInlineParts(el) {
    if (el.__esParts && el.__esParts.now.parentNode === el) return el.__esParts;
    el.innerHTML = '<span class="combat-es-label">보호막 </span>0<span class="combat-es-max">/0</span>';
    el.__esParts = { now: el.childNodes[1], max: el.lastChild.firstChild };
    return el.__esParts;
}

let hudShownLevel = 0;
/** 경험치 구슬의 레벨 글자. 레벨이 오르면 구슬 위에 "레벨 업 · Lv N"을 잠깐 띄운다 — 기록 한 줄 · 0.5초 이펙트 · 메뉴 점만으로는
 * 놓치기 쉬웠다(검토 2026-10-01). 처음 그릴 때와 방치 정산 중에는 띄우지 않는다. */
function showHudLevel(level) {
    setTextById('ui-exp-level-label', `Lv.${level}`);
    const previous = hudShownLevel;
    hudShownLevel = level;
    if (!previous || level <= previous || game.isBackgroundCalculation) return;
    playLevelUpCallout(level);
}

function playLevelUpCallout(level) {
    const orb = document.querySelector('#battle-column .combat-exp-bar');
    if (!orb || typeof orb.animate !== 'function') return;
    let label = orb.querySelector('.level-up-callout');
    if (!label) {
        label = document.createElement('span');
        label.className = 'level-up-callout';
        label.setAttribute('aria-hidden', 'true');
        orb.appendChild(label);
    }
    label.textContent = `레벨 업 Lv ${level}`;
    label.getAnimations().forEach(animation => animation.cancel());
    label.animate([
        { opacity: 0, translate: '0 6px' },
        { opacity: 1, translate: '0 0', offset: 0.1 },
        { opacity: 1, translate: '0 0', offset: 0.8 },
        { opacity: 0, translate: '0 -6px' }
    ], { duration: 2000, easing: 'steps(20, end)', fill: 'forwards' });
}

function updateCombatUI(pStats) {
    pStats = normalizeUiPlayerStats(pStats, cachedTooltipStats || {});
    if (pStats.__uiFallbackStats) pStats.maxHp = Math.max(pStats.maxHp, Math.max(1, Number(game.playerHp) || 1));
    if (pStats && pStats.breakdowns && !pStats.__uiFallbackStats) cachedTooltipStats = pStats;
    let safeHp = Math.max(0, Number(game.playerHp) || 0);
    // 생명은 정수로 올림(1 미만이 남아도 1 — 살아 있음이 보이게), 최대 생명 표시(내림)는 넘지 않는다.
    let shownHp = Math.max(0, Math.min(Math.ceil(safeHp - 1e-6), Math.floor(Number(pStats.maxHp) || 0)));
    setTextById('ui-hp', formatSettingNumber(shownHp, 'showHpComma'));
    setTextById('ui-maxhp', formatSettingNumber(pStats.maxHp, 'showHpComma'));
    let hpPct = Math.max(0, Math.min(100, (game.playerHp / Math.max(1, pStats.maxHp)) * 100));
    let hpBar = document.getElementById('ui-hp-bar');
    setUiImageGaugePercent(hpBar, hpPct);
    hpBar.classList.toggle('player-danger', hpPct > 0 && hpPct <= 25);
    renderCombatSkillHud();
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
    let hasEnergyShield = (pStats.energyShield || 0) > 0;
    let esPct = hasEnergyShield ? Math.max(0, Math.min(100, ((game.playerEnergyShield || 0) / pStats.energyShield) * 100)) : 0;
    markPlayerEnergyShieldRow(hpWrap, hasEnergyShield);
    renderEnergyShieldInline(document.getElementById('ui-es-inline'), hasEnergyShield, game.playerEnergyShield, pStats.energyShield);
    let esBar = document.getElementById('ui-es-bar');
    if (!esBar) {
        let esWrap = document.getElementById('ui-es-track') || hpWrap;
        esBar = document.createElement('div');
        esBar.id = 'ui-es-bar';
        esBar.className = 'hp-bar-fill player-es';
        esBar.style.backgroundColor = '#55c1ff';
        esBar.style.opacity = '0.75';
        esBar.style.position = 'absolute';
        esBar.style.left = '0';
        esBar.style.top = '0';
        esBar.style.zIndex = '5';
        esWrap.insertBefore(esBar, esWrap.firstChild);
    }
    esBar.style.zIndex = '5';
    setUiImageGaugePercent(esBar, esPct);
    esBar.style.display = hasEnergyShield ? 'block' : 'none';
    let expProgress = getUiExperienceProgress(game.level, game.exp);
    setTextById('ui-exp', formatSettingNumber(expProgress.current, 'showExpComma'));
    setTextById('ui-maxexp', formatSettingNumber(expProgress.required, 'showExpComma'));
    let expPct = expProgress.percent;
    setUiImageGaugePercent(document.getElementById('ui-exp-bar'), expPct);
    let playerHudIdentity = getUiPlayerHudIdentity();
    setTextById('ui-player-name-label', playerHudIdentity.name);
    setTextById('ui-player-class-label', playerHudIdentity.className);
    showHudLevel(game.level);
    setTextById('ui-exp-note', `${expPct.toFixed(1)}%`);
    updatePlayerCombatEffectHud(pStats, hpAilBar);
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
    // 레벨·직업은 경험치바 왼쪽(ui-exp-level-label)으로 이동했으므로 여기는 지역 이름만 표기한다.
    setTextById('ui-combat-zone-inline', compactZoneText);
    cosmosRouteUi.updateHud();
    setTextById('btn-combat-return', '귀환');
    let pendingWoodsmanEntrance = !!game.woodsmanEntrancePending && zone && zone.type === 'outsideChaos';
    if (pendingWoodsmanEntrance) {
        let totalTime = Math.max(0.1, Number(game.moveTotalTime) || 3);
        let readyPct = Math.min(100, Math.max(0, (1 - Math.max(0, game.moveTimer || 0) / totalTime) * 100));
        setTextById('ui-progress-label', '☠️ 나무꾼 등장 대기');
        setTextById('ui-move-time-text', game.moveTimer > 0 ? `${Math.max(0, game.moveTimer).toFixed(1)}초` : '등장 임박');
        setCombatProgressGaugePercent(readyPct);
    } else if (game.moveTimer > 0) {
        let readyPct = Math.min(100, (1 - game.moveTimer / game.moveTotalTime) * 100);
        setTextById('ui-progress-label', game.isTownReturning ? '🏕️ 재정비 중...' : '다음 구간 준비');
        setTextById('ui-move-time-text', `${Math.max(0, game.moveTimer).toFixed(1)}초`);
        setCombatProgressGaugePercent(readyPct);
    } else if (zone && zone.type === 'oceanDepth') {
        // 심해는 전투 진행도 대신 현재 수심(m)만 표기한다. 수심은 시간에 따라 1m 단위로 꾸준히 증가한다.
        let oceanSt = (typeof ensureOceanState === 'function') ? ensureOceanState() : null;
        let depthM = oceanSt ? Math.floor(oceanSt.depthM || 0) : 0;
        // 진행 바는 현재 100m 구간 내 진행도를 표시해 수심 1m마다 약 1%씩 차오른다.
        let segPct = Math.min(100, Math.max(0, depthM - Math.floor(depthM / 100) * 100));
        let isDrowning = !!(oceanSt && oceanSt.drowning);
        setTextById('ui-progress-label', isDrowning ? '🫨 익사 위험' : '🌊 수심');
        setTextById('ui-move-time-text', isDrowning ? `${depthM}m, 산소 고갈! 익사 피해 누적` : `${depthM}m`);
        setCombatProgressGaugePercent(isDrowning ? 100 : segPct);
    } else if (getUiCrowdProgressPaused()) {
        setTextById('ui-progress-label', '적 정리 중');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(game.runProgress);
    } else {
        setTextById('ui-progress-label', '진행도');
        setTextById('ui-move-time-text', `${game.runProgress.toFixed(0)}%`);
        setCombatProgressGaugePercent(game.runProgress);
    }

    sideEncounterUi.updateHud(zone);
    syncMapProgressRow(zone);
    atlasUi.updateHud(zone);
    if (getRenderingUiTabIds().has('tab-character')) renderCharacterStats(pStats);

    let enemies = (game.enemies || []).filter(enemy => enemy && (enemy.hp || 0) > 0);
    pruneEnemyHpDamageGhostStates(enemies.map(enemy => enemy.id));
    let targetIds = getUiSkillTargets(pStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    let bossEnemy = enemies.find(enemy => enemy.isBoss || enemy.bossPhase);
    let focusedEnemy = bossEnemy || enemies.find(enemy => targetIds.includes(enemy.id)) || enemies[0] || null;
    let enemyListEl = document.getElementById('ui-enemy-list');
    if (!focusedEnemy) {
        enemyListEl.hidden = false;
        if (enemyListEl.dataset.enemyId !== '') {
            clearUiEnemyTraitRotation(enemyListEl.querySelector('.enemy-traits'));
            enemyListEl.dataset.enemyId = '';
            enemyListEl.innerHTML = `<div class="enemy-empty">현재 조준 중인 적이 없습니다.</div>`;
        }
    } else {
        let pct = Math.max(0, focusedEnemy.hp / focusedEnemy.maxHp * 100);
        let tags = getEnemyTraitSummary(focusedEnemy);
        if (Array.isArray(focusedEnemy.chaosRealmAffixes) && focusedEnemy.chaosRealmAffixes.length > 0) tags = tags.concat(focusedEnemy.chaosRealmAffixes.map(a => a.name));
        tags = Array.from(new Set(getUiEnemyTraitLabels(tags)));
        let activeAilments = (focusedEnemy.ailments || []).filter(ail => ail && (ail.time || 0) > 0);
        let effectNow = getCombatTime();
        let enemyDebuffs = (((game.enemyConditionDebuffs || {})[focusedEnemy.id]) || []).filter(row => row && (row.expiresAt || 0) > effectNow);
        let effectMarkup = buildEnemyCombatEffectIcons(activeAilments, enemyDebuffs, effectNow, focusedEnemy);
        let projectedAilmentDamage = activeAilments.reduce((sum, ail) => {
            if (!ail || (ail.time || 0) <= 0) return sum;
            if (ail.type === 'flameDecay') return sum + Math.floor(Math.max(0, ail.flameDecayDps || 0) * Math.max(0, ail.time || 0));
            if (!isUiDamageAilmentType(ail.type)) return sum;
            let dps = getUiEnemyDamageAilmentDps(ail, pStats);
            let stacks = Math.max(1, Math.floor(ail.stacks || 1));
            return sum + Math.floor(dps * stacks * Math.max(0, ail.time || 0));
        }, 0);
        let pendingPct = Math.max(0, Math.min(pct, (projectedAilmentDamage / Math.max(1, focusedEnemy.maxHp || 1)) * 100));
        let pendingStartPct = Math.max(0, pct - pendingPct);
        let ghostPct = updateEnemyHpDamageGhost(focusedEnemy.id, pct);
        let ghostTrailPct = Math.max(0, ghostPct - pct);
        let ghostDisplay = ghostTrailPct > 0.2 ? 'block' : 'none';
        let enemyHudTier = (focusedEnemy.isBoss || focusedEnemy.bossPhase) ? 'boss' : (focusedEnemy.isElite ? 'elite' : 'mob');
        let focusedKey = String(focusedEnemy.id) + '|' + enemyHudTier;
        // 2026-10-04 visibility: an ordinary monster's HP already rides over its head on the field, so the big top card
        // (name · bar) only shows for elites and bosses — on phones it covered the ground ahead where packs come from.
        enemyListEl.hidden = enemyHudTier === 'mob';
        if (enemyListEl.dataset.enemyId !== focusedKey || !enemyListEl.querySelector('.enemy-card.targeted')) {
            clearUiEnemyTraitRotation(enemyListEl.querySelector('.enemy-traits'));
            enemyListEl.dataset.enemyId = focusedKey;
            let traitMarkup = '<div class="enemy-tags muted enemy-traits" data-info-tooltip-anchor="1" onmouseenter="showEnemyTraitTooltip(event)" onmousemove="showEnemyTraitTooltip(event)" onmouseleave="hideInfoTooltip()"><span class="enemy-trait-marquee"></span></div>';
            let effectMarkup = '<div class="enemy-tags muted enemy-ailments combat-effect-strip enemy-combat-effect-strip" aria-label="활성 상태이상 및 효과"></div>';
            let metaMarkup = `<div class="enemy-hud-meta">${traitMarkup}</div>`;
            enemyListEl.innerHTML = `
                <div class="enemy-card targeted enemy-${enemyHudTier}">
                    <div class="enemy-nameplate"><div class="enemy-name"></div></div>
                    <div class="enemy-health-frame">
                        <img class="health-skin-frame" src="assets/ui/health-${enemyHudTier}-v2.png" alt="" aria-hidden="true">
                        <div class="hp-bar-bg">
                            <div class="health-skin-track">
                                <div class="hp-bar-fill enemy-damage-ghost"></div>
                                <div class="hp-bar-fill enemy-es"></div>
                                <div class="hp-bar-fill enemy"></div>
                                <div class="hp-bar-fill enemy-pending"></div>
                                <div class="hp-text"></div>
                            </div>
                        </div>
                        ${metaMarkup}
                    </div>
                    ${effectMarkup}
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
        setElementText(nameEl, `${getEnemyDisplayName(focusedEnemy)}, Lv.${levelProgression.monsterLevel(zone, focusedEnemy)}`);
        if (ghostEl) {
            ghostEl.style.left = `${pct}%`;
            ghostEl.style.width = `${ghostTrailPct}%`;
            ghostEl.style.display = ghostDisplay;
        }
        if (esEl) {
            let esPct = (focusedEnemy.maxEnergyShield || 0) > 0 ? Math.max(0, Math.min(100, ((focusedEnemy.energyShield || 0) / Math.max(1, focusedEnemy.maxEnergyShield)) * 100)) : 0;
            esEl.style.width = `${esPct}%`;
            esEl.style.display = esPct > 0 ? 'block' : 'none';
        }
        if (hpEl) setUiImageGaugePercent(hpEl, pct);
        if (pendingEl) { pendingEl.style.left = `${pendingStartPct}%`; pendingEl.style.width = `${pendingPct}%`; }
        if (hpTextEl) {
            let zoneNow = getZone(game.currentZoneId);
            if (zoneNow && zoneNow.type === 'woodsmanEcho') {
                let totalDealt = Math.max(0, Math.floor((focusedEnemy.echoStartHp || focusedEnemy.maxHp || 0) - Math.max(0, focusedEnemy.hp || 0)));
                setElementText(hpTextEl, `${focusedEnemy.energyShield > 0 ? `보호막 ${formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma')}, ` : ''}${formatSettingNumber(totalDealt, 'showEnemyHpComma')} / ?`);
            } else setElementText(hpTextEl, `${focusedEnemy.energyShield > 0 ? `보호막 ${formatSettingNumber(focusedEnemy.energyShield, 'showEnemyHpComma')}, ` : ''}${formatSettingNumber(Math.max(0, focusedEnemy.hp), 'showEnemyHpComma')}/${formatSettingNumber(focusedEnemy.maxHp, 'showEnemyHpComma')}`);
        }
        patchCombatEffectStrip(ailmentEl, effectMarkup);
        if (traitEl) {
            let showTraits = !!(focusedEnemy.isElite || focusedEnemy.isBoss || focusedEnemy.bossPhase);
            let traitLabels = getUiEnemyTraitLabels(showTraits ? tags : []);
            let traitDisplay = getUiEnemyTraitDisplayText(traitLabels);
            let patternText = focusedEnemy.patternMode && typeof getBossPatternDescription === 'function'
                ? getBossPatternDescription(focusedEnemy.patternMode) : '';
            let fullTooltip = [traitDisplay.fullText, patternText].filter(Boolean).join('\n');
            updateUiEnemyTraitPanel(traitEl, traitLabels, traitDisplay, fullTooltip, enemyHudTier === 'boss');
            // 특성 줄이 보이면 상태 이상 아이콘 줄은 그 아래로 내려간다(pixel-hud.css .has-trait-line)
            enemyListEl.querySelector('.enemy-card.targeted').classList.toggle('has-trait-line', traitLabels.length > 0);
        }
    }
}

// passive render cache dirty helper: 구조 변경/노드 상태 변경 시 호출
function markPassiveRenderCacheDirty(type) {
    if (!passiveRenderCache) return;
    if (type === 'structure') passiveRenderCache.structureDirty = true;
    passiveRenderCache.stateDirty = true;
    passiveRenderCache.hoverPath = null;
}

function getPassiveStateSignature() {
    let passives = (game.passives || []).slice().sort().join('|');
    let discovered = Array.from(discoveredPassiveNodes || []).sort().join('|');
    let reachable = Array.from(reachableNodes || []).sort().join('|');
    return `${passives}::${discovered}::${reachable}`;
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
    passiveRenderCache.adjacency = typeof getPassiveTreeAdjacency === 'function'
        ? getPassiveTreeAdjacency() : new Map();
    let cellSize = passiveRenderCache.cellSize;
    nodes.forEach(node => {
        let cx = Math.floor(node.x / cellSize);
        let cy = Math.floor(node.y / cellSize);
        let key = `${cx},${cy}`;
        if (!passiveRenderCache.hoverGrid.has(key)) passiveRenderCache.hoverGrid.set(key, []);
        passiveRenderCache.hoverGrid.get(key).push(node);
    });
    passiveRenderCache.hoverPath = null;
    passiveRenderCache.structureDirty = false;
}

function rebuildPassiveStateCache() {
    passiveRenderCache.glowNodes = [];
    passiveRenderCache.activeEdges = passiveRenderCache.edges.filter(edge => {
        if (!isPassiveTreeEdgeAvailable(edge)) return false;
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
    if (passiveRenderCache.stateDirty) rebuildPassiveStateCache();
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
let uiDisclosureState = Object.create(null);
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

function getUiDisclosureKey(details) {
    if (!details || !details.dataset) return '';
    // Research owns saved folds and temporarily opens matching search sections.
    if (details.dataset.gemResearchSection) return '';
    if (details.dataset.uiDisclosure) return `named:${details.dataset.uiDisclosure}`;
    if (details.id) return `id:${details.id}`;
    let owner = typeof details.closest === 'function' ? details.closest('[id]') : null;
    if (!owner || typeof owner.querySelectorAll !== 'function') return '';
    let siblings = Array.from(owner.querySelectorAll('details'));
    let index = siblings.indexOf(details);
    return index >= 0 ? `owner:${owner.id}:${index}` : '';
}

function captureUiDisclosureState(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('details').forEach(details => {
        let key = getUiDisclosureKey(details);
        if (key) uiDisclosureState[key] = !!details.open;
    });
}

function restoreUiDisclosureState(root) {
    if (!root || typeof root.querySelectorAll !== 'function') return;
    root.querySelectorAll('details').forEach(details => {
        let key = getUiDisclosureKey(details);
        if (key && Object.prototype.hasOwnProperty.call(uiDisclosureState, key)) details.open = uiDisclosureState[key];
    });
}

function isUiSelectInteractionActive() {
    let active = typeof document !== 'undefined' ? document.activeElement : null;
    return !!(active && active.tagName === 'SELECT' && active.isConnected !== false);
}

if (!window.__uiRefreshPointerGuardBound) {
    window.__uiRefreshPointerGuardBound = true;
    document.addEventListener('pointerdown', beginUiPointerInteraction, true);
    document.addEventListener('pointerup', finishUiPointerInteraction, true);
    document.addEventListener('pointercancel', finishUiPointerInteraction, true);
    document.addEventListener('focusout', event => {
        if (event && event.target && event.target.tagName === 'SELECT' && uiRefreshQueued) {
            scheduleDeferredStaticUiFlush(0);
        }
    }, true);
    document.addEventListener('toggle', event => {
        let key = getUiDisclosureKey(event && event.target);
        if (key) uiDisclosureState[key] = !!event.target.open;
    }, true);
}

function getJournalEntryAction(entryId) {
    let mapUnlocked = !!(game && game.unlocks && game.unlocks.map);
    let charUnlocked = !!(game && game.unlocks && game.unlocks.char);
    let loop = Math.max(1, Math.floor(Number((game && game.season) || 1)));
    let maxZoneId = Math.max(0, Math.floor(Number((game && game.maxZoneId) || 0)));
    if (/^act_\d+$/.test(entryId) || entryId === 'immortal') {
        return mapUnlocked ? { label: '사냥터 보기', tabId: 'tab-map', subtabId: 'map-explore-hunting' } : null;
    }
    if (entryId === 'woodsman') {
        let chaosReady = typeof hasCurrentLoopChaosAccess === 'function'
            ? hasCurrentLoopChaosAccess(game) : maxZoneId >= ABYSS_START_ZONE_ID;
        return mapUnlocked && chaosReady ? { label: '혼돈 등반 보기', tabId: 'tab-map', subtabId: 'map-explore-chaos' } : null;
    }
    if (entryId === 'woodsman_echo') {
        let realmUnlocked = !!(game && game.chaosRealm && game.chaosRealm.unlocked);
        return mapUnlocked && realmUnlocked ? { label: '혼돈계 보기', tabId: 'tab-map', subtabId: 'map-tab-chaos-realm' } : null;
    }
    if (entryId === 'meteor_fall') {
        let meteorUnlocked = !!(game && game.meteorSite && game.meteorSite.unlocked);
        return mapUnlocked && meteorUnlocked ? { label: '운석 낙하 지점 보기', tabId: 'tab-map', subtabId: 'map-explore-meteor' } : null;
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
    if (entryId === 'labyrinth_10') return mapUnlocked && loop >= 3 && maxZoneId >= 5 ? { label: '고대 미궁 보기', tabId: 'tab-map', subtabId: 'map-explore-labyrinth' } : null;
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
    if (/^pinnacle_/.test(entryId)) {
        return mapUnlocked && loop >= 31 ? { label: '최종 관문 보기', tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    }
    return null;
}

function getJournalEntryAvailability(entry, unlockedIds) {
    let unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
    if (!entry || !entry.id || !entry.def) return 'content-locked';
    if (unlocked.has(entry.id)) return 'unlocked';
    if (entry.def.hidden) return 'hidden';
    let prerequisites = Array.isArray(entry.def.requiresJournal) ? entry.def.requiresJournal : [];
    if (prerequisites.some(id => !unlocked.has(id))) return 'prerequisite-locked';
    return getJournalEntryAction(entry.id) ? 'available' : 'content-locked';
}

function getJournalContentUnlockHint(entryId) {
    if (entryId === 'woodsman') return '액트 10 클리어 후 혼돈 입성';
    if (entryId === 'meteor_fall') return `루프 ${METEOR_SITE_UNLOCK_LOOP}, 액트 ${METEOR_SITE_UNLOCK_ACT} 도달`;
    if (entryId === 'beehive_queen') return '루프 8 도달';
    if (entryId === 'void_grand_breach') return '루프 9 도달';
    if (entryId === 'labyrinth_10') return '루프 3, 액트 5 도달';
    if (entryId === 'ocean_500') return `루프 ${OCEAN_UNLOCK_LOOP} 도달`;
    if (entryId === 'sky_tower_10') return '루프 15, 혼돈 20층 클리어';
    if (entryId === 'time_rift_fusion') return `루프 ${TIME_RIFT_UNLOCK_LOOP} 도달`;
    if (entryId === 'colony_wave_10') return '루프 15 도달';
    if (/^rival_/.test(entryId) || entryId === 'cosmos_astra' || /^pinnacle_/.test(entryId)) return '루프 31 도달';
    return '';
}

function getJournalLockedHint(availability, entryId) {
    let contentUnlockHint = getJournalContentUnlockHint(entryId);
    if (availability === 'content-locked' && contentUnlockHint) return contentUnlockHint;
    return '???';
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
    if (game.isBackgroundCalculation) return;
    void forceImmediate;
    // 긴 정적 UI 갱신 도중 탭을 누르면 이전에는 그 탭의 후속 렌더 요청을 버렸다.
    // 그러면 새 탭 컨테이너만 활성화되고 주얼·부적·스킬 젬 내용은 이전 탭
    // 기준으로 남아 간헐적인 빈 화면이 됐다. 실행 중 요청은 다음 프레임에 반드시 잇는다.
    if (uiRefreshRunning) {
        uiRefreshQueued = true;
        return;
    }
    if (uiRefreshQueued) return;
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
    if (isUiSelectInteractionActive()) {
        // 네이티브 선택창은 DOM 노드를 교체하는 즉시 닫힌다. 선택이 끝나 포커스가
        // 빠질 때까지 정적 패널 교체만 보류하고, 누적 요청은 focusout에서 한 번 처리한다.
        uiRefreshQueued = true;
        return;
    }
    captureUiDisclosureState(document);
    uiRefreshRunning = true;
    try {
        checkUnlocks();
        performUpdateStaticUI();
        updateBuildFeedback(cachedTooltipStats);
        tutorialActionUi.refresh();
    } finally {
        restoreUiDisclosureState(document);
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
        (game.settings && game.settings.passiveTreeSearch) || '',
        (game.settings && game.settings.passiveTreeFilter) || 'all',
        game.settings && game.settings.passiveTreeShowLabels === false ? 'labels-off' : 'labels-on'
    ].join('|');
    let changed = signature !== lastPassiveTreeSignature;
    let due = (now - lastPassiveTreeDrawAt) >= 500;
    if (changed) lastPassiveTreeSignature = signature;
    return changed || due;
}

function getPlayerEhpCardsHtml(pStats, cardClass) {
    if (typeof calculatePlayerEhpProfile !== 'function') return '';
    let profile = calculatePlayerEhpProfile(pStats);
    let labels = { phys: '물리', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스' };
    return Object.keys(labels).map(element => {
        let row = profile.elements[element];
        let entropyText = formatSettingNumber(row.entropy, 'showCharacterComma');
        let directText = formatSettingNumber(row.direct, 'showCharacterComma');
        let detail = `${labels[element]} 공격 EHP ${entropyText}, 직격 EHP ${directText}, 엔트로피 회피 ${profile.evadeChance.toFixed(1)}%`;
        return `<div class="${cardClass} equipment-ehp-stat" data-ehp-element="${element}" data-ehp-detail="${detail}" tabindex="0" data-info-tooltip-anchor="1" onmouseenter="showPlayerEhpTooltip(event)" onfocus="showPlayerEhpTooltip(event)" onclick="showPlayerEhpTooltip(event)" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()" onblur="hideInfoTooltip()"><span>${labels[element]}</span><strong>${entropyText}</strong></div>`;
    }).join('');
}

function renderCharacterEhpSummary(pStats) {
    let host = document.getElementById('ui-character-ehp');
    if (host) host.innerHTML = getPlayerEhpCardsHtml(pStats, 'equipment-summary-stat character-ehp-stat');
}

const renderCharacterPassiveSpecialStats = function(pStats) {
    const mystique = Math.max(0, Number(pStats.mystique) || 0);
    const cycle = Math.max(0, Number(pStats.cycle) || 0);
    const devotion = Math.max(0, Number(pStats.devotion) || 0);
    const ailment = getAilmentDisplayLabel(pStats.mystiqueAilmentType);
    setTextById('ui-mystique', formatValue('mystique', mystique));
    setTextById('ui-mystique-effect', mystique > 0 ? `${ailment} 피해/위력 +${formatValue('mystique', mystique)}%` : '효과 없음');
    setTextById('ui-cycle', formatValue('cycle', cycle));
    setTextById('ui-cycle-effect', cycle > 0 ? '상태이상 종료 시 6초 강화' : '효과 없음');

    let revelationLabel = devotion > 0 ? (pStats.passiveRevelationLabel || '계시 활성') : '미해금';
    let revelationEffect = `계시 수치 ${formatValue('devotion', devotion)}`;
    if (devotion > 0 && pStats.passiveRevelation === 'combat') {
        revelationEffect += `, 피해 ${formatValue('devotion', pStats.passiveRevelationCombatDamageMorePct)}% 증폭`;
    } else if (devotion > 0 && pStats.passiveRevelation === 'guard') {
        revelationEffect += `, 받는 피해 ${formatValue('devotion', pStats.passiveRevelationGuardTakenLessPct)}% 감폭`;
    } else if (devotion > 0 && pStats.passiveRevelation === 'life') {
        revelationEffect += `, 생명력/보호막/재생 +${formatValue('regen', pStats.passiveRevelationLifeBonusPct)}%`;
    } else if (devotion > 0 && pStats.passiveRevelation === 'fanaticism') {
        revelationEffect += `, 열광 ${Math.floor(pStats.passiveFanaticismStacks)}/${Math.floor(devotion)}`;
    }
    setTextById('ui-revelation', revelationLabel);
    setTextById('ui-revelation-effect', revelationEffect);
};

/** 장비창의 요약, 가방 머리, 새 아이템 표시(js/equipment-window-ui.js, 2026-10-10 개편: 옵션 티어와 품질은 뺐다). */
function renderEquipmentLoadoutSummary(pStats) {
    equipmentWindowUi.render(pStats);
}

function updateInventoryFullWarnings() {
    let changed = false;
    // 장비 인벤토리가 가득 차면 켜고, 몇 칸인지는 툴팁으로 알린다(주얼 보관함은 장비창의 단추가 알린다).
    let warnings = [
        ['inventory-full-warning', [['장비', getInventoryUsedCellCount(game), getInventoryLimit(game)]]]
    ];
    warnings.forEach(([id, sources]) => {
        let element = document.getElementById(id);
        if (!element) return;
        let full = sources.filter(([, used, limit]) => used >= limit);
        let nextDisplay = full.length ? 'inline-block' : 'none';
        if (element.style.display !== nextDisplay) changed = true;
        element.style.display = nextDisplay;
        element.title = full.map(([label, used, limit]) => `${label} ${used}/${limit}칸`).join(', ');
        if (element.title) element.title += ', 공간을 확보하세요';
    });
    if (changed && document.body.classList.contains('desktop-windowed-ui') && typeof syncDesktopRailGroups === 'function') {
        syncDesktopRailGroups();
    }
}

function getEquipmentSearchStatText(stat, resolveName) {
    const value = stat || {};
    const name = value.statName || (resolveName ? getStatName(value.id || '') : '');
    return `${value.id || ''} ${name || ''}`;
}

function getEquipmentSearchText(item) {
    const base = (item.baseStats || []).map(stat => getEquipmentSearchStatText(stat, false)).join(' ');
    const stats = (item.stats || []).map(stat => getEquipmentSearchStatText(stat, true)).join(' ');
    const under = item.underEnchant ? `${getEquipmentSearchStatText(item.underEnchant, true)} ${item.underEnchant.val || ''}` : '';
    return `${item.name || ''} ${item.slot || ''} ${getWeaponCategoryName(item)} ${item.rarity || ''} ${base} ${stats} ${under}`;
}
function getSearchTokens(query) {
    return String(query || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
}

function matchSearchQuery(raw, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return true;
    const text = String(raw || '').toLowerCase();
    return q.split(/\s+/).filter(Boolean).every(token => text.includes(token));
}

/** 고를 것이 하나뿐인 하위 탭 줄(초반 '장비 창'만 있는 장비 창 등)은 숨긴다 — 한 줄을 차지만 했다(검토 4차). */
function syncSingleSubtabRows() {
    document.querySelectorAll('.tab-content .subtab-row:not(.merged-tab-subtabs)').forEach(row => {
        const open = [...row.children].filter(button => !button.hasAttribute('data-content-locked') && !button.hidden && button.style.display !== 'none');
        row.hidden = open.length < 2;
    });
}

function performUpdateStaticUI() {
    craftingWorkspaceState.capture(game);
    updateInventoryFullWarnings();
    announceMapPrimaryContentUnlocks();
    syncMapPrimaryContentTabs();
    syncSingleSubtabRows();
    // 진단용 단계별 타이밍. 한 번의 갱신이 150ms를 넘으면(또는 window.__perfLog가 켜져
    // 있으면) 어느 단계가 느린지 콘솔에 한 줄 남긴다. 정상 갱신에는 거의 영향이 없다.
    const __perfNow = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
    const __pm = [['start', __perfNow()]];
    const __mark = (n) => __pm.push([n, __perfNow()]);

    tryUnlockMeteorContentByProgress();
    // 목표 선정은 js/goal-system.js가 담당한다(디바운스 포함).
    if (typeof requestGoalSystemRefresh === 'function') requestGoalSystemRefresh();
    validateItemTooltipAnchor();
    applySeasonContentProgression({ silent: false });
    refreshTabHeaderUiIfNeeded();
    let passiveStateSig = [
        game.passivePoints || 0,
        (game.passives || []).length,
        (game.discoveredPassives || []).length,
        game.startNode || '',
        game.ascendClass || '',
        game.season || 1
    ].join('|');
    if (passiveStateSig !== lastReachableSignature) {
        lastReachableSignature = passiveStateSig;
        calculateReachableNodes();
        refreshPassiveVisibility();
    }
    // 한 번 계산한 스탯을 보조 젬 정리에 그대로 넘긴다. 정리가 실제로 젬을 내렸을 때만
    // (한도가 줄어든 드문 프레임) 다시 계산한다.
    // 폴백 스탯(아직 전투 모듈이 준비되지 않은 초기 부팅)은 suppCap이 0이라 넘기면 안 된다.
    // 넘기면 부팅 한 프레임 만에 장착한 보조 젬이 전부 해제된다.
    let pStats = getUiPlayerStats();
    if (normalizeSupportLoadout(true, pStats.__uiFallbackStats ? null : pStats)) pStats = getUiPlayerStats();
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
    if (typeof hotkeysUi !== 'undefined') hotkeysUi.sync();
    let loopReadyBanner = document.getElementById('loop-ready-banner');
    if (loopReadyBanner) loopReadyBanner.classList.toggle('active', !!game.pendingLoopReady);
    let combatLoopBtn = document.getElementById('btn-combat-loop-advance');
    if (combatLoopBtn) combatLoopBtn.style.display = canShowCombatLoopAdvanceButton() ? 'inline-flex' : 'none';
    let charTabActive = getRenderingUiTabIds().has('tab-char');
    if (charTabActive) {
        let drawNow = Date.now();
        if (shouldRedrawPassiveTree(drawNow)) {
            resizePassiveTreeCanvas(false);
            drawPassiveTree();
            lastPassiveTreeDrawAt = drawNow;
        }
    }
    __mark('tree');

    TAB_HEADER_NOTI_KEYS.forEach(key => { let el=document.getElementById('noti-' + key); if(!el) return; el.style.display = (game.noti[key] && isNotiEnabled(key)) ? 'block' : 'none'; });
    TAB_UNLOCK_BUTTON_KEYS.forEach(syncTabUnlockButton);
    let battleBtn = document.getElementById('btn-tab-battle');
    if (battleBtn) battleBtn.style.display = isMobilePrimaryNavigationEnabled() ? 'flex' : 'none';
    syncMergedTabLauncherVisibility();
    // 매 프레임 해금 판정으로 재노출된 탭에 2단 그룹 필터를 다시 적용한다.
    if (typeof hideOutOfGroupTabButtons === 'function') hideOutOfGroupTabButtons();
    let summarySkillTreeBtn = document.getElementById('btn-summary-tab-char');
    if (summarySkillTreeBtn) {
        summarySkillTreeBtn.disabled = !game.unlocks.char;
        summarySkillTreeBtn.innerText = game.unlocks.char ? '스킬트리' : '스킬트리 (Lv.2)';
    }
    let activeTabId = getActiveUiTabId();
    // 포커스된 화면 하나가 아니라 "지금 보이는 화면 전부"를 그린다.
    let renderingTabIds = getRenderingUiTabIds();
    let isTabRendering = tabId => renderingTabIds.has(tabId);
    // 열려 있는 최상위 화면이 그 사이 다시 잠겼는지(루프 정산 등)를 먼저 본다.
    // 병합 런처(기록 등)는 TAB_UNLOCK_GATES에 없으므로 게이트 검사만으로는 걸러지지 않는다.
    let activeHostId = (getActiveTopLevelTabElement() || {}).id || '';
    closeRelockedTabSurfaces();
    let activeGate = activeTabId ? TAB_UNLOCK_GATES[activeTabId] : null;
    // 잠긴 화면을 정리하고 나면 활성 탭이 하나도 남지 않을 수 있다(pendingRelockedTabFallback).
    // 그대로 두면 어떤 탭도 렌더되지 않는 빈 화면이 되므로 안전한 탭으로 되돌린다.
    if ((activeGate && !game.unlocks[activeGate]) || pendingRelockedTabFallback || (activeHostId && !isTabSurfaceAvailable(activeHostId))) {
        pendingRelockedTabFallback = false;
        switchTab('tab-character');
        return;
    }

    // 보이지 않는 탭의 무거운 패널(인벤토리/주얼/부적)을 매 갱신마다 innerHTML로
    // 재구성하면 탭 전환·주기적 갱신마다 큰 렉이 발생한다. 활성 탭의 패널만 재구성한다.
    // (탭 전환 시 switchTab이 updateStaticUI를 다시 호출하므로 진입 시 정상 갱신된다.)
    let itemsTabActive = isTabRendering('tab-items');
    const sf = getSearchFilterState();
    document.getElementById('ui-passive-points').innerText = game.passivePoints;
    if (isTabRendering('tab-char')) renderPassiveInvestmentSummary();
    document.getElementById('ui-season-text-tab').innerText = game.season;
    document.getElementById('ui-season-pts').innerText = game.seasonPoints;
    document.getElementById('ui-ascend-pts').innerText = game.ascendPoints;
    if (isTabRendering('tab-character')) {
        renderCharacterEhpSummary(pStats);
        renderCharacterPassiveSpecialStats(pStats);
    }

    if (itemsTabActive) {
    syncSalvageControlsFromSettings();
    if (typeof salvageRecoveryUi !== 'undefined') salvageRecoveryUi.refreshShortcut();
    syncEquipmentMobilePane();
    renderEquipmentLoadoutSummary(pStats);
    if (window.equipmentLoadoutUi) window.equipmentLoadoutUi.render();
    renderPaperdoll('ui-equip-list', false);
    renderCraftTargetLibrary(isItemRarityVisible);
    let invRarityFilterHost = document.getElementById('ui-inventory-rarity-filter');
    if (invRarityFilterHost) invRarityFilterHost.innerHTML = renderRarityFilterChips('inventory');
    if (window.equipmentTriage) {
        window.equipmentTriage.autoStart();
        window.equipmentTriage.render();
    }
    const equipInvRows = getSortedEquipmentInventoryRows(sf.equip);
    const equipmentGridLayout = equipmentInventoryGridRuntime.ensureState(game);
    const equipmentPage = equipmentInventoryInteraction.renderPageControls(equipmentGridLayout, equipInvRows, sf.equip);
    const equipmentPageLayout = equipmentInventoryGridRuntime.getPageLayout(equipmentGridLayout, equipmentPage);
    const equipmentPageKeys = new Set(equipmentPageLayout.entries.map(entry => entry.key));
    const equipmentPageRows = equipInvRows.filter(row => equipmentPageKeys.has(equipmentInventoryGridRuntime.getItemKey(row.item)));
    renderEquipmentInventoryInspector(equipmentPageRows);
    // 드래그 중에는 포인터 캡처 중인 DOM을 유지하고, 놓을 때 배치를 갱신한다.
    if (!equipmentInventoryInteraction.isCarrying()) {
        renderSearchSection('ui-inventory-list', 'equip', '장비 검색 (이름/슬롯/옵션)', renderEquipmentInventoryGrid(equipmentPageLayout, equipmentPageRows), '', '');
        let equipmentGridElement = document.querySelector('#ui-inventory-list > .search-result-list');
        if (equipmentGridElement) equipmentGridElement.dataset.equipmentGridRows = String(equipmentPageLayout.rows);
    }
    }

function getJewelStatToneColor(statId) {
    if (!statId) return '#d7e9ff';
    if (['firePctDmg', 'resF', 'igniteChance'].includes(statId)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance'].includes(statId)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance'].includes(statId)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'].includes(statId)) return '#c7a6ff';
    if (['armor', 'armorPct', 'dr'].includes(statId)) return '#ffd2a6';
    if (['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce'].includes(statId)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(statId)) return '#8fdcff';
    if (['flatHp', 'pctHp', 'regen'].includes(statId)) return '#ffb3b3';
    if (['crit', 'critDmg'].includes(statId)) return '#ffd6f2';
    if (['aspd', 'move'].includes(statId)) return '#fff3a8';
    return '#d7e9ff';
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

function getInventoryRarityFilterKeys() { return ['normal', 'magic', 'rare', 'unique']; }
function getInventoryRarityFilterLabels() { return ITEM_RARITY_LABELS; }
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
    return equipmentLootUi.renderPanel(renderAutoSalvageRarityChips());
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
    if (statusEl) { statusEl.innerText = `현재: ${enabled ? '켜짐' : '꺼짐'}`; statusEl.style.color = enabled ? '#2ecc71' : 'var(--copy-bright)'; }
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
function isGemLibraryMatchVisible(searchable, query, foldInactive, isActive) {
    if (!matchSearchQuery(searchable, query)) return false;
    return !foldInactive || !!String(query || '').trim() || !!isActive;
}
function getGemSearchText(name, definition) {
    let def = definition || {};
    let tags = Array.isArray(def.tags) ? def.tags : [];
    let localizedTags = tags.map(tag => translateSkillTag(tag));
    let statIds = Array.isArray(def.stats)
        ? def.stats.map(stat => stat.id || stat.stat || '').filter(Boolean)
        : [];
    if (def.stat) statIds.push(def.stat);
    let statNames = statIds.map(statId => getStatName(statId));
    return [name, def.name || '', tags.join(' '), localizedTags.join(' '), def.desc || '',
        def.type || '', def.ele || '', def.targetMode || '', statIds.join(' '), statNames.join(' ')].join(' ');
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
        const hay = `${item.name || ''} ${item.slot || ''} ${getWeaponCategoryName(item)} ${item.rarity || ''} ${(item.baseStats||[]).map(s => `${s&&s.id||''} ${s&&s.statName||''}`).join(' ')} ${(item.stats || []).map(s2 => `${s2&&s2.id||''} ${s2&&s2.statName||getStatName((s2&&s2.id)||'')||''}`).join(' ')} ${underEnchantHay}`;
        const matched = matchSearchQuery(hay, sf.equip);
        return shouldBulkSalvageBySearch(matched, !!salvageUnmatched) && !isBulkSalvageProtectedItem(item);
    });
    const targetCount = targetItems.length;
    if (targetCount <= 0) return addLog('해체 대상이 없습니다.', 'attack-monster');
    if (!await requestGameConfirmation(`검색 조건에 해당하는 장비 ${targetCount}개를 해체합니다.\n잠금/장비 세팅으로 보호된 장비는 제외됩니다.`, {
        title: '검색 장비 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targetCount}개 해체`
    })) return;
    const targetSet = new Set(targetItems);
    let rewards = {};
    (game.inventory || []).forEach(item => {
        if (!item) return;
        if (!targetSet.has(item)) return survivors.push(item);
        if (isBulkSalvageProtectedItem(item)) { lockedSkipped++; return survivors.push(item); }
        if (typeof mergeSalvageRewards === 'function') mergeSalvageRewards(rewards, salvageItemObject(item, true));
        else salvageItemObject(item, true);
        removed++;
    });
    game.inventory = survivors;
    let rewardText = typeof formatSalvageRewardSummary === 'function' ? `, ${formatSalvageRewardSummary(rewards)}` : '';
    addLog(`🧪 장비 ${removed}개 해체 완료${rewardText}${lockedSkipped > 0 ? ` (잠금/배치/세팅 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}

function getCurrencyIconHtml(orbKey, className = 'currency-icon') {
    let icon = pixelIconPath(ORB_DB[orbKey] && ORB_DB[orbKey].icon);
    return icon ? `<img class="${className}" src="${icon}" alt="" aria-hidden="true">` : '';
}

/** A currency name in its colour (orb-tone): the woodsman's lettering for ouroboros, the plain name for the rest. */
function getStyledOrbName(orbKey) {
    let name = getCurrencyInfo(orbKey).name;
    if (orbKey === 'ouroboros') return `<span class="woodsman-touch-name">${name}</span>`;
    const tones = {
        magicBud: '--orb-tone:#9fd3ff;', sapBud: '--orb-tone:#ffe07a;', blightSpore: '--orb-tone:#ffe07a;', blessing: '--orb-tone:#ffe07a;',
        formlessDew: '--orb-tone:#ffbc8a;', pruningShears: '--orb-tone:#ffbc8a;',
        goldenRule: '--orb-tone:#ffffff; border:1px solid #7a1f1f; border-radius:4px; padding:0 4px; background:#0f1116;',
        emberBranch: '--orb-tone:#8a2f3f;', burningEmberBranch: '--orb-tone:#ff8a3d; text-shadow:0 0 7px rgba(255,138,61,.45);',
        fairyRing: '--orb-tone:#82dc8b; text-shadow:0 0 7px rgba(105,238,143,.35);', voidChisel: '--orb-tone:#d7a6ff; text-shadow:0 0 7px rgba(192,125,255,.4);'
    };
    const tone = Object.hasOwn(tones, orbKey) ? tones[orbKey] : '';
    return tone ? `<span class="orb-tone" style="${tone}">${name}</span>` : name;
}

/** 우주계 쌍둥이 주얼의 배정 키스톤 줄: 이름과 그 키스톤의 전직(쌍둥이 키스톤은 전직과 상관없이 켜진다), 할당 여부. */
function getCosmosKeystoneTooltipLine(jewel) {
    if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return '';
    const id = jewel.cosmosKeystone;
    const ksName = typeof getAscendKeystoneName === 'function' ? getAscendKeystoneName(id) : id;
    const owner = typeof getAscendKeystoneOwnerClass === 'function' ? getAscendKeystoneOwnerClass(id) : null;
    const ascName = owner && CLASS_TEMPLATES[owner] ? `(${CLASS_TEMPLATES[owner].name})` : '';
    const active = Array.isArray(game.cosmosTwinKeystones) && game.cosmosTwinKeystones.includes(id);
    return `<div class="tooltip-line" style="color:${active ? '#8fe7b0' : '#ffd68a'};">🔯 배정 키스톤: ${escapeHTML(ksName)}${ascName}${active ? ', 할당 중' : ', 짝 주얼의 키스톤과 같으면 할당'}</div>`;
}

const createJewelRangeTooltipHtml = function createJewelRangeTooltipHtml(jewel) {
    if (!jewel) return '<div class="tooltip-title">주얼</div><div class="tooltip-line">정보 없음</div>';
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
        let petiteLabel = petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : '';
        let waxLabel = stat.waxBonus ? '<span style="color:#ffd98a;">밀랍 </span>' : '';
        let tone = getJewelStatToneColor(stat.id);
        return `<div class="tooltip-line"><span style="color:${tone};">${waxLabel}${petiteLabel}${getStatName(stat.id)}: +${formatJewelStatValue(stat.id, stat.val)}${tier}</span> <span style="color:var(--copy-bright);">(고정 범위 ${min}~${max})</span></div>`;
    }).join('');
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:var(--copy-bright);">옵션 평균 티어: T${tierSummary.toFixed(1)}</div>` : '';
    let fixedTierLine = jewel.rarity === 'unique' ? `<div class="tooltip-line" style="color:#bca7dc;">고유 고정 옵션, 티어 평가 제외</div>` : '';
    let uniqueLine = jewel.rarity === 'unique' && jewel.uniqueEffect ? `<div class="tooltip-line" style="color:#d7b8ff;">✨ 고유 효과: ${escapeHTML(jewel.uniqueEffect)}</div>` : '';
    let keystoneLine = getCosmosKeystoneTooltipLine(jewel);
    let main = `<div class="tooltip-title">${escapeHTML(jewel.name || '주얼')}</div>${uniqueLine}${keystoneLine}${fixedTierLine}${tierLine}${lines || '<div class="tooltip-line">옵션 정보 없음</div>'}`;
    return main;
};



function getCraftActionValidators(item) {
    let hasHoneyLocked = (item.stats || []).some(v => v.lockedByHoney);
    return {
        honey: !!item && (game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
        stinger: !!item && (game.currencies.venomStinger || 0) > 0 && item.slot === '무기',
        baseUpgrade: !!item,
        voidSocket: !!item && equipmentSockets.canChisel(item)
    };
}

function getCraftOrbUseState(key, item) {
    if (!item) return { enabled: false, reason: '아이템 미선택' };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '재화 부족' };
    let actionKey = equipmentCrafting.resolveAction(key, item.rarity);
    if (item.corrupted && actionKey !== 'tainted') return { enabled: false, reason: '타락 아이템은 일반 제작 불가' };
    if (item.fusedRelic && !['divine', 'tainted', 'blessing'].includes(actionKey)) return { enabled: false, reason: '융합 유물: 황금률/잿불가지/축복만 사용 가능' };
    let ok = false;
    if (actionKey === 'transmute') ok = item.rarity === 'normal';
    else if (actionKey === 'augment') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 2;
    else if (actionKey === 'alteration') ok = item.rarity === 'magic';
    else if (actionKey === 'alchemy') ok = item.rarity === 'normal';
    else if (actionKey === 'exalted') ok = item.rarity === 'rare' && getItemExplicitOptionCount(item) < EXPLICIT_AFFIX_LINE_CAP;
    else if (actionKey === 'regal') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < EXPLICIT_AFFIX_LINE_CAP;
    else if (actionKey === 'chaos') ok = item.rarity === 'rare';
    else if (actionKey === 'divine') ok = item.rarity !== 'normal';
    else if (actionKey === 'chance') ok = item.rarity === 'normal';
    else if (actionKey === 'annulment') ok = Array.isArray(item.stats) && item.stats.some(stat => stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
    else if (actionKey === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (actionKey === 'tainted') ok = !item.corrupted || (typeof isKaleidoscopeShieldItem === 'function' && isKaleidoscopeShieldItem(item) && getItemExplicitOptionCount(item) <= EXPLICIT_AFFIX_LINE_CAP);
    else if (key === 'blessing') ok = Array.isArray(item.baseStats) && item.baseStats.length > 0;
    else if (key === 'abyssCatalyst') ok = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
    if (!ok) return { enabled: false, reason: '현재 아이템 조건 불일치' };
    let sporeMode = isSporeCraftEquipment(item) ? (game.sporeCraftModes[key] || 'none') : 'none';
    const sporeBlock = getSporeCraftBlockReason(item, actionKey, sporeMode);
    if (sporeBlock) return { enabled: false, reason: sporeBlock };
    if (['magicBud','sapBud','formlessDew'].includes(key)
        && typeof isSporeCraftEquipment === 'function'
        && isSporeCraftEquipment(item)
        && sporeMode !== 'none'
        && typeof hasSporeCraftCost === 'function'
        && !hasSporeCraftCost(sporeMode)) {
        let cost = typeof getSporeCraftCost === 'function' ? getSporeCraftCost() : 10;
        let costText = (sporeMode === 'chaos' || sporeMode === 'damage')
            ? `화염/냉기/번개 홀씨 각 ${cost}개 필요`
            : `${({ fire: '화염', cold: '냉기', light: '번개' })[sporeMode] || '선택'} 홀씨 ${cost}개 필요`;
        return { enabled: false, reason: `홀씨 부족, ${costText}` };
    }
    return { enabled: ok, reason: ok ? '사용 가능' : '현재 아이템 조건 불일치' };
}

// 시간의 균열 패널: 시간압 선택 → 과거 진입 → 제단 배치 → 미래 진입.
function renderTimeRiftPanel() {
    const host = document.getElementById('ui-timerift-panel');
    if (!host) return;
    document.getElementById('ui-timerift-header').style.display = 'block';
    host.style.display = 'block';
    sideEncounterUi.timeRiftPanel(host, ensureTimeRiftState());
}

function sporeModeDialogBody(modeOptions, cur, sporeCost, advancedSpores) {
    let buttons = modeOptions.map(opt => `<button type="button" class="selection-overlay-option${cur === opt.id ? ' selected' : ''}" data-spore-mode="${opt.id}">${opt.label}${cur === opt.id ? ' ✓' : ''}</button>`).join('');
    return `<div class="selection-overlay-help">오브 사용 시 적용할 홀씨 태그를 고르세요. 단일 속성은 ${sporeCost}개, 카오스/피해는 세 속성 홀씨를 각각 ${sporeCost}개 사용합니다.${advancedSpores ? '' : ' 카오스/피해 태그는 ‘해금’의 고급 홀씨가 엽니다.'}</div>`
        + `<div class="selection-overlay-help spore-balance">보유: 화염 ${game.currencies.sporeFire || 0}, 냉기 ${game.currencies.sporeCold || 0}, 번개 ${game.currencies.sporeLight || 0}</div>`
        + `<div class="selection-overlay-grid spore-mode-grid">${buttons}</div>`;
}

function openSporeModeOverlay(currencyKey) {
    let allowed = ['magicBud','sapBud','formlessDew'];
    if (!allowed.includes(currencyKey)) return;
    let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
    if (item && typeof isSporeCraftEquipment === 'function' && !isSporeCraftEquipment(item)) {
        if (typeof addLog === 'function') addLog('홀씨 태그 제련은 장비에만 사용할 수 있습니다.', 'attack-monster');
        return;
    }
    let modeOptions = [
        { id: 'none', label: '미사용' },
        { id: 'fire', label: '화염' },
        { id: 'cold', label: '냉기' },
        { id: 'light', label: '번개' },
        { id: 'chaos', label: '카오스', advanced: true },
        { id: 'damage', label: '피해', advanced: true }
    ];
    let advancedSpores = contentProgression.isUnlocked('advancedSpores');
    modeOptions = modeOptions.filter(opt => !opt.advanced || advancedSpores);
    game.sporeCraftModes = game.sporeCraftModes || {};
    let cur = game.sporeCraftModes[currencyKey] || 'none';
    let sporeCost = typeof getSporeCraftCost === 'function' ? getSporeCraftCost() : 10;
    if (!modeOptions.some(opt => opt.id === cur)) cur = 'none';
    let panel = selectionDialog.show({ id: 'spore-mode-overlay', title: '홀씨 모드 선택', panelClass: 'spore-picker-panel', body: sporeModeDialogBody(modeOptions, cur, sporeCost, advancedSpores) });
    panel.querySelector('.spore-mode-grid').onclick = event => {
        let button = event.target.closest('[data-spore-mode]');
        if (!button) return;
        game.sporeCraftModes[currencyKey] = button.dataset.sporeMode;
        updateStaticUI();
        selectionDialog.close('spore-mode-overlay');
    };
}
window.openSporeModeOverlay = openSporeModeOverlay;

function showCurrencyCardTooltip(event, key, reason) {
    let orb = ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title currency-tooltip-title">${getCurrencyIconHtml(key, 'currency-tooltip-icon')}<span>${orb.name}</span></div><div class="tooltip-line">${orb.desc || ''}</div><div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">상태: ${reason || '-'}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#f1c40f');
}
window.showCurrencyCardTooltip = showCurrencyCardTooltip;
window.showOrbTooltip = showCurrencyCardTooltip;


const MOBILE_CRAFT_ORB_KEYS = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'fairyRing', 'pruningShears', 'blightSpore', 'emberBranch', 'blessing', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst'];

function getMobileCraftCurrencyUseState(key, item) {
    if (!key || !ORB_DB[key]) return { enabled: false, reason: '재화를 선택하세요.' };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: '보유량 없음' };
    if (!item) return { enabled: false, reason: '아이템을 선택하세요.' };
    if (item.fusedRelic || item.corrupted) return getCraftOrbUseState(key, item);
    if (key === 'enchantedHoney') {
        let v = getCraftActionValidators(item);
        return { enabled: !!v.honey, reason: v.honey ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'venomStinger') {
        let v = getCraftActionValidators(item);
        return { enabled: !!v.stinger, reason: v.stinger ? '사용 가능' : '현재 아이템 조건 불일치' };
    }
    if (key === 'voidChisel') {
        let enabled = equipmentSockets.canChisel(item);
        return { enabled: enabled, reason: enabled ? '사용 가능' : '소켓이 이미 있거나 뚫을 수 없는 장비' };
    }
    if (MOBILE_CRAFT_ORB_KEYS.includes(key)) {
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

function buildSporeSummaryHtml() {
    const item = getSelectedCraftItem();
    const targetDisabled = !item || !isSporeCraftEquipment(item);
    const advanced = contentProgression.isUnlocked('advancedSpores');
    const riftBlock = item ? equipmentCrafting.getBlockReason(item, 'fossil') : '';
    return `<div class="craft-spores">
            <div class="craft-spores-title">홀씨 보유량</div>
            <div style="display:grid; grid-template-columns:repeat(3, minmax(0,1fr)); gap:6px;">
                <div class="orb-tone" style="padding:5px; border:1px solid #6b3a3a; border-radius:8px; --orb-tone:#ff9f9f; font-size:12px;">화염 홀씨<br><strong>x ${game.currencies.sporeFire || 0}</strong></div>
                <div class="orb-tone" style="padding:5px; border:1px solid #3a5a7a; border-radius:8px; --orb-tone:#9fd6ff; font-size:12px;">냉기 홀씨<br><strong>x ${game.currencies.sporeCold || 0}</strong></div>
                <div class="orb-tone" style="padding:5px; border:1px solid #7a6a2a; border-radius:8px; --orb-tone:#ffe08a; font-size:12px;">번개 홀씨<br><strong>x ${game.currencies.sporeLight || 0}</strong></div>
            </div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'corrupt')" onmousemove="showSporeCraftTooltip(event,'corrupt')" onmouseleave="hideInfoTooltip()" onclick="applyCorruptSporeToSelectedItem()" ${targetDisabled || !advanced ? 'disabled' : ''}>부패 홀씨 (각 8)</button>
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'rift')" onmousemove="showSporeCraftTooltip(event,'rift')" onmouseleave="hideInfoTooltip()" onclick="applyRiftSporeToSelectedItem()" ${targetDisabled || !advanced || riftBlock ? 'disabled' : ''}>균열 홀씨 (화석1+각5)</button>
            </div>
        </div>`;
}


/** 제작실 첫 화면: 착용 장비 칸(누르면 그 장비가 대상)과 인벤토리에서 고르기. */
function getCraftEmptyStateHtml() {
    return `<div class="cl-empty-head"><strong>제작할 장비를 고르세요</strong><button type="button" onclick="openCraftItemPickerOverlay('inventory')">인벤토리에서 고르기</button></div>${getCraftPickerBodyHtml('equip')}`;
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
    return rows.map(row => `<div class="craft-picker-stat" style="color:var(--copy-bright); font-size:12px; margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(row)}</div>`).join('');
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
        <div class="item-title ${rarity}" style="font-size:12px;">[${escapeHTML(getItemSlotDisplayLabel(item, slotLabel))}] ${escapeHTML(item.name || '장비')}${exceptionalStars}${sourceBadge}${item.encroached ? ' <span style="color:#b084ff;">(잠식)</span>' : ''}${item.locked ? ' 🔒' : ''}</div>
        <div class="item-base-line" style="font-size:12px;">${escapeHTML(item.baseName || '')}</div>
        ${getCraftPickerItemLines(item)}
    </button>`;
}

function getCraftPickerBodyHtml(kind, browse = {}) {
    let isEquip = kind === 'equip';
    let currentRef = getCraftSelectionRef();
    let currentIsEquip = isCraftSelectionEquip();
    if (isEquip) {
        let slots = ['무기', '투구', '목걸이', '장갑1', '갑옷', '방패', '반지1', '허리띠', '반지2', '신발', '장갑2'];
        return `<div class="paperdoll craft-picker-equip-grid">${slots.map(slot => {
            let item = game.equipment && game.equipment[slot];
            let slotClass = `slot-box slot-${slot}`;
            if (!item) return `<button type="button" class="craft-picker-card ${slotClass} empty" disabled><div style="font-weight:800;">[${slot.replace(/[12]/, '')}]</div><div style="color:var(--copy-muted); margin-top:5px;">비어있음</div></button>`;
            return getCraftPickerCardHtml(item, {
                slotLabel: slot,
                selected: currentIsEquip && currentRef === slot,
                onclick: `selectCraftPickerEquipment('${slot}')`,
                extraClass: slotClass,
                tooltip: `onmouseenter="showItemTooltip(event, '${slot}', true)" onmousemove="showItemTooltip(event, '${slot}', true)" onmouseleave="hideItemTooltip()"`
            });
        }).join('')}</div>`;
    }
    return renderCraftPickerInventory(currentRef, currentIsEquip, { ...browse, kind });
}

function renderCraftPickerPages(page, pages, count) {
    return `<nav class="craft-picker-pages" aria-label="제작 대상 페이지"><button type="button" data-craft-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>이전</button><span>${page + 1} / ${pages}, ${count}개</span><button type="button" data-craft-page="${page + 1}" ${page === pages - 1 ? 'disabled' : ''}>다음</button></nav>`;
}

function renderCraftPickerInventory(currentRef, currentIsEquip, browse) {
    let totalInv = (game.inventory || []).length;
    const mobile = uiDisplay.matches('(max-width: 1080px)');
    const plain = game.inventory.filter(item => !bagItems.isSpecial(item)); // 주얼, 코어, 액막이는 제작 대상이 아니다
    const candidates = browse.kind === 'altar' ? plain.filter(item => !getTimeAltarItemIssue(item)) : plain;
    const matching = candidates.filter(item => item && isItemRarityVisible(item) && matchSearchQuery(getEquipmentSearchText(item), browse.query));
    const pages = Math.max(1, Math.ceil(matching.length / 6));
    const page = Math.min(browse.page || 0, pages - 1);
    const visible = mobile ? matching.slice(page * 6, page * 6 + 6) : matching;
    let rows = visible.map(item => getCraftPickerCardHtml(item, {
        selected: !currentIsEquip && currentRef === item.id,
        onclick: `selectCraftPickerInventoryItem(${item.id})`,
        tooltip: `onmouseenter="showItemTooltip(event, ${game.inventory.indexOf(item)}, false)" onmouseleave="hideItemTooltip()"`
    })).join('');
    const navigation = mobile ? renderCraftPickerPages(page, pages, matching.length) : '';
    return navigation + (rows
        ? `<div class="craft-picker-grid">${rows}</div>`
        : `<div class="deathlog-empty">${totalInv > 0 ? '검색/등급 조건에 맞는 장비가 없습니다.' : '인벤토리에 제작할 장비가 없습니다.'}</div>`);
}

function refreshCraftItemPickerOverlay() {
    let overlay = document.getElementById('craft-item-picker-overlay');
    if (!overlay || !window.__craftPickerKind) return;
    let filterEl = overlay.querySelector('.craft-picker-filter');
    if (filterEl) filterEl.innerHTML = `<span class="inventory-view-filter-label">표시</span>${renderRarityFilterChips('picker')}`;
    let bodyEl = overlay.querySelector('.craft-picker-body');
    if (bodyEl) bodyEl.innerHTML = getCraftPickerBodyHtml(window.__craftPickerKind, {query: overlay.querySelector('[name="craftSearch"]')?.value || '', page: Number(overlay.dataset.page) || 0});
}

function openCraftItemPickerOverlay(kind) {
    closeCraftItemPickerOverlay();
    let isEquip = kind === 'equip';
    window.__craftPickerKind = kind;
    let overlay = document.createElement('div');
    overlay.id = 'craft-item-picker-overlay';
    overlay.className = 'craft-picker-overlay';
    overlay.onclick = event => {
        if (event.target === overlay) closeCraftItemPickerOverlay();
        const button = event.target.closest('[data-craft-page]');
        if (!button) return;
        overlay.dataset.page = button.dataset.craftPage; refreshCraftItemPickerOverlay();
    };
    overlay.onsubmit = event => { event.preventDefault(); overlay.dataset.page = '0'; refreshCraftItemPickerOverlay(); };
    let bodyHtml = getCraftPickerBodyHtml(kind);
    let filterRowHtml = isEquip ? '' : `<div class="craft-picker-filter"><span class="inventory-view-filter-label">표시</span>${renderRarityFilterChips('picker')}</div>`;
    overlay.innerHTML = `<div class="craft-picker-panel"><div class="craft-picker-head"><div><div class="craft-picker-title">${isEquip ? '장착 장비에서 제작 대상 선택' : '인벤토리에서 제작 대상 선택'}</div><div class="craft-picker-desc">카드를 클릭하면 제작실 대상 장비로 바로 선택됩니다.</div></div><button type="button" onclick="closeCraftItemPickerOverlay()">닫기</button></div>${filterRowHtml}<div class="craft-picker-body">${bodyHtml}</div></div>`;
    if (kind === 'altar') {
        overlay.querySelector('.craft-picker-title').textContent = '제단 장비 선택';
        overlay.querySelector('.craft-picker-desc').textContent = '제단에 올릴 수 있는 장비만 표시됩니다. 선택 후 제단에 올리세요.';
    }
    if (!isEquip && uiDisplay.matches('(max-width: 1080px)')) overlay.querySelector('.craft-picker-head').insertAdjacentHTML('afterend', '<form class="craft-picker-search"><input name="craftSearch" type="search" aria-label="제작 장비 이름/부위/옵션 검색" placeholder="이름/부위/옵션 검색"><button type="submit">검색</button></form>');
    document.body.appendChild(overlay);
}

function exposeUiRenderHelpersOnce() {
    if (window.__uiRenderHelperGlobalsExposed) return;
    let helpers = {
        getStyledOrbName,
        getItemStatToneColor,
        // Alternate crafting views reuse the same admission rules as the live currency buttons.
        getCraftOrbUseState,
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
        openCraftItemPickerOverlay,
        closeCraftItemPickerOverlay,
        craftSelectInventoryItemById,
        selectCraftPickerEquipment,
        selectCraftPickerInventoryItem,
        // The exploration inventory uses the same read-only jewel detail renderer.
        createJewelRangeTooltipHtml,
        openUnderworldRuneOverlay,
        openUnderworldRuneUpgradeOverlay,
        closeUnderworldRuneOverlay,
        equipUnderworldRuneToSlot,
        unequipUnderworldRuneSlot,
        showUnderworldRuneTooltip,
        showCombatLogItemTooltip,
        openCombatLogItemEquipment,
        hideCombatLogItemTooltip,
        showPlayerExperienceTooltip,
        showPlayerRuntimeEffectTooltip,
        showPlayerNamedEffectTooltip,
        showPlayerCosmosDebuffTooltip,
        isItemRarityVisible,
        matchSearchQuery,
        // 스킬 젬 화면(js/skills-ui.js)이 젬 목록 검색/강조에 그대로 재사용한다.
        // 이 헬퍼들은 performUpdateStaticUI 안에 중첩 선언되어 있어 전역이 아니다.
        // 화면을 파일로 분리할 때마다 여기서 함께 열어 준다(중첩 선언을 최상위로
        // 끌어올리는 정리는 별도 변경으로 한다 — 78개가 같은 상태다).
        getGemSearchText,
        isGemLibraryMatchVisible,
        highlightSearchText
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


function buildCraftActionButtons(item) {
    let v = getCraftActionValidators(item);
    let defs = [
        { key:'baseUpgrade', label:'베이스 업그레이드', onclick:'upgradeSelectedItemBase()' }
    ];
    return defs.map(d => `<button onclick="${d.onclick}" ${v[d.key] ? '' : 'disabled'}>${d.label}</button>`).join('');
}

    if (itemsTabActive) {
        let selectedItem=getSelectedCraftItem(), details='';
        if(selectedItem){
        let equipSelectedButtonHtml = isCraftSelectionEquip() ? '' : `<button onclick="equipSelectedCraftInventoryItem()">착용</button>`;
        let selectedUniqueEffectHint = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
            ? getUniqueEffectApplicationHint(selectedItem, typeof isCraftSelectionEquip === 'function' && isCraftSelectionEquip(), typeof getCraftSelectionRef === 'function' ? getCraftSelectionRef() : null)
            : '';
        let selectedUniqueEffectHtml = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
            ? `<div class="craft-unique-effect"><strong>고유 효과</strong><span>${escapeHTML(selectedItem.uniqueEffect)}</span>${selectedUniqueEffectHint ? `<small>${escapeHTML(selectedUniqueEffectHint)}</small>` : ''}</div>`
            : '';
            details=selectedUniqueEffectHtml+'<div class="craft-actions">'+equipSelectedButtonHtml+buildCraftActionButtons(selectedItem)+'</div>';
        }
        craftingWorkspaceUi.render(false,{details,useState:getMobileCraftCurrencyUseState,targetControls:getCraftTargetControlsHtml,emptyState:getCraftEmptyStateHtml});
        document.getElementById('ui-craft-spore-actions').innerHTML=buildSporeSummaryHtml();
    }
    let marketTabBtn = document.getElementById('btn-item-tab-market');
    if (marketTabBtn) marketTabBtn.style.display = isMarketUnlocked() ? 'block' : 'none';
    if (!isMarketUnlocked() && game.itemSubtab === 'item-tab-market') switchItemSubtab('item-tab-equip');
    __mark('midRender');
    renderVisibleManagementPanels(renderingTabIds);
    __mark('market');

    let mapTabActive = (document.getElementById('tab-map') || {}).classList.contains('active');
    let activeMapExploreId = game.mapExploreSubtab || 'map-explore-hunting';
    // 벌집 진행 상태 갱신은 UI 표시와 무관하게 항상 돌아야 한다.
    // (awaitingClear -> pendingChoice 전환이 여기서 처리됨)
    renderLoop8BeehivePanel(mapTabActive && activeMapExploreId === 'map-explore-beehive');
    if (mapTabActive && activeMapExploreId === 'map-explore-colony') renderLoop15ColonyPanel();
    if (mapTabActive) {
    let legacyMapOverview = document.querySelector('#tab-map .map-overview-card');
    if (legacyMapOverview) legacyMapOverview.remove();

    let seasonMapCap = typeof getVisibleHuntingMapCapZoneId === 'function' ? getVisibleHuntingMapCapZoneId() : Math.min(getCurrentSeasonFinalZoneId(), getAbyssZoneIdForDepth(20));
    let highestMapZone = Math.min(Math.max(0, Math.floor(game.maxZoneId || 0)), seasonMapCap);
    let mapZones = Array.from({ length: highestMapZone + 1 }, (_, idx) => getZone(idx)).filter(Boolean);
    let recommendedHuntingZone = getRecommendedHuntingZone(mapZones);
    let recommendedHuntingZoneId = recommendedHuntingZone ? Number(recommendedHuntingZone.id) : null;
    let mapRouteSummary = document.getElementById('ui-map-route-summary');
    let routeSummaryHtml = buildMapRouteSummaryHtml(getZone(game.currentZoneId), recommendedHuntingZone);
    if (mapRouteSummary && mapRouteSummary.innerHTML !== routeSummaryHtml) mapRouteSummary.innerHTML = routeSummaryHtml;
    // 나무(일반 사냥터)와 혼돈을 탐험 좌측 세부 탭으로 나눠 그린다(js/map-list-ui.js: 액트 카드, 혼돈 층 타일).
    setExploreSubtabAvailable('map-explore-chaos', mapListUi.render(mapZones, recommendedHuntingZoneId) > 0);
    setExploreSubtabAvailable('map-explore-beehive', (game.season || 1) >= 8);
    setExploreSubtabAvailable('map-explore-voidrift', (game.season || 1) >= 9);
    setExploreSubtabAvailable('map-explore-colony', (game.season || 1) >= 15);
    let boundaryState = ensureBeyondBoundaryState(game);
    setExploreSubtabAvailable('map-explore-beyond', boundaryState.unlocked);
    if (boundaryState.unlocked) renderBeyondBoundaryPanel();

    let seasonBosses = SEASON_BOSS_ZONES.filter(zone => (game.season || 1) >= (zone.reqSeason || 2));
    document.getElementById('ui-season-boss-header').style.display = seasonBosses.length > 0 ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-root-boss', seasonBosses.length > 0);
    let seasonBossRepeatWrap = document.getElementById('ui-season-boss-repeat-wrap');
    let seasonBossRepeatBtn = document.getElementById('btn-season-boss-repeat');
    if (seasonBossRepeatWrap) seasonBossRepeatWrap.style.display = 'none';
    if (seasonBossRepeatBtn) {
        seasonBossRepeatBtn.style.display = seasonBosses.length > 0 ? 'inline-block' : 'none';
        seasonBossRepeatBtn.innerText = `입장권 보스 반복 ${game.autoRepeatSeasonBoss ? '켜짐' : '꺼짐'}`;
        seasonBossRepeatBtn.style.background = game.autoRepeatSeasonBoss ? '#2f6a42' : '#5b4a2f';
        seasonBossRepeatBtn.style.minWidth = '0';
    }
    mapListUi.renderBosses(seasonBosses);

    let timeRiftOpen = (game.season || 1) >= TIME_RIFT_UNLOCK_LOOP;
    setExploreSubtabAvailable('map-explore-timerift', timeRiftOpen);
    if (timeRiftOpen) renderTimeRiftPanel();

    let labyrinthOpen = (game.season || 1) >= 3;
    document.getElementById('ui-labyrinth-header').style.display = labyrinthOpen ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-labyrinth', labyrinthOpen);
    if (labyrinthOpen) {
        let powerEstimate = buildMapPowerEstimateHtml(getZone(LABYRINTH_ZONE_ID));
        sideEncounterUi.renderPanel(document.getElementById('ui-labyrinth-list'), sideEncounterUi.labyrinthPanel(powerEstimate));
    } else sideEncounterUi.renderPanel(document.getElementById('ui-labyrinth-list'), '');

    // 혼돈 심화 입장은 혼돈 탭의 카드 목록으로 노출한다.
    // 기존 전용 섹션/사이드 탭은 중복 표시를 피하기 위해 비우고 숨긴다.
    document.getElementById('ui-deep-chaos-header').style.display = 'none';
    document.getElementById('ui-deep-chaos-list').innerHTML = '';
    let deepChaosTabBtn = document.getElementById('btn-map-explore-deep-chaos');
    if (deepChaosTabBtn) deepChaosTabBtn.style.display = 'none';
    if (game.mapExploreSubtab === 'map-explore-deep-chaos') switchMapExploreSubtab('map-explore-hunting');

    let meteorUnlocked = !!(game.meteorSite && game.meteorSite.unlocked);
    document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-meteor', meteorUnlocked);

    let meteorAutoBtn = document.getElementById('btn-meteor-auto-enter');
    if (meteorAutoBtn) {
        meteorAutoBtn.style.display = meteorUnlocked ? 'inline-block' : 'none';
        meteorAutoBtn.innerText = `자동입장 ${game.settings.autoEnterMeteor ? '켜짐' : '꺼짐'}`;
    }

    sideEncounterUi.renderPanel(document.getElementById('ui-meteor-list'), meteorUnlocked ? sideEncounterUi.meteorPanel(buildMapPowerEstimateHtml(getZone(METEOR_FALL_ZONE_ID))) : '');

    atlasUi.render();
    renderChaosRealmMapPanel();
    renderSkyTowerMapPanel();
    if (game.mapSubtab === 'map-tab-underworld') renderUnderworldMapPanel();
    // Keep normalization/unlock timing independent from the selected map panel.
    ensureOceanState();
    if (game.mapSubtab === 'map-tab-ocean') oceanDiveUi.render();
    if (game.mapSubtab === 'map-tab-fishing') {
        fishingUi.render();
    }

    let availTrials = TRIAL_ZONES.filter(trial => {
        if (!contentProgression.isUnlocked('battleTrials')) return false;
        if (trial.bloomTrial) return canSeeTalentBloomTrial();
        return (trial.reqZone !== -1 && game.maxZoneId >= trial.reqZone) || game.unlockedTrials.includes(trial.id);
    }).sort((a, b) => Number(game.completedTrials.includes(a.id)) - Number(game.completedTrials.includes(b.id)));
    document.getElementById('ui-trials-header').style.display = availTrials.length > 0 ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-trials', availTrials.length > 0);
    sideEncounterUi.refreshDestinations();
    renderMapExploreNotiDots();

    renderLoop9VoidRiftPanel();
    renderTrialMapList(availTrials);
    renderMobileMapNavigation();
    }
    __mark('mapPanels');
    if (mapTabActive) explorationAtlasUi.render();

    if (isTabRendering('tab-season')) {
    let seasonVisible = game.season > 1 || game.seasonPoints > 0;
    document.getElementById('trait-season-section').style.display = seasonVisible ? 'block' : 'none';
    document.getElementById('season-content-section').style.display = seasonVisible ? 'block' : 'none';
    loopClimbUi.render();
    let seasonRoadmapKeys = Object.keys(SEASON_CONTENT_ROADMAP).map(Number).filter(v => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    let collapsePast = game.settings.collapsePastLoopMilestones !== false;
    let roadmapToggle = document.getElementById('btn-toggle-past-loop-milestones');
    if (roadmapToggle) roadmapToggle.innerText = collapsePast ? '지난 루프 펼치기' : '지난 루프 접기';
    let pastRoadmapCount = seasonRoadmapKeys.filter(seasonNum => seasonNum < game.season).length;
    let collapsedRoadmapSummary = collapsePast && pastRoadmapCount > 0
        ? `<div style="color:#78d99a; border:1px dashed rgba(46,204,113,.55); border-radius:8px; padding:8px 12px;">완료한 지난 루프 이정표 ${pastRoadmapCount}개가 접혀 있습니다.</div>`
        : '';
    let roadmapCards = seasonRoadmapKeys.map(seasonNum => {
        let def = SEASON_CONTENT_ROADMAP[seasonNum];
        if (!def) return '';
        let unlocked = seasonNum <= game.season;
        let current = seasonNum === game.season;
        let stateColor = current ? '#f1c40f' : (unlocked ? '#2ecc71' : '#7f8c8d');
        // 지난 루프는 '지남': 이정표의 해금 항목은 루프에 닿으면 열 수 있게 될 뿐, 해금 목록에서 사야 열린다(예전 '해금됨'이 사지 않은 것도 열린 것처럼 보였다).
        let stateText = current ? '진행 중' : (unlocked ? '지남' : '잠김');
        let reqText = getLoopAbyssRequirementText(seasonNum);
        let hiddenStyle = collapsePast && unlocked && !current ? 'display:none;' : '';
        return `<div style="${hiddenStyle}background:#121822; border:1px solid ${stateColor}; border-radius:8px; padding:10px 12px;">
            <div style="display:flex; justify-content:space-between; gap:8px; margin-bottom:4px;">
                <strong style="color:${stateColor};">${def.title}</strong><span style="color:${stateColor}; font-size:12px;">${stateText}</span>
            </div>
            <div style="color:var(--copy-bright); font-size:12px; line-height:1.5;">• ${reqText}<br>${(def.features || []).map(v => `• ${v}`).join('<br>')}</div>
        </div>`;
    }).join('');
    document.getElementById('ui-season-content-roadmap').innerHTML = collapsedRoadmapSummary + roadmapCards
        || `<div style="color:var(--copy-muted);">루프 1을 클리어하면 루프 이정표가 열립니다.</div>`;
    // 노드 한가운데 도트 그림(능력치 종류): 한 글자("관" · "피")는 읽히지 않고 어수선했다(2026-10-06 사용자 요청).
    // 전체 효과는 이름표 · 툴팁이 말한다. 그림은 각인과 같은 11도트 묶음(PIXEL_ICONS)을 쓴다.
    const seasonNodeIcons = {
        expGain: 'up', pctDmg: 'sword', pctHp: 'heart', crit: 'eye', dotPctDmg: 'flame',
        move: 'boot', dr: 'shield', aspd: 'speed', physIgnore: 'pierce', resPen: 'pierce', ds: 'speed',
        critDmg: 'star', flatHp: 'heart', regen: 'drop', projectilePctDmg: 'reticle',
        meleePctDmg: 'sword', physPctDmg: 'sword', elementalPctDmg: 'flame', chaosPctDmg: 'drop',
        minDmgRoll: 'fork', maxDmgRoll: 'up'
    };
    let renderSeasonNode = (id, placement, x, y) => {
        let node = getSeasonPassiveNodeDef(id);
        if (!node) return '';
        let lv = getSeasonNodeLevel(id);
        let active = lv > 0;
        let evolved = isSeasonTreeEvolved();
        let cap = node.inner ? 1 : (evolved ? 5 : 1);
        let unlockLoop = getSeasonPassiveUnlockLoop(id);
        let contentUnlocked = (game.season || 1) >= unlockLoop;
        let reqMet = contentUnlocked && isSeasonNodeRequirementMet(node);
        let statInfo = P_STATS[node.stat] || {};
        let suffix = statInfo.isPct ? '%' : '';
        let scaled = Number((node.val * (1 + Math.max(0, lv - 1) * 0.2)).toFixed(2));
        let stateText = !contentUnlocked ? `루프 ${unlockLoop} 해금` : (!reqMet ? '선행 노드 필요' : (active ? (lv >= cap ? '최대' : '강화') : '활성화'));
        let style = Number.isFinite(x) && Number.isFinite(y) ? ` style="--loop-node-x:${x}%;--loop-node-y:${y}%;"` : '';
        let horizontalClass = x < 25 ? 'tooltip-right' : (x > 75 ? 'tooltip-left' : '');
        let stateClass = active ? 'active' : (reqMet ? 'available' : 'locked');
        let maxedClass = active && lv >= cap ? 'maxed' : '';
        let actionAttrs = reqMet
            ? ` role="button" tabindex="0" onclick="buySeason('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();buySeason('${id}');}"`
            : ' aria-disabled="true"';
        return `<div class="loop-passive-node ${placement || ''} ${horizontalClass} ${stateClass} ${maxedClass}"${style}${actionAttrs} aria-label="${node.name}: ${node.desc}"><span class="loop-node-core">${renderPixelIcon(seasonNodeIcons[node.stat] || 'star', 'loop-node-icon')}<span class="loop-node-rank">${active ? `${lv}/${cap}` : (reqMet ? '+' : '×')}</span></span><span class="loop-node-tooltip"><strong>${node.name}</strong><small>${statToneText.html(node.desc)}</small><em style="color:${getItemStatToneColor(node.stat)}">${statInfo.name || node.stat} +${formatValue(node.stat, scaled)}${suffix}</em><b>${stateText}</b>${active ? `<span class="loop-node-refund" role="button" tabindex="0" onclick="event.stopPropagation(); askRefundSeasonNode('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();askRefundSeasonNode('${id}');}">마름병 포자로 반환</span>` : ''}</span></div>`;
    };
    let seasonNodeIds = Object.keys(SEASON_NODES || {});
    let activeSeasonNodeCount = seasonNodeIds.filter(id => getSeasonNodeLevel(id) > 0).length;
    let seasonEvolved = isSeasonTreeEvolved();
    let seasonSummary = `<div class="trait-progress-summary"><div><strong>${seasonEvolved ? '순환 완성' : '우로보로스 원환'}</strong><span>${activeSeasonNodeCount}/${seasonNodeIds.length} 노드 활성화</span></div><div><strong>${Math.max(0, Math.floor(game.seasonPoints || 0))} 포인트</strong><span>${seasonEvolved ? '외곽 노드 강화 및 내부 노드 투자 가능' : `남은 원형 노드 ${Math.max(0, seasonNodeIds.length - activeSeasonNodeCount)}개`}</span></div></div>`;
    let ringNodes = SEASON_OUROBOROS_RING_NODES.map((id, index) => {
        const angle = (90 - index * 360 / SEASON_OUROBOROS_RING_NODES.length) * Math.PI / 180;
        const radius = 40.7;
        return renderSeasonNode(id, id === 's_root' ? 'origin-node' : 'ring-node', 50 + Math.cos(angle) * radius, 50 + Math.sin(angle) * radius);
    }).join('');
    let innerIds = Object.keys(SEASON_INNER_NODES || {});
    let innerNodes = seasonEvolved ? innerIds.map((id, index) => {
        let angle = (-90 + index * 360 / innerIds.length) * Math.PI / 180;
        return renderSeasonNode(id, 'inner-node', 50 + Math.cos(angle) * 17.2, 50 + Math.sin(angle) * 17.2);
    }).join('') : '';
    let innerCircle = seasonEvolved ? '<div class="loop-magic-circle" aria-hidden="true"><span class="loop-magic-runes"></span><span class="loop-magic-core"></span></div>' : '';
    document.getElementById('ui-season-tree').innerHTML = `${seasonSummary}<div class="loop-passive-orbit ${seasonEvolved ? 'complete' : ''}"><div class="loop-orbit-ambient" aria-hidden="true"></div><span class="loop-ouroboros-silhouette" aria-hidden="true"></span>${innerCircle}${ringNodes}${innerNodes}</div>`;
    }


    if (isTabRendering('tab-traits')) {
    if (game.ascendClass) {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'block';
        document.getElementById('ui-selected-class-name').innerText = '';
        // 전직 트리 보기(2026-10-09): 선으로 이은 노드와 키스톤, 합계와 다음 포인트, 늘 보이는 설명 칸(js/ascendancy-tree-ui.js).
        ascendancyTreeUi.render();
    } else if (game.ascendPoints > 0) {
        document.getElementById('ui-class-select').style.display = 'block';
        document.getElementById('ui-class-locked').style.display = 'none';
        document.getElementById('ui-class-tree').style.display = 'none';
        fillAscendancyPickScreen();
    } else {
        document.getElementById('ui-class-select').style.display = 'none';
        document.getElementById('ui-class-locked').style.display = 'block';
        document.getElementById('ui-class-tree').style.display = 'none';
        document.getElementById('ui-class-trial-link').disabled = !contentProgression.isUnlocked('battleTrials');
    }

    }

    __mark('progressionTabs');
    if (isTabRendering('tab-codex')) uniqueCodexUi.render();
    if (isTabRendering('tab-records') && typeof renderRecordsTab === 'function') renderRecordsTab();

    if (isTabRendering('tab-skills') && typeof renderSkillGemScreen === 'function') renderSkillGemScreen({ pStats, searchFilters: sf });

    __mark('codex+skills');
    let journalList = isTabRendering('tab-journal') ? document.getElementById('ui-journal-list') : null;
    if (journalList) {
        let unlocked = new Set((game.journalEntries || []).filter(id => JOURNAL_DB[id]));
        let orderedIds = JOURNAL_ENTRY_ORDER.filter(id => !!JOURNAL_DB[id]);
        let entries = orderedIds.map(id => ({ id: id, def: JOURNAL_DB[id] }));
        let getJournalCategory = id => {
            if (id === 'prologue' || /^act_\d+$/.test(id)) return '스토리';
            if (JOURNAL_DB[id] && JOURNAL_DB[id].hidden) return '숨겨진 기록';
            if (/^rival_/.test(id)) return '버려진 날';
            if (id === 'cosmos_astra') return '우주계 기록';
            if (/^pinnacle_/.test(id)) return '최종 관문';
            if (['labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10'].includes(id)) return '탐험 기록';
            return '세계의 흔적';
        };
        let journalHintById = {
            prologue: '게임 시작',
            woodsman: '혼돈 5층 클리어',
            woodsman_echo: '혼돈 밖에서 나무꾼 완전 격파',
            meteor_fall: '운석 낙하 지점 첫 정산',
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
            cosmos_astra: '우주계의 잔향체 아스트라 격파',
            pinnacle_underking: '지하계 30층 이후 지핵군주 모르그란 격파',
            pinnacle_leviathan: '심해 1000m 이후 무광해의 포식자 탈라사 격파',
            pinnacle_sky: '창공의 탑 30층 이후 빈 왕좌의 집행자 카엘룸 격파',
            pinnacle_observer: '세 영역의 지배자와 아스트라 격파 후 경계의 관측자 베일라 격파'
        };
        let getJournalHint = (id, def) => {
            if (def && def.hint) return def.hint;
            let actMatch = /^act_(\d+)$/.exec(id);
            if (actMatch) return `액트 ${actMatch[1]} 보스 처치`;
            return journalHintById[id] || '관련 콘텐츠 탐험';
        };
        let categoryOrder = ['스토리', '세계의 흔적', '탐험 기록', '버려진 날', '우주계 기록', '최종 관문', '숨겨진 기록'];
        let availabilityById = new Map(entries.map(entry => [entry.id, getJournalEntryAvailability(entry, Array.from(unlocked))]));
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
        let availableEntries = entries.filter(({ id }) => availabilityById.get(id) === 'available');
        let nextLocked = availableEntries[0];
        let nextTarget = '';
        if (nextLocked) {
            let nextAction = getJournalEntryAction(nextLocked.id);
            let nextTitle = nextLocked.def.hidden ? '숨겨진 기록' : nextLocked.def.title;
            nextTarget = `<div class="journal-next-target">
                <div><span>확인 가능한 해금 조건 ${availableEntries.length}개</span><strong>${nextTitle}</strong><small>${getJournalHint(nextLocked.id, nextLocked.def)}${availableEntries.length > 1 ? `, 다른 조건 ${availableEntries.length - 1}개` : ''}</small></div>
                ${nextAction ? `<button type="button" onclick="openJournalEntryAction('${nextLocked.id}')">${nextAction.label}</button>` : ''}
            </div>`;
        } else if (unlockedCount === entries.length && entries.length > 0) {
            nextTarget = `<div class="journal-next-target is-complete"><div><span>기록 완성</span><strong>모든 저널을 해금했습니다.</strong><small>영구 효과와 세계의 단서가 모두 활성화되었습니다.</small></div></div>`;
        }
        let summary = `<div class="journal-summary">
            <div class="journal-summary-main">
                <div><strong>주요 기록 ${standardUnlockedCount}/${standardEntries.length}</strong><span>전체 ${unlockedCount}/${entries.length}, 숨겨진 기록 ${hiddenUnlockedCount}/${hiddenEntries.length}, 영구 효과 ${rewardCount}개</span></div>
                <b>${progressPct}%</b>
            </div>
            <div class="journal-progress"><i style="width:${progressPct}%"></i></div>
            <div class="journal-category-strip" role="group" aria-label="저널 분류"><button type="button" data-journal-filter="전체" onclick="storyJournalUi.filter('전체')">전체</button>${categoryOrder.filter(name => categoryCounts[name]).map(name => {
                let count = categoryCounts[name];
                return `<button type="button" data-journal-filter="${name}" onclick="storyJournalUi.filter('${name}')">${name} <b>${count.unlocked}</b></button>`;
            }).join('')}</div>
            <label class="journal-conditions"><input type="checkbox" data-journal-conditions onchange="storyJournalUi.filter(undefined,this.checked)"> 해금 조건 보기</label>
        </div>${nextTarget}<p class="journal-empty" hidden>아직 획득한 기록이 없습니다.</p>`;
        let cards = categoryOrder.map(category => {
            let rows = entries.filter(({ id }) => getJournalCategory(id) === category);
            if (rows.length === 0) return '';
            return `<section class="journal-section" data-journal-category="${category}">
                <div class="journal-section-title">${category}<span>${rows.filter(({ id }) => unlocked.has(id)).length}/${rows.length}</span></div>
                <div class="journal-card-grid">${rows.map(({ id, def }) => {
                    let isUnlocked = unlocked.has(id);
                    let availability = availabilityById.get(id);
                    let available = availability === 'available';
                    let displayTitle = isUnlocked || available ? def.title : (def.hidden ? '히든 저널 - ???' : '미확인 기록');
                    let rewardText = isUnlocked || available ? (def.bonus ? def.bonus.label : def.displayEffect) : '';
                    let action = available ? getJournalEntryAction(id) : null;
                    let stateLabel = isUnlocked ? '해금' : '해금 필요';
                    let lockedHint = getJournalLockedHint(availability, id);
                    return `<article class="journal-card ${isUnlocked ? 'is-unlocked' : 'is-locked'} is-${availability} ${def.hidden ? 'is-hidden' : ''}">
                        ${isUnlocked ? `<button type="button" class="journal-card-head journal-entry-open" data-journal-entry="${id}" onclick="storyJournalUi.openEntry('${id}')"><strong>${displayTitle}</strong><span>읽기 ›</span></button>` : `<div class="journal-card-head"><strong>${displayTitle}</strong><span>${stateLabel}</span></div>`}
                        <div class="journal-card-body">${isUnlocked
                            ? ''
                            : (available ? `<p class="journal-hint">${getJournalHint(id, def)}</p>` : `<p class="journal-hint">${lockedHint}</p>`)}</div>
                        ${rewardText ? `<div class="journal-reward ${isUnlocked ? '' : 'is-preview'}">${isUnlocked ? '영구 효과' : '기록 보상'}, ${rewardText}</div>` : ''}
                        ${action ? `<button type="button" class="journal-card-action" onclick="openJournalEntryAction('${id}')">${action.label}</button>` : ''}
                    </article>`;
                }).join('')}</div>
            </section>`;
        }).join('');
        // 저널 카드 목록은 해금이 바뀔 때만 달라진다. 내용이 같으면 innerHTML 재작성
        // (파싱 + 리플로우)을 생략한다. 창을 여러 개 띄웠을 때 갱신 비용이 눈에 띈다.
        let journalHtml = summary + cards;
        if (journalList.__lastHtml !== journalHtml) {
            journalList.innerHTML = journalHtml;
            journalList.__lastHtml = journalHtml;
            storyJournalUi.refreshArchiveFilter();
        }
    }

    __mark('journal');
    if (itemsTabActive) switchItemSubtab(game.itemSubtab || 'item-tab-equip');
    if (isTabRendering('tab-skills')) {
        renderSkillAutoRulePanel();
        switchSkillSubtab(game.skillSubtab || 'skill-tab-equip');
    }
    if (isTabRendering('tab-map')) switchMapSubtab(game.mapSubtab || 'map-tab-zones');
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
    if (['aspd', 'move', 'suppCap', 'gemLevel', 'expGain'].includes(stat)) return 'utility';
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
        // 고른 필터 모양은 스킨 CSS가 그린다(예전에는 남색 판 · 파란 광택을 여기서 직접 칠했다).
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

function getAllocatedPassiveStatSummary() {
    const totals = {};
    const specialEffects = [];
    const allocatedIds = Array.isArray(game.passives) ? game.passives : [];
    const virtualVoidCount = getVirtualVoidPassiveCount();
    let voidCount = 0;
    const add = (stat, value) => {
        if (!stat || !P_STATS[stat] || !Number.isFinite(Number(value))) return;
        totals[stat] = (totals[stat] || 0) + Number(value);
    };
    allocatedIds.forEach(id => {
        const node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        if (node.kind === 'void') {
            voidCount++;
            const entry = game.voidPassives && game.voidPassives[String(id)];
            passiveRouting.voidStats(entry, game).forEach(line => add(line && line.id, line && line.val));
            getTranscendentVoidPassiveStats(id, entry, virtualVoidCount).forEach(line => add(line.stat, line.val));
            if (entry && entry.transcendent) {
                const def = (typeof TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' ? TRANSCENDENT_VOID_PASSIVE_DB : []).find(row => row.id === entry.transcendent.id);
                specialEffects.push(def ? `초월, ${def.name}` : '초월 공허 효과');
            }
            return;
        }
        getEffectivePassiveNodeEffects(node).forEach(effect => add(effect.stat, effect.val));
    });
    const specialization = typeof ensurePassiveSpecializationState === 'function' ? ensurePassiveSpecializationState() : null;
    if ((totals.mystique || 0) > 0) specialEffects.push(`신비 ${formatValue('mystique', totals.mystique)}, 최고 피해 속성 상태이상 강화`);
    if ((totals.devotion || 0) > 0 && specialization) {
        const revelationLabel = { combat: '전투', guard: '수호', life: '생명' }[specialization.revelation] || '전투';
        specialEffects.push(`${revelationLabel}의 계시, 헌신 ${formatValue('devotion', totals.devotion)}`);
    }
    if ((totals.cycle || 0) > 0) specialEffects.push(`순환 ${formatValue('cycle', totals.cycle)}, 상태이상 종료 시 6초 강화`);
    if (game.passiveStarEvolution) {
        specialEffects.push(game.passiveStarEvolutionSource === 'legacy_migrated'
            ? '성좌 각성, 기존 트리에서 영구 계승'
            : '성좌 각성, 별의 공명 영구 활성');
    } else if (typeof getPassiveConstellationAwakeningProgress === 'function') {
        const progress = getPassiveConstellationAwakeningProgress();
        if (progress.mode === 'outer_void' && progress.allocated > 0) {
            specialEffects.push(`성좌 각성 ${progress.completed}/${progress.required}, 외곽 공허 소켓을 요정의 고리로 초월`);
        }
    }
    return {
        allocatedCount: allocatedIds.filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start').length,
        voidCount,
        totals: Object.entries(totals).sort((a, b) => getStatName(a[0]).localeCompare(getStatName(b[0]), 'ko')),
        specialEffects
    };
}

function renderPassiveSpecializationControls() {
    if (typeof ensurePassiveSpecializationState !== 'function') return '';
    const state = ensurePassiveSpecializationState();
    const devotion = typeof getAllocatedPassiveStatValue === 'function' ? getAllocatedPassiveStatValue('devotion') : 0;
    const revelationUnlocked = devotion >= 1;
    const tripleRevelation = typeof findAllocatedPassiveKeystone === 'function' && !!findAllocatedPassiveKeystone('삼중 계시');
    const revelationLabels = { combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약' };
    const revelationOptions = Object.entries(revelationLabels).map(([id, label]) =>
        `<option value="${id}" ${state.revelation === id ? 'selected' : ''}>${label}</option>`).join('');
    const wisdomNode = typeof findAllocatedPassiveKeystone === 'function' ? findAllocatedPassiveKeystone('지혜의 도약') : null;
    if (!revelationUnlocked && !tripleRevelation && !wisdomNode) return '';
    const renderRevelationSelector = () => {
        if (!revelationUnlocked && !tripleRevelation) return '';
        return `<label>계시<select onchange="onPassiveRevelationChanged(this.value)" ${tripleRevelation ? 'disabled' : ''}>${revelationOptions}</select></label>`;
    };
    const elementLabels = { fire: '화염', cold: '냉기', lightning: '번개', chaos: '공허(카오스)', '': '속성 노드 미투자' };
    const wisdomElement = getPassiveWisdomElementFromNodeIds(game.passives);
    return `<div class="passive-specialization-controls">${renderRevelationSelector()}
        ${tripleRevelation ? '<span class="passive-specialization-locked">삼중 계시: 세 효과가 40%로 고정 적용</span>' : ''}
        ${wisdomNode ? `<span class="passive-specialization-locked">지혜의 도약, ${elementLabels[wisdomElement]} <small>투자한 노드 기준</small></span>` : ''}</div>`;
}

function onPassiveRevelationChanged(value) {
    if (typeof setPassiveRevelation !== 'function' || !setPassiveRevelation(value)) {
        addLog('헌신이 1 이상일 때만 계시를 선택할 수 있습니다.', 'attack-monster');
        return;
    }
    updateStaticUI();
    queueImportantSave(180);
}

function renderPassiveInvestmentSummary() {
    const panel = document.getElementById('passive-investment-summary');
    const body = document.getElementById('passive-investment-summary-body');
    if (!panel || !body) return;
    if (typeof syncPassiveAttributePreferenceControls === 'function') syncPassiveAttributePreferenceControls();
    if (!game.settings || typeof game.settings !== 'object') game.settings = {};
    const collapsed = !!game.settings.passiveInvestmentSummaryCollapsed;
    panel.classList.toggle('collapsed', collapsed);
    const toggle = panel.querySelector('.passive-investment-summary-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    const summary = getAllocatedPassiveStatSummary();
    const rows = summary.totals.length
        ? summary.totals.map(([stat, value]) => `<span>${getStatName(stat)}</span><strong style="color:${getItemStatToneColor(stat)}">+${formatValue(stat, value)}${P_STATS[stat] && P_STATS[stat].isPct ? '%' : ''}</strong>`).join('')
        : '<span>아직 투자한 효과가 없습니다.</span><strong>—</strong>';
    const specials = summary.specialEffects.length
        ? `<div class="passive-summary-specials">조건부 효과, ${summary.specialEffects.join(', ')}</div>`
        : '';
    body.innerHTML = `<div class="passive-summary-meta">투자 ${summary.allocatedCount}개${summary.voidCount ? `, 공허 ${summary.voidCount}개` : ''}</div>${renderPassiveSpecializationControls()}<div class="passive-summary-grid">${rows}</div>${specials}`;
    renderPassiveTreePlannerPanel();
}

function togglePassiveInvestmentSummary() {
    if (!game.settings || typeof game.settings !== 'object') game.settings = {};
    game.settings.passiveInvestmentSummaryCollapsed = !game.settings.passiveInvestmentSummaryCollapsed;
    renderPassiveInvestmentSummary();
}

safeExposeGlobals({ togglePassiveInvestmentSummary, renderPassiveInvestmentSummary,
    onPassiveRevelationChanged });

function renderPassiveTreePlannerPanel() {
    let host = document.getElementById('passive-tree-planner');
    if (!host || typeof ensurePassiveTreePlannerState !== 'function') return;
    let planner = ensurePassiveTreePlannerState();
    let active = planner.presets[planner.activeSlot];
    let owned = new Set(game.passives || []);
    let completed = active ? active.nodeIds.filter(id => owned.has(id)).length : 0;
    let signature = JSON.stringify([planner.activeSlot, planner.autoInvest, game.settings.passiveTreeShowLabels !== false,
        completed, planner.presets.map(preset => preset ? [preset.name, preset.nodeIds.length] : null)]);
    if (host.dataset.plannerSignature === signature) return;
    let options = planner.presets.map((preset, index) => {
        let label = preset ? `${index + 1}. ${preset.name} (${preset.nodeIds.length})` : `${index + 1}. 빈 프리셋`;
        return `<option value="${index}" ${index === planner.activeSlot ? 'selected' : ''}>${escapeHTML(label)}</option>`;
    }).join('');
    host.innerHTML = `
        <div class="passive-planner-row passive-planner-primary">
            <strong>트리 프리셋</strong>
            <select id="passive-preset-slot" onchange="selectPassiveTreePresetSlot(this.value)">${options}</select>
            <input id="passive-preset-name" class="passive-preset-name" type="text" maxlength="24" value="${escapeHTML(active ? active.name : `프리셋 ${planner.activeSlot + 1}`)}" aria-label="프리셋 이름">
            <button type="button" onclick="savePassiveTreePresetFromUi()">현재 트리 저장</button>
            <label class="passive-planner-toggle"><input type="checkbox" ${planner.autoInvest ? 'checked' : ''} onchange="togglePassiveTreeAutoInvest(this.checked)"> 환생 후 자동 투자</label>
            <label class="passive-planner-toggle"><input type="checkbox" ${game.settings.passiveTreeShowLabels === true ? 'checked' : ''} onchange="togglePassiveTreeLabels(this.checked)"> 상시 문구</label>
            <span class="passive-planner-progress">${active ? `${completed}/${active.nodeIds.length} 투자` : '저장된 경로 없음'}</span>
        </div>
        <div class="passive-planner-row passive-planner-share">
            <input id="passive-preset-code" type="text" placeholder="공유 코드를 붙여넣으세요" autocomplete="off">
            <button type="button" onclick="copyPassiveTreePresetCode()" ${active ? '' : 'disabled'}>공유 코드 복사</button>
            <button type="button" onclick="importPassiveTreePresetFromUi()">코드 불러오기</button>
        </div>`;
    host.dataset.plannerSignature = signature;
}

function selectPassiveTreePresetSlot(slotIndex) {
    if (setActivePassiveTreePreset(slotIndex)) renderPassiveTreePlannerPanel();
}

function savePassiveTreePresetFromUi() {
    let planner = ensurePassiveTreePlannerState();
    let allocated = (game.passives || []).filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start');
    if (allocated.length === 0) return addLog('저장할 패시브 경로가 없습니다.', 'attack-monster');
    let nameInput = document.getElementById('passive-preset-name');
    let name = nameInput && nameInput.value.trim() ? nameInput.value.trim() : `프리셋 ${planner.activeSlot + 1}`;
    let preset = saveCurrentPassiveTreePreset(planner.activeSlot, name);
    addLog(`🧭 ${preset.name}에 현재 패시브 ${preset.nodeIds.length}개를 저장했습니다.`, 'season-up');
    renderPassiveTreePlannerPanel();
}

function togglePassiveTreeAutoInvest(enabled) {
    setPassiveTreeAutoInvest(enabled);
    let result = enabled ? runPassiveTreeAutoInvest() : { nodes: 0 };
    if (result.nodes > 0) addLog(`🧭 프리셋 자동 투자: ${result.nodes}개 노드 활성화`, 'season-up');
    updateStaticUI();
}

function togglePassiveTreeLabels(enabled) {
    game.settings.passiveTreeShowLabels = !!enabled;
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('labels');
    drawPassiveTree();
}

async function copyPassiveTreePresetCode() {
    let planner = ensurePassiveTreePlannerState();
    let code = encodePassiveTreePreset(planner.activeSlot);
    let input = document.getElementById('passive-preset-code');
    if (!code || !input) return;
    input.value = code;
    input.select();
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(code);
        else if (document.execCommand) document.execCommand('copy');
        addLog('📋 패시브 트리 공유 코드를 복사했습니다.', 'loot-magic');
    } catch (error) {
        addLog('공유 코드를 입력칸에 만들었습니다. 직접 복사해 주세요.', 'attack-monster');
    }
}

function importPassiveTreePresetFromUi() {
    let planner = ensurePassiveTreePlannerState();
    let input = document.getElementById('passive-preset-code');
    try {
        let preset = importPassiveTreePreset(planner.activeSlot, input ? input.value : '');
        addLog(`🧭 공유 프리셋 [${preset.name}]을 불러왔습니다.`, 'season-up');
        renderPassiveTreePlannerPanel();
    } catch (error) {
        addLog(`프리셋을 불러오지 못했습니다: ${error.message}`, 'attack-monster');
    }
}

safeExposeGlobals({
    renderPassiveTreePlannerPanel, selectPassiveTreePresetSlot, savePassiveTreePresetFromUi,
    togglePassiveTreeAutoInvest, togglePassiveTreeLabels, copyPassiveTreePresetCode,
    importPassiveTreePresetFromUi
});

function setupPassiveTreeSearchControls() {
    if (typeof syncPassiveAttributePreferenceControls === 'function') syncPassiveAttributePreferenceControls();
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
    let hasScour = (game.currencies.blightSpore || 0) >= 1;
    let connected = typeof canRefundPassiveNode === 'function' && canRefundPassiveNode(nodeId);
    return {
        enabled: active && hasScour && connected,
        reason: !active ? '활성화된 공허 패시브만 반환할 수 있습니다.'
            : (!connected ? '연결 유지에 필요한 노드는 반환할 수 없습니다.'
                : (!hasScour ? '마름병 포자가 부족합니다.' : '마름병 포자 1개를 소모해 반환합니다.'))
    };
}

/** 제작 창은 쓴 결과를 창 안 한 줄과 알림으로 보여 준다(전투 기록만으로는 아무 일도 없던 것처럼 보였다 — 검토 4차). */
function craftVoidPassiveFromOverlay(nodeId, currencyKey) {
    const before = game.currencies[currencyKey] || 0;
    applyVoidPassiveCurrency(nodeId, currencyKey);
    const result = (game.currencies[currencyKey] || 0) < before ? getVoidCraftResultText(nodeId, currencyKey) : '';
    if (result) showGameToast(result, { tone: 'info' });
    openVoidPassiveCraftOverlay(nodeId, result);
}

function canUseFairyRingOnVoid(entry, active) {
    return active && (game.currencies.fairyRing || 0) > 0 && (!!entry.transcendent || (entry.stats || []).length > 0);
}

function getVoidCraftResultText(nodeId, currencyKey) {
    const entry = getVoidPassiveCraft(nodeId), name = ORB_DB[currencyKey].name;
    if (entry.transcendent) return `${name}, ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}`;
    if (currencyKey === 'fairyRing') return `${name}, 초월 실패, 옵션이 지워졌습니다.`;
    return `${name}, 새 옵션: ${getVoidPassiveEffectLabel(nodeId).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}`;
}

function refundVoidPassiveFromOverlay(nodeId) {
    let state = getVoidPassiveRefundState(nodeId);
    if (!state.enabled) return addLog(state.reason, 'attack-monster');
    closeVoidPassiveCraftOverlay();
    refundPassiveNode(nodeId);
}

async function askRefundPassiveNode(id) {
    if (!await requestGameConfirmation('선택한 패시브 노드를 반환하고 마름병 포자 1개를 소모합니다.', {
        title: '패시브 노드 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    refundPassiveNode(id);
}

/** 공허 제작 창 안내: 세 오브가 하는 일과, 외곽 공허 소켓이면 성좌 각성 진행(초월은 이 창에서 시도한다). */
function getVoidCraftGuide(node, active) {
    if (!active) return '먼저 패시브 트리에서 이 공허 패시브를 활성화해야 제작할 수 있습니다.';
    const base = '마법의 새싹은 현재 옵션을 지우고 공허 옵션 1~2줄을 다시 굴립니다. 요정의 고리는 옵션이 있는 공허를 25% 확률로 초월시키고, 실패하면 옵션이 지워집니다. 황금률은 초월 수치를 다시 굴립니다.';
    if (node.voidRing !== 'outer' || game.passiveStarEvolution) return base;
    const progress = getPassiveConstellationAwakeningProgress();
    return `${base}<br>외곽 공허 소켓, 성좌 각성 ${progress.completed}/${progress.required}: 여섯을 모두 초월시키면 성좌가 각성합니다.`;
}

function openVoidPassiveCraftOverlay(nodeId, result = '') {
    closeVoidPassiveCraftOverlay();
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog('공허 패시브만 제작할 수 있습니다.', 'attack-monster');
    let active = (game.passives || []).includes(node.id);
    let entry = typeof getVoidPassiveCraft === 'function' ? getVoidPassiveCraft(node.id) : { stats: [] };
    let refundState = getVoidPassiveRefundState(node.id);
    let effectLabel = typeof getVoidPassiveEffectLabel === 'function' ? getVoidPassiveEffectLabel(node.id) : getPassiveEffectLabel(node);
    let overlay = document.createElement('div');
    overlay.id = 'void-passive-craft-overlay';
    overlay.className = 'void-craft-overlay';
    overlay.onclick = event => { if (event.target === overlay) closeVoidPassiveCraftOverlay(); };
    overlay.innerHTML = `<div class="void-craft-dialog" role="dialog" aria-modal="true" aria-labelledby="void-craft-title" tabindex="-1">
        <div class="void-craft-header">
            <div><div id="void-craft-title">${escapeHTML(getPassiveNodeDisplayName(node))}</div><div class="void-craft-subtitle">공허 패시브 제작</div></div>
            <button type="button" onclick="closeVoidPassiveCraftOverlay()">닫기</button>
        </div>
        <div class="void-craft-effect">${effectLabel}</div>
        ${result ? `<div class="void-craft-result" role="status">${escapeHTML(result)}</div>` : ''}
        <div class="void-craft-hint">${getVoidCraftGuide(node, active)}</div>
        <div class="void-craft-actions">
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','magicBud')" ${active && !entry.transcendent && (game.currencies.magicBud || 0) > 0 ? '' : 'disabled'}>마법의 새싹, 1~2줄 재굴림<br><span>보유 ${game.currencies.magicBud || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','fairyRing')" ${canUseFairyRingOnVoid(entry, active) ? '' : 'disabled'}>요정의 고리<br><span>보유 ${game.currencies.fairyRing || 0}</span></button>
            <button type="button" onclick="craftVoidPassiveFromOverlay('${node.id}','goldenRule')" ${active && entry.transcendent && typeof TRANSCENDENT_VOID_PASSIVE_DB !== 'undefined' && TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min))) && (game.currencies.goldenRule || 0) > 0 ? '' : 'disabled'}>황금률<br><span>보유 ${game.currencies.goldenRule || 0}</span></button>
        </div>
        <div class="void-craft-footer">
            <div class="void-craft-hint">${refundState.reason}</div>
            <button type="button" onclick="refundVoidPassiveFromOverlay('${node.id}')" ${refundState.enabled ? '' : 'disabled'}>공허 패시브 반환 (마름병 포자 1)</button>
        </div>
    </div>`;
    document.body.appendChild(overlay);
}

function renderCraftTargetLibrary(isRarityVisible) {
    if (game.itemSubtab !== 'item-tab-craft' || !document.querySelector('#item-tab-craft > details.craft-target-library').open) return;
    renderPaperdoll('ui-craft-equip-list', true);
    const rows = game.inventory.map((item, idx) => ({ item, idx })).filter(row => isRarityVisible(row.item) && !bagItems.isSpecial(row.item));
    document.getElementById('ui-craft-inventory-list').innerHTML = rows.map(row => renderInventoryCard(row.item, row.idx, 'craft')).join('');
}

function normalizePassiveTooltipText(value) {
    return String(value || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/초당 생명력 재생/g, '초당 재생')
        .replace(/\(\s*%\s*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function getPassiveTooltipDescription(node, effectLabels) {
    if (!node || !node.desc) return '';
    if (Array.isArray(node.effects) && node.effects.length > 0) return '';
    const description = normalizePassiveTooltipText(node.desc);
    if (!description) return '';
    const labels = Array.isArray(effectLabels) ? effectLabels : [effectLabels];
    const repeatsEffect = labels.some(label => {
        const effect = normalizePassiveTooltipText(label);
        return effect === description || effect.startsWith(`${description} `);
    });
    return repeatsEffect ? '' : node.desc;
}

// UI-local mouse capture keeps tree dragging active across floating controls.
const bindPassiveTreeMouseEvents = (canvas, handlers) => {
    canvas.addEventListener('mousedown', e => {
        if (e.button !== 0) return;
        isDragging = true;
        dragDist = 0;
        dragStartX = e.clientX / uiDisplay.factor - camX;
        dragStartY = e.clientY / uiDisplay.factor - camY;
        handlers.hover(e.clientX, e.clientY);
        canvas.style.cursor = 'grabbing';
    });
    document.addEventListener('mousemove', e => {
        if (isDragging) {
            handlers.drag(e.clientX, e.clientY, e.movementX, e.movementY);
            return;
        }
        if (e.target === canvas) handlers.hover(e.clientX, e.clientY);
    }, true);
    document.addEventListener('mouseup', e => {
        if (!isDragging || e.button !== 0) return;
        isDragging = false;
        canvas.style.cursor = 'grab';
        if (e.target === canvas) handlers.activate({ clientX: e.clientX, clientY: e.clientY });
    }, true);
    window.addEventListener('blur', () => { isDragging = false; canvas.style.cursor = 'grab'; });
    canvas.addEventListener('mouseleave', () => {
        if (isDragging || uiDisplay.matches('(max-width: 1080px)')) return;
        hoverNode = null;
        canvas.style.cursor = 'grab';
        drawPassiveTree();
        handlers.hideTooltip();
    });
};

/** 직업 시작점은 늘 무료로 열려 있는 출발점이다(소유 목록에 넣지 않는다). */
function describeReachablePassiveNode(node) {
    return node.kind === 'start' ? '시작점, 여기서 이어진 노드부터 포인트를 씁니다.' : '활성화하면 주변 노드가 밝혀집니다.';
}

function describeBlockedPassiveNode(node) {
    return node.kind === 'start' ? '시작점은 이미 열려 있습니다. 이어진 노드를 눌러 포인트를 쓰세요.' : '연결된 노드가 아니라 활성화할 수 없습니다.';
}

function setupCanvasEvents() {
    passiveSelectionUi.bindTools();
    setupPassiveTreeSearchControls();
    setupBattlefieldMovementInteraction();
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
        passiveSelectionUi.hide();
        if (!canvasTooltip) return;
        canvasTooltip.style.display = 'none';
        clearActiveTooltip('canvas-tooltip');
    }

    window.hidePassiveNodeTooltip = hideCanvasTooltip;

    /** 손가락은 도트 노드보다 굵다: 터치는 화면 반지름 22px(지름 44px) 안의 가장 가까운 노드를 고른다. */
    function getPassiveNodeAtTouch(touch) {
        return getPassiveNodeAtClientPosition(touch.clientX, touch.clientY, 22);
    }

    /** minScreenRadius: 이 화면 반지름(px) 안이면 노드로 본다(마우스 0 — 그린 반지름 + 8). */
    function getPassiveNodeAtClientPosition(clientX, clientY, minScreenRadius) {
        ensurePassiveRenderCache();
        const rect = canvas.getBoundingClientRect();
        const viewW = passiveCanvasMetrics.width || rect.width;
        const viewH = passiveCanvasMetrics.height || rect.height;
        const minRadius = minScreenRadius * viewW / rect.width / camZoom;
        const worldX = ((clientX - rect.left) * viewW / rect.width - viewW / 2 - camX) / camZoom;
        const worldY = ((clientY - rect.top) * viewH / rect.height - viewH / 2 - camY) / camZoom;
        let found = null;
        let foundDistance = Infinity;
        let cellSize = passiveRenderCache.cellSize;
        let cx = Math.floor(worldX / cellSize);
        let cy = Math.floor(worldY / cellSize);
        let candidates = [];
        for (let ox = -1; ox <= 1; ox++) {
            for (let oy = -1; oy <= 1; oy++) {
                let bucket = passiveRenderCache.hoverGrid.get(`${cx + ox},${cy + oy}`);
                if (bucket && bucket.length) candidates.push(...bucket);
            }
        }
        let nearbyNodes = (candidates.length > 0 ? candidates : passiveRenderCache.nodes);
        nearbyNodes.forEach(node => {
            if (getPassiveVisibility(node.id) === 'hidden') return;
            let radius = Math.max(getPassiveNodeVisualRadius(node) + 8, minRadius);
            let distance = Math.hypot(node.x - worldX, node.y - worldY);
            if (distance > radius) return;
            if (!found || distance < foundDistance) {
                found = node;
                foundDistance = distance;
            }
        });
        return found;
    }

    function renderPassiveRouteHint(cost) {
        if (cost <= 0) return '';
        return `<div class="tooltip-line" style="margin-top:6px;color:#f2d88f;">현재 경로 기준 ${cost}포인트 필요, 연결 경로가 트리에 강조됩니다.</div>`;
    }

    /** The node's effect text in the option colours (2026-10-06): each effect line in its own stat's colour (a node with several
     * stats showed them all in the first stat's colour), keystone and other prose with coloured keywords and numbers. */
    function renderPassiveEffectToneHtml(node, label) {
        const effects = Array.isArray(node.effects) && node.effects.length > 0
            ? (node.connectedDevotionPenalty ? getEffectivePassiveNodeEffects(node) : node.effects) : null;
        if (!effects) return node.stat ? label : statToneText.markup(label);
        return String(label).split('<br>').map((line, index) => (index < effects.length
            ? `<span style="color:${getItemStatToneColor(effects[index].stat)}">${line}</span>` : statToneText.markup(line))).join('<br>');
    }

    function renderPassiveTooltip(node, clientX, clientY) {
        if (!canvasTooltip || !node) return;
        let displayStat = typeof getPassiveNodeDisplayStat === 'function' ? getPassiveNodeDisplayStat(node) : node.stat;
        let passiveAccent = getPassiveStatAccent(displayStat);
        let state = getPassiveVisibility(node.id);
        let route = getHoveredPassivePathNodeIds(node.id);
        let routeCost = Array.from(route).filter(id => !(game.passives || []).includes(id)
            && PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start').length;
        let ownedApexCount = getPassiveApexNodeIds().filter(id => (game.passives || []).includes(id)).length;
        let msg = (game.passives || []).includes(node.id)
            ? '활성화됨'
            : (reachableNodes.has(node.id)
                ? describeReachablePassiveNode(node)
                : '아직 길이 이어지지 않은 노드');

        if (state === 'preview' && !discoveredPassiveNodes.has(node.id)) {
            msg = '안개 속 노드입니다. 활성화하여 주변을 밝힐 수 있습니다.';
        }
        if (node.kind === 'apex' && !(game.passives || []).includes(node.id)) {
            msg = `★ 별끝 특수 노드 ${ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.`;
        } else if ((node.kind === 'evolved' || node.kind === 'transcendent') && game.passiveStarEvolution) {
            msg = (game.passives || []).includes(node.id)
                ? '✔️ 각성된 별자리를 이미 받아들였습니다.'
                : '✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.';
        } else if (node.voidRing === 'outer' && !game.passiveStarEvolution) {
            const progress = getPassiveConstellationAwakeningProgress();
            msg += `, 성좌 각성 ${progress.completed}/${progress.required}: 외곽 공허 소켓 여섯을 모두 초월시키면 각성합니다.`;
        }

        // 효과 글씨는 능력치 종류의 색(장비 옵션과 같은 getItemStatToneColor): 노드 테두리 색의 옅은 글씨는 흰색과 구분되지 않았다(2026-10-06).
        let effectTextColor = getItemStatToneColor(displayStat);
        let effectBadge = (label, accent, caption) => {
            let tone = accent || passiveAccent;
            return `<div class="tooltip-line passive-effect-badge" style="--badge-edge:${tone.activeOuter}; color:${effectTextColor};">
                <div class="passive-effect-caption">${caption}</div>
                ${label}
            </div>`;
        };
        const primaryEffectLabel = getPassiveEffectLabel(node);
        const displayedEffectLabels = [primaryEffectLabel].filter(Boolean);
        let effectHtml = primaryEffectLabel ? effectBadge(renderPassiveEffectToneHtml(node, primaryEffectLabel), passiveAccent, '효과') : '';
        const activationState = getPassiveNodeActivationState(node);
        if (node.activationRequirement && !activationState.active) {
            const requiredName = activationState.statId === 'devotion' ? '계시' : getStatName(activationState.statId);
            effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,184,106,.48); border-radius:8px; color:#ffd0a2; background:rgba(91,52,20,.28);">${withSubjectParticle(requiredName)} ${activationState.required} 미만이면 이 노드의 모든 효과가 비활성화됩니다. 현재 ${activationState.available}</div>`;
        }
        let voidCraftHtml = '';
        if (node.kind === 'void' && (game.passives || []).includes(node.id)) {
            voidCraftHtml = `<div class="tooltip-line" style="margin-top:8px; color:var(--copy-bright);">🕳️ 클릭하면 공허 제작 창이 열립니다.</div>`;
        }
        const tooltipDescription = getPassiveTooltipDescription(node, displayedEffectLabels);

        canvasTooltip.innerHTML =
            `<div class="tooltip-title" style="color:${node.tier >= 3 || node.kind === 'apex' || node.kind === 'transcendent' ? '#e7bf73' : '#b9d0df'}">${getPassiveNodeDisplayName(node)}</div>
             <div class="tooltip-line">${getPassiveKindLabel(node)}</div>
             ${effectHtml}
             ${tooltipDescription ? `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${statToneText.markup(tooltipDescription)}</div>` : ''}
             ${voidCraftHtml}
             ${renderPassiveRouteHint(routeCost)}
             <div class="tooltip-line" style="margin-top:6px;">${msg}</div>`;

        passiveSelectionUi.present(node, canvasTooltip, { x: clientX, y: clientY });
    }

    function updateHoverNode(clientX, clientY) {
        let oldHover = hoverNode;
        hoverNode = getPassiveNodeAtClientPosition(clientX, clientY, 0);
        if (oldHover !== hoverNode) {
            drawPassiveTree();
            if (uiDisplay.matches('(max-width: 1080px)')) return;
            if (hoverNode) renderPassiveTooltip(hoverNode, clientX, clientY);
            else hideCanvasTooltip();
        } else if (hoverNode) {
            positionTooltipElement(canvasTooltip, clientX, clientY);
        }
    }

    function updateDrag(clientX, clientY, deltaX, deltaY) {
        camX = clientX / uiDisplay.factor - dragStartX;
        camY = clientY / uiDisplay.factor - dragStartY;
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
        if (options.nodeId) {
            hoverNode = PASSIVE_TREE.nodes[options.nodeId];
        } else if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) {
            hoverNode = getPassiveNodeAtClientPosition(options.clientX, options.clientY, 0);
        }
        if (dragDist >= 10 || !hoverNode) return;
        const targetNode = hoverNode;
        const targetNodeId = targetNode.id;
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
            return addLog(describeBlockedPassiveNode(hoverNode), "attack-monster", { toast: true });
        }
        let pointCost = activationPath.length;
        if (game.passivePoints < pointCost) {
            if (Number.isFinite(options.clientX) && Number.isFinite(options.clientY)) renderPassiveTooltip(hoverNode, options.clientX, options.clientY);
            return addLog(`스킬트리 포인트가 부족합니다. (필요: ${pointCost})`, "attack-monster", { toast: true });
        }
        if (options.fromTouch) {
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
            const attributeNodeCount = activationPath.filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind === 'attribute').length;
            if (canPathActivate && !await requestGameConfirmation(`최단 경로에 있는 노드를 함께 활성화하며 스킬트리 포인트 ${pointCost}점을 씁니다.${attributeNodeCount > 0 ? ` 경로의 능력치 노드 ${attributeNodeCount}개는 다음 단계에서 선택합니다.` : ''}`, {
                title: '최단 경로 활성화',
                confirmLabel: `${pointCost}포인트 사용`
            })) return;
            let attributeStat = null;
            if (attributeNodeCount > 0) {
                attributeStat = await requestGameChoice({
                    kicker: '패시브 능력치',
                    title: attributeNodeCount > 1 ? `능력치 노드 ${attributeNodeCount}개 선택` : '능력치 노드 선택',
                    message: attributeNodeCount > 1
                        ? '이번 최단 경로에 포함된 모든 능력치 노드에 같은 능력치를 적용합니다.'
                        : '이 노드에 저장할 능력치를 선택하세요.',
                    confirmLabel: '능력치 적용',
                    choices: [
                        { value: 'strength', label: '◆ 힘', detail: '생명력과 근접 계열 성장에 적합합니다.' },
                        { value: 'dexterity', label: '● 민첩', detail: '회피/공격 속도/투사체 계열 성장에 적합합니다.' },
                        { value: 'intelligence', label: '✦ 지능', detail: '에너지 보호막/주문/원소 계열 성장에 적합합니다.' }
                    ]
                });
                if (!attributeStat) return;
            }
            pendingTouchPassiveId = null;
            let activationResult = activatePassivePath(targetNodeId, { forcePulseNodeId: targetNodeId, attributeStat });
            if (!activationResult.activated) {
                calculateReachableNodes();
                let reason = activationResult.reason === 'points'
                    ? `스킬트리 포인트가 부족합니다. (필요: ${activationResult.cost})`
                    : (activationResult.message || '확인 중 패시브 트리 상태가 변경되었습니다. 노드를 다시 선택해 주세요.');
                addLog(reason, 'attack-monster');
                updateStaticUI();
                return;
            }
            unlockPassiveStarEvolution();
            calculateReachableNodes();
            let nodeName = getPassiveNodeDisplayName(targetNode);
            let routeText = canPathActivate ? ` (최단 경로 ${pointCost}개 노드)` : '';
            addLog(`🌟 ${nodeName} 활성화!${routeText}`, "loot-magic");
            updateStaticUI();
        }
    }

    bindPassiveTreeMouseEvents(canvas, { drag: updateDrag, hover: updateHoverNode, hideTooltip: hideCanvasTooltip,
        activate: async point => {
            if (uiDisplay.matches('(max-width: 1080px)')) {
                const node = getPassiveNodeAtClientPosition(point.clientX, point.clientY, 0);
                return passiveSelectionUi.touch(node, point, { preview: renderPassiveTooltip, activate: activateHoveredPassive });
            }
            await activateHoveredPassive(point);
            if (hoverNode && canvasTooltip.style.display !== 'none') {
                renderPassiveTooltip(hoverNode, point.clientX, point.clientY);
            }
        }
    });
    canvas.addEventListener('wheel', e => {
        e.preventDefault();
        let rect = canvas.getBoundingClientRect();
        let centerX = canvas.clientWidth / 2;
        let centerY = canvas.clientHeight / 2;
        let localX = (e.clientX - rect.left) * canvas.clientWidth / rect.width;
        let localY = (e.clientY - rect.top) * canvas.clientHeight / rect.height;
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
        dragStartX = touch.clientX / uiDisplay.factor - camX;
        dragStartY = touch.clientY / uiDisplay.factor - camY;
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
        hoverNode = getPassiveNodeAtTouch(touch);
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
            dragStartX = touch.clientX / uiDisplay.factor - camX;
            dragStartY = touch.clientY / uiDisplay.factor - camY;
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
            hoverNode = getPassiveNodeAtTouch(touch);
            passiveSelectionUi.touch(hoverNode, touch, { preview: renderPassiveTooltip, activate: activateHoveredPassive });
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
    let displayWidth = Math.max(1, Math.floor(rect.width / uiDisplay.factor));
    let displayHeight = Math.max(1, Math.floor(rect.height / uiDisplay.factor));
    if (displayWidth < 50 || displayHeight < 50) return false;
    let dpr = Math.max(1, (window.devicePixelRatio || 1) * uiDisplay.factor);
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
    // Window setup can request a frame between deferred scripts; combat dependencies are not ready yet.
    if (document.readyState !== 'complete') {
        window.addEventListener('load', scheduleStableResize, { once: true });
        return;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => resizeCanvas()));
}

function handleResponsiveLayoutChange() {
    let isMobileLayout = uiDisplay.matches('(max-width: 1080px)');
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


function isStartupOverlayOpen() {
    return !!startupOverlayActive;
}

function setStartupOverlayActive(active) {
    startupOverlayActive = !!active;
    document.body.classList.toggle('startup-active', startupOverlayActive);
    let overlay = document.getElementById('startup-overlay');
    if (!overlay) return;
    overlay.classList.toggle('active', startupOverlayActive);
    if (startupOverlayActive) {
        overlay.scrollTop = 0;
        if (gameLoopFrameHandle !== null) cancelAnimationFrame(gameLoopFrameHandle);
        gameLoopFrameHandle = null;
    } else {
        scheduleGameLoop();
        if (typeof showNextTutorial === 'function') setTimeout(showNextTutorial, 0);
    }
    startMobilePipRefreshLoop();
    dispatchRuntimeEvent('startup-visibility', {active:startupOverlayActive});
}

function setLoadingOverlayState(active, options = {}) {
    let overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    let titleEl = document.getElementById('loading-title');
    let detailEl = document.getElementById('loading-detail');
    let captionEl = document.getElementById('loading-caption');
    let barEl = document.getElementById('loading-bar-fill');
    if (!active) {
        overlay.classList.remove('active');
        document.body.classList.remove('loading-active');
        loadingOverlayProgress = 0;
        if (barEl) { barEl.style.width = '0%'; barEl.parentElement.setAttribute('aria-valuenow', '0'); }
        if (typeof showNextTutorial === 'function') setTimeout(showNextTutorial, 0);
        return;
    }
    loadingOverlayProgress = Math.max(0, Math.min(92, options.progress || 12));
    if (titleEl) titleEl.innerText = options.title || '차원을 정렬하는 중...';
    if (detailEl) detailEl.innerText = options.detail || '세이브 상태를 점검하고 전장을 준비하고 있습니다.';
    if (captionEl) captionEl.innerText = options.caption || 'Syncing Timeline';
    if (barEl) { barEl.style.width = `${loadingOverlayProgress}%`; barEl.parentElement.setAttribute('aria-valuenow', String(Math.round(loadingOverlayProgress))); }
    overlay.classList.add('active');
    document.body.classList.add('loading-active');
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
        barEl.parentElement.setAttribute('aria-valuenow', String(Math.round(loadingOverlayProgress)));
    }
}

async function finishLoadingOverlay() {
    advanceLoadingOverlay({
        progress: 100,
        title: '전장을 여는 중...',
        detail: '진입 준비를 마무리하고 있습니다.',
        caption: '전장 입장'
    });
    await new Promise(resolve => setTimeout(resolve, 320));
    setLoadingOverlayState(false);
}

function openStartupGate(options = {}) {
    setStartupRegistrationMode(false);
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

// 시작 화면에는 오류·진행 결과만 적는다. 가만히 있을 때의 안내("로그인하면 …")는 버튼만으로 충분하다.
const STARTUP_IDLE_MESSAGES = new Set(['설정 전', '로그인하면 클라우드 저장을 사용할 수 있습니다.', '시작 화면을 다시 열었습니다.']);
function getStartupStatusText() {
    const message = cloudState.lastMessage || '';
    return STARTUP_IDLE_MESSAGES.has(message) ? '' : message;
}

/** 이 기기 저장의 시각. 저장이 있으면 게스트 단추는 "이어하기"(처음이면 "게스트로 시작"), 저장이 없으면 요약 칸 대신
 * "새 모험"만 보인다(처음 온 사람에게 Lv.1 · 루프 1 · 마지막 저장 없음이라는 빈 저장을 보여 주지 않는다). */
function renderStartupLocalSave(timeEl, guestBtn, localStamp) {
    const hasSave = localStamp > 0;
    if (timeEl) timeEl.innerText = formatCloudTime(localStamp);
    if (guestBtn) guestBtn.textContent = hasSave ? '이 기기 저장으로 이어하기' : '게스트로 시작';
    const card = document.querySelector('.startup-summary-card');
    if (!card) return;
    card.querySelector('.startup-summary-grid').hidden = !hasSave;
    card.querySelector('.startup-summary-hint')?.toggleAttribute('hidden', hasSave);
    card.querySelector('.startup-summary-title').textContent = hasSave ? '이 기기 저장' : '새 모험';
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
    let socialActionsEl = document.getElementById('startup-social-login');
    let continueBtn = document.getElementById('btn-startup-continue');
    let switchBtn = document.getElementById('btn-startup-switch-account');
    let guestBtn = document.getElementById('btn-startup-guest');
    let backBtn = document.getElementById('btn-startup-back');
    let loginBtn = document.getElementById('btn-startup-login');
    let signupBtn = document.getElementById('btn-startup-signup');
    let resendBtn = document.getElementById('btn-startup-resend-confirmation');
    let googleBtn = document.getElementById('btn-startup-google');
    let kakaoBtn = document.getElementById('btn-startup-kakao');
    let localStamp = game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0;
    let zoneLabel = getCurrentZoneLabel();
    let loopLabel = Math.max(1, Math.floor((game && game.season) || 1));
    if (localSummaryEl) localSummaryEl.innerText = `Lv.${game.level || 1}, 루프 ${loopLabel}, ${zoneLabel}`;
    renderStartupLocalSave(localTimeEl, guestBtn, localStamp);
    if (statusEl) statusEl.textContent = getStartupStatusText();
    if (backBtn) {
        backBtn.style.display = gameplayStarted ? 'block' : 'none';
        backBtn.disabled = cloudState.busy;
    }

    if (!config.enabled) {
        if (authFormEl) authFormEl.classList.remove('hidden');
        if (authActionsEl) authActionsEl.style.display = 'grid';
        if (socialActionsEl) socialActionsEl.style.display = '';
        if (continueBtn) continueBtn.style.display = 'none';
        if (switchBtn) switchBtn.style.display = 'none';
        if (loginBtn) loginBtn.disabled = true;
        if (signupBtn) signupBtn.disabled = true;
        if (resendBtn) resendBtn.disabled = true;
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
    if (socialActionsEl) socialActionsEl.style.display = '';
    if (continueBtn) continueBtn.style.display = 'none';
    if (switchBtn) switchBtn.style.display = 'none';
    if (loginBtn) loginBtn.disabled = cloudState.busy;
    if (signupBtn) signupBtn.disabled = cloudState.busy;
    if (resendBtn) resendBtn.disabled = cloudState.busy;
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
            detectSessionInUrl: true,
            flowType: appPlatform.active ? 'pkce' : 'implicit'
        }
    });
    window.supabaseClient = supabaseClient;
    return supabaseClient;
}

function getOAuthRedirectUrl() {
    if (appPlatform.active) return appPlatform.redirectUrl;
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
    let options = { redirectTo, ...(appPlatform.active ? { skipBrowserRedirect: true } : {}) };
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
    setStartupRegistrationMode(false);
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
        await openSocialOAuthResult(provider, data);
    } catch (error) {
        cloudState.busy = false;
        setCloudMessage('OAuth 로그인 시작 실패: ' + (error.message || error));
        updateCloudSaveUI();
    }
}

async function openSocialOAuthResult(provider, data) {
    if (appPlatform.active) return appPlatform.openOAuth(data.url);
    if (provider !== 'kakao') return; // The web client already redirects Google sign-in.
    let safeUrl = sanitizeKakaoScopeInUrl(data && data.url);
    if (!safeUrl) throw new Error('카카오 인증 페이지 URL을 받지 못했습니다.');
    window.location.assign(safeUrl);
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

/** "45%를"이 "45%" / "를 줍니다."로 갈리지 않게: %와 뒤 한글 사이는 유니코드 줄바꿈 규칙상 끊어도 되는 자리라 keep-all로도
 * 막히지 않는다(검토 5차) — 사이에 줄바꿈 금지 문자(U+2060)를 넣는다. 화면에 보이는 글에만 쓴다(속성 · 비교 키에는 쓰지 않는다). */
/** 휴대폰 장비창 가방 머리의 '필터' 단추(index.html .eqw-filter-toggle): 등급, 칸, 정렬 줄을 펼친다.
 * 펼침 상태는 인벤토리 판의 class(filters-open)가 기준이다(css/equipment-window.css). */
function toggleInventoryFilters(button) {
    const open = button.closest('.equipment-inventory-panel').classList.toggle('filters-open');
    button.setAttribute('aria-expanded', String(open));
}
safeExposeGlobals({ toggleInventoryFilters });

function keepKoreanUnitParticles(text) {
    return String(text).replace(/%(?=[가-힣])/g, '%\u2060');
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

// Esc로 패치 노트를 닫는다(창 관리자의 Esc는 이 판이 떠 있으면 아래 창을 닫지 않고 비켜 준다).
document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !document.getElementById('patch-notes-overlay')?.classList.contains('active')) return;
    event.preventDefault();
    closePatchNotes();
});

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
        getLegacyCloudSessionKeys().forEach(key => localStorage.removeItem(key));
    } catch (error) {
        console.warn('failed to clear cloud session storage:', error);
    }
}

/** Sessions kept under an earlier key name (data/constants.js LEGACY_CLOUD_SESSION_KEY_PATTERN). */
function getLegacyCloudSessionKeys() {
    return Object.keys(localStorage).filter(key => LEGACY_CLOUD_SESSION_KEY_PATTERN.test(key));
}

/** A session saved under an earlier key name moves to CLOUD_SESSION_STORAGE_KEY once, so an update keeps the player signed in. */
function adoptLegacyCloudSession() {
    const key = getLegacyCloudSessionKeys()[0];
    if (!key) return null;
    const raw = localStorage.getItem(key);
    if (raw) localStorage.setItem(CLOUD_SESSION_STORAGE_KEY, raw);
    localStorage.removeItem(key);
    return raw;
}

function loadStoredCloudSession() {
    try {
        let raw = localStorage.getItem(CLOUD_SESSION_STORAGE_KEY) || adoptLegacyCloudSession();
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('failed to load cloud session:', error);
        return null;
    }
}

function refreshSocialAfterCloudStateChange() {
    if (typeof syncSocialBackgroundTasks === 'function') syncSocialBackgroundTasks();
    if (typeof renderSocialTab !== 'function') return;
    // 채팅이 화면에 있으면(PC 전투 기록 창의 채팅 탭, 휴대폰 채팅 탭) 새 로그인 상태로 다시 그린다.
    if (typeof isSocialTabActive === 'function' && isSocialTabActive()) renderSocialTab();
    if (cloudState.user && typeof checkSocialChatNotification === 'function') {
        Promise.resolve(checkSocialChatNotification()).catch(error => console.warn('social notification refresh failed:', error));
    }
}

function applyCloudSession(session) {
    let previousUserId = cloudState.user && cloudState.user.id;
    let nextUserId = session && session.user && session.user.id;
    if (previousUserId !== nextUserId) {
        cloudState.lastSyncedLocalModifiedAt = 0;
        cloudState.lastRemoteRevision = 0;
        cloudState.lastRemoteResetRevision = 0;
        cloudState.pendingAutoSyncDirty = false;
        cloudState.pendingForcedSyncOptions = null;
        if (cloudSyncTimer) clearTimeout(cloudSyncTimer);
        cloudSyncTimer = null;
    }
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
    if (options.expectedUserId && options.expectedUserId !== getActiveCloudUserId()) throw new Error('로그인 계정이 변경되어 작업을 중단했습니다.');
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
    if (!response.ok) throw new Error(describeCloudServerError(data, response.status));
    return data;
}

// 서버 오류 코드 중 플레이어가 알아야 할 것은 문구로 바꾼다(db/operations-and-ghost.sql의 commit_cloud_save).
const CLOUD_SERVER_ERROR_TEXT = Object.freeze({
    SAVE_TOO_LARGE: '클라우드 저장이 너무 커서 서버가 받지 않았습니다(8MB). 가방과 보관함을 정리한 뒤 다시 저장해 주세요.'
});

function describeCloudServerError(data, status) {
    const message = data && (data.msg || data.error_description || data.message || data.error);
    return CLOUD_SERVER_ERROR_TEXT[message] || message || `HTTP ${status}`;
}

function collectCloudCredentials() {
    let emailEl = document.getElementById('startup-email');
    let passwordEl = document.getElementById('startup-password');
    return {
        email: emailEl ? String(emailEl.value || '').trim() : '',
        password: passwordEl ? String(passwordEl.value || '') : ''
    };
}

function hasAcceptedRequiredLegalPolicies() {
    let terms = document.getElementById('startup-terms-consent');
    let privacy = document.getElementById('startup-privacy-consent');
    return !!(terms && terms.checked && privacy && privacy.checked);
}

function requireLegalPolicyConsent() {
    if (hasAcceptedRequiredLegalPolicies()) return true;
    setCloudMessage('회원가입하려면 필수 약관 두 항목에 동의해주세요.');
    return false;
}

function setStartupRegistrationMode(active) {
    let consent = document.getElementById('startup-signup-consent');
    let signupBtn = document.getElementById('btn-startup-signup');
    if (consent) consent.hidden = !active;
    if (!signupBtn) return;
    signupBtn.innerText = active ? '동의하고 회원가입' : '회원가입';
    signupBtn.setAttribute('aria-expanded', String(active));
}

function clearCloudPasswordInput() {
    let passwordEl = document.getElementById('startup-password');
    if (passwordEl) passwordEl.value = '';
}

async function enterGameWorld() {
    advanceLoadingOverlay({
        title: '전장을 불러오는 중...',
        detail: '전투 로그와 캐릭터 상태를 복원하고 있습니다.',
        caption: '진행 복원',
        progress: 48
    });
    await ensureBattleAssetsLoadedBeforeEntry();
    gameplayStarted = true;
    setStartupOverlayActive(false);
    try {
        if (typeof closeAllWindows === 'function') closeAllWindows();
        if (typeof closeCommunityDock === 'function') closeCommunityDock();
        if (typeof syncBattleTabLayout === 'function') syncBattleTabLayout(false);
        switchTab('tab-battle');
        updateStaticUI();
    } catch (error) {
        console.error('main battlefield setup on enterGameWorld failed:', error);
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
    ensureInitialHeroSelection();
    try {
        await startOfflineCombatReturn(Date.now());
    } catch (error) {
        console.error('offline combat replay failed:', error);
    }
}

async function continueWithCloudSession() {
    if (!cloudState.user || cloudState.busy) return;
    cloudState.busy = true;
    setLoadingOverlayState(true, {
        title: '클라우드 세이브를 여는 중...',
        detail: '계정 연결을 확인하고 최신 진행도를 비교하고 있습니다.',
        caption: '클라우드 확인',
        progress: 14
    });
    setCloudMessage('클라우드 세이브를 확인하고 있습니다...');
    updateCloudSaveUI();
    try {
        advanceLoadingOverlay({
            title: '클라우드 저장을 불러오는 중...',
            detail: '같은 계정의 로컬과 클라우드 저장을 비교해 더 앞선 진행도를 적용합니다.',
            caption: '진행도 비교',
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
    setStartupRegistrationMode(false);
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
    if (cloudState.user) detachCloudSessionLocally();
    setCloudMessage('게스트 모드로 시작합니다. 이 기기 저장만 사용합니다.');
    setLoadingOverlayState(true, {
        title: '게스트 세션을 준비하는 중...',
        detail: '현재 기기 로컬 저장을 기준으로 전장을 준비하고 있습니다.',
        caption: '이 기기 저장',
        progress: 22
    });
    enterGameWorld();
}

function startupLogin() {
    setStartupRegistrationMode(false);
    cloudLogin({ source: 'startup', enterGame: true });
}

function startupSignUp() {
    let consent = document.getElementById('startup-signup-consent');
    if (consent && consent.hidden) {
        setStartupRegistrationMode(true);
        setCloudMessage('회원가입을 위해 필수 약관을 확인하고 동의해주세요.');
        return;
    }
    if (!requireLegalPolicyConsent()) return;
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
    if (!client) return setCloudMessage('소셜 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.');
    // Supabase Dashboard > Authentication에서 Manual Identity Linking 옵션이 켜져 있어야 동작합니다.
    if (typeof client.auth.linkIdentity !== 'function') return setCloudMessage('이 환경에서는 소셜 계정 연결을 지원하지 않습니다.');
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
        await openSocialOAuthResult(provider, data);
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
        if (hintEl) hintEl.innerText = '이 버전은 클라우드 저장을 쓰지 않습니다. 진행은 이 기기에 저장됩니다.';
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


function formatCloudUploadProfile(profile) {
    let normalized = normalizeCloudUploadProfile(profile);
    if (!normalized || normalized.totalMs <= 0) return '없음';
    let sizeKb = (normalized.payloadBytes / 1024).toFixed(1);
    return `${normalized.totalMs}ms (조회 ${normalized.fetchMs}ms, 직렬화 ${normalized.serializeMs}ms, 전송 ${normalized.uploadMs}ms, ${sizeKb}KB)`;
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

function getCloudSaveOwnerId(snapshot = game) {
    let ownerId = snapshot && snapshot.saveMeta && snapshot.saveMeta.cloudUserId;
    return typeof ownerId === 'string' && ownerId.trim() ? ownerId : null;
}

function getActiveCloudUserId() {
    let userId = cloudState.user && cloudState.user.id;
    return typeof userId === 'string' && userId.trim() ? userId : null;
}

function markCurrentSaveCloudOwner() {
    let userId = getActiveCloudUserId();
    if (!userId) return false;
    ensureSaveMeta();
    game.saveMeta.cloudUserId = userId;
    return true;
}

function replaceLocalSaveForCloudUser() {
    game = cloneDefaultGame();
    if (!markCurrentSaveCloudOwner()) throw new Error('로그인한 클라우드 계정을 확인하지 못했습니다.');
    if (!persistLocalSave({ touchModifiedAt: false, allowRecoveryWrite: true })) {
        throw new Error('계정 전환용 로컬 저장을 기록하지 못했습니다.');
    }
}

function prepareLocalSaveForCloudSession(options = {}) {
    let userId = getActiveCloudUserId();
    if (!userId) throw new Error('로그인이 필요합니다.');
    let ownerId = getCloudSaveOwnerId();
    if (ownerId === userId) return { replaced: false, adoptedUnowned: false };
    if (!ownerId && options.allowUnownedLocal === true) {
        markCurrentSaveCloudOwner();
        return { replaced: false, adoptedUnowned: true };
    }
    replaceLocalSaveForCloudUser();
    return { replaced: true, adoptedUnowned: false };
}

function applyExternalSave(snapshot, sourceStamp) {
    game = mergeDefaults(snapshot || {});
    applySeasonContentProgression({ silent: true });
    ensureSaveMeta();
    markCurrentSaveCloudOwner();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(cloudState.lastRemoteRevision) || 0));
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
    resetHeroSelectionForSave();
    refreshPassiveVisibility();
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

function isMissingCloudRevisionSchemaError(error) {
    return /revision.*does not exist|column.*revision|schema cache/i.test(String((error && error.message) || error || ''));
}

async function fetchLatestCloudSaveRow(userId, select) {
    let rows = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=${select}&order=updated_at.desc.nullslast&limit=1`, {
        headers: { Accept: 'application/json' }
    });
    if (Array.isArray(rows) && rows[0]) return rows[0];
    let fallback = await cloudJsonRequest(`/rest/v1/cloud_saves?user_id=eq.${userId}&select=${select}`, {
        headers: { Accept: 'application/json' }
    });
    return (Array.isArray(fallback) ? fallback : []).filter(Boolean).sort((a, b) => {
        let at = a.updated_at ? (new Date(a.updated_at).getTime() || 0) : 0;
        let bt = b.updated_at ? (new Date(b.updated_at).getTime() || 0) : 0;
        return bt - at;
    })[0] || null;
}

/** What every server read leaves behind: revision, update time and the remote loop for the guards and the cloud panel. */
function rememberCloudRecord(record) {
    cloudState.isLoaded = true;
    cloudState.lastRemoteCheckedAt = Date.now();
    if (record && record.updated_at) cloudState.lastRemoteUpdatedAt = new Date(record.updated_at).getTime() || 0;
    cloudState.lastRemoteRevision = record ? Math.max(0, Math.floor(Number(record.revision) || 0)) : 0;
    if (record && record.save_data) updateRemoteLoopFromRecord(record);
    updateCloudSaveUI();
    return record;
}

// 업로드 전 확인은 세이브에서 루프, 초기화 번호, 저장 시각만 읽는다. 그 값만 받고(세이브 전체는 수백 KB), 전체는 불러올 때만 받는다.
const CLOUD_SAVE_SUMMARY_FIELDS = 'season:save_data->season,loopCount:save_data->loopCount,saveMeta:save_data->saveMeta';

/** A summary row as a record whose save_data holds only season, loopCount and saveMeta. A full row passes through. */
function cloudSummaryRecord(row) {
    if (!row || row.save_data !== undefined) return row;
    let empty = row.season == null && row.loopCount == null && row.saveMeta == null;
    return { user_id: row.user_id, updated_at: row.updated_at, revision: row.revision, summaryOnly: true,
        save_data: empty ? null : { season: row.season, loopCount: row.loopCount, saveMeta: row.saveMeta || {} } };
}

/** The upload checks' read: a few hundred bytes instead of the whole save. Any doubt (old schema, odd row) reads the full save. */
async function fetchCloudSaveSummary() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    let row;
    try {
        row = await fetchLatestCloudSaveRow(encodeURIComponent(cloudState.user.id), `user_id,updated_at,revision,${CLOUD_SAVE_SUMMARY_FIELDS}`);
    } catch (error) {
        console.warn('cloud summary read failed, reading the full save:', error);
        return await fetchCloudSaveRecord();
    }
    let record = cloudSummaryRecord(row);
    if (row && !record.save_data) return await fetchCloudSaveRecord();
    cloudState.revisionSupported = true;
    return rememberCloudRecord(record);
}

async function fetchCloudSaveRecord() {
    if (!cloudState.user || !cloudState.user.id) throw new Error('로그인이 필요합니다.');
    try {
        let userId = encodeURIComponent(cloudState.user.id);
        let record;
        try {
            record = await fetchLatestCloudSaveRow(userId, 'user_id,save_data,updated_at,revision');
            cloudState.revisionSupported = true;
        } catch (error) {
            if (!isMissingCloudRevisionSchemaError(error)) throw error;
            cloudState.revisionSupported = false;
            record = await fetchLatestCloudSaveRow(userId, 'user_id,save_data,updated_at');
            if (record) record.revision = 0;
        }
        return rememberCloudRecord(record);
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

function getLocalCloudRevision() {
    ensureSaveMeta();
    return Math.max(0, Math.floor(Number(game.saveMeta.cloudRevision) || 0));
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
    cloudState.lastRemoteResetRevision = 0;
    if (!record || !record.save_data) return 0;
    let remoteLoop = getSaveLoopNumber(record.save_data);
    cloudState.lastRemoteLoop = remoteLoop;
    let resetRevision = record.save_data.saveMeta && record.save_data.saveMeta.cloudResetRevision;
    cloudState.lastRemoteResetRevision = Number.isSafeInteger(resetRevision) && resetRevision > 0 ? resetRevision : 0;
    return remoteLoop;
}

function shouldBlockLocalPushForRemoteLoop(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    let localResetRevision = localSnapshot?.saveMeta?.cloudResetRevision ?? 0;
    if (cloudState.lastRemoteResetRevision > localResetRevision) return {
        blocked: true, reason: 'remote-reset', localLoop, remoteLoop,
        message: '계정의 진행 데이터가 초기화되어 초기화 이전 기기 기록으로 서버 저장을 덮어쓸 수 없습니다.'
    };
    if (remoteLoop > localLoop) return {
        blocked: true, reason: 'higher-loop', localLoop, remoteLoop,
        message: `클라우드 루프(${remoteLoop})가 로컬 루프(${localLoop})보다 높아 로컬 저장으로 덮어쓸 수 없습니다.`
    };
    if (record && record.save_data && isLikelyBootstrapLocalSave(localSnapshot)) return {
        blocked: true, reason: 'bootstrap-local', localLoop, remoteLoop,
        message: '로컬 세이브가 새로 생성된 기본 상태라 기존 클라우드 저장을 덮어쓸 수 없습니다.'
    };
    return { blocked: false, reason: 'safe', localLoop, remoteLoop };
}

function getLoopCompareSummary(record, localSnapshot = game) {
    let localLoop = getSaveLoopNumber(localSnapshot || {});
    let remoteLoop = updateRemoteLoopFromRecord(record);
    return { localLoop, remoteLoop, safeToPush: localLoop >= remoteLoop };
}

function countSavedStumpItems(snapshot) {
    const items = snapshot.stumpBox && snapshot.stumpBox.items;
    return Array.isArray(items) ? items.length : 0;
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
    let record = await fetchCloudSaveSummary();
    if (!record || !record.save_data) return { record, status: 'no-remote' };
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    cloudState.lastRemoteUpdatedAt = remoteStamp;
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        record = await readFullCloudSaveForPull();
        applyExternalSave(record.save_data, getRemoteSaveStamp(record));
        setCloudMessage(loopGuard.message);
        if (!options.silentLog) addLog(loopGuard.message, 'loot-magic');
        return { record, status: 'pulled-remote-higher-loop' };
    }
    if (loopGuard.localLoop > loopGuard.remoteLoop) {
        return { record, status: 'safe-to-push-higher-loop' };
    }
    if (remoteStamp > localStamp + CLOUD_STALE_OVERWRITE_GUARD_MS) {
        record = await readFullCloudSaveForPull();
        applyExternalSave(record.save_data, getRemoteSaveStamp(record));
        setCloudMessage(options.automatic ? '클라우드 저장이 더 최신이라 로컬에 먼저 반영했습니다.' : '클라우드 저장이 더 최신이라 덮어쓰기를 막고 자동으로 불러왔습니다.');
        if (!options.silentLog) addLog('클라우드가 더 최신이라 자동으로 불러왔습니다.', 'loot-magic');
        return { record, status: 'pulled-remote' };
    }
    return { record, status: 'safe-to-push' };
}

/** The summary decided to pull: read the whole save once (a summary is never applied). */
async function readFullCloudSaveForPull() {
    let record = await fetchCloudSaveRecord();
    if (!record || !record.save_data) throw new Error('서버 저장을 다시 읽지 못해 불러오기를 멈췄습니다. 잠시 뒤 다시 확인합니다.');
    return record;
}

async function commitCloudSavePayload(payload, legacyBody, options = {}) {
    if (cloudState.revisionSupported !== true) {
        let rows = await cloudJsonRequest('/rest/v1/cloud_saves', {
            method: 'POST',
            expectedUserId: options.expectedUserId,
            headers: { Prefer: 'resolution=merge-duplicates,return=representation', 'Content-Type': 'application/json' },
            body: legacyBody || { user_id: cloudState.user.id, save_data: payload }
        });
        return Array.isArray(rows) ? rows[0] : null;
    }
    let rows = await cloudJsonRequest('/rest/v1/rpc/commit_cloud_save', {
        method: 'POST',
        expectedUserId: options.expectedUserId,
        headers: { 'Content-Type': 'application/json' },
        body: { expected_revision: options.expectedRevision ?? getLocalCloudRevision(), next_save_data: payload }
    });
    let result = Array.isArray(rows) ? rows[0] : rows;
    if (!result || result.committed !== true) {
        cloudState.lastRemoteRevision = Math.max(0, Math.floor(Number(result && result.current_revision) || 0));
        throw new Error('다른 기기에서 서버 저장이 변경되었습니다. 서버 저장을 불러온 뒤 다시 시도해주세요.');
    }
    return {
        revision: Math.max(0, Math.floor(Number(result.current_revision) || 0)),
        updated_at: result.saved_at || new Date().toISOString()
    };
}

/** After a commit the server matches this device: its time, loop and content print (the next unchanged auto upload is skipped). */
function rememberCloudUpload(saveData, syncedAt) {
    cloudState.lastRemoteUpdatedAt = syncedAt;
    cloudState.lastRemoteLoop = getSaveLoopNumber(game);
    cloudState.lastCloudCommitAt = Date.now();
    cloudState.lastUploadedFingerprint = cloudSaveFingerprint(saveData);
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
        remoteRecord = await fetchCloudSaveSummary();
    } catch (loadError) {
        console.warn('cloud push preflight remote load failed:', loadError);
        throw new Error('클라우드 상태를 확인할 수 없어 업로드를 중단했습니다: ' + (loadError.message || loadError));
    }
    let tFetch = Date.now();
    let loopGuard = shouldBlockLocalPushForRemoteLoop(remoteRecord);
    if (loopGuard.blocked) {
        setCloudMessage(loopGuard.message);
        throw new Error(loopGuard.message);
    }
    if (cloudState.revisionSupported === true && remoteRecord && getLocalCloudRevision() !== cloudState.lastRemoteRevision) {
        throw new Error('다른 기기에서 서버 저장이 변경되었습니다. 서버 저장을 불러온 뒤 다시 시도해주세요.');
    }
    markCurrentSaveCloudOwner();
    if (!persistLocalSave({ touchModifiedAt: options.touchModifiedAt === true })) {
        throw new Error('로컬 저장에 실패하여 클라우드 업로드를 중단했습니다.');
    }
    let requestBody;
    if (typeof createCloudSaveRequestBody === 'function') {
        requestBody = createCloudSaveRequestBody(cloudState.user.id, game);
    } else {
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        requestBody = JSON.stringify({ user_id: cloudState.user.id, save_data: payload });
    }
    let payloadSize = requestBody.length;
    if (payloadSize > 900000 && typeof addLog === 'function') addLog(`☁️ 클라우드 저장 데이터 최적화 적용 (${Math.round(payloadSize / 1024)}KB)`, 'attack-monster', { noToast: true });
    let tSerialize = Date.now();
    let request = JSON.parse(requestBody);
    let row = await commitCloudSavePayload(request.save_data, requestBody);
    let tUpload = Date.now();
    let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
    ensureSaveMeta();
    if (row && Number.isFinite(Number(row.revision))) {
        game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(row.revision)));
        cloudState.lastRemoteRevision = getLocalCloudRevision();
    }
    game.saveMeta.lastCloudSyncAt = syncedAt;
    rememberCloudUpload(request.save_data, syncedAt);
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

async function resolveCloudRevisionConflict(record, options = {}) {
    if (cloudState.revisionSupported !== true || !record || !record.save_data) return null;
    if (getLocalCloudRevision() === cloudState.lastRemoteRevision) return null;
    if (!options.preferRemoteOnResume) return null;
    let loopSummary = getLoopCompareSummary(record);
    if (loopSummary.localLoop > loopSummary.remoteLoop) {
        ensureSaveMeta();
        game.saveMeta.cloudRevision = cloudState.lastRemoteRevision;
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`로컬 루프(${loopSummary.localLoop})가 클라우드 루프(${loopSummary.remoteLoop})보다 높아 로컬 진행을 보존했습니다.`);
        return 'pushed-local-higher-loop-conflict';
    }
    let localStamp = getLocalSaveStamp();
    let remoteStamp = getRemoteSaveStamp(record);
    let keepLocal = false;
    if (localStamp > remoteStamp) {
        let localChoice = `루프 ${getSaveLoopNumber(game)}, 마지막 저장 ${formatCloudTime(localStamp)}`;
        let remoteChoice = `루프 ${getSaveLoopNumber(record.save_data)}, 마지막 저장 ${formatCloudTime(remoteStamp)}`;
        keepLocal = await requestGameConfirmation(
            `현재 기기 기록\n${localChoice}\n\n서버 기록\n${remoteChoice}`,
            { title: '저장 충돌', tone: 'danger', confirmLabel: '현재 기기 사용', cancelLabel: '서버 기록 사용' }
        );
    }
    if (keepLocal) {
        ensureSaveMeta();
        game.saveMeta.cloudRevision = cloudState.lastRemoteRevision;
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage('사용자 선택에 따라 현재 기기 진행으로 서버 저장을 교체했습니다.');
        return 'pushed-local-conflict-confirmed';
    }
    applyExternalSave(record.save_data, remoteStamp);
    setCloudMessage('저장 충돌에서 서버 저장을 선택했습니다.');
    return 'pulled-remote-conflict';
}

async function reconcileCloudSaveState(options = {}) {
    let preferRemoteOnResume = options.preferRemoteOnResume === true;
    // Keep the previous local cache intact until the active account's remote row is confirmed.
    // A temporary network failure must not erase an otherwise recoverable local cache.
    let record = await fetchCloudSaveRecord();
    let localPreparation = prepareLocalSaveForCloudSession({
        allowUnownedLocal: await settleUnlinkedLocalSave(record, options)
    });
    if (!record || !record.save_data) {
        if (localPreparation.adoptedUnowned || (options.createRemoteFromLocal && !localPreparation.replaced)) {
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
    if (options.strictRemoteResume === true && localPreparation.replaced) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage('계정에 연결된 클라우드 저장을 로컬에 적용했습니다.');
        if (!options.silent) addLog('계정 전환 시 클라우드 저장을 우선 적용했습니다.', 'loot-magic');
        return 'pulled-remote-strict-resume';
    }
    let loopGuard = shouldBlockLocalPushForRemoteLoop(record);
    if (loopGuard.blocked) {
        applyExternalSave(record.save_data, remoteStamp);
        setCloudMessage(loopGuard.message);
        if (!options.silent) addLog(loopGuard.message, 'loot-magic');
        return 'pulled-remote-higher-loop';
    }
    let revisionResolution = cloudState.revisionSupported === true
        ? await resolveCloudRevisionConflict(record, options) : null;
    if (revisionResolution) return revisionResolution;
    let loopSummary = getLoopCompareSummary(record);
    if (loopSummary.localLoop > loopSummary.remoteLoop) {
        await pushCloudSave({ touchModifiedAt: false });
        setCloudMessage(`로컬 루프(${loopSummary.localLoop})가 클라우드 루프(${loopSummary.remoteLoop})보다 높아 로컬 진행을 보존했습니다.`);
        if (!options.silent) addLog('더 높은 로컬 루프를 클라우드에 저장했습니다.', 'loot-magic');
        return 'pushed-local-higher-loop';
    }
    if (preferRemoteOnResume) {
        if (remoteStamp >= localStamp) {
            applyExternalSave(record.save_data, remoteStamp);
            setCloudMessage('이어하기는 서버 저장이 로컬보다 최신이거나 같은 상태라 클라우드를 적용했습니다.');
            if (!options.silent) addLog('이어하기(클라우드 우선)로 서버 저장을 적용했습니다.', 'loot-magic');
            return 'pulled-remote-resume-preferred';
        }
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

/** This device's guest save (unlinked, with progress) when an account takes the save slot (2026-10-03). It moves into the
 * account (only an account without a cloud save, and only past the simple tamper check in js/guest-save-check.js) or it is
 * deleted after asking. Nothing is copied aside, so one guest save never ends up in two accounts. Cancelling keeps the guest
 * save and drops the account link on this device. Returns whether the account adopts it. */
async function settleUnlinkedLocalSave(record, options) {
    if (getCloudSaveOwnerId() || isLikelyBootstrapLocalSave(game)) return options.allowLocalBootstrap === true;
    let fate = await chooseGuestSaveFate(record, options);
    if (fate !== 'keep') return fate === 'move';
    detachCloudSessionLocally();
    throw new Error('게스트 저장을 지키려고 계정 연결을 취소했습니다.');
}

async function chooseGuestSaveFate(record, options) {
    let label = `루프 ${getSaveLoopNumber(game)}, 레벨 ${Math.floor(Number(game.level) || 1)}`;
    if (record && record.save_data) return await confirmGuestSaveDeletion(`이 계정에는 이미 저장이 있어 이 기기의 게스트 저장(${label})은 옮길 수 없습니다.`);
    if (options.allowLocalBootstrap !== true) {
        let fate = await askGuestSaveFate(label);
        if (fate !== 'move') return fate;
    }
    let verdict = guestSaveCheck.inspect(game, Date.now());
    if (verdict.ok) return 'move';
    return await confirmGuestSaveDeletion(`정상 플레이로는 나올 수 없는 값이 있어 게스트 저장(${label})을 옮길 수 없습니다: ${verdict.problems.join(', ')}`);
}

async function askGuestSaveFate(label) {
    let fate = await requestGameChoice({
        kicker: '게스트 저장',
        title: '이 기기의 게스트 저장을 어떻게 할까요?',
        message: `게스트 저장(${label})은 계정 하나로 한 번만 옮길 수 있습니다.`,
        submitOnChoice: true,
        cancelLabel: '게스트로 계속',
        choices: [
            { value: 'move', label: '이 계정으로 옮기기', detail: '옮긴 저장은 다른 계정으로 옮길 수 없습니다.' },
            { value: 'discard', label: '지우고 새로 시작', detail: '게스트 저장은 지워집니다.' }
        ]
    });
    return fate || 'keep';
}

async function confirmGuestSaveDeletion(reason) {
    let accepted = await requestGameConfirmation(`${reason}\n계속하면 게스트 저장은 지워집니다.`,
        { title: '게스트 저장 지우기', tone: 'danger', confirmLabel: '지우고 계속', cancelLabel: '게스트로 계속' });
    return accepted ? 'discard' : 'keep';
}

/** Leave the signed-in account on this device only (the server session is not revoked) and keep using this device's save. */
function detachCloudSessionLocally() {
    markSkipOAuthRestoreOnce();
    clearSupabasePersistedSession();
    applyCloudSession(null);
    cloudState.linkedProviders = [];
    cloudState.lastRemoteUpdatedAt = 0;
    cloudState.lastRemoteLoop = 0;
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
/** Only clocks moved since the last upload: an upload would change nothing on the server. */
function isCloudSaveUnchangedSinceUpload() {
    return !!cloudState.lastUploadedFingerprint && cloudSaveFingerprint(createCloudSaveState(game)) === cloudState.lastUploadedFingerprint;
}

function markCloudSaveUnchanged() {
    cloudState.lastSyncAttemptAt = Date.now();
    cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game && game.saveMeta ? game.saveMeta.lastModifiedAt : 0));
}

function scheduleCloudAutoSync() {
    // 숨겨진 화면에서는 게임이 멈춰 있어 올릴 것이 없다(숨겨지는 순간의 업로드는 pushCloudSaveOnPageExit가 한다).
    if (!cloudState.configured || !cloudState.user || cloudState.busy || isStartupOverlayOpen() || document.hidden) return;
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
        if (!cloudState.pendingAutoSyncDirty || !isCloudSaveDirty() || document.hidden) return;
        cloudState.pendingAutoSyncDirty = false;
        if (isCloudSaveUnchangedSinceUpload()) return markCloudSaveUnchanged();
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
                await reconcileCloudSaveState({ silent: true, strictRemoteResume: true });
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
            caption: '계정 만들기',
            progress: 12
        });
    }
    setCloudMessage('회원가입을 진행 중입니다...');
    updateCloudSaveUI();
    try {
        let result = await requestSupabaseEmailSignUp(credentials);
        if (result && result.session && result.user) {
            applyCloudSession({ ...result.session, user: result.user });
            await refreshCloudLinkedIdentities();
            clearCloudPasswordInput();
            advanceLoadingOverlay({
                title: '첫 세이브를 연결하는 중...',
                detail: '새 계정에 현재 진행도를 연결하고 있습니다.',
                caption: '저장 연결',
                progress: 54
            });
            await reconcileCloudSaveState({ createRemoteFromLocal: true, allowLocalBootstrap: true });
            addLog('클라우드 계정을 만들고 저장을 연결했습니다.', 'loot-magic');
            if (options.enterGame) await enterGameWorld();
        } else {
            clearCloudPasswordInput();
            setCloudMessage('인증 메일을 보냈습니다. 메일에서 인증을 완료한 뒤 로그인해주세요.');
            if (options.enterGame) setLoadingOverlayState(false);
            await showSignupEmailNotice(credentials.email, false);
        }
    } catch (error) {
        setCloudMessage('회원가입 실패: ' + (error.message || error));
        if (options.enterGame) setLoadingOverlayState(false);
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

async function requestSupabaseEmailSignUp(credentials) {
    let client = getSupabaseClient();
    if (!client || !client.auth || typeof client.auth.signUp !== 'function') throw new Error('회원가입 클라이언트를 초기화하지 못했습니다.');
    let { data, error } = await client.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: { emailRedirectTo: getOAuthRedirectUrl() }
    });
    if (error) throw error;
    return data || {};
}

function showSignupEmailNotice(email, resent) {
    return requestGameDialog({
        type: 'notice',
        tone: 'success',
        kicker: '계정 인증',
        title: resent ? '인증 메일을 다시 보냈습니다' : '인증 메일을 보냈습니다',
        message: `${email}\n메일의 인증 링크를 누른 뒤 이 화면으로 돌아와 로그인해주세요.`,
        confirmLabel: '확인'
    });
}

async function resendSignupConfirmation() {
    if (cloudState.busy) return;
    let credentials = collectCloudCredentials();
    if (!credentials.email) return setCloudMessage('인증 메일을 받을 이메일을 입력해주세요.');
    let client = getSupabaseClient();
    if (!client || !client.auth || typeof client.auth.resend !== 'function') return setCloudMessage('인증 메일 재발송 기능을 초기화하지 못했습니다.');
    cloudState.busy = true;
    setCloudMessage('인증 메일을 다시 보내는 중입니다...');
    try {
        let { error } = await client.auth.resend({
            type: 'signup',
            email: credentials.email,
            options: { emailRedirectTo: getOAuthRedirectUrl() }
        });
        if (error) throw error;
        setCloudMessage('인증 메일을 다시 보냈습니다. 메일함을 확인해주세요.');
        await showSignupEmailNotice(credentials.email, true);
    } catch (error) {
        setCloudMessage('인증 메일 재발송 실패: ' + (error.message || error));
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}

safeExposeGlobals({ resendSignupConfirmation });

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
            caption: '계정 확인',
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
            detail: '같은 계정의 로컬과 클라우드 저장을 비교해 더 앞선 진행도를 적용합니다.',
            caption: '저장 동기화',
            progress: 58
        });
        await reconcileCloudSaveState({
            preferRemoteOnResume: true,
            strictRemoteResume: true
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


function applyPageExitCloudSaveResult(text, exitSave, fingerprint) {
    if (cloudState.busy || game !== exitSave || !text) return;
    let result = JSON.parse(text);
    result = Array.isArray(result) ? result[0] : result;
    if (!result || !result.committed) return;
    ensureSaveMeta();
    game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(result.current_revision) || 0));
    game.saveMeta.lastCloudSyncAt = result.saved_at ? (new Date(result.saved_at).getTime() || Date.now()) : Date.now();
    cloudState.lastRemoteRevision = game.saveMeta.cloudRevision;
    cloudState.lastSyncedLocalModifiedAt = Math.max(0, Number(game.saveMeta.lastModifiedAt || 0));
    cloudState.lastCloudCommitAt = Date.now();
    cloudState.lastUploadedFingerprint = fingerprint;
    persistLocalSave({ touchModifiedAt: false });
}

/** Body, headers and endpoint of the page-exit upload (the same RPC as a normal sync), with the content print. */
function buildPageExitCloudRequest(config) {
    let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
    let revisionEnabled = cloudState.revisionSupported === true;
    let body = JSON.stringify(revisionEnabled
        ? { expected_revision: getLocalCloudRevision(), next_save_data: payload }
        : { user_id: cloudState.user.id, save_data: payload });
    let headers = {
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${cloudState.session.access_token}`,
        'Content-Type': 'application/json',
        Prefer: revisionEnabled ? 'return=representation' : 'resolution=merge-duplicates,return=minimal'
    };
    let endpoint = config.supabaseUrl + (revisionEnabled ? '/rest/v1/rpc/commit_cloud_save' : '/rest/v1/cloud_saves');
    return { body, headers, endpoint, revisionEnabled, fingerprint: cloudSaveFingerprint(createCloudSaveState(game)) };
}

/** Uploaded a moment ago, or only clocks moved since the last upload: switching apps back and forth uploads once. */
function isPageExitCloudPushRedundant(fingerprint) {
    return fingerprint === cloudState.lastUploadedFingerprint || Date.now() - (cloudState.lastCloudCommitAt || 0) < CLOUD_EXIT_UPLOAD_MIN_GAP_MS;
}

/** Browsers refuse keepalive bodies over 64 KiB (most saves). A bigger save goes as a normal request: when the page is
 * only hidden (switching tabs or apps) it still finishes. sendBeacon cannot carry the Supabase auth headers. */
function sendPageExitCloudSave(request, reason, exitSave) {
    fetch(request.endpoint, {
        method: 'POST',
        headers: request.headers,
        body: request.body,
        keepalive: new Blob([request.body]).size <= CLOUD_KEEPALIVE_BODY_LIMIT
    }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
    }).then(text => {
        if (request.revisionEnabled) applyPageExitCloudSaveResult(text, exitSave, request.fingerprint);
    }).catch(error => {
        let msg = String((error && error.message) || error || '');
        let expectedAbort = /failed to fetch|networkerror|abort|cancel/i.test(msg);
        if (expectedAbort && reason === 'visibilitychange') {
            console.debug(`cloud save on ${reason} skipped by browser lifecycle:`, error);
        } else {
            console.warn(`cloud save on ${reason || 'page exit'} failed:`, error);
        }
    });
}

function pushCloudSaveOnPageExit(reason) {
    let config = getCloudConfig();
    if (cloudState.busy || cloudState.lastRemoteResetRevision > (game.saveMeta.cloudResetRevision || 0)) return false;
    if (typeof canPersistLocalSave === 'function' && !canPersistLocalSave()) return false;
    if (!config.enabled || !cloudState.user || !cloudState.user.id || !cloudState.session || !cloudState.session.access_token) return false;
    if (typeof isStartupOverlayOpen === 'function' && isStartupOverlayOpen()) return false;
    if (!gameplayStarted) return false;
    if (getCloudSaveOwnerId() !== getActiveCloudUserId()) return false;
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
    let exitSave = game;
    if (exitPushStartedAt - lastPageExitCloudPushAt < 1500) return false;
    try {
        markCurrentSaveCloudOwner();
        if (!persistLocalSave({ touchModifiedAt: true })) return false;
        ensureSaveMeta();
        let request = buildPageExitCloudRequest(config);
        if (isPageExitCloudPushRedundant(request.fingerprint)) return false;
        sendPageExitCloudSave(request, reason, exitSave);
        lastPageExitCloudPushAt = exitPushStartedAt;
        cloudState.lastSyncAttemptAt = exitPushStartedAt;
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
        markCurrentSaveCloudOwner();
        game.saveMeta.lastModifiedAt = Date.now();
        persistLocalSave({ touchModifiedAt: false });
        let t0 = Date.now();
        let payload = typeof createCloudSavePayload === 'function' ? createCloudSavePayload(game) : JSON.parse(JSON.stringify(game));
        let payloadBytes = JSON.stringify(payload).length;
        let tSerialize = Date.now();
        await fetchCloudSaveRecord();
        let row = await commitCloudSavePayload(payload, { user_id: cloudState.user.id, save_data: payload });
        let tUpload = Date.now();
        let syncedAt = row && row.updated_at ? (new Date(row.updated_at).getTime() || Date.now()) : Date.now();
        if (row && Number.isFinite(Number(row.revision))) {
            game.saveMeta.cloudRevision = Math.max(0, Math.floor(Number(row.revision)));
            cloudState.lastRemoteRevision = getLocalCloudRevision();
        }
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

/** 실행 중 오류: 전투 기록에는 짧은 한 줄만(1분에 한 번), 파일 경로가 든 스택은 콘솔에만 — 플레이어 기록을 스택으로
 * 덮어썼다(검토 6차). 게임은 계속 돈다. */
function noteRuntimeErrorInLog() {
    if (typeof addLog !== 'function') return;
    addLog('⚠️ 일시적인 오류가 있었습니다. 반복되면 새로고침해 주세요.', 'attack-monster', { rateKey: 'runtime-error', minIntervalMs: 60000 });
}

function reportFatalError(stage, error) {
    console.error(stage + ' failed:', error);
    if (stage === 'runtime') return noteRuntimeErrorInLog();
    try {
        showStartFailure(error);
    } catch (uiError) {
        console.error('fatal error UI update failed:', uiError);
    }
}

/** 시작 실패: 게임이 돌지 않으니 문의용 내용을 남기되, 스택은 접힌 '자세히' 안에 둔다. */
function showStartFailure(error) {
    const message = String((error && error.message) || error);
    const stack = String((error && error.stack) || '').split('\n').slice(0, 4).join('\n');
    [['ui-progress-label', '⚠️ 오류'], ['ui-move-time-text', '시작 실패'], ['ui-battlefield-caption', '게임을 시작하지 못했습니다. 새로고침해 주세요.']]
        .forEach(([id, text]) => { const node = document.getElementById(id); if (node) node.innerText = text; });
    const log = document.getElementById('log');
    if (!log) return;
    const detail = stack ? `<details><summary>자세히</summary><pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:12px;">${escapeHTML(stack)}</pre></details>` : '';
    log.innerHTML = `<div class="log-item attack-monster">⚠️ 게임을 시작하지 못했습니다: ${escapeHTML(message)}${detail}</div>`;
}

function recoverRuntimeState() {
    game = mergeDefaults(game || {});
    runUiGlobalFunction('ensureEncounterRun');
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
        refreshTabHeaderUiIfNeeded();
        calculateReachableNodes();
        refreshPassiveVisibility();
        normalizeSupportLoadout(false);
    }
    if (issues.length > 0) console.warn('[SmokeCheck] startup issues:', issues.join(', '));
}

/** Explicit reset only: commit a blank account save using the just-read server revision. */
async function resetCloudSaveProgress(userId, freshGame) {
    await fetchCloudSaveRecord();
    if (cloudState.revisionSupported !== true) throw new Error('안전한 초기화를 위해 서버의 저장 버전 기능 업데이트가 필요합니다.');
    let expectedRevision = cloudState.lastRemoteRevision;
    freshGame.saveMeta.cloudUserId = userId;
    freshGame.saveMeta.cloudResetRevision = expectedRevision + 1;
    let row = await commitCloudSavePayload(createCloudSavePayload(freshGame), undefined, { expectedRevision, expectedUserId: userId });
    freshGame.saveMeta.cloudRevision = row.revision;
    freshGame.saveMeta.lastCloudSyncAt = new Date(row.updated_at).getTime();
    cloudState.lastRemoteRevision = row.revision;
    cloudState.lastRemoteResetRevision = freshGame.saveMeta.cloudResetRevision;
    cloudState.lastRemoteLoop = 1;
    cloudState.lastSyncedLocalModifiedAt = freshGame.saveMeta.lastModifiedAt;
}

async function resetProgressStorage(userId) {
    let previousStatus = getLocalSaveStatus();
    let previousSkipUnload = window.__skipUnloadSaveOnce;
    let serverCommitted = false;
    let freshGame = cloneDefaultGame();
    freshGame.saveMeta.lastModifiedAt = Date.now();
    setLocalSaveRuntimeState('resetting', { writable: false, message: '진행 데이터를 초기화하는 중입니다.' });
    window.__skipUnloadSaveOnce = true;
    setLoadingOverlayState(true, { title: '진행 데이터 초기화', detail: '초기화가 끝날 때까지 기다려주세요.', caption: '저장 처리 중' });
    try {
        if (userId) {
            await resetCloudSaveProgress(userId, freshGame);
            serverCommitted = true;
            game = freshGame;
        }
        resetLocalSave(freshGame);
        game = freshGame;
        cloudState.pendingAutoSyncDirty = false;
        cloudState.pendingForcedSyncOptions = null;
        location.reload();
    } catch (error) {
        setLoadingOverlayState(false);
        window.__skipUnloadSaveOnce = previousSkipUnload;
        if (serverCommitted) {
            // Never resume or upload the pre-reset game after the server accepted the reset.
            setLocalSaveRuntimeState('write-failed', { writable: false, message: '서버 초기화는 완료했지만 기기 저장에 실패했습니다.' });
            gameplayStarted = false;
            setStartupOverlayActive(true);
            throw new Error('서버 초기화는 완료했지만 기기 저장에 실패했습니다. 저장공간을 확인한 뒤 서버 기록으로 이어가세요. ' + error.message);
        }
        setLocalSaveRuntimeState(previousStatus.status, previousStatus);
        throw error;
    }
}

async function resetGame() {
    if (cloudState.busy) return showGameToast('저장 처리가 끝난 뒤 다시 시도해주세요.', { tone: 'warning' });
    let userId = getActiveCloudUserId();
    let target = userId ? `로그인 계정 (${cloudState.user.email || userId})의 서버 기록과 이 기기 기록` : '이 기기의 진행 데이터';
    cloudState.busy = true;
    updateCloudSaveUI();
    try {
        if (!await requestGameConfirmation(`${target}를 초기화합니다.\n처음부터 다시 시작하며 되돌릴 수 없습니다.`, {
            title: userId ? '계정 진행 초기화' : '기기 진행 초기화', tone: 'danger', confirmLabel: '진행 초기화'
        })) return;
        if (getActiveCloudUserId() !== userId) throw new Error('로그인 계정이 변경되었습니다. 초기화 대상을 다시 확인해주세요.');
        await resetProgressStorage(userId);
    } catch (error) {
        console.error('resetGame failed:', error);
        setCloudMessage('초기화하지 못했습니다: ' + error.message);
        showGameToast('초기화하지 못했습니다: ' + error.message, { tone: 'danger', duration: 8000 });
    } finally {
        cloudState.busy = false;
        updateCloudSaveUI();
    }
}


function renderBattlefieldThrottled(frameNow) {
    // The scrolling exploration camera needs 60 Hz on desktop. Keep the existing
    // arena/mobile limits, and retain fractional timing on high-refresh displays.
    const exploration = !!actExplorationState.current(game);
    // 관리 창이 열려도 같은 간격으로 그린다. 예전에는 10fps로 늦췄는데, 창과 반투명 기록 창 사이로 보이는 전장이 뚝뚝 끊겼다
    // (2026-10-07 사용자 요청). 창 속 단추 수백 개를 매 프레임 다시 계산하던 CSS 무효화(css/exploration-atlas.css)를 고친 뒤,
    // CPU 4배 감속에서 장비 창을 연 채 59fps로 그려도 메인 스레드 사용률은 10fps 때와 같았고 끊긴 프레임은 줄었다.
    const interval = exploration ? uiDisplay.explorationFrameMs : uiDisplay.battleFrameMs;
    const elapsed = frameNow - lastBattlefieldRenderAt;
    // Allow sub-millisecond RAF jitter without increasing the desktop's existing paint cadence.
    if (elapsed + 0.5 < interval) return;
    lastBattlefieldRenderAt = exploration
        ? lastBattlefieldRenderAt + Math.max(1, Math.floor((elapsed + 0.5) / interval)) * interval : frameNow;
    updateMobileBattlePipVisibility();
    // 전투 탭에서 캔버스가 실제로 보일 때만 풀 렌더한다.
    // 다른 탭의 모바일 PiP는 별도의 적응형 루프가 렌더 직후 곧바로 복사하므로,
    // 여기서 매 프레임 다시 복사하면 같은 화면을 30~45fps로 중복 복사하게 된다.
    // (전투 탭일 때 PiP는 숨겨져 어차피 복사가 일어나지 않는다.)
    renderBattlefield(false, interval);
}

/** '안내 중 전투 일시 정지'(설정): 안내 카드가 떠 있거나, 따라 하기의 대상 화면(젬 · 스킬트리 …)이 열려 있는 동안 — 첫 젬을
 * 따라 장착하는 사이 기본 공격으로 싸우다 쓰러졌다(검토 7차). 대상 화면을 떠나면(띠가 한 줄로 접히면) 전투가 다시 돈다. */
function isTutorialPausingCombat() {
    if (!(game.settings && game.settings.pauseGameOnOverlay)) return false;
    return (isTutorialOpen() && tutorialActionUi.requiresAttention(activeTutorial)) || tutorialActionUi.holdsQueue();
}

function scheduleGameLoop() {
    if (gameLoopFrameHandle !== null || isStartupOverlayOpen()) return;
    gameLoopFrameHandle = requestAnimationFrame(gameLoop);
}

function gameLoop(frameNow = performance.now()) {
    gameLoopFrameHandle = null;
    try {
        if (isBattlePresentationSuspended()) return;
        runForegroundExplorationFrame(frameNow);
        actExplorationUi.render();
        // 백그라운드 재계산 중에는 캔버스 렌더를 쉬어 계산 청크에 프레임을 양보한다.
        // RAF timestamps share the display clock; callback execution can be delayed by combat/UI work.
        showNextTutorial();
        let tutorialPause = isTutorialPausingCombat();
        if (tutorialPause || isRewardOpen() || isLoopHeroSelectOpen()) {
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
        scheduleGameLoop();
    }
}

// Phase-4 extracted unlock/class/tab helper block.

function isJewelTabUnlockReady() {
    return (game.season || 1) >= 5
        || bagItems.jewels().length > 0
        || ((game.currencies || {}).jewelShard || 0) > 0;
}

function isCodexTabUnlockReady() {
    return (game.inventory || []).some(item => item && item.rarity === 'unique')
        || Object.values(game.equipment || {}).some(item => item && item.rarity === 'unique')
        || Object.keys(game.uniqueCodex || {}).length > 0;
}

// 저널은 루프를 건너 유지되는 영구 기록(해금 항목·영구 보너스·패시브 포인트)이다.
// 한 번 첫 기록을 얻으면 다시 잠기지 않아야 한다. 도감이 열려 있으면 기록 메뉴도 함께 연다.
function isJournalTabUnlockReady() {
    let entries = Array.isArray(game.journalEntries) ? game.journalEntries : [];
    return entries.some(id => id && id !== 'prologue') || !!(game.unlocks && game.unlocks.codex);
}

function checkUnlocks() {
    storyJournalUi.sync();
    let u = game.unlocks;
    let starterTutorialGem = getStarterGemTutorialTarget();
    if (typeof stumpBoxUi === 'object') stumpBoxUi.checkStumpBoxUnlock();
    if (!(game.seenTutorials || []).includes('tutorial_battle_basics')) {
        queueTutorialNotice('tutorial_battle_basics', '첫 여정', '전투는 자동입니다. 캐릭터가 알아서 걷고 공격합니다.\n지금 할 일은 오른쪽 위 ‘목표’에 나옵니다.\n생명 구슬이 자주 비면 장비와 저항을 점검하세요.\n장비나 젬을 얻으면 그때마다 조작을 안내합니다.');
    }
    if (game.level >= 2 && !u.char) {
        u.char = true;
        game.noti.char = true;
        queueTutorialNotice('unlock_char', '스킬트리', '레벨 2가 되어 스킬트리 포인트를 얻었습니다.\n‘스킬트리’에서 시작 지점과 이어진 노드를 골라 찍으세요.', 'tab-char');
    }
    if ((game.inventory.length > 0 || Object.values(game.currencies).some(v => v > 0)) && !u.items) {
        u.items = true;
        game.noti.items = true;
        queueTutorialNotice('unlock_items', '첫 장비', '장비나 제작 재화를 처음 얻었습니다.\n‘장비’에서 아이템을 눌러 지금 착용한 장비와 비교하고 착용하세요.', 'tab-items');
    }
    if (isJewelTabUnlockReady()) {
        queueContentNotice('unlock_jewel', '주얼', 'jewel', { open: '주얼을 모을 수 있게 되었습니다.\n장비를 선택해 [소켓]에서 주얼을 끼우세요. 반지, 목걸이, 허리띠에는 소켓이 처음부터 있습니다.',
            locked: '주얼과 주얼 결정을 모을 수 있게 되었습니다.\n‘해금’에서 주얼을 열면 장비 소켓에 끼울 수 있습니다.' }, 'tab-items');
    }
    contentUnlockUi.announceStarterGem(starterTutorialGem);
    queueStarterGuides(game);
    if ((game.skills.length > 1 || game.supports.length > 0) && !u.skills && !starterTutorialGem) {
        u.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('unlock_skills', '새 스킬 젬', '새 젬을 얻었습니다.\n‘스킬 젬’에서 젬을 눌러 효과를 보고 공격 젬을 바꿔 보세요.', 'tab-skills');
    }
    // 도감이 잠겨 있을 때만 인벤토리 전체를 훑는다. (이미 해금된 뒤에도 매 드랍마다
    // O(인벤토리) 스캔을 돌면 대량 처치/드랍 시 스파이크가 생긴다.)
    if (!u.codex) {
        if (isCodexTabUnlockReady()) {
            u.codex = true;
            game.noti.codex = true;
            queueContentNotice('unlock_codex', '첫 고유 장비', 'codex', { open: '고유 장비를 처음 얻었습니다.\n‘기록 → 도감’에 등록하면 도감 보너스를 받습니다.',
                locked: '고유 장비를 처음 얻었습니다.\n‘해금’에서 고유 도감을 열면 등록해 도감 보너스를 받을 수 있습니다.' }, 'tab-codex');
        }
    }
    if (game.maxZoneId >= 1 && !u.map) {
        u.map = true;
        game.noti.map = true;
        queueTutorialNotice('unlock_map', '지도 개방', '다음 액트가 열렸습니다.\n‘지도’에서 지나온 액트로 돌아가 다시 사냥하거나, 마친 액트의 보상을 받을 수 있습니다.', 'tab-map');
    }
    reconcileBeyondBoundaryUnlock(game);
    let boundaryState = ensureBeyondBoundaryState(game);
    if (boundaryState.unlocked && !boundaryState.unlockNoticeSeen) {
        boundaryState.unlockNoticeSeen = true;
        game.noti.map = true;
        let boundaryButton = document.getElementById('btn-map-explore-beyond');
        if (boundaryButton) {
            boundaryButton.style.display = '';
            boundaryButton.classList.add('map-explore-tab-unlock-reveal');
            setTimeout(() => boundaryButton.classList.remove('map-explore-tab-unlock-reveal'), 1400);
        }
        queueTutorialNotice('unlock_beyond_boundary', '경계 너머', '완전한 수관과 최종 관문 너머로 끝없는 도전이 열렸습니다.\n‘지도 → 탐험 → 경계 너머’에서 단계를 고르고 키울 경계 인장을 정하세요.', 'tab-map');
    }
    if (game.season > 1 && !u.season) {
        u.season = true;
        game.noti.season = true;
        contentUnlockUi.announceLoop();
    }
    if (((game.completedTrials || []).length > 0 || game.ascendPoints > 0 || !!game.ascendClass) && !u.traits) {
        u.traits = true;
        game.noti.traits = true;
        queueContentNotice('unlock_traits', '전직', 'trials', { open: '전직을 고를 수 있게 되었습니다.\n‘스킬트리 → 전직’에서 직업의 전직 셋 중 하나를 고르세요.\n전직 패시브 포인트와 키스톤 포인트는 서로 다른 노드에 씁니다.',
            locked: '전직을 고를 수 있게 되었습니다.\n‘해금’에서 전직을 열면 전직과 전직 패시브를 고를 수 있습니다.' }, 'tab-traits');
    }
    if (typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked() && !game.chaosInfuserUnlocked) {
        game.chaosInfuserUnlocked = true;
        game.noti.items = true;
        addLog('🧪 나무꾼의 흔적을 해석해 혼돈 주입이 열렸습니다. 장비 상세의 [주입]으로 희귀 장비에 한 줄을 더할 수 있습니다.', 'loot-unique');
    }
    if (game.level >= 200) unlockJournalEntry('level_200');
    if (game.level >= 100 && (game.completedTrials || []).includes('trial_3') && !(game.unlockedTrials || []).includes('trial_4')) {
        game.unlockedTrials.push('trial_4');
        game.noti.map = true;
        addLog('🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!', 'loot-unique');
    }
    contentUnlockUi.syncOpened();
    detectNewMapUnlockAlarms();
    announceMapPrimaryContentUnlocks();
}

function isSeasonNodeRequirementMet(node) {
    if (node && node.inner && !isSeasonTreeEvolved()) return false;
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
    const node = PASSIVE_TREE.nodes[nodeId];
    if (nodeId === getPassiveTreeRootNodeId() || node?.kind === 'start' || !game.passives.includes(nodeId)) return false;
    const remaining = { ...game, passives: game.passives.filter(id => id !== nodeId) };
    const connected = passiveRouting.connected(remaining, PASSIVE_TREE, getPassiveRouting(remaining));
    return connected.length === remaining.passives.length
        && passiveRouting.pointBudget(game) + passiveRouting.paleBonus(remaining) >= remaining.passives.length;
}

function refundPassiveNode(id) { if (!assertBuildEditable()) return;
    game.passives = Array.isArray(game.passives) ? game.passives : [];
    const node = PASSIVE_TREE.nodes[id];
    if (!game.passives.includes(id) || (node && node.kind === 'start')) return;
    if ((game.currencies.blightSpore || 0) < 1) return addLog('패시브 노드 반환에는 마름병 포자 1개가 필요합니다.', 'attack-monster');
    if (!canRefundPassiveNode(id)) return addLog('연결 유지에 필요한 노드는 반환할 수 없습니다.', 'attack-monster');
    const budget = passiveRouting.pointBudget(game);
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.passives = game.passives.filter(nodeId => nodeId !== id);
    if (typeof clearPassiveAttributeChoice === 'function') clearPassiveAttributeChoice(id);
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + 1;
    passiveRouting.settlePoints(game, budget);
    calculateReachableNodes();
    addLog(`패시브 노드 반환: ${escapeHTML(getPassiveNodeDisplayName(node))} (마름병 포자 1개 소모)`, 'season-up');
    updateStaticUI();
}

async function askRefundSeasonNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation('선택한 루프 패시브를 반환하고 마름병 포자 1개를 소모합니다.', {
        title: '루프 패시브 반환',
        tone: 'danger',
        confirmLabel: '노드 반환'
    })) return;
    return refundSeasonNode(id);
}

function refundSeasonNode(id) { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (!game.seasonNodes.includes(id)) return;
    let nodeDef = getSeasonPassiveNodeDef(id);
    let ownsInnerCircleNode = Object.keys(SEASON_INNER_NODES || {}).some(key => game.seasonNodes.includes(key));
    if (nodeDef && !nodeDef.inner && ownsInnerCircleNode) return addLog('내부 마법진 패시브를 먼저 반환해야 우로보로스 몸통을 해제할 수 있습니다.', 'attack-monster');
    let blockers = getAllSeasonPassiveNodeIds().filter(key => {
        if (key === id || !game.seasonNodes.includes(key)) return false;
        let req = (getSeasonPassiveNodeDef(key) || {}).req;
        if (!req) return false;
        if (Array.isArray(req)) return req.includes(id) && req.filter(v => v !== id).every(v => !game.seasonNodes.includes(v));
        return req === id;
    });
    if (blockers.length > 0) return addLog('선행 조건으로 연결된 루프 패시브가 있어 반환할 수 없습니다.', 'attack-monster');
    if ((game.currencies.blightSpore || 0) < 1) return addLog('루프 패시브 반환에는 마름병 포자 1개가 필요합니다.', 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    let lv = getSeasonNodeLevel(id);
    game.seasonNodes = game.seasonNodes.filter(nodeId => nodeId !== id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    delete game.seasonNodeLevels[id];
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + lv;
    updateStaticUI();
}

async function askRefundAscendNode(id) { if (!assertBuildEditable()) return;
    if (!await requestGameConfirmation('선택한 전직 패시브를 반환하고 마름병 포자 1개를 소모합니다.', {
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
    if ((game.currencies.blightSpore || 0) < 1) return addLog('전직 패시브 반환에는 마름병 포자 1개가 필요합니다.', 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.ascendNodes = game.ascendNodes.filter(nodeId => nodeId !== id);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + 1;
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function canInvestSeasonNode(node, id) {
    return contentProgression.isUnlocked('loopTree') && !!node
        && (game.season || 1) >= getSeasonPassiveUnlockLoop(id) && isSeasonNodeRequirementMet(node);
}

function getSeasonNodeCap(node) {
    return node && node.inner ? 1 : (isSeasonTreeEvolved() ? 5 : 1);
}

/** True when a loop point buys something now: a ring node its loop and links allow below its cap, or a loop-10 stat
 * at its price. The goal notice stays quiet otherwise, e.g. while the next nodes wait for loop 5 (2026-10-04). */
function hasSpendableSeasonPoint() {
    const points = Math.max(0, Math.floor(game.seasonPoints || 0));
    if (points <= 0) return false;
    if ((game.season || 1) >= 10 && ['flatHp', 'flatDmg', 'aspd', 'move'].some(key => getLoop10StatCost(key) <= points)) return true;
    return getAllSeasonPassiveNodeIds().some(id => {
        const node = getSeasonPassiveNodeDef(id);
        return canInvestSeasonNode(node, id) && getSeasonNodeLevel(id) < getSeasonNodeCap(node);
    });
}

async function buySeason(id) { if (!assertBuildEditable()) return;
    let node = getSeasonPassiveNodeDef(id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (!canInvestSeasonNode(node, id)) return;
    let lv = getSeasonNodeLevel(id);
    let cap = getSeasonNodeCap(node);
    if (lv >= cap && lv > 0) {
        if (!await requestGameConfirmation('이미 최대 단계인 노드입니다.\n마름병 포자 1개를 사용해 반환하시겠습니까?', {
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
            if (!canStoreEquipmentItems([shield], game)) {
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
        if (!canStoreEquipmentItems([shield], game)) {
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
    if ((game.currencies.blightSpore || 0) < 1) return addLog('키스톤 환불에는 마름병 포자 1개가 필요합니다.', 'attack-monster');
    if (!await requestGameConfirmation('선택한 키스톤을 반환하고 마름병 포자 1개를 소모합니다.', {
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
    if ((game.currencies.blightSpore || 0) < 1) return addLog('확인 중 마름병 포자가 부족해져 반환을 취소했습니다.', 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - 1);
    game.ascendKeystones = game.ascendKeystones.filter(key => key !== id);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + 1;
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState([id]);
    updateStaticUI();
}

async function resetAscendKeystones() { if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return;
    let cost = game.ascendKeystones.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`키스톤 전체 초기화에는 마름병 포자 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`선택한 키스톤을 모두 반환하고 마름병 포자 ${cost}개를 소모합니다.`, {
        title: '키스톤 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.length <= 0) return addLog('확인 중 키스톤 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    cost = game.ascendKeystones.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`확인 중 마름병 포자가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    if (game.ascendKeystones.includes('w3') && !enforceWarriorDualTrainingEquipment(false)) return;
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0)) + game.ascendKeystones.length;
    let removedKeystones = game.ascendKeystones.slice();
    game.ascendKeystones = [];
    if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(removedKeystones);
    updateStaticUI();
}

async function resetSeasonNodes() { if (!assertBuildEditable()) return;
    game.seasonNodes = Array.isArray(game.seasonNodes) ? game.seasonNodes : [];
    if (game.seasonNodes.length <= 0) return;
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    let totalLv = game.seasonNodes.reduce((s, id) => s + Math.max(1, Math.floor(game.seasonNodeLevels[id] || 1)), 0);
    let cost = game.seasonNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`루프 패시브 전체 초기화에는 마름병 포자 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`루프 패시브를 모두 초기화하고 마름병 포자 ${cost}개를 소모합니다.`, {
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
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`확인 중 마름병 포자가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.seasonPoints = Math.max(0, Math.floor(game.seasonPoints || 0)) + totalLv;
    game.seasonNodes = [];
    game.seasonNodeLevels = {};
    updateStaticUI();
}

async function resetAscendNodes() { if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return;
    let cost = game.ascendNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`전직 패시브 트리 전체 초기화에는 마름병 포자 ${cost}개가 필요합니다.`, 'attack-monster');
    if (!await requestGameConfirmation(`전직 패시브 트리를 모두 초기화하고 마름병 포자 ${cost}개를 소모합니다.`, {
        title: '전직 패시브 전체 초기화',
        tone: 'danger',
        confirmLabel: '전체 초기화'
    })) return;
    if (!assertBuildEditable()) return;
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    if (game.ascendNodes.length <= 0) return addLog('확인 중 전직 패시브 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    cost = game.ascendNodes.length;
    if ((game.currencies.blightSpore || 0) < cost) return addLog(`확인 중 마름병 포자가 부족해졌습니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.blightSpore = Math.max(0, Math.floor(game.currencies.blightSpore || 0) - cost);
    game.ascendPoints = Math.max(0, Math.floor(game.ascendPoints || 0)) + game.ascendNodes.length;
    game.ascendNodes = [];
    normalizeSupportLoadout(true);
    updateStaticUI();
}

async function selectClass(key) {
    // 직업마다 전직 셋 중에서 고른다(2026-10-02 전직 18종).
    if (!isAscendancyOfClass(key, game.selectedClassId)) return;
    if (await requestGameConfirmation(`[${CLASS_TEMPLATES[key].name}] 전직을 선택합니다.\n이번 루프에는 다시 변경할 수 없습니다.`, {
        title: '전직 선택',
        confirmLabel: '이 전직 선택'
    })) {
        let previousKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones.slice() : [];
        game.ascendClass = key;
        game.ascendKeystones = [];
        if (typeof clearAscendKeystoneRuntimeState === 'function') clearAscendKeystoneRuntimeState(previousKeystones, { force: true });
        updateStaticUI();
    }
}

/** 전직 고르기 카드: 이름, 한 줄 설명, 노드 능력치. 이번 루프에는 바꿀 수 없으니 고를 근거를 한 줄 더 준다. */
/** 노드 n1~n9가 주는 능력치 이름(처음 나온 순서, 같은 이름은 한 번, 넷까지). 자리 규칙을 통째로 바꾼 전직(크루세이더)도 실제 노드대로. */
function getAscendancyNodeFocus(key) {
    const tree = getClassTreeDef(key), labels = [];
    ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9'].forEach(id => {
        const node = tree[id];
        (node ? (node.stats || [node]) : []).forEach(line => {
            const label = String(getStatName(line.stat)).replace(/\s*\(%\)$/, '');
            if (line.stat && !labels.includes(label)) labels.push(label);
        });
    });
    return labels.slice(0, 4);
}

function renderAscendancyPickCard(key) {
    return ascendancyTreeUi.pickCardHtml(key);
}

/** 전직 고르기 화면: 지난 루프의 전직이 이 직업의 것이면 격자 위에 '지난 루프처럼' 카드, 격자에는 전직 셋. */
function fillAscendancyPickScreen() {
    const planBox = document.getElementById('ui-class-plan');
    if (planBox) planBox.innerHTML = renderLastLoopPlanCard();
    document.getElementById('ui-class-grid').innerHTML = getAscendanciesForClass(game.selectedClassId).map(renderAscendancyPickCard).join('');
}

function renderLastLoopPlanCard() {
    const plan = getUsableLastLoopAscendPlan();
    return plan ? `<button type="button" class="class-card ascend-plan-card" onclick="chooseLastLoopAscendPlan()"><strong>지난 루프처럼: ${CLASS_TEMPLATES[plan.ascendClass].name}</strong><span>노드 ${plan.nodes.length}개와 키스톤 ${plan.keystones.length}개를 포인트만큼 같은 순서로 다시 고릅니다.</span></button>` : '';
}

/** 루프 초기화 때 기억한 전직 배치(state.js rememberLoopAscendancyPlan). 지금 직업이 고를 수 있는 전직일 때만 쓴다. */
function getUsableLastLoopAscendPlan() {
    const plan = game.lastLoopAscendPlan;
    return plan && CLASS_TEMPLATES[plan.ascendClass] && isAscendancyOfClass(plan.ascendClass, game.selectedClassId) ? plan : null;
}

/** 계획의 노드와 키스톤을 순서대로, 포인트와 선행 조건이 허락하는 것만 산다(살 수 없는 줄은 건너뛰어 기록을 남기지 않는다). */
function allocateLastLoopAscendPlan(plan) {
    let placed = 0;
    plan.nodes.forEach(id => {
        const node = getClassTreeDef(game.ascendClass)[id];
        const blocked = !node || game.ascendPoints <= 0 || game.ascendNodes.includes(id) || (node.exclusive && game.ascendNodes.includes(node.exclusive));
        if (blocked || !isAscendNodeRequirementMet(node)) return;
        buyAscend(id);
        placed += game.ascendNodes.includes(id) ? 1 : 0;
    });
    plan.keystones.forEach(id => {
        const node = getClassKeystoneDefs(game.ascendClass).find(row => row.id === id);
        const blocked = !node || game.ascendKeystonePoints <= 0 || game.ascendKeystones.includes(id) || game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT;
        if (blocked || !isAscendKeystoneRequirementMet(node)) return;
        buyAscendKeystone(id);
        placed += game.ascendKeystones.includes(id) ? 1 : 0;
    });
    return placed;
}

async function chooseLastLoopAscendPlan() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || game.ascendClass || !assertBuildEditable()) return;
    const name = CLASS_TEMPLATES[plan.ascendClass].name;
    if (!await requestGameConfirmation(`[${name}] 전직을 선택하고 지난 루프의 배치를 다시 고릅니다.\n이번 루프에는 전직을 다시 변경할 수 없습니다.`, { title: '지난 루프처럼', confirmLabel: '이 전직 선택' })) return;
    game.ascendClass = plan.ascendClass;
    game.ascendKeystones = [];
    game.ascendNodes = Array.isArray(game.ascendNodes) ? game.ascendNodes : [];
    const placed = allocateLastLoopAscendPlan(plan);
    addLog(`[${name}] 지난 루프 배치: ${placed}개를 다시 골랐습니다.`, 'season-up');
    updateStaticUI();
}

/** 트리 요약 아래 '이어 하기': 지난 루프와 같은 전직이고, 계획에 남은 줄과 쓸 포인트가 있을 때만. */
function getAscendancyPlanContinueHtml() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || plan.ascendClass !== game.ascendClass) return '';
    const nodesLeft = game.ascendPoints > 0 && plan.nodes.some(id => !game.ascendNodes.includes(id));
    const keystonesLeft = game.ascendKeystonePoints > 0 && plan.keystones.some(id => !game.ascendKeystones.includes(id));
    return nodesLeft || keystonesLeft ? '<button type="button" class="ascend-plan-continue" onclick="continueLastLoopAscendPlan()">지난 루프 배치 이어 하기</button>' : '';
}

function continueLastLoopAscendPlan() {
    const plan = getUsableLastLoopAscendPlan();
    if (!plan || plan.ascendClass !== game.ascendClass || !assertBuildEditable()) return;
    const placed = allocateLastLoopAscendPlan(plan);
    addLog(placed > 0 ? `지난 루프 배치: ${placed}개를 더 골랐습니다.` : '지금 고를 수 있는 다음 노드나 키스톤이 없습니다.', placed > 0 ? 'season-up' : 'attack-monster');
    updateStaticUI();
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

/** 잠긴 화면을 열려 할 때: 기록에 여는 조건을 남기고, 하단 메뉴의 잠금 칸을 눌렀다면 알림으로도 보여 준다. */
function notifyLockedTab(tabId) {
    let reservedCell = !!document.getElementById('btn-' + tabId)?.classList.contains('nav-locked');
    addLog(getLockedTabMessage(tabId), 'attack-monster', { toast: reservedCell });
}

function getLockedTabMessage(tabId) {
    if (tabId === 'tab-char') return '레벨 2에 도달하면 스킬트리가 열립니다.';
    if (tabId === 'tab-season') return '루프 1을 클리어하면 루프 탭이 열립니다.';
    if (tabId === 'tab-items') return '장비나 제작 재화를 얻으면 장비/제작 탭이 열립니다.';
    if (tabId === 'tab-skills') return '새 스킬 젬이나 보조 젬을 획득하면 스킬 젬 탭이 열립니다.';
    if (tabId === 'tab-codex') return '첫 고유 아이템을 획득하면 도감 탭이 열립니다.';
    if (tabId === 'tab-map') return '액트 1을 마치면 지도가 열립니다.';
    if (tabId === 'tab-traits') return '전직 시련을 통과하면 전직 탭이 열립니다.';
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
      '무기':[ ['pctDmg',8,24,2], ['spellFlatPct',6,18,2], ['projectileExtraChance',50,50,3], ['resPen',5,14,2], ['physIgnore',5,14,2], ['flatDmg',12,38,1] ],
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
    const choice = await underworldRuneUi.chooseGrowth(false);
    if (!choice) return;
    const {state, no, level, cost} = choice;
    Object.entries(cost).forEach(([key, value]) => { game.currencies[key] -= value; });
    state.enhanceLvByNo[no] = level + 1;
    ensureUnderworldRuneBonusMilestones(no);
    addLog(`룬 강화 성공: ${getUnderworldRuneDef(no).name} +${level+1} (보너스 옵션 ${state.bonusLinesByNo[no].length}줄)`, 'loot-unique');
    updateStaticUI(); queueImportantSave(200);
}
async function rerollUnderworldRuneBonus(){
    const choice = await underworldRuneUi.chooseGrowth(true);
    if (!choice) return;
    const {state, no, level, cost} = choice;
    const lineCount = level >= 15 ? 3 : (level >= 10 ? 2 : 1);
    Object.entries(cost).forEach(([key, value]) => { game.currencies[key] -= value; });
    state.bonusLinesByNo[no] = Array.from({length:lineCount}, () => rollUnderworldRuneBonusLine());
    const text = state.bonusLinesByNo[no].map(row => `${getStatName(row.stat)} +${formatValue(row.stat,row.val)}`).join(' / ');
    addLog(`룬 옵션 리롤: ${getUnderworldRuneDef(no).name}, ${text}`, 'season-up');
    updateStaticUI(); queueImportantSave(200);
}
