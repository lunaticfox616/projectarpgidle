const vm = require('vm');
const { buildGameRuntime } = require('./game-runtime');

module.exports = function replayFixture(seed = 7) {
    const runtime = buildGameRuntime();
    runtime.Math = Object.create(Math);
    runtime.Math.random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 0x100000000;
    };
    runtime.Date = class extends Date { static now() { return 1800000000000; } };
    runtime.setTimeout = fn => setImmediate(fn);
    vm.runInContext(`
        game = mergeDefaults({heroSelectionInitialized: true, selectedHeroId: 'hero1',
            selectedClassId: 'warrior', playerHp: 140, combatTimeMs: 1800000000000,
            settings: {pauseGameOnOverlay: false}});
        gameplayStarted = true;
        startupOverlayActive = false;
        startEncounterRun();
    `, runtime);
    return { runtime, state: vm.runInContext('game', runtime), run: code => vm.runInContext(code, runtime) };
};
