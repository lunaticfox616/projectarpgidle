'use strict';

const SUPPORTED_TYPES = new Set([
    'minor', 'assist', 'normal', 'major', 'keystone', 'void', 'quatrefoil', 'start'
]);
const CUSTOM_ICON_PATTERN = /^assets\/ui\/passive-custom-icons\/[a-zA-Z0-9._-]+\.webp$/;

function validateNode(node, seenIds, knownStats, errors, warnings) {
    const id = String(node && node.id || '').trim();
    if (!id) return errors.push('ID가 없는 노드가 있습니다.');
    if (seenIds.has(id)) errors.push(`중복 노드 ID: ${id}`);
    seenIds.add(id);
    if (!Number.isFinite(Number(node.x)) || !Number.isFinite(Number(node.y))) errors.push(`좌표가 잘못되었습니다: ${id}`);
    if (!SUPPORTED_TYPES.has(node.type)) errors.push(`지원하지 않는 노드 종류: ${id}/${node.type}`);
    if (node.iconAsset && !CUSTOM_ICON_PATTERN.test(node.iconAsset)) errors.push(`커스텀 아이콘 경로가 잘못되었습니다: ${id}`);
    const effects = Array.isArray(node.runtimeEffects) ? node.runtimeEffects : [];
    effects.forEach((effect, index) => {
        if (!effect || !knownStats.has(effect.statId)) errors.push(`미지원 효과: ${id}/${effect && effect.statId || index}`);
        if (!Number.isFinite(Number(effect && effect.value))) errors.push(`효과 수치가 잘못되었습니다: ${id}/${index + 1}`);
    });
    const mayBeEmpty = ['start', 'void', 'keystone', 'quatrefoil'].includes(node.type) || node.intentionalNoEffect;
    if (!mayBeEmpty && effects.length === 0) warnings.push(`효과가 비어 있습니다: ${id}`);
}

function validateEdges(edges, nodeIds, errors) {
    const seenEdges = new Set();
    edges.forEach(edge => {
        const a = String(edge && edge.a || '');
        const b = String(edge && edge.b || '');
        if (!nodeIds.has(a) || !nodeIds.has(b)) return errors.push(`존재하지 않는 노드 연결: ${a || '?'} ↔ ${b || '?'}`);
        if (a === b) return errors.push(`자기 자신을 연결한 간선: ${a}`);
        const key = [a, b].sort().join('|');
        if (seenEdges.has(key)) errors.push(`중복 연결: ${a} ↔ ${b}`);
        seenEdges.add(key);
    });
}

function countDisconnectedNodes(tree, nodeIds) {
    const starts = tree.nodes.filter(node => node.type === 'start').map(node => String(node.id));
    if (starts.length === 0) return nodeIds.size;
    const graph = new Map([...nodeIds].map(id => [id, []]));
    tree.edges.forEach(edge => {
        const a = String(edge.a), b = String(edge.b);
        if (!graph.has(a) || !graph.has(b)) return;
        graph.get(a).push(b);
        graph.get(b).push(a);
    });
    const reached = new Set(starts), queue = starts.slice();
    for (let index = 0; index < queue.length; index += 1) {
        graph.get(queue[index]).forEach(next => {
            if (reached.has(next)) return;
            reached.add(next);
            queue.push(next);
        });
    }
    return nodeIds.size - reached.size;
}

function countExactOverlaps(nodes) {
    const positions = new Map();
    nodes.forEach(node => {
        const key = `${Number(node.x).toFixed(2)}:${Number(node.y).toFixed(2)}`;
        positions.set(key, (positions.get(key) || 0) + 1);
    });
    return [...positions.values()].filter(count => count > 1).reduce((sum, count) => sum + count, 0);
}

function validatePassiveTree(tree, knownStatIds) {
    const errors = [], warnings = [];
    if (!tree || !Array.isArray(tree.nodes) || !Array.isArray(tree.edges)) {
        return { valid: false, errors: ['nodes/edges 배열이 있는 패시브 트리가 필요합니다.'], warnings, summary: {} };
    }
    const knownStats = new Set(knownStatIds || []), nodeIds = new Set();
    tree.nodes.forEach(node => validateNode(node, nodeIds, knownStats, errors, warnings));
    validateEdges(tree.edges, nodeIds, errors);
    const disconnected = countDisconnectedNodes(tree, nodeIds);
    const overlaps = countExactOverlaps(tree.nodes);
    if (disconnected > 0) warnings.push(`시작점과 연결되지 않은 노드가 ${disconnected}개 있습니다.`);
    if (overlaps > 0) warnings.push(`정확히 같은 좌표에 겹친 노드가 ${overlaps}개 있습니다.`);
    return {
        valid: errors.length === 0,
        errors,
        warnings,
        summary: { nodes: tree.nodes.length, edges: tree.edges.length, disconnected, overlaps }
    };
}

function sanitizeIconName(value) {
    const safe = String(value || 'custom-icon').toLowerCase()
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return safe || 'custom-icon';
}

module.exports = { CUSTOM_ICON_PATTERN, SUPPORTED_TYPES, sanitizeIconName, validatePassiveTree };
