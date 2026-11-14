export function renderBlackMarketBaseOptions(deps, baseStats) {
    let rows = Array.isArray(baseStats) ? baseStats : [];
    if (rows.length <= 0) return '<div class="tooltip-line">베이스 옵션 없음</div>';
    return rows.map(stat => {
        let range = deps.baseRange(stat);
        let label = deps._t(stat.statName || deps.getStatName(stat.id));
        return `<div class="tooltip-line" style="color:#9fd6ff;">${deps._t('베이스 옵션, {label} {id}~{id2}', { label: deps.escapeHTML(label), id: deps.formatSignedValue(stat.id, range.min), id2: deps.formatSignedValue(stat.id, range.max) })}</div>`;
    }).join('');
}

export function renderBlackMarketUniqueOptions(deps, offer, uniq) {
    let effect = marketUniqueEffect(offer, uniq);
    let sourceStats = Array.isArray(offer && offer.uniqueStats) ? offer.uniqueStats : (uniq && uniq.stats);
    let effectLine = effect ? `<div class="tooltip-line" style="color:#d7b8ff;">${deps._t('고유 효과: {effect}', { effect: deps.escapeHTML(effect) })}</div>` : '';
    let statLines = (Array.isArray(sourceStats) ? sourceStats : []).map(stat => {
        let statId = stat.id;
        let { min, max } = deps.getUniqueStatRollRange(stat);
        let label = deps._t(stat.statName || deps.getStatName(statId));
        return `<div class="tooltip-line" style="color:#ffd98a;">${deps._t('고유 옵션, {label} +{statId}~+{statId2}', { label: deps.escapeHTML(label), statId: deps.formatValue(statId, min), statId2: deps.formatValue(statId, max) })}</div>`;
    });
    return effectLine + (statLines.join('') || '<div class="tooltip-line">고유 옵션 보유</div>');
}

export function renderBlackMarketOfferTooltip(deps, owner, offer) {
    if (!offer) return '<div class="tooltip-title">품절</div>';
    if (offer.type === 'exchange') return renderMarketExchange(deps, offer);
    if (offer.type === 'skillGem') return renderMarketRune(deps, offer);
    if (offer.type === 'baseItem') return renderMarketBase(deps, owner, offer);
    if (offer.type === 'unique') return renderMarketUnique(deps, owner, offer);
    return '<div class="tooltip-title">암거래 품목</div>';
}

function renderMarketExchange(deps, offer) {
    let fromName = typeof deps.getStyledOrbName === 'function' ? deps.getStyledOrbName(offer.from) : deps._t(deps.ORB_DB[offer.from].name);
    let toName = typeof deps.getStyledOrbName === 'function' ? deps.getStyledOrbName(offer.to) : deps._t(deps.ORB_DB[offer.to].name);
    let bulkLine = offer.bulkMultiplier && offer.bulkMultiplier > 1 ? `<div class="tooltip-line" style="color:#ffd36a;">${deps._t('대량 교환 x{bulkMultiplier}', { bulkMultiplier: offer.bulkMultiplier })}</div>` : '';
    let dealLine = Number.isFinite(Number(offer.dealPct)) ? `<div class="tooltip-line" style="color:#8fd9a7;">${deps._t('정규 거래소 대비 교환 효율 +{max}%', { max: Math.max(0, Math.floor(offer.dealPct)) })}</div>` : '';
    return `<div class="tooltip-title">${deps._t('재화 교환')}</div><div class="tooltip-line">${deps._t('{fromName} {need}개를 {toName} {gain}개로 교환합니다.', { fromName, need: offer.need, toName, gain: offer.gain })}</div>${dealLine}${bulkLine}`;
}

function renderMarketRune(deps, offer) {
    let skill = deps.SKILL_DB[offer.name] || {};
    return `<div class="tooltip-title">${deps._t('룬: {name}', { name: offer.name })}</div><div class="tooltip-line">${deps._t(skill.desc) || deps._t('미보유 공격 룬을 획득합니다.')}</div>`;
}

function renderMarketBase(deps, owner, offer) {
    let sourceStats = marketBaseSourceStats(deps, offer);
    let chainLabel = offer && offer.baseChainStep && offer.baseChainTotal ? `${Math.floor(offer.baseChainStep)}/${Math.floor(offer.baseChainTotal)}` : '';
    let chainLine = chainLabel ? `<div class="tooltip-line" style="color:#9fd6ff;">${deps._t('베이스 체인 {chainLabel}', { chainLabel })}</div>` : '';
    let rareLine = offer.rareT20Base ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">T20 희귀 베이스</div>' : '';
    let exLine = offer.exceptionalBase ? '<div class="tooltip-line" style="color:#ffb454; font-weight:800;">특출난 베이스</div>' : '';
    let comparison = deps.compareBase(owner, offer);
    let comparisonLine = renderMarketComparison(deps, comparison);
    return `<div class="tooltip-title">${deps._t('베이스 장비')}</div><div class="tooltip-line">${deps._t('{name}, 숨겨진 티어 {hiddenTier}', { name: offer.name, hiddenTier: offer.hiddenTier || offer.reqTier })}</div>${comparisonLine}${chainLine}${rareLine}${exLine}${renderBlackMarketBaseOptions(deps, sourceStats)}<div class="tooltip-line">${deps._t('제작용 베이스로 사용됩니다.')}</div>`;
}

function renderMarketUnique(deps, owner, offer) {
    let uniq = deps.UNIQUE_DB.find(u => u && u.name === offer.name);
    let codexLine = renderMarketCodex(owner, offer, uniq);
    let optionLines = renderBlackMarketUniqueOptions(deps, offer, uniq);
    let baseLines = renderBlackMarketBaseOptions(deps, offer.baseStats);
    let baseTitle = offer.baseName ? `<div class="tooltip-line" style="color:var(--copy-bright);">${deps._t('베이스: {baseName}, 숨겨진 티어 {hiddenTier}', { baseName: deps.escapeHTML(deps._t(offer.baseName)), hiddenTier: offer.hiddenTier || offer.reqTier })}</div>` : '';
    let chaseLine = offer.chase ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">체이싱 유니크 암거래 품목</div>' : '';
    let featuredLine = offer.featured ? '<div class="tooltip-line" style="color:#93e7c1; font-weight:800;">시장 정보로 확보한 표적 고유</div>' : '';
    return `<div class="tooltip-title">${deps._t('도감 고유 정보, {name} (숨겨진 티어 {hiddenTier})', { name: deps.escapeHTML(deps._t(offer.name)), hiddenTier: offer.hiddenTier || offer.reqTier })}</div>${featuredLine}${chaseLine}${baseTitle}${baseLines}${optionLines}<div class="tooltip-line">${deps._t('도감 등록: {codexLine}', { codexLine })}</div>`;
}

function marketUniqueEffect(offer, uniq) {
    return (offer && offer.uniqueEffect) || (uniq && uniq.uniqueEffect) || "";
}

function marketBaseSourceStats(deps, offer) {
    let base = deps.BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === String(offer.name || '').replace(' 베이스','') && row.slot === offer.slot)));
    return Array.isArray(offer.baseStats) && offer.baseStats.length > 0 ? offer.baseStats : (base && base.baseStats);
}

function renderMarketComparison(deps, comparison) {
    return comparison ? `<div class="tooltip-line" style="color:${comparison.tone === 'upgrade' || comparison.tone === 'empty' ? '#8fd9a7' : (comparison.tone === 'downgrade' ? '#d99b91' : '#9fb4d1')};">${deps._t('장착 비교, {label}', { label: deps.escapeHTML(deps._t(comparison.label)) })}</div>` : '';
}

function renderMarketCodex(owner, offer, uniq) {
    let slot = (uniq && Array.isArray(uniq.slots) && uniq.slots.length > 0) ? uniq.slots[0] : '';
    let codexKey = `${slot}|${offer.name}`;
    let codex = (owner && owner.uniqueCodex && typeof owner.uniqueCodex === 'object') ? owner.uniqueCodex : {};
    let registered = !!codex[codexKey];
    return registered ? '<span style="color:#8dffb1;">등록됨</span>' : '<span style="color:#ffb0b0;">미등록</span>';
}
