#!/usr/bin/env node
'use strict';
/**
 * Skill tree pictures from Codex's passive art folder (2026-10-28: 62 icons, 5 node frames), packed into the files the game loads:
 *   node scripts/build-passive-tree-art.js <art folder>
 * The art folder holds manifest.json, icons-64/ and frames/ (frames/manifest.json, frames/native/). The cells come from js/passives.js
 * (PASSIVE_ICON_ATLAS_CELL, PASSIVE_NOTABLE_ICON_ATLAS_CELL, PASSIVE_KEYSTONE_ICON_CELL_BY_ID, PASSIVE_TREE_FRAME_SHEET), so the
 * game and this script share one table. Every cell must get exactly one icon and every frame its listed size, or nothing is written.
 * Pixels are copied one to one (no scaling); the game scales them when it paints a node.
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('@playwright/test');
const { buildGameRuntime } = require('./lib/game-runtime');

const ROOT = path.resolve(__dirname, '..');
const CELL = 64;
const OUTPUT = Object.freeze({
    basic: 'assets/ui/passive-tree-icons-v5.png',
    notable: 'assets/ui/passive-tree-notable-icons-v5.png',
    keystone: 'assets/ui/passive-tree-keystone-icons-v2.png',
    frames: 'assets/ui/passive-tree-frames-v1.png'
});
const FRAME_IDS = Object.freeze({ small: 'small', medium: 'normal', notable: 'notable', keystone: 'keystone', void: 'void' });

function gameTables() {
    const context = buildGameRuntime();
    return JSON.parse(vm.runInContext(`JSON.stringify({ basic: PASSIVE_ICON_ATLAS_CELL, basicRows: PASSIVE_ICON_ATLAS_ROWS, notable: PASSIVE_NOTABLE_ICON_ATLAS_CELL,
        keystone: PASSIVE_KEYSTONE_ICON_CELL_BY_ID, keystoneRows: PASSIVE_KEYSTONE_ICON_ATLAS_ROWS, frames: PASSIVE_TREE_FRAME_SHEET })`, context));
}

/** [{ file, x, y }] per atlas; throws when a cell is missing, doubled, or an icon has no cell. */
function plan(artDir, tables) {
    const manifest = JSON.parse(fs.readFileSync(path.join(artDir, 'manifest.json'), 'utf8'));
    const sheets = { basic: [], notable: [], keystone: [] };
    manifest.icons.forEach(icon => {
        const key = icon.group === 'keystone' ? icon.mapping.nodeId : icon.mapping.iconFamily;
        const cell = tables[icon.group] && tables[icon.group][key];
        if (!cell) throw new Error(`칸이 없는 아이콘: ${icon.id} (${icon.group}/${key})`);
        sheets[icon.group].push({ file: path.join(artDir, 'icons-64', `${icon.id}.png`), x: cell[0] * CELL, y: cell[1] * CELL, key });
    });
    Object.keys(sheets).forEach(group => {
        const placed = new Set(sheets[group].map(entry => entry.key)), wanted = Object.keys(tables[group]);
        const missing = wanted.filter(key => !placed.has(key));
        if (missing.length || placed.size !== sheets[group].length) throw new Error(`${group} 칸이 비거나 겹칩니다: ${missing.join(', ')}`);
    });
    const columns = group => Math.max(...Object.values(tables[group]).map(cell => cell[0])) + 1;
    return {
        basic: { width: columns('basic') * CELL, height: tables.basicRows * CELL, entries: sheets.basic },
        notable: { width: columns('notable') * CELL, height: 3 * CELL, entries: sheets.notable },
        keystone: { width: columns('keystone') * CELL, height: tables.keystoneRows * CELL, entries: sheets.keystone },
        frames: framePlan(artDir, tables.frames)
    };
}

function framePlan(artDir, sheet) {
    const manifest = JSON.parse(fs.readFileSync(path.join(artDir, 'frames', 'manifest.json'), 'utf8'));
    const entries = Object.entries(sheet).map(([look, [x, size]]) => {
        const frame = manifest.frames.find(entry => entry.id === FRAME_IDS[look]);
        if (!frame || frame.size !== size) throw new Error(`테두리 크기가 다릅니다: ${look} (${frame && frame.size} / ${size})`);
        return { file: path.join(artDir, 'frames', 'native', `${frame.id}.png`), x, y: 0, key: look };
    });
    return { width: Math.max(...Object.values(sheet).map(([x, size]) => x + size)), height: Math.max(...Object.values(sheet).map(([, size]) => size)), entries };
}

async function pack(page, sheet) {
    const images = sheet.entries.map(entry => ({ x: entry.x, y: entry.y, url: `data:image/png;base64,${fs.readFileSync(entry.file).toString('base64')}` }));
    return page.evaluate(async ({ width, height, images }) => {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const g = canvas.getContext('2d');
        g.imageSmoothingEnabled = false;
        for (const entry of images) {
            const image = new Image();
            image.src = entry.url;
            await image.decode();
            g.drawImage(image, entry.x, entry.y);
        }
        return canvas.toDataURL('image/png').split(',')[1];
    }, { width: sheet.width, height: sheet.height, images });
}

async function main() {
    const artDir = process.argv[2];
    if (!artDir || !fs.existsSync(path.join(artDir, 'manifest.json'))) throw new Error('사용법: node scripts/build-passive-tree-art.js <Codex 패시브 그림 폴더>');
    const sheets = plan(artDir, gameTables());
    const browser = await chromium.launch();
    try {
        const page = await browser.newPage();
        for (const [name, sheet] of Object.entries(sheets)) {
            const bytes = Buffer.from(await pack(page, sheet), 'base64');
            fs.writeFileSync(path.join(ROOT, OUTPUT[name]), bytes);
            console.log(`${OUTPUT[name]}: ${sheet.width}x${sheet.height}, ${sheet.entries.length}개, ${bytes.length} bytes`);
        }
    } finally {
        await browser.close();
    }
}

main().catch(error => { console.error(error.message || error); process.exit(1); });
