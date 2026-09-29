const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const ctx = buildGameRuntime();
const run = code => vm.runInContext(code, ctx);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
const start = 1700000000000, hour = 3600000;
function fresh() {
    run(`game=mergeDefaults({season:2,contentProgression:JSON.parse(JSON.stringify(defaultGame.contentProgression))});
        contentProgression.sync(game); contentProgression.purchase('craft',game);
        playerStall.advance(game, ${start});
        game.inventory=[createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='무기'), 'rare', 15)];
        game.inventory[0].stats=[{id:'flatDmg',val:100,valMin:50,valMax:100,tier:15},
            {id:'aspd',val:20,valMin:10,valMax:20,tier:15}, {id:'crit',val:10,valMin:5,valMax:10,tier:15}];
        game.inventory[0]=normalizeItem(game.inventory[0]);`);
}
function list(price = 1) { return run(`playerStall.list(game,game.inventory[0].id,${price},${start}).ok`); }
fresh();
assert.strictEqual(run('itemAppraisal.quote(game.inventory[0]).options'), 3);
const high = run('itemAppraisal.quote(game.inventory[0]).fair');
run('game.inventory[0].stats.forEach(stat=>stat.val=stat.valMin)');
assert(run('itemAppraisal.quote(game.inventory[0]).fair') < high, 'higher rolls command a higher appraisal');
run('game.inventory[0].stats.forEach(stat=>stat.tier=1)');
assert(run('itemAppraisal.quote(game.inventory[0]).fair') < high, 'option tier matters separately from item tier');
run(`game.inventory[0].stats=[{id:'flatDmg',val:100,valMin:50,valMax:100,tier:15,
    extraStats:[{id:'aspd',val:20,valMin:10,valMax:20,tier:15}]}]`);
const compound = json('itemAppraisal.quote(game.inventory[0])');
run('game.inventory[0].stats.push(game.inventory[0].stats[0].extraStats[0]); delete game.inventory[0].stats[0].extraStats');
assert.deepStrictEqual(json('itemAppraisal.quote(game.inventory[0])'), compound, 'compound effects retain their value');
run('game.inventory[0].stats.push({...game.inventory[0].stats[0]})');
assert.strictEqual(run('itemAppraisal.quote(game.inventory[0]).fair'), compound.fair, 'duplicating a stat cannot mint value');

fresh();
const original = json('game');
for (const price of ['NaN','Infinity','-1','0','1.5','1000001']) {
    assert.strictEqual(run(`playerStall.list(game,game.inventory[0].id,${price},${start}).ok`), false);
    assert.deepStrictEqual(json('game'), original, 'invalid prices leave every field untouched');
}
for (const flag of ['locked','tradeLocked','hallReplica','hallRelistBlocked','loopSealed']) {
    run(`game.inventory[0].${flag}=true`);
    assert.strictEqual(list(), false, flag);
    run(`delete game.inventory[0].${flag}`);
}
run('game.inventory[0].voidSocket={jewel:{id:999}}');
assert.strictEqual(list(), false, 'socketed jewels cannot accidentally be sold');
run('delete game.inventory[0].voidSocket; game.equipment.weapon=game.inventory[0]');
assert.strictEqual(list(), false, 'equipped identity is protected');
run('game.equipment.weapon=null');
run(`game.inventory[0].instanceId='stall-protected';
    game.equipmentLoadouts.presets=[{name:'저장 세팅',slots:{'무기':{id:999999,instanceId:'stall-protected',name:'보호 장비'}},savedAtLoop:2}]`);
assert.strictEqual(list(), false, 'presets protect stable instance identity even after numeric ID migration');
run('game.equipmentLoadouts.presets=[]');
assert(list());
assert.deepStrictEqual(json('[game.inventory.length, game.playerStall.listings.length]'), [0,1], 'one exclusive escrow owner');
assert.strictEqual(run(`playerStall.reprice(game,1,1,NaN)`), false);
assert.strictEqual(run(`playerStall.reprice(game,1,1,${start-1})`), false, 'clock rollback cannot reset aging');
run(`playerStall.advance(game,${start + 719999})`);
assert.strictEqual(run('game.playerStall.proceeds'), 0, 'a minimum wait is mandatory');
run(`playerStall.advance(game,${start + 4*hour})`);
assert.strictEqual(run('game.playerStall.proceeds'), 1, 'an affordable item eventually sells for this saved random sequence');
assert.strictEqual(run('playerStall.withdraw(game,1).ok'), false, 'a sold item cannot be reclaimed');
run('game.expertCurrencyGainPct=900; game.currencies.formlessDew=7');
assert.strictEqual(run('playerStall.collect(game)'), 1);
assert.strictEqual(run('playerStall.collect(game)'), 0);
assert.strictEqual(run('game.currencies.formlessDew'), 8, 'payout is exact and applied once');

fresh();
const chances = json(`(() => { const item=game.inventory[0], value=itemAppraisal.quote(item), customer=PLAYER_STALL_CUSTOMERS[1];
    return [playerStall.chance(item,1,customer),playerStall.chance(item,value.fair,customer),
        playerStall.chance(item,value.ceiling,customer),playerStall.chance(item,value.ceiling+1,customer)]; })()`);
assert(chances[0] > chances[1] && chances[1] >= chances[2] && chances[3] === 0, 'price changes sale chance with a hard ceiling');
assert(list(1000000));
run(`playerStall.advance(game,${start + 10*hour})`);
assert.deepStrictEqual(json('[game.playerStall.listings.length,game.playerStall.proceeds]'), [1,0], 'waiting cannot turn a fantasy price into money');
assert.strictEqual(run('playerStall.withdraw(game,1).ok'), true);
assert.deepStrictEqual(json('[game.inventory.length,game.playerStall.listings.length]'), [1,0]);

fresh(); list();
const saved = json('game');
run(`playerStall.advance(game,${start + 12*hour})`);
const offline = json('game.playerStall');
run(`game=mergeDefaults(${JSON.stringify(saved)})`);
for (let minutes=1; minutes<=720; minutes++) run(`playerStall.advance(game,${start+minutes*60000})`);
assert.deepStrictEqual(json('game.playerStall'), offline, 'one offline settlement equals many online settlements including sellout');
run(`game=mergeDefaults(${JSON.stringify(saved)});playerStall.advance(game,${start + 30*hour})`);
assert.strictEqual(run('game.playerStall.proceeds'), offline.proceeds);
const capped = json('game.playerStall');
run(`game=mergeDefaults(JSON.parse(JSON.stringify(game)));playerStall.advance(game,${start + 30*hour})`);
assert.deepStrictEqual(json('game.playerStall'), capped, 'reload cannot replay the discarded offline tail');
run(`playerStall.advance(game,${start-1})`);
assert.deepStrictEqual(json('game.playerStall'), capped, 'clock rollback cannot regenerate budget');

fresh(); list();
run('game.isBackgroundCalculation=true');
const simulated = json('game.playerStall');
run(`playerStall.advance(game,${start + 12*hour})`);
assert.deepStrictEqual(json('game.playerStall'), simulated, 'combat simulation clocks cannot settle visits');
assert.strictEqual(run('playerStall.collect(game)'), 0);
run('game.isBackgroundCalculation=false');
const beforeBlocked = json('game.playerStall');
for (const key of ['processing','failed','snapshot']) {
    run(`backgroundCombatRuntime.${key}=true;settlePlayerStall();playerStallUi.collect();backgroundCombatRuntime.${key}=false`);
    assert.deepStrictEqual(json('game.playerStall'), beforeBlocked, 'background lifecycle must not lose real transactions: '+key);
}
run('document.hidden=true;settlePlayerStall();document.hidden=false');
assert.deepStrictEqual(json('game.playerStall'), beforeBlocked);

// Restore owns escrow identities; invalid listing metadata recovers the actual item once.
fresh(); list();
const identity = run('game.playerStall.listings[0].item.id');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));refreshItemIdCounter()');
assert(run(`createItemFromBase(BASE_ITEM_DB[0],'normal',1).id>${identity}`), 'future drops cannot reuse an escrow ID');
run('game.playerStall.listings[0].price=-7;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepStrictEqual(json('[game.inventory.length,game.playerStall.listings.length]'), [1,0]);
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.strictEqual(run('game.inventory.length'), 1);
fresh(); list();
run('game.offlineProgress.stash=[JSON.parse(JSON.stringify(game.playerStall.listings[0].item))];game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.strictEqual(run('game.playerStall.listings.length'), 0, 'an item in offline storage cannot also be sold');
fresh(); list();
run(`game.inventory=Array.from({length:250},()=>createItemFromBase(BASE_ITEM_DB.find(base=>base.slot==='갑옷'),'normal',1))`);
assert.strictEqual(run('playerStall.withdraw(game,1).ok'), false);
assert.strictEqual(run('game.playerStall.listings.length'), 1, 'full inventory preserves the escrow item');

// Reject loop reset before either deleting escrow equipment or carrying sold currency across the reset.
fresh(); list();
const beforeLoop = json('game');
assert.strictEqual(run('triggerSeasonReset({})'), false);
assert.deepStrictEqual(json('[game.inventory,game.playerStall,game.season]'), [beforeLoop.inventory,beforeLoop.playerStall,beforeLoop.season]);
run('game.playerStall.listings=[];game.playerStall.proceeds=5');
assert.strictEqual(run('triggerSeasonReset({})'), false);
// triggerSeasonReset and the loop screens share one reason, naming what is still on the stall.
assert.strictEqual(run('playerStall.loopBlockReason(game)'),
    '가판대에 판매 대금 이슬 5개가 남아 있습니다. 장비 → 거래소 → 나의 가판대에서 회수한 뒤 루프를 진행하세요.');
fresh(); list();
assert.match(run('playerStall.loopBlockReason(game)'), /^가판대에 진열품 1개가 남아 있습니다/);
run('game.playerStall.proceeds=2');
assert.match(run('playerStall.loopBlockReason(game)'), /^가판대에 진열품 1개와 판매 대금 이슬 2개가 남아 있습니다/);
assert.match(run('loopSettlementUi.summaryHtml()'), /class="loop-settlement-warning"/, 'the loop screen says why it waits');
assert.strictEqual(run('loopSettlementUi.resetButtonAttr(true)'), 'disabled', 'loop-10 panel buttons wait for the stall too');
run('game.playerStall.listings=[];game.playerStall.proceeds=0');
assert.strictEqual(run('playerStall.loopBlockReason(game)'), '');
assert.doesNotMatch(run('loopSettlementUi.summaryHtml()'), /loop-settlement-warning/);
assert.strictEqual(run('loopSettlementUi.resetButtonAttr(true)'), '');

// A sale is announced once: a log line with a toast and the 장비 menu dot. Settling again without a sale says nothing.
fresh(); list();
run('var stallToasts=[]; showGameToast=text=>stallToasts.push(text); game.noti.items=false');
assert.strictEqual(run(`playerStallUi.settleSales(${start + 4*hour})`), 1);
assert.strictEqual(run('game.noti.items'), true, 'the 장비 menu shows a dot until opened');
assert.match(run('stallToasts.join("|")'), /^가판대 판매: \[[^\]]+\] · 이슬 1개\. 장비 → 거래소 → 나의 가판대에서 수령하세요\.$/);
assert.strictEqual(run(`playerStallUi.settleSales(${start + 4*hour + 60000})`), 0);
assert.strictEqual(run('stallToasts.length'), 1, 'no sale, no news');

// DOM boundary: ordinary battle refreshes preserve the actual input/button nodes.
fresh();
let writes = 0, markup = '';
const host = { contains: element => Boolean(element), get innerHTML() { return markup; },
    set innerHTML(value) { writes++; markup=value; } };
ctx.document.getElementById = id => id === 'market-panel-stall' ? host : null;
ctx.document.activeElement = null;
run('playerStallUi.render(); playerStallUi.render()');
assert.strictEqual(writes, 1, 'unchanged refresh does not detach buttons under the pointer');
ctx.document.activeElement = { tagName:'INPUT' };
run('game.playerStall.proceeds=8;playerStallUi.render()');
assert.strictEqual(writes, 1, 'editing an asking price keeps the same input');
ctx.document.activeElement = { tagName:'BUTTON' };
run('playerStallUi.render()');
assert.strictEqual(writes, 2, 'a previously clicked button must not freeze incoming sale updates');
assert(markup.includes('이슬 8개'));
console.log('player stall: appraisal, ownership, prices, timing, offline parity, payout, saves and loop protection passed');
