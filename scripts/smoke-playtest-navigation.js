// Regressions observed in the main-based phone playtest. Only the DOM/storage
// boundary is replaced; the real navigation and equipment settings code runs.
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const nodes = new Map();
function element(active = false) {
    const classes = new Set(active ? ['active'] : []), attributes = new Map();
    return { style: {}, dataset: {}, attributes,
        classList: { contains: key => classes.has(key), add: key => classes.add(key),
            remove: key => classes.delete(key), toggle(key, on) { if (on) classes.add(key); else classes.delete(key); } },
        setAttribute: (key, value) => attributes.set(key, value),
        querySelector: () => null, querySelectorAll: () => [] };
}
const tabs = [element(), element(true), element()];
const runtime = buildGameRuntime({}, null, {
    getElementById: id => nodes.get(id) || null,
    querySelectorAll: selector => selector === '[data-mobile-tab-button]' ? tabs : [],
    querySelector: () => null
});
const run = code => vm.runInContext(code, runtime);
nodes.set('btn-mobile-nav-more', element());
nodes.set('tab-header-main', element());
run('syncMobilePrimaryNavigationState()');
assert.deepEqual(tabs.map(tab => tab.attributes.get('aria-pressed')), ['false', 'true', 'false'],
    'phone navigation exposes the tab that is actually visible');
tabs[1].classList.remove('active'); tabs[2].classList.add('active');
run('syncMobilePrimaryNavigationState()');
assert.deepEqual(tabs.map(tab => tab.attributes.get('aria-pressed')), ['false', 'false', 'true'],
    'changing tabs clears the former selection');

nodes.set('item-tab-equip', element(true));
nodes.set('btn-item-tab-equip', element(true));
nodes.set('btn-equipment-mobile-inventory', element());
nodes.set('btn-equipment-mobile-loadout', element());
runtime.matchMedia = () => ({ matches: true });
run("game.itemSubtab='item-tab-equip'; game.settings.equipmentMobilePane='inventory'; game.inventory=[]; game.equipment['투구']={id:1,name:'첫 투구'}; tutorialActionUi.openEquipment();");
assert.equal(run('game.settings.equipmentMobilePane'), 'loadout', 'auto-equipped first loot opens the worn equipment on phones');
run("game.inventory=[{id:2,name:'비교할 투구'}]; tutorialActionUi.openEquipment();");
assert.equal(run('game.settings.equipmentMobilePane'), 'inventory', 'unequipped loot still opens the comparison inventory');
assert.equal(run("game.equipment['투구'].id"), 1, 'opening the guide never equips or removes items');
assert.equal(run('game.inventory.length'), 1, 'opening the guide preserves inventory');
console.log('Playtest navigation: mobile selection and first-loot destination OK');
