
function getCodexSlotOrder() {
    return ['무기', '방패', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'];
}


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


function getInventoryItemVisualAsset(item, kind) {
    return pickInventoryItemVisualAsset(item, kind);
}

function pickInventoryItemVisualAsset(item, kind) {
    let visuals = typeof ITEM_VISUAL_ASSET_DB !== 'undefined' ? ITEM_VISUAL_ASSET_DB : null;
    if (!visuals) return '';
    if (kind === 'jewel') return visuals.jewel;
    if (kind === 'talisman') return item && item.family === 'talisman' ? stumpBox.iconPath(item) : visuals.talisman;
    if (kind === 'core') return coreItems.icon(item);
    return getEquipmentGridVisualAsset(item);
}

function renderInventoryItemVisual(item, kind, className) {
    let asset = getInventoryItemVisualAsset(item, kind);
    if (!asset) return '';
    let label = (item && (item.name || item.baseName)) || '아이템';
    return `<img class="${className || 'inventory-item-visual'}" src="${asset}" alt="" aria-hidden="true" data-item-visual-label="${typeof escapeHTML === 'function' ? escapeHTML(label) : label}">`;
}

safeExposeGlobals({ getInventoryItemVisualAsset, renderInventoryItemVisual });

function getEquipmentGridVisualAsset(item) {
    return bagItems.artOf(item) || pickEquipmentGridVisualAsset(item);
}

function pickEquipmentGridVisualAsset(item) {
    const visuals = ITEM_VISUAL_ASSET_DB;
    if (!item) return visuals.equipment.default;
    const grid = visuals.equipmentGrid;
    if ((item.rarity || item.type) === 'unique' && Object.hasOwn(grid.uniqueAssets, item.name)) return grid.uniqueAssets[item.name];
    const exact = grid.baseAssets[item.baseId];
    if (exact) return exact;
    const slot = String(item.slot || '').replace(/[123]$/, '');
    if (slot === '무기') {
        const label = [item.baseId, item.baseName, item.name].filter(Boolean).join(' ').toLowerCase();
        const match = visuals.weaponKeywords.find(row => row.terms.some(term => label.includes(term)));
        if (match) return match.asset;
    }
    return visuals.equipment[slot] || visuals.equipment.default;
}

/** @returns {{columns:number, rows:number}} */
function getEquipmentInventoryFootprint(item) {
    let slot = String((item && item.slot) || '').replace(/[123]$/, '');
    if (slot === '반지' || slot === '목걸이') return { columns: 1, rows: 1 };
    if (slot === '허리띠') return { columns: 2, rows: 1 };
    if (slot === '투구' || slot === '장갑' || slot === '신발' || slot === '방패') return { columns: 2, rows: 2 };
    if (slot === '갑옷') return { columns: 2, rows: 2 };
    if (slot !== '무기') return { columns: 1, rows: 1 };
    // 무기: 대검 대분류는 2×3, 완드 · 로드 · 홀 · 초점봉은 1×2, 나머지는 1×3(세로 4칸 무기는 없다, 2026-10-03).
    if (getWeaponCategoryId(item) === 'greatsword') return { columns: 2, rows: 3 };
    let label = `${item && item.baseId || ''} ${item && item.baseName || ''} ${item && item.name || ''}`.toLowerCase();
    if (/완드|wand|scepter|셉터|초점|focus|로드|rod|봉|홀$/.test(label)) return { columns: 1, rows: 2 };
    return { columns: 1, rows: 3 };
}

/** A unique's picture from its definition, before one drops (the codex and the hunt targets, js/unique-codex-ui.js). */
function getUniqueEntryVisualAsset(entry) {
    const rule = UNIQUE_EQUIPMENT_RULES[entry.name];
    return getEquipmentGridVisualAsset({ rarity: 'unique', name: entry.name, slot: entry.slots[0], baseId: rule ? rule.baseId : '' });
}

safeExposeGlobals({ getEquipmentGridVisualAsset, getEquipmentInventoryFootprint, getUniqueEntryVisualAsset });

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
    let item = isEquip ? game.equipment[ref] : (game.inventory || []).find(row => row && Number(row.id) === Number(ref));
    if (item && item.hallReplica) {
        addLog('전당 소장품은 원본 상태를 보존하므로 제작할 수 없습니다.', 'attack-monster');
        return false;
    }
    if (bagItems.isSpecial(item)) {
        addLog('주얼, 코어, 액막이는 제작할 수 없습니다.', 'attack-monster');
        return false;
    }
    craftingSelectionState.ref = ref;
    craftingSelectionState.isEquip = isEquip;
    updateStaticUI();
    return true;
}

function copyCraftResultStat(stat) {
    if (!stat) return null;
    return {
        id: stat.id || '',
        statName: stat.statName || '',
        val: stat.val,
        tier: stat.tier,
        lockedByHoney: !!stat.lockedByHoney,
        lockedByRift: !!stat.lockedByRift,
        unremovable: !!stat.unremovable,
        venomStingerBonus: !!stat.venomStingerBonus
    };
}

/** 허리띠의 액막이 칸 수(js/colony-wards.js beltRoll): 축복의 꽃잎이 다시 굴리면 제작실의 제작 경과에 "액막이 칸 2 → 3"으로 나온다
 * (js/crafting-result-ui.js getWardRows). 허리띠가 아니면 없다. */
function craftResultWardSlots(item) {
    return typeof colonyWards === 'object' ? colonyWards.beltRoll(item) : undefined;
}

function snapshotCraftResultItem(item) {
    if (!item) return null;
    return {
        name: item.name || '',
        baseName: item.baseName || '',
        rarity: item.rarity || 'normal',
        quality: Math.max(0, Math.floor(Number(item.quality) || 0)),
        corrupted: !!item.corrupted,
        sockets: equipmentSockets.count(item),
        uniqueEffect: item.uniqueEffect || '',
        wardSlots: craftResultWardSlots(item),
        baseStats: (item.baseStats || []).map(copyCraftResultStat).filter(Boolean),
        stats: (item.stats || []).map(copyCraftResultStat).filter(Boolean),
        chaosInfusion: copyCraftResultStat(item.chaosInfusion),
        encroachedStat: copyCraftResultStat(item.encroached && item.encroached.chosen)
    };
}

const craftingResultLedger = (() => {
    let latest = null, sequence = 0;

    function begin(item, meta) {
        if (!item) return null;
        return { itemRef: item, before: snapshotCraftResultItem(item), meta: { ...(meta || {}) }, seq: ++sequence };
    }

    /** A craft wrapped in another (the crafting workspace around useCurrency) keeps the inner one's outcome line. */
    function commit(token, item) {
        if (!token || !item || token.itemRef !== item) return null;
        let after = snapshotCraftResultItem(item);
        const inner = latest && latest.itemRef === item && latest.seq > token.seq ? latest.meta.outcome : undefined;
        const meta = inner && !token.meta.outcome ? { ...token.meta, outcome: inner } : token.meta;
        latest = { itemRef: item, before: token.before, after, meta, seq: token.seq, afterKey: JSON.stringify(after) };
        return latest;
    }

    function getForItem(item) {
        if (!latest || latest.itemRef !== item) return null;
        return JSON.stringify(snapshotCraftResultItem(item)) === latest.afterKey ? latest : null;
    }

    /** The latest result's item changed again within the same craft (성화의 뿌리 pick): its after becomes the item now. */
    function amend(item) {
        if (!latest || latest.itemRef !== item) return null;
        const after = snapshotCraftResultItem(item);
        latest = { ...latest, after, afterKey: JSON.stringify(after) };
        return latest;
    }

    function clear() { latest = null; }

    return { begin, commit, amend, getForItem, clear };
})();

function getEquipCandidateSlots(item, targetGame = game) {
    if (!item || getPassiveEquipmentRestriction(item, targetGame)) return [];
    if (item.slot === '반지') return getTranscendentVoidPassiveCount('thirdFinger', targetGame) > 0 ? ['반지1', '반지2', '반지3'] : ['반지1', '반지2'];
    if (item.slot === '장갑') return ['장갑1', '장갑2'];
    const special = bagItems.candidateSlots(item, targetGame); // 주얼, 코어, 액막이(js/bag-items.js)
    if (special) return special;
    let warriorDualTrain = hasKeystone('w3', targetGame);
    if (item.slot === '무기') return warriorDualTrain ? ['무기', '방패'] : ['무기'];
    return [item.slot];
}

function canEquipItemToSlot(item, preferredSlot) {
    return !!preferredSlot && getEquipCandidateSlots(item).includes(preferredSlot)
        && combatEquipmentStats.inspect(item, preferredSlot).ok;
}

function tryAutoEquipEmptySlot(item) {
    if (!item || !game.settings || game.settings.autoEquipEmptySlots === false) return null;
    return equipIntoFirstEmptySlot(item);
}

/** Puts the item into its first empty candidate slot when the requirements allow. Returns the slot or null. */
function equipIntoFirstEmptySlot(item) {
    let slot = getEquipCandidateSlots(item).find(candidate => candidate && Object.prototype.hasOwnProperty.call(game.equipment, candidate) && !game.equipment[candidate]);
    if (!slot || !combatEquipmentStats.inspect(item, slot).ok) return null;
    delete item.legacyRequirementGrace;
    game.equipment[slot] = item;
    if (typeof normalizeSupportLoadout === 'function') normalizeSupportLoadout(true);
    return slot;
}

/** 가방의 장비로 빈 장비 칸을 채운다 — 티어 · 등급이 높은 것부터. 장비 창 "빈 칸 채우기"에서 사용한다. Returns the equipped count. */
function equipIntoEmptySlots(items) {
    const rank = item => (Number(item.itemTier) || 0) * 10 + JEWEL_RARITY_ORDER.indexOf(item.rarity);
    let equipped = 0;
    for (const item of [...(items || [])].filter(Boolean).sort((a, b) => rank(b) - rank(a))) {
        const index = game.inventory.indexOf(item);
        if (index < 0 || !equipIntoFirstEmptySlot(item)) continue;
        game.inventory.splice(index, 1);
        equipped++;
    }
    return equipped;
}

/** 가방에 맞는 장비가 있는 빈 장비 칸 수("빈 칸 채우기" 단추의 숫자). */
function countFillableEmptySlots() {
    const empty = Object.keys(game.equipment).filter(slot => !game.equipment[slot]);
    if (!empty.length) return 0;
    return empty.filter(slot => game.inventory.some(item => item && getEquipCandidateSlots(item).includes(slot)
        && combatEquipmentStats.inspect(item, slot).ok)).length;
}

function pickEquipSlot(item, preferredSlot) {
    let candidates = getEquipCandidateSlots(item);
    if (candidates.length === 0) return null;
    if (preferredSlot && candidates.includes(preferredSlot)) return preferredSlot;
    if (item.slot === COLONY_WARD_RULES.slot) return colonyWards.pickSlot(game);
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
        let warriorDualTrain = typeof hasKeystone === 'function' && hasKeystone('w3');
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
    return slotName === '무기' && typeof hasKeystone === 'function' && hasKeystone('w3');
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
    const restriction = getPassiveEquipmentRestriction(item);
    if (restriction) return addLog(restriction, 'attack-monster', { toast: true });
    if (bagItemsUi.equipSpecial(item, preferredSlot)) return; // 주얼은 그 장비의 빈 소켓에, 액막이는 열린 칸이 없으면 이유를 알린다
    let warriorDualTrain = typeof hasKeystone === 'function' && hasKeystone('w3');
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
    const eligibility = combatEquipmentStats.inspect(item, targetSlot);
    if (!eligibility.ok) return addLog('장착 실패, ' + eligibility.reason, 'attack-monster', { toast: true });
    delete item.legacyRequirementGrace;
    let old = game.equipment[targetSlot];
    if (old) delete old.legacyRequirementGrace;
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
    if (preferredSlot && !getEquipCandidateSlots(game.inventory[idx]).includes(preferredSlot)) return false;
    const targetItem = game.inventory[idx];
    equipItem(idx, preferredSlot);
    return Object.values(game.equipment).includes(targetItem) || !game.inventory.includes(targetItem); // 주얼은 소켓으로 가 가방에서만 빠진다
}

function equipSelectedCraftInventoryItem() {
    if (isCraftSelectionEquip()) return false;
    let itemId = getCraftSelectionRef();
    if (itemId === null) return false;
    return equipItemById(itemId);
}

function unequipItemToGrid(slot, column, row) {
    let item = game.equipment[slot];
    if (!item) return false;
    let hasTargetCell = Number.isFinite(Number(column)) && Number.isFinite(Number(row));
    let placementResult = hasTargetCell
        ? equipmentInventoryGridRuntime.canAdd(item, column, row, game)
        : equipmentInventoryGridRuntime.findAddPlacement(item, game);
    if (!placementResult.ok) {
        addLog(placementResult.reason || '인벤토리 공간이 부족해 장착 해제할 수 없습니다.', 'attack-monster');
        return false;
    }
    let itemKey = equipmentLoadoutRuntime.ensureItemIdentity(item);
    delete item.legacyRequirementGrace;
    game.inventory.push(item);
    game.equipment[slot] = null;
    game.equipmentInventoryPlacements = {
        ...(game.equipmentInventoryPlacements || {}),
        [itemKey]: placementResult.placement
    };
    if (isCraftSelectionEquip() && getCraftSelectionRef() === slot) {
        craftingSelectionState.ref = item.id;
        craftingSelectionState.isEquip = false;
    }
    normalizeSupportLoadout(true);
    updateStaticUI();
    return true;
}

function unequipItem(slot) {
    return unequipItemToGrid(slot);
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
    if (item.hallReplica) {
        addLog('전당 소장품의 보호 잠금은 해제할 수 없습니다.', 'attack-monster');
        return false;
    }
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

const BEEHIVE_TRAVEL_REFUSAL = '벌집 원정 중에는 [원정 포기] 전까지 다른 지역으로 이동할 수 없습니다.';
function warnBeehiveMapTravelBlocked() {
    if (typeof addLog === 'function') addLog(BEEHIVE_TRAVEL_REFUSAL, 'attack-monster');
    return true;
}
/** Runs that keep the hero until they end or are given up (벌집 원정, 경계 너머). changeZone and the deep sea refuse from inside one,
 * and so does every content start (getContentStartBlockReason, and 경계 너머 itself). Returns the refusal, or ''. */
function getHeldRunBlockReason() {
    if (isBeehiveRunLockedForMapTravel()) return BEEHIVE_TRAVEL_REFUSAL;
    return ensureBeyondBoundaryState(game).activeRun ? '경계 너머 도전을 먼저 마치거나 포기하세요.' : '';
}
/** Content starts (군락지, 벌집, 혼돈 밖, 심해, 나무꾼의 잔상, 대균열, 증표 시련) refuse from a held run and from inside an atlas map:
 * they set the zone themselves, so leaving the map that way skipped the portal changeZone spends. They refuse at the loop gate too
 * (time stands still there, as for hunting-ground travel; the loop then ended the run unplayed). Returns the refusal, or ''. */
function getContentStartBlockReason() {
    if (game.pendingLoopReady) return '⏸️ 루프 진행 대기 중에는 콘텐츠를 시작할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.';
    return getHeldRunBlockReason() || (atlas.inMap(game) ? atlas.runOpenReason(game) : '');
}

// ── 시간의 균열: 제단 배치/회수 + 융합 정산 ──────────────────────────────
// 흐름: 과거 클리어(altarOpen) → 같은 부위 고유 1개·희귀 1개 배치 → 미래 클리어 → resolveTimeRiftFusion.
function setTimeRiftPressure(delta) {
    let rift = ensureTimeRiftState();
    let inRift = game.currentZoneId === TIME_RIFT_PAST_ZONE_ID || game.currentZoneId === TIME_RIFT_FUTURE_ZONE_ID;
    if (inRift || rift.altarOpen) return addLog('시간압은 과거에 진입하기 전에만 바꿀 수 있습니다. 제단 아이템을 회수하면 다시 선택할 수 있습니다.', 'attack-monster');
    rift.pressure = Math.max(1, Math.min(TIME_RIFT_MAX_PRESSURE, rift.pressure + Math.floor(delta || 0)));
    updateStaticUI();
}

/** @returns {string|null} 시간의 균열 장비 융합 불가 사유. 가능하면 null. */
function getTimeRiftFusionMismatchReason(altarItem, candidate) {
    if (!altarItem || !candidate) return '제단에 고유 1개/희귀 1개가 필요합니다.';
    if (String(altarItem.slot || '') !== String(candidate.slot || '')) {
        return `부위 불일치 (${altarItem.slot} / ${candidate.slot}), 같은 부위로 맞춰주세요.`;
    }
    return null;
}

/** Shared admission for inventory candidates and the final altar action; null means eligible. */
function getTimeAltarItemIssue(item, rift = ensureTimeRiftState()) {
    if (!rift.altarOpen) return '먼저 과거를 클리어해 제단을 열어야 합니다.';
    if (!item) return '제단에 올릴 장비를 고르세요.';
    if (item.hallReplica) return '전당 소장품은 제단에 올릴 수 없습니다.';
    if (item.fusedRelic) return '이미 융합된 유물은 다시 시간을 건널 수 없습니다.';
    if (item.corrupted) return '타락한 장비는 제단에 올릴 수 없습니다.';
    if (item.loopSealed) return '봉인된 장비는 제단에 올릴 수 없습니다.';
    return getTimeAltarSlotIssue(item, rift);
}

function getTimeAltarSlotIssue(item, rift) {
    if (!['unique','rare'].includes(item.rarity)) return '고유 또는 희귀 장비만 올릴 수 있습니다.';
    const unique = item.rarity === 'unique';
    if (rift[unique ? 'altarUnique' : 'altarRare']) return '해당 제단 자리가 차 있습니다. 회수 후 다시 올려주세요.';
    const other = unique ? rift.altarRare : rift.altarUnique;
    return other ? getTimeRiftFusionMismatchReason(other, item) : null;
}

function placeItemOnTimeAltar() {
    let rift = ensureTimeRiftState();
    let item = getSelectedCraftItem();
    if (isCraftSelectionEquip()) return addLog('장착 중인 장비는 제단에 올릴 수 없습니다. 해제 후 올려주세요.', 'attack-monster');
    const issue = getTimeAltarItemIssue(item, rift);
    if (issue) return addLog(issue, 'attack-monster');
    let slotKey = item.rarity === 'unique' ? 'altarUnique' : 'altarRare';
    game.inventory = (game.inventory || []).filter(row => row && row.id !== item.id);
    rift[slotKey] = item;
    clearCraftSelection();
    addLog(`⏳ [${item.name}]${pickParticle(item.name, '을', '를')} 과거의 제단에 올렸습니다.${rift.altarUnique && rift.altarRare ? ' 두 자리가 모두 찼습니다. 미래로 건너가세요.' : ''}`, 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

function retrieveTimeAltarItems() {
    let rift = ensureTimeRiftState();
    if (!rift.altarUnique && !rift.altarRare) {
        if (!rift.altarOpen) return addLog('제단이 비어 있습니다.', 'attack-monster');
        rift.altarOpen = false;
        rift.activePressure = null;
        addLog('⏳ 빈 제단을 닫았습니다. 시간압을 다시 선택할 수 있습니다.', 'season-up');
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    let altarItems = [rift.altarUnique, rift.altarRare].filter(Boolean);
    if (!canStoreEquipmentItems(altarItems, game)) return addLog('인벤토리 공간이 부족합니다.', 'attack-monster');
    // guaranteedKeep: 회수 아이템이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    if (rift.altarUnique) { addItemToInventory(rift.altarUnique, { guaranteedKeep: true, skipAutoEquip: true }); rift.altarUnique = null; }
    if (rift.altarRare) { addItemToInventory(rift.altarRare, { guaranteedKeep: true, skipAutoEquip: true }); rift.altarRare = null; }
    rift.altarOpen = false;
    rift.activePressure = null;
    addLog('⏳ 제단의 아이템을 회수했습니다.', 'season-up');
    updateStaticUI();
    queueImportantSave(200);
}

// 미래 클리어 시 호출: 등급 판정 → 희귀의 추가 옵션을 (유실분 제외하고) 고유에 이식.
function resolveTimeRiftFusion() {
    let rift = ensureTimeRiftState();
    const mismatch = getTimeRiftFusionMismatchReason(rift.altarUnique, rift.altarRare);
    if (mismatch) { addLog(mismatch, 'attack-monster'); return null; }
    // 제단을 비우기 전에 결과물이 들어갈 공간부터 확보한다 — 실패 시 제단을 그대로 유지하고
    // 재도전(공간 확보 후 미래 재클리어)할 수 있게 한다.
    if (!canStoreEquipmentItems([rift.altarUnique], game)) {
        addLog('⌛ 융합이 보류되었습니다: 인벤토리 공간이 필요합니다. (제단은 유지됩니다. 공간 확보 후 미래를 다시 클리어하세요)', 'attack-monster');
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
    equipmentSockets.returnJewels(rift.altarRare); // the consumed rare's jewels stay the player's
    rift.altarUnique = null;
    rift.altarRare = null;
    rift.altarOpen = false;
    rift.activePressure = null;
    // guaranteedKeep: 융합 결과물이 습득 필터/자동해체에 걸려 유실되는 것을 방지한다.
    addItemToInventory(fused, { guaranteedKeep: true, skipAutoEquip: true });
    return { fused: fused, grade: grade, lost: lost, inherited: rareStats.length };
}

// Manual entry returns to the chosen act/abyss. Ticket encounters are not resumable for free.
// Automatic interruptions pass their own explicit return destination.
function prepareMeteorEncounterEntry(returnZoneId = Number.isInteger(game.currentZoneId) ? game.currentZoneId : null) {
    let st = ensureMeteorSiteState();
    st.activeMeteorTier = Math.max(8, getSkyRiftGaugeEffectiveTier({tier:st.skyRiftMinTier || 13}, st));
    st.meteorReturnZoneId = returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : null;
    st.skyRiftReady = false;
    st.skyRiftGauge = Math.max(0, Math.floor(st.skyRiftCarryGauge || 0));
    st.skyRiftCarryGauge = 0;
    st.skyRiftMinTier = null;
}

function getZoneTravelBlockReason(id) {
    const atlasReason = atlas.travelReason(game, id);
    if (atlasReason) return atlasReason;
    if (getZone(id)?.type === 'trial' && !contentProgression.isUnlocked('battleTrials')) {
        return '루프 3부터 전직을 해금한 뒤 시련에 도전할 수 있습니다.';
    }
    if (game.pendingLoopReady) {
        return '⏸️ 루프 진행 대기 중에는 사냥터로 이동할 수 없습니다. [루프 진행] 버튼으로 다음 루프를 시작하세요.';
    }
    return null;
}

function changeZone(id) {
    const blockReason = getZoneTravelBlockReason(id);
    if (blockReason) return addLog(blockReason, 'attack-monster');
    let boundary = ensureBeyondBoundaryState(game);
    const held = id === BEYOND_BOUNDARY_ZONE_ID && boundary.activeRun ? '' : getHeldRunBlockReason();
    if (held) return addLog(held, 'attack-monster');
    if (id === BEYOND_BOUNDARY_ZONE_ID && !boundary.activeRun)
        return addLog('경계 너머 화면에서 단계와 성장시킬 인장을 선택해 도전을 시작하세요.', 'attack-monster');
    game.inTicketBossFight = false;
    if (typeof id === 'number' && id > game.maxZoneId) return;
    if (id === METEOR_FALL_ZONE_ID) {
        let st = ensureMeteorSiteState();
        if (!st.unlocked) return addLog('운석 낙하 지점은 아직 잠겨 있습니다.', 'attack-monster');
        if (!st.skyRiftReady) return addLog('하늘의 균열 게이지가 100%가 되어야 입장 가능합니다.', 'attack-monster');
        prepareMeteorEncounterEntry();
    }
    let zone = getZone(id);
    if (!zone) return addLog('이동할 수 없는 지역입니다.', 'attack-monster');
    if (zone.type === 'seasonBoss') {
        if ((game.season || 1) < (zone.reqSeason || 2)) {
            let lockedMessage = zone.rivalBlade ? '버려진 날붙이들은 루프 31부터 당신을 찾아옵니다.'
                : (zone.milestonePinnacle ? '아틀라스 최종 관문은 루프 31부터 모습을 드러냅니다.' : '아직 뿌리 보스가 잠겨 있습니다.');
            return addLog(lockedMessage, 'attack-monster');
        }
        let gate = getSeasonBossProgressGate(zone, game);
        if (!gate.met) return addLog(`🔒 ${gate.label} 조건을 먼저 달성해야 합니다.`, 'attack-monster');
        if (!zone.milestonePinnacle) {
            if ((game.currencies[zone.key] || 0) <= 0) return addLog(`입장 열쇠(${ORB_DB[zone.key].name})가 필요합니다.`, 'attack-monster');
            game.currencies[zone.key]--;
        }
        game.inTicketBossFight = true;
    }
    if (zone.type === 'timeRift') {
        let rift = ensureTimeRiftState();
        if ((game.season || 1) < TIME_RIFT_UNLOCK_LOOP) return addLog(`시간의 균열은 루프 ${TIME_RIFT_UNLOCK_LOOP}부터 열립니다.`, 'attack-monster');
        const mismatch = zone.riftPhase === 'future' ? getTimeRiftFusionMismatchReason(rift.altarUnique, rift.altarRare) : null;
        if (mismatch) return addLog(mismatch, 'attack-monster');
        rift.activePressure = rift.pressure;
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
    atlasRun.travel(zone);
    game.killsInZone = 0;
    addLog(`🗺️ ${zone.name} 이동`, "season-up");
    // 지도 선택은 귀환 완료가 아니라 새 전투로 출발하는 이동이다.
    runItemStartMoving(false);
    updateStaticUI();
}


safeExposeGlobals({ selectForCrafting, equipItem, equipItemById, canEquipItemToSlot, equipSelectedCraftInventoryItem, unequipItem, unequipItemToGrid, salvageItemById, toggleItemLockById, getSelectedCraftItem, getCraftSelectionRef, isCraftSelectionEquip, clearCraftSelection, ensureCraftSelectionValid, tryAutoEquipEmptySlot, hasActiveBeehiveRuntimeState, clearBeehiveRuntimeState, reconcileBeehiveRunState, isBeehiveRunLockedForMapTravel, warnBeehiveMapTravelBlocked, getTimeRiftFusionMismatchReason, getTimeAltarItemIssue, craftingResultLedger });

// Phase-3 extracted market/crafting service handlers.
async function marketResetPassiveTreeByDivine() {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 패시브를 초기화할 수 없습니다.', 'attack-monster');
    if (!isMarketUnlocked()) return addLog('장비 제련을 해금하면 거래소를 이용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.goldenRule || 0) < 1) return addLog('황금률이 부족합니다.', 'attack-monster');
    let spentNodes = getPaidPassiveNodeIds(game.passives).length;
    if (spentNodes <= 0) return addLog('초기화할 패시브 노드가 없습니다.', 'attack-monster');
    let passiveSnapshot = game.passives.slice();
    if (!await requestGameConfirmation(`황금률 1개를 사용해 패시브 트리를 초기화하고 포인트 ${spentNodes}점을 반환합니다.`, {
        title: '패시브 트리 전체 초기화',
        tone: 'danger',
        confirmLabel: '초기화'
    })) return;
    if (!isMarketUnlocked() || game.woodsmanBuildLock || (game.currencies.goldenRule || 0) < 1
        || game.passives.length !== passiveSnapshot.length || game.passives.some((nodeId, index) => nodeId !== passiveSnapshot[index])) {
        return addLog('확인 중 패시브 또는 재화 상태가 변경되어 초기화를 취소했습니다.', 'attack-monster');
    }
    game.currencies.goldenRule -= 1;
    // 직업 시작점은 소유 목록에 넣지 않아도 항상 무료 연결점으로 계산된다.
    const grantedPoints = passiveRouting.paleBonus(game);
    game.passives = [];
    game.passiveAttributeChoices = {};
    game.passivePoints = Math.max(0, game.passivePoints + spentNodes - grantedPoints);
    calculateReachableNodes();
    refreshPassiveVisibility();
    addLog(`🧠 패시브 트리 초기화 완료! 포인트 ${spentNodes}점 반환`, 'season-up');
    updateStaticUI();
}

async function marketAnnulSelectedStat(statIdx) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.', 'attack-monster');
    if (!isMarketUnlocked()) return addLog('장비 제련을 해금하면 거래소를 이용할 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 제작 대상 장비를 선택하세요.', 'attack-monster');
    let removable = getAnnulmentRemovableStats(item);
    if (item.rarity === 'normal' || removable.length <= 0) return addLog('소멸시킬 수 있는 옵션이 없습니다. 보호된 옵션은 제거할 수 없습니다.', 'attack-monster');
    if ((game.currencies.goldenRule || 0) < 2) return addLog('황금률이 부족합니다. (필요: 2)', 'attack-monster');
    let idx = Math.floor(Number(statIdx));
    let selected = removable.find(row => row.index === idx);
    if (!selected) return addLog('제거할 수 있는 옵션을 선택하세요. 밀랍/균열/잠식으로 보호된 옵션은 유지됩니다.', 'attack-monster');
    let target = selected.stat;
    let targetName = target.statName || getStatName(target.id);
    if (!await requestGameConfirmation(`황금률 2개를 소모하여 [${item.name}]의 "${targetName}" 옵션을 제거합니다.`, {
        title: '옵션 소멸',
        tone: 'danger',
        confirmLabel: '옵션 제거'
    })) return;
    if (!isMarketUnlocked() || game.woodsmanBuildLock || getSelectedCraftItem() !== item || !getAnnulmentRemovableStats(item).some(row => row.stat === target) || item.stats[idx] !== target || (game.currencies.goldenRule || 0) < 2) {
        return addLog('확인 중 장비 또는 재화 상태가 변경되어 옵션 소멸을 취소했습니다.', 'attack-monster');
    }
    game.currencies.goldenRule -= 2;
    item.stats.splice(idx, 1);
    updateItemName(item);
    addLog(`💥 옵션 소멸 완료: [${item.name}] - ${targetName}`, 'loot-unique');
    updateStaticUI();
}

/** Why the keep service cannot run now ('' when it can): build lock, market, the item (equipmentCrafting.getAffixKeepReason), gold. */
function getAffixKeepServiceReason(item, kind) {
    if (game.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.';
    if (!isMarketUnlocked()) return '장비 제련을 해금하면 거래소를 이용할 수 있습니다.';
    const reason = equipmentCrafting.getAffixKeepReason(item, kind);
    if (reason) return reason;
    return (game.currencies.goldenRule || 0) < AFFIX_KEEP_RULES.cost ? `황금률이 부족합니다. (필요: ${AFFIX_KEEP_RULES.cost})` : '';
}

function buildGoldenRuleSpendPrompt(message) {
    let owned = Math.max(0, Math.floor((game.currencies && game.currencies.goldenRule) || 0));
    return `${message}\n\n현재 보유: 황금률 ${owned}개`;
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
    if (base.slot === '방패') return `shield:${base.shieldStyle || 'fortress'}`;
    let ids = (base.baseStats || []).map(stat => stat.id);
    if (ids.some(id => id.startsWith('summon'))) return 'summon';
    return 'generic';
}
/** 수평 베이스(2026-10-09, js/state.js family): 같은 family 안에서만 오른다. 다른 베이스는 family 베이스로 오르지 않는다. */
function getBaseFamilyUpgradeCandidates(currentBase) {
    return BASE_ITEM_DB.filter(base => base.slot === currentBase.slot && base.family === currentBase.family
        && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase).sort((a, b) => a.reqTier - b.reqTier);
}
function getBaseUpgradeCandidates(currentBase) {
    if (currentBase.family) return getBaseFamilyUpgradeCandidates(currentBase);
    let currentProfile = getBaseDefenseProfile(currentBase);
    let currentSecondarySignature = getBaseSecondaryStatSignature(currentBase, currentBase.slot);
    let currentArchetype = getBaseBuildArchetype(currentBase);
    let currentCategory = getWeaponCategoryOfBase(currentBase.id);
    let isArmorSlot = ['투구','갑옷','장갑','신발','방패'].includes(currentBase.slot);
    let candidates = BASE_ITEM_DB
        .filter(base => base.slot === currentBase.slot && base.reqTier > currentBase.reqTier && !base.dropOnly && !base.realmBase && !base.family)
        .filter(base => isArmorSlot ? getBaseDefenseProfile(base) === currentProfile : true)
        .filter(base => getBaseBuildArchetype(base) === currentArchetype)
        // 무기는 같은 대분류 안에서만 승급한다(곡도가 대검이 되지 않게).
        .filter(base => getWeaponCategoryOfBase(base.id) === currentCategory)
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

function rollUpgradedBaseStats(item, nextBase) {
    let rolled = rollBaseStats(nextBase, nextBase.reqTier || 1);
    if (!item || nextBase.slot !== '방패') return rolled;
    let previous = (item.baseStats || []).find(stat => stat && stat.id === 'baseBlockChance');
    let next = rolled.find(stat => stat && stat.id === 'baseBlockChance');
    let floor = Math.max(0, Number(previous && previous.val) || 0);
    if (!next || floor <= 0 || Number(next.val || 0) >= floor) return rolled;
    next.val = floor;
    next.valMin = Math.max(Number(next.valMin || 0), floor);
    next.valMax = Math.max(Number(next.valMax || 0), floor);
    next.baseRollMin = Math.max(Number(next.baseRollMin || 0), floor);
    next.baseRollMax = Math.max(Number(next.baseRollMax || 0), floor);
    return rolled;
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
/** A base's step counted as in a six-step chain: a longer chain's top is 6 and the step below it 5 (the bow line has seven).
 * Upgrade cost floors and the rare drop weight of chain tops read this. */
function getBaseChainRank(info) {
    return info ? info.step - Math.max(0, info.total - 6) : 0;
}
function getItemBaseChainInfo(item) {
    if (!item) return null;
    let base = BASE_ITEM_DB.find(b => b && item.baseId && b.id === item.baseId)
        || BASE_ITEM_DB.find(b => b && b.name === item.baseName && b.slot === item.slot);
    if (!base) return null;
    return getBaseChainInfo(base);
}

/**
 * @param {{id?: string, reqTier?: number}} nextBase
 * @returns {{formlessDew: number, goldenRule: number, totalDewValue: number, dewPerGoldenRule: number}}
 */
function getBaseUpgradeCost(nextBase) {
    if (!nextBase) throw new Error('베이스 업그레이드 비용을 계산할 다음 베이스가 없습니다.');
    let exchange = MARKET_EXCHANGES.find(row => row && row.from === 'formlessDew'
        && row.to === 'goldenRule' && Number(row.need) > 0 && Number(row.gain) > 0);
    if (!exchange) throw new Error('형체 없는 이슬과 황금률의 기준 교환 비율을 찾을 수 없습니다.');
    let dewPerGoldenRule = Number(exchange.need) / Number(exchange.gain);
    if (!Number.isInteger(dewPerGoldenRule)) throw new Error('베이스 업그레이드 교환 비율은 정수여야 합니다.');
    let targetTier = Math.max(1, Math.floor(Number(nextBase.reqTier) || 1));
    let totalDewValue = Math.max(10,
        Math.ceil((5 + targetTier + targetTier * targetTier * 0.5) / 5) * 5);
    let chainRank = getBaseChainRank(getBaseChainInfo(nextBase));
    // 6단계 체인의 맨 위, 그리고 20단계 무기(다섯 단계 체인인 플라스크 · 향로 포함)는 같은 625.
    if (chainRank >= 6 || (nextBase.slot === '무기' && targetTier >= 20)) totalDewValue = Math.max(totalDewValue, 625);
    else if (chainRank === 5) totalDewValue = Math.max(totalDewValue, 225);
    let goldenRule = Math.floor(totalDewValue / dewPerGoldenRule);
    return {
        formlessDew: totalDewValue - goldenRule * dewPerGoldenRule,
        goldenRule,
        totalDewValue,
        dewPerGoldenRule
    };
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
    let cost = getBaseUpgradeCost(nextBase);
    game.pendingBaseUpgrade = { itemId: item.id, nextBaseId: nextBase.id };
    let titleEl = document.getElementById('base-upgrade-title');
    let bodyEl = document.getElementById('base-upgrade-body');
    if (titleEl) titleEl.innerText = `${currentBase.name} → ${nextBase.name}`;
    if (bodyEl) {
        let curStats = (currentBase.baseStats || []).map(stat => `${getStatName(stat.id)} ${formatSignedValue(stat.id, stat.baseMin || stat.base)}~${formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        let nextStats = (nextBase.baseStats || []).map(stat => `${getStatName(stat.id)} ${formatSignedValue(stat.id, stat.baseMin || stat.base)}~${formatValue(stat.id, stat.baseMax || stat.base)}`).join(' / ');
        bodyEl.innerHTML = `현재 베이스: <strong>${currentBase.name}</strong><br><span style="color:var(--copy-muted);">${curStats || '없음'}</span><br><br>업그레이드 베이스: <strong>${nextBase.name}</strong><br><span style="color:#ffd08a;">${nextStats || '없음'}</span><br><br>비용: 형체 없는 이슬 ${cost.formlessDew}${cost.goldenRule > 0 ? ` + 황금률 ${cost.goldenRule}` : ''}<br><span style="color:var(--copy-muted);">총 이슬 가치 ${cost.totalDewValue}</span>`;
    }
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.showModal();
}

function closeBaseUpgradeOverlay() {
    game.pendingBaseUpgrade = null;
    let overlay = document.getElementById('base-upgrade-overlay');
    if (overlay) overlay.close();
}

/** What the wallet lacks for a base upgrade's cost, or ''. */
function getBaseUpgradeShortfall(cost) {
    if ((game.currencies.formlessDew || 0) < cost.formlessDew) return `형체 없는 이슬이 부족합니다. (필요: ${cost.formlessDew})`;
    return (game.currencies.goldenRule || 0) < cost.goldenRule ? `황금률이 부족합니다. (필요: ${cost.goldenRule})` : '';
}
function confirmSelectedItemBaseUpgrade() {
    let pending = game.pendingBaseUpgrade;
    if (!pending) return;
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 장비 옵션을 변경할 수 없습니다.', 'attack-monster');
    let item = (game.inventory || []).find(v => v && v.id === pending.itemId);
    if (!item) {
        let equipMatch = Object.entries(game.equipment || {}).find(([, equipped]) => equipped && equipped.id === pending.itemId);
        if (equipMatch) item = equipMatch[1];
    }
    if (!item) { closeBaseUpgradeOverlay(); return addLog('대상 장비를 찾을 수 없습니다.', 'attack-monster'); }
    let currentBase = BASE_ITEM_DB.find(base => base && base.id === item.baseId) || null;
    let nextBase = BASE_ITEM_DB.find(base => base && base.id === pending.nextBaseId);
    if (!nextBase) return closeBaseUpgradeOverlay();
    let cost = getBaseUpgradeCost(nextBase);
    const shortfall = getBaseUpgradeShortfall(cost);
    if (shortfall) return addLog(shortfall, 'attack-monster');
    game.currencies.formlessDew -= cost.formlessDew;
    game.currencies.goldenRule = Math.max(0, (game.currencies.goldenRule || 0) - cost.goldenRule);
    item.baseId = nextBase.id;
    item.baseName = nextBase.name;
    if (item.rarity !== 'unique') item.name = nextBase.name;
    item.itemTier = Math.max(item.itemTier || 1, nextBase.reqTier || 1);
    item.baseStats = rollUpgradedBaseStats(item, nextBase);
    addLog(`🛠️ 베이스 업그레이드: ${(currentBase && currentBase.name) || '기존'} → ${nextBase.name} (형체 없는 이슬 ${cost.formlessDew}${cost.goldenRule ? ` + 황금률 ${cost.goldenRule}` : ''})`, 'loot-magic');
    closeBaseUpgradeOverlay();
    updateStaticUI();
}

safeExposeGlobals({ marketResetPassiveTreeByDivine, marketAnnulSelectedStat, upgradeSelectedItemBase, confirmSelectedItemBaseUpgrade, closeBaseUpgradeOverlay });
