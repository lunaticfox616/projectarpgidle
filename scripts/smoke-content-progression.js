const assert = require('assert');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const screenText = require('./lib/screen-text');
const runtime = buildGameRuntime();
vm.runInContext(require('fs').readFileSync(require('path').join(__dirname, '../js/content-unlock-guide.js'), 'utf8'), runtime);
const run = code => vm.runInContext(code, runtime);
const json = code => JSON.parse(run(`JSON.stringify(${code})`));
run('game = mergeDefaults({})');
assert.equal(run('contentProgression.balance()'), 0);
assert(run("contentProgression.canOpen('tab-char')"));
assert(!run("contentProgression.canOpen('skill-tab-enhance')"));
assert(!run("contentProgression.canOpen('tab-unregistered-feature')"));
assert(!run("contentProgression.canOpen('tab-map')"));
run("unlockJournalEntry('act_1');contentProgression.sync()");
assert(run("contentProgression.canOpen('tab-journal')"),'first-loop players can read their earned act journal');
assert.equal(run('contentProgression.balance()'),0,'reading records requires no unlock points');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));contentProgression.sync()');
assert(run("contentProgression.canOpen('tab-journal') && game.journalEntries.includes('act_1')"),'earned first-loop journals remain readable after loading');
run('game=mergeDefaults({})');
run('game.maxZoneId=1;contentProgression.sync()');
assert(run("contentProgression.canOpen('tab-map') && game.unlocks.map"),'discovering the next hunting area opens its map');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));contentProgression.sync()');
assert(run("contentProgression.canOpen('tab-map') && game.unlocks.map"),'save restoration must not hide an opened map');
run('game.maxZoneId=0;contentProgression.sync()');
assert(run("contentProgression.canOpen('tab-map')"),'an existing map unlock remains available');
// Flasks were removed (2026-10-01): their ledger ids are dropped on load, like any other removed entry.
run("game=mergeDefaults({season:1,contentProgression:{version:7,highestLoop:1,inherited:['flask','flaskUtility'],automatic:['battleTrials']}})");
assert(!json('game.contentProgression.inherited').some(id=>id.startsWith('flask')),'removed flask entries are dropped from the ledger');
run("game.currentZoneId='trial_1';game.killsInZone=9;game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
assert.deepEqual(json('[game.currentZoneId,game.killsInZone,game.enemies,game.encounterPlan]'),[0,0,[],[]],'loading a locked trial returns safely to the starting area');
for (const loop of [1,2,3]) {
 run(`game=mergeDefaults({});game.season=${loop};game.maxZoneId=8;game.contentProgression.automatic=['battleTrials'];contentProgression.sync()`);
 const travel=json('[game.currentZoneId,game.killsInZone,game.inTicketBossFight,game.currencies]');
 run("changeZone('trial_1')");
 assert.deepEqual(json('[game.currentZoneId,game.killsInZone,game.inTicketBossFight,game.currencies]'),travel,'locked direct trial travel must be side-effect free');
 assert(!run("contentProgression.canOpen('map-explore-trials')"),'stored automatic flags cannot bypass advancement purchase');
}
run(`game.season=4;contentProgression.sync();contentProgression.purchase('craft');contentProgression.purchase('loopTree');contentProgression.purchase('trials');changeZone('trial_1')`);
assert.equal(run('game.currentZoneId'),'trial_1','purchasing advancement enables trial entry');
run('game=mergeDefaults({})');
let before = json('game');
assert(!run("contentProgression.purchase('support').ok"));
assert.deepEqual(json('game'), before);
run('game.season=2;contentProgression.sync()');
// 2026-11-02: three roots open at loop 2, and everything else grows from them. No unlock comes from an NPC.
assert.deepEqual(json('CONTENT_UNLOCK_CATALOG.filter(def=>contentProgression.status(def.id).available&&contentProgression.kind(def)===\'paid\').map(def=>def.id).sort()'),['craft','loopTree','support']);
assert(run("contentProgression.isUnlocked('journal')"));
before=json('game');
assert(!run("contentProgression.purchase('journal').ok"),'automatic content cannot spend points');
assert(!run("contentProgression.purchase('craft',game,'formlessDew').ok"));
assert.deepEqual(json('game'),before);
const budBefore=run('game.currencies.magicBud');
assert(run("contentProgression.purchase('craft').ok"));
assert.equal(run('game.currencies.magicBud'),budBefore+1);
assert.equal(run('contentProgression.balance()'),0,'장비 제련 takes the loop-2 points');
assert(!run("contentProgression.purchase('flask').ok"),'the removed flask entry cannot be bought');
assert(!run("contentProgression.purchase('craft').ok"));
assert.equal(run('game.currencies.magicBud'),budBefore+1,'entry material is granted only once');
assert(run("contentProgression.canOpen('tab-map')"),'crafting completion and normal gear are not progression requirements');
run('game.season=3;contentProgression.sync()');
assert(!run("contentProgression.purchase('support',game,'invalid').ok"));
assert(run("contentProgression.purchase('support').ok"));
assert(run("game.supports.includes('가속')"));
before=json('game');
for(const id of ['support','craft','unknown'])assert(!run(`contentProgression.purchase('${id}').ok`));
assert.deepEqual(json('game'),before);
run('game.season=4;contentProgression.sync()');
assert(!run("contentProgression.isUnlocked('fossil')"),'reaching the stage enables a choice, not free growth');
assert(run("contentProgression.purchase('fossil').ok"));
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('contentProgression.balance()'),1,'loops 2~4 gave 2 points each; 장비 제련 and support cost 2, 화석 제작 1');
assert(run("contentProgression.isUnlocked('fossil')"));
run('game.season=8;contentProgression.sync()');
for (const id of ['gemForge','engraving','fossilRestore','jewel','market','codex']) assert(run(`contentProgression.purchase('${id}').ok`), id);
assert(run("contentProgression.isUnlocked('hall')"),'장비 전당 opens with 고유 도감');
assert.equal(run('contentProgression.balance()'),0);
before=json('game');
assert(!run("contentProgression.purchase('loopTree').ok"));
assert.deepEqual(json('game'),before,'insufficient points must not grant anything or spend points');
run('game=mergeDefaults({});game.season=10;contentProgression.sync()');
// Content opens by itself, but grows from the tree: the row before it has to be open (2026-11-02).
for(const id of ['labyrinth','beehive','voidrift','duel'])assert(!run(`contentProgression.isUnlocked('${id}')`),id);
assert.equal(run('contentProgression.balance()'),18);
for(const id of ['craft','fossil','fossilRestore','jewel','support'])assert(run(`contentProgression.purchase('${id}').ok`),id);
for(const id of ['labyrinth','beehive','voidrift','duel'])assert(run(`contentProgression.isUnlocked('${id}')`),id);
assert.equal(run('contentProgression.balance()'),10,'the content itself takes no points');
assert(!run("contentProgression.isUnlocked('deepChaos')"));
run('game.abyssClearedDepths=[20];contentProgression.sync()');
assert(run("contentProgression.isUnlocked('deepChaos')"));
// 심화 혼돈 hangs on no unlock: from loop 11 it is the loop condition, and points only come by looping.
assert.deepEqual(json("contentProgression.parents(CONTENT_UNLOCK_CATALOG.find(def=>def.id==='deepChaos'))"),[]);
assert(!run("contentProgression.isUnlocked('chaosRealm')"),'loop alone does not satisfy a boss milestone');
run('game.chaosRealm.unlocked=true;contentProgression.sync()');
assert(!run("contentProgression.isUnlocked('chaosRealm')"),'the milestone alone does not open it before 룬 강화');
assert(run("contentProgression.purchase('gemForge').ok"));
assert(run("contentProgression.isUnlocked('chaosRealm')"));
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)));game.abyssClearedDepths=[];contentProgression.sync()');
assert(run("contentProgression.isUnlocked('deepChaos')"),'permanent opening survives reload and a fresh loop');
run('game.loopDeepPoints=20;game.seasonPoints=7');
before=json('[game.loopDeepPoints,game.loopDeepStats,game.seasonPoints,game.seasonNodes]');
run("allocateLoopDeepStat('flatHp');buySeason(Object.keys(SEASON_NODES)[0])");
assert.deepEqual(json('[game.loopDeepPoints,game.loopDeepStats,game.seasonPoints,game.seasonNodes]'),before,'locked investment keeps accumulated points');
assert(!run("contentProgression.purchase('deepTree').ok"),'requires the earlier growth branch');
assert(run("contentProgression.purchase('loopTree').ok"));
assert(run("contentProgression.purchase('trials').ok"));
run('game.maxZoneId=3;contentProgression.sync()');
assert(run("contentProgression.purchase('deepTree').ok"));
run("allocateLoopDeepStat('flatHp');buySeason(Object.keys(SEASON_NODES)[0])");
assert.equal(run('game.loopDeepPoints'),19);
assert.equal(run('game.loopDeepStats.flatHp'),1);
assert.equal(run('game.seasonPoints'),6);
// 액트 3 입장만으로는 열리지 않고 클리어 시 루프 1에서 무료로 기본 전술과 규칙이 열린다.
run('game=mergeDefaults({});game.maxZoneId=2;contentProgression.sync()');
assert(!run("contentProgression.canOpen('skill-tab-condition')"));
const tacticsBalance = run('contentProgression.balance()');
assert(!run("contentProgression.purchase('tactics').ok"));
run("unlockJournalEntry('act_3');contentUnlockUi.syncOpened()");
assert.equal(run('contentProgression.balance()'), tacticsBalance);
assert(run("game.combatTacticsUnlocked && contentProgression.canOpen('skill-tab-condition')"));
assert(!run("contentProgression.isUnlocked('craft')"), 'tactics do not require crafting');
assert(run("getConditionPatternTriggers(game,false).some(row=>row.id==='hp_below') && getConditionPatternActions(game,false).some(row=>row.id==='target_nearest')"), 'basic conditional tactics work during loop one');
assert(!run("getConditionPatternTriggers(game,false).some(row=>row.id==='elite_present')"), 'advanced requirements stay intact');
assert(!run("contentProgression.purchase('tactics').ok"), 'automatic unlock has no purchase');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert(run("game.combatTacticsUnlocked && contentProgression.canOpen('skill-tab-condition')"), 'free tactics survive reload');
run('game.season=2;game.maxZoneId=0;game.journalEntries=[];contentProgression.sync()');
assert(run("game.combatTacticsUnlocked && contentProgression.canOpen('skill-tab-condition')"), 'automatic access persists across loop progress reset');
run("game=mergeDefaults({season:1,combatTacticsUnlocked:true,settings:{combatTargetPriority:'dangerous',combatPositionMode:'keepRange'},contentProgression:{version:7,highestLoop:1,unlocked:[],inherited:[]}})");
assert(run("contentProgression.isUnlocked('tactics') && game.combatTacticsUnlocked"), 'former act-3 tactics remain usable without a second purchase');
assert.deepEqual(json('[game.settings.combatTargetPriority,game.settings.combatPositionMode]'), ['dangerous','keepRange']);
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(json('game.contentProgression.inherited').filter(id=>id==='tactics').length, 1, 'migration is idempotent');
run("game=mergeDefaults({season:3,maxZoneId:4,journalEntries:['act_3'],contentProgression:{version:8,highestLoop:3,unlocked:[],inherited:[]}})");
assert(run('game.combatTacticsUnlocked'), 'act-three completion also opens tactics in current saves');
run("game=mergeDefaults({season:2,contentProgression:{version:8,highestLoop:2,unlocked:['craft','tactics'],paidCosts:{craft:1,tactics:1},inherited:[]}})");
assert(run("game.combatTacticsUnlocked && contentProgression.isUnlocked('craft')"), 'previous paid tactics remain available');
assert.equal(run('contentProgression.balance()'), 4, 'one-point tactics and crafting come back (crafting is an NPC unlock now); the 4 points loop 2 gave then stay');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('contentProgression.balance()'), 4, 'refund is idempotent');
run("game=mergeDefaults({season:3,combatTacticsUnlocked:true,skillAutoRules:[{triggerType:'boss_warning',actionType:'condition_gem',skillName:'긴급 회피'},{triggerType:'hp_below',skillName:'철의 맹세'},{triggerType:'hp_below',triggerValue:30,actionType:'return_town',enabled:true}]})");
assert.deepEqual(json('game.skillAutoRules.map(rule=>rule.actionType)'),['return_town'],'old condition gem rules go, tactic rules stay');
// 'bounty'(삭제된 보물사냥)는 저장에 남아 있어도 무시된다.
run("game=mergeDefaults({season:4,contentProgression:{version:3,highestLoop:4,unlocked:['support','bounty','labyrinth'],inherited:[]}})");
assert(!json('[...game.contentProgression.unlocked,...game.contentProgression.inherited]').includes('bounty'),'removed content ids are dropped on load');
assert(run("contentProgression.isUnlocked('gemForge')"));
assert.equal(run('contentProgression.balance()'),10,'free combat refunds old costs; prior bundled growth stays open');
const migrated=json('game.contentProgression');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),migrated);
run("game=mergeDefaults({season:2,contentProgression:{version:3,highestLoop:2,unlocked:['trials'],inherited:[]}})");
assert(run("contentProgression.isUnlocked('trials')"));
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert(run("contentProgression.isUnlocked('trials')"),'old paid opening persists despite a new predecessor and later stage');
assert.equal(run('contentProgression.balance()'),3);
run("game=mergeDefaults({season:3,contentProgression:{version:5,highestLoop:Infinity,inherited:['unknown'],unlocked:['fossil','support','support','unknown','craft','research']}})");
assert.deepEqual(json('game.contentProgression.unlocked'),['fossil','support','craft'],'a purchase from before the tree stays whatever its new prerequisites are');
run("game=mergeDefaults({season:2,contentProgression:{version:4,highestLoop:2,inherited:[],unlocked:['support']}})");
assert(run("contentProgression.isUnlocked('support') && contentProgression.isUnlocked('craft')"),'previous branch owners keep their access and inherit the new entry');
const previousLedger=json('game.contentProgression'), previousBud=run('game.currencies.magicBud');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),previousLedger);
assert.equal(run('game.currencies.magicBud'),previousBud,'migration never replays the entry reward');
run("game=mergeDefaults({season:4,contentProgression:{version:5,highestLoop:4,unlocked:['craft','support','research']}})");
assert.deepEqual(json('game.contentProgression.paidCosts'),{craft:0,support:1},'existing purchases keep their actual old prices; NPC unlocks cost nothing');
assert.equal(run('contentProgression.balance()'),10,'previously reached loops receive the income');
assert(run("contentProgression.purchase('gemForge').ok"));
assert.equal(run('game.contentProgression.paidCosts.gemForge'),2);
const pricedLedger=json('game.contentProgression');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),pricedLedger,'new and grandfathered prices survive repeated loading');
run("game=mergeDefaults({season:2,contentProgression:{version:6,highestLoop:2,unlocked:['craft','support','flask'],paidCosts:{craft:-1,support:Infinity,flask:'0'}}})");
assert.deepEqual(json('game.contentProgression.unlocked'),['craft','support']);
assert.deepEqual(json('game.contentProgression.paidCosts'),{craft:0,support:2},'invalid prices fall back to the catalog price, NPC unlocks take none and removed entries go');
run("game=mergeDefaults({contentProgression:null})");
assert.equal(run('contentProgression.balance()'),0);
assert(!run("contentProgression.isUnlocked('craft')"));
run("game=mergeDefaults({season:4,conditionGemUnlocked:true,conditionGemPool:['긴급 회피'],conditionGemLevels:{'긴급 회피':3},contentProgression:{version:2,highestLoop:4,unlocked:['condition','research','gemForge'],inherited:[]}})");
assert(!json('[...game.contentProgression.unlocked,...game.contentProgression.inherited]').includes('condition'),'the removed condition gem entry is dropped, so its points come back');
assert.deepEqual(json("['conditionGemUnlocked','conditionGemPool','conditionGemLevels'].filter(key=>key in game)"),[],'condition gem progress is removed without compensation');
run('const legacy=JSON.parse(JSON.stringify(game));delete legacy.contentProgression;game=mergeDefaults(legacy)');
assert(run("contentProgression.isUnlocked('craft')"));
for(const def of runtime.CONTENT_UNLOCK_CATALOG){
 const seen=new Set();let row=def;
 while(row){assert(!seen.has(row.id),'acyclic prerequisites');seen.add(row.id);row=runtime.CONTENT_UNLOCK_CATALOG.find(candidate=>candidate.id===row.after);}
 const kind=runtime.contentProgression.kind(def);
 assert(['paid','auto'].includes(kind) && !def.npc,`${def.id}: no unlock comes from an NPC`);
 if(def.minLoop>1&&!def.after)assert(['craft','support','loopTree','deepChaos'].includes(def.id),`${def.id}: every board row grows from a root`);
 // World progress must not stand in the way of the rows behind it (재능 and 코어 stay leaves).
 if(['talent','cube'].includes(def.id))assert(!runtime.CONTENT_UNLOCK_CATALOG.some(row=>runtime.contentProgression.parents(row).includes(def.id)),`${def.id}: nothing waits behind it`);
}
// Locked loot must not leak through boss rewards or offline's shared combat functions.
runtime.Math = Object.create(Math);
runtime.Math.random = () => 0;
run('game=mergeDefaults({});game.season=4;game.currentZoneId=1;game.level=13;contentProgression.sync()');
assert.equal(run("awardCurrency('bossCore',1,'drop')"),0);
assert.equal(run('game.currencies.bossCore'),0);
assert(json('getCurrencyDrops({isBoss:true})').every(([key])=>!['magicBud','sapBud','goldenRule','bossCore'].includes(key)));
assert(run("contentProgression.canDropCurrency('chaosKey') && contentProgression.canDropCurrency('coreKey')"),'world prerequisite keys remain obtainable');
assert(run("contentProgression.purchase('craft').ok"));
assert.equal(run('game.currencies.magicBud'),1,'first crafting material still arrives exactly once');
assert(json('getCurrencyDrops({isBoss:true})').some(([key])=>key==='magicBud'));
assert(!run("contentProgression.canDropCurrency('fossil')"));
assert(!run("contentProgression.canDropCurrency('sealShard')"));
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
run("game.season=6;contentProgression.sync();contentProgression.purchase('support')");
// An explicit reward/refund is not a monster drop and cannot be silently destroyed.
assert.equal(run("awardCurrency('sealShard',2)"),2);
assert(!run("contentProgression.isUnlocked('talisman')"));
assert.equal(run("talismans.unseal('sealShard').ok"),false,'shards alone do not open talisman unsealing');
assert.equal(run('game.currencies.sealShard'),2,'a refused unseal keeps the shards');
run('game.underworldProgress.highestFloor=11');
assert(!run('coreItems.canDrop()'),'world progress alone cannot drop a locked core');
run("game.contentProgression.inherited.push('cube')");
assert(run('coreItems.canDrop()'));
// Exercise the real loop transition: UI descriptions distinguish access from possessions.
run(`game=mergeDefaults({}); game.season=25; contentProgression.sync();
    contentProgression.purchase('craft');
    game.contentProgression.inherited.push('talisman');
    // 2 points a loop: with the 강화 steps and the later rows owned, loop 25 funds the rest of the catalog
    game.contentProgression.inherited.push(...CONTENT_UNLOCK_CATALOG.filter(def=>def.series||def.since===CONTENT_UNLOCK_TREE_VERSION).map(def=>def.id));
    game.currencies.bossCore=7; game.currencies.skyEssence=8;
    game.currencies.runeShard=10; game.currencies.underCopper=11; game.currencies.enchantedHoney=12;
    game.currencies.voidChisel=13; game.currencies.colonyShard=14;
    game.gemData['이중 베기']=normalizeGemRecord({level:5,bossCoreLevel:3,skyCoreLevel:2});
    game.skyGemEnhancements={'이중 베기':['sky_force']};
    game.beehive.unlockedPermanent=true; game.beehive.cleared=true;
    game.voidRift.breachClears=3; game.voidRift.grandBreachUnlock=true;
    game.underworldRunes.obtainedRunes=[1]; game.underworldRunes.unlockedSlots=1;
    game.underworldRunes.enhanceLvByNo={1:2}; game.underworldRunes.equippedRunes[0]=1;
    game.timeRift={pressure:2,fusionCount:3,altarUnique:{id:'altar-kept'},altarRare:null};
    game.skyTower.unlocked=true; game.skyTower.condensedPower=7; game.skyTower.gemBoosts={'이중 베기':2};
    game.skyTower.lastResult={season:25,floor:1,kind:'first',condensedPower:3};
    game.ocean.fishStock={[OCEAN_STATE_FISH_KEYS[0]]:4}; game.ocean.fishCaughtTotal={[OCEAN_STATE_FISH_KEYS[0]]:8}; game.ocean.reefInstalled=2;
    game.colony.wave=7; game.colony.wardInventory=[{id:'ward-reset'}];
    game.talentCards={hero1__warrior:{level:3,score:45,count:2}};
    game.bloomedClassThisLoop='warrior'; game.bloomedTalentThisLoop='hero1'; game.ascendPoints=3;
    game.skillAutoRules=[{id:'keep',enabled:true,priority:1,triggerType:'hp_below',triggerValue:30,actionType:'return_town'}];
`);
const permanentBefore=json('[game.beehive.cleared,game.voidRift.breachClears,game.underworldRunes,game.talentCards,game.skillAutoRules]');
const pointsBefore=run('contentProgression.balance()');
run('triggerSeasonReset()');
assert.equal(run('game.season'),26);
assert.equal(run('contentProgression.balance()'),pointsBefore, 'fully funded growth stops awarding excess points');
assert(run("contentProgression.isUnlocked('craft')"));
assert.deepEqual(json('[game.beehive.cleared,game.voidRift.breachClears,game.underworldRunes,game.talentCards,game.skillAutoRules]'),permanentBefore);
assert.equal(run('game.voidRift.grandBreachUnlock'),false,'an open grand breach closes at the loop (user decision 2026-10-20)');
assert.deepEqual(json("['bossCore','skyEssence','runeShard','underCopper','enchantedHoney','voidChisel','colonyShard'].map(key=>game.currencies[key])"),Array(7).fill(0));
assert(!run("game.gemData['이중 베기']"));
assert.deepEqual(json('game.skyGemEnhancements'),{});
assert.deepEqual(json('[game.timeRift.pressure,game.timeRift.fusionCount,game.timeRift.altarUnique,game.timeRift.altarOpen]'),[2,3,null,false],'the altar empties at the loop (user decision 2026-10-20)');
assert.deepEqual(json("[game.skyTower.condensedPower,game.skyTower.gemBoosts['이중 베기']]"),[7,2]);
assert.equal(run('game.skyTower.lastResult'),null,'a new loop clears the display receipt while preserving permanent sky growth');
assert.equal(run('game.ocean.reefInstalled'),2);
assert.deepEqual(json('[game.ocean.fishStock[OCEAN_STATE_FISH_KEYS[0]],game.ocean.fishCaughtTotal[OCEAN_STATE_FISH_KEYS[0]]]'),[4,8]);
assert.equal(run('game.colony.wave'),run('defaultGame.colony.wave'));
assert.deepEqual(json('game.colony.wardInventory'),[]);
assert.deepEqual(json('[game.bloomedClassThisLoop,game.bloomedTalentThisLoop,game.ascendPoints]'),[null,null,0]);
// New choices split meaningful access; old owners retain the former bundle for free.
run(`game=mergeDefaults({});game.season=4;contentProgression.sync();
    contentProgression.purchase('support');contentProgression.purchase('gemForge');
    game.skills=['이중 베기'];game.activeSkill='이중 베기';game.gemEnhanceTargetSkill='이중 베기';
    game.gemData['이중 베기']=normalizeGemRecord({});game.currencies.skyEssence=20;game.currencies.bossCore=20;
    game.skyGemEnhancements={'이중 베기':['sky_fury']};`);
assert.equal(run('contentProgression.balance()'),2);
assert(!run("contentProgression.isUnlocked('engraving')"));
before=json('[game.gemData,game.skyGemEnhancements,game.currencies]');
assert.deepEqual(json("getSkyEnhancementForSkill('이중 베기')"),[]);
for (const expression of ["applySkyGemEnhancementToActive('sky_swiftness')",'upgradeSkyEngraveCap()',
    'selectGemEngraveSlot(1)',"removeSkyGemEnhancementFromActive('sky_fury',0)"]) assert(!run(expression));
assert.deepEqual(json('[game.gemData,game.skyGemEnhancements,game.currencies]'),before);
run("gemCoreForge.attempt('이중 베기')");
assert.equal(run("game.gemData['이중 베기'].enhanceLevel"),1,'the first step never fails');
run('game.season=6;contentProgression.sync()');
assert(run("contentProgression.purchase('engraving').ok"));
assert.deepEqual(json("getSkyEnhancementForSkill('이중 베기')"),['sky_fury']);
assert(run("applySkyGemEnhancementToActive('sky_swiftness',0)"));
assert(run('upgradeSkyEngraveCap()'));
run(`game=mergeDefaults({});game.season=4;
    game.contentProgression={version:6,highestLoop:4,unlocked:['craft','flask'],paidCosts:{craft:1,flask:1},
        inherited:['support','research','gemForge'],grandfathered:[],automatic:[]};
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));`);
assert(run("contentProgression.isUnlocked('engraving')"));
assert.equal(run('contentProgression.balance()'),11,'the paid flask entry is gone and 장비 제련 is an NPC unlock, so their points come back');
before=json('game.contentProgression');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),before,'split migration is idempotent and never charges owners again');
for (const id of ['timerift','colony','beehive','voidrift']) {
    assert.equal(run(`CONTENT_UNLOCK_CATALOG.find(def=>def.id==='${id}').cost`),0);
}
// Point cap includes future gated choices and preserves the historical purchase ledger.
run('game=mergeDefaults({})');
const totalCost=run('CONTENT_UNLOCK_CATALOG.reduce((sum,def)=>sum+def.cost,0)');
assert.deepEqual(json('contentProgression.points()'),{balance:0,remaining:totalCost,nextAward:runtime.CONTENT_UNLOCK_POINT_AWARDS.perLoop,complete:false});
// The first loop whose points cover the whole catalog (it moves when a row is added: 공허 소켓 2026-11-06).
run(`game.season=${1+Math.ceil(totalCost/runtime.CONTENT_UNLOCK_POINT_AWARDS.perLoop)};contentProgression.sync()`);
assert.equal(run('contentProgression.balance()'),totalCost);
assert(!run("contentProgression.status('beyond').available"),'future loop gates remain enforced after funding');
before=json('game');
assert.equal(run('contentProgression.points().nextAward'),0);
assert.deepEqual(json('game'),before,'reading the budget never mutates state');
run("game.season=50;contentProgression.sync();for(const id of ['craft','fossil','fossilRestore','craftSimulator'])contentProgression.purchase(id)");
assert.equal(run('contentProgression.balance()'),totalCost-5);
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('contentProgression.balance()'),totalCost-5);
assert.deepEqual(json('[game.contentProgression.paidCosts.craft,game.contentProgression.paidCosts.craftSimulator]'),[2,1]);

// A one-point final gap awards only one; inherited access and other resources survive completion.
run(`game=mergeDefaults({});
    game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.filter(def=>contentProgression.kind(def)!=='auto'&&def.id!=='craftSimulator').map(def=>def.id);
    game.seasonPoints=7;game.currencies.magicBud=9;`);
assert.deepEqual(json('contentProgression.points()'),{balance:0,remaining:1,nextAward:1,complete:false});
const loopSummary = () => screenText(run('loopSettlementUi.summaryHtml()'));
assert(loopSummary().includes('해금 포인트 +1'));
assert(run("getNextMajorContentUnlock(game).description.includes('1점')"));
run('game.season=7;contentProgression.sync()');
assert.equal(run('contentProgression.balance()'),1);
assert.equal(run('contentProgression.points().nextAward'),0);
assert(run("contentProgression.purchase('craftSimulator').ok"));
assert.deepEqual(json('contentProgression.points()'),{balance:0,remaining:0,nextAward:0,complete:true});
assert.equal(run('getNextMajorContentUnlock(game)'),null);
assert(loopSummary().includes('전체 해금 완료'));
assert(!loopSummary().includes('해금 포인트 +'));
assert(!run("contentProgression.isUnlocked('cosmos')"),'automatic world progress is independent of paid completion');
const ownedBefore=json('game.contentProgression.inherited');
const resourcesBefore=json('[game.currencies.magicBud,game.currencies.goldenRule,game.seasonPoints]');
run('game.season=50;contentProgression.sync();game=mergeDefaults(JSON.parse(JSON.stringify(game)));contentProgression.sync()');
assert.equal(run('contentProgression.balance()'),0);
assert.deepEqual(json('game.contentProgression.inherited'),ownedBefore);
assert.deepEqual(json('[game.currencies.magicBud,game.currencies.goldenRule,game.seasonPoints]'),resourcesBefore);
assert(run("CONTENT_UNLOCK_CATALOG.filter(def=>contentProgression.kind(def)!=='auto').every(def=>contentProgression.isUnlocked(def.id))"));
before=json('game');
assert(!run("contentProgression.purchase('craftSimulator').ok"));
assert(!run("contentProgression.purchase('craft').ok"));
assert.deepEqual(json('game'),before,'completed purchases cannot replay entry rewards');
run("game=mergeDefaults({season:4,bountyHunt:{version:5,remaining:0,pending:{id:'x',status:'reward',offerIds:[]},completed:3}})");
assert.equal(run("'bountyHunt' in game"),false,'removed treasure-hunt state is discarded without a reward');
// 루프 2의 목표는 2점으로 2점짜리 뿌리 하나를 고르게 한다.
// 목표는 고를 수 없는 선택을 재촉하지 않고 다음 해금까지 남은 점수를 센다(2026-10-04 사용자 보고).
run('game=mergeDefaults({});game.season=2;game.contentProgression.inherited=[];contentProgression.sync()');
assert.equal(run('contentProgression.balance()'),2);
assert.deepEqual(json('[getNextMajorContentUnlock(game).id,getNextMajorContentUnlock(game).actionTabId]'),['content-choice','tab-unlocks']);
assert.equal(run('getNextMajorContentUnlock(game).requirements[0].met'),true,'two points buy one of the 2-point loop-2 unlocks');
assert(run("contentProgression.purchase('support').ok"));
assert.equal(run('contentProgression.cheapestOpen(game).cost'),2);
const waiting=json('getNextMajorContentUnlock(game)');
assert.deepEqual(waiting.requirements[0],{label:'해금 포인트',met:false,current:0,target:2},'the next unlock waits for points');
run('game.season=3;contentProgression.sync()');
assert.equal(run('getNextMajorContentUnlock(game).requirements[0].met'),true,'the next loop makes the choice actionable again');
// 2026-10-21 NPC 해금 분리: 이전 표(루프 2~5에 4, 4, 3, 3)로 받은 포인트는 남고(carry) NPC 해금에 낸 포인트는 돌아온다. 불러오기가
// 산 해금을 빼거나 넘친 포인트(그루터기 함 접붙이기 점수)를 줄이지 않는다.
const catalogRow=id=>runtime.CONTENT_UNLOCK_CATALOG.find(def=>def.id===id);
// 강화 steps (2026-10-25) did not exist in these saves.
const formerGifts=['craft','fossil','fossilRestore','codex','advancedSpores'];
const growthIds=[...formerGifts,...runtime.CONTENT_UNLOCK_CATALOG.filter(def=>runtime.contentProgression.kind(def)!=='auto'&&!def.series&&!def.since).map(def=>def.id)];
const boughtBy12=['craft','fossil','fossilRestore','codex','advancedSpores','support','gemForge','engraving','loopTree','trials','jewel','talisman','craftSimulator','deepTree'];
const oldPrices=Object.fromEntries(boughtBy12.map(id=>[id,formerGifts.includes(id)?1:catalogRow(id).cost]));
const oldSave={season:12,contentProgression:{version:8,highestLoop:12,unlocked:boughtBy12,paidCosts:oldPrices,inherited:[]}};
assert.equal(run(`contentProgression.overflow(${JSON.stringify(oldSave)})`),run(`contentProgression.overflow(mergeDefaults(${JSON.stringify(oldSave)}))`),'the stump box reads the same overflow from the saved and the loaded ledger');
run(`game=mergeDefaults(${JSON.stringify(oldSave)})`);
assert.deepEqual(json('game.contentProgression.unlocked'),boughtBy12,'every unlock bought under the earlier table survives loading');
assert.equal(run('game.contentProgression.carry'),7);
assert.equal(run("Object.values(game.contentProgression.paidCosts).reduce((a,b)=>a+b,0)"),17,'NPC unlocks bought for points are refunded');
assert.equal(run('contentProgression.balance()'),12,'loop 12: 22 points from the awards and 7 carried, 17 paid; the 강화 steps, 재능, 룬 각성 and 코어 can take them');
const carried=json('game.contentProgression');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),carried,'the carry is fixed once and never applied twice');
const giftedAll=growthIds;
const giftedSave={season:20,contentProgression:{version:8,highestLoop:20,unlocked:giftedAll,paidCosts:Object.fromEntries(giftedAll.map(id=>[id,0])),inherited:[]}};
assert.equal(run(`contentProgression.overflow(mergeDefaults(${JSON.stringify(giftedSave)}))`),44,'a save that took its unlocks from NPCs keeps every overflow point the earlier table gave');
// 2026-11-02 트리(장부 11): 트리 전 저장은 잃는 것이 없다. 그 루프까지 열렸던 줄은 물려받고, 콘텐츠는 앞 해금을 따지지 않으며, 넘치던 점수는 그대로 남는다.
const treeSave={season:40,maxZoneId:9,contentProgression:{version:10,highestLoop:40,carry:0,graftFloor:0,paceCarry:0,unlocked:['support','loopTree','offlineHours1'],paidCosts:{support:2,loopTree:2,offlineHours1:1},inherited:[],automatic:['market','labyrinth','hall'],grandfathered:[]}};
const treeOverflow=run(`contentProgression.overflow(${JSON.stringify(treeSave)})`);
run(`game=mergeDefaults(${JSON.stringify(treeSave)})`);
assert.equal(run('game.contentProgression.version'),runtime.CONTENT_UNLOCK_RECORD_VERSION);
for(const id of ['craft','market','codex','fossil','memoryDungeon','regionAffix','emberField','sapWound','bossVariant','ringRoute','garden','nursery','rootMemory','graft','stumpSeal1','stumpSeal3','stumpQuality1','knitting'])assert(run(`contentProgression.isUnlocked('${id}')`),`${id} was open at loop 40 and stays open for free`);
for(const id of ['memoryDeep','ancientSeed','stumpSeal4','stumpQuality2','oilSecond','roomOne'])assert(!run(`contentProgression.isUnlocked('${id}')`),`${id} waits for its own loop`);
assert(run("contentProgression.isUnlocked('labyrinth')&&contentProgression.isUnlocked('hall')&&contentProgression.isUnlocked('ocean')&&contentProgression.isUnlocked('colony')"),'content that opened by loop stays open without the rows before it');
assert(run('contentProgression.overflow(game)')>=treeOverflow,'new prices never shrink the graft points a save had');
assert(run("contentProgression.holds('stumpSeal3',game)&&!contentProgression.holds('stumpSeal4',game)"));
const treeLedger=json('game.contentProgression');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.contentProgression'),treeLedger,'the move to the tree happens once');
// 불러오는 중(장부 복원 전) 그루터기 함과 아틀라스가 읽는 값: 옛 기록은 그때 규칙(루프)대로 본다. 봉인 칸과 품질이 깎이면 안 된다.
assert(run(`contentProgression.holds('stumpSeal3',${JSON.stringify(treeSave)})&&!contentProgression.holds('stumpSeal4',${JSON.stringify(treeSave)})`),'a saved record before the tree reads by loop');
assert(run("contentProgression.holds('memoryDungeon',{season:21})&&!contentProgression.holds('memoryDungeon',{season:20})"),'no ledger reads by loop');
// 새 게임은 나무를 따른다: 루프가 닿아도 앞 해금과 값이 있어야 열린다. 저장해도 그대로다.
run('game=mergeDefaults({});game.season=40;contentProgression.sync()');
assert.equal(run('game.contentProgression.looseContent'),false);
for(const id of ['craft','memoryDungeon','stumpSeal1','labyrinth','ocean'])assert(!run(`contentProgression.isUnlocked('${id}')`),`${id} waits for the tree in a new game`);
assert(!run("contentProgression.holds('stumpSeal1',game)"),'reaching the loop alone buys nothing');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.equal(run('game.contentProgression.looseContent'),false,'loading a new-game save does not loosen it');
assert(!run("contentProgression.isUnlocked('craft')"));
// 루프 포인트 알림(js/goal-system.js)은 지금 살 노드가 있을 때만 뜬다: 다음 고리가 루프 5를 기다리거나 루프 패시브가 잠겨 있으면 조용하다.
run("game=mergeDefaults({});game.season=3;game.contentProgression.inherited=['craft','loopTree'];contentProgression.sync();game.seasonPoints=1");
assert.equal(run('hasSpendableSeasonPoint()'),true);
run('game.seasonNodes=SEASON_NODE_ROWS.slice(0,4).flat()');
assert.equal(run('hasSpendableSeasonPoint()'),false,'the next ring waits for loop 5');
run('game.season=5');
assert.equal(run('hasSpendableSeasonPoint()'),true);
run("game.contentProgression.inherited=['craft'];contentProgression.sync()");
assert.equal(run('hasSpendableSeasonPoint()'),false,'points saved before the loop passive opens are not a goal');
// The simulator is a separate permanent purchase; reaching a loop or loading an old save never grants it.
run('game=mergeDefaults({});contentProgression.sync()');
assert(!run("contentProgression.isUnlocked('craftSimulator')"));
run("game.season=5;contentProgression.sync();for(const id of ['craft','fossil','fossilRestore'])contentProgression.purchase(id)");
before=json('game');
assert(!run("contentProgression.purchase('craftSimulator').ok"));
assert.deepEqual(json('game'),before,'early simulator purchase spends nothing');
run('game.season=7;contentProgression.sync()');
assert(run("contentProgression.status('craftSimulator').available"));
assert(!run("contentProgression.isUnlocked('craftSimulator')"),'loop seven offers a choice, not automatic access');
const simulatorPoints=run('contentProgression.balance()');
assert(run("contentProgression.purchase('craftSimulator').ok"));
assert.equal(run('contentProgression.balance()'),simulatorPoints-1);
before=json('game');
assert(!run("contentProgression.purchase('craftSimulator').ok"));
assert.deepEqual(json('game'),before,'duplicate unlock spends nothing');
run('game.season=8;game=mergeDefaults(JSON.parse(JSON.stringify(game)));contentProgression.sync()');
assert(run("contentProgression.isUnlocked('craftSimulator')"),'purchase survives a new loop and reload');
assert.equal(run('game.contentProgression.paidCosts.craftSimulator'),1);
run('game=mergeDefaults({});game.season=7;contentProgression.sync()');
before=json('game');
assert(!run("contentProgression.purchase('craftSimulator').ok"),'crafting must be unlocked first');
assert.deepEqual(json('game'),before);
for(const saved of [{season:20},{season:20,contentProgression:{version:8,highestLoop:20,unlocked:['craft'],paidCosts:{craft:1}}}]){
    run(`game=mergeDefaults(${JSON.stringify(saved)});contentProgression.sync()`);
    assert(run("contentProgression.isUnlocked('craft')"));
    assert(!run("contentProgression.isUnlocked('craftSimulator')"),'old crafting access does not inherit the new simulator purchase');
}
// Memory leaves: one discovery, one journal bonus, no repeat currency exchange; old saves and loop resets preserve discoveries.
{
    run("game=mergeDefaults({season:40,level:100,atlas:{unlocked:true,leaves:{counts:{roots_spring:15},woven:{roots_hive:2}}}})");
    assert.deepEqual(json('game.atlas.leaves.seen').sort(),['roots_hive','roots_spring']);
    assert.equal(run("game.journalBonuses.filter(b=>b.entryId.startsWith('memory_leaf_')).length"),2);
    const held=json('({leaves:game.atlas.leaves,bonuses:game.journalBonuses,currencies:game.currencies})');
    run("memoryLeaves.receive(game,'roots_spring');game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
    assert.deepEqual(json('({leaves:game.atlas.leaves,bonuses:game.journalBonuses,currencies:game.currencies})'),held);
    run("game.season++;atlas.onLoopReset(game);game=mergeDefaults(JSON.parse(JSON.stringify(game)))");
    assert.deepEqual(json('game.atlas.leaves'),held.leaves);
    assert.equal(run("game.journalBonuses.filter(b=>b.entryId.startsWith('memory_leaf_')).length"),2);
    run("game.atlas.leaves.seen=MEMORY_LEAVES.list.map(r=>r.id)");
    assert.equal(run("memoryLeaves.rollKill(game,{type:'atlasMap'},{isBoss:true},()=>{throw Error('all discovered')})"),null);
}
// Knitting (2026-10-22): a loop-40 floor no saved unlock record can bypass, the 165-kind catalogue, value weights without learning or
// once guarantees, home over rank bonus, internal unique weights, fixed homes, every exchange per class, save/loop, floor and offline.
{
const row = id => json(`knitting.row(${JSON.stringify(id)})`);
const fresh = season => run(`game=mergeDefaults({season:${season},maxZoneId:9,selectedClassId:'warrior'});
    game.contentProgression.unlocked=['craft','knitting'];game.contentProgression.looseContent=true;contentProgression.sync()`);
// Unlock floor: bought, and no earlier than loop 40.
fresh(39);
assert(!run("contentProgression.isUnlocked('knitting')"), 'loop 39 is closed');
run('game.season=40;contentProgression.sync()');
assert(run("contentProgression.isUnlocked('knitting')"), 'loop 40 opens once it is bought');
// Older saves: every kind of unlock record is held back; collection data stays untouched.
const held = { season: 5, counts: { 'first-row': 2 }, seen: ['first-row', 'ruby-stitch'], knitted: { 'first-row': 1 }, once: [] };
run(`game=mergeDefaults({season:5,maxZoneId:9,selectedClassId:'warrior',knitting:${JSON.stringify(held)}});
    Object.assign(game.contentProgression,{unlocked:['craft','knitting'],inherited:['knitting'],automatic:['knitting'],legacy:true});`);
assert(!run("contentProgression.isUnlocked('knitting')"), 'unlocked, inherited, automatic and legacy records stay closed before loop 40');
assert.equal(run("knitting.rollKill(game,{type:'act',id:9},{isBoss:true,level:game.level},()=>0)"), null, 'no thread drops before the floor');
assert.equal(json("knittingRewards.knit('first-row')").ok, false, 'no exchange before the floor');
run(`game.contentProgression=contentProgression.restore({version:9,highestLoop:5,unlocked:['craft','knitting'],inherited:['knitting'],automatic:['knitting']},game,true)`);
assert(!run("contentProgression.isUnlocked('knitting')"), 'the save boundary does not reopen it');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('game.knitting.counts'), held.counts, "this loop's stock survives a reload while closed");
assert.deepEqual(json('game.knitting.knitted'), held.knitted);
assert.deepEqual(json('game.knitting.seen').sort(), held.seen.slice().sort());
// Catalogue: 165 kinds, real IDs and unlock links, named-unique grades, 55 home zones with 1-4 kinds each.
assert.deepEqual(json('knittingRewards.catalogProblems()'), [], 'ids, names, grades, sets, sources, unlock links, rewards, unique grades and homes');
assert.equal(run('KNITTING.list.length'), 165);
assert(run('KNITTING.rankBonus < KNITTING.homeBonus'), 'a home outranks a rank-only bonus');
const homeCounts = json(`[...Array.from({length:10},(_,i)=>'act:'+i),...atlas.nodes.filter(n=>n.kind==='map').map(n=>'node:'+n.id)]
    .map(key=>[key,KNITTING.list.filter(row=>(row.homes||[]).includes(key)).length])`);
assert.equal(homeCounts.length, 55);
homeCounts.forEach(([key, n]) => assert(n >= 1 && n <= 4, `${key}: ${n}`));

assert(row('echo-weft').unlocks.includes('gemForge') && row('primal-dust').unlocks.includes('fossil'), 'currency unlock links are data, not inference');
// No learning or once guarantee: an unknitted save gets the plain value draw; the act 10 jackpot is one rare weighted entry.
fresh(40);
const lv = 'level:game.level';
const seq = values => `(() => { const s = ${JSON.stringify(values)}; let i = 0; return () => s[i++]; })()`;
const topDraw = run(`knitting.rollKill(game,{type:'act',id:0},{isBoss:true,${lv}},${seq([0, 0.999])})`);
assert(topDraw && topDraw !== 'first-row', 'no learning drop: a passed kill draws by value');
const tail = json(`knitting.weighted(knitting.dropPool(game,{type:'act',id:9},{isBoss:true}),{type:'act',id:9},{isBoss:true}).map(e=>[e.row.id,e.weight])`);
const hem = tail.find(([id]) => id === 'last-hem');
assert(hem && hem[1] > 0 && tail.some(([id, w]) => id !== 'last-hem' && w > hem[1]), 'last-hem competes by weight');
assert.notEqual(run(`knitting.rollKill(game,{type:'act',id:9},{isBoss:true,${lv}},()=>0)`), 'last-hem', 'the first act 10 kill does not lay it');
run("knitting.markDrop(game,'last-hem')");
assert(!run("knitting.dropPool(game,{type:'act',id:9},{isBoss:true}).some(row=>row.id==='last-hem')"), 'once per loop is only a cap');
// Value weights: no better grade outweighs or outpaces a lower one; a home beats a rank-only kind of the same grade.
const zones = [[{ type: 'act', id: 0 }, {}], [{ type: 'act', id: 0 }, { isBoss: true }], [{ type: 'act', id: 9 }, { isBoss: true }],
    [{ type: 'atlasMap', atlasRegion: 'roots', atlasNode: 'roots_0', atlasKind: 'map' }, {}],
    [{ type: 'atlasMap', atlasRegion: 'garden', atlasNode: 'garden_8', atlasKind: 'map' }, { isBoss: true }], [{ type: 'abyss' }, { isElite: true }]];
const pool = (zone, enemy) => { const z = JSON.stringify(zone), e = JSON.stringify(enemy);
    return json(`knitting.weighted(knitting.dropPool(game,${z},${e}),${z},${e}).map(x=>({id:x.row.id,g:x.row.grade,s:x.row.set,w:x.weight}))`); };
for (const [zone, enemy] of zones) {
    const list = pool(zone, enemy), z = JSON.stringify(zone);
    assert(list.length > 0, z);
    for (const a of list) for (const b of list) if (a.g < b.g) {
        assert(b.w <= a.w + 1e-9, `${z}: ${b.id} outweighs lower-grade ${a.id}`);
        assert(b.w / b.s <= a.w / a.s + 1e-9, `${z}: ${b.id} finishes faster than lower-grade ${a.id}`);
    }
}
const act0Boss = pool(zones[1][0], zones[1][1]), weigh = id => act0Boss.find(x => x.id === id).w;
assert(weigh('root-tip') > weigh('knotted-vow'), 'an act boss favours its home thread over a rank-only thread of the same grade');
assert(pool(zones[3][0], zones[3][1]).find(x => x.id === 'moss-burrow').w > run('KNITTING.grades[2].weight'), 'a map favours its own home thread');
// Internal unique weights: the whole pool up to the reward tier, same band same chance, reviewed stronger uniques rarer, no leaks.
const uniques = json("knittingRewards.uniquePool({uniquePool:'general',tier:20},game).map(u=>({name:u.name,t:u.reqTier||1,w:knittingRewards.uniqueWeight(u)}))");
const weightOf = name => uniques.find(u => u.name === name).w;
assert(uniques.some(u => u.t <= 4) && uniques.some(u => u.t >= 17), 'not narrowed to a near-tier window');

assert.equal(weightOf('생존자의 외투'), weightOf('헝겊 순례자'), 'same band, same chance');
assert(weightOf('왕을 베는 고목') < weightOf('생존자의 외투'), 'a higher band is rarer');
assert(weightOf('새벽 현자 후드') < weightOf('생존자의 외투') && weightOf('군단 지휘관의 투구') < weightOf('맹세의 바르부트'),
    'reviewed stronger uniques are rarer inside their band');
assert(!uniques.some(u => u.name === '초월자 파쇄검'), 'ultra rare never enters');
// Before loop 40 a kill stops at the first gate: no random draw, no thread, no floor row, no receipt.
fresh(39);
const lockedCost = json(`(() => { const real = Math.random; let draws = 0; Math.random = () => { draws++; return real(); };
    try { for (let i = 0; i < 2000; i++) { knitting.rollKill(game, getZone(0), { isBoss: i % 7 === 0, level: game.level });
        rollKnittingYarn({ isBoss: true, level: game.level }, getZone(0)); } }
    finally { Math.random = real; }
    return { draws, counts: game.knitting.counts, once: game.knitting.once }; })()`);
assert.equal(lockedCost.draws, 0, 'a locked kill draws no random number');
assert.deepEqual(lockedCost.counts, {}); assert.deepEqual(lockedCost.once, []);
fresh(40);
const lockedColony = json(`(() => { const owner = mergeDefaults({ season: 14, maxZoneId: 9, selectedClassId: 'warrior' });
    owner.contentProgression.unlocked = ['craft']; contentProgression.sync(owner);
    return { open: contentProgression.isUnlocked('colony', owner),
        names: knittingRewards.uniquePool({ uniquePool: 'colony', tier: 20 }, owner).map(u => u.name) }; })()`);
assert.equal(lockedColony.open, false, 'a loop-14 owner has the colony locked by its real rule');
assert(!lockedColony.names.includes('파수탑 감시 투구'), 'a locked content unique does not leak into its pool');
assert(json("knittingRewards.uniquePool({uniquePool:'colony',tier:20},game).map(u=>u.name)").includes('파수탑 감시 투구'),
    'the same pool holds it once the colony is open');
assert.deepEqual(json("knittingRewards.uniquePool({uniquePool:'cosmosBoss',tier:20},game)"), [], 'pools outside the list do not leak');
// Save and loop: real exchange, double click, loop reset keeps records.
fresh(40);
assert.deepEqual(json('knitting.visible(game)'), [], 'undiscovered names are absent, not placeholders');
run("for(let i=0;i<4;i++)knitting.receive(game,'first-row')");
const budBefore = run('game.currencies.magicBud');
assert(json("knittingRewards.knit('first-row')").ok);
assert.equal(run('game.currencies.magicBud'), budBefore + 3);
assert.equal(json("knittingRewards.knit('first-row')").ok, false, 'a double click cannot spend the same set twice');
run("game.knitting.counts['first-row']=3;game.season++;knitting.resetForLoop(game)");
assert.equal(run("game.knitting.counts['first-row']||0"), 0);
assert(run("game.knitting.seen.includes('first-row') && game.knitting.knitted['first-row']===1"));
// 창공석 보상은 창공의 탑 상태에 쌓인다: 재화 칸에 들어가면 창공석 화면에 보이지 않고 다음 루프에 사라졌다.
run("game.contentProgression.inherited=CONTENT_UNLOCK_CATALOG.map(def=>def.id);contentProgression.sync();game.skyTower.unlocked=true;game.skyTower.condensedPower=2;for(let i=0;i<6;i++)knitting.receive(game,'cloud-thread')");
assert(json("knittingRewards.knit('cloud-thread')").ok, 'the sky thread set knits');
assert.deepEqual(json('[game.skyTower.condensedPower, game.currencies.condensedSkyPower||0]'), [3, 0], 'condensed sky power lands in the sky tower state');
run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert(run("game.knitting.seen.includes('first-row') && game.knitting.knitted['first-row']===1"));
const badKnitting = json("knitting.normalize({season:1,counts:{'first-row':10,unknown:99},seen:['unknown'],knitted:{'first-row':2},once:['last-hem']},2)");
assert.deepEqual(badKnitting.counts, {}); assert.deepEqual(badKnitting.seen, ['first-row']); assert.deepEqual(badKnitting.once, []);
// Floor and offline paths: the same draw arrives as the same count; a floor row settled at a save boundary is received once.
fresh(40);
const drawn = run(`knitting.rollKill(game,{type:'act',id:0},{isBoss:true,${lv}},()=>0)`);
const countOf = id => run(`game.knitting.counts[${JSON.stringify(id)}]||0`);
const beforeOffline = countOf(drawn);
run(`game.isBackgroundCalculation=true;{const r=Math.random;Math.random=()=>0;
    try{rollKnittingYarn({isBoss:true,${lv}},{type:'act',id:0});}finally{Math.random=r;game.isBackgroundCalculation=false;}}`);
assert.equal(countOf(drawn), beforeOffline + 1, 'offline settlement receives the same thread through knitting.receive');
const beforeForeground = countOf(drawn);
run(`{const r=Math.random;Math.random=()=>0;try{rollKnittingYarn({isBoss:true,${lv}},{type:'act',id:0});}finally{Math.random=r;}}`);

assert.equal(countOf(drawn), beforeForeground + 1, 'off the exploration floor the foreground path is the same');
const beforeFloor = countOf('loose-end');
run("var savedFloor={groundLoot:[{gx:1,gy:1,kind:'yarn',yarn:'loose-end'}]};actExplorationState.groundLoot.settleOnLoad(game,savedFloor)");
assert.equal(countOf('loose-end'), beforeFloor + 1, 'a floor yarn settled at a save boundary is received once');
run('actExplorationState.groundLoot.settleOnLoad(game,savedFloor)');
assert.equal(countOf('loose-end'), beforeFloor + 1, 'settling the same floor again receives nothing');
const before = json('game.knitting');
run("knitting.receive(game,'loose-end')");
const gains = json(`knitting.gainedBetween(${JSON.stringify(before)},game.knitting)`);
assert.equal(gains.total, 1);
// Every exchange with everything open; one equipment, no automation.
run(`game=mergeDefaults({season:40,maxZoneId:9,selectedClassId:'warrior'});
    game.contentProgression.unlocked=CONTENT_UNLOCK_CATALOG.map(row=>row.id);contentProgression.sync();
    game.knitting.seen=KNITTING.list.map(row=>row.id); game.settings.autoEquip=true; game.settings.autoSalvageEnabled=true;`);
run('game.atlas.unlocked=true');
for (const kind of json('KNITTING.list')) {
    run(`game.inventory=[];game.knitting.counts[${JSON.stringify(kind.id)}]=${kind.set}`);
    const made = json(`knittingRewards.knit(${JSON.stringify(kind.id)},()=>0.25)`);
    assert(made.ok, `${kind.id}: ${made.reason}`);
    if (kind.reward.gear || kind.reward.unique || kind.reward.uniquePool) {
        assert.equal(run('game.inventory.length'), 1, `${kind.id} stores exactly one equipment, regardless of automation`);
        if (kind.reward.gear?.influence) assert.equal(run('game.inventory[0].influence'), kind.reward.gear.influence);
        if (kind.reward.unique) assert.equal(made.made.item.name, kind.reward.unique);
    }
}
// The fossil boots keep the shared pool contract (same-effect normal lines may coexist) for every class and draw.
// Mapstone exchanges are all-or-nothing, including the atlas's UID counter.
run("game.knitting.counts['cartographer-rubbing']=5;game.atlas.stash=Array.from({length:ATLAS.stashCap-1},()=>atlasMaps.create('roots_0',1,'normal',()=>0))");
const mapStock=json('({atlas:game.atlas,knitting:game.knitting,counter:itemIdCounter})');
assert.equal(run("knittingRewards.knit('cartographer-rubbing').ok"),false);
assert.deepEqual(json('({atlas:game.atlas,knitting:game.knitting,counter:itemIdCounter})'),mapStock);
run('game.atlas.stash=[]');
assert(run("knittingRewards.knit('cartographer-rubbing').ok"));
assert.equal(run('game.atlas.stash.length'),2);
assert(run("game.atlas.stash.every(m=>m.rarity==='rare')"));
for (const cls of ['warrior', 'wanderer', 'archer', 'occultist', 'alchemist', 'cleric']) for (const draw of [0, 0.25, 0.5, 0.75, 0.999999]) {
    run(`game.selectedClassId=${JSON.stringify(cls)};game.inventory=[];game.knitting.counts['buried-print']=6`);
    const made = json(`knittingRewards.knit('buried-print',()=>${draw})`);
    assert(made.ok, `buried-print ${cls} ${draw}: ${made.reason}`);
    assert.equal(run('game.inventory[0].stats.filter(s=>s.fossilExclusiveDrop).length'), 1, 'exactly the one promised fossil line');
}
// Refusals keep every material: full bag, woodsman lock, returns that would recurse, mint a jackpot or raise the grade.
run(`game.inventory=Array.from({length:getInventoryLimit(game)},()=>createItemFromBase(BASE_ITEM_DB.find(row=>row.id==='ruby_ring'),'rare',3));
    game.knitting.counts['buried-print']=6;`);

const stocked = json('({inventory:game.inventory,knitting:game.knitting,counter:itemIdCounter})');
assert.equal(json("knittingRewards.knit('buried-print')").ok, false);
assert.deepEqual(json('({inventory:game.inventory,knitting:game.knitting,counter:itemIdCounter})'), stocked, 'a full bag consumes no stock or item ids');
run("game.inventory=[];game.woodsmanBuildLock=true;game.knitting.counts['first-row']=4");
assert.equal(json("knittingRewards.knit('first-row')").ok, false);
run("game.woodsmanBuildLock=false;game.knitting.seen=['unravelled','clock-seam','last-hem'];game.knitting.counts.unravelled=3");
assert.equal(json("knittingRewards.knit('unravelled')").ok, false, 'returns cannot recurse or mint one-piece jackpots');
run("game.knitting.seen=['unravelled','twin-loop']");
assert.equal(json("knittingRewards.knit('unravelled')").ok, false, 'a grade-2 return never mints a grade-3 thread');
}

// Content uniques never leak through generic pools or forced-name rewards before their source is open.
{
    const contentUniques=json('UNIQUE_DB.filter(row=>row.contentUnlock)');
    for (const unique of contentUniques) {
        const named=JSON.stringify(unique.name), zone=JSON.stringify({...unique.dropOnly,floor:unique.dropOnly.minFloor||100});
        run('game=mergeDefaults({season:1,level:1})');
        assert.equal(run(`generateUniqueItem(30,null,${named},${zone})`),null,unique.name+' locked');
        run('game=mergeDefaults({season:40,level:100});game.contentProgression.unlocked=CONTENT_UNLOCK_CATALOG.map(row=>row.id)');
        assert.equal(run(`uniqueDropsInZone(UNIQUE_DB.find(row=>row.name===${named}),{type:'act',id:0})`),false);
        assert.equal(run(`uniqueDropsInZone(UNIQUE_DB.find(row=>row.name===${named}),${zone})`),true);
        assert.equal(run(`generateUniqueItem(30,null,${named},${zone}).name`),unique.name);
        assert.equal(run(`isUniqueEligibleForBlackMarket(UNIQUE_DB.find(row=>row.name===${named}))`),false);
    }
    run("game.knitting.seen=KNITTING.list.map(row=>row.id)");
    assert(run("knitting.yarnPool(game,'unravelled').every(row=>row.yarnOut!==false)"));
    for(let i=0;i<80;i++) {
        run("game.inventory=[];game.knitting.counts['buried-print']=6");
        assert(run("knittingRewards.knit('buried-print').ok"));
        assert(run("game.inventory[0].stats.filter(row=>row.fossilExclusiveDrop).length===1"));
        assert(run("equipmentCrafting.affixCounts(game.inventory[0]).prefix<=3 && equipmentCrafting.affixCounts(game.inventory[0]).suffix<=3"));
        run("game.inventory=[];game.knitting.counts['guardian-knot']=5");
        assert(run("knittingRewards.knit('guardian-knot').ok"));
        assert(run("game.inventory[0].stats.some(row=>itemInfluences.lineInfluence(row)==='guardian')"));
    }
}
// Real zone caps must allow the new content rewards; a forced named item at tier 30 cannot prove this.
{
    const originalRandom = Math.random;
    try {
        const observed = json(`(() => {
            game=mergeDefaults({season:40});
            game.contentProgression.unlocked=CONTENT_UNLOCK_CATALOG.map(row=>row.id);
            let seed=42022;
            Math.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
            const zones=[...[4,5,9,10].map(floor=>{game.labyrinthFloor=floor;return getZone(LABYRINTH_ZONE_ID)}),
                ...['trial_1','trial_2',METEOR_FALL_ZONE_ID,'beehive_run','grand_breach_run',OCEAN_ZONE_ID,
                    'colony_run',SKY_TOWER_ZONE_ID,BEYOND_BOUNDARY_ZONE_ID].map(id=>getZone(id))];
            return zones.map(zone=>{
                game.level=levelProgression.monsterLevel(zone,{isBoss:true});
                const names=new Set();
                for(let i=0;i<2048;i++) {
                    const item=generateRealmBossUniqueDrop(zone,{isBoss:true});
                    if(item) {
                        names.add(item.name);
                        // Boss item levels span two values; a one-level look-ahead roll is valid, an unreachable source range is not.
                        if(UNIQUE_DB.find(row=>row.name===item.name)?.contentUnlock && levelProgression.requirements(item).level>levelProgression.itemLevel(zone,{isBoss:true},()=>0.999)) {
                            throw Error(item.name+' requires a level above its source item-level range');
                        }
                    }
                }
                return {id:zone.id,floor:zone.floor,names:[...names]};
            });
        })()`);
        for(const name of json('UNIQUE_DB.filter(row=>row.contentUnlock).map(row=>row.name)')) {
            assert(observed.some(row=>row.names.includes(name)),name+' must be obtainable from an actual content boss');
        }
        assert(!observed[0].names.includes('미궁 수문장의 관'),'no crown before floor 5');
        assert(!observed[2].names.includes('층계참의 반지'),'no ring before floor 10');
        assert(!observed[4].names.includes('도전자의 증표'),'no challenger reward in first trial');
        assert(observed[5].names.includes('도전자의 증표'),'second trial can grant its early unique');
    } finally { Math.random = originalRandom; }
}
// Every first-loop act has a usable reward, including saves that previously queued hidden support rewards.
{
    const originalGetElement = runtime.document.getElementById;
    const rewardNodes = new Map(['reward-overlay','reward-kicker','reward-title','reward-body','reward-grid','reward-next'].map(id=>[id,runtime.document.createElement('div')]));
    runtime.document.getElementById=id=>rewardNodes.get(id)||originalGetElement(id);
    try {
    run('game=mergeDefaults({});game.level=30;game.maxZoneId=8;game.claimableActRewards=[1,5]');
    for(let id=0;id<10;id++) assert(run(`getActRewardChoices(${id}).some(choice=>isActRewardChoiceAvailable(choice))`),'act '+(id+1)+' has an available reward');
    assert.deepEqual(json('getAvailableActRewardZoneIds()'),[1,5]);
    assert(run('getActRewardChoices(1).some(choice=>choice.kind==="item")'));
    run('game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
    const selected = json('getActRewardChoices(1)[0]');
    const previewBase = json('buildActRewardPreviewItem(1,getActRewardChoices(1)[0])');
    run(`claimActRewardChoice(1,0,${JSON.stringify(encodeURIComponent(selected.claimKey))})`);
    assert(run('game.claimedActRewards.includes(1) && !game.claimableActRewards.includes(1)'));
    const granted = json('[...game.inventory,...Object.values(game.equipment)].find(item=>item?.slot==="투구")');
    assert.equal(granted.baseId,previewBase.baseId,'displayed reward base is actually granted');
    assert.deepEqual(granted.baseStats.map(({id,val})=>[id,val]),previewBase.baseStats.map(({id,val})=>[id,val]),'displayed base rolls do not change at claim time');
    const afterClaim=json('[game.inventory,game.equipment,game.currencies,game.passivePoints]');
    run('claimActRewardChoice(1,0)');
    assert.deepEqual(json('[game.inventory,game.equipment,game.currencies,game.passivePoints]'),afterClaim,'repeated claim grants nothing');
    const stale = json('getActRewardChoices(5)[0]');
    run("game.season=2;game.contentProgression.unlocked=['craft','support'];contentProgression.sync()");
    assert(run('getActRewardChoices(5).every(choice=>choice.kind==="support")'));
    run(`claimActRewardChoice(5,0,${JSON.stringify(encodeURIComponent(stale.claimKey))})`);
    assert(run('game.claimableActRewards.includes(5) && !game.claimedActRewards.includes(5)'),'stale button cannot grant a different reward');
    assert(!run('getAvailableActRewardZoneIds().includes(1)'),'support unlock cannot reopen a claimed fallback');
    const support = json('getActRewardChoices(5)[0]');
    run(`game.supports.push(${JSON.stringify(support.gem)})`);
    assert.notEqual(json('getActRewardChoices(5)[0]').desc,support.desc);
    run(`claimActRewardChoice(5,0,${JSON.stringify(encodeURIComponent(support.claimKey))})`);
    assert(run('game.claimedActRewards.includes(5)'),'description changes do not block the same reward claim');
    assert(run(`getActRewardConfig(1,{...game,season:1,contentProgression:{...game.contentProgression,unlocked:[],inherited:[],automatic:[]}}).choices.some(row=>row.kind==='item')`));
    assert(run("getActRewardConfig(1,game).choices.every(row=>row.kind==='support')"),'availability follows the supplied owner');
    } finally { runtime.document.getElementById=originalGetElement; }
}
// A paid boundary run must not be created while the loop gate refuses travel.
for (const gate of ['pendingLoopReady','pendingLoopDecision']) {
    run(`game=mergeDefaults({season:50,maxZoneId:29});game.beyondBoundary.unlocked=true;
        game.beyondBoundary.selectedIntensityId='etched';game.currencies.formlessDew=10;
        game.currentZoneId=29;game.${gate}=true;`);
    const beforeEntry=json('[game.currentZoneId,game.currencies,game.beyondBoundary]');
    run('enterBeyondBoundaryRun()');
    assert.deepEqual(json('[game.currentZoneId,game.currencies,game.beyondBoundary]'),beforeEntry,
        'a refused boundary entry keeps the wallet and run unchanged');
}
// Boundary encounters stay consecutive; the final payout respects the chosen completion action.
for (const [action,wave] of [['stop',5],['nextZone',5],['stop',1]]) {
    run(`game=mergeDefaults({season:50,maxZoneId:29});game.contentProgression.inherited.push('craft');
        game.beyondBoundary.unlocked=true;game.beyondBoundary.selectedRewardFocusId='currency';
        startBeyondBoundaryRun(1,game);game.beyondBoundary.activeRun.wave=${wave};
        game.currentZoneId=BEYOND_BOUNDARY_ZONE_ID;game.moveTimer=0;game.settings.mapCompleteAction='${action}';
        finishBeyondBoundaryEncounter(getZone(game.currentZoneId),'${action}',{say:addLog,unlocks:checkUnlocks,redraw:updateStaticUI});`);
    if (wave < 5) {
        assert.equal(run('game.beyondBoundary.activeRun.wave'),2,'a middle encounter advances the same paid run');
        assert.equal(run('game.currentZoneId'),run('BEYOND_BOUNDARY_ZONE_ID'));
        assert(run('!game.combatHalted && game.moveTimer>0'),'stop applies after the tier, not between its encounters');
        assert.deepEqual(json('[game.beyondBoundary.completions,game.currencies.magicBud,game.currencies.formlessDew]'),[0,0,0],
            'a middle encounter grants no final payout');
        continue;
    }
    assert.deepEqual(json('[game.beyondBoundary.activeRun,game.beyondBoundary.completions,game.beyondBoundary.bestTier,game.beyondBoundary.highestTier]'),
        [null,1,1,2],'the final encounter commits one completed tier');
    assert.deepEqual(json('[game.beyondBoundary.seals.edge,game.currencies.magicBud,game.currencies.formlessDew]'),
        [{level:1,xp:0},3,2],'both completion actions grant the same seal experience and focused reward');
    assert.equal(run('game.currentZoneId'),0,'a completed boundary run returns to its origin');
    if (action === 'stop') {
        assert(run('game.combatHalted && game.moveTimer===0'),'stop keeps the returned hero out of combat');
        assert.equal(run('actExplorationState.current(game)?.zoneId'),0,'a stopped return still prepares its destination room');
    } else assert(run('!game.combatHalted && game.moveTimer>0'),'normal completion resumes hunting at the return zone');
    const settled=json('[game.beyondBoundary,game.currencies]');
    run(`finishBeyondBoundaryEncounter(getZone(game.currentZoneId),'${action}',{say:addLog,unlocks:checkUnlocks,redraw:updateStaticUI})`);
    assert.deepEqual(json('[game.beyondBoundary,game.currencies]'),settled,'a completed tier cannot pay twice');
}
// Floor entry refusal must not change progress; a completion receipt is display-only.
for (const [prepare, floor] of [['game.maxZoneId=4;',5],['game.pendingLoopReady=true;',5],['',11],['',Infinity]]) {
    run(`game=mergeDefaults({season:6,maxZoneId:9,labyrinthFloor:3,labyrinthUnlockedMaxFloor:10});${prepare}`);
    const previous=json('[game.currentZoneId,game.labyrinthFloor,game.killsInZone,game.inTicketBossFight]');
    run(`enterLabyrinthFloor(${floor})`);
    assert.deepEqual(json('[game.currentZoneId,game.labyrinthFloor,game.killsInZone,game.inTicketBossFight]'),previous,'refused labyrinth entry preserves the active run');
}
run("game=mergeDefaults({season:6,maxZoneId:9,labyrinthFloor:8,labyrinthUnlockedMaxFloor:10,currencies:{fossil:3},labyrinthLastResult:{season:6,floor:7,currencies:{fossil:1}}})");
const labyrinthStored=json('[game.currencies,game.labyrinthLastResult]');
run('getLabyrinthZoneNow(5);game=mergeDefaults(JSON.parse(JSON.stringify(game)));');
assert.equal(run('game.labyrinthFloor'),8,'previewing another floor does not change the active floor');
assert.deepEqual(json('[game.currencies,game.labyrinthLastResult]'),labyrinthStored,'loading a floor receipt does not pay it again');
// A defeated training target cannot farm combat rewards or record the same measurement twice.
run("game=mergeDefaults({season:20,maxZoneId:9,selectedClassId:'warrior',loopStarterGemGranted:true});game.currentZoneId=WOODSMAN_ECHO_ZONE_ID;game.combatTimeMs=100000;Object.assign(game.woodsmanEchoRun,{active:true,timeLeft:20,lastTickAt:100000,returnZoneId:9});game.enemies=[dressWoodsmanEchoDummy(createEnemy(getZone(OUTSIDE_CHAOS_ZONE_ID),{at:0,count:1,boss:true},0))]");
const practiceOwned=json('[game.exp,game.loopKills,game.currencies,game.inventory,game.weaponMastery]');
run('game.enemies[0].hp=0;handleEnemyDeath(game.enemies[0],getPlayerStats())');
assert.deepEqual(json('[game.exp,game.loopKills,game.currencies,game.inventory,game.weaponMastery]'),practiceOwned,'a training target grants no kill rewards');
assert(run('game.records.echo.last.damage>0 && game.records.echo.runs===1'),'the final blow is measured once');
const practiceRecord=json('[game.currentZoneId,game.records.echo]');
run('finishWoodsmanEchoRun();game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.deepEqual(json('[game.currentZoneId,game.records.echo]'),practiceRecord,'repeated finish and restoration cannot duplicate a measurement');
run("game.currentZoneId=WOODSMAN_ECHO_ZONE_ID;game.settings.townReturnAction='stop';Object.assign(game.woodsmanEchoRun,{active:true,timeLeft:25,lastTickAt:getCombatTime(),returnZoneId:0});returnToTown();for(let i=0;i<30;i++)advanceTravelTick();finishWoodsmanEchoRun()");
assert(run('game.currentZoneId===0 && game.combatHalted && !game.woodsmanEchoRun.active'),'returning from practice cancels the measurement and stops in the original zone');
assert.deepEqual(json('game.records.echo'),practiceRecord[1],'cancelled practice cannot add a record');
// The last sky reward stops automatic practice; restoration keeps that stop and cannot repay the receipt.
run("game=mergeDefaults({season:20,maxZoneId:9,loopProgressCurrent:{chaos20Cleared:true},skyTower:{unlocked:true,loopSeason:20,currentFloor:1,highestFloor:1,clearedThisLoop:24,condensedPower:10}});game.currentZoneId=SKY_TOWER_ZONE_ID;game.settings.mapCompleteAction='nextZone';finishEncounterRun()");
assert(run('game.combatHalted && game.skyTower.condensedPower===13 && game.skyTower.lastResult.floor===1'),'the final sky reward is paid before the climb stops');
const skyFinished=json('game.skyTower');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));normalizeLocalRuntimeAfterLoad();ensureEncounterRun();reconcileMapProgressRuntimeState();for(let i=0;i<10;i++)coreLoop(getCombatTime()+100)');
assert(run('game.combatHalted'),'loading a completed sky allowance cannot restart an endless practice loop');
assert.deepEqual(json('game.skyTower'),skyFinished,'a sky receipt is restored without paying again');
run('game.skyTower.currentFloor=2;game.actExploration=null;finishEncounterRun()');
assert(run("game.loopProgressCurrent.bestSkyFloor===1 && game.skyTower.lastResult.kind==='practice' && game.skyTower.condensedPower===13"),'practice cannot advance this loop\'s sky record or grant essence');
// The first rune cannot disappear into bulk sealing while the player is learning to equip it.
run("game=mergeDefaults({skills:['기본 공격','이중 베기','서리바람 내지르기'],starterGemTutorialPending:'이중 베기',resonancePower:10});sealSkillGem('이중 베기');sealAllInactiveSkillGems()");
assert.deepEqual(json('[game.skills,game.sealedSkills,game.resonancePower]'),[['기본 공격','이중 베기'],['서리바람 내지르기'],11],'only an eligible spare rune can be sealed during the starter guide');
run("game=mergeDefaults({skills:['기본 공격'],sealedSkills:['이중 베기'],starterGemTutorialPending:'이중 베기',resonancePower:11,seenTutorials:['tutorial_starter_gem_equip'],gemData:{'이중 베기':{level:2,exp:17}}})");
assert(run("getStarterGemTutorialTarget()==='이중 베기' && game.resonancePower===10 && !game.sealedSkills.includes('이중 베기')"),'an old sealed guide target is restored without keeping its seal reward');
const starterRestored=json('[game.skills,game.sealedSkills,game.resonancePower,game.gemData]');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));tutorialQueue=[];contentUnlockUi.announceStarterGem(getStarterGemTutorialTarget())');
assert.deepEqual(json('[game.skills,game.sealedSkills,game.resonancePower,game.gemData]'),starterRestored,'reloading the repaired guide cannot charge resonance again or reset rune growth');
assert(run("tutorialQueue.some(row=>row.key==='tutorial_starter_gem_equip')"),'an unfinished equip guide resumes after loading');
run("equipSkippedStarterGem('tutorial_starter_gem_equip')");
assert(run("game.activeSkill==='이중 베기' && !game.starterGemTutorialPending"),'closing the resumed guide still equips its rune');
// A zero resonance capacity is a balance, not a missing default: one seal grants one, and restoration costs one.
for (const [type,name] of [['Skill','서리바람 내지르기'],['Support','가속']]) {
    run("game=mergeDefaults({skills:['기본 공격','서리바람 내지르기'],supports:['가속'],resonancePower:0,gemData:{'서리바람 내지르기':{level:7,exp:23}},supportGemData:{'가속':{level:6,exp:19,unlockedTier:2}}})");
    const runeGrowth=json('[game.gemData,game.supportGemData]');
    run(`seal${type}Gem('${name}');seal${type}Gem('${name}')`);
    assert.equal(run('game.resonancePower'),1,'sealing one rune cannot refill the starting capacity or pay twice');
    run(`game=mergeDefaults(JSON.parse(serializeSaveState(game)));unseal${type}Gem('${name}');unseal${type}Gem('${name}')`);
    assert.equal(run('game.resonancePower'),0,'restoring a rune spends exactly its one seal reward');
    assert.deepEqual(json('[game.gemData,game.supportGemData]'),runeGrowth,'sealing, reload and restoration preserve rune growth');
}
// New hive offers follow actual crafting access; an old promised offer is not rerolled here.
run('game=mergeDefaults({});game.season=8;contentProgression.sync()');
assert.deepEqual(json('getBeehiveRewardPool(1).map(row=>row.type)'),['pollen','beeswax']);
run(`contentProgression.purchase('craft')`);
assert(run("getBeehiveRewardPool(1).some(row=>row.type==='bundle') && !getBeehiveRewardPool(1).some(row=>row.type==='jewelShard')"),
    'basic crafting rewards can appear before fossil and jewel rewards');
run("contentProgression.purchase('fossil');contentProgression.purchase('fossilRestore');contentProgression.purchase('jewel')");
assert.equal(run('getBeehiveRewardPool(1).length'),8,'the existing full reward pool returns after the corresponding unlocks');
// A newly opened underground stone number grants its first usable copy once; claim flags survive loading and loops.
run('game=mergeDefaults({season:13,loopCount:12});grantUnderworldFloorMilestone(10,game.underworldProgress)');
assert.deepEqual(json('game.underworldRunes.obtainedRunes'),[1],'opening the first slot must also grant its first stone');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));grantUnderworldFloorMilestone(10,game.underworldProgress)');
assert.deepEqual(json('game.underworldRunes.obtainedRunes'),[1],'re-clearing after load cannot duplicate a milestone stone');
run('grantUnderworldFloorMilestone(20,game.underworldProgress)');
assert.deepEqual(json('game.underworldRunes.obtainedRunes'),[1,2],'the next milestone grants its newly opened number');
const milestoneRunes=json('game.underworldRunes');
run('triggerSeasonReset();grantUnderworldFloorMilestone(20,game.underworldProgress)');
assert.deepEqual(json('game.underworldRunes'),milestoneRunes,'a new loop keeps stones and cannot reclaim a permanent milestone');
run('game.currencies.runeShard=0;game.currencies.underGold=0;grantUnderworldFloorMilestone(310,game.underworldProgress)');
assert.deepEqual(json('[game.currencies.runeShard,game.currencies.underGold]'),[70,24],'deep floors keep their material rewards');
run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));grantUnderworldFloorMilestone(310,game.underworldProgress)');
assert.deepEqual(json('[game.currencies.runeShard,game.currencies.underGold]'),[70,24],'deep-floor material claims persist across loading');
// Durable guide notices survive both waiting and interrupted display; expiration is not acknowledgement.
{
    const originalGet = runtime.document.getElementById, originalCreate = runtime.document.createElement;
    const nodes = new Map(), created = [];
    function guideElement() {
        const node = originalCreate('div'), children = new Map();
        created.push(node);
        node.style.removeProperty = () => {}; node.style.setProperty = () => {}; node.style.getPropertyValue = () => '';
        node.getClientRects = () => []; node.focus = () => {};
        node.showModal = () => { node.open = true; }; node.close = () => { node.open = false; };
        node.querySelector = selector => {
            if (!children.has(selector)) children.set(selector, guideElement());
            return children.get(selector);
        };
        return node;
    }
    runtime.document.createElement = guideElement;
    runtime.document.getElementById = id => {
        if (!/^(tutorial-|tab-|btn-tab-)/.test(id) && !['chk-hide-act-journal','info-tooltip','item-tooltip-box'].includes(id)) return originalGet(id);
        if (!nodes.has(id)) { const node = guideElement(); node.id = id; nodes.set(id, node); }
        return nodes.get(id);
    };
    try {
        run("game=mergeDefaults({});discardQueuedNotices();setStartupOverlayActive(false);queueTutorialNotice('notice_history_test','보관 시험','안내 본문','tab-items')");
        assert.deepEqual(json('[game.tutorialHistory[0].status,game.seenTutorials.includes("notice_history_test")]'),['pending',false],'queueing is not reading or delivery');
        run("game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();queueTutorialNotice('notice_history_test','보관 시험','안내 본문','tab-items');tutorialActionUi.quietUntil=0;showNextTutorial()");
        assert(run("activeTutorial.key==='notice_history_test' && tutorialQueue.length===0 && game.tutorialHistory.length===1 && game.tutorialHistory[0].status==='displayed' && game.tutorialHistory[0].readAt===0"),'a pending save shows one card without marking it read');
        run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();tutorialActionUi.quietUntil=0;showNextTutorial()');
        assert(run("activeTutorial.key==='notice_history_test' && tutorialQueue.length===0"),'an interrupted displayed card is recovered exactly once');
        run('dismissTutorial(false);game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();tutorialActionUi.quietUntil=0;showNextTutorial()');
        assert(run("!activeTutorial && tutorialQueue.length===0 && game.tutorialHistory[0].status==='read'"),'an acknowledged card never repeats after reload');
        run("queueTutorialNotice('notice_history_timeout','놓친 시험','검색할 본문 <img src=x onerror=alert(1)>','tab-items');showNextTutorial();tutorialActionUi.noticeUntil=0;tutorialActionUi.expireNotice(Date.now());game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();tutorialActionUi.quietUntil=0;showNextTutorial()");
        assert(run("!activeTutorial && game.tutorialHistory.find(row=>row.key==='notice_history_timeout').status==='unread'"),'timeout remains unread in the archive without repeating automatically');
        run('window.GameModules.tutorialHistoryUi.open()');
        // The real renderer runs against a DOM boundary; stored markup must remain plain text.
        const archive = created.find(node => node.id === 'tutorial-history-dialog');
        assert(archive.querySelector('.tutorial-history-list').innerHTML.includes('&lt;img'),'untrusted guide text is escaped by the real archive renderer');
        archive.querySelector('#tutorial-history-query').value = '안내 본문';
        run('window.GameModules.tutorialHistoryUi.render()');
        assert(archive.querySelector('.tutorial-history-list').innerHTML.includes('보관 시험') && !archive.querySelector('.tutorial-history-list').innerHTML.includes('놓친 시험'),'search finds a previously acknowledged guide by its body');
        archive.querySelector('#tutorial-history-query').value = '';
        archive.querySelector('[data-history-unread]').checked = true;
        run('window.GameModules.tutorialHistoryUi.render()');
        assert(archive.querySelector('.tutorial-history-list').innerHTML.includes('놓친 시험') && !archive.querySelector('.tutorial-history-list').innerHTML.includes('보관 시험'),'missed guides can be isolated without replaying their original events');
        run("game=mergeDefaults({seenTutorials:['unlock_items']});discardQueuedNotices();queueTutorialNotice('unlock_items','옛 장비 안내','옛 본문','tab-items');window.GameModules.tutorialHistoryUi.open()");
        assert(run("tutorialQueue.length===0 && game.tutorialHistory.some(row=>row.key==='tutorial_first_gear'&&row.status==='read')"),'old seen flags remain consumed and known guidance can still be read');
        run("game=mergeDefaults({seenTutorials:['unlock_items','tutorial_first_gear','unlock_char','tutorial_first_passive']});discardQueuedNotices();window.GameModules.tutorialHistoryUi.open()");
        assert.deepEqual(json('game.tutorialHistory.map(row=>row.key).sort()'),['tutorial_first_gear','tutorial_first_passive'],'both old and new seen aliases produce one archive entry per guide');
        run("game=mergeDefaults({seenTutorials:['unlock_items'],tutorialHistory:[{key:'unlock_items',title:'예전',body:'이전 본문',status:'read'},{key:'tutorial_first_gear',title:'최신 안내',body:'최신 본문',status:'pending',queuedAt:100}]});discardQueuedNotices();window.GameModules.tutorialHistoryUi.open()");
        assert(run("game.tutorialHistory.length===1 && game.tutorialHistory[0].body==='최신 본문' && game.tutorialHistory[0].status==='pending' && tutorialQueue.length===1"),'legacy read aliases cannot replace a newer pending guide or its body');
        run("window.GameModules.state.tutorials.transition(game,'unlock_items','read');game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();window.GameModules.state.tutorials.sync(game)");
        assert(run("game.tutorialHistory.length===1 && game.tutorialHistory[0].status==='read' && tutorialQueue.length===0"),'acknowledging either alias consumes the canonical guide after reload');
        run("game=mergeDefaults({seenTutorials:['unlock_items'],tutorialHistory:[{key:'unlock_items',title:'예전',body:'이전 본문',status:'read'},{key:'tutorial_first_gear',title:'놓친 최신 안내',body:'유지할 본문',status:'unread',displayedAt:200}]});discardQueuedNotices();window.GameModules.tutorialHistoryUi.open()");
        assert(run("game.tutorialHistory.length===1 && game.tutorialHistory[0].body==='유지할 본문' && game.tutorialHistory[0].status==='unread'"),'a newer missed guide keeps its unread status when legacy aliases are restored');
        run("game=mergeDefaults({skills:['기본 공격','이중 베기'],starterGemTutorialPending:'이중 베기'});discardQueuedNotices();queueTutorialNotice('tutorial_starter_gem_equip','첫 룬','장착 안내','tab-skills');window.GameModules.tutorialHistoryUi.open()");
        const beforeReplay = json('[game.activeSkill,game.starterGemTutorialPending,game.skills,game.currencies,game.inventory]');
        run('window.GameModules.tutorialHistoryUi.reopenGuide(game.tutorialHistory[0]);tutorialActionUi.finish(false)');
        assert.deepEqual(json('[game.activeSkill,game.starterGemTutorialPending,game.skills,game.currencies,game.inventory]'),beforeReplay,'closing replay guidance cannot auto-equip the first rune or duplicate ownership');
        run("game=mergeDefaults({skills:['기본 공격','이중 베기'],starterGemTutorialPending:'이중 베기'});discardQueuedNotices();queueTutorialNotice('tutorial_starter_gem_equip','첫 룬','장착 안내','tab-skills');tutorialActionUi.quietUntil=0;showNextTutorial();dismissTutorial(true);window.GameModules.tutorialHistoryUi.open()");
        assert(run("game.activeSkill==='기본 공격' && game.starterGemTutorialPending==='이중 베기' && !tutorialActionUi.active"),'opening the archive during original guidance suspends it without the skip auto-equip');
        run("window.GameModules.state.tutorials.transition(game,'tutorial_starter_gem_equip','read');game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();window.GameModules.state.tutorials.sync(game)");
        assert(run("game.tutorialHistory[0].status==='read' && tutorialQueue.length===0 && game.starterGemTutorialPending==='이중 베기'"),'acknowledging the starter notice persists across reload without equipping or repeating');
        const beforeOpeningGet = runtime.document.getElementById, beforeOpeningInterval = runtime.setInterval;
        let openingTick;
        runtime.document.getElementById = id => id === 'battlefield-canvas' ? guideElement() : beforeOpeningGet(id);
        runtime.setInterval = callback => { openingTick = callback; return 0; };
        try { vm.runInContext(require('fs').readFileSync(require('path').join(__dirname, '../js/opening-journey-ui.js'), 'utf8'), runtime); }
        finally { runtime.document.getElementById = beforeOpeningGet; runtime.setInterval = beforeOpeningInterval; }
        run("game.seenTutorials.push('opening_intro','opening_rise','opening_move','opening_attack');game.settings.battleView='top';game.settings.autoMove=true");
        openingTick();
        assert(run("openingJourney.autoLocked() && !game.seenTutorials.includes('opening_done')"),'archive acknowledgement cannot finish the first-rune lesson while no rune is equipped');
        run("changeSkill('이중 베기')");
        openingTick();
        assert(run("game.activeSkill==='이중 베기' && !game.starterGemTutorialPending && !openingJourney.autoLocked()"),'actually equipping the first rune finishes the acknowledged lesson after reload');
        run("game=mergeDefaults({});discardQueuedNotices();game.stumpBox.acquired=true;stumpBox.grantStarter(game,getPlayerStats());queueTutorialNotice('unlock_stump_box','그루터기 함','씨앗 안내','tab-stump');window.GameModules.tutorialHistoryUi.open()");
        const beforeStumpReplay = json('game.stumpBox');
        run('window.GameModules.tutorialHistoryUi.reopenGuide(game.tutorialHistory[0]);tutorialActionUi.finish(false)');
        assert.deepEqual(json('game.stumpBox'),beforeStumpReplay,'replaying seed guidance cannot grant or plant starter rewards');
        run("game=mergeDefaults({tutorialHistory:[null,{key:'bad key',title:'x',body:'x'},{key:'notice_bad',title:'손상',body:'본문',status:'wrong',tabId:'javascript:alert(1)',queuedAt:Infinity},{key:'notice_dup',title:'x',body:'x',status:'pending'},{key:'notice_dup',title:'x',body:'x',status:'read'}]})");
        assert.deepEqual(json('game.tutorialHistory.map(row=>[row.key,row.status,row.tabId])'),[['notice_bad','unread',null],['notice_dup','read',null]],'corrupt states and duplicate records cannot force arbitrary navigation or repeat an acknowledged guide');
        run("game=mergeDefaults({tutorialHistory:Array.from({length:1800},(_,i)=>({key:'notice_'+i,title:'x'.repeat(400),body:'y'.repeat(7000),status:'pending'}))})");
        assert(run('game.tutorialHistory.length===320 && game.tutorialHistory.every(row=>row.title.length===180 && row.body.length===5000)'),'imported oversized histories have bounded record counts and text');
        run('game=mergeDefaults(JSON.parse(serializeSaveState(game)));discardQueuedNotices();window.GameModules.state.tutorials.sync(game)');
        assert(run('tutorialQueue.length===320 && new Set(tutorialQueue.map(row=>row.key)).size===320'),'bounded restored guides have no duplicate queue entries');
    } finally {
        runtime.document.getElementById = originalGet;
        runtime.document.createElement = originalCreate;
    }
}
console.log('smoke-content-progression passed');
