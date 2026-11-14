

export function marketTradeGetBlackMarketBaseComparison(env, owner, offer) {
    if (!offer || offer.type !== 'baseItem' || !offer.slot) return null;
    let equipped = marketTradeComparableEquipment(owner, offer);
    if (equipped.length <= 0) return { delta: null, label: env.deps._t('빈 장착 슬롯 있음'), tone: 'empty' };
    equipped.sort((a, b) => a.tier - b.tier || a.slotKey.localeCompare(b.slotKey));
    let weakest = equipped[0];
    let offerTier = Math.max(1, Math.floor(Number(offer.hiddenTier || offer.reqTier) || 1));
    let delta = offerTier - weakest.tier;
    return {
        delta,
        comparedSlot: weakest.slotKey,
        comparedTier: weakest.tier,
        label: marketTradeComparisonLabel(env, weakest, delta),
        tone: delta > 0 ? 'upgrade' : (delta < 0 ? 'downgrade' : 'same')
    };
}

function marketTradeComparableEquipment(owner, offer) {
    return Object.entries((owner && owner.equipment) || {})
        .filter(([slotKey, item]) => item && String(slotKey).replace(/[123]$/, '') === offer.slot)
        .map(([slotKey, item]) => ({ slotKey, item, tier: Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1)) }));
}

function marketTradeComparisonLabel(env, weakest, delta) {
    return `${weakest.slotKey} T${weakest.tier} 대비 ${delta === 0 ? env.deps._t('동급') : env.deps._t('{value}{delta}티어', { value: delta > 0 ? '+' : '', delta })}`;
}
