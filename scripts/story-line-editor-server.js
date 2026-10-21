#!/usr/bin/env node
/* 이야기 대사 편집기: npm run story:edit 뒤 http://127.0.0.1:4186/ (포트는 STORY_LINE_EDITOR_PORT).
 * 주인공, NPC(머리 위 말과 창의 키워드), 보스의 대사를 한 화면에서 보고 고친다(scripts/lib/story-line-editor-model.js).
 * 저장은 바뀐 줄의 문자열만 그 자리에서 바꾸고, 쓰기 전에 artifacts/story-line-backups에 시각별 사본을 남긴다. 쓴 뒤
 * scripts/import-story-pack.cjs --check가 실패하면 되돌린다. 같은 글이 docs/story-bible.md(작가가 보는 원본)에 있으면 거기서도 바꾼다. */
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');
const { execFile } = require('child_process');
const model = require('./lib/story-line-editor-model');

const ROOT = path.resolve(__dirname, '..');
const EDITOR_ROOT = path.join(ROOT, 'tools', 'story-line-editor');
const BACKUP_ROOT = path.join(ROOT, 'artifacts', 'story-line-backups');
const BIBLE = 'docs/story-bible.md';
const PORT = Math.max(1, Number(process.env.STORY_LINE_EDITOR_PORT) || 4186);
const MAX_BODY_BYTES = 1024 * 1024;

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
    return ({
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8'
    })[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function resolveInside(root, relativePath) {
    const resolvedRoot = path.resolve(root);
    const resolved = path.resolve(resolvedRoot, relativePath);
    if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) return null;
    return resolved;
}

function serveFile(response, file) {
    if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        return sendJson(response, 404, { error: '파일을 찾을 수 없습니다.' });
    }
    const body = fs.readFileSync(file);
    response.writeHead(200, { 'Content-Type': contentType(file), 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    response.end(body);
}

function readRequestBody(request) {
    return new Promise((resolve, reject) => {
        let size = 0;
        const chunks = [];
        request.on('data', chunk => {
            size += chunk.length;
            if (size > MAX_BODY_BYTES) {
                reject(new Error('요청이 너무 큽니다.'));
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
    const temporary = `${file}.story-editor-tmp`;
    fs.writeFileSync(temporary, contents);
    fs.renameSync(temporary, file);
}

/** Local time to the millisecond, for backup names: 20261021-153012-045. */
function stamp() {
    const now = new Date(), two = value => String(value).padStart(2, '0');
    return `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}-${String(now.getMilliseconds()).padStart(3, '0')}`;
}

function backup(file, text, at) {
    fs.mkdirSync(BACKUP_ROOT, { recursive: true });
    const target = path.join(BACKUP_ROOT, `${at}-${path.basename(file)}`);
    fs.writeFileSync(target, text);
    return path.relative(ROOT, target).split(path.sep).join('/');
}

function runStoryCheck() {
    return new Promise(resolve => {
        execFile(process.execPath, [path.join(ROOT, 'scripts', 'import-story-pack.cjs'), '--check'], {
            cwd: ROOT, timeout: 60000, maxBuffer: 4 * 1024 * 1024
        }, (error, stdout, stderr) => resolve({ ok: !error, output: [stdout, stderr].filter(Boolean).join('\n').trim() }));
    });
}

/** The same changes in the story bible, where it has the old lines (model.bibleAfter). */
function syncBible(plan, at) {
    const file = path.join(ROOT, BIBLE);
    if (!fs.existsSync(file)) return { changed: false, rows: plan.changed.map(({ row }) => ({ id: row.id, place: row.place, speaker: row.speaker, status: 'missing', count: 0 })) };
    const text = fs.readFileSync(file, 'utf8'), result = model.bibleAfter(text, plan);
    if (result.text === text) return { changed: false, rows: result.rows };
    const saved = backup(BIBLE, text, at);
    atomicWrite(file, result.text);
    return { changed: true, rows: result.rows, backup: saved };
}

/** One save: the plan (only the named lines change, each still as the editor read it), backups, the writes, the read back, the
 * story check, then the bible. Anything failing puts the game files back as they were. */
async function save(changes) {
    const names = model.readNames(ROOT), texts = model.readTexts(ROOT);
    const plan = model.planSave(texts, names, changes);
    const at = stamp(), backups = plan.files.map(file => backup(file, texts[file], at)), written = [];
    try {
        for (const file of plan.files) {
            atomicWrite(path.join(ROOT, file), plan.texts[file]);
            written.push(file);
        }
        const back = model.readTexts(ROOT), differs = plan.files.filter(file => back[file] !== plan.texts[file]);
        if (differs.length) throw new Error(`쓴 파일을 다시 읽으니 내용이 다릅니다: ${differs.join(', ')}`);
        const check = await runStoryCheck();
        if (!check.ok) throw Object.assign(new Error('이야기 검사(import-story-pack.cjs --check)를 통과하지 못해 저장 전으로 되돌렸습니다.'), { output: check.output });
        const bible = syncBible(plan, at);
        return { saved: plan.changed.length, files: plan.files, backups, check: check.output.split('\n').pop(), bible };
    } catch (error) {
        written.forEach(file => atomicWrite(path.join(ROOT, file), texts[file]));
        throw error;
    }
}

// Saves run one at a time.
let saving = Promise.resolve();
function oneAtATime(task) {
    const run = saving.then(task, task);
    saving = run.catch(() => {});
    return run;
}

// What the page needs of a line: not where it sits in the file (the save reads that again).
const SERVER_ONLY = new Set(['range', 'quote', 'path']);
function readLines() {
    const { lines, classes } = model.collectLines(model.readTexts(ROOT), model.readNames(ROOT));
    return { lines: lines.map(row => Object.fromEntries(Object.entries(row).filter(([key]) => !SERVER_ONLY.has(key)))), classes };
}

async function handleApi(request, response, url) {
    if (request.method === 'GET' && url.pathname === '/api/lines') {
        return sendJson(response, 200, { ...readLines(), screenMax: model.SCREEN_MAX, root: ROOT });
    }
    if (request.method === 'POST' && url.pathname === '/api/save') {
        const payload = await readRequestBody(request);
        try {
            const result = await oneAtATime(() => save(payload.changes));
            return sendJson(response, 200, { ...result, ...readLines() });
        } catch (error) {
            return sendJson(response, 409, { error: error.message || String(error), output: error.output || '' });
        }
    }
    return sendJson(response, 404, { error: 'API를 찾을 수 없습니다.' });
}

async function handleRequest(request, response) {
    try {
        const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
        if (url.pathname.startsWith('/api/')) return await handleApi(request, response, url);
        const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
        return serveFile(response, resolveInside(EDITOR_ROOT, relative));
    } catch (error) {
        return sendJson(response, 500, { error: error.message || String(error) });
    }
}

const server = http.createServer(handleRequest);
server.on('error', error => {
    if (error.code !== 'EADDRINUSE') throw error;
    console.error(`포트 ${PORT}를 이미 쓰고 있습니다. 편집기가 이미 떠 있으면 http://127.0.0.1:${PORT}/ 로 들어가고, 아니면 STORY_LINE_EDITOR_PORT로 다른 포트를 주세요.`);
    process.exitCode = 1;
});
server.listen(PORT, '127.0.0.1', () => {
    const { lines } = readLines(), count = tab => lines.filter(row => row.tab === tab).length;
    console.log(`이야기 대사 편집기: http://127.0.0.1:${PORT}/`);
    console.log(`대사 ${lines.length}줄 (주인공 ${count('hero')}, NPC ${count('npc')}, 보스 ${count('boss')})`);
});
