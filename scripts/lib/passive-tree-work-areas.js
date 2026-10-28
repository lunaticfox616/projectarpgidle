'use strict';

// 구역 작업(2026-10-28 사용자: 직업 구역별로 따로 작업해서 적용하고 파일로 만든다). 구역은 직업 여섯 조각과 그 안쪽 "가운데"(가운데
// 키스톤, 프리즘, 공허 안쪽)의 일곱이다. 조각은 그 트리의 직업 시작점을 따른다(areaLayout, 사용자: 설계자에서 직업 자리를 바꾼 파일). 지금
// 게임 트리는 예전 고정 60° 조각(complete-passive-tree-options zoneForPosition)과 똑같이 나뉜다.
// 구역 파일 { passiveTreeArea: 1, area, label, layout, nodes, edges, backgroundMotifs, customBackgroundMotifs }: 그 구역의 노드, 한쪽 끝이라도
// 그 구역에 닿는 연결, 가운데가 그 구역에 있는 배경 문양, 나눈 자리. 합치기는 대상 트리에서 그 구역의 노드와 문양을 빼고 파일의 것을 넣는데,
// 직업 배치가 다른 트리에는 넣지 않는다(자리가 어긋나 다른 구역과 겹치고 이어지지 않는다).

/** Just inside the ring of void sockets (radius about 1400) of the game tree: the core keystones, the prism and the void lie within. */
const CENTRE_RADIUS = 1300;
/** The game tree's start ring, where CENTRE_RADIUS was measured; a tree with a smaller or larger ring scales its centre with it. */
const START_RADIUS = 3240;
const AREAS = Object.freeze([
    { id: 'warrior', label: '전사' }, { id: 'wanderer', label: '방랑자' }, { id: 'archer', label: '궁수' },
    { id: 'alchemist', label: '연금술사' }, { id: 'occultist', label: '비술사' }, { id: 'cleric', label: '성직자' }, { id: 'centre', label: '가운데' }
]);
const AREA_IDS = new Set(AREAS.map(area => area.id));
const CLASS_BY_LABEL = new Map(AREAS.filter(area => area.id !== 'centre').map(area => [area.label, area.id]));
const CLASS_IDS = new Set(CLASS_BY_LABEL.values());

const angleOf = point => (Math.atan2(Number(point.y) || 0, Number(point.x) || 0) * 180 / Math.PI + 360) % 360;
const turn = (from, to) => (to - from + 360) % 360;

/** Each class from halfway to the start before it up to halfway to the next, in whole degrees (the game's starts sit a hair off 30°, 90°...). */
function sectorsAround(starts) {
    const sorted = starts.slice().sort((a, b) => a.angle - b.angle);
    return sorted.map((start, index) => {
        const before = sorted[(index + sorted.length - 1) % sorted.length], after = sorted[(index + 1) % sorted.length];
        const from = Math.round(before.angle + turn(before.angle, start.angle) / 2) % 360;
        return { id: start.id, from, to: Math.round(start.angle + turn(start.angle, after.angle) / 2) % 360 };
    });
}

/** The game tree's split, for a tree without all six class starts. */
const FIXED_LAYOUT = Object.freeze({ centreRadius: CENTRE_RADIUS, startRadius: START_RADIUS,
    sectors: sectorsAround(['cleric', 'warrior', 'wanderer', 'archer', 'alchemist', 'occultist'].map((id, index) => ({ id, angle: 30 + index * 60 }))) });

/** A start's class: startClassId, or its name in a designer file (전사, 궁수...). */
const startClassOf = node => node.startClassId || CLASS_BY_LABEL.get(String(node.name || '').trim());

const radiusOf = point => Math.hypot(Number(point.x) || 0, Number(point.y) || 0);

/**
 * The centre line: halfway between the innermost node of the class plans drawn in the designer (planning regions focused on a
 * class start) and the next node in, when the plans begin near the usual place; else the game's centre scaled to this start ring.
 */
function centreRadiusOf(tree, starts, startRadius) {
    const scaled = Math.round(CENTRE_RADIUS * startRadius / START_RADIUS);
    const startIds = new Set([...starts.values()].map(node => String(node.id))), byId = new Map(tree.nodes.map(node => [String(node.id), node]));
    const planned = (tree.planningRegions || []).filter(region => startIds.has(String(region.focusNodeId)))
        .flatMap(region => region.nodeIds || []).map(id => byId.get(String(id))).filter(Boolean).map(radiusOf);
    const edge = planned.length ? Math.min(...planned) : 0;
    if (edge < scaled * 0.5 || edge > scaled * 1.5) return scaled;
    const inside = tree.nodes.map(radiusOf).filter(radius => radius < edge - 1);
    return Math.round(inside.length ? (edge + Math.max(...inside)) / 2 : edge - 1);
}

/**
 * Where this tree's zones lie: each class owns the slice around its own start, and the centre follows the tree (centreRadiusOf).
 * @returns {{ centreRadius: number, startRadius: number, sectors: { id: string, from: number, to: number }[] }}
 */
function areaLayout(tree) {
    const starts = new Map();
    (tree.nodes || []).filter(node => node.type === 'start').forEach(node => {
        const id = startClassOf(node);
        if (CLASS_IDS.has(id) && !starts.has(id)) starts.set(id, node);
    });
    if (starts.size < CLASS_IDS.size) return FIXED_LAYOUT;
    const radii = [...starts.values()].map(radiusOf).sort((a, b) => a - b);
    const startRadius = Math.round((radii[2] + radii[3]) / 2);
    return { centreRadius: centreRadiusOf(tree, starts, startRadius), startRadius,
        sectors: sectorsAround([...starts].map(([id, node]) => ({ id, angle: angleOf(node) }))) };
}

function areaOf(point, layout = FIXED_LAYOUT) {
    if (radiusOf(point) < layout.centreRadius) return 'centre';
    const angle = Math.round(angleOf(point) * 1e6) / 1e6;
    return (layout.sectors.find(row => turn(row.from, angle) < turn(row.from, row.to)) || layout.sectors[0]).id;
}

function placeText(layout, area) {
    if (area === 'centre') return `가운데 반지름 ${layout.centreRadius}`;
    const sector = layout.sectors.find(row => row.id === area);
    return sector ? `${sector.from}°부터 ${sector.to}°` : '자리 없음';
}

/** The same area in the same place: its slice within 2° at both ends and the centre within 5%. */
function samePlace(a, b, area) {
    const close = (x, y) => Math.abs(((x - y + 540) % 360) - 180) <= 2;
    const one = a.sectors.find(row => row.id === area), two = b.sectors.find(row => row.id === area);
    if (Math.abs(a.centreRadius - b.centreRadius) > b.centreRadius * 0.05) return false;
    return area === 'centre' || !!(one && two && close(one.from, two.from) && close(one.to, two.to));
}

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function areaLabel(area) {
    const entry = AREAS.find(row => row.id === area);
    if (!entry) throw new Error(`알 수 없는 구역입니다: ${area}`);
    return entry.label;
}

/** One area of a tree as a file of its own (nothing in the tree changes). */
function extractArea(tree, area) {
    const label = areaLabel(area), layout = areaLayout(tree);
    const nodes = tree.nodes.filter(node => areaOf(node, layout) === area), ids = new Set(nodes.map(node => String(node.id)));
    const motifs = (tree.backgroundMotifs || []).filter(item => areaOf(item, layout) === area), used = new Set(motifs.map(item => item.motifId));
    return clone({ passiveTreeArea: 1, area, label, layout, nodes, edges: tree.edges.filter(edge => ids.has(String(edge.a)) || ids.has(String(edge.b))),
        backgroundMotifs: motifs, customBackgroundMotifs: (tree.customBackgroundMotifs || []).filter(definition => used.has(definition.id)) });
}

/** An incoming id another area already uses gets the area's suffix; the piece's links follow. */
function freeIncomingIds(piece, kept, report) {
    const renamed = new Map();
    piece.nodes.forEach(node => {
        const id = String(node.id);
        if (!kept.has(id)) return;
        let next = `${id}_${piece.area}`;
        for (let count = 2; kept.has(next); count++) next = `${id}_${piece.area}${count}`;
        renamed.set(id, next);
        node.id = next;
        report.renamed.push(`${id} → ${next}`);
    });
    piece.edges.forEach(edge => {
        if (renamed.has(String(edge.a))) edge.a = renamed.get(String(edge.a));
        if (renamed.has(String(edge.b))) edge.b = renamed.get(String(edge.b));
    });
}

const edgeKey = edge => [String(edge.a), String(edge.b)].sort().join('|');

/** The file's entries where the same ids stood in the area (the saved file keeps its order), new ones at the end. */
function replaceInPlace(list, incomingList, inArea) {
    const incoming = new Map(incomingList.map(entry => [String(entry.id), entry]));
    return list.flatMap(entry => {
        if (!inArea(entry)) return [entry];
        const replacement = incoming.get(String(entry.id));
        incoming.delete(String(entry.id));
        return replacement ? [replacement] : [];
    }).concat([...incoming.values()]);
}

/** Links outside the area stay; the area's links come from the file (in their old place when they were there) when both ends exist. */
function mergeEdges(target, piece, ids, report, layout) {
    const outside = new Set(target.nodes.filter(node => areaOf(node, layout) !== piece.area).map(node => String(node.id)));
    const fromPiece = new Map(piece.edges.map(edge => [edgeKey(edge), edge])), seen = new Set(), edges = [];
    const add = edge => {
        const key = edgeKey(edge);
        if (!ids.has(String(edge.a)) || !ids.has(String(edge.b)) || String(edge.a) === String(edge.b) || seen.has(key)) return false;
        seen.add(key);
        edges.push(edge);
        return true;
    };
    target.edges.forEach(edge => {
        const inside = !outside.has(String(edge.a)) || !outside.has(String(edge.b));
        if (!inside) add(edge);
        else if (fromPiece.has(edgeKey(edge))) add(fromPiece.get(edgeKey(edge)));
    });
    piece.edges.forEach(edge => { if (!seen.has(edgeKey(edge)) && !add(edge)) report.droppedLinks++; });
    return edges;
}

function mergeMotifs(tree, piece, layout) {
    const motifs = replaceInPlace(tree.backgroundMotifs || [], piece.backgroundMotifs || [], item => areaOf(item, layout) === piece.area);
    const definitions = (tree.customBackgroundMotifs || []).slice(), known = new Set(definitions.map(definition => definition.id));
    (piece.customBackgroundMotifs || []).forEach(definition => { if (!known.has(definition.id)) definitions.push(definition); });
    return { motifs, definitions };
}

/**
 * The tree with one area replaced by an area file: that area's nodes and motifs go, the file's come in, links outside stay and the
 * file's links join when both ends exist. A piece cut from a tree whose classes sit elsewhere is refused (files made before
 * layouts were stored carry the fixed split). @returns {{ tree: object, report: object }} report: area, label, removed, added,
 * renamed ids, links dropped for a missing end.
 */
function mergeArea(target, source) {
    if (!source || source.passiveTreeArea !== 1 || !Array.isArray(source.nodes) || !Array.isArray(source.edges)) {
        throw new Error('구역 파일이 아닙니다. 편집기의 구역 내보내기로 만든 파일을 고르세요.');
    }
    const tree = clone(target), piece = clone(source), label = areaLabel(piece.area), layout = areaLayout(tree);
    const from = piece.layout || FIXED_LAYOUT;
    if (!samePlace(from, layout, piece.area)) {
        throw new Error(`${label} 구역의 자리가 넣을 트리와 다릅니다(가져온 쪽 ${placeText(from, piece.area)}, 넣을 트리 ${placeText(layout, piece.area)}). `
            + '직업 배치가 다른 트리에는 구역만 옮길 수 없습니다. 그 배치로 작업하려면 트리 전체를 파일 불러오기로 여세요.');
    }
    const report = { area: piece.area, label, removed: 0, added: piece.nodes.length, renamed: [], droppedLinks: 0 };
    const keptIds = new Set(tree.nodes.filter(node => areaOf(node, layout) !== piece.area).map(node => String(node.id)));
    report.removed = tree.nodes.length - keptIds.size;
    freeIncomingIds(piece, keptIds, report);
    const nodes = replaceInPlace(tree.nodes, piece.nodes, node => areaOf(node, layout) === piece.area), ids = new Set(nodes.map(node => String(node.id)));
    tree.edges = mergeEdges(tree, piece, ids, report, layout);
    tree.nodes = nodes;
    if (Array.isArray(tree.allocated)) tree.allocated = tree.allocated.filter(id => ids.has(String(id)));
    const { motifs, definitions } = mergeMotifs(tree, piece, layout);
    if (motifs.length || tree.backgroundMotifs) tree.backgroundMotifs = motifs;
    if (definitions.length) tree.customBackgroundMotifs = definitions;
    return { tree, report };
}

module.exports = { AREAS, AREA_IDS, CENTRE_RADIUS, START_RADIUS, areaLayout, areaOf, extractArea, mergeArea };
