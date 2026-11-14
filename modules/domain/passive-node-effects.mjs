import { passiveRuleGetPassiveTreeAdjacency, passiveRuleIsPassiveTreeEdgeAvailable } from './passive-tree-access.mjs';
import { passiveRuleFindAllocatedPassiveKeystone } from './passive-keystone-lookup.mjs';
import { passiveRuleGetVirtualVoidPassiveCount } from './passive-void-count.mjs';

export function passiveRuleGetPassiveNodeRawEffects(node) {
    if (!node) return [];
    if (node.intentionalNoEffect) return [];
    if (Array.isArray(node.effects) && node.effects.length > 0) return node.effects;
    if (!node.stat) return [];
    return [{ stat: node.stat, val: Number(node.val) || 0 }];
}

export function passiveRuleGetPassiveSpecialStatReserve(env, owner, statId, excludedNodeId) {
    return (owner && owner.passives || []).reduce((total, nodeId) => {
        const node = env.deps.PASSIVE_TREE.nodes[nodeId], key = String(nodeId);
        if (!node || key === String(excludedNodeId)) return total;
        if (node.kind === 'void' || node.activationRequirement) return total;
        return total + passiveRuleGetPassiveNodeRawEffects(node)
            .filter(effect => effect && effect.stat === statId)
            .reduce((sum, effect) => sum + (Number(effect.val) || 0), 0);
    }, 0);
}

export function passiveRuleGetPassiveNodeActivationState(env, owner, node) {
    const requirement = node && node.activationRequirement;
    if (!requirement || requirement.type !== 'special-stat-reserve') {
        return { active: true, statId: null, available: 0, required: 0 };
    }
    const required = Math.max(0, Number(requirement.minimum) || 0);
    const available = Math.max(0, passiveRuleGetPassiveSpecialStatReserve(env, owner, requirement.statId, node.id));
    return { active: available >= required, statId: requirement.statId, available, required };
}

/** connectedDevotionPenalty is percentage points per allocated adjacent devotion node,
 * not per devotion stat point. Allocation counts even when that spoke's own effect is inactive.
 * Derive on read so refunds, presets and restored saves never persist a reduced base value.
 */
export function passiveRuleGetEffectivePassiveNodeEffects(env, owner, node, balanceAttributes = false) {
    if (!passiveRuleGetPassiveNodeActivationState(env, owner, node).active) return [];
    const effects = passiveRuleGetDevotionAdjustedPassiveEffects(env, owner, node);
    if (!balanceAttributes) return effects;
    return effects.flatMap(effect => effect.stat === 'strength' || effect.stat === 'dexterity'
        ? [{ stat: 'strength', val: effect.val / 2 }, { stat: 'dexterity', val: effect.val / 2 }]
        : [effect]);
}

export function passiveRuleGetDevotionAdjustedPassiveEffects(env, owner, node) {
    const effects = passiveRuleGetPassiveNodeRawEffects(node);
    if (!node || !node.connectedDevotionPenalty) return effects;
    const neighbors = passiveRuleGetPassiveTreeAdjacency(env, owner).get(String(node.id)) || [];
    const count = neighbors.filter(id => (owner.passives || []).includes(id)
        && passiveRuleGetPassiveNodeRawEffects(env.deps.PASSIVE_TREE.nodes[id]).some(effect => effect.stat === 'devotion')).length;
    const penalty = count * node.connectedDevotionPenalty;
    return effects.map(effect => ['physPctDmg', 'lightPctDmg'].includes(effect.stat)
        ? { ...effect, val: effect.val - penalty } : effect);
}

/** 공허제어(2026-11-01 사용자: 연결된 공허 소켓의 효율 25% 증가): 이 소켓과 이어진 할당 노드의 voidLinkEfficiency 합을 줄 배율로 바꾼다. 찍고 지울 때 어긋나지 않게 읽을 때 잰다. */
export function passiveRuleGetVoidLinkScale(env, owner, nodeId) {
    const owned = owner.passives || [], neighbors = passiveRuleGetPassiveTreeAdjacency(env, owner).get(String(nodeId)) || [];
    const lines = neighbors.filter(id => owned.includes(id)).flatMap(id => passiveRuleGetPassiveNodeRawEffects(env.deps.PASSIVE_TREE.nodes[id]));
    const constellation = passiveRuleFindAllocatedPassiveKeystone(env, owner, '공허의 별자리') ? passiveRuleGetVirtualVoidPassiveCount(env, owner) : 0;
    return 1 + (lines.filter(effect => effect.stat === 'voidLinkEfficiency').reduce((sum, effect) => sum + Number(effect.val), 0) + constellation) / 100;
}

export function passiveRuleGetAllocatedPassiveStatValue(env, owner, statId) {
    const totals = {};
    (owner && owner.passives || []).forEach(nodeId => {
        const node = env.deps.PASSIVE_TREE.nodes[nodeId];
        if (!node || node.kind === 'void') return;
        const effects = passiveRuleGetEffectivePassiveNodeEffects(env, owner, node);
        effects.forEach(effect => {
            if (!effect || !effect.stat) return;
            totals[effect.stat] = (totals[effect.stat] || 0) + (Number(effect.val) || 0);
        });
    });
    if (statId !== 'devotion') return Math.max(0, Number(totals[statId]) || 0);
    let devotion = Math.max(0, Number(totals.devotion) || 0);
    if (passiveRuleFindAllocatedPassiveKeystone(env, owner, '육신과 정신의 성약')) {
        devotion += Math.floor(Math.max(0, totals.strength || 0) / 10) + Math.floor(Math.max(0, totals.intelligence || 0) / 10);
    }
    const covenant = passiveRuleFindAllocatedPassiveKeystone(env, owner, '헌신의 서약');
    if (covenant) devotion += passiveRuleCountCovenantAttributeConnections(env, owner, covenant);
    return devotion;
}

export function passiveRuleCountCovenantAttributeConnections(env, owner, keystone) {
    if (!keystone) return 0;
    const neighborIds = [...new Set(env.deps.PASSIVE_TREE.edges.filter(edge => passiveRuleIsPassiveTreeEdgeAvailable(owner, edge)
        && (edge.from === keystone.id || edge.to === keystone.id))
        .map(edge => edge.from === keystone.id ? edge.to : edge.from))];
    const owned = new Set(owner.passives || []);
    return neighborIds.filter(id => {
        const node = env.deps.PASSIVE_TREE.nodes[id];
        return owned.has(id) && (node.effects || []).some(effect => ['strength', 'dexterity', 'intelligence'].includes(effect.stat));
    }).length;
}
