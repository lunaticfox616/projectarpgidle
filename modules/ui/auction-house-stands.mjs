/**
 * 경매장 내 출품: 진열대 셋(휴대폰에서는 위아래로). 빈 진열대는 가방 고르기 창을 열고, 고른 장비는 출품 양식(감정가, 출품가, 가격의 느낌,
 * 수수료와 받을 금액)이 된다. 판매 중, 판매 완료(대금 수령), 기간 끝남(장비 회수)은 수령할 때까지 제 진열대에 남는다(시안의 정산함을 여기에 접었다).
 * 가격의 느낌은 가판대의 말(금방 팔리는 가격, 적당한 가격, 오래 걸리는 가격)을 판매 확률(chanceAt)로 고른다.
 */
import { tr, trHtml, esc, num, priceTag, itemName, itemArtHtml } from './auction-house-format.mjs';

/** The draft's bag item when it is still listable, else null (the draft is dropped). */
export function draftItem(runtime) {
    const draft = runtime.state.mine.draft, game = runtime.deps.game;
    const item = draft && game.inventory.find(entry => entry && entry.id === draft.itemId);
    if (item && !runtime.deps.auctionHouse.listIssue(game, item)) return item;
    runtime.state.mine.draft = null;
    return null;
}

/** The ask a fresh draft starts at: the appraisal now, clamped into askMin..askMax. */
export function startingAsk(quote) { return Math.max(quote.askMin, Math.min(quote.askMax, Math.round(quote.fairNow))); }

function moodText(chance) {
    if (chance >= 0.9) return '금방 팔리는 가격';
    return chance >= 0.6 ? '적당한 가격' : '오래 걸리는 가격';
}

/** The terms under the ask input (repainted alone while the ask is typed). */
export function askTermsHtml(runtime, quote, ask) {
    const valid = Number.isSafeInteger(ask) && ask >= quote.askMin && ask <= quote.askMax;
    if (!valid) return `<p class="ah-why" role="status">${runtime.deps._t('출품가는 {min}~{max} 사이의 정수로 입력하세요.', { min: quote.askMin, max: quote.askMax })}</p>`;
    const chance = quote.chanceAt(ask), mood = chance >= 0.9 ? 'is-fast' : chance >= 0.6 ? 'is-fair' : 'is-slow';
    return `<p class="ah-mood ${mood}">${trHtml(runtime, moodText(chance))}</p>
        <dl class="ah-receipt"><div class="ah-receipt-row is-fee"><dt>${runtime.deps._t('수수료')}</dt><dd>${priceTag(runtime, quote.currency, quote.feeAt(ask))}</dd></div>
        <div class="ah-receipt-row is-total"><dt>${runtime.deps._t('받을 금액')}</dt><dd>${priceTag(runtime, quote.currency, quote.netAt(ask))}</dd></div></dl>`;
}

function cardHtml(runtime, item) { return `<div class="ah-stand-card">${runtime.deps.shopView.itemCardHtml(item, { rating: false })}</div>`; }

/** The stand's top line: the item's picture (or the coin of a sold lot), its name and the status tag. */
function headHtml(runtime, art, name, tag, tone) {
    return `<header class="ah-stand-head">${art}<strong>${esc(runtime, name)}</strong><em class="ah-stand-tag ${tone}">${trHtml(runtime, tag)}</em></header>`;
}

function draftHtml(runtime, item) {
    const quote = runtime.deps.auctionHouse.listQuote(runtime.deps.game, item), draft = runtime.state.mine.draft;
    if (!quote.listable) {
        return `<article class="ah-stand is-draft">${headHtml(runtime, itemArtHtml(runtime, item), itemName(runtime, item), '출품 준비', 'is-draft')}${cardHtml(runtime, item)}
            <p class="ah-why" role="status">${runtime.deps._t('감정가가 낮아 출품할 수 없습니다.')}</p>
            <div class="ah-stand-actions"><button type="button" data-ah-cancel>${runtime.deps._t('취소')}</button></div></article>`;
    }
    return `<article class="ah-stand is-draft">${headHtml(runtime, itemArtHtml(runtime, item), itemName(runtime, item), '출품 준비', 'is-draft')}${cardHtml(runtime, item)}
        <p class="ah-stand-fair"><span>${runtime.deps._t('감정가')}</span>${priceTag(runtime, quote.currency, quote.fairNow)}</p>
        <label class="ah-count-label" for="ah-ask">${runtime.deps._t('출품가 ({name})', { name: runtime.deps.shopView.currencyName(quote.currency) })}</label>
        <input id="ah-ask" type="number" inputmode="numeric" min="${quote.askMin}" max="${quote.askMax}" step="1" value="${esc(runtime, draft.ask)}" data-ah-ask>
        <div class="ah-ask-terms" data-ah-ask-terms aria-live="polite">${askTermsHtml(runtime, quote, Number(draft.ask))}</div>
        <div class="ah-stand-actions"><button type="button" class="ah-primary" data-ah-list>${runtime.deps._t('출품')}</button><button type="button" data-ah-cancel>${runtime.deps._t('취소')}</button></div></article>`;
}

function openLotHtml(runtime, lot) {
    const left = Math.max(0, runtime.deps.auctionHouse.rules.myLots.buckets - lot.rolls);
    return `<article class="ah-stand is-open">${headHtml(runtime, itemArtHtml(runtime, lot.item), itemName(runtime, lot.item), '판매 중', 'is-open')}${cardHtml(runtime, lot.item)}
        <p class="ah-stand-fair"><span>${runtime.deps._t('출품가')}</span>${priceTag(runtime, lot.currency, lot.ask)}</p>
        <p class="ah-stand-left">${runtime.deps._t('남은 판매 기회 {count}회', { count: left })}</p>
        <div class="ah-stand-actions"><button type="button" data-ah-withdraw="${lot.id}">${runtime.deps._t('회수')}</button></div></article>`;
}

/** A sold lot keeps only its saved name: the generated 마법의 / 희귀한 names are shown through the item name rule with their base. */
function soldName(runtime, name) {
    const match = /^(마법의|희귀한) (.+)$/.exec(name || '');
    return runtime.deps.getItemDisplayName({ name, baseName: match ? match[2] : '' });
}

function soldLotHtml(runtime, lot) {
    const row = (label, amount, extra = '') => `<div class="ah-receipt-row${extra}"><dt>${trHtml(runtime, label)}</dt><dd>${priceTag(runtime, lot.currency, amount)}</dd></div>`;
    return `<article class="ah-stand is-sold">${headHtml(runtime, `<span class="ah-art is-coin">${runtime.deps.shopView.coinHtml(lot.currency)}</span>`, soldName(runtime, lot.name), '판매 완료', 'is-sold')}
        <p class="ah-stand-buyer">${runtime.deps._t('구매자 {name}', { name: tr(runtime, lot.buyer || '') })}</p>
        <dl class="ah-receipt">${row('판매가', lot.gross)}${row('수수료', lot.fee, ' is-fee')}${row('받을 금액', lot.net, ' is-total')}</dl>
        <div class="ah-stand-actions"><button type="button" class="ah-primary" data-ah-claim="${lot.id}">${runtime.deps._t('대금 수령')}</button></div></article>`;
}

function expiredLotHtml(runtime, lot) {
    return `<article class="ah-stand is-expired">${headHtml(runtime, itemArtHtml(runtime, lot.item), itemName(runtime, lot.item), '기간 끝남', 'is-expired')}${cardHtml(runtime, lot.item)}
        <div class="ah-stand-actions"><button type="button" class="ah-primary" data-ah-claim="${lot.id}">${runtime.deps._t('장비 회수')}</button></div></article>`;
}

function emptyHtml(runtime, index) {
    return `<article class="ah-stand is-empty"><button type="button" class="ah-stand-add" data-ah-pick="${index}"><span class="ah-stand-plus" aria-hidden="true">+</span>
        <span>${runtime.deps._t('장비 올리기')}</span></button></article>`;
}

function lotHtml(runtime, lot) {
    if (lot.status === 'sold') return soldLotHtml(runtime, lot);
    return lot.status === 'expired' ? expiredLotHtml(runtime, lot) : openLotHtml(runtime, lot);
}

/** Lots waiting to be claimed (sold or expired). */
export function claimable(runtime) { return runtime.deps.game.auction.lots.filter(lot => lot.status !== 'open'); }

/** The whole 내 출품 view. */
export function standsViewHtml(runtime) {
    const lots = runtime.deps.game.auction.lots, slots = runtime.deps.auctionHouse.rules.myLots.slots, draft = draftItem(runtime);
    const stands = [];
    for (let index = 0; index < slots; index++) {
        if (lots[index]) stands.push(lotHtml(runtime, lots[index]));
        else if (draft && index === lots.length) stands.push(draftHtml(runtime, draft));
        else stands.push(emptyHtml(runtime, index));
    }
    const all = claimable(runtime).length >= 2 ? `<div class="ah-mine-bar"><button type="button" class="ah-primary" data-ah-claim-all>${runtime.deps._t('모두 수령')}</button></div>` : '';
    return `<div class="ah-mine">${all}<div class="ah-stands">${stands.join('')}</div></div>`;
}

/** The toast for a claim result. */
export function claimToast(runtime, result) {
    if (result.kind === 'money') return runtime.deps._t('{name} {amount} 수령', { name: runtime.deps.shopView.currencyName(result.currency), amount: num(runtime, result.amount) });
    return runtime.deps._t('[{name}] 회수', { name: itemName(runtime, result.item) });
}
