// Phase-2 extracted UI/tab/render helper block.
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {

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

function uiPlayerStatDefaultTable() {
    if (!uiPlayerStatDefaults) {
        uiPlayerStatDefaults = getDefaultUiPlayerStats();
        delete uiPlayerStatDefaults.breakdowns; // each normalized table gets its own breakdowns object below
    }
    return uiPlayerStatDefaults;
}

/** Every numeric default's key holds a finite number afterwards; a kept number is left as it is. */
function coerceUiPlayerStatNumbers(normalized, defaults) {
    for (const key in defaults) {
        if (key === 'breakdowns') continue;
        let value = normalized[key];
        if (typeof value === 'number' && Number.isFinite(value)) continue;
        value = Number(value);
        normalized[key] = Number.isFinite(value) ? value : defaults[key];
    }
}

function normalizeUiPlayerStats(stats, fallback = {}) {
    let fromFallback = !!((stats && stats.__uiFallbackStats) || (fallback && fallback.__uiFallbackStats));
    let numericDefaults = uiPlayerStatDefaultTable();
    let normalized = Object.assign({}, numericDefaults, fallback || {}, (stats && typeof stats === 'object') ? stats : {});
    if (fromFallback) normalized.__uiFallbackStats = true;
    coerceUiPlayerStatNumbers(normalized, numericDefaults);
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
    return value < 0 ? _t('받는 피해 감소: {pct}%', { pct }) : _t('받는 피해 증가: {pct}%', { pct });
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
        className: classDef ? classDef.name : '미전직',
        ascended: !!classDef
    };
}

/** HUD 이름표: 직업과 전직(전직 전이면 미전직). 휴대폰 세로의 이름표는 전직한 뒤 전직 이름만 보인다(data-ascended, css/themes/pixel-hud.css). */
function renderPlayerHudIdentity(identity) {
    setTextById('ui-player-name-label', identity.name);
    setTextById('ui-player-class-label', identity.className);
    let row = document.querySelector('#battle-column .player-hud-identity-row');
    if (row) row.toggleAttribute('data-ascended', identity.ascended);
}

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
        title: _t('전장을 준비하는 중...'),
        detail: _t('첫 전투에 필요한 그림을 불러오고 있습니다.'),
        caption: _t('전투 그림 불러오기'),
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
            detail: _t('일부 그림을 불러오지 못해 기본 그림으로 준비합니다.'),
            caption: _t('기본 그림 사용'),
            progress: 92
        });
    } else {
        advanceLoadingOverlay({
            detail: _t('전장 준비를 마쳤습니다.'),
            caption: _t('준비 완료'),
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
        host.setAttribute('role', 'region');
        host.setAttribute('aria-label', '작은 전투 화면');
        host.dataset.i18nAttr = 'aria-label';
        host.innerHTML = '<button type="button" class="mobile-battle-pip-preview" data-pip-return data-i18n-attr="aria-label" aria-label="전투 화면으로 이동"><canvas width="320" height="180" aria-hidden="true"></canvas></button>'
            + '<div class="mobile-battle-pip-actions"><button type="button" data-pip-return data-i18n class="mobile-battle-dock-label">전투로</button>'
            + '<button type="button" data-pip-toggle aria-expanded="true" aria-label="작은 전투 화면 접기">접기</button></div>';
        i18n.applyStatic(host);
        setMobileBattlePipCollapsed(host, false);
        host.addEventListener('click', event => {
            const toggle = event.target.closest('[data-pip-toggle]');
            if (toggle) {
                const collapsed = !host.classList.contains('is-collapsed');
                setMobileBattlePipCollapsed(host, collapsed);
                dockMobileBattlePip(host);
                if (collapsed) {
                    clearTimeout(mobilePipRefreshHandle);
                    mobilePipRefreshHandle = null;
                } else refreshMobileBattlePip();
            } else if (event.target.closest('[data-pip-return]')) switchTab('tab-battle');
        });
        document.body.appendChild(host);
    }
    if (!mobilePipCanvas) {
        mobilePipCanvas = host.querySelector('canvas');
        mobilePipCtx = mobilePipCanvas ? mobilePipCanvas.getContext('2d') : null;
    }
    return host;
}

function setMobileBattlePipCollapsed(host, collapsed) {
    host.classList.toggle('is-collapsed', collapsed);
    const toggle = host.querySelector('[data-pip-toggle]');
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.setAttribute('aria-label', _t(collapsed ? '작은 전투 화면 펼치기' : '작은 전투 화면 접기'));
    toggle.textContent = collapsed ? _t('전투 보기') : _t('접기');
}

/** Dense map/crafting views and early landscape trees start folded; leaving restores the previous PiP choice. */
function dockMobileBattlePip(host) {
    const mapContexts = [['atlas', 'map-explore-worldtree'], ['labyrinth', 'map-explore-labyrinth'], ['chaosRealm', 'map-tab-chaos-realm'], ['sky', 'map-tab-sky'], ['colony', 'map-explore-colony'], ['beehive', 'map-explore-beehive'], ['timerift', 'map-explore-timerift'], ['underworld', 'map-tab-underworld']];
    function syncContext(context) {
        if ((host.dataset.compactContext || '') !== context) {
            if (host.hasAttribute('data-context-collapsed')) {
                setMobileBattlePipCollapsed(host, host.dataset.contextCollapsed === 'true');
                delete host.dataset.contextCollapsed;
            }
            if (context) {
                host.dataset.contextCollapsed = String(host.classList.contains('is-collapsed'));
                setMobileBattlePipCollapsed(host, true);
            }
            host.dataset.compactContext = context;
        }
        for (const [name, id] of mapContexts) {
            const panel = document.getElementById(id);
            if (!panel) continue;
            const hasPip = context === name && game.settings.showMobileBattlePip !== false;
            panel.classList.toggle('has-battle-pip', hasPip);
            panel.classList.toggle('is-pip-expanded', hasPip && !host.classList.contains('is-collapsed'));
        }
    }
    function battlePipDockTarget() {
        if (!uiDisplay.matches('(max-width: 1080px)')) return { context: '', anchor: null };
        const workshop = document.querySelector('#tab-map.active #map-tab-fishing.active #fishing-workshop[data-mobile-selected="true"] #fishing-battle-preview');
        if (workshop) return { context: 'fishing', anchor: workshop };
        const title = uiDisplay.matches('(orientation: landscape) and (max-height: 600px)')
            ? document.querySelector('#tab-char.active .merged-tab-shell:not(:has(> .window-tab-strip:not([hidden]))) .h2-right') : null;
        if (title) return { context: 'tree', anchor: title };
        const mapContext = mapContexts.find(([, id]) => document.querySelector(`#tab-map.active #${id}.active`));
        if (mapContext) return { context: mapContext[0], anchor: null };
        // The bag fills the equipment tab to the menu: the preview starts folded there (opened, it covered the last rows and tools)
        return { context: document.querySelector('#tab-items.active') ? 'items' : '', anchor: null };
    }
    const dock = battlePipDockTarget();
    syncContext(dock.context);
    const docked = !!dock.anchor && (dock.context === 'fishing' || host.classList.contains('is-collapsed'));
    host.classList.toggle('is-tree-docked', docked && dock.context === 'tree');
    host.classList.toggle('is-workshop-docked', docked && dock.context === 'fishing');
    const parent = docked ? dock.anchor : document.body;
    if (host.parentElement !== parent) parent.appendChild(host);
}

function updateMobileBattlePipVisibility(schedule = true) {
    let host = ensureMobileBattlePip();
    if (!host) return;
    dockMobileBattlePip(host);
    let isMobile = uiDisplay.matches('(max-width: 1080px)');
    let activeBattle = document.getElementById('tab-battle').classList.contains('active');
    // Detail sheets own the touch area. Resume the preview when they close; no hidden canvas polling. Settings hold the save reset
    // and account buttons at the page end: no preview there.
    let blocked = isMobile && !activeBattle && (isBattlePresentationSuspended() || document.body.classList.contains('mobile-tab-drawer-open')
        || !!document.querySelector('#passive-mobile-detail:not([hidden]), #ui-equipment-inventory-inspector:popover-open, .selection-overlay, dialog[open], .tutorial-overlay.active, #background-combat-result-overlay, #tab-settings.active, #tab-traits.active .ascend-detail:not(.is-empty), #tab-items.active .shop-info:not(:empty)'));
    let display = (isMobile && !activeBattle && !blocked && game.settings.showMobileBattlePip !== false) ? 'grid' : 'none';
    if (host.style.display !== display) host.style.display = display;
    if (isMobileBattlePipVisible()) {
        if (schedule && mobilePipRefreshHandle === null) mobilePipRefreshHandle = setTimeout(runMobilePipRefreshTick, MOBILE_PIP_BASE_INTERVAL_MS);
    } else if (mobilePipRefreshHandle !== null) {
        clearTimeout(mobilePipRefreshHandle);
        mobilePipRefreshHandle = null;
    }
}

function refreshMobileBattlePip() {
    if (!isMobileBattlePipVisible() || isBattlePresentationSuspended()) return;
    const src = document.getElementById('battlefield-canvas');
    // Width/height assignments clear the bitmap even when unchanged. Resize only before an actual PiP draw,
    // then discard the full battle's cached bounds so a just-hidden canvas cannot stretch this 16:9 view.
    if (src.width !== mobilePipCanvas.width || src.height !== mobilePipCanvas.height || src.dataset.renderScale !== '1') {
        src.width = mobilePipCanvas.width;
        src.height = mobilePipCanvas.height;
        src.dataset.renderScale = '1';
        battleCanvasBox.forget();
    }
    renderBattlefield(true, MOBILE_PIP_BASE_INTERVAL_MS);
    renderMobileBattlePipFrame();
}

function isMobileBattlePipVisible() {
    let host = document.getElementById('mobile-battle-pip');
    return !!(host && host.style.display !== 'none' && !host.classList.contains('is-collapsed'));
}

function renderMobileBattlePipFrame() {
    if (!mobilePipCtx || !mobilePipCanvas) return;
    let host = document.getElementById('mobile-battle-pip');
    if (!host || !isMobileBattlePipVisible()) return;
    let src = document.getElementById('battlefield-canvas');
    if (!src) return;
    if (src.width < 32 || src.height < 32) { src.width = mobilePipCanvas.width; src.height = mobilePipCanvas.height; }
    mobilePipCtx.clearRect(0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
    mobilePipCtx.drawImage(src, 0, 0, mobilePipCanvas.width, mobilePipCanvas.height);
}

function isBattlePresentationSuspended() {
    return document.hidden || backgroundCombatRuntime.appInactive || backgroundCombatRuntime.processing
        || isStartupOverlayOpen() || isLoadingOverlayOpen();
}

function runMobilePipRefreshTick() {
    mobilePipRefreshHandle = null;
    let nextDelay = MOBILE_PIP_BASE_INTERVAL_MS;
    try {
        updateMobileBattlePipVisibility(false);
        if (!isMobileBattlePipVisible() || isBattlePresentationSuspended()) return;
        const t0 = performance.now();
        refreshMobileBattlePip();
        const cost = performance.now() - t0;
        // 렌더가 무거우면(기기가 버거우면) 다음 주기를 늘려 전경 탭 끊김을 줄인다.
        if (cost > 16) nextDelay = Math.min(420, Math.round(MOBILE_PIP_BASE_INTERVAL_MS + cost * 8));
        else if (cost > 9) nextDelay = MOBILE_PIP_BASE_INTERVAL_MS + 70;
        mobilePipRefreshErrorReported = false;
    } catch (error) {
        if (!mobilePipRefreshErrorReported) console.error('mobile battle PIP refresh failed:', error);
        mobilePipRefreshErrorReported = true;
    }
    if (isMobileBattlePipVisible() && !isBattlePresentationSuspended()) mobilePipRefreshHandle = setTimeout(runMobilePipRefreshTick, nextDelay);
}

function startMobilePipRefreshLoop() {
    if (mobilePipRefreshHandle) clearTimeout(mobilePipRefreshHandle);
    mobilePipRefreshHandle = null;
    updateMobileBattlePipVisibility();
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
        // 선택 창 넷(코어, 주얼 보관함과 소켓, 혼돈 주입, 조합창 재료). 없어진 예전 주얼 창들의 자리도 이것이 맡는다.
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
    canvas.addEventListener('pointermove', event => actExplorationUi.hover(canvas, event));
    canvas.addEventListener('pointerleave', () => actExplorationUi.hover(canvas, null));
}

/** 탐험 중 전장을 누르면 그 칸으로 걸어간다(미니맵 클릭과 같은 이동 명령 · 자동 이동은 그대로). 입구 방의 NPC를 누르면 걷지 않고
 * 그 NPC의 창을 연다(js/canvas-act-title-card.js npcAt, js/content-progression-ui.js openNpc). 몬스터를 누르면 그 몬스터를 락온한다
 * (js/act-exploration-ui.js lockOnAt). 마우스를 올린 NPC는 테가 밝아진다(setupBattlefieldMovementInteraction의 hover). */
function commandBattlefieldMove(canvas, event) {
    if (bossMoves.observer.sceneActive()) return;
    let point = getBattlefieldClientPoint(canvas, event.clientX, event.clientY);
    let npc = actTitleCard.npcAt(point);
    if (npc && contentUnlockUi.openNpc(npc)) { faceBattlefieldPoint(point); return; }
    const door = stageDoorMarks.targetAt(point);
    if (door) { actExplorationUi.commandMove(door); return; }
    if (actExplorationUi.lockOnAt(point)) return;
    let cell = actExplorationView.cellAt(point);
    if (cell) actExplorationUi.commandMove(cell, actExplorationView.cellAt(point, true));
}

/** A press on an NPC turns the hero toward the pressed point (2026-10-27 사용자: npc 클릭 시 캐릭터 방향도 그쪽으로). The facing holds
 * until the hero moves or strikes (js/canvas-battlefield.js). */
function faceBattlefieldPoint(point) {
    const hero = battleVisualState.playerPos;
    if (hero && Math.abs(point.x - hero.x) > 4) battleVisualState.playerFacingDirection = point.x < hero.x ? 'west' : 'east';
}


/** What opening a window starts: the gear analysis once (js/equipment-triage.js autoStart), and the hall again when the 거래 window
 * opens on its 장비 전당 section (js/player-exchange.js). */
function runWindowOpenHooks(tabId, shownId) {
    if (shownId === 'tab-items' && window.equipmentTriage) window.equipmentTriage.onOpen();
    if (tabId === 'tab-trade' && marketUi.section === 'hall') loadPlayerExchange();
    tutorialActionUi.followOpeningTab(shownId);
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
    // 거래와 장비 전당은 제 창이다(2026-11-06): 옛 칸 주소는 거래 창의 그 칸을 연다
    if (subtabId === 'item-tab-market' || subtabId === 'item-tab-hall') { marketUi.open(subtabId === 'item-tab-hall' ? 'hall' : marketUi.section); return; }
    if(subtabId!==game.itemSubtab)craftingWorkspaceUi.stopAuto('');
    if (!contentProgression.canOpen(subtabId)) return;
    if (subtabId === 'item-tab-equip' && game.noti) game.noti.items = false;
    if (subtabId === game.itemSubtab) {
        if (isSelectedSubtab(subtabId)) return;
    }
    game.itemSubtab = subtabId;
    if (subtabId === 'item-tab-equip' && window.equipmentTriage) window.equipmentTriage.onOpen();
    showItemSubtabPanel(subtabId);
    updateStaticUI();
}

/** The chosen item subtab's panel and button, and the docked window fitted to it before anything draws in it (js/ui-window-manager.js). */
function showItemSubtabPanel(subtabId) {
    document.querySelectorAll('#tab-items .subtab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('#tab-items .subtab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(subtabId).classList.add('active');
    document.getElementById('btn-' + subtabId).classList.add('active');
    if (typeof refitDockedWindows === 'function') refitDockedWindows();
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

/** The rules panel (예전 컨디션 룬 창의 자동 사용 규칙) opens with the tactics it drives. */
function isTacticsRulesOpen() {
    return contentProgression.canOpen('skill-tab-condition');
}

function addSkillAutoRule() {
    if (!isTacticsRulesOpen()) return addLog(TACTICS_RULES_LOCK_MESSAGE, 'attack-monster');
    if (!getConditionPatternTriggers(game, false).length) return;
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
    updateStaticUI();
}

function syncEquipmentSlotFilterOptions(select, slots) {
    if (!select) return;
    let signature = JSON.stringify(slots);
    if (select.dataset.optionSignature === signature) return;
    select.innerHTML = `<option value="all">${_t('모든 칸')}</option>${slots.map(slot => `<option value="${escapeHTML(slot)}">${escapeHTML(getItemSlotDisplayLabel(null, slot))}</option>`).join('')}`;
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

function getSortedEquipmentInventoryRows(query, isItemRarityVisible) {
    game.settings = game.settings || {};
    let slotValue = game.settings.equipmentSlotFilter || 'all';
    let slots = Array.from(new Set(game.inventory.map(item => item && item.slot).filter(Boolean))).sort((a, b) => a.localeCompare(b, i18n.locale));
    if (!slots.includes(slotValue)) slotValue = 'all';
    let slotSelect = document.getElementById('ui-equipment-slot-filter');
    syncEquipmentSlotFilterOptions(slotSelect, slots);
    if (slotSelect) slotSelect.value = slotValue;
    let visualFilterActive = [slotValue !== 'all', String(query || '').trim().length > 0,
        game.inventory.some(item => item && !isItemRarityVisible(item))].some(Boolean);
    let rows = game.inventory.map((item, idx) => ({ item, idx })).map(row => {
        let item = row.item || {};
        let searchMatched = matchSearchQuery(getEquipmentSearchText(item), query);
        return { ...row, filterActive: visualFilterActive,
            filterMatched: ['all', item.slot].includes(slotValue) && isItemRarityVisible(item) && searchMatched };
    }).sort((a, b) => b.idx - a.idx);
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
    if (!isTacticsRulesOpen()) return;
    let rule = normalizeConditionPatternRule((game.skillAutoRules || [])[index]);
    let trigger = getConditionPatternTriggers(game, false).find(row => row.id === triggerType);
    if (!rule || !trigger) return;
    const before = CONDITION_PATTERN_TRIGGER_DB.find(row => row.id === rule.triggerType);
    if (!before || before.valueKind !== trigger.valueKind) rule.triggerValue = CONDITION_TRIGGER_DEFAULT_VALUES[trigger.valueKind] ?? rule.triggerValue;
    rule.triggerType = trigger.id;
    normalizeConditionPatternRule(rule);
    renderSkillAutoRulePanel();
}

function setConditionPatternAction(index, actionType) {
    if (!isTacticsRulesOpen()) return;
    let rule = normalizeConditionPatternRule((game.skillAutoRules || [])[index]);
    let action = getConditionPatternActions(game, false).find(row => row.id === actionType);
    if (!rule || !action) return;
    rule.actionType = action.id;
    renderSkillAutoRulePanel();
}

function setConditionPatternValue(index, value) {
    if (!isTacticsRulesOpen()) return;
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
    let config = trigger.valueKind === 'cells' ? { min:1, max:7, suffix:_t('칸') }
        : (trigger.valueKind === 'seconds' ? { min:1, max:10, suffix:_t('초 이내') }
            : (trigger.valueKind === 'count' ? { min:1, max:30, suffix:_t('마리') } : { min:1, max:100, suffix:'%' }));
    return `<input type="number" min="${config.min}" max="${config.max}" value="${rule.triggerValue}" onchange="setConditionPatternValue(${index},Math.min(${config.max},Math.max(${config.min},Number(this.value)||${config.min})));"><span>${config.suffix}</span>`;
}

function renderConditionPatternRoadmap() {
    let lockedTriggers = getConditionPatternTriggers(game, true).filter(row => !isConditionPatternRequirementMet(row.unlock, game));
    let lockedActions = getConditionPatternActions(game, true).filter(row => !isConditionPatternRequirementMet(row.unlock, game));
    let entries = lockedTriggers.map(row => `${row.label}, ${getConditionPatternRequirementLabel(row.unlock)}`)
        .concat(lockedActions.map(row => `${row.label}, ${getConditionPatternRequirementLabel(row.unlock)}`));
    if (entries.length === 0) return '<div class="condition-pattern-roadmap is-complete">모든 조건과 행동 패턴을 해금했습니다.</div>';
    return `<details class="condition-pattern-roadmap"><summary>${_t('다음 패턴 해금 {length}개', { length: entries.length })}</summary><div>${entries.map(text => `<span>${escapeHTML(text)}</span>`).join('')}</div></details>`;
}

/** 규칙이 바꾸는 것: 먼저 공격할 적, 전투 거리, 그 밖(마을로 귀환). */
function getConditionRuleKind(action) {
    const tactic = (action && action.tactic) || {};
    if (tactic.targetPriority) return '대상';
    return tactic.positionMode ? '거리' : '귀환';
}

function renderConditionRuleHead(rule, idx, action) {
    return `<div class="condition-rule-head"><b class="condition-rule-rank" data-tip="${_t('우선순위')}">${idx + 1}</b><span class="condition-rule-kind">${getConditionRuleKind(action)}</span>
            <span class="condition-rule-lamp"></span><span class="condition-rule-tools">
            <label><input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="game.skillAutoRules[${idx}].enabled=this.checked; renderSkillAutoRulePanel();"> ${_t('사용')}</label></span></div>`;
}

/** 순서 바꾸기와 삭제: 행동 줄 끝에 둔다(머리 줄에 두면 휴대폰에서 줄 하나를 따로 썼다). */
function renderConditionRuleMoves(idx) {
    const last = game.skillAutoRules.length - 1;
    return `<span class="condition-rule-moves"><button aria-label="${_t('규칙 위로 이동')}" onclick="moveSkillAutoRule(${idx},-1)" ${idx === 0 ? 'disabled' : ''}>↑</button>
            <button aria-label="${_t('규칙 아래로 이동')}" onclick="moveSkillAutoRule(${idx},1)" ${idx === last ? 'disabled' : ''}>↓</button>
            <button onclick="game.skillAutoRules.splice(${idx},1); renderSkillAutoRulePanel();">${_t('삭제')}</button></span>`;
}

function renderConditionRuleLine(rule, idx, choice, options) {
    const pick = (rows, current) => rows.map(row => `<option value="${row.id}" ${current && current.id === row.id ? 'selected' : ''}>${_t(row.label)}</option>`).join('');
    return `<div class="condition-rule-line"><span class="condition-rule-if"><span>${_t('조건')}</span>
            <select aria-label="${_t('발동 조건')}" onchange="setConditionPatternTrigger(${idx},this.value);">${pick(options.triggers, choice.trigger)}</select>
            ${renderConditionPatternValueControl(rule, idx, choice.trigger)}<span class="condition-rule-arrow" aria-hidden="true">→</span></span><span class="condition-rule-do"><span>${_t('행동')}</span>
            <select aria-label="${_t('실행 행동')}" onchange="setConditionPatternAction(${idx},this.value);">${pick(options.actions, choice.action)}</select>${renderConditionRuleMoves(idx)}</span></div>`;
}

function renderConditionPatternRule(rule, idx, options) {
    const trigger = options.triggers.find(row => row.id === rule.triggerType) || options.triggers[0];
    const action = options.actions.find(row => row.id === rule.actionType) || options.actions[0];
    return `<div class="condition-pattern-rule${rule.enabled ? '' : ' is-off'}">${renderConditionRuleHead(rule, idx, action)}${renderConditionRuleLine(rule, idx, { trigger, action }, options)}</div>`;
}

/** 규칙 하나의 지금 상태(전투가 쓰는 js/condition-patterns.js resolveConditionalCombatTactics와 같은 차례): on 이 규칙이 바꾸는 중,
 * shadow 맞지만 같은 것을 바꾸는 위 규칙이 먼저, wait 조건이 맞지 않음, off 사용 꺼짐. locked는 앞 규칙들이 이미 바꾼 칸. */
function getConditionRuleLiveState(rule, locked, pStats, now) {
    if (!rule.enabled) return 'off';
    if (!evaluateConditionPatternRule(rule, pStats, game, now)) return 'wait';
    const action = getConditionPatternActions(game, true).find(row => row.id === normalizeConditionPatternRule(rule).actionType);
    const keys = Object.keys((action && action.tactic) || {});
    if (keys.length && keys.every(key => locked.has(key))) return 'shadow';
    keys.forEach(key => locked.add(key));
    return 'on';
}

/** 규칙 카드의 불과 기본 전술 칸의 '지금' 줄만 고친다. 카드는 다시 그리지 않아 고르던 칸과 입력이 그대로다. */
function syncConditionRuleLive() {
    const panel = document.getElementById('ui-skill-rules-panel'), now = document.getElementById('combat-tactics-now');
    if (!panel || !isTacticsRulesOpen()) return;
    const rules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules : [], pStats = getPlayerStats(), at = getCombatTime(), locked = new Set();
    const states = [];
    rules.map((rule, index) => ({ rule, index })).sort((a, b) => (a.rule.priority || 0) - (b.rule.priority || 0))
        .forEach(({ rule, index }) => { states[index] = getConditionRuleLiveState(rule, locked, pStats, at); });
    panel.querySelectorAll('.condition-pattern-rule').forEach((card, index) => {
        const state = states[index] || 'off', lamp = card.querySelector('.condition-rule-lamp');
        if (card.dataset.live !== state) card.dataset.live = state;
        if (lamp && lamp.textContent !== CONDITION_RULE_LIVE_TEXT[state]) lamp.textContent = CONDITION_RULE_LIVE_TEXT[state];
    });
    const tactic = resolveConditionalCombatTactics(normalizeCombatTacticsSettings(game.settings), pStats, game, at);
    const text = _t('지금: {TACTIC_NOW_LABELS}, {TACTIC_NOW_LABELS2}{value}', { TACTIC_NOW_LABELS: TACTIC_NOW_LABELS[tactic.targetPriority], TACTIC_NOW_LABELS2: TACTIC_NOW_LABELS[tactic.positionMode], value: states.includes('on') ? _t('(조건부 규칙이 바꿈)') : '' });
    if (now && now.textContent !== text) now.textContent = text;
}

function paintSkillRulesPanel(panel, html) {
    if (panel.__lastHtml === html) return;
    panel.innerHTML = html;
    panel.__lastHtml = html;
}

function renderSkillAutoRulePanel() {
    syncCombatTacticsControls();
    let panel = document.getElementById('ui-skill-rules-panel');
    if (!panel) return;
    let unlocked = isTacticsRulesOpen();
    let addButton = document.getElementById('btn-condition-rule-add');
    let sortButton = document.getElementById('btn-condition-rule-sort');
    if (addButton) addButton.disabled = !unlocked || !getConditionPatternTriggers(game, false).length;
    if (sortButton) sortButton.disabled = !unlocked;
    if (!unlocked) return paintSkillRulesPanel(panel, `<div style="color:#d3a989; border:1px solid #6f4b31; border-radius:8px; padding:12px;">${_t('잠금 상태: {value}', { value: TACTICS_RULES_LOCK_MESSAGE })}</div>`);
    game.skillAutoRules = Array.isArray(game.skillAutoRules) ? game.skillAutoRules.map(normalizeConditionPatternRule) : [];
    let summary = `<div class="condition-pattern-summary"><div><strong>${_t('수호, 함성, 저주')}</strong><span>${_t('그루터기 함에서 깨어난 부적의 조건부 줄이 맡습니다.')}</span></div></div>${renderConditionPatternRoadmap()}`;
    if (game.skillAutoRules.length === 0) {
        return paintSkillRulesPanel(panel, summary + '<div class="condition-rule-empty">[+ 규칙 추가]로 조건과 행동을 고르세요.</div>');
    }
    const options = { triggers: getConditionPatternTriggers(game, false), actions: getConditionPatternActions(game, false) };
    paintSkillRulesPanel(panel, summary + game.skillAutoRules.map((rule, idx) => renderConditionPatternRule(rule, idx, options)).join(''));
    syncConditionRuleLive();
}

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


function tryGrantCodexCompletionReward() {
    let progress = getUniqueCodexProgress();
    if (progress.total <= 0 || progress.stored < progress.total) return;
    if (game.uniqueCodexCompletedRewardClaimed) return;
    game.uniqueCodexCompletedRewardClaimed = true;
    addLog(_t('📚 도감 완성! 다음 루프부터 루프마다 액트 1 고유 하나를 무작위로 받습니다.'), 'loot-unique');
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
    addLog(_t('🎁 도감 완성 특전 지급: [{itemSlotDisplayLabel}] {name} (액트1 고유 랜덤 1개)', { itemSlotDisplayLabel: getItemSlotDisplayLabel(item, pick.slots[0]), name: _t(pick.name) }), 'loot-unique');
}

function assertBuildEditable() {
    if (game.woodsmanBuildLock) {
        addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
        return false;
    }
    return true;
}

/** 첫 루프의 시작 무기(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill)가 가방에서 장착 안내를 기다리면 그 아이템, 아니면 null.
 * 끼고 나면 기다림 표시를 지운다(바닥에 있는 동안은 남는다: 주웠을 때 자동 장착하지 않고 가방으로 오게). */
function getStarterWeaponTutorialTarget() {
    const id = game.starterWeaponTutorialPending;
    if (id == null) return null;
    if (Object.values(game.equipment || {}).some(item => item && item.id === id)) {
        game.starterWeaponTutorialPending = null;
        return null;
    }
    return (game.inventory || []).find(item => item && item.id === id) || null;
}


function applyUiSkin(skin) {
    document.body.dataset.uiSkin = normalizeUiSkin(skin);
}

// 고대비 모드(접근성): 글자·테두리 대비를 높이고 전장 조명 패스를 끈다. 색은 css/themes/high-contrast.css가 소유한다.
function applyHighContrast(enabled) {
    document.body.classList.toggle('high-contrast', enabled === true);
}

/** 불러온 저장의 화면 설정(외형, 고대비). 부팅 때(js/main.js)만 입혀서, 로그인 뒤 서버 저장을 받으면 설정 창은 켜짐인데
 * 화면은 앞 저장 그대로였다(2026-11-08 사용자: 고대비 모드가 켜짐으로만 남고 풀려 있음). */
function applyLoadedSaveLook() {
    applyUiSkin(game.settings.uiSkin);
    applyHighContrast(game.settings.highContrast);
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
    if (!unlockedBefore && game.classFreeSwitchUnlocked) addLog(_t('모든 직업을 경험했습니다. 설정에서 외형을 자유롭게 변경할 수 있습니다.'), 'season-up');
    if (source === 'init') return;
    let summaryEl = document.getElementById('ui-hero-talent-summary');
    if (summaryEl) {
        let def = getHeroSelectionDef(game.selectedClassId);
        let appearanceDef = getHeroSelectionDef(typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedClassId);
        let discovered = Math.min(PLAYER_CLASS_ORDER.length, game.discoveredClassIds.length);
        let unlockText = game.classFreeSwitchUnlocked ? _t('외형 변경 해금됨, 외형: {label}', { label: appearanceDef.label }) : _t('경험한 직업 {discovered}/{length}', { discovered, length: PLAYER_CLASS_ORDER.length });
        let modeText = game.settings && game.settings.heroAppearanceMode === 'fixed' ? _t('고정') : _t('현재 직업 연동');
        summaryEl.innerText = _t('{label}, {unlockText}, 외형: {modeText}', { label: _t(def.label), unlockText, modeText });
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
        return `<option value="${id}">${_t(def.label)}</option>`;
    }).join('');
    selectEl.value = typeof getHeroAppearanceId === 'function'
        ? getHeroAppearanceId()
        : (game.selectedClassId || 'archer');
    if (mode !== 'fixed') {
        selectEl.disabled = true;
        selectEl.dataset.tip = _t('루프마다 선택한 현재 직업의 외형을 사용합니다.');
    } else if (!game.classFreeSwitchUnlocked) {
        selectEl.disabled = true;
        selectEl.dataset.tip = _t('다른 외형 선택은 여섯 직업을 한 번씩 경험하면 해금됩니다.');
    } else {
        selectEl.disabled = false;
        selectEl.dataset.tip = '';
    }
    syncHeroSelectionState();
}

function persistHeroSelectionChange(reason) {
    if (!saveGame({ skipCloudSync: true })) return;
    if (typeof requestImmediateCloudSave === 'function') requestImmediateCloudSave(reason || '플레이어 직업 변경');
}

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
        if (!options.silent && prevAppearance !== classId) addLog(_t('캐릭터 외형 변경: {label}', { label: _t(classDef.label) }), 'season-up');
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
    if (!options.silent && prev !== classId) addLog(_t('직업 변경: {label}', { label: _t(classDef.label) }), 'season-up');
    if (!options.silent && refundedPassiveCount > 0) addLog(_t('직업 시작점 변경으로 패시브 {refundedPassiveCount}개를 반환했습니다.', { refundedPassiveCount }), 'season-up');
    if (!options.skipSave) persistHeroSelectionChange('플레이어 직업 변경');
    return true;
}

function onHeroAppearanceModeChanged() {
    let selectEl = document.getElementById('sel-hero-appearance-mode');
    if (!selectEl) return;
    applyHeroAppearanceMode(selectEl.value);
    updateStaticUI();
}

/** 장비 창 "빈 칸 채우기": 가방에서 빈 장비 칸에 맞는 장비를 티어 · 등급 높은 것부터 장착한다. */
function fillEmptyEquipmentSlots() {
    const equipped = equipIntoEmptySlots(game.inventory.slice());
    if (equipped) showGameToast(_t('빈 장비 칸 {equipped}개를 채웠습니다', { equipped }), { tone: 'success' });
    updateStaticUI();
}

function onHeroSelectionChanged() {
    let selectEl = document.getElementById('sel-active-hero');
    if (!selectEl) return;
    if (!game.classFreeSwitchUnlocked) {
        addLog(_t('아직 자유 변경이 잠겨 있습니다. 루프를 돌며 여섯 직업을 모두 경험하세요.'), 'attack-monster');
        selectEl.value = typeof getHeroAppearanceId === 'function'
            ? getHeroAppearanceId() : (game.selectedClassId || 'archer');
        return;
    }
    applyHeroSelection(selectEl.value, { cosmeticOnly: true });
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
        addLog(_t('시작 직업을 선택했습니다: {blindLabel}', { blindLabel: PLAYER_CLASS_DEFS[pickedId].blindLabel }), 'season-up');
        persistHeroSelectionChange('시작 직업 선택');
        openingJourney.afterStartPick();
    }, {
        kicker: _t('첫 루프'),
        title: _t('시작 직업 선택'),
        body: _t('첫 루프에서 사용할 직업을 선택하세요.')
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
    overlay.innerHTML = '<div class="rewrite-card"><div class="rewrite-title">세계가 되감기는 중…</div><div class="rewrite-sub">전투의 기억을 간직한 채, 새로운 루프를 시작합니다.</div></div>';
    document.body.classList.add('loop-rewrite-active');
    overlay.classList.remove('active');
    void overlay.offsetWidth;
    overlay.classList.add('active');
    setTimeout(() => {
        overlay.classList.remove('active');
        document.body.classList.remove('loop-rewrite-active');
    }, 1950);
}

function togglePastLoopMilestones() {
    game.settings.collapsePastLoopMilestones = game.settings.collapsePastLoopMilestones === false;
    updateStaticUI();
}

function getMapCompleteActionOptions() {
    return [
        { value: 'repeatZone', label: _t('반복'), detail: _t('현재 지역 또는 층을 다시 진행합니다.') },
        { value: 'nextZone', label: _t('다음 지역'), detail: _t('지역은 열린 가장 먼 지역으로, 층은 방금 깬 층의 다음 층으로 갑니다.') },
        { value: 'nextLoopBestPlusOne', label: _t('이번 루프 최고층 다음'), detail: _t('혼돈 심화, 미궁, 혼돈계에서 이번 루프에 깬 가장 높은 층의 다음 층으로 바로 갑니다.') },
        { value: 'stop', label: _t('중단'), detail: _t('전투를 멈추고 현재 위치에서 대기합니다.') }
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
    button.textContent = _t('전투 완료: {action}', { action: _t(option.label) });
    // 전체 메뉴 서랍에는 짧은 이름이 뜬다: "다음 지역"만으로는 이동 단추로 읽혀 무엇을 고르는 칸인지 붙인다.
    button.dataset.mobileLabel = _t('완료 후 행동: {action}', { action: _t(option.label) });
    button.setAttribute('aria-label', _t('전투 완료 후 행동: {action}', { action: _t(option.label) }));
    button.dataset.tip = `${_t('현재')}: ${_t(option.label)}, ${_t(option.detail)}`;
}

function applyMapCompleteAction(action) {
    let option = getMapCompleteActionOption(action);
    game.settings = game.settings || {};
    game.settings.mapCompleteAction = option.value;
    let select = document.getElementById('sel-map-complete-action');
    if (select) select.value = option.value;
    syncMapCompleteActionQuickControl();
    if (typeof queueImportantSave === 'function') queueImportantSave(180);
    if (typeof showGameToast === 'function') showGameToast(_t('전투 완료 후 행동: {action}', { action: _t(option.label) }), { tone: 'success' });
    updateStaticUI();
}

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
            title: _t('전투 완료 후 행동'),
            kicker: _t('자동 전투'),
            message: _t('항목을 누르면 즉시 적용됩니다.'),
            submitOnChoice: true,
            dismissOnBackdrop: true,
            choices
        });
        if (selected !== null) applyMapCompleteAction(selected);
    } finally {
        mapCompleteActionPickerOpen = false;
    }
}

function syncCombatTacticsControls() {
    let targetSelect = document.getElementById('sel-combat-target-priority');
    let positionSelect = document.getElementById('sel-combat-position-mode');
    let help = document.getElementById('combat-tactics-help');
    if (!targetSelect || !positionSelect) return;
    let tactics = normalizeCombatTacticsSettings(game.settings);
    let unlocked = isTacticsRulesOpen();
    targetSelect.value = tactics.targetPriority;
    positionSelect.value = tactics.positionMode;
    targetSelect.disabled = !unlocked;
    positionSelect.disabled = !unlocked;
    const firstUse = contentProgression.opening.applies(game) && !game.seenTutorials.includes('opening_tactics_selected');
    if (help) help.textContent = unlocked
        ? _t(firstUse ? '먼저 공격할 적을 골라 보세요.' : '조건부 규칙이 맞지 않을 때 쓰는 전술입니다. 전술 이동 시 다음 공격이 0.3~0.65초 미뤄집니다.')
        : TACTICS_RULES_LOCK_MESSAGE;
}

function applyChatMessageSize(size) {
    let normalized = ['small', 'medium', 'large'].includes(size) ? size : 'medium';
    if (document.body && document.body.dataset) document.body.dataset.chatMessageSize = normalized;
    return normalized;
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
    syncPassiveTreeView();
    if (passiveRenderCache.viewAngle !== getPassiveTreeViewAngle()) {
        passiveRenderCache.viewAngle = getPassiveTreeViewAngle();
        markPassiveRenderCacheDirty('structure');
    }
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

function getJournalEntryAction(entryId) {
    let mapUnlocked = !!(game && game.unlocks && game.unlocks.map);
    let charUnlocked = !!(game && game.unlocks && game.unlocks.char);
    let loop = Math.max(1, Math.floor(Number((game && game.season) || 1)));
    let maxZoneId = Math.max(0, Math.floor(Number((game && game.maxZoneId) || 0)));
    if (/^act_\d+$/.test(entryId) || entryId === 'immortal') {
        return mapUnlocked ? { label: _t('사냥터 보기'), tabId: 'tab-map', subtabId: 'map-explore-hunting' } : null;
    }
    if (entryId === 'woodsman') {
        let chaosReady = typeof hasCurrentLoopChaosAccess === 'function'
            ? hasCurrentLoopChaosAccess(game) : maxZoneId >= ABYSS_START_ZONE_ID;
        return mapUnlocked && chaosReady ? { label: _t('혼돈 등반 보기'), tabId: 'tab-map', subtabId: 'map-explore-chaos' } : null;
    }
    if (entryId === 'woodsman_echo') {
        let realmUnlocked = !!(game && game.chaosRealm && game.chaosRealm.unlocked);
        return mapUnlocked && realmUnlocked ? { label: _t('혼돈계 보기'), tabId: 'tab-map', subtabId: 'map-tab-chaos-realm' } : null;
    }
    if (entryId === 'meteor_fall') {
        let meteorUnlocked = !!(game && game.meteorSite && game.meteorSite.unlocked);
        return mapUnlocked && meteorUnlocked ? { label: _t('운석 낙하 지점 보기'), tabId: 'tab-map', subtabId: 'map-explore-meteor' } : null;
    }
    if (entryId === 'passive_star_evolution') {
        return charUnlocked ? { label: _t('성좌 확인'), tabId: 'tab-char' } : null;
    }
    if (entryId === 'level_200') {
        return { label: _t('캐릭터 성장 확인'), tabId: 'tab-character' };
    }
    if (entryId === 'beehive_queen') {
        return mapUnlocked && loop >= 8 ? { label: _t('벌집 원정 보기'), tabId: 'tab-map', subtabId: 'map-explore-beehive' } : null;
    }
    if (entryId === 'void_grand_breach') {
        return mapUnlocked && loop >= 9 ? { label: _t('대균열 보기'), tabId: 'tab-map', subtabId: 'map-explore-voidrift' } : null;
    }
    if (entryId === 'labyrinth_10') return mapUnlocked && loop >= 3 && maxZoneId >= 5 ? { label: _t('고대 미궁 보기'), tabId: 'tab-map', subtabId: 'map-explore-labyrinth' } : null;
    if (entryId === 'ocean_500') return mapUnlocked && loop >= OCEAN_UNLOCK_LOOP ? { label: _t('심해 보기'), tabId: 'tab-map', subtabId: 'map-tab-ocean' } : null;
    if (entryId === 'sky_tower_10') return mapUnlocked && game && game.skyTower && game.skyTower.unlocked ? { label: _t('창공의 탑 보기'), tabId: 'tab-map', subtabId: 'map-tab-sky' } : null;
    if (entryId === 'time_rift_fusion') return mapUnlocked && loop >= TIME_RIFT_UNLOCK_LOOP ? { label: _t('시간의 균열 보기'), tabId: 'tab-map', subtabId: 'map-explore-timerift' } : null;
    if (entryId === 'colony_wave_10') return mapUnlocked && loop >= 15 ? { label: _t('군락지 보기'), tabId: 'tab-map', subtabId: 'map-explore-colony' } : null;
    if (/^rival_/.test(entryId)) {
        return mapUnlocked && loop >= 31 ? { label: _t('버려진 날 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
    }
    if (entryId === 'cosmos_astra') {
        if (!mapUnlocked || loop < 31) return null;
        let progress = typeof getCosmosCapstoneProgress === 'function' ? getCosmosCapstoneProgress((game && game.cosmosAtlas) || {}) : null;
        return progress && progress.canChallenge
            ? { label: _t('아스트라 도전 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' }
            : { label: _t('우주계 진행 보기'), tabId: 'tab-map', subtabId: 'map-tab-cosmos' };
    }
    if (/^pinnacle_/.test(entryId)) {
        return mapUnlocked && loop >= 31 ? { label: _t('최종 관문 보기'), tabId: 'tab-map', subtabId: 'map-explore-root-boss' } : null;
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
    if (entryId === 'meteor_fall') return _t('루프 {METEOR_SITE_UNLOCK_LOOP}, 액트 {METEOR_SITE_UNLOCK_ACT} 도달', { METEOR_SITE_UNLOCK_LOOP, METEOR_SITE_UNLOCK_ACT });
    if (entryId === 'beehive_queen') return '루프 8 도달';
    if (entryId === 'void_grand_breach') return '루프 9 도달';
    if (entryId === 'labyrinth_10') return '루프 3, 액트 5 도달';
    if (entryId === 'ocean_500') return _t('루프 {OCEAN_UNLOCK_LOOP} 도달', { OCEAN_UNLOCK_LOOP });
    if (entryId === 'sky_tower_10') return '루프 15, 혼돈 20층 클리어';
    if (entryId === 'time_rift_fusion') return _t('루프 {TIME_RIFT_UNLOCK_LOOP} 도달', { TIME_RIFT_UNLOCK_LOOP });
    if (entryId === 'colony_wave_10') return '루프 15 도달';
    if (/^rival_/.test(entryId) || entryId === 'cosmos_astra' || /^pinnacle_/.test(entryId)) return '루프 31 도달';
    return '';
}

/** The journal card's reward line: the bonus label or display effect, translated; empty when hidden or absent. */
function journalRewardText(def, shown) {
    const source = def.bonus ? def.bonus.label : def.displayEffect;
    return shown && source ? _t(source) : '';
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
        combatCurrencyHud.update();
    } finally {
        restoreUiDisclosureState(document);
        uiRefreshRunning = false;
        if (uiRefreshQueued) requestAnimationFrame(processQueuedUIRefresh);
    }
}

/** Whether the skill tree canvas needs a new draw: its state, its box or the pixel ratio changed. Nothing in it moves by itself
 * (pointer, zoom and selection redraw at once in js/passive-selection-ui.js), so it is not redrawn every 500ms any more
 * (2026-10-25 측정: 바뀐 것 없이 8초에 16번 1454×699 캔버스를 다시 그렸다). */
function shouldRedrawPassiveTree() {
    let signature = [
        game.passivePoints || 0,
        (game.passives || []).length,
        (game.discoveredPassives || []).length,
        game.startNode || '',
        game.ascendClass || '',
        game.season || 1,
        (game.settings && game.settings.passiveTreeSearch) || '',
        (game.settings && game.settings.passiveTreeFilter) || 'all',
        game.settings && game.settings.passiveTreeShowLabels === false ? 'labels-off' : 'labels-on',
        passiveTreeBoxKey()
    ].join('|');
    let changed = signature !== lastPassiveTreeSignature;
    if (changed) lastPassiveTreeSignature = signature;
    return changed;
}

/** The tree canvas box and pixel ratio: a resize or a zoom change needs a new draw. */
function passiveTreeBoxKey() {
    const canvas = document.getElementById('tree-canvas'), box = canvas && canvas.parentElement;
    return box ? `${box.clientWidth}x${box.clientHeight}@${passiveSelectionUi.pixelRatio()}` : '';
}

function getPlayerEhpCardsHtml(pStats, cardClass) {
    if (typeof calculatePlayerEhpProfile !== 'function') return '';
    let profile = calculatePlayerEhpProfile(pStats);
    let labels = { phys: _t('물리'), fire: _t('화염'), cold: _t('냉기'), light: _t('번개'), chaos: _t('카오스') };
    return Object.keys(labels).map(element => {
        let row = profile.elements[element];
        let entropyText = formatSettingNumber(row.entropy, 'showCharacterComma');
        let directText = formatSettingNumber(row.direct, 'showCharacterComma');
        let detail = _t('{labels} 공격 EHP {entropyText}, 직격 EHP {directText}, 엔트로피 회피 {evadeChance}%', { labels: labels[element], entropyText, directText, evadeChance: profile.evadeChance.toFixed(1) });
        return `<div class="${cardClass} equipment-ehp-stat" data-ehp-element="${element}" data-ehp-detail="${detail}" tabindex="0" data-info-tooltip-anchor="1" onmouseenter="showPlayerEhpTooltip(event)" onfocus="showPlayerEhpTooltip(event)" onclick="showPlayerEhpTooltip(event)" onmouseleave="if(document.activeElement!==this) hideInfoTooltip()" onblur="hideInfoTooltip()"><span>${labels[element]}</span><strong>${entropyText}</strong></div>`;
    }).join('');
}

function renderCharacterEhpSummary(pStats) {
    let host = document.getElementById('ui-character-ehp');
    if (host) host.innerHTML = getPlayerEhpCardsHtml(pStats, 'equipment-summary-stat character-ehp-stat');
}

/** 장비창의 요약, 가방 머리, 새 아이템 표시(js/equipment-window-ui.js, 2026-10-10 개편: 옵션 티어와 품질은 뺐다). */
function renderEquipmentLoadoutSummary(pStats) {
    equipmentWindowUi.render(pStats);
    knittingUi.render();
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
        element.dataset.tip = full.length ? `${full.map(([label, used, limit]) => _t('{label} {used}/{limit}칸', { label, used, limit })).join(', ')}, 공간을 확보하세요` : '';
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
    return `${item.name || ''} ${item.baseName || ''} ${getItemSlotDisplayLabel(item)} ${getWeaponCategoryName(item)} ${item.rarity || ''} ${ITEM_RARITY_LABELS[item.rarity] || ''} ${base} ${stats} ${under}`;
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
        // 보이는 단추 수: PC 창의 탭 줄이 칸 폭을 정수 px로 자를 때 쓴다(css/themes/pixel.css).
        const count = String(open.length);
        if (row.style.getPropertyValue('--subtab-count') !== count) row.style.setProperty('--subtab-count', count);
    });
}

/** 저널 분류: 기억의 잎은 숨겨진 기록과 별도로 모아 읽는다. */
function getJournalCategory(id) {
    if (id.startsWith('memory_leaf_')) return '기억의 잎';
    if (/^(prologue|act_\d+)$/.test(id)) return '스토리';
    if (id.startsWith('inscription_')) return '세계의 흔적';
    if (JOURNAL_DB[id]?.hidden) return '숨겨진 기록';
    if (/^rival_/.test(id)) return '버려진 날';
    if (id === 'cosmos_astra') return '우주계 기록';
    if (/^pinnacle_/.test(id)) return '최종 관문';
    if (['labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10'].includes(id)) return '탐험 기록';
    return '세계의 흔적';
}


function setupCanvasEvents() {
    passiveSelectionUi.bindTools();
    setupPassiveTreeSearchControls();
    setupBattlefieldMovementInteraction();
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;
    const canvasTooltip = document.getElementById('canvas-tooltip');
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
        if (cost <= 0 || uiDisplay.matches('(max-width: 1080px)')) return '';
        return `<div class="tooltip-line" style="margin-top:6px;color:#f2d88f;">${_t('현재 경로 기준 {cost}포인트 필요', { cost })}</div>`;
    }

    /** "이 노드까지 할당 시 DPS 61 → 64, 생명력 170 → 180": the path's untaken nodes taken (js/passives.js previewPassiveNodeStats). */
    function renderPassiveStatPreview(route) {
        const taken = new Set(game.passives || []);
        const ids = Array.from(route).filter(id => !taken.has(id) && PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start');
        const parts = ids.length ? buildStatPreviewParts(previewPassiveNodeStats(ids)) : '';
        return parts ? `<div class="tooltip-line" style="margin-top:6px;">${_t('이 노드까지 할당 시 {parts}', { parts })}</div>` : '';
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
        let route = getHoverAllocationNodeIds(node.id);
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
            msg = _t('★ 별끝 특수 노드 {ownedApexCount}/5. 다섯 개를 모두 잇면 외곽 성좌가 별 모양으로 각성합니다.', { ownedApexCount });
        } else if ((node.kind === 'evolved' || node.kind === 'transcendent') && game.passiveStarEvolution) {
            msg = (game.passives || []).includes(node.id)
                ? '✔️ 각성된 별자리를 이미 받아들였습니다.'
                : '✨ 성좌 진화 이후 드러난 강력한 외곽 노드입니다.';
        } else if (node.voidRing === 'outer' && !game.passiveStarEvolution) {
            const progress = getPassiveConstellationAwakeningProgress();
            msg += _t(', 성좌 각성 {completed}/{required}: 직업 공허 소켓 여섯을 모두 활성화하면 각성합니다.', { completed: progress.completed, required: progress.required });
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
            effectHtml += `<div class="tooltip-line" style="margin-top:7px; padding:7px 9px; border:1px solid rgba(255,184,106,.48); border-radius:8px; color:#ffd0a2; background:rgba(91,52,20,.28);">${_t('{requiredName} {required} 미만이면 이 노드의 모든 효과가 비활성화됩니다. 현재 {available}', { requiredName: withSubjectParticle(requiredName), required: activationState.required, available: activationState.available })}</div>`;
        }
        let voidCraftHtml = '';
        if (node.kind === 'void' && (game.passives || []).includes(node.id)) {
            voidCraftHtml = `<div class="tooltip-line" style="margin-top:8px; color:var(--copy-bright);">${_t('🕳️ 클릭하면 공허 제작 창이 열립니다.')}</div>`;
        }
        const tooltipDescription = getPassiveTooltipDescription(node, displayedEffectLabels);

        canvasTooltip.innerHTML =
            `<div class="tooltip-title" style="color:${node.tier >= 3 || node.kind === 'apex' || node.kind === 'transcendent' ? '#e7bf73' : '#b9d0df'}">${getPassiveNodeDisplayName(node)}</div>
             <div class="tooltip-line">${getPassiveKindLabel(node)}</div>
             ${effectHtml}
             ${tooltipDescription ? `<div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${statToneText.markup(tooltipDescription)}</div>` : ''}
             ${voidCraftHtml}
             ${renderPassiveRouteHint(routeCost)}
             ${renderPassiveStatPreview(route)}
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
                        addLog(_t('👆 반환 확인: 같은 노드를 한 번 더 탭하면 환불 창이 열립니다.'), 'loot-magic');
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
            return addLog(_t('스킬트리 포인트가 부족합니다. (필요: {pointCost})', { pointCost }), "attack-monster", { toast: true });
        }
        if (options.fromTouch) {
            let now = Date.now();
            if (pendingTouchPassiveId !== hoverNode.id || (now - pendingTouchPassiveAt) > 1200) {
                pendingTouchPassiveId = hoverNode.id;
                pendingTouchPassiveAt = now;
                renderPassiveTooltip(hoverNode, options.clientX || 0, options.clientY || 0);
                addLog(_t('👆 패시브 노드 정보 확인됨. 같은 노드를 한 번 더 탭하면 활성화됩니다.'), "loot-magic");
                return;
            }
        }
        if (canActivate || canPathActivate) {
            const attributeNodeCount = activationPath.filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind === 'attribute').length;
            if (canPathActivate && !await passiveSelectionUi.confirmPath(targetNode, activationPath)) return;
            let attributeStat = null;
            if (attributeNodeCount > 0) {
                attributeStat = await requestGameChoice({
                    kicker: _t('패시브 능력치'),
                    title: attributeNodeCount > 1 ? _t('능력치 노드 {attributeNodeCount}개 선택', { attributeNodeCount }) : '능력치 노드 선택',
                    message: attributeNodeCount > 1
                        ? '이번 최단 경로에 포함된 모든 능력치 노드에 같은 능력치를 적용합니다.'
                        : '이 노드에 저장할 능력치를 선택하세요.',
                    confirmLabel: _t('능력치 적용'),
                    choices: [
                        { value: 'strength', label: _t('◆ 힘'), detail: _t('생명력과 근접 계열 성장에 적합합니다.') },
                        { value: 'dexterity', label: _t('● 민첩'), detail: _t('회피/공격 속도/투사체 계열 성장에 적합합니다.') },
                        { value: 'intelligence', label: _t('✦ 지능'), detail: _t('에너지 보호막/주문/원소 계열 성장에 적합합니다.') }
                    ]
                });
                if (!attributeStat) return;
            }
            pendingTouchPassiveId = null;
            let activationResult = activatePassivePath(targetNodeId, { forcePulseNodeId: targetNodeId, attributeStat, expectedPath: activationPath });
            if (!activationResult.activated) {
                calculateReachableNodes();
                let reason = activationResult.reason === 'points'
                    ? _t('스킬트리 포인트가 부족합니다. (필요: {cost})', { cost: activationResult.cost })
                    : (activationResult.message || '확인 중 패시브 트리 상태가 변경되었습니다. 노드를 다시 선택해 주세요.');
                addLog(reason, 'attack-monster');
                updateStaticUI();
                return;
            }
            unlockPassiveStarEvolution();
            calculateReachableNodes();
            let nodeName = getPassiveNodeDisplayName(targetNode);
            let routeText = canPathActivate ? _t(' (최단 경로 {pointCost}개 노드)', { pointCost }) : '';
            addLog(_t('🌟 {nodeName} 활성화!{routeText}', { nodeName, routeText }), "loot-magic");
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
        camZoom = clampNumber(camZoom, 0.09, 2.5);
        camX = localX - centerX - worldX * camZoom;
        camY = localY - centerY - worldY * camZoom;
        clampPassiveCamera();
        drawPassiveTree();
    });
    passiveSelectionUi.bindTouch(canvas, { drag: updateDrag, hideTooltip: hideCanvasTooltip,
        nodeAt: getPassiveNodeAtTouch, preview: renderPassiveTooltip, activate: activateHoveredPassive });
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
    let dpr = passiveSelectionUi.pixelRatio();
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
    // A failed draw must not stop the caller: init calls this before it sets up cloud saves and login (2026-10-11).
    try { renderBattlefield(); } catch (error) { console.error('renderBattlefield on resize failed:', error); }
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

/** "45%를"이 "45%" / "를 줍니다."로 갈리지 않게: %와 뒤 한글 사이는 유니코드 줄바꿈 규칙상 끊어도 되는 자리라 keep-all로도
 * 막히지 않는다(검토 5차) — 사이에 줄바꿈 금지 문자(U+2060)를 넣는다. 화면에 보이는 글에만 쓴다(속성 · 비교 키에는 쓰지 않는다). */
function keepKoreanUnitParticles(text) {
    return String(text).replace(/%(?=[가-힣])/g, '%\u2060');
}

/** 실행 중 오류: 전투 기록에는 짧은 한 줄만(1분에 한 번), 파일 경로가 든 스택은 콘솔에만 — 플레이어 기록을 스택으로
 * 덮어썼다(검토 6차). 게임은 계속 돈다. */
function noteRuntimeErrorInLog() {
    if (typeof addLog !== 'function') return;
    addLog(_t('⚠️ 일시적인 오류가 있었습니다. 반복되면 새로고침해 주세요.'), 'attack-monster', { rateKey: 'runtime-error', minIntervalMs: 60000 });
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
    const detail = stack ? `<details><summary>${_t('자세히')}</summary><pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:12px;">${escapeHTML(stack)}</pre></details>` : '';
    log.innerHTML = `<div class="log-item attack-monster">${_t('⚠️ 게임을 시작하지 못했습니다: {message}{detail}', { message: escapeHTML(message), detail })}</div>`;
}

function recoverRuntimeState() {
    game = mergeDefaults(game || {});
    runUiGlobalFunction('ensureEncounterRun');
}

/** Explicit reset only: commit a blank account save at the just-read server revision. Another device still holding the old save
 * cannot commit over it (its revision is behind) and takes the fresh save at its next account entry. */
async function resetCloudSaveProgress(userId, freshGame) {
    await fetchCloudSaveSummary();
    let expectedRevision = cloudState.lastRemoteRevision;
    freshGame.saveMeta.cloudUserId = userId;
    let row = await commitCloudSavePayload(createCloudSavePayload(freshGame), { expectedRevision, expectedUserId: userId });
    freshGame.saveMeta.cloudRevision = row.revision;
    freshGame.saveMeta.lastCloudSyncAt = new Date(row.updated_at).getTime();
    freshGame.saveMeta.cloudPending = false;
    cloudState.lastRemoteRevision = row.revision;
    cloudState.lastRemoteUpdatedAt = freshGame.saveMeta.lastCloudSyncAt;
}

async function resetProgressStorage(userId) {
    let previousStatus = getLocalSaveStatus();
    // resetLocalSave writes past the save guard, so a later release's save (loadGame 'newer-build') is refused here, before the server reset.
    if (previousStatus.status === 'newer-build') throw new Error(previousStatus.message);
    let previousSkipUnload = window.__skipUnloadSaveOnce;
    let serverCommitted = false;
    let freshGame = cloneDefaultGame();
    freshGame.saveMeta.lastModifiedAt = Date.now();
    setLocalSaveRuntimeState('resetting', { writable: false, message: _t('진행 데이터를 초기화하는 중입니다.') });
    window.__skipUnloadSaveOnce = true;
    setLoadingOverlayState(true, { title: _t('진행 데이터 초기화'), detail: _t('초기화가 끝날 때까지 기다려주세요.'), caption: _t('저장 처리 중') });
    try {
        if (userId) {
            await resetCloudSaveProgress(userId, freshGame);
            serverCommitted = true;
            game = freshGame;
        }
        resetLocalSave(freshGame);
        game = freshGame;
        cloudState.pendingForcedSyncOptions = null;
        location.reload();
    } catch (error) {
        setLoadingOverlayState(false);
        window.__skipUnloadSaveOnce = previousSkipUnload;
        if (serverCommitted) {
            // Never resume or upload the pre-reset game after the server accepted the reset.
            setLocalSaveRuntimeState('write-failed', { writable: false, message: _t('서버 초기화는 완료했지만 기기 저장에 실패했습니다.') });
            gameplayStarted = false;
            setStartupOverlayActive(true);
            throw new Error('서버 초기화는 완료했지만 기기 저장에 실패했습니다. 저장공간을 확인한 뒤 서버 기록으로 이어가세요. ' + error.message);
        }
        setLocalSaveRuntimeState(previousStatus.status, previousStatus);
        throw error;
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
    // 끝까지 그린 것만 전장의 프레임으로 센다(js/battle-frame-stats.js): 화면이 프레임을 부른 횟수와는 다른 수다.
    const drawBegan = performance.now();
    if (renderBattlefield(false, interval)) battleFrameStats.noteBattleDraw(drawBegan, performance.now(), interval);
}

/** '안내 중 전투 일시 정지'(설정): 안내 카드가 떠 있거나, 따라 하기의 대상 화면(룬 · 스킬트리 …)이 열려 있는 동안 — 첫 룬을
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
        openDeathOverlay.flushPending();
        let tutorialPause = isTutorialPausingCombat();
        if (tutorialPause || isRewardOpen() || isLoopHeroSelectOpen()) {
            if (document.getElementById('tab-char').classList.contains('active')) {
                if (shouldRedrawPassiveTree()) {
                    resizePassiveTreeCanvas(false);
                    drawPassiveTree();
                }
            }
            renderBattlefieldThrottled(frameNow);
            return;
        }
        if (document.getElementById('tab-char').classList.contains('active')) {
            if (shouldRedrawPassiveTree()) {
                resizePassiveTreeCanvas(false);
                drawPassiveTree();
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


/** 잠긴 화면을 열려 할 때: 기록에 여는 조건을 남기고, 하단 메뉴의 잠금 칸을 눌렀다면 알림으로도 보여 준다. */
function notifyLockedTab(tabId) {
    let reservedCell = !!document.getElementById('btn-' + tabId)?.classList.contains('nav-locked');
    addLog(getLockedTabMessage(tabId), 'attack-monster', { toast: reservedCell });
}

function getLockedTabMessage(tabId) {
    if (tabId === 'tab-char') return _t('루프 2부터 해금 탭에서 스킬트리를 열 수 있습니다.');
    if (tabId === 'tab-season') return '루프 1을 클리어하면 루프 탭이 열립니다.';
    if (tabId === 'tab-items') return '장비나 제작 재화를 얻으면 장비 탭이 열립니다.';
    if (tabId === 'tab-skills') return '새 스킬룬이나 보조스킬룬을 획득하면 스킬룬 탭이 열립니다.';
    if (tabId === 'tab-codex') return '첫 고유 아이템을 획득하면 도감 탭이 열립니다.';
    if (tabId === 'tab-map') return '액트 1을 마치면 지도가 열립니다.';
    if (tabId === 'tab-traits') return '전직 시련을 통과하면 전직 탭이 열립니다.';
    if (tabId === 'tab-talent') return '재능 개화 시련을 클리어하면 재능 탭이 열립니다.';
    return '아직 해금되지 않은 탭입니다.';
}

async function pickEquippedSlotByPrompt(validSlots){
    return requestGameChoice({
        title: _t('장비 대상 선택'),
        message: _t('작업을 적용할 장비 부위를 선택하세요.'),
        choices: validSlots.map(slot => ({
            value: slot,
            label: slot,
            detail: game.equipment && game.equipment[slot] ? (game.equipment[slot].name || '장착 장비') : '장비 없음'
        })),
        confirmLabel: _t('대상 선택')
    });
}

/** The slot a 장비 가공 card passed (js/underworld-rune-ui.js), or the one the player picks from these slots. */
function pickUnderworldSlot(slotArg, slots) {
    return slots.includes(slotArg) ? Promise.resolve(slotArg) : pickEquippedSlotByPrompt(slots);
}

/** 지하계 장비 인챈트: 부위의 표(data/constants.js UNDERWORLD_ENCHANT_POOLS)에서 한 줄을 굴려 그 장비의 인챈트를 바꾼다. slot은 장비 가공
 * 카드(js/underworld-rune-ui.js)가 넘기고, 없으면 묻는다. */
async function applyUnderworldEnchant(slotArg){
    if (!assertBuildEditable()) return;
    let slot = await pickUnderworldSlot(slotArg, Object.keys(UNDERWORLD_ENCHANT_POOLS)); if(!slot) return;
    let item = game.equipment && game.equipment[slot]; if(!item) return addLog(_t('해당 부위 장비가 없습니다.'),'attack-monster');
    let row = UNDERWORLD_ENCHANT_POOLS[slot][Math.floor(Math.random()*UNDERWORLD_ENCHANT_POOLS[slot].length)];
    let [id,min,max,str]=row; let val = min + Math.random()*(max-min); if(max===min) val=max;
    val = Number((Math.round(val*10)/10).toFixed(1));
    let cost = underworldRuneUi.enchantCost(str), costC = cost.underCopper, costS = cost.underSilver, costG = cost.underGold;
    if((game.currencies.underCopper||0)<costC || (game.currencies.underSilver||0)<costS || (game.currencies.underGold||0)<costG) return addLog(_t('지하계 재화 부족 (구리 {costC}/은 {costS}/금 {costG})', { costC, costS, costG }),'attack-monster');
    game.currencies.underCopper-=costC; game.currencies.underSilver-=costS; game.currencies.underGold-=costG;
    item.stats = Array.isArray(item.stats) ? item.stats.filter(st => !(st && st.underEnchant)) : [];
    item.underEnchant = { id, statName:getStatName(id), val, valMin:val, valMax:val, underEnchant:true };
    addLog(_t('⛏️ 지하계 인챈트 성공: [{name}] {id} +{value} (비용 구리{costC}/은{costS}/금{costG})', { name: _t(item.name), id: getStatName(id), value: formatValue(id,val), costC, costS, costG }),'loot-rare');
    updateStaticUI();
}

/** 한계돌파(data/constants.js UNDERWORLD_LIMIT_BREAK): slot은 장비 가공 카드가 넘기고, 없으면 묻는다. */
async function attemptUnderworldLimitBreak(slotArg){
    if (!assertBuildEditable()) return;
    const slots = ['무기','투구','갑옷','장갑1','장갑2','신발','목걸이','반지1','반지2','허리띠'];
    let slot = await pickUnderworldSlot(slotArg, slots); if(!slot) return;
    let item = game.equipment && game.equipment[slot]; if(!item) return addLog(_t('해당 부위 장비가 없습니다.'),'attack-monster');
    let q=Math.floor(item.quality||0); if(q!==UNDERWORLD_LIMIT_BREAK.quality) return addLog(_t('한계돌파는 퀄리티 {quality}% 장비만 가능합니다(지금 {q}%).', { quality: UNDERWORLD_LIMIT_BREAK.quality, q }),'attack-monster',{toast:true});
    if(item.qualityLockedByLimitBreak) return addLog(_t('이미 한계돌파를 시도한 장비입니다. 퀄리티 재부여 불가 상태입니다.'),'attack-monster');
    let baseCost = underworldRuneUi.limitBreakCost(slot);
    if((game.currencies.underCopper||0)<baseCost[0]||(game.currencies.underSilver||0)<baseCost[1]||(game.currencies.underGold||0)<baseCost[2]) return addLog(_t('지하계 재화 부족 (구리 {baseCost}/은 {baseCost2}/금 {baseCost3})', { baseCost: baseCost[0], baseCost2: baseCost[1], baseCost3: baseCost[2] }),'attack-monster');
    game.currencies.underCopper-=baseCost[0]; game.currencies.underSilver-=baseCost[1]; game.currencies.underGold-=baseCost[2];
    let delta = -UNDERWORLD_LIMIT_BREAK.swing + Math.floor(Math.random()*(UNDERWORLD_LIMIT_BREAK.swing*2+1));
    item.quality = Math.max(0,Math.min(UNDERWORLD_LIMIT_BREAK.cap, q + delta));
    item.qualityLockedByLimitBreak = true;
    addLog(_t('🧱 한계돌파 시도: [{name}] 퀄리티 {before}% → {after}% (변동 {delta}%, 재부여 잠김)', { name: getItemDisplayName(item), before: q, after: item.quality, delta: `${delta>=0?'+':''}${delta}` }),'season-up');
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
    addLog(_t('지하석 강화 성공: {name} +{value} (보너스 옵션 {length}줄)', { name: getUnderworldRuneDef(no).name, value: level+1, length: state.bonusLinesByNo[no].length }), 'loot-unique');
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
    addLog(_t('지하석 옵션 리롤: {name}, {text}', { name: getUnderworldRuneDef(no).name, text }), 'season-up');
    updateStaticUI(); queueImportantSave(200);
}

exposeFileGlobals({ normalizeUiPlayerStats, getUiPlayerStats, isUiDamageAilmentType, getUiStoredAilmentHitDamage, getUiPlayerDamageAilmentDps, getUiEnemyDamageAilmentDps, getUiPlayerShockTakenDamageIncreasePct, getUiEnemyShockTakenDamageIncreasePct, formatUiTakenDamageShockLine, getUiSkillTargets, getUiCrowdProgressPaused, runUiGlobalFunction, runUiStartEncounter, runUiCoreLoop, getUiPlayerHudIdentity, renderPlayerHudIdentity, getUiGemPresentation, startBattleAssetLoadNow, ensureBattleAssetsLoadedBeforeEntry, setMobileBattlePipCollapsed, updateMobileBattlePipVisibility, refreshMobileBattlePip, isMobileBattlePipVisible, renderMobileBattlePipFrame, startMobilePipRefreshLoop, isPauseSettingOverlayOpen, runWindowOpenHooks, craftSelectInventoryItemById, isSelectedSubtab, switchItemSubtab, isTacticsRulesOpen, addSkillAutoRule, sortSkillAutoRules, setEquipmentInventoryView, syncEquipmentMobilePane, setEquipmentMobilePane, getSortedEquipmentInventoryRows, moveSkillAutoRule, setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue, renderSkillAutoRulePanel, switchSkillSubtab, tryGrantCodexCompletionReward, grantCodexLegacyStarterUniques, assertBuildEditable, getStarterWeaponTutorialTarget, applyUiSkin, applyHighContrast, applyLoadedSaveLook, syncHeroSelectionState, renderHeroSelectionControls, persistHeroSelectionChange, applyHeroSelection, onHeroAppearanceModeChanged, fillEmptyEquipmentSlots, onHeroSelectionChanged, ensureInitialHeroSelection, resetHeroSelectionForSave, playLoopRewriteEffect, togglePastLoopMilestones, syncMapCompleteActionQuickControl, openMapCompleteActionPicker, syncCombatTacticsControls, applyChatMessageSize, markPassiveRenderCacheDirty, ensurePassiveRenderCache, getPassiveWorldViewport, isNodeInViewport, isEdgeInViewport, beginUiPointerInteraction, scheduleDeferredStaticUiFlush, finishUiPointerInteraction, isUiPointerInteractionActive, getUiDisclosureKey, captureUiDisclosureState, restoreUiDisclosureState, getJournalEntryAction, getJournalEntryAvailability, journalRewardText, getJournalLockedHint, openJournalEntryAction, processQueuedUIRefresh, shouldRedrawPassiveTree, renderCharacterEhpSummary, renderEquipmentLoadoutSummary, updateInventoryFullWarnings, getEquipmentSearchText, getSearchTokens, matchSearchQuery, syncSingleSubtabRows, getJournalCategory, setupCanvasEvents, resizePassiveTreeCanvas, resizeCanvas, scheduleStableResize, ensureLoopChallengeState, keepKoreanUnitParticles, reportFatalError, recoverRuntimeState, resetProgressStorage, renderBattlefieldThrottled, isTutorialPausingCombat, scheduleGameLoop, gameLoop, isJewelTabUnlockReady, isCodexTabUnlockReady, isJournalTabUnlockReady, notifyLockedTab, applyUnderworldEnchant, attemptUnderworldLimitBreak, enhanceUnderworldRune, rerollUnderworldRuneBonus });
})();
let lastHeavyUiRefreshAt = 0;
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


/** The default stat table is built once: a tick's HUD refresh built it twice and walked it with Number() for every one of its
 * ~290 keys (2026-10-31 profile, 0.2% of a core). A kept number is taken as it is. */
let uiPlayerStatDefaults = null;


// PiP는 다른 탭을 보고 있을 때 전장을 작게 미리 보여준다. 풀 전장 렌더는
// 비싸므로, 고정 주기 대신 렌더 비용에 따라 다음 주기를 조절(adaptive)해
// 전경 탭의 프레임 예산을 빼앗지 않도록 한다.
const MOBILE_PIP_BASE_INTERVAL_MS = 150;


let mobileNavigationKeyBound = false;


const TAB_DRAG_LONG_PRESS_MS = 180;
// 휴대폰 하단 메뉴는 누르면 바로 열리므로 끌기는 더 길게 눌러야 시작한다(2026-11-07 사용자: 길게 눌러 끌어 자리를 바꾼다).
const MOBILE_DOCK_LONG_PRESS_MS = 450;
const TAB_DRAG_CANCEL_PX = 8;
let tabHeaderDragState = null;
let tabHeaderSuppressClickUntil = 0;
let lastTabHeaderUiSignature = '';
let lastActiveTabId = null;
const TAB_HEADER_NOTI_KEYS = ['char', 'season', 'items', 'skills', 'codex', 'map', 'traits', 'talent', 'journal', 'currency', 'fossil', 'ascend', 'loop', 'social', 'stump', 'npcs'];
const TAB_UNLOCK_BUTTON_KEYS = ['char', 'season', 'items', 'skills', 'codex', 'map', 'traits', 'talent', 'stump'];
// 메뉴 단추 하나가 여는 창 하나에 화면 여럿(2026-10-13 사용자: 새 단추 그림에 맞춰 "단추 하나로 합치고 UI를 잘 만들어야겠지?").
// 장비 단추는 장비와 스킬룬을, 루프 단추는 루프 패시브와 해금을 연다(앞의 둘은 전부터 묶여 있었다). 창 머리의 탭으로 오가고,
// 단추는 마지막에 보던 화면을 연다. icon: 창 머리 탭의 그림(assets/ui/pixel/menu-icons.png의 번호), count: 탭에 적는 수(쓸 포인트).
const MERGED_TAB_GROUPS = Object.freeze({
    growth: { launcher: 'tab-char', title: '스킬트리', tabs: [{ id: 'tab-char', label: '스킬트리', icon: 2, count: () => game.passivePoints, detail: '스킬트리 노드에 포인트를 씁니다.' }, { id: 'tab-traits', label: '전직', icon: 16, detail: '전직을 고르고 노드와 키스톤을 할당합니다.' }, { id: 'tab-talent', gate: 'talent', label: '재능', icon: 17, detail: '재능 개화 카드를 고르고 키웁니다.' }] },
    gear: { launcher: 'tab-items', title: '장비', tabs: [{ id: 'tab-items', label: '장비', icon: 6, detail: '장비와 가방을 봅니다.' }, { id: 'tab-skills', label: '스킬룬', icon: 9, detail: '룬을 장착하고 키웁니다.' }] },
    loop: { launcher: 'tab-season', title: '루프', tabs: [{ id: 'tab-season', label: '루프 패시브', icon: 4, count: () => game.seasonPoints, detail: '루프 포인트로 영구 노드에 투자합니다.' }, { id: 'tab-unlocks', label: '해금', icon: 3, count: () => contentProgression.points(game).balance, detail: '해금 포인트로 다음 콘텐츠를 고릅니다.' }] },
    records: { launcher: 'tab-journal', title: '기록', tabs: [{ id: 'tab-journal', gate: 'journal', label: '이야기 저널', icon: 10, detail: '진행 기록과 안내를 확인합니다.' }, { id: 'tab-codex', gate: 'codex', label: '도감', icon: 13, detail: '발견한 항목과 수집 현황을 확인합니다.' }, { id: 'tab-records', gate: 'journal', label: '기록', icon: 20, detail: '루프 소요 시간과 최고 기록을 확인합니다.' }] }
});

// 탭 2단 그룹핑: 상단 카테고리 바에서 그룹을 고르면 해당 그룹의 탭만 보인다.
// 넓은 화면(데스크톱)에서만 활성화되고, 좁은 화면에서는 기존 방식(전체 탭 + 스와이프)을 유지한다.
const TAB_GROUPS = [
    { key: 'character', label: '캐릭터', icon: '👤', tabs: ['tab-character'] },
    { key: 'growth', label: '성장', icon: '📈', tabs: ['tab-char', 'tab-traits', 'tab-talent', 'tab-unlocks', 'tab-season', 'tab-stump', 'tab-skills'] },
    { key: 'content', label: '콘텐츠', icon: '🗺️', tabs: ['tab-map', 'tab-codex', 'tab-journal', 'tab-records'] },
    { key: 'gear', label: '장비', icon: '⚔️', tabs: ['tab-items', 'tab-trade'] },
    { key: 'etc', label: '기타', icon: '⚙️', tabs: ['tab-settings', 'tab-battle'] }
];


let lastTabNotiSignature = '';


// 보고 있던 화면이 다시 잠겨 닫혔음을 알리는 표시. 다음 정적 UI 갱신이 안전한 탭으로
// 되돌린다(활성 탭이 하나도 없어 아무것도 렌더되지 않는 빈 화면 방지).
let pendingRelockedTabFallback = false;


// 묶음마다 방금까지 보이던 안쪽 화면(저장하지 않는다): 같은 창 안에서 화면을 바꿀 때 그 화면에 들어서는 일을 한 번만 하려고 적어 둔다.
const mergedPaneShown = new Map();

let mergedTabSwitching = false;


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
    let shown = resolveShownTab(tabId, mergedEntry), shownId = shown.id; // 지금부터 보일 화면: 묶음 창이면 그 안에서 고른 화면
    setMobileTabDrawerOpen(false);
    // 이미 활성인 탭을 다시 누르면 전체 UI 재구성(+ 캐릭터 탭의 패시브 트리 재드로우)을
    // 반복해 게임이 멈춘 것처럼 느껴진다. 같은 탭 재클릭은 무거운 재렌더를 생략한다.
    // (탭 내용 갱신은 게임 동작/주기 갱신이 별도로 처리한다.)
    if (shownId === 'tab-items' && game.noti) game.noti.items = false;
    let tabEl = document.getElementById(tabId);
    if (lastActiveTabId === tabId && tabEl && tabEl.classList.contains('active')) {
        refreshShownMergedTab(mergedEntry, shown);
        updateTabNotificationDots();
        return;
    }
    // 병합 창 안의 하위 패널은 각 창이 독립적으로 표시 상태를 소유한다.
    // 다른 최상위 창을 열 때까지 함께 비활성화하면, 이미 열려 있던 도감·전직·주얼·부적
    // 창의 선택 패널이 사라져 빈 창만 남는다. 전역 전환은 최상위 탭과 메뉴 버튼만 해제한다.
    document.querySelectorAll('.tab-content:not(.merged-subtab-pane), .tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    runWindowOpenHooks(tabId, shownId);
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
    TAB_HEADER_NOTI_KEYS.forEach(key => { if (shownId === 'tab-' + key) game.noti[key] = false; });
    if (tabId === 'tab-map') acknowledgeMapMainAlarm();
    // 도감 탭에서 다른 탭으로 벗어날 때, 신규 등록 강조를 해제(처음 열었을 때만 강조).
    if (lastActiveTabId === 'tab-codex' && tabId !== 'tab-codex') game.codexNewlyRegistered = {};
    lastActiveTabId = tabId;
    if (typeof syncSocialChatPolling === 'function') syncSocialChatPolling();
    if (tabId === 'tab-talent') talentUi.render();
    if (shownId === 'tab-items') switchItemSubtab('item-tab-equip');
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
        settingsUi.sync();
    }
}


const TACTICS_RULES_LOCK_MESSAGE = '액트 3을 클리어하면 전투 전술이 무료로 해금됩니다.';


safeExposeGlobals({ setEquipmentInventoryView });


safeExposeGlobals({ setEquipmentMobilePane });


/** 조건을 값의 종류가 다른 것으로 바꾸면 그 종류의 기본값에서 시작한다: 앞 값을 범위로 자르기만 하면 생명력 40%가 "적 30마리 이상"(최댓값)이 되었다. */
const CONDITION_TRIGGER_DEFAULT_VALUES = Object.freeze({ percent: 40, count: 3, cells: 3, seconds: 3 });


const CONDITION_RULE_LIVE_TEXT = Object.freeze({ on: '지금 맞음', shadow: '위 규칙이 먼저', wait: '기다림', off: '꺼짐' });


const TACTIC_NOW_LABELS = Object.freeze({ nearest: '가까운 적부터', weakest: '약한 적부터', dangerous: '위험한 적부터', dense: '밀집 지역부터', auto: '거리 자동', pressure: '압박', keepRange: '거리 유지' });


safeExposeGlobals({ setConditionPatternTrigger, setConditionPatternAction, setConditionPatternValue });


// A dismissal belongs to this pending choice only; the next branch can prompt again.
const dismissedBeehiveChoices = new WeakSet();
const pendingBeehiveForfeits = new WeakSet();


// 영구 보너스 칩: [이름, 키, 소수 자리]. 방어, 회피, 보호막은 함께 오른다(js/combat-enemy-build.js grantChaosRealmFloorBonus).
const CHAOS_REALM_BONUS_CHIPS = [['피해', 'pctDmg', 1], ['이동 속도', 'move', 1], ['생명력', 'pctHp', 1], ['카오스 저항', 'resChaos', 0], ['치명타 확률', 'crit', 0],
    ['저항 관통', 'resPen', 0], ['방어, 회피, 보호막', 'armorPct', 0], ['치명타 피해', 'critDmg', 0], ['공격 속도', 'aspd', 0]];


function switchMapSubtab(subtabId) {
    if (!contentProgression.canOpen(subtabId)) return;
    if (!isMapPrimaryContentUnlocked(game, subtabId)) subtabId = 'map-tab-zones';
    if (subtabId === game.mapSubtab) {
        if (isSelectedSubtab(subtabId)) {
            if (subtabId === 'map-tab-zones') switchMapExploreSubtab(game.mapExploreSubtab || 'map-explore-atlas');
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
    if (subtabId === 'map-tab-zones') switchMapExploreSubtab(game.mapExploreSubtab || 'map-explore-atlas');
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


// 새 지도 해금 알람 대상 세부 탭(혼돈/심화/벌집/대균열/운석/고대미궁은 제외).
const MAP_EXPLORE_ALARM_SUBTABS = ['map-explore-hunting', 'map-explore-root-boss', 'map-explore-colony', 'map-explore-trials'];


// The first matching tag names a gem card's kind (이동: worn in the 이동 스킬 slot, js/mobility-skill.js).
const GEM_TYPE_LABELS = Object.freeze([['summon_buff', '사역'], ['summon_guard', '수호 소환'], ['summon_attack', '소환'], ['mobility', '이동'], ['spell', '주문'], ['projectile', '투사체'], ['slam', '강타']]);

function getSkillGemArtPath(name) {
    return typeof SKILL_GEM_ART_PATHS !== 'undefined' && SKILL_GEM_ART_PATHS[name]
        ? SKILL_GEM_ART_PATHS[name]
        : '';
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
    // 자물쇠(2026-10-23, 그루터기 함 잠금 js/stump-box-ui.js)
    lock: ['...........', '...#####...', '..##...##..', '..#.....#..', '..#.....#..', '.#########.', '.####o####.', '.####o####.', '.#########.', '.#########.', '...........'],
    // 열린 자물쇠(2026-11-09, 봉인한 룬의 해제 단추 js/skills-ui.js): 고리가 들려 왼쪽 다리가 빠진 자물쇠
    unlock: ['....#####..', '...##...##.', '...#.....#.', '.........#.', '.........#.', '.#########.', '.####o####.', '.####o####.', '.#########.', '.#########.', '...........'],
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
    leaf: ['.......###.', '.....##ooo#', '....#oooo#.', '...#ooo#o#.', '..#oo#oo#..', '.#oo#ooo#..', '.#o#ooo#...', '..#oo##....', '.#.##......', '#..........', '...........'],
    // 보조스킬룬 문양(js/support-gem-sigil-ui.js, 2026-10-11): 효과 종류마다 하나씩, 색은 계열(물리, 원소, 속도, 치명 …)을 따른다.
    arrow: ['......#####', '.......#oo#', '......#o#o#', '.....#o#.##', '....#o#...#', '...#o#.....', '#.#o#......', '##o#.......', '###........', '####.......', '...........'],
    burst: ['.....#.....', '.#...#...#.', '..#..#..#..', '...#.o.#...', '....ooo....', '###ooooo###', '....ooo....', '...#.o.#...', '..#..#..#..', '.#...#...#.', '.....#.....'],
    hammer: ['..#######..', '.#ooooooo#.', '.#ooooooo#.', '.#ooooooo#.', '..###o###..', '....#o#....', '....#o#....', '....#o#....', '....#o#....', '....#o#....', '....###....'],
    prism: ['....###....', '...#ooo#...', '...#ooo#...', '....###....', '...........', '.###...###.', '#ooo#.#ooo#', '#ooo#.#ooo#', '.###...###.', '...........', '...........'],
    hourglass: ['.#########.', '..#ooooo#..', '..#ooooo#..', '...#ooo#...', '....#o#....', '.....#.....', '....#.#....', '...#.o.#...', '..#.ooo.#..', '..#ooooo#..', '.#########.'],
    twin: ['....##...##', '...#o#..#o#', '..#o#..#o#.', '.#o#..#o#..', '#o#..#o#...', '##..#o#....', '...#o#.....', '..#o#......', '.#o#.......', '#o#........', '##.........'],
    down: ['....###....', '....#o#....', '....#o#....', '....#o#....', '.####o####.', '..#ooooo#..', '...#ooo#...', '....#o#....', '.....#.....', '...........', '.#########.'],
    bolt: ['......###..', '.....#o#...', '....#o#....', '...#o#.....', '..#oo####..', '...###oo#..', '.....#o#...', '....#o#....', '...#o#.....', '..#o#......', '..##.......'],
    rift: ['.....#.....', '....#o#....', '...#o.o#...', '..#o.#.o#..', '.#o.#o#.o#.', '#o.#ooo#.o#', '.#o.#o#.o#.', '..#o.#.o#..', '...#o.o#...', '....#o#....', '.....#.....'],
    wave: ['#...#...#..', '.#...#...#.', '..#...#...#', '..#...#...#', '..#...#...#', '..#...#...#', '..#...#...#', '.#...#...#.', '#...#...#..', '...........', '...........'],
    orb: ['...#####...', '..#ooooo#..', '.#o#ooooo#.', '#o#ooooooo#', '#o#ooooooo#', '#ooooooooo#', '#ooooooooo#', '#ooooooooo#', '.#ooooooo#.', '..#ooooo#..', '...#####...'],
    bomb: ['.......#.#.', '......#.#..', '.....#.....', '...#####...', '..#ooooo#..', '.#o#ooooo#.', '.#o#ooooo#.', '.#ooooooo#.', '.#ooooooo#.', '..#ooooo#..', '...#####...'],
    flask: ['...#####...', '....#o#....', '....#o#....', '....#o#....', '...#ooo#...', '..#ooooo#..', '.#ooooooo#.', '.#o#ooooo#.', '.#o#ooooo#.', '..#ooooo#..', '...#####...'],
    skull: ['..#######..', '.#ooooooo#.', '#ooooooooo#', '#o##ooo##o#', '#o##ooo##o#', '#ooooooooo#', '.#ooo#ooo#.', '..#ooooo#..', '..#o#o#o#..', '..#######..', '...........'],
    crack: ['.####.####.', '#ooo#.#ooo#', '#oo#...#oo#', '#ooo#.#ooo#', '#oo#...#oo#', '.#oo#.#oo#.', '.#o#...#o#.', '..#o#.#o#..', '...##.##...', '....#.#....', '...........']
});
const SKY_ENHANCEMENT_ICON_BY_STAT = Object.freeze({
    pctDmg: 'sword', flatSkillDmgPct: 'sword', hybrid: 'sword', awakenedDamageMul: 'sword',
    aspd: 'speed', ds: 'speed', awakenedAspdMul: 'speed',
    crit: 'eye', awakenedNoCritDouble: 'eye', critDmg: 'star', awakenedSpellFlatMul: 'star',
    leech: 'drop', leechRegenHybrid: 'drop', targets: 'fork', dotMulti: 'flame', dotMultiplier: 'flame',
    physIgnore: 'pierce', resPen: 'pierce', awakenedGemLevel: 'up'
});
const SKY_PROJECTILE_ICONS = Object.freeze({ split: 'split', focus: 'reticle', return: 'boomerang' });


function closeGemEngraveSlotOverlay() {
    let overlay = document.getElementById('gem-engrave-slot-overlay');
    if (!overlay) return;
    let triggerIndex = overlay.dataset.triggerSlotIndex;
    overlay.remove();
    let trigger = document.querySelector(`#ui-gem-engrave-slots button[data-slot-index="${triggerIndex}"]`);
    if (trigger && !trigger.disabled) trigger.focus({ preventScroll: true });
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
    overlay.setAttribute('aria-label', _t('{value}번 각인 슬롯 선택', { value: slotIndex + 1 }));
    overlay.dataset.triggerSlotIndex = String(slotIndex);
    overlay.tabIndex = -1;
    overlay.innerHTML = `<section class="gem-engrave-slot-dialog"><header><div class="gem-engrave-dialog-identity">${renderSkillGemArt(active, 'gem-engrave-dialog-art', { eager: true })}<div><span>${_t('하늘 각인')}</span><h3>${_t('{active}, {value}번 슬롯', { active: escapeHTML(active), value: slotIndex + 1 })}</h3><p>${current ? `${_t('현재')} <b>${escapeHTML(_t(current.name))}</b> ${statToneText.html(_t(current.desc))}` : _t('이 슬롯에 넣을 각인을 선택하세요.')}</p></div></div><button type="button" data-action="close" aria-label="${_t('닫기')}">${_t('닫기')}</button></header><div class="gem-engrave-overlay-grid">${Object.values(GEM_SKY_ENHANCEMENTS).map(enhancement => renderGemEngraveOverlayOption(enhancement, slots, slotIndex)).join('')}</div></section>`;
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


function changeSkill(name, slotKind) { if (!assertBuildEditable()) return;
    if (mobilitySkill.isMobilityGem(name) && game.mobilitySkill === name) return wearMobilityGem('');
    if (typeof canUseSkillWithCurrentEquipment === 'function' && !canUseSkillWithCurrentEquipment(name)) {
        return addLog(_t('[{name}]{particle} 지금 쓸 수 없습니다: {why}.', { name: _t(name), particle: pickParticle(name, '은', '는'), why: getSkillRuneWeaponNote(name) }), 'attack-monster');
    }
    if ((SKILL_DB[name]?.tags || []).includes('summon')) return toggleSummonAttackGem(name);
    if (mobilitySkill.isMobilityGem(name)) return wearMobilityRune(name, slotKind);
    playUiFeedbackSound('gemSocket');
    game.activeSkill = name;
    if (SKILL_DB[name]?.isGem) game.gemEnhanceTargetSkill = name;
    updateStaticUI();
}


let mobileToastQueue = [];

let mobileToastResultHoldTimer = null;
let mobileToastActiveCount = 0;
const MOBILE_TOAST_MAX_CONCURRENT = 1;


let logQueue = [];
let logFlushRaf = 0;
let combatLogRateState = {};
let combatLogAggregateState = {};
let combatLogItemSequence = 0;
let combatLogItemSnapshots = new Map();


/** 로그 줄을 모아 붙이는 간격(ms): 매 프레임 붙이며 높이를 재던 것을 줄인다. */
const COMBAT_LOG_FLUSH_MS = 150;
let lastLogFlushAt = -Infinity;


function addLog(msg, cls, opts = {}) {
    if (game.isBackgroundCalculation) return;
    let now = performance.now();
    let settings = game.settings || {};
    if (isCombatLogRateLimited(opts, settings, now)) return;
    if (opts.item) msg = decorateCombatLogItemMessage(msg, opts.item);
    msg = decorateCombatLogMessage(msg, cls, opts);
    if (opts.aggregateKey && settings.combatLogAggregate !== false) return queueAggregatedCombatLog(msg, cls, opts, now);
    pushCombatLogLine(msg, cls);
    if (opts.toast && typeof showGameToast === 'function') {
        let tone = opts.toastTone || (cls === 'loot-unique' ? 'success' : (cls === 'attack-monster' ? 'warning' : 'info'));
        showGameToast(stripHtmlMessage(msg) || String(msg || ''), { tone: tone });
    } else if (shouldShowMobileToast(msg, cls, opts)) enqueueMobileToast(msg, cls);
}


function getHeroSelectionDef(id) {
    return PLAYER_CLASS_DEFS[id] || HERO_SELECTION_DEFS[id] || PLAYER_CLASS_DEFS.archer;
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
        let label = nextMode === 'fixed' ? _t('고정') : _t('현재 직업 연동');
        addLog(_t('캐릭터 외형 방식: {label}', { label }), 'season-up');
    }
    if (!options.skipSave && previousMode !== nextMode) persistHeroSelectionChange('캐릭터 외형 방식 변경');
    return previousMode !== nextMode;
};


safeExposeGlobals({ onHeroAppearanceModeChanged });

safeExposeGlobals({ fillEmptyEquipmentSlots });


window.addEventListener('project-idle:ground-damage', event => {
    const { name, element, damage, persistent } = event.detail;
    const text = persistent ? _t('{name} [{element}] 지속 피해 {damage}', { name, element: getDamageElementLabel(element), damage })
        : _t('{name} 발동 [{element}] ({damage} 피해)', { name, element: getDamageElementLabel(element), damage });
    addLog(text, 'attack-monster', { noToast: true, element });
});
window.addEventListener('project-idle:colony-defense-failed', event => {
    const { wave, background } = event.detail;
    addLog(_t('군락 핵이 파괴되어 {wave}웨이브 방어에 실패했습니다. 귀환하며 이미 획득한 보상은 유지됩니다.', { wave }),
        'attack-monster', { noToast: !!background });
});
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
    if (detail.changed) addLog(_t('루프 전환 직업: {label}', { label: getHeroSelectionDef(detail.classId).label }), 'season-up');
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

safeExposeGlobals({ togglePastLoopMilestones });


let mapCompleteActionPickerOpen = false;

safeExposeGlobals({ openMapCompleteActionPicker });


document.getElementById('combat-tactics-defaults')?.addEventListener('change', event => {
    if (!isTacticsRulesOpen() || event.target.disabled) return;
    const keys = { 'sel-combat-target-priority': 'combatTargetPriority', 'sel-combat-position-mode': 'combatPositionMode' };
    const key = keys[event.target.id];
    if (!key || ![...event.target.options].some(option => option.value === event.target.value)) return;
    game.settings[key] = event.target.value;
    if (contentProgression.opening.applies(game) && !game.seenTutorials.includes('opening_tactics_selected')) {
        game.seenTutorials.push('opening_tactics_selected');
        syncCombatTacticsControls();
    }
    queueImportantSave(180);
});

// 규칙 편집도 기본 전술과 같은 저장 대기열을 쓴다.
for (const type of ['change', 'click']) document.getElementById('skill-tab-condition')?.addEventListener(type, event => {
    if (isTacticsRulesOpen() && event.target.closest('button, input, select')) queueImportantSave(180);
});


document.addEventListener('mousemove', function(evt) {
    let tt = document.getElementById('info-tooltip');
    if (!tt || tt.style.display === 'none') return;
    let anchor = evt.target && evt.target.closest ? evt.target.closest('[data-info-tooltip-anchor="1"], [data-tip]') : null;
    if (!anchor && evt.target && evt.target.closest) anchor = evt.target.closest('.tip, .skill-gem, .support-gem, .item-card, .currency-card');
    let overTooltip = evt.target && evt.target.closest ? evt.target.closest('#info-tooltip') : null;
    if (!anchor && !overTooltip) hideInfoTooltip();
    else positionTooltipElement(tt, evt.clientX, evt.clientY);
});
window.addEventListener('resize', function() {
    tooltipSizeCache = new WeakMap();
});


const UI_ENEMY_AILMENT_DETAIL_FORMATTERS = Object.freeze({
    chill: () => '이동/공격 속도 감소 (최대 생명력 대비 타격 비율 반영)',
    freeze: () => '행동 불가 (최대 생명력 대비 타격 비율 반영)',
    hunterExpose: () => _t('헌터 전직 키스톤 효과로 받는 모든 피해가 {takenMorePct}% 증가합니다.', { takenMorePct: ASCENDANCY_KEYSTONE_VALUES.h2.takenMorePct }),
    assassinWeakness: state => _t('{floor}중첩, 중첩당 받는 피해 {takenPctPerStack}% 증가', { floor: Math.floor(state.power), takenPctPerStack: ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack }),
    cosmosJudgment: state => _t('모든 저항 {power}% 감소', { power: state.power.toFixed(0) }),
    realmAllResDown: state => _t('모든 저항 약화 {stacks}중첩', { stacks: state.stacks })
});


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
    ['#fff3a8', ['aspd', 'move', 'sight', 'cooldownRecovery', 'cooldownReduction', 'mobilityCooldownRecovery', 'mobilityCooldownReduction']],
    ['#ffcf9f', ['flatDmg', 'pctDmg', 'physPctDmg', 'meleePctDmg', 'aoePctDmg', 'minDmgRoll', 'maxDmgRoll',
        'bossDamagePct', 'eliteDamagePct', 'firstStrikeDamagePct', 'doubleDamageChance']],
    ['#d4a8ff', ['spellFlatPct', 'spellFlatDmg']],
    ['#ff8fa3', ['leech']],
    ['#ffcb8e', ['resPen', 'resAll', 'ds']],
    ['#a8e6cf', ['gemLevel', 'suppCap', 'expGain', 'summonEfficiency', 'summonCap']],
    // 세계수 기운(12번 루프 27): 지역 줄은 그 지역 색(data/region-affixes.js REGION_AFFIX_TONES).
    ...REGION_AFFIX_MODS.map(row => [REGION_AFFIX_TONES[row.regions[0]], [row.statId]])
].flatMap(([tone, ids]) => ids.map(id => [id, tone]))));


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
        if (item.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#d8b5ff;">◆ 획득: ${escapeHTML(_t(item.uniqueEffect))}${hint ? `<small style="display:block;color:#a995bf;">${escapeHTML(hint)}</small>` : ''}</div>`);
        if (backup && backup.uniqueEffect) changedLines.push(`<div class="tooltip-line item-compare-line" style="color:#c98f9f;">◇ 상실: ${escapeHTML(_t(backup.uniqueEffect))}</div>`);
    }
    let label = getDualSlotDisplayLabel(targetSlot);
    if (changedLines.length > 0) return `<div class="item-compare-panel"><div class="tooltip-line item-compare-title">${_t('{label} 기준 착용 시 변화', { label })}</div>${changedLines.join('')}</div>`;
    if (!isDualSlotItem(item.slot)) return '';
    return `<div class="item-compare-panel item-compare-empty"><div class="tooltip-line item-compare-title">${label}</div><div class="tooltip-line">${_t('교체 시 변화 없음')}</div></div>`;
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


let lastBattlefieldCanvasSize = { width: 0, height: 0, dpr: 1 };


function drawPixelShadow(ctx, x, y, w, h, alpha) {
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx,alpha);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}


window.BATTLE_EFFECT_OVERRIDES = window.BATTLE_EFFECT_OVERRIDES || {};


/** Combat HUD skill tray: 주 공격, 이동 스킬(재사용 대기 표시), 장착 소환. */
const COMBAT_SKILL_HUD_LIMIT = 6;
const COMBAT_SKILL_SLOT_LABELS = Object.freeze({ primary: '주 공격', mobility: '이동 스킬', summon: '소환' });
// 표시 전용: 재사용 시작 시각을 저장 상태에 늘리지 않고, readyAt이 바뀐 순간의 남은 시간(ms)을 전체 길이로 삼는다.
const combatSkillCooldownSpans = new Map();


/** The progress gauge speaks only for special content — a timer, waves, depth, a boss wait or a floor run. Story acts
 * are explored on the map (the minimap ring shows how much is revealed), so the gauge is hidden there. */
/** Wide maps (story acts and every content with its own map) show progress on the minimap, not the bar. */
/** 판에서 싸우다 제 지도를 걷게 된 콘텐츠(2026-10-13) 가운데 막대가 말해 주는 것이 있는 곳은 막대가 그대로 보인다: 대균열과 나무꾼의
 * 잔상의 남은 시간, 군락지의 웨이브, 심해의 수심, 혼돈 밖에서 나무꾼을 기다리는 몇 초. */
const MAP_PROGRESS_SPEAKING_TYPES = Object.freeze(['grandBreach', 'woodsmanEcho', 'colony', 'oceanDepth']);


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
    incidentBreath: { sprite: 18, label: '세계수의 숨결', color: '#b8f0c8' },
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
    woodsmanCurse: value => _t('받는 피해 +{value}%', { value: Number(value || 0).toFixed(2) }),
    deathWard: (value, maximum) => _t('남은 피해 흡수량: {floor} / {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
    invulnerableBarrier: () => '모든 피해를 받지 않습니다.',
    warriorRage: (value, maximum) => _t('{floor} / {floor2}중첩, 물리 피해 +{value}%', { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0), value: Math.floor(value || 0) * (typeof WARRIOR_RAGE_STACK_DAMAGE_PCT === 'number' ? WARRIOR_RAGE_STACK_DAMAGE_PCT : 10) }),
    playerUniqueGuard: (value, maximum) => _t('남은 피해 흡수량: {floor} / {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
    stoneShield: (value, maximum) => _t('남은 돌 보호막: {floor} / {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(maximum || 0) }),
    shadowStealth: value => _t('이동 속도/회피/치명타 피해 +{value}%', { value: Number(value || 0).toFixed(0) }),
    leechEfficiency: value => _t('모든 흡혈 효율 +{value}%', { value: Number(value || 0).toFixed(0) }),
    lifeLeech: (value, rate) => _t('남은 회복 {floor}, 초당 {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
    energyShieldLeech: (value, rate) => _t('남은 보호막 회복 {floor}, 초당 {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
    lifeRecoup: (value, rate) => _t('남은 회생 {floor}, 초당 {floor2}', { floor: Math.floor(value || 0), floor2: Math.floor(rate || 0) }),
    meleeArmorAmp: (stacks, perStack) => _t('방어도 {floor}중첩, 중첩당 {perStack}% 증폭', { floor: Math.floor(stacks || 0), perStack: Number(perStack || 0).toFixed(0) }),
    killMoveStacks: (stacks, perStack) => _t('{floor}중첩, 이동 속도 +{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
    warriorRhythm: (critStacks, doubleStacks) => _t('치명타 {floor}/5, 연속 공격 {floor2}/5', { floor: Math.floor(critStacks || 0), floor2: Math.floor(doubleStacks || 0) }),
    gladiatorFlurry: stacks => _t('{floor}/12중첩, 공격 속도 +{value}%, 회피 +{value2}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.g2.aspdPctPerStack, value2: Math.floor(stacks || 0) * 3 }),
    gladiatorVeteran: value => _t('다음 타격 치명타 확률 +{floor}%p', { floor: Math.floor(value || 0) }),
    gladiatorSwift: (attackReady, guardReady) => _t('다음 타격 강화 {value}, 다음 피격 경감 {value2}', { value: attackReady ? _t('준비') : _t('소모'), value2: guardReady ? _t('준비') : _t('소모') }),
    assassinBlurred: () => '이동 속도/회피 +20%, 치명타 피해 +25%',
    elementalistOverload: stacks => _t('{floor}중첩, 원소 피해 +{value}%, 치명타 확률 -{floor2}%p', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.e8.morePctPerStack, floor2: Math.floor(stacks || 0) }),
    catalystEvade: () => '다음 회피 판정이 30% 증폭됩니다.',
    crusaderLightningAegis: () => '초당 최대 ES 25% 회복, 번개 피해 +75%',
    guardianEndurance: stacks => _t('{floor}/5중첩, 방어도 +{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * 11 }),
    colosseumReady: () => '다음 공격이 투기장 일격으로 강화됩니다.',
    summonDeathDamageBuff: value => _t('소환수 피해 +{value}%', { value: Number(value || 0).toFixed(0) }),
    summonCritAspd: (stacks, perStack) => _t('{floor}중첩, 소환수 공격 속도 +{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
    enemyWither: stacks => _t('{floor}/10중첩, 받는 카오스 피해 +{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * ASCENDANCY_KEYSTONE_VALUES.wlk9.chaosTakenPctPerStack }),
    enemyChaosResDown: (stacks, perStack) => _t('{floor}중첩, 카오스 저항 -{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
    enemyElementalResDown: (stacks, perStack) => _t('{floor}중첩, 원소 저항 -{value}%', { floor: Math.floor(stacks || 0), value: Math.floor(stacks || 0) * Number(perStack || 0) }),
    chaosErosion: value => _t('카오스 저항 -{value}%', { value: Number(value || 0).toFixed(0) }),
    regenSuppress: value => _t('생명력 재생 -{value}%', { value: Number(value || 0).toFixed(0) }),
    talentInquisitorMark: value => _t('폭발 예정 누적 피해 {floor}', { floor: Math.floor(value || 0) }),
    talentButcherMark: value => _t('{floor}/4회 적중', { floor: Math.floor(value || 0) }),
    rangerWeakpointMark: value => _t('{floor}/3회 적중', { floor: Math.floor(value || 0) }),
    bloomRegenSuppress: value => _t('생명력 재생 {value}% 억제', { value: Number(value || 0).toFixed(0) }),
    delayedGuardHeal: value => _t('남은 회복량 {floor}', { floor: Math.floor(value || 0) }),
    riderCompassReady: () => '이동 후 첫 타격 피해 +100%',
    fletcherCharge: value => _t('{floor}/3회 공격, 3번째 공격 피해 +33%', { floor: Math.floor(value || 0) }),
    colosseumCharge: value => _t('{floor}/5중첩, 5중첩 시 다음 공격 강화', { floor: Math.floor(value || 0) }),
    queenBeeSwarm: (count, attacksLeft) => _t('{floor}마리, 남은 공격 {floor2}회', { floor: Math.floor(count || 0), floor2: Math.floor(attacksLeft || 0) })
});


/** Only dismiss the popup still owned by this enemy line; another tooltip may have replaced it. */

/** Follow HUD replacement and changing cast/trait text without polling or retaining a detached anchor. */

/** The same disclosure works from the keyboard without sending combat shortcuts. */


let hudShownLevel = 0;


// Phase-2 appended static UI renderer block.
let uiRefreshQueued = false;
let uiRefreshRunning = false;
let uiPointerInteraction = null;
let uiPointerFlushTimer = null;
let uiDisclosureState = Object.create(null);
const UI_REFRESH_POINTER_FLUSH_DELAY_MS = 35;
const UI_REFRESH_LONG_POINTER_LIMIT_MS = 8000;


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


function updateStaticUI(forceImmediate) {
    if (game.isBackgroundCalculation) return;
    void forceImmediate;
    // 긴 정적 UI 갱신 도중 탭을 누르면 이전에는 그 탭의 후속 렌더 요청을 버렸다.
    // 그러면 새 탭 컨테이너만 활성화되고 주얼·부적·스킬룬 내용은 이전 탭
    // 기준으로 남아 간헐적인 빈 화면이 됐다. 실행 중 요청은 다음 프레임에 반드시 잇는다.
    if (uiRefreshRunning) {
        uiRefreshQueued = true;
        return;
    }
    if (uiRefreshQueued) return;
    uiRefreshQueued = true;
    requestAnimationFrame(processQueuedUIRefresh);
}


const renderCharacterPassiveSpecialStats = function(pStats) {
    const mystique = Math.max(0, Number(pStats.mystique) || 0);
    const cycle = Math.max(0, Number(pStats.cycle) || 0);
    const devotion = Math.max(0, Number(pStats.devotion) || 0);
    const ailment = _t(getAilmentDisplayLabel(pStats.mystiqueAilmentType));
    setTextById('ui-mystique', formatValue('mystique', mystique));
    setTextById('ui-mystique-effect', mystique > 0 ? _t('{ailment} 피해/위력 +{value}%', { ailment, value: formatValue('mystique', mystique) }) : _t('효과 없음'));
    setTextById('ui-cycle', formatValue('cycle', cycle));
    setTextById('ui-cycle-effect', _t(cycle > 0 ? '상태이상 종료 시 6초 강화' : '효과 없음'));

    let revelationLabel = _t(devotion > 0 ? (pStats.passiveRevelationLabel || '계시 활성') : '미해금');
    let revelationEffect = _t('계시 수치 {value}', { value: formatValue('devotion', devotion) });
    if (devotion > 0 && pStats.passiveRevelation === 'combat') {
        revelationEffect += _t(', 피해 {value}% 증폭', { value: formatValue('devotion', pStats.passiveRevelationCombatDamageMorePct) });
    } else if (devotion > 0 && pStats.passiveRevelation === 'guard') {
        revelationEffect += _t(', 받는 피해 {value}% 감폭', { value: formatValue('devotion', pStats.passiveRevelationGuardTakenLessPct) });
    } else if (devotion > 0 && pStats.passiveRevelation === 'life') {
        revelationEffect += _t(', 생명력/보호막/재생 +{value}%', { value: formatValue('regen', pStats.passiveRevelationLifeBonusPct) });
    } else if (devotion > 0 && pStats.passiveRevelation === 'fanaticism') {
        revelationEffect += _t(', 열광 {floor}/{floor2}', { floor: Math.floor(pStats.passiveFanaticismStacks), floor2: Math.floor(devotion) });
    }
    setTextById('ui-revelation', revelationLabel);
    setTextById('ui-revelation-effect', revelationEffect);
};


// 제작 선택창의 수명주기는 이 UI scope에만 두고, 렌더 진입점 이름은 유지한다.
var performUpdateStaticUI = (() => {
/** native 모달 안에서도 기존 장비 툴팁을 쓰고, 닫으면 원래 DOM 자리와 연 단추로 돌려놓는다. */
function prepareCraftItemPickerDialog(overlay, kind, closePicker) {
    const opener = document.activeElement;
    const host = opener?.closest('.tab-content, dialog');
    const tooltips = ['item-tooltip-box', 'info-tooltip'].map(id => document.getElementById(id)).filter(Boolean)
        .map(node => ({ node, parent: node.parentNode, next: node.nextSibling }));
    hideItemTooltip();
    hideInfoTooltip();
    tooltips.forEach(({ node }) => overlay.appendChild(node));
    overlay.oncancel = event => { event.preventDefault(); closePicker(); };
    overlay.onclose = () => {
        if (!overlay.isConnected) return;
        craftPickerHostUi.unmount(); // 옮겨 온 장착 칸이나 가방은 창을 지우기 전에 장비 창으로 돌려놓는다
        hideItemTooltip();
        hideInfoTooltip();
        // 뒤쪽부터 복구하면 두 툴팁이 원래 서로 이웃한 경우에도 nextSibling을 보존한다.
        tooltips.slice().reverse().forEach(({ node, parent, next }) => {
            if (node.parentNode !== overlay) return;
            parent.insertBefore(node, next?.parentNode === parent ? next : null);
        });
        overlay.remove();
        const modal = [...document.querySelectorAll('dialog:modal')].at(-1);
        if (modal && !modal.contains(host || opener)) return;
        // 대상을 고르면 제작실을 다시 그리므로, 사라진 단추 대신 같은 창의 같은 선택 단추를 찾는다.
        const target = opener?.isConnected ? opener : host?.querySelector(`button[onclick*="openCraftItemPickerOverlay('${kind}')"]`);
        target?.focus({ preventScroll: true });
    };
}

    /** The equipment bag (head, rail, filters, analysis, pages, picked gear, grid): drawn with the equipment window, or alone when the stump
     * tab's left gem shows it there (js/stump-box-ui.js syncEquipmentBag). The rarity helpers are performUpdateStaticUI's own. */
    function renderEquipmentBagPanel(sf, isItemRarityVisible, renderRarityFilterChips) {
        syncSalvageControlsFromSettings();
        if (typeof salvageRecoveryUi !== 'undefined') salvageRecoveryUi.refreshShortcut();
        equipmentWindowUi.renderBag();
        let invRarityFilterHost = document.getElementById('ui-inventory-rarity-filter');
        if (invRarityFilterHost) writeHtmlIfChanged(invRarityFilterHost, renderRarityFilterChips('inventory'));
        if (window.equipmentTriage) {
            window.equipmentTriage.autoStart();
            window.equipmentTriage.render();
        }
        const equipInvRows = getSortedEquipmentInventoryRows(sf.equip, isItemRarityVisible);
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

return function performUpdateStaticUI() {
    craftingWorkspaceState.capture(game);
    currencyExchange.capture(game);
    updateInventoryFullWarnings();
    announceMapPrimaryContentUnlocks();
    syncMapPrimaryContentTabs();
    // 진단용 단계별 타이밍. 한 번의 갱신이 150ms를 넘으면(또는 window.__perfLog가 켜져
    // 있으면) 어느 단계가 느린지 콘솔에 한 줄 남긴다. 정상 갱신에는 거의 영향이 없다.
    const __perfNow = (typeof performance !== 'undefined' && performance.now) ? () => performance.now() : () => Date.now();
    const __pm = [['start', __perfNow()]];
    const __mark = (n) => __pm.push([n, __perfNow()]);

    tryUnlockMeteorContentByProgress();
    if (window.equipmentTriage) window.equipmentTriage.checkFreshGear();
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
    // 한 번 계산한 스탯을 보조스킬룬 정리에 그대로 넘긴다. 정리가 실제로 룬을 내렸을 때만
    // (한도가 줄어든 드문 프레임) 다시 계산한다.
    // 폴백 스탯(아직 전투 모듈이 준비되지 않은 초기 부팅)은 suppCap이 0이라 넘기면 안 된다.
    // 넘기면 부팅 한 프레임 만에 장착한 보조스킬룬이 전부 해제된다.
    let pStats = getUiPlayerStats();
    if (normalizeSupportLoadout(true, pStats.__uiFallbackStats ? null : pStats)) pStats = getUiPlayerStats();
    __mark('stats');
    cachedTooltipStats = pStats;
    updateCombatUI(pStats);
    __mark('combatUI');
    applyPanelLayoutSettings();
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
        if (shouldRedrawPassiveTree()) {
            resizePassiveTreeCanvas(false);
            drawPassiveTree();
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
        summarySkillTreeBtn.innerText = game.unlocks.char ? _t('스킬트리') : _t('스킬트리 (Lv.2)');
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
    syncPassiveTreeHeader();
    if (isTabRendering('tab-char')) renderPassiveInvestmentSummary();
    document.getElementById('ui-season-text-tab').innerText = game.season;
    document.getElementById('ui-season-pts').innerText = game.seasonPoints;
    document.getElementById('ui-ascend-pts').innerText = game.ascendPoints;
    if (isTabRendering('tab-character')) {
        renderCharacterEhpSummary(pStats);
        renderCharacterPassiveSpecialStats(pStats);
    }

    if (itemsTabActive) {
    syncEquipmentMobilePane();
    renderEquipmentLoadoutSummary(pStats);
    if (window.equipmentLoadoutUi) window.equipmentLoadoutUi.render();
    renderPaperdoll('ui-equip-list', false);
    } else if (craftPickerHostUi.shows('equip')) renderPaperdoll('ui-equip-list', false);
    // 가방은 장비 창, 그루터기 함 탭의 왼쪽 보석이 띄운 자리(그 자리로 옮기는 것은 syncEquipmentBag), 또는 제작실의 인벤토리 고르기 창에 그린다.
    if (stumpBoxUi.syncEquipmentBag(itemsTabActive) || itemsTabActive || craftPickerHostUi.shows('inventory')) renderEquipmentBagPanel(sf, isItemRarityVisible, renderRarityFilterChips);

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
    let allChip = `<button type="button" class="rarity-filter-chip rarity-all${allOn ? ' active' : ''}" aria-pressed="${allOn}" onclick="${stop}toggleAllInventoryRarityFilter()">${_t('전체')}</button>`;
    let chips = getInventoryRarityFilterKeys().map(key => {
        let active = !!f[key];
        return `<button type="button" class="rarity-filter-chip rarity-${key}${active ? ' active' : ''}" aria-pressed="${active}" onclick="${stop}toggleInventoryRarityFilter('${key}')">${_t(labels[key])}</button>`;
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
    refreshAutoSalvagePanel();
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
/** 장비창 해체 단추 창의 자동해체(js/equipment-loot-ui.js renderAutoSalvage)를 다시 그린다. 창이 닫혀 있으면 할 일이 없다. */
function refreshAutoSalvagePanel() {
    let host = document.getElementById('ui-equipment-auto-salvage');
    if (host) host.innerHTML = equipmentLootUi.renderAutoSalvage(renderAutoSalvageRarityChips());
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
    const targetItems = (game.inventory || []).filter(item => {
        if (!item) return false;
        // 가방 검색이 밝게 보이는 장비와 같은 글로 맞춘다(베이스 이름, 한글 등급 포함): 다르면 일치로 보이던 장비가 미검색 해체에 들어갔다
        const hay = getEquipmentSearchText(item);
        const matched = matchSearchQuery(hay, sf.equip);
        return shouldBulkSalvageBySearch(matched, !!salvageUnmatched) && !isBulkSalvageProtectedItem(item);
    });
    const targetCount = targetItems.length;
    if (targetCount <= 0) return addLog(_t('해체 대상이 없습니다.'), 'attack-monster');
    const note = bagItems.countNote(targetItems);
    if (!await requestGameConfirmation(`검색 조건에 해당하는 장비 ${targetCount}개를 해체합니다.${note ? `\n${note} 포함` : ''}\n잠금, 세팅, 우선 보관 장비는 빼고 해체합니다.`, {
        title: _t('검색 장비 일괄 해체'),
        tone: 'danger',
        confirmLabel: _t('{targetCount}개 해체', { targetCount })
    })) return;
    // 끼운 주얼이 가방으로 돌아오므로 가방은 해체하는 쪽에서 다시 맞춘다(js/item-rolls.js salvageBagItems)
    const targets = confirmedSalvageTargets(targetItems), lockedSkipped = targetCount - targets.length;
    const rewards = salvageBagItems(targets);
    addLog(_t('🧪 장비 {count}개 해체 완료, {rewards}{kept}', { count: targets.length, rewards: formatSalvageRewardSummary(rewards), kept: lockedSkipped > 0 ? ` ${_t('(잠금, 세팅, 우선 보관 {n}개는 남김)', { n: lockedSkipped })}` : '' }), 'loot-normal');
    updateStaticUI();
}

function getCurrencyIconHtml(orbKey, className = 'currency-icon') {
    let icon = ORB_DB[orbKey] && ORB_DB[orbKey].icon;
    return icon ? `<img class="${className}" src="${icon}" alt="" aria-hidden="true">` : '';
}

/** 우주계 쌍둥이 주얼의 배정 키스톤 줄: 이름과 그 키스톤의 전직(쌍둥이 키스톤은 전직과 상관없이 켜진다), 할당 여부. */
function getCosmosKeystoneTooltipLine(jewel) {
    if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return '';
    const id = jewel.cosmosKeystone;
    const ksName = typeof getAscendKeystoneName === 'function' ? getAscendKeystoneName(id) : id;
    const owner = typeof getAscendKeystoneOwnerClass === 'function' ? getAscendKeystoneOwnerClass(id) : null;
    const ascName = owner && CLASS_TEMPLATES[owner] ? `(${CLASS_TEMPLATES[owner].name})` : '';
    const active = Array.isArray(game.cosmosTwinKeystones) && game.cosmosTwinKeystones.includes(id);
    return `<div class="tooltip-line" style="color:${active ? '#8fe7b0' : '#ffd68a'};">${_t('🔯 배정 키스톤: {ksName}{ascName}{value}', { ksName: escapeHTML(ksName), ascName, value: active ? _t(', 할당 중') : _t(', 짝 주얼의 키스톤과 같으면 할당') })}</div>`;
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
        return `<div class="tooltip-line"><span style="color:${tone};">${waxLabel}${petiteLabel}${getStatName(stat.id)}: +${formatJewelStatValue(stat.id, stat.val)}${tier}</span> <span style="color:var(--copy-bright);">${_t('(고정 범위 {min}~{max})', { min, max })}</span></div>`;
    }).join('');
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:var(--copy-bright);">${_t('옵션 평균 티어: T{tierSummary}', { tierSummary: tierSummary.toFixed(1) })}</div>` : '';
    let fixedTierLine = jewel.rarity === 'unique' ? `<div class="tooltip-line" style="color:#bca7dc;">${_t('고유 고정 옵션, 티어 평가 제외')}</div>` : '';
    let uniqueLine = jewel.rarity === 'unique' && getJewelUniqueEffectText(jewel) ? `<div class="tooltip-line" style="color:#d7b8ff;">${_t('✨ 고유 효과: {jewel}', { jewel: escapeHTML(getJewelUniqueEffectText(jewel)) })}</div>` : '';
    let keystoneLine = getCosmosKeystoneTooltipLine(jewel);
    let main = `<div class="tooltip-title">${escapeHTML(_t(jewel.name || '주얼'))}</div>${uniqueLine}${keystoneLine}${fixedTierLine}${tierLine}${lines || _t('<div class="tooltip-line">옵션 정보 없음</div>')}`;
    return main;
};


function getCraftActionValidators(item) {
    let hasHoneyLocked = (item.stats || []).some(v => v.lockedByHoney);
    return {
        honey: !!item && (game.currencies.enchantedHoney || 0) > 0 && !hasHoneyLocked,
        stinger: !!item && (game.currencies.venomStinger || 0) > 0 && !getVenomStingerRefusal(item),
        baseUpgrade: !!item && !getBaseUpgradeRefusal(item),
        voidSocket: !!item && equipmentSockets.canChisel(item)
    };
}

function getCraftOrbUseState(key, item) {
    if (!item) return { enabled: false, reason: _t('아이템 미선택') };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: _t('재화 부족') };
    let actionKey = equipmentCrafting.resolveAction(key, item.rarity);
    // 막는 까닭은 제작이 스스로 쓰는 규칙 그대로다(craftCurrencyUse.blockReason: 성화의 뿌리 선택 대기, 타락, 융합 유물, 등급과 자리).
    const block = craftCurrencyUse.blockReason(item, actionKey);
    if (block) return { enabled: false, reason: block };
    let sporeMode = isSporeCraftEquipment(item) ? (game.sporeCraftModes[key] || 'none') : 'none';
    const sporeBlock = craftCurrencyUse.addonReason(item, actionKey, sporeMode);
    if (sporeBlock) return { enabled: false, reason: sporeBlock };
    if (['magicBud','sapBud','formlessDew'].includes(key)
        && typeof isSporeCraftEquipment === 'function'
        && isSporeCraftEquipment(item)
        && sporeMode !== 'none'
        && typeof hasSporeCraftCost === 'function'
        && !hasSporeCraftCost(sporeMode)) {
        return { enabled: false, reason: craftingCatalogUi.sporeShortage(sporeMode) };
    }
    return { enabled: true, reason: _t('사용 가능') };
}

// 시간의 균열 패널: 시간압 선택 → 과거 진입 → 제단 배치 → 미래 진입.
function renderTimeRiftPanel() {
    const host = document.getElementById('ui-timerift-panel');
    if (!host) return;
    document.getElementById('ui-timerift-header').style.display = 'block';
    host.style.display = 'block';
    sideEncounterUi.timeRiftPanel(host, ensureTimeRiftState());
}

function showCurrencyCardTooltip(event, key, reason) {
    let orb = ORB_DB[key];
    if (!orb) return;
    let html = `<div class="tooltip-title currency-tooltip-title">${getCurrencyIconHtml(key, 'currency-tooltip-icon')}<span>${_t(orb.name)}</span></div><div class="tooltip-line">${_t(orb.desc) || ''}</div><div class="tooltip-line" style="margin-top:6px; color:var(--copy-bright);">${_t('상태: {reason}', { reason: reason || '-' })}</div>`;
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#f1c40f');
}
window.showCurrencyCardTooltip = showCurrencyCardTooltip;
window.showOrbTooltip = showCurrencyCardTooltip;


const MOBILE_CRAFT_ORB_KEYS = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'fairyRing', 'pruningShears', 'blightSpore', 'emberBranch', 'blessing', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst'];

function getMobileCraftCurrencyUseState(key, item) {
    if (!key || !ORB_DB[key]) return { enabled: false, reason: _t('재화를 선택하세요.') };
    if ((game.currencies[key] || 0) <= 0) return { enabled: false, reason: _t('보유량 없음') };
    if (!item) return { enabled: false, reason: _t('아이템을 선택하세요.') };
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
            let isArmor = ['투구', '갑옷', '방패', '장갑', '신발', '허리띠'].includes(slot);
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
    return { enabled: false, reason: _t('지원하지 않는 재화') };
}

/** 수확/화석 정제 칸(data/stump-box.js STUMP_BOX_HARVEST_CRAFT): 부패와 균열에 드는 식물의 가진 수와 두 버튼. */
function buildSporeSummaryHtml() {
    const item = getSelectedCraftItem();
    const targetDisabled = !item || !isSporeCraftEquipment(item);
    const advanced = contentProgression.isUnlocked('advancedSpores');
    const riftBlock = item ? equipmentCrafting.getRiftHarvestBlockReason(item) : '';
    const rule = STUMP_BOX_HARVEST_CRAFT;
    const costs = [...rule.rot.map(color => [stumpBox.harvestPriceKey('any', color), color]), [stumpBox.harvestPriceKey(rule.riftKind), 'physical']];
    const held = costs.map(([key, color]) => `<div class="orb-tone" style="padding:5px; border-width:1px; border-style:solid; --orb-tone:${STUMP_BOX_COLORS[color].tone}; font-size:12px;">${stumpBox.harvestPriceName(key)}<br><strong>x ${stumpBox.harvestPriceHeld(game, key)}</strong></div>`).join('');
    return `<div class="craft-spores">
            <div class="craft-spores-title">${_t('수확 재료')}</div>
            <div style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:6px;">${held}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'corrupt')" onmousemove="showSporeCraftTooltip(event,'corrupt')" onmouseleave="hideInfoTooltip()" onclick="applyCorruptSporeToSelectedItem()" ${targetDisabled || !advanced ? 'disabled' : ''}>${_t('부패 수확 (화염, 냉기, 번개 식물 1씩)')}</button>
                <button data-info-tooltip-anchor="1" onmouseenter="showSporeCraftTooltip(event,'rift')" onmousemove="showSporeCraftTooltip(event,'rift')" onmouseleave="hideInfoTooltip()" onclick="applyRiftSporeToSelectedItem()" ${targetDisabled || !advanced || riftBlock ? 'disabled' : ''}>${_t('균열 수확 (화석 1, 뿌리 1)')}</button>
            </div>
        </div>`;
}


/** 제작실 첫 화면: 착용 장비 칸(누르면 그 장비가 대상)과 인벤토리에서 고르기. */
function getCraftEmptyStateHtml() {
    return `<div class="cl-empty-head"><strong>${_t('제작할 장비를 고르세요')}</strong><button type="button" id="craft-target-inventory-open" onclick="openCraftItemPickerOverlay('inventory')">${_t('인벤토리에서 고르기')}</button></div>${getCraftPickerBodyHtml('equip')}`;
}

function getCraftTargetControlsHtml() {
    return `<div class="craft-target-actions"><button type="button" id="craft-target-equip-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('equip')">${_t('장비')}</button><button type="button" id="craft-target-inventory-open" onclick="event.stopPropagation(); openCraftItemPickerOverlay('inventory')">${_t('인벤토리')}</button></div>`;
}

function closeCraftItemPickerOverlay() {
    const overlay = document.getElementById('craft-item-picker-overlay');
    if (!overlay) return;
    overlay.close();
    // close 이벤트는 다음 task에 온다. 즉시 정리해 연속해서 열어도 이전 창이 새 창을 건드리지 않게 한다.
    overlay.onclose();
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
    (item.baseStats || []).slice(0, 1).forEach(stat => rows.push(`${_t(stat.statName || getStatName(stat.id))} +${formatValue(stat.id, stat.val)}`));
    (item.stats || []).slice(0, 2).forEach(stat => rows.push(`${_t(stat.statName || getStatName(stat.id))} +${formatValue(stat.id, stat.val)}`));
    if (item.chaosInfusion) rows.push(`[주입] ${_t(item.chaosInfusion.statName || getStatName(item.chaosInfusion.id))} +${formatValue(item.chaosInfusion.id, item.chaosInfusion.val)}`);
    if (item.encroached && !item.encroached.liberated) rows.push('[잠식] 해방 전');
    return rows.map(row => `<div class="craft-picker-stat">${escapeHTML(row)}</div>`).join('');
}

function getCraftPickerCardHtml(item, options) {
    options = options || {};
    let selected = !!options.selected;
    let rarity = item && item.rarity ? item.rarity : 'normal';
    let slotLabel = options.slotLabel || (item && item.slot ? item.slot : '장비');
    let sourceMeta = item && typeof getDropOnlyItemSourceMeta === 'function' ? getDropOnlyItemSourceMeta(item) : null;
    let sourceBadge = sourceMeta ? ` <span class="${sourceMeta.badgeClass}">${_t(sourceMeta.label)}</span>` : '';
    let extraClass = options.extraClass || '';
    let exceptionalStars = typeof getExceptionalBaseStarsHtml === 'function' ? getExceptionalBaseStarsHtml(item) : '';
    return `<button type="button" class="craft-picker-card ${extraClass} ${selected ? 'selected' : ''}" onclick="${options.onclick || ''}" ${options.tooltip || ''}>
        <div class="item-title ${rarity}" style="font-size:12px;">[${escapeHTML(getItemSlotDisplayLabel(item, slotLabel))}] ${escapeHTML(_t(item.name || '장비'))}${exceptionalStars}${sourceBadge}${item.encroached ? _t(' <span style="color:#b084ff;">(잠식)</span>') : ''}${item.locked ? ' 🔒' : ''}</div>
        <div class="item-base-line" style="font-size:12px;">${escapeHTML(_t(item.baseName || ''))}</div>
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
            if (!item) return `<button type="button" class="craft-picker-card ${slotClass} empty" disabled><div style="font-weight:800;">[${escapeHTML(getItemSlotDisplayLabel(null, slot))}]</div><div style="color:var(--copy-muted); margin-top:5px;">${_t('비어있음')}</div></button>`;
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
    return `<nav class="craft-picker-pages" aria-label="${_t('제작 대상 페이지')}"><button type="button" data-craft-page="${page - 1}" ${page === 0 ? 'disabled' : ''}>${_t('이전')}</button><span>${_t('{value} / {pages}, {count}개', { value: page + 1, pages, count })}</span><button type="button" data-craft-page="${page + 1}" ${page === pages - 1 ? 'disabled' : ''}>${_t('다음')}</button></nav>`;
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
        : `<div class="deathlog-empty">${totalInv > 0 ? _t('검색/등급 조건에 맞는 장비가 없습니다.') : _t('인벤토리에 제작할 장비가 없습니다.')}</div>`);
}

function refreshCraftItemPickerOverlay() {
    let overlay = document.getElementById('craft-item-picker-overlay');
    if (!overlay || !window.__craftPickerKind) return;
    // 장비, 인벤토리 고르기 창은 장비 창의 진짜 칸을 옮겨 와 보여 준다(js/craft-picker-host-ui.js): 몸통을 다시 쓰면 그 칸이 문서에서 사라진다.
    // 등급 필터를 바꾸면 applyInventoryRarityFilterChange의 updateStaticUI가 옮겨 온 가방을 그 자리에서 다시 그린다.
    if (craftPickerHostUi.shows(window.__craftPickerKind)) return;
    let filterEl = overlay.querySelector('.craft-picker-filter');
    if (filterEl) filterEl.innerHTML = `<span class="inventory-view-filter-label">${_t('표시')}</span>${renderRarityFilterChips('picker')}`;
    let bodyEl = overlay.querySelector('.craft-picker-body');
    if (bodyEl) bodyEl.innerHTML = getCraftPickerBodyHtml(window.__craftPickerKind, {query: overlay.querySelector('[name="craftSearch"]')?.value || '', page: Number(overlay.dataset.page) || 0});
}

/** options (the hall's 등록, js/player-exchange.js): { title, desc, picks } over the craft target picker's own. */
function openCraftItemPickerOverlay(kind, options = {}) {
    closeCraftItemPickerOverlay();
    // 장비와 인벤토리는 장비 창의 진짜 장착 칸과 가방을 옮겨 와 보여 준다(js/craft-picker-host-ui.js). 제단은 고를 수 있는 장비만 카드로.
    let real = kind === 'equip' || kind === 'inventory';
    window.__craftPickerKind = kind;
    let overlay = document.createElement('dialog');
    overlay.id = 'craft-item-picker-overlay';
    overlay.className = real ? 'craft-picker-overlay is-real' : 'craft-picker-overlay';
    overlay.setAttribute('aria-labelledby', 'craft-picker-title');
    overlay.onclick = event => {
        if (event.target === overlay) closeCraftItemPickerOverlay();
        const button = event.target.closest('[data-craft-page]');
        if (!button) return;
        overlay.dataset.page = button.dataset.craftPage; refreshCraftItemPickerOverlay();
    };
    overlay.onsubmit = event => { event.preventDefault(); overlay.dataset.page = '0'; refreshCraftItemPickerOverlay(); };
    overlay.innerHTML = getCraftPickerPanelHtml(kind, real, options);
    if (real) craftPickerHostUi.mount(overlay.querySelector('.craft-picker-body'), kind, { equip: selectCraftPickerEquipment, inventory: selectCraftPickerInventoryItem, refuse: refuseCraftPickerItem, ...options.picks });
    else decorateCraftPickerCards(overlay, kind);
    prepareCraftItemPickerDialog(overlay, kind, closeCraftItemPickerOverlay);
    document.body.appendChild(overlay);
    overlay.showModal();
    if (real) updateStaticUI(); // 장비 탭이 그려지지 않는 곳(낚시 작업대)에서 열어도 옮겨 온 칸을 지금 그린다
}

/** The picker's frame: title, line and close button, then the body (empty for the moved real panels, the cards otherwise). */
function getCraftPickerPanelHtml(kind, real, options) {
    let filterRowHtml = real ? '' : `<div class="craft-picker-filter"><span class="inventory-view-filter-label">${_t('표시')}</span>${renderRarityFilterChips('picker')}</div>`;
    let desc = options.desc || (real ? _t('장비를 누르면 제작실 대상 장비로 바로 선택됩니다.') : _t('카드를 클릭하면 제작실 대상 장비로 바로 선택됩니다.'));
    let title = options.title || (kind === 'equip' ? _t('장착 장비에서 제작 대상 선택') : _t('인벤토리에서 제작 대상 선택'));
    return `<div class="craft-picker-panel"><div class="craft-picker-head"><div><div class="craft-picker-title" id="craft-picker-title">${title}</div><div class="craft-picker-desc">${desc}</div></div><button type="button" autofocus onclick="closeCraftItemPickerOverlay()">${_t('닫기')}</button></div>${filterRowHtml}<div class="craft-picker-body">${real ? '' : getCraftPickerBodyHtml(kind)}</div></div>`;
}

/** A pressed bag item that cannot be picked: the picker's line says why (red). */
function refuseCraftPickerItem(reason) {
    let line = document.querySelector('#craft-item-picker-overlay .craft-picker-desc');
    if (!line) return;
    line.textContent = reason;
    line.classList.add('is-refused');
}

/** The card list (the altar's gear): its own title and line, and a search row on a phone. */
function decorateCraftPickerCards(overlay, kind) {
    if (kind === 'altar') {
        overlay.querySelector('.craft-picker-title').textContent = _t('제단 장비 선택');
        overlay.querySelector('.craft-picker-desc').textContent = _t('제단에 올릴 수 있는 장비만 표시됩니다. 선택 후 제단에 올리세요.');
    }
    if (uiDisplay.matches('(max-width: 1080px)')) overlay.querySelector('.craft-picker-head').insertAdjacentHTML('afterend', '<form class="craft-picker-search"><input name="craftSearch" type="search" aria-label="제작 장비 이름/베이스/등급/부위/옵션 검색" placeholder="이름/베이스/등급/옵션 검색"><button type="submit">검색</button></form>');
}

function exposeUiRenderHelpersOnce() {
    if (window.__uiRenderHelperGlobalsExposed) return;
    let helpers = {
        getItemStatToneColor,
        // Alternate crafting views reuse the same admission rules as the live currency buttons.
        getCraftOrbUseState,
        updateSearchFilter,
        resetSearchFilter,
        toggleInventoryRarityFilter,
        toggleAllInventoryRarityFilter,
        renderRarityFilterChips,
        refreshAutoSalvagePanel,
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
        // 스킬룬 화면(js/skills-ui.js)이 룬 목록 검색/강조에 그대로 재사용한다.
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
        { key:'baseUpgrade', label:_t('베이스 업그레이드'), onclick:'upgradeSelectedItemBase()' }
    ];
    return defs.map(d => `<button onclick="${d.onclick}" ${v[d.key] ? '' : 'disabled'}>${_t(d.label)}</button>`).join('');
}

    if (itemsTabActive) {
        let selectedItem=getSelectedCraftItem(), details='';
        if(selectedItem){
        let equipSelectedButtonHtml = isCraftSelectionEquip() ? '' : `<button onclick="equipSelectedCraftInventoryItem()">${_t('착용')}</button>`;
        let selectedUniqueEffectHint = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
            ? getUniqueEffectApplicationHint(selectedItem, typeof isCraftSelectionEquip === 'function' && isCraftSelectionEquip(), typeof getCraftSelectionRef === 'function' ? getCraftSelectionRef() : null)
            : '';
        let selectedUniqueEffectHtml = selectedItem.rarity === 'unique' && selectedItem.uniqueEffect
            ? `<div class="craft-unique-effect"><strong>${_t('고유 효과')}</strong><span>${escapeHTML(_t(selectedItem.uniqueEffect))}</span>${selectedUniqueEffectHint ? `<small>${escapeHTML(selectedUniqueEffectHint)}</small>` : ''}</div>`
            : '';
            details=selectedUniqueEffectHtml+'<div class="craft-actions">'+equipSelectedButtonHtml+buildCraftActionButtons(selectedItem)+'</div>';
        }
        craftingWorkspaceUi.render(false,{details,useState:getMobileCraftCurrencyUseState,targetControls:getCraftTargetControlsHtml,emptyState:getCraftEmptyStateHtml});
        writeHtmlIfChanged(document.getElementById('ui-craft-spore-actions'), buildSporeSummaryHtml());
    }
    const tradeButton = document.getElementById('btn-tab-trade'); // 거래 창의 메뉴 단추(2026-11-06): 열 칸이 하나라도 있으면 보인다
    if (tradeButton) tradeButton.style.display = contentProgression.canOpen('tab-trade') ? 'flex' : 'none';
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
    writeHtmlIfChanged(mapRouteSummary, routeSummaryHtml);
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
        seasonBossRepeatBtn.innerText = _t('입장권 보스 반복 {value}', { value: game.autoRepeatSeasonBoss ? _t('켜짐') : _t('꺼짐') });
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
        sideEncounterUi.renderPanel(document.getElementById('ui-labyrinth-list'), sideEncounterUi.labyrinthPanel());
    } else sideEncounterUi.renderPanel(document.getElementById('ui-labyrinth-list'), '');

    // 혼돈 심화 입장은 혼돈 탭의 카드 목록으로 노출한다.
    // 기존 전용 섹션/사이드 탭은 중복 표시를 피하기 위해 비우고 숨긴다.
    document.getElementById('ui-deep-chaos-header').style.display = 'none';
    writeHtmlIfChanged(document.getElementById('ui-deep-chaos-list'), '');
    let deepChaosTabBtn = document.getElementById('btn-map-explore-deep-chaos');
    if (deepChaosTabBtn) deepChaosTabBtn.style.display = 'none';
    if (game.mapExploreSubtab === 'map-explore-deep-chaos') switchMapExploreSubtab('map-explore-hunting');

    let meteorUnlocked = !!(game.meteorSite && game.meteorSite.unlocked);
    document.getElementById('ui-meteor-header').style.display = meteorUnlocked ? 'block' : 'none';
    setExploreSubtabAvailable('map-explore-meteor', meteorUnlocked);

    let meteorAutoBtn = document.getElementById('btn-meteor-auto-enter');
    if (meteorAutoBtn) {
        meteorAutoBtn.style.display = meteorUnlocked ? 'inline-block' : 'none';
        meteorAutoBtn.innerText = _t('자동입장 {value}', { value: game.settings.autoEnterMeteor ? _t('켜짐') : _t('꺼짐') });
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
    loopClimbUi.render(); worldTreeBarkUi.renderBarkPanel();
    let seasonRoadmapKeys = Object.keys(SEASON_CONTENT_ROADMAP).map(Number).filter(v => Number.isFinite(v) && v >= 1).sort((a, b) => a - b);
    let collapsePast = game.settings.collapsePastLoopMilestones !== false;
    let roadmapToggle = document.getElementById('btn-toggle-past-loop-milestones');
    if (roadmapToggle) roadmapToggle.innerText = collapsePast ? _t('지난 루프 펼치기') : _t('지난 루프 접기');
    let pastRoadmapCount = seasonRoadmapKeys.filter(seasonNum => seasonNum < game.season).length;
    let collapsedRoadmapSummary = collapsePast && pastRoadmapCount > 0
        ? `<div style="color:#78d99a; border:1px dashed rgba(46,204,113,.55); border-radius:8px; padding:8px 12px;">${_t('완료한 지난 루프 이정표 {pastRoadmapCount}개가 접혀 있습니다.', { pastRoadmapCount })}</div>`
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
                <strong style="color:${stateColor};">${_t(def.title)}</strong><span style="color:${stateColor}; font-size:12px;">${stateText}</span>
            </div>
            <div style="color:var(--copy-bright); font-size:12px; line-height:1.5;">• ${reqText}<br>${(def.features || []).map(v => `• ${v}`).join('<br>')}</div>
        </div>`;
    }).join('');
    writeHtmlIfChanged(document.getElementById('ui-season-content-roadmap'), collapsedRoadmapSummary + roadmapCards
        || `<div style="color:var(--copy-muted);">${_t('루프 1을 클리어하면 루프 이정표가 열립니다.')}</div>`);
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
        let stateText = !contentUnlocked ? _t('루프 {unlockLoop} 해금', { unlockLoop }) : (!reqMet ? '선행 노드 필요' : (active ? (lv >= cap ? '최대' : '강화') : '활성화'));
        let style = Number.isFinite(x) && Number.isFinite(y) ? ` style="--loop-node-x:${x}%;--loop-node-y:${y}%;"` : '';
        let horizontalClass = x < 25 ? 'tooltip-right' : (x > 75 ? 'tooltip-left' : '');
        let stateClass = active ? 'active' : (reqMet ? 'available' : 'locked');
        let maxedClass = active && lv >= cap ? 'maxed' : '';
        let actionAttrs = reqMet
            ? ` role="button" tabindex="0" onclick="loopPassivePress('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();buySeason('${id}');}"`
            : ' aria-disabled="true"';
        return `<div class="loop-passive-node ${placement || ''} ${horizontalClass} ${stateClass} ${maxedClass}"${style}${actionAttrs} onmouseenter="loopPassiveHint('${id}')" onfocus="loopPassiveHint('${id}')" aria-label="${_t(node.name)}: ${_t(node.desc)}"><span class="loop-node-core">${renderPixelIcon(seasonNodeIcons[node.stat] || 'star', 'loop-node-icon')}<span class="loop-node-rank">${active ? `${lv}/${cap}` : (reqMet ? '+' : '×')}</span></span><span class="loop-node-tooltip"><strong>${_t(node.name)}</strong><small>${statToneText.html(_t(node.desc))}</small><em style="color:${getItemStatToneColor(node.stat)}">${_t(statInfo.name) || node.stat} +${formatValue(node.stat, scaled)}${suffix}</em><b>${stateText}</b>${active ? `<span class="loop-node-refund" role="button" tabindex="0" onclick="event.stopPropagation(); askRefundSeasonNode('${id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();askRefundSeasonNode('${id}');}">${_t('마름병 포자로 반환')}</span>` : ''}</span></div>`;
    };
    let seasonNodeIds = Object.keys(SEASON_NODES || {});
    let activeSeasonNodeCount = seasonNodeIds.filter(id => getSeasonNodeLevel(id) > 0).length;
    let seasonEvolved = isSeasonTreeEvolved();
    let seasonSummary = `<div class="trait-progress-summary"><div><strong>${_t(seasonEvolved ? '순환 완성' : '우로보로스 원환')}</strong><span>${_t('{n}/{total} 노드 활성화', { n: activeSeasonNodeCount, total: seasonNodeIds.length })}</span></div><div><strong>${_t('{max} 포인트', { max: Math.max(0, Math.floor(game.seasonPoints || 0)) })}</strong><span>${seasonEvolved ? _t('외곽 노드 강화 및 내부 노드 투자 가능') : _t('남은 원형 노드 {max}개', { max: Math.max(0, seasonNodeIds.length - activeSeasonNodeCount) })}</span></div></div>`;
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
    writeHtmlIfChanged(document.getElementById('ui-season-tree'), `${seasonSummary}<div class="loop-passive-orbit ${seasonEvolved ? 'complete' : ''}"><div class="loop-orbit-ambient" aria-hidden="true"></div><span class="loop-ouroboros-silhouette" aria-hidden="true"></span>${innerCircle}${loopOrbitCenterHtml()}${ringNodes}${innerNodes}</div>`);
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

    // 룬 카드 140장 가까이가 같은 주얼과 고유 장비의 룬 레벨을 쓴다: 한 번 그리는 동안 빌드 메모를 나눠 쓴다(js/background-build-cache.js)
    if (isTabRendering('tab-skills') && typeof renderSkillGemScreen === 'function') withBuildMemoPass(() => renderSkillGemScreen({ pStats, searchFilters: sf }));

    __mark('codex+skills');
    let journalList = isTabRendering('tab-journal') ? document.getElementById('ui-journal-list') : null;
    if (journalList) {
        let unlocked = new Set((game.journalEntries || []).filter(id => JOURNAL_DB[id]));
        let orderedIds = JOURNAL_ENTRY_ORDER.filter(id => JOURNAL_DB[id] && (!JOURNAL_DB[id].discoveryOnly || unlocked.has(id)));
        let entries = orderedIds.map(id => ({ id: id, def: JOURNAL_DB[id] }));
        let journalHintById = {
            prologue: '게임 시작',
            woodsman: '혼돈 5층 클리어',
            woodsman_echo: '혼돈 밖에서 나무꾼 완전 격파',
            meteor_fall: '운석 낙하 지점 첫 정산',
            beehive_queen: '벌집 원정에서 여왕 격파',
            void_grand_breach: '대균열의 지배자 격파',
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
            if (actMatch) return _t('액트 {actMatch} 보스 처치', { actMatch: actMatch[1] });
            return journalHintById[id] || '관련 콘텐츠 탐험';
        };
        let categoryOrder = ['스토리', '세계의 흔적', '기억의 잎', '탐험 기록', '버려진 날', '우주계 기록', '최종 관문', '숨겨진 기록'];
        let availabilityById = new Map(entries.map(entry => [entry.id, getJournalEntryAvailability(entry, Array.from(unlocked))]));
        let categoryCounts = {};
        entries.forEach(({ id }) => {
            let category = getJournalCategory(id);
            if (!categoryCounts[category]) categoryCounts[category] = { total: 0, unlocked: 0 };
            categoryCounts[category].total++;
            if (unlocked.has(id)) categoryCounts[category].unlocked++;
        });
        let standardEntries = entries.filter(({ def }) => !def.hidden);
        let hiddenEntries = entries.filter(({ id }) => getJournalCategory(id) === '숨겨진 기록'); // 기억의 잎은 제 분류에서 센다
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
                <div><span>${_t('확인 가능한 해금 조건 {length}개', { length: availableEntries.length })}</span><strong>${nextTitle}</strong><small>${getJournalHint(nextLocked.id, nextLocked.def)}${availableEntries.length > 1 ? _t(', 다른 조건 {value}개', { value: availableEntries.length - 1 }) : ''}</small></div>
                ${nextAction ? `<button type="button" onclick="openJournalEntryAction('${nextLocked.id}')">${_t(nextAction.label)}</button>` : ''}
            </div>`;
        } else if (unlockedCount === entries.length && entries.length > 0) {
            nextTarget = `<div class="journal-next-target is-complete"><div><span>${_t('기록 완성')}</span><strong>${_t('모든 저널을 해금했습니다.')}</strong><small>${_t('영구 효과와 세계의 단서가 모두 활성화되었습니다.')}</small></div></div>`;
        }
        let summary = `<div class="journal-summary">
            <div class="journal-summary-main">
                <div><strong>${_t('주요 기록 {standardUnlockedCount}/{length}', { standardUnlockedCount, length: standardEntries.length })}</strong><span>${_t('전체 {unlockedCount}/{length}, 숨겨진 기록 {hiddenUnlockedCount}/{length2}, 영구 효과 {rewardCount}개', { unlockedCount, length: entries.length, hiddenUnlockedCount, length2: hiddenEntries.length, rewardCount })}</span></div>
                <b>${progressPct}%</b>
            </div>
            <div class="journal-progress"><i style="width:${progressPct}%"></i></div>
            <div class="journal-category-strip" role="group" aria-label="${_t('저널 분류')}"><button type="button" data-journal-filter="전체" onclick="storyJournalUi.filter('전체')">${_t('전체')}</button>${categoryOrder.filter(name => categoryCounts[name]).map(name => {
                let count = categoryCounts[name];
                return `<button type="button" data-journal-filter="${name}" onclick="storyJournalUi.filter('${name}')">${_t(name)} <b>${count.unlocked}</b></button>`;
            }).join('')}</div>
            <label class="journal-conditions"><input type="checkbox" data-journal-conditions onchange="storyJournalUi.filter(undefined,this.checked)"> ${_t('해금 조건 보기')}</label>
        </div>${nextTarget}<p class="journal-empty" hidden>${_t('아직 획득한 기록이 없습니다.')}</p>`;
        let cards = categoryOrder.map(category => {
            let rows = entries.filter(({ id }) => getJournalCategory(id) === category);
            if (rows.length === 0) return '';
            return `<section class="journal-section" data-journal-category="${category}">
                <div class="journal-section-title">${_t(category)}<span>${rows.filter(({ id }) => unlocked.has(id)).length}/${rows.length}</span></div>
                <div class="journal-card-grid">${rows.map(({ id, def }) => {
                    let isUnlocked = unlocked.has(id);
                    let availability = availabilityById.get(id);
                    let available = availability === 'available';
                    let displayTitle = isUnlocked || available ? _t(def.title) : (def.hidden ? _t('히든 저널, ???') : _t('미확인 기록'));
                    let rewardText = journalRewardText(def, isUnlocked || available);
                    let action = available ? getJournalEntryAction(id) : null;
                    let stateLabel = isUnlocked ? _t('해금') : _t('해금 필요');
                    let lockedHint = getJournalLockedHint(availability, id);
                    return `<article class="journal-card ${isUnlocked ? 'is-unlocked' : 'is-locked'} is-${availability} ${def.hidden ? 'is-hidden' : ''}">
                        ${isUnlocked ? `<button type="button" class="journal-card-head journal-entry-open" data-journal-entry="${id}" onclick="storyJournalUi.openEntry('${id}')"><strong>${displayTitle}</strong><span>${_t('읽기 ›')}</span></button>` : `<div class="journal-card-head"><strong>${displayTitle}</strong><span>${stateLabel}</span></div>`}
                        <div class="journal-card-body">${isUnlocked
                            ? ''
                            : (available ? `<p class="journal-hint">${getJournalHint(id, def)}</p>` : `<p class="journal-hint">${lockedHint}</p>`)}</div>
                        ${rewardText ? `<div class="journal-reward ${isUnlocked ? '' : 'is-preview'}">${isUnlocked ? _t('영구 효과') : _t('기록 보상')}, ${rewardText}</div>` : ''}
                        ${action ? `<button type="button" class="journal-card-action" onclick="openJournalEntryAction('${id}')">${_t(action.label)}</button>` : ''}
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
    syncSingleSubtabRows(); // 단추마다 보이기(잠금, 거래소 같은 해금)를 다 정한 뒤에 센다: 중간에 세면 이번에 보인 단추가 빠져 칸이 모자랐다
    __mark('end');
    let __ptot = __perfNow() - __pm[0][1];
    if (__ptot > 150 || (typeof window !== 'undefined' && window.__perfLog)) {
        let __parts = [];
        for (let i = 1; i < __pm.length; i++) __parts.push(`${__pm[i][0]}:${Math.round(__pm[i][1] - __pm[i - 1][1])}`);
        console.warn(`[perf] updateStaticUI ${Math.round(__ptot)}ms | ${__parts.join(' ')}`);
    }
};
})();


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


async function resetGame() {
    if (cloudState.busy) return showGameToast(_t('저장 처리가 끝난 뒤 다시 시도해주세요.'), { tone: 'warning' });
    let userId = getActiveCloudUserId();
    let target = userId ? _t('로그인 계정 ({email})의 서버 기록과 이 기기 기록', { email: cloudState.user.email || userId }) : '이 기기의 진행 데이터';
    cloudState.busy = true;
    updateCloudSaveUI();
    try {
        if (!await requestGameConfirmation(`${withObjectParticle(target)} 초기화합니다.\n처음부터 다시 시작하며 되돌릴 수 없습니다.`, {
            title: userId ? '계정 진행 초기화' : '기기 진행 초기화', tone: 'danger', confirmLabel: _t('진행 초기화')
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


// Phase-4 extracted unlock/class/tab helper block.


function checkUnlocks() {
    storyJournalUi.sync();
    let u = game.unlocks;
    let starterWeapon = getStarterWeaponTutorialTarget();
    if (typeof stumpBoxUi === 'object') stumpBoxUi.checkStumpBoxUnlock();
    if (!(game.seenTutorials || []).includes('tutorial_battle_basics')) {
        queueTutorialNotice('tutorial_battle_basics', _t('첫 여정'), _t('전투는 자동입니다. 캐릭터가 알아서 걷고 공격합니다.\n지금 할 일은 오른쪽 위 ‘목표’에 나옵니다.\n생명 구슬이 자주 비면 장비와 저항을 점검하세요.\n장비나 룬을 얻으면 그때마다 조작을 안내합니다.'));
    }
    if ((game.inventory.length > 0 || Object.values(game.currencies).some(v => v > 0)) && !u.items && !starterWeapon) {
        u.items = true;
        game.noti.items = true;
        queueTutorialNotice('unlock_items', _t('첫 장비'), _t('장비나 제작 재화를 처음 얻었습니다.\n‘장비’에서 아이템을 눌러 지금 착용한 장비와 비교하고 착용하세요.'), 'tab-items');
    }
    if (isJewelTabUnlockReady()) {
        queueContentNotice('unlock_jewel', '주얼', 'jewel', { open: '주얼을 모을 수 있게 되었습니다.\n장비를 선택해 [소켓]에서 주얼을 끼우세요. 반지, 목걸이, 허리띠에는 소켓이 처음부터 있습니다.',
            locked: '주얼과 주얼 결정을 모을 수 있게 되었습니다.\n‘해금’에서 주얼을 열면 장비 소켓에 끼울 수 있습니다.' }, 'tab-items');
    }
    // 새 시작 안내는 닫힌 화면을 겨눈 안내를 버린다(js/state.js queueTutorialNotice): 주운 무기로 장비 창이 열리는 것을 먼저 맞춰야
    // 무기 장착 안내가 쌓이고 '무기 장착하기'를 누르면 따라 하기 카드가 뜬다(2026-11-09 튜토리얼 점검).
    contentProgression.opening.sync(game);
    contentUnlockUi.announceStarterWeapon(starterWeapon);
    queueStarterGuides(game);
    if ((game.skills.length > 1 || game.supports.length > 0) && !u.skills) {
        u.skills = true;
        game.noti.skills = true;
        queueTutorialNotice('unlock_skills', _t('새 스킬룬'), _t('새 룬을 얻었습니다.\n‘스킬룬’에서 룬을 눌러 효과를 보고 공격 룬을 바꿔 보세요.'), 'tab-skills');
    }
    // 도감이 잠겨 있을 때만 인벤토리 전체를 훑는다. (이미 해금된 뒤에도 매 드랍마다
    // O(인벤토리) 스캔을 돌면 대량 처치/드랍 시 스파이크가 생긴다.)
    if (!u.codex) {
        if (isCodexTabUnlockReady()) {
            u.codex = true;
            game.noti.codex = true;
            queueContentNotice('unlock_codex', '첫 고유 장비', 'codex', { open: '고유 장비를 처음 얻었습니다.\n‘기록 → 도감’에 등록하면 도감 보너스를 받습니다.',
                locked: '고유 장비를 처음 얻었습니다.\n고유 도감을 해금하면 등록해 도감 보너스를 얻습니다.' }, 'tab-codex');
        }
    }
    if (game.maxZoneId >= 1 && !u.map) {
        u.map = true;
        game.noti.map = true;
        queueTutorialNotice('unlock_map', _t('지도 개방'), _t('다음 액트가 열렸습니다.\n‘지도’에서 지나온 액트로 돌아가 다시 사냥하거나, 마친 액트의 보상을 받을 수 있습니다.'), 'tab-map');
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
        queueOpenContentNotice('beyond', 'unlock_beyond_boundary', '경계 너머', '완전한 수관과 최종 관문 너머로 끝없는 도전이 열렸습니다.\n‘지도 → 탐험 → 경계 너머’에서 단계를 고르고 키울 경계 인장을 정하세요.', 'tab-map');
    }
    if (game.season > 1 && !u.season) {
        u.season = true;
        game.noti.season = true;
        contentUnlockUi.announceLoop();
    }
    if (((game.completedTrials || []).length > 0 || game.ascendPoints > 0 || !!game.ascendClass) && !u.traits) {
        u.traits = true;
        game.noti.traits = true;
        queueContentNotice('unlock_traits', '전직', 'trials', { open: '전직을 고를 수 있게 되었습니다.\n‘스킬트리 → 전직’에서 직업의 전직 셋 중 하나를 고르세요.\n전직 노드 포인트와 키스톤 포인트는 서로 다른 노드에 씁니다.',
            locked: '전직을 고를 수 있게 되었습니다.\n‘해금’에서 전직을 열면 전직을 고르고 전직 노드를 할당할 수 있습니다.' }, 'tab-traits');
    }
    if (typeof isChaosInfuserUnlocked === 'function' && isChaosInfuserUnlocked() && !game.chaosInfuserUnlocked) {
        game.chaosInfuserUnlocked = true;
        game.noti.items = true;
        addLog(_t('🧪 나무꾼의 흔적을 해석해 혼돈 주입이 열렸습니다. 장비 상세의 [주입]으로 희귀 장비에 한 줄을 더할 수 있습니다.'), 'loot-unique');
    }
    if (game.level >= 200) unlockJournalEntry('level_200');
    if (game.level >= 100 && (game.completedTrials || []).includes('trial_3') && !(game.unlockedTrials || []).includes('trial_4')) {
        game.unlockedTrials.push('trial_4');
        game.noti.map = true;
        addLog(_t('🏛️ Lv.100 달성으로 4차 전직 미궁 시련이 개방되었습니다!'), 'loot-unique');
    }
    contentUnlockUi.syncOpened();
    detectNewMapUnlockAlarms();
    announceMapPrimaryContentUnlocks();
}


// ---------------------------------------------------------------- 루프 패시브 고리의 가운데 칸 (2026-10-22)
// 넓은 화면에서 비어 있던 고리 가운데에 가리키거나 누른 노드의 이름, 효과, 상태와 그 단추를 쓴다. 아무것도 고르지 않았으면 켠 노드의 합계.
// 완성한 고리(안쪽 노드가 가운데를 쓴다)와 1080px 아래의 목록 배치(노드마다 글이 다 보인다)에는 없다.
let loopOrbitShown = null, loopOrbitPressed = null;
const loopOrbitListed = () => uiDisplay.matches('(max-width: 1080px)');


async function buySeason(id) { if (!assertBuildEditable()) return;
    let node = getSeasonPassiveNodeDef(id);
    game.seasonNodeLevels = game.seasonNodeLevels && typeof game.seasonNodeLevels === 'object' ? game.seasonNodeLevels : {};
    if (!canInvestSeasonNode(node, id)) return;
    let lv = getSeasonNodeLevel(id);
    let cap = getSeasonNodeCap(node);
    if (lv >= cap && lv > 0) {
        if (!await requestGameConfirmation(_t('이미 최대 단계인 노드입니다.\n마름병 포자 1개를 사용해 반환하시겠습니까?'), {
            title: _t('최대 단계 노드 반환'),
            tone: 'danger',
            confirmLabel: _t('노드 반환')
        })) return;
        return refundSeasonNode(id);
    }
    if (game.seasonPoints <= 0) return;
    if (lv <= 0) game.seasonNodes.push(id);
    game.seasonNodeLevels[id] = lv + 1;
    game.seasonPoints--;
    updateStaticUI();
}


function buyAscendKeystone(id) { if (!assertBuildEditable()) return;
    if (!game.ascendClass) return;
    let defs = getClassKeystoneDefs(game.ascendClass);
    let node = defs.find(row => row.id === id);
    if (!node) return;
    game.ascendKeystones = Array.isArray(game.ascendKeystones) ? game.ascendKeystones : [];
    if (game.ascendKeystones.includes(id)) return;
    game.ascendKeystonePoints = Math.max(0, Math.floor(game.ascendKeystonePoints || 0));
    if (game.ascendKeystonePoints <= 0) return addLog(_t('키스톤 포인트가 부족합니다.'), 'attack-monster');
    if (game.ascendKeystones.length >= CLASS_KEYSTONE_PICK_LIMIT) return addLog(_t('키스톤은 최대 {CLASS_KEYSTONE_PICK_LIMIT}개 할당할 수 있습니다.', { CLASS_KEYSTONE_PICK_LIMIT }), 'attack-monster');
    if (!isAscendKeystoneRequirementMet(node)) return addLog(_t('선행 키스톤이 필요합니다.'), 'attack-monster');
    if (id === 'w3' && !enforceWarriorDualTrainingEquipment(true)) return;
    game.ascendKeystones.push(id);
    game.ascendKeystonePoints -= 1;
    updateStaticUI();
}
