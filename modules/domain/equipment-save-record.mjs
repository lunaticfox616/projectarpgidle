import { equipmentSaveRenameAndExpandItemLines, equipmentSaveMigrateEquipmentBlockBases, equipmentSaveSyncStoredUniqueEffect } from './equipment-save-identity.mjs';
import { equipmentSaveNormalizeStatRecord, equipmentSaveCoerceFiniteNumber, equipmentSaveMigrateEquipmentAffixBalance } from './equipment-save-stats.mjs';
import { equipmentSaveMigrateUniqueEquipmentIdentity, equipmentSaveNormalizeBelt, equipmentSaveMigrateWeaponBaseDamage } from './equipment-save-bases.mjs';

export function equipmentSaveNormalizeItem(env, item) {
    if (!equipmentSaveRenameAndExpandItemLines(env, item)) return null;
    if (typeof env.deps.bagItems === 'object' && env.deps.bagItems.ownShape(item)) return env.deps.bagItems.normalize(item); // 가방의 주얼과 코어는 제 모양(js/bag-items.js)
    equipmentSaveNormalizeItemStatCollections(env, item);
    equipmentSaveNormalizeItemAbyssSockets(env, item);
    // Corruption socket (2026-10-05): only its shape is kept; a jewel already in it is never dropped.
    equipmentSaveNormalizeItemCorruptionSocket(item);
    item.chaosInfusion = item.chaosInfusion ? equipmentSaveNormalizeStatRecord(env, item.chaosInfusion) : null;
    if ('imprint' in item && !env.deps.equipmentCrafting.normalizeImprint(item.imprint)) delete item.imprint; // 기억 조각칼(js/equipment-crafting.js)
    equipmentSaveNormalizeItemEncroachment(env, item);
    item.rarity = item.rarity || 'magic';
    item.hiddenTier = Math.max(1, Math.floor(equipmentSaveCoerceFiniteNumber(item.hiddenTier, equipmentSaveCoerceFiniteNumber(item.itemTier, 1), 1)));
    equipmentSaveMigrateUniqueEquipmentIdentity(env, item); equipmentSaveMigrateEquipmentBlockBases(env, item);
    equipmentSaveNormalizeItemTierLimits(env, item);
    if (item.slot === '허리띠') equipmentSaveNormalizeBelt(env, item);
    normalizeEquipmentNames(item);
    equipmentSaveSyncStoredUniqueEffect(env, item);
    item.locked = !!item.locked;
    equipmentSaveMigrateWeaponBaseDamage(env, item);
    equipmentSaveMigrateEquipmentAffixBalance(env, item);
    equipmentSaveNormalizeItemHallFlags(item);
    if (!item.id) item.id = env.deps.allocateItemId();
    return env.deps.levelProgression.stampItem(item);
}

function normalizeEquipmentNames(item) {
    item.baseName = item.baseName || item.name || '알 수 없는 장비';
    item.name = item.name || item.baseName;
}

export function equipmentSaveNormalizeItemStatCollections(env, item) {
    item.baseStats = Array.isArray(item.baseStats) ? item.baseStats.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean) : [];
    item.stats = Array.isArray(item.stats) ? item.stats.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean) : [];
}

export function equipmentSaveNormalizeItemAbyssSockets(env, item) {
    let abyssCap = env.deps.getAbyssSocketCapacity(item);
    if (abyssCap > 0) {
        item.abyssSockets = Array.isArray(item.abyssSockets)
            ? item.abyssSockets.slice(0, abyssCap).map(sock => ({ jewel: (sock && typeof sock.jewel === 'object') ? sock.jewel : null }))
            : [];
    } else {
        item.abyssSockets = [];
    }
}

export function equipmentSaveNormalizeItemCorruptionSocket(item) {
    if (item.corruptionSocket !== undefined) {
        if (item.corruptionSocket && typeof item.corruptionSocket === 'object') item.corruptionSocket = { jewel: (item.corruptionSocket.jewel && typeof item.corruptionSocket.jewel === 'object') ? item.corruptionSocket.jewel : null };
        else delete item.corruptionSocket;
    }
}

export function equipmentSaveNormalizeItemEncroachment(env, item) {
    if (item.encroached && typeof item.encroached === 'object') {
        let pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.map((...args) => equipmentSaveNormalizeStatRecord(env, ...args)).filter(Boolean).slice(0, 3) : [];
        let chosen = item.encroached.chosen ? equipmentSaveNormalizeStatRecord(env, { ...item.encroached.chosen, encroachedFinal: true }) : null;
        item.encroached = {
            liberated: !!item.encroached.liberated && !!chosen,
            sourceFloor: Math.max(1, Math.floor(equipmentSaveCoerceFiniteNumber(item.encroached.sourceFloor, 1))),
            pendingOptions: chosen ? [] : pendingOptions,
            chosen: chosen
        };
    } else item.encroached = null;
}

export function equipmentSaveNormalizeItemTierLimits(env, item) {
    const existingHighAffixTier = item.stats.reduce((max, stat) => Math.max(max, Math.floor(equipmentSaveCoerceFiniteNumber(stat && stat.tier, 0))), 0);
    const storedHighAffixCap = Number.isFinite(Number(item.affixTierCap)) && Number(item.affixTierCap) >= 11;
    const legacyProgressionProvenance = item.dropRealm === 'cosmos' || storedHighAffixCap || existingHighAffixTier >= 11;
    item.dropRealm = typeof item.dropRealm === 'string' ? item.dropRealm : null;
    env.deps.normalizeItemOrigin(item);
    item.affixTierCap = env.deps.clampNumber(Math.floor(equipmentSaveCoerceFiniteNumber(
        item.affixTierCap,
        legacyProgressionProvenance ? item.hiddenTier : Math.min(10, item.hiddenTier)
    )), 1, legacyProgressionProvenance ? 20 : 10);
}

export function equipmentSaveNormalizeItemHallFlags(item) {
    item.hallReplica = !!item.hallReplica;
    item.hallRelistBlocked = !!item.hallRelistBlocked;
    if (item.hallReplica) {
        item.locked = true;
        item.tradeLocked = true;
        item.hallSourceId = Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(item.hallSourceId, 0)));
        item.hallAppraisalScore = Math.max(0, Math.floor(equipmentSaveCoerceFiniteNumber(item.hallAppraisalScore, 0)));
        item.hallCuratorName = String(item.hallCuratorName || '').slice(0, 24);
    }
}
