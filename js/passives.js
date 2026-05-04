// Passive module bridge (phase 2).
window.GameModules = window.GameModules || {};
window.GameModules.passives = {
  get tree() { return window.PASSIVE_TREE; },
  get configs() {
    return {
      targetNodes: window.PASSIVE_TARGET_NODES,
      discoveryRadius: window.PASSIVE_DISCOVERY_RADIUS,
      previewRadius: window.PASSIVE_PREVIEW_RADIUS
    };
  },
  // TODO: move passive node mutation/purchase/pathing functions here.
};

// Phase-3 extracted passive runtime block.
let passiveRevealBursts = [];










function getPassiveNodeDisplayName(node) {
    if (!node) return '미확인 성좌';
    if (node.title) return node.title;
    return (P_STATS[node.stat] || {}).name || '미확인 성좌';
}

function getPassiveEffectLabel(node) {
    if (!node) return '';
    let mutation = game && game.starWedge && game.starWedge.nodeMutations ? game.starWedge.nodeMutations[node.id] : null;
    if (mutation && mutation.currentStat) {
        let statMut = P_STATS[mutation.currentStat] || {};
        return `${statMut.name || mutation.currentStat} +${formatValue(mutation.currentStat, mutation.currentVal)}${statMut.isPct ? '%' : ''} <span style="color:#b8a7c7;">(변성)</span>`;
    }
    if (node.effectLabel) return node.effectLabel;
    let stat = P_STATS[node.stat] || {};
    let suffix = stat.isPct ? '%' : '';
    return `${stat.name || node.stat} +${formatValue(node.stat, node.val)}${suffix}`;
}

function getPassiveKindLabel(node) {
    if (!node) return '성좌';
    if (node.kind === 'apex') return '별끝 특수 노드';
    if (node.kind === 'evolved') return '각성 성좌';
    if (node.kind === 'transcendent') return '초월 성좌';
    if (node.kind === 'core') return '핵심 성좌';
    if (node.kind === 'deadend') return '막다른 길 거점';
    if (node.kind === 'hub') return '허브 노드';
    if (node.tier >= 3 || node.kind === 'major') return '중심 노드';
    if (node.kind === 'path') return '경로 노드';
    return '보조 노드';
}

function angleDistance(a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
}

function traceStarShape(ctx, outerRadius, innerRadius, points) {
    for (let i = 0; i < points * 2; i++) {
        let angle = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
        let radius = i % 2 === 0 ? outerRadius : innerRadius;
        let px = Math.cos(angle) * radius;
        let py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function getPassiveNodeVisualRadius(node) {
    if (!node) return 8;
    if (node.tier === 0) return 24;
    if (node.kind === 'transcendent') return 20;
    if (node.kind === 'apex') return 18;
    if (node.kind === 'evolved') return 13;
    if (node.kind === 'core') return 18;
    if (node.kind === 'deadend') return 16;
    if (node.kind === 'hub') return 20;
    if (node.tier === 3 || node.kind === 'major') return 15;
    if (node.tier === 2 || node.kind === 'ring' || node.kind === 'inner') return 10;
    return 7;
}

function getPassiveStatAccent(statId) {
    const base = {
        activeOuter: '#f2dfb0',
        activeMid: '#d4ac63',
        activeGlow: 'rgba(242,223,176,0.35)',
        reachOuter: '#88a8bd',
        reachMid: '#172029',
        reachGlow: 'rgba(123,170,205,0.16)',
        previewOuter: 'rgba(98,123,141,0.56)',
        previewMid: 'rgba(16,21,28,0.82)',
        previewGlow: 'rgba(92,124,151,0.1)',
        idleOuter: 'rgba(142,160,179,0.92)',
        idleMid: 'rgba(49,64,80,0.92)',
        idleInner: 'rgba(85,105,126,0.95)',
        text: '#dce6f2'
    };
    if (['flatHp', 'pctHp', 'regen', 'leech'].includes(statId)) {
        return { ...base, activeOuter: '#9be1b9', activeMid: '#327858', activeGlow: 'rgba(100,210,145,0.28)', reachOuter: '#6dc89b', reachMid: '#173127', previewOuter: 'rgba(88,155,124,0.56)', idleOuter: 'rgba(128,182,154,0.92)', text: '#c8ffe0' };
    }
    if (['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'ds', 'dr', 'physIgnore'].includes(statId)) {
        return { ...base, activeOuter: '#ffca8b', activeMid: '#865233', activeGlow: 'rgba(255,174,94,0.28)', reachOuter: '#d39b69', reachMid: '#2f2118', previewOuter: 'rgba(151,109,76,0.56)', idleOuter: 'rgba(178,143,110,0.92)', text: '#ffe2c0' };
    }
    if (['aspd', 'move', 'projectilePctDmg', 'suppCap', 'gemLevel', 'expGain'].includes(statId)) {
        return { ...base, activeOuter: '#93e3e8', activeMid: '#2b6d79', activeGlow: 'rgba(102,223,235,0.28)', reachOuter: '#6fb8c7', reachMid: '#15303b', previewOuter: 'rgba(82,131,148,0.56)', idleOuter: 'rgba(124,175,191,0.92)', text: '#cbfbff' };
    }
    if (['crit', 'critDmg', 'chaosPctDmg', 'resChaos'].includes(statId)) {
        return { ...base, activeOuter: '#d5a5ff', activeMid: '#64378f', activeGlow: 'rgba(190,120,255,0.3)', reachOuter: '#a77bd4', reachMid: '#221732', previewOuter: 'rgba(118,90,156,0.56)', idleOuter: 'rgba(152,125,191,0.92)', text: '#efd9ff' };
    }
    if (['firePctDmg', 'resF'].includes(statId)) {
        return { ...base, activeOuter: '#ffb08d', activeMid: '#8c4030', activeGlow: 'rgba(255,130,94,0.3)', reachOuter: '#d08c72', reachMid: '#351a15', previewOuter: 'rgba(146,88,73,0.56)', idleOuter: 'rgba(183,129,118,0.92)', text: '#ffe1d2' };
    }
    if (['coldPctDmg', 'resC'].includes(statId)) {
        return { ...base, activeOuter: '#a5ddff', activeMid: '#356d95', activeGlow: 'rgba(128,208,255,0.3)', reachOuter: '#7db8d8', reachMid: '#172b39', previewOuter: 'rgba(84,123,148,0.56)', idleOuter: 'rgba(126,164,189,0.92)', text: '#dff5ff' };
    }
    if (['lightPctDmg', 'resL', 'elementalPctDmg', 'resAll', 'resPen'].includes(statId)) {
        return { ...base, activeOuter: '#f6dc8f', activeMid: '#8a6e30', activeGlow: 'rgba(255,214,91,0.28)', reachOuter: '#ceb768', reachMid: '#302815', previewOuter: 'rgba(151,133,73,0.56)', idleOuter: 'rgba(183,167,114,0.92)', text: '#fff0c0' };
    }
    return base;
}

function getPassiveNodePalette(node, active, reachable, visibility) {
    let hasMutation = !!(game && game.starWedge && game.starWedge.nodeMutations && game.starWedge.nodeMutations[node && node.id]);
    if (node && node.socketType === 'star_wedge') {
        return active
            ? { outer: '#f3ddff', mid: '#4d2d68', inner: '#13091d', glow: 'rgba(185,112,255,0.52)', text: '#f8eaff' }
            : { outer: '#b08bd4', mid: '#2b173a', inner: '#0f0a16', glow: 'rgba(142,95,188,0.28)', text: '#e5ccff' };
    }
    if (hasMutation) {
        return active
            ? { outer: '#ffc6ff', mid: '#653985', inner: '#1a1027', glow: 'rgba(219,123,255,0.52)', text: '#ffe8ff' }
            : { outer: '#b18bcc', mid: '#321f43', inner: '#151022', glow: 'rgba(167,111,204,0.24)', text: '#efd9ff' };
    }
    const special = node && (node.kind === 'apex' || node.kind === 'evolved' || node.kind === 'transcendent');
    const accent = getPassiveStatAccent(node && node.stat);
    if (special && active) {
        return {
            outer: node.kind === 'transcendent' ? '#fff1b2' : '#f4d788',
            mid: node.kind === 'transcendent' ? '#b17836' : '#8a6130',
            inner: '#fff8e7',
            glow: 'rgba(247,223,155,0.45)',
            text: '#fff0c6'
        };
    }
    if (special && reachable) {
        return {
            outer: node.kind === 'transcendent' ? '#d1b778' : '#a88b5f',
            mid: '#251b14',
            inner: '#2c3642',
            glow: 'rgba(173,192,224,0.18)',
            text: '#e1cfaa'
        };
    }
    if (special && visibility === 'preview') {
        return {
            outer: 'rgba(156,140,104,0.58)',
            mid: 'rgba(20,18,16,0.86)',
            inner: 'rgba(45,49,55,0.94)',
            glow: 'rgba(143,158,183,0.14)',
            text: '#aeb5bf'
        };
    }
    if (active) {
        return {
            outer: accent.activeOuter,
            mid: accent.activeMid,
            inner: '#fff3d6',
            glow: accent.activeGlow,
            text: accent.text
        };
    }
    if (reachable) {
        return {
            outer: accent.reachOuter,
            mid: accent.reachMid,
            inner: '#24303b',
            glow: accent.reachGlow,
            text: accent.text
        };
    }
    if (visibility === 'preview') {
        return {
            outer: accent.previewOuter,
            mid: accent.previewMid,
            inner: 'rgba(34,43,53,0.9)',
            glow: accent.previewGlow,
            text: accent.text
        };
    }
    return {
        outer: accent.idleOuter,
        mid: accent.idleMid,
        inner: accent.idleInner,
        glow: 'rgba(0,0,0,0)',
        text: accent.text
    };
}

function drawPassiveStarfield(ctx, bounds) {
    const w = bounds.maxX - bounds.minX;
    const h = bounds.maxY - bounds.minY;

    for (let i = 0; i < 180; i++) {
        const px = bounds.minX + ((i * 137.531) % w);
        const py = bounds.minY + ((i * 91.173) % h);
        const s = (i % 7 === 0) ? 2.2 : ((i % 3 === 0) ? 1.4 : 0.8);
        const a = (i % 5 === 0) ? 0.45 : 0.2;
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(210,225,255,${a})`;
        ctx.fill();
    }

    for (let i = 0; i < 28; i++) {
        const px = bounds.minX + ((i * 301.17) % w);
        const py = bounds.minY + ((i * 211.71) % h);
        const g = ctx.createRadialGradient(px, py, 0, px, py, 80 + (i % 4) * 18);
        g.addColorStop(0, 'rgba(90,120,170,0.09)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 100, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPassiveEvolutionAura(ctx) {
    if (!game || !game.passiveStarEvolution) return;
    let tips = Object.values(PASSIVE_TREE.nodes).filter(node => node.kind === 'transcendent');
    if (tips.length === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.88;
    tips.forEach(node => {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(node.x * 0.42, node.y * 0.42, node.x, node.y);
        ctx.strokeStyle = 'rgba(120,151,205,0.08)';
        ctx.lineWidth = 11;
        ctx.shadowColor = 'rgba(238,222,172,0.15)';
        ctx.shadowBlur = 18;
        ctx.stroke();
    });
    ctx.shadowBlur = 0;

    let sortedTips = [...tips].sort((a, b) => Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x));
    let outlineTips = sortedTips;
    if (sortedTips.length === 5) {
        outlineTips = [];
        let cursor = 0;
        for (let i = 0; i < 5; i++) {
            outlineTips.push(sortedTips[cursor]);
            cursor = (cursor + 2) % 5;
        }
    }
    ctx.beginPath();
    outlineTips.forEach((node, index) => {
        if (index === 0) ctx.moveTo(node.x, node.y);
        else ctx.lineTo(node.x, node.y);
    });
    ctx.closePath();
    ctx.strokeStyle = 'rgba(248,227,168,0.15)';
    ctx.lineWidth = 4;
    ctx.stroke();

    sortedTips.forEach(node => {
        let glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 120);
        glow.addColorStop(0, 'rgba(247,228,181,0.18)');
        glow.addColorStop(0.45, 'rgba(104,142,204,0.10)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 120, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.restore();
}

function drawPassiveLink(ctx, a, b, style) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const bend = Math.min(34, len * 0.08);
    const mx = (a.x + b.x) / 2 + nx * bend;
    const my = (a.y + b.y) / 2 + ny * bend;

    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(mx, my, b.x, b.y);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width;
    ctx.shadowColor = style.shadow || 'transparent';
    ctx.shadowBlur = style.blur || 0;
    ctx.stroke();

    if (style.innerStroke) {
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = style.innerStroke;
        ctx.lineWidth = Math.max(1, style.width * 0.38);
        ctx.shadowBlur = 0;
        ctx.stroke();
    }
}

function drawNodeOrnament(ctx, node, radius, palette, active, lightweightMode) {
    if (lightweightMode) return;
    ctx.save();
    ctx.translate(node.x, node.y);

    if (node.tier === 0) {
        ctx.rotate(performance.now() * 0.00008);
        for (let i = 0; i < 6; i++) {
            ctx.rotate(Math.PI / 3);
            ctx.beginPath();
            ctx.moveTo(radius + 4, 0);
            ctx.lineTo(radius + 11, -2.5);
            ctx.lineTo(radius + 11, 2.5);
            ctx.closePath();
            ctx.fillStyle = active ? 'rgba(245,223,173,0.65)' : 'rgba(120,140,156,0.34)';
            ctx.fill();
        }
    } else if (node.kind === 'apex' || node.kind === 'transcendent') {
        ctx.rotate(performance.now() * (node.kind === 'transcendent' ? 0.00012 : 0.00008));
        ctx.beginPath();
        traceStarShape(ctx, radius + (node.kind === 'transcendent' ? 6 : 4), radius * 0.58, 5);
        ctx.strokeStyle = active ? '#fff1c7' : 'rgba(186,163,120,0.8)';
        ctx.lineWidth = node.kind === 'transcendent' ? 1.5 : 1.25;
        ctx.stroke();
    } else if (node.kind === 'evolved') {
        ctx.rotate(Math.PI / 6);
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            let ang = (i / 6) * Math.PI * 2;
            let px = Math.cos(ang) * (radius + 3);
            let py = Math.sin(ang) * (radius + 3);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = active ? '#ffe4ab' : 'rgba(140,151,167,0.65)';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else if (node.kind === 'hub') {
        ctx.rotate(Math.PI / 4);
        ctx.strokeStyle = palette.outer;
        ctx.lineWidth = 1.25;
        ctx.strokeRect(-radius - 5, -radius - 5, (radius + 5) * 2, (radius + 5) * 2);
        ctx.rotate(-Math.PI / 4);
    } else if (node.tier >= 3 || node.kind === 'major') {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const ang = -Math.PI / 2 + (i / 8) * Math.PI * 2;
            const rr = i % 2 === 0 ? radius + 4 : radius + 1.5;
            const px = Math.cos(ang) * rr;
            const py = Math.sin(ang) * rr;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.strokeStyle = active ? '#f5dfad' : 'rgba(163,133,88,0.72)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
    }

    ctx.restore();
}

function drawPassiveNodeShape(ctx, node, radius, palette, active, reachable, visibility, revealAlpha, lightweightMode) {
    ctx.save();
    ctx.globalAlpha = revealAlpha;

    if (!lightweightMode && palette.glow && palette.glow !== 'rgba(0,0,0,0)') {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (node.tier >= 3 ? 12 : 8), 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(node.x, node.y, Math.max(1, radius * 0.35), node.x, node.y, radius + 14);
        glow.addColorStop(0, palette.glow);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fill();
    }

    const outerR = radius;
    const midR = Math.max(2, radius - 2.8);
    const innerR = Math.max(1.5, radius - 5.4);

    ctx.beginPath();
    ctx.arc(node.x, node.y, outerR, 0, Math.PI * 2);
    ctx.fillStyle = palette.outer;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(node.x, node.y, midR, 0, Math.PI * 2);
    ctx.fillStyle = palette.mid;
    ctx.fill();

    const core = ctx.createRadialGradient(node.x - radius * 0.28, node.y - radius * 0.35, 1, node.x, node.y, innerR + 1);
    core.addColorStop(0, active ? '#fff6de' : (reachable ? '#344454' : '#1f2730'));
    core.addColorStop(1, palette.inner);
    ctx.beginPath();
    ctx.arc(node.x, node.y, innerR, 0, Math.PI * 2);
    ctx.fillStyle = core;
    ctx.fill();

    if (active || reachable) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, innerR * 0.42, 0, Math.PI * 2);
        ctx.fillStyle = active ? '#fff8e7' : 'rgba(166,205,228,0.55)';
        ctx.fill();
    }

    drawNodeOrnament(ctx, node, radius, palette, active, lightweightMode);

    if (hoverNode && hoverNode.id === node.id) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2);
        ctx.strokeStyle = active ? 'rgba(255,244,210,0.75)' : 'rgba(141,187,219,0.48)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    ctx.restore();
}

function generateOrganicTree() {
    Object.keys(PASSIVE_TREE.nodes).forEach(key => delete PASSIVE_TREE.nodes[key]);
    PASSIVE_TREE.edges.length = 0;
    const edgeKeys = new Set();

    let nId = 0;
    function pickValidStat(theme, tier, seedIndex) {
        let pool = (PASSIVE_THEME_POOLS[theme] || PASSIVE_THEME_POOLS.center).filter(stat => P_STATS[stat] && P_STATS[stat].tiers && P_STATS[stat].tiers.includes(tier));
        if (pool.length === 0) pool = Object.keys(P_STATS).filter(stat => P_STATS[stat].tiers && P_STATS[stat].tiers.includes(tier));
        if (pool.length === 0) return 'flatHp';
        return pool[Math.abs(seedIndex) % pool.length];
    }
    function getTierValue(statKey, tier) {
        let statDef = P_STATS[statKey];
        if (!statDef) return tier === 3 ? 8 : (tier === 2 ? 4 : 2);
        if (tier === 0) return 10;
        if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
        if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
        return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
    }
    function addNode(x, y, tier, themeOrStat, meta) {
        if (Object.keys(PASSIVE_TREE.nodes).length >= PASSIVE_TARGET_NODES) return null;
        let statKey = P_STATS[themeOrStat] ? themeOrStat : pickValidStat(themeOrStat, tier, nId + ((meta && meta.depth) || 0) * 7 + ((meta && meta.lane) || 0) * 13);
        if (!P_STATS[statKey]) statKey = 'flatHp';
        let node = {
            id: 'n' + nId++,
            x: x * PASSIVE_WORLD_SCALE,
            y: y * PASSIVE_WORLD_SCALE,
            tier: tier,
            stat: statKey,
            val: getTierValue(statKey, tier),
            depth: Infinity,
            sector: meta && meta.sector ? meta.sector : null,
            kind: meta && meta.kind ? meta.kind : 'node'
        };
        PASSIVE_TREE.nodes[node.id] = node;
        return node;
    }
    function applyNodeSpec(node, spec, fallbackKind) {
        if (!node || !spec) return node;
        node.stat = spec.stat || node.stat;
        node.val = spec.val !== undefined ? spec.val : node.val;
        node.kind = spec.kind || fallbackKind || node.kind;
        node.title = spec.title || null;
        node.desc = spec.desc || null;
        node.effectLabel = spec.effectLabel || getPassiveEffectLabel(node);
        if (spec.requiresEvolution) node.requiresEvolution = true;
        if (spec.starIndex !== undefined) node.starIndex = spec.starIndex;
        return node;
    }
    function connect(aId, bId) {
        if (!aId || !bId || aId === bId) return;
        let key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        PASSIVE_TREE.edges.push({ from: aId, to: bId });
    }
    function buildAdjacencyMap() {
        let adj = new Map();
        Object.keys(PASSIVE_TREE.nodes).forEach(id => adj.set(id, new Set()));
        PASSIVE_TREE.edges.forEach(edge => {
            if (!adj.has(edge.from)) adj.set(edge.from, new Set());
            if (!adj.has(edge.to)) adj.set(edge.to, new Set());
            adj.get(edge.from).add(edge.to);
            adj.get(edge.to).add(edge.from);
        });
        return adj;
    }
    function ensureOuterHubNeighborConnections(minNeighbors) {
        let hubs = Object.values(PASSIVE_TREE.nodes).filter(node => node && node.kind === 'hub' && (node.depth || 0) >= 10);
        if (hubs.length <= 0) return;
        hubs.forEach(hub => {
            let adj = buildAdjacencyMap();
            let linked = adj.get(hub.id) || new Set();
            let need = Math.max(0, (minNeighbors || 0) - linked.size);
            if (need <= 0) return;
            let candidates = Object.values(PASSIVE_TREE.nodes)
                .filter(node => node && node.id !== hub.id)
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
            candidates.slice(0, need).forEach(node => connect(hub.id, node.id));
        });
    }


    const sectorThemes = ['templar', 'witch', 'shadow', 'ranger', 'duelist', 'marauder', 'witch', 'duelist'];
    const sectorCount = sectorThemes.length;
    const lanes = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
    const maxDepth = 13;

    let root = addNode(0, 0, 0, 'flatHp', { sector: 'center', kind: 'root', depth: 0, lane: 0 });
    let laneNodes = {};

    function classifyNode(depth, lane) {
        let laneAbs = Math.abs(lane);
        if (depth === 1 && laneAbs <= 1) return { tier: 2, kind: 'core' };
        if (depth === 6 && lane === 0) return { tier: 2, kind: 'hub' };
        if (depth === maxDepth && laneAbs === 3) return { tier: 2, kind: 'hub' };
        if (laneAbs === 3 && depth > 6 && depth < maxDepth) return { tier: 1, kind: 'path' };
        if (laneAbs === 4 && depth >= maxDepth - 1) return { tier: depth === maxDepth ? 2 : 1, kind: depth === maxDepth ? 'major' : 'path' };
        if (depth === maxDepth && laneAbs <= 1) return { tier: 3, kind: 'keystone' };
        if (depth % 4 === 0 || (depth >= maxDepth - 2 && laneAbs <= 2)) return { tier: 2, kind: 'major' };
        return { tier: 1, kind: 'path' };
    }

    for (let s = 0; s < sectorCount; s++) {
        let baseAngle = -Math.PI / 2 + (s / sectorCount) * Math.PI * 2;
        let theme = sectorThemes[s];
        laneNodes[s] = {};

        lanes.forEach(lane => {
            laneNodes[s][lane] = [];
            let prev = null;
            for (let depth = 1; depth <= maxDepth; depth++) {
                let laneAbs = Math.abs(lane);
                let radius = 164 + depth * 118 + laneAbs * 44;
                let angleDrift = lane * 0.104 + depth * lane * 0.006 + Math.sin((depth + s) * 0.45) * 0.018;
                let angle = baseAngle + angleDrift;
                let x = Math.cos(angle) * radius;
                let y = Math.sin(angle) * radius * 0.93;
                let shape = classifyNode(depth, lane);
                let node = addNode(x, y, shape.tier, theme, { sector: theme, kind: shape.kind, depth: depth, lane: lane });
                if (!node) break;
                if (shape.kind === 'deadend') {
                    node.val = Math.max(node.val, Math.round(getTierValue(node.stat, 3) * 1.45));
                } else if (shape.kind === 'core') {
                    let uniqueCoreStats = PASSIVE_CORE_GENERIC_STATS
                        .filter(stat => P_STATS[stat] && (P_STATS[stat].tiers || []).includes(shape.tier));
                    if (uniqueCoreStats.length === 0) uniqueCoreStats = ['flatHp'];
                    node.stat = uniqueCoreStats[(s + laneAbs + depth) % uniqueCoreStats.length];
                    node.val = getTierValue(node.stat, shape.tier);
                }
                laneNodes[s][lane].push(node);

                if (depth === 1 && lane === 0) connect(root.id, node.id);
                else if (prev) connect(prev.id, node.id);
                prev = node;
            }
        });

        for (let depth = 1; depth <= maxDepth; depth++) {
            for (let i = 0; i < lanes.length - 1; i++) {
                let laneA = lanes[i];
                let laneB = lanes[i + 1];
                let edgeOuter = Math.max(Math.abs(laneA), Math.abs(laneB));
                let shouldConnect = false;
                if (depth <= 2 && edgeOuter <= 1) shouldConnect = true;
                else if (depth % 3 === 0 && edgeOuter <= 2) shouldConnect = true;
                else if (depth >= maxDepth - 1 && edgeOuter <= 3) shouldConnect = true;
                else if (depth === maxDepth && edgeOuter === 4) shouldConnect = true;
                if (!shouldConnect) continue;
                let a = laneNodes[s][laneA][depth - 1];
                let b = laneNodes[s][laneB][depth - 1];
                if (a && b) connect(a.id, b.id);
            }
        }
    }

    for (let s = 0; s < sectorCount; s++) {
        let next = (s + 1) % sectorCount;
        for (let depth = 5; depth <= maxDepth; depth += 4) {
            let a = laneNodes[s][0][depth - 1];
            let b = laneNodes[next][0][depth - 1];
            if (a && b) connect(a.id, b.id);
        }
    }

    let baseOuterRadius = Object.values(PASSIVE_TREE.nodes).reduce((max, node) => Math.max(max, Math.hypot(node.x, node.y)), 0);
    let outerAnchors = Object.values(PASSIVE_TREE.nodes).filter(node => Math.hypot(node.x, node.y) >= baseOuterRadius - 240);
    PASSIVE_APEX_CONFIGS.forEach((config, index) => {
        let angle = -Math.PI / 2 + (index / PASSIVE_APEX_CONFIGS.length) * Math.PI * 2;
        let apexRadius = baseOuterRadius + 210;
        let apex = addNode(
            Math.cos(angle) * apexRadius,
            Math.sin(angle) * apexRadius * 0.92,
            3,
            config.stat,
            { sector: `star_${index}`, kind: 'apex', depth: maxDepth + 1, lane: index }
        );
        applyNodeSpec(apex, {
            title: config.title,
            stat: config.stat,
            val: config.val,
            kind: 'apex',
            desc: config.desc,
            starIndex: index
        }, 'apex');
        if (!apex) return;

        let anchors = outerAnchors
            .map(node => ({
                node: node,
                dist: Math.hypot(node.x - apex.x, node.y - apex.y),
                angleDiff: angleDistance(Math.atan2(node.y, node.x), angle)
            }))
            .filter(entry => entry.angleDiff <= 0.7)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 2)
            .map(entry => entry.node);
        if (anchors.length === 0) {
            anchors = outerAnchors
                .map(node => ({ node: node, dist: Math.hypot(node.x - apex.x, node.y - apex.y) }))
                .sort((a, b) => a.dist - b.dist)
                .slice(0, 2)
                .map(entry => entry.node);
        }
        anchors.forEach(node => connect(node.id, apex.id));

        let leftSpec = config.outerNodes[0];
        let rightSpec = config.outerNodes[1];
        let tipSpec = config.outerNodes[2];
        let branchRadius = baseOuterRadius + 360;
        let tipRadius = baseOuterRadius + 500;
        let leftNode = addNode(
            Math.cos(angle - 0.16) * branchRadius,
            Math.sin(angle - 0.16) * branchRadius * 0.91,
            3,
            leftSpec.stat,
            { sector: `star_${index}`, kind: leftSpec.kind, depth: maxDepth + 2, lane: -1 }
        );
        let rightNode = addNode(
            Math.cos(angle + 0.16) * branchRadius,
            Math.sin(angle + 0.16) * branchRadius * 0.91,
            3,
            rightSpec.stat,
            { sector: `star_${index}`, kind: rightSpec.kind, depth: maxDepth + 2, lane: 1 }
        );
        let tipNode = addNode(
            Math.cos(angle) * tipRadius,
            Math.sin(angle) * tipRadius * 0.9,
            3,
            tipSpec.stat,
            { sector: `star_${index}`, kind: tipSpec.kind, depth: maxDepth + 3, lane: 0 }
        );
        applyNodeSpec(leftNode, { ...leftSpec, requiresEvolution: true, starIndex: index }, leftSpec.kind);
        applyNodeSpec(rightNode, { ...rightSpec, requiresEvolution: true, starIndex: index }, rightSpec.kind);
        applyNodeSpec(tipNode, { ...tipSpec, requiresEvolution: true, starIndex: index }, tipSpec.kind);
        if (leftNode) connect(apex.id, leftNode.id);
        if (rightNode) connect(apex.id, rightNode.id);
        if (leftNode && tipNode) connect(leftNode.id, tipNode.id);
        if (rightNode && tipNode) connect(rightNode.id, tipNode.id);
    });

    ensureOuterHubNeighborConnections(4);

    // 시각적 겹침 완화
    let packed = Object.values(PASSIVE_TREE.nodes);
    for (let iter = 0; iter < 10; iter++) {
        for (let i = 0; i < packed.length; i++) {
            for (let j = i + 1; j < packed.length; j++) {
                let a = packed[i];
                let b = packed[j];
                if (a.id === 'n0' || b.id === 'n0') continue;
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = Math.hypot(dx, dy) || 0.001;
                let minDist = a.sector === b.sector ? 62 : 108;
                if (a.kind === 'apex' || b.kind === 'apex') minDist += 22;
                if (a.requiresEvolution || b.requiresEvolution) minDist += 18;
                if (dist >= minDist) continue;
                let push = (minDist - dist) * 0.5;
                let nx = dx / dist;
                let ny = dy / dist;
                a.x -= nx * push;
                a.y -= ny * push;
                b.x += nx * push;
                b.y += ny * push;
            }
        }
    }

    let nodes = Object.values(PASSIVE_TREE.nodes);
    PASSIVE_BOUNDS.minX = Math.min(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.maxX = Math.max(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.minY = Math.min(...nodes.map(node => node.y));
    PASSIVE_BOUNDS.maxY = Math.max(...nodes.map(node => node.y));
    // tree 구조가 바뀌면 렌더 캐시를 다시 생성해야 함
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('structure');
}

function computePassiveDepths() {
    Object.values(PASSIVE_TREE.nodes).forEach(node => node.depth = Infinity);
    let root = PASSIVE_TREE.nodes['n0'];
    if (!root) return;
    root.depth = 0;
    let queue = ['n0'];
    while (queue.length > 0) {
        let current = queue.shift();
        let currentDepth = PASSIVE_TREE.nodes[current].depth;
        PASSIVE_TREE.edges.forEach(edge => {
            let next = null;
            if (edge.from === current) next = edge.to;
            if (edge.to === current) next = edge.from;
            if (next && PASSIVE_TREE.nodes[next].depth === Infinity) {
                PASSIVE_TREE.nodes[next].depth = currentDepth + 1;
                queue.push(next);
            }
        });
    }
}
function polishPassiveLayout() {
    let nodes = Object.values(PASSIVE_TREE.nodes || {});
    if (nodes.length === 0) return;
    let minX = Math.min(...nodes.map(node => node.x));
    let maxX = Math.max(...nodes.map(node => node.x));
    let minY = Math.min(...nodes.map(node => node.y));
    let maxY = Math.max(...nodes.map(node => node.y));
    PASSIVE_BOUNDS.minX = minX;
    PASSIVE_BOUNDS.maxX = maxX;
    PASSIVE_BOUNDS.minY = minY;
    PASSIVE_BOUNDS.maxY = maxY;

    let centerX = (minX + maxX) * 0.5;
    let centerY = (minY + maxY) * 0.5;
    nodes.forEach(node => {
        node.x -= centerX;
        node.y -= centerY;
    });
}
function applyPassiveSpecializations() {
    const used = new Set();
    const kindPriority = { keystone: 0, deadend: 1, major: 2, hub: 3, core: 4, path: 5 };
    PASSIVE_SPECIAL_NODE_CONFIGS.forEach(config => {
        let candidates = Object.values(PASSIVE_TREE.nodes)
            .filter(node => node && node.sector === config.sector)
            .filter(node => (config.kinds || []).includes(node.kind))
            .filter(node => node.id !== 'n0' && !used.has(node.id));
        candidates.sort((a, b) => {
            let kindDelta = (kindPriority[a.kind] ?? 99) - (kindPriority[b.kind] ?? 99);
            if (kindDelta !== 0) return kindDelta;
            let radiusDelta = Math.hypot(b.x, b.y) - Math.hypot(a.x, a.y);
            if (radiusDelta !== 0) return radiusDelta;
            return a.id.localeCompare(b.id);
        });
        let node = candidates[0];
        if (!node) return;
        used.add(node.id);
        node.stat = config.stat;
        node.val = config.val;
        node.title = config.title;
        node.desc = config.desc;
        node.effectLabel = `${getStatName(config.stat)} +${formatValue(config.stat, config.val)}${P_STATS[config.stat] && P_STATS[config.stat].isPct ? '%' : ''}`;
    });
}
function bootstrapPassiveTreeOnceReady() {
    generateOrganicTree();
    applyPassiveSpecializations();
    assignStarWedgeSockets();
    polishPassiveLayout();
    computePassiveDepths();
    return true;
}

bootstrapPassiveTreeOnceReady();

function isPassiveNodeAvailable(nodeOrId) {
    let node = typeof nodeOrId === 'string' ? PASSIVE_TREE.nodes[nodeOrId] : nodeOrId;
    return !!node && (!node.requiresEvolution || !!(game && game.passiveStarEvolution));
}

function getPassiveApexNodeIds() {
    return Object.values(PASSIVE_TREE.nodes)
        .filter(node => node.kind === 'apex')
        .map(node => node.id);
}

function unlockPassiveStarEvolution(options) {
    options = options || {};
    if (!game || game.passiveStarEvolution) return false;
    let apexIds = getPassiveApexNodeIds();
    if (apexIds.length === 0) return false;
    let owned = new Set(game.passives || []);
    if (!apexIds.every(id => owned.has(id))) return false;

    game.passiveStarEvolution = true;
    apexIds.forEach(id => revealAroundNode(id, {
        forcePulse: !options.silent,
        noBurst: !!options.silent,
        radius: PASSIVE_DISCOVERY_RADIUS + 240,
        edgeDepth: 2
    }));
    game.noti.char = true;

    if (!options.silent) {
        addLog('✨ 별의 공명이 일어납니다.', 'loot-rare');
        queueTutorialNotice(
            'passive_star_evolution',
            '성좌 진화',
            '별끝 특수 노드 5개를 모두 활성화 했습니다.\n외곽 노드가 확장되며 훨씬 강한 패시브가 드러납니다.\n동시에 별의 공명 효과로 피해, 생명력, 이동 속도가 추가로 상승합니다.',
            'tab-char'
        );
    }
    return true;
}

function ensureStarWedgeState() {
    game.starWedge = (game.starWedge && typeof game.starWedge === 'object') ? game.starWedge : {};
    if (!Array.isArray(game.starWedge.wedges)) game.starWedge.wedges = [];
    if (!Array.isArray(game.starWedge.sockets)) game.starWedge.sockets = [];
    if (!game.starWedge.nodeMutations || typeof game.starWedge.nodeMutations !== 'object') game.starWedge.nodeMutations = {};
    if (!Number.isFinite(game.starWedge.skyRiftGauge)) game.starWedge.skyRiftGauge = 0;
    game.starWedge.skyRiftGauge = clampNumber(game.starWedge.skyRiftGauge, 0, 100);
    game.starWedge.entriesCleared = Math.max(0, Math.floor(game.starWedge.entriesCleared || 0));
    game.starWedge.skyRiftReady = !!game.starWedge.skyRiftReady;
    game.starWedge.firstClearDone = !!game.starWedge.firstClearDone;
    game.starWedge.activeMeteorTier = Number.isFinite(game.starWedge.activeMeteorTier) ? Math.max(1, Math.floor(game.starWedge.activeMeteorTier)) : null;
    if (!Number.isFinite(game.starWedge.selectedWedgeId) || !(game.starWedge.wedges || []).some(w => w.id === game.starWedge.selectedWedgeId)) game.starWedge.selectedWedgeId = null;
    return game.starWedge;
}

function isStarWedgeNodeMutable(node) {
    if (!node) return false;
    if (node.id === 'n0') return false;
    if (node.socketType === 'star_wedge') return false;
    if (['apex', 'evolved', 'transcendent', 'core', 'hub', 'keystone'].includes(node.kind)) return false;
    return true;
}

function getStarWedgeSocketNodeIds() {
    return Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.socketType === 'star_wedge').map(node => node.id);
}

function assignStarWedgeSockets() {
    let st = (game && game.starWedge) || {};
    let unlocked = !!st.unlocked;
    let hubs = Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.kind === 'hub');
    let minHubDistance = 2;
    let edgeMap = {};
    (PASSIVE_TREE.edges || []).forEach(edge => {
        edgeMap[edge.from] = edgeMap[edge.from] || [];
        edgeMap[edge.to] = edgeMap[edge.to] || [];
        edgeMap[edge.from].push(edge.to);
        edgeMap[edge.to].push(edge.from);
    });
    function getHubDistance(a, b) {
        if (a === b) return 0;
        let q = [{ id: a, d: 0 }];
        let seen = new Set([a]);
        while (q.length) {
            let cur = q.shift();
            let nexts = edgeMap[cur.id] || [];
            for (let i = 0; i < nexts.length; i++) {
                let nid = nexts[i];
                if (seen.has(nid)) continue;
                let nd = cur.d + 1;
                if (nid === b) return nd;
                if (nd <= minHubDistance) q.push({ id: nid, d: nd });
                seen.add(nid);
            }
        }
        return Number.POSITIVE_INFINITY;
    }
    let selectedHubIds = [];
    hubs.sort((a, b) => String(a.id).localeCompare(String(b.id))).forEach(node => {
        let tooClose = selectedHubIds.some(otherId => getHubDistance(node.id, otherId) < minHubDistance);
        if (!tooClose) selectedHubIds.push(node.id);
    });
    hubs.forEach(node => {
        node.socketType = null;
    });
    hubs.forEach(node => {
        if (unlocked && selectedHubIds.includes(node.id)) {
            node.socketType = 'star_wedge';
            node.title = '별쐐기 슬롯';
            node.desc = '별쐐기 장착 전용 슬롯입니다. 장착 시 주변 노드(1~3경로)와 슬롯 자신을 변성시킬 수 있습니다.';
        } else {
            node.socketType = null;
            node.desc = node.desc || '';
        }
    });
    st.sockets = (st.sockets || []).filter(entry => selectedHubIds.includes(entry.nodeId));
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('structure');
}

function createRandomStarWedgeLine() {
    let pick = rndChoice(STAR_WEDGE_OPTION_POOL);
    let boosted = Math.random() < 0.04;
    let val;
    if (Number.isFinite(pick.step) && pick.step < 1) {
        let span = Math.floor((pick.max - pick.min) / pick.step);
        val = pick.min + (Math.floor(Math.random() * (span + 1)) * pick.step);
        if (boosted) val = Math.round((val * 1.25) * 10) / 10;
        else val = Math.round(val * 10) / 10;
    } else {
        val = pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1));
        if (boosted) val = Math.floor(val * 1.25);
    }
    return { stat: pick.stat, val: val, boosted: boosted };
}

function createStarWedgeItem() {
    let coreLine = createRandomStarWedgeLine();
    return { id: Date.now() + Math.floor(Math.random() * 100000), lines: [createRandomStarWedgeLine(), createRandomStarWedgeLine(), createRandomStarWedgeLine(), coreLine] };
}

function getStarWedgeById(wedgeId) {
    let st = ensureStarWedgeState();
    return (st.wedges || []).find(w => w.id === wedgeId) || null;
}

function recalculateStarWedgeMutations() {
    let st = ensureStarWedgeState();
    st.nodeMutations = {};
    let conflictNodes = new Set();
    (st.sockets || []).forEach(socket => {
        let wedge = getStarWedgeById(socket.wedgeId);
        let center = PASSIVE_TREE.nodes[socket.nodeId];
        if (!wedge || !center) return;
        let queue = [{ id: center.id, dist: 0 }];
        let seen = new Set([center.id]);
        while (queue.length) {
            let cur = queue.shift();
            PASSIVE_TREE.edges.forEach(edge => {
                let next = null;
                if (edge.from === cur.id) next = edge.to;
                else if (edge.to === cur.id) next = edge.from;
                if (!next || seen.has(next)) return;
                let nextDist = cur.dist + 1;
                if (nextDist > STAR_WEDGE_RADIUS) return;
                seen.add(next);
                queue.push({ id: next, dist: nextDist });
                let line = wedge.lines[nextDist - 1];
                let node = PASSIVE_TREE.nodes[next];
                if (!line || !isStarWedgeNodeMutable(node)) return;
                if (conflictNodes.has(next)) return;
                if (st.nodeMutations[next]) {
                    delete st.nodeMutations[next];
                    conflictNodes.add(next);
                    return;
                }
                st.nodeMutations[next] = {
                    wedgeId: wedge.id,
                    socketNodeId: center.id,
                    lineIndex: nextDist - 1,
                    originalStat: node.stat,
                    originalVal: node.val,
                    currentStat: line.stat,
                    currentVal: line.val
                };
            });
        }
        let coreLine = Array.isArray(wedge.lines) ? wedge.lines[3] : null;
        if (coreLine && coreLine.stat) {
            if (conflictNodes.has(center.id)) return;
            if (st.nodeMutations[center.id]) {
                delete st.nodeMutations[center.id];
                conflictNodes.add(center.id);
                return;
            }
            st.nodeMutations[center.id] = {
                wedgeId: wedge.id,
                socketNodeId: center.id,
                lineIndex: 3,
                originalStat: center.stat,
                originalVal: center.val,
                currentStat: coreLine.stat,
                currentVal: coreLine.val
            };
        }
    });
}

function tryUnlockMeteorContentByProgress() {
    let st = ensureStarWedgeState();
    if (st.unlocked || !getStarWedgeUnlockReady()) return false;
    st.unlocked = true;
    assignStarWedgeSockets();
    recalculateStarWedgeMutations();
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('structure');
    addLog('☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다.', 'loot-unique');
    queueTutorialNotice('meteor_unlocked', '운석 낙하 지점', '루프 7 이후 액트 7을 넘긴 사냥에서 하늘의 균열이 열립니다.\n게이지를 100%까지 채우면 운석 낙하 지점에 1회 입장할 수 있습니다.', 'tab-map');
    return true;
}

function gainSkyRiftGaugeFromCombat(zone, enemy) {
    let st = ensureStarWedgeState();
    if (!st.unlocked || st.skyRiftReady) return;
    if (!zone) return;
    let eligible = (zone.type === 'act' && zone.id >= STAR_WEDGE_UNLOCK_ACT) || zone.type === 'abyss' || zone.type === 'labyrinth';
    if (!eligible) return;
    let gain = enemy && enemy.isBoss ? 3.8 : (enemy && enemy.isElite ? 1.6 : 0.35);
    st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + gain, 0, 100);
    let tier = Math.max(1, Math.floor(zone.tier || 1));
    st.skyRiftMinTier = Number.isFinite(st.skyRiftMinTier) ? Math.min(st.skyRiftMinTier, tier) : tier;
    if (st.skyRiftGauge >= 100 && !st.skyRiftReady) {
        st.skyRiftGauge = 100;
        st.skyRiftReady = true;
        addLog('☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다.', 'loot-rare');
        game.noti.map = true;
    }
}

function grantMeteorEncounterRewards() {
    let st = ensureStarWedgeState();
    let shard = 17 + Math.floor(Math.random() * 40);
    awardCurrency('meteorShard', shard);
    addLog(`☄️ 운석 파편 +${shard}`, 'loot-rare');
    if (!st.firstClearDone) {
        st.firstClearDone = true;
        awardCurrency('incompleteStarWedge', 1);
        addLog('☄️ 검은 별의 파편은 나무의 성장을 거부한다. 별쐐기 하나가 차갑게 식어 있다.', 'loot-unique');
    } else {
        if (Math.random() < 0.17) {
            awardCurrency('incompleteStarWedge', 1);
            addLog('☄️ 불완전한 별쐐기를 주웠습니다.', 'loot-magic');
        }
        if (Math.random() < 0.027) {
            let wedge = createStarWedgeItem();
            st.wedges.push(wedge);
            awardCurrency('starWedge', 1);
            addLog('☄️ 완성된 별쐐기가 떨어졌다!', 'loot-unique');
        }
    }
}

function craftIncompleteStarWedge() {
    if ((game.currencies.meteorShard || 0) < 49) return addLog('운석 파편이 부족합니다. (필요: 49)', 'attack-monster');
    game.currencies.meteorShard -= 49;
    awardCurrency('incompleteStarWedge', 1);
    addLog('🔧 운석 파편을 응축해 불완전한 별쐐기를 만들었습니다.', 'loot-magic');
    updateStaticUI();
}

function craftCompleteStarWedge() {
    let st = ensureStarWedgeState();
    if ((game.currencies.incompleteStarWedge || 0) < 1) return addLog('불완전한 별쐐기가 필요합니다.', 'attack-monster');
    if ((game.currencies.meteorShard || 0) < 77) return addLog('운석 파편이 부족합니다. (필요: 77)', 'attack-monster');
    game.currencies.incompleteStarWedge--;
    game.currencies.meteorShard -= 77;
    let wedge = createStarWedgeItem();
    st.wedges.push(wedge);
    awardCurrency('starWedge', 1);
    addLog('🔧 별쐐기를 완성했습니다.', 'loot-unique');
    updateStaticUI();
}

function rerollStarWedge(wedgeId, keepIndex) {
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return;
    let keepIndexes = [];
    let meteorCost = 23;
    if (keepIndex === 'single' || keepIndex === 1) keepIndexes = [0];
    if (keepIndex === 'double' || keepIndex === 2) {
        keepIndexes = [0, 1];
        meteorCost = 230;
    }
    if ((game.currencies.meteorShard || 0) < meteorCost) return addLog(`운석 파편이 부족합니다. (필요: ${meteorCost})`, 'attack-monster');
    if (keepIndexes.length > 0 && (game.currencies.incompleteStarWedge || 0) <= 0) return addLog('옵션 고정 리롤에는 불완전한 별쐐기가 필요합니다.', 'attack-monster');
    game.currencies.meteorShard -= meteorCost;
    if (keepIndexes.length > 0) game.currencies.incompleteStarWedge--;
    wedge.lines = wedge.lines.map((line, idx) => keepIndexes.includes(idx) ? line : createRandomStarWedgeLine());
    addLog('☄️ 나무의 결이 끊어지고, 새로운 효과가 혼돈 속에서 벼려졌다.', 'loot-unique');
    if (!((game.journalEntries || []).includes('star_wedge'))) unlockJournalEntry('star_wedge');
    recalculateStarWedgeMutations();
    updateStaticUI();
}

function destroyStarWedge(wedgeId) {
    let st = ensureStarWedgeState();
    let target = getStarWedgeById(wedgeId);
    if (!target) return addLog('파괴할 별쐐기를 찾을 수 없습니다.', 'attack-monster');
    if (!confirm(`별쐐기 #${wedgeId % 10000} 를 파괴할까요?`)) return;
    st.wedges = (st.wedges || []).filter(w => w.id !== wedgeId);
    st.sockets = (st.sockets || []).filter(entry => entry.wedgeId !== wedgeId);
    if (st.selectedWedgeId === wedgeId) st.selectedWedgeId = null;
    game.currencies.starWedge = Math.max(0, (game.currencies.starWedge || 0) - 1);
    recalculateStarWedgeMutations();
    addLog('💥 별쐐기를 파괴했습니다.', 'attack-monster');
    updateStaticUI();
}

function socketStarWedgeOnNode(nodeId, wedgeId) {
    let st = ensureStarWedgeState();
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.socketType !== 'star_wedge') return addLog('별쐐기 슬롯에만 장착할 수 있습니다.', 'attack-monster');
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return addLog('장착할 별쐐기를 찾을 수 없습니다.', 'attack-monster');
    st.sockets = (st.sockets || []).filter(v => v.nodeId !== nodeId && v.wedgeId !== wedgeId);
    st.sockets.push({ nodeId: nodeId, wedgeId: wedgeId });
    recalculateStarWedgeMutations();
    addLog('☄️ 나무의 결이 끊어지고, 새로운 효과가 혼돈 속에서 벼려졌다.', 'loot-unique');
    if (!((game.journalEntries || []).includes('star_wedge'))) unlockJournalEntry('star_wedge');
    updateStaticUI();
}

function unsocketStarWedge(nodeId) {
    let st = ensureStarWedgeState();
    let before = (st.sockets || []).length;
    st.sockets = (st.sockets || []).filter(v => v.nodeId !== nodeId);
    if (st.sockets.length === before) return;
    recalculateStarWedgeMutations();
    addLog('☄️ 별쐐기를 슬롯에서 분리했습니다.', 'attack-monster');
    updateStaticUI();
}

function beginStarWedgeSocketSelection(wedgeId) {
    let st = ensureStarWedgeState();
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return addLog('선택한 별쐐기를 찾을 수 없습니다.', 'attack-monster');
    if (st.selectedWedgeId === wedgeId) {
        st.selectedWedgeId = null;
        addLog('별쐐기 슬롯 선택을 취소했습니다.', 'attack-monster');
        updateStaticUI();
        return;
    }
    st.selectedWedgeId = wedgeId;
    addLog('☄️ 패시브 트리에서 장착할 별쐐기 슬롯을 클릭하세요.', 'season-up');
    updateStaticUI();
}

function calculateReachableNodes() {
    reachableNodes.clear();
    if (isPassiveNodeAvailable('n0')) reachableNodes.add('n0');
    if (!game) return;
    (game.passives || []).forEach(id => {
        if (isPassiveNodeAvailable(id)) reachableNodes.add(id);
    });
    PASSIVE_TREE.edges.forEach(edge => {
        if (!isPassiveNodeAvailable(edge.from) || !isPassiveNodeAvailable(edge.to)) return;
        if ((game.passives || []).includes(edge.from)) reachableNodes.add(edge.to);
        if ((game.passives || []).includes(edge.to)) reachableNodes.add(edge.from);
    });
    // reachable 집합이 바뀌면 링크/후광 상태 캐시 갱신
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
}

function getPassiveLinkedNodeIds(nodeId, maxDepth) {
    let rootId = nodeId;
    if (!isPassiveNodeAvailable(rootId)) return [];
    let visited = new Set([rootId]);
    let frontier = [rootId];
    let depthLimit = Math.max(0, maxDepth || 0);
    for (let depth = 0; depth < depthLimit; depth++) {
        let nextFrontier = [];
        frontier.forEach(current => {
            PASSIVE_TREE.edges.forEach(edge => {
                let next = null;
                if (edge.from === current) next = edge.to;
                else if (edge.to === current) next = edge.from;
                if (!isPassiveNodeAvailable(next)) return;
                if (!next || visited.has(next)) return;
                visited.add(next);
                nextFrontier.push(next);
            });
        });
        if (nextFrontier.length === 0) break;
        frontier = nextFrontier;
    }
    visited.delete(rootId);
    return Array.from(visited);
}

function isPassiveLocalReveal(origin, node, radius, maxDepthGap) {
    if (!origin || !node || origin.id === node.id) return false;
    if (Math.hypot(node.x - origin.x, node.y - origin.y) > radius) return false;
    if (origin.id === 'n0') return (node.depth || 0) <= 1;
    if (!origin.sector || !node.sector || origin.sector !== node.sector) return false;
    return Math.abs((origin.depth || 0) - (node.depth || 0)) <= maxDepthGap;
}

function refreshPassiveVisibility() {
    if (!game) {
        discoveredPassiveNodes = new Set(['n0']);
        previewPassiveNodes = new Set(['n0']);
        return;
    }
    discoveredPassiveNodes = new Set((game.discoveredPassives || []).filter(id => isPassiveNodeAvailable(id)));
    discoveredPassiveNodes.add('n0');
    (game.passives || []).forEach(id => {
        if (isPassiveNodeAvailable(id)) discoveredPassiveNodes.add(id);
    });
    previewPassiveNodes = new Set(discoveredPassiveNodes);
    let previewSeeds = Array.from(new Set((game.passives || []).filter(id => isPassiveNodeAvailable(id))));
    let allNodes = Object.values(PASSIVE_TREE.nodes).filter(node => isPassiveNodeAvailable(node));
    previewSeeds.forEach(id => {
        let src = PASSIVE_TREE.nodes[id];
        if (!src) return;
        getPassiveLinkedNodeIds(id, PASSIVE_PREVIEW_EDGE_DEPTH).forEach(linkedId => {
            if (!discoveredPassiveNodes.has(linkedId)) previewPassiveNodes.add(linkedId);
        });
        allNodes.forEach(node => {
            if (discoveredPassiveNodes.has(node.id)) return;
            if (isPassiveLocalReveal(src, node, PASSIVE_PREVIEW_RADIUS, 1)) previewPassiveNodes.add(node.id);
        });
    });
    // visibility 집합 변경 시 상태 캐시 갱신
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
}

function revealAroundNode(nodeId, options) {
    options = options || {};
    let origin = PASSIVE_TREE.nodes[nodeId];
    if (!origin || !isPassiveNodeAvailable(origin)) return;
    let radius = options.radius || PASSIVE_DISCOVERY_RADIUS;
    let edgeDepth = options.edgeDepth !== undefined ? options.edgeDepth : (nodeId === 'n0' ? PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH : PASSIVE_DISCOVERY_EDGE_DEPTH);
    let newlyDiscovered = [];
    let discoverIds = new Set([nodeId]);
    getPassiveLinkedNodeIds(nodeId, edgeDepth).forEach(id => discoverIds.add(id));
    Object.values(PASSIVE_TREE.nodes).forEach(node => {
        if (!isPassiveNodeAvailable(node)) return;
        if (isPassiveLocalReveal(origin, node, radius, nodeId === 'n0' ? 1 : 2)) discoverIds.add(node.id);
    });
    discoverIds.forEach(id => {
        if (!(game.discoveredPassives || []).includes(id)) {
            game.discoveredPassives.push(id);
            newlyDiscovered.push(id);
        }
    });
    if (!options.noBurst && (newlyDiscovered.length > 0 || options.forcePulse)) {
        passiveRevealBursts.push({
            originId: nodeId,
            nodeIds: newlyDiscovered,
            x: origin.x,
            y: origin.y,
            radius: radius,
            startTime: performance.now(),
            duration: 900
        });
    }
    refreshPassiveVisibility();
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
}

function cleanupPassiveBursts() {
    let now = performance.now();
    passiveRevealBursts = passiveRevealBursts.filter(burst => now - burst.startTime <= burst.duration + 250);
}

function getPassiveVisibility(nodeId) {
    if (!isPassiveNodeAvailable(nodeId)) return 'hidden';
    if (discoveredPassiveNodes.has(nodeId)) return 'discovered';
    if (previewPassiveNodes.has(nodeId)) return 'preview';
    return 'hidden';
}

function getNodeRevealAmount(node) {
    let visibility = getPassiveVisibility(node.id);
    if (visibility === 'hidden') return 0;
    let amount = visibility === 'preview' ? 0.14 : 1;
    let now = performance.now();
    passiveRevealBursts.forEach(burst => {
        if (burst.nodeIds.includes(node.id)) {
            let progress = clampNumber((now - burst.startTime) / burst.duration, 0, 1);
            let dist = Math.hypot(node.x - burst.x, node.y - burst.y);
            let delay = clampNumber((dist / Math.max(1, burst.radius)) * 0.55, 0, 0.65);
            let anim = clampNumber((progress - delay) / 0.24, 0, 1);
            amount = Math.max(amount, anim);
        }
    });
    return amount;
}

function getEntryStatBase(statKey) {
    const stat = P_STATS[statKey] || {};
    if (statKey === 'suppCap') return 1;
    if (stat.m !== undefined) return stat.m;
    if (stat.s !== undefined) return stat.s;
    if (stat.k !== undefined) return stat.k * 0.5;
    return 1;
}
function getMajorStatBase(statKey) {
    const stat = P_STATS[statKey] || {};
    if (statKey === 'suppCap') return 1;
    if (stat.k !== undefined) return stat.k;
    if (stat.m !== undefined) return stat.m;
    if (stat.s !== undefined) return stat.s;
    return 1;
}
function scaleClassStat(statKey, baseValue, multiplier) {
    if (statKey === 'suppCap') return 1;
    let scaled = baseValue * multiplier;
    if (statKey === 'regen' || statKey === 'leech') return Math.max(0.1, Math.round(scaled * 10) / 10);
    return Math.max(1, Math.round(scaled));
}
function getClassTreeDef(clsKey) {
    let t = CLASS_TEMPLATES[clsKey];
    if (!t) return {};
    let entry1 = scaleClassStat(t.m1, getEntryStatBase(t.m1), 1.5);
    let entry2 = scaleClassStat(t.m2, getEntryStatBase(t.m2), 1.5);
    let entryDef = scaleClassStat(t.d, getEntryStatBase(t.d), 1.5);
    let major1 = scaleClassStat(t.m1, getMajorStatBase(t.m1), 1.5);
    let major2 = scaleClassStat(t.m2, getMajorStatBase(t.m2), 1.5);
    let majorDef = scaleClassStat(t.d, getMajorStatBase(t.d), 1.5);
    let final1 = scaleClassStat(t.m1, getMajorStatBase(t.m1), 2.2);
    let final2 = scaleClassStat(t.m2, getMajorStatBase(t.m2), 2.2);
    let finalDef = scaleClassStat(t.d, getMajorStatBase(t.d), 2.2);
    let ultByClass = {
        templar: { stat: 'resAll', val: 18 },
        witch: { stat: 'aoePctDmg', val: 38 },
        shadow: { stat: 'chaosPctDmg', val: 52 },
        ranger: { stat: 'projectilePctDmg', val: 58 },
        duelist: { stat: 'ds', val: 24 },
        marauder: { stat: 'dr', val: 22 },
        elementalist: { stat: 'elementalPctDmg', val: 56 },
        assassin: { stat: 'critDmg', val: 90 },
        berserker: { stat: 'physPctDmg', val: 60 },
        guardian: { stat: 'flatHp', val: 260 },
        necromancer: { stat: 'gemLevel', val: 2 }
    };
    let ult = ultByClass[clsKey] || { stat: 'pctDmg', val: 100 };
    let tree = {
        n1: { stat: t.m1, val: entry1, req: null },
        n2: { stat: t.m2, val: entry2, req: 'n1' },
        n3: { stat: t.d, val: entryDef, req: 'n1' },
        n4: { stat: t.m1, val: major1, req: 'n2' },
        n5: { stat: clsKey === 'ranger' ? 'aspd' : t.m2, val: clsKey === 'ranger' ? scaleClassStat('aspd', getMajorStatBase('aspd'), 1.55) : major2, req: ['n2', 'n3'] },
        n6: { stat: clsKey === 'guardian' ? 'resAll' : t.d, val: clsKey === 'guardian' ? scaleClassStat('resAll', getMajorStatBase('resAll'), 1.65) : majorDef, req: 'n3' },
        n7: { stat: t.m1, val: final1, req: 'n4' },
        n8: { stat: t.m2, val: final2, req: 'n5' },
        n9: { stat: t.d, val: finalDef, req: 'n6' },
        n10: { stat: ult.stat, val: ult.val, req: ['n7', 'n8', 'n9'] }
    };
    if (clsKey === 'warrior') {
        tree.n5 = { stat: 'physIgnore', val: scaleClassStat('physIgnore', getMajorStatBase('physIgnore'), 1.2), req: ['n2', 'n3'] };
        tree.n10 = { stat: 'physIgnore', val: 18, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'assassin') {
        tree.n6 = { stat: 'physIgnore', val: scaleClassStat('physIgnore', getMajorStatBase('physIgnore'), 1.15), req: 'n3' };
    } else if (clsKey === 'elementalist') {
        tree.n6 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.2), req: 'n3' };
        tree.n10 = { stat: 'resPen', val: 16, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'warlock') {
        tree.n8 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.15), req: 'n5' };
    } else if (clsKey === 'guardian') {
        tree.n5 = { stat: 'dr', val: scaleClassStat('dr', getMajorStatBase('dr'), 1.55), req: ['n2', 'n3'] };
        tree.n6 = { stat: 'minDmgRoll', val: scaleClassStat('minDmgRoll', getMajorStatBase('minDmgRoll'), 1.2), req: 'n3' };
        tree.n8 = { stat: 'maxDmgRoll', val: scaleClassStat('maxDmgRoll', getMajorStatBase('maxDmgRoll'), 1.35), req: 'n5' };
        tree.n10 = { stat: 'pctHp', val: 38, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'inquisitor') {
        tree.n9 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.3), req: 'n6' };
        tree.n10 = { stat: 'resPen', val: 18, req: ['n7', 'n8', 'n9'] };
    }
    if ((game.completedTrials || []).includes('trial_4')) {
        const coreByClass = {
            warrior: [{ stat: 'physPctDmg', val: 45 }, { stat: 'dr', val: 14 }],
            gladiator: [{ stat: 'aspd', val: 22 }, { stat: 'ds', val: 26 }],
            assassin: [{ stat: 'critDmg', val: 80 }, { stat: 'crit', val: 18 }],
            ranger: [{ stat: 'projectilePctDmg', val: 50 }, { stat: 'move', val: 20 }],
            elementalist: [{ stat: 'elementalPctDmg', val: 52 }, { stat: 'resPen', val: 16 }],
            warlock: [{ stat: 'chaosPctDmg', val: 42 }, { stat: 'dotPctDmg', val: 28 }],
            guardian: [{ stat: 'flatHp', val: 320 }, { stat: 'dr', val: 18 }],
            inquisitor: [{ stat: 'suppCap', val: 1 }, { stat: 'gemLevel', val: 2 }]
        };
        let cores = coreByClass[clsKey] || [{ stat: 'pctDmg', val: 55 }, { stat: 'critDmg', val: 45 }];
        tree.n11 = { stat: cores[0].stat, val: cores[0].val, req: 'n10', exclusive: 'n12' };
        tree.n12 = { stat: cores[1].stat, val: cores[1].val, req: 'n10', exclusive: 'n11' };
    }
    return tree;
}

game = JSON.parse(JSON.stringify(defaultGame));
let pTimer = 0;
let progressStallTicks = 0;
let itemIdCounter = 0;
let lastTime = Date.now();
let gameTickHandle = null;
let autoSaveHandle = null;
let hoverNode = null;
let mouseX = 0;
let mouseY = 0;
let camX = 0;
let camY = 0;
let camZoom = 0.3;
let passiveCameraInitialized = false;
var passiveCanvasMetrics = { width: 0, height: 0, dpr: 1 };
var passiveRenderCache = {
    structureDirty: true,
    stateDirty: true,
    nodes: [],
    edges: [],
    glowNodes: [],
    activeEdges: [],
    hoverGrid: new Map(),
    cellSize: 180,
    stateSignature: ''
};
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragDist = 0;
var activeTooltipId = null;
let activeItemTooltipToken = null;
let pendingHeavyUiRefresh = false;
let battleFx = [];
let battleFxId = 0;
let battleVisualState = {
    projectiles: [],
    damageTexts: [],
    skillProjectiles: [],
    skillEffects: [],
    skillPlayback: null,
    lastAutoSwingId: 0,
    lastAutoSkillAt: 0,
    processedFxIds: new Set(),
    enemyGhostPos: {},
    playerPos: null,
    playerAdvanceBlend: 0,
    playerAttackBlend: 0,
    playerHurtBlend: 0,
    playerDownBlend: 0,
    lastNow: 0,
    advanceDesired: false,
    advanceChangedAt: 0
};
const DEBUG_BATTLE_ANCHORS = false;
const HERO_SPRITE_CONFIG = { cols: 6, rows: 5, drawHeight: 58, anchorX: 0.5, anchorY: 0.92 };
const HERO_MOTIONS = {
    walk: [0, 1, 2, 3],
    run: [4, 5, 6, 7],
    hit: [8, 9],
    idle: [10, 11, 12, 13],
    slash: [14, 15, 16, 17],
    throw: [18, 19, 20, 21],
    cast: [22, 23, 24, 25],
    bow: [26, 27, 28, 29]
};
const HERO_FRAME_META = {
    0: { motion: 'walk', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    1: { motion: 'walk', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    2: { motion: 'walk', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 124, y: 153 }, drawOffset: { x: 0, y: 0 } },
    3: { motion: 'walk', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 126, y: 154 }, drawOffset: { x: 0, y: 0 } },
    4: { motion: 'run', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 154 }, drawOffset: { x: 0, y: 0 } },
    5: { motion: 'run', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 152 }, drawOffset: { x: 0, y: 0 } },
    6: { motion: 'run', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 127, y: 151 }, drawOffset: { x: 0, y: 0 } },
    7: { motion: 'run', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 129, y: 152 }, drawOffset: { x: 0, y: 0 } },
    8: { motion: 'hit', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    9: { motion: 'hit', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 119, y: 158 }, drawOffset: { x: 0, y: 0 } },
    10: { motion: 'idle', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 120, y: 155 }, drawOffset: { x: 0, y: 0 } },
    11: { motion: 'idle', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 154 }, drawOffset: { x: 0, y: 0 } },
    12: { motion: 'idle', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 155 }, drawOffset: { x: 0, y: 0 } },
    13: { motion: 'idle', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 121, y: 156 }, drawOffset: { x: 0, y: 0 } },
    14: { motion: 'slash', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 125, y: 145 }, drawOffset: { x: 0, y: 0 } },
    15: { motion: 'slash', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 142, y: 138 }, drawOffset: { x: 0, y: 0 } },
    16: { motion: 'slash', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 160, y: 135 }, drawOffset: { x: 0, y: 0 } },
    17: { motion: 'slash', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 148, y: 145 }, drawOffset: { x: 0, y: 0 } },
    18: { motion: 'throw', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 92, y: 140 }, drawOffset: { x: 0, y: 0 } },
    19: { motion: 'throw', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 112, y: 130 }, drawOffset: { x: 0, y: 0 } },
    20: { motion: 'throw', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 135, y: 125 }, drawOffset: { x: 0, y: 0 } },
    21: { motion: 'throw', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 130 }, drawOffset: { x: 0, y: 0 } },
    22: { motion: 'cast', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 95, y: 140 }, drawOffset: { x: 0, y: 0 } },
    23: { motion: 'cast', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 118, y: 132 }, drawOffset: { x: 0, y: 0 } },
    24: { motion: 'cast', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 125 }, drawOffset: { x: 0, y: 0 } },
    25: { motion: 'cast', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 150, y: 122 }, drawOffset: { x: 0, y: 0 } },
    26: { motion: 'bow', local: 0, pivot: { x: 150, y: 260 }, hand: { x: 88, y: 138 }, drawOffset: { x: 0, y: 0 } },
    27: { motion: 'bow', local: 1, pivot: { x: 150, y: 260 }, hand: { x: 105, y: 132 }, drawOffset: { x: 0, y: 0 } },
    28: { motion: 'bow', local: 2, pivot: { x: 150, y: 260 }, hand: { x: 122, y: 130 }, drawOffset: { x: 0, y: 0 } },
    29: { motion: 'bow', local: 3, pivot: { x: 150, y: 260 }, hand: { x: 138, y: 130 }, drawOffset: { x: 0, y: 0 } }
};
const SKILL_CONFIG = {
    1: { id: 'basic_slash', motion: 'slash', weapon: 'sword', projectile: null, effectIndex: 1 },
    2: { id: 'heavy_smash', motion: 'slash', weapon: 'greatsword', projectile: null, effectIndex: 2 },
    3: { id: 'dagger_throw', motion: 'throw', weapon: 'dagger', projectile: 'dagger_projectile', effectIndex: 0 },
    4: { id: 'bow_shot', motion: 'bow', weapon: 'bow', projectile: 'arrow_projectile', effectIndex: 0 },
    5: { id: 'spear_thrust', motion: 'throw', weapon: 'spear', projectile: null, effectIndex: 11 },
    6: { id: 'staff_cast', motion: 'cast', weapon: 'staff', projectile: 'magic_projectile_blue', effectIndex: 26 },
    7: { id: 'scythe_swing', motion: 'slash', weapon: 'scythe', projectile: null, effectIndex: 16 },
    8: { id: 'magic_cast', motion: 'cast', weapon: 'magic_orb', projectile: 'magic_projectile_dark', effectIndex: 28 }
};
const WEAPON_CONFIG = {
    sword: { atlasIndex: 0, grip: { x: 105, y: 250 }, scale: 0.18, rotation: -0.65, layer: 'front' },
    greatsword: { atlasIndex: 1, grip: { x: 100, y: 265 }, scale: 0.22, rotation: -0.65, layer: 'front' },
    dagger: { atlasIndex: 2, grip: { x: 130, y: 265 }, scale: 0.16, rotation: -0.65, layer: 'front' },
    bow: { atlasIndex: 4, grip: { x: 205, y: 200 }, scale: 0.2, rotation: 0, layer: 'front' },
    spear: { atlasIndex: 6, grip: { x: 75, y: 270 }, scale: 0.24, rotation: -0.55, layer: 'front' },
    staff: { atlasIndex: 7, grip: { x: 72, y: 265 }, scale: 0.22, rotation: -0.35, layer: 'front' },
    scythe: { atlasIndex: 9, grip: { x: 95, y: 185 }, scale: 0.24, rotation: -0.55, layer: 'front' },
    magic_orb: { atlasIndex: 10, grip: { x: 165, y: 195 }, scale: 0.14, rotation: 0, layer: 'front' }
};
const PROJECTILE_CONFIG = {
    dagger_projectile: { atlasIndex: 3, speed: 650, scale: 0.35 },
    arrow_projectile: { atlasIndex: 5, speed: 750, scale: 0.45 },
    magic_projectile_blue: { atlasIndex: 8, speed: 520, scale: 0.45 },
    magic_projectile_dark: { atlasIndex: 11, speed: 520, scale: 0.45 }
};
const SKILL_WEAPON_OFFSETS = {
    basic_slash: [{ x: -8, y: 6, rotation: -1.1, scale: 1 }, { x: 2, y: -4, rotation: -0.4, scale: 1.1 }, { x: 18, y: -8, rotation: 0.7, scale: 1.1 }, { x: 8, y: 4, rotation: 1.3, scale: 1 }],
    heavy_smash: [{ x: -10, y: 8, rotation: -1.3, scale: 1 }, { x: 0, y: -6, rotation: -0.5, scale: 1.1 }, { x: 22, y: -10, rotation: 0.8, scale: 1.15 }, { x: 10, y: 6, rotation: 1.5, scale: 1 }],
    dagger_throw: [{ x: -6, y: 4, rotation: -0.9, scale: 1 }, { x: 2, y: -2, rotation: -0.3, scale: 1.05 }, { x: 14, y: -6, rotation: 0.5, scale: 1.05 }, { x: 6, y: 2, rotation: 0.9, scale: 1 }],
    bow_shot: [{ x: -4, y: 2, rotation: -0.15, scale: 1 }, { x: 0, y: -2, rotation: -0.05, scale: 1 }, { x: 6, y: -2, rotation: 0.08, scale: 1 }, { x: 2, y: 1, rotation: 0.12, scale: 1 }],
    spear_thrust: [{ x: -12, y: 4, rotation: -0.5, scale: 1 }, { x: 4, y: -2, rotation: -0.15, scale: 1.1 }, { x: 28, y: -4, rotation: 0.1, scale: 1.1 }, { x: 10, y: 2, rotation: 0.3, scale: 1 }],
    staff_cast: [{ x: -6, y: 6, rotation: -0.9, scale: 1 }, { x: 4, y: -6, rotation: -0.3, scale: 1.1 }, { x: 16, y: -8, rotation: 0.4, scale: 1.1 }, { x: 6, y: 2, rotation: 0.7, scale: 1 }],
    scythe_swing: [{ x: -14, y: 8, rotation: -1.4, scale: 1 }, { x: 2, y: -6, rotation: -0.6, scale: 1.15 }, { x: 24, y: -10, rotation: 0.9, scale: 1.15 }, { x: 12, y: 4, rotation: 1.6, scale: 1 }],
    magic_cast: [{ x: -4, y: 4, rotation: -0.2, scale: 1 }, { x: 2, y: -4, rotation: 0.0, scale: 1.05 }, { x: 8, y: -4, rotation: 0.15, scale: 1.1 }, { x: 4, y: 2, rotation: 0.1, scale: 1 }]
};
let crowdPauseActive = false;
let trialHazardTimer = 0;
let tutorialQueue = [];
let activeTutorial = null;
let activeRewardZoneId = null;
let divineBannerTimer = null;
let jewelFusionSelection = [];
let pendingRingEquipItemId = null;
let pendingGloveEquipItemId = null;
let deathOverlayActive = false;
let battleAssets = {
    loading: false,
    ready: false,
    failed: false,
    failedKeys: [],
    loadTicket: 0,
    images: {},
    backdrops: {},
    atlas: null
};
const BATTLE_BACKDROP_VARIANTS = [
    { tone: 'rgba(30, 77, 122, 0.16)', glow: 'rgba(169, 226, 255, 0.10)' },
    { tone: 'rgba(86, 44, 24, 0.17)', glow: 'rgba(255, 198, 132, 0.10)' },
    { tone: 'rgba(34, 86, 66, 0.14)', glow: 'rgba(173, 255, 203, 0.10)' },
    { tone: 'rgba(64, 36, 94, 0.16)', glow: 'rgba(222, 184, 255, 0.10)' },
    { tone: 'rgba(66, 66, 35, 0.14)', glow: 'rgba(255, 237, 171, 0.10)' },
    { tone: 'rgba(35, 56, 92, 0.16)', glow: 'rgba(170, 210, 255, 0.10)' },
    { tone: 'rgba(78, 39, 39, 0.17)', glow: 'rgba(255, 184, 184, 0.10)' },
    { tone: 'rgba(32, 75, 72, 0.15)', glow: 'rgba(159, 255, 236, 0.10)' },
    { tone: 'rgba(79, 52, 27, 0.16)', glow: 'rgba(255, 212, 158, 0.10)' },
    { tone: 'rgba(45, 45, 80, 0.16)', glow: 'rgba(197, 189, 255, 0.10)' }
];
const battleImageCanvasCache = new WeakMap();
const TAB_UNLOCK_GATES = {
    'tab-char': 'char',
    'tab-season': 'season',
    'tab-items': 'items',
    'tab-jewel': 'items',
    'tab-skills': 'skills',
    'tab-codex': 'codex',
    'tab-talisman': 'talisman',
    'tab-map': 'map',
    'tab-traits': 'traits'
};
const MOBILE_BATTLE_BREAKPOINT = 1080;
let battleTabDocked = false;
const ENEMY_CROWD_PAUSE_LIMIT = 20;
const DOT_STACK_MAX = 10;
const DOT_STACK_GROWTH_PER_STACK = 0.10;
const DOT_TICK_INTERVAL = 0.2;
const DOT_EFFECT_DURATION = 2.4;
const DOT_TICK_FROM_HIT_RATIO = 0.06;
const BATTLE_SLOT_ORDER = [7, 6, 8, 2, 1, 3, 12, 11, 13, 17, 16, 18, 0, 4, 5, 9, 10, 14, 15, 19];

function syncBattleTabLayout(forceTabSwitch) {
    let tabBattle = document.getElementById('tab-battle');
    let leftPane = document.getElementById('left-pane');
    let battleColumn = document.getElementById('battle-column');
    let battleBtn = document.getElementById('btn-tab-battle');
    if (!tabBattle || !leftPane || !battleColumn || !battleBtn) return;
    let isMobileBattle = window.matchMedia(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`).matches;
    document.body.classList.toggle('mobile-battle-tab', isMobileBattle);
    battleBtn.style.display = isMobileBattle ? 'block' : 'none';
    if (isMobileBattle) {
        if (!battleTabDocked || battleColumn.parentElement !== tabBattle) tabBattle.appendChild(battleColumn);
        battleTabDocked = true;
        if (forceTabSwitch && !document.getElementById('tab-battle').classList.contains('active')) switchTab('tab-battle');
    } else {
        if (battleTabDocked || battleColumn.parentElement !== leftPane) leftPane.appendChild(battleColumn);
        battleTabDocked = false;
        if (document.getElementById('tab-battle').classList.contains('active')) switchTab('tab-character');
    }
}

function clampPassiveCamera() {
    camX = clampNumber(camX, -9800, 9800);
    camY = clampNumber(camY, -7800, 7800);
}

function fitPassiveCameraToBounds(force) {
    if (passiveCameraInitialized && !force) return;
    let container = document.getElementById('tree-container');
    if (!container || container.offsetParent === null) return;
    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);
    let treeWidth = Math.max(1, PASSIVE_BOUNDS.maxX - PASSIVE_BOUNDS.minX + 420);
    let treeHeight = Math.max(1, PASSIVE_BOUNDS.maxY - PASSIVE_BOUNDS.minY + 420);
    camZoom = clampNumber(Math.min((width * 0.84) / treeWidth, (height * 0.84) / treeHeight), 0.12, 0.52);
    camX = 0;
    camY = 0;
    passiveCameraInitialized = true;
}

document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (activeTooltipId) {
        let el = document.getElementById(activeTooltipId);
        if (el && el.style.display !== 'none') positionTooltipElement(el, mouseX, mouseY);
    }
});
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    let skillId = Number(event.key);
    if (!skillId) return;
    if (!SKILL_CONFIG[skillId]) return;
    let target = event.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    event.preventDefault();
    playSkill(skillId);
});

function addBattleFx(type, data) {
    battleFx.push({
        id: ++battleFxId,
        type: type,
        start: performance.now(),
        duration: (data && data.duration) || 260,
        ...(data || {})
    });
}

function getBattleImageContext(image) {
    if (!image) return null;
    if (battleImageCanvasCache.has(image)) return battleImageCanvasCache.get(image);
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    battleImageCanvasCache.set(image, ctx);
    return ctx;
}

function isAtlasBackgroundPixel(r, g, b, a) {
    if (a < 20) return true;
    let max = Math.max(r, g, b);
    let min = Math.min(r, g, b);
    let avg = (r + g + b) / 3;
    if (avg >= 240) return true;
    if (avg >= 222 && (max - min) <= 18) return true;
    if (avg >= 206 && (max - min) <= 12) return true;
    return false;
}

function trimRectToContent(image, rect, padding) {
    padding = padding || 2;
    try {
        const ctx = getBattleImageContext(image);
        if (!ctx) return rect;
        const frame = ctx.getImageData(rect.x, rect.y, rect.width, rect.height);
        const px = frame.data;
        let minX = rect.width, minY = rect.height, maxX = -1, maxY = -1;
        for (let y = 0; y < rect.height; y++) {
            for (let x = 0; x < rect.width; x++) {
                let idx = (y * rect.width + x) * 4;
                let r = px[idx];
                let g = px[idx + 1];
                let b = px[idx + 2];
                let a = px[idx + 3];
                if (isAtlasBackgroundPixel(r, g, b, a)) continue;
                if (x < minX) minX = x;
                if (y < minY) minY = y;
                if (x > maxX) maxX = x;
                if (y > maxY) maxY = y;
            }
        }
        if (maxX < minX || maxY < minY) return rect;
        let x = Math.max(0, rect.x + minX - padding);
        let y = Math.max(0, rect.y + minY - padding);
        let right = Math.min(image.width, rect.x + maxX + 1 + padding);
        let bottom = Math.min(image.height, rect.y + maxY + 1 + padding);
        return { x: x, y: y, width: Math.max(1, right - x), height: Math.max(1, bottom - y) };
    } catch (error) {
        return rect;
    }
}
function cleanupBattleFx(now) {
    battleFx = battleFx.filter(fx => now - fx.start <= fx.duration);
}
function cleanupBattleVisualState(now) {
    battleVisualState.projectiles = (battleVisualState.projectiles || []).filter(projectile => now - projectile.start <= projectile.duration + 60);
    battleVisualState.damageTexts = (battleVisualState.damageTexts || []).filter(text => now - text.start <= text.duration);
    Object.keys(battleVisualState.enemyGhostPos || {}).forEach(enemyId => {
        if (now - (battleVisualState.enemyGhostPos[enemyId].stamp || 0) > 1200) delete battleVisualState.enemyGhostPos[enemyId];
    });
    if (!battleVisualState.processedFxIds) battleVisualState.processedFxIds = new Set();
    if (battleFx.length === 0) {
        battleVisualState.processedFxIds = new Set();
        return;
    }
    let activeFxIds = new Set((battleFx || []).map(fx => fx.id));
    if (battleVisualState.processedFxIds.size > activeFxIds.size * 2 + 64) {
        battleVisualState.processedFxIds = new Set([...battleVisualState.processedFxIds].filter(id => activeFxIds.has(id)));
    }
}
function spawnVisualProjectile(config) {
    battleVisualState.projectiles.push({
        start: performance.now(),
        duration: config.duration || 220,
        fromX: config.fromX || 0,
        fromY: config.fromY || 0,
        toX: config.toX || 0,
        toY: config.toY || 0,
        color: config.color || '#f8f1c8',
        radius: config.radius || 3.8,
        enemyShot: !!config.enemyShot
    });
}
function spawnDamageText(config) {
    battleVisualState.damageTexts.push({
        start: performance.now(),
        duration: config.duration || 650,
        x: config.x || 0,
        y: config.y || 0,
        value: config.value || 0,
        crit: !!config.crit,
        enemyHit: !!config.enemyHit
    });
}
function drawVisualProjectile(ctx, projectile, now) {
    let t = clampNumber((now - projectile.start) / projectile.duration, 0, 1);
    let arcLift = projectile.enemyShot ? -2.5 : 7;
    let x = projectile.fromX + (projectile.toX - projectile.fromX) * t;
    let y = projectile.fromY + (projectile.toY - projectile.fromY) * t - Math.sin(t * Math.PI) * arcLift;
    ctx.save();
    ctx.globalAlpha = 0.35 + (1 - t) * 0.65;
    ctx.fillStyle = projectile.color;
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.28 * (1 - t);
    ctx.beginPath();
    ctx.arc(x, y, projectile.radius * 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawDamageTexts(ctx, now) {
    (battleVisualState.damageTexts || []).forEach(text => {
        let t = clampNumber((now - text.start) / text.duration, 0, 1);
        let rise = 20 + (text.crit ? 7 : 0);
        let x = text.x + Math.sin((text.start % 1000) * 0.01) * 4;
        let y = text.y - rise * t;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.font = text.crit ? 'bold 14px Consolas' : 'bold 12px Consolas';
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        ctx.strokeText(`${Math.max(0, Math.floor(text.value))}`, x, y);
        ctx.fillStyle = text.enemyHit ? '#ff8e8e' : (text.crit ? '#ffd36f' : '#f3f6ff');
        ctx.fillText(`${Math.max(0, Math.floor(text.value))}`, x, y);
        ctx.restore();
    });
}

function getSpriteFrameRectByIndex(image, frameIndex, config) {
    if (!image || !config) return null;
    let cols = config.cols || 6;
    let rows = config.rows || 5;
    let frameW = Math.floor(image.width / cols);
    let frameH = Math.floor(image.height / rows);
    let safeIndex = clampNumber(frameIndex, 0, cols * rows - 1);
    let col = safeIndex % cols;
    let row = Math.floor(safeIndex / cols);
    return { sx: col * frameW, sy: row * frameH, sw: frameW, sh: frameH };
}
function getWeaponAtlasRect(atlasIndex) {
    if (!battleAssets.images.weapons) return null;
    const cellW = Math.floor(battleAssets.images.weapons.width / 4);
    const cellH = Math.floor(battleAssets.images.weapons.height / 3);
    let col = atlasIndex % 4;
    let row = Math.floor(atlasIndex / 4);
    return { sx: col * cellW, sy: row * cellH, sw: cellW, sh: cellH, cellW, cellH };
}
function getEffectAtlasRect(effectIndex, image) {
    if (!image) return null;
    let frame = getSpriteFrameRectByIndex(image, effectIndex, { cols: 6, rows: 5 });
    return frame;
}
function getHeroFrameMeta(frameIndex) {
    return HERO_FRAME_META[frameIndex] || {
        motion: 'idle',
        local: 0,
        pivot: { x: 150, y: 260 },
        hand: { x: 120, y: 155 },
        drawOffset: { x: 0, y: 0 }
    };
}
function getHeroDrawMetrics(heroWorldX, heroWorldY, frameRect, frameMeta) {
    let scale = HERO_SPRITE_CONFIG.drawHeight / frameRect.sh;
    let drawW = frameRect.sw * scale;
    let drawH = frameRect.sh * scale;
    let pivotX = (frameMeta.pivot.x / 229) * frameRect.sw;
    let pivotY = (frameMeta.pivot.y / 229) * frameRect.sh;
    let offsetX = (frameMeta.drawOffset.x / 300) * frameRect.sw;
    let offsetY = (frameMeta.drawOffset.y / 300) * frameRect.sh;
    let dx = heroWorldX - (pivotX * scale) + (offsetX * scale);
    let dy = heroWorldY - (pivotY * scale) + (offsetY * scale);
    return { drawW, drawH, dx, dy, scaleX: scale, scaleY: scale };
}
function getSkillPlaybackState(now) {
    let playback = battleVisualState.skillPlayback;
    if (!playback) return null;
    if (now > playback.endAt) {
        battleVisualState.skillPlayback = null;
        return null;
    }
    let skillCfg = SKILL_CONFIG[playback.skillId];
    if (!skillCfg) return null;
    let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
    let frameCount = motionFrames.length;
    let progress = clampNumber((now - playback.startAt) / Math.max(1, playback.duration), 0, 0.999);
    let frameLocalIndex = clampNumber(Math.floor(progress * frameCount), 0, frameCount - 1);
    return { ...playback, skillCfg, frameLocalIndex, frameIndex: motionFrames[frameLocalIndex], progress };
}
function playSkill(skillId) {
    let normalized = Number(skillId);
    if (!SKILL_CONFIG[normalized]) return false;
    let now = performance.now();
    let skillCfg = SKILL_CONFIG[normalized];
    let motionFrames = HERO_MOTIONS[skillCfg.motion] || HERO_MOTIONS.idle;
    let duration = Math.max(560, motionFrames.length * 220);
    battleVisualState.skillPlayback = {
        skillId: normalized,
        startAt: now,
        endAt: now + duration,
        duration: duration,
        projectileSpawned: false,
        effectSpawned: false
    };
    return true;
}
function mapSkillSlotByGemTags(skillName) {
    let tags = ((SKILL_DB[skillName] && SKILL_DB[skillName].tags) || []).map(tag => String(tag).toLowerCase());
    if (tags.includes('projectile')) {
        if (tags.includes('chaos')) return 8;
        if (tags.includes('elemental') || tags.includes('light') || tags.includes('cold') || tags.includes('fire')) return 6;
        return 4;
    }
    if (tags.includes('slam')) return 2;
    if (tags.includes('aoe')) return 7;
    if (tags.includes('chain')) return 6;
    return 1;
}
function mapEffectIndexByGemTags(skillName, fallbackIndex) {
    let tags = ((SKILL_DB[skillName] && SKILL_DB[skillName].tags) || []).map(tag => String(tag).toLowerCase());
    if (tags.includes('chaos')) return 28;
    if (tags.includes('cold')) return 3;
    if (tags.includes('fire') || tags.includes('light') || tags.includes('elemental')) return 26;
    if (tags.includes('projectile')) return 0;
    if (tags.includes('slam')) return 2;
    if (tags.includes('aoe')) return 16;
    return Number.isFinite(fallbackIndex) ? fallbackIndex : 1;
}
function playSkillFromActiveGem(skillName) {
    let slot = mapSkillSlotByGemTags(skillName);
    if (!playSkill(slot)) return false;
    let state = battleVisualState.skillPlayback;
    if (!state) return false;
    let base = SKILL_CONFIG[slot];
    state.overrideEffectIndex = mapEffectIndexByGemTags(skillName, base.effectIndex);
    return true;
}
function updateSkillPlayback(now, playerPos, width, enemyPosMap) {
    let state = getSkillPlaybackState(now);
    if (!state) return;
    let skillCfg = state.skillCfg;
    let targetEnemy = null;
    let targetIds = getSkillTargets(getPlayerStats()).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
    if (targetIds.length > 0 && enemyPosMap) {
        targetEnemy = enemyPosMap[targetIds[0]] || null;
    }
    if (!targetEnemy && enemyPosMap) {
        let firstKey = Object.keys(enemyPosMap)[0];
        if (firstKey !== undefined) targetEnemy = enemyPosMap[firstKey];
    }
    let targetX = targetEnemy ? targetEnemy.x : Math.max(playerPos.x + 50, width - 22);
    let targetY = targetEnemy ? (targetEnemy.y - 12) : (playerPos.y - 18);
    let hitFrame = Math.max(1, Math.floor((HERO_MOTIONS[skillCfg.motion] || []).length * 0.5));
    if (!state.projectileSpawned && skillCfg.projectile && state.frameLocalIndex >= hitFrame) {
        let pCfg = PROJECTILE_CONFIG[skillCfg.projectile];
        if (pCfg) {
            battleVisualState.skillProjectiles.push({
                projectileName: skillCfg.projectile,
                skillId: state.skillId,
                startAt: now,
                lifetime: 1000,
                speed: pCfg.speed,
                x: playerPos.x + 20,
                y: playerPos.y - 18,
                targetX: targetX,
                targetY: targetY
            });
        }
        battleVisualState.skillPlayback.projectileSpawned = true;
    }
    let chosenEffectIndex = Number.isFinite(state.overrideEffectIndex) ? state.overrideEffectIndex : skillCfg.effectIndex;
    if (!state.effectSpawned && Number.isFinite(chosenEffectIndex) && state.frameLocalIndex >= hitFrame) {
        battleVisualState.skillEffects.push({
            skillId: state.skillId,
            effectIndex: chosenEffectIndex,
            startAt: now,
            duration: 520,
            x: targetX,
            y: targetY
        });
        battleVisualState.skillPlayback.effectSpawned = true;
    }
}
function drawWeapon(ctx, heroX, heroY, motion, frameLocalIndex, weaponName, layerFilter, skillId) {
    return;
}
function drawProjectile(ctx, now) {
    battleVisualState.skillProjectiles = [];
}
function drawEffect(ctx, now) {
    battleVisualState.skillEffects = [];
}
function drawSkillWeaponLayer(ctx, playerPos, now, layer) {
    let state = getSkillPlaybackState(now);
    if (!state) return;
    drawWeapon(ctx, playerPos.x, playerPos.y, state.skillCfg.motion, state.frameLocalIndex, state.skillCfg.weapon, layer, state.skillId);
}
function drawSkillProjectileLayer(ctx, now) { drawProjectile(ctx, now); }
function drawSkillEffectLayer(ctx, now) { drawEffect(ctx, now); }
function isTutorialOpen() {
    let overlay = document.getElementById('tutorial-overlay');
    return !!activeTutorial && !!overlay && overlay.classList.contains('active');
}
function queueTutorialNotice(key, title, body, tabId, itemSubtabId) {
    game.seenTutorials = game.seenTutorials || [];
    if (game.seenTutorials.includes(key)) return;
    game.seenTutorials.push(key);
    tutorialQueue.push({ key, title, body, tabId: tabId || null, itemSubtabId: itemSubtabId || null });
    showNextTutorial();
}
function showNextTutorial() {
    if (activeTutorial || tutorialQueue.length === 0) return;
    activeTutorial = tutorialQueue.shift();
    document.getElementById('tutorial-title').innerText = activeTutorial.title;
    document.getElementById('tutorial-body').innerText = activeTutorial.body;
    let hasShortcut = !!activeTutorial.tabId || !!activeTutorial.itemSubtabId;
    document.getElementById('tutorial-open-btn').innerText = hasShortcut ? '열어보기' : '확인';
    document.getElementById('tutorial-open-btn').style.display = 'inline-block';
    document.getElementById('tutorial-overlay').classList.add('active');
    lastTime = Date.now();
}
function dismissTutorial(openTarget) {
    if (!activeTutorial) return;
    let tabId = openTarget ? activeTutorial.tabId : null;
    let itemSubtabId = openTarget ? activeTutorial.itemSubtabId : null;
    document.getElementById('tutorial-overlay').classList.remove('active');
    activeTutorial = null;
    lastTime = Date.now();
    if (tabId) switchTab(tabId);
    if (itemSubtabId && tabId === 'tab-items') switchItemSubtab(itemSubtabId);
    if (tutorialQueue.length > 0) setTimeout(showNextTutorial, 40);
}
function showDivineDropBanner(amount) {
    let el = document.getElementById('divine-drop-banner');
    if (!el) return;
    el.innerText = `✨ 신성한 오브 획득! +${amount} ✨`;
    el.classList.add('show');
    if (divineBannerTimer) clearTimeout(divineBannerTimer);
    divineBannerTimer = setTimeout(() => {
        el.classList.remove('show');
        divineBannerTimer = null;
    }, 1700);
}
function isRewardOpen() {
    let overlay = document.getElementById('reward-overlay');
    return activeRewardZoneId !== null && !!overlay && overlay.classList.contains('active');
}
function closeRewardOverlay() {
    document.getElementById('reward-overlay').classList.remove('active');
    activeRewardZoneId = null;
    lastTime = Date.now();
}

function isLoopHeroSelectOpen() {
    let overlay = document.getElementById('loop-hero-select-overlay');
    return !!overlay && overlay.classList.contains('active');
}

function openLoopHeroSelection(onSelect, options = {}) {
    let overlay = document.getElementById('loop-hero-select-overlay');
    let grid = document.getElementById('loop-hero-select-grid');
    let kickerEl = document.getElementById('loop-hero-select-kicker');
    let titleEl = document.getElementById('loop-hero-select-title');
    let bodyEl = document.getElementById('loop-hero-select-body');
    if (!overlay || !grid) {
        let fallbackHero = game.selectedHeroId || 'hero1';
        applyHeroSelection(fallbackHero, { silent: true, skipSave: true });
        if (typeof onSelect === 'function') onSelect(fallbackHero);
        return;
    }
    loopHeroSelectionCallback = typeof onSelect === 'function' ? onSelect : null;
    if (kickerEl) kickerEl.innerText = options.kicker || 'Loop Selection';
    if (titleEl) titleEl.innerText = options.title || '다음 루프 캐릭터 선택';
    if (bodyEl) bodyEl.innerText = options.body || '이번 루프에서 사용할 캐릭터를 선택하세요.';
    let experiencedSet = new Set(Array.isArray(game.discoveredHeroIds) ? game.discoveredHeroIds : []);
    grid.innerHTML = HERO_SELECTION_ORDER.map(id => {
        let def = HERO_SELECTION_DEFS[id];
        let experienced = experiencedSet.has(id);
        return `<button class="reward-choice" onclick="chooseLoopHero('${id}')"><strong>${escapeHTML(def.label)}${experienced ? ' <span style=\"color:#9fd8ff; font-size:0.8em;\">(경험함)</span>' : ''}</strong>${escapeHTML(def.talentsText)}</button>`;
    }).join('');
    overlay.classList.add('active');
}

function chooseLoopHero(heroId) {
    if (!HERO_SELECTION_DEFS[heroId]) return;
    applyHeroSelection(heroId, { silent: true, skipSave: true });
    let overlay = document.getElementById('loop-hero-select-overlay');
    if (overlay) overlay.classList.remove('active');
    let callback = loopHeroSelectionCallback;
    loopHeroSelectionCallback = null;
    if (typeof callback === 'function') callback(heroId);
    lastTime = Date.now();
}

function openRingSlotOverlay(invIdx) {
    let item = game.inventory[invIdx];
    pendingRingEquipItemId = item && item.id ? item.id : null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay) overlay.classList.add('active');
}

function openRingSlotOverlayByItemId(itemId) {
    pendingRingEquipItemId = Number.isFinite(itemId) ? itemId : null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeRingSlotOverlay() {
    pendingRingEquipItemId = null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay) overlay.classList.remove('active');
}

function selectRingSlotFromOverlay(slot) {
    let itemId = pendingRingEquipItemId;
    closeRingSlotOverlay();
    if (!Number.isInteger(itemId)) return;
    equipItemById(itemId, slot);
}

function openGloveSlotOverlay(invIdx) {
    let item = game.inventory[invIdx];
    pendingGloveEquipItemId = item && item.id ? item.id : null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay) overlay.classList.add('active');
}

function openGloveSlotOverlayByItemId(itemId) {
    pendingGloveEquipItemId = Number.isFinite(itemId) ? itemId : null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeGloveSlotOverlay() {
    pendingGloveEquipItemId = null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay) overlay.classList.remove('active');
}

function selectGloveSlotFromOverlay(slot) {
    let itemId = pendingGloveEquipItemId;
    closeGloveSlotOverlay();
    if (!Number.isInteger(itemId)) return;
    equipItemById(itemId, slot);
}

function isLoadingOverlayOpen() {
    let overlay = document.getElementById('loading-overlay');
    return !!overlay && overlay.classList.contains('active');
}

function isDeathOverlayOpen() {
    let overlay = document.getElementById('death-overlay');
    return deathOverlayActive && !!overlay && overlay.classList.contains('active');
}

function toggleDeathNoticeSetting(checked) {
    game.settings.showDeathNotice = !!checked;
    let settingsCheckbox = document.getElementById('chk-death-notice');
    let inlineCheckbox = document.getElementById('chk-death-notice-inline');
    if (settingsCheckbox) settingsCheckbox.checked = !!checked;
    if (inlineCheckbox) inlineCheckbox.checked = !!checked;
}

function applyPanelLayoutSettings() {
    let leftPane = document.getElementById('left-pane');
    let leftToggleBtn = document.getElementById('left-pane-toggle');
    let leftExpandFab = document.getElementById('left-pane-expand-fab');
    let combatFeed = document.querySelector('.combat-feed');
    let combatLogToggleBtn = document.getElementById('btn-combat-log-toggle');
    let isLeftCollapsed = !!(game && game.settings && game.settings.leftPaneCollapsed);
    let isLogCollapsed = !!(game && game.settings && game.settings.combatLogCollapsed);
    if (leftPane) leftPane.classList.toggle('collapsed', isLeftCollapsed);
    document.body.classList.toggle('left-pane-collapsed', isLeftCollapsed);
    if (leftToggleBtn) {
        leftToggleBtn.innerText = isLeftCollapsed ? '▶' : '◀';
        leftToggleBtn.title = isLeftCollapsed ? '전투 패널 펼치기' : '전투 패널 접기';
        leftToggleBtn.setAttribute('aria-label', isLeftCollapsed ? '전투 패널 펼치기' : '전투 패널 접기');
    }
    if (leftExpandFab) leftExpandFab.innerText = '▶';
    if (combatFeed) combatFeed.classList.toggle('collapsed', isLogCollapsed);
    if (combatLogToggleBtn) combatLogToggleBtn.innerText = isLogCollapsed ? '펼치기' : '접기';
}

function toggleLeftPaneCollapse() {
    game.settings.leftPaneCollapsed = !game.settings.leftPaneCollapsed;
    applyPanelLayoutSettings();
}

function toggleCombatLogCollapse() {
    game.settings.combatLogCollapsed = !game.settings.combatLogCollapsed;
    applyPanelLayoutSettings();
}

function closeDeathOverlay() {
    let overlay = document.getElementById('death-overlay');
    if (overlay) overlay.classList.remove('active');
    deathOverlayActive = false;
    lastTime = Date.now();
}

function openDeathOverlay(log) {
    if (!log) return;
    let overlay = document.getElementById('death-overlay');
    if (!overlay) return;
    let damageSummary = Array.isArray(log.damageSummary) ? log.damageSummary.filter(entry => entry && entry.value > 0).sort((a, b) => b.value - a.value) : [];
    let totalDamage = damageSummary.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.value || 0)), 0);
    document.getElementById('deathlog-title').innerText = `${getDamageElementLabel(log.primaryElement)} 피해로 쓰러졌습니다.`;
    document.getElementById('deathlog-body').innerText = `${log.reasonText}\n경험치를 ${log.expLost} 잃었습니다.`;
    document.getElementById('deathlog-damage-list').innerHTML = damageSummary.length > 0 ? damageSummary.map(entry => {
        let value = Math.max(0, Math.floor(entry.value || 0));
        let ratio = totalDamage > 0 ? (value / totalDamage) * 100 : 0;
        let ratioText = ratio >= 10 ? `${Math.round(ratio)}%` : `${ratio.toFixed(1)}%`;
        let barColor = getElementColor(entry.ele);
        return `
            <div class="deathlog-line">
                <div class="deathlog-line-top">
                    <span>${getDamageElementLabel(entry.ele)}</span>
                    <strong class="deathlog-value">${value}<span class="deathlog-ratio">${ratioText}</span></strong>
                </div>
                <div class="deathlog-bar">
                    <div class="deathlog-bar-fill" style="width:${clampNumber(ratio, 0, 100).toFixed(1)}%; background: linear-gradient(90deg, ${barColor}, ${barColor}cc);"></div>
                </div>
            </div>
        `;
    }).join('') : `<div class="deathlog-empty">최근 3초 동안 집계된 피해 기록이 없습니다.</div>`;
    toggleDeathNoticeSetting(game.settings.showDeathNotice !== false);
    overlay.classList.add('active');
    deathOverlayActive = true;
    lastTime = Date.now();
}

function openLastDeathLog() {
    if (!game.lastDeathLog) return addLog('아직 기록된 데스로그가 없습니다.', 'attack-monster');
    openDeathOverlay(game.lastDeathLog);
}

function pruneRecentDamageEvents(now) {
    let threshold = now - 3200;
    game.recentDamageEvents = Array.isArray(game.recentDamageEvents) ? game.recentDamageEvents.filter(entry => entry && entry.at >= threshold) : [];
}

function recordIncomingDamage(ele, amount, sourceName) {
    let now = Date.now();
    pruneRecentDamageEvents(now);
    game.recentDamageEvents = Array.isArray(game.recentDamageEvents) ? game.recentDamageEvents : [];
    game.recentDamageEvents.push({
        at: now,
        ele: normalizeDamageElementKey(ele),
        amount: Math.max(0, Math.floor(amount || 0)),
        source: sourceName || ''
    });
}

function buildDeathDamageSummary(windowMs) {
    let now = Date.now();
    pruneRecentDamageEvents(now);
    let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
    (game.recentDamageEvents || []).forEach(entry => {
        if (!entry || entry.at < now - (windowMs || 3000)) return;
        let key = normalizeDamageElementKey(entry.ele);
        totals[key] += Math.max(0, Math.floor(entry.amount || 0));
    });
    return Object.keys(totals)
        .map(key => ({ ele: key, value: totals[key] }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value);
}

function getActRewardConfig(zoneId) {
    return ACT_REWARD_DB[zoneId] || null;
}
function getActRewardChoices(zoneId) {
    let config = getActRewardConfig(zoneId);
    if (!config) return [];
    return config.choices.map(choice => {
        let enriched = { ...choice };
        if (choice.kind === 'skill' && (game.skills || []).includes(choice.skill)) {
            enriched.desc = `${choice.desc} 이미 보유 중이면 패시브 포인트 +${choice.fallbackValue || 1}로 바뀝니다.`;
        }
        if (choice.kind === 'support' && (game.supports || []).includes(choice.gem)) {
            enriched.desc = `${choice.desc} 이미 보유 중이면 ${ORB_DB[choice.currency || 'augment'].name} ${(choice.fallbackValue || 1)}개로 바뀝니다.`;
        }
        return enriched;
    });
}
function grantJournalBonus(entryId) {
    let entry = JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    game.journalBonusClaims = (game.journalBonusClaims && typeof game.journalBonusClaims === 'object') ? game.journalBonusClaims : {};
    if (game.journalBonusClaims[entryId]) return;
    game.journalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    game.journalBonuses.push({ entryId: entryId, stat: entry.bonus.stat, value: entry.bonus.value });
    game.journalBonusClaims[entryId] = true;
    addLog(`🕮 저널 영구 보너스 획득: ${entry.bonus.label}`, 'season-up');
}
function unlockJournalEntry(entryId) {
    if (!entryId || !JOURNAL_DB[entryId]) return;
    game.journalEntries = Array.isArray(game.journalEntries) ? game.journalEntries : ['prologue'];
    if (!game.journalEntries.includes(entryId)) {
        game.journalEntries.push(entryId);
        addLog(`📓 저널 해금: ${JOURNAL_DB[entryId].title}`, 'loot-rare');
    }
    grantJournalBonus(entryId);
}
function ensureActJournalCompletionForLoop(options) {
    let silent = !options || options.silent !== false;
    let loopStage = Math.max(Math.floor(game.season || 1), Math.floor(game.loopCount || 0));
    if (loopStage < 2) return;
    game.journalEntries = Array.isArray(game.journalEntries) ? game.journalEntries : ['prologue'];
    let before = game.journalEntries.length;
    Object.keys(JOURNAL_DB).forEach(id => {
        if (!/^act_/.test(id)) return;
        if (!game.journalEntries.includes(id)) game.journalEntries.push(id);
        grantJournalBonus(id);
    });
    if (!silent && game.journalEntries.length > before) addLog('📓 루프 2 이상 보정: 액트 저널이 모두 복구되었습니다.', 'season-up');
}
function markActRewardReady(zoneId) {
    if (zoneId < 0 || zoneId > 9) return;
    game.claimableActRewards = game.claimableActRewards || [];
    game.claimedActRewards = game.claimedActRewards || [];
    if (game.claimedActRewards.includes(zoneId) || game.claimableActRewards.includes(zoneId)) return;
    game.claimableActRewards.push(zoneId);
    game.noti.map = true;
    addLog(`🎁 [${MAP_ZONES[zoneId].name}] 클리어 보상을 받을 수 있습니다.`, 'loot-rare');
}
function openActReward(zoneId) {
    if (!(game.claimableActRewards || []).includes(zoneId)) return;
    let config = getActRewardConfig(zoneId);
    if (!config) return;
    activeRewardZoneId = zoneId;
    let storyAct = getStoryActByZoneId(zoneId);
    document.getElementById('reward-title').innerText = storyAct ? `${formatStoryActLabel(storyAct)} 클리어 보상 - ${storyAct.title}` : config.title;
    document.getElementById('reward-body').innerText = storyAct ? `${storyAct.subtitle}\n${config.body}` : config.body;
    document.getElementById('reward-grid').innerHTML = getActRewardChoices(zoneId).map((choice, index) => `
        <button class="reward-choice" onclick="claimActRewardChoice(${zoneId}, ${index})">
            <strong>${choice.label}</strong>
            <span>${choice.desc}</span>
            <small>${getActRewardPreview(choice)}</small>
        </button>
    `).join('');
    document.getElementById('reward-overlay').classList.add('active');
    lastTime = Date.now();
}
function getActRewardPreview(choice) {
    if (choice.kind === 'item') return `${choice.slot} 계열 장비를 즉시 획득합니다.`;
    if (choice.kind === 'skill') return `${choice.skill} 공격 젬을 획득합니다.`;
    if (choice.kind === 'support') return `${choice.gem} 보조 젬을 획득합니다.`;
    if (choice.kind === 'points') return `즉시 포인트 ${choice.value}점을 얻습니다.`;
    if (choice.kind === 'currency') return `${ORB_DB[choice.currency].name} ${choice.fallbackValue || choice.value || 1}개를 얻습니다.`;
    if (choice.kind === 'stat') return `${getStatName(choice.stat)} +${choice.value}${P_STATS[choice.stat] && P_STATS[choice.stat].isPct ? '%' : ''}`;
    return '영구 보상';
}
function grantActRewardEntry(zoneId, choice) {
    if (choice.kind === 'item') {
        let base = chooseItemBase(choice.slot, zoneId + 1);
        if (!base) {
            addLog(`⚠️ 액트 보상 아이템 생성 실패 (${choice.slot})`, 'attack-monster');
            return;
        }
        let item = createItemFromBase(base, choice.rarity || 'magic', zoneId + 1);
        let added = addItemToInventory(item, { ignoreFilter: true });
        if (added) addLog(`🎁 액트 보상으로 [${item.name}] 획득!`, choice.rarity === 'rare' ? 'loot-rare' : 'loot-magic');
        else addLog(`⚠️ 인벤토리 공간 부족으로 액트 보상 아이템이 자동 해체되었습니다.`, 'attack-monster');
        return;
    }
    if (choice.kind === 'skill') {
        if (!(game.skills || []).includes(choice.skill)) {
            game.skills.push(choice.skill);
            game.gemData[choice.skill] = game.gemData[choice.skill] || { level: 1, exp: 0 };
            game.noti.skills = true;
            addLog(`🎁 액트 보상 젬 [${choice.skill}] 획득!`, 'loot-rare');
        } else {
            game.passivePoints += choice.fallbackValue || 1;
            addLog(`🎁 이미 보유한 젬 대신 패시브 포인트 +${choice.fallbackValue || 1}`, 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'support') {
        if (!(game.supports || []).includes(choice.gem)) {
            game.supports.push(choice.gem);
            game.supportGemData[choice.gem] = game.supportGemData[choice.gem] || { level: 1, exp: 0 };
            game.noti.skills = true;
            addLog(`🎁 액트 보상 보조 젬 [${choice.gem}] 획득!`, 'loot-rare');
        } else {
            let amount = choice.fallbackValue || 1;
            awardCurrency(choice.currency || 'augment', amount);
            addLog(`🎁 중복 보조 젬 대신 ${ORB_DB[choice.currency || 'augment'].name} +${amount}`, 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'points') {
        game.passivePoints += choice.value || 0;
        addLog(`🎁 패시브 포인트 +${choice.value || 0}`, 'loot-rare');
        return;
    }
    if (choice.kind === 'currency') {
        let amount = choice.fallbackValue || choice.value || 1;
        awardCurrency(choice.currency, amount);
        addLog(`🎁 ${ORB_DB[choice.currency].name} +${amount}`, 'loot-magic');
        return;
    }
    if (choice.kind === 'stat') {
        game.actRewardBonuses = game.actRewardBonuses || [];
        game.actRewardBonuses.push({ actId: zoneId, stat: choice.stat, value: choice.value });
        addLog(`🎁 ${getStatName(choice.stat)} +${choice.value}${P_STATS[choice.stat] && P_STATS[choice.stat].isPct ? '%' : ''}`, 'loot-rare');
    }
}
function claimActRewardChoice(zoneId, choiceIndex) {
    if (!(game.claimableActRewards || []).includes(zoneId)) return;
    let choices = getActRewardChoices(zoneId);
    let choice = choices[choiceIndex];
    if (!choice) return;
    grantActRewardEntry(zoneId, choice);
    game.claimableActRewards = (game.claimableActRewards || []).filter(id => id !== zoneId);
    if (!(game.claimedActRewards || []).includes(zoneId)) game.claimedActRewards.push(zoneId);
    closeRewardOverlay();
    checkUnlocks();
    normalizeSupportLoadout(true);
    updateStaticUI();
    queueImportantSave(180);
}
function getElementColor(ele) {
    let key = normalizeDamageElementKey(ele);
    if (key === 'fire') return '#ff8d4b';
    if (key === 'cold') return '#7fe0ff';
    if (key === 'light') return '#ffe16b';
    if (key === 'chaos') return '#b97dff';
    if (key === 'other') return '#8eaeca';
    return '#f2d29a';
}

function normalizeDamageElementKey(ele) {
    let key = typeof ele === 'string' ? ele : '';
    if (DAMAGE_ELEMENT_LABELS[key]) return key;
    return key ? 'other' : 'phys';
}

function getDamageElementLabel(ele) {
    return DAMAGE_ELEMENT_LABELS[normalizeDamageElementKey(ele)] || DAMAGE_ELEMENT_LABELS.phys;
}

const CUSTOM_HERO_SHEET_STORAGE_KEY = 'projectidle_custom_hero_sheet';

function getCustomHeroSheetDataUrl() {
    try {
        let saved = localStorage.getItem(CUSTOM_HERO_SHEET_STORAGE_KEY);
        if (!saved || typeof saved !== 'string') return null;
        return saved.startsWith('data:image/') ? saved : null;
    } catch (error) {
        return null;
    }
}

function saveCustomHeroSheetDataUrl(dataUrl) {
    try {
        if (!dataUrl) localStorage.removeItem(CUSTOM_HERO_SHEET_STORAGE_KEY);
        else localStorage.setItem(CUSTOM_HERO_SHEET_STORAGE_KEY, dataUrl);
    } catch (error) {
        addLog('⚠️ 브라우저 저장공간 문제로 커스텀 시트를 저장하지 못했습니다.', 'attack-monster');
    }
}

function reloadBattleAssets() {
    battleAssets.loading = false;
    battleAssets.ready = false;
    battleAssets.failed = false;
    battleAssets.failedKeys = [];
    battleAssets.images = {};
    battleAssets.backdrops = {};
    battleAssets.atlas = null;
    battleVisualState.weaponAtlasResolved = null;
    battleVisualState.effectAtlasResolved = null;
    battleVisualState.gridOccupancyCache = new WeakMap();
    initBattleAssets();
}

function openHeroSheetPicker() {
    let input = document.getElementById('hero-sheet-input');
    if (!input) return;
    input.value = '';
    input.click();
}

function onHeroSheetSelected(event) {
    let file = event && event.target && event.target.files ? event.target.files[0] : null;
    if (!file) return;
    if (!/^image\//.test(file.type || '')) {
        addLog('⚠️ 이미지 파일만 업로드할 수 있습니다.', 'attack-monster');
        return;
    }
    let reader = new FileReader();
    reader.onload = function(loadEvent) {
        let dataUrl = String(loadEvent.target && loadEvent.target.result || '');
        if (!dataUrl.startsWith('data:image/')) {
            addLog('⚠️ 이미지 데이터 인식에 실패했습니다.', 'attack-monster');
            return;
        }
        saveCustomHeroSheetDataUrl(dataUrl);
        addLog('🎨 플레이어 커스텀 시트를 적용했습니다.', 'loot-magic');
        reloadBattleAssets();
    };
    reader.onerror = function() {
        addLog('⚠️ 파일 읽기에 실패했습니다.', 'attack-monster');
    };
    reader.readAsDataURL(file);
}

function resetHeroSheetToDefault() {
    saveCustomHeroSheetDataUrl(null);
    addLog('🎨 플레이어 시트를 기본 이미지로 복원했습니다.', 'loot-normal');
    reloadBattleAssets();
}


function fileExists(path) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', path, false);
        xhr.send();
        return xhr.status >= 200 && xhr.status < 400;
    } catch (error) {
        return false;
    }
}
function initBattleAssets() {
    if (battleAssets.loading || battleAssets.ready || battleAssets.failed) return;
    battleAssets.loading = true;
    battleAssets.failedKeys = [];
    battleAssets.loadTicket = (battleAssets.loadTicket || 0) + 1;
    const loadTicket = battleAssets.loadTicket;
    const customHeroSrc = getCustomHeroSheetDataUrl();
    const defaultHeroSrc = customHeroSrc || 'assets/battle-hero-v1.png';
    const manifest = {
        hero1Idle: 'assets/hero1/ElfIdle001Sheet-export.png',
        hero1Walk: 'assets/hero1/ElfWalk001-Sheet-export.png',
        hero1Attack: 'assets/hero1/ElfBasicAtk001BGR-Sheet-export.png',
        hero1Hurt: 'assets/hero1/ElfHurt001-Sheet-export.png',
        hero1Death: 'assets/hero1/ElfDeath001-Sheet-export.png',
        hero2Idle: 'assets/hero2/DemonKinIdle001-Sheet.png',
        hero2Walk: 'assets/hero2/DemonKinWalk001-Sheet.png',
        hero2Attack: 'assets/hero2/DemonKinBasicAtk001-Sheet.png',
        hero2Hurt: 'assets/hero2/DemonKinHurt001-Sheet.png',
        hero2Death: 'assets/hero2/DemonKinDeath001-Sheet.png',
        hero3Idle: 'assets/hero3/DruidIdle001-Sheet.png',
        hero3Walk: 'assets/hero3/DruidWalk001-Sheet.png',
        hero3Attack: 'assets/hero3/DruidBasicAtk1-Sheet.png',
        hero3Hurt: 'assets/hero3/DruidHurt001-Sheet.png',
        hero3Death: 'assets/hero3/DruidDeath001-Sheet.png',
        hero4Idle: 'assets/hero4/SeveredFangIdle001-Sheet.png',
        hero4Walk: 'assets/hero4/SeveredFangWalk001-Sheet.png',
        hero4Attack: 'assets/hero4/SeveredFangBasicAtk001-Sheet.png',
        hero4Hurt: 'assets/hero4/SeveredFangHurt001-Sheet.png',
        hero4Death: 'assets/hero4/SeveredFangDeath001-Sheet.png',
        heroLegacy: defaultHeroSrc,
        enemies: 'assets/battle-enemies-v1.png',
        enemies2: 'assets/battle-enemies-v2.png',
        enemies3: 'assets/battle-enemies-v3.png',
        effects: 'assets/battle-effects-v1.png',
        effectsV2: 'assets/battle-effects-v2.png',
        weapons: 'assets/battle-weapon.png',
        tiles: 'assets/battle-tiles-v1.png',
        backdropAct1: 'assets/battlefield-act1.png',
        backdropAct2_6: 'assets/battlefield-act2-6.png',
        backdropAct3_7: 'assets/battlefield-act3-7.png',
        backdropAct4_8: 'assets/battlefield-act4-8.png',
        backdropAct5: 'assets/battlefield-act5.png',
        backdropAct9_10: 'assets/battlefield-act9-10.png',

        bgAct1: 'assets/background/act1.png',
        bgAct2: 'assets/background/act2.png',
        bgAct3: 'assets/background/act3.png',
        bgAct4: 'assets/background/act4.png',
        bgAct5: 'assets/background/act5.png',
        bgAct6: 'assets/background/act6.png',
        bgAct7: 'assets/background/act7.png',
        bgAct8: 'assets/background/act8.png',
        bgAct9: 'assets/background/act9.png',
        bgAct10: 'assets/background/act10.png',
    };
    const optionalManifestKeys = new Set(Object.keys(manifest).filter(key => key.startsWith('hero') || key.startsWith('bgAct')).concat(['weapons']));
    Object.entries(manifest).forEach(([key, src]) => {
        if (typeof src === 'string' && !src.startsWith('data:') && !src.startsWith('http') && !src.startsWith('https')) {
            if (!fileExists(src)) optionalManifestKeys.add(key);
        }
    });
    let pending = Object.keys(manifest).length;
    let settled = false;
    function finishLoad() {
        if (settled || pending > 0 || battleAssets.loadTicket !== loadTicket) return;
        settled = true;
        if (battleAssets.failedKeys.length === 0) {
            finalizeBattleAssets();
            return;
        }
        battleAssets.failed = true;
        battleAssets.loading = false;
        console.warn('battle asset load completed with missing files:', battleAssets.failedKeys.join(', '));
    }

    setTimeout(() => {
        if (battleAssets.loadTicket !== loadTicket || settled || !battleAssets.loading) return;
        battleAssets.failed = true;
        if (!battleAssets.failedKeys.includes('timeout')) battleAssets.failedKeys.push('timeout');
        pending = 0;
        finishLoad();
    }, 8000);

    Object.entries(manifest).forEach(([key, src]) => {
        let img = new Image();
        img.onload = function() {
            try {
                if (key.startsWith('backdrop') || key.startsWith('bgAct')) {
                    battleAssets.backdrops[key] = img;
                } else {
                    let keepOriginalSheet = key === 'tiles' || key.startsWith('hero') || (key === 'heroLegacy' && heroSheetHasTransparency(img));
                    battleAssets.images[key] = keepOriginalSheet ? img : sanitizeBattleSheet(img);
                }
            } catch (error) {
                battleAssets.images[key] = img;
            }
            pending--;
            finishLoad();
        };
        img.onerror = function() {
            if (!optionalManifestKeys.has(key)) {
                battleAssets.failed = true;
                battleAssets.failedKeys.push(key);
            }
            pending--;
            console.warn('battle asset load failed:', key, src);
            finishLoad();
        };
        img.src = src;
    });
}

function sanitizeBattleSheet(image) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        return image;
    }
    const px = frame.data;
    const samples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    });

    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }

    function isBgLike(r, g, b, a, loose) {
        if (a < 18) return true;
        let dist = bgDistance(r, g, b);
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 232 && (max - min) <= 26) return true;
        return loose ? dist <= 62 : dist <= 42;
    }

    let visited = new Uint8Array(canvas.width * canvas.height);
    let queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
        let pos = y * canvas.width + x;
        if (visited[pos]) return;
        let idx = pos * 4;
        if (!isBgLike(px[idx], px[idx + 1], px[idx + 2], px[idx + 3], true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }

    for (let x = 0; x < canvas.width; x++) {
        pushSeed(x, 0);
        pushSeed(x, canvas.height - 1);
    }
    for (let y = 0; y < canvas.height; y++) {
        pushSeed(0, y);
        pushSeed(canvas.width - 1, y);
    }

    while (queue.length > 0) {
        let pos = queue.pop();
        let idx = pos * 4;
        px[idx + 3] = 0;
        let x = pos % canvas.width;
        let y = Math.floor(pos / canvas.width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }

    for (let i = 0; i < px.length; i += 4) {
        let r = px[i];
        let g = px[i + 1];
        let b = px[i + 2];
        let a = px[i + 3];
        if (a === 0) continue;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let dist = bgDistance(r, g, b);
        if ((dist <= 32 && (max - min) <= 40) || a < 28) {
            px[i + 3] = 0;
        } else if (dist <= 48 && (max - min) <= 48) {
            px[i + 3] = Math.min(px[i + 3], 120);
        }
    }
    const alphaSnapshot = new Uint8ClampedArray(canvas.width * canvas.height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let pos = y * canvas.width + x;
            let idx = pos * 4;
            if (alphaSnapshot[pos] === 0) continue;
            let r = px[idx];
            let g = px[idx + 1];
            let b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if (avg < 170 || (max - min) > 72) continue;
            let touchesTransparent = false;
            for (let oy = -1; oy <= 1 && !touchesTransparent; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * canvas.width + (x + ox)] === 0) {
                        touchesTransparent = true;
                        break;
                    }
                }
            }
            if (!touchesTransparent) continue;
            if (avg >= 196 && (max - min) <= 62) px[idx + 3] = 0;
            else px[idx + 3] = Math.min(px[idx + 3], 54);
        }
    }
    for (let y = 1; y < canvas.height - 1; y++) {
        for (let x = 1; x < canvas.width - 1; x++) {
            let pos = y * canvas.width + x;
            let idx = pos * 4;
            let alpha = px[idx + 3];
            if (alpha === 0) continue;
            let r = px[idx];
            let g = px[idx + 1];
            let b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if ((max - min) > 52 || avg < 154) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (px[((y + oy) * canvas.width + (x + ox)) * 4 + 3] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors >= 2 && avg >= 182) px[idx + 3] = 0;
            else if (transparentNeighbors >= 1 && avg >= 164 && alpha < 220) px[idx + 3] = Math.min(alpha, 32);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function heroSheetHasTransparency(image) {
    if (!image || !image.width || !image.height) return false;
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(image, 0, 0);
    let frame;
    try {
        frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
        return false;
    }
    const px = frame.data;
    for (let i = 3; i < px.length; i += 4) {
        if (px[i] < 250) return true;
    }
    return false;
}

function finalizeBattleAssets() {
    try {
        battleAssets.atlas = buildBattleAssetAtlas();
        // Preserve legacy hero-sheet detection path: do not alias atlas hero strips into images.hero.
        battleAssets.ready = true;
        battleAssets.loading = false;
        renderBattlefield();
    } catch (error) {
        battleAssets.failed = true;
        battleAssets.loading = false;
        console.error('battle asset atlas error', error);
    }
}

function sortSheetComponents(list) {
    let avgHeight = list.length > 0 ? list.reduce((sum, entry) => sum + entry.height, 0) / list.length : 48;
    return [...list].sort((a, b) => {
        if (Math.abs(a.y - b.y) > avgHeight * 0.45) return a.y - b.y;
        return a.x - b.x;
    });
}

function padSpriteRect(rect, image, pad) {
    return {
        x: Math.max(0, rect.x - pad),
        y: Math.max(0, rect.y - pad),
        width: Math.min(image.width - Math.max(0, rect.x - pad), rect.width + pad * 2),
        height: Math.min(image.height - Math.max(0, rect.y - pad), rect.height + pad * 2)
    };
}

function detectSpriteComponents(image, minArea) {
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const components = [];
    const backgroundSamples = [];
    [
        [0, 0], [1, 1], [canvas.width - 1, 0], [canvas.width - 2, 1],
        [0, canvas.height - 1], [1, canvas.height - 2], [canvas.width - 1, canvas.height - 1], [canvas.width - 2, canvas.height - 2],
        [Math.floor(canvas.width * 0.5), 0], [0, Math.floor(canvas.height * 0.5)], [canvas.width - 1, Math.floor(canvas.height * 0.5)]
    ].forEach(([sx, sy]) => {
        let idx = (sy * canvas.width + sx) * 4;
        backgroundSamples.push([data[idx], data[idx + 1], data[idx + 2]]);
    });
    function isBackgroundPixel(pixelIndex) {
        let r = data[pixelIndex * 4];
        let g = data[pixelIndex * 4 + 1];
        let b = data[pixelIndex * 4 + 2];
        let a = data[pixelIndex * 4 + 3];
        if (a < 20) return true;
        if (r > 247 && g > 247 && b > 247) return true;
        return backgroundSamples.some(sample => Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]) <= 28);
    }
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            let idx = y * canvas.width + x;
            if (visited[idx]) continue;
            visited[idx] = 1;
            if (isBackgroundPixel(idx)) continue;
            let qx = [x];
            let qy = [y];
            let head = 0;
            let minX = x, maxX = x, minY = y, maxY = y, area = 0;
            while (head < qx.length) {
                let px = qx[head];
                let py = qy[head];
                head++;
                area++;
                if (px < minX) minX = px;
                if (px > maxX) maxX = px;
                if (py < minY) minY = py;
                if (py > maxY) maxY = py;
                let neighbors = [
                    [px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]
                ];
                neighbors.forEach(([nx, ny]) => {
                    if (nx < 0 || ny < 0 || nx >= canvas.width || ny >= canvas.height) return;
                    let nIdx = ny * canvas.width + nx;
                    if (visited[nIdx]) return;
                    visited[nIdx] = 1;
                    if (isBackgroundPixel(nIdx)) return;
                    qx.push(nx);
                    qy.push(ny);
                });
            }
            if (area >= minArea) {
                components.push({ x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1, area: area });
            }
        }
    }
    return components;
}

function buildBattleAssetAtlas() {
    const heroParts = [
        { x: 212, y: 402, width: 161, height: 206 },
        { x: 438, y: 402, width: 167, height: 205 },
        { x: 676, y: 402, width: 218, height: 205 },
        { x: 899, y: 402, width: 223, height: 204 },
        { x: 1204, y: 402, width: 195, height: 205 }
    ];
    const heroPartsV2 = [
        { x: 174, y: 331, width: 132, height: 169 },
        { x: 360, y: 331, width: 137, height: 169 },
        { x: 556, y: 331, width: 179, height: 169 },
        { x: 740, y: 331, width: 183, height: 168 },
        { x: 991, y: 331, width: 160, height: 169 }
    ];
    const enemyParts = {
        slime: { x: 471, y: 312, width: 193, height: 102 },
        wraith: { x: 762, y: 231, width: 177, height: 217 },
        knight: { x: 1017, y: 222, width: 294, height: 233 },
        bandit: { x: 214, y: 624, width: 152, height: 207 },
        shadow: { x: 451, y: 605, width: 156, height: 219 },
        boss: { x: 603, y: 497, width: 376, height: 342 },
        skeleton: { x: 1024, y: 561, width: 297, height: 271 }
    };
    const effectParts = [
        { x: 121, y: 137, width: 216, height: 189 },
        { x: 379, y: 151, width: 250, height: 171 },
        { x: 686, y: 150, width: 215, height: 161 },
        { x: 949, y: 150, width: 179, height: 152 },
        { x: 1023, y: 181, width: 176, height: 184 },
        { x: 1201, y: 132, width: 249, height: 182 },
        { x: 97, y: 413, width: 183, height: 84 },
        { x: 363, y: 417, width: 177, height: 122 },
        { x: 668, y: 390, width: 190, height: 154 },
        { x: 944, y: 402, width: 185, height: 139 },
        { x: 1210, y: 394, width: 182, height: 156 },
        { x: 618, y: 792, width: 194, height: 124 },
        { x: 859, y: 734, width: 163, height: 183 },
        { x: 1074, y: 740, width: 120, height: 172 },
        { x: 1213, y: 802, width: 214, height: 101 },
        { x: 116, y: 747, width: 167, height: 168 }
    ];
    const tileParts = [
        { x: 151, y: 180, width: 170, height: 186 },
        { x: 364, y: 181, width: 174, height: 185 },
        { x: 581, y: 181, width: 179, height: 184 },
        { x: 800, y: 180, width: 188, height: 185 },
        { x: 1023, y: 181, width: 176, height: 184 },
        { x: 1234, y: 185, width: 165, height: 180 },
        { x: 153, y: 399, width: 170, height: 192 },
        { x: 363, y: 404, width: 178, height: 187 },
        { x: 581, y: 404, width: 179, height: 187 },
        { x: 799, y: 405, width: 189, height: 186 },
        { x: 1024, y: 404, width: 175, height: 187 },
        { x: 1238, y: 417, width: 171, height: 127 },
        { x: 151, y: 628, width: 170, height: 189 },
        { x: 366, y: 628, width: 172, height: 189 },
        { x: 581, y: 629, width: 179, height: 190 },
        { x: 800, y: 628, width: 188, height: 189 },
        { x: 1024, y: 630, width: 175, height: 187 }
    ];
    const legacyHeroImage = battleAssets.images.heroLegacy;
    let heroFramesLegacy = legacyHeroImage ? heroParts.map(part => trimRectToContent(legacyHeroImage, part, 3)) : [];
    let heroFramesV2 = legacyHeroImage ? heroPartsV2.map(part => trimRectToContent(legacyHeroImage, part, 3)) : [];
    function hasUsableFrame(frame) {
        return !!(frame && Number.isFinite(frame.width) && Number.isFinite(frame.height) && frame.width >= 18 && frame.height >= 24);
    }
    function isNearSize(image, width, height, tolerance) {
        let tw = tolerance || 0.035;
        let th = tolerance || 0.035;
        return Math.abs((image.width || 0) - width) <= width * tw && Math.abs((image.height || 0) - height) <= height * th;
    }
    function buildScaledHeroParts(image) {
        let scaleX = image.width / 1536;
        let scaleY = image.height / 1024;
        return heroParts.map(part => ({
            x: Math.max(0, Math.round(part.x * scaleX)),
            y: Math.max(0, Math.round(part.y * scaleY)),
            width: Math.max(10, Math.round(part.width * scaleX)),
            height: Math.max(10, Math.round(part.height * scaleY))
        }));
    }
    function withImageRef(image, frame) {
        if (!image || !frame) return null;
        return { ...frame, image: image };
    }
    function buildStripFramesFromImage(image, minArea) {
        if (!image) return [];
        let detected = sortSheetComponents(detectSpriteComponents(image, minArea || 220))
            .map(rect => trimRectToContent(image, padSpriteRect(rect, image, 2), 2))
            .filter(rect => rect && rect.width >= 22 && rect.height >= 38)
            .map(rect => withImageRef(image, rect))
            .filter(Boolean);
        if (detected.length > 0) return detected;
        let fallbackCols = Math.max(1, Math.round((image.width || 1) / 80));
        let frameWidth = Math.max(1, Math.floor((image.width || 1) / fallbackCols));
        let fallback = [];
        for (let i = 0; i < fallbackCols; i++) {
            fallback.push(withImageRef(image, trimRectToContent(image, { x: i * frameWidth, y: 0, width: frameWidth, height: image.height }, 1)));
        }
        return fallback.filter(Boolean);
    }
    function normalizeFrameSetBasisHeight(frames) {
        let list = (frames || []).filter(Boolean);
        if (list.length <= 0) return [];
        let heights = list.map(frame => Math.max(1, Math.round(frame.height || 1))).sort((a, b) => a - b);
        let mid = Math.floor(heights.length / 2);
        let basisHeight = heights[mid] || heights[0] || 1;
        return list.map(frame => ({ ...frame, basisHeight: basisHeight }));
    }
    function buildHeroFrameSetFromStripKeys(stripKeys, heroId) {
        if (!stripKeys) return null;
        let idleFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.idle], 210));
        let walkFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.walk], 210));
        let attackFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.attack], 220));
        let hurtFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.hurt], 200));
        let downFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.death], 200));
        if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
        let hold = idleFrames[0] || walkFrames[0] || attackFrames[0];
        return {
            characterAnimations: {
                idle: idleFrames,
                walk_or_run: walkFrames,
                sword_attack_body: attackFrames,
                cast_body: attackFrames,
                hurt: hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
                down_or_knockdown: downFrames.length > 0 ? downFrames : (hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean)),
                bow_attack_body: attackFrames
            },
            clipLoop: {
                idle: true,
                walk_or_run: true,
                sword_attack_body: heroId === 'hero2' || heroId === 'hero3' || heroId === 'hero4',
                cast_body: false,
                hurt: false,
                down_or_knockdown: false,
                bow_attack_body: false
            },
            idle: idleFrames,
            walk: walkFrames,
            run: walkFrames,
            swordCombo: attackFrames,
            castCombo: attackFrames,
            projectileCombo: attackFrames,
            bowCombo: attackFrames,
            hurt: hurtFrames,
            down: downFrames,
            attack: attackFrames[0] || hold || null,
            sideIdle: hold || null,
            sideWalk: walkFrames[0] || hold || null,
            frontIdle: hold || null,
            frontGuard: idleFrames[1] || hold || null
        };
    }
    function buildHeroFrameSetFromDetectedRows(image) {
        let detected = detectSpriteComponents(image, 650)
            .filter(rect => rect.width >= 36 && rect.height >= 48)
            .sort((a, b) => (a.y - b.y) || (a.x - b.x));
        if (detected.length < 4) return null;
        let rows = [];
        let rowThreshold = Math.max(14, Math.round((image.height || 900) * 0.07));
        detected.forEach(rect => {
            let row = rows.find(entry => Math.abs(entry.anchorY - rect.y) <= rowThreshold);
            if (!row) {
                row = { anchorY: rect.y, items: [] };
                rows.push(row);
            }
            row.items.push(rect);
            row.anchorY = Math.round((row.anchorY * (row.items.length - 1) + rect.y) / row.items.length);
        });
        rows.sort((a, b) => a.anchorY - b.anchorY);
        rows.forEach(row => row.items.sort((a, b) => a.x - b.x));
        let walkRow = rows[0] ? rows[0].items : [];
        let combatRow = rows[1] ? rows[1].items : walkRow;
        if (walkRow.length === 0 || combatRow.length === 0) return null;
        function trim(rect) {
            return trimRectToContent(image, padSpriteRect(rect, image, 4), 2);
        }
        let walkA = trim(walkRow[0]);
        let walkB = trim(walkRow[1] || walkRow[0]);
        let frontIdle = trim(combatRow[0] || walkRow[0]);
        let frontGuard = trim(combatRow[1] || combatRow[0] || walkRow[0]);
        let sideIdle = trim(combatRow[2] || combatRow[1] || combatRow[0] || walkRow[0]);
        let attack = trim(combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        let extraA = trim(combatRow[4] || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        let extraB = trim(combatRow[5] || extraA || combatRow[3] || combatRow[2] || combatRow[1] || combatRow[0]);
        return buildHeroFrameSet([frontIdle, frontGuard, sideIdle, attack, walkA, extraA, extraB, attack, walkB]);
    }
    function buildHeroFrameSet(frames) {
        let base = (frames || []).filter(Boolean);
        let frontIdle = base[0];
        let frontGuard = base[1] || frontIdle;
        let sideIdle = base[2] || frontIdle || frontGuard;
        let attack = base[3] || sideIdle || frontIdle;
        let sideWalk = base[4] || sideIdle || attack;
        let rangedAttack = base[5] || attack;
        let castAttack = base[6] || rangedAttack || attack;
        let heavyAttack = base[7] || attack;
        return {
            frontIdle: frontIdle,
            frontGuard: frontGuard,
            sideIdle: sideIdle,
            attack: attack,
            sideWalk: sideWalk,
            rangedAttack: rangedAttack,
            castAttack: castAttack,
            heavyAttack: heavyAttack,
            idle: [frontIdle, frontGuard, sideIdle],
            walk: [sideWalk, sideIdle, sideWalk, frontGuard],
            swordCombo: [attack, sideIdle, attack],
            whirlCombo: [attack, sideWalk, attack, sideIdle],
            chaosCombo: [attack, sideIdle, attack],
            lightningCombo: [rangedAttack, sideIdle, rangedAttack],
            castCombo: [castAttack, frontGuard, castAttack],
            frostCombo: [castAttack, sideIdle, frontGuard],
            quakeCombo: [heavyAttack, attack, frontGuard],
            projectileCombo: [rangedAttack, sideIdle, rangedAttack]
        };
    }
    function buildHeroFrameSetFromDefs(image, defs) {
        let trimPadding = defs.trimPadding || {};
        let rawKeys = defs.rawKeys || {};
        function mergeFrameMeta(target, source) {
            let next = { ...target };
            if (source && Number.isFinite(source.basisHeight)) next.basisHeight = source.basisHeight;
            if (source && Number.isFinite(source.offsetX)) next.offsetX = source.offsetX;
            if (source && Number.isFinite(source.offsetY)) next.offsetY = source.offsetY;
            if (source && Number.isFinite(source.cropLeft)) next.cropLeft = source.cropLeft;
            if (source && Number.isFinite(source.cropRight)) next.cropRight = source.cropRight;
            if (source && Number.isFinite(source.cropTop)) next.cropTop = source.cropTop;
            if (source && Number.isFinite(source.cropBottom)) next.cropBottom = source.cropBottom;
            return next;
        }
        function buildList(key, list, pad) {
            let raw = !!rawKeys[key];
            return (list || []).map(rect => {
                let prepared = padSpriteRect(rect, image, raw ? 2 : (pad || 3));
                if (raw) return mergeFrameMeta(prepared, rect);
                return mergeFrameMeta(trimRectToContent(image, prepared, 2), rect);
            }).filter(hasUsableFrame);
        }
        let idle = buildList('idle', defs.idle, trimPadding.idle || 4);
        let walk = buildList('walk', defs.walk, trimPadding.walk || 4);
        let run = buildList('run', defs.run, trimPadding.run || 4);
        let swordCombo = buildList('swordCombo', defs.swordCombo, trimPadding.swordCombo || 4);
        let assassinCombo = buildList('assassinCombo', defs.assassinCombo, trimPadding.assassinCombo || 4);
        let whirlCombo = buildList('whirlCombo', defs.whirlCombo, trimPadding.whirlCombo || 4);
        let castCombo = buildList('castCombo', defs.castCombo, trimPadding.castCombo || 4);
        let chaosCombo = buildList('chaosCombo', defs.chaosCombo, trimPadding.chaosCombo || 4);
        let lightningCombo = buildList('lightningCombo', defs.lightningCombo, trimPadding.lightningCombo || 4);
        let flameCombo = buildList('flameCombo', defs.flameCombo, trimPadding.flameCombo || 4);
        let frostCombo = buildList('frostCombo', defs.frostCombo, trimPadding.frostCombo || 4);
        let greatswordCombo = buildList('greatswordCombo', defs.greatswordCombo, trimPadding.greatswordCombo || 4);
        let quakeCombo = buildList('quakeCombo', defs.quakeCombo, trimPadding.quakeCombo || 4);
        let projectileCombo = buildList('projectileCombo', defs.projectileCombo, trimPadding.projectileCombo || 4);
        let bowCombo = buildList('bowCombo', defs.bowCombo, trimPadding.bowCombo || 4);
        let hurt = buildList('hurt', defs.hurt, trimPadding.hurt || 4);
        let down = buildList('down', defs.down, trimPadding.down || 4);
        let frontIdle = idle[0] || walk[0] || swordCombo[0];
        let frontGuard = idle[1] || frontIdle;
        let sideIdle = idle[2] || idle[1] || walk[0] || frontIdle;
        let attack = swordCombo[1] || swordCombo[0] || sideIdle || frontIdle;
        let sideWalk = walk[1] || walk[0] || run[0] || sideIdle;
        let rangedAttack = projectileCombo[1] || projectileCombo[0] || castCombo[1] || castCombo[0] || attack;
        let castAttack = castCombo[2] || castCombo[1] || castCombo[0] || rangedAttack;
        let heavyAttack = quakeCombo[1] || quakeCombo[0] || whirlCombo[1] || whirlCombo[0] || attack;
        function uniqueFrames(list) {
            return (list || []).filter((frame, index, source) => frame && source.indexOf(frame) === index);
        }
        function pickPreferredFrame(list, indices, fallback) {
            let sequence = (list || []).filter(Boolean);
            for (let i = 0; i < indices.length; i++) {
                let idx = indices[i];
                if (sequence[idx]) return sequence[idx];
            }
            if (sequence.length > 0) return sequence[Math.floor(sequence.length / 2)];
            return fallback || null;
        }
        function withFallbackMeta(frame, defaults) {
            if (!frame) return frame;
            let next = { ...frame };
            if (defaults && Number.isFinite(defaults.basisHeight) && !Number.isFinite(next.basisHeight)) next.basisHeight = defaults.basisHeight;
            if (defaults && Number.isFinite(defaults.offsetX) && !Number.isFinite(next.offsetX)) next.offsetX = defaults.offsetX;
            if (defaults && Number.isFinite(defaults.offsetY) && !Number.isFinite(next.offsetY)) next.offsetY = defaults.offsetY;
            return next;
        }
        let idleHold = sideIdle || frontIdle || frontGuard;
        let walkSimple = uniqueFrames([
            walk[1] || walk[0],
            walk[5] || walk[4] || walk[2] || walk[walk.length - 1] || walk[0]
        ]);
        let runSimple = walkSimple.length > 0 ? walkSimple : uniqueFrames([
            run[1] || run[0],
            run[5] || run[4] || run[2] || run[run.length - 1] || run[0]
        ]);
        let swordMain = withFallbackMeta(pickPreferredFrame(swordCombo, [2, 0, 1, 4, 3, 5], attack), { basisHeight: 82, offsetY: 3 });
        let assassinMain = pickPreferredFrame(assassinCombo, [0, 1], swordMain || attack);
        let whirlMain = withFallbackMeta(pickPreferredFrame(whirlCombo, [1, 2, 3, 0, 4], swordMain || heavyAttack || attack), { basisHeight: 82, offsetY: 3 });
        let castMain = pickPreferredFrame(castCombo, [2, 3, 1, 4, 0], castAttack || rangedAttack || attack);
        let chaosMain = withFallbackMeta(pickPreferredFrame(chaosCombo, [2, 1, 3, 0], castMain || castAttack || attack), { basisHeight: 84, offsetY: 2 });
        let lightningMain = pickPreferredFrame(lightningCombo, [1, 0, 2, 4, 3], rangedAttack || attack);
        let flameMain = withFallbackMeta(pickPreferredFrame(flameCombo, [0, 1, 2, 3, 4, 5], swordMain || attack), { basisHeight: 82, offsetY: 3 });
        let frostMain = castMain || pickPreferredFrame(frostCombo, [1, 0, 2, 3, 4], castMain || castAttack || attack);
        let quakeMain = pickPreferredFrame(quakeCombo, [1, 2, 0], heavyAttack || swordMain || attack);
        let greatswordMain = pickPreferredFrame(greatswordCombo, [0, 1], heavyAttack || quakeMain || swordMain || attack);
        let projectileMain = pickPreferredFrame(projectileCombo, [1, 2, 3, 0], lightningMain || rangedAttack || attack);
        let bowMain = pickPreferredFrame(bowCombo, [5, 6, 4, 7, 3, 2, 8, 1, 0], projectileMain || rangedAttack || attack);
        let hurtHold = hurt[1] || hurt[0] || frontGuard || sideIdle || frontIdle;
        return {
            frontIdle: frontIdle,
            frontGuard: frontGuard,
            sideIdle: sideIdle,
            attack: attack,
            sideWalk: sideWalk,
            rangedAttack: rangedAttack,
            castAttack: castAttack,
            heavyAttack: heavyAttack,
            hurt: [hurtHold].filter(Boolean),
            down: down,
            idle: [idleHold].filter(Boolean),
            walk: walkSimple.length > 0 ? walkSimple : [sideWalk, sideIdle].filter(Boolean),
            run: runSimple.length > 0 ? runSimple : (walkSimple.length > 0 ? walkSimple : [sideWalk, sideIdle].filter(Boolean)),
            swordCombo: [swordMain].filter(Boolean),
            assassinCombo: [assassinMain].filter(Boolean),
            whirlCombo: [whirlMain].filter(Boolean),
            chaosCombo: [chaosMain].filter(Boolean),
            lightningCombo: [lightningMain].filter(Boolean),
            castCombo: [castMain].filter(Boolean),
            flameCombo: [flameMain].filter(Boolean),
            frostCombo: [frostMain].filter(Boolean),
            greatswordCombo: [greatswordMain].filter(Boolean),
            quakeCombo: [quakeMain].filter(Boolean),
            projectileCombo: [projectileMain].filter(Boolean),
            bowCombo: [bowMain].filter(Boolean)
        };
    }
    function scaleHeroFrameDefs(defs, scaleX, scaleY) {
        let next = {};
        Object.entries(defs || {}).forEach(([key, list]) => {
            if (key === 'trimPadding' || key === 'rawKeys') {
                next[key] = { ...(list || {}) };
                return;
            }
            next[key] = (list || []).map(rect => {
                let scaled = {
                    ...rect,
                    x: Math.max(0, Math.round(rect.x * scaleX)),
                    y: Math.max(0, Math.round(rect.y * scaleY)),
                    width: Math.max(12, Math.round(rect.width * scaleX)),
                    height: Math.max(12, Math.round(rect.height * scaleY))
                };
                if (Number.isFinite(rect.basisHeight)) scaled.basisHeight = Math.max(12, Math.round(rect.basisHeight * scaleY));
                if (Number.isFinite(rect.offsetX)) scaled.offsetX = rect.offsetX * scaleX;
                if (Number.isFinite(rect.offsetY)) scaled.offsetY = rect.offsetY * scaleY;
                if (Number.isFinite(rect.cropLeft)) scaled.cropLeft = Math.max(0, Math.round(rect.cropLeft * scaleX));
                if (Number.isFinite(rect.cropRight)) scaled.cropRight = Math.max(0, Math.round(rect.cropRight * scaleX));
                if (Number.isFinite(rect.cropTop)) scaled.cropTop = Math.max(0, Math.round(rect.cropTop * scaleY));
                if (Number.isFinite(rect.cropBottom)) scaled.cropBottom = Math.max(0, Math.round(rect.cropBottom * scaleY));
                return scaled;
            });
        });
        return next;
    }
    function getBattleHero1FrameDefs() {
        return {
            trimPadding: {
                swordCombo: 12,
                assassinCombo: 10,
                whirlCombo: 12,
                flameCombo: 10,
                frostCombo: 10,
                greatswordCombo: 12,
                lightningCombo: 8,
                projectileCombo: 8,
                bowCombo: 6
            },
            rawKeys: {
                swordCombo: true,
                assassinCombo: true,
                whirlCombo: true,
                flameCombo: true,
                greatswordCombo: true
            },
            idle: [
                { x: 30, y: 16, width: 74, height: 90 },
                { x: 140, y: 16, width: 76, height: 90 },
                { x: 348, y: 16, width: 78, height: 90 },
                { x: 452, y: 16, width: 70, height: 90 }
            ],
            walk: [
                { x: 26, y: 118, width: 76, height: 94 },
                { x: 130, y: 118, width: 90, height: 94 },
                { x: 248, y: 118, width: 78, height: 94 },
                { x: 356, y: 118, width: 74, height: 94 },
                { x: 458, y: 118, width: 82, height: 94 },
                { x: 576, y: 118, width: 74, height: 94 },
                { x: 680, y: 118, width: 76, height: 94 },
                { x: 776, y: 118, width: 78, height: 94 }
            ],
            run: [
                { x: 20, y: 210, width: 98, height: 94 },
                { x: 128, y: 210, width: 92, height: 94 },
                { x: 230, y: 210, width: 100, height: 94 },
                { x: 346, y: 210, width: 96, height: 94 },
                { x: 458, y: 210, width: 108, height: 94 },
                { x: 582, y: 210, width: 88, height: 94 },
                { x: 684, y: 210, width: 96, height: 94 },
                { x: 794, y: 210, width: 100, height: 94 }
            ],
            swordCombo: [
                { x: 18, y: 298, width: 130, height: 108 },
                { x: 144, y: 298, width: 196, height: 108 },
                { x: 322, y: 298, width: 138, height: 108 },
                { x: 462, y: 296, width: 210, height: 112 },
                { x: 646, y: 296, width: 194, height: 112 },
                { x: 814, y: 296, width: 218, height: 112 }
            ],
            assassinCombo: [
                { x: 18, y: 298, width: 130, height: 108, basisHeight: 82, offsetX: 10, offsetY: 3, cropLeft: 10 }
            ],
            whirlCombo: [
                { x: 12, y: 400, width: 160, height: 110 },
                { x: 154, y: 400, width: 214, height: 110 },
                { x: 340, y: 400, width: 170, height: 110 },
                { x: 500, y: 400, width: 162, height: 110 },
                { x: 636, y: 400, width: 148, height: 110 }
            ],
            castCombo: [
                { x: 32, y: 510, width: 72, height: 92 },
                { x: 122, y: 510, width: 78, height: 92 },
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 },
                { x: 526, y: 510, width: 96, height: 92 }
            ],
            chaosCombo: [
                { x: 122, y: 510, width: 78, height: 92 },
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 }
            ],
            lightningCombo: [
                { x: 24, y: 598, width: 98, height: 96 },
                { x: 154, y: 598, width: 92, height: 96 },
                { x: 278, y: 598, width: 88, height: 96 },
                { x: 410, y: 598, width: 96, height: 96 },
                { x: 884, y: 598, width: 82, height: 96 }
            ],
            flameCombo: [
                { x: 20, y: 688, width: 112, height: 104 },
                { x: 138, y: 688, width: 110, height: 104 },
                { x: 256, y: 688, width: 118, height: 104 },
                { x: 382, y: 688, width: 122, height: 104 },
                { x: 498, y: 688, width: 132, height: 104 },
                { x: 618, y: 688, width: 134, height: 104 }
            ],
            frostCombo: [
                { x: 30, y: 776, width: 74, height: 100 },
                { x: 140, y: 776, width: 100, height: 100 },
                { x: 270, y: 776, width: 118, height: 100 },
                { x: 396, y: 776, width: 114, height: 100 },
                { x: 530, y: 776, width: 112, height: 100 }
            ],
            greatswordCombo: [
                { x: 460, y: 294, width: 214, height: 116, basisHeight: 75, offsetX: 22, offsetY: 4, cropLeft: 60, cropTop: 28 }
            ],
            quakeCombo: [
                { x: 368, y: 302, width: 88, height: 100 },
                { x: 522, y: 302, width: 90, height: 100 },
                { x: 706, y: 302, width: 94, height: 100 }
            ],
            projectileCombo: [
                { x: 216, y: 510, width: 74, height: 92 },
                { x: 310, y: 510, width: 86, height: 92 },
                { x: 412, y: 510, width: 88, height: 92 },
                { x: 526, y: 510, width: 96, height: 92 }
            ],
            bowCombo: [
                { x: 38, y: 975, width: 74, height: 79 },
                { x: 158, y: 975, width: 84, height: 79 },
                { x: 274, y: 976, width: 81, height: 78 },
                { x: 387, y: 978, width: 90, height: 76 },
                { x: 508, y: 977, width: 84, height: 76 },
                { x: 616, y: 980, width: 89, height: 75 },
                { x: 728, y: 982, width: 95, height: 73 },
                { x: 843, y: 982, width: 95, height: 74 },
                { x: 962, y: 982, width: 81, height: 74 }
            ],
            hurt: [
                { x: 28, y: 870, width: 76, height: 94 },
                { x: 152, y: 870, width: 80, height: 94 },
                { x: 276, y: 870, width: 78, height: 94 },
                { x: 378, y: 870, width: 88, height: 94 },
                { x: 494, y: 870, width: 70, height: 94 },
                { x: 618, y: 870, width: 82, height: 94 }
            ],
            down: [
                { x: 42, y: 968, width: 78, height: 96 },
                { x: 184, y: 968, width: 88, height: 96 },
                { x: 330, y: 968, width: 90, height: 96 },
                { x: 458, y: 968, width: 94, height: 96 },
                { x: 582, y: 968, width: 100, height: 96 },
                { x: 710, y: 968, width: 96, height: 96 }
            ]
        };
    }
    function getBattleHero1SafeClipDefs() {
        return {
            bodyFrames: {
                B_IDLE_01: { x: 30, y: 16, width: 74, height: 90 },
                B_IDLE_02: { x: 140, y: 16, width: 76, height: 90 },
                B_IDLE_03: { x: 348, y: 16, width: 78, height: 90 },
                B_IDLE_04: { x: 452, y: 16, width: 70, height: 90 },
                B_WALK_01: { x: 26, y: 118, width: 76, height: 94 },
                B_WALK_02: { x: 130, y: 118, width: 90, height: 94 },
                B_WALK_03: { x: 248, y: 118, width: 78, height: 94 },
                B_WALK_04: { x: 356, y: 118, width: 74, height: 94 },
                B_WALK_05: { x: 458, y: 118, width: 82, height: 94 },
                B_WALK_06: { x: 576, y: 118, width: 74, height: 94 },
                B_WALK_07: { x: 680, y: 118, width: 76, height: 94 },
                B_WALK_08: { x: 776, y: 118, width: 78, height: 94 },
                B_SWORD_01: { x: 368, y: 302, width: 88, height: 100 },
                B_SWORD_02: { x: 522, y: 302, width: 90, height: 100 },
                B_SWORD_03: { x: 706, y: 302, width: 94, height: 100 },
                B_CAST_01: { x: 32, y: 510, width: 72, height: 92 },
                B_CAST_02: { x: 122, y: 510, width: 78, height: 92 },
                B_CAST_03: { x: 216, y: 510, width: 74, height: 92 },
                B_CAST_04: { x: 310, y: 510, width: 86, height: 92 },
                B_CAST_05: { x: 412, y: 510, width: 88, height: 92 },
                B_CAST_06: { x: 526, y: 510, width: 96, height: 92 },
                B_HURT_01: { x: 28, y: 870, width: 76, height: 94 },
                B_HURT_02: { x: 152, y: 870, width: 80, height: 94 },
                B_HURT_03: { x: 276, y: 870, width: 78, height: 94 },
                B_HURT_04: { x: 378, y: 870, width: 88, height: 94 },
                B_HURT_05: { x: 494, y: 870, width: 70, height: 94 },
                B_HURT_06: { x: 618, y: 870, width: 82, height: 94 },
                B_DOWN_01: { x: 42, y: 968, width: 78, height: 96 },
                B_DOWN_02: { x: 184, y: 968, width: 88, height: 96 },
                B_DOWN_03: { x: 330, y: 968, width: 90, height: 96 },
                B_DOWN_04: { x: 458, y: 968, width: 94, height: 96 },
                B_BOW_01: { x: 38, y: 975, width: 74, height: 79 },
                B_BOW_02: { x: 158, y: 975, width: 84, height: 79 },
                B_BOW_03: { x: 274, y: 976, width: 81, height: 78 },
                B_BOW_04: { x: 387, y: 978, width: 90, height: 76 },
                B_BOW_05: { x: 508, y: 977, width: 84, height: 76 },
                B_BOW_06: { x: 616, y: 980, width: 89, height: 75 },
                B_BOW_07: { x: 728, y: 982, width: 95, height: 73 },
                B_BOW_08: { x: 843, y: 982, width: 95, height: 74 },
                B_BOW_09: { x: 962, y: 982, width: 81, height: 74 }
            },
            characterAnimations: {
                idle: ['B_IDLE_01', 'B_IDLE_02', 'B_IDLE_03', 'B_IDLE_04'],
                walk_or_run: ['B_WALK_01', 'B_WALK_02', 'B_WALK_03', 'B_WALK_04', 'B_WALK_05', 'B_WALK_06', 'B_WALK_07', 'B_WALK_08'],
                sword_attack_body: ['B_SWORD_01', 'B_SWORD_02', 'B_SWORD_03'],
                cast_body: ['B_CAST_01', 'B_CAST_02', 'B_CAST_03', 'B_CAST_04', 'B_CAST_05', 'B_CAST_06'],
                hurt: ['B_HURT_01', 'B_HURT_02', 'B_HURT_03', 'B_HURT_04', 'B_HURT_05', 'B_HURT_06'],
                down_or_knockdown: ['B_DOWN_01', 'B_DOWN_02', 'B_DOWN_03', 'B_DOWN_04'],
                bow_attack_body: ['B_BOW_01', 'B_BOW_02', 'B_BOW_03', 'B_BOW_04', 'B_BOW_05', 'B_BOW_06', 'B_BOW_07', 'B_BOW_08', 'B_BOW_09']
            },
            clipLoop: {
                idle: true,
                walk_or_run: true,
                sword_attack_body: false,
                cast_body: false,
                hurt: false,
                down_or_knockdown: false,
                bow_attack_body: false
            }
        };
    }
    function scaleSafeHeroClipDefs(defs, scaleX, scaleY) {
        let scaled = {
            bodyFrames: {},
            characterAnimations: { ...(defs.characterAnimations || {}) },
            clipLoop: { ...(defs.clipLoop || {}) }
        };
        Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
            scaled.bodyFrames[id] = {
                x: Math.max(0, Math.round(rect.x * scaleX)),
                y: Math.max(0, Math.round(rect.y * scaleY)),
                width: Math.max(12, Math.round(rect.width * scaleX)),
                height: Math.max(12, Math.round(rect.height * scaleY))
            };
            if (Number.isFinite(rect.basisHeight)) scaled.bodyFrames[id].basisHeight = Math.max(12, Math.round(rect.basisHeight * scaleY));
            if (Number.isFinite(rect.offsetX)) scaled.bodyFrames[id].offsetX = rect.offsetX * scaleX;
            if (Number.isFinite(rect.offsetY)) scaled.bodyFrames[id].offsetY = rect.offsetY * scaleY;
        });
        return scaled;
    }
    function buildSafeHeroFrameSetFromClipDefs(image, defs) {
        let bodyFrames = {};
        Object.entries(defs.bodyFrames || {}).forEach(([id, rect]) => {
            let prepared = padSpriteRect(rect, image, 4);
            let trimmed = trimRectToContent(image, prepared, 2);
            if (hasUsableFrame(trimmed)) {
                if (Number.isFinite(rect.basisHeight)) trimmed.basisHeight = rect.basisHeight;
                if (Number.isFinite(rect.offsetX)) trimmed.offsetX = rect.offsetX;
                if (Number.isFinite(rect.offsetY)) trimmed.offsetY = rect.offsetY;
                bodyFrames[id] = trimmed;
            }
        });
        function resolveClip(name) {
            return (defs.characterAnimations && defs.characterAnimations[name] ? defs.characterAnimations[name] : [])
                .map(id => bodyFrames[id])
                .filter(Boolean);
        }
        let characterAnimations = {
            idle: resolveClip('idle'),
            walk_or_run: resolveClip('walk_or_run'),
            sword_attack_body: resolveClip('sword_attack_body'),
            cast_body: resolveClip('cast_body'),
            hurt: resolveClip('hurt'),
            down_or_knockdown: resolveClip('down_or_knockdown'),
            bow_attack_body: resolveClip('bow_attack_body')
        };
        return {
            characterAnimations: characterAnimations,
            clipLoop: { ...(defs.clipLoop || {}) },
            idle: characterAnimations.idle,
            walk: characterAnimations.walk_or_run,
            run: characterAnimations.walk_or_run,
            swordCombo: characterAnimations.sword_attack_body,
            castCombo: characterAnimations.cast_body,
            projectileCombo: characterAnimations.cast_body,
            bowCombo: characterAnimations.bow_attack_body,
            hurt: characterAnimations.hurt,
            down: characterAnimations.down_or_knockdown,
            attack: characterAnimations.sword_attack_body[0] || characterAnimations.idle[0] || null,
            sideIdle: characterAnimations.idle[0] || null,
            sideWalk: characterAnimations.walk_or_run[0] || characterAnimations.idle[0] || null,
            frontIdle: characterAnimations.idle[0] || null,
            frontGuard: characterAnimations.idle[1] || characterAnimations.idle[0] || null
        };
    }
    function buildSafeHeroFrameSetBattleHero1(image) {
        return buildSafeHeroFrameSetFromClipDefs(image, getBattleHero1SafeClipDefs());
    }
    function buildHeroFrameSetBattleHero1(image) {
        return buildSafeHeroFrameSetBattleHero1(image);
    }
    function buildHeroFrameSetBattleHeroV1(image) {
        let defs = scaleSafeHeroClipDefs(getBattleHero1SafeClipDefs(), image.width / 1448, image.height / 1086);
        return buildSafeHeroFrameSetFromClipDefs(image, defs);
    }
    let selectedHeroDef = getHeroSelectionDef(game.selectedHeroId);
    let heroFrameSet = buildHeroFrameSetFromStripKeys(selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== 'hero1') heroFrameSet = buildHeroFrameSetFromStripKeys(HERO_SELECTION_DEFS.hero1.strips, 'hero1');
    if (!heroFrameSet && heroFramesLegacy.length > 0) heroFrameSet = buildHeroFrameSet(heroFramesLegacy);
    // v2 하드 매핑 + 어떤 해상도든 커스텀/비표준 시트는 스케일/감지 fallback을 탄다.
    if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1448, 1086, 0.05)) {
        heroFrameSet = buildHeroFrameSetBattleHero1(legacyHeroImage);
    } else if (!heroFrameSet && legacyHeroImage && isNearSize(legacyHeroImage, 1264, 842, 0.05)) {
        heroFrameSet = buildHeroFrameSet(heroFramesV2);
        let detectedV2 = buildHeroFrameSetFromDetectedRows(legacyHeroImage);
        if (detectedV2) heroFrameSet = detectedV2;
    } else if (!heroFrameSet && legacyHeroImage) {
        let scaledParts = buildScaledHeroParts(legacyHeroImage);
        let scaledFrames = scaledParts.map(part => trimRectToContent(legacyHeroImage, part, 3));
        let scaledUsableCount = scaledFrames.filter(hasUsableFrame).length;
        if (scaledUsableCount >= 5) heroFrameSet = buildHeroFrameSet(scaledFrames);
        let detectedCustom = buildHeroFrameSetFromDetectedRows(legacyHeroImage);
        if (detectedCustom) heroFrameSet = detectedCustom;
    }
    if (!heroFrameSet) {
        heroFrameSet = {
            characterAnimations: { idle: [], walk_or_run: [], sword_attack_body: [], cast_body: [], hurt: [], down_or_knockdown: [], bow_attack_body: [] },
            clipLoop: {},
            idle: [],
            walk: [],
            run: []
        };
    }
    const enemyFrames = Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, trimRectToContent(battleAssets.images.enemies, part, key === 'boss' ? 5 : 3)]));
    function buildDetectedEnemyPools(image) {
        let pools = { normal: [], elite: [], boss: [] };
        if (!image) return pools;
        let detected = sortSheetComponents(detectSpriteComponents(image, 180))
            .map(rect => trimRectToContent(image, padSpriteRect(rect, image, 4), 2))
            .filter(hasUsableFrame);
        if (detected.length === 0) return pools;
        let ranked = [...detected].sort((a, b) => ((b.width * b.height) - (a.width * a.height)));
        let bossCount = Math.min(3, Math.max(1, Math.round(detected.length * 0.12)));
        let eliteCount = Math.min(8, Math.max(4, Math.round(detected.length * 0.24)));
        let bossSet = new Set(ranked.slice(0, bossCount));
        let eliteSet = new Set(ranked.slice(bossCount, bossCount + eliteCount));
        detected.forEach(frame => {
            if (bossSet.has(frame)) pools.boss.push({ image: image, frame: frame });
            else if (eliteSet.has(frame)) pools.elite.push({ image: image, frame: frame });
            else pools.normal.push({ image: image, frame: frame });
        });
        return pools;
    }
    function mergeEnemyPools(base, extra) {
        ['normal', 'elite', 'boss'].forEach(role => {
            base[role] = (base[role] || []).concat(extra[role] || []);
        });
        return base;
    }
    let enemyVariantPools = {
        normal: [
            { image: battleAssets.images.enemies, frame: enemyFrames.slime },
            { image: battleAssets.images.enemies, frame: enemyFrames.bandit },
            { image: battleAssets.images.enemies, frame: enemyFrames.shadow },
            { image: battleAssets.images.enemies, frame: enemyFrames.wraith }
        ].filter(entry => hasUsableFrame(entry.frame)),
        elite: [
            { image: battleAssets.images.enemies, frame: enemyFrames.knight },
            { image: battleAssets.images.enemies, frame: enemyFrames.skeleton },
            { image: battleAssets.images.enemies, frame: enemyFrames.shadow },
            { image: battleAssets.images.enemies, frame: enemyFrames.wraith },
            { image: battleAssets.images.enemies, frame: enemyFrames.bandit }
        ].filter(entry => hasUsableFrame(entry.frame)),
        boss: [
            { image: battleAssets.images.enemies, frame: enemyFrames.boss },
        ].filter(entry => hasUsableFrame(entry.frame))
    };
    enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies2));
    enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies3));
    const tileFrames = tileParts.map(part => trimRectToContent(battleAssets.images.tiles, part, 2));
    return {
        hero: {
            image: legacyHeroImage || battleAssets.images[(selectedHeroDef.strips || {}).idle] || battleAssets.images.hero1Idle || battleAssets.images.hero1Walk || battleAssets.images.hero1Attack || battleAssets.images.hero1Hurt || battleAssets.images.hero1Death,
            frames: heroFrameSet
        },
        enemies: {
            image: battleAssets.images.enemies,
            variants: enemyVariantPools,
            frames: {
                slime: enemyFrames.slime,
                wraith: enemyFrames.wraith,
                knight: enemyFrames.knight,
                bandit: enemyFrames.bandit,
                shadow: enemyFrames.shadow,
                boss: enemyFrames.boss,
                skeleton: enemyFrames.skeleton
            }
        },
        effects: {
            image: battleAssets.images.effects,
            frames: {
                slash: effectParts[0],
                flurry: effectParts[1],
                fireball: effectParts[2],
                iceLance: effectParts[3],
                chain: effectParts[4],
                poison: effectParts[5],
                frostWave: effectParts[6],
                lightningBurst: effectParts[7],
                voidSlash: effectParts[8],
                magma: effectParts[9],
                voidOrb: effectParts[10],
                whirl: effectParts[11],
                quake: effectParts[12],
                eruption: effectParts[13],
                drain: effectParts[14],
                crimsonSlash: effectParts[15]
            },
            animations: {
                sword_slash_vfx: [],
                dark_magic_projectile_vfx: [effectParts[10]].filter(Boolean),
                lightning_vfx: [effectParts[4], effectParts[7]].filter(Boolean),
                fireball_vfx: [padSpriteRect(effectParts[2], battleAssets.images.effects, 6), effectParts[13]].filter(Boolean),
                ice_projectile_vfx: [effectParts[3], effectParts[6]].filter(Boolean),
                arrow_projectile_vfx: [],
                impact_vfx: [effectParts[8], effectParts[12], effectParts[13], effectParts[15]].filter(Boolean)
            }
        },
        tiles: {
            image: battleAssets.images.tiles,
            frames: {
                grass: tileFrames[0],
                grassDeep: tileFrames[1],
                moss: tileFrames[2],
                stone: tileFrames[3],
                dirt: tileFrames[4],
                dirtWarm: tileFrames[5],
                grassBright: tileFrames[6],
                swamp: tileFrames[7],
                ruin: tileFrames[8],
                frost: tileFrames[9],
                lava: tileFrames[10],
                chest: tileFrames[11],
                roots: tileFrames[12],
                abyss: tileFrames[13],
                temple: tileFrames[14],
                templeAlt: tileFrames[15]
            }
        }
    };
}

function drawBattleSprite(ctx, image, rect, x, y, desiredHeight, options) {
    if (!rect) return;
    options = options || {};
    let sourceImage = rect.image || image;
    if (!sourceImage) return;
    let basisHeight = options.basisHeight || rect.basisHeight || rect.height;
    let scale = desiredHeight / basisHeight;
    let cropLeft = Math.max(0, Math.round(options.cropLeft === undefined ? (rect.cropLeft || 0) : options.cropLeft));
    let cropRight = Math.max(0, Math.round(options.cropRight === undefined ? (rect.cropRight || 0) : options.cropRight));
    let cropTop = Math.max(0, Math.round(options.cropTop === undefined ? (rect.cropTop || 0) : options.cropTop));
    let cropBottom = Math.max(0, Math.round(options.cropBottom === undefined ? (rect.cropBottom || 0) : options.cropBottom));
    let srcX = rect.x + cropLeft;
    let srcY = rect.y + cropTop;
    let srcW = Math.max(1, rect.width - cropLeft - cropRight);
    let srcH = Math.max(1, rect.height - cropTop - cropBottom);
    let drawWidth = Math.max(1, Math.round(srcW * scale));
    let drawHeight = Math.max(1, Math.round(srcH * scale));
    let dx = Math.round(x - drawWidth / 2 + (options.offsetX || rect.offsetX || 0));
    let dy = Math.round(y - drawHeight + (options.offsetY || rect.offsetY || 0));
    ctx.save();
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
    if (options.smoothing === 'high') {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    } else if (options.smoothing === 'pixel') {
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
    }
    if (options.rotation) {
        ctx.translate(Math.round(x + (options.offsetX || 0)), Math.round(y - drawHeight / 2 + (options.offsetY || 0)));
        ctx.rotate(options.rotation);
        if (options.outlineColor) {
            let thickness = Math.max(1, Math.round(options.outlineThickness || 1));
            ctx.globalAlpha = (options.alpha === undefined ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
            ctx.filter = `drop-shadow(0 ${thickness}px 0 ${options.outlineColor}) drop-shadow(0 ${-thickness}px 0 ${options.outlineColor}) drop-shadow(${thickness}px 0 0 ${options.outlineColor}) drop-shadow(${-thickness}px 0 0 ${options.outlineColor})`;
            ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight);
            ctx.filter = 'none';
            ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
        }
        ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight);
    } else {
        if (options.outlineColor) {
            let thickness = Math.max(1, Math.round(options.outlineThickness || 1));
            ctx.globalAlpha = (options.alpha === undefined ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
            ctx.filter = `drop-shadow(0 ${thickness}px 0 ${options.outlineColor}) drop-shadow(0 ${-thickness}px 0 ${options.outlineColor}) drop-shadow(${thickness}px 0 0 ${options.outlineColor}) drop-shadow(${-thickness}px 0 0 ${options.outlineColor})`;
            ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, dx, dy, drawWidth, drawHeight);
            ctx.filter = 'none';
            ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
        }
        ctx.drawImage(sourceImage, srcX, srcY, srcW, srcH, dx, dy, drawWidth, drawHeight);
    }
    ctx.restore();
}

function drawBattleTile(ctx, image, rect, x, y, size, options) {
    if (!image || !rect) return;
    options = options || {};
    let crop = options.crop === undefined ? 0 : options.crop;
    let overlap = options.overlap === undefined ? 1 : options.overlap;
    let sx = rect.x + crop;
    let sy = rect.y + crop;
    let sw = Math.max(1, rect.width - crop * 2);
    let sh = Math.max(1, rect.height - crop * 2);
    let dx = Math.floor(x) - overlap;
    let dy = Math.floor(y) - overlap;
    let dw = Math.ceil(size + overlap * 2);
    let dh = Math.ceil(size + overlap * 2);
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
}

function normalizeItem(item) {
    if (!item) return null;
    function coerceFiniteNumber(value, fallback) {
        let num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }
    function normalizeStatRecord(stat) {
        if (!stat || !stat.id) return null;
        let val = coerceFiniteNumber(stat.val, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.value, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.base, NaN);
        if (!Number.isFinite(val)) val = coerceFiniteNumber(stat.amount, 0);
        let min = coerceFiniteNumber(stat.valMin, NaN);
        if (!Number.isFinite(min)) min = coerceFiniteNumber(stat.min, NaN);
        if (!Number.isFinite(min)) min = coerceFiniteNumber(stat.base, val);
        let max = coerceFiniteNumber(stat.valMax, NaN);
        if (!Number.isFinite(max)) max = coerceFiniteNumber(stat.max, NaN);
        if (!Number.isFinite(max)) max = coerceFiniteNumber(stat.base, val);
        if (max < min) max = min;
        return {
            ...stat,
            val: val,
            valMin: min,
            valMax: max,
            tier: Math.max(0, Math.floor(coerceFiniteNumber(stat.tier, 0))),
            statName: stat.statName || getStatName(stat.id),
            originalVal: Number.isFinite(Number(stat.originalVal)) ? Number(stat.originalVal) : null
        };
    }
    item.baseStats = Array.isArray(item.baseStats) ? item.baseStats.map(normalizeStatRecord).filter(Boolean) : [];
    item.stats = Array.isArray(item.stats) ? item.stats.map(normalizeStatRecord).filter(Boolean) : [];
    item.rarity = item.rarity || 'magic';
    item.hiddenTier = Math.max(1, Math.floor(coerceFiniteNumber(item.hiddenTier, coerceFiniteNumber(item.itemTier, 1), 1)));
    item.baseName = item.baseName || item.name || '알 수 없는 장비';
    item.name = item.name || item.baseName;
    item.locked = !!item.locked;
    if (!item.id) item.id = ++itemIdCounter;
    return item;
}

function getItemCraftTier(item) {
    if (!item) return 1;
    if (Number.isFinite(item.hiddenTier)) return Math.max(1, Math.floor(item.hiddenTier));
    if (Number.isFinite(item.itemTier)) return Math.max(1, Math.floor(item.itemTier));
    return 1;
}

function getTierVisualLevel(tierValue) {
    return clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 10);
}

function getTierClassName(tierValue) {
    return `tier-${getTierVisualLevel(tierValue)}`;
}

function getTierBadgeHtml(tierValue, labelPrefix) {
    let tier = getTierVisualLevel(tierValue);
    let label = labelPrefix || 'T';
    return `<span class="tier-badge ${getTierClassName(tier)}">[${label}${tier}]</span>`;
}

function getUniqueCodexKeyByItem(item) {
    if (!item || item.rarity !== 'unique') return null;
    return `${item.slot}|${item.name}`;
}

function chooseItemBase(slot, zoneTier) {
    let candidates = BASE_ITEM_DB.filter(base => base.slot === slot && base.reqTier <= zoneTier);
    if (candidates.length === 0) candidates = BASE_ITEM_DB.filter(base => base.slot === slot);
    candidates.sort((a, b) => a.reqTier - b.reqTier);
    let take = candidates.slice(-Math.min(3, candidates.length));
    return rndChoice(take);
}

function rollBaseStats(base, zoneTier) {
    return base.baseStats.map(stat => {
        let val = stat.base;
        if (stat.id === 'energyShield') val *= 1.5;
        if (['leech', 'regen', 'regenSuppress'].includes(stat.id)) val = Math.round(val * 10) / 10;
        else val = Math.floor(val);
        return { id: stat.id, val: val, valMin: stat.base, valMax: stat.base, tier: 0, statName: getStatName(stat.id) };
    });
}

function rollAffixValue(mod, maxTier) {
    let statId = mod.statId || mod.id;
    let tier = 1;
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let min = mod.base + (tier * mod.step);
    let max = min + mod.step * 1.6;
    let val = min + Math.random() * (max - min);
    if (['leech', 'regen', 'regenSuppress'].includes(statId)) {
        val = Math.round(val * 10) / 10;
        min = Math.round(min * 10) / 10;
        max = Math.round(max * 10) / 10;
    } else {
        val = Math.floor(val);
        min = Math.floor(min);
        max = Math.floor(max);
    }
    return { id: statId, val: val, valMin: min, valMax: max, tier: tier, statName: mod.statName };
}

function pickTierInRangeWeighted(minTier, maxTier) {
    minTier = Math.max(1, Math.floor(minTier || 1));
    maxTier = Math.max(minTier, Math.floor(maxTier || minTier));
    let pool = [];
    for (let tier = minTier; tier <= maxTier; tier++) {
        let dist = tier - minTier;
        let weight = 1 / (1 + dist * 0.85);
        pool.push({ tier: tier, weight: weight });
    }
    let total = pool.reduce((sum, row) => sum + row.weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        if (roll < pool[i].weight) return pool[i].tier;
        roll -= pool[i].weight;
    }
    return pool[pool.length - 1].tier;
}

function rollAffixValueInTierRange(mod, minTier, maxTier) {
    let statId = mod.statId || mod.id;
    let tier = pickTierInRangeWeighted(minTier, maxTier);
    let min = mod.base + (tier * mod.step);
    let max = min + mod.step * 1.6;
    let val = min + Math.random() * (max - min);
    if (['leech', 'regen', 'regenSuppress'].includes(statId)) {
        val = Math.round(val * 10) / 10;
        min = Math.round(min * 10) / 10;
        max = Math.round(max * 10) / 10;
    } else {
        val = Math.floor(val);
        min = Math.floor(min);
        max = Math.floor(max);
    }
    return { id: statId, val: val, valMin: min, valMax: max, tier: tier, statName: mod.statName };
}

function getAvailableMods(item) {
    let existing = new Set((item.stats || []).map(stat => stat.id));
    let defenseSlots = new Set(['투구', '갑옷', '장갑', '신발']);
    let baseDefenseTypes = new Set((item.baseStats || [])
        .map(stat => stat && stat.id)
        .filter(id => id === 'armor' || id === 'evasion' || id === 'energyShield'));
    return MOD_DB.filter(mod => {
        let statId = mod.statId || mod.id;
        if (defenseSlots.has(item.slot) && ['armor','evasion','energyShield','armorPct','evasionPct','energyShieldPct'].includes(statId)) {
            if (baseDefenseTypes.size > 0) {
                if (statId.startsWith('armor') && !baseDefenseTypes.has('armor')) return false;
                if (statId.startsWith('evasion') && !baseDefenseTypes.has('evasion')) return false;
                if (statId.startsWith('energyShield') && !baseDefenseTypes.has('energyShield')) return false;
            }
        }
        return mod.slots.includes(item.slot) && !existing.has(statId);
    });
}

function updateItemName(item) {
    if (!item) return;
    if (item.rarity === 'normal') item.name = item.baseName;
    else if (item.rarity === 'magic') item.name = `마법의 ${item.baseName}`;
    else if (item.rarity === 'rare') item.name = `희귀한 ${item.baseName}`;
}

function rerollExplicitMods(item, rarity, zoneTier) {
    let maxTier = Math.max(1, zoneTier);
    let locked = (item.stats || []).filter(stat => stat && stat.lockedByHoney);
    item.stats = locked.slice();
    let count = 0;
    if (rarity === 'magic') count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === 'rare') count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - locked.length);
    let mods = pickRandomMods(getAvailableMods(item), count);
    mods.forEach(mod => item.stats.push(rollAffixValue(mod, maxTier)));
    updateItemName(item);
}

function applyEnchantedHoneyToSelectedItem() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if ((game.currencies.enchantedHoney || 0) <= 0) return addLog('마력 깃든 벌꿀이 부족합니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length <= 0) return addLog('고정할 옵션이 없습니다.', 'attack-monster');
    if (item.stats.some(stat => stat && stat.lockedByHoney)) return addLog('이 장비에는 이미 고정 옵션이 있습니다.', 'attack-monster');
    let pick = item.stats[Math.floor(Math.random() * item.stats.length)];
    pick.lockedByHoney = true;
    game.currencies.enchantedHoney--;
    addLog(`🍯 [${item.name}] 옵션 고정 적용: ${pick.statName || getStatName(pick.id)}`, 'loot-unique');
    updateStaticUI();
}

function applyVenomStingerToSelectedItem() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if ((game.currencies.venomStinger || 0) <= 0) return addLog('독벌침이 부족합니다.', 'attack-monster');
    if (item.slot !== '무기') return addLog('독벌침은 무기에만 사용할 수 있습니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let attackMods = MOD_DB.filter(mod => mod.slots.includes('무기') && ['flatDmg', 'aspd', 'crit', 'critDmg', 'resPen', 'physPctDmg', 'elementalPctDmg', 'chaosPctDmg', 'leech', 'minDmgRoll', 'maxDmgRoll'].includes(mod.statId || mod.id));
    if (attackMods.length <= 0) return;
    let mod = pickWeightedMod(attackMods);
    let rolled = rollAffixValue(mod, getItemCraftTier(item));
    let idx = item.stats.findIndex(stat => stat && stat.venomStingerBonus);
    rolled.venomStingerBonus = true;
    if (idx >= 0) item.stats[idx] = rolled;
    else item.stats.push(rolled);
    game.currencies.venomStinger--;
    addLog(`🦂 독벌침 적용: ${rolled.statName || getStatName(rolled.id)} +${formatValue(rolled.id, rolled.val)}`, 'loot-rare');
    updateStaticUI();
}

function applyVoidChiselToSelectedItem() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    let isAccessory = item.slot === '반지' || item.slot === '목걸이';
    if (!isAccessory) return addLog('공허의 끌은 반지/목걸이에만 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.voidChisel || 0) <= 0) return addLog('공허의 끌이 부족합니다.', 'attack-monster');
    item.voidSocket = item.voidSocket || { open: false, jewel: null };
    if (item.voidSocket.open) return addLog('이미 공허 소켓이 뚫려 있습니다.', 'attack-monster');
    item.voidSocket.open = true;
    game.currencies.voidChisel--;
    addLog(`🕳️ [${item.name}]에 공허 소켓을 생성했습니다.`, 'loot-rare');
    updateStaticUI();
}

function insertJewelIntoVoidSocket(invIdx) {
    let item = getSelectedCraftItem();
    if (!item || !item.voidSocket || !item.voidSocket.open) return;
    if (item.voidSocket.jewel) return addLog('이미 주얼이 장착되어 있습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    let jewel = game.jewelInventory[invIdx];
    if (!jewel) return;
    item.voidSocket.jewel = jewel;
    game.jewelInventory.splice(invIdx, 1);
    addLog(`💠 공허 소켓에 [${jewel.name}] 장착`, 'loot-magic');
    updateStaticUI();
}

function removeJewelFromVoidSocket() {
    let item = getSelectedCraftItem();
    if (!item || !item.voidSocket || !item.voidSocket.jewel) return;
    if ((game.currencies.voidChisel || 0) <= 0) return addLog('소켓에서 제거하려면 공허의 끌 1개가 필요합니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    if (game.jewelInventory.length >= getJewelInventoryLimit()) return addLog('주얼 인벤토리가 가득 찼습니다.', 'attack-monster');
    game.currencies.voidChisel--;
    game.jewelInventory.push(item.voidSocket.jewel);
    item.voidSocket.jewel = null;
    addLog('공허 소켓에서 주얼을 제거했습니다.', 'loot-normal');
    updateStaticUI();
}

function createItemFromBase(base, rarity, zoneTier) {
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        slot: base.slot,
        baseId: base.id,
        baseName: base.name,
        name: base.name,
        rarity: rarity,
        itemTier: zoneTier,
        hiddenTier: zoneTier,
        baseStats: rollBaseStats(base, zoneTier),
        stats: []
    };
    if (rarity === 'magic' || rarity === 'rare') rerollExplicitMods(item, rarity, zoneTier);
    return item;
}

function pickWeightedMod(mods) {
    if (!Array.isArray(mods) || mods.length === 0) return null;
    let totalWeight = mods.reduce((sum, mod) => sum + Math.max(0.01, Number(mod.weight) || 1), 0);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < mods.length; i++) {
        let weight = Math.max(0.01, Number(mods[i].weight) || 1);
        if (roll < weight) return mods[i];
        roll -= weight;
    }
    return mods[mods.length - 1];
}

function pickRandomMods(mods, count) {
    let pool = Array.isArray(mods) ? mods.slice() : [];
    let picks = [];
    let wanted = Math.max(0, Math.floor(count || 0));
    while (pool.length > 0 && picks.length < wanted) {
        let picked = pickWeightedMod(pool);
        if (!picked) break;
        picks.push(picked);
        let idx = pool.findIndex(mod => mod.id === picked.id);
        if (idx >= 0) pool.splice(idx, 1);
    }
    return picks;
}

function rollUniqueStatValue(stat) {
    let min = stat.min !== undefined ? stat.min : stat.base;
    let max = stat.max !== undefined ? stat.max : stat.base;
    if (max < min) max = min;
    let val;
    if (['leech', 'regen', 'regenSuppress'].includes(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        let roll = minStep + Math.floor(Math.random() * (maxStep - minStep + 1));
        val = Math.round(roll) / 10;
        min = minStep / 10;
        max = maxStep / 10;
    } else {
        min = Math.floor(min);
        max = Math.floor(max);
        val = min + Math.floor(Math.random() * (max - min + 1));
    }
    return { min: min, max: max, val: val };
}

function generateUniqueItem(zoneTier, preferredSlot, forcedUniqueName) {
    let forcedUnique = forcedUniqueName ? UNIQUE_DB.find(unique => unique && unique.name === forcedUniqueName) : null;
    let slot = (forcedUnique && forcedUnique.slots && forcedUnique.slots[0]) || preferredSlot || rndChoice(['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠']);
    let normalOptions = UNIQUE_DB.filter(unique => !unique.ultraRare);
    let chaseOptions = UNIQUE_DB.filter(unique => unique.ultraRare && zoneTier >= (unique.reqTier || 1));
    let canRollChase = !game.seasonChaseUniqueDropped && chaseOptions.length > 0 && Math.random() < 0.0008;
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter(unique => unique.slots.includes(slot) && zoneTier >= (unique.reqTier || 1));
    if (options.length === 0) options = poolSource.filter(unique => zoneTier >= (unique.reqTier || 1));
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : UNIQUE_DB;
    let unique = forcedUnique || rndChoice(options);
    let uniqueTier = unique.reqTier || zoneTier;
    let base = chooseItemBase(unique.slots[0], uniqueTier);
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        slot: unique.slots[0],
        baseId: base.id,
        baseName: base.name,
        name: unique.name,
        rarity: 'unique',
        itemTier: uniqueTier,
        hiddenTier: uniqueTier,
        baseStats: rollBaseStats(base, uniqueTier),
        stats: []
    };
    unique.stats.forEach(stat => {
        let rolled = rollUniqueStatValue(stat);
        let boost = unique.ultraRare ? 1 : 1.1;
        let val = ['leech', 'regen', 'regenSuppress'].includes(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
        let min = ['leech', 'regen', 'regenSuppress'].includes(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
        let max = ['leech', 'regen', 'regenSuppress'].includes(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
        item.stats.push({ id: stat.id, val: val, valMin: min, valMax: max, tier: 0, statName: getStatName(stat.id) });
    });
    if (unique.ultraRare) {
        game.seasonChaseUniqueDropped = true;
        addLog(`🌠 체이싱 유니크 발견! [${unique.name}]`, 'loot-unique');
    }
    return item;
}

function generateEquipmentDrop(enemy) {
    let zoneTier = getZone(game.currentZoneId).tier;
    let slot = rndChoice(['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠']);
    let base = chooseItemBase(slot, zoneTier);
    let rarity = 'normal';
    let roll = Math.random();
    if (enemy.isBoss) {
        if (roll < 0.055) return generateUniqueItem(zoneTier, slot);
        rarity = roll < 0.36 ? 'rare' : (roll < 0.80 ? 'magic' : 'normal');
    } else if (enemy.isElite) {
        if (roll < 0.02) return generateUniqueItem(zoneTier, slot);
        rarity = roll < 0.24 ? 'rare' : (roll < 0.62 ? 'magic' : 'normal');
    } else {
        if (roll < 0.006) return generateUniqueItem(zoneTier, slot);
        rarity = roll < 0.09 ? 'rare' : (roll < 0.30 ? 'magic' : 'normal');
    }
    return createItemFromBase(base, rarity, zoneTier);
}

function awardCurrency(currencyKey, amount) {
    game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + amount;
    if (currencyKey === 'divine' && amount > 0) {
        showDivineDropBanner(amount);
        addLog(`✨✨ <strong>신성한 오브 +${amount}</strong> 획득!`, 'loot-unique');
    }
    if (!game.gemEnhanceUnlocked && (currencyKey === 'bossCore' || currencyKey === 'skyEssence')) {
        game.gemEnhanceUnlocked = true;
        game.noti.skills = true;
        addLog('☁️ 스킬 젬 강화 탭이 개방되었습니다!', 'loot-unique');
    }
    if (!game.talismanUnlocked && (currencyKey === 'sealShard' || currencyKey === 'strongSealShard')) {
        game.talismanUnlocked = true;
        game.unlocks.talisman = true;
        game.noti.talisman = true;
        addLog('🧿 부적 탭이 개방되었습니다!', 'loot-unique');
    }
}

function getCurrencyDrops(enemy) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    let dropBonus = getCodexBonusPct() / 100;
    let abyssScale = getAbyssMonsterScales(zone);
    let bonusRoll = chance => Math.random() < Math.min(0.95, chance * (1 + dropBonus) * (abyssScale.dropMul || 1) * (enemy && enemy.dropMul ? enemy.dropMul : 1));
    let drops = [];
    if (enemy.isBoss) {
        if (bonusRoll(0.30)) drops.push([Math.random() < 0.55 ? 'transmute' : 'augment', 1]);
        if (bonusRoll(0.17)) drops.push(['alteration', 1]);
        if (bonusRoll(0.31)) drops.push(['alchemy', 1]);
        if (bonusRoll(0.08)) drops.push(['regal', 1]);
        if (bonusRoll(0.17)) drops.push(['chaos', 1]);
        if (bonusRoll(0.025)) drops.push(['divine', 1]);
        if (bonusRoll(0.05)) drops.push(['exalted', 1]);
    } else if (enemy.isElite) {
        if (bonusRoll(0.18)) {
            let roll = Math.random();
            drops.push([roll < 0.34 ? 'transmute' : (roll < 0.66 ? 'augment' : (roll < 0.9 ? 'alteration' : 'alchemy')), 1]);
        }
        if (bonusRoll(0.015)) drops.push(['regal', 1]);
        if (bonusRoll(0.03)) drops.push(['chaos', 1]);
    } else if (bonusRoll(0.02)) {
        drops.push([[ 'transmute', 'transmute', 'augment', 'alteration', 'scour' ][Math.floor(Math.random() * 5)], 1]);
    }
    let mappingOpened = (game.maxZoneId || 0) >= ABYSS_START_ZONE_ID;
    if ((game.season || 1) >= 2 && mappingOpened && zone.type !== 'trial' && zone.type !== 'seasonBoss') {
        if (enemy.isBoss && Math.random() < 0.044) {
            let key = ['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm'][Math.floor(Math.random() * 3)];
            drops.push([key, 1]);
        } else if (enemy.isElite && Math.random() < 0.01) {
            let key = ['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm'][Math.floor(Math.random() * 3)];
            drops.push([key, 1]);
        }
    }
    if ((game.season || 1) >= 4 && enemy.isSky && Math.random() < 0.35) drops.push(['skyEssence', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.16) drops.push(['tainted', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.03) drops.push(['jewelShard', 3]);
    if ((game.season || 1) >= 5 && enemy.isElite && Math.random() < 0.008) drops.push(['jewelShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.08) drops.push(['sealShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.012) drops.push(['strongSealShard', 1]);
    if ((game.season || 1) >= 6 && enemy.isBoss && zone.type === 'abyss' && Number(zone.id) >= 19 && Math.random() < 0.006) drops.push(['beastKeyCerberus', 1]);
    if (enemy.isBoss && zone.type === 'abyss' && Math.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(['jewelShard', 2]);
    return drops;
}

function addItemToInventory(item, options) {
    normalizeItem(item);
    let ignoreFilter = !!(options && options.ignoreFilter);
    if (!ignoreFilter && !passesItemPickupFilter(item)) {
        if (game.settings.showLootLog) addLog(`🚫 아이템 필터로 미습득: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'attack-monster');
        return false;
    }
    if ((game.inventory || []).length >= getInventoryLimit()) {
        salvageItemObject(item, true);
        return false;
    }
    if (game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities && game.settings.autoSalvageRarities[item.rarity]) {
        salvageItemObject(item, true);
        if (game.settings.showLootLog) addLog(`🧪 자동해체: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'loot-normal');
        return false;
    }
    game.inventory.push(item);
    game.noti.items = true;
    checkUnlocks();
    return true;
}

function passesItemPickupFilter(item) {
    let settings = game.settings || {};
    if (!settings.itemFilterEnabled) return true;
    let rarities = { normal: true, magic: true, rare: true, unique: true, ...(settings.itemFilterRarities || {}) };
    if (!rarities[item.rarity]) return false;
    let minHiddenTier = Math.max(1, Math.floor(settings.itemFilterMinHiddenTier || 1));
    if ((item.hiddenTier || item.itemTier || 1) < minHiddenTier) return false;
    let tierThreshold = Math.max(1, Math.floor(settings.itemFilterTierThreshold || 10));
    let minTierCount = Math.max(0, Math.floor(settings.itemFilterMinTierCount || 0));
    if (minTierCount > 0) {
        let count = (item.stats || []).filter(stat => Number.isFinite(stat.tier) && stat.tier >= tierThreshold).length;
        if (count < minTierCount) return false;
    }
    if (item.rarity === 'unique' && settings.itemFilterOnlyNewCodexUnique) {
        let key = getUniqueCodexKeyByItem(item);
        if (key && game.uniqueCodex && game.uniqueCodex[key]) return false;
    }
    return true;
}

function generateJewelDrop(zoneTier) {
    let pool = [
        { id: 'pctDmg', name: '피해 증폭', min: 4, max: 10 },
        { id: 'flatHp', name: '생명력 주입', min: 20, max: 45 },
        { id: 'crit', name: '치명 보석', min: 2, max: 6 },
        { id: 'aspd', name: '질주 보석', min: 3, max: 7 },
        { id: 'resAll', name: '수호 보석', min: 4, max: 9 },
        { id: 'physIgnore', name: '절개 파편', min: 2, max: 6 },
        { id: 'resPen', name: '관통 수정', min: 2, max: 6 },
        { id: 'dotPctDmg', name: '부패 수정', min: 4, max: 10 },
        { id: 'regenSuppress', name: '봉쇄 파편', min: 0.1, max: 0.2, step: 0.1 },
        { id: 'minDmgRoll', name: '하한 수정', min: 1, max: 3 },
        { id: 'maxDmgRoll', name: '상한 수정', min: 1, max: 3 }
    ];
    let pick = rndChoice(pool);
    let val = Number.isFinite(pick.step) && pick.step < 1
        ? (pick.min + (Math.floor(Math.random() * ((pick.max - pick.min) / pick.step + 1)) * pick.step))
        : (pick.min + Math.floor(Math.random() * (pick.max - pick.min + 1)));
    let tierBoost = Math.max(0, zoneTier - 8);
    if (tierBoost >= 6) val += Math.floor(Math.random() * 3) + 1;
    let rarityRoll = Math.random();
    let rarity = 'normal';
    if (rarityRoll > 0.9) rarity = 'rare';
    else if (rarityRoll > 0.55) rarity = 'magic';
    if (rarity === 'magic') val = Number.isFinite(pick.step) && pick.step < 1 ? Math.round(val * 1.2 * 10) / 10 : Math.floor(val * 1.22);
    if (rarity === 'rare') val = Number.isFinite(pick.step) && pick.step < 1 ? Math.round(val * 1.4 * 10) / 10 : Math.floor(val * 1.45);
    return { id: Date.now() + Math.floor(Math.random() * 100000), name: pick.name, tier: zoneTier, rarity: rarity, stats: [{ id: pick.id, val: val }] };
}

function getJewelStats(jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.filter(stat => stat && stat.id);
    if (jewel.stat && jewel.stat.id) return [jewel.stat];
    return [];
}

function getJewelRarityLabel(rarity) {
    if (rarity === 'rare') return '레어';
    if (rarity === 'magic') return '매직';
    return '일반';
}

function getJewelRarityClass(rarity) {
    if (rarity === 'rare') return 'rare';
    if (rarity === 'magic') return 'magic';
    return 'normal';
}

function salvageJewelObject(jewel, silent) {
    if (!jewel || getJewelStats(jewel).length === 0) return;
    let rarity = jewel.rarity || 'normal';
    let shardGain = rarity === 'rare' ? 9 : (rarity === 'magic' ? 5 : 2);
    awardCurrency('jewelShard', shardGain);
    if (!silent) addLog(`💠 [${jewel.name}] 주얼 해체 (+주얼 결정 ${shardGain})`, 'loot-normal');
}

function toggleJewelFusionSelection(idx) {
    jewelFusionSelection = jewelFusionSelection || [];
    if (jewelFusionSelection.includes(idx)) jewelFusionSelection = jewelFusionSelection.filter(v => v !== idx);
    else {
        jewelFusionSelection.push(idx);
        if (jewelFusionSelection.length > 2) jewelFusionSelection = jewelFusionSelection.slice(-2);
    }
    updateStaticUI();
}

function craftJewelFusion() {
    game.jewelInventory = game.jewelInventory || [];
    jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length);
    if (jewelFusionSelection.length !== 2) return addLog('융합할 주얼 2개를 선택하세요.', 'attack-monster');
    let fusionCost = 6;
    if ((game.currencies.jewelShard || 0) < fusionCost) return addLog(`주얼 결정이 부족합니다. (필요: ${fusionCost})`, 'attack-monster');
    let sorted = jewelFusionSelection.slice().sort((a, b) => a - b);
    let a = game.jewelInventory[sorted[0]];
    let b = game.jewelInventory[sorted[1]];
    let aStats = getJewelStats(a);
    let bStats = getJewelStats(b);
    if (aStats.length !== 1 || bStats.length !== 1) return addLog('1줄 옵션 주얼 2개만 융합할 수 있습니다.', 'attack-monster');
    let amplifiedEl = document.getElementById('chk-jewel-amplified-fusion');
    let useAmplified = !!(amplifiedEl && amplifiedEl.checked);
    if (useAmplified && (game.currencies.jewelShard || 0) < 8) return addLog('증폭합성에 필요한 주얼 결정이 부족합니다. (필요: 8)', 'attack-monster');
    game.currencies.jewelShard -= fusionCost;
    game.jewelInventory.splice(sorted[1], 1);
    game.jewelInventory.splice(sorted[0], 1);
    let fused = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: `융합 ${a.name}/${b.name}`,
        tier: Math.max(a.tier || 1, b.tier || 1),
        rarity: 'rare',
        stats: [aStats[0], bStats[0]]
    };
    if (useAmplified) {
        game.currencies.jewelShard -= 8;
        let penaltyPool = [{ id: 'dr', val: -2 }, { id: 'resAll', val: -3 }, { id: 'move', val: -4 }];
        let bonusPool = [{ id: 'targetAny', val: 1 }, { id: 'targetProjectile', val: 1 }, { id: 'targetSlam', val: 1 }, { id: 'crit', val: 4 }, { id: 'resPen', val: 3 }];
        let penalty = rndChoice(penaltyPool);
        let bonus = rndChoice(bonusPool);
        fused.stats.push({ id: penalty.id, val: penalty.val });
        fused.stats.push({ id: bonus.id, val: bonus.val });
        fused.name = `증폭 ${fused.name}`;
    }
    game.jewelInventory.push(fused);
    jewelFusionSelection = [];
    addLog(`💠 주얼 융합 성공! [${fused.name}]`, 'loot-unique');
    updateStaticUI();
}

function craftVoidJewel() {
    game.jewelInventory = game.jewelInventory || [];
    if ((game.currencies.voidChisel || 0) <= 0) return addLog('공허의 끌이 부족합니다.', 'attack-monster');
    if (game.jewelInventory.length < 2) return addLog('공허 주얼 제작에는 주얼 2개가 필요합니다.', 'attack-monster');
    let a = game.jewelInventory.shift();
    let b = game.jewelInventory.shift();
    let stats = [...getJewelStats(a), ...getJewelStats(b)].slice(0, 2).map(stat => {
        let scaled = stat.val * 0.85;
        let val = Number.isInteger(stat.val) ? Math.max(1, Math.floor(scaled)) : Math.max(0.1, Math.round(scaled * 10) / 10);
        return { id: stat.id, val: val };
    });
    let jewel = { id: Date.now() + Math.floor(Math.random()*10000), name: '공허 주얼', rarity: 'magic', isVoid: true, stats: stats, maxLines: 2 };
    game.currencies.voidChisel--;
    game.jewelInventory.push(jewel);
    addLog('🕳️ 공허 주얼 제작 완료 (2줄)', 'loot-rare');
    updateStaticUI();
}

function fuseVoidJewel(idxA, idxB) {
    game.jewelInventory = game.jewelInventory || [];
    let a = game.jewelInventory[idxA], b = game.jewelInventory[idxB];
    if (!a || !b || idxA === idxB) return;
    if (!(a.isVoid || b.isVoid)) return addLog('공허 주얼 융합은 최소 1개의 공허 주얼이 필요합니다.', 'attack-monster');
    let stats = [...getJewelStats(a), ...getJewelStats(b)];
    let seen = new Set();
    let merged = [];
    stats.forEach(stat => {
        if (merged.length >= 2) return;
        if (seen.has(stat.id)) return;
        seen.add(stat.id);
        merged.push({ id: stat.id, val: stat.val });
    });
    let newJewel = { id: Date.now() + Math.floor(Math.random()*10000), name: '융합 공허 주얼', rarity: 'rare', isVoid: true, stats: merged, maxLines: 2 };
    let hi = Math.max(idxA, idxB), lo = Math.min(idxA, idxB);
    game.jewelInventory.splice(hi, 1);
    game.jewelInventory.splice(lo, 1);
    game.jewelInventory.push(newJewel);
    addLog(`🕳️ 공허 주얼 융합 완료 (${merged.length}줄)`, 'loot-unique');
    updateStaticUI();
}

function fuseSelectedVoidJewels() {
    jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < (game.jewelInventory || []).length);
    if (jewelFusionSelection.length !== 2) return addLog('공허 융합할 주얼 2개를 선택하세요.', 'attack-monster');
    return fuseVoidJewel(jewelFusionSelection[0], jewelFusionSelection[1]);
}

function getJewelAmplifyCost(level) {
    return 4 + (Math.max(0, Math.floor(level || 0)) * 3);
}

function getJewelAmplifySuccessChance(level) {
    let failChance = Math.min(0.55, 0.12 + Math.max(0, Math.floor(level || 0)) * 0.045);
    return Math.max(0, 1 - failChance);
}

function playJewelAmplifyFeedback(slotIndex, success) {
    let card = document.getElementById(`jewel-slot-card-${slotIndex}`);
    if (!card) return;
    card.style.transition = 'box-shadow 140ms ease, border-color 140ms ease, transform 140ms ease';
    card.style.boxShadow = success ? '0 0 16px rgba(46, 204, 113, 0.65)' : '0 0 16px rgba(231, 76, 60, 0.65)';
    card.style.borderColor = success ? '#2ecc71' : '#e74c3c';
    card.style.transform = 'scale(1.02)';
    setTimeout(() => {
        if (!card) return;
        card.style.boxShadow = '';
        card.style.borderColor = '';
        card.style.transform = '';
    }, 420);
}

function tryAmplifyJewelSlot(slotIndex) {
    game.jewelSlotAmplify = Array.isArray(game.jewelSlotAmplify) ? game.jewelSlotAmplify : [0, 0];
    let level = Math.max(0, Math.floor(game.jewelSlotAmplify[slotIndex] || 0));
    if (level >= 10) return addLog(`주얼 슬롯 ${slotIndex + 1}은 이미 최대 증폭(10강)입니다.`, 'attack-monster');
    let cost = getJewelAmplifyCost(level);
    if ((game.currencies.jewelShard || 0) < cost) return addLog(`주얼 결정이 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.jewelShard -= cost;
    let failChance = 1 - getJewelAmplifySuccessChance(level);
    if (Math.random() < failChance) {
        playJewelAmplifyFeedback(slotIndex, false);
        addLog(`💥 주얼 슬롯 ${slotIndex + 1} 증폭 실패! (소모: ${cost})`, 'attack-monster');
    } else {
        game.jewelSlotAmplify[slotIndex] = level + 1;
        playJewelAmplifyFeedback(slotIndex, true);
        addLog(`✨ 주얼 슬롯 ${slotIndex + 1} 증폭 성공! ${game.jewelSlotAmplify[slotIndex]}/10`, 'loot-rare');
    }
    updateStaticUI();
}

function salvageJewel(idx) {
    let jewel = (game.jewelInventory || [])[idx];
    if (!jewel) return;
    salvageJewelObject(jewel, false);
    game.jewelInventory.splice(idx, 1);
    jewelFusionSelection = [];
    updateStaticUI();
}

function bulkSalvageJewels() {
    game.jewelInventory = game.jewelInventory || [];
    let selectedRarities = JEWEL_RARITY_ORDER.filter(rarity => {
        let el = document.getElementById(`chk-jewel-salvage-${rarity}`);
        return el && el.checked;
    });
    if (selectedRarities.length === 0) return addLog('주얼 해체 등급을 선택하세요.', 'attack-monster');
    let kept = [];
    let removed = 0;
    game.jewelInventory.forEach(jewel => {
        let rarity = jewel.rarity || 'normal';
        if (selectedRarities.includes(rarity)) {
            salvageJewelObject(jewel, true);
            removed++;
        } else {
            kept.push(jewel);
        }
    });
    if (removed === 0) return addLog('선택한 등급의 주얼이 없습니다.', 'attack-monster');
    game.jewelInventory = kept;
    jewelFusionSelection = [];
    addLog(`💠 주얼 ${removed}개를 해체해 주얼 결정을 회수했습니다.`, 'loot-normal');
    updateStaticUI();
}

function equipJewel(idx, slotIndex) {
    let jewel = (game.jewelInventory || [])[idx];
    if (!jewel) return;
    if (!Array.isArray(game.jewelSlots)) game.jewelSlots = [null, null];
    let old = game.jewelSlots[slotIndex];
    game.jewelSlots[slotIndex] = jewel;
    if (old) game.jewelInventory[idx] = old;
    else game.jewelInventory.splice(idx, 1);
    updateStaticUI();
}

function unequipJewel(slotIndex) {
    if (!Array.isArray(game.jewelSlots)) game.jewelSlots = [null, null];
    let jewel = game.jewelSlots[slotIndex];
    if (!jewel) return;
    game.jewelInventory = game.jewelInventory || [];
    if (game.jewelInventory.length >= getJewelInventoryLimit()) return addLog(`주얼 인벤토리가 가득 찼습니다. (최대 ${getJewelInventoryLimit()})`, 'attack-monster');
    game.jewelInventory.push(jewel);
    game.jewelSlots[slotIndex] = null;
    updateStaticUI();
}

function salvageItemObject(item, silent) {
    if (!item) return;
    if (item.rarity === 'normal') awardCurrency('transmute', 1);
    else if (item.rarity === 'magic') awardCurrency('augment', 1);
    else if (item.rarity === 'rare') awardCurrency('chaos', 1);
    else if (item.rarity === 'unique') {
        if (Math.random() < 0.12) awardCurrency('divine', 1);
        if (Math.random() < 0.55) awardCurrency('exalted', 1);
    }
    if (!silent) addLog(`🧪 [${item.name}] 해체`, "loot-normal");
}

function salvageItem(idx) {
    let item = game.inventory[idx];
    if (!item) return;
    if (item.locked) return addLog(`🔒 잠금된 아이템은 해체할 수 없습니다. [${item.name}]`, 'attack-monster');
    if (!isCraftSelectionEquip() && getCraftSelectionRef() === item.id) clearCraftSelection();
    salvageItemObject(item, false);
    game.inventory.splice(idx, 1);
    updateStaticUI();
}

function updateSalvageSettingsFromUI() {
    game.settings.autoSalvageRarities = game.settings.autoSalvageRarities || { normal: true, magic: true, rare: false, unique: false };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
        let el = document.getElementById(`chk-salvage-${rarity}`);
        if (el) game.settings.autoSalvageRarities[rarity] = !!el.checked;
    });
}

function syncSalvageControlsFromSettings() {
    game.settings.autoSalvageRarities = game.settings.autoSalvageRarities || { normal: true, magic: true, rare: false, unique: false };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
        let el = document.getElementById(`chk-salvage-${rarity}`);
        if (el) el.checked = !!game.settings.autoSalvageRarities[rarity];
    });
    let btn = document.getElementById('btn-auto-salvage');
    if (btn) {
        let enabled = !!game.settings.autoSalvageEnabled;
        btn.innerText = `자동해체 ${enabled ? 'ON' : 'OFF'}`;
        btn.style.borderColor = enabled ? '#2ecc71' : '#7d8d9e';
        btn.style.background = enabled ? 'linear-gradient(180deg, #2f8f5f 0%, #236847 100%)' : 'linear-gradient(180deg, #596b7d 0%, #44515f 100%)';
    }
}

function toggleAutoSalvage() {
    game.settings.autoSalvageEnabled = !game.settings.autoSalvageEnabled;
    syncSalvageControlsFromSettings();
    addLog(`⚙️ 자동해체 ${game.settings.autoSalvageEnabled ? '활성화' : '비활성화'}`, 'loot-normal');
}

function syncJewelSalvageControlsFromSettings() {
    game.settings.jewelAutoSalvageRarities = { normal: false, magic: false, rare: false, ...(game.settings.jewelAutoSalvageRarities || {}) };
    ['normal', 'magic', 'rare'].forEach(rarity => {
        let el = document.getElementById(`chk-jewel-salvage-${rarity}`);
        if (el) el.checked = !!game.settings.jewelAutoSalvageRarities[rarity];
    });
    let btn = document.getElementById('btn-jewel-auto-salvage');
    if (btn) btn.innerText = `주얼 자동해체 ${game.settings.jewelAutoSalvageEnabled ? 'ON' : 'OFF'}`;
}

function updateJewelSalvageSettingsFromUI() {
    game.settings.jewelAutoSalvageRarities = game.settings.jewelAutoSalvageRarities || { normal: false, magic: false, rare: false };
    ['normal', 'magic', 'rare'].forEach(rarity => {
        let el = document.getElementById(`chk-jewel-salvage-${rarity}`);
        if (el) game.settings.jewelAutoSalvageRarities[rarity] = !!el.checked;
    });
}

function toggleJewelAutoSalvage() {
    game.settings.jewelAutoSalvageEnabled = !game.settings.jewelAutoSalvageEnabled;
    updateJewelSalvageSettingsFromUI();
    syncJewelSalvageControlsFromSettings();
    addLog(`💠 주얼 자동해체 ${game.settings.jewelAutoSalvageEnabled ? '활성화' : '비활성화'}`, 'loot-normal');
}

function bulkSalvage(maxRarity) {
    let targetRank = maxRarity === 'normal' ? 0 : 1;
    let kept = [];
    game.inventory.forEach(item => {
        if (item.locked) kept.push(item);
        else if (getRarityRank(item.rarity) <= targetRank) salvageItemObject(item, true);
        else kept.push(item);
    });
    game.inventory = kept;
    ensureCraftSelectionValid();
    updateStaticUI();
}
function bulkSalvageSelected() {
    let selectedRarities = ['normal', 'magic', 'rare', 'unique'].filter(rarity => {
        let el = document.getElementById(`chk-salvage-${rarity}`);
        return el && el.checked;
    });
    if (selectedRarities.length === 0) return addLog('해체할 등급을 먼저 선택하세요.', 'attack-monster');
    let kept = [];
    let removed = 0;
    let lockedSkipped = 0;
    game.inventory.forEach(item => {
        if (selectedRarities.includes(item.rarity)) {
            if (item.locked) {
                kept.push(item);
                lockedSkipped++;
            } else {
                salvageItemObject(item, true);
                removed++;
            }
        } else {
            kept.push(item);
        }
    });
    if (removed === 0) {
        if (lockedSkipped > 0) return addLog(`🔒 선택 등급 아이템이 모두 잠금 상태입니다. (잠금 ${lockedSkipped}개)`, 'attack-monster');
        return addLog('선택한 등급의 장비가 없습니다.', 'attack-monster');
    }
    game.inventory = kept;
    ensureCraftSelectionValid();
    addLog(`🧪 선택한 등급 장비 ${removed}개 해체${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}
function bulkSalvageAllInventory() {
    if (!Array.isArray(game.inventory) || game.inventory.length <= 0) return addLog('해체할 장비가 없습니다.', 'attack-monster');
    let lockedCount = game.inventory.filter(item => item && item.locked).length;
    let salvageCount = game.inventory.length - lockedCount;
    if (salvageCount <= 0) return addLog('🔒 잠금되지 않은 아이템이 없어 전체해체를 실행할 수 없습니다.', 'attack-monster');
    if (!confirm(`인벤토리 장비 ${salvageCount}개를 모두 해체할까요?${lockedCount > 0 ? ` (잠금 ${lockedCount}개는 보호됨)` : ''}`)) return;
    let kept = [];
    game.inventory.forEach(item => {
        if (item && item.locked) kept.push(item);
        else salvageItemObject(item, true);
    });
    game.inventory = kept;
    if (!isCraftSelectionEquip()) clearCraftSelection();
    addLog(`🧪 인벤토리 전체해체 완료 (${salvageCount}개)${lockedCount > 0 ? ` · 잠금 ${lockedCount}개 보호` : ''}`, 'loot-normal');
    updateStaticUI();
}

function useCurrency(currencyKey) {
    let item = getSelectedCraftItem();
    if (!item) return addLog("먼저 아이템을 선택하세요.", "attack-monster");
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog("오브가 부족합니다.", "attack-monster");
    if (item.corrupted && currencyKey !== 'tainted') return addLog("타락한 아이템은 더 이상 제작할 수 없습니다.", "attack-monster");

    let ok = false;
    if (currencyKey === 'transmute') ok = item.rarity === 'normal';
    else if (currencyKey === 'augment') ok = item.rarity === 'magic' && item.stats.length < 2;
    else if (currencyKey === 'alteration') ok = item.rarity === 'magic';
    else if (currencyKey === 'alchemy') ok = item.rarity === 'normal';
    else if (currencyKey === 'exalted') ok = item.rarity === 'rare' && item.stats.length < 6;
    else if (currencyKey === 'regal') ok = item.rarity === 'magic' && item.stats.length < 6;
    else if (currencyKey === 'chaos') ok = item.rarity === 'rare';
    else if (currencyKey === 'divine') ok = item.rarity !== 'normal';
    else if (currencyKey === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (currencyKey === 'tainted') ok = !item.corrupted;
    if (!ok) return addLog("지금 선택한 아이템에는 사용할 수 없습니다.", "attack-monster");
    if (currencyKey === 'divine' && !confirm('정말 신성한 오브를 사용하시겠습니까?')) return;

    game.currencies[currencyKey]--;
    if (currencyKey === 'transmute') {
        item.rarity = 'magic';
        rerollExplicitMods(item, 'magic', getItemCraftTier(item));
    } else if (currencyKey === 'augment') {
        let mod = pickWeightedMod(getAvailableMods(item));
        if (mod) item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
        updateItemName(item);
    } else if (currencyKey === 'alteration') {
        rerollExplicitMods(item, 'magic', getItemCraftTier(item));
    } else if (currencyKey === 'alchemy') {
        item.rarity = 'rare';
        rerollExplicitMods(item, 'rare', getItemCraftTier(item));
    } else if (currencyKey === 'exalted') {
        let mod = pickWeightedMod(getAvailableMods(item));
        if (mod) item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
        updateItemName(item);
    } else if (currencyKey === 'regal') {
        let mod = pickWeightedMod(getAvailableMods(item));
        if (mod) item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
        item.rarity = 'rare';
        updateItemName(item);
    } else if (currencyKey === 'chaos') {
        rerollExplicitMods(item, 'rare', getItemCraftTier(item));
    } else if (currencyKey === 'divine') {
        item.stats.forEach(stat => {
            if (stat.lockedByHoney) return;
            let val = stat.valMin + Math.random() * (stat.valMax - stat.valMin);
            if (['leech', 'regen', 'regenSuppress'].includes(stat.id)) stat.val = Math.round(val * 10) / 10;
            else stat.val = Math.floor(val);
        });
    } else if (currencyKey === 'scour') {
        item.rarity = 'normal';
        item.stats = (item.stats || []).filter(stat => stat && stat.lockedByHoney);
        updateItemName(item);
    } else if (currencyKey === 'tainted') {
        item.corrupted = true;
        if (Math.random() < 0.35) {
            let mod = pickWeightedMod(getAvailableMods(item));
            if (mod) item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
            addLog("🩸 타락 성공! 추가 옵션이 부여되었습니다.", "loot-unique");
        } else {
            addLog("🩸 타락 진행: 추가 옵션은 생기지 않았습니다.", "attack-monster");
        }
    }
    addLog(`⚒️ ${ORB_DB[currencyKey].name} 사용`, currencyKey === 'exalted' || currencyKey === 'divine' ? 'loot-unique' : 'loot-magic');
    updateStaticUI();
}

function isMarketUnlocked() {
    return (game.maxZoneId || 0) >= 5;
}

function getMarketInventoryExpandCost() {
    return 2 + Math.max(0, Math.floor(game.inventoryExpandLevel || 0));
}

function exchangeAtMarket(exchangeId, exchangeAll) {
    if (!isMarketUnlocked()) return addLog('액트 5를 클리어해야 거래소를 이용할 수 있습니다.', 'attack-monster');
    let recipe = MARKET_EXCHANGES.find(row => row.id === exchangeId);
    if (!recipe) return;
    let have = game.currencies[recipe.from] || 0;
    let maxTimes = Math.floor(have / recipe.need);
    if (maxTimes <= 0) return addLog(`${ORB_DB[recipe.from].name}이 부족합니다.`, 'attack-monster');
    let times = exchangeAll ? maxTimes : 1;
    let spend = times * recipe.need;
    let gain = times * recipe.gain;
    if (exchangeAll) {
        let question = `정말 ${ORB_DB[recipe.from].name} ${spend}개를 ${ORB_DB[recipe.to].name} ${gain}개로 모두 교환하시겠습니까?`;
        if (!confirm(question)) return;
    }
    game.currencies[recipe.from] = Math.max(0, (game.currencies[recipe.from] || 0) - spend);
    awardCurrency(recipe.to, gain);
    addLog(`🏦 거래소 교환: ${ORB_DB[recipe.from].name} ${spend}개 → ${ORB_DB[recipe.to].name} ${gain}개`, 'loot-magic');
    checkUnlocks();
    updateStaticUI();
}
