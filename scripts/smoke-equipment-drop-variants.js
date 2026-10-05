// PoE식 장비 드랍 변형과 보급 상자 등급(2026-10-05 사용자 요청): 장비 한 개가 떨어질 때 복제(똑같은 장비 하나 더) · 묶음(같은 베이스
// 여러 개, 옵션은 따로) · 타락(제작 불가 대신 추가 옵션 강화) 중 하나가 될 수 있고, 보급 상자는 나무 · 은 · 금 등급에 따라 보상이 다르다.
// 실제 생성(generateEquipmentDrop) · 실제 인벤토리 · 실제 상자 개봉으로 확인한다. 난수는 replay fixture의 고정 시드와 주입한 rng(경계)다.
const assert = require('node:assert/strict');
const { run } = require('./lib/replay-fixture')(905);
const copy = code => JSON.parse(run(`JSON.stringify(${code})`));
const fixed = value => `(()=>${value})`;
run(`window.drop=(rarity)=>{const item=generateEquipmentDrop({isBoss:false,isElite:false},{minimumRarity:rarity,zone:getZone(3)});
    return item.rarity==='unique'?drop(rarity):item;};`);

run(`window.notes=[];window.CustomEvent=function(type,init){this.type=type;this.detail=init&&init.detail;};const send=window.dispatchEvent;
    window.dispatchEvent=e=>{if(e.type==='project-idle:equipment-drop-variant')notes.push(e.detail.kind);return send.call(window,e);};`);
// Loop 1 never varies; uniques and already corrupted items never vary.
run('game.season=1;');
assert.equal(copy(`equipmentDropVariants.expand(drop('rare'),{rng:${fixed(0)}}).kind`), null, 'no variants in loop 1');
run('game.season=2;');
assert.equal(copy(`(()=>{const u=generateUniqueItem(5,'반지',null,getZone(3));return equipmentDropVariants.expand(u,{rng:${fixed(0)}}).items.length;})()`), 1, 'uniques never vary');

// Corrupted: crafting is refused, every explicit line is stronger than it rolled, base lines and the id stay.
const corrupted = copy(`(()=>{const item=drop('rare'),before=JSON.parse(JSON.stringify(item)),out=equipmentDropVariants.expand(item,{rng:${fixed(0)}});
    return {kind:out.kind,count:out.items.length,before,after:out.items[0],block:equipmentCrafting.getBlockReason(out.items[0],'spore'),
        events:notes.splice(0),again:equipmentDropVariants.expand(out.items[0],{rng:${fixed(0)}}).kind};})()`);
assert.equal(corrupted.kind, 'corrupted');
assert.equal(corrupted.count, 1, 'a corrupted drop is still one item');
assert.equal(corrupted.after.corrupted, true);
assert.match(corrupted.block, /타락/, 'a corrupted drop cannot be crafted');
assert.equal(corrupted.after.id, corrupted.before.id);
assert.deepEqual(corrupted.after.baseStats, corrupted.before.baseStats, 'base lines are untouched');
corrupted.before.stats.forEach((stat, i) => {
    if (stat.fixedValue || !(stat.val > 0)) return assert.equal(corrupted.after.stats[i].val, stat.val);
    assert.ok(corrupted.after.stats[i].val > stat.val, `${stat.id} ${stat.val} grew (${corrupted.after.stats[i].val})`);
});
assert.deepEqual(corrupted.events, ['corrupted'], 'one variant event names the drop for the loot log');
assert.equal(corrupted.again, null, 'a corrupted item is never corrupted again');
assert.equal(copy(`equipmentDropVariants.expand(drop('normal'),{rng:${fixed(0)}}).kind`), null, 'an item without explicit lines drops as it is');

// Duplicate: two identical items with their own ids; changing one leaves the other.
const twin = copy(`(()=>{const out=equipmentDropVariants.expand(drop('magic'),{rng:${fixed(0.055)}});const [a,b]=out.items;
    b.stats[0].val+=100;return {kind:out.kind,count:out.items.length,ids:[a.id,b.id],same:a.name===b.name&&a.baseId===b.baseId,first:a.stats[0].val,second:b.stats[0].val};})()`);
assert.equal(twin.kind, 'duplicate');
assert.equal(twin.count, 2);
assert.notEqual(twin.ids[0], twin.ids[1], 'the copy has its own id');
assert.ok(twin.same, 'the copy is the same item');
assert.equal(twin.second - twin.first, 100, 'the copy is a separate object');

// Bundle: 3-4 items of the same base and rarity with their own ids.
const bundle = copy(`(()=>{const out=equipmentDropVariants.expand(drop('rare'),{rng:${fixed(0.04)}});
    return {kind:out.kind,items:out.items.map(i=>({id:i.id,baseId:i.baseId,rarity:i.rarity,level:i.itemLevel}))};})()`);
assert.equal(bundle.kind, 'bundle');
assert.ok(bundle.items.length >= 3 && bundle.items.length <= 4, `bundle size ${bundle.items.length}`);
assert.equal(new Set(bundle.items.map(i => i.id)).size, bundle.items.length);
assert.ok(bundle.items.every(i => i.baseId === bundle.items[0].baseId && i.rarity === bundle.items[0].rarity && i.level === bundle.items[0].level));

// Scale: a better chest multiplies the chances (0.08 is past every ordinary variant, inside the gold chest's).
assert.equal(copy(`equipmentDropVariants.expand(drop('rare'),{rng:${fixed(0.08)}}).kind`), null);
assert.notEqual(copy(`equipmentDropVariants.expand(drop('rare'),{rng:${fixed(0.08)},scale:4}).kind`), null);

// Monster drops use the same draw: over many real drops some come as extra items and some corrupted, and every item is kept.
const field = copy(`(()=>{game.season=5;game.settings.autoSalvageEnabled=false;game.settings.itemFilterRarities={normal:true,magic:true,rare:true,unique:true};
    const zone=getZone(3),enemy={id:1,gx:3,gy:3,isBoss:false,isElite:true};let extra=0,corrupt=0,drops=0;
    for(let i=0;i<4000;i++){game.inventory=[];const kept=rollEquipmentLoot(enemy,zone,1);if(!kept)continue;drops++;
        if(game.inventory.length>1)extra++;if(game.inventory.some(it=>it.corrupted))corrupt++;}
    return {drops,extra,corrupt};})()`);
assert.ok(field.drops > 1000, `drops ${field.drops}`);
assert.ok(field.extra > 0 && field.extra < field.drops * 0.08, `extra-item drops ${field.extra}/${field.drops}`);
assert.ok(field.corrupt > 0 && field.corrupt < field.drops * 0.08, `corrupted drops ${field.corrupt}/${field.drops}`);

// Chest grades: fixed at placement, roughly 70/24/6; only chests carry one.
run(`game=mergeDefaults({season:5,currentZoneId:0,maxZoneId:39,heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
    settings:{pauseGameOnOverlay:false},combatTimeMs:10000});startEncounterRun(true);window.r=game.actExploration;`);
const grades = copy(`(()=>{const count={wood:0,silver:0,gold:0},rows=[];for(let i=0;i<1500;i++){
    const objects=actExplorationState.objects.create(r,{seed:Math.imul(i+3,2654435761)>>>0,loop:5,allowEvent:true,excludedRooms:[],quantity:1,rarity:0});
    objects.entries.forEach(e=>{rows.push(e);if(e.kind==='chest')count[e.grade]++;});}
    return {count,stray:rows.filter(e=>e.kind!=='chest'&&e.grade!==undefined).length,
        same:JSON.stringify(actExplorationState.objects.create(r,{seed:77,loop:5,allowEvent:true,excludedRooms:[],quantity:1,rarity:0}))
            ===JSON.stringify(actExplorationState.objects.create(r,{seed:77,loop:5,allowEvent:true,excludedRooms:[],quantity:1,rarity:0}))};})()`);
const total = grades.count.wood + grades.count.silver + grades.count.gold;
assert.ok(total > 800, `chests ${total}`);
assert.ok(Math.abs(grades.count.wood / total - 0.70) < 0.05, `wood share ${grades.count.wood / total}`);
assert.ok(Math.abs(grades.count.silver / total - 0.24) < 0.05, `silver share ${grades.count.silver / total}`);
assert.ok(grades.count.gold > 0 && Math.abs(grades.count.gold / total - 0.06) < 0.03, `gold share ${grades.count.gold / total}`);
assert.equal(grades.stray, 0, 'only chests have a grade');
assert.ok(grades.same, 'the same seed gives the same grades');

// Saves: a chest saved before grades loads as wood (twice is the same); a wrong grade or a graded pot is rejected.
function findChest() {
    for (let i = 0; i < 100; i++) {
        run(`game=mergeDefaults({season:5,currentZoneId:0,maxZoneId:39,heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',
            settings:{pauseGameOnOverlay:false},combatTimeMs:10000});game.moveTimer=0;game.combatHalted=false;game.playerHp=getPlayerStats().maxHp;
            startEncounterRun(true);window.r=game.actExploration;r.mode='manual';game.enemies.forEach(e=>{e.hp=0;});game.enemies=[];
            r.packs.forEach(p=>{p.waiting=[];p.aliveIds=[];});`);
        if (run(`r.objects.entries.some(e=>e.kind==='chest')`)) break;
    }
    run(`window.o=r.objects.entries.find(e=>e.kind==='chest');if(!o)throw Error('fixture chest missing');
        (()=>{const m=actExplorationMap.forRun(r),side=actExplorationMap.neighbors(m,o).find(c=>!actExplorationState.objects.solidCells(r).has(c.gx+','+c.gy));
        Object.assign(game.gridPlayer,side);actExplorationState.discover(r,side);})();`);
}
findChest();
assert.equal(run(`delete o.grade;actExplorationState.objects.validate(r);actExplorationState.objects.validate(r);o.grade`), 'wood', 'an old chest opens as wood');
assert.throws(() => run(`o.grade='diamond';actExplorationState.objects.validate(r);`), /등급/);
run(`o.grade='wood';`);
const pot = run(`(()=>{const p=r.objects.entries.find(e=>e.kind!=='chest');if(!p)return false;p.grade='gold';
    try{actExplorationState.objects.validate(r);return 'accepted';}catch(e){return e.message;}finally{delete p.grade;}})()`);
if (pot) assert.match(pot, /등급/, 'a graded pot is rejected');

// Opening: gold gives at least two items (one rare or better) and more currency than wood; silver at least one item.
function open(grade) {
    findChest();
    // Empty slots take the first items (auto-equip), so the items are read from the ground-loot markers the chest left.
    return copy(`(()=>{o.grade='${grade}';game.settings.autoSalvageEnabled=false;const bud=game.currencies.magicBud||0,dew=game.currencies.formlessDew||0;
        const before=battleFx.length;actExplorationProgress.objects.request(o.id);
        return {phase:o.phase,items:battleFx.slice(before).filter(fx=>fx.loot?.item).map(fx=>fx.loot.item.rarity),currency:(game.currencies.magicBud||0)-bud+(game.currencies.formlessDew||0)-dew,
            button:document.querySelector('[data-object-id]')?.getAttribute('aria-label')||null};})()`);
}
const gold = open('gold'), silver = open('silver'), wood = open('wood');
assert.equal(gold.phase, 'spent');
assert.ok(gold.items.length >= 2, `gold chest items ${gold.items}`);
assert.ok(gold.items.some(r => r === 'rare' || r === 'unique'), 'the gold chest gives a rare or better item');
assert.ok(silver.items.length >= 1, 'the silver chest always gives an item');
assert.ok(gold.currency >= wood.currency, `gold currency ${gold.currency} >= wood ${wood.currency}`);
assert.equal(run(`actExplorationState.objects.name({kind:'chest',grade:'gold'})`), '황금 보급 상자');
assert.equal(run(`actExplorationState.objects.name({kind:'pot'})`), '낡은 항아리');
console.log('equipment drop variants (duplicate, bundle, corrupted) and supply chest grades: OK');
