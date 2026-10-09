// 그루터기 함의 부적 화면 조각(2026-09-30): 고른 부적의 설명(줄 · 고유 효과 · 척력 · 표식 방향 · 밀랍 · 버리기),
// 깨어난 부적 합계, 봉인 풀기 · 편린 교환. 판 · 보관함 · 선택 · 다시 그리기는 stump-box-ui.js가 맡고, 여기는 HTML 조각과
// 동작만 준다(동작은 바뀐 것이 있으면 참을 돌려준다). 규칙은 talismans.js, 이웃 효과는 talisman-effects.js.
const stumpTalismanUi = (() => {
    const RARITY_LABELS = { magic: '마법', rare: '희귀', unique: '고유' };

    function esc(text) { return escapeHTML(String(text)); }
    function tone(item) { return TALISMAN_RARITY_TONES[item.rarity] || TALISMAN_RARITY_TONES.magic; }
    function owned(key) { return Math.floor(game.currencies[key] || 0); }
    function shardName(key) { return ORB_DB[key].name; }

    // 줄 색(2026-10-06): 장비 옵션처럼 줄마다 그 능력치의 색. 조건부 줄은 그 줄이 올리는 능력치(없으면 글의 첫 핵심어) 색.
    function lineTone(line, text) {
        if (line.kind !== 'condition') return getItemStatToneColor(line.id);
        const def = talismans.conditionDef(line.id);
        return def && def.stat ? getItemStatToneColor(def.stat) : statToneText.lineColor(text, '');
    }
    function lineRow(line) {
        const text = talismans.describeLine(line), colour = lineTone(line, text);
        return `<li class="${line.kind === 'condition' ? 'is-condition' : ''}"${colour ? ` style="color:${colour}"` : ''}>${esc(text)}</li>`;
    }
    /** A line that does not work yet: grey with (비활성) (2026-10-09 사용자, the seeds' rule). */
    function offRow(text) { return `<li class="is-off">${esc(text)} (비활성)</li>`; }
    function linesHtml(item, active) {
        const moment = item.special === 'moment' ? `보스에게 주는 최종 피해 +${item.moment}%, 생명력 5% 이하 보스 처형` : '';
        const rows = active ? item.lines.map(lineRow) : item.lines.map(line => offRow(talismans.describeLine(line)));
        if (moment) rows.push(active ? `<li class="is-condition" style="color:${getItemStatToneColor('bossDamagePct')}">${moment}</li>` : offRow(moment));
        return rows.length ? `<ul class="stump-talisman-lines">${rows.join('')}</ul>` : '';
    }
    /** Its lines work while it is awake on the board and not cancelled by a repulsion. */
    function isActive(item, cell) {
        return cell >= 0 && stumpBox.isMature(item) && !talismanEffects.summarize().suppressed.has(item.id);
    }

    /** Only what changes the talisman's effect on the board: cancelled or amplified by a repulsion. */
    function stateLine(item, cell) {
        const summary = talismanEffects.summarize();
        if (cell < 0 || !stumpBox.isMature(item)) return '';
        if (summary.suppressed.has(item.id)) return '<p class="stump-status is-bad">비활성화: 척력 인접</p>';
        return summary.amplified.has(item.id) ? '<p class="stump-status is-good">척력으로 효과 +25%</p>' : '';
    }

    function toolsHtml(item, cell) {
        const buttons = [];
        if (talismans.isDirectional(item)) {
            buttons.push(`<button type="button" data-stump-action="talisman-turn">표식 돌리기, 지금 ${talismans.directionName(item.dir)}</button>`);
        }
        const wax = talismans.waxPreview(item);
        if (wax) {
            buttons.push(`<button type="button" data-stump-action="talisman-wax"${owned('beeswax') > 0 ? '' : ' disabled'}>`
                + `밀랍 바르기 → ${esc(getStatName(wax.id))} +${esc(formatValue(wax.id, wax.value))}, 밀랍 ${owned('beeswax')}</button>`);
        }
        if (cell < 0) buttons.push('<button type="button" data-stump-action="talisman-discard">버리기</button>');
        return buttons.length ? `<div class="stump-actions">${buttons.join('')}</div>` : '';
    }

    /** Detail body for a selected talisman; the stump screen adds the head, growth bar and move buttons. */
    function detailHtml(item, cell) {
        return tooltipHtml(item, cell) + toolsHtml(item, cell);
    }

    /** A unique talisman's own effect: free text, its keywords and numbers in the stat colours (grey while it does not work). */
    function uniqueEffectHtml(item, active) {
        if (!item.uniqueEffect) return '';
        return active ? `<p class="stump-yield">${statToneText.html(item.uniqueEffect)}</p>` : `<p class="stump-yield is-off">${esc(item.uniqueEffect)} (비활성)</p>`;
    }

    /** Hover card body for a talisman (rarity, effects, state) without the buttons the detail panel adds. */
    function tooltipHtml(item, cell) {
        const active = isActive(item, cell);
        return `<p class="stump-talisman-rarity" style="--stump-tone:${tone(item)}">${RARITY_LABELS[item.rarity]} 부적</p>`
            + uniqueEffectHtml(item, active) + linesHtml(item, active) + stateLine(item, cell);
    }

    function statRow(stat, value) {
        return `<li style="color:${getItemStatToneColor(stat)}">${esc(getStatName(stat))} ${value >= 0 ? '+' : '−'}${esc(formatValue(stat, Math.abs(value)))}</li>`;
    }

    /** What the awake talismans on the board add up to (empty when none are awake). */
    function summaryHtml() {
        const summary = talismanEffects.summarize();
        const rows = Object.keys(summary.stats).filter(stat => stat !== 'cosmosLightningVariance').map(stat => statRow(stat, summary.stats[stat]))
            .concat(summary.conditions.map(line => lineRow({ kind: 'condition', id: line.id, value: line.value })));
        if (summary.bossFinalDmgBonusPct > 0) rows.push(`<li class="is-condition" style="color:${getItemStatToneColor('bossDamagePct')}">보스 최종 피해 +${summary.bossFinalDmgBonusPct}%, 생명력 5% 이하 보스 처형</li>`);
        if (summary.stats.cosmosLightningVariance > 0) rows.push(`<li class="is-condition" style="color:${getItemStatToneColor('lightPctDmg')}">번개 피해가 타격마다 0.8~1.5배</li>`);
        return rows.length ? `<h4 class="stump-talisman-title">깨어난 부적</h4><ul class="stump-stats">${rows.join('')}</ul>` : '';
    }

    // 부적 탭(2026-10-09 사용자 "너무 버튼밖에 없어서 이상해, 고급스럽게"): 편린마다 카드(잠든 부적 그림, 이름, 보유, 옵션 줄 수와 고유 확률,
    // 풀기), 편린 교환은 모은 정도가 보이는 줄. 편린 셋은 나오는 부적의 격(마법, 희귀, 고유)의 색과 그림을 쓴다.
    const SHARD_RARITY = Object.freeze({ sealShard: 'magic', strongSealShard: 'rare', radiantSealShard: 'unique' });
    const shardTone = key => TALISMAN_RARITY_TONES[SHARD_RARITY[key]] || TALISMAN_RARITY_TONES.magic;
    const linesText = range => (range[0] === range[1] ? `${range[0]}줄` : `${range[0]}~${range[1]}줄`);
    const chanceText = chance => `${Math.round(chance * 1000) / 10}%`;
    function shardCard(key) {
        const rule = TALISMAN_UNSEAL_RULES[key], have = owned(key), ready = have >= rule.cost;
        return `<div class="stump-shard-card${ready ? ' is-ready' : ''}" style="--shard-tone:${shardTone(key)}">`
            + `<img src="assets/px/stump/sealed-${SHARD_RARITY[key] || 'magic'}.png" alt="" draggable="false">`
            + `<strong>${esc(shardName(key))}</strong><span class="stump-shard-count">보유 <b>${have}</b></span>`
            + `<small>옵션 ${linesText(rule.lines)}, 고유 ${chanceText(rule.uniqueChance)}</small>`
            + `<button type="button" data-stump-action="talisman-unseal" data-source="${key}"${ready ? '' : ' disabled'}>풀기</button></div>`;
    }
    function exchangeRow(row, index) {
        const have = owned(row.from), ready = have >= row.cost, fill = Math.min(100, Math.floor(have / row.cost * 100));
        return `<div class="stump-exchange-row${ready ? ' is-ready' : ''}">`
            + `<span class="stump-exchange-from" style="--shard-tone:${shardTone(row.from)}">${esc(shardName(row.from))} ${row.cost}</span>`
            + `<span class="stump-exchange-arrow" aria-hidden="true">→</span>`
            + `<span class="stump-exchange-to" style="--shard-tone:${shardTone(row.to)}">${esc(shardName(row.to))} 1</span>`
            + `<span class="stump-exchange-bar" style="--shard-tone:${shardTone(row.from)}"><i style="width:${fill}%"></i></span><small>${have}/${row.cost}</small>`
            + `<button type="button" data-stump-action="talisman-exchange" data-index="${index}"${ready ? '' : ' disabled'}>교환</button></div>`;
    }

    /** 부적 풀기와 편린 교환 (해금 목록의 '부적'을 연 뒤, 그루터기 함의 부적 탭). */
    function unsealHtml() {
        if (!contentProgression.isUnlocked('talisman')) return '';
        return '<h3>부적 풀기 <small>편린: 고대 미궁에서 획득</small></h3>'
            + `<div class="stump-shard-cards">${Object.keys(TALISMAN_UNSEAL_RULES).map(shardCard).join('')}</div>`
            + `<h3>편린 교환</h3><div class="stump-exchange">${TALISMAN_SHARD_EXCHANGE.map(exchangeRow).join('')}</div>`;
    }

    function refuse(reason) {
        showGameToast(reason, { tone: 'warning' });
        return false;
    }

    /** @returns {?object} the new talisman item. */
    function unseal(source) {
        const result = talismans.unseal(source);
        if (!result.ok) return refuse(result.reason) || null;
        const item = result.item, text = item.lines.map(talismans.describeLine).join(', ') || item.uniqueEffect || '';
        addLog(`🧿 부적 풀기: [${item.name}] ${text}`, item.rarity === 'unique' ? 'loot-unique' : 'loot-rare');
        return item;
    }

    function exchange(index) {
        const result = talismans.exchange(index);
        return result.ok || refuse(result.reason);
    }

    function wax(id) {
        const result = talismans.wax(id);
        if (!result.ok) return refuse(result.reason);
        addLog(`🐝 부적 밀랍: ${talismans.describeLine(result.line)}`, 'loot-rare');
        return true;
    }

    function turn(id) {
        return talismans.turn(id) || refuse('지금은 표식을 돌릴 수 없습니다.');
    }

    async function discard(id) {
        const item = stumpBox.itemById(game, id);
        if (!item || item.family !== 'talisman') return false;
        const message = `[${item.name}]을(를) 버립니다. 되돌릴 수 없습니다.`;
        const options = { title: '부적 버리기', tone: 'danger', confirmLabel: '버리기', cancelLabel: '취소' };
        if (item.rarity === 'unique' && !await requestGameConfirmation(message, options)) return false;
        return stumpBox.discard(game, id);
    }

    return Object.freeze({ tone, detailHtml, tooltipHtml, summaryHtml, unsealHtml, unseal, exchange, wax, turn, discard });
})();
safeExposeGlobals({ stumpTalismanUi });
