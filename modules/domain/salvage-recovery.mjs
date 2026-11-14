import { recoveryIsSalvageRecoveryItem, recoveryEnsureSalvageRecoveryState, recoveryPrepareSalvageRecoveryRecords, recoveryRecordSalvagedEquipment, recoveryGetSalvageReplayRewards, recoveryGetSalvageRecoveryEntries, recoveryGetSalvageRestoreAvailability, recoveryRestoreSalvagedEquipment } from './salvage-recovery-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createSalvageRecovery(deps) {
    const env = { deps };
    env.SALVAGE_RECOVERY_CAP = 8;
    env.SALVAGE_RECOVERY_RARITIES = Object.freeze(['normal', 'magic', 'rare', 'unique']);
    return Object.freeze({
        isItem: (...args) => recoveryIsSalvageRecoveryItem(env, ...args),
        cap: env.SALVAGE_RECOVERY_CAP,
        rarities: env.SALVAGE_RECOVERY_RARITIES,
        ensureState: (...args) => recoveryEnsureSalvageRecoveryState(env, ...args),
        prepareRecords: (...args) => recoveryPrepareSalvageRecoveryRecords(env, ...args),
        record: (...args) => recoveryRecordSalvagedEquipment(env, ...args),
        getReplayRewards: (...args) => recoveryGetSalvageReplayRewards(env, ...args),
        getEntries: (...args) => recoveryGetSalvageRecoveryEntries(env, ...args),
        getAvailability: (...args) => recoveryGetSalvageRestoreAvailability(env, ...args),
        restore: (...args) => recoveryRestoreSalvagedEquipment(env, ...args)
    });
}
