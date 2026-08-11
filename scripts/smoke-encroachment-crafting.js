const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

(async () => {
  const context = buildGameRuntime();
  const run = source => vm.runInContext(source, context);
  const originalRandom = context.Math.random;
  const item = {
    id: 990001,
    slot: '반지',
    baseId: 'encroachment_test_ring',
    baseName: '잠식 검증 반지',
    name: '희귀한 잠식 검증 반지',
    rarity: 'rare',
    itemTier: 15,
    hiddenTier: 15,
    affixTierCap: 15,
    baseStats: [],
    stats: [{ id: 'flatHp', statName: '최대 생명력', val: 100, tier: 8 }],
    encroached: {
      liberated: false,
      sourceFloor: 20,
      pendingOptions: [
        { id: 'flatDmg', val: 10, tier: 10, encroachedCandidate: true },
        { id: 'resF', val: 10, tier: 10, encroachedCandidate: true },
        { id: 'crit', val: 10, tier: 10, encroachedCandidate: true }
      ],
      chosen: null
    }
  };

  try {
    context.Math.random = () => 0;
    const liberationOptions = context.rollEncroachmentLiberationOptions(item);
    assert.strictEqual(liberationOptions.length, 3, 'encroachment liberation must still offer three choices');
    assert(liberationOptions.every(option => option.tier === 15),
      'encroachment liberation must use the item/source affix ceiling instead of hardcoded T10');

    item.encroached.pendingOptions = [];
    run(`(function () {
      game.inventory = [${JSON.stringify(item)}];
      game.currencies.emberBranch = 1;
      window.__taintedToastMessages = [];
      showGameToast = message => window.__taintedToastMessages.push(String(message));
      selectForCrafting(${item.id}, false);
    })()`);
    const previousCount = run('game.inventory[0].stats.length');
    context.Math.random = () => 0.99;
    await run("useCurrency('emberBranch')");
    assert.strictEqual(run('game.inventory[0].corrupted'), true, 'tainted currency must still corrupt the encroached item');
    assert.strictEqual(run('game.inventory[0].stats.length'), previousCount,
      'failed tainted currency must preserve the original no-change outcome for encroached items');
    const taintedToastMessages = JSON.parse(run('JSON.stringify(window.__taintedToastMessages)'));
    assert(taintedToastMessages.some(message => message.includes('변화가 없습니다')),
      `the no-change corruption result must be immediately visible outside the combat log: ${JSON.stringify(taintedToastMessages)}`);

    run(`(function () {
      let successful = JSON.parse(JSON.stringify(game.inventory[0]));
      successful.id = ${item.id + 1};
      successful.corrupted = false;
      game.inventory = [successful];
      game.currencies.emberBranch = 1;
      window.__taintedToastMessages = [];
      selectForCrafting(successful.id, false);
    })()`);
    const successPreviousCount = run('game.inventory[0].stats.length');
    context.Math.random = () => 0;
    await run("useCurrency('emberBranch')");
    assert.strictEqual(run('game.inventory[0].stats.length'), successPreviousCount + 1,
      'successful tainted currency must be able to add an option to an encroached item');
    assert(run("window.__taintedToastMessages.some(message => message.includes('추가 옵션이 부여되었습니다'))"),
      'successful corruption must also report its visible outcome');
  } finally {
    context.Math.random = originalRandom;
  }

  console.log('smoke-encroachment-crafting passed');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
