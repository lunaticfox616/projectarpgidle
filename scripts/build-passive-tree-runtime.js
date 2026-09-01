#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { readTree } = require('./audit-passive-tree-source');
const { resolvePassiveNodeName } = require('./lib/passive-tree-naming');

const TYPE_RUNTIME = Object.freeze({
    minor: { kind: 'path', tier: 1 }, assist: { kind: 'assist', tier: 1 }, normal: { kind: 'node', tier: 2 },
    major: { kind: 'major', tier: 3 }, keystone: { kind: 'keystone', tier: 3 }, void: { kind: 'void', tier: 3 },
    quatrefoil: { kind: 'hub', tier: 3 }, start: { kind: 'start', tier: 0 }
});

function runtimeNode(node) {
    const runtime = TYPE_RUNTIME[node.type];
    if (!runtime) throw new Error(`지원하지 않는 노드 종류입니다: ${node.id}/${node.type}`);
    const effects = Array.isArray(node.runtimeEffects) ? node.runtimeEffects.map(effect => ({ stat: effect.statId, val: Number(effect.value) })) : [];
    const output = { id: String(node.id), x: Number(node.x), y: Number(node.y), sourceType: node.type,
        kind: runtime.kind, tier: runtime.tier, title: resolvePassiveNodeName(node), desc: node.desc || null,
        stat: effects[0] ? effects[0].stat : null, val: effects[0] ? effects[0].val : 0, effects };
    ['archetype', 'effectArchetype', 'startClassId', 'starWedgeMode', 'intentionalNoEffect', 'hiddenByKeystoneId', 'hiddenRouteNodeIds',
        'choiceGroup', 'keystoneEffectId', 'distanceFromClassStart', 'powerBand', 'specialVariation',
        'specialSynergyClass', 'activationRequirement', 'iconFamily', 'iconAsset'].forEach(key => {
        if (node[key] !== undefined) output[key] = node[key];
    });
    return output;
}

function appendConstellationNodes(nodes, edges) {
    Object.values(nodes).filter(node => node.starWedgeMode === 'constellation').forEach(hub => {
        const radius = Math.max(1, Math.hypot(hub.x, hub.y));
        const ux = hub.x / radius, uy = hub.y / radius;
        for (let lineIndex = 0; lineIndex < 4; lineIndex += 1) {
            const id = `star_constellation_${hub.id}_${lineIndex}`;
            const radialDistance = lineIndex === 3 ? 190 : 125;
            const tangentDistance = (lineIndex - 1.5) * 70;
            nodes[id] = {
                id, x: Math.round((hub.x + ux * radialDistance - uy * tangentDistance) * 100) / 100,
                y: Math.round((hub.y + uy * radialDistance + ux * tangentDistance) * 100) / 100,
                sourceType: 'star_option', kind: 'star_option', tier: lineIndex === 3 ? 3 : (lineIndex === 0 ? 1 : 2),
                title: '미장착 성률 옵션', desc: '외곽 성률에 별쐐기를 장착하면 이 패시브가 나타납니다.',
                stat: null, val: 0, effects: [], requiresStarWedgeSocketNodeId: hub.id,
                starWedgeLineIndex: lineIndex, starWedgeOptionActive: false
            };
            edges.push({ from: hub.id, to: id });
        }
    });
}

function runtimeEdge(edge, nodes) {
    const output = { from: String(edge.a), to: String(edge.b) };
    if (!edge.hidden) return output;
    const keystone = [nodes[output.from], nodes[output.to]].find(node => node && node.kind === 'keystone');
    if (keystone) output.requiresAllocatedNodeId = keystone.id;
    return output;
}

function buildRuntimeTree(tree) {
    const nodes = Object.fromEntries(tree.nodes.map(node => [String(node.id), runtimeNode(node)]));
    const edges = tree.edges.map(edge => runtimeEdge(edge, nodes));
    appendConstellationNodes(nodes, edges);
    const classStarts = Object.fromEntries(Object.values(nodes).filter(node => node.startClassId)
        .map(node => [node.startClassId, node.id]));
    return { version: 22, nodes, edges, classStarts };
}

function writeRuntimeModule(file, runtime) {
    const source = serializeRuntimeModule(runtime);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, source, 'utf8');
}

function serializeRuntimeModule(runtime) {
    const serialized = JSON.stringify(runtime);
    return `'use strict';\n\nconst PASSIVE_TREE_V22 = Object.freeze(${serialized});\n\n` +
        `safeExposeData({ PASSIVE_TREE_V22 });\n`;
}

function main() {
    const [assignedFile, outputFile] = process.argv.slice(2);
    if (!assignedFile || !outputFile) throw new Error('사용법: node scripts/build-passive-tree-runtime.js <assigned.json> <output.js>');
    const runtime = buildRuntimeTree(readTree(assignedFile));
    writeRuntimeModule(outputFile, runtime);
    console.log(JSON.stringify({ nodes: Object.keys(runtime.nodes).length, edges: runtime.edges.length,
        classStarts: runtime.classStarts, bytes: fs.statSync(outputFile).size }, null, 2));
}

if (require.main === module) main();

module.exports = { buildRuntimeTree, runtimeNode, runtimeEdge, serializeRuntimeModule, writeRuntimeModule };
