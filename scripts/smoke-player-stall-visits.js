const assert = require('node:assert/strict');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
ctx.Math = Object.create(Math); ctx.Math.random = () => .999999;
const run = code => vm.runInContext(code, ctx);
const start = 1700000000000, minute = 60000, hour = 3600000;
run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
    contentProgression.sync(game);contentProgression.purchase('craft',game);playerStall.advance(game,${start});
    var visitGear=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='apocalypse_greatblade'),'rare',20,{affixTierCap:20});
    visitGear.stats=['flatDmg','weaponFlatDmgPct','attackPctDmg','aspd','crit','critDmg'].map(id=>
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20));visitGear=normalizeItem(visitGear);`);
const template = JSON.parse(run('JSON.stringify(game)')), gear = JSON.parse(run('JSON.stringify(visitGear)'));
const rules = run('PLAYER_STALL_RULES'), fair = ctx.itemAppraisal.quote(gear,'goldenRule').fair;
const persisted = value => JSON.parse(JSON.stringify(value));
function shop(price, seed, count = 1) {
    const owner=ctx.mergeDefaults(structuredClone(template));owner.playerStall.rng=seed;
    owner.inventory=Array.from({length:count},(_,index)=>({...structuredClone(gear),id:990000+index}));
    for(const item of [...owner.inventory]) assert(ctx.playerStall.list(owner,item.id,price,start,{currency:'goldenRule',negotiate:false}).ok);
    return owner;
}

// Arrival time varies independently of the mandatory one-minute transaction age.
const delays=Array.from({length:200},(_,index)=>shop(1000000,Math.imul(index+1,2654435761)>>>0).playerStall.nextVisitAt-start);
assert(new Set(delays).size>150,'arrivals must not follow a guaranteed one-minute cadence');
assert(delays.some(time=>time<30000) && delays.some(time=>time>2*minute),'some arrivals bunch up; others leave a quiet gap');
assert(delays.every(time=>time>=rules.minVisitMs && time<=rules.maxVisitMs));
const meanDelay=delays.reduce((sum,time)=>sum+time,0)/delays.length;
assert(meanDelay>45000 && meanDelay<75000,'ordinary arrival rate stays near the prior one-minute average');
const early=shop(1,123456,4);
ctx.playerStall.advance(early,start+minute-1);
assert.equal(early.playerStall.goldProceeds,0);assert.equal(early.playerStall.offerSequence,0);
assert.equal(early.playerStall.listings.length,4,'early browsers cannot buy before the display age');

// A very cheap valuable listing can draw several visitors at the same timestamp.
let crowds=0, boughtInCrowd=0, fixture;
for(let index=1;index<=150;index++) {
    const seed=Math.imul(index,2654435761)>>>0, owner=shop(5,seed,4);
    for(let events=0;events<60 && owner.playerStall.listings.length;events++) {
        const at=owner.playerStall.nextVisitAt;
        if(at>start+10*minute)break;
        ctx.playerStall.advance(owner,at);
        const arrivals=owner.playerStall.history.filter(event=>event.at===at);
        const crowd=arrivals.find(event=>event.kind==='crowd');
        if(!crowd)continue;
        crowds++;assert(crowd.visitors>=2 && crowd.visitors<=4);
        assert.equal(arrivals.filter(event=>event.kind!=='crowd').length,crowd.visitors,'each person either buys or browses');
        if(arrivals.some(event=>event.sold)) {boughtInCrowd++;if(!fixture)fixture={seed,elapsedMs:at-start,visitors:crowd.visitors};}
    }
    assert.equal(owner.playerStall.goldProceeds,(4-owner.playerStall.listings.length)*5,'a crowd never duplicates a listing payout');
}
assert(crowds>30 && boughtInCrowd>10,'cheap valuables produce genuine rushes with occasional purchases');

// Neither an ordinary price nor a worthless item in an expensive currency attracts a rush.
for(const price of [fair,1000000]) {
    const owner=shop(price,1735729,4);ctx.playerStall.advance(owner,start+hour);
    assert(!owner.playerStall.history.some(event=>event.kind==='crowd'));
}
const lowValue=shop(1000000,732819,4);
const unpopular=shop(5,732819,4);
run(`var nicheGear=JSON.parse(JSON.stringify(visitGear));
    nicheGear.stats=['summonFlatDmg','summonPctDmg','summonAspd','summonCrit','summonCritDmg','summonEfficiency'].map(id=>
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id===id),20,20));nicheGear=normalizeItem(nicheGear);
    var plainGear=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='rusted_blade'),'normal',1);`);
const niche=JSON.parse(run('JSON.stringify(nicheGear)')), plain=JSON.parse(run('JSON.stringify(plainGear)'));
assert(ctx.itemAppraisal.quote(niche,'formlessDew').marketValue>=rules.crowdMinMarketValue,'niche fixture is valuable despite poor visitor fit');
assert(ctx.itemAppraisal.quote(plain,'magicBud').marketValue<rules.crowdMinMarketValue);
for(const row of lowValue.playerStall.listings){row.item={...structuredClone(plain),id:row.item.id};row.currency='magicBud';row.price=1;}
for(const row of unpopular.playerStall.listings){row.item={...structuredClone(niche),id:row.item.id};row.price=1;}
for(const owner of [lowValue,unpopular]) {
    for(let events=0;events<80 && owner.playerStall.listings.length;events++) {
        ctx.playerStall.advance(owner,owner.playerStall.nextVisitAt);
        assert(!owner.playerStall.history.some(event=>event.kind==='crowd'),'low intrinsic value and poor demand never generate a bargain rush');
    }
}
const bait=shop(1000000,998712,4);bait.playerStall.listings[0].price=5;
ctx.playerStall.advance(bait,start+12*hour);
assert.equal(bait.playerStall.goldProceeds,5);assert.equal(bait.playerStall.listings.length,3,'crowd interest cannot bypass another item\'s price ceiling');

// Saved deadlines and RNG give identical transactions with online polling and offline catch-up.
const original=shop(5,fixture.seed,4);
const offline=ctx.mergeDefaults(structuredClone(original)), online=ctx.mergeDefaults(structuredClone(original));
ctx.playerStall.advance(offline,start+12*hour);
for(let elapsed=15000;elapsed<=12*hour;elapsed+=15000)ctx.playerStall.advance(online,start+elapsed);
assert.deepEqual(online.playerStall,offline.playerStall);
assert.equal(offline.playerStall.goldProceeds,20);
const roundTrip=ctx.mergeDefaults(structuredClone(offline));
ctx.playerStall.advance(roundTrip,start+12*hour);
assert.deepEqual(roundTrip.playerStall,offline.playerStall,'reload does not reroll arrivals or pay twice');
const pending=shop(1000000,3456789,4);ctx.playerStall.advance(pending,start+minute);
const restored=ctx.mergeDefaults(structuredClone(pending));
assert.deepEqual(persisted(restored.playerStall),persisted(pending.playerStall),'a future random deadline survives save restoration');
const before=persisted(restored.playerStall);ctx.playerStall.advance(restored,start-1);
assert.deepEqual(persisted(restored.playerStall),before,'clock rollback cannot repeat a crowd');
assert(restored.playerStall.history.length<=rules.historyLimit);
console.log('player stall visits: irregular arrivals, bargain crowds, exclusive sales and offline parity passed',JSON.stringify({meanDelayMs:Math.round(meanDelay),crowds,boughtInCrowd,fixture}));
