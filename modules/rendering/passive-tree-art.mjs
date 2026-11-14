export function artDisc(runtime, ctx, r, fill) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, runtime.state.TAU);
    ctx.fillStyle = fill;
    ctx.fill();
}

export function artRing(runtime, ctx, r, stroke, width) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0.5, r), 0, runtime.state.TAU);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
}

export function artGlow(runtime, ctx, r, color) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    artDisc(runtime, ctx, r, gradient);
}

export function artWood(runtime, ctx, r, tone) {
    const gradient = ctx.createLinearGradient(0, -r, 0, r);
    gradient.addColorStop(0, tone[0]);
    gradient.addColorStop(1, tone[1]);
    return gradient;
}

/** The notable frame's shape: a flat-topped octagon. */
export function artOctagon(runtime, ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
        const angle = Math.PI / 8 + i * runtime.state.TAU / 8;
        if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
        else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    ctx.closePath();
}

/** Leaves pointing outward from a circle of radius r (the class start's crown). */
export function artLeaves(runtime, ctx, r, { count, start, length, color }) {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < count; i++) {
        const t = start + i * runtime.state.TAU / count, cx = Math.cos(t) * (r + length * 0.6), cy = Math.sin(t) * (r + length * 0.6);
        ctx.moveTo(cx + Math.cos(t) * length, cy + Math.sin(t) * length);
        ctx.ellipse(cx, cy, length, length * 0.42, t, 0, runtime.state.TAU);
    }
    ctx.fill();
}

/** Four short points on a ring (the keystone seal at a few pixels). */
export function artPoints(runtime, ctx, r, length, color) {
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

export function imageId(runtime, image) {
    if (!runtime.state.imageIds.has(image)) runtime.state.imageIds.set(image, runtime.state.nextImageId++);
    return runtime.state.imageIds.get(image);
}

/** The picture with a state's shading baked in, painted once per image and state: kept colour and brightness, or a brass tint
* that keeps the wood's light and shade. */
export function shadedImage(runtime, image, [keep, bright], brass) {
    const key = `${imageId(runtime, image)}|${keep}|${bright}|${brass || ''}`;
    if (runtime.state.shadedImages.has(key)) return runtime.state.shadedImages.get(key);
    const canvas = runtime.deps.document.createElement('canvas'), g = canvas.getContext('2d');
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

/** What a node shows inside its frame: its custom picture, an atlas cell, or the vector glyph of its family. */
export function nodeIcon(runtime, node) {
    const cached = runtime.state.nodeIcons.get(node);
    if (cached) return cached;
    const icon = findNodeIcon(runtime, node);
    if (icon.image) runtime.state.nodeIcons.set(node, icon);
    return icon;
}

export function findNodeIcon(runtime, node) {
    const custom = (0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)(`passiveTreeCustom_${node.id}`);
    if (custom) return { key: `i${imageId(runtime, custom)}`, image: custom, cell: null, sample: node };
    const atlas = (0, runtime.deps.passiveNodePresentation.getPassiveNodeAtlasArt)(node);
    if (atlas) return { key: `a${imageId(runtime, atlas.image)}:${atlas.cell.join(',')}`, image: atlas.image, cell: atlas.cell,
        columns: atlas.columns, rows: atlas.rows, sample: node };
    return { key: `v${(0, runtime.deps.passiveNodePresentation.getPassiveNodeIconFamily)(node)}`, image: null, sample: node };
}

/** Pixel art keeps hard pixels when drawn at or above its own size and is smoothed when drawn smaller. */
export function blit(runtime, ctx, image, source, target) {
    ctx.imageSmoothingEnabled = target[2] * ctx.getTransform().a < source[2];
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, ...source, ...target);
}

export function paintIcon(runtime, ctx, look, size) {
    const icon = look.icon;
    if (!icon.image) return (0, runtime.deps.passiveNodePresentation.drawPassiveNodeIcon)(ctx, icon.sample, size * 0.62, runtime.state.TONE[look.state].ring);
    const image = shadedImage(runtime, icon.image, runtime.state.SHADE[look.state].icon, null);
    if (!icon.cell) return blit(runtime, ctx, image, [0, 0, image.width, image.height], [-size / 2, -size / 2, size, size]);
    const w = image.width / icon.columns, h = image.height / icon.rows;
    return blit(runtime, ctx, image, [icon.cell[0] * w, icon.cell[1] * h, w, h], [-size / 2, -size / 2, size, size]);
}

export function paintFrame(runtime, ctx, look, size) {
    const sheet = (0, runtime.deps.passiveNodePresentation.getPassiveTreeArtImage)('passiveTreeFrames'), rect = runtime.deps.passiveNodePresentation.frameSheet[look.shape];
    if (!sheet || !rect) return artRing(runtime, ctx, size * 0.44, runtime.state.TONE[look.state].ring, size * 0.08);
    const shade = runtime.state.SHADE[look.state], image = shadedImage(runtime, sheet, shade.frame, shade.brass);
    return blit(runtime, ctx, image, [rect[0], 0, rect[1], rect[1]], [-size / 2, -size / 2, size, size]);
}

/** A few pixels across (whole-tree view) the frame picture would blur away, so the shape is painted thick in the frame's colours. */
export function paintTiny(runtime, ctx, look) {
    const r = look.radius, tone = runtime.state.TONE[look.state];
    if (tone.glow) artGlow(runtime, ctx, r * 1.9, tone.glow);
    if (look.shape === 'notable') artOctagon(runtime, ctx, r);
    else { ctx.beginPath(); ctx.arc(0, 0, r, 0, runtime.state.TAU); }
    ctx.fillStyle = look.shape === 'void' ? '#1a1424' : look.state === 'active' ? '#a87532' : tone.fill;
    ctx.fill();
    ctx.lineWidth = r * 0.36;
    ctx.strokeStyle = look.shape === 'void' ? '#6f6488' : tone.ring;
    ctx.stroke();
    if (look.shape === 'keystone') artPoints(runtime, ctx, r * 1.05, r * 0.42, tone.ring);
}

/** A framed node: glow when taken, the dark socket, the icon, then Codex's frame on top. */
export function paintFramed(runtime, ctx, look) {
    const r = look.radius, fit = runtime.state.FRAME_FIT[look.shape], size = r * 2 * fit.size, tone = runtime.state.TONE[look.state];
    if (look.tiny) return paintTiny(runtime, ctx, look);
    if (look.shape === 'void') artGlow(runtime, ctx, r * 1.75, look.state === 'active' ? 'rgba(170,120,255,0.42)' : 'rgba(120,92,180,0.24)');
    else if (tone.glow) artGlow(runtime, ctx, r * 1.85, tone.glow);
    artDisc(runtime, ctx, size / 2 * fit.socket, look.shape === 'void' ? '#0d0a12' : tone.fill);
    paintIcon(runtime, ctx, look, size * fit.icon);
    paintFrame(runtime, ctx, look, size);
    if (look.state === 'reach') artRing(runtime, ctx, size * 0.6, 'rgba(236,226,206,0.5)', r * 0.07);
}

export function paintStart(runtime, ctx, look) {
    const r = look.radius, tone = runtime.state.TONE[look.state];
    if (tone.glow) artGlow(runtime, ctx, r * 1.7, tone.glow);
    artDisc(runtime, ctx, r, '#100d0a');
    paintIcon(runtime, ctx, look, r * 1.24);
    artRing(runtime, ctx, r, '#070504', r * 0.16);
    artRing(runtime, ctx, r, artWood(runtime, ctx, r, tone.wood), r * 0.09);
    artRing(runtime, ctx, r * 1.2, tone.wood[1], r * 0.045);
    artLeaves(runtime, ctx, r * 1.2, { count: 6, start: -Math.PI / 2, length: r * 0.16, color: tone.wood[0] });
}

export function shapeOf(runtime, node) {
    if (node.kind === 'start' || node.kind === 'keystone' || node.kind === 'void') return node.kind;
    if ((0, runtime.deps.passiveNodePresentation.isPassiveFramedNode)(node)) return 'notable';
    return (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node) >= 12 ? 'medium' : 'small';
}

export function stateIndex(runtime, node, look, frame) {
    if (look.active || (node.kind === 'start' && node.id === frame.rootId)) return 2;
    return look.reachable ? 1 : 0;
}

export function infoOf(runtime, node) {
    let info = runtime.state.nodeInfo.get(node);
    if (info && info.generation === runtime.state.spriteGeneration && (info.icon.image || !nodeIcon(runtime, node).image)) return info;
    info = { shape: shapeOf(runtime, node), radius: (0, runtime.deps.passiveNodePresentation.getPassiveNodeVisualRadius)(node), icon: nodeIcon(runtime, node), sprites: [], generation: runtime.state.spriteGeneration };
    runtime.state.nodeInfo.set(node, info);
    return info;
}

export function sizing(runtime, info, dpr) {
    if (runtime.state.bucketCache.zoom !== runtime.deps.camZoom || runtime.state.bucketCache.dpr !== dpr) runtime.state.bucketCache = { zoom: runtime.deps.camZoom, dpr, byLook: new Map() };
    const key = `${info.shape}:${info.radius}`;
    if (!runtime.state.bucketCache.byLook.has(key)) {
        const radius = Math.max(info.radius, runtime.state.MIN_SCREEN_RADIUS[info.shape] / runtime.deps.camZoom);
        const index = runtime.state.SPRITE_RADII.findIndex(size => size >= radius * runtime.deps.camZoom * dpr);
        runtime.state.bucketCache.byLook.set(key, { radius, bucket: index < 0 ? runtime.state.SPRITE_RADII.length - 1 : index });
    }
    return runtime.state.bucketCache.byLook.get(key);
}

export function sharedSprite(runtime, info, state, bucket) {
    const key = `${info.shape}|${runtime.state.STATES[state]}|${info.icon.key}|${bucket}`;
    if (!runtime.state.sprites.has(key) && runtime.state.sprites.size >= runtime.state.SPRITE_LIMIT) {
        runtime.state.sprites.clear();
        runtime.state.spriteGeneration += 1;
    }
    if (!runtime.state.sprites.has(key)) runtime.state.sprites.set(key, paintSprite(runtime, { shape: info.shape, state: runtime.state.STATES[state], icon: info.icon, radius: info.radius }, runtime.state.SPRITE_RADII[bucket]));
    return runtime.state.sprites.get(key);
}

export function paintSprite(runtime, look, bucket) {
    const size = Math.ceil(bucket * 2 * runtime.state.SPRITE_MARGIN) + 2, canvas = runtime.deps.document.createElement('canvas'), ctx = canvas.getContext('2d');
    canvas.width = canvas.height = size;
    ctx.translate(size / 2, size / 2);
    ctx.scale(bucket / look.radius, bucket / look.radius);
    runtime.state.PAINTERS[look.shape](ctx, { ...look, tiny: bucket <= 6 });
    return canvas;
}

/** Capture the renderer once, without allocating an options object for every node. */
export function createNodePainter(runtime) {
    return function drawNode(ctx, node, look, frame, dpr) {
        const info = infoOf(runtime, node), { radius, bucket } = sizing(runtime, info, dpr), slot = stateIndex(runtime, node, look, frame) * runtime.state.SPRITE_RADII.length + bucket;
        const sprite = info.sprites[slot] || (info.sprites[slot] = sharedSprite(runtime, info, Math.floor(slot / runtime.state.SPRITE_RADII.length), bucket));
        const width = sprite.width * radius / runtime.state.SPRITE_RADII[bucket];
        if (ctx.globalAlpha !== look.alpha) ctx.globalAlpha = look.alpha;
        ctx.drawImage(sprite, node.x - width / 2, node.y - width / 2, width, width);
    };
}

export function baseLayerOf(runtime, edge, frame) {
    if (frame.isActive(edge.a.id) && frame.isActive(edge.b.id)) return 'active';
    return runtime.deps.reachableNodes.has(edge.a.id) || runtime.deps.reachableNodes.has(edge.b.id) ? 'reach' : 'idle';
}

export function baseLayers(runtime, frame) {
    if (runtime.state.linkCache.nodes === runtime.deps.passiveRenderCache.nodes && runtime.state.linkCache.signature === runtime.deps.passiveRenderCache.stateSignature && runtime.state.linkCache.layers) return runtime.state.linkCache.layers;
    const layers = { idle: new runtime.deps.Path2D(), reach: new runtime.deps.Path2D(), active: new runtime.deps.Path2D() };
    runtime.deps.passiveRenderCache.activeEdges.forEach(edge => {
        if ((0, runtime.deps.isPassiveNodeAvailable)(edge.a) && (0, runtime.deps.isPassiveNodeAvailable)(edge.b)) (0, runtime.deps.passiveNodePresentation.tracePassiveLinkSegment)(layers[baseLayerOf(runtime, edge, frame)], edge.a, edge.b);
    });
    runtime.state.linkCache = { nodes: runtime.deps.passiveRenderCache.nodes, signature: runtime.deps.passiveRenderCache.stateSignature, layers };
    return layers;
}

export function hoverLayers(runtime, frame) {
    if (!frame.hoverId) return null;
    const layers = { chain: new runtime.deps.Path2D(), path: new runtime.deps.Path2D(), hover: new runtime.deps.Path2D() };
    runtime.deps.passiveRenderCache.activeEdges.forEach(edge => {
        const layer = getPassiveHoverLinkLayer(edge.a, edge.b, frame);
        if (layer) (0, runtime.deps.passiveNodePresentation.tracePassiveLinkSegment)(layers[layer], edge.a, edge.b);
    });
    return layers;
}

/** A frame's hover/path styling is shared by the painter and existing callers. */
export function getPassiveHoverLinkLayer(a, b, frame) {
    if (a.id === frame.hoverId || b.id === frame.hoverId) return 'hover';
    if (frame.pathIds.has(a.id) && frame.pathIds.has(b.id)) return 'path';
    if (frame.linkedIds.has(a.id) && frame.linkedIds.has(b.id)) return 'chain';
    return null;
}

export function strokeLayer(runtime, ctx, path, styles) {
    styles.forEach(([color, px, minWorld, dash]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = linkWidth(runtime, px, minWorld);
        ctx.setLineDash(dash ? [dash / runtime.deps.camZoom, dash * 0.7 / runtime.deps.camZoom] : []);
        ctx.stroke(path);
    });
}

export function drawLinks(runtime, ctx, frame) {
    const base = baseLayers(runtime, frame), hover = hoverLayers(runtime, frame);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ['idle', 'reach', 'active'].forEach(key => strokeLayer(runtime, ctx, base[key], runtime.state.LINK_STYLES[key]));
    if (hover) ['chain', 'path', 'hover'].forEach(key => strokeLayer(runtime, ctx, hover[key], runtime.state.LINK_STYLES[key]));
    ctx.setLineDash([]);
    ctx.restore();
}

export function motifPaths(runtime) {
    if (runtime.state.motifDrawings) return runtime.state.motifDrawings;
    const motifs = runtime.deps.PASSIVE_TREE_V22.backgrounds ? runtime.deps.PASSIVE_TREE_V22.backgrounds.motifs : {};
    runtime.state.motifDrawings = Object.fromEntries(Object.entries(motifs).map(([id, motif]) => [id, { color: motif.color,
            shapes: motif.shapes.map(shape => ({ ...shape, path: new runtime.deps.Path2D(shape.d) })) }]));
    return runtime.state.motifDrawings;
}

export function drawMotifShape(runtime, ctx, shape, alpha, minWidth) {
    ctx.save();
    if (shape.m) ctx.transform(...shape.m);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(shape.strokeWidth || 1.25, minWidth);
    ctx.stroke(shape.path);
    if (shape.solid) {
        ctx.globalAlpha = alpha * (shape.fillOpacity === undefined ? 0.07 : shape.fillOpacity);
        ctx.fill(shape.path, shape.fillRule || 'nonzero');
    }
    ctx.restore();
}

/** World coordinates, before the links: only the motifs that reach the view. They turn with the nodes (syncPassiveTreeView). */
export function drawMotifs(runtime, ctx, view) {
    const items = runtime.deps.PASSIVE_TREE_V22.backgrounds ? runtime.deps.PASSIVE_TREE_V22.backgrounds.items : [];
    const drawings = items.length ? motifPaths(runtime) : null;
    const angle = (0, runtime.deps.getPassiveTreeViewAngle)(), cos = Math.cos(angle), sin = Math.sin(angle);
    items.map(item => ({ item, x: item.x * cos - item.y * sin, y: item.x * sin + item.y * cos })).filter(place => !motifOutside(runtime, place, view)).forEach(({ item, x, y }) => {
        const motif = drawings[item.motif];
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(item.rotation * Math.PI / 180 + angle);
        ctx.scale(item.size / 200, item.size / 200);
        ctx.strokeStyle = ctx.fillStyle = motif.color;
        ctx.lineJoin = 'miter';
        ctx.miterLimit = 3;
        // Zoomed out, lines stay one device pixel wide instead of fading away.
        const transform = ctx.getTransform(), minWidth = 1 / Math.hypot(transform.a, transform.b);
        motif.shapes.forEach(shape => drawMotifShape(runtime, ctx, shape, item.opacity * runtime.state.MOTIF_ALPHA, minWidth));
        ctx.restore();
    });
}

export function backdropGrain(runtime, ctx) {
    if (runtime.state.grainPattern) return runtime.state.grainPattern;
    const tile = runtime.deps.document.createElement('canvas'), g = tile.getContext('2d');
    tile.width = tile.height = 256;
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 1500; i++) {
        g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,.009)' : 'rgba(0,0,0,.06)';
        g.fillRect(Math.floor(rand() * 128) * 2, Math.floor(rand() * 128) * 2, 2, 2);
    }
    runtime.state.grainPattern = ctx.createPattern(tile, 'repeat');
    return runtime.state.grainPattern;
}

/** Screen-space backdrop: the eclipse around the tree centre, moving with the camera. */
export function drawBackdrop(runtime, ctx, width, height) {
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

/** Screen width that thins a little when the whole tree is in view, never under minWorld world units. */
export function linkWidth(runtime, px, minWorld) { return Math.max(minWorld * Math.min(1, runtime.deps.camZoom / 0.35), px * Math.min(1, Math.max(0.55, runtime.deps.camZoom / 0.6)) / runtime.deps.camZoom); }

export function motifOutside(runtime, { item, x, y }, view) {
    const reach = item.size * 0.75;
    return x + reach < view.minX || x - reach > view.maxX || y + reach < view.minY || y - reach > view.maxY;
}
