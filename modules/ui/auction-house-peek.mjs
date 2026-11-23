/**
 * 경매장 아이템 칸의 매물 행에 마우스를 올리면 뜨는 게임의 아이템 툴팁(가방과 장비 창이 쓰는 그 툴팁, 낀 장비와의 비교도 같다). 장비, 주얼,
 * 액막이는 showItemTooltip에 매물의 아이템을 넘기고, 부적은 그루터기 함의 카드 글을 글 툴팁(showInfoTooltipHtml)으로 보인다. 터치는 뜨지 않는다
 * (누르면 자세히 칸이 선다). 같은 행 위에서 움직이는 동안은 그 행의 매물을 다시 읽지 않는다. 행을 벗어나거나, 목록 상자를 다시 짓거나, 칸이
 * 닫히면 툴팁을 치운다.
 */
import { lotKind } from './auction-house-kinds.mjs';
import { rowLot } from './auction-house-search.mjs';

const rowOf = node => node?.closest?.('#market-panel-auction .ah-lot[data-ah-lot]') || null;

/** The mouse is over a lot row (pointerover, pointermove): its tooltip follows the pointer. */
export function peekLot(runtime, event) {
    const row = event.pointerType === 'touch' ? null : rowOf(event.target);
    if (!row) return;
    const id = row.dataset.ahLot, kept = runtime.peek, lot = kept && kept.id === id ? kept.lot : rowLot(runtime, id);
    if (!lot) return;
    const info = lotKind(lot) === 'talisman', token = `auction:${id}`;
    runtime.peek = { id, lot, info };
    if (!info) { runtime.deps.showItemTooltip(event, null, false, lot.item, { token }); return; }
    const html = runtime.deps.statToneText.markup(runtime.deps.stumpBoxUi.itemTipHtml(lot.item, true));
    runtime.deps.showInfoTooltipHtml(event.clientX, event.clientY, html, runtime.deps.getRarityColor(lot.item.rarity), token);
}

/** The mouse left a lot row (pointerout to anything outside it): its tooltip goes. */
export function unpeekLot(runtime, event) {
    const row = rowOf(event.target), kept = runtime.peek;
    if (!kept || !row || row.contains(event.relatedTarget)) return;
    runtime.peek = null;
    if (kept.info) runtime.deps.hideInfoTooltip();
    else runtime.deps.hideItemTooltip(event);
}

/** Takes the tooltip away at once (the rows are rebuilt, the section closed). */
export function hidePeek(runtime) {
    const kept = runtime.peek;
    if (!kept) return;
    runtime.peek = null;
    if (kept.info) runtime.deps.hideInfoTooltip();
    else runtime.deps.hideItemTooltip();
}
