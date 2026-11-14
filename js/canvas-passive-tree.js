// GENERATED from modules/canvas-passive-tree*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/browser/window-methods.mjs
  var windowSetTimeout = (...args) => globalThis.setTimeout(...args);

  // modules/ui/passive-tree-overlay.mjs
  function nodes(runtime) {
    if (!runtime.state.active || !(runtime.deps.game.passivePoints > 0)) return [];
    const key = `${(runtime.deps.game.passives || []).length}|${[...runtime.deps.reachableNodes].join(",")}`;
    if (runtime.state.cache.key === key) return runtime.state.cache.nodes;
    const ids = [...runtime.deps.reachableNodes].filter((id) => (0, runtime.deps.getPassiveActivationPath)(id).length === 1);
    runtime.state.cache = { key, nodes: ids.map((id) => runtime.deps.PASSIVE_TREE.nodes[id]).filter(Boolean) };
    return runtime.state.cache.nodes;
  }
  function ringFor(runtime, world, node) {
    const found = [...world.querySelectorAll(".passive-guide-ring")].find((el2) => el2.dataset.guideNode === node.id);
    if (found) return found;
    const el = runtime.deps.document.createElement("div");
    el.className = "passive-guide-ring";
    el.dataset.guideNode = node.id;
    world.appendChild(el);
    return el;
  }
  function sync(runtime, world) {
    const list = nodes(runtime), ids = new Set(list.map((node) => node.id));
    world.querySelectorAll(".passive-guide-ring").forEach((el) => {
      if (!ids.has(el.dataset.guideNode)) el.remove();
    });
    list.forEach((node) => {
      const size = Math.max(runtime.state.RING_PX, (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * 2 * runtime.deps.camZoom + 14) / runtime.deps.camZoom;
      ringFor(runtime, world, node).style.cssText = `left:${node.x - size / 2}px;top:${node.y - size / 2}px;width:${size}px;height:${size}px;--guide-px:${1 / runtime.deps.camZoom}px`;
    });
  }
  function nodeExtent(runtime, node, box, root) {
    const viewW = runtime.deps.passiveCanvasMetrics.width || box.width, viewH = runtime.deps.passiveCanvasMetrics.height || box.height;
    const x = box.left + (viewW / 2 + runtime.deps.camX + node.x * runtime.deps.camZoom) * box.width / viewW;
    const y = box.top + (viewH / 2 + runtime.deps.camY + node.y * runtime.deps.camZoom) * box.height / viewH;
    const r = Math.max(runtime.state.RING_PX / 2, (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * runtime.deps.camZoom) + 6;
    return { left: x - r, top: y - r, right: x + r, bottom: y + r + (node === root ? 22 : 0) };
  }
  function screenRect(runtime) {
    const list = nodes(runtime), canvas = runtime.deps.document.getElementById("tree-canvas"), root = (0, runtime.deps.getPassiveTreeRootNode)();
    if (!list.length || !canvas) return null;
    const box = canvas.getBoundingClientRect();
    const extents = [...list, root].filter(Boolean).map((node) => nodeExtent(runtime, node, box, root));
    const left = Math.min(...extents.map((e) => e.left)), top = Math.min(...extents.map((e) => e.top));
    const right = Math.max(...extents.map((e) => e.right)), bottom = Math.max(...extents.map((e) => e.bottom));
    const inside = left >= box.left && top >= box.top && right <= box.right && bottom <= box.bottom;
    return inside ? { left, top, right, bottom, width: right - left, height: bottom - top } : null;
  }
  function drawn(runtime, world) {
    sync(runtime, world);
    if (!runtime.state.onDrawn || !runtime.deps.passiveCameraInitialized || !screenRect(runtime)) return;
    const notify = runtime.state.onDrawn;
    runtime.state.onDrawn = null;
    notify();
  }
  function show(runtime, on, whenDrawn) {
    runtime.state.active = !!on;
    runtime.state.onDrawn = runtime.state.active && whenDrawn ? whenDrawn : null;
    const parts = ensurePassiveTreeOverlay(runtime);
    if (parts) sync(runtime, parts.world);
  }
  function syncPassiveVoidRanges(runtime, world) {
    const wanted = /* @__PURE__ */ new Set();
    const radii = { andromeda: runtime.deps.TRANSCENDENT_ANDROMEDA_RADIUS, asteroidBelt: runtime.deps.TRANSCENDENT_ASTEROID_RADIUS };
    runtime.state.PASSIVE_VOID_RANGES.forEach(([id, color]) => runtime.deps.passiveRouting.transcendentNodeIds(runtime.deps.game, id).forEach((nodeId) => {
      const node = runtime.deps.PASSIVE_TREE.nodes[nodeId], key = `${nodeId}:${id}`;
      wanted.add(key);
      if (!node || Array.from(world.querySelectorAll(".passive-void-range")).some((range) => range.dataset.rangeKey === key)) return;
      const radius = radii[id], el = runtime.deps.document.createElement("div");
      el.className = "passive-void-range";
      el.dataset.rangeKey = key;
      el.style.cssText = `left:${node.x}px;top:${node.y}px;width:${radius * 2}px;height:${radius * 2}px`;
      el.innerHTML = `<svg viewBox="${-radius} ${-radius} ${radius * 2} ${radius * 2}" aria-hidden="true"><circle r="${radius}" fill="${color}" fill-opacity=".06" stroke="${color}" stroke-width="1.3" stroke-opacity=".7" vector-effect="non-scaling-stroke"/></svg>`;
      world.prepend(el);
    }));
    world.querySelectorAll(".passive-void-range").forEach((el) => {
      if (!wanted.has(el.dataset.rangeKey)) el.remove();
    });
  }
  function ensurePassiveTreeOverlay(runtime) {
    let overlay = runtime.deps.document.getElementById("passive-tree-overlay");
    const container = runtime.deps.document.getElementById("tree-container");
    if (!overlay && container) {
      overlay = runtime.deps.document.createElement("div");
      overlay.id = "passive-tree-overlay";
      overlay.className = "passive-tree-overlay";
      overlay.setAttribute("aria-hidden", "true");
      overlay.innerHTML = '<div class="passive-tree-overlay-world"></div>';
      container.appendChild(overlay);
    }
    if (!overlay) return null;
    let world = overlay.querySelector(".passive-tree-overlay-world");
    if (!world) {
      world = runtime.deps.document.createElement("div");
      world.className = "passive-tree-overlay-world";
      overlay.appendChild(world);
    }
    return { overlay, world };
  }
  function updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight) {
    const parts = ensurePassiveTreeOverlay(runtime);
    if (!parts) return null;
    parts.world.style.transform = `translate3d(${displayWidth / 2 + runtime.deps.camX}px, ${displayHeight / 2 + runtime.deps.camY}px, 0) scale(${runtime.deps.camZoom})`;
    return parts;
  }
  function syncPassiveHoverRing(runtime, world, node, hoverCurrent, wanted) {
    const key = `node:${node.id}`;
    wanted.add(key);
    let el = world.querySelector(`[data-passive-overlay-key="${key}"]`);
    if (!el) {
      el = runtime.deps.document.createElement("div");
      el.className = "passive-overlay-node";
      el.dataset.passiveOverlayKey = key;
      world.appendChild(el);
    }
    const size = Math.max(1, ((0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) + (hoverCurrent ? 9 : 7.5)) * 2);
    el.style.left = `${node.x}px`;
    el.style.top = `${node.y}px`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.setProperty("--passive-ring-alpha", String(Math.max(0.35, (0, runtime.deps.getNodeRevealAmount)(node))));
    el.classList.toggle("hover-current", hoverCurrent);
    el.classList.toggle("hover-linked", !hoverCurrent);
  }
  function createOverlaySync(runtime) {
    return function syncPassiveTreeOverlay2(displayWidth, displayHeight, visibleNodes, hoveredLinkedIds, hoveredPathNodeIds) {
      const parts = updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight);
      if (!parts) return;
      const world = parts.world;
      syncPassiveVoidRanges(runtime, world);
      drawn(runtime, world);
      const wanted = /* @__PURE__ */ new Set();
      if (runtime.deps.hoverNode) visibleNodes.forEach((node) => {
        if ((0, runtime.deps.getPassiveVisibility)(node.id) === "hidden" || (0, runtime.deps.passiveNodePresentation.isPassiveImageSlotNode)(node)) return;
        const hoverCurrent = runtime.deps.hoverNode.id === node.id;
        if (hoverCurrent || hoveredLinkedIds.has(node.id) || hoveredPathNodeIds.has(node.id)) syncPassiveHoverRing(runtime, world, node, hoverCurrent, wanted);
      });
      Array.from(world.querySelectorAll(".passive-overlay-node")).forEach((el) => {
        if (!wanted.has(el.dataset.passiveOverlayKey)) el.remove();
      });
    };
  }
  function spawnPassiveRevealBurstOverlay(runtime, burst) {
    if (!burst) return;
    const canvas = runtime.deps.document.getElementById("tree-canvas");
    const displayWidth = burstCanvasWidth(runtime, canvas);
    const displayHeight = runtime.deps.passiveCanvasMetrics.height || (canvas ? canvas.clientHeight : 0);
    const parts = updatePassiveTreeOverlayTransform(runtime, displayWidth, displayHeight);
    if (!parts) return;
    const el = runtime.deps.document.createElement("div");
    el.className = "passive-reveal-burst";
    const radius = Math.max(1, burst.radius || 1);
    el.style.left = `${burst.x || 0}px`;
    el.style.top = `${burst.y || 0}px`;
    el.style.width = `${radius * 2}px`;
    el.style.height = `${radius * 2}px`;
    el.style.animationDuration = `${Math.max(100, burst.duration || 900)}ms`;
    el.addEventListener("animationend", () => el.remove(), { once: true });
    parts.world.appendChild(el);
  }
  function burstCanvasWidth(runtime, canvas) {
    return runtime.deps.passiveCanvasMetrics.width || (canvas ? canvas.clientWidth : 0);
  }

  // modules/ui/passive-tree-frame.mjs
  function getHoverAllocationNodeIds(runtime, hoveredNodeId) {
    if (hoveredNodeId && runtime.deps.passiveRouting.freeNodes(runtime.deps.PASSIVE_TREE, runtime.deps.game).has(String(hoveredNodeId))) return /* @__PURE__ */ new Set([hoveredNodeId]);
    return getHoveredPassivePathNodeIds(runtime, hoveredNodeId);
  }
  function findHoveredPassiveRoute(runtime, hoveredNodeId, adj, owned, blockedStarts) {
    const queue = [hoveredNodeId], prev = /* @__PURE__ */ new Map([[hoveredNodeId, null]]);
    if (owned.has(hoveredNodeId)) return { target: hoveredNodeId, prev };
    for (let index = 0; index < queue.length; index++) {
      for (const next of adj.get(queue[index]) || []) {
        if (prev.has(next) || blockedStarts.has(next)) continue;
        prev.set(next, queue[index]);
        if (owned.has(next)) return { target: next, prev };
        queue.push(next);
      }
    }
    return { target: null, prev };
  }
  function getHoveredPassivePathNodeIds(runtime, hoveredNodeId) {
    if (!hoveredNodeId) return /* @__PURE__ */ new Set();
    const cacheKey = String(hoveredNodeId);
    const cached = runtime.deps.passiveRenderCache && runtime.deps.passiveRenderCache.hoverPath;
    if (pathCacheMatches(runtime, cached, cacheKey)) return cached.path;
    const adj = runtime.deps.passiveRenderCache && runtime.deps.passiveRenderCache.adjacency;
    if (!(adj instanceof Map) || adj.size === 0) return /* @__PURE__ */ new Set([hoveredNodeId]);
    const blockedStarts = (0, runtime.deps.getPassiveBlockedStartIds)();
    if (blockedStarts.has(hoveredNodeId)) return /* @__PURE__ */ new Set([hoveredNodeId]);
    let owned = connectionNodes(runtime);
    owned.add(typeof runtime.deps.getPassiveTreeRootNodeId === "function" ? (0, runtime.deps.getPassiveTreeRootNodeId)() : "n0");
    const { target, prev } = findHoveredPassiveRoute(runtime, hoveredNodeId, adj, owned, blockedStarts);
    let path = /* @__PURE__ */ new Set([hoveredNodeId]);
    if (!target) return path;
    appendPredecessorPath(path, target, prev);
    runtime.deps.passiveRenderCache.hoverPath = { nodeId: cacheKey, stateSignature: runtime.deps.passiveRenderCache.stateSignature, path };
    return path;
  }
  function getHoveredPassiveLinkedIds(runtime, hoverId) {
    const ids = /* @__PURE__ */ new Set();
    if (!hoverId) return ids;
    ids.add(hoverId);
    (runtime.deps.passiveRenderCache.edges || []).forEach((edge) => {
      if (edge.from === hoverId) ids.add(edge.to);
      else if (edge.to === hoverId) ids.add(edge.from);
    });
    return ids;
  }
  function createPassiveDrawFrame(runtime) {
    const hoverId = runtime.deps.hoverNode && runtime.deps.hoverNode.id ? runtime.deps.hoverNode.id : null;
    const allocated = connectionNodes(runtime);
    return {
      hoverId,
      allocated,
      isActive: (id) => allocated.has(id),
      blackHoles: new Set(runtime.deps.passiveRouting.transcendentNodeIds(runtime.deps.game, "blackHole")),
      linkedIds: getHoveredPassiveLinkedIds(runtime, hoverId),
      pathIds: getHoverAllocationNodeIds(runtime, hoverId),
      rootId: (0, runtime.deps.getPassiveTreeRootNodeId)()
    };
  }
  function getPassiveNodeSearchLook(runtime, node) {
    const search = typeof runtime.deps.getPassiveNodeSearchMatch === "function" ? (0, runtime.deps.getPassiveNodeSearchMatch)(node) : null;
    if (!search || !search.active) return { dimmed: false, searchHit: false };
    return { dimmed: !search.matches, searchHit: !!search.matches };
  }
  function getPassiveNodeLook(runtime, node, frame) {
    const look = getPassiveNodeSearchLook(runtime, node);
    look.active = frame.allocated.has(node.id);
    look.reachable = runtime.deps.reachableNodes.has(node.id);
    look.anchor = frame.blackHoles.has(node.id);
    look.alpha = (0, runtime.deps.getNodeRevealAmount)(node) * (look.dimmed ? 0.28 : 1);
    look.radius = (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node);
    return look;
  }
  function pathCacheMatches(runtime, cached, cacheKey) {
    return cached && cached.nodeId === cacheKey && cached.stateSignature === runtime.deps.passiveRenderCache.stateSignature;
  }
  function connectionNodes(runtime) {
    return typeof runtime.deps.getPassiveConnectionNodeIds === "function" ? (0, runtime.deps.getPassiveConnectionNodeIds)() : new Set((runtime.deps.game.passives || []).filter(Boolean));
  }
  function appendPredecessorPath(path, target, prev) {
    let cur = target;
    while (cur !== null && cur !== void 0) {
      path.add(cur);
      cur = prev.get(cur);
    }
  }

  // modules/rendering/passive-tree-art.mjs
  function artDisc(runtime, ctx, r, fill) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, runtime.state.TAU);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function artRing(runtime, ctx, r, stroke, width) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.5, r), 0, runtime.state.TAU);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function artGlow(runtime, ctx, r, color) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    artDisc(runtime, ctx, r, gradient);
  }
  function artWood(runtime, ctx, r, tone) {
    const gradient = ctx.createLinearGradient(0, -r, 0, r);
    gradient.addColorStop(0, tone[0]);
    gradient.addColorStop(1, tone[1]);
    return gradient;
  }
  function artOctagon(runtime, ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = Math.PI / 8 + i * runtime.state.TAU / 8;
      if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
  }
  function artLeaves(runtime, ctx, r, { count, start, length, color }) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
      const t = start + i * runtime.state.TAU / count, cx = Math.cos(t) * (r + length * 0.6), cy = Math.sin(t) * (r + length * 0.6);
      ctx.moveTo(cx + Math.cos(t) * length, cy + Math.sin(t) * length);
      ctx.ellipse(cx, cy, length, length * 0.42, t, 0, runtime.state.TAU);
    }
    ctx.fill();
  }
  function artPoints(runtime, ctx, r, length, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const t = i * runtime.state.TAU / 4 - Math.PI / 2, half = 0.32;
      ctx.moveTo(Math.cos(t - half) * r, Math.sin(t - half) * r);
      ctx.lineTo(Math.cos(t) * (r + length), Math.sin(t) * (r + length));
      ctx.lineTo(Math.cos(t + half) * r, Math.sin(t + half) * r);
      ctx.closePath();
    }
    ctx.fill();
  }
  function imageId(runtime, image) {
    if (!runtime.state.imageIds.has(image)) runtime.state.imageIds.set(image, runtime.state.nextImageId++);
    return runtime.state.imageIds.get(image);
  }
  function shadedImage(runtime, image, [keep, bright], brass) {
    const key = `${imageId(runtime, image)}|${keep}|${bright}|${brass || ""}`;
    if (runtime.state.shadedImages.has(key)) return runtime.state.shadedImages.get(key);
    const canvas = runtime.deps.document.createElement("canvas"), g = canvas.getContext("2d");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    g.drawImage(image, 0, 0);
    const data = g.getImageData(0, 0, canvas.width, canvas.height), px = data.data;
    for (let i = 0; i < px.length; i += 4) {
      const light = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
      for (let c = 0; c < 3; c++) px[i + c] = brass ? Math.min(255, light * brass[c] / 255 * 1.3) : (px[i + c] * keep + light * (1 - keep)) * bright;
    }
    g.putImageData(data, 0, 0);
    runtime.state.shadedImages.set(key, canvas);
    return canvas;
  }
  function nodeIcon(runtime, node) {
    const cached = runtime.state.nodeIcons.get(node);
    if (cached) return cached;
    const icon = findNodeIcon(runtime, node);
    if (icon.image) runtime.state.nodeIcons.set(node, icon);
    return icon;
  }
  function findNodeIcon(runtime, node) {
    const custom = (0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)(`passiveTreeCustom_${node.id}`);
    if (custom) return { key: `i${imageId(runtime, custom)}`, image: custom, cell: null, sample: node };
    const atlas = (0, runtime.deps.passiveNodePresentation.getPassiveNodeAtlasArt)(node);
    if (atlas) return {
      key: `a${imageId(runtime, atlas.image)}:${atlas.cell.join(",")}`,
      image: atlas.image,
      cell: atlas.cell,
      columns: atlas.columns,
      rows: atlas.rows,
      sample: node
    };
    return { key: `v${(0, runtime.deps.passiveNodePresentation.getPassiveNodeIconFamily)(node)}`, image: null, sample: node };
  }
  function blit(runtime, ctx, image, source, target) {
    ctx.imageSmoothingEnabled = target[2] * ctx.getTransform().a < source[2];
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, ...source, ...target);
  }
  function paintIcon(runtime, ctx, look, size) {
    const icon = look.icon;
    if (!icon.image) return (0, runtime.deps.passiveNodePresentation.drawPassiveNodeIcon)(ctx, icon.sample, size * 0.62, runtime.state.TONE[look.state].ring);
    const image = shadedImage(runtime, icon.image, runtime.state.SHADE[look.state].icon, null);
    if (!icon.cell) return blit(runtime, ctx, image, [0, 0, image.width, image.height], [-size / 2, -size / 2, size, size]);
    const w = image.width / icon.columns, h = image.height / icon.rows;
    return blit(runtime, ctx, image, [icon.cell[0] * w, icon.cell[1] * h, w, h], [-size / 2, -size / 2, size, size]);
  }
  function paintFrame(runtime, ctx, look, size) {
    const sheet = (0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)("passiveTreeFrames"), rect = runtime.deps.passiveNodePresentation.frameSheet[look.shape];
    if (!sheet || !rect) return artRing(runtime, ctx, size * 0.44, runtime.state.TONE[look.state].ring, size * 0.08);
    const shade = runtime.state.SHADE[look.state], image = shadedImage(runtime, sheet, shade.frame, shade.brass);
    return blit(runtime, ctx, image, [rect[0], 0, rect[1], rect[1]], [-size / 2, -size / 2, size, size]);
  }
  function paintTiny(runtime, ctx, look) {
    const r = look.radius, tone = runtime.state.TONE[look.state];
    if (tone.glow) artGlow(runtime, ctx, r * 1.9, tone.glow);
    if (look.shape === "notable") artOctagon(runtime, ctx, r);
    else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, runtime.state.TAU);
    }
    ctx.fillStyle = look.shape === "void" ? "#1a1424" : look.state === "active" ? "#a87532" : tone.fill;
    ctx.fill();
    ctx.lineWidth = r * 0.36;
    ctx.strokeStyle = look.shape === "void" ? "#6f6488" : tone.ring;
    ctx.stroke();
    if (look.shape === "keystone") artPoints(runtime, ctx, r * 1.05, r * 0.42, tone.ring);
  }
  function paintFramed(runtime, ctx, look) {
    const r = look.radius, fit = runtime.state.FRAME_FIT[look.shape], size = r * 2 * fit.size, tone = runtime.state.TONE[look.state];
    if (look.tiny) return paintTiny(runtime, ctx, look);
    if (look.shape === "void") artGlow(runtime, ctx, r * 1.75, look.state === "active" ? "rgba(170,120,255,0.42)" : "rgba(120,92,180,0.24)");
    else if (tone.glow) artGlow(runtime, ctx, r * 1.85, tone.glow);
    artDisc(runtime, ctx, size / 2 * fit.socket, look.shape === "void" ? "#0d0a12" : tone.fill);
    paintIcon(runtime, ctx, look, size * fit.icon);
    paintFrame(runtime, ctx, look, size);
    if (look.state === "reach") artRing(runtime, ctx, size * 0.6, "rgba(236,226,206,0.5)", r * 0.07);
  }
  function paintStart(runtime, ctx, look) {
    const r = look.radius, tone = runtime.state.TONE[look.state];
    if (tone.glow) artGlow(runtime, ctx, r * 1.7, tone.glow);
    artDisc(runtime, ctx, r, "#100d0a");
    paintIcon(runtime, ctx, look, r * 1.24);
    artRing(runtime, ctx, r, "#070504", r * 0.16);
    artRing(runtime, ctx, r, artWood(runtime, ctx, r, tone.wood), r * 0.09);
    artRing(runtime, ctx, r * 1.2, tone.wood[1], r * 0.045);
    artLeaves(runtime, ctx, r * 1.2, { count: 6, start: -Math.PI / 2, length: r * 0.16, color: tone.wood[0] });
  }
  function shapeOf(runtime, node) {
    if (node.kind === "start" || node.kind === "keystone" || node.kind === "void") return node.kind;
    if ((0, runtime.deps.passiveNodePresentation.isPassiveFramedNode)(node)) return "notable";
    return (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) >= 12 ? "medium" : "small";
  }
  function stateIndex(runtime, node, look, frame) {
    if (look.active || node.kind === "start" && node.id === frame.rootId) return 2;
    return look.reachable ? 1 : 0;
  }
  function infoOf(runtime, node) {
    let info = runtime.state.nodeInfo.get(node);
    if (info && info.generation === runtime.state.spriteGeneration && (info.icon.image || !nodeIcon(runtime, node).image)) return info;
    info = { shape: shapeOf(runtime, node), radius: (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node), icon: nodeIcon(runtime, node), sprites: [], generation: runtime.state.spriteGeneration };
    runtime.state.nodeInfo.set(node, info);
    return info;
  }
  function sizing(runtime, info, dpr) {
    if (runtime.state.bucketCache.zoom !== runtime.deps.camZoom || runtime.state.bucketCache.dpr !== dpr) runtime.state.bucketCache = { zoom: runtime.deps.camZoom, dpr, byLook: /* @__PURE__ */ new Map() };
    const key = `${info.shape}:${info.radius}`;
    if (!runtime.state.bucketCache.byLook.has(key)) {
      const radius = Math.max(info.radius, runtime.state.MIN_SCREEN_RADIUS[info.shape] / runtime.deps.camZoom);
      const index = runtime.state.SPRITE_RADII.findIndex((size) => size >= radius * runtime.deps.camZoom * dpr);
      runtime.state.bucketCache.byLook.set(key, { radius, bucket: index < 0 ? runtime.state.SPRITE_RADII.length - 1 : index });
    }
    return runtime.state.bucketCache.byLook.get(key);
  }
  function sharedSprite(runtime, info, state, bucket) {
    const key = `${info.shape}|${runtime.state.STATES[state]}|${info.icon.key}|${bucket}`;
    if (!runtime.state.sprites.has(key) && runtime.state.sprites.size >= runtime.state.SPRITE_LIMIT) {
      runtime.state.sprites.clear();
      runtime.state.spriteGeneration += 1;
    }
    if (!runtime.state.sprites.has(key)) runtime.state.sprites.set(key, paintSprite(runtime, { shape: info.shape, state: runtime.state.STATES[state], icon: info.icon, radius: info.radius }, runtime.state.SPRITE_RADII[bucket]));
    return runtime.state.sprites.get(key);
  }
  function paintSprite(runtime, look, bucket) {
    const size = Math.ceil(bucket * 2 * runtime.state.SPRITE_MARGIN) + 2, canvas = runtime.deps.document.createElement("canvas"), ctx = canvas.getContext("2d");
    canvas.width = canvas.height = size;
    ctx.translate(size / 2, size / 2);
    ctx.scale(bucket / look.radius, bucket / look.radius);
    runtime.state.PAINTERS[look.shape](ctx, { ...look, tiny: bucket <= 6 });
    return canvas;
  }
  function createNodePainter(runtime) {
    return function drawNode(ctx, node, look, frame, dpr) {
      const info = infoOf(runtime, node), { radius, bucket } = sizing(runtime, info, dpr), slot = stateIndex(runtime, node, look, frame) * runtime.state.SPRITE_RADII.length + bucket;
      const sprite = info.sprites[slot] || (info.sprites[slot] = sharedSprite(runtime, info, Math.floor(slot / runtime.state.SPRITE_RADII.length), bucket));
      const width = sprite.width * radius / runtime.state.SPRITE_RADII[bucket];
      if (ctx.globalAlpha !== look.alpha) ctx.globalAlpha = look.alpha;
      ctx.drawImage(sprite, node.x - width / 2, node.y - width / 2, width, width);
    };
  }
  function baseLayerOf(runtime, edge, frame) {
    if (frame.isActive(edge.a.id) && frame.isActive(edge.b.id)) return "active";
    return runtime.deps.reachableNodes.has(edge.a.id) || runtime.deps.reachableNodes.has(edge.b.id) ? "reach" : "idle";
  }
  function baseLayers(runtime, frame) {
    if (runtime.state.linkCache.nodes === runtime.deps.passiveRenderCache.nodes && runtime.state.linkCache.signature === runtime.deps.passiveRenderCache.stateSignature && runtime.state.linkCache.layers) return runtime.state.linkCache.layers;
    const layers = { idle: new runtime.deps.Path2D(), reach: new runtime.deps.Path2D(), active: new runtime.deps.Path2D() };
    runtime.deps.passiveRenderCache.activeEdges.forEach((edge) => {
      if ((0, runtime.deps.isPassiveNodeAvailable)(edge.a) && (0, runtime.deps.isPassiveNodeAvailable)(edge.b)) (0, runtime.deps.passiveNodePresentation.tracePassiveLinkSegment)(layers[baseLayerOf(runtime, edge, frame)], edge.a, edge.b);
    });
    runtime.state.linkCache = { nodes: runtime.deps.passiveRenderCache.nodes, signature: runtime.deps.passiveRenderCache.stateSignature, layers };
    return layers;
  }
  function hoverLayers(runtime, frame) {
    if (!frame.hoverId) return null;
    const layers = { chain: new runtime.deps.Path2D(), path: new runtime.deps.Path2D(), hover: new runtime.deps.Path2D() };
    runtime.deps.passiveRenderCache.activeEdges.forEach((edge) => {
      const layer = getPassiveHoverLinkLayer(edge.a, edge.b, frame);
      if (layer) (0, runtime.deps.passiveNodePresentation.tracePassiveLinkSegment)(layers[layer], edge.a, edge.b);
    });
    return layers;
  }
  function getPassiveHoverLinkLayer(a, b, frame) {
    if (a.id === frame.hoverId || b.id === frame.hoverId) return "hover";
    if (frame.pathIds.has(a.id) && frame.pathIds.has(b.id)) return "path";
    if (frame.linkedIds.has(a.id) && frame.linkedIds.has(b.id)) return "chain";
    return null;
  }
  function strokeLayer(runtime, ctx, path, styles) {
    styles.forEach(([color, px, minWorld, dash]) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = linkWidth(runtime, px, minWorld);
      ctx.setLineDash(dash ? [dash / runtime.deps.camZoom, dash * 0.7 / runtime.deps.camZoom] : []);
      ctx.stroke(path);
    });
  }
  function drawLinks(runtime, ctx, frame) {
    const base = baseLayers(runtime, frame), hover = hoverLayers(runtime, frame);
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ["idle", "reach", "active"].forEach((key) => strokeLayer(runtime, ctx, base[key], runtime.state.LINK_STYLES[key]));
    if (hover) ["chain", "path", "hover"].forEach((key) => strokeLayer(runtime, ctx, hover[key], runtime.state.LINK_STYLES[key]));
    ctx.setLineDash([]);
    ctx.restore();
  }
  function motifPaths(runtime) {
    if (runtime.state.motifDrawings) return runtime.state.motifDrawings;
    const motifs = runtime.deps.PASSIVE_TREE_V22.backgrounds ? runtime.deps.PASSIVE_TREE_V22.backgrounds.motifs : {};
    runtime.state.motifDrawings = Object.fromEntries(Object.entries(motifs).map(([id, motif]) => [id, {
      color: motif.color,
      shapes: motif.shapes.map((shape) => ({ ...shape, path: new runtime.deps.Path2D(shape.d) }))
    }]));
    return runtime.state.motifDrawings;
  }
  function drawMotifShape(runtime, ctx, shape, alpha, minWidth) {
    ctx.save();
    if (shape.m) ctx.transform(...shape.m);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(shape.strokeWidth || 1.25, minWidth);
    ctx.stroke(shape.path);
    if (shape.solid) {
      ctx.globalAlpha = alpha * (shape.fillOpacity === void 0 ? 0.07 : shape.fillOpacity);
      ctx.fill(shape.path, shape.fillRule || "nonzero");
    }
    ctx.restore();
  }
  function drawMotifs(runtime, ctx, view) {
    const items = runtime.deps.PASSIVE_TREE_V22.backgrounds ? runtime.deps.PASSIVE_TREE_V22.backgrounds.items : [];
    const drawings = items.length ? motifPaths(runtime) : null;
    const angle = (0, runtime.deps.getPassiveTreeViewAngle)(), cos = Math.cos(angle), sin = Math.sin(angle);
    items.map((item) => ({ item, x: item.x * cos - item.y * sin, y: item.x * sin + item.y * cos })).filter((place) => !motifOutside(runtime, place, view)).forEach(({ item, x, y }) => {
      const motif = drawings[item.motif];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(item.rotation * Math.PI / 180 + angle);
      ctx.scale(item.size / 200, item.size / 200);
      ctx.strokeStyle = ctx.fillStyle = motif.color;
      ctx.lineJoin = "miter";
      ctx.miterLimit = 3;
      const transform = ctx.getTransform(), minWidth = 1 / Math.hypot(transform.a, transform.b);
      motif.shapes.forEach((shape) => drawMotifShape(runtime, ctx, shape, item.opacity * runtime.state.MOTIF_ALPHA, minWidth));
      ctx.restore();
    });
  }
  function backdropGrain(runtime, ctx) {
    if (runtime.state.grainPattern) return runtime.state.grainPattern;
    const tile = runtime.deps.document.createElement("canvas"), g = tile.getContext("2d");
    tile.width = tile.height = 256;
    let seed = 11;
    const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    for (let i = 0; i < 1500; i++) {
      g.fillStyle = rand() < 0.5 ? "rgba(255,255,255,.009)" : "rgba(0,0,0,.06)";
      g.fillRect(Math.floor(rand() * 128) * 2, Math.floor(rand() * 128) * 2, 2, 2);
    }
    runtime.state.grainPattern = ctx.createPattern(tile, "repeat");
    return runtime.state.grainPattern;
  }
  function drawBackdrop(runtime, ctx, width, height) {
    const cx = width / 2 + runtime.deps.camX, cy = height / 2 + runtime.deps.camY;
    const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, runtime.state.ECLIPSE_REACH * runtime.deps.camZoom);
    runtime.state.ECLIPSE_STOPS.forEach(([radius, color]) => fill.addColorStop(radius / runtime.state.ECLIPSE_REACH, color));
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(Math.round(runtime.deps.camX) % 256, Math.round(runtime.deps.camY) % 256);
    ctx.fillStyle = backdropGrain(runtime, ctx);
    ctx.fillRect(-256, -256, width + 512, height + 512);
    ctx.restore();
  }
  function linkWidth(runtime, px, minWorld) {
    return Math.max(minWorld * Math.min(1, runtime.deps.camZoom / 0.35), px * Math.min(1, Math.max(0.55, runtime.deps.camZoom / 0.6)) / runtime.deps.camZoom);
  }
  function motifOutside(runtime, { item, x, y }, view) {
    const reach = item.size * 0.75;
    return x + reach < view.minX || x - reach > view.maxX || y + reach < view.minY || y - reach > view.maxY;
  }

  // modules/rendering/passive-tree-art-view.mjs
  function createPassiveTreeArt(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { paintFramed, paintStart, drawBackdrop, drawMotifs, drawLinks };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.handlers.drawNode = createNodePainter(runtime);
    initialize(runtime);
    runtime.api = Object.freeze({ drawBackdrop: runtime.handlers.drawBackdrop, drawMotifs: runtime.handlers.drawMotifs, drawLinks: runtime.handlers.drawLinks, drawNode: runtime.handlers.drawNode });
    return runtime.api;
  }
  function initialize(runtime) {
    runtime.state.TAU = Math.PI * 2;
    runtime.state.TONE = Object.freeze({
      idle: { ring: "#81786b", wood: ["#8c8274", "#4c463e"], fill: "#14110e", glow: null },
      reach: { ring: "#d6ccba", wood: ["#efe6d4", "#9c907c"], fill: "#1c1713", glow: null },
      active: { ring: "#e8b462", wood: ["#ffe2a6", "#b8822e"], fill: "#291c0e", glow: "rgba(255,184,92,0.36)" }
    });
    runtime.state.SHADE = Object.freeze({
      idle: { icon: [0.55, 0.8], frame: [0.7, 0.58], brass: null },
      reach: { icon: [0.88, 0.94], frame: [1, 1], brass: null },
      active: { icon: [1, 1.04], frame: [1, 1], brass: [234, 176, 92] }
    });
    runtime.state.FRAME_FIT = Object.freeze({
      small: { size: 1.14, icon: 0.58, socket: 0.82 },
      medium: { size: 1.12, icon: 0.6, socket: 0.76 },
      notable: { size: 1.2, icon: 0.57, socket: 0.64 },
      keystone: { size: 1.24, icon: 0.56, socket: 0.62 },
      void: { size: 1.3, icon: 0.42, socket: 0.4 }
    });
    runtime.state.SPRITE_RADII = Object.freeze([2, 3, 4, 6, 8, 11, 15, 21, 29, 40, 56, 78]);
    runtime.state.SPRITE_MARGIN = 1.9;
    runtime.state.sprites = /* @__PURE__ */ new Map();
    runtime.state.shadedImages = /* @__PURE__ */ new Map();
    runtime.state.imageIds = /* @__PURE__ */ new WeakMap();
    runtime.state.nodeIcons = /* @__PURE__ */ new WeakMap();
    runtime.state.nodeInfo = /* @__PURE__ */ new WeakMap();
    runtime.state.SPRITE_LIMIT = 1200;
    runtime.state.nextImageId = 1;
    runtime.state.linkCache = { nodes: null, signature: null, layers: null };
    runtime.state.PAINTERS = Object.freeze({ small: runtime.handlers.paintFramed, medium: runtime.handlers.paintFramed, notable: runtime.handlers.paintFramed, keystone: runtime.handlers.paintFramed, void: runtime.handlers.paintFramed, start: runtime.handlers.paintStart });
    runtime.state.STATES = Object.freeze(["idle", "reach", "active"]);
    runtime.state.spriteGeneration = 0;
    runtime.state.MIN_SCREEN_RADIUS = Object.freeze({ small: 1.8, medium: 2.4, notable: 3.4, keystone: 4.2, void: 3.6, start: 6.5 });
    runtime.state.bucketCache = { zoom: 0, dpr: 0, byLook: /* @__PURE__ */ new Map() };
    runtime.state.LINK_STYLES = Object.freeze({
      idle: [["rgba(6,5,4,0.85)", 4.6, 4.4], ["#4a443c", 2.2, 2.1]],
      reach: [["rgba(6,5,4,0.85)", 4.6, 4.4], ["#b3a894", 2.2, 2.1]],
      active: [["rgba(255,176,84,0.16)", 12, 12], ["#120c06", 5, 4.8], ["#d9a24c", 2.8, 2.6], ["#ffefcc", 1, 0.9]],
      chain: [["rgba(6,5,4,0.85)", 4.6, 4.4], ["#d5cbb8", 2.2, 2.1]],
      path: [["rgba(6,5,4,0.85)", 4.6, 4.4], ["#f3e3c0", 2.4, 2.2, 8]],
      hover: [["rgba(6,5,4,0.85)", 4.6, 4.4], ["#fff7e6", 2.8, 2.6]]
    });
    runtime.state.MOTIF_ALPHA = 0.42;
    runtime.state.motifDrawings = null;
    runtime.state.ECLIPSE_REACH = 3800;
    runtime.state.ECLIPSE_STOPS = Object.freeze([[0, "#0e0f16"], [2300, "#090a0f"], [2405, "#090a0f"], [2470, "#39415a"], [2492, "#98a5c6"], [2520, "#4d576f"], [2720, "#1a1f2d"], [3150, "#0a0c12"], [runtime.state.ECLIPSE_REACH, "#050609"]]);
    runtime.state.grainPattern = null;
  }

  // modules/ui/passive-tree-labels.mjs
  var EFFECT_LABELS = Object.freeze({
    flatHp: "생명력",
    pctHp: "생명(%)",
    regen: "재생",
    leech: "흡혈",
    flatDmg: "피해",
    pctDmg: "피해(%)",
    meleePctDmg: "근접(%)",
    physPctDmg: "물리피해(%)",
    aoePctDmg: "범위피해(%)",
    projectilePctDmg: "투사체피해(%)",
    firePctDmg: "화염피해(%)",
    coldPctDmg: "냉기피해(%)",
    lightPctDmg: "번개피해(%)",
    chaosPctDmg: "카오스피해(%)",
    elementalPctDmg: "원소피해(%)",
    dotPctDmg: "지속피해(%)",
    spellFlatPct: "주문내장(%)",
    slamPctDmg: "강타피해(%)",
    slamEchoChance: "여진확률",
    projectileExtraShots: "투사체추가",
    crit: "치명타 확률",
    critDmg: "치명타 피해",
    aspd: "공격 속도",
    move: "이동 속도",
    ds: "연속타격",
    armor: "방어도",
    armorPct: "방어도(%)",
    evasion: "회피",
    evasionPct: "회피(%)",
    energyShield: "보호막",
    energyShieldPct: "보호막(%)",
    energyShieldRegen: "보호막재생",
    deflectChance: "비껴내기",
    deflectMajor: "비껴내기",
    dr: "피감",
    blockChance: "막기",
    blockChancePct: "막기증폭",
    resF: "화염저항",
    resC: "냉기저항",
    resL: "번개저항",
    resAll: "모든원소저항",
    resChaos: "카오스저항",
    resPen: "저항관통",
    maxResF: "화염최대",
    maxResC: "냉기최대",
    maxResL: "번개최대",
    maxResChaos: "카오스최대",
    chaosResElemPenalty: "카오스저항+",
    igniteChance: "점화확률",
    chillChance: "냉각확률",
    freezeChance: "동결확률",
    shockChance: "감전확률",
    poisonChance: "중독확률",
    bleedChance: "출혈확률",
    igniteDamageMultiplierPct: "점화효율",
    chillEffect: "냉각효율",
    shockEffect: "감전효율",
    shockedEnemyHitDamagePct: "감전명중피해",
    ailResIgnite: "점화저항",
    ailResShock: "감전저항",
    ailResFreeze: "동결저항",
    ailResPoison: "중독저항",
    ailResBleed: "출혈저항",
    regenSuppress: "재생억제",
    physIgnore: "물리무시",
    minDmgRoll: "최소보정",
    maxDmgRoll: "최대보정",
    leechRateCap: "흡혈속도캡",
    leechTotalCap: "흡혈총량캡",
    leechInstanceCap: "흡혈캡",
    moveEvasion: "이속 및 회피",
    hpArmor: "생명력 및 방어도",
    aspdMove: "공속 및 이속",
    summonPctDmg: "소환피해(%)",
    summonHpPct: "소환생명(%)",
    summonCritDmg: "소환치피",
    summonFlatDmg: "소환피해",
    summonCrit: "소환치명",
    summonAspd: "소환공속",
    gemLevel: "룬레벨",
    suppCap: "보조스킬룬한도",
    expGain: "경험치",
    fireGemLevel: "화염룬레벨",
    coldGemLevel: "냉기룬레벨",
    lightGemLevel: "번개룬레벨",
    chaosGemLevel: "카오스룬레벨",
    physGemLevel: "물리룬레벨",
    projectileGemLevel: "투사체룬레벨",
    meleeGemLevel: "근접룬레벨",
    slamGemLevel: "강타룬레벨",
    spellGemLevel: "주문룬레벨",
    dotGemLevel: "지속룬레벨",
    aoeGemLevel: "범위룬레벨",
    elementalGemLevel: "원소룬레벨",
    strGemLevel: "힘룬레벨",
    dexGemLevel: "민첩룬레벨",
    intGemLevel: "지능룬레벨",
    runeResonancePower: "공명력"
  });
  function drawPassiveSearchHighlight(runtime, ctx, node, radius, accent) {
    ctx.save();
    const ringColor = accent && accent.activeOuter ? accent.activeOuter : "#ffffff";
    const textColor = accent && accent.text ? accent.text : "#ffffff";
    ctx.globalAlpha = 0.95;
    ctx.shadowColor = ringColor;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = Math.max(1.4, 2.2 / Math.max(0.35, runtime.deps.camZoom));
    ctx.stroke();
    ctx.shadowBlur = 0;
    const label = String((0, runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) || "").replace(/\s*\([^)]*\)\s*$/, "").replace(/\s*증가$/, "").trim();
    if (label && runtime.deps.camZoom >= 0.18) {
      const fontSize = Math.max(10, Math.min(22, 12 / Math.max(0.32, runtime.deps.camZoom)));
      ctx.font = `${fontSize}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      const y = node.y - radius - 14;
      const padX = 6 / Math.max(0.42, runtime.deps.camZoom);
      const h = fontSize + 5;
      const w = ctx.measureText(label).width + padX * 2;
      ctx.fillStyle = "rgba(6,10,16,0.82)";
      ctx.strokeStyle = ringColor;
      ctx.lineWidth = 1 / Math.max(0.45, runtime.deps.camZoom);
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") ctx.roundRect(node.x - w / 2, y - h, w, h, 5 / Math.max(0.45, runtime.deps.camZoom));
      else ctx.rect(node.x - w / 2, y - h, w, h);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = textColor;
      ctx.fillText(label, node.x, y - 3);
    }
    ctx.restore();
  }
  function getPassiveNodeEffectShortLabel(runtime, node) {
    if (!node) return "";
    const stat = node.stat || "";
    const shortByStat = EFFECT_LABELS;
    if (shortByStat[stat]) return shortByStat[stat];
    let label = (0, runtime.deps.getStatName)(stat) || (0, runtime.deps.passiveNodePresentation.getPassiveEffectLabel)(node) || "";
    label = String(label).replace(/\([^)]*\)/g, "").replace(/[+\-]?\d+(?:\.\d+)?\s*%?/g, "").replace(/[·:：]/g, " ").replace(/증가|확률|획득|피해량|효과/g, "").replace(/\s+/g, "").trim();
    if (!label) label = (0, runtime.deps.passiveNodePresentation.getPassiveNodeDisplayName)(node) || "";
    return label.length > 6 ? label.slice(0, 6) : label;
  }
  function drawPassiveNodeEffectLabel(runtime, ctx, node, look, visibility) {
    const { radius, active, reachable } = look;
    if (runtime.deps.game.settings.passiveTreeShowLabels === false) return;
    if (labelOutsideView(runtime, node, visibility)) return;
    const important = majorLabelNode(node);
    const hovered = isHoveredLabel(runtime, node);
    if (inactiveLabelHidden(hovered, reachable, active, important)) return;
    const label = getPassiveNodeEffectShortLabel(runtime, node);
    if (!label) return;
    const accent = (0, runtime.deps.passiveNodePresentation.getPassiveStatAccent)(node.stat);
    const zoomForScale = Math.max(runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM, runtime.deps.camZoom);
    const fontSize = Math.max(9, Math.min(46, 10.5 / zoomForScale));
    const padX = 4.5 / zoomForScale;
    const padY = 2.5 / zoomForScale;
    const placeLeft = node.x < -80;
    const gap = 6 / zoomForScale;
    const anchorX = node.x + (placeLeft ? -(radius + gap) : radius + gap);
    const y = node.y + fontSize * 0.38;
    ctx.save();
    ctx.font = `${fontSize}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
    ctx.textAlign = placeLeft ? "right" : "left";
    ctx.textBaseline = "middle";
    const w = ctx.measureText(label).width + padX * 2;
    const h = fontSize + padY * 2;
    const x = placeLeft ? anchorX - w : anchorX;
    const rect = { x: x - 2, y: y - h / 2 - 2, w: w + 4, h: h + 4 };
    const collides = runtime.state.passiveEffectLabelRects.some((other) => !(rect.x + rect.w < other.x || other.x + other.w < rect.x || rect.y + rect.h < other.y || other.y + other.h < rect.y));
    if (collides && !hovered) {
      ctx.restore();
      return;
    }
    runtime.state.passiveEffectLabelRects.push(rect);
    paintLabelBox(ctx, { active, reachable, accent, zoomForScale, x, y, w, h, label, placeLeft, padX });
  }
  function drawPassiveNodeStatusRing(runtime, ctx, node, look) {
    if (look.dimmed || !look.anchor) return;
    ctx.save();
    ctx.globalAlpha = look.alpha;
    ctx.beginPath();
    ctx.arc(node.x, node.y, look.radius + 9, 0, Math.PI * 2);
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(188,132,255,0.95)";
    ctx.lineWidth = 2.2;
    ctx.stroke();
    ctx.restore();
  }
  function drawPassiveNodeExtras(runtime, ctx, extras) {
    extras.forEach(({ node, look, visibility }) => {
      drawPassiveNodeStatusRing(runtime, ctx, node, look);
      if (!look.dimmed) drawPassiveNodeEffectLabel(runtime, ctx, node, look, visibility);
      if (look.searchHit) drawPassiveSearchHighlight(runtime, ctx, node, look.radius, (0, runtime.deps.passiveNodePresentation.getPassiveStatAccent)(node.stat));
    });
  }
  function drawPassiveClassStartLabels(runtime, ctx, nodes2, frame) {
    const starts = nodes2.filter((node) => node.kind === "start" && node.title && (0, runtime.deps.getPassiveVisibility)(node.id) !== "hidden");
    if (!starts.length) return;
    ctx.save();
    ctx.font = `${13 / runtime.deps.camZoom}px ${runtime.deps.i18n.fontFamily("'Galmuri11'")}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3 / runtime.deps.camZoom;
    ctx.strokeStyle = "rgba(5,4,4,0.92)";
    starts.forEach((node) => {
      const y = node.y + (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) * 1.45 + 4 / runtime.deps.camZoom;
      ctx.fillStyle = node.id === frame.rootId ? "#e9be67" : "#b3a283";
      ctx.strokeText((0, runtime.deps._t)(node.title), node.x, y);
      ctx.fillText((0, runtime.deps._t)(node.title), node.x, y);
    });
    ctx.restore();
  }
  function labelOutsideView(runtime, node, visibility) {
    return !node || visibility === "hidden" || runtime.deps.camZoom < runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM;
  }
  function majorLabelNode(node) {
    return node.kind === "major" || node.kind === "hub" || node.kind === "apex" || node.kind === "transcendent";
  }
  function isHoveredLabel(runtime, node) {
    return !!(runtime.deps.hoverNode && runtime.deps.hoverNode.id === node.id);
  }
  function inactiveLabelHidden(hovered, reachable, active, important) {
    return !hovered && !reachable && !(active && important);
  }
  function paintLabelBox(ctx, layout) {
    const { active, reachable, accent, zoomForScale, x, y, w, h, label, placeLeft, padX } = layout;
    ctx.globalAlpha = active ? 0.98 : reachable ? 0.9 : 0.76;
    ctx.fillStyle = "rgba(5,9,15,0.78)";
    ctx.strokeStyle = active ? accent.activeOuter : reachable ? accent.reachOuter : "rgba(150,175,200,0.5)";
    ctx.lineWidth = Math.max(0.7, 1 / zoomForScale);
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") ctx.roundRect(x, y - h / 2, w, h, 4 / zoomForScale);
    else ctx.rect(x, y - h / 2, w, h);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent.text || "#dce6f2";
    ctx.fillText(label, placeLeft ? x + w - padX : x + padX, y);
    ctx.restore();
  }

  // modules/ui/passive-tree-canvas.mjs
  function drawPassiveTreeNodes(runtime, ctx, nodes2, frame, dpr) {
    const extras = [];
    nodes2.forEach((node) => {
      const visibility = (0, runtime.deps.getPassiveVisibility)(node.id);
      if (visibility === "hidden") return;
      const look = getPassiveNodeLook(runtime, node, frame);
      runtime.art.drawNode(ctx, node, look, frame, dpr);
      if (look.anchor || look.searchHit || !look.dimmed && runtime.deps.camZoom >= runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM) extras.push({ node, look, visibility });
    });
    ctx.globalAlpha = 1;
    return extras;
  }
  function getPassiveTreeBounds(runtime) {
    if (runtime.state.passiveNodeLayer.boundsFor === runtime.deps.passiveRenderCache.nodes) return runtime.state.passiveNodeLayer.bounds;
    const xs = runtime.deps.passiveRenderCache.nodes.map((node) => node.x), ys = runtime.deps.passiveRenderCache.nodes.map((node) => node.y);
    const bounds = { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
    runtime.state.passiveNodeLayer = { ...runtime.state.passiveNodeLayer, key: "", boundsFor: runtime.deps.passiveRenderCache.nodes, bounds };
    return bounds;
  }
  function getPassiveNodeLayerKey(runtime, frame, dpr) {
    const search = (0, runtime.deps.getPassiveTreeSearchState)();
    const art = ["passiveTreeIcons", "passiveTreeNotableIcons", "passiveTreeKeystoneIcons", "passiveTreeFrames"].map((key) => (0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)(key) ? 1 : 0).join("");
    return [runtime.deps.camZoom, dpr, runtime.deps.passiveRenderCache.stateSignature, frame.rootId, search.search, search.filter, art].join("|");
  }
  function getPassiveNodeLayerRect(runtime, bounds) {
    const margin = Math.max(90, 16 / runtime.deps.camZoom);
    return { minX: bounds.minX - margin, minY: bounds.minY - margin, width: bounds.maxX - bounds.minX + margin * 2, height: bounds.maxY - bounds.minY + margin * 2 };
  }
  function renderPassiveNodeLayer(runtime, frame, dpr, bounds, key) {
    const scale = runtime.deps.camZoom * dpr, canvas = runtime.state.passiveNodeLayer.canvas || runtime.deps.document.createElement("canvas");
    canvas.width = Math.ceil(bounds.width * scale);
    canvas.height = Math.ceil(bounds.height * scale);
    const layer = canvas.getContext("2d");
    layer.setTransform(scale, 0, 0, scale, -bounds.minX * scale, -bounds.minY * scale);
    const extras = drawPassiveTreeNodes(runtime, layer, runtime.deps.passiveRenderCache.nodes, frame, dpr);
    runtime.state.passiveNodeLayer = { ...runtime.state.passiveNodeLayer, key, canvas, extras };
  }
  function drawPassiveNodesInView(runtime, ctx, visibleNodes, frame, dpr) {
    const bounds = getPassiveNodeLayerRect(runtime, getPassiveTreeBounds(runtime));
    const fits = runtime.deps.camZoom <= runtime.state.PASSIVE_NODE_LAYER_MAX_ZOOM && runtime.deps.passiveRevealBursts.length === 0 && Math.max(bounds.width, bounds.height) * runtime.deps.camZoom * dpr <= runtime.state.PASSIVE_NODE_LAYER_MAX_PX;
    if (!fits) return drawPassiveTreeNodes(runtime, ctx, visibleNodes, frame, dpr);
    const key = getPassiveNodeLayerKey(runtime, frame, dpr);
    if (runtime.state.passiveNodeLayer.key !== key) renderPassiveNodeLayer(runtime, frame, dpr, bounds, key);
    ctx.drawImage(runtime.state.passiveNodeLayer.canvas, bounds.minX, bounds.minY, bounds.width, bounds.height);
    return runtime.state.passiveNodeLayer.extras;
  }
  function getPassiveCanvasSize(runtime, canvas) {
    return {
      dpr: Math.max(1, runtime.deps.passiveCanvasMetrics.dpr || runtime.deps.window.devicePixelRatio || 1),
      width: runtime.deps.passiveCanvasMetrics.width || Math.max(1, canvas.clientWidth || 1),
      height: runtime.deps.passiveCanvasMetrics.height || Math.max(1, canvas.clientHeight || 1)
    };
  }
  function drawPassiveTree(runtime) {
    (0, runtime.deps.cleanupPassiveBursts)();
    (0, runtime.deps.ensurePassiveRenderCache)();
    const canvas = runtime.deps.document.getElementById("tree-canvas");
    if (!canvas || canvas.offsetParent === null) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = getPassiveCanvasSize(runtime, canvas);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
    const viewport = (0, runtime.deps.getPassiveWorldViewport)(size.width, size.height);
    const visibleNodes = runtime.deps.passiveRenderCache.nodes.filter((node) => (0, runtime.deps.isNodeInViewport)(node, viewport, 120));
    runtime.art.drawBackdrop(ctx, size.width, size.height);
    ctx.save();
    ctx.translate(size.width / 2 + runtime.deps.camX, size.height / 2 + runtime.deps.camY);
    ctx.scale(runtime.deps.camZoom, runtime.deps.camZoom);
    const frame = createPassiveDrawFrame(runtime);
    runtime.art.drawMotifs(ctx, viewport);
    runtime.art.drawLinks(ctx, frame);
    runtime.state.passiveEffectLabelRects = [];
    drawPassiveNodeExtras(runtime, ctx, drawPassiveNodesInView(runtime, ctx, visibleNodes, frame, size.dpr));
    drawPassiveClassStartLabels(runtime, ctx, visibleNodes, frame);
    ctx.restore();
    runtime.handlers.syncPassiveTreeOverlay(size.width, size.height, visibleNodes, frame.linkedIds, frame.pathIds);
  }

  // modules/ui/equipment-panels.mjs
  function isCraftSelectionEquipAvailableLocal(runtime) {
    return typeof runtime.deps.isCraftSelectionEquip === "function" && (0, runtime.deps.isCraftSelectionEquip)();
  }
  function getCraftSelectionRefLocal(runtime) {
    return typeof runtime.deps.getCraftSelectionRef === "function" ? (0, runtime.deps.getCraftSelectionRef)() : null;
  }
  function handleEquipmentSlotDoubleClick(runtime, slot) {
    (0, runtime.deps.unequipItem)(slot);
  }
  function getDropOnlyItemSourceMeta(runtime, item) {
    if (!item) return null;
    let base = runtime.deps.BASE_ITEM_DB.find((row) => row && (item.baseId && row.id === item.baseId || row.slot === String(item.slot || "").replace(/[12]/, "") && row.name === item.baseName));
    let unique = runtime.deps.UNIQUE_DB.find((row) => row && row.name === item.name && Array.isArray(row.slots) && row.slots.includes(String(item.slot || "").replace(/[12]/, "")));
    let dropOnly = dropOnlyRule(base, unique);
    let sourceKey = dropOnly ? dropOnly.type || dropOnly.id || null : null;
    if (!sourceKey && base && base.realmBase) sourceKey = `realm_${base.realmBase}`;
    let map = {
      beehive: { badgeClass: "item-source-badge item-source-badge--beehive", toneClass: "item-source-tone--beehive", label: (0, runtime.deps._t)("벌집 한정") },
      trial: { badgeClass: "item-source-badge item-source-badge--trial", toneClass: "item-source-tone--trial", label: (0, runtime.deps._t)("시련 한정") },
      rift: { badgeClass: "item-source-badge item-source-badge--rift", toneClass: "item-source-tone--rift", label: (0, runtime.deps._t)("균열 한정") },
      meteor: { badgeClass: "item-source-badge item-source-badge--meteor", toneClass: "item-source-tone--meteor", label: (0, runtime.deps._t)("운석 한정") },
      labyrinth: { badgeClass: "item-source-badge item-source-badge--ancient-labyrinth", toneClass: "item-source-tone--ancient-labyrinth", label: (0, runtime.deps._t)("고대 미궁 한정") },
      ancient_labyrinth: { badgeClass: "item-source-badge item-source-badge--ancient-labyrinth", toneClass: "item-source-tone--ancient-labyrinth", label: (0, runtime.deps._t)("고대 미궁 한정") },
      grand_breach_run: { badgeClass: "item-source-badge item-source-badge--rift", toneClass: "item-source-tone--rift", label: (0, runtime.deps._t)("대균열 한정") },
      atlasLate: { badgeClass: "item-source-badge item-source-badge--atlas-late", toneClass: "item-source-tone--atlas-late", label: (0, runtime.deps._t)("아틀라스 한정") },
      seasonBoss: { badgeClass: "item-source-badge item-source-badge--root-boss", toneClass: "item-source-tone--root-boss", label: (0, runtime.deps._t)("보스 한정") },
      skyTower: { badgeClass: "item-source-badge item-source-badge--sky-tower", toneClass: "item-source-tone--sky-tower", label: (0, runtime.deps._t)("창공의 탑 한정") },
      colony: { badgeClass: "item-source-badge item-source-badge--colony", toneClass: "item-source-tone--colony", label: (0, runtime.deps._t)("군락지 한정") },
      realm_chaos: { badgeClass: "item-source-badge item-source-badge--realm-chaos", toneClass: "item-source-tone--realm-chaos", label: (0, runtime.deps._t)("혼돈계 한정") },
      realm_underworld: { badgeClass: "item-source-badge item-source-badge--realm-underworld", toneClass: "item-source-tone--realm-underworld", label: (0, runtime.deps._t)("지하계 한정") },
      realm_cosmos: { badgeClass: "item-source-badge item-source-badge--realm-cosmos", toneClass: "item-source-tone--realm-cosmos", label: (0, runtime.deps._t)("우주계 한정") }
    };
    return sourceKey ? map[sourceKey] || null : null;
  }
  function getEquipSearchQueryLocal(runtime) {
    try {
      if (typeof runtime.deps.getSearchFilterState === "function") {
        let sf = (0, runtime.deps.getSearchFilterState)();
        if (sf && typeof sf.equip === "string") return sf.equip;
      }
      let d = runtime.deps.game && runtime.deps.game.settings && runtime.deps.game.settings.searchFilters;
      return d && typeof d.equip === "string" ? d.equip : "";
    } catch (error) {
      runtime.deps.console.error("equipment search query failed:", error);
      return "";
    }
  }
  function highlightEquipTextLocal(runtime, text, query) {
    let raw = String(text || "");
    let q = String(query || "").trim().toLowerCase();
    if (!q) return (0, runtime.deps.escapeHTML)(raw);
    let tokens = q.split(/\s+/).filter(Boolean).sort((a, b) => b.length - a.length);
    if (tokens.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    let lower = raw.toLowerCase();
    let ranges = [];
    tokens.forEach((tok) => {
      let from = 0;
      while (from < lower.length) {
        let idx = lower.indexOf(tok, from);
        if (idx < 0) break;
        ranges.push([idx, idx + tok.length]);
        from = idx + Math.max(1, tok.length);
      }
    });
    if (ranges.length <= 0) return (0, runtime.deps.escapeHTML)(raw);
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    let merged = [];
    ranges.forEach(([s, e]) => {
      let last = merged[merged.length - 1];
      if (!last || s > last[1]) merged.push([s, e]);
      else last[1] = Math.max(last[1], e);
    });
    let out = "";
    let cur = 0;
    merged.forEach(([s, e]) => {
      if (s > cur) out += (0, runtime.deps.escapeHTML)(raw.slice(cur, s));
      out += `<mark style="background:#5a4a1a;color:#ffe8a3;padding:0 1px;border-radius:2px;">${(0, runtime.deps.escapeHTML)(raw.slice(s, e))}</mark>`;
      cur = e;
    });
    if (cur < raw.length) out += (0, runtime.deps.escapeHTML)(raw.slice(cur));
    return out;
  }
  function paperdollItemLabel(runtime, item) {
    if (item.rarity === "unique" || !item.baseName) return (0, runtime.deps._t)(item.name || item.baseName || "장비");
    return (0, runtime.deps._t)(item.baseName);
  }
  function getPaperdollSlots(runtime, equipment = runtime.deps.game.equipment) {
    const slots = ["무기", "투구", "목걸이", "장갑1", "갑옷", "방패", "반지1", "허리띠", "반지2", "신발", "장갑2"];
    return isThirdRingOpen(runtime) || (equipment || {})["반지3"] ? [...slots, "반지3"] : slots;
  }
  function setPaperdollHtml(runtime, targetId, html) {
    const list = runtime.deps.document.getElementById(targetId);
    (0, runtime.deps.writeHtmlIfChanged)(list, html);
    list.classList.toggle("has-ring3", !!list.querySelector(".slot-반지3"));
    list.classList.toggle("has-core", !!list.querySelector(".slot-코어"));
  }
  function renderPaperdoll(runtime, targetId) {
    let html = "";
    let query = getEquipSearchQueryLocal(runtime);
    let hi = (text) => {
      try {
        if (typeof runtime.deps.highlightSearchText === "function") return (0, runtime.deps.highlightSearchText)(text, query);
      } catch (error) {
        runtime.deps.console.error("equipment search highlight failed:", error);
      }
      return highlightEquipTextLocal(runtime, text, query);
    };
    getPaperdollSlots(runtime).forEach((slot) => {
      let item = runtime.deps.game.equipment[slot];
      let displaySlot = (0, runtime.deps.getItemSlotDisplayLabel)(null, slot.replace(/[123]$/, ""));
      let selected = isCraftSelectionEquipAvailableLocal(runtime) && getCraftSelectionRefLocal(runtime) === slot;
      if (item) {
        let click = `equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')`;
        let doubleClick = `event.stopPropagation(); equipmentInventoryInteraction.cancelCarry(); handleEquipmentSlotDoubleClick('${slot}')`;
        let sourceMeta = getDropOnlyItemSourceMeta(runtime, item);
        let sourceTone = (sourceMeta ? sourceMeta.toneClass : "") + thirdRingOffClass(runtime, slot);
        let preview = `if(window.matchMedia('(hover: hover)').matches) showItemTooltip(event, '${slot}', true)`;
        html += `<div class="slot-box equipment-slot slot-${slot} rarity-${item.rarity || "normal"} ${selected ? "selected" : ""} ${sourceTone}${runtime.deps.itemInfluencesUi.influenceClasses(item)}" style="${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-slot="${slot}" data-item-tooltip-anchor="1" onclick="${click}" ondblclick="${doubleClick}" onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)(item)}" alt="" aria-hidden="true" draggable="false">${runtime.deps.equipmentSocketsUi.badgesHtml(item, `slot:${slot}`)}${runtime.deps.equipmentWindowUi.tierHtml(item)}${runtime.deps.equipmentWindowUi.baseStepHtml(item)}</div>
                <div class="item-title equipment-slot-name ${item.rarity}">${hi(paperdollItemLabel(runtime, item))}</div>
            </div>`;
      } else {
        let emptyClick = ` onclick="equipmentInventoryInteraction.handleEquippedItemClick(event,'${slot}')"`;
        html += `<div class="slot-box equipment-slot equipment-slot-empty slot-${slot}" data-slot="${slot}"${emptyClick}>
                <div class="equipment-slot-head"><span>${displaySlot}</span></div><div class="equipment-slot-visual empty"><img src="${(0, runtime.deps.getEquipmentGridVisualAsset)({ slot: slot.replace(/[123]$/, ""), baseId: `empty-${slot}` })}" alt="" aria-hidden="true" draggable="false"></div>
                <div class="equipment-empty-mark">＋</div>
                <div class="equipment-empty-label">${(0, runtime.deps._t)("비어 있음")}</div>
            </div>`;
      }
    });
    if (targetId === "ui-equip-list") html += runtime.deps.coreItemsUi.slotHtml() + runtime.deps.colonyWardsUi.slotsHtml();
    setPaperdollHtml(runtime, targetId, html);
    if (targetId === "ui-equip-list") runtime.deps.equipmentAuxUi.render();
  }
  function createEquipmentGridItemRenderer(runtime) {
    return function renderEquipmentGridItem2(item, idx, triageResult, placement, filterState) {
      let size = (0, runtime.deps.getEquipmentInventoryFootprint)(item);
      let footprint = placement || { column: 0, row: 0, columns: size.columns, rows: size.rows };
      let asset = (0, runtime.deps.getEquipmentGridVisualAsset)(item);
      let sourceMeta = getDropOnlyItemSourceMeta(runtime, item);
      let presetProtected = equipmentPresetProtected(runtime, item);
      let itemKey = placement ? placement.key : runtime.deps.equipmentInventoryGridRuntime.getItemKey(item);
      let selected = runtime.deps.equipmentInventoryInteraction.getFocusedKey() === itemKey;
      let carried = runtime.deps.equipmentInventoryInteraction.isCarryingKey(itemKey);
      let filterClass = gridFilterClass(filterState);
      let rarityLabel = (0, runtime.deps._t)(runtime.deps.ITEM_RARITY_LABELS[item.rarity] || runtime.deps.ITEM_RARITY_LABELS.normal);
      const gains = triageResult ? [[triageResult.dpsGainPct, "atk", "공격"], [triageResult.ehpGainPct, "def", "생존"]].filter((row) => row[0] >= 1) : [];
      const status = gridItemStatus(item, presetProtected);
      const gain = gains[0];
      const badges = gridItemBadges(runtime, gain, status, item);
      const details = gridItemDetails(item, presetProtected, triageResult, gains);
      let label = gridItemLabel(runtime, item, rarityLabel, footprint, details);
      let preview = `if(window.matchMedia('(hover: hover)').matches&&!equipmentInventoryInteraction.isCarrying())showItemTooltip(event,${idx},false)`;
      return `<button type="button" class="equipment-grid-item rarity-${item.rarity || "normal"} ${selected ? "selected" : ""} ${carried ? "is-carried" : ""} ${filterClass} ${sourceMeta ? sourceMeta.toneClass : ""}${runtime.deps.itemInfluencesUi.influenceClasses(item)}"
        style="grid-column:${footprint.column + 1}/span ${footprint.columns};grid-row:${footprint.row + 1}/span ${footprint.rows};--item-grid-columns:${footprint.columns};--item-grid-rows:${footprint.rows};${runtime.deps.itemInfluencesUi.influenceStyle(item)}" data-equipment-grid-key="${(0, runtime.deps.escapeHTML)(itemKey)}"
        aria-pressed="${selected ? "true" : "false"}" aria-label="${(0, runtime.deps.escapeHTML)(label)}"
        onclick="equipmentInventoryInteraction.handleItemClick(event,this.dataset.equipmentGridKey,${idx})"
        ondblclick="equipmentInventoryInteraction.handleItemDoubleClick(event,this.dataset.equipmentGridKey,${item.id})"
        onmouseenter="${preview}" onmousemove="${preview}" onmouseleave="hideItemTooltip(event)">
        <img class="equipment-grid-item-art" src="${asset}" alt="" aria-hidden="true" draggable="false">${runtime.deps.equipmentWindowUi.tierHtml(item)}${runtime.deps.equipmentWindowUi.baseStepHtml(item)}${runtime.deps.equipmentWindowUi.newDotHtml(item)}${runtime.deps.equipmentSocketsUi.badgesHtml(item, `item:${item.id}`)}
        <span class="equipment-grid-item-badges">${badges}</span>
    </button>`;
    };
  }
  function renderEquipmentGridCells(runtime, layout, visibleKeys) {
    let hiddenOccupied = /* @__PURE__ */ new Set();
    layout.entries.filter((entry) => !visibleKeys.has(entry.key)).forEach((entry) => {
      for (let row = entry.row; row < entry.row + entry.rows; row++) {
        for (let column = entry.column; column < entry.column + entry.columns; column++) hiddenOccupied.add(`${column}:${row}`);
      }
    });
    let cells = [];
    for (let row = 0; row < layout.rows; row++) {
      for (let column = 0; column < layout.columns; column++) {
        let hiddenClass = hiddenOccupied.has(`${column}:${row}`) ? " occupied-filtered" : "";
        cells.push(`<button type="button" tabindex="-1" class="equipment-grid-cell${hiddenClass}" style="grid-column:${column + 1};grid-row:${row + 1};" data-grid-column="${column}" data-grid-row="${row}" aria-label="${column + 1}열 ${row + 1}행으로 이동" onclick="equipmentInventoryInteraction.moveFocusedTo(event,${column},${row})"></button>`);
      }
    }
    return cells.join("");
  }
  function renderEquipmentInventoryGrid(runtime, layout, rows) {
    let byKey = new Map(layout.entries.map((entry) => [entry.key, entry]));
    let visibleKeys = new Set(rows.map((row) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item)));
    let itemHtml = rows.map((row) => {
      let key = runtime.deps.equipmentInventoryGridRuntime.getItemKey(row.item);
      let placement = byKey.get(key);
      if (!placement) return "";
      let triageResult = runtime.deps.window.equipmentTriage ? runtime.deps.window.equipmentTriage.getResult(row.item) : null;
      return runtime.handlers.renderEquipmentGridItem(row.item, row.idx, triageResult, placement, row);
    }).join("");
    return renderEquipmentGridCells(runtime, layout, visibleKeys) + itemHtml;
  }
  function renderEquipmentInspectorActions(runtime, item, slot, presetProtected) {
    let primaryAction = slot ? `equipmentInventoryInteraction.focus(null);unequipItem('${slot}')` : `equipmentInventoryInteraction.cancelCarry();equipItemById(${item.id})`;
    let craftAction = slot ? `equipmentInventoryInteraction.focus(null);switchItemSubtab('item-tab-craft');selectForCrafting('${slot}',true)` : `equipmentInventoryInteraction.focus(null);craftSelectInventoryItemById(${item.id})`;
    let craft = !runtime.deps.bagItems.isSpecial(item) && runtime.deps.contentProgression.canOpen("item-tab-craft") ? `<button data-content-action="craft" onclick="${craftAction}"><span class="px-center">${(0, runtime.deps._t)("제작실")}</span></button>` : "";
    let tools = runtime.deps.bagItems.isSpecial(item) ? "" : `${runtime.deps.chaosInfusionUi.actionHtml(item, slot)}${runtime.deps.equipmentSocketsUi.actionHtml(item, slot)}${runtime.deps.gardenOilsUi.actionHtml(item, slot)}`;
    return `<button class="equipment-card-primary" onclick="${primaryAction}"><span class="px-center">${slot ? (0, runtime.deps._t)("장착 해제") : runtime.deps.bagItems.isJewel(item) ? (0, runtime.deps._t)("끼우기") : (0, runtime.deps._t)("장착")}</span></button>
        ${slot ? craft : renderEquipmentInventoryProtectionActions(runtime, item, presetProtected, craft)}${tools}`;
  }
  function renderEquipmentInventoryProtectionActions(runtime, item, presetProtected, middle = "") {
    let salvageTitle = presetProtected ? "장비 세팅 프리셋에서 제거한 뒤 해체할 수 있습니다." : "장비를 해체합니다.";
    return `<button class="${item.locked ? "is-locked" : ""}" onclick="toggleItemLockById(${item.id})"><span class="px-center">${item.locked ? (0, runtime.deps._t)("잠금해제") : (0, runtime.deps._t)("잠금")}</span></button>${middle}
        <button class="equipment-card-danger" data-tip="${salvageTitle}" onclick="equipmentInventoryInteraction.cancelCarry();salvageItemById(${item.id})" ${item.locked || presetProtected ? "disabled" : ""}><span class="px-center">${presetProtected ? (0, runtime.deps._t)("보호됨") : (0, runtime.deps._t)("해체")}</span></button>`;
  }
  function renderEquipmentInventoryInspector(runtime, rows) {
    runtime.deps.equipmentInspectionUi.decorateLoadout();
    let root = runtime.deps.document.getElementById("ui-equipment-inventory-inspector");
    if (!root) return;
    let visibleItems = (Array.isArray(rows) ? rows : []).map((row) => row.item).filter(Boolean);
    let focusedKey = runtime.deps.equipmentInventoryInteraction.getFocusedKey();
    let slot = runtime.deps.equipmentInventoryInteraction.getFocusedEquipmentSlot();
    let item = inspectionItem(runtime, slot, visibleItems, focusedKey);
    if (item && runtime.deps.equipmentInventoryGridRuntime.getItemKey(item) !== focusedKey) item = null;
    if (!item) {
      runtime.deps.equipmentInventoryInteraction.setFocusedKey(null);
      let message = visibleItems.length ? "가방에서 장비를 고르면 여기서 비교합니다." : "표시할 장비가 없습니다.";
      let emptyHtml = runtime.deps.equipmentWindowUi.emptyHtml(message);
      if (root.__lastHtml !== emptyHtml) root.innerHTML = root.__lastHtml = emptyHtml;
      return;
    }
    runtime.deps.equipmentInventoryInteraction.setFocusedKey(runtime.deps.equipmentInventoryGridRuntime.getItemKey(item));
    let presetProtected = equipmentPresetProtected(runtime, item);
    let flags = [presetProtected ? "세팅 보호" : "", item.locked ? "잠금" : ""].filter(Boolean).join(", ");
    let html = runtime.deps.equipmentWindowUi.inspectorHtml(item, slot, renderEquipmentInspectorActions(runtime, item, slot, presetProtected), flags);
    runtime.deps.equipmentInspectionUi.render(root, item, slot, html);
    runtime.deps.equipmentInventoryInteraction.positionInspector();
  }
  function isThirdRingOpen(runtime) {
    return typeof runtime.deps.getTranscendentVoidPassiveCount === "function" && (0, runtime.deps.getTranscendentVoidPassiveCount)("thirdFinger", runtime.deps.game) > 0;
  }
  function thirdRingOffClass(runtime, slot) {
    return slot === "반지3" && !isThirdRingOpen(runtime) ? " is-off" : "";
  }
  function dropOnlyRule(base, unique) {
    return base && base.dropOnly ? base.dropOnly : unique && unique.dropOnly ? unique.dropOnly : null;
  }
  function gridFilterClass(filterState) {
    return filterState && filterState.filterActive ? filterState.filterMatched ? "is-filter-match" : "is-filter-muted" : "";
  }
  function gridItemBadges(runtime, gain, status, item) {
    return gain ? `<span class="is-${gain[1]}">+${Math.round(gain[0])}%</span>` : status ? `<span>${item.locked ? (0, runtime.deps._t)("잠금") : (0, runtime.deps._t)("세팅")}</span>` : "";
  }
  function gridItemDetails(item, presetProtected, triageResult, gains) {
    return [
      item.locked && "잠금",
      presetProtected && "장비 세팅에 포함",
      triageResult && triageResult.special && "특수 효과",
      ...gains.map((row) => `${row[2]} +${row[0]}%`)
    ].filter(Boolean).join(", ");
  }
  function gridItemLabel(runtime, item, rarityLabel, footprint, details) {
    return [`${rarityLabel} ${item.name || item.baseName || (0, runtime.deps._t)("장비")}`, (0, runtime.deps.getItemSlotDisplayLabel)(item), `${footprint.columns}×${footprint.rows}`, details].filter(Boolean).join(", ");
  }
  function inspectionItem(runtime, slot, visibleItems, focusedKey) {
    return slot ? runtime.deps.game.equipment[slot] : visibleItems.find((row) => runtime.deps.equipmentInventoryGridRuntime.getItemKey(row) === focusedKey);
  }
  function equipmentPresetProtected(runtime, item) {
    return typeof runtime.deps.equipmentLoadoutRuntime !== "undefined" && runtime.deps.equipmentLoadoutRuntime.isReferenced(item);
  }
  function gridItemStatus(item, presetProtected) {
    return item.locked ? "잠금" : presetProtected ? "장비 세팅에 포함" : "";
  }

  // modules/ui/map-unlock-notice.mjs
  function triggerMapUnlockReveal(runtime, zoneId) {
    if (!Number.isFinite(zoneId) || zoneId < 0) return;
    runtime.deps.pendingMapRevealZoneId = zoneId;
    runtime.deps.pendingMapRevealToken += 1;
    let token = runtime.deps.pendingMapRevealToken;
    (0, runtime.deps.setTimeout)(() => {
      if (runtime.deps.pendingMapRevealToken !== token) return;
      runtime.deps.pendingMapRevealZoneId = null;
      (0, runtime.deps.updateStaticUI)();
    }, 1200);
  }

  // modules/ui/passive-canvas-view.mjs
  function createPassiveCanvasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, art: null };
    const handlers = { ensurePassiveTreeOverlay, updatePassiveTreeOverlayTransform, spawnPassiveRevealBurstOverlay, getHoverAllocationNodeIds, getPassiveNodeLook, drawPassiveTree, handleEquipmentSlotDoubleClick, getDropOnlyItemSourceMeta, getPaperdollSlots, renderPaperdoll, renderEquipmentInventoryGrid, renderEquipmentInventoryInspector, triggerMapUnlockReveal, show, drawn, screenRect };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(void 0, runtime);
    runtime.handlers.syncPassiveTreeOverlay = createOverlaySync(runtime);
    runtime.handlers.renderEquipmentGridItem = createEquipmentGridItemRenderer(runtime);
    runtime.handlers.getPassiveHoverLinkLayer = getPassiveHoverLinkLayer;
    initialize2(runtime);
    runtime.art = createPassiveTreeArt(deps);
    runtime.api = { ensurePassiveTreeOverlay: runtime.handlers.ensurePassiveTreeOverlay, updatePassiveTreeOverlayTransform: runtime.handlers.updatePassiveTreeOverlayTransform, syncPassiveTreeOverlay: runtime.handlers.syncPassiveTreeOverlay, spawnPassiveRevealBurstOverlay: runtime.handlers.spawnPassiveRevealBurstOverlay, getHoverAllocationNodeIds: runtime.handlers.getHoverAllocationNodeIds, getPassiveHoverLinkLayer: runtime.handlers.getPassiveHoverLinkLayer, getPassiveNodeLook: runtime.handlers.getPassiveNodeLook, drawPassiveTree: runtime.handlers.drawPassiveTree, handleEquipmentSlotDoubleClick: runtime.handlers.handleEquipmentSlotDoubleClick, getDropOnlyItemSourceMeta: runtime.handlers.getDropOnlyItemSourceMeta, getPaperdollSlots: runtime.handlers.getPaperdollSlots, renderPaperdoll: runtime.handlers.renderPaperdoll, renderEquipmentGridItem: runtime.handlers.renderEquipmentGridItem, renderEquipmentInventoryGrid: runtime.handlers.renderEquipmentInventoryGrid, renderEquipmentInventoryInspector: runtime.handlers.renderEquipmentInventoryInspector, triggerMapUnlockReveal: runtime.handlers.triggerMapUnlockReveal, passiveTreeGuide: Object.freeze({ show: runtime.handlers.show, drawn: runtime.handlers.drawn, screenRect: runtime.handlers.screenRect }) };
    return runtime.api;
  }
  function initialize2(runtime) {
    runtime.state.passiveEffectLabelRects = [];
    runtime.state.PASSIVE_VOID_RANGES = Object.freeze([["andromeda", "#79cbbd"], ["asteroidBelt", "#dfbf79"]]);
    runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM = 0.62;
    runtime.state.PASSIVE_NODE_LAYER_MAX_ZOOM = 0.34;
    runtime.state.PASSIVE_NODE_LAYER_MAX_PX = 2600;
    runtime.state.passiveNodeLayer = { key: "", canvas: null, extras: [], boundsFor: null, bounds: null };
    runtime.state.RING_PX = 30;
    runtime.state.active = false;
    runtime.state.cache = { key: "", nodes: [] };
    runtime.state.onDrawn = null;
  }

  // modules/canvas-passive-tree-classic.mjs
  var passiveCanvasView = createPassiveCanvasView({
    get passiveNodePresentation() {
      return window.GameModules.passiveScene.nodes;
    },
    get game() {
      return window.GameModules.state.game;
    },
    get reachableNodes() {
      return reachableNodes;
    },
    get getPassiveActivationPath() {
      return getPassiveActivationPath;
    },
    get PASSIVE_TREE() {
      return PASSIVE_TREE;
    },
    get document() {
      return document;
    },
    get camZoom() {
      return window.GameModules.passiveScene.state.camZoom;
    },
    get passiveCanvasMetrics() {
      return window.GameModules.passiveScene.state.passiveCanvasMetrics;
    },
    get camX() {
      return window.GameModules.passiveScene.state.camX;
    },
    get camY() {
      return window.GameModules.passiveScene.state.camY;
    },
    get getPassiveTreeRootNode() {
      return getPassiveTreeRootNode;
    },
    get passiveCameraInitialized() {
      return window.GameModules.passiveScene.state.passiveCameraInitialized;
    },
    get TRANSCENDENT_ANDROMEDA_RADIUS() {
      return TRANSCENDENT_ANDROMEDA_RADIUS;
    },
    get TRANSCENDENT_ASTEROID_RADIUS() {
      return TRANSCENDENT_ASTEROID_RADIUS;
    },
    get passiveRouting() {
      return passiveRouting;
    },
    get isCraftSelectionEquip() {
      return typeof isCraftSelectionEquip === "undefined" ? void 0 : isCraftSelectionEquip;
    },
    get getCraftSelectionRef() {
      return typeof getCraftSelectionRef === "undefined" ? void 0 : getCraftSelectionRef;
    },
    get getNodeRevealAmount() {
      return getNodeRevealAmount;
    },
    get hoverNode() {
      return window.GameModules.passiveScene.state.hoverNode;
    },
    get getPassiveVisibility() {
      return getPassiveVisibility;
    },
    get i18n() {
      return i18n;
    },
    get getStatName() {
      return getStatName;
    },
    get passiveRenderCache() {
      return window.GameModules.passiveScene.state.passiveRenderCache;
    },
    get getPassiveBlockedStartIds() {
      return getPassiveBlockedStartIds;
    },
    get getPassiveConnectionNodeIds() {
      return typeof getPassiveConnectionNodeIds === "undefined" ? void 0 : getPassiveConnectionNodeIds;
    },
    get getPassiveTreeRootNodeId() {
      return typeof getPassiveTreeRootNodeId === "undefined" ? void 0 : getPassiveTreeRootNodeId;
    },
    get getPassiveNodeSearchMatch() {
      return typeof getPassiveNodeSearchMatch === "undefined" ? void 0 : getPassiveNodeSearchMatch;
    },
    get getPassiveTreeSearchState() {
      return getPassiveTreeSearchState;
    },
    get passiveRevealBursts() {
      return window.GameModules.passiveScene.state.passiveRevealBursts;
    },
    get _t() {
      return _t;
    },
    get window() {
      return window;
    },
    get cleanupPassiveBursts() {
      return cleanupPassiveBursts;
    },
    get ensurePassiveRenderCache() {
      return ensurePassiveRenderCache;
    },
    get getPassiveWorldViewport() {
      return getPassiveWorldViewport;
    },
    get isNodeInViewport() {
      return isNodeInViewport;
    },
    get unequipItem() {
      return unequipItem;
    },
    get BASE_ITEM_DB() {
      return BASE_ITEM_DB;
    },
    get UNIQUE_DB() {
      return UNIQUE_DB;
    },
    get getSearchFilterState() {
      return typeof getSearchFilterState === "undefined" ? void 0 : getSearchFilterState;
    },
    get console() {
      return console;
    },
    get escapeHTML() {
      return escapeHTML;
    },
    get writeHtmlIfChanged() {
      return writeHtmlIfChanged;
    },
    get coreItemsUi() {
      return coreItemsUi;
    },
    get colonyWardsUi() {
      return colonyWardsUi;
    },
    get equipmentAuxUi() {
      return equipmentAuxUi;
    },
    get highlightSearchText() {
      return window.highlightSearchText;
    },
    get getItemSlotDisplayLabel() {
      return getItemSlotDisplayLabel;
    },
    get itemInfluencesUi() {
      return itemInfluencesUi;
    },
    get getEquipmentGridVisualAsset() {
      return getEquipmentGridVisualAsset;
    },
    get equipmentSocketsUi() {
      return equipmentSocketsUi;
    },
    get equipmentWindowUi() {
      return equipmentWindowUi;
    },
    get getEquipmentInventoryFootprint() {
      return getEquipmentInventoryFootprint;
    },
    get equipmentLoadoutRuntime() {
      return typeof equipmentLoadoutRuntime === "undefined" ? void 0 : equipmentLoadoutRuntime;
    },
    get equipmentInventoryGridRuntime() {
      return equipmentInventoryGridRuntime;
    },
    get equipmentInventoryInteraction() {
      return equipmentInventoryInteraction;
    },
    get ITEM_RARITY_LABELS() {
      return ITEM_RARITY_LABELS;
    },
    get bagItems() {
      return bagItems;
    },
    get contentProgression() {
      return contentProgression;
    },
    get chaosInfusionUi() {
      return chaosInfusionUi;
    },
    get gardenOilsUi() {
      return gardenOilsUi;
    },
    get equipmentInspectionUi() {
      return equipmentInspectionUi;
    },
    get pendingMapRevealZoneId() {
      return pendingMapRevealZoneId;
    },
    set pendingMapRevealZoneId(value) {
      pendingMapRevealZoneId = value;
    },
    get pendingMapRevealToken() {
      return pendingMapRevealToken;
    },
    set pendingMapRevealToken(value) {
      pendingMapRevealToken = value;
    },
    get setTimeout() {
      return windowSetTimeout;
    },
    get updateStaticUI() {
      return updateStaticUI;
    },
    get getTranscendentVoidPassiveCount() {
      return typeof getTranscendentVoidPassiveCount === "undefined" ? void 0 : getTranscendentVoidPassiveCount;
    },
    get Path2D() {
      return Path2D;
    },
    get isPassiveNodeAvailable() {
      return isPassiveNodeAvailable;
    },
    get PASSIVE_TREE_V22() {
      return PASSIVE_TREE_V22;
    },
    get getPassiveTreeViewAngle() {
      return getPassiveTreeViewAngle;
    }
  });
  var {
    ensurePassiveTreeOverlay: ensurePassiveTreeOverlay2,
    updatePassiveTreeOverlayTransform: updatePassiveTreeOverlayTransform2,
    syncPassiveTreeOverlay,
    spawnPassiveRevealBurstOverlay: spawnPassiveRevealBurstOverlay2,
    getHoverAllocationNodeIds: getHoverAllocationNodeIds2,
    getPassiveHoverLinkLayer: getPassiveHoverLinkLayer2,
    getPassiveNodeLook: getPassiveNodeLook2,
    drawPassiveTree: drawPassiveTree2,
    handleEquipmentSlotDoubleClick: handleEquipmentSlotDoubleClick2,
    getDropOnlyItemSourceMeta: getDropOnlyItemSourceMeta2,
    getPaperdollSlots: getPaperdollSlots2,
    renderPaperdoll: renderPaperdoll2,
    renderEquipmentGridItem,
    renderEquipmentInventoryGrid: renderEquipmentInventoryGrid2,
    renderEquipmentInventoryInspector: renderEquipmentInventoryInspector2,
    triggerMapUnlockReveal: triggerMapUnlockReveal2,
    passiveTreeGuide
  } = passiveCanvasView;
  safeExposeGlobals({
    ensurePassiveTreeOverlay: ensurePassiveTreeOverlay2,
    updatePassiveTreeOverlayTransform: updatePassiveTreeOverlayTransform2,
    syncPassiveTreeOverlay,
    spawnPassiveRevealBurstOverlay: spawnPassiveRevealBurstOverlay2,
    getHoverAllocationNodeIds: getHoverAllocationNodeIds2,
    getPassiveHoverLinkLayer: getPassiveHoverLinkLayer2,
    getPassiveNodeLook: getPassiveNodeLook2,
    drawPassiveTree: drawPassiveTree2,
    handleEquipmentSlotDoubleClick: handleEquipmentSlotDoubleClick2,
    getDropOnlyItemSourceMeta: getDropOnlyItemSourceMeta2,
    getPaperdollSlots: getPaperdollSlots2,
    renderPaperdoll: renderPaperdoll2,
    renderEquipmentGridItem,
    renderEquipmentInventoryGrid: renderEquipmentInventoryGrid2,
    renderEquipmentInventoryInspector: renderEquipmentInventoryInspector2,
    triggerMapUnlockReveal: triggerMapUnlockReveal2,
    passiveTreeGuide
  });
})();
