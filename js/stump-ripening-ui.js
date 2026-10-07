// 그루터기 함 16번 화면 조각(2026-10-08): 다 자라는 순간의 굴림(추가 줄, 황금, 풍작, 만개), 불씨의 흉터(포식), 봉인 칸 단추,
// 씨앗 주머니, 거름 한꺼번에, 부적 도감, 루프 전환 알림(포식과 번식). 그리기와 클릭은 js/stump-box-ui.js가 부르고,
// 규칙과 계산은 js/stump-box.js, 수치는 data/stump-box.js.
const stumpRipeningUi = (() => {
    const COLORS = Object.keys(STUMP_BOX_COLORS);

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
        if (item.harvest && item.harvest.bonus) out.push(['is-bumper', `풍작 +${Math.round(item.harvest.bonus * 100)}%`]);
        if (item.harvest && item.harvest.lines.length >= 3) out.push(['is-bloom', '만개']);
        return out;
    }
    function badgesHtml(item) {
        const list = badges(item);
        return list.length ? `<span class="stump-badges">${list.map(([tone, text]) => `<span class="${tone}">${esc(text)}</span>`).join('')}</span>` : '';
    }
    /** Extra line rows for the detail panel (tag p) or the tooltip (tag div), each in its stat's colour. */
    function extraLinesHtml(item, result, tooltip) {
        if (!stumpBox.isMature(item)) return '';
        const tag = tooltip ? 'div' : 'p', cls = tooltip ? 'tooltip-line stump-tip-extra' : 'stump-extra';
        return stumpBox.extraLinesOf(item, result).map(line => `<${tag} class="${cls}" style="color:${getItemStatToneColor(line.stat)}">${esc(lineText(line.stat, line.value))}</${tag}>`).join('');
    }

    // ── 불씨의 흉터 ───────────────────────────────────────
    /** What a scar holds (its absorbed lines, each against its cap), how its meals went, and how it eats. */
    function scarBodyHtml(item, result, tooltip) {
        const tag = tooltip ? 'div' : 'p', cls = tooltip ? 'tooltip-line' : 'stump-line', caps = stumpBox.scarCaps();
        const lines = stumpBox.extraLinesOf(item, result).map(line => `<${tag} class="${cls} stump-extra" style="color:${getItemStatToneColor(line.stat)}">`
            + `${esc(lineText(line.stat, line.value))} <small>(최대 ${number(caps[line.stat] || 0)})</small></${tag}>`).join('');
        const meals = `<${tag} class="${cls}">먹은 것 ${item.meals || 0}번, 놓친 기회 ${item.misses || 0}번</${tag}>`;
        const how = `<${tag} class="${cls} stump-hint">루프를 넘길 때 깨어 있으면 둘레 8칸 가운데 한 칸을 골라, 씨앗이나 수액이면 먹고 능력치를 흡수합니다. 빈칸, 부적, 판 밖을 고르면 기회가 사라집니다.</${tag}>`;
        return (lines || `<${tag} class="${cls}">아직 흡수한 것이 없습니다.</${tag}>`) + meals + how;
    }
    /** Throws a stored scar away after a confirmation (what it absorbed goes with it). */
    async function discardScar(id) {
        const item = stumpBox.itemById(game, id);
        if (!item || item.family !== 'scar') return false;
        const options = { title: `${STUMP_BOX_SCAR.name} 버리기`, tone: 'danger', confirmLabel: '버리기', cancelLabel: '취소' };
        const message = `${withObjectParticle(STUMP_BOX_SCAR.name)} 버립니다. 흡수한 능력치도 사라지고 되돌릴 수 없습니다.`;
        return await requestGameConfirmation(message, options) && stumpBox.discard(game, id);
    }

    // ── 봉인 칸 ───────────────────────────────────────────
    /** Seal or unseal a board cell (free); '' before the first seal cell opens. A sealed cell's panel already says so, so only
     * an unsealed one explains (or says why it cannot be sealed). */
    function sealHtml(cell) {
        const limit = stumpBox.sealLimit(game);
        if (cell < 0 || !limit) return '';
        const sealed = stumpBox.isSealed(game.stumpBox, cell), reason = stumpBox.sealReason(game, cell);
        const label = sealed ? '봉인 풀기' : `이 칸 봉인 (${game.stumpBox.sealed.length}/${limit})`;
        const note = sealed ? '' : reason || '봉인하면 다 자란 것이 줄까지 그대로 루프를 넘깁니다.';
        return `<div class="stump-seal">${note ? `<p class="stump-hint">${esc(note)}</p>` : ''}`
            + `<div class="stump-actions"><button type="button" data-stump-action="seal" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button></div></div>`;
    }

    // ── 씨앗 주머니 ───────────────────────────────────────
    function pouchTitle(id) {
        const row = STUMP_BOX_UNLOCKS.find(entry => entry.id === id), page = row && JOURNAL_DB[row.when.journal];
        return page ? page.title : '씨앗 주머니';
    }
    function pouchOffer(id, offer, index) {
        const name = `${STUMP_BOX_COLORS[offer.color].label} 씨앗`;
        return `<button type="button" data-stump-action="pouch" data-pouch="${esc(id)}" data-index="${index}" style="--stump-tone:${STUMP_BOX_COLORS[offer.color].tone}"`
            + ` aria-label="${esc(`${name} 품질 ${Math.round(offer.roll * 100)}% 고르기`)}"><img src="assets/px/stump/seed-${offer.color}.png" alt="" draggable="false">`
            + `${esc(name)}<small>${Math.round(offer.roll * 100)}%</small></button>`;
    }
    /** Each pouch waiting: its three offers (rolled once and kept), pick one. Offers rolled just now are saved at once,
     * so reloading shows the same three. */
    function pouchHtml() {
        const ids = stumpBox.pendingPouches(game);
        if (!ids.length) return '';
        const fresh = ids.some(id => !game.stumpBox.pouches.offers[id]);
        const html = '<h3>씨앗 주머니 <small>셋 가운데 하나</small></h3>' + ids.map(id => `<div class="stump-starter-row stump-pouch-row"><span>${esc(pouchTitle(id))}</span>`
            + `${stumpBox.pouchOffers(game, id).map((offer, index) => pouchOffer(id, offer, index)).join('')}</div>`).join('');
        if (fresh) queueImportantSave(300);
        return html;
    }

    // ── 거름 한꺼번에 ─────────────────────────────────────
    function bulkButton(color) {
        const count = stumpBox.bulkCompostItems(game, color).length, reason = stumpBox.bulkCompostReason(game, color);
        return `<button type="button" data-stump-action="bulk-compost" data-color="${color}" style="--stump-tone:${STUMP_BOX_COLORS[color].tone}"`
            + `${reason ? ` disabled title="${esc(reason)}"` : ''}>${STUMP_BOX_COLORS[color].label} ${count}</button>`;
    }
    /** One button per colour: how many stored seeds and saps would go (the best few and golden ones stay). */
    function bulkCompostHtml() {
        if (!stumpBox.bulkCompostOpen(game)) return '';
        return `<div class="stump-bulk"><span>거름 한꺼번에 <small>좋은 것 ${STUMP_BOX_BULK_COMPOST.keep}개와 황금은 남김</small></span>`
            + `<div class="stump-bulk-buttons">${COLORS.map(bulkButton).join('')}</div></div>`;
    }

    // ── 부적 도감 ─────────────────────────────────────────
    function codexEntry(row, owned) {
        return `<li class="${owned.has(row.id) ? 'is-on' : ''}">${esc(owned.has(row.id) ? row.name : '???')}</li>`;
    }
    /** First finds of the unique and wild unique talismans; every few add storage. Shown once talismans open. */
    function codexHtml() {
        if (!contentProgression.isUnlocked('talisman')) return '';
        const owned = new Set(game.stumpBox.codex), total = stumpBox.codexIds().length, rule = STUMP_BOX_TALISMAN_CODEX;
        const bonus = Math.floor(owned.size / rule.every) * rule.storage;
        return `<h3>부적 도감 <small>${owned.size}/${total}, 보관함 +${bonus}</small></h3>`
            + `<p class="stump-hint">고유 부적을 처음 얻으면 적습니다. ${rule.every}종마다 보관함 +${rule.storage}칸.</p>`
            + `<details class="stump-codex"><summary>목록</summary><p>고유</p><ul>${TALISMAN_UNIQUE_DB.map(row => codexEntry(row, owned)).join('')}</ul>`
            + `<p>야생 고유</p><ul>${TALISMAN_WILD_UNIQUE_DB.map(row => codexEntry(row, owned)).join('')}</ul></details>`;
    }

    // ── 규칙 툴팁 ─────────────────────────────────────────
    /** The rules tooltip's lines for the ripening roll and the later unlocks (봉인 칸, 포식, 번식). */
    function rulesLines() {
        const ripen = STUMP_BOX_RIPENING, seals = stumpBox.sealLimit(game);
        return [`다 자랄 때 추가 줄(0~3개), 풍작(품질 +${Math.round(ripen.bumper.quality * 100)}%), 드물게 황금(×${ripen.golden.mul})을 굴리고, 새 루프에 다시 굴립니다.`,
            seals ? `봉인 칸 ${seals}개: 그 칸의 다 자란 것은 줄까지 그대로 루프를 넘깁니다.` : '',
            stumpBox.devourOpen(game) ? '불씨의 흉터: 루프를 넘길 때 둘레 8칸 가운데 한 칸을 골라, 씨앗이나 수액이면 먹고 흡수합니다.' : '',
            stumpBox.breedingOpen(game) ? '번식: 다 자란 열매는 루프를 넘길 때 씨앗 하나를 남깁니다.' : ''].filter(Boolean);
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
        if (!row.ate) return '🔥 불씨의 흉터가 먹을 것이 없는 칸을 골라 이번 포식 기회를 놓쳤습니다.';
        return `🔥 불씨의 흉터가 ${withObjectParticle(row.ate)} 먹었습니다: ${row.gained.map(line => lineText(line.stat, line.value)).join(', ')}`;
    }
    function bredLog(row) {
        if (row.spec.scar) return '🔥 번식 돌연변이: 다 자란 열매가 불씨의 흉터를 남겼습니다.';
        if (row.compost) return `🌱 번식: 보관함이 가득 차 ${STUMP_BOX_COLORS[row.spec.color].label} 씨앗이 거름이 됐습니다.`;
        const odd = [row.spec.color !== row.spec.parent ? '다른 색' : '', row.item && row.item.golden ? '황금' : ''].filter(Boolean);
        return `🌱 번식: ${STUMP_BOX_COLORS[row.spec.color].label} 씨앗${odd.length ? ` (돌연변이: ${odd.join(', ')})` : ''}`;
    }
    /** Logs for a new loop's 포식 and 번식 (js/stump-box.js regress). */
    function regressLog(detail) {
        (detail.eaten || []).forEach(row => addLog(biteLog(row), row.ate ? 'loot-rare' : 'season-up'));
        (detail.bred || []).forEach(row => addLog(bredLog(row), row.item && (row.item.golden || row.item.family === 'scar') ? 'loot-unique' : 'loot-magic'));
        if (detail.sealed) addLog(`🔒 그루터기 함: 봉인 칸의 ${detail.sealed}개가 다 자란 채로 루프를 넘겼습니다.`, 'season-up');
    }

    return Object.freeze({ lineText, isGolden, badgesHtml, extraLinesHtml, scarBodyHtml, discardScar, sealHtml, pouchHtml, bulkCompostHtml, codexHtml,
        rulesLines, ripenNote, regressLog });
})();
safeExposeGlobals({ stumpRipeningUi });
