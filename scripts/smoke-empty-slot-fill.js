// Review 2026-10-01 #9: received expedition equipment lights the 장비 badge, and one "빈 칸 채우기" action fills every
// empty slot from the bag (best tier/rarity first) without touching occupied slots or ineligible items.
const assert = require('node:assert/strict');
const fixture = require('./lib/replay-fixture');
const { run } = fixture(41);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));

// Settlement: equipment rewards mark the 장비 badge (they used to arrive silently) but never change the build.
run(`game.currentZoneId=0;game.settings.mapCompleteAction='stop';game.noti.items=false;startEncounterRun(true);
    actExplorationLoot.capture(game,game.actExploration,()=>actExplorationLoot.delivery(game,'equipment')
        .store(createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='투구'),'magic',2)));
    game.actExploration.status='cleared';window.beforeEquipment=JSON.stringify(game.equipment);finishEncounterRun();`);
assert.equal(run('game.noti.items'), true, 'received equipment lights the equipment badge');
assert.equal(run('JSON.stringify(game.equipment)'), run('window.beforeEquipment'), 'settlement leaves the build alone');

// Fill: the better of two helmets goes on, the weapon slot keeps its item, a level-locked ring stays in the bag.
run(`game.level=5;game.inventory=[];
    game.equipment['무기']=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'normal',1);
    ['투구','갑옷','반지1','반지2'].forEach(slot=>{game.equipment[slot]=null;});
    window.lowHelm=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='투구'),'normal',1);
    window.highHelm=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='투구'),'rare',1);
    window.spareSword=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'),'rare',1);
    window.lockedRing=BASE_ITEM_DB.filter(base=>base.slot==='반지').map(base=>createItemFromBase(base,'rare',1))
        .find(item=>levelProgression.requirements(item).level>game.level);
    game.inventory.push(lowHelm,highHelm,spareSword,lockedRing);`);
const fillable = run('countFillableEmptySlots()');
assert.equal(fillable, 1, 'only the helmet slot has a usable bag item');
const weaponBefore = copy("game.equipment['무기'].id");
assert.equal(run('equipIntoEmptySlots(game.inventory.slice())'), 1);
assert.equal(run("game.equipment['투구'].id"), run('highHelm.id'), 'the rarer helmet is chosen');
assert.equal(copy("game.equipment['무기'].id"), weaponBefore, 'occupied slots are never replaced');
assert.deepEqual(copy('game.inventory.map(item=>item.id)').sort(), copy('[lowHelm.id,spareSword.id,lockedRing.id]').sort(),
    'the equipped helmet leaves the bag; the rest stay');
assert.equal(run('countFillableEmptySlots()'), 0, 'nothing else fits');
console.log('empty slot fill smoke passed');
