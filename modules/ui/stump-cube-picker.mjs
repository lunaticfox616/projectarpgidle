import { itemTone, esc, itemName } from './stump-cube-items.mjs';

export function storedItemMeta(runtime, kind, item) {
    // Candidates and results are stored, so an unripe one is not growing yet ("성장 중" means placed on the board).
    if (kind === 'stump' && item.color) return (0, runtime.deps._t)('품질 {round}%, {value}', { round: Math.round(item.roll * 100), value: runtime.deps.stumpBox.isMature(item) ? (0, runtime.deps._t)('성장 완료') : (0, runtime.deps._t)('성장 전') });
    const rarity = runtime.deps.ITEM_RARITY_LABELS[item.rarity] || '';
    if (kind === 'equipment') return equipmentMeta(runtime, item, rarity);
    if (kind === 'core') return item.perfect ? '완전한 코어' : (0, runtime.deps._t)('{rarity} 코어', { rarity });
    if (kind === 'currency') return (0, runtime.deps._t)('{amount}개 획득', { amount: item.amount });
    return rarity || runtime.state.KIND_LABELS[kind];
}

export function equipmentMeta(runtime, item, rarity) {
    return (0, runtime.deps._t)('{rarity} T{item}, 품질 {max}%', { rarity, item: (0, runtime.deps.getItemCraftTier)(item), max: Math.max(0, Math.floor(Number(item.quality) || 0)) });
}

/** A short identifying option; the selection panel below always carries the full existing item details. */
export function firstOption(runtime, kind, item) {
    if (kind === 'core') return item.lines[0] ? runtime.deps.coreItems.describe(item.lines[0]) : '';
    if (kind === 'stump') return stumpFirstOption(runtime, item);
    if (kind === 'currency' || kind === 'wallet') return '';
    return firstStatOption(runtime, kind, item);
}

export function stumpFirstOption(runtime, item) {
    if (item.family === 'talisman') return item.uniqueEffect || (item.lines[0] ? runtime.deps.talismans.describeLine(item.lines[0]) : '');
    if (item.albino) {
        const line = runtime.deps.STUMP_BOX_RIPENING.albino.variants[runtime.deps.stumpBox.yieldKind(item)][item.color][0];
        return runtime.deps.stumpBox.lineText(line.stat, line.value);
    }
    const gain = runtime.deps.stumpBox.yieldOf(item);
    return gain ? gain.text.replace('{v}', String(Math.round(gain.value * runtime.deps.stumpBox.qualityOf(item) * runtime.deps.stumpBox.goldenMul(item) * 100) / 100)) : '';
}

export function firstStatOption(runtime, kind, item) {
    const stat = kind === 'jewel' ? (0, runtime.deps.getJewelStats)(item)[0] : ((item.stats || [])[0] || (item.baseStats || [])[0]);
    if (!stat) return '';
    const key = stat.id || stat.stat;
    return `${(0, runtime.deps._t)(stat.statName || (0, runtime.deps.getStatName)(key))} ${(0, runtime.deps.formatSignedValue)(key, stat.val)}`;
}

export function renderMaterialDetail(runtime, panel) {
    const detail = panel.querySelector('.stump-cube-material-detail');
    detail.style.setProperty('--cube-tone', runtime.state.pickerSelection ? itemTone(runtime, runtime.state.pickerSelection.kind, runtime.state.pickerSelection.item) : '#8c7043');
    if (!runtime.state.pickerSelection) {
        detail.innerHTML = '<p class="selection-overlay-help">재료를 골라 옵션을 확인하세요.</p>';
        return;
    }
    const { kind, item } = runtime.state.pickerSelection;
    detail.innerHTML = `<div class="stump-cube-material-head"><img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false">`
        + `<span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span></div><div class="stump-cube-material-options equipment-inspection-tooltip"></div>`
        + '<button type="button" class="stump-cube-material-add" onclick="stumpCubeUi.pickCubeItem()">조합창에 넣기</button>';
    const body = detail.querySelector('.stump-cube-material-options');
    renderItemDetails(runtime, body, kind, item);
}

export function renderItemDetails(runtime, body, kind, item, snapshot = false) {
    if (kind === 'wallet') body.innerHTML = `<h3>${esc(runtime, itemName(runtime, kind, item))}</h3>`;
    else if (kind === 'stump') body.innerHTML = runtime.deps.statToneText.markup(runtime.deps.stumpBoxUi.itemTipHtml(item, snapshot));
    else if (kind === 'currency') body.innerHTML = `<h3>${esc(runtime, (0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].name))}</h3><p>${runtime.deps.statToneText.html((0, runtime.deps._t)(runtime.deps.ORB_DB[item.currency].desc) || '')}</p>`;
    else (0, runtime.deps.showItemTooltip)(null, null, false, item, { target: body });
}

export function currentResult(runtime) {
    if (runtime.state.lastResult && (runtime.state.lastResult.state !== runtime.deps.game || runtime.state.lastResult.season !== runtime.deps.game.season)) runtime.state.lastResult = null;
    return runtime.state.lastResult;
}

export function resultCardHtml(runtime, { kind, item }, index) {
    const option = firstOption(runtime, kind, item);
    return `<button type="button" class="stump-cube-result-card" onclick="stumpCubeUi.inspectCubeResult(${index})" style="--cube-tone:${itemTone(runtime, kind, item)}">`
        + `${resultArtHtml(runtime, kind, item)}<span><strong>${esc(runtime, itemName(runtime, kind, item))}</strong>`
        + `<span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span>${option ? `<span>${runtime.deps.statToneText.html(option)}</span>` : ''}`
        + '<small>결과 자세히 보기</small></span></button>';
}

export function resultArtHtml(runtime, kind, item) {
    if (kind === 'currency') {
        const icon = runtime.deps.ORB_DB[item.currency].icon;
        return icon ? `<img src="${icon}" alt="" draggable="false">` : '';
    }
    return `<img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false">`;
}

export function resultHtml(runtime) {
    const result = currentResult(runtime);
    if (!result) return '';
    return `<section class="stump-cube-result" aria-label="${(0, runtime.deps._t)('최근 조합 결과')}"><h4>${(0, runtime.deps._t)('방금 만든 결과')}</h4>${result.outputs.map(runtime.handlers.resultCardHtml).join('')}</section>`;
}

export function inspectCubeResult(runtime, index) {
    const row = currentResult(runtime)?.outputs[index];
    if (!row) return;
    const { kind, item } = row;
    const panel = runtime.deps.selectionDialog.show({ id: 'stump-cube-result', title: (0, runtime.deps._t)('조합 결과'), panelClass: 'stump-cube-result-panel',
        body: `<div class="stump-cube-material-head">${resultArtHtml(runtime, kind, item)}<span>${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span></div>`
            + '<div class="stump-cube-material-options equipment-inspection-tooltip"></div><p class="selection-overlay-help">제작 직후의 결과입니다.</p>' });
    runtime.state.resultPanel = panel;
    renderItemDetails(runtime, panel.querySelector('.stump-cube-material-options'), kind, item, true);
}

export function candidateHtml(runtime, kind, item, index) {
    const name = itemName(runtime, kind, item), selected = runtime.state.pickerSelection?.item === item, option = firstOption(runtime, kind, item);
    return `<button type="button" class="stump-cube-candidate${selected ? ' is-selected' : ''}" data-cube-candidate="${index}"`
        + ` onclick="stumpCubeUi.selectCubeItem(${index})" ondblclick="stumpCubeUi.pickCubeItem()" aria-pressed="${selected}" style="--cube-tone:${itemTone(runtime, kind, item)}">`
        + `<img src="${runtime.state.ICONS[kind](item)}" alt="" draggable="false"><span class="stump-cube-candidate-copy"><strong>${esc(runtime, name)}</strong>`
        + `<span class="stump-cube-candidate-meta">${runtime.deps.statToneText.html(candidateMeta(runtime, kind, item))}</span>`
        + `${option ? `<span class="stump-cube-candidate-option">${runtime.deps.statToneText.html(option)}</span>` : ''}</span></button>`;
}

export function pickerBodyHtml(runtime) {
    const tabs = runtime.deps.stumpCube.KINDS.filter(kind => kind !== 'wallet' || kind === runtime.state.pickerKind || pickerCount(runtime, kind) > 0)
        .map(kind => `<button type="button" class="${kind === runtime.state.pickerKind ? 'is-on' : ''}" aria-pressed="${kind === runtime.state.pickerKind}"`
            + ` onclick="stumpCubeUi.openCubePicker('${kind}')">${runtime.state.KIND_LABELS[kind]} ${pickerCount(runtime, kind)}</button>`).join('');
    runtime.state.pickerItems = runtime.deps.stumpCube.candidates(runtime.state.pickerKind);
    if (runtime.state.pickerSelection && !runtime.state.pickerItems.includes(runtime.state.pickerSelection.item)) runtime.state.pickerSelection = null;
    const list = runtime.state.pickerItems.map((item, index) => candidateHtml(runtime, runtime.state.pickerKind, item, index)).join('');
    return `<div class="stump-cube-picker-tabs">${tabs}</div><div class="stump-cube-picker-layout">
            <div class="stump-cube-candidates">${list || (0, runtime.deps._t)('<p class="selection-overlay-help">넣을 수 있는 아이템이 없습니다.</p>')}</div>
            <section class="stump-cube-material-detail" aria-label="${(0, runtime.deps._t)('고른 재료 정보')}"></section></div>`;
}

export function candidateMeta(runtime, kind, item) { return kind === 'wallet' ? (0, runtime.deps._t)('화폐화 {walletCount}개', { walletCount: runtime.deps.stumpBox.walletCount(runtime.deps.game, item.walletKey) }) : storedItemMeta(runtime, kind, item); }

export function pickerCount(runtime, kind) { return kind === 'wallet' ? runtime.deps.stumpBox.walletTotal(runtime.deps.game) : runtime.deps.stumpCube.candidates(kind).length; }
