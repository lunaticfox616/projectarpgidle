#!/usr/bin/env node
'use strict';

// Packaging only: preserve the classic script load order and shared game rules.
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'www');
async function buildMobile() {
    // Only this fixed, generated directory is replaced; never traverse a caller-supplied path.
    fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(destination);
    const files = cp.execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard',
        '--', 'assets', 'data', 'js', 'legal', 'vendor'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
    files.push('cloud-save-config.js', 'changelog.md');
    for (const file of new Set(files)) copy(file, file);
    // supabase-js는 저장소의 vendor/ 사본이 그대로 들어간다(2026-10-27부터 웹도 같은 사본을 쓴다); Capacitor만 node_modules에서 가져온다.
    copy('node_modules/@capacitor/core/dist/capacitor.js', 'vendor/capacitor.js');
    copy('node_modules/@capacitor/core/LICENSE', 'vendor/capacitor-LICENSE.txt');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
        .replace('<script id="app-update-registration">', '<script src="vendor/capacitor.js"></script>\n    <script id="app-update-registration">');
    const { buildCss } = require('./build-css');
    const { prepareRelease } = require('./lib/release-bundle');
    const { stampGameBuild } = require('./lib/game-build');
    // The web build stamps the same way: a save from the web's later release is not loaded or overwritten by an older app.
    const bundled = stampGameBuild(await buildCss(destination, html), root);
    // Same release rules as the web build: no test panel and no dev-only code in the APK.
    fs.writeFileSync(path.join(destination, 'index.html'), await prepareRelease(destination, bundled));
    fs.writeFileSync(path.join(destination, 'mobile-build.json'), JSON.stringify({
        commit: cp.execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
        builtAt: new Date().toISOString(), updateMode: 'bundled-apk'
    }, null, 2));
    console.log(`Android web bundle: ${new Set(files).size} runtime files; no test pages or source-art backups.`);
}
buildMobile().catch(error => { console.error('[mobile-build]', error); process.exitCode = 1; });

function copy(source, target) {
    const output = path.join(destination, target);
    if (!output.startsWith(destination + path.sep)) throw new Error('Invalid bundle destination');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.copyFileSync(path.join(root, source), output);
}
