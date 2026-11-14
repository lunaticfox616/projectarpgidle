export function syncMapProgressRow(runtime, zone) {
    const row = runtime.deps.document.getElementById('ui-map-progress-row');
    const speaks = !!zone && (runtime.state.MAP_PROGRESS_SPEAKING_TYPES.includes(zone.type) || (zone.type === 'outsideChaos' && !!runtime.deps.game.woodsmanEntrancePending));
    if (row) row.toggleAttribute('hidden', !!zone && (zone.type === 'act' || !!zone.exploration) && !speaks);
}

export function setCombatProgressGaugePercent(runtime, percent) {
    let bar = runtime.deps.document.getElementById('ui-move-bar');
    if (!bar) return;
    let safePercent = Math.max(0, Math.min(100, Number(percent) || 0));
    bar.style.width = `${safePercent}%`;
    if (bar.parentElement && bar.parentElement.style) {
        bar.parentElement.style.setProperty('--progress-fill', `${safePercent}%`);
    }
}

export function getUiExperienceProgress(runtime, level, experience) {
    let required = Math.max(1, Number((0, runtime.deps.getExpReq)(level)) || 1);
    let current = Math.max(0, Number(experience) || 0);
    return {
        current,
        required,
        remaining: Math.max(0, Math.floor(required - current)),
        percent: Math.max(0, Math.min(100, current / required * 100))
    };
}
