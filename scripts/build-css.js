'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const postcss = require('postcss');
const imports = require('postcss-import');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const root = path.resolve(__dirname, '..');

// Resolve each source-relative URL before emitting the bundle in dist/css or www/css.
const assetUrls = {
    postcssPlugin: 'game-css-assets',
    Once(styles) {
        styles.walkDecls(declaration => {
            const source = declaration.source.input.file;
            declaration.value = declaration.value.replace(/url\((['"]?)([^'"\)]+)\1\)/g, (url, quote, value) => {
                if (/^(data:|https?:|\/|#)/.test(value)) return url;
                const absolute = path.resolve(path.dirname(source), value);
                const relative = path.relative(path.join(root, 'css'), absolute).replaceAll('\\', '/');
                return `url(${quote}${relative}${quote})`;
            });
        });
    }
};

/** Bundle styles only. Classic scripts and their initialization order are unchanged. */
async function buildCss(destination, html) {
    const from = path.join(root, 'css/main.css');
    const to = path.join(destination, 'css/game.css');
    const result = await postcss([
        imports(), assetUrls, autoprefixer(), cssnano({ preset: ['default', {
            // Cross-rule merging can alter fallback declarations and layer order.
            mergeRules: false, discardUnused: false, reduceIdents: false
        }] })
    ]).process(await fs.readFile(from, 'utf8'), { from, to, map: false });
    for (const warning of result.warnings()) throw new Error(warning.toString());
    const hash = crypto.createHash('sha256').update(result.css).digest('hex').slice(0, 16);
    const name = `css/game-${hash}.css`;
    await fs.mkdir(path.dirname(path.join(destination, name)), { recursive: true });
    await fs.writeFile(path.join(destination, name), result.css);
    if (!html.includes('href="css/main.css"')) throw new Error('Missing CSS entry link');
    return html.replace('href="css/main.css"', `href="${name}"`);
}

module.exports = { buildCss };
