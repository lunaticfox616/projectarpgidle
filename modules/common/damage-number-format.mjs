const DAMAGE_NUMBER_FORMATS = ['comma', 'korean', 'korean_short', 'english'];

function normalizeDamageNumberFormat(format) {
    return DAMAGE_NUMBER_FORMATS.includes(format) ? format : 'comma';
}

function trimFixedNumber(value, digits) {
    let factor = Math.pow(10, digits);
    let truncated = Math.floor(Math.max(0, Number(value) || 0) * factor) / factor;
    let text = truncated.toFixed(digits);
    return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatKoreanFullDamageNumber(value) {
    let remaining = Math.max(0, Math.floor(Number(value) || 0));
    if (remaining < 10000) return `${remaining}`;
    const units = [
        // These units belong to the selected number system, regardless of the UI language.
        { value: 1000000000000, label: '조' },
        { value: 100000000, label: '억' },
        { value: 10000, label: '만' }
    ];
    let text = '';
    units.forEach(unit => {
        let part = Math.floor(remaining / unit.value);
        if (part <= 0) return;
        text += `${part}${unit.label}`;
        remaining %= unit.value;
    });
    if (remaining > 0) text += `${remaining}`;
    return text || '0';
}

function formatKoreanShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
        { value: 1000000000000, label: '조' },
        { value: 100000000, label: '억' },
        { value: 10000, label: '만' }
    ];
    for (const unit of units) {
        if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 1)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
}

function formatEnglishShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
        { value: 1000000000000, label: 'T' },
        { value: 1000000000, label: 'B' },
        { value: 1000000, label: 'M' },
        { value: 1000, label: 'K' }
    ];
    for (const unit of units) {
        if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 3)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
}

export function formatDamageNumberForDisplay(value, format = 'comma') {
    let amount = Math.max(0, Math.floor(Number(value) || 0));
    let mode = normalizeDamageNumberFormat(format);
    if (mode === 'korean') return formatKoreanFullDamageNumber(amount);
    if (mode === 'korean_short') return formatKoreanShortDamageNumber(amount);
    if (mode === 'english') return formatEnglishShortDamageNumber(amount);
    return amount.toLocaleString();
}
