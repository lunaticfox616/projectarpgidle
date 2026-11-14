/** The next milestone of a category at a level, coloured ('' at the top). */
export function nextStepHtml(runtime, id, level) {
    const index = Math.floor(level / 10);
    const step = (runtime.state.M.milestones[id] || [])[index];
    return step ? (0, runtime.deps._t)('다음 특전 레벨 {value}: {step}', { value: (index + 1) * 10, step: stepHtml(runtime, step) }) : '모든 특전을 열었습니다.';
}

export function cardHtml(runtime, id, wielded) {
    const row = runtime.deps.weaponMastery.progress(runtime.deps.game, id), fill = row.need ? Math.floor(row.into / row.need * 100) : 100;
    const effects = [row.level > 1 ? lineHtml(runtime, runtime.state.M.perLevel.stat, runtime.deps.weaponMastery.perLevel(row.level)) : '',
        ...runtime.deps.weaponMastery.opened(id, row.level).map(runtime.handlers.stepHtml)].filter(Boolean).join(', ');
    return `<div class="mastery-card${id === wielded ? ' is-wielded' : ''}${row.level > 1 ? '' : ' is-new'}" style="--mastery-tone:${runtime.state.TONES[id] || '#e8c27a'}">`
        + `<div class="mastery-card-head"><strong>${esc(runtime, name(runtime, id))}</strong><b>Lv.${row.level}</b>${id === wielded ? (0, runtime.deps._t)('<em>들고 있음</em>') : ''}</div>
            <div class="mastery-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}"><i style="width:${fill}%"></i></div>
            <small>${effects || (0, runtime.deps._t)('레벨 2부터 피해가 오릅니다.')}</small>
            <small class="mastery-next">${nextStepHtml(runtime, id, row.level)}</small></div>`;
}

/** The records window's mastery section. */
export function sectionHtml(runtime) {
    const total = runtime.deps.weaponMastery.total(runtime.deps.game), next = runtime.state.M.totalSteps.find(step => total < step), wielded = runtime.deps.weaponMastery.wielded(runtime.deps.game);
    return `<details class="records-fold records-mastery" open><summary>${(0, runtime.deps._t)('무기 숙련')}<span>${(0, runtime.deps._t)('합계 {total}, 방치 효율', { total })} <b class="records-gain">+${percent(runtime, runtime.deps.weaponMastery.offline(runtime.deps.game))}</b></span></summary>
            <div class="records-fold-body"><div class="mastery-grid">${runtime.deps.weaponMastery.ids.map(id => cardHtml(runtime, id, wielded)).join('')}</div>
            <p class="records-fold-hint">들고 있는 무기로 잡을 때마다 오르고 루프를 넘어 남습니다. 합계 ${runtime.state.M.totalSteps.join(', ')}마다 방치 효율 +1%p${next ? (0, runtime.deps._t)(' (다음 {next})', { next }) : ''}.</p></div></details>`;
}

/** The item tooltip's mastery line for a weapon: its category's level and what it gives. '' for other items. */
export function tooltipHtml(runtime, item) {
    const id = item && item.slot === '무기' ? (0, runtime.deps.getWeaponCategoryId)(item) : null;
    if (!id) return '';
    const level = runtime.deps.weaponMastery.level(runtime.deps.game, id);
    return `<div class="tooltip-line" style="margin-top:6px; color:#e8c27a;">${(0, runtime.deps._t)('⚔️ {id} 숙련 {level}: {stat}', { id: esc(runtime, name(runtime, id)), level, stat: esc(runtime, lineText(runtime, runtime.state.M.perLevel.stat, runtime.deps.weaponMastery.perLevel(level))) })}</div>`;
}

/** The settlement result's line: levels gained per category. '' when none rose. */
export function settlementLine(runtime, gains) {
    if (!Array.isArray(gains) || !gains.length) return '';
    return `무기 숙련: ${gains.map(row => `${esc(runtime, name(runtime, row.id))} ${row.from} → <strong>${row.to}</strong>`).join(', ')}`;
}

export function announce(runtime, detail) {
    const step = detail.milestone ? (runtime.state.M.milestones[detail.id] || [])[detail.level / 10 - 1] : null;
    const opened = step ? (0, runtime.deps._t)(' 특전이 열렸습니다: {step}', { step: stepText(runtime, step) }) : '';
    (0, runtime.deps.addLog)((0, runtime.deps._t)('⚔️ {id} 숙련 {level}.{opened}', { id: esc(runtime, name(runtime, detail.id)), level: detail.level, opened: esc(runtime, opened) }), step ? 'loot-unique' : 'season-up', { toast: !!step });
}

export function esc(runtime, value) { return (0, runtime.deps.escapeHTML)(String(value)); }

export function name(runtime, id) { return runtime.deps.WEAPON_CATEGORIES[id].name; }

export function lineText(runtime, stat, val) { return `${(0, runtime.deps.getStatName)(stat)} ${val >= 0 ? '+' : ''}${(0, runtime.deps.formatValue)(stat, val)}`; }

export function stepText(runtime, step) { return step.map(([stat, val]) => lineText(runtime, stat, val)).join(', '); }

export function lineHtml(runtime, stat, val) { return `<span style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${esc(runtime, lineText(runtime, stat, val))}</span>`; }

export function stepHtml(runtime, step) { return step.map(([stat, val]) => lineHtml(runtime, stat, val)).join(', '); }

export function percent(runtime, rate) { return `${Math.round(rate * 100)}%p`; }
