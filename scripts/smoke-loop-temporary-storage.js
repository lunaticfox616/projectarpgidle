// 장비 임시 보관함은 루프가 끝나면 가방처럼 비운다(사용자 결정 2026-10-03). 한도 없이 루프를 넘어 쌓여 브라우저 저장
// 한도를 넘길 수 있었다. 우로보로스로 봉인한 장비는 임시 보관함에 있었어도 루프를 넘어 가방으로 돌아온다.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const json = source => JSON.parse(vm.runInContext(`JSON.stringify(${source})`, context));
const result = json(`(() => {
    showGameToast = () => {};
    game = mergeDefaults({ heroSelectionInitialized: true, selectedHeroId: 'hero2', selectedClassId: 'warrior', season: 5, level: 60 }); window.game = game;
    const make = (slot, sealed) => Object.assign(createItemFromBase(BASE_ITEM_DB.find(base => base.slot === slot), 'rare', 20, {}), sealed ? { loopSealed: true } : {});
    const waitingSealed = make('반지', true), waiting = make('장갑', false), bagSealed = make('투구', true);
    game.inventory = [bagSealed, make('갑옷', false)];
    game.equipmentTemporaryStorage = [waiting, waitingSealed];
    triggerSeasonReset('chaos');
    return { temporary: game.equipmentTemporaryStorage.length, bag: game.inventory.map(item => item.id).sort(),
        sealed: [waitingSealed.id, bagSealed.id].sort() };
})()`);
assert.strictEqual(result.temporary, 0, 'the temporary storage empties at the end of a loop');
assert.deepStrictEqual(result.bag, result.sealed, 'sealed gear survives the loop, from the bag or the temporary storage, and nothing else');
console.log('smoke-loop-temporary-storage passed');
