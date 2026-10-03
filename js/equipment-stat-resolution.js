/**
 * 현재 플레이어에게 스탯을 제공하는 모든 아이템(장착한 장비)을 반환한다.
 * @returns {Array<[string, object]>}
 */
function getPlayerStatSourceItemEntries() {
    const memo = getBackgroundBuildMemo(game);
    if (memo?.has('equipment-sources')) return memo.get('equipment-sources');
    let entries = [];
    Object.entries(combatEquipmentStats.activeEquipment(game) || {}).forEach(([slotKey, item]) => {
        if (item) entries.push([slotKey, item]);
    });
    memo?.set('equipment-sources', entries);
    return entries;
}

function getEquipmentMirrorSource(slotKey, item, ownerState) {
    if (!item || item.uniqueEffectKey !== 'mirrorOppositeRing') return { slot: null, item: null };
    let oppositeSlot = slotKey === '반지1' ? '반지2' : slotKey === '반지2' ? '반지1' : null;
    let equipment = combatEquipmentStats.activeEquipment(ownerState);
    let oppositeItem = oppositeSlot && equipment ? equipment[oppositeSlot] : null;
    if (!oppositeItem || oppositeItem.uniqueEffectKey === 'mirrorOppositeRing') return { slot: null, item: null };
    return { slot: oppositeSlot, item: oppositeItem };
}

function scaleEquipmentStatLines(stats, multiplier) {
    const scaleLine = stat => {
        let value = Number(stat.val);
        return Number.isFinite(value) ? { ...stat, val: value * multiplier } : { ...stat };
    };
    return (Array.isArray(stats) ? stats : []).filter(Boolean).map(stat => {
        const result = scaleLine(stat);
        if (stat.extraStats) result.extraStats = stat.extraStats.map(scaleLine);
        return result;
    });
}

function getEquipmentStatMultiplier(item, ownerState) {
    // Only a warrior-w6 weapon can differ from 1. Check that first: resolving the active
    // equipment re-validates the whole build and this runs for every item in every stat pass.
    let warriorKeystone = (ownerState.ascendClass === 'warrior' && (ownerState.ascendKeystones || []).includes('w6'))
        || (ownerState.cosmosTwinKeystones || []).includes('w6');
    if (item.slot !== '무기' || !warriorKeystone) return 1;
    let equipment = combatEquipmentStats.activeEquipment(ownerState);
    let offhand = equipment && equipment['방패'];
    let dualWielding = !!(equipment && equipment['무기'] && offhand && offhand.slot === '무기');
    return dualWielding ? 1.5 : 1;
}

function resolveEquipmentBaseStats(item, mirrorItem, itemMultiplier) {
    let qualityCap = item.qualityLockedByLimitBreak ? 30 : 20;
    let qualityValue = Math.max(0, Math.min(qualityCap, Math.floor(Number(item.quality) || 0)));
    let qualityMultiplier = 1 + qualityValue / 100;
    let qualityMode = getItemQualityAttributeMode(item);
    let baseMultiplier = qualityMode === 'base' ? qualityMultiplier : 1;
    let source = [...(item.baseStats || []), ...((mirrorItem && mirrorItem.baseStats) || [])];
    let scaled = source.filter(Boolean).map(stat => {
        let value = Number(stat.val);
        return Number.isFinite(value) ? { ...stat, val: Number((value * baseMultiplier).toFixed(2)) } : { ...stat };
    });
    return { stats: scaleEquipmentStatLines(scaled, itemMultiplier), qualityMode, qualityMultiplier };
}

function scaleExplicitEquipmentStat(stat, modifiers) {
    const {qualityMode, qualityMultiplier, riftMultiplier, kaleidoscopeMultiplier} = modifiers;
    const qualityScale = qualityMode !== 'base' && isQualityAttributeStat(qualityMode, stat.id) ? qualityMultiplier : 1;
    const excluded = stat.id === 'fossilRiftBlank' || stat.id === 'fossilRiftAmp';
    const result = { ...stat };
    if (!excluded && Number.isFinite(Number(stat.val))) {
        result.val = Number((Number(stat.val) * riftMultiplier * qualityScale * kaleidoscopeMultiplier).toFixed(2));
    }
    return result;
}

function resolveEquipmentExplicitStats(item, mirrorItem, itemMultiplier, qualityMode, qualityMultiplier) {
    let riftRow = (item.stats || []).find(stat => stat && stat.id === 'fossilRiftAmp');
    let riftMultiplier = 1 + Math.max(0, Number(riftRow && riftRow.val) || 0) / 100;
    let kaleidoscopeMultiplier = item.uniqueEffectKey === 'kaleidoscopeShield'
        ? Math.max(1, Number((item.uniqueEffectParams || {}).explicitStatMultiplier) || 2) : 1;
    let source = [...(item.stats || []), ...((mirrorItem && mirrorItem.stats) || [])];
    const modifiers = {qualityMode, qualityMultiplier, riftMultiplier, kaleidoscopeMultiplier};
    let stats = source.filter(Boolean).map(stat => {
        const result = scaleExplicitEquipmentStat(stat, modifiers);
        if (stat.extraStats) result.extraStats = stat.extraStats.map(extra => scaleExplicitEquipmentStat(extra, modifiers));
        return result;
    });
    let copiedSpecials = mirrorItem ? [mirrorItem.underEnchant, mirrorItem.chaosInfusion].filter(Boolean) : [];
    let immutableStats = getImmutableItemSpecialStats(item);
    return scaleEquipmentStatLines([
        ...stats, item.underEnchant, item.chaosInfusion, ...copiedSpecials, ...immutableStats
    ].filter(Boolean), itemMultiplier);
}

/**
 * 품질·특수 제작·복제를 포함한 아이템 옵션의 단일 해석 경계다.
 * @param {string} slotKey
 * @param {object} item
 * @param {object} ownerState
 * @returns {{baseStats:Array<object>, explicitStats:Array<object>, mirrorSourceItem:object|null, mirrorSourceSlot:string|null}}
 */
function getResolvedEquipmentStatLists(slotKey, item, ownerState) {
    let source = ownerState || game;
    const memo = getBackgroundBuildMemo(source);
    const key = `equipment:${slotKey}`;
    const cached = memo?.get(key);
    if (cached && cached.item === item) return cached.result;
    let mirror = getEquipmentMirrorSource(slotKey, item, source);
    let itemMultiplier = getEquipmentStatMultiplier(item, source);
    let base = resolveEquipmentBaseStats(item, mirror.item, itemMultiplier);
    let baseStats = base.stats;
    let explicitStats = resolveEquipmentExplicitStats(item, mirror.item, itemMultiplier, base.qualityMode, base.qualityMultiplier);
    let result = { baseStats, explicitStats, mirrorSourceItem: mirror.item, mirrorSourceSlot: mirror.slot };
    memo?.set(key, { item, result });
    return result;
}

safeExposeGlobals({ getPlayerStatSourceItemEntries, getResolvedEquipmentStatLists });
