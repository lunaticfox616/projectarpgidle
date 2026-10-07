function resetBeehiveRunModifiers(b) {
    if (!b) return;
    b.pendingChoice = null;
    b.awaitingClear = false;
    b.enemyEmpower = 0;
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
    if (node.intentionalNoEffect) return '무효';
    if (node.title) return node.title;
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
            const statInfo = P_STATS[effect.stat] || {};
            const sign = Number(effect.val) >= 0 ? '+' : '';
            const statName = String(statInfo.name || effect.stat).replace(/\s*\(%\)\s*/g, '').trim();
            return `${statName} ${sign}${formatValue(effect.stat, effect.val)}${statInfo.isPct ? '%' : ''}`;
        });
        if (node.connectedDevotionPenalty) {
            labels.push(`기본 +${node.val}%에서 직접 연결된 헌신 1개 할당마다 각각 ${node.connectedDevotionPenalty}%p 감소`);
        }
        if (node.activationRequirement) {
            const state = getPassiveNodeActivationState(node);
            const statName = state.statId === 'devotion' ? '계시' : getStatName(state.statId);
            const color = state.active ? '#9fe5bb' : '#ffaaaa';
            labels.push(`<span style="color:${color};">${state.active ? '활성' : '비활성'} · ${statName} ${state.available}/${state.required}</span>`);
        }
        return labels.join('<br>');
    }
    if (!node.stat) return '';
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
    if (node.kind === 'start') return '직업 시작점';
    if (node.kind === 'apex') return '별끝 특수 노드';
    if (node.kind === 'evolved') return '각성 성좌';
    if (node.kind === 'transcendent') return '초월 성좌';
    if (node.kind === 'core') return '핵심 성좌';
    if (node.kind === 'deadend') return '막다른 길 거점';
    if (node.kind === 'void') return node.voidRing === 'outer' ? '외곽 공허 소켓' : '공허 패시브';
    if (node.kind === 'hub') return '교차 거점';
    if (node.sourceType === 'keystone' || node.kind === 'keystone') return '키스톤';
    if (node.sourceType === 'major' || node.kind === 'major') return '주요 패시브';
    if (node.sourceType === 'normal' || node.kind === 'node') return '일반 패시브';
    if (node.sourceType === 'minor' || node.sourceType === 'assist'
        || node.kind === 'path' || node.kind === 'assist') return '소형 패시브';
    return '보조 노드';
}

function angleDistance(a, b) {
    let diff = a - b;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff);
}

const PASSIVE_NODE_KIND_RADIUS = Object.freeze({
    start: 30,
    transcendent: 28,
    keystone: 27,
    void: 26,
    apex: 24,
    core: 22,
    deadend: 21,
    evolved: 21,
    major: 21,
    assist: 7
});

const PASSIVE_NODE_SOURCE_RADIUS = Object.freeze({ major: 21, normal: 13.5, assist: 7, minor: 7 });

function getPassiveNodeVisualRadius(node) {
    if (!node) return 6;
    if (node.kind === 'hub') return 23;
    const kindRadius = PASSIVE_NODE_KIND_RADIUS[node.kind];
    if (kindRadius) return kindRadius;
    const sourceRadius = PASSIVE_NODE_SOURCE_RADIUS[node.sourceType];
    if (sourceRadius) return sourceRadius;
    if (node.tier === 0) return 30;
    if (node.tier >= 3) return 21;
    if (node.tier === 2 || node.kind === 'ring' || node.kind === 'inner') return 13.5;
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

// Warm iron/bronze states that match the pixel UI: gold = allocated, pale bronze = can be taken next, dim iron = locked.
function getPassiveNodePalette(node, active, reachable, visibility) {
    if (node && node.kind === 'void') {
        return active
            ? { outer: '#c7f7ff', mid: '#22566b', inner: '#06151d', glow: 'rgba(79,209,255,0.45)', text: '#dcfbff' }
            : { outer: '#72b8d0', mid: '#173345', inner: '#081019', glow: 'rgba(79,209,255,0.20)', text: '#c5efff' };
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
            glow: null,
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
            outer: '#e9be67',
            mid: '#3a2b14',
            inner: '#1a130a',
            icon: accent.activeOuter,
            glow: 'rgba(233,190,103,0.17)',
            text: accent.text
        };
    }
    if (reachable) {
        return {
            outer: '#cdb88c',
            mid: '#231c13',
            inner: '#120e09',
            icon: accent.reachOuter,
            glow: 'rgba(215,179,111,0.08)',
            text: accent.text
        };
    }
    if (visibility === 'preview') {
        return {
            outer: 'rgba(118,99,72,0.55)',
            mid: 'rgba(17,14,10,0.9)',
            inner: 'rgba(9,7,5,0.94)',
            icon: 'rgba(124,110,90,0.62)',
            glow: null,
            text: accent.text
        };
    }
    return {
        outer: 'rgba(122,103,76,0.86)',
        mid: 'rgba(17,14,10,0.96)',
        inner: 'rgba(9,7,5,0.98)',
        icon: 'rgba(136,121,98,0.86)',
        glow: null,
        text: '#b9ad99'
    };
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

// Circles for path/normal nodes and class emblems, flat-topped octagons for notables and keystones
// (the pixel UI's chamfered frame), diamonds for socket slots.
function tracePassiveNodeFramePath(ctx, node, radius) {
    const x = node.x;
    const y = node.y;
    let sides = 0;
    let rotation = Math.PI / 8;
    if (node.kind === 'hub' || node.kind === 'void') { sides = 4; rotation = Math.PI / 4; }
    else if (node.kind === 'keystone' || node.kind === 'major' || node.kind === 'core' || node.tier >= 3) sides = 8;
    ctx.beginPath();
    if (!sides) {
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        return;
    }
    for (let i = 0; i < sides; i++) {
        const angle = rotation + i * Math.PI * 2 / sides;
        const px = x + Math.cos(angle) * radius;
        const py = y + Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

const PASSIVE_ICON_FAMILY = Object.freeze({
    mystique: 'mystique', devotion: 'devotion', cycle: 'cycle', projectilePctDmg: 'projectile', projectileExtraShots: 'projectile',
    accuracy: 'projectile', accuracyBonusPct: 'projectile', meleePctDmg: 'blade', physPctDmg: 'blade', slamPctDmg: 'blade', flatDmg: 'blade',
    strength: 'strength', pctDmg: 'blade', ds: 'blade', bleedChance: 'blade', physIgnore: 'blade', doubleDamageChance: 'blade', addedPhysDamagePct: 'blade',
    blockChance: 'shield', blockChanceMax: 'shield', shieldPctDmg: 'shield', armor: 'shield', armorPct: 'shield', dr: 'shield', deflectChance: 'shield',
    takenDamageReduceWhen1EnemyPct: 'shield', takenDamageReduceWhen2EnemiesPct: 'shield',
    potionPctDmg: 'potion', poisonChance: 'potion', summonPctDmg: 'summon', summonHpPct: 'summon', summonGemLevel: 'summon',
    summonCrit: 'summon', summonCritDmg: 'summon', summonFlatDmg: 'summon', summonAspd: 'summon', summonResPen: 'summon',
    firePctDmg: 'elemental', coldPctDmg: 'elemental', lightPctDmg: 'elemental', elementalPctDmg: 'elemental', resPen: 'elemental',
    igniteChance: 'elemental', chillChance: 'elemental', shockChance: 'elemental', resF: 'elemental', resC: 'elemental',
    resL: 'elemental', resAll: 'elemental', aoePctDmg: 'elemental', chillEffect: 'elemental', shockEffect: 'elemental',
    igniteDamageMultiplierPct: 'elemental', shockedEnemyHitDamagePct: 'elemental', shockedEnemyHitDamageMorePct: 'elemental', addedFireDamagePct: 'elemental',
    addedColdDamagePct: 'elemental', addedLightDamagePct: 'elemental', physTakenAsFire: 'elemental', physTakenAsCold: 'elemental', physTakenAsLight: 'elemental',
    chaosPctDmg: 'chaos', dotPctDmg: 'chaos', resChaos: 'chaos', poisonDamageMultiplierPct: 'chaos', addedChaosDamagePct: 'chaos', physTakenAsChaos: 'chaos',
    flatHp: 'life', pctHp: 'life', regen: 'life', leech: 'life', leechTotalCap: 'life', energyShield: 'arcane', energyShieldPct: 'arcane',
    energyShieldRegen: 'arcane', energyShieldRechargeFaster: 'arcane', spellPctDmg: 'arcane', spellFlatDmg: 'arcane', spellFlatPct: 'arcane',
    intelligence: 'intelligence', dexterity: 'dexterity', crit: 'precision', critDmg: 'precision', aspd: 'precision',
    evasion: 'wind', evasionPct: 'wind', move: 'wind', mobilityPctDmg: 'wind'
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
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3]
});
const PASSIVE_ICON_ATLAS_COLUMNS = 5;
const PASSIVE_ICON_ATLAS_ROWS = 4;
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
    elementalGemLevel: 'notableGem', summonGemLevel: 'notableGem',
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
    backbone_branch_alchemist_outer_4_alchemist_resist_keystone: [5, 4]
});

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

function getPassiveNodeAtlasArt(node) {
    let keystoneCell = node && node.kind === 'keystone' ? PASSIVE_KEYSTONE_ICON_CELL_BY_ID[node.id] : null;
    let keystoneImage = keystoneCell && getPassiveTreeArtImage('passiveTreeKeystoneIcons');
    if (keystoneImage) return { image: keystoneImage, cell: keystoneCell, columns: 6, rows: 5 };
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

function canUsePassiveNodeImageArt(node) {
    if (getPassiveTreeArtImage(`passiveTreeCustom_${node && node.id}`)) return true;
    return !!getPassiveNodeAtlasArt(node);
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

function getPassiveNodeSlotImage(node) {
    return isPassiveImageSlotNode(node) ? getPassiveTreeArtImage('passiveTreeVoidSlot') : null;
}

function drawPassiveNodeImageArt(ctx, node, radius, opacity) {
    const slotImage = getPassiveNodeSlotImage(node);
    const customImage = getPassiveTreeArtImage(`passiveTreeCustom_${node && node.id}`);
    const standaloneImage = customImage || slotImage;
    const atlasArt = standaloneImage ? null : getPassiveNodeAtlasArt(node);
    const image = standaloneImage || (atlasArt && atlasArt.image);
    if (!image) return false;
    const halfSize = radius * (slotImage ? 1.12 : (node.kind === 'start' ? 0.58 : 0.78));
    const drawY = node.y - halfSize - (slotImage ? 0 : radius * 0.06);
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    ctx.imageSmoothingEnabled = true;
    if (standaloneImage) {
        ctx.drawImage(image, node.x - halfSize, drawY, halfSize * 2, halfSize * 2);
    } else {
        const sourceWidth = (image.naturalWidth || image.width) / atlasArt.columns;
        const sourceHeight = (image.naturalHeight || image.height) / atlasArt.rows;
        ctx.drawImage(image, atlasArt.cell[0] * sourceWidth, atlasArt.cell[1] * sourceHeight, sourceWidth, sourceHeight,
            node.x - halfSize, drawY, halfSize * 2, halfSize * 2);
    }
    ctx.restore();
    return true;
}

// Medallion frames are drawn as flat bronze bands (no points or spikes): a dark rim, the state band and a thin
// inner line. Keystones and class starts get a second outer line so they stay the strongest landmarks.
const PASSIVE_FRAME_TONES = Object.freeze({
    active: Object.freeze({ band: '#e9be67', inner: 'rgba(255,236,190,0.78)' }),
    reachable: Object.freeze({ band: '#cdb88c', inner: 'rgba(236,222,190,0.5)' }),
    idle: Object.freeze({ band: '#8d7249', inner: 'rgba(141,114,73,0.55)' })
});
const PASSIVE_FRAME_RIM = '#0c0905';

function getPassiveFrameTone(node, active) {
    if (active || (node.kind === 'start' && node.id === getPassiveTreeRootNodeId())) return PASSIVE_FRAME_TONES.active;
    return reachableNodes.has(node.id) ? PASSIVE_FRAME_TONES.reachable : PASSIVE_FRAME_TONES.idle;
}

function strokePassiveFrameRing(ctx, node, radius, color, width) {
    tracePassiveNodeFramePath(ctx, node, radius);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
}

function drawPassiveNodeFrameArt(ctx, node, radius, active, opacity) {
    if (!isPassiveFramedNode(node) || isPassiveImageSlotNode(node)) return false;
    const tone = getPassiveFrameTone(node, active);
    const landmark = node.kind === 'keystone' || node.kind === 'start';
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
    strokePassiveFrameRing(ctx, node, radius + 1.6, PASSIVE_FRAME_RIM, passiveTreeScreenWidth(1.6, 3.2));
    strokePassiveFrameRing(ctx, node, radius, tone.band, passiveTreeScreenWidth(1.2, landmark ? 3 : 2.4));
    strokePassiveFrameRing(ctx, node, radius - (landmark ? 4.5 : 3.4), tone.inner, passiveTreeScreenWidth(0.7, 1));
    if (landmark) strokePassiveFrameRing(ctx, node, radius + 5.5, tone.inner, passiveTreeScreenWidth(0.7, 1));
    if (!canUsePassiveNodeImageArt(node)) {
        ctx.translate(node.x, node.y);
        drawPassiveNodeIcon(ctx, node, radius, tone.band);
    }
    ctx.restore();
    return true;
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

const PASSIVE_ICON_TRACERS = Object.freeze({
    blade: tracePassiveBladeIcon, projectile: tracePassiveProjectileIcon, shield: tracePassiveShieldIcon,
    potion: tracePassivePotionIcon, mystique: tracePassiveEyeIcon, devotion: tracePassiveCubeIcon,
    cycle: tracePassiveCycleIcon, elemental: tracePassiveElementIcon, chaos: tracePassiveChaosIcon,
    life: tracePassiveLifeIcon, arcane: tracePassiveArcaneIcon, summon: tracePassiveSummonIcon,
    precision: tracePassivePrecisionIcon, wind: tracePassiveWindIcon,
    strength: tracePassiveAttributeIcon, dexterity: tracePassiveAttributeIcon, intelligence: tracePassiveAttributeIcon,
    void: tracePassiveVoidIcon, constellation: tracePassiveConstellationIcon
});

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

// Unframed nodes: normal-size nodes get a thin inner line (a double ring); slot nodes keep their fallback marks
// for when the slot art is missing; any node without atlas art falls back to its vector glyph.
function drawNodeOrnament(ctx, node, radius, palette, active, lightweightMode) {
    if (lightweightMode) return;
    ctx.save();
    ctx.translate(node.x, node.y);
    ctx.strokeStyle = active ? '#f6e3b0' : palette.outer;
    ctx.lineWidth = passiveTreeScreenWidth(0.6, 1);
    if (node.kind === 'void') {
        ctx.strokeRect(-radius * 0.34, -radius * 0.34, radius * 0.68, radius * 0.68);
    } else if (node.kind === 'hub') {
        const span = radius * 0.5;
        ctx.beginPath();
        ctx.moveTo(-span, 0); ctx.lineTo(span, 0);
        ctx.moveTo(0, -span); ctx.lineTo(0, span);
        ctx.stroke();
    } else if (radius >= 12) {
        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
        ctx.stroke();
    }
    if (node.kind !== 'void' && node.kind !== 'hub' && !canUsePassiveNodeImageArt(node)) {
        drawPassiveNodeIcon(ctx, node, radius, palette.icon || palette.outer);
    }
    ctx.restore();
}

function fillPassiveNodeHalo(ctx, node, radius, palette) {
    if (!palette.glow) return;
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius + Math.max(3.5, radius * 0.32), 0, Math.PI * 2);
    ctx.fillStyle = palette.glow;
    ctx.fill();
}

function getPassiveNodeOutlineWidth(active, reachable) {
    if (active) return passiveTreeScreenWidth(1.4, 2.2);
    return reachable ? passiveTreeScreenWidth(1.1, 1.7) : passiveTreeScreenWidth(0.8, 1.1);
}

function drawPassiveNodeHoverRing(ctx, node, radius, active) {
    if (!hoverNode || hoverNode.id !== node.id) return;
    tracePassiveNodeFramePath(ctx, node, radius + 6);
    ctx.strokeStyle = active ? 'rgba(255,241,205,0.9)' : 'rgba(233,210,160,0.72)';
    ctx.lineWidth = passiveTreeScreenWidth(1.2, 1.5);
    ctx.stroke();
}

// Framed nodes (notables, keystones, class starts) only get their base fill here; the medallion itself is
// drawn by drawPassiveNodeFrameArt so its lines sit above the icon plate.
function drawPassiveNodeShape(ctx, node, radius, palette, active, reachable, visibility, revealAlpha, renderOptions) {
    const options = renderOptions && typeof renderOptions === 'object' ? renderOptions : { lightweight: !!renderOptions };
    ctx.save();
    ctx.globalAlpha = revealAlpha;
    if (!options.imageSlot) {
        if (!options.lightweight) fillPassiveNodeHalo(ctx, node, radius, palette);
        tracePassiveNodeFramePath(ctx, node, radius);
        ctx.fillStyle = palette.mid;
        ctx.fill();
        if (!options.framed) {
            ctx.strokeStyle = palette.outer;
            ctx.lineWidth = getPassiveNodeOutlineWidth(active, reachable);
            ctx.stroke();
            drawNodeOrnament(ctx, node, radius, palette, active, !!options.lightweight);
        }
        drawPassiveNodeHoverRing(ctx, node, radius, active);
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
                node.title = '교차 거점';
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

function shapePassiveTreeAsLifeTree() {
    const nodes = Object.values(PASSIVE_TREE.nodes || {});
    const root = PASSIVE_TREE.nodes.n0;
    if (!root || nodes.length < 2) return;
    const finiteDepths = nodes.map(node => Number(node.depth)).filter(Number.isFinite);
    const maxDepth = Math.max(1, ...finiteDepths);
    const sectorOrder = {
        marauder: 0,
        duelist: 1,
        block: 1.35,
        ranger: 2,
        deflect: 2.35,
        center: 2.5,
        shadow: 3,
        witch: 4,
        templar: 5
    };
    const originalPosition = new Map(nodes.map(node => [node.id, { x: node.x, y: node.y }]));
    const adjacency = new Map(nodes.map(node => [node.id, []]));
    PASSIVE_TREE.edges.forEach(edge => {
        if (adjacency.has(edge.from) && adjacency.has(edge.to)) {
            adjacency.get(edge.from).push(edge.to);
            adjacency.get(edge.to).push(edge.from);
        }
    });

    function getTreeSectorOrder(node) {
        if (Number.isFinite(sectorOrder[node.sector])) return sectorOrder[node.sector];
        if (String(node.sector || '').startsWith('star_')) {
            const starIndex = Number(String(node.sector).split('_')[1]);
            return Number.isFinite(starIndex) ? starIndex * (5 / Math.max(1, PASSIVE_APEX_CONFIGS.length - 1)) : 2.5;
        }
        return 2.5;
    }
    function getTreeSpoke(node) {
        if (Number.isFinite(node.webSpoke)) return node.webSpoke;
        if (Number.isFinite(node.webCellSpoke)) return node.webCellSpoke;
        return Number.isFinite(node.lane) ? node.lane : 0;
    }

    const starters = nodes.filter(node => node.id !== root.id && node.depth === 1)
        .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
    const canopyPriority = { ranger: 0, shadow: 1, witch: 2, templar: 3, duelist: 4 };
    const branches = starters.map(starter => ({
        id: starter.id,
        sector: starter.sector,
        direction: starter.sector === 'marauder' ? 'root' : 'canopy',
        order: 0,
        targetX: 0,
        maxBlockWidth: 0
    }));
    const directionBranches = {
        canopy: branches.filter(branch => branch.direction === 'canopy')
            .sort((a, b) => (canopyPriority[a.sector] ?? 99) - (canopyPriority[b.sector] ?? 99)),
        root: branches.filter(branch => branch.direction === 'root')
            .sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }))
    };
    directionBranches.canopy.forEach((branch, index) => { branch.order = index; });
    directionBranches.root.forEach((branch, index) => { branch.order = index; });

    const branchByNodeId = new Map();
    branches.forEach(branch => branchByNodeId.set(branch.id, branch));

    for (let depth = 2; depth <= maxDepth; depth++) {
        nodes.filter(node => node.depth === depth).forEach(node => {
            const candidates = (adjacency.get(node.id) || [])
                .map(id => PASSIVE_TREE.nodes[id])
                .filter(parent => parent && parent.depth === depth - 1 && branchByNodeId.has(parent.id))
                .sort((a, b) => {
                    const branchA = branchByNodeId.get(a.id);
                    const branchB = branchByNodeId.get(b.id);
                    const sectorMatchA = branchA.sector === node.sector ? 0 : 1;
                    const sectorMatchB = branchB.sector === node.sector ? 0 : 1;
                    if (sectorMatchA !== sectorMatchB) return sectorMatchA - sectorMatchB;
                    const sectorDeltaA = Math.abs(getTreeSectorOrder(node) - getTreeSectorOrder(a));
                    const sectorDeltaB = Math.abs(getTreeSectorOrder(node) - getTreeSectorOrder(b));
                    if (sectorDeltaA !== sectorDeltaB) return sectorDeltaA - sectorDeltaB;
                    const originalA = originalPosition.get(a.id) || { x: 0, y: 0 };
                    const originalB = originalPosition.get(b.id) || { x: 0, y: 0 };
                    const nodeOriginal = originalPosition.get(node.id) || { x: 0, y: 0 };
                    const distanceA = Math.hypot(originalA.x - nodeOriginal.x, originalA.y - nodeOriginal.y);
                    const distanceB = Math.hypot(originalB.x - nodeOriginal.x, originalB.y - nodeOriginal.y);
                    if (distanceA !== distanceB) return distanceA - distanceB;
                    return branchA.order - branchB.order;
                });
            if (candidates.length) branchByNodeId.set(node.id, branchByNodeId.get(candidates[0].id));
        });
    }

    const rows = new Map();
    nodes.forEach(node => {
        if (node.id === root.id) return;
        const depth = Number.isFinite(node.depth) ? Math.max(1, Math.floor(node.depth)) : maxDepth;
        let branch = branchByNodeId.get(node.id);
        if (!branch) {
            const direction = node.sector === 'marauder' ? 'root' : 'canopy';
            const candidates = directionBranches[direction];
            branch = candidates[Math.abs(Math.floor(getTreeSectorOrder(node))) % Math.max(1, candidates.length)] || branches[0];
            branchByNodeId.set(node.id, branch);
        }
        const rowKey = `${branch.id}:${depth}`;
        if (!rows.has(rowKey)) rows.set(rowKey, []);
        rows.get(rowKey).push(node);
    });

    function sortBranchRow(row) {
        row.sort((a, b) => {
            const spokeDelta = getTreeSpoke(a) - getTreeSpoke(b);
            if (spokeDelta !== 0) return spokeDelta;
            const clusterDelta = String(a.clusterId || '').localeCompare(String(b.clusterId || ''));
            if (clusterDelta !== 0) return clusterDelta;
            const originalDelta = (originalPosition.get(a.id).x || 0) - (originalPosition.get(b.id).x || 0);
            if (originalDelta !== 0) return originalDelta;
            return String(a.id).localeCompare(String(b.id), undefined, { numeric: true });
        });
        return row;
    }

    function buildRowBlock(row, direction) {
        const ordered = sortBranchRow(row.slice());
        const maxColumns = direction === 'canopy' ? 11 : 5;
        const horizontalGap = direction === 'canopy' ? 28 : 30;
        const verticalGap = direction === 'canopy' ? 28 : 34;
        const lines = [];
        for (let index = 0; index < ordered.length; index += maxColumns) {
            let line = ordered.slice(index, index + maxColumns);
            if (lines.length % 2 === 1) line = line.reverse();
            let cursor = 0;
            let maxRadius = 0;
            const entries = line.map((node, nodeIndex) => {
                const radius = getPassiveNodeVisualRadius(node);
                if (nodeIndex > 0) cursor += horizontalGap;
                cursor += radius;
                const entry = { node, x: cursor, radius };
                cursor += radius;
                maxRadius = Math.max(maxRadius, radius);
                return entry;
            });
            lines.push({ entries, width: cursor, height: maxRadius * 2 });
        }

        let heightCursor = 0;
        const placements = [];
        let blockWidth = 0;
        lines.forEach((line, lineIndex) => {
            if (lineIndex > 0) heightCursor += verticalGap;
            const centerY = heightCursor + line.height * 0.5;
            const stagger = lines.length > 1
                ? (lineIndex % 2 === 0 ? -1 : 1) * horizontalGap * 0.38
                : 0;
            line.entries.forEach(entry => {
                const localX = entry.x - line.width * 0.5 + stagger;
                const normalizedX = line.width > 0 ? Math.min(1, Math.abs(localX) / (line.width * 0.5)) : 0;
                const arc = Math.pow(normalizedX, 1.45) * (direction === 'canopy' ? 12 : -8);
                placements.push({
                    node: entry.node,
                    x: localX,
                    y: centerY + arc
                });
            });
            heightCursor += line.height;
            blockWidth = Math.max(blockWidth, line.width + Math.abs(stagger) * 2);
        });
        const blockHeight = Math.max(1, heightCursor);
        placements.forEach(placement => { placement.y -= blockHeight * 0.5; });
        return { width: Math.max(1, blockWidth), height: blockHeight, placements };
    }

    const blocks = new Map();
    rows.forEach((row, key) => {
        const branchId = key.split(':')[0];
        const branch = branchByNodeId.get(branchId) || branches.find(item => item.id === branchId);
        if (!branch) return;
        const block = buildRowBlock(row, branch.direction);
        blocks.set(key, block);
        branch.maxBlockWidth = Math.max(branch.maxBlockWidth, block.width);
    });

    function assignBranchTargets(direction) {
        const list = directionBranches[direction];
        const branchGap = direction === 'canopy' ? 72 : 88;
        let cursor = 0;
        list.forEach((branch, index) => {
            if (index > 0) cursor += branchGap;
            cursor += branch.maxBlockWidth * 0.5;
            branch.targetX = cursor;
            cursor += branch.maxBlockWidth * 0.5;
        });
        const center = cursor * 0.5;
        list.forEach(branch => { branch.targetX -= center; });
    }
    assignBranchTargets('canopy');
    assignBranchTargets('root');

    function smoothStep(value) {
        const t = Math.max(0, Math.min(1, value));
        return t * t * (3 - 2 * t);
    }

    function layoutDirection(direction) {
        const list = directionBranches[direction];
        const verticalBandGap = direction === 'canopy' ? 72 : 82;
        const liveBranchGap = direction === 'canopy' ? 42 : 50;
        let verticalCursor = getPassiveNodeVisualRadius(root) + 58;

        for (let depth = 1; depth <= maxDepth; depth++) {
            const depthBlocks = list
                .map(branch => ({ branch, block: blocks.get(`${branch.id}:${depth}`) }))
                .filter(entry => entry.block);
            if (!depthBlocks.length) continue;
            const bandHeight = Math.max(...depthBlocks.map(entry => entry.block.height));
            verticalCursor += bandHeight * 0.5;
            const bandCenter = direction === 'canopy' ? -verticalCursor : verticalCursor;
            const progress = depth / maxDepth;
            const canopyFan = 0.16 + 0.84 * smoothStep(progress);
            const rootOutward = 0.18 + 0.82 * smoothStep(Math.min(1, progress / 0.58));
            const rootReturn = 1 - 0.5 * smoothStep((progress - 0.58) / 0.42);
            const fan = direction === 'canopy' ? canopyFan : rootOutward * rootReturn;
            const placedBlocks = depthBlocks.map(({ branch, block }) => {
                const waveAmplitude = direction === 'canopy'
                    ? 32 + 68 * progress
                    : 60 + 110 * progress;
                const wave = Math.sin(depth * (direction === 'canopy' ? 0.64 : 0.82) + branch.order * 1.9)
                    * waveAmplitude * Math.pow(progress, 0.72);
                return { branch, block, centerX: branch.targetX * fan + wave };
            });

            for (let index = 1; index < placedBlocks.length; index++) {
                const previous = placedBlocks[index - 1];
                const current = placedBlocks[index];
                const minimumCenter = previous.centerX + previous.block.width * 0.5 + current.block.width * 0.5 + liveBranchGap;
                current.centerX = Math.max(current.centerX, minimumCenter);
            }
            if (placedBlocks.length) {
                const leftEdge = placedBlocks[0].centerX - placedBlocks[0].block.width * 0.5;
                const last = placedBlocks[placedBlocks.length - 1];
                const rightEdge = last.centerX + last.block.width * 0.5;
                const centerShift = (leftEdge + rightEdge) * 0.5;
                placedBlocks.forEach(entry => { entry.centerX -= centerShift; });
            }

            placedBlocks.forEach(({ branch, block, centerX }) => {
                const halfSlots = Math.max(1, (list.length - 1) * 0.5);
                const slotDistance = Math.abs(branch.order - (list.length - 1) * 0.5) / halfSlots;
                const crownCurve = Math.pow(slotDistance, 1.55) * (direction === 'canopy' ? 88 : 64) * Math.pow(progress, 1.2);
                const verticalCoil = direction === 'root'
                    ? Math.cos(depth * 0.78 + branch.order * 2.15) * 14 * progress
                    : Math.sin(depth * 0.42 + branch.order * 1.35) * 6 * progress;
                const centerY = direction === 'canopy'
                    ? bandCenter + crownCurve + verticalCoil
                    : bandCenter - crownCurve * 0.72 + verticalCoil;

                block.placements.forEach(placement => {
                    const node = placement.node;
                    node.x = centerX + placement.x;
                    node.y = centerY + placement.y;
                    node.treeDepth = depth;
                    node.treeDirection = direction;
                    node.treeBranchRoot = branch.id;
                    node.treeBranchOrder = branch.order;
                });
            });
            verticalCursor += bandHeight * 0.5 + verticalBandGap;
        }
    }

    layoutDirection('canopy');
    layoutDirection('root');

    root.x = 0;
    root.y = 0;
    root.treeDepth = 0;
    root.treeDirection = 'trunk';
    root.treeBranchRoot = root.id;
    root.treeBranchOrder = 0;

    PASSIVE_BOUNDS.minX = Math.min(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.maxX = Math.max(...nodes.map(node => node.x));
    PASSIVE_BOUNDS.minY = Math.min(...nodes.map(node => node.y));
    PASSIVE_BOUNDS.maxY = Math.max(...nodes.map(node => node.y));
    if (typeof markPassiveRenderCacheDirty === 'function') markPassiveRenderCacheDirty('life-tree-layout');
}

function getPassiveTierValueForLayout(statKey, tier) {
    const statDef = P_STATS[statKey];
    if (!statDef) return tier >= 3 ? 8 : (tier === 2 ? 4 : 2);
    if (tier === 0) return 10;
    if (tier === 1) return statDef.s !== undefined ? statDef.s : (statDef.m !== undefined ? statDef.m : (statDef.k !== undefined ? statDef.k : 2));
    if (tier === 2) return statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : (statDef.k !== undefined ? statDef.k : 4));
    return statDef.k !== undefined ? statDef.k : (statDef.m !== undefined ? statDef.m : (statDef.s !== undefined ? statDef.s : 8));
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
        node.val = getPassiveTierValueForLayout(statKey, node.tier);
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
        node.title = `${PASSIVE_SECTOR_TITLES[node.sector] || '성좌'} 시작점`;
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
        node.title = config.title;
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

function loadAuthoredPassiveTree() {
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

var passiveTreeAdjacencyCache = { signature: '', map: new Map() };

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

const PASSIVE_REVELATION_IDS = Object.freeze(['combat', 'guard', 'life']);
const PASSIVE_REVELATION_LABELS = Object.freeze({
    combat: '전투의 계시', guard: '수호의 계시', life: '생명의 성약', fanaticism: '광신'
});
const PASSIVE_WISDOM_ELEMENTS = Object.freeze(['fire', 'cold', 'lightning', 'chaos']);
const PASSIVE_WISDOM_ELEMENT_BY_NODE_ID = Object.freeze({
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

safeExposeGlobals({ getPassiveNodeActivationState, getEffectivePassiveNodeEffects });

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
        return node && node.kind === 'keystone' && node.title === title;
    });
    return PASSIVE_TREE.nodes[id] || null;
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
        Object.values(buckets).forEach(bucket => {
            bucket.strength += Math.max(0, bucket.dexterity) + Math.max(0, bucket.intelligence);
            bucket.dexterity = 0;
            bucket.intelligence = 0;
        });
        passive.flatDmg += Math.max(1, Math.floor(game.level || 1)) * 5 + Math.floor(sumPassiveRuleStat(buckets, 'strength') / 10);
    }
    if (findAllocatedPassiveKeystone('순환의 원석')) {
        const strength = sumPassiveRuleStat(buckets, 'strength');
        passive.cycle += Math.floor(strength / 30);
        passive.armorPct += Math.floor(Math.max(0, sumPassiveRuleStat(buckets, 'cycle')) / 5) * 5;
    }
    applyPassiveDefenseKeystoneRules(buckets);
    applyPassiveRecoveryKeystoneRules(buckets);
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
        potionOverdose: tags.has('potion') && !!findAllocatedPassiveKeystone('과잉 투여')
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

function applyAuthoredPassiveStatRules(options) {
    const buckets = options.buckets, passive = buckets.passive, reward = buckets.reward;
    applyPassiveKeystoneBucketRules(buckets);
    const flags = getPassiveKeystoneCombatFlags(options.skillTags);
    applyPassiveConditionalAilmentRules(passive, flags);
    const activeCycleBuffEffects = getActivePassiveCycleBuffEffects(options.now);
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
        fanaticismStacks: corrupted ? Math.min(devotion, Math.max(0, state.fanaticism.stacks)) : 0,
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

bootstrapPassiveTreeOnceReady();

function isPassiveNodeAvailable(nodeOrId) {
    let node = typeof nodeOrId === 'string' ? PASSIVE_TREE.nodes[nodeOrId] : nodeOrId;
    if (!node || (node.requiresEvolution && !(game && game.passiveStarEvolution))) return false;
    if (node.hiddenByKeystoneId && !(game && (game.passives || []).includes(node.hiddenByKeystoneId))) return false;
    return true;
}

function getPassiveApexNodeIds() {
    return Object.values(PASSIVE_TREE.nodes)
        .filter(node => node.kind === 'apex')
        .map(node => node.id);
}

function getPassiveOuterVoidNodes() {
    return Object.values(PASSIVE_TREE.nodes || {}).filter(node => node.kind === 'void' && node.voidRing === 'outer');
}

/** 성좌 각성: 외곽 공허 소켓 여섯을 모두 할당하고 요정의 고리로 초월시키면 영구히 각성한다(2026-10-01, 별쐐기 성률 대체).
 * allocated는 할당만 한 수, completed는 초월까지 마친 수다. 외곽 공허가 없는 옛 트리는 별끝 노드 규칙을 쓴다. */
function getPassiveConstellationAwakeningProgress() {
    const outerVoids = getPassiveOuterVoidNodes();
    const owned = new Set(game && game.passives || []);
    if (outerVoids.length === 0) {
        const apexIds = getPassiveApexNodeIds();
        return { mode: 'legacy_apex', required: apexIds.length, completed: apexIds.filter(id => owned.has(id)).length, allocated: 0 };
    }
    const crafts = game && game.voidPassives || {};
    const allocated = outerVoids.filter(node => owned.has(node.id));
    return { mode: 'outer_void', required: outerVoids.length, allocated: allocated.length,
        completed: allocated.filter(node => crafts[node.id] && crafts[node.id].transcendent).length };
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
        addLog('✨ 별의 공명이 일어납니다.', 'loot-rare');
        queueTutorialNotice(
            'passive_star_evolution',
            '성좌 각성',
            progress.mode === 'outer_void'
                ? '외곽 공허 소켓 여섯이 모두 초월해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해·생명력·이동 속도가 오릅니다.'
                : '별끝 특수 노드를 모두 활성화해 성좌가 각성했습니다.\n각성은 영구히 유지됩니다.\n별의 공명으로 피해·생명력·이동 속도가 오릅니다.',
            'tab-char'
        );
    }
    return true;
}

const METEOR_SITE_FLAGS = Object.freeze(['unlocked', 'skyRiftReady', 'skyRiftAllCosmos']);
// [key, max, whole number]; every value is clamped at 0 from below. The gauge keeps fractions: kills add 0.35 × tier.
const METEOR_SITE_NUMBERS = Object.freeze([['skyRiftGauge', 100, false], ['skyRiftCarryGauge', 99, false],
    ['lastAnomalyAt', Infinity, true], ['entriesCleared', Infinity, true]]);

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
    site.constellationBuff = site.constellationBuff && typeof site.constellationBuff === 'object' ? site.constellationBuff : null;
    return site;
}

const VOID_PASSIVE_OPTION_POOL = [
    { id: 'pctDmg', min: 5, max: 9 },
    { id: 'flatHp', min: 20, max: 40 },
    { id: 'flatDmg', min: 3, max: 6 },
    { id: 'resAll', min: 4, max: 7 },
    { id: 'resChaos', min: 5, max: 9 },
    { id: 'crit', min: 2, max: 4 },
    { id: 'critDmg', min: 8, max: 15 },
    { id: 'aspd', min: 3, max: 5 },
    { id: 'move', min: 4, max: 7 },
    { id: 'armorPct', min: 8, max: 15 },
    { id: 'evasionPct', min: 8, max: 15 },
    { id: 'energyShieldPct', min: 8, max: 15 },
    { id: 'dotPctDmg', min: 7, max: 12 },
    { id: 'resPen', min: 2, max: 4 },
    { id: 'strength', min: 8, max: 16 },
    { id: 'dexterity', min: 8, max: 16 },
    { id: 'intelligence', min: 8, max: 16 },
    { id: 'accuracy', min: 40, max: 90 },
    { id: 'pctHp', min: 3, max: 6 },
    { id: 'energyShield', min: 16, max: 32 },
    { id: 'meleePctDmg', min: 8, max: 14 },
    { id: 'projectilePctDmg', min: 8, max: 14 },
    { id: 'spellPctDmg', min: 8, max: 14 },
    { id: 'physPctDmg', min: 8, max: 14 },
    { id: 'elementalPctDmg', min: 7, max: 12 },
    { id: 'chaosPctDmg', min: 8, max: 14 },
    { id: 'summonPctDmg', min: 8, max: 16 },
    { id: 'poisonChance', min: 4, max: 8 },
    { id: 'bleedChance', min: 4, max: 8 },
    { id: 'igniteChance', min: 4, max: 8 },
    { id: 'blockChance', min: 1, max: 3 }
];

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
    if (!entry.stats.length) return '공허 옵션 없음 <span style="color:var(--copy-muted);">(오브로 최대 2줄 부여)</span>';
    return passiveRouting.voidStats(entry, game).map(formatVoidPassiveStatLine).filter(Boolean).join(' / ');
}

const TRANSCENDENT_VOID_PASSIVE_DB = [
    { id: 'trauma', name: '트라우마', min: 5, max: 10, desc: v => `이 공허 패시브는 공허를 ${v}회 할당한 것으로 간주` },
    { id: 'paleBlueDot', name: '창백한 푸른 점', fixed: 10, desc: v => `스킬트리 포인트 ${v}점을 추가로 얻습니다.` },
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
    { id: 'seasoned', name: '노련함', min: 4, max: 5, desc: v => `경험한 루프 1회마다 치명타 피해 배율 +${v}%` },
    // 옛 고유 별쐐기 11종(2026-10-01). 트리를 바꾸던 변성 반경은 수치 효과로 옮겼다. 다섯의 수치는 data/passives.js
    // TRANSCENDENT_VOID_VALUES(9단계에서 맞춤).
    { id: 'pluto', name: '명왕성', min: 1, max: 5, rollValue: () => rollPlutoVoidCount(), desc: v => `공허 패시브를 ${v}개 더 할당한 것으로 간주 (5개 확률 1/625)` },
    { id: 'resonantStar', name: '공명별', fixed: 1, desc: v => `보조 스킬 젬 한도 +${v}` },
    { id: 'darkMatter', name: '암흑물질', desc: () => '옵션이 한 줄인 다른 공허 패시브의 효과 +100% (초월 공허 제외)' },
    { id: 'sun', name: '태양', desc: () => '초월 직전 이 공허 패시브의 옵션을 3배로 유지' },
    { id: 'blackHole', name: '블랙홀', desc: () => '이 노드가 무료 연결 거점이 됩니다 — 시작점까지의 길을 되돌려도 이어진 패시브가 유지됩니다' },
    { id: 'andromeda', name: '안드로메다', desc: () => `이 노드 반경 ${TRANSCENDENT_ANDROMEDA_RADIUS} 안의 패시브는 길이 이어지지 않아도 할당할 수 있습니다` },
    { id: 'comet', name: '혜성', ...TRANSCENDENT_VOID_VALUES.comet, desc: v => `이동 속도 +${v}%` },
    { id: 'asteroidBelt', name: '소행성대', ...TRANSCENDENT_VOID_VALUES.asteroidBelt, desc: v => `이 노드 반경 ${TRANSCENDENT_ASTEROID_RADIUS} 안에 할당한 패시브 하나당 모든 피해 +${v}%` },
    { id: 'zeroGravity', name: '무중력', ...TRANSCENDENT_VOID_VALUES.zeroGravity, desc: v => `회피 +${v}%` },
    { id: 'satellite', name: '위성', ...TRANSCENDENT_VOID_VALUES.satellite, desc: v => `공격 속도 +${v}%` },
    { id: 'supernova', name: '초신성', ...TRANSCENDENT_VOID_VALUES.supernova, desc: v => `다른 공허 패시브의 옵션 +${v}%` }
];

/** 명왕성: 1개 80% · 2개 16% · 3개 3.2% · 4개 0.64% · 5개 0.16%(1/625). 옛 고유 별쐐기의 공허 생성 확률 그대로. */
function rollPlutoVoidCount() {
    const roll = Math.random();
    return [0.8, 0.96, 0.992, 0.9984].filter(edge => roll >= edge).length + 1;
}

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
    return rule(tr, ctx).map(([stat, val]) => ({ stat, val: Number(val) || 0 }));
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
    let value = def.fixed || (def.rollValue ? def.rollValue() : roll(def.min, def.max));
    return { id: def.id, value, value2: roll(def.min2, def.max2, def.step2) };
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

function getTranscendentVoidPassiveBonusValue(id) {
    let state = ensureVoidPassiveState();
    return (game.passives || []).reduce((sum, nodeId) => sum + (state[nodeId]?.transcendent?.id === id ? Number(state[nodeId].transcendent.value || 0) : 0), 0);
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
        return { text: '요정의 고리는 옵션이 있는 공허 패시브에만 쓸 수 있습니다. 마법의 새싹으로 먼저 옵션을 굴리세요.', tone: 'attack-monster' };
    }
    game.currencies.fairyRing--;
    rollFairyRingOnVoid(entry, nodeId);
    return entry.transcendent
        ? { text: `🌌 공허 패시브 초월: ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}`, tone: 'loot-unique' }
        : { text: '💥 요정의 고리: 초월에 실패해 공허 패시브의 옵션이 지워졌습니다.', tone: 'attack-monster' };
}

function applyVoidPassiveCurrency(nodeId, currencyKey) {
    if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let node = PASSIVE_TREE.nodes[nodeId];
    if (!node || node.kind !== 'void') return addLog('공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
    if (!(game.passives || []).includes(node.id)) return addLog('먼저 공허 패시브를 활성화해야 합니다.', 'attack-monster');
    if (!['magicBud', 'fairyRing', 'goldenRule'].includes(currencyKey)) return addLog('공허 패시브에는 마법의 새싹, 요정의 고리, 황금률만 사용할 수 있습니다.', 'attack-monster');
    if ((game.currencies[currencyKey] || 0) <= 0) return addLog('오브가 부족합니다.', 'attack-monster');
    let entry = getVoidPassiveCraft(node.id);
    if (currencyKey === 'fairyRing') {
        const outcome = rollFairyRingOnCraftedVoid(entry, node.id);
        addLog(outcome.text, outcome.tone);
        unlockPassiveStarEvolution();
        updateStaticUI();
        return;
    }
    if (currencyKey === 'goldenRule') {
        if (!entry.transcendent || !TRANSCENDENT_VOID_PASSIVE_DB.some(def => def.id === entry.transcendent.id && Number.isFinite(Number(def.min)))) return addLog('신성한 오브는 수치가 있는 초월 공허 패시브에만 사용할 수 있습니다.', 'attack-monster');
        game.currencies.goldenRule--;
        let previousTranscendent = entry.transcendent;
        entry.transcendent = rerollTranscendentVoidPassive(entry.transcendent);
        syncPaleBlueDotPassivePoints(previousTranscendent, entry.transcendent);
        addLog(`✨ 초월 공허 패시브 수치 재굴림: ${formatTranscendentVoidPassive(entry.transcendent).replace(/<[^>]*>/g, '')}`, 'loot-unique');
        updateStaticUI();
        return;
    }
    if (entry.transcendent) return addLog('초월 공허 패시브에는 마법의 새싹을 사용할 수 없습니다.', 'attack-monster');
    game.currencies[currencyKey]--;
    if (currencyKey === 'magicBud') {
        let nextStats = [];
        let optionCount = 1 + Math.floor(Math.random() * 2);
        for (let index = 0; index < optionCount; index++) {
            let next = rollVoidPassiveOption(nextStats);
            if (next) nextStats.push(next);
        }
        entry.stats = nextStats;
    }
    entry.rarity = entry.stats.length > 0 ? 'magic' : 'normal';
    addLog(`🕳️ 공허 패시브에 ${ORB_DB[currencyKey].name} 사용: ${getVoidPassiveEffectLabel(node.id).replace(/<[^>]*>/g, '')}`, 'loot-magic');
    updateStaticUI();
}

function getPassiveConnectionNodeIds() {
    let result = new Set((game && Array.isArray(game.passives) ? game.passives : []).filter(id => isPassiveNodeAvailable(id)).map(String));
    const rootId = getPassiveTreeRootNodeId();
    if (isPassiveNodeAvailable(rootId)) result.add(rootId);
    return result;
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
    addLog('☄️ 말라가는 줄기 위로 검은 별이 떨어지기 시작했다.', 'loot-unique');
    queueTutorialNotice('meteor_unlocked', '운석 낙하 지점', '검은 별이 떨어지기 시작했습니다.\n액트 7을 넘긴 사냥터에서 사냥하면 하늘의 균열 게이지가 찹니다.\n게이지가 100%가 되면 ‘지도 → 탐험 → 운석 낙하’에 한 번 들어갈 수 있습니다.', 'tab-map');
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
        addLog('☄️ 희귀 이상 현상 관측! 균열 게이지 +8%', 'loot-unique');
    } else {
        st.skyRiftGauge = clampNumber((st.skyRiftGauge || 0) + 3, 0, 100);
        addLog('✨ 이상 현상 관측: 균열 게이지 +3%', 'loot-magic');
    }
    return true;
}

/** 별자리 관측: 아틀라스 패시브 '떨어지는 별'이 있으면 운석 정산마다 능력치 하나를 관측한다. 루프가 바뀌어도 남는다. */
function grantConstellationObservationReward() {
    if (!atlasPassives.has(game, 'constellation')) return;
    let st = ensureMeteorSiteState();
    let pick = rndChoice(METEOR_CONSTELLATION_POOL);
    st.constellationBuff = { stat: pick.stat, label: pick.label, val: pick.val, observedAt: Date.now(), permanent: true };
    addLog(`🌠 별자리 관측: ${pick.label} +${pick.val}${pick.stat === 'flatHp' ? '' : '%'} (루프 후 유지)`, 'loot-unique');
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
        addLog('☄️ 하늘 균열이 완전히 벌어졌다. 운석 낙하 지점으로 향할 수 있다.', 'loot-rare');
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
    if (st.diving) { addLog('낚시 전략은 수면에서만 변경할 수 있습니다.', 'attack-monster'); return false; }
    if (st.fishingStrategy === strategyId) return true;
    st.fishingStrategy = strategyId;
    addLog(`${strategy.icon} 낚시 전략을 '${strategy.name}'(으)로 변경했습니다.`, 'loot-magic');
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
    addLog(`📘 심해 도감 '${milestone.label}' 보상을 획득했습니다.`, 'loot-unique');
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
    if (typeof updateStaticUI === 'function') updateStaticUI();
    return true;
}

function advanceOceanDiveFromKill(zone) {
    // 일반 심해 전투 구간 전체 완료 시 호출한다. 개별 몬스터나 가디언 보상과 중복하지 않는다.
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    if (Math.random() < 0.06) awardCurrency('reefFragment', 1);
    // 수심은 한 지역 안에서 실제 잠수 시간만큼 연속 진행한다. 웨이브 종료 때
    // 수십 m를 순간 가산하면 다시 구역 단위 진행처럼 보이므로 보상은 낚시만 준다.
    gainOceanFishingGaugeFromCombat(zone);
}

function consumeOceanOxygenOnAttack() {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving || !isInOceanZone()) return 0;
    // 호환용 공개 진입점은 유지하되 공격 속도에 따른 산소 페널티는 적용하지 않는다.
    // 실제 소모는 tickOceanOxygen의 시간 기반 배수 한 곳에서만 처리한다.
    return 0;
}

function gainOceanFishingGaugeFromCombat(zone) {
    let st = ensureOceanState();
    if (!st.unlocked || !st.diving) return;
    // 낚시 게이지는 구역 강도(수심 단계)에 따라 세분화: 얕은(약한) 곳에선 조금, 깊은(강한) 곳에선 조금 더 오른다.
    let depthTier = Math.max(0, Math.floor(zone?.depthTier ?? getOceanDepthTier(st.depthM)));
    let strategy = getOceanFishingStrategyDef(st);
    let collectionGainPct = getOceanFishCollectionBonus('gaugeGainPct', st);
    // Five shallow clears introduce the first catch; deeper water improves pace up to tier20.
    let gain = (20 + Math.min(depthTier, 20) * 2) * getOceanFishingGaugeGainMul();
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
    let logType = rarityRank >= 4 ? 'loot-unique' : (rarityRank >= 2 ? 'loot-rare' : 'loot-magic');
    addLog(`${guaranteed ? '✨ 희귀 조짐 적중! ' : '🐟 '}${OCEAN_FISH_DB[picked].name}을(를) 낚았습니다!`, logType);
    let discoveredCount = getOceanFishCollectionProgress(st).discoveredCount;
    if (!wasDiscovered && OCEAN_FISH_COLLECTION_MILESTONES.some(row => row.required === discoveredCount)) {
        addLog(`📘 심해 도감 ${discoveredCount}/${Object.keys(OCEAN_FISH_DB).length} — 수령 가능한 보상이 생겼습니다.`, 'loot-rare');
        game.noti.map = true;
    }
    return picked;
}

safeExposeGlobals({ getOceanFishingStrategyDef, getOceanFishCollectionProgress, getOceanFishCollectionBonus, setOceanFishingStrategy, claimOceanFishCollectionMilestone });


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
    if (!st.unlocked) return false;
    if (st.reefInstalled >= 10) return addLog('암초 조각을 더 설치할 수 없습니다 (최대치).', 'attack-monster');
    if ((game.currencies.reefFragment || 0) < 1) return addLog('암초 조각이 부족합니다.', 'attack-monster');
    game.currencies.reefFragment -= 1;
    st.reefInstalled = Math.max(0, Math.floor(st.reefInstalled || 0)) + 1;
    addLog(`🪸 암초 조각을 설치했습니다. (낚시 게이지 충전 +${(st.reefInstalled * 15)}%)`, 'loot-rare');
    queueImportantSave(200);
}

/** 연결 판정 재료: 직업 시작점, 블랙홀 초월 공허(무료 연결 거점), 안드로메다 초월 공허 반경 안의 노드(연결 없이 할당), 길 간선. */
function getPassiveRouting(owner = game) {
    const allocated = new Set(owner.passives || []);
    return { root: getPassiveTreeRootNodeId(owner), virtual: passiveRouting.transcendentNodeIds(owner, 'blackHole'),
        free: passiveRouting.freeNodes(PASSIVE_TREE, owner), edges: PASSIVE_TREE.edges.filter(edge => isPassiveTreePathEdge(edge, allocated)) };
}

function enterOceanDive() {
    const reason = getZoneTravelBlockReason(OCEAN_ZONE_ID);
    if (reason) { addLog(reason, 'attack-monster'); return false; }
    if (isBeehiveRunLockedForMapTravel()) { warnBeehiveMapTravelBlocked(); return false; }
    if (ensureBeyondBoundaryState(game).activeRun) {
        addLog('경계 너머 도전을 먼저 마치거나 포기하세요.', 'attack-monster'); return false;
    }
    let st = ensureOceanState();
    if (!st.unlocked) { addLog('아직 심해로 진입할 수 없습니다.', 'attack-monster'); return false; }
    if (st.diving) return false;
    st.depthM = Math.max(0, Math.floor(st.checkpointM || 0));
    st.oxygenMax = Math.max(1, Math.floor(getOceanOxygenMax()));
    st.oxygenCur = st.oxygenMax;
    st.diving = true;
    st.lastTickAt = getCombatTime();
    game.currentZoneId = OCEAN_ZONE_ID;
    addLog(`🌊 심해 ${st.depthM}m 지점부터 잠수를 시작합니다.`, 'loot-rare');
    return true;
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
    // 기본 장비로 약 2분 안에 첫 500m 경계에 닿고 산소가 남도록 잡았다.
    // 이후에는 수압·해류와 영구 업그레이드가 장기 잠수의 성장축이 된다.
    let depthPerSec = 4 * speedBonus * (1 + gearDepthGainPct / 100);
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

const SEA_GIFT_RANDOM_ORB_KEYS = ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'emberBranch', 'pruningShears'];
const SEA_GIFT_RECIPES = [
    // --- 일반 레시피 ---
    { id: 'reefBundle', desc: '【재화 획득: 암초 조각 ×2】 얕은 바다 어종을 모아 암초 조각으로 가공합니다.', requires: { shallowSilverfin: 5 }, effect: { type: 'currency', key: 'reefFragment', amount: 2 } },
    { id: 'tidalCharm', desc: '【재화 획득: 심해의 파편 ×1】 조류 장어로 장비 베이스 옵션을 다시 굴리는 심해의 파편을 만듭니다.', requires: { tidalEel: 4 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 1 } },
    { id: 'glowfinEssence', desc: '【재화 획득: 심해의 파편 ×2】 발광 송어로 베이스 옵션 재제련에 쓰는 심해의 파편을 정제합니다.', requires: { glowfinTrout: 3, tidalEel: 2 }, effect: { type: 'currency', key: 'oceanRerollShard', amount: 2 } },
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
    { id: 'tidelordRefine', desc: '【장비 강화: 계열 재굴림(등급 +1)】 해류군주 비단잉어와 발광 송어로 원하는 계열의 기존 옵션만 다시 굴립니다(다른 줄 보존).', requires: { tidelordKoi: 2, glowfinTrout: 3 }, effect: { type: 'taggedReroll', tierBoost: 1, allMatching: true } },
    { id: 'crushDepthScar', desc: '【장비 강화: 심해 전용 고정 옵션 부착】 무지갯빛 공포와 해류군주 비단잉어, 심연 등불고기로 심해 전용 고정 옵션을 부착합니다.', requires: { prismaticHorror: 2, tidelordKoi: 1, abyssAngler: 2 }, effect: { type: 'fixedBenchOption' } },
    { id: 'doubleSealForge', desc: '【장비 강화: 옵션 2줄 동시 영구 봉인 + 나머지 1줄 즉시 재단】 무지갯빛 공포와 발광 송어로 옵션 두 줄을 동시에 봉인하고, 남은 줄은 즉시 재단합니다.', requires: { prismaticHorror: 3, glowfinTrout: 4 }, effect: { type: 'lockMod', count: 2, bonusTaggedReroll: true } },
    { id: 'voidPureRefine', desc: '【장비 강화: 강제 희귀 등급 승급】 무지갯빛 공포와 공허 리바이어던 새끼, 은빛 비늘치로 장비를 강제로 희귀 등급으로 승급시킵니다.', requires: { prismaticHorror: 2, voidLeviathanSpawn: 1, shallowSilverfin: 5 }, effect: { type: 'upgradeRarity', force: true } },
    { id: 'leviathanRemnant', desc: '【장비 강화: 최상급 태그 옵션 확정(등급 +3) + 나쁜 옵션 1줄 무료 제거】 리바이어던 본체와 심연 등불고기로 최상급 태그 옵션을 확정 부여하며, 동시에 나쁜 줄 하나를 무료로 제거합니다.', requires: { kingLeviathan: 1, abyssAngler: 3 }, effect: { type: 'guaranteedTaggedMod', tierBoost: 3, bonusRemoveMod: true } },
    { id: 'leviathanSigil', desc: '【장비 강화: 이 레시피 전용 최상위 고정 옵션 부착】 리바이어던 본체와 해류군주 비단잉어, 공허 리바이어던 새끼로 오직 이 레시피로만 얻는 최상위 고정 옵션을 부착합니다.', requires: { kingLeviathan: 2, tidelordKoi: 2, voidLeviathanSpawn: 1 }, effect: { type: 'fixedBenchOption', topTier: true } }
];
const SEA_GIFT_ITEM_EFFECT_TYPES = new Set(['guaranteedMod', 'guaranteedTaggedMod', 'removeMod', 'upgradeRarity', 'lockMod', 'taggedReroll', 'fixedBenchOption', 'safeReroll', 'twinReroll', 'tierStepUp', 'convertCategoryMod', 'echoMod']);

function getSeaGiftRecipeStatus(recipeId, targetItem) {
    let recipe = SEA_GIFT_RECIPES.find(r => r.id === recipeId);
    if (!recipe) return null;
    let st = ensureOceanState();
    const materialReady = Object.keys(recipe.requires).every(key => (st.fishStock[key] || 0) >= recipe.requires[key]);
    const needsItem = SEA_GIFT_ITEM_EFFECT_TYPES.has(recipe.effect.type);
    const item = needsItem ? (targetItem || getSelectedCraftItem()) : null;
    let reason = '';
    if (!st.unlocked) reason = '심해 해금 필요';
    else if (!materialReady) reason = '재료 부족';
    else if (needsItem) reason = getSeaGiftTargetBlockReason(item);
    return { recipe, ready: !reason, materialReady, reason, item, owned: st.fishStock };
}

function getSeaGiftTargetBlockReason(item) {
    if (!item) return '대상 선택 필요';
    if (!isSeaGiftEquipmentTarget(item)) return '일반 장비만 가공 가능';
    if (game.woodsmanBuildLock) return '세팅 변경 잠김';
    if (item.hallReplica) return '전당 소장품 가공 불가';
    return item.corrupted ? '타락 장비 가공 불가' : '';
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
    if (!stat || stat.lockedByHoney || stat.lockedByRift) return null;
    let probe = { ...item, stats: item.stats.filter((row, rowIndex) => rowIndex !== index) };
    let mod = getAvailableMods(probe).find(row => (row.statId || row.id) === stat.id);
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
    if (effect.bonusRemoveMod && editable.length < 2) return '최상급 옵션을 부여하고 다른 옵션을 제거하려면 봉인되지 않은 옵션이 2줄 이상 필요합니다.';
    const pool = getAvailableMods(item).filter(mod => effect.type !== 'guaranteedTaggedMod' || !category || getModCategory(mod) === category);
    const choice = chooseSeaGiftGuaranteedLine(item, pool, editable);
    if (!choice) return '이 장비에 추가로 부여할 수 있는 옵션이 없습니다.';
    const maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1)) + Math.max(0, Math.floor(effect.tierBoost || 0));
    const rolled = rollAffixValue(choice.mod, maxTier);
    if (choice.index < 0) item.stats.push(rolled); else item.stats[choice.index] = rolled;
    if (effect.bonusRemoveMod) removeWorstSeaGiftMod(item, choice.index);
    updateItemName(item);
    return '';
}
/** 바뀔 줄은 같은 종류의 가장 낮은 단계 줄(예전에는 첫 줄). 봉인 안 된 줄이 없으면 자리가 남는 종류로 덧붙인다(index -1). */
function chooseSeaGiftGuaranteedLine(item, pool, editable) {
    if (editable.length > 0) return equipmentCrafting.pickReplacement(item, pool, editable.map(row => row.index), pickWeightedMod, 'lowest');
    const mod = pickWeightedMod(pool.filter(row => equipmentCrafting.fitsRoom(equipmentCrafting.affixRoom(item), row)));
    return mod ? { mod, index: -1 } : null;
}

/** 메아리 줄은 원본과 같은 종류다. 그 종류에 자리가 없으면 같은 종류의 줄만 바꿔 끼울 수 있다. */
function getSeaGiftEchoTargets(item, editableIdx, srcIdx) {
    const kind = equipmentCrafting.storedAffixKind(item, item.stats[srcIdx]), room = equipmentCrafting.affixRoom(item);
    const others = editableIdx.filter(index => index !== srcIdx);
    if (!room || kind === 'special' || room[kind] > 0) return others;
    return others.filter(index => equipmentCrafting.storedAffixKind(item, item.stats[index]) === kind);
}

function removeWorstSeaGiftMod(item, excludedIndex) {
    let candidates = (item.stats || []).map((stat, index) => ({ stat, index }))
        .filter(row => row.index !== excludedIndex && row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift)
        .sort((left, right) => (Number(left.stat.tier) || 0) - (Number(right.stat.tier) || 0));
    if (candidates.length === 0) return false;
    item.stats.splice(candidates[0].index, 1);
    return true;
}

const applySeaGiftLockEffect = function (item, effect, category) {
    let editable = (item.stats || []).filter(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    let count = Math.max(1, Math.floor(effect.count || 1));
    let requiredEditable = count + (effect.bonusTaggedReroll ? 1 : 0);
    if (editable.length < requiredEditable) {
        let message = editable.length === 0
            ? '봉인할 수 있는 옵션 줄이 없습니다.'
            : `이 제작에는 봉인되지 않은 옵션이 ${requiredEditable}줄 이상 필요합니다.`;
        addLog(message, 'attack-monster');
        return false;
    }
    let rerollMod = null;
    if (effect.bonusTaggedReroll) {
        // 재단되는 줄은 봉인하고 남은 첫 줄(editable[count]). 새 줄은 그 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서.
        const room = equipmentCrafting.affixRoom(item, item.rarity, editable[count]);
        let pool = getAvailableMods(item).filter(mod => (!category || getModCategory(mod) === category) && equipmentCrafting.fitsRoom(room, mod));
        rerollMod = pickRandomMods(pool, 1)[0];
        if (!rerollMod) { addLog('해당 계열로 재단할 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
    }
    for (let i = 0; i < count; i++) editable[i].lockedByHoney = true;
    if (!rerollMod) return true;
    let idx = (item.stats || []).findIndex(stat => stat && !stat.lockedByHoney && !stat.lockedByRift);
    item.stats[idx] = rollAffixValue(rerollMod, getItemCraftTier(item));
    return true;
};

function isSeaGiftEquipmentTarget(item) {
    if (!item || !Array.isArray(item.stats) || typeof getEquipCandidateSlots !== 'function') return false;
    return getEquipCandidateSlots(item).some(slot => Object.prototype.hasOwnProperty.call(game.equipment || {}, slot));
}

function getSelectedSeaGiftEquipmentTarget() {
    let item = typeof getSelectedCraftItem === 'function' ? getSelectedCraftItem() : null;
    return isSeaGiftEquipmentTarget(item) ? item : null;
}

function craftSeaGift(recipeId, targetItem, options) {
    const status = getSeaGiftRecipeStatus(recipeId, targetItem);
    if (!status) return false;
    if (!status.ready) { addLog(`바다의 선물: ${status.reason}`, 'attack-monster'); return false; }
    let recipe = status.recipe;
    let st = ensureOceanState();
    let effect = recipe.effect;
    let item = status.item;
    let category = options && options.category;
    if (effect.type === 'guaranteedMod' || effect.type === 'guaranteedTaggedMod') {
        const refusal = applySeaGiftGuaranteedMod(item, effect, category);
        if (refusal) { addLog(refusal, 'attack-monster'); return false; }
    } else if (effect.type === 'removeMod') {
        if (!removeOneModFromItem(item)) { addLog('제거할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        updateItemName(item);
    } else if (effect.type === 'upgradeRarity') {
        if (item.rarity === 'rare' || item.rarity === 'unique') {
            addLog('이미 희귀 이상인 장비는 더 승급할 수 없습니다.', 'attack-monster');
            return false;
        }
        if (effect.force) item.rarity = 'rare';
        else if (item.rarity === 'normal') item.rarity = 'magic';
        else if (item.rarity === 'magic') item.rarity = 'rare';
        updateItemName(item);
    } else if (effect.type === 'lockMod') {
        if (!applySeaGiftLockEffect(item, effect, category)) return false;
    } else if (effect.type === 'taggedReroll') {
        let rows = getSeaGiftRerollRows(item, category);
        if (rows.length === 0) { addLog('해당 계열의 재굴림 가능한 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let targets = effect.allMatching ? rows : [rows[Math.floor(Math.random() * rows.length)]];
        targets.forEach(row => { item.stats[row.index] = rollSeaGiftExistingAffix(row, effect.tierBoost); });
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
        let rows = getSeaGiftRerollRows(item);
        if (rows.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let row = rows[Math.floor(Math.random() * rows.length)];
        let rolled = rollSeaGiftExistingAffix(row, 0);
        if ((Number(rolled.val) || 0) >= (Number(row.stat.val) || 0)) item.stats[row.index] = rolled;
        else addLog('🌊 재굴림 결과가 기존보다 낮아 적용을 취소했습니다.', 'loot-magic');
        updateItemName(item);
    } else if (effect.type === 'twinReroll') {
        let rows = getSeaGiftRerollRows(item);
        if (rows.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        rows.sort(() => Math.random() - 0.5).slice(0, 2)
            .forEach(row => { item.stats[row.index] = rollSeaGiftExistingAffix(row, 0); });
        updateItemName(item);
    } else if (effect.type === 'tierStepUp') {
        let rows = getSeaGiftRerollRows(item).filter(row => {
            let cap = Array.isArray(row.mod.tierValues) ? row.mod.tierValues.length : 20;
            return Math.max(1, Math.floor(Number(row.stat.tier) || 1)) < cap;
        });
        if (rows.length === 0) { addLog('등급을 올릴 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
        let row = rows[Math.floor(Math.random() * rows.length)];
        item.stats[row.index] = rollSeaGiftExistingAffix(row, 1);
        updateItemName(item);
    } else if (effect.type === 'echoMod') {
        if ((item.stats || []).some(s => s && s.isEchoMod)) { addLog('이미 메아리 옵션을 가진 장비에는 다시 사용할 수 없습니다.', 'attack-monster'); return false; }
        let editableIdx = (item.stats || []).map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
        if (editableIdx.length < 2) { addLog('메아리에는 봉인되지 않은 옵션이 2줄 이상 필요합니다.', 'attack-monster'); return false; }
        let maxTier = editableIdx.reduce((m, i) => Math.max(m, Number(item.stats[i].tier) || 0), 0);
        let topIdx = editableIdx.filter(i => (Number(item.stats[i].tier) || 0) === maxTier);
        let srcIdx = topIdx[Math.floor(Math.random() * topIdx.length)];
        let targetPool = getSeaGiftEchoTargets(item, editableIdx, srcIdx);
        if (targetPool.length === 0) { addLog('메아리 줄을 넣을 같은 종류 자리가 없습니다(접두 3, 접미 3).', 'attack-monster'); return false; }
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
        let choice = equipmentCrafting.pickReplacement(item, pool, editableIdx, pickWeightedMod);
        if (!choice) { addLog('해당 계열로 변환할 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
        item.stats[choice.index] = rollAffixValue(choice.mod, getItemCraftTier(item));
        updateItemName(item);
    }
    Object.keys(recipe.requires).forEach(key => { st.fishStock[key] = Math.max(0, Math.floor(st.fishStock[key] || 0) - recipe.requires[key]); });
    addLog(`🎁 [바다의 선물] 제작이 완료되었습니다.`, 'loot-rare');
    if (item && typeof normalizeItem === 'function') normalizeItem(item);
    queueImportantSave(200);
    return true;
}

safeExposeGlobals({ isSeaGiftEquipmentTarget, getSelectedSeaGiftEquipmentTarget });

function rerollSingleBaseOption(item, costCurrency, costAmount) {
    if (!item || !Array.isArray(item.stats) || item.stats.length === 0) return false;
    let key = costCurrency || 'oceanRerollShard';
    let cost = Math.max(0, Math.floor(costAmount || 1));
    if ((game.currencies[key] || 0) < cost) { addLog('재화가 부족합니다.', 'attack-monster'); return false; }
    let editableIdx = item.stats.map((s, i) => (s && !s.lockedByHoney && !s.lockedByRift) ? i : -1).filter(i => i >= 0);
    if (editableIdx.length === 0) { addLog('재굴림할 수 있는 옵션 줄이 없습니다.', 'attack-monster'); return false; }
    let choice = equipmentCrafting.pickReplacement(item, getAvailableMods(item), editableIdx, mods => pickRandomMods(mods, 1)[0]);
    if (!choice) { addLog('이 장비에서 새로 굴릴 수 있는 옵션이 없습니다.', 'attack-monster'); return false; }
    let maxTier = Math.max(1, Math.floor(getItemCraftTier(item) || 1));
    game.currencies[key] = (game.currencies[key] || 0) - cost;
    item.stats[choice.index] = rollAffixValue(choice.mod, maxTier, { roundInteger: true });
    updateItemName(item);
    addLog(`🌊 ${item.name || '장비'}의 베이스 옵션 한 줄을 다시 굴렸습니다.`, 'loot-rare');
    return true;
}

function grantMeteorEquipmentReward() {
    const item = generateEquipmentDrop({ isBoss: true }, { minimumRarity: 'rare' });
    return item && addItemToInventory(item, { guaranteedKeep: true }) ? item : null;
}

/** 운석 낙하 정산(2026-10-01 정리): 희귀 이상 장비 하나. 운석 고유 '낙성의 발자취'는 이 지역 전용 드롭으로 따로 떨어진다.
 * 운석 파편 · 별쐐기 재료(6단계)와 별가루(7단계)는 없어졌다. 별자리 관측은 아틀라스 패시브 '떨어지는 별'. */
function grantMeteorEncounterRewards() {
    let st = ensureMeteorSiteState();
    let encounterTier = Math.max(1, Math.floor(st.activeMeteorTier || 1));
    const item = grantMeteorEquipmentReward();
    addLog(`☄️ 운석 ${encounterTier}단계 정산${item ? ` · [${item.name}]` : ''}`, 'loot-rare', item ? { item } : {});
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
    const adjacency = getPassiveTreeAdjacency();
    while (queueIndex < queue.length && !previous.has(targetNodeId)) {
        let current = queue[queueIndex++];
        (adjacency.get(String(current)) || []).forEach(next => {
            if (previous.has(next) || !isPassiveNodeAvailable(next)) return;
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
    return path.reverse();
}

function getPassiveKeystoneConflict(path) {
    const owned = new Set(game.passives || []), pending = new Set(path || []);
    const corruptId = PASSIVE_KEYSTONE_NODE_ID_BY_TITLE['타락한 복음'];
    const tripleId = PASSIVE_KEYSTONE_NODE_ID_BY_TITLE['삼중 계시'];
    if ((owned.has(corruptId) && pending.has(tripleId)) || (owned.has(tripleId) && pending.has(corruptId))) {
        return '타락한 복음과 삼중 계시는 동시에 할당할 수 없습니다.';
    }
    return '';
}

function activatePassivePath(targetNodeId, options) {
    let path = getPassiveActivationPath(targetNodeId);
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

const PASSIVE_TREE_PRESET_SLOTS = 3;

function getCurrentPassiveNodeId(rawId) {
    if (typeof rawId !== 'string') return rawId;
    if (typeof PASSIVE_NODE_ID_MIGRATIONS !== 'object') return rawId;
    return PASSIVE_NODE_ID_MIGRATIONS[rawId] || rawId;
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
    let fallbackName = `프리셋 ${slotIndex + 1}`;
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

function runPassiveTreeAutoInvest() {
    let planner = ensurePassiveTreePlannerState();
    let preset = planner.presets[planner.activeSlot];
    if (!planner.autoInvest || !preset || game.woodsmanBuildLock) return { nodes: 0, points: 0 };
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
    PASSIVE_TREE.edges.forEach(edge => {
        if (!isPassiveTreePathEdge(edge)) return;
        if (!isPassiveNodeAvailable(edge.from) || !isPassiveNodeAvailable(edge.to)) return;
        if (connectionNodes.has(String(edge.from))) reachableNodes.add(edge.to);
        if (connectionNodes.has(String(edge.to))) reachableNodes.add(edge.from);
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
let activeTutorial = null;
let activeTutorialStep = 0;
let activeRewardZoneId = null;
let divineBannerTimer = null;
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

/** 아직 투자하지 않은 캐릭터: 시작점 이웃이 한쪽에만 있어 경계 가운데로 맞추면 시작점이 화면 끝(휴대폰은 안내 카드 밑)에
 * 걸렸다 — 시작점이 가운데보다 높이의 10% 넘게 아래, 또는 가장자리 60px 안에 있지 않게 카메라만 옮긴다(배율은 그대로). */
function keepPassiveRootInView(width, height) {
    const root = getPassiveTreeRootNode();
    if (!root) return;
    const dx = camX + root.x * camZoom, dy = camY + root.y * camZoom, limitX = width / 2 - 60;
    camX -= dx - Math.max(-limitX, Math.min(limitX, dx));
    camY -= dy - Math.max(-(height / 2 - 60), Math.min(height * 0.1, dy));
}

function fitPassiveCameraToBounds(force) {
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
    camZoom = clampNumber(defaultZoom, 0.14, 0.72);
    const toolbarOffsetY = invested ? 0 : 56;
    camX = -(bounds.minX + bounds.maxX) * 0.5 * camZoom;
    camY = -(bounds.minY + bounds.maxY) * 0.5 * camZoom + toolbarOffsetY;
    if (!invested) keepPassiveRootInView(width, height);
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
        payload = { ...payload, impactAt: latestPlayerSwingImpactAt, motionVariantSeed: Math.random() };
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

function clearBattleVisualBacklog() {
    battleFx = [];
    battleVisualState.lootEpoch = (battleVisualState.lootEpoch || 0) + 1;
    latestPlayerSwingImpactAt = 0;
    battleVisualState.projectiles = [];
    battleVisualState.damageTexts = [];
    battleVisualState.skillProjectiles = [];
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

if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('visibilitychange', () => setBattleFxSuppressed(!!document.hidden));
}
safeExposeGlobals({ setBattleFxSuppressed });

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
        if (now - (battleVisualState.enemyGhostPos[enemyId].stamp || 0) > 1200) delete battleVisualState.enemyGhostPos[enemyId];
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

const MAX_BATTLE_DAMAGE_TEXTS = 48;
const DAMAGE_TEXT_STACK_WINDOW_MS = 520;
const DAMAGE_TEXT_STACK_SPACING = 23;
const DAMAGE_TEXT_STACK_SHIFT_MS = 90;
const DAMAGE_TEXT_MAX_STACK = 9;

function getDamageTextStackShift(text, now) {
    let from = Number(text && text.stackShiftFrom) || 0;
    let to = Number(text && text.stackShiftTo) || 0;
    let startedAt = Number(text && text.stackShiftStart);
    if (!Number.isFinite(startedAt) || from === to) return to;
    let t = clampNumber((now - startedAt) / DAMAGE_TEXT_STACK_SHIFT_MS, 0, 1);
    let eased = 1 - Math.pow(1 - t, 3);
    return from + (to - from) * eased;
}

function queueDamageTextStackShift(activeTexts, start, x, y, enemyHit) {
    activeTexts.forEach(text => {
        let age = start - Number(text && text.start);
        if (!Number.isFinite(age)
            || age < 0
            || age > DAMAGE_TEXT_STACK_WINDOW_MS
            || !!text.enemyHit !== !!enemyHit
            || Math.abs(Number(text.x) - x) > 34
            || Math.abs(Number(text.y) - y) > 40) return;
        let currentShift = getDamageTextStackShift(text, start);
        let priorTarget = Math.min(currentShift, Number(text.stackShiftTo) || 0);
        text.stackShiftFrom = currentShift;
        text.stackShiftTo = Math.max(-DAMAGE_TEXT_STACK_SPACING * DAMAGE_TEXT_MAX_STACK, priorTarget - DAMAGE_TEXT_STACK_SPACING);
        text.stackShiftStart = start;
    });
}

function mergeDamageTextByKey(activeTexts, config, start, x, y) {
    if (!config.aggregateKey || config.bodyCue || config.dot || config.miss) return false;
    let text = activeTexts.find(row => row && row.aggregateKey === config.aggregateKey);
    let nextValue = Number(config.value);
    if (!text || !Number.isFinite(nextValue)) return false;
    text.value = Math.max(0, Number(text.value) || 0) + Math.max(0, nextValue);
    text.hitCount = Math.max(1, Math.floor(Number(text.hitCount) || 1)) + 1;
    text.crit = text.crit || !!config.crit;
    text.x = x;
    text.y = y;
    text.duration = Math.max(text.duration, Number(config.duration) || 0);
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
    if (!config.bodyCue) queueDamageTextStackShift(activeTexts, start, x, y, config.enemyHit);
    activeTexts.push({
        start: start,
        duration: getDamageTextDuration(config),
        x: x,
        y: y,
        offsetX: 0,
        offsetY: 0,
        driftX: 0,
        side: Math.sign(Number(config.side) || 0),
        stackShiftFrom: 0,
        stackShiftTo: 0,
        stackShiftStart: start,
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
// 치명타·강타 숫자는 처음 잠깐 크게 튀어나왔다가 제자리 크기로 돌아온다(표시 전용).
function applyDamageTextPop(ctx, text, t, anchor) {
    if (text.bodyCue || (!text.crit && text.impactTier !== 'heavy' && text.impactTier !== 'annihilate')) return;
    const pop = 1 + 0.38 * (1 - clampNumber(t / 0.16, 0, 1));
    ctx.translate(anchor.x, anchor.y);
    ctx.scale(pop, pop);
    ctx.translate(-anchor.x, -anchor.y);
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

function drawDamageTexts(ctx, now) {
    (battleVisualState.damageTexts || []).forEach(text => {
        let elapsed = now - Number(text.start);
        if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > text.duration) return;
        let t = clampNumber(elapsed / text.duration, 0, 1);
        let easedRise = 1 - Math.pow(1 - t, 2);
        let rise = text.bodyCue ? 10 : ((text.dot ? 14 : 20) + (text.crit ? 5 : 0));
        let x = text.x;
        let y = text.y + getDamageTextStackShift(text, now) - rise * easedRise;
        ctx.save();
        ctx.globalAlpha = getDamageTextPeakAlpha(text) * (t < 0.62 ? 1 : Math.max(0, (1 - t) / 0.38));
        // Sizes chosen for the pixel font over a busy floor (2026-10-05 user request: numbers were hard to see).
        const tierSize = text.impactTier === 'annihilate' ? 32 : (text.impactTier === 'heavy' ? 28 : 0);
        const fontSize = text.bodyCue ? 20 : (tierSize || (text.miss ? 16 : (text.dot ? 17 : (text.crit ? 25 : 21))));
        ctx.font = `800 ${fontSize}px "DOSSaemmul", "Malgun Gothic", sans-serif`;
        ctx.textAlign = text.side > 0 ? 'left' : (text.side < 0 ? 'right' : 'center');
        applyDamageTextPop(ctx, text, t, { x, y });
        let textValue = text.miss ? String(text.value) : getDamageTextLabel(text);
        const strong = isStrongDamageText(text);
        // Strokes straddle the glyph edge, so 2px reads as a 1px dark outline. Only crits and heavy hits keep a glow.
        ctx.lineWidth = text.impactTier === 'annihilate' ? 4 : (strong ? 3.5 : 3);
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(2,5,9,0.92)';
        ctx.shadowColor = text.impactTier === 'annihilate' ? 'rgba(255,155,72,.5)' : (strong ? 'rgba(255,211,102,0.38)' : 'transparent');
        ctx.shadowBlur = text.bodyCue ? 0 : (text.impactTier === 'annihilate' ? 7 : (strong ? 4 : 0));
        ctx.strokeText(textValue, x, y);
        // The fill sits inside the stroke, so the stroke pass already casts the whole glow.
        ctx.shadowBlur = 0;
        ctx.fillStyle = getDamageTextFillColor(text);
        ctx.fillText(textValue, x, y);
        if (!text.bodyCue && !text.miss && Math.floor(Number(text.hitCount) || 1) > 1) {
            let hitLabel = `${Math.floor(text.hitCount)}타`;
            let valueWidth = ctx.measureText(textValue).width;
            let labelX = x + (text.side > 0 ? valueWidth : (text.side < 0 ? 0 : valueWidth / 2)) + 4;
            ctx.font = `800 10px "DOSSaemmul", "Malgun Gothic", sans-serif`;
            ctx.textAlign = 'left';
            ctx.lineWidth = 1.2;
            ctx.strokeText(hitLabel, labelX, y - 3);
            ctx.fillStyle = '#c8d9e8';
            ctx.fillText(hitLabel, labelX, y - 3);
        }
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
    // World-tree gems draw their own art (the movement gems of the 이동 스킬 slot swing without the generic effect).
    if (SKILL_GEM_VFX_PROFILES[skillName]?.family === 'worldTree') return false;
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
        // 실제 피해 이벤트가 이미지 VFX를 생성한다. 애니메이션 예상 프레임에서 별도
        // 효과를 쌓으면 빗나간 공격에도 효과가 나오고 동일 배열이 중복 사용된다.
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
const TUTORIAL_GUIDES = {
    tutorial_battle_basics: [
        { title: '전투 화면 읽기', body: '전투는 자동으로 진행되지만, 화면은 현재 전투가 왜 막히는지 판단할 수 있도록 구성되어 있습니다.', bullets: ['파란 칸은 내 위치, 붉은 칸은 적 위치입니다.', '노란 강조는 현재 공격 대상, 청록 강조는 스킬이 닿는 범위입니다.', '적이 사거리 밖이면 캐릭터가 먼저 이동한 뒤 공격합니다.'], tip: '처음에는 피해량보다 생명력 막대와 적의 밀집도를 먼저 보세요.' },
        { title: '공격과 피해 구분', body: '밝은 흰색·금색 숫자는 내가 준 피해, 붉은 숫자는 내가 받은 피해입니다.', bullets: ['금색 숫자는 치명타입니다.', '작게 반복되는 원소색 숫자는 지속 피해입니다.', '체력 막대 뒤에 남는 주황색은 방금 잃은 피해량입니다.'], tip: '붉은 숫자가 연속으로 크게 뜨면 장비 방어와 저항을 점검할 때입니다.' },
        { title: '스킬 범위와 태그', body: '젬의 태그에 따라 공격 방식과 연출, 유효 범위가 달라집니다.', bullets: ['강타는 가까운 범위에 큰 충격을 줍니다.', '관통은 직선, 연쇄는 적 사이, 시체 폭발은 처치 지점을 활용합니다.', '공격 범위는 스킬 툴팁의 격자 설명에서 확인할 수 있습니다.'], tip: '넓은 범위가 항상 강한 것은 아닙니다. 단일 보스에는 집중형 스킬이 유리합니다.' },
        { title: '다음 성장 순서', body: '막히면 패시브, 장비, 스킬 젬을 순서대로 확인하면 원인을 찾기 쉽습니다.', bullets: ['패시브: 부족한 생존·화력 축을 보완', '장비: 방어도·회피·보호막과 저항 점검', '스킬: 공격 태그와 보조 젬 연결 확인'], tip: '새 콘텐츠가 열릴 때마다 이와 같은 단계형 설명이 표시됩니다.' }
    ],
    unlock_char: [
        { title: '스킬트리란?', body: '스킬트리 포인트를 사용해 루트에서 가지를 타고 성장 방향을 선택하는 장기 빌드 시스템입니다.', bullets: ['루트 주변의 시작점은 서로 다른 기초 효과를 가집니다.', '활성화한 노드와 연결된 노드만 다음에 선택할 수 있습니다.', '작은 노드는 경로, 큰 장식 노드는 핵심 효과입니다.'], tip: '처음부터 모든 방향을 섞기보다 한 가지 공격 축과 한 가지 방어 축을 정하세요.' },
        { title: '나무 구조 읽기', body: '아래의 루트에서 위쪽 수관으로 갈수록 전문 효과와 큰 보상이 등장합니다.', bullets: ['가지별 색과 배치는 테마를 구분합니다.', '노드에 마우스를 올리면 현재 경로가 강조됩니다.', '검색을 사용하면 원하는 스탯이 있는 가지를 찾을 수 있습니다.'], tip: '화면을 확대하면 선택 가능한 노드의 짧은 효과만 표시되어 글이 겹치지 않습니다.' },
        { title: '첫 포인트 사용', body: '원하는 시작점을 고르고 연결된 경로 노드를 차례로 활성화하세요.', bullets: ['현재 부족한 생존 수단을 먼저 확인합니다.', '사용 중인 스킬 태그와 맞는 공격 효과를 고릅니다.', '큰 노드까지 필요한 포인트 수를 경로로 계산합니다.'], tip: '마지막 단계에서 패시브 화면을 바로 열 수 있습니다.' }
    ],
    unlock_items: [
        { title: '장비와 제작', body: '획득한 장비를 비교·장착하고, 제작 재화로 옵션을 단계적으로 다듬는 콘텐츠입니다.', bullets: ['장비 등급: 일반 → 마법 → 희귀 → 고유', '기본 옵션과 추가 옵션은 서로 다른 역할을 합니다.', '아이템 필터와 자동 해체는 원치 않는 드랍을 정리합니다.'], tip: '처음에는 공격력 한 줄보다 생명력·방어·저항의 균형이 중요합니다.' },
        { title: '오브 사용 순서', body: '오브마다 사용할 수 있는 장비 등급과 역할이 다릅니다.', bullets: ['진화/확장 계열로 일반·마법 장비를 성장시킵니다.', '변화 계열은 옵션을 다시 굴립니다.', '희귀 장비는 빈 옵션과 현재 티어를 확인한 뒤 투자합니다.'], tip: '좋은 베이스가 아닌 장비에 희귀 재화를 너무 일찍 쓰지 마세요.' },
        { title: '드랍 연출 읽기', body: '좋은 아이템일수록 전장에서 더 강한 색과 빛기둥으로 표시됩니다.', bullets: ['파랑: 일반적인 획득', '금색·보라색 기둥: 희귀 재화 또는 희귀 장비', '굵고 긴 빛기둥: 고유 장비나 최상급 재화'], tip: '로그를 꺼도 중요한 드랍 연출은 계속 표시됩니다.' }
    ],
    unlock_skills: [
        { title: '스킬 젬 구성', body: '공격 젬 하나를 중심으로 보조 젬을 연결해 공격 방식과 성능을 바꿉니다.', bullets: ['공격 젬은 기본 행동과 피해 태그를 정합니다.', '보조 젬은 연결 한도 안에서 효과를 추가합니다.', '젬 레벨과 강화 단계가 기본 성능을 높입니다.'], tip: '보조 젬 설명에 현재 공격 젬과 맞지 않는 태그가 없는지 확인하세요.' },
        { title: '태그와 전투 방식', body: '강타·관통·연쇄·범위·지속 피해 같은 태그는 실제 격자 범위와 이펙트에 반영됩니다.', bullets: ['관통: 한 방향의 여러 적을 노림', '연쇄: 떨어진 적 사이를 순서대로 타격', '범위: 대상 주변 또는 자신 주변을 공격'], tip: '스킬 툴팁의 사거리와 반경을 함께 보세요.' },
        { title: '교체 전 확인', body: '새 스킬을 장착하면 보조 젬 호환과 공격 범위도 함께 달라집니다.', bullets: ['현재 장비가 새 태그를 강화하는지 확인', '단일 대상과 다수 대상 중 필요한 역할 선택', '실전에서 대미지 숫자와 이동 빈도 비교'], tip: '사거리가 짧으면 공격 전 이동이 많아질 수 있습니다.' }
    ],
    unlock_map: [
        { title: '지도는 무엇인가?', body: '현재 갈 수 있는 지역, 예상 난이도, 주요 드랍을 보고 다음 사냥터를 선택하는 콘텐츠입니다.', bullets: ['지역마다 몬스터 속성과 보상이 다릅니다.', '보스 지역은 일반 지역보다 위험하지만 보상이 큽니다.', '해금 조건이 표시된 지역은 요구 콘텐츠를 먼저 완료해야 합니다.'], tip: '막힌 지역을 반복하기보다 필요한 장비가 나오는 이전 지역을 활용하세요.' },
        { title: '지역 선택 기준', body: '내 빌드가 버틸 수 있는 난이도와 필요한 보상을 함께 비교합니다.', bullets: ['받는 피해가 급증하면 한 단계 낮춤', '원하는 재화·장비·열쇠의 드랍 지역 확인', '보스 전에 저항과 회복 수단 점검'], tip: '클리어 속도가 너무 느리면 높은 지역이 항상 효율적인 것은 아닙니다.' },
        { title: '후반 지도 콘텐츠', body: '루프가 진행되면 균열, 혼돈계, 심층 보스 같은 별도 등반 콘텐츠가 지도에 추가됩니다.', bullets: ['각 콘텐츠는 고유 입장 조건과 진행도를 가집니다.', '루프에 귀속되는 보상과 영구 보상을 구분하세요.', '특수 열쇠는 해당 보스 목록에서 사용합니다.'], tip: '새 콘텐츠가 열리면 지도 탭의 알림 표시를 먼저 확인하세요.' }
    ],
    unlock_jewel: [
        { title: '주얼의 역할', body: '주얼은 장비 소켓에 끼워 세밀한 스탯을 보완하는 성장 수단입니다.', bullets: ['반지 · 목걸이 · 허리띠에는 소켓이 처음부터 있습니다.', '다른 장비는 공허의 끌로 소켓을 한 칸 뚫습니다.'] },
        { title: '끼우기와 빼기', body: '장비를 선택해 [소켓]을 누르면 보관함의 주얼을 끼우고 뺄 수 있습니다.', bullets: ['뺀 주얼은 보관함으로 돌아갑니다.', '쓰지 않는 주얼은 해체해 주얼 결정을 얻고, 결정 12개로 새 주얼을 뽑습니다.'] }
    ],
    unlock_codex: [
        { title: '고유 아이템 도감', body: '획득한 고유 아이템을 기록하고 수집 진행도에 따른 보너스를 받는 콘텐츠입니다.', bullets: ['새 고유는 처음 획득할 때 도감에 등록됩니다.', '등록 여부와 보유 여부는 서로 다를 수 있습니다.', '수집 보너스는 전체 성장에 누적됩니다.'], tip: '새 도감 전용 필터를 켜면 이미 등록한 고유를 걸러낼 수 있습니다.' },
        { title: '무엇을 확인하나?', body: '도감에서 미등록 항목, 고유 효과, 획득 경로를 확인하세요.', bullets: ['빌드 핵심 고유의 획득 지역 확인', '중복 고유의 보관·해체 판단', '도감 보너스 달성 구간 확인'], tip: '고유 등급이라고 항상 현재 빌드에 강한 것은 아닙니다.' }
    ],
    unlock_market: [
        { title: '거래소의 역할', body: '남는 재화를 필요한 재화로 교환하거나 특수 서비스를 이용하는 보조 성장 콘텐츠입니다.', bullets: ['교환 비율과 보유량을 먼저 확인합니다.', '제작 계획에 필요한 수량만 교환합니다.', '시장 기능은 장비/제작 탭의 하위 메뉴에 있습니다.'], tip: '주력 제작 재화를 전부 다른 재화로 바꾸지 마세요.' },
        { title: '안전한 사용 순서', body: '목표 장비와 필요한 제작 단계를 정한 뒤 부족한 재화만 보충하세요.', bullets: ['목표 옵션과 베이스 결정', '현재 재고 확인', '부족분만 교환 후 제작'], tip: '마지막 버튼으로 거래소 화면을 바로 엽니다.' }
    ],
    unlock_season_tab: [
        { title: '루프와 영구 성장', body: '루프는 일부 진행을 다시 시작하는 대신 새로운 보너스와 콘텐츠를 여는 장기 진행 시스템입니다.', bullets: ['초기화되는 요소와 유지되는 요소가 다릅니다.', '루프 이정표에서 다음 해금 조건을 확인합니다.', '영구 노드는 이후 모든 루프에 영향을 줍니다.'], tip: '루프 직전에는 유지되는 장비·재화를 반드시 확인하세요.' },
        { title: '다음 루프 준비', body: '현재 루프에서 얻을 수 있는 핵심 보상을 챙긴 뒤 전환하는 것이 좋습니다.', bullets: ['미완료 시련과 보스 확인', '보존 가능한 장비와 자원 정리', '다음 루프 목표 빌드 결정'], tip: '무조건 빠른 루프보다 필요한 영구 보상을 챙기는 편이 유리할 수 있습니다.' }
    ],
    unlock_traits: [
        { title: '전직 화면 안내', body: '전직 화면에서는 전직을 고르고 두 종류의 전직 포인트를 씁니다.', bullets: ['전직 선택: 직업의 전직 셋 중 하나', '전직 패시브 포인트: 연결된 전직 노드 활성화', '키스톤 포인트: 빌드 규칙을 바꾸는 키스톤 활성화'], tip: '전직 패시브 포인트와 키스톤 포인트는 서로 다른 자원입니다.' }
    ],
};

function escapeTutorialText(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function getTutorialGuide(notice) {
    if (!notice) return [];
    if (TUTORIAL_GUIDES[notice.key]) return TUTORIAL_GUIDES[notice.key];
    if (String(notice.key).startsWith('unlock_talent')) return TUTORIAL_GUIDES.unlock_traits;
    return [{ title: notice.title, body: notice.body, bullets: [], tip: '마지막 단계에서 관련 화면을 바로 열 수 있습니다.' }];
}

function getTutorialVisualKind(key, stepIndex) {
    if (key === 'tutorial_battle_basics') return ['battle', 'damage', 'skills', 'growth'][stepIndex] || 'battle';
    if (key === 'unlock_char') return 'passive';
    if (['unlock_items', 'unlock_jewel', 'unlock_codex', 'unlock_market'].includes(key)) return 'items';
    if (key === 'unlock_skills') return 'skills-panel';
    if (['unlock_map', 'unlock_season_tab'].includes(key)) return 'map';
    if (key === 'unlock_traits') return 'class';
    if (String(key).startsWith('unlock_talent')) return 'class';
    return 'system';
}

function buildTutorialBattlePreview(kind) {
    let grid = new Array(18).fill('<i></i>').join('');
    let status = kind === 'growth' ? '방어가 부족합니다' : (kind === 'skills' ? '스킬 범위 확인' : '교전 중 · 3기');
    return `<div class="tutorial-game-preview is-${kind}">
        <div class="tutorial-mini-status"><span>${status}</span><span class="tutorial-mini-hp"><i></i></span></div>
        <div class="tutorial-mini-field"><div class="tutorial-mini-grid">${grid}</div><div class="tutorial-mini-hero">아군</div><div class="tutorial-mini-enemy">적</div><div class="tutorial-mini-target"></div><div class="tutorial-mini-damage">12,480</div></div>
        <div class="tutorial-mini-skillbar"><span>사용 중</span><i class="tutorial-mini-skill">1</i><i class="tutorial-mini-skill">2</i><i class="tutorial-mini-skill">3</i><span>${kind === 'skills' ? '청록 칸 = 유효 범위' : '자동 공격'}</span></div>
    </div>`;
}

function getTutorialPanelModel(kind) {
    const models = {
        passive: { focus: '패시브', tabs: ['캐릭터', '패시브'], rows: ['생명력 가지', '공격 속도 노드', '다음 연결 노드'] },
        items: { focus: '장비', tabs: ['장비 창', '제작실'], rows: ['장착 장비 비교', '아이템 등급과 옵션', '필요 재화 확인'] },
        'skills-panel': { focus: '스킬', tabs: ['공격 젬', '보조 젬'], rows: ['주 공격 스킬', '연결 가능한 보조', '태그 · 범위 확인'] },
        map: { focus: '지도', tabs: ['현재 지역', '다음 지역'], rows: ['몬스터 속성', '주요 보상', '보스 위험도'] },
        class: { focus: '전직', tabs: ['전직', '재능'], rows: ['빌드 방향 선택', '핵심 노드 경로', '개화 효과 확인'] },
        system: { focus: '안내', tabs: ['새 콘텐츠', '가이드'], rows: ['해금 조건 확인', '관련 화면 열기', '진행 목표 추적'] }
    };
    return models[kind] || models.system;
}

function buildTutorialPanelPreview(kind, stepIndex) {
    let model = getTutorialPanelModel(kind);
    let tabs = model.tabs.map((label, index) => `<span class="${index === Math.min(1, stepIndex) ? 'active' : ''}">${label}</span>`).join('');
    let rows = model.rows.map((label, index) => `<div class="tutorial-panel-row ${index === Math.min(2, stepIndex) ? 'active' : ''}"><span>${label}</span><b>${index === Math.min(2, stepIndex) ? '◀ 지금 확인' : '·'}</b></div>`).join('');
    return `<div class="tutorial-panel-preview"><div class="tutorial-panel-tabs">${tabs}</div><div class="tutorial-panel-body"><div class="tutorial-panel-focus">${model.focus}</div><div class="tutorial-panel-list">${rows}</div></div></div>`;
}

function renderTutorialVisual() {
    let visual = document.getElementById('tutorial-visual');
    if (!visual || !activeTutorial) return;
    let kind = getTutorialVisualKind(activeTutorial.key, activeTutorialStep);
    visual.innerHTML = ['battle', 'damage', 'skills', 'growth'].includes(kind)
        ? buildTutorialBattlePreview(kind)
        : buildTutorialPanelPreview(kind, activeTutorialStep);
}

function showDivineDropBanner(amount) {
    let el = document.getElementById('divine-drop-banner');
    if (!el) return;
    el.innerText = `${ORB_DB.goldenRule.name} 획득! +${amount}`;
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

/** 직업 카드 툴팁: 카드에 이미 있는 한 줄 설명을 되풀이하지 않고 고를 때 필요한 것 — 첫 처치 때 받는 시작 스킬 젬과
 * 대표 무기(맨손일 때 든 그림, 제한은 아니다) (검토 2026-10-01). */
function buildHeroChoiceTooltipHtml(classId, experienced) {
    let def = PLAYER_CLASS_DEFS[classId];
    if (!def) return '';
    const gem = LOOP_STARTER_GEM_BY_HERO[def.recommendedTalentHeroId] || '연속 베기';
    const gemLine = String((SKILL_DB[gem] || {}).desc || '').split('.')[0];
    const weaponSlug = HANA_WEAPON_COMBOS.classWeapons[classId];
    const weapon = weaponSlug ? HANA_WEAPON_COMBOS.weapons[weaponSlug].label : '';
    return `<div class="tooltip-title">${escapeHTML(def.label)}${experienced ? ' <span style="color:#9fd8ff;">경험함</span>' : ''}</div>
        <div class="tooltip-line" style="color:#f6c461;">시작 스킬 젬: ${escapeHTML(gem)}</div>
        <div class="tooltip-line" style="color:#d8b4ff;">전직: ${escapeHTML(getAscendanciesForClass(classId).map(id => CLASS_TEMPLATES[id].name).join(', '))}</div>
        ${gemLine ? `<div class="tooltip-line">${escapeHTML(gemLine)}.</div>` : ''}
        ${weapon ? `<div class="tooltip-line" style="color:#f6c461;">대표 무기: ${escapeHTML(weapon)}</div><div class="tooltip-line">요구 능력치만 맞으면 어떤 무기든 낄 수 있고, 든 무기가 그림에 보입니다.</div>` : ''}`;
}

/** 휴대폰 배치(1080px 이하)는 툴팁 대신 직업 확인 판(renderLoopHeroChoiceDetail)이 같은 내용을 보인다 — 탭이 마우스 진입을 흉내 내
 * 툴팁이 판 위에 겹쳤다. */
function showHeroChoiceTooltip(event, classId, experienced) {
    if (typeof showInfoTooltipHtml !== 'function' || uiDisplay.matches('(max-width: 1080px)')) return;
    showInfoTooltipHtml(event.clientX, event.clientY, buildHeroChoiceTooltipHtml(classId, !!experienced), '#f6c461');
}

/** 직업 확인 판(index.html #loop-hero-select-overlay .hero-choice-confirm, 휴대폰 배치에서만 보인다): 고른 카드 표시, 툴팁과 같은
 * 시작 스킬 젬 · 대표 무기, "이 직업으로 시작" 단추(value = 고른 직업). 판이 커지며 카드 목록이 줄어도 고른 카드는 보이게 둔다.
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
 * 판에 시작 스킬 젬 · 대표 무기를 보이며, 고른 카드를 다시 누르거나 "이 직업으로 시작"을 누르면 chooseLoopHero로 정한다. */
function pressLoopHeroChoice(classId, experienced) {
    let start = document.getElementById('loop-hero-select-start');
    if (!uiDisplay.matches('(max-width: 1080px)') || start.value === classId) return chooseLoopHero(classId);
    renderLoopHeroChoiceDetail(classId, experienced);
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
    if (kickerEl) kickerEl.innerText = options.kicker || '다음 루프';
    if (titleEl) titleEl.innerText = options.title || '다음 루프 직업 선택';
    if (bodyEl) bodyEl.innerText = options.body || '이번 루프에서 사용할 직업을 선택하세요.';
    let experiencedSet = new Set(game.heroSelectionInitialized && Array.isArray(game.discoveredClassIds) ? game.discoveredClassIds : []);
    grid.innerHTML = PLAYER_CLASS_ORDER.map(id => {
        let def = PLAYER_CLASS_DEFS[id];
        let experienced = experiencedSet.has(id);
        let summary = def.description || '';
        let badge = experienced ? '<span class="hero-choice-badge">경험함</span>' : '';
        let args = `'${id}',${experienced}`;
        return `<button class="reward-choice hero-choice" aria-label="${escapeHTML(def.label)} 선택" data-class-id="${escapeHTML(id)}" data-info-tooltip-anchor="1" onmouseenter="showHeroChoiceTooltip(event,${args})" onmousemove="showHeroChoiceTooltip(event,${args})" onmouseleave="hideInfoTooltip()" onclick="hideInfoTooltip();pressLoopHeroChoice(${args})">${badge}<img class="hero-choice-portrait" src="${escapeHTML(def.portrait)}" alt="" draggable="false"><strong>${escapeHTML(def.label)}<small>${escapeHTML(summary)}</small></strong></button>`;
    }).join('');
    renderLoopHeroChoiceDetail(null);
    overlay.classList.add('active');
    return true;
}

function chooseLoopHero(classId) {
    if (!PLAYER_CLASS_DEFS[classId]) return;
    applyHeroSelection(classId, { silent: true, skipSave: true, alignTalent: true });
    let overlay = document.getElementById('loop-hero-select-overlay');
    if (overlay) overlay.classList.remove('active');
    let callback = loopHeroSelectionCallback;
    loopHeroSelectionCallback = null;
    if (typeof callback === 'function') callback(classId);
    lastTime = Date.now();
}

function openRingSlotOverlay(invIdx) {
    let item = game.inventory[invIdx];
    pendingRingEquipItemId = item && item.id ? item.id : null;
    let overlay = document.getElementById('ring-slot-overlay');
    if (overlay && !overlay.open) overlay.showModal();
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

function openGloveSlotOverlay(invIdx) {
    let item = game.inventory[invIdx];
    pendingGloveEquipItemId = item && item.id ? item.id : null;
    let overlay = document.getElementById('glove-slot-overlay');
    if (overlay && !overlay.open) overlay.showModal();
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
    const leftLabel = isLeftCollapsed ? '전투 패널 펼치기' : '전투 패널 접기';
    leftToggleButtons.forEach(button => syncPanelToggle(button, isLeftCollapsed ? '▶' : '◀', { title: leftLabel, 'aria-label': leftLabel }));
    if (leftExpandFab) syncPanelToggle(leftExpandFab, '▶', {});
    if (combatFeed) combatFeed.classList.toggle('collapsed', isLogCollapsed);
    document.body.classList.toggle('combat-log-collapsed', isLogCollapsed);
    const logText = isLogCollapsed ? '펼치기' : '접기';
    if (combatLogToggleBtn) syncPanelToggle(combatLogToggleBtn, logText, { 'aria-expanded': String(!isLogCollapsed), 'aria-label': `전투 기록 ${logText}` });
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

function toggleCombatLogCollapse() {
    if (uiDisplay.matches('(max-width: 1080px)')) game.settings.mobileCombatLogExpanded = !game.settings.mobileCombatLogExpanded;
    else game.settings.combatLogCollapsed = !game.settings.combatLogCollapsed;
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
    value = stripDecorativeEmoji(value);
    if (typeof escapeHTML === 'function') return escapeHTML(String(value || ''));
    return String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
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
    return `<div class="deathlog-subtitle" style="margin-top:10px;">죽기 전 걸린 상태이상</div>` + rows.map(ail => {
        let hit = (ail.sourceHitDamage || 0) > 0 ? `, 원천 피해 ${formatNumberKR(Math.floor(ail.sourceHitDamage))}` : '';
        let source = ail.sourceEnemyName ? `, ${escapeDeathLogText(ail.sourceEnemyName)}` : '';
        return `<div class="deathlog-line"><div class="deathlog-line-top"><span>${escapeDeathLogText(ail.label || getAilmentDisplayLabel(ail.type))}</span>
            <strong class="deathlog-value">${Math.ceil(Math.max(0, ail.time || 0))}초<span class="deathlog-ratio">강도 ${(Number(ail.power || 0)).toFixed(2)}${hit}${source}</span></strong></div></div>`;
    }).join('');
}

function renderDeathElementView(log) {
    let damageRows = renderDeathDamageRows(log.damageSummary);
    let html = damageRows || '<div class="deathlog-empty">최근 3초 동안 집계된 피해 기록이 없습니다.</div>';
    let ailments = renderDeathDamageRows(log.ailmentDamageSummary);
    if (ailments) html += `<div class="deathlog-subtitle" style="margin-top:10px;">상태이상 피해 요약</div>${ailments}`;
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
        html += `<div class="deathlog-line deathlog-other">그 외 몬스터 ${hidden.length}마리, 피해 ${formatNumberKR(hiddenDamage)}</div>`;
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

/** 마지막 3초 피해가 최대 생명의 절반에 못 미치면 한 방이 아니라 오래 깎인 소모전이다: 피해 요약은 그 전투 전체를 보인다. */
const DEATH_ATTRITION_SHARE = 0.5;
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
    return `${log.fight.seconds}초 동안 조금씩 깎였습니다(마지막 3초 피해는 생명의 ${share}%).`;
}
/** 지금 바로 할 수 있는 일. 초반 사망은 대개 받지 않은 액트 보상, 남은 포인트, 빈 무기 칸 가운데 하나였다(플레이 리뷰 2026-10-07).
 * 액트 보상 줄에는 바로 여는 단추(reward: 지역 id)가 붙는다. */
function getDeathHints() {
    const rewards = getAvailableActRewardZoneIds(), fillable = countFillableEmptySlots();
    return [
        rewards.length ? { text: `받지 않은 액트 보상 ${rewards.length}개`, reward: rewards[0] } : null,
        game.passivePoints > 0 ? { text: `쓰지 않은 스킬트리 포인트 ${game.passivePoints}점` } : null,
        game.equipment['무기'] ? null : { text: '무기 칸이 비어 있습니다' },
        fillable ? { text: `가방에 바로 낄 수 있는 장비 ${fillable}개(장비 창의 빈 칸 채우기)` } : null
    ].filter(Boolean);
}
function renderDeathHints() {
    const box = document.getElementById('deathlog-hints');
    if (!box) return;
    const hints = getDeathHints(), reward = hints.find(hint => hint.reward !== undefined);
    box.hidden = hints.length === 0;
    box.innerHTML = hints.length === 0 ? '' : '<div class="deathlog-subtitle">할 수 있는 일</div>' + hints.map(hint => `<div class="deathlog-hint">
        <span>${escapeDeathLogText(hint.text)}</span>${hint === reward ? '<button type="button" class="deathlog-hint-action">받기</button>' : ''}</div>`).join('');
    const action = box.querySelector('.deathlog-hint-action');
    if (action) action.onclick = () => { closeDeathOverlay(); openActReward(reward.reward); };
}

/** 잃은 경험치 줄: 잃은 것이 없으면(레벨 1 첫 사망 등) "0 잃었습니다" 대신 줄을 뺀다. */
function describeDeathExpLoss(log) {
    return log.expLost > 0 ? `경험치를 ${log.expLost} 잃었습니다.` : '';
}

/** 탐험 중 쓰러지면 모아 둔 전리품이 사라지고 지도를 처음부터 다시 밝힌다 — 보고서에 그 사실을 적는다. */
function describeDeathLootLoss(log) {
    if (!log.lostItems && !log.lostCurrencies) return '';
    const parts = [log.lostItems ? `아이템 ${log.lostItems}개` : '', log.lostCurrencies ? `재화 ${log.lostCurrencies}종` : ''].filter(Boolean);
    return `탐험 전리품(${parts.join(', ')})을 잃고 지도를 처음부터 다시 밝힙니다.`;
}

function openDeathOverlay(log) {
    if (game.isBackgroundCalculation) return;
    let overlay = document.getElementById('death-overlay');
    if (!log || !overlay) return;
    activeDeathLog = log;
    let ailments = Array.isArray(log.activeAilments) ? log.activeAilments.filter(entry => entry && entry.type) : [];
    let ailmentText = ailments.length > 0
        ? ailments.slice(0, 4).map(ail => `${ail.label || getAilmentDisplayLabel(ail.type)} ${Math.ceil(Math.max(0, ail.time || 0))}초`).join(', ')
        : '없음';
    const describeDamage = () => {
        const fatal = log.fatalElement ? getDamageElementLabel(log.fatalElement) : '속성 미기록';
        const source = [stripDecorativeEmoji(log.sourceName), fatal].filter(Boolean).join(', ');
        const recent = log.damageSummary?.length ? getDamageElementLabel(log.primaryElement) : '기록 없음';
        return `마지막 피해: ${source}\n최근 주요 피해: ${recent}`;
    };
    document.getElementById('deathlog-title').innerText = '전투에서 쓰러졌습니다.';
    document.getElementById('deathlog-body').innerText = [describeDamage(), describeDeathAttrition(log), describeDeathExpLoss(log), describeDeathLootLoss(log),
        log.retreatZoneName ? `${withDirectionParticle(log.retreatZoneName)} 물러나 레벨을 ${ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.` : '', `죽기 전 상태이상: ${ailmentText}`].filter(Boolean).join('\n');
    document.getElementById('deathlog-damage-title').innerText = isDeathAttrition(log) ? `전투 전체 피해 (${log.fight.seconds}초)` : '최근 3초 피해 요약';
    renderDeathHints();
    document.querySelectorAll('[data-deathlog-view]').forEach(tab => { tab.onclick = () => setDeathLogView(tab.dataset.deathlogView); });
    setDeathLogView('element');
    toggleDeathNoticeSetting(game.settings.showDeathNotice !== false);
    overlay.classList.add('active');
    deathOverlayActive = true;
    overlay.showModal();
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

// 한 전투 동안 받은 피해: 피해가 DEATH_FIGHT_GAP_MS 넘게 끊기면 새 전투로 본다. 저장하지 않는다(사망 기록이 요약을 가져간다).
// 초반 사망은 20~40초 동안 조금씩 깎이는 소모전이라 마지막 3초만으로는 원인이 보이지 않았다(플레이 리뷰 2026-10-07).
const DEATH_FIGHT_GAP_MS = 8000;
let deathFightLedger = null;
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

function getActRewardConfig(zoneId) {
    return ACT_REWARD_DB[zoneId] || null;
}

function getSupportActRewardFallback(choice) {
    let amount = Math.max(1, Math.floor(Number(choice && choice.fallbackValue) || 1));
    if (choice && choice.fallbackKind === 'points') {
        return { kind: 'points', amount, currency: null, label: `스킬트리 포인트 +${amount}` };
    }
    let currency = (choice && choice.currency) || 'magicBud';
    let currencyDef = ORB_DB[currency];
    if (!currencyDef) throw new Error(`Unknown support reward fallback currency: ${currency}`);
    return { kind: 'currency', amount, currency, label: `${currencyDef.name} ${amount}개` };
}

function isActRewardChoiceAvailable(choice, owner = game) {
    if (choice.kind === 'support' || choice.stat === 'suppCap') return contentProgression.isUnlocked('support', owner);
    if (choice.kind === 'currency') return contentProgression.canDropCurrency(choice.currency, owner);
    return true;
}
function getAvailableActRewardZoneIds(owner = game) {
    return (owner.claimableActRewards || []).filter(id =>
        getActRewardConfig(id)?.choices.some(choice => isActRewardChoiceAvailable(choice, owner)));
}
function getActRewardChoices(zoneId) {
    let config = getActRewardConfig(zoneId);
    if (!config) return [];
    return config.choices.map(choice => {
        let enriched = { ...choice };
        if (choice.kind === 'skill' && hasSkillGemOwned(choice.skill)) {
            enriched.desc = `${choice.desc} 이미 보유 중이면 스킬트리 포인트 +${choice.fallbackValue || 1}로 바뀝니다.`;
        }
        if (choice.kind === 'support' && hasSupportGemOwned(choice.gem)) {
            let fallback = getSupportActRewardFallback(choice);
            enriched.desc = `${choice.desc} 이미 보유 중이면 ${fallback.label}로 바뀝니다.`;
        }
        if (choice.kind === 'item' && choice.slot === '무기') Object.assign(enriched, describeActRewardWeapon());
        return enriched;
    });
}
/** 액트 보상 무기는 직업 대표 무기(직업 카드의 '대표 무기')의 대분류로 나온다. 아무 무기나 나와 궁수가 대검을 받기도 했다(플레이 리뷰 2026-10-07). */
function describeActRewardWeapon() {
    const category = HANA_WEAPON_COMBOS.classWeapons[game.selectedClassId];
    return WEAPON_CATEGORIES[category] ? { weaponCategory: category, label: `미확인 ${WEAPON_CATEGORIES[category].name}` } : {};
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
function repairJournalEntriesFromProgress(state) {
    let runtimeState = state && typeof state === 'object' ? state : {};
    let recovered = new Set(Array.isArray(runtimeState.journalEntries) ? runtimeState.journalEntries.filter(id => JOURNAL_DB[id]) : []);
    recovered.add('prologue');
    let loopStage = Math.max(Math.floor(runtimeState.season || 1), Math.floor(runtimeState.loopCount || 0));
    if (loopStage >= 2) Object.keys(JOURNAL_DB).filter(id => /^act_/.test(id)).forEach(id => recovered.add(id));
    if (runtimeState.passiveStarEvolution) recovered.add('passive_star_evolution');
    if (Math.floor((runtimeState.meteorSite || {}).entriesCleared || 0) > 0) recovered.add('meteor_fall');
    if (runtimeState.chaosInfuserUnlocked || runtimeState.woodsmanSimulatorSeenLoop || Math.floor(runtimeState.woodsmanDefeatAttempts || 0) > 0) recovered.add('woodsman');
    if (runtimeState.beehive && runtimeState.beehive.cleared) recovered.add('beehive_queen');
    if (runtimeState.voidRift && runtimeState.voidRift.grandBreachCleared) recovered.add('void_grand_breach');
    if (Math.max(Math.floor(runtimeState.labyrinthUnlockedMaxFloor || 1), Math.floor(runtimeState.labyrinthFloor || 1)) >= 11) recovered.add('labyrinth_10');
    if (runtimeState.ocean && Math.floor(runtimeState.ocean.bossClearM || 0) >= 500) recovered.add('ocean_500');
    if (runtimeState.skyTower && (Math.floor(runtimeState.skyTower.highestFloor || 1) >= 11 || (runtimeState.skyTower.clearedFloors || []).some(floor => Math.floor(floor || 0) >= 10))) recovered.add('sky_tower_10');
    let hasFusedRelic = (runtimeState.inventory || []).some(item => item && item.fusedRelic)
        || Object.values(runtimeState.equipment || {}).some(item => item && item.fusedRelic);
    if ((runtimeState.timeRift && Math.floor(runtimeState.timeRift.fusionCount || 0) > 0) || hasFusedRelic) recovered.add('time_rift_fusion');
    let colony = runtimeState.colony || {};
    if (Math.max(Math.floor(colony.highestWave || 0), Math.floor(colony.wave || 0)) >= 11) recovered.add('colony_wave_10');
    let rootBossIds = new Set(Array.isArray(runtimeState.clearedRootBosses) ? runtimeState.clearedRootBosses : []);
    if (typeof SEASON_BOSS_ZONES !== 'undefined' && Array.isArray(SEASON_BOSS_ZONES)) {
        SEASON_BOSS_ZONES.forEach(zone => {
            if (zone && zone.journalId && rootBossIds.has(zone.id) && JOURNAL_DB[zone.journalId]) recovered.add(zone.journalId);
        });
    }
    runtimeState.journalEntries = Array.from(recovered).filter(id => JOURNAL_DB[id]);
    return runtimeState.journalEntries;
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
function grantJournalBonus(entryId) {
    let entry = JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    game.journalBonusClaims = (game.journalBonusClaims && typeof game.journalBonusClaims === 'object') ? game.journalBonusClaims : {};
    if (game.journalBonusClaims[entryId]) return;
    game.journalBonuses = Array.isArray(game.journalBonuses) ? game.journalBonuses : [];
    if (entry.bonus.stat === 'passivePoint') {
        game.passivePoints = Math.max(0, Math.floor(game.passivePoints || 0)) + Math.max(0, Math.floor(entry.bonus.value || 0));
        if (typeof runPassiveTreeAutoInvest === 'function') runPassiveTreeAutoInvest();
    }
    else if (!game.journalBonuses.some(row => row && row.entryId === entryId)) game.journalBonuses.push({ entryId: entryId, stat: entry.bonus.stat, value: entry.bonus.value });
    game.journalBonusClaims[entryId] = true;
    addLog(`저널 영구 보너스 획득: ${entry.bonus.label}`, 'season-up');
}
function unlockJournalEntry(entryId) {
    if (!entryId || !JOURNAL_DB[entryId]) return;
    game.journalEntries = Array.isArray(game.journalEntries) ? game.journalEntries : ['prologue'];
    if (!game.journalEntries.includes(entryId)) {
        game.journalEntries.push(entryId);
        game.noti = game.noti && typeof game.noti === 'object' ? game.noti : {};
        game.noti.journal = true;
        addLog(`📓 저널 해금: ${JOURNAL_DB[entryId].title}`, 'loot-rare');
        if (typeof requestGoalSystemRefresh === 'function') requestGoalSystemRefresh();
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
    promptActReward(zoneId);
}
// 액트 보스를 쓰러뜨리면 다음 지역으로 떠나기 전에 보상 창을 띄운다(창이 열린 동안 게임이 멈춰 출발도 기다린다). 보상이 목표
// 서랍과 지도에만 있어, 첫 보상을 받지 않고 넘어간 판이 액트 2 첫 전투에서 죽었다(플레이 리뷰 2026-10-07). 방치 정산 중이나
// 자리를 비운 방치(입력이 3분 넘게 없음) 중에는 띄우지 않는다(멈춘 채 기다리게 된다). 다른 창이 떠 있으면 닫힐 때까지 1분 기다린다.
const ACT_REWARD_PROMPT = Object.freeze({ awayMs: 180000, retryMs: 500, tries: 120 });
let actRewardPromptTimer = null;
function promptActReward(zoneId) {
    clearInterval(actRewardPromptTimer);
    actRewardPromptTimer = null;
    if (tryOpenPromptedActReward(zoneId)) return;
    let triesLeft = ACT_REWARD_PROMPT.tries;
    actRewardPromptTimer = setInterval(() => {
        if (!tryOpenPromptedActReward(zoneId) && --triesLeft > 0) return;
        clearInterval(actRewardPromptTimer);
        actRewardPromptTimer = null;
    }, ACT_REWARD_PROMPT.retryMs);
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
    if (activeTutorial || backgroundCombatRuntime.processing) return true;
    return !!document.querySelector('.tutorial-overlay.active, dialog:modal, .selection-overlay, .background-combat-progress-overlay, #background-combat-result-overlay');
}
function openActReward(zoneId) {
    if (!(game.claimableActRewards || []).includes(zoneId)) return;
    let config = getActRewardConfig(zoneId);
    if (!config) return;
    if (!getAvailableActRewardZoneIds().includes(zoneId)) return;
    activeRewardZoneId = zoneId;
    let storyAct = getStoryActByZoneId(zoneId);
    // 머리글이 "액트 N 클리어 보상", 제목은 지역 이름만(예전에는 둘 다 '클리어 보상'을 되풀이했다).
    document.getElementById('reward-kicker').innerText = storyAct ? `${formatStoryActLabel(storyAct)} 클리어 보상` : '액트 클리어 보상';
    document.getElementById('reward-title').innerText = storyAct ? storyAct.title : config.title;
    document.getElementById('reward-body').innerText = storyAct ? `${storyAct.subtitle}\n${config.body}` : config.body;
    const dpsBefore = getPlayerStats(false).dps;
    document.getElementById('reward-grid').innerHTML = getActRewardChoices(zoneId)
        .map((choice, index) => isActRewardChoiceAvailable(choice) ? renderActRewardChoice(zoneId, choice, index, dpsBefore) : '').join('');
    document.getElementById('reward-overlay').classList.add('active');
    lastTime = Date.now();
}
/** 장비 선택지의 부위 그림(빈 장착 칸과 같은 그림, 직업 대표 무기는 그 대분류 첫 바탕의 그림). 다른 보상은 그림 없이 글만. */
function actRewardChoiceArt(choice) {
    if (choice.kind !== 'item') return '';
    const base = choice.weaponCategory ? BASE_ITEM_DB.find(row => getWeaponCategoryOfBase(row.id) === choice.weaponCategory) : null;
    return `<img class="reward-choice-art${choice.slot === '무기' ? ' is-weapon' : ''}" src="${getEquipmentGridVisualAsset({ slot: choice.slot, baseId: base ? base.id : 'empty-' + choice.slot })}" alt="" aria-hidden="true">`;
}
/** 선택지 한 칸: 이름, 설명, 미리보기(장비는 등급과 바로 장착되는지), 고르면 바뀌는 DPS. */
function renderActRewardChoice(zoneId, choice, index, dpsBefore) {
    const change = measureActRewardDps(zoneId, choice, dpsBefore);
    const preview = choice.kind === 'item' ? actRewardItemPreview(choice, !!change && change.direct) : getActRewardPreview(choice);
    return `
        <button class="reward-choice" onclick="claimActRewardChoice(${zoneId}, ${index})">
            ${actRewardChoiceArt(choice)}<strong>${choice.label}</strong>
            ${choice.desc ? `<span>${choice.desc}</span>` : ''}
            <small>${preview}${formatActRewardDps(change, choice)}</small>
        </button>
    `;
}
/** 장비 선택지: 등급과, 맞는 빈 장착 칸에 바로 끼워지는지(액트 보상은 빈 칸에 저절로 낀다) 아니면 가방으로 가는지. */
function actRewardItemPreview(choice, equips) {
    const rarity = ITEM_RARITY_LABELS[choice.rarity] || '';
    return `${rarity ? `${rarity} 등급, ` : ''}${equips ? '빈 칸에 바로 장착됩니다' : '가방으로 들어갑니다'}`;
}
/** 고르면 바뀌는 DPS {before, after, direct, swap}: 보상을 잠시 적용해 재고 그대로 되돌린다. 능력치는 액트 보상 능력치로, 장비는
 * 맞는 빈 칸(없으면 첫 칸과 바꿔)에 끼워 잰다(요구 능력치가 모자라면 null). direct는 실제로 바로 끼워지는지, swap은 바꿔 끼운 값인지.
 * 젬과 포인트는 재지 않는다. */
function measureActRewardDps(zoneId, choice, before) {
    const twin = Array.isArray(game.cosmosTwinKeystones) ? game.cosmosTwinKeystones.slice() : game.cosmosTwinKeystones;
    const preview = applyActRewardPreview(zoneId, choice);
    if (!preview) return null;
    try {
        return { before, after: getPlayerStats(false).dps, direct: preview.direct, swap: preview.swap };
    } finally {
        preview.undo();
        game.cosmosTwinKeystones = twin;
    }
}
/** 보상을 잠시 적용하고 {undo, direct, swap}을 돌려준다(적용할 수 없으면 null). 빈 칸 규칙은 실제 지급(equipIntoFirstEmptySlot)과 같다. */
function applyActRewardPreview(zoneId, choice) {
    if (choice.kind === 'stat') {
        game.actRewardBonuses = Array.isArray(game.actRewardBonuses) ? game.actRewardBonuses : [];
        game.actRewardBonuses.push({ actId: zoneId, stat: choice.stat, value: choice.value });
        return { undo: () => game.actRewardBonuses.pop(), direct: true, swap: false };
    }
    const item = choice.kind === 'item' ? buildActRewardPreviewItem(zoneId, choice) : null;
    const slots = item ? getEquipCandidateSlots(item).filter(name => Object.hasOwn(game.equipment, name)) : [];
    const slot = slots.find(name => !game.equipment[name]) || slots[0];
    if (!slot || !combatEquipmentStats.inspect(item, slot).ok) return null;
    const previous = game.equipment[slot];
    game.equipment[slot] = item;
    return { undo: () => { game.equipment[slot] = previous; }, swap: !!previous, direct: !previous && game.settings.autoEquipEmptySlots !== false };
}
/** 미리보기 장비: 그 액트에서 나올 바탕(무기는 직업 대표 무기의 대분류) 가운데 가장 높은 것을 보통 등급, 기본 수치 가운데 값으로. */
function buildActRewardPreviewItem(zoneId, choice) {
    const tier = zoneId + 1;
    const bases = keepWeaponCategoryBases(BASE_ITEM_DB.filter(base => base.slot === choice.slot && !base.realmBase && !base.dropOnly && base.reqTier <= tier),
        choice.weaponCategory);
    const base = bases.reduce((best, row) => (!best || row.reqTier > best.reqTier ? row : best), null);
    if (!base) return null;
    const counter = itemIdCounter;
    const item = createItemFromBase(base, 'normal', tier);
    itemIdCounter = counter;
    item.baseStats = base.baseStats.map(stat => rollBaseStat(stat, 0.5));
    return item;
}
/** "DPS 13 → 59": 바뀌는 선택지에만. 가방으로 가는 장비는 "바꿔 끼우면"으로, 장비는 옵션 없는 기본 성능 값이라 (옵션 제외)를 붙인다. */
function formatActRewardDps(change, choice) {
    const format = COMPARE_STAT_META.dps.format;
    if (!change || format(change.after) === format(change.before)) return '';
    const tone = change.after > change.before ? 'is-up' : 'is-down';
    const lead = change.direct ? '' : (change.swap ? '바꿔 끼우면 ' : '끼우면 ');
    return `<b class="reward-choice-dps ${tone}">${lead}DPS ${format(change.before)} → ${format(change.after)}${choice.kind === 'item' ? ' (옵션 제외)' : ''}</b>`;
}
function getActRewardPreview(choice) {
    if (choice.kind === 'skill') return `${choice.skill} 공격 젬을 획득합니다.`;
    if (choice.kind === 'support') return `${choice.gem} 보조 젬을 획득합니다.`;
    if (choice.kind === 'points') return `즉시 포인트 ${choice.value}점을 얻습니다.`;
    if (choice.kind === 'currency') return `${ORB_DB[choice.currency].name} ${choice.fallbackValue || choice.value || 1}개를 얻습니다.`;
    if (choice.kind === 'stat') return `${getStatName(choice.stat)} +${choice.value}${P_STATS[choice.stat] && P_STATS[choice.stat].isPct ? '%' : ''}`;
    return '영구 보상';
}
/** 장비 보상은 그 액트에서 나올 바탕 하나(무기는 직업 대표 무기의 대분류, getActRewardChoices)를 마법 등급으로 준다. 빈 칸이면 바로 낀다. */
function grantActRewardEntry(zoneId, choice) {
    if (choice.kind === 'item') {
        let base = chooseItemBase(choice.slot, zoneId + 1, getZone(zoneId), choice.weaponCategory);
        if (!base) {
            addLog(`⚠️ 액트 보상 아이템 생성 실패 (${choice.slot})`, 'attack-monster');
            return;
        }
        let item = createItemFromBase(base, choice.rarity || 'magic', zoneId + 1);
        let added = addItemToInventory(item, { ignoreFilter: true });
        if (added) addLog(`🎁 액트 보상으로 [${item.name}] 획득!`, choice.rarity === 'rare' ? 'loot-rare' : 'loot-magic', { item });
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
            let shardGain = typeof grantGemResearchFragments === 'function' ? grantGemResearchFragments(4) : (awardCurrency('gemShard', 4), 4);
            addLog(`🎁 이미 보유한 젬 대신 스킬트리 포인트 +${choice.fallbackValue || 1}, 젬 잔향 +${shardGain}`, 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'support') {
        if (!hasSupportGemOwned(choice.gem)) {
            game.supports.push(choice.gem);
            game.supportGemData[choice.gem] = game.supportGemData[choice.gem] || { level: 1, exp: 0 };
            // 새 보조 젬이 '장착 보조 젬만 보기'에 가려져 지급되지 않은 것처럼
            // 보이지 않도록, 획득 직후에는 전체 보조 젬 목록을 보여 준다.
            game.gemFoldInactiveSupport = false;
            game.noti.skills = true;
            addLog(`🎁 액트 보상 보조 젬 [${choice.gem}] 획득!`, 'loot-rare');
        } else {
            let fallback = getSupportActRewardFallback(choice);
            if (fallback.kind === 'points') game.passivePoints += fallback.amount;
            else awardCurrency(fallback.currency, fallback.amount);
            let shardGain = typeof grantGemResearchFragments === 'function' ? grantGemResearchFragments(3) : (awardCurrency('gemShard', 3), 3);
            addLog(`🎁 중복 보조 젬 대신 ${fallback.label} · 젬 잔향 +${shardGain}`, 'loot-magic');
        }
        return;
    }
    if (choice.kind === 'points') {
        game.passivePoints += choice.value || 0;
        addLog(`🎁 스킬트리 포인트 +${choice.value || 0}`, 'loot-rare');
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
    if (!choice || !isActRewardChoiceAvailable(choice)) return;
    grantActRewardEntry(zoneId, choice);
    if (typeof runPassiveTreeAutoInvest === 'function') runPassiveTreeAutoInvest();
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

function getDamageElementIcon(ele) {
    return DAMAGE_ELEMENT_ICONS[normalizeDamageElementKey(ele)] || DAMAGE_ELEMENT_ICONS.phys;
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

/** Sheets shipped already sanitized (assets/battle-clean, scripts/export-clean-battle-sheets.cjs): no runtime copy. */
function isPreCleanedBattleSheet(key) {
    return key === 'enemies' || key === 'summon1' || key.startsWith('bossAct');
}

function shouldPreserveOriginalBattleSheet(key) {
    return isPreCleanedBattleSheet(key)
        || key === 'tiles'
        || key.startsWith('hero')
        || key.startsWith('playerClass')
        || key.startsWith('bossTelegraph')
        || key.startsWith('skillFx')
        || key.startsWith('passiveTree');
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
    const wispMonsterManifest = typeof WISP_MONSTER_ASSET_MANIFEST === 'undefined'
        ? {}
        : WISP_MONSTER_ASSET_MANIFEST;
    const manifest = {
        hero1Idle: 'assets/playable/hero1/idle.png',
        hero1Walk: 'assets/playable/hero1/walk.png',
        hero1Attack: 'assets/playable/hero1/attack.png',
        hero1Hurt: 'assets/playable/hero1/idle.png',
        hero1Death: 'assets/playable/hero1/idle.png',
        hero2Idle: 'assets/playable/hero2/idle.png',
        hero2Walk: 'assets/playable/hero2/walk.png',
        hero2Attack: 'assets/playable/hero2/attack.png',
        hero2Hurt: 'assets/playable/hero2/idle.png',
        hero2Death: 'assets/playable/hero2/idle.png',
        hero3Idle: 'assets/playable/hero3/idle.png',
        hero3Walk: 'assets/playable/hero3/walk.png',
        hero3Attack: 'assets/playable/hero3/attack.png',
        hero3Hurt: 'assets/playable/hero3/idle.png',
        hero3Death: 'assets/playable/hero3/idle.png',
        hero4Idle: 'assets/playable/hero4/idle.png',
        hero4Walk: 'assets/playable/hero4/walk.png',
        hero4Attack: 'assets/playable/hero4/attack.png',
        hero4Hurt: 'assets/playable/hero4/idle.png',
        hero4Death: 'assets/playable/hero4/idle.png',
        hero5Idle: 'assets/playable/hero5/idle.png',
        hero5Walk: 'assets/playable/hero5/walk.png',
        hero5Attack: 'assets/playable/hero5/attack.png',
        hero5Hurt: 'assets/playable/hero5/idle.png',
        hero5Death: 'assets/playable/hero5/idle.png',
        hero6Idle: 'assets/playable/hero6/idle.png',
        hero6Walk: 'assets/playable/hero6/walk.png',
        hero6Attack: 'assets/playable/hero6/attack.png',
        hero6Hurt: 'assets/playable/hero6/idle.png',
        hero6Death: 'assets/playable/hero6/idle.png',
        hero7Idle: 'assets/playable/hero7/idle.png',
        hero7Walk: 'assets/playable/hero7/walk.png',
        hero7Attack: 'assets/playable/hero7/attack.png',
        hero7Hurt: 'assets/playable/hero7/idle.png',
        hero7Death: 'assets/playable/hero7/idle.png',
        hero8Idle: 'assets/playable/hero8/idle.png',
        hero8Walk: 'assets/playable/hero8/walk.png',
        hero8Attack: 'assets/playable/hero8/attack.png',
        hero8Hurt: 'assets/playable/hero8/idle.png',
        hero8Death: 'assets/playable/hero8/idle.png',
        hero9Idle: 'assets/playable/hero9/idle.png',
        hero9Walk: 'assets/playable/hero9/walk.png',
        hero9Attack: 'assets/playable/hero9/attack.png',
        hero9Hurt: 'assets/playable/hero9/idle.png',
        hero9Death: 'assets/playable/hero9/idle.png',
        hero10Idle: 'assets/playable/hero10/idle.png',
        hero10Walk: 'assets/playable/hero10/walk.png',
        hero10Attack: 'assets/playable/hero10/attack.png',
        hero10Hurt: 'assets/playable/hero10/idle.png',
        hero10Death: 'assets/playable/hero10/idle.png',
        playerClassOccultistIdle: 'assets/playable/classes/occultist/idle.webp',
        playerClassOccultistIdleNorth: 'assets/playable/classes/occultist/idle-north.webp',
        playerClassOccultistIdleSouth: 'assets/playable/classes/occultist/idle-south.webp',
        playerClassOccultistWalk: 'assets/playable/classes/occultist/walk.webp',
        playerClassOccultistWalkNorth: 'assets/playable/classes/occultist/walk-north.webp',
        playerClassOccultistWalkSouth: 'assets/playable/classes/occultist/walk-south.webp?v=20260902-walk-repair3',
        playerClassOccultistWalkWest: 'assets/playable/classes/occultist/walk-west.webp',
        playerClassOccultistAttack: 'assets/playable/classes/occultist/attack.webp',
        playerClassOccultistAttack2: 'assets/playable/classes/occultist/attack-2.webp',
        playerClassOccultistAttackNorth: 'assets/playable/classes/occultist/attack-north.webp',
        playerClassOccultistAttack2North: 'assets/playable/classes/occultist/attack-2-north.webp',
        playerClassOccultistAttackSouth: 'assets/playable/classes/occultist/attack-south.webp',
        playerClassOccultistAttack2South: 'assets/playable/classes/occultist/attack-2-south.webp',
        playerClassWandererIdle: 'assets/playable/classes/wanderer/idle.webp',
        playerClassWandererIdleNorth: 'assets/playable/classes/wanderer/idle-north.webp',
        playerClassWandererIdleSouth: 'assets/playable/classes/wanderer/idle-south.webp',
        playerClassWandererWalk: 'assets/playable/classes/wanderer/walk.webp',
        playerClassWandererWalkNorth: 'assets/playable/classes/wanderer/walk-north.webp',
        playerClassWandererWalkSouth: 'assets/playable/classes/wanderer/walk-south.webp',
        playerClassWandererWalkWest: 'assets/playable/classes/wanderer/walk-west.webp',
        playerClassWandererAttack: 'assets/playable/classes/wanderer/attack.webp',
        playerClassWandererAttack2: 'assets/playable/classes/wanderer/attack-2.webp',
        playerClassWandererAttackNorth: 'assets/playable/classes/wanderer/attack-north.webp',
        playerClassWandererAttackSouth: 'assets/playable/classes/wanderer/attack-south.webp',
        playerClassWandererAttack2South: 'assets/playable/classes/wanderer/attack-2-south.webp',
        playerClassClericIdle: 'assets/playable/classes/cleric/idle.webp',
        playerClassClericIdleNorth: 'assets/playable/classes/cleric/idle-north.webp',
        playerClassClericIdleSouth: 'assets/playable/classes/cleric/idle-south.webp',
        playerClassClericWalk: 'assets/playable/classes/cleric/walk.webp',
        playerClassClericWalkNorth: 'assets/playable/classes/cleric/walk-north.webp',
        playerClassClericWalkSouth: 'assets/playable/classes/cleric/walk-south.webp?v=20260902-walk-repair2',
        playerClassClericWalkWest: 'assets/playable/classes/cleric/walk-west.webp',
        playerClassClericAttack: 'assets/playable/classes/cleric/attack.webp',
        playerClassClericAttackNorth: 'assets/playable/classes/cleric/attack-north.webp',
        playerClassClericAttackSouth: 'assets/playable/classes/cleric/attack-south.webp',
        playerClassArcherIdle: 'assets/playable/classes/archer/idle.webp',
        playerClassArcherIdleNorth: 'assets/playable/classes/archer/idle-north.webp',
        playerClassArcherIdleSouth: 'assets/playable/classes/archer/idle-south.webp',
        playerClassArcherWalk: 'assets/playable/classes/archer/walk.webp',
        playerClassArcherWalkNorth: 'assets/playable/classes/archer/walk-north.webp',
        playerClassArcherWalkSouth: 'assets/playable/classes/archer/walk-south.webp',
        playerClassArcherWalkWest: 'assets/playable/classes/archer/walk-west.webp',
        playerClassArcherAttack: 'assets/playable/classes/archer/attack.webp',
        playerClassArcherAttack2: 'assets/playable/classes/archer/attack-2.webp',
        playerClassArcherAttackNorth: 'assets/playable/classes/archer/attack-north.webp',
        playerClassArcherAttack2North: 'assets/playable/classes/archer/attack-2-north.webp',
        playerClassArcherAttackSouth: 'assets/playable/classes/archer/attack-south.webp',
        playerClassArcherAttack2South: 'assets/playable/classes/archer/attack-2-south.webp',
        playerClassAlchemistIdle: 'assets/playable/classes/alchemist/idle.webp',
        playerClassAlchemistIdleNorth: 'assets/playable/classes/alchemist/idle-north.webp',
        playerClassAlchemistIdleSouth: 'assets/playable/classes/alchemist/idle-south.webp',
        playerClassAlchemistWalk: 'assets/playable/classes/alchemist/walk.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkNorth: 'assets/playable/classes/alchemist/walk-north.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkSouth: 'assets/playable/classes/alchemist/walk-south.webp?v=20260902-walk-repair2',
        playerClassAlchemistWalkWest: 'assets/playable/classes/alchemist/walk-west.webp?v=20260902-walk-repair2',
        playerClassAlchemistAttack: 'assets/playable/classes/alchemist/attack.webp',
        playerClassAlchemistAttack2: 'assets/playable/classes/alchemist/attack-2.webp',
        playerClassAlchemistAttack3: 'assets/playable/classes/alchemist/attack-3.webp',
        playerClassAlchemistAttackNorth: 'assets/playable/classes/alchemist/attack-north.webp',
        playerClassAlchemistAttack2North: 'assets/playable/classes/alchemist/attack-2-north.webp',
        playerClassAlchemistAttackSouth: 'assets/playable/classes/alchemist/attack-south.webp',
        playerClassWarriorIdle: 'assets/playable/classes/warrior/idle.webp',
        playerClassWarriorIdleNorth: 'assets/playable/classes/warrior/idle-north.webp',
        playerClassWarriorIdleSouth: 'assets/playable/classes/warrior/idle-south.webp',
        playerClassWarriorWalk: 'assets/playable/classes/warrior/walk.webp?v=20260906-sheathed',
        playerClassWarriorWalkNorth: 'assets/playable/classes/warrior/walk-north.webp',
        playerClassWarriorWalkSouth: 'assets/playable/classes/warrior/walk-south.webp',
        playerClassWarriorWalkWest: 'assets/playable/classes/warrior/walk-west.webp?v=20260906-sheathed',
        playerClassWarriorAttack: 'assets/playable/classes/warrior/attack.webp',
        playerClassWarriorAttack2: 'assets/playable/classes/warrior/attack-2.webp',
        playerClassWarriorAttack3: 'assets/playable/classes/warrior/attack-3.webp',
        playerClassWarriorAttackNorth: 'assets/playable/classes/warrior/attack-north.webp',
        playerClassWarriorAttack2North: 'assets/playable/classes/warrior/attack-2-north.webp',
        playerClassWarriorAttack3North: 'assets/playable/classes/warrior/attack-3-north.webp',
        playerClassWarriorAttackSouth: 'assets/playable/classes/warrior/attack-south.webp',
        playerClassWarriorAttack2South: 'assets/playable/classes/warrior/attack-2-south.webp',
        playerClassWarriorAttack3South: 'assets/playable/classes/warrior/attack-3-south.webp',
        ...(defaultHeroSrc ? { heroLegacy: defaultHeroSrc } : {}),
        // Sanitized ahead of time (both passes the atlas used to get at runtime); v2 and v3 are no longer drawn.
        enemies: 'assets/battle-clean/battle-enemies-v1.png',
        ...wispMonsterManifest,
        bossTelegraphRing: 'assets/effects/boss-telegraph-ring-v1.png',
        bossTelegraphFan: 'assets/effects/boss-telegraph-fan-v1.png',
        bossTelegraphPulse: 'assets/effects/boss-telegraph-pulse-v1.png',
        skillFxWhirlwind: 'assets/effects/skill-whirlwind-v2.png',
        skillFxChainPrimary: 'assets/effects/skill-chain-primary-v2.png',
        skillFxChainJump: 'assets/effects/skill-chain-jump-v1.png',
        skillFxSlamPrimary: 'assets/effects/skill-slam-primary-v2.png',
        skillFxSlamAftershock: 'assets/effects/skill-slam-aftershock-v2.png',
        skillFxMeteorProjectile: 'assets/effects/skill-meteor-projectile-v2.png',
        skillFxMeteorImpact: 'assets/effects/skill-meteor-impact-v2.png',
        skillFxMeteorGround: 'assets/effects/skill-meteor-ground-v2.png',
        skillFxContinuousSlash: 'assets/effects/skill-continuous-slash-v1.png',
        skillFxProjectile: 'assets/effects/skill-projectile-v2.png',
        skillFxEnemyProjectiles: 'assets/effects/enemy-projectiles-v1.webp',
        skillFxVenomFang: 'assets/effects/skill-venom-fang-v3.png',
        skillFxFrostField: 'assets/effects/skill-frost-field-v2.png',
        skillFxBlizzardAmbient: 'assets/effects/skill-bludgeoning-blizzard-ambient-sheet-v2.png',
        skillFxBlizzardImpact: 'assets/effects/skill-bludgeoning-blizzard-impact-sheet-v2.png',
        skillFxFrostWave: 'assets/effects/skill-frost-wave-v2.png',
        skillFxChaosBoomerang: 'assets/effects/skill-chaos-boomerang-v2.png',
        skillFxFrostBurst: 'assets/effects/skill-frost-burst-v1.png',
        skillFxFrostWaveRing: 'assets/effects/skill-frost-wave-ring-v1.png',
        skillFxBurst: 'assets/effects/skill-burst-v2.png',
        skillFxImpactFlare: 'assets/effects/skill-impact-flare-v1.png',
        ...SKILL_AREA_VFX_ASSETS,
        skillFxEarthSpike: 'assets/effects/pixel-earth-spike-v1.png',
        skillFxDotField: 'assets/effects/skill-dot-field-v2.png',
        skillFxSummonStrike: 'assets/effects/skill-summon-strike-v1.png',
        skillFxFocusBeam: 'assets/effects/channel-focus-beam-v2.png',
        skillFxDragonBreath: 'assets/effects/skill-dragon-breath-v3.png',
        skillFxVoidCutter: 'assets/effects/channel-void-cutter-v2.png',
        passiveTreeIcons: 'assets/ui/passive-tree-icons-v3.webp',
        passiveTreeKeystoneIcons: 'assets/ui/passive-tree-keystone-icons-v1.webp',
        passiveTreeNotableIcons: 'assets/ui/passive-tree-notable-icons-v4.webp',
        passiveTreeVoidSlot: 'assets/ui/passive-tree-slot-void-v3.webp',
        backdropAct1: 'assets/battlefield-act1.png',
        backdropAct2_6: 'assets/battlefield-act2-6.png',
        backdropAct3_7: 'assets/battlefield-act3-7.png',
        backdropAct4_8: 'assets/battlefield-act4-8.png',
        backdropAct5: 'assets/battlefield-act5.png',
        backdropAct9_10: 'assets/battlefield-act9-10.png',

        ...ACT_BATTLE_MAP_SOURCES,
        bgAct9Sap: ACT_BATTLE_MAP_EFFECTS.bgAct9.source,
        bgChaos0: 'assets/background/refined-20260910/bgChaos0.webp',
        bgChaos1: 'assets/background/refined-20260910/bgChaos1.webp',
        bgChaos2: 'assets/background/refined-20260910/bgChaos2.webp',
        bgChaos3: 'assets/background/refined-20260910/bgChaos3.webp',
        bgChaos4: 'assets/background/refined-20260910/bgChaos4.webp',
        bgChaos5: 'assets/background/refined-20260910/bgChaos5.webp',
        bgChaos6: 'assets/background/refined-20260910/bgChaos6.webp',
        bgChaos7: 'assets/background/refined-20260910/bgChaos7.webp',
        bgChaos8: 'assets/background/refined-20260910/bgChaos8.webp',
        bgChaos9: 'assets/background/refined-20260910/bgChaos9.webp',
        bgChaos10: 'assets/background/refined-20260910/bgChaos10.webp',
        bgChaos11: 'assets/background/refined-20260910/bgChaos11.webp',
        bgChaos12: 'assets/background/refined-20260910/bgChaos12.webp',
        bgChaos13: 'assets/background/refined-20260910/bgChaos13.webp',
        bgChaos14: 'assets/background/refined-20260910/bgChaos11.webp',
        bgChaos15: 'assets/background/refined-20260910/bgChaos10.webp',
        bgChaos16: 'assets/background/refined-20260910/bgChaos9.webp',
        bgChaos17: 'assets/background/refined-20260910/bgChaos1.webp',
        bgChaos18: 'assets/background/refined-20260910/bgChaos18.webp',
        summon1: 'assets/battle-clean/summon1.png',
        ...((typeof BOSS_ASSET_MANIFEST !== 'undefined' && BOSS_ASSET_MANIFEST) || {}),
    };
    Object.values((typeof PASSIVE_TREE_V22 !== 'undefined' && PASSIVE_TREE_V22.nodes) || {}).forEach(node => {
        const source = String(node && node.iconAsset || '');
        if (!/^assets\/ui\/passive-custom-icons\/[a-zA-Z0-9._-]+\.webp$/.test(source)) return;
        manifest[`passiveTreeCustom_${node.id}`] = source;
    });
    Object.keys(manifest).forEach(key => {
        if ((key.startsWith('hero') || key.startsWith('playerClass'))
            && typeof manifest[key] === 'string' && manifest[key].startsWith('assets/playable/')) {
            manifest[key] += '?v=20260902-directional-poses2';
        }
    });
    const optionalManifestKeys = new Set(Object.keys(manifest).filter(key => key.startsWith('hero') || key.startsWith('playerClass') || key.startsWith('bg') || key.startsWith('bossTelegraph') || key.startsWith('skillFx') || key.startsWith('passiveTree') || key.startsWith('wispEnemy')));
    // Avoid synchronous HEAD probes during boot. Missing optional files are handled by img.onerror,
    // which keeps first-page entry responsive while still waiting for all attempted assets to settle.
    const selectedHeroId = typeof getHeroAppearanceId === 'function' ? getHeroAppearanceId() : ((game && PLAYER_CLASS_DEFS[game.selectedClassId]) ? game.selectedClassId : 'archer');
    const selectedHeroDef = typeof getHeroSelectionDef === 'function'
        ? getHeroSelectionDef(selectedHeroId)
        : (PLAYER_CLASS_DEFS[selectedHeroId] || PLAYER_CLASS_DEFS.archer);
    const selectedHeroKeys = new Set(Object.values((selectedHeroDef || {}).strips || {})
        .flatMap(value => Array.isArray(value) ? value : ((value && typeof value === 'object') ? Object.values(value) : [value]))
        .filter(value => typeof value === 'string' && value));
    const criticalManifestKeys = new Set(['enemies', 'effects', 'summon1', 'bgAct1', getBattleBackdropKeyForZone(getZone(game.currentZoneId)), ...selectedHeroKeys]);
    const manifestGroups = prepareBattleAssetGroups(manifest, criticalManifestKeys, battleAssets.images, game.activeSkill, battleAssets.backdrops);
    const maxParallelLoads = Math.max(4, Math.min(8, Number((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 6) || 6));
    let pending = manifestGroups.length;
    let nextGroupIndex = 0;
    let activeLoads = 0;
    const totalAssets = pending;
    let settled = false;
    function updateBattleAssetLoadProgress() {
        if (typeof document === 'undefined') return;
        let overlay = document.getElementById('loading-overlay');
        if (!overlay || !overlay.classList.contains('active')) return;
        let loaded = Math.max(0, totalAssets - pending);
        let ratio = totalAssets > 0 ? (loaded / totalAssets) : 1;
        let progress = Math.floor(58 + ratio * 34);
        if (typeof advanceLoadingOverlay === 'function') {
            advanceLoadingOverlay({
                progress: progress,
                detail: `그림 불러오는 중 (${loaded}/${totalAssets})`,
                caption: '전투 그림 준비'
            });
        }
    }
    function finishLoad() {
        if (settled || pending > 0 || battleAssets.loadTicket !== loadTicket) return;
        settled = true;
        if (battleAssets.failedKeys.length > 0) {
            console.warn('battle asset load completed with missing files:', battleAssets.failedKeys.join(', '));
        }
        finalizeBattleAssets();
        if (resolveLoadPromise) resolveLoadPromise(!!battleAssets.ready);
    }

    function queueBattleSheetSanitization(key, image) {
        if (!ENABLE_BATTLE_SHEET_SANITIZATION) return;
        if (isLocalFileProtocol()) return;  // file:// 환경에서는 canvas.getImageData가 SecurityError를 던지므로 sanitization 건너뜀
        if (battleAssets.loadTicket !== loadTicket) return;
        try {
            let sanitized = sanitizeBattleSheet(image);
            if (key === 'enemies') {
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
            if (key.startsWith('backdrop') || key.startsWith('bg')) {
                battleAssets.backdrops[key] = image;
            } else {
                battleAssets.images[key] = image;
                if (!shouldPreserveOriginalBattleSheet(key)) queueBattleSheetSanitization(key, image);
            }
        } catch (error) {
            battleAssets.images[key] = image;
        }
    }

    function markBattleAssetGroupDone() {
        pending--;
        activeLoads = Math.max(0, activeLoads - 1);
        updateBattleAssetLoadProgress();
        finishLoad();
        pumpBattleAssetQueue();
    }

    function pumpBattleAssetQueue() {
        if (settled || battleAssets.loadTicket !== loadTicket) return;
        const concurrency = startupOverlayActive && !document.body.classList.contains('loading-active') ? 2 : maxParallelLoads;
        while (activeLoads < concurrency && nextGroupIndex < manifestGroups.length) {
            let group = manifestGroups[nextGroupIndex++];
            activeLoads++;
            let img = new Image();
            if (!isLocalFileProtocol()) img.crossOrigin = 'anonymous';
            img.decoding = 'async';
            img.loading = 'eager';
            if ('fetchPriority' in img) img.fetchPriority = concurrency === 2 ? 'low' : 'auto';
            img.onload = function() {
                group.keys.forEach(key => storeLoadedBattleImage(key, img));
                markBattleAssetGroupDone();
            };
            img.onerror = function() {
                let requiredKeys = group.keys.filter(key => !optionalManifestKeys.has(key));
                if (requiredKeys.length > 0) {
                    battleAssets.failed = true;
                    requiredKeys.forEach(key => battleAssets.failedKeys.push(key));
                    console.warn('battle asset load failed:', requiredKeys.join(','), group.src);
                }
                markBattleAssetGroupDone();
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

function resolveHeroMotionStripAnchor(baseAnchor, motionAnchors, motion, variantIndex, direction) {
    if (!baseAnchor) return null;
    motionAnchors = { ...motionAnchors, ...(motionAnchors && motionAnchors[direction]) };
    let configured = motion === 'attack' && motionAnchors && Array.isArray(motionAnchors.attacks)
        ? motionAnchors.attacks[variantIndex]
        : (motionAnchors && motionAnchors[motion]);
    if (!Number.isFinite(configured)) return baseAnchor;
    return { ...baseAnchor, anchorY: configured };
}

function getWispAtlasFrame(cell, motion, directionIndex, frameIndex) {
    const animated = motion !== 'idle';
    const tileWidth = animated ? 576 : 256;
    const tileHeight = animated ? 256 : 64;
    return {
        x: (cell % 3) * tileWidth + (animated ? frameIndex : directionIndex) * 64,
        y: Math.floor(cell / 3) * tileHeight + (animated ? directionIndex * 64 : 0),
        width: 64,
        height: 64,
        anchorX: 32,
        anchorY: 62,
        basisHeight: 64
    };
}

function buildWispEnemyVariants(images) {
    if (typeof WISP_MONSTER_VISUALS === 'undefined') return [];
    const attackImage = images.wispEnemyAttack;
    const glowImage = images.wispEnemyGlow;
    if (!attackImage || !glowImage) return [];
    const directions = ['south', 'north', 'west', 'east'];
    return WISP_MONSTER_VISUALS.map(wisp => {
        const directional = Object.fromEntries(directions.map((direction, directionIndex) => {
            const frames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: glowImage,
                frame: getWispAtlasFrame(wisp.cell, 'glow', directionIndex, frameIndex)
            }));
            const attackFrames = Array.from({ length: 9 }, (_, frameIndex) => ({
                image: attackImage,
                frame: getWispAtlasFrame(wisp.cell, 'attack', directionIndex, frameIndex)
            }));
            return [direction, { image: glowImage, frame: frames[0].frame, frames, attackFrames }];
        }));
        return {
            id: wisp.id, skinId: wisp.id, label: wisp.name,
            image: glowImage, frame: directional.south.frame,
            frames: directional.south.frames, attackFrames: directional.south.attackFrames,
            directions: directional
        };
    });
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
        hero1Idle: 1, hero1Walk: 15, hero1Attack: 7, hero1Hurt: 1, hero1Death: 1,
        hero2Idle: 1, hero2Walk: 17, hero2Attack: 7, hero2Hurt: 1, hero2Death: 1,
        hero3Idle: 1, hero3Walk: 17, hero3Attack: 7, hero3Hurt: 1, hero3Death: 1,
        hero4Idle: 1, hero4Walk: 13, hero4Attack: 7, hero4Hurt: 1, hero4Death: 1,
        hero5Idle: 1, hero5Walk: 17, hero5Attack: 7, hero5Hurt: 1, hero5Death: 1,
        hero6Idle: 1, hero6Walk: 10, hero6Attack: 7, hero6Hurt: 1, hero6Death: 1,
        hero7Idle: 1, hero7Walk: 17, hero7Attack: 7, hero7Hurt: 1, hero7Death: 1,
        hero8Idle: 1, hero8Walk: 15, hero8Attack: 7, hero8Hurt: 1, hero8Death: 1,
        hero9Idle: 1, hero9Walk: 13, hero9Attack: 7, hero9Hurt: 1, hero9Death: 1,
        hero10Idle: 1, hero10Walk: 11, hero10Attack: 7, hero10Hurt: 1, hero10Death: 1,
        playerClassOccultistIdle: 1, playerClassOccultistWalk: 9, playerClassOccultistAttack: 9, playerClassOccultistAttack2: 9,
        playerClassWandererIdle: 1, playerClassWandererWalk: 9, playerClassWandererAttack: 7, playerClassWandererAttack2: 7,
        playerClassClericIdle: 1, playerClassClericWalk: 9, playerClassClericAttack: 9,
        playerClassArcherIdle: 1, playerClassArcherWalk: 9, playerClassArcherAttack: 9, playerClassArcherAttack2: 9,
        playerClassAlchemistIdle: 1, playerClassAlchemistWalk: 9, playerClassAlchemistAttack: 8,
        playerClassAlchemistAttack2: 9, playerClassAlchemistAttack3: 4,
        playerClassWarriorIdle: 1, playerClassWarriorWalk: 9, playerClassWarriorAttack: 8,
        playerClassWarriorAttack2: 9, playerClassWarriorAttack3: 9,
        playerClassOccultistWalkSouth: 7,
        playerClassArcherWalkSouth: 8
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
    function getHeroStripAnchor(image, frameCount) {
        if (!image || !Number.isFinite(frameCount) || frameCount <= 0) return null;
        let frameWidth = Math.max(1, Math.round(image.width / frameCount));
        let raw = { x: 0, y: 0, width: frameWidth, height: image.height };
        let content = trimRectToContent(image, raw, 1) || raw;
        return {
            xRatio: 0.5,
            anchorY: content.y + content.height - raw.y,
            basisHeight: Math.max(1, content.height)
        };
    }
    function buildAnchoredHeroStripFrames(image, frameCount, anchor) {
        if (!image || !anchor || !Number.isFinite(frameCount) || frameCount <= 0) return [];
        let frames = [];
        for (let i = 0; i < frameCount; i++) {
            let x = Math.round(i * image.width / frameCount);
            let nextX = i === frameCount - 1 ? image.width : Math.round((i + 1) * image.width / frameCount);
            let raw = { x: x, y: 0, width: Math.max(1, nextX - x), height: image.height };
            frames.push(withImageRef(image, {
                ...raw,
                anchorX: raw.width * anchor.xRatio,
                anchorY: anchor.anchorY,
                basisHeight: anchor.basisHeight
            }));
        }
        return frames.filter(Boolean);
    }
    function buildDirectionalHeroAttackFrames(directionKeys, anchor, motionAnchors) {
        let result = {};
        Object.entries(directionKeys || {}).forEach(([direction, keys]) => {
            let variants = (Array.isArray(keys) ? keys : []).map((key, index) => {
                let image = battleAssets.images[key];
                let frameCount = heroStripFrameCounts[key] || inferStripFallbackColumns(image);
                let motionAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index, direction);
                return buildAnchoredHeroStripFrames(image, frameCount, motionAnchor);
            }).filter(frames => frames.length > 0);
            if (variants.length > 0) result[direction] = variants;
        });
        return result;
    }
    function buildHeroFrameSetFromStripKeys(stripKeys, heroId) {
        if (!stripKeys) return null;
        let motionDefinition = typeof PLAYER_CLASS_DEFS === 'object'
            ? PLAYER_CLASS_DEFS[heroId]
            : null;
        let motionAnchors = motionDefinition && motionDefinition.motionAnchors;
        let idleImage = battleAssets.images[stripKeys.idle];
        let idleCount = heroStripFrameCounts[stripKeys.idle];
        let anchor = getHeroStripAnchor(idleImage, idleCount);
        let idleAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0);
        let walkAnchor = resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0);
        let idleFrames = buildAnchoredHeroStripFrames(idleImage, idleCount, idleAnchor);
        let idleDirections = Object.fromEntries(Object.entries(stripKeys.idleDirections || {}).map(([direction, key]) => [
            direction,
            buildAnchoredHeroStripFrames(battleAssets.images[key], heroStripFrameCounts[key] || idleCount, resolveHeroMotionStripAnchor(anchor, motionAnchors, 'idle', 0, direction))
        ]).filter(entry => entry[1].length > 0));
        let walkFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.walk], heroStripFrameCounts[stripKeys.walk], walkAnchor);
        let walkDirections = Object.fromEntries(Object.entries(stripKeys.walkDirections || {}).map(([direction, key]) => [
            direction,
            buildAnchoredHeroStripFrames(battleAssets.images[key], heroStripFrameCounts[key] || heroStripFrameCounts[stripKeys.walk], resolveHeroMotionStripAnchor(anchor, motionAnchors, 'walk', 0, direction))
        ]).filter(entry => entry[1].length > 0));
        let attackKeys = Array.isArray(stripKeys.attacks) && stripKeys.attacks.length > 0 ? stripKeys.attacks : [stripKeys.attack];
        let attackVariants = attackKeys.map((key, index) => buildAnchoredHeroStripFrames(
            battleAssets.images[key], heroStripFrameCounts[key],
            resolveHeroMotionStripAnchor(anchor, motionAnchors, 'attack', index)
        )).filter(frames => frames.length > 0);
        let attackDirections = buildDirectionalHeroAttackFrames(stripKeys.attackDirections, anchor, motionAnchors);
        let attackVariantWeights = motionDefinition && Array.isArray(motionDefinition.attackVariantWeights)
            && motionDefinition.attackVariantWeights.length === attackVariants.length
            ? motionDefinition.attackVariantWeights.slice()
            : null;
        let attackFrames = attackVariants[0] || [];
        let hurtFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.hurt], heroStripFrameCounts[stripKeys.hurt], idleAnchor);
        let downFrames = buildAnchoredHeroStripFrames(battleAssets.images[stripKeys.death], heroStripFrameCounts[stripKeys.death], idleAnchor);
        if (idleFrames.length === 0 || walkFrames.length === 0 || attackFrames.length === 0) return null;
        let hold = idleFrames[0] || walkFrames[0] || attackFrames[0];
        return {
            characterAnimations: {
                idle: idleFrames,
                idleDirections: idleDirections,
                walk_or_run: walkFrames,
                walkDirections: walkDirections,
                attackDirections: attackDirections,
                sword_attack_body: attackFrames,
                cast_body: attackFrames,
                hurt: hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean),
                down_or_knockdown: downFrames.length > 0 ? downFrames : (hurtFrames.length > 0 ? hurtFrames : [hold].filter(Boolean)),
                bow_attack_body: attackFrames
            },
            clipLoop: {
                idle: true,
                walk_or_run: true,
                sword_attack_body: false,
                cast_body: false,
                hurt: false,
                down_or_knockdown: false,
                bow_attack_body: false
            },
            idle: idleFrames,
            idleDirections: idleDirections,
            walk: walkFrames,
            run: walkFrames,
            attackVariants: attackVariants,
            attackDirections: attackDirections,
            attackVariantWeights: attackVariantWeights,
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
        if (!image || isPreCleanedBattleSheet('enemies')) return image;
        try {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(sanitizeBattleSheet(image)));
        } catch (error) {
            return sanitizeLocalMonsterBackdropSheet(sanitizeWhiteBackdropSheet(image));
        }
    }
    let heroFrameSetSource = selectedHeroDef.id;
    let heroFrameSet = buildHeroFrameSetFromStripKeys(selectedHeroDef.strips, selectedHeroDef.id);
    if (!heroFrameSet && selectedHeroDef.id !== 'archer') {
        heroFrameSet = buildHeroFrameSetFromStripKeys(PLAYER_CLASS_DEFS.archer.strips, 'archer');
        if (heroFrameSet) heroFrameSetSource = 'archer';
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
        let sourceDef = getHeroSelectionDef(heroFrameSetSource) || selectedHeroDef || PLAYER_CLASS_DEFS.archer;
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
    // The frames are measured once; drop the pixel-reading copy of the atlas (another full decode).
    battleImageCanvasCache.delete(enemySpriteImage);
    const wispEnemyVariants = buildWispEnemyVariants(battleAssets.images);
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
        // 일반과 정예는 자기 시트로 그린다(액트 몬스터 js/canvas-monster-actors.js, 위습 js/canvas-wisp-actors.js).
        // 이 아틀라스 목록은 그 시트를 못 불러왔을 때의 대체 그림이다.
        normal: wispEnemyVariants.length ? wispEnemyVariants : [
            { image: enemySpriteImage, frame: enemyFrames.slime },
            { image: enemySpriteImage, frame: enemyFrames.bandit },
            { image: enemySpriteImage, frame: enemyFrames.shadow },
            { image: enemySpriteImage, frame: enemyFrames.wraith }
        ].filter(entry => hasUsableFrame(entry.frame)),
        elite: wispEnemyVariants.length ? wispEnemyVariants : [
            { image: enemySpriteImage, frame: enemyFrames.knight },
            { image: enemySpriteImage, frame: enemyFrames.skeleton }
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
            skinVariants: Object.fromEntries(wispEnemyVariants.map(entry => [entry.skinId, entry])),
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

/**
 * Aligns an axis-aligned destination rectangle to backing-store pixels.
 * This keeps one-pixel sprite details stable at fractional device scales such as 125%.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @param {number} height
 * @returns {{x: number, y: number, width: number, height: number}}
 */
function snapCanvasRectToDevicePixels(ctx, x, y, width, height) {
    let transform = ctx.getTransform();
    let scaleX = Number(transform.a);
    let scaleY = Number(transform.d);
    let axisAligned = Number.isFinite(scaleX) && Math.abs(scaleX) > 0.001
        && Number.isFinite(scaleY) && Math.abs(scaleY) > 0.001
        && Math.abs(Number(transform.b) || 0) < 0.001
        && Math.abs(Number(transform.c) || 0) < 0.001;
    if (!axisAligned) return { x, y, width, height };
    let left = (Math.round(x * scaleX + transform.e) - transform.e) / scaleX;
    let top = (Math.round(y * scaleY + transform.f) - transform.f) / scaleY;
    let right = (Math.round((x + width) * scaleX + transform.e) - transform.e) / scaleX;
    let bottom = (Math.round((y + height) * scaleY + transform.f) - transform.f) / scaleY;
    return { x: left, y: top, width: Math.max(1 / Math.abs(scaleX), right - left), height: Math.max(1 / Math.abs(scaleY), bottom - top) };
}

function getBattleActorDrawAlpha(ctx,alpha) {
    return (alpha ?? 1)*(ctx.battleActorAlpha ?? 1);
}

// 윤곽선 스프라이트 캐시. ctx.filter(drop-shadow 4개)는 그릴 때마다 캔버스 전체 크기의 임시 버퍼를 만들어,
// 전장이 클수록 비싸다(GPU 없는 렌더에서 1440×900 기준 프레임당 약 100ms). 같은 원본 조각·크기·색이면
// 윤곽을 한 번만 만들어 두고 그림처럼 찍는다. 표시 전용이며 판정·좌표와 무관하다.
const OUTLINED_SPRITE_CACHE_LIMIT = 192;
const outlinedSpriteCache = new Map();
const outlinedSpriteImageIds = new WeakMap();
let outlinedSpriteNextImageId = 1;

function getOutlinedSpriteSurface(sourceImage, src, size, outline) {
    let imageId = outlinedSpriteImageIds.get(sourceImage);
    if (!imageId) { imageId = outlinedSpriteNextImageId++; outlinedSpriteImageIds.set(sourceImage, imageId); }
    const key = [imageId, src.x, src.y, src.w, src.h, size.w, size.h, outline.color, outline.thickness, outline.smooth, outline.fill].join('|');
    const cached = outlinedSpriteCache.get(key);
    if (cached) {
        outlinedSpriteCache.delete(key);
        outlinedSpriteCache.set(key, cached);
        return cached;
    }
    const surface = createOutlinedSpriteSurface(sourceImage, src, size, outline);
    if (!surface) return null;
    outlinedSpriteCache.set(key, surface);
    if (outlinedSpriteCache.size > OUTLINED_SPRITE_CACHE_LIMIT) outlinedSpriteCache.delete(outlinedSpriteCache.keys().next().value);
    return surface;
}

function createOutlinedSpriteSurface(sourceImage, src, size, outline) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') return null;
    const t = outline.thickness, color = outline.color;
    const canvas = document.createElement('canvas');
    canvas.width = size.w + t * 2;
    canvas.height = size.h + t * 2;
    const c = canvas.getContext && canvas.getContext('2d');
    if (!c) return null;
    c.imageSmoothingEnabled = outline.smooth;
    if (!outline.fill) c.filter = `drop-shadow(0 ${t}px 0 ${color}) drop-shadow(0 ${-t}px 0 ${color}) drop-shadow(${t}px 0 0 ${color}) drop-shadow(${-t}px 0 0 ${color})`;
    c.drawImage(sourceImage, src.x, src.y, src.w, src.h, t, t, size.w, size.h);
    if (outline.fill) {
        c.globalCompositeOperation = 'source-in';
        c.fillStyle = color;
        c.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
}

/** Source/destination rectangles are [x, y, width, height]. Cache a native-size silhouette, never a full-canvas filter.
 * A short cream flash remains readable even on dark sprites; alpha and transparent pixels remain intact. */
function drawBattleSpriteImage(ctx, image, source, box, flash) {
    ctx.drawImage(image, ...source, ...box);
    if (!(flash > 0)) return;
    const [x, y, w, h] = source;
    const surface = getOutlinedSpriteSurface(image, { x, y, w, h }, { w, h },
        { color: '#fff4df', thickness: 0, smooth: false, fill: true });
    if (!surface) return;
    ctx.save();
    ctx.filter = 'none';
    ctx.globalAlpha *= Math.min(1, Number(flash));
    ctx.drawImage(surface, ...box);
    ctx.restore();
}

// 윤곽 패스: 캐시한 윤곽 그림을 (x, y) 기준으로 찍는다. 원래처럼 윤곽 알파로 그린 뒤 본 그림을 위에 덧그린다.
function drawBattleSpriteOutline(ctx, sourceImage, src, box, options) {
    const thickness = Math.max(1, Math.round(options.outlineThickness || 1));
    const surface = getOutlinedSpriteSurface(sourceImage, src, { w: box.w, h: box.h },
        { color: options.outlineColor, thickness, smooth: ctx.imageSmoothingEnabled !== false });
    if (!surface) return;
    ctx.globalAlpha = (options.alpha === undefined ? 1 : options.alpha) * (options.outlineAlpha || 0.78);
    ctx.drawImage(surface, box.x - thickness, box.y - thickness, box.w + thickness * 2, box.h + thickness * 2);
    ctx.globalAlpha = options.alpha === undefined ? 1 : options.alpha;
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
    let rawAnchorX = Number.isFinite(options.anchorX) ? options.anchorX : (Number.isFinite(rect.anchorX) ? rect.anchorX : rect.width / 2);
    let rawAnchorY = Number.isFinite(options.anchorY) ? options.anchorY : (Number.isFinite(rect.anchorY) ? rect.anchorY : rect.height);
    let sourceAnchorX = clampNumber(rawAnchorX - cropLeft, 0, srcW);
    let sourceAnchorY = clampNumber(rawAnchorY - cropTop, 0, srcH);
    let drawOffsetX = Number(options.offsetX !== undefined ? options.offsetX : rect.offsetX) || 0;
    let drawOffsetY = Number(options.offsetY !== undefined ? options.offsetY : rect.offsetY) || 0;
    let dx = Math.round(x - sourceAnchorX * scale + drawOffsetX);
    let dy = Math.round(y - sourceAnchorY * scale + drawOffsetY);
    ctx.save();
    ctx.globalAlpha = getBattleActorDrawAlpha(ctx,options.alpha);
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
        if (options.outlineColor) drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: Math.round(-drawWidth / 2), y: Math.round(-drawHeight / 2), w: drawWidth, h: drawHeight }, options);
        drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [Math.round(-drawWidth / 2), Math.round(-drawHeight / 2), drawWidth, drawHeight], options.flash);
    } else {
        if (options.devicePixelSnap === true) {
            let snappedRect = snapCanvasRectToDevicePixels(ctx, dx, dy, drawWidth, drawHeight);
            dx = snappedRect.x;
            dy = snappedRect.y;
            drawWidth = snappedRect.width;
            drawHeight = snappedRect.height;
        }
        if (options.flipX) {
            let centerX = dx + drawWidth / 2;
            ctx.translate(centerX, 0);
            ctx.scale(-1, 1);
            ctx.translate(-centerX, 0);
        }
        if (options.outlineColor) drawBattleSpriteOutline(ctx, sourceImage, { x: srcX, y: srcY, w: srcW, h: srcH },
            { x: dx, y: dy, w: drawWidth, h: drawHeight }, options);
        drawBattleSpriteImage(ctx, sourceImage, [srcX, srcY, srcW, srcH], [dx, dy, drawWidth, drawHeight], options.flash);
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

/** Save boundary: convert old projectile counts once; stat id records the new percent unit. */
function migrateEquipmentProjectileOption(stat) {
    if (!stat) return;
    if (stat.id === 'projectileExtraShots') {
        stat.id = 'projectileExtraChance';
        for (const key of ['val', 'valMin', 'valMax', 'baseRollMin', 'baseRollMax', 'originalVal']) {
            if (stat[key] !== null && Number.isFinite(Number(stat[key]))) stat[key] = Number(stat[key]) * 50;
        }
        stat.statName = getStatName(stat.id);
    }
    (stat.extraStats || []).forEach(migrateEquipmentProjectileOption);
}

function migrateEquipmentAffixValue(stat, mod, preserveValue = stat.affixBalanceVersion >= 1) {
    const tier = Math.max(1, Math.min(mod.tierValues.length, stat.tier || 1));
    const range = mod.tierValues[tier - 1];
    const [min, max] = Array.isArray(range) ? range : [range, range];
    const oldWidth = stat.valMax - stat.valMin;
    const rank = oldWidth > 0 ? Math.max(0, Math.min(1, (stat.val - stat.valMin) / oldWidth)) : 0.5;
    const step = mod.valueStep || (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01);
    // Version 2 only widens tier ranges downwards: keep existing rolls, including crafting bonuses.
    if (!preserveValue) stat.val = Number((min + Math.round(rank * (max - min) / step) * step).toFixed(2));
    Object.assign(stat, {valMin:min, valMax:max, tier, valueStep:step, fixedValue:!!mod.fixedValue,
        sourceModId:mod.id, affixBalanceVersion:mod.affixBalanceVersion, statName:mod.statName || getStatName(stat.id)});
}

function findStoredEquipmentAffix(item, stat) {
    const candidates = MOD_DB.filter(mod => mod.slots.includes(item.slot) && (mod.statId || mod.id) === stat.id)
        .map(mod => makeDualDefenseAffixMod(item, mod));
    const extraIds = (stat.extraStats || []).map(extra => extra.id);
    return candidates.find(row => row.id === stat.sourceModId)
        || candidates.find(row => getExplicitModStatIds(row).filter(id => id !== stat.id)
            .every(id => extraIds.includes(id)) && (row.compound || []).length === extraIds.length);
}

function migrateEquipmentAffixBalance(item) {
    [...item.baseStats, ...item.stats, item.underEnchant, item.chaosInfusion].forEach(migrateEquipmentProjectileOption);
    if (item.rarity === 'unique') return;
    for (const stat of item.stats) {
        if (stat.affixBalanceVersion >= 2 || !stat.tier || stat.fossilExclusiveDrop || stat.fossilExclusiveSpore) continue;
        const mod = findStoredEquipmentAffix(item, stat);
        if (!mod) continue;
        const preserveValue = stat.affixBalanceVersion >= 1;
        migrateEquipmentAffixValue(stat, mod);
        (stat.extraStats || []).forEach(extra => {
            const sub = mod.compound.find(row => (row.statId || row.id) === extra.id);
            if (sub) migrateEquipmentAffixValue(extra, sub, preserveValue);
        });
    }
}

function syncStoredUniqueEffect(item) {
    if (item.rarity !== 'unique') return;
    const source = UNIQUE_DB.find(unique => unique.syncEffectOnLoad && unique.name === item.name);
    if (!source) return;
    item.uniqueEffect = source.uniqueEffect || '';
    item.uniqueEffectKey = source.uniqueEffectKey || '';
    item.uniqueEffectParams = source.uniqueEffectParams ? JSON.parse(JSON.stringify(source.uniqueEffectParams)) : null;
}

// legacyDamageBase is the pre-2026-09-11 definition. Keep rolled rank and exceptional overflow,
// and mark each base stat once; hidden/affix tiers never determine weapon base strength.
function migrateWeaponBaseDamage(item) {
    if (item.slot !== '무기') return;
    if (item.baseStats.every(stat => stat.baseDamageBalanceVersion >= 1
        || !['flatDmg', 'spellFlatDmg'].includes(stat.id))) return;
    const base = BASE_ITEM_DB.find(row => row.id === item.baseId)
        || BASE_ITEM_DB.find(row => row.slot === '무기' && row.name === item.baseName);
    if (!base || base.slot !== '무기') return;
    for (const stat of item.baseStats) {
        if (stat.baseDamageBalanceVersion >= 1) continue;
        const definition = base.baseStats.find(row => row.id === stat.id && row.legacyDamageBase > 0);
        if (definition) migrateWeaponBaseDamageStat(stat, definition);
    }
}

function migrateWeaponBaseDamageStat(stat, definition) {
    const oldMin = Math.max(1, Math.floor(definition.legacyDamageBase * 0.8));
    const oldMax = Math.max(oldMin, Math.floor(definition.legacyDamageBase * 1.2));
    const nextMin = Math.max(1, Math.floor(definition.base * 0.8));
    const nextMax = Math.max(nextMin, Math.floor(definition.base * 1.2));
    const convert = value => {
        if (value > oldMax) return Math.floor(value * nextMax / oldMax);
        if (value < oldMin) return Math.floor(value * nextMin / oldMin);
        const rank = oldMax > oldMin ? (value - oldMin) / (oldMax - oldMin) : 0.5;
        return nextMin + Math.round(rank * (nextMax - nextMin));
    };
    stat.val = convert(stat.val);
    if (Number.isFinite(stat.originalVal)) stat.originalVal = convert(stat.originalVal);
    Object.assign(stat, {valMin:nextMin, valMax:nextMax, baseRollMin:nextMin, baseRollMax:nextMax,
        baseDamageBalanceVersion:1});
}

/** Convert a saved implicit by roll rank; retain exceptional/quality rolls above the normal maximum. */
function migrateUniqueBaseStat(stat, old) {
    const width = old ? old.valMax - old.valMin : 0;
    const percentile = width > 0 ? clampNumber((old.val - old.valMin) / width, 0, 1) : 0.5;
    const rolled = rollBaseStat(stat, percentile);
    const result = { ...old, ...rolled, originalVal: null };
    if (!old) return result;
    const convert = value => {
        if (value <= old.valMax || old.valMax <= 0) {
            return rollBaseStat(stat, width > 0 ? clampNumber((value - old.valMin) / width, 0, 1) : 0.5).val;
        }
        const valueScale = getBaseStatRollRange(stat).usesDecimalRoll ? 10 : 1;
        return Math.floor(rolled.valMax * value / old.valMax * valueScale) / valueScale;
    };
    result.val = convert(old.val);
    if (Number.isFinite(old.originalVal)) result.originalVal = convert(old.originalVal);
    return result;
}

function migrateUniqueBaseStats(item, base) {
    const remaining = item.baseStats.filter(stat => stat.id !== 'flaskUtilSlots');
    return base.baseStats.map(stat => {
        const index = Math.max(0, remaining.findIndex(row => row.id === stat.id));
        return migrateUniqueBaseStat(stat, remaining.splice(index, 1)[0]);
    });
}

/** Restore old unique bases once; keep the original rolls for recovery, never reroll affixes. */
function migrateUniqueEquipmentIdentity(item) {
    if (item.uniqueEquipmentVersion === 1) return;
    const rule = item.rarity === 'unique' && UNIQUE_EQUIPMENT_RULES[item.name];
    if (!rule) return;
    const base = BASE_ITEM_DB.find(row => row.id === rule.baseId);
    item.uniqueEquipmentVersion = 1;
    if (item.baseId === base.id && item.slot === base.slot) return;
    if (hasLegacyUniqueBaseUpgrade(item, base.slot)) return;
    item.uniqueBaseLegacy ??= { baseId: item.baseId, baseName: item.baseName, slot: item.slot,
        baseStats: JSON.parse(JSON.stringify(item.baseStats)) };
    item.baseStats = migrateUniqueBaseStats(item, base);
    item.baseId = base.id;
    item.baseName = base.name;
    item.slot = base.slot;
    item.exceptionalStatNames = item.baseStats.filter(stat => stat.exceptional).map(stat => stat.statName);
    item.exceptionalBase = item.exceptionalStatNames.length > 0;
    item.exceptionalStatName = item.exceptionalStatNames.join(', ');
    item.exceptionalAllLines = item.exceptionalBase && item.exceptionalStatNames.length === item.baseStats.length;
}

/** The old upgrade action raised itemTier, but left the original hiddenTier unchanged. */
function hasLegacyUniqueBaseUpgrade(item, slot) {
    const previous = BASE_ITEM_DB.find(base => base.id === item.baseId);
    return previous && previous.slot === slot && item.slot === slot
        && item.itemTier > item.hiddenTier && previous.reqTier === item.itemTier;
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
            originalVal: coerceFiniteNumber(stat.originalVal ?? NaN, null)
        };
        normalized.craftSource = equipmentCrafting.getSource(stat);
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
    // Corruption socket (2026-10-05): only its shape is kept; a jewel already in it is never dropped.
    if (item.corruptionSocket !== undefined) {
        if (item.corruptionSocket && typeof item.corruptionSocket === 'object') item.corruptionSocket = { jewel: (item.corruptionSocket.jewel && typeof item.corruptionSocket.jewel === 'object') ? item.corruptionSocket.jewel : null };
        else delete item.corruptionSocket;
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
    migrateUniqueEquipmentIdentity(item);
    const existingHighAffixTier = item.stats.reduce((max, stat) => Math.max(max, Math.floor(coerceFiniteNumber(stat && stat.tier, 0))), 0);
    const storedHighAffixCap = Number.isFinite(Number(item.affixTierCap)) && Number(item.affixTierCap) >= 11;
    const legacyProgressionProvenance = item.dropRealm === 'cosmos' || storedHighAffixCap || existingHighAffixTier >= 11;
    item.dropRealm = typeof item.dropRealm === 'string' ? item.dropRealm : null;
    item.affixTierCap = clampNumber(Math.floor(coerceFiniteNumber(
        item.affixTierCap,
        legacyProgressionProvenance ? item.hiddenTier : Math.min(10, item.hiddenTier)
    )), 1, legacyProgressionProvenance ? 20 : 10);
    // 2026-10-01 물약 삭제: 허리띠의 '유틸리티 플라스크 슬롯' 베이스 옵션은 쓸 곳이 없어 불러올 때 지운다.
    if (item.slot === '허리띠') item.baseStats = item.baseStats.filter(stat => !stat || stat.id !== 'flaskUtilSlots');
    item.baseName = item.baseName || item.name || '알 수 없는 장비';
    item.name = item.name || item.baseName;
    syncStoredUniqueEffect(item);
    item.locked = !!item.locked;
    migrateWeaponBaseDamage(item);
    migrateEquipmentAffixBalance(item);
    item.hallReplica = !!item.hallReplica;
    item.hallRelistBlocked = !!item.hallRelistBlocked;
    if (item.hallReplica) {
        item.locked = true;
        item.tradeLocked = true;
        item.hallSourceId = Math.max(0, Math.floor(coerceFiniteNumber(item.hallSourceId, 0)));
        item.hallAppraisalScore = Math.max(0, Math.floor(coerceFiniteNumber(item.hallAppraisalScore, 0)));
        item.hallCuratorName = String(item.hallCuratorName || '').slice(0, 24);
    }
    if (!item.id) item.id = ++itemIdCounter;
    return levelProgression.stampItem(item);
}

function getItemCraftTier(item) {
    if (!item) return 1;
    if (Number.isFinite(item.affixTierCap)) return clampNumber(Math.floor(item.affixTierCap), 1, item.affixTierCap >= 11 ? 20 : 10);
    const existingHighAffixTier = (Array.isArray(item.stats) ? item.stats : []).reduce((max, stat) => Math.max(max, Math.floor(Number(stat && stat.tier) || 0)), 0);
    if (existingHighAffixTier >= 11) return clampNumber(Math.max(existingHighAffixTier, Math.floor(Number(item.hiddenTier) || 1)), 11, 20);
    if (Number.isFinite(item.hiddenTier)) return clampNumber(Math.floor(item.hiddenTier), 1, 10);
    if (Number.isFinite(item.itemTier)) return clampNumber(Math.floor(item.itemTier), 1, 10);
    return 1;
}

function getRealmEquipmentHiddenTierCap(zone) {
    if (!zone) return 1;
    const cap = REALM_EQUIPMENT_TIER_CAPS[zone.type];
    return cap ? cap(zone) : Math.min(15, Math.max(1, Math.floor(Number(zone.tier) || 1)));
}
function getChaosDepthEquipmentTierCap(depth) {
    return Math.min(15, 10 + Math.floor((Math.max(1, Math.floor(Number(depth) || 1)) - 1) / 5));
}
// 콘텐츠별 장비 베이스 티어 상한(표에 없는 콘텐츠는 전투 tier, 최대 15).
const REALM_EQUIPMENT_TIER_CAPS = Object.freeze({
    act: zone => Math.min(9, Math.max(1, Math.floor(Number(zone.storyOrder) || Number(zone.id) + 1 || 1))),
    abyss: zone => getChaosDepthEquipmentTierCap(zone.depth),
    timeRift: zone => getChaosDepthEquipmentTierCap(zone.equivalentChaosDepth),
    // 전투 tier는 지하계 환산값(첫 지역도 50+)이다. 전리품은 아틀라스에 표시된
    // 1~25 티어를 사용해야 G1~G5가 각각 T16~T20으로 한 단계씩 열린다.
    cosmos: zone => Math.min(20, 16 + Math.floor((Math.max(1, Math.floor(Number(zone.lootTier) || Number(zone.tier) || 1)) - 1) / 5)),
    // 세계수 아틀라스: 지도 등급이 오를수록 T15 → T20 (js/atlas.js lootTier).
    atlasMap: zone => atlas.lootTier(zone.atlasTier)
});

function getRealmEquipmentAffixTierCap(zone, hiddenTierCap) {
    const itemTier = Math.max(1, Math.floor(Number(hiddenTierCap) || 1));
    return Math.min(zone && ['cosmos', 'atlasMap'].includes(zone.type) ? 20 : 15, itemTier);
}

/**
 * @param {{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}|null} zone
 * @param {{isBoss?: boolean, isElite?: boolean}|null} enemy
 * @returns {{min: number, max: number}}
 */
function getRealmItemDropTierRange(zone, enemy) {
    const maxTier = getRealmEquipmentHiddenTierCap(zone);
    const width = enemy && enemy.isBoss ? 2 : (enemy && enemy.isElite ? 3 : 4);
    return { min: Math.max(1, maxTier - width), max: maxTier };
}

function getDroppedAffixTierRange(itemTier) {
    const maxTier = clampNumber(Math.floor(Number(itemTier) || 1), 1, 20);
    return { min: 1, max: maxTier };
}

const DROPPED_AFFIX_TIER_WEIGHT_FALLOFF = 0.2;

function getCraftTierRangeForItem(item, source) {
    let maxTier = getItemCraftTier(item);
    if (maxTier < 11) return { min: 1, max: maxTier };
    return { min: source === 'spore' ? 9 : 10, max: maxTier };
}

/** Includes legacy special rolls that predate fixedValue metadata. Does not change their values. */
function isFixedEquipmentAffix(stat) {
    if (stat.fixedValue) return true;
    if (!stat.fossilExclusive && !stat.fossilExclusiveDrop && !stat.fossilExclusiveSpore) return false;
    if (stat.fossilExclusive && !stat.tier) return true;
    return FOSSIL_EXCLUSIVE_MODS.some(mod => (mod.statId || mod.id) === stat.id && mod.step === 0);
}

function getTierVisualLevel(tierValue) {
    return clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 10);
}

function getTierDisplayLevel(tierValue) {
    return clampNumber(Math.max(1, Math.floor(Number(tierValue) || 1)), 1, 20);
}

function getTierClassName(tierValue) {
    return `tier-${getTierVisualLevel(tierValue)}`;
}

function getTierBadgeHtml(tierValue, labelPrefix) {
    // 고유 아이템 확정(고정) 옵션은 tier 0 으로 생성된다. 이 경우 T1 대신 U로 표기.
    if (Math.floor(Number(tierValue)) === 0) {
        return `<span class="tier-badge tier-badge-unique" style="color:#ff9f43;">[U]</span>`;
    }
    let tier = getTierDisplayLevel(tierValue);
    let label = labelPrefix || 'T';
    return `<span class="tier-badge ${getTierClassName(tier)}">[${label}${tier}]</span>`;
}

function getUniqueCodexKeyByItem(item) {
    if (!item || item.rarity !== 'unique') return null;
    return `${item.slot}|${item.name}`;
}

// 고유 아이템 획득 시 도감에 즉시 등록(아이템을 소모하지 않는 수집 기록 개념).
function registerUniqueToCodexOnAcquire(item, owner = game) {
    let key = getUniqueCodexKeyByItem(item);
    if (!key) return false;
    owner.uniqueCodex ??= {};
    let existing = owner.uniqueCodex[key];
    // 이미 옵션까지 기록된 경우 첫 등록 기록을 유지한다(루프 리셋 후 정보만 남은 경우는 다시 채움).
    if (existing && existing.baseName) return false;
    owner.uniqueCodex[key] = JSON.parse(JSON.stringify(item));
    let firstTime = !existing;
    if (!firstTime) return true;
    owner.codexNewlyRegistered ??= {};
    owner.codexNewlyRegistered[key] = true;
    if (owner.noti) owner.noti.codex = true;
    if (owner !== game) return true; // Restore collection history without live UI effects during save migration.
    addLog(`📚 도감 신규 등록: <span class='loot-unique'>[${item.name}]</span>`, 'loot-unique');
    if (typeof tryGrantCodexCompletionReward === 'function') tryGrantCodexCompletionReward();
    return true;
}

const EQUIPMENT_DROP_SLOTS = ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠', '방패'];

/** 뿌리촉수 드랍: 후보에 그 무기 대분류 바탕이 있으면 그것만 남긴다(그 지역 단계에 없으면 후보 그대로). */
function keepWeaponCategoryBases(candidates, weaponCategory) {
    const own = weaponCategory ? candidates.filter(base => getWeaponCategoryOfBase(base.id) === weaponCategory) : [];
    return own.length > 0 ? own : candidates;
}

/** 승급 체인 맨 위: 6단계 체인의 6단계(더 긴 체인은 그 맨 위), 또는 20단계 이상 베이스(듀얼 방어구의 4단계 등). */
function isBaseChainTop(base) {
    return getBaseChainRank(getBaseChainInfo(base)) >= 6 || (base.reqTier || 0) >= 20;
}

/** 드랍 후보 베이스의 가중치(data/items.js BASE_DROP_WEIGHTS): 체인 맨 위는 드물게, 드랍 티어보다 한참 낮은 일반 베이스는 덜. */
function getBaseDropWeight(base, dropTier) {
    const rules = BASE_DROP_WEIGHTS;
    if (base.dropOnly || base.realmBase) return (base.reqTier || 0) >= 20 ? rules.contentTop : 1;
    const top = isBaseChainTop(base) ? rules.chainTop : 1;
    return (base.reqTier || 1) < dropTier - rules.windowTiers ? top * rules.belowWindow : top;
}

function chooseItemBase(slot, zoneTier, zone = getZone(game.currentZoneId) || {}, weaponCategory) {
    const zoneRealm = zone.type === 'chaosRealm' ? 'chaos' : (zone.type === 'underworld' ? 'underworld' : (zone.type === 'cosmos' ? 'cosmos' : null));
    let candidates = BASE_ITEM_DB.filter(base => {
        // Realm bases retain their equip tier while using the realm's reachable drop tier.
        if (base.slot !== slot || (base.dropOnly?.minTier ?? base.reqTier) > zoneTier) return false;
        if (base.realmBase && base.realmBase !== zoneRealm) return false;
        if (!base.dropOnly) return true;
        if (base.dropOnly.type && zone.type !== base.dropOnly.type) return false;
        if (base.dropOnly.id && zone.id !== base.dropOnly.id) return false;
        if (base.dropOnly.minFloor && Math.floor(zone.floor || 0) < base.dropOnly.minFloor) return false;
        return true;
    });
    if (candidates.length === 0) candidates = BASE_ITEM_DB.filter(base => base.slot === slot && !base.realmBase);
    candidates = keepWeaponCategoryBases(candidates, weaponCategory);
    let weights = candidates.map(base => getBaseDropWeight(base, zoneTier));
    let totalWeight = weights.reduce((sum, w) => sum + w, 0);
    if (totalWeight <= 0) return rndChoice(candidates);
    let roll = Math.random() * totalWeight;
    for (let i = 0; i < candidates.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}

function getBaseStatRollRange(stat) {
    let minBase = Number.isFinite(stat.baseMin) ? stat.baseMin : ((stat.base || 0) * 0.8);
    let maxBase = Number.isFinite(stat.baseMax) ? stat.baseMax : ((stat.base || 0) * 1.2);
    let scale = (stat.id === 'energyShield') ? 1.5 : 1;
    let scaledMin = minBase * scale;
    let scaledMax = maxBase * scale;
    let usesDecimalRoll = ['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id);
    if (scaledMax > 0) {
        let positiveMinimum = usesDecimalRoll ? 0.1 : 1;
        scaledMin = Math.max(positiveMinimum, scaledMin);
        scaledMax = Math.max(scaledMin, scaledMax);
    }
    return { scaledMin, scaledMax, usesDecimalRoll };
}

function rollBaseStat(stat, percentile = Math.random()) {
    let { scaledMin, scaledMax, usesDecimalRoll } = getBaseStatRollRange(stat);
    let val;
    if (usesDecimalRoll) {
        let minStep = Math.round(scaledMin * 10);
        let maxStep = Math.round(scaledMax * 10);
        val = Math.min(maxStep, minStep + Math.floor(percentile * (maxStep - minStep + 1))) / 10;
        scaledMin = minStep / 10;
        scaledMax = maxStep / 10;
    } else {
        scaledMin = Math.floor(scaledMin);
        scaledMax = Math.floor(scaledMax);
        if (scaledMax > 0) scaledMin = Math.max(1, scaledMin);
        val = Math.min(scaledMax, scaledMin + Math.floor(percentile * (scaledMax - scaledMin + 1)));
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
        ...(stat.legacyDamageBase > 0 ? { baseDamageBalanceVersion: 1 } : {}),
        tier: 0,
        statName: getStatName(stat.id)
    };
}

function rollBaseStats(base) {
    return base.baseStats.map(stat => rollBaseStat(stat));
}


/**
 * The value range of one tier of an affix (or a compound line's sub-stat): tierValues rows as listed, otherwise
 * base + tier × step widened by 1.6 steps, on 0.1 steps for leech/regen lines and whole numbers for the rest.
 * @param {object} mod MOD_DB row or a compound sub-stat
 * @param {string} statId
 * @param {number} tier clamped to the tierValues length
 * @param {boolean} [roundInteger] round instead of floor whole-number ranges (crafting sources that ask for it)
 * @returns {{min: number, max: number, step: number, tier: number}}
 */
function getAffixTierRange(mod, statId, tier, roundInteger = false) {
    if (Array.isArray(mod.tierValues)) return getListedAffixTierRange(mod, tier);
    const min = mod.base + (tier * mod.step);
    const max = min + mod.step * 1.6;
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) {
        return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10, step: 0.1, tier };
    }
    const toInt = roundInteger ? Math.round : Math.floor;
    const high = toInt(max);
    return { min: high > 0 ? Math.max(1, toInt(min)) : toInt(min), max: high, step: 1, tier };
}

function getListedAffixTierRange(mod, tier) {
    const effectiveTier = Math.max(1, Math.min(mod.tierValues.length, Math.floor(Number(tier) || 1)));
    const range = mod.tierValues[effectiveTier - 1];
    let min = Array.isArray(range) ? Number(range[0]) : Number(range);
    let max = Array.isArray(range) ? Number(range[1]) : min;
    if (!Number.isFinite(min)) min = Number(mod.base) || 0;
    if (!Number.isFinite(max)) max = min;
    [min, max] = [Math.min(min, max), Math.max(min, max)];
    return { min, max, step: mod.valueStep || (Number.isInteger(min) && Number.isInteger(max) ? 1 : 0.01), tier: effectiveTier };
}

/** One roll inside a base/step range from getAffixTierRange (0.1 or whole-number steps). */
function rollSteppedAffixValue(range) {
    if (range.step === 0.1) {
        const minStep = Math.round(range.min * 10);
        return (minStep + Math.floor(Math.random() * (Math.round(range.max * 10) - minStep + 1))) / 10;
    }
    return range.min + Math.floor(Math.random() * (range.max - range.min + 1));
}

function rollTierValueAffix(mod, statId, tier) {
    const { min, max, step: valueStep, tier: effectiveTier } = getAffixTierRange(mod, statId, tier);
    const val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / valueStep) + 1)) * valueStep).toFixed(2));
    return { id: statId, val, valMin: min, valMax: max, tier: effectiveTier, statName: mod.statName,
        valueStep, fixedValue: !!mod.fixedValue, sourceModId: mod.id, affixBalanceVersion: mod.affixBalanceVersion };
}

function rerollStoredAffixValue(stat) {
    let min = Number(stat && stat.valMin);
    let max = Number(stat && stat.valMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    if (stat.valueStep) {
        stat.val = Number((min + Math.floor(Math.random() * (Math.round((max - min) / stat.valueStep) + 1)) * stat.valueStep).toFixed(2));
        return;
    }
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
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
        const range = getAffixTierRange(sub, subId, tier, roundInteger);
        return { id: subId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: sub.statName || getStatName(subId) };
    });
}

function rollAffixValue(mod, maxTier, opts) {
    let roundInteger = !!(opts && opts.roundInteger);
    let statId = mod.statId || mod.id;
    let tier = 1;
    maxTier = clampNumber(Math.floor(Number(maxTier) || 1), 1, 20);
    if (Array.isArray(mod.tierValues)) maxTier = Math.min(maxTier, mod.tierValues.length);
    while (tier < maxTier && Math.random() < 0.58) tier++;
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        const range = getAffixTierRange(mod, statId, tier, roundInteger);
        result = { id: statId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
    }
    let extras = rollCompoundExtraStats(mod, result.tier, roundInteger);
    if (extras) result.extraStats = extras;
    return result;
}

function pickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff) {
    minTier = Math.max(1, Math.floor(minTier || 1));
    maxTier = Math.max(minTier, Math.floor(maxTier || minTier));
    let requestedFalloff = Number(tierWeightFalloff);
    let falloff = Number.isFinite(requestedFalloff) ? Math.max(0, requestedFalloff) : 0.85;
    let pool = [];
    for (let tier = minTier; tier <= maxTier; tier++) {
        let dist = tier - minTier;
        let weight = 1 / (1 + dist * falloff);
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

function rollRealmItemDropTier(zone, enemy) {
    const range = getRealmItemDropTierRange(zone, enemy);
    return pickTierInRangeWeighted(range.min, range.max);
}

function rollAffixValueInTierRange(mod, minTier, maxTier, tierWeightFalloff) {
    let statId = mod.statId || mod.id;
    minTier = clampNumber(Math.floor(Number(minTier) || 1), 1, 20);
    maxTier = clampNumber(Math.floor(Number(maxTier) || minTier), minTier, 20);
    if (Array.isArray(mod.tierValues)) {
        maxTier = Math.min(maxTier, mod.tierValues.length);
        minTier = Math.min(minTier, maxTier);
    }
    let tier = pickTierInRangeWeighted(minTier, maxTier, tierWeightFalloff);
    let result;
    if (Array.isArray(mod.tierValues)) {
        result = rollTierValueAffix(mod, statId, tier);
    } else {
        const range = getAffixTierRange(mod, statId, tier);
        result = { id: statId, val: rollSteppedAffixValue(range), valMin: range.min, valMax: range.max, tier: tier, statName: mod.statName, fixedValue: !!mod.fixedValue };
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
function getEncroachmentLiberationTier(item) {
    let sourceFloor = Math.max(1, Math.floor(Number(item && item.encroached && item.encroached.sourceFloor) || 1));
    let sourceTier = typeof getChaosRealmTier === 'function' ? getChaosRealmTier(sourceFloor) : 15;
    let sourceZone = { type: 'chaosRealm', tier: sourceTier, floor: sourceFloor };
    let realmCap = getRealmEquipmentAffixTierCap(sourceZone, getRealmEquipmentHiddenTierCap(sourceZone));
    return Math.max(getItemCraftTier(item), realmCap);
}
function rollEncroachmentLiberationOptions(item) {
    if (!item || !item.encroached || item.encroached.liberated) return [];
    let liberationTier = getEncroachmentLiberationTier(item);
    item.encroached.pendingOptions = Array.isArray(item.encroached.pendingOptions) ? item.encroached.pendingOptions.filter(Boolean).slice(0, 3) : [];
    let pendingMatchesTier = item.encroached.pendingOptions.length > 0
        && item.encroached.pendingOptions.every(option => Math.floor(Number(option && option.tier) || 0) === liberationTier);
    if (pendingMatchesTier) return item.encroached.pendingOptions;
    let existing = getItemOccupiedExplicitModIds(item);
    let pool = getAvailableMods(item).filter(mod => !existing.has(mod.statId || mod.id));
    let picks = pickRandomMods(pool, 3);
    item.encroached.pendingOptions = picks.map(mod => ({ ...rollAffixValueInTierRange(mod, liberationTier, liberationTier), encroachedCandidate: true }));
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
    overlay.innerHTML = `<div style="width:min(520px,calc(95vw / var(--scale-display-factor, 1)));background:#120c1e;border:1px solid #6a47b3;border-radius:14px;padding:18px;box-shadow:0 18px 60px rgba(0,0,0,.6);">`
        + `<div style="color:#caa6ff;font-size:19px;font-weight:700;margin-bottom:4px;">잠식 해방</div>`
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
    const scaledRanges = source.tierValues?.map(range => (Array.isArray(range) ? range : [range, range])
        .map(value => Number((value * DUAL_DEFENSE_AFFIX_RATIO).toFixed(2))));
    const valueStep = scaledRanges?.flat().every(Number.isInteger) ? 1 : 0.01;
    return {
        statId: statId,
        statName: getStatName(statId),
        base: (Number(source && source.base) || 0) * DUAL_DEFENSE_AFFIX_RATIO,
        step: (Number(source && source.step) || 0) * DUAL_DEFENSE_AFFIX_RATIO,
        affixBalanceVersion: source.affixBalanceVersion,
        valueStep,
        tierValues: scaledRanges?.map((range, index) => index === 0 ? range
            : [Number((scaledRanges[index - 1][1] + valueStep).toFixed(2)), range[1]])
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

function getExplicitModStatIds(mod) {
    return [mod.statId || mod.id, ...(mod.compound || []).map(sub => sub.statId || sub.id)];
}

/** 무기 대분류 전용 줄(MOD_DB weaponCategories)은 그 대분류 무기에만 붙는다(data/weapon-categories.js). */
function isModForWeaponCategory(mod, weaponCategory) {
    return !mod.weaponCategories || mod.weaponCategories.includes(weaponCategory);
}

/** 대분류에 어울리지 않는 줄(WEAPON_CATEGORY_OFF_MODS)은 가중치를 낮춘 사본으로 돌려준다. */
function weighModForWeaponCategory(mod, weaponCategory) {
    const off = WEAPON_CATEGORY_OFF_MODS.byCategory[weaponCategory];
    if (!off || !off.includes(mod.id)) return mod;
    return { ...mod, weight: (Number(mod.weight) || 1) * WEAPON_CATEGORY_OFF_MODS.weight };
}

function getAvailableMods(item) {
    let existing = getItemOccupiedExplicitModIds(item);
    let isKaleidoscopeShield = !!(item && item.rarity === 'unique' && item.uniqueEffectKey === 'kaleidoscopeShield');
    let allowedSlots = getAvailableModSlotsForItem(item);
    let summonBaseStatIds = new Set(['summonPctDmg', 'summonFlatDmg', 'summonEfficiency', 'summonHpPct', 'summonCrit', 'summonCritDmg', 'summonAspd', 'summonCap', 'summonResPen', 'summonGemLevel']);
    let summonOnlyModIds = new Set(['summonFlatDmg', 'summonPctDmg', 'summonHpPct', 'summonAspd', 'summonCrit', 'summonCritDmg', 'summonEfficiency', 'summonCap', 'summonResPen', 'summonGemLevel']);
    let hasSummonBaseStat = item && Array.isArray(item.baseStats)
        && item.baseStats.some(stat => stat && summonBaseStatIds.has(stat.id));
    let isSummonBaseWeapon = item && item.slot === '무기' && hasSummonBaseStat;
    let isSummonBaseRing = item && item.slot === '반지' && hasSummonBaseStat;
    let baseDefenseTypes = getItemBaseDefenseTypes(item);
    const weaponCategory = getWeaponCategoryId(item);
    return MOD_DB.filter(mod => isModForWeaponCategory(mod, weaponCategory)).filter(mod => {
        let statId = mod.statId || mod.id;
        if (!isDefenseTypeStatAllowed(item, statId)) return false;
        if (statId === 'deflectChance' && !baseDefenseTypes.has('evasion')) return false;
        if (!isKaleidoscopeShield && item.slot === '방패' && statId === 'spellGemLevel' && !baseDefenseTypes.has('energyShield')) return false;
        if (item.slot === '무기' && summonOnlyModIds.has(statId) && !isSummonBaseWeapon) return false;
        if (item.slot === '반지' && summonOnlyModIds.has(statId) && !isSummonBaseRing) return false;
        if (!isPrimaryDualDefenseAffixMod(item, mod)) return false;
        return allowedSlots.some(slot => mod.slots.includes(slot))
            && !getExplicitModStatIds(makeDualDefenseAffixMod(item, mod)).some(id => existing.has(id));
    }).map(mod => weighModForWeaponCategory(makeDualDefenseAffixMod(item, mod), weaponCategory));
}

/** getAvailableMods 가운데 종류 자리가 남은 줄만(접두 3, 접미 3; data/items.js EXPLICIT_AFFIX_RULES). */
function getOpenAffixMods(item, rarity = item.rarity) {
    const room = equipmentCrafting.affixRoom(item, rarity);
    return getAvailableMods(item).filter(mod => equipmentCrafting.fitsRoom(room, mod));
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
    let minTier = clampNumber(Math.floor(Number(options && options.minTier) || 1), 1, maxTier);
    let requestedFalloff = Number(options && options.tierWeightFalloff);
    let hasTierWeightOverride = Number.isFinite(requestedFalloff);
    let rerollChaosInfusion = !!(options && options.rerollChaosInfusion);
    let previousInfusion = rerollChaosInfusion ? item.chaosInfusion : null;
    if (rerollChaosInfusion) item.chaosInfusion = null;
    let locked = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift));
    item.stats = locked.concat(options.guaranteedStat ? [options.guaranteedStat] : []);
    // 주입을 먼저 다시 굴려 그 종류 자리를 차지하게 한다(접두 3, 접미 3).
    if (rerollChaosInfusion) rerollChaosInfusionForItem(item, previousInfusion);
    let count = 0;
    if (rarity === 'magic') count = Math.random() < 0.5 ? 1 : 2;
    if (rarity === 'rare') count = 4 + Math.floor(Math.random() * 2);
    count = Math.max(0, count - getItemExplicitOptionCount(item));
    let mods = pickRandomMods(getAvailableMods(item), count, equipmentCrafting.affixRoom(item, rarity));
    mods.forEach(mod => item.stats.push(minTier > 1 || hasTierWeightOverride
        ? rollAffixValueInTierRange(mod, minTier, maxTier, requestedFalloff)
        : rollAffixValue(mod, maxTier)));
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
CHAOS_INFUSER_OPTIONS.forEach(option => {
    let merged = Object.entries(CURRENCY_LEGACY_MERGE || {}).find(([, legacyKeys]) => legacyKeys.includes(option.currency));
    if (merged) option.currency = merged[0];
});
function getChaosInfuserOptionsForItem(item) {
    let slot = item && item.slot ? item.slot.replace(/[12]/, '') : '';
    let occupied = getItemOccupiedExplicitModIds(item);
    return CHAOS_INFUSER_OPTIONS.filter(opt => (!opt.slots || opt.slots.includes(slot)) && isDefenseTypeStatAllowed(item, opt.id) && (!occupied.has(opt.id) || (item && item.chaosInfusion && item.chaosInfusion.id === opt.id)))
        .filter(opt => !item || chaosInfusionFitsAffixRoom(item, opt));
}
/** 주입 줄도 접두 3, 접미 3 가운데 제 종류 자리를 쓴다. 이미 있는 주입은 바꿔 끼우므로 빼고 센다. */
function chaosInfusionFitsAffixRoom(item, option) {
    const room = equipmentCrafting.affixRoom(item, 'rare', item.chaosInfusion || null);
    return !room || equipmentCrafting.storedAffixKind(item, { id: option.id }) === 'special'
        || room[equipmentCrafting.storedAffixKind(item, { id: option.id })] > 0;
}
function isChaosInfusionEligibleItem(item) {
    if (!item) return { ok: false, reason: '아이템 미선택' };
    if (item.corrupted) return { ok: false, reason: '타락된 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity === 'unique') return { ok: false, reason: '고유 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity === 'normal' || item.rarity === 'magic') return { ok: false, reason: '일반/마법 등급 아이템에는 혼돈 주입을 할 수 없습니다.' };
    if (item.rarity !== 'rare') return { ok: false, reason: '희귀 장비에만 혼돈 주입을 할 수 있습니다.' };
    let explicitCount = getItemExplicitOptionCount(item);
    if (!item.chaosInfusion && explicitCount >= EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: '추가 옵션 6줄 제한에 걸려 더 주입할 수 없습니다.' };
    if (item.chaosInfusion && explicitCount > EXPLICIT_AFFIX_LINE_CAP) return { ok: false, reason: '추가 옵션이 6줄을 초과했습니다. 기존 주입을 제거하세요.' };
    return { ok: true, reason: '사용 가능' };
}
function rollChaosInfusionOption(option) {
    let min = Number(option && option.min);
    let max = Number(option && option.max);
    if (!Number.isFinite(min)) min = Number(option && option.value) || 0;
    if (!Number.isFinite(max)) max = min;
    if (max < min) { let tmp = min; min = max; max = tmp; }
    let val;
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(option.id)) {
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
    if (item && item.chaosInfusion) costs.push({ key: 'blightSpore', amount: 1 });
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
    if (!isChaosInfuserUnlocked()) return addLog('나무꾼을 한 번 이상 마주친 뒤 혼돈 주입을 사용할 수 있습니다.', 'attack-monster');
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
    let costs = [{ key: 'blightSpore', amount: 1 }];
    if (!canPayCurrencyCosts(costs)) return addLog(`혼돈 주입 제거에는 ${ORB_DB.blightSpore.name} 1개가 필요합니다.`, 'attack-monster');
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
    if (item.fusedRelic) return addLog('융합 유물은 시간에 굳어, 황금률·잿불가지·축복의 꽃잎만 받아들입니다.', 'attack-monster');
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


/** 독벌침을 쓸 수 없는 까닭. 무기에만 쓰고, 새 줄은 추가 옵션 6줄 안에서만 붙는다(이미 붙은 독벌침 줄은 바꿔 끼우므로 자리를 묻지 않는다). */
function getVenomStingerRefusal(item) {
    if (item.slot !== '무기') return '독벌침은 무기에만 사용할 수 있습니다.';
    const replaces = (Array.isArray(item.stats) ? item.stats : []).some(stat => stat && stat.venomStingerBonus);
    return !replaces && getItemExplicitOptionCount(item) >= EXPLICIT_AFFIX_LINE_CAP ? '추가 옵션이 6줄이라 독벌침 줄을 붙일 수 없습니다.' : '';
}
const VENOM_STINGER_STAT_IDS = Object.freeze(['flatDmg', 'aspd', 'crit', 'critDmg', 'resPen', 'physPctDmg', 'elementalPctDmg', 'chaosPctDmg', 'leech',
    'minDmgRoll', 'maxDmgRoll', 'summonFlatDmg', 'summonPctDmg', 'summonAspd', 'summonCrit', 'summonCritDmg']);
/** 독벌침이 굴릴 무기 공격 줄: 없는 능력치이면서, 이미 붙은 독벌침 줄을 뺀 접두 3, 접미 3 자리가 남는 종류. */
function getVenomStingerMods(item) {
    const occupiedIds = getItemOccupiedExplicitModIds(item);
    const room = equipmentCrafting.affixRoom(item, item.rarity, (item.stats || []).find(stat => stat && stat.venomStingerBonus) || null);
    return MOD_DB.filter(mod => mod.slots.includes('무기') && VENOM_STINGER_STAT_IDS.includes(mod.statId || mod.id)
        && !occupiedIds.has(mod.statId || mod.id) && equipmentCrafting.fitsRoom(room, mod));
}

function applyVenomStingerToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (item.fusedRelic) return addLog('융합 유물은 시간에 굳어, 황금률·잿불가지·축복의 꽃잎만 받아들입니다.', 'attack-monster');
    if ((game.currencies.venomStinger || 0) <= 0) return addLog('독벌침이 부족합니다.', 'attack-monster');
    const refusal = getVenomStingerRefusal(item);
    if (refusal) return addLog(refusal, 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let attackMods = getVenomStingerMods(item);
    if (attackMods.length <= 0) return addLog('독벌침이 붙일 수 있는 공격 옵션 자리가 없습니다(접두 3, 접미 3).', 'attack-monster');
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

/** 제작실의 공허의 끌: 선택한 장비에 공허 소켓을 뚫는다(규칙은 equipmentSockets). */
function applyVoidChiselToSelectedItem() {
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    let result = equipmentSockets.chisel(item);
    if (!result.ok) return addLog(result.reason, 'attack-monster');
    addLog(`🕳️ [${item.name}]에 공허 소켓을 뚫었습니다.`, 'loot-rare');
    updateStaticUI();
}

function applyWoodsmanTouchToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 봉인할 장비를 선택하세요.', 'attack-monster');
    if ((game.currencies.ouroboros || 0) < 1) return addLog('우로보로스가 부족합니다.', 'attack-monster');
    if (item.loopSealed) return addLog('이미 봉인된 장비입니다.', 'attack-monster');
    game.currencies.ouroboros--;
    item.loopSealed = true;
    addLog(`🌿 [${item.name}]을(를) 나무꾼의 손길로 봉인했습니다. 루프가 진행되어도 사라지지 않습니다.`, 'loot-unique');
    updateStaticUI();
    queueImportantSave(200);
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

safeExposeGlobals({ applyVoidChiselToSelectedItem, drawJewelRefine, salvageJewel });

function createItemFromBase(base, rarity, zoneTier, origin) {
    itemIdCounter++;
    origin = origin && typeof origin === 'object' ? origin : {};
    const dropRealm = typeof origin.dropRealm === 'string' ? origin.dropRealm : null;
    const affixTierCap = clampNumber(Math.floor(Number(origin.affixTierCap) || Math.min(15, Math.max(1, Number(zoneTier) || 1))), 1, 20);
    const affixTierFloor = clampNumber(Math.floor(Number(origin.affixTierFloor) || 1), 1, affixTierCap);
    let item = {
        id: itemIdCounter,
        slot: base.slot,
        baseId: base.id,
        baseName: base.name,
        name: base.name,
        rarity: rarity,
        itemTier: zoneTier,
        hiddenTier: Math.max(1, Math.floor(Number(zoneTier) || 1)),
        affixTierCap: affixTierCap,
        itemLevel: levelProgression.tierLevel(zoneTier), requirementsVersion: 1,
        dropRealm: dropRealm,
        baseStats: rollBaseStats(base, zoneTier),
        stats: []
    };
    if (rarity === 'magic' || rarity === 'rare') rerollExplicitMods(item, rarity, affixTierCap, {
        minTier: affixTierFloor,
        tierWeightFalloff: origin.tierWeightFalloff
    });
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

/** room({prefix, suffix} 남은 자리, null이면 제한 없음): 고를 때마다 자리가 남은 종류에서만 고른다. */
function pickRandomMods(mods, count, room = null) {
    let pool = Array.isArray(mods) ? mods.slice() : [];
    const left = room && { ...room };
    let picks = [];
    let wanted = Math.max(0, Math.floor(count || 0));
    while (picks.length < wanted) {
        if (left) pool = pool.filter(mod => equipmentCrafting.fitsRoom(left, mod));
        let picked = pickWeightedMod(pool);
        if (!picked) break;
        picks.push(picked);
        if (left && equipmentCrafting.affixKind(picked) !== 'special') left[equipmentCrafting.affixKind(picked)]--;
        const occupied = new Set(getExplicitModStatIds(picked));
        pool = pool.filter(mod => !getExplicitModStatIds(mod).some(id => occupied.has(id)));
    }
    return picks;
}

function rollUniqueStatValue(stat) {
    let min = stat.min !== undefined ? stat.min : stat.base;
    let max = stat.max !== undefined ? stat.max : stat.base;
    if (max < min) max = min;
    let val;
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
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


function generateUniqueItem(zoneTier, preferredSlot, forcedUniqueName, zone = getZone(game.currentZoneId) || {}) {
    let canDropUniqueInZone = (unique) => {
        if (!unique) return false;
        if (!unique.dropOnly) return true;
        let dropOnly = unique.dropOnly;
        if (dropOnly.type && zone.type !== dropOnly.type) return false;
        if (dropOnly.id && zone.id !== dropOnly.id) return false;
        if (dropOnly.minFloor && Math.floor(zone.floor || 0) < dropOnly.minFloor) return false;
        return true;
    };
    let meetsUniqueTier = unique => !!unique && zoneTier >= ((unique.dropOnly && unique.dropOnly.minTier) || unique.reqTier || 1);
    let forcedUnique = forcedUniqueName ? UNIQUE_DB.find(unique => unique && unique.name === forcedUniqueName) : null;
    let slot = (forcedUnique && forcedUnique.slots && forcedUnique.slots[0]) || preferredSlot || rndChoice(EQUIPMENT_DROP_SLOTS);
    let normalOptions = UNIQUE_DB.filter(unique => !unique.ultraRare && canDropUniqueInZone(unique));
    let chaseOptions = UNIQUE_DB.filter(unique => unique.ultraRare
        && canDropUniqueInZone(unique)
        && meetsUniqueTier(unique));
    let canRollChase = !forcedUnique && chaseOptions.length > 0 && Math.random() < 0.0016;
    let poolSource = canRollChase ? chaseOptions : normalOptions;
    let options = poolSource.filter(unique => unique.slots.includes(slot) && meetsUniqueTier(unique));
    if (options.length === 0) options = poolSource.filter(meetsUniqueTier);
    if (options.length === 0) options = poolSource.length > 0 ? poolSource : UNIQUE_DB.filter(unique => canDropUniqueInZone(unique));
    if (options.length === 0) options = UNIQUE_DB.filter(unique => canDropUniqueInZone(unique));
    let unique = forcedUnique || rndChoice(options);
    let uniqueTier = unique.reqTier || zoneTier;
    let base = BASE_ITEM_DB.find(row => row.id === UNIQUE_EQUIPMENT_RULES[unique.name].baseId);
    itemIdCounter++;
    let item = {
        id: itemIdCounter,
        slot: unique.slots[0],
        baseId: base.id,
        baseName: base.name,
        name: unique.name,
        rarity: 'unique',
        uniqueEquipmentVersion: 1,
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
        let val = ['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.val * boost * 10) / 10 : Math.floor(rolled.val * boost);
        let min = ['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.min * boost * 10) / 10 : Math.floor(rolled.min * boost);
        let max = ['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id) ? Math.round(rolled.max * boost * 10) / 10 : Math.floor(rolled.max * boost);
        item.stats.push({ id: stat.id, val: val, valMin: min, valMax: max, tier: 0, statName: getStatName(stat.id) });
    });
    if (unique.ultraRare && canRollChase) {
        game.seasonChaseUniqueDrops = Array.isArray(game.seasonChaseUniqueDrops) ? game.seasonChaseUniqueDrops : [];
        if (!game.seasonChaseUniqueDrops.includes(unique.name)) game.seasonChaseUniqueDrops.push(unique.name);
        game.seasonChaseUniqueDropped = game.seasonChaseUniqueDrops.length > 0;
        addLog(`🌠 체이싱 유니크 발견! [${unique.name}]`, 'loot-unique');
    }
    maybeApplyExceptionalBase(item);
    return levelProgression.stampItem(item);
}

function maybeApplyDroppedFossilExclusiveAffix(item, enemy, zoneTier) {
    if (!contentProgression.isUnlocked('fossilRestore') || !item || item.rarity === 'unique') return item;
    let chance = enemy && enemy.isBoss ? 0.12 : (enemy && enemy.isElite ? 0.06 : 0.018);
    if (Math.random() >= chance) return item;
    let pool = typeof getFossilExclusivePool === 'function'
        ? getFossilExclusivePool(item)
        : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return item;
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= EXPLICIT_AFFIX_LINE_CAP) item.stats.pop();
    let tierRange = getDroppedAffixTierRange(zoneTier);
    let roll = rollAffixValueInTierRange(
        pickWeightedMod(pool), tierRange.min, tierRange.max, DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    );
    roll.fossilExclusiveDrop = true;
    item.stats.push(roll);
    if (item.rarity === 'normal') item.rarity = 'magic';
    updateItemName(item);
    return item;
}

/** 정해 준 칸, 아니면 아무 칸. 뿌리촉수의 제 무기는 따로 굴린다(js/combat.js grantRootWeaponPick, data/bosses.js). */
function getEquipmentDropSlot(options) {
    return EQUIPMENT_DROP_SLOTS.includes(options?.slot) ? options.slot : rndChoice(EQUIPMENT_DROP_SLOTS);
}

function generateEquipmentDrop(enemy, options) {
    let zone = options && options.zone ? options.zone : (getZone(game.currentZoneId) || {});
    const itemLevel = levelProgression.itemLevel(zone, enemy);
    let hiddenTierCap = Math.min(getRealmEquipmentHiddenTierCap(zone), levelProgression.maxDropTier(itemLevel));
    let dropTier = Math.min(rollRealmItemDropTier(zone, enemy), levelProgression.maxDropTier(itemLevel));
    let affixTierCap = Math.min(levelProgression.affixCap(itemLevel), getRealmEquipmentAffixTierCap(zone, dropTier));
    let affixTierRange = getDroppedAffixTierRange(affixTierCap);
    let slot = getEquipmentDropSlot(options);
    let base = chooseItemBase(slot, dropTier, zone, getRootMonsterWeapon(enemy));
    let rarity = getEquipmentDropRarity(enemy, Math.random());
    if (rarity === 'unique') return levelProgression.stampItem(generateUniqueItem(hiddenTierCap, slot, null, zone), itemLevel);
    let minimumRarity = options && ['normal', 'magic', 'rare'].includes(options.minimumRarity) ? options.minimumRarity : null;
    if (minimumRarity && getRarityRank(rarity) < getRarityRank(minimumRarity)) rarity = minimumRarity;
    let item = createItemFromBase(base, rarity, dropTier, {
        dropRealm: zone.type || null,
        affixTierCap,
        affixTierFloor: affixTierRange.min,
        tierWeightFalloff: DROPPED_AFFIX_TIER_WEIGHT_FALLOFF
    });
    maybeApplyExceptionalBase(item);
    equipmentSockets.rollDropSocket(item);
    item = maybeApplyDroppedFossilExclusiveAffix(item, enemy, dropTier);
    return levelProgression.stampItem(maybeApplyChaosRealmEncroachment(item, enemy, zone), itemLevel);
}

/** A base stat value scaled by factor, kept on its own grid: 0.1 steps for leech/regen lines, whole numbers (at least 1) otherwise. */
function boostItemStatValue(statId, value, factor) {
    if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(statId)) return Math.round(value * factor * 10) / 10;
    return Math.max(1, Math.floor(value * factor));
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
        stat.val = boostItemStatValue(stat.id, max, 1.2);
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

/** @param {string} currencyKey @param {number} amount @param {'reward'|'drop'} source */
/** The currency and whole amount an award would commit; refused when a drop of a still-locked currency is dropped. */
function resolveCurrencyAward(currencyKey, amount, source = 'reward') {
    const key = getCanonicalCurrencyKey(currencyKey);
    if (source === 'drop' && !contentProgression.canDropCurrency(key)) return { key, gain: 0, refused: true };
    let gain = Number(amount || 0);
    if (gain > 0) gain = Math.max(1, Math.floor(gain));
    return { key, gain, refused: false };
}

function awardCurrency(currencyKey, amount, source = 'reward') {
    const award = resolveCurrencyAward(currencyKey, amount, source);
    if (award.refused) return 0;
    commitCurrencyGain(award.key, award.gain);
    return award.gain;
}

/** Commit an already resolved amount without applying expert multipliers again. */
function commitCurrencyGain(currencyKey, gain) {
    if (currencyKey === 'condensedSkyPower') {
        let st = ensureSkyTowerState();
        st.condensedPower = Math.max(0, Math.floor(st.condensedPower || 0)) + gain;
        combatLootReceipts.currency(game,currencyKey,gain);
        game.currencyDropVersion = Math.max(0, Math.floor(game.currencyDropVersion || 0)) + 1;
        return;
    }
    game.currencies[currencyKey] = (game.currencies[currencyKey] || 0) + gain;
    combatLootReceipts.currency(game,currencyKey,gain);
    game.currencyDropVersion = Math.max(0, Math.floor(game.currencyDropVersion || 0)) + 1;
    notifyCurrencyAcquisition(currencyKey, gain);
}

function notifyCurrencyAcquisition(currencyKey, gain) {
    if ((currencyKey === 'chaosKey' || currencyKey === 'coreKey') && gain > 0) {
        // 둘 중 하나라도 습득하면 지도 알람을 띄운다(5차 미궁 시련/재능 개화 도전 알림).
        if (game.noti) game.noti.map = true;
    }
    if (currencyKey === 'ouroboros' && gain > 0) {
        game.woodsmanTouchSeen = true;
    }
    const unlocked=unlockLegacyCurrencyFeatures(currencyKey);
    dispatchRuntimeEvent('currency-acquired',{currencyKey,gain,unlocked});
}

function unlockLegacyCurrencyFeatures(currencyKey) {
    const unlocked={gem:false};
    if (!game.contentProgression && !game.gemEnhanceUnlocked && (currencyKey === 'bossCore' || currencyKey === 'skyEssence')) {
        game.gemEnhanceUnlocked = true;
        game.noti.skills = true;
        unlocked.gem=true;
    }
    return unlocked;
}

// Explicit returns from crafting stay in inventory; ordinary drops keep the auto-equip setting.
function getAcquiredItemAutoEquipSlot(item, options, offlineStashEnabled) {
    if (offlineStashEnabled || options?.skipAutoEquip) return null;
    return typeof tryAutoEquipEmptySlot === 'function' ? tryAutoEquipEmptySlot(item) : null;
}

/** guaranteedKeep: 유실되면 안 되는 반환/정산 아이템(시간의 균열 융합·제단 회수 등)과 목표·보호 장비.
 * 습득 필터·자동해체를 우회하고, 가득 찬 인벤토리에서도 해체 대신 초과 보관한다. */
function isGuaranteedEquipmentPickup(item, options) {
    return !!(options && options.guaranteedKeep) || uniqueHuntRuntime.isTargetItem(item) || equipmentLootPolicy.matches(item);
}

/** What picking `item` up would do before space is considered: 'kept', 'filtered' (pickup filter) or 'salvaged' (auto-salvage).
 * An exploration drop that would be kept waits on the floor (js/exploration-ground-loot.js); the others resolve at once. */
function previewEquipmentPickup(item, options) {
    normalizeItem(item);
    if (isGuaranteedEquipmentPickup(item, options)) return 'kept';
    if (!passesItemPickupFilter(item)) return 'filtered';
    return game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities?.[item.rarity] ? 'salvaged' : 'kept';
}

function addItemToInventory(item, options) {
    normalizeItem(item);
    const logLoot = game.settings.showLootLog;
    let guaranteedKeep = isGuaranteedEquipmentPickup(item, options);
    let ignoreFilter = guaranteedKeep || !!(options && options.ignoreFilter);
    let ignoreAutoSalvage = guaranteedKeep || !!(options && options.ignoreAutoSalvage);
    let offlineStashEnabled = game.isBackgroundCalculation && typeof routeOfflineItem === 'function' && game.offlineProgress && game.offlineProgress.stashLevel > 0;
    let autoEquipSlot = getAcquiredItemAutoEquipSlot(item, options, offlineStashEnabled);
    if (autoEquipSlot) {
        recordEquipmentAcquisition(item);
        if (logLoot) addLog(`🛡️ 빈 ${autoEquipSlot} 슬롯에 자동 장착: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'loot-rare', { item });
        checkUnlocks();
        return true;
    }
    if (!ignoreFilter && !passesItemPickupFilter(item)) {
        if (logLoot) addLog(`🚫 아이템 필터로 미습득: <span class='loot-${item.rarity}'>[${item.name}]</span>`, 'attack-monster');
        return false;
    }
    if (offlineStashEnabled) {
        let route = routeOfflineItem(item, game, { protected: (typeof isChaseUniqueItem === 'function' && isChaseUniqueItem(item)) || item.locked || guaranteedKeep });
        if (route.action === 'salvage') {
            salvageItemObject(item, true, { noDivine: true });
            game.backgroundOverflowSalvageCount = Math.max(0, Math.floor(Number(game.backgroundOverflowSalvageCount) || 0)) + 1;
            return false;
        }
        if (route.action === 'stored') {
            if (route.replacedItem) salvageItemObject(route.replacedItem, true, { noDivine: true });
            recordEquipmentAcquisition(item);
            checkUnlocks();
            return true;
        }
        if (route.action === 'normal' && route.protected) {
            ignoreAutoSalvage = true;
            guaranteedKeep = true;
            if (!canStoreEquipmentItems([item], game)) game.backgroundStopReason = 'protected-storage-full';
        }
    }
    const result = storeEquipmentPickup(item, { guaranteedKeep, ignoreAutoSalvage });
    if (result.accepted) { recordEquipmentAcquisition(item); checkUnlocks(); }
    if (result.kind === 'protected') addLog(`🎒 인벤토리가 가득 찼지만 [${item.name}]은(는) 유실 방지를 위해 초과 보관됩니다.`, 'attack-monster');
    else if (logLoot && result.rewards && result.log) {
        const label = result.kind === 'overflow' ? '공간 부족 자동해체' : '자동해체';
        addLog(`${label}: <span class='loot-${item.rarity}'>[${item.name}]</span> · ${formatSalvageRewardSummary(result.rewards)}`, 'loot-normal');
    }
    return result.accepted;
}

/** Resolve capacity and auto-salvage at pickup time. */
function storeEquipmentPickup(item, { guaranteedKeep, ignoreAutoSalvage }) {
    const fits = canStoreEquipmentItems([item], game);
    if (!fits && !guaranteedKeep) return salvageEquipmentPickup(item, true);
    if (!ignoreAutoSalvage && game.settings.autoSalvageEnabled && game.settings.autoSalvageRarities?.[item.rarity])
        return salvageEquipmentPickup(item, false);
    game.inventory.push(item);
    return { accepted: true, kind: fits ? 'stored' : 'protected' };
}

function salvageEquipmentPickup(item, overflow) {
    const rewards = salvageItemObject(item, true, { noDivine: overflow });
    if (overflow && game.isBackgroundCalculation)
        game.backgroundOverflowSalvageCount = Math.max(0, Math.floor(Number(game.backgroundOverflowSalvageCount) || 0)) + 1;
    return { accepted: false, kind: overflow ? 'overflow' : 'salvaged', rewards, log: !overflow || !game.isBackgroundCalculation };
}

function recordEquipmentAcquisition(item) {
    game.noti.items=true;
    combatLootReceipts.item(game,item);
    return recordUniqueAcquisition(item);
}

function recordUniqueAcquisition(item) {
    if (item.rarity !== 'unique') return false;
    registerUniqueToCodexOnAcquire(item);
    if (typeof uniqueHuntRuntime === 'undefined') return true;
    let target = uniqueHuntRuntime.complete(item);
    if (!target) return true;
    addLog(`🎯 파밍 목표 획득: <span class='loot-unique'>[${item.name}]</span>`, 'loot-unique', { item, toast: true });
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
    { id:'uj_mirror_heart', name:'거울 심장', ultra:true, uniqueEffect:'반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼 복제', stats:[{id:'pctDmg',val:8},{id:'resAll',val:8}] },
    { id:'uj_old_box', name:'오래된 보석함', ultra:true, uniqueEffect:'인벤토리 등급 시너지', stats:[{id:'aspd',val:6},{id:'resAll',val:10}] },
    { id:'uj_hurried_mind', name:'다급해지는 마음', ultra:true, uniqueEffect:'적이 없으면 이동속도 +50%', stats:[{id:'move',val:12},{id:'regen',val:1.2}] },
    { id:'uj_condensed_curse', name:'응축된 저주', ultra:true, uniqueEffect:'저주 최대치 +1, 대상 저주당 최종 피해 +10%', stats:[{id:'dotPctDmg',val:14},{id:'resPen',val:6}] },
    { id:'uj_burning_will', name:'불같은 의지', ultra:true, uniqueEffect:'화염 최대저항/저항 연계 보너스', stats:[{id:'maxResF',val:2},{id:'firePctDmg',val:12}] },
    { id:'uj_closed_eyes', name:'질끈 감은 눈', ultra:true, uniqueEffect:'플레이어 상태이상 면역, 부적의 수호 · 함성 · 저주 줄 비활성', stats:[{id:'dr',val:6},{id:'resAll',val:12}] },
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
    { id:'uj_dawn_chip', name:'새벽 조각', stats:[{id:'pctDmg',val:12},{id:'takenDamageReduceWhen1EnemyPct',val:4}] },
    // 2026-10-02 재능 정리: 얻을 수 없게 된 옛 재능 카드의 효과(bloomMechanic, js/talent-cards.js getGrantedBloomMechanics).
    // 일반 고유 풀에 둔다(울트라 풀이면 고유 주얼 하나당 약 0.4%로 너무 드물다).
    { id:'uj_judgment_mark', name:'심판의 표식', bloomMechanic:'hero1__inquisitor', uniqueEffect:'공격하면 5초 동안 피해를 모으는 표식을 남기고, 5초 뒤 모은 피해의 12%로 터짐(재사용 6초)', stats:[{id:'pctDmg',val:8},{id:'crit',val:1}] },
    { id:'uj_hex_burst', name:'터지는 저주', bloomMechanic:'hero1__warlock', uniqueEffect:'저주에 걸린 적을 공격하면 그 저주를 터뜨려 적 모두에게 0.2배 피해', stats:[{id:'chaosPctDmg',val:10},{id:'dotPctDmg',val:10}] },
    { id:'uj_stinger', name:'독침의 끝', bloomMechanic:'hero1__catalyst', uniqueEffect:'남은 지속 피해가 적의 남은 생명력보다 많으면 그 적을 바로 마무리', stats:[{id:'dotPctDmg',val:14},{id:'poisonChance',val:8}] },
    { id:'uj_crowd_roar', name:'관중의 함성', bloomMechanic:'hero2__gladiator', uniqueEffect:'처치마다 관중의 함성 1중첩, 5중첩이면 다음 공격이 주변 적 다섯에게 120% 피해(적이 하나면 피해 20% 증폭)', stats:[{id:'meleePctDmg',val:12},{id:'aspd',val:5}] },
    { id:'uj_moon_shadow', name:'달그림자', bloomMechanic:'hero3__assassin', uniqueEffect:'치명타 피해의 20%가 모든 피해 감소를 무시하는 고정 피해로 바뀜', stats:[{id:'critDmg',val:15},{id:'crit',val:1}] },
    { id:'uj_forest_ring', name:'숲마당', bloomMechanic:'hero3__gladiator', uniqueEffect:'플레이어와 몬스터의 모든 공격이 반드시 명중함', stats:[{id:'flatHp',val:40},{id:'aspd',val:4}] },
    { id:'uj_defiant_bolt', name:'거역의 번개', bloomMechanic:'hero5__assassin', uniqueEffect:'번개 피해가 카오스 피해로 바뀌고, 카오스 피해를 준 적의 생명력 재생 50% 감소', stats:[{id:'chaosPctDmg',val:12},{id:'lightPctDmg',val:8}] },
    { id:'uj_pilgrim_spark', name:'순례자의 번개', bloomMechanic:'hero5__ranger', uniqueEffect:'물리 피해의 50%가 번개 피해로 바뀜', stats:[{id:'lightPctDmg',val:12},{id:'physPctDmg',val:8}] },
    { id:'uj_endless_night', name:'끝없는 밤', bloomMechanic:'hero5__warlock', uniqueEffect:'적에게 거는 저주가 끝나지 않음', stats:[{id:'dotPctDmg',val:10},{id:'resPen',val:4}] },
    { id:'uj_marksman_eye', name:'명사수의 눈', bloomMechanic:'hero6__ranger', uniqueEffect:'치명타 확률을 두 번 굴려 좋은 쪽을 쓰고, 치명타 확률이 100%를 넘으면 넘는 몫의 50%가 치명타 피해로 바뀜', stats:[{id:'crit',val:1.5},{id:'critDmg',val:12}] },
    { id:'uj_three_way', name:'삼갈래 화살', bloomMechanic:'hero6__gladiator', uniqueEffect:'투사체가 세 갈래로 나뉘어 날아감, 투사체 추가 발사 +1, 투사체 연속 타격 확률 +50%', stats:[{id:'projectilePctDmg',val:12},{id:'aspd',val:4}] },
    { id:'uj_elemental_oath', name:'원소 성전', bloomMechanic:'hero9__crusader', uniqueEffect:'생명력이 1로 고정되는 대신 받는 카오스 피해 50% 감소', stats:[{id:'energyShieldPct',val:20},{id:'resAll',val:10}] },
    { id:'uj_root_bond', name:'뿌리 결속', bloomMechanic:'hero3__soulbinder', uniqueEffect:'소환수의 공격 속도가 플레이어의 공격 속도와 같아지는 대신 플레이어는 공격하지 않음', stats:[{id:'summonPctDmg',val:15},{id:'summonHpPct',val:10}] },
    { id:'uj_blue_judgment', name:'푸른 심판', bloomMechanic:'hero3__inquisitor', uniqueEffect:'원소 공격의 15%가 적의 원소 저항을 반대로 셈', stats:[{id:'elementalPctDmg',val:12},{id:'resPen',val:3}] }
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

function rollRandomJewelStat(excludeIds, tierRange) {
    let pool = getJewelRollOptionPool(excludeIds);
    return rollJewelStat(resolveJewelRollOption(rndChoice(pool), excludeIds), tierRange);
}

function rollJewelCraftStats(count, keepStats, tierRange) {
    let stats = (keepStats || []).map(cloneJewelStat).filter(Boolean);
    let usedIds = stats.map(stat => stat.id);
    while (stats.length < count) {
        let stat = rollRandomJewelStat(usedIds, tierRange);
        if (!stat) break;
        stats.push(stat);
        usedIds.push(stat.id);
    }
    return stats;
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

function rollJewelStat(option, tierRange) {
    if (!option) return null;
    let requestedMinTier = tierRange ? Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.min) || 1))) : 1;
    let requestedMaxTier = tierRange ? Math.max(requestedMinTier, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.floor(Number(tierRange.max) || requestedMinTier))) : JEWEL_HIDDEN_TIER_COUNT;
    let ailResIds = new Set(['ailResIgnite','ailResShock','ailResFreeze','ailResPoison','ailResBleed']);
    if (ailResIds.has(option.id)) {
        let tier = tierRange
            ? pickTierInRangeWeighted(requestedMinTier, requestedMaxTier)
            : 1 + Math.floor(Math.random() * JEWEL_HIDDEN_TIER_COUNT);
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
    let selectedTier = slots > 0 && tierRange ? pickTierInRangeWeighted(requestedMinTier, requestedMaxTier) : 1;
    let slotStart = tierRange ? Math.ceil(((selectedTier - 1) * (slots + 1)) / JEWEL_HIDDEN_TIER_COUNT) : 0;
    let slotEnd = tierRange ? Math.max(slotStart + 1, Math.ceil((selectedTier * (slots + 1)) / JEWEL_HIDDEN_TIER_COUNT)) : slots + 1;
    let slotIndex = slotStart + Math.floor(Math.random() * Math.max(1, slotEnd - slotStart));
    let val = option.min + Math.min(slots, slotIndex) * step;
    val = (step < 1 || !Number.isInteger(Number(val))) ? Number(val.toFixed(2)) : Math.floor(val);
    let rolled = { id: option.id, val: val, valMin: option.min, valMax: option.max };
    if (tierRange && slots > 0) rolled.tier = selectedTier;
    return normalizeJewelStat(rolled);
}

function getJewelDropTierRange(zoneTier) {
    let boundedZoneTier = Math.max(1, Math.min(20, Math.floor(Number(zoneTier) || 1)));
    let maxTier = Math.max(1, Math.min(JEWEL_HIDDEN_TIER_COUNT, Math.ceil(boundedZoneTier / 4)));
    return { min: Math.max(1, maxTier - 1), max: maxTier };
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

/**
 * @param {number|{type?: string, storyOrder?: number, id?: number, depth?: number, equivalentChaosDepth?: number, tier?: number}} zoneOrTier
 * @returns {{id: number, name: string, rarity: string, hiddenTier: number, stats: Array<{id: string, val: number, valMin: number, valMax: number, tier: number}>}}
 */
function generateJewelDrop(zoneOrTier) {
    let tier = zoneOrTier && typeof zoneOrTier === 'object'
        ? getRealmEquipmentHiddenTierCap(zoneOrTier)
        : Math.max(1, Number(zoneOrTier) || 1);
    let dropTierRange = getJewelDropTierRange(tier);
    let uniqueChance = Math.max(0.003, Math.min(0.03, 0.002 + (tier / 2000)));
    if (Math.random() < uniqueChance) {
        let pool = UNIQUE_JEWEL_DB.filter(v => !v.ultra);
        let ultraPool = UNIQUE_JEWEL_DB.filter(v => v.ultra);
        let canRollUltra = ultraPool.length > 0;
        let baseRow = pool.length > 0 ? rndChoice(pool) : rndChoice(UNIQUE_JEWEL_DB);
        let row = (canRollUltra && Math.random() < 0.08) ? rndChoice(ultraPool) : baseRow;
        // 고유 주얼: 구성은 그대로 두고 파워만 약간(+10%) 상승
        let uniquePower = 1.1;
        let decimalIds = new Set(['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap']);
        let stats = (row.stats || []).map(st => {
            let boosted = decimalIds.has(st.id) ? Math.round(st.val * uniquePower * 10) / 10 : Math.round(st.val * uniquePower);
            return makeFixedJewelStat(st.id, boosted);
        });
        let petite = rollJewelPetiteStat('rare', stats.map(st => st.id));
        if (petite) stats.push(petite);
        return { id: ++itemIdCounter, uniqueId: row.id, name: row.name, rarity: 'unique', uniqueEffect: row.uniqueEffect || '', hiddenTier: Math.max(1, ...stats.map(st => st.tier || 1)), stats: stats };
    }
    // 주얼 제작이 없어졌으므로(2026-09-30) 옵션 없는 일반 주얼은 떨어지지 않는다: 마법 1~2줄 85%, 희귀 2~4줄 15%.
    let rarity = Math.random() > 0.85 ? 'rare' : 'magic';
    let lineCount = rarity === 'rare' ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
    let stats = rollJewelCraftStats(lineCount, null, dropTierRange);
    let hiddenTier = stats.length ? Math.max(1, ...stats.map(st => st.tier || 1)) : 1;
    let name = stats.length ? `${getStatName(stats[0].id)} 주얼` : '미가공 주얼';
    return { id: ++itemIdCounter, name: name, tier: 1, hiddenTier: hiddenTier, rarity: rarity, stats: stats };
}

/** Jewels enter the collection immediately; ordinary overflow is salvaged. */
function receiveJewelDrop(jewel) {
    const inventoryFull=game.jewelInventory.length>=getJewelInventoryLimit();
    const protectOverflow=inventoryFull&&['rare','unique'].includes(jewel.rarity);
    const result={jewel,inventoryFull,protectOverflow,stored:false,shardGain:0};
    if(inventoryFull&&!protectOverflow) {
        result.shardGain=salvageJewelObject(jewel,true);
        return result;
    }
    game.jewelInventory.push(jewel);game.noti.items=true;result.stored=true;
    return result;
}

function getJewelStats(jewel) {
    if (!jewel) return [];
    if (Array.isArray(jewel.stats) && jewel.stats.length > 0) return jewel.stats.map(cloneJewelStat).filter(Boolean);
    if (jewel.stat && jewel.stat.id) return [cloneJewelStat(jewel.stat)].filter(Boolean);
    return [];
}

function getJewelRarityLabel(rarity) {
    if (rarity === 'unique') return '고유';
    if (rarity === 'rare') return ITEM_RARITY_LABELS.rare;
    if (rarity === 'magic') return ITEM_RARITY_LABELS.magic;
    return '일반';
}

function getJewelRarityClass(rarity) {
    if (rarity === 'unique') return 'unique';
    if (rarity === 'rare') return 'rare';
    if (rarity === 'magic') return 'magic';
    return 'normal';
}

function getJewelSalvageShardGain(jewel) {
    if (!jewel) return 0;
    let rarity = jewel.rarity || 'normal';
    return rarity === 'unique' ? 18 : (rarity === 'rare' ? 9 : (rarity === 'magic' ? 5 : 2));
}

function salvageJewelObject(jewel, silent) {
    let shardGain = getJewelSalvageShardGain(jewel);
    if (shardGain <= 0) return 0;
    awardCurrency('jewelShard', shardGain, 'reward');
    if (!silent) addLog(`💠 [${jewel.name}] 주얼 해체 (+주얼 결정 ${shardGain})`, 'loot-normal');
    return shardGain;
}

/** @returns {number} socketed jewels returned to the jewel store before the item went away */
function destroySelectedCraftItem(item) {
    if (typeof getCraftSelectionRef !== 'function' || typeof isCraftSelectionEquip !== 'function') return 0;
    const jewels = equipmentSockets.returnJewels(item);
    let ref = getCraftSelectionRef();
    if (isCraftSelectionEquip()) game.equipment[ref] = null;
    else game.inventory = (game.inventory || []).filter(entry => entry !== item);
    if (typeof clearCraftSelection === 'function') clearCraftSelection();
    return jewels;
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
    addLog(`🎰 주얼 가공: ${getJewelRarityLabel(jewel.rarity)} [${jewel.name}] 획득! (${lineText})`, jewel.rarity === 'unique' ? 'loot-unique' : 'loot-rare', { item:jewel, itemKind:'jewel' });
    updateStaticUI();
}


/** 주얼 보관함에서 한 개를 해체한다(고유는 확인을 거친다). 확인 사이에 보관함이 바뀌었으면 취소한다. */
async function salvageJewel(jewelId) {
    let jewel = (game.jewelInventory || []).find(row => row && row.id === jewelId);
    if (!jewel) return false;
    if (jewel.rarity === 'unique' && !await requestGameConfirmation(`[${jewel.name || '고유 주얼'}]을 해체합니다.\n주얼 결정 ${getJewelSalvageShardGain(jewel)}개를 획득하며 되돌릴 수 없습니다.`, {
        title: '고유 주얼 해체',
        tone: 'danger',
        confirmLabel: '해체'
    })) return false;
    let index = (game.jewelInventory || []).indexOf(jewel);
    if (index < 0) return false;
    salvageJewelObject(jewel, false);
    game.jewelInventory.splice(index, 1);
    updateStaticUI();
    return true;
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

function getItemSalvageRewardProfile(item, options) {
    let noDivine = !!(options && options.noDivine);
    let rarity = item && item.rarity || 'normal';
    let guaranteed = {};
    let chances = [];
    if (rarity === 'normal') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'magic') {
        guaranteed.magicBud = 1;
    } else if (rarity === 'rare') {
        guaranteed.formlessDew = 1;
        let tier = Math.max(1, getItemCraftTier(item));
        let explicitCount = Math.max(0, getItemExplicitOptionCount(item));
        chances.push({ key: 'formlessDew', amount: 1, chance: Math.min(0.35, 0.04 + tier * 0.01 + explicitCount * 0.02) });
    } else if (rarity === 'unique') {
        guaranteed.formlessDew = 2;
        chances.push({ key: 'sapBud', amount: 1, chance: 0.55 });
        if (!noDivine) chances.push({ key: 'goldenRule', amount: 1, chance: getUniqueDismantleDivineChance(item) });
    }
    return { guaranteed, chances };
}

function addSalvageRewardAmount(rewards, key, amount) {
    let gain = Math.max(0, Math.floor(Number(amount) || 0));
    if (!key || gain <= 0) return rewards;
    let currencyKey = getCanonicalCurrencyKey(key);
    rewards[currencyKey] = Math.max(0, Math.floor(Number(rewards[currencyKey]) || 0)) + gain;
    return rewards;
}

function mergeSalvageRewards(target, source) {
    let result = target && typeof target === 'object' ? target : {};
    Object.entries(source || {}).forEach(([key, amount]) => addSalvageRewardAmount(result, key, amount));
    return result;
}

function formatSalvageRewardSummary(rewards) {
    let normalized = mergeSalvageRewards({}, rewards);
    let entries = Object.entries(normalized).filter(([, amount]) => Number(amount) > 0);
    if (entries.length <= 0) return '회수 재화 없음';
    return entries.map(([key, amount]) => `${(ORB_DB[key] && ORB_DB[key].name) || key} +${Math.floor(amount)}`).join(' · ');
}

function getItemSalvagePreviewText(item, compact) {
    let profile = getItemSalvageRewardProfile(item);
    let guaranteed = Object.entries(profile.guaranteed)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => {
            let label = (ORB_DB[key] && ORB_DB[key].name) || key;
            if (compact) label = label.replace('의 오브', '');
            return `${label} ${amount}`;
        });
    let chances = profile.chances
        .filter(row => row && row.chance > 0)
        .map(row => compact && item && item.rarity === 'unique'
            ? null
            : `${(ORB_DB[row.key] && ORB_DB[row.key].name) || row.key} ${Math.round(row.chance * 100)}%`)
        .filter(Boolean);
    if (compact && item && item.rarity === 'unique' && profile.chances.length > 0) chances.push('고급 재화 확률');
    return `해체 ${guaranteed.concat(chances).join(' · ') || '보상 없음'}`;
}

function rollItemSalvageRewards(item, options) {
    let replayRewards = typeof salvageRecoveryRuntime !== 'undefined'
        ? salvageRecoveryRuntime.getReplayRewards(item)
        : null;
    if (replayRewards) return replayRewards;
    let profile = getItemSalvageRewardProfile(item, options);
    let rewards = {};
    mergeSalvageRewards(rewards, profile.guaranteed);
    profile.chances.forEach(row => {
        if (row && Math.random() < Math.max(0, Math.min(1, Number(row.chance) || 0))) {
            addSalvageRewardAmount(rewards, row.key, row.amount);
        }
    });
    return rewards;
}

function salvageItemObject(item, silent, options) {
    if (!item) return {};
    const jewels = equipmentSockets.returnJewels(item);
    if (jewels > 0) addLog(`💠 [${item.name}]에 끼운 주얼 ${jewels}개를 주얼 보관함으로 돌려받았습니다.`, 'loot-rare');
    let rewards = rollItemSalvageRewards(item, options);
    Object.entries(rewards).forEach(([key, amount]) => awardCurrency(key, amount, 'reward'));
    if (typeof salvageRecoveryRuntime !== 'undefined') salvageRecoveryRuntime.record(item, rewards);
    if (!silent) addLog(`🧪 [${item.name}] 해체 · ${formatSalvageRewardSummary(rewards)}`, "loot-normal");
    return rewards;
}

function salvageItem(idx) {
    let item = game.inventory[idx];
    if (!item) return;
    if (item.locked) return addLog(`🔒 잠금된 아이템은 해체할 수 없습니다. [${item.name}]`, 'attack-monster');
    if (typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item)) {
        return addLog(`🧰 장비 세팅에 저장된 아이템은 해체할 수 없습니다. [${item.name}]`, 'attack-monster');
    }
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
        btn.textContent = '드랍 필터';
        btn.dataset.enabled = String(enabled);
        btn.setAttribute('aria-label', `드랍 필터 · 자동해체 ${enabled ? '켜짐' : '꺼짐'}`);
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
    queueImportantSave(200);
    addLog(`⚙️ 자동해체 ${game.settings.autoSalvageEnabled ? '활성화' : '비활성화'}`, 'loot-normal');
}

// 일괄 해체 보호: 잠금·장비 프리셋 아이템은 대상에서 제외한다.
function isBulkSalvageProtectedItem(item) {
    if (!item) return true;
    if (item.locked || equipmentLootPolicy.matches(item)) return true;
    return typeof equipmentLoadoutRuntime !== 'undefined' && equipmentLoadoutRuntime.isReferenced(item);
}

function bulkSalvage(maxRarity) {
    let targetRank = maxRarity === 'normal' ? 0 : 1;
    let kept = [];
    let removed = 0;
    let rewards = {};
    game.inventory.forEach(item => {
        if (isBulkSalvageProtectedItem(item)) kept.push(item);
        else if (getRarityRank(item.rarity) <= targetRank) {
            mergeSalvageRewards(rewards, salvageItemObject(item, true));
            removed++;
        }
        else kept.push(item);
    });
    game.inventory = kept;
    ensureCraftSelectionValid();
    if (removed > 0) addLog(`🧪 장비 ${removed}개 해체 · ${formatSalvageRewardSummary(rewards)}`, 'loot-normal');
    updateStaticUI();
}
function getActiveRarityFilterSet() {
    let f = (typeof getInventoryRarityFilter === 'function')
        ? getInventoryRarityFilter()
        : ((game.settings && game.settings.inventoryViewRarities) || { normal: true, magic: true, rare: true, unique: true });
    return ['normal', 'magic', 'rare', 'unique'].filter(rarity => !!f[rarity]);
}

async function bulkSalvageSelected() {
    let selectedRarities = getActiveRarityFilterSet();
    if (selectedRarities.length === 0) return addLog('해체할 등급을 먼저 선택하세요. (등급 필터에서 선택)', 'attack-monster');
    let rarityLabels = ITEM_RARITY_LABELS;
    let targetItems = (game.inventory || []).filter(item => item && !isBulkSalvageProtectedItem(item) && selectedRarities.includes(item.rarity));
    let targetCount = targetItems.length;
    if (targetCount <= 0) return addLog('선택한 등급의 해체 가능한 장비가 없습니다.', 'attack-monster');
    let labelText = selectedRarities.map(r => rarityLabels[r] || r).join('/');
    if (!await requestGameConfirmation(`[${labelText}] 등급 장비 ${targetCount}개를 해체합니다.\n잠긴 장비는 보호됩니다.`, {
        title: '등급 일괄 해체',
        tone: 'danger',
        confirmLabel: `${targetCount}개 해체`
    })) return;
    let kept = [];
    let removed = 0;
    let lockedSkipped = 0;
    let rewards = {};
    game.inventory.forEach(item => {
        if (selectedRarities.includes(item.rarity)) {
            if (isBulkSalvageProtectedItem(item)) {
                kept.push(item);
                lockedSkipped++;
            } else {
                mergeSalvageRewards(rewards, salvageItemObject(item, true));
                removed++;
            }
        } else {
            kept.push(item);
        }
    });
    if (removed === 0) {
        if (lockedSkipped > 0) return addLog(`🔒 선택 등급 아이템이 모두 보호 상태입니다. (잠금/배치/세팅 ${lockedSkipped}개)`, 'attack-monster');
        return addLog('선택한 등급의 장비가 없습니다.', 'attack-monster');
    }
    game.inventory = kept;
    ensureCraftSelectionValid();
    addLog(`🧪 선택한 등급 장비 ${removed}개 해체 · ${formatSalvageRewardSummary(rewards)}${lockedSkipped > 0 ? ` (잠금/배치/세팅 ${lockedSkipped}개 보호)` : ''}`, 'loot-normal');
    updateStaticUI();
}
async function bulkSalvageAllInventory() {
    if (!Array.isArray(game.inventory) || game.inventory.length <= 0) return addLog('해체할 장비가 없습니다.', 'attack-monster');
    let lockedCount = game.inventory.filter(item => isBulkSalvageProtectedItem(item)).length;
    let targetItems = game.inventory.filter(item => !isBulkSalvageProtectedItem(item));
    let salvageCount = targetItems.length;
    if (salvageCount <= 0) return addLog('🔒 잠금/배치/세팅 보호되지 않은 아이템이 없어 전체해체를 실행할 수 없습니다.', 'attack-monster');
    if (!await requestGameConfirmation(`인벤토리 장비 ${salvageCount}개를 모두 해체합니다.${lockedCount > 0 ? `\n잠금/배치/세팅 장비 ${lockedCount}개는 보호됩니다.` : ''}`, {
        title: '인벤토리 전체 해체',
        tone: 'danger',
        confirmLabel: `${salvageCount}개 해체`
    })) return;
    let targetSet = new Set(targetItems);
    let kept = [];
    let rewards = {};
    game.inventory.forEach(item => {
        if (!targetSet.has(item) || isBulkSalvageProtectedItem(item)) kept.push(item);
        else mergeSalvageRewards(rewards, salvageItemObject(item, true));
    });
    game.inventory = kept;
    if (!isCraftSelectionEquip()) clearCraftSelection();
    addLog(`🧪 인벤토리 전체해체 완료 (${salvageCount}개) · ${formatSalvageRewardSummary(rewards)}${lockedCount > 0 ? ` · 잠금/배치/세팅 ${lockedCount}개 보호` : ''}`, 'loot-normal');
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


function getAvailableSporeCraftModes() {
    let modes = ['none', 'fire', 'cold', 'light'];
    if (contentProgression.isUnlocked('advancedSpores')) modes.push('chaos', 'damage');
    return modes;
}

/** 혼돈 · 피해 홀씨는 고급 홀씨 해금 뒤에만 쓴다. 저장된 선택도 쓰는 순간 다시 본다(제작 · 미리보기 · 다시 사용 공통). */
function getSporeCraftBlockReason(item, actionKey, mode) {
    if (['chaos', 'damage'].includes(mode) && !getAvailableSporeCraftModes().includes(mode)) return '혼돈 · 피해 홀씨 제작은 ‘해금’의 고급 홀씨를 열어야 쓸 수 있습니다.';
    return equipmentCrafting.getSporeBlockReason(item, actionKey, mode);
}

function isSporeCraftEquipment(item) {
    if (!item) return false;
    let slot = String(item.slot || '').replace(/[123]$/, '');
    return EQUIPMENT_DROP_SLOTS.includes(slot);
}

function applyCorruptSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!contentProgression.isUnlocked('advancedSpores')) return addLog('부패 홀씨는 ‘해금’의 고급 홀씨를 열어야 쓸 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (!isSporeCraftEquipment(item)) return addLog('홀씨 제작은 장비에만 사용할 수 있습니다.', 'attack-monster');
    if (item.corrupted) return addLog('타락한 아이템에는 사용할 수 없습니다.', 'attack-monster');
    let cost = 8;
    if ((game.currencies.sporeFire || 0) < cost || (game.currencies.sporeCold || 0) < cost || (game.currencies.sporeLight || 0) < cost) return addLog(`부패 홀씨에는 각 속성 홀씨 ${cost}개가 필요합니다.`, 'attack-monster');
    let ids = new Set(['fireFlatDmg','coldFlatDmg','lightFlatDmg','firePctDmg','coldPctDmg','lightPctDmg','elementalPctDmg','resF','resC','resL']);
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    let candidates = item.stats.map((stat, idx) => ({ stat, idx })).filter(row => row.stat && !row.stat.lockedByHoney && !row.stat.lockedByRift && ids.has(row.stat.id));
    if (candidates.length <= 0) return addLog('제거할 원소 계열 옵션이 없습니다.', 'attack-monster');
    game.currencies.sporeFire -= cost;
    game.currencies.sporeCold -= cost;
    game.currencies.sporeLight -= cost;
    let pick = rndChoice(candidates);
    let removed = item.stats.splice(pick.idx, 1)[0];
    updateItemName(item);
    addLog(`🍄 부패 홀씨 적용: ${removed.statName || getStatName(removed.id)} 옵션 제거`, 'loot-rare');
    updateStaticUI();
}

function applyRiftSporeToSelectedItem() { if (game.woodsmanBuildLock) return addLog('☠️ 나무꾼 전투 중에는 세팅을 변경할 수 없습니다.', 'attack-monster');
    if (!contentProgression.isUnlocked('advancedSpores')) return addLog('균열 홀씨는 ‘해금’의 고급 홀씨를 열어야 쓸 수 있습니다.', 'attack-monster');
    let item = getSelectedCraftItem();
    if (!item) return addLog('먼저 아이템을 선택하세요.', 'attack-monster');
    if (!isSporeCraftEquipment(item)) return addLog('홀씨 제작은 장비에만 사용할 수 있습니다.', 'attack-monster');
    const craftBlock = equipmentCrafting.getBlockReason(item, 'fossil');
    if (craftBlock) return addLog(craftBlock, 'attack-monster');
    if ((game.currencies.fossil || 0) < 1 || (game.currencies.sporeFire || 0) < 5 || (game.currencies.sporeCold || 0) < 5 || (game.currencies.sporeLight || 0) < 5) return addLog('균열 홀씨에는 미궁 화석 1개와 각 속성 홀씨 5개가 필요합니다.', 'attack-monster');
    item.stats = Array.isArray(item.stats) ? item.stats : [];
    if (item.stats.length >= EXPLICIT_AFFIX_LINE_CAP) return addLog('옵션이 가득 차 있습니다.', 'attack-monster');
    let pool = typeof getFossilExclusivePool === 'function' ? getFossilExclusivePool(item) : FOSSIL_EXCLUSIVE_MODS.filter(mod => mod.slots.includes(item.slot));
    if (!pool || pool.length <= 0) return addLog('이 장비 슬롯에 붙일 수 있는 화석 전용 옵션이 없습니다.', 'attack-monster');
    game.currencies.fossil--;
    game.currencies.sporeFire -= 5;
    game.currencies.sporeCold -= 5;
    game.currencies.sporeLight -= 5;
    let roll = rollAffixValue(pickWeightedMod(pool), getItemCraftTier(item));
    roll.fossilExclusiveSpore = true;
    roll.craftSource = 'fossil';
    item.stats.push(roll);
    item.rarity = item.rarity === 'normal' ? 'magic' : item.rarity;
    updateItemName(item);
    addLog(`🍄 균열 홀씨 적용: ${roll.statName || getStatName(roll.id)} +${formatValue(roll.id, roll.val)}`, 'loot-unique');
    updateStaticUI();
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

function getSporeCraftCost() {
    return 10;
}

function hasSporeCraftCost(mode) {
    if (!mode || mode === 'none') return true;
    let cost = getSporeCraftCost();
    if (mode === 'fire') return (game.currencies.sporeFire || 0) >= cost;
    if (mode === 'cold') return (game.currencies.sporeCold || 0) >= cost;
    if (mode === 'light') return (game.currencies.sporeLight || 0) >= cost;
    if (mode === 'chaos' || mode === 'damage') {
        return (game.currencies.sporeFire || 0) >= cost
            && (game.currencies.sporeCold || 0) >= cost
            && (game.currencies.sporeLight || 0) >= cost;
    }
    return true;
}

// 잿불가지(타락) 제작 결과(2026-10-05 사용자 요청, data/items.js TAINTED_CRAFT_OUTCOMES): 이 장비에 쓸 수 없는 결과는 빼고 남은 비중으로 한 번 고른다.
function getTaintedRerollLines(item) {
    return (item.stats || []).map((stat, index) => ({ stat, index }))
        .filter(({ stat }) => stat && !stat.lockedByHoney && !stat.lockedByRift);
}

function canApplyTaintedOutcome(item, kind) {
    if (kind === 'addMod') return getAvailableMods(item).length > 0;
    if (kind === 'quality') return Math.floor(Number(item.quality) || 0) < TAINTED_CRAFT_OUTCOMES.quality.cap;
    if (kind === 'rerollMod') return getTaintedRerollLines(item).length > 0 && getAvailableMods(item).length > 0;
    if (kind === 'socket') return contentProgression.isUnlocked('jewel') && equipmentSockets.canAddCorruptionSocket(item);
    return kind === 'nothing';
}

function pickTaintedOutcome(item) {
    const rows = TAINTED_CRAFT_OUTCOMES.weights.filter(([kind]) => canApplyTaintedOutcome(item, kind));
    let roll = Math.random() * rows.reduce((sum, [, weight]) => sum + weight, 0);
    for (const [kind, weight] of rows) {
        if (roll < weight) return kind;
        roll -= weight;
    }
    return 'nothing';
}

/** One random explicit line (not honey/rift locked) becomes a different random mod rolled at the item's craft tier. */
function rerollTaintedLine(item) {
    const { stat, index } = rndChoice(getTaintedRerollLines(item));
    const name = stat.statName || getStatName(stat.id);
    item.stats.splice(index, 1);
    // 새 줄은 빠진 줄을 뺀 접두 3, 접미 3 자리가 남는 종류에서(옵션 추가만 한도를 넘는다). 고를 줄이 없으면 원래 줄이 남는다.
    const open = getOpenAffixMods(item);
    const mod = pickWeightedMod(open.filter(row => (row.statId || row.id) !== stat.id)) || pickWeightedMod(open);
    item.stats.splice(index, 0, mod ? rollAffixValue(mod, getItemCraftTier(item)) : stat);
    updateItemName(item);
    return `${name} 옵션이 ${item.stats[index].statName || getStatName(item.stats[index].id)} 옵션으로 바뀌었습니다.`;
}

/**
 * Corrupts the item and applies one outcome. Quality may pass the usual 20% up to the outcome cap (corrupted items resolve
 * quality up to 30%, js/equipment-stat-resolution.js). The socket outcome opens the corruption socket (js/equipment-sockets.js):
 * a second socket beside an accessory's void socket, or the item's only socket.
 * @returns {{kind: 'addMod'|'quality'|'rerollMod'|'socket'|'nothing', text: string}}
 */
function corruptCraftedItem(item) {
    const kind = pickTaintedOutcome(item);
    item.corrupted = true;
    if (kind === 'addMod') {
        item.stats.push(rollAffixValue(pickWeightedMod(getAvailableMods(item)), getItemCraftTier(item)));
        updateItemName(item);
        return { kind, text: '추가 옵션이 부여되었습니다.' };
    }
    if (kind === 'quality') {
        const { min, max, cap } = TAINTED_CRAFT_OUTCOMES.quality, before = Math.floor(Number(item.quality) || 0);
        item.quality = Math.min(cap, before + min + Math.floor(Math.random() * (max - min + 1)));
        return { kind, text: `품질이 ${before}% → ${item.quality}%로 올랐습니다.` };
    }
    if (kind === 'rerollMod') return { kind, text: rerollTaintedLine(item) };
    if (kind === 'socket') {
        equipmentSockets.addCorruptionSocket(item);
        return { kind, text: equipmentSockets.count(item) > 1 ? '두 번째 소켓, 타락 소켓이 열렸습니다!' : '타락 소켓이 하나 생겼습니다.' };
    }
    return { kind, text: '아이템에 변화가 없습니다.' };
}

/**
 * @param {string} currencyKey Crafting action; pays one of that currency.
 * @returns {Promise<true|undefined>} True only after the item and payment are committed.
 */
async function useCurrency(currencyKey) {
    let item = getSelectedCraftItem();
    if (!item) return addLog("먼저 아이템을 선택하세요.", "attack-monster");
    const payment = getCraftPayment(currencyKey);
    if (!payment?.affordable) return addLog("제작 재화가 부족하거나 사용할 수 없는 제작 방식입니다.", "attack-monster");
    let actionKey = equipmentCrafting.resolveAction(currencyKey, item.rarity);
    if (item.corrupted && actionKey !== 'tainted') return addLog("타락한 아이템은 더 이상 제작할 수 없습니다.", "attack-monster");
    if (item.fusedRelic && !['divine', 'tainted', 'blessing'].includes(actionKey)) return addLog("융합 유물은 황금률·잿불가지·축복의 꽃잎만 사용할 수 있습니다.", "attack-monster");

    let explicitCap = EXPLICIT_AFFIX_LINE_CAP;
    let ok = false;
    if (actionKey === 'transmute') ok = item.rarity === 'normal';
    else if (actionKey === 'alteration') ok = item.rarity === 'magic';
    else if (actionKey === 'alchemy') ok = item.rarity === 'normal';
    else if (actionKey === 'exalted') ok = item.rarity === 'rare' && getItemExplicitOptionCount(item) < explicitCap;
    else if (actionKey === 'regal') ok = item.rarity === 'magic' && getItemExplicitOptionCount(item) < explicitCap;
    else if (actionKey === 'chaos') ok = item.rarity === 'rare';
    else if (actionKey === 'divine') ok = item.rarity !== 'normal';
    else if (actionKey === 'chance') ok = item.rarity === 'normal';
    else if (actionKey === 'scour') ok = item.rarity !== 'normal' && item.rarity !== 'unique';
    else if (actionKey === 'tainted') ok = !item.corrupted || (isKaleidoscopeShieldItem(item) && getItemExplicitOptionCount(item) <= EXPLICIT_AFFIX_LINE_CAP);
    else if (currencyKey === 'blessing') ok = Array.isArray(item.baseStats) && item.baseStats.length > 0;
    else if (actionKey === 'annulment') ok = getAnnulmentRemovableStats(item).length > 0;
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
    if (currencyKey === 'divine' && !await requestGameConfirmation('선택한 장비에 신성한 오브를 사용합니다.', {
        title: '희귀 재화 사용',
        tone: 'danger',
        confirmLabel: '사용'
    })) return;
    // 확인창이 열린 동안 제작 대상을 바꾸거나 장비를 이동한 경우, 이전 객체에 오브가
    // 적용되는 것을 막는다. 확인 전의 잔여 수량·제작 가능 상태도 다시 검증한다.
    if (getSelectedCraftItem() !== item || !getCraftPayment(currencyKey)?.affordable) {
        return addLog('확인 중 제작 대상 또는 재화가 변경되어 사용을 취소했습니다.', 'attack-monster');
    }
    if (item.corrupted && actionKey !== 'tainted') return addLog('확인 중 장비 상태가 변경되어 사용을 취소했습니다.', 'attack-monster');
    if (item.fusedRelic && !['divine', 'tainted', 'blessing'].includes(actionKey)) return addLog('확인 중 장비 상태가 변경되어 사용을 취소했습니다.', 'attack-monster');

    game.sporeCraftModes = game.sporeCraftModes || {};
    // 홀씨 태그 보장은 장비 제작 전용이다.
    let sporeMode = isSporeCraftEquipment(item) ? (game.sporeCraftModes[currencyKey] || 'none') : 'none';
    const sporeBlock = getSporeCraftBlockReason(item, actionKey, sporeMode);
    if (sporeBlock) return addLog(sporeBlock, 'attack-monster');
    function consumeSpore(mode) {
        if (mode === 'none') return true;
        if (!hasSporeCraftCost(mode)) return false;
        const all = ['sporeFire', 'sporeCold', 'sporeLight'];
        const keys = {fire: ['sporeFire'], cold: ['sporeCold'], light: ['sporeLight'], chaos: all, damage: all}[mode] || [];
        const cost = getSporeCraftCost();
        keys.forEach(key => { game.currencies[key] -= cost; });
        return true;
    }
    function getSporeGuaranteedMod(allowReplacement) {
        if (sporeMode === 'none') return null;
        let rerollItem = allowReplacement ? {
            ...item,
            stats: (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift))
        } : item;
        // 결과 희귀도의 한도로 센다: 새싹(변환, 변경)은 마법 1과 1, 나머지는 희귀 3과 3.
        let source = getOpenAffixMods(rerollItem, ['transmute', 'alteration'].includes(actionKey) ? 'magic' : 'rare');
        let avail = equipmentCrafting.filterSporeMods(source, sporeMode);
        return pickWeightedMod(avail);
    }
    function rollSporeGuaranteedValue(mod) {
        if (!mod) return null;
        let range = getCraftTierRangeForItem(item, 'spore');
        // 계열을 보장하되 최상위 두 티어를 확정하지 않는다. 정의된 홀씨 티어 범위 전체에서 굴린다.
        return { ...rollAffixValueInTierRange(mod, range.min, range.max), craftSource: 'spore' };
    }
    function sporeReroll(extra) {
        let guaranteedStat = sporeMode !== 'none' && usesSporeAffix ? rollSporeGuaranteedValue(guaranteedMod) : null;
        return { ...extra, guaranteedStat };
    }
    let guaranteedMod = getSporeGuaranteedMod();
    let consumedSpore = false;
    // alteration은 transmute처럼 옵션을 통째로 다시 굴린다. 마법의 새싹이 마법
    // 아이템에서 이 경로를 타게 되면서, 두 목록에 함께 넣지 않으면 홀씨 모드를
    // 켜도 아무 일 없이 지나가 버린다(소모도 보장도 없음).
    let sporeAffixCurrencies = ['transmute', 'augment', 'alteration', 'alchemy', 'exalted', 'regal', 'chaos'];
    let rerollSporeCurrencies = ['transmute', 'alteration', 'alchemy', 'chaos'];
    let usesSporeAffix = sporeAffixCurrencies.includes(actionKey);
    let isRerollSporeCurrency = rerollSporeCurrencies.includes(actionKey);
    let needsPrecheck = usesSporeAffix && !isRerollSporeCurrency;
    if (sporeMode !== 'none' && needsPrecheck && !guaranteedMod) {
        return addLog('선택한 홀씨 계열에서 새로 부여할 수 있는 옵션이 없습니다. 홀씨 모드를 미사용으로 바꾸거나 해당 계열의 기존 옵션을 제거하세요.', 'attack-monster');
    }
    if (sporeMode !== 'none' && usesSporeAffix && isRerollSporeCurrency) {
        guaranteedMod = getSporeGuaranteedMod(true);
        if (!guaranteedMod) return addLog('이 장비에는 선택한 홀씨로 출현 가능한 옵션이 없어 제작할 수 없습니다.', 'attack-monster');
        if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족해 제작을 시작하지 않았습니다.', 'attack-monster');
            consumedSpore = true;
    }
    let exaltedMod = null;
    if (actionKey === 'exalted') {
        exaltedMod = guaranteedMod || pickWeightedMod(getOpenAffixMods(item));
        if (!exaltedMod) return addLog('이 장비에 추가로 부여할 수 있는 옵션이 없습니다.', 'attack-monster');
    }
    if (sporeMode !== 'none' && usesSporeAffix && !isRerollSporeCurrency) {
        if (!consumeSpore(sporeMode)) return addLog('홀씨가 부족합니다.', 'attack-monster');
        consumedSpore = true;
    }
    let craftResultToken = craftingResultLedger.begin(item, { currencyKey, actionKey });
    game.currencies[payment.key] -= payment.cost;
    if (['deepWhetstone', 'rootIron', 'jewelPolish'].includes(currencyKey)) {
        item.quality = Math.max(0, Math.min(20, Math.floor(item.quality || 0) + 1));
        addLog(`🛠️ 장비 퀄리티 +1% (현재 ${item.quality}%)`, 'loot-magic');
    } else if (actionKey === 'transmute') {
        item.rarity = 'magic';
        rerollExplicitMods(item, 'magic', getItemCraftTier(item), sporeReroll());
    } else if (actionKey === 'alteration') {
        rerollExplicitMods(item, 'magic', getItemCraftTier(item), sporeReroll());
    } else if (actionKey === 'alchemy') {
        item.rarity = 'rare';
        rerollExplicitMods(item, 'rare', getItemCraftTier(item), sporeReroll({ rerollChaosInfusion: true }));
    } else if (actionKey === 'exalted') {
        item.stats.push((exaltedMod === guaranteedMod) ? rollSporeGuaranteedValue(exaltedMod) : rollAffixValue(exaltedMod, getItemCraftTier(item)));
        updateItemName(item);
    } else if (actionKey === 'regal') {
        let mod = guaranteedMod || pickWeightedMod(getOpenAffixMods(item, 'rare'));
        if (mod) item.stats.push((mod === guaranteedMod) ? rollSporeGuaranteedValue(mod) : rollAffixValue(mod, getItemCraftTier(item)));
        item.rarity = 'rare';
        updateItemName(item);
    } else if (actionKey === 'chaos') {
        rerollExplicitMods(item, 'rare', getItemCraftTier(item), sporeReroll({ rerollChaosInfusion: true }));
    } else if (actionKey === 'divine') {
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
    } else if (actionKey === 'chance') {
        if (Math.random() < 0.25) {
            const jewels = destroySelectedCraftItem(item);
            addLog(`💥 기회의 오브: 아이템이 파괴되었습니다.${jewels ? ` 끼운 주얼 ${jewels}개는 주얼 보관함으로 돌아왔습니다.` : ''}`, 'attack-monster');
        } else {
            let tier = Math.max(1, Math.floor(item.hiddenTier || item.itemTier || 1));
            let unique = generateUniqueItem(tier, item.slot);
            if (!unique) return addLog('승급할 수 있는 고유가 없습니다.', 'attack-monster');
            let previousId = item.id;
            // The unique is a fresh item: socketed jewels go back to storage before the old keys are cleared.
            const jewels = equipmentSockets.returnJewels(item);
            Object.keys(item).forEach(key => delete item[key]);
            Object.assign(item, unique);
            // 배치 참조가 끊기지 않도록 원래 id를 유지한다.
            item.id = previousId;
            addLog(`🌟 기회의 오브: [${item.name}] 고유로 진화했습니다.${jewels ? ` 끼운 주얼 ${jewels}개는 주얼 보관함으로 돌아왔습니다.` : ''}`, 'loot-unique');
        }
    } else if (actionKey === 'annulment') {
        let removable = getAnnulmentRemovableStats(item);
        if (removable.length <= 0) return addLog('제거할 수 있는 추가 옵션이 없습니다.', 'attack-monster');
        let picked = rndChoice(removable);
        let removed = item.stats.splice(picked.index, 1)[0];
        updateItemName(item);
        addLog(`🕳️ 소멸의 오브: ${removed.statName || getStatName(removed.id)} 옵션 제거`, 'loot-unique');
    } else if (actionKey === 'scour') {
        item.stats = (item.stats || []).filter(stat => stat && (stat.lockedByHoney || stat.lockedByRift));
        item.chaosInfusion = null;
        item.rarity = item.stats.length > 0 ? 'magic' : 'normal';
        updateItemName(item);
    } else if (actionKey === 'tainted') {
        const outcome = corruptCraftedItem(item);
        craftResultToken.meta.outcome = outcome.text; // the craft result card leads with it (js/crafting-result-ui.js)
        addLog(`🩸 타락: ${outcome.text}`, outcome.kind === 'nothing' ? 'attack-monster' : 'loot-unique', { toast: true });
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
            if (['leech', 'spellLeech', 'regen', 'regenSuppress', 'leechRateCap', 'leechTotalCap', 'leechInstanceCap'].includes(stat.id)) {
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
    craftingResultLedger.commit(craftResultToken, item);
    addLog(`⚒️ ${ORB_DB[payment.key].name} 사용${guaranteedTagNote}`, currencyKey === 'exalted' || currencyKey === 'divine' ? 'loot-unique' : 'loot-magic');
    updateStaticUI();
    return true;
}

function isMarketUnlocked() {
    return contentProgression.isUnlocked('market');
}

/** Read-only quote. Quantity is an integer count or 'max'; currencies are normalized at load. */
function getMarketExchangeQuote(recipe, quantity, owner = game) {
    const have = owner.currencies[recipe.from] || 0;
    const max = Math.floor(have / recipe.need);
    const times = quantity === 'max' ? max : Number(quantity);
    const valid = Number.isSafeInteger(times) && times >= 1 && times <= max;
    const spend = valid ? times * recipe.need : 0, gain = valid ? times * recipe.gain : 0;
    return { have, max, times, valid, spend, gain, afterFrom: have - spend, afterTo: (owner.currencies[recipe.to] || 0) + gain };
}

async function exchangeAtMarket(exchangeId, exchangeAll, quantity = 1) {
    if (!isMarketUnlocked()) return addLog('장비 제련을 해금하면 거래소를 이용할 수 있습니다.', 'attack-monster');
    let recipe = MARKET_EXCHANGES.find(row => row.id === exchangeId);
    if (!recipe) return;
    const { valid, times, spend, gain } = getMarketExchangeQuote(recipe, exchangeAll ? 'max' : quantity);
    if (!valid) return addLog('교환 가능한 수량을 입력하세요.', 'attack-monster');
    if (exchangeAll || times > 1) {
        let question = `${ORB_DB[recipe.from].name} ${spend}개를 ${ORB_DB[recipe.to].name} ${gain}개로 교환하시겠습니까?`;
        if (!await requestGameConfirmation(question, {
            title: '재화 교환',
            tone: 'danger',
            confirmLabel: '교환'
        })) return;
        if (!isMarketUnlocked() || game.currencies[recipe.from] < spend)
            return addLog('교환 확인 중 재화 또는 해금 상태가 변경되어 거래를 취소했습니다.', 'attack-monster');
    }
    game.currencies[recipe.from] -= spend;
    awardCurrency(recipe.to, gain);
    addLog(`🏦 거래소 교환: ${ORB_DB[recipe.from].name} ${spend}개 → ${ORB_DB[recipe.to].name} ${gain}개`, 'loot-magic');
    checkUnlocks();
    updateStaticUI();
}

safeExposeGlobals({
    getMarketExchangeQuote,
    getRealmEquipmentHiddenTierCap,
    getRealmItemDropTierRange,
    getDroppedAffixTierRange,
    rollRealmItemDropTier,
    getAnnulmentRemovableStats,
    getSporeCraftCost,
    hasSporeCraftCost,
    isSporeCraftEquipment,
    getItemSalvageRewardProfile,
    getItemSalvagePreviewText,
    rollItemSalvageRewards,
    mergeSalvageRewards,
    formatSalvageRewardSummary
});
