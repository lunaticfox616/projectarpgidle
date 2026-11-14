import { classifyWebNode, getWebLane, getWebPoint, getWebSectorIndex, getWebTheme } from './passive-layout-geometry.mjs';
import { addNode, connect, specializePathNode } from './passive-layout-nodes.mjs';
import { connectWithOuterRelays } from './passive-layout-relays.mjs';

export function markVoidPassiveNodes(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        let candidates = (ctx.webNodes[spoke] || [])
            .filter(node => node && (node.webRing || 0) >= 3)
            .filter(node => node.kind === 'path' || node.kind === 'major');
        if (candidates.length <= 0) continue;
        let pick = candidates[(spoke * 7 + 3) % candidates.length];
        pick.legacyVoidStat = pick.stat;
        pick.legacyVoidVal = pick.val;
        pick.kind = 'void';
        pick.stat = 'pctDmg';
        pick.val = 0;
        pick.title = ctx.deps._t('공허 패시브');
        pick.desc = '처음 활성화할 때는 아무 효과도 없습니다. 마법의 새싹을 사용할 때마다 공허 옵션 1~2줄을 다시 굴릴 수 있습니다.';
        pick.effectLabel = null;
        pick.voidPassive = true;
    }
}

export function buildWebPaths(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        let theme = getWebTheme(ctx, spoke);
        let lane = getWebLane(ctx, spoke);
        ctx.webNodes[spoke] = [];
        let prev = null;
        for (let depth = 1; depth <= ctx.maxDepth; depth++) {
            let point = getWebPoint(ctx, spoke, depth, 0, 0);
            let shape = classifyWebNode(ctx, depth, spoke);
            let node = addNode(ctx, { x: point.x, y: point.y, tier: shape.tier, themeOrStat: theme, meta: { sector: theme, kind: shape.kind, depth: depth, lane: lane } });
            if (!node) break;
            node.webSpoke = spoke;
            node.webRing = depth;
            specializePathNode(ctx, { node: node, theme: theme, depth: depth, lane: lane, sectorIndex: getWebSectorIndex(ctx, spoke), shape: shape });
            ctx.webNodes[spoke][depth - 1] = node;
            if (prev) connect(ctx, prev.id, node.id);
            if (depth === 1 && lane === 0 && ctx.root) connect(ctx, ctx.root.id, node.id);
            prev = node;
        }
    }
}

export function connectWebRings(ctx) {
    for (let depth = 1; depth <= ctx.maxDepth; depth++) {
        for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
            connectRingSegment(ctx, depth, spoke);
        }
    }
}

function connectRingSegment(ctx, depth, spoke) {
    let a = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
    let b = ctx.webNodes[(spoke + 1) % ctx.webSpokeCount] && ctx.webNodes[(spoke + 1) % ctx.webSpokeCount][depth - 1];
    let intentionalGap = depth >= 4 && depth <= 9 && ((spoke + depth) % 7 === 3);
    if (!a || !b || intentionalGap) return;
    if (depth >= 9) connectWithOuterRelays(ctx, a, b, depth, spoke);
    else connect(ctx, a.id, b.id);
}

export function connectWebDiagonals(ctx) {
    for (let depth = 2; depth < ctx.maxDepth; depth++) {
        for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
            connectDiagonalSegment(ctx, depth, spoke);
        }
    }
}

function connectDiagonalSegment(ctx, depth, spoke) {
    let a = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
    if (!a) return;
    if (depth % 4 === 0 && spoke % 3 === 1) {
        connectAdjacentWebNode(ctx, a, (spoke + 1) % ctx.webSpokeCount, depth);
    }
    if (depth % 5 === 2 && spoke % 4 === 0) {
        connectAdjacentWebNode(ctx, a, (spoke + ctx.webSpokeCount - 1) % ctx.webSpokeCount, depth);
    }
}

function connectAdjacentWebNode(ctx, node, spoke, index) {
    const adjacent = ctx.webNodes[spoke] && ctx.webNodes[spoke][index];
    if (adjacent) connect(ctx, node.id, adjacent.id);
}
