const fs = require('fs');
const assert = require('assert');

const titleFontPath = 'assets/fonts/DOSSaemmul.woff2';
const titleLicensePath = 'assets/fonts/LICENSE-DOSSaemmul.txt';
const bodyFontPath = 'assets/fonts/MulmaruMono.woff2';
const bodyLicensePath = 'assets/fonts/LICENSE-MulmaruMono.txt';
const copyFontPath = 'assets/fonts/Galmuri14.woff2';
const copyLicensePath = 'assets/fonts/LICENSE-Galmuri.txt';
const titleFont = fs.readFileSync(titleFontPath);
const bodyFont = fs.readFileSync(bodyFontPath);
const copyFont = fs.readFileSync(copyFontPath);
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(titleFont.length > 100000, 'DOSSaemmul font asset must not be empty or truncated');
assert(titleFont.subarray(0, 4).toString('ascii') === 'wOF2', 'DOSSaemmul asset must be a valid WOFF2 font');
assert(bodyFont.length > 90000, 'MulmaruMono font asset must not be empty or truncated');
assert(bodyFont.subarray(0, 4).toString('ascii') === 'wOF2', 'MulmaruMono asset must be a valid WOFF2 font');
assert(copyFont.length > 500000, 'Galmuri14 font asset must not be empty or truncated');
assert(copyFont.subarray(0, 4).toString('ascii') === 'wOF2', 'Galmuri14 asset must be a valid WOFF2 font');
const titleLicense = fs.readFileSync(titleLicensePath, 'utf8');
const bodyLicense = fs.readFileSync(bodyLicensePath, 'utf8');
const copyLicense = fs.readFileSync(copyLicensePath, 'utf8');
assert(titleLicense.includes('The MIT License (MIT)'), 'DOSSaemmul MIT license must ship with the font');
assert(titleLicense.includes('Copyright (c) 2016-2022 Damheo Lee'), 'DOSSaemmul copyright notice must be preserved');
assert(titleLicense.includes('글꼴(폰트)로 도스샘물체(leedheo 제작)를 사용하였습니다'), 'DOSSaemmul attribution must ship with the font');
assert(bodyLicense.includes('SIL OPEN FONT LICENSE Version 1.1'), 'MulmaruMono OFL license must ship with the font');
assert(bodyLicense.includes('Copyright (c) 2025, Mushsooni'), 'MulmaruMono copyright notice must be preserved');
assert(copyLicense.includes('SIL OPEN FONT LICENSE Version 1.1'), 'Galmuri OFL license must ship with the font');
assert(baseCss.includes("font-family: 'DOSSaemmul'"), 'DOSSaemmul @font-face must be registered');
assert(baseCss.includes("url('../assets/fonts/DOSSaemmul.woff2')"), 'font face must load the bundled asset');
assert(baseCss.includes("font-family: 'MulmaruMono'"), 'MulmaruMono @font-face must be registered');
assert(baseCss.includes("url('../assets/fonts/MulmaruMono.woff2')"), 'body font face must load the bundled asset');
assert(baseCss.includes("font-family: 'Galmuri14'"), 'Galmuri14 @font-face must be registered');
assert(baseCss.includes("url('../assets/fonts/Galmuri14.woff2')"), 'copy font face must load the bundled asset');
// Applied reading fonts are checked in the browser; this smoke owns bundled assets and loading.
// Check the load contract, not a historical date that rejects legitimate cache refreshes.
const stylesheets = [...html.matchAll(/<link\b[^>]*href="([^"]+)"/g)].map(match => match[1]);
for (const file of ['css/base.css', 'css/ui-feedback.css', 'css/typography-readability.css', 'css/ui-windows.css']) {
    assert(stylesheets.some(href => href.split('?')[0] === file && new URL(href, 'https://local.test').searchParams.has('v')),
        `${file} must be loaded with a cache version`);
}
assert(stylesheets.findIndex(href => href.startsWith('css/typography-readability.css?')) >
    stylesheets.findIndex(href => href.startsWith('css/base.css?')), 'readability overrides must load after base styles');

console.log('smoke-font-assets passed');
