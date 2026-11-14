import { StartupSaveCard } from './startup-save-card.mjs';

const IDLE_MESSAGES = new Set(['설정 전', '로그인하면 클라우드 저장을 사용할 수 있습니다.', '시작 화면을 다시 열었습니다.']);

/** Owns gate/loading presentation and delayed callbacks, never authentication or save writes. */
class StartupScreen {
    constructor(deps) {
        this.deps = deps; this.card = new StartupSaveCard(deps); this.active = true;
        this.progress = 0; this.timers = new Map();
    }

    element(id) { return this.deps.document.getElementById(id); }

    tutorialLater() {
        if (!this.active || typeof this.deps.showNextTutorial !== 'function') return;
        const handle = this.deps.setTimeout(() => {
            this.timers.delete(handle);
            if (this.active) this.deps.showNextTutorial();
        }, 0);
        this.timers.set(handle, null);
    }

    setGate(active) {
        if (!this.active) return;
        this.deps.startupActive = !!active;
        this.deps.document.body.classList.toggle('startup-active', this.deps.startupActive);
        const overlay = this.element('startup-overlay');
        if (!overlay) return;
        overlay.classList.toggle('active', this.deps.startupActive);
        if (this.deps.startupActive) { overlay.scrollTop = 0; this.deps.presentation.stopGameLoop(); }
        else { this.deps.presentation.scheduleGameLoop(); this.tutorialLater(); }
        this.deps.presentation.startMobilePipRefreshLoop();
        this.deps.dispatchRuntimeEvent('startup-visibility', { active: this.deps.startupActive });
    }

    bar(progress) {
        const bar = this.element('loading-bar-fill');
        if (!bar) return;
        bar.style.width = `${progress}%`;
        bar.parentElement.setAttribute('aria-valuenow', String(Math.round(progress)));
    }

    loadingText(options) {
        for (const key of ['title', 'detail', 'caption']) {
            const element = this.element(`loading-${key}`);
            if (element && options[key]) element.innerText = key === 'title' ? this.deps._t(options[key]) : options[key];
        }
    }

    setLoading(active, options = {}) {
        if (!this.active) return;
        const overlay = this.element('loading-overlay');
        if (!overlay) return;
        if (!active) {
            overlay.classList.remove('active');
            this.deps.document.body.classList.remove('loading-active');
            this.progress = 0; this.bar(0); this.tutorialLater();
            return;
        }
        this.progress = Math.max(0, Math.min(92, options.progress || 12));
        this.loadingText({title: options.title || '차원을 정렬하는 중...',
            detail: options.detail || '세이브 상태를 점검하고 전장을 준비하고 있습니다.', caption: options.caption || 'Syncing Timeline'});
        this.bar(this.progress);
        overlay.classList.add('active');
        this.deps.document.body.classList.add('loading-active');
    }

    advance(options = {}) {
        if (!this.active) return;
        this.loadingText(options);
        if (this.element('loading-bar-fill') && Number.isFinite(options.progress)) {
            this.progress = Math.max(this.progress, options.progress);
            this.bar(this.progress);
        }
    }

    startBattleAssetLoadNow() {
        if (!this.active || (this.deps.startupActive && !this.deps.isLoadingOverlayOpen())) return Promise.resolve(false);
        this.deps.window.__battleAssetAutoloadEnabled = true;
        return this.deps.initBattleAssets();
    }

    async ensureBattleAssetsLoadedBeforeEntry() {
        if (!this.active) return false;
        if (this.deps.battleAssets.ready) return true;
        const owner = this.deps.game, epoch = this.deps.cloudState.sessionEpoch;
        this.advance({ title: this.deps._t('전장을 준비하는 중...'),
            detail: this.deps._t('첫 전투에 필요한 그림을 불러오고 있습니다.'),
            caption: this.deps._t('전투 그림 불러오기'), progress: 56 });
        const result = await this.waitForBattleAssets();
        if (!this.active || this.deps.game !== owner || this.deps.cloudState.sessionEpoch !== epoch) return false;
        this.advance({ progress: 92,
            detail: result ? this.deps._t('전장 준비를 마쳤습니다.') : this.deps._t('일부 그림을 불러오지 못해 기본 그림으로 준비합니다.'),
            caption: result ? this.deps._t('준비 완료') : this.deps._t('기본 그림 사용') });
        return result;
    }

    async waitForBattleAssets() {
        let timeout;
        try {
            // Only bound the entry wait. The shared atlas loader must keep its queued downloads.
            return await Promise.race([this.startBattleAssetLoadNow(), new Promise(resolve => {
                timeout = this.deps.setTimeout(() => {
                    this.deps.console.warn('battle asset entry wait timed out; images continue loading');
                    resolve(false);
                }, 30000);
                this.timers.set(timeout, () => resolve(false));
            })]);
        } catch (error) {
            this.deps.console.warn('battle asset preload failed:', error);
            return false;
        } finally {
            this.deps.clearTimeout(timeout);
            this.timers.delete(timeout);
        }
    }

    reportFatalError(stage, error) {
        this.deps.console.error(stage + ' failed:', error);
        if (!this.active) return;
        if (stage === 'runtime') {
            if (typeof this.deps.addLog === 'function') this.deps.addLog(this.deps._t('⚠️ 일시적인 오류가 있었습니다. 반복되면 새로고침해 주세요.'),
                'attack-monster', { rateKey: 'runtime-error', minIntervalMs: 60000 });
            return;
        }
        try { this.showStartFailure(error); }
        catch (uiError) { this.deps.console.error('fatal error UI update failed:', uiError); }
    }

    showStartFailure(error) {
        const message = String((error && error.message) || error);
        const stack = String((error && error.stack) || '').split('\n').slice(0, 4).join('\n');
        for (const [id, text] of [['ui-progress-label', '⚠️ 오류'], ['ui-move-time-text', '시작 실패'], ['ui-battlefield-caption', '게임을 시작하지 못했습니다. 새로고침해 주세요.']]) {
            const node = this.element(id);
            if (node) node.innerText = text;
        }
        const log = this.element('log');
        if (!log) return;
        const detail = stack ? `<details><summary>${this.deps._t('자세히')}</summary><pre style="white-space:pre-wrap;margin:6px 0 0;color:#ff9f9f;font-size:12px;">${this.deps.escapeHTML(stack)}</pre></details>` : '';
        log.innerHTML = `<div class="log-item attack-monster">${this.deps._t('⚠️ 게임을 시작하지 못했습니다: {message}{detail}', { message: this.deps.escapeHTML(message), detail })}</div>`;
    }

    async finish() {
        if (!this.active) return;
        this.advance({progress: 100, title: this.deps._t('전장을 여는 중...'),
            detail: this.deps._t('진입 준비를 마무리하고 있습니다.'), caption: this.deps._t('전장 입장')});
        await new Promise(resolve => {
            const handle = this.deps.setTimeout(() => { this.timers.delete(handle); resolve(); }, 320);
            this.timers.set(handle, resolve);
        });
        if (this.active) this.setLoading(false);
    }

    open(options = {}) {
        if (!this.active) return;
        this.deps.setStartupRegistrationMode(false);
        let message = '시작 화면을 다시 열었습니다.';
        if (options.accountOnly) message = this.deps.cloudState.user
            ? '계정 화면을 열었습니다. 다른 계정을 쓰려면 "다른 계정 사용"을 눌러주세요.'
            : '계정 화면을 열었습니다. 로그인하거나 회원가입할 수 있습니다.';
        this.deps.setCloudMessage(this.deps._t(message));
        this.setGate(true);
        this.deps.updateCloudSaveUI();
    }

    accountControls(signedIn, busy) {
        this.element('startup-auth-form')?.classList.toggle('hidden', signedIn);
        for (const [id, shown] of [['startup-auth-actions', 'grid'], ['startup-social-login', '']]) {
            const element = this.element(id);
            if (element) element.style.display = signedIn ? 'none' : shown;
        }
        for (const name of ['continue', 'switch-account']) {
            const button = this.element(`btn-startup-${name}`);
            if (button) { button.style.display = signedIn ? 'block' : 'none'; if (signedIn) button.disabled = busy; }
        }
    }

    authControls(config) {
        const signedIn = !!config.enabled && !!this.deps.cloudState.user, busy = this.deps.cloudState.busy;
        this.accountControls(signedIn, busy);
        if (!signedIn) for (const name of ['login', 'signup', 'resend-confirmation', 'google', 'kakao']) {
            const button = this.element(`btn-startup-${name}`);
            if (button) button.disabled = config.enabled ? busy : true;
        }
        const guest = this.element('btn-startup-guest');
        if (guest) guest.disabled = config.enabled ? busy : false;
    }

    render() {
        if (!this.active || !this.element('startup-overlay')) return;
        const config = this.deps.getCloudConfig();
        this.card.render(this.card.shown());
        const status = this.element('startup-status'), message = this.deps.cloudState.lastMessage || '';
        if (status) status.textContent = IDLE_MESSAGES.has(message) ? '' : message;
        const back = this.element('btn-startup-back');
        if (back) { back.style.display = this.deps.gameplayStarted ? 'block' : 'none'; back.disabled = this.deps.cloudState.busy; }
        this.authControls(config);
    }

    dispose() {
        this.active = false;
        for (const [handle, resolve] of this.timers) { this.deps.clearTimeout(handle); if (resolve) resolve(); }
        this.timers.clear(); this.card.dispose();
    }
}

export function createStartupScreen(deps) {
    const view = new StartupScreen(deps);
    return Object.freeze({
        isStartupOverlayOpen: () => !!deps.startupActive,
        setStartupOverlayActive: view.setGate.bind(view), setLoadingOverlayState: view.setLoading.bind(view),
        advanceLoadingOverlay: view.advance.bind(view), finishLoadingOverlay: view.finish.bind(view),
        openStartupGate: view.open.bind(view), startupShownSave: view.card.shown.bind(view.card),
        startupSaveCardState: view.card.state.bind(view.card), startupEmptyText: view.card.emptyText.bind(view.card),
        startBattleAssetLoadNow: view.startBattleAssetLoadNow.bind(view),
        ensureBattleAssetsLoadedBeforeEntry: view.ensureBattleAssetsLoadedBeforeEntry.bind(view),
        reportFatalError: view.reportFatalError.bind(view),
        updateStartupScreenUI: view.render.bind(view), dispose: view.dispose.bind(view)
    });
}
