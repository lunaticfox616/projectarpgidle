// Item module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.items = {
  get db() { return window.UNIQUE_DB; },
  get orbs() { return window.ORB_DB; },
  get market() { return window.MARKET_EXCHANGES; },
  // TODO: move item crafting/equip/salvage functions from main/ui into here.
};

// Phase-3 extracted equipment/inventory handlers.

let craftingSelectionState = { ref: null, isEquip: false };

const BLACK_MARKET_BASE_SLOT_COUNT = 6;
const BLACK_MARKET_MAX_SLOT_COUNT = 50;
const BLACK_MARKET_MAX_EXTRA_SLOTS = Math.max(0, BLACK_MARKET_MAX_SLOT_COUNT - BLACK_MARKET_BASE_SLOT_COUNT);
const BLACK_MARKET_CHASE_UNIQUE_CHANCE = 0.0016;
const BLACK_MARKET_T20_RARE_BASE_CHANCE = 0.001;
const BLACK_MARKET_MAX_LOCKED_OFFERS = 3;
const BLACK_MARKET_INSIGHT_TARGET = 5;
const BLACK_MARKET_EQUIPMENT_SLOTS = ['무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패'];

function getAverageExplicitAffixTier(items) {
    let tiers = (Array.isArray(items) ? items : []).flatMap(item => {
        if (!item || item.rarity === 'unique') return [];
        return (Array.isArray(item.stats) ? item.stats : [])
            .filter(stat => stat && !stat.encroachedFinal && !stat.encroachedCandidate && !stat.sourceOptionId && Number.isFinite(Number(stat.tier)) && Number(stat.tier) > 0)
            .map(stat => Number(stat.tier));
    });
    return tiers.length ? tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length : 0;
}
safeExposeGlobals({ getAverageExplicitAffixTier });

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
    if (recipe.id === 'm11' && recipe.from === 'divine' && recipe.to === 'chaos') baseGain = 70;
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
        let usesDecimal = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id);
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

function chooseBlackMarketBase(slot, tier) {
    // 일반 드랍의 최종 단계 베이스 가중치(일반 베이스의 1/25)보다 더 낮게 둔다.
    let rareBaseRoll = Math.random() < BLACK_MARKET_T20_RARE_BASE_CHANCE;
    let candidates = BASE_ITEM_DB.filter(base => isBaseEligibleForBlackMarket(base) && base.slot === slot && (base.reqTier || 1) <= (tier + 3));
    if (rareBaseRoll) {
        let rareCandidates = BASE_ITEM_DB.filter(base => isBaseEligibleForBlackMarket(base) && base.slot === slot && (base.reqTier || 1) >= 20);
        if (rareCandidates.length > 0) candidates = rareCandidates;
    }
    if (candidates.length <= 0) candidates = BASE_ITEM_DB.filter(base => isBaseEligibleForBlackMarket(base) && base.slot === slot);
    return candidates.length ? rndChoice(candidates) : chooseItemBase(slot, tier);
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
        let decimal = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id);
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
        return `<div class="tooltip-line" style="color:#9fd6ff;">베이스 옵션 · ${escapeHTML(label)} +${formatValue(stat.id, range.min)}~+${formatValue(stat.id, range.max)}</div>`;
    }).join('');
}

function getBlackMarketUniqueBase(unique, hiddenTier) {
    if (!unique || !Array.isArray(unique.slots) || unique.slots.length <= 0) return null;
    let fixedBaseId = typeof UNIQUE_FIXED_BASE_BY_NAME === 'object' ? UNIQUE_FIXED_BASE_BY_NAME[unique.name] : null;
    let fixedBase = fixedBaseId ? BASE_ITEM_DB.find(row => row && row.id === fixedBaseId) : null;
    if (fixedBase && fixedBase.slot === unique.slots[0]) return fixedBase;
    let tier = Math.max(1, Math.floor(Number(hiddenTier || unique.reqTier) || 1));
    let candidates = BASE_ITEM_DB.filter(base => isBaseEligibleForBlackMarket(base) && base.slot === unique.slots[0] && (base.reqTier || 1) <= tier);
    return candidates.length > 0 ? rndChoice(candidates) : null;
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

function normalizeBlackMarketState() {
    game.blackMarket = (game.blackMarket && typeof game.blackMarket === 'object') ? game.blackMarket : { nextRefreshAt: 0, extraSlots: 0, offers: [], lockedOffers: {} };
    game.blackMarket.extraSlots = Math.max(0, Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.floor(Number(game.blackMarket.extraSlots) || 0)));
    game.blackMarket.offers = Array.isArray(game.blackMarket.offers) ? game.blackMarket.offers.slice(0, BLACK_MARKET_MAX_SLOT_COUNT).map(offer => {
        if (!offer || offer.type !== 'unique') return offer;
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

function runItemStartMoving(force) {
    try {
        let provider = (typeof startMoving === 'function')
            ? startMoving
            : ((typeof window !== 'undefined' && typeof window.startMoving === 'function') ? window.startMoving : null);
        if (provider) return provider(force);
    } catch (e) {
        console.error('startMoving failed:', e);
    }
}

function getCraftSelectionRef() { return craftingSelectionState.ref; }
function isCraftSelectionEquip() { return !!craftingSelectionState.isEquip; }
function clearCraftSelection() { craftingSelectionState.ref = null; craftingSelectionState.isEquip = false; }

function getSelectedCraftItem() {
    if (craftingSelectionState.ref === null) return null;
    if (craftingSelectionState.isEquip) return game.equipment[craftingSelectionState.ref] || null;
    return (game.inventory || []).find(item => item.id === craftingSelectionState.ref) || null;
}

function ensureCraftSelectionValid() {
    if (craftingSelectionState.ref === null) return;
    if (craftingSelectionState.isEquip) {
        if (!game.equipment[craftingSelectionState.ref]) clearCraftSelection();
        return;
    }
    if (!game.inventory.some(item => item.id === craftingSelectionState.ref)) clearCraftSelection();
}

function selectForCrafting(ref, isEquip) {
    craftingSelectionState.ref = ref;
    craftingSelectionState.isEquip = isEquip;
    updateStaticUI();
}

function getEquipCandidateSlots(item) {
    if (!item) return [];
    if (item.slot === '반지') return (typeof getTranscendentVoidPassiveCount === 'function' && getTranscendentVoidPassiveCount('thirdFinger') > 0) ? ['반지1', '반지2', '반지3'] : ['반지1', '반지2'];
    if (item.slot === '장갑') return ['장갑1', '장갑2'];
    let warriorDualTrain = game.ascendClass === 'warrior' && typeof hasKeystone === 'function' && hasKeystone('w3');
    if (item.slot === '무기') return warriorDualTrain ? ['무기', '방패'] : ['무기'];
    return [item.slot];
}

function pickEquipSlot(item, preferredSlot) {
    let candidates = getEquipCandidateSlots(item);
    if (candidates.length === 0) return null;
    if (preferredSlot && candidates.includes(preferredSlot)) return preferredSlot;
    if (item.slot === '반지') {
        if (!game.equipment['반지1']) return '반지1';
        if (!game.equipment['반지2']) return '반지2';
        if ((typeof getTranscendentVoidPassiveCount === 'function' && getTranscendentVoidPassiveCount('thirdFinger') > 0) && !game.equipment['반지3']) return '반지3';
        return null;
    }
    if (item.slot === '장갑') {
        if (!game.equipment['장갑1']) return '장갑1';
        if (!game.equipment['장갑2']) return '장갑2';
        return null;
    }
    if (item.slot === '무기') {
        let warriorDualTrain = game.ascendClass === 'warrior' && typeof hasKeystone === 'function' && hasKeystone('w3');
        if (warriorDualTrain && !preferredSlot) {
            if (game.equipment['무기'] && !game.equipment['방패']) return '방패';
            if (!game.equipment['무기']) return '무기';
            if (!game.equipment['방패']) return '방패';
            let shieldItem = game.equipment['방패'];
            if (shieldItem && shieldItem.slot === '방패') return '방패';
            return null;
        }
    }
    return candidates[0];
}

function isDualSlotItem(slotName) {
    if (slotName === '반지' || slotName === '장갑') return true;
    return slotName === '무기' && game.ascendClass === 'warrior' && typeof hasKeystone === 'function' && hasKeystone('w3');
}

function getDualSlotDisplayLabel(targetSlot) {
    if (targetSlot === '반지1') return '왼쪽 반지';
    if (targetSlot === '반지2') return '오른쪽 반지';
    if (targetSlot === '장갑1') return '왼쪽 장갑';
    if (targetSlot === '장갑2') return '오른쪽 장갑';
    if (targetSlot === '무기') return '주 무기';
    if (targetSlot === '방패') return '방패';
    return targetSlot;
}

function dualSlotBothOccupied(slotName) {
    if (slotName === '반지') return !!(game.equipment['반지1'] && game.equipment['반지2'] && (!(typeof getTranscendentVoidPassiveCount === 'function' && getTranscendentVoidPassiveCount('thirdFinger') > 0) || game.equipment['반지3']));
    if (slotName === '장갑') return !!(game.equipment['장갑1'] && game.equipment['장갑2']);
    return false;
}

function findInventoryIndexById(itemId) {
    return (game.inventory || []).findIndex(item => item && item.id === itemId);
}

function equipItem(idx, preferredSlot) {
    let item = game.inventory[idx];
    if (!item) return;
    let warriorDualTrain = game.ascendClass === 'warrior' && typeof hasKeystone === 'function' && hasKeystone('w3');
    if (item.slot === '무기' && warriorDualTrain && !preferredSlot && game.equipment['무기'] && game.equipment['방패']) {
        openWeaponSlotOverlayByItemId(item.id);
        return;
    }
    if (item.slot === '반지' && !preferredSlot && dualSlotBothOccupied('반지')) {
        openRingSlotOverlayByItemId(item.id);
        return;
    }
    if (item.slot === '장갑' && !preferredSlot && dualSlotBothOccupied('장갑')) {
        openGloveSlotOverlayByItemId(item.id);
        return;
    }
    let targetSlot = pickEquipSlot(item, preferredSlot);
    if (!targetSlot) return;
    if (targetSlot === '방패' && item.slot === '무기' && !warriorDualTrain) {
        addLog('워리어 키스톤 [쌍수 훈련]이 있어야 방패 슬롯에 무기를 장착할 수 있습니다.', 'attack-monster');
        return;
    }
    let old = game.equipment[targetSlot];
    let movedId = item.id;
    game.equipment[targetSlot] = item;
    if (old) game.inventory[idx] = old;
    else game.inventory.splice(idx, 1);
    if (!isCraftSelectionEquip() && getCraftSelectionRef() === movedId) {
        craftingSelectionState.ref = targetSlot;
        craftingSelectionState.isEquip = true;
    }
    hideItemTooltip();
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function equipItemById(itemId, preferredSlot) {
    let idx = findInventoryIndexById(itemId);
    if (idx < 0) return false;
    equipItem(idx, preferredSlot);
    return true;
}

function equipSelectedCraftInventoryItem() {
    if (isCraftSelectionEquip()) return false;
    let itemId = getCraftSelectionRef();
    if (itemId === null) return false;
    return equipItemById(itemId);
}

function unequipItem(slot) {
    let item = game.equipment[slot];
    if (!item || game.inventory.length >= getInventoryLimit()) return;
    game.inventory.push(item);
    game.equipment[slot] = null;
    if (isCraftSelectionEquip() && getCraftSelectionRef() === slot) {
        craftingSelectionState.ref = item.id;
        craftingSelectionState.isEquip = false;
    }
    normalizeSupportLoadout(true);
    updateStaticUI();
}

function salvageItemById(itemId) {
    let idx = findInventoryIndexById(itemId);
    if (idx < 0) return false;
    salvageItem(idx);
    return true;
}

function toggleItemLockById(itemId) {
    let idx = findInventoryIndexById(itemId);
    if (idx < 0) return false;
    let item = game.inventory[idx];
    if (!item) return false;
    item.locked = !item.locked;
    addLog(`${item.locked ? '🔒 잠금' : '🔓 잠금 해제'}: [${item.name}]`, 'loot-normal');
    updateStaticUI();
    return true;
}

function hasActiveBeehiveRuntimeState(b) {
    if (!b || !b.inRun) return false;
    let hasReturnZone = b.returnZoneId !== undefined && b.returnZoneId !== null;
    let hasStartedRoute = Math.max(0, Math.floor(b.branchStep || 0)) > 0;
    return !!b.awaitingClear
        || (!!b.pendingChoice && (hasReturnZone || hasStartedRoute))
        || !!b.queenActive
        || !!b.pendingWaveReward
        || (Array.isArray(b.pendingQueenRewards) && b.pendingQueenRewards.length > 0)
        || (game.currentZoneId === 'beehive_run' && (game.enemies || []).some(enemy => enemy && enemy.hp > 0));
}

function clearBeehiveRuntimeState(b) {
    if (!b) return;
    b.inRun = false;
    b.branchStep = 0;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = [];
    b.queenActive = false;
}

function reconcileBeehiveRunState() {
    let b = game && game.beehive ? game.beehive : null;
    if (!b || !b.inRun) return false;
    if (game.currentZoneId === 'beehive_run' && hasActiveBeehiveRuntimeState(b)) return true;
    let returnZoneId = b.returnZoneId !== undefined && b.returnZoneId !== null ? b.returnZoneId : game.maxZoneId;
    clearBeehiveRuntimeState(b);
    b.returnZoneId = null;
    if (game.currentZoneId === 'beehive_run') game.currentZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : 0;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.combatHalted = false;
    return false;
}

function isBeehiveRunLockedForMapTravel() {
    let b = game && game.beehive ? game.beehive : null;
    if (!b || !b.inRun) return false;
    // Only a real active beehive run should lock travel/progress. Older saves can
    // retain partial beehive flags; reconcile them instead of leaving maps stuck at 0%.
    return reconcileBeehiveRunState() && game.currentZoneId === 'beehive_run';
}

function warnBeehiveMapTravelBlocked() {
    if (typeof addLog === 'function') addLog('벌집 원정 중에는 [던전 포기] 전까지 다른 지역으로 이동할 수 없습니다.', 'attack-monster');
    return true;
}

// ── 시간의 균열: 제단 배치/회수 + 융합 정산 ──────────────────────────────
// 흐름: 과거 클리어(altarOpen) → 같은 부위 고유 1개·희귀 1개 배치 → 미래 클리어 → resolveTimeRiftFusion.
function setTimeRiftPressure(delta) {
    let rift = ensureTimeRiftState();
    rift.pressure = Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, rift.pressure + Math.floor(delta || 0)));
    updateStaticUI();
}

function placeItemOnTimeAltar() {
    let rift = ensureTimeRiftState();
    if (!rift.altarOpen) return addLog('먼저 시간의 균열(과거)을 클리어해 제단을 열어야 합니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('제단에 올릴 아이템을 인벤토리에서 먼저 선택하세요.', 'attack-monster');
    if (isCraftSelectionEquip()) return addLog('장착 중인 장비는 제단에 올릴 수 없습니다. 해제 후 올려주세요.', 'attack-monster');
    if (item.fusedRelic) return addLog('이미 융합된 유물은 다시 시간을 건널 수 없습니다.', 'attack-monster');
    if (item.corrupted) return addLog('타락한 아이템은 시간의 흐름을 거부합니다.', 'attack-monster');
    if (item.loopSealed) return addLog('봉인된 장비는 제단에 올릴 수 없습니다.', 'attack-monster');
    if (item.rarity !== 'unique' && item.rarity !== 'rare') return addLog('고유 또는 희귀 아이템만 제단에 올릴 수 있습니다.', 'attack-monster');
    let slotKey = item.rarity === 'unique' ? 'altarUnique' : 'altarRare';
    if (rift[slotKey]) return addLog(`제단의 ${item.rarity === 'unique' ? '고유' : '희귀'} 자리가 이미 차 있습니다. 회수 후 다시 올려주세요.`, 'attack-monster');
    let other = item.rarity === 'unique' ? rift.altarRare : rift.altarUnique;
    if (other && String(other.slot || '') !== String(item.slot || '')) return addLog(`두 아이템은 같은 부위여야 융합됩니다. (제단: ${other.slot} / 선택: ${item.slot})`, 'attack-monster');
    game.inventory = (game.inventory || []).filter(row => row && row.id !== item.id);
    rift[slotKey] = item;
    clearCraftSelection();
    addLog(`⏳ [${item.name}]을(를) 과거의 제단에 올렸습니다.${rift.altarUnique && rift.altarRare ? ' 두 자리가 모두 찼습니다 — 미래로 건너가세요.' : ''}`, 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

function retrieveTimeAltarItems() {
    let rift = ensureTimeRiftState();
    if (!rift.altarUnique && !rift.altarRare) return addLog('제단이 비어 있습니다.', 'attack-monster');
    let needSlots = (rift.altarUnique ? 1 : 0) + (rift.altarRare ? 1 : 0);
    if ((game.inventory || []).length + needSlots > getInventoryLimit()) return addLog(`인벤토리 공간이 부족합니다. (필요: ${needSlots}칸)`, 'attack-monster');
    // guaranteedKeep: 회수 아이템이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    if (rift.altarUnique) { addItemToInventory(rift.altarUnique, { guaranteedKeep: true }); rift.altarUnique = null; }
    if (rift.altarRare) { addItemToInventory(rift.altarRare, { guaranteedKeep: true }); rift.altarRare = null; }
    addLog('⏳ 제단의 아이템을 회수했습니다.', 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

// 미래 클리어 시 호출: 등급 판정 → 희귀의 추가 옵션을 (유실분 제외하고) 고유에 이식.
function resolveTimeRiftFusion() {
    let rift = ensureTimeRiftState();
    if (!rift.altarUnique || !rift.altarRare) return null;
    // 제단을 비우기 전에 결과물이 들어갈 공간부터 확보한다 — 실패 시 제단을 그대로 유지하고
    // 재도전(공간 확보 후 미래 재클리어)할 수 있게 한다.
    if ((game.inventory || []).length >= getInventoryLimit()) {
        addLog('⌛ 융합이 보류되었습니다: 인벤토리 공간이 필요합니다. (제단은 유지됩니다 — 공간 확보 후 미래를 다시 클리어하세요)', 'attack-monster');
        return null;
    }
    let odds = getTimeRiftFusionOdds(rift.pressure);
    let roll = Math.random();
    let grade = roll < odds.perfect ? 'perfect' : (roll < odds.perfect + odds.normal ? 'normal' : 'unstable');
    let lost = grade === 'perfect' ? 0 : (grade === 'normal' ? 1 : 2);
    let fused = JSON.parse(JSON.stringify(rift.altarUnique));
    itemIdCounter++;
    fused.id = itemIdCounter;
    let rareStats = Array.isArray(rift.altarRare.stats) ? JSON.parse(JSON.stringify(rift.altarRare.stats)) : [];
    for (let i = 0; i < lost && rareStats.length > 0; i++) rareStats.splice(Math.floor(Math.random() * rareStats.length), 1);
    fused.stats = Array.isArray(fused.stats) ? fused.stats : [];
    rareStats.forEach(stat => { if (stat) { stat.fusedFromRare = true; fused.stats.push(stat); } });
    fused.fusedRelic = true;
    fused.fusionGrade = grade;
    fused.fusedRareName = rift.altarRare.name || '';
    rift.altarUnique = null;
    rift.altarRare = null;
    rift.altarOpen = false;
    // guaranteedKeep: 융합 결과물이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    addItemToInventory(fused, { guaranteedKeep: true });
    return { fused: fused, grade: grade, lost: lost, inherited: rareStats.length };
}

function prepareMeteorEncounterEntry(returnZoneId) {
    let st = ensureStarWedgeState();
    st.activeMeteorTier = Math.max(1, Math.floor(st.skyRiftMinTier || 1));
    st.meteorReturnZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : null;
    st.skyRiftReady = false;
    st.skyRiftGauge = Math.max(0, Math.floor(st.skyRiftCarryGauge || 0));
    st.skyRiftCarryGauge = 0;
    st.skyRiftMinTier = null;
}

function changeZone(id) {
    if (game.pendingLoopReady) return addLog('⏸️ 루프 진행 대기 중에는 사냥터로 이동할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.', 'attack-monster');
    if (isBeehiveRunLockedForMapTravel()) return warnBeehiveMapTravelBlocked();
    game.inTicketBossFight = false;
    if (typeof id === 'number' && id > game.maxZoneId) return;
    if (id === METEOR_FALL_ZONE_ID) {
        let st = ensureStarWedgeState();
        if (!st.unlocked) return addLog('운석 낙하 지점은 아직 잠겨 있습니다.', 'attack-monster');
        if (!st.skyRiftReady) return addLog('하늘의 균열 게이지가 100%가 되어야 입장 가능합니다.', 'attack-monster');
        prepareMeteorEncounterEntry(null);
    }
    let zone = getZone(id);
    if (!zone) return addLog('이동할 수 없는 지역입니다.', 'attack-monster');
    if (zone.type === 'seasonBoss') {
        if ((game.season || 1) < (zone.reqSeason || 2)) return addLog(zone.rivalBlade ? '버려진 날붙이들은 루프 31부터 당신을 찾아옵니다.' : '아직 뿌리 보스가 잠겨 있습니다.', 'attack-monster');
        if (Array.isArray(zone.requiresRivals)) {
            let killedRivals = (game.loopProgressCurrent && Array.isArray(game.loopProgressCurrent.specialBosses)) ? game.loopProgressCurrent.specialBosses : [];
            let remainingRivals = zone.requiresRivals.filter(rivalId => !killedRivals.includes(rivalId)).length;
            if (remainingRivals > 0) return addLog(`완성작은 이번 루프에 다섯 날을 모두 꺾어야 모습을 드러냅니다. (남은 날: ${remainingRivals}개)`, 'attack-monster');
        }
        if (Array.isArray(zone.requiresCosmosBosses)) {
            let clearedBosses = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.bossClears)) ? game.cosmosAtlas.bossClears : [];
            let remainingBosses = zone.requiresCosmosBosses.filter(bossId => !clearedBosses.includes(bossId)).length;
            if (remainingBosses > 0) return addLog(`잔향체는 이번 루프에 다섯 은하 보스를 모두 꺾어야 모습을 드러냅니다. (남은 은하 보스: ${remainingBosses}개)`, 'attack-monster');
        }
        if ((game.currencies[zone.key] || 0) <= 0) return addLog(`입장 열쇠(${ORB_DB[zone.key].name})가 필요합니다.`, 'attack-monster');
        game.currencies[zone.key]--;
        game.inTicketBossFight = true;
    }
    if (zone.type === 'timeRift') {
        let rift = ensureTimeRiftState();
        if ((game.season || 1) < TIME_RIFT_UNLOCK_LOOP) return addLog(`시간의 균열은 루프 ${TIME_RIFT_UNLOCK_LOOP}부터 열립니다.`, 'attack-monster');
        if (zone.riftPhase === 'future' && (!rift.altarUnique || !rift.altarRare)) return addLog('미래로 건너가려면 먼저 과거의 제단에 고유 1개·희귀 1개를 올려야 합니다.', 'attack-monster');
    }
    if (id === CHAOS_REALM_ZONE_ID) {
        let realm = ensureChaosRealmState();
        if (!realm.unlocked) return addLog('혼돈계는 나무꾼에게 10% 이상 피해를 준 전투 종료 시 해금됩니다.', 'attack-monster');
        if (!canEnterChaosRealm()) return addLog('혼돈계 입장은 이번 루프에서 혼돈 20을 클리어해야 가능합니다.', 'attack-monster');
        let maxFloor = Math.max(1, Math.floor(realm.highestFloor || 1));
        realm.currentFloor = Math.max(1, Math.min(maxFloor, Math.floor(realm.currentFloor || 1)));
    }
    if (id === LABYRINTH_ZONE_ID) {
        if ((game.season || 1) < 3) return addLog('고대 미궁은 루프3부터 개방됩니다.', 'attack-monster');
        if ((game.maxZoneId || 0) < 5) return addLog('액트 5를 먼저 클리어해야 미궁에 입장할 수 있습니다.', 'attack-monster');
    }
    if (typeof id === 'number' && id >= ABYSS_START_ZONE_ID) {
        let depth = Math.max(1, Math.floor(getAbyssDepthFromZoneId(id) || 1));
        game.abyssEndlessDepth = depth;
        game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
        if (depth >= 20 && !game.abyssUnlockedDepths.includes(depth)) game.abyssUnlockedDepths.push(depth);
    }
    game.currentZoneId = id;
    game.killsInZone = 0;
    addLog(`🗺️ ${zone.name} 이동`, "season-up");
    runItemStartMoving(true);
    updateStaticUI();
}


safeExposeGlobals({ selectForCrafting, equipItem, equipItemById, equipSelectedCraftInventoryItem, unequipItem, salvageItemById, toggleItemLockById, getSelectedCraftItem, getCraftSelectionRef, isCraftSelectionEquip, clearCraftSelection, ensureCraftSelectionValid, hasActiveBeehiveRuntimeState, clearBeehiveRuntimeState, reconcileBeehiveRunState, isBeehiveRunLockedForMapTravel, warnBeehiveMapTravelBlocked });

// Phase-3 extracted market/crafting service handlers.
async function marketResetPassiveTreeByDivine() {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 패시브를 초기화할 수 없습니다.', 'attack-monster');
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.divine || 0) < 1) return addLog('신성한 오브가 부족합니다.', 'attack-monster');
    let spentNodes = Array.isArray(game.passives) ? game.passives.length : 0;
    if (spentNodes <= 0) return addLog('초기화할 패시브 노드가 없습니다.', 'attack-monster');
    let passiveSnapshot = game.passives.slice();
    if (!await requestGameConfirmation(`신성한 오브 1개를 사용해 패시브 트리를 초기화하고 포인트 ${spentNodes}점을 반환합니다.`, {
        title: '패시브 트리 전체 초기화',
        tone: 'danger',
        confirmLabel: '초기화'
    })) return;
    if (game.woodsmanBuildLock || (game.currencies.divine || 0) < 1 || !Array.isArray(game.passives)
        || game.passives.length !== passiveSnapshot.length || game.passives.some((nodeId, index) => nodeId !== passiveSnapshot[index])) {
        return addLog('확인 중 패시브 또는 재화 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    }
    game.currencies.divine -= 1;
    game.passives = [];
    game.passivePoints += spentNodes;
    calculateReachableNodes();
    refreshPassiveVisibility();
    addLog(`🧠 패시브 트리 초기화 완료! 포인트 ${spentNodes}점 반환`, 'season-up');
    updateStaticUI();
}

async function marketAnnulSelectedStat(statIdx) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.', 'attack-monster');
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 제작 대상 장비를 선택하세요.', 'attack-monster');
    let removable = typeof getAnnulmentRemovableStats === 'function'
        ? getAnnulmentRemovableStats(item)
        : (Array.isArray(item.stats) ? item.stats.map((stat, index) => ({ stat, index })).filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && !row.stat.encroachedFinal && !row.stat.unremovable) : []);
    if (item.rarity === 'normal' || removable.length <= 0) return addLog('소멸시킬 수 있는 옵션이 없습니다. 보호된 옵션은 제거할 수 없습니다.', 'attack-monster');
    if ((game.currencies.divine || 0) < 2) return addLog('신성한 오브가 부족합니다. (필요: 2)', 'attack-monster');
    let idx = Math.floor(Number(statIdx));
    let selected = removable.find(row => row.index === idx);
    if (!selected) return addLog('제거할 수 있는 옵션을 선택하세요. 밀랍·균열·잠식으로 보호된 옵션은 유지됩니다.', 'attack-monster');
    let target = selected.stat;
    let targetName = target.statName || getStatName(target.id);
    if (!await requestGameConfirmation(`신성한 오브 2개를 소모하여 [${item.name}]의 "${targetName}" 옵션을 제거합니다.`, {
        title: '옵션 소멸',
        tone: 'danger',
        confirmLabel: '옵션 제거'
    })) return;
    if (game.woodsmanBuildLock || getSelectedCraftItem() !== item || !Array.isArray(item.stats) || item.stats[idx] !== target || (game.currencies.divine || 0) < 2) {
        return addLog('확인 중 장비 또는 재화 상태가 변경되어 옵션 소멸을 취소했습니다.', 'attack-monster');
    }
    game.currencies.divine -= 2;
    item.stats.splice(idx, 1);
    updateItemName(item);
    addLog(`💥 옵션 소멸 완료: [${item.name}] - ${targetName}`, 'loot-unique');
    updateStaticUI();
}

async function marketExpandInventoryByDivine() {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    let cost = getMarketInventoryExpandCost();
    if ((game.currencies.divine || 0) < cost) return addLog(`신성한 오브가 부족합니다. (필요: ${cost})`, 'attack-monster');
    if (!await requestGameConfirmation(`신성한 오브 ${cost}개를 소모하여 인벤토리를 영구히 5칸 확장합니다.`, {
        title: '인벤토리 영구 확장',
        confirmLabel: '확장'
    })) return;
    if (getMarketInventoryExpandCost() !== cost || (game.currencies.divine || 0) < cost) return addLog('확인 중 확장 비용 또는 재화가 변경되어 취소했습니다.', 'attack-monster');
    game.currencies.divine -= cost;
    game.inventoryExpandLevel = Math.max(0, Math.floor(game.inventoryExpandLevel || 0)) + 1;
    addLog(`🎒 인벤토리 영구 확장 완료! 현재 최대 칸: ${getInventoryLimit()}`, 'loot-unique');
    updateStaticUI();
}

async function marketExpandJewelInventoryByDivine() {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    if ((game.season || 1) < 5) return addLog('주얼 해금 후 이용할 수 있습니다.', 'attack-monster');
    let cost = getJewelMarketExpandCost();
    if ((game.currencies.divine || 0) < cost) return addLog(`신성한 오브가 부족합니다. (필요: ${cost})`, 'attack-monster');
    if (!await requestGameConfirmation(`신성한 오브 ${cost}개를 소모하여 주얼 인벤토리를 영구히 5칸 확장합니다.\n이 확장은 루프 종료 후에도 유지됩니다.`, {
        title: '주얼 인벤토리 영구 확장',
        confirmLabel: '확장'
    })) return;
    if (getJewelMarketExpandCost() !== cost || (game.currencies.divine || 0) < cost) return addLog('확인 중 확장 비용 또는 재화가 변경되어 취소했습니다.', 'attack-monster');
    game.currencies.divine -= cost;
    game.jewelInventoryExpandLevel = Math.max(0, Math.floor(game.jewelInventoryExpandLevel || 0)) + 1;
    addLog(`💠 주얼 인벤토리 영구 확장 완료! 현재 최대 칸: ${getJewelInventoryLimit()}`, 'loot-unique');
    updateStaticUI();
}

function getBaseDefenseProfile(base) {
    let ids = new Set((base.baseStats || []).map(stat => stat.id));
    return ['armor', 'evasion', 'energyShield'].filter(id => ids.has(id)).join('+');
}
function getBaseSecondaryStatSignature(base, slot) {
    let coreStatsBySlot = {
        무기: new Set(['flatDmg']),
        투구: new Set(['flatHp', 'armor', 'evasion', 'energyShield']),
        갑옷: new Set(['flatHp', 'armor', 'evasion', 'energyShield']),
        장갑: new Set(['flatHp', 'armor', 'evasion', 'energyShield', 'aspd']),
        신발: new Set(['flatHp', 'armor', 'evasion', 'energyShield', 'move']),
        목걸이: new Set([]),
        반지: new Set([]),
        허리띠: new Set(['flatHp']),
        방패: new Set(['armor', 'evasion', 'energyShield', 'baseBlockChance'])
    };
    let coreSet = coreStatsBySlot[slot] || new Set();
    return (base.baseStats || [])
        .map(stat => stat.id)
        .filter(statId => !coreSet.has(statId))
        .sort();
}
// Weapons all share the '무기' slot but belong to distinct archetypes (summon/projectile/spell/melee).
// Base upgrades must stay within the same archetype, otherwise e.g. a projectile weapon could
// upgrade into a summoner weapon.
function getWeaponBaseArchetype(base) {
    let ids = (base.baseStats || []).map(stat => stat.id);
    if (ids.some(id => id.startsWith('summon'))) return 'summon';
    if (ids.some(id => id.startsWith('projectile'))) return 'projectile';
    if (ids.some(id => id.startsWith('spell'))) return 'spell';
    return 'melee';
}
// 모든 슬롯에 적용되는 빌드 계열. 무기는 기존 무기 아키타입을 따르고,
// 그 외 슬롯은 소환 스탯을 가진 베이스를 'summon' 계열로 분리한다.
// 이렇게 해야 소환사 반지가 일반 반지 체인에 섞이지 않는다.
function getBaseBuildArchetype(base) {
    if (!base) return 'generic';
    if (base.slot === '무기') return getWeaponBaseArchetype(base);
    let ids = (base.baseStats || []).map(stat => stat.id);
    if (ids.some(id => id.startsWith('summon'))) return 'summon';
    return 'generic';
}
function getBaseUpgradeCandidates(currentBase) {
    let currentProfile = getBaseDefenseProfile(currentBase);
    let currentSecondarySignature = getBaseSecondaryStatSignature(currentBase, currentBase.slot);
    let currentArchetype = getBaseBuildArchetype(currentBase);
    let isArmorSlot = ['투구','갑옷','장갑','신발','방패'].includes(currentBase.slot);
    let candidates = BASE_ITEM_DB
        .filter(base => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase)
        .filter(base => isArmorSlot ? getBaseDefenseProfile(base) === currentProfile : true)
        .filter(base => getBaseBuildArchetype(base) === currentArchetype)
        .sort((a,b)=>a.reqTier-b.reqTier);
    // 방어구는 방어 프로파일(방어도/회피/보호막)이 정체성이다. 저항 같은 부가 옵션은
    // 부수적이므로, 같은 프로파일끼리 티어 순서대로 이어 준다(저항이 달라도 무방).
    if (isArmorSlot) return candidates;
    // 무기/목걸이/반지/허리띠는 부가 옵션 자체가 정체성이다.
    if (currentSecondarySignature.length > 0) {
        // 1) 부가 옵션 정체성 보존: 현재 부가 옵션을 모두 유지하는(상위 집합) 후보를 우선.
        //    (예: 물리 피해 감소 허리띠가 카오스 저항 허리띠로 바뀌면 안 된다.)
        let preserving = candidates.filter(base => {
            let signature = new Set(getBaseSecondaryStatSignature(base, base.slot));
            return currentSecondarySignature.every(id => signature.has(id));
        });
        if (preserving.length > 0) return preserving;
        // 2) 완전히 다른 부옵션을 가진 베이스끼리는 한 체인으로 묶지 않는다 —
        //    최소한 하나의 부가 옵션을 공유하는 후보만 허용한다.
        return candidates.filter(base => {
            let signature = new Set(getBaseSecondaryStatSignature(base, base.slot));
            return currentSecondarySignature.some(id => signature.has(id));
        });
    }
    return candidates;
}
// 업그레이드로 이어진 베이스들을 하나의 체인으로 보고, 각 베이스가 그 체인에서 몇 단계인지 계산한다.
// step = 아래(저티어)에서부터의 위치(1부터), total = 그 베이스를 지나는 가장 긴 체인의 길이.
// 분기 합류(여러 하위가 같은 상위로 업그레이드되는 경우)는 가장 긴 경로를 기준으로 한다.
let _baseChainInfoCache = null;
function buildBaseChainInfoCache() {
    _baseChainInfoCache = {};
    let pool = BASE_ITEM_DB.filter(b => b && b.id && !b.dropOnly && !b.realmBase);
    let succ = {};
    let preds = {};
    pool.forEach(b => { preds[b.id] = []; });
    pool.forEach(b => {
        let cands = getBaseUpgradeCandidates(b);
        let next = (cands && cands.length > 0) ? cands[0] : null;
        succ[b.id] = next ? next.id : null;
        if (next && preds[next.id]) preds[next.id].push(b.id);
    });
    let upMemo = {};
    function up(id) {
        if (upMemo[id] != null) return upMemo[id];
        upMemo[id] = 1; // 사이클 가드(실제로는 reqTier가 엄격히 증가해 사이클 없음)
        let s = succ[id];
        return (upMemo[id] = s ? 1 + up(s) : 1);
    }
    let downMemo = {};
    function down(id) {
        if (downMemo[id] != null) return downMemo[id];
        downMemo[id] = 1;
        let best = 0;
        (preds[id] || []).forEach(p => { best = Math.max(best, down(p)); });
        return (downMemo[id] = best + 1);
    }
    pool.forEach(b => {
        let d = down(b.id);
        let u = up(b.id);
        _baseChainInfoCache[b.id] = { step: d, total: d + u - 1 };
    });
}
function getBaseChainInfo(base) {
    if (!base || !base.id) return null;
    if (!_baseChainInfoCache) buildBaseChainInfoCache();
    return _baseChainInfoCache[base.id] || null;
}
function getItemBaseChainInfo(item) {
    if (!item) return null;
    let base = BASE_ITEM_DB.find(b => b && item.baseId && b.id === item.baseId)
        || BASE_ITEM_DB.find(b => b && b.name === item.baseName && b.slot === item.slot);
    if (!base) return null;
    return getBaseChainInfo(base);
}
function upgradeSelectedItemBase() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 제작 대상 장비를 선택하세요.', 'attack-monster');
    let currentBase = BASE_ITEM_DB.find(base => base && base.id === item.baseId) || BASE_ITEM_DB.find(base => base && base.name === item.baseName && base.slot === item.slot);
    if (!currentBase) return addLog('현재 베이스 정보를 찾을 수 없습니다.', 'attack-monster');
    if (currentBase.realmBase) return addLog('계 전용 베이스 장비는 베이스 업그레이드로 변경할 수 없습니다.', 'attack-monster');
    let candidates = getBaseUpgradeCandidates(currentBase);
    let nextBase = candidates[0];
    if (!nextBase) return addLog('해당 계열의 다음 베이스가 없습니다.', 'attack-monster');
    let nextChainInfo = typeof getBaseChainInfo === 'function' ? getBaseChainInfo(nextBase) : null;
    let nextStep = nextChainInfo ? nextChainInfo.step : 1;
    let costChaos = Math.max(5, 3 + Math.floor((nextBase.reqTier - currentBase.reqTier) * 2.5));
    // 신성 비용은 도착 단계 기준: 6단계(최종) 5개, 5단계 1개, 그 외 0개.
    let costDivine = nextStep >= 6 ? 5 : (nextStep === 5 ? 1 : 0);
    game.pendingBaseUpgrade = { itemId: item.id, nextBaseId: nextBase.id, costChaos: costChaos, costDivine: costDivine };
    let titleEl = document.getElementById('base-upgrade-title');
    let bodyEl = document.getElementById('base-upgrade-body');
    if (titleEl) titleEl.innerText = `${currentBase.name} → ${nextBase.name}`;
    if (bodyEl) {
        let curStats = (currentBase.baseStats || []).map(stat => `${getStatName(stat.id)} +${formatValue(stat.id, stat.baseMin || stat.base)}~${formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        let nextStats = (nextBase.baseStats || []).map(stat => `${getStatName(stat.id)} +${formatValue(stat.id, stat.baseMin || stat.base)}~${formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        bodyEl.innerHTML = `현재 베이스: <strong>${currentBase.name}</strong><br><span style="color:#9bb2c9;">${curStats || '없음'}</span><br><br>업그레이드 베이스: <strong>${nextBase.name}</strong><br><span style="color:#ffd08a;">${nextStats || '없음'}</span><br><br>비용: 카오스 오브 ${costChaos}${costDivine > 0 ? ` + 신성한 오브 ${costDivine}` : ''}`;
    }
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeBaseUpgradeOverlay() {
    game.pendingBaseUpgrade = null;
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.classList.remove('active');
}

function confirmSelectedItemBaseUpgrade() {
    let pending = game.pendingBaseUpgrade;
    if (!pending) return;
    let item = (game.inventory || []).find(v => v && v.id === pending.itemId);
    if (!item) {
        let equipMatch = Object.entries(game.equipment || {}).find(([, equipped]) => equipped && equipped.id === pending.itemId);
        if (equipMatch) item = equipMatch[1];
    }
    if (!item) { closeBaseUpgradeOverlay(); return addLog('대상 장비를 찾을 수 없습니다.', 'attack-monster'); }
    if ((game.currencies.chaos || 0) < (pending.costChaos || 0)) return addLog(`카오스 오브가 부족합니다. (필요: ${pending.costChaos})`, 'attack-monster');
    if ((game.currencies.divine || 0) < (pending.costDivine || 0)) return addLog(`신성한 오브가 부족합니다. (필요: ${pending.costDivine})`, 'attack-monster');
    game.currencies.chaos -= (pending.costChaos || 0);
    game.currencies.divine = Math.max(0, (game.currencies.divine || 0) - (pending.costDivine || 0));
    let currentBase = BASE_ITEM_DB.find(base => base && base.id === item.baseId) || null;
    let nextBase = BASE_ITEM_DB.find(base => base && base.id === pending.nextBaseId);
    if (!nextBase) return closeBaseUpgradeOverlay();
    item.baseId = nextBase.id;
    item.baseName = nextBase.name;
    if (item.rarity !== 'unique') item.name = nextBase.name;
    item.itemTier = Math.max(item.itemTier || 1, nextBase.reqTier || 1);
    item.baseStats = rollBaseStats(nextBase, nextBase.reqTier || 1);
    addLog(`🛠️ 베이스 업그레이드: ${(currentBase && currentBase.name) || '기존'} → ${nextBase.name} (카오스 ${pending.costChaos}${pending.costDivine ? ` + 신성 ${pending.costDivine}` : ''})`, 'loot-magic');
    closeBaseUpgradeOverlay();
    updateStaticUI();
}

function createBlackMarketUniqueOffer(unique, tier, options) {
    if (!unique) return null;
    let req = unique.reqTier || tier;
    let uniqueBase = getBlackMarketUniqueBase(unique, req);
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
        priceKey:'divine',
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
        let base = chooseBlackMarketBase(slot, tier);
        let hiddenTier = Math.max(tier, base.reqTier || tier);
        let chainInfo = getBlackMarketBaseChainInfo(base);
        let rolledBase = maybeApplyBlackMarketExceptionalBaseStats(rollBlackMarketBaseStats(base, hiddenTier));
        // 제작 가능 옵션 단계는 현재 지역(hiddenTier)을 따르므로 가격도 원본 베이스 요구 티어가
        // 아니라 실제 제공 티어를 기준으로 계산한다. 저티어 베이스를 고단계 제작대로 헐값에
        // 구매하는 경제 우회를 막되, 직접 드랍보다 접근성은 유지한다.
        let price = Math.max(2, Math.ceil(hiddenTier * 0.45) + 2 + (rolledBase.exceptionalBase ? 4 : 0));
        return { type:'baseItem', name:`${base.name} 베이스`, slot: base.slot, baseId: base.id, baseName: base.name, hiddenTier:hiddenTier, priceKey:'chaos', price:price, baseStats: rolledBase.baseStats, exceptionalBase: rolledBase.exceptionalBase, exceptionalStatNames: rolledBase.names, rareT20Base: (base.reqTier || 1) >= 20, baseChainStep: chainInfo && chainInfo.step, baseChainTotal: chainInfo && chainInfo.total };
    }
    if (roll < 0.9) {
        let missing = Object.keys(SKILL_DB).filter(k => SKILL_DB[k].isGem && !hasSkillGemOwned(k));
        if (missing.length>0) return { type:'skillGem', name:rndChoice(missing), priceKey:'chaos', price:5 };
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
    let effectLine = effect ? `<div class="tooltip-line" style="color:#d7b8ff;">✨ 고유 효과: ${escapeHTML(effect)}</div>` : '';
    let statLines = (Array.isArray(sourceStats) ? sourceStats : []).map(stat => {
        let statId = stat.id;
        let min = Number.isFinite(Number(stat.min)) ? Number(stat.min) : Number(stat.base || stat.val || 0);
        let max = Number.isFinite(Number(stat.max)) ? Number(stat.max) : min;
        let label = stat.statName || getStatName(statId);
        return `<div class="tooltip-line" style="color:#ffd98a;">고유 옵션 · ${escapeHTML(label)} +${formatValue(statId, min)}~+${formatValue(statId, max)}</div>`;
    });
    return effectLine + (statLines.join('') || '<div class="tooltip-line">고유 옵션 보유</div>');
}

function getBlackMarketOfferPurchaseState(offer) {
    if (!offer) return { canBuy: false, reason: '품절' };
    if (offer.type === 'exchange') {
        let have = Math.max(0, Math.floor((game.currencies && game.currencies[offer.from]) || 0));
        let need = Math.max(1, Math.floor(Number(offer.need) || 1));
        return {
            canBuy: have >= need,
            reason: have >= need ? `교환 가능 · ${have}/${need}` : `재화 부족 · ${have}/${need}`
        };
    }
    let priceKey = offer.priceKey;
    let price = Math.max(0, Math.floor(Number(offer.price) || 0));
    let have = Math.max(0, Math.floor((game.currencies && game.currencies[priceKey]) || 0));
    if (offer.type === 'skillGem' && typeof hasSkillGemOwned === 'function' && hasSkillGemOwned(offer.name)) {
        return { canBuy: false, reason: '이미 보유한 젬' };
    }
    if ((offer.type === 'baseItem' || offer.type === 'unique')
        && Array.isArray(game.inventory)
        && game.inventory.length >= getInventoryLimit()) {
        return { canBuy: false, reason: `인벤토리 가득 참 · ${game.inventory.length}/${getInventoryLimit()}` };
    }
    return {
        canBuy: have >= price,
        reason: have >= price ? `구매 가능 · ${have}/${price}` : `재화 부족 · ${have}/${price}`
    };
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
        return `<div class="tooltip-title">젬: ${offer.name}</div><div class="tooltip-line">${skill.desc || '미보유 공격 젬을 획득합니다.'}</div>`;
    }
    if (offer.type === 'baseItem') {
        let base = BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === String(offer.name || '').replace(' 베이스','') && row.slot === offer.slot)));
        let sourceStats = Array.isArray(offer.baseStats) && offer.baseStats.length > 0 ? offer.baseStats : (base && base.baseStats);
        let chainLabel = offer && offer.baseChainStep && offer.baseChainTotal ? `${Math.floor(offer.baseChainStep)}/${Math.floor(offer.baseChainTotal)}` : '';
        let chainLine = chainLabel ? `<div class="tooltip-line" style="color:#9fd6ff;">베이스 체인 ${chainLabel}</div>` : '';
        let rareLine = offer.rareT20Base ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">T20 희귀 베이스</div>' : '';
        let exLine = offer.exceptionalBase ? '<div class="tooltip-line" style="color:#ffb454; font-weight:800;">특출난 베이스</div>' : '';
        let comparison = getBlackMarketBaseComparison(offer);
        let comparisonLine = comparison ? `<div class="tooltip-line" style="color:${comparison.tone === 'upgrade' || comparison.tone === 'empty' ? '#8fd9a7' : (comparison.tone === 'downgrade' ? '#d99b91' : '#9fb4d1')};">장착 비교 · ${escapeHTML(comparison.label)}</div>` : '';
        return `<div class="tooltip-title">베이스 장비</div><div class="tooltip-line">${offer.name} · 숨겨진 티어 ${offer.hiddenTier || offer.reqTier}</div>${comparisonLine}${chainLine}${rareLine}${exLine}${getBlackMarketBaseTooltipOptionLines(sourceStats)}<div class="tooltip-line">제작용 베이스로 사용됩니다.</div>`;
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
        let baseTitle = offer.baseName ? `<div class="tooltip-line" style="color:#b9d7ff;">베이스: ${escapeHTML(offer.baseName)} · 숨겨진 티어 ${offer.hiddenTier || offer.reqTier}</div>` : '';
        let chaseLine = offer.chase ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">🌠 체이싱 유니크 암거래 품목</div>' : '';
        let featuredLine = offer.featured ? '<div class="tooltip-line" style="color:#93e7c1; font-weight:800;">🎯 시장 정보로 확보한 표적 고유</div>' : '';
        return `<div class="tooltip-title">도감 고유 정보 · ${escapeHTML(offer.name)} (숨겨진 티어 ${offer.hiddenTier || offer.reqTier})</div>${featuredLine}${chaseLine}${baseTitle}${baseLines}${optionLines}<div class="tooltip-line">도감 등록: ${codexLine}</div>`;
    }
    return '<div class="tooltip-title">암거래 품목</div>';
}

function showBlackMarketOfferTooltip(event, encodedHtml) {
    if (!event || typeof showInfoTooltipHtml !== 'function') return;
    let html = '';
    try {
        html = decodeURIComponent(encodedHtml || '');
    } catch (error) {
        html = '<div class="tooltip-title">암거래 품목</div>';
    }
    showInfoTooltipHtml(event.clientX, event.clientY, html, '#6f89a6');
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

function toggleBlackMarketOfferLock(idx) {
    let bm = normalizeBlackMarketState();
    let offer = (bm.offers || [])[idx];
    if (!offer) return;
    let isLocked = !!bm.lockedOffers[idx];
    if (isLocked) {
        delete bm.lockedOffers[idx];
    } else {
        if (getBlackMarketLockCount() >= BLACK_MARKET_MAX_LOCKED_OFFERS) {
            return addLog(`암거래 잠금은 최대 ${BLACK_MARKET_MAX_LOCKED_OFFERS}개까지 가능합니다.`, 'attack-monster');
        }
        bm.lockedOffers[idx] = true;
    }
    updateStaticUI();
}

function setBlackMarketPreferredSlot(slot) {
    let bm = normalizeBlackMarketState();
    let next = BLACK_MARKET_EQUIPMENT_SLOTS.includes(slot) ? slot : 'any';
    if (bm.preferredSlot === next) return;
    bm.preferredSlot = next;
    addLog(`🕶️ 암거래 추적 부위: ${next === 'any' ? '전체 부위' : next}`, 'loot-normal');
    updateStaticUI();
}

async function refreshBlackMarketNow() {
    if (!isMarketUnlocked()) return;
    let bm = normalizeBlackMarketState();
    let cost = getBlackMarketManualRefreshCost();
    if ((game.currencies.chaos || 0) < cost) return addLog(`즉시 갱신에 필요한 카오스 오브가 부족합니다. (필요 ${cost})`, 'attack-monster');
    let lockCount = getBlackMarketLockCount();
    let accepted = await requestGameConfirmation(
        `잠그지 않은 암거래 품목을 즉시 갱신합니다.\n카오스 오브 ${cost}개를 사용하며 잠금 ${lockCount}개는 유지됩니다.`,
        { title: '암거래 즉시 갱신', confirmLabel: '갱신', danger: false }
    );
    if (!accepted) return;
    if ((game.currencies.chaos || 0) < cost) return addLog('갱신 도중 재화가 변경되어 취소되었습니다.', 'attack-monster');
    game.currencies.chaos -= cost;
    bm.manualRefreshes = Math.min(20, Math.max(0, Math.floor(bm.manualRefreshes || 0)) + 1);
    refreshBlackMarket(true);
    addLog(`🕶️ 암거래 즉시 갱신 완료 (카오스 ${cost} 소모)`, 'loot-magic');
    updateStaticUI();
}

async function expandBlackMarketSlotsByDivine(){
    let bm = normalizeBlackMarketState();
    if (isBlackMarketSlotCapReached()) return addLog(`암거래상 품목 한도는 최대 ${BLACK_MARKET_MAX_SLOT_COUNT}개입니다.`, 'attack-monster');
    let cost = getBlackMarketSlotExpandCost();
    if ((game.currencies.divine||0) < cost) return addLog(`신성한 오브가 부족합니다. (필요 ${cost})`, 'attack-monster');
    if (!await requestGameConfirmation(`신성한 오브 ${cost}개를 소모해 암거래 품목 슬롯을 영구히 1칸 확장합니다.\n현재 상품과 잠금 상태는 그대로 유지됩니다.`, {
        title: '암거래 품목 확장',
        tone: cost >= 5 ? 'danger' : 'warning',
        confirmLabel: '슬롯 확장'
    })) return;
    bm = normalizeBlackMarketState();
    if (isBlackMarketSlotCapReached() || getBlackMarketSlotExpandCost() !== cost) return addLog('확장 대기 중 거래소 상태가 변경되어 취소되었습니다.', 'attack-monster');
    if ((game.currencies.divine||0) < cost) return addLog('확장 대기 중 재화가 변경되어 취소되었습니다.', 'attack-monster');
    let previousCount = getBlackMarketSlotCount();
    game.currencies.divine -= cost;
    bm.extraSlots = Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.max(0, Math.floor(bm.extraSlots||0)) + 1);
    bm.offers = Array.isArray(bm.offers) ? bm.offers : [];
    bm.offers[previousCount] = buildBlackMarketOffer(previousCount);
    addLog(`🕶️ 암거래상 품목 슬롯이 늘어났습니다. (${getBlackMarketSlotCount()}/${BLACK_MARKET_MAX_SLOT_COUNT}, 신성한 오브 ${cost} 소모)`, 'loot-unique');
    updateStaticUI();
}


function getBlackMarketSlotExpandCost() {
    let bm = normalizeBlackMarketState();
    let bought = Math.max(0, Math.floor(bm.extraSlots || 0));
    return 1 + bought;
}

function canStoreBlackMarketEquipmentOffer() {
    if ((game.inventory || []).length < getInventoryLimit()) return true;
    addLog('인벤토리 공간이 부족해 암거래 장비를 구매할 수 없습니다.', 'attack-monster');
    return false;
}

async function buyBlackMarketOffer(idx){
    let bm = normalizeBlackMarketState();
    let offerIndex = Math.floor(Number(idx));
    if (!Number.isInteger(offerIndex) || offerIndex < 0 || offerIndex >= getBlackMarketSlotCount()) return addLog('유효하지 않은 암거래 상품입니다.', 'attack-monster');
    let offer = (bm.offers || [])[offerIndex];
    if (!offer) return;
    // 화면에 보인 상품의 시간이 끝난 뒤 클릭했을 때 같은 슬롯의 새 상품을 대신 구매하지 않는다.
    // 잠금 상품만 자연 갱신을 통과해 동일 객체로 보존되므로 계속 구매할 수 있다.
    if (Date.now() >= (bm.nextRefreshAt || 0)) {
        let wasLocked = !!bm.lockedOffers[offerIndex];
        refreshBlackMarket(false);
        bm = normalizeBlackMarketState();
        if (!wasLocked || bm.offers[offerIndex] !== offer) {
            addLog('선택한 암거래 상품의 판매 시간이 끝나 목록을 갱신했습니다. 새 상품을 다시 확인하세요.', 'attack-monster');
            updateStaticUI();
            return;
        }
        offer = bm.offers[offerIndex];
    }
    let purchaseState = getBlackMarketOfferPurchaseState(offer);
    if (!purchaseState.canBuy) return addLog(purchaseState.reason, 'attack-monster');
    let needsConfirmation = !!(offer.chase || offer.featured || (offer.priceKey === 'divine' && Number(offer.price) >= 5));
    if (needsConfirmation) {
        let priceName = offer.priceKey && ORB_DB[offer.priceKey] ? ORB_DB[offer.priceKey].name : offer.priceKey;
        let accepted = await requestGameConfirmation(`[${offer.name || '암거래 상품'}]을 구매합니다.\n${priceName} ${offer.price}개를 소모하며 구매 후 되돌릴 수 없습니다.`, {
            title: offer.chase ? '체이싱 고유 구매' : (offer.featured ? '표적 고유 구매' : '고가 암거래 구매'),
            tone: 'danger',
            confirmLabel: '구매'
        });
        if (!accepted) return;
        bm = normalizeBlackMarketState();
        if (bm.offers[offerIndex] !== offer || (Date.now() >= (bm.nextRefreshAt || 0) && !bm.lockedOffers[offerIndex])) {
            refreshBlackMarket(false);
            addLog('구매 확인 중 상품 목록이 변경되어 거래를 취소했습니다.', 'attack-monster');
            updateStaticUI();
            return;
        }
        purchaseState = getBlackMarketOfferPurchaseState(offer);
        if (!purchaseState.canBuy) return addLog(`구매 확인 중 상태가 변경되었습니다. ${purchaseState.reason}`, 'attack-monster');
    }
    let purchased = false;
    let purchaseSummary = '';
    if (offer.type==='exchange') {
        if ((game.currencies[offer.from]||0) < offer.need) return addLog('재화가 부족합니다.', 'attack-monster');
        game.currencies[offer.from]-=offer.need; awardCurrency(offer.to, offer.gain); purchased = true;
        purchaseSummary = `${ORB_DB[offer.from].name} ${offer.need} → ${ORB_DB[offer.to].name} ${offer.gain}`;
    } else if (offer.type==='skillGem') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        if (hasSkillGemOwned(offer.name)) return addLog('이미 보유한 젬입니다.', 'attack-monster');
        game.currencies[offer.priceKey]-=offer.price; game.skills.push(offer.name); game.gemData[offer.name]={level:1,exp:0}; purchased = true;
        game.noti = game.noti || {}; game.noti.skills = true;
        purchaseSummary = `공격 젬 [${offer.name}]`;
    } else if (offer.type==='baseItem') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        if (!canStoreBlackMarketEquipmentOffer()) return;
        let base = BASE_ITEM_DB.find(row => row && ((offer.baseId && row.id === offer.baseId) || (row.name === offer.name.replace(' 베이스','') && row.slot === offer.slot))) || chooseItemBase(offer.slot, offer.hiddenTier || offer.reqTier);
        let item = normalizeItem({
            id: ++itemIdCounter,
            slot: base.slot,
            baseId: base.id,
            baseName: base.name,
            name: base.name,
            rarity: 'normal',
            itemTier: offer.hiddenTier || offer.reqTier || base.reqTier || 1,
            hiddenTier: offer.hiddenTier || offer.reqTier || base.reqTier || 1,
            baseStats: Array.isArray(offer.baseStats) && offer.baseStats.length > 0 ? offer.baseStats.map(stat => ({ ...stat })) : rollBaseStats(base, offer.hiddenTier || offer.reqTier || base.reqTier || 1),
            stats: [],
            exceptionalBase: !!offer.exceptionalBase,
            exceptionalStatNames: Array.isArray(offer.exceptionalStatNames) ? offer.exceptionalStatNames.slice() : [],
            exceptionalStatName: Array.isArray(offer.exceptionalStatNames) ? offer.exceptionalStatNames.join(', ') : '',
            exceptionalAllLines: !!(offer.exceptionalBase && Array.isArray(offer.baseStats) && offer.baseStats.length > 0 && offer.baseStats.every(stat => stat && stat.exceptional))
        });
        if (item && addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true })) {
            game.currencies[offer.priceKey]-=offer.price;
            purchased = true;
            game.noti = game.noti || {}; game.noti.items = true;
            purchaseSummary = `제작 베이스 [${item.name}]`;
        }
    } else if (offer.type==='unique') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        if (!canStoreBlackMarketEquipmentOffer()) return;
        let item = generateUniqueItem(offer.hiddenTier || offer.reqTier, offer.slot, offer.name);
        let base = BASE_ITEM_DB.find(row => row && offer.baseId && row.id === offer.baseId);
        if (item && base) {
            item.baseId = base.id;
            item.baseName = base.name;
            item.baseStats = rollBaseStats(base, offer.hiddenTier || offer.reqTier || base.reqTier || 1);
            clearExceptionalBaseState(item);
            if (typeof maybeApplyExceptionalBase === 'function') maybeApplyExceptionalBase(item);
        }
        if (item && addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true })) {
            game.currencies[offer.priceKey]-=offer.price;
            purchased = true;
            game.noti = game.noti || {}; game.noti.items = true;
            purchaseSummary = `${offer.featured ? '표적 ' : ''}고유 [${item.name}]`;
        }
    }
    if (!purchased) return;
    game.blackMarket.offers[offerIndex]=null;
    if (game.blackMarket && game.blackMarket.lockedOffers) delete game.blackMarket.lockedOffers[offerIndex];
    addLog(`🕶️ 암거래 구매 완료${purchaseSummary ? ` · ${purchaseSummary}` : ''}`, offer.chase || offer.featured ? 'loot-unique' : 'loot-magic');
    updateStaticUI();
}

function renderMarketUI() {
    let lockedEl = document.getElementById('ui-market-locked');
    let panelEl = document.getElementById('ui-market-panel');
    if (!lockedEl || !panelEl) return;
    let unlocked = isMarketUnlocked();
    lockedEl.style.display = unlocked ? 'none' : 'block';
    panelEl.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) return;
    refreshBlackMarket(false);

    let listEl = document.getElementById('ui-market-exchange-list');
    if (listEl) {
        listEl.innerHTML = MARKET_EXCHANGES.map(recipe => {
            let have = game.currencies[recipe.from] || 0;
            let maxTimes = Math.floor(have / recipe.need);
            let spendAll = maxTimes * recipe.need;
            let gainAll = maxTimes * recipe.gain;
            let tone = (recipe.to === 'divine' || recipe.from === 'divine') ? 'divine' : (recipe.to === 'chaos' ? 'chaos' : 'basic');
            return `<div class="market-card market-tone-${tone}">
                <div class="market-title">${typeof getStyledOrbName === 'function' ? getStyledOrbName(recipe.from) : ORB_DB[recipe.from].name} ${recipe.need}개 → ${typeof getStyledOrbName === 'function' ? getStyledOrbName(recipe.to) : ORB_DB[recipe.to].name} ${recipe.gain}개</div>
                <div class="market-row">
                    <button onclick="exchangeAtMarket('${recipe.id}', false)" ${maxTimes < 1 ? 'disabled' : ''}>1회 교환</button>
                    <button onclick="exchangeAtMarket('${recipe.id}', true)" style="background:#5d6d7e; border-color:#465664;" ${maxTimes < 1 ? 'disabled' : ''}>모두 교환 (${spendAll}→${gainAll})</button>
                    <span class="market-meta">보유: ${have}</span>
                </div>
            </div>`;
        }).join('');
    }
    let passiveEl = document.getElementById('ui-market-service-passive');
    if (passiveEl) {
        let hasSpent = Array.isArray(game.passives) && game.passives.length > 0;
        passiveEl.innerHTML = `<div class="market-service-title">신성한 오브 1개 → 패시브 트리 전체 초기화 + 포인트 반환</div>
        <button onclick="marketResetPassiveTreeByDivine()" ${hasSpent && (game.currencies.divine || 0) >= 1 ? '' : 'disabled'}>패시브 트리 전체 초기화</button>`;
    }
    let annulEl = document.getElementById('ui-market-service-annul');
    if (annulEl) {
        let item = getSelectedCraftItem();
        let removable = item && typeof getAnnulmentRemovableStats === 'function'
            ? getAnnulmentRemovableStats(item)
            : [];
        let protectedCount = item && Array.isArray(item.stats)
            ? item.stats.filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift || stat.encroachedFinal || stat.unremovable)).length
            : 0;
        let options = removable.map((row, order) => `<option value="${row.index}">${order + 1}. ${row.stat.statName || getStatName(row.stat.id)} +${formatValue(row.stat.id, row.stat.val)}</option>`).join('');
        annulEl.innerHTML = `<div class="market-service-title">신성한 오브 2개 → 선택 장비의 원하는 옵션 1줄 소멸</div>
        <div class="market-row">
            <select id="sel-market-annul-stat" ${removable.length <= 0 ? 'disabled' : ''} style="min-width:260px; background:#0e141d; color:#dbe9ff; border:1px solid #35506b; border-radius:6px; padding:5px 8px;">${options || '<option>제거 가능한 옵션 없음</option>'}</select>
            <button onclick="marketAnnulSelectedStat(Number(document.getElementById('sel-market-annul-stat').value))" ${removable.length <= 0 || (game.currencies.divine || 0) < 2 ? 'disabled' : ''}>옵션 1줄 소멸</button>
        </div>
        <div class="market-meta">대상: ${item ? `[${item.name}] · 제거 가능 ${removable.length}줄${protectedCount > 0 ? ` · 보호 ${protectedCount}줄 유지` : ''}` : '제작 대상 장비를 먼저 선택하세요.'}</div>`;
    }
    let invEl = document.getElementById('ui-market-service-inv');
    if (invEl) {
        let cost = getMarketInventoryExpandCost();
        invEl.innerHTML = `<div class="market-service-title">신성한 오브 ${cost}개 → 인벤토리 영구 5칸 확장 (현재: ${getInventoryLimit()}칸)</div>
        <button onclick="marketExpandInventoryByDivine()" ${(game.currencies.divine || 0) < cost ? 'disabled' : ''}>인벤토리 확장</button>`;
    }
    let jewelInvEl = document.getElementById('ui-market-service-jewel-inv');
    if (jewelInvEl) {
        if ((game.season || 1) < 5) {
            jewelInvEl.innerHTML = `<div class="market-meta">주얼 해금 후 신성한 오브로 주얼 인벤토리 확장이 열립니다.</div>`;
        } else {
            let cost = getJewelMarketExpandCost();
            jewelInvEl.innerHTML = `<div class="market-service-title">신성한 오브 ${cost}개 → 주얼 인벤토리 영구 5칸 확장 (현재: ${getJewelInventoryLimit()}칸)</div>
            <button onclick="marketExpandJewelInventoryByDivine()" ${(game.currencies.divine || 0) < cost ? 'disabled' : ''}>주얼 인벤토리 확장</button>`;
        }
    }
    let pollenEl = document.getElementById('ui-market-service-pollen');
    if (pollenEl) {
        let open = (game.season || 1) >= 8;
        pollenEl.style.display = open ? 'block' : 'none';
        if (open) {
            let beeLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
            let exchangeOpen = beeLv >= 6;
            pollenEl.innerHTML = `<div class="market-service-title">꽃가루 교환소 <span class="market-meta">양봉업자 Lv.${beeLv}${exchangeOpen ? '' : ' · 벌꿀/독벌침 교환 Lv.6 필요'}</span></div>
        <div class="market-row">
            <button onclick="craftBeehiveCurrency('key')" ${(game.currencies.pollen||0)<200?'disabled':''}>꽃가루 200 → 열쇠</button>
            <button onclick="craftBeehiveCurrency('stinger')" ${!exchangeOpen || (game.currencies.pollen||0)<600?'disabled':''}>꽃가루 600 → 독벌침</button>
            <button onclick="craftBeehiveCurrency('honey')" ${!exchangeOpen || (game.currencies.pollen||0)<2000?'disabled':''}>꽃가루 2000 → 벌꿀</button>
            <button onclick="craftBeehiveCurrency('wax')" ${beeLv < 8 || (game.currencies.pollen||0)<350?'disabled':''}>꽃가루 350 → 밀랍</button>
        </div>`;
        }
    }

    let bmEl = document.getElementById('ui-market-black');
    if (bmEl) {
        let remain = Math.max(0, Math.floor(((game.blackMarket && game.blackMarket.nextRefreshAt || 0) - Date.now()) / 1000));
        let mm = String(Math.floor(remain / 60)).padStart(2,'0');
        let ss = String(remain % 60).padStart(2,'0');
        normalizeBlackMarketState();
        let slotCount = getBlackMarketSlotCount();
        let rawOffers = (game.blackMarket && game.blackMarket.offers || []).slice(0, slotCount).map((offer, idx) => ({ offer, idx }));
        let orderMap = { exchange: 0, skillGem: 1, baseItem: 2, unique: 3 };
        rawOffers.sort((a, b) => {
            let ao = a.offer ? (orderMap[a.offer.type] ?? 9) : 99;
            let bo = b.offer ? (orderMap[b.offer.type] ?? 9) : 99;
            if (ao !== bo) return ao - bo;
            return a.idx - b.idx;
        });
        let offers = rawOffers.map(({ offer, idx }) => {
            if (!offer) return `<div style="opacity:.5;">품절</div>`;
            let safeOfferName = typeof escapeHTML === 'function' ? escapeHTML(String(offer.name || '')) : String(offer.name || '');
            let baseChainLabel = offer.type === 'baseItem' && offer.baseChainStep && offer.baseChainTotal ? `${Math.floor(offer.baseChainStep)}/${Math.floor(offer.baseChainTotal)}` : '';
            let desc = offer.type==='exchange'
                ? `${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.from) : ORB_DB[offer.from].name} ${offer.need} → ${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.to) : ORB_DB[offer.to].name} ${offer.gain}${Number.isFinite(Number(offer.dealPct)) ? ` · 효율 +${Math.max(0, Math.floor(offer.dealPct))}%` : ''}${offer.bulkMultiplier && offer.bulkMultiplier > 1 ? ` · x${offer.bulkMultiplier}` : ''}`
                : (offer.type==='skillGem' ? `미보유 젬 [${safeOfferName}]` : `${safeOfferName}${baseChainLabel ? ` · 체인 ${baseChainLabel}` : ''}${offer.rareT20Base ? ' · T20' : ''}${offer.exceptionalBase ? ' · 특출' : ''}`);
            if (offer.type === 'baseItem') {
                let comparison = getBlackMarketBaseComparison(offer);
                if (comparison) desc += ` · ${comparison.label}`;
            }
            if (offer.type === 'unique') {
                let unique = UNIQUE_DB.find(row => row && row.name === offer.name);
                desc += isBlackMarketUniqueRegistered(unique) ? ' · 도감 등록됨' : ' · 도감 미등록';
            }
            let price = offer.type==='exchange' ? '' : ` (${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.priceKey) : ORB_DB[offer.priceKey].name} ${offer.price})`;
            let cls = offer.type === 'exchange' ? 'currency' : offer.type === 'skillGem' ? 'gem' : offer.type === 'baseItem' ? 'gear' : (offer.chase ? 'unique chase' : 'unique');
            let badge = offer.featured ? '표적 고유' : cls === 'currency' ? '재화' : cls === 'gem' ? '젬' : cls === 'gear' ? '장비' : (offer.chase ? '체이싱' : '고유');
            let tooltip = encodeURIComponent(getBlackMarketOfferTooltipHtml(offer));
            let richDesc = `${desc}${price}`;
            let isLocked = !!(game.blackMarket && game.blackMarket.lockedOffers && game.blackMarket.lockedOffers[idx]);
            let lockLabel = isLocked ? '🔒 잠금' : '🔓 잠금';
            let purchaseState = getBlackMarketOfferPurchaseState(offer);
            return `<div class="market-black-offer ${cls}${offer.featured ? ' featured' : ''}">
                <div class="market-black-copy">
                    <div><span class="market-black-badge ${cls}">${badge}</span> <span class="market-black-label" data-info-tooltip-anchor="1" data-market-tooltip="${tooltip}" onmouseenter="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmousemove="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmouseleave="hideInfoTooltip()">${richDesc}</span></div>
                    <div class="market-black-state ${purchaseState.canBuy ? 'can-buy' : 'blocked'}">${purchaseState.reason}</div>
                </div>
                <div class="market-black-actions"><button onclick="buyBlackMarketOffer(${idx})" ${purchaseState.canBuy ? '' : 'disabled'}>구매</button><button onclick="toggleBlackMarketOfferLock(${idx})">${lockLabel}</button></div>
            </div>`;
        }).join('');
        let atCap = slotCount >= BLACK_MARKET_MAX_SLOT_COUNT;
        let expandLabel = atCap ? `품목 한도 최대치 (${slotCount}/${BLACK_MARKET_MAX_SLOT_COUNT})` : `신성한 오브 ${getBlackMarketSlotExpandCost()}개로 품목 +1 (${slotCount}/${BLACK_MARKET_MAX_SLOT_COUNT})`;
        let bm = normalizeBlackMarketState();
        let lockCount = getBlackMarketLockCount();
        let activeOfferCount = rawOffers.filter(row => !!row.offer).length;
        let buyableOfferCount = rawOffers.filter(row => row.offer && getBlackMarketOfferPurchaseState(row.offer).canBuy).length;
        let rerollOfferCount = rawOffers.filter(row => row.offer && !(bm.lockedOffers && bm.lockedOffers[row.idx])).length;
        let insight = Math.max(0, Math.min(BLACK_MARKET_INSIGHT_TARGET, Math.floor(bm.insight || 0)));
        let refreshCost = getBlackMarketManualRefreshCost();
        let preferenceOptions = [{ value: 'any', label: '전체 부위' }].concat(BLACK_MARKET_EQUIPMENT_SLOTS.map(slot => ({ value: slot, label: slot })))
            .map(option => `<option value="${option.value}" ${bm.preferredSlot === option.value ? 'selected' : ''}>${option.label}</option>`).join('');
        let insightCells = Array.from({ length: BLACK_MARKET_INSIGHT_TARGET }, (_, index) => `<i class="${index < insight ? 'filled' : ''}"></i>`).join('');
        let refreshesLeft = insight >= BLACK_MARKET_INSIGHT_TARGET ? 0 : BLACK_MARKET_INSIGHT_TARGET - insight;
        bmEl.innerHTML = `<div class="market-black-header">
            <div><div class="market-title">암거래상 · 다음 갱신 ${mm}:${ss}</div><div class="market-meta"><span class="market-ready-count">구매 가능 ${buyableOfferCount}/${activeOfferCount}</span> · 잠금 ${lockCount}/${BLACK_MARKET_MAX_LOCKED_OFFERS} · 잠그지 않은 ${rerollOfferCount}개가 갱신됩니다.</div></div>
            <div class="market-black-controls">
                <label>추적 부위(35%) <select onchange="setBlackMarketPreferredSlot(this.value)">${preferenceOptions}</select></label>
                <button onclick="refreshBlackMarketNow()" ${(game.currencies.chaos || 0) < refreshCost ? 'disabled' : ''}>${rerollOfferCount}개 즉시 갱신 · 카오스 ${refreshCost}</button>
            </div>
        </div>
        <div class="market-insight"><div><span>시장 정보</span><strong>${refreshesLeft <= 0 ? '다음 갱신에 표적 고유 확정' : `표적 고유까지 ${refreshesLeft}회`}</strong></div><div class="market-insight-cells">${insightCells}</div><small>추적 부위의 도감 미등록 일반 고유를 우선 제시합니다. 체이싱 고유는 기존 희귀 확률을 유지합니다.</small></div>
        <div class="market-black-grid">${offers}</div>
        <button style="margin-top:6px;" onclick="expandBlackMarketSlotsByDivine()" ${atCap || (game.currencies.divine || 0) < getBlackMarketSlotExpandCost() ? 'disabled' : ''}>${expandLabel}</button>`;
    }
}


safeExposeGlobals({ canStoreBlackMarketEquipmentOffer, getBlackMarketOfferPurchaseState, showBlackMarketOfferTooltip, marketResetPassiveTreeByDivine, marketAnnulSelectedStat, marketExpandInventoryByDivine, marketExpandJewelInventoryByDivine, renderMarketUI, refreshBlackMarket, refreshBlackMarketNow, setBlackMarketPreferredSlot, buyBlackMarketOffer, toggleBlackMarketOfferLock, getBlackMarketManualRefreshCost, getBlackMarketLockCount, getBlackMarketSlotExpandCost, getBlackMarketSlotCount, isBlackMarketSlotCapReached, expandBlackMarketSlotsByDivine, upgradeSelectedItemBase, confirmSelectedItemBaseUpgrade, closeBaseUpgradeOverlay });
