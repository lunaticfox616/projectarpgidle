// 무기 숙련 보기(js/weapon-mastery.js): 기록 창의 숙련 칸, 레벨이 오를 때의 알림, 무기 툴팁 한 줄, 방치 정산 결과 한 줄.
const weaponMasteryUi = (() => {
    const M = WEAPON_MASTERY;
    const esc = value => escapeHTML(String(value));
    const name = id => WEAPON_CATEGORIES[id].name;
    const lineText = (stat, val) => `${getStatName(stat)} ${val >= 0 ? '+' : ''}${formatValue(stat, val)}`;
    const stepText = step => step.map(([stat, val]) => lineText(stat, val)).join(', ');
    const percent = rate => `${Math.round(rate * 100)}%p`;
    /** The next milestone of a category at a level ('' at the top). */
    function nextStepText(id, level) {
        const index = Math.floor(level / 10);
        const step = (M.milestones[id] || [])[index];
        return step ? `다음 특전 레벨 ${(index + 1) * 10}: ${stepText(step)}` : '모든 특전을 열었습니다.';
    }
    function cardHtml(id, wielded) {
        const row = weaponMastery.progress(game, id), fill = row.need ? Math.floor(row.into / row.need * 100) : 100;
        const effects = [row.level > 1 ? lineText(M.perLevel.stat, weaponMastery.perLevel(row.level)) : '',
            ...weaponMastery.opened(id, row.level).map(stepText)].filter(Boolean).join(', ');
        return `<div class="mastery-card${id === wielded ? ' is-wielded' : ''}"><div class="mastery-card-head"><strong>${esc(name(id))}</strong>
            <b>Lv.${row.level}</b>${id === wielded ? '<em>들고 있음</em>' : ''}</div>
            <div class="mastery-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${fill}"><i style="width:${fill}%"></i></div>
            <small>${esc(effects || '레벨 2부터 피해가 오릅니다.')}</small>
            <small class="mastery-next">${esc(nextStepText(id, row.level))}</small></div>`;
    }
    /** The records window's mastery section. */
    function sectionHtml() {
        const total = weaponMastery.total(game), next = M.totalSteps.find(step => total < step), wielded = weaponMastery.wielded(game);
        return `<details class="records-fold records-mastery" open><summary>무기 숙련<span>합계 ${total}, 방치 효율 +${percent(weaponMastery.offline(game))}</span></summary>
            <div class="records-fold-body"><div class="mastery-grid">${weaponMastery.ids.map(id => cardHtml(id, wielded)).join('')}</div>
            <p class="records-fold-hint">들고 있는 무기로 잡을 때마다 오르고 루프를 넘어 남습니다. 합계 ${M.totalSteps.join(', ')}마다 방치 효율 +1%p${next ? ` (다음 ${next})` : ''}.</p></div></details>`;
    }
    /** The item tooltip's mastery line for a weapon: its category's level and what it gives. '' for other items. */
    function tooltipHtml(item) {
        const id = item && item.slot === '무기' ? getWeaponCategoryId(item) : null;
        if (!id) return '';
        const level = weaponMastery.level(game, id);
        return `<div class="tooltip-line" style="margin-top:6px; color:#e8c27a;">⚔️ ${esc(name(id))} 숙련 ${level}: ${esc(lineText(M.perLevel.stat, weaponMastery.perLevel(level)))}</div>`;
    }
    /** The settlement result's line: levels gained per category. '' when none rose. */
    function settlementLine(gains) {
        if (!Array.isArray(gains) || !gains.length) return '';
        return `무기 숙련: ${gains.map(row => `${esc(name(row.id))} ${row.from} → <strong>${row.to}</strong>`).join(', ')}`;
    }
    function announce(detail) {
        const step = detail.milestone ? (M.milestones[detail.id] || [])[detail.level / 10 - 1] : null;
        const opened = step ? ` 특전이 열렸습니다: ${stepText(step)}` : '';
        addLog(`⚔️ ${esc(name(detail.id))} 숙련 ${detail.level}.${esc(opened)}`, step ? 'loot-unique' : 'season-up', { toast: !!step });
    }
    window.addEventListener('project-idle:weapon-mastery', event => announce(event.detail || {}));
    return Object.freeze({ sectionHtml, tooltipHtml, settlementLine });
})();
safeExposeGlobals({ weaponMasteryUi });
