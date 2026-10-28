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

const isStylesheet = attributes => /\brel="stylesheet"/.test(attributes);

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
        if (tag === 'link' && !isStylesheet(before + after)) continue;
        if (!hashes.has(file)) hashes.set(file, await contentHash(destination, file));
    }
    return html.replace(TAG, (match, tag, before, attribute, file, query = '', after) => {
        if (!hashes.has(file)) return match;
        return `<${tag}${before}${attribute}="${file}${query ? `${query}&` : '?'}h=${hashes.get(file)}"${after}>`;
    });
}

module.exports = { markImmutableUrls };
