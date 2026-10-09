// 그루터기 함 16번 화면 조각(2026-10-08): 다 자라는 순간의 굴림(추가 줄, 황금, 풍작, 만개), 불씨의 흉터(포식), 봉인 칸 단추,
// 일괄 거름 사용과 일괄 버리기, 부적 도감, 루프 전환 알림(포식과 번식). 그리기와 클릭은 js/stump-box-ui.js가 부르고,
// 규칙과 계산은 js/stump-box.js, 수치는 data/stump-box.js.
// 2026-10-09 사용자 "꼭 필요한 정보만": 아직 효과가 없는 줄은 회색 "(비활성)", 흉터의 먹은 횟수와 긴 설명, 일괄 거름의
// "좋은 것 3개와 황금은 남김"은 뺐다. 일괄 단추는 누르면 무엇을 쓰는지 먼저 보여 준다.
const stumpRipeningUi = (() => {
    function esc(text) { return escapeHTML(String(text)); }
    function number(value) { return String(Math.round(value * 10) / 10); }
    /** A stat line in the box's own words (js/stump-box.js lineText; the public profile uses the same one). */
    function lineText(stat, value) { return stumpBox.lineText(stat, value); }
    function isGolden(item) { return !!item && stumpBox.goldenMul(item) > 1; }

    // ── 다 자란 씨앗과 수액: 추가 줄과 표식 ───────────────────────
    /** 황금, 풍작 and 만개 (three extra lines). */
    function badges(item) {
        const out = [];
        if (isGolden(item)) out.push(['is-golden', `황금 ×${STUMP_BOX_RIPENING.golden.mul}`]);
        if (item.ancient) out.push(['is-ancient', `고대: 모든 색 공명, 이웃 접붙이기 +${STUMP_BOX_ANCIENT.graftRanks}`]);
        if (item.harvest && item.harvest.bonus) out.push(['is-bumper', `풍작 +${Math.round(item.harvest.bonus * 100)}%`]);
        if (item.harvest && item.harvest.lines.length >= 3) out.push(['is-bloom', '만개']);
        return out;
    }
    function badgesHtml(item) {
        const list = badges(item);
        return list.length ? `<span class="stump-badges">${list.map(([tone, text]) => `<span class="${tone}">${esc(text)}</span>`).join('')}</span>` : '';
    }
    /** One line row (p in the panel, div in the tooltip): its stat's colour while it works, grey with (비활성) when it does not. */
    function lineRow(line, tooltip, active, note = '') {
        const tag = tooltip ? 'div' : 'p', cls = `${tooltip ? 'tooltip-line stump-tip-extra' : 'stump-extra'}${active ? '' : ' is-off'}`;
        const style = active ? ` style="color:${getItemStatToneColor(line.stat)}"` : '';
        return `<${tag} class="${cls}"${style}>${esc(lineText(line.stat, line.value))}${active ? '' : ' (비활성)'}${note}</${tag}>`;
    }
    /** Extra line rows of a grown seed or sap; they work while the board counts it (evaluate's extras). */
    function extraLinesHtml(item, result, tooltip) {
        if (!stumpBox.isMature(item)) return '';
        const active = !!result.extras[item.id];
        return stumpBox.extraLinesOf(item, result).map(line => lineRow(line, tooltip, active)).join('');
    }

    // ── 불씨의 흉터 ───────────────────────────────────────
    /** What a scar holds, each line against its cap; grey (비활성) while it sleeps or sits in storage. */
    function scarBodyHtml(item, result, tooltip) {
        const caps = stumpBox.scarCaps(), active = !!result.extras[item.id];
        const lines = stumpBox.extraLinesOf(item, result).map(line => lineRow(line, tooltip, active, ` <small>(최대 ${number(caps[line.stat] || 0)})</small>`)).join('');
        const none = tooltip ? '<div class="tooltip-line">흡수한 능력치 없음</div>' : '<p class="stump-line">흡수한 능력치 없음</p>';
        return lines || none;
    }
    /** Throws a stored scar away after a confirmation (what it absorbed goes with it). */
    async function discardScar(id) {
        const item = stumpBox.itemById(game, id);
        if (!item || item.family !== 'scar') return false;
        const options = { title: `${STUMP_BOX_SCAR.name} 버리기`, tone: 'danger', confirmLabel: '버리기', cancelLabel: '취소' };
        const message = `${withObjectParticle(STUMP_BOX_SCAR.name)} 버립니다. 흡수한 능력치도 사라지고 되돌릴 수 없습니다.`;
        return await requestGameConfirmation(message, options) && stumpBox.discard(game, id);
    }
    /** A stored seed or sap thrown away: golden and ancient ones ask first, the rest go at once. */
    async function confirmDiscard(item) {
        if (!isGolden(item) && !item.ancient) return true;
        const options = { title: '버리기', tone: 'danger', confirmLabel: '버리기', cancelLabel: '취소' };
        return requestGameConfirmation(`${withObjectParticle(stumpBox.shortName(item))} 버립니다. 되돌릴 수 없습니다.`, options);
    }

    // ── 봉인 칸 ───────────────────────────────────────────
    /** Seal or unseal a board cell (free); '' before the first seal cell opens. Only why it cannot be sealed is written out. */
    function sealHtml(cell) {
        const limit = stumpBox.sealLimit(game);
        if (cell < 0 || !limit) return '';
        const sealed = stumpBox.isSealed(game.stumpBox, cell), reason = stumpBox.sealReason(game, cell);
        const label = sealed ? '봉인 풀기' : `이 칸 봉인 (${game.stumpBox.sealed.length}/${limit})`;
        return `<div class="stump-seal">${reason ? `<p class="stump-hint">${esc(reason)}</p>` : ''}`
            + `<div class="stump-actions"><button type="button" data-stump-action="seal" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button></div></div>`;
    }

    /** '화염 꽃 씨앗': what the seed grows into is rolled when it is made (2026-10-09). The seed pouch is in the rewards window
     * (js/stump-harvest-ui.js). */
    function seedName(spec) { return `${STUMP_BOX_COLORS[spec.color].label} ${STUMP_BOX_STAGES[spec.path || 'flower'].label} 씨앗`; }

    // ── 일괄 거름 사용 · 일괄 버리기 ───────────────────────────
    /** One bulk button: the count it would take, or muted when it cannot run (pressing it then says why, touch has no hover). */
    function bulkButton(kind, label, reason, count) {
        return `<button type="button" class="${reason ? 'is-idle' : ''}" data-stump-action="bulk" data-kind="${kind}"${reason ? ` title="${esc(reason)}"` : ''}>`
            + `${label}${reason ? '' : ` ${count}`}</button>`;
    }
    /** The storage filter's bulk buttons (none on the talisman filter). */
    function bulkHtml(filter) {
        if (filter === 'talisman') return '';
        const compostReason = stumpBox.bulkCompostReason(game, filter), discardReason = stumpBox.bulkDiscardReason(game, filter);
        const compost = stumpBox.bulkCompostOpen(game) ? bulkButton('compost', '일괄 거름 사용', compostReason, compostReason ? 0 : stumpBox.bulkCompostPlan(game, filter).length) : '';
        return `<div class="stump-bulk">${compost}${bulkButton('discard', '일괄 버리기', discardReason, discardReason ? 0 : stumpBox.bulkItems(game, filter).length)}</div>`;
    }
    function rollRange(rolls) {
        const low = Math.min(...rolls), high = Math.max(...rolls);
        return low === high ? `${low}%` : `${low}~${high}%`;
    }
    /** '화염 꽃 씨앗 3개 (품질 80~95%)' per colour and kind, in the order given. */
    function bulkLines(items) {
        const groups = new Map();
        items.forEach(item => {
            const name = item.family === 'sap' ? `${STUMP_BOX_COLORS[item.color].label} 수액` : seedName(item);
            groups.set(name, (groups.get(name) || []).concat(Math.round(item.roll * 100)));
        });
        return [...groups].map(([name, rolls]) => `${name} ${rolls.length}개 (품질 ${rollRange(rolls)})`);
    }
    /** What growing items the plan feeds: all of them, by the plan's whole growth. */
    function compostOutcome(plan) {
        const growth = plan.reduce((sum, item) => sum + stumpBox.compostGrowth(item), 0);
        return `그루터기 함에서 성장 중인 그루터기 아이템 ${stumpBox.growingItems(game).length}개의 경험치가 ${growth}만큼 증가합니다.`;
    }
    /** Asks before a bulk action, naming what it will use; a refusal is a toast. @returns {Promise<boolean>} */
    async function confirmBulk(kind, filter) {
        const compost = kind === 'compost', reason = compost ? stumpBox.bulkCompostReason(game, filter) : stumpBox.bulkDiscardReason(game, filter);
        if (reason) {
            showGameToast(reason, { tone: 'warning' });
            return false;
        }
        const items = compost ? stumpBox.bulkCompostPlan(game, filter) : stumpBox.bulkItems(game, filter);
        const tail = compost ? compostOutcome(items) : '되돌릴 수 없습니다.';
        const options = { title: compost ? '일괄 거름 사용' : '일괄 버리기', tone: compost ? 'info' : 'danger',
            confirmLabel: `${items.length}개 ${compost ? '사용' : '버리기'}`, cancelLabel: '취소' };
        return requestGameConfirmation(`${bulkLines(items).join('\n')}\n\n${tail}`, options);
    }

    // ── 부적 도감 ─────────────────────────────────────────
    /** A codex tile: the awake unique talisman and its name once found, a sleeping one and ??? before. */
    function codexEntry(row, owned) {
        const on = owned.has(row.id);
        return `<li class="${on ? 'is-on' : ''}" title="${esc(on ? row.name : '아직 얻지 못함')}">`
            + `<img src="assets/px/stump/${on ? 'talisman' : 'sealed'}-unique.png" alt="" draggable="false"><span>${esc(on ? row.name : '???')}</span></li>`;
    }
    /** First finds of the unique and wild unique talismans (a progress bar, then the tiles); every few add storage. */
    function codexHtml() {
        if (!contentProgression.isUnlocked('talisman')) return '';
        const owned = new Set(game.stumpBox.codex), total = stumpBox.codexIds().length, rule = STUMP_BOX_TALISMAN_CODEX;
        const bonus = Math.floor(owned.size / rule.every) * rule.storage, fill = total ? Math.floor(owned.size / total * 100) : 0;
        return `<h3>부적 도감 <small>${owned.size}/${total}, ${rule.every}종마다 보관함 +${rule.storage} (지금 +${bonus})</small></h3>`
            + `<span class="stump-codex-bar"><i style="width:${fill}%"></i></span>`
            + `<details class="stump-codex"><summary>도감 보기</summary><p>고유</p><ul>${TALISMAN_UNIQUE_DB.map(row => codexEntry(row, owned)).join('')}</ul>`
            + `<p>야생 고유</p><ul>${TALISMAN_WILD_UNIQUE_DB.map(row => codexEntry(row, owned)).join('')}</ul></details>`;
    }

    // ── 규칙 툴팁 ─────────────────────────────────────────
    /** The rules card's lines for the ripening roll and the later unlocks (봉인 칸, 포식, 번식), one short line each. */
    function rulesLines() {
        return ['성장 완료 시 추가 옵션, 풍작, 황금 여부가 정해집니다.',
            stumpBox.sealLimit(game) ? '봉인 칸: 루프가 바뀌어도 성장 상태가 유지됩니다.' : '',
            stumpBox.devourOpen(game) ? '불씨의 흉터: 루프가 바뀔 때 주변 8칸 중 무작위 1칸이 씨앗이나 수액이면 흡수합니다.' : '',
            stumpBox.breedingOpen(game) ? '번식: 성장 완료된 열매는 루프가 바뀔 때 보관함에 씨앗 1개를 남깁니다.' : ''].filter(Boolean);
    }

    // ── 알림 ───────────────────────────────────────────────
    /** What the ripening roll gave, for the toast: 만개, 황금, 풍작 and how many extra lines. */
    function ripenNote(items) {
        const lines = items.reduce((sum, item) => sum + ((item.harvest && item.harvest.lines.length) || 0), 0);
        const notes = [items.some(item => item.harvest && item.harvest.lines.length >= 3) ? '만개' : '', items.some(isGolden) ? '황금' : '',
            items.some(item => item.harvest && item.harvest.bonus) ? '풍작' : '', lines ? `추가 줄 ${lines}개` : ''].filter(Boolean);
        return notes.join(', ');
    }
    function biteLog(row) {
        if (!row.ate) return '🔥 불씨의 흉터: 고른 칸에 씨앗이나 수액이 없어 이번 포식에 실패했습니다.';
        return `🔥 불씨의 흉터가 ${withObjectParticle(row.ate)} 먹었습니다: ${row.gained.map(line => lineText(line.stat, line.value)).join(', ')}`;
    }
    function bredLog(row) {
        if (row.spec.scar) return '🔥 번식 돌연변이: 성장 완료된 열매가 불씨의 흉터를 남겼습니다.';
        if (row.compost) return `🌱 번식: 보관함이 가득 차 ${STUMP_BOX_COLORS[row.spec.color].label} 씨앗이 거름이 됐습니다.`;
        const odd = [row.spec.color !== row.spec.parent ? '다른 색' : '', row.item && row.item.golden ? '황금' : ''].filter(Boolean);
        return `🌱 번식: ${seedName(row.spec)}${odd.length ? ` (돌연변이: ${odd.join(', ')})` : ''}`;
    }
    /** Logs for a new loop's 포식 and 번식 (js/stump-box.js regress). */
    function regressLog(detail) {
        (detail.eaten || []).forEach(row => addLog(biteLog(row), row.ate ? 'loot-rare' : 'season-up'));
        (detail.bred || []).forEach(row => addLog(bredLog(row), row.item && (row.item.golden || row.item.family === 'scar') ? 'loot-unique' : 'loot-magic'));
        if (detail.sealed) addLog(`🔒 그루터기 함: 봉인 칸 ${detail.sealed}개의 성장 상태가 유지됐습니다.`, 'season-up');
    }

    return Object.freeze({ lineText, isGolden, badgesHtml, extraLinesHtml, scarBodyHtml, discardScar, confirmDiscard, sealHtml, bulkHtml,
        confirmBulk, codexHtml, rulesLines, ripenNote, regressLog });
})();
safeExposeGlobals({ stumpRipeningUi });
