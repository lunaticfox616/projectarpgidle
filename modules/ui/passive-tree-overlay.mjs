export function nodes(runtime) {
    if (!runtime.state.active || !(runtime.deps.game.passivePoints > 0)) return [];
    const key = `${(runtime.deps.game.passives || []).length}|${[...runtime.deps.reachableNodes].join(',')}`;
    if (runtime.state.cache.key === key) return runtime.state.cache.nodes;
    const ids = [...runtime.deps.reachableNodes].filter(id => (0, runtime.deps.getPassiveActivationPath)(id).length === 1);
    runtime.state.cache = { key, nodes: ids.map(id => runtime.deps.PASSIVE_TREE.nodes[id]).filter(Boolean) };
    return runtime.state.cache.nodes;
}

export function ringFor(runtime, world, node) {
    const found = [...world.querySelectorAll('.passive-guide-ring')].find(el => el.dataset.guideNode === node.id);
    if (found) return found;
    const el = runtime.deps.document.createElement('div');
    el.className = 'passive-guide-ring';
    el.dataset.guideNode = node.id;
    world.appendChild(el);
    return el;
}

/** 고리를 지금 노드 · 배율에 맞춘다(syncPassiveTreeOverlay가 그릴 때마다 부른다). */
export function sync(runtime, world) {
    const list = nodes(runtime), ids = new Set(list.map(node => node.id));
    world.querySelectorAll('.passive-guide-ring').forEach(el => { if (!ids.has(el.dataset.guideNode)) el.remove(); });
    list.forEach(node => {
        const size = Math.max(runtime.state.RING_PX, (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * 2 * runtime.deps.camZoom + 14) / runtime.deps.camZoom;
        ringFor(runtime, world, node).style.cssText = `left:${node.x - size / 2}px;top:${node.y - size / 2}px;width:${size}px;height:${size}px;--guide-px:${1 / runtime.deps.camZoom}px`;
    });
}

/** 노드 둘레(고리 · 노드 중 큰 쪽)의 화면 사각형. 시작점은 아래 직업 이름까지 넣는다. */
export function nodeExtent(runtime, node, box, root) {
    const viewW = runtime.deps.passiveCanvasMetrics.width || box.width, viewH = runtime.deps.passiveCanvasMetrics.height || box.height;
    const x = box.left + (viewW / 2 + runtime.deps.camX + node.x * runtime.deps.camZoom) * box.width / viewW;
    const y = box.top + (viewH / 2 + runtime.deps.camY + node.y * runtime.deps.camZoom) * box.height / viewH;
    const r = Math.max(runtime.state.RING_PX / 2, (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * runtime.deps.camZoom) + 6;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r + (node === root ? 22 : 0) };
}

/** 고리 노드와 시작점을 감싸는 화면 사각형. 캔버스 밖으로 밀려났으면 null. */
export function screenRect(runtime) {
    const list = nodes(runtime), canvas = runtime.deps.document.getElementById('tree-canvas'), root = (0, runtime.deps.getPassiveTreeRootNode)();
    if (!list.length || !canvas) return null;
    const box = canvas.getBoundingClientRect();
    const extents = [...list, root].filter(Boolean).map(node => nodeExtent(runtime, node, box, root));
    const left = Math.min(...extents.map(e => e.left)), top = Math.min(...extents.map(e => e.top));
    const right = Math.max(...extents.map(e => e.right)), bottom = Math.max(...extents.map(e => e.bottom));
    const inside = left >= box.left && top >= box.top && right <= box.right && bottom <= box.bottom;
    return inside ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
}

/** syncPassiveTreeOverlay가 트리를 그릴 때마다 부른다. 켠 뒤 카메라가 맞춰진 트리에 고리가 처음 보이면 알린다(안내 카드가 노드
* 옆으로 간다) — 탭을 열면 카메라를 맞추기(40ms 뒤) 전에 한 번 그려질 수 있다. */
export function drawn(runtime, world) {
    sync(runtime, world);
    if (!runtime.state.onDrawn || !runtime.deps.passiveCameraInitialized || !screenRect(runtime)) return;
    const notify = runtime.state.onDrawn;
    runtime.state.onDrawn = null;
    notify();
}

/** @param {boolean} on @param {Function} [whenDrawn] once the rings are on a drawn tree */
export function show(runtime, on, whenDrawn) {
    runtime.state.active = !!on;
    runtime.state.onDrawn = runtime.state.active && whenDrawn ? whenDrawn : null;
    const parts = ensurePassiveTreeOverlay(runtime);
    if (parts) sync(runtime, parts.world);
}

export function syncPassiveVoidRanges(runtime, world) {
    const wanted = new Set();
    const radii = { andromeda: runtime.deps.TRANSCENDENT_ANDROMEDA_RADIUS, asteroidBelt: runtime.deps.TRANSCENDENT_ASTEROID_RADIUS };
    runtime.state.PASSIVE_VOID_RANGES.forEach(([id, color]) => runtime.deps.passiveRouting.transcendentNodeIds(runtime.deps.game, id).forEach(nodeId => {
        const node = runtime.deps.PASSIVE_TREE.nodes[nodeId], key = `${nodeId}:${id}`;
        wanted.add(key);
        if (!node || Array.from(world.querySelectorAll('.passive-void-range')).some(range => range.dataset.rangeKey === key)) return;
        const radius = radii[id], el = runtime.deps.document.createElement('div');
        el.className = 'passive-void-range';
        el.dataset.rangeKey = key;
        el.style.cssText = `left:${node.x}px;top:${node.y}px;width:${radius * 2}px;height:${radius * 2}px`;
        el.innerHTML = `<svg viewBox="${-radius} ${-radius} ${radius * 2} ${radius * 2}" aria-hidden="true"><circle r="${radius}" fill="${color}" fill-opacity=".06" stroke="${color}" stroke-width="1.3" stroke-opacity=".7" vector-effect="non-scaling-stroke"/></svg>`;
        world.prepend(el);
    }));
    world.querySelectorAll('.passive-void-range').forEach(el => {
        if (!wanted.has(el.dataset.rangeKey)) el.remove();
    });
}

export function ensurePassiveTreeOverlay(runtime) {
    let overlay = runtime.deps.document.getElementById('passive-tree-overlay');
    const container = runtime.deps.document.getElementById('tree-container');
    if (!overlay && container) {
        overlay = runtime.deps.document.createElement('div');
        overlay.id = 'passive-tree-overlay';
        overlay.className = 'passive-tree-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = '<div class="passive-tree-overlay-world"></div>';
        container.appendChild(overlay);
    }
    if (!overlay) return null;
    let world = overlay.querySelector('.passive-tree-overlay-world');
    if (!world) {
        world = runtime.deps.document.createElement('div');
        world.className = 'passive-tree-overlay-world';
        overlay.appendChild(world);
    }
    return { overlay, world };
}

export function updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight) {
    const parts = ensurePassiveTreeOverlay(runtime);
    if (!parts) return null;
    parts.world.style.transform = `translate3d(${displayWidth / 2 + runtime.deps.camX}px, ${displayHeight / 2 + runtime.deps.camY}px, 0) scale(${runtime.deps.camZoom})`;
    return parts;
}

/** The CSS hover ring of one node (overlay world units: grows with the zoom like the canvas). */
export function syncPassiveHoverRing(runtime, world, node, hoverCurrent, wanted) {
    const key = `node:${node.id}`;
    wanted.add(key);
    let el = world.querySelector(`[data-passive-overlay-key="${key}"]`);
    if (!el) {
        el = runtime.deps.document.createElement('div');
        el.className = 'passive-overlay-node';
        el.dataset.passiveOverlayKey = key;
        world.appendChild(el);
    }
    const size = Math.max(1, ((0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) + (hoverCurrent ? 9 : 7.5)) * 2);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.setProperty('--passive-ring-alpha', String(Math.max(0.35, (0, runtime.deps.getNodeRevealAmount)(node))));
    el.classList.toggle('hover-current', hoverCurrent);
    el.classList.toggle('hover-linked', !hoverCurrent);
}

/** Preserve the five-argument public call with one closure per view. */
export function createOverlaySync(runtime) {
    return function syncPassiveTreeOverlay(displayWidth, displayHeight, visibleNodes, hoveredLinkedIds, hoveredPathNodeIds) {
        const parts = updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight);
        if (!parts) return;
        const world = parts.world;
        syncPassiveVoidRanges(runtime, world);
        drawn(runtime, world);
        const wanted = new Set();
        if (runtime.deps.hoverNode) visibleNodes.forEach(node => {
            if ((0, runtime.deps.getPassiveVisibility)(node.id) === 'hidden' || (0, runtime.deps.passiveNodePresentation.isPassiveImageSlotNode)(node)) return;
            const hoverCurrent = runtime.deps.hoverNode.id === node.id;
            if (hoverCurrent || hoveredLinkedIds.has(node.id) || hoveredPathNodeIds.has(node.id)) syncPassiveHoverRing(runtime, world, node, hoverCurrent, wanted);
        });
        Array.from(world.querySelectorAll('.passive-overlay-node')).forEach(el => {
            if (!wanted.has(el.dataset.passiveOverlayKey)) el.remove();
        });
    };
}

export function spawnPassiveRevealBurstOverlay(runtime, burst) {
    if (!burst) return;
    const canvas = runtime.deps.document.getElementById('tree-canvas');
    const displayWidth = burstCanvasWidth(runtime, canvas);
    const displayHeight = runtime.deps.passiveCanvasMetrics.height || (canvas ? canvas.clientHeight : 0);
    const parts = updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight);
    if (!parts) return;
    const el = runtime.deps.document.createElement('div');
    el.className = 'passive-reveal-burst';
    const radius = Math.max(1, burst.radius || 1);
    el.style.left = `${burst.x || 0}px`;
    el.style.top = `${burst.y || 0}px`;
    el.style.width = `${radius * 2}px`;
    el.style.height = `${radius * 2}px`;
    el.style.animationDuration = `${Math.max(100, burst.duration || 900)}ms`;
    el.addEventListener('animationend', () => el.remove(), { once: true });
    parts.world.appendChild(el);
}

function burstCanvasWidth(runtime, canvas) {
    return runtime.deps.passiveCanvasMetrics.width || (canvas ? canvas.clientWidth : 0);
}
