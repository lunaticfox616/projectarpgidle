import { blackPanel, blackClockText, blackMarketMarkup, chosenBlackOffer, blackOfferCardHtml, blackOffers } from './black-market-markup.mjs';

/** Draws the market's black market panel when what it shows changed (not under a carried offer or an open select), and the clock.
* The clock is written apart from the markup (2026-10-23): in it, the panel was drawn anew every second, and the focus on a ware or
* a button went with it. */
export function drawBlackMarket(runtime, force = false) {
    if (!runtime.active) return;
    const panel = blackPanel(runtime);
    if (!panel || runtime.deps.shopView.dragging()) return;
    if (force || !(panel.contains(runtime.deps.document.activeElement) && runtime.deps.document.activeElement.tagName === 'SELECT')) {
        // A refresh (its time ran out) put other offers there: the old card would describe what is gone.
        clearChangedBlackOffer(runtime);
        const html = blackMarketMarkup(runtime);
        if (panel.shopMarkup !== html) { panel.innerHTML = html; panel.shopMarkup = html; }
    }
    const clock = panel.querySelector('[data-black-clock]');
    if (clock) clock.textContent = blackClockText(runtime);
}

export function clearChangedBlackOffer(runtime) {
    if (runtime.state.chosen && !chosenBlackOffer(runtime)) { runtime.state.chosen = null; runtime.state.note = '진열이 바뀌었습니다. 물건을 다시 골라 주세요.'; }
}

/** Only the sheet (and the chosen mark) change: the shelf under the pointer stays. */
export function paintBlackCard(runtime) {
    const panel = blackPanel(runtime), root = panel?.querySelector('.shop-view');
    if (!root) return;
    runtime.deps.shopView.markChosen(root, chosenBlackOffer(runtime) ? `offer:${chosenBlackOffer(runtime).index}` : null);
    runtime.deps.shopView.paintInfo(root, blackOfferCardHtml(runtime));
    panel.shopMarkup = blackMarketMarkup(runtime);
}

/** Chooses offer index: its card stays (with its buy and lock buttons) until another is chosen. */
export function chooseBlackOffer(runtime, index) {
    const offer = blackOffers(runtime)[index];
    if (!offer) return;
    runtime.state.chosen = { index, offer };
    runtime.state.note = '';
    paintBlackCard(runtime);
}

export function noteBlackMarket(runtime, text) { runtime.state.note = text; drawBlackMarket(runtime, true); }

/** Asks with requestGameConfirmation while no other black market dialog is open (false when one already is). True only when the
* player agreed and the trade may still go on the very game and account it was asked about: a cloud load, a sign-in or an offline
* replay can replace either while the dialog waits, and a confirmed expansion then charged the new game. The trade itself still
* checks the purse and the shelf (a purse change on the same game is refused there). */
export async function askBlackMarket(runtime, text, options) {
    if (!runtime.active || runtime.state.pending) return false;
    const owner = runtime.deps.game, account = (0, runtime.deps.getActiveCloudUserId)();
    runtime.state.pending = true;
    let accepted = false;
    try {
        accepted = await (0, runtime.deps.requestGameConfirmation)(text, options);
    } finally {
        runtime.state.pending = false;
    }
    if (!runtime.active || !accepted) return false;
    if (runtime.deps.game !== owner || (0, runtime.deps.getActiveCloudUserId)() !== account) {
        runtime.state.chosen = null;
        noteBlackMarket(runtime, '확인하는 사이 계정이나 게임이 바뀌어 거래하지 않았습니다.');
        return false;
    }
    return stillFree(runtime);
}

/** After a dialog: true while trading may still go, else notes why (an offline replay began meanwhile and would undo the trade). */
export function stillFree(runtime) {
    const busy = runtime.deps.shopView.busyReason();
    if (busy) noteBlackMarket(runtime, busy);
    return !busy;
}

/** Buys offer index (asking first for chase, target and costly uniques) into place or the first free bag place. */
export async function buyBlackOffer(runtime, index, place = null) {
    const offer = blackOffers(runtime)[index], busy = runtime.deps.shopView.busyReason();
    if (!offer || runtime.state.pending) return;
    runtime.state.chosen = { index, offer };
    if (busy) return noteBlackMarket(runtime, busy);
    const ask = runtime.deps.blackMarketShop.confirmText(offer);
    if (ask && !await askBlackMarket(runtime, ask, { title: blackPurchaseTitle(runtime, offer), tone: 'danger', confirmLabel: (0, runtime.deps._t)('구매') })) return;
    const result = runtime.deps.blackMarketShop.buy(index, { place, offer });
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    if (!ask) (0, runtime.deps.playUiFeedbackSound)('uiConfirm'); // A confirmed purchase already sounded in the dialog.
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🕶️ 암거래 구매, {summary}', { summary: result.summary }), result.notable ? 'loot-unique' : 'loot-magic');
    runtime.state.chosen = null; runtime.state.note = '';
    (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
    (0, runtime.deps.saveGame)({ skipCloudSync: true });
    drawBlackMarket(runtime, true);
}

export function blackPurchaseTitle(runtime, offer) {
    return offer.chase ? '체이싱 고유 구매' : offer.featured ? '표적 고유 구매' : '고가 암거래 구매';
}

export function lockBlackOffer(runtime) {
    const pick = chosenBlackOffer(runtime);
    if (!pick) return;
    const result = runtime.deps.blackMarketShop.lock(pick.index);
    runtime.state.note = result.ok ? '' : result.reason;
    (0, runtime.deps.queueImportantSave)(200);
    drawBlackMarket(runtime, true);
}

export async function refreshBlackMarketPaid(runtime) {
    const cost = runtime.deps.blackMarketShop.refreshCost(), busy = runtime.deps.shopView.busyReason();
    if (runtime.state.pending) return;
    if (busy) return noteBlackMarket(runtime, busy);
    if (!await askBlackMarket(runtime, `잠그지 않은 물건을 지금 바꿉니다.\n형체 없는 이슬 ${cost}개를 쓰고, 잠근 물건 ${runtime.deps.blackMarketShop.lockCount()}개는 남습니다.`,
            { title: (0, runtime.deps._t)('암거래 즉시 갱신'), confirmLabel: (0, runtime.deps._t)('갱신'), danger: false })) return;
    if (runtime.deps.blackMarketShop.refreshCost() !== cost) return noteBlackMarket(runtime, '확인하는 동안 갱신 값이 바뀌었습니다. 다시 눌러 주세요.');
    const result = runtime.deps.blackMarketShop.refreshNow();
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🕶️ 암거래 즉시 갱신, 형체 없는 이슬 {cost}개', { cost: result.cost }), 'loot-magic');
    runtime.state.chosen = null; runtime.state.note = '';
    (0, runtime.deps.updateStaticUI)();
    drawBlackMarket(runtime, true);
}

export async function expandBlackMarketShelf(runtime) {
    const cost = runtime.deps.blackMarketShop.expandCost(), busy = runtime.deps.shopView.busyReason();
    if (runtime.state.pending) return;
    if (busy) return noteBlackMarket(runtime, busy);
    if (!await askBlackMarket(runtime, (0, runtime.deps.buildGoldenRuleSpendPrompt)(`황금률 ${cost}개를 써서 진열을 1칸 늘립니다(영구).\n지금 물건과 잠금은 그대로입니다.`),
            { title: (0, runtime.deps._t)('암거래 진열 늘리기'), tone: 'danger', confirmLabel: (0, runtime.deps._t)('늘리기') })) return;
    if (runtime.deps.blackMarketShop.expandCost() !== cost) return noteBlackMarket(runtime, '확인하는 동안 값이 바뀌었습니다. 다시 눌러 주세요.');
    const result = runtime.deps.blackMarketShop.expand();
    if (!result.ok) return noteBlackMarket(runtime, result.reason);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('🕶️ 암거래 진열 {count}/{BLACK_MARKET_MAX_SLOT_COUNT}칸, 황금률 {cost}개', { count: result.count, BLACK_MARKET_MAX_SLOT_COUNT: runtime.deps.BLACK_MARKET_MAX_SLOT_COUNT, cost: result.cost }), 'loot-unique');
    (0, runtime.deps.updateStaticUI)();
    drawBlackMarket(runtime, true);
}

export function trackBlackMarketSlot(runtime, slot) {
    if (runtime.deps.blackMarketShop.track(slot)) (0, runtime.deps.addLog)((0, runtime.deps._t)('🕶️ 암거래 추적 부위: {slot}', { slot: slot === 'any' ? (0, runtime.deps._t)('전체 부위') : (0, runtime.deps.getItemSlotDisplayLabel)(null, slot) }), 'loot-normal');
    (0, runtime.deps.queueImportantSave)(200);
    drawBlackMarket(runtime, true);
}
