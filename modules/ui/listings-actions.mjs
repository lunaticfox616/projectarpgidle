/**
 * 출품 화면의 명령. 가판대 종류는 playerStall, 경매장 종류는 auctionHouse(먼저 그 시계를 옮기고 정산된 출품을 알린다), 장비 전당은 전당 다리
 * (modules/ui/listings-hall.mjs). 된 명령 뒤에는 저장하고 화면을 새로 그린다. 정산함(판매 대금과 돌아온 경매장 장비)은 collect 하나가 받는다.
 */
import { pickParts, resetDraft } from './listings-state.mjs';
import { wayIssue, startingWay } from './listings-kinds.mjs';
import { askValue, suggestedPrice } from './listings-stall.mjs';
import { runHallTrade } from './listings-hall.mjs';

/** Why nothing may change now, or '': an offline replay; with manage, also the woodsman fight (collecting stays open then). */
export function busy(runtime, manage = true) {
    const replay = runtime.deps.shopView.busyReason();
    if (replay) return replay;
    return manage && runtime.deps.game.woodsmanBuildLock ? runtime.deps._t('나무꾼 전투 중에는 출품을 정리할 수 없습니다. 판매 대금 수령은 됩니다.') : '';
}

function blocked(runtime, manage = true) {
    const reason = busy(runtime, manage);
    if (!reason) return false;
    runtime.state.message = reason;
    runtime.api.render(true);
    return true;
}

/** After a command: its words, and when the rules took it (or a sale settled first) the bag selection, the save and the screen. */
export function finish(runtime, result, settled = false) {
    runtime.state.message = result.reason || '';
    if (result.ok || settled) { runtime.deps.ensureCraftSelectionValid(); runtime.deps.saveGame(); runtime.deps.updateStaticUI(); }
    runtime.api.render(true);
}

/** Moves the auction clock to now and announces what settled (the game tick's own announcer). */
export function syncAuction(runtime, now) {
    const { auctionHouse, game } = runtime.deps;
    if (!auctionHouse.canOpen(game) || !auctionHouse.needsAdvance(game, now)) return false;
    const settled = auctionHouse.advance(game, now).settled;
    if (settled.length) runtime.deps.announceAuction(settled);
    return settled.length > 0;
}

export function announceSales(runtime, sold, gains) {
    runtime.deps.game.noti.items = true;
    const complete = gains.every(gain => sold.filter(event => event.currency === gain.key).reduce((sum, event) => sum + event.price, 0) === gain.amount);
    const goods = !complete ? runtime.deps._t('물건') : sold.length === 1 ? `[${runtime.deps.escapeHTML(runtime.deps._t(sold[0].name))}]` : runtime.deps._t('물건 {length}개', { length: sold.length });
    runtime.deps.addLog(runtime.deps._t('가판대 판매: {goods}, {gains}개. 거래 → 출품에서 수령하세요.', { goods, gains: runtime.deps.formatCurrencyCosts(gains) }), 'loot-rare', { toast: true });
}

export function announceOffers(runtime, rows) {
    runtime.deps.game.noti.items = true;
    const detail = rows.length === 1 ? runtime.deps._t('[{name}]에 {cost}개', { name: runtime.deps.escapeHTML(runtime.deps._t(rows[0].item.name)), cost: runtime.deps.formatCurrencyCosts([{ key: rows[0].currency, amount: rows[0].offer.amount }]) })
        : runtime.deps._t('물건 {length}개', { length: rows.length });
    runtime.deps.addLog(runtime.deps._t('가판대 가격 제안: {detail}. 출품에서 수락하거나 거절할 수 있습니다.', { detail }), 'loot-rare', { toast: true });
}

/** Settles the stall's visits and the auction's buckets up to now and announces them. Returns the stall's paid dew worth. */
export function settleSales(runtime, now) {
    const result = runtime.deps.playerStall.settle(runtime.deps.game, now);
    if (result.paid > 0) announceSales(runtime, result.sold, result.gains);
    if (result.offers.length) announceOffers(runtime, result.offers);
    const auction = syncAuction(runtime, now);
    if (result.changed || auction) runtime.api.render();
    return result.paid;
}

/** Chooses bag item itemId for a new listing (its way: the last one when open for it). */
export function select(runtime, itemId) {
    const item = runtime.deps.game.inventory.find(entry => entry.id === itemId);
    if (!item) return;
    if (runtime.state.pick !== `bag:${itemId}`) resetDraft(runtime);
    Object.assign(runtime.state, { pick: `bag:${itemId}`, message: '', kind: startingWay(runtime, item) });
    runtime.api.render(true);
}

/** Chooses a saved listing or a hall show (pick 'listing:ID' or 'hall:ID'). */
export function inspect(runtime, pick) {
    resetDraft(runtime);
    Object.assign(runtime.state, { pick, message: '' });
    runtime.api.render(true);
}

export function chooseWay(runtime, kind) {
    const [pickKind] = pickParts(runtime.state.pick);
    if (pickKind !== 'bag' || runtime.state.kind === kind) return;
    runtime.state.kind = kind;
    runtime.state.draftAsk = '';
    runtime.state.draftCurrency = '';
    runtime.api.render(true);
}

export function openOffers(runtime) {
    const row = runtime.deps.game.listings.rows.filter(entry => entry.offer).sort((a, b) => b.offer.id - a.offer.id)[0];
    if (row) inspect(runtime, `listing:${row.id}`);
}

/** A tap on an empty place: the chosen bag item goes there (its way still to confirm), a chosen listing moves there. */
export function tapSlot(runtime, slot) {
    const [kind, id] = pickParts(runtime.state.pick);
    if (kind === 'listing') { moveListing(runtime, id, slot); return; }
    if (kind !== 'bag') { finish(runtime, { ok: false, reason: runtime.deps._t('가방에서 올릴 장비를 먼저 고르세요.') }); return; }
    runtime.state.pendingSlot = slot;
    runtime.state.message = runtime.deps._t('{value}번 칸: 방식과 가격을 정하고 출품하세요.', { value: slot + 1 });
    runtime.api.render(true);
}

export function moveListing(runtime, id, slot) {
    if (blocked(runtime)) return;
    const result = runtime.deps.playerStall.moveListing(runtime.deps.game, id, slot);
    finish(runtime, result);
}

/** A bag item dropped on an empty place: on the stall at once at the suggested price when the stall is the chosen way and open for it
 * (the old drag-to-list), else chosen with that place for its way to be picked. */
export function dropBagItem(runtime, itemId, slot) {
    const item = runtime.deps.game.inventory.find(entry => entry.id === itemId);
    if (!item) return;
    select(runtime, itemId);
    runtime.state.pendingSlot = slot;
    if (runtime.state.kind === 'stall' && !wayIssue(runtime, item, 'stall')) { listStall(runtime, item, true); return; }
    tapSlot(runtime, slot);
}

/** The stall form's price and placement, or { reason }. */
function stallTerms(runtime, quick, item) {
    const currency = runtime.state.draftCurrency || runtime.deps.itemAppraisal.quote(item).recommendedCurrency;
    const input = runtime.deps.document.getElementById('stall-ask');
    const price = quick ? askValue(runtime, runtime.state.draftAsk) || suggestedPrice(runtime, item, currency) : askValue(runtime, input ? input.value : '');
    if (price === null) return { reason: input && input.value === '' ? runtime.deps._t('판매 희망가를 적어 주세요.') : runtime.deps._t('가격은 1~1,000,000 사이의 정수로 적어 주세요.') };
    const placement = { currency, negotiate: runtime.state.draftNegotiate };
    if (runtime.state.pendingSlot !== null) placement.slot = runtime.state.pendingSlot;
    return { price, placement };
}

function listStall(runtime, item, quick = false) {
    const terms = stallTerms(runtime, quick, item);
    if (terms.reason) { finish(runtime, { ok: false, reason: terms.reason }); return; }
    const now = runtime.deps.Date.now(), settled = settleSales(runtime, now) > 0;
    const result = runtime.deps.playerStall.list(runtime.deps.game, item.id, terms.price, now, terms.placement);
    if (result.ok) {
        const row = runtime.deps.game.listings.rows.find(entry => entry.item.id === item.id);
        resetDraft(runtime);
        runtime.state.pick = `listing:${row.id}`;
        result.reason = runtime.deps._t('{value}번 칸에 진열했습니다. 가격은 바로 바꿀 수 있습니다.', { value: row.slot + 1 });
    }
    finish(runtime, { ...result, reason: runtime.deps._t(result.reason || '') }, settled);
}

function listAuction(runtime, item) {
    const input = runtime.deps.document.getElementById('lst-ask'), now = runtime.deps.Date.now();
    settleSales(runtime, now);
    const slot = runtime.state.pendingSlot === null ? undefined : runtime.state.pendingSlot;
    const result = runtime.deps.auctionHouse.list(runtime.deps.game, { itemId: item.id, ask: Number(input ? input.value : NaN), slot }, now);
    if (result.settled.length) runtime.deps.announceAuction(result.settled);
    if (result.ok) {
        resetDraft(runtime);
        runtime.state.pick = `listing:${result.lot.id}`;
        result.reason = runtime.deps._t('{value}번 칸에 출품했습니다.', { value: result.lot.slot + 1 });
    }
    finish(runtime, result, result.settled.length > 0);
}

/** Puts the chosen bag item up the chosen way. */
export function list(runtime) {
    const [kind, id] = pickParts(runtime.state.pick), item = kind === 'bag' && runtime.deps.game.inventory.find(entry => entry.id === id);
    if (!item || blocked(runtime)) return;
    const reason = wayIssue(runtime, item, runtime.state.kind);
    if (reason) { finish(runtime, { ok: false, reason }); return; }
    if (runtime.state.kind === 'stall') listStall(runtime, item);
    else if (runtime.state.kind === 'auction') listAuction(runtime, item);
    else runHallTrade(runtime, hall => hall.list(item.id), () => { if (!runtime.deps.game.inventory.some(entry => entry.id === id)) runtime.state.pick = null; });
}

/** Takes a saved listing back into the bag (place: a bag cell when it was dragged there; the stall's rule). */
export function withdraw(runtime, id, place = null) {
    if (blocked(runtime)) return;
    const row = runtime.deps.game.listings.rows.find(entry => entry.id === id), now = runtime.deps.Date.now();
    if (!row) { finish(runtime, { ok: false, reason: runtime.deps._t('이미 판매되었거나 회수된 물건입니다.') }); return; }
    const settled = settleSales(runtime, now) > 0;
    const result = row.kind === 'auction' ? runtime.deps.auctionHouse.withdraw(runtime.deps.game, id, now) : runtime.deps.playerStall.withdraw(runtime.deps.game, id, place);
    if (result.ok) {
        if (runtime.state.pick === `listing:${id}`) { runtime.state.pick = null; resetDraft(runtime); }
        result.reason = runtime.deps._t('물건을 가방으로 회수했습니다.');
    }
    finish(runtime, { ...result, reason: runtime.deps._t(result.reason || '') }, settled);
}

export function withdrawHall(runtime, id) {
    if (blocked(runtime)) return;
    runHallTrade(runtime, hall => hall.withdraw(id), () => { if (runtime.state.pick === `hall:${id}`) runtime.state.pick = null; });
}

/** The one settlement box: every unclaimed proceed, then the ended auction gear that fits in the bag. */
export function collect(runtime) {
    if (blocked(runtime, false)) return;
    const { game, playerStall, auctionHouse, _t } = runtime.deps, now = runtime.deps.Date.now();
    const settled = settleSales(runtime, now) > 0, funds = playerStall.payouts(game.listings), gain = playerStall.collect(game);
    const ended = game.listings.rows.filter(row => row.kind === 'auction' && row.status === 'expired');
    const back = runtime.deps.game.woodsmanBuildLock ? [] : ended.filter(row => auctionHouse.withdraw(game, row.id, now).ok);
    const parts = [gain ? _t('{funds}개를 받았습니다.', { funds: runtime.deps.formatCurrencyCosts(funds) }) : '', back.length ? _t('돌아온 장비 {count}개를 가방에 넣었습니다.', { count: back.length }) : ''];
    if (funds.length && !gain) parts.push(_t('재화 보유 한도를 넘어 받지 못했습니다. 판매 대금은 출품에 남아 있습니다.'));
    if (back.length < ended.length) parts.push(_t('가방에 빈칸이 없어 장비 {count}개가 출품에 남아 있습니다.', { count: ended.length - back.length }));
    const reason = parts.filter(Boolean).join(' ') || _t('수령할 판매 대금이 없습니다.');
    finish(runtime, { ok: gain > 0 || back.length > 0, reason }, settled);
}
