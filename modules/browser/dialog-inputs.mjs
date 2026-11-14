import { escapeHTML } from '../common/text.mjs';
const DIALOG_TITLES = new Map([['number', '수량 선택'], ['choice', '대상 선택'], ['text', '입력']]);
const dialogFiniteNumber = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function dialogLabels(source) {
    return {
        title: source.title || DIALOG_TITLES.get(source.type) || '확인',
        kicker: source.kicker || (source.tone === 'danger' ? '주의가 필요한 작업' : ''),
        message: source.message || '', confirmLabel: source.confirmLabel || '확인', cancelLabel: source.cancelLabel || '취소',
        placeholder: source.placeholder || ''
    };
}
function dialogLimits(source) {
    return { min: dialogFiniteNumber(source.min, 0), max: dialogFiniteNumber(source.max, 100),
        step: Number.isFinite(Number(source.step)) && Number(source.step) > 0 ? Number(source.step) : 1,
        maxLength: dialogFiniteNumber(source.maxLength, 120) };
}
export function normalizeDialogOptions(options) {
    const source = typeof options === 'string' ? { message: options } : (options || {});
    return {
        type: source.type || 'confirm', tone: source.tone || 'default', ...dialogLabels(source), ...dialogLimits(source),
        value: source.value, choices: Array.isArray(source.choices) ? source.choices : [],
        validate: typeof source.validate === 'function' ? source.validate : null,
        submitOnChoice: source.submitOnChoice === true, summaryHtml: source.summaryHtml,
        dismissOnBackdrop: source.dismissOnBackdrop !== false, resolve: source.resolve, reject: source.reject
    };
}
export function clampDialogNumber(value, dialog) {
        let number = Number(value);
        if (!Number.isFinite(number)) number = Number.isFinite(Number(dialog.value)) ? Number(dialog.value) : dialog.min;
        number = Math.max(dialog.min, Math.min(dialog.max, number));
        let steps = Math.round((number - dialog.min) / dialog.step);
        return Number((dialog.min + steps * dialog.step).toFixed(6));
    }
export function buildDialogControl(dialog, translate) {
        if (dialog.type === 'number') {
            let initial = clampDialogNumber(dialog.value, dialog);
            return `<div class="game-number-picker">
                <button type="button" class="game-number-stepper" data-step-direction="-1" aria-label="${translate('감소')}">−</button>
                <input id="game-dialog-number" class="game-number-input" type="number" min="${dialog.min}" max="${dialog.max}" step="${dialog.step}" value="${initial}">
                <button type="button" class="game-number-stepper" data-step-direction="1" aria-label="${translate('증가')}">＋</button>
                <input id="game-dialog-range" class="game-number-range" type="range" min="${dialog.min}" max="${dialog.max}" step="${dialog.step}" value="${initial}">
                <div class="game-number-bounds"><span>${dialog.min}</span><strong id="game-dialog-number-preview">${initial}</strong><span>${dialog.max}</span></div>
            </div>`;
        }
        if (dialog.type === 'text') {
            return `<label class="game-text-field"><span>${translate('입력값')}</span><input id="game-dialog-text" type="text" maxlength="${dialog.maxLength}" value="${escapeHTML(dialog.value || '')}" placeholder="${escapeHTML(dialog.placeholder)}" autocomplete="off"></label>`;
        }
        if (dialog.type === 'choice') {
            return `<div class="game-choice-grid">${dialog.choices.map((choice, index) => {
                const entry = choice && typeof choice === 'object' ? choice : {value:choice,label:choice};
                const {value,label,detail} = entry;
                // Internal presentation HTML only; callers must escape any external text.
                let detailHtml = entry.detailHtml || (detail ? `<span>${escapeHTML(detail)}</span>` : '');
                return `<button type="button" class="game-choice-option" data-choice-index="${index}" data-choice-value="${escapeHTML(value)}" aria-pressed="${index === 0 ? 'true' : 'false'}"><strong>${escapeHTML(label)}</strong>${detailHtml}</button>`;
            }).join('')}</div>`;
        }
        return dialog.summaryHtml || '';
    }
