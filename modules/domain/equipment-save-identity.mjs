import { equipmentSaveMigrateVowBlockAffix } from './equipment-save-stats.mjs';

export function equipmentSaveSyncStoredUniqueEffect(env, item) {
    if (item.rarity !== 'unique') return;
    const source = env.deps.UNIQUE_DB.find(unique => unique.syncEffectOnLoad && unique.name === item.name);
    if (!source) return;
    item.uniqueEffect = source.uniqueEffect || '';
    item.uniqueEffectKey = source.uniqueEffectKey || '';
    item.uniqueEffectParams = source.uniqueEffectParams ? JSON.parse(JSON.stringify(source.uniqueEffectParams)) : null;
}

export function equipmentSaveRenameRetiredItemStatIds(env, item) {
    if (!item) return null;
    [item.baseStats, item.stats].forEach(list => (Array.isArray(list) ? list : []).forEach(stat => {
        if (!stat || !Object.hasOwn(env.RETIRED_ITEM_STAT_IDS, stat.id)) return;
        stat.id = env.RETIRED_ITEM_STAT_IDS[stat.id];
        stat.statName = env.deps.getStatName(stat.id);
    }));
    if (item.rarity === 'unique' && Object.hasOwn(env.deps.RENAMED_UNIQUES, item.name)) item.name = env.deps.RENAMED_UNIQUES[item.name];
    equipmentSaveNormalizeArmGuardIdentity(env, item);
    return item;
}

export function equipmentSaveNormalizeArmGuardIdentity(env, item) {
    const legacyNames = env.RENAMED_BASE_NAMES_BY_SLOT[item.slot];
    if (!legacyNames) return;
    const previousName = item.baseName || item.name || '';
    const legacy = Object.entries(legacyNames).find(([name]) => name === previousName || name === item.name
        || String(item.name || '').endsWith(' ' + name));
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === (item.baseId || legacy?.[1]));
    if (!base || base.slot !== item.slot) return;
    item.baseId = base.id;
    item.baseName = base.name;
    const oldName = legacy?.[0] || previousName;
    equipmentSaveReplaceArmGuardBaseName(item, oldName, base.name);
    if (env.deps.equipmentCrafting.normalizeImprint(item.imprint)) equipmentSaveReplaceArmGuardBaseName(item.imprint, oldName, base.name);
}

export function equipmentSaveReplaceArmGuardBaseName(item, previousName, nextName) {
    if (item.rarity === 'unique') return;
    if (!item.name || item.name === previousName) item.name = nextName;
    else if (previousName && item.name.endsWith(' ' + previousName)) item.name = item.name.slice(0, -previousName.length) + nextName;
}

/** 2026-10-23: only guard/focus bracers have innate block; all greatsword bases gain 5%. This is one-time so later altar
 * replacements stay replaced. Affixes, sockets and already converted implicit lines are never rerolled. */
export function equipmentSaveMigrateEquipmentBlockBases(env, item) {
    if (item.blockBaseVersion >= 1 || !['무기', '방패'].includes(item.slot)) return;
    const base = env.deps.BASE_ITEM_DB.find(row => row.id === item.baseId || (row.slot === item.slot && row.name === item.baseName));
    if (!base) return;
    equipmentSaveMigrateVowBlockAffix(env, item);
    const block = base.baseStats.find(stat => stat.id === 'baseBlockChance');
    if (item.slot === '방패' && !block) {
        item.baseStats = item.baseStats.filter(stat => stat.id !== 'baseBlockChance');
        item.exceptionalStatNames = item.baseStats.filter(stat => stat.exceptional).map(stat => stat.statName);
        item.exceptionalBase = item.exceptionalStatNames.length > 0;
        item.exceptionalStatName = item.exceptionalStatNames.join(', ');
        item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
    }
    if (item.slot === '무기' && block
        && !item.baseStats.some(stat => stat.id === 'baseBlockChance')) item.baseStats.push({ ...env.deps.rollBaseStat(block, 0), originalVal: null });
    item.blockBaseVersion = 1;
}

/** Retired stat ids renamed, then the slim-saved fields of every line put back (js/item-save-slim.js): the bag, a cloud save and the
 * equipment received from the hall and the stall all pass here. @returns {object|null} the item, or null for nothing */
export function equipmentSaveRenameAndExpandItemLines(env, item) {
    return equipmentSaveRenameRetiredItemStatIds(env, item) ? env.deps.itemSaveSlim.expandItem(item) : null;
}
