// 생장판 드랍의 변이 옵션은 상한을 한 줄만 넘고, 첫 제작 성공 시 소멸해야 한다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);

function resetGame() {
    run('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;');
}

(async () => {
    resetGame();
    const capped = JSON.parse(run(`JSON.stringify((function () {
        let unique = generateGrowthUniqueItem(20, '세계수의 심장');
        return { count: unique.stats.length, cap: getGrowthItemAffixCap(unique) };
    })())`));
    assert.strictEqual(capped.count, capped.cap, '일반 고유 생성은 생장판 옵션 상한을 넘지 않아야 한다');

    const rareMiss = JSON.parse(run(`JSON.stringify((function () {
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'rare', 20);
        item.stats.push({ id: 'flatHp', val: 7, statName: '최대 생명력', fossilExclusiveDrop: true });
        let originalRandom = Math.random;
        Math.random = () => 0.99;
        finalizeGrowthDropAffixes(item, { min: 16, max: 20 });
        Math.random = originalRandom;
        return { count: item.stats.length, cap: getGrowthItemAffixCap(item), marked: item.stats.filter(stat => stat.growthDropOverflow).length };
    })())`));
    assert.deepStrictEqual(rareMiss, { count: rareMiss.cap, cap: rareMiss.cap, marked: 0 },
        '변이 판정에 실패한 희귀 드랍은 기존 초과 옵션까지 상한 안으로 정리해야 한다');

    const rareHit = JSON.parse(run(`JSON.stringify((function () {
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'rare', 20);
        item.stats.push({ id: 'flatHp', val: 7, statName: '최대 생명력', fossilExclusiveDrop: true });
        let originalRandom = Math.random;
        Math.random = () => 0;
        finalizeGrowthDropAffixes(item, { min: 16, max: 20 });
        Math.random = originalRandom;
        return { item, cap: getGrowthItemAffixCap(item) };
    })())`));
    assert.strictEqual(rareHit.item.stats.length, rareHit.cap + 1, '희귀 변이 드랍은 상한보다 정확히 한 줄만 많아야 한다');
    assert.strictEqual(rareHit.item.stats.filter(stat => stat.growthDropOverflow).length, 1,
        '제작 시 지울 변이 옵션을 정확히 한 줄만 표시해야 한다');
    const overflowTooltip = run(`(function () {
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'rare', 20);
        item.stats.push({ id: 'flatHp', val: 7, statName: '최대 생명력', growthDropOverflow: true });
        return buildGrowthTooltipHtml(item);
    })()`);
    assert.ok(overflowTooltip.includes('변이 옵션 · 제작 시 소멸'), '변이 옵션의 일회성 규칙을 툴팁에 표시해야 한다');

    const uniqueHit = JSON.parse(run(`JSON.stringify((function () {
        let originalRandom = Math.random;
        Math.random = () => 0;
        let item = generateGrowthUniqueItem(20, '세계수의 심장', {
            allowDropOverflow: true, affixTierRange: { min: 16, max: 20 }
        });
        Math.random = originalRandom;
        return { item, cap: getGrowthItemAffixCap(item) };
    })())`));
    assert.strictEqual(uniqueHit.item.stats.length, uniqueHit.cap + 1, '고유 변이 드랍도 상한보다 정확히 한 줄만 많아야 한다');
    assert.strictEqual(uniqueHit.item.stats.filter(stat => stat.growthDropOverflow).length, 1,
        '고유의 초과 고정 옵션에도 변이 표식을 남겨야 한다');

    resetGame();
    run(`(function () {
        let originalRandom = Math.random;
        Math.random = () => 0;
        let item = generateGrowthUniqueItem(20, '태초의 설계도', {
            allowDropOverflow: true, affixTierRange: { min: 16, max: 20 }
        });
        Math.random = originalRandom;
        game.growthInventory = [item];
        game.currencies.growthEssence = 100;
        growthCraftItemId = item.id;
    })()`);
    assert.strictEqual(run('game.growthInventory[0].stats.some(stat => stat.growthDropOverflow)'), true,
        '형태 제작 검사에는 변이 옵션이 붙은 고유 생장판이 필요하다');
    const essenceBeforeShapeCraft = run('game.currencies.growthEssence');
    run('reforgeGrowthShapeAtBench()');
    assert.strictEqual(run('game.growthInventory[0].stats.some(stat => stat.growthDropOverflow)'), false,
        '일반 오브 제작이 불가능한 고유 생장판도 형태 제작 시 변이 옵션이 사라져야 한다');
    assert.ok(run('game.currencies.growthEssence') < essenceBeforeShapeCraft, '형태 제작 비용이 실제로 소모되어야 한다');

    resetGame();
    run(`(function () {
        let base = GROWTH_BASE_DB.find(row => row.category === 'flower');
        let item = createGrowthItemFromBase(base, 'rare', 20);
        item.stats.push({ id: 'flatHp', val: 7, valMin: 5, valMax: 9, statName: '최대 생명력', growthDropOverflow: true });
        game.growthInventory = [item];
        game.currencies.goldenRule = 0;
        selectForCrafting(item.id, false);
    })()`);
    await run("useCurrency('goldenRule')");
    assert.strictEqual(run('game.growthInventory[0].stats.some(stat => stat.growthDropOverflow)'), true,
        '재화가 없어 실패한 제작은 변이 옵션을 지우면 안 된다');

    run('game.currencies.goldenRule = 1; requestGameConfirmation = async () => true;');
    await run("useCurrency('goldenRule')");
    assert.strictEqual(run('game.growthInventory[0].stats.some(stat => stat.growthDropOverflow)'), false,
        '실제로 완료된 제작은 변이 옵션을 제거해야 한다');
    assert.strictEqual(run('game.currencies.goldenRule'), 0, '완료된 제작 재화는 한 번만 소모해야 한다');

    console.log('smoke-growth-drop-overflow passed');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
