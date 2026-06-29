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
    if (node.kind === 'void') return getVoidPassiveEffectLabel(node.id);
    if (node.stat === 'chaosResElemPenalty') {
        let value = formatValue(node.stat, node.val);
        return `카오스 저항 +${value}% 및 모든 원소 저항 -${value}%`;
    }
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
    if (node.kind === 'void') return '공허 패시브';
    if (node.kind === 'hub') return node.socketType === 'star_wedge' ? '별쐐기 슬롯' : '별쐐기 슬롯 후보';
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
    if (node.kind === 'void') return 14;
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
    if (['igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'].includes(statId)) {
        return { ...base, activeOuter: '#ff9bb6', activeMid: '#8a3a4d', activeGlow: 'rgba(255,113,151,0.3)', reachOuter: '#e0708d', reachMid: '#361822', previewOuter: 'rgba(164,82,105,0.56)', idleOuter: 'rgba(194,112,133,0.92)', text: '#ffd8e2' };
    }
    if (['armor', 'armorPct', 'evasion', 'evasionPct', 'deflectChance', 'dr', 'blockChance', 'blockChancePct'].includes(statId)) {
        return { ...base, activeOuter: '#5dcaa5', activeMid: '#236753', activeGlow: 'rgba(93,202,165,0.3)', reachOuter: '#4eb18f', reachMid: '#14312a', previewOuter: 'rgba(69,137,116,0.56)', idleOuter: 'rgba(98,169,147,0.92)', text: '#caffef' };
    }
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(statId)) {
        return { ...base, activeOuter: '#b9c6ff', activeMid: '#4a5295', activeGlow: 'rgba(132,154,255,0.32)', reachOuter: '#8999e6', reachMid: '#1d2344', previewOuter: 'rgba(96,107,166,0.56)', idleOuter: 'rgba(130,141,196,0.92)', text: '#e4e8ff' };
    }
    if (['ailResIgnite', 'ailResShock', 'ailResFreeze', 'ailResPoison', 'ailResBleed'].includes(statId)) {
        return { ...base, activeOuter: '#d7e1ea', activeMid: '#667786', activeGlow: 'rgba(188,207,222,0.26)', reachOuter: '#aab8c4', reachMid: '#26323c', previewOuter: 'rgba(122,137,150,0.56)', idleOuter: 'rgba(151,164,176,0.92)', text: '#edf5fb' };
    }
    if (['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'ds', 'physIgnore'].includes(statId)) {
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
    if (node && node.kind === 'void') {
        return active
            ? { outer: '#c7f7ff', mid: '#22566b', inner: '#06151d', glow: 'rgba(79,209,255,0.45)', text: '#dcfbff' }
            : { outer: '#72b8d0', mid: '#173345', inner: '#081019', glow: 'rgba(79,209,255,0.20)', text: '#c5efff' };
    }
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
            glow: 'rgba(0,0,0,0)',
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
            glow: 'rgba(0,0,0,0)',
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
        ctx.restore();
        return;
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
        const glowRadius = active ? radius + 16 : radius + (node.tier >= 3 ? 12 : 8);
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
        const glow = ctx.createRadialGradient(node.x, node.y, Math.max(1, radius * 0.35), node.x, node.y, glowRadius + 6);
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
        ctx.arc(node.x, node.y, innerR * (active ? 0.55 : 0.42), 0, Math.PI * 2);
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
    const genericPathStats = ['aspd', 'move', 'flatHp', 'crit', 'pctDmg', 'flatDmg', 'regen'];
    const regionalPathDefenseStats = {
        templar: ['energyShield', 'energyShieldPct'],
        witch: ['energyShield', 'energyShieldPct'],
        shadow: ['evasion', 'evasionPct'],
        ranger: ['evasion', 'evasionPct'],
        duelist: ['armor', 'armorPct'],
        marauder: ['armor', 'armorPct']
    };
    const centralCoreSpecs = {
        templar: [
            { stat: 'energyShieldPct', title: '성역 보호막 관문', desc: '핵심 성좌입니다.' },
            { stat: 'spellFlatPct', title: '성광 주문 관문', desc: '핵심 성좌입니다.' }
        ],
        witch: [
            { stat: 'energyShieldPct', title: '비전 보호막 관문', desc: '핵심 성좌입니다.' },
            { stat: 'chaosPctDmg', title: '공허 부패 관문', desc: '핵심 성좌입니다.' }
        ],
        shadow: [
            { stat: 'evasionPct', title: '그림자 회피 관문', desc: '핵심 성좌입니다.' },
            { stat: 'crit', title: '급소 절개 관문', desc: '핵심 성좌입니다.' }
        ],
        ranger: [
            { stat: 'evasionPct', title: '바람 회피 관문', desc: '핵심 성좌입니다.' },
            { stat: 'projectilePctDmg', title: '탄도 개시 관문', desc: '핵심 성좌입니다.' }
        ],
        duelist: [
            { stat: 'armorPct', title: '결투 방어 관문', desc: '핵심 성좌입니다.' },
            { stat: 'meleePctDmg', title: '연격 개시 관문', desc: '핵심 성좌입니다.' }
        ],
        marauder: [
            { stat: 'armorPct', title: '철갑 생존 관문', desc: '핵심 성좌입니다.' },
            { stat: 'physPctDmg', title: '대지 강타 관문', desc: '핵심 성좌입니다.' }
        ]
    };
    const clusterThemeBySector = {
        templar: [
            { stat: 'energyShieldPct', title: '성역 보호막' },
            { stat: 'spellFlatPct', title: '성광 주문' },
            { stat: 'aoePctDmg', title: '신성 범위' },
            { stat: 'resAll', title: '원소 수호' },
            { stat: 'firePctDmg', title: '정화의 불꽃' }
        ],
        witch: [
            { stat: 'coldPctDmg', title: '서리 비전' },
            { stat: 'lightPctDmg', title: '번개 비전' },
            { stat: 'chaosPctDmg', title: '공허 비전' },
            { stat: 'dotPctDmg', title: '지속 부패' },
            { stat: 'gemLevel', title: '젬 각성' }
        ],
        shadow: [
            { stat: 'crit', title: '급소 조준' },
            { stat: 'critDmg', title: '치명 배율' },
            { stat: 'leechRateCap', title: '흡혈 가속' },
            { stat: 'chaosPctDmg', title: '독성 그림자' },
            { stat: 'evasionPct', title: '그림자 회피' }
        ],
        ranger: [
            { stat: 'projectilePctDmg', title: '투사체 숙련' },
            { stat: 'projectileExtraShots', title: '추가 발사' },
            { stat: 'evasionPct', title: '바람 회피' },
            { stat: 'coldPctDmg', title: '냉기 사격' },
            { stat: 'coldPctDmg', title: '냉기 사격' }
        ],
        duelist: [
            { stat: 'meleePctDmg', title: '근접 결투' },
            { stat: 'ds', title: '연속 타격' },
            { stat: 'leechInstanceCap', title: '깊은 흡혈' },
            { stat: 'aspd', title: '쌍검 속도' },
            { stat: 'physPctDmg', title: '정밀 물리' }
        ],
        marauder: [
            { stat: 'physPctDmg', title: '물리 파쇄' },
            { stat: 'slamPctDmg', title: '강타 충격' },
            { stat: 'armorPct', title: '철갑 강화' },
            { stat: 'pctHp', title: '거인의 생명' },
            { stat: 'leechTotalCap', title: '피의 저수지' }
        ]
    };
    function getGenericPathStat(theme, depth, lane, sectorIndex) {
        let pathCycle = genericPathStats;
        let defenseCycle = regionalPathDefenseStats[theme] || [];
        let laneAbs = Math.abs(lane);
        let isRegionalDefenseStep = defenseCycle.length > 0 && depth >= 4 && depth % 4 === 0 && laneAbs >= 1;
        if (isRegionalDefenseStep) {
            let defenseStat = defenseCycle[(depth / 4 + laneAbs + sectorIndex) % defenseCycle.length];
            if (P_STATS[defenseStat]) return defenseStat;
        }
        let stat = pathCycle[(depth + laneAbs * 2 + sectorIndex) % pathCycle.length];
        return P_STATS[stat] ? stat : 'flatHp';
    }
    function getCoreDirectionLabel(sectorIndex) {
        const labels = ['북쪽', '북동쪽', '동쪽', '남동쪽', '남쪽', '남서쪽', '서쪽', '북서쪽'];
        return labels[((sectorIndex % labels.length) + labels.length) % labels.length] || '중앙';
    }
    function specializePathNode(node, theme, depth, lane, sectorIndex, shape) {
        if (!node || !shape) return;
        if (shape.kind === 'core') {
            let specs = centralCoreSpecs[theme] || [];
            let spec = specs[(Math.abs(lane) + sectorIndex) % specs.length];
            if (spec && P_STATS[spec.stat]) {
                node.stat = spec.stat;
                node.val = getTierValue(node.stat, node.tier);
                node.title = spec.title;
                node.desc = `${getCoreDirectionLabel(sectorIndex)} 시작축: ${spec.desc}`;
            }
            return;
        }
        if (['path', 'major', 'keystone', 'hub'].includes(shape.kind)) {
            let stat = getGenericPathStat(theme, depth, lane, sectorIndex);
            node.stat = stat;
            node.val = getTierValue(stat, node.tier);
            if (shape.kind === 'major' || shape.kind === 'keystone') node.val = Math.max(node.val, getTierValue(stat, 2));
            if (shape.kind === 'hub') {
                node.title = '별쐐기 슬롯';
                node.desc = '별쐐기 해금 후 별쐐기를 장착할 수 있는 슬롯입니다. 주변의 전문 노드 뭉치와 범용 경로를 함께 조율합니다.';
            }
        }
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
            layoutDepth: meta && Number.isFinite(meta.depth) ? meta.depth : null,
            lane: meta && Number.isFinite(meta.lane) ? meta.lane : null,
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
    function getNodeClearanceDistance(a, b, extraPadding) {
        return getPassiveNodeVisualRadius(a) + getPassiveNodeVisualRadius(b) + (extraPadding || 24);
    }
    function getNodeDistance(a, b) {
        if (!a || !b) return Number.POSITIVE_INFINITY;
        return Math.hypot((b.x || 0) - (a.x || 0), (b.y || 0) - (a.y || 0));
    }
    function addOuterPathRelay(a, b, t, depth, spoke, relayIndex, relayCount) {
        let ax = a.x || 0, ay = a.y || 0, bx = b.x || 0, by = b.y || 0;
        let x = ax + (bx - ax) * t;
        let y = ay + (by - ay) * t;
        let radialLen = Math.hypot(x, y) || 1;
        let ripple = ((spoke + relayIndex + depth) % 2 === 0 ? 1 : -1) * (18 + depth * 1.5);
        x += (x / radialLen) * ripple;
        y += (y / radialLen) * ripple;
        const specialOuterStats = ['move', 'resAll', 'crit', 'regen', 'maxDmgRoll', 'minDmgRoll', 'resPen', 'physIgnore'];
        let special = depth >= maxDepth - 1 && relayCount >= 2 && relayIndex === Math.ceil(relayCount / 2);
        let stat = special ? specialOuterStats[(spoke + depth) % specialOuterStats.length] : getGenericPathStat(a.sector || b.sector || 'center', depth, relayIndex, spoke);
        let node = addNode(x / PASSIVE_WORLD_SCALE, y / PASSIVE_WORLD_SCALE, special ? 2 : 1, stat, { sector: a.sector || b.sector, kind: special ? 'major' : 'path', depth: depth, lane: relayIndex });
        if (!node) return null;
        node.webBridge = true;
        node.webRing = depth;
        node.title = special ? '외곽 별길 규칙' : '외곽 별길';
        node.desc = special
            ? '먼 외곽 성좌 사이를 잇는 보강 규칙 노드입니다. 긴 이동 경로에 작은 보상을 배치합니다.'
            : '멀리 떨어진 외곽 성좌 사이를 촘촘하게 이어 주는 경로 노드입니다.';
        return node;
    }
    function connectWithOuterRelays(a, b, depth, spoke) {
        if (!a || !b) return;
        let dist = getNodeDistance(a, b);
        let maxSegment = Math.max(190, getNodeClearanceDistance(a, b, 110));
        let relayCount = Math.max(0, Math.min(3, Math.ceil(dist / maxSegment) - 1));
        if (relayCount <= 0) {
            connect(a.id, b.id);
            return;
        }
        let prev = a;
        for (let i = 1; i <= relayCount; i++) {
            let relay = addOuterPathRelay(a, b, i / (relayCount + 1), depth, spoke, i, relayCount);
            if (!relay) break;
            connect(prev.id, relay.id);
            prev = relay;
        }
        connect(prev.id, b.id);
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
            candidates.slice(0, need).forEach(node => connect(hub.id, node.id));
        });
    }


    // 거미줄형 기본 경로: 방사형 살(spoke) + 나이테형 고리(ring)를 먼저 만든다.
    // 8방향의 큰 정체성은 유지하되 각 방향 사이에 중간 경로 노드를 추가해 최외곽까지 등고선처럼 연결한다.
    const sectorThemes = ['templar', 'witch', 'shadow', 'ranger', 'duelist', 'marauder', 'marauder', 'marauder'];
    const sectorCount = sectorThemes.length;
    const spokesPerSector = 2;
    const webSpokeCount = sectorCount * spokesPerSector;
    const maxDepth = 12;
    const innerRadius = 285;
    const ringSpacing = 142;
    const webYScale = 1;
    const angleStep = Math.PI * 2 / webSpokeCount;

    let root = addNode(0, 0, 0, 'flatDmg', { sector: 'center', kind: 'root', depth: 0, lane: 0 });
    if (root) root.val = 8;
    let webNodes = {};

    function getWebSectorIndex(spoke) {
        return Math.floor(((spoke % webSpokeCount) + webSpokeCount) % webSpokeCount / spokesPerSector) % sectorCount;
    }
    function getWebTheme(spoke) {
        return sectorThemes[getWebSectorIndex(spoke)];
    }
    function getWebLane(spoke) {
        return (spoke % spokesPerSector) === 0 ? 0 : 1;
    }
    function getWebAngle(spoke) {
        return -Math.PI / 2 + spoke * angleStep;
    }
    function getWebRadius(depth) {
        return innerRadius + (depth - 1) * ringSpacing;
    }
    function getWebPoint(spoke, depth, angleShift, radiusShift) {
        let angle = getWebAngle(spoke) + (angleShift || 0);
        let radius = getWebRadius(depth) + (radiusShift || 0);
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * webYScale
        };
    }
    function realignWebPathNodes() {
        for (let spoke = 0; spoke < webSpokeCount; spoke++) {
            for (let depth = 1; depth <= maxDepth; depth++) {
                let node = webNodes[spoke] && webNodes[spoke][depth - 1];
                if (!node) continue;
                let point = getWebPoint(spoke, depth, 0, 0);
                node.x = point.x * PASSIVE_WORLD_SCALE;
                node.y = point.y * PASSIVE_WORLD_SCALE;
            }
        }
    }
    function classifyWebNode(depth, spoke) {
        let lane = getWebLane(spoke);
        let isPrimarySpoke = lane === 0;
        if (depth === 1 && isPrimarySpoke) return { tier: 2, kind: 'core' };
        if ((depth === 4 && lane === 1) || (depth === 7 && lane === 1) || (depth === 10 && lane === 0)) return { tier: 2, kind: 'hub' };
        if (depth === maxDepth && isPrimarySpoke) return { tier: 3, kind: 'keystone' };
        if (depth === maxDepth || depth % 3 === 0) return { tier: 2, kind: 'major' };
        return { tier: 1, kind: 'path' };
    }

    for (let spoke = 0; spoke < webSpokeCount; spoke++) {
        let theme = getWebTheme(spoke);
        let lane = getWebLane(spoke);
        webNodes[spoke] = [];
        let prev = null;
        for (let depth = 1; depth <= maxDepth; depth++) {
            let point = getWebPoint(spoke, depth, 0, 0);
            let shape = classifyWebNode(depth, spoke);
            let node = addNode(point.x, point.y, shape.tier, theme, { sector: theme, kind: shape.kind, depth: depth, lane: lane });
            if (!node) break;
            node.webSpoke = spoke;
            node.webRing = depth;
            specializePathNode(node, theme, depth, lane, getWebSectorIndex(spoke), shape);
            webNodes[spoke][depth - 1] = node;
            if (prev) connect(prev.id, node.id);
            if (depth === 1 && lane === 0 && root) connect(root.id, node.id);
            prev = node;
        }
    }

    function markVoidPassiveNodes() {
        for (let spoke = 0; spoke < webSpokeCount; spoke++) {
            let candidates = (webNodes[spoke] || [])
                .filter(node => node && (node.webRing || 0) >= 3)
                .filter(node => node.kind === 'path' || node.kind === 'major');
            if (candidates.length <= 0) continue;
            let pick = candidates[(spoke * 7 + 3) % candidates.length];
            pick.legacyVoidStat = pick.stat;
            pick.legacyVoidVal = pick.val;
            pick.kind = 'void';
            pick.stat = 'pctDmg';
            pick.val = 0;
            pick.title = '공허 패시브';
            pick.desc = '처음 활성화할 때는 아무 효과도 없습니다. 진화의 오브, 확장의 오브, 변화의 오브로 최대 2줄의 공허 옵션을 부여할 수 있습니다.';
            pick.effectLabel = null;
            pick.voidPassive = true;
        }
    }

    markVoidPassiveNodes();

    for (let depth = 1; depth <= maxDepth; depth++) {
        for (let spoke = 0; spoke < webSpokeCount; spoke++) {
            let a = webNodes[spoke] && webNodes[spoke][depth - 1];
            let b = webNodes[(spoke + 1) % webSpokeCount] && webNodes[(spoke + 1) % webSpokeCount][depth - 1];
            let intentionalGap = depth >= 4 && depth <= 9 && ((spoke + depth) % 7 === 3);
            if (!a || !b || intentionalGap) continue;
            if (depth >= 9) connectWithOuterRelays(a, b, depth, spoke);
            else connect(a.id, b.id);
        }
    }

    for (let depth = 2; depth < maxDepth; depth++) {
        for (let spoke = 0; spoke < webSpokeCount; spoke++) {
            let a = webNodes[spoke] && webNodes[spoke][depth - 1];
            if (!a) continue;
            if (depth % 4 === 0 && spoke % 3 === 1) {
                let diagonal = webNodes[(spoke + 1) % webSpokeCount] && webNodes[(spoke + 1) % webSpokeCount][depth];
                if (diagonal) connect(a.id, diagonal.id);
            }
            if (depth % 5 === 2 && spoke % 4 === 0) {
                let backDiagonal = webNodes[(spoke + webSpokeCount - 1) % webSpokeCount] && webNodes[(spoke + webSpokeCount - 1) % webSpokeCount][depth];
                if (backDiagonal) connect(a.id, backDiagonal.id);
            }
        }
    }

    const webCellClusterBlueprints = [
        { role: 'defense', label: '방어', length: 4, spread: 0.34 },
        { role: 'offense', label: '화력', length: 5, spread: 0.42 },
        { role: 'utility', label: '운용', length: 4, spread: 0.50 },
        { role: 'mastery', label: '숙련', length: 5, spread: 0.58 },
        { role: 'survival', label: '생존', length: 4, spread: 0.38 }
    ];

    function getWebCellClusterPoint(cell, step, chainLength) {
        let t = step / Math.max(1, chainLength + 1);
        let bendDir = cell.bendDir || 1;
        let bow = Math.sin(t * Math.PI) * (cell.blueprint.spread || 0.4);
        let curve = Math.sin(t * Math.PI * 1.35) * 0.07 * bendDir;
        let radiusCurve = Math.sin(t * Math.PI * 2) * 0.05 * bendDir;
        let angleRatio = 0.12 + t * 0.44 + bow * 0.08 + curve;
        let radiusRatio = 0.10 + t * 0.56 + radiusCurve;
        let angle = cell.angle + angleStep * Math.max(0.10, Math.min(0.72, angleRatio));
        let radius = (cell.innerRadius + ringSpacing * Math.max(0.08, Math.min(0.72, radiusRatio))) * PASSIVE_WORLD_SCALE;
        return {
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius * webYScale
        };
    }
    function realignSpecializedClusters(clusterCellsById) {
        let clusterNodes = Object.values(PASSIVE_TREE.nodes)
            .filter(node => node && node.clusterId && Number.isFinite(node.clusterStep))
            .sort((a, b) => {
                let clusterDelta = String(a.clusterId).localeCompare(String(b.clusterId));
                if (clusterDelta !== 0) return clusterDelta;
                return (a.clusterStep || 0) - (b.clusterStep || 0);
            });
        clusterNodes.forEach(node => {
            let cell = clusterCellsById[node.clusterAnchorId];
            if (!cell) return;
            let pos = getWebCellClusterPoint(cell, node.clusterStep || 1, node.clusterLength || 4);
            node.x = pos.x;
            node.y = pos.y;
        });
    }
    const tagGemClusterSpecs = [
        { stat: 'firePctDmg', endStat: 'fireGemLevel', title: '화염 젬 단련', length: 5 },
        { stat: 'coldPctDmg', endStat: 'coldGemLevel', title: '냉기 젬 단련', length: 5 },
        { stat: 'lightPctDmg', endStat: 'lightGemLevel', title: '번개 젬 단련', length: 5 },
        { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: '카오스 젬 단련', length: 5 },
        { stat: 'physPctDmg', endStat: 'physGemLevel', title: '물리 젬 단련', length: 5 },
        { stat: 'projectilePctDmg', endStat: 'projectileGemLevel', title: '투사체 젬 단련', length: 5 },
        { stat: 'meleePctDmg', endStat: 'meleeGemLevel', title: '근접 젬 단련', length: 5 },
        { stat: 'slamPctDmg', endStat: 'slamGemLevel', title: '강타 젬 단련', length: 5 },
        { stat: 'spellFlatPct', endStat: 'spellGemLevel', title: '주문 젬 단련', length: 5 },
        { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: '지속 젬 단련', length: 5 },
        { stat: 'aoePctDmg', endStat: 'aoeGemLevel', title: '범위 젬 단련', length: 5 },
        { stat: 'elementalPctDmg', endStat: 'elementalGemLevel', title: '원소 젬 단련', length: 5 }
    ];
    function getTagGemClusterSpec(spoke, depth) {
        return tagGemClusterSpecs[(spoke * 5 + depth * 3) % tagGemClusterSpecs.length];
    }
    let retainedGlobalGemLevelCluster = false;
    function isTopChaosPenaltyCluster(spoke, depth) {
        let topArc = angleDistance(getWebAngle(spoke), -Math.PI / 2) <= Math.PI / 3;
        return topArc && ((spoke === 15 && depth === 5) || (spoke === 1 && depth === 9));
    }
    function isOneOClockCluster(spoke) {
        return spoke === 1 || spoke === 2;
    }
    function getOneOClockClusterSpec(spoke, depth) {
        const specs = [
            { stat: 'chaosPctDmg', title: '심연 독기', length: 4 },
            { stat: 'dotPctDmg', title: '부패 지속', length: 4 },
            { stat: 'coldPctDmg', title: '빙결 한기', length: 4 },
            { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: '카오스 젬 독성', length: 5 },
            { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: '지속 젬 부식', length: 5 }
        ];
        return specs[(spoke + depth) % specs.length];
    }
    function getDirectionalClusterSpec(spoke, depth) {
        const fixedClusters = {
            '10:5': { stat: 'firePctDmg', title: '서녘 화염', length: 4 },
            '11:8': { stat: 'firePctDmg', title: '황혼 화염', length: 4 },
            '14:6': { stat: 'firePctDmg', title: '여명 화염', length: 4 },
            '0:6': { stat: 'coldPctDmg', title: '천정 서리', length: 4 },
            '1:6': { stat: 'lightPctDmg', title: '새벽 번개', length: 4 },
            '14:9': { stat: 'summonAspd', title: '성좌 지휘', length: 4 },
            '15:5': { stat: 'summonPctDmg', title: '별무리 사역', length: 5 },
            '15:8': { stat: 'summonHpPct', title: '사역 생명핵', length: 4 }
        };
        return fixedClusters[`${spoke}:${depth}`] || null;
    }
    function getScatteredMaxResClusterSpec(spoke, depth) {
        if (spoke === 5 && depth % 4 === 1) return { stat: 'resF', endStat: 'maxResF', title: '화염 최대 저항', length: 4 };
        if (spoke === 9 && depth % 4 === 2) return { stat: 'resC', endStat: 'maxResC', title: '냉기 최대 저항', length: 4 };
        if (spoke === 13 && depth % 4 === 3) return { stat: 'resL', endStat: 'maxResL', title: '번개 최대 저항', length: 4 };
        return null;
    }
    function getCompositeClusterSpec(spoke, depth) {
        let scatteredMaxRes = getScatteredMaxResClusterSpec(spoke, depth);
        if (scatteredMaxRes) return scatteredMaxRes;
        if (spoke === 4) {
            if (depth % 2 === 0) return { stat: 'moveEvasion', title: '질풍 회피', length: 4 };
            const altSpecs = [
                { stat: 'projectilePctDmg', title: '탄도 숙련', length: 4 },
                { stat: 'pctHp', title: '생명 순환', length: 4 },
                { stat: 'resC', title: '한기 내성', length: 4 },
                { stat: 'projectileExtraShots', title: '추가 발사', length: 4 }
            ];
            return altSpecs[Math.floor(depth / 2) % altSpecs.length];
        }
        if (spoke === 8) return { stat: 'hpArmor', title: '거석 생명', length: 4 };
        if (spoke === 12) return { stat: 'slamPctDmg', endStat: 'slamEchoChance', title: '대지 여진', length: 5 };
        if (spoke === 0) return { stat: 'energyShieldPct', endStat: 'energyShieldRegen', title: '보호막 순환', length: 4 };
        if (isTopChaosPenaltyCluster(spoke, depth)) return { stat: 'chaosResElemPenalty', title: '혼돈 절연', length: 4 };
        const rotating = [
            { stat: 'critDmg', title: '치명 배율', length: 4 },
            { stat: 'ds', title: '연속 타격', length: 4 },
            { stat: 'maxDmgRoll', title: '상한 보정', length: 4 },
            { stat: 'pctDmg', endStat: 'suppCap', title: '보조 젬 연결', length: 4 },
            { stat: 'minDmgRoll', title: '하한 안정', length: 4 },
            { stat: 'resAll', title: '원소 수호', length: 4 },
            { stat: 'resChaos', title: '카오스 저항', length: 4 },
            { stat: 'regenSuppress', title: '재생 봉쇄', length: 4 },
            { stat: 'aspdMove', title: '쌍속 기동', length: 4 }
        ];
        return rotating[(spoke * 3 + depth) % rotating.length];
    }
    function getClusterStatForStep(spec, isEnd) {
        return isEnd && spec.endStat ? spec.endStat : spec.stat;
    }
    function getFinalClusterSpec(themeSpec, spoke, depth, theme) {
        let directional = getDirectionalClusterSpec(spoke, depth);
        if (directional) return directional;
        if (isOneOClockCluster(spoke)) return getOneOClockClusterSpec(spoke, depth);
        if (themeSpec.stat === 'gemLevel') {
            if (!retainedGlobalGemLevelCluster && depth >= maxDepth - 1) {
                retainedGlobalGemLevelCluster = true;
                return { stat: 'spellFlatPct', endStat: 'gemLevel', title: '외곽 젬 각성', length: 5 };
            }
            return getTagGemClusterSpec(spoke, depth);
        }
        if (depth === 6 && spoke === 1) return tagGemClusterSpecs[11];
        if (depth >= 6 && ((spoke + depth) % 9 === 0)) return getTagGemClusterSpec(spoke, depth);
        if (depth <= 4) return { stat: themeSpec.stat, title: themeSpec.title, length: null };
        let composite = getCompositeClusterSpec(spoke, depth);
        if (composite && P_STATS[composite.stat] && (!composite.endStat || P_STATS[composite.endStat])) return composite;
        return { stat: themeSpec.stat, title: themeSpec.title, length: null };
    }
    function buildWebCellCluster(anchor, spoke, depth, clusterCellsById) {
        if (!anchor) return;
        if (depth <= 2 && ((spoke + depth) % 2 === 0)) return;
        let theme = getWebTheme(spoke);
        let themes = clusterThemeBySector[theme] || clusterThemeBySector.templar;
        let blueprint = webCellClusterBlueprints[(depth + spoke) % webCellClusterBlueprints.length];
        let themeSpec = themes[(depth * 2 + spoke) % themes.length];
        if (!blueprint || !themeSpec || !P_STATS[themeSpec.stat]) return;
        themeSpec = getFinalClusterSpec(themeSpec, spoke, depth, theme);
        if (!themeSpec || !P_STATS[themeSpec.stat] || (themeSpec.endStat && !P_STATS[themeSpec.endStat])) return;
        let chainLength = themeSpec.length || blueprint.length || 4;
        let clusterId = `web_${spoke}_${depth}_${blueprint.role}`;
        let cell = {
            angle: getWebAngle(spoke),
            innerRadius: getWebRadius(depth),
            blueprint: blueprint,
            bendDir: ((spoke + depth) % 2 === 0) ? 1 : -1
        };
        clusterCellsById[clusterId] = cell;
        let prev = anchor;
        for (let i = 1; i <= chainLength; i++) {
            let isEnd = i === chainLength;
            let pos = getWebCellClusterPoint(cell, i, chainLength);
            let tier = isEnd ? 3 : (i >= chainLength - 1 ? 2 : 1);
            let kind = isEnd ? 'keystone' : (i >= chainLength - 1 ? 'major' : 'node');
            let statForStep = getClusterStatForStep(themeSpec, isEnd);
            let node = addNode(pos.x / PASSIVE_WORLD_SCALE, pos.y / PASSIVE_WORLD_SCALE, tier, statForStep, { sector: theme, kind: kind, depth: depth + i, lane: getWebLane(spoke) });
            if (!node) return;
            node.clusterId = clusterId;
            node.clusterAnchorId = clusterId;
            node.clusterRole = blueprint.role;
            node.clusterRoleLabel = blueprint.label;
            node.clusterStep = i;
            node.clusterLength = chainLength;
            node.clusterTheme = themeSpec.title;
            node.clusterBaseStat = themeSpec.stat;
            node.clusterEndStat = themeSpec.endStat || null;
            node.webCellSpoke = spoke;
            node.webCellRing = depth;
            node.val = getTierValue(statForStep, tier);
            if (statForStep === 'slamPctDmg') node.val *= 2;
            if (statForStep === 'critDmg') {
                if (chainLength === 4) node.val = [8, 8, 12, 20][i - 1];
                else if (chainLength === 5) node.val = [12, 12, 12, 12, 25][i - 1];
            }
            if (isEnd) {
                node.title = `${themeSpec.title} 핵심`;
                node.desc = `${PASSIVE_SECTOR_TITLES[theme] || '성좌'}의 ${blueprint.label} 구역을 완성하는 거미줄 칸 내부 전문 노드입니다.`;
            } else if (i === 1) {
                node.title = `${themeSpec.title} 길목`;
                node.desc = `거미줄 경로 한 칸 안에서 ${blueprint.label} 축으로 갈라지는 시작 노드입니다.`;
            }
            connect(prev.id, node.id);
            if (i === 1 && ((spoke + depth) % 4 === 0)) {
                let sideAnchor = webNodes[(spoke + 1) % webSpokeCount] && webNodes[(spoke + 1) % webSpokeCount][depth - 1];
                let radialAnchor = webNodes[spoke] && webNodes[spoke][depth];
                if (sideAnchor) connect(sideAnchor.id, node.id);
                if (radialAnchor && ((spoke + depth) % 8 === 0)) connect(radialAnchor.id, node.id);
            }
            prev = node;
        }
    }

    let clusterAnchorsById = {};
    for (let depth = 1; depth < maxDepth; depth++) {
        for (let spoke = 0; spoke < webSpokeCount; spoke++) {
            let anchor = webNodes[spoke] && webNodes[spoke][depth - 1];
            buildWebCellCluster(anchor, spoke, depth, clusterAnchorsById);
        }
    }


    function buildDeflectCluster(clusterKey, angle, radiusStart, values, finalMajor) {
        let anchors = Object.values(PASSIVE_TREE.nodes)
            .filter(node => node && !node.clusterId)
            .map(node => ({ node: node, dist: Math.abs(angleDistance(Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) }))
            .sort((a, b) => a.dist - b.dist);
        let prev = anchors.length > 0 ? anchors[0].node : root;
        for (let i = 0; i < values.length; i++) {
            let stepRadius = radiusStart + i * 74;
            let stepAngle = angle + (i - 1.5) * 0.035;
            let stat = finalMajor && i === values.length - 1 ? 'deflectMajor' : 'deflectChance';
            let node = addNode(
                Math.cos(stepAngle) * stepRadius,
                Math.sin(stepAngle) * stepRadius * webYScale,
                i === values.length - 1 ? 3 : 2,
                stat,
                { sector: 'deflect', kind: i === values.length - 1 ? 'keystone' : 'major', depth: maxDepth - 2 + i, lane: i }
            );
            if (!node) return;
            applyNodeSpec(node, {
                stat: stat,
                val: values[i],
                title: i === values.length - 1 ? '비껴내기 숙련' : '비껴내기 자세',
                desc: finalMajor && i === values.length - 1
                    ? '비껴내기 확률을 크게 올리고, 비껴낸 피해의 감소율을 추가로 강화합니다.'
                    : '공격을 정면으로 받지 않고 흘려 받는 방어 성좌입니다.',
                kind: i === values.length - 1 ? 'keystone' : 'major',
                effectLabel: finalMajor && i === values.length - 1 ? `비껴내기 확률 +${values[i]}%, 비껴내기 피해 감소 +3%` : `비껴내기 확률 +${values[i]}%`
            }, node.kind);
            node.clusterId = clusterKey;
            node.clusterRole = 'deflect';
            node.clusterRoleLabel = '비껴내기';
            node.clusterStep = i + 1;
            node.clusterLength = values.length;
            if (prev) connect(prev.id, node.id);
            prev = node;
        }
    }

    function buildBlockCluster(clusterKey, angle, radiusStart, values, stat, labelSuffix) {
        let anchors = Object.values(PASSIVE_TREE.nodes)
            .filter(node => node && !node.clusterId)
            .map(node => ({ node: node, dist: Math.abs(angleDistance(Math.atan2(node.y, node.x), angle)) * 560 + Math.abs(Math.hypot(node.x, node.y) - radiusStart) }))
            .sort((a, b) => a.dist - b.dist);
        let prev = anchors.length > 0 ? anchors[0].node : root;
        for (let i = 0; i < values.length; i++) {
            let stepRadius = radiusStart + i * 74;
            let stepAngle = angle + (i - 1.5) * 0.035;
            let node = addNode(
                Math.cos(stepAngle) * stepRadius,
                Math.sin(stepAngle) * stepRadius * webYScale,
                i === values.length - 1 ? 3 : 2,
                stat,
                { sector: 'block', kind: i === values.length - 1 ? 'keystone' : 'major', depth: maxDepth - 2 + i, lane: i }
            );
            if (!node) return;
            let title = stat === 'blockChancePct' ? '막기 기반 강화' : '막기 자세';
            let desc = stat === 'blockChancePct'
                ? '방패의 베이스 막기 확률에서만 비율로 증가하는 방어 성좌입니다.'
                : '최종 막기 확률에 직접 더해지는 방어 성좌입니다.';
            applyNodeSpec(node, {
                stat: stat,
                val: values[i],
                title: i === values.length - 1 ? `${title} 숙련` : title,
                desc: desc,
                kind: i === values.length - 1 ? 'keystone' : 'major',
                effectLabel: `막기 확률 +${values[i]}${labelSuffix}`
            }, node.kind);
            node.clusterId = clusterKey;
            node.clusterRole = 'block';
            node.clusterRoleLabel = '막기';
            node.clusterStep = i + 1;
            node.clusterLength = values.length;
            if (prev) connect(prev.id, node.id);
            prev = node;
        }
    }

    let baseOuterRadius = Object.values(PASSIVE_TREE.nodes).filter(node => !node.clusterId).reduce((max, node) => Math.max(max, Math.hypot(node.x, node.y)), 0);
    let outerAnchors = Object.values(PASSIVE_TREE.nodes)
        .filter(node => !node.clusterId)
        .filter(node => Math.hypot(node.x, node.y) >= baseOuterRadius - 240);
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
        let leftAnchor = anchors[0] || apex;
        let rightAnchor = anchors[1] || anchors[0] || apex;
        if (leftNode) connect(leftAnchor.id, leftNode.id);
        if (rightNode) connect(rightAnchor.id, rightNode.id);
        if (leftNode && tipNode) connect(leftNode.id, tipNode.id);
        if (rightNode && tipNode) connect(rightNode.id, tipNode.id);
    });

    buildDeflectCluster('deflect_chance_cluster', 0.34, getWebRadius(7) * PASSIVE_WORLD_SCALE, [4, 4, 4, 8], false);
    buildDeflectCluster('deflect_reduction_cluster', 0.72, getWebRadius(7.6) * PASSIVE_WORLD_SCALE, [3, 3, 3, 6], true);
    buildDeflectCluster('deflect_south_cluster', 1.30, getWebRadius(7.2) * PASSIVE_WORLD_SCALE, [4, 4, 4, 8], false);
    buildBlockCluster('block_south_cluster', 1.52, getWebRadius(7.5) * PASSIVE_WORLD_SCALE, [1.5, 1.5, 1.5, 3], 'blockChance', '%p');
    buildBlockCluster('block_flat_cluster', 2.55, getWebRadius(7.1) * PASSIVE_WORLD_SCALE, [1.5, 1.5, 1.5, 3], 'blockChance', '%p');
    buildBlockCluster('block_base_pct_cluster', 3.02, getWebRadius(7.7) * PASSIVE_WORLD_SCALE, [20, 20, 20, 30], 'blockChancePct', '% 증가');

    ensureOuterHubNeighborConnections(4);

    realignWebPathNodes();
    realignSpecializedClusters(clusterAnchorsById);

    // 시각적 겹침 완화: 노드 반지름보다 짧은 경로가 생기지 않도록 반지름 기반 최소 간격을 적용한다.
    let packed = Object.values(PASSIVE_TREE.nodes);
    for (let iter = 0; iter < 16; iter++) {
        for (let i = 0; i < packed.length; i++) {
            for (let j = i + 1; j < packed.length; j++) {
                let a = packed[i];
                let b = packed[j];
                if (a.id === 'n0' || b.id === 'n0') continue;
                let dx = b.x - a.x;
                let dy = b.y - a.y;
                let dist = Math.hypot(dx, dy) || 0.001;
                let minDist = getNodeClearanceDistance(a, b, a.sector === b.sector ? 36 : 58);
                if (a.kind === 'apex' || b.kind === 'apex') minDist += 22;
                if (a.requiresEvolution || b.requiresEvolution) minDist += 18;
                if (a.clusterId && b.clusterId && a.clusterId !== b.clusterId) minDist += 18;
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
            .filter(node => !node.clusterId)
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
    unlockJournalEntry('passive_star_evolution');
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
    game.starWedge.wedges = game.starWedge.wedges
        .map(wedge => {
            if (!wedge || typeof wedge !== 'object') return null;
            let normalizedId = Number(wedge.id);
            if (!Number.isFinite(normalizedId)) return null;
            wedge.id = normalizedId;
            return wedge;
        })
        .filter(Boolean);
    game.starWedge.sockets = game.starWedge.sockets
        .map(socket => {
            if (!socket || typeof socket !== 'object' || typeof socket.nodeId !== 'string') return null;
            let normalizedWedgeId = Number(socket.wedgeId);
            if (!Number.isFinite(normalizedWedgeId)) return null;
            socket.wedgeId = normalizedWedgeId;
            return socket;
        })
        .filter(Boolean)
        .slice(0, typeof getMaxEquippedStarWedges === 'function' ? getMaxEquippedStarWedges() : 3);
    if (!game.starWedge.nodeMutations || typeof game.starWedge.nodeMutations !== 'object') game.starWedge.nodeMutations = {};
    if (!Number.isFinite(game.starWedge.skyRiftGauge)) game.starWedge.skyRiftGauge = 0;
    game.starWedge.skyRiftGauge = clampNumber(game.starWedge.skyRiftGauge, 0, 100);
    game.starWedge.skyRiftAllCosmos = !!game.starWedge.skyRiftAllCosmos;
    game.starWedge.entriesCleared = Math.max(0, Math.floor(game.starWedge.entriesCleared || 0));
    game.starWedge.skyRiftReady = !!game.starWedge.skyRiftReady;
    game.starWedge.firstClearDone = !!game.starWedge.firstClearDone;
    game.starWedge.lastAnomalyAt = Number.isFinite(game.starWedge.lastAnomalyAt) ? Math.max(0, Math.floor(game.starWedge.lastAnomalyAt)) : 0;
    game.starWedge.skyRiftCarryGauge = Number.isFinite(game.starWedge.skyRiftCarryGauge) ? clampNumber(game.starWedge.skyRiftCarryGauge, 0, 99) : 0;
    game.starWedge.constellationBuff = (game.starWedge.constellationBuff && typeof game.starWedge.constellationBuff === 'object') ? game.starWedge.constellationBuff : null;
    game.starWedge.activeMeteorTier = Number.isFinite(game.starWedge.activeMeteorTier) ? Math.max(1, Math.floor(game.starWedge.activeMeteorTier)) : null;
    let returnZoneId = game.starWedge.meteorReturnZoneId;
    game.starWedge.meteorReturnZoneId = (typeof returnZoneId === 'number' || typeof returnZoneId === 'string') && returnZoneId !== METEOR_FALL_ZONE_ID ? returnZoneId : null;
    let selectedWedgeId = Number(game.starWedge.selectedWedgeId);
    if (!Number.isFinite(selectedWedgeId) || !(game.starWedge.wedges || []).some(w => w.id === selectedWedgeId)) game.starWedge.selectedWedgeId = null;
    else game.starWedge.selectedWedgeId = selectedWedgeId;
    return game.starWedge;
}

const VOID_PASSIVE_OPTION_POOL = [
    { id: 'pctDmg', min: 2, max: 4 },
    { id: 'flatHp', min: 8, max: 16 },
    { id: 'flatDmg', min: 1, max: 3 },
    { id: 'resAll', min: 2, max: 4 },
    { id: 'resChaos', min: 3, max: 5 },
    { id: 'crit', min: 1, max: 2 },
    { id: 'critDmg', min: 4, max: 8 },
    { id: 'aspd', min: 1, max: 3 },
    { id: 'move', min: 1, max: 3 },
    { id: 'armorPct', min: 4, max: 8 },
    { id: 'evasionPct', min: 4, max: 8 },
    { id: 'energyShieldPct', min: 4, max: 8 },
    { id: 'dotPctDmg', min: 3, max: 6 },
    { id: 'resPen', min: 1, max: 2 }
];

function getVoidPassiveNodeIds() {
    return Object.values(PASSIVE_TREE.nodes || {})
        .filter(node => node && node.kind === 'void')
        .map(node => String(node.id));
}

function ensureVoidPassiveState() {
    game.voidPassives = (game.voidPassives && typeof game.voidPassives === 'object') ? game.voidPassives : {};
    let validIds = new Set(getVoidPassiveNodeIds());
    Object.keys(game.voidPassives).forEach(nodeId => {
        if (!validIds.has(String(nodeId))) {
            delete game.voidPassives[nodeId];
            return;
        }
        let entry = game.voidPassives[nodeId] && typeof game.voidPassives[nodeId] === 'object' ? game.voidPassives[nodeId] : {};
        let stats = Array.isArray(entry.stats) ? entry.stats : [];
        entry.stats = stats
            .filter(line => line && P_STATS[line.id] && Number.isFinite(Number(line.val)))
            .slice(0, 2)
            .map(line => ({ id: line.id, val: Number(line.val) }));
        entry.transcendent = normalizeTranscendentVoidPassive(entry.transcendent);
        entry.rarity = entry.transcendent ? 'transcendent' : (entry.stats.length > 0 ? 'magic' : 'normal');
        game.voidPassives[nodeId] = entry;
    });
    return game.voidPassives;
}

function getVoidPassiveCraft(nodeId) {
    let state = ensureVoidPassiveState();
    let key = String(nodeId || '');
    if (!state[key]) state[key] = { rarity: 'normal', stats: [] };
    return state[key];
}

function formatVoidPassiveStatLine(line) {
    if (!line || !P_STATS[line.id]) return '';
    return `${getStatName(line.id)} +${formatValue(line.id, line.val)}${P_STATS[line.id].isPct ? '%' : ''}`;
}

function getVoidPassiveEffectLabel(nodeId) {
    let entry = getVoidPassiveCraft(nodeId);
    if (entry.transcendent) return formatTranscendentVoidPassive(entry.transcendent);
    if (!entry.stats.length) return '공허 옵션 없음 <span style="color:#8ca6b8;">(오브로 최대 2줄 부여)</span>';
    return entry.stats.map(formatVoidPassiveStatLine).filter(Boolean).join(' / ');
}

const TRANSCENDENT_VOID_PASSIVE_DB = [
    { id: 'trauma', name: '트라우마', min: 5, max: 10, desc: v => `이 공허 패시브는 공허를 ${v}회 할당한 것으로 간주` },
    { id: 'paleBlueDot', name: '창백한 푸른 점', fixed: 10, desc: v => `${v} 포인트의 패시브 포인트를 추가로 얻습니다.` },
    { id: 'overflowingVigor', name: '넘치는 활기', min: 3, max: 6, desc: v => `할당한 공허 패시브 하나당 생명력 최대치 +${v}%` },
    { id: 'toughSoul', name: '강인한 영혼', min: 3, max: 6, desc: v => `할당한 공허 패시브 하나당 에너지 보호막 최대치 +${v}%` },
    { id: 'defenseMechanism', name: '방어기제', min: 5, max: 10, desc: v => `막기 확률 최대치 +${v}% 및 막기 확률 +${v}%` },
    { id: 'blurredPresence', name: '흐릿한 존재감', min: 10, max: 20, min2: 3, max2: 5, desc: (v, v2) => `비껴내기 +${v}% 및 비껴내기 피해 감소 +${v2}%` },
    { id: 'chameleon', name: '카멜레온', desc: () => '모든 초월 패시브 중 하나로 변환 가능' },
    { id: 'thirdFinger', name: '세 번째 손가락', desc: () => '반지를 하나 더 장착 가능' },
    { id: 'greed', name: '재물욕', desc: () => '주얼을 하나 더 장착 가능' },
    { id: 'innateTalent', name: '타고난 재능', min: 5, max: 15, min2: 1.5, max2: 2, step2: 0.1, desc: (v, v2) => `${v}% 확률로 ${v2}배 피해` },
    { id: 'wholehearted', name: '전심전력', min: 5, max: 15, desc: v => `할당한 공허 패시브 하나당 모든 피해 +${v}%` },
    { id: 'impatience', name: '조급함', min: 8, max: 16, desc: v => `할당한 공허 패시브 하나당 이동 속도 +${v}%` },
    { id: 'immortalHero', name: '불멸의 영웅', fixed: 3000, desc: v => `생명력 +${Math.max(0, Math.floor(Number(v) || 0))} (획득 이후 사망 시마다 -30)` },
    { id: 'seasoned', name: '노련함', min: 4, max: 5, desc: v => `경험한 루프 1회마다 치명타 피해 배율 +${v}%` }
];

function normalizeTranscendentVoidPassive(raw) {
    if (!raw || typeof raw !== 'object') return null;
    let def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === raw.id);
    if (!def) return null;
    let value = Number.isFinite(Number(raw.value)) ? Number(raw.value) : (def.fixed || def.min || 0);
    let value2 = Number.isFinite(Number(raw.value2)) ? Number(raw.value2) : (def.min2 || 0);
    return { id: def.id, value, value2 };
}

function formatTranscendentVoidPassive(entry) {
    let def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === (entry && entry.id));
    if (!def) return '공허 옵션 없음';
    return `<span style="color:#d8b4ff;">초월 · ${def.name}</span> — ${def.desc(entry.value, entry.value2)}`;
}

function rollVoidPassiveOption(existingStats) {
    let used = new Set((existingStats || []).map(line => line && line.id));
    let pool = VOID_PASSIVE_OPTION_POOL.filter(opt => P_STATS[opt.id] && !used.has(opt.id));
    if (!pool.length) return null;
    let pick = rndChoice(pool);
    let val = Math.floor(pick.min + Math.random() * (pick.max - pick.min + 1));
    return { id: pick.id, val };
}

function getOwnedTranscendentVoidPassiveIds(exceptNodeId) {
    let state = ensureVoidPassiveState();
    return new Set(Object.keys(state).filter(nodeId => String(nodeId) !== String(exceptNodeId))
        .map(nodeId => state[nodeId] && state[nodeId].transcendent && state[nodeId].transcendent.id).filter(Boolean));
}

function rollTranscendentVoidPassive(nodeId) {
    let owned = getOwnedTranscendentVoidPassiveIds(nodeId);
    let pool = TRANSCENDENT_VOID_PASSIVE_DB.filter(def => !owned.has(def.id));
    if (!pool.length) return null;
    let def = rndChoice(pool);
    let roll = (min, max, step) => {
        if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) return 0;
        let s = Number.isFinite(Number(step)) ? Number(step) : 1;
        let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 0.00001));
        let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
        return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    return { id: def.id, value: def.fixed || roll(def.min, def.max), value2: roll(def.min2, def.max2, def.step2) };
}

function rerollTranscendentVoidPassive(entry) {
    let def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === (entry && entry.id));
    if (!def || def.fixed || !Number.isFinite(Number(def.min))) return entry;
    let roll = (min, max, step) => {
        let s = Number.isFinite(Number(step)) ? Number(step) : 1;
        let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 0.00001));
        let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
        return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    return { id: def.id, value: roll(def.min, def.max), value2: roll(def.min2, def.max2, def.step2) };
}

function getTranscendentVoidPassiveCount(id) {
    let state = ensureVoidPassiveState();
    return Object.values(state).filter(entry => entry && entry.transcendent && entry.transcendent.id === id).length;
}

function getTranscendentVoidPassiveBonusValue(id) {
    let state = ensureVoidPassiveState();
    return Object.values(state).reduce((sum, entry) => sum + ((entry && entry.transcendent && entry.transcendent.id === id) ? Number(entry.transcendent.value || 0) : 0), 0);
}

function recordImmortalHeroDeathPenalty() {
    let state = ensureVoidPassiveState();
    let changed = false;
    Object.values(state).forEach(entry => {
        let tr = entry && entry.transcendent;
        if (!tr || tr.id !== 'immortalHero') return;
        let before = Math.max(0, Math.floor(Number(tr.value) || 0));
        tr.value = Math.max(0, before - 30);
        changed = changed || tr.value !== before;
    });
    if (changed && typeof addLog === 'function') addLog('🛡️ 불멸의 영웅 효과가 사망으로 생명력 -30 감소했습니다.', 'death');
    return changed;
}

function syncPaleBlueDotPassivePoints(previousEntry, nextEntry) {
    let previous = previousEntry && previousEntry.id === 'paleBlueDot' ? Number(previousEntry.value || 0) : 0;
    let next = nextEntry && nextEntry.id === 'paleBlueDot' ? Number(nextEntry.value || 0) : 0;
    if (previous === next) return;
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0) - previous + next);
}

function applyVoidPassiveCurrency(nodeId, currencyKey) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog('공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
    if (!(game.passives || []).includes(node.id)) return addLog('먼저 공허 패시브를 활성화해야 합니다.', 'attack-monster');
    if (!['transmute', 'augment', 'alteration', 'chance', 'divine'].includes(currencyKey)) return addLog('공허 패시브에는 진화/확장/변화/기회/신성의 오브만 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('오브가 부족합니다.', 'attack-monster');
    let entry = getVoidPassiveCraft(node.id);
    if (currencyKey === 'chance') {
        game.currencies.chance--;
        let previousTranscendent = entry.transcendent;
        entry.stats = [];
        entry.transcendent = Math.random() < 0.75 ? null : rollTranscendentVoidPassive(node.id);
        syncPaleBlueDotPassivePoints(previousTranscendent, entry.transcendent);
        entry.rarity = entry.transcendent ? 'transcendent' : 'normal';
        addLog(entry.transcendent ? `🌌 공허 패시브 초월: ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}` : '💥 기회의 오브: 공허 패시브가 아무 옵션도 없는 노드로 변했습니다.', entry.transcendent ? 'loot-unique' : 'attack-monster');
        updateStaticUI();
        return;
    }
    if (currencyKey === 'divine') {
        if (!entry.transcendent || !TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min)))) return addLog('신성한 오브는 수치가 있는 초월 공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
        game.currencies.divine--;
        let previousTranscendent = entry.transcendent;
        entry.transcendent = rerollTranscendentVoidPassive(entry.transcendent);
        syncPaleBlueDotPassivePoints(previousTranscendent, entry.transcendent);
        addLog(`✨ 초월 공허 패시브 수치 재굴림: ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}`, 'loot-unique');
        updateStaticUI();
        return;
    }
    if (entry.transcendent) return addLog('초월 공허 패시브에는 진화/확장/변화의 오브를 사용할 수 없습니다.', 'attack-monster');
    if (currencyKey === 'transmute' && entry.stats.length > 0) return addLog('이미 매직 공허 패시브입니다.', 'attack-monster');
    if (currencyKey === 'augment' && (entry.stats.length <= 0 || entry.stats.length >= 2)) return addLog('확장의 오브는 1줄 공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
    if (currencyKey === 'alteration' && entry.stats.length <= 0) return addLog('변화의 오브는 매직 공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
    game.currencies[currencyKey]--;
    if (currencyKey === 'transmute') entry.stats = [rollVoidPassiveOption([])].filter(Boolean);
    else if (currencyKey === 'augment') {
        let next = rollVoidPassiveOption(entry.stats);
        if (next) entry.stats.push(next);
    } else if (currencyKey === 'alteration') {
        let lineCount = Math.max(1, Math.min(2, entry.stats.length));
        entry.stats = [];
        for (let i = 0; i < lineCount; i++) {
            let next = rollVoidPassiveOption(entry.stats);
            if (next) entry.stats.push(next);
        }
    }
    entry.rarity = entry.stats.length > 0 ? 'magic' : 'normal';
    addLog(`🕳️ 공허 패시브에 ${ORB_DB[currencyKey].name} 사용: ${getVoidPassiveEffectLabel(node.id).replace(/<[^>]*>/g, '')}`, 'loot-magic');
    updateStaticUI();
}

function isStarWedgeNodeMutable(node) {
    if (!node) return false;
    if (node.id === 'n0') return false;
    if (node.socketType === 'star_wedge') return false;
    if (['apex', 'evolved', 'transcendent', 'core', 'hub', 'keystone', 'void'].includes(node.kind)) return false;
    return true;
}


function getMaxEquippedStarWedgesForLevel(astronomerLevel) {
    let base = Number.isFinite(Number(typeof MAX_STAR_WEDGES !== 'undefined' ? MAX_STAR_WEDGES : 3)) ? Math.max(1, Math.floor(MAX_STAR_WEDGES)) : 3;
    let hardCap = Number.isFinite(Number(typeof MAX_STAR_WEDGES_HARD_CAP !== 'undefined' ? MAX_STAR_WEDGES_HARD_CAP : 8)) ? Math.max(base, Math.floor(MAX_STAR_WEDGES_HARD_CAP)) : 8;
    let astroLv = Math.max(1, Math.floor(Number(astronomerLevel) || 1));
    let bonus = 0;
    if (astroLv >= 4) bonus++;
    if (astroLv >= 7) bonus++;
    if (astroLv >= 10) bonus++;
    if (astroLv >= 13) bonus++;
    if (astroLv >= 15) bonus++;
    return Math.min(hardCap, base + bonus);
}

function getMaxEquippedStarWedges() {
    let astroLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    return getMaxEquippedStarWedgesForLevel(astroLv);
}

function getStarWedgeSocketNodeIds() {
    return Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.socketType === 'star_wedge').map(node => node.id);
}

function assignStarWedgeSockets() {
    let st = (game && game.starWedge) || {};
    let unlocked = !!st.unlocked;
    let hubs = Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.kind === 'hub');
    hubs.forEach(node => {
        node.title = '별쐐기 슬롯';
        node.desc = unlocked
            ? '별쐐기를 장착할 수 있는 슬롯입니다. 장착 시 주변 노드(1~3경로)와 슬롯 자신을 변성시킬 수 있습니다.'
            : '별쐐기 해금 후 별쐐기를 장착할 수 있는 슬롯입니다.';
        node.socketType = unlocked ? 'star_wedge' : null;
    });
    let hubIdSet = new Set(hubs.map(node => String(node.id)));
    st.sockets = (st.sockets || [])
        .filter(entry => hubIdSet.has(String(entry && entry.nodeId)))
        .slice(0, typeof getMaxEquippedStarWedges === 'function' ? getMaxEquippedStarWedges() : 3);
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('structure');
}

function createRandomStarWedgeLine(optionPool) {
    let pool = Array.isArray(optionPool) && optionPool.length > 0 ? optionPool : STAR_WEDGE_OPTION_POOL;
    let pick = rndChoice(pool);
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
    let coreLine = createRandomStarWedgeLine(STAR_WEDGE_CORE_OPTION_POOL);
    return { id: Date.now() + Math.floor(Math.random() * 100000), lines: [createRandomStarWedgeLine(), createRandomStarWedgeLine(), createRandomStarWedgeLine(), coreLine] };
}



function createUniqueStarWedgeItem() {
    const type = rndChoice(['asteroid_belt','sun','zero_gravity','black_hole','satellite','comet','resonant_star']);
    const id = Date.now() + Math.floor(Math.random() * 100000);
    const mk = () => createRandomStarWedgeLine();
    const mkCore = () => createRandomStarWedgeLine(STAR_WEDGE_CORE_OPTION_POOL);
    let wedge = { id, unique: true, uniqueType: type, lines: [mk(), mk(), mk(), mkCore()] };
    if (type === 'sun') {
        let core = mkCore();
        core.val = Number.isFinite(core.val) ? Math.round(core.val * 3 * 10) / 10 : core.val;
        wedge.lines = [
            { stat: 'flatHp', val: 0, boosted: false, disabled: true },
            { stat: 'flatHp', val: 0, boosted: false, disabled: true },
            { stat: 'flatHp', val: 0, boosted: false, disabled: true },
            core
        ];
    } else if (type === 'comet') {
        wedge.lines = [
            { stat: 'move', val: 12, boosted: true },
            { stat: 'move', val: 16, boosted: true },
            { stat: 'move', val: 20, boosted: true },
            { stat: 'move', val: 24, boosted: true }
        ];
    } else if (type === 'resonant_star') {
        wedge.lines = [mk(), mk(), mk(), { stat: 'suppCap', val: 1, boosted: true }];
    } else if (type === 'black_hole') {
        const hubs = Object.values(PASSIVE_TREE.nodes || {}).filter(n => n && n.kind === 'hub').map(n => String(n.id));
        wedge.recordedHubNodeId = hubs.length ? rndChoice(hubs) : null;
    }
    return wedge;
}

function injectMutation(st, conflictNodes, nodeId, payload) {
    if (conflictNodes.has(nodeId)) return;
    if (st.nodeMutations[nodeId]) { delete st.nodeMutations[nodeId]; conflictNodes.add(nodeId); return; }
    st.nodeMutations[nodeId] = payload;
}

function getStarWedgeById(wedgeId) {
    let st = ensureStarWedgeState();
    let normalizedWedgeId = Number(wedgeId);
    if (!Number.isFinite(normalizedWedgeId)) return null;
    return (st.wedges || []).find(w => w.id === normalizedWedgeId) || null;
}

function recalculateStarWedgeMutations() {
    let st = ensureStarWedgeState();
    st.nodeMutations = {};
    let conflictNodes = new Set();
    (st.sockets || []).forEach(socket => {
        let wedge = getStarWedgeById(socket.wedgeId);
        let center = PASSIVE_TREE.nodes[socket.nodeId];
        if (!wedge || !center) return;
        const centerX = Number(center.x || 0), centerY = Number(center.y || 0);
        const radialNodes = Object.values(PASSIVE_TREE.nodes || {}).filter(n => n && Number.isFinite(Number(n.x)) && Number.isFinite(Number(n.y)));
        const radialDist = (n) => Math.hypot(Number(n.x||0)-centerX, Number(n.y||0)-centerY);

        if (wedge.unique && wedge.uniqueType === 'black_hole' && wedge.recordedHubNodeId) {
            st.virtualLearnNodes = st.virtualLearnNodes || {};
            st.virtualLearnNodes[String(wedge.recordedHubNodeId)] = true;
            st.disabledNodeEffects = st.disabledNodeEffects || {};
            st.disabledNodeEffects[String(center.id)] = true;
            st.disabledNodeEffects[String(wedge.recordedHubNodeId)] = true;
        }
        if (wedge.unique && wedge.uniqueType === 'sun') {
            let coreLineSun = Array.isArray(wedge.lines) ? wedge.lines[3] : null;
            if (coreLineSun && coreLineSun.stat) {
                injectMutation(st, conflictNodes, center.id, { wedgeId:wedge.id, socketNodeId:center.id, lineIndex:3, originalStat:center.stat, originalVal:center.val, currentStat:coreLineSun.stat, currentVal:coreLineSun.val });
            }
            return;
        }
        if (wedge.unique && (wedge.uniqueType === 'zero_gravity' || wedge.uniqueType === 'asteroid_belt' || wedge.uniqueType === 'satellite')) {
            const r1 = wedge.uniqueType === 'asteroid_belt' ? 120 : 0;
            const r2 = wedge.uniqueType === 'asteroid_belt' ? 300 : (wedge.uniqueType === 'satellite' ? 260 : 220);
            radialNodes.forEach(n => {
                const d = radialDist(n);
                if (d < r1 || d > r2 || String(n.id)===String(center.id) || n.kind === 'void') return;
                const nodeKind = String(n.kind || '');
                if (wedge.uniqueType === 'satellite' && nodeKind === 'core') {
                    st.disabledNodeEffects = st.disabledNodeEffects || {};
                    st.disabledNodeEffects[String(n.id)] = true;
                    return;
                }
                if (wedge.uniqueType === 'satellite' && nodeKind === 'core') return;
                if (!isStarWedgeNodeMutable(n) && wedge.uniqueType !== 'satellite') return;
                const line = wedge.lines[Math.min(2, Math.max(0, Math.floor((d / Math.max(1, r2)) * 3)))];
                if (!line || !line.stat) return;
                injectMutation(st, conflictNodes, String(n.id), { wedgeId:wedge.id, socketNodeId:center.id, lineIndex:0, originalStat:n.stat, originalVal:n.val, currentStat:line.stat, currentVal:line.val });
            });
            let coreLine = Array.isArray(wedge.lines) ? wedge.lines[3] : null;
            if (coreLine && coreLine.stat && wedge.uniqueType !== 'satellite') injectMutation(st, conflictNodes, center.id, { wedgeId:wedge.id, socketNodeId:center.id, lineIndex:3, originalStat:center.stat, originalVal:center.val, currentStat:coreLine.stat, currentVal:coreLine.val });
            return;
        }

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
    if (st.unlocked) {
        if (getStarWedgeSocketNodeIds().length === 0) assignStarWedgeSockets();
        return false;
    }
    if (!getStarWedgeUnlockReady()) return false;
    st.unlocked = true;
    assignStarWedgeSockets();
    recalculateStarWedgeMutations();
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('structure');
    addLog('☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다.', 'loot-unique');
    queueTutorialNotice('meteor_unlocked', '운석 낙하 지점', '루프 7 이후 액트 7을 넘긴 사냥에서 하늘의 균열이 열립니다.\n게이지를 100%까지 채우면 운석 낙하 지점에 1회 입장할 수 있습니다.', 'tab-map');
    return true;
}


function getAstronomerLevelForUnlocks() {
    return typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
}

function triggerAstronomerAnomaly(zone, enemy) {
    let st = ensureStarWedgeState();
    let astroLv = getAstronomerLevelForUnlocks();
    if (astroLv < 3) return false;
    let now = Date.now();
    if (now - (st.lastAnomalyAt || 0) < 12000) return false;
    let baseChance = enemy && enemy.isBoss ? 0.08 : (enemy && enemy.isElite ? 0.028 : 0.0045);
    let bonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('anomalyChancePct') || 0) / 100 : 0;
    if (Math.random() >= baseChance * (1 + bonus)) return false;
    st.lastAnomalyAt = now;
    let rare = astroLv >= 11 && Math.random() < 0.22;
    if (rare) {
        let shard = 6 + Math.floor(Math.random() * 7);
        awardCurrency('meteorShard', shard);
        awardCurrency('starDust', 2);
        st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + 8, 0, 100);
        addLog(`☄️ 희귀 이상 현상 관측! 운석 파편 +${shard}, 별가루 +2, 균열 게이지 +8%`, 'loot-unique');
    } else {
        awardCurrency('starDust', 1);
        st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + 3, 0, 100);
        addLog('✨ 이상 현상 관측: 별가루 +1, 균열 게이지 +3%', 'loot-magic');
    }
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('astronomer', 'anomaly_observe');
    return true;
}

function grantConstellationObservationReward() {
    let st = ensureStarWedgeState();
    let astroLv = getAstronomerLevelForUnlocks();
    if (astroLv < 8) return;
    let pool = [
        { stat: 'pctDmg', label: '피해', val: astroLv >= 15 ? 7 : 4 },
        { stat: 'flatHp', label: '최대 생명력', val: astroLv >= 15 ? 45 : 25 },
        { stat: 'move', label: '이동 속도', val: astroLv >= 15 ? 5 : 3 },
        { stat: 'crit', label: '치명타 확률', val: astroLv >= 15 ? 4 : 2 }
    ];
    let pick = rndChoice(pool);
    // '핵심: 별자리 고정'(constellationLock): lock in the better candidate so a strong roll
    // is never overwritten by a weaker observation.
    let lockActive = typeof getExpertNodeEffectValue === 'function' && getExpertNodeEffectValue('constellationLock') > 0;
    if (lockActive && st.constellationBuff && st.constellationBuff.stat
        && getConstellationDesirability(st.constellationBuff) >= getConstellationDesirability(pick)) {
        let kept = st.constellationBuff;
        kept.observedAt = Date.now();
        kept.permanent = astroLv >= 9;
        addLog(`🌠 별자리 고정: ${kept.label} +${kept.val}${kept.stat === 'flatHp' ? '' : '%'} 유지`, 'loot-unique');
        return;
    }
    st.constellationBuff = { stat: pick.stat, label: pick.label, val: pick.val, observedAt: Date.now(), permanent: astroLv >= 9 };
    addLog(`🌠 별자리 관측: ${pick.label} +${pick.val}${pick.stat === 'flatHp' ? '' : '%'}${astroLv >= 9 ? ' (루프 후 유지)' : ''}`, 'loot-unique');
}
function getConstellationDesirability(buff) {
    if (!buff || !buff.stat) return 0;
    let weights = { pctDmg: 6, crit: 8, flatHp: 0.5, move: 3 };
    return (weights[buff.stat] || 1) * Math.max(0, Number(buff.val || 0));
}

function getSkyRiftGaugeTierCap(st) {
    return st && st.skyRiftAllCosmos ? 40 : 20;
}

function getSkyRiftGaugeEffectiveTier(zone, st) {
    let tier = Math.max(1, Math.floor((zone && zone.tier) || 1));
    return Math.min(getSkyRiftGaugeTierCap(st), tier);
}

function getSkyRiftGaugeGain(zone, enemy, st) {
    let baseGain = enemy && enemy.isBoss ? 3.8 : (enemy && enemy.isElite ? 1.6 : 0.35);
    let effectiveTier = getSkyRiftGaugeEffectiveTier(zone, st);
    let gain = baseGain * Math.max(1, effectiveTier);
    if (typeof getExpertNodeEffectValue === 'function') gain *= (1 + (Math.max(0, getExpertNodeEffectValue('meteorGaugeGainPct')) / 100));
    return gain;
}

function gainSkyRiftGaugeFromCombat(zone, enemy) {
    let st = ensureStarWedgeState();
    let astroLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    if (astroLv < 1 || !st.unlocked || st.skyRiftReady) return;
    if (!zone) return;
    let eligible = (zone.type === 'act' && zone.id >= STAR_WEDGE_UNLOCK_ACT) || zone.type === 'abyss' || zone.type === 'labyrinth' || zone.type === 'chaosRealm' || zone.type === 'skyTower' || zone.type === 'underworld' || zone.type === 'cosmos';
    if (!eligible) return;
    if (!st.skyRiftReady && (st.skyRiftGauge || 0) <= 0.0001) {
        st.skyRiftAllCosmos = true;
        st.skyRiftMinTier = null;
    }
    if (zone.type !== 'cosmos') st.skyRiftAllCosmos = false;
    let gain = getSkyRiftGaugeGain(zone, enemy, st);
    if (astroLv >= 2 && Math.random() < (enemy && enemy.isElite ? 0.035 : 0.006)) awardCurrency('starDust', 1);
    triggerAstronomerAnomaly(zone, enemy);
    let nextGauge = (st.skyRiftGauge || 0) + gain;
    st.skyRiftGauge = clampNumber(nextGauge, 0, 100);
    let tier = getSkyRiftGaugeEffectiveTier(zone, st);
    st.skyRiftMinTier = Number.isFinite(st.skyRiftMinTier) ? Math.min(st.skyRiftMinTier, tier) : tier;
    if (st.skyRiftGauge >= 100 && !st.skyRiftReady) {
        let overflow = Math.max(0, nextGauge - 100);
        st.skyRiftGauge = 100;
        st.skyRiftCarryGauge = astroLv >= 10 ? Math.min(99, Math.floor(overflow * 0.25)) : 0;
        st.skyRiftReady = true;
        addLog('☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다.', 'loot-rare');
        game.noti.map = true;
    }
}

function advanceOceanDiveFromKill(zone) {
    // 팩(웨이브) 전체를 클리어했을 때만 호출됩니다 (개별 몬스터 처치마다 호출되지 않음).
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    if (Math.random() < 0.06) awardCurrency('reefFragment', 1);
    // 전투 진행도 보상: 웨이브를 클리어할 때마다 수심이 추가로 전진한다.
    // 시간 기반 진행(tickOceanDepth)은 방치용 바닥값으로 남고, 빠르게/강하게 클리어할수록 더 깊이 내려간다.
    let gearDepthGainPct = 0;
    try { if (typeof getPlayerStats === 'function') gearDepthGainPct = Math.max(0, Number(getPlayerStats().oceanDepthGainPct) || 0); } catch (e) { console.warn('failed to read ocean depth gain stat:', e); }
    let clearBurst = (14 + getOceanDepthTier(st.depthM)) * (1 + gearDepthGainPct / 100);
    applyOceanDepthGain(st, clearBurst);
    let pressureCrushAlive = (game.enemies || []).some(e => e && e.hp > 0 && e.trait && e.trait.oceanPressureGainMul);
    if (pressureCrushAlive) st.pressureLevel = Math.ceil(st.pressureLevel * 1.1);
    gainOceanFishingGaugeFromCombat(zone);
}

function consumeOceanOxygenOnAttack() {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    if (!isInOceanZone()) return;
    let cost = typeof getOceanOxygenPerAttackCost === 'function' ? getOceanOxygenPerAttackCost() : 0.5;
    let savingPct = 0;
    try { if (typeof getPlayerStats === 'function') savingPct = Math.max(0, Math.min(90, Number(getPlayerStats().oceanOxygenAttackSavingPct) || 0)); } catch (e) { console.warn('failed to read ocean oxygen saving stat:', e); }
    cost *= (1 - savingPct / 100);
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, (st.oxygenCur || 0) - cost));
    // 산소가 0이 되어도 즉시 귀환하지 않는다. 익사 피해는 tickOceanOxygen 에서 시간에 따라 누적된다.
}

function gainOceanFishingGaugeFromCombat(zone) {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    // 낚시 게이지는 구역 강도(수심 단계)에 따라 세분화: 얕은(약한) 곳에선 조금, 깊은(강한) 곳에선 조금 더 오른다.
    let depthTier = Math.max(0, Math.floor((zone && zone.depthTier) || getOceanDepthTier(st.depthM)));
    let gain = (1.0 + depthTier * 0.18) * getOceanFishingGaugeGainMul();
    let nextGauge = (st.fishingGauge || 0) + gain;
    st.fishingGauge = clampNumber(nextGauge, 0, 100);
    if (st.fishingGauge >= 100) {
        st.fishingGauge = 0;
        catchOceanFish(st.pressureLevel || 0);
    }
}

function catchOceanFish(depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let eligible = Object.keys(OCEAN_FISH_DB).filter(key => (OCEAN_FISH_DB[key].depthTier || 0) <= safeTier);
    if (eligible.length === 0) return;
    let rareChanceBonusPct = 0;
    try { if (typeof getPlayerStats === 'function') rareChanceBonusPct = Math.max(0, Number(getPlayerStats().oceanRareFishChancePct) || 0); } catch (e) { console.warn('failed to read ocean rare fish chance stat:', e); }
    let weights = eligible.map(key => {
        let rareWeight = Number.isFinite(OCEAN_FISH_DB[key].rareWeight) ? OCEAN_FISH_DB[key].rareWeight : 1;
        if (rareWeight < 1) rareWeight *= (1 + rareChanceBonusPct / 100);
        return (1 / (1 + (safeTier - (OCEAN_FISH_DB[key].depthTier || 0)))) * rareWeight;
    });
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let picked = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { picked = eligible[i]; break; }
    }
    let st = ensureOceanState();
    st.fishStock[picked] = Math.max(0, Math.floor(st.fishStock[picked] || 0)) + 1;
    addLog(`🐟 ${OCEAN_FISH_DB[picked].name}을(를) 낚았습니다!`, 'loot-magic');
}


function getOceanPermanentUpgradeCost(key) {
    let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return null;
    let level = getOceanPermanentUpgradeLevel(key);
    if (level >= def.maxLevel) return null;
    let nextLevel = level + 1;
    return {
        skyEssence: 4 + nextLevel * 2,
        oceanRerollShard: 1 + Math.floor(nextLevel / 3),
        reefFragment: 2 + Math.floor(nextLevel / 2),
        bossCore: nextLevel % 3 === 0 ? Math.max(1, Math.floor(nextLevel / 3)) : 0
    };
}
function getOceanUpgradeCostText(cost) {
    if (!cost) return '최대';
    return Object.keys(cost)
        .filter(key => (cost[key] || 0) > 0)
        .map(key => `${ORB_DB[key] ? ORB_DB[key].name : key} ${cost[key]}`)
        .join(' / ');
}
function canPayOceanUpgradeCost(cost) {
    if (!cost) return false;
    return Object.keys(cost).every(key => (game.currencies[key] || 0) >= (cost[key] || 0));
}
function payOceanUpgradeCost(cost) {
    Object.keys(cost).forEach(key => {
        game.currencies[key] = Math.max(0, (game.currencies[key] || 0) - (cost[key] || 0));
    });
}
function upgradeOceanPermanent(key) {
    let st = ensureOceanState();
    let def = OCEAN_PERMANENT_UPGRADE_DEFS[key];
    if (!def) return false;
    let cost = getOceanPermanentUpgradeCost(key);
    if (!cost) return addLog(`${def.label} 업그레이드는 이미 최대 단계입니다.`, 'attack-monster');
    if (!canPayOceanUpgradeCost(cost)) return addLog(`${def.label} 업그레이드 재료가 부족합니다. (필요: ${getOceanUpgradeCostText(cost)})`, 'attack-monster');
    payOceanUpgradeCost(cost);
    st.permanentUpgrades[key] = getOceanPermanentUpgradeLevel(key) + 1;
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = Math.min(st.oxygenMax, (st.oxygenCur || 0) + (key === 'oxygenMax' ? def.valuePerLevel : 0));
    addLog(`🌊 심해 영구 업그레이드: ${def.label} Lv.${st.permanentUpgrades[key]} 달성`, 'loot-rare');
    updateStaticUI();
    queueImportantSave(200);
    return true;
}

function installOceanReefFragment() {
    let st = ensureOceanState();
    if (st.reefInstalled >= 10) return addLog('암초 조각을 더 설치할 수 없습니다 (최대치).', 'attack-monster');
    if ((game.currencies.reefFragment || 0) < 1) return addLog('암초 조각이 부족합니다.', 'attack-monster');
    game.currencies.reefFragment -= 1;
    st.reefInstalled = Math.max(0, Math.floor(st.reefInstalled || 0)) + 1;
    addLog(`🪸 암초 조각을 설치했습니다. (낚시 게이지 충전 +${(st.reefInstalled * 15)}%)`, 'loot-rare');
}

function enterOceanDive() {
    let st = ensureOceanState();
    if (!st.unlocked) return addLog('아직 심해로 진입할 수 없습니다.', 'attack-monster');
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = st.oxygenMax;
    st.diving = true;
    st.lastTickAt = Date.now();
    game.currentZoneId = OCEAN_ZONE_ID;
    addLog(`🌊 심해 ${st.depthM}m 지점부터 잠수를 시작합니다.`, 'loot-rare');
}

function forceSurfaceOcean(reason) {
    let st = ensureOceanState();
    st.diving = false;
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.oxygenCur = st.oxygenMax;
    st.drowning = false;
    st.drownSec = 0;
    addLog(reason === 'oxygen' ? '🫧 산소가 모두 소진되어 익사 직전에 수면으로 끌어올려졌습니다. 체크포인트 이후의 진행이 사라졌습니다.' : '🌊 잠수를 종료하고 수면으로 복귀했습니다.', 'attack-monster');
    // 실패(산소 고갈) 시에도 '수면으로 복귀' 버튼과 동일하게 심해 맵을 벗어나 수면(일반 맵)으로 이동한다.
    if (reason !== 'manual') {
        try {
            if (typeof changeZone === 'function') changeZone(Math.max(0, game.maxZoneId || 0));
            if (typeof updateStaticUI === 'function') updateStaticUI();
        } catch (e) { console.warn('failed to auto-surface from ocean:', e); }
    }
}

// 산소가 0이 된 뒤에는 시간이 지날수록 점점 큰 익사 피해를 입는다. 쓰러지기 직전이 되면 사망이 아니라 수면으로 복귀한다.
function applyOceanDrowningDamage(st, dtSec) {
    if (!st || !(dtSec > 0)) return;
    if (!st.drowning) {
        st.drowning = true;
        st.drownSec = 0;
        addLog('🫨 산소가 바닥났습니다! 익사 피해가 점점 커지니 즉시 수면으로 복귀하세요.', 'attack-monster');
    }
    st.drownSec = (Number(st.drownSec) || 0) + dtSec;
    let pStats = (typeof getPlayerStats === 'function') ? getPlayerStats() : null;
    let maxHp = Math.max(1, Math.floor((pStats && pStats.maxHp) || game.playerHp || 1));
    // 익사 피해: 초당 최대체력의 (3% + 익사 누적 시간 × 3%). 시간이 지날수록 가속된다.
    let dmgPct = 3 + (st.drownSec * 3);
    let dmg = maxHp * (dmgPct / 100) * dtSec;
    let curHp = Math.max(0, Number(game.playerHp) || 0);
    if (dmg >= curHp - 1) {
        // 쓰러지기 직전이면 사망 처리(전멸) 대신 수면 복귀 버튼과 동일한 효과로 강제 귀환한다.
        game.playerHp = Math.max(1, curHp);
        forceSurfaceOcean('oxygen');
        return;
    }
    game.playerHp = curHp - dmg;
}

function isInOceanZone() {
    return game.currentZoneId === OCEAN_ZONE_ID;
}

function tickOceanOxygen(nowMs) {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    // 산소는 실제로 심해 맵에 입장해 있을 때만 감소합니다. 다른 맵으로 이동하면 잠수가 일시 중지됩니다.
    if (!isInOceanZone()) { st.lastTickAt = nowMs; return; }
    let last = Math.max(0, Number(st.lastTickAt) || nowMs);
    let dtSec = Math.max(0, Math.min(5, (nowMs - last) / 1000));
    st.lastTickAt = nowMs;
    if (dtSec <= 0) return;
    let drainPerSec = getOceanOxygenDrainPerSec();
    let leechAlive = (game.enemies || []).some(e => e && e.hp > 0 && e.trait && e.trait.oceanOxygenLeechOnHit);
    if (leechAlive) drainPerSec *= 1.4;
    st.oxygenCur = Math.max(0, Math.min(st.oxygenMax, st.oxygenCur - drainPerSec * dtSec));
    if (st.oxygenCur <= 0) { applyOceanDrowningDamage(st, dtSec); return; }
    // 산소가 다시 차오르면 익사 상태를 해제한다(잠수 중에는 보통 회복되지 않지만 안전 장치).
    st.drowning = false;
    st.drownSec = 0;
    tickOceanDepth(st, dtSec);
}

// 수심을 meters 만큼 증가시키고 체크포인트/수압을 갱신하는 공통 처리.
function applyOceanDepthGain(st, meters) {
    if (!st || !(meters > 0)) return;
    let curDepth = Math.max(0, Number(st.depthM) || 0);
    // 500m 보스 경계: 다음 경계의 심해 가디언을 처치하기 전에는 그 경계까지만 전진한다.
    let interval = typeof getOceanBossBoundaryInterval === 'function' ? getOceanBossBoundaryInterval() : 500;
    let cleared = Math.max(0, Math.floor(st.bossClearM || 0));
    let nextBoundary = Math.floor(cleared / interval) * interval + interval;
    if (curDepth >= nextBoundary) return; // 이미 경계에 도달해 보스 처치를 기다리는 중
    st.depthM = Math.min(nextBoundary, curDepth + meters);
    let newCheckpoint = Math.floor(st.depthM / 100) * 100;
    if (newCheckpoint > (st.checkpointM || 0)) {
        st.checkpointM = newCheckpoint;
        addLog(`🛗 수중 리프트 ${st.checkpointM}m 지점이 개방되었습니다.`, 'loot-rare');
    }
    st.pressureLevel = getOceanDepthTier(st.depthM);
    // 경계에 막 도달한 순간(이전엔 미달, 지금 도달) 가디언 등장을 알린다.
    if (curDepth < nextBoundary && st.depthM >= nextBoundary) {
        addLog(`🌊 수심 ${nextBoundary}m — 심해 가디언이 길을 막습니다. 처치해야 더 깊이 내려갈 수 있습니다.`, 'loot-unique');
    }
}

// 수심을 시간에 따라 꾸준히 증가시킨다(방치 진행의 바닥값).
function tickOceanDepth(st, dtSec) {
    if (!st || !(dtSec > 0)) return;
    let speedBonus = typeof getOceanMoveSpeedDepthBonus === 'function' ? getOceanMoveSpeedDepthBonus() : 1;
    let gearDepthGainPct = 0;
    try { if (typeof getPlayerStats === 'function') gearDepthGainPct = Math.max(0, Number(getPlayerStats().oceanDepthGainPct) || 0); } catch (e) { console.warn('failed to read ocean depth gain stat:', e); }
    let depthPerSec = 3 * speedBonus * (1 + gearDepthGainPct / 100);
    applyOceanDepthGain(st, depthPerSec * dtSec);
}

const OCEAN_MOD_CATEGORY_RULES = [
    { category: '공격', ids: ['flatDmg', 'weaponFlatDmgPct', 'pctDmg', 'meleePctDmg', 'projectilePctDmg', 'physPctDmg', 'elementalPctDmg', 'firePctDmg', 'coldPctDmg', 'lightPctDmg', 'chaosPctDmg', 'aoePctDmg', 'dotPctDmg', 'crit', 'critDmg', 'physIgnore', 'resPen', 'physFlatDmg', 'fireFlatDmg', 'coldFlatDmg', 'lightFlatDmg', 'chaosFlatDmg', 'summonFlatDmg', 'summonPctDmg', 'summonCrit', 'summonCritDmg', 'summonResPen'] },
    { category: '방어·생명', ids: ['flatHp', 'pctHp', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'deflectChance', 'regen', 'regenFlat', 'regenSuppress', 'leech', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap', 'blockChancePct'] },
    { category: '속도·치명', ids: ['aspd', 'move', 'summonAspd', 'summonEfficiency'] },
    { category: '저항', ids: ['resF', 'resC', 'resL', 'resAll', 'resChaos'] }
];
function getModCategory(mod) {
    let statId = (mod && (mod.statId || mod.id)) || '';
    let found = OCEAN_MOD_CATEGORY_RULES.find(rule => rule.ids.includes(statId));
    return found ? found.category : '특수';
}
const OCEAN_WORKBENCH_OPTIONS = [
    { id: 'oceanBossSlayer', label: '심연의 보스 학살', desc: '보스에게 가하는 피해가 증가합니다. (일반 옵션으로는 등장하지 않는 전용 스탯)', statId: 'bossDamagePct', min: 18, max: 28 },
    { id: 'oceanEliteHunter', label: '심연의 정예 사냥', desc: '정예 몬스터에게 가하는 피해가 증가합니다.', statId: 'eliteDamagePct', min: 16, max: 24 },
    { id: 'oceanFirstStrike', label: '심연의 선제 일격', desc: '생명력이 가득 찬 적에게 가하는 첫 타에 추가 피해를 줍니다.', statId: 'firstStrikeDamagePct', min: 20, max: 30 },
    { id: 'oceanCuller', label: '심연의 처형자', desc: '생명력이 일정 % 이하인 보스가 아닌 적을 즉시 처치합니다.', statId: 'cullStrikePct', min: 6, max: 10 },
    { id: 'oceanLeviathanCrown', label: '리바이어던의 권능', desc: '보스 처치 피해를 가장 높게 보장하는 최상위 전용 옵션입니다.', statId: 'bossDamagePct', min: 32, max: 42 }
];
function getOceanWorkbenchOption(optionId, topTierOnly) {
    if (topTierOnly) return OCEAN_WORKBENCH_OPTIONS.find(opt => opt.id === 'oceanLeviathanCrown');
    return OCEAN_WORKBENCH_OPTIONS.find(opt => opt.id === optionId) || OCEAN_WORKBENCH_OPTIONS[Math.floor(Math.random() * (OCEAN_WORKBENCH_OPTIONS.length - 1))];
}

const SEA_GIFT_RANDOM_ORB_KEYS = ['transmute', 'augment', 'alteration', 'alchemy', 'regal', 'chaos', 'divine', 'blessing', 'tainted', 'annulment'];
const SEA_GIFT_RECIPES = [
    // --- 일반 레시피 ---
    { id: 'reefBundle', desc: '【재화 획득: 암초 조각 ×2】 얕은 바다 어종을 모아 암초 조각으로 가공합니다.', requires: { shallowSilverfin: 5 }, effect: { type: 'currency', key: 'reefFragment', amount: 2 } },
    { id: 'tidalCharm', desc: '【재화 획득: 심해 리롤 파편 ×1】 조류 장어로 산소 정련 파편을 만듭니다.', requires: { tidalEel: 4 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 1 } },
    { id: 'glowfinEssence', desc: '【재화 획득: 심해 리롤 파편 ×2】 발광 송어로 베이스 옵션 재제련에 쓰는 심해의 파편을 정제합니다.', requires: { glowfinTrout: 3, tidalEel: 2 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 2 } },
    { id: 'purifyingOffering', desc: '【장비 강화: 계열 재굴림 1줄】 발광 송어를 바쳐 원하는 계열의 기존 옵션 한 줄만 다시 굴립니다(다른 줄 보존, 등급 보정 없음).', requires: { glowfinTrout: 4, shallowSilverfin: 3 }, effect: { type: 'taggedReroll' } },
    { id: 'abyssalGift', desc: '【장비 강화: 확정 옵션 부여】 심연 등불고기를 제물로 바쳐 장비에 옵션 한 줄을 확정으로 부여합니다.', requires: { abyssAngler: 4, tidalEel: 3 }, effect: { type: 'guaranteedMod' } },
    // --- 무작위 제작 재화 레시피 (진화/변화/확장/제왕/카오스/연금술/축복/신성/타락/소멸의 오브 중 1개) ---
    { id: 'tidalFortune', desc: '【재화 획득: 무작위 제작 오브 ×1】 조류 장어와 은빛 비늘치 더미에서 흘러나온 마력을 정제해 무작위 제작 오브 1개를 얻습니다.', requires: { tidalEel: 3, shallowSilverfin: 3 }, effect: { type: 'randomCurrency', amount: 1 } },
    { id: 'glowingFortune', desc: '【재화 획득: 무작위 제작 오브 ×1】 발광 송어의 빛을 응축해 무작위 제작 오브 1개를 얻습니다.', requires: { glowfinTrout: 3, tidalEel: 2 }, effect: { type: 'randomCurrency', amount: 1 } },
    { id: 'abyssalCache', desc: '【재화 획득: 무작위 제작 오브 ×2】 심연 등불고기와 발광 송어로 봉인된 보물함을 열어 무작위 제작 오브 2개를 얻습니다.', requires: { abyssAngler: 2, glowfinTrout: 2 }, effect: { type: 'randomCurrency', amount: 2 } },
    { id: 'tidelordCache', desc: '【재화 획득: 무작위 제작 오브 ×2】 해류군주 비단잉어의 비늘로 만든 함에서 무작위 제작 오브 2개를 얻습니다.', requires: { tidelordKoi: 1, abyssAngler: 2, shallowSilverfin: 4 }, effect: { type: 'randomCurrency', amount: 2 } },
    { id: 'leviathanCache', desc: '【재화 획득: 무작위 제작 오브 ×3】 리바이어던 본체와 무지갯빛 공포의 잔재로 채워진 최상급 보물함에서 무작위 제작 오브 3개를 얻습니다.', requires: { kingLeviathan: 1, prismaticHorror: 1, abyssAngler: 2 }, effect: { type: 'randomCurrency', amount: 3 } },
    // --- 장비 옵션 가공 효과 (제련/옵션 조작 계열) ---
    { id: 'safeReroll', desc: '【장비 강화: 하락 없는 안전 재굴림】 발광 송어와 은빛 비늘치로 옵션 1줄을 다시 굴립니다. 결과가 기존보다 낮으면 적용되지 않고 원래 값이 유지됩니다.', requires: { glowfinTrout: 3, shallowSilverfin: 4 }, effect: { type: 'safeReroll' } },
    { id: 'twinCurrentReroll', desc: '【장비 강화: 무작위 옵션 2줄만 재굴림】 심연 등불고기와 조류 장어로 무작위로 고른 옵션 두 줄만 다시 굴립니다(나머지 줄은 보존, 카오스 오브와 달리 전체 재굴림이 아닙니다).', requires: { abyssAngler: 3, tidalEel: 4 }, effect: { type: 'twinReroll' } },
    { id: 'tierStepUp', desc: '【장비 강화: 옵션 1줄 등급 +1 영구 재굴림】 심연 등불고기와 발광 송어로 무작위 옵션 1줄을 한 단계 높은 등급으로 다시 굴립니다(영구 적용).', requires: { abyssAngler: 3, glowfinTrout: 3 }, effect: { type: 'tierStepUp' } },
    { id: 'categoryShift', desc: '【장비 강화: 무작위 옵션 1줄을 원하는 계열로 변환】 발광 송어와 조류 장어로 무작위 옵션 한 줄을 선택한 계열의 옵션으로 바꿉니다.', requires: { glowfinTrout: 3, tidalEel: 3 }, effect: { type: 'convertCategoryMod' } },
    { id: 'echoMod', desc: '【장비 강화: 최고 티어 옵션을 50% 효과로 메아리】 전설의 새끼 괴어와 심연 등불고기로 가장 높은 티어의 옵션 중 한 줄을 무작위로 골라, 나머지 옵션 중 무작위 한 줄을 그 옵션의 50% 효과로 덮어씁니다.', requires: { voidLeviathanSpawn: 1, abyssAngler: 3 }, effect: { type: 'echoMod' } },
    // --- 초강력 레시피 (초희귀 어종 필요) ---
    { id: 'sealOffering', desc: '【장비 강화: 옵션 1줄 영구 봉인】 해류군주 비단잉어와 발광 송어로 옵션 한 줄을 영구히 봉인합니다.', requires: { tidelordKoi: 1, glowfinTrout: 3 }, effect: { type: 'lockMod', count: 1 } },
    { id: 'leviathanBoon', desc: '【장비 강화: 최상급 태그 옵션 확정(등급 +2)】 전설의 새끼 괴어와 심연 등불고기, 조류 장어로 최상급 태그 옵션을 확정 부여합니다.', requires: { voidLeviathanSpawn: 2, abyssAngler: 2, tidalEel: 3 }, effect: { type: 'guaranteedTaggedMod', tierBoost: 2 } },
    { id: 'tidelordRefine', desc: '【장비 강화: 계열 재굴림(등급 +1)】 해류군주 비단잉어와 발광 송어로 원하는 계열의 기존 옵션만 다시 굴립니다(다른 줄 보존).', requires: { tidelordKoi: 2, glowfinTrout: 3 }, effect: { type: 'taggedReroll', tierBoost: 1 } },
    { id: 'crushDepthScar', desc: '【장비 강화: 심해 전용 고정 옵션 부착】 무지갯빛 공포와 해류군주 비단잉어, 심연 등불고기로 심해 전용 고정 옵션을 부착합니다.', requires: { prismaticHorror: 2, tidelordKoi: 1, abyssAngler: 2 }, effect: { type: 'fixedBenchOption' } },
    { id: 'doubleSealForge', desc: '【장비 강화: 옵션 2줄 동시 영구 봉인 + 나머지 1줄 즉시 재단】 무지갯빛 공포와 발광 송어로 옵션 두 줄을 동시에 봉인하고, 남은 줄은 즉시 재단합니다.', requires: { prismaticHorror: 3, glowfinTrout: 4 }, effect: { type: 'lockMod', count: 2, bonusTaggedReroll: true } },
    { id: 'voidPureRefine', desc: '【장비 강화: 강제 희귀 등급 승급】 무지갯빛 공포와 공허 리바이어던 새끼, 은빛 비늘치로 장비를 강제로 희귀 등급으로 승급시킵니다.', requires: { prismaticHorror: 2, voidLeviathanSpawn: 1, shallowSilverfin: 5 }, effect: { type: 'upgradeRarity', force: true } },
    { id: 'leviathanRemnant', desc: '【장비 강화: 최상급 태그 옵션 확정(등급 +3) + 나쁜 옵션 1줄 무료 제거】 리바이어던 본체와 심연 등불고기로 최상급 태그 옵션을 확정 부여하며, 동시에 나쁜 줄 하나를 무료로 제거합니다.', requires: { kingLeviathan: 1, abyssAngler: 3 }, effect: { type: 'guaranteedTaggedMod', tierBoost: 3, bonusRemoveMod: true } },
    { id: 'leviathanSigil', desc: '【장비 강화: 이 레시피 전용 최상위 고정 옵션 부착】 리바이어던 본체와 해류군주 비단잉어, 공허 리바이어던 새끼로 오직 이 레시피로만 얻는 최상위 고정 옵션을 부착합니다.', requires: { kingLeviathan: 2, tidelordKoi: 2, voidLeviathanSpawn: 1 }, effect: { type: 'fixedBenchOption', topTier: true } }
];
const SEA_GIFT_ITEM_EFFECT_TYPES = new Set(['guaranteedMod', 'guaranteedTaggedMod', 'removeMod', 'upgradeRarity', 'lockMod', 'taggedReroll', 'fixedBenchOption', 'safeReroll', 'twinReroll', 'tierStepUp', 'convertCategoryMod', 'echoMod']);

function getSeaGiftRecipeStatus(recipeId) {
    let recipe = SEA_GIFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;
    let st = ensureOceanState();
    let ready = Object.keys(recipe.requires).every(key => (st.fishStock[key] || 0) >= recipe.requires[key]);
    return { recipe, ready, owned: st.fishStock };
}

function removeOneModFromItem(item) {
    if (!item || !Array.isArray(item.stats)) return false;
    let idx = item.stats.findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    if (idx < 0) return false;
    item.stats.splice(idx, 1);
    return true;
}

function craftSeaGift(recipeId, targetItem, options) {
    let recipe = SEA_GIFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return false;
    let st = ensureOceanState();
    let ready = Object.keys(recipe.requires).every(key => (st.fishStock[key] || 0) >= recipe.requires[key]);
    if (!ready) { addLog('바다의 선물 재료가 부족합니다.', 'attack-monster'); return false; }
    let effect = recipe.effect;
    let needsItem = SEA_GIFT_ITEM_EFFECT_TYPES.has(effect.type);
    let item = needsItem ? (targetItem || (typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null) || (game.equipment && game.equipment['무기'])) : null;
    if (needsItem && !item) { addLog('대상 장비가 없습니다.', 'attack-monster'); return false; }
    let category = options && options.category;
    if (effect.type === 'guaranteedMod' || effect.type === 'guaranteedTaggedMod') {
        let pool = getAvailableMods(item);
        if (effect.type === 'guaranteedTaggedMod' && category) pool = pool.filter(mod => getModCategory(mod) === category);
        let mod = pickWeightedMod(pool);
        if (!mod) { addLog('이 장비에 추가로 부여할 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
        let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1)) + Math.max(0, Math.floor(effect.tierBoost || 0));
        let idx = (item.stats || []).findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
        let rolled = rollAffixValue(mod, maxTier);
        if (idx < 0) item.stats.push(rolled); else item.stats[idx] = rolled;
        if (effect.bonusRemoveMod) removeOneModFromItem(item);
        updateItemName(item);
    } else if (effect.type === 'removeMod') {
        if (!removeOneModFromItem(item)) { addLog('제거할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        updateItemName(item);
    } else if (effect.type === 'upgradeRarity') {
        if (item.rarity === 'normal') item.rarity = 'magic';
        else if (item.rarity === 'magic' || effect.force) item.rarity = 'rare';
        updateItemName(item);
    } else if (effect.type === 'lockMod') {
        let editable = (item.stats || []).filter(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
        let count = Math.max(1, Math.floor(effect.count || 1));
        for (let i = 0; i < count && i < editable.length; i++) editable[i].lockedByHoney = true;
        if (effect.bonusTaggedReroll) {
            let pool = getAvailableMods(item).filter(mod => !category || getModCategory(mod) === category);
            let idx = (item.stats || []).findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
            if (idx >= 0) {
                let mods = pickRandomMods(pool, 1);
                if (mods && mods[0]) item.stats[idx] = rollAffixValue(mods[0], getItemCraftTier(item));
            }
        }
    } else if (effect.type === 'taggedReroll') {
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift && (!category || getModCategory(s) === category)) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length === 0) { addLog('해당 계열의 재굴림 가능한 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1)) + Math.max(0, Math.floor(effect.tierBoost || 0));
        editableIdx.forEach(idx => {
            let mods = pickRandomMods(getAvailableMods(item), 1);
            if (mods && mods[0]) item.stats[idx] = rollAffixValue(mods[0], maxTier);
        });
        updateItemName(item);
    } else if (effect.type === 'fixedBenchOption') {
        let option = getOceanWorkbenchOption(options && options.optionId, !!effect.topTier);
        if (!option) { addLog('적용할 수 있는 고정 옵션이 없습니다.', 'attack-monster'); return false; }
        let minInt = Math.floor(option.min);
        let maxInt = Math.floor(option.max);
        let val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
        let rolled = { id: option.statId, val: val, valMin: minInt, valMax: maxInt, tier: 5, statName: getStatName(option.statId), oceanBenchOptionId: option.id };
        let idx = (item.stats || []).findIndex(stat => stat && (stat.oceanBenchOptionId === option.id));
        if (idx < 0) idx = (item.stats || []).findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
        if (idx < 0) item.stats.push(rolled); else item.stats[idx] = rolled;
        updateItemName(item);
    } else if (effect.type === 'currency') {
        awardCurrency(effect.key, effect.amount || 1);
    } else if (effect.type === 'randomCurrency') {
        let count = Math.max(1, Math.floor(effect.amount || 1));
        for (let i = 0; i < count; i++) {
            let key = SEA_GIFT_RANDOM_ORB_KEYS[Math.floor(Math.random() * SEA_GIFT_RANDOM_ORB_KEYS.length)];
            awardCurrency(key, 1);
            addLog(`🎲 무작위 제작 오브: ${(ORB_DB[key] || {}).name || key} +1`, 'loot-rare');
        }
    } else if (effect.type === 'safeReroll') {
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let idx = editableIdx[Math.floor(Math.random() * editableIdx.length)];
        let before = item.stats[idx];
        let mods = pickRandomMods(getAvailableMods(item), 1);
        if (mods && mods[0]) {
            let rolled = rollAffixValue(mods[0], getItemCraftTier(item));
            if ((Number(rolled.val) || 0) >= (Number(before.val) || 0)) item.stats[idx] = rolled;
            else addLog('🌊 재굴림 결과가 기존보다 낮아 적용을 취소했습니다.', 'loot-magic');
        }
        updateItemName(item);
    } else if (effect.type === 'twinReroll') {
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1));
        let shuffled = editableIdx.slice().sort(() => Math.random() - 0.5).slice(0, 2);
        shuffled.forEach(idx => {
            let mods = pickRandomMods(getAvailableMods(item), 1);
            if (mods && mods[0]) item.stats[idx] = rollAffixValue(mods[0], maxTier);
        });
        updateItemName(item);
    } else if (effect.type === 'tierStepUp') {
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length === 0) { addLog('등급을 올릴 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let idx = editableIdx[Math.floor(Math.random() * editableIdx.length)];
        let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1)) + 1;
        let mods = pickRandomMods(getAvailableMods(item), 1);
        if (mods && mods[0]) item.stats[idx] = rollAffixValue(mods[0], maxTier);
        updateItemName(item);
    } else if (effect.type === 'echoMod') {
        if ((item.stats || []).some(s => s && s.isEchoMod)) { addLog('이미 메아리 옵션을 가진 장비에는 다시 사용할 수 없습니다.', 'attack-monster'); return false; }
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length < 2) { addLog('메아리에는 봉인되지 않은 옵션이 2줄 이상 필요합니다.', 'attack-monster'); return false; }
        let maxTier = editableIdx.reduce((m, i) => Math.max(m, Number(item.stats[i].tier) || 0), 0);
        let topIdx = editableIdx.filter(i => (Number(item.stats[i].tier) || 0) === maxTier);
        let srcIdx = topIdx[Math.floor(Math.random() * topIdx.length)];
        let targetPool = editableIdx.filter(i => i !== srcIdx);
        let dstIdx = targetPool[Math.floor(Math.random() * targetPool.length)];
        let src = item.stats[srcIdx];
        let echo = JSON.parse(JSON.stringify(src));
        echo.val = Math.floor((Number(src.val) || 0) * 0.5);
        if (Number.isFinite(echo.valMin)) echo.valMin = Math.floor(echo.valMin * 0.5);
        if (Number.isFinite(echo.valMax)) echo.valMax = Math.floor(echo.valMax * 0.5);
        echo.echoOf = src.statName || getStatName(src.id);
        echo.isEchoMod = true;
        item.stats[dstIdx] = echo;
        addLog(`🔊 ${echo.echoOf} 옵션이 50% 효과로 메아리쳤습니다.`, 'loot-rare');
        updateItemName(item);
    } else if (effect.type === 'convertCategoryMod') {
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length === 0) { addLog('변환할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let pool = getAvailableMods(item).filter(mod => !category || getModCategory(mod) === category);
        let mod = pickWeightedMod(pool);
        if (!mod) { addLog('해당 계열로 변환할 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
        let idx = editableIdx[Math.floor(Math.random() * editableIdx.length)];
        item.stats[idx] = rollAffixValue(mod, getItemCraftTier(item));
        updateItemName(item);
    }
    Object.keys(recipe.requires).forEach(key => { st.fishStock[key] = Math.max(0, Math.floor(st.fishStock[key] || 0) - recipe.requires[key]); });
    addLog(`🎁 [바다의 선물] 제작이 완료되었습니다.`, 'loot-rare');
    if (item && typeof normalizeItem === 'function') normalizeItem(item);
    return true;
}

function rerollSingleBaseOption(item, costCurrency, costAmount) {
    if (!item || !Array.isArray(item.stats) || item.stats.length === 0) return false;
    let key = costCurrency || 'oceanRerollShard';
    let cost = Math.max(0, Math.floor(costAmount || 1));
    if ((game.currencies[key] || 0) < cost) { addLog('재화가 부족합니다.', 'attack-monster'); return false; }
    let editableIdx = item.stats.map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
    if (editableIdx.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
    let mods = pickRandomMods(getAvailableMods(item), 1);
    if (!mods || mods.length === 0) { addLog('이 장비에서 새로 굴릴 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
    let idx = editableIdx[Math.floor(Math.random() * editableIdx.length)];
    let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1));
    game.currencies[key] = (game.currencies[key] || 0) - cost;
    item.stats[idx] = rollAffixValue(mods[0], maxTier, { roundInteger: true });
    updateItemName(item);
    addLog(`🌊 ${item.name || '장비'}의 베이스 옵션 한 줄을 다시 굴렸습니다.`, 'loot-rare');
    return true;
}

function grantMeteorEncounterRewards() {
    let st = ensureStarWedgeState();
    let astroLv = getAstronomerLevelForUnlocks();
    let shard = 17 + Math.floor(Math.random() * 40);
    if (astroLv >= 6) shard += 6 + Math.floor(Math.random() * 9);
    if (astroLv >= 13) shard += 8;
    awardCurrency('meteorShard', shard);
    if (astroLv >= 2) awardCurrency('starDust', 2 + Math.floor(Math.random() * (astroLv >= 15 ? 4 : 2)));
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('astronomer', 'meteor_clear');
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
        let starDropBonus = typeof getExpertNodeEffectValue === 'function' ? Math.max(0, getExpertNodeEffectValue('starWedgeDropPct') || 0) / 100 : 0;
        if (astroLv >= 4 && Math.random() < 0.0187 * (1 + starDropBonus)) {
            let uniqueChance = Math.min(0.35, Math.max(0, (game.currencies.astralCore || 0) * 0.02));
    if ((game.currencies.astralCore || 0) > 0) game.currencies.astralCore--;
    let wedge = Math.random() < uniqueChance ? createUniqueStarWedgeItem() : createStarWedgeItem();
            st.wedges.push(wedge);
            awardCurrency('starWedge', 1);
            addLog('☄️ 완성된 별쐐기가 떨어졌다!', 'loot-unique');
        }
        if ((st.skyRiftAllCosmos || false) && astroLv >= 10 && Math.random() < 0.06) {
            awardCurrency('astralCore', 1);
            addLog('🌌 우주 공명으로 성핵 조각을 얻었습니다. [Astral Core +1]', 'loot-unique');
        }
    }
    if (astroLv >= 14 && Math.random() < 0.35) {
        let linked = rndChoice(['pollen', 'jewelShard', 'sporeFire', 'sporeCold', 'sporeLight']);
        awardCurrency(linked, linked === 'pollen' ? 30 : 3);
        addLog(`☄️ 전문가 연동 보상: ${ORB_DB[linked] ? ORB_DB[linked].name : linked} +${linked === 'pollen' ? 30 : 3}`, 'loot-magic');
    }
    grantConstellationObservationReward();
}

function craftIncompleteStarWedge() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let starDustDiscount = Math.min(9, Math.floor((game.currencies.starDust || 0) / 5));
    let needShard = Math.max(40, 49 - starDustDiscount);
    if ((game.currencies.meteorShard || 0) < needShard) return addLog(`운석 파편이 부족합니다. (필요: ${needShard})`, 'attack-monster');
    game.currencies.meteorShard -= needShard;
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('astronomer', 'starwedge_craft');
    awardCurrency('incompleteStarWedge', 1);
    addLog('🔧 운석 파편을 응축해 불완전한 별쐐기를 만들었습니다.', 'loot-magic');
    updateStaticUI();
}

function craftCompleteStarWedge() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let st = ensureStarWedgeState();
    if ((game.currencies.incompleteStarWedge || 0) < 1) return addLog('불완전한 별쐐기가 필요합니다.', 'attack-monster');
    if ((game.currencies.meteorShard || 0) < 77) return addLog('운석 파편이 부족합니다. (필요: 77)', 'attack-monster');
    game.currencies.incompleteStarWedge--;
    game.currencies.meteorShard -= 77; if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('astronomer', 'starwedge_craft');
    let uniqueChance = Math.min(0.35, Math.max(0, (game.currencies.astralCore || 0) * 0.02));
    if ((game.currencies.astralCore || 0) > 0) game.currencies.astralCore--;
    let wedge = Math.random() < uniqueChance ? createUniqueStarWedgeItem() : createStarWedgeItem();
    st.wedges.push(wedge);
    awardCurrency('starWedge', 1);
    addLog(wedge.unique ? `🌌 고유 별쐐기 완성! [${wedge.uniqueType}]` : '🔧 별쐐기를 완성했습니다.', 'loot-unique');
    updateStaticUI();
}

function rerollStarWedge(wedgeId, keepIndex) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let astroLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    if (astroLv < 5) return addLog('별쐐기 리롤은 천문학자 Lv.5에 해금됩니다.', 'attack-monster');
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return;
    let keepIndexes = [];
    let meteorCost = 23;
    let rerollDiscount = typeof getExpertCombinedCostReduction === 'function' ? getExpertCombinedCostReduction('starWedgeRerollCostReducePct') : 0;
    if (keepIndex === 'single' || keepIndex === 1) keepIndexes = [0];
    if (keepIndex === 'double' || keepIndex === 2) {
        keepIndexes = [0, 1];
        meteorCost = 230;
    }
    meteorCost = Math.max(1, Math.floor(meteorCost * (1 - rerollDiscount)));
    if ((game.currencies.meteorShard || 0) < meteorCost) return addLog(`운석 파편이 부족합니다. (필요: ${meteorCost})`, 'attack-monster');
    if (keepIndexes.length > 0 && (game.currencies.incompleteStarWedge || 0) <= 0) return addLog('옵션 고정 리롤에는 불완전한 별쐐기가 필요합니다.', 'attack-monster');
    game.currencies.meteorShard -= meteorCost; if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('astronomer', 'starwedge_reroll');
    if (keepIndexes.length > 0) game.currencies.incompleteStarWedge--;
    wedge.lines = wedge.lines.map((line, idx) => keepIndexes.includes(idx) ? line : createRandomStarWedgeLine(idx === 3 ? STAR_WEDGE_CORE_OPTION_POOL : STAR_WEDGE_OPTION_POOL));
    addLog('☄️ 나무의 결이 끊어지고, 새로운 효과가 혼돈 속에서 벼려졌다.', 'loot-unique');
    if (!((game.journalEntries || []).includes('star_wedge'))) unlockJournalEntry('star_wedge');
    recalculateStarWedgeMutations();
    updateStaticUI();
}


function stabilizeStarWedge(wedgeId) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let astroLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('astronomer') || 1)) : 1;
    if (astroLv < 12) return addLog('영원 별쐐기는 천문학자 Lv.12에 해금됩니다.', 'attack-monster');
    let st = ensureStarWedgeState();
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return;
    if (wedge.eternal) return addLog('이미 영원 고정된 별쐐기입니다.', 'attack-monster');
    let cost = 25;
    if ((game.currencies.starDust || 0) < cost) return addLog(`별가루가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.currencies.starDust -= cost;
    wedge.eternal = true;
    addLog(`🌌 별쐐기 #${wedge.id % 10000} 영원 고정 완료`, 'loot-unique');
    updateStaticUI();
}

function destroyStarWedge(wedgeId) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let st = ensureStarWedgeState();
    let target = getStarWedgeById(wedgeId);
    if (!target) return addLog('파괴할 별쐐기를 찾을 수 없습니다.', 'attack-monster');
    if (target.eternal) return addLog('영원 고정된 별쐐기는 파괴할 수 없습니다.', 'attack-monster');
    if (!confirm(`별쐐기 #${wedgeId % 10000} 를 파괴할까요?`)) return;
    st.wedges = (st.wedges || []).filter(w => w.id !== wedgeId);
    st.sockets = (st.sockets || []).filter(entry => entry.wedgeId !== wedgeId);
    if (st.selectedWedgeId === wedgeId) st.selectedWedgeId = null;
    game.currencies.starWedge = Math.max(0, (game.currencies.starWedge || 0) - 1);
    recalculateStarWedgeMutations();
    addLog('💥 별쐐기를 파괴했습니다.', 'attack-monster');
    updateStaticUI();
}

function socketStarWedgeOnNode(nodeId, wedgeId) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let st = ensureStarWedgeState();
    let lookupId = nodeId;
    let node = PASSIVE_TREE.nodes[lookupId];
    if (!node && lookupId != null) {
        let key = String(lookupId);
        lookupId = Object.keys(PASSIVE_TREE.nodes || {}).find(id => String(id) === key) || lookupId;
        node = PASSIVE_TREE.nodes[lookupId];
    }
    if (!node || node.socketType !== 'star_wedge') return addLog('별쐐기 슬롯에만 장착할 수 있습니다.', 'attack-monster');
    let wedge = getStarWedgeById(wedgeId);
    if (!wedge) return addLog('장착할 별쐐기를 찾을 수 없습니다.', 'attack-monster');
    let maxEquipped = getMaxEquippedStarWedges();
    let nodeKey = String(lookupId);
    let remainingSockets = (st.sockets || []).filter(v => String(v.nodeId) !== nodeKey && v.wedgeId !== wedgeId);
    if (remainingSockets.length >= maxEquipped) return addLog(`별쐐기는 현재 최대 ${maxEquipped}개까지 장착할 수 있습니다. (천문학자 레벨 상승 시 최대 ${MAX_STAR_WEDGES_HARD_CAP}개)`, 'attack-monster');
    st.sockets = remainingSockets;
    st.sockets.push({ nodeId: String(lookupId), wedgeId: wedgeId });
    recalculateStarWedgeMutations();
    addLog('☄️ 나무의 결이 끊어지고, 새로운 효과가 혼돈 속에서 벼려졌다.', 'loot-unique');
    if (!((game.journalEntries || []).includes('star_wedge'))) unlockJournalEntry('star_wedge');
    updateStaticUI();
}

function unsocketStarWedge(nodeId) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let st = ensureStarWedgeState();
    let before = (st.sockets || []).length;
    let targetNodeId = String(nodeId);
    st.sockets = (st.sockets || []).filter(v => String(v.nodeId) !== targetNodeId);
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
    let allNodes = Object.values(PASSIVE_TREE.nodes).filter(node => isPassiveNodeAvailable(node));
    if ((game.passives || []).includes('n0')) {
        getPassiveLinkedNodeIds('n0', PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH).forEach(id => discoveredPassiveNodes.add(id));
    }
    previewPassiveNodes = new Set(discoveredPassiveNodes);
    let previewSeeds = Array.from(new Set((game.passives || []).filter(id => isPassiveNodeAvailable(id))));
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
    if (nodeId === 'n0') {
        getPassiveLinkedNodeIds(nodeId, edgeDepth).forEach(id => discoverIds.add(id));
        Object.values(PASSIVE_TREE.nodes).forEach(node => {
            if (!isPassiveNodeAvailable(node)) return;
            if (node.kind === 'core' && node.layoutDepth === 1) discoverIds.add(node.id);
        });
    } else {
        getPassiveLinkedNodeIds(nodeId, edgeDepth).forEach(id => discoverIds.add(id));
        Object.values(PASSIVE_TREE.nodes).forEach(node => {
            if (!isPassiveNodeAvailable(node)) return;
            if (isPassiveLocalReveal(origin, node, radius, 2)) discoverIds.add(node.id);
        });
    }
    discoverIds.forEach(id => {
        if (!(game.discoveredPassives || []).includes(id)) {
            game.discoveredPassives.push(id);
            newlyDiscovered.push(id);
        }
    });
    if (!options.noBurst && (newlyDiscovered.length > 0 || options.forcePulse)) {
        let burst = {
            originId: nodeId,
            nodeIds: newlyDiscovered,
            x: origin.x,
            y: origin.y,
            radius: radius,
            startTime: performance.now(),
            duration: 900
        };
        passiveRevealBursts.push(burst);
        if (typeof spawnPassiveRevealBurstOverlay === 'function') spawnPassiveRevealBurstOverlay(burst);
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
        guardian: { stat: 'armorPct', val: 28 },
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
        tree.n5 = { stat: 'critDmg', val: scaleClassStat('critDmg', getMajorStatBase('critDmg'), 1.15), req: ['n2', 'n3'] };
        tree.n8 = { stat: 'physIgnore', val: scaleClassStat('physIgnore', getMajorStatBase('physIgnore'), 1.25), req: 'n5' };
        tree.n10 = { stat: 'physIgnore', val: 16, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'assassin') {
        tree.n6 = { stat: 'physIgnore', val: scaleClassStat('physIgnore', getMajorStatBase('physIgnore'), 1.15), req: 'n3' };
    } else if (clsKey === 'elementalist') {
        tree.n6 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.2), req: 'n3' };
        tree.n10 = { stat: 'resPen', val: 16, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'warlock') {
        // 워록의 지속 피해 배율(%) 노드(n2 진입 · n5 주요)에는 동일 수치의 주문 내장 피해 증가(%)를 함께 부여한다.
        tree.n2 = { stats: [{ stat: 'dotPctDmg', val: entry2 }, { stat: 'spellFlatPct', val: entry2 }], req: 'n1' };
        tree.n5 = { stats: [{ stat: 'dotPctDmg', val: major2 }, { stat: 'spellFlatPct', val: major2 }], req: ['n2', 'n3'] };
        tree.n8 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.15), req: 'n5' };
    } else if (clsKey === 'guardian') {
        tree.n5 = { stat: 'armorPct', val: scaleClassStat('armorPct', getMajorStatBase('armorPct'), 1.6), req: ['n2', 'n3'] };
        tree.n6 = { stat: 'resAll', val: scaleClassStat('resAll', getMajorStatBase('resAll'), 1.5), req: 'n3' };
        tree.n8 = { stat: 'regen', val: scaleClassStat('regen', getMajorStatBase('regen'), 1.8), req: 'n5' };
        tree.n10 = { stat: 'dr', val: 14, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'inquisitor') {
        tree.n9 = { stat: 'resPen', val: scaleClassStat('resPen', getMajorStatBase('resPen'), 1.3), req: 'n6' };
        tree.n10 = { stat: 'resPen', val: 18, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'soulbinder') {
        tree.n1 = { stat: 'summonPctDmg', val: scaleClassStat('summonPctDmg', getEntryStatBase('summonPctDmg'), 1.5), req: null };
        tree.n2 = { stat: 'summonHpPct', val: scaleClassStat('summonHpPct', getEntryStatBase('summonHpPct'), 1.5), req: 'n1' };
        tree.n3 = { stat: 'summonAspd', val: scaleClassStat('summonAspd', getEntryStatBase('summonAspd'), 1.5), req: 'n1' };
        tree.n4 = { stat: 'summonPctDmg', val: scaleClassStat('summonPctDmg', getMajorStatBase('summonPctDmg'), 1.5), req: 'n2' };
        tree.n5 = { stat: 'summonHpPct', val: scaleClassStat('summonHpPct', getMajorStatBase('summonHpPct'), 1.5), req: ['n2', 'n3'] };
        tree.n6 = { stat: 'summonAspd', val: scaleClassStat('summonAspd', getMajorStatBase('summonAspd'), 1.5), req: 'n3' };
        tree.n7 = { stat: 'summonPctDmg', val: scaleClassStat('summonPctDmg', getMajorStatBase('summonPctDmg'), 2.2), req: 'n4' };
        tree.n8 = { stat: 'summonHpPct', val: scaleClassStat('summonHpPct', getMajorStatBase('summonHpPct'), 2.2), req: 'n5' };
        tree.n9 = { stat: 'summonAspd', val: scaleClassStat('summonAspd', getMajorStatBase('summonAspd'), 2.2), req: 'n6' };
        tree.n10 = { stat: 'summonPctDmg', val: 100, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'catalyst') {
        tree.n1 = { stat: 'dotPctDmg', val: scaleClassStat('dotPctDmg', getEntryStatBase('dotPctDmg'), 1.5), req: null };
        tree.n2 = { stat: 'igniteDamageMultiplierPct', val: scaleClassStat('igniteDamageMultiplierPct', getEntryStatBase('igniteDamageMultiplierPct'), 1.5), req: 'n1' };
        tree.n3 = { stat: 'poisonDamageMultiplierPct', val: scaleClassStat('poisonDamageMultiplierPct', getEntryStatBase('poisonDamageMultiplierPct'), 1.5), req: 'n1' };
        tree.n4 = { stat: 'igniteDamageMultiplierPct', val: scaleClassStat('igniteDamageMultiplierPct', getMajorStatBase('igniteDamageMultiplierPct'), 1.5), req: 'n2' };
        tree.n5 = { stat: 'dotPctDmg', val: scaleClassStat('dotPctDmg', getMajorStatBase('dotPctDmg'), 1.5), req: ['n2', 'n3'] };
        tree.n6 = { stat: 'poisonDamageMultiplierPct', val: scaleClassStat('poisonDamageMultiplierPct', getMajorStatBase('poisonDamageMultiplierPct'), 1.5), req: 'n3' };
        tree.n7 = { stat: 'igniteDamageMultiplierPct', val: scaleClassStat('igniteDamageMultiplierPct', getMajorStatBase('igniteDamageMultiplierPct'), 2.2), req: 'n4' };
        tree.n8 = { stat: 'dotPctDmg', val: scaleClassStat('dotPctDmg', getMajorStatBase('dotPctDmg'), 2.2), req: 'n5' };
        tree.n9 = { stat: 'poisonDamageMultiplierPct', val: scaleClassStat('poisonDamageMultiplierPct', getMajorStatBase('poisonDamageMultiplierPct'), 2.2), req: 'n6' };
        tree.n10 = { stat: 'dotPctDmg', val: 100, req: ['n7', 'n8', 'n9'] };
    } else if (clsKey === 'crusader') {
        tree.n1 = { stats: [
            { stat: 'physPctDmg', val: scaleClassStat('physPctDmg', getEntryStatBase('physPctDmg'), 1.5) },
            { stat: 'lightPctDmg', val: scaleClassStat('lightPctDmg', getEntryStatBase('lightPctDmg'), 1.5) }
        ], req: null };
        tree.n2 = { stat: 'armorPct', val: scaleClassStat('armorPct', getEntryStatBase('armorPct'), 1.5), req: 'n1' };
        tree.n3 = { stat: 'resAll', val: scaleClassStat('resAll', getEntryStatBase('resAll'), 1.5), req: 'n1' };
        tree.n4 = { stats: [
            { stat: 'physPctDmg', val: scaleClassStat('physPctDmg', getMajorStatBase('physPctDmg'), 1.5) },
            { stat: 'lightPctDmg', val: scaleClassStat('lightPctDmg', getMajorStatBase('lightPctDmg'), 1.5) }
        ], req: 'n2' };
        tree.n5 = { stat: 'energyShieldPct', val: scaleClassStat('energyShieldPct', getMajorStatBase('energyShieldPct'), 1.5), req: ['n2', 'n3'] };
        tree.n6 = { stat: 'dr', val: scaleClassStat('dr', getMajorStatBase('dr'), 1.5), req: 'n3' };
        tree.n7 = { stats: [
            { stat: 'physPctDmg', val: scaleClassStat('physPctDmg', getMajorStatBase('physPctDmg'), 2.2) },
            { stat: 'lightPctDmg', val: scaleClassStat('lightPctDmg', getMajorStatBase('lightPctDmg'), 2.2) }
        ], req: 'n4' };
        tree.n8 = { stat: 'armorPct', val: scaleClassStat('armorPct', getMajorStatBase('armorPct'), 2.2), req: 'n5' };
        tree.n9 = { stat: 'resAll', val: scaleClassStat('resAll', getMajorStatBase('resAll'), 2.2), req: 'n6' };
    }
    if ((game.completedTrials || []).includes('trial_4')) {
        const coreByClass = {
            warrior: [{ stat: 'physPctDmg', val: 52 }, { stat: 'critDmg', val: 62 }],
            gladiator: [{ stat: 'aspd', val: 22 }, { stat: 'ds', val: 26 }],
            assassin: [{ stat: 'critDmg', val: 80 }, { stat: 'crit', val: 18 }],
            ranger: [{ stat: 'projectilePctDmg', val: 50 }, { stat: 'move', val: 20 }],
            elementalist: [{ stat: 'elementalPctDmg', val: 52 }, { stat: 'resPen', val: 16 }],
            warlock: [{ stat: 'chaosPctDmg', val: 42 }, { stat: 'dotPctDmg', val: 28 }],
            guardian: [{ stat: 'armorPct', val: 24 }, { stat: 'regen', val: 2.4 }],
            inquisitor: [{ stat: 'suppCap', val: 1 }, { stat: 'gemLevel', val: 2 }]
        };
        let cores = coreByClass[clsKey] || [{ stat: 'pctDmg', val: 55 }, { stat: 'critDmg', val: 45 }];
        tree.n11 = { stat: cores[0].stat, val: cores[0].val, req: 'n10', exclusive: 'n12' };
        tree.n12 = { stat: cores[1].stat, val: cores[1].val, req: 'n10', exclusive: 'n11' };
    }
    // 5차 재능 개화 노드: 이번 루프에 해당 직업으로 재능 개화에 성공하면 열린다(영구 아님, 루프마다 초기화).
    // 4차 핵심을 모두 찍으면 진입 가능. 재능특화 2개(n13a/n13b) 중 1개, 전직특화 2개(n13c/n13d) 중 1개를 선택.
    if (game.bloomedClassThisLoop === clsKey) {
        const jobByClass = {
            warrior: [{ stat: 'aspd', val: 16 }, { stat: 'dr', val: 12 }],
            gladiator: [{ stat: 'critDmg', val: 55 }, { stat: 'evasionPct', val: 18 }],
            assassin: [{ stat: 'move', val: 18 }, { stat: 'evasionPct', val: 20 }],
            ranger: [{ stat: 'aspd', val: 18 }, { stat: 'critDmg', val: 55 }],
            elementalist: [{ stat: 'resPen', val: 14 }, { stat: 'critDmg', val: 50 }],
            warlock: [{ stat: 'resPen', val: 14 }, { stat: 'pctHp', val: 22 }],
            guardian: [{ stat: 'resAll', val: 14 }, { stat: 'regen', val: 2.0 }],
            inquisitor: [{ stat: 'resPen', val: 14 }, { stat: 'critDmg', val: 55 }],
            soulbinder: [{ stat: 'summonPctDmg', val: 55 }, { stat: 'summonHpPct', val: 30 }],
            catalyst: [{ stat: 'dotPctDmg', val: 55 }, { stat: 'igniteDamageMultiplierPct', val: 35 }],
            hunter: [{ stat: 'projectilePctDmg', val: 55 }, { stat: 'aspd', val: 16 }],
            crusader: [{ stat: 'lightPctDmg', val: 50 }, { stat: 'armorPct', val: 20 }]
        };
        let jobs = jobByClass[clsKey] || [{ stat: 'pctDmg', val: 40 }, { stat: 'pctHp', val: 20 }];
        tree.n13a = { stat: 'pctDmg', val: 35, req: ['n11', 'n12'], exclusive: 'n13b' };
        tree.n13b = { stat: 'pctHp', val: 35, req: ['n11', 'n12'], exclusive: 'n13a' };
        tree.n13c = { stat: jobs[0].stat, val: jobs[0].val, req: ['n11', 'n12'], exclusive: 'n13d' };
        tree.n13d = { stat: jobs[1].stat, val: jobs[1].val, req: ['n11', 'n12'], exclusive: 'n13c' };
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
let selectedJewelCraftIndex = null;
let voidJewelOverlayState = { mode: null, selected: [] };
let pendingRingEquipItemId = null;
let pendingGloveEquipItemId = null;
let pendingWeaponEquipItemId = null;
let deathOverlayActive = false;
let battleAssets = {
    loading: false,
    ready: false,
    failed: false,
    failedKeys: [],
    loadTicket: 0,
    loadPromise: null,
    images: {},
    backdrops: {},
    atlas: null
};
const ENABLE_BATTLE_SHEET_SANITIZATION = true;
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
    'tab-jewel': 'jewel',
    'tab-skills': 'skills',
    'tab-codex': 'codex',
    'tab-talisman': 'talisman',
    'tab-cube': 'cube',
    'tab-map': 'map',
    'tab-traits': 'traits',
    'tab-talent': 'talent',
    'tab-expertise': 'expertise'
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
    battleBtn.style.display = isMobileBattle ? 'flex' : 'none';
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
    let defaultZoom = Math.min(width, height) / 780;
    camZoom = clampNumber(defaultZoom, 0.42, 0.72);
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
const DAMAGE_NUMBER_FORMATS = ['comma', 'korean', 'korean_short', 'english'];

function normalizeDamageNumberFormat(format) {
    return DAMAGE_NUMBER_FORMATS.includes(format) ? format : 'comma';
}

function trimFixedNumber(value, digits) {
    let factor = Math.pow(10, digits);
    let truncated = Math.floor(Math.max(0, Number(value) || 0) * factor) / factor;
    let text = truncated.toFixed(digits);
    return text.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

function formatKoreanFullDamageNumber(value) {
    let remaining = Math.max(0, Math.floor(Number(value) || 0));
    if (remaining < 10000) return `${remaining}`;
    const units = [
        { value: 1000000000000, label: '조' },
        { value: 100000000, label: '억' },
        { value: 10000, label: '만' }
    ];
    let text = '';
    units.forEach(unit => {
        let part = Math.floor(remaining / unit.value);
        if (part <= 0) return;
        text += `${part}${unit.label}`;
        remaining %= unit.value;
    });
    if (remaining > 0) text += `${remaining}`;
    return text || '0';
}

function formatKoreanShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
        { value: 1000000000000, label: '조' },
        { value: 100000000, label: '억' },
        { value: 10000, label: '만' }
    ];
    for (const unit of units) {
        if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 1)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
}

function formatEnglishShortDamageNumber(value) {
    let amount = Math.max(0, Number(value) || 0);
    const units = [
        { value: 1000000000000, label: 'T' },
        { value: 1000000000, label: 'B' },
        { value: 1000000, label: 'M' },
        { value: 1000, label: 'K' }
    ];
    for (const unit of units) {
        if (amount >= unit.value) return `${trimFixedNumber(amount / unit.value, 3)}${unit.label}`;
    }
    return `${Math.floor(amount)}`;
}

function formatDamageNumberForDisplay(value, format) {
    let amount = Math.max(0, Math.floor(Number(value) || 0));
    let savedFormat = (typeof game !== 'undefined' && game && game.settings) ? game.settings.damageNumberFormat : 'comma';
    let mode = normalizeDamageNumberFormat(format || savedFormat);
    if (mode === 'korean') return formatKoreanFullDamageNumber(amount);
    if (mode === 'korean_short') return formatKoreanShortDamageNumber(amount);
    if (mode === 'english') return formatEnglishShortDamageNumber(amount);
    return amount.toLocaleString();
}

function spawnDamageText(config) {
    battleVisualState.damageTexts.push({
        start: performance.now(),
        duration: config.duration || 650,
        x: config.x || 0,
        y: config.y || 0,
        value: config.value || 0,
        crit: !!config.crit,
        enemyHit: !!config.enemyHit,
        dot: !!config.dot,
        dotType: config.dotType || '',
        miss: !!config.miss,
        color: config.color || '',
        deflected: !!config.deflected
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
        let rise = (text.dot ? 14 : 20) + (text.crit ? 7 : 0);
        let x = text.x + Math.sin((text.start % 1000) * 0.01) * 4;
        let y = text.y - rise * t;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.font = text.miss ? 'bold 13px Consolas' : (text.dot ? 'bold 10px Consolas' : (text.crit ? 'bold 14px Consolas' : 'bold 12px Consolas'));
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.75)';
        let textValue = text.miss ? String(text.value) : formatDamageNumberForDisplay(text.value);
        ctx.strokeText(textValue, x, y);
        let dotColor = text.dotType === 'fire' ? '#ff9f43' : (text.dotType === 'chaos' ? '#c56cff' : (text.dotType === 'phys' ? '#ff6b6b' : '#b57cff'));
        ctx.fillStyle = text.miss ? (text.color || '#9fb4c8') : (text.dot ? dotColor : (text.deflected ? '#8fe3b0' : (text.enemyHit ? '#ff8e8e' : (text.crit ? '#ffd36f' : '#f3f6ff'))));
        ctx.fillText(textValue, x, y);
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
        if (tags.includes('elemental') || tags.includes('light') || tags.includes('lightning') || tags.includes('thunder') || tags.includes('cold') || tags.includes('fire')) return 6;
        return 4;
    }
    if (tags.includes('slam')) return 2;
    if (tags.includes('aoe')) return 7;
    if (tags.includes('chain')) return 6;
    return 1;
}
function mapEffectIndexByElement(element, fallbackIndex) {
    let ele = normalizeDamageElementKey(element);
    if (ele === 'chaos') return 28;
    if (ele === 'cold') return 3;
    if (ele === 'fire' || ele === 'light') return 26;
    return Number.isFinite(fallbackIndex) ? fallbackIndex : 1;
}
function mapEffectIndexByGemTags(skillName, fallbackIndex) {
    let skill = SKILL_DB[skillName] || {};
    if (Array.isArray(skill.randomElementPool) && skill.randomElementPool.length > 0 && game.lastSkillHitElement) {
        return mapEffectIndexByElement(game.lastSkillHitElement, fallbackIndex);
    }
    let tags = ((skill && skill.tags) || []).map(tag => String(tag).toLowerCase());
    if (tags.includes('chaos')) return 28;
    if (tags.includes('cold')) return 3;
    if (tags.includes('fire') || tags.includes('light') || tags.includes('lightning') || tags.includes('thunder') || tags.includes('elemental')) return 26;
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
    // 이 함수는 스킬 재생 중 매 프레임 호출된다. getPlayerStats()는 장비/패시브
    // 전체를 재계산하는 무거운 함수이므로, 렌더 전용 단기 캐시를 사용해 공격 중
    // 매 프레임 전체 스탯을 재계산하던 렉(특히 상시 공격하는 물리)을 제거한다.
    let playbackStats = (typeof getCanvasPlayerStats === 'function') ? getCanvasPlayerStats() : getPlayerStats();
    let targetIds = getSkillTargets(playbackStats).map(hit => hit.enemy && hit.enemy.id).filter(Boolean);
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

function getHeroAppearanceId() {
    let cosmeticId = game && HERO_SELECTION_DEFS[game.appearanceHeroId] ? game.appearanceHeroId : null;
    if (cosmeticId) return cosmeticId;
    return game && HERO_SELECTION_DEFS[game.selectedHeroId] ? game.selectedHeroId : 'hero1';
}

function isLoopHeroSelectOpen() {
    let overlay = document.getElementById('loop-hero-select-overlay');
    return !!overlay && overlay.classList.contains('active');
}

function buildHeroChoiceTooltipHtml(heroId, experienced) {
    let def = HERO_SELECTION_DEFS[heroId];
    if (!def) return '';
    return `<div class="tooltip-title">${escapeHTML(def.label)}${experienced ? ' <span style="color:#9fd8ff;">경험함</span>' : ''}</div>
        <div class="tooltip-line" style="color:#f6c461;">재능 효과</div>
        <div class="tooltip-line">${escapeHTML(def.talentsText)}</div>`;
}

function showHeroChoiceTooltip(event, heroId, experienced) {
    if (typeof showInfoTooltipHtml !== 'function') return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(heroId, !!experienced), '#f6c461');
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
    let experiencedSet = new Set(game.heroSelectionInitialized && Array.isArray(game.discoveredHeroIds) ? game.discoveredHeroIds : []);
    grid.innerHTML = HERO_SELECTION_ORDER.map(id => {
        let def = HERO_SELECTION_DEFS[id];
        let experienced = experiencedSet.has(id);
        return `<button class="reward-choice hero-choice" data-info-tooltip-anchor="1" onmouseenter="showHeroChoiceTooltip(event,'${id}',${experienced ? 'true' : 'false'})" onmousemove="showHeroChoiceTooltip(event,'${id}',${experienced ? 'true' : 'false'})" onmouseleave="hideInfoTooltip()" onclick="chooseLoopHero('${id}')"><strong>${escapeHTML(def.label)}</strong></button>`;
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

function openWeaponSlotOverlayByItemId(itemId) {
    pendingWeaponEquipItemId = Number.isFinite(itemId) ? itemId : null;
    let overlay = document.getElementById('weapon-slot-overlay');
    if (overlay) overlay.classList.add('active');
}

function closeWeaponSlotOverlay() {
    pendingWeaponEquipItemId = null;
    let overlay = document.getElementById('weapon-slot-overlay');
    if (overlay) overlay.classList.remove('active');
}

function selectWeaponSlotFromOverlay(slot) {
    let itemId = pendingWeaponEquipItemId;
    closeWeaponSlotOverlay();
    if (!Number.isInteger(itemId) || !['무기', '방패'].includes(slot)) return;
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


function getAilmentDisplayLabel(type) {
    let labels = { ignite: '점화', chill: '냉각', freeze: '동결', shock: '감전', poison: '중독', bleed: '출혈', flameDecay: '화염 부패' };
    return labels[type] || type || '알 수 없음';
}

function isPlayerDamageAilmentSource(sourceName) {
    return ['점화', '중독', '출혈'].includes(sourceName || '');
}

function snapshotPlayerAilmentsForDeathLog() {
    return (Array.isArray(game.playerAilments) ? game.playerAilments : [])
        .filter(ail => ail && (ail.time || 0) > 0)
        .map(ail => ({
            type: ail.type || 'unknown',
            label: getAilmentDisplayLabel(ail.type),
            time: Math.max(0, Math.ceil(ail.time || 0)),
            power: Math.max(0, Number(ail.power) || 0),
            sourceHitDamage: Math.max(0, Math.floor(getStoredAilmentHitDamage(ail)))
        }));
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
    let ailmentDamageSummary = Array.isArray(log.ailmentDamageSummary) ? log.ailmentDamageSummary.filter(entry => entry && entry.value > 0).sort((a, b) => b.value - a.value) : [];
    let activeAilments = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
    let totalDamage = damageSummary.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.value || 0)), 0);
    document.getElementById('deathlog-title').innerText = `${getDamageElementLabel(log.primaryElement)} 피해로 쓰러졌습니다.`;
    let ailmentText = activeAilments.length > 0
        ? activeAilments.slice(0, 4).map(ail => `${ail.label || getAilmentDisplayLabel(ail.type)} ${Math.ceil(Math.max(0, ail.time || 0))}초`).join(' · ') + (activeAilments.length > 4 ? ` 외 ${activeAilments.length - 4}개` : '')
        : '없음';
    document.getElementById('deathlog-body').innerText = `${log.reasonText}\n경험치를 ${log.expLost} 잃었습니다.\n죽기 전 상태이상: ${ailmentText}`;
    let renderDamageRows = (rows, totalForRatio) => rows.map(entry => {
        let value = Math.max(0, Math.floor(entry.value || 0));
        let ratio = totalForRatio > 0 ? (value / totalForRatio) * 100 : 0;
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
    }).join('');
    let html = damageSummary.length > 0 ? renderDamageRows(damageSummary, totalDamage) : `<div class="deathlog-empty">최근 3초 동안 집계된 피해 기록이 없습니다.</div>`;
    if (ailmentDamageSummary.length > 0) {
        let ailTotal = ailmentDamageSummary.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.value || 0)), 0);
        html += `<div class="deathlog-subtitle" style="margin-top:10px;">상태이상 피해 요약</div>${renderDamageRows(ailmentDamageSummary, ailTotal)}`;
    }
    if (activeAilments.length > 0) {
        html += `<div class="deathlog-subtitle" style="margin-top:10px;">죽기 전 걸린 상태이상</div>` + activeAilments.map(ail => {
            let hitText = (ail.sourceHitDamage || 0) > 0 ? ` · 원천 피해 ${Math.floor(ail.sourceHitDamage)}` : '';
            let labelText = ail.label || getAilmentDisplayLabel(ail.type);
            let safeLabel = typeof escapeHTML === 'function'
                ? escapeHTML(labelText)
                : String(labelText).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
            return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${safeLabel}</span><strong class="deathlog-value">${Math.ceil(Math.max(0, ail.time || 0))}초<span class="deathlog-ratio">강도 ${(Number(ail.power || 0)).toFixed(2)}${hitText}</span></strong></div></div>`;
        }).join('');
    }
    document.getElementById('deathlog-damage-list').innerHTML = html;
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

function buildDeathDamageSummary(windowMs, opts) {
    let now = Date.now();
    pruneRecentDamageEvents(now);
    let options = opts || {};
    let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
    (game.recentDamageEvents || []).forEach(entry => {
        if (!entry || entry.at < now - (windowMs || 3000)) return;
        if (options.ailmentOnly && !isPlayerDamageAilmentSource(entry.source)) return;
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
        if (choice.kind === 'skill' && hasSkillGemOwned(choice.skill)) {
            enriched.desc = `${choice.desc} 이미 보유 중이면 패시브 포인트 +${choice.fallbackValue || 1}로 바뀝니다.`;
        }
        if (choice.kind === 'support' && hasSupportGemOwned(choice.gem)) {
            enriched.desc = `${choice.desc} 이미 보유 중이면 ${ORB_DB[choice.currency || 'augment'].name} ${(choice.fallbackValue || 1)}개로 바뀝니다.`;
        }
        return enriched;
    });
}
function getClaimedJournalPassivePointTotal(state) {
    let runtimeState = state && typeof state === 'object' ? state : game;
    let entries = new Set(Array.isArray(runtimeState.journalEntries) ? runtimeState.journalEntries : []);
    let claims = runtimeState.journalBonusClaims && typeof runtimeState.journalBonusClaims === 'object' ? runtimeState.journalBonusClaims : {};
    return Object.keys(JOURNAL_DB).reduce((sum, id) => {
        let entry = JOURNAL_DB[id];
        if (!entry || !entry.bonus || entry.bonus.stat !== 'passivePoint') return sum;
        if (!entries.has(id) || !claims[id]) return sum;
        return sum + Math.max(0, Math.floor(entry.bonus.value || 0));
    }, 0);
}
function grantJournalBonus(entryId) {
    let entry = JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    game.journalBonusClaims = (game.journalBonusClaims && typeof game.journalBonusClaims === 'object') ? game.journalBonusClaims : {};
    if (game.journalBonusClaims[entryId]) return;
    game.journalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    if (entry.bonus.stat === 'passivePoint') game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + Math.max(0, Math.floor(entry.bonus.value || 0));
    else game.journalBonuses.push({ entryId: entryId, stat: entry.bonus.stat, value: entry.bonus.value });
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
        if (!hasSkillGemOwned(choice.skill)) {
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
        if (!hasSupportGemOwned(choice.gem)) {
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
function claimActRewardChoice(zoneId, choiceIndex) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
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
    battleAssets.loadPromise = null;
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


function isLocalFileProtocol() {
    return typeof window !== 'undefined' && window.location && window.location.protocol === 'file:';
}

function isLocalRuntimeHost() {
    if (typeof window === 'undefined' || !window.location) return false;
    if (window.location.protocol === 'file:') return true;
    let host = String(window.location.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

function fileExists(path) {
    if (isLocalFileProtocol()) return true;
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
    if (battleAssets.ready) return Promise.resolve(true);
    if (battleAssets.loading && battleAssets.loadPromise) return battleAssets.loadPromise;
    if (battleAssets.failed) return Promise.resolve(false);
    battleAssets.loading = true;
    battleAssets.failedKeys = [];
    battleAssets.loadTicket = (battleAssets.loadTicket || 0) + 1;
    battleAssets.loadPromise = null;
    const loadTicket = battleAssets.loadTicket;
    let resolveLoadPromise;
    battleAssets.loadPromise = new Promise(resolve => { resolveLoadPromise = resolve; });
    const customHeroSrc = getCustomHeroSheetDataUrl();
    const defaultHeroSrc = customHeroSrc || null;
    const manifest = {
        hero1Idle: 'assets/hero1/ElfIdle001Sheet-export.png',
        hero1Walk: 'assets/hero1/ElfWalk001-Sheet-export.png',
        hero1Attack: 'assets/hero1/ElfBasicAtk001BGR-Sheet-export.png',
        hero1Hurt: 'assets/hero1/ElfHurt001-Sheet-export.png',
        hero1Death: 'assets/hero1/ElfDeath001-Sheet-export.png',
        hero2Idle: 'assets/hero2/hero2_walk.png',
        hero2Walk: 'assets/hero2/hero2_walk.png',
        hero2Attack: 'assets/hero2/hero2_attack.png',
        hero2Hurt: 'assets/hero2/hero2_walk.png',
        hero2Death: 'assets/hero2/hero2_walk.png',
        hero3Idle: 'assets/hero3/hero3_walk.png',
        hero3Walk: 'assets/hero3/hero3_walk.png',
        hero3Attack: 'assets/hero3/hero3_attack.png',
        hero3Hurt: 'assets/hero3/hero3_walk.png',
        hero3Death: 'assets/hero3/hero3_walk.png',
        hero4Idle: 'assets/hero4/SeveredFangIdle001-Sheet.png',
        hero4Walk: 'assets/hero4/SeveredFangWalk001-Sheet.png',
        hero4Attack: 'assets/hero4/SeveredFangBasicAtk001-Sheet.png',
        hero4Hurt: 'assets/hero4/SeveredFangHurt001-Sheet.png',
        hero4Death: 'assets/hero4/SeveredFangDeath001-Sheet.png',
        hero5Idle: 'assets/hero5/hero5_walk.png',
        hero5Walk: 'assets/hero5/hero5_walk.png',
        hero5Attack: 'assets/hero5/hero5_attack.png',
        hero5Hurt: 'assets/hero5/hero5_walk.png',
        hero5Death: 'assets/hero5/hero5_walk.png',
        hero6Idle: 'assets/hero6/hero6_walk.png',
        hero6Walk: 'assets/hero6/hero6_walk.png',
        hero6Attack: 'assets/hero6/hero6_attack.png',
        hero6Hurt: 'assets/hero6/hero6_walk.png',
        hero6Death: 'assets/hero6/hero6_walk.png',
        hero9Idle: 'assets/hero9/hero9_walk.png',
        hero9Walk: 'assets/hero9/hero9_walk.png',
        hero9Attack: 'assets/hero9/hero9_attack.png',
        hero9Hurt: 'assets/hero9/hero9_walk.png',
        hero9Death: 'assets/hero9/hero9_walk.png',
        hero10Idle: 'assets/hero10/hero10_walk.png',
        hero10Walk: 'assets/hero10/hero10_walk.png',
        hero10Attack: 'assets/hero10/hero10_attack.png',
        hero10Hurt: 'assets/hero10/hero10_walk.png',
        hero10Death: 'assets/hero10/hero10_walk.png',
        ...(defaultHeroSrc ? { heroLegacy: defaultHeroSrc } : {}),
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
        summon1: 'assets/summon/summon1.png',
        ...((typeof BOSS_ASSET_MANIFEST !== 'undefined' && BOSS_ASSET_MANIFEST) || {}),
    };
    const optionalManifestKeys = new Set(Object.keys(manifest).filter(key => key.startsWith('hero') || key.startsWith('bgAct')).concat(['effectsV2', 'weapons', 'tiles']));
    // Avoid synchronous HEAD probes during boot. Missing optional files are handled by img.onerror,
    // which keeps first-page entry responsive while still waiting for all attempted assets to settle.
    const selectedHeroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : ((game && HERO_SELECTION_DEFS[game.selectedHeroId]) ? game.selectedHeroId : 'hero1');
    const selectedHeroKeys = new Set(Object.values((HERO_SELECTION_DEFS[selectedHeroId] || HERO_SELECTION_DEFS.hero1 || {}).strips || {}));
    const criticalManifestKeys = new Set(['enemies', 'effects', 'summon1', ...selectedHeroKeys]);
    const manifestGroupsBySrc = new Map();
    Object.entries(manifest).forEach(([key, src]) => {
        if (!manifestGroupsBySrc.has(src)) manifestGroupsBySrc.set(src, { src: src, keys: [], priority: 3 });
        let group = manifestGroupsBySrc.get(src);
        group.keys.push(key);
        if (criticalManifestKeys.has(key)) group.priority = Math.min(group.priority, 0);
        else if (key.startsWith('backdrop')) group.priority = Math.min(group.priority, 1);
        else if (key.startsWith('bossAct') || key === 'enemies2' || key === 'enemies3' || key === 'effectsV2') group.priority = Math.min(group.priority, 2);
    });
    const manifestGroups = Array.from(manifestGroupsBySrc.values()).sort((a, b) => a.priority - b.priority || a.src.localeCompare(b.src));
    const maxParallelLoads = Math.max(4, Math.min(8, Number((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 6) || 6));
    let pending = manifestGroups.length;
    let nextGroupIndex = 0;
    let activeLoads = 0;
    const totalAssets = pending;
    let settled = false;
    function updateBattleAssetLoadProgress(currentKey) {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('loading-overlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        let loaded = Math.max(0, totalAssets - pending);
        let ratio = totalAssets > 0 ? (loaded / totalAssets) : 1;
        let progress = Math.floor(58 + ratio * 34);
        if (typeof advanceLoadingOverlay === 'function') {
            advanceLoadingOverlay({
                progress: progress,
                detail: `전투 에셋 로딩 중... (${loaded}/${totalAssets})`,
                caption: currentKey ? `Asset: ${currentKey}` : 'Asset: preparing'
            });
        }
    }
    function finishLoad() {
        if (settled || pending > 0 || battleAssets.loadTicket !== loadTicket) return;
        settled = true;
        if (battleAssets.failedKeys.length === 0) {
            finalizeBattleAssets();
            if (resolveLoadPromise) resolveLoadPromise(!!battleAssets.ready);
            return;
        }
        console.warn('battle asset load completed with missing files:', battleAssets.failedKeys.join(', '));
        finalizeBattleAssets();
        if (resolveLoadPromise) resolveLoadPromise(!!battleAssets.ready);
    }

    setTimeout(() => {
        if (battleAssets.loadTicket !== loadTicket || settled || !battleAssets.loading) return;
        battleAssets.failed = true;
        if (!battleAssets.failedKeys.includes('timeout')) battleAssets.failedKeys.push('timeout');
        pending = 0;
        finishLoad();
    }, 30000);

    function queueBattleSheetSanitization(key, image) {
        if (!ENABLE_BATTLE_SHEET_SANITIZATION) return;
        if (isLocalFileProtocol()) return;  // file:// 환경에서는 canvas.getImageData가 SecurityError를 던지므로 sanitization 건너뜀
        if (battleAssets.loadTicket !== loadTicket) return;
        try {
            let sanitized = sanitizeBattleSheet(image);
            if (key === 'enemies' || key === 'enemies2' || key === 'enemies3') {
                sanitized = sanitizeWhiteBackdropSheet(sanitized);
                sanitized = sanitizeLocalMonsterBackdropSheet(sanitized);
            }
            battleAssets.images[key] = sanitized;
        } catch (error) {
            battleAssets.images[key] = image;
        }
    }

    function storeLoadedBattleImage(key, image) {
        try {
            if (key.startsWith('backdrop') || key.startsWith('bgAct')) {
                battleAssets.backdrops[key] = image;
            } else {
                let keepOriginalSheet = key === 'tiles' || key.startsWith('hero') || (key === 'heroLegacy' && heroSheetHasTransparency(image));
                battleAssets.images[key] = image;
                if (!keepOriginalSheet) queueBattleSheetSanitization(key, image);
            }
        } catch (error) {
            battleAssets.images[key] = image;
        }
    }

    function markBattleAssetGroupDone(group) {
        pending--;
        activeLoads = Math.max(0, activeLoads - 1);
        updateBattleAssetLoadProgress(group.keys.join(','));
        finishLoad();
        pumpBattleAssetQueue();
    }

    function pumpBattleAssetQueue() {
        if (settled || battleAssets.loadTicket !== loadTicket) return;
        while (activeLoads < maxParallelLoads && nextGroupIndex < manifestGroups.length) {
            let group = manifestGroups[nextGroupIndex++];
            activeLoads++;
            let img = new Image();
            if (!isLocalFileProtocol()) img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.loading = 'eager';
            if ('fetchPriority' in img) img.fetchPriority = group.priority <= 1 ? 'high' : 'auto';
            img.onload = function() {
                group.keys.forEach(key => storeLoadedBattleImage(key, img));
                markBattleAssetGroupDone(group);
            };
            img.onerror = function() {
                let requiredKeys = group.keys.filter(key => !optionalManifestKeys.has(key));
                if (requiredKeys.length > 0) {
                    battleAssets.failed = true;
                    requiredKeys.forEach(key => battleAssets.failedKeys.push(key));
                    console.warn('battle asset load failed:', requiredKeys.join(','), group.src);
                }
                markBattleAssetGroupDone(group);
            };
            img.src = group.src;
        }
    }
    updateBattleAssetLoadProgress();
    pumpBattleAssetQueue();
    return battleAssets.loadPromise;
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

function sanitizeWhiteBackdropSheet(image) {
    if (!image) return image;
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
    const width = canvas.width;
    const height = canvas.height;
    const visited = new Uint8Array(width * height);
    const queue = [];
    const edgeSamples = [];
    function sampleEdgePixel(x, y) {
        let idx = (y * width + x) * 4;
        let a = px[idx + 3];
        if (a < 20) return;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        if ((r + g + b) / 3 >= 186 && (max - min) <= 58) edgeSamples.push([r, g, b]);
    }
    [[0, 0], [1, 1], [width - 1, 0], [width - 2, 1], [0, height - 1], [1, height - 2], [width - 1, height - 1], [width - 2, height - 2], [Math.floor(width * 0.5), 0], [0, Math.floor(height * 0.5)], [width - 1, Math.floor(height * 0.5)]].forEach(([x, y]) => {
        sampleEdgePixel(clampNumber(x, 0, width - 1), clampNumber(y, 0, height - 1));
    });
    function edgeDistance(r, g, b) {
        let best = Infinity;
        edgeSamples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 20) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let lowSaturation = (max - min) <= (loose ? 64 : 42);
        if (avg >= 246 && lowSaturation) return true;
        if (!lowSaturation) return false;
        let dist = edgeDistance(r, g, b);
        if (avg >= 222 && dist <= (loose ? 92 : 72)) return true;
        if (avg >= 196 && dist <= (loose ? 64 : 46)) return true;
        return false;
    }
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) {
        pushSeed(x, 0);
        pushSeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
        pushSeed(0, y);
        pushSeed(width - 1, y);
    }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].forEach(([nx, ny]) => pushSeed(nx, ny));
    }
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] < 20) {
            px[i + 3] = 0;
            continue;
        }
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        if (avg >= 236 && (max - min) <= 38) px[i + 3] = 0;
    }
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pos = y * width + x;
            let idx = pos * 4;
            if (alphaSnapshot[pos] === 0) continue;
            let r = px[idx], g = px[idx + 1], b = px[idx + 2];
            let max = Math.max(r, g, b);
            let min = Math.min(r, g, b);
            let avg = (r + g + b) / 3;
            if (avg < 176 || (max - min) > 62) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors >= 3 && avg >= 198) px[idx + 3] = 0;
            else if (transparentNeighbors >= 1 && avg >= 186) px[idx + 3] = Math.min(px[idx + 3], 48);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function sanitizeLocalMonsterBackdropSheet(image) {
    if (!image || !isLocalRuntimeHost()) return image;
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
    const width = canvas.width;
    const height = canvas.height;
    const samples = [];
    function addSample(x, y) {
        x = clampNumber(Math.round(x), 0, width - 1);
        y = clampNumber(Math.round(y), 0, height - 1);
        let idx = (y * width + x) * 4;
        if (px[idx + 3] < 24) return;
        samples.push([px[idx], px[idx + 1], px[idx + 2]]);
    }
    let step = Math.max(4, Math.round(Math.min(width, height) / 36));
    for (let x = 0; x < width; x += step) { addSample(x, 0); addSample(x, height - 1); }
    for (let y = 0; y < height; y += step) { addSample(0, y); addSample(width - 1, y); }
    if (samples.length === 0) return image;
    function bgDistance(r, g, b) {
        let best = Infinity;
        samples.forEach(sample => {
            let dist = Math.abs(r - sample[0]) + Math.abs(g - sample[1]) + Math.abs(b - sample[2]);
            if (dist < best) best = dist;
        });
        return best;
    }
    function isLocalBackdropPixel(pos, loose) {
        let idx = pos * 4;
        let r = px[idx], g = px[idx + 1], b = px[idx + 2], a = px[idx + 3];
        if (a < 24) return true;
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 232 && saturation <= 58) return true;
        if (saturation <= 46 && dist <= (loose ? 88 : 62)) return true;
        return dist <= (loose ? 54 : 38) && saturation <= 72;
    }
    const visited = new Uint8Array(width * height);
    const queue = [];
    function pushSeed(x, y) {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        let pos = y * width + x;
        if (visited[pos] || !isLocalBackdropPixel(pos, true)) return;
        visited[pos] = 1;
        queue.push(pos);
    }
    for (let x = 0; x < width; x++) { pushSeed(x, 0); pushSeed(x, height - 1); }
    for (let y = 0; y < height; y++) { pushSeed(0, y); pushSeed(width - 1, y); }
    while (queue.length > 0) {
        let pos = queue.pop();
        px[pos * 4 + 3] = 0;
        let x = pos % width;
        let y = Math.floor(pos / width);
        pushSeed(x - 1, y);
        pushSeed(x + 1, y);
        pushSeed(x, y - 1);
        pushSeed(x, y + 1);
    }
    for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        let r = px[i], g = px[i + 1], b = px[i + 2];
        let max = Math.max(r, g, b);
        let min = Math.min(r, g, b);
        let avg = (r + g + b) / 3;
        let saturation = max - min;
        let dist = bgDistance(r, g, b);
        if (avg >= 224 && saturation <= 76) px[i + 3] = 0;
        else if (avg >= 204 && saturation <= 54 && dist <= 86) px[i + 3] = Math.min(px[i + 3], 28);
    }
    const alphaSnapshot = new Uint8ClampedArray(width * height);
    for (let i = 0, p = 0; i < px.length; i += 4, p++) alphaSnapshot[p] = px[i + 3];
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let pos = y * width + x;
            if (alphaSnapshot[pos] === 0) continue;
            let transparentNeighbors = 0;
            for (let oy = -1; oy <= 1; oy++) {
                for (let ox = -1; ox <= 1; ox++) {
                    if (ox === 0 && oy === 0) continue;
                    if (alphaSnapshot[(y + oy) * width + (x + ox)] === 0) transparentNeighbors++;
                }
            }
            if (transparentNeighbors <= 0) continue;
            let idx = pos * 4;
            if (isLocalBackdropPixel(pos, false)) px[idx + 3] = transparentNeighbors >= 3 ? 0 : Math.min(px[idx + 3], 40);
        }
    }
    ctx.putImageData(frame, 0, 0);
    return canvas;
}

function heroSheetHasTransparency(image) {
    if (!image || !image.width || !image.height) return false;
    if (isLocalFileProtocol()) return true;  // file:// 환경에서는 getImageData SecurityError 우회 — 히어로 시트는 투명도 있다고 가정
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
    let data;
    try {
        data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    } catch (error) {
        return [];
    }
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
    function inferStripFallbackColumns(image) {
        let width = Math.max(1, Math.round(image && image.width || 1));
        let height = Math.max(1, Math.round(image && image.height || 1));
        let squareFrameCols = width / height;
        let roundedSquareFrameCols = Math.round(squareFrameCols);
        if (roundedSquareFrameCols >= 1 && Math.abs(squareFrameCols - roundedSquareFrameCols) <= 0.02) {
            return roundedSquareFrameCols;
        }
        return Math.max(1, Math.round(width / 80));
    }
    const heroStripFrameCounts = {
        hero1Idle: 6, hero1Walk: 8, hero1Attack: 7, hero1Hurt: 4, hero1Death: 8,
        hero2Idle: 13, hero2Walk: 13, hero2Attack: 18, hero2Hurt: 13, hero2Death: 13,
        hero3Idle: 9, hero3Walk: 9, hero3Attack: 11, hero3Hurt: 9, hero3Death: 9,
        hero4Idle: 6, hero4Walk: 8, hero4Attack: 24, hero4Hurt: 4, hero4Death: 7,
        hero5Idle: 11, hero5Walk: 11, hero5Attack: 9, hero5Hurt: 11, hero5Death: 11,
        hero6Idle: 13, hero6Walk: 13, hero6Attack: 13, hero6Hurt: 13, hero6Death: 13,
        hero9Idle: 9, hero9Walk: 9, hero9Attack: 8, hero9Hurt: 9, hero9Death: 9,
        hero10Idle: 12, hero10Walk: 12, hero10Attack: 10, hero10Hurt: 12, hero10Death: 12
    };
    function buildFixedStripFramesFromImage(image, frameCount) {
        if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return [];
        let frames = [];
        for (let i = 0; i < frameCount; i++) {
            let x = Math.round(i * image.width / frameCount);
            let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
            let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
            let trimmed = trimRectToContent(image, raw, 1);
            if (trimmed && trimmed.width >= 10 && trimmed.height >= 10) frames.push(withImageRef(image, trimmed));
            else frames.push(withImageRef(image, raw));
        }
        return frames.filter(Boolean);
    }
    function buildStripFramesFromImage(image, minArea, frameCount) {
        if (!image) return [];
        if (Number.isFinite(frameCount) && frameCount > 0) {
            let fixedFrames = buildFixedStripFramesFromImage(image, frameCount);
            if (fixedFrames.length > 0) return fixedFrames;
        }
        let detected = sortSheetComponents(detectSpriteComponents(image, minArea || 220))
            .map(rect => trimRectToContent(image, padSpriteRect(rect, image, 2), 2))
            .filter(rect => rect && rect.width >= 22 && rect.height >= 38)
            .map(rect => withImageRef(image, rect))
            .filter(Boolean);
        if (detected.length > 0) return detected;
        let fallbackCols = inferStripFallbackColumns(image);
        return buildFixedStripFramesFromImage(image, fallbackCols);
    }
    function normalizeFrameSetBasisHeight(frames) {
        let list = (frames || []).filter(Boolean);
        if (list.length <= 0) return [];
        let heights = list.map(frame => Math.max(1, Math.round(frame.height || 1))).sort((a, b) => a - b);
        let mid = Math.floor(heights.length / 2);
        let basisHeight = heights[mid] || heights[0] || 1;
        return list.map(frame => ({ ...frame, basisHeight: basisHeight }));
    }
    function sanitizeHero3AttackFrames(frames) {
        let list = (frames || []).filter(Boolean);
        return list.map(frame => {
            let width = Math.max(1, Math.round(frame.width || 1));
            let sourceRightBiasPx = 4;
            let maxShift = Math.max(0, Math.min(sourceRightBiasPx, Math.floor(width * 0.1)));
            if (maxShift <= 0) return frame;
            let nextX = Math.round((frame.x || 0) + maxShift);
            return {
                ...frame,
                x: nextX,
                width: Math.max(1, width - maxShift)
            };
        });
    }
    function buildHeroFrameSetFromStripKeys(stripKeys, heroId) {
        if (!stripKeys) return null;
        let idleFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.idle], 210, heroStripFrameCounts[stripKeys.idle]));
        let walkFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.walk], 210, heroStripFrameCounts[stripKeys.walk]));
        let attackFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.attack], 220, heroStripFrameCounts[stripKeys.attack]));
        if (heroId === 'hero3') attackFrames = normalizeFrameSetBasisHeight(sanitizeHero3AttackFrames(attackFrames));
        let hurtFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.hurt], 200, heroStripFrameCounts[stripKeys.hurt]));
        let downFrames = normalizeFrameSetBasisHeight(buildStripFramesFromImage(battleAssets.images[stripKeys.death], 200, heroStripFrameCounts[stripKeys.death]));
        if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
        const walkFallbackHeroIds = new Set(['hero2', 'hero6', 'hero10']);
        if (walkFallbackHeroIds.has(heroId)) {
            let restingFrame = walkFrames[0] || idleFrames[0];
            idleFrames = [restingFrame].filter(Boolean);
            hurtFrames = [restingFrame].filter(Boolean);
            downFrames = [restingFrame].filter(Boolean);
        }
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
                sword_attack_body: heroId === 'hero3' || heroId === 'hero4' || heroId === 'hero5' || heroId === 'hero9',
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
    let selectedHeroDef = getHeroSelectionDef(typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : game.selectedHeroId);

    function buildEnemyTransparentImage(image) {
        if (!image) return image;
        try {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(sanitizeBattleSheet(image)));
        } catch (error) {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(image));
        }
    }
    let heroFrameSetSource = selectedHeroDef.id;
    let heroFrameSet = buildHeroFrameSetFromStripKeys(selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== 'hero1') {
        heroFrameSet = buildHeroFrameSetFromStripKeys(HERO_SELECTION_DEFS.hero1.strips, 'hero1');
        if (heroFrameSet) heroFrameSetSource = 'hero1';
    }
    if (!heroFrameSet && heroFramesLegacy.length > 0) {
        heroFrameSet = buildHeroFrameSet(heroFramesLegacy);
        heroFrameSetSource = 'legacy';
    }
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
        heroFrameSetSource = 'none';
        heroFrameSet = {
            characterAnimations: { idle: [], walk_or_run: [], sword_attack_body: [], cast_body: [], hurt: [], down_or_knockdown: [], bow_attack_body: [] },
            clipLoop: {},
            idle: [],
            walk: [],
            run: []
        };
    }
    function resolveHeroImageForFrameSet() {
        if (heroFrameSetSource === 'legacy') return legacyHeroImage;
        let sourceDef = HERO_SELECTION_DEFS[heroFrameSetSource] || selectedHeroDef || HERO_SELECTION_DEFS.hero1;
        let strips = (sourceDef && sourceDef.strips) || {};
        return battleAssets.images[strips.idle]
            || battleAssets.images[strips.walk]
            || battleAssets.images[strips.attack]
            || battleAssets.images[strips.hurt]
            || battleAssets.images[strips.death]
            || battleAssets.images.hero1Idle
            || battleAssets.images.hero1Walk
            || battleAssets.images.hero1Attack
            || battleAssets.images.hero1Hurt
            || battleAssets.images.hero1Death
            || legacyHeroImage;
    }
    const enemySpriteImage = buildEnemyTransparentImage(battleAssets.images.enemies);
    const enemyFrames = Object.fromEntries(Object.entries(enemyParts).map(([key, part]) => [key, trimRectToContent(enemySpriteImage, part, key === 'boss' ? 5 : 3)]));
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
            { image: enemySpriteImage, frame: enemyFrames.slime },
            { image: enemySpriteImage, frame: enemyFrames.bandit },
            { image: enemySpriteImage, frame: enemyFrames.shadow },
            { image: enemySpriteImage, frame: enemyFrames.wraith }
        ].filter(entry => hasUsableFrame(entry.frame)),
        elite: [
            { image: enemySpriteImage, frame: enemyFrames.knight },
            { image: enemySpriteImage, frame: enemyFrames.skeleton },
            { image: enemySpriteImage, frame: enemyFrames.shadow },
            { image: enemySpriteImage, frame: enemyFrames.wraith },
            { image: enemySpriteImage, frame: enemyFrames.bandit }
        ].filter(entry => hasUsableFrame(entry.frame)),
        boss: [
            { image: enemySpriteImage, frame: enemyFrames.boss },
        ].filter(entry => hasUsableFrame(entry.frame))
    };
    // 배경 불투명 스프라이트가 섞이는 현상을 방지하기 위해
    // 자동 감지 풀(2/3번 시트)은 기본값에서 제외한다.
    // 필요 시 추후 개별 투명화 보정 후 재활성화 가능.
    // enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies2));
    // enemyVariantPools = mergeEnemyPools(enemyVariantPools, buildDetectedEnemyPools(battleAssets.images.enemies3));
    const bossImages = {};
    if (typeof BOSS_ASSET_MANIFEST !== 'undefined') {
        Object.keys(BOSS_ASSET_MANIFEST).forEach(key => {
            if (battleAssets.images[key]) bossImages[key] = battleAssets.images[key];
        });
    }
    const tileImage = battleAssets.images.tiles || null;
    const tileFrames = tileImage ? tileParts.map(part => trimRectToContent(tileImage, part, 2)) : [];
    return {
        hero: {
            image: resolveHeroImageForFrameSet(),
            frames: heroFrameSet
        },
        enemies: {
            image: enemySpriteImage,
            variants: enemyVariantPools,
            bossImages: bossImages,
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
            image: tileImage,
            frames: {
                grass: tileFrames[0] || null,
                grassDeep: tileFrames[1] || null,
                moss: tileFrames[2] || null,
                stone: tileFrames[3] || null,
                dirt: tileFrames[4] || null,
                dirtWarm: tileFrames[5] || null,
                grassBright: tileFrames[6] || null,
                swamp: tileFrames[7] || null,
                ruin: tileFrames[8] || null,
                frost: tileFrames[9] || null,
                lava: tileFrames[10] || null,
                chest: tileFrames[11] || null,
                roots: tileFrames[12] || null,
                abyss: tileFrames[13] || null,
                temple: tileFrames[14] || null,
                templeAlt: tileFrames[15] || null
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
        if (options.flipX) {
            let centerX = dx + drawWidth / 2;
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
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
        let normalized = {
            ...stat,
            val: val,
            valMin: min,
            valMax: max,
            tier: Math.max(0, Math.floor(coerceFiniteNumber(stat.tier, 0))),
            statName: stat.statName || getStatName(stat.id),
            originalVal: Number.isFinite(Number(stat.originalVal)) ? Number(stat.originalVal) : null
        };
        // 복합 옵션의 추가 스탯도 정규화한다.
        if (Array.isArray(stat.extraStats)) {
            normalized.extraStats = stat.extraStats.map(normalizeStatRecord).filter(Boolean);
            if (normalized.extraStats.length === 0) delete normalized.extraStats;
        }
        return normalized;
    }
    item.baseStats = Array.isArray(item.baseStats) ? item.baseStats.map(normalizeStatRecord).filter(Boolean) : [];
    item.stats = Array.isArray(item.stats) ? item.stats.map(normalizeStatRecord).filter(Boolean) : [];
    let abyssCap = getAbyssSocketCapacity(item);
    if (abyssCap > 0) {
        item.abyssSockets = Array.isArray(item.abyssSockets)
            ? item.abyssSockets.slice(0, abyssCap).map(sock => ({ jewel: (sock && typeof sock.jewel === 'object') ? sock.jewel : null }))
            : [];
    } else {
        item.abyssSockets = [];
    }
    item.chaosInfusion = item.chaosInfusion ? normalizeStatRecord(item.chaosInfusion) : null;
    if (item.encroached && typeof item.encroached === 'object') {
        let pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.map(normalizeStatRecord).filter(Boolean).slice(0, 3) : [];
        let chosen = item.encroached.chosen ? normalizeStatRecord({ ...item.encroached.chosen, encroachedFinal: true }) : null;
        item.encroached = {
            liberated: !!item.encroached.liberated && !!chosen,
            sourceFloor: Math.max(1, Math.floor(coerceFiniteNumber(item.encroached.sourceFloor, 1))),
            pendingOptions: chosen ? [] : pendingOptions,
            chosen: chosen
        };
    } else item.encroached = null;
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
    if (Number.isFinite(item.hiddenTier)) return clampNumber(Math.floor(item.hiddenTier), 1, 15);
    if (Number.isFinite(item.itemTier)) return clampNumber(Math.floor(item.itemTier), 1, 15);
    return 1;
}

function getRealmEquipmentHiddenTierCap(zone) {
    if (!zone || zone.type !== 'cosmos') return Math.max(1, Math.floor(Number(zone && zone.tier) || 1));
    let cosmosTier = Math.max(1, Math.floor(Number(zone.tier) || 1));
    return Math.min(15, 11 + Math.floor((cosmosTier - 1) / 5));
}

function getCraftTierRangeForItem(item, source) {
    let maxTier = getItemCraftTier(item);
    if (maxTier < 11) return { min: 1, max: maxTier };
    return { min: source === 'spore' ? 9 : 10, max: maxTier };
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

// 고유 아이템 획득 시 도감에 즉시 등록(아이템을 소모하지 않는 수집 기록 개념).
function registerUniqueToCodexOnAcquire(item) {
    let key = getUniqueCodexKeyByItem(item);
    if (!key) return false;
    game.uniqueCodex = (game.uniqueCodex && typeof game.uniqueCodex === 'object') ? game.uniqueCodex : {};
    let existing = game.uniqueCodex[key];
    // 이미 옵션까지 기록된 경우 첫 등록 기록을 유지한다(루프 리셋 후 정보만 남은 경우는 다시 채움).
    if (existing && existing.baseName) return false;
    game.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    let firstTime = !existing;
    if (!firstTime) return true;
    game.codexNewlyRegistered = (game.codexNewlyRegistered && typeof game.codexNewlyRegistered === 'object') ? game.codexNewlyRegistered : {};
    game.codexNewlyRegistered[key] = true;
    if (game.noti) game.noti.codex = true;
    addLog(`📚 도감 신규 등록: <span class='loot-unique'>[${item.name}]</span>`, 'loot-unique');
    if (typeof tryGrantCodexCompletionReward === 'function') tryGrantCodexCompletionReward();
    return true;
}

const EQUIPMENT_DROP_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'];

function chooseItemBase(slot, zoneTier) {
    let zone = getZone(game.currentZoneId) || {};
    const zoneRealm = zone.type === 'chaosRealm' ? 'chaos' : (zone.type === 'underworld' ? 'underworld' : (zone.type === 'cosmos' ? 'cosmos' : null));
    let candidates = BASE_ITEM_DB.filter(base => {
        if (base.slot !== slot || base.reqTier > zoneTier) return false;
        if (base.realmBase && base.realmBase !== zoneRealm) return false;
        if (!base.realmBase && zoneRealm && ['chaos','underworld','cosmos'].includes(zoneRealm)) {
            // allow common bases in realm zones too
        }
        if (!base.dropOnly) return true;
        if (base.dropOnly.type && zone.type !== base.dropOnly.type) return false;
        if (base.dropOnly.id && zone.id !== base.dropOnly.id) return false;
        if (base.dropOnly.minFloor && Math.floor(zone.floor || 0) < base.dropOnly.minFloor) return false;
        return true;
    });
    if (candidates.length === 0) candidates = BASE_ITEM_DB.filter(base => base.slot === slot && !base.realmBase);
    // 최종 단계 베이스는 드랍 가중치를 크게 낮춘다(일반 베이스의 1/25 수준).
    // 6단계 싱글 체인의 6단계, 또는 최상위 T20 베이스(듀얼 방어구의 4단계 등)가 대상.
    let weights = candidates.map(base => {
        let info = typeof getBaseChainInfo === 'function' ? getBaseChainInfo(base) : null;
        let isFinal = (info && info.step >= 6) || (base.reqTier || 0) >= 20;
        return isFinal ? 0.04 : 1;
    });
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return rndChoice(candidates);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function rollBaseStats(base, zoneTier) {
    return base.baseStats.map(stat => {
        let minBase = Number.isFinite(stat.baseMin) ? stat.baseMin : ((stat.base || 0) * 0.8);
        let maxBase = Number.isFinite(stat.baseMax) ? stat.baseMax : ((stat.base || 0) * 1.2);
        let scale = (stat.id === 'energyShield') ? 1.5 : 1;
        let scaledMin = minBase * scale;
        let scaledMax = maxBase * scale;
        let usesDecimalRoll = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id);
        if (scaledMax > 0) {
            let positiveMinimum = usesDecimalRoll ? 0.1 : 1;
            scaledMin = Math.max(positiveMinimum, scaledMin);
            scaledMax = Math.max(scaledMin, scaledMax);
        }
        let val;
        if (usesDecimalRoll) {
            let minStep = Math.round(scaledMin * 10);
            let maxStep = Math.round(scaledMax * 10);
            val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
            scaledMin = minStep / 10;
            scaledMax = maxStep / 10;
        } else {
            scaledMin = Math.floor(scaledMin);
            scaledMax = Math.floor(scaledMax);
            if (scaledMax > 0) scaledMin = Math.max(1, scaledMin);
            val = scaledMin + Math.floor(Math.random() * (scaledMax - scaledMin + 1));
        }
        if (stat.id === 'flatDmg') {
            scaledMin = Math.max(1, scaledMin);
            scaledMax = Math.max(scaledMin, scaledMax);
            val = Math.max(1, val);
        }
        return {
            id: stat.id,
            val: val,
            valMin: scaledMin,
            valMax: scaledMax,
            baseRollMin: scaledMin,
            baseRollMax: scaledMax,
            tier: 0,
            statName: getStatName(stat.id)
        };
    });
}


function rollTierValueAffix(mod, statId, tier) {
    let range = mod.tierValues[Math.max(0, Math.min(mod.tierValues.length - 1, tier - 1))];
    let min = Array.isArray(range) ? Number(range[0]) : Number(range);
    let max = Array.isArray(range) ? Number(range[1]) : min;
    if (!Number.isFinite(min)) min = Number(mod.base) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let val = min + Math.floor(Math.random() * (Math.floor(max) - Math.floor(min) + 1));
    return { id: statId, val: val, valMin: Math.floor(min), valMax: Math.floor(max), tier: tier, statName: mod.statName };
}

function rerollStoredAffixValue(stat) {
    let min = Number(stat && stat.valMin);
    let max = Number(stat && stat.valMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        return;
    }
    let minInt = Math.round(min);
    let maxInt = Math.round(max);
    stat.val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
}

// 복합 옵션(한 줄에 두 스탯)을 위해, 주 스탯과 동일한 티어로 추가 스탯들을 굴린다.
function rollCompoundExtraStats(mod, tier, roundInteger) {
    if (!mod || !Array.isArray(mod.compound) || mod.compound.length === 0) return null;
    return mod.compound.map(sub => {
        let subId = sub.statId || sub.id;
        if (Array.isArray(sub.tierValues)) return rollTierValueAffix(sub, subId, tier);
        let min = sub.base + (tier * sub.step);
        let max = min + sub.step * 1.6;
        let val;
        if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(subId)) {
            let minStep = Math.round(min * 10);
            let maxStep = Math.round(max * 10);
            val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
            min = minStep / 10;
            max = maxStep / 10;
        } else {
            let toInt = roundInteger ? Math.round : Math.floor;
            min = toInt(min);
            max = toInt(max);
            if (max > 0) min = Math.max(1, min);
            val = min + Math.floor(Math.random() * (max - min + 1));
        }
        return { id: subId, val: val, valMin: min, valMax: max, tier: tier, statName: sub.statName || getStatName(subId) };
    });
}

function rollAffixValue(mod, maxTier, opts) {
    let roundInteger = !!(opts && opts.roundInteger);
    let statId = mod.statId || mod.id;
    let tier = 1;
    maxTier = clampNumber(Math.floor(Number(maxTier) || 1), 1, 15);
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        let min = mod.base + (tier * mod.step);
        let max = min + mod.step * 1.6;
        let val;
        if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) {
            let minStep = Math.round(min * 10);
            let maxStep = Math.round(max * 10);
            val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
            min = minStep / 10;
            max = maxStep / 10;
        } else {
            let toInt = roundInteger ? Math.round : Math.floor;
            min = toInt(min);
            max = toInt(max);
            if (max > 0) min = Math.max(1, min);
            val = min + Math.floor(Math.random() * (max - min + 1));
        }
        result = { id: statId, val: val, valMin: min, valMax: max, tier: tier, statName: mod.statName };
    }
    let extras = rollCompoundExtraStats(mod, result.tier, roundInteger);
    if (extras) result.extraStats = extras;
    return result;
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
    minTier = clampNumber(Math.floor(Number(minTier) || 1), 1, 15);
    maxTier = clampNumber(Math.floor(Number(maxTier) || minTier), minTier, 15);
    let tier = pickTierInRangeWeighted(minTier, maxTier);
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        let min = mod.base + (tier * mod.step);
        let max = min + mod.step * 1.6;
        let val;
        if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) {
            let minStep = Math.round(min * 10);
            let maxStep = Math.round(max * 10);
            val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
            min = minStep / 10;
            max = maxStep / 10;
        } else {
            min = Math.floor(min);
            max = Math.floor(max);
            if (max > 0) min = Math.max(1, min);
            val = min + Math.floor(Math.random() * (max - min + 1));
        }
        result = { id: statId, val: val, valMin: min, valMax: max, tier: tier, statName: mod.statName };
    }
    let extras = rollCompoundExtraStats(mod, result.tier, false);
    if (extras) result.extraStats = extras;
    return result;
}


function getImmutableItemSpecialStats(item) {
    if (!item || !item.encroached || !item.encroached.liberated || !item.encroached.chosen) return [];
    let stat = item.encroached.chosen;
    return [{ ...stat, statName: `[잠식] ${stat.statName || getStatName(stat.id)}`, encroachedFinal: true }];
}
function getItemExplicitOptionCount(item) {
    if (!item) return 0;
    return (Array.isArray(item.stats) ? item.stats.length : 0) + (item.chaosInfusion ? 1 : 0);
}
function getItemOccupiedExplicitModIds(item) {
    let ids = new Set();
    (item && Array.isArray(item.stats) ? item.stats : []).forEach(stat => {
        if (!stat) return;
        if (stat.id) ids.add(stat.id);
        if (Array.isArray(stat.extraStats)) stat.extraStats.forEach(extra => { if (extra && extra.id) ids.add(extra.id); });
    });
    if (item && item.chaosInfusion && item.chaosInfusion.id) ids.add(item.chaosInfusion.id);
    getImmutableItemSpecialStats(item).forEach(stat => {
        if (stat && stat.id) ids.add(stat.id);
    });
    return ids;
}
function applyEncroachmentToItem(item, sourceFloor) {
    if (!item || item.rarity === 'unique' || item.encroached) return item;
    item.encroached = {
        liberated: false,
        sourceFloor: Math.max(1, Math.floor(sourceFloor || 1)),
        pendingOptions: [],
        chosen: null
    };
    return item;
}
function getEncroachmentDropChance(enemy) {
    if (!enemy) return 0;
    if (enemy.isBoss) return 0.10;
    if (enemy.isElite) return 0.04;
    return 0.012;
}
function maybeApplyChaosRealmEncroachment(item, enemy, zone) {
    if (!item || !zone || zone.type !== 'chaosRealm' || item.rarity === 'unique') return item;
    if (Math.random() >= getEncroachmentDropChance(enemy)) return item;
    applyEncroachmentToItem(item, Math.max(1, Math.floor(zone.floor || 1)));
    return item;
}
function rollEncroachmentLiberationOptions(item) {
    if (!item || !item.encroached || item.encroached.liberated) return [];
    item.encroached.pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.filter(Boolean).slice(0, 3) : [];
    if (item.encroached.pendingOptions.length > 0) return item.encroached.pendingOptions;
    let existing = getItemOccupiedExplicitModIds(item);
    let pool = getAvailableMods(item).filter(mod => !existing.has(mod.statId || mod.id));
    let picks = pickRandomMods(pool, 3);
    item.encroached.pendingOptions = picks.map(mod => ({ ...rollAffixValueInTierRange(mod, 10, 10), encroachedCandidate: true }));
    return item.encroached.pendingOptions;
}
function liberateSelectedEncroachedItem() {
    let item = getSelectedCraftItem();
    if (!item || !item.encroached) return addLog('잠식된 아이템을 선택하세요.', 'attack-monster');
    if (item.encroached.liberated) return addLog('이미 잠식 해방이 완료된 아이템입니다.', 'attack-monster');
    let options = rollEncroachmentLiberationOptions(item);
    if (!options || options.length <= 0) return addLog('해방 가능한 최고 티어 옵션 후보가 없습니다.', 'attack-monster');
    openEncroachmentLiberationOverlay(item, options);
}

// 잠식 해방: 셋 중 하나를 반드시 골라야 하는 오버레이. 취소 없음.
// 옵션은 한 줄에 하나씩 서서히 공개된다.
function openEncroachmentLiberationOverlay(item, options) {
    game.pendingEncroachmentLiberation = { itemId: item.id };
    let overlay = document.getElementById('encroachment-liberation-overlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="encroachment-liberation-overlay" style="position:fixed;inset:0;background:rgba(6,4,14,.82);z-index:10000;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
        overlay = document.getElementById('encroachment-liberation-overlay');
    }
    let rows = options.map((stat, idx) => {
        let label = `${stat.statName || getStatName(stat.id)} +${formatValue(stat.id, stat.val)}`;
        return `<button id="encroach-opt-${idx}" onclick="confirmEncroachmentLiberation(${idx})" disabled style="opacity:0;transform:translateY(12px);transition:opacity .55s ease,transform .55s ease;pointer-events:none;display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;text-align:left;padding:12px 14px;border:1px solid #5a3f8f;border-radius:10px;background:linear-gradient(90deg,rgba(40,24,64,.92),rgba(24,16,40,.92));color:#e7d8ff;font-size:15px;cursor:pointer;"><span>${label}</span><span style="color:#b79bff;font-size:12px;">[T${stat.tier || 10}]</span></button>`;
    }).join('');
    overlay.innerHTML = `<div style="width:min(520px,95vw);background:#120c1e;border:1px solid #6a47b3;border-radius:14px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);">`
        + `<div style="color:#caa6ff;font-size:19px;font-weight:700;margin-bottom:4px;">🕳️ 잠식 해방</div>`
        + `<div style="color:#b9a7d8;font-size:13px;margin-bottom:14px;line-height:1.5;">[${item.name}] · 최고 티어 옵션 셋 중 <strong style="color:#e7d8ff;">반드시 하나</strong>를 선택해야 합니다.</div>`
        + `<div style="display:grid;gap:10px;">${rows}</div>`
        + `<div id="encroach-hint" style="opacity:0;transition:opacity .5s ease;margin-top:12px;color:#9b86c4;font-size:12px;text-align:center;">옵션이 모두 드러나면 하나를 선택하세요.</div>`
        + `</div>`;
    options.forEach((_, idx) => {
        setTimeout(() => {
            let el = document.getElementById(`encroach-opt-${idx}`);
            if (!el) return;
            el.style.opacity = '1';
            el.style.transform = 'none';
            el.disabled = false;
            el.style.pointerEvents = 'auto';
            if (idx === options.length - 1) {
                let hint = document.getElementById('encroach-hint');
                if (hint) hint.style.opacity = '1';
            }
        }, 280 + idx * 620);
    });
}

function confirmEncroachmentLiberation(pickIdx) {
    let pending = game.pendingEncroachmentLiberation;
    if (!pending) return;
    let item = (game.inventory || []).find(v => v && v.id === pending.itemId);
    if (!item) {
        let equipMatch = Object.entries(game.equipment || {}).find(([, eq]) => eq && eq.id === pending.itemId);
        if (equipMatch) item = equipMatch[1];
    }
    if (!item || !item.encroached || item.encroached.liberated) { closeEncroachmentLiberationOverlay(); return; }
    let options = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions : [];
    let idx = Math.floor(Number(pickIdx) || 0);
    if (idx < 0 || idx >= options.length) return;
    let chosen = { ...options[idx], encroachedFinal: true, encroachedCandidate: false };
    item.encroached.liberated = true;
    item.encroached.chosen = chosen;
    item.encroached.pendingOptions = [];
    closeEncroachmentLiberationOverlay();
    addLog(`🕳️ 잠식 해방 완료: ${chosen.statName || getStatName(chosen.id)} +${formatValue(chosen.id, chosen.val)} 확정`, 'loot-unique');
    updateStaticUI();
}

function closeEncroachmentLiberationOverlay() {
    game.pendingEncroachmentLiberation = null;
    let overlay = document.getElementById('encroachment-liberation-overlay');
    if (overlay) overlay.remove();
}
safeExposeGlobals({ liberateSelectedEncroachedItem, openEncroachmentLiberationOverlay, confirmEncroachmentLiberation, closeEncroachmentLiberationOverlay });

const DEFENSE_TYPE_PCT_STAT = { armor: 'armorPct', evasion: 'evasionPct', energyShield: 'energyShieldPct' };
const DEFENSE_PCT_TYPE_STAT = { armorPct: 'armor', evasionPct: 'evasion', energyShieldPct: 'energyShield' };
const DUAL_DEFENSE_AFFIX_RATIO = 0.6;

function getItemBaseDefenseTypes(item) {
    return new Set((item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .map(stat => stat && stat.id)
        .filter(id => id === 'armor' || id === 'evasion' || id === 'energyShield'));
}

function getPrimaryBaseDefenseType(item) {
    let row = (item && Array.isArray(item.baseStats) ? item.baseStats : [])
        .find(stat => stat && (stat.id === 'armor' || stat.id === 'evasion' || stat.id === 'energyShield'));
    return row ? row.id : null;
}

function getDefenseTypeForAffixStat(statId) {
    statId = String(statId || '');
    if (DEFENSE_TYPE_PCT_STAT[statId]) return statId;
    return DEFENSE_PCT_TYPE_STAT[statId] || null;
}

function scaleDefenseCompoundStat(source, statId) {
    return {
        statId: statId,
        statName: getStatName(statId),
        base: (Number(source && source.base) || 0) * DUAL_DEFENSE_AFFIX_RATIO,
        step: (Number(source && source.step) || 0) * DUAL_DEFENSE_AFFIX_RATIO
    };
}

function isPrimaryDualDefenseAffixMod(item, mod) {
    let sourceDefenseType = getDefenseTypeForAffixStat(mod && (mod.statId || mod.id));
    let defenseTypes = getItemBaseDefenseTypes(item);
    if (!sourceDefenseType || defenseTypes.size < 2) return true;
    return sourceDefenseType === getPrimaryBaseDefenseType(item);
}

function makeDualDefenseAffixMod(item, mod) {
    let statId = mod && (mod.statId || mod.id);
    let sourceDefenseType = getDefenseTypeForAffixStat(statId);
    let defenseTypes = Array.from(getItemBaseDefenseTypes(item));
    if (!sourceDefenseType || defenseTypes.length < 2 || !defenseTypes.includes(sourceDefenseType)) return mod;
    let extras = Array.isArray(mod.compound) ? mod.compound.slice() : [];
    defenseTypes.forEach(type => {
        if (type === sourceDefenseType) return;
        if (Array.isArray(mod.compound)) {
            extras.push(scaleDefenseCompoundStat(mod, type));
            let ownPct = mod.compound.find(sub => getDefenseTypeForAffixStat(sub && (sub.statId || sub.id)) === sourceDefenseType);
            if (ownPct) extras.push(scaleDefenseCompoundStat(ownPct, DEFENSE_TYPE_PCT_STAT[type]));
            return;
        }
        if (statId === sourceDefenseType) extras.push(scaleDefenseCompoundStat(mod, type));
        if (statId === DEFENSE_TYPE_PCT_STAT[sourceDefenseType]) extras.push(scaleDefenseCompoundStat(mod, DEFENSE_TYPE_PCT_STAT[type]));
    });
    if (extras.length === 0) return mod;
    return { ...mod, compound: extras };
}
// 방어구는 베이스가 가진 방어 타입(방어도/회피/보호막)에 해당하는 옵션만 허용한다.
// 예) 회피 베이스에 방어도(%)가, 방어도 베이스에 회피(%)가 붙지 않도록 막는다.
// 고유 아이템과 방어구가 아닌 슬롯(장신구 등)은 제한 대상에서 제외한다.
function isDefenseTypeStatAllowed(item, statId) {
    let defenseSlots = new Set(['투구', '갑옷', '장갑', '신발', '방패']);
    if (!item || item.rarity === 'unique' || !defenseSlots.has(item.slot)) return true;
    statId = String(statId || '');
    if (!['armor', 'evasion', 'energyShield', 'armorPct', 'evasionPct', 'energyShieldPct'].includes(statId)) return true;
    let baseDefenseTypes = getItemBaseDefenseTypes(item);
    if (baseDefenseTypes.size <= 0) return true;
    if (statId.startsWith('armor') && !baseDefenseTypes.has('armor')) return false;
    if (statId.startsWith('evasion') && !baseDefenseTypes.has('evasion')) return false;
    if (statId.startsWith('energyShield') && !baseDefenseTypes.has('energyShield')) return false;
    return true;
}

function isKaleidoscopeShieldItem(item) {
    return !!(item && item.rarity === 'unique' && item.uniqueEffectKey === 'kaleidoscopeShield');
}

function getAvailableModSlotsForItem(item) {
    if (isKaleidoscopeShieldItem(item)) return EQUIPMENT_DROP_SLOTS.slice();
    return [item && item.slot].filter(Boolean);
}

function getAvailableMods(item) {
    let existing = getItemOccupiedExplicitModIds(item);
    let isKaleidoscopeShield = !!(item && item.rarity === 'unique' && item.uniqueEffectKey === 'kaleidoscopeShield');
    let allowedSlots = isKaleidoscopeShield ? EQUIPMENT_DROP_SLOTS.slice() : [item && item.slot].filter(Boolean);
    let summonBaseStatIds = new Set(['summonPctDmg', 'summonFlatDmg', 'summonEfficiency', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonAspd', 'summonCap', 'summonResPen', 'summonGemLevel']);
    let summonOnlyModIds = new Set(['summonFlatDmg', 'summonPctDmg', 'summonHpPct', 'summonAspd', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonCap', 'summonResPen', 'summonGemLevel']);
    let hasSummonBaseStat = item && Array.isArray(item.baseStats)
        && item.baseStats.some(stat => stat && summonBaseStatIds.has(stat.id));
    let isSummonBaseWeapon = item && item.slot === '무기' && hasSummonBaseStat;
    let isSummonBaseRing = item && item.slot === '반지' && hasSummonBaseStat;
    let baseDefenseTypes = getItemBaseDefenseTypes(item);
    return MOD_DB.filter(mod => {
        let statId = mod.statId || mod.id;
        if (!isDefenseTypeStatAllowed(item, statId)) return false;
        if (statId === 'deflectChance' && !baseDefenseTypes.has('evasion')) return false;
        if (!isKaleidoscopeShield && item.slot === '방패' && statId === 'spellGemLevel' && !baseDefenseTypes.has('energyShield')) return false;
        if (item.slot === '무기' && summonOnlyModIds.has(statId) && !isSummonBaseWeapon) return false;
        if (item.slot === '반지' && summonOnlyModIds.has(statId) && !isSummonBaseRing) return false;
        if (!isPrimaryDualDefenseAffixMod(item, mod)) return false;
        return allowedSlots.some(slot => mod.slots.includes(slot)) && !existing.has(statId);
    }).map(mod => makeDualDefenseAffixMod(item, mod));
}

function updateItemName(item) {
    if (!item) return;
    if (item.rarity === 'normal') item.name = item.baseName;
    else if (item.rarity === 'magic') item.name = `마법의 ${item.baseName}`;
    else if (item.rarity === 'rare') item.name = `희귀한 ${item.baseName}`;
}

function rerollChaosInfusionForItem(item, previousInfusion) {
    if (!item || !previousInfusion) return null;
    let pool = getChaosInfuserOptionsForItem(item);
    if (pool.length === 0) {
        item.chaosInfusion = null;
        return null;
    }
    let option = rndChoice(pool);
    item.chaosInfusion = rollChaosInfusionOption(option);
    return item.chaosInfusion;
}

function rerollExplicitMods(item, rarity, zoneTier, options = {}) {
    let maxTier = Math.max(1, zoneTier);
    let rerollChaosInfusion = !!(options && options.rerollChaosInfusion);
    let previousInfusion = rerollChaosInfusion ? item.chaosInfusion : null;
    if (rerollChaosInfusion) item.chaosInfusion = null;
    let reservedInfusionCount = previousInfusion ? 1 : 0;
    let locked = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift));
    item.stats = locked.slice();
    let count = 0;
    if (rarity === 'magic') count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === 'rare') count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - getItemExplicitOptionCount(item) - reservedInfusionCount);
    let mods = pickRandomMods(getAvailableMods(item), count);
    mods.forEach(mod => item.stats.push(rollAffixValue(mod, maxTier)));
    if (rerollChaosInfusion) rerollChaosInfusionForItem(item, previousInfusion);
    updateItemName(item);
}


const CHAOS_INFUSER_OPTIONS = [
    { optionId: 'weapon_flatDmg', id: 'flatDmg', min: 12, max: 18, currency: 'chaos', cost: 6, label: '무기 기본 피해', slots: ['무기'] },
    { optionId: 'weapon_pctDmg', id: 'pctDmg', min: 18, max: 26, currency: 'chaos', cost: 6, label: '무기 피해 증가', slots: ['무기'] },
    { optionId: 'weapon_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '무기 공격 속도', slots: ['무기'] },
    { optionId: 'armor_pctHp', id: 'pctHp', min: 12, max: 18, currency: 'exalted', cost: 1, label: '갑옷 생명력 증가', slots: ['갑옷'] },
    { optionId: 'armor_flatHp', id: 'flatHp', min: 55, max: 80, currency: 'transmute', cost: 18, label: '갑옷/방패 최대 생명력', slots: ['갑옷', '방패'] },
    { optionId: 'armor_defensePct', id: 'armorPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '갑옷/방패 방어도 증가', slots: ['갑옷', '방패'] },
    { optionId: 'boots_move', id: 'move', min: 16, max: 22, currency: 'exalted', cost: 1, label: '장화 이동 속도', slots: ['신발'] },
    { optionId: 'boots_evasionPct', id: 'evasionPct', min: 18, max: 26, currency: 'augment', cost: 12, label: '장화 회피 증가', slots: ['신발'] },
    { optionId: 'gloves_aspd', id: 'aspd', min: 8, max: 12, currency: 'alteration', cost: 12, label: '장갑 공격 속도', slots: ['장갑'] },
    { optionId: 'gloves_crit', id: 'crit', min: 4, max: 6, currency: 'exalted', cost: 1, label: '장갑 치명타 확률', slots: ['장갑'] },
    { optionId: 'helmet_flatHp', id: 'flatHp', min: 45, max: 70, currency: 'transmute', cost: 14, label: '투구 최대 생명력', slots: ['투구'] },
    { optionId: 'helmet_critDmg', id: 'critDmg', min: 22, max: 32, currency: 'divine', cost: 1, label: '투구 치명타 피해', slots: ['투구'] },
    { optionId: 'belt_pctHp', id: 'pctHp', min: 10, max: 16, currency: 'exalted', cost: 1, label: '허리띠 생명력 증가', slots: ['허리띠'] },
    { optionId: 'belt_flatHp', id: 'flatHp', min: 50, max: 76, currency: 'transmute', cost: 16, label: '허리띠 최대 생명력', slots: ['허리띠'] },
    { optionId: 'jewelry_pctDmg', id: 'pctDmg', min: 16, max: 24, currency: 'chaos', cost: 6, label: '장신구 피해 증가', slots: ['반지', '목걸이'] },
    { optionId: 'jewelry_resPen', id: 'resPen', min: 4, max: 6, currency: 'chaos', cost: 8, label: '장신구 저항 관통', slots: ['반지', '목걸이'] },
    { optionId: 'res_all', id: 'resAll', min: 4, max: 7, currency: 'chaos', cost: 5, label: '낮은 모든 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_fire', id: 'resF', min: 12, max: 18, currency: 'chaos', cost: 5, label: '화염 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_cold', id: 'resC', min: 12, max: 18, currency: 'chaos', cost: 5, label: '냉기 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'res_light', id: 'resL', min: 12, max: 18, currency: 'chaos', cost: 5, label: '번개 저항', slots: ['투구', '갑옷', '장갑', '신발', '반지', '목걸이', '허리띠', '방패'] },
    { optionId: 'shield_chaos_res', id: 'resChaos', min: 8, max: 12, currency: 'chaos', cost: 6, label: '방패 카오스 저항', slots: ['방패'] },
    { optionId: 'shield_block_pct', id: 'blockChancePct', min: 16, max: 24, currency: 'augment', cost: 12, label: '방패 막기 확률 증가', slots: ['방패'] }
];
function getChaosInfuserOptionsForItem(item) {
    let slot = item && item.slot ? item.slot.replace(/[12]/, '') : '';
    let occupied = getItemOccupiedExplicitModIds(item);
    return CHAOS_INFUSER_OPTIONS.filter(opt => (!opt.slots || opt.slots.includes(slot)) && isDefenseTypeStatAllowed(item, opt.id) && (!occupied.has(opt.id) || (item && item.chaosInfusion && item.chaosInfusion.id === opt.id)));
}
function isChaosInfusionEligibleItem(item) {
    if (!item) return { ok: false, reason: '아이템 미선택' };
    if (item.corrupted) return { ok: false, reason: '타락된 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity === 'unique') return { ok: false, reason: '고유 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity === 'normal' || item.rarity === 'magic') return { ok: false, reason: '일반/마법 등급 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity !== 'rare') return { ok: false, reason: '희귀 장비에만 혼돈 주입을 할 수 있습니다.' };
    let explicitCount = getItemExplicitOptionCount(item);
    if (!item.chaosInfusion && explicitCount >= 6) return { ok: false, reason: '추가 옵션 6줄 제한에 걸려 더 주입할 수 없습니다.' };
    if (item.chaosInfusion && explicitCount > 6) return { ok: false, reason: '추가 옵션이 6줄을 초과했습니다. 기존 주입을 제거하세요.' };
    return { ok: true, reason: '사용 가능' };
}
function rollChaosInfusionOption(option) {
    let min = Number(option && option.min);
    let max = Number(option && option.max);
    if (!Number.isFinite(min)) min = Number(option && option.value) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let val;
    if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(option.id)) {
        let minStep = Math.round(min * 10);
        let maxStep = Math.round(max * 10);
        val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
        min = minStep / 10;
        max = maxStep / 10;
    } else {
        min = Math.floor(min);
        max = Math.floor(max);
        val = min + Math.floor(Math.random() * (max - min + 1));
    }
    return { id: option.id, val: val, valMin: min, valMax: max, tier: 5, statName: getStatName(option.id), temporary: true, source: 'chaosInfuser', sourceOptionId: option.optionId || option.id };
}
function isChaosInfuserUnlocked() {
    return !!(game.chaosInfuserUnlocked || game.woodsmanSimulatorSeenLoop || (game.woodsmanDefeatAttempts || 0) > 0 || (game.journalEntries || []).includes('woodsman'));
}
function getChaosInfuserOption(optionId) {
    return CHAOS_INFUSER_OPTIONS.find(opt => (opt.optionId || opt.id) === optionId || opt.id === optionId) || null;
}
function getChaosInfusionCost(option, item) {
    if (!option) return null;
    let costs = [{ key: option.currency, amount: option.cost }];
    if (item && item.chaosInfusion) costs.push({ key: 'scour', amount: 1 });
    return costs;
}
function canPayCurrencyCosts(costs) {
    return (costs || []).every(row => (game.currencies[row.key] || 0) >= row.amount);
}
function formatCurrencyCosts(costs) {
    return (costs || []).map(row => `${(ORB_DB[row.key] || {}).name || row.key} ${row.amount}`).join(' + ');
}
function payCurrencyCosts(costs) {
    if (!canPayCurrencyCosts(costs)) return false;
    (costs || []).forEach(row => { game.currencies[row.key] = Math.max(0, Math.floor(game.currencies[row.key] || 0) - row.amount); });
    return true;
}
function applyChaosInfusionToSelectedItem(optionId) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!isChaosInfuserUnlocked()) return addLog('나무꾼을 한 번 이상 마주친 뒤 혼돈 주입기를 사용할 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('혼돈 주입 대상 아이템을 선택하세요.', 'attack-monster');
    let eligibility = isChaosInfusionEligibleItem(item);
    if (!eligibility.ok) return addLog(eligibility.reason, 'attack-monster');
    let option = getChaosInfuserOption(optionId);
    if (!option || !P_STATS[option.id]) return;
    if (!getChaosInfuserOptionsForItem(item).some(opt => (opt.optionId || opt.id) === (option.optionId || option.id))) return addLog('이 부위에는 해당 혼돈 주입 옵션을 사용할 수 없습니다.', 'attack-monster');
    let costs = getChaosInfusionCost(option, item);
    if (!canPayCurrencyCosts(costs)) return addLog(`혼돈 주입 재화가 부족합니다. (필요: ${formatCurrencyCosts(costs)})`, 'attack-monster');
    if (!payCurrencyCosts(costs)) return;
    let infusion = rollChaosInfusionOption(option);
    item.chaosInfusion = infusion;
    addLog(`🧪 혼돈 주입: [${item.name}] ${getStatName(option.id)} +${formatValue(option.id, infusion.val)} 부여`, 'loot-rare');
    normalizeItem(item);
    updateStaticUI();
}
function removeChaosInfusionFromSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item || !item.chaosInfusion) return;
    let costs = [{ key: 'scour', amount: 1 }];
    if (!canPayCurrencyCosts(costs)) return addLog(`혼돈 주입 제거에는 ${(ORB_DB.scour || {}).name || '정화의 오브'} 1개가 필요합니다.`, 'attack-monster');
    if (!payCurrencyCosts(costs)) return;
    item.chaosInfusion = null;
    addLog(`🧼 혼돈 주입 제거: [${item.name}]`, 'loot-normal');
    updateStaticUI();
}

window.CHAOS_INFUSER_OPTIONS = CHAOS_INFUSER_OPTIONS;
window.getChaosInfuserOptionsForItem = getChaosInfuserOptionsForItem;
window.isChaosInfusionEligibleItem = isChaosInfusionEligibleItem;
window.getItemExplicitOptionCount = getItemExplicitOptionCount;
window.isChaosInfuserUnlocked = isChaosInfuserUnlocked;
window.getChaosInfusionCost = getChaosInfusionCost;
window.formatCurrencyCosts = formatCurrencyCosts;

function applyEnchantedHoneyToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if ((game.currencies.enchantedHoney || 0) <= 0) return addLog('마력 깃든 벌꿀이 부족합니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length < 4) return addLog('벌꿀 고정은 추가 옵션이 4개 이상일 때만 사용할 수 있습니다.', 'attack-monster');
    if (item.stats.some(stat => stat && stat.lockedByHoney)) return addLog('이 장비에는 이미 고정 옵션이 있습니다.', 'attack-monster');
    let candidates = item.stats.filter(stat => stat && !stat.lockedByRift);
    if (candidates.length <= 0) return addLog('고정 가능한 옵션이 없습니다.', 'attack-monster');
    let pick = candidates[Math.floor(Math.random() * candidates.length)];
    pick.lockedByHoney = true;
    game.currencies.enchantedHoney--;
    addLog(`🍯 [${item.name}] 옵션 고정 적용: ${pick.statName || getStatName(pick.id)}`, 'loot-unique');
    updateStaticUI();
}


function isVoidSocketAccessoryItem(item) {
    let candidates = [];
    if (item && item.slot !== undefined && item.slot !== null) candidates.push(item.slot);
    if (item && Array.isArray(item.slots)) candidates = candidates.concat(item.slots);
    return candidates.some(candidate => {
        let slot = String(candidate || '').replace(/[12]$/, '');
        return slot === '반지' || slot === '목걸이';
    });
}

function applyVenomStingerToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if ((game.currencies.venomStinger || 0) <= 0) return addLog('독벌침이 부족합니다.', 'attack-monster');
    if (item.slot !== '무기') return addLog('독벌침은 무기에만 사용할 수 있습니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let occupiedIds = getItemOccupiedExplicitModIds(item);
    let attackMods = MOD_DB.filter(mod => mod.slots.includes('무기') && ['flatDmg', 'aspd', 'crit', 'critDmg', 'resPen', 'physPctDmg', 'elementalPctDmg', 'chaosPctDmg', 'leech', 'minDmgRoll', 'maxDmgRoll', 'summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonCrit', 'summonCritDmg'].includes(mod.statId || mod.id) && !occupiedIds.has(mod.statId || mod.id));
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

function applyVoidChiselToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (!isVoidSocketAccessoryItem(item)) return addLog('공허의 끌은 반지/목걸이에만 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies.voidChisel || 0) <= 0) return addLog('공허의 끌이 부족합니다.', 'attack-monster');
    item.voidSocket = item.voidSocket || { open: false, jewel: null };
    if (item.voidSocket.open) return addLog('이미 공허 소켓이 뚫려 있습니다.', 'attack-monster');
    item.voidSocket.open = true;
    game.currencies.voidChisel--;
    addLog(`🕳️ [${item.name}]에 공허 소켓을 생성했습니다.`, 'loot-rare');
    updateStaticUI();
}

function applyWoodsmanTouchToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 봉인할 장비를 선택하세요.', 'attack-monster');
    if ((game.currencies.woodsmanTouch || 0) < 1) return addLog('나무꾼의 손길이 부족합니다.', 'attack-monster');
    if (item.loopSealed) return addLog('이미 봉인된 장비입니다.', 'attack-monster');
    game.currencies.woodsmanTouch--;
    item.loopSealed = true;
    addLog(`🌿 [${item.name}]을(를) 나무꾼의 손길로 봉인했습니다. 루프(환생)가 진행되어도 사라지지 않습니다.`, 'loot-unique');
    updateStaticUI();
    queueImportantSave(200);
}

function insertJewelIntoVoidSocket(invIdx) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item || !item.voidSocket || !item.voidSocket.open) return;
    if (item.voidSocket.jewel) return addLog('이미 주얼이 장착되어 있습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    let jewel = game.jewelInventory[invIdx];
    if (!jewel) return;
    if (jewel.noEquipSocket) return addLog(`[${jewel.name}]은(는) 장비 소켓에 사용할 수 없습니다. 주얼 슬롯에만 장착 가능합니다.`, 'attack-monster');
    item.voidSocket.jewel = jewel;
    game.jewelInventory.splice(invIdx, 1);
    closeVoidSocketJewelOverlay();
    addLog(`💠 공허 소켓에 [${jewel.name}] 장착`, 'loot-magic');
    updateStaticUI();
}

function closeVoidSocketJewelOverlay() {
    if (typeof document === 'undefined') return;
    let overlay = document.getElementById('void-socket-jewel-overlay');
    if (overlay) overlay.remove();
}

function formatVoidSocketJewelStatLines(jewel) {
    let stats = typeof getJewelStats === 'function' ? getJewelStats(jewel) : ((jewel && jewel.stats) || []);
    let lines = stats.map(stat => {
        let tone = typeof getJewelStatToneColor === 'function' ? getJewelStatToneColor(stat.id) : '#d7e9ff';
        let value = typeof formatJewelStatValue === 'function' ? formatJewelStatValue(stat.id, stat.val) : stat.val;
        let name = typeof getStatName === 'function' ? getStatName(stat.id) : stat.id;
        return `<div>• <span style="color:${tone};">${escapeHTML(`${name} +${value}`)}</span></div>`;
    });
    return lines.join('') || '<div style="color:#7f8c8d;">옵션 없음</div>';
}

function buildVoidSocketJewelOverlayCards() {
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    return game.jewelInventory.map((jewel, idx) => {
        if (!jewel) return '';
        let stats = formatVoidSocketJewelStatLines(jewel);
        let title = escapeHTML(jewel.name || '주얼');
        return `<button class="item-card" style="text-align:left;min-height:92px;" data-info-tooltip-anchor="1" onmouseenter="showSocketedJewelTooltip(event,'inventory',${idx})" onmousemove="showSocketedJewelTooltip(event,'inventory',${idx})" onmouseleave="hideInfoTooltip()" onclick="insertJewelIntoVoidSocket(${idx})"><strong>${idx + 1}. ${title}</strong><div style="font-size:.8em;line-height:1.35;margin-top:4px;">${stats}</div><div style="margin-top:6px;color:#9fd6ff;font-size:.78em;">장착</div></button>`;
    }).join('') || '<div style="color:#7f8c8d;">장착 가능한 주얼 없음</div>';
}

function openVoidSocketJewelOverlay() {
    let item = getSelectedCraftItem();
    if (!item || !item.voidSocket || !item.voidSocket.open) return addLog('먼저 빈 공허 소켓이 있는 장비를 선택하세요.', 'attack-monster');
    if (item.voidSocket.jewel) return addLog('이미 주얼이 장착되어 있습니다.', 'attack-monster');
    let overlay = document.getElementById('void-socket-jewel-overlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="void-socket-jewel-overlay" style="position:fixed;inset:0;background:rgba(7,10,18,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
        overlay = document.getElementById('void-socket-jewel-overlay');
    }
    let cards = buildVoidSocketJewelOverlayCards();
    overlay.innerHTML = `<div style="width:min(980px,95vw);max-height:92vh;overflow:auto;background:#0f1520;border:1px solid #4b86bd;border-radius:12px;padding:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;"><strong style="color:#9fd6ff;font-size:18px;">공허 소켓 주얼 장착</strong><button onclick="closeVoidSocketJewelOverlay()">닫기</button></div><div style="color:#d7e9ff;margin-bottom:8px;line-height:1.45;">빈 공허 소켓에 장착할 주얼을 선택하세요.</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;max-height:52vh;overflow:auto;padding-right:4px;">${cards}</div><div style="display:flex;justify-content:flex-end;margin-top:10px;"><button class="tutorial-secondary" onclick="closeVoidSocketJewelOverlay()">취소</button></div></div>`;
}

function removeJewelFromVoidSocket() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
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

function getAbyssSocketCapacity(item) {
    if (!item || item.rarity !== 'unique') return 0;
    if (item.uniqueEffectKey === 'abyssSocketOnItem') return Math.max(1, Math.min(2, Math.floor((item.uniqueEffectParams && item.uniqueEffectParams.max) || 2)));
    if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') return Math.max(1, Math.min(2, Math.floor((item.uniqueEffectParams && item.uniqueEffectParams.socketsMax) || 2)));
    return 0;
}

function ensureAbyssSockets(item) {
    let cap = getAbyssSocketCapacity(item);
    if (!item || cap <= 0) return;
    if (Array.isArray(item.abyssSockets) && item.abyssSockets.length > 0) return;
    let p = item.uniqueEffectParams || {};
    let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
    let max = Math.max(min, Math.min(cap, Math.floor(Number(p.max || p.socketsMax || cap))));
    let count = min + Math.floor(Math.random() * (max - min + 1));
    item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
}

function insertJewelIntoAbyssSocket(invIdx, socketIdx) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    ensureAbyssSockets(item);
    if (!item || !Array.isArray(item.abyssSockets) || !item.abyssSockets[socketIdx]) return;
    if (item.abyssSockets[socketIdx].jewel) return addLog('이미 주얼이 장착되어 있습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    let jewel = game.jewelInventory[invIdx];
    if (!jewel) return;
    if (jewel.noEquipSocket) return addLog(`[${jewel.name}]은(는) 장비 소켓에 사용할 수 없습니다. 주얼 슬롯에만 장착 가능합니다.`, 'attack-monster');
    item.abyssSockets[socketIdx].jewel = jewel;
    game.jewelInventory.splice(invIdx, 1);
    addLog(`💠 심연 소켓 #${socketIdx + 1}에 [${jewel.name}] 장착`, 'loot-magic');
    updateStaticUI();
}

function removeJewelFromAbyssSocket(socketIdx) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    ensureAbyssSockets(item);
    let idx = Math.max(0, Math.floor(Number(socketIdx) || 0));
    if (!item || !Array.isArray(item.abyssSockets) || !item.abyssSockets[idx] || !item.abyssSockets[idx].jewel) return;
    game.jewelInventory = game.jewelInventory || [];
    if (game.jewelInventory.length >= getJewelInventoryLimit()) return addLog('주얼 인벤토리가 가득 찼습니다.', 'attack-monster');
    let jewel = item.abyssSockets[idx].jewel;
    game.jewelInventory.push(jewel);
    item.abyssSockets[idx].jewel = null;
    addLog(`심연 소켓 #${idx + 1}에서 [${jewel.name}] 제거`, 'loot-normal');
    updateStaticUI();
}

safeExposeGlobals({ isVoidSocketAccessoryItem, applyVoidChiselToSelectedItem, insertJewelIntoVoidSocket, getSelectedJewelCraftTarget, selectJewelCraftTarget, useCurrencyOnJewel, getJewelCurrencyUseState, openVoidSocketJewelOverlay, closeVoidSocketJewelOverlay, removeJewelFromVoidSocket, insertJewelIntoAbyssSocket, removeJewelFromAbyssSocket, toggleJewelFusionSelection, drawJewelRefine, craftJewelFusion, openJewelFusionOverlay, closeJewelFusionOverlay, confirmJewelFusion, getVoidJewelCraftMaterialIndices, openVoidJewelCraftOverlay, closeVoidJewelOverlay, toggleVoidJewelOverlaySelection, confirmVoidJewelCraft, craftVoidJewel, openVoidJewelFusionOverlay, confirmVoidJewelFusion, fuseVoidJewel, fuseSelectedVoidJewels, tryAmplifyJewelSlot, toggleJewelLock, salvageJewel, equipJewel, unequipJewel, applyBeeswaxToJewel, removeBeeswaxFromJewel });

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
        hiddenTier: Math.max(1, Math.floor(Number(zoneTier) || 1)),
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
    if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
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

const UNIQUE_FIXED_BASE_BY_NAME = {
    '핏빛 톱날': 'bloodletter_blade',
    '절단자의 송곳니': 'executioner_blade',
    '별의 파괴자': 'tempest_pike',
    '균열추': 'executioner_blade',
    '폭풍 군단장의 창끝': 'gale_fang_spear',
    '초월자 파쇄검': 'executioner_blade',
    '세계파쇄자': 'executioner_blade',
    '천공 붕괴자': 'executioner_blade',
    '폭우의 석궁': 'starfall_ballista',
    '칠흑의 연사기': 'tempest_volley',
    '성좌의 주문핵': 'void_archon_staff',
    '영겁의 마도서': 'abyss_chant_staff',
    '황혼의 왕관': 'oracle_circlet',
    '폭풍의 눈': 'starlit_mask',
    '빙결파수 장화': 'phase_boots',
    '대균열의 왕관': 'grand_breach_shard_helm',
    '가호의 갑피': 'fortress_plate',
    '수호 성갑': 'dread_plate',
    '출혈 봉쇄 투구': 'guardian_helm',
    '폭풍 추적자': 'ghost_stride',
    '낙성의 발자취': 'meteor_trace_greaves',
    '쐐기 파편': 'bloodletter_blade',
    '천정 파쇄': 'executioner_blade',
    '지평선 분할자': 'tempest_pike',
    '영원': 'tempest_pike',
    '카옴의 심장': 'dread_plate',
    '대지의 태동': 'underworld_bastion',
    '만화경': 'astral_barrier',
    '무한한 허기': 'underworld_chain',
    '거울 반지': 'mirror_ring',
    '첫 계약': 'apprentice_familiar_wand',
    '무리의 서약': 'spirit_call_wand',
    '묘지종 사령홀': 'gravebind_scepter',
    '칼날폭풍 지휘봉': 'ritual_familiar_staff',
    '뭉툭한 사역 지팡이': 'astral_familiar_staff',
    '효율적인 아콘 사역마 지팡이': 'archon_familiar_staff',
    '새끼 사역마의 인장': 'familiar_loop',
    '군주의 오른손 고리': 'overlord_ring',
    '찌그러진 생존 방패': 'buckler_scrap',
    '철벽의 심장판': 'tower_wall',
    '접이식 방패': 'mirage_guard',
    '별빛 응축기': 'starlit_focus',
    '용비늘 방패': 'runic_scale_guard',
    '성소의 맹세': 'relic_kite',
    '달그림자': 'moon_barrier',
    '아스트랄 수호성': 'astral_barrier',
    '새벽 현자 후드': 'cloth_hood',
    '맹세의 바르부트': 'gilded_barbute',
    '사제의 왕관': 'void_crown',
    '철면피': 'runic_bastion_helm',
    '생존자의 외투': 'leather_vest',
    '어느 성전사의 낡은 판금': 'templar_mail',
    '별무리': 'astral_plate',
    '맹독 외투': 'thornweave_coat',
    '조류의 수호흉갑': 'tidal_vest',
    '숨은 칼날 장갑': 'hide_gloves',
    '보호장갑': 'ward_gauntlets',
    '잔류전류': 'storm_touch',
    '번개 강타': 'stormbind_mitts',
    '헝겊 순례자': 'rag_boots',
    '추적자': 'phase_treader',
    '명사수의 경보': 'deadeye_boots',
    '태양의 불길': 'sunstride_boots',
};

function generateUniqueItem(zoneTier, preferredSlot, forcedUniqueName) {
    let zone = getZone(game.currentZoneId) || {};
    let canDropUniqueInZone = (unique) => {
        if (!unique) return false;
        if (unique.realmCodexOnly) return false;
        if (!unique.dropOnly) return true;
        let dropOnly = unique.dropOnly;
        if (dropOnly.type && zone.type !== dropOnly.type) return false;
        if (dropOnly.id && zone.id !== dropOnly.id) return false;
        if (dropOnly.minFloor && Math.floor(zone.floor || 0) < dropOnly.minFloor) return false;
        return true;
    };
    let forcedUnique = forcedUniqueName ? UNIQUE_DB.find(unique => unique && unique.name === forcedUniqueName) : null;
    let slot = (forcedUnique && forcedUnique.slots && forcedUnique.slots[0]) || preferredSlot || rndChoice(EQUIPMENT_DROP_SLOTS);
    let normalOptions = UNIQUE_DB.filter(unique => !unique.ultraRare && canDropUniqueInZone(unique));
    let chaseOptions = UNIQUE_DB.filter(unique => unique.ultraRare
        && canDropUniqueInZone(unique)
        && zoneTier >= (unique.reqTier || 1));
    let canRollChase = !forcedUnique && chaseOptions.length > 0 && Math.random() < 0.0016;
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter(unique => unique.slots.includes(slot) && zoneTier >= (unique.reqTier || 1));
    if (options.length === 0) options = poolSource.filter(unique => zoneTier >= (unique.reqTier || 1));
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : UNIQUE_DB.filter(unique => canDropUniqueInZone(unique));
    if (options.length === 0) options = UNIQUE_DB.filter(unique => canDropUniqueInZone(unique));
    let unique = forcedUnique || rndChoice(options);
    let uniqueTier = unique.reqTier || zoneTier;
    let fixedBaseId = UNIQUE_FIXED_BASE_BY_NAME[unique.name];
    let base = fixedBaseId ? BASE_ITEM_DB.find(row => row && row.id === fixedBaseId) : null;
    if (base && (base.slot !== unique.slots[0] || !Array.isArray(base.baseStats) || (base.baseStats.length === 0 && unique.name !== '거울 반지'))) base = null;
    if (!base) base = chooseItemBase(unique.slots[0], uniqueTier);
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
        stats: [],
        uniqueEffect: unique.uniqueEffect || '',
        uniqueEffectKey: unique.uniqueEffectKey || '',
        uniqueEffectParams: unique.uniqueEffectParams ? JSON.parse(JSON.stringify(unique.uniqueEffectParams)) : null
    };
    if (item.uniqueEffectKey === 'abyssSocketOnItem' || item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
        let p = item.uniqueEffectParams || {};
        let min = Math.max(1, Math.floor(Number(p.min || p.socketsMin || 1)));
        let max = Math.max(min, Math.floor(Number(p.max || p.socketsMax || 2)));
        let count = min + Math.floor(Math.random() * (max - min + 1));
        item.abyssSockets = Array.from({ length: count }, () => ({ jewel: null }));
        if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp') {
            let ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
            let ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
            p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
            item.uniqueEffectParams = p;
            item.uniqueEffect = `심연 주얼 슬롯 (${count})개, 장착 심연 주얼 효과 +${p.ampPct}%`;
        }
    }
    unique.stats.forEach(stat => {
        let rolled = rollUniqueStatValue(stat);
        let boost = 1;
        let val = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
        let min = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
        let max = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
        item.stats.push({ id: stat.id, val: val, valMin: min, valMax: max, tier: 0, statName: getStatName(stat.id) });
    });
    if (unique.ultraRare && canRollChase) {
        game.seasonChaseUniqueDrops = Array.isArray(game.seasonChaseUniqueDrops) ? game.seasonChaseUniqueDrops : [];
        if (!game.seasonChaseUniqueDrops.includes(unique.name)) game.seasonChaseUniqueDrops.push(unique.name);
        game.seasonChaseUniqueDropped = game.seasonChaseUniqueDrops.length > 0;
        addLog(`🌠 체이싱 유니크 발견! [${unique.name}]`, 'loot-unique');
    }
    maybeApplyExceptionalBase(item);
    return item;
}

function maybeApplyDroppedFossilExclusiveAffix(item, enemy, zoneTier) {
    let mycologistLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
    if (mycologistLv < 6 || !item || item.rarity === 'unique') return item;
    let chance = enemy && enemy.isBoss ? 0.12 : (enemy && enemy.isElite ? 0.06 : 0.018);
    if (Math.random() >= chance) return item;
    let pool = typeof getFossilExclusivePool === 'function'
        ? getFossilExclusivePool(item)
        : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return item;
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= 6) item.stats.pop();
    let roll = rollAffixValue(pickWeightedMod(pool), Math.max(1, Math.floor(zoneTier || item.itemTier || 1)));
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    if (item.rarity === 'normal') item.rarity = 'magic';
    updateItemName(item);
    return item;
}

function generateEquipmentDrop(enemy) {
    let zone = getZone(game.currentZoneId) || {};
    let hiddenTierCap = getRealmEquipmentHiddenTierCap(zone);
    let slot = rndChoice(EQUIPMENT_DROP_SLOTS);
    let base = chooseItemBase(slot, hiddenTierCap);
    let rarity = 'normal';
    let roll = Math.random();
    if (enemy.isBoss) {
        if (roll < 0.04) return generateUniqueItem(hiddenTierCap, slot);
        rarity = roll < 0.36 ? 'rare' : (roll < 0.80 ? 'magic' : 'normal');
    } else if (enemy.isElite) {
        if (roll < 0.02) return generateUniqueItem(hiddenTierCap, slot);
        rarity = roll < 0.24 ? 'rare' : (roll < 0.62 ? 'magic' : 'normal');
    } else {
        if (roll < 0.006) return generateUniqueItem(hiddenTierCap, slot);
        rarity = roll < 0.09 ? 'rare' : (roll < 0.30 ? 'magic' : 'normal');
    }
    let item = createItemFromBase(base, rarity, hiddenTierCap);
    maybeApplyExceptionalBase(item);
    item = maybeApplyDroppedFossilExclusiveAffix(item, enemy, hiddenTierCap);
    return maybeApplyChaosRealmEncroachment(item, enemy, getZone(game.currentZoneId));
}

// 장비 드랍 시, 각 베이스 옵션 줄마다 독립적으로 1% 확률로 '특출'해진다(최대 롤 +20%).
// 줄마다 따로 굴리므로 모든 줄이 동시에 특출날 확률은 1%^(줄 수)로 극악이다.
function maybeApplyExceptionalBase(item) {
    if (!item || !Array.isArray(item.baseStats) || item.baseStats.length === 0) return item;
    let names = [];
    item.baseStats.forEach(stat => {
        if (!stat || Math.random() >= 0.01) return;
        let max = Number.isFinite(stat.baseRollMax) ? stat.baseRollMax
            : (Number.isFinite(stat.valMax) ? stat.valMax : Number(stat.val) || 0);
        let boosted = max * 1.2;
        let usesDecimal = ['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id);
        if (usesDecimal) boosted = Math.round(boosted * 10) / 10;
        else boosted = Math.max(1, Math.floor(boosted));
        stat.val = boosted;
        stat.exceptional = true;
        names.push(stat.statName || getStatName(stat.id));
    });
    if (names.length > 0) {
        item.exceptionalBase = true;
        item.exceptionalStatNames = names;
        item.exceptionalStatName = names.join(', ');
        item.exceptionalAllLines = names.length === item.baseStats.length;
    }
    return item;
}

function awardCurrency(currencyKey, amount) {
    let gain = Number(amount || 0);
    if (gain > 0 && typeof getExpertNodeEffectValue === 'function') {
        let commonPct = Math.max(0, getExpertNodeEffectValue('expertCurrencyGainPct'));
        if (commonPct > 0) gain *= (1 + (commonPct / 100));
        if (currencyKey === 'pollen') {
            let pollenPct = Math.max(0, getExpertNodeEffectValue('pollenGainPct'));
            if (pollenPct > 0) gain *= (1 + (pollenPct / 100));
        }
        if (currencyKey === 'enchantedHoney') {
            let honeyPct = Math.max(0, getExpertNodeEffectValue('honeyGainPct'));
            if (honeyPct > 0) gain *= (1 + (honeyPct / 100));
        }
        if (currencyKey === 'sporeFire' || currencyKey === 'sporeCold' || currencyKey === 'sporeLight') {
            let sporePct = Math.max(0, getExpertNodeEffectValue('mycoSporeGainPct'));
            if (sporePct > 0) gain *= (1 + (sporePct / 100));
        }
        gain = Math.max(1, Math.floor(gain));
    }
    if (currencyKey === 'condensedSkyPower') {
        let st = ensureSkyTowerState();
        st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + gain;
        return gain;
    }
    game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + gain;
    if (currencyKey === 'divine' && gain > 0) {
        showDivineDropBanner(gain);
        addLog(`✨✨ <strong>신성한 오브 +${gain}</strong> 획득!`, 'loot-unique');
    }
    if ((currencyKey === 'chaosKey' || currencyKey === 'coreKey') && gain > 0) {
        // 둘 중 하나라도 습득하면 지도 알람을 띄운다(5차 미궁 시련/재능 개화 도전 알림).
        if (game.noti) game.noti.map = true;
        let keyName = (ORB_DB[currencyKey] && ORB_DB[currencyKey].name) || currencyKey;
        addLog(`🗝️ <strong>${keyName} +${gain}</strong> 획득! 5차 미궁 시련(재능 개화)을 지도에서 확인하세요.`, 'loot-unique');
    }
    if (currencyKey === 'woodsmanTouch' && gain > 0) {
        game.woodsmanTouchSeen = true;
        addLog(`🌿✨ <strong>나무꾼의 손길 +${gain}</strong> 획득! 장비를 봉인해 루프가 지나도 지킬 수 있습니다.`, 'loot-unique');
    }
    if (!game.gemEnhanceUnlocked && (currencyKey === 'bossCore' || currencyKey === 'skyEssence')) {
        game.gemEnhanceUnlocked = true;
        game.noti.skills = true;
        addLog('☁️ 스킬 젬 강화 탭이 개방되었습니다!', 'loot-unique');
    }
    if (!game.talismanUnlocked && (currencyKey === 'sealShard' || currencyKey === 'strongSealShard' || currencyKey === 'radiantSealShard')) {
        game.talismanUnlocked = true;
        game.unlocks.talisman = true;
        game.noti.talisman = true;
        addLog('🧿 부적 탭이 개방되었습니다!', 'loot-unique');
    }
}


function getMappingTicketDrops(enemy, zone, mappingOpened) {
    let drops = [];
    if (!mappingOpened || !zone || zone.type === 'trial' || zone.type === 'seasonBoss') return drops;
    if ((game.season || 1) >= 2) {
        if (enemy.isBoss && Math.random() < 0.044) {
            drops.push([rndChoice(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm']), 1]);
        } else if (enemy.isElite && Math.random() < 0.01) {
            drops.push([rndChoice(['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm']), 1]);
        }
    }
    let highTrialUnlocked = (game.unlockedTrials || []).includes('trial_3')
        || (game.unlockedTrials || []).includes('trial_4')
        || (game.completedTrials || []).includes('trial_3')
        || (game.completedTrials || []).includes('trial_4');
    if (!highTrialUnlocked) return drops;
    let trialKeyChance = enemy.isBoss ? 0.015 : (enemy.isElite ? 0.001 : 0);
    if (trialKeyChance > 0 && Math.random() < trialKeyChance) drops.push(['trialKey3', 1]);
    return drops;
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
    // 신성한 오브: 일반 0.01375% / 정예 0.0825% / 보스 1.25%. 엑잘티드는 신성의 2배. 나무꾼의 손길은 신성 확률의 1/1200(극악).
    let divineChance = enemy.isBoss ? 0.0125 : (enemy.isElite ? 0.000825 : 0.0001375);
    if (bonusRoll(divineChance)) drops.push(['divine', 1]);
    if (bonusRoll(divineChance / 20)) drops.push(['chance', 1]);
    if (bonusRoll(divineChance * 2)) drops.push(['exalted', 1]);
    if (bonusRoll(divineChance / 1200)) drops.push(['woodsmanTouch', 1]);
    let mappingOpened = (game.maxZoneId || 0) >= ABYSS_START_ZONE_ID;
    drops.push(...getMappingTicketDrops(enemy, zone, mappingOpened));
    if (zone.type === 'cosmos' && bonusRoll(enemy.isBoss ? 0.025 : (enemy.isElite ? 0.006 : 0.0015))) drops.push(['annulment', 1]);
    if (zone.type === 'cosmos' && enemy.isBoss && bonusRoll(0.012)) drops.push(['abyssCatalyst', 1]);
    if ((game.season || 1) >= 4 && enemy.isSky && Math.random() < 0.35) drops.push(['skyEssence', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.16) drops.push(['tainted', 1]);
    if ((game.season || 1) >= 5 && enemy.isBoss && Math.random() < 0.03) drops.push(['jewelShard', 3]);
    if ((game.season || 1) >= 5 && enemy.isElite && Math.random() < 0.008) drops.push(['jewelShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.018) drops.push(['sealShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.random() < 0.005) drops.push(['strongSealShard', 1]);
    if ((game.season || 1) >= 6 && zone.type === 'labyrinth' && Math.floor(zone.floor || 0) >= 30 && Math.random() < 0.00052) drops.push(['radiantSealShard', 1]);
    if ((game.season || 1) >= 6 && enemy.isBoss && Math.random() < 0.018) drops.push(['blessing', 1]);
    if ((game.season || 1) >= 6 && enemy.isElite && Math.random() < 0.004) drops.push(['blessing', 1]);
    if ((game.season || 1) >= 6 && enemy.isBoss && zone.type === 'abyss' && Number(zone.id) >= 19 && Math.random() < 0.0125) drops.push(['beastKeyCerberus', 1]);
    if (zone.type === 'chaosRealm') {
        let chaosKeyChance = enemy.isBoss ? 0.012 : (enemy.isElite ? 0.003 : 0.0006);
        if (Math.random() < chaosKeyChance) drops.push(['chaosKey', 1]);
    }
    if (zone.type === 'underworld') {
        let underFloor = Math.max(1, Math.floor(zone.floor || 1));
        let coreKeyChance = enemy.isBoss ? 0.012 : (enemy.isElite ? 0.003 : 0.0006);
        if (Math.random() < coreKeyChance) drops.push(['coreKey', 1]);
        if (Math.random() < 0.05) drops.push(['fossil', 1]);
        if (Math.random() < 0.018) drops.push([rndChoice(['fossilBulwark', 'fossilWedge', 'fossilOld', 'fossilRift']), 1]);
        if (Math.random() < 0.012) drops.push([rndChoice(['deepWhetstone', 'rootIron', 'jewelPolish']), 1]);
        if (underFloor >= 10 && Math.random() < 0.009) drops.push(['runeShard', enemy.isBoss ? 2 : 1]);
        if (typeof canDropCoreCubeBlurred45 === 'function' && canDropCoreCubeBlurred45() && Math.random() < (enemy.isBoss ? 0.18 : (enemy.isElite ? 0.055 : 0.018))) drops.push(['blurred45', 1]);
        if (Math.random() < 0.0032) drops.push(['underCopper', 1]);
        if (Math.random() < 0.0018) drops.push(['underSilver', 1]);
        if (Math.random() < 0.0009) drops.push(['underGold', 1]);
        if (enemy.isBoss && Math.random() < 0.0025) drops.push([rndChoice(['uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos']), 1]);
    }
    if (enemy.isBoss && zone.type === 'abyss' && Math.random() < (abyssScale.bossExtraCurrencyChance || 0)) drops.push(['jewelShard', 2]);
    if ((game.season || 1) >= 2 && zone.type === 'seasonBoss' && enemy.isBoss && Math.random() < 0.22) drops.push(['bossCore', 1]);
    // 진화(transmute)/변화(alteration)/확장(augment) 오브 드랍 확률 절반(출처 무관).
    let halveOrbs = new Set(['transmute', 'alteration', 'augment']);
    drops = drops.filter(d => !(d && halveOrbs.has(d[0]) && Math.random() < 0.5));
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
        salvageItemObject(item, true, { noDivine: true });
        return false;
    }
    if (game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities && game.settings.autoSalvageRarities[item.rarity]) {
        salvageItemObject(item, true);
        if (game.settings.showLootLog) addLog(`🧪 자동해체: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'loot-normal');
        return false;
    }
    // 도감은 실제로 인벤토리에 수집했을 때만 등록한다. (인벤토리가 가득 차 해체된 고유는 도감 미등록)
    if (item.rarity === 'unique') registerUniqueToCodexOnAcquire(item);
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


const UNIQUE_JEWEL_DB = [
    { id:'uj_crown_empty', name:'비어 있는 왕좌', ultra:true, uniqueEffect:'다른 고유 주얼이 없으면 피해 +25%, 젬 레벨 +1 추가', stats:[{id:'pctDmg',val:25},{id:'gemLevel',val:1}] },
    { id:'uj_mirror_heart', name:'거울 심장', ultra:true, uniqueEffect:'반대 슬롯 주얼 복제', stats:[{id:'pctDmg',val:8},{id:'resAll',val:8}] },
    { id:'uj_old_box', name:'오래된 보석함', ultra:true, uniqueEffect:'인벤토리 등급 시너지', stats:[{id:'aspd',val:6},{id:'resAll',val:10}] },
    { id:'uj_hurried_mind', name:'다급해지는 마음', ultra:true, uniqueEffect:'적이 없으면 이동속도 +50%', stats:[{id:'move',val:12},{id:'regen',val:1.2}] },
    { id:'uj_condensed_curse', name:'응축된 저주', ultra:true, uniqueEffect:'저주 최대치 +1, 대상 저주당 최종 피해 +10%', stats:[{id:'dotPctDmg',val:14},{id:'resPen',val:6}] },
    { id:'uj_burning_will', name:'불같은 의지', ultra:true, uniqueEffect:'화염 최대저항/저항 연계 보너스', stats:[{id:'maxResF',val:2},{id:'firePctDmg',val:12}] },
    { id:'uj_closed_eyes', name:'질끈 감은 눈', ultra:true, uniqueEffect:'플레이어 상태이상 면역, 컨디션 버프/적 저주 비활성', stats:[{id:'dr',val:6},{id:'resAll',val:12}] },
    { id:'uj_void', name:'공허', ultra:true, uniqueEffect:'융합 가능 수 6', stats:[{id:'pctDmg',val:-10},{id:'resAll',val:-10}], voidFusionCharges:6 },
    { id:'uj_spark_ember', name:'불씨의 파편', stats:[{id:'firePctDmg',val:14},{id:'igniteChance',val:10}] },
    { id:'uj_frost_nail', name:'서리 못', stats:[{id:'coldPctDmg',val:14},{id:'chillChance',val:10}] },
    { id:'uj_storm_shard', name:'폭풍 조각', stats:[{id:'lightPctDmg',val:14},{id:'shockEffectReducePct',val:12}] },
    { id:'uj_venom_eye', name:'독안', stats:[{id:'chaosPctDmg',val:14},{id:'poisonChance',val:12}] },
    { id:'uj_blood_tine', name:'혈극', stats:[{id:'physPctDmg',val:14},{id:'bleedChance',val:12}] },
    { id:'uj_iron_husk', name:'강철 껍질', stats:[{id:'armorPct',val:16},{id:'dr',val:5}] },
    { id:'uj_windstep', name:'바람걸음', stats:[{id:'move',val:14},{id:'aspd',val:8}] },
    { id:'uj_null_seed', name:'영점 씨앗', stats:[{id:'resPen',val:7},{id:'crit',val:1.2}] },
    { id:'uj_root_charm', name:'뿌리 부적', stats:[{id:'flatHp',val:55},{id:'regen',val:1.5}] },
    { id:'uj_tide_mark', name:'조류 각인', stats:[{id:'dotPctDmg',val:12},{id:'dotTakenDamageReducePct',val:8}] },
    { id:'uj_ash_loop', name:'잿빛 고리', stats:[{id:'critDmg',val:18},{id:'crit',val:1}] },
    { id:'uj_horizon_pin', name:'지평 핀', stats:[{id:'projectilePctDmg',val:16},{id:'minDmgRoll',val:4}] },
    { id:'uj_stone_beat', name:'석맥 박동', stats:[{id:'slamPctDmg',val:16},{id:'maxDmgRoll',val:4}] },
    { id:'uj_lattice', name:'격자 파편', stats:[{id:'resAll',val:10},{id:'energyShieldPct',val:12}] },
    { id:'uj_bramble', name:'가시덩굴', stats:[{id:'evasionPct',val:12},{id:'takenDamageReduceWhen2EnemiesPct',val:6}] },
    { id:'uj_dawn_chip', name:'새벽 조각', stats:[{id:'pctDmg',val:12},{id:'takenDamageReduceWhen1EnemyPct',val:4}] }
];

const JEWEL_SUMMON_OPTION_IDS = new Set(['summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonResPen']);
const JEWEL_SUMMON_OPTION_GROUP = { id: '__summonOptionGroup', name: '소환수 옵션군' };

const JEWEL_OPTION_POOL = [
    { id: 'pctDmg', name: '피해 증폭', min: 4, max: 10 },
    { id: 'physPctDmg', name: '물리 증폭', min: 6, max: 15 },
    { id: 'firePctDmg', name: '화염 증폭', min: 6, max: 15 },
    { id: 'coldPctDmg', name: '냉기 증폭', min: 6, max: 15 },
    { id: 'lightPctDmg', name: '번개 증폭', min: 6, max: 15 },
    { id: 'chaosPctDmg', name: '카오스 증폭', min: 6, max: 15 },
    { id: 'flatHp', name: '생명력 주입', min: 20, max: 45 },
    { id: 'crit', name: '치명 보석', min: 1, max: 3 },
    { id: 'aspd', name: '질주 보석', min: 3, max: 7 },
    { id: 'resAll', name: '수호 보석', min: 4, max: 9 },
    { id: 'resF', name: '화염 수호', min: 8, max: 18 },
    { id: 'resC', name: '냉기 수호', min: 8, max: 18 },
    { id: 'resL', name: '번개 수호', min: 8, max: 18 },
    { id: 'resChaos', name: '공허 수호', min: 4, max: 8 },
    { id: 'physIgnore', name: '절개 파편', min: 2, max: 6 },
    { id: 'dr', name: '강인 파편', min: 3, max: 8 },
    { id: 'resPen', name: '관통 수정', min: 2, max: 6 },
    { id: 'dotPctDmg', name: '부패 수정', min: 4, max: 10 },
    { id: 'regenSuppress', name: '봉쇄 파편', min: 0.5, max: 0.5, step: 0.1 },
    { id: 'minDmgRoll', name: '하한 수정', min: 1, max: 3 },
    { id: 'maxDmgRoll', name: '상한 수정', min: 1, max: 3 },
    { id: 'armorPct', name: '강화 외피', min: 4, max: 10 },
    { id: 'evasionPct', name: '유동 보법', min: 4, max: 10 },
    { id: 'energyShieldPct', name: '보호막 기동', min: 4, max: 10 },
    { id: 'summonFlatDmg', name: '사역 피해 주입', min: 4, max: 12 },
    { id: 'summonPctDmg', name: '지배자의 파편', min: 6, max: 16 },
    { id: 'summonAspd', name: '무리의 가속', min: 3, max: 9, step: 0.5 },
    { id: 'summonHpPct', name: '사역 생명핵', min: 6, max: 16 },
    { id: 'summonCrit', name: '야수의 눈', min: 1, max: 4, step: 0.5 },
    { id: 'summonCritDmg', name: '포식의 송곳니', min: 10, max: 28 },
    { id: 'summonEfficiency', name: '영혼 결속정', min: 4, max: 12 },
    { id: 'summonResPen', name: '사역 관통석', min: 1, max: 5, step: 0.5 },
    { id: 'ailResIgnite', name: '소염 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResShock', name: '절연 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResFreeze', name: '방한 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResPoison', name: '해독 수정', min: 12.5, max: 50, step: 0.5 },
    { id: 'ailResBleed', name: '지혈 수정', min: 12.5, max: 50, step: 0.5 },
];
const JEWEL_HIDDEN_TIER_COUNT = 5;
const JEWEL_PETITE_OPTION_POOL = [
    { id: 'pctDmg', name: '작은 피해결', magic: [1, 1], rare: [1, 2] },
    { id: 'flatHp', name: '작은 생명결', magic: [4, 6], rare: [6, 9] },
    { id: 'crit', name: '작은 치명결', magic: [0.5, 0.5], rare: [0.5, 1] },
    { id: 'aspd', name: '작은 가속결', magic: [1, 1], rare: [1, 2] },
    { id: 'resAll', name: '작은 수호결', magic: [1, 1], rare: [1, 2] },
    { id: 'resPen', name: '작은 관통결', magic: [1, 1], rare: [1, 2] },
    { id: 'regen', name: '작은 재생결', magic: [0.1, 0.1], rare: [0.1, 0.2], step: 0.1 }
];

function getJewelOptionDef(statId) {
    return JEWEL_OPTION_POOL.find(option => option.id === statId) || null;
}

function getJewelRollOptionPool(excludeIds) {
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let hasSummon = JEWEL_OPTION_POOL.some(option => JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    let pool = JEWEL_OPTION_POOL.filter(option => !JEWEL_SUMMON_OPTION_IDS.has(option.id) && !excluded.has(option.id));
    if (hasSummon) pool.push(JEWEL_SUMMON_OPTION_GROUP);
    return pool.length > 0 ? pool : JEWEL_OPTION_POOL;
}

function resolveJewelRollOption(option, excludeIds) {
    if (!option || option.id !== JEWEL_SUMMON_OPTION_GROUP.id) return option || null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = JEWEL_OPTION_POOL.filter(row => JEWEL_SUMMON_OPTION_IDS.has(row.id) && !excluded.has(row.id));
    return rndChoice(pool.length > 0 ? pool : JEWEL_OPTION_POOL.filter(row => JEWEL_SUMMON_OPTION_IDS.has(row.id)));
}

function rollRandomJewelStat(excludeIds) {
    let pool = getJewelRollOptionPool(excludeIds);
    return rollJewelStat(resolveJewelRollOption(rndChoice(pool), excludeIds));
}

const JEWEL_CRAFT_ORB_KEYS = ['transmute', 'augment', 'alteration', 'regal', 'exalted', 'chaos', 'divine', 'annulment'];

function getSelectedJewelCraftIndex() {
    let index = Math.floor(Number(selectedJewelCraftIndex));
    return Number.isInteger(index) && index >= 0 && index < (game.jewelInventory || []).length ? index : -1;
}

function getSelectedJewelCraftTarget() {
    let index = getSelectedJewelCraftIndex();
    return index >= 0 ? game.jewelInventory[index] : null;
}

function selectJewelCraftTarget(idx) {
    let index = getValidJewelInventoryIndex(idx);
    if (index < 0) return;
    selectedJewelCraftIndex = index;
    updateStaticUI();
}

function setJewelStatsAndRarity(jewel, rarity, stats) {
    jewel.rarity = rarity;
    jewel.stats = (stats || []).map(cloneJewelStat).filter(Boolean);
    jewel.hiddenTier = Math.max(1, ...jewel.stats.map(stat => stat.tier || 1));
    jewel.name = `${getJewelRarityLabel(rarity)} 주얼`;
}

function rollJewelCraftStats(count, keepStats) {
    let stats = (keepStats || []).map(cloneJewelStat).filter(Boolean);
    let usedIds = stats.map(stat => stat.id);
    while (stats.length < count) {
        let stat = rollRandomJewelStat(usedIds);
        if (!stat) break;
        stats.push(stat);
        usedIds.push(stat.id);
    }
    return stats;
}

function rerollJewelStatValues(jewel) {
    getJewelStats(jewel).forEach(stat => {
        let option = getJewelOptionDef(stat.id);
        if (!option) return;
        let rerolled = rollJewelStat(option);
        if (!rerolled) return;
        stat.val = rerolled.val;
        stat.valMin = rerolled.valMin;
        stat.valMax = rerolled.valMax;
        stat.tier = rerolled.tier;
    });
}

function isJewelPetiteStat(stat) {
    return !!(stat && stat.petite && !stat.waxBonus);
}

function getJewelCoreStats(jewel) {
    return getJewelStats(jewel).filter(stat => !isJewelPetiteStat(stat));
}

function formatJewelStatValue(statId, value) {
    let option = getJewelOptionDef(statId);
    if (option && Number.isFinite(option.step) && option.step < 1) return Number(value || 0).toFixed(2);
    if (Math.abs(Number(value) || 0) < 1 && !Number.isInteger(Number(value))) return Number(value || 0).toFixed(2);
    return formatValue(statId, value);
}

function getJewelStatHiddenTier(statId, value, valMin, valMax) {
    let min = Number.isFinite(Number(valMin)) ? Number(valMin) : Number(value);
    let max = Number.isFinite(Number(valMax)) ? Number(valMax) : Number(value);
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 1;
    let ratio = (Number(value) - min) / (max - min);
    ratio = Math.max(0, Math.min(0.999999, ratio));
    return Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(ratio * JEWEL_HIDDEN_TIER_COUNT) + 1));
}

function normalizeJewelStat(stat) {
    if (!stat || !stat.id) return null;
    let option = getJewelOptionDef(stat.id);
    let val = Number(stat.val);
    if (!Number.isFinite(val)) val = option ? option.min : 0;
    let valMin = Number.isFinite(Number(stat.valMin)) ? Number(stat.valMin) : (option ? option.min : val);
    let valMax = Number.isFinite(Number(stat.valMax)) ? Number(stat.valMax) : (option ? option.max : val);
    let tier = Number.isFinite(Number(stat.tier)) ? Math.floor(Number(stat.tier)) : getJewelStatHiddenTier(stat.id, val, valMin, valMax);
    tier = Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, tier));
    return { id: stat.id, val: val, valMin: valMin, valMax: valMax, tier: tier, petite: !!stat.petite, waxBonus: !!stat.waxBonus };
}

function cloneJewelStat(stat) {
    let normalized = normalizeJewelStat(stat);
    return normalized ? { ...normalized } : null;
}

function rollJewelStat(option) {
    if (!option) return null;
    let ailResIds = new Set(['ailResIgnite','ailResShock','ailResFreeze','ailResPoison','ailResBleed']);
    if (ailResIds.has(option.id)) {
        let tier = 1 + Math.floor(Math.random() * JEWEL_HIDDEN_TIER_COUNT);
        let tierRanges = { 1:[12.5,25], 2:[17,30], 3:[22,36], 4:[26,43], 5:[30,50] };
        let rng = tierRanges[tier] || [12.5,50];
        let step = 0.5;
        let slots = Math.max(0, Math.floor(((rng[1]-rng[0])/step)+0.000001));
        let val = rng[0] + Math.floor(Math.random() * (slots + 1)) * step;
        val = Number(val.toFixed(2));
        return normalizeJewelStat({ id: option.id, val: val, valMin: rng[0], valMax: rng[1], tier: tier });
    }
    let hasDecimalRange = !Number.isInteger(Number(option.min)) || !Number.isInteger(Number(option.max));
    let step = Number.isFinite(option.step) && option.step > 0 ? option.step : (hasDecimalRange ? 0.1 : 1);
    let slots = Math.max(0, Math.floor(((option.max - option.min) / step) + 0.000001));
    let val = option.min + Math.floor(Math.random() * (slots + 1)) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    return normalizeJewelStat({ id: option.id, val: val, valMin: option.min, valMax: option.max });
}

function makeFixedJewelStat(statId, val) {
    let stat = normalizeJewelStat({ id: statId, val: val, valMin: val, valMax: val, tier: 1 });
    return stat || { id: statId, val: val, valMin: val, valMax: val, tier: 1 };
}

function rollJewelPetiteStat(rarity, excludeIds) {
    if (rarity !== 'magic' && rarity !== 'rare') return null;
    let excluded = new Set(Array.isArray(excludeIds) ? excludeIds : []);
    let pool = JEWEL_PETITE_OPTION_POOL.filter(option => !excluded.has(option.id));
    if (pool.length <= 0) pool = JEWEL_PETITE_OPTION_POOL;
    let option = rndChoice(pool);
    let range = rarity === 'rare' ? option.rare : option.magic;
    let min = range[0];
    let max = range[1];
    let hasDecimalRange = !Number.isInteger(Number(min)) || !Number.isInteger(Number(max));
    let step = Number.isFinite(option.step) && option.step > 0 ? option.step : (hasDecimalRange ? 0.5 : 1);
    let slots = Math.max(0, Math.floor(((max - min) / step) + 0.000001));
    let val = min + Math.floor(Math.random() * (slots + 1)) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let stat = normalizeJewelStat({ id: option.id, val: val, valMin: min, valMax: max, tier: 1, petite: true });
    return stat;
}

function generateJewelDrop(zoneTier) {
    let tier = Math.max(1, Number(zoneTier) || 1);
    let uniqueChance = Math.max(0.003, Math.min(0.03, 0.002 + (tier / 2000)));
    if (Math.random() < uniqueChance) {
        let pool = UNIQUE_JEWEL_DB.filter(v => !v.ultra);
        let ultraPool = UNIQUE_JEWEL_DB.filter(v => v.ultra);
        let canRollUltra = ultraPool.length > 0;
        let baseRow = pool.length > 0 ? rndChoice(pool) : rndChoice(UNIQUE_JEWEL_DB);
        let row = (canRollUltra && Math.random() < 0.08) ? rndChoice(ultraPool) : baseRow;
        // 고유 주얼: 구성은 그대로 두고 파워만 약간(+10%) 상승
        let uniquePower = 1.1;
        let decimalIds = new Set(['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap']);
        let stats = (row.stats || []).map(st => {
            let boosted = decimalIds.has(st.id) ? Math.round(st.val * uniquePower * 10) / 10 : Math.round(st.val * uniquePower);
            return makeFixedJewelStat(st.id, boosted);
        });
        let petite = rollJewelPetiteStat('rare', stats.map(st => st.id));
        if (petite) stats.push(petite);
        return { id: Date.now() + Math.floor(Math.random() * 100000), uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', uniqueLockedFusion: row.id !== 'uj_void', voidFusionCharges: Number.isFinite(row.voidFusionCharges) ? row.voidFusionCharges : 0, hiddenTier: Math.max(1, ...stats.map(st => st.tier || 1)), stats: stats };
    }
    let rarityRoll = Math.random();
    let rarity = 'normal';
    if (rarityRoll > 0.9) rarity = 'rare';
    else if (rarityRoll > 0.55) rarity = 'magic';
    // 등급별 옵션 줄 수: 일반 0줄(진화의 오브로 제작), 매직 1~2줄, 레어 2~4줄
    let lineCount = rarity === 'rare' ? (2 + Math.floor(Math.random() * 3)) : (rarity === 'magic' ? (1 + Math.floor(Math.random() * 2)) : 0);
    let stats = rollJewelCraftStats(lineCount);
    let hiddenTier = stats.length ? Math.max(1, ...stats.map(st => st.tier || 1)) : 1;
    let name = stats.length ? `${getStatName(stats[0].id)} 주얼` : '미가공 주얼';
    return { id: Date.now() + Math.floor(Math.random() * 100000), name: name, tier: 1, hiddenTier: hiddenTier, rarity: rarity, stats: stats };
}

function getJewelStats(jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.map(cloneJewelStat).filter(Boolean);
    if (jewel.stat && jewel.stat.id) return [cloneJewelStat(jewel.stat)].filter(Boolean);
    return [];
}

function getJewelRarityLabel(rarity) {
    if (rarity === 'unique') return '고유';
    if (rarity === 'rare') return '레어';
    if (rarity === 'magic') return '매직';
    return '일반';
}

function getJewelRarityClass(rarity) {
    if (rarity === 'unique') return 'unique';
    if (rarity === 'rare') return 'rare';
    if (rarity === 'magic') return 'magic';
    return 'normal';
}

function salvageJewelObject(jewel, silent) {
    if (!jewel || getJewelStats(jewel).length === 0) return;
    let rarity = jewel.rarity || 'normal';
    let shardGain = rarity === 'unique' ? 18 : (rarity === 'rare' ? 9 : (rarity === 'magic' ? 5 : 2));
    awardCurrency('jewelShard', shardGain);
    if (!silent) addLog(`💠 [${jewel.name}] 주얼 해체 (+주얼 결정 ${shardGain})`, 'loot-normal');
}

function showWaxedJewelCraftRestriction(jewel, actionLabel) {
    let name = jewel && jewel.name ? jewel.name : '밀랍 주얼';
    if (typeof openWaxedItemRestrictionOverlay === 'function') return openWaxedItemRestrictionOverlay(name, actionLabel || '제작');
    addLog(`🐝 [${name}]은 밀랍 처리로 고정되어 ${actionLabel || '제작'}할 수 없습니다.`, 'attack-monster');
}

function showLockedJewelCraftRestriction(jewel, actionLabel) {
    let name = jewel && jewel.name ? jewel.name : '잠금 주얼';
    addLog(`🔒 잠금된 주얼은 ${actionLabel || '제작'} 재료로 사용할 수 없습니다. [${name}]`, 'attack-monster');
}

function getProtectedJewelCraftMaterial(jewels) {
    let materials = Array.isArray(jewels) ? jewels.filter(Boolean) : [];
    let locked = materials.find(jewel => jewel.locked);
    if (locked) return { jewel: locked, reason: 'locked' };
    let waxed = materials.find(jewel => jewel.waxedByBeeswax);
    if (waxed) return { jewel: waxed, reason: 'waxed' };
    return null;
}

function rejectProtectedJewelCraftMaterial(jewels, actionLabel) {
    let protectedMaterial = getProtectedJewelCraftMaterial(jewels);
    if (!protectedMaterial) return false;
    if (protectedMaterial.reason === 'locked') showLockedJewelCraftRestriction(protectedMaterial.jewel, actionLabel);
    else showWaxedJewelCraftRestriction(protectedMaterial.jewel, actionLabel);
    return true;
}

function getJewelCurrencyUseState(currencyKey, jewel) {
    if (!JEWEL_CRAFT_ORB_KEYS.includes(currencyKey)) return { enabled: false, reason: '주얼 제작에 지원하지 않는 재화' };
    if (!jewel) return { enabled: false, reason: '주얼을 선택하세요' };
    if (jewel.locked) return { enabled: false, reason: '잠금 주얼' };
    if (jewel.waxedByBeeswax) return { enabled: false, reason: '밀랍 주얼' };
    if (jewel.rarity === 'unique') return { enabled: false, reason: '고유 주얼 제작 불가' };
    let count = getJewelCoreStats(jewel).length;
    let rarity = jewel.rarity || 'normal';
    if (currencyKey === 'transmute') return { enabled: rarity === 'normal', reason: rarity === 'normal' ? '사용 가능' : '일반 주얼 필요' };
    if (currencyKey === 'augment') return { enabled: rarity === 'magic' && count < 2, reason: rarity === 'magic' && count < 2 ? '사용 가능' : '매직 1줄 주얼 필요' };
    if (currencyKey === 'alteration') return { enabled: rarity === 'magic', reason: rarity === 'magic' ? '사용 가능' : '매직 주얼 필요' };
    if (currencyKey === 'regal') return { enabled: rarity === 'magic' && count < 4, reason: rarity === 'magic' && count < 4 ? '사용 가능' : '매직 주얼 필요' };
    if (currencyKey === 'exalted') return { enabled: rarity === 'rare' && count < 4, reason: rarity === 'rare' && count < 4 ? '사용 가능' : '레어 빈 옵션 필요' };
    if (currencyKey === 'chaos') return { enabled: rarity === 'rare', reason: rarity === 'rare' ? '사용 가능' : '레어 주얼 필요' };
    if (currencyKey === 'divine') return { enabled: count > 0, reason: count > 0 ? '사용 가능' : '옵션 없음' };
    if (currencyKey === 'annulment') return { enabled: count > 0, reason: count > 0 ? '사용 가능' : '제거할 옵션 없음' };
    return { enabled: rarity !== 'normal', reason: rarity !== 'normal' ? '사용 가능' : '일반 주얼에는 사용 불가' };
}

function useCurrencyOnJewel(currencyKey, idx) {
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    let index = idx === undefined ? getSelectedJewelCraftIndex() : getValidJewelInventoryIndex(idx);
    let jewel = index >= 0 ? game.jewelInventory[index] : null;
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('오브가 부족합니다.', 'attack-monster');
    let state = getJewelCurrencyUseState(currencyKey, jewel);
    if (!state.enabled) return addLog(state.reason, 'attack-monster');
    if (currencyKey === 'divine' && !confirm('정말 신성한 오브를 사용하시겠습니까?')) return;
    game.currencies[currencyKey]--;
    applyCurrencyToJewel(currencyKey, jewel);
    selectedJewelCraftIndex = index;
    addLog(`💠 주얼에 ${ORB_DB[currencyKey].name} 사용: [${jewel.name || '주얼'}]`, currencyKey === 'exalted' || currencyKey === 'divine' ? 'loot-unique' : 'loot-magic');
    updateStaticUI();
}

function applyCurrencyToJewel(currencyKey, jewel) {
    let stats = getJewelCoreStats(jewel).map(cloneJewelStat).filter(Boolean);
    if (currencyKey === 'transmute') return setJewelStatsAndRarity(jewel, 'magic', rollJewelCraftStats(1));
    if (currencyKey === 'alteration') return setJewelStatsAndRarity(jewel, 'magic', rollJewelCraftStats(Math.random() < 0.5 ? 1 : 2));
    if (currencyKey === 'chaos') return setJewelStatsAndRarity(jewel, 'rare', rollJewelCraftStats(Math.random() < 0.35 ? 3 : 2));
    if (currencyKey === 'augment') return setJewelStatsAndRarity(jewel, 'magic', rollJewelCraftStats(Math.min(2, stats.length + 1), stats));
    if (currencyKey === 'regal') return setJewelStatsAndRarity(jewel, 'rare', rollJewelCraftStats(Math.min(4, stats.length + 1), stats));
    if (currencyKey === 'exalted') return setJewelStatsAndRarity(jewel, 'rare', rollJewelCraftStats(Math.min(4, stats.length + 1), stats));
    if (currencyKey === 'divine') return rerollJewelStatValues(jewel);
    if (currencyKey === 'annulment') {
        let removeIdx = Math.floor(Math.random() * Math.max(1, stats.length));
        stats.splice(removeIdx, 1);
        return setJewelStatsAndRarity(jewel, stats.length > 0 ? jewel.rarity : 'normal', stats);
    }
    setJewelStatsAndRarity(jewel, 'normal', []);
}

function destroySelectedCraftItem(item) {
    if (typeof getCraftSelectionRef !== 'function' || typeof isCraftSelectionEquip !== 'function') return;
    let ref = getCraftSelectionRef();
    if (isCraftSelectionEquip()) game.equipment[ref] = null;
    else game.inventory = (game.inventory || []).filter(entry => entry !== item);
    if (typeof clearCraftSelection === 'function') clearCraftSelection();
}

function getValidJewelInventoryIndex(idx) {
    let index = Math.floor(Number(idx));
    return Number.isInteger(index) && index >= 0 && index < (game.jewelInventory || []).length ? index : -1;
}

function getVoidJewelCraftPreviewStats(indices) {
    let selected = (indices || []).map(idx => game.jewelInventory[idx]).filter(Boolean);
    return selected.flatMap(jewel => getJewelCoreStats(jewel)).slice(0, 6).map(cloneJewelStat).filter(Boolean);
}

function getVoidJewelFusionPreviewStats(indices) {
    let selected = (indices || []).map(idx => game.jewelInventory[idx]).filter(Boolean);
    let seen = new Set();
    let merged = [];
    selected.flatMap(jewel => getJewelCoreStats(jewel)).forEach(stat => {
        if (merged.length >= 6 || seen.has(stat.id)) return;
        seen.add(stat.id);
        let cloned = cloneJewelStat(stat);
        if (cloned) merged.push(cloned);
    });
    return merged;
}

function getJewelOverlayStatToneColor(statId) {
    if (['firePctDmg', 'resF', 'igniteChance', 'ailResIgnite'].includes(statId)) return '#ff9a76';
    if (['coldPctDmg', 'resC', 'freezeChance', 'ailResFreeze'].includes(statId)) return '#8fd3ff';
    if (['lightPctDmg', 'resL', 'shockChance', 'ailResShock'].includes(statId)) return '#ffe083';
    if (['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance', 'ailResPoison', 'regenSuppress'].includes(statId)) return '#c7a6ff';
    if (['flatHp', 'pctHp', 'regen', 'leech', 'summonHpPct'].includes(statId)) return '#ffb3b3';
    if (['armor', 'armorPct', 'dr', 'physIgnore', 'physPctDmg', 'ailResBleed'].includes(statId)) return '#ffd2a6';
    if (['evasion', 'evasionPct', 'deflectChance', 'deflectDamageReduce'].includes(statId)) return '#baffc2';
    if (['energyShield', 'energyShieldPct', 'energyShieldRegen'].includes(statId)) return '#b9c6ff';
    if (['crit', 'critDmg', 'summonCrit', 'summonCritDmg'].includes(statId)) return '#ffd6f2';
    if (['aspd', 'move', 'summonAspd'].includes(statId)) return '#fff3a8';
    if (['resAll', 'resPen', 'pctDmg', 'minDmgRoll', 'maxDmgRoll'].includes(statId)) return '#9fd6ff';
    if (String(statId || '').startsWith('summon')) return '#d8b4ff';
    return '#d7e9ff';
}

function formatJewelOverlayStatLines(stats, extraLineText) {
    let lines = (stats || []).map(stat => {
        let tone = getJewelOverlayStatToneColor(stat.id);
        let label = `${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}`;
        return `<div>• <span class="jewel-overlay-stat-line" style="color:${tone} !important;">${escapeHTML(label)}</span></div>`;
    });
    if (extraLineText) lines.push(`<div>• ${escapeHTML(extraLineText)}</div>`);
    return lines.length > 0 ? lines.join('') : '<div style="color:#7f8c8d;">선택한 주얼의 유효 옵션이 없습니다.</div>';
}

function getVoidJewelOverlaySelectedIndices(mode) {
    if (voidJewelOverlayState.mode !== mode) return [];
    return (voidJewelOverlayState.selected || []).map(getValidJewelInventoryIndex).filter(idx => idx >= 0)
        .filter((idx, pos, arr) => arr.indexOf(idx) === pos).slice(0, 2);
}

function getVoidUniqueFusionCharges(jewel) {
    if (!jewel || jewel.uniqueId !== 'uj_void') return 0;
    return Math.max(0, Math.floor(Number(jewel.voidFusionCharges) || 0));
}

function canUseVoidUniqueFusion(jewel) {
    return !!(jewel && jewel.uniqueId === 'uj_void' && getVoidUniqueFusionCharges(jewel) > 0);
}

function getVoidUniqueFusionPair(indices) {
    if (!Array.isArray(indices) || indices.length !== 2) return null;
    let first = game.jewelInventory[indices[0]];
    let second = game.jewelInventory[indices[1]];
    if (canUseVoidUniqueFusion(first) && second && second.uniqueId !== 'uj_void') return { voidIndex: indices[0], targetIndex: indices[1] };
    if (canUseVoidUniqueFusion(second) && first && first.uniqueId !== 'uj_void') return { voidIndex: indices[1], targetIndex: indices[0] };
    return null;
}

function buildVoidUniqueFusionPreviewStats(indices) {
    let pair = getVoidUniqueFusionPair(indices);
    if (!pair) return [];
    let targetStats = getJewelCoreStats(game.jewelInventory[pair.targetIndex]).map(cloneJewelStat);
    let usedIds = targetStats.map(stat => stat.id);
    let randomStat = rollRandomJewelStat(usedIds);
    return targetStats.concat(randomStat ? [randomStat] : []).filter(Boolean).slice(0, 4);
}

function buildVoidJewelOverlayCards(mode) {
    let selected = getVoidJewelOverlaySelectedIndices(mode);
    return (game.jewelInventory || []).map((jewel, idx) => {
        if (!jewel) return '';
        let zeroVoidUnique = mode === 'fusion' && jewel.uniqueId === 'uj_void' && getVoidUniqueFusionCharges(jewel) <= 0;
        let disabled = jewel.locked || jewel.waxedByBeeswax || zeroVoidUnique;
        let selectedClass = selected.includes(idx) ? 'selected' : '';
        let stats = formatJewelOverlayStatLines(getJewelCoreStats(jewel));
        let charges = jewel.uniqueId === 'uj_void' ? `<div style="color:${zeroVoidUnique ? '#e07b7b' : '#d7b8ff'};font-size:.78em;margin-top:4px;">공허 합성 가능 수: ${getVoidUniqueFusionCharges(jewel)}회${zeroVoidUnique ? ' · 합성/공허융합 불가' : ''}</div>` : '';
        let badge = jewel.isVoid ? '공허 · ' : '';
        let button = disabled ? 'disabled' : `onclick="toggleVoidJewelOverlaySelection('${mode}',${idx})"`;
        let disabledText = zeroVoidUnique ? '합성 가능 수가 없습니다' : '잠금/밀랍 재료 제외';
        return `<button class="item-card ${selectedClass}" ${button} style="text-align:left;min-height:92px;"><strong>${idx + 1}. ${badge}${escapeHTML(jewel.name || '주얼')}</strong><div style="font-size:.8em;color:#b9d7ff;line-height:1.35;margin-top:4px;">${stats}</div>${charges}${disabled ? `<div style="color:#e07b7b;font-size:.78em;">${disabledText}</div>` : ''}</button>`;
    }).join('') || '<div style="color:#7f8c8d;">보유 주얼이 없습니다.</div>';
}

function getJewelFusionOverlayShellHtml(title, bodyHtml, actionHtml, borderColor) {
    return `<div style="width:min(980px,95vw);max-height:92vh;overflow:auto;background:#0f1520;border:1px solid ${borderColor};border-radius:12px;padding:12px;box-shadow:0 18px 60px rgba(0,0,0,.5);"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px;"><strong style="color:#cdb8ff;font-size:18px;">${title}</strong><button onclick="closeJewelFusionOverlay();closeVoidJewelOverlay()">닫기</button></div>${bodyHtml}<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;"><button class="tutorial-secondary" onclick="closeJewelFusionOverlay();closeVoidJewelOverlay()">취소</button>${actionHtml}</div></div>`;
}

function renderVoidJewelOverlay(mode) {
    let overlay = document.getElementById('void-jewel-overlay');
    if (!overlay) return;
    let selected = getVoidJewelOverlaySelectedIndices(mode);
    let isFusion = mode === 'fusion';
    let uniquePair = isFusion ? getVoidUniqueFusionPair(selected) : null;
    let stats = uniquePair ? buildVoidUniqueFusionPreviewStats(selected) : (isFusion ? getVoidJewelFusionPreviewStats(selected) : getVoidJewelCraftPreviewStats(selected));
    let title = isFusion ? '공허 주얼 융합' : '공허 주얼 제작';
    let rule = uniquePair ? '고유 주얼 [공허]은 재료를 소비하지 않고 함께 선택한 주얼에 무작위 옵션 1줄을 부여하며, 합성 가능 수 1회를 소모합니다.' : '선택한 두 주얼에서 각각 무작위 1~4줄을 계승해 합치고, 중복 제거 후 최대 6줄까지 보유합니다.';
    let extra = '';
    let hasVoidMaterial = selected.some(idx => { let jewel = game.jewelInventory[idx]; return jewel && jewel.isVoid; }) || !!uniquePair;
    let chiselReady = uniquePair || (game.currencies.voidChisel || 0) > 0;
    let hasUniqueTargetSpace = !uniquePair || getJewelCoreStats(game.jewelInventory[uniquePair.targetIndex]).length < 4;
    let canCraft = selected.length === 2 && chiselReady && hasUniqueTargetSpace && (!isFusion || hasVoidMaterial);
    let costLine = uniquePair ? `공허 합성 가능 수: <strong>${getVoidUniqueFusionCharges(game.jewelInventory[uniquePair.voidIndex])}</strong>회 · 필요: <strong>1</strong>회` : `보유 공허의 끌: <strong>${game.currencies.voidChisel || 0}</strong> · 필요: <strong>1</strong>`;
    let body = `<div style="color:#d7caff;margin-bottom:8px;line-height:1.45;">${costLine}<br>${rule}</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;max-height:52vh;overflow:auto;padding-right:4px;">${buildVoidJewelOverlayCards(mode)}</div><div style="margin-top:10px;border:1px solid #334769;border-radius:8px;padding:10px;background:#101722;"><strong>예상 결과</strong><div style="margin-top:6px;color:#d7e9ff;line-height:1.45;">${formatJewelOverlayStatLines(stats, extra)}</div></div>`;
    overlay.innerHTML = getJewelFusionOverlayShellHtml(title, body, `<button onclick="${isFusion ? 'confirmVoidJewelFusion' : 'confirmVoidJewelCraft'}()" ${canCraft ? '' : 'disabled'}>제작</button>`, '#6e57a8');
}

function openVoidJewelOverlay(mode, indices) {
    game.jewelInventory = game.jewelInventory || [];
    let selected = (indices || []).map(getValidJewelInventoryIndex).filter(idx => idx >= 0).slice(0, 2);
    voidJewelOverlayState = { mode, selected };
    let overlay = document.getElementById('void-jewel-overlay');
    if (!overlay) {
        document.body.insertAdjacentHTML('beforeend', '<div id="void-jewel-overlay" style="position:fixed;inset:0;background:rgba(7,6,14,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
    }
    renderVoidJewelOverlay(mode);
}

function openVoidJewelCraftOverlay() {
    openVoidJewelOverlay('craft', getVoidJewelCraftMaterialIndices());
}

function openVoidJewelFusionOverlay() {
    jewelFusionSelection = (jewelFusionSelection || []).filter(idx => getValidJewelInventoryIndex(idx) >= 0);
    openVoidJewelOverlay('fusion', jewelFusionSelection);
}

function closeVoidJewelOverlay() {
    let overlay = document.getElementById('void-jewel-overlay');
    if (overlay) overlay.remove();
    voidJewelOverlayState = { mode: null, selected: [] };
}

function toggleVoidJewelOverlaySelection(mode, idx) {
    let index = getValidJewelInventoryIndex(idx);
    if (index < 0) return;
    let jewel = game.jewelInventory[index];
    if (rejectProtectedJewelCraftMaterial([jewel], mode === 'fusion' ? '공허 주얼 융합' : '공허 주얼 제작')) return;
    if (mode === 'fusion' && jewel.uniqueId === 'uj_void' && getVoidUniqueFusionCharges(jewel) <= 0) return addLog('고유 주얼 [공허]의 합성 가능 수가 없습니다.', 'attack-monster');
    let selected = getVoidJewelOverlaySelectedIndices(mode);
    selected = selected.includes(index) ? selected.filter(v => v !== index) : selected.concat(index).slice(-2);
    voidJewelOverlayState = { mode, selected };
    renderVoidJewelOverlay(mode);
}

function toggleJewelFusionSelection(idx) {
    jewelFusionSelection = jewelFusionSelection || [];
    if (jewelFusionSelection.includes(idx)) jewelFusionSelection = jewelFusionSelection.filter(v => v !== idx);
    else {
        let jewel = (game.jewelInventory || [])[idx];
        if (rejectProtectedJewelCraftMaterial([jewel], '주얼 합성')) return;
        jewelFusionSelection.push(idx);
        if (jewelFusionSelection.length > 2) jewelFusionSelection = jewelFusionSelection.slice(-2);
    }
    updateStaticUI();
}

function getSelectedJewelFusionIndices() {
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    return (jewelFusionSelection || [])
        .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length)
        .filter((idx, pos, arr) => arr.indexOf(idx) === pos)
        .slice(0, 2);
}

function closeJewelFusionOverlay() {
    let overlay = document.getElementById('jewel-fusion-overlay');
    if (overlay) overlay.remove();
}

function buildJewelFusionOverlayCards(indices) {
    return indices.map(idx => {
        let jewel = game.jewelInventory[idx];
        let stats = formatJewelOverlayStatLines(getJewelCoreStats(jewel));
        return `<div class="item-card selected" style="text-align:left;min-height:92px;"><strong>${idx + 1}. ${escapeHTML(jewel.name || '주얼')}</strong><div style="font-size:.8em;line-height:1.35;margin-top:4px;">${stats}</div></div>`;
    }).join('');
}

function renderJewelFusionOverlay(indices) {
    let overlay = document.getElementById('jewel-fusion-overlay');
    if (!overlay) return;
    let amplifiedEl = document.getElementById('chk-jewel-amplified-fusion');
    let useAmplified = !!(amplifiedEl && amplifiedEl.checked);
    let stats = indices.flatMap(idx => getJewelCoreStats(game.jewelInventory[idx]).slice(0, 1)).map(cloneJewelStat).filter(Boolean);
    let extra = useAmplified ? '랜덤 패널티 1줄 + 랜덤 추가옵션 1줄' : '';
    let cost = useAmplified ? 14 : 6;
    let body = `<div style="color:#d7caff;margin-bottom:8px;line-height:1.45;">보유 주얼 결정: <strong>${game.currencies.jewelShard || 0}</strong> · 필요: <strong>${cost}</strong><br>일반 주얼 융합은 1줄 옵션 주얼 2개를 2줄 레어 주얼로 합성합니다. 공허 주얼이 포함되면 공허 융합 오버레이를 사용합니다.</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;max-height:52vh;overflow:auto;padding-right:4px;">${buildJewelFusionOverlayCards(indices)}</div><div style="margin-top:10px;border:1px solid #334769;border-radius:8px;padding:10px;background:#101722;"><strong>예상 결과</strong><div style="margin-top:6px;color:#d7e9ff;line-height:1.45;">${formatJewelOverlayStatLines(stats, extra)}</div></div>`;
    overlay.innerHTML = getJewelFusionOverlayShellHtml('선택한 주얼 융합', body, '<button onclick="confirmJewelFusion()">융합</button>', '#4b86bd');
}

function openJewelFusionOverlay(indices) {
    if (!document.getElementById('jewel-fusion-overlay')) {
        document.body.insertAdjacentHTML('beforeend', '<div id="jewel-fusion-overlay" style="position:fixed;inset:0;background:rgba(7,10,18,.78);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;"></div>');
    }
    renderJewelFusionOverlay(indices);
}

function drawJewelRefine() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    let cost = 12;
    if ((game.currencies.jewelShard || 0) < cost) return addLog(`주얼 가공에 필요한 주얼 결정이 부족합니다. (필요: ${cost})`, 'attack-monster');
    if (game.jewelInventory.length >= getJewelInventoryLimit()) return addLog(`주얼 인벤토리가 가득 찼습니다. (최대 ${getJewelInventoryLimit()})`, 'attack-monster');
    game.currencies.jewelShard -= cost;
    let zoneTier = Math.max(1, Math.floor(((getZone(game.currentZoneId) || {}).tier || 1)));
    let jewel = generateJewelDrop(zoneTier + 8);
    if (!jewel) {
        awardCurrency('jewelShard', cost);
        return addLog('주얼 가공 결과를 생성하지 못했습니다. 소모 재화를 반환합니다.', 'attack-monster');
    }
    game.jewelInventory.push(jewel);
    let lineText = getJewelStats(jewel).map(stat => `${isJewelPetiteStat(stat) ? '쁘띠 ' : ''}${getStatName(stat.id)} +${formatJewelStatValue(stat.id, stat.val)}${Number.isFinite(Number(stat.tier)) && !isJewelPetiteStat(stat) ? ` T${Math.floor(stat.tier)}` : ''}`).join(' / ');
    addLog(`🎰 주얼 가공: ${getJewelRarityLabel(jewel.rarity)} [${jewel.name}] 획득! (${lineText})`, jewel.rarity === 'unique' ? 'loot-unique' : 'loot-rare');
    updateStaticUI();
}

function craftJewelFusion() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let selected = getSelectedJewelFusionIndices();
    if (selected.length !== 2) return addLog('융합할 주얼 2개를 선택하세요.', 'attack-monster');
    let materials = selected.map(idx => game.jewelInventory[idx]);
    if (rejectProtectedJewelCraftMaterial(materials, '주얼 합성')) return;
    if (materials.some(jewel => jewel.uniqueId === 'uj_void' && getVoidUniqueFusionCharges(jewel) <= 0)) return addLog('고유 주얼 [공허]의 합성 가능 수가 없어 합성할 수 없습니다.', 'attack-monster');
    if (materials.some(jewel => jewel.isVoid || jewel.uniqueId === 'uj_void')) return openVoidJewelFusionOverlay();
    return openJewelFusionOverlay(selected);
}

function confirmJewelFusion() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    jewelFusionSelection = (jewelFusionSelection || []).filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length);
    if (jewelFusionSelection.length !== 2) return addLog('융합할 주얼 2개를 선택하세요.', 'attack-monster');
    let sorted = jewelFusionSelection.slice().sort((a, b) => a - b);
    let a = game.jewelInventory[sorted[0]];
    let b = game.jewelInventory[sorted[1]];
    if (rejectProtectedJewelCraftMaterial([a, b], '주얼 합성')) return;
    if ([a, b].some(jewel => jewel.uniqueId === 'uj_void' && getVoidUniqueFusionCharges(jewel) <= 0)) return addLog('고유 주얼 [공허]의 합성 가능 수가 없어 합성할 수 없습니다.', 'attack-monster');
    if (a.isVoid || b.isVoid || a.uniqueId === 'uj_void' || b.uniqueId === 'uj_void') return openVoidJewelFusionOverlay();
    let fusionCost = 6;
    if ((game.currencies.jewelShard || 0) < fusionCost) return addLog(`주얼 결정이 부족합니다. (필요: ${fusionCost})`, 'attack-monster');
    let aStats = getJewelCoreStats(a);
    let bStats = getJewelCoreStats(b);
    function canFuseUnique(j) {
        if (!j || j.rarity !== 'unique') return true;
        if (j.uniqueId === 'uj_void') return (j.voidFusionCharges || 0) > 0;
        return false;
    }
    if (!canFuseUnique(a) || !canFuseUnique(b)) return addLog('고유 주얼은 기본적으로 융합할 수 없습니다.', 'attack-monster');
    if (aStats.length !== 1 || bStats.length !== 1) return addLog('일반 융합은 1줄 옵션 주얼 2개만 가능합니다. (공허 주얼 포함 시 공허 융합 규칙)', 'attack-monster');
    let amplifiedEl = document.getElementById('chk-jewel-amplified-fusion');
    let useAmplified = !!(amplifiedEl && amplifiedEl.checked);
    if (useAmplified && (game.currencies.jewelShard || 0) < 8) return addLog('증폭합성에 필요한 주얼 결정이 부족합니다. (필요: 8)', 'attack-monster');
    game.currencies.jewelShard -= fusionCost;
    if (a && a.uniqueId === 'uj_void' && (a.voidFusionCharges || 0) > 0) a.voidFusionCharges--;
    if (b && b.uniqueId === 'uj_void' && (b.voidFusionCharges || 0) > 0) b.voidFusionCharges--;
    game.jewelInventory.splice(sorted[1], 1);
    game.jewelInventory.splice(sorted[0], 1);
    let fused = {
        id: Date.now() + Math.floor(Math.random() * 100000),
        name: `융합 ${a.name}/${b.name}`,
        tier: Math.max(a.tier || 1, b.tier || 1),
        rarity: 'rare',
        stats: [cloneJewelStat(aStats[0]), cloneJewelStat(bStats[0])].filter(Boolean)
    };
    if (useAmplified) {
        game.currencies.jewelShard -= 8;
        let penaltyPool = [{ id: 'dr', val: -2 }, { id: 'resAll', val: -3 }, { id: 'move', val: -4 }];
        let bonusPool = [{ id: 'targetAny', val: 1 }, { id: 'targetProjectile', val: 1 }, { id: 'targetSlam', val: 1 }, { id: 'crit', val: 4 }, { id: 'resPen', val: 3 }];
        let penalty = rndChoice(penaltyPool);
        let bonus = rndChoice(bonusPool);
        fused.stats.push(makeFixedJewelStat(penalty.id, penalty.val));
        fused.stats.push(makeFixedJewelStat(bonus.id, bonus.val));
        fused.name = `증폭 ${fused.name}`;
    }
    fused.hiddenTier = Math.max(1, ...fused.stats.map(stat => stat.tier || 1));
    game.jewelInventory.push(fused);
    jewelFusionSelection = [];
    closeJewelFusionOverlay();
    addLog(`💠 주얼 융합 성공! [${fused.name}]`, 'loot-unique');
    updateStaticUI();
}

function getVoidJewelCraftMaterialIndices() {
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    let validSelected = (jewelFusionSelection || [])
        .filter(idx => Number.isInteger(idx) && idx >= 0 && idx < game.jewelInventory.length)
        .filter((idx, pos, arr) => arr.indexOf(idx) === pos);
    if (validSelected.length === 2 && !getProtectedJewelCraftMaterial(validSelected.map(idx => game.jewelInventory[idx]))) return validSelected;
    return game.jewelInventory
        .map((jewel, idx) => ({ jewel, idx }))
        .filter(entry => entry.jewel && !entry.jewel.locked && !entry.jewel.waxedByBeeswax)
        .slice(0, 2)
        .map(entry => entry.idx);
}

// 공허 합성: 두 주얼에서 각각 무작위 1~4줄을 계승해 합치고, 중복 제거 후 최대 6줄까지 보유
function pickRandomVoidFusionStats(jewel) {
    let core = getJewelCoreStats(jewel);
    if (core.length <= 0) return [];
    let count = Math.min(core.length, 1 + Math.floor(Math.random() * 4));
    let shuffled = core.slice().sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}
function mergeVoidFusionStats(jewelA, jewelB) {
    let picks = pickRandomVoidFusionStats(jewelA).concat(pickRandomVoidFusionStats(jewelB));
    let seen = new Set();
    let stats = [];
    picks.forEach(stat => {
        if (stats.length >= 6 || seen.has(stat.id)) return;
        seen.add(stat.id);
        let cloned = cloneJewelStat(stat);
        if (cloned) stats.push(cloned);
    });
    if (stats.length === 0) { let st = rollRandomJewelStat([]); if (st) stats.push(st); }
    return stats;
}
function createVoidJewelFromMaterials(materialIndices) {
    let sorted = materialIndices.slice().sort((a, b) => b - a);
    let removed = sorted.map(idx => game.jewelInventory.splice(idx, 1)[0]).reverse();
    let stats = mergeVoidFusionStats(removed[0], removed[1]);
    return { id: Date.now() + Math.floor(Math.random() * 10000), name: '공허 주얼', rarity: 'rare', isVoid: true, hiddenTier: Math.max(1, ...stats.map(stat => stat.tier || 1)), stats, maxLines: 6 };
}

function confirmVoidJewelCraft() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    if ((game.currencies.voidChisel || 0) <= 0) return addLog('공허의 끌이 부족합니다.', 'attack-monster');
    let materialIndices = getVoidJewelOverlaySelectedIndices('craft');
    if (materialIndices.length < 2) return addLog('공허 주얼 제작에는 잠금/밀랍 처리되지 않은 주얼 2개가 필요합니다.', 'attack-monster');
    let craftMaterials = materialIndices.map(idx => game.jewelInventory[idx]);
    if (rejectProtectedJewelCraftMaterial(craftMaterials, '공허 주얼 제작')) return;
    let jewel = createVoidJewelFromMaterials(materialIndices);
    game.currencies.voidChisel--;
    game.jewelInventory.push(jewel);
    jewelFusionSelection = [];
    closeVoidJewelOverlay();
    addLog('🕳️ 공허 주얼 제작 완료 (각 주얼에서 무작위 1~4줄 계승, 최대 6줄)', 'loot-rare');
    updateStaticUI();
}

function craftVoidJewel() {
    openVoidJewelCraftOverlay();
}

function buildVoidFusionJewel(idxA, idxB) {
    let stats = mergeVoidFusionStats(game.jewelInventory[idxA], game.jewelInventory[idxB]);
    return { id: Date.now() + Math.floor(Math.random() * 10000), name: '융합 공허 주얼', rarity: 'rare', isVoid: true, hiddenTier: Math.max(1, ...stats.map(stat => stat.tier || 1)), stats, maxLines: 6 };
}

function fuseWithVoidUniqueJewel(voidIndex, targetIndex) {
    let voidJewel = game.jewelInventory[voidIndex];
    let target = game.jewelInventory[targetIndex];
    let charges = getVoidUniqueFusionCharges(voidJewel);
    if (charges <= 0) { addLog('고유 주얼 [공허]의 합성 가능 수가 없습니다.', 'attack-monster'); return false; }
    if (!target || target.uniqueId === 'uj_void') { addLog('고유 주얼 [공허]과 합성할 다른 주얼을 선택하세요.', 'attack-monster'); return false; }
    let targetStats = getJewelCoreStats(target);
    if (targetStats.length >= 4) { addLog('대상 주얼의 옵션이 가득 차 공허 합성을 할 수 없습니다.', 'attack-monster'); return false; }
    let usedIds = targetStats.map(stat => stat.id);
    let randomStat = rollRandomJewelStat(usedIds);
    if (!randomStat) { addLog('공허 합성 옵션을 생성하지 못했습니다.', 'attack-monster'); return false; }
    target.stats = Array.isArray(target.stats) ? target.stats.concat(randomStat) : [randomStat];
    target.hiddenTier = Math.max(1, ...(target.stats || []).map(stat => stat.tier || 1));
    voidJewel.voidFusionCharges = charges - 1;
    jewelFusionSelection = [];
    addLog(`🕳️ 고유 주얼 [공허] 합성 완료: [${target.name || '주얼'}]에 무작위 옵션 1줄 부여 (${voidJewel.voidFusionCharges}회 남음)`, 'loot-unique');
    updateStaticUI();
    return true;
}

function fuseVoidJewel(idxA, idxB) { if (game.woodsmanBuildLock) { addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster'); return false; }
    game.jewelInventory = game.jewelInventory || [];
    let a = game.jewelInventory[idxA], b = game.jewelInventory[idxB];
    if (!a || !b || idxA === idxB) return false;
    if (rejectProtectedJewelCraftMaterial([a, b], '공허 주얼 융합')) return false;
    if (a.uniqueId === 'uj_void') return fuseWithVoidUniqueJewel(idxA, idxB);
    if (b.uniqueId === 'uj_void') return fuseWithVoidUniqueJewel(idxB, idxA);
    if ((game.currencies.voidChisel || 0) <= 0) { addLog('공허의 끌이 부족합니다.', 'attack-monster'); return false; }
    if (!(a.isVoid || b.isVoid)) { addLog('공허 주얼 융합은 최소 1개의 공허 주얼이 필요합니다.', 'attack-monster'); return false; }
    let newJewel = buildVoidFusionJewel(idxA, idxB);
    let hi = Math.max(idxA, idxB), lo = Math.min(idxA, idxB);
    game.jewelInventory.splice(hi, 1);
    game.jewelInventory.splice(lo, 1);
    game.currencies.voidChisel--;
    game.jewelInventory.push(newJewel);
    jewelFusionSelection = [];
    addLog('🕳️ 공허 주얼 융합 완료 (각 주얼에서 무작위 1~4줄 계승, 최대 6줄)', 'loot-unique');
    updateStaticUI();
    return true;
}

function confirmVoidJewelFusion() {
    let selected = getVoidJewelOverlaySelectedIndices('fusion');
    if (selected.length !== 2) return addLog('공허 융합할 주얼 2개를 선택하세요.', 'attack-monster');
    if (fuseVoidJewel(selected[0], selected[1])) closeVoidJewelOverlay();
}

function fuseSelectedVoidJewels() {
    jewelFusionSelection = (jewelFusionSelection || []).filter(idx => getValidJewelInventoryIndex(idx) >= 0);
    if (jewelFusionSelection.length !== 2) return addLog('공허 융합할 주얼 2개를 선택하세요.', 'attack-monster');
    return openVoidJewelFusionOverlay();
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
    if (level >= 20) return addLog(`주얼 슬롯 ${slotIndex + 1}은 이미 최대 증폭(20강)입니다.`, 'attack-monster');
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
        addLog(`✨ 주얼 슬롯 ${slotIndex + 1} 증폭 성공! ${game.jewelSlotAmplify[slotIndex]}/20`, 'loot-rare');
    }
    updateStaticUI();
}

function toggleJewelLock(idx) {
    game.jewelInventory = game.jewelInventory || [];
    let jewel = game.jewelInventory[idx];
    if (!jewel) return;
    jewel.locked = !jewel.locked;
    addLog(`${jewel.locked ? '🔒' : '🔓'} 주얼 잠금 ${jewel.locked ? '설정' : '해제'}: ${jewel.name || '주얼'}`, 'loot-normal');
    updateStaticUI();
}

function salvageJewel(idx) {
    let jewel = (game.jewelInventory || [])[idx];
    if (!jewel) return;
    if (jewel.locked) return addLog('잠금된 주얼은 해체할 수 없습니다.', 'attack-monster');
    salvageJewelObject(jewel, false);
    game.jewelInventory.splice(idx, 1);
    jewelFusionSelection = [];
    updateStaticUI();
}

function bulkSalvageJewels() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    game.jewelInventory = game.jewelInventory || [];
    let selectedRarities = JEWEL_RARITY_ORDER.filter(rarity => {
        let el = document.getElementById(`chk-jewel-salvage-${rarity}`);
        return el && el.checked;
    });
    if (selectedRarities.length === 0) return addLog('주얼 해체 등급을 선택하세요.', 'attack-monster');
    let kept = [];
    let removed = 0;
    let lockedSkipped = 0;
    game.jewelInventory.forEach(jewel => {
        let rarity = jewel.rarity || 'normal';
        if (selectedRarities.includes(rarity)) {
            if (jewel.locked) { lockedSkipped++; kept.push(jewel); return; }
            salvageJewelObject(jewel, true);
            removed++;
        } else {
            kept.push(jewel);
        }
    });
    if (removed === 0) return addLog(`선택한 등급의 주얼이 없습니다.${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'attack-monster');
    game.jewelInventory = kept;
    jewelFusionSelection = [];
    addLog(`💠 주얼 ${removed}개를 해체해 주얼 결정을 회수했습니다.${lockedSkipped > 0 ? ` (잠금 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}

function equipJewel(idx, slotIndex) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let jewel = (game.jewelInventory || [])[idx];
    if (!jewel) return;
    if (!Array.isArray(game.jewelSlots)) game.jewelSlots = [null, null];
    let old = game.jewelSlots[slotIndex];
    game.jewelSlots[slotIndex] = jewel;
    if (old) game.jewelInventory[idx] = old;
    else game.jewelInventory.splice(idx, 1);
    updateStaticUI();
}

function unequipJewel(slotIndex) { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!Array.isArray(game.jewelSlots)) game.jewelSlots = [null, null];
    let jewel = game.jewelSlots[slotIndex];
    if (!jewel) return;
    game.jewelInventory = game.jewelInventory || [];
    if (game.jewelInventory.length >= getJewelInventoryLimit()) return addLog(`주얼 인벤토리가 가득 찼습니다. (최대 ${getJewelInventoryLimit()})`, 'attack-monster');
    game.jewelInventory.push(jewel);
    game.jewelSlots[slotIndex] = null;
    updateStaticUI();
}

// 심연 군주(워록 wlk8) 키스톤을 반환하면 추가 주얼 슬롯이 사라진다. 사라지는 슬롯에 장착돼 있던
// 주얼을 잃지 않도록 인벤토리로 회수하고(가득 차도 손실 방지를 위해 강제 회수) 슬롯/증폭 배열을 잘라낸다.
function reclaimKeystoneJewelSlots() {
    let maxSlots = typeof getMaxJewelSlotCount === 'function' ? getMaxJewelSlotCount() : 2;
    if (!Array.isArray(game.jewelSlots)) { game.jewelSlots = []; return; }
    if (game.jewelSlots.length <= maxSlots) {
        game.jewelSlots.length = Math.min(game.jewelSlots.length, maxSlots);
        if (Array.isArray(game.jewelSlotAmplify)) game.jewelSlotAmplify.length = Math.min(game.jewelSlotAmplify.length, maxSlots);
        return;
    }
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    let reclaimed = [];
    for (let i = maxSlots; i < game.jewelSlots.length; i++) {
        let jewel = game.jewelSlots[i];
        if (jewel) { game.jewelInventory.push(jewel); reclaimed.push(jewel.name); }
    }
    game.jewelSlots.length = maxSlots;
    if (Array.isArray(game.jewelSlotAmplify)) game.jewelSlotAmplify.length = maxSlots;
    if (reclaimed.length > 0) addLog(`💠 심연 군주 반환: 추가 슬롯의 주얼 ${reclaimed.length}개를 인벤토리로 회수했습니다. (${reclaimed.join(', ')})`, 'loot-normal');
}

function isChaseUniqueItem(item) {
    if (!item || item.rarity !== 'unique') return false;
    if (item.ultraRare || item.chaseUnique) return true;
    let uniqueDef = UNIQUE_DB.find(unique => unique && unique.name === item.name);
    return !!(uniqueDef && uniqueDef.ultraRare);
}
function getUniqueDismantleDivineChance(item) {
    if (!item || item.rarity !== 'unique') return 0;
    if (isChaseUniqueItem(item)) return 1;
    let tier = getItemCraftTier(item);
    return Math.min(0.12, 0.01 + ((tier - 1) / 14) * 0.11);
}
function salvageItemObject(item, silent, options) {
    if (!item) return;
    let noDivine = !!(options && options.noDivine);
    if (item.rarity === 'normal') awardCurrency('transmute', 1);
    else if (item.rarity === 'magic') awardCurrency('augment', 1);
    else if (item.rarity === 'rare') awardCurrency('chaos', 1);
    else if (item.rarity === 'unique') {
        if (!noDivine && Math.random() < getUniqueDismantleDivineChance(item)) awardCurrency('divine', 1);
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
    let f = game.settings.autoSalvageRarities || {};
    if (!game.settings.autoSalvageEnabled) {
        let active = ['normal', 'magic', 'rare', 'unique'].filter(r => f[r]);
        if (active.length === 0) return addLog('자동해체할 등급을 먼저 선택하세요.', 'attack-monster');
    }
    game.settings.autoSalvageEnabled = !game.settings.autoSalvageEnabled;
    syncSalvageControlsFromSettings();
    addLog(`⚙️ 자동해체 ${game.settings.autoSalvageEnabled ? '활성화' : '비활성화'}`, 'loot-normal');
}

function syncJewelSalvageControlsFromSettings() {
    game.settings.jewelAutoSalvageRarities = { normal: false, magic: false, rare: false, unique: false, ...(game.settings.jewelAutoSalvageRarities || {}) };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
        let el = document.getElementById(`chk-jewel-salvage-${rarity}`);
        if (el) el.checked = !!game.settings.jewelAutoSalvageRarities[rarity];
    });
    let btn = document.getElementById('btn-jewel-auto-salvage');
    if (btn) btn.innerText = `주얼 자동해체 ${game.settings.jewelAutoSalvageEnabled ? 'ON' : 'OFF'}`;
}

function updateJewelSalvageSettingsFromUI() {
    game.settings.jewelAutoSalvageRarities = game.settings.jewelAutoSalvageRarities || { normal: false, magic: false, rare: false };
    ['normal', 'magic', 'rare', 'unique'].forEach(rarity => {
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
function getActiveRarityFilterSet() {
    let f = (typeof getInventoryRarityFilter === 'function')
        ? getInventoryRarityFilter()
        : ((game.settings && game.settings.inventoryViewRarities) || { normal: true, magic: true, rare: true, unique: true });
    return ['normal', 'magic', 'rare', 'unique'].filter(rarity => !!f[rarity]);
}

function bulkSalvageSelected() {
    let selectedRarities = getActiveRarityFilterSet();
    if (selectedRarities.length === 0) return addLog('해체할 등급을 먼저 선택하세요. (등급 필터에서 선택)', 'attack-monster');
    let rarityLabels = { normal: '일반', magic: '매직', rare: '레어', unique: '고유' };
    let targetCount = (game.inventory || []).filter(item => item && !item.locked && selectedRarities.includes(item.rarity)).length;
    if (targetCount <= 0) return addLog('선택한 등급의 해체 가능한 장비가 없습니다.', 'attack-monster');
    let labelText = selectedRarities.map(r => rarityLabels[r] || r).join('/');
    if (!confirm(`[${labelText}] 등급 장비 ${targetCount}개를 해체할까요?`)) return;
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

function cycleSporeCraftMode(currencyKey) {
    let allowed = ['transmute','augment','alteration','alchemy','regal','chaos','exalted'];
    if (!allowed.includes(currencyKey)) return;
    game.sporeCraftModes = game.sporeCraftModes || {};
    let modes = getAvailableSporeCraftModes();
    let cur = game.sporeCraftModes[currencyKey] || 'none';
    let curIndex = modes.indexOf(cur);
    let next = modes[((curIndex >= 0 ? curIndex : 0) + 1) % modes.length];
    game.sporeCraftModes[currencyKey] = next;
    updateStaticUI();
}


function getMycologistLevelForCrafting() {
    return typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('mycologist') || 1)) : 1;
}

function getAvailableSporeCraftModes() {
    let mycoLv = getMycologistLevelForCrafting();
    let modes = ['none', 'fire', 'cold', 'light'];
    if (mycoLv >= 10) modes.push('chaos', 'damage');
    return modes;
}

function applyCorruptSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let mycoLv = getMycologistLevelForCrafting();
    if (mycoLv < 7) return addLog('부패 홀씨는 균사학자 Lv.7에 해금됩니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (item.corrupted) return addLog('타락한 아이템에는 사용할 수 없습니다.', 'attack-monster');
    let cost = 8;
    if ((game.currencies.sporeFire || 0) < cost || (game.currencies.sporeCold || 0) < cost || (game.currencies.sporeLight || 0) < cost) return addLog(`부패 홀씨에는 각 속성 홀씨 ${cost}개가 필요합니다.`, 'attack-monster');
    let ids = new Set(['firePctDmg','coldPctDmg','lightPctDmg','elementalPctDmg','resF','resC','resL']);
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let candidates = item.stats.map((stat, idx) => ({ stat, idx })).filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && ids.has(row.stat.id));
    if (candidates.length <= 0) return addLog('제거할 원소 계열 옵션이 없습니다.', 'attack-monster');
    game.currencies.sporeFire -= cost;
    game.currencies.sporeCold -= cost;
    game.currencies.sporeLight -= cost;
    let pick = rndChoice(candidates);
    let removed = item.stats.splice(pick.idx, 1)[0];
    updateItemName(item);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
    addLog(`🍄 부패 홀씨 적용: ${removed.statName || getStatName(removed.id)} 옵션 제거`, 'loot-rare');
    updateStaticUI();
}

function applyRiftSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let mycoLv = getMycologistLevelForCrafting();
    if (mycoLv < 9) return addLog('균열 홀씨는 균사학자 Lv.9에 해금됩니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (item.corrupted) return addLog('타락한 아이템에는 사용할 수 없습니다.', 'attack-monster');
    if ((game.currencies.fossil || 0) < 1 || (game.currencies.sporeFire || 0) < 5 || (game.currencies.sporeCold || 0) < 5 || (game.currencies.sporeLight || 0) < 5) return addLog('균열 홀씨에는 미궁 화석 1개와 각 속성 홀씨 5개가 필요합니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= 6) return addLog('옵션이 가득 차 있습니다.', 'attack-monster');
    let pool = typeof getFossilExclusivePool === 'function' ? getFossilExclusivePool(item) : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return addLog('이 장비 슬롯에 붙일 수 있는 화석 전용 옵션이 없습니다.', 'attack-monster');
    game.currencies.fossil--;
    game.currencies.sporeFire -= 5;
    game.currencies.sporeCold -= 5;
    game.currencies.sporeLight -= 5;
    let roll = rollAffixValue(pickWeightedMod(pool), getItemCraftTier(item));
    roll.fossilExclusiveSpore = true;
    item.stats.push(roll);
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    updateItemName(item);
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
    addLog(`🍄 균열 홀씨 적용: ${roll.statName || getStatName(roll.id)} +${formatValue(roll.id, roll.val)}`, 'loot-unique');
    updateStaticUI();
}

function getJewelBeeswaxPreview(jewel) {
    let stats = getJewelStats(jewel).filter(stat => !stat.waxBonus);
    if (stats.length <= 0) return null;
    let source = stats.map((stat, index) => ({ stat, index }))
        .sort((a, b) => (Number(a.stat.tier || 1) - Number(b.stat.tier || 1)) || (a.index - b.index))[0].stat;
    let waxStat = cloneJewelStat(source);
    waxStat.petite = false;
    waxStat.waxBonus = true;
    waxStat.val = Number((Number(source.val || 0) * 0.35).toFixed(1));
    waxStat.valMin = waxStat.val;
    waxStat.valMax = waxStat.val;
    return { stats, source, waxStat };
}

function applyBeeswaxToJewel(idx) {
    let beeLv = typeof getExpertLevel === 'function' ? Math.max(1, Math.floor(getExpertLevel('beekeeper') || 1)) : 1;
    if (beeLv < 8) return addLog('주얼 밀랍 처리는 양봉업자 Lv.8에 해금됩니다.', 'attack-monster');
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    let jewel = game.jewelInventory[idx];
    if (!jewel) return;
    if (jewel.waxedByBeeswax) return showWaxedJewelCraftRestriction(jewel, '밀랍 재처리');
    if ((game.currencies.beeswax || 0) < 1) return addLog('밀랍이 부족합니다.', 'attack-monster');
    if (!getJewelBeeswaxPreview(jewel)) return addLog('밀랍으로 복제할 주얼 옵션이 없습니다.', 'attack-monster');
    if (typeof openBeeswaxApplicationOverlay === 'function') return openBeeswaxApplicationOverlay('jewel', idx);
    return commitBeeswaxToJewel(idx);
}

function commitBeeswaxToJewel(idx) {
    game.jewelInventory = Array.isArray(game.jewelInventory) ? game.jewelInventory : [];
    let jewel = game.jewelInventory[idx];
    if (!jewel || jewel.waxedByBeeswax || (game.currencies.beeswax || 0) < 1) return false;
    let preview = getJewelBeeswaxPreview(jewel);
    if (!preview) return false;
    game.currencies.beeswax--;
    jewel.stats = preview.stats.concat([preview.waxStat]);
    jewel.waxedByBeeswax = true;
    jewel.name = `밀랍 ${String(jewel.name || '주얼').replace(/^밀랍\s+/, '')}`;
    if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('beekeeper', 'bee_resource_use');
    addLog(`🐝 주얼 밀랍 처리 완료: ${getStatName(preview.waxStat.id)} +${formatJewelStatValue(preview.waxStat.id, preview.waxStat.val)}`, 'loot-rare');
    updateStaticUI();
    return true;
}

function removeBeeswaxFromJewel(idx) {
    let jewel = (game.jewelInventory || [])[idx];
    if (!jewel || !jewel.waxedByBeeswax) return;
    return showWaxedJewelCraftRestriction(jewel, '밀랍 제거');
}

function isRemovableExplicitStat(stat) {
    return !!(stat && !stat.lockedByHoney && !stat.lockedByRift && !stat.encroachedFinal && !stat.unremovable);
}


const QUALITY_ATTRIBUTE_MODES = ['base', 'fire', 'cold', 'light', 'chaos', 'physical', 'defense', 'speed'];
const QUALITY_ATTRIBUTE_LABELS = { base: '기본', fire: '화염', cold: '냉기', light: '번개', chaos: '카오스', physical: '물리', defense: '방어', speed: '속도' };
const QUALITY_ATTRIBUTE_STAT_GROUPS = {
    fire: ['firePctDmg', 'resF', 'igniteChance', 'igniteDamageMultiplierPct'],
    cold: ['coldPctDmg', 'resC', 'freezeChance', 'chillEffect'],
    light: ['lightPctDmg', 'resL', 'shockChance', 'shockEffect'],
    chaos: ['chaosPctDmg', 'resChaos', 'dotPctDmg', 'poisonChance', 'poisonDamageMultiplierPct'],
    physical: ['physPctDmg', 'flatDmg', 'bleedChance', 'physIgnore', 'maxDmgRoll', 'minDmgRoll'],
    defense: ['flatHp', 'pctHp', 'armor', 'armorPct', 'evasion', 'evasionPct', 'energyShield', 'energyShieldPct', 'resAll', 'dr'],
    speed: ['aspd', 'move', 'ds']
};

function getItemQualityAttributeMode(item) {
    let mode = item && typeof item.qualityAttribute === 'string' ? item.qualityAttribute : 'base';
    return QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : 'base';
}

function getItemQualityAttributeLabel(mode) {
    return QUALITY_ATTRIBUTE_LABELS[QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : 'base'] || QUALITY_ATTRIBUTE_LABELS.base;
}

function getNextItemQualityAttributeMode(mode) {
    let current = QUALITY_ATTRIBUTE_MODES.indexOf(QUALITY_ATTRIBUTE_MODES.includes(mode) ? mode : 'base');
    return QUALITY_ATTRIBUTE_MODES[(current + 1) % QUALITY_ATTRIBUTE_MODES.length];
}

function isQualityAttributeStat(mode, statId) {
    let group = QUALITY_ATTRIBUTE_STAT_GROUPS[mode] || [];
    return group.includes(statId);
}

function applyAbyssCatalystToItemQuality(item) {
    let nextMode = getNextItemQualityAttributeMode(getItemQualityAttributeMode(item));
    item.qualityAttribute = nextMode;
    return getItemQualityAttributeLabel(nextMode);
}

function getCosmosBossRelicStatTotals() {
    let atlas = (game && game.cosmosAtlas) || {};
    let equipped = (atlas.equippedStones && typeof atlas.equippedStones === 'object') ? atlas.equippedStones : {};
    let legacyEquippedGalaxy = Math.max(0, Math.min(6, Math.floor(atlas.equippedStoneGalaxy || 0)));
    let optionsByGalaxy = (atlas.bossStoneOptions && typeof atlas.bossStoneOptions === 'object') ? atlas.bossStoneOptions : {};
    let totals = {};
    Object.keys(optionsByGalaxy).forEach(galaxyKey => {
        let galaxy = Math.max(1, Math.min(6, Math.floor(Number(galaxyKey) || 0)));
        let isEquipped = !!equipped[galaxyKey] || (Object.keys(equipped).length === 0 && legacyEquippedGalaxy >= galaxy);
        if (!isEquipped) return;
        (Array.isArray(optionsByGalaxy[galaxyKey]) ? optionsByGalaxy[galaxyKey] : []).forEach(option => {
            if (!option || !option.stat) return;
            totals[option.stat] = (totals[option.stat] || 0) + Number(option.value || 0);
        });
    });
    return totals;
}

safeExposeGlobals({ getItemQualityAttributeMode, getItemQualityAttributeLabel, isQualityAttributeStat, getCosmosBossRelicStatTotals });

function getAnnulmentRemovableStats(item) {
    return (item && Array.isArray(item.stats) ? item.stats : [])
        .map((stat, index) => ({ stat, index }))
        .filter(row => isRemovableExplicitStat(row.stat));
}

function useCurrency(currencyKey) {
    let item = getSelectedCraftItem();
    if (!item) return addLog("먼저 아이템을 선택하세요.", "attack-monster");
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog("오브가 부족합니다.", "attack-monster");
    if (item.corrupted && currencyKey !== 'tainted') return addLog("타락한 아이템은 더 이상 제작할 수 없습니다.", "attack-monster");

    let ok = false;
    if (currencyKey === 'transmute') ok = item.rarity === 'normal';
    else if (currencyKey === 'augment') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 2;
    else if (currencyKey === 'alteration') ok = item.rarity === 'magic';
    else if (currencyKey === 'alchemy') ok = item.rarity === 'normal';
    else if (currencyKey === 'exalted') ok = item.rarity === 'rare' && getItemExplicitOptionCount(item) < 6;
    else if (currencyKey === 'regal') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < 6;
    else if (currencyKey === 'chaos') ok = item.rarity === 'rare';
    else if (currencyKey === 'divine') ok = item.rarity !== 'normal';
    else if (currencyKey === 'chance') ok = item.rarity === 'normal';
    else if (currencyKey === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (currencyKey === 'tainted') ok = !item.corrupted || (isKaleidoscopeShieldItem(item) && getItemExplicitOptionCount(item) <= 6);
    else if (currencyKey === 'blessing') ok = Array.isArray(item.baseStats) && item.baseStats.length > 0;
    else if (currencyKey === 'annulment') ok = getAnnulmentRemovableStats(item).length > 0;
    else if (currencyKey === 'abyssCatalyst') ok = Math.max(0, Math.floor(item.quality || 0)) > 0 && Array.isArray(item.stats) && item.stats.length > 0;
    else if (['deepWhetstone', 'rootIron', 'jewelPolish'].includes(currencyKey)) {
        let slot = String(item.slot || '');
        let isWeapon = slot === '무기';
        let isArmor = ['투구', '갑옷', '장갑', '신발', '허리띠'].includes(slot);
        let isAccessory = ['목걸이', '반지'].includes(slot);
        if (currencyKey === 'deepWhetstone') ok = isWeapon;
        if (currencyKey === 'rootIron') ok = isArmor;
        if (currencyKey === 'jewelPolish') ok = isAccessory;
        ok = ok && Math.max(0, Math.floor(item.quality || 0)) < 20 && !item.qualityLockedByLimitBreak;
    }
    if (!ok) return addLog("지금 선택한 아이템에는 사용할 수 없습니다.", "attack-monster");
    if (currencyKey === 'divine' && !confirm('정말 신성한 오브를 사용하시겠습니까?')) return;

    game.sporeCraftModes = game.sporeCraftModes || {};
    let sporeMode = game.sporeCraftModes[currencyKey] || 'none';
    function consumeSpore(mode) {
        if (mode === 'none') return true;
        let baseCost = 10;
        if (typeof getExpertCombinedCostReduction === 'function') {
            baseCost = Math.max(1, Math.floor(baseCost * (1 - getExpertCombinedCostReduction('sporeCostReducePct'))));
        }
        if (mode === 'fire') { if ((game.currencies.sporeFire || 0) < baseCost) return false; game.currencies.sporeFire -= baseCost; return true; }
        if (mode === 'cold') { if ((game.currencies.sporeCold || 0) < baseCost) return false; game.currencies.sporeCold -= baseCost; return true; }
        if (mode === 'light') { if ((game.currencies.sporeLight || 0) < baseCost) return false; game.currencies.sporeLight -= baseCost; return true; }
        if (mode === 'chaos' || mode === 'damage') {
            if ((game.currencies.sporeFire || 0) < baseCost || (game.currencies.sporeCold || 0) < baseCost || (game.currencies.sporeLight || 0) < baseCost) return false;
            game.currencies.sporeFire -= baseCost; game.currencies.sporeCold -= baseCost; game.currencies.sporeLight -= baseCost; return true;
        }
        return true;
    }
    function getSporeGuaranteedMod(allowReplacement) {
        if (sporeMode === 'none') return null;
        let poolMap = {
            fire: ['firePctDmg','resF','aspd','crit','critDmg','resPen','ds','targetAny','targetProjectile'],
            cold: ['coldPctDmg','resC','crit','critDmg','aspd','ds','targetAny','targetProjectile'],
            light: ['lightPctDmg','resL','aspd','ds','crit','critDmg','targetAny','targetProjectile'],
            chaos: ['chaosPctDmg','resChaos','dotPctDmg','resPen','leech','regenSuppress','targetAny','targetProjectile'],
            damage: ['firePctDmg','coldPctDmg','lightPctDmg','chaosPctDmg','pctDmg','dotPctDmg','critDmg','dr']
        };
        let ids = new Set(poolMap[sporeMode] || []);
        let source = allowReplacement ? MOD_DB.filter(mod => mod.slots.includes(item.slot)) : getAvailableMods(item);
        let avail = source.filter(mod => ids.has(mod.statId || mod.id));
        return pickWeightedMod(avail);
    }
    function rollSporeGuaranteedValue(mod) {
        if (!mod) return null;
        let range = getCraftTierRangeForItem(item, 'spore');
        // 일반 드랍 대비 약 +2티어 보정. 숨겨진 11티어 이상 장비는 홀씨 전용 범위(9~숨은 티어)를 사용한다.
        let boostedTier = Math.min(range.max, Math.max(range.min, getItemCraftTier(item)) + 2);
        let minTier = Math.max(range.min, boostedTier - 1);
        return rollAffixValueInTierRange(mod, minTier, boostedTier);
    }
    function applyGuaranteedToNonLocked(modOverride) {
        let modToApply = modOverride || guaranteedMod || getSporeGuaranteedMod();
        if (!modToApply || !Array.isArray(item.stats) || item.stats.length <= 0) return;
        let idx = item.stats.findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
        if (idx < 0) {
            item.stats.push(rollSporeGuaranteedValue(modToApply));
            return;
        }
        item.stats[idx] = rollSporeGuaranteedValue(modToApply);
    }
    let guaranteedMod = getSporeGuaranteedMod();
    let consumedSpore = false;
    let sporeAffixCurrencies = ['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos'];
    let rerollSporeCurrencies = ['transmute', 'alteration', 'alchemy', 'chaos'];
    let usesSporeAffix = sporeAffixCurrencies.includes(currencyKey);
    let isRerollSporeCurrency = rerollSporeCurrencies.includes(currencyKey);
    let needsPrecheck = usesSporeAffix && !isRerollSporeCurrency;
    if (sporeMode !== 'none' && needsPrecheck && !guaranteedMod) {
        return addLog('선택한 홀씨 계열에서 새로 부여할 수 있는 옵션이 없습니다. 홀씨 모드를 미사용으로 바꾸거나 해당 계열의 기존 옵션을 제거하세요.', 'attack-monster');
    }
    let exaltedMod = null;
    if (currencyKey === 'exalted') {
        exaltedMod = guaranteedMod || pickWeightedMod(getAvailableMods(item));
        if (!exaltedMod) return addLog('이 장비에 추가로 부여할 수 있는 옵션이 없습니다.', 'attack-monster');
    }
    if (sporeMode !== 'none' && usesSporeAffix && !isRerollSporeCurrency) {
        if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster'); if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
        consumedSpore = true;
    }
    game.currencies[currencyKey]--;
    if (['deepWhetstone', 'rootIron', 'jewelPolish'].includes(currencyKey)) {
        item.quality = Math.max(0, Math.min(20, Math.floor(item.quality || 0) + 1));
        addLog(`🛠️ 장비 퀄리티 +1% (현재 ${item.quality}%)`, 'loot-magic');
    } else if (currencyKey === 'transmute') {
        item.rarity = 'magic';
        rerollExplicitMods(item, 'magic', getItemCraftTier(item));
        if (sporeMode !== 'none' && usesSporeAffix) {
            guaranteedMod = getSporeGuaranteedMod(true);
            if (guaranteedMod) {
                if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster'); if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
                consumedSpore = true;
                applyGuaranteedToNonLocked(guaranteedMod);
            } else addLog('홀씨로 부여 가능한 옵션이 없어 홀씨 보장 없이 재련했습니다.', 'attack-monster');
        }
    } else if (currencyKey === 'augment') {
        let mod = guaranteedMod || pickWeightedMod(getAvailableMods(item));
        if (mod) item.stats.push((mod === guaranteedMod) ? rollSporeGuaranteedValue(mod) : rollAffixValue(mod, getItemCraftTier(item)));
        updateItemName(item);
    } else if (currencyKey === 'alteration') {
        rerollExplicitMods(item, 'magic', getItemCraftTier(item));
        if (sporeMode !== 'none' && usesSporeAffix) {
            guaranteedMod = getSporeGuaranteedMod(true);
            if (guaranteedMod) {
                if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster'); if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
                consumedSpore = true;
                applyGuaranteedToNonLocked(guaranteedMod);
            } else addLog('홀씨로 부여 가능한 옵션이 없어 홀씨 보장 없이 재련했습니다.', 'attack-monster');
        }
    } else if (currencyKey === 'alchemy') {
        item.rarity = 'rare';
        rerollExplicitMods(item, 'rare', getItemCraftTier(item), { rerollChaosInfusion: true });
        if (sporeMode !== 'none' && usesSporeAffix) {
            guaranteedMod = getSporeGuaranteedMod(true);
            if (guaranteedMod) {
                if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster'); if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
                consumedSpore = true;
                applyGuaranteedToNonLocked(guaranteedMod);
            } else addLog('홀씨로 부여 가능한 옵션이 없어 홀씨 보장 없이 재련했습니다.', 'attack-monster');
        }
    } else if (currencyKey === 'exalted') {
        item.stats.push((exaltedMod === guaranteedMod) ? rollSporeGuaranteedValue(exaltedMod) : rollAffixValue(exaltedMod, getItemCraftTier(item)));
        updateItemName(item);
    } else if (currencyKey === 'regal') {
        let mod = guaranteedMod || pickWeightedMod(getAvailableMods(item));
        if (mod) item.stats.push((mod === guaranteedMod) ? rollSporeGuaranteedValue(mod) : rollAffixValue(mod, getItemCraftTier(item)));
        item.rarity = 'rare';
        updateItemName(item);
    } else if (currencyKey === 'chaos') {
        rerollExplicitMods(item, 'rare', getItemCraftTier(item), { rerollChaosInfusion: true });
        if (sporeMode !== 'none' && usesSporeAffix) {
            guaranteedMod = getSporeGuaranteedMod(true);
            if (guaranteedMod) {
                if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster'); if (typeof grantExpertExpByAction === 'function') grantExpertExpByAction('mycologist', 'spore_craft');
                consumedSpore = true;
                applyGuaranteedToNonLocked(guaranteedMod);
            } else addLog('홀씨로 부여 가능한 옵션이 없어 홀씨 보장 없이 재련했습니다.', 'attack-monster');
        }
    } else if (currencyKey === 'divine') {
        item.stats.forEach(stat => {
            if (stat.lockedByHoney || stat.lockedByRift) return;
            rerollStoredAffixValue(stat);
        });
        if (item.chaosInfusion && Number.isFinite(Number(item.chaosInfusion.valMin)) && Number.isFinite(Number(item.chaosInfusion.valMax))) {
            rerollStoredAffixValue(item.chaosInfusion);
        }
        if (item.uniqueEffectKey === 'abyssSocketAndJewelAmp' && item.uniqueEffectParams) {
            let p = item.uniqueEffectParams;
            let ampMin = Math.max(1, Math.floor(Number(p.ampMin || 1)));
            let ampMax = Math.max(ampMin, Math.floor(Number(p.ampMax || 100)));
            p.ampPct = ampMin + Math.floor(Math.random() * (ampMax - ampMin + 1));
            item.uniqueEffectParams = p;
            let socketCount = Array.isArray(item.abyssSockets) ? item.abyssSockets.length : Math.max(1, Math.floor(Number(p.socketsMin || 1)));
            item.uniqueEffect = `심연 주얼 슬롯 (${socketCount})개, 장착 심연 주얼 효과 +${p.ampPct}%`;
        }
    } else if (currencyKey === 'chance') {
        if (Math.random() < 0.25) {
            destroySelectedCraftItem(item);
            addLog('💥 기회의 오브: 장비가 파괴되었습니다.', 'attack-monster');
        } else {
            let unique = generateUniqueItem(Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1)), item.slot);
            Object.keys(item).forEach(key => delete item[key]);
            Object.assign(item, unique);
            addLog(`🌟 기회의 오브: [${item.name}] 고유 장비로 진화했습니다.`, 'loot-unique');
        }
    } else if (currencyKey === 'annulment') {
        let removable = getAnnulmentRemovableStats(item);
        if (removable.length <= 0) return addLog('제거할 수 있는 추가 옵션이 없습니다.', 'attack-monster');
        let picked = rndChoice(removable);
        let removed = item.stats.splice(picked.index, 1)[0];
        updateItemName(item);
        addLog(`🕳️ 소멸의 오브: ${removed.statName || getStatName(removed.id)} 옵션 제거`, 'loot-unique');
    } else if (currencyKey === 'scour') {
        item.stats = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift));
        item.chaosInfusion = null;
        item.rarity = item.stats.length > 0 ? 'magic' : 'normal';
        updateItemName(item);
    } else if (currencyKey === 'tainted') {
        item.corrupted = true;
        if (Math.random() < 0.35) {
            let mod = pickWeightedMod(getAvailableMods(item));
            if (mod) {
                item.stats.push(rollAffixValue(mod, getItemCraftTier(item)));
                addLog("🩸 타락 : 추가 옵션이 부여되었습니다.", "loot-unique");
            } else {
                addLog("🩸 타락 : 부여 가능한 추가 옵션이 없습니다.", "attack-monster");
            }
        } else {
            addLog("🩸 타락 : 아이템에 변화가 생기지 않았습니다.", "attack-monster");
        }
    } else if (currencyKey === 'abyssCatalyst') {
        let qualityLabel = applyAbyssCatalystToItemQuality(item);
        addLog(`🧪 심연 촉매: [${item.name}] 퀄리티 속성 → ${qualityLabel}`, 'loot-unique');
    } else if (currencyKey === 'blessing') {
        (item.baseStats || []).forEach(stat => {
            let baseMin = Number.isFinite(Number(stat.baseRollMin)) ? Number(stat.baseRollMin) : Number(stat.valMin);
            let baseMax = Number.isFinite(Number(stat.baseRollMax)) ? Number(stat.baseRollMax) : Number(stat.valMax);
            if (!Number.isFinite(baseMin) || !Number.isFinite(baseMax)) {
                let fallback = Number.isFinite(Number(stat.val)) ? Number(stat.val) : Number(stat.base || 0);
                baseMin = fallback;
                baseMax = fallback;
            }
            if (baseMax < baseMin) {
                let tmp = baseMin;
                baseMin = baseMax;
                baseMax = tmp;
            }
            if (['leech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
                let minStep = Math.round(baseMin * 10);
                let maxStep = Math.round(baseMax * 10);
                stat.val = (minStep + Math.floor(Math.random() * (maxStep - minStep + 1))) / 10;
                baseMin = minStep / 10;
                baseMax = maxStep / 10;
            } else {
                baseMin = Math.floor(baseMin);
                baseMax = Math.floor(baseMax);
                if (baseMax > 0) baseMin = Math.max(1, baseMin);
                stat.val = baseMin + Math.floor(Math.random() * (baseMax - baseMin + 1));
            }
            stat.baseRollMin = baseMin;
            stat.baseRollMax = baseMax;
            stat.valMin = baseMin;
            stat.valMax = baseMax;
        });
    }
    let guaranteedTagNote = (sporeMode !== 'none' && usesSporeAffix && consumedSpore && guaranteedMod) ? ` · 홀씨 보장: ${guaranteedMod.statName}` : '';
    addLog(`⚒️ ${ORB_DB[currencyKey].name} 사용${guaranteedTagNote}`, currencyKey === 'exalted' || currencyKey === 'divine' ? 'loot-unique' : 'loot-magic');
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
