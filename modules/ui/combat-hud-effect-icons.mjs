export function getUiCombatEffectPresentation(runtime, key) {
    return runtime.state.UI_COMBAT_EFFECT_PRESENTATION[key] || { sprite: 48, label: String(key || '알 수 없는 효과'), color: '#d8d8d8' };
}

export function renderCombatEffectIcon(runtime, options) {
    let visual = getUiCombatEffectPresentation(runtime, options.key);
    let label = options.label || visual.label;
    let safeKey = String(options.key || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '') || 'unknown';
    let sprite = Math.max(0, Math.min(48, Math.floor(Number(visual.sprite) || 0)));
    let spriteX = ((sprite % 7) / 6 * 100).toFixed(4);
    let spriteY = (Math.floor(sprite / 7) / 6 * 100).toFixed(4);
    let tooltip = options.tooltip || '';
    let tooltipAttrs = tooltip
        ? ` data-info-tooltip-anchor="1" onmouseenter="${tooltip}" onmousemove="${tooltip}" onmouseleave="hideInfoTooltip()"`
        : '';
    const { timedClass, remainingAngle, time } = combatEffectTiming(options);
    let badge = options.badge ? `<span class="combat-effect-badge">${(0, runtime.deps.escapeHTML)(options.badge)}</span>` : '';
    return `<span class="combat-effect-icon effect-${safeKey}${timedClass}" role="img" aria-label="${(0, runtime.deps.escapeHTML)(label)}" style="--effect-color:${visual.color};--effect-sprite-x:${spriteX}%;--effect-sprite-y:${spriteY}%;--effect-remaining-angle:${remainingAngle.toFixed(2)}deg;"${tooltipAttrs}><span class="combat-effect-art" aria-hidden="true"></span>${time}${badge}</span>`;
}

export function getUiRuntimeEffectDetail(runtime, type, value, maxValue) {
    let formatter = runtime.state.UI_RUNTIME_EFFECT_DETAILS[type];
    return formatter ? formatter(value, maxValue) : '효과가 적용 중입니다.';
}

export function getUiEffectRemainingSeconds(runtime, expiresAt, now) {
    return Math.ceil(Math.max(0, (Number(expiresAt || 0) - now) / 1000));
}

export function renderUiRuntimeEffectIcon(runtime, options, now) {
    let keyArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.key || '')));
    let value = Number(options.value || 0);
    let maxValue = Number(options.maxValue || 0);
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(runtime, options.expiresAt, now);
    let tooltip = `showPlayerRuntimeEffectTooltip(event,${keyArg},${value},${maxValue},${remain})`;
    return renderCombatEffectIcon(runtime, { key: options.key, label: options.label, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}

export function renderUiNamedEffectIcon(runtime, options, now) {
    let keyArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.key || '')));
    let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.name || '')));
    let detailArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(options.detail || '')));
    let remain = Number.isFinite(options.remainSec)
        ? Math.max(0, Math.ceil(options.remainSec))
        : getUiEffectRemainingSeconds(runtime, options.expiresAt, now);
    let tooltip = `showPlayerNamedEffectTooltip(event,${keyArg},${nameArg},${detailArg},${remain})`;
    return renderCombatEffectIcon(runtime, { key: options.key, label: options.name, tooltip, badge: options.badge || '', remainingSec: remain, durationSec: options.durationSec });
}


function combatEffectTiming(options) {
    let remainingSec = Math.max(0, Number(options.remainingSec) || 0);
    let durationSec = Math.max(0, Number(options.durationSec) || 0);
    let timedClass = remainingSec > 0 ? ' timed' : '';
    let remainingAngle = durationSec > 0 ? Math.max(0, Math.min(360, remainingSec / durationSec * 360)) : 360;
    let time = remainingSec > 0 ? `<span class="combat-effect-time">${remainingSec >= 100 ? '99+' : Math.ceil(remainingSec)}</span>` : '';
    return { timedClass, remainingAngle, time };
}
