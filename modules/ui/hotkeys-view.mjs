import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Owns screen state and subscriptions. Saves and domain rules are supplied by the application. */
class HotkeysView {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        this.listeners = [];
        for (const name of ["overrides","isBlocked","flashHudButton","announceDenied","useMobility","useCombatAction","moveDirection","isMoveBlocked","keepsOwnTab","leaveField","routeTabToChat","onKeydown","captureKey","commit","startCapture","resetDefaults","rowHtml","render","labelRail","refresh","sync","cancelCaptureOutside","onSettingsClick","onKeyup","init"]) this[name] = this[name].bind(this);
        this.DENIED_TOAST_GAP_MS = 1200;
        this.ARROW_MOVES = Object.freeze({ ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' });
        this.capturing = null;
        this.notice = '';
        this.lastDenied = { reason: '', at: 0 };
        this.shownSignature = null;
        this.owner = null;
        this.settings = null;
        this.host = null;
        this.initialized = false;
        this.heldCodes = new Map();
    }

    overrides() { return this.deps.game.settings.hotkeyOverrides; }

    isBlocked(event) {
        if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || event.repeat) return true;
        if (this.deps.document.body.classList.contains('startup-active')) return true;
        // 글을 치는 칸만 막는다(js/utils.js isTextEntryTarget): 셀렉박스나 체크박스에 포커스가 남아도 단축키는 듣는다. 셀렉박스에서는
        // 키가 쓰이면 막아서(preventDefault, onKeydown) 글자로 항목을 고르는 일도 없다.
        return this.deps.isTextEntryTarget(event.target) || !!this.deps.document.querySelector('dialog:modal, .tutorial-overlay.active, .selection-overlay');
    }

    flashHudButton(button, ok) {
        if (!button) return;
        button.classList.remove('hud-key-used', 'hud-key-denied');
        void button.offsetWidth;
        button.classList.add(ok ? 'hud-key-used' : 'hud-key-denied');
    }

    announceDenied(message) {
        const now = this.deps.performance.now();
        if (this.lastDenied.reason === message && now - this.lastDenied.at < this.DENIED_TOAST_GAP_MS) return;
        this.lastDenied = { reason: message, at: now };
        this.deps.showGameToast(message, { tone: 'warning', duration: 1600 });
    }

    useMobility(button) {
        if (!this.active) return '';
        const reason = this.deps.mobilitySkill.request();
        if (reason) this.announceDenied(reason);
        this.flashHudButton(button || this.deps.document.querySelector('#ui-combat-skill-gems .player-hud-skill-slot.mobility'), !reason);
        return reason;
    }

    useCombatAction(target) {
        if (target === 'mobility') this.useMobility();
        else this.deps.actExplorationUi.toggleAuto();
    }

    moveDirection(code) {
        if (Object.hasOwn(this.ARROW_MOVES, code)) return this.ARROW_MOVES[code];
        const action = this.deps.hotkeyBindings.actionForCode(this.overrides(), code);
        return action && action.kind === 'move' ? action.target : null;
    }

    isMoveBlocked(event) {
        if (event.ctrlKey || event.altKey || event.metaKey || this.deps.document.body.classList.contains('startup-active')) return true;
        if (event.target instanceof this.deps.Element && event.target.closest('input,textarea,select,[contenteditable="true"]')) return true;
        const modal = this.deps.document.querySelector('dialog:modal');
        return (!!modal && modal.id !== 'act-exploration-dialog') || !!this.deps.document.querySelector('.tutorial-overlay.active, .selection-overlay');
    }

    keepsOwnTab(event) {
        const body = this.deps.document.body.classList;
        if (body.contains('startup-active') || body.contains('mobile-tab-drawer-open')) return true;
        return !!(this.deps.document.querySelector('dialog:modal, .selection-overlay') || event.target.closest?.('form, dialog'));
    }

    leaveField(target) {
        const field = target.closest ? target.closest('input, select, textarea') : null;
        if (field && field.id !== 'social-chat-input') field.blur();
    }

    routeTabToChat(event) {
        if (!this.active) return;
        if (event.key !== 'Tab' || this.capturing || this.keepsOwnTab(event)) return;
        event.preventDefault();
        this.leaveField(event.target);
        const input = this.chatInput();
        if (input && !input.disabled && input.getClientRects().length) input.focus({ preventScroll: true });
    }

    chatInput() {
        let input = this.deps.document.getElementById('social-chat-input');
        // PC 메시지 창이 전투 기록을 보이고 있으면 채팅 탭으로 바꾼 뒤 입력으로 간다(js/message-frames-ui.js).
        if (input && !input.getClientRects().length && this.deps.messageFrames.isActive()) { this.deps.messageFrames.showTab('chat'); input = this.deps.document.getElementById('social-chat-input'); }
        return input;
    }

    onKeydown(event) {
        if (!this.active) return;
        if (!this.adoptOwner()) { this.refresh(); return; }
        if (this.capturing) { this.captureKey(event); return; }
        const direction = this.moveDirection(event.code);
        if (direction) {
            if (!this.isMoveBlocked(event) && this.deps.actExplorationUi.holdMove(direction, true)) {
                this.heldCodes.set(event.code, direction);
                event.preventDefault();
            }
            return;
        }
        if (this.isBlocked(event)) return;
        this.routeAction(event);
    }

    routeAction(event) {
        const action = this.deps.hotkeyBindings.actionForCode(this.overrides(), event.code);
        if (!action) return;
        if (action.kind === 'window') {
            if (this.deps.toggleWindowFromHotkey(action.target)) event.preventDefault();
            return;
        }
        event.preventDefault();
        this.useCombatAction(action.target);
    }

    captureKey(event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.repeat || ['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'].includes(event.code)) return;
        if (event.code === 'Escape') { this.capturing = null; this.notice = ''; this.render(); return; }
        if (event.code === 'Backspace' || event.code === 'Delete') { this.commit(this.capturing, ''); return; }
        if (event.ctrlKey || event.altKey || event.metaKey || !this.deps.hotkeyBindings.isAssignable(event.code)) {
            this.notice = this.deps._t('글자/숫자/기호 키만 쓸 수 있습니다. Esc로 취소, Backspace로 키 없음.');
            this.render();
            return;
        }
        this.commit(this.capturing, event.code);
    }

    commit(actionId, code) {
        if (!this.active || !this.adoptOwner()) { this.render(); return; }
        this.releaseWalking();
        const result = this.deps.hotkeyBindings.assign(this.overrides(), actionId, code);
        this.owner.settings.hotkeyOverrides = result.overrides;
        this.capturing = null;
        const moved = result.displaced.map(id => this.deps.hotkeyBindings.actions.find(action => action.id === id).label);
        this.notice = moved.length ? this.deps._t('{key} 키를 쓰던 "{actions}"의 단축키를 비웠습니다.', { key: this.deps.hotkeyBindings.label(code), actions: moved.map(label => this.deps._t(label)).join(', ') }) : '';
        this.refresh();
        this.deps.queueImportantSave(300);
    }

    startCapture(actionId) {
        if (!this.active || !this.deps.hotkeyBindings.actions.some(action => action.id === actionId)) return;
        this.adoptOwner();
        this.releaseWalking();
        this.capturing = actionId;
        this.notice = this.deps._t('새 키를 누르세요 (Esc 취소, Backspace 키 없음)');
        this.render();
        this.deps.document.querySelector(`#ui-hotkey-settings [data-hotkey-action="${actionId}"]`)?.focus();
    }

    resetDefaults() {
        if (!this.active || !this.adoptOwner()) { this.render(); return; }
        this.releaseWalking();
        this.owner.settings.hotkeyOverrides = {};
        this.capturing = null;
        this.notice = this.deps._t('기본 단축키로 되돌렸습니다.');
        this.refresh();
        this.deps.queueImportantSave(300);
    }

    rowHtml(action, bindings) {
        const code = bindings.get(action.id);
        const waiting = this.capturing === action.id;
        const text = waiting ? this.deps._t('키 입력…') : (code ? this.deps.hotkeyBindings.label(code) : this.deps._t('없음'));
        const changed = code !== action.code;
        return `<div class="hotkey-row"><span class="cfg-label">${this.deps.escapeHTML(this.deps._t(action.label))}</span>`
            + `<button type="button" class="hotkey-key${waiting ? ' capturing' : ''}${code ? '' : ' unbound'}${changed ? ' changed' : ''}" data-hotkey-action="${action.id}" aria-label="${this.deps._t('{action} 단축키: {key}. 눌러서 바꾸기', { action: this.deps._t(action.label), key: text })}">${this.deps.escapeHTML(text)}</button></div>`;
    }

    render() {
        if (!this.active) return;
        this.adoptOwner();
        const host = this.deps.document.getElementById('ui-hotkey-settings');
        if (!host) return;
        this.bindHost(host);
        const bindings = this.deps.hotkeyBindings.effective(this.overrides());
        const group = kind => this.deps.hotkeyBindings.actions.filter(action => action.kind === kind).map(action => this.rowHtml(action, bindings)).join('');
        host.innerHTML = `<div class="hotkey-section"><div class="hotkey-section-title">${this.deps._t('창 열고 닫기')}</div>${group('window')}</div>`
            + `<div class="hotkey-section"><div class="hotkey-section-title">${this.deps._t('전투와 이동')}</div>${group('combat')}</div>`
            + `<div class="hotkey-section"><div class="hotkey-section-title">${this.deps._t('탐험 지도 걷기(방향키도 됨)')}</div>${group('move')}</div>`
            + `<div class="hotkey-footer"><span class="hotkey-notice" role="status" aria-live="polite">${this.deps.escapeHTML(this.notice)}</span>`
            + `<button type="button" class="cfg-btn hotkey-reset" data-hotkey-reset>${this.deps._t('기본값으로')}</button></div>`;
    }

    labelRail() {
        const bindings = this.deps.hotkeyBindings.effective(this.overrides());
        this.deps.hotkeyBindings.actions.filter(action => action.kind === 'window').forEach(action => {
            const button = this.deps.document.getElementById('btn-' + action.target);
            if (!button) return;
            const label = this.deps.hotkeyBindings.label(bindings.get(action.id));
            const tip = button.querySelector('.ui-rail-label');
            if (label) { button.dataset.hotkey = label; button.setAttribute('aria-keyshortcuts', label); }
            else { delete button.dataset.hotkey; button.removeAttribute('aria-keyshortcuts'); }
            if (tip && label) tip.dataset.hotkey = label;
            else if (tip) delete tip.dataset.hotkey;
        });
    }

    refresh() {
        if (!this.active) return;
        this.adoptOwner();
        this.shownSignature = this.deps.JSON.stringify(this.overrides());
        this.labelRail();
        this.render();
        this.deps.renderCombatSkillHud();
    }

    sync() {
        if (!this.active) return;
        if (!this.adoptOwner() || this.deps.JSON.stringify(this.overrides()) !== this.shownSignature) this.refresh();
        else {
            const host = this.deps.document.getElementById('ui-hotkey-settings');
            if (host !== this.host) this.render();
        }
    }

    cancelCaptureOutside(event) {
        if (!this.capturing || event.target.closest('#ui-hotkey-settings')) return;
        this.capturing = null;
        this.notice = '';
        this.render();
    }

    onSettingsClick(event) {
        if (!this.adoptOwner()) { this.refresh(); return; }
        const key = event.target.closest('[data-hotkey-action]');
        if (key) { this.startCapture(key.dataset.hotkeyAction); return; }
        if (event.target.closest('[data-hotkey-reset]')) this.resetDefaults();
    }

    onKeyup(event) {
        const direction = this.heldCodes.get(event.code);
        this.heldCodes.delete(event.code);
        if (direction && ![...this.heldCodes.values()].includes(direction)) this.deps.actExplorationUi.holdMove(direction, false);
    }

    init() {
        if (!this.active) return;
        if (this.initialized) { this.sync(); return; }
        this.initialized = true;
        listenView(this, this.deps.document, 'keydown', this.onKeydown, true);
        listenView(this, this.deps.document, 'keydown', this.routeTabToChat, true);
        listenView(this, this.deps.document, 'keyup', this.onKeyup, true);
        listenView(this, this.deps.window, 'blur', () => this.releaseWalking(true));
        listenView(this, this.deps.document, 'pointerdown', this.cancelCaptureOutside, true);
        this.refresh();
    }

    api() { return Object.freeze({ init: this.init, sync: this.sync, useMobility: this.useMobility }); }

    bindHost(host) {
        if (host === this.host) return;
        releaseViewTarget(this, this.host);
        this.host = host;
        this.capturing = null;
        this.notice = '';
        listenView(this, host, 'click', this.onSettingsClick);
    }

    adoptOwner() {
        const owner = this.deps.game;
        if (this.owner === owner && this.settings === owner.settings && this.season === owner.season) return true;
        if (this.heldCodes.size) this.releaseWalking();
        this.owner = owner;
        this.settings = owner.settings;
        this.season = owner.season;
        this.capturing = null;
        this.notice = '';
        this.lastDenied = { reason: '', at: 0 };
        this.shownSignature = null;
        return false;
    }

    releaseWalking(force = false) {
        if (!force && !this.heldCodes.size) return;
        this.heldCodes.clear();
        this.deps.actExplorationUi.holdMove(null, false);
    }

    dispose() {
        this.releaseWalking(true);
        releaseViewEvents(this);
        this.capturing = null;
        this.host = this.owner = this.settings = null;
    }
}

export function createHotkeysView(deps) {
    const view = new HotkeysView(deps);
    return Object.freeze({ ...view.api(), dispose: () => view.dispose() });
}
