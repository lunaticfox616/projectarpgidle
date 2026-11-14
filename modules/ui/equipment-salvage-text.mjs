

export function formatSalvageRewardSummary(deps, rewards) {
    let normalized = (0, deps.mergeSalvageRewards)({}, rewards);
    let entries = Object.entries(normalized).filter(([, amount]) => Number(amount) > 0);
    if (entries.length <= 0) return '회수 재화 없음';
    return entries.map(([key, amount]) => `${(0, deps.getStyledOrbName)(key)} +${Math.floor(amount)}`).join(', ');
}

export function getItemSalvagePreviewText(deps, item, compact) {
    let profile = (0, deps.getItemSalvageRewardProfile)(item);
    let guaranteed = Object.entries(profile.guaranteed)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => {
            let label = (0, deps.getCurrencyInfo)(key).name;
            return `${label} ${amount}`;
        });
    let chances = profile.chances
        .filter(row => row && row.chance > 0)
        .map(row => compact && item && item.rarity === 'unique'
            ? null
            : `${(0, deps.getCurrencyInfo)(row.key).name} ${Math.round(row.chance * 100)}%`)
        .filter(Boolean);
    if (compact && item && item.rarity === 'unique' && profile.chances.length > 0) chances.push('고급 재화 확률');
    return (0, deps._t)('해체 {concat}', { concat: guaranteed.concat(chances).join(', ') || (0, deps._t)('보상 없음') });
}
