import { equipmentSaveMigrateVowBlockAffix } from './equipment-save-stats.mjs';
import { equipmentSaveHasLegacyUniqueBaseUpgrade } from './equipment-save-bases.mjs';

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
    if (item.rarity === 'unique') {
        item.name = equipmentSaveStoredUniqueName(env, item);
        env.deps.refreshSocketEffectText(item);
    }
    equipmentSaveNormalizeArmGuardIdentity(env, item);
    return item;
}

/** A saved unique's catalog name: a renamed one (RENAMED_UNIQUES), or one whose old name left the code (2026-11-12 renames), found by
 * its slot, tier, base and effect when exactly one catalog row matches. Items, codex records and market offers use it. */
export function equipmentSaveStoredUniqueName(env, item) {
    const name = Object.hasOwn(env.deps.RENAMED_UNIQUES, item.name) ? env.deps.RENAMED_UNIQUES[item.name] : item.name;
    if (Object.hasOwn(env.deps.UNIQUE_EQUIPMENT_RULES, name) || !item.baseId) return name;
    const tier = Number(item.reqTier ?? item.hiddenTier ?? item.itemTier);
    const upgraded = equipmentSaveHasLegacyUniqueBaseUpgrade(env, item, item.slot);
    const matches = env.deps.UNIQUE_DB.filter(entry => entry.reqTier === tier && entry.slots[0] === item.slot
        && (upgraded || env.deps.UNIQUE_EQUIPMENT_RULES[entry.name]?.baseId === item.baseId) && equipmentSaveMatchesUniqueEffect(item, entry));
    return matches.length === 1 ? matches[0].name : name;
}

function equipmentSaveMatchesUniqueEffect(item, entry) {
    if (item.uniqueEffectKey) return item.uniqueEffectKey === entry.uniqueEffectKey;
    if (!Array.isArray(item.uniqueStats)) return false;
    return item.uniqueStats.map(stat => stat?.id).sort().join('|') === entry.stats.map(stat => stat.id).sort().join('|');
}

export function equipmentSaveNormalizeArmGuardIdentity(env, item) {
    // Every slot follows its base id, so a renamed base (2026-11-12: 요새 판갑 to 심재 판갑) shows its new name on load.
    const legacyNames = env.RENAMED_BASE_NAMES_BY_SLOT[item.slot] || {};
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
