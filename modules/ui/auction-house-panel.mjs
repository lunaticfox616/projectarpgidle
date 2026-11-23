/**
 * 경매장 아이템 칸의 검색대. 위에서부터 분류 줄(전체, 부위 아홉, 이 저장이 연 주얼, 액막이, 부적, 오른쪽 끝에 최근 거래 단추), 무기를 골랐을
 * 때만 서는 무기 대분류 줄(모든 무기와 여섯 대분류, 그림은 그 대분류의 베이스 그림), 검색 줄([이름이나 옵션 검색 상자] [등급] [검색] [조건 n]
 * [저장]), 검색했거나 조건이 있을 때만 서는 상태 줄(왼쪽에 옵션 조건 칩(최소 값 칸과 ✕)과 그 밖의 조건 칩, 오른쪽에 매물 수, 좁은 칸의 정렬
 * 고르기, 조건 지우기), 조건 단추가 여닫는 칸(출처, 아이템 Lv. 최소와 최대, 가격 상한과 재화, 살 수 있는 매물만, 변형). 누르는 조건(분류, 무기, 등급, 출처, 변형, 칩의 ✕, 자동완성 고르기)은 바로
 * 검색하고, 적는 조건(이름, 수)은 Enter나 검색 단추가 검색한다(modules/ui/auction-house-actions.mjs). 상자는 따로 칠한다: 입력 칸이 있는
 * 검색 줄, 칩 줄, 조건 칸은 적은 값을 뺀 모양이 바뀔 때만 다시 그린다(적던 칸은 다시 초점을 받는다). 최근 거래에서는 분류 줄만 남는다.
 */
import { tr, esc, num, paint } from './auction-house-format.mjs';
import { hallActive } from './auction-house-hall.mjs';
import { openKinds } from './auction-house-kinds.mjs';
import { liveQuery, lineChips, panelCount, hasConditions, statName, categoryOf, kindLabel, slotName, VARIANT_LABELS, AFFORD_CHIP } from './auction-house-conditions.mjs';

const SOURCES = Object.freeze([['all', '모든 출처'], ['merchant', '상인'], ['user', '다른 플레이어']]);
const RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
const VARIANT_STATES = Object.freeze({ any: '상관없음', yes: '있음', no: '없음' });
/** The orders the narrow list's select offers ('column:direction'; the wide list orders by its header). */
export const SORT_PICKS = Object.freeze([['newest:-1', '새것 순'], ['price:1', '가격 낮은 순'], ['price:-1', '가격 높은 순'], ['left:1', '곧 내려가는 순'],
    ['level:-1', '아이템 Lv. 높은 순'], ['options:-1', '옵션 많은 순']]);

function optionsHtml(runtime, rows, chosen) {
    return rows.map(([value, label]) => `<option value="${esc(runtime, value)}"${value === chosen ? ' selected' : ''}>${esc(runtime, label)}</option>`).join('');
}

/** A typed value for a box ('' for the key, which leaves typed values out). */
const typed = (values, value) => (values && value !== null && value !== undefined ? value : '');

const recentMode = runtime => runtime.state.gear.mode === 'recent';

/** A tab of a strip: tab is { value, label, on, art? }. */
function tabHtml(runtime, attr, tab) {
    return `<button type="button" class="psd-tab ah-cat${tab.on ? ' is-on' : ''}" ${attr}="${esc(runtime, tab.value)}" aria-pressed="${tab.on}">${tab.art || ''}<span>${esc(runtime, tab.label)}</span></button>`;
}

/** The category strip: 전체, each gear slot, each open kind that is not gear; at its end the 최근 거래 switch. */
function catsHtml(runtime) {
    const chosen = categoryOf(liveQuery(runtime)), rules = runtime.deps.auctionHouse.searchRules, recent = recentMode(runtime);
    const rows = [['all', tr(runtime, '전체')], ...rules.slots.map(slot => [`slot:${slot}`, slotName(runtime, slot)]),
        ...openKinds(runtime).filter(kind => kind !== 'gear').map(kind => [`kind:${kind}`, kindLabel(runtime, kind)])];
    return `${rows.map(([value, label]) => tabHtml(runtime, 'data-ah-cat', { value, label, on: value === chosen })).join('')}
        <button type="button" class="psd-tab ah-recent${recent ? ' is-on' : ''}" data-ah-mode="${recent ? 'open' : 'recent'}" aria-pressed="${recent}"><span>${esc(runtime, tr(runtime, '최근 거래'))}</span></button>`;
}

/** The weapon strip ('' unless the weapon slot is the chosen category of 판매 중): 모든 무기 and the six categories with a base's picture. */
function weaponsHtml(runtime) {
    const query = liveQuery(runtime), rules = runtime.deps.auctionHouse.searchRules;
    if (recentMode(runtime) || query.slot !== rules.weaponSlot) return '';
    const art = row => `<img src="${esc(runtime, runtime.deps.getEquipmentGridVisualAsset({ slot: rules.weaponSlot, baseId: row.sample }))}" alt="" draggable="false">`;
    return [tabHtml(runtime, 'data-ah-weapon', { value: 'all', label: tr(runtime, '모든 무기'), on: query.weapon === 'all' }),
        ...rules.weapons.map(row => tabHtml(runtime, 'data-ah-weapon', { value: row.id, label: tr(runtime, row.name), on: query.weapon === row.id, art: art(row) }))].join('');
}

function rarityRows(runtime) {
    return [['all', tr(runtime, '모든 등급')], ...RARITIES.map(id => [id, tr(runtime, runtime.deps.ITEM_RARITY_LABELS[id])])];
}

/** The search bar: the box with its suggestions, the rarity select, 검색, the 조건 button (its state and count patched by patchCond), 저장. */
function barHtml(runtime, values) {
    const query = liveQuery(runtime), label = runtime.deps._t('이름이나 옵션 검색'), rarity = tr(runtime, '등급');
    return `<span class="ah-name-box is-name"><input type="search" class="ah-search psd-input" data-ah-search role="combobox" aria-autocomplete="list" aria-expanded="false" value="${esc(runtime, typed(values, query.name))}" placeholder="${esc(runtime, label)}" aria-label="${esc(runtime, label)}" autocomplete="off" spellcheck="false">
        <span class="ah-suggest" role="listbox" data-ah-suggest hidden></span></span>
        <select class="ah-rarity" data-ah-filter="rarity" aria-label="${esc(runtime, rarity)}">${optionsHtml(runtime, rarityRows(runtime), query.rarity)}</select>
        <button type="button" class="psd-btn is-primary ah-find" data-ah-find>${esc(runtime, tr(runtime, '검색'))}</button>
        <button type="button" class="psd-btn ah-cond" data-ah-panel aria-expanded="false">${esc(runtime, tr(runtime, '조건'))}<b data-ah-cond-count hidden></b></button>
        <button type="button" class="psd-btn ah-save" data-ah-save>${esc(runtime, tr(runtime, '저장'))}</button>`;
}

/** The option conditions as chips with a minimum box and ✕, then one chip per other condition (✕ clears it). */
function chipsHtml(runtime, values) {
    const query = liveQuery(runtime), least = tr(runtime, '최소'), clear = name => esc(runtime, runtime.deps._t('{name} 조건 지우기', { name }));
    const options = query.options.map((row, index) => {
        const name = statName(runtime, row.stat);
        return `<span class="ah-opt-chip"><span class="ah-opt-label">${esc(runtime, name)}</span><input type="number" inputmode="decimal" class="ah-num" data-ah-opt-min="${index}" value="${esc(runtime, typed(values, row.min))}" placeholder="${esc(runtime, least)}" aria-label="${esc(runtime, `${name} ${least}`)}">
            <button type="button" class="ah-opt-x" data-ah-opt-x="${index}" aria-label="${clear(name)}">✕</button></span>`;
    });
    const lines = [...lineChips(runtime, query), ...(runtime.state.gear.afford ? [[AFFORD_CHIP[0], tr(runtime, AFFORD_CHIP[1])]] : [])];
    const others = lines.map(([key, text]) => `<button type="button" class="ah-filter-chip" data-ah-clear="${esc(runtime, key)}" aria-label="${clear(text)}">${esc(runtime, text)}<span aria-hidden="true">✕</span></button>`);
    return [...options, ...others].join('');
}

/** Whether the status line has anything to show: a search was run or a condition is chosen (never on 최근 거래). */
function statusShown(runtime) {
    return !recentMode(runtime) && (!!runtime.search || hasConditions(runtime, liveQuery(runtime)));
}

/** The status line's right side: the count (filled by paintCount), the narrow list's order and 조건 지우기. */
function sideHtml(runtime) {
    const view = runtime.state.gear, order = tr(runtime, '정렬');
    const sort = runtime.search ? `<select class="ah-sort-pick" data-ah-sort-pick aria-label="${esc(runtime, order)}">${optionsHtml(runtime, SORT_PICKS.map(([value, label]) => [value, tr(runtime, label)]), `${view.sort}:${view.dir}`)}</select>` : '';
    return `<span class="ah-lot-count" role="status" data-ah-lot-count></span>${sort}<button type="button" class="ah-reset" data-ah-reset>${esc(runtime, tr(runtime, '조건 지우기'))}</button>`;
}

function fieldHtml(runtime, label, inner, extra = '') {
    return `<div class="ah-field${extra}"><span class="ah-field-label">${esc(runtime, tr(runtime, label))}</span><div class="ah-field-body">${inner}</div></div>`;
}

/** 출처 (다른 플레이어 while the hall takes part). */
function sourceField(runtime) {
    const query = liveQuery(runtime), sources = hallActive(runtime) ? SOURCES : SOURCES.filter(([id]) => id !== 'user'), label = tr(runtime, '출처');
    return fieldHtml(runtime, '출처', `<select data-ah-filter="source" aria-label="${esc(runtime, label)}">${optionsHtml(runtime, sources.map(([id, text]) => [id, tr(runtime, text)]), query.source)}</select>`);
}

function numberBox(runtime, attr, value, placeholder, label) {
    return `<input type="number" inputmode="numeric" min="1" class="ah-num" data-ah-q="${attr}" value="${esc(runtime, value)}" placeholder="${esc(runtime, tr(runtime, placeholder))}" aria-label="${esc(runtime, label)}">`;
}

/** 아이템 Lv. (minimum and maximum) and 가격 (a maximum in a currency, and the 살 수 있는 매물만 switch). */
function numberFields(runtime, values) {
    const query = liveQuery(runtime), level = tr(runtime, '아이템 Lv.'), price = tr(runtime, '가격'), shopView = runtime.deps.shopView;
    const currencies = runtime.deps.auctionHouse.searchRules.currencies.map(key => [key, shopView.currencyName(key)]), afford = !!runtime.state.gear.afford;
    const payable = `<button type="button" class="ah-variant${afford ? ' is-yes' : ''}" data-ah-afford aria-pressed="${afford}">${esc(runtime, tr(runtime, AFFORD_CHIP[1]))}</button>`;
    return `${fieldHtml(runtime, '아이템 Lv.', `${numberBox(runtime, 'levelMin', typed(values, query.levelMin), '최소', `${level} ${tr(runtime, '최소')}`)}<span class="ah-dash" aria-hidden="true">~</span>${numberBox(runtime, 'levelMax', typed(values, query.levelMax), '최대', `${level} ${tr(runtime, '최대')}`)}`)}
        ${fieldHtml(runtime, '가격', `${numberBox(runtime, 'priceMax', typed(values, query.priceMax), '최대', `${price} ${tr(runtime, '최대')}`)}<select data-ah-q="currency" aria-label="${esc(runtime, price)}">${optionsHtml(runtime, currencies, query.currency)}</select>${payable}`, ' is-price')}`;
}

/** The variant chips, each showing its state (상관없음, 있음, 없음). */
function variantField(runtime) {
    const chips = Object.entries(liveQuery(runtime).variants).map(([key, want]) => `<button type="button" class="ah-variant is-${want}" data-ah-variant="${esc(runtime, key)}" aria-pressed="${want !== 'any'}">
        <span>${esc(runtime, tr(runtime, VARIANT_LABELS[key]))}</span><small>${esc(runtime, tr(runtime, VARIANT_STATES[want]))}</small></button>`).join('');
    return fieldHtml(runtime, '변형', chips, ' is-variants');
}

/** The 조건 panel ('' while closed). values false: the shape alone (typed values left out), the key a repaint compares. */
function panelHtml(runtime, values) {
    if (!runtime.state.gear.panel) return '';
    return `<div class="ah-panel-grid">${sourceField(runtime)}${numberFields(runtime, values)}${variantField(runtime)}</div>`;
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

/** Paints a strip of tabs and hides its box while it has none. */
function paintStrip(box, html) {
    if (!box) return;
    paint(box, html);
    if (box.hidden !== !html) box.hidden = !html;
}

/** The search desk: the category and weapon strips, the search bar, the chips, the status side and the panel (the bar, the chips and the panel
 * are empty on 최근 거래), then the count line. */
export function paintTools(runtime, root) {
    const recent = recentMode(runtime), bar = root.querySelector('[data-ah-tools]'), chips = root.querySelector('[data-ah-chips]'), panel = root.querySelector('[data-ah-panel-box]');
    // The conditions were replaced (a saved search, a cleared chip): the boxes show the new values even when their shape stayed.
    if (runtime.toolsStale) {
        for (const box of [bar, chips, panel]) if (box) box.ahKey = null;
        runtime.toolsStale = false;
    }
    const shown = (make, values) => (recent ? '' : make(values));
    paintStrip(root.querySelector('[data-ah-cats]'), catsHtml(runtime));
    paintStrip(root.querySelector('[data-ah-weapons]'), weaponsHtml(runtime));
    paintShaped(bar, shown(values => barHtml(runtime, values), false), () => shown(values => barHtml(runtime, values), true));
    if (bar) bar.hidden = recent;
    patchCond(runtime, bar);
    paintShaped(chips, shown(values => chipsHtml(runtime, values), false), () => shown(values => chipsHtml(runtime, values), true));
    const status = root.querySelector('.ah-status'), side = statusShown(runtime);
    paint(root.querySelector('[data-ah-side]'), side ? sideHtml(runtime) : '');
    if (status && status.hidden === side) status.hidden = !side;
    paintShaped(panel, shown(values => panelHtml(runtime, values), false), () => shown(values => panelHtml(runtime, values), true));
    if (panel) panel.hidden = recent || !runtime.state.gear.panel;
    paintCount(runtime, root);
}

/** The count line: the search's progress (찾는 중), the result's size, or '' (no search yet, 최근 거래, the heads still being built). */
export function countText(runtime) {
    const search = runtime.search;
    if (recentMode(runtime) || !search) return '';
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
