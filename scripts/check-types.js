#!/usr/bin/env node
'use strict';

// Type check of the layered ESM sources (modules/<layer>/**), as a ratchet: the TypeScript checker reads the plain
// JavaScript and its JSDoc (tsconfig.json), and a finding that is not in scripts/type-check-baseline.json fails.
// The code was not written against a type checker, so the baseline holds what it reports today (mostly optional
// parameters it takes for required ones). New code may not add to it: a call with too few arguments, a property that
// the object does not have, a JSDoc type that names nothing.
//   npm run check:types               compare with the baseline
//   npm run check:types -- --update   rewrite the baseline from the working tree (after fixing findings, or on purpose)
// The adapters (modules/*-classic.mjs) read classic globals and are not checked here; build:modules lints them.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT, 'scripts/type-check-baseline.json');

function findings() {
    const configPath = path.join(ROOT, 'tsconfig.json');
    const config = ts.parseJsonConfigFileContent(ts.readConfigFile(configPath, ts.sys.readFile).config, ts.sys, ROOT);
    const program = ts.createProgram(config.fileNames, config.options);
    const rows = [];
    for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
        if (!diagnostic.file) continue;
        const file = path.relative(ROOT, diagnostic.file.fileName).split(path.sep).join('/');
        const line = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start || 0).line + 1;
        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ').replace(/\s+/g, ' ');
        rows.push({ file, line, key: `${file}|TS${diagnostic.code}|${message}` });
    }
    return rows;
}

function countByKey(rows) {
    const counts = {};
    for (const row of rows) counts[row.key] = (counts[row.key] || 0) + 1;
    return Object.fromEntries(Object.keys(counts).sort().map(key => [key, counts[key]]));
}

function main() {
    const rows = findings(), counts = countByKey(rows);
    if (process.argv.includes('--update')) {
        fs.writeFileSync(BASELINE, JSON.stringify(counts, null, 1) + '\n');
        console.log(`type check baseline rewritten: ${rows.length} findings`);
        return;
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
    const failures = [];
    for (const [key, count] of Object.entries(counts)) {
        if (count <= (baseline[key] || 0)) continue;
        const [file, code, message] = key.split('|');
        const lines = rows.filter(row => row.key === key).map(row => row.line).join(', ');
        failures.push(`${file}:${lines}: ${code} ${message}${baseline[key] ? ` (${baseline[key]} known, now ${count})` : ''}`);
    }
    if (failures.length) {
        console.error(failures.join('\n'));
        console.error(`\n${failures.length} new type finding(s). Fix them, or if the checker is wrong about the code say so with a JSDoc type; --update is for deliberate changes.`);
        process.exitCode = 1;
        return;
    }
    const gone = Object.keys(baseline).filter(key => !counts[key]).length;
    console.log(`type check ratchet passed (${rows.length} known findings${gone ? `, ${gone} baseline entries no longer occur: npm run check:types -- --update` : ''})`);
}

main();
