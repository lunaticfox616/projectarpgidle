'use strict';
// Legacy asset/story tools edit classic table text. Translate at their file boundary;
// modules/data is the only editable source, and data/*.js remains generated output.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const espree = require('espree');
const ROOT = path.resolve(__dirname, '../..');
const entries = require('../../modules/data/entries.json');
const entryFor = file => entries.find(entry => path.resolve(ROOT, entry.output) === path.resolve(file));
const parse = source => espree.parse(source, { ecmaVersion: 'latest', sourceType: 'module', range: true });

function stripBoundary(source) {
    const nodes = parse(source).body.filter(node => {
        if (['ImportDeclaration', 'ExportNamedDeclaration'].includes(node.type)) return true;
        if (!['IfStatement', 'ExpressionStatement'].includes(node.type)) return false;
        return /^(?:safeExposeData\(|if \(typeof (?:safeExposeData|module)\b)/.test(source.slice(...node.range));
    });
    for (const node of nodes.reverse()) {
        const declaration = node.type === 'ExportNamedDeclaration' && node.declaration;
        const kept = declaration ? source.slice(...declaration.range) : '';
        source = source.slice(0, node.range[0]) + kept + source.slice(node.range[1]);
    }
    return source.trim() + '\n';
}

function readDataSource(file) {
    const entry = entryFor(file);
    if (!entry) return fs.readFileSync(file, 'utf8');
    const source = stripBoundary(fs.readFileSync(path.join(ROOT, entry.source), 'utf8'));
    return source + `\nsafeExposeData({ ${entry.names.join(', ')} });\n`;
}

function rebuildData() {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-modules.js')],
        { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', maxBuffer: 4 * 1024 * 1024 });
}

function writeDataSource(file, text) {
    const entry = entryFor(file);
    if (!entry) return fs.writeFileSync(file, text);
    const target = path.join(ROOT, entry.source), before = fs.readFileSync(target, 'utf8');
    const imports = parse(before).body.filter(node => node.type === 'ImportDeclaration').map(node => before.slice(...node.range));
    const source = [...imports, stripBoundary(String(text)), `export { ${entry.names.join(', ')} };`, ''].join('\n');
    try {
        fs.writeFileSync(target, source);
        rebuildData();
    } catch (error) {
        fs.writeFileSync(target, before);
        // Compilation validates all entries before writing output. Preserve the failing tool's error.
        throw new Error(`Data source update failed: ${entry.source}`, { cause: error });
    }
}

module.exports = { readDataSource, writeDataSource, rebuildData };
