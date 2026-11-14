import { equipmentSaveFindStoredEquipmentAffix } from './equipment-save-stats.mjs';
import { equipmentSaveNormalizeArmGuardIdentity, equipmentSaveMigrateEquipmentBlockBases } from './equipment-save-identity.mjs';
import { equipmentSaveNormalizeItem } from './equipment-save-record.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createEquipmentNormalization(deps) {
    const env = { deps };
    env.RETIRED_ITEM_STAT_IDS = Object.freeze({ venomStingerBonus: 'poisonDamageMultiplierPct' });
    env.RENAMED_BASE_NAMES_BY_SLOT = Object.freeze({ 방패: env.deps.ARM_GUARD_BASE_LEGACY_NAMES, 무기: env.deps.WEAPON_BASE_LEGACY_NAMES });
    return Object.freeze({
        findStoredEquipmentAffix: (...args) => equipmentSaveFindStoredEquipmentAffix(env, ...args),
        normalizeArmGuardIdentity: (...args) => equipmentSaveNormalizeArmGuardIdentity(env, ...args),
        migrateEquipmentBlockBases: (...args) => equipmentSaveMigrateEquipmentBlockBases(env, ...args),
        normalizeItem: (...args) => equipmentSaveNormalizeItem(env, ...args)
    });
}
