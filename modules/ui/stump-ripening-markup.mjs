export function esc(runtime, text) { return (0, runtime.deps.escapeHTML)(String(text)); }

export function number(runtime, value) { return String(Math.round(value * 10) / 10); }

/** A stat line in the box's own words (js/stump-box.js lineText; the public profile uses the same one). */
export function lineText(runtime, stat, value) { return runtime.deps.stumpBox.lineText(stat, value); }

export function isGolden(runtime, item) { return !!item && runtime.deps.stumpBox.goldenMul(item) > 1; }

/** 알비노는 함 전체에 하나(2026-11-03 사용자): 아직 없으면 0/1, 이 알비노가 놓여 있으면 초록 1/1, 다른 알비노가 놓여 있어 더 못 놓으면 빨강 1/1. */
export function albinoBadge(runtime, item) {
    const worn = runtime.deps.stumpBox.wornAlbinoId(runtime.deps.game);
    if (worn === null) return ['is-albino', '알비노 0/1'];
    return [worn === item.id ? 'is-albino is-worn' : 'is-albino is-full', '알비노 1/1'];
}

/** 황금, 풍작 and 만개 (three extra lines). */
export function badges(runtime, item) {
    const out = [];
    if (item.albino) out.push(albinoBadge(runtime, item));
    if (isGolden(runtime, item)) out.push(['is-golden', (0, runtime.deps._t)('황금 ×{mul}', { mul: runtime.deps.STUMP_BOX_RIPENING.golden.mul })]);
    if (item.ancient) out.push(['is-ancient', (0, runtime.deps._t)('고대: 공명, 규율에서 어느 색이든, 이웃 접붙이기 +{graftRanks}', { graftRanks: runtime.deps.STUMP_BOX_ANCIENT.graftRanks })]);
    if (item.harvest && item.harvest.bonus) out.push(['is-bumper', (0, runtime.deps._t)('풍작 +{round}%', { round: Math.round(item.harvest.bonus * 100) })]);
    if (item.harvest && item.harvest.lines.length >= 3) out.push(['is-bloom', '만개']);
    return out;
}

export function badgesHtml(runtime, item) {
    const list = badges(runtime, item);
    return list.length ? `<span class="stump-badges">${list.map(([tone, text]) => `<span class="${tone}">${esc(runtime, text)}</span>`).join('')}</span>` : '';
}

/** One line row (p in the panel, div in the tooltip): its stat's colour while it works, grey with (비활성) when it does not. */
export function lineRow(runtime, line, tooltip, active, note = '') {
    const tag = tooltip ? 'div' : 'p', cls = `${tooltip ? 'tooltip-line stump-tip-extra' : 'stump-extra'}${active ? '' : ' is-off'}`;
    const style = active ? ` style="color:${(0, runtime.deps.getItemStatToneColor)(line.stat)}"` : '';
    return `<${tag} class="${cls}"${style}>${esc(runtime, lineText(runtime, line.stat, line.value))}${active ? '' : (0, runtime.deps._t)(' (비활성)')}${note}</${tag}>`;
}

/** Extra line rows of a grown seed; they work while the board counts it (evaluate's extras). */
export function extraLinesHtml(runtime, item, result, tooltip) {
    if (!runtime.deps.stumpBox.isMature(item)) return '';
    const active = !!result.extras[item.id];
    return runtime.deps.stumpBox.extraLinesOf(item, result).map(line => lineRow(runtime, line, tooltip, active)).join('');
}

/** What a scar holds, each line against its cap; grey (비활성) while it sleeps or sits in storage. */
export function scarBodyHtml(runtime, item, result, tooltip) {
    const caps = runtime.deps.stumpBox.scarCaps(), active = !!result.extras[item.id];
    const lines = runtime.deps.stumpBox.extraLinesOf(item, result).map(line => lineRow(runtime, line, tooltip, active, ` <small>${(0, runtime.deps._t)('(최대 {caps})', { caps: number(runtime, caps[line.stat] || 0) })}</small>`)).join('');
    const none = tooltip ? '<div class="tooltip-line">흡수한 능력치 없음</div>' : '<p class="stump-line">흡수한 능력치 없음</p>';
    return lines || none;
}

/** Seal or unseal a board cell (free); '' before the first seal cell opens. Only why it cannot be sealed is written out. */
export function sealHtml(runtime, cell) {
    const limit = runtime.deps.stumpBox.sealLimit(runtime.deps.game);
    if (cell < 0 || !limit) return '';
    const sealed = runtime.deps.stumpBox.isSealed(runtime.deps.game.stumpBox, cell), reason = runtime.deps.stumpBox.sealReason(runtime.deps.game, cell);
    const label = sealed ? '봉인 풀기' : (0, runtime.deps._t)('이 칸 봉인 ({length}/{limit})', { length: runtime.deps.game.stumpBox.sealed.length, limit });
    return `<div class="stump-seal">${reason ? `<p class="stump-hint">${esc(runtime, reason)}</p>` : ''}`
        + `<div class="stump-actions"><button type="button" data-stump-action="seal" data-cell="${cell}"${reason ? ' disabled' : ''}>${label}</button></div></div>`;
}

/** '화염 씨앗': what a seed grows into is rolled when it ripens (2026-11-04 사용자). The seed pouch is in the rewards window
* (js/stump-harvest-ui.js). */
export function seedName(runtime, spec) { return (0, runtime.deps._t)('{label} 씨앗', { label: runtime.deps.STUMP_BOX_COLORS[spec.color].label }); }

/** One bulk button: the count it would take, or muted when it cannot run (pressing it then says why, touch has no hover).
* kind 'merge' is 자동합성 (its own action), the others go through the bulk action. */
export function bulkButton(runtime, kind, label, reason, count) {
    const action = kind === 'merge' ? 'data-stump-action="auto-merge"' : `data-stump-action="bulk" data-kind="${kind}"`;
    return `<button type="button" class="${reason ? 'is-idle' : ''}" ${action}${reason ? ` data-tip="${esc(runtime, reason)}"` : ''}>`
        + `${(0, runtime.deps._t)(label)}${reason ? '' : ` ${count}`}</button>`;
}

/** The storage filter's bulk buttons: 자동합성 beside 일괄 거름 사용 (2026-11-04 사용자), only 일괄 버리기 on the talisman filter. */
export function bulkHtml(runtime, filter) {
    const discardReason = runtime.deps.stumpBox.bulkDiscardReason(runtime.deps.game, filter);
    const discard = bulkButton(runtime, 'discard', '일괄 버리기', discardReason, discardReason ? 0 : runtime.deps.stumpBox.bulkDiscardItems(runtime.deps.game, filter).length);
    // 부적 칸은 거름이 없어 일괄 버리기만(2026-10-23 사용자: 일괄 버리기에서 부적이 빠져 있었다)
    if (filter === 'talisman') return `<div class="stump-bulk">${discard}</div>`;
    const compostReason = runtime.deps.stumpBox.bulkCompostReason(runtime.deps.game, filter);
    const compost = runtime.deps.stumpBox.bulkCompostOpen(runtime.deps.game) ? bulkButton(runtime, 'compost', '일괄 거름 사용', compostReason, compostReason ? 0 : runtime.deps.stumpBox.bulkCompostPlan(runtime.deps.game, filter).length) : '';
    const sets = runtime.deps.stumpCube.autoMergeSets(runtime.deps.game, filter).length;
    const merge = bulkButton(runtime, 'merge', '자동합성', sets ? '' : runtime.state.NO_MERGE, sets);
    return `<div class="stump-bulk">${merge}${compost}${discard}</div>`;
}

export function rollRange(runtime, rolls) {
    const low = Math.min(...rolls), high = Math.max(...rolls);
    return low === high ? `${low}%` : `${low}~${high}%`;
}

/** '화염 씨앗 3개 (품질 80~95%)' per name, in the order given. */
export function bulkLines(runtime, items) {
    const groups = new Map();
    items.forEach(item => groups.set(runtime.deps.stumpBox.shortName(item), (groups.get(runtime.deps.stumpBox.shortName(item)) || []).concat(item)));
    return [...groups].map(([name, rows]) => (0, runtime.deps._t)('{name} {length}개', { name, length: rows.length })
            + (rows[0].color ? ` (품질 ${rollRange(runtime, rows.map(item => Math.round(item.roll * 100)))})` : ''));
}

/** 일괄 버리기의 줄: 버리는 씨앗, 그다음 화폐화되는 다 자란 아이템. */
export function bulkDiscardLines(runtime, items) {
    const grown = new Map();
    items.filter(runtime.deps.stumpBox.isMature).forEach(item => grown.set(runtime.deps.stumpBox.shortName(item), (grown.get(runtime.deps.stumpBox.shortName(item)) || 0) + 1));
    return [...bulkLines(runtime, items.filter(item => !runtime.deps.stumpBox.isMature(item))), ...[...grown].map(([name, count]) => (0, runtime.deps._t)('화폐화: {name} {count}개', { name, count }))];
}

/** What growing items the plan feeds: all of them, by the plan's whole growth. */
export function compostOutcome(runtime, plan) {
    const growth = plan.reduce((sum, item) => sum + runtime.deps.stumpBox.compostGrowth(item), 0);
    return (0, runtime.deps._t)('그루터기 함에서 성장 중인 그루터기 아이템 {length}개의 경험치가 {growth}만큼 증가합니다.', { length: runtime.deps.stumpBox.growingItems(runtime.deps.game).length, growth });
}

export function discardKeep(runtime, item) {
    if (item.locked) return '잠금';
    if (item.family === 'talisman' && item.rarity === 'unique') return '고유 부적';
    if (item.family === 'scar') return runtime.deps.STUMP_BOX_SCAR.name;
    if (item.golden) return '황금';
    if (item.ancient) return '고대 씨앗';
    return runtime.deps.stumpBox.isMature(item) ? '성장 완료' : '성장 중';
}

/** '남는 아이템: 황금 2개, 부적 12개' for what of the filter 일괄 버리기 leaves in storage, '' when nothing stays. */
export function discardKeptLine(runtime, filter, gone) {
    const ids = new Set(gone.map(item => item.id)), counts = new Map();
    const inFilter = item => filter === 'all' || (filter === 'talisman' ? item.family === 'talisman' : item.color === filter);
    runtime.deps.stumpBox.storage(runtime.deps.game).filter(item => !ids.has(item.id) && inFilter(item))
        .forEach(item => counts.set(discardKeep(runtime, item), (counts.get(discardKeep(runtime, item)) || 0) + 1));
    const parts = runtime.state.DISCARD_KEEPS.filter(why => counts.has(why)).map(why => (0, runtime.deps._t)('{why} {get}개', { why, get: counts.get(why) }));
    return parts.length ? (0, runtime.deps._t)('남는 아이템: {parts}', { parts: parts.join(', ') }) : '';
}

/** Snapshot the exact consumed items and feeding outcome. Target XP alone is harmless while the same plan still applies. */
export function bulkConfirmation(runtime, kind, filter) {
    const compost = kind === 'compost', reason = compost ? runtime.deps.stumpBox.bulkCompostReason(runtime.deps.game, filter) : runtime.deps.stumpBox.bulkDiscardReason(runtime.deps.game, filter);
    const items = compost ? runtime.deps.stumpBox.bulkCompostPlan(runtime.deps.game, filter) : runtime.deps.stumpBox.bulkDiscardItems(runtime.deps.game, filter);
    const targets = compost ? runtime.deps.stumpBox.growingItems(runtime.deps.game).map(item => item.id) : [];
    const growth = compost ? items.reduce((sum, item) => sum + runtime.deps.stumpBox.compostGrowth(item), 0) : 0;
    const key = JSON.stringify([kind, filter, runtime.deps.game.season, runtime.deps.game.loopCount, items, targets, growth]);
    return { reason, items, key };
}

/** Check immediately before the caller consumes anything; newly dropped, locked or changed materials require a new confirmation. */
export function bulkConfirmationCurrent(runtime, kind, filter, key) {
    const current = bulkConfirmation(runtime, kind, filter);
    return !current.reason && typeof key === 'string' && key === current.key;
}

/** The sets 자동합성 would merge in this filter and a key of exactly them (a seed dropped, locked or merged since asks again). */
export function autoMergeConfirmation(runtime, filter) {
    const sets = runtime.deps.stumpCube.autoMergeSets(runtime.deps.game, filter);
    return { sets, key: JSON.stringify([filter, runtime.deps.game.season, runtime.deps.game.loopCount, sets.map(set => set.map(item => [item.id, item.roll]))]) };
}

/** '화염 씨앗 9개 → 3개 (품질 80~95%)' per colour. */
export function mergeLines(runtime, sets) {
    const byColor = new Map();
    sets.forEach(set => byColor.set(set[0].color, (byColor.get(set[0].color) || []).concat(set)));
    return [...byColor].map(([color, items]) => `${seedName(runtime, { color })} ${items.length}개 → ${items.length / 3}개`
            + ` (품질 ${rollRange(runtime, items.map(item => Math.round(item.roll * 100)))})`);
}

export function autoMergeCurrent(runtime, filter, key) { return typeof key === 'string' && key === autoMergeConfirmation(runtime, filter).key; }

/** A codex tile: the awake unique talisman and its name once found, a sleeping one and ??? before. */
export function codexEntry(runtime, row, owned) {
    const on = owned.has(row.id);
    return `<li class="${on ? 'is-on' : ''}" data-tip="${esc(runtime, on ? row.name : '아직 얻지 못함')}">`
        + `<img src="assets/items/stump-pixel-v1/${on ? 'talisman' : 'sealed'}-unique.png" alt="" draggable="false"><span>${esc(runtime, on ? row.name : '???')}</span></li>`;
}

/** First finds of the unique and wild unique talismans (a progress bar, then the tiles); every few add storage. */
export function codexHtml(runtime) {
    if (!runtime.deps.contentProgression.isUnlocked('talisman')) return '';
    const owned = new Set(runtime.deps.game.stumpBox.codex), total = runtime.deps.stumpBox.codexIds().length, rule = runtime.deps.STUMP_BOX_TALISMAN_CODEX;
    const bonus = Math.floor(owned.size / rule.every) * rule.storage, fill = total ? Math.floor(owned.size / total * 100) : 0;
    return `<h3>${(0, runtime.deps._t)('부적 도감')} <small>${(0, runtime.deps._t)('{size}/{total}, {every}종마다 보관함 +{storage} (지금 +{bonus})', { size: owned.size, total, every: rule.every, storage: rule.storage, bonus })}</small></h3>`
        + `<span class="stump-codex-bar"><i style="width:${fill}%"></i></span>`
        + `<details class="stump-codex"><summary>${(0, runtime.deps._t)('도감 보기')}</summary><p>${(0, runtime.deps._t)('고유')}</p><ul>${runtime.deps.TALISMAN_UNIQUE_DB.map(row => codexEntry(runtime, row, owned)).join('')}</ul>`
        + `<p>${(0, runtime.deps._t)('야생 고유')}</p><ul>${runtime.deps.TALISMAN_WILD_UNIQUE_DB.map(row => codexEntry(runtime, row, owned)).join('')}</ul></details>`;
}

/** 불씨의 흉터 rule (2026-11-04 사용자가 쓴 설명을 규칙에 맞춰): 봉인 칸에서만 먹고, 성장 중인 씨앗은 아무것도 주지 않고, 최대 3줄, 판에 하나. */
export function scarRule(runtime) {
    const { absorb, capMul, maxLines } = runtime.deps.STUMP_BOX_SCAR;
    return (0, runtime.deps._t)('불씨의 흉터: 루프가 바뀔 때 봉인 칸에서 성장 완료 상태라면 주변 8칸 중 무작위 한 칸을 선택하여, 그 칸의 씨앗을 먹고 추가 옵션까지 능력치를 {ripe}% 흡수합니다', { ripe: pct(runtime, absorb.ripe) })
        + (0, runtime.deps._t)('(능력치마다 기본값의 {capMul}배까지, 최대 {maxLines}줄이고 {maxLines2}줄이 찬 뒤 새 능력치는 사라짐, 성장 중인 씨앗을 먹거나 칸에 씨앗이 없으면 얻지 못함). 그루터기 함에는 하나만 놓을 수 있습니다.', { capMul, maxLines, maxLines2: maxLines });
}

/** The rules card's lines for the ripening roll and the later unlocks (봉인 칸, 포식, 번식), one short line each. */
export function rulesLines(runtime) {
    return ['성장 완료 시 추가 옵션, 풍작, 황금 여부가 정해집니다.',
        runtime.deps.stumpBox.sealLimit(runtime.deps.game) ? '봉인 칸: 루프가 바뀌어도 아이템이 사라지지 않고 성장 상태도 그대로입니다.' : '',
        runtime.deps.stumpBox.devourOpen(runtime.deps.game) ? scarRule(runtime) : '',
        runtime.deps.stumpBox.breedingOpen(runtime.deps.game) ? '번식: 성장 완료된 열매는 루프가 바뀔 때 보관함에 씨앗 1개를 남깁니다.' : '',
        runtime.deps.stumpBox.nurseryOpen(runtime.deps.game) ? (0, runtime.deps._t)('생육함: 놓은 아이템은 효과 없이 경험치만 {round}% 받습니다.', { round: Math.round(runtime.deps.stumpBox.nurseryRate(runtime.deps.game) * 100) }) : ''].filter(Boolean);
}

/** What the ripening roll gave, for the toast: 만개, 황금, 풍작 and how many extra lines. */
export function ripenNote(runtime, items) {
    const lines = items.reduce((sum, item) => sum + ((item.harvest && item.harvest.lines.length) || 0), 0);
    const notes = [items.some(item => item.harvest && item.harvest.lines.length >= 3) ? '만개' : '', items.some(runtime.handlers.isGolden) ? '황금' : '',
        items.some(item => item.harvest && item.harvest.bonus) ? '풍작' : '', lines ? (0, runtime.deps._t)('추가 줄 {lines}개', { lines }) : ''].filter(Boolean);
    return notes.join(', ');
}

export function biteLog(runtime, row) {
    if (!row.ate) return '🔥 불씨의 흉터: 고른 칸에 씨앗이 없어 이번 포식에 실패했습니다.';
    const lost = row.lost && row.lost.length ? ` (${runtime.deps.STUMP_BOX_SCAR.maxLines}줄이 차서 사라짐: ${row.lost.map(line => lineText(runtime, line.stat, line.value)).join(', ')})` : '';
    if (!row.gained.length) return (0, runtime.deps._t)('🔥 불씨의 흉터가 {ate} 먹었지만 얻은 능력치가 없습니다{lost}.', { ate: (0, runtime.deps.withObjectParticle)(row.ate), lost: lost || (0, runtime.deps._t)('(성장 중인 씨앗)') });
    return `🔥 불씨의 흉터가 ${(0, runtime.deps.withObjectParticle)(row.ate)} 먹었습니다: ${row.gained.map(line => lineText(runtime, line.stat, line.value)).join(', ')}${lost}`;
}

export function bredLog(runtime, row) {
    if (row.spec.scar) return '🔥 번식 돌연변이: 성장 완료된 열매가 불씨의 흉터를 남겼습니다.';
    if (row.compost) return (0, runtime.deps._t)('🌱 번식: 보관함이 가득 차 {label} 씨앗이 거름이 됐습니다.', { label: runtime.deps.STUMP_BOX_COLORS[row.spec.color].label });
    const odd = [row.spec.color !== row.spec.parent ? '다른 색' : '', row.item && row.item.golden ? '황금' : ''].filter(Boolean);
    return `🌱 번식: ${seedName(runtime, row.spec)}${odd.length ? (0, runtime.deps._t)(' (돌연변이: {odd})', { odd: odd.join(', ') }) : ''}`;
}

/** Logs for a new loop's 포식 and 번식 (js/stump-box.js regress). */
export function regressLog(runtime, detail) {
    (detail.eaten || []).forEach(row => (0, runtime.deps.addLog)(biteLog(runtime, row), row.ate ? 'loot-rare' : 'season-up'));
    (detail.bred || []).forEach(row => (0, runtime.deps.addLog)(bredLog(runtime, row), row.item && (row.item.golden || row.item.family === 'scar') ? 'loot-unique' : 'loot-magic'));
    if (detail.sealed) (0, runtime.deps.addLog)((0, runtime.deps._t)('🔒 그루터기 함: 봉인 칸의 아이템 {sealed}개가 그대로 남았습니다.', { sealed: detail.sealed }), 'season-up');
}

export function pct(runtime, share) { return Math.round(share * 100); }
