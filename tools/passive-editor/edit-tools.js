// 편집 도구(2026-10-28 사용자: 설계자에서 쓰던 기능이 없어 불편해 작업을 못 한다. 패시브 트리 설계자 1.10.0과 같은 동작을 기준으로 했다).
// 트리를 바꾸는 계산만 여기 둔다: 새 노드, 도형 배치, 복사와 붙여넣기, 선택 회전과 반전, 키보드 이동, 일괄 변경. 화면과 실행 취소는 editor.js가 맡는다.

/** Node types in the designer's order (등급), with the size the designer draws them at. */
export const NODE_TYPES = Object.freeze([
    { id: 'minor', label: '소형 패시브' }, { id: 'normal', label: '일반 패시브' }, { id: 'assist', label: '주요 보조' },
    { id: 'major', label: '주요 패시브' }, { id: 'keystone', label: '키스톤' }, { id: 'quatrefoil', label: '성률' },
    { id: 'void', label: '공허 소켓' }, { id: 'start', label: '시작점' }
]);

/** Categories (분류) with the designer's colours; a node's cat picks its colour when nodes are coloured by category. */
export const CATEGORIES = Object.freeze([
    { id: 'none', label: '무속성', color: '#8d97a3' }, { id: 'str', label: '힘·생명력', color: '#ef5f67' },
    { id: 'int', label: '지능·보호막', color: '#5b9dff' }, { id: 'dex', label: '민첩·회피', color: '#52ca72' },
    { id: 'def', label: '방어', color: '#55c5dc' }, { id: 'attr', label: '능력치 (미분류)', color: '#b8c4d4' },
    { id: 'utility', label: '유틸리티', color: '#c3b38a' }, { id: 'minion', label: '소환수', color: '#a98be8' },
    { id: 'atk', label: '공격 위력', color: '#d4744e' }, { id: 'spell', label: '주문 위력', color: '#9d86e0' },
    { id: 'physical', label: '물리', color: '#d0aa82' }, { id: 'fire', label: '화염', color: '#ff6b3d' },
    { id: 'cold', label: '냉기', color: '#55c8ff' }, { id: 'lightning', label: '번개', color: '#f0d34e' },
    { id: 'chaos', label: '카오스', color: '#cc68ff' }, { id: 'elemental', label: '원소·모든 저항', color: '#f0a94b' },
    { id: 'ailment', label: '모든 상태 이상', color: '#e06d91' }, { id: 'devotion', label: '계시', color: '#ffd45f' },
    { id: 'mystique', label: '신비', color: '#d76cff' }, { id: 'cycle', label: '순환', color: '#50d7b2' },
    { id: 'resonance', label: '공명력', color: '#7fd0c8' }
]);
/** Older game categories read as the designer's (the v23 tree uses some of these). */
const CATEGORY_ALIASES = Object.freeze({ strength: 'str', intelligence: 'int', dexterity: 'dex', armor: 'def', evasion: 'dex',
    energyShield: 'int', melee: 'atk', projectile: 'atk', potion: 'atk', off: 'atk' });

export function categoryOf(node) {
    const id = CATEGORY_ALIASES[node.cat] || node.cat || 'none';
    return CATEGORIES.find(row => row.id === id) || CATEGORIES[0];
}

export const SHAPES = Object.freeze([
    { id: 'circle', label: '원', minimum: 3 }, { id: 'square', label: '사각형', minimum: 4 }, { id: 'triangle', label: '삼각형', minimum: 3 }
]);

const round2 = value => Math.round(value * 100) / 100;

let idCounter = 0;
/** A fresh node id (base 36 time and a counter, like the designer's n… ids). */
export function newNodeId(taken) {
    for (;;) {
        const id = `n${Date.now().toString(36)}${(idCounter++).toString(36)}`;
        if (!taken.has(id)) return id;
    }
}

/** A plain node of a type at a point (무속성, no options; the inspector or the bulk tools give it some). */
export function blankNode(id, type, point, extra = {}) {
    return { cat: 'none', id, x: round2(point.x), y: round2(point.y), type, name: (NODE_TYPES.find(row => row.id === type) || NODE_TYPES[0]).label,
        desc: '', mods: [], statAutoName: false, runtimeEffects: [], ...extra };
}

/** Points spread evenly along a closed outline (the designer's square and triangle: count points along the perimeter). */
function alongOutline(corners, count) {
    const sides = corners.map((point, index) => ({ from: point, to: corners[(index + 1) % corners.length] }));
    const lengths = sides.map(side => Math.hypot(side.to.x - side.from.x, side.to.y - side.from.y)), total = lengths.reduce((a, b) => a + b, 0);
    return Array.from({ length: count }, (unused, index) => {
        let distance = total * index / count, side = 0;
        while (distance > lengths[side] && side < sides.length - 1) { distance -= lengths[side]; side += 1; }
        const t = lengths[side] ? distance / lengths[side] : 0, { from, to } = sides[side];
        return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    });
}

/** The designer's 도형 배치: count points of a circle, square or triangle of radius size about a centre (first point at the top). */
export function shapePoints(shapeId, count, size, centre) {
    const shape = SHAPES.find(row => row.id === shapeId) || SHAPES[0];
    const n = Math.max(shape.minimum, Math.min(200, Math.round(Number(count) || 12))), r = Math.max(30, Math.min(5000, Number(size) || 300));
    const polygon = sides => Array.from({ length: sides }, (unused, index) => {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / sides;
        return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
    });
    const points = shape.id === 'circle' ? polygon(n)
        : alongOutline(shape.id === 'square' ? [{ x: -r / Math.SQRT2, y: -r / Math.SQRT2 }, { x: r / Math.SQRT2, y: -r / Math.SQRT2 },
            { x: r / Math.SQRT2, y: r / Math.SQRT2 }, { x: -r / Math.SQRT2, y: r / Math.SQRT2 }] : polygon(3), n);
    return points.map(point => ({ x: round2(centre.x + point.x), y: round2(centre.y + point.y) }));
}

/** Points turned about a centre (a shape placed upright on a turned view turns back by the view angle). */
export function turnAbout(points, centre, degrees) {
    const angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    return points.map(point => {
        const dx = point.x - centre.x, dy = point.y - centre.y;
        return { x: round2(centre.x + dx * cos - dy * sin), y: round2(centre.y + dx * sin + dy * cos) };
    });
}

export function centreOf(nodes) {
    const xs = nodes.map(node => Number(node.x)), ys = nodes.map(node => Number(node.y));
    return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/** Turns nodes about their centre (the designer's ↶15°/↷15°: + is clockwise on screen). */
export function rotateNodes(nodes, degrees) {
    const centre = centreOf(nodes), angle = degrees * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    nodes.forEach(node => {
        const dx = node.x - centre.x, dy = node.y - centre.y;
        node.x = round2(centre.x + dx * cos - dy * sin);
        node.y = round2(centre.y + dx * sin + dy * cos);
    });
}

/**
 * Mirrors nodes about their centre: horizontal swaps left and right, vertical swaps up and down. basis 'screen' flips as the
 * turned view shows them (viewAngle), 'tree' along the tree's own axes.
 */
export function mirrorNodes(nodes, axis, basis, viewAngle) {
    const centre = centreOf(nodes), view = basis === 'screen' ? (Number(viewAngle) || 0) * Math.PI / 180 : 0;
    const cos = Math.cos(view), sin = Math.sin(view);
    nodes.forEach(node => {
        const dx = node.x - centre.x, dy = node.y - centre.y;
        let sx = dx * cos - dy * sin, sy = dx * sin + dy * cos;
        if (axis === 'horizontal') sx = -sx; else sy = -sy;
        node.x = round2(centre.x + sx * cos + sy * sin);
        node.y = round2(centre.y - sx * sin + sy * cos);
    });
}

/**
 * 설계자에 없던 정리 도구(2026-10-28): 화면에서 보이는 대로(돌린 시점이면 그 방향으로) 가로 한 줄, 세로 한 줄로 맞추고, 같은 간격으로 벌리고,
 * 가운데를 둘러 같은 간격의 원으로 편다(지금 각도 순서를 지킨다).
 * @param {'rowH'|'rowV'|'spreadH'|'spreadV'|'circle'} action
 */
export function arrangeNodes(nodes, action, viewAngle) {
    if (nodes.length < 2) return;
    const angle = (Number(viewAngle) || 0) * Math.PI / 180, cos = Math.cos(angle), sin = Math.sin(angle);
    const toScreen = node => ({ node, x: node.x * cos - node.y * sin, y: node.x * sin + node.y * cos });
    const back = (row, x, y) => { row.node.x = round2(x * cos + y * sin); row.node.y = round2(-x * sin + y * cos); };
    const rows = nodes.map(toScreen), mean = key => rows.reduce((sum, row) => sum + row[key], 0) / rows.length;
    if (action === 'rowH') rows.forEach(row => back(row, row.x, mean('y')));
    else if (action === 'rowV') rows.forEach(row => back(row, mean('x'), row.y));
    else if (action === 'spreadH' || action === 'spreadV') {
        const key = action === 'spreadH' ? 'x' : 'y', sorted = rows.slice().sort((a, b) => a[key] - b[key]);
        const from = sorted[0][key], step = (sorted[sorted.length - 1][key] - from) / (sorted.length - 1);
        sorted.forEach((row, index) => back(row, key === 'x' ? from + step * index : row.x, key === 'y' ? from + step * index : row.y));
    } else if (action === 'circle') {
        const cx = mean('x'), cy = mean('y'), radius = rows.reduce((sum, row) => sum + Math.hypot(row.x - cx, row.y - cy), 0) / rows.length;
        const sorted = rows.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
        const start = Math.atan2(sorted[0].y - cy, sorted[0].x - cx);
        sorted.forEach((row, index) => { const t = start + index * Math.PI * 2 / sorted.length; back(row, cx + Math.cos(t) * radius, cy + Math.sin(t) * radius); });
    }
}

/** Links the nodes into a ring in their order round their centre (설계자의 도형 외곽 연결을 고른 노드에). Existing links stay. */
export function ringEdges(nodes) {
    const cx = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length, cy = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;
    const ids = nodes.slice().sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)).map(node => String(node.id));
    return outlineEdges(ids);
}

/** Moves nodes by a world step. */
export function nudgeNodes(nodes, dx, dy) {
    nodes.forEach(node => { node.x = round2(Number(node.x) + dx); node.y = round2(Number(node.y) + dy); });
}

const edgeKey = edge => [String(edge.a), String(edge.b)].sort().join('|');

/** What Ctrl+C keeps: the picked nodes and the links between them. */
export function copySelection(tree, ids) {
    const keep = new Set(ids.map(String));
    return { passiveTreeClipboard: 1, nodes: JSON.parse(JSON.stringify(tree.nodes.filter(node => keep.has(String(node.id))))),
        edges: tree.edges.filter(edge => keep.has(String(edge.a)) && keep.has(String(edge.b))).map(edge => ({ ...edge })) };
}

/** Puts copied nodes in with new ids, centred on a point; their links follow. Start nodes come in as plain ones (one start per class). @returns new ids */
export function pasteClipboard(tree, clipboard, at) {
    const taken = new Set(tree.nodes.map(node => String(node.id))), renamed = new Map(), centre = centreOf(clipboard.nodes);
    clipboard.nodes.forEach(source => {
        const id = newNodeId(taken);
        taken.add(id);
        renamed.set(String(source.id), id);
        const node = { ...JSON.parse(JSON.stringify(source)), id, x: round2(source.x - centre.x + at.x), y: round2(source.y - centre.y + at.y) };
        if (node.type === 'start') { node.type = 'minor'; delete node.startClassId; }
        tree.nodes.push(node);
    });
    const known = new Set(tree.edges.map(edgeKey));
    clipboard.edges.forEach(edge => {
        const next = { ...edge, a: renamed.get(String(edge.a)), b: renamed.get(String(edge.b)) };
        if (next.a && next.b && !known.has(edgeKey(next))) { tree.edges.push(next); known.add(edgeKey(next)); }
    });
    return [...renamed.values()];
}

/** Links each point to the next and the last back to the first (도형의 외곽 연결). */
export function outlineEdges(ids) {
    return ids.length < 2 ? [] : ids.map((id, index) => ({ a: id, b: ids[(index + 1) % ids.length] })).filter((edge, index, all) => ids.length > 2 || index === 0);
}

/**
 * The designer's 능력 프리셋 일괄 적용 on several nodes: replace all options, replace only the first, or add one.
 * @param {'replace'|'first'|'add'} mode
 */
export function applyEffectToNodes(nodes, effect, mode, syncEffects) {
    nodes.forEach(node => {
        const effects = (node.runtimeEffects || []).map(row => ({ statId: row.statId, value: Number(row.value) }));
        if (mode === 'replace') effects.splice(0, effects.length, { ...effect });
        else if (mode === 'first' && effects.length) effects[0] = { ...effect };
        else effects.push({ ...effect });
        syncEffects(node, effects);
    });
}
