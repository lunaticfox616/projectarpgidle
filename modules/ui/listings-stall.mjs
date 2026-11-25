/**
 * 가판대 출품의 양식(예전 가판대 화면의 것): 거래 재화, 판매 희망가와 가격의 느낌, 다른 가격 제안 받기, 진열 확정; 진열한 것은 손님의 제안
 * (수락, 거절, 역제안 한 번), 값 바꾸기, 제안 허용, 회수. 버튼과 입력은 data-lst-* 속성으로 모듈의 위임 리스너가 받는다(modules/ui/listings-view.mjs).
 */

function esc(runtime, text) { return runtime.deps.escapeHTML(String(text ?? '')); }
function tr(runtime, text, params) { return runtime.deps.escapeHTML(runtime.deps._t(text, params)); }
function currencyLabel(runtime, currency) { return runtime.deps._t(runtime.deps.ORB_DB[currency].name); }

export function askValue(runtime, text) {
    const amount = Number(text);
    return text !== '' && Number.isSafeInteger(amount) && amount >= 1 && amount <= runtime.deps.PLAYER_STALL_RULES.maxAsk ? amount : null;
}

export function suggestedPrice(runtime, item, currency) {
    return runtime.deps.itemAppraisal.quote(item, currency)?.fair || 1;
}

function priceBand(runtime, item, currency, text) {
    const price = askValue(runtime, text), value = item && runtime.deps.itemAppraisal.quote(item, currency);
    if (price === null || !value) return '';
    if (!value.eligible || price > value.ceiling) return '손님이 사지 않는 가격';
    if (price > value.fair) return '오래 걸리는 가격';
    return price < value.fair * 0.75 ? '금방 팔리는 가격' : '적당한 가격';
}

/** The words under a price input: a warning for a bad number, else how the price sells. */
export function priceNote(runtime, item, currency, text) {
    const warning = text === '' || askValue(runtime, text) !== null ? '' : '1~1,000,000 사이의 정수를 입력하세요.';
    return { text: warning || priceBand(runtime, item, currency, text), warning: !!warning };
}

function noteHtml(runtime, id, note) {
    return `<p id="${id}" class="stall-price-hint${note.warning ? ' stall-warning' : ''}">${tr(runtime, note.text)}</p>`;
}

/** Repaints the words under input (typed) without drawing the sheet again. */
export function paintNote(runtime, input, item, currency) {
    const note = priceNote(runtime, item, currency, input.value), host = runtime.deps.document.getElementById(input.getAttribute('aria-describedby'));
    if (host) { host.textContent = runtime.deps._t(note.text); host.classList.toggle('stall-warning', note.warning); }
    input.setAttribute('aria-invalid', String(note.warning));
}

/** The currency select: currencies a customer would not pay in for item are shut (the chosen one stays). */
export function currencySelectHtml(runtime, item, currency) {
    const options = runtime.deps.PLAYER_STALL_RULES.currencies.map(key => {
        const sells = runtime.deps.itemAppraisal.quote(item, key)?.eligible;
        return `<option value="${key}" ${key === currency ? 'selected' : ''} ${sells || key === currency ? '' : 'disabled'}>${esc(runtime, currencyLabel(runtime, key))}${sells ? '' : tr(runtime, ' (손님이 사지 않음)')}</option>`;
    }).join('');
    return `<label class="stall-price-label" for="stall-currency">${tr(runtime, '거래 재화')}</label><select id="stall-currency" data-lst-currency>${options}</select>`;
}

/** The new stall listing's form: price, its words, the offer switch and the button (its place: the chosen one or the first empty). */
export function stallFormHtml(runtime, item, currency, blocked) {
    const price = runtime.state.draftAsk || String(suggestedPrice(runtime, item, currency)), slot = runtime.state.pendingSlot;
    const button = blocked ? tr(runtime, '출품할 수 없습니다') : slot === null ? tr(runtime, '첫 빈칸에 진열') : tr(runtime, '{value}번 칸에 진열 확정', { value: slot + 1 });
    return `${currencySelectHtml(runtime, item, currency)}<label class="stall-price-label" for="stall-ask">${tr(runtime, '판매 희망가 ({name})', { name: currencyLabel(runtime, currency) })}</label>
        <input id="stall-ask" type="number" min="1" max="1000000" step="1" value="${esc(runtime, price)}" placeholder="${tr(runtime, '가격을 정해 주세요')}" aria-describedby="stall-price-hint" data-lst-ask>
        ${noteHtml(runtime, 'stall-price-hint', priceNote(runtime, item, currency, price))}
        <label class="stall-check"><input id="stall-negotiate" type="checkbox" ${runtime.state.draftNegotiate ? 'checked' : ''} data-lst-negotiate-draft><span>${tr(runtime, '다른 가격 제안 받기')}</span></label>
        <button type="button" class="psd-btn is-primary stall-primary" data-lst-list ${blocked ? 'disabled' : ''}>${button}</button>`;
}

function offerCounterHtml(runtime, row, offer) {
    if (offer.negotiated) return `<small class="stall-final-offer">${tr(runtime, '마지막 제안')}</small>`;
    return `<div class="stall-counter"><label for="stall-counter-${offer.id}">${tr(runtime, '내 역제안 ({name})', { name: currencyLabel(runtime, row.currency) })}</label>
        <div class="stall-price-edit"><input id="stall-counter-${offer.id}" type="number" min="${offer.amount + 1}" max="${row.price}" step="1" placeholder="${tr(runtime, '금액 입력')}" data-lst-counter-input="${row.id}:${offer.id}">
        <button type="button" class="psd-btn" data-lst-counter="${row.id}:${offer.id}">${tr(runtime, '역제안')}</button></div></div>`;
}

/** A customer's price offer: who and until when, sell or refuse, and one counter. */
export function offerHtml(runtime, row) {
    const offer = row.offer;
    if (!offer) return '';
    const customer = runtime.deps.PLAYER_STALL_CUSTOMERS[offer.customerId].name;
    const expires = new runtime.deps.Date(offer.expiresAt).toLocaleString(runtime.deps.i18n.locale, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<section class="stall-offer" aria-label="${tr(runtime, '{customer}의 가격 제안', { customer })}"><div class="stall-offer-heading"><span>${tr(runtime, '구매 제안')}</span><strong>${runtime.deps.formatCurrencyCosts([{ key: row.currency, amount: offer.amount }])}개</strong></div>
        <p>${tr(runtime, customer)}<br><small>${tr(runtime, '{expires}까지', { expires })}</small></p>
        <div class="stall-actions"><button type="button" class="psd-btn is-primary stall-primary" data-lst-accept="${row.id}:${offer.id}">${tr(runtime, '{amount}개에 판매', { amount: offer.amount })}</button>
        <button type="button" class="psd-btn" data-lst-reject="${row.id}:${offer.id}">${tr(runtime, '제안 거절')}</button></div>${offerCounterHtml(runtime, row, offer)}</section>`;
}

/** A stall listing's management: its offer, a new price (in the chosen currency), the offer switch and taking it back. */
export function stallListingHtml(runtime, row, currency) {
    const price = currency === row.currency ? runtime.state.draftAsk || String(row.price) : runtime.state.draftAsk;
    return `<article class="stall-listing ${row.offer ? 'has-offer' : ''}" data-stall-listing="${row.id}"><p class="stall-note">${tr(runtime, '{value}번 칸에서 판매 중', { value: row.slot + 1 })}</p>
        ${offerHtml(runtime, row)}${currencySelectHtml(runtime, row.item, currency)}<label class="stall-price-label" for="stall-price-${row.id}">${tr(runtime, '판매 희망가 ({name})', { name: currencyLabel(runtime, currency) })}</label>
        <div class="stall-price-edit"><input id="stall-price-${row.id}" type="number" min="1" max="1000000" step="1" value="${esc(runtime, price)}" placeholder="${tr(runtime, '새 가격')}" aria-describedby="stall-price-hint-${row.id}" data-lst-reprice-input="${row.id}">
        <button type="button" class="psd-btn" data-lst-reprice="${row.id}">${tr(runtime, '가격 변경')}</button></div>
        ${noteHtml(runtime, `stall-price-hint-${row.id}`, priceNote(runtime, row.item, currency, price))}
        ${currency !== row.currency ? `<p class="stall-note">${tr(runtime, '{name} 가격을 새로 적어 주세요.', { name: currencyLabel(runtime, currency) })}</p>` : ''}
        <div class="stall-listing-footer"><label class="stall-check"><input type="checkbox" aria-label="${tr(runtime, '{name} 가격 제안 허용', { name: runtime.deps._t(row.item.name) })}" ${row.negotiate ? 'checked' : ''} data-lst-negotiate="${row.id}"><span>${tr(runtime, '제안 허용')}</span></label>
        <button type="button" class="psd-btn" data-lst-withdraw="${row.id}">${tr(runtime, '물건 회수')}</button></div></article>`;
}
