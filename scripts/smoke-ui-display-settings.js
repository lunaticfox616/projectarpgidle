const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
for (const value of [undefined, null, -1, 0, 1e20, Infinity, NaN, 'oops', {}, 99]) {
    const state = runtime.mergeDefaults({ settings: { uiScale: value } });
    assert.equal(state.settings.uiScale, 100, 'invalid/old saves use the normal user scale');
}
for (const value of [80, 90, 100, 110, 125, 150, 175, 200, 225, 250]) {
    const state = runtime.mergeDefaults({ settings: { uiScale: String(value), themeMode: 'light' } });
    assert.equal(state.settings.uiScale, value);
    assert.equal('themeMode' in state.settings, false, 'removed light mode setting is dropped from old saves');
    assert.equal(runtime.mergeDefaults(JSON.parse(JSON.stringify(state))).settings.uiScale, value);
}
// 글꼴 설정(2026-10-06): 없는 · 깨진 값은 자동, 고른 값은 다시 불러와도 그대로.
for (const value of [undefined, null, 0, 'oops', {}, 'PIXEL']) {
    assert.equal(runtime.mergeDefaults({ settings: { uiFont: value } }).settings.uiFont, 'auto', 'old or broken saves use the automatic font');
}
for (const value of ['auto', 'pixel', 'smooth']) {
    const state = runtime.mergeDefaults({ settings: { uiFont: value } });
    assert.equal(runtime.mergeDefaults(JSON.parse(JSON.stringify(state))).settings.uiFont, value);
}
console.log('smoke-ui-display-settings passed');
