// 장비 드랍 변형과 보급 상자 등급(2026-10-05 사용자 요청): 장비 한 개가 떨어질 때 복제(똑같은 장비 하나 더) · 묶음(같은 베이스
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
assert.ok(corrupted.after.stats.some((stat, i) => stat.val > corrupted.before.stats[i].val), 'a corrupted drop has a stronger line');
corrupted.before.stats.forEach((stat, i) => assert.ok(corrupted.after.stats[i].val >= stat.val, `${stat.id} never drops`));

// Decision A (2026-10-05): over many real drops a corrupted line grows by ×1.15 on its own value step (one step only when that
// step is at most 30% of the value) and never passes its maximum at the item's affix tier cap.
const audit = copy(`(()=>{const rows=[];for(let i=0;i<400;i++){const item=drop(i%2?'rare':'magic'),before=JSON.parse(JSON.stringify(item.stats));
    if(equipmentDropVariants.expand(item,{rng:${fixed(0)}}).kind!=='corrupted')continue;
    item.stats.forEach((stat,k)=>{const old=before[k].val;if(stat.val===old)return;
        const mod=stat.sourceModId?MOD_DB.find(m=>m.id===stat.sourceModId):MOD_DB.find(m=>(m.statId||m.id)===stat.id&&!m.tierValues&&[false,true].some(r=>{const g=getAffixTierRange(m,stat.id,stat.tier,r);return g.min===stat.valMin&&g.max===stat.valMax;}));
        const step=Number(stat.valueStep)||getAffixTierRange(mod,stat.id,stat.tier).step,cap=Math.max(stat.valMax,getAffixTierRange(mod,stat.id,Math.max(stat.tier,item.affixTierCap)).max);
        rows.push({id:stat.id,old,val:stat.val,step,cap});});}
    return rows;})()`);
assert.ok(audit.length > 200, `corrupted lines checked ${audit.length}`);
for (const row of audit) {
    assert.ok(row.val <= row.cap + 1e-9, `${row.id} ${row.old}->${row.val} stays at or under the item's tier cap ${row.cap}`);
    const oneStep = Math.abs(row.val - row.old - row.step) < 1e-6;
    assert.ok(row.val <= row.old * 1.15 + 1e-6 || (oneStep && row.step <= row.old * 0.3 + 1e-9), `${row.id} ${row.old}->${row.val} grows at most 15% or one small step`);
}
// Regression: fractional lines used to gain a whole point (resistance penetration 0.8 -> 1.8) and gem levels jumped 1 -> 2.
const small = copy(`(()=>{const item=drop('rare'),pen=MOD_DB.find(m=>(m.statId||m.id)==='resPen'&&m.tierValues&&!Number.isInteger([].concat(m.tierValues[0])[0])),
    gem=MOD_DB.find(m=>(m.statId||m.id)==='summonGemLevel'&&m.tierValues&&m.tierValues.length>1);
    const a=rollTierValueAffix(pen,'resPen',1),b=rollTierValueAffix(gem,'summonGemLevel',1);a.val=a.valMin;b.val=b.valMin;
    item.stats=[a,b];item.affixTierCap=20;equipmentDropVariants.expand(item,{rng:${fixed(0)}});
    return {pen:[a.valMin,item.stats[0].val],gem:[b.valMin,item.stats[1].val],corrupted:!!item.corrupted};})()`);
assert.ok(small.pen[1] <= small.pen[0] * 1.15 + 1e-6, `resPen ${small.pen[0]} -> ${small.pen[1]}`);
assert.equal(small.gem[1], small.gem[0], 'a gem level line never jumps a whole level');
assert.deepEqual(corrupted.events, ['corrupted'], 'one variant event names the drop for the loot log');
assert.equal(corrupted.again, null, 'a corrupted item is never corrupted again');
assert.equal(copy(`(()=>{const item=drop('magic');item.stats=[];return equipmentDropVariants.expand(item,{rng:${fixed(0)}}).kind;})()`), null, 'an item without explicit lines drops as it is');

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
    // The chest's items and currency lie on the floor until picked up (js/exploration-ground-loot.js): read from the floor rows.
    return copy(`(()=>{o.grade='${grade}';game.settings.autoSalvageEnabled=false;
        const before=r.groundLoot.length;actExplorationProgress.objects.request(o.id);const rows=r.groundLoot.slice(before);
        return {phase:o.phase,items:rows.filter(row=>row.item).map(row=>row.item.rarity),
            currency:rows.filter(row=>['magicBud','formlessDew'].includes(row.currency)).reduce((sum,row)=>sum+row.count,0),
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
// Crafting corruption (잿불가지): one of add a line · quality +6~10% (to 30%) · one line rerolled · a socket (void, or a second one) · nothing.
const craft = copy(`(()=>{const seen={},bad=[];for(let i=0;i<600;i++){const item=drop('rare');item.quality=i%3===0?26:4;
    if(i%5===0)item.slot='반지';if(i%7===0)equipmentSockets.openVoidSocket(item);
    const before=JSON.parse(JSON.stringify(item)),chisel=equipmentSockets.canChisel(item),sockets=equipmentSockets.count(item);
    const out=corruptCraftedItem(item);seen[out.kind]=(seen[out.kind]||0)+1;
    if(!item.corrupted)bad.push('not corrupted');
    if(out.kind==='quality'){const gain=item.quality-before.quality;if(item.quality>30||(item.quality<30&&(gain<6||gain>10)))bad.push('quality '+before.quality+'->'+item.quality);}
    else if(item.quality!==before.quality)bad.push('quality moved on '+out.kind);
    if(out.kind==='socket'&&equipmentSockets.count(item)!==sockets+1)bad.push('socket');
    if(out.kind==='socket'&&!(chisel?equipmentSockets.hasVoidSocket(item)&&!item.corruptionSocket:item.corruptionSocket))bad.push('socket kind');
    if(out.kind!=='socket'&&equipmentSockets.count(item)!==sockets)bad.push('socket moved on '+out.kind);
    if(out.kind==='addMod'&&item.stats.length!==before.stats.length+1)bad.push('addMod');
    if(out.kind==='rerollMod'){const changed=item.stats.filter((s,k)=>s.id!==before.stats[k].id||s.val!==before.stats[k].val).length;
        if(item.stats.length!==before.stats.length||changed!==1)bad.push('reroll '+changed);}
    if(['nothing','quality','socket'].includes(out.kind)&&JSON.stringify(item.stats)!==JSON.stringify(before.stats))bad.push('lines moved on '+out.kind);}
    const worn=drop('rare');worn.quality=30;worn.corrupted=true;const plain={...worn,corrupted:false};
    return {seen,bad:bad.slice(0,5),mul:[resolveEquipmentBaseStats(worn,null,1).qualityMultiplier,resolveEquipmentBaseStats(plain,null,1).qualityMultiplier]};})()`);
assert.deepEqual(craft.bad, [], 'every crafting corruption changes exactly what its outcome says');
['addMod', 'quality', 'rerollMod', 'socket', 'nothing'].forEach(kind => assert.ok(craft.seen[kind] > 0, `${kind} happens (${JSON.stringify(craft.seen)})`));
assert.deepEqual(craft.mul, [1.3, 1.2], 'a corrupted item counts quality up to 30%, an ordinary one up to 20%');
// A second socket (2026-10-05): an item whose void socket is open gets a corruption socket once; both hold jewels that count,
// survive a save, block trading, and come back to the jewel store when taken out.
const second = copy(`(()=>{game=mergeDefaults({heroSelectionInitialized:true,selectedHeroId:'hero1',selectedClassId:'warrior',settings:{pauseGameOnOverlay:false}});
    const ring=drop('rare');ring.slot='반지';ring.corrupted=true;
    const firstAdd=equipmentSockets.addCorruptionSocket(ring),againAdd=equipmentSockets.addCorruptionSocket(ring),count=equipmentSockets.count(ring);
    const a=generateJewelDrop(10),b=generateJewelDrop(10);game.jewelInventory=[a,b];
    const slot=Object.keys(game.equipment).find(k=>k.startsWith('반지'));game.equipment[slot]=ring;
    const ins=[equipmentSockets.insert(ring,a.id).ok,equipmentSockets.insert(ring,b.id).ok];
    const sources=collectSocketedJewels(game.equipment).map(r=>r.source).sort();
    const saved=mergeDefaults(JSON.parse(serializeSaveState(game)));const kept=saved.equipment[slot].corruptionSocket.jewel?.id===b.id;
    const out=equipmentSockets.remove(ring,'corrupt',0).ok&&game.jewelInventory.some(j=>j.id===b.id)&&!ring.corruptionSocket.jewel;
    const voidOnly=drop('rare');voidOnly.slot='반지';voidOnly.voidSocket={open:true,jewel:generateJewelDrop(10)};
    game.inventory=[voidOnly,ring];game.equipment[slot]=null;equipmentSockets.insert(ring,b.id);
    return {firstAdd,againAdd,count,ins,sources,kept,out,stall:[playerStall.eligible(ring,game),playerStall.eligible(voidOnly,game),(()=>{const e=drop('rare');game.inventory.push(e);return playerStall.eligible(e,game);})()],jewels:equipmentSockets.jewels(voidOnly).length,
        label:equipmentSockets.label({kind:'corrupt',index:0})};})()`);
assert.equal(second.firstAdd, true, 'an item with a void socket opens a second socket');
assert.equal(second.againAdd, false, 'never a third');
assert.equal(second.count, 2);
assert.deepEqual(second.ins, [true, true], 'both sockets take a jewel');
assert.deepEqual(second.sources, ['corrupt', 'void'], 'both jewels count');
assert.equal(second.kept, true, 'the second socket and its jewel survive a save');
assert.equal(second.out, true, 'taking the jewel out returns it to the store');
assert.deepEqual(second.stall, [false, false, true], 'an item with a jewel in any socket cannot be listed; an empty one can');
assert.equal(second.jewels, 1, 'the void socket jewel is read like any other (the trade hall check uses the same list)');
assert.equal(second.label, '타락 소켓');
// Destroying an item never takes its jewels (2026-10-05): salvage, a chance orb's destruction and the time-rift fusion's consumed
// rare return every socketed jewel to the jewel store, past its limit if need be.
const kept = copy(`(()=>{const limit=getJewelInventoryLimit();game.jewelInventory=Array.from({length:limit},()=>generateJewelDrop(10));
    const ring=drop('rare');ring.slot='반지';equipmentSockets.addCorruptionSocket(ring);
    const a=generateJewelDrop(10),b=generateJewelDrop(10);ring.voidSocket={open:true,jewel:a};ring.corruptionSocket.jewel=b;
    game.inventory=[ring];salvageItem(0);
    const salvaged=[a.id,b.id].every(id=>game.jewelInventory.some(j=>j.id===id))&&game.inventory.length===0;
    const gone=drop('rare');gone.slot='반지';const c=generateJewelDrop(10);gone.voidSocket={open:true,jewel:c};game.inventory=[gone];
    craftingSelectionState.ref=gone.id;craftingSelectionState.isEquip=false;const returned=destroySelectedCraftItem(gone);
    const destroyed=returned===1&&game.jewelInventory.some(j=>j.id===c.id);
    const unique=generateUniqueItem(10,null,'첫 계약'),rare=createItemFromBase(BASE_ITEM_DB.find(base=>base.id===unique.baseId),'rare',20);
    const d=generateJewelDrop(10);rare.corruptionSocket={jewel:d};rare.voidSocket={open:true,jewel:null};game.inventory=[];
    Object.assign(ensureTimeRiftState(),{altarOpen:true,altarUnique:unique,altarRare:rare,pressure:0});
    const fused=resolveTimeRiftFusion();
    return {salvaged,destroyed,fusion:!!fused&&game.jewelInventory.some(j=>j.id===d.id),over:game.jewelInventory.length-limit};})()`);
assert.equal(kept.salvaged, true, 'salvage returns both socketed jewels, even into a full store');
assert.equal(kept.destroyed, true, "a chance orb's destruction returns the jewel");
assert.equal(kept.fusion, true, "the fusion's consumed rare returns its jewel");
assert.equal(kept.over, 4, 'the store goes past its limit rather than losing a jewel');
// A chance orb that succeeds turns the item into a fresh unique; its socketed jewel goes back to the store too.
run(`showGameToast=()=>{};window.confirm=()=>true;window.chanceJewel=generateJewelDrop(10);game.jewelInventory=[];
    window.chanceRing=createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='반지'),'normal',20);
    chanceRing.voidSocket={open:true,jewel:chanceJewel};game.inventory=[chanceRing];game.currencies.fairyRing=1;
    craftingSelectionState.ref=chanceRing.id;craftingSelectionState.isEquip=false;
    window.chanceRandom=Math.random;Math.random=()=>0.6;window.chanceDone=false;
    useCurrency('fairyRing').finally(()=>{Math.random=chanceRandom;chanceDone=true;});`);
// The crafting workspace wraps useCurrency in its own ledger record; the corruption's one outcome reaches it, so the result panel
// can lead with it as a highlighted line (js/crafting-workspace-ui.js, no extra effect).
run(`showGameToast=()=>{};window.ledgerHtml=null;game.currencies.emberBranch=3;window.confirm=()=>true;window.craftItem=drop('rare');craftItem.corrupted=false;
    game.inventory=[craftItem];craftingSelectionState.ref=craftItem.id;craftingSelectionState.isEquip=false;
    const outer=craftingResultLedger.begin(craftItem,{currencyKey:'emberBranch'});
    useCurrency('emberBranch').then(()=>{ledgerHtml=craftingResultLedger.commit(outer,craftItem).meta.outcome||'';});`);
(async () => {
    for (let i = 0; i < 50 && !run('chanceDone'); i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(run("chanceRing.rarity"), 'unique', 'the chance orb succeeded');
    assert.equal(run('game.jewelInventory.some(j=>j.id===chanceJewel.id)'), true, "a chance orb's success returns the socketed jewel");
    assert.equal(run('equipmentSockets.jewels(chanceRing).length'), 0, 'the new unique holds no copy of it');
    for (let i = 0; i < 50 && run('ledgerHtml') === null; i++) await new Promise(resolve => setImmediate(resolve));
    const html = run('ledgerHtml') || '';
    assert.equal(run('craftItem.corrupted'), true, 'the real crafting entry corrupts');
    assert.ok(['추가 옵션', '품질', '옵션으로 바뀌었', '소켓', '변화가 없'].some(word => html.includes(word)), `the workspace record carries the outcome: ${html}`);
    console.log('equipment drop variants (duplicate, bundle, corrupted within the tier cap), supply chest grades, crafting corruption outcomes, second socket, jewels kept on destruction, outcome line: OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
