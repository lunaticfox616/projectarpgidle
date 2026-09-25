const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const r=buildGameRuntime(), run=code=>vm.runInContext(code,r);
const notices=[];r.showGameToast=message=>notices.push(message); // DOM notification boundary.
r.hideItemTooltip=()=>{}; r.updateStaticUI=()=>{}; // DOM boundaries; equipment and stat rules stay real.
const json=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game=JSON.parse(JSON.stringify(defaultGame)); game.level=100;
    game.actRewardBonuses=[{stat:'strength',value:52}];
    var weapon=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bloodletter_blade'),'normal',10);
    weapon.stats=[{id:'strength',val:20},{id:'gemLevel',val:3}];game.inventory=[weapon];`);
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),true);
assert.equal(run('equipItemById(weapon.id)'),true);
run('game.actRewardBonuses[0].value=32');
assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"),undefined,'equipped item can satisfy its own requirement');
assert.equal(run('getPlayerStats(false).strength'),52);
run('game.actRewardBonuses[0].value=31');
assert.ok(run("getPlayerStats(false).disabledEquipment['무기']"));
assert.equal(run('getPlayerStats(false).strength'),31,'inactive item contributes no strength');
assert.equal(run("getPlayerStatSourceItemEntries().some(([slot])=>slot==='무기')"),false,'independent gem sources exclude inactive items');
assert.equal(run("game.equipment['무기']===weapon"),true,'inactive gear stays owned and in its slot');
run('game.actRewardBonuses[0].value=32');
assert.equal(run('getPlayerStats(false).strength'),52,'condition recovery reactivates gear');
run('var liveState=game;window.game=game;combatEquipmentStats.inspect(weapon,"무기")');
assert.equal(run('game===liveState && window.game===liveState'),true,'isolated checks restore both runtime state references');
// One game tick shares build validation, but a level-up or equipment change inside it still re-validates.
assert.deepEqual(json(`combatEquipmentStats.withinTick(()=>{
    let seen=[];game.level=1;
    seen.push(!!combatEquipmentStats.evaluate(game).disabled['무기']);
    game.level=100;
    seen.push(!!combatEquipmentStats.evaluate(game).disabled['무기']);
    game.equipment['무기']=null;
    seen.push(combatEquipmentStats.activeEquipment(game)['무기']);
    game.equipment['무기']=weapon;
    seen.push(combatEquipmentStats.activeEquipment(game)['무기']===weapon);
    return seen;
})`),[true,false,null,true],'in-tick level and equipment changes are never served stale');
run('game.actRewardBonuses[0].value=31');
assert.ok(run("getPlayerStats(false).disabledEquipment['무기']"),'outside a tick every read re-validates in-place build edits');
run('game.actRewardBonuses[0].value=32');
run('game.equipment={...game.equipment};game.equipment["무기"]={...weapon}');
assert.equal(run('combatEquipmentStats.activeEquipment(game)["무기"]===game.equipment["무기"]'),true,'equivalent equipment replacement must not retain old item references');
run('game.equipment["무기"]={...weapon}');
assert.equal(run('combatEquipmentStats.activeEquipment(game)["무기"]===game.equipment["무기"]'),true,'equivalent slot replacement must not retain old item references');
run('game.equipment["무기"]=weapon');
run("unequipItem('무기')");
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false,'new equip cannot count its own strength');
const before=run('JSON.stringify(game.inventory)');
assert.equal(run('equipItemById(weapon.id)'),false);
assert.ok(notices.at(-1).includes('장착 실패'),'manual rejection presents a visible notification');
const noticeCount=notices.length;
assert.equal(run("equipItemById(weapon.id,'무기')"),false);
assert.equal(notices.length,noticeCount+1,'explicit-slot rejection uses the same notification path');
assert.equal(run('JSON.stringify(game.inventory)'),before,'rejected equip is atomic');
run("game.shrineBuff={stat:'strength',value:200,expiresAt:getCombatTime()+60000}");
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false,'temporary attributes cannot open an equipment gate');
run("game.actRewardBonuses[0].value=52;game.level=1");
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false);
run('weapon.inheritedLevelExempt=true');
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),true,'inherited gear exempts level only');
run('game.actRewardBonuses[0].value=0');
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false,'inheritance does not exempt attributes');
run(`var legacy=JSON.parse(JSON.stringify(defaultGame));
    legacy.equipment['무기']=JSON.parse(JSON.stringify(weapon));
    delete legacy.equipment['무기'].requirementsVersion;
    game=mergeDefaults(legacy);`);
assert.equal(run("game.equipment['무기'].legacyRequirementGrace"),true);
assert.equal(run("getPlayerStats(false).disabledEquipment['무기']"),undefined);
run("game=mergeDefaults(JSON.parse(JSON.stringify(game)));unequipItem('무기')");
assert.equal(run('game.inventory[0].legacyRequirementGrace'),undefined);
run('game=JSON.parse(JSON.stringify(defaultGame));game.level=100');
const penalties=json(`[5,10,20,40,80].map(gap=>({gap,xp:levelProgression.penalty(100,100-gap,'experience'),loot:levelProgression.penalty(100,100-gap,'loot')}))`);
assert.equal(penalties[0].xp,1);assert.equal(penalties[1].loot,1);
assert.ok(penalties[2].xp<penalties[2].loot);
assert.ok(penalties[3].loot*10<1,'40 levels down is inferior even with tenfold kills before base reward differences');
assert.equal(run("levelProgression.penalty(1,100,'loot')"),1,'higher enemies get no penalty and no level-gap jackpot');
run("var z={id:'audit',name:'검증 지역',type:'act',tier:10,areaLevel:37,ele:'phys'};var mob=createEnemy(z,{at:0,boss:true},0)");
assert.equal(run('mob.level'),39);
assert.equal(run('levelProgression.areaLevel(z)'),37);
const originalRandom=r.Math.random;
let loot;
try {r.Math.random=()=>.5;loot=json("generateEquipmentDrop(mob,{zone:z,slot:'무기'})");}
finally {r.Math.random=originalRandom;}
assert.equal(loot.itemLevel,39);assert.ok(loot.affixTierCap<=run('levelProgression.affixCap(39)'));
assert.equal(loot.requirementsVersion,1);
run('game.currentZoneId=1;game.level=5');
const xp=run('getEnemyExperienceReward({level:5}, {expGain:0})');
run('game.level=40');
assert.ok(run('getEnemyExperienceReward({level:5}, {expGain:0})')<xp*.1);
run('game.isBackgroundCalculation=true');
assert.equal(run('getEnemyExperienceReward({level:5}, {expGain:0})'),Math.floor(xp*Math.exp(-3)));
assert.deepEqual(json("levelProgression.filterCurrencyDrops([['coreKey',1],['trialKey3',1],['magicBud',1]],0)"),[['coreKey',1],['trialKey3',1]]);
assert.equal(run("levelProgression.requirements({baseId:'rusted_blade',slot:'무기'}).level"),1);
assert.deepEqual(json("levelProgression.requirements({baseId:'rusted_blade',slot:'무기'}).attributes"),{strength:0});
assert.equal(run('levelProgression.stampItem({itemLevel:Infinity,hiddenTier:3}).itemLevel'),9,'invalid saved item levels recover from existing provenance');
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    weapon=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bloodletter_blade'),'normal',10);
    weapon.stats=[{id:'strength',val:20}];game.equipment['무기']=weapon;
    game.actRewardBonuses=[{stat:'strength',value:52}];equipmentLoadoutRuntime.save(0,'요구조건',game);
    unequipItem('무기');game.actRewardBonuses[0].value=32;`);
const loadoutBefore=json('({equipment:game.equipment,inventory:game.inventory})');
assert.equal(run('equipmentLoadoutRuntime.apply(0,game).ok'),false,'preset cannot bootstrap its own missing attributes');
assert.deepEqual(json('({equipment:game.equipment,inventory:game.inventory})'),loadoutBefore);
run('game.actRewardBonuses[0].value=52');
assert.equal(run('equipmentLoadoutRuntime.apply(0,game).ok'),true);
run('game.actRewardBonuses[0].value=32');
assert.equal(run('equipmentLoadoutRuntime.apply(0,game).ok'),true,'already equipped preset may maintain itself');
run('game.actRewardBonuses[0].value=31;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.ok(run('getPlayerStats(false).disabledEquipment["무기"]'),'reload cannot grant legacy grace to newly created ineligible equipment');
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    game.actRewardBonuses=[{stat:'strength',value:32}];game.equipment['무기']=weapon;
    var helmet=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='bastion_helm'),'normal',8);
    game.equipment['투구']=helmet;`);
assert.equal(run('Object.keys(getPlayerStats(false).disabledEquipment).length'),0);
run('game.actRewardBonuses[0].value=31');
assert.deepEqual(json('Object.keys(getPlayerStats(false).disabledEquipment).sort()'),['무기','투구'].sort(),'removing an invalid strength source cascades to dependent gear');
run('game.actRewardBonuses[0].value=32');
assert.equal(run('Object.keys(getPlayerStats(false).disabledEquipment).length'),0,'restoring permanent attributes reactivates the complete valid setup');
run(`var belt=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='blood_girdle'),'normal',12);
    belt.rarity='unique';belt.uniqueEffectKey='extraFlaskUtilitySlots';belt.uniqueEffectParams={slots:2,chargeRatePct:20};
    game.equipment['허리띠']=belt;game.level=1;`);
assert.equal(run('getFlaskChargeRateBonusPct()'),0,'independent flask consumers also exclude ineligible gear');
run('game.level=100');
assert.equal(run('getFlaskChargeRateBonusPct()'),20);
for(const level of [9,10,19,20,49,50,99,100]) {
    assert.ok(run(`getExpReq(${level+1})>getExpReq(${level})`),'required experience must not fall at curve boundaries');
}
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    game.starWedge.constellationBuff={stat:'strength',val:52,permanent:false};`);
assert.equal(run('combatEquipmentStats.inspect(weapon,"무기").ok'),true,'observed constellation is a stable build choice within the loop');
run('game.starWedge.constellationBuff.val=51');
assert.equal(run('combatEquipmentStats.inspect(weapon,"무기").ok'),false,'re-observation invalidates cached attribute eligibility');
for (const [id, stat] of [['nova_rod','intelligence'], ['ember_wand','intelligence'],
    ['needle_recurve','dexterity'], ['seeker_railgun','dexterity']]) {
    const attributes = json(`levelProgression.requirements({baseId:'${id}',slot:'무기'}).attributes`);
    assert.ok(attributes[stat] > 0, `${id} must require ${stat}, independent of its display name`);
    assert.equal(attributes.strength, undefined);
}
for (const base of json("BASE_ITEM_DB.filter(base=>base.slot==='무기')")) {
    assert.ok(base.requirementWeights && Object.keys(base.requirementWeights).length, `${base.id} must explicitly declare attributes`);
    assert.ok(Object.entries(base.requirementWeights).every(([key, weight]) => ['strength','dexterity','intelligence'].includes(key) && weight > 0));
}
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    game.actRewardBonuses=[{stat:'strength',value:6},{stat:'intelligence',value:50}];
    var gloveBases=BASE_ITEM_DB.filter(b=>b.slot==='장갑'&&b.baseStats.some(s=>s.id==='armor'));
    var lowGlove=gloveBases.find(b=>b.reqTier<=2), highGlove=gloveBases.find(b=>b.reqTier>=7&&b.reqTier<=10);
    var leftGlove=createItemFromBase(lowGlove,'normal',1),rightGlove=createItemFromBase(lowGlove,'normal',1);
    var candidateGlove=createItemFromBase(highGlove,'normal',10);
    leftGlove.stats=[{id:'strength',val:30}];
    game.equipment['장갑1']=leftGlove;game.equipment['장갑2']=rightGlove;game.inventory=[candidateGlove];`);
assert.equal(run("combatEquipmentStats.inspect(candidateGlove,'장갑1').ok"),false);
assert.equal(run("combatEquipmentStats.inspect(candidateGlove,'장갑2').ok"),true);
assert.ok(!run('levelProgressionUi.item(candidateGlove,false)').includes('장착 요구:'),'an eligible right slot must not show a blanket failure');
assert.ok(run('levelProgressionUi.item(candidateGlove,false)').includes('오른쪽 장갑'),'identify the usable slot');
assert.equal(run("equipItemById(candidateGlove.id,'장갑1')"),false);
assert.equal(run("equipItemById(candidateGlove.id,'장갑2')"),true);
const simulation = require('./lib/level-progression-simulation').toString();
const bonusAt = (season, gap) => run(`levelProgression.loopExperienceMultiplier(${season},${100 + gap},100)`);
assert.equal(bonusAt(1,0),1);
assert.equal(bonusAt(10,0),1.45);
assert.equal(bonusAt(40,0),2.95);
assert.equal(bonusAt(41,0),3);
assert.equal(bonusAt(100,5),3);
assert.equal(bonusAt(100,10),1);
assert.ok(bonusAt(100,7)>1 && bonusAt(100,7)<3,'loop acceleration tapers continuously');
assert.equal(bonusAt(100,40),1,'overleveling cannot retain loop acceleration');
run('game.season=100;game.level=36;game.currentZoneId=10;game.isBackgroundCalculation=false');
const onlineXp=run('getEnemyExperienceReward({level:29},{expGain:100})');
assert.ok(onlineXp>run('getEnemyExperienceReward({level:29},{expGain:0})'),'equipment XP bonus still applies');
run('game.isBackgroundCalculation=true');
assert.equal(run('getEnemyExperienceReward({level:29},{expGain:100})'),onlineXp,'offline uses the same acceleration and penalty');
const firstLoop = json(`(${simulation})(1)`);
assert.equal(firstLoop[9].exit,19,'one seeded act traversal at the requested first-loop baseline');
for (const season of [10,50,100,1000]) {
    const rows = json(`(${simulation})(${season})`);
    assert.ok(rows.every(row => row.lootPercent >= 90), 'ordinary forward travel must not lose most loot just from loop XP acceleration');
    assert.ok(rows[9].exit > firstLoop[9].exit, 'later loops still accelerate leveling');
}
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    var remote=JSON.parse(JSON.stringify(game));remote.ascendClass='warrior';remote.ascendKeystones=['w3'];
    remote.passives=['preview'];remote.voidPassives={preview:{transcendent:{id:'thirdFinger',value:1}}};`);
assert.deepEqual(json("getEquipCandidateSlots({slot:'무기'},remote)"),['무기','방패'],'preset uses its owner for dual-wield slots');
assert.deepEqual(json("getEquipCandidateSlots({slot:'반지'},remote)"),['반지1','반지2','반지3'],'preset uses its owner for extra ring slots');
assert.deepEqual(json("getEquipCandidateSlots({slot:'무기'})"),['무기'],'remote inspection cannot grant the live player a slot');
assert.deepEqual(json("getEquipCandidateSlots({slot:'반지'})"),['반지1','반지2']);
run(`game.ascendClass='warrior';game.ascendKeystones=['w3'];
    var lowWeapon=BASE_ITEM_DB.find(base=>base.slot==='무기'&&base.reqTier===1);
    game.equipment['무기']=createItemFromBase(lowWeapon,'normal',1);
    game.equipment['방패']=createItemFromBase(lowWeapon,'normal',1);
    game.equipment['무기'].stats=[{id:'strength',val:10}];game.equipment['방패'].stats=[{id:'strength',val:10}];`);
assert.equal(run('getPlayerStats(false).requirementAttributes.strength'),20);
run("game.jewelSlots=[{uniqueId:'cbj_zubenubia_balance',cosmosKeystoneJewel:true,cosmosKeystone:'w6',stats:[]},{uniqueId:'cbj_zubenshamali_judgment',cosmosKeystoneJewel:true,cosmosKeystone:'w6',stats:[]}]");
assert.equal(run('getPlayerStats(false).requirementAttributes.strength'),30,'cosmos keystone immediately refreshes permanent requirement attributes');
run('game.jewelSlots=[]');
assert.equal(run('getPlayerStats(false).requirementAttributes.strength'),20,'removing a cosmos keystone cannot retain cached attributes');
const baseRequirements = json('BASE_ITEM_DB.map(base=>({base,req:levelProgression.requirements({baseId:base.id})}))');
for (const { base, req } of baseRequirements) {
    assert.ok(Object.values(req.attributes).every(value => Number.isInteger(value) && value >= 0 && value <= 140), base.id);
    if (['반지','목걸이','허리띠'].includes(base.slot)) assert.deepEqual(req.attributes, {}, base.id);
    if (base.reqTier === 20 && Object.keys(req.attributes).length === 1) assert.equal(Object.values(req.attributes)[0], 130, base.id);
}
for (const [id, expected] of [['hunter_axe',6],['war_helm',10],['bastion_helm',36],['bloodletter_blade',52],
    ['obsidian_helm',70],['executioner_blade',86],['dread_plate',102],['apocalypse_greatblade',130]]) {
    assert.equal(run(`levelProgression.requirements({baseId:'${id}'}).attributes.strength`), expected, id);
}
assert.deepEqual(json("levelProgression.requirements({baseId:'gen__armor_energyShield_t20_1'}).attributes"),{strength:92,intelligence:92});
assert.deepEqual(json("levelProgression.requirements({baseId:'tempestlord_lance'}).attributes"),{strength:78,dexterity:78});
assert.deepEqual(json("levelProgression.requirements({baseId:'cosmos_prism_lance'}).attributes"),{strength:84,dexterity:84});
assert.deepEqual(json("levelProgression.requirements({baseId:'rusted_blade',hiddenTier:20,itemLevel:100})"),{level:1,attributes:{strength:0}},'affix/drop tier never raises base requirements');
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;game.settings.autoEquipEmptySlots=false;
    var finalWeapon=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='apocalypse_greatblade'),'normal',20);
    finalWeapon.stats=[{id:'strength',val:20}];game.inventory=[finalWeapon];
    game.actRewardBonuses=[{stat:'strength',value:129}];`);
assert.equal(run('equipItemById(finalWeapon.id)'),false,'one point short cannot equip even with the candidate own strength');
run('game.actRewardBonuses[0].value=130');
assert.equal(run('equipItemById(finalWeapon.id)'),true,'exact final requirement can equip');
run('game.actRewardBonuses[0].value=110');
assert.equal(run('getPlayerStats(false).disabledEquipment["무기"]'),undefined,'equipped final weapon maintains itself');
run('game.actRewardBonuses[0].value=109;game=mergeDefaults(JSON.parse(JSON.stringify(game)))');
assert.ok(run('getPlayerStats(false).disabledEquipment["무기"]'),'saved gear uses new thresholds without a new grace exemption');
assert.equal(run('game.equipment["무기"].id'),run('finalWeapon.id'),'ineligible gear stays owned');
assert.equal(run('getPlayerStats(false).strength'),109,'inactive gear does not grant its own attributes');
// Delayed map rewards must use their origin for every roll, not the player's current map.
run(`game=mergeDefaults({});game.cosmosAtlas.activeChallenge={tier:80,galaxy:5};`);
const dropOrigins = [0, 'chaos_realm', 'underworld_core', 'cosmos_challenge'].map(id => r.getZone(id));
function sampleOriginDrops(zone, currentZoneId) {
    r.__dropOrigin = zone;
    run(`game.currentZoneId=${JSON.stringify(currentZoneId)};window.game=game;`);
    const savedRandom = r.Math.random;
    let seed = 1309;
    r.Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    try {
        return json(`Array.from({length:400},()=>{
            const item=generateEquipmentDrop({isBoss:true},{zone:__dropOrigin});
            return {name:item.name,baseId:item.baseId,rarity:item.rarity,itemLevel:item.itemLevel,
                stats:item.stats,baseStats:item.baseStats,requirements:levelProgression.requirements(item)};
        })`);
    } finally { r.Math.random = savedRandom; }
}
for (const zone of dropOrigins) {
    const local = sampleOriginDrops(zone, zone.id);
    const away = sampleOriginDrops(zone, zone.id === 0 ? 'cosmos_challenge' : 0);
    assert.deepEqual(away, local, `${zone.type}: travelling before reward must not change bases, uniques, levels or rolls`);
    assert(local.some(item => item.rarity === 'unique'), 'the origin comparison must exercise unique generation');
    assert(local.some(item => item.rarity !== 'unique'), 'the origin comparison must exercise ordinary bases');
}
console.log('smoke-level-progression passed');
