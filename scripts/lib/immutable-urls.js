'use strict';

/**
 * Content-named script and style URLs for a release (2026-10-28), scripts/build-web.js. Every <script src> and <link rel="stylesheet">
 * of the release index.html gets h=<10 hex of the file's SHA-256> in its query, so one URL names one set of bytes for good and the
 * service worker serves its stored copy without asking the network (service-worker.js isImmutable). The hash is of the released file
 * (after scripts/lib/release-bundle.js stripped it), never of the source. The hand-kept ?v= keys stay in the URL; in a release they
 * decide nothing. A referenced file that is not in the release fails the build.
 */
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');

const TAG = /<(script|link)\b([^>]*?)\b(src|href)="([^"?#:]+)(\?[^"#]*)?"([^>]*)>/g;

const isVersionedLink = attributes => /\brel="(?:stylesheet|rignin-language)"/.test(attributes);

async function contentHash(destination, file) {
    const bytes = await fs.readFile(path.join(destination, file)).catch(error => {
        throw new Error(`index.html references ${file}, which is not in the release: ${error.message}`);
    });
    return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 10);
}

/** html with h=<hash> on every released script and stylesheet URL. */
async function markImmutableUrls(destination, html) {
    const hashes = new Map();
    for (const [, tag, before, , file, , after] of html.matchAll(TAG)) {
        if (tag === 'link' && !isVersionedLink(before + after)) continue;
        if (!hashes.has(file)) hashes.set(file, await contentHash(destination, file));
    }
    return html.replace(TAG, (match, tag, before, attribute, file, query = '', after) => {
        if (!hashes.has(file)) return match;
        return `<${tag}${before}${attribute}="${file}${query ? `${query}&` : '?'}h=${hashes.get(file)}"${after}>`;
    });
}

/** html with the boot-bytes meta set to the byte total of the released scripts and stylesheets it names (language packs load on demand,
 * js/i18n.js, and are left out): the loading screen's size line shows how much of it has arrived (index.html watchBootBytes, 2026-11-09). */
async function stampBootBytes(destination, html) {
    const placeholder = '<meta name="boot-bytes" content="dev">';
    if (!html.includes(placeholder)) throw new Error('index.html has no boot-bytes placeholder');
    const files = new Set();
    for (const [, tag, before, , file, , after] of html.matchAll(TAG)) {
        if (tag === 'link' && !/\brel="stylesheet"/.test(before + after)) continue;
        files.add(file);
    }
    let total = 0;
    for (const file of files) total += (await fs.stat(path.join(destination, file))).size;
    return html.replace(placeholder, `<meta name="boot-bytes" content="${total}">`);
}

module.exports = { markImmutableUrls, stampBootBytes };
