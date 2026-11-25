import { listingRemove, listingCredit, listingRecordSale, listingPayouts } from './listing-rows.mjs';

export function stallRulesRecord(env, stall, event) {
    stall.history.unshift({ currency: 'formlessDew', ...event, id: ++stall.eventSequence });
    stall.history.length = Math.min(stall.history.length, env.rules.historyLimit);
}

/** Sells stall listing row at at to customer for amount: the money goes to the one settlement box (stall.proceeds), the row leaves the
 * shelf and a sale is recorded. Returns its dew worth, 0 (nothing changes) when the row is gone or the box would overflow. */
export function stallRulesSell(env, stall, row, at, ...selection) {
    const [customer, amount] = selection;
    if (!stall.rows.includes(row) || !listingCredit(stall, row.currency, amount)) return 0;
    listingRemove(stall, row);
    listingRecordSale(stall, { kind: 'stall', at, listedAt: row.listedAt, currency: row.currency, customer, price: amount, item: JSON.parse(JSON.stringify(row.item)) }, env.rules.salesLimit);
    stallRulesRecord(env, stall, { at, kind: 'sale', slot: row.slot, currency: row.currency, customer, sold: true, name: row.item.name, price: amount });
    return amount * env.deps.itemAppraisal.unitValue(row.currency);
}

/** Pays every unclaimed proceed (stall and auction sales) into owner's currencies at once, or nothing when one would overflow. Returns the
 * dew worth paid. */
export function stallRulesCollect(env, owner) {
    if (owner.isBackgroundCalculation) return 0;
    const store = owner.listings, funds = listingPayouts(store, env.rules.currencies);
    if (!funds.length) return 0;
    if (funds.some(row => !Number.isSafeInteger((Number(owner.currencies[row.key]) || 0) + row.amount))) return 0;
    for (const row of funds) {
        owner.currencies[row.key] = (Number(owner.currencies[row.key]) || 0) + row.amount;
        store.proceeds[row.key] = 0;
    }
    owner.currencyDropVersion = (owner.currencyDropVersion || 0) + 1;
    return funds.reduce((sum, row) => sum + row.amount * env.deps.itemAppraisal.unitValue(row.key), 0);
}

/** The unclaimed proceeds, per currency with any: [{ key, amount }]. */
export function stallRulesPayouts(env, stall) { return listingPayouts(stall, env.rules.currencies); }

/** Why a loop reset must wait, or '': any listing (stall or auction, open or expired) would lose its gear, unclaimed proceeds would cross
 * the loop. The union of the old stall rule (listings or proceeds) and the old auction rule (any lot). triggerSeasonReset refuses while
 * this is non-empty; the loop screen shows the same sentence. */
export function stallRulesLoopBlockReason(env, owner) {
    const store = owner.listings, pieces = [];
    if (store.rows.length) pieces.push(env.deps._t('출품 {count}개', { count: store.rows.length }));
    const labels = { formlessDew: '이슬', magicBud: '새싹' };
    const funds = listingPayouts(store, env.rules.currencies).map(row => env.deps._t('{name} {amount}개', { name: env.deps._t(labels[row.key] || env.deps.ORB_DB[row.key].name), amount: row.amount }));
    if (funds.length) pieces.push(env.deps._t('판매 대금 {funds}', { funds: funds.join(', ') }));
    if (!pieces.length) return '';
    return env.deps._t('{held}가 남아 있습니다. 거래 → 출품에서 회수하거나 수령한 뒤 루프를 진행하세요.', { held: pieces.join(', ') });
}
