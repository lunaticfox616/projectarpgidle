/**
 * 현재 플레이어에게 스탯을 제공하는 모든 아이템을 반환한다.
 * 고정 장비와 활성 생장판 배치는 서로를 대체하지 않고 함께 기여한다.
 * @returns {Array<[string, object]>}
 */
function getPlayerStatSourceItemEntries() {
    let entries = [];
    getPlacedGrowthEntries().forEach(entry => entries.push([`growth:${entry.item.id}`, entry.item]));
    Object.entries(game.equipment || {}).forEach(([slotKey, item]) => {
        if (item) entries.push([slotKey, item]);
    });
    return entries;
}

function getEquipmentMirrorSource(slotKey, item, ownerState) {
    if (!item || item.uniqueEffectKey !== 'mirrorOppositeRing') return { slot: null, item: null };
    let oppositeSlot = slotKey === '반지1' ? '반지2' : slotKey === '반지2' ? '반지1' : null;
    let oppositeItem = oppositeSlot && ownerState.equipment ? ownerState.equipment[oppositeSlot] : null;
    if (!oppositeItem || oppositeItem.uniqueEffectKey === 'mirrorOppositeRing') return { slot: null, item: null };
    return { slot: oppositeSlot, item: oppositeItem };
}

function scaleEquipmentStatLines(stats, multiplier) {
    return (Array.isArray(stats) ? stats : []).filter(Boolean).map(stat => {
        let value = Number(stat.val);
        return Number.isFinite(value) ? { ...stat, val: value * multiplier } : { ...stat };
    });
}

function getEquipmentStatMultiplier(item, ownerState, growthItem) {
    let offhand = ownerState.equipment && ownerState.equipment['방패'];
    let dualWielding = !!(ownerState.equipment && ownerState.equipment['무기'] && offhand && offhand.slot === '무기');
    let warriorKeystone = ownerState.ascendClass === 'warrior'
        && ((ownerState.ascendKeystones || []).includes('w6') || (ownerState.cosmosTwinKeystones || []).includes('w6'));
    let weaponMultiplier = !growthItem && item.slot === '무기' && dualWielding && warriorKeystone ? 1.5 : 1;
    let growthMultiplier = growthItem ? getGrowthItemStatMultiplier(item.id) : 1;
    return weaponMultiplier * growthMultiplier;
}

function resolveEquipmentBaseStats(item, mirrorItem, itemMultiplier, growthItem) {
    let qualityCap = item.qualityLockedByLimitBreak ? 30 : 20;
    let qualityValue = Math.max(0, Math.min(qualityCap, Math.floor(Number(item.quality) || 0)));
    let qualityMultiplier = 1 + qualityValue / 100;
    let qualityMode = getItemQualityAttributeMode(item);
    let growthBaseMultiplier = growthItem ? getGrowthItemBaseMultiplier(item.id) : 1;
    let baseMultiplier = (qualityMode === 'base' ? qualityMultiplier : 1) * growthBaseMultiplier;
    let source = [...(item.baseStats || []), ...((mirrorItem && mirrorItem.baseStats) || [])];
    let scaled = source.filter(Boolean).map(stat => {
        let value = Number(stat.val);
        return Number.isFinite(value) ? { ...stat, val: Number((value * baseMultiplier).toFixed(2)) } : { ...stat };
    });
    return { stats: scaleEquipmentStatLines(scaled, itemMultiplier), qualityMode, qualityMultiplier };
}

function resolveEquipmentExplicitStats(item, mirrorItem, itemMultiplier, qualityMode, qualityMultiplier) {
    let riftRow = (item.stats || []).find(stat => stat && stat.id === 'fossilRiftAmp');
    let riftMultiplier = 1 + Math.max(0, Number(riftRow && riftRow.val) || 0) / 100;
    let kaleidoscopeMultiplier = item.uniqueEffectKey === 'kaleidoscopeShield'
        ? Math.max(1, Number((item.uniqueEffectParams || {}).explicitStatMultiplier) || 2) : 1;
    let source = [...(item.stats || []), ...((mirrorItem && mirrorItem.stats) || [])];
    let stats = source.filter(Boolean).map(stat => {
        let qualityScale = qualityMode !== 'base' && isQualityAttributeStat(qualityMode, stat.id) ? qualityMultiplier : 1;
        let excluded = stat.id === 'fossilRiftBlank' || stat.id === 'fossilRiftAmp';
        return excluded || !Number.isFinite(Number(stat.val)) ? { ...stat } : {
            ...stat,
            val: Number((Number(stat.val) * riftMultiplier * qualityScale * kaleidoscopeMultiplier).toFixed(2))
        };
    });
    let copiedSpecials = mirrorItem ? [mirrorItem.underEnchant, mirrorItem.chaosInfusion].filter(Boolean) : [];
    let immutableStats = getImmutableItemSpecialStats(item);
    return scaleEquipmentStatLines([
        ...stats, item.underEnchant, item.chaosInfusion, ...copiedSpecials, ...immutableStats
    ].filter(Boolean), itemMultiplier);
}

/**
 * 품질·특수 제작·복제·생장·아르카나를 포함한 아이템 옵션의 단일 해석 경계다.
 * @param {string} slotKey
 * @param {object} item
 * @param {object} ownerState
 * @param {boolean} includeArcana
 * @returns {{baseStats:Array<object>, explicitStats:Array<object>, mirrorSourceItem:object|null, mirrorSourceSlot:string|null, growthItem:boolean}}
 */
function getResolvedEquipmentStatLists(slotKey, item, ownerState, includeArcana) {
    let source = ownerState || game;
    let mirror = getEquipmentMirrorSource(slotKey, item, source);
    let growthItem = isGrowthItem(item);
    let itemMultiplier = getEquipmentStatMultiplier(item, source, growthItem);
    let base = resolveEquipmentBaseStats(item, mirror.item, itemMultiplier, growthItem);
    let baseStats = base.stats;
    let explicitStats = resolveEquipmentExplicitStats(item, mirror.item, itemMultiplier, base.qualityMode, base.qualityMultiplier);
    if (includeArcana !== false) {
        baseStats = applyArcanaSlotAmplification(baseStats, slotKey, source);
        explicitStats = applyArcanaSlotAmplification(explicitStats, slotKey, source);
    }
    return { baseStats, explicitStats, mirrorSourceItem: mirror.item, mirrorSourceSlot: mirror.slot, growthItem };
}

safeExposeGlobals({ getPlayerStatSourceItemEntries, getResolvedEquipmentStatLists });
