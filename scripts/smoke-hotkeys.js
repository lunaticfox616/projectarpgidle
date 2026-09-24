// 단축키 배정(js/hotkeys.js)과 수동 플라스크 사용(useFlaskSlot)을 실제 게임 모듈로 검사한다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 기본 배치: 창 C·P·I·M·G·J, 플라스크 1~5. 기본값은 저장하지 않는다.
assert.equal(run("hotkeyBindings.actionForCode({}, 'Digit1').id"), 'flask:0');
assert.equal(run("hotkeyBindings.actionForCode({}, 'Digit5').id"), 'flask:4');
assert.equal(run("hotkeyBindings.actionForCode({}, 'KeyI').target"), 'tab-items');
assert.equal(run("hotkeyBindings.actionForCode({}, 'Digit6')"), null);
assert.deepEqual(json("hotkeyBindings.normalize({'flask:0':'Digit1'})"), {}, 'a default binding is not stored');

// 바꾸기: 다른 동작이 쓰던 키는 그 동작에서 비워진다(한 키 = 한 동작).
const moved = json("hotkeyBindings.assign({}, 'flask:0', 'KeyC')");
assert.deepEqual(moved.displaced, ['window:tab-character']);
assert.deepEqual(moved.overrides, { 'window:tab-character': '', 'flask:0': 'KeyC' });
assert.equal(run(`hotkeyBindings.actionForCode(${JSON.stringify(moved.overrides)}, 'KeyC').id`), 'flask:0');
assert.equal(run(`hotkeyBindings.actionForCode(${JSON.stringify(moved.overrides)}, 'Digit1')`), null, 'the old key is free after moving');
assert.equal(run("hotkeyBindings.assign({}, 'flask:0', 'Escape').rejected"), true, 'Esc/F-keys/Space stay reserved');
assert.deepEqual(json("hotkeyBindings.assign({}, 'window:tab-map', '').overrides"), { 'window:tab-map': '' }, 'a binding can be cleared');
assert.equal(run("hotkeyBindings.label('Numpad3') + hotkeyBindings.label('Slash') + hotkeyBindings.label('KeyQ')"), 'Num3/Q');

// 저장 경계: 알 수 없는 동작·잘못된 키·충돌을 정리한다. 이전 저장(값 없음)은 기본 배치.
assert.deepEqual(json("mergeDefaults({}).settings.hotkeyOverrides"), {});
const loaded = json(`mergeDefaults({settings:{hotkeyOverrides:{'flask:1':'KeyC','ghost':'KeyZ','flask:2':'F5','flask:3':7}}}).settings.hotkeyOverrides`);
assert.deepEqual(loaded, { 'flask:1': '' }, 'corrupt entries drop; a key already owned by an earlier action is released');
const roundTrip = json(`mergeDefaults(JSON.parse(JSON.stringify({settings:{hotkeyOverrides:${JSON.stringify(moved.overrides)}}}))).settings.hotkeyOverrides`);
assert.deepEqual(roundTrip, moved.overrides, 'saved rebinding survives a save round trip');

// 수동 플라스크: 충전 1 소모, 이미 켜져 있거나 가득 차면 거절, 잠금 전엔 사용 불가.
run(`game=mergeDefaults({season:1});window.game=game;contentProgression.sync();`);
assert.equal(run("useFlaskSlot(0).reason"), 'locked');
run(`game=mergeDefaults({season:2});window.game=game;contentProgression.sync();ensureFlaskState();game.playerHp=getPlayerStats().maxHp;`);
assert.equal(run("useFlaskSlot(0).reason"), 'full', 'full life does not waste a charge');
run('game.playerHp=Math.floor(getPlayerStats().maxHp/3)');
const before = run('ensureFlaskState().healCharges');
assert.equal(run('useFlaskSlot(0).ok'), true);
assert.equal(run('ensureFlaskState().healCharges'), before - 1, 'drinking spends exactly one charge');
assert.ok(run('ensureFlaskState().healOverTimeUntil > getCombatTime()'), 'healing over time starts');
assert.equal(run('useFlaskSlot(0).reason'), 'active', 'a running heal cannot be stacked');
assert.equal(run('ensureFlaskState().healCharges'), before - 1);
assert.equal(run('useFlaskSlot(1).reason'), 'empty', 'an empty utility socket cannot be used');
run('game.playerHp=0');
assert.equal(run('useFlaskSlot(0).reason'), 'dead');
console.log('smoke-hotkeys passed');
