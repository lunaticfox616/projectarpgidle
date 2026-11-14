'use strict';
// Temporary classic boundary. Native data modules import each other normally. While their
// consumers are classic scripts, resolve cross-table imports to the already loaded instance.
// Remove this compiler adapter when those consumers use the application module entry.
const path = require('node:path');
const fs = require('node:fs');
const espree = require('espree');
const { build } = require('esbuild');
const entries = require('../../modules/data/entries.json');
const ROOT = path.resolve(__dirname, '../..');
const bySource = new Map(entries.map(entry => [path.resolve(ROOT, entry.source), entry]));

function sharedDataPlugin(owner) {
    const imports = new Map(espree.parse(fs.readFileSync(path.join(ROOT, owner.source), 'utf8'),
        { ecmaVersion: 'latest', sourceType: 'module' }).body.filter(node => node.type === 'ImportDeclaration')
        .map(node => [path.resolve(ROOT, path.dirname(owner.source), node.source.value), node.specifiers.map(specifier => specifier.imported.name)]));
    return { name: 'existing-classic-data', setup(builder) {
        builder.onResolve({ filter: /\.mjs$/ }, args => {
            const resolved = path.resolve(args.resolveDir, args.path);
            const entry = bySource.get(resolved);
            if (entry?.source === owner.source) return;
            if (!entry || entries.indexOf(entry) >= entries.indexOf(owner))
                throw new Error(`${owner.source}: data dependency must be a registered earlier table: ${args.path}`);
            for (const name of imports.get(resolved) || []) if (!entry.names.includes(name))
                throw new Error(`${owner.source}: ${entry.source} does not export ${name}`);
            return { path: resolved, namespace: 'classic-data' };
        });
        builder.onLoad({ filter: /.*/, namespace: 'classic-data' }, args => ({
            contents: imports.get(args.path).map(name => `export const ${name} = globalThis.${name};`).join('\n'),
            loader: 'js'
        }));
    } };
}

function classicEntry(entry) {
    const names = entry.names.join(', ');
    const lines = [`import { ${names} } from './${entry.source}';`,
        // Global bindings also matter in isolated VM tools whose window is a separate shim.
        `Object.assign(globalThis, { ${names} });`,
        `if (typeof safeExposeData === 'function') safeExposeData({ ${names} });`];
    return lines.join('\n');
}

async function compileData(entry) {
    const banner = `// GENERATED from ${entry.source}. Edit the ESM source; run npm run build:modules.`;
    const bootstrap = entry.output === 'data/constants.js'
        ? '\nfunction safeExposeData(map) { Object.keys(map || {}).forEach(function (key) { if (typeof window[key] === "undefined") window[key] = map[key]; }); }'
        : '';
    const commonjs = entry.commonjs
        ? `if (typeof module !== 'undefined' && module.exports) module.exports = { ${entry.commonjs.map(name => `${name}: globalThis.${name}`).join(', ')} };`
        : '';
    const result = await build({
        absWorkingDir: ROOT, stdin: { contents: classicEntry(entry), resolveDir: ROOT, sourcefile: `${entry.source}:classic` },
        bundle: true, write: false, metafile: true, platform: 'browser', format: 'iife',
        target: 'es2020', charset: 'utf8', logLevel: 'silent', banner: { js: banner + bootstrap },
        footer: { js: commonjs }, plugins: [sharedDataPlugin(entry)]
    });
    return { output: entry.output, generated: result.outputFiles[0].text };
}

module.exports = { entries, compileData };
