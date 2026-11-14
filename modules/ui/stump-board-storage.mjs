import { stumpBar, escStump, itemTone, stumpIcon, stumpTone } from './stump-board-summary.mjs';
import { comparisonLabel } from './stump-board-detail.mjs';
import { stumpLockMark } from './stump-board-markup.mjs';

/** slot: 끌어서 놓을 때 그 카드가 뜻하는 보관함 칸(js/stump-box-drag-ui.js). */
export function stumpStorageCard(runtime, item, cell = item.slot) {
    const growing = item.xp > 0 && !runtime.deps.stumpBox.isMature(item) ? stumpBar(runtime, item) : '';
    const classes = `stump-item${item.id === runtime.state.selectedId ? ' is-selected' : ''}${runtime.deps.stumpRipeningUi.isGolden(item) ? ' is-golden' : ''}${item.albino ? ' is-albino' : ''}${item.locked ? ' is-item-locked' : ''}`;
    return `<button type="button" class="${classes}" data-stump-action="item" data-item="${item.id}"`
        + ` data-stump-drag="${item.id}" data-stump-storage-slot="${cell}" data-stump-tip="item" data-info-tooltip-anchor="1"`
        + ` aria-label="${escStump(runtime, comparisonLabel(runtime, item))}${item.locked ? (0, runtime.deps._t)(', 잠금') : ''}" style="--stump-tone:${itemTone(runtime, item)}">${stumpIcon(runtime, item)}${growing}${stumpLockMark(runtime, item)}</button>`;
}

export function stumpFilterLabel(runtime, key) {
    if (key === 'all') return (0, runtime.deps._t)('전체');
    return key === 'talisman' ? (0, runtime.deps._t)('부적') : (0, runtime.deps._t)(runtime.deps.STUMP_BOX_COLORS[key].label);
}

/** A filter wears its colour; 전체 the box's gold, 부적 the jade that no element uses (css/stump-box.css .stump-filter). */
export function stumpFilterTone(runtime, key) {
    if (key === 'all') return '#e8c872';
    return key === 'talisman' ? '#6fd6b8' : stumpTone(runtime, key);
}

export function stumpFilterMatch(runtime, item) {
    if (runtime.state.colorFilter === 'all') return true;
    return runtime.state.colorFilter === 'talisman' ? item.family === 'talisman' : item.color === runtime.state.colorFilter;
}

export function stumpStateMatch(runtime, item) {
    if (runtime.state.stateFilter === 'locked') return !!item.locked;
    if (runtime.state.stateFilter === 'ripe') return runtime.deps.stumpBox.isMature(item);
    if (runtime.state.stateFilter === 'unripe') return !runtime.deps.stumpBox.isMature(item);
    return true;
}

export function compareStorageItems(runtime, a, b) {
    if (runtime.state.storageSort === 'manual') return a.slot - b.slot;
    if (runtime.state.storageSort === 'recent') return b.id - a.id;
    if (runtime.state.storageSort === 'name') return runtime.deps.stumpBox.label(a).localeCompare(runtime.deps.stumpBox.label(b), 'ko') || a.id - b.id;
    // Talismans and scars have no displayed quality, so keep them after the quality-bearing items.
    if (!!a.color !== !!b.color) return a.color ? -1 : 1;
    return (a.color ? (a.roll - b.roll) * (runtime.state.storageSort === 'quality-asc' ? 1 : -1) : 0) || a.id - b.id;
}

export function storageSelect(runtime, key, label, value, choices) {
    return `<select data-stump-select="${key}" aria-label="${(0, runtime.deps._t)('보관함 {label}', { label })}">`
        + Object.entries(choices).map(([id, name]) => `<option value="${id}"${id === value ? ' selected' : ''}>${(0, runtime.deps._t)(name)}</option>`).join('') + '</select>';
}

/** One row (2026-10-25 사용자 "압축할 수 있는 부분 압축"): 상태, 정렬, 일괄 거름 · 버리기, 거른 것이 있을 때만 몇 개 보이는지. */
export function storageToolsHtml(runtime, count, total) {
    const shown = count < total ? `<span class="stump-hint">${(0, runtime.deps._t)('{count}/{total}개', { count, total })}</span>` : '';
    return '<div class="stump-storage-tools">' + storageSelect(runtime, 'state', (0, runtime.deps._t)('상태'), runtime.state.stateFilter, runtime.state.STORAGE_STATES)
        + storageSelect(runtime, 'sort', (0, runtime.deps._t)('정렬'), runtime.state.storageSort, runtime.state.STORAGE_SORTS) + (runtime.state.stateFilter === 'all' ? runtime.deps.stumpRipeningUi.bulkHtml(runtime.state.colorFilter) : '') + shown + '</div>';
}

/** Cells to lay out on the shown page: the whole capacity like the equipment bag (2026-10-16 사용자 "창크기에따라 아이템크기 변경시키지
* 말고, 장비 인벤토리처럼 칸을 놓고 하나씩 들어가게"; css/stump-box.css: 10 columns), 100 a page (2026-10-25 사용자). A filter shows only
* its items. */
export function stumpStorageCells(runtime, count) {
    return runtime.state.colorFilter === 'all' && runtime.state.stateFilter === 'all' ? Math.max(count, runtime.deps.stumpBox.storageLimit(runtime.deps.game)) : count;
}

export function storagePagesHtml(runtime, pages) {
    if (pages <= 1) return '';
    return '<div class="stump-pages" role="group" aria-label="보관함 쪽">' + Array.from({ length: pages }, (_, page) => `<button type="button"`
            + ` data-stump-action="storage-page" data-page="${page}" aria-pressed="${page === runtime.state.storagePage}">${page + 1}</button>`).join('') + '</div>';
}

/** 거르지 않은 보관함의 칸: 직접 배치는 모두 칸 번호대로, 다른 정렬은 잠근 것만 제 칸에 두고 나머지가 그 정렬 차례로 빈칸을
* 채운다(2026-11-11 사용자: 잠가 놓으면 다른 정렬로 바꿔도 그 자리에. 끌어서 옮기는 것은 잠근 것도 된다). items는 정렬된 보관함.
* @returns {Array<?object>} 칸마다 아이템 또는 null */
export function storageLayout(runtime, items) {
    const cells = new Array(storageSlotTotal(runtime, items)).fill(null), loose = [];
    items.forEach(item => (runtime.state.storageSort === 'manual' || item.locked ? (cells[item.slot] = item) : loose.push(item)));
    let at = 0;
    loose.forEach(item => {
        while (cells[at]) at++;
        cells[at++] = item;
    });
    return cells;
}

export function storageSlotCells(runtime, cells, from, to) {
    let html = '';
    for (let slot = from; slot < to; slot++) {
        html += cells[slot] ? stumpStorageCard(runtime, cells[slot], slot) : `<span class="stump-slot" data-stump-storage-slot="${slot}" aria-hidden="true"></span>`;
    }
    return html;
}

/** 칸 수: 함의 크기, 또는 가장 뒤에 놓인 것까지. */
export function storageSlotTotal(runtime, items) {
    return Math.max(runtime.deps.stumpBox.storageLimit(runtime.deps.game), items.length, ...items.map(item => item.slot + 1));
}

export function storageFiltersHtml(runtime, all) {
    const keys = ['all'].concat(runtime.state.COLORS, all.some(item => item.family === 'talisman') || runtime.state.colorFilter === 'talisman' ? ['talisman'] : []);
    return all.length ? keys.map(key => `<button type="button" class="stump-filter${runtime.state.colorFilter === key ? ' is-on' : ''}" data-stump-action="filter"`
            + ` data-filter="${key}" aria-pressed="${runtime.state.colorFilter === key}" style="--stump-tone:${stumpFilterTone(runtime, key)}">${stumpFilterLabel(runtime, key)}</button>`).join('') : '';
}

/** 보이는 쪽의 칸들. 직접 배치는 칸 번호대로, 그 밖에는 차례대로 채운다. */
export function storageCellsHtml(runtime, all, items, cells, layout) {
    const from = runtime.state.storagePage * runtime.state.STORAGE_PAGE_CELLS;
    if (layout) return storageSlotCells(runtime, layout, from, Math.min(cells, from + runtime.state.STORAGE_PAGE_CELLS));
    const shown = items.slice(from, from + runtime.state.STORAGE_PAGE_CELLS);
    const slots = '<span class="stump-slot" aria-hidden="true"></span>'.repeat(Math.max(0, Math.min(runtime.state.STORAGE_PAGE_CELLS, cells - from) - shown.length));
    return `${shown.map(runtime.handlers.stumpStorageCard).join('') || (all.length ? (0, runtime.deps._t)('<p class="stump-hint">이 분류는 비어 있습니다.</p>') : '')}${slots}`;
}

export function stumpStorageHtml(runtime) {
    runtime.deps.stumpBox.settleStorageSlots(runtime.deps.game);
    const all = runtime.deps.stumpBox.storage(runtime.deps.game), items = all.filter(runtime.handlers.stumpFilterMatch).filter(runtime.handlers.stumpStateMatch).sort(runtime.handlers.compareStorageItems);
    const layout = storageShowsSlots(runtime) ? storageLayout(runtime, items) : null;
    const cells = layout ? layout.length : stumpStorageCells(runtime, items.length), pages = Math.max(1, Math.ceil(cells / runtime.state.STORAGE_PAGE_CELLS));
    runtime.state.storagePage = Math.min(runtime.state.storagePage, pages - 1);
    const target = runtime.state.selectedId !== null && runtime.deps.stumpBox.isPlaced(runtime.deps.game, runtime.state.selectedId) ? ' is-target' : '';
    return `<div class="stump-storage-head"><h3>${(0, runtime.deps._t)('보관함 {length}/{storageLimit}', { length: all.length, storageLimit: runtime.deps.stumpBox.storageLimit(runtime.deps.game) })}</h3><div class="stump-filters">${storageFiltersHtml(runtime, all)}</div>${storagePagesHtml(runtime, pages)}</div>`
        + (all.length ? storageToolsHtml(runtime, items.length, all.length) : '')
        + `<div class="stump-storage-grid${target}" data-stump-action="storage" data-stump-drop-storage="1">${storageCellsHtml(runtime, all, items, cells, layout)}</div>`;
}

export function storageShowsSlots(runtime) { return runtime.state.colorFilter === 'all' && runtime.state.stateFilter === 'all'; }
