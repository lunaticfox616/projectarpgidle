/**
 * 경매장 아이템 칸 입력 칸 아래의 추천: 이름 칸은 매물이 가질 수 있는 베이스 이름과 고유 이름, 옵션 줄의 칸은 매물 줄이 가질 수 있는 능력치
 * 이름(플레이어의 언어). 적다가 SUGGEST_MS 쉬면 적은 낱말을 모두 가진 것을 SUGGEST_ROWS개까지 보이고(그 말로 시작하는 것 먼저), 하나를 누르면
 * 그 칸을 채운다(검색하지 않는다). 추천 상자는 칸 옆의 data-ah-suggest 상자이고, 고르기, Escape, 칸 밖 누르기, 검색이 닫는다.
 */
import { esc, tr } from './auction-house-format.mjs';
import { liveQuery, statRows, pickOptionStat } from './auction-house-conditions.mjs';

const SUGGEST_MS = 120;
const SUGGEST_ROWS = 8;

/** The names for the name box in the player's language, made once per language: [{ value, label, low }]. */
function nameRows(runtime) {
    const locale = runtime.deps.i18n.locale, kept = runtime.nameRows;
    if (kept && kept.locale === locale) return kept.list;
    const labels = [...new Set(runtime.deps.auctionHouse.searchNames().map(name => tr(runtime, name)))];
    runtime.nameRows = { locale, list: labels.map(label => ({ value: label, label, low: label.toLocaleLowerCase(locale) })) };
    return runtime.nameRows.list;
}

/** The option names as suggestion rows: [{ value (stat id), label, low }]. */
function optionRows(runtime) {
    return statRows(runtime).list.map(row => ({ value: row.id, label: row.label, low: row.low }));
}

/** Up to SUGGEST_ROWS rows holding every word of text, those starting with it first; none for empty text. */
function matchRows(runtime, rows, text) {
    const low = text.trim().toLocaleLowerCase(runtime.deps.i18n.locale), words = low.split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const hits = rows.filter(row => words.every(word => row.low.includes(word)));
    return [...hits.filter(row => row.low.startsWith(low)), ...hits.filter(row => !row.low.startsWith(low))].slice(0, SUGGEST_ROWS);
}

/** The suggestion box next to input (its wrapper's data-ah-suggest), or null. */
function boxOf(input) { return input.closest('.ah-name-box')?.querySelector('[data-ah-suggest]') || null; }

/** Fills input's box with the rows for its text (target 'name' or 'option:index'); hidden when nothing matches. */
function showSuggest(runtime, input, target) {
    const box = boxOf(input);
    if (!box || !input.isConnected) return;
    const rows = matchRows(runtime, target === 'name' ? nameRows(runtime) : optionRows(runtime), input.value);
    box.innerHTML = rows.map(row => `<button type="button" role="option" data-ah-suggest-pick="${esc(runtime, row.value)}" data-ah-suggest-for="${esc(runtime, target)}">${esc(runtime, row.label)}</button>`).join('');
    box.hidden = !rows.length;
}

/** Shows input's suggestions SUGGEST_MS after the last keystroke (target: 'name' or 'option:index'). */
export function scheduleSuggest(runtime, input, target) {
    const window = runtime.deps.window;
    if (runtime.suggestTimer) window.clearTimeout(runtime.suggestTimer);
    runtime.suggestTimer = window.setTimeout(() => {
        runtime.suggestTimer = 0;
        showSuggest(runtime, input, target);
    }, SUGGEST_MS);
}

/** Hides every suggestion box under root (and a pending one). */
export function hideSuggest(runtime, root) {
    if (runtime.suggestTimer) runtime.deps.window.clearTimeout(runtime.suggestTimer);
    runtime.suggestTimer = 0;
    for (const box of root ? root.querySelectorAll('[data-ah-suggest]') : []) box.hidden = true;
}

/** A picked suggestion fills its box: the name, or an option row's stat. */
export function pickSuggest(runtime, el) {
    const target = el.getAttribute('data-ah-suggest-for'), value = el.getAttribute('data-ah-suggest-pick'), input = el.closest('.ah-name-box')?.querySelector('input');
    const [part, index] = String(target).split(':');
    if (part === 'name') liveQuery(runtime).name = value;
    else if (part === 'option') pickOptionStat(runtime, Number(index), value);
    else return;
    const row = part === 'option' ? liveQuery(runtime).options[Number(index)] : null;
    if (input) input.value = row ? row.text : value;
    hideSuggest(runtime, el.closest('.ah-gear'));
    input?.focus({ preventScroll: true });
}
