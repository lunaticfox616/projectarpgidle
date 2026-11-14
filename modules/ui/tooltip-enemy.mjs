export function getUiEnemyDamageAilmentTooltipDetail(runtime, state) {
    let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
    let ailmentDps = (0, runtime.deps.getUiEnemyDamageAilmentDps)({
        type: state.type,
        power: state.power,
        sourceHitDamage: state.sourceHitDamage,
        critDotBonusPct: state.critDotBonusPct
        }, tooltipStats);
    let totalDamage = Math.max(0, Math.floor(ailmentDps * state.stacks * state.timeLeft));
    let stackText = state.stacks > 1 ? (0, runtime.deps._t)(', {stacks}중첩', { stacks: state.stacks }) : '';
    return `${(0, runtime.deps._t)('총 피해량: 약 {totalDamage}', { totalDamage })} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)('(원천피해: {floor} / 초당 피해: 약 {ailmentDps}{stackText})', { floor: Math.floor(state.sourceHitDamage), ailmentDps, stackText })}</span>`;
}

export function getUiFlameDecayTooltipDetail(runtime, state) {
    let dps = Math.max(0, Math.floor(state.specialDps));
    let totalDamage = Math.max(0, Math.floor(dps * state.timeLeft));
    let rawTick = Math.max(0, Math.floor(state.rawTickDamage));
    let interval = Math.max(0.02, state.tickInterval);
    let rawDps = rawTick > 0 ? Math.floor(rawTick / interval) : 0;
    let resistText = Number.isFinite(state.enemyRes) ? (0, runtime.deps._t)(', 적 화염 저항/관통 후 {enemyRes}%', { enemyRes: state.enemyRes.toFixed(1) }) : '';
    let abyssText = Math.abs(state.abyssPlayerMul - 1) > 0.001 ? (0, runtime.deps._t)(', 심연/지역 배율 {abyssPlayerMul}x', { abyssPlayerMul: state.abyssPlayerMul.toFixed(2) }) : '';
    return `${(0, runtime.deps._t)('총 피해량: 약 {totalDamage}', { totalDamage })} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)('(최종 초당 피해: 약 {dps}, 원시 {rawDps}/s{resistText}{abyssText})', { dps, rawDps, resistText, abyssText })}</span><br><span style="color:#ffb48a;">${(0, runtime.deps._t)('점화 피해 증폭: {igniteTakenMultiplier}x (생명력 기반 시너지)', { igniteTakenMultiplier: state.igniteTakenMultiplier.toFixed(2) })}</span>`;
}

export function getUiEnemyAilmentTooltipDetail(runtime, state) {
    if ((0, runtime.deps.isUiDamageAilmentType)(state.type)) return getUiEnemyDamageAilmentTooltipDetail(runtime, state);
    if (state.type === 'flameDecay') return getUiFlameDecayTooltipDetail(runtime, state);
    if (state.type === 'shock') {
        let tooltipStats = runtime.deps.cachedTooltipStats || (0, runtime.deps.getUiPlayerStats)(null);
        let increase = (0, runtime.deps.getUiEnemyShockTakenDamageIncreasePct)(state.power, tooltipStats);
        return `${(0, runtime.deps.formatUiTakenDamageShockLine)(increase)} <span style="color:var(--copy-bright);">${(0, runtime.deps._t)('(최대 생명력 대비 타격 비율 반영)')}</span>`;
    }
    let formatter = runtime.state.UI_ENEMY_AILMENT_DETAIL_FORMATTERS[state.type];
    return formatter ? formatter(state) : '효과가 적용 중입니다.';
}

export function showEnemyAilmentTooltip(runtime, event, payload) {
    let source = payload && typeof payload === 'object' ? payload : {};
    let state = {
        type: String(source.type || 'unknown'),
        ...enemyAilmentDamageValues(source),
        enemyRes: Number.isFinite(Number(source.enemyRes)) ? Number(source.enemyRes) : NaN,
        abyssPlayerMul: Number.isFinite(Number(source.abyssPlayerMul)) ? Number(source.abyssPlayerMul) : 1,
        igniteTakenMultiplier: Math.max(1, Number(source.igniteTakenMultiplier) || 1)
    };
    let visual = (0, runtime.deps.getUiCombatEffectPresentation)(state.type);
    let powerLine = (0, runtime.deps.isUiDamageAilmentType)(state.type) || state.type === 'hunterExpose'
        ? '' : `<div class="tooltip-line">${(0, runtime.deps._t)('위력: {power}', { power: state.power.toFixed(2) })}</div>`;
    let html = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(visual.label))}</div><div class="tooltip-line">${(0, runtime.deps._t)('남은 시간: {ceil}초', { ceil: Math.ceil(state.timeLeft) })}</div>${powerLine}<div class="tooltip-line">${getUiEnemyAilmentTooltipDetail(runtime, state)}</div>`;
    runtime.handlers.showInfoTooltipHtml(event.clientX, event.clientY, html, '#ffcf88');
}

function enemyAilmentDamageValues(source) {
    return {
        timeLeft: Math.max(0, Number(source.timeLeft) || 0),
        power: Math.max(0, Number(source.power) || 0),
        sourceHitDamage: Math.max(0, Number(source.sourceHitDamage) || 0),
        specialDps: Math.max(0, Number(source.specialDps) || 0),
        critDotBonusPct: Number(source.critDotBonusPct) || 0,
        stacks: Math.max(1, Math.floor(Number(source.stacks) || 1)),
        rawTickDamage: Math.max(0, Number(source.rawTickDamage) || 0),
        tickInterval: Math.max(0.02, Number(source.tickInterval) || 0.02)
    };
}
