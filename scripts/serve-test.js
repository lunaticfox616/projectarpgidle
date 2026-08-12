#!/usr/bin/env node
'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Math.max(1, Number(process.env.PLAYWRIGHT_PORT) || 4173);
const MIME = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
};

function resolveRequestPath(url) {
    let pathname = decodeURIComponent(new URL(url, `http://127.0.0.1:${PORT}`).pathname);
    let target = path.resolve(ROOT, `.${pathname === '/' ? '/index.html' : pathname}`);
    return target === ROOT || target.startsWith(`${ROOT}${path.sep}`) ? target : null;
}

function createTestServer() {
    return http.createServer((request, response) => {
        let target = resolveRequestPath(request.url);
        if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.writeHead(200, {
            'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        });
        fs.createReadStream(target).pipe(response);
    });
}

function listen(server) {
    return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(PORT, '127.0.0.1', () => resolve(server));
    });
}

function close(server) {
    return new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
}

async function setupPlaywrightServer() {
    let server = await listen(createTestServer());
    return () => close(server);
}

if (require.main === module) {
    listen(createTestServer()).then(() => console.log(`Playwright server: http://127.0.0.1:${PORT}`));
} else {
    module.exports = setupPlaywrightServer;
}
