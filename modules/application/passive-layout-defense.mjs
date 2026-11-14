import { angleDistance, getWebRadius } from './passive-layout-geometry.mjs';
import { addNode, applyNodeSpec, connect } from './passive-layout-nodes.mjs';

export function buildDeflectCluster(ctx, { clusterKey, angle, radiusStart, values, finalMajor }) {
    let anchors = Object.values(ctx.deps.PASSIVE_TREE.nodes)
        .filter(node => node && !node.clusterId)
        .map(node => ({ node: node, dist: Math.abs(angleDistance(ctx, Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) }))
        .sort((a, b) => a.dist - b.dist);
    let prev = anchors.length > 0 ? anchors[0].node : ctx.root;
    for (let i = 0; i < values.length; i++) {
        let stepRadius = radiusStart + i * 74;
        let stepAngle = angle + (i - 1.5) * 0.035;
        let stat = finalMajor && i === values.length - 1 ? 'deflectMajor' : 'deflectChance';
        let node = addNode(ctx, { x: Math.cos(stepAngle) * stepRadius, y: Math.sin(stepAngle) * stepRadius * ctx.webYScale, tier: i === values.length - 1 ? 3 : 2, themeOrStat: stat, meta: { sector: 'deflect', kind: i === values.length - 1 ? 'keystone' : 'major', depth: ctx.maxDepth - 2 + i, lane: i } });
        if (!node) return;
        applyNodeSpec(ctx, node, deflectNodeSpec(ctx, { stat, value: values[i], isLast: i === values.length - 1, finalMajor }), node.kind);
        node.clusterId = clusterKey;
        node.clusterRole = 'deflect';
        node.clusterRoleLabel = '비껴내기';
        node.clusterStep = i + 1;
        node.clusterLength = values.length;
        if (prev) connect(ctx, prev.id, node.id);
        prev = node;
    }
}

export function buildBlockCluster(ctx, { clusterKey, angle, radiusStart, values, stat, labelSuffix }) {
    let anchors = Object.values(ctx.deps.PASSIVE_TREE.nodes)
        .filter(node => node && !node.clusterId)
        .map(node => ({ node: node, dist: Math.abs(angleDistance(ctx, Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) }))
        .sort((a, b) => a.dist - b.dist);
    let prev = anchors.length > 0 ? anchors[0].node : ctx.root;
    for (let i = 0; i < values.length; i++) {
        let stepRadius = radiusStart + i * 74;
        let stepAngle = angle + (i - 1.5) * 0.035;
        let node = addNode(ctx, { x: Math.cos(stepAngle) * stepRadius, y: Math.sin(stepAngle) * stepRadius * ctx.webYScale, tier: i === values.length - 1 ? 3 : 2, themeOrStat: stat, meta: { sector: 'block', kind: i === values.length - 1 ? 'keystone' : 'major', depth: ctx.maxDepth - 2 + i, lane: i } });
        if (!node) return;


        applyNodeSpec(ctx, node, blockNodeSpec(ctx, { stat, value: values[i], isLast: i === values.length - 1, labelSuffix }), node.kind);
        node.clusterId = clusterKey;
        node.clusterRole = 'block';
        node.clusterRoleLabel = '막기';
        node.clusterStep = i + 1;
        node.clusterLength = values.length;
        if (prev) connect(ctx, prev.id, node.id);
        prev = node;
    }
}

export function buildDefenseClusters(ctx) {
    buildDeflectCluster(ctx, { clusterKey: 'deflect_chance_cluster', angle: 0.34, radiusStart: getWebRadius(ctx, 7) * ctx.deps.PASSIVE_WORLD_SCALE, values: [4, 4, 4, 8], finalMajor: false });
    buildDeflectCluster(ctx, { clusterKey: 'deflect_reduction_cluster', angle: 0.72, radiusStart: getWebRadius(ctx, 7.6) * ctx.deps.PASSIVE_WORLD_SCALE, values: [3, 3, 3, 6], finalMajor: true });
    buildDeflectCluster(ctx, { clusterKey: 'deflect_south_cluster', angle: 1.30, radiusStart: getWebRadius(ctx, 7.2) * ctx.deps.PASSIVE_WORLD_SCALE, values: [4, 4, 4, 8], finalMajor: false });
    buildBlockCluster(ctx, { clusterKey: 'block_south_cluster', angle: 1.52, radiusStart: getWebRadius(ctx, 7.5) * ctx.deps.PASSIVE_WORLD_SCALE, values: [1.5, 1.5, 1.5, 3], stat: 'blockChance', labelSuffix: '%p' });
    buildBlockCluster(ctx, { clusterKey: 'block_flat_cluster', angle: 2.55, radiusStart: getWebRadius(ctx, 7.1) * ctx.deps.PASSIVE_WORLD_SCALE, values: [1.5, 1.5, 1.5, 3], stat: 'blockChance', labelSuffix: '%p' });
    buildBlockCluster(ctx, { clusterKey: 'block_base_pct_cluster', angle: 3.02, radiusStart: getWebRadius(ctx, 7.7) * ctx.deps.PASSIVE_WORLD_SCALE, values: [20, 20, 20, 30], stat: 'blockChancePct', labelSuffix: '% 증가' });
}

function deflectNodeSpec(ctx, { stat, value, isLast, finalMajor }) {
    return {
        stat: stat,
        val: value,
        title: isLast ? '비껴내기 숙련' : '비껴내기 자세',
        desc: finalMajor && isLast
            ? '비껴내기 확률을 크게 올리고, 비껴낸 피해의 감소율을 추가로 강화합니다.'
            : '공격을 정면으로 받지 않고 흘려 받는 방어 성좌입니다.',
        kind: isLast ? 'keystone' : 'major',
        effectLabel: finalMajor && isLast ? ctx.deps._t('비껴내기 확률 +{values}%, 비껴내기 피해 감소 +3%', { values: value }) : ctx.deps._t('비껴내기 확률 +{values}%', { values: value })
    };
}

function blockNodeSpec(ctx, { stat, value, isLast, labelSuffix }) {
    let title = stat === 'blockChancePct' ? '막기 기반 강화' : '막기 자세';
    let desc = stat === 'blockChancePct'
        ? '완갑과 대검의 기본 막기 확률에서 비율로 증가하는 방어 성좌입니다.'
        : '최종 막기 확률에 직접 더해지는 방어 성좌입니다.';
    return {
        stat: stat,
        val: value,
        title: isLast ? ctx.deps._t('{title} 숙련', { title }) : title,
        desc: desc,
        kind: isLast ? 'keystone' : 'major',
        effectLabel: ctx.deps._t('막기 확률 +{values}{labelSuffix}', { values: value, labelSuffix })
    };
}
