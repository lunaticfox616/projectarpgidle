import { PASSIVE_NODE_KIND_RADIUS, PASSIVE_NODE_SOURCE_RADIUS, PASSIVE_START_ICON_FAMILY, PASSIVE_ICON_ATLAS_CELL, PASSIVE_ICON_ATLAS_COLUMNS, PASSIVE_ICON_ATLAS_ROWS, PASSIVE_NOTABLE_ICON_ATLAS_CELL, PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT, PASSIVE_KEYSTONE_ICON_CELL_BY_ID, PASSIVE_KEYSTONE_ICON_ATLAS_ROWS } from '../data/passive-node-art.mjs';

export function getPassiveNodeVisualRadius(node) {
    if (!node) return 6;
    if (node.kind === 'hub') return 26;
    const kindRadius = PASSIVE_NODE_KIND_RADIUS[node.kind];
    if (kindRadius) return kindRadius;
    const sourceRadius = PASSIVE_NODE_SOURCE_RADIUS[node.sourceType];
    if (sourceRadius) return sourceRadius;
    return tierRadius(node);
}

function tierRadius(node) {
    if (node.tier === 0) return 34;
    if (node.tier >= 3) return 24;
    if (node.tier === 2 || node.kind === 'ring' || node.kind === 'inner') return 14;
    return 9;
}

const BASE_ACCENT = Object.freeze({
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
    });
const ACCENT_GROUPS = Object.freeze([
    [['flatHp', 'pctHp', 'regen', 'leech'], Object.freeze({ activeOuter: '#9be1b9', activeMid: '#327858', activeGlow: 'rgba(100,210,145,0.28)', reachOuter: '#6dc89b', reachMid: '#173127', previewOuter: 'rgba(88,155,124,0.56)', idleOuter: 'rgba(128,182,154,0.92)', text: '#c8ffe0' })],
    [['igniteChance', 'chillChance', 'freezeChance', 'shockChance', 'poisonChance', 'bleedChance'], Object.freeze({ activeOuter: '#ff9bb6', activeMid: '#8a3a4d', activeGlow: 'rgba(255,113,151,0.3)', reachOuter: '#e0708d', reachMid: '#361822', previewOuter: 'rgba(164,82,105,0.56)', idleOuter: 'rgba(194,112,133,0.92)', text: '#ffd8e2' })],
    [['armor', 'armorPct', 'evasion', 'evasionPct', 'deflectChance', 'dr', 'blockChance', 'blockChancePct'], Object.freeze({ activeOuter: '#5dcaa5', activeMid: '#236753', activeGlow: 'rgba(93,202,165,0.3)', reachOuter: '#4eb18f', reachMid: '#14312a', previewOuter: 'rgba(69,137,116,0.56)', idleOuter: 'rgba(98,169,147,0.92)', text: '#caffef' })],
    [['energyShield', 'energyShieldPct', 'energyShieldRegen'], Object.freeze({ activeOuter: '#b9c6ff', activeMid: '#4a5295', activeGlow: 'rgba(132,154,255,0.32)', reachOuter: '#8999e6', reachMid: '#1d2344', previewOuter: 'rgba(96,107,166,0.56)', idleOuter: 'rgba(130,141,196,0.92)', text: '#e4e8ff' })],
    [['ailResIgnite', 'ailResShock', 'ailResFreeze', 'ailResPoison', 'ailResBleed'], Object.freeze({ activeOuter: '#d7e1ea', activeMid: '#667786', activeGlow: 'rgba(188,207,222,0.26)', reachOuter: '#aab8c4', reachMid: '#26323c', previewOuter: 'rgba(122,137,150,0.56)', idleOuter: 'rgba(151,164,176,0.92)', text: '#edf5fb' })],
    [['flatDmg', 'pctDmg', 'meleePctDmg', 'physPctDmg', 'aoePctDmg', 'ds', 'physIgnore'], Object.freeze({ activeOuter: '#ffca8b', activeMid: '#865233', activeGlow: 'rgba(255,174,94,0.28)', reachOuter: '#d39b69', reachMid: '#2f2118', previewOuter: 'rgba(151,109,76,0.56)', idleOuter: 'rgba(178,143,110,0.92)', text: '#ffe2c0' })],
    [['aspd', 'move', 'projectilePctDmg', 'suppCap', 'gemLevel', 'expGain'], Object.freeze({ activeOuter: '#93e3e8', activeMid: '#2b6d79', activeGlow: 'rgba(102,223,235,0.28)', reachOuter: '#6fb8c7', reachMid: '#15303b', previewOuter: 'rgba(82,131,148,0.56)', idleOuter: 'rgba(124,175,191,0.92)', text: '#cbfbff' })],
    [['crit', 'critDmg', 'chaosPctDmg', 'resChaos'], Object.freeze({ activeOuter: '#d5a5ff', activeMid: '#64378f', activeGlow: 'rgba(190,120,255,0.3)', reachOuter: '#a77bd4', reachMid: '#221732', previewOuter: 'rgba(118,90,156,0.56)', idleOuter: 'rgba(152,125,191,0.92)', text: '#efd9ff' })],
    [['firePctDmg', 'resF'], Object.freeze({ activeOuter: '#ffb08d', activeMid: '#8c4030', activeGlow: 'rgba(255,130,94,0.3)', reachOuter: '#d08c72', reachMid: '#351a15', previewOuter: 'rgba(146,88,73,0.56)', idleOuter: 'rgba(183,129,118,0.92)', text: '#ffe1d2' })],
    [['coldPctDmg', 'resC'], Object.freeze({ activeOuter: '#a5ddff', activeMid: '#356d95', activeGlow: 'rgba(128,208,255,0.3)', reachOuter: '#7db8d8', reachMid: '#172b39', previewOuter: 'rgba(84,123,148,0.56)', idleOuter: 'rgba(126,164,189,0.92)', text: '#dff5ff' })],
    [['lightPctDmg', 'resL', 'elementalPctDmg', 'resAll', 'resPen'], Object.freeze({ activeOuter: '#f6dc8f', activeMid: '#8a6e30', activeGlow: 'rgba(255,214,91,0.28)', reachOuter: '#ceb768', reachMid: '#302815', previewOuter: 'rgba(151,133,73,0.56)', idleOuter: 'rgba(183,167,114,0.92)', text: '#fff0c0' })]
]);

export function getPassiveStatAccent(statId) {
    const group = ACCENT_GROUPS.find(([stats]) => stats.includes(statId));
    return { ...BASE_ACCENT, ...(group ? group[1] : {}) };
}

export function tracePassiveLinkSegment(ctx, a, b) {
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

export function getPassiveNodeIconFamily(runtime, node) {
    if (!node) return null;
    if (node.kind === 'void') return 'void';
    return (node.iconFamily && PASSIVE_ICON_ATLAS_CELL[node.iconFamily] ? node.iconFamily : null)
        || runtime.iconFamily[node.stat]
        || runtime.iconFamily[node.archetype]
        || runtime.iconFamily[node.cat]
        || PASSIVE_START_ICON_FAMILY[node.startClassId]
        || null;
}

export function getPassiveTreeArtImage(runtime, key) {
    const image = runtime.deps.battleAssets && runtime.deps.battleAssets.images ? runtime.deps.battleAssets.images[key] : null;
    if (!image || !image.complete || !(image.naturalWidth || image.width)) return null;
    return image;
}

/** A renamed keystone keeps the original effect's atlas cell. */
function getPassiveKeystoneIconCell(node) {
    return PASSIVE_KEYSTONE_ICON_CELL_BY_ID[node.id] || PASSIVE_KEYSTONE_ICON_CELL_BY_ID[String(node.keystoneEffectId || '').replace('keystone:', '')];
}

export function getPassiveNodeAtlasArt(runtime, node) {
    const keystone = keystoneArt(runtime, node);
    if (keystone) return keystone;
    return regularArt(runtime, node);
}

function keystoneArt(runtime, node) {
    let keystoneCell = node && node.kind === 'keystone' ? getPassiveKeystoneIconCell(node) : null;
    let keystoneImage = keystoneCell && getPassiveTreeArtImage(runtime, 'passiveTreeKeystoneIcons');
    if (keystoneImage) return { image: keystoneImage, cell: keystoneCell, columns: 6, rows: PASSIVE_KEYSTONE_ICON_ATLAS_ROWS };
    return null;
}

function regularArt(runtime, node) {
    let family = node && (PASSIVE_NOTABLE_ICON_ATLAS_CELL[node.iconFamily]
        ? node.iconFamily
        : PASSIVE_NOTABLE_ICON_FAMILY_BY_STAT[node.stat]);
    let notableCell = PASSIVE_NOTABLE_ICON_ATLAS_CELL[family];
    let notableImage = notableCell && getPassiveTreeArtImage(runtime, 'passiveTreeNotableIcons');
    if (notableImage) return { image: notableImage, cell: notableCell, columns: 4, rows: 3 };
    let baseCell = PASSIVE_ICON_ATLAS_CELL[getPassiveNodeIconFamily(runtime, node)];
    let baseImage = baseCell && getPassiveTreeArtImage(runtime, 'passiveTreeIcons');
    return baseImage ? { image: baseImage, cell: baseCell, columns: PASSIVE_ICON_ATLAS_COLUMNS, rows: PASSIVE_ICON_ATLAS_ROWS } : null;
}

export function isPassiveFramedNode(node) {
    if (!node) return false;
    return node.kind === 'start' || node.kind === 'keystone' || node.kind === 'void'
        || node.kind === 'hub' || node.kind === 'apex' || node.kind === 'core'
        || node.kind === 'major' || node.tier >= 3;
}

export function isPassiveImageSlotNode(node) {
    return !!node && node.kind === 'void';
}
