const assert = require('node:assert/strict');
const {runtime, run} = require('./lib/replay-fixture')(17);
const frames = new Map(), idle = new Map();
let next = 1;
runtime.requestAnimationFrame = callback => { const id = next++; frames.set(id, callback); return id; };
runtime.cancelAnimationFrame = id => frames.delete(id);
runtime.requestIdleCallback = callback => { const id = next++; idle.set(id, callback); return id; };
runtime.cancelIdleCallback = id => idle.delete(id);
const tooltip = {style:{display:'none'}, innerHTML:'', classList:{toggle(){}},
    getBoundingClientRect:() => ({width:320,height:360})};
runtime.document.getElementById = id => id === 'item-tooltip-box' ? tooltip : null;
run(`game.equipment = { 반지1: {id:801,slot:'반지',name:'왼쪽 반지',rarity:'rare',baseStats:[],stats:[]},
    반지2: {id:802,slot:'반지',name:'오른쪽 반지',rarity:'rare',baseStats:[],stats:[{id:'flatHp',val:10}]} };
    game.inventory = [{id:901,slot:'반지',baseName:'후보 반지',name:'후보 반지',rarity:'rare',baseStats:[],stats:[{id:'flatHp',val:30}]},
    {id:902,slot:'투구',baseName:'후보 투구',name:'후보 투구',rarity:'rare',baseStats:[],stats:[{id:'flatHp',val:50}]}];
    cachedTooltipStats = normalizeUiPlayerStats({maxHp:999999,dps:999999});
`);
const equipment = run('JSON.stringify(game.equipment)');
function advance(queue) {
    if (queue === frames) {
        const pending = [...frames.values()]; frames.clear();
        assert.ok(pending.length); pending.forEach(callback => callback()); return;
    }
    const [id, callback] = queue.entries().next().value || [];
    assert.ok(callback, 'expected pending browser work'); queue.delete(id); callback();
}
function open(index) { runtime.showItemTooltip({clientX:40,clientY:50}, index, false); }
open(0);
assert.ok(tooltip.innerHTML.includes('후보 반지'));
assert.ok(!tooltip.innerHTML.includes('착용 시 변화'));
assert.equal(idle.size, 0, 'item details get a render opportunity before comparison starts');
advance(frames);
assert.ok(!tooltip.innerHTML.includes('착용 시 변화'));
advance(idle);
assert.ok(!tooltip.innerHTML.includes('착용 시 변화'), 'dual slots publish together');
advance(idle);
assert.ok(tooltip.innerHTML.includes('왼쪽 반지 기준 착용 시 변화'));
assert.ok(tooltip.innerHTML.includes('오른쪽 반지 기준 착용 시 변화'));
assert.ok(!tooltip.innerHTML.includes('999'), 'stale tooltip stats must not become the comparison baseline');
assert.equal(run('JSON.stringify(game.equipment)'), equipment);
const first = tooltip.innerHTML;
runtime.dismissItemTooltipNow();
run("game.inventory[0].stats[0].val = 300;");
open(0); advance(frames); advance(idle); advance(idle);
assert.notEqual(tooltip.innerHTML, first, 'revisiting observes changed gear without stale cached markup');
runtime.dismissItemTooltipNow();
open(0); advance(frames);
const abandoned = idle.values().next().value;
open(1);
abandoned();
assert.ok(tooltip.innerHTML.includes('후보 투구'));
assert.ok(!tooltip.innerHTML.includes('왼쪽 반지'), 'late callbacks cannot publish a previous item');
runtime.dismissItemTooltipNow();
if (frames.size) advance(frames);
assert.equal(idle.size, 0);
open(1); advance(frames);
run(`Object.defineProperty(game.inventory[1].stats[0], 'val', {get(){throw new Error('unreadable candidate stat');}, configurable:true});`);
advance(idle);
assert.ok(tooltip.innerHTML.includes('장비 비교를 표시하지 못했습니다.'));
assert.equal(run('JSON.stringify(game.equipment)'), equipment, 'failed candidate evaluation restores equipment');
console.log('smoke-item-tooltip-performance passed');
