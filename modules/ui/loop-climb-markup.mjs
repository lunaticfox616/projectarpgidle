import { gains, ensureClimbState } from './../domain/loop-climb-summary.mjs';

/** The loop gates as rows: the chaos depth, and from loop 31 the cosmos planet (either one opens the loop). */
export function gateRows(runtime) {
    const cap = (0, runtime.deps.getSeasonAbyssDepthCap)(season(runtime)), rows = [{ ok: (0, runtime.deps.hasCurrentLoopChaosRequirementClear)(season(runtime)), text: (0, runtime.deps._t)('{value} {cap} 클리어', { value: cap > 20 ? (0, runtime.deps._t)('혼돈 심화') : (0, runtime.deps._t)('혼돈'), cap }) }];
    if (season(runtime) >= runtime.deps.LOOP_GATE_ALT_START_SEASON) rows.push({ ok: (0, runtime.deps.hasCurrentLoopCosmosRequirementClear)(season(runtime)), text: (0, runtime.deps._t)('우주계 {value} 행성 돌파', { value: runtime.deps.LOOP_GATE_ALT_COSMOS_PLANET_NAME }) });
    return rows;
}

export function gateHtml(runtime) {
    const rows = gateRows(runtime);
    const list = rows.map(row => `<li class="${row.ok ? 'is-on' : 'is-off'}"><i></i>${esc(runtime, row.text)}</li>`).join('');
    return `<div class="climb-gates"><span>${(0, runtime.deps._t)('루프 조건{value}', { value: rows.length > 1 ? (0, runtime.deps._t)(' (하나만)') : '' })}</span><ul>${list}</ul></div>`;
}

export function buttonsHtml(runtime, ready) {
    const loops = season(runtime) >= 31
        ? `<button type="button" onclick="chooseLoopAdvancePath('chaos')" ${runtime.deps.loopSettlementUi.resetButtonAttr((0, runtime.deps.hasCurrentLoopChaosRequirementClear)(season(runtime)))}>${(0, runtime.deps._t)('혼돈 루프')}</button>`
        + `<button type="button" onclick="chooseLoopAdvancePath('cosmos')" ${runtime.deps.loopSettlementUi.resetButtonAttr((0, runtime.deps.hasCurrentLoopCosmosRequirementClear)(season(runtime)))}>${(0, runtime.deps._t)('우주계 루프')}</button>`
        : `<button type="button" onclick="triggerSeasonReset()" ${runtime.deps.loopSettlementUi.resetButtonAttr(ready)}>${(0, runtime.deps._t)('지금 즉시 루프')}</button>`;
    const journey = runtime.deps.EXPLORATION_REGIONS.guides['outside-chaos'];
    const next = runtime.deps.game.chaosRealm.unlocked ? '' : `<p>${esc(runtime, (0, runtime.deps._t)(journey.notice))}</p>`;
    return `<div class="climb-buttons">${loops}<button type="button" class="ominous-entry-btn" data-exploration-departure onclick="enterOutsideChaos()"${ready ? '' : ' disabled'}>${(0, runtime.deps._t)('혼돈 밖 진입')}</button></div>${next}${runtime.deps.loopSettlementUi.stallWarningHtml()}`;
}

export function reentryHtml(runtime, open) {
    const top = Math.max(21, Math.floor(runtime.deps.game.abyssEndlessDepth || 20));
    return `<div class="climb-reentry"><span>${(0, runtime.deps._t)('기록된 층 다시 입장')}</span><b>${(0, runtime.deps._t)('21 ~ {top}층', { top })}</b>`
        + `<button type="button" data-exploration-departure onclick="enterDeepChaosPrompt()"${open ? '' : ' disabled'}>${open ? (0, runtime.deps._t)('층 골라 입장') : (0, runtime.deps._t)('혼돈 20 클리어 필요')}</button></div>`;
}

export function gainsHtml(runtime) {
    const chips = gains(runtime).map(([label, value, unit]) => `<span class="climb-gain${value > 0 ? ' is-up' : ''}"><b>+${value}${unit ? (0, runtime.deps._t)(unit) : ''}</b><small>${(0, runtime.deps._t)(label)}</small></span>`).join('');
    return `<div class="climb-gains"><span>${(0, runtime.deps._t)('다음 루프 예상 획득')}</span><div>${chips}</div></div>`;
}

export function growthHtml(runtime) {
    const stats = runtime.deps.game.loopDeepStats || {}, tone = def => (0, runtime.deps.getItemStatToneColor)(def.stat || 'pctDmg'), points = runtime.deps.game.loopDeepPoints || 0;
    const buttons = runtime.deps.LOOP_DEEP_STATS.map(def => `<button type="button" class="climb-stat" style="--stat-tone:${tone(def)}" onclick="allocateLoopDeepStat('${def.key}')">`
            + `<strong>${esc(runtime, (0, runtime.deps._t)(def.label))}</strong><b>Lv.${stats[def.key] || 0}</b><small>${(0, runtime.deps._t)('합계 +{def}, 레벨당 +{per}{unit}', { def: (0, runtime.deps.formatLoopDeepValue)(def, stats[def.key]), per: def.per, unit: def.unit })}</small>`
            + `<em>${(0, runtime.deps._t)('비용 {key}', { key: (0, runtime.deps.getLoopDeepStatCost)(def.key) })}</em></button>`).join('');
    return `<details id="loop-deep-growth" class="progression-workbench climb-growth" ${runtime.deps.contentUnlockUi.lockAttribute('deepTree')}><summary>${(0, runtime.deps._t)('영구 강화')}<b>${(0, runtime.deps._t)('보유 포인트 {points}', { points })}</b></summary>`
        + `<div class="climb-stats">${buttons}</div></details>`;
}

export function render(runtime) {
    const panel = runtime.deps.document.getElementById('ui-loop10-panel'), section = runtime.deps.document.getElementById('ui-loop10-section');
    if (!panel) return;
    const open = season(runtime) >= 10;
    if (section) section.style.display = open ? 'block' : 'none';
    if (!open) return;
    ensureClimbState(runtime);
    const ready = (0, runtime.deps.hasCurrentLoopAbyssRequirementClear)(season(runtime)), deepOpen = (0, runtime.deps.hasCurrentLoopChaos20Clear)();
    (0, runtime.deps.updateGamePanelMarkup)(panel, `<div class="climb-head"><span class="climb-emblem" aria-hidden="true">∞</span><div><small>${(0, runtime.deps._t)('현재 심화층')}</small><b>${Math.floor(runtime.deps.game.abyssEndlessDepth || 20)}</b></div>`
            + `<div><small>${(0, runtime.deps._t)('심화 루프 포인트')}</small><b class="is-points">${runtime.deps.game.loopDeepPoints || 0}</b></div></div>`
            + `${gateHtml(runtime)}${buttonsHtml(runtime, ready)}${reentryHtml(runtime, deepOpen)}${gainsHtml(runtime)}${growthHtml(runtime)}`);
}

export function esc(runtime, value) { return (0, runtime.deps.escapeHTML)(String(value ?? '')); }

export function season(runtime) { return Math.max(1, Math.floor(runtime.deps.game.season || 1)); }
