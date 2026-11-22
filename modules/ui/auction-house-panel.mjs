/**
 * 경매장 아이템 칸의 검색 띠: [이름 칸] [조건(고른 조건 수)] [검색] [저장]과 매물 수, 그 아래 고른 조건의 칩(✕는 그 조건만 지우고 검색하지 않는다),
 * 조건 단추가 여닫는 칸(부위, 등급, 출처, 아이템 Lv. 최소와 최대, 가격 상한과 재화, 변형 셋, 옵션 조건 4줄까지). 검색하면 칸이 닫혀 결과가 자리를
 * 차지한다. 셋은 따로 칠한다: 적는 동안 바뀌는 칩은 바로 고치고, 입력 칸이 있는 띠와 조건 칸은 적은 값을 뺀 모양이 바뀔 때만 다시 그린다
 * (적던 칸은 다시 초점을 받는다). 판매자 조건은 입력 칸이 없다: 행이나 자세히 칸의 판매자 이름을 누르면 칩으로 붙는다.
 */
import { tr, esc, num, paint } from './auction-house-format.mjs';
import { hallActive } from './auction-house-hall.mjs';
import { slotApplies } from './auction-house-search.mjs';
import { liveQuery, conditionChips, panelCount, optionBoxText, VARIANT_LABELS } from './auction-house-conditions.mjs';

const SOURCES = Object.freeze([['all', '전체'], ['merchant', '상인'], ['user', '다른 플레이어']]);
const RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
const VARIANT_STATES = Object.freeze({ any: '상관없음', yes: '있음', no: '없음' });

function optionsHtml(runtime, rows, chosen) {
    return rows.map(([value, label]) => `<option value="${esc(runtime, value)}"${value === chosen ? ' selected' : ''}>${esc(runtime, label)}</option>`).join('');
}

/** The slots the gear heads hold with their shown names, in a fixed order by slot key (the chosen slot stays listed). */
function slotRows(runtime, heads, chosen) {
    const slots = [...new Set([...heads.filter(head => head.kind === 'gear').map(head => head.slot), ...(chosen !== 'all' ? [chosen] : [])])].sort();
    return [['all', runtime.deps._t('모든 부위')], ...slots.map(slot => [slot, runtime.deps.getItemSlotDisplayLabel({ slot }, tr(runtime, slot))])];
}

function rarityRows(runtime) {
    return [['all', tr(runtime, '전체')], ...RARITIES.map(id => [id, tr(runtime, runtime.deps.ITEM_RARITY_LABELS[id])])];
}

/** A typed value for a box ('' for the key, which leaves typed values out). */
const typed = (values, value) => (values && value !== null && value !== undefined ? value : '');

/** The bar: the name box with its suggestions, the 조건 button (its state and count patched by patchCond), 검색, 저장, the count line (filled
 * by paintCount). */
function barHtml(runtime, values) {
    const query = liveQuery(runtime), label = runtime.deps._t('이름 검색');
    return `<span class="ah-name-box is-name"><input type="search" class="ah-search" data-ah-search value="${esc(runtime, typed(values, query.name))}" placeholder="${esc(runtime, label)}" aria-label="${esc(runtime, label)}" autocomplete="off" spellcheck="false">
        <span class="ah-suggest" role="listbox" data-ah-suggest hidden></span></span>
        <button type="button" class="ah-cond" data-ah-panel aria-expanded="false">${esc(runtime, tr(runtime, '조건'))}<b data-ah-cond-count hidden></b></button>
        <button type="button" class="ah-find" data-ah-find>${esc(runtime, tr(runtime, '검색'))}</button>
        <button type="button" class="ah-save" data-ah-save>${esc(runtime, tr(runtime, '저장'))}</button>
        <span class="ah-lot-count" role="status" data-ah-lot-count></span>`;
}

/** The chips of the conditions chosen now. */
function chipsHtml(runtime) {
    return conditionChips(runtime, liveQuery(runtime)).map(([key, text]) => `<button type="button" class="ah-filter-chip" data-ah-clear="${esc(runtime, key)}" aria-label="${esc(runtime, runtime.deps._t('{name} 조건 지우기', { name: text }))}">${esc(runtime, text)}<span aria-hidden="true">✕</span></button>`).join('');
}

function fieldHtml(runtime, label, inner, extra = '') {
    return `<div class="ah-field${extra}"><span class="ah-field-label">${esc(runtime, tr(runtime, label))}</span><div class="ah-field-body">${inner}</div></div>`;
}

/** 부위 (on 전체 and 장비), 등급, 출처 (다른 플레이어 while the hall takes part). */
function selectFields(runtime, heads) {
    const query = liveQuery(runtime), sources = hallActive(runtime) ? SOURCES : SOURCES.filter(([id]) => id !== 'user');
    const slot = slotApplies(query) ? fieldHtml(runtime, '부위', `<select data-ah-filter="slot" aria-label="${esc(runtime, tr(runtime, '부위'))}">${optionsHtml(runtime, slotRows(runtime, heads, query.slot), query.slot)}</select>`) : '';
    return `${slot}${fieldHtml(runtime, '등급', `<select data-ah-filter="rarity" aria-label="${esc(runtime, tr(runtime, '등급'))}">${optionsHtml(runtime, rarityRows(runtime), query.rarity)}</select>`)}
        ${fieldHtml(runtime, '출처', `<select data-ah-filter="source" aria-label="${esc(runtime, tr(runtime, '출처'))}">${optionsHtml(runtime, sources.map(([id, text]) => [id, tr(runtime, text)]), query.source)}</select>`)}`;
}

function numberBox(runtime, attr, value, placeholder, label) {
    return `<input type="number" inputmode="numeric" min="1" class="ah-num" data-ah-q="${attr}" value="${esc(runtime, value)}" placeholder="${esc(runtime, tr(runtime, placeholder))}" aria-label="${esc(runtime, label)}">`;
}

/** 아이템 Lv. (minimum and maximum) and 가격 (a maximum in a currency). */
function numberFields(runtime, values) {
    const query = liveQuery(runtime), level = tr(runtime, '아이템 Lv.'), price = tr(runtime, '가격'), shopView = runtime.deps.shopView;
    const currencies = runtime.deps.auctionHouse.searchRules.currencies.map(key => [key, shopView.currencyName(key)]);
    return `${fieldHtml(runtime, '아이템 Lv.', `${numberBox(runtime, 'levelMin', typed(values, query.levelMin), '최소', `${level} ${tr(runtime, '최소')}`)}<span class="ah-dash" aria-hidden="true">~</span>${numberBox(runtime, 'levelMax', typed(values, query.levelMax), '최대', `${level} ${tr(runtime, '최대')}`)}`)}
        ${fieldHtml(runtime, '가격', `${numberBox(runtime, 'priceMax', typed(values, query.priceMax), '최대', `${price} ${tr(runtime, '최대')}`)}<select data-ah-q="currency" aria-label="${esc(runtime, price)}">${optionsHtml(runtime, currencies, query.currency)}</select>`)}`;
}

/** The three variant chips, each showing its state (상관없음, 있음, 없음). */
function variantField(runtime) {
    const chips = Object.entries(liveQuery(runtime).variants).map(([key, want]) => `<button type="button" class="ah-variant is-${want}" data-ah-variant="${esc(runtime, key)}" aria-pressed="${want !== 'any'}">
        <span>${esc(runtime, tr(runtime, VARIANT_LABELS[key]))}</span><small>${esc(runtime, tr(runtime, VARIANT_STATES[want]))}</small></button>`).join('');
    return fieldHtml(runtime, '변형', chips, ' is-variants');
}

/** The option rows (name box with suggestions, minimum, ✕) and 옵션 추가 while fewer than the rules' four. */
function optionField(runtime, values) {
    const options = liveQuery(runtime).options, name = tr(runtime, '옵션'), least = tr(runtime, '최소');
    const rows = options.map((row, index) => `<div class="ah-opt-row"><span class="ah-name-box"><input type="search" class="ah-opt-name" data-ah-opt-name="${index}" value="${esc(runtime, values ? optionBoxText(runtime, row) : '')}" placeholder="${esc(runtime, name)}" aria-label="${esc(runtime, name)}" autocomplete="off" spellcheck="false">
        <span class="ah-suggest" role="listbox" data-ah-suggest hidden></span></span>
        <input type="number" inputmode="decimal" class="ah-num" data-ah-opt-min="${index}" value="${esc(runtime, typed(values, row.min))}" placeholder="${esc(runtime, least)}" aria-label="${esc(runtime, `${name} ${least}`)}">
        <button type="button" class="ah-opt-x" data-ah-opt-x="${index}" aria-label="${esc(runtime, runtime.deps._t('{name} 조건 지우기', { name }))}">✕</button></div>`).join('');
    const add = options.length < runtime.deps.auctionHouse.searchRules.options ? `<button type="button" class="ah-opt-add" data-ah-opt-add>${esc(runtime, tr(runtime, '옵션 추가'))}</button>` : '';
    return fieldHtml(runtime, '옵션 조건', `${rows}${add}`, ' is-options');
}

/** The 조건 panel ('' while closed). values false: the shape alone (typed values left out), the key a repaint compares. */
function panelHtml(runtime, heads, values) {
    if (!runtime.state.gear.panel) return '';
    return `<div class="ah-panel-grid">${selectFields(runtime, heads)}${numberFields(runtime, values)}${variantField(runtime)}${optionField(runtime, values)}</div>`;
}

/** The 조건 button's open state and condition count, patched in place (rebuilding the bar would move the focus off the button just pressed). */
function patchCond(runtime, bar) {
    const button = bar && bar.querySelector('[data-ah-panel]'), badge = button && button.querySelector('[data-ah-cond-count]');
    if (!badge) return;
    const open = !!runtime.state.gear.panel, count = panelCount(runtime, liveQuery(runtime)), text = count ? num(runtime, count) : '';
    if (button.classList.contains('is-on') !== open) { button.classList.toggle('is-on', open); button.setAttribute('aria-expanded', String(open)); }
    if (badge.textContent !== text) { badge.textContent = text; badge.hidden = !count; }
}

/** Repaints box with html() when its shape (key: the html without typed values) changed; a control focused inside gets the focus back. */
function paintShaped(box, key, html) {
    if (!box || box.ahKey === key) return;
    const active = box.ownerDocument.activeElement, attr = active && box.contains(active) ? [...active.attributes].find(row => row.name.startsWith('data-ah-')) : null;
    box.ahKey = key;
    box.innerHTML = html();
    if (attr) box.querySelector(`[${attr.name}="${attr.value.replace(/["\\]/g, '\\$&')}"]`)?.focus({ preventScroll: true });
}

/** The search bar, the chips and the panel of 판매 중 (empty on 최근 거래), then the count line. heads: liveHeads of now. */
export function paintTools(runtime, root, heads) {
    const recent = runtime.state.gear.mode === 'recent', bar = root.querySelector('[data-ah-tools]'), panel = root.querySelector('[data-ah-panel-box]');
    // The conditions were replaced (a saved search, a cleared chip): the boxes show the new values even when their shape stayed.
    if (runtime.toolsStale) {
        for (const box of [bar, panel]) if (box) box.ahKey = null;
        runtime.toolsStale = false;
    }
    const shown = (make, values) => (recent ? '' : make(values));
    paintShaped(bar, shown(values => barHtml(runtime, values), false), () => shown(values => barHtml(runtime, values), true));
    patchCond(runtime, bar);
    paint(root.querySelector('[data-ah-chips]'), shown(() => chipsHtml(runtime)));
    paintShaped(panel, shown(values => panelHtml(runtime, heads, values), false), () => shown(values => panelHtml(runtime, heads, values), true));
    if (panel) panel.hidden = recent || !runtime.state.gear.panel;
    paintCount(runtime, root);
}

/** The count line: the search's progress (찾는 중), the result's size, or '' (no search yet, 최근 거래, the heads still being built). */
export function countText(runtime) {
    const search = runtime.search;
    if (runtime.state.gear.mode === 'recent' || !search) return '';
    // Before the snapshot (the heads are still being built) there is nothing to count yet.
    if (search.phase !== 'done' && !search.progress.total) return '';
    if (search.phase !== 'done') return runtime.deps._t('찾는 중 {done}/{total}', { done: num(runtime, search.progress.done), total: num(runtime, search.progress.total) });
    return runtime.deps._t('매물 {count}', { count: num(runtime, search.ids.length) });
}

/** The count line alone (the search's progress each frame). */
export function paintCount(runtime, root) {
    const count = root && root.querySelector('[data-ah-lot-count]'), text = countText(runtime);
    if (count && count.textContent !== text) count.textContent = text;
}
