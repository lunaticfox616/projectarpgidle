#!/usr/bin/env node
// 드랍 시뮬레이터 로컬 서버(`npm run drop:sim`, docs/endgame-loot-20261009.md 5절). 화면은 tools/drop-simulator/, 계산은
// scripts/lib/drop-simulation.js(실제 게임 코드로 아틀라스 지도를 끝까지 정리)와 drop-simulation-report.js(집계). 게임 그림은 저장소의
// assets/에서 그대로 읽는다. 127.0.0.1에서만 듣는다.
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { simulateMaps, simulationCatalog } = require('./lib/drop-simulation');
const { summarize } = require('./lib/drop-simulation-report');

const ROOT = path.resolve(__dirname, '..');
const PAGE_ROOT = path.join(ROOT, 'tools', 'drop-simulator');
const PORT = Math.max(1, Number(process.env.DROP_SIM_PORT) || 4176);
const MAX_BODY_BYTES = 64 * 1024;
// 한 번에 그리는 지도 카드 수(통계는 전체 판으로 낸다).
const MAP_CARDS = 40;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
let catalog = null;

function sendJson(response, status, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(status, { 'Content-Type': TYPES['.json'], 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
    response.end(body);
}
function resolveInside(root, relative) {
    const resolved = path.resolve(root, relative);
    return resolved === root || resolved.startsWith(`${root}${path.sep}`) ? resolved : null;
}
function serveFile(response, file) {
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return sendJson(response, 404, { error: '파일을 찾을 수 없습니다.' });
    const body = fs.readFileSync(file);
    response.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': body.length, 'Cache-Control': 'no-store' });
    response.end(body);
}
function readJson(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        request.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) { reject(new Error('요청이 너무 큽니다.')); request.destroy(); return; }
            chunks.push(chunk);
        });
        request.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch (error) { reject(new Error(`JSON을 읽을 수 없습니다: ${error.message}`)); }
        });
        request.on('error', reject);
    });
}
/** One simulation: the summary over every map and the first MAP_CARDS maps in full for the cards. */
function simulate(body) {
    const result = simulateMaps(body);
    return { options: result.options, elapsedMs: result.elapsedMs, report: summarize(result), maps: result.maps.slice(0, MAP_CARDS),
        omens: omenBreakdown(result.maps) };
}
/** Per omen: how many maps had it and what they gave on average (drops, currency units, leaves). */
function omenBreakdown(maps) {
    const rows = new Map();
    for (const map of maps) {
        const id = map.map.omen ? map.map.omen.id : 'none';
        const row = rows.get(id) || { id, maps: 0, drops: 0, currency: 0, leaves: 0 };
        row.maps++;
        row.drops += map.drops.length;
        row.currency += Object.values(map.currencies).reduce((sum, n) => sum + n, 0);
        row.leaves += Object.values((map.leaves && map.leaves.gained) || {}).reduce((sum, n) => sum + n, 0);
        rows.set(id, row);
    }
    return [...rows.values()].map(row => ({ ...row, drops: row.drops / row.maps, currency: row.currency / row.maps, leaves: row.leaves / row.maps }))
        .sort((a, b) => b.maps - a.maps);
}
async function handleApi(request, response, pathname) {
    if (request.method === 'GET' && pathname === '/api/catalog') {
        catalog = catalog || simulationCatalog();
        return sendJson(response, 200, catalog);
    }
    if (request.method === 'POST' && pathname === '/api/simulate') return sendJson(response, 200, simulate(await readJson(request)));
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
}
async function handleRequest(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url.pathname);
        if (url.pathname.startsWith('/assets/')) return serveFile(response, resolveInside(ROOT, decodeURIComponent(url.pathname.slice(1))));
        return serveFile(response, resolveInside(PAGE_ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1))));
    } catch (error) {
        return sendJson(response, 500, { error: error.message || String(error) });
    }
}

http.createServer(handleRequest).listen(PORT, '127.0.0.1', () => {
    console.log(`드랍 시뮬레이터: http://127.0.0.1:${PORT}/`);
});
