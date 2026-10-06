// PC display scale (review 2026-10-01): the UI used to undo the whole device pixel ratio, so a Retina / 200% display
// drew everything at half size. Only the fraction is undone now: pixel art stays on whole device pixels (DPR × factor
// is an integer) and a 2× display keeps the normal size. Phones never zoom.
const assert = require('assert');
const vm = require('vm');
const loadUiDisplay = require('./lib/load-ui-display');

function factorFor(devicePixelRatio, userAgent = 'Windows', percent = 100, fontMode) {
    const root = { style: { zoom: '', setProperty() {} } };
    const classes = new Set();
    const body = { classList: { toggle(name, on) { if (on) classes.add(name); else classes.delete(name); } } };
    const context = {
        devicePixelRatio,
        navigator: { userAgent },
        document: { documentElement: root, body, styleSheets: [], getElementById: () => null, querySelectorAll: () => [] },
        matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
        dispatchEvent() {},
        Event: class { constructor(type) { this.type = type; } },
        normalizeUiScale: value => Number(value) || 100,
        normalizeUiFont: value => (value === 'pixel' || value === 'smooth' ? value : 'auto')
    };
    vm.createContext(context);
    loadUiDisplay(context);
    if (fontMode) context.uiDisplay.font(fontMode);
    context.uiDisplay.apply(percent);
    return { factor: context.uiDisplay.factor, devicePixelsPerCssPixel: devicePixelRatio * context.uiDisplay.factor,
        smooth: classes.has('ui-font-smooth') };
}

assert.deepStrictEqual(factorFor(1), { factor: 1, devicePixelsPerCssPixel: 1, smooth: false });
assert.strictEqual(factorFor(2).factor, 1, 'a 2x display keeps the normal UI size (it was halved)');
assert.strictEqual(factorFor(2).devicePixelsPerCssPixel, 2);
assert.ok(Math.abs(factorFor(1.25).factor - 0.8) < 1e-9, '125% scaling still lands on one device pixel per CSS pixel');
assert.ok(Math.abs(factorFor(1.5).devicePixelsPerCssPixel - 1) < 1e-9, '150% scaling lands on whole device pixels');
assert.ok(Math.abs(factorFor(2.5).devicePixelsPerCssPixel - 2) < 1e-9, '250% scaling keeps its whole-number part');
assert.ok(Math.abs(factorFor(2, 'Windows', 150).factor - 1.5) < 1e-9, 'the player UI scale multiplies on top');
assert.strictEqual(factorFor(2.75, 'Mozilla/5.0 (Linux; Android 13; Pixel 5)').factor, 1, 'phones never zoom the page');
// 글꼴(2026-10-06): 소수 배율 PC에서는 크롬이 글자를 픽셀 사이에 찍어 도트 글꼴이 번진다 — 자동이면 일반 글꼴로.
assert.strictEqual(factorFor(1.25).smooth, true, 'auto uses the smooth font on a 125% PC display');
assert.strictEqual(factorFor(1.5).smooth, true, 'auto uses the smooth font on a 150% PC display');
assert.strictEqual(factorFor(1).smooth, false, 'auto keeps the pixel font at 100%');
assert.strictEqual(factorFor(2).smooth, false, 'auto keeps the pixel font at 200%');
assert.strictEqual(factorFor(2.75, 'Mozilla/5.0 (Linux; Android 13; Pixel 5)').smooth, false, 'phones keep the pixel font');
assert.strictEqual(factorFor(1.25, 'Windows', 100, 'pixel').smooth, false, 'the player can keep the pixel font');
assert.strictEqual(factorFor(1, 'Windows', 100, 'smooth').smooth, true, 'the player can pick the smooth font anywhere');
console.log('smoke-ui-display-dpr passed');
