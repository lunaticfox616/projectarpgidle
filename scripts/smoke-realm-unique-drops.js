const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
context.showGameToast = () => {};
const run = source => vm.runInContext(source, context);

run(`game = mergeDefaults({});
    Object.keys(game.unlocks).forEach(function (key) { game.unlocks[key] = true; });
    game.seenTutorials = ["tutorial_battle_basics", "unlock_growth_board"];`);

function sampleRealmUniques(zone, realm, attempts) {
    context.__realmUniqueTestZone = zone;
    run('game.currentZoneId = "realm-unique-test"; getZone = function () { return __realmUniqueTestZone; };');
    const tier = context.getRealmEquipmentHiddenTierCap(zone);
    const definitions = new Map(context.UNIQUE_DB.filter(entry => entry && entry.realmCodexOnly)
        .map(entry => [entry.name, entry]));
    let matching = null;
    for (let index = 0; index < attempts; index++) {
        const item = context.generateUniqueItem(tier);
        const definition = definitions.get(item.name);
        if (!definition) continue;
        assert.strictEqual(definition.realm, realm, '계 전용 고유는 다른 계의 드랍 풀에 섞이면 안 된다');
        matching = matching || item;
    }
    assert.ok(matching, `${realm} 전용 고유가 실제 해당 계의 고유 드랍에서 나와야 한다`);
    return matching;
}

sampleRealmUniques({ type: 'chaosRealm', tier: 30, floor: 1 }, 'chaos', 1200);
const underworldItem = sampleRealmUniques({ type: 'underworld', tier: 57, floor: 1 }, 'underworld', 1200);
sampleRealmUniques({ type: 'cosmos', tier: 50, lootTier: 1 }, 'cosmos', 1200);

context.__realmUniqueItem = underworldItem;
run('__realmUniqueAccepted = addItemToInventory(__realmUniqueItem, { guaranteedKeep: true });');
assert.strictEqual(context.__realmUniqueAccepted, true, '계 전용 고유는 보호된 전리품으로 습득 가능해야 한다');
assert.ok(context.game.uniqueCodex[`${underworldItem.slot}|${underworldItem.name}`],
    '습득한 계 전용 고유는 계 도감이 사용하는 고유 도감 상태에 등록되어야 한다');

const astraDefinition = context.UNIQUE_DB.find(entry => entry && entry.name === '아스트라의 파편');
assert.strictEqual(astraDefinition.dropOnly.bossDropChance, 0.08, '아스트라의 파편 보스 드랍률은 8%여야 한다');
context.__astraZone = { id: 'cosmos_astra', type: 'seasonBoss', tier: 82, cosmosCapstone: true };
run('getZone = function () { return __astraZone; }; game.currentZoneId = "cosmos_astra";');
const inventoryBeforeMiss = context.game.inventory.length;
run('__astraMiss = rollCosmosAstraUniqueDrop(__astraZone, function () { return 0.08; });');
assert.strictEqual(context.__astraMiss, null, '8% 경계값 이상에서는 아스트라의 파편이 나오면 안 된다');
assert.strictEqual(context.game.inventory.length, inventoryBeforeMiss, '실패한 드랍 판정은 인벤토리를 변경하면 안 된다');
run('__astraDrop = rollCosmosAstraUniqueDrop(__astraZone, function () { return 0.0799; });');
assert.strictEqual(context.__astraDrop.name, '아스트라의 파편', '성공한 8% 판정은 전용 고유를 지급해야 한다');
assert.ok(context.game.uniqueCodex[`${context.__astraDrop.slot}|아스트라의 파편`],
    '아스트라의 파편도 실제 습득 시 도감에 등록되어야 한다');

console.log('smoke-realm-unique-drops passed');
