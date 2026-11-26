import { getSearchFilters } from '../state/search-filters.mjs';

export function renderSearchSection(runtime, options) {
    const { containerId, key, rowsHtml, emptyHtml, actionButtonsHtml } = options;
    let root = runtime.deps.document.getElementById(containerId);
    if (!root) return;
    let sf = getSearchFilterState(runtime);
    const { input, list } = searchSectionShell(runtime, root, options, sf);
    updateSearchSectionActions(runtime, root, key, actionButtonsHtml);
    if (input && input.value !== String(sf[key] || '')) input.value = String(sf[key] || '');
    // Keep the existing input and results while their content is unchanged.
    updateSearchResults(list, key, rowsHtml || emptyHtml || '');
}

function updateSearchResults(list, key, html) {
    if (list.__lastHtml === html) return;
    if (key === 'skill' || key === 'support') updateRuneSearchResults(list, html);
    else list.innerHTML = html;
    list.__lastHtml = html;
}

// Keep unchanged rune tiles in place while an equip operation changes one or two cards.
function updateRuneSearchResults(list, html) {
    const template = list.ownerDocument.createElement('template');
    template.innerHTML = html;
    const incoming = Array.from(template.content.children), current = Array.from(list.children);
    const markup = incoming.map(node => node.outerHTML);
    if (incoming.length !== current.length || !list.__runeMarkup) list.replaceChildren(...incoming);
    else incoming.forEach((node, index) => {
        if (list.__runeMarkup[index] !== markup[index]) current[index].replaceWith(node);
    });
    list.__runeMarkup = markup;
}

function searchSectionShell(runtime, root, { key, placeholder, actionButtonsHtml }, sf) {
    let input = root.querySelector(`input[data-search-key="${key}"]`);
    let list = root.querySelector('.search-result-list');
    if (!input || !list) {
        root.innerHTML = `<div class="search-filter-panel" style="grid-column:var(--search-filter-column,1/-1); margin-bottom:6px; width:100%; max-width:100%;"><input class="search-filter-input" data-search-key="${key}" placeholder="${placeholder}" value="${(0, runtime.deps.escapeHTML)(sf[key] || '')}" oninput="updateSearchFilter('${key}', this.value)" style="display:block; width:100%; max-width:100%; box-sizing:border-box; padding:6px 8px;"><div class="search-action-row" style="margin-top:6px; display:flex; gap:6px; flex-wrap:nowrap; overflow-x:auto; -webkit-overflow-scrolling:touch;"><button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">${(0, runtime.deps._t)('검색어 리셋')}</button>${actionButtonsHtml || ''}</div></div><div class="search-result-list" style="display:var(--search-results-display,contents);"></div>`;
        input = root.querySelector(`input[data-search-key="${key}"]`);
        list = root.querySelector('.search-result-list');
    }
    return { input, list };
}

function updateSearchSectionActions(runtime, root, key, actionButtonsHtml) {
    let actionRow = root.querySelector('.search-action-row');
    if (actionRow && actionRow.__lastActions !== actionButtonsHtml) {
        actionRow.__lastActions = actionButtonsHtml;
        actionRow.innerHTML = `<button onclick="resetSearchFilter('${key}')" style="padding:4px 8px; font-size:12px; flex:0 0 auto; white-space:nowrap;">${(0, runtime.deps._t)('검색어 리셋')}</button>${actionButtonsHtml || ''}`;
        actionRow.querySelectorAll('button').forEach(btn => {
            btn.style.flex = '0 0 auto';
            btn.style.whiteSpace = 'nowrap';
        });
    }
}

export function getSearchFilterState(runtime) {
    return getSearchFilters(runtime.deps.game);
}
