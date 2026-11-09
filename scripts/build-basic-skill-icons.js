#!/usr/bin/env node
'use strict';
/**
 * 기초 스킬 아이콘 30장(2026-11-09 스킬 전체 전달본 V3.14, 사용자: 아이콘은 코드로 합성): 그 속성의 룬 아이콘 테두리(가운데 원판은 그 원판의
 * 가장자리 빛깔로 고르게 칠한다) 안에 그 무기 계열의 바탕 무기 그림을 놓는다(큰 그림은 부드럽게 줄이고, 작은 그림은 도트 그대로 키운다). 무기 둘레에 속성 빛깔의 1도트 테를 두른다.
 * 결과: assets/gems/runes/<번호>_basic-<계열>-<속성>.png(data/skills.js SKILL_GEM_ART_PATHS와 같은 이름). 다시 돌려도 같은 그림이 나온다.
 * Usage: node scripts/build-basic-skill-icons.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
// 속성마다 테두리를 빌려 오는 룬 아이콘
const FRAMES = { phys: '001_cross-cut.png', fire: '008_flame-slash.png', cold: '007_ice-lance.png', light: '011_thunder-lance.png', chaos: '009_venom-javelin.png' };
const RIMS = { phys: '#d9d2c3', fire: '#ff8a3c', cold: '#8fe3ff', light: '#ffe45c', chaos: '#b56cff' };
// 무기 계열마다 그 계열을 알아보기 쉬운 바탕 그림(대검은 넓은 날, 한손검은 가는 날이라 둘이 겹쳐 보이지 않게)
const WEAPONS = { greatsword: 'assets/items/pixel-v2/sword/base-executioner_blade.png', sword: 'assets/items/pixel-v2/sword/base-crescent_scimitar.png',
    bow: 'assets/items/pixel-v1/base/base-hunting_shortbow.png', orb: 'assets/items/pixel-v2/base/base-apprentice_familiar_wand.png',
    flask: 'assets/items/pixel-v1/base/base-cracked_flask.png', censer: 'assets/items/pixel-v1/base/base-tin_censer.png' };
const SLOTS = { greatsword: 200, sword: 210, bow: 220, orb: 230, flask: 240, censer: 250 };
const ELEMENTS = ['phys', 'fire', 'cold', 'light', 'chaos'];

const dataUrl = file => `data:image/png;base64,${fs.readFileSync(path.join(ROOT, file)).toString('base64')}`;

/** Runs in the page: one 64 px icon as a PNG data URL. */
async function composeIcon({ frame, weapon, rim }) {
    const load = src => new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; });
    const [frameImage, weaponImage] = await Promise.all([load(frame), load(weapon)]);
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(frameImage, 0, 0, 64, 64);
    // 원판의 빛깔: 반지름 17 둘레의 화소 평균
    const pixels = ctx.getImageData(0, 0, 64, 64).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < 48; i++) {
        const q = i / 48 * Math.PI * 2, x = Math.round(32 + Math.cos(q) * 17), y = Math.round(32 + Math.sin(q) * 17), at = (y * 64 + x) * 4;
        r += pixels[at]; g += pixels[at + 1]; b += pixels[at + 2]; n++;
    }
    ctx.fillStyle = `rgb(${Math.round(r / n)},${Math.round(g / n)},${Math.round(b / n)})`;
    ctx.beginPath(); ctx.arc(32, 32, 19.5, 0, Math.PI * 2); ctx.fill();
    // 무기: 30 도트 안에 정수 배율로(도트가 고르게), 가운데
    const scale = Math.max(1, Math.floor(30 / Math.max(weaponImage.width, weaponImage.height))) || 1;
    const fit = Math.min(1, 30 / (Math.max(weaponImage.width, weaponImage.height) * scale)), w = Math.round(weaponImage.width * scale * fit), h = Math.round(weaponImage.height * scale * fit);
    const x0 = Math.round(32 - w / 2), y0 = Math.round(32 - h / 2);
    const shape = document.createElement('canvas');
    shape.width = 64; shape.height = 64;
    const sctx = shape.getContext('2d');
    sctx.imageSmoothingEnabled = w < weaponImage.width;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(weaponImage, x0, y0, w, h);
    // 속성 테: 무기 실루엣을 네 방향으로 한 도트씩 밀어 칠한 뒤 그 위에 무기
    const rimCanvas = document.createElement('canvas');
    rimCanvas.width = 64; rimCanvas.height = 64;
    const rctx = rimCanvas.getContext('2d');
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => rctx.drawImage(shape, dx, dy));
    rctx.globalCompositeOperation = 'source-in';
    rctx.fillStyle = rim;
    rctx.fillRect(0, 0, 64, 64);
    ctx.drawImage(rimCanvas, 0, 0);
    ctx.drawImage(shape, 0, 0);
    return canvas.toDataURL('image/png');
}

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let written = 0;
    for (const [family, slot] of Object.entries(SLOTS)) {
        for (const [index, ele] of ELEMENTS.entries()) {
            const url = await page.evaluate(composeIcon, { frame: dataUrl(`assets/gems/runes/${FRAMES[ele]}`), weapon: dataUrl(WEAPONS[family]), rim: RIMS[ele] });
            const file = path.join(ROOT, 'assets/gems/runes', `${slot + index + 1}_basic-${family}-${ele}.png`);
            fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
            written++;
        }
    }
    await browser.close();
    console.log(`기초 스킬 아이콘 ${written}장을 썼습니다.`);
})().catch(error => { console.error(error); process.exit(1); });
