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


Object.assign(window, { selectForCrafting, equipItem, equipItemById, unequipItem, salvageItemById, toggleItemLockById });

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

function renderMarketUI() {
    let lockedEl = document.getElementById('ui-market-locked');
    let panelEl = document.getElementById('ui-market-panel');
    if (!lockedEl || !panelEl) return;
    let unlocked = isMarketUnlocked();
    lockedEl.style.display = unlocked ? 'none' : 'block';
    panelEl.style.display = unlocked ? 'block' : 'none';
    if (!unlocked) return;

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
    }
}


Object.assign(window, { marketResetPassiveTreeByDivine, marketAnnulSelectedStat, marketExpandInventoryByDivine, marketExpandJewelInventoryByDivine, renderMarketUI });
