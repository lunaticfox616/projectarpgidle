#!/usr/bin/env node
'use strict';
/**
 * Readies a fresh worktree with what the repo does not hold (2026-10-27 retro: browser checks in a new worktree failed on 404s for
 * Hana art, and node_modules was linked by hand):
 *   node_modules  linked to the shared copy (../rignin-next/node_modules, projectarpgidle1/README.md); a junction on Windows.
 *                 Unlink it before deleting the worktree, or deleting empties the shared copy.
 *   private art   the game's private files (scripts/lib/private-paths.js, under assets/), copied from the first sibling worktree
 *                 that has them. .gitignore keeps them out of commits.
 * Usage: npm run setup:worktree [-- --from <worktree>]. Makes only what is missing; never overwrites.
 */
const fs = require('fs');
const path = require('path');
const { PRIVATE_PATHS, HAND_PRIVATE_PATHS } = require('./lib/private-paths');

const ROOT = path.resolve(__dirname, '..');
const PARENT = path.dirname(ROOT);
const SHARED_MODULES = path.join(PARENT, 'rignin-next', 'node_modules');
const GAME_ART = [...PRIVATE_PATHS, ...HAND_PRIVATE_PATHS].filter(rel => rel.startsWith('assets/'));

function fromArgument() {
    const at = process.argv.indexOf('--from');
    return at > 0 && process.argv[at + 1] ? path.resolve(process.argv[at + 1]) : null;
}

/** Worktrees to take from: --from first, then the siblings beside this one. */
function sources() {
    const siblings = fs.readdirSync(PARENT, { withFileTypes: true }).filter(entry => entry.isDirectory())
        .map(entry => path.join(PARENT, entry.name)).filter(dir => dir !== ROOT && fs.existsSync(path.join(dir, 'index.html')));
    const from = fromArgument();
    return from ? [from, ...siblings.filter(dir => dir !== from)] : siblings;
}

function linkModules(candidates) {
    const target = path.join(ROOT, 'node_modules');
    if (fs.existsSync(target)) return 'node_modules: 있음';
    const from = fromArgument();
    const source = [from && path.join(from, 'node_modules'), SHARED_MODULES, ...candidates.map(dir => path.join(dir, 'node_modules'))]
        .filter(Boolean).find(dir => fs.existsSync(path.join(dir, '@playwright')));
    if (!source) return 'node_modules: 연결할 원본을 찾지 못했습니다(npm ci로 설치하세요)';
    fs.symlinkSync(fs.realpathSync(source), target, process.platform === 'win32' ? 'junction' : 'dir');
    return `node_modules: ${fs.realpathSync(source)}에 연결`;
}

function copyArt(rel, candidates) {
    const target = path.join(ROOT, rel);
    if (fs.existsSync(target)) return `${rel}: 있음`;
    const from = candidates.find(dir => fs.existsSync(path.join(dir, rel)));
    if (!from) return `${rel}: 가진 작업본이 없습니다`;
    fs.cpSync(path.join(from, rel), target, { recursive: true, errorOnExist: true });
    return `${rel}: ${path.basename(from)}에서 복사`;
}

const candidates = sources();
console.log(linkModules(candidates));
GAME_ART.forEach(rel => console.log(copyArt(rel, candidates)));
