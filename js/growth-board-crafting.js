let growthItemSequence = 0;

function nextGrowthItemId() {
    growthItemSequence++;
    return `growth-${Date.now().toString(36)}-${growthItemSequence.toString(36)}`;
}

function getGrowthBaseCandidates(category, tier) {
    let safeTier = Math.max(1, Math.floor(Number(tier) || 1));
    let candidates = GROWTH_BOARD_ITEMS.filter(base => base.category === category && base.requiredTier <= safeTier);
    if (candidates.length > 0) return candidates;
    return GROWTH_BOARD_ITEMS.filter(base => base.category === category).sort((a, b) => a.requiredTier - b.requiredTier).slice(0, 1);
}

function chooseGrowthBase(category, tier) {
    let candidates = getGrowthBaseCandidates(category, tier);
    let weights = candidates.map(base => Math.max(0.15, 1 + (base.requiredTier - tier) * 0.08));
    let total = weights.reduce((sum, value) => sum + value, 0);
    let roll = Math.random() * total;
    for (let index = 0; index < candidates.length; index++) {
        roll -= weights[index];
        if (roll <= 0) return candidates[index];
    }
    return candidates[candidates.length - 1];
}

function rollGrowthRarity(enemy) {
    let roll = Math.random();
    if (enemy && enemy.isBoss) return roll < 0.04 ? 'unique' : roll < 0.36 ? 'rare' : roll < 0.8 ? 'magic' : 'normal';
    if (enemy && enemy.isElite) return roll < 0.02 ? 'unique' : roll < 0.24 ? 'rare' : roll < 0.62 ? 'magic' : 'normal';
    return roll < 0.006 ? 'unique' : roll < 0.09 ? 'rare' : roll < 0.3 ? 'magic' : 'normal';
}

function rollGrowthBaseStats(base, tier) {
    let legacyLike = { slot: base.compatibleSlot, baseStats: base.baseStats };
    if (typeof rollBaseStats === 'function') return rollBaseStats(legacyLike, tier);
    return base.baseStats.map(stat => ({ id: stat.id, val: stat.base, valMin: stat.base, valMax: stat.base, tier: 0, statName: getStatName(stat.id) }));
}

function createGrowthItemFromBase(base, rarity, tier) {
    let item = {
        id: nextGrowthItemId(), baseId: base.baseId, growthBaseId: base.baseId,
        baseName: base.name, name: base.name, category: base.category,
        rarity: rarity || 'normal', affixes: [], stats: [], quality: 0,
        corrupted: false, locked: false, tags: base.tags.slice(), rotation: 0,
        placement: null, sealed: false, fused: false, loopSealed: false,
        slot: base.compatibleSlot, originalSlot: base.compatibleSlot,
        itemTier: tier, hiddenTier: tier, baseStats: rollGrowthBaseStats(base, tier),
        rotationAllowed: base.rotationAllowed !== false, spatialEffect: { ...base.spatialEffect }, isGrowthItem: true
    };
    if ((rarity === 'magic' || rarity === 'rare') && typeof rerollExplicitMods === 'function') {
        rerollExplicitMods(item, rarity, tier);
        item.affixes = item.stats;
    }
    return item;
}

function createUniqueGrowthItem(unique, tier) {
    let base = GROWTH_BOARD_ITEMS.find(row => row.baseId === unique.baseId);
    let item = createGrowthItemFromBase(base, 'unique', Math.max(tier, base.requiredTier));
    item.uniqueGrowthId = unique.id;
    item.name = unique.name;
    item.tags = Array.from(new Set(item.tags.concat(unique.tags || [])));
    item.spatialEffect = { ...(unique.effect || base.spatialEffect) };
    item.uniqueEffect = unique.uniqueEffect;
    item.uniqueEffectKey = unique.uniqueEffectKey;
    item.uniqueEffectParams = { growthBoard: true };
    return item;
}

function generateGrowthItemDrop(enemy) {
    let zone = typeof getZone === 'function' ? getZone(game.currentZoneId) || {} : {};
    let tier = typeof getRealmEquipmentHiddenTierCap === 'function'
        ? getRealmEquipmentHiddenTierCap(zone)
        : Math.max(1, getGrowthProgressTier());
    tier = Math.max(tier, getGrowthProgressTier());
    let rarity = rollGrowthRarity(enemy);
    if (rarity === 'unique') {
        let eligible = GROWTH_BOARD_UNIQUES.filter(unique => {
            let base = GROWTH_BOARD_ITEMS.find(row => row.baseId === unique.baseId);
            return base && base.requiredTier <= tier;
        });
        if (eligible.length > 0) return createUniqueGrowthItem(rndChoice(eligible), tier);
        rarity = 'rare';
    }
    let categoryRoll = Math.random();
    let category = categoryRoll < 0.42 ? 'flower' : categoryRoll < 0.78 ? 'branch' : 'leaf';
    let item = createGrowthItemFromBase(chooseGrowthBase(category, tier), rarity, tier);
    if (typeof maybeApplyExceptionalBase === 'function') maybeApplyExceptionalBase(item);
    if (typeof maybeApplyDroppedFossilExclusiveAffix === 'function') maybeApplyDroppedFossilExclusiveAffix(item, enemy, tier);
    return item;
}

function getLegacyGrowthCategory(slot) {
    if (slot === '무기') return 'flower';
    if (['목걸이','반지'].includes(slot)) return 'leaf';
    return 'branch';
}

function scoreGrowthBaseForLegacy(base, legacy) {
    let score = Math.abs((base.requiredTier || 1) - Math.max(1, Number(legacy.hiddenTier || legacy.itemTier) || 1));
    if (base.compatibleSlot === legacy.slot) score -= 5;
    let legacyStatIds = new Set((legacy.baseStats || []).map(stat => stat && stat.id));
    score -= base.baseStats.filter(stat => legacyStatIds.has(stat.id)).length * 2;
    return score;
}

function convertLegacyItemToGrowth(legacy) {
    if (!legacy) return null;
    if (legacy.isGrowthItem && getGrowthBase(legacy)) return legacy;
    let category = getLegacyGrowthCategory(legacy.slot);
    let candidates = GROWTH_BOARD_ITEMS.filter(base => base.category === category);
    candidates.sort((a, b) => scoreGrowthBaseForLegacy(a, legacy) - scoreGrowthBaseForLegacy(b, legacy));
    let base = candidates[0];
    if (!base) return null;
    let converted = JSON.parse(JSON.stringify(legacy));
    converted.id = String(legacy.id || nextGrowthItemId()).startsWith('growth-') ? String(legacy.id) : `legacy-growth-${legacy.id || nextGrowthItemId()}`;
    converted.legacyItemId = legacy.id;
    converted.legacyBaseId = legacy.baseId;
    converted.baseId = base.baseId;
    converted.growthBaseId = base.baseId;
    converted.baseName = legacy.baseName || base.name;
    converted.category = category;
    converted.originalSlot = legacy.slot;
    converted.slot = legacy.slot || base.compatibleSlot;
    converted.tags = Array.from(new Set((converted.tags || []).concat(base.tags)));
    converted.rotation = 0;
    converted.placement = null;
    converted.spatialEffect = converted.spatialEffect || { ...base.spatialEffect };
    converted.rotationAllowed = base.rotationAllowed !== false;
    converted.affixes = Array.isArray(converted.stats) ? converted.stats : [];
    converted.sealed = !!converted.loopSealed;
    converted.fused = !!converted.fusedRelic;
    converted.isGrowthItem = true;
    return converted;
}

function isGrowthItemProtected(item) {
    if (!item) return false;
    if (item.locked || item.rarity === 'unique') return true;
    let known = game.growthKnownBaseIds || [];
    return !known.includes(item.baseId);
}

function registerGrowthBase(item) {
    game.growthKnownBaseIds = Array.isArray(game.growthKnownBaseIds) ? game.growthKnownBaseIds : [];
    if (item && item.baseId && !game.growthKnownBaseIds.includes(item.baseId)) game.growthKnownBaseIds.push(item.baseId);
}

function addGrowthItemToStorage(item, options) {
    ensureGrowthBoardState(game);
    if (!item) return false;
    let converted = item.isGrowthItem ? item : convertLegacyItemToGrowth(item);
    if (!converted) return false;
    let guaranteed = !!(options && options.guaranteedKeep);
    let ignoreFilter = guaranteed || !!(options && options.ignoreFilter);
    let ignoreAutoSalvage = guaranteed || !!(options && options.ignoreAutoSalvage);
    if (!ignoreFilter && typeof passesItemPickupFilter === 'function' && !passesItemPickupFilter(converted)) return false;
    let settings = game.settings || {};
    if (!ignoreAutoSalvage && settings.autoSalvageEnabled && settings.autoSalvageRarities && settings.autoSalvageRarities[converted.rarity] && !isGrowthItemProtected(converted)) {
        if (typeof salvageItemObject === 'function') salvageItemObject(converted, true);
        return false;
    }
    if (getStoredGrowthItems().length >= getGrowthStorageLimit() && !guaranteed) {
        if (typeof salvageItemObject === 'function') salvageItemObject(converted, true, { noDivine: true });
        return false;
    }
    if (game.growthInventory.some(row => row && String(row.id) === String(converted.id))) converted.id = nextGrowthItemId();
    game.growthInventory.push(converted);
    registerGrowthBase(converted);
    if (converted.rarity === 'unique' && typeof registerUniqueToCodexOnAcquire === 'function') registerUniqueToCodexOnAcquire(converted);
    invalidateGrowthBoard('storage');
    return true;
}

function addGrowthRecentDrop(item) {
    ensureGrowthBoardState(game);
    if (!item) return false;
    let converted = item.isGrowthItem ? item : convertLegacyItemToGrowth(item);
    if (!converted) return false;
    let settings = game.settings || {};
    if (settings.autoSalvageEnabled && settings.autoSalvageRarities && settings.autoSalvageRarities[converted.rarity] && !isGrowthItemProtected(converted)) {
        if (typeof salvageItemObject === 'function') salvageItemObject(converted, true);
        return false;
    }
    if (game.recentGrowthDrops.length >= GROWTH_RECENT_LIMIT) {
        let index = game.recentGrowthDrops.findIndex(row => !isGrowthItemProtected(row));
        if (index >= 0) {
            let removed = game.recentGrowthDrops.splice(index, 1)[0];
            if (typeof salvageItemObject === 'function') salvageItemObject(removed, true, { noDivine: true });
        } else {
            let protectedDrop = game.recentGrowthDrops.shift();
            addGrowthItemToStorage(protectedDrop, { guaranteedKeep: true });
        }
    }
    game.recentGrowthDrops.push(converted);
    registerGrowthBase(converted);
    return true;
}

function moveRecentGrowthDropToStorage(itemId) {
    let index = game.recentGrowthDrops.findIndex(row => row && String(row.id) === String(itemId));
    if (index < 0) return false;
    let item = game.recentGrowthDrops[index];
    if (!addGrowthItemToStorage(item)) return false;
    game.recentGrowthDrops.splice(index, 1);
    return true;
}

function salvageGrowthItem(itemId) {
    let index = game.growthInventory.findIndex(row => row && String(row.id) === String(itemId));
    if (index < 0) return false;
    let item = game.growthInventory[index];
    if (item.locked || getGrowthPlacement(item.id)) return false;
    if (typeof salvageItemObject === 'function') salvageItemObject(item, false);
    game.growthInventory.splice(index, 1);
    invalidateGrowthBoard('salvage');
    return true;
}

function toggleGrowthItemLock(itemId) {
    let item = findGrowthItemById(itemId);
    if (!item) return false;
    item.locked = !item.locked;
    return true;
}

function getGrowthCraftAffixLimit(item) {
    if (!item || !item.isGrowthItem) return 6;
    return getGrowthAffixLimit(getGrowthItemShape(item).length, item.rarity);
}

function enforceGrowthAffixLimit(item) {
    if (!item || !item.isGrowthItem) return item;
    let limit = getGrowthCraftAffixLimit(item);
    item.stats = Array.isArray(item.stats) ? item.stats.slice(0, limit) : [];
    item.affixes = item.stats;
    return item;
}

safeExposeGlobals({ nextGrowthItemId, chooseGrowthBase, createGrowthItemFromBase, createUniqueGrowthItem, generateGrowthItemDrop, convertLegacyItemToGrowth, addGrowthItemToStorage, addGrowthRecentDrop, moveRecentGrowthDropToStorage, salvageGrowthItem, toggleGrowthItemLock, getGrowthCraftAffixLimit, enforceGrowthAffixLimit });
