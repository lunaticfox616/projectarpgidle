import { getWebAngle, getWebCellClusterPoint, getWebLane, getWebRadius, getWebTheme } from './passive-layout-geometry.mjs';
import { getClusterStatForStep, getFinalClusterSpec, isClusterSpecAvailable } from './passive-layout-specs.mjs';
import { addNode, connect } from './passive-layout-nodes.mjs';

function prepareCluster(ctx, spoke, depth) {
    const theme = getWebTheme(ctx, spoke);
    const themes = ctx.clusterThemeBySector[theme] || ctx.clusterThemeBySector.templar;
    const blueprint = ctx.webCellClusterBlueprints[(depth + spoke) % ctx.webCellClusterBlueprints.length];
    let themeSpec = themes[(depth * 2 + spoke) % themes.length];
    if (!blueprint || !themeSpec || !ctx.deps.P_STATS[themeSpec.stat]) return null;
    themeSpec = getFinalClusterSpec(ctx, themeSpec, spoke, depth);
    if (!isClusterSpecAvailable(ctx, themeSpec)) return null;
    const chainLength = themeSpec.length || blueprint.length || 4;
    const clusterId = 'web_' + spoke + '_' + depth + '_' + blueprint.role;
    const cell = {
        angle: getWebAngle(ctx, spoke),
        innerRadius: getWebRadius(ctx, depth),
        blueprint,
        bendDir: ((spoke + depth) % 2 === 0) ? 1 : -1
    };
    return { theme, blueprint, themeSpec, chainLength, clusterId, cell, spoke, depth };
}

function assignClusterValue(ctx, node, { statForStep, tier, chainLength, step }) {
    node.val = ctx.deps.getPassiveStatTierValue(statForStep, tier);
    if (statForStep === 'slamPctDmg') node.val *= 2;
    if (statForStep === 'critDmg') {
        if (chainLength === 4) node.val = [8, 8, 12, 20][step - 1];
        else if (chainLength === 5) node.val = [12, 12, 12, 12, 25][step - 1];
    }
}

function describeClusterStep(ctx, node, cluster, step) {
    const { themeSpec, theme, blueprint, chainLength } = cluster;
    if (step === chainLength) {
        node.title = ctx.deps._t('{title} 핵심', { title: themeSpec.title });
        node.desc = ctx.deps._t('{PASSIVE_SECTOR_TITLES}의 {label} 구역을 완성하는 거미줄 칸 내부 전문 노드입니다.', { PASSIVE_SECTOR_TITLES: ctx.deps.PASSIVE_SECTOR_TITLES[theme] || ctx.deps._t('성좌'), label: blueprint.label });
    } else if (step === 1) {
        node.title = ctx.deps._t('{title} 길목', { title: themeSpec.title });
        node.desc = ctx.deps._t('거미줄 경로 한 칸 안에서 {label} 축으로 갈라지는 시작 노드입니다.', { label: blueprint.label });
    }
}

function createClusterStep(ctx, cluster, step) {
    const { cell, chainLength, themeSpec, theme, depth, spoke, clusterId, blueprint } = cluster;
    const isEnd = step === chainLength;
    const pos = getWebCellClusterPoint(ctx, cell, step, chainLength);
    const tier = isEnd ? 3 : (step >= chainLength - 1 ? 2 : 1);
    const kind = isEnd ? 'keystone' : (step >= chainLength - 1 ? 'major' : 'node');
    const statForStep = getClusterStatForStep(ctx, themeSpec, isEnd);
    const node = addNode(ctx, {
        x: pos.x / ctx.deps.PASSIVE_WORLD_SCALE, y: pos.y / ctx.deps.PASSIVE_WORLD_SCALE,
        tier, themeOrStat: statForStep,
        meta: { sector: theme, kind, depth: depth + step, lane: getWebLane(ctx, spoke) }
    });
    if (!node) return null;
    node.clusterId = clusterId;
    node.clusterAnchorId = clusterId;
    node.clusterRole = blueprint.role;
    node.clusterRoleLabel = blueprint.label;
    node.clusterStep = step;
    node.clusterLength = chainLength;
    node.clusterTheme = themeSpec.title;
    node.clusterBaseStat = themeSpec.stat;
    node.clusterEndStat = themeSpec.endStat || null;
    node.webCellSpoke = spoke;
    node.webCellRing = depth;
    assignClusterValue(ctx, node, { statForStep, tier, chainLength, step });
    describeClusterStep(ctx, node, cluster, step);
    return node;
}

function connectClusterEntrance(ctx, node, spoke, depth) {
    if ((spoke + depth) % 4 !== 0) return;
    const sideAnchor = ctx.webNodes[(spoke + 1) % ctx.webSpokeCount] && ctx.webNodes[(spoke + 1) % ctx.webSpokeCount][depth - 1];
    const radialAnchor = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth];
    if (sideAnchor) connect(ctx, sideAnchor.id, node.id);
    if (radialAnchor && ((spoke + depth) % 8 === 0)) connect(ctx, radialAnchor.id, node.id);
}

function buildWebCellCluster(ctx, anchor, spoke, depth, clusterCellsById) {
    if (!anchor) return;
    if (depth <= 2 && ((spoke + depth) % 2 === 0)) return;
    const cluster = prepareCluster(ctx, spoke, depth);
    if (!cluster) return;
    clusterCellsById[cluster.clusterId] = cluster.cell;
    let prev = anchor;
    for (let step = 1; step <= cluster.chainLength; step++) {
        const node = createClusterStep(ctx, cluster, step);
        if (!node) return;
        connect(ctx, prev.id, node.id);
        if (step === 1) connectClusterEntrance(ctx, node, spoke, depth);
        prev = node;
    }
}

export function buildWebClusters(ctx) {
    for (let depth = 1; depth < ctx.maxDepth; depth++) {
        for (let spoke = 0; spoke < ctx.webSpokeCount; spoke++) {
            const anchor = ctx.webNodes[spoke] && ctx.webNodes[spoke][depth - 1];
            buildWebCellCluster(ctx, anchor, spoke, depth, ctx.clusterAnchorsById);
        }
    }
}
