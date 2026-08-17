const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const context = buildGameRuntime();
const run = source => vm.runInContext(source, context);
const copy = value => JSON.parse(JSON.stringify(value));
const logs = [];
context.addLog = message => logs.push(String(message));

function makeItem(id, name, slot) {
    return { id, name, slot, rarity: 'rare', baseStats: [], stats: [], itemTier: 10, hiddenTier: 10 };
}

function loadGame(save = {}) {
    context.__equipmentLoadoutSave = copy(save);
    run('game = mergeDefaults(__equipmentLoadoutSave); equipmentLoadoutRuntime.ensureState(game);');
    return run('game');
}

{
    const state = loadGame({ equipmentLoadouts: {
        selectedSlot: 99,
        presets: [{ name: '  보스 세팅  ', slots: { '무기': { id: 7, name: '검' }, '투구': { id: 'broken' } } }, 'broken']
    } });
    assert.strictEqual(state.equipmentLoadouts.selectedSlot, 2, '선택 슬롯은 유효 범위로 정규화해야 한다');
    assert.strictEqual(state.equipmentLoadouts.presets[0].name, '보스 세팅', '프리셋 이름의 공백을 정리해야 한다');
    assert.strictEqual(state.equipmentLoadouts.presets[0].slots['무기'].id, 7, '유효한 장비 참조는 보존해야 한다');
    assert.strictEqual(state.equipmentLoadouts.presets[0].slots['투구'], null, '손상된 장비 참조는 제거해야 한다');
    assert.strictEqual(state.equipmentLoadouts.presets[1], null, '손상된 프리셋은 비워야 한다');
}

{
    const state = loadGame();
    const sword = makeItem(101, '사냥검', '무기');
    const helmet = makeItem(102, '사냥 투구', '투구');
    const bossSword = makeItem(103, '보스검', '무기');
    state.equipment['무기'] = sword;
    state.equipment['투구'] = helmet;
    state.inventory = [bossSword];
    const saved = context.equipmentLoadoutRuntime.save(0, '사냥');
    assert.deepStrictEqual(copy(saved), { ok: true, preset: copy(state.equipmentLoadouts.presets[0]), count: 2 }, '현재 장비를 프리셋에 저장해야 한다');

    state.equipment['무기'] = bossSword;
    state.inventory = [sword];
    const beforeIds = [state.equipment['무기'], state.equipment['투구'], ...state.inventory].map(item => item.id).sort();
    const applied = context.equipmentLoadoutRuntime.apply(0, state);
    assert.strictEqual(applied.ok, true, '보유한 장비 세팅은 적용할 수 있어야 한다');
    assert.strictEqual(state.equipment['무기'], sword, '저장한 실제 장비 객체를 무기 슬롯에 복원해야 한다');
    assert.strictEqual(state.equipment['투구'], helmet, '이미 맞는 슬롯 장비는 그대로 유지해야 한다');
    assert.deepStrictEqual(copy(state.inventory.map(item => item.id)), [103], '교체된 장비는 인벤토리로 이동해야 한다');
    const afterIds = [state.equipment['무기'], state.equipment['투구'], ...state.inventory].map(item => item.id).sort();
    assert.deepStrictEqual(afterIds, beforeIds, '세팅 전환이 장비를 복제하거나 삭제하면 안 된다');
    assert.strictEqual(context.equipmentLoadoutRuntime.inspect(0, state).applied, true, '적용 중인 세팅을 판별해야 한다');
}

{
    const state = loadGame();
    const sword = makeItem(201, '사라진 검', '무기');
    const replacement = makeItem(202, '현재 검', '무기');
    state.equipment['무기'] = sword;
    context.equipmentLoadoutRuntime.save(0, '누락 검사', state);
    state.equipment['무기'] = replacement;
    state.inventory = [];
    const before = copy({ equipment: state.equipment, inventory: state.inventory });
    const result = context.equipmentLoadoutRuntime.apply(0, state);
    assert.strictEqual(result.ok, false, '누락 장비가 있으면 세팅 적용을 거부해야 한다');
    assert.ok(result.reason.includes('사라진 검'), '누락된 장비 이름을 알려야 한다');
    assert.deepStrictEqual(copy({ equipment: state.equipment, inventory: state.inventory }), before, '실패한 전환은 일부 상태도 바꾸면 안 된다');
}

{
    const state = loadGame();
    const sword = makeItem(301, '용량 검', '무기');
    const helmet = makeItem(302, '벗을 투구', '투구');
    state.equipment['무기'] = sword;
    context.equipmentLoadoutRuntime.save(0, '한 부위', state);
    state.equipment['투구'] = helmet;
    state.inventory = Array.from({ length: context.getInventoryLimit() }, (_, index) => makeItem(400 + index, `가득 ${index}`, '반지'));
    const result = context.equipmentLoadoutRuntime.apply(0, state);
    assert.strictEqual(result.ok, false, '전환 후 인벤토리가 넘치면 적용을 거부해야 한다');
    assert.ok(result.reason.includes('1칸 초과'), '필요한 빈칸 수를 알려야 한다');
    assert.strictEqual(state.equipment['투구'], helmet, '용량 실패 시 기존 장착 상태를 유지해야 한다');
}

{
    const state = loadGame();
    const sword = makeItem(450, '중복 검', '무기');
    state.equipment['무기'] = sword;
    context.equipmentLoadoutRuntime.save(0, '손상 세팅', state);
    state.equipmentLoadouts.presets[0].slots['투구'] = { id: sword.id, name: sword.name };
    const result = context.equipmentLoadoutRuntime.apply(0, state);
    assert.strictEqual(result.ok, false, '같은 장비를 두 슬롯에 저장한 손상 프리셋을 거부해야 한다');
    assert.ok(result.reason.includes('같은 장비'), '중복 장비 참조 오류를 명시해야 한다');
    assert.strictEqual(state.equipment['투구'], null, '중복 참조 실패 시 장비를 복제하면 안 된다');
}

{
    const state = loadGame();
    const sword = makeItem(470, '현재 검', '무기');
    const boots = makeItem(471, '잘못 저장된 장화', '신발');
    state.equipment['무기'] = sword;
    state.inventory = [boots];
    context.equipmentLoadoutRuntime.save(0, '슬롯 검사', state);
    state.equipmentLoadouts.presets[0].slots['무기'] = { id: boots.id, name: boots.name };
    const before = copy({ equipment: state.equipment, inventory: state.inventory });
    const result = context.equipmentLoadoutRuntime.apply(0, state);
    assert.strictEqual(result.ok, false, '슬롯과 맞지 않는 장비가 저장된 프리셋을 거부해야 한다');
    assert.ok(result.reason.includes('장착할 수 없는'), '장착 호환성 오류를 명시해야 한다');
    assert.deepStrictEqual(copy({ equipment: state.equipment, inventory: state.inventory }), before, '호환성 실패 시 장비 상태를 유지해야 한다');
}

{
    const state = loadGame();
    const sword = makeItem(501, '보호 검', '무기');
    const replacement = makeItem(502, '교체 검', '무기');
    state.equipment['무기'] = sword;
    context.equipmentLoadoutRuntime.save(0, '보호', state);
    state.equipment['무기'] = replacement;
    state.inventory = [sword];
    assert.strictEqual(context.isBulkSalvageProtectedItem(sword), true, '프리셋 장비는 일괄 해체에서 보호해야 한다');
    logs.length = 0;
    context.salvageItem(0);
    assert.deepStrictEqual(copy(state.inventory.map(item => item.id)), [501], '프리셋 장비는 개별 해체도 막아야 한다');
    assert.ok(logs.some(message => message.includes('장비 세팅')), '해체가 막힌 이유를 알려야 한다');
    context.equipmentLoadoutRuntime.clear(0, state);
    assert.strictEqual(context.isBulkSalvageProtectedItem(sword), false, '프리셋을 비우면 자동 보호도 해제해야 한다');
}

{
    const state = loadGame();
    state.equipment['무기'] = makeItem(601, '렌더 검', '무기');
    context.equipmentLoadoutRuntime.save(0, '렌더 검사', state);
    let writes = 0;
    let html = '';
    const root = { dataset: {} };
    Object.defineProperty(root, 'innerHTML', {
        get: () => html,
        set: value => { writes += 1; html = value; }
    });
    context.document.getElementById = id => id === 'ui-equipment-presets' ? root : null;
    context.equipmentLoadoutUi.render();
    context.equipmentLoadoutUi.render();
    assert.strictEqual(writes, 1, 'unchanged UI refreshes must not replace the loadout preset controls');
}

console.log('smoke-equipment-loadouts passed');
