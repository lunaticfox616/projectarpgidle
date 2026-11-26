// A separate guest-only origin for trying the actual game with a disposable loadout.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../dist');
const port = Number(process.env.RUNE_TEST_PORT || 4396);
const mime = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html', '.json':'application/json', '.png':'image/png',
    '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.ttf':'font/ttf', '.ogg':'audio/ogg', '.mp3':'audio/mpeg', '.wav':'audio/wav' };
const index = path.join(root, 'index.html');
if (!fs.existsSync(index)) throw Error('Run npm run build first');
http.createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
    catch { return res.writeHead(400).end(); }
    if (req.method !== 'GET' || req.headers.host !== '127.0.0.1:' + port) return res.writeHead(404).end();
    res.setHeader('Cache-Control', 'no-store');
    if (pathname === '/') {
        res.setHeader('Content-Security-Policy', "default-src 'self' data: blob:; connect-src 'self'; worker-src 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'");
        return fs.readFile(index,'utf8',(error, html) => {
            if (error) return res.writeHead(503, {'Retry-After':'2'}).end('Game build unavailable');
            res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' }).end(html
                .replace('<script id="app-update-registration">','<script id="app-update-registration" type="text/plain">')
                .replace('<head>','<head><script src="/test-storage.js"></script>')
                .replace('</body>','<script defer src="/test-session.js"></script></body>'));
        });
    }
    const helpers = { '/test-storage.js':'storage.js', '/test-session.js':'session.js', '/phone':'phone.html' };
    const file = Object.hasOwn(helpers,pathname) ? path.join(__dirname,helpers[pathname]) : path.resolve(root,'.' + pathname);
    if (!Object.hasOwn(helpers,pathname) && !file.startsWith(root + path.sep)) return res.writeHead(404).end();
    fs.stat(file,(err, info) => {
        if (err || !info.isFile()) return res.writeHead(404).end();
        res.writeHead(200,{ 'Content-Type':mime[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
    });
}).listen(port,'127.0.0.1',() => console.log('Rune playtest at http://127.0.0.1:' + port + '/'));
