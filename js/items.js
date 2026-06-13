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

function isUniqueEligibleForBlackMarket(unique) {
    if (!unique || unique.contentOnly || unique.bossOnly || unique.realmCodexOnly) return false;
    if (!unique.dropOnly) return true;
    return !!(unique.dropOnly && unique.dropOnly.type === 'cosmos');
}

function rollBlackMarketChaseUniquePrice(reqTier) {
    let tier = Math.max(1, Math.floor(Number(reqTier) || 1));
    let minPrice = Math.max(30, Math.min(150, Math.floor(tier * 2)));
    let maxPrice = Math.max(minPrice, Math.min(150, Math.floor(tier * 7.5)));
    return minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
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
    Object.keys(game.blackMarket.lockedOffers).forEach(key => {
        let idx = Math.floor(Number(key));
        if (!Number.isFinite(idx) || idx < 0 || idx >= BLACK_MARKET_MAX_SLOT_COUNT || !game.blackMarket.offers[idx]) delete game.blackMarket.lockedOffers[key];
    });
    return game.blackMarket;
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
    if (item.slot === '반지') return ['반지1', '반지2'];
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
    return slotName === '반지' || slotName === '장갑';
}

function getDualSlotDisplayLabel(targetSlot) {
    if (targetSlot === '반지1') return '왼쪽 반지';
    if (targetSlot === '반지2') return '오른쪽 반지';
    if (targetSlot === '장갑1') return '왼쪽 장갑';
    if (targetSlot === '장갑2') return '오른쪽 장갑';
    return targetSlot;
}

function dualSlotBothOccupied(slotName) {
    if (slotName === '반지') return !!(game.equipment['반지1'] && game.equipment['반지2']);
    if (slotName === '장갑') return !!(game.equipment['장갑1'] && game.equipment['장갑2']);
    return false;
}

function findInventoryIndexById(itemId) {
    return (game.inventory || []).findIndex(item => item && item.id === itemId);
}

function equipItem(idx, preferredSlot) {
    let item = game.inventory[idx];
    if (!item) return;
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
    let warriorDualTrain = game.ascendClass === 'warrior' && typeof hasKeystone === 'function' && hasKeystone('w3');
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
        if ((game.season || 1) < (zone.reqSeason || 2)) return addLog('아직 뿌리 보스가 잠겨 있습니다.', 'attack-monster');
        if ((game.currencies[zone.key] || 0) <= 0) return addLog(`입장 열쇠(${ORB_DB[zone.key].name})가 필요합니다.`, 'attack-monster');
        game.currencies[zone.key]--;
        game.inTicketBossFight = true;
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


safeExposeGlobals({ selectForCrafting, equipItem, equipItemById, unequipItem, salvageItemById, toggleItemLockById, getSelectedCraftItem, getCraftSelectionRef, isCraftSelectionEquip, clearCraftSelection, ensureCraftSelectionValid, hasActiveBeehiveRuntimeState, clearBeehiveRuntimeState, reconcileBeehiveRunState, isBeehiveRunLockedForMapTravel, warnBeehiveMapTravelBlocked });

// Phase-3 extracted market/crafting service handlers.
function marketResetPassiveTreeByDivine() {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.divine || 0) < 1) return addLog('신성한 오브가 부족합니다.', 'attack-monster');
    let spentNodes = Array.isArray(game.passives) ? game.passives.length : 0;
    if (spentNodes <= 0) return addLog('초기화할 패시브 노드가 없습니다.', 'attack-monster');
    if (!confirm(`신성한 오브 1개를 사용해 패시브 트리를 전체 초기화하고 포인트 ${spentNodes}점을 반환할까요?`)) return;
    game.currencies.divine -= 1;
    game.passives = [];
    game.passivePoints += spentNodes;
    calculateReachableNodes();
    refreshPassiveVisibility();
    addLog(`🧠 패시브 트리 초기화 완료! 포인트 ${spentNodes}점 반환`, 'season-up');
    updateStaticUI();
}

function marketAnnulSelectedStat(statIdx) {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 제작 대상 장비를 선택하세요.', 'attack-monster');
    if (item.rarity === 'normal' || !Array.isArray(item.stats) || item.stats.length <= 0) return addLog('소멸시킬 옵션이 없습니다.', 'attack-monster');
    if ((game.currencies.divine || 0) < 2) return addLog('신성한 오브가 부족합니다. (필요: 2)', 'attack-monster');
    let idx = Math.floor(Number(statIdx));
    if (!Number.isInteger(idx) || idx < 0 || idx >= item.stats.length) return addLog('소멸할 옵션을 선택하세요.', 'attack-monster');
    let target = item.stats[idx];
    if (!confirm(`신성한 오브 2개로 [${item.name}]의 옵션 "${target.statName}" 1줄을 소멸시킬까요?`)) return;
    game.currencies.divine -= 2;
    item.stats.splice(idx, 1);
    updateItemName(item);
    addLog(`💥 옵션 소멸 완료: [${item.name}] - ${target.statName}`, 'loot-unique');
    updateStaticUI();
}

function marketExpandInventoryByDivine() {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    let cost = getMarketInventoryExpandCost();
    if ((game.currencies.divine || 0) < cost) return addLog(`신성한 오브가 부족합니다. (필요: ${cost})`, 'attack-monster');
    if (!confirm(`신성한 오브 ${cost}개로 인벤토리를 영구히 5칸 확장할까요?`)) return;
    game.currencies.divine -= cost;
    game.inventoryExpandLevel = Math.max(0, Math.floor(game.inventoryExpandLevel || 0)) + 1;
    addLog(`🎒 인벤토리 영구 확장 완료! 현재 최대 칸: ${getInventoryLimit()}`, 'loot-unique');
    updateStaticUI();
}

function marketExpandJewelInventoryByDivine() {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    if ((game.season || 1) < 5) return addLog('주얼 해금 후 이용할 수 있습니다.', 'attack-monster');
    let cost = getJewelMarketExpandCost();
    if ((game.currencies.divine || 0) < cost) return addLog(`신성한 오브가 부족합니다. (필요: ${cost})`, 'attack-monster');
    if (!confirm(`신성한 오브 ${cost}개로 주얼 인벤토리를 영구히 5칸 확장할까요? (루프 종료 후에도 초기화되지 않음)`)) return;
    game.currencies.divine -= cost;
    game.jewelInventoryExpandLevel = Math.max(0, Math.floor(game.jewelInventoryExpandLevel || 0)) + 1;
    addLog(`💠 주얼 인벤토리 영구 확장 완료! 현재 최대 칸: ${getJewelInventoryLimit()}`, 'loot-unique');
    updateStaticUI();
}

function upgradeSelectedItemBase() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 제작 대상 장비를 선택하세요.', 'attack-monster');
    let currentBase = BASE_ITEM_DB.find(base => base && base.id === item.baseId) || BASE_ITEM_DB.find(base => base && base.name === item.baseName && base.slot === item.slot);
    if (!currentBase) return addLog('현재 베이스 정보를 찾을 수 없습니다.', 'attack-monster');
    if (currentBase.realmBase) return addLog('계 전용 베이스 장비는 베이스 업그레이드로 변경할 수 없습니다.', 'attack-monster');
    function getDefenseProfile(base) {
        let ids = new Set((base.baseStats || []).map(stat => stat.id));
        return ['armor', 'evasion', 'energyShield'].filter(id => ids.has(id)).join('+');
    }
    function getSecondaryStatSignature(base, slot) {
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
    let currentProfile = getDefenseProfile(currentBase);
    let currentSecondarySignature = getSecondaryStatSignature(currentBase, currentBase.slot);
    let candidates = BASE_ITEM_DB
        .filter(base => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase)
        .filter(base => ['투구','갑옷','장갑','신발','방패'].includes(base.slot) ? getDefenseProfile(base) === currentProfile : true)
        .sort((a,b)=>a.reqTier-b.reqTier);
    if (currentSecondarySignature.length > 0) {
        let exactSecondaryCandidates = candidates.filter(base => {
            let signature = getSecondaryStatSignature(base, base.slot);
            if (signature.length !== currentSecondarySignature.length) return false;
            return signature.every((id, index) => id === currentSecondarySignature[index]);
        });
        if (exactSecondaryCandidates.length > 0) candidates = exactSecondaryCandidates;
    }
    let nextBase = candidates[0];
    if (!nextBase) return addLog('해당 계열의 다음 베이스가 없습니다.', 'attack-monster');
    let isTopBase = candidates.length === 1;
    let costChaos = Math.max(5, 3 + Math.floor((nextBase.reqTier - currentBase.reqTier) * 2.5));
    let costDivine = isTopBase ? 1 : 0;
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



function buildBlackMarketOffer(index) {
    let tier = (getZone(game.currentZoneId) || { tier: 1 }).tier || 1;
    let roll = Math.random();
    if (roll < 0.45) {
        let recipe = rndChoice(MARKET_EXCHANGES);
        let gain = recipe.gain;
        if (recipe.id === 'm11' && recipe.from === 'divine' && recipe.to === 'chaos') gain = 70;
        return { type:'exchange', name:`암거래 교환 #${index+1}`, from:recipe.from, to:recipe.to, need:Math.max(1, Math.floor(recipe.need*0.8)), gain:gain };
    }
    if (roll < 0.75) {
        let slot = rndChoice(['무기','투구','갑옷','장갑','신발','목걸이','반지','허리띠','방패']);
        let candidates = BASE_ITEM_DB.filter(base => base && base.slot === slot && !base.dropOnly && (base.reqTier || 1) <= (tier + 3));
        let base = candidates.length ? rndChoice(candidates) : chooseItemBase(slot, tier);
        let price = Math.max(2, Math.floor((base.reqTier || tier) / 2) + 2);
        return { type:'baseItem', name:`${base.name} 베이스`, slot: base.slot, reqTier:Math.max(tier, base.reqTier || tier), priceKey:'chaos', price:price };
    }
    if (roll < 0.9) {
        let missing = Object.keys(SKILL_DB).filter(k => SKILL_DB[k].isGem && !hasSkillGemOwned(k));
        if (missing.length>0) return { type:'skillGem', name:rndChoice(missing), priceKey:'chaos', price:5 };
    }
    let uniqPool = UNIQUE_DB.filter(u => (u.reqTier || 1) <= tier + 4 && isUniqueEligibleForBlackMarket(u));
    let normalPool = uniqPool.filter(u => !u.ultraRare);
    let chasePool = uniqPool.filter(u => u.ultraRare);
    let pickChase = chasePool.length > 0 && Math.random() < BLACK_MARKET_CHASE_UNIQUE_CHANCE;
    let fallbackPool = uniqPool.length ? uniqPool : UNIQUE_DB.filter(isUniqueEligibleForBlackMarket);
    let uniq = pickChase
        ? rndChoice(chasePool)
        : rndChoice(normalPool.length ? normalPool : fallbackPool);
    let req = uniq.reqTier || tier;
    let price = 1;
    if (uniq.ultraRare) {
        price = rollBlackMarketChaseUniquePrice(req);
    } else {
        let minPrice = Math.max(1, Math.floor(req / 10));
        let maxPrice = Math.max(minPrice + 1, Math.floor(req / 4) + 1);
        price = minPrice + Math.floor(Math.random() * (maxPrice - minPrice + 1));
    }
    return { type:'unique', name:uniq.name, slot:uniq.slots[0], reqTier:req, priceKey:'divine', price:price, chase: !!uniq.ultraRare };
}

function getBlackMarketOfferTooltipHtml(offer) {
    if (!offer) return '<div class="tooltip-title">품절</div>';
    if (offer.type === 'exchange') {
        let fromName = typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.from) : ORB_DB[offer.from].name;
        let toName = typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.to) : ORB_DB[offer.to].name;
        return `<div class="tooltip-title">재화 교환</div><div class="tooltip-line">${fromName} ${offer.need}개를 ${toName} ${offer.gain}개로 교환합니다.</div>`;
    }
    if (offer.type === 'skillGem') {
        let skill = SKILL_DB[offer.name] || {};
        return `<div class="tooltip-title">젬: ${offer.name}</div><div class="tooltip-line">${skill.desc || '미보유 공격 젬을 획득합니다.'}</div>`;
    }
    if (offer.type === 'baseItem') {
        return `<div class="tooltip-title">베이스 장비</div><div class="tooltip-line">${offer.name} · 요구 티어 ${offer.reqTier}</div><div class="tooltip-line">제작용 베이스로 사용됩니다.</div>`;
    }
    if (offer.type === 'unique') {
        let uniq = UNIQUE_DB.find(u => u && u.name === offer.name);
        let slot = (uniq && Array.isArray(uniq.slots) && uniq.slots.length > 0) ? uniq.slots[0] : '';
        let codexKey = `${slot}|${offer.name}`;
        let codex = (game && game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
        let registered = !!codex[codexKey];
        let codexLine = registered ? '<span style="color:#8dffb1;">등록됨</span>' : '<span style="color:#ffb0b0;">미등록</span>';
        let effectLine = uniq && uniq.uniqueEffect ? `<div class="tooltip-line" style="color:#d7b8ff;">[고유 효과] ${escapeHTML(uniq.uniqueEffect)}</div>` : '';
        let statLines = (uniq && Array.isArray(uniq.stats) ? uniq.stats.map(stat => {
            let min = Number.isFinite(Number(stat.min)) ? Number(stat.min) : Number(stat.base || 0);
            let max = Number.isFinite(Number(stat.max)) ? Number(stat.max) : min;
            return `<div class="tooltip-line">${getStatName(stat.id)} +${formatValue(stat.id, min)}~+${formatValue(stat.id, max)}</div>`;
        }) : []);
        let chaseLine = offer.chase ? '<div class="tooltip-line" style="color:#ffd36a; font-weight:800;">🌠 체이싱 유니크 암거래 품목</div>' : '';
        return `<div class="tooltip-title">도감 고유 정보 · ${offer.name} (티어 ${offer.reqTier})</div>${chaseLine}${effectLine}${statLines.join('') || '<div class="tooltip-line">고유 옵션 보유</div>'}<div class="tooltip-line">도감 등록: ${codexLine}</div>`;
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
    if (!force && now < (bm.nextRefreshAt || 0)) return;
    let prevOffers = Array.isArray(bm.offers) ? bm.offers.slice(0, count) : [];
    bm.offers = Array.from({ length: count }, (_, i) => {
        if (bm.lockedOffers[i] && prevOffers[i]) return prevOffers[i];
        if (bm.lockedOffers[i]) delete bm.lockedOffers[i];
        return buildBlackMarketOffer(i);
    });
    bm.nextRefreshAt = now + (10 * 60 * 1000);
}

function toggleBlackMarketOfferLock(idx) {
    let bm = normalizeBlackMarketState();
    let offer = (bm.offers || [])[idx];
    if (!offer) return;
    let isLocked = !!bm.lockedOffers[idx];
    if (isLocked) delete bm.lockedOffers[idx];
    else bm.lockedOffers[idx] = true;
    updateStaticUI();
}

function expandBlackMarketSlotsByDivine(){
    let bm = normalizeBlackMarketState();
    if (isBlackMarketSlotCapReached()) return addLog(`암거래상 품목 한도는 최대 ${BLACK_MARKET_MAX_SLOT_COUNT}개입니다.`, 'attack-monster');
    let cost = getBlackMarketSlotExpandCost();
    if ((game.currencies.divine||0) < cost) return addLog(`신성한 오브가 부족합니다. (필요 ${cost})`, 'attack-monster');
    game.currencies.divine -= cost;
    bm.extraSlots = Math.min(BLACK_MARKET_MAX_EXTRA_SLOTS, Math.max(0, Math.floor(bm.extraSlots||0)) + 1);
    refreshBlackMarket(true);
    addLog(`🕶️ 암거래상 품목 슬롯이 늘어났습니다. (${getBlackMarketSlotCount()}/${BLACK_MARKET_MAX_SLOT_COUNT}, 신성한 오브 ${cost} 소모)`, 'loot-unique');
    updateStaticUI();
}


function getBlackMarketSlotExpandCost() {
    let bm = normalizeBlackMarketState();
    let bought = Math.max(0, Math.floor(bm.extraSlots || 0));
    return 1 + bought;
}

function buyBlackMarketOffer(idx){
    normalizeBlackMarketState();
    refreshBlackMarket(false);
    let offer = (game.blackMarket && game.blackMarket.offers || [])[idx]; if(!offer) return;
    if (offer.type==='exchange') {
        if ((game.currencies[offer.from]||0) < offer.need) return addLog('재화가 부족합니다.', 'attack-monster');
        game.currencies[offer.from]-=offer.need; awardCurrency(offer.to, offer.gain);
    } else if (offer.type==='skillGem') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        if (hasSkillGemOwned(offer.name)) return addLog('이미 보유한 젬입니다.', 'attack-monster');
        game.currencies[offer.priceKey]-=offer.price; game.skills.push(offer.name); game.gemData[offer.name]={level:1,exp:0};
    } else if (offer.type==='baseItem') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        game.currencies[offer.priceKey]-=offer.price;
        let base = BASE_ITEM_DB.find(row => row && row.name === offer.name.replace(' 베이스','') && row.slot === offer.slot) || chooseItemBase(offer.slot, offer.reqTier);
        let item = normalizeItem({
            id: ++itemIdCounter,
            slot: base.slot,
            baseId: base.id,
            baseName: base.name,
            name: base.name,
            rarity: 'normal',
            itemTier: offer.reqTier || base.reqTier || 1,
            hiddenTier: offer.reqTier || base.reqTier || 1,
            baseStats: rollBaseStats(base, offer.reqTier || base.reqTier || 1),
            stats: []
        });
        if (item) addItemToInventory(item);
    } else if (offer.type==='unique') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        game.currencies[offer.priceKey]-=offer.price;
        let item = generateUniqueItem(offer.reqTier, offer.slot, offer.name); if(item) addItemToInventory(item);
    }
    game.blackMarket.offers[idx]=null;
    if (game.blackMarket && game.blackMarket.lockedOffers) delete game.blackMarket.lockedOffers[idx];
    addLog('🕶️ 암거래 구매 완료', 'loot-magic');
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
        <button onclick="marketResetPassiveTreeByDivine()" ${hasSpent ? '' : 'disabled'}>패시브 트리 전체 초기화</button>`;
    }
    let annulEl = document.getElementById('ui-market-service-annul');
    if (annulEl) {
        let item = getSelectedCraftItem();
        let stats = (item && Array.isArray(item.stats)) ? item.stats : [];
        let options = stats.map((stat, idx) => `<option value="${idx}">${idx + 1}. ${stat.statName} +${formatValue(stat.id, stat.val)}</option>`).join('');
        annulEl.innerHTML = `<div class="market-service-title">신성한 오브 2개 → 선택 장비의 원하는 옵션 1줄 소멸</div>
        <div class="market-row">
            <select id="sel-market-annul-stat" ${stats.length <= 0 ? 'disabled' : ''} style="min-width:260px; background:#0e141d; color:#dbe9ff; border:1px solid #35506b; border-radius:6px; padding:5px 8px;">${options || '<option>옵션 없음</option>'}</select>
            <button onclick="marketAnnulSelectedStat(Number(document.getElementById('sel-market-annul-stat').value))" ${stats.length <= 0 ? 'disabled' : ''}>옵션 1줄 소멸</button>
        </div>
        <div class="market-meta">대상: ${item ? `[${item.name}]` : '제작 대상 장비를 먼저 선택하세요.'}</div>`;
    }
    let invEl = document.getElementById('ui-market-service-inv');
    if (invEl) {
        let cost = getMarketInventoryExpandCost();
        invEl.innerHTML = `<div class="market-service-title">신성한 오브 ${cost}개 → 인벤토리 영구 5칸 확장 (현재: ${getInventoryLimit()}칸)</div>
        <button onclick="marketExpandInventoryByDivine()">인벤토리 확장</button>`;
    }
    let jewelInvEl = document.getElementById('ui-market-service-jewel-inv');
    if (jewelInvEl) {
        if ((game.season || 1) < 5) {
            jewelInvEl.innerHTML = `<div class="market-meta">주얼 해금 후 신성한 오브로 주얼 인벤토리 확장이 열립니다.</div>`;
        } else {
            let cost = getJewelMarketExpandCost();
            jewelInvEl.innerHTML = `<div class="market-service-title">신성한 오브 ${cost}개 → 주얼 인벤토리 영구 5칸 확장 (현재: ${getJewelInventoryLimit()}칸)</div>
            <button onclick="marketExpandJewelInventoryByDivine()">주얼 인벤토리 확장</button>`;
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
            let desc = offer.type==='exchange'
                ? `${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.from) : ORB_DB[offer.from].name} ${offer.need} → ${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.to) : ORB_DB[offer.to].name} ${offer.gain}`
                : (offer.type==='skillGem' ? `미보유 젬 [${safeOfferName}]` : safeOfferName);
            let price = offer.type==='exchange' ? '' : ` (${typeof getStyledOrbName === 'function' ? getStyledOrbName(offer.priceKey) : ORB_DB[offer.priceKey].name} ${offer.price})`;
            let cls = offer.type === 'exchange' ? 'currency' : offer.type === 'skillGem' ? 'gem' : offer.type === 'baseItem' ? 'gear' : (offer.chase ? 'unique chase' : 'unique');
            let badge = cls === 'currency' ? '재화' : cls === 'gem' ? '젬' : cls === 'gear' ? '장비' : (offer.chase ? '체이싱' : '고유');
            let tooltip = encodeURIComponent(getBlackMarketOfferTooltipHtml(offer));
            let richDesc = `${desc}${price}`;
            let isLocked = !!(game.blackMarket && game.blackMarket.lockedOffers && game.blackMarket.lockedOffers[idx]);
            let lockLabel = isLocked ? '🔒 잠금' : '🔓 잠금';
            return `<div class="market-black-offer ${cls}"><div><span class="market-black-badge ${cls}">${badge}</span> <span class="market-black-label" data-info-tooltip-anchor="1" data-market-tooltip="${tooltip}" onmouseenter="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmousemove="showBlackMarketOfferTooltip(event,this.dataset.marketTooltip)" onmouseleave="hideInfoTooltip()">${richDesc}</span></div><div style="display:flex; gap:4px;"><button onclick="buyBlackMarketOffer(${idx})">구매</button><button onclick="toggleBlackMarketOfferLock(${idx})">${lockLabel}</button></div></div>`;
        }).join('');
        let atCap = slotCount >= BLACK_MARKET_MAX_SLOT_COUNT;
        let expandLabel = atCap ? `품목 한도 최대치 (${slotCount}/${BLACK_MARKET_MAX_SLOT_COUNT})` : `신성한 오브 ${getBlackMarketSlotExpandCost()}개로 품목 +1 (${slotCount}/${BLACK_MARKET_MAX_SLOT_COUNT})`;
        bmEl.innerHTML = `<div class="market-title">암거래상 · 다음 갱신 ${mm}:${ss}</div><div style="display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px;">${offers}</div><button style="margin-top:6px;" onclick="expandBlackMarketSlotsByDivine()" ${atCap ? 'disabled' : ''}>${expandLabel}</button>`;
    }
}


safeExposeGlobals({ showBlackMarketOfferTooltip, marketResetPassiveTreeByDivine, marketAnnulSelectedStat, marketExpandInventoryByDivine, marketExpandJewelInventoryByDivine, renderMarketUI, refreshBlackMarket, buyBlackMarketOffer, toggleBlackMarketOfferLock, getBlackMarketSlotExpandCost, getBlackMarketSlotCount, isBlackMarketSlotCapReached, expandBlackMarketSlotsByDivine, upgradeSelectedItemBase, confirmSelectedItemBaseUpgrade, closeBaseUpgradeOverlay });
