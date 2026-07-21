const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const indexHtml = fs.readFileSync('index.html', 'utf8');
assert.match(indexHtml, /id="loop-decision-cosmos-btn"[^>]+onclick="chooseLoopAdvancePath\('cosmos'\)"/, 'pending loop prompt should expose a cosmos-loop choice');
assert.match(indexHtml, /id="loop-decision-chaos-btn"[^>]+onclick="chooseLoopAdvancePath\('chaos'\)"/, 'pending loop prompt should expose a chaos-loop choice');

const context = {
  console,
  window: null,
  globalThis: null,
  Math,
  Number,
  String,
  Array,
  Object,
  JSON,
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
['data/constants.js', 'data/maps.js', 'data/skills.js', 'data/items.js', 'data/passives.js', 'data/bosses.js', 'data/rewards.js', 'data/talent-cards.js', 'js/utils.js', 'js/state.js'].forEach(file => {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
});

vm.runInContext('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;', context);
context.game.season = 31;
context.game.loopProgressCurrent = {
  specialBosses: [],
  chaos20Cleared: false,
  bestAbyssDepth: 40,
  bestLabyrinthFloor: 99,
  bestChaosRealmFloor: 99,
  cosmosPlanets: [],
};

assert.strictEqual(context.getSeasonAbyssDepthCap(30), 40, 'loop 30 should retain the original deep-chaos cap');
assert.strictEqual(context.getSeasonAbyssDepthCap(31), 41, 'chaos-loop requirement should rise by one depth after loop 30');
assert.strictEqual(context.getSeasonAbyssDepthCap(32), 42, 'chaos-loop requirement should continue rising by one depth each loop');
assert.match(
  context.getLoopAbyssRequirementText(31),
  /선택 루프: 혼돈 루프 또는 우주계 에니프론 행성 돌파 후 우주계 루프 \(이번 루프 기준\)/,
);
assert.strictEqual(JSON.stringify(context.getAvailableLoopAdvancePaths(31)), '[]', 'legacy labyrinth/chaos realm progress must not satisfy loop 31 choices');
context.game.loopProgressCurrent.bestAbyssDepth = 41;
assert.strictEqual(JSON.stringify(context.getAvailableLoopAdvancePaths(31)), '["chaos"]', 'deep-chaos 41 should unlock the chaos-loop choice');
assert.strictEqual(context.markLoopCosmosPlanetClear('planet-44'), false, 'non-target cosmos planets should be recorded but not complete the cosmos-loop choice');
assert.strictEqual(JSON.stringify(context.getAvailableLoopAdvancePaths(31)), '["chaos"]', 'non-target planets must not unlock the cosmos-loop choice');
assert.strictEqual(context.markLoopCosmosPlanetClear('planet-45'), true, 'Enifron should complete the cosmos-loop choice');
assert.strictEqual(JSON.stringify(context.getAvailableLoopAdvancePaths(31)), '["chaos","cosmos"]', 'Enifron plus deep-chaos progress should expose both loop choices');

context.game.season = 30;
context.game.loopProgressCurrent = { cosmosPlanets: ['planet-45'], bestAbyssDepth: 0 };
assert.strictEqual(context.hasCurrentLoopCosmosRequirementClear(30), false, 'cosmos loop choice starts at loop 31');

console.log('smoke-loop-cosmos-alt-path passed');
