import { plannerGetCurrentPassiveNodeId, plannerMigratePassiveNodeIdList, plannerMigratePassiveNodeIdRecord } from './passive-planner-migrations.mjs';
import { plannerNormalizePassiveTreePlannerState, plannerEnsurePassiveTreePlannerState } from './passive-planner-state.mjs';
import { plannerSaveCurrentPassiveTreePreset, plannerSetActivePassiveTreePreset, plannerSetPassiveTreeAutoInvest, plannerEncodePassiveTreePreset, plannerImportPassiveTreePreset } from './passive-planner-presets.mjs';
import { plannerRunPassiveTreeAutoInvest } from './passive-planner-investment.mjs';

/** Saved planner rules; current-game lookup and browser text codecs belong to the caller. */
export function createPassivePlanner(deps) {
    const env = { deps };
    return Object.freeze({
        getCurrentPassiveNodeId: (...args) => plannerGetCurrentPassiveNodeId(env, ...args),
        migratePassiveNodeIdList: (...args) => plannerMigratePassiveNodeIdList(env, ...args),
        migratePassiveNodeIdRecord: (...args) => plannerMigratePassiveNodeIdRecord(env, ...args),
        normalizePassiveTreePlannerState: (...args) => plannerNormalizePassiveTreePlannerState(env, ...args),
        ensurePassiveTreePlannerState: (...args) => plannerEnsurePassiveTreePlannerState(env, ...args),
        saveCurrentPassiveTreePreset: (...args) => plannerSaveCurrentPassiveTreePreset(env, ...args),
        setActivePassiveTreePreset: (...args) => plannerSetActivePassiveTreePreset(env, ...args),
        setPassiveTreeAutoInvest: (...args) => plannerSetPassiveTreeAutoInvest(env, ...args),
        encodePassiveTreePreset: (...args) => plannerEncodePassiveTreePreset(env, ...args),
        importPassiveTreePreset: (...args) => plannerImportPassiveTreePreset(env, ...args),
        runPassiveTreeAutoInvest: (...args) => plannerRunPassiveTreeAutoInvest(env, ...args)
    });
}
