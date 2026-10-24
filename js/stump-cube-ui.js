// 조합창 화면: 그루터기 함 판 바로 아래 4×4 칸, 맞는 조합법과 비용, [조합] · [재료 넣기] · [비우기] · 조합법 목록.
// 재료 고르기는 선택 대화 상자(장비 · 그루터기 · 주얼 · 코어). 칸 · 조합법 목록 단추는 stump-box-ui.js의 클릭 위임(data-stump-action)이
// 이 모듈의 동작을 부르고, 대화 상자 단추는 직접 부른다. 규칙은 stump-cube.js.
const stumpCubeUi = (() => {
    const OVERLAY_ID = 'stump-cube-picker';
    const KIND_LABELS = { equipment: '장비', stump: '그루터기', jewel: '주얼', core: '코어' };
    let bookOpen = false, pickerKind = 'equipment';
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

    function costText(cost) {
        const rows = Object.entries(cost || {}).map(([key, need]) => `${ORB_DB[key].name} ${need} (보유 ${Math.floor(game.currencies[key] || 0)})`);
        return rows.length ? rows.join(', ') : '비용 없음';
    }

    // ── 칸 ─────────────────────────────────────────────────
    function entryHtml(entry) {
        const name = itemName(entry.kind, entry.item);
        return `<button type="button" class="stump-cube-item" data-stump-action="cube-cell" data-cell="${entry.y * stumpCube.SIZE + entry.x}"`
            + ` style="grid-column:${entry.x + 1} / span ${entry.w};grid-row:${entry.y + 1} / span ${entry.h};--cube-tone:${itemTone(entry.kind, entry.item)}"`
            + ` title="${esc(name)}, 누르면 꺼냅니다" aria-label="${esc(name)} 꺼내기"><img src="${ICONS[entry.kind](entry.item)}" alt="" draggable="false"></button>`;
    }

    function gridHtml(list) {
        const cells = Array.from({ length: stumpCube.SIZE * stumpCube.SIZE }, (_, cell) => `<button type="button" class="stump-cube-cell"`
            + ` data-stump-action="cube-open" style="grid-column:${cell % stumpCube.SIZE + 1};grid-row:${Math.floor(cell / stumpCube.SIZE) + 1}"`
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
            + `<p class="stump-line${lacking ? ' is-bad' : ''}">${esc(costText(found.recipe.cost))}</p></div>`;
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

    /** 조합법 책: 재료가 생길 수 있게 된 조합법만(조합법 발견, stumpCube.revealed). 나머지는 개수만 알린다. */
    function recipeBookHtml() {
        if (!bookOpen) return '';
        const shown = stumpCube.revealed(game), hidden = STUMP_CUBE_RECIPES.length - shown.length;
        const rows = shown.map(recipe => `<li><strong>${esc(recipe.name)} (${esc(recipe.group)})</strong>`
            + `<span>${esc(recipe.need)} → ${esc(recipe.result)}${recipe.id === 'stump_merge' ? ` 현재 ${Math.round(stumpBox.rollCap(game) * 100)}%` : ''}</span><small>${esc(costText(recipe.cost))}</small></li>`).join('');
        const more = hidden ? `<li class="is-hidden">아직 모르는 조합법 ${hidden}개 (새 재료가 성장 완료되거나 해금되면 공개)</li>` : '';
        return `<ul class="stump-cube-book">${rows}${more}</ul>`;
    }

    /** The cube section under the stump box board. */
    function cubeHtml() {
        const list = stumpCube.entries(), found = stumpCube.preview(), matched = stumpCube.match();
        // A hidden recipe stays craftable by experiment, except one still behind its loop.
        const ready = !!matched && (found || !(matched.recipe.reveal?.loop > game.season)) && !found?.reason
            && !stumpCube.missingCost(matched.recipe).length && !game.woodsmanBuildLock;
        return '<h3>조합창</h3>' + gridHtml(list) + statusHtml(found, list, matched)
            + `<div class="stump-actions"><button type="button" data-stump-action="cube-transmute"${ready ? '' : ' disabled'}>조합</button>`
            + '<button type="button" data-stump-action="cube-open">재료 넣기</button>'
            + `<button type="button" data-stump-action="cube-clear"${list.length ? '' : ' disabled'}>비우기</button>`
            + `<button type="button" data-stump-action="cube-book" aria-pressed="${bookOpen}">조합법 ${stumpCube.revealed(game).length}/${STUMP_CUBE_RECIPES.length}</button></div>`
            + resultHtml() + recipeBookHtml();
    }

    /** What the screen shows depends on these, so the stump tab repaints when they change. */
    function cubeSignature() {
        const found = stumpCube.preview(), matched = stumpCube.match(), revealed = stumpCube.revealed(game);
        const costRecipes = bookOpen ? revealed : (matched ? [matched.recipe] : []);
        const costs = [...new Set(costRecipes.flatMap(recipe => Object.keys(recipe.cost || {})))];
        return JSON.stringify([stumpCube.entries().map(entry => [entry.kind, entry.id, entry.x, entry.y, entry.item]), found,
            costs.map(key => [key, game.currencies[key] || 0]), !!game.woodsmanBuildLock, bookOpen, stumpBox.rollCap(game),
            revealed.map(recipe => recipe.id), currentResult()?.outputs]);
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
            + ` onclick="stumpCubeUi.selectCubeItem(${index})" aria-pressed="${selected}" style="--cube-tone:${itemTone(kind, item)}">`
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

    function transmuteCube() {
        const result = stumpCube.transmute();
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

    function clearCube() {
        stumpCube.clear();
        refreshCube();
    }

    function toggleCubeBook() {
        bookOpen = !bookOpen;
        refreshCube();
    }

    return Object.freeze({ cubeHtml, cubeSignature, openCubePicker, closeCubePicker, selectCubeItem, pickCubeItem, inspectCubeResult, takeOutCubeCell, transmuteCube, clearCube, toggleCubeBook });
})();
safeExposeGlobals({ stumpCubeUi });
