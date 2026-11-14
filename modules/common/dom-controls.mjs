/**
 * Writes html into a node only when it differs from what was last written there (node.__lastHtml, the convention other panels use).
 * Comparing with node.innerHTML never matches: the browser serializes the parsed markup differently (2026-10-25 측정: 열린 장비 · 지도 ·
 * 루프 창이 화면 갱신마다 같은 내용을 통째로 다시 써 갱신 한 번이 1.2ms에서 3~9ms로 늘었다). A missing node is skipped.
 * @returns {boolean} whether it wrote.
 */
export function writeHtmlIfChanged(node, html) {
    if (!node || node.__lastHtml === html) return false;
    node.innerHTML = node.__lastHtml = html;
    return true;
}
/** Input types that take typed text. input.type reads 'text' for a missing or unknown type. */
const TEXT_ENTRY_INPUT_TYPES = Object.freeze(new Set(['text', 'search', 'email', 'password', 'tel', 'url', 'number', 'date', 'datetime-local', 'month', 'time', 'week']));
/**
 * Whether a key press goes into a field that takes typed text (a text-like input, a textarea, editable content): the game's hotkeys and
 * Esc leave such a key alone. A select box, checkbox, slider or button keeps focus after a click but takes no typing, so the keys still
 * work there (2026-11-08 사용자: 그루터기 함과 설정에서 셀렉박스를 고르거나 옵션을 바꾼 뒤 단축키로 창이 닫히지 않았다).
 * @param {EventTarget|null} target the key event's target
 */
export function isTextEntryElement(target, ElementClass) {
    if (!(target instanceof ElementClass)) return false;
    if (target.closest('textarea,[contenteditable="true"]')) return true;
    const input = target.closest('input');
    return !!input && TEXT_ENTRY_INPUT_TYPES.has(input.type);
}
