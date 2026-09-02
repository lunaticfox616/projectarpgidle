#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const { execFile } = require('child_process');
const { buildGameRuntime } = require('./lib/game-runtime');
const { buildRuntimeTree, serializeRuntimeModule } = require('./build-passive-tree-runtime');
const { sanitizeIconName, validatePassiveTree } = require('./lib/passive-tree-editor-model');

const ROOT = path.resolve(__dirname, '..');
const EDITOR_ROOT = path.join(ROOT, 'tools', 'passive-editor');
const SOURCE_FILE = path.join(ROOT, 'artifacts', 'passive-tree', '260831_2passive-normalized.json');
const RUNTIME_FILE = path.join(ROOT, 'data', 'passive-tree-v22.js');
const ICON_DIR = path.join(ROOT, 'assets', 'ui', 'passive-custom-icons');
const PORT = Math.max(1, Number(process.env.PASSIVE_EDITOR_PORT) || 4175);
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const GAME_STATIC_ROOTS = new Set(['assets', 'css', 'data', 'js']);
const ICON_FAMILIES = [
    'blade', 'projectile', 'shield', 'potion', 'strength', 'mystique', 'devotion', 'cycle', 'elemental',
    'dexterity', 'chaos', 'life', 'arcane', 'summon', 'intelligence', 'precision', 'wind', 'void', 'constellation'
];

function readTree() {
    return JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^\uFEFF/, ''));
}

function loadStatCatalog() {
    const context = buildGameRuntime();
    const source = `JSON.stringify(Object.entries(P_STATS).map(([id, def]) => ({
        id, name: def.name || id, isPct: !!def.isPct
    })).sort((a, b) => a.name.localeCompare(b.name)))`;
    return JSON.parse(vm.runInContext(source, context));
}

const STAT_CATALOG = loadStatCatalog();
const KNOWN_STAT_IDS = STAT_CATALOG.map(entry => entry.id);

function sendJson(response, status, payload) {
    const body = JSON.stringify(payload);
    response.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store'
    });
    response.end(body);
}

function contentType(file) {
    const extension = path.extname(file).toLowerCase();
    return ({
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2'
    })[extension] || 'application/octet-stream';
}

function resolveInside(root, relativePath) {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, relativePath);
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
    return resolved;
}

function serveFile(response, file) {
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return sendJson(response, 404, { error: '파일을 찾을 수 없습니다.' });
    const body = fs.readFileSync(file);
    response.writeHead(200, {
        'Content-Type': contentType(file), 'Content-Length': body.length, 'Cache-Control': 'no-store'
    });
    response.end(body);
}

function serveEditorAsset(response, pathname) {
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    return serveFile(response, resolveInside(EDITOR_ROOT, relative));
}

function serveGameAsset(response, pathname) {
    const relative = pathname.replace(/^\/game\/?/, '') || 'index.html';
    const first = relative.split('/')[0];
    if (relative !== 'index.html' && !GAME_STATIC_ROOTS.has(first)) return sendJson(response, 403, { error: '게임 정적 파일 경로가 아닙니다.' });
    return serveFile(response, resolveInside(ROOT, relative));
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let size = 0, chunks = [];
        request.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('요청 본문이 너무 큽니다.'));
                request.destroy();
                return;
            }
            chunks.push(chunk);
        });
        request.on('end', () => {
            try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
            catch (error) { reject(new Error(`JSON을 읽을 수 없습니다: ${error.message}`)); }
        });
        request.on('error', reject);
    });
}

function atomicWrite(file, contents) {
    const temporary = `${file}.editor-tmp`;
    fs.writeFileSync(temporary, contents);
    fs.renameSync(temporary, file);
}

function validatePayload(tree) {
    return validatePassiveTree(tree, KNOWN_STAT_IDS);
}

function saveSourceTree(tree) {
    atomicWrite(SOURCE_FILE, `${JSON.stringify(tree, null, 2)}\n`);
}

function runSmoke(file) {
    return new Promise((resolve, reject) => {
        execFile(process.execPath, [path.join(ROOT, 'scripts', file)], {
            cwd: ROOT, timeout: 60000, maxBuffer: 4 * 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error) return reject(new Error([stdout, stderr, error.message].filter(Boolean).join('\n')));
            resolve(String(stdout || '').trim());
        });
    });
}

async function applyTree(tree) {
    const previousSource = fs.readFileSync(SOURCE_FILE);
    const previousRuntime = fs.readFileSync(RUNTIME_FILE);
    const runtimeSource = serializeRuntimeModule(buildRuntimeTree(tree));
    try {
        saveSourceTree(tree);
        atomicWrite(RUNTIME_FILE, runtimeSource);
        const smoke = await runSmoke('smoke-passive-tree-visual-language.js');
        return { smoke };
    } catch (error) {
        atomicWrite(SOURCE_FILE, previousSource);
        atomicWrite(RUNTIME_FILE, previousRuntime);
        throw error;
    }
}

function decodeWebp(dataUrl) {
    const match = /^data:image\/webp;base64,([a-zA-Z0-9+/=]+)$/.exec(String(dataUrl || ''));
    if (!match) throw new Error('128×128 WebP 데이터만 업로드할 수 있습니다.');
    const bytes = Buffer.from(match[1], 'base64');
    if (bytes.length > 256 * 1024 || bytes.subarray(0, 4).toString('ascii') !== 'RIFF'
        || bytes.subarray(8, 12).toString('ascii') !== 'WEBP') throw new Error('올바른 WebP 아이콘이 아닙니다.');
    return bytes;
}

function saveCustomIcon(name, dataUrl) {
    const bytes = decodeWebp(dataUrl);
    fs.mkdirSync(ICON_DIR, { recursive: true });
    const fileName = `${sanitizeIconName(name)}-${Date.now().toString(36)}.webp`;
    const target = resolveInside(ICON_DIR, fileName);
    fs.writeFileSync(target, bytes);
    return `assets/ui/passive-custom-icons/${fileName}`;
}

async function handleApi(request, response, pathname) {
    if (request.method === 'GET' && pathname === '/api/tree') return sendJson(response, 200, { tree: readTree() });
    if (request.method === 'GET' && pathname === '/api/config') {
        return sendJson(response, 200, { stats: STAT_CATALOG, iconFamilies: ICON_FAMILIES, sourceFile: path.relative(ROOT, SOURCE_FILE) });
    }
    if (request.method !== 'POST') return sendJson(response, 405, { error: '지원하지 않는 API 요청입니다.' });
    const payload = await readRequestBody(request);
    if (pathname === '/api/icon') return sendJson(response, 200, { iconAsset: saveCustomIcon(payload.name, payload.data) });
    const report = validatePayload(payload.tree);
    if (!report.valid) return sendJson(response, 422, report);
    if (pathname === '/api/save') {
        saveSourceTree(payload.tree);
        return sendJson(response, 200, { ...report, message: '편집 원본을 저장했습니다.' });
    }
    if (pathname === '/api/apply') {
        const applied = await applyTree(payload.tree);
        return sendJson(response, 200, { ...report, ...applied, message: '게임 런타임에 적용했습니다.' });
    }
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
}

async function handleRequest(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url.pathname);
        if (url.pathname.startsWith('/game/')) return serveGameAsset(response, url.pathname);
        if (url.pathname.startsWith('/assets/')) return serveFile(response, resolveInside(ROOT, url.pathname.slice(1)));
        return serveEditorAsset(response, url.pathname);
    } catch (error) {
        return sendJson(response, 500, { error: error.message || String(error) });
    }
}

http.createServer(handleRequest).listen(PORT, '127.0.0.1', () => {
    console.log(`패시브 트리 편집기: http://127.0.0.1:${PORT}/`);
    console.log(`편집 중인 원본: ${path.relative(ROOT, SOURCE_FILE)}`);
});
