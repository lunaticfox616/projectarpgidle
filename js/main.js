const WOODSMAN_BREAK_LOOP_REQUIRED = 5;
const foregroundCombatClock = { lastAtMs: null, remainderMs: 0 };

function runForegroundCombat(nowMs) {
    let paused = document.hidden || backgroundCombatRuntime.appInactive || backgroundCombatRuntime.processing || backgroundCombatRuntime.failed || isForegroundGameplayPausedForBackground();
    let steps = takeForegroundCombatSteps(foregroundCombatClock, nowMs, paused);
    let executed = 0;
    for (; executed < steps; executed++) {
        if (isForegroundGameplayPausedForBackground()) break;
        runUiCoreLoop();
    }
    return executed;
}
// Bootstrap and scheduling own orchestration; render functions remain in ui.js.
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
    // 생장판(추가 시스템) 상태 정규화. 실패해도 게임 부팅을 막지 않되 원인을 남긴다.
    try {
        ensureGrowthBoardState();
        syncGrowthBoardUnlocks({ silent: true });
        validateGrowthPlacements();
    } catch (error) {
        console.error('growth board init failed:', error);
        addLog('⚠️ 생장판 초기화 중 오류가 발생했습니다. 콘솔 로그를 확인해 주세요.', 'loot-rare');
    }
    unlockPassiveStarEvolution({ silent: true });
    window.__battleAssetAutoloadEnabled = false;
    scheduleDeferredBattleAssetLoad();
    refreshPassiveVisibility();
    refreshTabHeaderUiIfNeeded();
    calculateReachableNodes();
    document.getElementById('chk-combat-scene').checked = game.settings.showCombatScene !== false;
    let cameraShakeCheckboxInit = document.getElementById('chk-camera-shake');
    if (cameraShakeCheckboxInit) cameraShakeCheckboxInit.checked = game.settings.cameraShake !== false;
    let uiSoundsCheckboxInit = document.getElementById('chk-ui-sounds');
    if (uiSoundsCheckboxInit) uiSoundsCheckboxInit.checked = game.settings.uiSounds !== false;
    document.getElementById('chk-log-combat').checked = game.settings.showCombatLog !== false;
    let detailedDamageLogCheckboxInit = document.getElementById('chk-log-damage-detail');
    if (detailedDamageLogCheckboxInit) detailedDamageLogCheckboxInit.checked = game.settings.showDetailedDamageLog === true;
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
    let chatMessageSizeSelectInit = document.getElementById('sel-chat-message-size');
    game.settings.chatMessageSize = applyChatMessageSize(game.settings.chatMessageSize);
    if (chatMessageSizeSelectInit) chatMessageSizeSelectInit.value = game.settings.chatMessageSize;
    document.getElementById('chk-pause-overlay').checked = !!game.settings.pauseGameOnOverlay;
    document.getElementById('chk-auto-equip-empty').checked = game.settings.autoEquipEmptySlots !== false;
    syncCombatTacticsSettingsControls();
    document.getElementById('sel-damage-number-format').value = ['comma', 'korean', 'korean_short', 'english'].includes(game.settings.damageNumberFormat) ? game.settings.damageNumberFormat : 'comma';
    document.getElementById('chk-exp-comma').checked = game.settings.showExpComma !== false;
    document.getElementById('chk-hp-comma').checked = game.settings.showHpComma !== false;
    document.getElementById('chk-enemy-hp-comma').checked = game.settings.showEnemyHpComma !== false;
    document.getElementById('chk-character-comma').checked = game.settings.showCharacterComma !== false;
    document.getElementById('sel-map-complete-action').value = getMapCompleteActionOption(game.settings.mapCompleteAction).value;
    document.getElementById('chk-loop-disable-item-automation').checked = game.settings.disableItemAutomationAfterLoop !== false;
    document.getElementById('sel-loop-map-complete-action').value = getMapCompleteActionOption(game.settings.postLoopMapCompleteAction).value;
    document.getElementById('sel-town-return-action').value = game.settings.townReturnAction || 'retry';
    document.getElementById('sel-theme-mode').value = game.settings.themeMode === 'light' ? 'light' : 'dark';
    document.getElementById('sel-ui-skin').value = normalizeUiSkin(game.settings.uiSkin);
    applyThemeMode(game.settings.themeMode);
    applyUiSkin(game.settings.uiSkin);
    uiDisplay.apply(game.settings.uiScale);
    syncMapCompleteActionQuickControl();
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
    const passiveRootId = getPassiveTreeRootNodeId(game);
    if (!(game.discoveredPassives || []).includes(passiveRootId)) game.discoveredPassives.push(passiveRootId);
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
            let keep = target && target.closest && target.closest('.item-card, .skill-gem, #tree-canvas, #item-tooltip-box, [data-item-tooltip-anchor="1"]');
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
                if (runForegroundCombat(performance.now()) === 0) return;
                ensureLoopChallengeState();
                let now = Date.now();
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
                let recentStats = game.lastCombatStats && (getCombatTime() - (game.lastCombatStatsAt || 0) < 250) ? game.lastCombatStats : getUiPlayerStats();
                updateCombatUI(recentStats);
            } catch (error) {
                console.error('gameTick error:', error);
                recoverRuntimeState();
                try {
                    let recentStats = game.lastCombatStats && (getCombatTime() - (game.lastCombatStatsAt || 0) < 250) ? game.lastCombatStats : getUiPlayerStats();
                    updateCombatUI(recentStats);
                } catch (uiError) { console.error('tick UI recovery failed:', uiError); }
            }
        }, 100);
        requestAnimationFrame(gameLoop);
        if (autoSaveHandle) clearInterval(autoSaveHandle);
        cancelScheduledAutoSave();
        autoSaveHandle = setInterval(() => {
            scheduleAutoSaveWhenIdle();
        }, 15000);
    }
}

function cancelScheduledAutoSave() {
    if (!autoSaveIdleHandle) return;
    if (autoSaveIdleHandle.type === 'idle' && typeof cancelIdleCallback === 'function') cancelIdleCallback(autoSaveIdleHandle.id);
    else clearTimeout(autoSaveIdleHandle.id);
    autoSaveIdleHandle = null;
}

function scheduleAutoSaveWhenIdle() {
    if (autoSaveIdleHandle || backgroundCombatRuntime.processing || isStartupOverlayOpen() || isLoadingOverlayOpen()) return;
    let run = () => {
        autoSaveIdleHandle = null;
        if (backgroundCombatRuntime.processing || isStartupOverlayOpen() || isLoadingOverlayOpen()) return;
        saveGame();
    };
    if (typeof requestIdleCallback === 'function') {
        autoSaveIdleHandle = { type: 'idle', id: requestIdleCallback(run, { timeout: 4000 }) };
    } else {
        autoSaveIdleHandle = { type: 'timeout', id: setTimeout(run, 120) };
    }
}


let loopHeroSelectionCallback = null;

let gameBooted = false;
function bootGame() {
    if (gameBooted) return;
    gameBooted = true;
    try {
        if (typeof runModuleIntegrityChecks === 'function' && !runModuleIntegrityChecks()) {
            throw new Error('필수 런타임 모듈이 아직 실제 구현으로 교체되지 않았습니다. 새로고침 후에도 반복되면 캐시가 꼬인 상태입니다.');
        }
        init();
    } catch (error) {
        gameBooted = false;
        reportFatalError('init', error);
    }
}

window.addEventListener('error', function(event) {
    if (!event || !event.error) return;
    reportFatalError('runtime', event.error);
});
window.addEventListener('load', bootGame);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootGame);
else setTimeout(bootGame, 0);
