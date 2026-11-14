export function showSporeCraftTooltip(runtime, event, kind) {
    let info = kind === 'corrupt'
        ? { name: '부패 수확', desc: '잠기지 않은 원소 피해/원소 저항 옵션 1개를 무작위로 제거합니다.', color: '#b58ad9' }
        : { name: '균열 수확', desc: '빈 옵션 1칸에 해당 부위의 화석 전용 옵션 1개를 추가합니다.', color: '#72c8d8' };
    let html = `<div class="tooltip-title">${(0, runtime.deps._t)(info.name)}</div><div class="tooltip-line">${(0, runtime.deps._t)(info.desc)}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, info.color);
}

export function renderBreakdownHtml(runtime, data) {
    let html = `<div class="tooltip-title">${(0, runtime.deps._t)(data.title)}</div>`;
    (data.lines || []).filter(Boolean).forEach(line => { html += `<div class="tooltip-line">${line}</div>`; });
    if (data.final !== undefined) html += `<div class="tooltip-final">${(0, runtime.deps._t)('최종 수치: {final}', { final: data.final })}</div>`;
    return html;
}

export function showStatTooltip(runtime, event, key) {
    // Combat ticks keep numeric stats only; build current explanations on explicit inspection.
    let stats = (0, runtime.deps.getUiPlayerStats)();
    runtime.deps.cachedTooltipStats = stats;
    let data = stats && stats.breakdowns ? stats.breakdowns[key] : null;
    if (!data) return;
    const rect = event.currentTarget.getBoundingClientRect();
    runtime.handlers.showInfoTooltipHtml(event.clientX ?? rect.left, event.clientY ?? rect.bottom, renderBreakdownHtml(runtime, data), '#f39c12');
}

export function createShowPlayerAilmentTooltip(runtime) {
    return function showPlayerAilmentTooltip(event, type, timeLeft, power, sourceHitDamage) {
        let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
        let p = Math.max(0.1, Number(power || 0.1));
        let source = Math.max(0, Number(sourceHitDamage || 0));
        const detail = playerAilmentDetail(runtime, type, p, source);
        let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div><div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(Math.max(0, Number(timeLeft||0))) })}</div><div class="tooltip-line">${(0, runtime.deps._t)('위력: {p}', { p: p.toFixed(2) })}</div><div class="tooltip-line">${detail}</div>`;
        runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, '#ff7f7f');
    };
}

export function showPlayerEhpTooltip(runtime, event) {
    const anchor = event.currentTarget;
    const rect = anchor.getBoundingClientRect();
    const html = `<div class="tooltip-title">${(0, runtime.deps._t)('속성별 실효 체력')}</div><div class="tooltip-line">${(0, runtime.deps.escapeHTML)(anchor.dataset.ehpDetail)}</div><div class="tooltip-line tooltip-muted">${(0, runtime.deps._t)('공격 EHP는 회피를 포함한 평균 내구도, 직격 EHP는 회피하지 못한 타격 기준입니다.')}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}

export function showMapProgressTooltip(runtime, event) {
    const rect = event.currentTarget.getBoundingClientRect();
    const speed = Math.max(1, Number(runtime.deps.cachedTooltipStats?.moveSpeed) || 100);
    const multiplier = speed / 100;
    const saved = (1 - 1 / multiplier) * 100;
    const html = `<div class="tooltip-title">${(0, runtime.deps._t)('이동 속도와 진행도')}</div><div class="tooltip-line">${(0, runtime.deps._t)('이동 속도 {speed}, 기본 대비 {multiplier}배', { speed: speed.toFixed(1), multiplier: multiplier.toFixed(2) })}</div><div class="tooltip-line">${(0, runtime.deps._t)('같은 이동 구간의 소요 시간 {abs}% {value}', { abs: Math.abs(saved).toFixed(1), value: saved >= 0 ? (0, runtime.deps._t)('단축') : (0, runtime.deps._t)('증가') })}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX || rect.left, event.clientY || rect.bottom, html, '#b49b68');
}

export function showPlayerExperienceTooltip(runtime, event) {
    let progress = (0, runtime.deps.getUiExperienceProgress)(runtime.deps.game.level, runtime.deps.game.exp);
    let current = (0, runtime.deps.formatSettingNumber)(progress.current, 'showExpComma');
    let required = (0, runtime.deps.formatSettingNumber)(progress.required, 'showExpComma');
    let remaining = (0, runtime.deps.formatSettingNumber)(progress.remaining, 'showExpComma');
    let html = '<div class="tooltip-title">경험치</div>'
        + `<div class="tooltip-line">${(0, runtime.deps._t)('현재: {current} / {required}', { current, required })}</div>`
        + `<div class="tooltip-line">${(0, runtime.deps._t)('다음 레벨까지: {remaining}', { remaining })}</div>`
        + `<div class="tooltip-line">${(0, runtime.deps._t)('진행도: {percent}%', { percent: progress.percent.toFixed(1) })}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, '#c89be8');
}

export function createShowPlayerRuntimeEffectTooltip(runtime) {
    return function showPlayerRuntimeEffectTooltip(event, type, value, maxValue, remainSec) {
        let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
        let detail = (0, runtime.deps.getUiRuntimeEffectDetail)(type, value, maxValue);
        let duration = Number(remainSec || 0) > 0
            ? `<div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(remainSec) })}</div>` : '';
        let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div>${duration}<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(detail)}</div>`;
        runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
}

export function createShowPlayerNamedEffectTooltip(runtime) {
    return function showPlayerNamedEffectTooltip(event, type, name, detail, remainSec) {
        let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
        let duration = Number(remainSec || 0) > 0
            ? `<div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(remainSec) })}</div>` : '';
        let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)(name || visual.label)}</div>${duration}`
            + `<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(detail || '효과가 적용 중입니다.')}</div>`;
        runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
}

export function createShowPlayerCosmosDebuffTooltip(runtime) {
    return function showPlayerCosmosDebuffTooltip(event, type, value, remainSec, label) {
        let visual = (0, runtime.deps.getUiCombatEffectPresentation)(type);
        let safeLabel = (0, runtime.deps.escapeHTML)(label || visual.label);
        let html = `<div class="tooltip-title">${safeLabel}</div>`
            + `<div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(Math.max(0, Number(remainSec || 0))) })}</div>`
            + `<div class="tooltip-line">${safeLabel} -${Math.max(0, Number(value || 0)).toFixed(0)}%</div>`;
        runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, visual.color);
    };
}

export function findConditionEffectDelta(runtime, name, type) {
    if (type !== 'curse') return (runtime.deps.talismanCombat.active().find(row => row.buff.name === name) || {}).delta || null;
    for (const rows of Object.values(runtime.deps.game.enemyConditionDebuffs || {})) {
        const row = (rows || []).find(entry => entry && entry.name === name);
        if (row) return row.delta;
    }
    return null;
}

export function showPlayerBuffTooltip(runtime, event, name, type, remainSec) {
    const typeLabel = { curse: '저주', warcry: '함성', guard: '수호' }[type] || '효과';
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps.getConditionEffectTitle)(name))}</div><div class="tooltip-line">${(0, runtime.deps._t)('분류: {typeLabel}, 부적 조건부 줄', { typeLabel })}</div>`;
    if (Number(remainSec) > 0) html += `<div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(Number(remainSec)) })}</div>`;
    html += `<div class="tooltip-line">${(0, runtime.deps.escapeHTML)(runtime.deps.talismans.describeDelta(findConditionEffectDelta(runtime, name, type)) || '효과 없음')}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, '#7fb3ff');
}

function playerAilmentDetail(runtime, type, p, source) {
    let detail = '';
    if ((0, runtime.deps.isUiDamageAilmentType)(type)) {
        let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
        let dps = (0, runtime.deps.getUiPlayerDamageAilmentDps)({ type: type, power: p, sourceHitDamage: source }, tooltipStats);
        let basis = source > 0 ? (0, runtime.deps._t)('받은 피해 {floor} 기준', { floor: Math.floor(source) }) : '최대 생명력 기반';
        detail = `${(0, runtime.deps._t)('초당 피해: 약 {dps}', { dps })} <span style="color:var(--copy-bright);">(${basis})</span>`;
    } else if (type === 'chill') detail = (0, runtime.deps._t)('공격 속도 약 32% 감소');
    else if (type === 'shock') {
        let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
        let shockTakenIncrease = (0, runtime.deps.getUiPlayerShockTakenDamageIncreasePct)(p, tooltipStats);
        detail = (0, runtime.deps.formatUiTakenDamageShockLine)(shockTakenIncrease);
    }
    else if (type === 'freeze') detail = '행동 불가';
    return detail;
}
