import { createEquipmentStatResolution, getUniqueImplicitMultiplier, needsEquipmentStatView } from './domain/equipment-stat-resolution.mjs';

const resolution = createEquipmentStatResolution({
    qualityMode: item => getItemQualityAttributeMode(item),
    qualityStat: (mode, id) => isQualityAttributeStat(mode, id),
    immutableStats: item => getImmutableItemSpecialStats(item)
});

// Eligibility still owns the active view. Keep its re-entrant legacy bridge outside stat-line calculation.
const getPlayerStatSourceItemEntries = (owner = game) => {
    const memo = getBackgroundBuildMemo(owner);
    if (memo?.has('equipment-sources')) return memo.get('equipment-sources');
    const entries = Object.entries(combatEquipmentStats.activeEquipment(owner) || {})
        .filter(([, item]) => item && !bagItems.isSpecial(item));
    memo?.set('equipment-sources', entries);
    return entries;
};

const getResolvedEquipmentStatLists = (slot, item, owner) => {
    const source = owner || game;
    const memo = getBackgroundBuildMemo(source), key = `equipment:${slot}`;
    const cached = memo?.get(key);
    if (cached && cached.item === item) return cached.result;
    const equipment = needsEquipmentStatView(item, source) ? combatEquipmentStats.activeEquipment(source) : null;
    const result = resolution.resolve(slot, item, source, equipment);
    memo?.set(key, { item, result });
    return result;
};

safeExposeGlobals({ getPlayerStatSourceItemEntries, getResolvedEquipmentStatLists, getUniqueImplicitMultiplier });
