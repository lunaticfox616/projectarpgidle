(function () {
    'use strict';

    let dialogQueue = [];
    let activeDialog = null;
    let previousFocus = null;

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
                        <button type="button" class="game-dialog-btn game-dialog-btn-secondary" id="game-dialog-cancel">취소</button>
                        <button type="button" class="game-dialog-btn game-dialog-btn-primary" id="game-dialog-confirm">확인</button>
                    </div>
                </section>
            </dialog>
            <div id="game-toast-region" class="game-toast-region" role="status" aria-live="polite" aria-atomic="false"></div>`;
        document.body.appendChild(root);
        root.querySelector('#game-dialog-overlay').addEventListener('cancel', event => {
            event.preventDefault();
            finishDialog(null, false);
        });
        root.querySelector('#game-dialog-overlay').addEventListener('close', event => {
            if (!event.target.open) finishDialog(null, false);
        });
        root.querySelector('#game-dialog-overlay').addEventListener('pointerdown', event => {
            if (event.target === event.currentTarget && activeDialog && activeDialog.dismissOnBackdrop !== false) finishDialog(null, false);
        });
        root.querySelector('#game-dialog-cancel').addEventListener('click', () => finishDialog(null, false));
        root.querySelector('#game-dialog-confirm').addEventListener('click', () => submitActiveDialog());
        document.addEventListener('keydown', handleDialogKeydown, true);
        return root;
    }


    function normalizeDialogOptions(options) {
        let source = typeof options === 'string' ? { message: options } : (options || {});
        return {
            type: source.type || 'confirm',
            tone: source.tone || 'default',
            title: source.title || (source.type === 'number' ? '수량 선택' : source.type === 'choice' ? '대상 선택' : source.type === 'text' ? '입력' : '확인'),
            kicker: source.kicker || (source.tone === 'danger' ? '주의가 필요한 작업' : ''),
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
            submitOnChoice: source.submitOnChoice === true,
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
        cancel.style.display = activeDialog.type === 'notice' ? 'none' : '';
        confirm.style.display = activeDialog.type === 'choice' && activeDialog.submitOnChoice ? 'none' : '';
        control.innerHTML = buildDialogControl(activeDialog);
        document.getElementById('game-dialog-error').hidden = true;
        bindDialogControl(activeDialog, control);
        overlay.inert = false;
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
        overlay.showModal();
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
                const entry = choice && typeof choice === 'object' ? choice : {value:choice,label:choice};
                const {value,label,detail} = entry;
                // Internal presentation HTML only; callers must escape any external text.
                let detailHtml = entry.detailHtml || (detail ? `<span>${escapeFeedbackHtml(detail)}</span>` : '');
                return `<button type="button" class="game-choice-option" data-choice-index="${index}" data-choice-value="${escapeFeedbackHtml(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}"><strong>${escapeFeedbackHtml(label)}</strong>${detailHtml}</button>`;
            }).join('')}</div>`;
        }
        return '';
    }

    function bindDialogControl(dialog, control) {
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
                playUiFeedbackSound('open');
            }));
        } else if (dialog.type === 'choice') {
            control.querySelectorAll('.game-choice-option').forEach(button => button.addEventListener('click', () => {
                control.querySelectorAll('.game-choice-option').forEach(row => row.setAttribute('aria-pressed', 'false'));
                button.setAttribute('aria-pressed', 'true');
                playUiFeedbackSound('open');
                if (dialog.submitOnChoice) submitActiveDialog();
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
            let error = document.getElementById('game-dialog-error');
            error.textContent = typeof validation === 'string' ? validation : '입력값을 확인해주세요.';
            error.hidden = false;
            error.scrollIntoView({ block: 'nearest' });
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
        let focused = document.activeElement;
        let restoreTarget = previousFocus && previousFocus.focus && !overlay.contains(previousFocus) ? previousFocus : null;
        overlay.close();
        if (restoreTarget) restoreTarget.focus({ preventScroll: true });
        else if (focused && overlay.contains(focused) && focused.blur) focused.blur();
        previousFocus = null;
        overlay.inert = true;
        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('game-dialog-open');
        playUiFeedbackSound(confirmed ? 'confirm' : 'cancel');
        finished.resolve(confirmed ? value : null);
        requestAnimationFrame(showNextDialog);
    }

    function handleDialogKeydown(event) {
        if (!activeDialog || !event.target.closest?.('#game-dialog-overlay')) return;
        if (event.key === 'Enter' && !event.shiftKey && !event.target.closest('button')) {
            event.preventDefault();
            event.stopImmediatePropagation();
            submitActiveDialog();
            return;
        }
        if (event.key !== 'Tab') return;
        cycleDialogFocus(event);
    }

    function cycleDialogFocus(event) {
        let card = document.getElementById('game-dialog-card');
        let focusable = [...card.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(element => element.getClientRects().length);
        if (focusable.length <= 0) return;
        let current = focusable.indexOf(document.activeElement);
        let next = event.shiftKey ? current - 1 : current + 1;
        if (next < 0) next = focusable.length - 1;
        if (next >= focusable.length) next = 0;
        event.preventDefault();
        focusable[next].focus();
    }

    function dismissGameToast(toast, fadeMs) {
        if (toast.classList.contains('is-dismissed')) return;
        toast.classList.add('is-dismissed');
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), fadeMs);
    }

    /** 알림 글: 도트 UI에 컬러 이모지를 섞지 않는다(기록 줄은 decorateCombatLogMessage가 같은 일을 한다). */
    function toastText(message) {
        return typeof stripDecorativeEmoji === 'function' ? stripDecorativeEmoji(message) : String(message);
    }

    function showGameToast(message, options) {
        if (!message) return null;
        ensureFeedbackRoot();
        let opts = typeof options === 'string' ? { tone: options } : (options || {});
        let region = document.getElementById('game-toast-region');
        let toast = document.createElement('div');
        let tone = opts.tone || 'info';
        toast.className = `game-toast game-toast-${tone}`;
        toast.innerHTML = `<span class="game-toast-mark">${tone === 'success' ? '✓' : tone === 'danger' ? '!' : tone === 'warning' ? '△' : '◆'}</span><span>${escapeFeedbackHtml(toastText(message))}</span>`;
        region.appendChild(toast);
        while (region.children.length > 4) region.firstElementChild.remove();
        requestAnimationFrame(() => toast.classList.add('active'));
        let duration = Math.max(1600, Number(opts.duration) || (tone === 'danger' ? 4300 : 2800));
        // A click clears it at once; otherwise it fades out on its own.
        toast.addEventListener('click', () => dismissGameToast(toast, 90));
        setTimeout(() => dismissGameToast(toast, 220), duration);
        if (tone === 'success') playUiFeedbackSound('success');
        else if (tone === 'danger') playUiFeedbackSound('danger');
        return toast;
    }

    /** Binds an already-mounted picker; returns its close action for successful selections.
     * @param {HTMLElement} overlay
     * @param {{titleId:string, closeSelector:string, returnSelector:string, onClose?:()=>void}} options
     * @returns {()=>void}
     */
    function bindGamePicker(overlay, options) {
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', options.titleId);
        const close = () => {
            overlay.remove();
            options.onClose?.();
            document.querySelector(options.returnSelector)?.focus({preventScroll:true});
        };
        overlay.onclick = event => { if (event.target === overlay) close(); };
        overlay.onkeydown = event => {
            if (event.key === 'Escape') {
                event.preventDefault(); event.stopPropagation(); close(); return;
            }
            if (event.key !== 'Tab') return;
            const controls = [...overlay.querySelectorAll('button:not(:disabled),select:not(:disabled)')]
                .filter(control => control.getClientRects().length);
            const first = controls[0], last = controls[controls.length-1];
            const target = event.shiftKey ? last : first;
            if (document.activeElement !== (event.shiftKey ? first : last)) return;
            event.preventDefault(); target.focus();
        };
        const closeButton = overlay.querySelector(options.closeSelector);
        closeButton.onclick = close;
        closeButton.focus({preventScroll:true});
        return close;
    }

    let exports = { requestGameDialog, requestGameConfirmation, requestGameNumber, requestGameText, requestGameChoice, bindGamePicker, showGameToast };
    if (typeof safeExposeGlobals === 'function') safeExposeGlobals(exports);
    else Object.assign(window, exports);
}());
