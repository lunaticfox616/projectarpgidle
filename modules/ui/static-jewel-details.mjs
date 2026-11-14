const JEWEL_TONES = [
    [['firePctDmg', 'resF', 'igniteChance'], '#ff9a76'],
    [['coldPctDmg', 'resC', 'freezeChance'], '#8fd3ff'],
    [['lightPctDmg', 'resL', 'shockChance'], '#ffe083'],
    [['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance'], '#c7a6ff'],
    [['armor', 'armorPct', 'dr'], '#ffd2a6'],
    [['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce'], '#baffc2'],
    [['energyShield', 'energyShieldPct', 'energyShieldRegen'], '#8fdcff'],
    [['flatHp', 'pctHp', 'regen'], '#ffb3b3'],
    [['crit', 'critDmg'], '#ffd6f2'],
    [['aspd', 'move'], '#fff3a8']
];

export function getJewelStatToneColor(runtime, statId) {
    return JEWEL_TONES.find(([ids]) => ids.includes(statId))?.[1] || '#d7e9ff';
}

export function getCosmosKeystoneTooltipLine(runtime, jewel) {

    if (!jewel.cosmosKeystoneJewel || !jewel.cosmosKeystone) return '';
    const id = jewel.cosmosKeystone;
    const ksName = typeof runtime.deps.getAscendKeystoneName === 'function' ? (0, runtime.deps.getAscendKeystoneName)(id) : id;
    const owner = typeof runtime.deps.getAscendKeystoneOwnerClass === 'function' ? (0, runtime.deps.getAscendKeystoneOwnerClass)(id) : null;
    const ascName = owner && runtime.deps.CLASS_TEMPLATES[owner] ? `(${runtime.deps.CLASS_TEMPLATES[owner].name})` : '';
    const active = Array.isArray(runtime.deps.game.cosmosTwinKeystones) && runtime.deps.game.cosmosTwinKeystones.includes(id);
    return `<div class="tooltip-line" style="color:${active ? '#8fe7b0' : '#ffd68a'};">${(0, runtime.deps._t)('🔯 배정 키스톤: {ksName}{ascName}{value}', { ksName: (0, runtime.deps.escapeHTML)(ksName), ascName, value: active ? (0, runtime.deps._t)(', 할당 중') : (0, runtime.deps._t)(', 짝 주얼의 키스톤과 같으면 할당') })}</div>`;

}

export function createJewelRangeTooltipHtml(runtime, jewel) {
    if (!jewel) return '<div class="tooltip-title">주얼</div><div class="tooltip-line">정보 없음</div>';
    let stats = (0, runtime.deps.getJewelStats)(jewel);
    let coreStats = stats.filter(stat => !(0, runtime.deps.isJewelPetiteStat)(stat));
    let tierSummary = jewel.rarity !== 'unique' && coreStats.length > 0
        ? coreStats.reduce((sum, stat) => sum + Math.max(1, Math.floor(Number(stat.tier) || 1)), 0) / coreStats.length
        : null;
    let lines = stats.map(stat => {
        let min = (stat.valMin !== undefined && stat.valMin !== null) ? (0, runtime.deps.formatJewelStatValue)(stat.id, stat.valMin) : (0, runtime.deps.formatJewelStatValue)(stat.id, stat.val);
        let max = (stat.valMax !== undefined && stat.valMax !== null) ? (0, runtime.deps.formatJewelStatValue)(stat.id, stat.valMax) : (0, runtime.deps.formatJewelStatValue)(stat.id, stat.val);
        let petite = (0, runtime.deps.isJewelPetiteStat)(stat);
        let tier = Number.isFinite(Number(stat.tier)) && !petite ? ` <span style="color:#ffd68a;">T${Math.floor(stat.tier)}</span>` : '';
        let petiteLabel = petite ? '<span style="color:var(--copy-bright);">쁘띠 </span>' : '';
        let waxLabel = stat.waxBonus ? '<span style="color:#ffd98a;">밀랍 </span>' : '';
        let tone = getJewelStatToneColor(runtime, stat.id);
        return `<div class="tooltip-line"><span style="color:${tone};">${waxLabel}${petiteLabel}${(0, runtime.deps.getStatName)(stat.id)}: +${(0, runtime.deps.formatJewelStatValue)(stat.id, stat.val)}${tier}</span> <span style="color:var(--copy-bright);">${(0, runtime.deps._t)('(고정 범위 {min}~{max})', { min, max })}</span></div>`;
    }).join('');
    let tierLine = tierSummary ? `<div class="tooltip-line" style="color:var(--copy-bright);">${(0, runtime.deps._t)('옵션 평균 티어: T{tierSummary}', { tierSummary: tierSummary.toFixed(1) })}</div>` : '';
    let fixedTierLine = jewel.rarity === 'unique' ? `<div class="tooltip-line" style="color:#bca7dc;">${(0, runtime.deps._t)('고유 고정 옵션, 티어 평가 제외')}</div>` : '';
    let uniqueLine = jewel.rarity === 'unique' && (0, runtime.deps.getJewelUniqueEffectText)(jewel) ? `<div class="tooltip-line" style="color:#d7b8ff;">${(0, runtime.deps._t)('✨ 고유 효과: {jewel}', { jewel: (0, runtime.deps.escapeHTML)((0, runtime.deps.getJewelUniqueEffectText)(jewel)) })}</div>` : '';
    let keystoneLine = getCosmosKeystoneTooltipLine(runtime, jewel);
    let main = `<div class="tooltip-title">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(jewel.name || '주얼'))}</div>${uniqueLine}${keystoneLine}${fixedTierLine}${tierLine}${lines || (0, runtime.deps._t)('<div class="tooltip-line">옵션 정보 없음</div>')}`;
    return main;
}
