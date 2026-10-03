// 그루터기 함의 부적 화면 조각(2026-09-30): 고른 부적의 설명(줄 · 고유 효과 · 척력 · 표식 방향 · 밀랍 · 버리기),
// 깨어난 부적 합계, 봉인 풀기 · 편린 교환. 판 · 보관함 · 선택 · 다시 그리기는 stump-box-ui.js가 맡고, 여기는 HTML 조각과
// 동작만 준다(동작은 바뀐 것이 있으면 참을 돌려준다). 규칙은 talismans.js, 이웃 효과는 talisman-effects.js.
const stumpTalismanUi = (() => {
    const RARITY_LABELS = { magic: '마법', rare: '희귀', unique: '고유' };

    function esc(text) { return escapeHTML(String(text)); }
    function tone(item) { return TALISMAN_RARITY_TONES[item.rarity] || TALISMAN_RARITY_TONES.magic; }
    function owned(key) { return Math.floor(game.currencies[key] || 0); }
    function shardName(key) { return ORB_DB[key].name; }

    function linesHtml(item) {
        const rows = item.lines.map(line => `<li class="${line.kind === 'condition' ? 'is-condition' : ''}">${esc(talismans.describeLine(line))}</li>`);
        if (item.special === 'moment') rows.push(`<li class="is-condition">보스에게 주는 최종 피해 +${item.moment}% · 생명력 5% 이하 보스 처형</li>`);
        return rows.length ? `<ul class="stump-talisman-lines">${rows.join('')}</ul>` : '';
    }

    function stateLine(item, cell) {
        const summary = talismanEffects.summarize();
        if (cell < 0) return '<p class="stump-status">보관함에 있습니다 · 판에 놓아야 깨어납니다.</p>';
        if (!stumpBox.isMature(item)) return '<p class="stump-status">판 위에서 처치할 때마다 깨어납니다. 새 루프에는 다시 잠듭니다.</p>';
        if (summary.suppressed.has(item.id)) return '<p class="stump-status is-bad">척력과 맞닿아 효과가 없습니다.</p>';
        if (summary.amplified.has(item.id)) return '<p class="stump-status is-good">깨어남 · 척력으로 효과 +25%</p>';
        return '<p class="stump-status is-good">깨어나 효과를 주고 있습니다. 새 루프에 다시 잠듭니다.</p>';
    }

    function toolsHtml(item, cell) {
        const buttons = [];
        if (talismans.isDirectional(item)) {
            buttons.push(`<button type="button" data-stump-action="talisman-turn">표식 돌리기 · 지금 ${talismans.directionName(item.dir)}</button>`);
        }
        const wax = talismans.waxPreview(item);
        if (wax) {
            buttons.push(`<button type="button" data-stump-action="talisman-wax"${owned('beeswax') > 0 ? '' : ' disabled'}>`
                + `밀랍 바르기 → ${esc(getStatName(wax.id))} +${esc(formatValue(wax.id, wax.value))} · 밀랍 ${owned('beeswax')}</button>`);
        }
        if (cell < 0) buttons.push('<button type="button" data-stump-action="talisman-discard">버리기</button>');
        return buttons.length ? `<div class="stump-actions">${buttons.join('')}</div>` : '';
    }

    /** Detail body for a selected talisman; the stump screen adds the head, growth bar and move buttons. */
    function detailHtml(item, cell) {
        const effect = item.uniqueEffect ? `<p class="stump-yield">${esc(item.uniqueEffect)}</p>` : '';
        return `<p class="stump-talisman-rarity" style="--stump-tone:${tone(item)}">${RARITY_LABELS[item.rarity]} 부적</p>`
            + effect + linesHtml(item) + stateLine(item, cell) + toolsHtml(item, cell);
    }

    function statRow(stat, value) {
        return `<li>${esc(getStatName(stat))} ${value >= 0 ? '+' : '−'}${esc(formatValue(stat, Math.abs(value)))}</li>`;
    }

    /** What the awake talismans on the board add up to (empty when none are awake). */
    function summaryHtml() {
        const summary = talismanEffects.summarize();
        const rows = Object.keys(summary.stats).filter(stat => stat !== 'cosmosLightningVariance').map(stat => statRow(stat, summary.stats[stat]))
            .concat(summary.conditions.map(line => `<li class="is-condition">${esc(talismans.describeLine({ kind: 'condition', id: line.id, value: line.value }))}</li>`));
        if (summary.bossFinalDmgBonusPct > 0) rows.push(`<li class="is-condition">보스 최종 피해 +${summary.bossFinalDmgBonusPct}% · 생명력 5% 이하 보스 처형</li>`);
        if (summary.stats.cosmosLightningVariance > 0) rows.push('<li class="is-condition">번개 피해가 타격마다 0.8~1.5배</li>');
        return rows.length ? `<h4 class="stump-talisman-title">깨어난 부적</h4><ul class="stump-stats">${rows.join('')}</ul>` : '';
    }

    function unsealButton(key) {
        const ready = owned(key) >= TALISMAN_UNSEAL_RULES[key].cost;
        return `<button type="button" data-stump-action="talisman-unseal" data-source="${key}"${ready ? '' : ' disabled'}>${shardName(key)} 풀기 (${owned(key)})</button>`;
    }

    function exchangeButton(row, index) {
        const ready = owned(row.from) >= row.cost;
        return `<button type="button" data-stump-action="talisman-exchange" data-index="${index}"${ready ? '' : ' disabled'}>`
            + `${shardName(row.from)} ${row.cost} → ${shardName(row.to)} 1</button>`;
    }

    /** 봉인 풀기 · 편린 교환 (해금 목록의 '부적'을 연 뒤). */
    function unsealHtml() {
        if (!contentProgression.isUnlocked('talisman')) return '';
        return '<h3>부적 풀기</h3><p class="stump-hint">봉인편린 하나로 부적 하나를 풉니다. 편린은 고대 미궁에서 떨어집니다.</p>'
            + `<div class="stump-talisman-unseal">${Object.keys(TALISMAN_UNSEAL_RULES).map(unsealButton).join('')}</div>`
            + `<div class="stump-talisman-unseal">${TALISMAN_SHARD_EXCHANGE.map(exchangeButton).join('')}</div>`;
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

    return Object.freeze({ tone, detailHtml, summaryHtml, unsealHtml, unseal, exchange, wax, turn, discard });
})();
safeExposeGlobals({ stumpTalismanUi });
