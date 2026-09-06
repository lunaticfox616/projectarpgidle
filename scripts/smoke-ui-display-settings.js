const assert = require('assert');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
for (const value of [undefined, null, -1, 0, 1e20, Infinity, NaN, 'oops', {}, 99]) {
    const state = runtime.mergeDefaults({ settings: { uiScale: value } });
    assert.equal(state.settings.uiScale, 100, 'invalid/old saves use the normal user scale');
}
for (const value of [80, 90, 100, 110, 125, 150]) {
    const state = runtime.mergeDefaults({ settings: { uiScale: String(value), themeMode: 'light' } });
    assert.equal(state.settings.uiScale, value);
    assert.equal(state.settings.themeMode, 'light');
    assert.equal(runtime.mergeDefaults(JSON.parse(JSON.stringify(state))).settings.uiScale, value);
}
console.log('smoke-ui-display-settings passed');
