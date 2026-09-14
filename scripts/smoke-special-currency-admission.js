const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

(async () => {
    const context = buildGameRuntime();
    const run = source => vm.runInContext(source, context);
    const toasts = [];
    context.showGameToast = message => toasts.push(String(message)); // DOM output boundary.
    run(`game.contentProgression.inherited = ['craft'];
        game.inventory = [{id: 98721, rarity: 'rare', slot: '무기', name: '검증 유물', baseName: '검증 검',
            fusedRelic: true, itemTier: 5, hiddenTier: 5,
            baseStats: [{id: 'flatDmg', statName: '기본 피해', val: 5, valMin: 5, valMax: 10}],
            stats: [{id: 'flatDmg', statName: '기본 피해', val: 20, valMin: 10, valMax: 20, tier: 5}]}];
        game.currencies.goldenRule = 2; game.currencies.blessing = 1;
        game.currencies.emberBranch = 3; game.currencies.formlessDew = 2;
        selectForCrafting(98721, false);`);
    const oldRandom = context.Math.random;
    try {
        context.Math.random = () => 0;
        assert.strictEqual(await run("useCurrency('goldenRule')"), true, 'fused relics accept the displayed Golden Rule currency');
        assert.strictEqual(run('game.currencies.goldenRule'), 1);
        assert.strictEqual(run('game.inventory[0].stats[0].val'), 10);
        assert.strictEqual(run('game.inventory[0].baseStats[0].val'), 5, 'Golden Rule preserves base rolls');
        context.Math.random = () => 0.99;
        assert.strictEqual(await run("useCurrency('blessing')"), true);
        assert.strictEqual(run('game.currencies.blessing'), 0);
        assert.strictEqual(run('game.inventory[0].baseStats[0].val'), 10);
        const beforeRejected = run('JSON.stringify([game.inventory,game.currencies])');
        await run("useCurrency('formlessDew')");
        assert.strictEqual(run('JSON.stringify([game.inventory,game.currencies])'), beforeRejected, 'forbidden fused rerolls do not mutate or charge');
        assert.strictEqual(await run("useCurrency('emberBranch')"), true, 'fused relics accept Ember Branch corruption');
        assert.strictEqual(run('game.inventory[0].corrupted'), true);
        assert.strictEqual(run('game.currencies.emberBranch'), 2);
        assert(toasts.some(message => message.includes('변화가 없습니다')), 'corruption outcome is visible to the player');
        const corruptedSnapshot = run('JSON.stringify([game.inventory,game.currencies])');
        await run("useCurrency('goldenRule')"); await run("useCurrency('emberBranch')");
        assert.strictEqual(run('JSON.stringify([game.inventory,game.currencies])'), corruptedSnapshot, 'ordinary corrupted relics remain blocked');

        run(`game.inventory[0].slot = '방패'; game.inventory[0].rarity = 'unique';
            game.inventory[0].uniqueEffectKey = 'kaleidoscopeShield';`);
        assert.strictEqual(await run("useCurrency('emberBranch')"), true, 'Kaleidoscope permits repeated corruption via the current currency name');
        assert.strictEqual(run('game.currencies.emberBranch'), 1);
        assert.strictEqual(run('game.inventory[0].stats.length'), 1, 'no-change corruption does not invent an affix');
        run(`game.inventory[0].stats = Array.from({length: 7}, (_, i) => ({id: 'flatHp', val: i + 1}));`);
        const fullSnapshot = run('JSON.stringify([game.inventory,game.currencies])');
        await run("useCurrency('emberBranch')");
        assert.strictEqual(run('JSON.stringify([game.inventory,game.currencies])'), fullSnapshot, 'Kaleidoscope cap still prevents an eighth option');
    } finally { context.Math.random = oldRandom; }
    console.log('smoke-special-currency-admission passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
