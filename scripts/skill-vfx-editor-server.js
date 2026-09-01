#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');
const { decodeVfxData, loadVfxAssetCatalog } = require('./lib/skill-vfx-editor-model');
const { createZipArchive } = require('./lib/zip-archive');

const ROOT = path.resolve(__dirname, '..');
const EDITOR_ROOT = path.join(ROOT, 'tools', 'skill-vfx-editor');
const BACKUP_ROOT = path.join(ROOT, 'artifacts', 'skill-vfx-backups');
const PORT = Math.max(1, Number(process.env.SKILL_VFX_EDITOR_PORT) || 4176);
const MAX_BODY_BYTES = 24 * 1024 * 1024;
const GAME_STATIC_ROOTS = new Set(['assets', 'css', 'data', 'js']);

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
        '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp',
        '.json': 'application/json; charset=utf-8', '.woff2': 'font/woff2'
    })[extension] || 'application/octet-stream';
}

function resolveInside(root, relativePath) {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, relativePath);
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
    return resolved;
}

function serveFile(response, file, downloadName = '') {
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return sendJson(response, 404, { error: '파일을 찾을 수 없습니다.' });
    }
    const body = fs.readFileSync(file);
    const disposition = downloadName ? { 'Content-Disposition': `attachment; filename="${downloadName}"` } : {};
    response.writeHead(200, {
        'Content-Type': contentType(file), 'Content-Length': body.length,
        'Cache-Control': 'no-store', ...disposition
    });
    response.end(body);
}

function serveAllVfxImages(response) {
    const entries = getCatalog().map(asset => ({
        name: `rignin-skill-vfx/${path.basename(asset.path)}`,
        data: fs.readFileSync(resolveInside(ROOT, asset.path)),
        modifiedAt: new Date(asset.modifiedAt)
    }));
    const archive = createZipArchive(entries);
    response.writeHead(200, {
        'Content-Type': 'application/zip',
        'Content-Length': archive.length,
        'Content-Disposition': 'attachment; filename="rignin-skill-vfx-images.zip"',
        'Cache-Control': 'no-store'
    });
    response.end(archive);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        request.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('업로드 이미지가 너무 큽니다.'));
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
    const temporary = `${file}.vfx-editor-tmp`;
    fs.writeFileSync(temporary, contents);
    fs.renameSync(temporary, file);
}

function runVisualSmoke() {
    return new Promise((resolve, reject) => {
        execFile(process.execPath, [path.join(ROOT, 'scripts', 'smoke-game-visual-overhaul.js')], {
            cwd: ROOT, timeout: 60000, maxBuffer: 4 * 1024 * 1024
        }, (error, stdout, stderr) => {
            if (error) return reject(new Error([stdout, stderr, error.message].filter(Boolean).join('\n')));
            resolve(String(stdout || '').trim());
        });
    });
}

function getCatalog() {
    return loadVfxAssetCatalog(ROOT).map(asset => ({
        ...asset,
        hasBackup: fs.existsSync(resolveInside(BACKUP_ROOT, asset.path))
    }));
}

function findAsset(assetPath) {
    const asset = getCatalog().find(entry => entry.path === assetPath);
    if (!asset) throw new Error('현재 게임이 사용하는 공격 이펙트 이미지가 아닙니다.');
    return asset;
}

function ensureBackup(asset) {
    const source = resolveInside(ROOT, asset.path);
    const backup = resolveInside(BACKUP_ROOT, asset.path);
    if (!backup) throw new Error('백업 경로가 올바르지 않습니다.');
    if (!fs.existsSync(backup)) {
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        fs.copyFileSync(source, backup);
    }
    return backup;
}

async function writeAndVerify(asset, bytes) {
    const target = resolveInside(ROOT, asset.path);
    const previous = fs.readFileSync(target);
    try {
        atomicWrite(target, bytes);
        const smoke = await runVisualSmoke();
        return { smoke };
    } catch (error) {
        atomicWrite(target, previous);
        throw error;
    }
}

async function replaceAsset(asset, dataUrl) {
    const bytes = decodeVfxData(asset, dataUrl);
    ensureBackup(asset);
    return writeAndVerify(asset, bytes);
}

async function restoreAsset(asset) {
    const backup = resolveInside(BACKUP_ROOT, asset.path);
    if (!backup || !fs.existsSync(backup)) throw new Error('복구할 최초 원본 백업이 없습니다.');
    return writeAndVerify(asset, fs.readFileSync(backup));
}

async function handleApi(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/assets') {
        return sendJson(response, 200, { assets: getCatalog(), root: ROOT });
    }
    if (request.method === 'GET' && url.pathname === '/api/download') {
        const asset = findAsset(url.searchParams.get('path'));
        return serveFile(response, resolveInside(ROOT, asset.path), path.basename(asset.path));
    }
    if (request.method === 'GET' && url.pathname === '/api/download-all') return serveAllVfxImages(response);
    if (request.method !== 'POST') return sendJson(response, 405, { error: '지원하지 않는 API 요청입니다.' });
    const payload = await readRequestBody(request);
    const asset = findAsset(payload.path);
    if (url.pathname === '/api/replace') {
        const result = await replaceAsset(asset, payload.data);
        return sendJson(response, 200, { ...result, message: `${asset.label} 이미지를 교체했습니다.` });
    }
    if (url.pathname === '/api/restore') {
        const result = await restoreAsset(asset);
        return sendJson(response, 200, { ...result, message: `${asset.label} 이미지를 최초 원본으로 복구했습니다.` });
    }
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
}

function serveEditor(response, pathname) {
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
    return serveFile(response, resolveInside(EDITOR_ROOT, relative));
}

function serveGame(response, pathname) {
    const relative = pathname.replace(/^\/game\/?/, '') || 'index.html';
    const first = relative.split('/')[0];
    if (relative !== 'index.html' && !GAME_STATIC_ROOTS.has(first)) {
        return sendJson(response, 403, { error: '게임 정적 파일 경로가 아닙니다.' });
    }
    return serveFile(response, resolveInside(ROOT, relative));
}

async function handleRequest(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
        if (url.pathname.startsWith('/game/')) return serveGame(response, url.pathname);
        if (url.pathname.startsWith('/assets/')) return serveFile(response, resolveInside(ROOT, url.pathname.slice(1)));
        return serveEditor(response, url.pathname);
    } catch (error) {
        return sendJson(response, 500, { error: error.message || String(error) });
    }
}

http.createServer(handleRequest).listen(PORT, '127.0.0.1', () => {
    console.log(`스킬 공격 이펙트 편집기: http://127.0.0.1:${PORT}/`);
    console.log(`현재 사용 중인 이미지 ${getCatalog().length}개`);
});
