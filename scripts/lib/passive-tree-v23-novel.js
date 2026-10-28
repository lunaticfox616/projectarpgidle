'use strict';

// Notables with a rule of their own (2026-10-28 user: "좀 신박한 주요패시브 노드도 좀 많이 있어도 될거같아"): six per class zone, built
// from options the combat code reads (두 배 피해, 강타 여진, 주변 적 수에 따른 피해 감소, 받는 물리 피해 전환, 총 피해만큼 추가 피해,
// 감전된 적 명중 피해 증폭, 추가 투사체, 피해 보정), some with a cost line, and three that wake only with 3 신비/계시/순환 from other
// nodes (activationRequirement, js/passives.js getPassiveNodeActivationState). They go into clusters that had no notable first, then
// take the place of notables the option completion made from catalog bundles.

const { buildGraph } = require('../audit-passive-tree-source');
const { ARCHETYPE_PROFILES } = require('./passive-tree-option-catalog');
const { FIRST_NOTABLE_STEPS, NODE_RADIUS, clearance, hasRoomToGrow, nodeMap } = require('./passive-tree-v23-layout');
const { SPECIAL, ZONE_ATTACK, ZONE_DEFENCE, effectsOf, isAttributeOnly, roleOf, setEffects, zoneOf } = require('./passive-tree-v23-options');

const design = (name, lines, requirement = null) => Object.freeze({ name, lines, requirement });
/** Lines are [stat, value]; the numbers are used as written (no distance scaling), so a hand-made rule reads as designed. */
const NOVEL_NOTABLES = Object.freeze({
    warrior: [
        design('여진의 대지', [['slamPctDmg', 25], ['slamEchoChance', 10]]),
        design('두 번 내려치기', [['meleePctDmg', 20], ['doubleDamageChance', 6]]),
        design('무거운 철퇴', [['physPctDmg', 45], ['aspd', -8]]),
        design('최후의 방진', [['takenDamageReduceWhen2EnemiesPct', 8], ['armorPct', 20]]),
        design('달궈진 갑주', [['physTakenAsFire', 15], ['maxResF', 2]]),
        design('순환하는 투지', [['physPctDmg', 35], ['aspd', 8]], ['cycle', 3])
    ],
    wanderer: [
        design('일대일의 각오', [['takenDamageReduceWhen1EnemyPct', 12], ['deflectChance', 5]]),
        design('급소 노리기', [['critDmg', 30], ['crit', 2]]),
        design('독 바른 칼날', [['poisonChance', 10], ['poisonDamageMultiplierPct', 20]]),
        design('쉼 없는 칼질', [['ds', 6], ['meleePctDmg', 20]]),
        design('바람 같은 발', [['move', 8], ['mobilityCooldownRecovery', 20]]),
        design('들쭉날쭉한 칼날', [['maxDmgRoll', 15], ['minDmgRoll', -10]])
    ],
    archer: [
        design('서리 깃 화살', [['addedColdDamagePct', 8], ['chillEffect', 20]]),
        design('조준 호흡', [['accuracyBonusPct', 15], ['critDmg', 25]]),
        design('꿰뚫는 사수', [['resPen', 6], ['physIgnore', 8]]),
        design('빙결 사냥', [['freezeChance', 5], ['coldPctDmg', 25]]),
        design('갈라지는 시위', [['projectileExtraShots', 1], ['projectilePctDmg', -15]]),
        design('사냥꾼의 여유', [['cooldownRecovery', 15], ['move', 5]])
    ],
    alchemist: [
        design('독의 증류', [['poisonDamageMultiplierPct', 25], ['potionPctDmg', 20]]),
        design('불안정한 촉매', [['igniteChance', 10], ['igniteDamageMultiplierPct', 20]]),
        design('전류 약병', [['shockChance', 10], ['shockedEnemyHitDamageMorePct', 8]]),
        design('두 갈래 원소', [['addedFireDamagePct', 5], ['addedLightDamagePct', 5]]),
        design('중화 피막', [['physTakenAsChaos', 12], ['maxResChaos', 2]]),
        design('고농도 원액', [['potionPctDmg', 45], ['aspd', -8]])
    ],
    occultist: [
        design('심연의 전언', [['addedChaosDamagePct', 8], ['chaosPctDmg', 20]]),
        design('대신 맞는 권속', [['summonGuardRedirectPct', 15], ['summonHpPct', 20]]),
        design('영혼 효율', [['summonEfficiency', 12], ['summonPctDmg', 30]]),
        design('금단의 응시', [['spellPctDmg', 35], ['crit', 2]], ['mystique', 3]),
        design('주문의 메아리', [['spellFlatPct', 20], ['aspd', 6]]),
        design('되살아나는 장막', [['energyShieldPct', 30], ['energyShieldRechargeFaster', 0.4]])
    ],
    cleric: [
        design('성벽의 맹세', [['blockChance', 6], ['blockChanceMax', 3]]),
        design('번개 기도', [['lightPctDmg', 25], ['shockEffect', 15]]),
        design('수호의 군집', [['takenDamageReduceWhen2EnemiesPct', 8], ['energyShieldPct', 20]]),
        design('빛의 심판', [['spellPctDmg', 35], ['resPen', 5]], ['devotion', 3]),
        design('정화의 불꽃', [['addedFireDamagePct', 6], ['elementalPctDmg', 20]]),
        design('완갑의 일격', [['shieldPctDmg', 30], ['flatDmg', 6]])
    ]
});
const PROFILE_NAMES = new Set(Object.values(ARCHETYPE_PROFILES).flat().map(profile => profile.name));

function designRole(entry) {
    const roles = new Set(entry.lines.map(([statId]) => roleOf(statId)));
    return roles.has('D') ? 'D' : roles.has('A') ? 'A' : 'U';
}

/** The role most of these nodes lead with. */
function leadRole(members) {
    const counts = { A: 0, D: 0, U: 0 };
    members.forEach(node => {
        const lead = effectsOf(node)[0], role = lead && roleOf(lead.statId);
        if (role in counts) counts[role] += 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

const isSpecialNode = node => SPECIAL.has(node.cat) || SPECIAL.has(node.archetype) || effectsOf(node).some(effect => SPECIAL.has(effect.statId));

/** A node that can become a notable in place: an option node past the first five steps, not a junction, not a special node. */
function canHostNotable(node, graph, hidden) {
    const id = String(node.id);
    return ['minor', 'assist', 'normal'].includes(node.type) && effectsOf(node).length > 0 && !isAttributeOnly(node) && !isSpecialNode(node)
        && !node.choiceGroup && !hidden.has(id) && (graph.get(id) || []).length <= 3 && (node.distanceFromClassStart || 0) > FIRST_NOTABLE_STEPS;
}

/** Clusters of this zone with no notable, each with its best host (medium nodes first, then the roomiest), nearest first. */
function emptyClusters(tree, graph, nodes, zone) {
    const hidden = new Set(tree.edges.filter(edge => edge.hidden).flatMap(edge => [String(edge.a), String(edge.b)]));
    const clusters = new Map();
    tree.nodes.filter(node => node.optionClusterId && zoneOf(node) === zone).forEach(node => {
        if (!clusters.has(node.optionClusterId)) clusters.set(node.optionClusterId, []);
        clusters.get(node.optionClusterId).push(node);
    });
    return [...clusters.values()].filter(members => !members.some(node => ['major', 'keystone'].includes(node.type)))
        .map(members => ({ members, host: members.filter(node => canHostNotable(node, graph, hidden) && hasRoomToGrow(tree, nodes, node, NODE_RADIUS.major))
            .sort((a, b) => Number(b.type === 'normal') - Number(a.type === 'normal') || clearance(tree, b) - clearance(tree, a)
                || String(a.id).localeCompare(String(b.id)))[0] }))
        .filter(entry => entry.host)
        .sort((a, b) => a.host.distanceFromClassStart - b.host.distanceFromClassStart || String(a.host.id).localeCompare(String(b.host.id)));
}

/** Notables the option completion made from catalog bundles (adjective + noun names), past the class's first notables. */
function bundleNotables(tree, zone, firstIds) {
    return tree.nodes.filter(node => node.type === 'major' && zoneOf(node) === zone && PROFILE_NAMES.has(String(node.optionProfile || ''))
        && !node.activationRequirement && !node.choiceGroup && !isSpecialNode(node) && !firstIds.has(String(node.id))
        && (node.distanceFromClassStart || 0) > FIRST_NOTABLE_STEPS + 2)
        .sort((a, b) => a.distanceFromClassStart - b.distanceFromClassStart || String(a.id).localeCompare(String(b.id)));
}

/** count entries spread evenly through the list (near, middle and far notables alike). */
function spread(list, count) {
    if (count >= list.length) return list;
    return Array.from({ length: count }, (_, index) => list[Math.floor((index + 0.5) * list.length / count)]);
}

/** The node keeps its archetype (its ring keeps one theme); one without an archetype takes the zone's attack or defence. */
function makeNovelNotable(node, zone, entry) {
    node.type = 'major';
    setEffects(node, entry.lines.map(([statId, value]) => ({ statId, value })), `v23-novel:${entry.name}`);
    Object.assign(node, { name: entry.name, statAutoName: false });
    if (!node.archetype) Object.assign(node, { archetype: designRole(entry) === 'D' ? ZONE_DEFENCE[zone] : ZONE_ATTACK[zone] });
    if (entry.requirement) node.activationRequirement = { type: 'special-stat-reserve', statId: entry.requirement[0], minimum: entry.requirement[1] };
}

/** Steps out from the node until the other nodes passed give at least `minimum` of the special, or Infinity (breadth first). */
function stepsToReserve(graph, nodes, node, [statId, minimum]) {
    const start = String(node.id), seen = new Set([start]), queue = [[start, 0]];
    let total = 0;
    for (let index = 0; index < queue.length; index += 1) {
        const [id, steps] = queue[index];
        if (id !== start) total += effectsOf(nodes.get(id)).filter(effect => effect.statId === statId && Number(effect.value) > 0)
            .reduce((sum, effect) => sum + Number(effect.value), 0);
        if (total >= minimum) return steps;
        (graph.get(id) || []).forEach(next => { if (!seen.has(next)) { seen.add(next); queue.push([next, steps + 1]); } });
    }
    return Infinity;
}

/** A notable that wakes with a special goes to the empty cluster where that special is closest, so the condition can be met. */
function placeConditional(tree, graph, nodes, clusters, zone, entry, report) {
    const best = clusters.filter(({ host }) => hasRoomToGrow(tree, nodes, host, NODE_RADIUS.major))
        .map(cluster => ({ cluster, steps: stepsToReserve(graph, nodes, cluster.host, entry.requirement) }))
        .sort((a, b) => a.steps - b.steps || a.cluster.host.distanceFromClassStart - b.cluster.host.distanceFromClassStart)[0];
    if (!best || !Number.isFinite(best.steps)) return false;
    makeNovelNotable(best.cluster.host, zone, entry);
    clusters.splice(clusters.indexOf(best.cluster), 1);
    report.novelAdded.push(`${zone}:${entry.name}:${best.cluster.host.id}`);
    return true;
}

function takeDesign(left, role) {
    const pick = left.find(entry => designRole(entry) === role) || left[0];
    left.splice(left.indexOf(pick), 1);
    return pick;
}

function placeNovelNotables(tree, report) {
    const graph = buildGraph(tree), nodes = nodeMap(tree), firstIds = new Set(report.firstNotables.map(entry => String(entry.id)));
    Object.entries(NOVEL_NOTABLES).forEach(([zone, designs]) => {
        const clusters = emptyClusters(tree, graph, nodes, zone);
        const left = designs.filter(entry => !entry.requirement || !placeConditional(tree, graph, nodes, clusters, zone, entry, report));
        clusters.forEach(({ members, host }) => {
            if (!left.length || !hasRoomToGrow(tree, nodes, host, NODE_RADIUS.major)) return;
            const entry = takeDesign(left, leadRole(members));
            makeNovelNotable(host, zone, entry);
            report.novelAdded.push(`${zone}:${entry.name}:${host.id}`);
        });
        spread(bundleNotables(tree, zone, firstIds), left.length).forEach(node => {
            const entry = takeDesign(left, leadRole([node]));
            makeNovelNotable(node, zone, entry);
            report.novelReplaced.push(`${zone}:${entry.name}:${node.id}`);
        });
        left.forEach(entry => report.novelUnplaced.push(`${zone}:${entry.name}`));
    });
}

module.exports = { NOVEL_NOTABLES, placeNovelNotables };
