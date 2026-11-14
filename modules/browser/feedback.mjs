import { escapeHTML, stripDecorativeEmoji } from '../common/text.mjs';
import { normalizeDialogOptions, clampDialogNumber, buildDialogControl } from './dialog-inputs.mjs';
import { bindGamePicker } from './bound-picker.mjs';
const TOAST_MARKS = Object.freeze({ success: '✓', danger: '!', warning: '△', chase: '★' });
class Feedback {
    dialogQueue = [];
    activeDialog = null;
    previousFocus = null;
    liveDocument = () => typeof this.document !== 'undefined' && !!this.document.body && this.document.body.isConnected === true;
    heldToasts = [];
    heldToastWatch = null;
    constructor({ window, document }, inputs) {
        this.window = window; this.document = document; this.inputs = inputs;
        this.disposed = false; this.frames = new Set(); this.timers = new Set();
        for (const name of ["ensureFeedbackRoot","requestGameDialog","requestGameConfirmation","requestGameNumber","requestGameText","requestGameChoice","showNextDialog","bindDialogControl","getActiveDialogValue","submitActiveDialog","finishDialog","handleDialogKeydown","cycleDialogFocus","dismissGameToast","toastText","trimToasts","holdToastUntilEntry","showGameToast","renderGameToast"]) this[name] = this[name].bind(this);
    }
    frame(callback) {
        if (this.disposed) return null;
        const id = this.window.requestAnimationFrame(() => { this.frames.delete(id); if (!this.disposed) callback(); });
        this.frames.add(id); return id;
    }
    later(callback, ms) {
        if (this.disposed) return null;
        const id = this.window.setTimeout(() => { this.timers.delete(id); if (!this.disposed) callback(); }, ms);
        this.timers.add(id); return id;
    }
    ensureFeedbackRoot() {
        let root = this.document.getElementById('game-feedback-root');
        if (root) return root;
        root = this.document.createElement('div');
        root.id = 'game-feedback-root';
        root.innerHTML = `
            <dialog id="game-dialog-overlay" class="game-dialog-overlay" aria-labelledby="game-dialog-title" aria-hidden="true" inert>
                <section id="game-dialog-card" class="game-dialog-card">
                    <div class="game-dialog-kicker" id="game-dialog-kicker"></div>
                    <h2 class="game-dialog-title" id="game-dialog-title"></h2>
                    <div class="game-dialog-body">
                        <div class="game-dialog-message" id="game-dialog-message"></div>
                        <div class="game-dialog-control" id="game-dialog-control"></div>
                        <div class="game-dialog-error" id="game-dialog-error" role="alert" hidden></div>
                    </div>
                    <div class="game-dialog-actions">
                        <button type="button" class="game-dialog-btn game-dialog-btn-secondary" id="game-dialog-cancel">${this.inputs.translate('취소')}</button>
                        <button type="button" class="game-dialog-btn game-dialog-btn-primary" id="game-dialog-confirm">${this.inputs.translate('확인')}</button>
                    </div>
                </section>
            </dialog>
            <div id="game-toast-region" class="game-toast-region" role="status" aria-live="polite" aria-atomic="false"></div>`;
        this.document.body.appendChild(root);
        this.ownedRoot = root;
        root.querySelector('#game-dialog-overlay').addEventListener('cancel', event => {
            event.preventDefault();
            this.finishDialog(null, false);
        });
        root.querySelector('#game-dialog-overlay').addEventListener('close', event => {
            if (!event.target.open) this.finishDialog(null, false);
        });
        root.querySelector('#game-dialog-overlay').addEventListener('pointerdown', event => {
            if (event.target === event.currentTarget && this.activeDialog && this.activeDialog.dismissOnBackdrop !== false) this.finishDialog(null, false);
        });
        root.querySelector('#game-dialog-cancel').addEventListener('click', () => this.finishDialog(null, false));
        root.querySelector('#game-dialog-confirm').addEventListener('click', () => this.submitActiveDialog());
        this.document.addEventListener('keydown', this.handleDialogKeydown, true);
        return root;
    }

    requestGameDialog(options) {
        if (this.disposed) return Promise.resolve(null);
        return new Promise((resolve, reject) => {
            this.dialogQueue.push(normalizeDialogOptions({ ...(options || {}), resolve, reject }));
            this.showNextDialog();
        });
    }

    requestGameConfirmation(message, options) {
        return this.requestGameDialog({ ...(options || {}), type: 'confirm', message });
    }

    requestGameNumber(options) {
        return this.requestGameDialog({ ...(options || {}), type: 'number' });
    }

    requestGameText(options) {
        return this.requestGameDialog({ ...(options || {}), type: 'text' });
    }

    requestGameChoice(options) {
        return this.requestGameDialog({ ...(options || {}), type: 'choice' });
    }

    showNextDialog() {
        if (this.disposed || this.activeDialog || this.dialogQueue.length === 0) return;
        this.activeDialog = this.dialogQueue.shift();
        try {
            this.openDialog();
        } catch (error) {
            const failed = this.activeDialog;
            this.activeDialog = null;
            this.closeDialogSurface();
            failed.reject(error);
            this.frame(this.showNextDialog);
        }
    }

    openDialog() {
        this.ensureFeedbackRoot();
        this.previousFocus = this.document.activeElement;
        let overlay = this.document.getElementById('game-dialog-overlay');
        let card = this.document.getElementById('game-dialog-card');
        let control = this.document.getElementById('game-dialog-control');
        let cancel = this.document.getElementById('game-dialog-cancel');
        let confirm = this.document.getElementById('game-dialog-confirm');
        card.dataset.tone = this.activeDialog.tone;
        this.document.getElementById('game-dialog-kicker').textContent = this.activeDialog.kicker;
        this.document.getElementById('game-dialog-title').textContent = this.inputs.translate(this.activeDialog.title);
        this.document.getElementById('game-dialog-message').innerHTML = escapeHTML(this.activeDialog.message).replace(/\n/g, '<br>');
        cancel.textContent = this.activeDialog.cancelLabel;
        confirm.textContent = this.activeDialog.confirmLabel;
        cancel.style.display = this.activeDialog.type === 'notice' ? 'none' : '';
        confirm.style.display = this.activeDialog.type === 'choice' && this.activeDialog.submitOnChoice ? 'none' : '';
        control.innerHTML = buildDialogControl(this.activeDialog, this.inputs.translate);
        this.document.getElementById('game-dialog-error').hidden = true;
        this.bindDialogControl(this.activeDialog, control);
        overlay.inert = false;
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.showModal();
        this.document.body.classList.add('game-dialog-open');
        this.inputs.sound(this.activeDialog.tone === 'danger' ? 'danger' : 'open');
        const opened = this.activeDialog;
        this.frame(() => {
            if (this.activeDialog !== opened) return;
            let focusTarget = control.querySelector('input:not([type="range"]),button[aria-pressed="true"]') || confirm;
            focusTarget.focus({ preventScroll: true });
            if (focusTarget.select) focusTarget.select();
        });
    }

    bindDialogControl(dialog, control) {
        if (dialog.type === 'number') {
            let input = control.querySelector('#game-dialog-number');
            let range = control.querySelector('#game-dialog-range');
            let preview = control.querySelector('#game-dialog-number-preview');
            let sync = (value, keepInputText) => {
                let next = clampDialogNumber(value, dialog);
                // 타이핑 중에는 입력 칸을 강제로 고치지 않는다. min이 21일 때
                // "2"를 치는 순간 21로 덮어써 버리면 숫자를 직접 입력할 수 없다.
                if (!keepInputText) input.value = String(next);
                range.value = String(next);
                preview.textContent = String(next);
            };
            input.addEventListener('input', () => sync(input.value, true));
            input.addEventListener('change', () => sync(input.value));
            range.addEventListener('input', () => sync(range.value));
            control.querySelectorAll('[data-step-direction]').forEach(button => button.addEventListener('click', () => {
                sync(Number(input.value) + Number(button.dataset.stepDirection || 0) * dialog.step);
                this.inputs.sound('open');
            }));
        } else if (dialog.type === 'choice') {
            control.querySelectorAll('.game-choice-option').forEach(button => button.addEventListener('click', () => {
                control.querySelectorAll('.game-choice-option').forEach(row => row.setAttribute('aria-pressed', 'false'));
                button.setAttribute('aria-pressed', 'true');
                this.inputs.sound('open');
                if (dialog.submitOnChoice) this.submitActiveDialog();
            }));
        }
    }

    getActiveDialogValue() {
        if (!this.activeDialog) return null;
        if (this.activeDialog.type === 'confirm') return true;
        if (this.activeDialog.type === 'number') {
            return clampDialogNumber(this.document.getElementById('game-dialog-number').value, this.activeDialog);
        }
        if (this.activeDialog.type === 'text') return this.document.getElementById('game-dialog-text').value;
        if (this.activeDialog.type === 'choice') {
            let selected = this.document.querySelector('#game-dialog-control .game-choice-option[aria-pressed="true"]');
            if (!selected) return null;
            let index = Math.max(0, Math.floor(Number(selected.dataset.choiceIndex) || 0));
            let choice = this.activeDialog.choices[index];
            return choice && typeof choice === 'object' ? choice.value : choice;
        }
        return true;
    }

    submitActiveDialog() {
        if (!this.activeDialog) return;
        let value = this.getActiveDialogValue();
        let validation = this.activeDialog.validate ? this.activeDialog.validate(value) : true;
        if (validation !== true) {
            let error = this.document.getElementById('game-dialog-error');
            error.textContent = typeof validation === 'string' ? validation : this.inputs.translate('입력값을 확인해주세요.');
            error.hidden = false;
            error.scrollIntoView({ block: 'nearest' });
            this.inputs.sound('danger');
            return;
        }
        this.finishDialog(value, true);
    }

    finishDialog(value, confirmed) {
        if (!this.activeDialog) return;
        let finished = this.activeDialog;
        this.activeDialog = null;
        this.closeDialogSurface();
        this.inputs.sound(confirmed ? 'confirm' : 'cancel');
        finished.resolve(confirmed ? value : null);
        this.frame(this.showNextDialog);
    }

    restoreDialogFocus(overlay) {
        let focused = this.document.activeElement;
        let restoreTarget = this.previousFocus && this.previousFocus.focus && !overlay.contains(this.previousFocus) ? this.previousFocus : null;
        if (restoreTarget) restoreTarget.focus({ preventScroll: true });
        else if (focused && overlay.contains(focused) && focused.blur) focused.blur();
        this.previousFocus = null;
    }

    closeDialogSurface() {
        const overlay = this.document.getElementById('game-dialog-overlay');
        if (overlay) {
            overlay.close();
            this.restoreDialogFocus(overlay);
            overlay.inert = true;
            overlay.classList.remove('active');
            overlay.setAttribute('aria-hidden', 'true');
        }
        this.document.body?.classList.remove('game-dialog-open');
    }

    handleDialogKeydown(event) {
        if (!this.activeDialog || !event.target.closest?.('#game-dialog-overlay')) return;
        if (event.key === 'Enter' && !event.shiftKey && !event.target.closest('button')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.submitActiveDialog();
            return;
        }
        if (event.key !== 'Tab') return;
        this.cycleDialogFocus(event);
    }

    cycleDialogFocus(event) {
        let card = this.document.getElementById('game-dialog-card');
        let focusable = [...card.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(element => element.getClientRects().length);
        if (focusable.length <= 0) return;
        let current = focusable.indexOf(this.document.activeElement);
        let next = event.shiftKey ? current - 1 : current + 1;
        if (next < 0) next = focusable.length - 1;
        if (next >= focusable.length) next = 0;
        event.preventDefault();
        focusable[next].focus();
    }

    dismissGameToast(toast, fadeMs) {
        if (toast.classList.contains('is-dismissed')) return;
        toast.classList.add('is-dismissed');
        toast.classList.remove('active');
        this.later(() => toast.remove(), fadeMs);
    }

    toastText(message) { return stripDecorativeEmoji(message); }

    trimToasts(region) {
        while (region.children.length > 4) (region.querySelector('.game-toast:not(.game-toast-chase)') || region.firstElementChild).remove();
    }

    holdToastUntilEntry(message, options) {
        this.heldToasts.push([message, options]);
        if (this.heldToasts.length > 4) this.heldToasts.shift();
        if (this.heldToastWatch) return;
        this.heldToastWatch = new this.window.MutationObserver(() => {
            if (this.document.body.classList.contains('startup-active')) return;
            this.heldToastWatch.disconnect();
            this.heldToastWatch = null;
            this.heldToasts.splice(0).forEach(([text, opts]) => this.renderGameToast(text, opts));
        });
        this.heldToastWatch.observe(this.document.body, { attributes: true, attributeFilter: ['class'] });
    }

    showGameToast(message, options) {
        if (this.disposed || !message || !this.liveDocument()) return null;
        if (this.document.body.classList.contains('guide-replay-active')) return null;
        if (!this.document.body.classList.contains('startup-active')) return this.renderGameToast(message, options);
        this.holdToastUntilEntry(message, options);
        return null;
    }

    renderGameToast(message, options) {
        this.ensureFeedbackRoot();
        let opts = typeof options === 'string' ? { tone: options } : (options || {});
        let region = this.document.getElementById('game-toast-region');
        let toast = this.document.createElement('div');
        let tone = opts.tone || 'info';
        toast.className = `game-toast game-toast-${tone}`;
        toast.innerHTML = `<span class="game-toast-mark">${TOAST_MARKS[tone] || '◆'}</span><span>${escapeHTML(this.toastText(message))}</span>`;
        region.appendChild(toast);
        this.trimToasts(region);
        this.frame(() => toast.classList.add('active'));
        let duration = Math.max(1600, Number(opts.duration) || (tone === 'danger' ? 4300 : 2800));
        // A click clears it at once; otherwise it fades out on its own.
        toast.addEventListener('click', () => this.dismissGameToast(toast, 90));
        this.later(() => this.dismissGameToast(toast, 220), duration);
        if (tone === 'success') this.inputs.sound('success');
        else if (tone === 'danger') this.inputs.sound('danger');
        return toast;
    }
    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.heldToastWatch?.disconnect(); this.heldToastWatch = null;
        this.heldToasts.length = 0;
        this.frames.forEach(id => this.window.cancelAnimationFrame(id));
        this.timers.forEach(id => this.window.clearTimeout(id));
        this.frames.clear(); this.timers.clear();
        this.document.removeEventListener('keydown', this.handleDialogKeydown, true);
        const active = this.activeDialog; this.activeDialog = null;
        if (active) {
            this.closeDialogSurface();
            active.resolve(null);
        }
        this.previousFocus = null;
        this.dialogQueue.splice(0).forEach(dialog => dialog.resolve(null));
        this.ownedRoot?.remove(); this.ownedRoot = null;
    }
}
export function createFeedback(env, inputs) {
    const feedback = new Feedback(env, inputs);
    return Object.freeze({
        requestGameDialog: feedback.requestGameDialog, requestGameConfirmation: feedback.requestGameConfirmation,
        requestGameNumber: feedback.requestGameNumber, requestGameText: feedback.requestGameText,
        requestGameChoice: feedback.requestGameChoice, bindGamePicker, showGameToast: feedback.showGameToast,
        dispose: () => feedback.dispose()
    });
}
