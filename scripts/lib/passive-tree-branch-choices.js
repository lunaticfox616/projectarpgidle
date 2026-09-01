'use strict';

const { buildGraph } = require('../audit-passive-tree-source');
const { formatEffect } = require('../complete-passive-tree-options');
const {
    FEATURE_EFFECT_PROFILES, RARE_MAJOR_EFFECTS, normalizeFeaturePassiveValue, scaleFeatureProfileEffects
} = require('./passive-tree-feature-catalog');
const { isIntentionalNoEffectNode } = require('./passive-tree-intent');
const { ARCHETYPE_PROFILES, scalePassiveLine } = require('./passive-tree-option-catalog');
const { ATTRIBUTE_STATS, PATH_ALLOWED_STATS, classifyPassiveTreeTopology } = require('./passive-tree-topology');

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const FEATURE_TYPES = new Set(['normal', 'major']);
const SMALL_TYPES = new Set(['minor', 'assist']);
const SPECIAL_CATS = new Set(['mystique', 'devotion', 'cycle']);

function isProtectedSpecialSmall(node) {
    return SMALL_TYPES.has(node?.type) && SPECIAL_CATS.has(node?.cat);
}

function effectMap(node) {
    return new Map((node.runtimeEffects || []).map(effect => [effect.statId, Number(effect.value)]));
}

function dominatedNode(left, right) {
    const a = effectMap(left), b = effectMap(right);
    if (a.size === 0 || a.size !== b.size || [...a.keys()].some(statId => !b.has(statId))) return null;
    const aWins = [...a].every(([statId, value]) => value >= b.get(statId));
    const bWins = [...b].every(([statId, value]) => value >= a.get(statId));
    if (!aWins && !bWins) return null;
    if (aWins && bWins) return String(left.id).localeCompare(String(right.id)) <= 0 ? right : left;
    return aWins ? right : left;
}

function groupKey(node) {
    if (SMALL_TYPES.has(node.type)) return `small:${node.optionClusterId}:${node.archetype}`;
    return `feature:${node.type}:${node.archetype}`;
}

function addChoiceGroup(groups, rows) {
    if (rows.length < 2) return;
    const sorted = [...rows].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const key = sorted.map(node => String(node.id)).join('|');
    if (!groups.has(key)) groups.set(key, sorted);
}

function isChoiceCandidate(node, topology) {
    return Boolean(node && ACTIONABLE_TYPES.has(node.type)
        && !topology.corridorIds.has(String(node.id))
        && !isIntentionalNoEffectNode(node) && !isProtectedSpecialSmall(node));
}

function choiceGroups(tree, topology) {
    const graph = buildGraph(tree), nodes = new Map(tree.nodes.map(node => [String(node.id), node])), groups = new Map();
    nodes.forEach((junction, junctionId) => {
        if (!ACTIONABLE_TYPES.has(junction.type)) return;
        const outward = (graph.get(junctionId) || []).map(id => nodes.get(id)).filter(node => node
            && ACTIONABLE_TYPES.has(node.type) && Number(node.distanceFromClassStart) > Number(junction.distanceFromClassStart)
            && isChoiceCandidate(node, topology));
        const local = new Map();
        outward.forEach(node => {
            const key = groupKey(node);
            if (!local.has(key)) local.set(key, []);
            local.get(key).push(node);
        });
        local.forEach(rows => addChoiceGroup(groups, rows));
    });
    const clusters = new Map();
    tree.nodes.filter(node => node.optionClusterId && FEATURE_TYPES.has(node.type)
        && isChoiceCandidate(node, topology)).forEach(node => {
        const key = `${node.optionClusterId}:${groupKey(node)}`;
        if (!clusters.has(key)) clusters.set(key, []);
        clusters.get(key).push(node);
    });
    clusters.forEach(rows => addChoiceGroup(groups, rows));
    return [...groups.values()];
}

function firstDominatedPair(nodes) {
    for (let left = 0; left < nodes.length; left += 1) {
        for (let right = left + 1; right < nodes.length; right += 1) {
            const dominated = dominatedNode(nodes[left], nodes[right]);
            if (dominated) return { dominated, other: dominated === nodes[left] ? nodes[right] : nodes[left] };
        }
    }
    return null;
}

function topologyAllowsEffects(node, effects, topology) {
    if (SPECIAL_CATS.has(node.cat)) return true;
    if (topology.corridorIds.has(String(node.id))) {
        return effects.every(effect => PATH_ALLOWED_STATS.has(effect.statId));
    }
    return effects.every(effect => !ATTRIBUTE_STATS.has(effect.statId));
}

function smallCandidates(node, topology) {
    const fallback = node.archetype === 'atk' && /archer|reticle|projectile|bow|crossbow|quiver/i.test(String(node.id))
        ? 'projectile' : node.archetype;
    const profiles = ARCHETYPE_PROFILES[fallback] || [];
    return profiles.flatMap(profile => profile.lines.filter(line => !line.majorOnly).map((line, lineIndex) => ({
        profileId: profile.name, name: profile.name, lineIndex,
        effects: [scalePassiveLine(line, node.type, node.powerBand)]
            .map(effect => ({ ...effect, value: normalizeFeaturePassiveValue(effect.statId, effect.value, node.type) }))
    }))).filter(candidate => topologyAllowsEffects(node, candidate.effects, topology))
        .sort((a, b) => Number(b.profileId === node.optionProfile) - Number(a.profileId === node.optionProfile)
        || b.lineIndex - a.lineIndex || a.profileId.localeCompare(b.profileId));
}

function featureCandidates(node, topology) {
    if (SPECIAL_CATS.has(node.cat)) return [];
    const profiles = FEATURE_EFFECT_PROFILES[node.archetype]?.[node.type] || [];
    return profiles.map(profile => {
        const effects = scaleFeatureProfileEffects(profile, node);
        const rare = RARE_MAJOR_EFFECTS[String(node.id)];
        if (rare) effects.push({ statId: rare[0], value: rare[1] });
        return { profileId: `feature:${profile.id}`, name: node.name, effects };
    }).filter(candidate => topologyAllowsEffects(node, candidate.effects, topology));
}

function candidateFits(candidate, node, siblings) {
    const trial = { ...node, runtimeEffects: candidate.effects };
    return siblings.every(sibling => sibling === node || !dominatedNode(trial, sibling));
}

function applyCandidate(node, candidate) {
    const before = { name: node.name, optionProfile: node.optionProfile, runtimeEffects: structuredClone(node.runtimeEffects) };
    node.name = candidate.name;
    node.optionProfile = candidate.profileId;
    node.runtimeEffects = candidate.effects.map(effect => ({ ...effect }));
    node.mods = node.runtimeEffects.map(effect => ({ ...effect }));
    node.desc = node.runtimeEffects.map(formatEffect).join('\n');
    return { id: String(node.id), type: node.type, cat: node.cat, before, after: {
        name: node.name, optionProfile: node.optionProfile, runtimeEffects: structuredClone(node.runtimeEffects)
    } };
}

function refineChoiceGroup(nodes, changes, topology) {
    const blocked = new Set();
    for (let attempts = 0; attempts < nodes.length * 4; attempts += 1) {
        const pair = firstDominatedPair(nodes.filter(node => !blocked.has(String(node.id))));
        if (!pair) return;
        const candidates = SMALL_TYPES.has(pair.dominated.type)
            ? smallCandidates(pair.dominated, topology) : featureCandidates(pair.dominated, topology);
        const candidate = candidates.find(row => candidateFits(row, pair.dominated, nodes));
        if (!candidate) {
            blocked.add(String(pair.dominated.id));
            continue;
        }
        changes.push(applyCandidate(pair.dominated, candidate));
    }
}

function auditShortBranchChoices(tree, topology = classifyPassiveTreeTopology(tree)) {
    const rows = choiceGroups(tree, topology).flatMap(nodes => {
        const pair = firstDominatedPair(nodes);
        return pair ? [{ ids: nodes.map(node => String(node.id)), dominatedId: String(pair.dominated.id),
            effects: nodes.map(node => node.runtimeEffects || []) }] : [];
    });
    return { count: rows.length, rows };
}

function refineShortBranchChoices(tree, topology = classifyPassiveTreeTopology(tree)) {
    const before = auditShortBranchChoices(tree, topology), changes = [];
    for (let pass = 0; pass < 8; pass += 1) {
        const changeCount = changes.length;
        choiceGroups(tree, topology).forEach(nodes => refineChoiceGroup(nodes, changes, topology));
        if (auditShortBranchChoices(tree, topology).count === 0 || changes.length === changeCount) break;
    }
    return { before, after: auditShortBranchChoices(tree, topology), changes };
}

module.exports = { auditShortBranchChoices, isProtectedSpecialSmall, refineShortBranchChoices };
