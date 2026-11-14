import { allocationHasAuthoredPassiveTree } from '../domain/passive-allocation-roots.mjs';

export function getPassiveTreeViewAngle(runtime) {
    return runtime.state.passiveTreeViewAngle;
}

/** Turns the nodes for the current class, only when the class changed. The camera then fits again; ensurePassiveRenderCache sees the new angle. */
export function syncPassiveTreeView(runtime) {
    if (!allocationHasAuthoredPassiveTree(runtime)) return;
    const start = runtime.deps.PASSIVE_TREE_V22.nodes[(0, runtime.deps.getPassiveTreeRootNodeId)()];
    const angle = Math.PI / 2 - Math.atan2(start.y, start.x);
    if (angle === runtime.state.passiveTreeViewAngle) return;
    runtime.state.passiveTreeViewAngle = angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    Object.entries(runtime.deps.PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
        const node = runtime.deps.PASSIVE_TREE.nodes[id];
        if (!node) return;
        node.x = source.x * cos - source.y * sin;
        node.y = source.x * sin + source.y * cos;
    });
    runtime.state.passiveCameraInitialized = false;
}

export function clampPassiveCamera(runtime) {
    runtime.state.camX = (0, runtime.deps.clampNumber)(runtime.state.camX, -9800, 9800);
    runtime.state.camY = (0, runtime.deps.clampNumber)(runtime.state.camY, -7800, 7800);
}

export function getPassiveActiveViewBoundsIds(runtime) {
    let ids = new Set([(0, runtime.deps.getPassiveTreeRootNodeId)()]);
    const invested = Array.isArray(runtime.deps.game && runtime.deps.game.passives) ? runtime.deps.game.passives : [];
    invested.forEach(id => ids.add(id));
    runtime.deps.reachableNodes.forEach(id => ids.add(id));
    if (invested.length > 0) return ids;
    const adjacency = (0, runtime.deps.getPassiveTreeAdjacency)();
    const queue = Array.from(ids, id => ({ id, depth: 0 }));
    let queueIndex = 0;
    while (queueIndex < queue.length) {
        const current = queue[queueIndex++];
        if (current.depth >= 3) continue;
        (adjacency.get(current.id) || []).forEach(nextId => {
            if (ids.has(nextId)) return;
            ids.add(nextId);
            queue.push({ id: nextId, depth: current.depth + 1 });
        });
    }
    return ids;
}

/** 카메라가 맞출 노드들의 경계(없으면 시작점 한 점). */
export function getPassiveViewBounds(runtime, viewNodes) {
    const nodes = viewNodes.length ? viewNodes : [(0, runtime.deps.getPassiveTreeRootNode)() || { x: 0, y: 0 }];
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** 시작점을 화면 아래쪽에 두어 위로 트리가 펼쳐지게 한다. 휴대폰은 안내 카드와 작은 전투 창이 아래를 가리므로 덜 내린다.
* 맞출 범위가 그 위에 다 들어갈 때만 옮기고, 아직 투자하지 않았으면 가로로 가운데에 둔다. 카메라만 옮긴다(배율은 그대로). */
export function placePassiveRootLow(runtime, width, height, bounds, invested) {
    const root = (0, runtime.deps.getPassiveTreeRootNode)();
    if (!root) return;
    if (!invested) runtime.state.camX = -root.x * runtime.state.camZoom;
    const low = height * (width < 768 ? 0.1 : 0.32);
    if ((bounds.maxY - bounds.minY) * runtime.state.camZoom <= height / 2 + low - 60) runtime.state.camY = low - root.y * runtime.state.camZoom;
}

export function fitPassiveCameraToBounds(runtime, force) {
    syncPassiveTreeView(runtime);
    if (runtime.state.passiveCameraInitialized && !force) return;
    let container = runtime.deps.document.getElementById('tree-container');
    if (!container || container.offsetParent === null) return;
    // 닿는 노드가 지금 직업의 시작점 기준인지 맞춘 뒤 범위를 잰다.
    (0, runtime.deps.calculateReachableNodes)();
    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);
    let viewNodes = Array.from(getPassiveActiveViewBoundsIds(runtime)).map(id => runtime.deps.PASSIVE_TREE.nodes[id]).filter(Boolean);
    const invested = Array.isArray(runtime.deps.game && runtime.deps.game.passives) && runtime.deps.game.passives.length > 0;
    const bounds = getPassiveViewBounds(runtime, viewNodes);
    const viewPadding = 120;
    const spanX = Math.max(1, (bounds.maxX - bounds.minX) + viewPadding * 2);
    const spanY = Math.max(1, (bounds.maxY - bounds.minY) + viewPadding * 2);
    const defaultZoom = Math.min((width - 64) / spanX, (height - 72) / spanY);
    // 휴대폰 첫 화면: 시작점 양옆의 바깥 원까지 폭에 맞추면 노드가 읽히지 않는다(0.16). 위로 뻗는 갈래가 읽히는 배율을 먼저 둔다.
    runtime.state.camZoom = (0, runtime.deps.clampNumber)(invested || width >= 768 ? defaultZoom : Math.max(defaultZoom, 0.3), 0.1, 0.72);
    const toolbarOffsetY = invested ? 0 : 56;
    runtime.state.camX = -(bounds.minX + bounds.maxX) * 0.5 * runtime.state.camZoom;
    runtime.state.camY = -(bounds.minY + bounds.maxY) * 0.5 * runtime.state.camZoom + toolbarOffsetY;
    placePassiveRootLow(runtime, width, height, bounds, invested);
    runtime.state.passiveCameraInitialized = true;
}
