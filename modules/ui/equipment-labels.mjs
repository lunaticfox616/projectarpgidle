

export function getTierBadgeHtml(deps, tierValue, labelPrefix) {
    // 고유 아이템 확정(고정) 옵션은 tier 0 으로 생성된다. 이 경우 T1 대신 U로 표기.
    if (Math.floor(Number(tierValue)) === 0) {
        return `<span class="tier-badge tier-badge-unique" style="color:#ff9f43;">[U]</span>`;
    }
    let tier = (0, deps.getTierDisplayLevel)(tierValue);
    let label = labelPrefix || 'T';
    return `<span class="tier-badge ${(0, deps.getTierClassName)(tier)}">[${label}${tier}]</span>`;
}

export function formatJewelStatValue(deps, statId, value) {
    let option = (0, deps.getJewelOptionDef)(statId);
    if (option && Number.isFinite(option.step) && option.step < 1) return Number(value || 0).toFixed(2);
    if (Math.abs(Number(value) || 0) < 1 && !Number.isInteger(Number(value))) return Number(value || 0).toFixed(2);
    return (0, deps.formatValue)(statId, value);
}

export function getJewelRarityLabel(deps, rarity) {
    if (rarity === 'unique') return '고유';
    if (rarity === 'rare') return deps.ITEM_RARITY_LABELS.rare;
    if (rarity === 'magic') return deps.ITEM_RARITY_LABELS.magic;
    return '일반';
}

export function getJewelRarityClass(rarity) {
    if (rarity === 'unique') return 'unique';
    if (rarity === 'rare') return 'rare';
    if (rarity === 'magic') return 'magic';
    return 'normal';
}

export function formatCurrencyCosts(deps, costs) {
    return (costs || []).map(row => `${(deps.ORB_DB[row.key] || {}).name || row.key} ${row.amount}`).join(' + ');
}
