#!/usr/bin/env node
'use strict';

// Exports of modules/ that no other module, tool or test imports.
//   node scripts/report-unused-exports.js            summary and the dead list
//   node scripts/report-unused-exports.js --json     everything as JSON
// "dead": the name is not read anywhere, its own file included. "local": only its own file reads it, so the export
// keyword alone is unused. A data table that modules/data/entries.json hands to the classic runtime counts as used.
const fs = require('node:fs');
const path = require('node:path');
const { readGraph, ROOT } = require('./lib/module-graph');

function outsideImporters() {
    const used = new Map(), whole = new Set();
    const note = (file, names) => { if (!used.has(file)) used.set(file, new Set()); names.forEach(name => used.get(file).add(name)); };
    const scan = dir => {
        for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
            const file = `${dir}/${entry.name}`;
            if (entry.isDirectory()) { if (entry.name !== 'node_modules') scan(file); continue; }
            if (!/\.(js|cjs|mjs)$/.test(entry.name)) continue;
            const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
            // Tools load modules with import() or a static import; either way the whole module may be read by name later.
            for (const match of text.matchAll(/['"`]([^'"`\n]*modules\/[^'"`\n]+\.mjs)['"`]/g)) {
                const target = match[1].replace(/^.*?modules\//, 'modules/');
                whole.add(target); note(target, []);
            }
        }
    };
    ['scripts', 'tests'].forEach(scan);
    return { whole };
}

function classicDataNames() {
    const entries = JSON.parse(fs.readFileSync(path.join(ROOT, 'modules/data/entries.json'), 'utf8'));
    return new Map(entries.map(entry => [entry.source, new Set(entry.names)]));
}

function usedNames(graph) {
    const used = new Map(), whole = new Set(outsideImporters().whole);
    const mark = (file, name) => { if (!used.has(file)) used.set(file, new Set()); used.get(file).add(name); };
    for (const node of graph.values()) for (const imported of node.imports) {
        if (imported.whole) whole.add(imported.source);
        imported.names.forEach(name => mark(imported.source, name));
    }
    for (const [file, names] of classicDataNames()) names.forEach(name => mark(file, name));
    return { used, whole };
}

function localReads(node, name, local) {
    // The declaration itself is one occurrence; any other whole-word occurrence is a read inside the file.
    // A property read (obj.name) is not a read of this binding; a spread (...name) is.
    const pattern = new RegExp(`(?<![\\w$])(?<!(?:^|[^.])\\.)${local.replace(/[$]/g, '\\$')}(?![\\w$])`, 'g');
    return (node.text.match(pattern) || []).length - 1;
}

function report() {
    const graph = readGraph(), { used, whole } = usedNames(graph);
    const rows = [];
    for (const node of graph.values()) {
        if (/-classic\.mjs$/.test(node.id) || whole.has(node.id)) continue;   // adapters are entries; namespace-read modules are opaque
        for (const [name, info] of node.exports) {
            if ((used.get(node.id) || new Set()).has(name) || info.from) continue;
            rows.push({ file: node.id, name, line: info.line, kind: localReads(node, name, info.local) > 0 ? 'local' : 'dead' });
        }
    }
    return { modules: graph.size, exports: Array.from(graph.values()).reduce((sum, node) => sum + node.exports.size, 0), rows };
}

if (require.main === module) {
    const result = report();
    if (process.argv.includes('--json')) { console.log(JSON.stringify(result, null, 1)); return; }
    const dead = result.rows.filter(row => row.kind === 'dead'), local = result.rows.filter(row => row.kind === 'local');
    console.log(`modules ${result.modules}, exports ${result.exports}: dead ${dead.length}, export keyword unused ${local.length}`);
    for (const row of dead) console.log(`dead  ${row.file}:${row.line}  ${row.name}`);
}
module.exports = { report };
