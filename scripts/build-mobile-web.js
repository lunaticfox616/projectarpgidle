#!/usr/bin/env node
'use strict';

// Packaging only: preserve the classic script load order and shared game rules.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'www');
// Only this fixed, generated directory is replaced; never traverse a caller-supplied path.
fs.rmSync(destination, { recursive: true, force: true });
fs.mkdirSync(destination);
const files = cp.execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard',
    '--', 'assets', 'css', 'data', 'js', 'legal'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
files.push('cloud-save-config.js', 'changelog.md');
for (const file of new Set(files)) copy(file, file);
copy('node_modules/@capacitor/core/dist/capacitor.js', 'vendor/capacitor.js');
copy('node_modules/@supabase/supabase-js/dist/umd/supabase.js', 'vendor/supabase.js');
copy('node_modules/@capacitor/core/LICENSE', 'vendor/capacitor-LICENSE.txt');
copy('node_modules/@supabase/supabase-js/LICENSE', 'vendor/supabase-LICENSE.txt');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
    .replace('<script id="app-update-registration">', '<script src="vendor/capacitor.js"></script>\n    <script id="app-update-registration">')
    .replace('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'vendor/supabase.js');
fs.writeFileSync(path.join(destination, 'index.html'), html);
fs.writeFileSync(path.join(destination, 'mobile-build.json'), JSON.stringify({
    commit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    builtAt: new Date().toISOString(), updateMode: 'bundled-apk'
}, null, 2));
console.log(`Android web bundle: ${new Set(files).size} runtime files; no test pages or source-art backups.`);

function copy(source, target) {
    const output = path.join(destination, target);
    if (!output.startsWith(destination + path.sep)) throw new Error('Invalid bundle destination');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, source), output);
}
