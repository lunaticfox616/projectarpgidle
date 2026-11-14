'use strict';

// The import graph of modules/, read from the sources. Used by the unused-export report (scripts/report-unused-exports.js)
// and the architecture check's layer and cycle rules.
const fs = require('node:fs');
const path = require('node:path');
const espree = require('espree');

const ROOT = path.resolve(__dirname, '../..');
const MODULE_DIR = path.join(ROOT, 'modules');

function listSources(dir = MODULE_DIR, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) listSources(full, out);
        else if (entry.name.endsWith('.mjs')) out.push(full);
    }
    return out;
}

const rel = file => path.relative(ROOT, file).split(path.sep).join('/');

function declaredNames(declaration) {
    if (!declaration) return [];
    if (declaration.id) return [declaration.id.name];
    return (declaration.declarations || []).flatMap(row => patternNames(row.id));
}

function patternNames(pattern) {
    if (!pattern) return [];
    if (pattern.type === 'Identifier') return [pattern.name];
    if (pattern.type === 'ObjectPattern') return pattern.properties.flatMap(prop => patternNames(prop.value || prop.argument));
    if (pattern.type === 'ArrayPattern') return pattern.elements.flatMap(patternNames);
    if (pattern.type === 'AssignmentPattern') return patternNames(pattern.left);
    if (pattern.type === 'RestElement') return patternNames(pattern.argument);
    return [];
}

function resolveImport(from, request) {
    return request.startsWith('.') ? rel(path.resolve(path.dirname(path.join(ROOT, from)), request)) : null;
}

/** One module: its exports (name → line), what it imports from whom, and the names it re-exports. */
function readModule(file) {
    const id = rel(file), text = fs.readFileSync(file, 'utf8');
    const ast = espree.parse(text, { ecmaVersion: 'latest', sourceType: 'module', loc: true });
    const node = { id, text, exports: new Map(), imports: [], reexportAll: [] };
    for (const statement of ast.body) readStatement(node, statement);
    return node;
}

function readStatement(node, statement) {
    const source = statement.source ? resolveImport(node.id, statement.source.value) : null;
    if (statement.type === 'ImportDeclaration' && source) {
        const whole = statement.specifiers.some(spec => spec.type === 'ImportNamespaceSpecifier');
        node.imports.push({ source, whole, names: statement.specifiers.filter(spec => spec.type !== 'ImportNamespaceSpecifier')
            .map(spec => spec.type === 'ImportDefaultSpecifier' ? 'default' : spec.imported.name) });
    } else if (statement.type === 'ExportAllDeclaration' && source) {
        node.reexportAll.push(source);
        node.imports.push({ source, whole: true, names: [] });
    } else if (statement.type === 'ExportNamedDeclaration') {
        const line = statement.loc.start.line;
        for (const name of declaredNames(statement.declaration)) node.exports.set(name, { line, local: name, declared: true });
        for (const spec of statement.specifiers) node.exports.set(spec.exported.name, { line, local: spec.local.name, from: source });
        if (source) node.imports.push({ source, whole: false, names: statement.specifiers.map(spec => spec.local.name) });
    } else if (statement.type === 'ExportDefaultDeclaration') node.exports.set('default', { line: statement.loc.start.line, local: 'default', declared: true });
}

/** Every module keyed by repo-relative path. */
function readGraph() {
    const graph = new Map();
    for (const file of listSources()) { const node = readModule(file); graph.set(node.id, node); }
    return graph;
}

/** The top folder under modules/ ("domain", "ui", ...); adapters and first-wave modules at the top level are "entry". */
function layerOf(id) {
    const parts = id.split('/');
    return parts.length > 2 ? parts[1] : 'entry';
}

// The allowed direction (AGENTS.md section 2): a module imports only from its own layer or one earlier in this list.
const LAYER_ORDER = ['data', 'common', 'browser', 'state', 'persistence', 'domain', 'combat', 'rendering', 'ui', 'application', 'entry'];
// Imports that went the other way when the rule was added (2026-11-15). The list may only shrink.
const KNOWN_BACKWARD_IMPORTS = new Set([
    'modules/domain/player-ehp.mjs -> modules/combat/core-hit-math.mjs',
    'modules/ui/battle-presentation.mjs -> modules/application/battle-presentation-loop.mjs'
]);

function importCycles(graph) {
    // Tarjan's strongly connected components; a component of two or more modules is a cycle.
    const index = new Map(), low = new Map(), onStack = new Set(), stack = [], cycles = [];
    let next = 0;
    const visit = id => {
        index.set(id, next); low.set(id, next); next++; stack.push(id); onStack.add(id);
        for (const imported of graph.get(id).imports) {
            const target = imported.source;
            if (!graph.has(target)) continue;
            if (!index.has(target)) { visit(target); low.set(id, Math.min(low.get(id), low.get(target))); }
            else if (onStack.has(target)) low.set(id, Math.min(low.get(id), index.get(target)));
        }
        if (low.get(id) !== index.get(id)) return;
        const members = [];
        let member;
        do { member = stack.pop(); onStack.delete(member); members.push(member); } while (member !== id);
        if (members.length > 1) cycles.push(members.sort());
    };
    for (const id of graph.keys()) if (!index.has(id)) visit(id);
    return cycles;
}

/** Rule failures of the import graph: an import that does not resolve, a new backward import, a stale exception, a cycle. */
function moduleRuleFailures(graph = readGraph()) {
    const failures = [], seenKnown = new Set();
    for (const node of graph.values()) for (const imported of node.imports) {
        if (!graph.has(imported.source)) { failures.push(`${node.id}: imports ${imported.source}, which does not exist`); continue; }
        const from = LAYER_ORDER.indexOf(layerOf(node.id)), to = LAYER_ORDER.indexOf(layerOf(imported.source));
        if (from < 0 || to < 0) { failures.push(`${node.id}: modules/${layerOf(from < 0 ? node.id : imported.source)}/ is not a known layer (scripts/lib/module-graph.js LAYER_ORDER)`); continue; }
        if (to <= from) continue;
        const edge = `${node.id} -> ${imported.source}`;
        if (KNOWN_BACKWARD_IMPORTS.has(edge)) seenKnown.add(edge);
        else failures.push(`${edge}: ${layerOf(node.id)} may not import from ${layerOf(imported.source)} (order: ${LAYER_ORDER.join(' -> ')})`);
    }
    for (const edge of KNOWN_BACKWARD_IMPORTS) if (!seenKnown.has(edge)) failures.push(`${edge}: this backward import is gone; remove it from KNOWN_BACKWARD_IMPORTS (scripts/lib/module-graph.js)`);
    for (const cycle of importCycles(graph)) failures.push(`import cycle: ${cycle.join(' <-> ')}`);
    return failures;
}

module.exports = { readGraph, readModule, layerOf, rel, ROOT, LAYER_ORDER, moduleRuleFailures };
