/** One ordinary crafting currency per use; reading the quote does not spend it. */
export function craftingPayment(owner, action) {
    const have = owner.currencies[action] || 0;
    return { key: action, cost: 1, have, affordable: have >= 1 };
}
