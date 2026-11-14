import { stallRulesBankKey } from './stall-access.mjs';

export function stallRulesRecord(env, stall, event) {
    stall.history.unshift({ currency: 'formlessDew', ...event, id: ++stall.eventSequence });
    stall.history.length = Math.min(stall.history.length, env.rules.historyLimit);
}

export function stallRulesSell(env, stall, row, at, ...selection) {
    const [customer, amount] = selection;
    const key = stallRulesBankKey(env, row.currency);
    const index = stall.listings.indexOf(row);
    if (index < 0 || !Number.isSafeInteger(stall[key] + amount)) return 0;
    stall[key] += amount;
    stall.listings.splice(index, 1);
    const item = JSON.parse(JSON.stringify(row.item));
    stall.sales.unshift({ id: ++stall.saleSequence, at, listedAt: row.listedAt, currency: row.currency, customer, price: amount, item });
    stall.sales.length = Math.min(stall.sales.length, env.rules.salesLimit);
    stallRulesRecord(env, stall, { at, kind: 'sale', slot: row.slot, currency: row.currency, customer, sold: true, name: row.item.name, price: amount });
    return amount * env.deps.itemAppraisal.unitValue(row.currency);
}

export function stallRulesCollect(env, owner) {
    if (owner.isBackgroundCalculation) return 0;
    const stall = owner.playerStall;
    const amounts = Object.fromEntries(env.rules.currencies.map(currency => [currency, stall[stallRulesBankKey(env, currency)]]));
    if (!env.rules.currencies.some(currency => amounts[currency] > 0)) return 0;
    if (env.rules.currencies.some(currency => !Number.isSafeInteger(owner.currencies[currency] + amounts[currency]))) return 0;
    for (const currency of env.rules.currencies) {
        owner.currencies[currency] += amounts[currency];
        stall[stallRulesBankKey(env, currency)] = 0;
    }
    owner.currencyDropVersion = (owner.currencyDropVersion || 0) + 1;
    return env.rules.currencies.reduce((sum, currency) => sum + amounts[currency] * env.deps.itemAppraisal.unitValue(currency), 0);
}

/** The unclaimed proceeds, per currency with any: [{ key, amount }]. */
export function stallRulesPayouts(env, stall) {
    return env.rules.currencies.map(key => ({ key, amount: stall[stallRulesBankKey(env, key)] })).filter(row => row.amount > 0);
}

/** Why a loop reset must wait, or '': the reset would delete listed gear or carry unclaimed dew across loops.
 * triggerSeasonReset refuses while this is non-empty; the loop screen shows the same sentence. */
export function stallRulesLoopBlockReason(env, owner) {
    const stall = owner.playerStall, parts = [];
    if (stall.listings.length) parts.push(`진열품 ${stall.listings.length}개`);
    const labels = { formlessDew: '이슬', magicBud: '새싹' };
    for (const currency of env.rules.currencies) {
        const amount = stall[stallRulesBankKey(env, currency)];
        if (amount) parts.push(`판매 대금 ${labels[currency] || env.deps._t(env.deps.ORB_DB[currency].name)} ${amount}개`);
    }
    if (!parts.length) return '';
    return `가판대에 ${parts.join('와 ')}가 남아 있습니다. 거래 → 가판대에서 회수한 뒤 루프를 진행하세요.`;
}
