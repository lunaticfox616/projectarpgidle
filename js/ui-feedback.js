(function () {
    'use strict';

    let dialogQueue = [];
    let activeDialog = null;
    let previousFocus = null;
    let audioContext = null;

    function escapeFeedbackHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function ensureFeedbackRoot() {
        let root = document.getElementById('game-feedback-root');
        if (root) return root;
        root = document.createElement('div');
        root.id = 'game-feedback-root';
        root.innerHTML = `
            <div id="game-dialog-overlay" class="game-dialog-overlay" aria-hidden="true">
                <section id="game-dialog-card" class="game-dialog-card" role="dialog" aria-modal="true" aria-labelledby="game-dialog-title">
                    <div class="game-dialog-kicker" id="game-dialog-kicker"></div>
                    <h2 class="game-dialog-title" id="game-dialog-title"></h2>
                    <div class="game-dialog-message" id="game-dialog-message"></div>
                    <div class="game-dialog-control" id="game-dialog-control"></div>
                    <div class="game-dialog-actions">
                        <button type="button" class="game-dialog-btn game-dialog-btn-secondary" id="game-dialog-cancel">취소</button>
                        <button type="button" class="game-dialog-btn game-dialog-btn-primary" id="game-dialog-confirm">확인</button>
                    </div>
                </section>
            </div>
            <div id="game-toast-region" class="game-toast-region" role="status" aria-live="polite" aria-atomic="false"></div>`;
        document.body.appendChild(root);
        root.querySelector('#game-dialog-overlay').addEventListener('pointerdown', event => {
            if (event.target === event.currentTarget && activeDialog && activeDialog.dismissOnBackdrop !== false) finishDialog(null, false);
        });
        root.querySelector('#game-dialog-cancel').addEventListener('click', () => finishDialog(null, false));
        root.querySelector('#game-dialog-confirm').addEventListener('click', () => submitActiveDialog());
        document.addEventListener('keydown', handleDialogKeydown, true);
        return root;
    }

    function playUiFeedbackSound(kind) {
        if (typeof game !== 'undefined' && game && game.settings && game.settings.uiSounds === false) return;
        let AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        try {
            audioContext = audioContext || new AudioCtx();
            let osc = audioContext.createOscillator();
            let gain = audioContext.createGain();
            let now = audioContext.currentTime;
            let map = {
                open: [340, 0.018, 0.055],
                confirm: [520, 0.024, 0.07],
                cancel: [220, 0.018, 0.055],
                danger: [145, 0.028, 0.09],
                success: [660, 0.022, 0.08]
            };
            let spec = map[kind] || map.open;
            osc.type = kind === 'danger' ? 'sawtooth' : 'sine';
            osc.frequency.setValueAtTime(spec[0], now);
            if (kind === 'success') osc.frequency.exponentialRampToValueAtTime(880, now + spec[2]);
            gain.gain.setValueAtTime(spec[1], now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + spec[2]);
            osc.connect(gain);
            gain.connect(audioContext.destination);
            osc.start(now);
            osc.stop(now + spec[2]);
        } catch (error) {
            audioContext = null;
        }
    }

    function normalizeDialogOptions(options) {
        let source = typeof options === 'string' ? { message: options } : (options || {});
        return {
            type: source.type || 'confirm',
            tone: source.tone || 'default',
            title: source.title || (source.type === 'number' ? '수량 선택' : source.type === 'choice' ? '대상 선택' : source.type === 'text' ? '입력' : '확인'),
            kicker: source.kicker || (source.tone === 'danger' ? '주의가 필요한 작업' : 'ROOTBOUND SYSTEM'),
            message: source.message || '',
            confirmLabel: source.confirmLabel || '확인',
            cancelLabel: source.cancelLabel || '취소',
            min: Number.isFinite(Number(source.min)) ? Number(source.min) : 0,
            max: Number.isFinite(Number(source.max)) ? Number(source.max) : 100,
            step: Number.isFinite(Number(source.step)) && Number(source.step) > 0 ? Number(source.step) : 1,
            value: source.value,
            placeholder: source.placeholder || '',
            maxLength: Number.isFinite(Number(source.maxLength)) ? Number(source.maxLength) : 120,
            choices: Array.isArray(source.choices) ? source.choices : [],
            validate: typeof source.validate === 'function' ? source.validate : null,
            dismissOnBackdrop: source.dismissOnBackdrop !== false,
            resolve: source.resolve
        };
    }

    function requestGameDialog(options) {
        return new Promise(resolve => {
            dialogQueue.push(normalizeDialogOptions({ ...(options || {}), resolve }));
            showNextDialog();
        });
    }

    function requestGameConfirmation(message, options) {
        return requestGameDialog({ ...(options || {}), type: 'confirm', message });
    }

    function requestGameNumber(options) {
        return requestGameDialog({ ...(options || {}), type: 'number' });
    }

    function requestGameText(options) {
        return requestGameDialog({ ...(options || {}), type: 'text' });
    }

    function requestGameChoice(options) {
        return requestGameDialog({ ...(options || {}), type: 'choice' });
    }

    function showNextDialog() {
        if (activeDialog || dialogQueue.length === 0) return;
        ensureFeedbackRoot();
        activeDialog = dialogQueue.shift();
        previousFocus = document.activeElement;
        let overlay = document.getElementById('game-dialog-overlay');
        let card = document.getElementById('game-dialog-card');
        let control = document.getElementById('game-dialog-control');
        let cancel = document.getElementById('game-dialog-cancel');
        let confirm = document.getElementById('game-dialog-confirm');
        card.dataset.tone = activeDialog.tone;
        document.getElementById('game-dialog-kicker').textContent = activeDialog.kicker;
        document.getElementById('game-dialog-title').textContent = activeDialog.title;
        document.getElementById('game-dialog-message').innerHTML = escapeFeedbackHtml(activeDialog.message).replace(/\n/g, '<br>');
        cancel.textContent = activeDialog.cancelLabel;
        confirm.textContent = activeDialog.confirmLabel;
        control.innerHTML = buildDialogControl(activeDialog);
        bindDialogControl(activeDialog, control);
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('game-dialog-open');
        playUiFeedbackSound(activeDialog.tone === 'danger' ? 'danger' : 'open');
        requestAnimationFrame(() => {
            let focusTarget = control.querySelector('input:not([type="range"]),button[aria-pressed="true"]') || confirm;
            focusTarget.focus({ preventScroll: true });
            if (focusTarget.select) focusTarget.select();
        });
    }

    function buildDialogControl(dialog) {
        if (dialog.type === 'number') {
            let initial = clampDialogNumber(dialog.value, dialog);
            return `<div class="game-number-picker">
                <button type="button" class="game-number-stepper" data-step-direction="-1" aria-label="감소">−</button>
                <input id="game-dialog-number" class="game-number-input" type="number" min="${dialog.min}" max="${dialog.max}" step="${dialog.step}" value="${initial}">
                <button type="button" class="game-number-stepper" data-step-direction="1" aria-label="증가">＋</button>
                <input id="game-dialog-range" class="game-number-range" type="range" min="${dialog.min}" max="${dialog.max}" step="${dialog.step}" value="${initial}">
                <div class="game-number-bounds"><span>${dialog.min}</span><strong id="game-dialog-number-preview">${initial}</strong><span>${dialog.max}</span></div>
            </div>`;
        }
        if (dialog.type === 'text') {
            return `<label class="game-text-field"><span>입력값</span><input id="game-dialog-text" type="text" maxlength="${dialog.maxLength}" value="${escapeFeedbackHtml(dialog.value || '')}" placeholder="${escapeFeedbackHtml(dialog.placeholder)}" autocomplete="off"></label>`;
        }
        if (dialog.type === 'choice') {
            return `<div class="game-choice-grid">${dialog.choices.map((choice, index) => {
                let value = choice && typeof choice === 'object' ? choice.value : choice;
                let label = choice && typeof choice === 'object' ? choice.label : choice;
                let detail = choice && typeof choice === 'object' ? choice.detail : '';
                return `<button type="button" class="game-choice-option" data-choice-index="${index}" data-choice-value="${escapeFeedbackHtml(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}"><strong>${escapeFeedbackHtml(label)}</strong>${detail ? `<span>${escapeFeedbackHtml(detail)}</span>` : ''}</button>`;
            }).join('')}</div>`;
        }
        return '';
    }

    function bindDialogControl(dialog, control) {
        if (dialog.type === 'number') {
            let input = control.querySelector('#game-dialog-number');
            let range = control.querySelector('#game-dialog-range');
            let preview = control.querySelector('#game-dialog-number-preview');
            let sync = value => {
                let next = clampDialogNumber(value, dialog);
                input.value = String(next);
                range.value = String(next);
                preview.textContent = String(next);
            };
            input.addEventListener('input', () => sync(input.value));
            range.addEventListener('input', () => sync(range.value));
            control.querySelectorAll('[data-step-direction]').forEach(button => button.addEventListener('click', () => {
                sync(Number(input.value) + Number(button.dataset.stepDirection || 0) * dialog.step);
                playUiFeedbackSound('open');
            }));
        } else if (dialog.type === 'choice') {
            control.querySelectorAll('.game-choice-option').forEach(button => button.addEventListener('click', () => {
                control.querySelectorAll('.game-choice-option').forEach(row => row.setAttribute('aria-pressed', 'false'));
                button.setAttribute('aria-pressed', 'true');
                playUiFeedbackSound('open');
            }));
        }
    }

    function clampDialogNumber(value, dialog) {
        let number = Number(value);
        if (!Number.isFinite(number)) number = Number.isFinite(Number(dialog.value)) ? Number(dialog.value) : dialog.min;
        number = Math.max(dialog.min, Math.min(dialog.max, number));
        let steps = Math.round((number - dialog.min) / dialog.step);
        return Number((dialog.min + steps * dialog.step).toFixed(6));
    }

    function getActiveDialogValue() {
        if (!activeDialog) return null;
        if (activeDialog.type === 'confirm') return true;
        if (activeDialog.type === 'number') {
            return clampDialogNumber(document.getElementById('game-dialog-number').value, activeDialog);
        }
        if (activeDialog.type === 'text') return document.getElementById('game-dialog-text').value;
        if (activeDialog.type === 'choice') {
            let selected = document.querySelector('#game-dialog-control .game-choice-option[aria-pressed="true"]');
            if (!selected) return null;
            let index = Math.max(0, Math.floor(Number(selected.dataset.choiceIndex) || 0));
            let choice = activeDialog.choices[index];
            return choice && typeof choice === 'object' ? choice.value : choice;
        }
        return true;
    }

    function submitActiveDialog() {
        if (!activeDialog) return;
        let value = getActiveDialogValue();
        let validation = activeDialog.validate ? activeDialog.validate(value) : true;
        if (validation !== true) {
            showGameToast(typeof validation === 'string' ? validation : '입력값을 확인해주세요.', { tone: 'danger' });
            playUiFeedbackSound('danger');
            return;
        }
        finishDialog(value, true);
    }

    function finishDialog(value, confirmed) {
        if (!activeDialog) return;
        let finished = activeDialog;
        activeDialog = null;
        let overlay = document.getElementById('game-dialog-overlay');
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('game-dialog-open');
        playUiFeedbackSound(confirmed ? 'confirm' : 'cancel');
        finished.resolve(confirmed ? value : null);
        if (previousFocus && previousFocus.focus) previousFocus.focus({ preventScroll: true });
        previousFocus = null;
        requestAnimationFrame(showNextDialog);
    }

    function handleDialogKeydown(event) {
        if (!activeDialog) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            finishDialog(null, false);
            return;
        }
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            submitActiveDialog();
            return;
        }
        if (event.key !== 'Tab') return;
        let card = document.getElementById('game-dialog-card');
        let focusable = [...card.querySelectorAll('button:not([disabled]),input:not([disabled])')];
        if (focusable.length <= 0) return;
        let current = focusable.indexOf(document.activeElement);
        let next = event.shiftKey ? current - 1 : current + 1;
        if (next < 0) next = focusable.length - 1;
        if (next >= focusable.length) next = 0;
        event.preventDefault();
        focusable[next].focus();
    }

    function showGameToast(message, options) {
        if (!message) return null;
        ensureFeedbackRoot();
        let opts = typeof options === 'string' ? { tone: options } : (options || {});
        let region = document.getElementById('game-toast-region');
        let toast = document.createElement('div');
        let tone = opts.tone || 'info';
        toast.className = `game-toast game-toast-${tone}`;
        toast.innerHTML = `<span class="game-toast-mark">${tone === 'success' ? '✓' : tone === 'danger' ? '!' : tone === 'warning' ? '△' : '◆'}</span><span>${escapeFeedbackHtml(message)}</span>`;
        region.appendChild(toast);
        while (region.children.length > 4) region.firstElementChild.remove();
        requestAnimationFrame(() => toast.classList.add('active'));
        let duration = Math.max(1600, Number(opts.duration) || (tone === 'danger' ? 4300 : 2800));
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.remove(), 220);
        }, duration);
        if (tone === 'success') playUiFeedbackSound('success');
        else if (tone === 'danger') playUiFeedbackSound('danger');
        return toast;
    }

    let exports = { requestGameDialog, requestGameConfirmation, requestGameNumber, requestGameText, requestGameChoice, showGameToast, playUiFeedbackSound };
    if (typeof safeExposeGlobals === 'function') safeExposeGlobals(exports);
    else Object.assign(window, exports);
}());
