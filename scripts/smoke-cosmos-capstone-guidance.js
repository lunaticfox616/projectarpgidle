const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  window: null,
  globalThis: null,
  document: { readyState: 'loading', addEventListener() {} },
  addEventListener() {},
  game: {
    season: 31,
    currencies: { cosmosSovereignKey: 0 },
    cosmosAtlas: { bossClears: ['planet-45', 'planet-46'] }
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/cosmos-atlas.js', 'utf8'), context, { filename: 'js/cosmos-atlas.js' });

let progress = context.getCosmosCapstoneProgress(context.game.cosmosAtlas);
assert.strictEqual(progress.clearedCount, 2);
assert.strictEqual(progress.total, 5);
assert.strictEqual(progress.ready, false);
assert.strictEqual(progress.canChallenge, false);
assert.deepStrictEqual(Array.from(progress.bosses, row => row.name), ['하말리스', '디프다르', '주베누비아', '주벤샤말', '에니프론']);

context.game.cosmosAtlas.bossClears = ['planet-45', 'planet-46', 'planet-47', 'planet-48', 'planet-49'];
progress = context.getCosmosCapstoneProgress(context.game.cosmosAtlas);
assert.strictEqual(progress.ready, true);
assert.strictEqual(progress.canChallenge, false, 'the mark is still required after the five same-loop boss clears');

context.game.currencies.cosmosSovereignKey = 1;
progress = context.getCosmosCapstoneProgress(context.game.cosmosAtlas);
assert.strictEqual(progress.canChallenge, true);

const uiSource = fs.readFileSync('js/ui.js', 'utf8');
assert.ok(uiSource.includes('이번 루프 은하 보스 ${clearedCount}/${zone.requiresCosmosBosses.length}'), 'root boss card should expose the same-loop gate');
assert.ok(uiSource.includes("keys <= 0 || !!gateReason"), 'locked capstones must not look clickable before prerequisites are met');

const cssSource = fs.readFileSync('css/cosmos-atlas.css', 'utf8');
assert.ok(cssSource.includes('.cosmos-capstone-card'), 'atlas summary needs a dedicated capstone progress card');
assert.ok(cssSource.includes('.cosmos-capstone-boss.cleared'), 'cleared galaxy bosses need a distinct state');

console.log('smoke-cosmos-capstone-guidance passed');
