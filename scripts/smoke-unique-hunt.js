const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
context.showGameToast = () => {};
const run = source => vm.runInContext(source, context);
const copy = value => JSON.parse(JSON.stringify(value));
const huntable = context.UNIQUE_DB.filter(entry => entry && !entry.realmCodexOnly).slice(0, 5);
const keys = huntable.map(entry => context.uniqueHuntRuntime.getKey(entry));

function loadGame(save) {
    context.__uniqueHuntSave = copy(save || {});
    run(`game = mergeDefaults(__uniqueHuntSave);
        uniqueHuntRuntime.ensureState(game);
        Object.keys(game.unlocks).forEach(function (key) { game.unlocks[key] = true; });
        game.seenTutorials = ['tutorial_battle_basics', 'unlock_growth_board'];`);
    return run('game');
}

{
    const state = loadGame({ uniqueHuntTargets: [keys[0], 'broken|missing', keys[0], keys[1], keys[2], keys[3]] });
    assert.deepStrictEqual(copy(state.uniqueHuntTargets), copy(keys.slice(0, 3)),
        '저장 경계에서 잘못된 값·중복·상한 초과 목표를 정리해야 한다');
    const another = loadGame({});
    assert.deepStrictEqual(copy(another.uniqueHuntTargets), [], '새 저장본이 이전 목표 배열을 공유하면 안 된다');
}

{
    const state = loadGame({});
    keys.slice(0, 3).forEach(key => assert.strictEqual(context.uniqueHuntRuntime.toggle(key, state).tracked, true));
    const capped = context.uniqueHuntRuntime.toggle(keys[3], state);
    assert.strictEqual(capped.ok, false, '파밍 목표는 세 개를 초과할 수 없어야 한다');
    assert.ok(capped.reason.includes('최대 3개'), '상한 초과 이유를 플레이어에게 알려야 한다');
    assert.strictEqual(context.uniqueHuntRuntime.toggle(keys[1], state).tracked, false, '같은 목표를 다시 누르면 해제해야 한다');
    assert.deepStrictEqual(copy(state.uniqueHuntTargets), [keys[0], keys[2]], '다른 목표는 유지해야 한다');
}

{
    const state = loadGame({});
    const target = huntable[0];
    context.uniqueHuntRuntime.toggle(keys[0], state);
    Object.keys(state.equipment).forEach((slot, index) => {
        state.equipment[slot] = { id: 70000 + index, name: `착용 장비 ${slot}`, slot, rarity: 'normal', baseStats: [], stats: [] };
    });
    state.settings.itemFilterEnabled = true;
    state.settings.itemFilterRarities.unique = false;
    state.settings.autoSalvageEnabled = true;
    state.settings.autoSalvageRarities.unique = true;
    context.__uniqueHuntName = target.name;
    run('__uniqueHuntItem = generateUniqueItem(20, null, __uniqueHuntName); __uniqueHuntAccepted = addItemToInventory(__uniqueHuntItem);');
    assert.strictEqual(context.__uniqueHuntAccepted, true, '추적 고유는 습득 필터와 자동해체를 우회해 보관해야 한다');
    assert.ok(state.inventory.some(item => item.name === target.name), '추적 고유가 인벤토리에 남아야 한다');
    assert.strictEqual(state.uniqueHuntTargets.length, 0, '목표를 획득하면 추적 목록에서 완료 처리해야 한다');
    assert.ok(state.uniqueCodex[keys[0]], '획득한 목표를 도감에도 정상 등록해야 한다');

    const other = huntable.find(entry => entry.name !== target.name);
    context.__uniqueHuntName = other.name;
    run('__uniqueHuntItem = generateUniqueItem(20, null, __uniqueHuntName); __uniqueHuntAccepted = addItemToInventory(__uniqueHuntItem);');
    assert.strictEqual(context.__uniqueHuntAccepted, false, '추적하지 않은 고유는 기존 습득 필터를 그대로 따라야 한다');
}

{
    const state = loadGame({});
    const target = huntable[0];
    context.uniqueHuntRuntime.toggle(keys[0], state);
    Object.keys(state.equipment).forEach((slot, index) => {
        state.equipment[slot] = { id: 80000 + index, name: `착용 장비 ${slot}`, slot, rarity: 'normal', baseStats: [], stats: [] };
    });
    state.inventory = Array.from({ length: context.getInventoryLimit() }, (_, index) => ({
        id: 90000 + index, name: `가득 찬 장비 ${index}`, slot: '무기', rarity: 'normal', baseStats: [], stats: []
    }));
    context.__uniqueHuntName = target.name;
    run('__uniqueHuntItem = generateUniqueItem(20, null, __uniqueHuntName); __uniqueHuntAccepted = addItemToInventory(__uniqueHuntItem);');
    assert.strictEqual(context.__uniqueHuntAccepted, true, '인벤토리가 가득 차도 추적 목표를 유실하면 안 된다');
    assert.strictEqual(state.inventory.length, context.getInventoryLimit() + 1, '추적 목표는 초과 보관해야 한다');
}

{
    const meteor = context.UNIQUE_DB.find(entry => entry && entry.dropOnly && entry.dropOnly.type === 'meteor');
    const labyrinth = context.UNIQUE_DB.find(entry => entry && entry.dropOnly && entry.dropOnly.type === 'labyrinth');
    const cosmosBoss = context.UNIQUE_DB.find(entry => entry && entry.dropOnly && entry.dropOnly.type === 'cosmosBoss');
    assert.ok(context.uniqueHuntUi.getSource(meteor).label.includes('운석'), '운석 고유의 드랍처를 안내해야 한다');
    assert.ok(context.uniqueHuntUi.getSource(labyrinth).label.includes('30층+'), '미궁 고유의 최소 층을 안내해야 한다');
    assert.ok(context.uniqueHuntUi.getSource(cosmosBoss).label.includes('우주계'), '우주계 보스 고유의 출처를 안내해야 한다');
}

console.log('smoke-unique-hunt passed');
