export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)(String(text)); }

export function tone(runtime, item) { return runtime.deps.TALISMAN_RARITY_TONES[item.rarity] || runtime.deps.TALISMAN_RARITY_TONES.magic; }

export function owned(runtime, key) { return Math.floor(runtime.deps.game.currencies[key] || 0); }

export function shardName(runtime, key) { return (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name); }

export function lineTone(runtime, line, text) {
    if (line.kind !== 'condition') return (0, runtime.deps.getItemStatToneColor)(line.id);
    const def = runtime.deps.talismans.conditionDef(line.id);
    return def && def.stat ? (0, runtime.deps.getItemStatToneColor)(def.stat) : runtime.deps.statToneText.lineColor(text, '');
}

/** One effect row: li in the detail panel, a tooltip-line div in the hover card. The card's text is Galmuri14 15px: the panel's
* 12px rows blurred there (2026-10-24 사용자: "부적 툴팁 글씨도 흐릿하게 보임"), so the card takes tooltip rows like the seeds. */
export function effectRow(runtime, html, tooltip, cls = '', colour = '') {
    const style = colour ? ` style="color:${colour}"` : '';
    return tooltip ? `<div class="tooltip-line stump-tip-talisman ${cls}"${style}>${html}</div>` : `<li class="${cls}"${style}>${html}</li>`;
}

export function lineRow(runtime, line, tooltip = false) {
    const text = runtime.deps.talismans.describeLine(line);
    return effectRow(runtime, esc(runtime, text), tooltip, line.kind === 'condition' ? 'is-condition' : '', lineTone(runtime, line, text));
}

/** A line that does not work yet: grey with (비활성) (2026-10-09 사용자, the seeds' rule). */
export function offRow(runtime, text, tooltip = false) { return effectRow(runtime, (0, runtime.deps._t)('{text} (비활성)', { text: esc(runtime, text) }), tooltip, 'is-off'); }

/** What the board multiplies a working talisman's lines by (js/talisman-effects.js evaluate): its cell's graft with the ancient
* seeds beside it, and a repulsion's +25%. The lines show these values, as the seeds show theirs (2026-10-20: 왕좌의 창끝 on a
* rank 5 cell showed +18 and gave 27). */
export function boardMul(runtime, item, cell) {
    return runtime.deps.stumpBox.graftMultiplier(runtime.deps.game.stumpBox, cell) * (runtime.deps.talismanEffects.summarize().amplified.has(item.id) ? 1.25 : 1);
}

export function linesHtml(runtime, item, active, mul, tooltip) {
    const moment = item.special === 'moment' ? (0, runtime.deps._t)('보스에게 주는 최종 피해 +{moment}%, 생명력 5% 이하 보스 처형', { moment: item.moment }) : '';
    const rows = active ? item.lines.map(line => lineRow(runtime, scaledLine(runtime, line, mul), tooltip)) : item.lines.map(line => offRow(runtime, runtime.deps.talismans.describeLine(line), tooltip));
    if (moment) rows.push(active ? effectRow(runtime, moment, tooltip, 'is-condition', (0, runtime.deps.getItemStatToneColor)('bossDamagePct')) : offRow(runtime, moment, tooltip));
    if (!rows.length) return '';
    return tooltip ? rows.join('') : `<ul class="stump-talisman-lines">${rows.join('')}</ul>`;
}

/** Its lines work while it is awake on the board and not cancelled by a repulsion. */
export function isActive(runtime, item, cell) {
    return cell >= 0 && runtime.deps.stumpBox.isMature(item) && !runtime.deps.talismanEffects.summarize().suppressed.has(item.id);
}

/** Only what changes the talisman's effect on the board: cancelled or amplified by a repulsion. */
export function stateLine(runtime, item, cell, tooltip) {
    const summary = runtime.deps.talismanEffects.summarize();
    if (cell < 0 || !runtime.deps.stumpBox.isMature(item)) return '';
    const tag = tooltip ? 'div' : 'p', cls = tooltip ? 'tooltip-line stump-tip-status' : 'stump-status';
    if (summary.suppressed.has(item.id)) return `${(0, runtime.deps._t)('<{tag} class="{cls} is-bad">비활성화: 척력 인접', { tag, cls })}</${tag}>`;
    return summary.amplified.has(item.id) ? `${(0, runtime.deps._t)('<{tag} class="{cls} is-good">척력으로 효과 +25%', { tag, cls })}</${tag}>` : '';
}

export function toolsHtml(runtime, item, cell) {
    const buttons = [];
    if (runtime.deps.talismans.isDirectional(item)) {
        buttons.push(`<button type="button" data-stump-action="talisman-turn">표식 돌리기, 지금 ${runtime.deps.talismans.directionName(item.dir)}</button>`);
    }
    const wax = runtime.deps.talismans.waxPreview(item);
    if (wax) {
        buttons.push(`<button type="button" data-stump-action="talisman-wax"${owned(runtime, 'beeswax') > 0 ? '' : ' disabled'}>`
                + `${(0, runtime.deps._t)('밀랍 바르기 → {id} +{id2}, 밀랍 {value}', { id: esc(runtime, (0, runtime.deps.getStatName)(wax.id)), id2: esc(runtime, (0, runtime.deps.formatValue)(wax.id, wax.value)), value: owned(runtime, 'beeswax') })}</button>`);
    }
    if (cell < 0) buttons.push(`<button type="button" data-stump-action="talisman-discard"${item.locked ? ' disabled' : ''}>버리기</button>`);
    return buttons.length ? `<div class="stump-actions">${buttons.join('')}</div>` : '';
}

/** Detail body for a selected talisman; the stump screen adds the head, growth bar and move buttons. */
export function detailHtml(runtime, item, cell) {
    return bodyHtml(runtime, item, cell, false) + toolsHtml(runtime, item, cell);
}

/** A unique talisman's own effect: free text, its keywords and numbers in the stat colours (grey while it does not work). */
export function uniqueEffectHtml(runtime, item, active, tooltip) {
    if (!item.uniqueEffect) return '';
    const tag = tooltip ? 'div' : 'p', cls = tooltip ? 'tooltip-line stump-tip-talisman' : 'stump-yield';
    return active ? `<${tag} class="${cls}">${runtime.deps.statToneText.html((0, runtime.deps._t)(item.uniqueEffect))}</${tag}>` : `${(0, runtime.deps._t)('<{tag} class="{cls} is-off">{uniqueEffect} (비활성)', { tag, cls, uniqueEffect: esc(runtime, item.uniqueEffect) })}</${tag}>`;
}

/** A talisman's rarity, effects and state: p and li rows in the detail panel, tooltip rows in the hover card. */
export function bodyHtml(runtime, item, cell, tooltip) {
    const active = isActive(runtime, item, cell), label = (0, runtime.deps._t)('{RARITY_LABELS} 부적', { RARITY_LABELS: runtime.state.RARITY_LABELS[item.rarity] });
    const rarity = tooltip ? `<div class="tooltip-line" style="color:${tone(runtime, item)}">${label}</div>`
        : `<p class="stump-talisman-rarity" style="--stump-tone:${tone(runtime, item)}">${label}</p>`;
    return rarity + uniqueEffectHtml(runtime, item, active, tooltip) + linesHtml(runtime, item, active, active ? boardMul(runtime, item, cell) : 1, tooltip) + stateLine(runtime, item, cell, tooltip);
}

/** Hover card body for a talisman without the buttons the detail panel adds. */
export function tooltipHtml(runtime, item, cell) { return bodyHtml(runtime, item, cell, true); }

export function statRow(runtime, stat, value) {
    return `<li style="color:${(0, runtime.deps.getItemStatToneColor)(stat)}">${esc(runtime, (0, runtime.deps.getStatName)(stat))} ${value >= 0 ? '+' : '−'}${esc(runtime, (0, runtime.deps.formatValue)(stat, Math.abs(value)))}</li>`;
}

/** What the awake talismans on the board add up to (empty when none are awake). */
export function summaryHtml(runtime) {
    const summary = runtime.deps.talismanEffects.summarize();
    const rows = Object.keys(summary.stats).filter(stat => stat !== 'cosmosLightningVariance').map(stat => statRow(runtime, stat, summary.stats[stat]))
        .concat(summary.conditions.map(line => lineRow(runtime, { kind: 'condition', id: line.id, value: line.value })));
    if (summary.bossFinalDmgBonusPct > 0) rows.push(`<li class="is-condition" style="color:${(0, runtime.deps.getItemStatToneColor)('bossDamagePct')}">보스 최종 피해 +${summary.bossFinalDmgBonusPct}%, 생명력 5% 이하 보스 처형</li>`);
    if (summary.stats.cosmosLightningVariance > 0) rows.push(`<li class="is-condition" style="color:${(0, runtime.deps.getItemStatToneColor)('lightPctDmg')}">번개 피해가 타격마다 0.8~1.5배</li>`);
    return rows.length ? `<h4 class="stump-talisman-title">${(0, runtime.deps._t)('깨어난 부적')}</h4><ul class="stump-stats">${rows.join('')}</ul>` : '';
}

export function shardCard(runtime, key) {
    const rule = runtime.deps.TALISMAN_UNSEAL_RULES[key], have = owned(runtime, key), ready = have >= rule.cost;
    return `<div class="stump-shard-card${ready ? ' is-ready' : ''}" style="--shard-tone:${shardTone(runtime, key)}">`
        + `<img src="assets/items/stump-pixel-v1/sealed-${runtime.state.SHARD_RARITY[key] || 'magic'}.png" alt="" draggable="false">`
        + `<strong>${esc(runtime, shardName(runtime, key))}</strong><span class="stump-shard-count">${(0, runtime.deps._t)('보유')} <b>${have}</b></span>`
        + `<small>${(0, runtime.deps._t)('옵션 {lines}, 고유 {uniqueChance}', { lines: linesText(runtime, rule.lines), uniqueChance: chanceText(runtime, rule.uniqueChance) })}</small>`
        + `<button type="button" data-stump-action="talisman-unseal" data-source="${key}"${ready ? '' : ' disabled'}>${(0, runtime.deps._t)('풀기')}</button></div>`;
}

export function exchangeRow(runtime, row, index) {
    const have = owned(runtime, row.from), ready = have >= row.cost, fill = Math.min(100, Math.floor(have / row.cost * 100));
    return `<div class="stump-exchange-row${ready ? ' is-ready' : ''}">`
        + `<span class="stump-exchange-from" style="--shard-tone:${shardTone(runtime, row.from)}">${esc(runtime, shardName(runtime, row.from))} ${row.cost}</span>`
        + `<span class="stump-exchange-arrow" aria-hidden="true">→</span>`
        + `<span class="stump-exchange-to" style="--shard-tone:${shardTone(runtime, row.to)}">${esc(runtime, shardName(runtime, row.to))} 1</span>`
        + `<span class="stump-exchange-bar" style="--shard-tone:${shardTone(runtime, row.from)}"><i style="width:${fill}%"></i></span><small>${have}/${row.cost}</small>`
        + `<button type="button" data-stump-action="talisman-exchange" data-index="${index}"${ready ? '' : ' disabled'}>${(0, runtime.deps._t)('교환')}</button></div>`;
}

/** 부적 풀기와 편린 교환 (해금 목록의 '부적'을 연 뒤, 그루터기 함의 부적 탭). */
export function unsealHtml(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked('talisman')) return '';
    return `<h3>${(0, runtime.deps._t)('부적 풀기')} <small>${(0, runtime.deps._t)('편린: 고대 미궁에서 획득')}</small></h3>`
        + `<div class="stump-shard-cards">${Object.keys(runtime.deps.TALISMAN_UNSEAL_RULES).map(runtime.handlers.shardCard).join('')}</div>`
        + `<h3>${(0, runtime.deps._t)('편린 교환')}</h3><div class="stump-exchange">${runtime.deps.TALISMAN_SHARD_EXCHANGE.map(runtime.handlers.exchangeRow).join('')}</div>`;
}

export function scaledLine(runtime, line, mul) { return { ...line, value: Math.round(line.value * mul * 100) / 100 }; }

export function shardTone(runtime, key) { return runtime.deps.TALISMAN_RARITY_TONES[runtime.state.SHARD_RARITY[key]] || runtime.deps.TALISMAN_RARITY_TONES.magic; }

export function linesText(runtime, range) { return range[0] === range[1] ? (0, runtime.deps._t)('{range}줄', { range: range[0] }) : (0, runtime.deps._t)('{range}~{range2}줄', { range: range[0], range2: range[1] }); }

export function chanceText(runtime, chance) { return `${Math.round(chance * 1000) / 10}%`; }
