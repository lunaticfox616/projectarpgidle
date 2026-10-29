// 조합창 화면: 5×5 칸(그루터기 함 판과 같은 틀 자리, 틀 위 생명의 나무로 서로 바꾼다: js/stump-box-ui.js), 틀 아래에 맞는 조합법과 비용,
// 바로 넣기, 최근 결과. 조합은 틀의 아래 보석, 비우기는 오른쪽 보석이 한다(2026-10-29 사용자: 틀 아래 단추 넷을 지웠다). 빈 칸을 누르면
// 재료 고르기(선택 대화 상자: 장비 · 그루터기 · 주얼 · 코어)가 열린다. 조합법은 틀 아래의 책: 누르면 책이 화면 가운데로 커지며 펼쳐진다.
// 칸과 책 단추는 stump-box-ui.js의 클릭 위임(data-stump-action)이 이 모듈의 동작을 부르고, 대화 상자 단추는 직접 부른다. 규칙은 stump-cube.js.
const stumpCubeUi = (() => {
    const OVERLAY_ID = 'stump-cube-picker';
    const KIND_LABELS = { equipment: '장비', stump: '그루터기', jewel: '주얼', core: '코어' };
    let pickerKind = 'equipment';
    let pickerItems = [], pickerSelection = null, lastResult = null;

    function esc(text) { return escapeHTML(String(text)); }

    const ICONS = Object.freeze({
        equipment: item => getEquipmentGridVisualAsset(item),
        stump: item => stumpBox.iconPath(item),
        jewel: item => getInventoryItemVisualAsset(item, 'jewel'),
        core: item => coreItems.icon(item)
    });

    function itemName(kind, item) {
        if (kind === 'currency') return ORB_DB[item.currency].name;
        return kind === 'stump' ? stumpBox.label(item) : String(item.name || KIND_LABELS[kind]);
    }

    function itemTone(kind, item) {
        if (kind === 'stump' && item.color) return STUMP_BOX_COLORS[item.color].tone;
        if (kind === 'stump' && item.family === 'scar') return STUMP_BOX_SCAR.tone;
        return getRarityColor(item.rarity || 'normal');
    }

    /** 비용 줄: 재화 이름은 제 색(getStyledOrbName), 모자라면 보유 수를 붉게. */
    function costHtml(cost) {
        const rows = Object.entries(cost || {}).map(([key, need]) => {
            const have = Math.floor(game.currencies[key] || 0);
            return `${getStyledOrbName(key)} ${need} <span class="${have < need ? 'is-bad' : 'stump-cube-have'}">(보유 ${have})</span>`;
        });
        return rows.length ? rows.join(', ') : '비용 없음';
    }

    // 조합법 글의 색(2026-10-25 사용자 "조합법에도 색감 좀 넣어줘"): 희귀도는 그 등급 색, 재료 종류(장비, 씨앗, 꽃, 열매, 수액, 호박석,
    // 부적, 주얼, 코어)는 제 색, 화염 · 냉기 · 번개 · 카오스는 그루터기 함의 색, 수치는 조금 밝게. 나머지 글은 그대로 둔다.
    const GROUP_TONES = Object.freeze({ 장비: '#e6c67f', 그루터기: '#9fd46a', 부적: '#c9a0f0', 주얼: '#7fd6cf', 코어: '#f0a35a' });
    const KIND_TONES = Object.freeze([['장신구', '#e6c67f'], ['장비', '#e6c67f'], ['씨앗', '#9fd46a'], ['꽃', '#f0a8c8'], ['열매', '#e8955a'],
        ['호박석', '#f0c060'], ['수액', '#e0b04a'], ['부적', '#c9a0f0'], ['주얼', '#7fd6cf'], ['코어', '#f0a35a'], ['기폭제', '#f3d28c'], ['기름', '#f3d28c']]);
    let recipeTone = null;
    function recipeTones() {
        if (recipeTone) return recipeTone;
        const tones = new Map([...KIND_TONES, ...['unique', 'rare', 'magic'].map(key => [ITEM_RARITY_LABELS[key], getRarityColor(key)]),
            ...Object.values(STUMP_BOX_COLORS).map(row => [row.label, row.tone])]);
        const words = [...tones.keys()].sort((a, b) => b.length - a.length);
        recipeTone = { tones, pattern: new RegExp(`(${words.join('|')})|(\\d+(?:%|개)?)`, 'g') };
        return recipeTone;
    }
    /** The book is parchment: each word keeps its tone as --ink, which css/stump-box.css mixes with ink brown; numbers are rubric red. */
    function recipeToneHtml(text) {
        const { tones, pattern } = recipeTones();
        return esc(text).replace(pattern, (match, word) => (word ? `<span class="stump-ink" style="--ink:${tones.get(word)}">${match}</span>`
            : `<span class="stump-ink is-num">${match}</span>`));
    }
    /** A recipe's cost in the book: plain names (the styled currency names are drawn for dark windows), the held count red when short. */
    function bookCostHtml(cost) {
        const rows = Object.entries(cost || {}).map(([key, need]) => {
            const have = Math.floor(game.currencies[key] || 0);
            return `${esc(ORB_DB[key].name)} ${need} <span class="${have < need ? 'is-short' : ''}">(보유 ${have})</span>`;
        });
        return rows.length ? rows.join(', ') : '비용 없음';
    }

    // ── 칸 ─────────────────────────────────────────────────
    // 칸과 넣은 재료는 그루터기 함 보관함이나 장비 가방(왼쪽 보석으로 띄운 가방)에서 끌어 놓는 자리다(data-stump-drop-cube,
    // js/stump-box-drag-ui.js, js/equipment-inventory-grid-ui.js). 칸은 판처럼 틀의 구멍(홀수 줄)에 놓고, 여러 칸 재료는 그 사이 살까지
    // 덮어 한 덩어리로 보인다(2026-10-28 사용자: 중앙의 선을 가리도록, css/stump-box.css .is-multi).
    const track = (at, span = 1) => `${at * 2 + 1} / span ${span * 2 - 1}`;
    function entryHtml(entry) {
        const name = itemName(entry.kind, entry.item), cell = entry.y * stumpCube.SIZE + entry.x;
        return `<button type="button" class="stump-cube-item${entry.w * entry.h > 1 ? ' is-multi' : ''}" data-stump-action="cube-cell" data-cell="${cell}" data-stump-drop-cube="${cell}"`
            + ` style="grid-column:${track(entry.x, entry.w)};grid-row:${track(entry.y, entry.h)};--cube-tone:${itemTone(entry.kind, entry.item)}"`
            + ` title="${esc(name)}, 누르면 꺼냅니다" aria-label="${esc(name)} 꺼내기"><img src="${ICONS[entry.kind](entry.item)}" alt="" draggable="false"></button>`;
    }

    function gridHtml(list) {
        const cells = Array.from({ length: stumpCube.SIZE * stumpCube.SIZE }, (_, cell) => `<button type="button" class="stump-cube-cell"`
            + ` data-stump-action="cube-open" data-stump-drop-cube="${cell}" style="grid-column:${track(cell % stumpCube.SIZE)};grid-row:${track(Math.floor(cell / stumpCube.SIZE))}"`
            + ` aria-label="빈 칸, 재료 넣기"></button>`).join('');
        return `<div class="stump-cube-grid" role="grid" aria-label="조합창 ${stumpCube.SIZE}×${stumpCube.SIZE}">${cells}${list.map(entryHtml).join('')}</div>`;
    }

    function previewFactsHtml(outcome) {
        const badges = [];
        if (outcome.tier !== undefined) badges.push(`T${outcome.tier}`);
        if (outcome.quality !== undefined) badges.push(`품질 ${outcome.quality}%`);
        if (outcome.qualityCap !== undefined) badges.push(`현재 상한 ${outcome.qualityCap}%`);
        return `<strong class="stump-cube-preview-name">${esc(outcome.label)}</strong>`
            + (badges.length ? `<p class="stump-cube-preview-meta">${statToneText.html(badges.join(', '))}</p>` : '')
            + (outcome.keep ? `<p><b>유지</b> ${statToneText.html(outcome.keep)}</p>` : '')
            + (outcome.change ? `<p><b>변경</b> ${statToneText.html(outcome.change)}</p>` : '')
            + (outcome.note ? `<p class="stump-cube-preview-note">${statToneText.html(outcome.note)}</p>` : '');
    }

    function statusHtml(found, list, matched) {
        // 비어 있으면 아무 말도 하지 않는다(빈 칸과 [재료 넣기]가 할 일을 보여 준다).
        if (!list.length) return '';
        if (list.some(entry => entry.item.locked)) return '<p class="stump-line is-bad">잠긴 재료를 조합창에서 꺼내 주세요.</p>';
        // A hidden recipe that happens to match says nothing about its result; the revealed hints come first.
        if (!found) return missingRecipesHtml(matched);
        const lacking = stumpCube.missingCost(found.recipe).length > 0;
        return `<div class="stump-cube-status"><p class="stump-cube-preview-title">예상 결과 <span>${esc(found.recipe.name)}</span></p>`
            + previewFactsHtml(found) + (found.reason ? `<p class="stump-line is-bad">${esc(found.reason)}</p>` : '')
            + `<p class="stump-line${lacking ? ' is-bad' : ''}">${costHtml(found.recipe.cost)}</p></div>`;
    }

    function sharedMaterialValue({ rule, picked }, key) {
        return (rule.same || []).includes(key) ? picked[0]?.item[key] : undefined;
    }

    function missingFamilyLabel(family, ripe, path) {
        if (family === 'sap') return ripe ? '호박석' : '수액류';
        if (family !== 'seed') return family === 'talisman' ? '부적' : '흉터';
        const label = path ? STUMP_BOX_STAGES[path].label : '';
        if (ripe) return label || '성장 완료 씨앗';
        return `${label ? label + ' ' : ''}씨앗류`;
    }

    /** Describe the missing row using the same-kind/colour/name already placed, without revealing any hidden recipe. */
    function missingMaterialLabel(row) {
        const { rule } = row, name = sharedMaterialValue(row, 'name');
        if (name) return name;
        const rarity = rule.rarity ? [].concat(rule.rarity).map(key => ITEM_RARITY_LABELS[key]).join('/') + ' ' : '';
        if (rule.kind !== 'stump') return rule.socketable ? '소켓 가능한 장신구' : rarity + KIND_LABELS[rule.kind];
        const family = sharedMaterialValue(row, 'family') || rule.family, path = sharedMaterialValue(row, 'path') || rule.path;
        const color = sharedMaterialValue(row, 'color');
        const names = [].concat(family).map(key => missingFamilyLabel(key, rule.ripe, path));
        return (color ? STUMP_BOX_COLORS[color].label + ' ' : '') + rarity + names.join('/');
    }

    function missingRecipesHtml(matched) {
        const hints = stumpCube.missingRecipes().slice(0, 3);
        if (!hints.length) return `<p class="stump-status">${matched ? '결과 미확인' : '맞는 조합법 없음'}</p>`;
        return '<ul class="stump-cube-missing">' + hints.map(hint => `<li><strong>${esc(hint.recipe.name)}</strong>`
            + `<span>${hint.missing.map(row => `${statToneText.html(missingMaterialLabel(row))} <b class="stump-cube-shortage">${row.count}개 부족</b>`).join(', ')}</span></li>`).join('') + '</ul>';
    }

    /** 조합법 책의 글: 재료가 생길 수 있게 된 조합법만(조합법 발견, stumpCube.revealed). 나머지는 개수만 알린다. 양피지 위라 낱말 색은
     * 먹빛으로 어둡게 섞는다(css/stump-box.css .stump-book). */
    function recipeBookHtml() {
        const shown = stumpCube.revealed(game), hidden = STUMP_CUBE_RECIPES.length - shown.length;
        const rows = shown.map(recipe => `<li style="--recipe-tone:${GROUP_TONES[recipe.group] || '#e6c67f'}">`
            + `<span class="stump-book-entry-head"><span class="stump-book-group">${esc(recipe.group)}</span><strong>${esc(recipe.name)}</strong></span>`
            + `<span>${recipeToneHtml(recipe.need)} <b class="stump-book-arrow">→</b> ${recipeToneHtml(recipe.result)}`
            + `${recipe.id === 'stump_merge' ? ` 현재 ${recipeToneHtml(Math.round(stumpBox.rollCap(game) * 100) + '%')}` : ''}</span><small>${bookCostHtml(recipe.cost)}</small></li>`).join('');
        const more = hidden ? `<li class="is-hidden">아직 모르는 조합법 ${hidden}개 (새 재료가 성장 완료되거나 해금되면 공개)</li>` : '';
        return `<h3 class="stump-book-title">조합법</h3><ul class="stump-book-list">${rows}${more}</ul>`;
    }

    /** The cube's 5×5 cells, drawn inside the stump box frame when the frame shows the cube (js/stump-box-ui.js). */
    function cubeGridHtml() { return gridHtml(stumpCube.entries()); }

    /** Under the frame while it shows the cube: the matching recipe and cost, the quick fill and the last result. */
    function cubeHtml() {
        const list = stumpCube.entries(), found = stumpCube.preview(), matched = stumpCube.match();
        return statusHtml(found, list, matched) + quickFillHtml() + resultHtml();
    }

    /** 바로 넣기: one button per revealed recipe the stored items make now (not the one already in the cube). Pressing it empties the cube
     * and puts that set in, the plainest materials first (stumpCube.readyCubeSets). */
    function quickFillRecipes() {
        const current = stumpCube.match()?.recipe.id;
        return stumpCube.readyCubeSets().map(row => row.recipe).filter(recipe => recipe.id !== current);
    }

    function quickFillHtml() {
        const recipes = quickFillRecipes();
        if (!recipes.length) return '';
        return '<div class="stump-cube-quick" role="group" aria-label="바로 넣기"><span>바로 넣기</span>' + recipes.map(recipe => `<button type="button"`
            + ` data-stump-action="cube-quick" data-recipe="${recipe.id}" style="--recipe-tone:${GROUP_TONES[recipe.group] || '#e6c67f'}">${esc(recipe.name)}</button>`).join('') + '</div>';
    }

    /** What the screen shows depends on these, so the stump tab repaints when they change. */
    function cubeSignature() {
        const found = stumpCube.preview(), matched = stumpCube.match(), revealed = stumpCube.revealed(game);
        const costs = Object.keys((matched && matched.recipe.cost) || {});
        return JSON.stringify([stumpCube.entries().map(entry => [entry.kind, entry.id, entry.x, entry.y, entry.item]), found,
            costs.map(key => [key, game.currencies[key] || 0]), !!game.woodsmanBuildLock, stumpBox.rollCap(game),
            revealed.map(recipe => recipe.id), currentResult()?.outputs, quickFillRecipes().map(recipe => recipe.id)]);
    }

    // ── 재료 고르기 ─────────────────────────────────────────
    function candidateMeta(kind, item) {
        // Candidates and results are stored, so an unripe one is not growing yet ("성장 중" means placed on the board).
        if (kind === 'stump' && item.color) return `품질 ${Math.round(item.roll * 100)}%, ${stumpBox.isMature(item) ? '성장 완료' : '성장 전'}`;
        const rarity = ITEM_RARITY_LABELS[item.rarity] || '';
        if (kind === 'equipment') return equipmentMeta(item, rarity);
        if (kind === 'core') return item.perfect ? '완전한 코어' : `${rarity} 코어`;
        if (kind === 'currency') return `${item.amount}개 획득`;
        return rarity || KIND_LABELS[kind];
    }

    function equipmentMeta(item, rarity) {
        return `${rarity} T${getItemCraftTier(item)}, 품질 ${Math.max(0, Math.floor(Number(item.quality) || 0))}%`;
    }

    /** A short identifying option; the selection panel below always carries the full existing item details. */
    function firstOption(kind, item) {
        if (kind === 'core') return item.lines[0] ? coreItems.describe(item.lines[0]) : '';
        if (kind === 'stump') return stumpFirstOption(item);
        if (kind === 'currency') return '';
        return firstStatOption(kind, item);
    }

    function stumpFirstOption(item) {
        if (item.family === 'talisman') return item.uniqueEffect || (item.lines[0] ? talismans.describeLine(item.lines[0]) : '');
        const gain = stumpBox.yieldOf(item);
        return gain ? gain.text.replace('{v}', String(Math.round(gain.value * stumpBox.qualityOf(item) * stumpBox.goldenMul(item) * 100) / 100)) : '';
    }

    function firstStatOption(kind, item) {
        const stat = kind === 'jewel' ? getJewelStats(item)[0] : ((item.stats || [])[0] || (item.baseStats || [])[0]);
        if (!stat) return '';
        const key = stat.id || stat.stat;
        return `${stat.statName || getStatName(key)} ${formatSignedValue(key, stat.val)}`;
    }

    function renderMaterialDetail(panel) {
        const detail = panel.querySelector('.stump-cube-material-detail');
        detail.style.setProperty('--cube-tone', pickerSelection ? itemTone(pickerSelection.kind, pickerSelection.item) : '#8c7043');
        if (!pickerSelection) {
            detail.innerHTML = '<p class="selection-overlay-help">재료를 골라 옵션을 확인하세요.</p>';
            return;
        }
        const { kind, item } = pickerSelection;
        detail.innerHTML = `<div class="stump-cube-material-head"><img src="${ICONS[kind](item)}" alt="" draggable="false">`
            + `<span>${statToneText.html(candidateMeta(kind, item))}</span></div><div class="stump-cube-material-options equipment-inspection-tooltip"></div>`
            + '<button type="button" class="stump-cube-material-add" onclick="stumpCubeUi.pickCubeItem()">조합창에 넣기</button>';
        const body = detail.querySelector('.stump-cube-material-options');
        renderItemDetails(body, kind, item);
    }

    function renderItemDetails(body, kind, item, snapshot = false) {
        if (kind === 'stump') body.innerHTML = statToneText.markup(stumpBoxUi.itemTipHtml(item, snapshot));
        else if (kind === 'currency') body.innerHTML = `<h3>${esc(ORB_DB[item.currency].name)}</h3><p>${statToneText.html(ORB_DB[item.currency].desc || '')}</p>`;
        else showItemTooltip(null, null, false, item, { target: body });
    }

    // Keep the actual rolled result, not a fresh roll or a reference that later crafting can change.
    function currentResult() {
        if (lastResult && (lastResult.state !== game || lastResult.season !== game.season)) lastResult = null;
        return lastResult;
    }

    function resultCardHtml({ kind, item }, index) {
        const option = firstOption(kind, item);
        return `<button type="button" class="stump-cube-result-card" onclick="stumpCubeUi.inspectCubeResult(${index})" style="--cube-tone:${itemTone(kind, item)}">`
            + `${resultArtHtml(kind, item)}<span><strong>${esc(itemName(kind, item))}</strong>`
            + `<span>${statToneText.html(candidateMeta(kind, item))}</span>${option ? `<span>${statToneText.html(option)}</span>` : ''}`
            + '<small>결과 자세히 보기</small></span></button>';
    }

    function resultArtHtml(kind, item) {
        if (kind === 'currency') {
            const icon = ORB_DB[item.currency].icon;
            return icon ? `<img src="${icon}" alt="" draggable="false">` : '';
        }
        return `<img src="${ICONS[kind](item)}" alt="" draggable="false">`;
    }

    function resultHtml() {
        const result = currentResult();
        if (!result) return '';
        return `<section class="stump-cube-result" aria-label="최근 조합 결과"><h4>방금 만든 결과</h4>${result.outputs.map(resultCardHtml).join('')}</section>`;
    }

    function inspectCubeResult(index) {
        const row = currentResult()?.outputs[index];
        if (!row) return;
        const { kind, item } = row;
        const panel = selectionDialog.show({ id: 'stump-cube-result', title: '조합 결과', panelClass: 'stump-cube-result-panel',
            body: `<div class="stump-cube-material-head">${resultArtHtml(kind, item)}<span>${statToneText.html(candidateMeta(kind, item))}</span></div>`
                + '<div class="stump-cube-material-options equipment-inspection-tooltip"></div><p class="selection-overlay-help">제작 직후의 결과입니다.</p>' });
        renderItemDetails(panel.querySelector('.stump-cube-material-options'), kind, item, true);
    }

    /** Indices only address the rendered snapshot, never a newly reordered inventory. Insertion revalidates the same object. */
    function selectCubeItem(index) {
        const item = pickerItems[index];
        if (!item || !stumpCube.candidates(pickerKind).includes(item)) {
            showGameToast('재료 상태가 바뀌었습니다. 다시 선택해 주세요.', { tone: 'warning' });
            return openCubePicker(pickerKind);
        }
        pickerSelection = { kind: pickerKind, item };
        const panel = document.getElementById(OVERLAY_ID)?.querySelector('.selection-overlay-panel');
        if (!panel) return;
        panel.querySelectorAll('[data-cube-candidate]').forEach(button => {
            const selected = Number(button.dataset.cubeCandidate) === index;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        renderMaterialDetail(panel);
    }

    function candidateHtml(kind, item, index) {
        const name = itemName(kind, item), selected = pickerSelection?.item === item, option = firstOption(kind, item);
        return `<button type="button" class="stump-cube-candidate${selected ? ' is-selected' : ''}" data-cube-candidate="${index}"`
            + ` onclick="stumpCubeUi.selectCubeItem(${index})" ondblclick="stumpCubeUi.pickCubeItem()" aria-pressed="${selected}" style="--cube-tone:${itemTone(kind, item)}">`
            + `<img src="${ICONS[kind](item)}" alt="" draggable="false"><span class="stump-cube-candidate-copy"><strong>${esc(name)}</strong>`
            + `<span class="stump-cube-candidate-meta">${statToneText.html(candidateMeta(kind, item))}</span>`
            + `${option ? `<span class="stump-cube-candidate-option">${statToneText.html(option)}</span>` : ''}</span></button>`;
    }

    function pickerBodyHtml() {
        const tabs = stumpCube.KINDS.map(kind => `<button type="button" class="${kind === pickerKind ? 'is-on' : ''}" aria-pressed="${kind === pickerKind}"`
            + ` onclick="stumpCubeUi.openCubePicker('${kind}')">${KIND_LABELS[kind]} ${stumpCube.candidates(kind).length}</button>`).join('');
        pickerItems = stumpCube.candidates(pickerKind);
        if (pickerSelection && !pickerItems.includes(pickerSelection.item)) pickerSelection = null;
        const list = pickerItems.map((item, index) => candidateHtml(pickerKind, item, index)).join('');
        return `<div class="stump-cube-picker-tabs">${tabs}</div><div class="stump-cube-picker-layout">
            <div class="stump-cube-candidates">${list || '<p class="selection-overlay-help">넣을 수 있는 아이템이 없습니다.</p>'}</div>
            <section class="stump-cube-material-detail" aria-label="고른 재료 정보"></section></div>`;
    }

    /** Opens the picker, or redraws it in place (another kind, or after putting an item in). */
    function openCubePicker(kind) {
        if (!selectionDialog.isOpen(OVERLAY_ID) || (kind && kind !== pickerKind)) pickerSelection = null;
        if (stumpCube.KINDS.includes(kind)) pickerKind = kind;
        const panel = selectionDialog.show({ id: OVERLAY_ID, title: '조합창에 넣을 재료', panelClass: 'stump-cube-picker-panel', body: pickerBodyHtml() });
        renderMaterialDetail(panel);
    }

    function closeCubePicker() {
        pickerSelection = null;
        selectionDialog.close(OVERLAY_ID);
    }

    function refreshCube() {
        if (selectionDialog.isOpen(OVERLAY_ID)) openCubePicker(pickerKind);
        stumpBoxUi.refreshStumpTabNow();
    }

    function pickCubeItem() {
        const selected = pickerSelection;
        const usable = selected && stumpCube.candidates(selected.kind).includes(selected.item);
        const reason = usable ? stumpCube.put(game, selected.kind, selected.item) : '재료 상태가 바뀌었습니다. 다시 선택해 주세요.';
        if (reason) showGameToast(reason, { tone: 'warning' });
        pickerSelection = null;
        refreshCube();
    }

    // ── 칸 · 단추 동작(stump-box-ui.js의 클릭 위임에서) ───────────────────────
    function takeOutCubeCell(cell) {
        if (stumpCube.takeOut(game, cell)) refreshCube();
    }

    /** A stored stump item into the cube: double-clicked in storage, or dropped on a cube cell (it goes there when it fits). */
    function putStumpItem(id, cell) {
        const item = stumpBox.itemById(game, id);
        const reason = item ? stumpCube.put(game, 'stump', item, cell) : '재료 상태가 바뀌었습니다. 다시 선택해 주세요.';
        if (reason) showGameToast(reason, { tone: 'warning' });
        refreshCube();
        return !reason;
    }

    function quickFillCube(recipeId) {
        const reason = stumpCube.fillCubeRecipe(game, recipeId);
        if (reason) showGameToast(reason, { tone: 'warning' });
        refreshCube();
    }

    /** 아래 보석(조합창): 맞는 조합법대로 조합한다. */
    function transmuteCube() {
        const result = stumpCube.transmute();
        playUiFeedbackSound(result.ok ? 'craftSuccess' : 'craftFailure');
        if (!result.ok) return showGameToast(result.reason, { tone: 'warning' });
        lastResult = { state: game, season: game.season, outputs: JSON.parse(JSON.stringify(result.outputs)) };
        const names = result.outputs.map(row => itemName(row.kind, row.item)).join(', ');
        addLog(`🧩 조합창 ${result.recipe.name}: ${names}`, 'loot-rare');
        // 완전한 코어(js/core-items.js rollPerfect)는 드랍처럼 체이싱 티어 알림도
        result.outputs.filter(row => row.kind === 'core' && row.item && row.item.perfect)
            .forEach(row => dispatchRuntimeEvent('incident', { text: `체이싱 코어를 획득했습니다. 「${row.item.name}」`, tone: 'chase', chase: true }));
        queueImportantSave(300);
        updateStaticUI();
        refreshCube();
    }

    /** Bag gear into the cube (a drop on a cube cell, or a double-click while the frame shows the cube). @returns {boolean} true when the
     * frame shows the cube (the bag then does nothing else with it), whether or not it went in. */
    function putBagItem(item, cell) {
        if (!stumpBoxUi.frameShowsCube()) return false;
        const usable = stumpCube.candidates('equipment').includes(item);
        const reason = usable ? stumpCube.put(game, 'equipment', item, cell) : '조합창에 넣을 수 없는 장비입니다.';
        if (reason) showGameToast(reason, { tone: 'warning' });
        refreshCube();
        return true;
    }

    // ── 조합법 책(2026-10-29 사용자: 책 모양을 누르면 책이 화면에 커지면서 펼쳐지고 그 안에 쓰여 있게) ─────────────
    // 닫힌 책(assets/ui/grove/recipe-book.png)이 단추 자리에서 화면 가운데로 커지고, 겉표지가 등을 축으로 넘어가며 두 쪽이 펼쳐진다.
    // 글은 두 쪽에 걸쳐 흐르는 단(css columns)이고, 넘치면 아래 모서리의 화살표로 장을 넘긴다. 휴대폰은 한 쪽씩 본다.
    // 움직임을 줄이는 설정이면 바로 펼친 책을 보인다.
    // bookOpening counts each open and close, so a cover turn still running when the book closes leaves the next opening alone.
    let bookDialog = null, bookSpread = 0, bookOpening = 0;
    const BOOK_GROW_MS = 360, BOOK_OPEN_MS = 560, BOOK_CLOSE_MS = 160;
    const bookCount = () => `${stumpCube.revealed(game).length}/${STUMP_CUBE_RECIPES.length}`;
    /** The closed book under the frame (both sides of the frame: the board's bottom gem merges by one of its recipes). */
    function bookButtonHtml() {
        return `<button type="button" class="stump-recipe-book" data-stump-action="recipe-book" aria-haspopup="dialog" title="조합법 ${bookCount()}">`
            + `<img src="assets/ui/grove/recipe-book.png" alt="" draggable="false"><span>조합법 ${bookCount()}</span></button>`;
    }
    function bookMarkup() {
        return '<div class="stump-book-volume"><div class="stump-book-spread"><div class="stump-book-paper is-left"></div><div class="stump-book-paper is-right"></div>'
            + `<div class="stump-book-text">${recipeBookHtml()}</div></div>`
            + '<div class="stump-book-cover" aria-hidden="true"><div class="stump-book-cover-front"></div><div class="stump-book-cover-back"></div></div>'
            + '<button type="button" class="stump-book-turn is-prev" aria-label="앞 장" data-book-turn="-1">◀</button>'
            + '<button type="button" class="stump-book-turn is-next" aria-label="다음 장" data-book-turn="1">▶</button>'
            + '<button type="button" class="stump-book-close" aria-label="책 덮기" data-book-close>✕</button></div>';
    }
    function ensureBookDialog() {
        if (bookDialog) return bookDialog;
        bookDialog = document.createElement('dialog');
        bookDialog.className = 'stump-book';
        bookDialog.setAttribute('aria-label', '조합법');
        bookDialog.addEventListener('click', onBookClick);
        bookDialog.addEventListener('cancel', event => { event.preventDefault(); closeRecipeBook(); });
        document.body.appendChild(bookDialog);
        return bookDialog;
    }
    function onBookClick(event) {
        const turn = event.target.closest('[data-book-turn]');
        if (turn) return turnBookPage(Number(turn.dataset.bookTurn));
        if (event.target === bookDialog || event.target.closest('[data-book-close]')) closeRecipeBook();
    }
    /** How far one spread (two pages, or one on a phone) moves the text, and how many there are. */
    function bookSteps(text) {
        const gap = parseFloat(getComputedStyle(text).columnGap) || 0, step = text.clientWidth + gap;
        return { step, count: Math.max(1, Math.round((text.scrollWidth + gap) / step)) };
    }
    function turnBookPage(delta) {
        const text = bookDialog?.querySelector('.stump-book-text');
        if (!text) return;
        const { step, count } = bookSteps(text);
        bookSpread = Math.max(0, Math.min(count - 1, bookSpread + delta));
        text.scrollLeft = bookSpread * step;
        markBookTurns(count);
        if (delta) playUiFeedbackSound('uiSelect');
    }
    function markBookTurns(count) {
        bookDialog.querySelector('.is-prev').disabled = bookSpread === 0;
        bookDialog.querySelector('.is-next').disabled = bookSpread >= count - 1;
    }
    function openRecipeBook(button) {
        const dialog = ensureBookDialog();
        dialog.innerHTML = bookMarkup();
        bookSpread = 0;
        bookOpening += 1;
        dialog.classList.remove('is-open');
        dialog.classList.add('is-closed');
        dialog.showModal();
        playUiFeedbackSound('stumpFrameSwitch');
        turnBookPage(0);
        const volume = dialog.querySelector('.stump-book-volume');
        if (uiDisplay.matches('(prefers-reduced-motion: reduce)') || !volume.animate) return dialog.classList.replace('is-closed', 'is-open');
        growBook(volume, button.querySelector('img') || button);
    }
    /** The closed book (the cover over the right page) flies from its button to the middle, then the cover turns over the spine. */
    function growBook(volume, from) {
        const box = volume.getBoundingClientRect(), single = uiDisplay.matches('(max-width: 640px)');
        const cover = volume.querySelector('.stump-book-cover').getBoundingClientRect(), start = from.getBoundingClientRect();
        const shift = single ? 0 : -(cover.left + cover.width / 2 - (box.left + box.width / 2));
        const scale = Math.max(0.05, start.width / cover.width);
        const dx = start.left + start.width / 2 - (cover.left + cover.width / 2), dy = start.top + start.height / 2 - (cover.top + cover.height / 2);
        const fly = volume.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: `${cover.left + cover.width / 2 - box.left}px 50%` },
            { transform: `translate(${shift}px, 0) scale(1)`, transformOrigin: `${cover.left + cover.width / 2 - box.left}px 50%` }],
            { duration: BOOK_GROW_MS, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'both' });
        const opening = bookOpening;
        fly.finished.then(() => opening === bookOpening && openBookCover(volume, shift), () => {});
    }
    /** The left page shows once the cover is over it (past the spine), and the cover fades off it at the end. */
    function openBookCover(volume, shift) {
        volume.animate([{ transform: `translate(${shift}px, 0)` }, { transform: 'translate(0, 0)' }], { duration: BOOK_OPEN_MS, easing: 'ease-in-out', fill: 'both' });
        const turn = volume.querySelector('.stump-book-cover').animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }],
            { duration: BOOK_OPEN_MS, easing: 'ease-in-out', fill: 'both' });
        const opening = bookOpening;
        setTimeout(() => opening === bookOpening && bookDialog.classList.remove('is-closed'), BOOK_OPEN_MS / 2);
        turn.finished.then(() => opening === bookOpening && bookDialog.classList.add('is-open'), () => {});
    }
    function closeRecipeBook() {
        if (!bookDialog?.open) return;
        bookOpening += 1;
        const volume = bookDialog.querySelector('.stump-book-volume'), done = () => { bookDialog.close(); bookDialog.classList.remove('is-open', 'is-closed'); };
        if (uiDisplay.matches('(prefers-reduced-motion: reduce)') || !volume.animate) return done();
        volume.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(.94)' }], { duration: BOOK_CLOSE_MS, easing: 'ease-in', fill: 'both' })
            .finished.then(done, done);
    }

    return Object.freeze({ cubeHtml, cubeGridHtml, cubeSignature, openCubePicker, closeCubePicker, selectCubeItem, pickCubeItem, inspectCubeResult, takeOutCubeCell, transmuteCube,
        putStumpItem, quickFillCube, putBagItem, bookButtonHtml, openRecipeBook });
})();
safeExposeGlobals({ stumpCubeUi });
