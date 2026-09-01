const TYPE_STYLE = Object.freeze({
    minor: { radius: 8, fill: '#607385' }, assist: { radius: 9, fill: '#738596' },
    normal: { radius: 12, fill: '#7394aa' }, major: { radius: 17, fill: '#c09959' },
    keystone: { radius: 22, fill: '#a874ce' }, void: { radius: 21, fill: '#7f50c7' },
    quatrefoil: { radius: 22, fill: '#d6b455' }, start: { radius: 25, fill: '#d2d9e1' }
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
        this.atlas.src = '/assets/ui/passive-tree-icons-v3.webp';
        this.atlas.onload = () => this.requestDraw();
        this.customImages = new Map();
        this.tree = { nodes: [], edges: [] };
        this.nodeMap = new Map();
        this.selected = new Set();
        this.scale = 0.25;
        this.offsetX = 0;
        this.offsetY = 0;
        this.search = '';
        this.connectMode = false;
        this.connectFrom = null;
        this.snapEnabled = true;
        this.gridSize = 20;
        this.pointer = null;
        this.framePending = false;
        this.bindEvents();
        this.resize();
    }

    bindEvents() {
        this.canvas.addEventListener('pointerdown', event => this.pointerDown(event));
        this.canvas.addEventListener('pointermove', event => this.pointerMove(event));
        this.canvas.addEventListener('pointerup', () => this.pointerUp());
        this.canvas.addEventListener('pointercancel', () => this.pointerUp());
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

    screenPoint(node) {
        return { x: node.x * this.scale + this.offsetX, y: node.y * this.scale + this.offsetY };
    }

    worldPoint(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.offsetX) / this.scale,
            y: (clientY - rect.top - this.offsetY) / this.scale
        };
    }

    drawGrid(width, height) {
        if (this.scale < 0.18 || this.gridSize <= 0) return;
        const step = this.gridSize * this.scale;
        if (step < 7) return;
        this.ctx.beginPath();
        for (let x = ((this.offsetX % step) + step) % step; x < width; x += step) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }
        for (let y = ((this.offsetY % step) + step) % step; y < height; y += step) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
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
            const highlighted = this.selected.has(String(a.id)) && this.selected.has(String(b.id));
            this.ctx.beginPath();
            this.ctx.moveTo(pa.x, pa.y);
            this.ctx.lineTo(pb.x, pb.y);
            this.ctx.strokeStyle = highlighted ? 'rgba(236,199,126,.9)' : 'rgba(109,132,151,.38)';
            this.ctx.lineWidth = highlighted ? 2.2 : 1;
            this.ctx.stroke();
        });
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

    drawNode(node) {
        const point = this.screenPoint(node);
        const radius = Math.max(3, nodeRadius(node) * this.scale);
        const style = TYPE_STYLE[node.type] || TYPE_STYLE.normal;
        const isSelected = this.selected.has(String(node.id));
        const matched = this.isSearchMatch(node);
        this.ctx.save();
        this.ctx.globalAlpha = matched ? 1 : 0.18;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, radius + (isSelected ? 3 : 0), 0, Math.PI * 2);
        this.ctx.fillStyle = '#0b1119';
        this.ctx.fill();
        this.ctx.strokeStyle = isSelected ? '#f2cc7f' : style.fill;
        this.ctx.lineWidth = isSelected ? 2.4 : 1.4;
        this.ctx.stroke();
        if (this.scale >= 0.35) this.drawIcon(node, point, radius);
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
        this.drawGrid(width, height);
        this.drawEdges();
        this.tree.nodes.forEach(node => this.drawNode(node));
    }

    hitNode(clientX, clientY) {
        const world = this.worldPoint(clientX, clientY);
        let best = null;
        let bestDistance = Infinity;
        this.tree.nodes.forEach(node => {
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
        if (this.connectMode && node) {
            this.beginConnection(node);
            return;
        }
        if (!node || event.button === 1) {
            this.beginPan(event);
            return;
        }
        this.selectPointerNode(node, event.shiftKey);
        const positions = [...this.selected].map(id => {
            const entry = this.nodeMap.get(id);
            return [id, entry.x, entry.y];
        });
        this.pointer = { mode: 'node', x: event.clientX, y: event.clientY, positions, changed: false };
    }

    beginPan(event) {
        if (!event.shiftKey) this.changeSelection([]);
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

    pointerMove(event) {
        if (!this.pointer) return;
        if (this.pointer.mode === 'pan') {
            this.moveCamera(event);
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
        const dx = (event.clientX - this.pointer.x) / this.scale;
        const dy = (event.clientY - this.pointer.y) / this.scale;
        if (!this.pointer.changed && Math.hypot(dx, dy) > 1) {
            this.pointer.changed = true;
            this.callbacks.onBeforeMove?.();
        }
        if (!this.pointer.changed) return;
        this.pointer.positions.forEach(([id, x, y]) => {
            const node = this.nodeMap.get(id);
            const nextX = x + dx;
            const nextY = y + dy;
            node.x = this.snapEnabled ? Math.round(nextX / this.gridSize) * this.gridSize : Math.round(nextX * 10) / 10;
            node.y = this.snapEnabled ? Math.round(nextY / this.gridSize) * this.gridSize : Math.round(nextY * 10) / 10;
        });
        this.callbacks.onMove?.([...this.selected]);
        this.requestDraw();
    }

    pointerUp() {
        if (this.pointer && this.pointer.mode === 'node' && this.pointer.changed) {
            this.callbacks.onMoved?.([...this.selected]);
        }
        this.pointer = null;
    }

    wheel(event) {
        event.preventDefault();
        const before = this.worldPoint(event.clientX, event.clientY);
        const nextScale = Math.max(0.08, Math.min(2.5, this.scale * Math.exp(-event.deltaY * 0.0012)));
        const rect = this.canvas.getBoundingClientRect();
        this.scale = nextScale;
        this.offsetX = event.clientX - rect.left - before.x * this.scale;
        this.offsetY = event.clientY - rect.top - before.y * this.scale;
        this.requestDraw();
    }

    fit() {
        if (!this.tree.nodes.length) return;
        const rect = this.canvas.getBoundingClientRect();
        const xs = this.tree.nodes.map(node => Number(node.x));
        const ys = this.tree.nodes.map(node => Number(node.y));
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

    setTree(tree) {
        this.tree = tree;
        this.nodeMap = new Map(tree.nodes.map(node => [String(node.id), node]));
        this.selected = new Set([...this.selected].filter(id => this.nodeMap.has(id)));
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
        return {
            x: (rect.width / 2 - this.offsetX) / this.scale,
            y: (rect.height / 2 - this.offsetY) / this.scale
        };
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
        refresh: () => editor.requestDraw(),
        fit: () => editor.fit()
    };
}
