// PC display scale (review 2026-10-01): the UI used to undo the whole device pixel ratio, so a Retina / 200% display
// drew everything at half size. Only the fraction is undone now: pixel art stays on whole device pixels (DPR × factor
// is an integer) and a 2× display keeps the normal size. Phones never zoom.
const assert = require('assert');
const vm = require('vm');
const loadUiDisplay = require('./lib/load-ui-display');

function factorFor(devicePixelRatio, userAgent = 'Windows', percent = 100) {
    const root = { style: { zoom: '', setProperty() {} } };
    const context = {
        devicePixelRatio,
        navigator: { userAgent },
        document: { documentElement: root, styleSheets: [], getElementById: () => null, querySelectorAll: () => [] },
        matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
        dispatchEvent() {},
        Event: class { constructor(type) { this.type = type; } },
        normalizeUiScale: value => Number(value) || 100
    };
    vm.createContext(context);
    loadUiDisplay(context);
    context.uiDisplay.apply(percent);
    return { factor: context.uiDisplay.factor, devicePixelsPerCssPixel: devicePixelRatio * context.uiDisplay.factor };
}

assert.deepStrictEqual(factorFor(1), { factor: 1, devicePixelsPerCssPixel: 1 });
assert.strictEqual(factorFor(2).factor, 1, 'a 2x display keeps the normal UI size (it was halved)');
assert.strictEqual(factorFor(2).devicePixelsPerCssPixel, 2);
assert.ok(Math.abs(factorFor(1.25).factor - 0.8) < 1e-9, '125% scaling still lands on one device pixel per CSS pixel');
assert.ok(Math.abs(factorFor(1.5).devicePixelsPerCssPixel - 1) < 1e-9, '150% scaling lands on whole device pixels');
assert.ok(Math.abs(factorFor(2.5).devicePixelsPerCssPixel - 2) < 1e-9, '250% scaling keeps its whole-number part');
assert.ok(Math.abs(factorFor(2, 'Windows', 150).factor - 1.5) < 1e-9, 'the player UI scale multiplies on top');
assert.strictEqual(factorFor(2.75, 'Mozilla/5.0 (Linux; Android 13; Pixel 5)').factor, 1, 'phones never zoom the page');
console.log('smoke-ui-display-dpr passed');
