/** 세계수 아틀라스 패시브 (data/atlas-passives.js): 아틀라스 포인트(완료 + 보너스)로 노드를 찍는다. 루프를 넘어 남는다.
 * 찍기는 뿌리이거나 requires 중 하나가 찍혀 있을 때, 되돌리기는 그 노드에만 기대는 찍힌 노드가 없을 때 무료로 한다.
 */
import { atlasPassiveLoopOf, atlasPassiveWaits, atlasPassiveAvailable, atlasPassiveSpendable, atlasPassiveReason, atlasPassiveAllocate, atlasPassiveRefundReason, atlasPassiveRefund, atlasPassiveStatus, atlasPassiveSum, atlasPassiveEffects, atlasPassiveHas, atlasPassiveNormalize } from './atlas-passives-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createAtlasPassives(deps) {
    const env = { deps };
    env.NODES = new Map(env.deps.ATLAS_PASSIVES.wheels.flatMap(wheel => wheel.nodes.map(node => [node.id, { ...node, wheel: wheel.id }])));
    env.EFFECT_KEYS = new Set(Object.keys(env.deps.ATLAS_PASSIVES.labels));
    env.ROOM_LOOPS = new Map(Object.entries(env.deps.ATLAS.encounters).flatMap(([type, rule]) => [[type, rule.minLoop || 0], [`${type}Reward`, rule.minLoop || 0]]));
    return Object.freeze({ nodes: env.NODES, effectKeys: env.EFFECT_KEYS, loopOf: (...args) => atlasPassiveLoopOf(env, ...args), waits: (...args) => atlasPassiveWaits(env, ...args), available: (...args) => atlasPassiveAvailable(env, ...args), spendable: (...args) => atlasPassiveSpendable(env, ...args), reason: (...args) => atlasPassiveReason(env, ...args), allocate: (...args) => atlasPassiveAllocate(env, ...args), refundReason: (...args) => atlasPassiveRefundReason(env, ...args), refund: (...args) => atlasPassiveRefund(env, ...args), status: (...args) => atlasPassiveStatus(env, ...args), sum: (...args) => atlasPassiveSum(env, ...args), effects: (...args) => atlasPassiveEffects(env, ...args), has: (...args) => atlasPassiveHas(env, ...args), normalize: (...args) => atlasPassiveNormalize(env, ...args) });
}
