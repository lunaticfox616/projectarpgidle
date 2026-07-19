const fs = require('fs');
const assert = require('assert');

const fontPath = 'assets/fonts/DOSSaemmul.woff2';
const licensePath = 'assets/fonts/LICENSE-DOSSaemmul.txt';
const font = fs.readFileSync(fontPath);
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const feedbackCss = fs.readFileSync('css/ui-feedback.css', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(font.length > 100000, 'DOSSaemmul font asset must not be empty or truncated');
assert(font.subarray(0, 4).toString('ascii') === 'wOF2', 'DOSSaemmul asset must be a valid WOFF2 font');
const license = fs.readFileSync(licensePath, 'utf8');
assert(license.includes('The MIT License (MIT)'), 'DOSSaemmul MIT license must ship with the font');
assert(license.includes('Copyright (c) 2016-2022 Damheo Lee'), 'DOSSaemmul copyright notice must be preserved');
assert(license.includes('글꼴(폰트)로 도스샘물체(leedheo 제작)를 사용하였습니다'), 'DOSSaemmul attribution must ship with the font');
assert(baseCss.includes("font-family: 'DOSSaemmul'"), 'DOSSaemmul @font-face must be registered');
assert(baseCss.includes("url('../assets/fonts/DOSSaemmul.woff2')"), 'font face must load the bundled asset');
assert(feedbackCss.includes('--game-font-body: "DOSSaemmul"'), 'body font token must use DOSSaemmul');
assert(feedbackCss.includes('--game-font-title: "DOSSaemmul"'), 'title font token must use DOSSaemmul');
assert(windowCss.includes('font-family: var(--game-font-body'), 'desktop windows must use the shared game font');
assert(baseCss.includes("#log { flex") && baseCss.includes("font-family: var(--game-font-body"), 'combat log must use the shared game font');
assert(html.includes('css/base.css?v=20260719-white-copy1'), 'font CSS cache version must be refreshed');
assert(html.includes('css/ui-feedback.css?v=20260719-white-copy1'), 'shared font token cache must be refreshed');
assert(html.includes('css/ui-windows.css?v=20260719-white-copy1'), 'desktop font fallback cache must be refreshed');
assert(html.includes('js/passives.js?v=20260719-white-copy1'), 'canvas passive font cache must be refreshed');

console.log('smoke-font-assets passed');
