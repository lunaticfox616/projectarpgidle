#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { execFile } = require('child_process');
const { buildGameRuntime } = require('./lib/game-runtime');
const { buildRuntimeTree, serializeRuntimeModule } = require('./build-passive-tree-runtime');
const { sanitizeIconName, validatePassiveTree } = require('./lib/passive-tree-editor-model');
const { ARCHETYPE_PROFILES, PASSIVE_TYPE_MULTIPLIER, STAT_META, ZONE_PALETTES, passiveValueStep } = require('./lib/passive-tree-option-catalog');
const { refreshDistances } = require('./lib/passive-tree-v23-options');
const { importAuthoringTree } = require('./lib/passive-tree-authoring-normalizer');
const { BUILT_IN_MOTIFS } = require('./lib/passive-tree-background-motifs');
const { AREAS, CENTRE_RADIUS, START_RADIUS, extractArea, mergeArea } = require('./lib/passive-tree-work-areas');
const { CLASS_ID_BY_NAME } = require('./complete-passive-tree-options');
const { BACKUP_FILE, TogetherRoom } = require('./lib/passive-together-room');

const ROOT = path.resolve(__dirname, '..');
// PASSIVE_EDITOR_ROOT: 편집기 화면을 다른 폴더에서 내준다(켜져 있는 함께 편집을 건드리지 않고 고친 화면을 시험할 때).
const EDITOR_ROOT = process.env.PASSIVE_EDITOR_ROOT ? path.resolve(process.env.PASSIVE_EDITOR_ROOT) : path.join(ROOT, 'tools', 'passive-editor');
const SOURCE_FILE = path.join(ROOT, 'artifacts', 'passive-tree', '260831_2passive-normalized.json');
const RUNTIME_FILE = path.join(ROOT, 'data', 'passive-tree-v22.js');
const ICON_DIR = path.join(ROOT, 'assets', 'ui', 'passive-custom-icons');
const PORT = Math.max(1, Number(process.env.PASSIVE_EDITOR_PORT) || 4175);
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const GAME_STATIC_ROOTS = new Set(['assets', 'css', 'data', 'js']);
// 함께 편집(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에, 원격). PASSIVE_TOGETHER=1이면 방을 연다(npm run passive:together).
// 이 PC 밖에서 온 요청(다른 주소, 또는 터널이 붙인 머리글)은 손님이다. 손님은 공유 주소의 열쇠(?key=, 그 뒤로 쿠키)가 맞아야 하고,
// 편집기 화면, 패시브 트리 그림, 읽기와 함께 편집 API만 쓴다. 원본 저장, 게임 적용, 아이콘 올리기, 구역 적용, 게임 열기는 호스트만.
const TOGETHER = process.env.PASSIVE_TOGETHER === '1';
const TOGETHER_KEY = process.env.PASSIVE_TOGETHER_KEY || crypto.randomBytes(12).toString('hex');
const BIND_HOST = process.env.PASSIVE_EDITOR_HOST || '127.0.0.1';
// 다시 켤 때 저장하지 않은 공동 작업을 이어받는 트리 파일(launcher --from): 없으면 저장된 원본에서 시작한다.
const TOGETHER_FROM = process.env.PASSIVE_TOGETHER_FROM || '';
const HOST_ONLY_APIS = new Set(['/api/save', '/api/apply', '/api/icon', '/api/area/apply']);
const GUEST_ASSET = /^\/assets\/ui\/(passive-tree-[\w.-]+\.(png|webp)|passive-custom-icons\/[\w.-]+)$/;
const FORWARDED_HEADERS = ['x-forwarded-for', 'cf-connecting-ip', 'forwarded'];
let room = null;
const ICON_FAMILIES = [
    'blade', 'projectile', 'shield', 'potion', 'strength', 'mystique', 'devotion', 'cycle', 'elemental',
    'dexterity', 'chaos', 'life', 'arcane', 'summon', 'intelligence', 'precision', 'wind', 'void', 'constellation',
    'fire', 'cold', 'lightning', 'cooldown', 'critical', 'armor', 'evasion', 'energyShield', 'ignite', 'chill', 'freeze', 'shock', 'bleed', 'poison'
];

function readTree() {
    return JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^\uFEFF/, ''));
}

/** Item stats (P_STATS) plus the passive-only options the combat code reads (감전 효율, 냉각 효율, 감전된 적 명중 피해: STAT_META).
 * Without the second half the editor refused to save the tree it had just opened. */
function loadStatCatalog(context) {
    const source = `JSON.stringify(Object.entries(P_STATS).map(([id, def]) => ({
        id, name: def.name || id, isPct: !!def.isPct
    })))`;
    const stats = JSON.parse(vm.runInContext(source, context)), known = new Set(stats.map(stat => stat.id));
    Object.entries(STAT_META).filter(([id]) => !known.has(id))
        .forEach(([id, [name, suffix]]) => stats.push({ id, name, isPct: suffix === '%' || suffix === '%p' }));
    return stats.sort((a, b) => a.name.localeCompare(b.name));
}

const GAME_CONTEXT = buildGameRuntime();
const STAT_CATALOG = loadStatCatalog(GAME_CONTEXT);
/** The game knows keystones by node id (js/passives.js); an imported builder keystone with the same name takes that id. */
const KEYSTONE_ID_BY_TITLE = JSON.parse(vm.runInContext('JSON.stringify(PASSIVE_KEYSTONE_NODE_ID_BY_TITLE)', GAME_CONTEXT));
const KNOWN_STAT_IDS = STAT_CATALOG.map(entry => entry.id);
/** Option bundles and their scaling for the editor's bundle picker (the same numbers the rework and completion scripts use). */
const OPTION_CATALOG = Object.freeze({
    profiles: ARCHETYPE_PROFILES, typeMultiplier: PASSIVE_TYPE_MULTIPLIER, zonePalettes: ZONE_PALETTES, labels: STAT_META,
    steps: Object.fromEntries(Object.keys(STAT_META).map(id => [id, passiveValueStep(id)]))
});

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

function isGuest(request) {
    const address = String(request.socket.remoteAddress || '');
    const loopback = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);
    return !loopback || FORWARDED_HEADERS.some(name => request.headers[name]);
}

function sameKey(value) {
    const given = Buffer.from(String(value || '')), expected = Buffer.from(TOGETHER_KEY);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

function cookieKey(request) {
    const match = String(request.headers.cookie || '').match(/(?:^|;\s*)together=([^;]+)/);
    return match ? match[1] : '';
}

/** What a guest may not open even with the key. */
function guestRefusal(pathname) {
    if (HOST_ONLY_APIS.has(pathname)) return '호스트만 할 수 있습니다.';
    if (pathname.startsWith('/game/')) return '게임은 호스트 PC에서만 열 수 있습니다.';
    if (pathname.startsWith('/assets/') && !GUEST_ASSET.test(pathname)) return '편집기 그림만 열 수 있습니다.';
    return '';
}

/** A guest with the shared key gets a cookie and the same page without the key in the address; anyone else stops here. @returns true when answered */
function guestGate(request, response, url) {
    if (!room) return sendJson(response, 403, { error: '함께 편집이 열려 있지 않습니다.' }), true;
    if (sameKey(url.searchParams.get('key'))) {
        url.searchParams.delete('key');
        response.writeHead(302, { Location: `${url.pathname}${url.search}`, 'Cache-Control': 'no-store',
            'Set-Cookie': `together=${TOGETHER_KEY}; Path=/; HttpOnly; SameSite=Lax` });
        response.end();
        return true;
    }
    if (!sameKey(cookieKey(request))) return sendJson(response, 401, { error: '공유 주소의 열쇠가 맞지 않습니다. 받은 주소 그대로 여세요.' }), true;
    const refusal = guestRefusal(url.pathname);
    return refusal ? (sendJson(response, 403, { error: refusal }), true) : false;
}

/** 함께 편집 API (passive-together-room.js): join, poll(기다리는 요청으로 소식 받기), ops and presence from one editor. */
async function handleTogether(request, response, url) {
    if (!room) return sendJson(response, 403, { error: '함께 편집이 열려 있지 않습니다.' });
    const action = url.pathname.slice('/api/together/'.length);
    if (request.method === 'GET' && action === 'poll') {
        return room.poll(request, response, { clientId: url.searchParams.get('clientId'), after: Number(url.searchParams.get('after')) || 0 });
    }
    if (request.method !== 'POST') return sendJson(response, 405, { error: '지원하지 않는 API 요청입니다.' });
    const payload = await readRequestBody(request);
    if (action === 'join') return sendJson(response, 200, room.join({ name: payload.name, host: !isGuest(request), resumeId: payload.resumeId }));
    if (action === 'leave') return room.leave(payload), sendJson(response, 200, { ok: true });
    if (action === 'ops') return sendJson(response, 200, room.submit(payload));
    if (action === 'presence') return room.presence(payload), sendJson(response, 200, { ok: true });
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
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

/** [파일 불러오기]: the editor's own export or a builder file, made ready to edit (nothing is saved). The validation report says what
 * must change before saving. */
function importTreeFile(source) {
    if (!source || !Array.isArray(source.nodes) || !Array.isArray(source.edges)) throw new Error('nodes와 edges가 있는 패시브 트리 파일이 아닙니다.');
    const { tree, report } = importAuthoringTree(source, { knownStatIds: KNOWN_STAT_IDS, classIdByName: CLASS_ID_BY_NAME, keystoneIdByTitle: KEYSTONE_ID_BY_TITLE });
    refreshDistances(tree);
    return { tree, imported: report, ...validatePayload(tree) };
}

/** 구역 작업(scripts/lib/passive-tree-work-areas.js): extract makes an area file from the open tree; merge puts an area file into the
 * open tree (nothing saved); apply puts the open tree's area into the saved source and the game, the other areas as they were saved. */
async function handleArea(action, payload) {
    if (!payload.tree || !Array.isArray(payload.tree.nodes)) throw new Error('편집 중인 트리가 없습니다.');
    if (action === 'extract') return { piece: extractArea(payload.tree, payload.area) };
    const merged = action === 'merge' ? mergeArea(payload.tree, payload.piece)
        : action === 'apply' ? mergeArea(readTree(), extractArea(payload.tree, payload.area)) : null;
    if (!merged) throw new Error('구역 작업을 찾을 수 없습니다.');
    refreshDistances(merged.tree);
    const report = validatePayload(merged.tree);
    if (action === 'merge') return { tree: merged.tree, area: merged.report, ...report };
    if (!report.valid) throw new Error(`적용하지 않았습니다: ${report.errors.slice(0, 2).join(' / ')}`);
    const applied = await applyTree(merged.tree);
    return { area: merged.report, ...report, ...applied, message: `${merged.report.label} 구역만 게임에 적용했습니다.` };
}

async function applyTree(tree) {
    const previousSource = fs.readFileSync(SOURCE_FILE);
    const previousRuntime = fs.readFileSync(RUNTIME_FILE);
    const runtimeSource = serializeRuntimeModule(buildRuntimeTree(tree));
    try {
        saveSourceTree(tree);
        atomicWrite(RUNTIME_FILE, runtimeSource);
        const smoke = await runSmoke('smoke-passive-respec-points.js');
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
        return sendJson(response, 200, { stats: STAT_CATALOG, iconFamilies: ICON_FAMILIES, catalog: OPTION_CATALOG, motifs: BUILT_IN_MOTIFS,
            areas: { list: AREAS, centreRadius: CENTRE_RADIUS, startRadius: START_RADIUS }, sourceFile: path.relative(ROOT, SOURCE_FILE),
            together: { enabled: !!room, host: !isGuest(request) } });
    }
    if (request.method !== 'POST') return sendJson(response, 405, { error: '지원하지 않는 API 요청입니다.' });
    const payload = await readRequestBody(request);
    if (pathname === '/api/icon') return sendJson(response, 200, { iconAsset: saveCustomIcon(payload.name, payload.data) });
    if (pathname === '/api/import') return sendJson(response, 200, importTreeFile(payload.tree));
    if (pathname.startsWith('/api/area/')) return sendJson(response, 200, await handleArea(pathname.slice('/api/area/'.length), payload));
    // Moved links change how far nodes are from a class start; the stored distance and value band follow them.
    if (payload.tree && Array.isArray(payload.tree.nodes) && Array.isArray(payload.tree.edges)) refreshDistances(payload.tree);
    const report = validatePayload(payload.tree);
    if (!report.valid) return sendJson(response, 422, report);
    if (pathname === '/api/save') {
        saveSourceTree(payload.tree);
        room?.saved('호스트가 원본을 저장했습니다.');
        return sendJson(response, 200, { ...report, message: '편집 원본을 저장했습니다.' });
    }
    if (pathname === '/api/apply') {
        const applied = await applyTree(payload.tree);
        room?.saved('호스트가 게임에 적용했습니다.');
        return sendJson(response, 200, { ...report, ...applied, message: '게임 런타임에 적용했습니다.' });
    }
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
}

async function handleRequest(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (isGuest(request) && guestGate(request, response, url)) return undefined;
        if (url.pathname.startsWith('/api/together/')) return await handleTogether(request, response, url);
        if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url.pathname);
        if (url.pathname.startsWith('/game/')) return serveGameAsset(response, url.pathname);
        if (url.pathname.startsWith('/assets/')) return serveFile(response, resolveInside(ROOT, url.pathname.slice(1)));
        return serveEditorAsset(response, url.pathname);
    } catch (error) {
        if (response.headersSent) return response.end();
        return sendJson(response, error.status || 500, { error: error.message || String(error) });
    }
}

async function start() {
    const startTree = TOGETHER_FROM ? JSON.parse(fs.readFileSync(TOGETHER_FROM, 'utf8')) : null;
    if (TOGETHER) room = new TogetherRoom(startTree || readTree(), await import(pathToFileURL(path.join(EDITOR_ROOT, 'together-core.js')).href));
    http.createServer(handleRequest).listen(PORT, BIND_HOST, () => {
        console.log(`패시브 트리 편집기: http://127.0.0.1:${PORT}/`);
        console.log(`편집 중인 원본: ${path.relative(ROOT, SOURCE_FILE)}`);
        if (!room) return;
        console.log(`함께 편집: 손님은 공유 주소 뒤에 /?key=${TOGETHER_KEY} 를 붙여 엽니다.`);
        if (startTree) console.log(`이어받은 트리: ${TOGETHER_FROM} (노드 ${startTree.nodes.length}개)`);
        console.log(`저장하지 않은 공동 작업은 30초마다 여기에 남습니다: ${BACKUP_FILE}`);
    });
}

start();
