export function getWebSectorIndex(ctx, spoke) {
    return Math.floor(((spoke % ctx.webSpokeCount) + ctx.webSpokeCount) % ctx.webSpokeCount / ctx.spokesPerSector) % ctx.sectorCount;
}

export function getWebTheme(ctx, spoke) {
    return ctx.sectorThemes[getWebSectorIndex(ctx, spoke)];
}

export function getWebLane(ctx, spoke) {
    return (spoke % ctx.spokesPerSector) === 0 ? 0 : 1;
}

export function getWebAngle(ctx, spoke) {
    return -Math.PI / 2 + spoke * ctx.angleStep;
}

export function getWebRadius(ctx, depth) {
    return ctx.innerRadius + (depth - 1) * ctx.ringSpacing;
}

export function getWebPoint(ctx, spoke, depth, angleShift, radiusShift) {
    let angle = getWebAngle(ctx, spoke) + (angleShift || 0);
    let radius = getWebRadius(ctx, depth) + (radiusShift || 0);
    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * ctx.webYScale
    };
}

export function realignWebPathNodes(ctx) {
    for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
        for (let depth = 1; depth <= ctx.maxDepth; depth++) {
            let node = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
            if (!node) continue;
            let point = getWebPoint(ctx, spoke, depth, 0, 0);
            node.x = point.x * ctx.deps.PASSIVE_WORLD_SCALE;
            node.y = point.y * ctx.deps.PASSIVE_WORLD_SCALE;
        }
    }
}

export function classifyWebNode(ctx, depth, spoke) {
    let lane = getWebLane(ctx, spoke);
    let isPrimarySpoke = lane === 0;
    if (depth === 1 && isPrimarySpoke) return { tier: 2, kind: 'core' };
    if (isWebHub(depth, lane)) return { tier: 2, kind: 'hub' };
    if (depth === ctx.maxDepth && isPrimarySpoke) return { tier: 3, kind: 'keystone' };
    if (depth === ctx.maxDepth || depth % 3 === 0) return { tier: 2, kind: 'major' };
    return { tier: 1, kind: 'path' };
}

function isWebHub(depth, lane) {
    return (depth === 4 && lane === 1) || (depth === 7 && lane === 1) || (depth === 10 && lane === 0);
}

export function getWebCellClusterPoint(ctx, cell, step, chainLength) {
    let t = step / Math.max(1, chainLength + 1);
    let bendDir = cell.bendDir || 1;
    let bow = Math.sin(t * Math.PI) * (cell.blueprint.spread || 0.4);
    let curve = Math.sin(t * Math.PI * 1.35) * 0.07 * bendDir;
    let radiusCurve = Math.sin(t * Math.PI * 2) * 0.05 * bendDir;
    let angleRatio = 0.12 + t * 0.44 + bow * 0.08 + curve;
    let radiusRatio = 0.10 + t * 0.56 + radiusCurve;
    let angle = cell.angle + ctx.angleStep * Math.max(0.10, Math.min(0.72, angleRatio));
    let radius = (cell.innerRadius + ctx.ringSpacing * Math.max(0.08, Math.min(0.72, radiusRatio))) * ctx.deps.PASSIVE_WORLD_SCALE;
    return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius * ctx.webYScale
    };
}

export function realignSpecializedClusters(ctx, clusterCellsById) {
    let clusterNodes = Object.values(ctx.deps.PASSIVE_TREE.nodes)
        .filter(node => node && node.clusterId && Number.isFinite(node.clusterStep))
        .sort((a, b) => {
            let clusterDelta = String(a.clusterId).localeCompare(String(b.clusterId));
            if (clusterDelta !== 0) return clusterDelta;
            return (a.clusterStep || 0) - (b.clusterStep || 0);
        });
    clusterNodes.forEach(node => {
        let cell = clusterCellsById[node.clusterAnchorId];
        if (!cell) return;
        let pos = getWebCellClusterPoint(ctx, cell, node.clusterStep || 1, node.clusterLength || 4);
        node.x = pos.x;
        node.y = pos.y;
    });
}

export function angleDistance(ctx, a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
}
