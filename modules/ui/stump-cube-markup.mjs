import { esc, itemName, itemTone } from './stump-cube-items.mjs';
import { resultHtml, currentResult } from './stump-cube-picker.mjs';
import { syncStumpCubeOwner } from './stump-book-motion.mjs';

/** 비용 줄: 재화 이름은 제 색(getStyledOrbName), 모자라면 보유 수를 붉게. */
export function costHtml(runtime, cost) {
    const rows = Object.entries(cost || {}).map(([key, need]) => {
        const have = Math.floor(runtime.deps.game.currencies[key] || 0);
        return `${(0, runtime.deps.getStyledOrbName)(key)} ${need} <span class="${have < need ? 'is-bad' : 'stump-cube-have'}">${(0, runtime.deps._t)('(보유 {have})', { have })}</span>`;
    });
    return rows.length ? rows.join(', ') : '비용 없음';
}

export function recipeTones(runtime) {
    if (runtime.state.recipeTone) return runtime.state.recipeTone;
    const tones = new Map([...runtime.state.KIND_TONES, ...['unique', 'rare', 'magic'].map(key => [runtime.deps.ITEM_RARITY_LABELS[key], (0, runtime.deps.getRarityColor)(key)]),
        ...Object.values(runtime.deps.STUMP_BOX_COLORS).map(row => [row.label, row.tone])]);
    const words = [...tones.keys()].sort((a, b) => b.length - a.length);
    runtime.state.recipeTone = { tones, pattern: new RegExp(`(${words.join('|')})|(\\d+(?:%|개)?)`, 'g') };
    return runtime.state.recipeTone;
}

/** The book is parchment: each word keeps its game colour as --ink with an ink outline (css/stump-box.css); numbers are rubric red.
* is-tone tells statToneText.markup the span already has its colour. */
export function recipeToneHtml(runtime, text) {
    const { tones, pattern } = recipeTones(runtime);
    return esc(runtime, text).replace(pattern, (match, word) => (word ? `<span class="stump-ink is-tone" style="--ink:${tones.get(word)}">${match}</span>`
                : `<span class="stump-ink is-tone is-num">${match}</span>`));
}

/** A recipe's cost in the book: plain names (the styled currency names are drawn for dark windows), the held count red when short. */
export function bookCostHtml(runtime, cost) {
    const rows = Object.entries(cost || {}).map(([key, need]) => {
        const have = Math.floor(runtime.deps.game.currencies[key] || 0);
        return `${esc(runtime, (0, runtime.deps._t)(runtime.deps.ORB_DB[key].name))} ${need} <span class="${have < need ? 'is-short' : ''}">${(0, runtime.deps._t)('(보유 {have})', { have })}</span>`;
    });
    return rows.length ? rows.join(', ') : '비용 없음';
}

export function entryHtml(runtime, entry) {
    const wallet = entry.kind === 'wallet', name = `${itemName(runtime, entry.kind, entry.item)}${wallet ? (0, runtime.deps._t)(' (화폐화)') : ''}`, cell = entry.y * runtime.deps.stumpCube.SIZE + entry.x;
    // data-stump-drag-cube: the item can be dragged to another cube cell or out to the storage or bag (js/stump-box-drag-ui.js).
    return `<button type="button" class="stump-cube-item${entry.w * entry.h > 1 ? ' is-multi' : ''}${wallet ? ' is-wallet' : ''}" data-stump-action="cube-cell" data-cell="${cell}" data-stump-drop-cube="${cell}"`
        + ` data-stump-drag-cube="${cell}" data-cube-w="${entry.w}" data-cube-h="${entry.h}"`
        + ` style="grid-column:${track(runtime, entry.x, entry.w)};grid-row:${track(runtime, entry.y, entry.h)};--cube-tone:${itemTone(runtime, entry.kind, entry.item)}"`
        + ` ${(0, runtime.deps._t)('data-tip="{name}, 누르면 꺼냅니다" aria-label="{name2} 꺼내기">', { name: esc(runtime, name), name2: esc(runtime, name) })}<img src="${runtime.state.ICONS[entry.kind](entry.item)}" alt="" draggable="false"></button>`;
}

export function gridHtml(runtime, list) {
    const cells = Array.from({ length: runtime.deps.stumpCube.SIZE * runtime.deps.stumpCube.SIZE }, (_, cell) => `<button type="button" class="stump-cube-cell"`
            + ` data-stump-action="cube-open" data-stump-drop-cube="${cell}" style="grid-column:${track(runtime, cell % runtime.deps.stumpCube.SIZE)};grid-row:${track(runtime, Math.floor(cell / runtime.deps.stumpCube.SIZE))}"`
            + ` ${(0, runtime.deps._t)('aria-label="빈 칸, 재료 넣기">')}</button>`).join('');
    return `<div class="stump-cube-grid" role="grid" aria-label="${(0, runtime.deps._t)('조합창 {SIZE}×{SIZE2}', { SIZE: runtime.deps.stumpCube.SIZE, SIZE2: runtime.deps.stumpCube.SIZE })}">${cells}${list.map(runtime.handlers.entryHtml).join('')}</div>`;
}

export function previewFactsHtml(runtime, outcome) {
    const badges = [];
    if (outcome.tier !== undefined) badges.push(`T${outcome.tier}`);
    if (outcome.quality !== undefined) badges.push(`품질 ${outcome.quality}%`);
    if (outcome.qualityCap !== undefined) badges.push(`현재 상한 ${outcome.qualityCap}%`);
    return `<strong class="stump-cube-preview-name">${esc(runtime, (0, runtime.deps._t)(outcome.label))}</strong>`
        + (badges.length ? `<p class="stump-cube-preview-meta">${runtime.deps.statToneText.html(badges.join(', '))}</p>` : '')
        + (outcome.keep ? `<p><b>${(0, runtime.deps._t)('유지')}</b> ${runtime.deps.statToneText.html(outcome.keep)}</p>` : '')
        + (outcome.change ? `<p><b>${(0, runtime.deps._t)('변경')}</b> ${runtime.deps.statToneText.html(outcome.change)}</p>` : '')
        + (outcome.note ? `<p class="stump-cube-preview-note">${runtime.deps.statToneText.html((0, runtime.deps._t)(outcome.note))}</p>` : '');
}

export function statusHtml(runtime, found, list, matched) {
    // 비어 있으면 아무 말도 하지 않는다(빈 칸과 [재료 넣기]가 할 일을 보여 준다).
    if (!list.length) return '';
    if (list.some(entry => entry.item.locked)) return '<p class="stump-line is-bad">잠긴 재료를 조합창에서 꺼내 주세요.</p>';
    // A hidden recipe that happens to match says nothing about its result; the revealed hints come first.
    if (!found) return missingRecipesHtml(runtime, matched);
    const lacking = runtime.deps.stumpCube.missingCost(found.recipe).length > 0;
    return `<div class="stump-cube-status"><p class="stump-cube-preview-title">${(0, runtime.deps._t)('예상 결과')} <span>${esc(runtime, (0, runtime.deps._t)(found.recipe.name))}</span></p>`
        + previewFactsHtml(runtime, found) + (found.reason ? `<p class="stump-line is-bad">${esc(runtime, found.reason)}</p>` : '')
        + `<p class="stump-line${lacking ? ' is-bad' : ''}">${found.recipe.costText ? recipeToneHtml(runtime, found.recipe.costText) : costHtml(runtime, found.recipe.cost)}</p></div>`;
}

export function sharedMaterialValue(runtime, { rule, picked }, key) {
    return (rule.same || []).includes(key) ? picked[0]?.item[key] : undefined;
}

/** '꽃/열매', '뿌리', '성장 완료 씨앗' for a grown row, '씨앗류' for growing seeds (their kind is not known yet). */
export function missingFamilyLabel(runtime, family, ripe, path) {
    if (family !== 'seed') return family === 'talisman' ? '부적' : '흉터';
    const label = [].concat(path || []).map(kind => runtime.deps.STUMP_BOX_STAGES[kind].label).join('/');
    return ripe ? label || '성장 완료 씨앗' : '씨앗류';
}

/** Describe the missing row using the same-kind/colour/name already placed, without revealing any hidden recipe. */
export function missingMaterialLabel(runtime, row) {
    const { rule } = row, name = sharedMaterialValue(runtime, row, 'name');
    if (name) return name;
    const rarity = rule.rarity ? [].concat(rule.rarity).map(key => runtime.deps.ITEM_RARITY_LABELS[key]).join('/') + ' ' : '';
    if (rule.kind !== 'stump') return rule.socketable ? '소켓 가능한 장신구' : rarity + runtime.state.KIND_LABELS[rule.kind];
    const family = sharedMaterialValue(runtime, row, 'family') || rule.family, path = sharedMaterialValue(runtime, row, 'path') || rule.path;
    const color = sharedMaterialValue(runtime, row, 'color');
    const names = [].concat(family).map(key => missingFamilyLabel(runtime, key, rule.ripe, path));
    return (color ? runtime.deps.STUMP_BOX_COLORS[color].label + ' ' : '') + rarity + names.join('/');
}

export function missingRecipesHtml(runtime, matched) {
    const hints = runtime.deps.stumpCube.missingRecipes().slice(0, 3);
    if (!hints.length) return `<p class="stump-status">${matched ? (0, runtime.deps._t)('결과 미확인') : (0, runtime.deps._t)('맞는 조합법 없음')}</p>`;
    return '<ul class="stump-cube-missing">' + hints.map(hint => `<li><strong>${esc(runtime, (0, runtime.deps._t)(hint.recipe.name))}</strong>`
            + `<span>${hint.missing.map(row => `${runtime.deps.statToneText.html(missingMaterialLabel(runtime, row))} <b class="stump-cube-shortage">${(0, runtime.deps._t)('{count}개 부족', { count: row.count })}</b>`).join(', ')}</span></li>`).join('') + '</ul>';
}

export function recipeBookHtml(runtime) {
    const shown = runtime.deps.stumpCube.revealed(runtime.deps.game), hidden = runtime.deps.STUMP_CUBE_RECIPES.length - shown.length;
    const rows = shown.map(recipe => `<li style="--recipe-tone:${runtime.state.GROUP_TONES[recipe.group] || '#e6c67f'}">`
            + `<span class="stump-book-entry-head"><span class="stump-book-group">${esc(runtime, recipe.group)}</span><strong>${recipeToneHtml(runtime, recipe.name)}</strong></span>`
            + bookLineHtml(runtime, '재료', recipeToneHtml(runtime, recipe.need)) + bookLineHtml(runtime, '결과', recipeToneHtml(runtime, recipe.result) + bookCapHtml(runtime, recipe))
            + (recipe.note ? `<small class="stump-book-note">${keepBracketsHtml(runtime, recipeToneHtml(runtime, recipe.note))}${bookTierCapHtml(runtime, recipe)}</small>` : '')
            + bookCostLineHtml(runtime, recipe) + '</li>').join('');
    const more = hidden ? `<li class="is-hidden">${(0, runtime.deps._t)('아직 모르는 조합법 {hidden}개 (새 재료가 성장 완료되거나 해금되면 공개)', { hidden })}</li>` : '';
    return `<ul class="stump-book-list stump-book-page">${rows}${more}</ul>`;
}

export function bookCostLineHtml(runtime, recipe) {
    if (recipe.costText) return bookLineHtml(runtime, '비용', recipeToneHtml(runtime, recipe.costText));
    return Object.keys(recipe.cost || {}).length ? bookLineHtml(runtime, '비용', bookCostHtml(runtime, recipe.cost)) : '';
}

/** A short bracket ("(꽃, 열매, 덩굴, 뿌리 소켓)") moves to the next line whole instead of breaking inside (2026-10-29 사용자: 설명 도중에
* 줄 바뀌는 부분은 미리 줄바꾸기). Long ones still wrap. The html holds only tone spans, which carry no brackets. */
export function keepBracketsHtml(runtime, html) {
    return html.replace(/\([^()]*\)/g, part => (part.replace(/<[^>]+>/g, '').length <= 18 ? `<span class="stump-book-keep">${part}</span>` : part));
}

/** 합치기의 품질 상한(해금으로 오른다): 결과 줄 끝에 지금 값을 붙인다. */
export function bookCapHtml(runtime, recipe) {
    return recipe.id === 'stump_merge' ? (0, runtime.deps._t)(' (상한 {value})', { value: recipeToneHtml(runtime, Math.round(runtime.deps.stumpBox.rollCap(runtime.deps.game) * 100) + '%') }) : '';
}

/** 단련의 티어 상한(지금 레벨에서 떨어지는 티어, js/stump-cube-recipes.js rareTierTarget): 덧붙임 끝에 지금 값을 붙인다. */
export function bookTierCapHtml(runtime, recipe) {
    return recipe.id === 'equip_rare_tier' ? ` T${runtime.deps.levelProgression.maxDropTier(Math.floor(Number(runtime.deps.game.level) || 1))}` : '';
}

/** The cube's 5×5 cells, drawn inside the stump box frame when the frame shows the cube (js/stump-box-ui.js). */
export function cubeGridHtml(runtime) { return gridHtml(runtime, runtime.deps.stumpCube.entries()); }

/** Under the frame while it shows the cube: the matching recipe and cost, the quick fill and the last result. */
export function cubeHtml(runtime) {
    const list = runtime.deps.stumpCube.entries(), found = runtime.deps.stumpCube.preview(), matched = runtime.deps.stumpCube.match();
    return statusHtml(runtime, found, list, matched) + quickFillHtml(runtime) + resultHtml(runtime);
}

/** 바로 넣기: one button per revealed recipe the stored items make now (not the one already in the cube). Pressing it empties the cube
* and puts that set in, the plainest materials first (stumpCube.readyCubeSets). */
export function quickFillRecipes(runtime) {
    const current = runtime.deps.stumpCube.match()?.recipe.id;
    return runtime.deps.stumpCube.readyCubeSets().map(row => row.recipe).filter(recipe => recipe.id !== current);
}

export function quickFillHtml(runtime) {
    const recipes = quickFillRecipes(runtime);
    if (!recipes.length) return '';
    return '<div class="stump-cube-quick" role="group" aria-label="바로 넣기"><span>바로 넣기</span>' + recipes.map(recipe => `<button type="button"`
            + ` data-stump-action="cube-quick" data-recipe="${recipe.id}" style="--recipe-tone:${runtime.state.GROUP_TONES[recipe.group] || '#e6c67f'}">${esc(runtime, (0, runtime.deps._t)(recipe.name))}</button>`).join('') + '</div>';
}

/** What the screen shows depends on these, so the stump tab repaints when they change. */
export function cubeSignature(runtime) {
    syncStumpCubeOwner(runtime);
    const found = runtime.deps.stumpCube.preview(), matched = runtime.deps.stumpCube.match(), revealed = runtime.deps.stumpCube.revealed(runtime.deps.game);
    const costs = Object.keys((matched && matched.recipe.cost) || {});
    return JSON.stringify([runtime.deps.stumpCube.entries().map(entry => [entry.kind, entry.id, entry.x, entry.y, entry.item]), found,
        costs.map(key => [key, runtime.deps.game.currencies[key] || 0]), !!runtime.deps.game.woodsmanBuildLock, runtime.deps.stumpBox.rollCap(runtime.deps.game),
        revealed.map(recipe => recipe.id), currentResult(runtime)?.outputs, quickFillRecipes(runtime).map(recipe => recipe.id)]);
}


export function track(runtime, at, span = 1) { return `${at * 2 + 1} / span ${span * 2 - 1}`; }

export function bookLineHtml(runtime, label, html) { return `<span class="stump-book-line"><b>${label}</b><span>${keepBracketsHtml(runtime, html)}</span></span>`; }
