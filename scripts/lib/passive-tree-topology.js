'use strict';

const ACTIONABLE_TYPES = new Set(['minor', 'assist', 'normal', 'major']);
const FEATURE_TYPES = new Set(['normal', 'major']);
const ATTRIBUTE_STATS = new Set(['strength', 'dexterity', 'intelligence']);
const SPECIAL_CATEGORIES = new Set(['mystique', 'devotion', 'cycle']);
const ODD_CLOCK_ANGLES = Object.freeze([0, 60, 120, 180, 240, 300]);
const SPECIAL_ZONE_HALF_WIDTH = 20;
const PATH_ALLOWED_STATS = new Set([
    ...ATTRIBUTE_STATS, 'flatHp', 'pctHp', 'regen', 'armor', 'armorPct', 'evasion', 'evasionPct',
    'energyShield', 'energyShieldPct', 'resAll', 'move', 'pctDmg'
]);
const CLASS_VOID_MIN_RADIUS = 900;
const CLASS_VOID_MAX_RADIUS = 1150;
const VISUAL_BUNDLE_MAX_EDGE_LENGTH = 120;

function nodeMap(tree) {
    return new Map(tree.nodes.map(node => [String(node.id), node]));
}

function fullGraph(tree, nodes = nodeMap(tree)) {
    const graph = new Map([...nodes.keys()].map(id => [id, []]));
    tree.edges.forEach(edge => {
        const a = String(edge.a), b = String(edge.b);
        if (!graph.has(a) || !graph.has(b)) return;
        graph.get(a).push(b);
        graph.get(b).push(a);
    });
    graph.forEach(neighbors => neighbors.sort());
    return graph;
}

function normalizedAngle(node) {
    return (Math.atan2(Number(node.y) || 0, Number(node.x) || 0) * 180 / Math.PI + 360) % 360;
}

function circularDistance(left, right) {
    return Math.abs(((left - right + 540) % 360) - 180);
}

function oddClockDistance(node) {
    const angle = normalizedAngle(node);
    return Math.min(...ODD_CLOCK_ANGLES.map(target => circularDistance(angle, target)));
}

function graphDistances(graph, from) {
    const queue = [from], distances = new Map([[from, 0]]);
    for (let index = 0; index < queue.length; index += 1) {
        const id = queue[index];
        graph.get(id).forEach(next => {
            if (distances.has(next)) return;
            distances.set(next, distances.get(id) + 1);
            queue.push(next);
        });
    }
    return distances;
}

function matchingClassVoid(start, voids) {
    const match = [...voids].sort((left, right) =>
        circularDistance(normalizedAngle(left), normalizedAngle(start))
        - circularDistance(normalizedAngle(right), normalizedAngle(start))
        || String(left.id).localeCompare(String(right.id)))[0];
    if (!match || circularDistance(normalizedAngle(match), normalizedAngle(start)) > 5) {
        throw new Error(`직업 시작점과 같은 축의 공허 노드가 없습니다: ${start.id}`);
    }
    return match;
}

function isAttributeNode(node) {
    const effects = node?.runtimeEffects || [];
    return ACTIONABLE_TYPES.has(node?.type) && effects.length > 0
        && effects.every(effect => ATTRIBUTE_STATS.has(effect.statId));
}

function addAttributeRouteIds(target, tree, graph, from, to) {
    const fromId = String(from.id), toId = String(to.id);
    const fromDistances = graphDistances(graph, fromId), toDistances = graphDistances(graph, toId);
    const routeLength = fromDistances.get(toId);
    if (!Number.isFinite(routeLength)) throw new Error(`패시브 뼈대 경로가 끊겼습니다: ${fromId} -> ${toId}`);
    tree.nodes.forEach(node => {
        const id = String(node.id);
        if (!isAttributeNode(node)) return;
        if (fromDistances.get(id) + toDistances.get(id) === routeLength) target.add(id);
    });
}

function backboneIds(tree, graph) {
    const starts = tree.nodes.filter(node => node.type === 'start').sort((left, right) =>
        normalizedAngle(left) - normalizedAngle(right));
    const voids = tree.nodes.filter(node => node.type === 'void'
        && Math.hypot(node.x, node.y) >= CLASS_VOID_MIN_RADIUS
        && Math.hypot(node.x, node.y) <= CLASS_VOID_MAX_RADIUS);
    if (starts.length !== 6) throw new Error('패시브 뼈대는 6개 직업 시작점이 필요합니다.');
    const ids = new Set();
    starts.forEach(start => addAttributeRouteIds(ids, tree, graph, start, matchingClassVoid(start, voids)));
    return ids;
}

function compactActionableGraph(nodes, graph) {
    const actionable = new Set([...nodes].filter(([, node]) => ACTIONABLE_TYPES.has(node.type)).map(([id]) => id));
    return new Map([...actionable].map(id => [id, graph.get(id).filter(next => {
        if (!actionable.has(next)) return false;
        const from = nodes.get(id), to = nodes.get(next);
        return Math.hypot(Number(from.x) - Number(to.x), Number(from.y) - Number(to.y)) <= VISUAL_BUNDLE_MAX_EDGE_LENGTH;
    })]));
}

function connectedComponents(graph) {
    const seen = new Set(), components = [];
    graph.forEach((unused, first) => {
        void unused;
        if (seen.has(first)) return;
        const queue = [first], ids = [];
        seen.add(first);
        for (let index = 0; index < queue.length; index += 1) {
            const id = queue[index];
            ids.push(id);
            graph.get(id).forEach(next => {
                if (seen.has(next)) return;
                seen.add(next);
                queue.push(next);
            });
        }
        components.push(ids.sort());
    });
    return components;
}

function addShortestRoutes(target, ids, boundaries, graph) {
    const component = new Set(ids);
    const distances = new Map(boundaries.map(id => [id, graphDistances(graph, id)]));
    for (let left = 0; left < boundaries.length; left += 1) {
        for (let right = left + 1; right < boundaries.length; right += 1) {
            const from = distances.get(boundaries[left]), to = distances.get(boundaries[right]);
            const routeLength = from.get(boundaries[right]);
            if (!Number.isFinite(routeLength)) continue;
            ids.forEach(id => {
                if (component.has(id) && from.get(id) + to.get(id) === routeLength) target.add(id);
            });
        }
    }
}

function visualCorridorIds(nodes, graph) {
    const compact = compactActionableGraph(nodes, graph), corridors = new Set();
    connectedComponents(compact).forEach(ids => {
        const component = new Set(ids);
        const boundaries = ids.filter(id => graph.get(id).some(next => !component.has(next)));
        const hasFeature = ids.some(id => FEATURE_TYPES.has(nodes.get(id).type));
        if (ids.length < 3 || !hasFeature) {
            ids.forEach(id => corridors.add(id));
            return;
        }
        if (boundaries.length >= 2) addShortestRoutes(corridors, ids, boundaries, compact);
    });
    return corridors;
}

function collectSpecialComponent(first, categoryIds, graph, seen) {
    const queue = [first], ids = [];
    seen.add(first);
    for (let index = 0; index < queue.length; index += 1) {
        const id = queue[index];
        ids.push(id);
        graph.get(id).forEach(next => {
            if (!categoryIds.has(next) || seen.has(next)) return;
            seen.add(next);
            queue.push(next);
        });
    }
    return ids.sort();
}

function componentCenter(ids, nodes) {
    const center = ids.reduce((sum, id) => ({
        x: sum.x + Number(nodes.get(id).x), y: sum.y + Number(nodes.get(id).y)
    }), { x: 0, y: 0 });
    return { x: center.x / ids.length, y: center.y / ids.length };
}

function specialComponents(tree, nodes, graph) {
    const components = [];
    SPECIAL_CATEGORIES.forEach(category => {
        const categoryIds = new Set(tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type) && node.cat === category)
            .map(node => String(node.id)));
        const seen = new Set();
        [...categoryIds].sort().forEach(id => {
            if (seen.has(id)) return;
            const ids = collectSpecialComponent(id, categoryIds, graph, seen);
            const center = componentCenter(ids, nodes);
            const inCore = Math.hypot(center.x, center.y) <= 300;
            components.push({ category, ids, center, preserved: inCore || oddClockDistance(center) <= SPECIAL_ZONE_HALF_WIDTH });
        });
    });
    return components.sort((left, right) => left.category.localeCompare(right.category)
        || left.ids[0].localeCompare(right.ids[0]));
}

function classifyPassiveTreeTopology(tree) {
    const nodes = nodeMap(tree), graph = fullGraph(tree, nodes), backbone = backboneIds(tree, graph);
    const actionableIds = tree.nodes.filter(node => ACTIONABLE_TYPES.has(node.type)).map(node => String(node.id));
    const corridors = visualCorridorIds(nodes, graph);
    backbone.forEach(id => corridors.add(id));
    // A terminal reward behind a keystone is an optional branch, not a travel stat.
    tree.edges.filter(edge => edge.hidden).forEach(edge => {
        const pair = [nodes.get(String(edge.a)), nodes.get(String(edge.b))];
        if (!pair.some(node => node?.type === 'keystone')) return;
        const terminal = pair.find(node => ACTIONABLE_TYPES.has(node?.type)
            && graph.get(String(node.id)).length === 1);
        if (terminal) corridors.delete(String(terminal.id));
    });
    const bundles = new Set(actionableIds.filter(id => !corridors.has(id)));
    const components = specialComponents(tree, nodes, graph);
    const preservedSpecialIds = new Set(components.filter(component => component.preserved).flatMap(component => component.ids));
    const reducedSpecialIds = new Set(components.filter(component => !component.preserved).flatMap(component => component.ids));
    return { backboneIds: backbone, corridorIds: corridors, bundleIds: bundles, graph, nodes, specialComponents: components,
        preservedSpecialIds, reducedSpecialIds };
}

module.exports = {
    ACTIONABLE_TYPES, ATTRIBUTE_STATS, ODD_CLOCK_ANGLES, PATH_ALLOWED_STATS, SPECIAL_CATEGORIES,
    SPECIAL_ZONE_HALF_WIDTH, classifyPassiveTreeTopology, normalizedAngle, oddClockDistance
};
