// 함께 편집(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에 작업, 원격)의 공용 규칙. 편집기(together.js)와 서버
// (scripts/lib/passive-together-room.js)가 같은 함수로 트리의 바뀐 곳을 조각으로 나누고(diffTree) 적용한다(applyOps).
// 조각은 고친 단위 하나다: 노드는 바뀐 칸만(같은 노드의 다른 칸을 둘이 고쳐도 둘 다 남는다), 연결과 배경 문양과 나머지 최상위 값은 통째로.
//   { kind: 'node', id, set: { 칸: 값 }, unset: [칸], full }  full은 그 노드 전체(다른 사람이 지운 노드를 고치면 다시 생긴다)
//   { kind: 'nodeRemove', id }  { kind: 'edge', key, value }  { kind: 'edgeRemove', key }
//   { kind: 'motif', id, value }  { kind: 'motifRemove', id }  { kind: 'meta', key, value }  value가 undefined면 그 값을 지운다
// 조각마다 keyOf가 겹침을 가리는 열쇠를 준다(노드 칸은 'n:id:칸', 노드 전체는 'n:id').

export const edgeKey = edge => [String(edge.a), String(edge.b)].sort().join('|');
const LISTS = new Set(['nodes', 'edges', 'backgroundMotifs']);
const clone = value => (value === undefined ? undefined : JSON.parse(JSON.stringify(value)));

/** What the other side holds, entity by entity, as JSON text (the base a diff is taken against). */
export function snapshotOf(tree) {
    return {
        nodes: new Map(tree.nodes.map(node => [String(node.id), JSON.stringify(node)])),
        edges: new Map(tree.edges.map(edge => [edgeKey(edge), JSON.stringify(edge)])),
        motifs: new Map((tree.backgroundMotifs || []).map(item => [String(item.id), JSON.stringify(item)])),
        meta: new Map(Object.keys(tree).filter(key => !LISTS.has(key)).map(key => [key, JSON.stringify(tree[key])]))
    };
}

function nodeOps(tree, base) {
    const ops = [], seen = new Set();
    tree.nodes.forEach(node => {
        const id = String(node.id), json = JSON.stringify(node), before = base.nodes.get(id);
        seen.add(id);
        if (before === json) return;
        if (before === undefined) return ops.push({ kind: 'node', id, set: clone(node), unset: [], full: clone(node) });
        const old = JSON.parse(before), set = {};
        Object.keys(node).forEach(field => { if (JSON.stringify(node[field]) !== JSON.stringify(old[field])) set[field] = clone(node[field]); });
        const unset = Object.keys(old).filter(field => !(field in node));
        // The same fields in another order are the same node.
        if (Object.keys(set).length || unset.length) ops.push({ kind: 'node', id, set, unset, full: clone(node) });
    });
    base.nodes.forEach((json, id) => { if (!seen.has(id)) ops.push({ kind: 'nodeRemove', id }); });
    return ops;
}

function wholeOps(items, base, keyOfItem, kind) {
    const ops = [], seen = new Set();
    items.forEach(item => {
        const key = keyOfItem(item), json = JSON.stringify(item);
        seen.add(key);
        if (base.get(key) !== json) ops.push(kind === 'edge' ? { kind, key, value: clone(item) } : { kind, id: key, value: clone(item) });
    });
    base.forEach((json, key) => { if (!seen.has(key)) ops.push(kind === 'edge' ? { kind: 'edgeRemove', key } : { kind: 'motifRemove', id: key }); });
    return ops;
}

function metaOps(tree, base) {
    const ops = [], keys = new Set([...Object.keys(tree).filter(key => !LISTS.has(key)), ...base.meta.keys()]);
    keys.forEach(key => {
        const json = JSON.stringify(tree[key]);
        if (json !== base.meta.get(key)) ops.push({ kind: 'meta', key, value: clone(tree[key]) });
    });
    return ops;
}

/** Everything that differs between the tree and the base, as ops (an empty list when they match). */
export function diffTree(tree, base) {
    return [...nodeOps(tree, base), ...wholeOps(tree.edges, base.edges, edgeKey, 'edge'),
        ...wholeOps(tree.backgroundMotifs || [], base.motifs, item => String(item.id), 'motif'), ...metaOps(tree, base)];
}

/** A node in the base after a field op: its fields changed one by one (the full copy only when the base never had it). */
function advancedNode(json, op) {
    if (json === undefined) return JSON.stringify(op.full);
    const node = JSON.parse(json);
    Object.entries(op.set).forEach(([field, value]) => { node[field] = value; });
    op.unset.forEach(field => delete node[field]);
    return JSON.stringify(node);
}

/** The base after these ops (what the other side holds once they land). */
export function advanceSnapshot(base, ops) {
    ops.forEach(op => {
        if (op.kind === 'node') base.nodes.set(op.id, advancedNode(base.nodes.get(op.id), op));
        else if (op.kind === 'nodeRemove') base.nodes.delete(op.id);
        else if (op.kind === 'edge') base.edges.set(op.key, JSON.stringify(op.value));
        else if (op.kind === 'edgeRemove') base.edges.delete(op.key);
        else if (op.kind === 'motif') base.motifs.set(op.id, JSON.stringify(op.value));
        else if (op.kind === 'motifRemove') base.motifs.delete(op.id);
        else if (op.kind === 'meta') base.meta.set(op.key, JSON.stringify(op.value));
    });
}

/** The keys an op touches: a node field, or the whole entity. */
export function keysOf(op) {
    if (op.kind === 'node') return Object.keys(op.set).concat(op.unset).map(field => `n:${op.id}:${field}`);
    if (op.kind === 'nodeRemove') return [`n:${op.id}`];
    if (op.kind === 'edge' || op.kind === 'edgeRemove') return [`e:${op.key}`];
    if (op.kind === 'motif' || op.kind === 'motifRemove') return [`m:${op.id}`];
    return [`t:${op.key}`];
}

function applyNodeOp(tree, index, op) {
    const node = index.get(op.id);
    if (!node) {
        const added = clone(op.full);
        tree.nodes.push(added);
        index.set(op.id, added);
        return true;
    }
    Object.entries(op.set).forEach(([field, value]) => { node[field] = clone(value); });
    op.unset.forEach(field => delete node[field]);
    return false;
}

function applyListOp(list, keyOfItem, key, value) {
    const at = list.findIndex(item => keyOfItem(item) === key);
    if (value === undefined) { if (at >= 0) list.splice(at, 1); return; }
    if (at >= 0) list[at] = clone(value);
    else list.push(clone(value));
}

/**
 * Applies ops to the tree in place: node objects keep their identity when only fields change (the canvas keeps drawing them).
 * @returns {{ structure: boolean, motifs: boolean, nodeIds: Set<string>, metaKeys: Set<string> }} structure: nodes or links came or went, or a
 * top-level value changed (metaKeys names which).
 */
export function applyOps(tree, ops) {
    const index = new Map(tree.nodes.map(node => [String(node.id), node])), result = { structure: false, motifs: false, nodeIds: new Set(), metaKeys: new Set() };
    ops.forEach(op => {
        if (op.kind === 'node') {
            if (applyNodeOp(tree, index, op)) result.structure = true;
            result.nodeIds.add(op.id);
        } else if (op.kind === 'nodeRemove') {
            tree.nodes = tree.nodes.filter(node => String(node.id) !== op.id);
            index.delete(op.id);
            // A link someone else tied to this node meanwhile goes with it (2026-11-01: such a link, invisible, blocked 원본 저장 with
            // '존재하지 않는 노드 연결').
            tree.edges = tree.edges.filter(edge => String(edge.a) !== op.id && String(edge.b) !== op.id);
            result.structure = true;
        } else if (op.kind === 'edge' || op.kind === 'edgeRemove') {
            // A link to a node this tree no longer has is dropped instead of kept (the node went in an earlier batch).
            const whole = op.kind === 'edge' && op.value && index.has(String(op.value.a)) && index.has(String(op.value.b));
            applyListOp(tree.edges, edgeKey, op.key, whole ? op.value : undefined);
            result.structure = true;
        } else if (op.kind === 'motif' || op.kind === 'motifRemove') {
            tree.backgroundMotifs = tree.backgroundMotifs || [];
            applyListOp(tree.backgroundMotifs, item => String(item.id), op.id, op.kind === 'motif' ? op.value : undefined);
            result.motifs = true;
        } else if (op.kind === 'meta') {
            if (op.value === undefined) delete tree[op.key];
            else tree[op.key] = clone(op.value);
            result.structure = true;
            result.metaKeys.add(op.key);
        }
    });
    return result;
}

const KINDS = new Set(['node', 'nodeRemove', 'edge', 'edgeRemove', 'motif', 'motifRemove', 'meta']);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const safeKey = key => typeof key === 'string' && !UNSAFE_KEYS.has(key);

function validNodeOp(op) {
    return !!(op.set && typeof op.set === 'object' && Array.isArray(op.unset) && op.full && typeof op.full === 'object'
        && Object.keys(op.set).every(safeKey) && op.unset.every(safeKey));
}

/** A light check of ops from the network (shape only; the values are whatever the editor allows). */
export function validOps(ops) {
    return Array.isArray(ops) && ops.every(op => op && KINDS.has(op.kind) && (op.kind !== 'node' || validNodeOp(op))
        && (op.kind !== 'meta' || (safeKey(op.key) && !LISTS.has(op.key))));
}
