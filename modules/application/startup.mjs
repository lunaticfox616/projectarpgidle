import { runStartupDiagnostics } from './startup-diagnostics.mjs';

/** Application startup owns ordering; features own their domain state and rendering. */
export class GameStartup {
    constructor(deps, events, timers, foreground, views) {
        this.deps = deps;
        this.events = events;
        this.timers = timers;
        this.foreground = foreground;
        this.views = views;
        this.booted = false;
        this.firstPaintDone = false;
        this.ready = false;
        this.revealFrame = null;
        this.warmupTimer = null;
        this.continueTimer = null;
        this.revealPromise = null;
        this.revealResolve = null;
    }

    revealStartupScreen() {
        this.deps.settingsUi.syncStartupSound();
        if (this.revealPromise) return this.revealPromise;
        const document = this.deps.document;
        const fontsReady = typeof document.fonts === 'object' && document.fonts.ready ? document.fonts.ready : Promise.resolve();
        this.revealPromise = fontsReady.then(() => new Promise(shown => {
            if (!this.events.active) { shown(); return; }
            this.revealResolve = shown;
            this.revealFrame = this.deps.requestAnimationFrame(() => {
                this.revealFrame = null;
                this.revealResolve = null;
                document.documentElement.classList.remove('app-preload');
                shown();
                this.warmupTimer = this.deps.setTimeout(() => {
                    this.warmupTimer = null;
                    if (this.events.active && !document.hidden && !this.deps.navigator.connection?.saveData) this.deps.initBattleAssets();
                }, 1800);
            });
        }));
        return this.revealPromise;
    }

    applySavedPresentation(settings) {
        this.deps.uiDisplay.applySaved(settings);
        return this.deps.i18n.applySaved(settings).catch(error => this.deps.console.warn('[i18n] Saved language could not be loaded; keeping the current language.', error));
    }

    loadInitialSave() {
        this.firstPaintDone = true;
        this.deps.gameplayStarted = false;
        this.deps.setStartupOverlayActive(true);
        this.deps.renderPatchNotes();
        this.deps.setLoadingOverlayState(false);
        const localSaveStatus = this.deps.loadGameAtBoot();
        this.deps.playerStallUi.settleSales(Date.now());
        if (localSaveStatus.writable === false) {
            this.deps.setCloudMessage(localSaveStatus.message);
            this.deps.addLog(`⚠️ ${localSaveStatus.message}`, 'loot-rare');
        }
        this.deps.updateCloudSaveUI();
        this.applySavedPresentation(this.deps.game.settings).then(() => {
            if (!this.events.active) return;
            this.revealStartupScreen().catch(error => this.deps.reportFatalError('startup presentation', error));
            this.continueTimer = this.deps.setTimeout(() => { this.continueTimer = null; this.init(); }, 0);
        }).catch(error => this.deps.reportFatalError('startup settings', error));
    }

    prepareGame() {
        this.deps.applySeasonContentProgression({ silent: true });
        this.deps.recoverRuntimeState();
        this.deps.unlockPassiveStarEvolution({ silent: true });
        this.deps.window.__battleAssetAutoloadEnabled = false;
        this.deps.refreshPassiveVisibility();
        this.deps.refreshTabHeaderUiIfNeeded();
        this.deps.calculateReachableNodes();
        this.deps.applyUiSkin(this.deps.game.settings.uiSkin);
        this.deps.applyHighContrast(this.deps.game.settings.highContrast);
        this.deps.hotkeysUi.init();
        this.deps.syncMapCompleteActionQuickControl();
        this.deps.ensureInitialHeroSelection();
        this.deps.settingsUi.sync();
        this.deps.toggleDeathNoticeSetting(this.deps.game.settings.showDeathNotice !== false);
        this.deps.syncSalvageControlsFromSettings();
        this.deps.checkUnlocks();
        this.deps.normalizeSupportLoadout(false);
        this.deps.runUiGlobalFunction('ensureEncounterRun');
        runStartupDiagnostics(this.deps);
        const passiveRootId = this.deps.getPassiveTreeRootNodeId(this.deps.game);
        if (!(this.deps.game.discoveredPassives || []).includes(passiveRootId)) this.deps.game.discoveredPassives.push(passiveRootId);
    }

    init() {
        if (!this.events.active) return;
        if (!this.firstPaintDone) { this.loadInitialSave(); return; }
        this.prepareGame();
        this.events.viewport();
        this.deps.syncBattleTabLayout(true);
        this.deps.updateMobileBattlePipVisibility();
        this.deps.startMobilePipRefreshLoop();
        this.deps.setupCanvasEvents();
        this.deps.resizeCanvas();
        this.events.exitSaves(() => this.foreground.notePageExit());
        this.deps.initializeCloudSave();
        this.events.buildEdits();
        this.events.token();
        this.deps.window.runStartupSmokeChecks = () => runStartupDiagnostics(this.deps);
        this.events.touchTooltips();
        this.renderAndStart();
        this.ready = true;
    }

    renderAndStart() {
        try {
            this.deps.updateStaticUI();
        } catch (error) {
            this.deps.console.error('initial updateStaticUI failed:', error);
            this.deps.game = this.deps.mergeDefaults(this.deps.game || {});
            try { this.deps.updateStaticUI(); } catch (retryError) { this.deps.console.error('retry updateStaticUI failed:', retryError); }
        }
        try {
            this.deps.updateMobileBattlePipVisibility();
            this.deps.renderBattlefield();
            this.deps.updateMobileBattlePipVisibility();
            this.deps.renderMobileBattlePipFrame();
        } catch (error) {
            this.deps.console.error('initial battlefield render failed:', error);
        } finally {
            this.timers.sync();
            this.deps.scheduleGameLoop();
        }
    }

    bootGame() {
        if (!this.events.active || this.booted || this.deps.document.documentElement.dataset.appFileMissing) return;
        this.booted = true;
        try {
            if (typeof this.deps.runModuleIntegrityChecks === 'function' && !this.deps.runModuleIntegrityChecks()) {
                throw new Error('필수 런타임 모듈이 아직 실제 구현으로 교체되지 않았습니다. 새로고침 후에도 반복되면 캐시가 꼬인 상태입니다.');
            }
            this.init();
            this.deps.gemSelectionUi.migrationNotice();
        } catch (error) {
            this.booted = false;
            this.deps.reportFatalError('init', error);
        }
    }

    bootWhenTabMayRun() {
        if (!this.events.active) return;
        this.deps.cloudSessionGuard.ready().then(() => {
            if (!this.events.active) return;
            return this.deps.gameTabGuard.ready();
        }).then(() => this.bootGame()).catch(error => {
            if (this.events.active) this.deps.reportFatalError('init', error);
        });
    }

    dispose() {
        this.deps.disposeBattlePresentation();
        this.deps.disposeStartupScreen();
        this.deps.disposeAwaySettlement();
        this.events.dispose();
        this.timers.dispose();
        this.deps.saveService.dispose();
        this.deps.gameTabGuard.dispose();
        this.deps.cloudSessionGuard.dispose();
        this.deps.disposeJourneyViews();
        this.views.dispose();
        this.deps.disposePassiveScene();
        this.deps.disposeAtlasViews();
        this.deps.disposeMapViews();
        this.deps.disposeEquipmentViews();
        this.deps.disposeSkillViews();
        this.deps.disposeLoopViews();
        this.deps.disposeShopViews();
        this.deps.disposeStumpViews();
        this.deps.disposeNavigationViews();
        if (this.revealFrame !== null) this.deps.cancelAnimationFrame(this.revealFrame);
        if (this.revealResolve) this.revealResolve();
        this.revealResolve = null;
        if (this.warmupTimer !== null) this.deps.clearTimeout(this.warmupTimer);
        if (this.continueTimer !== null) this.deps.clearTimeout(this.continueTimer);
        this.revealFrame = this.warmupTimer = this.continueTimer = null;
        this.deps.disposeBattleAssets();
    }
}
