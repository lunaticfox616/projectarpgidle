'use strict';

// The classic runtime files in js/ and data/ are build output of modules/ and are not in the repository.
// Every tool that reads them calls ensureModules() first: it rebuilds only when a source changed since the
// last build. The stamp lives beside the checkout (not in node_modules, which worktrees may share).
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');
const STAMP_FILE = path.join(ROOT, '.modules-build.json');
// What decides the output besides modules/: the compilers and the pinned esbuild.
const BUILD_INPUTS = ['scripts/build-modules.js', 'scripts/lib/data-modules.cjs', 'scripts/lib/ensure-modules.js', 'package-lock.json'];
let checkedThisProcess = false;

function sourceFiles(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) sourceFiles(full, out);
        else out.push(full);
    }
    return out;
}

/** One hash over every source's path, size and modification time. Reading 2,300 file headers takes tens of milliseconds. */
function sourceFingerprint() {
    const hash = crypto.createHash('sha1');
    const files = sourceFiles(path.join(ROOT, 'modules'), []).concat(BUILD_INPUTS.map(file => path.join(ROOT, file))).sort();
    for (const file of files) {
        const stat = fs.statSync(file);
        hash.update(`${path.relative(ROOT, file)}|${stat.size}|${Math.floor(stat.mtimeMs)}\n`);
    }
    return hash.digest('hex');
}

function readStamp() {
    try { return JSON.parse(fs.readFileSync(STAMP_FILE, 'utf8')); } catch { return null; }
}

function isFresh() {
    const stamp = readStamp();
    return !!stamp && stamp.fingerprint === sourceFingerprint()
        && Array.isArray(stamp.outputs) && stamp.outputs.every(file => fs.existsSync(path.join(ROOT, file)));
}

/** Called by the build itself once every output is written. */
function writeStamp(outputs) {
    fs.writeFileSync(STAMP_FILE, JSON.stringify({ fingerprint: sourceFingerprint(), outputs }));
}

/** Builds js/ and data/ when a source is newer than the last build. Returns true when it built. */
function ensureModules() {
    if (checkedThisProcess || process.env.MODULES_ENSURED === '1') return false;
    checkedThisProcess = true;
    if (isFresh()) return false;
    try { require.resolve('esbuild'); } catch {
        throw new Error('js/ and data/ are built from modules/ and esbuild is not installed here. Run npm ci, then try again.');
    }
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/build-modules.js')], { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] });
    return true;
}

module.exports = { ensureModules, writeStamp, isFresh, STAMP_FILE };

if (require.main === module) {
    const built = ensureModules();
    console.log(built ? 'js/ and data/ rebuilt from modules/' : 'js/ and data/ are up to date');
}
