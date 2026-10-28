'use strict';

// 패시브 트리 배경 문양(2026-10-28 사용자: 노드 뒤 배경을 편집기와 게임 둘 다에, 패시브 트리 설계자 배경 문양으로).
// 문양 그림: 설계자 1.10.0의 기본 문양 46종(passive-tree-background-motifs.json, 설계자 화면에서 꺼낸 그대로)과 트리 파일의
// customBackgroundMotifs(설계자가 내보낸 사용자 문양). 배치: 트리 파일의 backgroundMotifs { id, motifId, x, y, size, rotation, opacity,
// visible, locked }. 설계자와 같은 뜻으로 문양 상자 200을 size로 늘리고 rotation(도)만큼 돌린다. 선은 문양 색, 굵기 1.25(문양 단위),
// solid 도형은 같은 색으로 fillOpacity(기본 0.07)만큼 채운다. 런타임(data/passive-tree-v22.js backgrounds)에는 쓰인 문양만 들어간다.
const BUILT_IN = require('./passive-tree-background-motifs.json');

function multiply([a, b, c, d, e, f], [a2, b2, c2, d2, e2, f2]) {
    return [a * a2 + c * b2, b * a2 + d * b2, a * c2 + c * d2, b * c2 + d * d2, a * e2 + c * f2 + e, b * e2 + d * f2 + f];
}

function rotation(degrees) {
    const radians = degrees * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
    return [cos, sin, -sin, cos, 0, 0];
}

/** One SVG transform function as a canvas matrix [a, b, c, d, e, f] (translate, scale and rotate: all the catalog uses). */
function functionMatrix(name, args) {
    if (name === 'translate') return [1, 0, 0, 1, args[0] || 0, args[1] || 0];
    if (name === 'scale') return [args[0], 0, 0, args[1] === undefined ? args[0] : args[1], 0, 0];
    if (name !== 'rotate') throw new Error(`배경 문양의 변환을 읽을 수 없습니다: ${name}`);
    if (args.length < 3) return rotation(args[0]);
    return multiply(multiply([1, 0, 0, 1, args[1], args[2]], rotation(args[0])), [1, 0, 0, 1, -args[1], -args[2]]);
}

/** An SVG transform list (applied right to left to a point, as SVG does) as one canvas matrix. */
function transformMatrix(text) {
    let matrix = [1, 0, 0, 1, 0, 0];
    for (const [, name, body] of String(text).matchAll(/([a-zA-Z]+)\(([^)]*)\)/g)) {
        matrix = multiply(matrix, functionMatrix(name, body.trim().split(/[\s,]+/).map(Number)));
    }
    return matrix.map(value => Math.round(value * 1e5) / 1e5);
}

function shapeOf(shape) {
    const out = { d: String(shape.d), solid: !!shape.solid };
    if (shape.fillOpacity !== undefined) out.fillOpacity = Number(shape.fillOpacity);
    if (shape.fillRule) out.fillRule = shape.fillRule;
    if (shape.strokeWidth !== undefined) out.strokeWidth = Number(shape.strokeWidth);
    if (shape.transform) out.m = transformMatrix(shape.transform);
    return out;
}

/** A motif ready to draw: path shapes only (the builder draws nothing else), transforms as matrices. */
function motifOf(definition) {
    return { id: String(definition.id), label: definition.label || String(definition.id), group: definition.group || 'custom',
        color: definition.color || '#a89a80', shapes: (definition.shapes || []).filter(shape => (shape.tag || 'path') === 'path' && shape.d).map(shapeOf) };
}

const BUILT_IN_MOTIFS = Object.freeze(BUILT_IN.map(motifOf));

/** Every motif a tree can place: the built-in ones and the tree's own (a tree's motif wins over a built-in one with its id). */
function motifCatalog(tree) {
    const catalog = Object.fromEntries(BUILT_IN_MOTIFS.map(motif => [motif.id, motif]));
    (Array.isArray(tree && tree.customBackgroundMotifs) ? tree.customBackgroundMotifs : []).filter(definition => definition && definition.id)
        .forEach(definition => { catalog[definition.id] = motifOf(definition); });
    return catalog;
}

const finite = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

/** The game's share: the placed, visible motifs whose drawing is known, with only those drawings. null when there are none. */
function runtimeBackgrounds(tree) {
    const catalog = motifCatalog(tree);
    const items = (Array.isArray(tree.backgroundMotifs) ? tree.backgroundMotifs : [])
        .filter(item => item && item.visible !== false && catalog[item.motifId]);
    if (!items.length) return null;
    const motifs = {};
    items.forEach(item => {
        const { color, shapes } = catalog[item.motifId];
        motifs[item.motifId] = { color, shapes };
    });
    return { motifs, items: items.map(item => ({ motif: item.motifId, x: finite(item.x, 0), y: finite(item.y, 0), size: Math.max(1, finite(item.size, 200)),
        rotation: finite(item.rotation, 0), opacity: Math.min(1, Math.max(0, finite(item.opacity, 1))) })) };
}

module.exports = { BUILT_IN_MOTIFS, motifCatalog, runtimeBackgrounds, transformMatrix };
