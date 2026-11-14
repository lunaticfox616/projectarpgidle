import { orgaRedraw, coinName, count, orgaSetQuantity, orgaRedrawQuote } from './currency-exchange-markup.mjs';

/** Asks before a trade of more than one, then trades on the game it asked about (an offline replay can replace it meanwhile). */
export async function orgaTrade(runtime) {
    if (!runtime.active || runtime.state.trading || !runtime.state.chosen) return;
    runtime.state.trading = true;
    try {
        await orgaTradeOnce(runtime, runtime.deps.game);
    } finally {
        runtime.state.trading = false;
        if (runtime.active) orgaRedraw(runtime);
    }
}

/** More than one asks first (js/ui.js requestGameConfirmation). @returns {Promise<boolean>} whether to go on */
export function orgaConfirm(runtime, quote, words) {
    if (quote.times <= 1) return Promise.resolve(true);
    return (0, runtime.deps.requestGameConfirmation)((0, runtime.deps._t)('{out} {spend}개를 내고 {into} {gain}개를 받을까요?', words),
        { title: (0, runtime.deps._t)('재화 교환'), tone: 'danger', confirmLabel: runtime.state.side === 'sell' ? (0, runtime.deps._t)('판매') : (0, runtime.deps._t)('구매') });
}

export async function orgaTradeOnce(runtime, owner) {
    const request = { key: runtime.state.chosen, side: runtime.state.side, quantity: runtime.state.quantity,
        account: (0, runtime.deps.getActiveCloudUserId)() };
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, runtime.state.quantity, owner), busy = runtime.deps.shopView.busyReason();
    if (busy || !quote.valid) return (0, runtime.deps.addLog)(busy || quote.reason, 'attack-monster');
    const [out, into] = runtime.state.side === 'sell' ? [runtime.state.chosen, quote.pay] : [quote.pay, runtime.state.chosen];
    const words = { out: coinName(runtime, out), spend: count(runtime, quote.spend), into: coinName(runtime, into), gain: count(runtime, quote.gain) };
    if (!await orgaConfirm(runtime, quote, words)) return;
    if (!runtime.active) return;
    if (!exchangeRequestCurrent(runtime, owner, request, quote)) return (0, runtime.deps.addLog)((0, runtime.deps._t)('확인하는 사이 게임 상태가 바뀌어 교환을 취소했습니다.'), 'attack-monster');
    const result = runtime.deps.currencyExchange.trade(request.key, request.side, request.quantity, owner);
    if (!result.ok) return (0, runtime.deps.addLog)(result.reason, 'attack-monster');
    (0, runtime.deps.notifyCurrencyAcquisition)(into, result.gain);
    (0, runtime.deps.addLog)((0, runtime.deps._t)('베일라와 교환: {out} {spend}개 → {into} {gain}개', words), 'loot-magic');
    (0, runtime.deps.queueImportantSave)(180);
    (0, runtime.deps.checkUnlocks)();
    (0, runtime.deps.updateStaticUI)();
}

/** Confirm exactly the quoted selection and amount, on the same save/account. */
function exchangeRequestCurrent(runtime, owner, request, quote) {
    if (runtime.deps.shopView.busyReason() || runtime.deps.game !== owner) return false;
    if ((0, runtime.deps.getActiveCloudUserId)() !== request.account) return false;
    if (runtime.state.chosen !== request.key || runtime.state.side !== request.side || runtime.state.quantity !== request.quantity) return false;
    const current = runtime.deps.currencyExchange.quote(request.key, request.side, request.quantity, owner);
    return current.valid && ['pay', 'spend', 'gain', 'times'].every(key => current[key] === quote[key]);
}

export function orgaClick(runtime, event) {
    const root = event.target.closest && event.target.closest('[data-orga-exchange]');
    const button = root && event.target.closest('button');
    if (!button) return;
    if (button.dataset.orgaSide) { runtime.state.side = button.dataset.orgaSide; runtime.state.quantity = 1; orgaRedraw(runtime); return; }
    if (button.dataset.orgaKey) { runtime.state.chosen = button.dataset.orgaKey; runtime.state.quantity = 1; orgaRedraw(runtime); return; }
    if (button.dataset.orgaStep) { orgaSetQuantity(runtime, runtime.state.quantity + Number(button.dataset.orgaStep)); orgaRedraw(runtime); return; }
    if (button.dataset.orgaSet) { orgaSetQuantity(runtime, button.dataset.orgaSet); orgaRedraw(runtime); return; }
    if (button.hasAttribute('data-orga-trade')) orgaTrade(runtime);
}

export function orgaInput(runtime, event) {
    if (!event.target.matches || !event.target.matches('[data-orga-qty]')) return;
    runtime.state.quantity = Math.max(1, Math.floor(Number(event.target.value) || 1));
    orgaRedrawQuote(runtime);
}
