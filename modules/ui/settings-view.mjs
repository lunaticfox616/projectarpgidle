import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Owns screen state and subscriptions. Saves and domain rules are supplied by the application. */
class SettingsView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        for (const name of ["syncCheck","sync","select","applySoundEffects","applyEffects","writeControl","initDisplayMode","initLanguageSelect","changeLanguage","syncStartupSound","toggleStartupSound","openStartupSettings","closeStartupSettings"]) this[name] = this[name].bind(this);
        this.checks = {
        'chk-bgm': ['bgm'],
        'chk-ui-sounds': ['uiSounds'],
        'chk-camera-shake': ['cameraShake'],
        'chk-death-notice': ['showDeathNotice'],
        'chk-mobile-battle-pip': ['showMobileBattlePip'],
        'chk-pause-overlay': ['pauseGameOnOverlay'],
        'chk-auto-equip-empty': ['autoEquipEmptySlots'],
        'chk-loop-disable-item-automation': ['disableItemAutomationAfterLoop'],
        'chk-tab-noti': ['tabNotiEnabled'],
        'chk-social-chat-noti': ['socialChatNotifications'],
        'chk-log-combat': ['showCombatLog'],
        'chk-log-damage-detail': ['showDetailedDamageLog'],
        'chk-log-compact': ['combatLogAggregate', 'combatLogRateLimit'],
        'chk-log-spawn': ['showSpawnLog'],
        'chk-log-story': ['showStoryLog'],
        'chk-log-exp': ['showExpLog'],
        'chk-log-loot': ['showLootLog'],
        'chk-number-commas': ['showExpComma', 'showHpComma', 'showEnemyHpComma', 'showCharacterComma'],
        'chk-high-contrast': ['highContrast']
    };
        this.selects = {
        'sel-language': 'language',
        'sel-hit-emphasis': 'hitEmphasis',
        'sel-effect-intensity': 'effectIntensity',
        'sel-chat-message-size': 'chatMessageSize',
        'sel-damage-number-format': 'damageNumberFormat',
        'sel-map-complete-action': 'mapCompleteAction',
        'sel-town-return-action': 'townReturnAction',
        'sel-loop-map-complete-action': 'postLoopMapCompleteAction'
    };
        this.offByDefault = new Set(['showDetailedDamageLog', 'highContrast']);
        this.root = null;
        this.startupSound = null;
        this.startupGear = null;
        this.soundOn = () => this.deps.game.settings.bgm !== false || this.deps.game.settings.uiSounds !== false;
        this.windowed = () => this.deps.document.body.classList.contains('desktop-windowed-ui');
        this.settingsShown = () => !!this.root && this.root.classList.contains('active') && (!this.windowed() || this.root.classList.contains('ui-window-open'));
        this.startupReturnTab = null;
        this.startupWatch = null;
        this.owner = deps.game;
        this.settings = this.owner.settings;
        this.languageRequest = null;
        this.displayControl = null;
        this.displayUnsubscribe = null;
        this.displayRevision = 0;
        this.completionChoice = null;
        this.bindControls();
        listenView(this, deps.window, 'game:languagechange', this.syncStartupSound);
        listenView(this, deps.window, 'project-idle:startup-visibility', event => {
            this.syncStartupSound();
            if (!event.detail?.active && deps.document.body.classList.contains('startup-settings-open')) this.closeStartupSettings();
        });
    }

    syncCheck(id, keys) {
        const control = this.deps.document.getElementById(id);
        if (!control) return;
        const values = keys.map(key => this.offByDefault.has(key) ? this.deps.game.settings[key] === true : this.deps.game.settings[key] !== false);
        control.checked = values.every(Boolean);
        control.indeterminate = values.some(Boolean) && !control.checked;
        const hint = this.deps.document.getElementById(id + '-mixed');
        if (hint) hint.hidden = !control.indeterminate;
    }

    sync() {
        if (!this.active) return;
        this.bindControls();
        this.owner = this.deps.game;
        this.settings = this.owner.settings;
        this.deps.uiDisplay.syncEffects();
        if (!this.root) return;
        Object.entries(this.checks).forEach(([id, keys]) => this.syncCheck(id, keys));
        Object.entries(this.selects).forEach(([id, key]) => {
            const control = this.deps.document.getElementById(id);
            if (control && control !== this.languageRequest?.control) control.value = this.deps.game.settings[key];
        });
        this.deps.document.getElementById('chk-act-journal').checked = this.deps.game.settings.showActJournal !== false;
        this.deps.uiDisplay.applyChatMessageSize(this.deps.game.settings.chatMessageSize);
        this.deps.playUiFeedbackSound.syncSettings();
        this.deps.gameBgm.sync();
        this.deps.renderHeroSelectionControls();
        this.select(this.root.dataset.settingsCategory);
    }

    select(category) {
        if (!this.active || !this.root) return;
        const buttons = [...this.root.querySelectorAll('[data-settings-section]')];
        if (!buttons.some(button => button.dataset.settingsSection === category)) return;
        this.root.dataset.settingsCategory = category;
        buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.settingsSection === category)));
        this.root.querySelectorAll('[data-settings-group]').forEach(section => {
            section.hidden = section.dataset.settingsGroup !== category;
        });
        if (category === 'layout') this.deps.renderTabOrderSettings();
        if (category === 'items') this.deps.equipmentLootUi.renderSettings();
    }

    applySoundEffects(key) {
        if (key !== 'uiSounds' && key !== 'bgm') return;
        if (key === 'uiSounds') this.deps.playUiFeedbackSound.syncSettings();
        else this.deps.gameBgm.sync();
        this.syncStartupSound();
    }

    applyEffects(key) {
        if (key === 'effectIntensity') this.deps.uiDisplay.syncEffects();
        this.applySoundEffects(key);
        if (key === 'highContrast') this.deps.uiDisplay.applyHighContrast(this.deps.game.settings.highContrast);
        if (key === 'chatMessageSize') this.deps.uiDisplay.applyChatMessageSize(this.deps.game.settings.chatMessageSize);
        if (key === 'showDeathNotice') this.deps.toggleDeathNoticeSetting(this.deps.game.settings.showDeathNotice);
        if (key === 'mapCompleteAction') this.syncMapCompleteActionQuickControl();
        if (key === 'socialChatNotifications') {
            if (!this.deps.game.settings.socialChatNotifications && this.deps.game.noti) this.deps.game.noti.social = false;
            this.deps.syncSocialChatNotificationSetting();
        }
    }

    writeControl(control) {
        if (control.disabled) return null;
        const keys = Object.hasOwn(this.checks, control.id) ? this.checks[control.id] : null;
        if (keys) {
            keys.forEach(key => { this.settings[key] = control.checked; });
            this.syncCheck(control.id, keys);
            return keys[0];
        }
        const key = Object.hasOwn(this.selects, control.id) ? this.selects[control.id] : null;
        if (!key || ![...control.options].some(option => option.value === control.value)) return null;
        this.settings[key] = control.value;
        return key;
    }

    initDisplayMode() {
        const desktop = this.deps.appPlatform.desktop, row = this.deps.document.getElementById('cfg-row-display-mode'), control = this.deps.document.getElementById('sel-display-mode');
        if (control === this.displayControl) return;
        this.releaseDisplayMode();
        if (!desktop || !row || !control) return;
        this.displayControl = control;
        row.hidden = false;
        this.displayUnsubscribe = desktop.onFullScreen(full => {
            if (!this.active || control !== this.displayControl) return;
            this.displayRevision++;
            control.value = full ? 'full' : 'window';
        });
        void this.applyDisplayResult(control, desktop.isFullScreen());
        listenView(this, control, 'change', () => { void this.applyDisplayResult(control, desktop.setFullScreen(control.value === 'full')); });
    }

    initLanguageSelect() {
        const control = this.deps.document.getElementById('sel-language');
        if (!control) return;
        control.innerHTML = this.deps.i18n.languages.map(({ code, name }) => `<option value="${code}">${this.deps.escapeHTML(name)}</option>`).join('');
    }

    async changeLanguage(control) {
        if (control.disabled || !this.deps.i18n.languages.some(entry => entry.code === control.value)) return;
        const request = { owner: this.deps.game, settings: this.deps.game.settings, control, next: control.value };
        this.languageRequest = request;
        control.disabled = true;
        try {
            const applied = await this.deps.i18n.setLanguage(request.next, () => this.languageCurrent(request));
            if (!applied || !this.languageCurrent(request)) return;
            request.settings.language = request.next;
            control.value = request.next;
            this.deps.updateStaticUI();
            this.deps.queueImportantSave(180);
        } catch (error) {
            this.deps.console.warn('[i18n] Language selection failed.', error);
            if (this.languageCurrent(request)) this.deps.showGameToast(this.deps._t('언어를 불러오지 못했습니다. 다시 시도해 주세요.'));
        } finally {
            this.releaseLanguage(request);
        }
    }

    syncStartupSound() {
        if (!this.startupSound) return;
        this.startupSound.classList.toggle('is-muted', !this.soundOn());
        this.startupSound.setAttribute('aria-label', this.soundOn() ? this.deps._t('소리 끄기') : this.deps._t('소리 켜기'));
    }

    toggleStartupSound() {
        if (!this.currentControls()) return;
        const on = !this.soundOn();
        this.settings.bgm = on;
        this.settings.uiSounds = on;
        this.applyEffects('uiSounds');
        this.applyEffects('bgm');
        this.deps.queueImportantSave(180);
    }

    openStartupSettings() {
        if (!this.active || !this.root) return;
        if (this.deps.document.body.classList.contains('startup-settings-open')) return this.closeStartupSettings();
        this.startupReturnTab = this.deps.window.GameModules.tabNavigationView.lastActiveTab();
        this.deps.document.body.classList.add('startup-settings-open');
        this.startupGear.setAttribute('aria-pressed', 'true');
        if (this.root.dataset.settingsCategory === 'data') this.select('display');
        this.deps.switchTab('tab-settings');
        // 창의 ✕로 닫아도 로그인 화면으로 돌아온다
        this.startupWatch = new this.deps.MutationObserver(() => { if (!this.settingsShown()) this.closeStartupSettings(); });
        this.startupWatch.observe(this.root, { attributes: true, attributeFilter: ['class'] });
    }

    closeStartupSettings() {
        this.releaseStartupSettings();
        if (!this.settingsShown()) return;
        if (this.windowed()) this.deps.closeWindow('tab-settings');
        else if (this.startupReturnTab && this.startupReturnTab !== 'tab-settings') this.deps.switchTab(this.startupReturnTab);
    }

    releaseStartupSettings() {
        this.startupWatch?.disconnect();
        this.startupWatch = null;
        this.deps.document.body.classList.remove('startup-settings-open');
        this.startupGear?.setAttribute('aria-pressed', 'false');
    }

    mapCompleteOptions() {
        return [
            { value: 'repeatZone', label: this.deps._t('반복'), detail: this.deps._t('현재 지역 또는 층을 다시 진행합니다.') },
            { value: 'nextZone', label: this.deps._t('다음 지역'), detail: this.deps._t('지역은 열린 가장 먼 지역으로, 층은 방금 깬 층의 다음 층으로 갑니다.') },
            { value: 'nextLoopBestPlusOne', label: this.deps._t('이번 루프 최고층 다음'), detail: this.deps._t('혼돈 심화, 미궁, 혼돈계에서 이번 루프에 깬 가장 높은 층의 다음 층으로 바로 갑니다.') },
            { value: 'stop', label: this.deps._t('중단'), detail: this.deps._t('전투를 멈추고 현재 위치에서 대기합니다.') }
        ];
    }

    mapCompleteOption(action) {
        const options = this.mapCompleteOptions();
        return options.find(option => option.value === action) || options.find(option => option.value === 'nextZone');
    }

    syncMapCompleteActionQuickControl() {
        if (!this.active) return;
        const button = this.deps.document.getElementById('btn-map-complete-action-picker');
        if (!button) return;
        const settingsButton = this.deps.document.getElementById('btn-tab-settings');
        if (settingsButton?.parentElement && settingsButton.nextElementSibling !== button) settingsButton.parentElement.insertBefore(button, settingsButton.nextElementSibling);
        const show = !this.deps.isTabGroupingActive() || this.deps.getActiveTabGroup() === 'etc';
        button.hidden = !show;
        if (!show) return;
        const option = this.mapCompleteOption((this.deps.game.settings || {}).mapCompleteAction);
        button.textContent = this.deps._t('전투 완료: {action}', { action: this.deps._t(option.label) });
        button.dataset.mobileLabel = this.deps._t('완료 후 행동: {action}', { action: this.deps._t(option.label) });
        button.setAttribute('aria-label', this.deps._t('전투 완료 후 행동: {action}', { action: this.deps._t(option.label) }));
        button.dataset.tip = `${this.deps._t('현재')}: ${this.deps._t(option.label)}, ${this.deps._t(option.detail)}`;
    }

    applyMapCompleteAction(action) {
        const option = this.mapCompleteOption(action), owner = this.deps.game;
        owner.settings = owner.settings || {};
        owner.settings.mapCompleteAction = option.value;
        const select = this.deps.document.getElementById('sel-map-complete-action');
        if (select) select.value = option.value;
        this.syncMapCompleteActionQuickControl();
        if (typeof this.deps.queueImportantSave === 'function') this.deps.queueImportantSave(180);
        if (typeof this.deps.showGameToast === 'function') this.deps.showGameToast(this.deps._t('전투 완료 후 행동: {action}', { action: this.deps._t(option.label) }), { tone: 'success' });
        this.deps.updateStaticUI();
    }

    async openMapCompleteActionPicker(event) {
        if (event) { event.preventDefault(); event.stopPropagation(); }
        if (!this.active || this.completionChoice) return;
        const owner = this.deps.game, current = this.mapCompleteOption((owner.settings || {}).mapCompleteAction).value;
        const choice = { owner, settings: owner.settings, season: owner.season, loop: owner.loopCount };
        const choices = this.mapCompleteOptions().sort((left, right) => (right.value === current) - (left.value === current));
        this.completionChoice = choice;
        try {
            const selected = await this.deps.requestGameChoice({ title: this.deps._t('전투 완료 후 행동'),
                kicker: this.deps._t('자동 전투'), message: this.deps._t('항목을 누르면 즉시 적용됩니다.'),
                submitOnChoice: true, dismissOnBackdrop: true, choices });
            if (!this.isCompletionChoiceCurrent(choice)) return;
            if (selected !== null) this.applyMapCompleteAction(selected);
        } finally {
            if (this.completionChoice === choice) this.completionChoice = null;
        }
    }

    isCompletionChoiceCurrent(choice) {
        const owner = this.deps.game;
        return this.active && this.completionChoice === choice && owner === choice.owner
            && owner.settings === choice.settings && owner.season === choice.season && owner.loopCount === choice.loop;
    }

    api() {
        return { sync: this.sync, select: this.select, syncStartupSound: this.syncStartupSound, closeStartupSettings: this.closeStartupSettings,
            syncMapCompleteActionQuickControl: this.syncMapCompleteActionQuickControl.bind(this),
            openMapCompleteActionPicker: this.openMapCompleteActionPicker.bind(this) };
    }

    currentControls() {
        if (!this.active) return false;
        if (this.owner === this.deps.game && this.settings === this.owner.settings) return true;
        this.sync();
        return false;
    }

    onChange(event) {
        if (!this.currentControls()) return;
        if (event.target.id === 'sel-language') { void this.changeLanguage(event.target); return; }
        const key = this.writeControl(event.target);
        if (!key) return;
        this.applyEffects(key);
        this.deps.updateStaticUI();
        this.deps.queueImportantSave(180);
    }

    bindControls() {
        const root = this.deps.document.getElementById('tab-settings');
        if (root !== this.root) {
            releaseViewTarget(this, this.root);
            if (this.root) this.releaseStartupSettings();
            this.root = root;
            if (root) this.bindRoot(root);
            this.initLanguageSelect();
        }
        this.bindStartupButtons();
        this.initDisplayMode();
    }

    bindRoot(root) {
        listenView(this, root, 'change', event => this.onChange(event));
        listenView(this, root, 'click', event => {
            const category = event.target.closest('[data-settings-section]');
            if (category && root.contains(category)) this.select(category.dataset.settingsSection);
            else if (event.target.closest('[data-settings-startup-close]')) this.closeStartupSettings();
        });
    }

    bindStartupButtons() {
        const pairs = [['startupSound', 'btn-startup-sound', this.toggleStartupSound], ['startupGear', 'btn-startup-settings', this.openStartupSettings]];
        for (const [key, id, handler] of pairs) {
            const button = this.deps.document.getElementById(id);
            if (button === this[key]) continue;
            releaseViewTarget(this, this[key]);
            this[key] = button;
            if (button) listenView(this, button, 'click', handler);
        }
    }

    languageCurrent(request) {
        return this.active && this.languageRequest === request && request.owner === this.deps.game
            && request.settings === request.owner.settings && request.control === this.deps.document.getElementById('sel-language');
    }

    releaseLanguage(request) {
        if (!request || this.languageRequest !== request) return;
        request.control.disabled = false;
        request.control.value = this.deps.game.settings.language;
        this.languageRequest = null;
    }

    async applyDisplayResult(control, result) {
        const revision = ++this.displayRevision;
        try {
            const full = await result;
            if (this.active && revision === this.displayRevision && control === this.displayControl) control.value = full ? 'full' : 'window';
        } catch (error) {
            this.deps.console.error('[desktop] 화면 모드를 바꾸지 못했습니다.', error);
        }
    }

    releaseDisplayMode() {
        if (typeof this.displayUnsubscribe === 'function') this.displayUnsubscribe();
        releaseViewTarget(this, this.displayControl);
        this.displayUnsubscribe = null;
        this.displayControl = null;
        this.displayRevision++;
    }

    dispose() {
        this.completionChoice = null;
        this.releaseLanguage(this.languageRequest);
        this.releaseDisplayMode();
        this.releaseStartupSettings();
        releaseViewEvents(this);
        this.root = this.startupSound = this.startupGear = null;
    }
}

export function createSettingsView(deps) {
    const view = new SettingsView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}

