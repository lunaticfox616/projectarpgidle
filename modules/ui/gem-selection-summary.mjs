export function targetRows(runtime, name, replaced) {
    const equippedSupports = runtime.deps.game.equippedSupports.filter(gem => gem !== replaced && gem !== name).concat(name);
    const result = runtime.deps.window.GameModules.skills.supports.targets(name, { ...runtime.deps.game, equippedSupports });
    return [{ ...result.main, role: 'main' }, { ...result.mobility, role: 'mobility' },
        ...result.summons.map(row => ({ ...row, role: 'summon' }))];
}

export function targetCount(runtime, name, replaced) {
    return targetRows(runtime, name, replaced).filter(row => row.status === 'on').length;
}

export function application(runtime, name, stats, replaced) {
    const roles = [...new Set(targetRows(runtime, name, replaced).filter(row => row.status === 'on').map(row => runtime.state.TARGET_LABELS[row.role]))];
    return roles.length ? (0, runtime.deps._t)('적용: {roles}', { roles: roles.join(', ') }) : '맞는 스킬 없음';
}

export function indicators(runtime, name, replaced) {
    const rows = targetRows(runtime, name, replaced);
    return '<span class="support-targets" aria-label="' + (0, runtime.deps._t)('스킬별 적용') + '">' + Object.entries(runtime.state.TARGET_LABELS).map(([role, rawLabel]) => {
        const label = (0, runtime.deps._t)(rawLabel);
        const group = rows.filter(row => row.role === role);
        const status = ['on', 'na', 'off', 'buff', 'empty'].find(key => group.some(row => row.status === key)) || 'empty';
        const text = group.map(row => `${row.name ? (0, runtime.deps._t)(row.name) : label}: ${row.reason || (0, runtime.deps._t)(runtime.state.TARGET_STATES[row.status])}`).join(', ') || (0, runtime.deps._t)(runtime.state.TARGET_STATES.empty);
        return `<span class="support-target is-${status}" data-tip="${(0, runtime.deps.escapeHTML)(text)}" aria-label="${label}: ${(0, runtime.deps.escapeHTML)(text)}"><i aria-hidden="true"></i>${label === '주 공격' ? (0, runtime.deps._t)('주') : label.slice(0, 1)}</span>`;
    }).join('') + '</span>';
}

export function effectText(runtime, name, tier, stats) {
    const def = runtime.deps.SUPPORT_GEM_DB[name];
    if (def.tierValues) return runtime.deps.window.GameModules.skills.supports.describe(name, tier, runtime.deps.game);
    const info = (0, runtime.deps.getUiGemPresentation)(name, true, stats);
    const value = info.value / (0, runtime.deps.getSupportTierMultiplier)(name, (0, runtime.deps.getSupportActiveTier)(name)) * (0, runtime.deps.getSupportTierMultiplier)(name, tier);
    return `${(0, runtime.deps._t)(info.statName)} +${(0, runtime.deps.formatSupportGemEffectValue)(value)}${def.isPct ? '%' : ''}`;
}

export function targetDetails(runtime, name, stats, replaced) {
    const effect = effectText(runtime, name, (0, runtime.deps.getSupportActiveTier)(name), stats);
    return `<div class="support-target-details">${targetRows(runtime, name, replaced).map(row =>
        `<p class="is-${row.status}"><b>${(0, runtime.deps._t)(runtime.state.TARGET_LABELS[row.role])}${row.name ? ` · ${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(row.name))}` : ''}</b><span>${(0, runtime.deps.escapeHTML)(row.status === 'on' ? effect : (row.reason || runtime.state.TARGET_STATES[row.status]))}</span></p>`).join('')}</div>`;
}

export function summonEffect(runtime, name, stats) {
    const def = runtime.deps.SKILL_DB[name];
    if (def.aura) {
        const info = (0, runtime.deps.getUiGemPresentation)(name, false, stats);
        const steps = (0, runtime.deps.getGemLevelGrowthSteps)(info.finalLevel);
        const rows = def.aura.stats.slice();
        if (def.aura.flatStat) rows.unshift({ stat: def.aura.flatStat, base: def.aura.flatBase, scale: def.aura.flatScale });
        return rows.map(row => `${(0, runtime.deps._t)((0, runtime.deps.getStatName)(row.stat)).replace(/\(%\)$/, '')} +${(0, runtime.deps.formatSupportGemEffectValue)(row.base + steps * row.scale)}${runtime.deps.P_STATS[row.stat]?.isPct ? '%' : ''}`).join(', ');
    }
    if (def.tags.includes('summon_guard')) {
        const preview = (0, runtime.deps.getSummonTooltipPreview)(name, stats);
        return (0, runtime.deps._t)('생명력 {floor}, 적중 피해 {redirectPct}% 대신 받음', { floor: Math.floor(preview.maxHp).toLocaleString(), redirectPct: preview.redirectPct });
    }
    return '';
}

export function skillSummary(runtime, role, name, stats) {
    const key = role === 'active' ? 'main' : role;
    const rows = runtime.deps.game.equippedSupports.filter(support => targetRows(runtime, support).some(row => row.role === key && row.name === name && row.status === 'on'));
    return `<div class="support-skill-summary"><b>${(0, runtime.deps._t)('{name}: 적용 보조 {length}개', { name: (0, runtime.deps.escapeHTML)((0, runtime.deps._t)(name || runtime.state.TARGET_LABELS[key])), length: rows.length })}</b><span>${rows.map(support => (0, runtime.deps.escapeHTML)(effectText(runtime, support, (0, runtime.deps.getSupportActiveTier)(support), stats))).join(', ') || (0, runtime.deps._t)('현재 적용되는 보조 효과가 없습니다.')}</span></div>`;
}

export function migrationNotice(runtime) {
    const migration = runtime.deps.game.saveMeta?.supportRuneMigration;
    if (!migration?.noticePending) return;
    (0, runtime.deps.addLog)((0, runtime.deps._t)('보조룬 개편: {map} 이전, 창공의 정수 {refund}개 환급. 소환 칸에서 사역룬을 확인하세요.', { map: migration.moved.map(runtime.deps.escapeHTML).join(', '), refund: migration.refund }), 'loot-unique', { toast: true });
    migration.noticePending = false;
}
