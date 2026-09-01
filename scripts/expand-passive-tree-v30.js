#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { buildRuntimeTree, writeRuntimeModule } = require('./build-passive-tree-runtime');
const { buildClusterLayout, clusterPatternCount } = require('./lib/passive-tree-cluster-layouts');
const { CLASS_SECTORS, HYBRID_SECTORS, KEYSTONES, SPECIAL_THEMES } = require('./lib/passive-tree-v30-catalog');
const { classifyPassiveTreeTopology } = require('./lib/passive-tree-topology');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_FILE = path.join(ROOT, 'artifacts', 'passive-tree', '260828_3passive-tree-feature-effects.json');
const BASE_TOPOLOGY_FILE = path.join(ROOT, 'artifacts', 'passive-tree', '260828_3passive-tree-corrected.json');
const RUNTIME_FILE = path.join(ROOT, 'data', 'passive-tree-v22.js');
const LEGACY_PREFIX = 'exp30_';
const PREFIX = 'backbone_branch_';
const MIN_NODE_DISTANCE = 50;
const BASE_NODE_CLEARANCE = 58;
const EXPANSION_NODE_CLEARANCE = 58;
const BASE_EDGE_CLEARANCE = 12;
const MAX_EXPANSION_RADIUS = 2750;
const SPATIAL_CELL_SIZE = 180;
const STRUCTURAL_STATS = new Set([
    'projectileExtraShots', 'targetProjectile', 'slamEchoChance', 'maxResAll', 'suppCap',
    'summonCap', 'summonGemLevel', 'summonGuardRedirectPct'
]);
const SPECIAL_STATS = new Set(['mystique', 'devotion', 'cycle']);
const CLASS_THEME_GROUPS = Object.freeze([
    Object.freeze([0, 1, 2]), Object.freeze([3, 4, 5]),
    Object.freeze([6, 7]), Object.freeze([8, 9])
]);
const CLASS_GROUP_PLACEMENTS = Object.freeze([
    Object.freeze({ angleOffset: -16, targetRadius: 2100 }),
    Object.freeze({ angleOffset: 16, targetRadius: 1750 }),
    Object.freeze({ angleOffset: -8, targetRadius: 1350 }),
    Object.freeze({ angleOffset: 10, targetRadius: 1000 })
]);
const CENTER_PATTERN_INDICES = Object.freeze([0, 13, 25, 27, 28, 29]);
const CLASS_PATTERN_INDICES = Object.freeze([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 26
]);
const SPECIAL_THEME_ASSIGNMENTS = Object.freeze({
    occultist: Object.freeze(['universal_gem', 'mystique_single']),
    cleric: Object.freeze(['devotion_triple', 'devotion_guard']),
    warrior: Object.freeze(['cycle_reverse', 'universal_defense']),
    wanderer: Object.freeze(['universal_damage']),
    archer: Object.freeze(['cycle_element']),
    alchemist: Object.freeze(['universal_flask', 'universal_summon'])
});

const STAT_VALUES = Object.freeze({
    flatDmg: [2, 3, 8, 16], flatHp: [15, 20, 45, 90], armor: [15, 20, 45, 90],
    evasion: [15, 20, 45, 90], energyShield: [12, 16, 36, 72], accuracy: [40, 50, 100, 200],
    pctHp: [2, 2, 5, 10], regen: [0.5, 0.5, 1, 2], aspd: [2, 2, 5, 10], move: [2, 2, 5, 10],
    crit: [1, 1, 2, 5], critDmg: [10, 10, 15, 30], leech: [0.5, 0.5, 1, 2],
    blockChance: [2, 2, 4, 8], deflectChance: [4, 4, 6, 10], deflectDamageReduce: [0, 0, 3, 6],
    resAll: [4, 4, 8, 12], maxResAll: [0, 0, 0, 1], minDmgRoll: [2, 2, 5, 10],
    maxDmgRoll: [2, 2, 5, 10], projectileExtraShots: [0, 0, 0, 1], targetProjectile: [0, 0, 0, 1],
    slamEchoChance: [0, 0, 0, 10], suppCap: [0, 0, 0, 1], summonCap: [0, 0, 0, 1],
    summonGemLevel: [0, 0, 0, 1], summonGuardRedirectPct: [0, 0, 0, 10],
    mystique: [1, 1, 2, 3], devotion: [1, 1, 2, 3], cycle: [1, 1, 2, 3]
});

const PLACEMENT_VARIANTS = Object.freeze([0, 12, -12, 24, -24, 38, -38, 55, -55, 78, -78, 110, -110, 180]
    .flatMap((offset, offsetIndex) => [1, -1].map(mirror => ({ offset, offsetIndex, mirror }))));
const NORMAL_BRANCH_WEIGHTS = Object.freeze({
    4: Object.freeze([1.25, 0.5]),
    7: Object.freeze([1, 1]),
    9: Object.freeze([0.5, 1.25])
});

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function statNames() {
    const context = buildGameRuntime();
    return JSON.parse(vm.runInContext('JSON.stringify(Object.fromEntries(Object.entries(P_STATS).map(([id, value]) => [id, value.name || id])))', context));
}

function valueFor(statId, type) {
    const index = { minor: 0, assist: 1, normal: 2, major: 3 }[type] ?? 0;
    if (STAT_VALUES[statId]) return STAT_VALUES[statId][index];
    if (/Chance$/.test(statId) || ['bleedChance', 'poisonChance', 'igniteChance', 'chillChance', 'freezeChance', 'shockChance'].includes(statId)) {
        return [5, 5, 10, 20][index];
    }
    if (statId === 'ailmentDamagePct' || statId === 'ailmentPotencyPct') return [5, 5, 10, 25][index];
    if (statId === 'summonEfficiency') return [5, 5, 10, 20][index];
    if (statId === 'summonHpPct') return [5, 5, 10, 20][index];
    if (statId === 'summonPctDmg') return [5, 5, 10, 30][index];
    if (statId.endsWith('Pct') || statId.endsWith('PctDmg')) return [5, 5, 10, 30][index];
    return [2, 2, 5, 10][index];
}

function weightedNormalValue(statId, value, weight) {
    const halfStep = ['regen', 'crit', 'blockChance', 'deflectChance', 'leech', 'resPen'].includes(statId);
    const adjustedWeight = halfStep && weight > 1 ? 1.5 : weight;
    const scaled = Number(value) * adjustedWeight;
    if (halfStep) {
        return Math.max(0.5, Math.round(scaled * 2) / 2);
    }
    return Math.max(1, Math.round(scaled));
}

function normalBranchEffects(theme, nodeIndex) {
    const ordinary = theme.stats.filter(statId => !STRUCTURAL_STATS.has(statId));
    if (ordinary.length < 2) throw new Error(`일반 패시브 갈래 효과가 부족합니다: ${theme.id}`);
    if (SPECIAL_STATS.has(ordinary[0])) {
        const branchIndex = { 4: 0, 7: 1, 9: 2 }[nodeIndex] || 0;
        const secondary = ordinary.slice(1)[branchIndex % (ordinary.length - 1)];
        return [
            { statId: ordinary[0], value: valueFor(ordinary[0], 'normal') },
            { statId: secondary, value: valueFor(secondary, 'normal') }
        ];
    }
    const weights = NORMAL_BRANCH_WEIGHTS[nodeIndex] || NORMAL_BRANCH_WEIGHTS[7];
    return ordinary.slice(0, 2).map((statId, index) => ({
        statId,
        value: weightedNormalValue(statId, valueFor(statId, 'normal'), weights[index])
    }));
}

function nodeEffects(theme, type, nodeIndex) {
    const ordinary = theme.stats.filter(statId => !STRUCTURAL_STATS.has(statId));
    if (type === 'minor' || type === 'assist') {
        const statId = ordinary[nodeIndex % ordinary.length] || theme.stats[0];
        return [{ statId, value: valueFor(statId, type) }];
    }
    if (type === 'normal') return normalBranchEffects(theme, nodeIndex);
    const output = [{ statId: theme.stats[0], value: valueFor(theme.stats[0], type) }];
    const structural = theme.stats.slice(1).find(statId => STRUCTURAL_STATS.has(statId));
    const secondary = type === 'major' && structural ? structural : theme.stats[1];
    if (secondary) {
        const value = valueFor(secondary, type === 'major' ? 'major' : 'minor');
        if (value) output.push({ statId: secondary, value });
    }
    return output;
}

function formatValue(effect, names) {
    const name = names[effect.statId] || effect.statId;
    const suffix = name.includes('(%)') || name.includes('확률')
        || ['regen', 'leech', 'deflectDamageReduce', 'takenDamageReduceWhen1EnemyPct'].includes(effect.statId) ? '%' : '';
    return `${name.replace(/\(%\)/g, '')} +${effect.value}${suffix}`;
}

function passiveNode(theme, config, names) {
    const effects = nodeEffects(theme, config.type, config.effectIndex);
    const simpleName = names[effects[0].statId] || theme.label;
    const normalSuffix = { 4: '집중', 7: '조율', 9: '전환' }[config.effectIndex] || '숙련';
    const name = config.type === 'major' ? theme.label
        : (config.type === 'normal' ? `${theme.label} ${normalSuffix}` : simpleName.replace(/\(%\)/g, ''));
    return { cat: theme.cat, id: config.id, x: config.point.x, y: config.point.y, type: config.type, name,
        desc: effects.map(effect => formatValue(effect, names)).join('\n'), mods: effects.map(effect => ({ ...effect })),
        statAutoName: config.type === 'minor' || config.type === 'assist', archetype: theme.archetype,
        optionProfile: `expansion:v30:${theme.id}`, runtimeEffects: effects,
        sourceOptionProfiles: (theme.sourceThemeIds || [theme.id]).map(id => `expansion:v30:${id}`),
        optionClusterId: config.optionClusterId, expansionGroupId: config.expansionGroupId,
        powerBand: 4, iconFamily: theme.icon };
}

function keystoneNode(definition, theme, id, point) {
    return { cat: theme.cat, id, x: point.x, y: point.y, type: 'keystone', name: definition.name,
        desc: definition.desc, mods: [], statAutoName: false, runtimeEffects: [], iconFamily: definition.icon,
        expansionGroupId: id.replace(/_keystone$/, ''), keystoneTemplateId: `backbone_branch_${theme.id}`,
        keystoneTemplateVersion: 1,
        keystoneEffectId: `keystone:${id}` };
}

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}

function angleDistance(left, right) {
    const diff = Math.abs(normalizeAngle(left) - normalizeAngle(right));
    return Math.min(diff, 360 - diff);
}

function pointAngle(point) {
    return normalizeAngle(Math.atan2(point.y, point.x) * 180 / Math.PI);
}

function rotateLocalPoint(anchor, local, angle, mirror) {
    const radians = angle * Math.PI / 180, x = local[0], y = local[1] * mirror;
    return { x: Math.round((anchor.x + Math.cos(radians) * x - Math.sin(radians) * y) * 100) / 100,
        y: Math.round((anchor.y + Math.sin(radians) * x + Math.cos(radians) * y) * 100) / 100 };
}

function layoutChoices(themeCount, serial) {
    return [buildClusterLayout(themeCount, serial)];
}

function spatialKey(x, y) {
    return `${Math.floor(x / SPATIAL_CELL_SIZE)},${Math.floor(y / SPATIAL_CELL_SIZE)}`;
}

function addNodeToGrid(grid, node) {
    const key = spatialKey(node.x, node.y), bucket = grid.get(key) || [];
    bucket.push(node);
    grid.set(key, bucket);
}

function nearbyNodes(grid, point, radius) {
    const minX = Math.floor((point.x - radius) / SPATIAL_CELL_SIZE);
    const maxX = Math.floor((point.x + radius) / SPATIAL_CELL_SIZE);
    const minY = Math.floor((point.y - radius) / SPATIAL_CELL_SIZE);
    const maxY = Math.floor((point.y + radius) / SPATIAL_CELL_SIZE);
    const output = [];
    for (let x = minX; x <= maxX; x += 1) {
        for (let y = minY; y <= maxY; y += 1) output.push(...(grid.get(`${x},${y}`) || []));
    }
    return output;
}

function addSegmentToGrid(grid, segment) {
    const minX = Math.floor(Math.min(segment.a.x, segment.b.x) / SPATIAL_CELL_SIZE);
    const maxX = Math.floor(Math.max(segment.a.x, segment.b.x) / SPATIAL_CELL_SIZE);
    const minY = Math.floor(Math.min(segment.a.y, segment.b.y) / SPATIAL_CELL_SIZE);
    const maxY = Math.floor(Math.max(segment.a.y, segment.b.y) / SPATIAL_CELL_SIZE);
    for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
        const key = `${x},${y}`, bucket = grid.get(key) || [];
        bucket.push(segment);
        grid.set(key, bucket);
    }
}

function nearbySegments(grid, segments, margin) {
    const found = new Set();
    segments.forEach(segment => {
        const minX = Math.floor((Math.min(segment[0].x, segment[1].x) - margin) / SPATIAL_CELL_SIZE);
        const maxX = Math.floor((Math.max(segment[0].x, segment[1].x) + margin) / SPATIAL_CELL_SIZE);
        const minY = Math.floor((Math.min(segment[0].y, segment[1].y) - margin) / SPATIAL_CELL_SIZE);
        const maxY = Math.floor((Math.max(segment[0].y, segment[1].y) + margin) / SPATIAL_CELL_SIZE);
        for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) {
            (grid.get(`${x},${y}`) || []).forEach(entry => found.add(entry));
        }
    });
    return [...found];
}

function isClear(points, nodeGrid) {
    return points.every(point => nearbyNodes(nodeGrid, point, MIN_NODE_DISTANCE)
        .every(other => Math.hypot(point.x - other.x, point.y - other.y) >= MIN_NODE_DISTANCE));
}

function orientation(a, b, c) {
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function segmentsCross(left, right) {
    const a = left[0], b = left[1], c = right[0], d = right[1];
    return orientation(a, b, c) * orientation(a, b, d) < 0
        && orientation(c, d, a) * orientation(c, d, b) < 0;
}

function pointToSegmentDistance(point, start, end) {
    const dx = end.x - start.x, dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(point.x - start.x, point.y - start.y);
    const ratio = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq));
    return Math.hypot(point.x - (start.x + dx * ratio), point.y - (start.y + dy * ratio));
}

function segmentDistance(left, right) {
    if (segmentsCross(left, right)) return 0;
    return Math.min(pointToSegmentDistance(left[0], right[0], right[1]),
        pointToSegmentDistance(left[1], right[0], right[1]),
        pointToSegmentDistance(right[0], left[0], left[1]),
        pointToSegmentDistance(right[1], left[0], left[1]));
}

function respectsNodeClearance(points, state, attachId) {
    const baseClear = points.every(point => nearbyNodes(state.baseNodeGrid, point, BASE_NODE_CLEARANCE).every(node => {
        const required = String(node.id) === String(attachId) ? MIN_NODE_DISTANCE : BASE_NODE_CLEARANCE;
        return Math.hypot(point.x - node.x, point.y - node.y) >= required;
    }));
    if (!baseClear) return false;
    return points.every(point => nearbyNodes(state.expansionNodeGrid, point, EXPANSION_NODE_CLEARANCE).every(node => {
        return Math.hypot(point.x - node.x, point.y - node.y) >= EXPANSION_NODE_CLEARANCE;
    }));
}

function respectsOriginalEdges(candidateSegments, baseSegments, anchor) {
    return candidateSegments.every(candidate => baseSegments.every(existing => {
        const sharesAnchor = existing.aId === String(anchor.id) || existing.bId === String(anchor.id);
        if (candidate[0] === anchor && sharesAnchor) return true;
        return segmentDistance(candidate, [existing.a, existing.b]) >= BASE_EDGE_CLEARANCE;
    }));
}

function originalTreeClearance(points, state, attachId) {
    let clearance = Infinity;
    points.forEach(point => nearbyNodes(state.baseNodeGrid, point, 160).forEach(node => {
        if (String(node.id) === String(attachId)) return;
        clearance = Math.min(clearance, Math.hypot(point.x - node.x, point.y - node.y));
    }));
    return Number.isFinite(clearance) ? clearance : BASE_NODE_CLEARANCE;
}

function placementSegments(anchor, points, layout) {
    const entries = layout.entryIndices.map(index => [anchor, points[index]]);
    return [...entries, ...layout.edges.map(([left, right]) => [points[left], points[right]])];
}

function countCrossings(candidateSegments, existingSegments, anchorId) {
    return candidateSegments.reduce((total, segment) => total + existingSegments.filter(existing => {
        if (existing.aId === anchorId || existing.bId === anchorId) return false;
        return segmentsCross(segment, [existing.a, existing.b]);
    }).length, 0);
}

function backboneBranchAngle(state, anchor) {
    const neighbors = [...(state.baseNeighbors.get(String(anchor.id)) || [])]
        .filter(id => state.backboneIds.has(id)).map(id => state.nodeById.get(id)).filter(Boolean);
    if (neighbors.length < 2) return pointAngle(anchor) + 90;
    let pair = [neighbors[0], neighbors[1]], distance = 0;
    for (let left = 0; left < neighbors.length; left += 1) for (let right = left + 1; right < neighbors.length; right += 1) {
        const candidate = Math.hypot(neighbors[left].x - neighbors[right].x, neighbors[left].y - neighbors[right].y);
        if (candidate > distance) { distance = candidate; pair = [neighbors[left], neighbors[right]]; }
    }
    return pointAngle({ x: pair[1].x - pair[0].x, y: pair[1].y - pair[0].y }) + 90;
}

function findClusterPlacement(state, config) {
    const anchor = state.nodeById.get(config.attachId);
    if (!anchor) throw new Error(`신규 패시브 연결점을 찾을 수 없습니다: ${config.attachId}`);
    const preferred = backboneBranchAngle(state, anchor);
    const candidates = [];
    layoutChoices(config.themes.length, config.patternIndex).forEach((layout, layoutIndex) => {
        PLACEMENT_VARIANTS.forEach(({ offset, offsetIndex, mirror }) => {
            const angle = preferred + offset;
            const points = layout.points.map(point => rotateLocalPoint(anchor, point, angle, mirror));
            if (!isClear(points, state.nodeGrid)) return;
            if (!respectsNodeClearance(points, state, anchor.id)) return;
            const maxRadius = Math.max(...points.map(point => Math.hypot(point.x, point.y)));
            if (maxRadius > MAX_EXPANSION_RADIUS || points.some(point => Math.hypot(point.x, point.y) < 260)) return;
            const segments = placementSegments(anchor, points, layout);
            const nearbyAllEdges = nearbySegments(state.segmentGrid, segments, BASE_EDGE_CLEARANCE);
            const nearbyBaseEdges = nearbySegments(state.baseSegmentGrid, segments, BASE_EDGE_CLEARANCE);
            const crossings = countCrossings(segments, nearbyAllEdges, anchor.id);
            if (crossings > 0 || !respectsOriginalEdges(segments, nearbyBaseEdges, anchor)) return;
            const clearanceReward = Math.min(160, originalTreeClearance(points, state, anchor.id)) * 1.5;
            const usagePenalty = (state.patternCounts.get(layout.id) || 0) * 14;
            const score = crossings * 100000 + Math.max(0, maxRadius - 2450) * 4
                + Math.abs(offset) * 3 + layoutIndex * 7 + offsetIndex + usagePenalty - clearanceReward;
            candidates.push({ layout, points, angle, mirror, score, crossings });
        });
    });
    return candidates.sort((left, right) => left.score - right.score)[0] || null;
}

function addEdge(state, a, b) {
    const left = String(a), right = String(b), key = [left, right].sort().join('|');
    if (state.edgeKeys.has(key)) return;
    state.edgeKeys.add(key);
    state.tree.edges.push({ a: left, b: right });
    if (!state.neighbors.has(left)) state.neighbors.set(left, new Set());
    if (!state.neighbors.has(right)) state.neighbors.set(right, new Set());
    state.neighbors.get(left).add(right);
    state.neighbors.get(right).add(left);
    const leftNode = state.nodeById.get(left), rightNode = state.nodeById.get(right);
    const segment = { aId: left, bId: right, a: leftNode, b: rightNode };
    addSegmentToGrid(state.segmentGrid, segment);
}

function forcedMajorNodeIndices(placement, config) {
    const indices = new Set(placement.layout.specs.flatMap((spec, index) => spec.type === 'major' ? [index] : []));
    config.themes.forEach((theme, themeIndex) => {
        const requiresMajor = config.majorThemeIds.has(theme.id) || theme.forceMajor
            || theme.stats.some(statId => STRUCTURAL_STATS.has(statId));
        if (!requiresMajor || [...indices].some(index => placement.layout.specs[index].themeIndex === themeIndex)) return;
        const candidates = placement.layout.specs.flatMap((spec, index) => spec.themeIndex === themeIndex ? [index] : []);
        const farthest = candidates.sort((left, right) => {
            const leftPoint = placement.layout.points[left], rightPoint = placement.layout.points[right];
            return Math.hypot(rightPoint[0], rightPoint[1]) - Math.hypot(leftPoint[0], leftPoint[1]);
        })[0];
        if (farthest !== undefined) indices.add(farthest);
    });
    return indices;
}

function addCluster(state, config) {
    const placement = findClusterPlacement(state, config);
    if (!placement) return null;
    const baseId = `${PREFIX}${config.groupId}`, nodes = [];
    const forcedMajorIndices = forcedMajorNodeIndices(placement, config);
    placement.points.forEach((point, nodeIndex) => {
        const sourceSpec = placement.layout.specs[nodeIndex], theme = config.themes[sourceSpec.themeIndex];
        const spec = forcedMajorIndices.has(nodeIndex)
            ? { ...sourceSpec, type: 'major', effectIndex: 8 } : sourceSpec;
        const id = `${baseId}_t${spec.themeIndex + 1}_n${String(nodeIndex + 1).padStart(2, '0')}`;
        const optionClusterId = `cluster:${baseId}:theme:${theme.id}`;
        const node = passiveNode(theme, { ...spec, id, point, optionClusterId, expansionGroupId: baseId }, state.names);
        node.visualPattern = placement.layout.id;
        node.expansionRole = 'backbone-bundle';
        node.expansionZone = config.expansionZone;
        state.tree.nodes.push(node);
        state.occupied.push(point);
        addNodeToGrid(state.nodeGrid, node);
        addNodeToGrid(state.expansionNodeGrid, node);
        state.nodeById.set(id, node);
        state.neighbors.set(id, new Set());
        nodes.push(node);
    });
    placement.layout.edges.forEach(([left, right]) => addEdge(state, nodes[left].id, nodes[right].id));
    placement.layout.entryIndices.forEach(index => addEdge(state, config.attachId, nodes[index].id));
    state.usedTips.add(String(config.attachId));
    state.patternCounts.set(placement.layout.id, (state.patternCounts.get(placement.layout.id) || 0) + 1);
    state.clusterCount += 1;
    return { anchorId: String(config.attachId), nodes, angle: placement.angle };
}

function themeFromTuple(tuple, sector) {
    const primary = tuple[2][0];
    const cat = ['mystique', 'devotion', 'cycle'].includes(primary) ? primary : tuple[0];
    return { id: `${sector.id}_${tuple[0]}`, label: tuple[1], stats: tuple[2], cat,
        icon: sector.icon, archetype: tuple[0] };
}

function expansionTheme(theme) {
    if (theme.id === 'universal_summon') {
        return { ...theme, stats: ['summonPctDmg', 'summonEfficiency'], forceMajor: true,
            archetype: theme.archetype || theme.cat || theme.id };
    }
    if (theme.id === 'occultist_summon') return { ...theme, forceMajor: true };
    return { ...theme, archetype: theme.archetype || theme.cat || theme.id };
}

function nodeRadius(node) {
    return Math.hypot(Number(node.x) || 0, Number(node.y) || 0);
}

function localDensity(state, node, radius = 280) {
    return state.occupied.filter(point => point !== node && Math.hypot(point.x - node.x, point.y - node.y) <= radius).length;
}

function isEligibleRootAnchor(state, node, config) {
    const id = String(node.id);
    const allowedIds = config.anchorPool === 'backbone' ? state.backboneIds : state.corridorIds;
    if (!allowedIds.has(id) || state.usedTips.has(id)) return false;
    if (['start', 'void', 'keystone', 'quatrefoil'].includes(node.type)) return false;
    if (node.activationRequirement || node.intentionalNoEffect) return false;
    const hasExistingBranch = [...(state.baseNeighbors.get(id) || [])].some(neighbor => state.bundleIds.has(neighbor));
    const radius = nodeRadius(node);
    return !hasExistingBranch && radius >= config.minRadius && radius <= config.maxRadius;
}

function rootAnchorCandidates(state, config) {
    const scoreNode = node => {
        const anglePenalty = angleDistance(pointAngle(node), config.angle) * 16;
        const radiusPenalty = Math.abs(nodeRadius(node) - config.targetRadius) * 0.18;
        const densityPenalty = localDensity(state, node) * 24;
        const rootSpacingPenalty = state.rootAnchors.some(root => Math.hypot(root.x - node.x, root.y - node.y) < 220) ? 1800 : 0;
        return anglePenalty + radiusPenalty + densityPenalty + rootSpacingPenalty;
    };
    const eligible = state.tree.nodes.filter(node => isEligibleRootAnchor(state, node, config));
    const narrowed = eligible.filter(node => angleDistance(pointAngle(node), config.angle) <= config.angleWindow);
    return narrowed.sort((left, right) => scoreNode(left) - scoreNode(right));
}

function keystoneCandidatePoints(anchor) {
    const baseAngle = pointAngle(anchor);
    const offsets = [0, 15, -15, 30, -30, 45, -45, 60, -60, 90, -90];
    const gaps = [90, 115, 145, 180, 220];
    return offsets.flatMap(offset => gaps.map(gap => {
        const radians = (baseAngle + offset) * Math.PI / 180;
        return { point: { x: Math.round((anchor.x + Math.cos(radians) * gap) * 100) / 100,
            y: Math.round((anchor.y + Math.sin(radians) * gap) * 100) / 100 }, offset, gap };
    }));
}

function findStandaloneKeystonePlacement(state, config) {
    const anchors = rootAnchorCandidates(state, { ...config, anchorPool: 'corridor', angleWindow: 58,
        minRadius: 520, maxRadius: 2300 });
    for (const anchor of anchors) {
        const candidates = keystoneCandidatePoints(anchor).filter(candidate => {
            const point = candidate.point, segment = [anchor, point], radius = nodeRadius(point);
            if (radius < nodeRadius(anchor) + 40 || radius > MAX_EXPANSION_RADIUS) return false;
            if (!isClear([point], state.nodeGrid) || !respectsNodeClearance([point], state, anchor.id)) return false;
            const nearbyAllEdges = nearbySegments(state.segmentGrid, [segment], BASE_EDGE_CLEARANCE);
            const nearbyBaseEdges = nearbySegments(state.baseSegmentGrid, [segment], BASE_EDGE_CLEARANCE);
            return countCrossings([segment], nearbyAllEdges, anchor.id) === 0
                && respectsOriginalEdges([segment], nearbyBaseEdges, anchor);
        });
        if (candidates.length > 0) return { anchor, ...candidates[0] };
    }
    return null;
}

function addStandaloneKeystone(state, config) {
    const placement = findStandaloneKeystonePlacement(state, config);
    if (!placement) throw new Error(`뭉치 밖 키스톤 위치를 찾을 수 없습니다: ${config.groupId}`);
    const id = `${PREFIX}${config.groupId}_keystone`;
    const node = keystoneNode(config.definition, config.theme, id, placement.point);
    node.expansionRole = 'keystone-destination';
    state.tree.nodes.push(node);
    state.occupied.push(node);
    addNodeToGrid(state.nodeGrid, node);
    addNodeToGrid(state.expansionNodeGrid, node);
    state.nodeById.set(id, node);
    state.neighbors.set(id, new Set());
    addEdge(state, placement.anchor.id, id);
    state.usedTips.add(String(placement.anchor.id));
    state.rootAnchors.push(placement.anchor);
}

function addRootCluster(state, config) {
    const patternIndex = Number.isInteger(config.patternIndex) ? config.patternIndex : state.clusterCount;
    const candidates = rootAnchorCandidates(state, { anchorPool: 'corridor', angleWindow: 34,
        minRadius: 520, maxRadius: 2350, ...config });
    for (const anchor of candidates) {
        const record = addCluster(state, { ...config, patternIndex, attachId: anchor.id });
        if (!record) continue;
        state.rootAnchors.push(anchor);
        config.keystoneEntries.forEach(entry => state.pendingKeystones.push({
            groupId: `${config.groupId}_${entry.themeId}`, definition: entry.definition,
            theme: config.themes.find(theme => theme.id === entry.themeId) || config.themes[0],
            angle: entry.angle ?? config.angle, targetRadius: Math.max(1750, config.targetRadius)
        }));
        return record;
    }
    throw new Error(`비어 있는 뼈대 길목에 신규 뭉치를 연결할 수 없습니다: ${config.groupId}`);
}

function keyEntry(themeId, definition, angle) {
    return { themeId, definition, angle };
}

function classGroupThemes(sector, groupIndex) {
    const classThemes = sector.themes.map(tuple => themeFromTuple(tuple, sector));
    const specialThemes = SPECIAL_THEME_ASSIGNMENTS[sector.id]
        .map(themeId => SPECIAL_THEMES.find(theme => theme.id === themeId));
    const themes = CLASS_THEME_GROUPS[groupIndex].map(index => classThemes[index]);
    specialThemes.filter((unused, index) => index % 4 === groupIndex).forEach(theme => themes.push(theme));
    return themes.map(expansionTheme);
}

function clusterKeystoneEntries(themes, sector, groupIndex) {
    const entries = themes.filter(theme => KEYSTONES[theme.id])
        .map(theme => keyEntry(theme.id, KEYSTONES[theme.id], theme.angle ?? sector.angle));
    if (groupIndex === 3) entries.push(keyEntry(`${sector.id}_${sector.themes[9][0]}`,
        KEYSTONES[sector.id], sector.angle));
    return entries;
}

function addClassSector(state, sector, sectorIndex) {
    CLASS_GROUP_PLACEMENTS.forEach((placement, groupIndex) => {
        const themes = classGroupThemes(sector, groupIndex);
        addRootCluster(state, { groupId: `${sector.id}_outer_${groupIndex + 1}`,
            expansionZone: 'class', angle: sector.angle + placement.angleOffset,
            targetRadius: placement.targetRadius, angleWindow: 30, minRadius: 720, maxRadius: 2350,
            patternIndex: CLASS_PATTERN_INDICES[sectorIndex * 4 + groupIndex],
            themes, majorThemeIds: new Set(), keystoneEntries: clusterKeystoneEntries(themes, sector, groupIndex) });
    });
}

function addCenterClusters(state) {
    HYBRID_SECTORS.forEach((sector, sectorIndex) => {
        const themes = sector.themes.map(tuple => expansionTheme(themeFromTuple(tuple, sector)));
        const keyThemeId = themes[themes.length - 1].id;
        addRootCluster(state, { groupId: `${sector.id}_center`, expansionZone: 'center',
            angle: sector.angle, targetRadius: 700, angleWindow: 65, minRadius: 120, maxRadius: 1250,
            patternIndex: CENTER_PATTERN_INDICES[sectorIndex],
            themes, majorThemeIds: new Set([keyThemeId]),
            keystoneEntries: [keyEntry(keyThemeId, KEYSTONES[sector.id], sector.angle)] });
    });
}

function reworkExistingKeystones(tree) {
    const replacements = new Map([
        ['거리의 맹세', ['최후방 사격', '투사체 주력 스킬 사용 시 전투 AI가 가능한 경우 적과 3칸 거리를 유지합니다.\n3칸 이상 떨어진 적에게 주는 투사체 피해가 25% 증폭됩니다.\n인접한 적에게 주는 투사체 피해가 25% 감폭됩니다.']],
        ['그림자 칼날', ['결투의 규율', '살아 있는 적이 1명일 때 근접 피해가 35% 증폭되고 받는 피해가 10% 감폭됩니다.\n살아 있는 적이 2명 이상일 때 근접 피해가 15% 감폭됩니다.']],
        ['지식의 통로', ['몰아의 통로', '채널링 스킬이 같은 대상에게 연속 적중할 때 집중을 얻습니다(최대 6).\n집중 1당 채널링 피해가 7% 증폭됩니다.\n채널 종료, 대상 변경 또는 군중 제어로 중단되면 집중이 초기화됩니다.\n비채널링 스킬 피해가 20% 감폭됩니다.']]
    ]);
    tree.nodes.forEach(node => {
        const replacement = replacements.get(node.name);
        if (!replacement) return;
        [node.name, node.desc] = replacement;
    });
}

function cleanPreviousExpansion(tree) {
    const removed = new Set(tree.nodes.filter(node => [LEGACY_PREFIX, PREFIX]
        .some(prefix => String(node.id).startsWith(prefix))).map(node => String(node.id)));
    tree.nodes = tree.nodes.filter(node => !removed.has(String(node.id)));
    tree.edges = tree.edges.filter(edge => !removed.has(String(edge.a)) && !removed.has(String(edge.b)));
}

function buildExpansion(tree) {
    cleanPreviousExpansion(tree);
    reworkExistingKeystones(tree);
    const topology = classifyPassiveTreeTopology(readJson(BASE_TOPOLOGY_FILE));
    const nodeById = new Map(tree.nodes.map(node => [String(node.id), node]));
    const neighbors = new Map(tree.nodes.map(node => [String(node.id), new Set()]));
    tree.edges.forEach(edge => {
        const left = String(edge.a), right = String(edge.b);
        if (!neighbors.has(left) || !neighbors.has(right)) return;
        neighbors.get(left).add(right);
        neighbors.get(right).add(left);
    });
    const baseSegments = tree.edges.map(edge => ({ aId: String(edge.a), bId: String(edge.b),
        a: nodeById.get(String(edge.a)), b: nodeById.get(String(edge.b)) })).filter(segment => segment.a && segment.b);
    const baseNodeGrid = new Map(), nodeGrid = new Map(), baseSegmentGrid = new Map(), segmentGrid = new Map();
    tree.nodes.forEach(node => { addNodeToGrid(baseNodeGrid, node); addNodeToGrid(nodeGrid, node); });
    baseSegments.forEach(segment => { addSegmentToGrid(baseSegmentGrid, segment); addSegmentToGrid(segmentGrid, segment); });
    const baseNeighbors = new Map([...neighbors].map(([id, entries]) => [id, new Set(entries)]));
    const state = { tree, names: statNames(), occupied: tree.nodes.map(node => ({ x: Number(node.x), y: Number(node.y) })),
        edgeKeys: new Set(tree.edges.map(edge => [String(edge.a), String(edge.b)].sort().join('|'))), clusterCount: 0,
        nodeById, neighbors, baseNeighbors, backboneIds: topology.backboneIds,
        corridorIds: topology.corridorIds, bundleIds: topology.bundleIds,
        usedTips: new Set(), rootAnchors: [], patternCounts: new Map(), pendingKeystones: [],
        baseNodeGrid, nodeGrid, expansionNodeGrid: new Map(), baseSegmentGrid, segmentGrid };
    if (clusterPatternCount() !== 30) throw new Error(`고유 노드 뭉치 모양이 30개가 아닙니다: ${clusterPatternCount()}`);
    addCenterClusters(state);
    CLASS_SECTORS.forEach((sector, sectorIndex) => addClassSector(state, sector, sectorIndex));
    if (state.clusterCount !== 30) throw new Error(`신규 노드 뭉치 수가 30개가 아닙니다: ${state.clusterCount}`);
    state.pendingKeystones.forEach(config => addStandaloneKeystone(state, config));
    return tree;
}

function main() {
    const tree = buildExpansion(readJson(SOURCE_FILE));
    fs.writeFileSync(SOURCE_FILE, `${JSON.stringify(tree, null, 2)}\n`, 'utf8');
    writeRuntimeModule(RUNTIME_FILE, buildRuntimeTree(tree));
    const counts = Object.fromEntries([...new Set(tree.nodes.map(node => node.type))].sort()
        .map(type => [type, tree.nodes.filter(node => node.type === type).length]));
    console.log(JSON.stringify({ nodes: tree.nodes.length, edges: tree.edges.length, counts,
        addedNodes: tree.nodes.filter(node => String(node.id).startsWith(PREFIX)).length,
        keystones: tree.nodes.filter(node => node.type === 'keystone').length }, null, 2));
}

if (require.main === module) main();

module.exports = { buildExpansion, nodeEffects, valueFor };
