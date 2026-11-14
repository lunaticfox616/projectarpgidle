import { allocationHasAuthoredPassiveTree } from './passive-allocation-roots.mjs';

export function* allocationRebasePassiveTreeForClassChange(env, owner, previousClassId, nextClassId) {
    if (!allocationHasAuthoredPassiveTree(env) || previousClassId === nextClassId) return 0;
    const previousRoot = env.deps.PASSIVE_TREE_V22.classStarts[previousClassId];
    const nextRoot = env.deps.PASSIVE_TREE_V22.classStarts[nextClassId];
    if (!previousRoot || !nextRoot || previousRoot === nextRoot) return 0;
    const invested = (Array.isArray(owner.passives) ? owner.passives : [])
        .filter(nodeId => env.deps.PASSIVE_TREE.nodes[nodeId] && env.deps.PASSIVE_TREE.nodes[nodeId].kind !== 'start');
    const hadOverflowKeystone = env.deps.hasAuthoredPassiveKeystone(owner, '의지의 공명');
    owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0) + invested.length - env.deps.passiveRouting.paleBonus(owner));
    owner.passives = [];
    owner.passiveAttributeChoices = {};
    owner.discoveredPassives = [nextRoot];
    if (hadOverflowKeystone) (yield { kind: 'passiveNormalizeSupport', args: [true, null, true] });
    yield { kind: 'passiveRenderDirty', args: ['state'] };
    return invested.length;
}

export function allocationSetPassiveRevelation(env, owner, revelationId) {
    if (!env.deps.PASSIVE_REVELATION_IDS.includes(revelationId)) return false;
    if (env.deps.getAllocatedPassiveStatValue(owner, 'devotion') < 1) return false;
    if (env.deps.findAllocatedPassiveKeystone(owner, '삼중 계시')) return false;
    env.deps.ensurePassiveSpecializationState(owner).revelation = revelationId;
    return true;
}
