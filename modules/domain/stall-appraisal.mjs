

export function stallRulesAppraiseListings(env, stall) {
    return stall.listings.map(row => ({ row, value: env.deps.itemAppraisal.quote(row.item, row.currency),
        fits: env.deps.PLAYER_STALL_CUSTOMERS.map(customer => env.deps.itemAppraisal.affinity(row.item, customer)) }));
}

export function stallRulesViewingInterest(env, price, fair, ageMs) {
    if (ageMs < env.rules.minimumAgeMs) return 0;
    const discount = Math.min(1, Math.max(0, 1 - price / fair) / env.rules.fullEarlyDiscount);
    const early = env.rules.earlyInterest + env.rules.earlyDiscountBoost * discount;
    const maturity = Math.min(1, (ageMs - env.rules.minimumAgeMs) / (env.rules.matureAgeMs - env.rules.minimumAgeMs));
    return early + (1 - early) * maturity;
}

/** Probability for one visit, with early discounted sales and a gradual rise at ordinary prices. */
export function stallRulesChance(env, item, price, customer, ...selection) {
    const [currency = 'formlessDew', ageMs = env.rules.matureAgeMs] = selection;
    const value = env.deps.itemAppraisal.quote(item, currency);
    if (!value) return 0;
    return stallRulesPurchaseChance(env, value, price, env.deps.itemAppraisal.affinity(item, customer), ageMs, customer);
}

export function stallRulesBuyerLimit(value, fit, customer) {
    const preference = 0.88 + 0.12 * fit;
    const premium = fit >= 0.65 ? customer.premium : Math.min(1, customer.premium);
    return Math.min(value.ceiling, Math.max(1, Math.floor(value.fair * preference * premium)));
}

export function stallRulesPurchaseChance(env, value, price, fit, ...selection) {
    const [ageMs, customer] = selection;
    if (!value || price > stallRulesBuyerLimit(value, fit, customer)) return 0;
    const ratio = price / value.fair;
    const interest = 0.45 + 0.55 * fit;
    const decision = Math.min(0.95, Math.max(0.03, 1.2 - ratio * 0.7) * interest) * value.demand;
    const perVisit = 1 - Math.pow(1 - decision, env.rules.visitMs / env.rules.decisionWindowMs);
    return Math.min(1, perVisit * stallRulesViewingInterest(env, price, value.fair, ageMs) * customer.buyRate);
}
