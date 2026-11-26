/**
 * 출품 진열대(가판대 화면 틀의 왼쪽): 머리(칸 수, 전당 수, 가격 제안), 정산함 띠(판매 대금과 돌아온 장비, 수령), 출품 카드 2열(장비 그림,
 * 이름, 종류 꼬리표, 상태, 남은 시간, 값), 빈 칸과 잠긴 칸, 손님 수, 기록 단추. 카드는 끌어 옮기고(빈 칸으로) 가방으로 끌어 회수한다(가판대처럼,
 * modules/ui/shop-pointer.mjs). 전당 카드는 서버 자료라 끌지 않는다.
 */
import { pickParts } from './listings-state.mjs';
import { hallShows, hallCounted, hallShowStatus } from './listings-hall.mjs';
import { LISTING_WAYS } from './listings-kinds.mjs';

const WAY_NAMES = Object.freeze(Object.fromEntries(LISTING_WAYS));
const MINUTE = 60000;

function esc(runtime, text) { return runtime.deps.escapeHTML(String(text ?? '')); }

/** A span of ms as whole minutes or hours (with minutes under ten hours). */
export function spanText(runtime, ms) {
    const minutes = Math.max(0, Math.floor(ms / MINUTE));
    if (minutes < 60) return runtime.deps._t('{count}분', { count: Math.max(1, minutes) });
    const hours = Math.floor(minutes / 60), rest = minutes % 60;
    return hours < 10 && rest ? runtime.deps._t('{hours}시간 {minutes}분', { hours, minutes: rest }) : runtime.deps._t('{hours}시간', { hours });
}

/** A saved listing's state word, its tone and its time line: [word, tone, time]. */
export function listingState(runtime, row, now) {
    const { _t } = runtime.deps;
    if (row.kind === 'auction') {
        if (row.status === 'expired') return ['기간 끝남', 'is-ended', ''];
        const ends = (row.listedBucket + runtime.deps.auctionHouse.rules.myLots.buckets) * runtime.deps.auctionHouse.rules.bucketMs;
        return ['판매 중', 'is-open', _t('{span} 남음', { span: spanText(runtime, ends - now) })];
    }
    if (row.offer) return ['가격 제안', 'is-offer', _t('{span} 남음', { span: spanText(runtime, row.offer.expiresAt - now) })];
    const ready = Math.max(row.listedAt + runtime.deps.PLAYER_STALL_RULES.minimumAgeMs, (row.priceChangedAt || row.listedAt) + runtime.deps.PLAYER_STALL_RULES.repriceDelayMs);
    if (now < ready) return ['진열 준비', 'is-wait', _t('{span} 뒤', { span: spanText(runtime, ready - now) })];
    return ['판매 중', 'is-open', _t('{span}째', { span: spanText(runtime, now - row.listedAt) })];
}

function artHtml(runtime, item) {
    const size = runtime.deps.getEquipmentInventoryFootprint(item);
    return `<span class="lst-card-art" style="--cols:${size.columns};--rows:${size.rows}"><img src="${esc(runtime, runtime.deps.getEquipmentGridVisualAsset(item))}" alt="" draggable="false"></span>`;
}

function itemName(runtime, item) { return runtime.deps.getItemDisplayName(item) || runtime.deps._t(item.name || '장비'); }

/** The card's text block: the way's tag and the place number, the name, the state with its time, the price. */
function cardBodyHtml(runtime, parts) {
    const { kind, slot, name, state, price } = parts;
    return `<span class="lst-card-body"><span class="lst-card-top"><em class="lst-kind is-${kind}">${esc(runtime, runtime.deps._t(WAY_NAMES[kind]))}</em>${slot === null ? '' : `<small>${slot + 1}</small>`}</span>
        <strong class="lst-card-name">${esc(runtime, name)}</strong>
        <span class="lst-card-state"><b class="lst-status ${state[1]}">${esc(runtime, runtime.deps._t(state[0]))}</b><small>${esc(runtime, state[2])}</small></span>
        <span class="lst-card-price">${price}</span></span>`;
}

function priceHtml(runtime, currency, amount) {
    return `${runtime.deps.shopView.coinHtml(currency)}<b>${Number(amount || 0).toLocaleString(runtime.deps.i18n.locale)}</b>`;
}

/** A saved listing's card: picked by a tap, carried by a drag, a drop place for another listing. */
export function listingCardHtml(runtime, row, now) {
    const state = listingState(runtime, row, now), name = itemName(runtime, row.item), chosen = runtime.state.pick === `listing:${row.id}`;
    const label = runtime.deps._t('{slot}번 칸, {way}, {name}, {state}', { slot: row.slot + 1, way: runtime.deps._t(WAY_NAMES[row.kind]), name, state: runtime.deps._t(state[0]) });
    return `<button type="button" class="lst-card is-${row.kind} ${state[1]} rarity-${row.item.rarity || 'normal'}${chosen ? ' is-chosen' : ''}" data-shop-pick="listing:${row.id}"
        data-shop-drop="${row.slot}" aria-pressed="${chosen}" aria-label="${esc(runtime, label)}">${artHtml(runtime, row.item)}${cardBodyHtml(runtime, { kind: row.kind, slot: row.slot, name, state, price: priceHtml(runtime, row.currency, row.price) })}</button>`;
}

/** A hall show's card (server rows: picked by a tap, never carried). */
export function hallCardHtml(runtime, row) {
    const item = row.item || {}, status = hallShowStatus(row), chosen = runtime.state.pick === `hall:${Number(row.id)}`;
    const copies = runtime.deps._t('소장 {copiesSold}/{copyCap}', { copiesSold: Number(row.copiesSold || 0), copyCap: Number(row.copyCap || 5) });
    const label = runtime.deps._t('장비 전당, {name}, {state}', { name: itemName(runtime, item), state: runtime.deps._t(status[0]) });
    return `<button type="button" class="lst-card is-hall ${status[1]} rarity-${item.rarity || 'normal'}${chosen ? ' is-chosen' : ''}" data-shop-pick="hall:${Number(row.id)}"
        aria-pressed="${chosen}" aria-label="${esc(runtime, label)}">${artHtml(runtime, item)}${cardBodyHtml(runtime, { kind: 'hall', slot: null, name: itemName(runtime, item),
        state: [status[0], status[1], copies], price: priceHtml(runtime, 'goldenRule', row.price) })}</button>`;
}

/** An empty place: a tap puts the chosen bag item there (a drop does too); the chosen bag item shows on it while its way is picked. */
function emptyCardHtml(runtime, slot) {
    const [kind, id] = pickParts(runtime.state.pick), draft = kind === 'bag' && runtime.state.pendingSlot === slot ? runtime.deps.game.inventory.find(item => item.id === id) : null;
    const label = draft ? runtime.deps._t('{slot}번 칸, {name}, 출품 준비', { slot: slot + 1, name: itemName(runtime, draft) }) : runtime.deps._t('{slot}번 칸, 비어 있음', { slot: slot + 1 });
    const inner = draft ? `${artHtml(runtime, draft)}<span class="lst-card-body"><span class="lst-card-top"><small>${slot + 1}</small></span><strong class="lst-card-name">${esc(runtime, itemName(runtime, draft))}</strong><span class="lst-card-state"><b class="lst-status is-wait">${esc(runtime, runtime.deps._t('출품 준비'))}</b></span></span>`
        : `<span class="lst-plus" aria-hidden="true">+</span><span class="lst-empty-text">${esc(runtime, runtime.deps._t('장비 올리기'))}</span><small class="lst-empty-slot">${slot + 1}</small>`;
    return `<button type="button" class="lst-card is-empty${draft ? ` is-preview rarity-${draft.rarity || 'normal'}` : ''}" data-shop-drop="${slot}" data-lst-slot="${slot}" aria-label="${esc(runtime, label)}">${inner}</button>`;
}

/** A place the auction unlock opens: shown shut until then (the shelf's room to grow). */
function lockedCardHtml(runtime) {
    return `<div class="lst-card is-locked" aria-hidden="true"><span class="lst-lock"></span><span class="lst-empty-text">${esc(runtime, runtime.deps._t('경매장이 열리면'))}</span></div>`;
}

/** Every card of the shelf: the places in order (a listing, an empty place below the capacity, a shut place), then the hall shows. */
export function cardsHtml(runtime, now) {
    const store = runtime.deps.game.listings, capacity = runtime.deps.playerStall.capacity(runtime.deps.game), cards = [];
    const shown = Math.max(runtime.deps.playerStall.slotMax, ...store.rows.map(row => row.slot + 1));
    for (let slot = 0; slot < shown; slot++) {
        const row = store.rows.find(entry => entry.slot === slot);
        if (row) cards.push(listingCardHtml(runtime, row, now));
        else cards.push(slot < capacity ? emptyCardHtml(runtime, slot) : lockedCardHtml(runtime));
    }
    for (const row of hallShows(runtime)) cards.push(hallCardHtml(runtime, row));
    return `<div class="lst-cards">${cards.join('')}</div>`;
}

/** The head: the shelf's count, the hall's when it is known, and the jump to the newest price offer. */
export function shelfHeadHtml(runtime) {
    const { game, playerStall, _t } = runtime.deps, store = game.listings, offers = store.rows.filter(row => row.offer).length;
    const hall = hallCounted(runtime) ? `<span class="shop-room lst-hall-room">${esc(runtime, _t('전당 {count}/3', { count: hallShows(runtime).length }))}</span>` : '';
    return `<header class="shop-bar"><h3>${esc(runtime, _t('출품'))}</h3><span class="shop-room">${esc(runtime, _t('{length}/{slots}칸', { length: store.rows.length, slots: playerStall.capacity(game) }))}</span>${hall}
        ${offers ? `<button type="button" class="stall-offer-jump" data-lst-offers>${esc(runtime, _t('가격 제안 {offers}건', { offers }))}</button>` : ''}</header>`;
}

function coinHtml(runtime, key, amount) {
    return `<span class="stall-coin" data-tip="${esc(runtime, runtime.deps.shopView.currencyName(key))}">${runtime.deps.shopView.coinHtml(key)}<b>${Number(amount).toLocaleString(runtime.deps.i18n.locale)}</b></span>`;
}

/** The one settlement box: the proceeds of every sale, the ended auction gear waiting, and one button that takes both. */
export function settleHtml(runtime) {
    const { game, playerStall, _t } = runtime.deps, funds = playerStall.payouts(game.listings);
    const ended = game.listings.rows.filter(row => row.kind === 'auction' && row.status === 'expired').length;
    const coins = funds.map(row => coinHtml(runtime, row.key, row.amount)).join('') || esc(runtime, _t('없음'));
    const back = ended ? `<small class="lst-settle-back">${esc(runtime, _t('돌아온 장비 {count}개', { count: ended }))}</small>` : '';
    const label = ended ? _t('모두 수령') : _t('대금 수령');
    return `<div class="stall-payout lst-settle"><span>${esc(runtime, _t('판매 대금'))}<strong class="stall-payout-coins">${coins}</strong>${back}</span>
        <button type="button" class="psd-btn${funds.length || ended ? ' is-primary' : ''}" data-lst-collect ${funds.length || ended ? '' : 'disabled'}>${esc(runtime, label)}</button></div>`;
}
