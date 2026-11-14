import { voidRuleEnsureVoidPassiveState } from './void-passive-state.mjs';

export function voidRuleGetVoidPassiveNodeIds(env) {
    return Object.values(env.deps.PASSIVE_TREE.nodes || {})
        .filter(node => node && node.kind === 'void')
        .map(node => String(node.id));
}

export function voidRuleCountAllocatedPassivesWithin(env, owner, nodeId, radius) {
    const center = env.deps.PASSIVE_TREE.nodes[nodeId];
    if (!center) return 0;
    return (owner.passives || []).filter(id => {
        const node = env.deps.PASSIVE_TREE.nodes[id];
        return node && id !== nodeId && node.kind !== 'start' && Math.hypot(node.x - center.x, node.y - center.y) <= radius;
    }).length;
}

export function voidRuleGetTranscendentVoidPassiveStats(env, owner, nodeId, entry, voidCount) {
    const tr = entry && entry.transcendent;
    const rule = tr && env.deps.TRANSCENDENT_VOID_STAT_LINES[tr.id];
    if (!rule) return [];
    const ctx = { voidCount, loopCount: Math.max(0, Math.floor(owner.loopCount || 0)),
        allocatedWithin: radius => voidRuleCountAllocatedPassivesWithin(env, owner, nodeId, radius) };
    const linkScale = env.deps.getVoidLinkScale(nodeId);   // 투영의 문양은 초월에도 곱한다(2026-11-01 사용자). 포인트와 보조룬 한도는 정수라 그대로 둔다.
    return rule(tr, ctx).map(([stat, val]) => ({ stat, val: (Number(val) || 0) * (['passivePoint', 'suppCap'].includes(stat) ? 1 : linkScale) }));
}

export function voidRuleGetTranscendentVoidPassiveCount(env, owner, id, normalize) {
    let state = normalize ? voidRuleEnsureVoidPassiveState(env, owner) : (owner.voidPassives || {});
    return (owner.passives || []).filter(nodeId => state[nodeId]?.transcendent?.id === id).length;
}
