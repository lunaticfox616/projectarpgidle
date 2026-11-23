/**
 * 경매장 아이템 칸 검색 상자의 자동완성. 상자 하나에 적으면 SUGGEST_MS 뒤에 적은 낱말을 모두 가진 옵션 이름(매물 줄이 가질 수 있는 능력치,
 * 플레이어의 언어)과 아이템 이름(베이스 이름과 고유 이름)을 함께 보인다: 그 말로 시작하는 것이 먼저, 옵션 OPTION_ROWS개와 이름 NAME_ROWS개까지
 * (한쪽이 모자라면 다른 쪽이 채운다). 줄마다 옵션인지 이름인지 표시가 붙고 적은 글자는 굵게 보인다. 고르면 옵션은 옵션 조건 칩으로 붙고 상자가
 * 비고, 이름은 상자를 채운다(둘 다 고른 뒤에 부르는 쪽이 검색한다). 화살표 키로 줄을 옮기고 Enter로 고른다. 추천 상자는 칸 옆의
 * data-ah-suggest 상자이고, 고르기, Escape, 칸 밖 누르기, 검색이 닫는다. 옵션 조건이 다 차면 이름만 보인다.
 */
import { esc, tr } from './auction-house-format.mjs';
import { liveQuery, statRows, addOption, optionRoom } from './auction-house-conditions.mjs';

const SUGGEST_MS = 90;
const OPTION_ROWS = 6;
const NAME_ROWS = 4;
const KIND_LABELS = Object.freeze({ option: '옵션', name: '이름' });

/** The names for the box in the player's language, made again when the language or the names the save may see change: [{ value, label, low }]. */
function nameRows(runtime) {
    const locale = runtime.deps.i18n.locale, kept = runtime.nameRows, names = runtime.deps.auctionHouse.searchNames(runtime.deps.game);
    if (kept && kept.locale === locale && kept.count === names.length) return kept.list;
    const labels = [...new Set(names.map(name => tr(runtime, name)))];
    runtime.nameRows = { locale, count: names.length, list: labels.map(label => ({ value: label, label, low: label.toLocaleLowerCase(locale) })) };
    return runtime.nameRows.list;
}

/** The option names that can still be added: [{ value (stat id), label, low }] ([] when the option conditions are full). */
function optionRows(runtime) {
    if (!optionRoom(runtime)) return [];
    const chosen = new Set(liveQuery(runtime).options.map(row => row.stat));
    return statRows(runtime).list.filter(row => !chosen.has(row.id)).map(row => ({ value: row.id, label: row.label, low: row.low }));
}

/** The rows of list holding every word, those starting with the whole text first. */
function hitsOf(list, low, words) {
    const hits = list.filter(row => words.every(word => row.low.includes(word)));
    return [...hits.filter(row => row.low.startsWith(low)), ...hits.filter(row => !row.low.startsWith(low))];
}

/** The suggestions for text: options then names ([{ kind, value, label, low }]); a side that has fewer leaves its rows to the other. */
function matchRows(runtime, text) {
    const low = text.trim().toLocaleLowerCase(runtime.deps.i18n.locale), words = low.split(/\s+/).filter(Boolean);
    if (!words.length) return { rows: [], low };
    const options = hitsOf(optionRows(runtime), low, words), names = hitsOf(nameRows(runtime), low, words), total = OPTION_ROWS + NAME_ROWS;
    const optionCount = Math.min(options.length, Math.max(OPTION_ROWS, total - names.length)), nameCount = Math.min(names.length, total - optionCount);
    return { rows: [...options.slice(0, optionCount).map(row => ({ ...row, kind: 'option' })), ...names.slice(0, nameCount).map(row => ({ ...row, kind: 'name' }))], low };
}

/** label with the typed text in bold where it stands in one piece. */
function markHtml(runtime, row, low) {
    const at = low ? row.low.indexOf(low) : -1;
    if (at < 0 || row.low.length !== row.label.length) return esc(runtime, row.label);
    return `${esc(runtime, row.label.slice(0, at))}<b>${esc(runtime, row.label.slice(at, at + low.length))}</b>${esc(runtime, row.label.slice(at + low.length))}`;
}

/** The suggestion box next to input (its wrapper's data-ah-suggest), or null. */
function boxOf(input) { return input.closest('.ah-name-box')?.querySelector('[data-ah-suggest]') || null; }

/** Fills input's box with the rows for its text; hidden when nothing matches. */
function showSuggest(runtime, input) {
    const box = boxOf(input);
    if (!box || !input.isConnected) return;
    const { rows, low } = matchRows(runtime, input.value);
    box.innerHTML = rows.map(row => `<button type="button" role="option" class="ah-sg is-${row.kind}" tabindex="-1" data-ah-suggest-pick="${esc(runtime, row.value)}" data-ah-suggest-for="${row.kind}"><small>${esc(runtime, tr(runtime, KIND_LABELS[row.kind]))}</small><span>${markHtml(runtime, row, low)}</span></button>`).join('');
    box.hidden = !rows.length;
    input.setAttribute('aria-expanded', String(rows.length > 0));
}

/** Shows input's suggestions SUGGEST_MS after the last keystroke. */
export function scheduleSuggest(runtime, input) {
    const window = runtime.deps.window;
    if (runtime.suggestTimer) window.clearTimeout(runtime.suggestTimer);
    runtime.suggestTimer = window.setTimeout(() => {
        runtime.suggestTimer = 0;
        showSuggest(runtime, input);
    }, SUGGEST_MS);
}

/** Hides every suggestion box under root (and a pending one). */
export function hideSuggest(runtime, root) {
    if (runtime.suggestTimer) runtime.deps.window.clearTimeout(runtime.suggestTimer);
    runtime.suggestTimer = 0;
    for (const box of root ? root.querySelectorAll('[data-ah-suggest]') : []) {
        box.hidden = true;
        box.closest('.ah-name-box')?.querySelector('input')?.setAttribute('aria-expanded', 'false');
    }
}

/** The shown suggestion marked by the arrow keys, or null. */
export function activeSuggest(input) {
    const box = boxOf(input);
    return box && !box.hidden ? box.querySelector('.is-active') : null;
}

/** An arrow key in the box: marks the next (step 1) or the previous (step -1) shown suggestion, wrapping. Returns whether one was marked. */
export function moveSuggest(input, step) {
    const box = boxOf(input), rows = box && !box.hidden ? [...box.querySelectorAll('[data-ah-suggest-pick]')] : [];
    if (!rows.length) return false;
    const at = rows.findIndex(row => row.classList.contains('is-active')), next = at < 0 ? (step > 0 ? 0 : rows.length - 1) : (at + step + rows.length) % rows.length;
    rows.forEach((row, index) => { row.classList.toggle('is-active', index === next); row.setAttribute('aria-selected', String(index === next)); });
    rows[next].scrollIntoView({ block: 'nearest' });
    return true;
}

/** A picked suggestion: an option becomes an option condition and the box empties; a name fills the box. Returns whether the conditions
 * changed. */
export function pickSuggest(runtime, el) {
    const kind = el.getAttribute('data-ah-suggest-for'), value = el.getAttribute('data-ah-suggest-pick'), input = el.closest('.ah-name-box')?.querySelector('input');
    const query = liveQuery(runtime);
    if (kind === 'option') {
        if (!addOption(runtime, value)) return false;
        query.name = '';
    } else if (kind === 'name') query.name = value;
    else return false;
    if (input) input.value = query.name;
    hideSuggest(runtime, el.closest('.ah-gear'));
    return true;
}
