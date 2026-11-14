'use strict';

// Transitional release packaging. ESM sources already compile with esbuild; classic
// consumers keep their shared lexical scope until they migrate to explicit imports.
const fs = require('node:fs/promises');
const path = require('node:path');
const espree = require('espree');
const esbuild = require('esbuild');

const MAX_SOURCE_BYTES = 1500000;
const SCRIPT_TAG = /<script\b([^>]*)>([\s\S]*?)<\/script>/g;

function describeScript(file, code) {
    const body = espree.parse(code, { ecmaVersion: 'latest', sourceType: 'script' }).body;
    return { file, code, bytes: Buffer.byteLength(code),
        strict: body.some(node => node.directive === 'use strict'),
        declaresFunction: body.some(node => node.type === 'FunctionDeclaration') };
}

/** Retain function-instantiation, strict-mode and shared lexical boundaries.
 * Transform script (no format/wrapper): esbuild preserves top-level binding names.
 * Only inner bindings/syntax are compacted; no property mangling or tree shaking.
 * Runtime callbacks use explicit export keys, never Function.name/toString. */
async function packClassicScripts(scripts) {
    const groups = [];
    let group = [], bytes = 0;
    const flush = () => { if (group.length) groups.push(group); group = []; bytes = 0; };
    for (const row of scripts) {
        if (row.boundary || row.strict) { flush(); groups.push([row]); continue; }
        if (row.declaresFunction || bytes + row.bytes > MAX_SOURCE_BYTES) flush();
        group.push(row); bytes += row.bytes;
    }
    flush();
    return Promise.all(groups.map(async (rows, index) => {
        const first = rows[0];
        if (first.boundary || first.strict || rows.length === 1) return { rows, file: first.file, code: first.code };
        const file = `js/boot/runtime-${String(index + 1).padStart(2, '0')}.js`;
        const source = rows.map(row => `// ${row.file}\n${row.code}`).join('\n;\n');
        const result = await esbuild.transform(source, { loader: 'js', target: 'es2020', charset: 'utf8',
            sourcefile: file.replace('.js', '.sources.js'), sourcemap: 'external', sourcesContent: true,
            minifyWhitespace: true, minifyIdentifiers: true, minifySyntax: true,
            treeShaking: false, legalComments: 'inline' });
        return { rows, file, code: result.code + `\n//# sourceMappingURL=${path.basename(file)}.map\n`, map: result.map };
    }));
}

function releasePath(destination, file) {
    const absolute = path.resolve(destination, file);
    if (!absolute.startsWith(path.resolve(destination) + path.sep)) throw Error(`Invalid release script: ${file}`);
    return absolute;
}

async function readReleaseScripts(destination, html) {
    // Ignore tags shown inside comments without changing replacement offsets.
    const visible = html.replace(/<!--[\s\S]*?-->/g, text => ' '.repeat(text.length));
    const rows = [];
    for (const match of visible.matchAll(SCRIPT_TAG)) {
        const src = /\bsrc="([^"?#]+)(?:[?#][^"]*)?"/.exec(match[1]);
        const file = src?.[1], attributes = match[1].replace(/\bsrc="[^"]*"/, '').trim();
        const eligible = file && attributes === 'defer' && /^(?:js\/|data\/|legal\/|cloud-save-config\.js$)/.test(file);
        const row = eligible ? describeScript(file, await fs.readFile(releasePath(destination, file), 'utf8'))
            : { file, boundary: true };
        rows.push({ ...row, start: match.index, end: match.index + match[0].length });
    }
    return rows;
}

/** Called AFTER release-only code stripping and BEFORE URL/boot-byte stamping.
 * No originals outside the fixed generated output directory are changed. Lazy
 * language packs, vendor and blocking/async scripts retain their paths and timing. */
async function bundleReleaseScripts(destination, html) {
    const root = path.resolve(__dirname, '../..');
    if (![path.join(root, 'dist'), path.join(root, 'www')].includes(path.resolve(destination))) {
        throw Error('Classic bundles may only be written to dist/ or www/');
    }
    const groups = await packClassicScripts(await readReleaseScripts(destination, html));
    const edits = [], packed = [], manifest = [];
    for (const group of groups) {
        if (!group.map) continue;
        const target = releasePath(destination, group.file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, group.code);
        await fs.writeFile(target + '.map', group.map);
        group.rows.forEach((row, index) => edits.push({ start: row.start, end: row.end,
            text: index === 0 ? `<script defer src="${group.file}"></script>` : '' }));
        packed.push(...group.rows.map(row => row.file));
        manifest.push({ file: group.file, sources: group.rows.map(row => row.file), bytes: Buffer.byteLength(group.code) });
    }
    for (const edit of edits.sort((a, b) => b.start - a.start)) html = html.slice(0, edit.start) + edit.text + html.slice(edit.end);
    await fs.writeFile(path.join(destination, 'boot-bundles.json'), JSON.stringify(manifest, null, 2) + '\n');
    // All outputs exist before removing only their exact, already copied inputs.
    for (const file of new Set(packed)) await fs.unlink(releasePath(destination, file));
    const count = [...html.matchAll(/<script\b[^>]*\bsrc=/g)].length;
    console.log(`Classic release: ${packed.length} scripts packed into ${manifest.length} bundles; ${count} script requests total.`);
    return html;
}

module.exports = { describeScript, packClassicScripts, bundleReleaseScripts };
