const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const readJson = expression => JSON.parse(run(`JSON.stringify(${expression})`));

function resetGame() {
    run('game = JSON.parse(JSON.stringify(defaultGame)); window.game = game;');
}

function createButton() {
    const classes = new Set();
    const attributes = {};
    return {
        style: {}, dataset: {}, title: '',
        classList: {
            add: name => classes.add(name),
            remove: name => classes.delete(name),
            toggle: (name, enabled) => enabled ? classes.add(name) : classes.delete(name),
            contains: name => classes.has(name)
        },
        setAttribute: (name, value) => { attributes[name] = String(value); },
        removeAttribute: name => { delete attributes[name]; },
        addEventListener: () => {},
        attributes
    };
}

resetGame();
assert.deepStrictEqual(readJson('reconcileMapPrimaryContentUnlocks(game)'), []);
assert.deepStrictEqual(readJson('game.unlockedMapContents'), ['map-tab-zones']);
assert.strictEqual(typeof context.getAbyssPassiveState, 'undefined', 'the retired chaos-passive API must not stay public');
assert.deepStrictEqual(readJson("getAbyssMonsterScales({ type: 'abyss', depth: 20 })"), {
    dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1,
    playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0,
    bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1
});

resetGame();
run('game.chaosRealm.unlocked = true;');
assert.deepStrictEqual(readJson('reconcileMapPrimaryContentUnlocks(game)'), ['map-tab-chaos-realm']);
assert.strictEqual(run("getMapPrimaryContentEntryCondition('map-tab-chaos-realm', game)"), '혼돈 20 필요');
run('game.loopProgressCurrent.chaos20Cleared = true;');
assert.strictEqual(run("getMapPrimaryContentEntryCondition('map-tab-chaos-realm', game)"), '');

resetGame();
run(`
    game.chaosRealm.unlocked = true;
    game.loopProgressCurrent.chaos20Cleared = true;
    game.clearedRootBosses = ['s6_beast_cerberus'];
    game.abyssUnlockedDepths = [20, 30];
    game.labyrinthUnlockedMaxFloor = 100;
`);
assert.deepStrictEqual(readJson('reconcileMapPrimaryContentUnlocks(game)'), ['map-tab-chaos-realm', 'map-tab-underworld']);
run(`
    game.loopProgressCurrent.chaos20Cleared = false;
    game.clearedRootBosses = [];
    game.abyssUnlockedDepths = [20];
    game.abyssEndlessDepth = 20;
    game.labyrinthUnlockedMaxFloor = 1;
`);
assert.strictEqual(run("isMapPrimaryContentUnlocked(game, 'map-tab-underworld')"), true, '루프 뒤에도 영구 해금은 유지된다');
assert.strictEqual(run('getUnderworldEntryLockReason(game)'), '이번 루프 혼돈 20 클리어 필요');

resetGame();
run('game.season = 11;');
assert.deepStrictEqual(readJson('reconcileMapPrimaryContentUnlocks(game)'), ['map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp']);
run('game.season = 1; game.ocean.unlocked = false;');
assert.strictEqual(run("isMapPrimaryContentUnlocked(game, 'map-tab-ocean')"), true);
assert.strictEqual(run("isMapPrimaryContentUnlocked(game, 'map-tab-fishing')"), true);

const migrated = readJson(`mergeDefaults({
    unlockedMapContents: ['invalid-content'],
    underworldProgress: { highestFloor: 4, currentFloor: 2 },
    chaosRealm: { unlocked: true }
}).unlockedMapContents`);
assert.ok(migrated.includes('map-tab-zones') && !migrated.includes('map-tab-pvp'));
assert.ok(migrated.includes('map-tab-underworld'), '기존 지하계 진행 저장은 영구 탭 해금으로 복구한다');
assert.ok(!migrated.includes('invalid-content'), '알 수 없는 저장 id는 제거한다');

resetGame();
const buttons = {};
readJson('MAP_PRIMARY_CONTENTS.map(def => def.id)').forEach(id => { buttons['btn-' + id] = createButton(); });
context.document.getElementById = id => buttons[id] || null;
context.document.querySelectorAll = () => [];
context.socialCloudReady = () => false;
context.syncMapPrimaryContentTabs();
assert.strictEqual(buttons['btn-map-tab-zones'].style.display, '');
assert.strictEqual(buttons['btn-map-tab-chaos-realm'].style.display, 'none');
assert.strictEqual(buttons['btn-map-tab-pvp'].style.display, 'none');
run("game.unlockedMapContents.push('map-tab-pvp');game.season=2");
context.syncMapPrimaryContentTabs();
assert.strictEqual(buttons['btn-map-tab-pvp'].style.display, 'none','old saves cannot reveal PvP before its loop gate');
run('reconcileMapPrimaryContentUnlocks(game);game.season=3;reconcileMapPrimaryContentUnlocks(game)');
context.syncMapPrimaryContentTabs();
assert.strictEqual(buttons['btn-map-tab-pvp'].style.display, '');
assert.strictEqual(buttons['btn-map-tab-pvp'].dataset.entryCondition, '로그인 필요');
assert.ok(buttons['btn-map-tab-pvp'].classList.contains('map-primary-tab--entry-locked'));

const notices = [];
context.queueTutorialNotice = (...args) => notices.push(args);
run('game.chaosRealm.unlocked = true;');
assert.deepStrictEqual(Array.from(context.announceMapPrimaryContentUnlocks()), ['map-tab-chaos-realm']);
assert.strictEqual(buttons['btn-map-tab-chaos-realm'].style.display, '');
assert.ok(buttons['btn-map-tab-chaos-realm'].classList.contains('map-primary-tab-unlock-reveal'));
assert.strictEqual(notices.length, 1);
assert.strictEqual(notices[0][0], 'unlock_chaos_realm');
assert.deepStrictEqual(Array.from(context.announceMapPrimaryContentUnlocks()), []);
assert.strictEqual(notices.length, 1, '해금 안내는 한 번만 큐에 넣는다');

resetGame();
notices.length = 0;
run('game.season = 11;');
assert.deepStrictEqual(Array.from(context.announceMapPrimaryContentUnlocks()), ['map-tab-ocean', 'map-tab-fishing', 'map-tab-pvp']);
assert.strictEqual(notices.length, 1, '심해와 낚시는 하나의 짧은 안내로 묶는다');
assert.strictEqual(notices[0][4], 'map-tab-ocean');

const retired = readJson(`mergeDefaults({
    hideout: { active: true },
    abyssPassivePoints: 50,
    abyssPassives: { power: 20 },
    mapSubtab: 'map-tab-abyss',
    unlocks: { hideout: true },
    noti: { hideout: true },
    settings: { townReturnAction: 'hideout', notiFilters: { hideout: true } }
})`);
assert.strictEqual(retired.mapSubtab, 'map-tab-zones', 'retired map subtabs must return to exploration');
assert.strictEqual(retired.settings.townReturnAction, 'retry', 'retired hideout return saves must resume ordinary combat');
['hideout', 'abyssPassivePoints', 'abyssPassives'].forEach(key => {
    assert(!Object.prototype.hasOwnProperty.call(retired, key), `${key} must be removed from restored saves`);
});
assert(!Object.prototype.hasOwnProperty.call(retired.unlocks, 'hideout'));
assert(!Object.prototype.hasOwnProperty.call(retired.noti, 'hideout'));
assert(!Object.prototype.hasOwnProperty.call(retired.settings.notiFilters, 'hideout'));

const htmlSource = fs.readFileSync('index.html', 'utf8');
assert(!htmlSource.includes('id="tab-hideout"') && !htmlSource.includes('id="map-tab-abyss"'),
    'retired hideout and chaos-passive panels must not remain reachable');
assert(!htmlSource.includes('자동 진행과 전투 표시는 바로 조정하고, 세부 항목은 필요한 경우에만 펼쳐보세요.'),
    'the removed settings introduction must not render');

console.log('smoke-map-primary-content-tabs passed');
