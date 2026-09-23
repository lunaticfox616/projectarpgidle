'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { buildCss } = require('./build-css');
const root = path.resolve(__dirname, '..');
const destination = path.join(root, 'dist');

async function buildWeb() {
    // This fixed generated directory is the only deletion target.
    if (path.dirname(destination) !== root || path.basename(destination) !== 'dist') {
        throw new Error('Invalid web output directory');
    }
    await fs.rm(destination, { recursive: true, force: true });
    await fs.mkdir(destination);
    for (const name of ['assets', 'data', 'js', 'legal', 'cloud-save-config.js', 'changelog.md', 'service-worker.js']) {
        await fs.cp(path.join(root, name), path.join(destination, name), { recursive: true });
    }
    const html = await buildCss(destination, await fs.readFile(path.join(root, 'index.html'), 'utf8'));
    await fs.writeFile(path.join(destination, 'index.html'), html);
    await fs.writeFile(path.join(destination, '.nojekyll'), '');
    console.log('Web bundle: dist/index.html (one content-hashed CSS file)');
}

buildWeb().catch(error => { console.error(error); process.exitCode = 1; });
