/**
 * 경매장 출품의 양식(예전 내 출품 진열대의 것): 감정가, 출품가(2 ~ 감정가 x 1.2), 가격의 느낌(가판대의 말을 판매 확률로 고른다), 수수료와 받을 금액.
 * 출품한 것은 출품가, 남은 시간, 받을 금액과 회수(기간이 끝난 것은 장비 회수).
 */
import { priceTag } from './auction-house-format.mjs';

function tr(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }

/** The ask a fresh draft starts at: the appraisal now, clamped into askMin..askMax. */
export function startingAsk(quote) { return Math.max(quote.askMin, Math.min(quote.askMax, Math.round(quote.fairNow))); }

function moodOf(chance) {
    if (chance >= 0.9) return ['금방 팔리는 가격', 'is-fast'];
    return chance >= 0.6 ? ['적당한 가격', 'is-fair'] : ['오래 걸리는 가격', 'is-slow'];
}

/** The terms under the ask input (repainted alone while the ask is typed). */
export function askTermsHtml(runtime, quote, ask) {
    const valid = Number.isSafeInteger(ask) && ask >= quote.askMin && ask <= quote.askMax;
    if (!valid) return `<p class="ah-why" role="status">${tr(runtime, '출품가는 {min}~{max} 사이의 정수로 입력하세요.', { min: quote.askMin, max: quote.askMax })}</p>`;
    const [mood, tone] = moodOf(quote.chanceAt(ask));
    return `<p class="ah-mood ${tone}">${tr(runtime, mood)}</p>
        <dl class="ah-receipt"><div class="ah-receipt-row is-fee"><dt>${tr(runtime, '수수료')}</dt><dd>${priceTag(runtime, quote.currency, quote.feeAt(ask))}</dd></div>
        <div class="ah-receipt-row is-total"><dt>${tr(runtime, '받을 금액')}</dt><dd>${priceTag(runtime, quote.currency, quote.netAt(ask))}</dd></div></dl>`;
}

/** The new auction listing's form, or why the appraisal is too low. */
export function auctionFormHtml(runtime, item, blocked) {
    const quote = runtime.deps.auctionHouse.listQuote(runtime.deps.game, item);
    if (!quote || !quote.listable) return `<p class="ah-why" role="status">${tr(runtime, '감정가가 낮아 출품할 수 없습니다.')}</p>`;
    const ask = runtime.state.draftAsk === '' ? String(startingAsk(quote)) : runtime.state.draftAsk, slot = runtime.state.pendingSlot;
    const button = blocked ? tr(runtime, '출품할 수 없습니다') : slot === null ? tr(runtime, '첫 빈칸에 출품') : tr(runtime, '{value}번 칸에 출품', { value: slot + 1 });
    return `<p class="ah-stand-fair"><span>${tr(runtime, '감정가')}</span>${priceTag(runtime, quote.currency, quote.fairNow)}</p>
        <label class="stall-price-label" for="lst-ask">${tr(runtime, '출품가 ({name})', { name: runtime.deps.shopView.currencyName(quote.currency) })}</label>
        <input id="lst-ask" type="number" inputmode="numeric" min="${quote.askMin}" max="${quote.askMax}" step="1" value="${runtime.deps.escapeHTML(ask)}" data-lst-ask>
        <div class="ah-ask-terms" data-lst-ask-terms aria-live="polite">${askTermsHtml(runtime, quote, Number(ask))}</div>
        <button type="button" class="psd-btn is-primary stall-primary" data-lst-list ${blocked ? 'disabled' : ''}>${button}</button>`;
}

/** An auction listing's management: its ask, what a sale pays, and taking the gear back. */
export function auctionListingHtml(runtime, row, timeText) {
    const amounts = { fee: runtime.deps.auctionHouse.listQuote(runtime.deps.game, row.item)?.feeAt(row.price) ?? 0 };
    const ended = row.status === 'expired';
    const note = ended ? tr(runtime, '기간이 끝났습니다.') : tr(runtime, '{value}번 칸에서 판매 중, {time}', { value: row.slot + 1, time: timeText });
    return `<article class="lst-auction"><p class="stall-note">${note}</p>
        <p class="ah-stand-fair"><span>${tr(runtime, '출품가')}</span>${priceTag(runtime, row.currency, row.price)}</p>
        <dl class="ah-receipt"><div class="ah-receipt-row is-fee"><dt>${tr(runtime, '수수료')}</dt><dd>${priceTag(runtime, row.currency, amounts.fee)}</dd></div>
        <div class="ah-receipt-row is-total"><dt>${tr(runtime, '받을 금액')}</dt><dd>${priceTag(runtime, row.currency, Math.max(1, row.price - amounts.fee))}</dd></div></dl>
        <div class="stall-listing-footer"><span></span><button type="button" class="psd-btn${ended ? ' is-primary' : ''}" data-lst-withdraw="${row.id}">${ended ? tr(runtime, '장비 회수') : tr(runtime, '회수')}</button></div></article>`;
}
