'use strict';
// Benchmarks must not mix old consumers with new global adapters. Read one complete committed runtime.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { createRequire } = require('node:module');
const ROOT = path.resolve(__dirname, '../..');
const git = args => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

function readHeadFiles(files) {
    const data = execFileSync('git', ['cat-file', '--batch'], { cwd: ROOT, input: files.map(file => `HEAD:${file}\n`).join(''), maxBuffer: 128 * 1024 * 1024 });
    const result = new Map();
    let offset = 0;
    for (const file of files) {
        const lineEnd = data.indexOf(10, offset);
        const header = data.subarray(offset, lineEnd).toString('utf8');
        const match = /^[a-f0-9]+ blob (\d+)$/.exec(header);
        if (!match) throw Error(`Cannot read HEAD:${file}: ${header}`);
        const start = lineEnd + 1, end = start + Number(match[1]);
        if (data[end] !== 10) throw Error(`Invalid git blob boundary: ${file}`);
        result.set(file, data.subarray(start, end).toString('utf8'));
        offset = end + 1;
    }
    return result;
}

function createHeadRuntime() {
    const name = 'scripts/lib/game-runtime.js', filename = path.join(ROOT, name);
    const entry = { exports: {} };
    // This is trusted repository code from HEAD, evaluated with the same CommonJS boundaries as its current version.
    new Function('require', 'module', '__dirname', readHeadFiles([name]).get(name))(createRequire(filename), entry, path.dirname(filename));
    const sources = Object.fromEntries(readHeadFiles(entry.exports.LOAD_ORDER));
    return overrides => entry.exports.buildGameRuntime({ ...sources, ...overrides });
}

function readHeadWebFiles() {
    const files = git(['ls-tree', '-r', '--name-only', 'HEAD', '--', 'index.html', 'js', 'data', 'modules', 'css'])
        .trim().split('\n').filter(file => /\.(html|js|mjs|css)$/.test(file));
    const html = readHeadFiles(['index.html']).get('index.html');
    const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
        .map(match => match[1].split(/[?#]/)[0].replace(/^\.\//, ''))
        .filter(file => !/^(?:https?:)?\/\//.test(file));
    // Include committed scripts outside js/data (vendor, legal and cloud config) from the same revision too.
    return readHeadFiles([...new Set([...files, ...scripts])]);
}

module.exports = { createHeadRuntime, readHeadWebFiles };
