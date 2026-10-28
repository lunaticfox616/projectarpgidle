'use strict';

// Polish half of the v23 skill tree rework (2026-10-28, second goal). The user's words: 치명적 행군 and 먼거리 진군 gave plain 피해;
// small nodes off the roads become medium nodes with options, and so do most gateways to notables; flat energy shield is raised and
// made rare; energy shield %, evasion % and armour % are raised and levelled; single-option 신비/계시/순환 small nodes are cut to six each
// (the same day's third goal: never 0, never merged into other nodes), and 사중합일's bar falls with the 신비 total. Values still go
// through the catalog scaling (scalePassiveLine).

const { buildGraph, graphDistances, isIntendedSpecial } = require('../audit-passive-tree-source');
const { stableHash } = require('../complete-passive-tree-options');
const { ARCHETYPE_PROFILES, STAT_META, scalePassiveLine } = require('./passive-tree-option-catalog');
const { visualBundleAudit } = require('./passive-tree-clusters');
const { FIRST_NOTABLE_STEPS, NODE_RADIUS, hasRoomToGrow: hasRoom, nodeMap } = require('./passive-tree-v23-layout');
const { placeNovelNotables } = require('./passive-tree-v23-novel');
const { LIFTED_POWER, SPECIAL, WEAK_POWER, ZONE_ATTACK, bandOf, createContext, effectsOf, isAttributeOnly, line, nodePower,
    roleOf, setEffects, zoneOf } = require('./passive-tree-v23-options');

/** Words in a node's name and the option they promise; the first match wins (심장 before the archer words). */
const NAME_THEMES = Object.freeze([
    [/치명/, 'crit'], [/심장/, 'critDmg'],
    [/궤적|시위|탄도|화살|먼거리|정조준|꿰뚫는|매의|추적|사냥꾼/, 'projectilePctDmg'],
    [/칼끝|절개|연격|보법/, 'meleePctDmg'], [/강타|진동|충격/, 'slamPctDmg'],
    [/파쇄|상흔|격돌|완력|혈맥|거체/, 'physPctDmg'], [/주문|술식|지식|통찰/, 'spellPctDmg'],
    [/심연|침식|독기|왜곡/, 'chaosPctDmg'], [/병증|감염|상처/, 'ailmentDamagePct'],
    [/시약|혼합|증류|변성/, 'potionPctDmg'], [/불씨|작열|화로/, 'firePctDmg'], [/서리|빙결|설화/, 'coldPctDmg'],
    [/뇌광|전류|낙뢰/, 'lightPctDmg'], [/조율|촉매|공명/, 'elementalPctDmg']
]);
/** Crit lines are worth more per number than damage lines: a notable's 피해 30 becomes 치명타 확률 4 (at most 5). */
const THEME_VALUE = Object.freeze({ crit: value => Math.min(5, value * 4 / 30), critDmg: value => Math.min(40, value) });
const DEFENCE_PERCENTS = new Set(['energyShieldPct', 'evasionPct', 'armorPct']);
/** One table for 에너지 보호막 %, 회피 % and 방어도 % (old medians: small 4, medium 8, a notable's first line 30 and its other lines 17),
 * +5% per value band like every catalog line. */
const DEFENCE_PERCENT_BASE = Object.freeze({ minor: 6, assist: 7, normal: 10, majorLead: 36, major: 18 });
/** Flat energy shield stays only on medium nodes and notables that already had it, at these values (+5% per band; old medians 22 and 52). */
const FLAT_ENERGY_SHIELD = Object.freeze({ normal: 40, major: 90 });

const isSmall = node => node.type === 'minor' || node.type === 'assist';
const hasStat = (node, statId) => effectsOf(node).some(effect => effect.statId === statId);

// ── names that promise a theme ───────────────────────────────────────────────────────────────────────────────────────────────────
function themeStatFor(node) {
    const taken = new Set(effectsOf(node).map(effect => effect.statId));
    const named = NAME_THEMES.filter(([pattern]) => pattern.test(String(node.name || ''))).map(([, statId]) => statId);
    return [...named, `${ZONE_ATTACK[zoneOf(node)]}PctDmg`, 'elementalPctDmg'].find(statId => !taken.has(statId) && STAT_META[statId]);
}

/** Notables were authored with 피해 at the size of a kind of damage (scripts/lib/passive-tree-major-design.js), so they keep the number;
 * catalog lines convert at the catalog's rate (피해 3 is worth a kind of damage 5). */
function themedValue(context, node, statId, value) {
    if (THEME_VALUE[statId]) return THEME_VALUE[statId](value);
    if (node.type === 'major') return value;
    return value * (context.base.get(statId) || 5) / (context.base.get('pctDmg') || 3);
}

/** Plain 피해 becomes the damage the node's name or zone promises (rune nodes with 보조스킬룬 한도 keep theirs). */
function rethemeGenericDamage(tree, context, report) {
    tree.nodes.filter(node => hasStat(node, 'pctDmg') && !effectsOf(node).some(effect => roleOf(effect.statId) === 'P')).forEach(node => {
        const statId = themeStatFor(node);
        setEffects(node, effectsOf(node).map(effect => (effect.statId === 'pctDmg'
            ? { statId, value: themedValue(context, node, statId, Number(effect.value)) } : effect)));
        if (isSmall(node)) node.name = STAT_META[statId][0];
        report.rethemed.push(String(node.id));
    });
}

// ── catalog bundles for medium nodes ───────────────────────────────────────────────────────────────────────────────────────────────
const usableBundle = profile => profile.lines.length > 1 && profile.lines.every(item => !item.majorOnly && !item.fixed
    && item.statId !== 'energyShield' && item.statId !== 'pctDmg');

/** The bundle a small node grows into: one with its own option first, then one of the same kind, avoiding its neighbours' bundles. */
function bundleFor(node, archetype, neighborNames) {
    const statId = effectsOf(node)[0].statId, role = roleOf(statId), seed = stableHash(String(node.id));
    const profiles = ARCHETYPE_PROFILES[archetype].filter(usableBundle);
    return profiles.map((profile, index) => ({ profile, order: (index + seed) % profiles.length,
        rank: profile.lines.some(item => item.statId === statId) ? 0 : roleOf(profile.lines[0].statId) === role ? 1 : 2 }))
        .sort((a, b) => a.rank - b.rank || Number(neighborNames.has(a.profile.name)) - Number(neighborNames.has(b.profile.name)) || a.order - b.order)[0]
        .profile;
}

function bundleArchetype(node) {
    return [node.archetype, node.cat].find(key => !SPECIAL.has(key) && (ARCHETYPE_PROFILES[key] || []).some(usableBundle)) || null;
}

/** The node keeps its archetype, so a ring keeps its one theme (visualBundleAudit). */
function growToMedium(node, profile) {
    node.type = 'normal';
    setEffects(node, profile.lines.map(item => scalePassiveLine(item, 'normal', bandOf(node))), `v23-medium:${profile.name}`);
    Object.assign(node, { name: profile.name, statAutoName: false });
}

// ── single-option 신비/계시/순환 small nodes ────────────────────────────────────────────────────────────────────────────────────────
const isSpecialSingle = node => isSmall(node) && effectsOf(node).length === 1 && SPECIAL.has(effectsOf(node)[0].statId);
/** Single-option small nodes left per special, each still +1 (2026-10-28 user: "각각 6개정도", never 0 and never merged into other
 * nodes, which raised them too far). */
const SPECIAL_SMALLS_KEPT = 6;

/** The cluster's plain theme for the special nodes that give up the special option: its most common plain archetype, or null when every
 * node of the cluster is special. */
function clusterArchetype(tree, clusterId) {
    const counts = new Map();
    tree.nodes.filter(other => other.optionClusterId === clusterId && bundleArchetype(other))
        .forEach(other => counts.set(bundleArchetype(other), (counts.get(bundleArchetype(other)) || 0) + 1));
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || null;
}

/** Words in a keystone's rule text that name the special it uses (계시 is 헌신's name in rule text). */
const SPECIAL_WORDS = Object.freeze({ mystique: /신비/, devotion: /계시|헌신/, cycle: /순환/ });

/** Steps from the nearest place that uses this special: a notable that wakes with it (activationRequirement) or a keystone whose rule
 * names it (단일 해석, 삼중 계시, 역행 순환 and the like). */
function anchorSteps(tree, graph, statId) {
    const anchors = tree.nodes.filter(node => (node.activationRequirement && node.activationRequirement.statId === statId)
        || (node.type === 'keystone' && SPECIAL_WORDS[statId].test(`${node.name || ''} ${node.desc || ''}`))).map(node => String(node.id));
    return graphDistances(graph, anchors);
}

/** The nodes that stay: one per cluster in turn, the cluster nearest a place that uses the special first and its nearest node first, so
 * the six sit where they are wanted and still spread over several clusters. */
function pickKept(singles, count, steps) {
    const clusters = new Map(), far = Number.MAX_SAFE_INTEGER, stepOf = node => steps.get(String(node.id)) ?? far;
    [...singles].sort((a, b) => stepOf(a) - stepOf(b) || a.distanceFromClassStart - b.distanceFromClassStart || String(a.id).localeCompare(String(b.id))).forEach(node => {
        const key = node.optionClusterId || `node:${node.id}`;
        if (!clusters.has(key)) clusters.set(key, []);
        clusters.get(key).push(node);
    });
    const queues = [...clusters.values()], kept = [];
    for (let round = 0; kept.length < count && queues.some(queue => queue.length > round); round++) {
        queues.forEach(queue => { if (kept.length < count && queue[round]) kept.push(queue[round]); });
    }
    return kept;
}

/** A special has fewer than six (순환 had 4): plain option small nodes right next to its nodes, inside its zone, take one point of it. */
function addSpecialSmalls(tree, graph, statId, count) {
    const holders = new Set(tree.nodes.filter(node => hasStat(node, statId)).map(node => String(node.id)));
    return tree.nodes.filter(node => isSmall(node) && effectsOf(node).length === 1 && !isAttributeOnly(node) && !SPECIAL.has(effectsOf(node)[0].statId)
        && !SPECIAL.has(node.cat) && (node.distanceFromClassStart || 0) > FIRST_NOTABLE_STEPS
        && (graph.get(String(node.id)) || []).some(id => holders.has(id)) && isIntendedSpecial({ ...node, cat: statId }))
        .sort((a, b) => a.distanceFromClassStart - b.distanceFromClassStart || String(a.id).localeCompare(String(b.id)))
        .slice(0, count).map(node => {
            setEffects(node, [{ statId, value: 1 }], `v23-special:${statId}`);
            return Object.assign(node, { name: STAT_META[statId][0], statAutoName: true, cat: statId, archetype: statId });
        });
}

/** A special node that gives up its special option takes its cluster's plain theme; in a ring of only special nodes it keeps the special
 * theme and takes one of the special bundles' second options (지속 피해, 중독 확률, 치명타 and the like). */
function makePlainSmall(tree, node, statId) {
    const archetype = clusterArchetype(tree, node.optionClusterId), seed = stableHash(String(node.id));
    if (!archetype) {
        const seconds = ARCHETYPE_PROFILES[statId].filter(profile => profile.lines.length > 1 && profile.lines[1].statId !== 'pctDmg').map(profile => profile.lines[1]);
        const pick = seconds[seed % seconds.length];
        setEffects(node, [scalePassiveLine(pick, node.type, bandOf(node))], `v23-plain:${statId}`);
        return Object.assign(node, { name: STAT_META[pick.statId][0], statAutoName: true });
    }
    const profiles = ARCHETYPE_PROFILES[archetype].filter(usableBundle), lead = profiles[seed % profiles.length].lines[0];
    setEffects(node, [scalePassiveLine(lead, node.type, bandOf(node))], `v23-plain:${archetype}`);
    return Object.assign(node, { name: STAT_META[lead.statId][0], statAutoName: true, archetype, cat: archetype });
}

function neighborNamesOf(graph, nodes, node) {
    return new Set((graph.get(String(node.id)) || []).map(id => nodes.get(id).name).filter(Boolean));
}

/** Six single-option nodes per special stay as they are; the others give their cluster's option instead (the medium node pass may grow
 * them later), and a special with fewer than six gets the rest from plain neighbours. No special point moves into another node. */
function thinSpecialSmalls(tree, report) {
    const graph = buildGraph(tree);
    [...SPECIAL].forEach(statId => {
        const singles = tree.nodes.filter(node => isSpecialSingle(node) && effectsOf(node)[0].statId === statId);
        const kept = pickKept(singles, SPECIAL_SMALLS_KEPT, anchorSteps(tree, graph, statId));
        singles.filter(node => !kept.includes(node)).forEach(node => makePlainSmall(tree, node, statId));
        const added = addSpecialSmalls(tree, graph, statId, SPECIAL_SMALLS_KEPT - kept.length);
        report.specialSmalls.push({ statId, before: singles.length, kept: kept.length, added: added.map(node => String(node.id)) });
    });
}

/** 사중합일 wakes when 힘, 민첩, 지능 and 신비 are exactly equal and each at least this much. 신비 comes only from the tree, so after the
 * cut above the bar falls to what the same points buy: 20 cost 19 to 22 points past the keystone in the live tree, 14 costs 18 to 21
 * here. js/combat.js (omniscientActive) holds the same number. */
const FOURFOLD_UNITY_MINIMUM = 14;

function fitFourfoldUnity(tree) {
    const keystone = tree.nodes.find(node => node.keystoneTemplateId === 'mystique_fourfold_unity');
    keystone.desc = keystone.desc.replace(/각각 \d+ 이상이면/, `각각 ${FOURFOLD_UNITY_MINIMUM} 이상이면`);
}

// ── gateways and rings become medium nodes ─────────────────────────────────────────────────────────────────────────────────────────
/** Option small nodes next to a notable or keystone, or inside a ring, past the class's first five steps; junctions of four or more
 * lines stay small (they are roads). */
function mediumCandidates(tree, graph, nodes) {
    const rings = new Set(visualBundleAudit(tree).bundles.flatMap(bundle => bundle.ids));
    const hidden = new Set(tree.edges.filter(edge => edge.hidden).flatMap(edge => [String(edge.a), String(edge.b)]));
    return tree.nodes.filter(node => {
        const id = String(node.id), neighbors = graph.get(id) || [];
        if (!isSmall(node) || effectsOf(node).length !== 1 || isAttributeOnly(node) || SPECIAL.has(effectsOf(node)[0].statId)) return false;
        if (node.choiceGroup || hidden.has(id) || neighbors.length > 3 || (node.distanceFromClassStart || 0) <= FIRST_NOTABLE_STEPS) return false;
        return rings.has(id) || neighbors.some(other => ['major', 'keystone'].includes(nodes.get(other).type));
    }).sort((a, b) => a.distanceFromClassStart - b.distanceFromClassStart || String(a.id).localeCompare(String(b.id)));
}

function growGatewaysAndRings(tree, report) {
    const graph = buildGraph(tree), nodes = nodeMap(tree);
    mediumCandidates(tree, graph, nodes).forEach(node => {
        const archetype = bundleArchetype(node);
        if (!archetype || !hasRoom(tree, nodes, node, NODE_RADIUS.normal)) return report.mediumSkipped.push(String(node.id));
        growToMedium(node, bundleFor(node, archetype, neighborNamesOf(graph, nodes, node)));
        report.mediums.push(String(node.id));
    });
}

// ── defence numbers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function trimFlatEnergyShield(tree, context, report, keep) {
    tree.nodes.filter(node => hasStat(node, 'energyShield')).forEach(node => {
        if (keep.has(String(node.id))) {
            setEffects(node, effectsOf(node).map(effect => (effect.statId === 'energyShield'
                ? { ...effect, value: FLAT_ENERGY_SHIELD[node.type] * (1 + 0.05 * bandOf(node)) } : effect)));
            return report.flatShieldKept.push(String(node.id));
        }
        const swap = hasStat(node, 'energyShieldPct') ? 'energyShieldRegen' : 'energyShieldPct';
        setEffects(node, effectsOf(node).map(effect => (effect.statId === 'energyShield' ? line(context, swap, node.type, bandOf(node)) : effect)));
        if (isSmall(node)) node.name = STAT_META[swap][0];
        report.flatShieldSwapped.push(String(node.id));
    });
}

function defencePercent(node, index) {
    const base = node.type !== 'major' ? DEFENCE_PERCENT_BASE[node.type] : index === 0 ? DEFENCE_PERCENT_BASE.majorLead : DEFENCE_PERCENT_BASE.major;
    return Math.round(base * (1 + 0.05 * bandOf(node)));
}

function levelDefencePercents(tree, report) {
    tree.nodes.filter(node => DEFENCE_PERCENT_BASE[node.type] && effectsOf(node).some(effect => DEFENCE_PERCENTS.has(effect.statId))).forEach(node => {
        setEffects(node, effectsOf(node).map((effect, index) => (DEFENCE_PERCENTS.has(effect.statId) ? { ...effect, value: defencePercent(node, index) } : effect)));
        report.levelled.push(String(node.id));
    });
}

/** Lines a late lift leaves alone: special options, cost lines, rune lines, the extra projectile, and the levelled defence %. */
const fixedLine = effect => SPECIAL.has(effect.statId) || Number(effect.value) < 0 || roleOf(effect.statId) === 'P'
    || effect.statId === 'projectileExtraShots' || DEFENCE_PERCENTS.has(effect.statId);

/** Last: nodes the editor marks weak (under 60% of the usual node of their type in this tree, tools/passive-editor/insights.js) are
 * raised toward 85%, so what ships has no weak marks. */
function liftWeakNodes(tree, report) {
    const yardstick = createContext(tree);
    tree.nodes.filter(node => ['minor', 'assist', 'normal', 'major'].includes(node.type) && effectsOf(node).length).forEach(node => {
        const power = nodePower(yardstick, node);
        if (power >= WEAK_POWER) return;
        const factor = Math.min(2, LIFTED_POWER / Math.max(0.1, power));
        setEffects(node, effectsOf(node).map(effect => (fixedLine(effect) ? effect : { ...effect, value: Number(effect.value) * factor })));
        report.liftedLate.push(String(node.id));
    });
}

/** After the v23 option passes: plain 피해 the earlier passes copied, the new notables (before the special nodes, which stay near the
 * notables that wake with them), six special nodes each and 사중합일's bar to match, gateways and rings, then the defence numbers, and a
 * last lift of weak nodes. */
function polishTree(tree, context, report) {
    const keepFlatShield = new Set(tree.nodes.filter(node => ['normal', 'major'].includes(node.type) && hasStat(node, 'energyShield')).map(node => String(node.id)));
    rethemeGenericDamage(tree, context, report);
    placeNovelNotables(tree, report);
    thinSpecialSmalls(tree, report);
    fitFourfoldUnity(tree);
    growGatewaysAndRings(tree, report);
    trimFlatEnergyShield(tree, context, report, keepFlatShield);
    levelDefencePercents(tree, report);
    liftWeakNodes(tree, report);
}

module.exports = { DEFENCE_PERCENTS, DEFENCE_PERCENT_BASE, FOURFOLD_UNITY_MINIMUM, SPECIAL_SMALLS_KEPT, defencePercent, isSpecialSingle, polishTree,
    rethemeGenericDamage };
