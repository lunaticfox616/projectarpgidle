import { ZONES, WEAK_POWER } from './insights.js';
import { drawBox, drawPlacePreview, drawRegions, drawSelectedEdge, hitEdge, nodesInBox } from './canvas-layers.js';

// Sizes are the game's (js/passives.js PASSIVE_NODE_KIND_RADIUS, v23); notables are octagons and keystones a double ring as in the game.
const TYPE_STYLE = Object.freeze({
    minor: { radius: 9, fill: '#b0956a' }, assist: { radius: 9, fill: '#c4a978' },
    normal: { radius: 14, fill: '#d2b98a' }, major: { radius: 24, fill: '#e9be67' },
    keystone: { radius: 31, fill: '#c99a42' }, void: { radius: 28, fill: '#8676b4' },
    quatrefoil: { radius: 28, fill: '#d6b455' }, start: { radius: 34, fill: '#f6e7c2' }
});

const ICON_CELLS = Object.freeze({
    blade: [0, 0], projectile: [1, 0], shield: [2, 0], potion: [3, 0], strength: [4, 0],
    mystique: [0, 1], devotion: [1, 1], cycle: [2, 1], elemental: [3, 1], dexterity: [4, 1],
    chaos: [0, 2], life: [1, 2], arcane: [2, 2], summon: [3, 2], intelligence: [4, 2],
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3]
});

const STAT_FAMILY = Object.freeze({
    strength: 'strength', dexterity: 'dexterity', intelligence: 'intelligence', mystique: 'mystique',
    devotion: 'devotion', cycle: 'cycle', blockChance: 'shield', armor: 'shield', armorPct: 'shield',
    projectilePctDmg: 'projectile', projectileExtraShots: 'projectile', potionPctDmg: 'potion',
    firePctDmg: 'elemental', coldPctDmg: 'elemental', lightPctDmg: 'elemental', elementalPctDmg: 'elemental',
    chaosPctDmg: 'chaos', resChaos: 'chaos', flatHp: 'life', pctHp: 'life', regen: 'life',
    energyShield: 'arcane', energyShieldPct: 'arcane', spellPctDmg: 'arcane', summonPctDmg: 'summon',
    summonHpPct: 'summon', summonFlatDmg: 'summon', crit: 'precision', critDmg: 'precision',
    evasion: 'wind', evasionPct: 'wind', move: 'wind'
});

function nodeRadius(node) {
    return (TYPE_STYLE[node && node.type] || TYPE_STYLE.normal).radius;
}

function nodeFamily(node) {
    if (node.iconFamily && ICON_CELLS[node.iconFamily]) return node.iconFamily;
    if (node.type === 'void') return 'void';
    if (node.type === 'quatrefoil') return 'constellation';
    const primary = Array.isArray(node.runtimeEffects) && node.runtimeEffects[0];
    return STAT_FAMILY[primary && primary.statId] || STAT_FAMILY[node.archetype] || 'blade';
}

class PassiveTreeCanvas {
    constructor(canvas, callbacks) {
        this.canvas = canvas;
        this.callbacks = callbacks;
        this.ctx = canvas.getContext('2d');
        this.atlas = new Image();
        this.atlas.src = '/assets/ui/passive-tree-icons-v4.png';
        this.atlas.onload = () => this.requestDraw();
        this.customImages = new Map();
        this.tree = { nodes: [], edges: [] };
        this.nodeMap = new Map();
        this.selected = new Set();
        this.scale = 0.25;
        // 시점 회전(2026-10-28 사용자): 패시브 트리 설계자의 viewAngle과 같다. 도 단위, 화면에서 시계 방향이 +, -180부터 179.
        this.rotation = 0;
        this.rotationCos = 1;
        this.rotationSin = 0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.search = '';
        this.connectMode = false;
        this.connectFrom = null;
        this.snapEnabled = true;
        this.gridSize = 20;
        this.pointer = null;
        this.framePending = false;
        this.overlays = { zones: false, weak: false, power: new Map() };
        // 노드 뒤 배경 문양(2026-10-28): 그림(id → 색과 Path2D 도형), 보이기, 고른 배치 하나.
        this.motifs = {};
        this.backgroundsVisible = true;
        this.selectedMotif = null;
        // 구역 작업(2026-10-28): the area being worked on; the rest is dimmed and cannot be picked or dragged. null = whole tree.
        this.focus = null;
        // 함께 편집(2026-10-28): other editors' pointers and picked nodes, [{ id, name, color, cursor: {x,y}|null, selection: [ids] }].
        this.peers = [];
        // 설계자 기능(2026-10-28 사용자): 놓을 자리 미리 보기와 클릭(place), 고른 연결, 계획 영역, 분류 색(colorOf), 찍어 보기(allocation),
        // 자유 드래그(Alt를 누른 채 끌어도 같다), 포인터 아래 트리 좌표(hoverWorld).
        this.place = null;
        this.selectedEdge = null;
        this.regions = [];
        this.colorOf = null;
        this.allocation = null;
        this.freeDrag = false;
        this.hoverWorld = null;
        this.bindEvents();
        this.resize();
    }

    bindEvents() {
        this.canvas.addEventListener('pointerdown', event => this.pointerDown(event));
        this.canvas.addEventListener('pointermove', event => this.pointerMove(event));
        this.canvas.addEventListener('pointerup', () => this.pointerUp());
        this.canvas.addEventListener('pointercancel', () => this.pointerUp());
        this.canvas.addEventListener('pointerleave', () => { this.callbacks.onHover?.(null); this.callbacks.onPointer?.(null); });
        this.canvas.addEventListener('wheel', event => this.wheel(event), { passive: false });
        new ResizeObserver(() => this.resize()).observe(this.canvas);
    }

    requestDraw() {
        if (this.framePending) return;
        this.framePending = true;
        requestAnimationFrame(() => {
            this.framePending = false;
            this.draw();
        });
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const width = Math.max(1, Math.round(rect.width * dpr));
        const height = Math.max(1, Math.round(rect.height * dpr));
        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
        }
        this.requestDraw();
    }

    /** A world vector turned by the view angle. Node shapes, icons and text are not turned, only where things sit. */
    turnToScreen(x, y) {
        return { x: x * this.rotationCos - y * this.rotationSin, y: x * this.rotationSin + y * this.rotationCos };
    }

    turnToWorld(x, y) {
        return { x: x * this.rotationCos + y * this.rotationSin, y: -x * this.rotationSin + y * this.rotationCos };
    }

    screenPoint(node) {
        const turned = this.turnToScreen(Number(node.x) || 0, Number(node.y) || 0);
        return { x: turned.x * this.scale + this.offsetX, y: turned.y * this.scale + this.offsetY };
    }

    /** The world point under a point of the canvas (canvas pixels from its top left). */
    localToWorld(x, y) {
        return this.turnToWorld((x - this.offsetX) / this.scale, (y - this.offsetY) / this.scale);
    }

    worldPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return this.localToWorld(clientX - rect.left, clientY - rect.top);
    }

    /** Moves the view so that the world point sits at canvas point (x, y). */
    placeWorldAt(world, x, y) {
        const turned = this.turnToScreen(world.x, world.y);
        this.offsetX = x - turned.x * this.scale;
        this.offsetY = y - turned.y * this.scale;
    }

    /** Turns the view about the canvas centre (what is in the middle stays there). @returns {number} the angle, -180 to 179 */
    setRotation(degrees) {
        const rect = this.canvas.getBoundingClientRect(), centre = this.localToWorld(rect.width / 2, rect.height / 2);
        const angle = ((Math.round(Number(degrees) || 0) + 180) % 360 + 360) % 360 - 180;
        this.rotation = angle;
        this.rotationCos = Math.cos(angle * Math.PI / 180);
        this.rotationSin = Math.sin(angle * Math.PI / 180);
        this.placeWorldAt(centre, rect.width / 2, rect.height / 2);
        this.requestDraw();
        return angle;
    }

    drawGrid(width, height) {
        if (this.scale < 0.18 || this.gridSize <= 0) return;
        const step = this.gridSize * this.scale;
        if (step < 7) return;
        // The grid is the world's (snapping uses it), so it turns with the view: lines across the world box of the canvas corners.
        const corners = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => this.localToWorld(x, y));
        const size = this.gridSize, xs = corners.map(point => point.x), ys = corners.map(point => point.y);
        const minX = Math.floor(Math.min(...xs) / size) * size, maxX = Math.max(...xs);
        const minY = Math.floor(Math.min(...ys) / size) * size, maxY = Math.max(...ys);
        const line = (from, to) => {
            const a = this.screenPoint(from), b = this.screenPoint(to);
            this.ctx.moveTo(a.x, a.y);
            this.ctx.lineTo(b.x, b.y);
        };
        this.ctx.beginPath();
        for (let x = minX; x <= maxX; x += size) line({ x, y: minY }, { x, y: maxY });
        for (let y = minY; y <= maxY; y += size) line({ x: minX, y }, { x: maxX, y });
        this.ctx.strokeStyle = 'rgba(106,132,153,.09)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    drawEdges() {
        this.ctx.lineCap = 'round';
        this.tree.edges.forEach(edge => {
            const a = this.nodeMap.get(String(edge.a));
            const b = this.nodeMap.get(String(edge.b));
            if (!a || !b) return;
            const pa = this.screenPoint(a);
            const pb = this.screenPoint(b);
            const highlighted = this.allocation ? this.allocation.has(String(a.id)) && this.allocation.has(String(b.id))
                : this.selected.has(String(a.id)) && this.selected.has(String(b.id));
            const outside = !this.inFocus(a) && !this.inFocus(b);
            this.ctx.beginPath();
            this.ctx.moveTo(pa.x, pa.y);
            this.ctx.lineTo(pb.x, pb.y);
            // 2026-10-28 사용자: 선이 잘 보이게(전: 흐린 회청색 1px). 가까이 볼수록 조금 굵어진다. 작업 구역 밖은 흐리게.
            this.ctx.strokeStyle = highlighted ? 'rgba(236,199,126,.95)' : (outside ? 'rgba(158,184,206,.18)' : 'rgba(158,184,206,.78)');
            this.ctx.lineWidth = (highlighted ? 2.6 : 1.6) * Math.min(1.6, Math.max(1, this.scale * 2.5));
            this.ctx.stroke();
        });
    }

    /** The placed motifs, behind the links (the game draws them the same way, lighter: js/canvas-passive-tree-art.js drawMotifs). */
    inFocus(point) {
        return !this.focus || this.focus(point);
    }

    drawBackgrounds() {
        if (!this.backgroundsVisible) return;
        (this.tree.backgroundMotifs || []).forEach(item => {
            const motif = this.motifs[item.motifId];
            if (!motif || item.visible === false) return;
            const point = this.screenPoint(item), scale = this.scale * (Number(item.size) || 200) / 200;
            const dim = this.inFocus(item) ? 1 : 0.3;
            this.ctx.save();
            this.ctx.translate(point.x, point.y);
            this.ctx.rotate(((Number(item.rotation) || 0) + this.rotation) * Math.PI / 180);
            this.ctx.scale(scale, scale);
            this.ctx.strokeStyle = this.ctx.fillStyle = motif.color;
            // Lines scale with the motif and the zoom; zoomed out they stay one pixel wide instead of fading away.
            this.motifMinWidth = 1 / scale;
            motif.shapes.forEach(shape => this.drawMotifShape(shape, (item.opacity ?? 1) * 0.6 * dim));
            if (item.id === this.selectedMotif) this.drawMotifSelection(item, scale);
            this.ctx.restore();
        });
    }

    drawMotifShape(shape, alpha) {
        this.ctx.save();
        if (shape.m) this.ctx.transform(...shape.m);
        this.ctx.globalAlpha = alpha;
        this.ctx.lineWidth = Math.max(shape.strokeWidth || 1.25, this.motifMinWidth || 0);
        this.ctx.stroke(shape.path);
        if (shape.solid) {
            this.ctx.globalAlpha = alpha * (shape.fillOpacity ?? 0.07);
            this.ctx.fill(shape.path, shape.fillRule || 'nonzero');
        }
        this.ctx.restore();
    }

    drawMotifSelection(item, scale) {
        this.ctx.setLineDash([7 / scale, 5 / scale]);
        this.ctx.lineWidth = 1.5 / scale;
        this.ctx.strokeStyle = item.locked ? 'rgba(160,176,192,.9)' : 'rgba(241,214,159,.95)';
        this.ctx.strokeRect(-96, -96, 192, 192);
    }

    /** The topmost visible motif whose box holds the point (a motif is about as wide as its size). */
    hitMotif(clientX, clientY) {
        if (!this.backgroundsVisible) return null;
        const world = this.worldPoint(clientX, clientY);
        return [...(this.tree.backgroundMotifs || [])].reverse().find(item => item.visible !== false && this.motifs[item.motifId] && this.inFocus(item)
            && Math.hypot(item.x - world.x, item.y - world.y) <= (Number(item.size) || 200) * 0.48) || null;
    }

    selectMotif(id) {
        if (this.selectedMotif === id) return;
        this.selectedMotif = id;
        this.callbacks.onMotifSelect?.(id);
        this.requestDraw();
    }

    beginMotifDrag(item, event) {
        this.changeSelection([]);
        this.selectMotif(item.id);
        this.pointer = item.locked ? { mode: 'pan', x: event.clientX, y: event.clientY, offsetX: this.offsetX, offsetY: this.offsetY }
            : { mode: 'motif', item, x: event.clientX, y: event.clientY, startX: item.x, startY: item.y, changed: false };
    }

    moveMotif(event) {
        const { x: dx, y: dy } = this.turnToWorld((event.clientX - this.pointer.x) / this.scale, (event.clientY - this.pointer.y) / this.scale);
        if (!this.pointer.changed && Math.hypot(dx, dy) > 1) {
            this.pointer.changed = true;
            this.callbacks.onBeforeMove?.();
        }
        if (!this.pointer.changed) return;
        this.pointer.item.x = Math.round(this.pointer.startX + dx);
        this.pointer.item.y = Math.round(this.pointer.startY + dy);
        this.callbacks.onMotifMove?.(this.pointer.item.id);
        this.requestDraw();
    }

    getCustomImage(node) {
        if (!node.iconAsset) return null;
        if (this.customImages.has(node.iconAsset)) return this.customImages.get(node.iconAsset);
        const image = new Image();
        this.customImages.set(node.iconAsset, image);
        image.onload = () => this.requestDraw();
        image.src = `/${node.iconAsset}`;
        return image;
    }

    drawIcon(node, point, radius) {
        const custom = this.getCustomImage(node);
        const size = radius * 1.55;
        if (custom && custom.complete && custom.naturalWidth) {
            this.ctx.drawImage(custom, point.x - size / 2, point.y - size / 2, size, size);
            return;
        }
        const cell = ICON_CELLS[nodeFamily(node)];
        if (!cell || !this.atlas.complete || !this.atlas.naturalWidth) return;
        const sourceWidth = this.atlas.naturalWidth / 5;
        const sourceHeight = this.atlas.naturalHeight / 4;
        const atlasSize = radius * 1.45;
        this.ctx.drawImage(this.atlas, cell[0] * sourceWidth, cell[1] * sourceHeight,
            sourceWidth, sourceHeight, point.x - atlasSize / 2, point.y - atlasSize / 2, atlasSize, atlasSize);
    }

    isSearchMatch(node) {
        if (!this.search) return true;
        const effects = (node.runtimeEffects || []).map(effect => `${effect.statId} ${effect.value}`).join(' ');
        const searchable = `${node.id} ${node.name || ''} ${node.desc || ''} ${node.cat || ''} `
            + `${node.archetype || ''} ${effects}`;
        return searchable.toLowerCase().includes(this.search);
    }

    traceShape(node, point, radius) {
        this.ctx.beginPath();
        if (node.type !== 'major') return this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
        for (let i = 0; i < 8; i++) {
            const angle = Math.PI / 8 + i * Math.PI / 4;
            this.ctx[i ? 'lineTo' : 'moveTo'](point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius);
        }
        return this.ctx.closePath();
    }

    drawNode(node) {
        const point = this.screenPoint(node);
        const radius = Math.max(3, nodeRadius(node) * this.scale);
        const style = TYPE_STYLE[node.type] || TYPE_STYLE.normal;
        const isSelected = this.selected.has(String(node.id));
        const matched = this.isSearchMatch(node) && this.inFocus(node);
        this.ctx.save();
        this.ctx.globalAlpha = matched ? 1 : 0.18;
        this.traceShape(node, point, radius + (isSelected ? 3 : 0));
        const allocated = this.allocation && this.allocation.has(String(node.id));
        this.ctx.fillStyle = allocated ? '#7a5a22' : '#120d09';
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#f2cc7f' : (this.colorOf ? this.colorOf(node) : style.fill);
        this.ctx.lineWidth = isSelected ? 2.4 : 1.4;
        this.ctx.stroke();
        if (node.type === 'keystone') {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, radius * 1.3, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        if (this.scale >= 0.35) this.drawIcon(node, point, radius);
        this.drawWeakMark(node, point, radius);
        this.drawNodeLabel(node, point, radius, isSelected, matched);
        this.drawConnectionFocus(node, point, radius);
        this.ctx.restore();
    }

    drawNodeLabel(node, point, radius, isSelected, matched) {
        if ((!isSelected && !(matched && this.search)) || this.scale < 0.28) return;
        this.ctx.fillStyle = isSelected ? '#ffe4a8' : '#d4e1ea';
        this.ctx.font = `${isSelected ? 700 : 600} ${Math.max(10, Math.min(14, 11 * this.scale + 7))}px system-ui`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        this.ctx.fillText(node.name || node.id, point.x, point.y + radius + 5);
    }

    /** Weak nodes (under WEAK_POWER of the usual node of their type) get a red dashed ring when the toggle is on. */
    drawWeakMark(node, point, radius) {
        const power = this.overlays.power.get(String(node.id));
        if (!this.overlays.weak || power === undefined || power === null || power >= WEAK_POWER) return;
        this.ctx.save();
        this.ctx.setLineDash([4, 3]);
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius + 6, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#ff6b5e';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        this.ctx.restore();
    }

    /** This tree's class zones (insights.js areaLayout) as faint wedges from the centre, named at their middle, and the centre line. */
    drawZones(width, height) {
        const layout = this.overlays.layout;
        if (!this.overlays.zones || !layout) return;
        const centre = this.screenPoint({ x: 0, y: 0 }), reach = Math.hypot(width, height) * 2;
        layout.sectors.forEach(sector => {
            const zone = ZONES.find(row => row.id === sector.id), span = (sector.to - sector.from + 360) % 360 || 360;
            const from = (sector.from + this.rotation) * Math.PI / 180, to = (sector.from + span + this.rotation) * Math.PI / 180, middle = (from + to) / 2;
            this.ctx.beginPath();
            this.ctx.moveTo(centre.x, centre.y);
            this.ctx.arc(centre.x, centre.y, reach, from, to);
            this.ctx.closePath();
            this.ctx.fillStyle = zone.color;
            this.ctx.fill();
            this.ctx.fillStyle = 'rgba(246,231,194,0.55)';
            this.ctx.font = '600 13px system-ui';
            this.ctx.textAlign = 'center';
            // 이름은 시작점 고리 조금 안쪽(게임 트리 2700 / 3240)
            const labelRadius = layout.startRadius * 0.83 * this.scale;
            this.ctx.fillText(zone.label, centre.x + Math.cos(middle) * labelRadius, centre.y + Math.sin(middle) * labelRadius);
        });
        // 구역 작업의 "가운데"(이 반지름 안은 어느 직업 구역도 아니다)
        this.ctx.beginPath();
        this.ctx.arc(centre.x, centre.y, layout.centreRadius * this.scale, 0, Math.PI * 2);
        this.ctx.setLineDash([6, 6]);
        this.ctx.strokeStyle = 'rgba(246,231,194,0.45)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        this.ctx.fillText('가운데', centre.x, centre.y - layout.centreRadius * this.scale + 18);
    }

    setOverlays(overlays) {
        this.overlays = { ...this.overlays, ...overlays };
        this.requestDraw();
    }

    drawConnectionFocus(node, point, radius) {
        if (this.connectFrom !== String(node.id)) return;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius + 7, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#75cfff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
    }

    draw() {
        const dpr = Math.max(1, window.devicePixelRatio || 1);
        const width = this.canvas.width / dpr;
        const height = this.canvas.height / dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.clearRect(0, 0, width, height);
        this.drawZones(width, height);
        this.drawGrid(width, height);
        this.drawBackgrounds();
        drawRegions(this);
        this.drawEdges();
        drawSelectedEdge(this);
        this.tree.nodes.forEach(node => this.drawNode(node));
        drawPlacePreview(this);
        drawBox(this);
        this.peers.forEach(peer => this.drawPeer(peer));
    }

    /** Another editor: a ring in their colour round each node they picked, and their pointer with their name. */
    drawPeer(peer) {
        this.ctx.save();
        this.ctx.strokeStyle = peer.color;
        this.ctx.lineWidth = 2.5;
        (peer.selection || []).forEach(id => {
            const node = this.nodeMap.get(String(id));
            if (!node) return;
            const point = this.screenPoint(node);
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, Math.max(3, nodeRadius(node) * this.scale) + 7, 0, Math.PI * 2);
            this.ctx.stroke();
        });
        if (peer.cursor) this.drawPeerPointer(peer, this.screenPoint(peer.cursor));
        this.ctx.restore();
    }

    drawPeerPointer(peer, point) {
        this.ctx.beginPath();
        this.ctx.moveTo(point.x, point.y);
        this.ctx.lineTo(point.x + 3, point.y + 15);
        this.ctx.lineTo(point.x + 7, point.y + 10);
        this.ctx.lineTo(point.x + 13, point.y + 11);
        this.ctx.closePath();
        this.ctx.fillStyle = peer.color;
        this.ctx.fill();
        this.ctx.strokeStyle = '#06090e';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.font = '600 12px system-ui';
        const width = this.ctx.measureText(peer.name).width + 10;
        this.ctx.fillStyle = peer.color;
        this.ctx.fillRect(point.x + 12, point.y + 14, width, 18);
        this.ctx.fillStyle = '#06090e';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(peer.name, point.x + 17, point.y + 23);
    }

    hitNode(clientX, clientY) {
        const world = this.worldPoint(clientX, clientY);
        let best = null;
        let bestDistance = Infinity;
        this.tree.nodes.forEach(node => {
            if (!this.inFocus(node)) return;
            const distance = Math.hypot(node.x - world.x, node.y - world.y);
            const hitRadius = nodeRadius(node) + 8 / Math.max(0.2, this.scale);
            if (distance <= hitRadius && distance < bestDistance) {
                best = node;
                bestDistance = distance;
            }
        });
        return best;
    }

    changeSelection(ids) {
        this.selected = new Set(ids.map(String));
        this.callbacks.onSelectionChange?.([...this.selected]);
        this.requestDraw();
    }

    beginConnection(node) {
        const id = String(node.id);
        if (!this.connectFrom) {
            this.connectFrom = id;
            this.changeSelection([id]);
            this.callbacks.onConnectionHint?.(id);
            return;
        }
        if (this.connectFrom !== id) this.callbacks.onConnect?.(this.connectFrom, id);
        this.connectFrom = null;
        this.callbacks.onConnectionHint?.(null);
        this.requestDraw();
    }

    pointerDown(event) {
        const node = this.hitNode(event.clientX, event.clientY);
        this.canvas.setPointerCapture(event.pointerId);
        if (this.allocation && event.button === 0) {
            if (node) this.callbacks.onAllocate?.(node);
            else this.beginPan(event, true);
            return;
        }
        if (this.connectMode && node) {
            this.beginConnection(node);
            return;
        }
        if (this.place && !node && event.button === 0) {
            this.callbacks.onPlace?.(this.worldPoint(event.clientX, event.clientY));
            return;
        }
        if (!node && event.button === 0 && event.shiftKey) {
            this.beginBox(event);
            return;
        }
        const edge = !node && event.button === 0 && !this.connectMode ? hitEdge(this, event.clientX, event.clientY) : null;
        if (edge) {
            this.changeSelection([]);
            this.selectMotif(null);
            this.setSelectedEdge(edge);
            return;
        }
        const motif = !node && !this.connectMode && event.button !== 1 ? this.hitMotif(event.clientX, event.clientY) : null;
        if (motif) {
            this.beginMotifDrag(motif, event);
            return;
        }
        if (!node || event.button === 1) {
            this.beginPan(event);
            return;
        }
        this.selectMotif(null);
        this.setSelectedEdge(null);
        this.selectPointerNode(node, event.shiftKey || event.ctrlKey || event.metaKey);
        const positions = [...this.selected].map(id => {
            const entry = this.nodeMap.get(id);
            return [id, entry.x, entry.y];
        });
        this.pointer = { mode: 'node', x: event.clientX, y: event.clientY, positions, changed: false, anchor: String(node.id) };
    }

    /** Shift+drag on empty space: a range box; the nodes inside join the selection when it is let go (설계자의 범위 선택). */
    beginBox(event) {
        const rect = this.canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
        this.pointer = { mode: 'box', x0: x, y0: y, x1: x, y1: y };
    }

    beginPan(event, keepSelection = false) {
        if (!event.shiftKey && !keepSelection) {
            this.changeSelection([]);
            this.selectMotif(null);
            this.setSelectedEdge(null);
        }
        this.pointer = {
            mode: 'pan', x: event.clientX, y: event.clientY,
            offsetX: this.offsetX, offsetY: this.offsetY
        };
    }

    selectPointerNode(node, extendSelection) {
        const id = String(node.id);
        if (!extendSelection && !this.selected.has(id)) {
            this.changeSelection([id]);
            return;
        }
        if (!extendSelection) return;
        const ids = new Set(this.selected);
        if (ids.has(id)) ids.delete(id);
        else ids.add(id);
        this.changeSelection([...ids]);
    }

    /** The node under the pointer while nothing is dragged (the editor shows what it is); null over empty space or while dragging. */
    pointerMove(event) {
        this.callbacks.onHover?.(this.pointer ? null : this.hitNode(event.clientX, event.clientY), event);
        this.hoverWorld = this.worldPoint(event.clientX, event.clientY);
        this.callbacks.onPointer?.(this.hoverWorld);
        if (this.place) this.requestDraw();
        if (!this.pointer) return;
        if (this.pointer.mode === 'box') {
            const rect = this.canvas.getBoundingClientRect();
            this.pointer.x1 = event.clientX - rect.left;
            this.pointer.y1 = event.clientY - rect.top;
            this.requestDraw();
            return;
        }
        if (this.pointer.mode === 'pan') {
            this.moveCamera(event);
            return;
        }
        if (this.pointer.mode === 'motif') {
            this.moveMotif(event);
            return;
        }
        this.moveNode(event);
    }

    moveCamera(event) {
        this.offsetX = this.pointer.offsetX + event.clientX - this.pointer.x;
        this.offsetY = this.pointer.offsetY + event.clientY - this.pointer.y;
        this.requestDraw();
    }

    moveNode(event) {
        const { x: dx, y: dy } = this.turnToWorld((event.clientX - this.pointer.x) / this.scale, (event.clientY - this.pointer.y) / this.scale);
        if (!this.pointer.changed && Math.hypot(dx, dy) > 1) {
            this.pointer.changed = true;
            this.callbacks.onBeforeMove?.();
        }
        if (!this.pointer.changed) return;
        // 묶음은 모양 그대로 옮기고 격자에는 잡은 노드 하나만 맞춘다(전: 노드마다 격자에 맞춰 모양이 흐트러졌다). Alt나 자유 드래그는 격자를 무시한다.
        const anchor = this.pointer.positions.find(([id]) => id === this.pointer.anchor) || this.pointer.positions[0];
        const snap = this.snapEnabled && !this.freeDrag && !event.altKey, grid = this.gridSize;
        const stepX = snap ? Math.round((anchor[1] + dx) / grid) * grid - anchor[1] : dx;
        const stepY = snap ? Math.round((anchor[2] + dy) / grid) * grid - anchor[2] : dy;
        this.pointer.positions.forEach(([id, x, y]) => {
            const node = this.nodeMap.get(id);
            node.x = Math.round((x + stepX) * 100) / 100;
            node.y = Math.round((y + stepY) * 100) / 100;
        });
        this.callbacks.onMove?.([...this.selected]);
        this.requestDraw();
    }

    pointerUp() {
        if (this.pointer && this.pointer.mode === 'box') {
            const inside = nodesInBox(this, this.pointer);
            this.pointer = null;
            this.changeSelection([...new Set([...this.selected, ...inside])]);
            return;
        }
        if (this.pointer && this.pointer.mode === 'node' && this.pointer.changed) {
            this.callbacks.onMoved?.([...this.selected]);
        }
        if (this.pointer && this.pointer.mode === 'motif' && this.pointer.changed) this.callbacks.onMotifMoved?.(this.pointer.item.id);
        this.pointer = null;
    }

    wheel(event) {
        event.preventDefault();
        const before = this.worldPoint(event.clientX, event.clientY);
        const nextScale = Math.max(0.08, Math.min(2.5, this.scale * Math.exp(-event.deltaY * 0.0012)));
        const rect = this.canvas.getBoundingClientRect();
        this.scale = nextScale;
        this.placeWorldAt(before, event.clientX - rect.left, event.clientY - rect.top);
        this.requestDraw();
    }

    /** The whole tree, the area being worked on, or only the given node ids (영역 보기). */
    fit(onlyIds = null) {
        const nodes = this.tree.nodes.filter(node => (onlyIds ? onlyIds.has(String(node.id)) : this.inFocus(node)));
        if (!nodes.length) return;
        const rect = this.canvas.getBoundingClientRect();
        const turned = nodes.map(node => this.turnToScreen(Number(node.x), Number(node.y)));
        const xs = turned.map(point => point.x);
        const ys = turned.map(point => point.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const widthScale = (rect.width - 100) / Math.max(1, maxX - minX);
        const heightScale = (rect.height - 100) / Math.max(1, maxY - minY);
        this.scale = Math.max(0.08, Math.min(1.2, widthScale, heightScale));
        this.offsetX = rect.width / 2 - (minX + maxX) / 2 * this.scale;
        this.offsetY = rect.height / 2 - (minY + maxY) / 2 * this.scale;
        this.requestDraw();
    }

    setSelectedEdge(key) {
        if (this.selectedEdge === key) return;
        this.selectedEdge = key;
        this.callbacks.onEdgeSelect?.(key);
        this.requestDraw();
    }

    /** Moves the view by canvas pixels (방향키로 화면 이동). */
    panBy(dx, dy) {
        this.offsetX += dx;
        this.offsetY += dy;
        this.requestDraw();
    }

    /** Zooms about the canvas centre (＋ and － buttons). */
    zoomBy(factor) {
        const rect = this.canvas.getBoundingClientRect(), centre = this.localToWorld(rect.width / 2, rect.height / 2);
        this.scale = Math.max(0.08, Math.min(2.5, this.scale * factor));
        this.placeWorldAt(centre, rect.width / 2, rect.height / 2);
        this.requestDraw();
    }

    setTree(tree) {
        this.tree = tree;
        this.nodeMap = new Map(tree.nodes.map(node => [String(node.id), node]));
        this.selected = new Set([...this.selected].filter(id => this.nodeMap.has(id)));
        if (this.selectedMotif && !(tree.backgroundMotifs || []).some(item => item.id === this.selectedMotif)) this.selectMotif(null);
        this.requestDraw();
    }

    /** Drawings by motif id: { color, shapes: [{ d, m?, solid, fillOpacity?, fillRule?, strokeWidth? }] } (the server's built-in ones carry m). */
    setMotifs(catalog) {
        this.motifs = Object.fromEntries(Object.entries(catalog).map(([id, motif]) => [id, { color: motif.color,
            shapes: motif.shapes.map(shape => ({ ...shape, path: new Path2D(shape.d) })) }]));
        this.requestDraw();
    }

    setSelection(ids) {
        this.changeSelection(ids.filter(id => this.nodeMap.has(String(id))));
    }

    setSearch(value) {
        this.search = String(value || '').trim().toLowerCase();
        this.requestDraw();
    }

    setConnectMode(value) {
        this.connectMode = Boolean(value);
        this.connectFrom = null;
        this.callbacks.onConnectionHint?.(null);
        this.requestDraw();
    }

    setGrid(enabled, size) {
        this.snapEnabled = Boolean(enabled);
        this.gridSize = Math.max(5, Number(size) || 20);
        this.requestDraw();
    }

    getViewCenter() {
        const rect = this.canvas.getBoundingClientRect();
        return this.localToWorld(rect.width / 2, rect.height / 2);
    }
}

export function createTreeCanvas(canvas, callbacks = {}) {
    const editor = new PassiveTreeCanvas(canvas, callbacks);
    return {
        setTree: tree => editor.setTree(tree),
        setSelection: ids => editor.setSelection(ids),
        getSelection: () => [...editor.selected],
        setSearch: value => editor.setSearch(value),
        setConnectMode: value => editor.setConnectMode(value),
        setGrid: (enabled, size) => editor.setGrid(enabled, size),
        getViewCenter: () => editor.getViewCenter(),
        setRotation: degrees => editor.setRotation(degrees),
        getRotation: () => editor.rotation,
        refresh: () => editor.requestDraw(),
        setOverlays: overlays => editor.setOverlays(overlays),
        setMotifs: catalog => editor.setMotifs(catalog),
        setBackgroundsVisible: value => { editor.backgroundsVisible = !!value; if (!value) editor.selectMotif(null); editor.requestDraw(); },
        selectMotif: id => editor.selectMotif(id),
        setFocus: test => {
            editor.focus = test || null;
            editor.setSelection([...editor.selected].filter(id => editor.nodeMap.has(id) && editor.inFocus(editor.nodeMap.get(id))));
            if (editor.selectedMotif && !(editor.tree.backgroundMotifs || []).some(item => item.id === editor.selectedMotif && editor.inFocus(item))) editor.selectMotif(null);
            editor.fit();
        },
        getSelectedMotif: () => editor.selectedMotif,
        setPeers: peers => { editor.peers = peers; editor.requestDraw(); },
        setPlaceMode: spec => { editor.place = spec || null; editor.requestDraw(); },
        getPointerWorld: () => editor.hoverWorld,
        setSelectedEdge: key => editor.setSelectedEdge(key),
        getSelectedEdge: () => editor.selectedEdge,
        setRegions: regions => { editor.regions = regions || []; editor.requestDraw(); },
        setColorOf: colorOf => { editor.colorOf = colorOf || null; editor.requestDraw(); },
        setAllocation: ids => { editor.allocation = ids || null; editor.requestDraw(); },
        setFreeDrag: value => { editor.freeDrag = !!value; },
        panBy: (dx, dy) => editor.panBy(dx, dy),
        zoomBy: factor => editor.zoomBy(factor),
        fit: () => editor.fit(),
        fitNodes: ids => editor.fit(new Set(ids.map(String)))
    };
}
