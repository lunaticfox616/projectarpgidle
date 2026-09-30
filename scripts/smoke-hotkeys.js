// 단축키 배정(js/hotkeys.js)을 실제 게임 모듈로 검사한다. 플라스크 1~5 단축키는 2026-10-01 물약 삭제와 함께 없어졌다.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const runtime = buildGameRuntime();
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));

// 기본 배치: 창 C·P·I·M·G·J, 이동 스킬 E, 자동 이동 A. 숫자 키는 비어 있다. 기본값은 저장하지 않는다.
assert.equal(run("hotkeyBindings.actionForCode({}, 'KeyE').id"), 'combat:mobility');
assert.equal(run("hotkeyBindings.actionForCode({}, 'KeyA').id"), 'combat:autoMove');
assert.equal(run("hotkeyBindings.actionForCode({}, 'KeyI').target"), 'tab-items');
assert.equal(run("hotkeyBindings.actionForCode({}, 'Digit1')"), null, 'the former flask keys are free');
assert.equal(run("hotkeyBindings.actions.some(action => action.kind === 'flask')"), false);
assert.deepEqual(json("hotkeyBindings.normalize({'combat:mobility':'KeyE'})"), {}, 'a default binding is not stored');

// 바꾸기: 다른 동작이 쓰던 키는 그 동작에서 비워진다(한 키 = 한 동작).
const moved = json("hotkeyBindings.assign({}, 'combat:mobility', 'KeyC')");
assert.deepEqual(moved.displaced, ['window:tab-character']);
assert.deepEqual(moved.overrides, { 'window:tab-character': '', 'combat:mobility': 'KeyC' });
assert.equal(run(`hotkeyBindings.actionForCode(${JSON.stringify(moved.overrides)}, 'KeyC').id`), 'combat:mobility');
assert.equal(run(`hotkeyBindings.actionForCode(${JSON.stringify(moved.overrides)}, 'KeyE')`), null, 'the old key is free after moving');
assert.equal(run("hotkeyBindings.assign({}, 'combat:mobility', 'Escape').rejected"), true, 'Esc/F-keys/Space stay reserved');
assert.deepEqual(json("hotkeyBindings.assign({}, 'window:tab-map', '').overrides"), { 'window:tab-map': '' }, 'a binding can be cleared');
assert.equal(run("hotkeyBindings.label('Numpad3') + hotkeyBindings.label('Slash') + hotkeyBindings.label('KeyQ')"), 'Num3/Q');

// 저장 경계: 알 수 없는 동작(없어진 플라스크 포함) · 잘못된 키 · 충돌을 정리한다. 이전 저장(값 없음)은 기본 배치.
assert.deepEqual(json("mergeDefaults({}).settings.hotkeyOverrides"), {});
const loaded = json(`mergeDefaults({settings:{hotkeyOverrides:{'combat:autoMove':'KeyC','ghost':'KeyZ','flask:0':'Digit1','combat:mobility':'F5','window:tab-map':7}}}).settings.hotkeyOverrides`);
assert.deepEqual(loaded, { 'combat:autoMove': '' }, 'corrupt and removed entries drop; a key already owned by an earlier action is released');
const roundTrip = json(`mergeDefaults(JSON.parse(JSON.stringify({settings:{hotkeyOverrides:${JSON.stringify(moved.overrides)}}}))).settings.hotkeyOverrides`);
assert.deepEqual(roundTrip, moved.overrides, 'saved rebinding survives a save round trip');
console.log('smoke-hotkeys passed');
