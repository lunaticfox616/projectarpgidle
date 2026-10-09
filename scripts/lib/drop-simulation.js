// 드랍 시뮬레이터 계산부(Node 쪽). 게임 전체를 vm에 올리고(scripts/lib/game-runtime.js), 루프 100 엔드게임 영웅
// (scripts/lib/offline-endgame-fixture.js)으로 아틀라스 지도를 실제 처치 경로로 돌린다(scripts/lib/drop-simulation-context.js).
// 쓰는 곳: scripts/drop-simulator-server.js(로컬 페이지), scripts/drop-simulate.js(명령줄 요약).
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildGameRuntime } = require('./game-runtime');
const configureEndgame = require('./offline-endgame-fixture');

const ROOT = path.resolve(__dirname, '..', '..');
const CONTEXT_FILE = path.join(__dirname, 'drop-simulation-context.js');

/** Deterministic xorshift-like generator: the same seed replays the same maps. */
function seededRandom(seed) {
    let state = (Number(seed) >>> 0) || 1;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 0x100000000;
    };
}

function loadRuntime(seed) {
    const cwd = process.cwd();
    process.chdir(ROOT);
    try {
        const runtime = buildGameRuntime();
        runtime.Math = Object.create(Math);
        runtime.Math.random = seededRandom(seed);
        vm.runInContext(fs.readFileSync(CONTEXT_FILE, 'utf8'), runtime, { filename: CONTEXT_FILE });
        vm.runInContext(`game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero1', selectedClassId: 'warrior',
            playerHp: 140, settings: { pauseGameOnOverlay: false } }); window.game = game;
            (${configureEndgame.toString()})();
            dropSimulation.wrapCapturePoints();`, runtime);
        return runtime;
    } finally {
        process.chdir(cwd);
    }
}

/**
 * @param {{tier?:number, loop?:number, maps?:number, rarity?:string, seed?:number}} options
 * @returns {{options:object, maps:object[], elapsedMs:number}} one row per map (scripts/lib/drop-simulation-context.js runMap)
 */
function simulateMaps(options = {}) {
    const settings = {
        tier: Math.max(1, Math.min(24, Math.floor(Number(options.tier) || 16))),
        loop: Math.max(10, Math.min(300, Math.floor(Number(options.loop) || 60))),
        maps: Math.max(1, Math.min(2000, Math.floor(Number(options.maps) || 20))),
        rarity: ['normal', 'magic', 'rare', 'mixed'].includes(options.rarity) ? options.rarity : 'mixed',
        seed: Math.floor(Number(options.seed) || 1)
    };
    const started = Date.now(), runtime = loadRuntime(settings.seed);
    vm.runInContext(`dropSimulation.prepare(${settings.loop})`, runtime);
    const maps = [];
    for (let i = 0; i < settings.maps; i++) {
        maps.push(JSON.parse(vm.runInContext(`JSON.stringify(dropSimulation.runMap(${JSON.stringify(settings)}))`, runtime)));
    }
    return { options: settings, maps, elapsedMs: Date.now() - started };
}

module.exports = { simulateMaps };
