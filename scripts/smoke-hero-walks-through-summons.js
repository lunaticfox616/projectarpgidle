// 영웅은 자기 소환수를 지나간다(2026-10-08): 싸울 적이 없으면 소환수는 제자리에 서 있어서, 위습 여덟이 3칸 통로를 막아 소환사가
// 옆방에 영영 갇혔다(방치 정산 1시간 처치 0). 탐험 걸음의 계획과 반걸음 확인은 소환수 칸을 막힌 칸으로 보지 않고, 영웅이 들어선
// 칸의 소환수는 영웅이 떠난 칸으로 옮긴다. 적과 잠든 무리가 아닌 다른 막힘은 그대로다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run(`game = mergeDefaults({}); window.game = game; game.settings.showDeathNotice = false; startEncounterRun();
    window.exploration = actExplorationState.current(game);
    window.walkableNeighbor = () => { const map = actExplorationMap.forRun(exploration), hero = game.gridPlayer;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ gx: hero.gx + dx, gy: hero.gy + dy }))
            .find(cell => actExplorationMap.walkable(map, cell, false) && !getGridBlockedCells(game.gridPlayer).has(gridCellKey(cell.gx, cell.gy))); };`);
assert.ok(run('!!exploration'), 'act 1 lays out an exploration map');
const cell = json('walkableNeighbor()');
assert.ok(cell, 'the hero has a free neighbor tile');
const start = json('({ gx: game.gridPlayer.gx, gy: game.gridPlayer.gy })');
run(`game.enemies = []; game.summons = [{ id: 901, alive: true, hp: 10, maxHp: 10, role: 'attack', gx: ${cell.gx}, gy: ${cell.gy}, gridMoveTimer: 0 }];`);

// 1. 계획과 반걸음 확인: 소환수 칸은 영웅에게 막힌 칸이 아니다. 다른 유닛(적)에게는 그대로 막힌 칸이다.
const key = `'${cell.gx},${cell.gy}'`;
assert.equal(run(`gridCellKey(${cell.gx}, ${cell.gy})`), `${cell.gx},${cell.gy}`);
assert.equal(run(`getGridBlockedCells(game.gridPlayer).has(${key})`), true, 'the summon still holds its tile for everyone else');
assert.equal(run(`getHeroStepBlockedCells().has(${key})`), false, 'not for the hero');
assert.equal(run(`getExplorationPlanningBlockedCells(exploration).has(${key})`), false, 'the exploration plan walks through it');

// 2. 걸음(실제 탐험 틱): 영웅이 소환수 칸으로 걸어 들어가면 그 순간 소환수는 영웅이 떠난 칸으로 간다.
const after = json(`(() => {
    const stats = getPlayerStats(false), now = getCombatTime();
    exploration.motionTimeMs = now;
    actExplorationMotion.start(exploration, game.gridPlayer, { gx: ${cell.gx}, gy: ${cell.gy} }, 0.3, now);
    for (let ms = 20; ms <= 400; ms += 20) {
        actExplorationProgress.tick(now + ms, stats);
        if (game.gridPlayer.gx === ${cell.gx} && game.gridPlayer.gy === ${cell.gy}) break;
    }
    return { hero: { gx: game.gridPlayer.gx, gy: game.gridPlayer.gy }, summon: { gx: game.summons[0].gx, gy: game.summons[0].gy } };
})()`);
assert.deepEqual(after.hero, cell, 'the hero stands on the tile the summon held');
assert.deepEqual(after.summon, start, 'the summon took the tile the hero left');

// 3. 한자리에 머문 걸음(같은 칸)이나 소환수가 없는 칸은 아무것도 옮기지 않는다.
assert.deepEqual(json(`(() => { swapSummonOutOfHeroTile({ gx: game.gridPlayer.gx, gy: game.gridPlayer.gy }); return { gx: game.summons[0].gx, gy: game.summons[0].gy }; })()`), start);
console.log('hero walks through summons smoke passed');
