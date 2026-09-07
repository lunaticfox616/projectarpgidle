// Shared search controls preserve the input element and query state across inventory refreshes.
function renderSearchSection(containerId, key, placeholder, rowsHtml, emptyHtml, actionButtonsHtml) {
    let root = document.getElementById(containerId);
    if (!root) return;
    let sf = getSearchFilterState();
    let input = root.querySelector(`input[data-search-key="${key}"]`);
    let list = root.querySelector('.search-result-list');
    if (!input || !list) {
        root.innerHTML = `<div class="search-filter-panel" style="grid-column:1/-1; margin-bottom:6px; width:100%; max-width:100%;"><input class="search-filter-input" data-search-key="${key}" placeholder="${placeholder}" value="${escapeHTML(sf[key] || '')}" oninput="updateSearchFilter('${key}', this.value)" style="display:block; width:100%; max-width:100%; box-sizing:border-box; padding:6px 8px; border-radius:8px; border:1px solid #45556f; background:#111a28; color:#ffffff;"><div class="search-action-row" style="margin-top:6px; display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;"><button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">검색어 리셋</button>${actionButtonsHtml || ''}</div></div><div class="search-result-list" style="display:contents;"></div>`;
        input = root.querySelector(`input[data-search-key="${key}"]`);
        list = root.querySelector('.search-result-list');
    }
    let actionRow = root.querySelector('.search-action-row');
    if (actionRow) {
        actionRow.style.flexWrap = 'nowrap';
        actionRow.style.overflowX = 'auto';
        actionRow.style.webkitOverflowScrolling = 'touch';
        actionRow.innerHTML = `<button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">검색어 리셋</button>${actionButtonsHtml || ''}`;
        actionRow.querySelectorAll('button').forEach(btn => {
            btn.style.flex = '0 0 auto';
            btn.style.whiteSpace = 'nowrap';
        });
    }
    if (input && input.value !== String(sf[key] || '')) input.value = String(sf[key] || '');
    // 내용이 같으면 innerHTML 재작성(파싱+리플로우)을 생략한다. 탭 전환·주기 갱신마다
    // 동일한 목록을 다시 그리는 비용을 없애 끊김을 줄인다.
    if (list) { let v = rowsHtml || emptyHtml || ''; if (list.__lastHtml !== v) { list.innerHTML = v; list.__lastHtml = v; } }
}
function getSearchFilterState() {
    game.settings = game.settings || {};
    game.settings.searchFilters = (game.settings.searchFilters && typeof game.settings.searchFilters === 'object') ? game.settings.searchFilters : {};
    const d = game.settings.searchFilters;
    for (const key of ['equip', 'jewel', 'talisman', 'growth', 'colonyWard', 'skill', 'support']) {
        d[key] = String(d[key] || '');
    }
    return d;
}

safeExposeGlobals({getSearchFilterState, renderSearchSection});
