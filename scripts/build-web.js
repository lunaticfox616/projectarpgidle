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
    // 배포마다 달라지는 표식: index.html과 version.json에 같은 값을 적어, 열려 있는 게임이 새 배포를 알아채게 한다(js/app-update-ui.js).
    // Actions에서는 커밋, 그 밖에서는 묶음을 만든 시각이다.
    const build = (process.env.GITHUB_SHA || '').slice(0, 12) || `local-${Date.now()}`;
    const placeholder = '<meta name="app-deploy" content="dev">';
    const built = await buildCss(destination, await fs.readFile(path.join(root, 'index.html'), 'utf8'));
    if (!built.includes(placeholder)) throw new Error('index.html has no app-deploy placeholder');
    const html = built.replace(placeholder, `<meta name="app-deploy" content="${build}">`);
    await fs.writeFile(path.join(destination, 'index.html'), html);
    await fs.writeFile(path.join(destination, 'version.json'), JSON.stringify({ build }) + '\n');
    await fs.writeFile(path.join(destination, '.nojekyll'), '');
    console.log('Web bundle: dist/index.html (one content-hashed CSS file)');
}

buildWeb().catch(error => { console.error(error); process.exitCode = 1; });
