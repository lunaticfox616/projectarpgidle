'use strict';

// Layout half of the v23 skill tree rework (scripts/rework-passive-tree-v23.js): spacing, notables taken off through-paths, an
// approach node before lone notables, and nudges where a line crosses a node or two nodes crowd. Node ids are never removed or changed.

const { buildGraph, graphDistances } = require('../audit-passive-tree-source');
const { visualBundleAudit } = require('./passive-tree-clusters');

/** Every coordinate is multiplied by this. data/passives.js multiplies the coordinate radii (안드로메다, 소행성대) by the same factor. */
const LAYOUT_SCALE = 1.35;
/** World radius per node type after the rework; js/passives.js draws with the same numbers. */
const NODE_RADIUS = Object.freeze({ minor: 9, assist: 9, normal: 14, major: 24, keystone: 31, void: 28, start: 34, quatrefoil: 28 });
const MIN_GAP = 12;
const FIRST_NOTABLE_STEPS = 5;

const radiusOf = node => NODE_RADIUS[node.type] || 9;
const edgeKey = (a, b) => [String(a), String(b)].sort().join('|');

function scaleLayout(tree) {
    tree.nodes.forEach(node => {
        node.x = Math.round(Number(node.x) * LAYOUT_SCALE);
        node.y = Math.round(Number(node.y) * LAYOUT_SCALE);
    });
}

function nodeMap(tree) {
    return new Map(tree.nodes.map(node => [String(node.id), node]));
}

function startIds(tree) {
    return tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
}

function hiddenEdgeNodes(tree) {
    const ids = new Set();
    tree.edges.filter(edge => edge.hidden).forEach(edge => { ids.add(String(edge.a)); ids.add(String(edge.b)); });
    return ids;
}

function bundleMembers(tree) {
    return new Set(visualBundleAudit(tree).bundles.flatMap(bundle => bundle.ids));
}

/** Distance from the point to the segment a-b, and where along it (0..1). */
function segmentDistance(point, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, lengthSquared = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
    return { distance: Math.hypot(a.x + t * dx - point.x, a.y + t * dy - point.y), t };
}

function segmentsCross(p, q, r, s) {
    const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
    if (!d) return false;
    const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
    const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
    return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

/** True when a node of this radius at the point keeps clear of every other node and every line not ending at an ignored id. */
function isClearSpot(tree, nodes, point, radius, ignore) {
    const crowded = tree.nodes.some(other => !ignore.has(String(other.id))
        && Math.hypot(other.x - point.x, other.y - point.y) < radius + radiusOf(other) + MIN_GAP);
    if (crowded) return false;
    return !tree.edges.some(edge => {
        if (ignore.has(String(edge.a)) || ignore.has(String(edge.b))) return false;
        const hit = segmentDistance(point, nodes.get(String(edge.a)), nodes.get(String(edge.b)));
        return hit.t > 0 && hit.t < 1 && hit.distance < radius + 5;
    });
}

/** True when a new line from a to b would cross an existing line or pass over a node. */
function lineIsBlocked(tree, nodes, a, b, ignore) {
    const crosses = tree.edges.some(edge => {
        const p = nodes.get(String(edge.a)), q = nodes.get(String(edge.b));
        if ([p, q].some(end => ignore.has(String(end.id)))) return false;
        return segmentsCross(a, b, p, q);
    });
    if (crosses) return true;
    return tree.nodes.some(other => {
        if (ignore.has(String(other.id))) return false;
        const hit = segmentDistance(other, a, b);
        return hit.t > 0.02 && hit.t < 0.98 && hit.distance < radiusOf(other) + 4;
    });
}

function removeEdge(tree, a, b) {
    const key = edgeKey(a, b), index = tree.edges.findIndex(edge => edgeKey(edge.a, edge.b) === key);
    if (index >= 0) tree.edges.splice(index, 1);
}

function addEdge(tree, a, b) {
    if (!tree.edges.some(edge => edgeKey(edge.a, edge.b) === edgeKey(a, b))) tree.edges.push({ a: String(a), b: String(b) });
}

/** Candidate spots around a base point: offsets along the unit normal on both sides, nearest first. */
function sideSpots(base, normal, lengths) {
    return lengths.flatMap(length => [1, -1].map(side => ({ x: Math.round(base.x + normal.x * length * side),
        y: Math.round(base.y + normal.y * length * side) })));
}

function unitNormal(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1;
    return { x: -dy / length, y: dx / length };
}

/** Majors sitting between exactly two path nodes, outside any small ring bundle and off keystone-only lines. */
function inlineNotables(tree, nodes, graph) {
    const bundles = bundleMembers(tree), hidden = hiddenEdgeNodes(tree);
    return tree.nodes.filter(node => {
        const id = String(node.id), neighbors = graph.get(id) || [];
        if (node.type !== 'major' || bundles.has(id) || hidden.has(id) || node.choiceGroup || neighbors.length !== 2) return false;
        if (!neighbors.every(other => nodes.get(other).type === 'minor')) return false;
        return !(graph.get(neighbors[0]) || []).includes(neighbors[1]);
    });
}

/** Moves a notable off the line between its two path neighbours and joins them directly; it stays on the start side. */
function detachNotable(tree, nodes, node, context) {
    const id = String(node.id), [first, second] = context.graph.get(id).map(other => nodes.get(other));
    const near = (context.distances.get(String(first.id)) || 0) <= (context.distances.get(String(second.id)) || 0) ? first : second;
    const far = near === first ? second : first;
    const length = Math.max(85, Math.min(140, Math.hypot(far.x - near.x, far.y - near.y) * 0.5));
    const ignore = new Set([id, String(near.id), String(far.id)]);
    const spot = sideSpots(node, unitNormal(near, far), [length, length * 1.25, length * 0.8, length * 1.5])
        .find(point => isClearSpot(tree, nodes, point, radiusOf(node), ignore) && !lineIsBlocked(tree, nodes, near, point, ignore));
    if (!spot) return null;
    removeEdge(tree, id, far.id);
    addEdge(tree, near.id, far.id);
    Object.assign(node, spot);
    return { id, anchor: String(near.id), joined: String(far.id) };
}

function detachInlineNotables(tree, report) {
    const nodes = nodeMap(tree), graph = buildGraph(tree);
    const context = { graph, distances: graphDistances(graph, startIds(tree)) };
    inlineNotables(tree, nodes, graph).forEach(node => {
        const moved = detachNotable(tree, nodes, node, context);
        if (moved) report.detached.push(moved);
        else report.detachSkipped.push(String(node.id));
    });
}

/** Majors whose only neighbour is a path node, past the first notable a class reaches (six steps or more stay as they are). */
function loneNotables(tree, nodes, graph, distances) {
    const bundles = bundleMembers(tree), hidden = hiddenEdgeNodes(tree);
    return tree.nodes.filter(node => {
        const id = String(node.id), neighbors = graph.get(id) || [];
        if (node.type !== 'major' || bundles.has(id) || hidden.has(id) || neighbors.length !== 1) return false;
        return nodes.get(neighbors[0]).type === 'minor' && (distances.get(id) || 0) > FIRST_NOTABLE_STEPS + 1;
    });
}

/** Where the approach node goes on the spur: as far from the notable's rim as from the parent's, so a big notable does not crowd it. */
function approachStep(parent, notable, node) {
    const spur = Math.hypot(notable.x - parent.x, notable.y - parent.y), along = (spur + radiusOf(parent) - radiusOf(node)) / (2 * spur);
    return { x: Math.round(parent.x + (notable.x - parent.x) * along), y: Math.round(parent.y + (notable.y - parent.y) * along) };
}

/** Where the approach node and the notable go: the notable moves out along its spur so the two sit evenly; null when crowded. */
function approachSpots(tree, nodes, parent, node) {
    const dx = node.x - parent.x, dy = node.y - parent.y, length = Math.hypot(dx, dy) || 1;
    const ignore = new Set([String(node.id), String(parent.id)]);
    for (const turn of [0, 0.25, -0.25, 0.45, -0.45]) {
        for (const reach of [Math.max(length, 150), Math.max(length, 130) * 1.2, length]) {
            const angle = Math.atan2(dy, dx) + turn;
            const notable = { x: Math.round(parent.x + Math.cos(angle) * reach), y: Math.round(parent.y + Math.sin(angle) * reach) };
            if (Math.hypot(notable.x - parent.x, notable.y - parent.y) < 2 * (radiusOf(node) + MIN_GAP)) continue;
            const step = approachStep(parent, notable, node);
            if (!isClearSpot(tree, nodes, notable, radiusOf(node), ignore) || !isClearSpot(tree, nodes, step, NODE_RADIUS.assist, ignore)) continue;
            if (lineIsBlocked(tree, nodes, parent, notable, ignore)) continue;
            return { notable, step };
        }
    }
    return null;
}

function addApproachNode(tree, nodes, parent, node, makeStep) {
    const spots = approachSpots(tree, nodes, parent, node);
    if (!spots) return null;
    const step = makeStep(node, spots.step);
    Object.assign(node, spots.notable);
    tree.nodes.push(step);
    nodes.set(String(step.id), step);
    removeEdge(tree, parent.id, node.id);
    addEdge(tree, parent.id, step.id);
    addEdge(tree, step.id, node.id);
    return { notable: String(node.id), step: String(step.id) };
}

/** Puts one small node of the notable's own option before each lone notable (see makeStep in the options half). */
function addApproachNodes(tree, report, makeStep) {
    const nodes = nodeMap(tree), graph = buildGraph(tree), distances = graphDistances(graph, startIds(tree));
    loneNotables(tree, nodes, graph, distances).forEach(node => {
        const parent = nodes.get(graph.get(String(node.id))[0]);
        const added = addApproachNode(tree, nodes, parent, node, makeStep);
        if (added) report.approaches.push(added);
        else report.approachSkipped.push(String(node.id));
    });
}

/** How many other lines the node's own lines cross where it stands now. */
function incidentCrossings(tree, nodes, node) {
    const id = String(node.id), own = tree.edges.filter(edge => String(edge.a) === id || String(edge.b) === id);
    let count = 0;
    own.forEach(edge => {
        const p = nodes.get(String(edge.a)), q = nodes.get(String(edge.b));
        tree.edges.forEach(other => {
            const r = nodes.get(String(other.a)), s = nodes.get(String(other.b));
            if ([p, q].some(end => end === r || end === s)) return;
            if (segmentsCross(p, q, r, s)) count++;
        });
    });
    return count;
}

/** One nudge: the node moves straight away from the line it sits on, by what it lacks plus a little; never into new crossings. */
function nudgeOffLine(tree, nodes, node, edge) {
    const a = nodes.get(String(edge.a)), b = nodes.get(String(edge.b)), hit = segmentDistance(node, a, b);
    const normal = unitNormal(a, b), side = Math.sign((node.x - a.x) * normal.x + (node.y - a.y) * normal.y) || 1;
    const push = radiusOf(node) + 8 - hit.distance;
    const spot = { x: Math.round(node.x + normal.x * side * push), y: Math.round(node.y + normal.y * side * push) };
    const ignore = new Set([String(node.id), String(a.id), String(b.id), ...buildNeighborIds(tree, node.id)]);
    if (push > 46 || !isClearSpot(tree, nodes, spot, radiusOf(node), ignore)) return false;
    const before = { x: node.x, y: node.y }, crossingsBefore = incidentCrossings(tree, nodes, node);
    Object.assign(node, spot);
    if (incidentCrossings(tree, nodes, node) <= crossingsBefore) return true;
    Object.assign(node, before);
    return false;
}

function buildNeighborIds(tree, id) {
    const key = String(id);
    return tree.edges.filter(edge => String(edge.a) === key || String(edge.b) === key)
        .map(edge => (String(edge.a) === key ? String(edge.b) : String(edge.a)));
}

/** Lines that pass over a node they do not end at (hidden keystone bridges included: they show once taken). */
/** True when the node, grown to this radius, crowds no other node and no line it does not end runs over it (the crowded and
 * line-over-node rules of layoutSummary). */
function hasRoomToGrow(tree, nodes, node, radius) {
    const id = String(node.id);
    if (tree.nodes.some(other => other !== node && Math.hypot(other.x - node.x, other.y - node.y) - radiusOf(other) - radius < MIN_GAP / 2)) return false;
    return !tree.edges.some(edge => {
        if (String(edge.a) === id || String(edge.b) === id) return false;
        const hit = segmentDistance(node, nodes.get(String(edge.a)), nodes.get(String(edge.b)));
        return hit.t > 0.02 && hit.t < 0.98 && hit.distance < radius + 4;
    });
}

/** Distance from the node's centre to the nearest other node's rim. */
function clearance(tree, node) {
    return Math.min(...tree.nodes.filter(other => other !== node).map(other => Math.hypot(other.x - node.x, other.y - node.y) - radiusOf(other)));
}

function linesOverNodes(tree, nodes) {
    const found = [];
    tree.edges.forEach(edge => {
        const a = nodes.get(String(edge.a)), b = nodes.get(String(edge.b));
        tree.nodes.forEach(node => {
            if (node === a || node === b) return;
            const hit = segmentDistance(node, a, b);
            if (hit.t > 0.02 && hit.t < 0.98 && hit.distance < radiusOf(node) + 4) found.push({ node, edge });
        });
    });
    return found;
}

function relieveLinesOverNodes(tree, report) {
    const nodes = nodeMap(tree);
    for (let round = 0; round < 3; round++) {
        const found = linesOverNodes(tree, nodes);
        if (!found.length) break;
        found.forEach(({ node, edge }) => {
            if (nudgeOffLine(tree, nodes, node, edge)) report.nudged.push(String(node.id));
        });
    }
    report.linesOverNodesLeft = linesOverNodes(tree, nodes).length;
}

/** Pairs of nodes closer than their radii and the gap allow. */
function crowdedPairs(tree) {
    const pairs = [];
    for (let i = 0; i < tree.nodes.length; i++) {
        for (let j = i + 1; j < tree.nodes.length; j++) {
            const a = tree.nodes[i], b = tree.nodes[j], gap = Math.hypot(a.x - b.x, a.y - b.y) - radiusOf(a) - radiusOf(b);
            if (gap < MIN_GAP / 2) pairs.push({ a, b, gap });
        }
    }
    return pairs;
}

function layoutSummary(tree) {
    const nodes = nodeMap(tree);
    let crossings = 0;
    for (let i = 0; i < tree.edges.length; i++) {
        const e = tree.edges[i], p = nodes.get(String(e.a)), q = nodes.get(String(e.b));
        for (let j = i + 1; j < tree.edges.length; j++) {
            const f = tree.edges[j], r = nodes.get(String(f.a)), s = nodes.get(String(f.b));
            if ([p, q].some(end => end === r || end === s)) continue;
            if (segmentsCross(p, q, r, s)) crossings++;
        }
    }
    return { crossings, linesOverNodes: linesOverNodes(tree, nodes).length, crowdedPairs: crowdedPairs(tree).length };
}

module.exports = {
    FIRST_NOTABLE_STEPS, LAYOUT_SCALE, NODE_RADIUS, addApproachNodes, clearance, detachInlineNotables, hasRoomToGrow, layoutSummary,
    nodeMap, relieveLinesOverNodes, scaleLayout, startIds
};
