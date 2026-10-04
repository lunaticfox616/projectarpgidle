// 넓은 액트 지도에서 스킬 젬 바닥 칸(리뷰 P2, 2026-10-03): 파문심판의 바닥 타격 칸(footprint.cells)이 예전 9×8 판에서만
// 만들어져, 액트 1의 (19,25)에서 (21,25)의 적을 치면 피해는 들어가도 칸이 비어 바닥 번개가 그려지지 않았다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = code => vm.runInContext(code, context);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
// The run's facing is random (js/combat.js rollExplorationFacing); this check strikes the drawn map's fixed cells.
run('rollExplorationFacing = () => undefined;');
run(`game = mergeDefaults({ level: 40, currentZoneId: 0, settings: { showLootLog: false } }); startEncounterRun();
    game.skills = ['파문심판']; game.gemData = { '파문심판': { level: 1, quality: 0, exp: 0 } }; game.activeSkill = '파문심판';`);
assert.ok(json('getCombatGridSize().columns') > 9, 'act 1 is a wide map');
assert.ok(json('isGridCellInBounds(19, 25) && isGridCellInBounds(21, 25)'), 'both cells are on the act 1 map');

const judgment = json(`(() => {
    const enemy = Object.assign(createEnemy(getZone(0), { at: 0 }, 0), { id: 9101, gx: 21, gy: 25, hp: 1e6, maxHp: 1e6 });
    const state = skillGemCasts.createState();
    const started = skillGemCasts.start(state, { id: 51, name: '파문심판', stats: getPlayerStats(), source: { gx: 19, gy: 25 },
        enemies: [enemy], now: 1000, visuals: true, attackOptions: {} });
    const censer = state.events.find(event => event.judgmentPhase === 'censer');
    return { started, cells: censer ? censer.footprint.cells : null };
})()`);
assert.ok(judgment.started, 'the cast starts from (19,25) toward (21,25)');
assert.ok(judgment.cells && judgment.cells.length > 0, 'the floor strike has cells on the wide map');
assert.ok(judgment.cells.some(cell => cell.gx === 21 && cell.gy === 25), 'including the struck enemy cell');
assert.ok(judgment.cells.every(cell => json(`isGridCellInBounds(${cell.gx}, ${cell.gy})`)), 'every cell is on the map');
console.log('smoke-skill-gem-wide-map passed');
