#!/usr/bin/env node
'use strict';

const fs = require('fs');

const START_CLASS_BY_NAME = Object.freeze({
    '비술사': 'occultist', '방랑자': 'wanderer', '성직자': 'cleric',
    '궁수': 'archer', '연금술사': 'alchemist', '전사': 'warrior'
});
const SPECIAL_CATEGORIES = new Set(['mystique', 'devotion', 'cycle']);

function readTree(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

function buildGraph(tree) {
    const graph = new Map(tree.nodes.map(node => [String(node.id), []]));
    tree.edges.forEach(edge => {
        const a = String(edge.a), b = String(edge.b);
        if (!graph.has(a) || !graph.has(b)) return;
        graph.get(a).push(b);
        graph.get(b).push(a);
    });
    return graph;
}

function normalizedAngle(node) {
    const angle = Math.atan2(Number(node.y) || 0, Number(node.x) || 0) * 180 / Math.PI;
    return angle < 0 ? angle + 360 : angle;
}

function isIntendedSpecial(node) {
    if (!SPECIAL_CATEGORIES.has(node.cat)) return false;
    const radius = Math.hypot(Number(node.x) || 0, Number(node.y) || 0);
    if (radius <= 450) return true;
    const angle = normalizedAngle(node);
    if (node.cat === 'mystique') return angle >= 180 && angle <= 250;
    if (node.cat === 'devotion') return angle >= 300 || angle <= 10;
    return angle >= 60 && angle <= 130;
}

function graphDistances(graph, startIds) {
    const distances = new Map(startIds.map(id => [id, 0])), queue = startIds.slice();
    for (let index = 0; index < queue.length; index += 1) {
        const current = queue[index], distance = distances.get(current);
        (graph.get(current) || []).forEach(next => {
            if (distances.has(next)) return;
            distances.set(next, distance + 1);
            queue.push(next);
        });
    }
    return distances;
}

function cutBranchSize(graph, startIds, keystoneId) {
    const blocked = new Set([keystoneId]), reached = new Set(startIds.filter(id => id !== keystoneId));
    const queue = [...reached];
    for (let index = 0; index < queue.length; index += 1) {
        (graph.get(queue[index]) || []).forEach(next => {
            if (blocked.has(next) || reached.has(next)) return;
            reached.add(next);
            queue.push(next);
        });
    }
    return [...graph.keys()].filter(id => !reached.has(id) && id !== keystoneId).length;
}

function summarize(tree) {
    const graph = buildGraph(tree);
    const starts = tree.nodes.filter(node => node.type === 'start');
    const startIds = starts.map(node => String(node.id));
    const distances = graphDistances(graph, startIds);
    const byType = Object.fromEntries([...new Set(tree.nodes.map(node => node.type))].sort()
        .map(type => [type, tree.nodes.filter(node => node.type === type).length]));
    const special = Object.fromEntries([...SPECIAL_CATEGORIES].map(cat => [cat, {
        total: tree.nodes.filter(node => node.cat === cat).length,
        intended: tree.nodes.filter(node => node.cat === cat && isIntendedSpecial(node)).length
    }]));
    const keystones = tree.nodes.filter(node => node.type === 'keystone').map(node => ({
        id: node.id, name: node.name, neighbors: (graph.get(String(node.id)) || []).length,
        gatedBranchNodes: cutBranchSize(graph, startIds, String(node.id))
    }));
    return {
        nodes: tree.nodes.length, edges: tree.edges.length, byType,
        starts: starts.map(node => ({ id: node.id, name: node.name, classId: START_CLASS_BY_NAME[node.name] || null,
            x: node.x, y: node.y, neighbors: (graph.get(String(node.id)) || []).length })),
        graph: { reached: distances.size, maxDistanceFromClassStart: Math.max(...distances.values()) },
        special, keystones
    };
}

function main() {
    const sourceFile = process.argv[2];
    if (!sourceFile) throw new Error('사용법: node scripts/audit-passive-tree-source.js <source.json>');
    console.log(JSON.stringify(summarize(readTree(sourceFile)), null, 2));
}

if (require.main === module) main();

module.exports = { buildGraph, graphDistances, isIntendedSpecial, normalizedAngle, readTree, summarize };
