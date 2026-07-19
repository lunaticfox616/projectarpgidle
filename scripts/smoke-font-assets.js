const fs = require('fs');
const assert = require('assert');

const fontPath = 'assets/fonts/Galmuri14.woff2';
const licensePath = 'assets/fonts/OFL-Galmuri.txt';
const font = fs.readFileSync(fontPath);
const baseCss = fs.readFileSync('css/base.css', 'utf8');
const feedbackCss = fs.readFileSync('css/ui-feedback.css', 'utf8');
const windowCss = fs.readFileSync('css/ui-windows.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert(font.length > 100000, 'Galmuri14 font asset must not be empty or truncated');
assert(font.subarray(0, 4).toString('ascii') === 'wOF2', 'Galmuri14 asset must be a valid WOFF2 font');
assert(fs.readFileSync(licensePath, 'utf8').includes('SIL OPEN FONT LICENSE Version 1.1'), 'Galmuri OFL license must ship with the font');
assert(baseCss.includes("font-family: 'Galmuri14'"), 'Galmuri14 @font-face must be registered');
assert(baseCss.includes("url('../assets/fonts/Galmuri14.woff2')"), 'font face must load the bundled asset');
assert(feedbackCss.includes('--game-font-body: "Galmuri14"'), 'body font token must use Galmuri14');
assert(feedbackCss.includes('--game-font-title: "Galmuri14"'), 'title font token must use Galmuri14');
assert(windowCss.includes('font-family: var(--game-font-body'), 'desktop windows must use the shared game font');
assert(baseCss.includes("#log { flex") && baseCss.includes("font-family: var(--game-font-body"), 'combat log must use the shared game font');
assert(html.includes('css/base.css?v=20260719-galmuri14-1'), 'font CSS cache version must be refreshed');

console.log('smoke-font-assets passed');
