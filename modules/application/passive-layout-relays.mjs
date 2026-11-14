import { addNode, buildAdjacencyMap, connect, getGenericPathStat, getNodeClearanceDistance, getNodeDistance } from './passive-layout-nodes.mjs';

export function addOuterPathRelay(ctx, { a, b, t, depth, spoke, relayIndex, relayCount }) {
    const { x, y } = outerRelayPoint(a, b, t, { depth, spoke, relayIndex });
    let special = depth >= ctx.maxDepth - 1 && relayCount >= 2 && relayIndex === Math.ceil(relayCount / 2);
    const sector = a.sector || b.sector;
    const stat = outerRelayStat(ctx, { special, sector, depth, relayIndex, spoke });
    let node = addNode(ctx, { x: x / ctx.deps.PASSIVE_WORLD_SCALE, y: y / ctx.deps.PASSIVE_WORLD_SCALE, tier: special ? 2 : 1, themeOrStat: stat, meta: { sector, kind: special ? 'major' : 'path', depth, lane: relayIndex } });
    if (!node) return null;
    node.webBridge = true;
    node.webRing = depth;
    node.title = special ? ctx.deps._t('외곽 별길 규칙') : ctx.deps._t('외곽 별길');
    node.desc = special
        ? '먼 외곽 성좌 사이를 잇는 보강 규칙 노드입니다. 긴 이동 경로에 작은 보상을 배치합니다.'
        : '멀리 떨어진 외곽 성좌 사이를 촘촘하게 이어 주는 경로 노드입니다.';
    return node;
}

function outerRelayPoint(a, b, t, { depth, spoke, relayIndex }) {
    let ax = a.x || 0, ay = a.y || 0, bx = b.x || 0, by = b.y || 0;
    let x = ax + (bx - ax) * t;
    let y = ay + (by - ay) * t;
    let radialLen = Math.hypot(x, y) || 1;
    let ripple = ((spoke + relayIndex + depth) % 2 === 0 ? 1 : -1) * (18 + depth * 1.5);
    x += (x / radialLen) * ripple;
    y += (y / radialLen) * ripple;
    return { x, y };
}

function outerRelayStat(ctx, { special, sector, depth, relayIndex, spoke }) {
    const specialOuterStats = ['move', 'resAll', 'crit', 'regen', 'maxDmgRoll', 'minDmgRoll', 'resPen', 'physIgnore'];
    return special ? specialOuterStats[(spoke + depth) % specialOuterStats.length] : getGenericPathStat(ctx, sector || 'center', depth, relayIndex, spoke);
}

export function connectWithOuterRelays(ctx, a, b, depth, spoke) {
    if (!a || !b) return;
    let dist = getNodeDistance(ctx, a, b);
    let maxSegment = Math.max(190, getNodeClearanceDistance(ctx, a, b, 110));
    let relayCount = Math.max(0, Math.min(3, Math.ceil(dist / maxSegment) - 1));
    if (relayCount <= 0) {
        connect(ctx, a.id, b.id);
        return;
    }
    let prev = a;
    for (let i = 1; i <= relayCount; i++) {
        let relay = addOuterPathRelay(ctx, { a: a, b: b, t: i / (relayCount + 1), depth: depth, spoke: spoke, relayIndex: i, relayCount: relayCount });
        if (!relay) break;
        connect(ctx, prev.id, relay.id);
        prev = relay;
    }
    connect(ctx, prev.id, b.id);
}

export function ensureOuterHubNeighborConnections(ctx, minNeighbors) {
    let hubs = Object.values(ctx.deps.PASSIVE_TREE.nodes).filter(node => node && node.kind === 'hub' && (node.depth || 0) >= 10);
    if (hubs.length <= 0) return;
    hubs.forEach(hub => {
        let adj = buildAdjacencyMap(ctx);
        let linked = adj.get(hub.id) || new Set();
        let need = Math.max(0, (minNeighbors || 0) - linked.size);
        if (need <= 0) return;
        let candidates = Object.values(ctx.deps.PASSIVE_TREE.nodes)
            .filter(node => node && node.id !== hub.id)
            .filter(node => !node.clusterId)
            .filter(node => node.kind !== 'apex')
            .filter(node => !linked.has(node.id))
            .sort((a, b) => {
                let aSector = a.sector === hub.sector ? 0 : 1;
                let bSector = b.sector === hub.sector ? 0 : 1;
                if (aSector !== bSector) return aSector - bSector;
                let da = Math.hypot(a.x - hub.x, a.y - hub.y);
                let db = Math.hypot(b.x - hub.x, b.y - hub.y);
                return da - db;
            });
        candidates.slice(0, need).forEach(node => connect(ctx, hub.id, node.id));
    });
}
