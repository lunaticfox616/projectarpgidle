/** The loadout fields with this gem put on. replaced: the gem it takes the place of (js/gem-slot-dialog-ui.js); a summon
* gem then keeps the replaced one's count. Without it the gem is added: once for a summon gem. */
export function wornWith(runtime, kind, name, replaced, saved) {
    const keep = list => list.filter(gem => gem !== replaced);
    if (kind === 'support') return { equippedSupports: keep(saved.equippedSupports).filter(gem => gem !== name).concat(name) };
    if (kind === 'mobility') return { mobilitySkill: name };
    if (kind !== 'summon') return { activeSkill: name };
    const counts = { ...saved.summonSkillCounts, [name]: saved.summonSkillCounts[replaced] || 1 };
    if (replaced !== name) delete counts[replaced];
    return { equippedSummonSkills: keep(saved.equippedSummonSkills).concat(name), summonSkillCounts: counts };
}

/** Stats with this gem put on, against the current ones: the main attack swapped, a mobility gem worn, a summon or
* support gem added (or put in place of `replaced`). The build is restored exactly afterwards (as the item tooltip does). */
export function previewStats(runtime, type, name, replaced) {
    const saved = { activeSkill: runtime.deps.game.activeSkill, mobilitySkill: runtime.deps.game.mobilitySkill, equippedSupports: (runtime.deps.game.equippedSupports || []).slice(),
        equippedSummonSkills: (runtime.deps.game.equippedSummonSkills || []).slice(), summonSkillCounts: { ...(runtime.deps.game.summonSkillCounts || {}) } };
    return (0, runtime.deps.previewBuildStats)(copy => Object.assign(copy, wornWith(runtime, type === 'support' ? 'support' : runtime.deps.skillGemBoardUi.kindOf(name), name, replaced, saved)));
}

export function compareRow(runtime, label, before, after) {
    const diff = after - before;
    const pct = before > 0 ? ` ${diff >= 0 ? '▲' : '▼'}${Math.abs(Math.round(diff / before * 100))}%` : '';
    const tone = Math.abs(diff) < 1 ? '' : (diff > 0 ? 'is-up' : 'is-down');
    return `<span>${label}</span><span class="gem-compare-now">${runtime.deps.COMPARE_STAT_META.dps.format(before)}</span><span aria-hidden="true">→</span><span class="gem-compare-next ${tone}">${runtime.deps.COMPARE_STAT_META.dps.format(after)}${tone ? pct : ''}</span>`;
}

/** 부채꼴(연발 사격)의 DPS는 한 대상 기준이라, 옆 화살까지 모두 맞을 때의 값을 한 줄 더 보인다(2026-10-07). */
export function packRows(runtime, before, after) {
    const packOf = stats => Math.max(stats.dps || 0, stats.packDps || 0);
    const spreads = stats => packOf(stats) > (stats.dps || 0) * 1.01;
    return spreads(before) || spreads(after) ? [compareRow(runtime, '무리 최대', packOf(before), packOf(after))] : [];
}

/** "장착하면" / "바꾸면" block as HTML: DPS (and summon DPS when either side has one) before → after.
* @param {string} [replaced] the gem this one takes the place of (the slot dialog's tooltip, js/gem-slot-dialog-ui.js) */
export function compareHtml(runtime, type, name, replaced) {
    const { before, after } = previewStats(runtime, type, name, replaced);
    const rows = [compareRow(runtime, '전체 DPS', totalDps(runtime, before), totalDps(runtime, after))].concat(packRows(runtime, before, after));
    if ((before.summonDps || 0) > 0 || (after.summonDps || 0) > 0) rows.push(compareRow(runtime, '소환 DPS', before.summonDps || 0, after.summonDps || 0));
    return `<div class="gem-compare"><b>${replaced ? (0, runtime.deps._t)('바꾸면') : (0, runtime.deps._t)('장착하면')}</b><div class="gem-compare-grid">${rows.join('')}</div></div>`;
}

/** The detail's compare block, for a gem not worn yet. */
export function comparison(runtime, type, name, anchor) {
    if (anchor.matches('.active, .equipment-blocked')) return null;
    const holder = runtime.deps.document.createElement('div');
    holder.innerHTML = compareHtml(runtime, type, name);
    return holder.firstElementChild;
}

export function totalDps(runtime, stats) { return stats.totalDps ?? stats.dps ?? 0; }
