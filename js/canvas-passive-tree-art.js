'use strict';

// Skill tree pictures (2026-10-28, v23 rework). Each node look is painted once per on-screen size into a small canvas and reused, so the
// whole tree draws in full at every zoom (the far-zoom dot mode is gone). Links are one cached path per layer, rebuilt when allocations
// change; links inside a ring around a notable bend along the ring. Frames and icons are Codex's pixel art (assets/ui/passive-tree-*,
// scripts/build-passive-tree-art.js): grey-white antique wood rings (small, medium), an octagon (notable), a four-pointed seal
// (keystone) and a black flame ring (void). A locked node shows dark wood and a dimmed icon, a node you can take shows the bare wood,
// a taken node turns brass. Class starts stay a painted medallion in the same woods.

const passiveTreeArt = (() => {
    const TAU = Math.PI * 2;
    /** Ring, fill and glow per state for painted parts (starts, a few-pixel nodes) and the socket under every icon. */
    const TONE = Object.freeze({
        idle: { ring: '#81786b', wood: ['#8c8274', '#4c463e'], fill: '#14110e', glow: null },
        reach: { ring: '#d6ccba', wood: ['#efe6d4', '#9c907c'], fill: '#1c1713', glow: null },
        active: { ring: '#e8b462', wood: ['#ffe2a6', '#b8822e'], fill: '#291c0e', glow: 'rgba(255,184,92,0.36)' }
    });
    /** Per state: how much colour an icon or frame keeps, its brightness, and a brass tint for taken frames (null keeps the wood). */
    const SHADE = Object.freeze({
        idle: { icon: [0.55, 0.8], frame: [0.7, 0.58], brass: null },
        reach: { icon: [0.88, 0.94], frame: [1, 1], brass: null },
        active: { icon: [1, 1.04], frame: [1, 1], brass: [234, 176, 92] }
    });
    /** Frame picture size against the node's diameter, the icon's share of it, and the socket radius against half of it. */
    const FRAME_FIT = Object.freeze({
        small: { size: 1.14, icon: 0.58, socket: 0.82 }, medium: { size: 1.12, icon: 0.6, socket: 0.76 },
        notable: { size: 1.2, icon: 0.57, socket: 0.64 }, keystone: { size: 1.24, icon: 0.56, socket: 0.62 },
        void: { size: 1.3, icon: 0.42, socket: 0.4 }
    });
    /** Node radius in device pixels a sprite is painted at; a node uses the first size at or above its own. */
    const SPRITE_RADII = Object.freeze([2, 3, 4, 6, 8, 11, 15, 21, 29, 40, 56, 78]);
    const SPRITE_MARGIN = 1.9;
    const sprites = new Map(), shadedImages = new Map(), imageIds = new WeakMap(), nodeIcons = new WeakMap(), nodeInfo = new WeakMap();
    /** Sprites kept before the cache starts over (a long session of zooming must not grow memory without bound). */
    const SPRITE_LIMIT = 1200;
    let nextImageId = 1, linkCache = { nodes: null, signature: null, layers: null };

    // ── painting primitives (world units, centred on the node) ─────────────────────────────────────────────────────────────────
    function artDisc(ctx, r, fill) {
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fillStyle = fill;
        ctx.fill();
    }
    function artRing(ctx, r, stroke, width) {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, r), 0, TAU);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();
    }
    function artGlow(ctx, r, color) {
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        artDisc(ctx, r, gradient);
    }
    function artWood(ctx, r, tone) {
        const gradient = ctx.createLinearGradient(0, -r, 0, r);
        gradient.addColorStop(0, tone[0]);
        gradient.addColorStop(1, tone[1]);
        return gradient;
    }
    /** The notable frame's shape: a flat-topped octagon. */
    function artOctagon(ctx, r) {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI / 8 + i * TAU / 8;
            if (i === 0) ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
            else ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        ctx.closePath();
    }
    /** Leaves pointing outward from a circle of radius r (the class start's crown). */
    function artLeaves(ctx, r, { count, start, length, color }) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
            const t = start + i * TAU / count, cx = Math.cos(t) * (r + length * 0.6), cy = Math.sin(t) * (r + length * 0.6);
            ctx.moveTo(cx + Math.cos(t) * length, cy + Math.sin(t) * length);
            ctx.ellipse(cx, cy, length, length * 0.42, t, 0, TAU);
        }
        ctx.fill();
    }
    /** Four short points on a ring (the keystone seal at a few pixels). */
    function artPoints(ctx, r, length, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const t = i * TAU / 4 - Math.PI / 2, half = 0.32;
            ctx.moveTo(Math.cos(t - half) * r, Math.sin(t - half) * r);
            ctx.lineTo(Math.cos(t) * (r + length), Math.sin(t) * (r + length));
            ctx.lineTo(Math.cos(t + half) * r, Math.sin(t + half) * r);
            ctx.closePath();
        }
        ctx.fill();
    }

    // ── pictures ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    function imageId(image) {
        if (!imageIds.has(image)) imageIds.set(image, nextImageId++);
        return imageIds.get(image);
    }
    /** The picture with a state's shading baked in, painted once per image and state: kept colour and brightness, or a brass tint
     * that keeps the wood's light and shade. */
    function shadedImage(image, [keep, bright], brass) {
        const key = `${imageId(image)}|${keep}|${bright}|${brass || ''}`;
        if (shadedImages.has(key)) return shadedImages.get(key);
        const canvas = document.createElement('canvas'), g = canvas.getContext('2d');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        g.drawImage(image, 0, 0);
        const data = g.getImageData(0, 0, canvas.width, canvas.height), px = data.data;
        for (let i = 0; i < px.length; i += 4) {
            const light = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
            for (let c = 0; c < 3; c++) px[i + c] = brass ? Math.min(255, light * brass[c] / 255 * 1.3) : (px[i + c] * keep + light * (1 - keep)) * bright;
        }
        g.putImageData(data, 0, 0);
        shadedImages.set(key, canvas);
        return canvas;
    }
    /** What a node shows inside its frame: its custom picture, an atlas cell, or the vector glyph of its family. */
    function nodeIcon(node) {
        const cached = nodeIcons.get(node);
        if (cached) return cached;
        const icon = findNodeIcon(node);
        if (icon.image) nodeIcons.set(node, icon);
        return icon;
    }
    function findNodeIcon(node) {
        const custom = getPassiveTreeArtImage(`passiveTreeCustom_${node.id}`);
        if (custom) return { key: `i${imageId(custom)}`, image: custom, cell: null, sample: node };
        const atlas = getPassiveNodeAtlasArt(node);
        if (atlas) return { key: `a${imageId(atlas.image)}:${atlas.cell.join(',')}`, image: atlas.image, cell: atlas.cell,
            columns: atlas.columns, rows: atlas.rows, sample: node };
        return { key: `v${getPassiveNodeIconFamily(node)}`, image: null, sample: node };
    }
    /** Pixel art keeps hard pixels when drawn at or above its own size and is smoothed when drawn smaller. */
    function blit(ctx, image, source, target) {
        ctx.imageSmoothingEnabled = target[2] * ctx.getTransform().a < source[2];
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, ...source, ...target);
    }
    function paintIcon(ctx, look, size) {
        const icon = look.icon;
        if (!icon.image) return drawPassiveNodeIcon(ctx, icon.sample, size * 0.62, TONE[look.state].ring);
        const image = shadedImage(icon.image, SHADE[look.state].icon, null);
        if (!icon.cell) return blit(ctx, image, [0, 0, image.width, image.height], [-size / 2, -size / 2, size, size]);
        const w = image.width / icon.columns, h = image.height / icon.rows;
        return blit(ctx, image, [icon.cell[0] * w, icon.cell[1] * h, w, h], [-size / 2, -size / 2, size, size]);
    }
    function paintFrame(ctx, look, size) {
        const sheet = getPassiveTreeArtImage('passiveTreeFrames'), rect = PASSIVE_TREE_FRAME_SHEET[look.shape];
        if (!sheet || !rect) return artRing(ctx, size * 0.44, TONE[look.state].ring, size * 0.08);
        const shade = SHADE[look.state], image = shadedImage(sheet, shade.frame, shade.brass);
        return blit(ctx, image, [rect[0], 0, rect[1], rect[1]], [-size / 2, -size / 2, size, size]);
    }

    // ── node looks ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    /** A few pixels across (whole-tree view) the frame picture would blur away, so the shape is painted thick in the frame's colours. */
    function paintTiny(ctx, look) {
        const r = look.radius, tone = TONE[look.state];
        if (tone.glow) artGlow(ctx, r * 1.9, tone.glow);
        if (look.shape === 'notable') artOctagon(ctx, r);
        else { ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); }
        ctx.fillStyle = look.shape === 'void' ? '#1a1424' : look.state === 'active' ? '#a87532' : tone.fill;
        ctx.fill();
        ctx.lineWidth = r * 0.36;
        ctx.strokeStyle = look.shape === 'void' ? '#6f6488' : tone.ring;
        ctx.stroke();
        if (look.shape === 'keystone') artPoints(ctx, r * 1.05, r * 0.42, tone.ring);
    }
    /** A framed node: glow when taken, the dark socket, the icon, then Codex's frame on top. */
    function paintFramed(ctx, look) {
        const r = look.radius, fit = FRAME_FIT[look.shape], size = r * 2 * fit.size, tone = TONE[look.state];
        if (look.tiny) return paintTiny(ctx, look);
        if (look.shape === 'void') artGlow(ctx, r * 1.75, look.state === 'active' ? 'rgba(170,120,255,0.42)' : 'rgba(120,92,180,0.24)');
        else if (tone.glow) artGlow(ctx, r * 1.85, tone.glow);
        artDisc(ctx, size / 2 * fit.socket, look.shape === 'void' ? '#0d0a12' : tone.fill);
        paintIcon(ctx, look, size * fit.icon);
        paintFrame(ctx, look, size);
        if (look.state === 'reach') artRing(ctx, size * 0.6, 'rgba(236,226,206,0.5)', r * 0.07);
    }
    function paintStart(ctx, look) {
        const r = look.radius, tone = TONE[look.state];
        if (tone.glow) artGlow(ctx, r * 1.7, tone.glow);
        artDisc(ctx, r, '#100d0a');
        paintIcon(ctx, look, r * 1.24);
        artRing(ctx, r, '#070504', r * 0.16);
        artRing(ctx, r, artWood(ctx, r, tone.wood), r * 0.09);
        artRing(ctx, r * 1.2, tone.wood[1], r * 0.045);
        artLeaves(ctx, r * 1.2, { count: 6, start: -Math.PI / 2, length: r * 0.16, color: tone.wood[0] });
    }
    const PAINTERS = Object.freeze({ small: paintFramed, medium: paintFramed, notable: paintFramed, keystone: paintFramed, void: paintFramed, start: paintStart });

    function shapeOf(node) {
        if (node.kind === 'start' || node.kind === 'keystone' || node.kind === 'void') return node.kind;
        if (isPassiveFramedNode(node)) return 'notable';
        return getPassiveNodeVisualRadius(node) >= 12 ? 'medium' : 'small';
    }
    const STATES = Object.freeze(['idle', 'reach', 'active']);
    function stateIndex(node, look, frame) {
        if (look.active || (node.kind === 'start' && node.id === frame.rootId)) return 2;
        return look.reachable ? 1 : 0;
    }
    /** What never changes per node (shape, radius, icon) and the sprites it has used, one slot per state and size. */
    let spriteGeneration = 0;
    function infoOf(node) {
        let info = nodeInfo.get(node);
        if (info && info.generation === spriteGeneration && (info.icon.image || !nodeIcon(node).image)) return info;
        info = { shape: shapeOf(node), radius: getPassiveNodeVisualRadius(node), icon: nodeIcon(node), sprites: [], generation: spriteGeneration };
        nodeInfo.set(node, info);
        return info;
    }
    /** Smallest on-screen radius (CSS px) per look, so a whole-tree view still shows every node as its own small picture. */
    const MIN_SCREEN_RADIUS = Object.freeze({ small: 1.8, medium: 2.4, notable: 3.4, keystone: 4.2, void: 3.6, start: 6.5 });
    /** Drawn radius (tree units) and sprite size for a look at the current zoom, cached per zoom. */
    let bucketCache = { zoom: 0, dpr: 0, byLook: new Map() };
    function sizing(info, dpr) {
        if (bucketCache.zoom !== camZoom || bucketCache.dpr !== dpr) bucketCache = { zoom: camZoom, dpr, byLook: new Map() };
        const key = `${info.shape}:${info.radius}`;
        if (!bucketCache.byLook.has(key)) {
            const radius = Math.max(info.radius, MIN_SCREEN_RADIUS[info.shape] / camZoom);
            const index = SPRITE_RADII.findIndex(size => size >= radius * camZoom * dpr);
            bucketCache.byLook.set(key, { radius, bucket: index < 0 ? SPRITE_RADII.length - 1 : index });
        }
        return bucketCache.byLook.get(key);
    }
    function sharedSprite(info, state, bucket) {
        const key = `${info.shape}|${STATES[state]}|${info.icon.key}|${bucket}`;
        if (!sprites.has(key) && sprites.size >= SPRITE_LIMIT) {
            sprites.clear();
            spriteGeneration += 1;
        }
        if (!sprites.has(key)) sprites.set(key, paintSprite({ shape: info.shape, state: STATES[state], icon: info.icon, radius: info.radius }, SPRITE_RADII[bucket]));
        return sprites.get(key);
    }
    function paintSprite(look, bucket) {
        const size = Math.ceil(bucket * 2 * SPRITE_MARGIN) + 2, canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        canvas.width = canvas.height = size;
        ctx.translate(size / 2, size / 2);
        ctx.scale(bucket / look.radius, bucket / look.radius);
        PAINTERS[look.shape](ctx, { ...look, tiny: bucket <= 6 });
        return canvas;
    }
    /** One node: its cached picture at the size it shows on screen. look comes from getPassiveNodeLook. */
    function drawNode(ctx, node, look, frame, dpr) {
        const info = infoOf(node), { radius, bucket } = sizing(info, dpr), slot = stateIndex(node, look, frame) * SPRITE_RADII.length + bucket;
        const sprite = info.sprites[slot] || (info.sprites[slot] = sharedSprite(info, Math.floor(slot / SPRITE_RADII.length), bucket));
        const width = sprite.width * radius / SPRITE_RADII[bucket];
        if (ctx.globalAlpha !== look.alpha) ctx.globalAlpha = look.alpha;
        ctx.drawImage(sprite, node.x - width / 2, node.y - width / 2, width, width);
    }

    // 선은 편집기에서 놓은 그대로 곧게 긋는다(2026-11-02 사용자: 곡선 보정이 선을 겹치게 했다. 280개를 휘게 해 곧으면 0곳인 교차가 14곳 생겼다).
    // ── links: ash wood grey, brass once taken ─────────────────────────────────────────────────────────────────────────────────────
    const LINK_STYLES = Object.freeze({
        idle: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#4a443c', 2.2, 2.1]],
        reach: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#b3a894', 2.2, 2.1]],
        active: [['rgba(255,176,84,0.16)', 12, 12], ['#120c06', 5, 4.8], ['#d9a24c', 2.8, 2.6], ['#ffefcc', 1, 0.9]],
        chain: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#d5cbb8', 2.2, 2.1]],
        path: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#f3e3c0', 2.4, 2.2, 8]],
        hover: [['rgba(6,5,4,0.85)', 4.6, 4.4], ['#fff7e6', 2.8, 2.6]]
    });
    /** Screen width that thins a little when the whole tree is in view, never under minWorld world units. */
    const linkWidth = (px, minWorld) => Math.max(minWorld * Math.min(1, camZoom / 0.35), px * Math.min(1, Math.max(0.55, camZoom / 0.6)) / camZoom);
    function baseLayerOf(edge, frame) {
        if (frame.isActive(edge.a.id) && frame.isActive(edge.b.id)) return 'active';
        return reachableNodes.has(edge.a.id) || reachableNodes.has(edge.b.id) ? 'reach' : 'idle';
    }
    function baseLayers(frame) {
        if (linkCache.nodes === passiveRenderCache.nodes && linkCache.signature === passiveRenderCache.stateSignature && linkCache.layers) return linkCache.layers;
        const layers = { idle: new Path2D(), reach: new Path2D(), active: new Path2D() };
        passiveRenderCache.activeEdges.forEach(edge => {
            if (isPassiveNodeAvailable(edge.a) && isPassiveNodeAvailable(edge.b)) tracePassiveLinkSegment(layers[baseLayerOf(edge, frame)], edge.a, edge.b);
        });
        linkCache = { nodes: passiveRenderCache.nodes, signature: passiveRenderCache.stateSignature, layers };
        return layers;
    }
    function hoverLayers(frame) {
        if (!frame.hoverId) return null;
        const layers = { chain: new Path2D(), path: new Path2D(), hover: new Path2D() };
        passiveRenderCache.activeEdges.forEach(edge => {
            const layer = getPassiveHoverLinkLayer(edge.a, edge.b, frame);
            if (layer) tracePassiveLinkSegment(layers[layer], edge.a, edge.b);
        });
        return layers;
    }
    function strokeLayer(ctx, path, styles) {
        styles.forEach(([color, px, minWorld, dash]) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = linkWidth(px, minWorld);
            ctx.setLineDash(dash ? [dash / camZoom, dash * 0.7 / camZoom] : []);
            ctx.stroke(path);
        });
    }
    function drawLinks(ctx, frame) {
        const base = baseLayers(frame), hover = hoverLayers(frame);
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ['idle', 'reach', 'active'].forEach(key => strokeLayer(ctx, base[key], LINK_STYLES[key]));
        if (hover) ['chain', 'path', 'hover'].forEach(key => strokeLayer(ctx, hover[key], LINK_STYLES[key]));
        ctx.setLineDash([]);
        ctx.restore();
    }

    // ── ground ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
    /** The centre, where the three transcendent voids sit: a faint violet pull, the colour of the void frames. */
    function drawGround(ctx) {
        artGlow(ctx, 620, 'rgba(92,66,132,0.17)');
    }
    // 노드 뒤 배경 문양(2026-10-28 사용자: 편집기에서 놓은 패시브 트리 설계자 문양을 게임에도). PASSIVE_TREE_V22.backgrounds는
    // scripts/lib/passive-tree-background-motifs.js가 만든다: 문양 상자 200을 size로, 선은 문양 색, solid 도형은 옅게 채운다.
    /** How strongly motifs show over the ground: behind the links, never read as nodes. */
    const MOTIF_ALPHA = 0.42;
    let motifDrawings = null;
    function motifPaths() {
        if (motifDrawings) return motifDrawings;
        const motifs = PASSIVE_TREE_V22.backgrounds ? PASSIVE_TREE_V22.backgrounds.motifs : {};
        motifDrawings = Object.fromEntries(Object.entries(motifs).map(([id, motif]) => [id, { color: motif.color,
            shapes: motif.shapes.map(shape => ({ ...shape, path: new Path2D(shape.d) })) }]));
        return motifDrawings;
    }
    function drawMotifShape(ctx, shape, alpha, minWidth) {
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
    const motifOutside = ({ item, x, y }, view) => {
        const reach = item.size * 0.75;
        return x + reach < view.minX || x - reach > view.maxX || y + reach < view.minY || y - reach > view.maxY;
    };
    /** World coordinates, before the links: only the motifs that reach the view. They turn with the nodes (syncPassiveTreeView). */
    function drawMotifs(ctx, view) {
        const items = PASSIVE_TREE_V22.backgrounds ? PASSIVE_TREE_V22.backgrounds.items : [];
        const drawings = items.length ? motifPaths() : null;
        const angle = getPassiveTreeViewAngle(), cos = Math.cos(angle), sin = Math.sin(angle);
        items.map(item => ({ item, x: item.x * cos - item.y * sin, y: item.x * sin + item.y * cos })).filter(place => !motifOutside(place, view)).forEach(({ item, x, y }) => {
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
            motif.shapes.forEach(shape => drawMotifShape(ctx, shape, item.opacity * MOTIF_ALPHA, minWidth));
            ctx.restore();
        });
    }
    /** Ink mist and specks (one 512px tile, painted once, repeated and moving with the camera). */
    let mistTile = null;
    function mist(ctx) {
        if (mistTile) return mistTile;
        const tile = document.createElement('canvas'), g = tile.getContext('2d');
        tile.width = tile.height = 512;
        let seed = 11;
        const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
        for (let i = 0; i < 70; i++) {
            const x = rand() * 512, y = rand() * 512, r = 50 + rand() * 150, alpha = (0.008 + rand() * 0.014).toFixed(3);
            [[0, 0], [512, 0], [0, 512], [512, 512], [-512, 0], [0, -512]].forEach(([dx, dy]) => {
                const gradient = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
                gradient.addColorStop(0, `rgba(176,168,152,${alpha})`);
                gradient.addColorStop(1, 'rgba(176,168,152,0)');
                g.fillStyle = gradient;
                g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
            });
        }
        for (let i = 0; i < 700; i++) {
            g.fillStyle = `rgba(214,204,186,${(rand() * 0.1 + 0.02).toFixed(3)})`;
            g.fillRect(Math.floor(rand() * 512), Math.floor(rand() * 512), rand() < 0.15 ? 2 : 1, 1);
        }
        mistTile = ctx.createPattern(tile, 'repeat');
        return mistTile;
    }
    /** Screen-space backdrop: a dark charcoal vignette around the tree centre and the ink mist moving with the camera. */
    function drawBackdrop(ctx, width, height) {
        const cx = width / 2 + camX, cy = height / 2 + camY;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(Math.hypot(width, height) * 0.75, 3800 * camZoom));
        glow.addColorStop(0, '#17140f');
        glow.addColorStop(0.55, '#0c0b09');
        glow.addColorStop(1, '#050404');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
        ctx.save();
        ctx.translate(camX % 512, camY % 512);
        ctx.fillStyle = mist(ctx);
        ctx.fillRect(-512, -512, width + 1024, height + 1024);
        ctx.restore();
    }

    return Object.freeze({ drawBackdrop, drawGround, drawMotifs, drawLinks, drawNode });
})();
safeExposeGlobals({ passiveTreeArt });
