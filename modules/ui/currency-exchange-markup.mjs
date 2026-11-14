/** A rate as people say it: "1개 → 이슬 2.8" or "15개 → 이슬 1" (sell) / "이슬 1 → 4개" (buy). */
export function rateText(runtime, quote) {
    const pay = `${coinArt(runtime, quote.pay)}${esc(runtime, coinName(runtime, quote.pay))}`;
    const rounded = Math.round(quote.rate * 100) / 100;
    if (quote.rate >= 1) return runtime.state.side === 'sell' ? (0, runtime.deps._t)('1개 → {pay} {rate}', { pay, rate: rounded }) : (0, runtime.deps._t)('{pay} {rate} → 1개', { pay, rate: rounded });
    if (runtime.state.side === 'sell') return (0, runtime.deps._t)('{count}개 → {pay} 1', { count: Math.ceil(1 / quote.rate - 1e-9), pay });
    return (0, runtime.deps._t)('{pay} 1 → {count}개', { pay, count: Math.floor(1 / quote.rate + 1e-9) });
}

export function changeHtml(runtime, quote) {
    if ((runtime.deps.game.season || 1) < 2) return '';
    const percent = Math.round(quote.change * 100);
    if (!percent) return `<em class="orga-change">${(0, runtime.deps._t)('지난 루프와 같음')}</em>`;
    return `<em class="orga-change ${percent > 0 ? 'is-up' : 'is-down'}">${percent > 0 ? '▲' : '▼'}${Math.abs(percent)}%</em>`;
}

/** The way in under Orga's talk (js/content-progression-ui.js npcFoot); nothing for the other NPCs. */
export function orgaDoorHtml(runtime, npc) {
    if (npc.id !== runtime.deps.NPC_CURRENCY_EXCHANGE.npc) return '';
    return `<button type="button" class="npc-dialog-shop npc-dialog-exchange" data-npc-topic="exchange"><span>${(0, runtime.deps._t)('재화 교환')}</span><b>${(0, runtime.deps._t)('판매, 구매')}</b></button>`;
}

export function orgaCellHtml(runtime, key) {
    const held = runtime.deps.game.currencies[key] || 0, on = key === runtime.state.chosen;
    return `<button type="button" class="orga-cell${on ? ' is-chosen' : ''}${held ? '' : ' is-empty'}" data-orga-key="${key}"
            aria-pressed="${on}" aria-label="${esc(runtime, coinName(runtime, key))}, ${esc(runtime, (0, runtime.deps._t)('보유 {currencies}', { currencies: count(runtime, held) }))}" data-tip="${esc(runtime, coinName(runtime, key))}">${coinArt(runtime, key, 'orga-cell-art')}${held ? `<b>${count(runtime, held)}</b>` : ''}</button>`;
}

export function orgaBoardHtml(runtime) {
    const groups = runtime.state.GROUPS.map(group => ({ label: group.label, keys: group.keys.filter(runtime.handlers.listed) })).filter(group => group.keys.length);
    if (!groups.length) return `<p class="orga-empty">${runtime.state.side === 'sell' ? (0, runtime.deps._t)('팔 재화가 없습니다.') : (0, runtime.deps._t)('살 수 있는 재화가 없습니다.')}</p>`;
    return groups.map(group => `<section class="orga-group"><h4>${esc(runtime, (0, runtime.deps._t)(group.label))}</h4><div class="orga-cells">${group.keys.map(runtime.handlers.orgaCellHtml).join('')}</div></section>`).join('');
}

export function orgaQuoteHtml(runtime) {
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, runtime.state.quantity, runtime.deps.game);
    const [out, into] = runtime.state.side === 'sell' ? [runtime.state.chosen, quote.pay] : [quote.pay, runtime.state.chosen];
    const line = (label, key, amount) => `<div><dt>${label}</dt><dd>${coinArt(runtime, key)}${esc(runtime, (0, runtime.deps._t)('{name} {count}개', { name: coinName(runtime, key), count: count(runtime, amount) }))}</dd></div>`;
    return `<dl class="orga-quote">${line((0, runtime.deps._t)('낼 재화'), out, quote.spend)}${line((0, runtime.deps._t)('받을 재화'), into, quote.gain)}</dl>
            <p class="orga-reason" aria-live="polite">${quote.valid ? '' : esc(runtime, quote.reason)}</p>
            <button type="button" class="orga-confirm" data-orga-trade ${quote.valid ? '' : 'disabled'}>${runtime.state.side === 'sell' ? (0, runtime.deps._t)('판매') : (0, runtime.deps._t)('구매')}</button>`;
}

export function orgaDetailHtml(runtime) {
    if (!runtime.state.chosen) return `<p class="orga-empty">${(0, runtime.deps._t)('왼쪽에서 재화를 고르세요.')}</p>`;
    const quote = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, 1, runtime.deps.game);
    return `<div class="orga-pick">${coinArt(runtime, runtime.state.chosen, 'orga-pick-art')}<div><h4>${esc(runtime, coinName(runtime, runtime.state.chosen))}</h4><small>${(0, runtime.deps._t)('보유 {currencies}', { currencies: count(runtime, runtime.deps.game.currencies[runtime.state.chosen] || 0) })}</small></div></div>
            <p class="orga-rate"><span>${(0, runtime.deps._t)('이번 루프 시세')}</span><strong>${rateText(runtime, quote)}</strong>${changeHtml(runtime, quote)}</p>
            <div class="orga-qty"><button type="button" data-orga-step="-1" aria-label="${(0, runtime.deps._t)('하나 덜')}">-</button>
                <input type="number" min="1" step="1" inputmode="numeric" value="${runtime.state.quantity}" data-orga-qty aria-label="${(0, runtime.deps._t)('교환할 수량')}">
                <button type="button" data-orga-step="1" aria-label="${(0, runtime.deps._t)('하나 더')}">+</button><button type="button" data-orga-set="10">10</button><button type="button" data-orga-set="max">${(0, runtime.deps._t)('최대')}</button></div>
            <div class="orga-quote-box">${orgaQuoteHtml(runtime)}</div>`;
}

/** The chosen currency stays while it is on this side's list; otherwise the first one there. */
export function orgaKeepChoice(runtime) {
    if (runtime.state.chosen && shownKeys(runtime).includes(runtime.state.chosen)) return;
    runtime.state.chosen = shownKeys(runtime)[0] || '';
    runtime.state.quantity = 1;
}

/** The exchange screen inside Orga's window (js/content-progression-ui.js renderNpc). */
export function orgaBodyHtml(runtime) {
    runtime.deps.currencyExchange.capture(runtime.deps.game);
    orgaKeepChoice(runtime);
    const tab = (id, label) => `<button type="button" role="tab" data-orga-side="${id}" aria-selected="${runtime.state.side === id}">${label}</button>`;
    return `<div class="orga-exchange" data-orga-exchange><header class="shop-bar"><button type="button" class="shop-back" data-npc-topic="greet">${(0, runtime.deps._t)('대화')}</button>
            <h3>${(0, runtime.deps._t)('재화 교환')}</h3>${runtime.deps.shopView.walletHtml([...runtime.state.WALLET])}</header>
            <nav class="orga-sides" role="tablist" aria-label="${(0, runtime.deps._t)('재화 교환')}">${tab('sell', (0, runtime.deps._t)('판매'))}${tab('buy', (0, runtime.deps._t)('구매'))}</nav>
            <div class="orga-body"><div class="orga-board">${orgaBoardHtml(runtime)}</div><aside class="orga-detail">${orgaDetailHtml(runtime)}</aside></div></div>`;
}

export function orgaRedraw(runtime) {
    const root = runtime.deps.document.querySelector('[data-orga-exchange]');
    if (root) root.outerHTML = orgaBodyHtml(runtime);
}

export function orgaRedrawQuote(runtime) {
    const box = runtime.deps.document.querySelector('[data-orga-exchange] .orga-quote-box');
    if (box) box.innerHTML = orgaQuoteHtml(runtime);
}

export function orgaSetQuantity(runtime, value) {
    const max = runtime.deps.currencyExchange.quote(runtime.state.chosen, runtime.state.side, 'max', runtime.deps.game).max;
    runtime.state.quantity = value === 'max' ? Math.max(1, max) : Math.max(1, Math.floor(Number(value) || 1));
}

export function esc(runtime, value) { return (0, runtime.deps.escapeHTML)(String(value)); }

export function info(runtime, key) { return runtime.deps.ORB_DB[key] || runtime.deps.WALLET_CURRENCY_INFO[key] || { name: key }; }

export function coinName(runtime, key) { return (0, runtime.deps._t)(info(runtime, key).name); }

export function coinArt(runtime, key, className = 'orga-coin') { return info(runtime, key).icon ? `<img class="${className}" src="${esc(runtime, info(runtime, key).icon)}" alt="" draggable="false">` : ''; }

export function count(runtime, value) { return Number(value).toLocaleString(runtime.deps.i18n.locale); }

export function listed(runtime, key) { return runtime.state.side === 'sell' ? (runtime.deps.game.currencies[key] || 0) > 0 : runtime.deps.currencyExchange.hasSeen(runtime.deps.game, key) && !runtime.deps.NPC_CURRENCY_EXCHANGE.noBuy.includes(key); }

export function shownKeys(runtime) { return runtime.state.GROUPS.flatMap(group => group.keys).filter(runtime.handlers.listed); }
