// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
    b.waveExtra = 0;
    b.rewardMomentum = 0;
    b.penaltyLedger = [];
    b.rewardLedger = [];
    b.pendingWaveReward = null;
    b.pendingWaveRewardText = '';
    b.pendingQueenRewards = [];
    b.queenActive = false;
}

function getClassKeystoneDefs(clsKey) {
    let defs = (CLASS_KEYSTONE_DEFS && CLASS_KEYSTONE_DEFS[clsKey]) || [];
    return Array.isArray(defs) ? defs : [];
}

function getPassiveNodeDisplayName(node) {
    if (!node) return '미확인 성좌';
    if (node.intentionalNoEffect) return '무효';
    if (node.title) return _t(node.title);
    return (P_STATS[node.stat] || {}).name || '미확인 성좌';
}

function getPassiveEffectLabel(node) {
    if (!node) return '';
    if (node.intentionalNoEffect) return '효과 없음';
    if (node.effectLabel) return node.effectLabel;
    if (node.kind === 'void') return getVoidPassiveEffectLabel(node.id);
    if (node.kind === 'keystone') return node.desc || '키스톤 효과';
    if (Array.isArray(node.effects) && node.effects.length > 0) {
        const effects = node.connectedDevotionPenalty ? getEffectivePassiveNodeEffects(node) : node.effects;
        const labels = effects.map(effect => {
            // Passive-only options (감전 효율, 냉각 효율, 감전된 적에게 주는 명중 피해) have no item stat; their name and % come from
            // STAT_DISPLAY_NAMES (2026-10-28: the tooltip showed "shockEffect +15").
            const statInfo = P_STATS[effect.stat] || {}, rawName = statInfo.name || getStatName(effect.stat);
            const sign = Number(effect.val) >= 0 ? '+' : '';
            const statName = String(rawName).replace(/\s*\((\+%p|%)\)\s*/g, '').trim();
            const isPct = statInfo.name ? statInfo.isPct : /\(%\)/.test(rawName);
            return `${statName} ${sign}${formatValue(effect.stat, effect.val)}${isPct ? '%' : ''}`;
        });
        if (node.connectedDevotionPenalty) {
            labels.push(`기본 +${node.val}%에서 직접 연결된 헌신 1개 할당마다 각각 ${node.connectedDevotionPenalty}%p 감소`);
        }
        if (node.activationRequirement) {
            const state = getPassiveNodeActivationState(node);
            const statName = state.statId === 'devotion' ? '계시' : getStatName(state.statId);
            const color = state.active ? '#9fe5bb' : '#ffaaaa';
            labels.push(`<span style="color:${color};">${state.active ? _t('활성') : _t('비활성')}, ${statName} ${state.available}/${state.required}</span>`);
        }
        return labels.join('<br>');
    }
    if (!node.stat) return '';
    if (node.stat === 'chaosResElemPenalty') {
        let value = formatValue(node.stat, node.val);
        return _t('카오스 저항 +{value}% 및 모든 원소 저항 -{value2}%', { value, value2: value });
    }
    let stat = P_STATS[node.stat] || {};
    let suffix = stat.isPct ? '%' : '';
    return `${stat.name || node.stat} +${formatValue(node.stat, node.val)}${suffix}`;
}

function getPassiveKindLabel(node) {
    if (!node) return '성좌';
    if (node.kind === 'start') return '직업 시작점';
    if (node.kind === 'apex') return '별끝 특수 노드';
    if (node.kind === 'evolved') return '각성 성좌';
    if (node.kind === 'transcendent') return '초월 성좌';
    if (node.kind === 'core') return '핵심 성좌';
    if (node.kind === 'deadend') return '막다른 길 거점';
    if (node.kind === 'void') return node.voidRing === 'outer' ? '직업 공허 소켓' : '공허 패시브';
    if (node.kind === 'hub') return '교차 거점';
    if (node.sourceType === 'keystone' || node.kind === 'keystone') return '키스톤';
    if (node.sourceType === 'major' || node.kind === 'major') return '주요 패시브';
    if (node.sourceType === 'normal' || node.kind === 'node') return '일반 패시브';
    if (node.sourceType === 'minor' || node.sourceType === 'assist'
        || node.kind === 'path' || node.kind === 'assist') return '소형 패시브';
    return '보조 노드';
}

function getPassiveNodeVisualRadius(node) {
    if (!node) return 6;
    if (node.kind === 'hub') return 26;
    const kindRadius = PASSIVE_NODE_KIND_RADIUS[node.kind];
    if (kindRadius) return kindRadius;
    const sourceRadius = PASSIVE_NODE_SOURCE_RADIUS[node.sourceType];
    if (sourceRadius) return sourceRadius;
    if (node.tier === 0) return 34;
    if (node.tier >= 3) return 24;
    if (node.tier === 2 || node.kind === 'ring' || node.kind === 'inner') return 14;
    return 9;
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

// Canvas line widths that stay readable at any camera zoom: `px` screen pixels, never thinner than `minWorld`.
function passiveTreeScreenWidth(px, minWorld) {
    const zoom = typeof camZoom === 'number' && camZoom > 0 ? camZoom : 1;
    return Math.max(minWorld || 0, px / zoom);
}

// Adds one link to the current path, stopping at both node rims so links never cross node artwork.
function tracePassiveLinkSegment(ctx, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.hypot(dx, dy);
    if (!Number.isFinite(distance) || distance <= 0) return false;
    const startInset = getPassiveNodeVisualRadius(a) + 2;
    const endInset = getPassiveNodeVisualRadius(b) + 2;
    if (distance <= startInset + endInset) return false;
    const ux = dx / distance;
    const uy = dy / distance;
    ctx.moveTo(a.x + ux * startInset, a.y + uy * startInset);
    ctx.lineTo(b.x - ux * endInset, b.y - uy * endInset);
    return true;
}

function getPassiveNodeIconFamily(node) {
    if (!node) return null;
    if (node.kind === 'void') return 'void';
    return (node.iconFamily && PASSIVE_ICON_ATLAS_CELL[node.iconFamily] ? node.iconFamily : null)
        || PASSIVE_ICON_FAMILY[node.stat]
        || PASSIVE_ICON_FAMILY[node.archetype]
        || PASSIVE_ICON_FAMILY[node.cat]
        || PASSIVE_START_ICON_FAMILY[node.startClassId]
        || null;
}

function getPassiveTreeArtImage(key) {
    const image = battleAssets && battleAssets.images ? battleAssets.images[key] : null;
    if (!image || !image.complete || !(image.naturalWidth || image.width)) return null;
    return image;
}

/** 새 트리의 키스톤은 옛 키스톤의 효과를 이름만 바꿔 쓰기도 한다(keystoneEffectId). 그때는 그 키스톤의 그림을 쓴다. */
function getPassiveKeystoneIconCell(node) {
    return PASSIVE_KEYSTONE_ICON_CELL_BY_ID[node.id] || PASSIVE_KEYSTONE_ICON_CELL_BY_ID[String(node.keystoneEffectId || '').replace('keystone:', '')];
}

function getPassiveNodeAtlasArt(node) {
    let keystoneCell = node && node.kind === 'keystone' ? getPassiveKeystoneIconCell(node) : null;
    let keystoneImage = keystoneCell && getPassiveTreeArtImage('passiveTreeKeystoneIcons');
    if (keystoneImage) return { image: keystoneImage, cell: keystoneCell, columns: 6, rows: PASSIVE_KEYSTONE_ICON_ATLAS_ROWS };
    let family = node && (PASSIVE_NOTABLE_ICON_ATLAS_CELL[node.iconFamily]
        ? node.iconFamily
        : PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT[node.stat]);
    let notableCell = PASSIVE_NOTABLE_ICON_ATLAS_CELL[family];
    let notableImage = notableCell && getPassiveTreeArtImage('passiveTreeNotableIcons');
    if (notableImage) return { image: notableImage, cell: notableCell, columns: 4, rows: 3 };
    let baseCell = PASSIVE_ICON_ATLAS_CELL[getPassiveNodeIconFamily(node)];
    let baseImage = baseCell && getPassiveTreeArtImage('passiveTreeIcons');
    return baseImage ? { image: baseImage, cell: baseCell, columns: PASSIVE_ICON_ATLAS_COLUMNS, rows: PASSIVE_ICON_ATLAS_ROWS } : null;
}

function isPassiveFramedNode(node) {
    if (!node) return false;
    return node.kind === 'start' || node.kind === 'keystone' || node.kind === 'void'
        || node.kind === 'hub' || node.kind === 'apex' || node.kind === 'core'
        || node.kind === 'major' || node.tier >= 3;
}

function isPassiveImageSlotNode(node) {
    return !!node && node.kind === 'void';
}

function tracePassiveBladeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(0, r * 0.45);
    ctx.moveTo(-r * 0.45, r * 0.22); ctx.lineTo(r * 0.45, r * 0.22);
    ctx.moveTo(-r * 0.18, r); ctx.lineTo(0, r * 0.45); ctx.lineTo(r * 0.18, r);
}

function tracePassiveProjectileIcon(ctx, r) {
    ctx.moveTo(-r, r * 0.5); ctx.lineTo(r, -r * 0.5);
    ctx.moveTo(r, -r * 0.5); ctx.lineTo(r * 0.35, -r * 0.62);
    ctx.moveTo(r, -r * 0.5); ctx.lineTo(r * 0.62, r * 0.05);
}

function tracePassiveShieldIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.72, -r * 0.52); ctx.lineTo(r * 0.56, r * 0.45);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.56, r * 0.45); ctx.lineTo(-r * 0.72, -r * 0.52); ctx.closePath();
}

function tracePassivePotionIcon(ctx, r) {
    ctx.moveTo(-r * 0.34, -r); ctx.lineTo(r * 0.34, -r); ctx.lineTo(r * 0.3, -r * 0.42);
    ctx.lineTo(r * 0.72, r * 0.62); ctx.lineTo(r * 0.45, r); ctx.lineTo(-r * 0.45, r);
    ctx.lineTo(-r * 0.72, r * 0.62); ctx.lineTo(-r * 0.3, -r * 0.42); ctx.closePath();
}

function tracePassiveEyeIcon(ctx, r) {
    ctx.moveTo(-r, 0); ctx.lineTo(0, -r * 0.62); ctx.lineTo(r, 0); ctx.lineTo(0, r * 0.62); ctx.closePath();
    ctx.moveTo(r * 0.28, 0); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
}

function tracePassiveCubeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.82, -r * 0.45); ctx.lineTo(r * 0.82, r * 0.45);
    ctx.lineTo(0, r); ctx.lineTo(-r * 0.82, r * 0.45); ctx.lineTo(-r * 0.82, -r * 0.45); ctx.closePath();
    ctx.moveTo(0, 0); ctx.lineTo(0, r); ctx.moveTo(0, 0); ctx.lineTo(r * 0.82, -r * 0.45); ctx.moveTo(0, 0); ctx.lineTo(-r * 0.82, -r * 0.45);
}

function tracePassiveCycleIcon(ctx, r) {
    ctx.arc(0, 0, r * 0.72, -Math.PI * 0.15, Math.PI * 1.25);
    ctx.moveTo(-r * 0.62, -r * 0.45); ctx.lineTo(-r * 0.92, -r * 0.16); ctx.lineTo(-r * 0.48, -r * 0.08);
}

function tracePassiveElementIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.7, r * 0.48); ctx.lineTo(0, r); ctx.lineTo(-r * 0.7, r * 0.48); ctx.closePath();
    ctx.moveTo(0, -r * 0.42); ctx.lineTo(r * 0.25, r * 0.32); ctx.lineTo(-r * 0.25, r * 0.32); ctx.closePath();
}

function tracePassiveChaosIcon(ctx, r) {
    ctx.moveTo(-r * 0.9, -r * 0.2); ctx.lineTo(-r * 0.25, -r * 0.72); ctx.lineTo(r * 0.5, -r * 0.5);
    ctx.lineTo(r * 0.9, r * 0.18); ctx.lineTo(r * 0.2, r * 0.76); ctx.lineTo(-r * 0.58, r * 0.5); ctx.closePath();
    ctx.moveTo(r * 0.24, 0); ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2);
}

function tracePassiveLifeIcon(ctx, r) {
    ctx.moveTo(0, r); ctx.lineTo(-r * 0.82, r * 0.06); ctx.lineTo(-r * 0.58, -r * 0.62);
    ctx.lineTo(0, -r * 0.28); ctx.lineTo(r * 0.58, -r * 0.62); ctx.lineTo(r * 0.82, r * 0.06); ctx.closePath();
}

function tracePassiveArcaneIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.86, r * 0.52); ctx.lineTo(-r * 0.86, r * 0.52); ctx.closePath();
    ctx.moveTo(0, -r * 0.38); ctx.lineTo(0, r * 0.52);
}

function tracePassiveSummonIcon(ctx, r) {
    ctx.moveTo(r * 0.45, r * 0.3); ctx.arc(0, r * 0.3, r * 0.45, 0, Math.PI * 2);
    [-0.58, -0.2, 0.2, 0.58].forEach(x => { ctx.moveTo(x * r + r * 0.18, -r * 0.38); ctx.arc(x * r, -r * 0.38, r * 0.18, 0, Math.PI * 2); });
}

function tracePassivePrecisionIcon(ctx, r) {
    ctx.moveTo(r, 0); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.moveTo(r * 0.42, 0); ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
    ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r);
}

function tracePassiveWindIcon(ctx, r) {
    ctx.moveTo(-r, -r * 0.48); ctx.lineTo(r * 0.55, -r * 0.48); ctx.lineTo(r, -r * 0.2);
    ctx.moveTo(-r * 0.7, 0); ctx.lineTo(r * 0.35, 0); ctx.lineTo(r * 0.72, r * 0.25);
    ctx.moveTo(-r, r * 0.48); ctx.lineTo(r * 0.58, r * 0.48);
}

function tracePassiveAttributeIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r * 0.3, -r * 0.28); ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.3, r * 0.28); ctx.lineTo(0, r); ctx.lineTo(-r * 0.3, r * 0.28);
    ctx.lineTo(-r, 0); ctx.lineTo(-r * 0.3, -r * 0.28); ctx.closePath();
}

function tracePassiveVoidIcon(ctx, r) {
    ctx.moveTo(0, -r); ctx.lineTo(r, 0); ctx.lineTo(0, r); ctx.lineTo(-r, 0); ctx.closePath();
    ctx.moveTo(r * 0.48, 0); ctx.arc(0, 0, r * 0.48, 0, Math.PI * 2);
}

function tracePassiveConstellationIcon(ctx, r) {
    const points = [[-0.72, -0.32], [0.12, -0.72], [0.72, 0.1], [-0.18, 0.72]];
    points.forEach(([x, y], index) => {
        const next = points[(index + 1) % points.length];
        ctx.moveTo(x * r, y * r); ctx.lineTo(next[0] * r, next[1] * r);
        ctx.moveTo(x * r + r * 0.12, y * r); ctx.arc(x * r, y * r, r * 0.12, 0, Math.PI * 2);
    });
}

function drawPassiveNodeIcon(ctx, node, radius, color) {
    const tracer = PASSIVE_ICON_TRACERS[getPassiveNodeIconFamily(node)];
    if (!tracer) return;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.1, radius * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    tracer(ctx, radius * 0.48);
    ctx.stroke();
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
            { stat: 'energyShieldPct', title: _t('성역 보호막 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'spellFlatPct', title: _t('성광 주문 관문'), desc: _t('핵심 성좌입니다.') }
        ],
        witch: [
            { stat: 'energyShieldPct', title: _t('비전 보호막 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'chaosPctDmg', title: _t('공허 부패 관문'), desc: _t('핵심 성좌입니다.') }
        ],
        shadow: [
            { stat: 'evasionPct', title: _t('그림자 회피 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'crit', title: _t('급소 절개 관문'), desc: _t('핵심 성좌입니다.') }
        ],
        ranger: [
            { stat: 'evasionPct', title: _t('바람 회피 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'projectilePctDmg', title: _t('탄도 개시 관문'), desc: _t('핵심 성좌입니다.') }
        ],
        duelist: [
            { stat: 'armorPct', title: _t('결투 방어 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'meleePctDmg', title: _t('연격 개시 관문'), desc: _t('핵심 성좌입니다.') }
        ],
        marauder: [
            { stat: 'armorPct', title: _t('철갑 생존 관문'), desc: _t('핵심 성좌입니다.') },
            { stat: 'physPctDmg', title: _t('대지 강타 관문'), desc: _t('핵심 성좌입니다.') }
        ]
    };
    const clusterThemeBySector = {
        templar: [
            { stat: 'energyShieldPct', title: _t('성역 보호막') },
            { stat: 'spellFlatPct', title: _t('성광 주문') },
            { stat: 'aoePctDmg', title: _t('신성 범위') },
            { stat: 'resAll', title: _t('원소 수호') },
            { stat: 'firePctDmg', title: _t('정화의 불꽃') }
        ],
        witch: [
            { stat: 'coldPctDmg', title: _t('서리 비전') },
            { stat: 'lightPctDmg', title: _t('번개 비전') },
            { stat: 'chaosPctDmg', title: _t('공허 비전') },
            { stat: 'dotPctDmg', title: _t('지속 부패') },
            { stat: 'gemLevel', title: _t('룬 각성') }
        ],
        shadow: [
            { stat: 'crit', title: _t('급소 조준') },
            { stat: 'critDmg', title: _t('치명 배율') },
            { stat: 'leechRateCap', title: _t('흡혈 가속') },
            { stat: 'chaosPctDmg', title: _t('독성 그림자') },
            { stat: 'evasionPct', title: _t('그림자 회피') }
        ],
        ranger: [
            { stat: 'projectilePctDmg', title: _t('투사체 숙련') },
            { stat: 'projectileExtraShots', title: _t('추가 발사') },
            { stat: 'evasionPct', title: _t('바람 회피') },
            { stat: 'coldPctDmg', title: _t('냉기 사격') },
            { stat: 'coldPctDmg', title: _t('냉기 사격') }
        ],
        duelist: [
            { stat: 'meleePctDmg', title: _t('근접 결투') },
            { stat: 'ds', title: _t('연속 타격') },
            { stat: 'leechInstanceCap', title: _t('깊은 흡혈') },
            { stat: 'aspd', title: _t('쌍검 속도') },
            { stat: 'physPctDmg', title: _t('정밀 물리') }
        ],
        marauder: [
            { stat: 'physPctDmg', title: _t('물리 파쇄') },
            { stat: 'slamPctDmg', title: _t('강타 충격') },
            { stat: 'armorPct', title: _t('철갑 강화') },
            { stat: 'pctHp', title: _t('거인의 생명') },
            { stat: 'leechTotalCap', title: _t('피의 저수지') }
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
                node.val = getPassiveStatTierValue(node.stat, node.tier);
                node.title = _t(spec.title);
                node.desc = _t('{sectorIndex} 시작축: {desc}', { sectorIndex: getCoreDirectionLabel(sectorIndex), desc: spec.desc });
            }
            return;
        }
        if (['path', 'major', 'keystone', 'hub'].includes(shape.kind)) {
            let stat = getGenericPathStat(theme, depth, lane, sectorIndex);
            node.stat = stat;
            node.val = getPassiveStatTierValue(stat, node.tier);
            if (shape.kind === 'major' || shape.kind === 'keystone') node.val = Math.max(node.val, getPassiveStatTierValue(stat, 2));
            if (shape.kind === 'hub') {
                node.title = _t('교차 거점');
                node.desc = '여러 갈래의 길이 만나는 거점입니다.';
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
            val: getPassiveStatTierValue(statKey, tier),
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
        node.title = _t(spec.title) || null;
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
        node.title = special ? _t('외곽 별길 규칙') : _t('외곽 별길');
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
            pick.title = _t('공허 패시브');
            pick.desc = '처음 활성화할 때는 아무 효과도 없습니다. 마법의 새싹을 사용할 때마다 공허 옵션 1~2줄을 다시 굴릴 수 있습니다.';
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
        { role: 'defense', label: _t('방어'), length: 4, spread: 0.34 },
        { role: 'offense', label: _t('화력'), length: 5, spread: 0.42 },
        { role: 'utility', label: _t('운용'), length: 4, spread: 0.50 },
        { role: 'mastery', label: _t('숙련'), length: 5, spread: 0.58 },
        { role: 'survival', label: _t('생존'), length: 4, spread: 0.38 }
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
        { stat: 'firePctDmg', endStat: 'fireGemLevel', title: _t('화염 룬 단련'), length: 5 },
        { stat: 'coldPctDmg', endStat: 'coldGemLevel', title: _t('냉기 룬 단련'), length: 5 },
        { stat: 'lightPctDmg', endStat: 'lightGemLevel', title: _t('번개 룬 단련'), length: 5 },
        { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: _t('카오스 룬 단련'), length: 5 },
        { stat: 'physPctDmg', endStat: 'physGemLevel', title: _t('물리 룬 단련'), length: 5 },
        { stat: 'projectilePctDmg', endStat: 'projectileGemLevel', title: _t('투사체 룬 단련'), length: 5 },
        { stat: 'meleePctDmg', endStat: 'meleeGemLevel', title: _t('근접 룬 단련'), length: 5 },
        { stat: 'slamPctDmg', endStat: 'slamGemLevel', title: _t('강타 룬 단련'), length: 5 },
        { stat: 'spellFlatPct', endStat: 'spellGemLevel', title: _t('주문 룬 단련'), length: 5 },
        { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: _t('지속 룬 단련'), length: 5 },
        { stat: 'aoePctDmg', endStat: 'aoeGemLevel', title: _t('범위 룬 단련'), length: 5 },
        { stat: 'elementalPctDmg', endStat: 'elementalGemLevel', title: _t('원소 룬 단련'), length: 5 }
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
            { stat: 'chaosPctDmg', title: _t('심연 독기'), length: 4 },
            { stat: 'dotPctDmg', title: _t('부패 지속'), length: 4 },
            { stat: 'coldPctDmg', title: _t('빙결 한기'), length: 4 },
            { stat: 'chaosPctDmg', endStat: 'chaosGemLevel', title: _t('카오스 룬 독성'), length: 5 },
            { stat: 'dotPctDmg', endStat: 'dotGemLevel', title: _t('지속 룬 부식'), length: 5 }
        ];
        return specs[(spoke + depth) % specs.length];
    }
    function getDirectionalClusterSpec(spoke, depth) {
        const fixedClusters = {
            '10:5': { stat: 'firePctDmg', title: _t('서녘 화염'), length: 4 },
            '11:8': { stat: 'firePctDmg', title: _t('황혼 화염'), length: 4 },
            '14:6': { stat: 'firePctDmg', title: _t('여명 화염'), length: 4 },
            '0:6': { stat: 'coldPctDmg', title: _t('천정 서리'), length: 4 },
            '1:6': { stat: 'lightPctDmg', title: _t('새벽 번개'), length: 4 },
            '14:9': { stat: 'summonAspd', title: _t('성좌 지휘'), length: 4 },
            '15:5': { stat: 'summonPctDmg', title: _t('별무리 사역'), length: 5 },
            '15:8': { stat: 'summonHpPct', title: _t('사역 생명핵'), length: 4 }
        };
        return fixedClusters[`${spoke}:${depth}`] || null;
    }
    function getScatteredMaxResClusterSpec(spoke, depth) {
        if (spoke === 5 && depth % 4 === 1) return { stat: 'resF', endStat: 'maxResF', title: _t('화염 최대 저항'), length: 4 };
        if (spoke === 9 && depth % 4 === 2) return { stat: 'resC', endStat: 'maxResC', title: _t('냉기 최대 저항'), length: 4 };
        if (spoke === 13 && depth % 4 === 3) return { stat: 'resL', endStat: 'maxResL', title: _t('번개 최대 저항'), length: 4 };
        return null;
    }
    function getCompositeClusterSpec(spoke, depth) {
        let scatteredMaxRes = getScatteredMaxResClusterSpec(spoke, depth);
        if (scatteredMaxRes) return scatteredMaxRes;
        if (spoke === 4) {
            if (depth % 2 === 0) return { stat: 'moveEvasion', title: _t('질풍 회피'), length: 4 };
            const altSpecs = [
                { stat: 'projectilePctDmg', title: _t('탄도 숙련'), length: 4 },
                { stat: 'pctHp', title: _t('생명 순환'), length: 4 },
                { stat: 'resC', title: _t('한기 내성'), length: 4 },
                { stat: 'projectileExtraShots', title: _t('추가 발사'), length: 4 }
            ];
            return altSpecs[Math.floor(depth / 2) % altSpecs.length];
        }
        if (spoke === 8) return { stat: 'hpArmor', title: _t('거석 생명'), length: 4 };
        if (spoke === 12) return { stat: 'slamPctDmg', endStat: 'slamEchoChance', title: _t('대지 여진'), length: 5 };
        if (spoke === 0) return { stat: 'energyShieldPct', endStat: 'energyShieldRegen', title: _t('보호막 순환'), length: 4 };
        if (isTopChaosPenaltyCluster(spoke, depth)) return { stat: 'chaosResElemPenalty', title: _t('혼돈 절연'), length: 4 };
        const rotating = [
            { stat: 'critDmg', title: _t('치명 배율'), length: 4 },
            { stat: 'ds', title: _t('연속 타격'), length: 4 },
            { stat: 'maxDmgRoll', title: _t('상한 보정'), length: 4 },
            { stat: 'pctDmg', endStat: 'suppCap', title: _t('보조스킬룬 연결'), length: 4 },
            { stat: 'minDmgRoll', title: _t('하한 안정'), length: 4 },
            { stat: 'resAll', title: _t('원소 수호'), length: 4 },
            { stat: 'resChaos', title: _t('카오스 저항'), length: 4 },
            { stat: 'regenSuppress', title: _t('재생 봉쇄'), length: 4 },
            { stat: 'aspdMove', title: _t('쌍속 기동'), length: 4 }
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
                return { stat: 'spellFlatPct', endStat: 'gemLevel', title: _t('외곽 룬 각성'), length: 5 };
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
            node.val = getPassiveStatTierValue(statForStep, tier);
            if (statForStep === 'slamPctDmg') node.val *= 2;
            if (statForStep === 'critDmg') {
                if (chainLength === 4) node.val = [8, 8, 12, 20][i - 1];
                else if (chainLength === 5) node.val = [12, 12, 12, 12, 25][i - 1];
            }
            if (isEnd) {
                node.title = _t('{title} 핵심', { title: themeSpec.title });
                node.desc = _t('{PASSIVE_SECTOR_TITLES}의 {label} 구역을 완성하는 거미줄 칸 내부 전문 노드입니다.', { PASSIVE_SECTOR_TITLES: PASSIVE_SECTOR_TITLES[theme] || _t('성좌'), label: blueprint.label });
            } else if (i === 1) {
                node.title = _t('{title} 길목', { title: themeSpec.title });
                node.desc = _t('거미줄 경로 한 칸 안에서 {label} 축으로 갈라지는 시작 노드입니다.', { label: blueprint.label });
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
                effectLabel: finalMajor && i === values.length - 1 ? _t('비껴내기 확률 +{values}%, 비껴내기 피해 감소 +3%', { values: values[i] }) : _t('비껴내기 확률 +{values}%', { values: values[i] })
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
                ? '완갑과 대검의 기본 막기 확률에서 비율로 증가하는 방어 성좌입니다.'
                : '최종 막기 확률에 직접 더해지는 방어 성좌입니다.';
            applyNodeSpec(node, {
                stat: stat,
                val: values[i],
                title: i === values.length - 1 ? _t('{title} 숙련', { title }) : title,
                desc: desc,
                kind: i === values.length - 1 ? 'keystone' : 'major',
                effectLabel: _t('막기 확률 +{values}{labelSuffix}', { values: values[i], labelSuffix })
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

function rebalancePassiveStartingStats() {
    const root = PASSIVE_TREE.nodes.n0;
    if (!root) return;
    const startPlans = {
        templar: ['energyShieldPct'],
        witch: ['chaosPctDmg'],
        shadow: ['evasionPct'],
        ranger: ['projectilePctDmg'],
        duelist: ['armorPct'],
        marauder: ['physPctDmg', 'pctHp', 'slamPctDmg']
    };
    const sectorUseCount = {};
    const usedStartStats = new Set([root.stat]);
    const starters = Object.values(PASSIVE_TREE.nodes)
        .filter(node => node && node.depth === 1)
        .sort((a, b) => (sectorOrderForStartingNode(a) - sectorOrderForStartingNode(b)) || String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));

    function sectorOrderForStartingNode(node) {
        const order = { templar: 0, witch: 1, shadow: 2, ranger: 3, duelist: 4, marauder: 5 };
        return order[node.sector] ?? 99;
    }
    function setStat(node, statKey) {
        if (!node || !P_STATS[statKey]) return;
        node.stat = statKey;
        node.val = getPassiveStatTierValue(statKey, node.tier);
        node.effectLabel = null;
    }

    starters.forEach(node => {
        const useIndex = sectorUseCount[node.sector] || 0;
        sectorUseCount[node.sector] = useIndex + 1;
        let candidates = (startPlans[node.sector] || []).concat(PASSIVE_THEME_POOLS[node.sector] || [], PASSIVE_THEME_POOLS.center || []);
        let preferred = candidates[useIndex] || candidates.find(stat => !usedStartStats.has(stat));
        if (!preferred || usedStartStats.has(preferred)) preferred = candidates.find(stat => P_STATS[stat] && !usedStartStats.has(stat));
        if (preferred) {
            setStat(node, preferred);
            usedStartStats.add(preferred);
        }
        node.title = _t('{PASSIVE_SECTOR_TITLES} 시작점', { PASSIVE_SECTOR_TITLES: PASSIVE_SECTOR_TITLES[node.sector] || _t('성좌') });
        node.desc = '루트에서 처음 선택하는 성장 축입니다. 다른 시작점과 겹치지 않는 고유한 기초 효과를 제공합니다.';
    });

    const adjacency = new Map();
    PASSIVE_TREE.edges.forEach(edge => {
        if (!adjacency.has(edge.from)) adjacency.set(edge.from, []);
        if (!adjacency.has(edge.to)) adjacency.set(edge.to, []);
        adjacency.get(edge.from).push(edge.to);
        adjacency.get(edge.to).push(edge.from);
    });
    starters.forEach(starter => {
        const used = new Set([starter.stat]);
        const children = (adjacency.get(starter.id) || [])
            .map(id => PASSIVE_TREE.nodes[id])
            .filter(node => node && node.depth === 2 && (node.kind === 'path' || node.kind === 'node'))
            .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
        children.forEach((node, index) => {
            if (!used.has(node.stat)) { used.add(node.stat); return; }
            const pool = (PASSIVE_THEME_POOLS[node.sector] || PASSIVE_THEME_POOLS.center || []).filter(stat => P_STATS[stat]);
            const replacement = pool.slice(index).concat(pool.slice(0, index)).find(stat => !used.has(stat));
            if (replacement) {
                setStat(node, replacement);
                used.add(replacement);
            }
        });
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
        node.title = _t(config.title);
        node.desc = config.desc;
        node.effectLabel = `${getStatName(config.stat)} +${formatValue(config.stat, config.val)}${P_STATS[config.stat] && P_STATS[config.stat].isPct ? '%' : ''}`;
    });
}

function hasAuthoredPassiveTreeSource() {
    return typeof PASSIVE_TREE_V22 !== 'undefined' && PASSIVE_TREE_V22
        && PASSIVE_TREE_V22.nodes && PASSIVE_TREE_V22.edges;
}

function hasAuthoredPassiveTree() {
    if (!hasAuthoredPassiveTreeSource() || PASSIVE_TREE.layoutVersion !== PASSIVE_TREE_V22.version) return false;
    return Object.values(PASSIVE_TREE_V22.classStarts || {}).some(nodeId => !!PASSIVE_TREE.nodes[nodeId]);
}

function getPassiveTreeViewAngle() {
    return passiveTreeViewAngle;
}

/** Turns the nodes for the current class, only when the class changed. The camera then fits again; ensurePassiveRenderCache sees the new angle. */
function syncPassiveTreeView() {
    if (!hasAuthoredPassiveTree()) return;
    const start = PASSIVE_TREE_V22.nodes[getPassiveTreeRootNodeId()];
    const angle = Math.PI / 2 - Math.atan2(start.y, start.x);
    if (angle === passiveTreeViewAngle) return;
    passiveTreeViewAngle = angle;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    Object.entries(PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
        const node = PASSIVE_TREE.nodes[id];
        if (!node) return;
        node.x = source.x * cos - source.y * sin;
        node.y = source.x * sin + source.y * cos;
    });
    passiveCameraInitialized = false;
}

function loadAuthoredPassiveTree() {
    passiveTreeViewAngle = 0;
    Object.keys(PASSIVE_TREE.nodes).forEach(key => delete PASSIVE_TREE.nodes[key]);
    PASSIVE_TREE.edges.length = 0;
    Object.entries(PASSIVE_TREE_V22.nodes).forEach(([id, source]) => {
        const node = { ...source, effects: (source.effects || []).map(effect => ({ ...effect })) };
        node.depth = Number.isFinite(node.distanceFromClassStart) ? node.distanceFromClassStart : Infinity;
        if (node.choiceGroup) node.choiceGroup = JSON.parse(JSON.stringify(node.choiceGroup));
        if (Array.isArray(node.hiddenRouteNodeIds)) node.hiddenRouteNodeIds = node.hiddenRouteNodeIds.slice();
        PASSIVE_TREE.nodes[id] = node;
    });
    PASSIVE_TREE.edges.push(...PASSIVE_TREE_V22.edges.map(edge => ({ ...edge })));
    PASSIVE_TREE.layoutVersion = PASSIVE_TREE_V22.version;
    const nodes = Object.values(PASSIVE_TREE.nodes);
    PASSIVE_BOUNDS.minX = Math.min(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.maxX = Math.max(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.minY = Math.min(...nodes.map(node => node.y));
    PASSIVE_BOUNDS.maxY = Math.max(...nodes.map(node => node.y));
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('authored-tree');
}

function getPassiveTreeRootNodeId(state) {
    if (!hasAuthoredPassiveTree()) return 'n0';
    const source = state || (typeof game !== 'undefined' ? game : null) || {};
    const classId = source.selectedClassId || 'warrior';
    return PASSIVE_TREE_V22.classStarts[classId] || PASSIVE_TREE_V22.classStarts.warrior;
}

function getPassiveTreeRootNode(state) {
    return PASSIVE_TREE.nodes[getPassiveTreeRootNodeId(state)] || null;
}

// Covenant spokes display and count attributes, but never carry allocation paths.
function isPassiveTreePathEdge(edge, allocatedNodeIds) {
    return edge.requiresAllocatedNodeId !== PASSIVE_KEYSTONE_NODE_ID_BY_TITLE['헌신의 서약']
        && isPassiveTreeEdgeAvailable(edge, allocatedNodeIds);
}

function isPassiveTreeEdgeAvailable(edge, allocatedNodeIds) {
    const requiredId = String(edge && edge.requiresAllocatedNodeId || '');
    if (!requiredId) return true;
    const allocated = allocatedNodeIds === undefined
        ? (game && Array.isArray(game.passives) ? game.passives : [])
        : allocatedNodeIds;
    if (allocated instanceof Set) return allocated.has(requiredId);
    return Array.isArray(allocated) && allocated.includes(requiredId);
}

/**
 * Returns the shared read-only adjacency map for the current passive layout.
 * @param {Set<string>|string[]=} allocatedNodeIds
 * @returns {Map<string, string[]>}
 */
function getPassiveTreeAdjacency(allocatedNodeIds) {
    const nodeCount = Object.keys(PASSIVE_TREE.nodes || {}).length;
    const edges = Array.isArray(PASSIVE_TREE.edges) ? PASSIVE_TREE.edges : [];
    const unlockSignature = edges.filter(edge => edge.requiresAllocatedNodeId)
        .map(edge => `${edge.requiresAllocatedNodeId}:${isPassiveTreeEdgeAvailable(edge) ? 1 : 0}`).join('|');
    const signature = allocatedNodeIds === undefined
        ? `${PASSIVE_TREE.layoutVersion || 0}:${nodeCount}:${edges.length}:${unlockSignature}` : '';
    if (signature && passiveTreeAdjacencyCache.signature === signature) return passiveTreeAdjacencyCache.map;
    const adjacency = new Map(Object.keys(PASSIVE_TREE.nodes || {}).map(id => [String(id), []]));
    edges.forEach(edge => {
        if (!isPassiveTreePathEdge(edge, allocatedNodeIds)) return;
        const from = String(edge.from), to = String(edge.to);
        if (!adjacency.has(from)) adjacency.set(from, []);
        if (!adjacency.has(to)) adjacency.set(to, []);
        adjacency.get(from).push(to);
        adjacency.get(to).push(from);
    });
    if (signature) passiveTreeAdjacencyCache = { signature, map: adjacency };
    return adjacency;
}

function rebasePassiveTreeForClassChange(previousClassId, nextClassId) {
    if (!hasAuthoredPassiveTree() || previousClassId === nextClassId) return 0;
    const previousRoot = PASSIVE_TREE_V22.classStarts[previousClassId];
    const nextRoot = PASSIVE_TREE_V22.classStarts[nextClassId];
    if (!previousRoot || !nextRoot || previousRoot === nextRoot) return 0;
    const invested = (Array.isArray(game.passives) ? game.passives : [])
        .filter(nodeId => PASSIVE_TREE.nodes[nodeId] && PASSIVE_TREE.nodes[nodeId].kind !== 'start');
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0) + invested.length - passiveRouting.paleBonus(game));
    game.passives = [];
    game.passiveAttributeChoices = {};
    game.discoveredPassives = [nextRoot];
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
    return invested.length;
}

function getPassiveWisdomElementFromNodeIds(nodeIds) {
    const ids = Array.isArray(nodeIds) ? nodeIds : [];
    for (let index = ids.length - 1; index >= 0; index -= 1) {
        const element = PASSIVE_WISDOM_ELEMENT_BY_NODE_ID[String(ids[index])];
        if (element) return element;
    }
    return '';
}

/**
 * @param {{revelation?: string, keystoneChoices?: Record<string, string>, cycleBuffs?: Array<Record<string, number|string>>, fanaticism?: Record<string, number|string>, karma?: Record<string, unknown>}|null|undefined} value
 * @param {{migrateWisdomBranchChoice?: boolean, passiveIds?: string[]}|undefined} options
 * @returns {{revelation: string, keystoneChoices: Record<string, string>, cycleBuffs: Array<Record<string, number|string>>, fanaticism: {skillName: string, stacks: number}, karma: {byEnemy: Record<string, number>, buff: Record<string, number|string>|null}}}
 */
function normalizePassiveSpecializationState(value, options) {
    let source = value && typeof value === 'object' ? value : {};
    let revelation = PASSIVE_REVELATION_IDS.includes(source.revelation) ? source.revelation : 'combat';
    let choices = source.keystoneChoices && typeof source.keystoneChoices === 'object' ? source.keystoneChoices : {};
    let wisdom = PASSIVE_WISDOM_ELEMENTS.includes(choices.wisdom_leap_element) ? choices.wisdom_leap_element : 'fire';
    const migrateBranch = options && options.migrateWisdomBranchChoice;
    const branchWisdom = migrateBranch ? getPassiveWisdomElementFromNodeIds(options.passiveIds) : '';
    if (migrateBranch) wisdom = branchWisdom;
    let fanaticism = source.fanaticism && typeof source.fanaticism === 'object' ? source.fanaticism : {};
    let karmaSource = source.karma && typeof source.karma === 'object' ? source.karma : {};
    let karmaByEnemy = karmaSource.byEnemy && typeof karmaSource.byEnemy === 'object' ? karmaSource.byEnemy : {};
    let normalizedKarma = {};
    Object.keys(karmaByEnemy).forEach(enemyId => {
        const amount = Math.max(0, Math.floor(Number(karmaByEnemy[enemyId]) || 0));
        if (amount > 0) normalizedKarma[String(enemyId)] = amount;
    });
    let karmaBuff = karmaSource.buff && typeof karmaSource.buff === 'object' ? karmaSource.buff : null;
    if (karmaBuff) {
        karmaBuff = {
            targetId: String(karmaBuff.targetId || ''),
            morePct: Math.max(0, Number(karmaBuff.morePct) || 0),
            expiresAt: Math.max(0, Number(karmaBuff.expiresAt) || 0),
            actionsLeft: Math.max(0, Math.floor(Number(karmaBuff.actionsLeft) || 0))
        };
        if (!karmaBuff.targetId || karmaBuff.morePct <= 0 || karmaBuff.actionsLeft <= 0) karmaBuff = null;
    }
    let cycleBuffs = (Array.isArray(source.cycleBuffs) ? source.cycleBuffs : []).filter(buff => buff
        && PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] && Number.isFinite(Number(buff.cycle)) && Number.isFinite(Number(buff.expiresAt)))
        .map(buff => ({ type: buff.type, cycle: Math.max(0, Number(buff.cycle)), expiresAt: Math.max(0, Number(buff.expiresAt)) }));
    return {
        revelation,
        keystoneChoices: { ...choices, wisdom_leap_element: wisdom },
        cycleBuffs,
        fanaticism: { skillName: String(fanaticism.skillName || ''), stacks: Math.max(0, Math.floor(fanaticism.stacks || 0)) },
        karma: { byEnemy: normalizedKarma, buff: karmaBuff }
    };
}

function ensurePassiveSpecializationState() {
    game.passiveSpecialization = normalizePassiveSpecializationState(game.passiveSpecialization,
        { migrateWisdomBranchChoice: true, passiveIds: game.passives });
    return game.passiveSpecialization;
}

function getPassiveNodeRawEffects(node) {
    if (!node) return [];
    if (node.intentionalNoEffect) return [];
    if (Array.isArray(node.effects) && node.effects.length > 0) return node.effects;
    if (!node.stat) return [];
    return [{ stat: node.stat, val: Number(node.val) || 0 }];
}

function getPassiveSpecialStatReserve(statId, excludedNodeId) {
    return (game && game.passives || []).reduce((total, nodeId) => {
        const node = PASSIVE_TREE.nodes[nodeId], key = String(nodeId);
        if (!node || key === String(excludedNodeId)) return total;
        if (node.kind === 'void' || node.activationRequirement) return total;
        return total + getPassiveNodeRawEffects(node)
            .filter(effect => effect && effect.stat === statId)
            .reduce((sum, effect) => sum + (Number(effect.val) || 0), 0);
    }, 0);
}

function getPassiveNodeActivationState(node) {
    const requirement = node && node.activationRequirement;
    if (!requirement || requirement.type !== 'special-stat-reserve') {
        return { active: true, statId: null, available: 0, required: 0 };
    }
    const required = Math.max(0, Number(requirement.minimum) || 0);
    const available = Math.max(0, getPassiveSpecialStatReserve(requirement.statId, node.id));
    return { active: available >= required, statId: requirement.statId, available, required };
}

/** connectedDevotionPenalty is percentage points per allocated adjacent devotion node,
 * not per devotion stat point. Allocation counts even when that spoke's own effect is inactive.
 * Derive on read so refunds, presets and restored saves never persist a reduced base value.
 */
function getEffectivePassiveNodeEffects(node) {
    if (!getPassiveNodeActivationState(node).active) return [];
    const effects = getPassiveNodeRawEffects(node);
    if (!node || !node.connectedDevotionPenalty) return effects;
    const neighbors = getPassiveTreeAdjacency().get(String(node.id)) || [];
    const count = neighbors.filter(id => (game.passives || []).includes(id)
        && getPassiveNodeRawEffects(PASSIVE_TREE.nodes[id]).some(effect => effect.stat === 'devotion')).length;
    const penalty = count * node.connectedDevotionPenalty;
    return effects.map(effect => ['physPctDmg', 'lightPctDmg'].includes(effect.stat)
        ? { ...effect, val: effect.val - penalty } : effect);
}

/** 공허제어(2026-11-01 사용자: 연결된 공허 소켓의 효율 25% 증가): 이 소켓과 이어진 할당 노드의 voidLinkEfficiency 합을 줄 배율로 바꾼다. 찍고 지울 때 어긋나지 않게 읽을 때 잰다. */
function getVoidLinkScale(nodeId) {
    const owned = game.passives || [], neighbors = getPassiveTreeAdjacency().get(String(nodeId)) || [];
    const lines = neighbors.filter(id => owned.includes(id)).flatMap(id => getPassiveNodeRawEffects(PASSIVE_TREE.nodes[id]));
    const constellation = findAllocatedPassiveKeystone('공허의 별자리') ? getVirtualVoidPassiveCount() : 0;
    return 1 + (lines.filter(effect => effect.stat === 'voidLinkEfficiency').reduce((sum, effect) => sum + Number(effect.val), 0) + constellation) / 100;
}

function getAllocatedPassiveStatValue(statId) {
    const totals = {};
    (game && game.passives || []).forEach(nodeId => {
        const node = PASSIVE_TREE.nodes[nodeId];
        if (!node || node.kind === 'void') return;
        const effects = getEffectivePassiveNodeEffects(node);
        effects.forEach(effect => {
            if (!effect || !effect.stat) return;
            totals[effect.stat] = (totals[effect.stat] || 0) + (Number(effect.val) || 0);
        });
    });
    if (statId !== 'devotion') return Math.max(0, Number(totals[statId]) || 0);
    let devotion = Math.max(0, Number(totals.devotion) || 0);
    if (findAllocatedPassiveKeystone('육신과 정신의 성약')) {
        devotion += Math.floor(Math.max(0, totals.strength || 0) / 10) + Math.floor(Math.max(0, totals.intelligence || 0) / 10);
    }
    const covenant = findAllocatedPassiveKeystone('헌신의 서약');
    if (covenant) devotion += countCovenantAttributeConnections(covenant);
    return devotion;
}

function setPassiveRevelation(revelationId) {
    if (!PASSIVE_REVELATION_IDS.includes(revelationId)) return false;
    if (getAllocatedPassiveStatValue('devotion') < 1) return false;
    if (findAllocatedPassiveKeystone('삼중 계시')) return false;
    ensurePassiveSpecializationState().revelation = revelationId;
    return true;
}

function hasAuthoredPassiveKeystone(nodeId) {
    let node = PASSIVE_TREE.nodes[nodeId];
    return !!(node && node.kind === 'keystone' && (game.passives || []).includes(nodeId));
}

function findAllocatedPassiveKeystone(title) {
    const authoredNodeId = PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[String(title)] || String(title || '');
    const authoredNode = PASSIVE_TREE.nodes[authoredNodeId];
    if (authoredNode && authoredNode.kind === 'keystone' && (game.passives || []).includes(authoredNodeId)) {
        return authoredNode;
    }
    const id = (game.passives || []).find(id => {
        const node = PASSIVE_TREE.nodes[id];
        return node && node.kind === 'keystone' && (node.title === title || node.keystoneEffectId === `keystone:${authoredNodeId}`);
    });
    return PASSIVE_TREE.nodes[id] || null;
}

/** 그 효과를 가진 트리의 키스톤 id: 라이브 id, 이름이 같은 노드, keystoneEffectId로 이어진 노드(이름을 따로 지은 키스톤). */
function getPassiveKeystoneNodeId(title) {
    const liveId = PASSIVE_KEYSTONE_NODE_ID_BY_TITLE[title];
    if (PASSIVE_TREE.nodes[liveId]) return liveId;
    const node = Object.values(PASSIVE_TREE.nodes).find(row => row.kind === 'keystone' && (row.title === title || row.keystoneEffectId === `keystone:${liveId}`));
    return node ? node.id : liveId;
}

function getPassiveGatedStartIds(owner = game) {
    const opened = (owner.passives || []).map(id => PASSIVE_TREE.nodes[id]).filter(node => node && node.kind === 'keystone' && PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    return new Set(opened.map(node => PASSIVE_TREE_V22.classStarts[PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]]).filter(Boolean));
}

function getPassiveBlockedStartIds(owner = game) {
    const hasGates = Object.values(PASSIVE_TREE.nodes).some(node => node.kind === 'keystone' && PASSIVE_START_GATE_CLASS_BY_TITLE[node.title]);
    if (!hasGates) return new Set();
    const gated = getPassiveGatedStartIds(owner), rootId = getPassiveTreeRootNodeId(owner);
    return new Set(Object.values(PASSIVE_TREE.nodes).filter(node => node.kind === 'start' && node.id !== rootId && !gated.has(node.id)).map(node => node.id));
}

function getMystiqueAffinity(mystique, damageByElement) {
    const amount = Math.max(0, Number(mystique) || 0);
    const elements = ['phys', 'fire', 'cold', 'light', 'chaos'];
    const totals = damageByElement && typeof damageByElement === 'object' ? damageByElement : {};
    const element = elements.reduce((best, current) => Number(totals[current] || 0) > Number(totals[best] || 0) ? current : best, 'phys');
    return { element, ailment: PASSIVE_AILMENT_BY_ELEMENT[element], damagePct: amount,
        potencyPct: amount, chancePct: Math.floor(amount / 3) };
}

function recordPassiveCycleAilmentEnd(ailmentType, cycle, now) {
    if (findAllocatedPassiveKeystone('역행 순환')) return false;
    if (!PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = ensurePassiveSpecializationState(), timestamp = Number.isFinite(now) ? now : getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter(buff => buff && buff.type !== ailmentType && buff.expiresAt > timestamp);
    state.cycleBuffs.push({ type: ailmentType, cycle: Math.max(0, Number(cycle)), expiresAt: timestamp + 6000 });
    return true;
}

function recordPassiveCycleAilmentStart(ailmentType, cycle, now) {
    if (!findAllocatedPassiveKeystone('역행 순환')) return false;
    if (!PASSIVE_CYCLE_BUFF_EFFECTS[ailmentType] || !(Number(cycle) > 0)) return false;
    const state = ensurePassiveSpecializationState(), timestamp = Number.isFinite(now) ? now : getCombatTime();
    state.cycleBuffs = [{ type: ailmentType, cycle: Math.max(0, Number(cycle)) * 0.5, expiresAt: timestamp + 6000 }];
    return true;
}

function getActivePassiveCycleBuffEffects(now) {
    const state = ensurePassiveSpecializationState(), timestamp = Number.isFinite(now) ? now : getCombatTime();
    state.cycleBuffs = state.cycleBuffs.filter(buff => buff && buff.expiresAt > timestamp);
    return state.cycleBuffs.flatMap(buff => (PASSIVE_CYCLE_BUFF_EFFECTS[buff.type] || [])
        .map(effect => ({ stat: effect.stat, val: effect.perCycle * buff.cycle, source: buff.type })));
}

function recordPassiveFanaticSkillUse(skillName, devotion) {
    const state = ensurePassiveSpecializationState(), cap = Math.max(0, Math.floor(Number(devotion) || 0));
    if (!findAllocatedPassiveKeystone('타락한 복음') || cap <= 0) {
        state.fanaticism = { skillName: '', stacks: 0 };
        return 0;
    }
    const normalizedName = String(skillName || '');
    const stacks = state.fanaticism.skillName === normalizedName ? state.fanaticism.stacks + 1 : 1;
    state.fanaticism = { skillName: normalizedName, stacks: Math.min(cap, stacks) };
    return state.fanaticism.stacks;
}

function isPassiveKarmaTarget(enemy) {
    return !!(enemy && (enemy.isBoss || enemy.isElite || enemy.elite));
}

function recordPassiveKarmaLoss(enemy, resourceLost) {
    if (!findAllocatedPassiveKeystone('카르마') || !isPassiveKarmaTarget(enemy)) return 0;
    const amount = Math.max(0, Math.floor(Number(resourceLost) || 0));
    if (amount <= 0) return 0;
    const karma = ensurePassiveSpecializationState().karma;
    const targetId = String(enemy.id);
    karma.byEnemy[targetId] = Math.min(PASSIVE_KARMA_PER_TARGET_CAP,
        Math.max(0, Math.floor(karma.byEnemy[targetId] || 0)) + amount);
    return karma.byEnemy[targetId];
}

function beginPassiveKarmaAttack(enemy, now) {
    const timestamp = Number.isFinite(now) ? now : getCombatTime();
    const state = ensurePassiveSpecializationState(), karma = state.karma;
    if (!findAllocatedPassiveKeystone('카르마') || !isPassiveKarmaTarget(enemy)) {
        if (!findAllocatedPassiveKeystone('카르마')) karma.buff = null;
        return { targetId: '', multiplier: 1, morePct: 0 };
    }
    const targetId = String(enemy.id), stored = Math.max(0, Math.floor(karma.byEnemy[targetId] || 0));
    if (stored > 0) {
        karma.buff = { targetId, morePct: Math.floor(stored / 5), expiresAt: timestamp + 4000, actionsLeft: 5 };
        delete karma.byEnemy[targetId];
    }
    let buff = karma.buff;
    if (!buff || buff.targetId !== targetId || buff.expiresAt <= timestamp || buff.actionsLeft <= 0) {
        if (buff && (buff.expiresAt <= timestamp || buff.actionsLeft <= 0)) karma.buff = null;
        return { targetId, multiplier: 1, morePct: 0 };
    }
    const result = { targetId, multiplier: 1 + buff.morePct / 100, morePct: buff.morePct };
    buff.actionsLeft -= 1;
    if (buff.actionsLeft <= 0) karma.buff = null;
    return result;
}

function getPassiveAshuraAilmentChance(baseChance, cycle) {
    const base = Math.max(0, Number(baseChance) || 0), cycleChance = Math.max(0, Number(cycle) || 0) / 100;
    return Math.min(1, base + cycleChance);
}

function getPassiveAshuraDamageMultiplier(element, ailments, cycle) {
    const ailmentType = PASSIVE_AILMENT_BY_ELEMENT[element];
    const active = (Array.isArray(ailments) ? ailments : []).find(ailment => ailment
        && ailment.type === ailmentType && Number(ailment.time) > 0);
    if (!active) return 1;
    const remainingSeconds = Math.max(0, Number(active.time) || 0);
    const lessPct = Math.min(50, Math.max(0, Number(cycle) || 0) * remainingSeconds / 10);
    return 1 - lessPct / 100;
}

function applyPassiveAshuraDamageBreakdown(breakdown, ailments, cycle) {
    return (Array.isArray(breakdown) ? breakdown : []).map(row => ({
        ele: row.ele,
        amount: Math.max(0, Math.floor((Number(row.amount) || 0)
            * getPassiveAshuraDamageMultiplier(row.ele, ailments, cycle)))
    })).filter(row => row.amount > 0);
}

function sumPassiveRuleStat(buckets, stat) {
    return Object.values(buckets).reduce((sum, bucket) => sum + Number(bucket && bucket[stat] || 0), 0);
}

function countCovenantAttributeConnections(keystone) {
    if (!keystone) return 0;
    const neighborIds = [...new Set(PASSIVE_TREE.edges.filter(edge => isPassiveTreeEdgeAvailable(edge)
        && (edge.from === keystone.id || edge.to === keystone.id))
        .map(edge => edge.from === keystone.id ? edge.to : edge.from))];
    const owned = new Set(game.passives || []);
    return neighborIds.filter(id => {
        const node = PASSIVE_TREE.nodes[id];
        return owned.has(id) && (node.effects || []).some(effect => ['strength', 'dexterity', 'intelligence'].includes(effect.stat));
    }).length;
}

function zeroPassiveRuleStats(buckets, statIds) {
    Object.values(buckets).forEach(bucket => statIds.forEach(statId => { bucket[statId] = 0; }));
}

function convertPassiveRuleStat(buckets, sourceStat, targetStat) {
    Object.values(buckets).forEach(bucket => {
        bucket[targetStat] += Number(bucket[sourceStat]) || 0;
        bucket[sourceStat] = 0;
    });
}

function applyPassiveDefenseKeystoneRules(buckets) {
    const passive = buckets.passive;
    if (findAllocatedPassiveKeystone('대리 성약')) {
        passive.summonGuardRedirectPct += 50;
        zeroPassiveRuleStats(buckets, ['blockChance', 'blockChancePct', 'baseBlockChance', 'deflectChance']);
    }
    if (findAllocatedPassiveKeystone('완전 회피')) {
        zeroPassiveRuleStats(buckets, ['armor', 'armorPct', 'blockChance', 'blockChancePct', 'baseBlockChance']);
    }
    if (findAllocatedPassiveKeystone('움직이는 성벽')) {
        convertPassiveRuleStat(buckets, 'evasion', 'armor');
        convertPassiveRuleStat(buckets, 'evasionPct', 'armorPct');
        zeroPassiveRuleStats(buckets, ['deflectChance']);
        passive.blockChanceMax += 5;
        passive.move -= 10;
    }
}

function applyPassiveRecoveryKeystoneRules(buckets) {
    const passive = buckets.passive;
    if (findAllocatedPassiveKeystone('혼의 성소')) {
        const regen = sumPassiveRuleStat(buckets, 'regen');
        zeroPassiveRuleStats(buckets, ['regen', 'regenFlat']);
        passive.energyShieldRegen += regen;
    }
    if (findAllocatedPassiveKeystone('피의 가속')) {
        zeroPassiveRuleStats(buckets, ['regen', 'regenFlat']);
        passive.leechKeepFullLife += 1;
    }
}

function applyPassiveKeystoneBucketRules(buckets) {
    const passive = buckets.passive;
    if (findAllocatedPassiveKeystone('육신과 정신의 성약')) {
        passive.devotion += Math.floor(Math.max(0, passive.strength) / 10) + Math.floor(Math.max(0, passive.intelligence) / 10);
        passive.strength = 0;
        passive.intelligence = 0;
    }
    const covenant = findAllocatedPassiveKeystone('헌신의 서약');
    if (covenant) passive.devotion += countCovenantAttributeConnections(covenant);
    if (findAllocatedPassiveKeystone('관통 행렬')) passive.targetProjectile += 2;
    if (findAllocatedPassiveKeystone('남겨진 잠식')) passive.chaosErosionCap += 20;
    if (findAllocatedPassiveKeystone('야만')) {
        zeroPassiveRuleStats(buckets, ['dexterity', 'intelligence']);
        passive.flatDmg += Math.max(1, Math.floor(game.level || 1)) * 3 + Math.floor(sumPassiveRuleStat(buckets, 'strength') / 10);
    }
    if (findAllocatedPassiveKeystone('순환의 원석')) {
        const strength = sumPassiveRuleStat(buckets, 'strength');
        passive.cycle += Math.floor(strength / 30);
        passive.armorPct += Math.floor(Math.max(0, sumPassiveRuleStat(buckets, 'cycle')) / 5) * 5;
    }
    applyPassiveDefenseKeystoneRules(buckets);
    applyPassiveRecoveryKeystoneRules(buckets);
    applyPassiveWrittenKeystoneRules(buckets);
}

/** 2026-11-01 사용자가 글로 쓴 키스톤: 면죄의 복음, 공허의 별자리, 지식의 반목. */
function applyPassiveWrittenKeystoneRules(buckets) {
    const passive = buckets.passive;
    if (findAllocatedPassiveKeystone('면죄의 복음')) {
        Object.values(buckets).forEach(bucket => {
            bucket.elementalPctDmg += (Number(bucket.chaosPctDmg) || 0) * 0.5;
            bucket.chaosPctDmg = 0;
        });
    }
    if (findAllocatedPassiveKeystone('공허의 별자리')) {
        const voids = getVirtualVoidPassiveCount();
        passive.spellPctDmg += voids * 2;
        passive.spellRepeatChance += voids;
    }
    if (findAllocatedPassiveKeystone('지식의 반목')) passive.attackPctDmg += sumPassiveRuleStat(buckets, 'spellPctDmg') * 0.75;
}

/** 칼날 다발(2026-11-01 사용자 글): 힘과 민첩이 같으면 둘의 합 100마다 한손검 투사체가 1개 는다. */
function getBladeBundleShots(strength, dexterity, stance) {
    if (stance !== 'sword' || !findAllocatedPassiveKeystone('칼날 다발')) return 0;
    return Math.floor(strength) === Math.floor(dexterity) ? Math.floor((strength + dexterity) / 100) : 0;
}

function getPassiveKeystoneCombatFlags(skillTags) {
    const tags = new Set(Array.isArray(skillTags) ? skillTags : []);
    return {
        farshot: tags.has('projectile') && !!findAllocatedPassiveKeystone('최후방 사격'),
        duel: tags.has('attack') && !!findAllocatedPassiveKeystone('결투의 규율'),
        bloodCradle: !!findAllocatedPassiveKeystone('피빛 요람'),
        channelPath: !!findAllocatedPassiveKeystone('몰아의 통로'),
        erosionLegacy: !!findAllocatedPassiveKeystone('남겨진 잠식'),
        proxyCovenant: !!findAllocatedPassiveKeystone('대리 성약'),
        maximumRoll: tags.has('attack') && !!findAllocatedPassiveKeystone('한 번의 중량'),
        fullEvasion: !!findAllocatedPassiveKeystone('완전 회피'),
        projectileFormation: tags.has('projectile') && !!findAllocatedPassiveKeystone('관통 행렬'),
        explosiveDistill: tags.has('potion') && !!findAllocatedPassiveKeystone('폭발성 증류'),
        soulSanctuary: !!findAllocatedPassiveKeystone('혼의 성소'),
        movingWall: !!findAllocatedPassiveKeystone('움직이는 성벽'),
        bloodAcceleration: !!findAllocatedPassiveKeystone('피의 가속'),
        openingHunt: !!findAllocatedPassiveKeystone('선제 사냥'),
        taintedWarhead: tags.has('projectile') && !!findAllocatedPassiveKeystone('오염된 탄두'),
        blackDistill: !!findAllocatedPassiveKeystone('검은 증류'),
        singleMystique: !!findAllocatedPassiveKeystone('단일 해석'),
        soleMinion: !!findAllocatedPassiveKeystone('단 하나의 사역'),
        potionOverdose: tags.has('potion') && !!findAllocatedPassiveKeystone('과잉 투여'),
        selfExperiment: !!findAllocatedPassiveKeystone('자가실험'),
        absolution: !!findAllocatedPassiveKeystone('면죄의 복음'),
        timeWarp: !!findAllocatedPassiveKeystone('시간왜곡')
    };
}

function applyPassiveConditionalAilmentRules(passive, flags) {
    if (flags.explosiveDistill) {
        ['igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance']
            .forEach(statId => { passive[statId] += 25; });
    }
    if (flags.taintedWarhead) {
        passive.igniteChance += 20;
        passive.poisonChance += 20;
        passive.bleedChance += 20;
    }
    if (flags.blackDistill) passive.poisonChance += 20;
}

/** The stat calculator passes its tick; a direct caller (tests, tools) may pass `now` and read the live state. */
function readPassiveRuleTickValue(options, name, live) {
    return options.tick ? options.tick.get(name) : live();
}

function applyAuthoredPassiveStatRules(options) {
    const buckets = options.buckets, passive = buckets.passive, reward = buckets.reward;
    applyPassiveKeystoneBucketRules(buckets);
    const flags = getPassiveKeystoneCombatFlags(options.skillTags);
    applyPassiveConditionalAilmentRules(passive, flags);
    // Cycle buffs and fanaticism stacks change during a fight: the stat calculator's tick reads them (js/player-stat-cache.js).
    const activeCycleBuffEffects = readPassiveRuleTickValue(options, 'cycleBuffEffects', () => getActivePassiveCycleBuffEffects(options.now));
    activeCycleBuffEffects.forEach(effect => addStatToBucket(reward, effect.stat, effect.val));
    const damageByElement = {
        phys: sumPassiveRuleStat(buckets, 'physPctDmg'), fire: sumPassiveRuleStat(buckets, 'firePctDmg'),
        cold: sumPassiveRuleStat(buckets, 'coldPctDmg'), light: sumPassiveRuleStat(buckets, 'lightPctDmg'),
        chaos: sumPassiveRuleStat(buckets, 'chaosPctDmg')
    };
    if (damageByElement[options.skillElement] !== undefined) damageByElement[options.skillElement] += 0.01;
    const mystique = getMystiqueAffinity(passive.mystique, damageByElement);
    if (flags.singleMystique) {
        mystique.damagePct *= 2;
        mystique.potencyPct *= 2;
        mystique.chancePct *= 2;
    }
    addStatToBucket(passive, `${mystique.ailment}Chance`, mystique.chancePct);
    const state = ensurePassiveSpecializationState(), corrupted = !!findAllocatedPassiveKeystone('타락한 복음');
    const triple = !corrupted && !!findAllocatedPassiveKeystone('삼중 계시');
    const devotion = Math.max(0, sumPassiveRuleStat(buckets, 'devotion'));
    const cycle = Math.max(0, sumPassiveRuleStat(buckets, 'cycle'));
    const revelation = corrupted ? 'fanaticism' : (triple ? 'triple' : state.revelation);
    if (revelation === 'life') {
        passive.pctHp += devotion * 0.5;
        passive.energyShieldPct += devotion * 0.5;
        passive.regen += devotion * 0.5;
    }
    if (triple) {
        passive.pctHp += devotion * 0.2;
        passive.energyShieldPct += devotion * 0.2;
        passive.regen += devotion * 0.2;
    }
    const wisdomElement = getPassiveWisdomElementFromNodeIds(game.passives).replace('lightning', 'light');
    return { mystique, devotion, cycle, revelation, wisdomElement,
        revelationLabel: triple ? '삼중 계시' : (PASSIVE_REVELATION_LABELS[revelation] || '계시'),
        combatDamageMorePct: revelation === 'combat' ? devotion : (triple ? devotion * 0.4 : 0),
        guardTakenLessPct: revelation === 'guard' ? Math.min(50, Math.floor(devotion / 5)) : (triple ? Math.min(20, Math.floor(devotion / 5) * 0.4) : 0),
        lifeBonusPct: revelation === 'life' ? devotion * 0.5 : (triple ? devotion * 0.2 : 0),
        cycleAddedFireFromPhysicalPct: findAllocatedPassiveKeystone('순환의 원석') ? cycle * 3 : 0,
        fanaticismStacks: corrupted ? Math.min(devotion, Math.max(0, readPassiveRuleTickValue(options, 'fanaticismStacks', () => state.fanaticism.stacks))) : 0,
        activeCycleBuffEffects, flags };
}

function bootstrapPassiveTreeOnceReady() {
    if (hasAuthoredPassiveTreeSource()) {
        loadAuthoredPassiveTree();
        return true;
    }
    generateOrganicTree();
    applyPassiveSpecializations();
    computePassiveDepths();
    rebalancePassiveStartingStats();
    polishPassiveLayout();
    return true;
}

function isPassiveNodeAvailable(nodeOrId) {
    let node = typeof nodeOrId === 'string' ? PASSIVE_TREE.nodes[nodeOrId] : nodeOrId;
    if (!node || (node.requiresEvolution && !(game && game.passiveStarEvolution))) return false;
    if (node.hiddenByKeystoneId && !(game && (game.passives || []).includes(node.hiddenByKeystoneId))) return false;
    return !isVoidSocketHidden(node);
}

/** 공허 소켓(2026-11-06 사용자: 처음에는 안 보이다가 해금하면 보이게): 해금 탭의 공허 소켓을 열기 전에는 공허 칸과 공허 칸이 있어야 뜻이
 * 있는 노드(needsVoidSockets)가 숨는다. 해금 전 저장에 찍어 둔 칸은 루프가 바뀔 때까지 남아 포인트와 옵션을 잃지 않는다. 해금하는 순간
 * 다시 잇는 일은 contentUnlockUi.takeContent가 한다. */
function isVoidSocketHidden(node) {
    if (!needsVoidSockets(node) || !game || typeof contentProgression !== 'object') return false;
    return !contentProgression.isUnlocked('voidSocket') && !(game.passives || []).includes(node.id);
}

/** 공허 칸, 이어진 공허 칸의 효율을 올리는 투영의 문양, 찍은 공허 칸 수만큼 오르는 공허의 별자리(2026-11-06 사용자: 공허 소켓이 없으면
 * 의미가 없는 노드). 이 노드들을 숨겨도 다른 노드로 가는 길은 끊기지 않는다(살아 있는 트리로 확인: 공허 칸 25, 문양 11, 별자리 1). */
function needsVoidSockets(node) {
    return node.kind === 'void' || node.stat === 'voidLinkEfficiency' || node.title === '공허의 별자리';
}

function getPassiveApexNodeIds() {
    return Object.values(PASSIVE_TREE.nodes)
        .filter(node => node.kind === 'apex')
        .map(node => node.id);
}

function getPassiveOuterVoidNodes() {
    return Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.kind === 'void' && node.voidRing === 'outer');
}

/** 성좌 각성: 직업 방향의 공허 소켓 여섯(voidRing 'outer')을 모두 찍으면 영구히 각성한다(2026-11-01 사용자, 초월 조건을 뺐다).
 * 그 소켓이 없는 옛 트리는 별끝 노드 규칙을 쓴다. */
function getPassiveConstellationAwakeningProgress() {
    const outerVoids = getPassiveOuterVoidNodes();
    const owned = new Set(game && game.passives || []);
    if (outerVoids.length === 0) {
        const apexIds = getPassiveApexNodeIds();
        return { mode: 'legacy_apex', required: apexIds.length, completed: apexIds.filter(id => owned.has(id)).length, allocated: 0 };
    }
    const allocated = outerVoids.filter(node => owned.has(node.id));
    return { mode: 'outer_void', required: outerVoids.length, allocated: allocated.length, completed: allocated.length };
}

function unlockPassiveStarEvolution(options) {
    options = options || {};
    if (!game || game.passiveStarEvolution) return false;
    const progress = getPassiveConstellationAwakeningProgress();
    if (progress.required <= 0 || progress.completed < progress.required) return false;

    game.passiveStarEvolution = true;
    game.passiveStarEvolutionSource = progress.mode;
    unlockJournalEntry('passive_star_evolution');
    const revealIds = progress.mode === 'outer_void'
        ? getPassiveOuterVoidNodes().map(node => node.id)
        : getPassiveApexNodeIds();
    revealIds.forEach(id => revealAroundNode(id, {
        forcePulse: !options.silent,
        noBurst: !!options.silent,
        radius: PASSIVE_DISCOVERY_RADIUS + 240,
        edgeDepth: 2
    }));
    game.noti.char = true;

    if (!options.silent) {
        addLog(_t('✨ 별의 공명이 일어납니다.'), 'loot-rare');
        queueTutorialNotice(
            'passive_star_evolution',
            _t('성좌 각성'),
            progress.mode === 'outer_void'
                ? '직업 공허 소켓 여섯을 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다.'
                : '별끝 특수 노드를 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해/생명력/이동 속도가 오릅니다.',
            'tab-char'
        );
    }
    return true;
}

function normalizeMeteorSiteTiers(site) {
    site.skyRiftMinTier = Number.isFinite(site.skyRiftMinTier) ? Math.max(1, Math.floor(site.skyRiftMinTier)) : null;
    site.activeMeteorTier = Number.isFinite(site.activeMeteorTier) ? Math.max(8, Math.min(40, Math.floor(site.activeMeteorTier))) : null;
    const returnZoneId = site.meteorReturnZoneId;
    site.meteorReturnZoneId = ['number', 'string'].includes(typeof returnZoneId) && returnZoneId !== METEOR_FALL_ZONE_ID ? returnZoneId : null;
}

/** 운석 낙하 지점: 하늘 균열 게이지 · 들어갈 단계 · 돌아갈 사냥터 · 별자리 관측 버프. 별쐐기가 없어지며(2026-10-01)
 * 별쐐기 저장에서 떼어 냈다. 불러오기와 런타임이 같은 정규화를 쓴다. */
function ensureMeteorSiteState(owner = game) {
    const site = owner.meteorSite && typeof owner.meteorSite === 'object' ? owner.meteorSite : {};
    owner.meteorSite = site;
    METEOR_SITE_FLAGS.forEach(key => { site[key] = !!site[key]; });
    METEOR_SITE_NUMBERS.forEach(([key, max, whole]) => {
        const value = Math.min(max, Math.max(0, Number(site[key]) || 0));
        site[key] = whole ? Math.floor(value) : value;
    });
    normalizeMeteorSiteTiers(site);
    // 운석 종류가 생기기 전에 채운 하늘 균열과 원정은 그때처럼 불타는 운석이다.
    const known = METEOR_KINDS.some(kind => kind.id === site.kind);
    site.kind = known ? site.kind : (site.skyRiftReady || site.activeMeteorTier ? METEOR_KINDS[0].id : null);
    site.constellationBuff = site.constellationBuff && typeof site.constellationBuff === 'object' ? site.constellationBuff : null;
    return site;
}

/** 하늘 균열이 다 찼을 때 떨어질 운석: 다섯 종류가 같은 확률이다. */
function rollMeteorKind(random = Math.random) {
    return METEOR_KINDS[Math.min(METEOR_KINDS.length - 1, Math.floor(random() * METEOR_KINDS.length))].id;
}

/** 정해진 운석(하늘 균열이 다 찼거나 원정 중), 없으면 null. */
function getMeteorKind(site = ensureMeteorSiteState()) {
    return METEOR_KINDS.find(kind => kind.id === site.kind) || null;
}

/** 공허 옵션(2026-11-01 사용자): 조건이 까다로운 줄일수록 수치가 높다. 피해 < 공격, 주문, 원소 < 근접, 투사체, 물리, 범위, 지속 < 화염, 냉기, 번개, 카오스 < 강타, 포션, 기동, 소환수 < 무기 사용 시.
 * group은 제작 창의 목표 옵션 묶음이다(js/void-craft-ui.js). 트리의 설계 옵션(신비, 헌신, 순환, 공명력, 보조룬 한도, 룬 레벨, 추가 발사, 연쇄, 두 배 피해, 최대 저항, 피해 전환)은 넣지 않는다. */
function voidOptionRows(group, rows) {
    return rows.map(([id, min, max, step]) => ({ id, min, max, step, group }));
}

function getVoidPassiveNodeIds() {
    return Object.values(PASSIVE_TREE.nodes || {})
        .filter(node => node && node.kind === 'void')
        .map(node => String(node.id));
}

function ensureVoidPassiveState() {
    game.voidPassives = (game.voidPassives && typeof game.voidPassives === 'object') ? game.voidPassives : {};
    Object.keys(game.voidPassives).forEach(nodeId => {
        // The tree is indexed by node id. Visit owned entries, not the entire tree on every stat read.
        let node = PASSIVE_TREE.nodes[nodeId];
        if (!node || node.kind !== 'void' || String(node.id) !== nodeId) {
            delete game.voidPassives[nodeId];
            return;
        }
        let entry = game.voidPassives[nodeId] && typeof game.voidPassives[nodeId] === 'object' ? game.voidPassives[nodeId] : {};
        let stats = Array.isArray(entry.stats) ? entry.stats : [];
        entry.stats = stats
            .filter(line => line && isVoidPassiveLineStat(line.id) && Number.isFinite(Number(line.val)))
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

/** 줄이 될 수 있는 능력치: 아이템 능력치와, 이름만 있는 패시브 전용 능력치(무기 조건 줄, 지속시간). */
function isVoidPassiveLineStat(statId) {
    return !!(P_STATS[statId] || STAT_DISPLAY_NAMES[statId]);
}

function formatVoidPassiveStatLine(line) {
    if (!line || !isVoidPassiveLineStat(line.id)) return '';
    const isPct = P_STATS[line.id] ? P_STATS[line.id].isPct : /\(%\)/.test(STAT_DISPLAY_NAMES[line.id]);
    const shown = value => `+${formatValue(line.id, value)}${isPct ? '%' : ''}`, final = shown(line.val);
    // 효율이 곱해진 줄(투영의 문양, 공허의 별자리 등)은 최종 수치 뒤에 굴린 원본을 적는다(2026-11-02 사용자).
    const original = line.baseVal === undefined || shown(line.baseVal) === final ? '' : _t(' (원본 {baseVal})', { baseVal: shown(line.baseVal) });
    return `${String(getStatName(line.id)).replace(/\s*\((\+%p|%)\)\s*/g, '').trim()} ${final}${original}`;
}

/** 초월의 최종 수치와 원본: 값이 곱해지는 초월은 곱한 값으로 적고, 달라진 수치의 원본을 뒤에 적는다. 포인트와 보조룬 한도는 정수라 곱하지 않는다(getTranscendentVoidPassiveStats). */
function getTranscendentVoidEffectLabel(nodeId, tr) {
    const def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === tr.id), scale = getVoidLinkScale(nodeId);
    if (!def || scale === 1 || !TRANSCENDENT_VOID_STAT_LINES[tr.id] || ['paleBlueDot', 'resonantStar'].includes(tr.id)) return formatTranscendentVoidPassive(tr);
    const round = value => Math.round(value * 100) / 100;
    const value2 = tr.id === 'innateTalent' ? 1 + (tr.value2 - 1) * scale : tr.value2 * scale;
    const scaled = { ...tr, value: round(tr.value * scale), value2: round(value2) }, after = def.desc(scaled.value, scaled.value2).split(' ');
    const original = new Set(def.desc(tr.value, tr.value2).split(' ').filter((word, index) => word !== after[index]));
    return `${formatTranscendentVoidPassive(scaled)}${original.size ? ` (원본 ${[...original].join(', ')})` : ''}`;
}

function getVoidPassiveEffectLabel(nodeId) {
    let entry = getVoidPassiveCraft(nodeId);
    if (entry.transcendent) {
        return getTranscendentVoidEffectLabel(nodeId, entry.transcendent);
    }
    if (!entry.stats.length) return '공허 옵션 없음';
    return passiveRouting.voidStats(entry, game, getVoidLinkScale(nodeId)).map(formatVoidPassiveStatLine).filter(Boolean).join(' / ');
}

/** 명왕성: 1개 80% · 2개 16% · 3개 3.2% · 4개 0.64% · 5개 0.16%(1/625). 옛 고유 별쐐기의 공허 생성 확률 그대로. */
function rollPlutoVoidCount() {
    const roll = Math.random();
    return [0.8, 0.96, 0.992, 0.9984].filter(edge => roll >= edge).length + 1;
}

function countAllocatedPassivesWithin(nodeId, radius, owner = game) {
    const center = PASSIVE_TREE.nodes[nodeId];
    if (!center) return 0;
    return (owner.passives || []).filter(id => {
        const node = PASSIVE_TREE.nodes[id];
        return node && id !== nodeId && node.kind !== 'start' && Math.hypot(node.x - center.x, node.y - center.y) <= radius;
    }).length;
}

/** 할당한 공허 패시브 수에 트라우마 · 명왕성이 더하는 간주 개수. 공허 하나당 효과(넘치는 활기 · 전심전력 …)가 쓴다. */
function getVirtualVoidPassiveCount(owner = game) {
    const allocated = (owner.passives || []).filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind === 'void').length;
    return allocated + passiveRouting.transcendentValue(owner, 'trauma') + passiveRouting.transcendentValue(owner, 'pluto');
}

function getTranscendentVoidPassiveStats(nodeId, entry, voidCount, owner = game) {
    const tr = entry && entry.transcendent;
    const rule = tr && TRANSCENDENT_VOID_STAT_LINES[tr.id];
    if (!rule) return [];
    const ctx = { voidCount, loopCount: Math.max(0, Math.floor(owner.loopCount || 0)),
        allocatedWithin: radius => countAllocatedPassivesWithin(nodeId, radius, owner) };
    const linkScale = getVoidLinkScale(nodeId);   // 투영의 문양은 초월에도 곱한다(2026-11-01 사용자). 포인트와 보조룬 한도는 정수라 그대로 둔다.
    return rule(tr, ctx).map(([stat, val]) => ({ stat, val: (Number(val) || 0) * (['passivePoint', 'suppCap'].includes(stat) ? 1 : linkScale) }));
}

function normalizeTranscendentVoidPassive(raw) {
    if (!raw || typeof raw !== 'object') return null;
    let def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === raw.id);
    if (!def) return null;
    let value = Number.isFinite(Number(raw.value)) ? Number(raw.value) : (def.fixed || def.min || 0);
    let value2 = Number.isFinite(Number(raw.value2)) ? Number(raw.value2) : (def.min2 || 0);
    return { id: def.id, value: clampTranscendentValue(def, value), value2 };
}

/** 범위가 바뀐 옵션(9단계)은 불러올 때 새 범위로 맞춘다: 예전 범위의 낮은 값은 새 최솟값으로, 범위 안의 값은 그대로. */
function clampTranscendentValue(def, value) {
    if (!Number.isFinite(def.min) || !Number.isFinite(def.max)) return value;
    return Math.min(def.max, Math.max(def.min, value));
}

function formatTranscendentVoidPassive(entry) {
    let def = TRANSCENDENT_VOID_PASSIVE_DB.find(row => row.id === (entry && entry.id));
    if (!def) return '공허 옵션 없음';
    return `<span style="color:#d8b4ff;">${_t('{name} (초월)', { name: def.name })}</span>: ${def.desc(entry.value, entry.value2)}`;
}

function rollVoidPassiveOption(existingStats) {
    let used = new Set((existingStats || []).map(line => line && line.id));
    let pool = VOID_PASSIVE_OPTION_POOL.filter(opt => !used.has(opt.id));
    if (!pool.length) return null;
    let pick = rndChoice(pool);
    const step = pick.step || 1, slots = Math.round((pick.max - pick.min) / step);
    return { id: pick.id, val: Number((pick.min + Math.floor(Math.random() * (slots + 1)) * step).toFixed(2)) };
}

/** 마법의 새싹 하나: 옵션을 지우고 1~2줄을 다시 굴린다(제작 창의 한 번 쓰기와 연속 사용이 같이 쓴다). 재화는 부르는 쪽이 줄인다. */
function rollMagicBudOnVoid(entry) {
    const nextStats = [], optionCount = 1 + Math.floor(Math.random() * 2);
    for (let index = 0; index < optionCount; index++) {
        const next = rollVoidPassiveOption(nextStats);
        if (next) nextStats.push(next);
    }
    entry.stats = nextStats;
    entry.rarity = nextStats.length > 0 ? 'magic' : 'normal';
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
    return rollTranscendentDef(rndChoice(pool));
}

/** 그 초월을 새로 얻을 때의 값(고정, 굴림 함수, 아니면 범위 안에서 굴림). */
function rollTranscendentDef(def) {
    let roll = (min, max, step) => {
        if (!Number.isFinite(Number(min)) || !Number.isFinite(Number(max))) return 0;
        let s = Number.isFinite(Number(step)) ? Number(step) : 1;
        let slots = Math.max(0, Math.floor((Number(max) - Number(min)) / s + 0.00001));
        let value = Number(min) + Math.floor(Math.random() * (slots + 1)) * s;
        return s < 1 ? Number(value.toFixed(2)) : Math.floor(value);
    };
    let value = def.fixed || (def.rollValue ? def.rollValue() : roll(def.min, def.max));
    return { id: def.id, value, value2: roll(def.min2, def.max2, def.step2) };
}

/** 카멜레온이 바꿀 수 있는 초월: 카멜레온 자신, 다른 노드에 이미 있는 초월(초월은 트리에 하나씩), 태양(카멜레온 노드에는 지킬 옵션이
 * 없어 아무 효과가 없다)은 빠진다. */
function getChameleonChoices(nodeId) {
    const owned = getOwnedTranscendentVoidPassiveIds(nodeId);
    return TRANSCENDENT_VOID_PASSIVE_DB.filter(def => !['chameleon', 'sun'].includes(def.id) && !owned.has(def.id));
}

/** 활성화한 카멜레온 공허 노드의 기록, 아니면 null. */
function activeChameleonEntry(nodeId) {
    const node = PASSIVE_TREE.nodes[nodeId], entry = node && node.kind === 'void' ? getVoidPassiveCraft(node.id) : null;
    return entry && (game.passives || []).includes(node.id) && entry.transcendent && entry.transcendent.id === 'chameleon' ? entry : null;
}

/** 카멜레온(초월 공허)을 고른 초월로 바꾼다(2026-10-20 사용자: "선택해서 변환 가능하게"). 값은 새로 굴리고, 한 번 바꾸면 카멜레온이
 * 아니다. 스킬트리 포인트(창백한 푸른 점)와 연결(블랙홀, 안드로메다)은 바로 정산한다. '' when done, otherwise why not. */
function convertChameleonVoidPassive(nodeId, targetId) {
    if (game.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.';
    const entry = activeChameleonEntry(nodeId);
    if (!entry) return '활성화한 카멜레온 공허 패시브만 바꿀 수 있습니다.';
    const def = getChameleonChoices(nodeId).find(row => row.id === targetId);
    if (!def) return '고를 수 없는 초월입니다.';
    const previous = entry.transcendent;
    entry.transcendent = rollTranscendentDef(def);
    syncPaleBlueDotPassivePoints(previous, entry.transcendent);
    if (isRoutingTranscendent(entry.transcendent)) refreshPassiveConnectivity();
    playerStatCache.invalidate();
    return '';
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
    return { id: def.id, value: def.rollValue ? def.rollValue() : roll(def.min, def.max), value2: roll(def.min2, def.max2, def.step2) };
}

function getTranscendentVoidPassiveCount(id, owner = game) {
    let state = owner === game ? ensureVoidPassiveState() : (owner.voidPassives || {});
    return (owner.passives || []).filter(nodeId => state[nodeId]?.transcendent?.id === id).length;
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
    if (changed && typeof addLog === 'function') addLog(_t('🛡️ 불멸의 영웅 효과가 사망으로 생명력 -30 감소했습니다.'), 'death');
    return changed;
}

/** 블랙홀 · 안드로메다는 연결 판정을 바꾼다. 생기거나 사라지면 끊긴 투자를 정산한다. */
function isRoutingTranscendent(entry) {
    return !!entry && ['blackHole', 'andromeda'].includes(entry.id);
}

/** 요정의 고리: 25%로 초월, 아니면 옵션 없는 공허가 된다. 태양은 직전 옵션을 지킨다(3배로 적용).
 * 포인트(창백한 푸른 점)나 연결(블랙홀 · 안드로메다)을 바꾸는 초월은 바로 정산한다. */
function rollFairyRingOnVoid(entry, nodeId) {
    const previous = entry.transcendent;
    entry.transcendent = Math.random() < 0.75 ? null : rollTranscendentVoidPassive(nodeId);
    if (!entry.transcendent || entry.transcendent.id !== 'sun') entry.stats = [];
    syncPaleBlueDotPassivePoints(previous, entry.transcendent);
    if (isRoutingTranscendent(previous) || isRoutingTranscendent(entry.transcendent)) refreshPassiveConnectivity();
    entry.rarity = entry.transcendent ? 'transcendent' : 'normal';
}

function syncPaleBlueDotPassivePoints(previousEntry, nextEntry) {
    let previous = previousEntry && previousEntry.id === 'paleBlueDot' ? Number(previousEntry.value || 0) : 0;
    let next = nextEntry && nextEntry.id === 'paleBlueDot' ? Number(nextEntry.value || 0) : 0;
    if (previous === next) return;
    const budget = passiveRouting.pointBudget(game) - previous + next;
    passiveRouting.reconcile(game, PASSIVE_TREE, getPassiveRouting(), budget);
}

/** 요정의 고리는 잃을 것이 있는 공허 패시브(옵션 또는 초월)에만 쓴다 — 빈 소켓에 쓰면 실패해도 잃는 게 없는 공짜 도박이 되고,
 * 검토 4차에서 아무 변화 없이 재화만 사라진 것처럼 보였다. */
function rollFairyRingOnCraftedVoid(entry, nodeId) {
    if (!entry.transcendent && !(entry.stats || []).length) {
        return { text: _t('요정의 고리는 옵션이 있는 공허 패시브에만 쓸 수 있습니다. 마법의 새싹으로 먼저 옵션을 굴리세요.'), tone: 'attack-monster' };
    }
    if (entry.fairyLocked) return { text: _t('이 소켓에는 이번 루프에 요정의 고리를 다시 쓸 수 없습니다.'), tone: 'attack-monster' };
    game.currencies.fairyRing--;
    rollFairyRingOnVoid(entry, nodeId);
    if (!entry.transcendent) entry.fairyLocked = true;   // 실패: 이번 루프 동안 이 소켓은 잠긴다. 루프가 끝나면 game.voidPassives와 함께 풀린다.
    return entry.transcendent
        ? { text: _t('🌌 공허 패시브 초월: {replace}', { replace: formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '') }), tone: 'loot-unique' }
        : { text: _t('💥 요정의 고리: 초월에 실패해 공허 패시브의 옵션이 지워졌습니다.'), tone: 'attack-monster' };
}

function applyVoidPassiveCurrency(nodeId, currencyKey) {
    if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog(_t('공허 패시브에만 사용할 수 있습니다.'), 'attack-monster');
    if (!(game.passives || []).includes(node.id)) return addLog(_t('먼저 공허 패시브를 활성화해야 합니다.'), 'attack-monster');
    if (!['magicBud', 'fairyRing', 'goldenRule'].includes(currencyKey)) return addLog(_t('공허 패시브에는 마법의 새싹, 요정의 고리, 황금률만 사용할 수 있습니다.'), 'attack-monster');
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog(_t('재화가 부족합니다.'), 'attack-monster');
    let entry = getVoidPassiveCraft(node.id);
    if (currencyKey === 'fairyRing') {
        const outcome = rollFairyRingOnCraftedVoid(entry, node.id);
        addLog(outcome.text, outcome.tone);
        unlockPassiveStarEvolution();
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (currencyKey === 'goldenRule') {
        if (!entry.transcendent || !TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min)))) return addLog(_t('황금률은 수치가 있는 초월 공허 패시브에만 사용할 수 있습니다.'), 'attack-monster');
        game.currencies.goldenRule--;
        let previousTranscendent = entry.transcendent;
        entry.transcendent = rerollTranscendentVoidPassive(entry.transcendent);
        syncPaleBlueDotPassivePoints(previousTranscendent, entry.transcendent);
        addLog(_t('✨ 초월 공허 패시브 수치 재굴림: {replace}', { replace: formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '') }), 'loot-unique');
        updateStaticUI();
        queueImportantSave(200);
        return;
    }
    if (entry.transcendent) return addLog(_t('초월 공허 패시브에는 마법의 새싹을 사용할 수 없습니다.'), 'attack-monster');
    game.currencies[currencyKey]--;
    rollMagicBudOnVoid(entry);
    addLog(_t('🕳️ 공허 패시브에 {name} 사용: {replace}', { name: _t(ORB_DB[currencyKey].name), replace: getVoidPassiveEffectLabel(node.id).replace(/<[^>]*>/g, '') }), 'loot-magic');
    updateStaticUI();
    queueImportantSave(200);
}

function getPassiveConnectionNodeIds() {
    let result = new Set((game && Array.isArray(game.passives) ? game.passives : []).filter(id => isPassiveNodeAvailable(id)).map(String));
    const rootId = getPassiveTreeRootNodeId();
    if (isPassiveNodeAvailable(rootId)) result.add(rootId);
    return result;
}

/** Shown DPS and life now and after edit(copy): { dps: [before, after], life: [before, after] }. The edit is made on a copy of the
 * game, as the bag analysis tries gear on (js/equipment-triage.js readSnapshotStats), so the live build, the fields the stat
 * calculation writes and its kept calculation stay as they are. The bag is shared, not copied: the calculation only reads it. */
function previewBuildStats(edit) {
    const live = game, before = getPlayerStats(false);
    try {
        game = JSON.parse(JSON.stringify({ ...live, inventory: undefined }));
        game.inventory = live.inventory;
        edit(game);
        const after = getPlayerStats(false);
        return { dps: [before.dps || 0, after.dps || 0], life: [before.maxHp || 0, after.maxHp || 0], before, after };
    } finally {
        game = live;
    }
}

/** previewBuildStats with the skill tree nodes nodeIds taken (the skill tree tooltip, js/ui.js). */
function previewPassiveNodeStats(nodeIds) {
    return previewBuildStats(copy => { copy.passives = [...new Set([...(copy.passives || []), ...nodeIds])]; });
}

/** "DPS 61 → 64, 생명력 170 → 180" for a preview ({ dps: [before, after], life: [before, after] }): each part only when it changes,
 * green up and red down; '' when none does. The skill tree tooltip, the ascendancy window and the act reward window word it alike.
 * A part never wraps inside: the skill tree's longer "이 노드까지 할당 시" line broke between "98 →" and "128" (2026-10-21). */
function buildStatPreviewParts(preview) {
    const format = COMPARE_STAT_META.dps.format;
    const part = (label, [before, after]) => (format(before) === format(after) ? ''
        : `<span style="color:${after > before ? '#8fe0a8' : '#ff9b92'}; white-space:nowrap;">${label} ${format(before)} → ${format(after)}</span>`);
    return [part('DPS', preview.dps), part('생명력', preview.life)].filter(Boolean).join(', ');
}

/** 연결이 바뀔 수 있는 일(초월 공허의 블랙홀 · 안드로메다가 생기거나 사라짐) 뒤에 끊긴 투자를 돌려받고 닿는 노드를 다시 센다. */
function refreshPassiveConnectivity() {
    passiveRouting.reconcile(game, PASSIVE_TREE, getPassiveRouting());
    calculateReachableNodes();
    refreshPassiveVisibility();
}

function tryUnlockMeteorContentByProgress() {
    let st = ensureMeteorSiteState();
    if (st.unlocked || !getMeteorSiteUnlockReady()) return false;
    st.unlocked = true;
    addLog(_t('☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다.'), 'loot-unique');
    queueOpenContentNotice('meteorSite', 'meteor_unlocked', '운석 낙하 지점', '검은 별이 떨어지기 시작했습니다.\n액트 7을 넘긴 사냥터에서 사냥하면 하늘의 균열 게이지가 찹니다.\n게이지가 100%가 되면 ‘지도 → 탐험 → 운석 낙하’에 한 번 들어갈 수 있습니다.', 'tab-map');
    return true;
}

/** 이상 현상: 운석 낙하 지점이 열리면 사냥 중 가끔 하늘 균열 게이지가 더 찬다(희귀하면 더 많이). */
function triggerAstronomerAnomaly(zone, enemy) {
    if (!contentProgression.isUnlocked('meteorSite')) return false;
    let st = ensureMeteorSiteState();
    let now = getCombatTime();
    if (now - (st.lastAnomalyAt || 0) < 12000) return false;
    let baseChance = enemy && enemy.isBoss ? 0.08 : (enemy && enemy.isElite ? 0.028 : 0.0045);
    if (Math.random() >= baseChance) return false;
    st.lastAnomalyAt = now;
    let rare = Math.random() < 0.22;
    if (rare) {
        st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + 8, 0, 100);
        addLog(_t('☄️ 희귀 이상 현상 관측! 균열 게이지 +8%'), 'loot-unique');
    } else {
        st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + 3, 0, 100);
        addLog(_t('✨ 이상 현상 관측: 균열 게이지 +3%'), 'loot-magic');
    }
    return true;
}

/** 별자리 관측: 아틀라스 패시브 '떨어지는 별'이 있으면 운석 정산마다 능력치 하나를 관측한다. 루프가 바뀌어도 남는다. */
function grantConstellationObservationReward() {
    if (!atlasPassives.has(game, 'constellation')) return;
    let st = ensureMeteorSiteState();
    let pick = rndChoice(METEOR_CONSTELLATION_POOL);
    st.constellationBuff = { stat: pick.stat, label: pick.label, val: pick.val, observedAt: Date.now(), permanent: true };
    addLog(_t('🌠 별자리 관측: {label} +{value}{unit} (루프 후 유지)', { label: _t(pick.label), value: pick.val, unit: pick.stat === 'flatHp' ? '' : '%' }), 'loot-unique');
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
    return baseGain * Math.max(1, effectiveTier);
}

function gainSkyRiftGaugeFromCombat(zone, enemy) {
    let st = ensureMeteorSiteState();
    if (!st.unlocked || st.skyRiftReady) return;
    if (!zone) return;
    let eligible = (zone.type === 'act' && zone.id >= METEOR_SITE_UNLOCK_ACT) || zone.type === 'abyss' || zone.type === 'labyrinth' || zone.type === 'chaosRealm' || zone.type === 'skyTower' || zone.type === 'underworld' || zone.type === 'cosmos';
    if (!eligible) return;
    if (!st.skyRiftReady && (st.skyRiftGauge || 0) <= 0.0001) {
        st.skyRiftAllCosmos = true;
        st.skyRiftMinTier = null;
    }
    if (zone.type !== 'cosmos') st.skyRiftAllCosmos = false;
    let gain = getSkyRiftGaugeGain(zone, enemy, st);
    triggerAstronomerAnomaly(zone, enemy);
    let nextGauge = (st.skyRiftGauge || 0) + gain;
    st.skyRiftGauge = clampNumber(nextGauge, 0, 100);
    let tier = getSkyRiftGaugeEffectiveTier(zone, st);
    st.skyRiftMinTier = Number.isFinite(st.skyRiftMinTier) ? Math.min(st.skyRiftMinTier, tier) : tier;
    if (st.skyRiftGauge >= 100 && !st.skyRiftReady) {
        let overflow = Math.max(0, nextGauge - 100);
        st.skyRiftGauge = 100;
        st.skyRiftCarryGauge = Math.min(99, Math.floor(overflow * 0.25));
        st.skyRiftReady = true;
        st.kind = rollMeteorKind();
        const kind = getMeteorKind(st);
        addLog(_t('☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다. ({name}, {element})', { name: _t(kind.name), element: kind.element }), 'loot-rare');
        game.noti.map = true;
    }
}

function getOceanFishingStrategyDef(st) {
    let state = st || ensureOceanState();
    return OCEAN_FISHING_STRATEGIES[state.fishingStrategy] || OCEAN_FISHING_STRATEGIES.balanced;
}

function getOceanFishCollectionProgress(st) {
    let state = st || ensureOceanState();
    let discovered = Object.keys(OCEAN_FISH_DB).filter(key => (state.fishCaughtTotal[key] || 0) > 0);
    let claimed = new Set(state.claimedCollectionMilestones || []);
    let milestones = OCEAN_FISH_COLLECTION_MILESTONES.map(row => ({
        ...row,
        ready: discovered.length >= row.required,
        claimed: claimed.has(row.required)
    }));
    return { discovered, discoveredCount: discovered.length, totalCount: Object.keys(OCEAN_FISH_DB).length, milestones };
}

function getOceanFishCollectionBonus(key, st) {
    let state = st || ensureOceanState();
    let claimed = new Set(state.claimedCollectionMilestones || []);
    return OCEAN_FISH_COLLECTION_MILESTONES.reduce((sum, row) => {
        return sum + (claimed.has(row.required) ? Math.max(0, Number((row.bonus || {})[key]) || 0) : 0);
    }, 0);
}

function setOceanFishingStrategy(strategyId) {
    let st = ensureOceanState();
    let strategy = OCEAN_FISHING_STRATEGIES[strategyId];
    if (!strategy) return false;
    if (st.diving) { addLog(_t('낚시 전략은 수면에서만 변경할 수 있습니다.'), 'attack-monster'); return false; }
    if (st.fishingStrategy === strategyId) return true;
    st.fishingStrategy = strategyId;
    addLog(_t('{icon} 낚시 전략을 {name} 변경했습니다.', { icon: strategy.icon, name: withDirectionParticle(`'${_t(strategy.name)}'`) }), 'loot-magic');
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    if (typeof updateStaticUI === 'function') updateStaticUI();
    return true;
}

function claimOceanFishCollectionMilestone(requiredCount) {
    let st = ensureOceanState();
    let required = Math.max(0, Math.floor(requiredCount || 0));
    let milestone = OCEAN_FISH_COLLECTION_MILESTONES.find(row => row.required === required);
    let progress = getOceanFishCollectionProgress(st);
    let status = progress.milestones.find(row => row.required === required);
    if (!milestone || !status || !status.ready || status.claimed) return false;
    st.claimedCollectionMilestones.push(required);
    Object.keys(milestone.reward || {}).forEach(key => awardCurrency(key, milestone.reward[key]));
    addLog(_t("📘 심해 도감 '{label}' 보상을 획득했습니다.", { label: _t(milestone.label) }), 'loot-unique');
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    if (typeof updateStaticUI === 'function') updateStaticUI();
    return true;
}

function advanceOceanDiveFromKill(zone) {
    // 일반 심해 전투 구간 전체 완료 시 호출한다. 개별 몬스터나 가디언 보상과 중복하지 않는다.
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    if (Math.random() < 0.06) awardCurrency('reefFragment', 1);
    // 수심은 몬스터를 쓰러뜨릴 때마다 쌓여 조금씩 내려간다(applyOceanKill, tickOceanDepth). 구간을 끝내면 낚시만 준다.
    gainOceanFishingGaugeFromCombat(zone);
}

function gainOceanFishingGaugeFromCombat(zone) {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    // 낚시 게이지는 구역 강도(수심 단계)에 따라 세분화: 얕은(약한) 곳에선 조금, 깊은(강한) 곳에선 조금 더 오른다.
    let depthTier = Math.max(0, Math.floor(zone?.depthTier ?? getOceanDepthTier(st.depthM)));
    let strategy = getOceanFishingStrategyDef(st);
    let collectionGainPct = getOceanFishCollectionBonus('gaugeGainPct', st);
    // A first dive clears only three shallow sections before the 500m guardian, so each gives at least 35 and the first fish comes in
    // that dive (it came in the third, eight minutes in); deeper water improves pace up to tier20.
    let gain = Math.max(35, 20 + Math.min(depthTier, 20) * 2) * getOceanFishingGaugeGainMul();
    gain *= Math.max(0.1, Number(strategy.gaugeGainMul) || 1) * (1 + collectionGainPct / 100);
    if (hasOceanCurrent(zone, 'school_of_fish')) gain *= 1.5;
    gain = Math.min(100, gain); // At most one catch per completed encounter, including all bonuses.
    let nextGauge = (st.fishingGauge || 0) + gain;
    st.fishingGauge = clampNumber(nextGauge, 0, 100);
    if (st.fishingGauge >= 100) {
        st.fishingGauge = clampNumber(nextGauge - 100, 0, 99.99);
        catchOceanFish(st.pressureLevel || 0);
    }
}

function catchOceanFish(depthTier) {
    let safeTier = Math.max(0, Math.floor(depthTier || 0));
    let eligible = Object.keys(OCEAN_FISH_DB).filter(key => (OCEAN_FISH_DB[key].depthTier || 0) <= safeTier);
    if (eligible.length === 0) return null;
    let st = ensureOceanState();
    let strategy = getOceanFishingStrategyDef(st);
    let rareEligible = eligible.filter(key => (OCEAN_FISH_RARITY_META[OCEAN_FISH_DB[key].rarity] || {}).rank >= 2);
    let guaranteed = st.rareFishPity >= 100 && rareEligible.length > 0;
    if (guaranteed) eligible = rareEligible;
    let rareChanceBonusPct = 0;
    try { if (typeof getPlayerStats === 'function') rareChanceBonusPct = Math.max(0, Number(getPlayerStats().oceanRareFishChancePct) || 0); } catch (e) { console.warn('failed to read ocean rare fish chance stat:', e); }
    rareChanceBonusPct += getOceanFishCollectionBonus('rareChancePct', st);
    let weights = eligible.map(key => {
        let fish = OCEAN_FISH_DB[key];
        let rarityRank = (OCEAN_FISH_RARITY_META[fish.rarity] || {}).rank || 0;
        let rareWeight = Number.isFinite(fish.rareWeight) ? fish.rareWeight : 1;
        if (rarityRank >= 2) rareWeight *= Math.max(0.1, Number(strategy.rareWeightMul) || 1) * (1 + rareChanceBonusPct / 100);
        return (1 / (1 + (safeTier - (fish.depthTier || 0)))) * rareWeight;
    });
    let total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let picked = eligible[0];
    for (let i = 0; i < eligible.length; i++) {
        roll -= weights[i];
        if (roll <= 0) { picked = eligible[i]; break; }
    }
    let wasDiscovered = (st.fishCaughtTotal[picked] || 0) > 0;
    st.fishStock[picked] = Math.max(0, Math.floor(st.fishStock[picked] || 0)) + 1;
    st.fishCaughtTotal[picked] = Math.max(0, Math.floor(st.fishCaughtTotal[picked] || 0)) + 1;
    let rarityRank = (OCEAN_FISH_RARITY_META[OCEAN_FISH_DB[picked].rarity] || {}).rank || 0;
    st.rareFishPity = rarityRank >= 2 ? 0 : Math.min(100, st.rareFishPity + Math.max(1, Number(strategy.pityGain) || 8));
    st.lastCatch = { key: picked, at: Date.now(), guaranteed };
    addBattleFx('fishCatch', {duration:400, background:game.isBackgroundCalculation});
    let logType = rarityRank >= 4 ? 'loot-unique' : (rarityRank >= 2 ? 'loot-rare' : 'loot-magic');
    addLog(_t('{omen}{fish} 낚았습니다!', { omen: guaranteed ? `${_t('✨ 희귀 조짐 적중!')} ` : '🐟 ', fish: withObjectParticle(_t(OCEAN_FISH_DB[picked].name)) }), logType);
    let discoveredCount = getOceanFishCollectionProgress(st).discoveredCount;
    if (!wasDiscovered && OCEAN_FISH_COLLECTION_MILESTONES.some(row => row.required === discoveredCount)) {
        addLog(_t('📘 심해 도감 {discoveredCount}/{length}, 받을 보상이 있습니다.', { discoveredCount, length: Object.keys(OCEAN_FISH_DB).length }), 'loot-rare');
        game.noti.map = true;
    }
    return picked;
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
        .map(key => `${getCurrencyInfo(key).name} ${cost[key]}`)
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
    if (!cost) return addLog(_t('{label} 업그레이드는 이미 최대 단계입니다.', { label: _t(def.label) }), 'attack-monster');
    if (!canPayOceanUpgradeCost(cost)) return addLog(_t('{label} 업그레이드 재료가 부족합니다. (필요: {cost})', { label: _t(def.label), cost: getOceanUpgradeCostText(cost) }), 'attack-monster');
    payOceanUpgradeCost(cost);
    st.permanentUpgrades[key] = getOceanPermanentUpgradeLevel(key) + 1;
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = Math.min(st.oxygenMax, (st.oxygenCur || 0) + (key === 'oxygenMax' ? def.valuePerLevel : 0));
    addLog(_t('🌊 심해 영구 업그레이드: {label} Lv.{permanentUpgrades} 달성', { label: _t(def.label), permanentUpgrades: st.permanentUpgrades[key] }), 'loot-rare');
    updateStaticUI();
    queueImportantSave(200);
    return true;
}

function installOceanReefFragment() {
    let st = ensureOceanState();
    if (!st.unlocked) return false;
    if (st.reefInstalled >= 10) return addLog(_t('암초 조각을 더 설치할 수 없습니다 (최대치).'), 'attack-monster');
    if ((game.currencies.reefFragment || 0) < 1) return addLog(_t('암초 조각이 부족합니다.'), 'attack-monster');
    game.currencies.reefFragment -= 1;
    st.reefInstalled = Math.max(0, Math.floor(st.reefInstalled || 0)) + 1;
    addLog(_t('🪸 암초 조각을 설치했습니다. (낚시 게이지 충전 +{value}%)', { value: st.reefInstalled * 15 }), 'loot-rare');
    queueImportantSave(200);
}

/** 연결 판정 재료: 직업 시작점, 블랙홀 초월 공허(무료 연결 거점), 안드로메다 초월 공허 반경 안의 노드(연결 없이 할당), 길 간선. */
function getPassiveRouting(owner = game) {
    const allocated = new Set(owner.passives || []);
    return { root: getPassiveTreeRootNodeId(owner), virtual: passiveRouting.transcendentNodeIds(owner, 'blackHole'),
        free: passiveRouting.freeNodes(PASSIVE_TREE, owner), passable: getPassiveGatedStartIds(owner), edges: PASSIVE_TREE.edges.filter(edge => isPassiveTreePathEdge(edge, allocated)) };
}

/** 체크포인트부터 잠수를 시작한다. 떠오르면 지금 있던 사냥터로 돌아온다(takeOceanReturnZone). auto: 자동 재잠수(js/combat.js
 * autoRediveOceanAfterClear)가 불렀는지. 손으로 시작한 잠수는 소득 없이 떠오른 잠수의 수를 비워 멈춘 자동 재잠수를 다시 잇는다.
 * shallow: 얕은 리프트(getOceanShallowLiftM)가 있으면 거기서 시작한다.
 * @returns {boolean} 잠수를 시작했는지 */
function enterOceanDive({ auto = false, shallow = false } = {}) {
    const reason = getZoneTravelBlockReason(OCEAN_ZONE_ID) || getContentStartBlockReason();
    if (reason) { addLog(reason, 'attack-monster'); return false; }
    let st = ensureOceanState();
    if (!st.unlocked) { addLog(_t('아직 심해로 진입할 수 없습니다.'), 'attack-monster'); return false; }
    if (st.diving) return false;
    if (!auto) st.fruitlessDives = 0;
    st.returnZoneId = game.currentZoneId === OCEAN_ZONE_ID ? null : game.currentZoneId;
    st.autoDive = !!auto;
    st.diveStartProgress = getOceanDiveRecord(st);
    st.lastSurfaceReason = '';
    st.depthM = getOceanDiveStartM(st, shallow);
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = st.oxygenMax;
    st.descentPendingM = 0;
    st.diving = true;
    st.lastTickAt = getCombatTime();
    game.currentZoneId = OCEAN_ZONE_ID;
    addLog(_t('🌊 심해 {depthM}m 지점부터 잠수를 시작합니다.', { depthM: st.depthM }), 'loot-rare');
    return true;
}

/** 얕은 리프트: 가장 깊은 리프트가 아직 못 넘은 가디언 경계에 있으면 마지막으로 넘은 가디언 자리(그 아래 구간의 무리와 낚시를 다시
 * 한다). 리프트는 경계에 닿을 때 열려서, 넘지 못한 가디언 앞의 잠수는 가디언 싸움뿐이었다. 그런 리프트가 아니면 null. */
function getOceanShallowLiftM(st) {
    const interval = getOceanBossBoundaryInterval(), from = Math.floor(Math.max(0, st.bossClearM || 0) / interval) * interval;
    return Math.floor(st.checkpointM || 0) >= from + interval ? from : null;
}

/** 잠수를 시작할 수심: 가장 깊은 리프트, shallow면 얕은 리프트(없으면 가장 깊은 리프트). */
function getOceanDiveStartM(st, shallow) {
    const lift = shallow ? getOceanShallowLiftM(st) : null;
    return lift === null ? Math.max(0, Math.floor(st.checkpointM || 0)) : lift;
}

function forceSurfaceOcean(reason) {
    let st = ensureOceanState();
    const returnZoneId = takeOceanReturnZone(st);
    st.diving = false;
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.descentPendingM = 0;
    st.oxygenCur = st.oxygenMax;
    st.drowning = false;
    st.drownSec = 0;
    const stopNote = recordOceanSurface(st, reason);
    addLog(reason === 'oxygen' ? '🫧 산소가 모두 소진되어 익사 직전에 수면으로 끌어올려졌습니다. 체크포인트 이후의 진행이 사라졌습니다.' : '🌊 잠수를 종료하고 수면으로 복귀했습니다.', 'attack-monster');
    if (stopNote) addLog(stopNote, 'attack-monster');
    st.autoDive = false;
    // 실패(산소 고갈) 시에도 '수면으로 복귀' 버튼과 동일하게 심해 맵을 벗어나 수면(일반 맵)으로 이동한다.
    if (reason !== 'manual') {
        try {
            moveAfterSurfacing(returnZoneId);
            if (typeof updateStaticUI === 'function') updateStaticUI();
        } catch (e) { console.warn('failed to auto-surface from ocean:', e); }
    }
    return returnZoneId;
}

/** 떠오른 영웅을 돌아갈 사냥터로 옮긴다. 그곳이 막혔으면(이동 금지 사유) 심해에 잠수 없이 남지 않게 가장 먼 사냥터로 올라온다. */
function moveAfterSurfacing(returnZoneId) {
    if (typeof changeZone !== 'function') return;
    changeZone(returnZoneId);
    if (game.currentZoneId === OCEAN_ZONE_ID) changeZone(Math.max(0, game.maxZoneId || 0));
}

/** 떠오른 까닭을 적고, 산소가 떨어지거나 가디언에게 쓰러진 잠수면 소득(새 리프트, 가디언 처치, 물고기)이 있었는지 센다(자동 재잠수가
 * 읽는다). 'defeat'는 자동 재잠수로 들어간 잠수에서 무리에게 쓰러진 경우다(가디언에게 쓰러지면 'guardian').
 * @returns {string} 자동 재잠수가 멈췄거나 얕게 이어지면 그 알림, 아니면 빈 글 */
function recordOceanSurface(st, reason) {
    st.lastSurfaceReason = ['oxygen', 'guardian', 'defeat'].includes(reason) ? reason : 'manual';
    if (reason === 'defeat') return game.settings.autoRediveOcean ? '🌊 자동 재잠수로 들어간 잠수에서 무리에게 쓰러져 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다.' : '';
    if (reason !== 'oxygen' && reason !== 'guardian') return '';
    const limit = OCEAN_AUTO_REDIVE.missLimit;
    st.fruitlessDives = getOceanDiveRecord(st) > st.diveStartProgress ? 0 : Math.min(limit, st.fruitlessDives + 1);
    return game.settings.autoRediveOcean ? getOceanAutoRediveNote(st, reason) : '';
}

/** 자동 재잠수 알림: 소득 없이 한도만큼 떠올라 멈췄거나, 넘지 못한 가디언 때문에 다음 잠수가 지난 가디언 자리부터 내려간다. */
function getOceanAutoRediveNote(st, reason) {
    const limit = OCEAN_AUTO_REDIVE.missLimit;
    if (st.fruitlessDives >= limit) return _t('🌊 리프트도 가디언 처치도 물고기도 없이 {limit}번 떠올라 자동 재잠수를 멈춥니다. 잠수 시작을 누르면 다시 이어집니다.', { limit });
    const lift = reason === 'guardian' ? getOceanShallowLiftM(st) : null;
    return lift === null ? '' : _t('🌊 자동 재잠수는 {lift}m부터 내려가 물고기를 모읍니다.', { lift });
}

/** 떠오를 곳: 잠수를 시작한 사냥터(액트나 혼돈 구역이 남아 있으면), 아니면 예전처럼 가장 먼 사냥터. 기록은 비운다. changeZone은
 * maxZoneId를 넘는 번호(혼돈 심화의 더 깊은 층)를 받지 않으므로 그런 층에서 시작한 잠수도 가장 먼 사냥터로 올라온다. */
function takeOceanReturnZone(st) {
    const back = st.returnZoneId === null ? null : getZone(st.returnZoneId), farthest = Math.max(0, game.maxZoneId || 0);
    st.returnZoneId = null;
    return back && ['act', 'abyss'].includes(back.type) && !(back.id > farthest) ? back.id : farthest;
}

/** 새 루프: 자동 재잠수는 이 루프에서 직접 시작한 잠수가 떠오른 뒤부터 잇는다(낮은 레벨의 새 영웅을 지난 루프의 깊은 리프트로 보내지 않게). */
function forgetOceanAutoDive(st) {
    st.lastSurfaceReason = '';
    st.returnZoneId = null;
    st.autoDive = false;
}

/** 자동 재잠수 설정(심해 잠수 창의 단추). 켤 때 소득 없이 떠오른 잠수의 수를 비운다. */
function setOceanAutoRedive(on) {
    game.settings.autoRediveOcean = !!on;
    if (on) ensureOceanState().fruitlessDives = 0;
}

// 산소가 0이 된 뒤에는 시간이 지날수록 점점 큰 익사 피해를 입는다. 쓰러지기 직전이 되면 사망이 아니라 수면으로 복귀한다.
function applyOceanDrowningDamage(st, dtSec) {
    if (!st || !(dtSec > 0)) return;
    if (!st.drowning) {
        st.drowning = true;
        st.drownSec = 0;
        addLog(_t('🫨 산소가 바닥났습니다! 익사 피해가 점점 커지니 즉시 수면으로 복귀하세요.'), 'attack-monster');
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
    drainPerSec *= Math.max(0.1, Number(getOceanFishingStrategyDef(st).oxygenDrainMul) || 1);
    let leechAlive = (game.enemies || []).some(e => e && e.hp > 0 && e.trait && e.trait.oceanOxygenLeechOnHit);
    if (leechAlive) drainPerSec *= 1.4;
    let pressureCrushMul = (game.enemies || []).reduce((mul, enemy) => {
        if (!enemy || enemy.hp <= 0 || !enemy.trait) return mul;
        return Math.max(mul, Number(enemy.trait.oceanPressureGainMul) || 1);
    }, 1);
    drainPerSec *= pressureCrushMul;
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
        addLog(_t('🛗 수중 리프트 {checkpointM}m 지점이 개방되었습니다.', { checkpointM: st.checkpointM }), 'loot-rare');
    }
    st.pressureLevel = getOceanDepthTier(st.depthM);
    // 경계에 막 도달한 순간(이전엔 미달, 지금 도달) 가디언 등장을 알린다.
    if (curDepth < nextBoundary && st.depthM >= nextBoundary) {
        addLog(_t('🌊 수심 {nextBoundary}m: 심해 가디언이 길을 막습니다. 처치해야 더 깊이 내려갈 수 있습니다.', { nextBoundary }), 'loot-unique');
    }
}

// 쓰러뜨린 몬스터가 쌓은 하강 거리(st.descentPendingM, applyOceanKill)를 한 번에 뛰지 않고 조금씩 내려간다(A안, OCEAN_COMBAT_DIVE).
// 가디언 경계에 닿으면 남은 거리는 버린다(applyOceanDepthGain이 경계에서 멈춘다).
function tickOceanDepth(st, dtSec) {
    const pending = Math.max(0, Number(st && st.descentPendingM) || 0);
    if (!(dtSec > 0) || pending <= 0) return;
    const step = Math.min(pending, OCEAN_COMBAT_DIVE.descentPerSec * dtSec);
    st.descentPendingM = pending - step;
    applyOceanDepthGain(st, step);
}

/** 심해에서 쓰러뜨린 몬스터(js/combat-kill-rewards.js countKillForContent): 잠수 중이면 하강 거리를 쌓고(A안), 공기 방울을 남기는 몬스터면 산소를
 * 채운다(B안). 가디언과 그 졸개는 하강 거리를 쌓지 않는다(경계에서 멈춘다).
 * @returns {number} 채운 산소가 버티는 초(반올림, 가득 차 있었으면 0) */
function applyOceanKill(enemy) {
    const st = ensureOceanState();
    if (!st.unlocked || !st.diving || !enemy || enemy.isBoss) return 0;
    if (!enemy.oceanAirAdd) st.descentPendingM = Math.max(0, Number(st.descentPendingM) || 0) + getOceanKillDescentM(enemy);
    const seconds = getOceanKillAirSec(enemy), before = st.oxygenCur;
    if (seconds <= 0) return 0;
    const drainPerSec = getOceanOxygenDrainPerSec() * Math.max(0.1, Number(getOceanFishingStrategyDef(st).oxygenDrainMul) || 1);
    st.oxygenCur = Math.min(st.oxygenMax, st.oxygenCur + drainPerSec * seconds);
    return Math.round((st.oxygenCur - before) / drainPerSec);
}

/** 몬스터 하나가 쌓는 하강 거리(m): 정예는 배로, 장비의 심해 수심 전진 속도(%)만큼 더. */
function getOceanKillDescentM(enemy) {
    const rule = OCEAN_COMBAT_DIVE, gearPct = Math.max(0, Number(getPlayerStats().oceanDepthGainPct) || 0);
    return rule.metersPerKill * (enemy.isElite ? rule.eliteKillMul : 1) * (1 + gearPct / 100);
}

/** 쓰러지며 남기는 공기(그 수심에서 산소가 줄어드는 초 수): 가디언의 졸개, 정예, 철갑 패각충. */
function getOceanKillAirSec(enemy) {
    const air = OCEAN_COMBAT_DIVE.air;
    if (enemy.oceanAirAdd) return air.guardianAddSec;
    if (enemy.isElite) return air.eliteSec;
    return enemy.monsterVisualId === air.carrier ? air.carrierSec : 0;
}

function getModCategory(mod) {
    let statId = (mod && (mod.statId || mod.id)) || '';
    let found = OCEAN_MOD_CATEGORY_RULES.find(rule => rule.ids.includes(statId));
    return found ? found.category : '특수';
}

function getOceanWorkbenchOption(optionId, topTierOnly) {
    if (topTierOnly) return OCEAN_WORKBENCH_OPTIONS.find(opt => opt.id === 'oceanLeviathanCrown');
    return OCEAN_WORKBENCH_OPTIONS.find(opt => opt.id === optionId) || OCEAN_WORKBENCH_OPTIONS[Math.floor(Math.random() * (OCEAN_WORKBENCH_OPTIONS.length - 1))];
}

function getSeaGiftTargetBlockReason(item) {
    if (!item) return '대상 선택 필요';
    if (!isSeaGiftEquipmentTarget(item)) return '일반 장비만 가공 가능';
    if (game.woodsmanBuildLock) return '세팅 변경 잠김';
    if (item.hallReplica) return '전당 소장품 가공 불가';
    if (item.fusedRelic) return '융합 유물 가공 불가';
    return item.corrupted ? '타락 장비 가공 불가' : '';
}

/** Why the effect cannot work on this item, as a short button label ('' when it can): the checks that need no roll. A unique keeps
 * its fixed lines (they would reroll from the normal tables at a low tier), so only a plain seal works on one, as the honey does. */
function getSeaGiftEffectBlockReason(item, effect, category) {
    if (item.rarity === 'unique' && !(effect.type === 'lockMod' && !effect.bonusTaggedReroll)) return '고유 장비 가공 불가';
    return Object.hasOwn(SEA_GIFT_EFFECT_BLOCKERS, effect.type) ? SEA_GIFT_EFFECT_BLOCKERS[effect.type](item, effect, category) : '';
}

/** The rerollable lines still below their top tier. */
function getSeaGiftTierStepRows(item) {
    return getSeaGiftRerollRows(item).filter(row => {
        let cap = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
        return Math.max(1, Math.floor(Number(row.stat.tier) || 1)) < cap;
    });
}

function removeOneModFromItem(item) {
    if (!item || !Array.isArray(item.stats)) return false;
    let idx = item.stats.findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    if (idx < 0) return false;
    item.stats.splice(idx, 1);
    return true;
}

function getSeaGiftRerollRow(item, index) {
    let stat = item && Array.isArray(item.stats) ? item.stats[index] : null;
    if (!stat || stat.lockedByHoney || stat.lockedByRift || stat.isEchoMod
        || equipmentCrafting.storedAffixKind(item, stat) === 'special') return null;
    let probe = { ...item, stats: item.stats.filter((row, rowIndex) => rowIndex !== index) };
    let stored = findStoredEquipmentAffix(item, stat);
    let mod = stored && getAvailableMods(probe).find(row => row.id === stored.id);
    return mod ? { index, stat, mod } : null;
}

function rollSeaGiftExistingAffix(row, tierBoost) {
    let currentTier = Math.max(1, Math.floor(Number(row.stat.tier) || 1));
    let maxTier = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
    let targetTier = Math.min(maxTier, currentTier + Math.max(0, Math.floor(tierBoost || 0)));
    return rollAffixValueInTierRange(row.mod, targetTier, targetTier);
}

function getSeaGiftRerollRows(item, category) {
    return (item.stats || []).map((stat, index) => {
        if (category && getModCategory(stat) !== category) return null;
        return getSeaGiftRerollRow(item, index);
    }).filter(Boolean);
}

/** 확정 부여(최상급 태그 포함): 새 줄은 바뀔 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서. Returns '' when applied, else why not
 * (craftSeaGift logs it). */
function applySeaGiftGuaranteedMod(item, effect, category) {
    const editable = (item.stats || []).map((stat, index) => ({ stat, index }))
        .filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift);
    const pool = getAvailableMods(item).filter(mod => effect.type !== 'guaranteedTaggedMod' || !category || getModCategory(mod) === category);
    const choice = chooseSeaGiftGuaranteedLine(item, pool, editable, effect);
    if (!choice) return '이 장비에 추가로 부여할 수 있는 옵션이 없습니다.';
    if (effect.bonusRemoveMod && !getSeaGiftRemovableIndexes(item).some(index => index !== choice.index)) {
        return '새 옵션과 별도로 제거할 봉인되지 않은 일반 옵션이 없습니다.';
    }
    const rolled = rollSeaGiftGuaranteedValue(item, choice.mod, effect);
    const index = choice.index < 0 ? item.stats.push(rolled) - 1 : choice.index;
    item.stats[index] = rolled;
    if (effect.bonusRemoveMod) removeWorstSeaGiftMod(item, index);
    updateItemName(item);
    return '';
}

/** 확정 부여한 줄의 단계: 등급 보정이 있으면(최상급 태그 옵션) 장비 제작 단계부터 그만큼 위까지, 없으면 수액 봉오리처럼 제작 단계까지 굴린다.
 * 2026-10-19 전에는 등급 보정도 1단계부터 굴러 '등급 +2'가 평균 T2.4였다. */
function rollSeaGiftGuaranteedValue(item, mod, effect) {
    const tier = Math.max(1, Math.floor(getItemCraftTier(item) || 1)), boost = Math.max(0, Math.floor(effect.tierBoost || 0));
    return boost ? rollAffixValueInTierRange(mod, tier, tier + boost) : rollAffixValue(mod, tier);
}

/** The most lines a sea gift adds up to: magic 2 and rare 6 (their prefix and suffix rule), else the 6-line cap. */
function getSeaGiftLineCap(item) {
    const rule = EXPLICIT_AFFIX_RULES[item.rarity];
    return rule ? Math.min(EXPLICIT_AFFIX_LINE_CAP, rule.prefix + rule.suffix) : EXPLICIT_AFFIX_LINE_CAP;
}

/** 자리가 남으면(접두 3, 접미 3, 모두 6줄) 덧붙이고(index -1), 꽉 찼으면 같은 종류의 가장 낮은 단계 줄을 바꾼다. 2026-10-19 전에는
 * 자리가 있어도 줄을 바꿔 '부여'가 좋은 줄을 지웠다. 제거 효과는 별도로 지울 줄이 남는 후보만 쓴다.
 * preview=true는 같은 후보의 첫 선택을 반환하며 난수나 장비 상태를 바꾸지 않는다. */
function chooseSeaGiftGuaranteedLine(item, pool, editable, effect, preview = false) {
    const room = equipmentCrafting.affixRoom(item);
    const indexes = editable.map(row => row.index), removable = getSeaGiftRemovableIndexes(item);
    const addable = canAddSeaGiftLine(item, editable.length) ? pool.filter(mod => equipmentCrafting.fitsRoom(room, mod)) : [];
    const allChoices = () => {
        if (effect.bonusRemoveMod && !removable.length) return [];
        const withRemoval = choice => effect.bonusRemoveMod
            ? { ...choice, removeIndex: removeWorstSeaGiftMod(item, choice.index, true) } : choice;
        if (addable.length) return addable.map(mod => withRemoval({ mod, index: -1 }));
        return pool.map(mod => equipmentCrafting.pickReplacement(item, [mod], indexes, rows => rows[0], 'lowest'))
            .filter(choice => choice && (!effect.bonusRemoveMod || removable.some(index => index !== choice.index)))
            .map(withRemoval);
    };
    const choices = allChoices();
    if (preview === 'all') return choices;
    if (!choices.length) return null;
    const mod = preview ? choices[0].mod : pickWeightedMod(choices.map(choice => choice.mod));
    return choices.find(choice => choice.mod === mod);
}

/** 메아리 줄은 원본과 같은 종류다. 그 종류에 자리가 없으면 같은 종류의 줄만 바꿔 끼울 수 있다. */
function getSeaGiftEchoTargets(item, editableIdx, srcIdx) {
    const targetsForSource = index => {
        const kind = equipmentCrafting.storedAffixKind(item, item.stats[index]), room = equipmentCrafting.affixRoom(item);
        const others = editableIdx.filter(target => target !== index);
        if (!room || kind === 'special' || room[kind] > 0) return others;
        return others.filter(target => equipmentCrafting.storedAffixKind(item, item.stats[target]) === kind);
    };
    if (srcIdx === undefined) {
        const maxTier = editableIdx.reduce((max, index) => Math.max(max, Number(item.stats[index].tier) || 0), 0);
        return editableIdx.filter(index => (Number(item.stats[index].tier) || 0) === maxTier)
            .map(sourceIndex => ({ sourceIndex, targetIndexes: targetsForSource(sourceIndex) }))
            .filter(choice => choice.targetIndexes.length);
    }
    return targetsForSource(srcIdx);
}

/** Lines the free bad-line removal may take: unsealed, not fixed (fossil and unique lines) and not an ocean bench line, which is stored as
 * T5 and cost the rarest fish (the removal always took it before 2026-10-19). */
function getSeaGiftRemovableIndexes(item) {
    return getSeaGiftEditableIndexes(item).filter(index => (!item.stats[index].oceanBenchOptionId || item.stats[index].isEchoMod)
        && !isFixedEquipmentAffix(item.stats[index]));
}

function removeWorstSeaGiftMod(item, excludedIndex, preview = false) {
    const tierOf = index => Number(item.stats[index].tier) || 0;
    const candidates = getSeaGiftRemovableIndexes(item).filter(index => index !== excludedIndex).sort((left, right) => tierOf(left) - tierOf(right));
    if (preview) return candidates.length ? candidates[0] : null;
    if (candidates.length === 0) return false;
    item.stats.splice(candidates[0], 1);
    return true;
}

function isSeaGiftEquipmentTarget(item) {
    if (!item || !Array.isArray(item.stats) || typeof getEquipCandidateSlots !== 'function') return false;
    return getEquipCandidateSlots(item).some(slot => Object.prototype.hasOwnProperty.call(game.equipment || {}, slot));
}

function getSelectedSeaGiftEquipmentTarget() {
    let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
    return isSeaGiftEquipmentTarget(item) ? item : null;
}

/** Logs why a sea gift was refused; false for the handler to return. */
function refuseSeaGift(craft, message) {
    craft.say(message, 'attack-monster');
    return false;
}

/** The indexes of the item's lines that no seal holds. */
function getSeaGiftEditableIndexes(item) {
    return (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
}

/** 강제 희귀 승급: 옵션이 4줄이 될 때까지 수액 봉오리처럼 새 줄을 붙인다(2026-10-19 전에는 이름만 희귀가 되어 0줄 희귀가 나왔다). */
function fillSeaGiftRareLines(item) {
    const tier = getItemCraftTier(item);
    while (getItemExplicitOptionCount(item) < 4) {
        const mod = equipmentCrafting.pickAddMod(item, null);
        if (!mod) return;
        item.stats.push(rollAffixValue(mod, tier));
    }
}

/** A guaranteed line (a tagged one in the chosen category); a refusal logs why. */
function applySeaGiftGuaranteedEffect(item, effect, craft) {
    const refusal = applySeaGiftGuaranteedMod(item, effect, craft.category);
    if (refusal) return refuseSeaGift(craft, refusal);
}

/** The ocean workbench's fixed line, rolled whole, at getSeaGiftBenchSlot (before 2026-10-19 it took the first unsealed line even with
 * room). */
function applySeaGiftBenchOption(item, effect, craft) {
    let option = getOceanWorkbenchOption(craft.options && craft.options.optionId, !!effect.topTier);
    if (!option) return refuseSeaGift(craft, '적용할 수 있는 고정 옵션이 없습니다.');
    let minInt = Math.floor(option.min);
    let maxInt = Math.floor(option.max);
    let val = minInt + Math.floor(Math.random() * (maxInt - minInt + 1));
    let rolled = { id: option.statId, val: val, valMin: minInt, valMax: maxInt, tier: 5, statName: getStatName(option.statId), oceanBenchOptionId: option.id };
    const idx = getSeaGiftBenchSlot(item);
    if (idx === null) return refuseSeaGift(craft, '바꿀 수 있는 줄이 없습니다.');
    if (idx < 0) item.stats.push(rolled); else item.stats[idx] = rolled;
    updateItemName(item);
}

/** Where the bench line goes: over the item's unsealed bench line, else added (-1) below the line cap, else over the lowest line; null
 * when the item is full and every line is sealed or fixed. A sealed bench line stays. */
function getSeaGiftBenchSlot(item) {
    const own = (item.stats || []).findIndex(stat => stat && stat.oceanBenchOptionId && !stat.isEchoMod
        && !stat.lockedByHoney && !stat.lockedByRift);
    if (own >= 0) return own;
    if (getItemExplicitOptionCount(item) < getSeaGiftLineCap(item)) return -1;
    const low = getSeaGiftLowestLineIndex(item);
    return low < 0 ? null : low;
}

/** The line a full item gives up: the lowest tier unsealed line that is not fixed (the later one on a tie), else -1. */
function getSeaGiftLowestLineIndex(item) {
    const tierOf = index => Number(item.stats[index].tier) || 0;
    return getSeaGiftEditableIndexes(item).filter(index => !isFixedEquipmentAffix(item.stats[index]))
        .reduce((low, index) => (low < 0 || tierOf(index) <= tierOf(low) ? index : low), -1);
}

/** One of the highest tier lines echoed at half its values onto another unsealed line of the same kind. */
function applySeaGiftEcho(item, effect, craft) {
    const choices = getSeaGiftEchoTargets(item, getSeaGiftEditableIndexes(item));
    if (!choices.length) return refuseSeaGift(craft, '메아리 줄을 넣을 같은 종류 자리가 없습니다(접두 3, 접미 3).');
    const choice = choices[Math.floor(Math.random() * choices.length)];
    const dstIdx = choice.targetIndexes[Math.floor(Math.random() * choice.targetIndexes.length)];
    const source = item.stats[choice.sourceIndex];
    let echo = makeSeaGiftEchoLine(source, equipmentCrafting.storedAffixKind(item, source));
    item.stats[dstIdx] = echo;
    craft.say(_t('🔊 {echoOf} 옵션이 50% 효과로 메아리쳤습니다.', { echoOf: echo.echoOf }), 'loot-rare');
    updateItemName(item);
}

function makeSeaGiftEchoLine(src, kind) {
    let echo = JSON.parse(JSON.stringify(src));
    const halve = line => {
        for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal', 'valueStep']) {
            if (Number.isFinite(line[key])) line[key] = Number((line[key] / 2).toFixed(3));
        }
    };
    halve(echo);
    (echo.extraStats || []).forEach(halve);
    // Only the source owns its workbench/fossil provenance; echoKind keeps the original affix room on the copy.
    delete echo.oceanBenchOptionId;
    delete echo.fossilExclusive;
    delete echo.fossilExclusiveDrop;
    delete echo.fossilExclusiveSpore;
    if (echo.craftSource === 'fossil') delete echo.craftSource;
    echo.echoKind = kind;
    echo.echoOf = src.statName || getStatName(src.id);
    echo.isEchoMod = true;
    return echo;
}

/** Why 심해의 파편 cannot reroll a line of the item, or '': the build lock, and corrupted gear, fused relics and uniques keep their
 * lines as every other craft does. */
function getOceanShardBlockReason(item) {
    if (!item) return '아이템을 선택하세요.';
    if (!Array.isArray(item.stats) || item.stats.length === 0) return '재굴림할 수 있는 옵션 줄이 없습니다.';
    const locked = equipmentCrafting.buildLockReason(game);
    if (locked) return locked;
    if (item.corrupted) return '타락한 아이템은 더 이상 제작할 수 없습니다.';
    if (item.fusedRelic) return '융합 유물은 황금률, 잿불가지, 축복의 꽃잎만 사용할 수 있습니다.';
    return item.rarity === 'unique' ? '고유 장비에는 쓸 수 없습니다.' : '';
}

function rerollSingleBaseOption(item, costCurrency, costAmount) {
    const blocked = getOceanShardBlockReason(item);
    if (blocked) { addLog(blocked, 'attack-monster'); return false; }
    let key = costCurrency || 'oceanRerollShard';
    let cost = Math.max(0, Math.floor(costAmount || 1));
    if ((game.currencies[key] || 0) < cost) { addLog(_t('재화가 부족합니다.'), 'attack-monster'); return false; }
    let editableIdx = item.stats.map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
    if (editableIdx.length === 0) { addLog(_t('재굴림할 수 있는 옵션 줄이 없습니다.'), 'attack-monster'); return false; }
    let choice = equipmentCrafting.pickReplacement(item, getAvailableMods(item), editableIdx, mods => pickRandomMods(mods, 1)[0]);
    if (!choice) { addLog(_t('이 장비에서 새로 굴릴 수 있는 옵션이 없습니다.'), 'attack-monster'); return false; }
    let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1));
    game.currencies[key] = (game.currencies[key] || 0) - cost;
    item.stats[choice.index] = rollAffixValue(choice.mod, maxTier, { roundInteger: true });
    updateItemName(item);
    addLog(_t('🌊 {name}의 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 교체했습니다.', { name: getItemDisplayName(item) || _t('장비') }), 'loot-rare');
    return true;
}

function grantMeteorEquipmentReward() {
    const item = generateEquipmentDrop({ isBoss: true }, { minimumRarity: 'rare', zone: getZone(METEOR_FALL_ZONE_ID) });
    return item && addItemToInventory(item, { ignoreFilter: true, ignoreAutoSalvage: true, guaranteedKeep: true }) ? item : null;
}

/** 운석 낙하 정산: 단계 20, 40에서 희귀 이상 장비가 하나씩 늘어난다. 고유 '낙성의 발자취'는 지역 전용 드롭으로 따로 떨어진다.
 * 운석 파편 · 별쐐기 재료(6단계)와 별가루(7단계)는 없어졌다. 별자리 관측은 아틀라스 패시브 '떨어지는 별'. */
function grantMeteorEncounterRewards() {
    let st = ensureMeteorSiteState();
    let encounterTier = Math.max(1, Math.floor(st.activeMeteorTier || 1));
    const count = getZone(METEOR_FALL_ZONE_ID).rewardEquipmentCount;
    for (let i = 0; i < count; i++) {
        const item = grantMeteorEquipmentReward();
        addLog(_t('☄️ 운석 {tier}단계 정산 ({index}/{count}){item}', { tier: encounterTier, index: i + 1, count, item: item ? `, [${getItemDisplayName(item)}]` : '' }), 'loot-rare', item ? { item } : {});
    }
    unlockJournalEntry('meteor_fall');
    grantConstellationObservationReward();
}

/**
 * Returns inactive node ids required to connect and activate the target by the shortest available route.
 * @param {string} targetNodeId
 * @returns {string[]}
 */
function getPassiveActivationPath(targetNodeId) {
    if (!game || !targetNodeId || !isPassiveNodeAvailable(targetNodeId)) return [];
    const targetNode = PASSIVE_TREE.nodes[targetNodeId];
    if (targetNode && targetNode.kind === 'start') return [];
    let owned = new Set((game.passives || []).filter(id => isPassiveNodeAvailable(id)));
    let connectionNodes = getPassiveConnectionNodeIds();
    if (connectionNodes.has(String(targetNodeId))) return [];
    if (passiveRouting.freeNodes(PASSIVE_TREE, game).has(String(targetNodeId))) return [String(targetNodeId)];
    let rootId = getPassiveTreeRootNodeId();
    let startNodes = connectionNodes.size > 0 ? Array.from(connectionNodes) : (isPassiveNodeAvailable(rootId) ? [rootId] : []);
    if (startNodes.length === 0) return [];

    let queue = startNodes.slice();
    let queueIndex = 0;
    let previous = new Map(queue.map(id => [id, null]));
    const adjacency = getPassiveTreeAdjacency(), blockedStarts = getPassiveBlockedStartIds(), openedStarts = getPassiveGatedStartIds();
    const walkable = id => isPassiveNodeAvailable(id) && !blockedStarts.has(id);
    while (queueIndex < queue.length && !previous.has(targetNodeId)) {
        let current = queue[queueIndex++];
        (adjacency.get(String(current)) || []).forEach(next => {
            if (previous.has(next) || !walkable(next)) return;
            previous.set(next, current);
            queue.push(next);
        });
    }
    if (!previous.has(targetNodeId)) return [];

    let path = [];
    let current = targetNodeId;
    while (current && !connectionNodes.has(String(current))) {
        path.push(current);
        current = previous.get(current);
    }
    return path.reverse().filter(id => !openedStarts.has(id));
}

function getPassiveKeystoneConflict(path) {
    const owned = new Set(game.passives || []), pending = new Set(path || []);
    const corruptId = getPassiveKeystoneNodeId('타락한 복음');
    const tripleId = getPassiveKeystoneNodeId('삼중 계시');
    if ((owned.has(corruptId) && pending.has(tripleId)) || (owned.has(tripleId) && pending.has(corruptId))) {
        return _t('{title}, {title2}는 동시에 할당할 수 없습니다.', { title: PASSIVE_TREE.nodes[corruptId].title, title2: PASSIVE_TREE.nodes[tripleId].title });
    }
    return '';
}

/** 노드 하나까지의 길을 찍는다. 나무꾼 전투 중에는 빌드가 매 틱 들어갈 때로 돌아가므로(js/combat.js enforceWoodsmanBuildLock) 반환처럼
 * 거절한다(2026-10-20 검토: "활성화!"가 뜬 뒤 다음 틱에 되돌아갔다). */
function activatePassivePath(targetNodeId, options) {
    if (game.woodsmanBuildLock) return { activated: false, cost: 0, path: [], reason: 'locked', message: _t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.') };
    if (!contentProgression.canOpen('tab-char')) return { activated: false, cost: 0, path: [], reason: 'locked' };
    return allocatePassivePath(targetNodeId, options);
}

function allocatePassivePath(targetNodeId, options) {
    let path = getPassiveActivationPath(targetNodeId);
    const expected = options && options.expectedPath;
    if (expected && (path.length !== expected.length || path.some((id, index) => id !== expected[index]))) {
        return { activated: false, cost: path.length, path: path.slice(), reason: 'changed',
            message: _t('확인 중 연결 경로가 바뀌었습니다. 노드를 다시 선택해 주세요.') };
    }
    if (path.length === 0) return { activated: false, cost: 0, path: [] };
    let conflict = getPassiveKeystoneConflict(path);
    if (conflict) return { activated: false, cost: path.length, path: path.slice(), reason: 'conflict', message: conflict };
    if (Math.max(0, Math.floor(game.passivePoints || 0)) < path.length) {
        return { activated: false, cost: path.length, path: path.slice(), reason: 'points' };
    }
    const pointBudget = passiveRouting.pointBudget(game);
    path.forEach(nodeId => {
        if (!(game.passives || []).includes(nodeId)) game.passives.push(nodeId);
        let node = PASSIVE_TREE.nodes[nodeId];
        let attributeStat = options && options.attributeStat;
        if (node && node.kind === 'attribute' && ['strength', 'dexterity', 'intelligence'].includes(attributeStat)) {
            game.passiveAttributeChoices = game.passiveAttributeChoices || {};
            game.passiveAttributeChoices[nodeId] = attributeStat;
        }
        revealAroundNode(nodeId, { forcePulse: !options || options.forcePulseNodeId === nodeId });
    });
    game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0) - path.length);
    passiveRouting.settlePoints(game, pointBudget);
    enforcePassiveEquipmentRestrictions();
    return { activated: true, cost: path.length, path: path.slice() };
}

function getCurrentPassiveNodeId(rawId) {
    if (typeof rawId !== 'string') return rawId;
    if (typeof PASSIVE_NODE_ID_MIGRATIONS !== 'object') return rawId;
    if (PASSIVE_NODE_ID_MERGED[rawId]) return PASSIVE_NODE_ID_MERGED[rawId];
    if (!PASSIVE_NODE_ID_LEGACY_PREFIX.test(rawId)) return rawId;
    return PASSIVE_NODE_ID_MIGRATIONS[rawId.replace(PASSIVE_NODE_ID_LEGACY_PREFIX, '')] || rawId;
}

function migratePassiveNodeIdList(rawIds) {
    let ids = Array.isArray(rawIds) ? rawIds : [];
    return Array.from(new Set(ids.map(getCurrentPassiveNodeId)));
}

function migratePassiveNodeIdRecord(rawRecord) {
    if (!rawRecord || typeof rawRecord !== 'object' || Array.isArray(rawRecord)) return {};
    let migrated = {};
    Object.entries(rawRecord).forEach(([rawId, value]) => {
        let id = getCurrentPassiveNodeId(rawId);
        if (id === rawId || !Object.prototype.hasOwnProperty.call(migrated, id)) migrated[id] = value;
    });
    return migrated;
}

function normalizePassiveTreePreset(raw, slotIndex) {
    if (!raw || typeof raw !== 'object') return null;
    let nodeIds = migratePassiveNodeIdList(raw.nodeIds)
        .filter(id => typeof id === 'string' && PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start');
    let choices = migratePassiveNodeIdRecord(raw.attributeChoices);
    let attributeChoices = {};
    nodeIds.forEach(id => {
        if (PASSIVE_TREE.nodes[id].kind !== 'attribute') return;
        let stat = choices[id];
        if (['strength', 'dexterity', 'intelligence'].includes(stat)) attributeChoices[id] = stat;
    });
    let fallbackName = _t('프리셋 {value}', { value: slotIndex + 1 });
    let name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 24) : fallbackName;
    return { name, nodeIds, attributeChoices };
}

function normalizePassiveTreePlannerState(raw) {
    let source = raw && typeof raw === 'object' ? raw : {};
    let layoutMatches = Number(source.layoutVersion) === PASSIVE_LAYOUT_VERSION;
    let slots = layoutMatches && Array.isArray(source.presets) ? source.presets : [];
    let presets = Array.from({ length: PASSIVE_TREE_PRESET_SLOTS }, (_, index) => normalizePassiveTreePreset(slots[index], index));
    let activeSlot = Math.floor(Number(source.activeSlot));
    if (!Number.isFinite(activeSlot) || activeSlot < 0 || activeSlot >= PASSIVE_TREE_PRESET_SLOTS) activeSlot = 0;
    return { layoutVersion: PASSIVE_LAYOUT_VERSION, activeSlot, autoInvest: layoutMatches && !!source.autoInvest, presets };
}

function ensurePassiveTreePlannerState() {
    game.settings = game.settings && typeof game.settings === 'object' ? game.settings : {};
    game.settings.passiveTreePlanner = normalizePassiveTreePlannerState(game.settings.passiveTreePlanner);
    return game.settings.passiveTreePlanner;
}

function saveCurrentPassiveTreePreset(slotIndex, name) {
    let planner = ensurePassiveTreePlannerState();
    let slot = Math.max(0, Math.min(PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    let nodeIds = (game.passives || []).filter(id => PASSIVE_TREE.nodes[id] && PASSIVE_TREE.nodes[id].kind !== 'start');
    let attributeChoices = {};
    nodeIds.forEach(id => {
        let stat = (game.passiveAttributeChoices || {})[id];
        if (['strength', 'dexterity', 'intelligence'].includes(stat)) attributeChoices[id] = stat;
    });
    planner.presets[slot] = normalizePassiveTreePreset({ name, nodeIds, attributeChoices }, slot);
    planner.activeSlot = slot;
    return planner.presets[slot];
}

function setActivePassiveTreePreset(slotIndex) {
    let planner = ensurePassiveTreePlannerState();
    let slot = Math.floor(Number(slotIndex));
    if (!Number.isFinite(slot) || slot < 0 || slot >= PASSIVE_TREE_PRESET_SLOTS) return false;
    planner.activeSlot = slot;
    return true;
}

function setPassiveTreeAutoInvest(enabled) {
    let planner = ensurePassiveTreePlannerState();
    planner.autoInvest = !!enabled;
    return planner.autoInvest;
}

function encodePassiveTreePreset(slotIndex) {
    let planner = ensurePassiveTreePlannerState();
    let preset = planner.presets[Math.floor(Number(slotIndex))];
    if (!preset) return '';
    let payload = JSON.stringify({ v: 1, layout: PASSIVE_LAYOUT_VERSION, name: preset.name, nodeIds: preset.nodeIds, attributeChoices: preset.attributeChoices });
    return `PT1.${btoa(unescape(encodeURIComponent(payload))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')}`;
}

function decodePassiveTreePreset(code) {
    let raw = String(code || '').trim();
    if (!raw.startsWith('PT1.')) throw new Error('지원하지 않는 프리셋 코드입니다.');
    let body = raw.slice(4).replace(/-/g, '+').replace(/_/g, '/');
    body += '='.repeat((4 - body.length % 4) % 4);
    let parsed = JSON.parse(decodeURIComponent(escape(atob(body))));
    if (!parsed || parsed.v !== 1) throw new Error('프리셋 버전이 올바르지 않습니다.');
    if (Number.isFinite(parsed.layout) && parsed.layout !== PASSIVE_LAYOUT_VERSION) throw new Error('현재 스킬트리 배치와 호환되지 않는 프리셋입니다.');
    return parsed;
}

function importPassiveTreePreset(slotIndex, code) {
    let planner = ensurePassiveTreePlannerState();
    let slot = Math.max(0, Math.min(PASSIVE_TREE_PRESET_SLOTS - 1, Math.floor(Number(slotIndex) || 0)));
    let preset = normalizePassiveTreePreset(decodePassiveTreePreset(code), slot);
    if (!preset || preset.nodeIds.length === 0) throw new Error('투자 노드가 없는 프리셋입니다.');
    planner.presets[slot] = preset;
    planner.activeSlot = slot;
    return preset;
}

function getPassiveAutoInvestPreset() {
    if (game.woodsmanBuildLock || !contentProgression.canOpen('tab-char')) return null;
    const planner = ensurePassiveTreePlannerState();
    return planner.autoInvest ? planner.presets[planner.activeSlot] : null;
}

function runPassiveTreeAutoInvest() {
    const preset = getPassiveAutoInvestPreset();
    if (!preset) return { nodes: 0, points: 0 };
    let result = { nodes: 0, points: 0 };
    let guard = Math.min(preset.nodeIds.length + 1, Math.max(0, Math.floor(game.passivePoints || 0)) + 1);
    while (guard-- > 0 && game.passivePoints > 0) {
        // 저장 당시의 투자 순서를 지킨다. 중간 노드를 건너뛰어 예상 밖 최단 경로를
        // 구매하거나, 매 포인트마다 모든 노드에 BFS를 반복하는 일을 피한다.
        let targetId = preset.nodeIds.find(id => !(game.passives || []).includes(id));
        if (!targetId) break;
        let path = getPassiveActivationPath(targetId);
        if (path.length <= 0 || path.length > game.passivePoints) break;
        let attributeStat = preset.attributeChoices[targetId] || game.passiveAttributePreference || 'strength';
        let activated = activatePassivePath(targetId, { attributeStat });
        if (!activated.activated || activated.cost <= 0) break;
        unlockPassiveStarEvolution({ silent: true });
        activated.path.forEach(id => {
            let savedStat = preset.attributeChoices[id];
            if (savedStat) game.passiveAttributeChoices[id] = savedStat;
        });
        result.nodes += activated.path.length;
        result.points += activated.cost;
    }
    if (result.nodes > 0) {
        calculateReachableNodes();
        refreshPassiveVisibility();
    }
    return result;
}

function calculateReachableNodes() {
    reachableNodes.clear();
    const rootId = getPassiveTreeRootNodeId();
    if (isPassiveNodeAvailable(rootId)) reachableNodes.add(rootId);
    if (!game) return;
    let connectionNodes = getPassiveConnectionNodeIds();
    connectionNodes.forEach(id => {
        if (isPassiveNodeAvailable(id)) reachableNodes.add(id);
    });
    passiveRouting.freeNodes(PASSIVE_TREE, game).forEach(id => { if (isPassiveNodeAvailable(id)) reachableNodes.add(id); });
    const blockedStarts = getPassiveBlockedStartIds();
    PASSIVE_TREE.edges.forEach(edge => {
        if (!isPassiveTreePathEdge(edge)) return;
        if (!isPassiveNodeAvailable(edge.from) || !isPassiveNodeAvailable(edge.to)) return;
        if (connectionNodes.has(String(edge.from)) && !blockedStarts.has(edge.to)) reachableNodes.add(edge.to);
        if (connectionNodes.has(String(edge.to)) && !blockedStarts.has(edge.from)) reachableNodes.add(edge.from);
    });
    // reachable 집합이 바뀌면 링크/후광 상태 캐시 갱신
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
}

function getPassiveLinkedNodeIds(nodeId, maxDepth) {
    let rootId = nodeId;
    if (!isPassiveNodeAvailable(rootId)) return [];
    let visited = new Set([rootId]);
    let frontier = [rootId];
    const adjacency = getPassiveTreeAdjacency();
    let depthLimit = Math.max(0, maxDepth || 0);
    for (let depth = 0; depth < depthLimit; depth++) {
        let nextFrontier = [];
        frontier.forEach(current => {
            (adjacency.get(String(current)) || []).forEach(next => {
                if (visited.has(next) || !isPassiveNodeAvailable(next)) return;
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
    if (origin.id === getPassiveTreeRootNodeId()) return (node.depth || 0) <= 1;
    if (!origin.sector || !node.sector || origin.sector !== node.sector) return false;
    return Math.abs((origin.depth || 0) - (node.depth || 0)) <= maxDepthGap;
}

function refreshPassiveVisibility() {
    const availableNodes = Object.values(PASSIVE_TREE.nodes).filter(isPassiveNodeAvailable);
    discoveredPassiveNodes = new Set(availableNodes.map(node => node.id));
    previewPassiveNodes = new Set();
    // visibility 집합 변경 시 상태 캐시 갱신
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('state');
}

function revealAroundNode(nodeId, options) {
    options = options || {};
    let origin = PASSIVE_TREE.nodes[nodeId];
    if (!origin || !isPassiveNodeAvailable(origin)) return;
    let radius = options.radius || PASSIVE_DISCOVERY_RADIUS;
    const rootId = getPassiveTreeRootNodeId();
    let edgeDepth = options.edgeDepth !== undefined ? options.edgeDepth : (nodeId === rootId ? PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH : PASSIVE_DISCOVERY_EDGE_DEPTH);
    let newlyDiscovered = [];
    let discoverIds = new Set([nodeId]);
    if (nodeId === rootId) {
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

/** 전직 노드(n1~n13d). 자리와 배율 · 전직마다 바꾸는 노드 · 궁극 · 핵심 · 개화 노드는 data/ascendancies.js가 정한다.
 * 시련 4를 깨면 n11 · n12(둘 중 하나), 이번 루프에 이 전직으로 재능 개화를 했으면 n13a~d(재능 둘 · 전직 둘). */
function getClassTreeDef(clsKey) {
    const template = CLASS_TEMPLATES[clsKey];
    if (!template) return {};
    const defs = ASCENDANCY_NODE_DEFS[clsKey] || {};
    const tree = buildAscendancyBaseNodes(template, defs);
    if ((game.completedTrials || []).includes('trial_4')) addAscendancyPairNodes(tree, ['n11', 'n12'], defs.core || ASCENDANCY_NODE_FALLBACK.core, 'n10');
    const talents = TALENT_BLOOM_SPECIALIZATION_DEFS[game.bloomedTalentThisLoop];
    // 5차 재능 개화 노드: 이번 루프의 5차 전직에서 확정한 재능×전직 조합으로 열린다(루프 동안 고정, 다음 루프에 초기화).
    if (game.bloomedClassThisLoop === clsKey && talents) {
        addAscendancyPairNodes(tree, ['n13a', 'n13b'], talents, ['n11', 'n12']);
        addAscendancyPairNodes(tree, ['n13c', 'n13d'], defs.job || ASCENDANCY_NODE_FALLBACK.job, ['n11', 'n12']);
    }
    return tree;
}

function buildAscendancyBaseNodes(template, defs) {
    const slots = { m1: template.m1, m2: template.m2, d: template.d, ...(defs.slots || {}) };
    const nodes = defs.nodes || {};
    const tree = {};
    ASCENDANCY_NODE_LAYOUT.forEach(([id, slot, tier, mul, req]) => {
        tree[id] = { ...resolveAscendancyNodeSpec(nodes[id] || { stat: slots[slot], tier, mul }), req };
    });
    tree.n10 = { ...resolveAscendancyNodeSpec(nodes.n10 || defs.ult || ASCENDANCY_NODE_FALLBACK.ult), req: ['n7', 'n8', 'n9'] };
    return tree;
}

/** 두 노드 중 하나만 고르는 쌍(핵심 n11 · n12, 개화 n13a · n13b와 n13c · n13d). */
function addAscendancyPairNodes(tree, ids, lines, req) {
    tree[ids[0]] = { stat: lines[0].stat, val: lines[0].val, req, exclusive: ids[1] };
    tree[ids[1]] = { stat: lines[1].stat, val: lines[1].val, req, exclusive: ids[0] };
}

function resolveAscendancyNodeSpec(spec) {
    if (Array.isArray(spec.stats)) return { stats: spec.stats.map(resolveAscendancyStatLine) };
    return resolveAscendancyStatLine(spec);
}

function resolveAscendancyStatLine(spec) {
    if (Number.isFinite(spec.val)) return { stat: spec.stat, val: spec.val };
    const key = spec.from || spec.stat;
    const base = spec.tier === 'entry' ? getEntryStatBase(key) : getMajorStatBase(key);
    return { stat: spec.stat, val: scaleClassStat(key, base, spec.mul) };
}

/** The battle canvas's visual state as it starts (never saved); resetBattleRuntimeVisuals (js/combat.js) starts it over. */
function createBattleVisualState() {
    return {
        projectiles: [],
        damageTexts: [],
        skillEffects: [],
        skillPlayback: null,
        lastAutoSwingId: 0,
        lastAutoSkillAt: 0,
        processedFxIds: new Set(),
        enemyGhostPos: {},
        enemySmoothPos: {},
        playerFacingDirection: 'east',
        playerPos: null,
        playerGridMotion: null,
        playerAttackBlend: 0,
        playerAttackMotionSeed: 0,
        playerHurtBlend: 0,
        playerDownBlend: 0,
        lastNow: 0,
        visualNow: 0,
        lastWallNow: 0,
        frameTimeEma: 16.7,
        vfxDensity: 1,
        hitStopRemainingMs: 0,
        nextHitStopAt: 0,
        enemyHitPulses: new Map(), // Last accepted body flash per enemy, visual ms; never saved.
        lastHitStopFxId: 0
    };
}

function syncBattleTabLayout(forceTabSwitch) {
    let tabBattle = document.getElementById('tab-battle');
    let leftPane = document.getElementById('left-pane');
    let battleColumn = document.getElementById('battle-column');
    let battleBtn = document.getElementById('btn-tab-battle');
    if (!tabBattle || !leftPane || !battleColumn || !battleBtn) return;
    let isMobileBattle = uiDisplay.matches(`(max-width: ${MOBILE_BATTLE_BREAKPOINT}px)`);
    document.body.classList.toggle('mobile-battle-tab', isMobileBattle);
    battleBtn.style.display = isMobileBattle ? 'flex' : 'none';
    if (isMobileBattle) {
        if (!battleTabDocked || battleColumn.parentElement !== tabBattle) tabBattle.appendChild(battleColumn);
        battleTabDocked = true;
        if (forceTabSwitch && !document.getElementById('tab-battle').classList.contains('active')) switchTab('tab-battle');
    } else {
        if (battleTabDocked || battleColumn.parentElement !== leftPane) leftPane.appendChild(battleColumn);
        battleTabDocked = false;
    }
}

function clampPassiveCamera() {
    camX = clampNumber(camX, -9800, 9800);
    camY = clampNumber(camY, -7800, 7800);
}

// 첫 진입 시 전체 트리(1000개+ 노드, 우주계까지 포함하는 광대한 범위)를
// 한 화면에 맞추면 배율이 극단적으로 작아져 노드가 사실상 보이지 않는다.
// 실제로 지금 다룰 수 있는 범위(투자한 경로 또는 시작점 주변 군집)만 화면에 맞춰,
// 열자마자 선택지와 다음 목적지를 함께 읽을 수 있게 한다.
function getPassiveActiveViewBoundsIds() {
    let ids = new Set([getPassiveTreeRootNodeId()]);
    const invested = Array.isArray(game && game.passives) ? game.passives : [];
    invested.forEach(id => ids.add(id));
    reachableNodes.forEach(id => ids.add(id));
    if (invested.length > 0) return ids;
    const adjacency = getPassiveTreeAdjacency();
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
function getPassiveViewBounds(viewNodes) {
    const nodes = viewNodes.length ? viewNodes : [getPassiveTreeRootNode() || { x: 0, y: 0 }];
    const xs = nodes.map(n => n.x), ys = nodes.map(n => n.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

/** 시작점을 화면 아래쪽에 두어 위로 트리가 펼쳐지게 한다. 휴대폰은 안내 카드와 작은 전투 창이 아래를 가리므로 덜 내린다.
 * 맞출 범위가 그 위에 다 들어갈 때만 옮기고, 아직 투자하지 않았으면 가로로 가운데에 둔다. 카메라만 옮긴다(배율은 그대로). */
function placePassiveRootLow(width, height, bounds, invested) {
    const root = getPassiveTreeRootNode();
    if (!root) return;
    if (!invested) camX = -root.x * camZoom;
    const low = height * (width < 768 ? 0.1 : 0.32);
    if ((bounds.maxY - bounds.minY) * camZoom <= height / 2 + low - 60) camY = low - root.y * camZoom;
}

function fitPassiveCameraToBounds(force) {
    syncPassiveTreeView();
    if (passiveCameraInitialized && !force) return;
    let container = document.getElementById('tree-container');
    if (!container || container.offsetParent === null) return;
    // 닿는 노드가 지금 직업의 시작점 기준인지 맞춘 뒤 범위를 잰다.
    calculateReachableNodes();
    let width = Math.max(1, container.clientWidth);
    let height = Math.max(1, container.clientHeight);
    let viewNodes = Array.from(getPassiveActiveViewBoundsIds()).map(id => PASSIVE_TREE.nodes[id]).filter(Boolean);
    const invested = Array.isArray(game && game.passives) && game.passives.length > 0;
    const bounds = getPassiveViewBounds(viewNodes);
    const viewPadding = 120;
    const spanX = Math.max(1, (bounds.maxX - bounds.minX) + viewPadding * 2);
    const spanY = Math.max(1, (bounds.maxY - bounds.minY) + viewPadding * 2);
    const defaultZoom = Math.min((width - 64) / spanX, (height - 72) / spanY);
    // 휴대폰 첫 화면: 시작점 양옆의 바깥 원까지 폭에 맞추면 노드가 읽히지 않는다(0.16). 위로 뻗는 갈래가 읽히는 배율을 먼저 둔다.
    camZoom = clampNumber(invested || width >= 768 ? defaultZoom : Math.max(defaultZoom, 0.3), 0.1, 0.72);
    const toolbarOffsetY = invested ? 0 : 56;
    camX = -(bounds.minX + bounds.maxX) * 0.5 * camZoom;
    camY = -(bounds.minY + bounds.maxY) * 0.5 * camZoom + toolbarOffsetY;
    placePassiveRootLow(width, height, bounds, invested);
    passiveCameraInitialized = true;
}

function getBattleHitFeedback(data) {
    if (!data || data.dot || !Number.isFinite(Number(data.damage))) return {};
    let enemy = (game.enemies || []).find(row => row && row.id === data.enemyId);
    let maxHp = Math.max(0, Number(data.targetMaxHp) || Number(enemy && enemy.maxHp) || 0);
    if (maxHp <= 0) return {};
    let overkill = enemy && enemy.hp <= 0 ? Math.max(0, Number(enemy.lastOverkillDamage) || 0) : 0;
    let feedbackDamage = Math.max(0, Number(data.rawDamage) || (Number(data.damage) + overkill));
    let damageRatio = feedbackDamage / maxHp;
    let impactTier = damageRatio >= 1 ? 'annihilate' : (damageRatio >= 0.3 ? 'heavy' : 'normal');
    return { damageRatio, impactTier, targetMaxHp: maxHp };
}

function getPlayerHurtProfile(fx) {
    const ratio = Math.max(0, Number(fx.damageRatio) || 0), feel = PLAYER_HURT_FEEDBACK;
    return { hitStopMs: ratio >= feel.heavyRatio ? feel.hitStopMs : 0, shake: Math.min(feel.shakeMax, feel.shakeMin + ratio * feel.shakePerLife),
        duration: feel.duration };
}

function getBattleFeedbackProfile(fx) {
    if (!fx || fx.dot) return BATTLE_FEEDBACK_PROFILES.normal;
    if (fx.type === 'playerHit') return getPlayerHurtProfile(fx);
    if (fx.type === 'bossAreaImpact') return BATTLE_FEEDBACK_PROFILES.bossSlam;
    if (fx.impactTier === 'annihilate') return BATTLE_FEEDBACK_PROFILES.annihilate;
    if (fx.impactTier === 'heavy') return BATTLE_FEEDBACK_PROFILES.heavy;
    if (fx.crit) return BATTLE_FEEDBACK_PROFILES.crit;
    return BATTLE_FEEDBACK_PROFILES.normal;
}

function getBattleFxStart(type, data, now) {
    if (!data) return now;
    if (type === 'hit' && data.syncToSwing === true && !data.dot && latestPlayerSwingImpactAt >= now && latestPlayerSwingImpactAt - now <= 340) {
        return latestPlayerSwingImpactAt;
    }
    if (['enemyDeath', 'lootPickup', 'lootCelebration'].includes(type) && data.enemyId) {
        let pendingHit = [...battleFx].reverse().find(fx => fx && fx.type === 'hit' && fx.enemyId === data.enemyId && fx.start >= now);
        if (pendingHit) return pendingHit.start;
    }
    if (type === 'levelUp' && latestPlayerSwingImpactAt >= now && latestPlayerSwingImpactAt - now <= 340) {
        return latestPlayerSwingImpactAt;
    }
    return now;
}

function mergePendingBattleHitFx(payload, now) {
    if (!payload.damageTextGroupId || payload.enemyId === undefined || payload.enemyId === null) return false;
    let liveEnemies = (game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
    if (liveEnemies < 5) return false;
    let existing = [...battleFx].reverse().find(fx => fx && fx.type === 'hit'
        && fx.damageTextGroupId === payload.damageTextGroupId
        && fx.repeatIndex === payload.repeatIndex
        && fx.enemyId === payload.enemyId
        && String(fx.stageKind || '') === String(payload.stageKind || '')
        && now - (Number(fx.queuedAt) || 0) <= 180);
    if (!existing) return false;
    existing.damage = Math.max(0, Number(existing.damage) || 0) + Math.max(0, Number(payload.damage) || 0);
    existing.rawDamage = Math.max(0, Number(existing.rawDamage) || 0) + Math.max(0, Number(payload.rawDamage) || 0);
    existing.crit = !!(existing.crit || payload.crit);
    existing.duration = Math.max(Number(existing.duration) || 0, Number(payload.duration) || 0);
    Object.assign(existing, getBattleHitFeedback(existing));
    return true;
}

function getCurrentBattleFxQueueCap() {
    let liveEnemies = (game.enemies || []).reduce((count, enemy) => count + (enemy && enemy.hp > 0 ? 1 : 0), 0);
    if (liveEnemies >= 8) return 80;
    if (liveEnemies >= 5) return 104;
    return BATTLE_FX_QUEUE_CAP;
}

/** Choose one fully formed frost image per cast, independently of animation cadence. */
function withFrostErosionSprite(type, payload) {
    if (type !== 'combatTravel' || payload.skillName !== '빙결 침식') return payload;
    return { ...payload, spriteFrame: 7 + Math.floor(Math.random() * 5) };
}

/** Stamp for "when this appeared" on the battlefield's own clock (hit stop and slow frames pause it, so it runs behind
 * performance.now()). A spawn stamped with another clock reads as not yet appeared and is drawn at alpha 0 (2026-10-06:
 * exploration nest/ambush monsters were stamped with the combat clock and had no visible body). */
function getBattleSpawnStamp() {
    let visualNow = battleVisualState && Number(battleVisualState.visualNow);
    return Number.isFinite(visualNow) && visualNow > 0 ? visualNow : performance.now();
}

function clearBattleVisualBacklog() {
    battleFx = [];
    battleVisualState.lootEpoch = (battleVisualState.lootEpoch || 0) + 1;
    latestPlayerSwingImpactAt = 0;
    battleVisualState.projectiles = [];
    battleVisualState.damageTexts = [];
    battleVisualState.skillEffects = [];
    battleVisualState.skillPlayback = null;
    battleVisualState.processedFxIds = new Set();
    battleVisualState.hitStopRemainingMs = 0;
    battleVisualState.nextHitStopAt = 0;
    battleVisualState.enemyHitPulses.clear();
    battleVisualState.lastHitStopFxId = 0;
    battleVisualState.lastNow = 0;
    battleVisualState.visualNow = 0;
    battleVisualState.lastWallNow = 0;
    battleVisualState.frameTimeEma = 16.7;
    battleVisualState.vfxDensity = 1;
}

function setBattleFxSuppressed(suppressed) {
    battleFxSuppressed = !!suppressed;
    if (battleFxSuppressed) clearBattleVisualBacklog();
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

function getPlayerSwingTailMs() {
    if (playerSwingTailMs === null) {
        const classes = typeof STAGE_CHARACTERS === 'object' && STAGE_CHARACTERS ? Object.values(STAGE_CHARACTERS.classes) : [];
        const clips = classes.flatMap(entry => Object.values(entry.weapons)).flatMap(set => Object.values(set)).filter(clip => Array.isArray(clip.hit));
        playerSwingTailMs = clips.reduce((longest, clip) => {
            const ms = Array.isArray(clip.ms) ? clip.ms : Array(clip.frames).fill(clip.ms);
            return Math.max(longest, ms.slice(1).reduce((sum, value) => sum + value, 0));
        }, 0);
    }
    return playerSwingTailMs;
}

function cleanupBattleFx(now) {
    battleFx = battleFx.filter(fx => now - fx.start <= fx.duration + (fx.tailMs || 0));
}

function cleanupBattleVisualState(now) {
    battleVisualState.projectiles = (battleVisualState.projectiles || []).filter(projectile => now - projectile.start <= projectile.duration + 60);
    battleVisualState.skillEffects = (battleVisualState.skillEffects || []).filter(effect => {
        let elapsed = now - Number(effect && effect.startAt);
        let duration = Math.max(1, Number(effect && effect.duration) || 1);
        return Number.isFinite(elapsed) && elapsed >= -160 && elapsed <= duration + 80;
    });
    battleVisualState.damageTexts = (battleVisualState.damageTexts || []).filter(text => {
        let elapsed = now - Number(text && text.start);
        let duration = Number(text && text.duration);
        return Number.isFinite(elapsed) && Number.isFinite(duration) && elapsed >= -80 && elapsed <= duration;
    });
    Object.keys(battleVisualState.enemyGhostPos || {}).forEach(enemyId => {
        if (now - (battleVisualState.enemyGhostPos[enemyId].stamp || 0) > enemyGhostKeepMs(battleVisualState.enemyGhostPos[enemyId])) delete battleVisualState.enemyGhostPos[enemyId];
    });
    Object.keys(battleVisualState.enemySmoothPos || {}).forEach(enemyId => {
        // 유령 위치가 만료된(전장에서 사라진 지 오래된) 적의 보간 좌표도 함께 정리한다.
        if (!battleVisualState.enemyGhostPos || !battleVisualState.enemyGhostPos[enemyId]) delete battleVisualState.enemySmoothPos[enemyId];
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
        // These units belong to the selected number system, regardless of the UI language.
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

function mergeDamageTextByKey(activeTexts, config, start, x, y) {
    if (config.bodyCue || config.miss) return mergeDamageTextByKey.bodyCue(activeTexts, config, start, x, y);
    if (!config.aggregateKey) return false;
    // DoT labels share only the first 350 visual ms; continuous ticks must still create fresh, readable sums.
    let text = activeTexts.find(row => row && row.aggregateKey === config.aggregateKey
        && !!row.dot === !!config.dot && (!config.dot || (start >= row.start && start - row.start <= 350)));
    let nextValue = Number(config.value);
    if (!text || !Number.isFinite(nextValue)) return false;
    text.value = Math.max(0, Number(text.value) || 0) + Math.max(0, nextValue);
    text.hitCount = Math.max(1, Math.floor(Number(text.hitCount) || 1)) + 1;
    // A newly updated sum must remain readable even if its previous value was fading below a HUD/bar.
    text.readabilityUpdatedAt = start;
    delete text.readabilityFadeStart;
    text.crit = text.crit || !!config.crit;
    text.x = x;
    text.y = y;
    text.duration = Math.max(text.duration, Number(config.duration) || 0);
    if (config.dot) return true;
    text.damageRatio = Math.max(0, Number(text.damageRatio) || 0) + Math.max(0, Number(config.damageRatio) || 0);
    if (text.damageRatio >= 1 || config.impactTier === 'annihilate') text.impactTier = 'annihilate';
    else if (text.damageRatio >= 0.3 || config.impactTier === 'heavy' || text.impactTier === 'heavy') text.impactTier = 'heavy';
    return true;
}

function getDamageTextDuration(config) {
    if (config.duration) return config.duration;
    if (config.bodyCue) return 760;
    // About 1.4x the former stay (2026-10-05 user request) so a number can be read before it fades.
    if (config.impactTier === 'annihilate') return 1320;
    if (config.impactTier === 'heavy') return 1200;
    return config.enemyHit ? 1150 : (config.crit ? 1180 : 1060);
}

function spawnDamageText(config) {
    config = config || {};
    let wallNow = performance.now();
    let requestedStart = Number(config.start);
    let visualNow = Number(battleVisualState && battleVisualState.visualNow);
    let start = Number.isFinite(requestedStart)
        ? requestedStart
        : (Number.isFinite(visualNow) && visualNow > 0 ? visualNow : wallNow);
    let x = Number.isFinite(Number(config.x)) ? Number(config.x) : 0;
    let y = Number.isFinite(Number(config.y)) ? Number(config.y) : 0;
    let activeTexts = battleVisualState.damageTexts || (battleVisualState.damageTexts = []);
    if (mergeDamageTextByKey(activeTexts, config, start, x, y)) return;
    activeTexts.push({
        start: start,
        duration: getDamageTextDuration(config),
        x: x,
        y: y,
        offsetX: 0,
        offsetY: 0,
        driftX: 0,
        side: Math.sign(Number(config.side) || 0),
        value: config.value || 0,
        hitCount: 1,
        aggregateKey: config.aggregateKey || '',
        crit: !!config.crit,
        enemyHit: !!config.enemyHit,
        dot: !!config.dot,
        dotType: config.dotType || '',
        miss: !!config.miss,
        bodyCue: !!config.bodyCue,
        color: config.color || '',
        deflected: !!config.deflected,
        impactTier: config.impactTier || 'normal',
        damageRatio: Math.max(0, Number(config.damageRatio) || 0)
    });
    if (activeTexts.length > MAX_BATTLE_DAMAGE_TEXTS) {
        activeTexts.splice(0, activeTexts.length - MAX_BATTLE_DAMAGE_TEXTS);
    }
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

function getDamageTextFillColor(text) {
    if (text.miss) return text.color || '#c4e2ff';
    if (text.dot) {
        if (text.dotType === 'fire') return '#ff9f43';
        if (text.dotType === 'chaos') return '#c56cff';
        if (text.dotType === 'phys') return '#ff6b6b';
        return '#b57cff';
    }
    if (text.deflected) return '#b7c8c5';
    if (text.enemyHit) return '#ff9a9a';
    if (text.impactTier === 'annihilate') return '#fff1b0';
    if (text.crit || text.impactTier === 'heavy') return '#ffdc75';
    return '#ffffff';
}

function isStrongDamageText(text) {
    return !text.bodyCue && !text.miss && (text.crit || text.impactTier === 'heavy' || text.impactTier === 'annihilate');
}

// Ordinary dealt hits sit back a little (90%) so crits, heavy hits and damage taken stand out, yet stay readable on a busy floor.
function getDamageTextPeakAlpha(text) {
    return text.enemyHit || text.miss || text.bodyCue || isStrongDamageText(text) ? 1 : 0.9;
}

/** A damage number's text, formatted once per value and number format: toLocaleString for every number on screen every frame
 * was a measurable share of the frame (2026-10-07 frame drops). */
function getDamageTextLabel(text) {
    const format = (typeof game !== 'undefined' && game && game.settings) ? game.settings.damageNumberFormat : '';
    const cached = text.labelCache;
    if (cached && cached.value === text.value && cached.format === format) return cached.label;
    const label = `${text.enemyHit && !text.deflected ? '-' : ''}${formatDamageNumberForDisplay(text.value)}`;
    text.labelCache = { value: text.value, format, label };
    return label;
}

function drawDamageTexts(ctx, now, protectedBoxes = []) {
    drawDamageTexts.paint(ctx, now, protectedBoxes);
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
        duration: duration
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

function playSkillFromActiveGem(skillName) {
    // World-tree gems draw their own art (the movement gems of the 이동 스킬 slot swing without the generic effect).
    if (SKILL_GEM_VFX_PROFILES[skillName]?.family === 'worldTree') return false;
    return playSkill(mapSkillSlotByGemTags(skillName));
}

function isTutorialOpen() {
    let overlay = document.getElementById('tutorial-overlay');
    return !!activeTutorial && !!overlay && overlay.classList.contains('active');
}

function isRewardOpen() {
    let overlay = document.getElementById('reward-overlay');
    return activeRewardZoneId !== null && !!overlay && overlay.classList.contains('active');
}

function closeRewardOverlay() {
    document.getElementById('reward-overlay').classList.remove('active');
    activeRewardZoneId = null;
    lastTime = Date.now();
    if (typeof tutorialActionUi === 'object') tutorialActionUi.waitBetweenNotices();
}

function getHeroAppearanceId() {
    let followsLoopClass = !game || !game.settings || game.settings.heroAppearanceMode !== 'fixed';
    if (followsLoopClass) return game && PLAYER_CLASS_DEFS[game.selectedClassId] ? game.selectedClassId : 'archer';
    let cosmeticId = game && PLAYER_CLASS_DEFS[game.appearanceClassId] ? game.appearanceClassId : null;
    if (cosmeticId) return cosmeticId;
    return game && PLAYER_CLASS_DEFS[game.selectedClassId] ? game.selectedClassId : 'archer';
}

function isLoopHeroSelectOpen() {
    let overlay = document.getElementById('loop-hero-select-overlay');
    return !!overlay && overlay.classList.contains('active');
}

/** 직업 카드 툴팁: 고를 때 필요한 것만, 그 직업의 기초 스킬(속성은 고른 뒤 정한다, 2026-11-09 전달본 V3.14)과 그 설명, 전직 셋(검토 2026-10-01). */
function buildHeroChoiceTooltipHtml(classId, experienced) {
    let def = PLAYER_CLASS_DEFS[classId];
    if (!def) return '';
    const basic = BASIC_SKILL_WEAPONS.find(row => row.family === basicSkills.familyOf(classId));
    return `<div class="tooltip-title">${escapeHTML(_t(def.label))}${experienced ? _t(' <span style="color:#9fd8ff;">경험함</span>') : ''}</div>
        ${basic ? `<div class="tooltip-line" style="color:#f6c461;">${escapeHTML(_t('기초 스킬: {name}, 속성은 골라서 받습니다', { name: _t(basic.base) }))}</div>
        <div class="tooltip-line">${escapeHTML(_t(basic.desc))}</div>` : ''}
        <div class="tooltip-line" style="color:#d8b4ff;">전직: ${escapeHTML(getAscendanciesForClass(classId).map(id => CLASS_TEMPLATES[id].name).join(', '))}</div>`;
}

/** 휴대폰 배치(1080px 이하)는 툴팁 대신 직업 확인 판(renderLoopHeroChoiceDetail)이 같은 내용을 보인다 — 탭이 마우스 진입을 흉내 내
 * 툴팁이 판 위에 겹쳤다. */
function showHeroChoiceTooltip(event, classId, experienced) {
    if (typeof showInfoTooltipHtml !== 'function' || uiDisplay.matches('(max-width: 1080px)')) return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(classId, !!experienced), '#f6c461');
}

/** 직업 확인 판(index.html #loop-hero-select-overlay .hero-choice-confirm, 휴대폰 배치에서만 보인다): 고른 카드 표시, 툴팁과 같은
 * 기초 스킬과 전직, "이 직업으로 시작" 단추(value = 고른 직업). 판이 커지며 카드 목록이 줄어도 고른 카드는 보이게 둔다.
 * classId가 없으면 고르기 전(안내 문구, 단추 잠김)으로 되돌린다. 판이 없는 DOM(노드 스모크)에서는 하는 일이 없다. */
function renderLoopHeroChoiceDetail(classId, experienced) {
    let detail = document.getElementById('loop-hero-select-detail');
    let start = document.getElementById('loop-hero-select-start');
    if (!detail || !start) return;
    detail.innerHTML = classId ? buildHeroChoiceTooltipHtml(classId, !!experienced) : '';
    start.value = classId || '';
    start.disabled = !classId;
    if (!classId) return;
    document.querySelectorAll('#loop-hero-select-grid [data-class-id]').forEach(card => {
        let selected = card.dataset.classId === classId;
        card.setAttribute('aria-pressed', String(selected));
        if (selected) card.scrollIntoView({ block: 'nearest' });
    });
}

/** 직업 카드 누름. PC는 바로 정한다. 휴대폰 배치는 툴팁이 없어 직업을 모르고 골랐다(검토 2026-10-01) — 첫 누름은 카드를 고르고
 * 판에 기초 스킬과 전직을 보이며, 고른 카드를 다시 누르거나 "이 직업으로 시작"을 누르면 chooseLoopHero로 정한다. */
function pressLoopHeroChoice(classId, experienced) {
    let start = document.getElementById('loop-hero-select-start');
    if (!uiDisplay.matches('(max-width: 1080px)') || start.value === classId) return chooseLoopHero(classId);
    renderLoopHeroChoiceDetail(classId, experienced);
}

/** The class screen's line for this loop's mutation (js/loop-mutation.js) in the elements' colours, empty outside a mutation loop. */
function loopHeroMutationHtml() {
    const rule = loopMutation.current();
    if (!rule) return '';
    return `<span class="loop-hero-mutation">${escapeHTML(_t(rule.empowered ? '강화 변이시간선' : '변이시간선'))}: ${loopMutation.partsHtml(rule, ', ')}</span>`;
}

function openLoopHeroSelection(onSelect, options = {}) {
    let overlay = document.getElementById('loop-hero-select-overlay');
    let grid = document.getElementById('loop-hero-select-grid');
    let kickerEl = document.getElementById('loop-hero-select-kicker');
    let titleEl = document.getElementById('loop-hero-select-title');
    let bodyEl = document.getElementById('loop-hero-select-body');
    if (!overlay || !grid) {
        console.error('직업 선택 화면을 열 수 없습니다: 필수 DOM이 없습니다.');
        return false;
    }
    loopHeroSelectionCallback = typeof onSelect === 'function' ? onSelect : null;
    // Callers hand over text already in the player's language (the loop's own request hands over none).
    if (kickerEl) kickerEl.innerText = options.kicker || _t('다음 루프');
    if (titleEl) titleEl.innerText = options.title || _t('다음 루프 직업 선택');
    if (bodyEl) bodyEl.innerHTML = escapeHTML(options.body || _t('이번 루프에서 사용할 직업을 선택하세요.')) + loopHeroMutationHtml();
    let experiencedSet = new Set(game.heroSelectionInitialized && Array.isArray(game.discoveredClassIds) ? game.discoveredClassIds : []);
    grid.classList.remove('is-basic-pick');
    loopBasicSkillClassId = null;
    grid.innerHTML = PLAYER_CLASS_ORDER.map(id => {
        let def = PLAYER_CLASS_DEFS[id];
        let experienced = experiencedSet.has(id);
        let badge = experienced ? '<span class="hero-choice-badge">경험함</span>' : '';
        let args = `'${id}',${experienced}`;
        return `<button class="reward-choice hero-choice" aria-label="${_t('{label} 선택', { label: escapeHTML(_t(def.label)) })}" data-class-id="${escapeHTML(id)}" data-info-tooltip-anchor="1" onmouseenter="showHeroChoiceTooltip(event,${args})" onmousemove="showHeroChoiceTooltip(event,${args})" onmouseleave="hideInfoTooltip()" onclick="hideInfoTooltip();pressLoopHeroChoice(${args})">${badge}<img class="hero-choice-portrait" src="${escapeHTML(def.portrait)}" alt="" draggable="false"><strong>${escapeHTML(_t(def.label))}</strong></button>`;
    }).join('');
    renderLoopHeroChoiceDetail(null);
    overlay.classList.add('active');
    // Shown again, the list came back at its last scroll spot (a lower card picked last loop), past the title and the first row.
    grid.parentElement.scrollTo(0, 0);
    return true;
}

/** 직업을 정하면 같은 창에서 기초 스킬의 속성을 고른다(openLoopBasicSkillPick). 무기는 루프의 첫 처치가 떨어뜨린다
 * (js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, 2026-11-09 사용자: 첫 처치의 룬 드랍을 직업 무기와 장비 장착 안내로). */
function chooseLoopHero(classId) {
    if (!PLAYER_CLASS_DEFS[classId]) return;
    applyHeroSelection(classId, { silent: true, skipSave: true, alignTalent: true });
    openLoopBasicSkillPick(classId);
}

/** 기초 스킬의 속성 고르기(2026-11-09 사용자 "캐릭터 고를 때, 5가지 속성 중 랜덤 2개 중 선택"): 직업 카드 자리에 선택지마다 그 직업 무기의
 * 기초 스킬 카드(아이콘, 이름, 속성, 설명)를 놓는다. 변이시간선의 약점 속성은 적어 둔다(면역 속성은 선택지에 없다, js/basic-skills.js offer). */
function openLoopBasicSkillPick(classId) {
    const grid = document.getElementById('loop-hero-select-grid'), family = basicSkills.familyOf(classId);
    if (!grid || !family) {   // 창이 없는 실행(노드 검사)은 자동 루프처럼 고른다
        if (family) basicSkills.grant(game, classId, basicSkills.autoPick(game));
        return finishLoopHeroChoice(classId);
    }
    loopBasicSkillClassId = classId;
    const rule = loopMutation.of(game.season), elements = basicSkills.offer(game);
    document.getElementById('loop-hero-select-title').innerText = _t('시작 속성 선택');
    document.getElementById('loop-hero-select-body').innerHTML = escapeHTML(_t('{label}의 기초 스킬 속성을 고르세요.', { label: _t(PLAYER_CLASS_DEFS[classId].label) }))
        + loopHeroMutationHtml();
    grid.classList.add('is-basic-pick');
    grid.innerHTML = elements.map(ele => loopBasicSkillCardHtml(basicSkills.nameOf(family, ele), ele, rule)).join('');
    renderLoopHeroChoiceDetail(null);
    grid.parentElement.scrollTo(0, 0);
}

function loopBasicSkillCardHtml(name, ele, rule) {
    const weak = rule && rule.weak === ele ? _t(', 약점 피해 +{weakTakenPct}%', { weakTakenPct: LOOP_MUTATION.weakTakenPct }) : '';
    return `<button type="button" class="basic-skill-choice" style="--basic-ele:${getElementColor(ele)}" onclick="chooseLoopBasicSkill('${ele}')">
        <img class="basic-skill-icon" src="${escapeHTML(SKILL_GEM_ART_PATHS[name] || '')}" alt="" draggable="false">
        <strong>${escapeHTML(_t(name))}</strong><span class="basic-skill-element">${escapeHTML(_t(DAMAGE_ELEMENT_LABELS[ele]) + weak)}</span>
        <small>${escapeHTML(_t(SKILL_DB[name].desc))}</small></button>`;
}

/** 고른 속성의 기초 스킬을 받고 직업 고르기를 끝낸다. */
function chooseLoopBasicSkill(ele) {
    const classId = loopBasicSkillClassId;
    if (!PLAYER_CLASS_DEFS[classId]) return;
    loopBasicSkillClassId = null;
    basicSkills.grant(game, classId, ele);
    finishLoopHeroChoice(classId);
}

function finishLoopHeroChoice(classId) {
    let overlay = document.getElementById('loop-hero-select-overlay');
    if (overlay) overlay.classList.remove('active');
    document.getElementById('loop-hero-select-grid')?.classList.remove('is-basic-pick');
    let callback = loopHeroSelectionCallback;
    loopHeroSelectionCallback = null;
    if (typeof callback === 'function') callback(classId);
    lastTime = Date.now();
}

function openRingSlotOverlayByItemId(itemId) {
    pendingRingEquipItemId = Number.isFinite(itemId) ? itemId : null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay && !overlay.open) overlay.showModal();
}

function closeRingSlotOverlay() {
    pendingRingEquipItemId = null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay) overlay.close();
}

function selectRingSlotFromOverlay(slot) {
    let itemId = pendingRingEquipItemId;
    closeRingSlotOverlay();
    if (!Number.isInteger(itemId)) return;
    equipItemById(itemId, slot);
}

function openGloveSlotOverlayByItemId(itemId) {
    pendingGloveEquipItemId = Number.isFinite(itemId) ? itemId : null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay && !overlay.open) overlay.showModal();
}

function closeGloveSlotOverlay() {
    pendingGloveEquipItemId = null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay) overlay.close();
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
    if (overlay && !overlay.open) overlay.showModal();
}

function closeWeaponSlotOverlay() {
    pendingWeaponEquipItemId = null;
    let overlay = document.getElementById('weapon-slot-overlay');
    if (overlay) overlay.close();
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
    if (!checked) openDeathOverlay.pending = null;
    let settingsCheckbox = document.getElementById('chk-death-notice');
    let inlineCheckbox = document.getElementById('chk-death-notice-inline');
    if (settingsCheckbox) settingsCheckbox.checked = !!checked;
    if (inlineCheckbox) inlineCheckbox.checked = !!checked;
}

function applyPanelLayoutSettings() {
    let leftPane = document.getElementById('left-pane');
    let leftToggleButtons = ['left-pane-collapse-toggle', 'left-pane-floating-toggle']
        .map(id => document.getElementById(id))
        .filter(Boolean);
    let leftExpandFab = document.getElementById('left-pane-expand-fab');
    let combatFeed = document.querySelector('.combat-feed');
    let combatLogToggleBtn = document.getElementById('btn-combat-log-toggle');
    let isLeftCollapsed = !!(game && game.settings && game.settings.leftPaneCollapsed);
    let isLogCollapsed = uiDisplay.matches('(max-width: 1080px)')
        ? !game.settings.mobileCombatLogExpanded : !!game.settings.combatLogCollapsed;
    if (leftPane) leftPane.classList.toggle('collapsed', isLeftCollapsed);
    document.body.classList.toggle('left-pane-collapsed', isLeftCollapsed);
    // 정적 UI를 새로 그릴 때마다 불린다. 같은 글자와 속성을 다시 쓰고 innerText를 읽으면 문서 스타일과 배치를 강제로 다시
    // 계산했다(2026-10-07 프레임 드랍: 몇 초마다 한 번씩 튀던 프레임). 바뀐 것만 쓴다.
    const leftLabel = _t(isLeftCollapsed ? '전투 패널 펼치기' : '전투 패널 접기');
    leftToggleButtons.forEach(button => syncPanelToggle(button, isLeftCollapsed ? '▶' : '◀', { 'data-tip': leftLabel, 'aria-label': leftLabel }));
    if (leftExpandFab) syncPanelToggle(leftExpandFab, '▶', {});
    if (combatFeed) combatFeed.classList.toggle('collapsed', isLogCollapsed);
    document.body.classList.toggle('combat-log-collapsed', isLogCollapsed);
    const [logText, logLabel] = isLogCollapsed ? ['펼치기', '전투 기록 펼치기'] : ['접기', '전투 기록 접기'];
    if (combatLogToggleBtn) syncPanelToggle(combatLogToggleBtn, _t(logText), { 'aria-expanded': String(!isLogCollapsed), 'aria-label': _t(logLabel) });
}

/** A panel toggle's text and attributes, written only where they differ. */
function syncPanelToggle(el, text, attributes) {
    if (el.textContent !== text) el.textContent = text;
    Object.entries(attributes).forEach(([name, value]) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); });
}

function toggleLeftPaneCollapse() {
    game.settings.leftPaneCollapsed = !game.settings.leftPaneCollapsed;
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
            sourceHitDamage: Math.max(0, Math.floor(getStoredAilmentHitDamage(ail))),
            sourceEnemyName: ail.sourceEnemyName || ''
        }));
}

function closeDeathOverlay() {
    let overlay = document.getElementById('death-overlay');
    if (overlay) { overlay.close(); overlay.classList.remove('active'); }
    deathOverlayActive = false;
    lastTime = Date.now();
}

function escapeDeathLogText(value) {
    // 보스 이름의 장식 이모지(👿 …)는 도트 판에서 컬러 그림으로 튀어 뺀다.
    return escapeHTML(stripDecorativeEmoji(value));
}

function renderDeathDamageRows(rows) {
    let safeRows = (rows || []).filter(entry => entry && entry.value > 0);
    let total = safeRows.reduce((sum, entry) => sum + Math.max(0, Math.floor(entry.value || 0)), 0);
    return safeRows.map(entry => {
        let value = Math.max(0, Math.floor(entry.value || 0));
        let ratio = total > 0 ? (value / total) * 100 : 0;
        let color = getElementColor(entry.ele);
        let ratioText = ratio >= 10 ? `${Math.round(ratio)}%` : `${ratio.toFixed(1)}%`;
        return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${getDamageElementLabel(entry.ele)}</span>
            <strong class="deathlog-value">${formatNumberKR(value)}<span class="deathlog-ratio">${ratioText}</span></strong></div>
            <div class="deathlog-bar"><div class="deathlog-bar-fill" style="width:${clampNumber(ratio, 0, 100).toFixed(1)}%;background:linear-gradient(90deg,${color},${color}cc)"></div></div></div>`;
    }).join('');
}

function renderDeathAilmentRows(log) {
    let rows = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
    if (rows.length === 0) return '';
    return `<div class="deathlog-subtitle" style="margin-top:10px;">${_t('죽기 전 걸린 상태이상')}</div>` + rows.map(ail => {
        let hit = (ail.sourceHitDamage || 0) > 0 ? _t(', 원천 피해 {floor}', { floor: formatNumberKR(Math.floor(ail.sourceHitDamage)) }) : '';
        let source = ail.sourceEnemyName ? `, ${escapeDeathLogText(ail.sourceEnemyName)}` : '';
        return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${escapeDeathLogText(ail.label || getAilmentDisplayLabel(ail.type))}</span>
            <strong class="deathlog-value">${_t('{ceil}초', { ceil: Math.ceil(Math.max(0, ail.time || 0)) })}<span class="deathlog-ratio">${_t('강도 {power}{hit}{source}', { power: (Number(ail.power || 0)).toFixed(2), hit, source })}</span></strong></div></div>`;
    }).join('');
}

function renderDeathElementView(log) {
    let damageRows = renderDeathDamageRows(log.damageSummary);
    let html = damageRows || '<div class="deathlog-empty">최근 3초 동안 집계된 피해 기록이 없습니다.</div>';
    let ailments = renderDeathDamageRows(log.ailmentDamageSummary);
    if (ailments) html += `<div class="deathlog-subtitle" style="margin-top:10px;">${_t('상태이상 피해 요약')}</div>${ailments}`;
    return html + renderDeathAilmentRows(log);
}

function renderDeathMonsterView(log) {
    let rows = (Array.isArray(log.monsterSummary) ? log.monsterSummary : []).filter(row => row && row.value > 0);
    if (rows.length === 0) return '<div class="deathlog-empty">최근 3초 동안 기록된 몬스터 피해가 없습니다.</div>';
    let total = rows.reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
    let html = rows.slice(0, 5).map(row => {
        let ratio = total > 0 ? Math.max(0, row.value || 0) / total * 100 : 0;
        let color = getElementColor(row.primaryElement);
        return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${escapeDeathLogText(row.name || '알 수 없는 몬스터')}</span>
            <strong class="deathlog-monster-value" style="color:${color}">[${formatNumberKR(row.value)}]</strong></div>
            <div class="deathlog-bar"><div class="deathlog-bar-fill" style="width:${clampNumber(ratio, 0, 100).toFixed(1)}%;background:linear-gradient(90deg,${color},${color}cc)"></div></div></div>`;
    }).join('');
    let hidden = rows.slice(5);
    if (hidden.length > 0) {
        let hiddenDamage = hidden.reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
        html += `<div class="deathlog-line deathlog-other">${_t('그 외 몬스터 {length}마리, 피해 {hiddenDamage}', { length: hidden.length, hiddenDamage: formatNumberKR(hiddenDamage) })}</div>`;
    }
    return html;
}

function setDeathLogView(view) {
    deathLogView = view === 'monster' ? 'monster' : 'element';
    document.querySelectorAll('[data-deathlog-view]').forEach(tab => {
        let active = tab.dataset.deathlogView === deathLogView;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    let list = document.getElementById('deathlog-damage-list');
    let scoped = activeDeathLog && getDeathLogScope(activeDeathLog);
    if (list && scoped) list.innerHTML = deathLogView === 'monster' ? renderDeathMonsterView(scoped) : renderDeathElementView(scoped);
}

function sumDeathDamage(rows) {
    return (rows || []).reduce((sum, row) => sum + Math.max(0, row.value || 0), 0);
}

function isDeathAttrition(log) {
    const recent = sumDeathDamage(log.damageSummary);
    return log.maxLife > 0 && !!log.fight && sumDeathDamage(log.fight.damageSummary) > recent && recent < log.maxLife * DEATH_ATTRITION_SHARE;
}

function getDeathLogScope(log) {
    return isDeathAttrition(log) ? { ...log, ...log.fight } : log;
}

/** 소모전 한 줄: "32초 동안 조금씩 깎였습니다(마지막 3초 피해는 생명의 18%)." */
function describeDeathAttrition(log) {
    if (!isDeathAttrition(log)) return '';
    const share = Math.round(sumDeathDamage(log.damageSummary) / log.maxLife * 100);
    return _t('{seconds}초 동안 조금씩 깎였습니다(마지막 3초 피해는 생명의 {share}%).', { seconds: log.fight.seconds, share });
}

/** 지금 바로 할 수 있는 일. 초반 사망은 대개 받지 않은 액트 보상, 남은 포인트, 빈 무기 칸 가운데 하나였다(플레이 리뷰 2026-10-07).
 * 액트 보상 줄에는 바로 여는 단추(reward: 지역 id)가 붙는다. */
function getDeathHints() {
    const rewards = getAvailableActRewardZoneIds(), fillable = countFillableEmptySlots();
    return [
        rewards.length ? { text: _t('받지 않은 액트 보상 {length}개', { length: rewards.length }), action: { label: _t('받기'), onclick: `closeDeathOverlay();openActReward(${rewards[0]})` } } : null,
        game.passivePoints > 0 && contentProgression.canOpen('tab-char') ? { text: _t('쓰지 않은 스킬트리 포인트 {passivePoints}점', { passivePoints: game.passivePoints }), action: { label: _t('스킬트리'), onclick: "closeDeathOverlay();switchTab('tab-char')" } } : null,
        game.equipment['무기'] ? null : { text: _t('무기 칸이 비어 있습니다') },
        fillable ? { text: _t('가방에 바로 낄 수 있는 장비 {fillable}개', { fillable }), action: { label: _t('채우기'), onclick: 'fillEmptyEquipmentSlots();renderDeathHints()' } } : null,
        shopDeathHint(),
        lowResistanceDeathHint(activeDeathLog),
        strongerRuneDeathHint()
    ].filter(Boolean);
}

/** 지금 지갑으로 물건을 살 수 있는 NPC 상점 수(js/npc-shop.js ready): 해체로 모은 화폐를 쓸 곳. 상점끼리 화폐를 나눠 쓰므로 물건 수를
 * 더하지 않고 상점을 센다. */
function shopDeathHint() {
    const shops = Object.keys(NPC_SHOPS).filter(id => npcShop.ready(id) > 0).length;
    return shops ? { text: _t('지금 살 수 있는 물건이 있는 NPC 상점 {shops}곳', { shops }), action: { label: 'NPC', onclick: "closeDeathOverlay();marketUi.open('npc')" } } : null;
}

/** 비교할 만한 룬: 지금 룬이 아닌 공격 룬(위습 소환과 이동 룬 말고: 이동 룬은 이동 칸에 낀다)으로, 지금 무기로 쓸 수 있는 룬. */
function isStrongerRuneCandidate(name, keep) {
    const skill = SKILL_DB[name];
    return name !== keep && !!skill?.isGem && !(skill.tags || []).includes('summon') && !isMobilityRuneName(name) && canUseSkillWithCurrentEquipment(name);
}

/** 가진 공격 룬 가운데 DPS가 지금 룬의 1.1배를 넘는 룬(얻을 때의 "더 강한 공격 룬" 알림과 같은 기준). 알림은 4초면 지나가, 얼음 창
 * 비술사는 주문 룬을 얻고도 모르고 지나치기 쉬웠다(2026-10-17). */
function strongerRuneDeathHint() {
    const keep = game.activeSkill, before = getPlayerStats(false).dps || 0;
    if (!(before > 0)) return null;
    const dpsOf = name => { game.activeSkill = name; try { return getPlayerStats(false).dps || 0; } finally { game.activeSkill = keep; } };
    const top = (game.skills || []).filter(name => isStrongerRuneCandidate(name, keep)).map(name => [name, dpsOf(name)]).sort((a, b) => b[1] - a[1])[0];
    return top && top[1] > before * 1.1 ? { text: _t('가진 룬 「{top}」의 DPS가 지금 룬의 {value}배입니다', { top: top[0], value: (top[1] / before).toFixed(1) }),
        action: { label: _t('장착'), onclick: `changeSkill('${top[0]}');renderDeathHints()` } } : null;
}

function lowResistanceDeathHint(log) {
    const row = log ? DEATH_RESIST_STATS[normalizeDamageElementKey(log.fatalElement || log.primaryElement)] : null;
    if (!row) return null;
    const value = Math.floor(Number(getPlayerStats(false)[row[0]]) || 0);
    return value < 0 ? { text: _t('{row} 저항 {value}%(장비의 {row2} 저항 옵션으로 올리면 받는 피해가 줄어듭니다)', { row: row[1], value, row2: row[1] }),
        action: { label: _t('장비'), onclick: "closeDeathOverlay();switchTab('tab-items');switchItemSubtab('item-tab-equip')" } } : null;
}

function renderDeathHints() {
    const box = document.getElementById('deathlog-hints');
    if (!box) return;
    const hints = getDeathHints();
    box.hidden = hints.length === 0;
    box.innerHTML = hints.length === 0 ? '' : '<div class="deathlog-subtitle">할 수 있는 일</div>' + hints.map(hint => `<div class="deathlog-hint">
        <span>${escapeDeathLogText(hint.text)}</span>${hint.action ? `<button type="button" class="deathlog-hint-action" onclick="${escapeDeathLogText(hint.action.onclick)}">${_t(hint.action.label)}</button>` : ''}</div>`).join('');
}

/** 잃은 경험치 줄: 잃은 것이 없으면(레벨 1 첫 사망 등) "0 잃었습니다" 대신 줄을 뺀다. */
function describeDeathExpLoss(log) {
    return log.expLost > 0 ? _t('경험치를 {expLost} 잃었습니다.', { expLost: log.expLost }) : '';
}

/** 탐험 중 쓰러지면 모아 둔 전리품이 사라지고 지도를 처음부터 다시 밝힌다 — 보고서에 그 사실을 적는다. */
function describeDeathLootLoss(log) {
    if (!log.lostItems && !log.lostCurrencies) return '';
    const parts = [log.lostItems ? _t('아이템 {lostItems}개', { lostItems: log.lostItems }) : '', log.lostCurrencies ? _t('재화 {lostCurrencies}종', { lostCurrencies: log.lostCurrencies }) : ''].filter(Boolean);
    return _t('탐험 전리품({parts})을 잃고 지도를 처음부터 다시 밝힙니다.', { parts: parts.join(', ') });
}

function openDeathOverlay(log) {
    if (game.isBackgroundCalculation) return;
    let overlay = document.getElementById('death-overlay');
    if (!log || !overlay) return;
    openDeathOverlay.pending = null;
    activeDeathLog = log;
    let ailments = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
    let ailmentText = ailments.length > 0
        ? ailments.slice(0, 4).map(ail => _t('{label} {ceil}초', { label: ail.label || getAilmentDisplayLabel(ail.type), ceil: Math.ceil(Math.max(0, ail.time || 0)) })).join(', ')
        : '없음';
    const describeDamage = () => {
        const fatal = log.fatalElement ? getDamageElementLabel(log.fatalElement) : '속성 미기록';
        const source = [stripDecorativeEmoji(log.sourceName), fatal].filter(Boolean).join(', ');
        const recent = log.damageSummary?.length ? getDamageElementLabel(log.primaryElement) : '기록 없음';
        return `마지막 피해: ${source}\n최근 주요 피해: ${recent}`;
    };
    document.getElementById('deathlog-title').innerText = _t('전투에서 쓰러졌습니다.');
    document.getElementById('deathlog-body').innerText = [describeDamage(), describeDeathAttrition(log), describeDeathExpLoss(log), describeDeathLootLoss(log),
        log.retreatZoneName ? _t('{retreatZoneName} 물러나 레벨을 {ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.', { retreatZoneName: withDirectionParticle(log.retreatZoneName), ACT_RETREAT_LEVELS }) : '', _t('죽기 전 상태이상: {ailmentText}', { ailmentText })].filter(Boolean).join('\n');
    document.getElementById('deathlog-damage-title').innerText = isDeathAttrition(log) ? _t('전투 전체 피해 ({seconds}초)', { seconds: log.fight.seconds }) : _t('최근 3초 피해 요약');
    renderDeathHints();
    document.querySelectorAll('[data-deathlog-view]').forEach(tab => { tab.onclick = () => setDeathLogView(tab.dataset.deathlogView); });
    setDeathLogView('element');
    toggleDeathNoticeSetting(game.settings.showDeathNotice !== false);
    overlay.classList.add('active');
    deathOverlayActive = true;
    overlay.showModal();
    // 확인 takes the focus (autofocus); on a short screen that scrolled the card to its end, past the title and the last hit.
    overlay.querySelector('.deathlog-card').scrollTop = 0;
    lastTime = Date.now();
}

function openLastDeathLog() {
    if (!game.lastDeathLog) return addLog(_t('아직 기록된 데스로그가 없습니다.'), 'attack-monster');
    openDeathOverlay(game.lastDeathLog);
}

function pruneRecentDamageEvents(now) {
    let threshold = now - 3200;
    game.recentDamageEvents = Array.isArray(game.recentDamageEvents) ? game.recentDamageEvents.filter(entry => entry && entry.at >= threshold) : [];
}

function recordIncomingDamage(ele, amount, sourceName, options) {
    let now = getCombatTime();
    let opts = options && typeof options === 'object' ? options : {};
    pruneRecentDamageEvents(now);
    game.recentDamageEvents = Array.isArray(game.recentDamageEvents) ? game.recentDamageEvents : [];
    let entry = {
        at: now,
        ele: normalizeDamageElementKey(ele),
        amount: Math.max(0, Math.floor(amount || 0)),
        source: sourceName || '',
        sourceType: opts.sourceType || 'hazard',
        sourceId: opts.sourceId === undefined ? null : opts.sourceId,
        sourceName: opts.sourceName || sourceName || '',
        ailmentType: opts.ailmentType || ''
    };
    game.recentDamageEvents.push(entry);
    addDeathFightDamage(entry);
}

function addDeathFightDamage(entry) {
    let ledger = deathFightLedger;
    if (!ledger || entry.at < ledger.lastAt || entry.at - ledger.lastAt > DEATH_FIGHT_GAP_MS) {
        ledger = deathFightLedger = { startedAt: entry.at, lastAt: entry.at, rows: new Map() };
    }
    ledger.lastAt = entry.at;
    const key = [entry.ele, entry.sourceType, entry.sourceId, entry.sourceName, entry.source, entry.ailmentType].join('|');
    const row = ledger.rows.get(key);
    if (row) row.amount += entry.amount;
    else ledger.rows.set(key, { ...entry });
}

/** 사망 기록용 전투 전체 요약(걸린 초, 속성별, 상태이상, 몬스터별). 꺼내면 비워 다음 전투를 새로 센다. */
function takeDeathFightSummary() {
    const ledger = deathFightLedger;
    deathFightLedger = null;
    if (!ledger) return null;
    const rows = [...ledger.rows.values()];
    return {
        seconds: Math.max(1, Math.round((ledger.lastAt - ledger.startedAt) / 1000)),
        damageSummary: buildDeathDamageSummary(Infinity, { events: rows }),
        ailmentDamageSummary: buildDeathDamageSummary(Infinity, { events: rows, ailmentOnly: true }),
        monsterSummary: buildDeathMonsterSummary(Infinity, rows)
    };
}

function buildDeathDamageSummary(windowMs, opts) {
    let now = getCombatTime();
    pruneRecentDamageEvents(now);
    let options = opts || {};
    let totals = { phys: 0, fire: 0, cold: 0, light: 0, chaos: 0, other: 0 };
    (options.events || game.recentDamageEvents || []).forEach(entry => {
        if (!entry || entry.at < now - (windowMs || 3000)) return;
        if (options.ailmentOnly && !entry.ailmentType && !isPlayerDamageAilmentSource(entry.source)) return;
        let key = normalizeDamageElementKey(entry.ele);
        totals[key] += Math.max(0, Math.floor(entry.amount || 0));
    });
    return Object.keys(totals)
        .map(key => ({ ele: key, value: totals[key] }))
        .filter(entry => entry.value > 0)
        .sort((a, b) => b.value - a.value);
}

function buildDeathMonsterSummary(windowMs, events) {
    let now = getCombatTime();
    pruneRecentDamageEvents(now);
    let grouped = new Map();
    (events || game.recentDamageEvents || []).forEach(entry => {
        if (!entry || entry.at < now - (windowMs || 3000) || entry.sourceType !== 'monster') return;
        let key = entry.sourceId === null || entry.sourceId === undefined
            ? `name:${entry.sourceName || entry.source}`
            : `id:${entry.sourceId}`;
        let row = grouped.get(key) || { sourceId: entry.sourceId, name: entry.sourceName || entry.source || '알 수 없는 몬스터', value: 0, byElement: {} };
        let element = normalizeDamageElementKey(entry.ele);
        let value = Math.max(0, Math.floor(entry.amount || 0));
        row.value += value;
        row.byElement[element] = (row.byElement[element] || 0) + value;
        grouped.set(key, row);
    });
    return Array.from(grouped.values()).map(row => {
        let dominant = Object.entries(row.byElement).sort((a, b) => b[1] - a[1])[0];
        return { ...row, primaryElement: dominant ? dominant[0] : 'phys' };
    }).sort((a, b) => b.value - a.value);
}

function getActRewardConfig(zoneId, owner = game) {
    const config = ACT_REWARD_DB[zoneId];
    if (!config) return null;
    if (config.firstLoop && owner.season === 1) return config.firstLoop;
    // All original choices locked: keep the act reward useful without unlocking its content early.
    if (config.lockedChoices && !config.choices.some(choice => isActRewardChoiceAvailable(choice, owner))) {
        return { ...config, body: config.lockedBody, choices: config.lockedChoices };
    }
    return config;
}

function getSupportActRewardFallback(choice) {
    let amount = Math.max(1, Math.floor(Number(choice && choice.fallbackValue) || 1));
    if (choice && choice.fallbackKind === 'points') {
        return { kind: 'points', amount, currency: null, label: _t('스킬트리 포인트 +{amount}', { amount }) };
    }
    let currency = (choice && choice.currency) || 'magicBud';
    let currencyDef = ORB_DB[currency];
    if (!currencyDef) throw new Error(`Unknown support reward fallback currency: ${currency}`);
    return { kind: 'currency', amount, currency, label: _t('{name} {amount}개', { name: currencyDef.name, amount }) };
}

function isActRewardChoiceAvailable(choice, owner = game) {
    if (choice.kind === 'points' && owner.season === 1) return contentProgression.canOpen('tab-char', owner);
    if (choice.kind === 'support' || choice.stat === 'suppCap') return contentProgression.isUnlocked('support', owner);
    if (choice.kind === 'currency') return contentProgression.canDropCurrency(choice.currency, owner);
    return true;
}

function getAvailableActRewardZoneIds(owner = game) {
    return (owner.claimableActRewards || []).filter(id =>
        getActRewardConfig(id, owner)?.choices.some(choice => isActRewardChoiceAvailable(choice, owner)));
}

function getActRewardChoices(zoneId) {
    let config = getActRewardConfig(zoneId);
    if (!config) return [];
    return config.choices.map(choice => {
        let enriched = { ...choice };
        if (choice.kind === 'skill' && hasSkillGemOwned(choice.skill)) {
            enriched.desc = _t('{desc} 이미 보유 중이면 스킬트리 포인트 +{fallbackValue}로 바뀝니다.', { desc: _t(choice.desc), fallbackValue: choice.fallbackValue || 1 });
        }
        if (choice.kind === 'support' && hasSupportGemOwned(choice.gem)) {
            let fallback = getSupportActRewardFallback(choice);
            enriched.desc = _t('{desc} 이미 보유 중이면 {label}로 바뀝니다.', { desc: _t(choice.desc), label: fallback.label });
        }
        if (choice.kind === 'item' && choice.slot === '무기') Object.assign(enriched, describeActRewardWeapon());
        if (choice.kind === 'item' && isFirstActStarterReward(zoneId)) {
            enriched.label = enriched.label.replace('미확인 ', '');
            enriched.fixedStarter = true;
        }
        // Reward identity excludes labels/descriptions that change after acquiring a duplicate rune.
        enriched.claimKey = JSON.stringify([choice.kind, choice.slot, choice.rarity, choice.skill, choice.gem,
            choice.stat, choice.value, choice.currency, choice.fallbackKind, choice.fallbackValue, enriched.weaponCategory]);
        return enriched;
    });
}

/** 그 직업의 대표 무기(대표 무기 대분류에서 가장 낮은 바탕)를 보통 등급으로 만든다. 무기 칸이 차 있으면(봉인해 물려받은 무기) null.
 * 루프의 첫 처치가 떨어뜨린다(js/combat-kill-rewards.js grantLoopStarterWeaponOnFirstKill, 2026-11-09 사용자: 첫 처치의 룬 드랍을 직업 무기와 장비 장착
 * 안내로). 2026-10-17부터는 직업을 고를 때 쥐여 주었다(맨손은 주문과 투사체 룬을 못 쓴다). @returns {?object} */
function createClassStarterWeapon(classId) {
    if (!game.equipment || game.equipment['무기']) return null;
    const bases = keepWeaponCategoryBases(BASE_ITEM_DB.filter(base => base.slot === '무기' && !base.realmBase && !base.dropOnly), HANA_WEAPON_COMBOS.classWeapons[classId]);
    const base = bases.reduce((best, row) => (!best || row.reqTier < best.reqTier ? row : best), null);
    return base ? createItemFromBase(base, 'normal', 1) : null;
}

/** 액트 보상 무기는 직업 대표 무기(직업 카드의 '대표 무기')의 대분류로 나온다. 아무 무기나 나와 궁수가 대검을 받기도 했다(플레이 리뷰 2026-10-07). */
function describeActRewardWeapon() {
    const category = HANA_WEAPON_COMBOS.classWeapons[game.selectedClassId];
    return WEAPON_CATEGORIES[category] ? { weaponCategory: category, label: _t('미확인 {name}', { name: WEAPON_CATEGORIES[category].name }) } : {};
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

/** The journal entries a save's progress proves (prologue, the acts from loop 2, then JOURNAL_PROGRESS_RULES and cleared root bosses),
 * kept with the save's own valid entries; stored on state and returned. Rules as a table on 2026-10-18, in their old order. */
function repairJournalEntriesFromProgress(state) {
    let runtimeState = state && typeof state === 'object' ? state : {};
    let recovered = new Set(Array.isArray(runtimeState.journalEntries) ? runtimeState.journalEntries.filter(id => JOURNAL_DB[id]) : []);
    recovered.add('prologue');
    let loopStage = Math.max(Math.floor(runtimeState.season || 1), Math.floor(runtimeState.loopCount || 0));
    if (loopStage >= 2) Object.keys(JOURNAL_DB).filter(id => /^act_/.test(id)).forEach(id => recovered.add(id));
    JOURNAL_PROGRESS_RULES.forEach(([id, reached]) => { if (reached(runtimeState)) recovered.add(id); });
    addRootBossJournalEntries(runtimeState, recovered);
    memoryLeaves.restoreJournal(runtimeState, recovered);
    runtimeState.journalEntries = Array.from(recovered).filter(id => JOURNAL_DB[id]);
    return runtimeState.journalEntries;
}

/** A time rift fusion done, or a fused relic held (the relic scan first, as before). */
function reachedTimeRiftFusion(s) {
    const fused = holdsFusedRelic(s);
    return (s.timeRift && Math.floor(s.timeRift.fusionCount || 0) > 0) || fused;
}

/** Each cleared root boss's own journal entry. */
function addRootBossJournalEntries(runtimeState, recovered) {
    let rootBossIds = new Set(Array.isArray(runtimeState.clearedRootBosses) ? runtimeState.clearedRootBosses : []);
    if (typeof SEASON_BOSS_ZONES === 'undefined' || !Array.isArray(SEASON_BOSS_ZONES)) return;
    SEASON_BOSS_ZONES.forEach(zone => {
        if (zone && zone.journalId && rootBossIds.has(zone.id) && JOURNAL_DB[zone.journalId]) recovered.add(zone.journalId);
    });
}

function rebuildJournalBonusStateForLoad(state) {
    let runtimeState = state && typeof state === 'object' ? state : {};
    let savedBonuses = Array.isArray(runtimeState.journalBonuses)
        ? runtimeState.journalBonuses.filter(entry => entry && typeof entry.stat === 'string' && Number.isFinite(entry.value))
        : [];
    let hadLegacyImmortalHpBonus = savedBonuses.some(entry => entry.entryId === 'immortal' && entry.stat === 'flatHp');
    let legacyPassivePointBonusIds = new Set(savedBonuses
        .filter(entry => entry.stat === 'passivePoint' && typeof entry.entryId === 'string')
        .map(entry => entry.entryId));
    runtimeState.journalBonusClaims = (runtimeState.journalBonusClaims && typeof runtimeState.journalBonusClaims === 'object')
        ? runtimeState.journalBonusClaims
        : {};
    if (hadLegacyImmortalHpBonus) runtimeState.journalBonusClaims.immortal = false;
    legacyPassivePointBonusIds.forEach(id => { runtimeState.journalBonusClaims[id] = false; });

    let pendingPassivePoints = 0;
    runtimeState.journalBonuses = [];
    let entries = Array.isArray(runtimeState.journalEntries) ? runtimeState.journalEntries : [];
    entries.forEach(id => {
        let entry = JOURNAL_DB[id];
        if (!entry || !entry.bonus) return;
        if (!runtimeState.journalBonusClaims[id]) {
            runtimeState.journalBonusClaims[id] = true;
            if (entry.bonus.stat === 'passivePoint') {
                pendingPassivePoints += Math.max(0, Math.floor(entry.bonus.value || 0));
            }
        }
        if (entry.bonus.stat !== 'passivePoint' && runtimeState.journalBonusClaims[id]) {
            runtimeState.journalBonuses.push({ entryId: id, stat: entry.bonus.stat, value: entry.bonus.value });
        }
    });
    return { pendingPassivePoints, hadLegacyImmortalHpBonus, legacyPassivePointBonusIds: Array.from(legacyPassivePointBonusIds) };
}

/** 실제 수치 반영은 전달된 저장에만 한다. 로드 중인 사본에서 자동 투자나 UI를 실행하지 않는다. */
function applyJournalBonusValue(state, entryId, bonus) {
    state.journalBonuses = Array.isArray(state.journalBonuses) ? state.journalBonuses : [];
    if (bonus.stat === 'passivePoint') {
        state.passivePoints = Math.max(0, Math.floor(state.passivePoints || 0)) + Math.max(0, Math.floor(bonus.value || 0));
    }
    else if (!state.journalBonuses.some(row => row && row.entryId === entryId)) state.journalBonuses.push({ entryId, stat: bonus.stat, value: bonus.value });
}

function grantJournalBonus(entryId, state = game) {
    let entry = JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    state.journalBonusClaims = (state.journalBonusClaims && typeof state.journalBonusClaims === 'object') ? state.journalBonusClaims : {};
    if (state.journalBonusClaims[entryId]) return;
    applyJournalBonusValue(state, entryId, entry.bonus);
    state.journalBonusClaims[entryId] = true;
    if (state === game) {
        if (entry.bonus.stat === 'passivePoint' && typeof runPassiveTreeAutoInvest === 'function') runPassiveTreeAutoInvest();
        playerStatCache.invalidate();
        if (contentProgression.opening.canOpen(game, 'tab-journal')) {
            addLog(_t('저널 영구 보너스 획득: {label}', { label: _t(entry.bonus.label) }), 'season-up');
        }
    }
}

function unlockJournalEntry(entryId, state = game) {
    if (!JOURNAL_DB[entryId]) return;
    state.journalEntries = Array.isArray(state.journalEntries) ? state.journalEntries : ['prologue'];
    if (!state.journalEntries.includes(entryId)) {
        state.journalEntries.push(entryId);
        if (JOURNAL_DB[entryId].discoveryOnly) return; // 읽을거리만 보관: 보상·새 기록 목표·팝업을 추가하지 않는다.
        markJournalUnread(state);
        if (state === game) {
            if (contentProgression.opening.canOpen(state, 'tab-journal')) {
                addLog(_t('📓 새 기록: {title}', { title: JOURNAL_DB[entryId].title }), 'loot-rare');
            }
            worldTreeBark.rewardPinnacleFirstKill(entryId);
            if (typeof requestGoalSystemRefresh === 'function') requestGoalSystemRefresh();
        }
    }
    grantJournalBonus(entryId, state);
}

function markJournalUnread(state) {
    state.noti = state.noti && typeof state.noti === 'object' ? state.noti : {};
    state.noti.journal = true;
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
    if (!silent && game.journalEntries.length > before) addLog(_t('📓 루프 2 이상 보정: 액트 저널이 모두 복구되었습니다.'), 'season-up');
}

function markActRewardReady(zoneId) {
    if (zoneId < 0 || zoneId > 9) return;
    game.claimableActRewards = game.claimableActRewards || [];
    game.claimedActRewards = game.claimedActRewards || [];
    if (game.claimedActRewards.includes(zoneId) || game.claimableActRewards.includes(zoneId)) return;
    game.claimableActRewards.push(zoneId);
    // 원래 선택지와 미해금 대체 선택지 모두 고를 수 없다면 청구권만 남긴다.
    if (!getAvailableActRewardZoneIds().includes(zoneId)) return;
    game.noti.map = true;
    addLog(_t('🎁 [{name}] 클리어 보상을 받을 수 있습니다.', { name: MAP_ZONES[zoneId].name }), 'loot-rare');
    promptActReward(zoneId);
}

function actRewardPromptPending() { return !!(actRewardPromptDelay || actRewardPromptTimer); }

function actRewardWaitsForGuide() {
    return typeof tutorialActionUi === 'object'
        && (tutorialActionUi.holdsQueue() || Date.now() < tutorialActionUi.quietUntil);
}

function promptActReward(zoneId) {
    clearInterval(actRewardPromptTimer);
    clearTimeout(actRewardPromptDelay);
    actRewardPromptTimer = actRewardPromptDelay = null;
    if (game.isBackgroundCalculation) return;   // 방치 정산에서는 띄우지 않는다(보상은 지도와 목표 서랍에 남는다)
    actRewardPromptDelay = setTimeout(() => startActRewardPrompt(zoneId), ACT_REWARD_PROMPT.afterKillMs);
}

/** 띄우고, 다른 창이 비키기를 기다려야 하면 retryMs마다 다시 묻는다(최대 tries번). */
function startActRewardPrompt(zoneId) {
    actRewardPromptDelay = null;
    if (tryOpenPromptedActReward(zoneId)) return;
    let triesLeft = ACT_REWARD_PROMPT.tries;
    actRewardPromptTimer = setInterval(() => {
        if (!tryOpenPromptedActReward(zoneId) && (actRewardWaitsForGuide() || --triesLeft > 0)) return;
        clearInterval(actRewardPromptTimer);
        actRewardPromptTimer = null;
    }, ACT_REWARD_PROMPT.retryMs);
}

/** 열린 액트 보상 창: 입력 없이 3분이 지나면 나중에로 닫는다. 보상은 지도와 목표 서랍에 남고, 창 뒤에서 멈춰 있던 방치 전투가 다시 돈다. */
function watchActRewardAway() {
    clearInterval(actRewardAwayTimer);
    actRewardAwayTimer = setInterval(() => {
        if (activeRewardZoneId !== null && uiDisplay.inputIdleMs <= ACT_REWARD_PROMPT.awayMs) return;
        if (activeRewardZoneId !== null) closeRewardOverlay();
        clearInterval(actRewardAwayTimer);
        actRewardAwayTimer = null;
    }, ACT_REWARD_PROMPT.awayCheckMs);
}

/** 띄웠거나 띄울 일이 없으면 true, 다른 창이 비키기를 기다려야 하면 false. */
function tryOpenPromptedActReward(zoneId) {
    if (!canPromptActReward(zoneId)) return true;
    if (isActRewardPromptBlocked()) return false;
    openActReward(zoneId);
    return true;
}

function canPromptActReward(zoneId) {
    if (game.isBackgroundCalculation || !document.getElementById('reward-overlay') || isRewardOpen()) return false;
    return uiDisplay.inputIdleMs <= ACT_REWARD_PROMPT.awayMs && getAvailableActRewardZoneIds().includes(zoneId);
}

/** 보상 창보다 먼저 떠 있는 것: 루프 관문, 방치 정산, 안내 카드, 다른 판(사망 기록, 선택 창, 대화상자). */
function isActRewardPromptBlocked() {
    if (game.pendingLoopHeroSelection || game.pendingLoopReady || game.pendingLoopDecision) return true;
    if (activeTutorial || actRewardWaitsForGuide() || backgroundCombatRuntime.processing) return true;
    return !!document.querySelector('.tutorial-overlay.active, dialog:modal, .selection-overlay, .background-combat-progress-overlay, #background-combat-result-overlay');
}

/** Shown again, the reward card came back at the last act's scroll spot (phones scroll it to the lower choices), past the title. */
function scrollActRewardCardToTop() {
    const card = document.querySelector('#reward-overlay .tutorial-card');
    if (card) card.scrollTo(0, 0);
}

function openActReward(zoneId) {
    if (!(game.claimableActRewards || []).includes(zoneId)) return;
    let config = getActRewardConfig(zoneId);
    if (!config) return;
    if (!getAvailableActRewardZoneIds().includes(zoneId)) return;
    activeRewardZoneId = zoneId;
    let storyAct = getStoryActByZoneId(zoneId);
    // 머리글이 "액트 N 클리어 보상", 제목은 지역 이름만(예전에는 둘 다 '클리어 보상'을 되풀이했다).
    document.getElementById('reward-kicker').innerText = storyAct ? _t('{storyAct} 클리어 보상', { storyAct: formatStoryActLabel(storyAct) }) : _t('액트 클리어 보상');
    document.getElementById('reward-title').innerText = _t(storyAct ? storyAct.title : config.title);
    const nextAct = zoneId < 9 ? getStoryActByZoneId(zoneId + 1) : null;
    // 지역 이야기 줄은 흐린 글로 먼저, 다음 액트는 아래 나중에 단추 옆으로(2026-11-04 사용자: 간소화)
    document.getElementById('reward-body').innerHTML = (storyAct ? `<span class="reward-story">${escapeHTML(_t(storyAct.subtitle))}</span>\n` : '') + escapeHTML(_t(config.body));
    document.getElementById('reward-next').textContent = nextAct ? _t('다음: {act} 「{title}」', { act: formatStoryActLabel(nextAct), title: _t(nextAct.title) }) : '';
    document.getElementById('reward-grid').innerHTML = getActRewardChoices(zoneId)
        .map((choice, index) => isActRewardChoiceAvailable(choice) ? renderActRewardChoice(zoneId, choice, index) : '').join('');
    document.getElementById('reward-overlay').classList.add('active');
    scrollActRewardCardToTop();
    lastTime = Date.now();
    watchActRewardAway();
}

/** 선택지의 색과 왼쪽 그림(2026-11-04 사용자: 색감): 장비는 등급 색과 부위 그림(실제 지급할 베이스), 보조스킬룬은 그 룬의 그림과 계열 색,
 * 능력치와 포인트는 계열 색과 스킬트리 노드 그림, 화폐는 화폐 그림. @returns {{tone:string, art:string}} tone은 카드의 is-* 클래스 */
function actRewardChoiceLook(choice, item) {
    if (item) return { tone: `rarity-${choice.rarity || 'magic'}`, art: `<img class="reward-choice-art${item.slot === '무기' ? ' is-weapon' : ''}" src="${getEquipmentGridVisualAsset(item)}" alt="">` };
    const look = ACT_REWARD_KIND_LOOKS[choice.kind];
    return look ? look(choice) : { tone: 'tone-arcane', art: actRewardTreeArt(choice.kind === 'points' ? 'constellation' : 'arcane') };
}

function actRewardTreeArt(name) {
    const cell = PASSIVE_ICON_ATLAS_CELL[name] || PASSIVE_ICON_ATLAS_CELL.arcane;
    return `<span class="reward-choice-tree" style="--col:${cell[0]};--row:${cell[1]}"></span>`;
}

/** 장비는 고정 베이스와 알려진 옵션, 능력치 보상은 고르면 바뀌는 DPS와 생명력을 표시한다. 이름을 되풀이하던 미리보기 줄
 * ('화염 저항(%) +9%', '마법의 새싹 2개를 얻습니다.')은 2026-11-04에 뺐다. */
function renderActRewardChoice(zoneId, choice, index) {
    const item = choice.kind === 'item' ? buildActRewardPreviewItem(zoneId, choice) : null;
    const look = actRewardChoiceLook(choice, item);
    const detail = item ? actRewardItemPreview(choice, item) : formatActRewardDps(measureActRewardDps(zoneId, choice));
    return `
        <button class="reward-choice is-${look.tone}" data-choice-key="${encodeURIComponent(choice.claimKey)}" onclick="claimActRewardChoice(${zoneId}, ${index}, this.dataset.choiceKey)">
            <span class="reward-choice-icon" aria-hidden="true">${look.art}</span><strong>${_t(choice.label)}</strong>
            ${choice.desc ? `<span class="reward-choice-desc">${_t(choice.desc)}</span>` : ''}
            ${detail}
        </button>
    `;
}

/** 등급과 가는 곳은 이름 옆 꼬리표, 베이스 이름 뒤에 베이스 옵션과 고정 추가 옵션을 칩으로. 지급 때 무작위로 붙는 추가 옵션은 ?로 남긴다. */
function actRewardItemPreview(choice, item) {
    const rarity = _t(ITEM_RARITY_LABELS[choice.rarity] || '');
    const slot = getEquipCandidateSlots(item).find(name => Object.hasOwn(game.equipment, name) && !game.equipment[name]);
    const equips = game.settings.autoEquipEmptySlots !== false && slot && combatEquipmentStats.inspect(item, slot).ok;
    const chip = (stat, className) => `<i${className ? ` class="${className}"` : ''}>${escapeHTML(`${_t(stat.statName || getStatName(stat.id))} ${formatSignedValue(stat.id, stat.val)}`)}</i>`;
    const extra = choice.fixedStarter ? item.stats.map(stat => chip(stat, 'is-extra')).join('') : `<i class="is-unknown">${_t('추가 옵션 ?')}</i>`;
    return `<span class="reward-choice-tags">${rarity ? `<em>${_t('{rarity} 등급', { rarity })}</em>` : ''}<em>${equips ? _t('바로 장착') : _t('가방으로')}</em></span>
        <span class="reward-item-options"><b>${escapeHTML(_t(item.baseName))}</b>${item.baseStats.map(stat => chip(stat)).join('')}${extra}</span>`;
}

/** 능력치 보상의 DPS와 생명력 변화만 게임 사본에 적용해 잰다. 장비·룬·포인트는 비교하지 않는다. */
function measureActRewardDps(zoneId, choice) {
    if (choice.kind !== 'stat') return null;
    return previewBuildStats(copy => {
        copy.actRewardBonuses = [...(copy.actRewardBonuses || []), { actId: zoneId, stat: choice.stat, value: choice.value }];
    });
}

function isFirstActStarterReward(zoneId) { return zoneId === 0 && (game.season || 1) === 1 && !(game.loopCount > 0); }

/** First-loop choices use ordinary T1 mods at their listed maximum; no DPS reroll loop or invented stat ranges. */
function buildFirstActRewardItem(base, choice) {
    const item = createItemFromBase(base, 'normal', 1);
    item.rarity = 'magic';
    item.baseStats = base.baseStats.map(stat => rollBaseStat(stat, 1));
    item.stats = FIRST_ACT_REWARD_STATS[choice.slot].map(id => {
        const mod = MOD_DB.find(row => (row.statId || row.id) === id && row.slots.includes(choice.slot));
        const range = getAffixTierRange(mod, id, 1);
        return { id, val: range.max, valMin: range.min, valMax: range.max, tier: 1, statName: mod.statName };
    });
    updateItemName(item);
    return item;
}

function actRewardItemBase(zoneId, choice) {
    const bases = keepWeaponCategoryBases(BASE_ITEM_DB.filter(base => base.slot === choice.slot && !base.realmBase && !base.dropOnly && base.reqTier <= zoneId + 1), choice.weaponCategory);
    return bases.reduce((best, row) => (!best || row.reqTier > best.reqTier ? row : best), null);
}

/** 미리보기 장비: 그 액트에서 나올 바탕(무기는 직업 대표 무기의 대분류) 가운데 가장 높은 것을 보통 등급, 기본 수치 가운데 값으로. */
function buildActRewardPreviewItem(zoneId, choice) {
    const tier = zoneId + 1;
    const base = actRewardItemBase(zoneId, choice);
    if (!base) return null;
    const counter = itemIdCounter;
    try {
        if (isFirstActStarterReward(zoneId)) return buildFirstActRewardItem(base, choice);
        const item = createItemFromBase(base, 'normal', tier);
        item.baseStats = base.baseStats.map(stat => rollBaseStat(stat, 0.5));
        return item;
    } finally { itemIdCounter = counter; }
}

/** 능력치 보상으로 바뀌는 값만 스킬트리·전직 미리보기와 같은 말과 빛깔로 표시한다. */
function formatActRewardDps(change) {
    const parts = change ? buildStatPreviewParts(change) : '';
    return parts ? `<b class="reward-choice-dps">${parts}</b>` : '';
}

/** 장비 보상은 그 액트에서 나올 바탕 하나(무기는 직업 대표 무기의 대분류, getActRewardChoices)를 마법 등급으로 준다. 빈 칸이면 바로 낀다. */
function grantActRewardItem(zoneId, choice) {
    const base = actRewardItemBase(zoneId, choice);
    if (!base) return false;
    const item = isFirstActStarterReward(zoneId) ? buildFirstActRewardItem(base, choice)
        : createItemFromBase(base, choice.rarity || 'magic', zoneId + 1);
    // The shown base is the granted base. Only unidentified affixes remain random.
    if (!isFirstActStarterReward(zoneId)) item.baseStats = base.baseStats.map(stat => rollBaseStat(stat, 0.5));
    return addItemToInventory(item, { guaranteedKeep: true }) ? item : null;
}

function grantActRewardEntry(zoneId, choice) {
    if (choice.kind === 'item') {
        // 받은 장비를 기록에 남긴다(GPT가 장비 지급을 나누며 빠졌다: 1루프 무기는 시작 무기가 칸을 채워 가방으로만 간다)
        const item = grantActRewardItem(zoneId, choice);
        if (item) addLog(_t('🎁 액트 보상으로 [{name}] 획득!', { name: _t(item.name) }), choice.rarity === 'rare' ? 'loot-rare' : 'loot-magic', { item });
        return !!item;
    }
    if (choice.kind === 'skill') {
        if (!hasSkillGemOwned(choice.skill)) {
            game.skills.push(choice.skill);
            game.gemData[choice.skill] = game.gemData[choice.skill] || { level: 1, exp: 0 };
            game.noti.skills = true;
            addLog(_t('🎁 액트 보상 룬 [{skill}] 획득!', { skill: choice.skill }), 'loot-rare');
        } else {
            game.passivePoints += choice.fallbackValue || 1;
            addLog(_t('🎁 이미 보유한 룬 대신 스킬트리 포인트 +{value}', { value: choice.fallbackValue || 1 }), 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'support') {
        if (!SUPPORT_GEM_DB[choice.gem]) throw new Error(`Unknown act reward support rune: ${choice.gem}`);
        if (!hasSupportGemOwned(choice.gem)) {
            game.supports.push(choice.gem);
            game.supportGemData[choice.gem] = game.supportGemData[choice.gem] || { level: 1, exp: 0 };
            // 새 보조스킬룬이 '장착 보조스킬룬만 보기'에 가려져 지급되지 않은 것처럼
            // 보이지 않도록, 획득 직후에는 전체 보조스킬룬 목록을 보여 준다.
            game.gemFoldInactiveSupport = false;
            game.noti.skills = true;
            addLog(_t('🎁 액트 보상 보조스킬룬 [{gem}] 획득!', { gem: choice.gem }), 'loot-rare');
        } else {
            let fallback = getSupportActRewardFallback(choice);
            if (fallback.kind === 'points') game.passivePoints += fallback.amount;
            else awardCurrency(fallback.currency, fallback.amount);
            addLog(_t('🎁 중복 보조스킬룬 대신 {label}', { label: _t(fallback.label) }), 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'points') {
        game.passivePoints += choice.value || 0;
        addLog(_t('🎁 스킬트리 포인트 +{value}', { value: choice.value || 0 }), 'loot-rare');
        return;
    }
    if (choice.kind === 'currency') {
        let amount = choice.fallbackValue || choice.value || 1;
        awardCurrency(choice.currency, amount);
        addLog(`🎁 ${_t(ORB_DB[choice.currency].name)} +${amount}`, 'loot-magic');
        return;
    }
    if (choice.kind === 'stat') {
        game.actRewardBonuses = game.actRewardBonuses || [];
        game.actRewardBonuses.push({ actId: zoneId, stat: choice.stat, value: choice.value });
        addLog(`🎁 ${getStatName(choice.stat)} +${choice.value}${P_STATS[choice.stat] && P_STATS[choice.stat].isPct ? '%' : ''}`, 'loot-rare');
    }
}

function claimActRewardChoice(zoneId, choiceIndex, displayedChoice) { if (game.woodsmanBuildLock) return addLog(_t('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.'), 'attack-monster');
    if (!game.claimableActRewards.includes(zoneId)) return;
    let choices = getActRewardChoices(zoneId);
    let choice = choices[choiceIndex];
    if (!choice || !isActRewardChoiceAvailable(choice)) return;
    if (displayedChoice !== undefined && displayedChoice !== encodeURIComponent(choice.claimKey)) return openActReward(zoneId);
    if (grantActRewardEntry(zoneId, choice) === false) return addLog(_t('액트 보상을 지급하지 못했습니다. 보상은 유지됩니다.'), 'system');
    if (typeof runPassiveTreeAutoInvest === 'function') runPassiveTreeAutoInvest();
    game.claimableActRewards = game.claimableActRewards.filter(id => id !== zoneId);
    if (!game.claimedActRewards.includes(zoneId)) game.claimedActRewards.push(zoneId);
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
    return _t(DAMAGE_ELEMENT_LABELS[normalizeDamageElementKey(ele)] || DAMAGE_ELEMENT_LABELS.phys);
}

function getDamageElementIcon(ele) {
    return DAMAGE_ELEMENT_ICONS[normalizeDamageElementKey(ele)] || DAMAGE_ELEMENT_ICONS.phys;
}

exposeFileGlobals({ resetBeehiveRunModifiers, getClassKeystoneDefs, getPassiveNodeDisplayName, getPassiveEffectLabel, getPassiveKindLabel, getPassiveNodeVisualRadius, getPassiveStatAccent, passiveTreeScreenWidth, tracePassiveLinkSegment, getPassiveNodeIconFamily, getPassiveTreeArtImage, getPassiveNodeAtlasArt, isPassiveFramedNode, isPassiveImageSlotNode, tracePassiveBladeIcon, tracePassiveProjectileIcon, tracePassiveShieldIcon, tracePassivePotionIcon, tracePassiveEyeIcon, tracePassiveCubeIcon, tracePassiveCycleIcon, tracePassiveElementIcon, tracePassiveChaosIcon, tracePassiveLifeIcon, tracePassiveArcaneIcon, tracePassiveSummonIcon, tracePassivePrecisionIcon, tracePassiveWindIcon, tracePassiveAttributeIcon, tracePassiveVoidIcon, tracePassiveConstellationIcon, drawPassiveNodeIcon, getPassiveTreeViewAngle, syncPassiveTreeView, getPassiveTreeRootNodeId, getPassiveTreeRootNode, isPassiveTreeEdgeAvailable, getPassiveTreeAdjacency, rebasePassiveTreeForClassChange, getPassiveWisdomElementFromNodeIds, normalizePassiveSpecializationState, ensurePassiveSpecializationState, getPassiveNodeRawEffects, getPassiveNodeActivationState, getEffectivePassiveNodeEffects, getVoidLinkScale, getAllocatedPassiveStatValue, setPassiveRevelation, hasAuthoredPassiveKeystone, findAllocatedPassiveKeystone, getPassiveBlockedStartIds, getMystiqueAffinity, recordPassiveCycleAilmentEnd, recordPassiveCycleAilmentStart, getActivePassiveCycleBuffEffects, recordPassiveFanaticSkillUse, recordPassiveKarmaLoss, beginPassiveKarmaAttack, getPassiveAshuraAilmentChance, getPassiveAshuraDamageMultiplier, applyPassiveAshuraDamageBreakdown, applyPassiveKeystoneBucketRules, getBladeBundleShots, applyAuthoredPassiveStatRules, bootstrapPassiveTreeOnceReady, isPassiveNodeAvailable, isVoidSocketHidden, getPassiveApexNodeIds, getPassiveConstellationAwakeningProgress, unlockPassiveStarEvolution, ensureMeteorSiteState, rollMeteorKind, getMeteorKind, voidOptionRows, getVoidPassiveNodeIds, getVoidPassiveCraft, isVoidPassiveLineStat, formatVoidPassiveStatLine, getVoidPassiveEffectLabel, rollPlutoVoidCount, getVirtualVoidPassiveCount, getTranscendentVoidPassiveStats, normalizeTranscendentVoidPassive, formatTranscendentVoidPassive, rollMagicBudOnVoid, getChameleonChoices, convertChameleonVoidPassive, getTranscendentVoidPassiveCount, recordImmortalHeroDeathPenalty, applyVoidPassiveCurrency, getPassiveConnectionNodeIds, previewBuildStats, previewPassiveNodeStats, buildStatPreviewParts, refreshPassiveConnectivity, tryUnlockMeteorContentByProgress, getSkyRiftGaugeEffectiveTier, gainSkyRiftGaugeFromCombat, getOceanFishingStrategyDef, getOceanFishCollectionProgress, getOceanFishCollectionBonus, setOceanFishingStrategy, claimOceanFishCollectionMilestone, advanceOceanDiveFromKill, getOceanPermanentUpgradeCost, canPayOceanUpgradeCost, upgradeOceanPermanent, installOceanReefFragment, getPassiveRouting, enterOceanDive, getOceanShallowLiftM, forceSurfaceOcean, recordOceanSurface, forgetOceanAutoDive, setOceanAutoRedive, tickOceanOxygen, tickOceanDepth, applyOceanKill, getOceanKillAirSec, getModCategory, getSeaGiftTargetBlockReason, getSeaGiftEffectBlockReason, getSeaGiftTierStepRows, removeOneModFromItem, rollSeaGiftExistingAffix, getSeaGiftRerollRows, getSeaGiftLineCap, chooseSeaGiftGuaranteedLine, getSeaGiftEchoTargets, isSeaGiftEquipmentTarget, getSelectedSeaGiftEquipmentTarget, refuseSeaGift, getSeaGiftEditableIndexes, fillSeaGiftRareLines, applySeaGiftGuaranteedEffect, applySeaGiftBenchOption, getSeaGiftBenchSlot, applySeaGiftEcho, getOceanShardBlockReason, rerollSingleBaseOption, grantMeteorEncounterRewards, getPassiveActivationPath, getPassiveKeystoneConflict, activatePassivePath, getCurrentPassiveNodeId, migratePassiveNodeIdList, migratePassiveNodeIdRecord, normalizePassiveTreePlannerState, ensurePassiveTreePlannerState, saveCurrentPassiveTreePreset, setActivePassiveTreePreset, setPassiveTreeAutoInvest, encodePassiveTreePreset, importPassiveTreePreset, runPassiveTreeAutoInvest, calculateReachableNodes, refreshPassiveVisibility, cleanupPassiveBursts, getPassiveVisibility, getNodeRevealAmount, getClassTreeDef, addAscendancyPairNodes, createBattleVisualState, syncBattleTabLayout, clampPassiveCamera, fitPassiveCameraToBounds, getBattleHitFeedback, getBattleFeedbackProfile, getBattleFxStart, mergePendingBattleHitFx, getCurrentBattleFxQueueCap, withFrostErosionSprite, getBattleSpawnStamp, clearBattleVisualBacklog, setBattleFxSuppressed, trimRectToContent, getPlayerSwingTailMs, cleanupBattleFx, cleanupBattleVisualState, mergeDamageTextByKey, spawnDamageText, drawVisualProjectile, getDamageTextFillColor, isStrongDamageText, getDamageTextPeakAlpha, getDamageTextLabel, drawDamageTexts, getSpriteFrameRectByIndex, getHeroFrameMeta, getHeroDrawMetrics, getSkillPlaybackState, playSkillFromActiveGem, isTutorialOpen, isRewardOpen, closeRewardOverlay, getHeroAppearanceId, isLoopHeroSelectOpen, showHeroChoiceTooltip, pressLoopHeroChoice, openLoopHeroSelection, chooseLoopHero, openLoopBasicSkillPick, chooseLoopBasicSkill, openRingSlotOverlayByItemId, closeRingSlotOverlay, selectRingSlotFromOverlay, openGloveSlotOverlayByItemId, closeGloveSlotOverlay, selectGloveSlotFromOverlay, openWeaponSlotOverlayByItemId, closeWeaponSlotOverlay, selectWeaponSlotFromOverlay, isLoadingOverlayOpen, isDeathOverlayOpen, toggleDeathNoticeSetting, applyPanelLayoutSettings, toggleLeftPaneCollapse, getAilmentDisplayLabel, snapshotPlayerAilmentsForDeathLog, closeDeathOverlay, renderDeathMonsterView, renderDeathHints, openDeathOverlay, openLastDeathLog, recordIncomingDamage, takeDeathFightSummary, buildDeathDamageSummary, buildDeathMonsterSummary, getActRewardConfig, isActRewardChoiceAvailable, getAvailableActRewardZoneIds, getActRewardChoices, createClassStarterWeapon, getClaimedJournalPassivePointTotal, repairJournalEntriesFromProgress, reachedTimeRiftFusion, rebuildJournalBonusStateForLoad, grantJournalBonus, unlockJournalEntry, ensureActJournalCompletionForLoop, markActRewardReady, actRewardPromptPending, openActReward, actRewardChoiceLook, actRewardTreeArt, actRewardItemPreview, buildActRewardPreviewItem, grantActRewardEntry, claimActRewardChoice, getElementColor, normalizeDamageElementKey, getDamageElementLabel, getDamageElementIcon });
})();


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


function angleDistance(a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
}

// Node radii in tree units (v23, 2026-10-28: the tree spread ×1.35 while small nodes grew 7 → 9 and notables 21 → 24, so the gaps
// between nodes widened; scripts/lib/passive-tree-v23-layout.js NODE_RADIUS keeps the same numbers for the layout checks).
const PASSIVE_NODE_KIND_RADIUS = Object.freeze({
    start: 34,
    transcendent: 30,
    keystone: 31,
    void: 28,
    apex: 26,
    core: 24,
    deadend: 24,
    evolved: 24,
    major: 24,
    assist: 9
});

const PASSIVE_NODE_SOURCE_RADIUS = Object.freeze({ major: 24, normal: 14, assist: 9, minor: 9 });


const PASSIVE_ICON_FAMILY = Object.freeze({
    ...Object.fromEntries(Object.entries(WEAPON_CONDITION_STATS).map(([id, line]) => [id, { greatsword: 'blade', sword: 'blade', bow: 'projectile', orb: 'arcane', flask: 'potion', censer: 'arcane' }[line.stance]])),
    voidLinkEfficiency: 'void', attackPctDmg: 'blade', projectileChain: 'projectile', skillDelayReduce: 'arcane', spellRepeatChance: 'arcane', igniteDurationPct: 'elemental', chillDurationPct: 'elemental', freezeDurationPct: 'elemental',
    shockDurationPct: 'elemental', poisonDurationPct: 'potion', bleedDurationPct: 'blade',
    minDmgRoll: 'blade', maxDmgRoll: 'blade', ailmentPotencyPct: 'damageOverTime', ailmentDamagePct: 'damageOverTime', summonEfficiency: 'summon',
    atk: 'spell', utility: 'cooldown',
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle', projectilePctDmg: 'projectile', projectileExtraShots: 'projectile',
    accuracy: 'projectile', accuracyBonusPct: 'projectile', meleePctDmg: 'blade', physPctDmg: 'blade', slamPctDmg: 'slam', flatDmg: 'blade',
    strength: 'strength', pctDmg: 'blade', ds: 'blade', bleedChance: 'bleed', physIgnore: 'blade', doubleDamageChance: 'blade', addedPhysDamagePct: 'blade',
    blockChance: 'shield', blockChanceMax: 'shield', shieldPctDmg: 'shield', armor: 'armor', armorPct: 'armor', dr: 'armor', deflectChance: 'shield',
    takenDamageReduceWhen1EnemyPct: 'shield', takenDamageReduceWhen2EnemiesPct: 'shield',
    potionPctDmg: 'potion', poisonChance: 'poison', summonPctDmg: 'summon', summonHpPct: 'summon', summonGemLevel: 'summon',
    summonCrit: 'summon', summonCritDmg: 'summon', summonFlatDmg: 'summon', summonAspd: 'summon', summonResPen: 'summon',
    // 2026-11-01: Codex's 14 new pictures take the stats that used to share elemental, shield, precision, wind and arcane.
    firePctDmg: 'fire', coldPctDmg: 'cold', lightPctDmg: 'lightning', elementalPctDmg: 'elemental', resPen: 'elemental',
    igniteChance: 'ignite', chillChance: 'chill', freezeChance: 'freeze', shockChance: 'shock', resF: 'fire', resC: 'cold',
    resL: 'lightning', resAll: 'elemental', aoePctDmg: 'area', chillEffect: 'chill', shockEffect: 'shock',
    igniteDamageMultiplierPct: 'ignite', shockedEnemyHitDamagePct: 'shock', shockedEnemyHitDamageMorePct: 'shock', addedFireDamagePct: 'fire',
    addedColdDamagePct: 'cold', addedLightDamagePct: 'lightning', physTakenAsFire: 'fire', physTakenAsCold: 'cold', physTakenAsLight: 'lightning',
    chaosPctDmg: 'chaos', dotPctDmg: 'damageOverTime', resChaos: 'chaos', poisonDamageMultiplierPct: 'poison', addedChaosDamagePct: 'chaos', physTakenAsChaos: 'chaos',
    flatHp: 'life', pctHp: 'life', regen: 'life', leech: 'life', leechTotalCap: 'life', energyShield: 'energyShield', energyShieldPct: 'energyShield',
    energyShieldRegen: 'energyShield', energyShieldRechargeFaster: 'energyShield', spellPctDmg: 'spell', spellFlatDmg: 'spell', spellFlatPct: 'spell',
    intelligence: 'intelligence', dexterity: 'dexterity', crit: 'critical', critDmg: 'critical', aspd: 'precision',
    cooldownRecovery: 'cooldown', cooldownReduction: 'cooldown', mobilityCooldownRecovery: 'mobility', mobilityCooldownReduction: 'mobility',
    evasion: 'evasion', evasionPct: 'evasion', move: 'wind', mobilityPctDmg: 'mobility'
});

const PASSIVE_START_ICON_FAMILY = Object.freeze({
    occultist: 'mystique',
    wanderer: 'blade',
    cleric: 'devotion',
    archer: 'projectile',
    alchemist: 'potion',
    warrior: 'blade'
});

const PASSIVE_ICON_ATLAS_CELL = Object.freeze({
    blade: [0, 0], projectile: [1, 0], shield: [2, 0], potion: [3, 0], strength: [4, 0],
    mystique: [0, 1], devotion: [1, 1], cycle: [2, 1], elemental: [3, 1], dexterity: [4, 1],
    chaos: [0, 2], life: [1, 2], arcane: [2, 2], summon: [3, 2], intelligence: [4, 2],
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3],
    fire: [4, 3], cold: [0, 4], lightning: [1, 4], cooldown: [2, 4], critical: [3, 4], armor: [4, 4],
    evasion: [0, 5], energyShield: [1, 5], ignite: [2, 5], chill: [3, 5], freeze: [4, 5], shock: [0, 6], bleed: [1, 6], poison: [2, 6],
    // 2026-11-01 expansion-02: skill kinds and weapons, picked by hand or by the stat below
    wisp: [3, 6], blessing: [4, 6], mobility: [0, 7], area: [1, 7], slam: [2, 7], damageOverTime: [3, 7], spell: [4, 7],
    censer: [0, 8], greatsword: [1, 8], bow: [2, 8], orb: [3, 8]
});
const PASSIVE_ICON_ATLAS_COLUMNS = 5;
const PASSIVE_ICON_ATLAS_ROWS = 9;
const PASSIVE_NOTABLE_ICON_ATLAS_CELL = Object.freeze({
    notableEnergyShield: [0, 0], notableArmor: [1, 0], notableFire: [2, 0], notableCold: [3, 0],
    notableLightning: [0, 1], notableElementalResist: [1, 1], notableBleed: [2, 1], notableGem: [3, 1],
    notableAttackSpeed: [0, 2], notableMoveSpeed: [1, 2], notableLife: [2, 2], notableSpellInherent: [3, 2]
});
const PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT = Object.freeze({
    energyShield: 'notableEnergyShield', energyShieldPct: 'notableEnergyShield', energyShieldRegen: 'notableEnergyShield',
    energyShieldRechargeFaster: 'notableEnergyShield', armor: 'notableArmor', armorPct: 'notableArmor',
    firePctDmg: 'notableFire', addedFireDamagePct: 'notableFire',
    coldPctDmg: 'notableCold', addedColdDamagePct: 'notableCold',
    lightPctDmg: 'notableLightning', addedLightDamagePct: 'notableLightning',
    resF: 'notableElementalResist', resC: 'notableElementalResist', resL: 'notableElementalResist',
    resAll: 'notableElementalResist', maxResF: 'notableElementalResist', maxResC: 'notableElementalResist',
    maxResL: 'notableElementalResist', maxResAll: 'notableElementalResist',
    bleedChance: 'notableBleed', bleedDamageMultiplierPct: 'notableBleed', bleedDamageReducePct: 'notableBleed',
    gemLevel: 'notableGem', suppCap: 'notableGem', fireGemLevel: 'notableGem', coldGemLevel: 'notableGem',
    lightGemLevel: 'notableGem', chaosGemLevel: 'notableGem', physGemLevel: 'notableGem',
    projectileGemLevel: 'notableGem', meleeGemLevel: 'notableGem', slamGemLevel: 'notableGem',
    spellGemLevel: 'notableGem', dotGemLevel: 'notableGem', aoeGemLevel: 'notableGem',
    elementalGemLevel: 'notableGem', summonGemLevel: 'notableGem', strGemLevel: 'notableGem', dexGemLevel: 'notableGem',
    intGemLevel: 'notableGem', runeResonancePower: 'notableGem',
    aspd: 'notableAttackSpeed', move: 'notableMoveSpeed',
    flatHp: 'notableLife', pctHp: 'notableLife', regen: 'notableLife',
    spellFlatDmg: 'notableSpellInherent', spellFlatPct: 'notableSpellInherent'
});
const PASSIVE_KEYSTONE_ICON_CELL_BY_ID = Object.freeze({
    pt_core_keystone_01: [0, 0], pt_core_keystone_02: [1, 0], pt_core_keystone_03: [2, 0],
    pt_core_keystone_04: [3, 0], pt_core_keystone_05: [4, 0], pt_core_keystone_06: [5, 0],
    npqq5m7h2ri: [0, 1], n39ip40yc3d: [1, 1], nv67fzprmet: [2, 1], nkr7zwrymol: [3, 1],
    nxsxdk1yr2y: [4, 1], n2c51dapljo: [5, 1], nkf64engb6m: [0, 2],
    backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone: [1, 2],
    backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone: [2, 2],
    backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone: [3, 2],
    backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone: [4, 2],
    backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone: [5, 2],
    backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone: [0, 3],
    backbone_branch_occultist_outer_2_mystique_single_keystone: [1, 3],
    backbone_branch_occultist_outer_4_occultist_summon_keystone: [2, 3],
    backbone_branch_cleric_outer_1_devotion_triple_keystone: [3, 3],
    backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone: [4, 3],
    backbone_branch_warrior_outer_1_cycle_reverse_keystone: [5, 3],
    backbone_branch_warrior_outer_4_warrior_bleed_keystone: [0, 4],
    backbone_branch_wanderer_outer_4_wanderer_duel_keystone: [1, 4],
    backbone_branch_archer_outer_4_archer_physical_keystone: [2, 4],
    backbone_branch_alchemist_outer_1_universal_flask_keystone: [3, 4],
    backbone_branch_alchemist_outer_2_universal_summon_keystone: [4, 4],
    backbone_branch_alchemist_outer_4_alchemist_resist_keystone: [5, 4],
    pt_warrior_blood_cradle: [0, 5]
});
const PASSIVE_KEYSTONE_ICON_ATLAS_ROWS = 6;
/** Node frames (Codex 2026-10-28: grey-white antique wood, the void a ring of black flame), one strip, [x, size] per look at y 0. The
 * icon atlases and this strip are built by scripts/build-passive-tree-art.js from the same tables. */
const PASSIVE_TREE_FRAME_SHEET = Object.freeze({ small: [0, 24], medium: [26, 40], notable: [68, 56], keystone: [126, 72], void: [200, 56] });


const PASSIVE_ICON_TRACERS = Object.freeze({
    blade: tracePassiveBladeIcon, projectile: tracePassiveProjectileIcon, shield: tracePassiveShieldIcon,
    potion: tracePassivePotionIcon, mystique: tracePassiveEyeIcon, devotion: tracePassiveCubeIcon,
    cycle: tracePassiveCycleIcon, elemental: tracePassiveElementIcon, chaos: tracePassiveChaosIcon,
    life: tracePassiveLifeIcon, arcane: tracePassiveArcaneIcon, summon: tracePassiveSummonIcon,
    precision: tracePassivePrecisionIcon, wind: tracePassiveWindIcon,
    strength: tracePassiveAttributeIcon, dexterity: tracePassiveAttributeIcon, intelligence: tracePassiveAttributeIcon,
    void: tracePassiveVoidIcon, constellation: tracePassiveConstellationIcon,
    // the 2026-11-01 families fall back to the nearest older tracer while the sheet is still loading
    fire: tracePassiveElementIcon, cold: tracePassiveElementIcon, lightning: tracePassiveElementIcon, ignite: tracePassiveElementIcon,
    chill: tracePassiveElementIcon, freeze: tracePassiveElementIcon, shock: tracePassiveElementIcon, critical: tracePassivePrecisionIcon,
    armor: tracePassiveShieldIcon, evasion: tracePassiveWindIcon, energyShield: tracePassiveArcaneIcon, cooldown: tracePassiveCycleIcon,
    bleed: tracePassiveBladeIcon, poison: tracePassivePotionIcon,
    wisp: tracePassiveSummonIcon, blessing: tracePassiveCubeIcon, mobility: tracePassiveWindIcon, area: tracePassiveElementIcon, slam: tracePassiveBladeIcon,
    damageOverTime: tracePassiveChaosIcon, spell: tracePassiveArcaneIcon, censer: tracePassivePotionIcon, greatsword: tracePassiveBladeIcon,
    bow: tracePassiveProjectileIcon, orb: tracePassiveArcaneIcon
});


// 스킬트리 시점(2026-11-02 사용자: 내 직업 시작 노드가 항상 맨 아래). 트리 전체를 중심 둘레로 돌린다. 거리와 연결은 그대로라 규칙에 영향이 없다.
let passiveTreeViewAngle = 0;


var passiveTreeAdjacencyCache = { signature: '', map: new Map() };


const PASSIVE_REVELATION_IDS = Object.freeze(['combat', 'guard', 'life']);
const PASSIVE_REVELATION_LABELS = Object.freeze({
    combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약', fanaticism: '광신'
});
const PASSIVE_WISDOM_ELEMENTS = Object.freeze(['fire', 'cold', 'lightning', 'chaos']);
const PASSIVE_WISDOM_ELEMENT_BY_NODE_ID = Object.freeze({
    nmvzwisdomf: 'fire', nmvzwisdomc: 'cold', nmvzwisdoml: 'lightning', nmvzwisdomd: 'chaos',
    nhenzv8gp4i: 'fire',
    nlwk06igprm: 'cold',
    ndru1xggqhg: 'lightning',
    nwn5msikamo: 'chaos'
});
const PASSIVE_AILMENT_BY_ELEMENT = Object.freeze({ phys: 'bleed', fire: 'ignite', cold: 'chill', light: 'shock', chaos: 'poison' });
const PASSIVE_KARMA_PER_TARGET_CAP = 500;
const PASSIVE_KEYSTONE_NODE_ID_BY_TITLE = Object.freeze({
    '금단의 만상': 'pt_core_keystone_01',
    '타락한 복음': 'pt_core_keystone_02',
    '육신과 정신의 성약': 'pt_core_keystone_03',
    '카르마': 'pt_core_keystone_04',
    '아슈라': 'pt_core_keystone_05',
    '사중합일': 'pt_core_keystone_06',
    '순환의 원석': 'npqq5m7h2ri',
    '야만': 'n39ip40yc3d',
    '헌신의 서약': 'nv67fzprmet',
    '몰아의 통로': 'nkr7zwrymol',
    '최후방 사격': 'nxsxdk1yr2y',
    '결투의 규율': 'n2c51dapljo',
    '피빛 요람': 'pt_warrior_blood_cradle',
    '지혜의 도약': 'nkf64engb6m',
    '혼의 성소': 'backbone_branch_occultist_cleric_center_occultist_cleric_channel_guard_keystone',
    '움직이는 성벽': 'backbone_branch_cleric_warrior_center_cleric_warrior_guard_regen_keystone',
    '피의 가속': 'backbone_branch_warrior_wanderer_center_warrior_wanderer_roll_speed_keystone',
    '선제 사냥': 'backbone_branch_wanderer_archer_center_wanderer_archer_range_roll_keystone',
    '오염된 탄두': 'backbone_branch_archer_alchemist_center_archer_alchemist_area_projectile_keystone',
    '검은 증류': 'backbone_branch_alchemist_occultist_center_alchemist_occultist_energy_poison_keystone',
    '단일 해석': 'backbone_branch_occultist_outer_2_mystique_single_keystone',
    '남겨진 잠식': 'backbone_branch_occultist_outer_4_occultist_summon_keystone',
    '삼중 계시': 'backbone_branch_cleric_outer_1_devotion_triple_keystone',
    '대리 성약': 'backbone_branch_cleric_outer_4_cleric_summon_efficiency_keystone',
    '역행 순환': 'backbone_branch_warrior_outer_1_cycle_reverse_keystone',
    '한 번의 중량': 'backbone_branch_warrior_outer_4_warrior_bleed_keystone',
    '완전 회피': 'backbone_branch_wanderer_outer_4_wanderer_duel_keystone',
    '관통 행렬': 'backbone_branch_archer_outer_4_archer_physical_keystone',
    '과잉 투여': 'backbone_branch_alchemist_outer_1_universal_flask_keystone',
    '단 하나의 사역': 'backbone_branch_alchemist_outer_2_universal_summon_keystone',
    '폭발성 증류': 'backbone_branch_alchemist_outer_4_alchemist_resist_keystone'
});
const PASSIVE_CYCLE_BUFF_EFFECTS = Object.freeze({
    ignite: [{ stat: 'firePctDmg', perCycle: 2 }],
    chill: [{ stat: 'coldPctDmg', perCycle: 2 }, { stat: 'move', perCycle: 0.5 }],
    freeze: [{ stat: 'coldPctDmg', perCycle: 2 }, { stat: 'energyShieldPct', perCycle: 1 }],
    shock: [{ stat: 'lightPctDmg', perCycle: 2 }, { stat: 'aspd', perCycle: 0.5 }],
    poison: [{ stat: 'chaosPctDmg', perCycle: 2 }, { stat: 'regen', perCycle: 0.1 }],
    bleed: [{ stat: 'physPctDmg', perCycle: 2 }, { stat: 'armorPct', perCycle: 1 }]
});


safeExposeGlobals({ getPassiveNodeActivationState, getEffectivePassiveNodeEffects, getVoidLinkScale });


/** 통로 키스톤(2026-11-01 사용자 글 "…의 시작점을 통과할 수 있음"): 찍으면 그 직업의 시작점을 포인트 없이 지나간다. 통로 키스톤이 있는 트리에서는 다른 직업의 시작점이 막힌다. */
const PASSIVE_START_GATE_CLASS_BY_TITLE = Object.freeze({ '연금술의 가지': 'alchemist', '지식의 가지': 'occultist', '바람결의 가지': 'archer', '믿음의 줄기': 'cleric', '자유의 줄기': 'wanderer', '힘의 뿌리': 'warrior' });


bootstrapPassiveTreeOnceReady();


const METEOR_SITE_FLAGS = Object.freeze(['unlocked', 'skyRiftReady', 'skyRiftAllCosmos']);
// [key, max, whole number]; every value is clamped at 0 from below. The gauge keeps fractions: kills add 0.35 × tier.
const METEOR_SITE_NUMBERS = Object.freeze([['skyRiftGauge', 100, false], ['skyRiftCarryGauge', 99, false],
    ['lastAnomalyAt', Infinity, true], ['entriesCleared', Infinity, true]]);


const VOID_PASSIVE_OPTION_POOL = [
    ...voidOptionRows('피해', [['pctDmg', 5, 9], ['attackPctDmg', 8, 13], ['spellPctDmg', 9, 15], ['elementalPctDmg', 8, 13], ['meleePctDmg', 10, 16], ['projectilePctDmg', 10, 16], ['physPctDmg', 10, 16],
        ['aoePctDmg', 10, 16], ['dotPctDmg', 10, 16], ['firePctDmg', 11, 18], ['coldPctDmg', 11, 18], ['lightPctDmg', 11, 18], ['chaosPctDmg', 11, 18], ['slamPctDmg', 12, 20], ['potionPctDmg', 12, 20],
        ['mobilityPctDmg', 12, 20], ['summonPctDmg', 12, 20], ['flatDmg', 5, 10], ['resPen', 2, 4]]),
    ...voidOptionRows('치명타와 속도', [['crit', 2, 4], ['critDmg', 8, 15], ['aspd', 3, 5], ['ds', 3, 6], ['minDmgRoll', 3, 6], ['maxDmgRoll', 3, 6], ['physIgnore', 3, 6], ['spellRepeatChance', 2, 4],
        ['skillDelayReduce', 1, 3], ['cooldownRecovery', 5, 10], ['cooldownReduction', 2, 4], ['move', 4, 7]]),
    ...voidOptionRows('상태이상', [['igniteChance', 4, 8], ['chillChance', 4, 8], ['shockChance', 4, 8], ['poisonChance', 4, 8], ['bleedChance', 4, 8], ['freezeChance', 2, 4],
        ['igniteDurationPct', 8, 14], ['chillDurationPct', 8, 14], ['freezeDurationPct', 8, 14], ['shockDurationPct', 8, 14], ['poisonDurationPct', 8, 14], ['bleedDurationPct', 8, 14]]),
    ...voidOptionRows('방어', [['flatHp', 20, 40], ['pctHp', 3, 6], ['regen', 0.5, 1, 0.1], ['leech', 0.2, 0.5, 0.1], ['armorPct', 8, 15], ['evasionPct', 8, 15], ['energyShieldPct', 8, 15], ['energyShield', 16, 32],
        ['blockChance', 1, 3], ['deflectChance', 2, 4], ['resAll', 4, 7], ['resF', 8, 14], ['resC', 8, 14], ['resL', 8, 14], ['resChaos', 5, 9],
        ['ailResIgnite', 8, 14], ['ailResFreeze', 8, 14], ['ailResShock', 8, 14], ['ailResPoison', 8, 14], ['ailResBleed', 8, 14]]),
    ...voidOptionRows('능력치', [['strength', 8, 16], ['dexterity', 8, 16], ['intelligence', 8, 16], ['accuracy', 40, 90]]),
    ...voidOptionRows('무기', Object.keys(SKILL_RUNE_STANCE_LABELS).filter(stance => stance !== 'unarmed')
        .flatMap(stance => [[`${stance}PctDmg`, 14, 22], [`${stance}Crit`, 3, 5], [`${stance}Aspd`, 5, 8]]))
];


const TRANSCENDENT_VOID_PASSIVE_DB = [
    { id: 'trauma', name: '트라우마', min: 5, max: 10, desc: v => _t('이 공허 패시브는 공허 할당 {v}회로 계산', { v }) },
    { id: 'paleBlueDot', name: '창백한 푸른 점', fixed: 10, desc: v => _t('스킬트리 포인트 {v}점을 추가로 얻습니다.', { v }) },
    { id: 'overflowingVigor', name: '넘치는 활기', min: 3, max: 6, desc: v => _t('할당한 공허 패시브 하나당 생명력 최대치 +{v}%', { v }) },
    { id: 'toughSoul', name: '강인한 영혼', min: 3, max: 6, desc: v => _t('할당한 공허 패시브 하나당 에너지 보호막 최대치 +{v}%', { v }) },
    { id: 'defenseMechanism', name: '방어기제', min: 5, max: 10, desc: v => _t('막기 확률 최대치 +{v}% 및 막기 확률 +{v2}%', { v, v2: v }) },
    { id: 'blurredPresence', name: '흐릿한 존재감', min: 10, max: 20, min2: 3, max2: 5, desc: (v, v2) => _t('비껴내기 +{v}% 및 비껴내기 피해 감소 +{v2}%', { v, v2 }) },
    { id: 'chameleon', name: '카멜레온', desc: () => '공허 제작 창에서 다른 초월 하나를 골라 바꿀 수 있습니다' }, // convertChameleonVoidPassive
    { id: 'thirdFinger', name: '세 번째 손가락', desc: () => '반지를 하나 더 장착 가능' },
    { id: 'greed', name: '재물욕', desc: () => '주얼을 하나 더 장착 가능' },
    { id: 'wardKnot', name: '액막이 매듭', desc: () => '액막이를 하나 더 장착 가능' }, // 액막이 칸 +1(js/colony-wards.js slotCount)
    { id: 'innateTalent', name: '타고난 재능', min: 5, max: 15, min2: 1.5, max2: 2, step2: 0.1, desc: (v, v2) => _t('{v}% 확률로 {v2}배 피해', { v, v2 }) },
    { id: 'wholehearted', name: '전심전력', min: 5, max: 15, desc: v => _t('할당한 공허 패시브 하나당 모든 피해 +{v}%', { v }) },
    { id: 'impatience', name: '조급함', min: 8, max: 16, desc: v => _t('할당한 공허 패시브 하나당 이동 속도 +{v}%', { v }) },
    { id: 'immortalHero', name: '불멸의 영웅', fixed: 3000, desc: v => _t('생명력 +{max} (획득 이후 사망 시마다 -30)', { max: Math.max(0, Math.floor(Number(v) || 0)) }) },
    { id: 'seasoned', name: '노련함', min: 4, max: 5, desc: v => _t('경험한 루프 1회마다 치명타 피해 배율 +{v}%', { v }) },
    // 옛 고유 별쐐기 11종(2026-10-01). 트리를 바꾸던 변성 반경은 수치 효과로 옮겼다. 다섯의 수치는 data/passives.js
    // TRANSCENDENT_VOID_VALUES(9단계에서 맞춤).
    { id: 'pluto', name: '명왕성', min: 1, max: 5, rollValue: () => rollPlutoVoidCount(), desc: v => _t('할당한 공허 패시브 수 +{v}로 계산 (5개 확률 1/625)', { v }) },
    { id: 'resonantStar', name: '공명별', fixed: 1, desc: v => _t('보조스킬룬 한도 +{v}', { v }) },
    { id: 'darkMatter', name: '암흑물질', desc: () => '옵션이 한 줄인 다른 공허 패시브의 효과 +100% (초월 공허 제외)' },
    { id: 'sun', name: '태양', desc: () => '초월 직전 이 공허 패시브의 옵션을 3배로 유지' },
    { id: 'blackHole', name: '블랙홀', desc: () => '이 노드가 무료 연결 거점이 됩니다. 시작점까지의 길을 되돌려도 이어진 패시브가 유지됩니다' },
    { id: 'andromeda', name: '안드로메다', desc: () => _t('이 노드 반경 {value} 안의 패시브는 길이 이어지지 않아도 할당할 수 있습니다', { value: TRANSCENDENT_ANDROMEDA_RADIUS }) },
    { id: 'comet', name: '혜성', ...TRANSCENDENT_VOID_VALUES.comet, desc: v => _t('이동 속도 +{v}%', { v }) },
    { id: 'asteroidBelt', name: '소행성대', ...TRANSCENDENT_VOID_VALUES.asteroidBelt, desc: v => _t('이 노드 반경 {value} 안에 할당한 패시브 하나당 모든 피해 +{v}%', { value: TRANSCENDENT_ASTEROID_RADIUS, v }) },
    { id: 'zeroGravity', name: '무중력', ...TRANSCENDENT_VOID_VALUES.zeroGravity, desc: v => _t('회피 +{v}%', { v }) },
    { id: 'satellite', name: '위성', ...TRANSCENDENT_VOID_VALUES.satellite, desc: v => _t('공격 속도 +{v}%', { v }) },
    { id: 'supernova', name: '초신성', ...TRANSCENDENT_VOID_VALUES.supernova, desc: v => _t('다른 공허 패시브의 옵션 +{v}%', { v }) }
];


/** 초월 공허 패시브가 패시브 스탯에 더하는 줄. ctx.voidCount는 트라우마 · 명왕성을 더한 간주 공허 수다.
 * 연결 규칙(블랙홀 · 안드로메다)은 passiveRouting이, 줄 배율(태양 · 암흑물질 · 초신성)은 passiveRouting.voidStats가 맡는다. */
const TRANSCENDENT_VOID_STAT_LINES = Object.freeze({
    paleBlueDot: tr => [['passivePoint', tr.value || 10]],
    overflowingVigor: (tr, ctx) => [['pctHp', tr.value * ctx.voidCount]],
    toughSoul: (tr, ctx) => [['energyShieldPct', tr.value * ctx.voidCount]],
    defenseMechanism: tr => [['blockChance', tr.value], ['blockChanceMax', tr.value]],
    blurredPresence: tr => [['deflectChance', tr.value], ['deflectDamageReduce', tr.value2]],
    innateTalent: tr => [['doubleDamageChance', tr.value], ['doubleDamageMultiplierPct', Math.max(0, ((tr.value2 || 1.5) - 1) * 100)]],
    wholehearted: (tr, ctx) => [['pctDmg', tr.value * ctx.voidCount]],
    impatience: (tr, ctx) => [['move', tr.value * ctx.voidCount]],
    immortalHero: tr => [['flatHp', Math.max(0, tr.value)]],
    seasoned: (tr, ctx) => [['critDmg', tr.value * ctx.loopCount]],
    resonantStar: tr => [['suppCap', tr.value]],
    comet: tr => [['move', tr.value]],
    zeroGravity: tr => [['evasionPct', tr.value]],
    satellite: tr => [['aspd', tr.value]],
    asteroidBelt: (tr, ctx) => [['pctDmg', tr.value * ctx.allocatedWithin(TRANSCENDENT_ASTEROID_RADIUS)]]
});


safeExposeGlobals({ getOceanFishingStrategyDef, getOceanFishCollectionProgress, getOceanFishCollectionBonus, setOceanFishingStrategy, setOceanAutoRedive, claimOceanFishCollectionMilestone });


/** 자동 재잠수로 들어간 잠수가 이어지고 있는가(쓰러지면 그 잠수가 끝난다: js/combat-enemy-turn.js defeatInOceanDive). */
const isAutoOceanDive = st => !!st.diving && st.autoDive === true;
/** 자동 재잠수가 멈췄는가: 자동 잠수에서 무리에게 쓰러졌거나 소득 없이 떠오른 잠수가 한도에 닿았다(손으로 잠수하면 풀린다). */
const isOceanAutoRediveHalted = st => st.lastSurfaceReason === 'defeat' || st.fruitlessDives >= OCEAN_AUTO_REDIVE.missLimit;


// The stats of each category come from its tag rule (data/affix-tags.js AFFIX_TAG_LISTS.sea).
const OCEAN_MOD_CATEGORY_RULES = [['공격', 'attack'], ['방어/생명', 'defense'], ['속도/치명', 'speed'], ['저항', 'resistance']]
    .map(([category, key]) => ({ category, ids: resolveAffixTagList(AFFIX_TAG_LISTS.sea[key], MOD_DB) }));
const OCEAN_WORKBENCH_OPTIONS = [
    { id: 'oceanBossSlayer', label: '심연의 보스 학살', desc: '보스에게 가하는 피해가 증가합니다. (일반 옵션으로는 등장하지 않는 전용 스탯)', statId: 'bossDamagePct', min: 18, max: 28 },
    { id: 'oceanEliteHunter', label: '심연의 정예 사냥', desc: '정예 몬스터에게 가하는 피해가 증가합니다.', statId: 'eliteDamagePct', min: 16, max: 24 },
    { id: 'oceanFirstStrike', label: '심연의 선제 일격', desc: '생명력이 가득 찬 적에게 가하는 첫 타에 추가 피해를 줍니다.', statId: 'firstStrikeDamagePct', min: 20, max: 30 },
    { id: 'oceanCuller', label: '심연의 처형자', desc: '생명력이 일정 % 이하인 보스가 아닌 적을 즉시 처치합니다.', statId: 'cullStrikePct', min: 6, max: 10 },
    { id: 'oceanLeviathanCrown', label: '리바이어던의 권능', desc: '보스 처치 피해를 가장 높게 보장하는 최상위 전용 옵션입니다.', statId: 'bossDamagePct', min: 32, max: 42 }
];

const SEA_GIFT_RANDOM_ORB_KEYS = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'emberBranch', 'pruningShears'];
const SEA_GIFT_RECIPES = [
    // --- 일반 레시피 ---
    { id: 'reefBundle', desc: '【재화 획득: 암초 조각 ×2】 얕은 바다 어종을 모아 암초 조각으로 가공합니다.', requires: { shallowSilverfin: 5 }, effect: { type: 'currency', key: 'reefFragment', amount: 2 } },
    { id: 'tidalCharm', desc: '【재화 획득: 심해의 파편 ×1】 조류 장어로 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 교체하는 심해의 파편을 만듭니다.', requires: { tidalEel: 4 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 1 } },
    { id: 'glowfinEssence', desc: '【재화 획득: 심해의 파편 ×2】 발광 송어로 봉인되지 않은 무작위 추가 옵션 1줄의 종류와 수치를 교체하는 심해의 파편을 정제합니다.', requires: { glowfinTrout: 3, tidalEel: 2 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 2 } },
    { id: 'purifyingOffering', desc: '【장비 강화: 계열 재굴림 1줄】 발광 송어를 바쳐 원하는 계열의 기존 옵션 한 줄만 다시 굴립니다(다른 줄 보존, 등급 보정 없음).', requires: { glowfinTrout: 4, shallowSilverfin: 3 }, effect: { type: 'taggedReroll' } },
    { id: 'abyssalGift', desc: '【장비 강화: 확정 옵션 부여】 심연 등불고기를 제물로 바쳐 장비에 옵션 한 줄을 확정으로 부여합니다.', requires: { abyssAngler: 4, tidalEel: 3 }, effect: { type: 'guaranteedMod' } },
    // --- 무작위 제작 재화 레시피 (SEA_GIFT_RANDOM_ORB_KEYS: 마법의 새싹, 수액 봉오리, 형체 없는 이슬, 황금률, 축복의 꽃잎, 잿불가지, 전정 가위 중 1개) ---
    { id: 'tidalFortune', desc: '【재화 획득: 무작위 제작 재화 ×1】 조류 장어와 은빛 비늘치 더미에서 흘러나온 마력을 정제해 무작위 제작 재화 1개를 얻습니다.', requires: { tidalEel: 3, shallowSilverfin: 3 }, effect: { type: 'randomCurrency', amount: 1 } },
    { id: 'glowingFortune', desc: '【재화 획득: 무작위 제작 재화 ×1】 발광 송어의 빛을 응축해 무작위 제작 재화 1개를 얻습니다.', requires: { glowfinTrout: 3, tidalEel: 2 }, effect: { type: 'randomCurrency', amount: 1 } },
    { id: 'abyssalCache', desc: '【재화 획득: 무작위 제작 재화 ×2】 심연 등불고기와 발광 송어로 봉인된 보물함을 열어 무작위 제작 재화 2개를 얻습니다.', requires: { abyssAngler: 2, glowfinTrout: 2 }, effect: { type: 'randomCurrency', amount: 2 } },
    { id: 'tidelordCache', desc: '【재화 획득: 무작위 제작 재화 ×2】 해류군주 비단잉어의 비늘로 만든 함에서 무작위 제작 재화 2개를 얻습니다.', requires: { tidelordKoi: 1, abyssAngler: 2, shallowSilverfin: 4 }, effect: { type: 'randomCurrency', amount: 2 } },
    { id: 'leviathanCache', desc: '【재화 획득: 무작위 제작 재화 ×3】 리바이어던 본체와 무지갯빛 공포의 잔재로 채워진 최상급 보물함에서 무작위 제작 재화 3개를 얻습니다.', requires: { kingLeviathan: 1, prismaticHorror: 1, abyssAngler: 2 }, effect: { type: 'randomCurrency', amount: 3 } },
    // --- 장비 옵션 가공 효과 (제련/옵션 조작 계열) ---
    { id: 'safeReroll', desc: '【장비 강화: 하락 없는 안전 재굴림】 발광 송어와 은빛 비늘치로 옵션 1줄을 다시 굴립니다. 결과가 기존보다 낮으면 적용되지 않고 원래 값이 유지됩니다.', requires: { glowfinTrout: 3, shallowSilverfin: 4 }, effect: { type: 'safeReroll' } },
    { id: 'twinCurrentReroll', desc: '【장비 강화: 무작위 옵션 2줄 수치 재굴림】 심연 등불고기와 조류 장어로 무작위로 고른 옵션 두 줄의 수치만 같은 등급 안에서 다시 굴립니다(옵션 종류와 나머지 줄은 그대로).', requires: { abyssAngler: 3, tidalEel: 4 }, effect: { type: 'twinReroll' } },
    { id: 'tierStepUp', desc: '【장비 강화: 옵션 1줄 등급 +1 영구 재굴림】 심연 등불고기와 발광 송어로 무작위 옵션 1줄을 한 단계 높은 등급으로 다시 굴립니다(영구 적용).', requires: { abyssAngler: 3, glowfinTrout: 3 }, effect: { type: 'tierStepUp' } },
    { id: 'categoryShift', desc: '【장비 강화: 무작위 옵션 1줄을 원하는 계열로 변환】 발광 송어와 조류 장어로 무작위 옵션 한 줄을 선택한 계열의 옵션으로 바꿉니다.', requires: { glowfinTrout: 3, tidalEel: 3 }, effect: { type: 'convertCategoryMod' } },
    { id: 'echoMod', desc: '【장비 강화: 최고 티어 옵션을 50% 효과로 메아리】 전설의 새끼 괴어와 심연 등불고기로 가장 높은 티어의 옵션 중 한 줄을 무작위로 골라, 나머지 옵션 중 무작위 한 줄을 그 옵션의 50% 효과로 덮어씁니다.', requires: { voidLeviathanSpawn: 1, abyssAngler: 3 }, effect: { type: 'echoMod' } },
    // --- 초강력 레시피 (초희귀 어종 필요) ---
    { id: 'sealOffering', desc: '【장비 강화: 옵션 1줄 영구 봉인】 해류군주 비단잉어와 발광 송어로 옵션 한 줄을 영구히 봉인합니다.', requires: { tidelordKoi: 1, glowfinTrout: 3 }, effect: { type: 'lockMod', count: 1 } },
    { id: 'leviathanBoon', desc: '【장비 강화: 최상급 태그 옵션 확정(등급 +2)】 전설의 새끼 괴어와 심연 등불고기, 조류 장어로 최상급 태그 옵션을 확정 부여합니다.', requires: { voidLeviathanSpawn: 2, abyssAngler: 2, tidalEel: 3 }, effect: { type: 'guaranteedTaggedMod', tierBoost: 2 } },
    { id: 'tidelordRefine', desc: '【장비 강화: 계열 재굴림(등급 +1)】 해류군주 비단잉어와 발광 송어로 원하는 계열의 기존 옵션만 다시 굴립니다(다른 줄 보존).', requires: { tidelordKoi: 2, glowfinTrout: 3 }, effect: { type: 'taggedReroll', tierBoost: 1, allMatching: true } },
    { id: 'crushDepthScar', desc: '【장비 강화: 심해 전용 고정 옵션 부착】 무지갯빛 공포와 해류군주 비단잉어, 심연 등불고기로 심해 전용 고정 옵션을 부착합니다(자리가 없으면 가장 낮은 줄을 바꿉니다).', requires: { prismaticHorror: 2, tidelordKoi: 1, abyssAngler: 2 }, effect: { type: 'fixedBenchOption' } },
    { id: 'doubleSealForge', desc: '【장비 강화: 옵션 2줄 동시 영구 봉인 + 나머지 1줄 즉시 재단】 무지갯빛 공포와 발광 송어로 옵션 두 줄을 동시에 봉인하고, 남은 줄은 즉시 재단합니다.', requires: { prismaticHorror: 3, glowfinTrout: 4 }, effect: { type: 'lockMod', count: 2, bonusTaggedReroll: true } },
    { id: 'voidPureRefine', desc: '【장비 강화: 강제 희귀 등급 승급】 무지갯빛 공포와 공허 리바이어던 새끼, 은빛 비늘치로 장비를 강제로 희귀 등급으로 승급시킵니다.', requires: { prismaticHorror: 2, voidLeviathanSpawn: 1, shallowSilverfin: 5 }, effect: { type: 'upgradeRarity', force: true } },
    { id: 'leviathanRemnant', desc: '【장비 강화: 최상급 태그 옵션 확정(등급 +3) + 나쁜 옵션 1줄 무료 제거】 리바이어던 본체와 심연 등불고기로 최상급 태그 옵션을 확정 부여하며, 동시에 나쁜 줄 하나를 무료로 제거합니다.', requires: { kingLeviathan: 1, abyssAngler: 3 }, effect: { type: 'guaranteedTaggedMod', tierBoost: 3, bonusRemoveMod: true } },
    { id: 'leviathanSigil', desc: '【장비 강화: 이 레시피 전용 최상위 고정 옵션 부착】 리바이어던 본체와 해류군주 비단잉어, 공허 리바이어던 새끼로 오직 이 레시피로만 얻는 최상위 고정 옵션을 부착합니다(자리가 없으면 가장 낮은 줄을 바꿉니다).', requires: { kingLeviathan: 2, tidelordKoi: 2, voidLeviathanSpawn: 1 }, effect: { type: 'fixedBenchOption', topTier: true } }
];
const SEA_GIFT_ITEM_EFFECT_TYPES = new Set(['guaranteedMod', 'guaranteedTaggedMod', 'removeMod', 'upgradeRarity', 'lockMod', 'taggedReroll', 'fixedBenchOption', 'safeReroll', 'twinReroll', 'tierStepUp', 'convertCategoryMod', 'echoMod']);

const { getSeaGiftRecipeStatus, craftSeaGift } = (() => {
    /** Equipment always advances one visible result; currency batches are bounded and fully funded before any roll. */
    function quantityOf(recipe, stock, count) {
        const batchLimit = ['currency', 'randomCurrency'].includes(recipe.effect.type) ? 100 : 1;
        const maxCrafts = Math.min(batchLimit, ...Object.entries(recipe.requires).map(([key, need]) => Math.floor((stock[key] || 0) / need)));
        const valid = Number.isInteger(count) && count >= 1 && count <= batchLimit;
        return { count, batchLimit, maxCrafts, valid, materialReady: valid && maxCrafts >= count };
    }
    function getSeaGiftRecipeStatus(recipeId, targetItem, category, count = 1) {
        const recipe = SEA_GIFT_RECIPES.find(r => r.id === recipeId);
        if (!recipe) return null;
        const st = ensureOceanState(), quantity = quantityOf(recipe, st.fishStock, count);
        const needsItem = SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type);
        const item = needsItem ? (targetItem || getSelectedCraftItem()) : null;
        let reason = '';
        if (!quantity.valid) reason = '제작 횟수를 확인하세요.';
        else if (!st.unlocked) reason = '심해 해금 필요';
        else if (!quantity.materialReady) reason = '재료 부족';
        else if (needsItem) reason = getSeaGiftTargetBlockReason(item) || getSeaGiftEffectBlockReason(item, recipe.effect, category);
        return { recipe, ready: !reason, ...quantity, reason, item, owned: st.fishStock };
    }
    function applyEffect(status, options) {
        let effect = status.recipe.effect;
        if (status.count > 1) effect = { ...effect, amount: effect.amount * status.count };
        const craft = { category: options?.category, options, say: addLog };
        const apply = Object.hasOwn(SEA_GIFT_EFFECTS, effect.type) ? SEA_GIFT_EFFECTS[effect.type] : null;
        if (!apply) return refuseSeaGift(craft, '이 제작법을 적용할 수 없습니다.');
        return apply(status.item, effect, craft) !== false;
    }
    /** Resolve the whole request before effects, then charge exactly the approved quantity and queue one save. */
    function craftSeaGift(recipeId, targetItem, options) {
        const status = getSeaGiftRecipeStatus(recipeId, targetItem, options?.category, options?.count);
        if (!status) return false;
        if (!status.ready) { addLog(_t('바다의 선물: {reason}', { reason: status.reason }), 'attack-monster'); return false; }
        const st = ensureOceanState(), recipe = status.recipe;
        if (!applyEffect(status, options)) return false;
        Object.keys(recipe.requires).forEach(key => { st.fishStock[key] = Math.max(0, Math.floor(st.fishStock[key] || 0) - recipe.requires[key] * status.count); });
        addLog(_t('🎁 바다의 선물 {count}회 제작', { count: status.count }), 'loot-rare');
        if (status.item && typeof normalizeItem === 'function') normalizeItem(status.item);
        queueImportantSave(200);
        return true;
    }
    return { getSeaGiftRecipeStatus, craftSeaGift };
})();
safeExposeGlobals({ getSeaGiftRecipeStatus, craftSeaGift });

/** '' when the item can take a line of the category picked on the card (none picked: any), else a short label. */
const getSeaGiftCategoryBlockReason = (item, category) => (!category || getAvailableMods(item).some(mod => getModCategory(mod) === category) ? '' : _t('{category} 옵션 없음', { category }));
const getSeaGiftEchoBlockReason = item => {
    if ((item.stats || []).some(s => s && s.isEchoMod)) return '메아리 줄 있음';
    const editable = getSeaGiftEditableIndexes(item);
    if (editable.length < 2) return '봉인 안 된 2줄 필요';
    return getSeaGiftEchoTargets(item, editable).length ? '' : '메아리 줄을 넣을 같은 종류 자리 없음';
};
const getSeaGiftLockBlockReason = (item, effect) => {
    const editable = getSeaGiftEditableIndexes(item).length;
    const required = Math.max(1, Math.floor(effect.count || 1)) + (effect.bonusTaggedReroll ? 1 : 0);
    if (editable >= required) return '';
    return editable === 0 ? '봉인할 줄 없음' : _t('봉인 안 된 {required}줄 필요', { required });
};
/** A guaranteed line needs a place (room to add it, else an unsealed line to swap) and, with the free removal, a line to remove
 * besides the one it swaps. */
const getSeaGiftGuaranteedBlockReason = (item, effect, category) => {
    const editable = getSeaGiftEditableIndexes(item).map(index => ({ stat: item.stats[index], index }));
    if (!canAddSeaGiftLine(item, editable.length) && !editable.length) return '바꿀 줄 없음';
    const pool = getAvailableMods(item).filter(mod => !category || getModCategory(mod) === category);
    if (chooseSeaGiftGuaranteedLine(item, pool, editable, effect, true)) return '';
    return effect.bonusRemoveMod ? '새 옵션과 별도로 지울 줄 없음' : '새 옵션을 넣을 자리 없음';
};
/** Each effect's blocker on an item (the refusals that come before any roll; category: the one picked on the card). */
const SEA_GIFT_EFFECT_BLOCKERS = Object.freeze({
    guaranteedMod: getSeaGiftGuaranteedBlockReason,
    guaranteedTaggedMod: (item, effect, category) => getSeaGiftCategoryBlockReason(item, category) || getSeaGiftGuaranteedBlockReason(item, effect, category),
    removeMod: item => (getSeaGiftEditableIndexes(item).length ? '' : '지울 줄 없음'),
    upgradeRarity: item => (item.rarity === 'rare' || item.rarity === 'unique' ? '이미 희귀 이상' : ''),
    lockMod: (item, effect, category) => {
        const reason = getSeaGiftLockBlockReason(item, effect);
        if (reason || !effect.bonusTaggedReroll) return reason;
        const categoryReason = getSeaGiftCategoryBlockReason(item, category);
        if (categoryReason) return categoryReason;
        const editable = getSeaGiftEditableIndexes(item), count = Math.max(1, Math.floor(effect.count || 1));
        return getOpenAffixMods(item, item.rarity, item.stats[editable[count]])
            .some(mod => !category || getModCategory(mod) === category) ? '' : '해당 계열로 재단할 자리 없음';
    },
    taggedReroll: (item, effect, category) => (getSeaGiftRerollRows(item, category).length ? '' : _t('{category} 줄 없음', { category: category || _t('굴릴') })),
    safeReroll: item => (getSeaGiftRerollRows(item).length ? '' : '굴릴 줄 없음'),
    twinReroll: item => (getSeaGiftRerollRows(item).length ? '' : '굴릴 줄 없음'),
    tierStepUp: item => (getSeaGiftTierStepRows(item).length ? '' : '올릴 줄 없음'),
    echoMod: getSeaGiftEchoBlockReason,
    fixedBenchOption: item => (getSeaGiftBenchSlot(item) === null ? '바꿀 줄 없음' : ''),
    convertCategoryMod: (item, effect, category) => {
        const editable = getSeaGiftEditableIndexes(item);
        if (!editable.length) return '바꿀 줄 없음';
        const pool = getAvailableMods(item).filter(mod => !category || getModCategory(mod) === category);
        return equipmentCrafting.pickReplacement(item, pool, editable, null, 'all').length ? '' : '해당 계열로 변환할 자리 없음';
    }
});


/** Whether a guaranteed line is added rather than swapped in: a magic or rare item below its cap, and normal gear (no prefix and suffix
 * rule) only while it has no unsealed line, as before 2026-10-19 (adding there gathered six lines on a white item). */
const canAddSeaGiftLine = (item, editableCount) => (EXPLICIT_AFFIX_RULES[item.rarity] ? getItemExplicitOptionCount(item) < getSeaGiftLineCap(item) : editableCount === 0);


const applySeaGiftLockEffect = function (item, effect, category) {
    let editable = (item.stats || []).filter(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    let count = Math.max(1, Math.floor(effect.count || 1));
    let rerollMod = null;
    if (effect.bonusTaggedReroll) {
        // 재단되는 줄은 봉인하고 남은 첫 줄(editable[count]). 새 줄은 그 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서.
        let pool = getOpenAffixMods(item, item.rarity, editable[count]).filter(mod => !category || getModCategory(mod) === category);
        rerollMod = pickRandomMods(pool, 1)[0];
        if (!rerollMod) { addLog(_t('해당 계열로 재단할 수 있는 옵션이 없습니다.'), 'attack-monster'); return false; }
    }
    for (let i = 0; i < count; i++) editable[i].lockedByHoney = true;
    if (!rerollMod) return true;
    let idx = (item.stats || []).findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    item.stats[idx] = rollAffixValue(rerollMod, getItemCraftTier(item));
    return true;
};


/** Each sea gift effect on the item (craft: the chosen category, the options, the log); false refuses. */
const SEA_GIFT_EFFECTS = Object.freeze({
    guaranteedMod: applySeaGiftGuaranteedEffect,
    guaranteedTaggedMod: applySeaGiftGuaranteedEffect,
    removeMod: item => {
        removeOneModFromItem(item);
        updateItemName(item);
    },
    upgradeRarity: (item, effect) => {
        if (effect.force) {
            item.rarity = 'rare';
            fillSeaGiftRareLines(item);
        }
        else if (item.rarity === 'normal') item.rarity = 'magic';
        else if (item.rarity === 'magic') item.rarity = 'rare';
        updateItemName(item);
    },
    lockMod: (item, effect, craft) => !!applySeaGiftLockEffect(item, effect, craft.category),
    taggedReroll: (item, effect, craft) => {
        let rows = getSeaGiftRerollRows(item, craft.category);
        if (rows.length === 0) return refuseSeaGift(craft, '해당 계열의 재굴림 가능한 옵션 줄이 없습니다.');
        let targets = effect.allMatching ? rows : [rows[Math.floor(Math.random() * rows.length)]];
        targets.forEach(row => { item.stats[row.index] = rollSeaGiftExistingAffix(row, effect.tierBoost); });
        updateItemName(item);
    },
    fixedBenchOption: applySeaGiftBenchOption,
    currency: (item, effect) => { awardCurrency(effect.key, effect.amount || 1); },
    randomCurrency: (item, effect, craft) => {
        let count = Math.max(1, Math.floor(effect.amount || 1));
        const gains = new Map();
        for (let i = 0; i < count; i++) {
            let key = SEA_GIFT_RANDOM_ORB_KEYS[Math.floor(Math.random() * SEA_GIFT_RANDOM_ORB_KEYS.length)];
            awardCurrency(key, 1);
            gains.set(key, (gains.get(key) || 0) + 1);
        }
        gains.forEach((amount, key) => craft.say(`🎲 ${(ORB_DB[key] || {}).name || key} +${amount}`, 'loot-rare'));
    },
    safeReroll: (item, effect, craft) => {
        let rows = getSeaGiftRerollRows(item);
        let row = rows[Math.floor(Math.random() * rows.length)];
        let rolled = rollSeaGiftExistingAffix(row, 0);
        const oldParts = [row.stat, ...(row.stat.extraStats || [])], newParts = [rolled, ...(rolled.extraStats || [])];
        const noDecrease = oldParts.length === newParts.length && oldParts.every((part, index) =>
            newParts[index].id === part.id && Number(newParts[index].val) >= Number(part.val));
        if (noDecrease) item.stats[row.index] = rolled;
        else craft.say('🌊 재굴림 결과가 기존보다 낮아 적용을 취소했습니다.', 'loot-magic');
        updateItemName(item);
    },
    twinReroll: item => {
        let rows = getSeaGiftRerollRows(item);
        rows.sort(() => Math.random() - 0.5).slice(0, 2)
            .forEach(row => { item.stats[row.index] = rollSeaGiftExistingAffix(row, 0); });
        updateItemName(item);
    },
    tierStepUp: item => {
        let rows = getSeaGiftTierStepRows(item);
        let row = rows[Math.floor(Math.random() * rows.length)];
        item.stats[row.index] = rollSeaGiftExistingAffix(row, 1);
        updateItemName(item);
    },
    echoMod: applySeaGiftEcho,
    convertCategoryMod: (item, effect, craft) => {
        let editableIdx = getSeaGiftEditableIndexes(item);
        let pool = getAvailableMods(item).filter(mod => !craft.category || getModCategory(mod) === craft.category);
        let choice = equipmentCrafting.pickReplacement(item, pool, editableIdx, pickWeightedMod);
        if (!choice) return refuseSeaGift(craft, '해당 계열로 변환할 수 있는 옵션이 없습니다.');
        item.stats[choice.index] = rollAffixValue(choice.mod, getItemCraftTier(item));
        updateItemName(item);
    }
});

safeExposeGlobals({ isSeaGiftEquipmentTarget, getSelectedSeaGiftEquipmentTarget, getOceanShallowLiftM });


const PASSIVE_TREE_PRESET_SLOTS = 3;


safeExposeGlobals({
    getCurrentPassiveNodeId, migratePassiveNodeIdList, migratePassiveNodeIdRecord,
    normalizePassiveTreePlannerState, ensurePassiveTreePlannerState, saveCurrentPassiveTreePreset,
    setActivePassiveTreePreset, setPassiveTreeAutoInvest, encodePassiveTreePreset,
    importPassiveTreePreset, runPassiveTreeAutoInvest, getPassiveTreeRootNodeId, getPassiveTreeRootNode,
    rebasePassiveTreeForClassChange, normalizePassiveSpecializationState, ensurePassiveSpecializationState,
    getPassiveTreeAdjacency, isPassiveTreeEdgeAvailable, getAllocatedPassiveStatValue, setPassiveRevelation,
    hasAuthoredPassiveKeystone, findAllocatedPassiveKeystone,
    getMystiqueAffinity, recordPassiveCycleAilmentStart, recordPassiveCycleAilmentEnd, getActivePassiveCycleBuffEffects,
    recordPassiveFanaticSkillUse, recordPassiveKarmaLoss, beginPassiveKarmaAttack,
    getPassiveAshuraAilmentChance, getPassiveAshuraDamageMultiplier, applyPassiveAshuraDamageBreakdown,
    applyAuthoredPassiveStatRules, getPassiveConstellationAwakeningProgress, unlockPassiveStarEvolution
});


game = JSON.parse(JSON.stringify(defaultGame));
window.GameState.game = game;
let pTimer = 0;
let progressStallTicks = 0;
let itemIdCounter = 0;
let lastTime = Date.now();
let gameTickHandle = null;
let autoSaveHandle = null;
let autoSaveIdleHandle = null;
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
    adjacency: new Map(),
    hoverPath: null,
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
let battleFxSuppressed = false;
const BATTLE_FX_QUEUE_CAP = 160;
let battleVisualState = createBattleVisualState();
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
    1: { id: 'basic_slash', motion: 'slash' },
    2: { id: 'heavy_smash', motion: 'slash' },
    3: { id: 'dagger_throw', motion: 'throw' },
    4: { id: 'bow_shot', motion: 'bow' },
    5: { id: 'spear_thrust', motion: 'throw' },
    6: { id: 'staff_cast', motion: 'cast' },
    7: { id: 'scythe_swing', motion: 'slash' },
    8: { id: 'magic_cast', motion: 'cast' }
};
let crowdPauseActive = false;
let activeTutorial = null;
let activeTutorialStep = 0;
let activeRewardZoneId = null;
let latestPlayerSwingImpactAt = 0;
let pendingRingEquipItemId = null;
let pendingGloveEquipItemId = null;
let pendingWeaponEquipItemId = null;
let deathOverlayActive = false;
let activeDeathLog = null;
let deathLogView = 'element';
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
const battleImageCanvasCache = new WeakMap();
const TAB_UNLOCK_GATES = {
    'tab-unlocks': 'season',
    'tab-char': 'char',
    'tab-season': 'season',
    'tab-items': 'items',
    'tab-skills': 'skills',
    'tab-codex': 'codex',
    'tab-map': 'map',
    'tab-traits': 'traits',
    'tab-talent': 'talent',
    'tab-stump': 'stump'
};
const MOBILE_BATTLE_BREAKPOINT = 1080;
let battleTabDocked = false;
const ENEMY_CROWD_PAUSE_LIMIT = 20;
const DOT_STACK_MAX = 10;
const DOT_STACK_GROWTH_PER_STACK = 0.10;
const DOT_TICK_INTERVAL = 0.2;
const DOT_EFFECT_DURATION = 2.4;
const DOT_TICK_FROM_HIT_RATIO = 0.06;


document.addEventListener('mousemove', function(e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (activeTooltipId) {
        let el = document.getElementById(activeTooltipId);
        if (el && el.style.display !== 'none') positionTooltipElement(el, mouseX, mouseY);
    }
});


// Fast combat keeps ordinary critical hits flowing; only heavy hits and finishing blows briefly hold the frame.
const BATTLE_FEEDBACK_PROFILES = Object.freeze({
    normal: Object.freeze({ hitStopMs: 0, shake: 0, duration: 110 }),
    crit: Object.freeze({ hitStopMs: 0, shake: 3, duration: 170 }),
    heavy: Object.freeze({ hitStopMs: 28, shake: 5.4, duration: 220 }),
    annihilate: Object.freeze({ hitStopMs: 20, shake: 4.2, duration: 180 }),
    // 보스 범위기가 땅에 닿는 순간(2026-10-06, js/canvas-boss-attacks.js): 피했어도 화면이 울린다. 맞으면 playerHit가 더한다.
    bossSlam: Object.freeze({ hitStopMs: 0, shake: 4.6, duration: 320 })
});
// 피격감(2026-10-04): getting hit answers in proportion to the life it took (damageRatio against the hero's life, set in
// combat.js). Chip hits shake a little; from an eighth of life the frame also holds, like a heavy blow on an enemy.
const PLAYER_HURT_FEEDBACK = Object.freeze({ shakeMin: 0.8, shakePerLife: 16, shakeMax: 5, heavyRatio: 0.125, hitStopMs: 45, duration: 240 });


/** 사라진 몬스터의 마지막 자리를 들고 있는 시간(ms): 보스는 쓰러짐 효과(1.6초, 다시 일어나는 보스는 data/stage-story-art.js revives의
 * total, js/combat.js)가 끝날 때까지 그 자리에 그린다. */
const enemyGhostKeepMs = ghost => (ghost && ghost.enemy && ghost.enemy.isBoss
    ? (STAGE_STORY_ART.revives[ghost.enemy.bossAssetKey]?.total || 1600) + 400 : 1200);

function addBattleFx(type, data) {
    if (battleFxSuppressed || (typeof document !== 'undefined' && document.hidden)) return;
    let payload = data || {};
    let wallNow = performance.now();
    let now = battleVisualState
        && Number.isFinite(battleVisualState.visualNow)
        && battleVisualState.visualNow > 0
        && wallNow - (battleVisualState.lastWallNow || 0) < 250
        ? battleVisualState.visualNow
        : wallNow;
    if (type === 'playerSwing') {
        let requestedDelay = Number(payload.impactDelayMs);
        let delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : (payload.projectile ? 260 : 205);
        latestPlayerSwingImpactAt = now + delay;
        payload = { ...payload, impactAt: latestPlayerSwingImpactAt, motionVariantSeed: Math.random(), tailMs: getPlayerSwingTailMs() };
    }
    if (type === 'combatTravel' && payload.patternKind === 'field' && payload.skillName === '난타 눈보라') {
        battleFx = battleFx.filter(fx => !(fx && fx.type === type
            && fx.patternKind === payload.patternKind && fx.skillName === payload.skillName));
    }
    payload = withFrostErosionSprite(type, payload);
    if (type === 'statusText' && payload.dedupeKey) {
        let dedupeWindowMs = Math.max(0, Number(payload.dedupeWindowMs) || 900);
        let duplicate = [...battleFx].reverse().find(fx => fx && fx.type === type
            && fx.dedupeKey === payload.dedupeKey && now - (Number(fx.queuedAt) || 0) <= dedupeWindowMs);
        if (duplicate) return;
    }
    if (type === 'hit' && mergePendingBattleHitFx(payload, now)) return;
    let start = getBattleFxStart(type, payload, now);
    battleFx.push({
        id: ++battleFxId,
        type: type,
        start: start,
        queuedAt: now,
        duration: payload.duration || 260,
        ...getBattleHitFeedback(payload),
        ...payload
    });
    let queueCap = getCurrentBattleFxQueueCap();
    if (battleFx.length > queueCap) battleFx.splice(0, battleFx.length - queueCap);
}


if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => setBattleFxSuppressed(!!document.hidden));
}
safeExposeGlobals({ setBattleFxSuppressed });


/** 휘두름 기록(playerSwing)이 준비 시간(duration) 뒤에도 남는 시간(tailMs): 전달본 그림(data/stage-characters.js)의 타격 장이 있는 클립 가운데
 * 첫 장을 뺀 가장 긴 것. 주인공 그림은 타격 장 뒤의 장(되돌리기)을 타격 뒤에 그림 속도 이하로 그리고 타격 장은 1장 이상이라(js/canvas-stage-actors.js
 * attackPose) 되돌리기가 이보다 길 수 없다. 기록이 duration에서 지워지던 동안 되돌리기는 어느 직업과 무기에서도 안 나왔고, 타격 장이 2장인
 * 연금술사 활 공격은 기본 공격에서 두 장만 보였다(2026-11-09 사용자). 그림은 제 길이에서 끝나므로 기록만 더 남는다. */
let playerSwingTailMs = null;
const DAMAGE_NUMBER_FORMATS = ['comma', 'korean', 'korean_short', 'english'];


const MAX_BATTLE_DAMAGE_TEXTS = 48;

/** Repeated identical judgments share their existing visible lifetime; they never become a number or renew their stay. */
mergeDamageTextByKey.bodyCue = function (activeTexts, config, start, x, y) {
    if (!config.aggregateKey || !config.bodyCue || !config.miss || typeof config.value !== 'string') return false;
    const text = activeTexts.find(row => row && row.bodyCue && row.miss && row.aggregateKey === config.aggregateKey
        && row.value === config.value && row.color === (config.color || '')
        && start >= row.start && start - row.start <= row.duration);
    if (!text) return false;
    text.x = x;
    text.y = y;
    return true;
};


/** Display-only hit translation; actual damage and FX throttling remain with combat. */
spawnDamageText.fromHit = function (fx, x, y, start) {
    spawnDamageText({
        start, x, y,
        value: Number.isFinite(Number(fx.rawDamage)) ? Number(fx.rawDamage) : fx.damage,
        crit: !!fx.crit, dot: !!fx.dot, dotType: fx.element || '',
        impactTier: fx.impactTier || 'normal', damageRatio: fx.damageRatio || 0,
        // Direct hits retain their skill bucket; DoT sums use the first label's visual time.
        aggregateKey: fx.dot ? `dot:${fx.enemyId}:${fx.element || ''}`
            : `${fx.skillName}:${fx.enemyId}:${Math.floor(fx.start / 250)}`
    });
};


/** Keep each hit's body-centred x anchor. New labels reserve their actual glyph/pop/count bounds; older overlapping labels
 * rise only as far as needed. A label keeps its lift until it expires, so removing a neighbour never makes it jump down.
 * All categories share this layout, including incoming damage and block/evade cues. No combat or saved state is changed. */
drawDamageTexts.paint = (() => {
    const MAX_LIFT = 207, GAP = 3;
    // 크기는 갈무리11 Bold의 제 크기만 쓴다: 사이 크기(16 ~ 32px)는 도트가 번졌다(2026-10-21). 보통 숫자와 회피 같은 글은 12px, 최대 타격만
    // 24px이다(휴대폰 2026-10-22, PC와 스팀 덱 2026-10-26 사용자: 24px 숫자 여럿이 쌓여 주인공과 몬스터를 덮었다). 치명타와 큰 타격은 색, 빛,
    // 튀는 크기로 구별한다.
    function font(text) {
        return `800 ${text.impactTier === 'annihilate' ? 24 : 12}px "Galmuri11", "Malgun Gothic", sans-serif`;
    }
    function appearance(text, t) {
        const align = text.side > 0 ? 'left' : (text.side < 0 ? 'right' : 'center');
        const pop = isStrongDamageText(text) ? 1 + 0.38 * (1 - clampNumber(t / 0.16, 0, 1)) : 1;
        const label = text.miss ? String(text.value) : getDamageTextLabel(text);
        return { font: font(text), align, pop, label };
    }
    // 글자 크기: 같은 글꼴, 정렬, 글자가 매 프레임 되풀이된다(2026-10-25 측정: 초당 267번 재는데 서로 다른 것은 열 가지쯤). 잰 크기만
    // 기억하고, 글꼴이 늦게 들어오면(document.fonts loadingdone) 다시 잰다.
    const sizes = new Map();
    if (typeof document === 'object' && document.fonts && document.fonts.addEventListener) document.fonts.addEventListener('loadingdone', () => sizes.clear());
    function textSize(ctx, label) {
        const key = `${ctx.font}|${ctx.textAlign}|${label}`;
        let size = sizes.get(key);
        if (!size) {
            const m = ctx.measureText(label);
            size = { left: m.actualBoundingBoxLeft, right: m.actualBoundingBoxRight, ascent: m.actualBoundingBoxAscent, descent: m.actualBoundingBoxDescent, width: m.width };
            if (sizes.size >= 512) sizes.clear();
            sizes.set(key, size);
        }
        return size;
    }
    function measure(ctx, row) {
        const { text, pop } = row;
        ctx.font = row.font; ctx.textAlign = row.align;
        const metrics = textSize(ctx, row.label);
        const count = !text.bodyCue && !text.miss && !text.dot && text.hitCount > 1 ? _t('{floor}타', { floor: Math.floor(text.hitCount) }) : '';
        // Korean unit glyphs can overhang their advance width; leave a real gap before the hit-count suffix.
        const countX = metrics.right + GAP * 2;
        ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
        const right = Math.max(metrics.right, count ? countX + textSize(ctx, count).width : 0);
        const box = { x: text.x - (metrics.left + GAP) * pop,
            y: row.y - (metrics.ascent + GAP) * pop,
            w: (metrics.left + right + GAP * 2) * pop,
            h: (metrics.ascent + metrics.descent + GAP * 2) * pop };
        return { ...row, count, countX, box };
    }
    function frame(ctx, text, now) {
        const elapsed = now - Number(text.start);
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > text.duration) return null;
        const t = clampNumber(elapsed / text.duration, 0, 1);
        const rise = text.bodyCue ? 10 : ((text.dot ? 14 : 20) + (text.crit ? 5 : 0));
        const y = text.y - rise * (1 - Math.pow(1 - t, 2));
        return measure(ctx, { text, t, now, x: text.x, y, ...appearance(text, t) });
    }
    function place(row, taken, protectedBoxes) {
        const limit = Math.min(MAX_LIFT, Math.max(0, row.box.y - GAP));
        let lift = Math.min(limit, row.text.readabilityLift || 0);
        row.box.y -= lift;
        // Bottom to top: moving above one box cannot re-enter a box already visited. At most 48x48 checks, no search loop.
        for (const other of taken) {
            if (row.box.x >= other.x + other.w || row.box.x + row.box.w <= other.x
                || row.box.y >= other.y + other.h + GAP || row.box.y + row.box.h + GAP <= other.y) continue;
            const move = Math.min(limit - lift, row.box.y + row.box.h + GAP - other.y);
            lift += move; row.box.y -= move;
        }
        row.y -= lift;
        row.text.readabilityLift = lift;
        clearBlockedLabel(row, protectedBoxes, taken);
        taken.push(row.box);
        taken.sort((a, b) => b.y + b.h - a.y - a.h);
    }
    const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP;
    /** When there is no room above, place below the remaining obstacles; bars and labels share one ordered pass. */
    function clearBlockedLabel(row, boxes, taken) {
        if (row.box.y >= GAP && !boxes.some(box => overlaps(row.box, box)) && !taken.some(box => overlaps(row.box, box))) return;
        const edge = Math.max(0, GAP - row.box.y);
        row.y += edge; row.box.y += edge;
        for (const box of [...boxes, ...taken].sort((a, b) => a.y - b.y)) {
            if (!overlaps(row.box, box)) continue;
            const down = box.y + box.h + GAP - row.box.y;
            row.y += down; row.box.y += down;
            row.text.readabilityLift = 0;
        }
    }
    function crowdFade(row) {
        const { text, now, y } = row;
        if (text.enemyHit) return 1;
        // If obstacles force a number a full row below its body anchor, retire it without moving other rows.
        // Keep the last value for at least 350 visual ms; once fading, it cannot reappear just because the HUD moved.
        if (!text.bodyCue && !text.miss && y - text.y >= row.box.h && !Number.isFinite(text.readabilityFadeStart)) {
            text.readabilityFadeStart = Math.max(now, (text.readabilityUpdatedAt ?? text.start) + 350);
        }
        return Number.isFinite(text.readabilityFadeStart) ? clampNumber(1 - (now - text.readabilityFadeStart) / 150, 0, 1) : 1;
    }
    function paint(ctx, row) {
        const { text, t, x, y } = row;
        ctx.save();
        ctx.globalAlpha = getDamageTextPeakAlpha(text) * (t < 0.62 ? 1 : Math.max(0, (1 - t) / 0.38)) * crowdFade(row);
        ctx.font = row.font; ctx.textAlign = row.align;
        ctx.translate(x, y); ctx.scale(row.pop, row.pop); ctx.translate(-x, -y);
        const strong = isStrongDamageText(text);
        // Strokes straddle the glyph edge, so 2px reads as a 1px dark outline. Only crits and heavy hits keep a glow.
        // Even widths with square joins keep the outline on whole pixels around the pixel glyphs (2026-10-21).
        ctx.lineWidth = strong || text.impactTier === 'annihilate' ? 4 : 2;
        ctx.lineJoin = 'miter';
        ctx.strokeStyle = 'rgba(2,5,9,0.92)';
        ctx.shadowColor = text.impactTier === 'annihilate' ? 'rgba(255,155,72,.5)' : (strong ? 'rgba(255,211,102,0.38)' : 'transparent');
        ctx.shadowBlur = text.bodyCue ? 0 : (text.impactTier === 'annihilate' ? 7 : (strong ? 4 : 0));
        drawCrispCanvasText(ctx, _t(row.label), x, y, 'strokeText');
        // The fill sits inside the stroke, so the stroke pass already casts the whole glow.
        ctx.shadowBlur = 0;
        ctx.fillStyle = getDamageTextFillColor(text);
        drawCrispCanvasText(ctx, _t(row.label), x, y);
        if (row.count) {
            ctx.font = '10px "Galmuri9", "Galmuri11", "Malgun Gothic", sans-serif';
            ctx.textAlign = 'left';
            ctx.lineWidth = 2;
            drawCrispCanvasText(ctx, row.count, x + row.countX, y - 3, 'strokeText');
            ctx.fillStyle = '#c8d9e8';
            drawCrispCanvasText(ctx, row.count, x + row.countX, y - 3);
        }
        ctx.restore();
    }
    return function render(ctx, now, protectedBoxes) {
        ctx.save();
        try {
            const rows = (battleVisualState.damageTexts || []).map(text => frame(ctx, text, now)).filter(Boolean);
            const taken = [];
            const bars = [...protectedBoxes].sort((a, b) => a.y - b.y);
            // Incoming damage keeps its place before other feedback; stable sorting preserves every category's newest-first order.
            const placement = [...rows].sort((a, b) => Number(a.text.enemyHit) - Number(b.text.enemyHit));
            for (let i = placement.length - 1; i >= 0; i--) place(placement[i], taken, bars);
            rows.forEach(row => paint(ctx, row));
        } finally { ctx.restore(); }
    };
})();


let loopBasicSkillClassId = null;   // 속성 고르기를 기다리는 직업


function toggleCombatLogCollapse() {
    if (uiDisplay.matches('(max-width: 1080px)')) game.settings.mobileCombatLogExpanded = !game.settings.mobileCombatLogExpanded;
    else game.settings.combatLogCollapsed = !game.settings.combatLogCollapsed;
    applyPanelLayoutSettings();
    // 숨긴 기록은 스크롤 자리를 잃는다. 사용자가 펼칠 때만 최신 줄로 간다.
    const log = document.getElementById('log');
    if (log && !document.body.classList.contains('combat-log-collapsed')) log.scrollTop = log.scrollHeight;
}


/** 마지막 3초 피해가 최대 생명의 절반에 못 미치면 한 방이 아니라 오래 깎인 소모전이다: 피해 요약은 그 전투 전체를 보인다. */
const DEATH_ATTRITION_SHARE = 0.5;
/** 쓰러뜨린 속성의 저항이 0보다 낮으면 그 값을 알린다. 혼돈 1부터 캠페인 패널티로 모든 저항이 60 낮아져, 패시브를 찍은 전사와 궁수도
 * 그곳에서 화염, 냉기 피해에 거듭 쓰러졌다(자연 플레이 측정 2026-10-17). */
const DEATH_RESIST_STATS = Object.freeze({ fire: ['resF', '화염'], cold: ['resC', '냉기'], light: ['resL', '번개'], chaos: ['resChaos', '카오스'] });


// 자동 알림은 관리 화면과 다른 선택 창을 가리지 않는다. 저장된 사망 기록은 즉시 갱신되고,
// 표시 예약만 가장 최근 한 건으로 합친다. 이미 읽는 기록은 새 사망으로 덮어쓰지 않는다.
openDeathOverlay.request = function requestDeathNotice(log) {
    if (game.isBackgroundCalculation || isDeathOverlayOpen()) return;
    openDeathOverlay.pending = { owner: game, log };
    openDeathOverlay.flushPending();
};

/** Whether a management view is up, so the death notice waits: the windowed UI's management mode, or any tab but battle shown
 * (no battle tab at all counts too). */
openDeathOverlay.heldByView = function isDeathNoticeHeldByView() {
    const body = document.body.classList;
    if (body.contains('desktop-windowed-ui')) return body.contains('ui-management-mode');
    const battle = document.getElementById('tab-battle');
    return !battle || !battle.classList.contains('active');
};

openDeathOverlay.flushPending = function flushPendingDeathNotice() {
    const pending = openDeathOverlay.pending;
    if (!pending) return;
    if (pending.owner !== game || pending.log !== game.lastDeathLog || game.settings.showDeathNotice === false) {
        openDeathOverlay.pending = null;
        return;
    }
    if (game.isBackgroundCalculation || document.hidden || openDeathOverlay.heldByView()) return;
    if (document.querySelector('dialog[open], .tutorial-overlay.active, .selection-overlay, #background-combat-result-overlay, #startup-overlay.active, #loading-overlay.active')) return;
    openDeathOverlay(pending.log);
};


// 한 전투 동안 받은 피해: 피해가 DEATH_FIGHT_GAP_MS 넘게 끊기면 새 전투로 본다. 저장하지 않는다(사망 기록이 요약을 가져간다).
// 초반 사망은 20~40초 동안 조금씩 깎이는 소모전이라 마지막 3초만으로는 원인이 보이지 않았다(플레이 리뷰 2026-10-07).
const DEATH_FIGHT_GAP_MS = 8000;
let deathFightLedger = null;


const reachedSkyTowerFloor10 = s => !!(s.skyTower && (Math.floor(s.skyTower.highestFloor || 1) >= 11
    || (Array.isArray(s.skyTower.clearedFloors) ? s.skyTower.clearedFloors : []).some(floor => Math.floor(floor || 0) >= 10)));
const holdsFusedRelic = s => (s.inventory || []).some(item => item && item.fusedRelic)
    || Object.values(s.equipment || {}).some(item => item && item.fusedRelic);
const reachedColonyWave10 = s => Math.max(Math.floor((s.colony || {}).highestWave || 0), Math.floor((s.colony || {}).wave || 0)) >= 11;
/** Journal entries a save's progress proves, in the order they are added: [entry, whether the progress shows it]. */
const JOURNAL_PROGRESS_RULES = Object.freeze([
    ['passive_star_evolution', s => !!s.passiveStarEvolution],
    ['meteor_fall', s => Math.floor((s.meteorSite || {}).entriesCleared || 0) > 0],
    ['woodsman', s => !!(s.chaosInfuserUnlocked || s.woodsmanSimulatorSeenLoop || Math.floor(s.woodsmanDefeatAttempts || 0) > 0)],
    ['beehive_queen', s => !!(s.beehive && s.beehive.cleared)],
    ['void_grand_breach', s => !!(s.voidRift && s.voidRift.grandBreachCleared)],
    ['labyrinth_10', s => Math.max(Math.floor(s.labyrinthUnlockedMaxFloor || 1), Math.floor(s.labyrinthFloor || 1)) >= 11],
    ['ocean_500', s => !!(s.ocean && Math.floor(s.ocean.bossClearM || 0) >= 500)],
    ['sky_tower_10', reachedSkyTowerFloor10],
    ['time_rift_fusion', reachedTimeRiftFusion],
    ['colony_wave_10', reachedColonyWave10]
]);
// 액트 보스를 쓰러뜨리면 다음 지역으로 떠나기 전에 보상 창을 띄운다(창이 열린 동안 게임이 멈춰 출발도 기다린다). 보상이 목표
// 서랍과 지도에만 있어, 첫 보상을 받지 않고 넘어간 판이 액트 2 첫 전투에서 죽었다(플레이 리뷰 2026-10-07). 방치 정산 중이나
// 자리를 비운 방치(입력이 3분 넘게 없음) 중에는 띄우지 않는다(멈춘 채 기다리게 된다). 다른 창이 떠 있으면 닫힐 때까지 1분 기다린다.
// 띄운 뒤에 자리를 비워도 3분이 지나면 나중에처럼 닫는다(watchActRewardAway). 처치하고 afterKillMs 뒤에 띄운다: 보스가 쓰러지는
// 그림(1.6초)이 창에 가리지 않게(2026-10-17, 창이 0.6초 만에 덮었다).
const ACT_REWARD_PROMPT = Object.freeze({ awayMs: 180000, retryMs: 500, tries: 120, awayCheckMs: 5000, afterKillMs: 1500 });
let actRewardPromptTimer = null, actRewardAwayTimer = null, actRewardPromptDelay = null;
/** 능력치 보상의 그림: 스킬트리 노드 그림판(PASSIVE_ICON_ATLAS_CELL)의 칸 이름. */
const ACT_REWARD_STAT_ICONS = Object.freeze({ resF: 'fire', resC: 'cold', resL: 'lightning', resAll: 'elemental', resChaos: 'chaos', pctHp: 'life', aspd: 'precision',
    move: 'mobility', dr: 'armor', regen: 'cycle', meleePctDmg: 'blade', projectilePctDmg: 'projectile', elementalPctDmg: 'elemental', crit: 'precision',
    critDmg: 'critical', leech: 'bleed', physIgnore: 'strength', resPen: 'void', gemLevel: 'arcane', suppCap: 'mystique' });
const ACT_REWARD_KIND_LOOKS = Object.freeze({
    support: choice => {
        const cell = getSupportRuneArtCell(choice.gem);
        return { tone: `tone-${getSupportRuneTone(choice.gem)}`, art: cell ? `<span class="support-rune-art" style="--col:${cell.col};--row:${cell.row}"></span>` : actRewardTreeArt('mystique') };
    },
    currency: choice => {
        const coin = ORB_DB[choice.currency]?.icon;
        return { tone: 'tone-phys', art: coin ? `<img class="reward-choice-art" src="${coin}" alt="">` : actRewardTreeArt('constellation') };
    },
    stat: choice => ({ tone: `tone-${STAT_TONES[choice.stat] || 'neutral'}`, art: actRewardTreeArt(ACT_REWARD_STAT_ICONS[choice.stat]) })
});
