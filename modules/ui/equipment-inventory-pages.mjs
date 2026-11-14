import { cancelCarry } from './equipment-inventory-carry.mjs';
import { setFocusedKey, getPageIndex, notify } from './equipment-inventory-model.mjs';

export function setPage(runtime, pageIndex) {
    let layout = runtime.deps.equipmentInventoryGridRuntime.ensureState(runtime.deps.game);
    let nextPage = Math.max(0, Math.min(layout.pageCount - 1, Math.floor(Number(pageIndex) || 0)));
    if (nextPage === runtime.state.activePage) return false;
    cancelCarry(runtime);
    runtime.state.activePage = nextPage;
    setFocusedKey(runtime, null);
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();
    return true;
}

/** Page badges count what the bag shows: the search word and also the 필터 panel's grades and kind (2026-10-19; before, only a
* search word lit the pages, so a kind picked in a 12-page bag had to be found page by page). */
export function getPageSearchSummary(runtime, layout, rows, query) {
    let normalizedQuery = String(query || '').trim();
    let counts = Array.from({ length: layout.pageCount }, () => 0);
    rows = Array.isArray(rows) ? rows : [];
    if (!normalizedQuery && !rows.some(row => row && row.filterActive)) return { active: false, query: '', key: '', counts, totalMatches: 0, matchingPages: 0 };
    let settings = runtime.deps.game.settings || {};
    let judged = typeof runtime.deps.equipmentTriage === 'object' ? runtime.deps.equipmentTriage.currentFilter() : 'all';
    let key = JSON.stringify([normalizedQuery, settings.equipmentSlotFilter || 'all', settings.inventoryViewRarities || {}, judged]);
    let matchedKeys = new Set(rows
            .filter(row => row && row.filterMatched)
            .map(row => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    layout.entries.forEach(entry => {
        if (!matchedKeys.has(entry.key)) return;
        let page = Math.floor(entry.row / layout.rowsPerPage);
        if (page >= 0 && page < counts.length) counts[page] += 1;
    });
    return {
        active: true,
        query: normalizedQuery,
        key,
        counts,
        totalMatches: counts.reduce((sum, count) => sum + count, 0),
        matchingPages: counts.filter(count => count > 0).length
    };
}

export function selectFirstSearchPage(runtime, search) {
    if (!search.active || search.key === runtime.state.lastPageSearchQuery) return;
    runtime.state.lastPageSearchQuery = search.key;
    let firstMatchPage = search.counts.findIndex(count => count > 0);
    if (firstMatchPage < 0 || firstMatchPage === runtime.state.activePage) return;
    cancelCarry(runtime);
    runtime.state.activePage = firstMatchPage;
    setFocusedKey(runtime, null);
}

export function renderPageControls(runtime, layout, rows, query) {
    let search = getPageSearchSummary(runtime, layout, rows, query);
    if (!search.active) runtime.state.lastPageSearchQuery = '';
    else selectFirstSearchPage(runtime, search);
    let page = getPageIndex(runtime, layout.pageCount);
    let root = runtime.deps.document.getElementById('ui-equipment-inventory-pages');
    let label = runtime.deps.document.getElementById('ui-inventory-page-label');
    let maxPages = typeof runtime.deps.EQUIPMENT_INVENTORY_MAX_PAGES === 'number' ? runtime.deps.EQUIPMENT_INVENTORY_MAX_PAGES : 12;
    let pageLabel = layout.unlockedPageCount >= maxPages
        ? (0, runtime.deps._t)('{unlockedPageCount}페이지, 최대 확장', { unlockedPageCount: layout.unlockedPageCount })
        : (0, runtime.deps._t)('{unlockedPageCount}페이지, 루프 진행으로 확장', { unlockedPageCount: layout.unlockedPageCount });
    let found = search.query ? '검색 결과' : '필터에 맞는 장비';
    if (search.active) pageLabel = (0, runtime.deps._t)('{found} {totalMatches}개, {matchingPages}페이지', { found, totalMatches: search.totalMatches, matchingPages: search.matchingPages });
    if (label) {
        label.textContent = pageLabel;
        label.hidden = !search.active;
    }
    renderTemporaryStorage(runtime);
    if (!root) return page;
    let used = getPageCellsUsed(runtime, layout), cells = layout.columns * layout.rowsPerPage;
    // 보고 있는 쪽을 줄 끝에 글로도 둔다(2026-11-07 사용자: 지금 몇 페이지인지 모르겠다). 단추 뒤에 두어 keepPageInView의 children[page]가 그대로다.
    let now = layout.pageCount > 1 ? `<span class="equipment-inventory-page-now">${(0, runtime.deps._t)('{page} / {count} 페이지', { page: page + 1, count: layout.pageCount })}</span>` : '';
    (0, runtime.deps.writeHtmlIfChanged)(root, Array.from({ length: layout.pageCount }, (_, index) =>
            runtime.handlers.pageButtonHtml(index, index === page, search, found, { used: used[index], cells })).join('') + now);
    keepPageInView(runtime, root, page);
    return page;
}

/** The cells each page's items cover (2026-10-27 사용자: 쪽 단추가 차오르게 해 눌러 보지 않고도 얼마나 찼는지 알게). */
export function getPageCellsUsed(runtime, layout) {
    let used = Array(layout.pageCount).fill(0);
    layout.entries.forEach(entry => {
        let index = Math.floor(entry.row / layout.rowsPerPage);
        if (index < used.length) used[index] += entry.columns * entry.rows;
    });
    return used;
}

/** One page button: its number, the search count, and a fill that rises with the cells in use (orange from 75%, red when full).
* fill: { used, cells } of that page. */
export function createPageButtonHtml(runtime) {
    return function pageButtonHtml(index, active, search, found, { used, cells }) {
        let matchCount = search.counts[index];
        let searchClass = search.active ? (matchCount > 0 ? ' search-match' : ' search-miss') : '';
        let searchText = search.active ? (0, runtime.deps._t)(', {found} {matchCount}개', { found, matchCount }) : '';
        let badge = matchCount > 0 ? `<small>${matchCount}</small>` : '';
        let share = Math.min(1, used / cells), fillClass = share >= 1 ? ' is-full' : share >= 0.75 ? ' is-high' : '';
        let text = (0, runtime.deps._t)('{value}페이지, {used}/{cells}칸{searchText}', { value: index + 1, used, cells, searchText });
        return `<button type="button" class="${active ? 'active' : ''}${searchClass}${fillClass}" onclick="equipmentInventoryInteraction.setPage(${index})" aria-pressed="${active ? 'true' : 'false'}" aria-label="${text}" data-tip="${text}">`
            + `<i class="page-fill" style="height:${Math.round(share * 100)}%" aria-hidden="true"></i><span>${index + 1}</span>${badge}</button>`;
    };
}

export function keepPageInView(runtime, root, page) {
    let button = root.children[page];
    if (page === runtime.state.pageInView || !button || !runtime.deps.uiDisplay.matches('(max-width: 640px)') || !root.clientWidth) return;
    runtime.state.pageInView = page;
    let box = root.getBoundingClientRect(), at = button.getBoundingClientRect();
    if (root.scrollWidth > root.clientWidth) root.scrollLeft += at.left + at.width / 2 - (box.left + box.width / 2);
}

export function renderTemporaryStorage(runtime) {
    let root = runtime.deps.document.getElementById('ui-equipment-temporary-storage');
    if (!root) return;
    let items = runtime.deps.equipmentInventoryGridRuntime.getTemporaryItems(runtime.deps.game);
    root.hidden = items.length === 0;
    if (items.length === 0) {
        (0, runtime.deps.writeHtmlIfChanged)(root, '');
        return;
    }
    let cards = items.map(item => {
        let key = runtime.deps.equipmentInventoryGridRuntime.getItemKey(item);
        let footprint = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
        return `<button type="button" class="equipment-temporary-item rarity-${item.rarity || 'normal'}${runtime.deps.itemInfluencesUi.influenceClasses(item)}" style="${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-temporary-key="${(0, runtime.deps.escapeHTML)(key)}" onclick="equipmentInventoryInteraction.restoreTemporaryItem(this.dataset.temporaryKey)"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" draggable="false"><span>${(0, runtime.deps.escapeHTML)(item.name || item.baseName || '장비')}</span><small>${(0, runtime.deps._t)('{columns}×{rows}, 회수', { columns: footprint.columns, rows: footprint.rows })}</small></button>`;
    }).join('');
    (0, runtime.deps.writeHtmlIfChanged)(root, `<header><strong>${(0, runtime.deps._t)('임시 보관함')}</strong><span>${(0, runtime.deps._t)('{length}개', { length: items.length })}</span></header><p>${(0, runtime.deps._t)('이전 배치에서 복구된 장비입니다. 빈칸을 확보한 뒤 눌러서 회수하세요. 루프가 끝나면 비워집니다.')}</p><div>${cards}</div>`);
}

export function restoreTemporaryItem(runtime, itemKey) {
    cancelCarry(runtime);
    let result = runtime.deps.equipmentInventoryGridRuntime.restoreTemporaryItem(itemKey, runtime.deps.game);
    if (!result.ok) {
        notify(runtime, result.reason || '인벤토리에 회수할 공간이 없습니다.', 'warning');
        return false;
    }
    if (typeof runtime.deps.saveGame === 'function') (0, runtime.deps.saveGame)({ skipCloudSync: true });
    if (typeof runtime.deps.updateStaticUI === 'function') (0, runtime.deps.updateStaticUI)();
    notify(runtime, (0, runtime.deps._t)('{item} 인벤토리로 회수했습니다.', { item: (0, runtime.deps.withObjectParticle)((0, runtime.deps._t)(result.item.name || '장비')) }), 'success');
    return true;
}
