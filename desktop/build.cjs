'use strict';
// Builds the PC version (docs/desktop-app-20261103.md): the web build (npm run build at the repo root, dist) beside this Electron
// shell, packed as a Windows folder with Rignin.exe in desktop/out. The purchased effect sheets are kept out of git (.gitignore)
// but belong in a game build, so the build stops when they are missing instead of shipping a game without skill effects.
//   node build.cjs [--skip-web]   (--skip-web packs the dist that is already there)
const fs = require('node:fs'), path = require('node:path'), { execSync } = require('node:child_process');
const { packager } = require('@electron/packager');
const { decodePng, encodePng } = require('../scripts/lib/png.cjs');

const here = __dirname, root = path.resolve(here, '..'), stage = path.join(here, 'stage'), out = path.join(here, 'out'), dist = path.join(root, 'dist');
const PRIVATE_ART = ['assets/stage-vfx/vfx.png', 'assets/stage-vfx/vfx2.png', 'assets/stage-vfx/vfx3.png'];
const ICON = 'assets/ui/pixel/rignin-logo-120.png', ICON_SIZES = [256, 128, 64, 48, 32, 16], LOCALES = ['en-US.pak', 'ko.pak'];

function missingArt(base) {
    return PRIVATE_ART.filter(rel => !fs.existsSync(path.join(base, rel)));
}
/** The newest version in the patch notes (## v0.3.44). */
function gameVersion() {
    const found = /^## v(\d+\.\d+\.\d+)/m.exec(fs.readFileSync(path.join(root, 'changelog.md'), 'utf8'));
    if (!found) throw new Error('changelog.md has no version heading');
    return found[1];
}

/** The picture scaled into a square: whole-number steps up (crisp dots), averaged colours down, centred. */
function square(src, size) {
    const data = new Uint8Array(size * size * 4), up = Math.floor(size / Math.max(src.width, src.height));
    if (up >= 1) {
        const left = (size - src.width * up) >> 1, top = (size - src.height * up) >> 1;
        for (let y = 0; y < src.height * up; y++) for (let x = 0; x < src.width * up; x++) {
            const from = (Math.floor(y / up) * src.width + Math.floor(x / up)) * 4;
            data.set(src.data.subarray(from, from + 4), ((top + y) * size + left + x) * 4);
        }
        return data;
    }
    const step = Math.max(src.width, src.height) / size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        let r = 0, g = 0, b = 0, a = 0, n = 0;
        for (let sy = Math.floor(y * step); sy < Math.floor((y + 1) * step); sy++) for (let sx = Math.floor(x * step); sx < Math.floor((x + 1) * step); sx++) {
            const at = (sy * src.width + sx) * 4, alpha = src.data[at + 3];
            r += src.data[at] * alpha; g += src.data[at + 1] * alpha; b += src.data[at + 2] * alpha; a += alpha; n++;
        }
        if (a) data.set([Math.round(r / a), Math.round(g / a), Math.round(b / a), Math.round(a / n)], (y * size + x) * 4);
    }
    return data;
}
/** A Windows .ico holding one PNG per size. */
function icoFrom(file) {
    const src = decodePng(fs.readFileSync(file)), pngs = ICON_SIZES.map(size => encodePng(size, size, square(src, size)));
    const head = Buffer.alloc(6 + 16 * pngs.length);
    head.writeUInt16LE(1, 2);
    head.writeUInt16LE(pngs.length, 4);
    let offset = head.length;
    pngs.forEach((png, i) => {
        const at = 6 + 16 * i, size = ICON_SIZES[i] % 256;
        head.writeUInt8(size, at); head.writeUInt8(size, at + 1);
        head.writeUInt16LE(1, at + 4); head.writeUInt16LE(32, at + 6);
        head.writeUInt32LE(png.length, at + 8); head.writeUInt32LE(offset, at + 12);
        offset += png.length;
    });
    return Buffer.concat([head, ...pngs]);
}

async function build() {
    const missing = missingArt(root);
    if (missing.length) throw new Error(`구입한 이펙트 그림이 없습니다(비공개 저장소에서 받아 두세요): ${missing.join(', ')}`);
    if (!process.argv.includes('--skip-web')) execSync('npm run build', { cwd: root, stdio: 'inherit' });
    if (missingArt(dist).length) throw new Error('dist에 이펙트 그림이 빠졌습니다: npm run build를 다시 하세요');
    // Only these two generated folders are ever removed.
    for (const dir of [stage, out]) {
        if (path.dirname(dir) !== here) throw new Error('Invalid output directory');
        fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.mkdirSync(stage);
    for (const file of ['main.cjs', 'preload.cjs']) fs.copyFileSync(path.join(here, file), path.join(stage, file));
    const version = gameVersion();
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: 'rignin', productName: 'Rignin', version, main: 'main.cjs' }, null, 2));
    fs.writeFileSync(path.join(stage, 'icon.ico'), icoFrom(path.join(root, ICON)));
    const [folder] = await packager({
        dir: stage, out, name: 'Rignin', executableName: 'Rignin', platform: 'win32', arch: 'x64', asar: true, overwrite: true,
        electronVersion: require('electron/package.json').version, appVersion: version, icon: path.join(stage, 'icon.ico'),
        // The game files stay loose in resources/dist (main.cjs reads them there), outside the app archive.
        extraResource: [dist],
        win32metadata: { CompanyName: 'Rignin', ProductName: 'Rignin', FileDescription: 'Rignin' }
    });
    // Chromium's own words (menus, error pages) for 55 languages: the game only needs Korean and English (about 47 MB less).
    const locales = path.join(folder, 'locales');
    for (const file of fs.readdirSync(locales)) if (!LOCALES.includes(file)) fs.rmSync(path.join(locales, file));
    console.log(`PC build ${version}: ${path.join(folder, 'Rignin.exe')}`);
}

build().catch(error => { console.error(error.message || error); process.exitCode = 1; });
