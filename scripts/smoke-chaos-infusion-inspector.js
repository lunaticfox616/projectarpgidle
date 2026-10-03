// 장비 상세의 "주입"(예전 혼돈 주입기 하위 탭, 2026-09-30 보조 콘텐츠 통합 1단계): 단추 노출 조건, 확정 흐름,
// 저장된 하위 탭과 해금 장부의 이관.
const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');

const nodes = [];
const context = buildGameRuntime({}, null, {
    getElementById: id => nodes.find(node => node.id === id && !node.removed) || null,
    body: { append(node) { node.remove = () => { node.removed = true; }; nodes.push(node); } }
});
const run = source => vm.runInContext(source, context);
const openDialog = () => nodes.find(node => node.id === 'chaos-infusion-overlay' && !node.removed);

run(`game.chaosInfuserUnlocked = false; game.woodsmanSimulatorSeenLoop = false; game.woodsmanDefeatAttempts = 0; game.journalEntries = [];
    game.woodsmanBuildLock = false; game.inventory = [];`);
const armorId = run(`(() => { const item = createItemFromBase(BASE_ITEM_DB.find(row => row.slot === '갑옷'), 'rare', 10);
    item.stats = []; item.chaosInfusion = null; game.inventory.push(item); return item.id; })()`);
const armor = () => run(`game.inventory.find(item => item.id === ${armorId})`);
assert.strictEqual(context.chaosInfusionUi.actionHtml(armor(), null), '', 'the action stays hidden until the woodsman is met');

run('game.chaosInfuserUnlocked = true;');
const action = context.chaosInfusionUi.actionHtml(armor(), null);
assert(action.includes(`equipmentInventoryInteraction.focus(null);chaosInfusionUi.open(${armorId},false)`) && action.includes('>주입<'), 'a rare inventory item offers 주입');
assert(context.chaosInfusionUi.actionHtml(armor(), '갑옷').includes(`chaosInfusionUi.open('갑옷',true)`), 'an equipped item keeps its slot reference');
assert.strictEqual(context.chaosInfusionUi.actionHtml({ ...armor(), rarity: 'magic' }, null), '', 'magic items cannot be infused');

const option = run(`getChaosInfuserOption('res_fire')`);
run(`game.currencies['${option.currency}'] = ${option.cost}; game.currencies.blightSpore = 0;`);
context.chaosInfusionUi.open(armorId, false);
assert(openDialog(), 'opening selects the item and shows the dialog');
assert(openDialog().innerHTML.includes(`chaosInfusionUi.choose('res_fire')`), 'the dialog lists the slot options');
assert.strictEqual(run('getSelectedCraftItem()'), armor(), 'the dialog works on the crafting selection');

(async () => {
    context.requestGameConfirmation = async () => false;
    await context.chaosInfusionUi.choose('res_fire');
    assert.strictEqual(armor().chaosInfusion, null, 'a cancelled comparison changes nothing');
    context.requestGameConfirmation = async () => true;
    await context.chaosInfusionUi.choose('res_fire');
    assert.strictEqual(armor().chaosInfusion.sourceOptionId, 'res_fire', 'a confirmed comparison infuses the line');
    assert.strictEqual(run(`game.currencies['${option.currency}']`), 0, 'the infusion is paid once');
    assert(openDialog().innerHTML.includes('현재 주입'), 'the dialog re-renders with the current line');
    context.chaosInfusionUi.close();
    assert(!openDialog(), 'closing removes the dialog');

    const restored = run(`craftingWorkspaceState.restore({ itemSubtab: 'item-tab-infuser', currencies: {}, craftingWorkspace: null })`);
    assert.strictEqual(restored.itemSubtab, 'item-tab-equip', 'a save on the removed subtab reopens the equipment window');
    assert(!run(`CONTENT_UNLOCK_CATALOG.some(row => row.id === 'infuser')`), 'the infuser unlock entry is gone');
    const ledger = run(`contentProgression.restore({ version: 7, highestLoop: 12, unlocked: ['craft', 'infuser'], paidCosts: { craft: 1, infuser: 1 } }, { ...game, season: 12 }, true)`);
    assert.deepStrictEqual([...ledger.unlocked], ['craft'], 'a saved infuser purchase drops out of the ledger');
    console.log('chaos infusion inspector smoke passed');
})().catch(error => { console.error(error); process.exit(1); });
