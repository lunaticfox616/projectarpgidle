'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const postcss = require('postcss');
const { buildCss } = require('./build-css');

async function verify() {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'rignin-css-'));
    try {
        const source = await fs.readFile('index.html', 'utf8');
        const html = await buildCss(temporary, source);
        const links = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)];
        assert.equal(links.length, 1, 'one CSS request for a release');
        const file = links[0][1];
        const css = await fs.readFile(path.join(temporary, file), 'utf8');
        const hash = crypto.createHash('sha256').update(css).digest('hex').slice(0, 16);
        assert.equal(file, `css/game-${hash}.css`, 'cache key derives from actual bundled bytes');
        assert.equal(await buildCss(temporary, source), html, 'same sources produce the same release URL');
        assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map(m => m[0]),
            [...source.matchAll(/<script\b[^>]*>/g)].map(m => m[0]), 'classic script loading is unchanged');
        const ast = postcss.parse(css);
        let roots = 0;
        ast.walkRules(':root', () => roots++);
        assert.equal(roots, 1, 'global defaults have a single owner');
        ast.walkAtRules('import', () => assert.fail('release CSS cannot request source stylesheets'));
        assert(!/--(?:game|ui|luxe|reliquary|social)-[\w-]+/.test(css), 'legacy token namespaces are removed');
        assert(!css.includes('../../assets/'), 'nested component assets are rebased for the bundle');
        assert(css.includes('../assets/fonts/DOSSaemmul.woff2'));
        assert(css.includes('../assets/fonts/MulmaruMono.woff2'));
        const order = ast.nodes.find(node => node.type === 'atrule' && node.name === 'layer' && !node.nodes);
        assert.deepEqual(order.params.split(',').map(name => name.trim()),
            ['reset', 'base', 'components', 'features', 'overrides'], 'cascade contract survives minification');
        await assert.rejects(buildCss(temporary, '<html></html>'), /Missing CSS entry link/);
    } finally {
        await fs.rm(temporary, { recursive: true, force: true });
    }
    console.log('smoke-css-build passed');
}
verify().catch(error => { console.error(error); process.exitCode = 1; });
