'use strict';

const { formatEffect, stableHash, zoneForPosition } = require('../complete-passive-tree-options');
const { normalizeFeaturePassiveValue } = require('./passive-tree-feature-catalog');
const { visualBundleAudit } = require('./passive-tree-clusters');
const { simpleEffectName } = require('./passive-tree-naming');
const { isPreservedMajorNode } = require('./passive-tree-intent');
const { ARCHETYPE_PROFILES, scalePassiveLine } = require('./passive-tree-option-catalog');
const {
    ATTRIBUTE_STATS, PATH_ALLOWED_STATS, SPECIAL_CATEGORIES, classifyPassiveTreeTopology
} = require('./passive-tree-topology');

const FEATURE_TYPES = new Set(['normal', 'major']);
const SMALL_TYPES = new Set(['minor', 'assist']);
const BUNDLE_PALETTES = Object.freeze({
    archer: ['projectile', 'evasion', 'physical', 'cold'],
    alchemist: ['potion', 'ailment', 'elemental', 'evasion', 'energyShield'],
    occultist: ['spell', 'chaos', 'energyShield', 'summon'],
    cleric: ['shield', 'energyShield', 'spell', 'elemental', 'armor'],
    warrior: ['melee', 'physical', 'armor'],
    wanderer: ['melee', 'evasion', 'physical', 'ailment']
});
const PATH_ARCHETYPES = Object.freeze({
    archer: ['dexterity'], alchemist: ['dexterity', 'intelligence'], occultist: ['intelligence'],
    cleric: ['strength', 'intelligence'], warrior: ['strength'], wanderer: ['dexterity']
});
const BUNDLE_THEMES = new Set(Object.values(BUNDLE_PALETTES).flat());
const ATTRIBUTE_CATEGORIES = new Set(['str', 'dex', 'int', 'strength', 'dexterity', 'intelligence']);
const PATH_CATEGORIES = Object.freeze({ strength: 'str', dexterity: 'dex', intelligence: 'int' });

function groupNodesByCluster(tree) {
    const groups = new Map();
    tree.nodes.forEach(node => {
        if (!node.optionClusterId) return;
        if (!groups.has(node.optionClusterId)) groups.set(node.optionClusterId, []);
        groups.get(node.optionClusterId).push(node);
    });
    return groups;
}

function groupCenter(nodes) {
    const total = nodes.reduce((sum, node) => ({ x: sum.x + Number(node.x), y: sum.y + Number(node.y) }),
        { x: 0, y: 0 });
    return { x: total.x / nodes.length, y: total.y / nodes.length };
}

function dominantBundleTheme(nodes) {
    const scores = new Map();
    nodes.filter(node => BUNDLE_THEMES.has(node.archetype)).forEach(node => {
        const weight = FEATURE_TYPES.has(node.type) ? 4 : 1;
        scores.set(node.archetype, (scores.get(node.archetype) || 0) + weight);
    });
    return [...scores].sort((left, right) => right[1] - left[1]
        || String(left[0]).localeCompare(String(right[0])))[0]?.[0] || null;
}

function dominantBundleCategory(nodes) {
    const counts = new Map();
    nodes.filter(node => node.cat && !ATTRIBUTE_CATEGORIES.has(node.cat) && !SPECIAL_CATEGORIES.has(node.cat))
        .forEach(node => counts.set(node.cat, (counts.get(node.cat) || 0) + (FEATURE_TYPES.has(node.type) ? 4 : 1)));
    return [...counts].sort((left, right) => right[1] - left[1]
        || String(left[0]).localeCompare(String(right[0])))[0]?.[0] || null;
}

function fallbackBundleTheme(clusterId, nodes) {
    const center = groupCenter(nodes), zone = zoneForPosition(center.x, center.y);
    const palette = BUNDLE_PALETTES[zone];
    return palette[stableHash(`${clusterId}:${zone}`) % palette.length];
}

function bundleThemes(groups) {
    return new Map([...groups].map(([clusterId, nodes]) => {
        const archetype = dominantBundleTheme(nodes) || fallbackBundleTheme(clusterId, nodes);
        return [clusterId, { archetype, category: dominantBundleCategory(nodes) || archetype }];
    }));
}

function pathArchetype(node) {
    const zone = zoneForPosition(node.x, node.y), candidates = PATH_ARCHETYPES[zone];
    return candidates[stableHash(`${node.id}:${zone}:path`) % candidates.length];
}

function hasAttributeEffect(node) {
    return (node.runtimeEffects || []).some(effect => ATTRIBUTE_STATS.has(effect.statId));
}

function hasNonPathEffect(node) {
    return (node.runtimeEffects || []).some(effect => !PATH_ALLOWED_STATS.has(effect.statId));
}

function shouldRetheme(node, topology) {
    const id = String(node.id);
    if (topology.corridorIds.has(id)) return hasNonPathEffect(node);
    if (topology.reducedSpecialIds.has(id)) return true;
    if (isPreservedMajorNode(node)) return false;
    if (topology.preservedSpecialIds.has(id)) return false;
    return ATTRIBUTE_STATS.has(node.archetype) || hasAttributeEffect(node);
}

function profileLines(archetype, allowedStats) {
    const profiles = ARCHETYPE_PROFILES[archetype];
    if (!profiles) throw new Error(`패시브 소형 효과 프로필이 없습니다: ${archetype}`);
    const lines = profiles.flatMap(profile => profile.lines).filter(line =>
        !line.majorOnly && allowedStats(line.statId));
    const unique = new Map(lines.map(line => [`${line.statId}:${line.value}`, line]));
    return [...unique.values()];
}

function selectSmallLine(node, archetype, role, usage) {
    const allowed = role === 'corridor'
        ? statId => PATH_ALLOWED_STATS.has(statId)
        : statId => !ATTRIBUTE_STATS.has(statId);
    const lines = profileLines(archetype, allowed), start = stableHash(`${node.id}:${archetype}:${role}`) % lines.length;
    return lines.map((line, index) => ({ line, index, used: usage.get(line.statId) || 0 }))
        .sort((left, right) => left.used - right.used
            || (left.index - start + lines.length) % lines.length - (right.index - start + lines.length) % lines.length)[0].line;
}

function replaceSmallEffect(node, archetype, role, usage) {
    const line = selectSmallLine(node, archetype, role, usage);
    const scaled = scalePassiveLine(line, node.type, Number(node.powerBand) || 0);
    const effect = { ...scaled, value: normalizeFeaturePassiveValue(scaled.statId, scaled.value, node.type) };
    usage.set(effect.statId, (usage.get(effect.statId) || 0) + 1);
    node.runtimeEffects = [effect];
    node.mods = [{ ...effect }];
    node.desc = formatEffect(effect);
    node.name = simpleEffectName(effect);
    node.statAutoName = true;
    node.optionProfile = `topology:${role}:${archetype}:${effect.statId}`;
}

function clearSpecialMetadata(node) {
    ['effectArchetype', 'specialVariation', 'specialSynergyClass', 'activationRequirement'].forEach(key => delete node[key]);
}

function applyRetheme(node, archetype, category, role, usage, report) {
    const before = { cat: node.cat, archetype: node.archetype, effects: structuredClone(node.runtimeEffects || []) };
    node.cat = category;
    node.archetype = archetype;
    clearSpecialMetadata(node);
    if (SMALL_TYPES.has(node.type)) replaceSmallEffect(node, archetype, role, usage);
    if (FEATURE_TYPES.has(node.type)) node.topologyRethemed = true;
    report.changes.push({ id: String(node.id), type: node.type, role, before,
        after: { cat: node.cat, archetype: node.archetype, effects: structuredClone(node.runtimeEffects || []) } });
}

function dominantCategory(nodes) {
    const counts = new Map();
    nodes.forEach(node => counts.set(node.cat, (counts.get(node.cat) || 0) + 1));
    return [...counts].sort((left, right) => right[1] - left[1]
        || String(left[0]).localeCompare(String(right[0])))[0];
}

function dominantArchetype(nodes, category) {
    const counts = new Map();
    nodes.filter(node => node.cat === category && BUNDLE_THEMES.has(node.archetype)).forEach(node => {
        counts.set(node.archetype, (counts.get(node.archetype) || 0) + (FEATURE_TYPES.has(node.type) ? 4 : 1));
    });
    return [...counts].sort((left, right) => right[1] - left[1]
        || String(left[0]).localeCompare(String(right[0])))[0]?.[0] || null;
}

function harmonizeVisualBundles(tree, topology, usageByGroup, report) {
    const audit = visualBundleAudit(tree), changed = new Set();
    audit.bundles.forEach(bundle => {
        if (bundle.ids.some(id => topology.corridorIds.has(id) || topology.preservedSpecialIds.has(id))) return;
        const nodes = bundle.ids.map(id => topology.nodes.get(id));
        const [category, count] = dominantCategory(nodes);
        if (count * 2 <= nodes.length) return;
        const archetype = dominantArchetype(nodes, category);
        if (!archetype) return;
        nodes.filter(node => node.cat !== category && !SPECIAL_CATEGORIES.has(node.cat)
            && !isPreservedMajorNode(node)).forEach(node => {
            const id = String(node.id);
            if (changed.has(id)) return;
            const usageKey = `bundle:${node.optionClusterId}:${archetype}:harmonized`;
            if (!usageByGroup.has(usageKey)) usageByGroup.set(usageKey, new Map());
            applyRetheme(node, archetype, category, 'bundle', usageByGroup.get(usageKey), report);
            changed.add(id);
        });
    });
}

function redesignPassiveTopology(tree) {
    const topology = classifyPassiveTreeTopology(tree), groups = groupNodesByCluster(tree), themes = bundleThemes(groups);
    const usageByGroup = new Map(), report = { changes: [] };
    tree.nodes.filter(node => SMALL_TYPES.has(node.type) || FEATURE_TYPES.has(node.type)).sort((left, right) =>
        String(left.optionClusterId).localeCompare(String(right.optionClusterId)) || String(left.id).localeCompare(String(right.id)))
        .forEach(node => {
            if (!shouldRetheme(node, topology)) return;
            const role = topology.corridorIds.has(String(node.id)) ? 'corridor' : 'bundle';
            const theme = role === 'corridor'
                ? { archetype: pathArchetype(node) } : themes.get(node.optionClusterId);
            const archetype = theme.archetype, category = role === 'corridor' ? PATH_CATEGORIES[archetype] : theme.category;
            const usageKey = `${role}:${node.optionClusterId}:${archetype}`;
            if (!usageByGroup.has(usageKey)) usageByGroup.set(usageKey, new Map());
            applyRetheme(node, archetype, category, role, usageByGroup.get(usageKey), report);
        });
    harmonizeVisualBundles(tree, topology, usageByGroup, report);
    const specialBefore = topology.specialComponents.reduce((sum, component) => sum + component.ids.length, 0);
    const changedIds = new Set(report.changes.map(change => change.id));
    report.summary = {
        backboneNodes: topology.backboneIds.size, corridorNodes: topology.corridorIds.size,
        bundleNodes: topology.bundleIds.size,
        rethemedNodes: changedIds.size,
        rethemedAttributes: new Set(report.changes.filter(change => change.before.effects.some(effect =>
            ATTRIBUTE_STATS.has(effect.statId))).map(change => change.id)).size,
        specialBefore, specialAfter: topology.preservedSpecialIds.size,
        reducedSpecialNodes: topology.reducedSpecialIds.size
    };
    return { topology, report };
}

module.exports = { BUNDLE_PALETTES, PATH_ARCHETYPES, redesignPassiveTopology };
