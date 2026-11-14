import { getNodeClearanceDistance } from './passive-layout-nodes.mjs';

function packingClearance(ctx, a, b) {
    let minDist = getNodeClearanceDistance(ctx, a, b, a.sector === b.sector ? 36 : 58);
    if (a.kind === 'apex' || b.kind === 'apex') minDist += 22;
    if (a.requiresEvolution || b.requiresEvolution) minDist += 18;
    if (a.clusterId && b.clusterId && a.clusterId !== b.clusterId) minDist += 18;
    return minDist;
}

function separateNodePair(ctx, a, b) {
    if (a.id === 'n0' || b.id === 'n0') return;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const minDist = packingClearance(ctx, a, b);
    if (dist >= minDist) return;
    const push = (minDist - dist) * 0.5;
    const nx = dx / dist;
    const ny = dy / dist;
    a.x -= nx * push;
    a.y -= ny * push;
    b.x += nx * push;
    b.y += ny * push;
}

export function packPassiveNodes(ctx) {
    // Pair order is significant: each displacement feeds the following pair/pass.
    for (let iter = 0; iter < 16; iter++) {
        for (let i = 0; i < ctx.packed.length; i++) {
            for (let j = i + 1; j < ctx.packed.length; j++) {
                separateNodePair(ctx, ctx.packed[i], ctx.packed[j]);
            }
        }
    }
}
