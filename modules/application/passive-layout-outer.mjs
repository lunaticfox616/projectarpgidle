import { addNode, applyNodeSpec, connect } from './passive-layout-nodes.mjs';
import { angleDistance } from './passive-layout-geometry.mjs';

export function buildOuterStars(ctx) {
    ctx.deps.PASSIVE_APEX_CONFIGS.forEach((config, index) => {
        let angle = -Math.PI / 2 + (index / ctx.deps.PASSIVE_APEX_CONFIGS.length) * Math.PI * 2;
        let apexRadius = ctx.baseOuterRadius + 210;
        let apex = addNode(ctx, { x: Math.cos(angle) * apexRadius, y: Math.sin(angle) * apexRadius * 0.92, tier: 3, themeOrStat: config.stat, meta: { sector: `star_${index}`, kind: 'apex', depth: ctx.maxDepth + 1, lane: index } });
        applyNodeSpec(ctx, apex, {
            title: config.title,
            stat: config.stat,
            val: config.val,
            kind: 'apex',
            desc: config.desc,
            starIndex: index
        }, 'apex');
        if (!apex) return;

        let anchors = ctx.outerAnchors
            .map(node => ({
                node: node,
                dist: Math.hypot(node.x - apex.x, node.y - apex.y),
                angleDiff: angleDistance(ctx, Math.atan2(node.y, node.x), angle)
            }))
            .filter(entry => entry.angleDiff <= 0.7)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 2)
            .map(entry => entry.node);
        if (anchors.length === 0) {
            anchors = ctx.outerAnchors
                .map(node => ({ node: node, dist: Math.hypot(node.x - apex.x, node.y - apex.y) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 2)
                .map(entry => entry.node);
        }
        anchors.forEach(node => connect(ctx, node.id, apex.id));

        let leftSpec = config.outerNodes[0];
        let rightSpec = config.outerNodes[1];
        let tipSpec = config.outerNodes[2];
        let branchRadius = ctx.baseOuterRadius + 360;
        let tipRadius = ctx.baseOuterRadius + 500;
        let leftNode = addNode(ctx, { x: Math.cos(angle - 0.16) * branchRadius, y: Math.sin(angle - 0.16) * branchRadius * 0.91, tier: 3, themeOrStat: leftSpec.stat, meta: { sector: `star_${index}`, kind: leftSpec.kind, depth: ctx.maxDepth + 2, lane: -1 } });
        let rightNode = addNode(ctx, { x: Math.cos(angle + 0.16) * branchRadius, y: Math.sin(angle + 0.16) * branchRadius * 0.91, tier: 3, themeOrStat: rightSpec.stat, meta: { sector: `star_${index}`, kind: rightSpec.kind, depth: ctx.maxDepth + 2, lane: 1 } });
        let tipNode = addNode(ctx, { x: Math.cos(angle) * tipRadius, y: Math.sin(angle) * tipRadius * 0.9, tier: 3, themeOrStat: tipSpec.stat, meta: { sector: `star_${index}`, kind: tipSpec.kind, depth: ctx.maxDepth + 3, lane: 0 } });
        applyNodeSpec(ctx, leftNode, { ...leftSpec, requiresEvolution: true, starIndex: index }, leftSpec.kind);
        applyNodeSpec(ctx, rightNode, { ...rightSpec, requiresEvolution: true, starIndex: index }, rightSpec.kind);
        applyNodeSpec(ctx, tipNode, { ...tipSpec, requiresEvolution: true, starIndex: index }, tipSpec.kind);
        connectOuterBranches(ctx, { anchors, apex, leftNode, rightNode, tipNode });
    });
}

function connectOuterBranches(ctx, { anchors, apex, leftNode, rightNode, tipNode }) {
    let leftAnchor = anchors[0] || apex;
    let rightAnchor = anchors[1] || anchors[0] || apex;
    if (leftNode) connect(ctx, leftAnchor.id, leftNode.id);
    if (rightNode) connect(ctx, rightAnchor.id, rightNode.id);
    if (leftNode && tipNode) connect(ctx, leftNode.id, tipNode.id);
    if (rightNode && tipNode) connect(ctx, rightNode.id, tipNode.id);
}
