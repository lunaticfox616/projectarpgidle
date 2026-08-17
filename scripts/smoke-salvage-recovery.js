const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const merge = save => context.mergeDefaults(JSON.parse(JSON.stringify(save)));

function loadGame(save) {
    const state = merge(save);
    context.__salvageRecoveryGame = state;
    run('game = __salvageRecoveryGame; salvageRecoveryRuntime.ensureState(game);');
    return state;
}

function equipment(id, rarity = 'normal') {
    return { id, name: `복구 시험 장비 ${id}`, slot: '무기', rarity, hiddenTier: 5, stats: [] };
}

run('__salvageRecoveryRandom = Math.random; Math.random = () => 0.999;');

{
    const first = loadGame({ season: 2, inventory: [equipment(101)] });
    run('salvageItem(0);');
    assert.strictEqual(first.inventory.length, 0, '일반 장비 해체 경로가 장비를 인벤토리에서 제거해야 한다');
    assert.strictEqual(first.currencies.magicBud, 1, '실제 해체 보상을 지급해야 한다');
    assert.strictEqual(first.salvageRecovery.entries.length, 1, '해체한 장비가 복구함에 기록되어야 한다');
    assert.strictEqual(first.salvageRecovery.entries[0].rewards.magicBud, 1, '실제 지급된 재화를 반환 비용으로 기록해야 한다');

    const panel = run('renderSalvageRecoveryPanel();');
    assert.ok(panel.includes('복구 시험 장비 101'), '복구 UI에 장비 이름을 표시해야 한다');
    assert.ok(panel.includes('마법의 새싹 1개'), '복구 UI에 실제 반환 비용을 표시해야 한다');

    const entryId = first.salvageRecovery.entries[0].id;
    const restored = context.salvageRecoveryRuntime.restore(entryId, first);
    assert.strictEqual(restored.restored, true, '받은 재화를 보유하면 해체 장비를 복구할 수 있어야 한다');
    assert.strictEqual(first.inventory.length, 1, '복구한 장비를 인벤토리에 돌려놓아야 한다');
    assert.strictEqual(first.currencies.magicBud, 0, '복구 시 해체로 받은 재화를 정확히 반환해야 한다');
    const repeat = context.salvageRecoveryRuntime.restore(entryId, first);
    assert.strictEqual(repeat.restored, false, '같은 복구 항목을 두 번 사용할 수 없어야 한다');

    const second = merge({ season: 2 });
    context.salvageRecoveryRuntime.ensureState(second);
    assert.strictEqual(second.salvageRecovery.entries.length, 0, '새 게임이 이전 게임의 복구함 배열을 공유하면 안 된다');
}

{
    const state = loadGame({ season: 2, inventory: [equipment(202, 'rare')] });
    run('salvageItem(0);');
    const entryId = state.salvageRecovery.entries[0].id;
    state.currencies.formlessDew = 0;
    const before = JSON.stringify(state.salvageRecovery.entries);
    const result = context.salvageRecoveryRuntime.restore(entryId, state);
    assert.strictEqual(result.restored, false, '반환할 해체 재화가 없으면 복구를 거부해야 한다');
    assert.strictEqual(result.missing.formlessDew, 1, '부족한 재화 수량을 알려야 한다');
    assert.strictEqual(JSON.stringify(state.salvageRecovery.entries), before, '실패한 복구가 복구함을 변경하면 안 된다');
    assert.strictEqual(state.inventory.length, 0, '실패한 복구가 장비를 추가하면 안 된다');
}

{
    const state = loadGame({ season: 2, inventory: [equipment(250, 'rare')] });
    run('salvageItem(0);');
    const firstRewards = { ...state.salvageRecovery.entries[0].rewards };
    const entryId = state.salvageRecovery.entries[0].id;
    assert.strictEqual(context.salvageRecoveryRuntime.restore(entryId, state).restored, true, '재추첨 검사 장비를 복구해야 한다');
    run('Math.random = () => 0; salvageItem(0);');
    assert.strictEqual(JSON.stringify(state.salvageRecovery.entries[0].rewards), JSON.stringify(firstRewards),
        '복구 장비를 다시 해체해도 최초 보상을 재추첨하면 안 된다');
    run('Math.random = () => 0.999;');
}

{
    const state = loadGame({ season: 2, inventory: [equipment(303)] });
    run('salvageItem(0);');
    const entryId = state.salvageRecovery.entries[0].id;
    state.inventory = Array.from({ length: context.getInventoryLimit() }, (_, index) => equipment(4000 + index));
    const currencyBefore = state.currencies.magicBud;
    const result = context.salvageRecoveryRuntime.restore(entryId, state);
    assert.strictEqual(result.restored, false, '인벤토리가 가득 차면 복구를 거부해야 한다');
    assert.strictEqual(state.currencies.magicBud, currencyBefore, '공간 부족 실패 시 재화를 차감하면 안 된다');
    assert.strictEqual(state.salvageRecovery.entries.length, 1, '공간 부족 실패 시 복구 항목을 유지해야 한다');
}

{
    const state = loadGame({ season: 2 });
    for (let index = 0; index < 10; index++) {
        context.__salvageRecoveryItem = equipment(500 + index);
        run('salvageItemObject(__salvageRecoveryItem, true);');
    }
    assert.strictEqual(state.salvageRecovery.entries.length, 8, '복구함은 최근 장비 8개만 보관해야 한다');
    assert.strictEqual(state.salvageRecovery.entries[0].item.id, 509, '가장 최근 해체 장비가 먼저 보여야 한다');
    assert.strictEqual(state.salvageRecovery.entries[7].item.id, 502, '오래된 항목부터 복구함에서 밀려나야 한다');
    state.season = 3;
    context.salvageRecoveryRuntime.ensureState(state);
    assert.strictEqual(state.salvageRecovery.entries.length, 0, '이전 루프의 해체 장비를 다음 루프로 가져갈 수 없어야 한다');
}

{
    const state = loadGame({ season: 25 });
    context.__growthSalvageItem = {
        id: 800, name: '생장판 시험품', slot: '보조장비', rarity: 'rare', hiddenTier: 5, stats: [],
        growthCategory: 'flower', growthShapeId: 'dot1'
    };
    run('salvageItemObject(__growthSalvageItem, true);');
    assert.strictEqual(state.salvageRecovery.entries.length, 0, '생장판은 장비 해체 복구함에 들어가면 안 된다');
}

{
    const state = loadGame({ season: 2, inventory: [equipment(901)] });
    run('salvageItem(0);');
    const entry = state.salvageRecovery.entries[0];
    state.inventory.push(equipment(entry.item.id));
    const restored = context.salvageRecoveryRuntime.restore(entry.id, state);
    assert.strictEqual(restored.restored, true, 'id가 겹쳐도 복구 자체는 성공해야 한다');
    assert.notStrictEqual(restored.item.id, entry.item.id, '보유 장비와 겹치는 id를 새 id로 교체해야 한다');
}

{
    const valid = { id: 7, loop: 2, salvagedAt: 10, item: equipment(1007), rewards: { magicBud: 1, unknownCurrency: 99 } };
    const state = loadGame({
        season: 2,
        salvageRecovery: {
            sequence: -5,
            entries: [valid, { ...valid }, { id: 8, loop: 1, item: equipment(1008), rewards: {} }, { id: 9, loop: 2, item: { ...equipment(1009), rarity: 'broken' }, rewards: {} }]
        }
    });
    assert.strictEqual(state.salvageRecovery.entries.length, 1, '손상·중복·이전 루프 복구 항목을 저장 경계에서 제거해야 한다');
    assert.deepStrictEqual(Object.keys(state.salvageRecovery.entries[0].rewards), ['magicBud'], '알 수 없는 재화 키를 복구 비용으로 받아들이면 안 된다');
    assert.strictEqual(state.salvageRecovery.sequence, 7, '저장된 유효 항목보다 작은 sequence를 보정해야 한다');
}

run('Math.random = __salvageRecoveryRandom;');
console.log('smoke-salvage-recovery passed');
