// Item module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.items = {
  get db() { return window.UNIQUE_DB; },
  get orbs() { return window.ORB_DB; },
  get market() { return window.MARKET_EXCHANGES; },
  // TODO: move item crafting/equip/salvage functions from main/ui into here.
};

// Phase-3 extracted equipment/inventory handlers.
function selectForCrafting(ref, isEquip) {
    craftSelectedRef = ref;
    craftSelectedIsEquip = isEquip;
    updateStaticUI();
}

function getEquipCandidateSlots(item) {
    if (!item) return [];
    if (item.slot === '반지') return ['반지1', '반지2'];
    if (item.slot === '장갑') return ['장갑1', '장갑2'];
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
    return candidates[0];
}

function isDualSlotItem(slotName) {
    return slotName === '반지' || slotName === '장갑';
}

function getDualSlotDisplayLabel(targetSlot) {
    if (targetSlot === '반지1') return '왼쪽 반지';
    if (targetSlot === '반지2') return '오른쪽 반지';
    if (targetSlot === '장갑1') return '오른쪽 장갑';
    if (targetSlot === '장갑2') return '왼쪽 장갑';
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
    let old = game.equipment[targetSlot];
    let movedId = item.id;
    game.equipment[targetSlot] = item;
    if (old) game.inventory[idx] = old;
    else game.inventory.splice(idx, 1);
    if (!craftSelectedIsEquip && craftSelectedRef === movedId) {
        craftSelectedRef = targetSlot;
        craftSelectedIsEquip = true;
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
    if (craftSelectedIsEquip && craftSelectedRef === slot) {
        craftSelectedRef = item.id;
        craftSelectedIsEquip = false;
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

function changeZone(id) {
    game.inTicketBossFight = false;
    if (game.beehive && game.beehive.inRun) return addLog('벌집 원정 중에는 던전 포기 전까지 다른 지역으로 이동할 수 없습니다.', 'attack-monster');
    if (typeof id === 'number' && id > game.maxZoneId) return;
    if (id === METEOR_FALL_ZONE_ID) {
        let st = ensureStarWedgeState();
        if (!st.unlocked) return addLog('운석 낙하 지점은 아직 잠겨 있습니다.', 'attack-monster');
        if (!st.skyRiftReady) return addLog('하늘의 균열 게이지가 100%가 되어야 입장 가능합니다.', 'attack-monster');
        st.activeMeteorTier = Math.max(1, Math.floor(st.skyRiftMinTier || 1));
        st.skyRiftReady = false;
        st.skyRiftGauge = 0;
        st.skyRiftMinTier = null;
    }
    if (typeof id === 'string' && id.includes('_boss_')) {
        let zone = getZone(id);
        if (!zone || (game.season || 1) < (zone.reqSeason || 2)) return addLog('아직 시즌 보스가 잠겨 있습니다.', 'attack-monster');
        if ((game.currencies[zone.key] || 0) <= 0) return addLog(`입장 열쇠(${ORB_DB[zone.key].name})가 필요합니다.`, 'attack-monster');
        game.currencies[zone.key]--;
        game.inTicketBossFight = true;
    }
    if (id === LABYRINTH_ZONE_ID) {
        if ((game.season || 1) < 3) return addLog('고대 미궁은 시즌3부터 개방됩니다.', 'attack-monster');
        if ((game.maxZoneId || 0) < 5) return addLog('액트 5를 먼저 클리어해야 미궁에 입장할 수 있습니다.', 'attack-monster');
    }
    if (typeof id === 'number' && id >= ABYSS_START_ZONE_ID) {
        let depth = Math.max(1, id - (ABYSS_START_ZONE_ID - 1));
        game.abyssEndlessDepth = Math.max(depth, Math.floor(game.abyssEndlessDepth || depth));
        game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
        if (game.abyssEndlessDepth >= 20 && !game.abyssUnlockedDepths.includes(game.abyssEndlessDepth)) game.abyssUnlockedDepths.push(game.abyssEndlessDepth);
    }
    game.currentZoneId = id;
    game.killsInZone = 0;
    addLog(`🗺️ ${getZone(id).name} 이동`, "season-up");
    startMoving(true);
    updateStaticUI();
}


safeExposeGlobals({ selectForCrafting, equipItem, equipItemById, unequipItem, salvageItemById, toggleItemLockById });

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
    if (!confirm(`신성한 오브 ${cost}개로 주얼 인벤토리를 영구히 5칸 확장할까요? (시즌 종료 후에도 초기화되지 않음)`)) return;
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
    let candidates = BASE_ITEM_DB.filter(base => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier).sort((a,b)=>a.reqTier-b.reqTier);
    let nextBase = candidates[0];
    if (!nextBase) return addLog('해당 계열의 다음 베이스가 없습니다.', 'attack-monster');
    let isTopBase = candidates.length === 1;
    let costChaos = Math.max(5, 3 + Math.floor((nextBase.reqTier - currentBase.reqTier) * 2.5));
    let costDivine = isTopBase ? 1 : 0;
    game.pendingBaseUpgrade = { itemId: item.id, nextBaseId: nextBase.id, costChaos: costChaos, costDivine: costDivine };
    let titleEl = document.getElementById('base-upgrade-title');
    let bodyEl = document.getElementById('base-upgrade-body');
    if (titleEl) titleEl.innerText = `${currentBase.name} → ${nextBase.name}`;
    if (bodyEl) bodyEl.innerText = `비용: 카오스 오브 ${costChaos}${costDivine > 0 ? ` + 신성한 오브 ${costDivine}` : ''}`;
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.classList.add('show');
}

function closeBaseUpgradeOverlay() {
    game.pendingBaseUpgrade = null;
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.classList.remove('show');
}

function confirmSelectedItemBaseUpgrade() {
    let pending = game.pendingBaseUpgrade;
    if (!pending) return;
    let item = (game.inventory || []).find(v => v && v.id === pending.itemId);
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
    item.name = nextBase.name;
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
        let base = chooseItemBase(rndChoice(['무기','투구','갑옷','장갑','신발']), tier);
        return { type:'baseItem', name:`${base.name} 베이스`, slot: base.slot, reqTier:tier, priceKey:'chaos', price:2+Math.floor(tier/3) };
    }
    if (roll < 0.9) {
        let missing = Object.keys(SKILL_DB).filter(k => SKILL_DB[k].isGem && !(game.skills||[]).includes(k));
        if (missing.length>0) return { type:'skillGem', name:rndChoice(missing), priceKey:'chaos', price:5 };
    }
    let uniq = rndChoice(UNIQUE_DB.filter(u => (u.reqTier||1) <= tier+2));
    return { type:'unique', name:uniq.name, slot:uniq.slots[0], reqTier:uniq.reqTier||tier, priceKey:'divine', price:1 };
}

function refreshBlackMarket(force) {
    if (!isMarketUnlocked()) return;
    game.blackMarket = game.blackMarket || { nextRefreshAt: 0, extraSlots: 0, offers: [] };
    let now = Date.now();
    if (!force && now < (game.blackMarket.nextRefreshAt || 0)) return;
    let count = 6 + Math.max(0, Math.floor(game.blackMarket.extraSlots || 0));
    game.blackMarket.offers = Array.from({ length: count }, (_, i) => buildBlackMarketOffer(i));
    game.blackMarket.nextRefreshAt = now + (10 * 60 * 1000);
}

function expandBlackMarketSlotsByDivine(){
    if ((game.currencies.divine||0) < 1) return addLog('신성한 오브가 부족합니다.', 'attack-monster');
    game.currencies.divine--;
    game.blackMarket = game.blackMarket || { nextRefreshAt: 0, extraSlots: 0, offers: [] };
    game.blackMarket.extraSlots = Math.max(0, Math.floor(game.blackMarket.extraSlots||0)) + 1;
    refreshBlackMarket(true);
    addLog('🕶️ 암거래상 품목 슬롯이 늘어났습니다.', 'loot-unique');
    updateStaticUI();
}

function buyBlackMarketOffer(idx){
    refreshBlackMarket(false);
    let offer = (game.blackMarket && game.blackMarket.offers || [])[idx]; if(!offer) return;
    if (offer.type==='exchange') {
        if ((game.currencies[offer.from]||0) < offer.need) return addLog('재화가 부족합니다.', 'attack-monster');
        game.currencies[offer.from]-=offer.need; awardCurrency(offer.to, offer.gain);
    } else if (offer.type==='skillGem') {
        if ((game.currencies[offer.priceKey]||0) < offer.price) return addLog('재화가 부족합니다.', 'attack-monster');
        if ((game.skills||[]).includes(offer.name)) return addLog('이미 보유한 젬입니다.', 'attack-monster');
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
            return `<div style="background:#101722; border:1px solid #2b3f59; border-radius:8px; padding:8px;">
                <div style="margin-bottom:6px; color:#d5e7fa;">${ORB_DB[recipe.from].name} ${recipe.need}개 → ${ORB_DB[recipe.to].name} ${recipe.gain}개</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button onclick="exchangeAtMarket('${recipe.id}', false)" ${maxTimes < 1 ? 'disabled' : ''}>1회 교환</button>
                    <button onclick="exchangeAtMarket('${recipe.id}', true)" style="background:#5d6d7e; border-color:#465664;" ${maxTimes < 1 ? 'disabled' : ''}>모두 교환 (${spendAll}→${gainAll})</button>
                    <span style="align-self:center; color:#89a8c7; font-size:0.82em;">보유: ${have}</span>
                </div>
            </div>`;
        }).join('');
    }
    let passiveEl = document.getElementById('ui-market-service-passive');
    if (passiveEl) {
        let hasSpent = Array.isArray(game.passives) && game.passives.length > 0;
        passiveEl.innerHTML = `<div style="margin-bottom:4px; color:#d5e7fa;">신성한 오브 1개 → 패시브 트리 전체 초기화 + 포인트 반환</div>
        <button onclick="marketResetPassiveTreeByDivine()" ${hasSpent ? '' : 'disabled'}>패시브 트리 전체 초기화</button>`;
    }
    let annulEl = document.getElementById('ui-market-service-annul');
    if (annulEl) {
        let item = getSelectedCraftItem();
        let stats = (item && Array.isArray(item.stats)) ? item.stats : [];
        let options = stats.map((stat, idx) => `<option value="${idx}">${idx + 1}. ${stat.statName} +${formatValue(stat.id, stat.val)}</option>`).join('');
        annulEl.innerHTML = `<div style="margin-bottom:4px; color:#d5e7fa;">신성한 오브 2개 → 선택 장비의 원하는 옵션 1줄 소멸</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <select id="sel-market-annul-stat" ${stats.length <= 0 ? 'disabled' : ''} style="min-width:260px; background:#0e141d; color:#dbe9ff; border:1px solid #35506b; border-radius:6px; padding:5px 8px;">${options || '<option>옵션 없음</option>'}</select>
            <button onclick="marketAnnulSelectedStat(Number(document.getElementById('sel-market-annul-stat').value))" ${stats.length <= 0 ? 'disabled' : ''}>옵션 1줄 소멸</button>
        </div>
        <div style="margin-top:4px; color:#89a8c7; font-size:0.82em;">대상: ${item ? `[${item.name}]` : '제작 대상 장비를 먼저 선택하세요.'}</div>`;
    }
    let invEl = document.getElementById('ui-market-service-inv');
    if (invEl) {
        let cost = getMarketInventoryExpandCost();
        invEl.innerHTML = `<div style="margin-bottom:4px; color:#d5e7fa;">신성한 오브 ${cost}개 → 인벤토리 영구 5칸 확장 (현재: ${getInventoryLimit()}칸)</div>
        <button onclick="marketExpandInventoryByDivine()">인벤토리 확장</button>`;
    }
    let jewelInvEl = document.getElementById('ui-market-service-jewel-inv');
    if (jewelInvEl) {
        if ((game.season || 1) < 5) {
            jewelInvEl.innerHTML = `<div style="color:#89a8c7; font-size:0.82em;">주얼 해금 후 신성한 오브로 주얼 인벤토리 확장이 열립니다.</div>`;
        } else {
            let cost = getJewelMarketExpandCost();
        jewelInvEl.innerHTML = `<div style="margin-bottom:4px; color:#d5e7fa;">신성한 오브 ${cost}개 → 주얼 인벤토리 영구 5칸 확장 (현재: ${getJewelInventoryLimit()}칸)</div>
            <button onclick="marketExpandJewelInventoryByDivine()">주얼 인벤토리 확장</button>`;
    }
    let pollenEl = document.getElementById('ui-market-service-pollen');
    if (pollenEl) {
        let open = (game.season || 1) >= 8;
        pollenEl.style.display = open ? 'block' : 'none';
        if (open) pollenEl.innerHTML = `<div style="margin-bottom:4px; color:#d5e7fa;">꽃가루 교환소</div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button onclick="craftBeehiveCurrency('key')" ${(game.currencies.pollen||0)<200?'disabled':''}>꽃가루 200 → 열쇠</button>
            <button onclick="craftBeehiveCurrency('stinger')" ${(game.currencies.pollen||0)<600?'disabled':''}>꽃가루 600 → 독벌침</button>
            <button onclick="craftBeehiveCurrency('honey')" ${(game.currencies.pollen||0)<2000?'disabled':''}>꽃가루 2000 → 벌꿀</button>
        </div>`;
    }
    }
    let bmEl = document.getElementById('ui-market-black');
    if (bmEl) {
        let remain = Math.max(0, Math.floor(((game.blackMarket && game.blackMarket.nextRefreshAt || 0) - Date.now()) / 1000));
        let mm = String(Math.floor(remain / 60)).padStart(2,'0');
        let ss = String(remain % 60).padStart(2,'0');
        let offers = (game.blackMarket && game.blackMarket.offers || []).map((offer, idx) => {
            if (!offer) return `<div style="opacity:.5;">품절</div>`;
            let desc = offer.type==='exchange' ? `${ORB_DB[offer.from].name} ${offer.need} → ${ORB_DB[offer.to].name} ${offer.gain}` : (offer.type==='skillGem' ? `미보유 젬 [${offer.name}]` : offer.name);
            let price = offer.type==='exchange' ? '' : ` (${ORB_DB[offer.priceKey].name} ${offer.price})`;
            return `<div style="display:flex; justify-content:space-between; gap:6px;"><span>${desc}${price}</span><button onclick="buyBlackMarketOffer(${idx})">구매</button></div>`;
        }).join('');
        bmEl.innerHTML = `<div style="margin-bottom:6px; color:#d5e7fa;">암거래상 · 다음 갱신 ${mm}:${ss}</div><div style="display:grid; gap:5px;">${offers}</div><button style="margin-top:6px;" onclick="expandBlackMarketSlotsByDivine()">신성한 오브 1개로 품목 +1</button>`;
    }
}


safeExposeGlobals({ marketResetPassiveTreeByDivine, marketAnnulSelectedStat, marketExpandInventoryByDivine, marketExpandJewelInventoryByDivine, renderMarketUI, refreshBlackMarket, buyBlackMarketOffer, expandBlackMarketSlotsByDivine, upgradeSelectedItemBase, confirmSelectedItemBaseUpgrade, closeBaseUpgradeOverlay });
