// Editor helpers for judging a layout (2026-10-28, v23): class zones, distance bands, node power against its peers, and catalog option
// bundles scaled the way scripts/lib/passive-tree-option-catalog.js scales them. Nothing here writes to the tree on its own.

/** The game tree's class order, each start 60° on from the last starting at 30° (the fixed split for a tree without six starts). */
export const ZONES = Object.freeze([
    { id: 'cleric', label: '성직자', color: 'rgba(233,214,140,0.07)' },
    { id: 'warrior', label: '전사', color: 'rgba(214,112,86,0.07)' },
    { id: 'wanderer', label: '방랑자', color: 'rgba(150,190,120,0.07)' },
    { id: 'archer', label: '궁수', color: 'rgba(120,200,150,0.07)' },
    { id: 'alchemist', label: '연금술사', color: 'rgba(120,170,220,0.07)' },
    { id: 'occultist', label: '비술사', color: 'rgba(170,130,220,0.07)' }
]);
const ACTIONABLE = new Set(['minor', 'assist', 'normal', 'major']);
/** Below this share of the usual value for its type and options a node is marked weak (the v23 rework lifted the same ones). */
export const WEAK_POWER = 0.6;

// 구역 나누기: scripts/lib/passive-tree-work-areas.js areaLayout과 같은 규칙이다(구역 파일을 자르고 합치는 서버 쪽이 기준). 직업 조각은 그
// 트리의 시작점을 따르고(설계자에서 직업 자리를 바꾼 파일), 가운데 선은 설계자 계획 구역의 안쪽 끝이나 시작점 고리에 맞춘 게임 값이다.
const CLASS_BY_LABEL = new Map(ZONES.map(zone => [zone.label, zone.id]));
const angleOf = point => (Math.atan2(Number(point.y) || 0, Number(point.x) || 0) * 180 / Math.PI + 360) % 360;
const radiusOf = point => Math.hypot(Number(point.x) || 0, Number(point.y) || 0);
const turn = (from, to) => (to - from + 360) % 360;

function sectorsAround(starts) {
    const sorted = starts.slice().sort((a, b) => a.angle - b.angle);
    return sorted.map((start, index) => {
        const before = sorted[(index + sorted.length - 1) % sorted.length], after = sorted[(index + 1) % sorted.length];
        const from = Math.round(before.angle + turn(before.angle, start.angle) / 2) % 360;
        return { id: start.id, from, to: Math.round(start.angle + turn(start.angle, after.angle) / 2) % 360 };
    });
}

function centreRadiusOf(tree, starts, startRadius, rule) {
    const scaled = Math.round(rule.centreRadius * startRadius / rule.startRadius);
    const startIds = new Set([...starts.values()].map(node => String(node.id))), byId = new Map(tree.nodes.map(node => [String(node.id), node]));
    const planned = (tree.planningRegions || []).filter(region => startIds.has(String(region.focusNodeId)))
        .flatMap(region => region.nodeIds || []).map(id => byId.get(String(id))).filter(Boolean).map(radiusOf);
    const edge = planned.length ? Math.min(...planned) : 0;
    if (edge < scaled * 0.5 || edge > scaled * 1.5) return scaled;
    const inside = tree.nodes.map(radiusOf).filter(radius => radius < edge - 1);
    return Math.round(inside.length ? (edge + Math.max(...inside)) / 2 : edge - 1);
}

/** This tree's zones: { centreRadius, startRadius, sectors: [{ id, from, to }] }. rule is the server's config.areas. */
export function areaLayout(tree, rule) {
    const starts = new Map();
    tree.nodes.filter(node => node.type === 'start').forEach(node => {
        const id = node.startClassId || CLASS_BY_LABEL.get(String(node.name || '').trim());
        if (ZONES.some(zone => zone.id === id) && !starts.has(id)) starts.set(id, node);
    });
    if (starts.size < ZONES.length) {
        return { centreRadius: rule.centreRadius, startRadius: rule.startRadius, sectors: sectorsAround(ZONES.map((zone, index) => ({ id: zone.id, angle: 30 + index * 60 }))) };
    }
    const radii = [...starts.values()].map(radiusOf).sort((a, b) => a - b), startRadius = Math.round((radii[2] + radii[3]) / 2);
    return { centreRadius: centreRadiusOf(tree, starts, startRadius, rule), startRadius,
        sectors: sectorsAround([...starts].map(([id, node]) => ({ id, angle: angleOf(node) }))) };
}

/** The class zone a point belongs to in this layout (areaLayout). */
export function zoneOf(node, layout) {
    const angle = Math.round(angleOf(node) * 1e6) / 1e6;
    const sector = layout.sectors.find(row => turn(row.from, angle) < turn(row.from, row.to)) || layout.sectors[0];
    return ZONES.find(zone => zone.id === sector.id);
}

/** 구역 작업의 구역: the class zone, or 'centre' inside the layout's centre line. */
export function workAreaOf(point, layout) {
    return radiusOf(point) < layout.centreRadius ? 'centre' : zoneOf(point, layout).id;
}

/** Steps from the nearest class start for every node (all links, keystone-only ones too, like the runtime builder). */
export function startDistances(tree) {
    const graph = new Map(tree.nodes.map(node => [String(node.id), []]));
    tree.edges.forEach(edge => {
        const a = String(edge.a), b = String(edge.b);
        if (graph.has(a) && graph.has(b)) { graph.get(a).push(b); graph.get(b).push(a); }
    });
    const starts = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    const distances = new Map(starts.map(id => [id, 0])), queue = starts.slice();
    for (let index = 0; index < queue.length; index++) {
        const id = queue[index];
        graph.get(id).forEach(next => {
            if (distances.has(next)) return;
            distances.set(next, distances.get(id) + 1);
            queue.push(next);
        });
    }
    return distances;
}

export const bandOf = distance => Math.min(4, Math.floor(Math.max(0, Number(distance) || 0) / 7));

/** Median value per node type and option, the yardstick for node power. */
export function powerYardstick(tree) {
    const lists = new Map();
    tree.nodes.filter(node => ACTIONABLE.has(node.type)).forEach(node => (node.runtimeEffects || []).forEach(effect => {
        const key = `${node.type}|${effect.statId}`;
        if (!lists.has(key)) lists.set(key, []);
        lists.get(key).push(Math.abs(Number(effect.value)));
    }));
    return new Map([...lists].map(([key, values]) => [key, values.sort((a, b) => a - b)[Math.floor(values.length / 2)]]));
}

/** A node's power against the usual node of its type: 1 is ordinary. Null for nodes without options (starts, sockets, keystones). */
export function nodePower(node, yardstick) {
    const effects = node.runtimeEffects || [];
    if (!ACTIONABLE.has(node.type) || !effects.length) return null;
    const sum = effects.reduce((total, effect) => total + Math.abs(Number(effect.value)) / (yardstick.get(`${node.type}|${effect.statId}`) || 1), 0);
    return sum / (node.type === 'normal' || node.type === 'major' ? 2 : 1);
}

export function weakNodes(tree, yardstick) {
    return tree.nodes.filter(node => {
        const power = nodePower(node, yardstick);
        return power !== null && power < WEAK_POWER;
    });
}

function roundToStep(value, step) {
    const rounded = Math.round(Number(value) / step) * step;
    return Number(rounded.toFixed(step === 0.1 ? 1 : 2));
}

/** A catalog bundle's lines at this node's type (minor 1 line, medium 2, notable up to 3, as the catalog does). The distance band no longer
 * moves the values: the catalog's numbers stay round at every type (2026-11-01 사용자: 예쁜 수치, 거리별 파워는 두지 않는다). */
export function scaledBundle(bundle, node, catalog) {
    const limit = node.type === 'major' ? 3 : node.type === 'normal' ? 2 : 1;
    const multiplier = catalog.typeMultiplier[node.type] || 1;
    return bundle.lines.filter(line => !line.majorOnly || node.type === 'major').slice(0, limit).map(line => ({
        statId: line.statId,
        value: roundToStep(line.fixed ? line.value : line.value * multiplier, catalog.steps[line.statId] || 1)
    }));
}

/** Bundles to offer: the node's own archetype first, then its zone's palette, then the rest. */
export function bundleChoices(node, catalog, layout) {
    const zone = zoneOf(node, layout).id, own = node.archetype, palette = catalog.zonePalettes[zone] || [];
    const order = [own, ...palette, ...Object.keys(catalog.profiles)].filter((key, index, list) => catalog.profiles[key] && list.indexOf(key) === index);
    return order.flatMap(archetype => catalog.profiles[archetype].map((bundle, index) => ({ archetype, index, bundle })));
}
