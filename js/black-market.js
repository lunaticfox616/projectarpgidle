/** 암거래상 (거래소 → 암거래상): every 10 minutes (or paid now) a new row of offers: currency trades, T15 craft bases, attack runes the
 * hero lacks and uniques, with a target unique every 5 refreshes; up to 3 offers locked through refreshes, slots bought up
 * to 50. State: game.blackMarket (js/state.js), normalized here on every read. Each offer keeps its place on the shelf (column, row).
 * Moved out of js/items.js on 2026-10-18 with the shop screen (js/black-market-ui.js), which asks, logs and draws: nothing here does.
 */
const BLACK_MARKET_BASE_SLOT_COUNT = 6;
const BLACK_MARKET_MAX_SLOT_COUNT = 50;
const BLACK_MARKET_MAX_EXTRA_SLOTS = Math.max(0, BLACK_MARKET_MAX_SLOT_COUNT - BLACK_MARKET_BASE_SLOT_COUNT);
const BLACK_MARKET_CHASE_UNIQUE_CHANCE = 0.0016;
const BLACK_MARKET_BASE_CRAFT_TIER = 15;
const BLACK_MARKET_MAX_LOCKED_OFFERS = 3;
const BLACK_MARKET_INSIGHT_TARGET = 5;
const BLACK_MARKET_EQUIPMENT_SLOTS = ['무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패'];

function isUniqueEligibleForBlackMarket(unique) {
    if (!unique || unique.contentOnly || unique.bossOnly || unique.realmCodexOnly) return false;
    if (!unique.dropOnly) return true;
    return false;
}

function isBaseEligibleForBlackMarket(base) {
    return !!(base && !base.dropOnly && !base.realmBase);
}

function rollBlackMarketExchangeOffer(recipe, index) {
    let multiplierRoll = Math.random();
    let bulkMultiplier = 1;
    if (multiplierRoll < 0.0002) bulkMultiplier = 100;
    else if (multiplierRoll < 0.0022) bulkMultiplier = 10;
    else if (multiplierRoll < 0.0222) bulkMultiplier = 2 + Math.floor(Math.random() * 4);
    let needVariance = 0.9 + Math.random() * 0.2;
    let gainVariance = 0.9 + Math.random() * 0.2;
    let baseGain = recipe.gain;
    if (recipe.id === 'm11' && recipe.from === 'goldenRule' && recipe.to === 'formlessDew') baseGain = 70;
    let need = Math.max(1, Math.floor(recipe.need * 0.8 * needVariance * bulkMultiplier));
    let gain = Math.max(1, Math.floor(baseGain * gainVariance * bulkMultiplier));
    let standardRate = Math.max(0.0001, recipe.gain / Math.max(1, recipe.need));
    let rolledRate = gain / Math.max(1, need);
    let dealPct = Math.max(0, Math.round((rolledRate / standardRate - 1) * 100));
    return { type:'exchange', name:`암거래 교환 #${index+1}`, from:recipe.from, to:recipe.to, need, gain, bulkMultiplier, dealPct };
}

function getBlackMarketBaseChainInfo(base) {
    return typeof getBaseChainInfo === 'function' ? getBaseChainInfo(base) : null;
}

function rollBlackMarketBaseStats(base, hiddenTier) {
    if (typeof rollBaseStats === 'function') return rollBaseStats(base, hiddenTier || base.reqTier || 1);
    return Array.isArray(base.baseStats) ? base.baseStats.map(stat => ({ ...stat })) : [];
}

function maybeApplyBlackMarketExceptionalBaseStats(baseStats) {
    if (!Array.isArray(baseStats) || baseStats.length <= 0 || Math.random() >= 0.12) return { baseStats, exceptionalBase: false, names: [] };
    let names = [];
    baseStats.forEach(stat => {
        if (!stat) return;
        let max = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax)
            : (Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : Number(stat.val || stat.base || 0));
        let boosted = max * 1.2;
        let usesDecimal = isTenthStat(stat.id);
        stat.val = usesDecimal ? Math.round(boosted * 10) / 10 : Math.max(1, Math.floor(boosted));
        stat.exceptional = true;
        names.push(stat.statName || getStatName(stat.id));
    });
    return { baseStats, exceptionalBase: names.length > 0, names };
}

function clearExceptionalBaseState(item) {
    if (!item) return item;
    delete item.exceptionalBase;
    delete item.exceptionalStatNames;
    delete item.exceptionalStatName;
    delete item.exceptionalAllLines;
    (Array.isArray(item.baseStats) ? item.baseStats : []).forEach(stat => {
        if (stat) delete stat.exceptional;
    });
    return item;
}

function chooseBlackMarketBase(slot) {
    let candidates = BASE_ITEM_DB.filter(base => isBaseEligibleForBlackMarket(base)
        && base.slot === slot && (base.reqTier || 1) <= BLACK_MARKET_BASE_CRAFT_TIER);
    return candidates.length ? rndChoice(candidates) : chooseItemBase(slot, BLACK_MARKET_BASE_CRAFT_TIER);
}

function getBlackMarketBaseRollRange(stat) {
    let statBase = Number(stat && stat.base) || 0;
    let minBase = Number.isFinite(Number(stat && stat.baseMin)) ? Number(stat.baseMin)
        : (Number.isFinite(Number(stat && stat.baseRollMin)) ? Number(stat.baseRollMin)
        : (Number.isFinite(Number(stat && stat.valMin)) ? Number(stat.valMin) : statBase * 0.8));
    let maxBase = Number.isFinite(Number(stat && stat.baseMax)) ? Number(stat.baseMax)
        : (Number.isFinite(Number(stat && stat.baseRollMax)) ? Number(stat.baseRollMax)
        : (Number.isFinite(Number(stat && stat.valMax)) ? Number(stat.valMax) : statBase * 1.2));
    let scale = stat && stat.id === 'energyShield' ? 1.5 : 1;
    let min = minBase * scale;
    let max = maxBase * scale;
    if (max > 0) {
        let decimal = isTenthStat(stat.id);
        min = Math.max(decimal ? 0.1 : 1, min);
        max = Math.max(min, max);
    }
    return { min, max };
}

function getBlackMarketBaseTooltipOptionLines(baseStats) {
    let rows = Array.isArray(baseStats) ? baseStats : [];
    if (rows.length <= 0) return '<div class="tooltip-line">베이스 옵션 없음</div>';
    return rows.map(stat => {
        let range = getBlackMarketBaseRollRange(stat);
        let label = stat.statName || getStatName(stat.id);
        return `<div class="tooltip-line" style="color:#9fd6ff;">베이스 옵션, ${escapeHTML(label)} ${formatSignedValue(stat.id, range.min)}~${formatSignedValue(stat.id, range.max)}</div>`;
    }).join('');
}

function getBlackMarketUniqueBase(unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return null;
    return BASE_ITEM_DB.find(base => base.id === UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
}

function rollBlackMarketChaseUniquePrice(reqTier) {
    let tier = Math.max(1, Math.floor(Number(reqTier) || 1));
    let minPrice = Math.max(30, Math.min(150, Math.floor(tier * 2)));
    let maxPrice = Math.max(minPrice, Math.min(150, Math.floor(tier * 7.5)));
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
}

function getBlackMarketUniqueCodexKey(unique) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return '';
    return `${unique.slots[0]}|${unique.name}`;
}

function isBlackMarketUniqueRegistered(unique) {
    let key = getBlackMarketUniqueCodexKey(unique);
    return !!(key && game.uniqueCodex && game.uniqueCodex[key]);
}

/** Saved offers keep their price and lock; their displayed base follows the fixed unique identity. */
function migrateUniqueMarketOffer(offer) {
    if (offer.type === 'unique') offer.name = RENAMED_UNIQUES[offer.name] || offer.name;
    const rule = offer.type === 'unique' && UNIQUE_EQUIPMENT_RULES[offer.name];
    if (!rule) return;
    const base = BASE_ITEM_DB.find(row => row.id === rule.baseId);
    if (offer.baseId === base.id && offer.slot === base.slot && offer.baseName === base.name && offer.blockBaseVersion >= 1) return;
    offer.baseId = base.id;
    offer.baseName = base.name;
    offer.slot = base.slot;
    offer.baseStats = base.baseStats.map(stat => ({ ...stat }));
    offer.blockBaseVersion = 1;
    if (offer.name === '고요한 맹세') offer.uniqueStats = UNIQUE_DB.find(row => row.name === offer.name).stats.map(stat => ({ ...stat }));
}

/** Saved crafting bases retain their rolls, price and shelf location while their equipment definition changes. */
function migrateBlackMarketBaseOffer(offer) {
    if (!offer.baseId) offer.baseId = ARM_GUARD_BASE_LEGACY_NAMES[String(offer.baseName || offer.name || '').replace(/ 베이스$/, '')];
    normalizeArmGuardIdentity(offer);
    if (Array.isArray(offer.baseStats)) migrateEquipmentBlockBases(offer);
    const base = BASE_ITEM_DB.find(row => row.id === offer.baseId);
    if (base) offer.name = base.name + ' 베이스';
}

function normalizeBlackMarketState() {
    game.blackMarket = (game.blackMarket && typeof game.blackMarket === 'object') ? game.blackMarket : { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {} };
    game.blackMarket.extraSlots = Math.max(0, Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.floor(Number(game.blackMarket.extraSlots) || 0)));
    game.blackMarket.offers = Array.isArray(game.blackMarket.offers) ? game.blackMarket.offers.slice(0, BLACK_MARKET_MAX_SLOT_COUNT).map(offer => {
        if (!offer) return offer;
        migrateUniqueMarketOffer(offer);
        if (offer.type === 'baseItem') {
            migrateBlackMarketBaseOffer(offer);
            let base = BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId)
                || (row.name === String(offer.name || '').replace(' 베이스', '') && row.slot === offer.slot)));
            if (base && (base.reqTier || 1) > BLACK_MARKET_BASE_CRAFT_TIER) return null;
            offer.hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
            offer.affixTierCap = BLACK_MARKET_BASE_CRAFT_TIER;
            offer.rareT20Base = false;
            offer.price = Math.ceil(BLACK_MARKET_BASE_CRAFT_TIER * 0.45) + 2 + (offer.exceptionalBase ? 4 : 0);
            return offer;
        }
        if (offer.type !== 'unique') return offer;
        let unique = UNIQUE_DB.find(row => row && row.name === offer.name);
        return isUniqueEligibleForBlackMarket(unique) ? offer : null;
    }) : [];
    game.blackMarket.lockedOffers = (game.blackMarket.lockedOffers && typeof game.blackMarket.lockedOffers === 'object') ? game.blackMarket.lockedOffers : {};
    game.blackMarket.preferredSlot = BLACK_MARKET_EQUIPMENT_SLOTS.includes(game.blackMarket.preferredSlot) ? game.blackMarket.preferredSlot : 'any';
    game.blackMarket.insight = Math.max(0, Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.floor(Number(game.blackMarket.insight) || 0)));
    game.blackMarket.manualRefreshes = Math.max(0, Math.min(20, Math.floor(Number(game.blackMarket.manualRefreshes) || 0)));
    Object.keys(game.blackMarket.lockedOffers).forEach(key => {
        let idx = Math.floor(Number(key));
        if (!Number.isFinite(idx) || idx < 0 || idx >= BLACK_MARKET_MAX_SLOT_COUNT || !game.blackMarket.offers[idx]) delete game.blackMarket.lockedOffers[key];
    });
    return game.blackMarket;
}

function getBlackMarketLockCount() {
    let bm = normalizeBlackMarketState();
    return Object.keys(bm.lockedOffers || {}).filter(key => bm.lockedOffers[key] && bm.offers[Math.floor(Number(key))]).length;
}

function getBlackMarketManualRefreshCost() {
    let bm = normalizeBlackMarketState();
    return Math.min(25, 3 + Math.max(0, Math.floor(bm.manualRefreshes || 0)) * 2);
}

function getBlackMarketSlotCount() {
    let bm = normalizeBlackMarketState();
    return Math.min(BLACK_MARKET_MAX_SLOT_COUNT, BLACK_MARKET_BASE_SLOT_COUNT + Math.max(0, Math.floor(bm.extraSlots || 0)));
}

function isBlackMarketSlotCapReached() {
    return getBlackMarketSlotCount() >= BLACK_MARKET_MAX_SLOT_COUNT;
}

function createBlackMarketUniqueOffer(unique, tier, options) {
    if (!unique) return null;
    let req = unique.reqTier || tier;
    let uniqueBase = getBlackMarketUniqueBase(unique);
    let price;
    if (unique.ultraRare) {
        price = rollBlackMarketChaseUniquePrice(req);
    } else {
        let minPrice = Math.max(1, Math.floor(req / 10));
        let maxPrice = Math.max(minPrice + 1, Math.floor(req / 4) + 1);
        price = minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
    }
    return {
        type:'unique',
        name:unique.name,
        slot:unique.slots[0],
        reqTier:req,
        hiddenTier:req,
        baseId: uniqueBase ? uniqueBase.id : '',
        baseName: uniqueBase ? uniqueBase.name : '',
        priceKey:'goldenRule',
        price:price,
        chase: !!unique.ultraRare,
        featured: !!(options && options.featured),
        uniqueEffect: unique.uniqueEffect || '',
        baseStats: uniqueBase && Array.isArray(uniqueBase.baseStats) ? uniqueBase.baseStats.map(stat => ({ ...stat })) : [],
        uniqueStats: Array.isArray(unique.stats) ? unique.stats.map(stat => ({ ...stat })) : []
    };
}

function getBlackMarketUniquePool(tier, preferredSlot, options) {
    let includeChase = !!(options && options.includeChase);
    let pool = UNIQUE_DB.filter(unique => {
        if (!isUniqueEligibleForBlackMarket(unique)) return false;
        if ((unique.reqTier || 1) > tier + 4) return false;
        if (!includeChase && unique.ultraRare) return false;
        if (preferredSlot && preferredSlot !== 'any' && (!Array.isArray(unique.slots) || unique.slots[0] !== preferredSlot)) return false;
        return true;
    });
    if (pool.length <= 0 && preferredSlot && preferredSlot !== 'any') {
        return getBlackMarketUniquePool(tier, 'any', options);
    }
    return pool;
}

function buildBlackMarketFeaturedOffer() {
    let tier = (getZone(game.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = normalizeBlackMarketState();
    let pool = getBlackMarketUniquePool(tier, bm.preferredSlot, { includeChase: false });
    let missing = pool.filter(unique => !isBlackMarketUniqueRegistered(unique));
    let unique = rndChoice(missing.length > 0 ? missing : pool);
    return createBlackMarketUniqueOffer(unique, tier, { featured: true }) || buildBlackMarketOffer(0);
}



function buildBlackMarketOffer(index) {
    let tier = (getZone(game.currentZoneId) || { tier: 1 }).tier || 1;
    let bm = normalizeBlackMarketState();
    let roll = Math.random();
    if (roll < 0.45) {
        return rollBlackMarketExchangeOffer(rndChoice(MARKET_EXCHANGES), index);
    }
    if (roll < 0.75) {
        let preferred = bm.preferredSlot;
        let slot = preferred !== 'any' && Math.random() < 0.35 ? preferred : rndChoice(BLACK_MARKET_EQUIPMENT_SLOTS);
        let base = chooseBlackMarketBase(slot);
        let hiddenTier = BLACK_MARKET_BASE_CRAFT_TIER;
        let chainInfo = getBlackMarketBaseChainInfo(base);
        let rolledBase = maybeApplyBlackMarketExceptionalBaseStats(rollBlackMarketBaseStats(base, hiddenTier));
        // 제작 가능 옵션 단계는 현재 지역(hiddenTier)을 따르므로 가격도 원본 베이스 요구 티어가
        // 아니라 실제 제공 티어를 기준으로 계산한다. 저티어 베이스를 고단계 제작대로 헐값에
        // 구매하는 경제 우회를 막되, 직접 드랍보다 접근성은 유지한다.
        let price = Math.max(2, Math.ceil(hiddenTier * 0.45) + 2 + (rolledBase.exceptionalBase ? 4 : 0));
        return { type:'baseItem', name:`${base.name} 베이스`, slot: base.slot, baseId: base.id, baseName: base.name, hiddenTier:hiddenTier, affixTierCap:hiddenTier, priceKey:'formlessDew', price:price, baseStats: rolledBase.baseStats, exceptionalBase: rolledBase.exceptionalBase, exceptionalStatNames: rolledBase.names, rareT20Base:false, baseChainStep: chainInfo && chainInfo.step, baseChainTotal: chainInfo && chainInfo.total };
    }
    if (roll < 0.9) {
        let missing = Object.keys(SKILL_DB).filter(k => SKILL_DB[k].isGem && !hasSkillGemOwned(k));
        if (missing.length>0) return { type:'skillGem', name:pickSkillRuneReward(missing), priceKey:'formlessDew', price:5 };
    }
    let preferredUniqueSlot = bm.preferredSlot !== 'any' && Math.random() < 0.35 ? bm.preferredSlot : 'any';
    let uniqPool = getBlackMarketUniquePool(tier, preferredUniqueSlot, { includeChase: true });
    let normalPool = uniqPool.filter(u => !u.ultraRare);
    let chasePool = uniqPool.filter(u => u.ultraRare);
    let pickChase = chasePool.length > 0 && Math.random() < BLACK_MARKET_CHASE_UNIQUE_CHANCE;
    let fallbackPool = uniqPool.length ? uniqPool : UNIQUE_DB.filter(isUniqueEligibleForBlackMarket);
    let unregisteredNormal = normalPool.filter(unique => !isBlackMarketUniqueRegistered(unique));
    let normalChoicePool = unregisteredNormal.length > 0 && Math.random() < 0.7 ? unregisteredNormal : normalPool;
    let unique = pickChase
        ? rndChoice(chasePool)
        : rndChoice(normalChoicePool.length ? normalChoicePool : fallbackPool);
    return createBlackMarketUniqueOffer(unique, tier);
}

function getBlackMarketUniqueTooltipOptionLines(offer, uniq) {
    let effect = (offer && offer.uniqueEffect) || (uniq && uniq.uniqueEffect) || '';
    let sourceStats = Array.isArray(offer && offer.uniqueStats) ? offer.uniqueStats : (uniq && uniq.stats);
    let effectLine = effect ? `<div class="tooltip-line" style="color:#d7b8ff;">고유 효과: ${escapeHTML(effect)}</div>` : '';
    let statLines = (Array.isArray(sourceStats) ? sourceStats : []).map(stat => {
        let statId = stat.id;
        let { min, max } = getUniqueStatRollRange(stat);
        let label = stat.statName || getStatName(statId);
        return `<div class="tooltip-line" style="color:#ffd98a;">고유 옵션, ${escapeHTML(label)} +${formatValue(statId, min)}~+${formatValue(statId, max)}</div>`;
    });
    return effectLine + (statLines.join('') || '<div class="tooltip-line">고유 옵션 보유</div>');
}

function getBlackMarketBaseComparison(offer) {
    if (!offer || offer.type !== 'baseItem' || !offer.slot) return null;
    let equipped = Object.entries((game && game.equipment) || {})
        .filter(([slotKey, item]) => item && String(slotKey).replace(/[123]$/, '') === offer.slot)
        .map(([slotKey, item]) => ({ slotKey, item, tier: Math.max(1, Math.floor(Number(item.hiddenTier || item.itemTier) || 1)) }));
    if (equipped.length <= 0) return { delta: null, label: '빈 장착 슬롯 있음', tone: 'empty' };
    equipped.sort((a, b) => a.tier - b.tier || a.slotKey.localeCompare(b.slotKey));
    let weakest = equipped[0];
    let offerTier = Math.max(1, Math.floor(Number(offer.hiddenTier || offer.reqTier) || 1));
    let delta = offerTier - weakest.tier;
    return {
        delta,
        comparedSlot: weakest.slotKey,
        comparedTier: weakest.tier,
        label: `${weakest.slotKey} T${weakest.tier} 대비 ${delta === 0 ? '동급' : `${delta > 0 ? '+' : ''}${delta}티어`}`,
        tone: delta > 0 ? 'upgrade' : (delta < 0 ? 'downgrade' : 'same')
    };
}

function getBlackMarketOfferTooltipHtml(offer) {
    if (!offer) return '<div class="tooltip-title">품절</div>';
    if (offer.type === 'exchange') {
        let fromName = typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.from) : ORB_DB[offer.from].name;
        let toName = typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.to) : ORB_DB[offer.to].name;
        let bulkLine = offer.bulkMultiplier && offer.bulkMultiplier > 1 ? `<div class="tooltip-line" style="color:#ffd36a;">대량 교환 x${offer.bulkMultiplier}</div>` : '';
        let dealLine = Number.isFinite(Number(offer.dealPct)) ? `<div class="tooltip-line" style="color:#8fd9a7;">정규 거래소 대비 교환 효율 +${Math.max(0, Math.floor(offer.dealPct))}%</div>` : '';
        return `<div class="tooltip-title">재화 교환</div><div class="tooltip-line">${fromName} ${offer.need}개를 ${toName} ${offer.gain}개로 교환합니다.</div>${dealLine}${bulkLine}`;
    }
    if (offer.type === 'skillGem') {
        let skill = SKILL_DB[offer.name] || {};
        return `<div class="tooltip-title">룬: ${offer.name}</div><div class="tooltip-line">${skill.desc || '미보유 공격 룬을 획득합니다.'}</div>`;
    }
    if (offer.type === 'baseItem') {
        let base = BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === String(offer.name || '').replace(' 베이스','') && row.slot === offer.slot)));
        let sourceStats = Array.isArray(offer.baseStats) && offer.baseStats.length > 0 ? offer.baseStats : (base && base.baseStats);
        let chainLabel = offer && offer.baseChainStep && offer.baseChainTotal ? `${Math.floor(offer.baseChainStep)}/${Math.floor(offer.baseChainTotal)}` : '';
        let chainLine = chainLabel ? `<div class="tooltip-line" style="color:#9fd6ff;">베이스 체인 ${chainLabel}</div>` : '';
        let rareLine = offer.rareT20Base ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">T20 희귀 베이스</div>' : '';
        let exLine = offer.exceptionalBase ? '<div class="tooltip-line" style="color:#ffb454; font-weight:800;">특출난 베이스</div>' : '';
        let comparison = getBlackMarketBaseComparison(offer);
        let comparisonLine = comparison ? `<div class="tooltip-line" style="color:${comparison.tone === 'upgrade' || comparison.tone === 'empty' ? '#8fd9a7' : (comparison.tone === 'downgrade' ? '#d99b91' : '#9fb4d1')};">장착 비교, ${escapeHTML(comparison.label)}</div>` : '';
        return `<div class="tooltip-title">베이스 장비</div><div class="tooltip-line">${offer.name}, 숨겨진 티어 ${offer.hiddenTier || offer.reqTier}</div>${comparisonLine}${chainLine}${rareLine}${exLine}${getBlackMarketBaseTooltipOptionLines(sourceStats)}<div class="tooltip-line">제작용 베이스로 사용됩니다.</div>`;
    }
    if (offer.type === 'unique') {
        let uniq = UNIQUE_DB.find(u => u && u.name === offer.name);
        let slot = (uniq && Array.isArray(uniq.slots) && uniq.slots.length > 0) ? uniq.slots[0] : '';
        let codexKey = `${slot}|${offer.name}`;
        let codex = (game && game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
        let registered = !!codex[codexKey];
        let codexLine = registered ? '<span style="color:#8dffb1;">등록됨</span>' : '<span style="color:#ffb0b0;">미등록</span>';
        let optionLines = getBlackMarketUniqueTooltipOptionLines(offer, uniq);
        let baseLines = getBlackMarketBaseTooltipOptionLines(offer.baseStats);
        let baseTitle = offer.baseName ? `<div class="tooltip-line" style="color:var(--copy-bright);">베이스: ${escapeHTML(offer.baseName)}, 숨겨진 티어 ${offer.hiddenTier || offer.reqTier}</div>` : '';
        let chaseLine = offer.chase ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">체이싱 유니크 암거래 품목</div>' : '';
        let featuredLine = offer.featured ? '<div class="tooltip-line" style="color:#93e7c1; font-weight:800;">시장 정보로 확보한 표적 고유</div>' : '';
        return `<div class="tooltip-title">도감 고유 정보, ${escapeHTML(offer.name)} (숨겨진 티어 ${offer.hiddenTier || offer.reqTier})</div>${featuredLine}${chaseLine}${baseTitle}${baseLines}${optionLines}<div class="tooltip-line">도감 등록: ${codexLine}</div>`;
    }
    return '<div class="tooltip-title">암거래 품목</div>';
}

function refreshBlackMarket(force) {
    if (!isMarketUnlocked()) return;
    let bm = normalizeBlackMarketState();
    let now = Date.now();
    let count = getBlackMarketSlotCount();
    Object.keys(bm.lockedOffers || {}).forEach(key => {
        let idx = Math.floor(Number(key));
        if (!Number.isFinite(idx) || idx < 0 || idx >= count) delete bm.lockedOffers[key];
    });
    if (!force && now < (bm.nextRefreshAt || 0)) {
        for (let index = 0; index < count; index++) {
            if (typeof bm.offers[index] === 'undefined') bm.offers[index] = buildBlackMarketOffer(index);
        }
        return;
    }
    let isNaturalRefresh = !force;
    if (isNaturalRefresh) bm.manualRefreshes = 0;
    let prevOffers = Array.isArray(bm.offers) ? bm.offers.slice(0, count) : [];
    let openIndices = Array.from({ length: count }, (_, index) => index).filter(index => !(bm.lockedOffers[index] && prevOffers[index]));
    let nextInsight = Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.max(0, Math.floor(bm.insight || 0)) + 1);
    let featuredIndex = nextInsight >= BLACK_MARKET_INSIGHT_TARGET && openIndices.length > 0 ? openIndices[0] : -1;
    let featuredOffer = featuredIndex >= 0 ? buildBlackMarketFeaturedOffer() : null;
    bm.offers = Array.from({ length: count }, (_, i) => {
        if (bm.lockedOffers[i] && prevOffers[i]) return prevOffers[i];
        if (bm.lockedOffers[i]) delete bm.lockedOffers[i];
        if (i === featuredIndex) return featuredOffer;
        return buildBlackMarketOffer(i);
    });
    bm.insight = featuredOffer && featuredOffer.featured ? 0 : nextInsight;
    bm.nextRefreshAt = now + (10 * 60 * 1000);
}

/** Locks or unlocks offer index (a locked offer stays through a refresh): { ok, reason, locked }. */
function lockBlackMarketOffer(index) {
    const bm = normalizeBlackMarketState();
    if (!bm.offers[index]) return { ok: false, reason: '이미 팔린 물건입니다.' };
    if (bm.lockedOffers[index]) { delete bm.lockedOffers[index]; return { ok: true, locked: false }; }
    if (getBlackMarketLockCount() >= BLACK_MARKET_MAX_LOCKED_OFFERS) return { ok: false, reason: `잠금은 ${BLACK_MARKET_MAX_LOCKED_OFFERS}개까지입니다.` };
    bm.lockedOffers[index] = true;
    return { ok: true, locked: true };
}

/** The slot the next refreshes favour ('any' for all): true when it changed. */
function setBlackMarketPreferredSlot(slot) {
    const bm = normalizeBlackMarketState(), next = BLACK_MARKET_EQUIPMENT_SLOTS.includes(slot) ? slot : 'any';
    if (bm.preferredSlot === next) return false;
    bm.preferredSlot = next;
    return true;
}

/** Pays for a refresh now (each one this period costs more) and refreshes the unlocked offers: { ok, reason, cost }. */
function payBlackMarketRefresh() {
    const bm = normalizeBlackMarketState(), cost = getBlackMarketManualRefreshCost();
    if (!isMarketUnlocked()) return { ok: false, reason: '거래소가 아직 열리지 않았습니다.' };
    if ((game.currencies.formlessDew || 0) < cost) return { ok: false, reason: `형체 없는 이슬 부족, ${game.currencies.formlessDew || 0}/${cost}`, cost };
    game.currencies.formlessDew -= cost;
    bm.manualRefreshes = Math.min(20, Math.max(0, Math.floor(bm.manualRefreshes || 0)) + 1);
    refreshBlackMarket(true);
    return { ok: true, cost };
}

/** Pays 황금률 for one more offer slot for good (the offers and locks stay): { ok, reason, cost, count }. */
function payBlackMarketExpansion() {
    const bm = normalizeBlackMarketState(), cost = getBlackMarketSlotExpandCost(), before = getBlackMarketSlotCount();
    if (isBlackMarketSlotCapReached()) return { ok: false, reason: `진열은 ${BLACK_MARKET_MAX_SLOT_COUNT}칸까지입니다.` };
    if ((game.currencies.goldenRule || 0) < cost) return { ok: false, reason: `황금률 부족, ${game.currencies.goldenRule || 0}/${cost}`, cost };
    game.currencies.goldenRule -= cost;
    bm.extraSlots = Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.max(0, Math.floor(bm.extraSlots || 0)) + 1);
    bm.offers[before] = buildBlackMarketOffer(before);
    return { ok: true, cost, count: getBlackMarketSlotCount() };
}

function getBlackMarketSlotExpandCost() {
    return 1 + Math.max(0, Math.floor(normalizeBlackMarketState().extraSlots || 0));
}

/** What an offer costs: a trade pays its from currency, the rest their price. */
function getBlackMarketOfferPrice(offer) {
    return offer.type === 'exchange' ? { key: offer.from, amount: offer.need } : { key: offer.priceKey, amount: offer.price };
}

/** Whether offer index can be bought now: { ok, reason }. place: the bag cell { column, row } (row over all pages) gear goes to. */
function checkBlackMarketOffer(index, place = null) {
    if (game.woodsmanBuildLock) return { ok: false, reason: '☠️ 나무꾼 전투 중에는 살 수 없습니다.' };
    const offer = normalizeBlackMarketState().offers[index];
    if (!offer) return { ok: false, reason: '이미 팔린 물건입니다.' };
    const price = getBlackMarketOfferPrice(offer), have = Math.floor(Number(game.currencies[price.key]) || 0);
    if (have < price.amount) return { ok: false, reason: `${ORB_DB[price.key].name} 부족, ${have}/${price.amount}` };
    if (offer.type === 'skillGem') return hasSkillGemOwned(offer.name) ? { ok: false, reason: '이미 가진 룬입니다.' } : { ok: true };
    return offer.type === 'baseItem' || offer.type === 'unique' ? checkBlackMarketRoom(offer, place) : { ok: true };
}

/** Room in the bag for a gear offer: at place, or anywhere. */
function checkBlackMarketRoom(offer, place) {
    if (!place) return canStoreEquipmentItems([offer], game) ? { ok: true } : { ok: false, reason: '가방에 빈칸이 없습니다.' };
    const fit = equipmentInventoryGridRuntime.canAdd(offer, place.column, place.row, game);
    return fit.ok ? { ok: true } : { ok: false, reason: fit.reason };
}

/** The question to ask before buying offer, or '': chase and target uniques and prices of 5 황금률 or more (a bulk trade too). */
function getBlackMarketConfirmText(offer) {
    const price = getBlackMarketOfferPrice(offer);
    if (!(offer.chase || offer.featured || (price.key === 'goldenRule' && Number(price.amount) >= 5))) return '';
    return `[${offer.name || '암거래 상품'}]${pickParticle(offer.name || '암거래 상품', '을', '를')} 삽니다.\n${ORB_DB[price.key].name} ${price.amount}개를 쓰며 되돌릴 수 없습니다.`;
}

/** Buys offer index into place (a bag cell) or the first free bag place: pays, grants and empties the slot. offer: the offer the
 * player saw; when a refresh (its time ran out) or a sale put another one there, nothing is bought. The caller asks first when
 * getBlackMarketConfirmText says so. Returns { ok, reason, summary, notable }. */
function sellBlackMarketOffer(index, { place = null, offer = null } = {}) {
    refreshBlackMarket(false);
    const bm = normalizeBlackMarketState();
    if (offer && bm.offers[index] !== offer) return { ok: false, reason: '진열이 바뀌었습니다. 새 물건을 다시 확인하세요.' };
    const check = checkBlackMarketOffer(index, place);
    if (!check.ok) return check;
    const sold = bm.offers[index], summary = grantBlackMarketOffer(sold, place);
    if (!summary) return { ok: false, reason: '가방에 넣지 못했습니다.' };
    const price = getBlackMarketOfferPrice(sold);
    game.currencies[price.key] -= price.amount;
    bm.offers[index] = null;
    delete bm.lockedOffers[index];
    return { ok: true, summary, notable: !!(sold.chase || sold.featured) };
}

/** Gives what offer sells: the trade's currency, the rune (as a rune drop gives it), or the gear into the bag. Returns the log's
 * words for it, or '' when the gear found no place. */
function grantBlackMarketOffer(offer, place) {
    if (offer.type === 'exchange') {
        awardCurrency(offer.to, offer.gain);
        return `${ORB_DB[offer.from].name} ${offer.need} → ${ORB_DB[offer.to].name} ${offer.gain}`;
    }
    if (offer.type === 'skillGem') {
        gemDropRewards.grant(game, { kind: 'attack', name: offer.name, awakened: false }, 0);
        return `공격 룬 [${offer.name}]`;
    }
    const item = offer.type === 'baseItem' ? normalizeItem({ ...getBlackMarketBaseItemShape(offer), id: ++itemIdCounter }) : createBlackMarketUniqueItem(offer);
    if (!item || !stowBoughtItem(item, place)) return '';
    game.noti.items = true;
    return offer.type === 'baseItem' ? `제작 베이스 [${item.name}]` : `${offer.featured ? '표적 ' : ''}고유 [${item.name}]`;
}

/** The plain base a base offer sells, with the base lines it showed (no id: the shop card shows it before a sale). */
function getBlackMarketBaseItemShape(offer) {
    const base = BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === offer.name.replace(' 베이스', '') && row.slot === offer.slot)))
        || chooseItemBase(offer.slot, offer.hiddenTier || offer.reqTier);
    const tier = offer.hiddenTier || offer.reqTier || base.reqTier || 1, rolled = Array.isArray(offer.baseStats) && offer.baseStats.length > 0;
    return { slot: base.slot, baseId: base.id, baseName: base.name, name: base.name, rarity: 'normal', itemTier: tier, hiddenTier: tier,
        affixTierCap: BLACK_MARKET_BASE_CRAFT_TIER, baseStats: rolled ? offer.baseStats.map(stat => ({ ...stat })) : rollBaseStats(base, tier), stats: [],
        ...getBlackMarketExceptionalShape(offer, rolled) };
}

/** A base offer's 특출난 베이스 marks, as the bought item keeps them. */
function getBlackMarketExceptionalShape(offer, rolled) {
    const names = Array.isArray(offer.exceptionalStatNames) ? offer.exceptionalStatNames.slice() : [];
    return { exceptionalBase: !!offer.exceptionalBase, exceptionalStatNames: names, exceptionalStatName: names.join(', '),
        exceptionalAllLines: !!(offer.exceptionalBase && rolled && offer.baseStats.every(stat => stat && stat.exceptional)) };
}

/** A unique offer's item, its lines rolled now within the ranges the offer showed, on the offer's base. */
function createBlackMarketUniqueItem(offer) {
    const item = generateUniqueItem(offer.hiddenTier || offer.reqTier, offer.slot, offer.name);
    const base = BASE_ITEM_DB.find(row => row && offer.baseId && row.id === offer.baseId);
    if (item && base) {
        item.baseId = base.id;
        item.baseName = base.name;
        item.baseStats = rollBaseStats(base, offer.hiddenTier || offer.reqTier || base.reqTier || 1);
        clearExceptionalBaseState(item);
        maybeApplyExceptionalBase(item);
    }
    return item;
}

/** The shelf the black market lays its offers on (js/black-market-ui.js): ten columns like the bag's, four rows or more when the
 * bought slots need them. */
const BLACK_MARKET_SHELF = Object.freeze({ columns: 10, rows: 4 });

/** An offer's cells on the shelf: gear takes its bag footprint, a trade or a rune one cell. */
function getBlackMarketOfferSize(offer) {
    return offer.type === 'baseItem' || offer.type === 'unique' ? getEquipmentInventoryFootprint(offer) : { columns: 1, rows: 1 };
}

function blackMarketShelfCells(at, size) {
    const cells = [];
    for (let row = at.row; row < at.row + size.rows; row++) for (let column = at.column; column < at.column + size.columns; column++) cells.push(`${column}:${row}`);
    return cells;
}

/** The offer's own saved place, when it is on the shelf and its cells are still free. */
function keepsBlackMarketPlace(offer, size, taken) {
    const placed = Number.isInteger(offer.column) && Number.isInteger(offer.row) && offer.column >= 0 && offer.row >= 0
        && offer.column + size.columns <= BLACK_MARKET_SHELF.columns;
    return placed && !blackMarketShelfCells(offer, size).some(cell => taken.has(cell));
}

function firstFreeBlackMarketPlace(taken, size) {
    for (let row = 0; ; row++) {
        for (let column = 0; column + size.columns <= BLACK_MARKET_SHELF.columns; column++) {
            if (!blackMarketShelfCells({ column, row }, size).some(cell => taken.has(cell))) return { column, row };
        }
    }
}

/** Gives each offer without a free place of its own (new ones after a refresh or an expansion) the first free place, biggest first,
 * so a sale or a refresh never moves the others (offer.column and offer.row are saved with the offer). Returns the shelf's rows. */
function placeBlackMarketOffers(bm) {
    const taken = new Set(), waiting = [];
    let rows = BLACK_MARKET_SHELF.rows;
    const claim = (offer, size) => {
        blackMarketShelfCells(offer, size).forEach(cell => taken.add(cell));
        rows = Math.max(rows, offer.row + size.rows);
    };
    for (const offer of bm.offers) {
        if (!offer) continue;
        const size = getBlackMarketOfferSize(offer);
        if (keepsBlackMarketPlace(offer, size, taken)) claim(offer, size);
        else waiting.push({ offer, size });
    }
    waiting.sort((a, b) => b.size.rows - a.size.rows || b.size.columns - a.size.columns);
    for (const { offer, size } of waiting) {
        Object.assign(offer, firstFreeBlackMarketPlace(taken, size));
        claim(offer, size);
    }
    return rows;
}

/** The black market's trades for its screen (js/black-market-ui.js), each { ok, reason }-shaped like the NPC shop's (js/npc-shop.js).
 * The functions above stay globals: the stall's audit and the NPC shop's 고유 장비 use the offer rules. */
const blackMarketShop = Object.freeze({
    shelf: BLACK_MARKET_SHELF, state: normalizeBlackMarketState, refresh: refreshBlackMarket, place: placeBlackMarketOffers,
    size: getBlackMarketOfferSize, price: getBlackMarketOfferPrice, check: checkBlackMarketOffer, confirmText: getBlackMarketConfirmText,
    buy: sellBlackMarketOffer, baseItem: getBlackMarketBaseItemShape, lock: lockBlackMarketOffer, track: setBlackMarketPreferredSlot,
    refreshCost: getBlackMarketManualRefreshCost, refreshNow: payBlackMarketRefresh, expandCost: getBlackMarketSlotExpandCost,
    expand: payBlackMarketExpansion, slotCount: getBlackMarketSlotCount, lockCount: getBlackMarketLockCount
});
safeExposeGlobals({ blackMarketShop, refreshBlackMarket });
