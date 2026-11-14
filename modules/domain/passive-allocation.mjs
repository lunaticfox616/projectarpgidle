import { allocationHasAuthoredPassiveTreeSource, allocationHasAuthoredPassiveTree, allocationGetPassiveTreeRootNodeId, allocationGetPassiveTreeRootNode, allocationGetPassiveGatedStartIds, allocationGetPassiveBlockedStartIds, allocationGetPassiveRouting } from './passive-allocation-roots.mjs';
import { allocationIsPassiveNodeAvailable, allocationIsVoidSocketHidden, allocationGetPassiveConnectionNodeIds } from './passive-allocation-availability.mjs';
import { allocationGetPassiveApexNodeIds, allocationGetPassiveConstellationAwakeningProgress, allocationUnlockPassiveStarEvolution } from './passive-allocation-evolution.mjs';
import { allocationRebasePassiveTreeForClassChange, allocationSetPassiveRevelation } from './passive-allocation-changes.mjs';
import { allocationGetPassiveActivationPath, allocationGetPassiveKeystoneConflict, allocationActivatePassivePath, allocationGetPassiveLinkedNodeIds } from './passive-allocation-paths.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createPassiveAllocation(deps) {
    const env = { deps };

    return Object.freeze({
        hasAuthoredPassiveTreeSource: (...args) => allocationHasAuthoredPassiveTreeSource(env, ...args),
        hasAuthoredPassiveTree: (...args) => allocationHasAuthoredPassiveTree(env, ...args),
        getPassiveTreeRootNodeId: (...args) => allocationGetPassiveTreeRootNodeId(env, ...args),
        getPassiveTreeRootNode: (...args) => allocationGetPassiveTreeRootNode(env, ...args),
        getPassiveGatedStartIds: (...args) => allocationGetPassiveGatedStartIds(env, ...args),
        getPassiveBlockedStartIds: (...args) => allocationGetPassiveBlockedStartIds(env, ...args),
        getPassiveRouting: (...args) => allocationGetPassiveRouting(env, ...args),
        isPassiveNodeAvailable: (...args) => allocationIsPassiveNodeAvailable(env, ...args),
        isVoidSocketHidden: (...args) => allocationIsVoidSocketHidden(env, ...args),
        getPassiveConnectionNodeIds: (...args) => allocationGetPassiveConnectionNodeIds(env, ...args),
        getPassiveApexNodeIds: (...args) => allocationGetPassiveApexNodeIds(env, ...args),
        getPassiveConstellationAwakeningProgress: (...args) => allocationGetPassiveConstellationAwakeningProgress(env, ...args),
        unlockPassiveStarEvolution: (...args) => allocationUnlockPassiveStarEvolution(env, ...args),
        rebasePassiveTreeForClassChange: (...args) => allocationRebasePassiveTreeForClassChange(env, ...args),
        setPassiveRevelation: (...args) => allocationSetPassiveRevelation(env, ...args),
        getPassiveActivationPath: (...args) => allocationGetPassiveActivationPath(env, ...args),
        getPassiveKeystoneConflict: (...args) => allocationGetPassiveKeystoneConflict(env, ...args),
        activatePassivePath: (...args) => allocationActivatePassivePath(env, ...args),
        getPassiveLinkedNodeIds: (...args) => allocationGetPassiveLinkedNodeIds(env, ...args)
    });
}
