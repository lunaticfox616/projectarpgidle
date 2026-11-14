import { passiveRuleGetClassKeystoneDefs, passiveRuleIsPassiveTreePathEdge, passiveRuleIsPassiveTreeEdgeAvailable, passiveRuleGetPassiveTreeAdjacency, passiveRuleGetPassiveWisdomElementFromNodeIds } from './passive-tree-access.mjs';
import { passiveRuleNormalizePassiveSpecializationState, passiveRuleEnsurePassiveSpecializationState } from './passive-specialization-state.mjs';
import { passiveRuleGetPassiveNodeRawEffects, passiveRuleGetPassiveNodeActivationState, passiveRuleGetEffectivePassiveNodeEffects, passiveRuleGetVoidLinkScale, passiveRuleGetAllocatedPassiveStatValue } from './passive-node-effects.mjs';
import { passiveRuleHasAuthoredPassiveKeystone, passiveRuleFindAllocatedPassiveKeystone, passiveRuleGetPassiveKeystoneNodeId } from './passive-keystone-lookup.mjs';
import { passiveRuleGetMystiqueAffinity, passiveRuleRecordPassiveCycleAilmentEnd, passiveRuleRecordPassiveCycleAilmentStart, passiveRuleGetActivePassiveCycleBuffEffects, passiveRuleRecordPassiveFanaticSkillUse } from './passive-cycle-rules.mjs';
import { passiveRuleRecordPassiveKarmaLoss, passiveRuleBeginPassiveKarmaAttack } from './passive-karma-rules.mjs';
import { passiveRuleGetPassiveAshuraAilmentChance, passiveRuleGetPassiveAshuraDamageMultiplier, passiveRuleApplyPassiveAshuraDamageBreakdown } from './passive-ailment-rules.mjs';
import { passiveRuleApplyPassiveKeystoneBucketRules } from './passive-keystone-buckets.mjs';
import { passiveRuleGetBladeBundleShots } from './passive-combat-flags.mjs';
import { passiveRuleApplyAuthoredPassiveStatRules } from './passive-stat-rules.mjs';
import { passiveRuleGetVirtualVoidPassiveCount } from './passive-void-count.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createPassiveRules(deps) {
    const env = { deps };
    env.passiveTreeAdjacencyCache = { signature: '', map: new Map() };
    return Object.freeze({
        getClassKeystoneDefs: (...args) => passiveRuleGetClassKeystoneDefs(env, ...args),
        isPassiveTreePathEdge: (...args) => passiveRuleIsPassiveTreePathEdge(env, ...args),
        isPassiveTreeEdgeAvailable: passiveRuleIsPassiveTreeEdgeAvailable,
        getPassiveTreeAdjacency: (...args) => passiveRuleGetPassiveTreeAdjacency(env, ...args),
        getPassiveWisdomElementFromNodeIds: (...args) => passiveRuleGetPassiveWisdomElementFromNodeIds(env, ...args),
        normalizePassiveSpecializationState: (...args) => passiveRuleNormalizePassiveSpecializationState(env, ...args),
        ensurePassiveSpecializationState: (...args) => passiveRuleEnsurePassiveSpecializationState(env, ...args),
        getPassiveNodeRawEffects: passiveRuleGetPassiveNodeRawEffects,
        getPassiveNodeActivationState: (...args) => passiveRuleGetPassiveNodeActivationState(env, ...args),
        getEffectivePassiveNodeEffects: (...args) => passiveRuleGetEffectivePassiveNodeEffects(env, ...args),
        getVoidLinkScale: (...args) => passiveRuleGetVoidLinkScale(env, ...args),
        getAllocatedPassiveStatValue: (...args) => passiveRuleGetAllocatedPassiveStatValue(env, ...args),
        hasAuthoredPassiveKeystone: (...args) => passiveRuleHasAuthoredPassiveKeystone(env, ...args),
        findAllocatedPassiveKeystone: (...args) => passiveRuleFindAllocatedPassiveKeystone(env, ...args),
        getPassiveKeystoneNodeId: (...args) => passiveRuleGetPassiveKeystoneNodeId(env, ...args),
        getMystiqueAffinity: (...args) => passiveRuleGetMystiqueAffinity(env, ...args),
        recordPassiveCycleAilmentEnd: (...args) => passiveRuleRecordPassiveCycleAilmentEnd(env, ...args),
        recordPassiveCycleAilmentStart: (...args) => passiveRuleRecordPassiveCycleAilmentStart(env, ...args),
        getActivePassiveCycleBuffEffects: (...args) => passiveRuleGetActivePassiveCycleBuffEffects(env, ...args),
        recordPassiveFanaticSkillUse: (...args) => passiveRuleRecordPassiveFanaticSkillUse(env, ...args),
        recordPassiveKarmaLoss: (...args) => passiveRuleRecordPassiveKarmaLoss(env, ...args),
        beginPassiveKarmaAttack: (...args) => passiveRuleBeginPassiveKarmaAttack(env, ...args),
        getPassiveAshuraAilmentChance: passiveRuleGetPassiveAshuraAilmentChance,
        getPassiveAshuraDamageMultiplier: (...args) => passiveRuleGetPassiveAshuraDamageMultiplier(env, ...args),
        applyPassiveAshuraDamageBreakdown: (...args) => passiveRuleApplyPassiveAshuraDamageBreakdown(env, ...args),
        applyPassiveKeystoneBucketRules: (...args) => passiveRuleApplyPassiveKeystoneBucketRules(env, ...args),
        getBladeBundleShots: (...args) => passiveRuleGetBladeBundleShots(env, ...args),
        applyAuthoredPassiveStatRules: (...args) => passiveRuleApplyAuthoredPassiveStatRules(env, ...args),
        getVirtualVoidPassiveCount: (...args) => passiveRuleGetVirtualVoidPassiveCount(env, ...args)
    });
}
