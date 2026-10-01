const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const runtime = buildGameRuntime();
vm.runInContext(`
    const legacy = { tabOrder: ['btn-tab-items', 'btn-tab-char', 'btn-tab-items', 7, 'bad-id'],
        tabPlacement: { 'btn-tab-items': 'bottom', 'btn-tab-char': 'bad', '__proto__': 'bottom' } };
    const migratedLayouts = normalizeTabLayoutSettings(legacy);
    const migratedSave = mergeDefaults({ settings: legacy });
`, runtime);
const result = vm.runInContext('JSON.stringify(migratedSave.settings.tabLayouts)', runtime);
const parsed = JSON.parse(result);
assert.deepStrictEqual(parsed.desktop.tabOrder, ['btn-tab-items', 'btn-tab-char']);
assert.deepStrictEqual(parsed.mobile, parsed.desktop, 'legacy menu order seeds both platforms');
assert.deepStrictEqual(parsed.desktop.tabPlacement, { 'btn-tab-items': 'bottom' });
assert.strictEqual(vm.runInContext('migratedSave.settings.tabOrder', runtime), undefined, 'obsolete shared order is removed');
vm.runInContext(`
    migratedSave.settings.tabLayouts.mobile.tabOrder.reverse();
    migratedSave.settings.tabLayouts.mobile.tabPlacement['btn-tab-items'] = 'top';
    const restoredLayouts = mergeDefaults(JSON.parse(JSON.stringify(migratedSave))).settings.tabLayouts;
`, runtime);
assert.strictEqual(vm.runInContext("restoredLayouts.desktop.tabOrder[0]", runtime), 'btn-tab-items');
assert.strictEqual(vm.runInContext("restoredLayouts.desktop.tabPlacement['btn-tab-items']", runtime), 'bottom');
assert.strictEqual(vm.runInContext("restoredLayouts.mobile.tabOrder[0]", runtime), 'btn-tab-char');
assert.strictEqual(vm.runInContext("restoredLayouts.mobile.tabPlacement['btn-tab-items']", runtime), 'top');
const damaged = vm.runInContext("JSON.stringify(normalizeTabLayoutSettings({tabLayouts:{desktop:null,mobile:{tabOrder:'broken',tabPlacement:null}}}))", runtime);
// 없어진 창(가지치기 · 아르카나 · 전문가, 2026-10-01)의 순서 · 배치는 버리고, 나머지 사용자 배치는 그대로 둔다.
const retiredTabs = ['btn-tab-pruning', 'btn-tab-arcana', 'btn-tab-expertise'];
const retired = JSON.parse(vm.runInContext(`JSON.stringify(normalizeTabLayoutSettings({
    tabOrder:['btn-tab-arcana','btn-tab-items','btn-tab-expertise'],
    tabPlacement:{'btn-tab-pruning':'bottom','btn-tab-arcana':'top','btn-tab-expertise':'bottom','btn-tab-items':'bottom'}}))`, runtime));
for (const platform of ['desktop','mobile']) {
    assert.deepStrictEqual(retired[platform].tabOrder, ['btn-tab-items'], 'retired tabs leave the saved order');
    assert.deepStrictEqual(Object.keys(retired[platform].tabPlacement).filter(id => retiredTabs.includes(id)), [], 'retired tabs leave the saved placement');
    assert.strictEqual(retired[platform].tabPlacement['btn-tab-items'],'bottom','unrelated custom placements survive');
}
assert.deepStrictEqual(JSON.parse(damaged).mobile, { tabOrder: [], tabPlacement: {}, tabGroupOrder: [] });
console.log('Platform menu migration and independent save roundtrip passed.');
assert.strictEqual(vm.runInContext('mergeDefaults({settings:{}}).settings.mobileCombatLogExpanded', runtime), false);
assert.strictEqual(vm.runInContext('mergeDefaults({settings:{mobileCombatLogExpanded:"false"}}).settings.mobileCombatLogExpanded', runtime), false);
assert.strictEqual(vm.runInContext('mergeDefaults({settings:{mobileCombatLogExpanded:true,combatLogCollapsed:false}}).settings.mobileCombatLogExpanded', runtime), true);
