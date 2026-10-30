const assert=require('node:assert/strict');
const vm=require('node:vm');
const {buildGameRuntime}=require('./lib/game-runtime');
const r=buildGameRuntime(), run=code=>vm.runInContext(code,r);
const notices=[];r.showGameToast=message=>notices.push(message); // DOM notification boundary.
r.hideItemTooltip=()=>{}; r.updateStaticUI=()=>{}; // DOM boundaries; equipment and stat rules stay real.
const json=code=>JSON.parse(run(`JSON.stringify(${code})`));
run(`game=JSON.parse(JSON.stringify(defaultGame)); game.level=100;
    game.actRewardBonuses=[{stat:'strength',value:52}];
    var weapon=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='warden_greatsword'),'normal',10);
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
run("game.actRewardBonuses[0].value=52;game.level=1");
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false);
run('weapon.loopSealed=true');
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false,'sealed gear keeps its level requirement');
run('game.level=100');
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),true);
run('game.actRewardBonuses[0].value=0');
assert.equal(run("combatEquipmentStats.inspect(weapon,'무기').ok"),false,'sealed gear keeps its attribute requirement');
run('delete weapon.loopSealed;game.level=1');
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
// A boss's equipment rolls area +3~4 (roll .5 → +4), above its own monster level of area +2.
assert.equal(loot.itemLevel,41);assert.ok(loot.affixTierCap<=run('levelProgression.affixCap(41)'));
assert.equal(loot.requirementsVersion,1);
run('game.currentZoneId=1;game.level=5');
const xp=run('getEnemyExperienceReward({level:5}, {expGain:0})');
run('game.level=40');
assert.ok(run('getEnemyExperienceReward({level:5}, {expGain:0})')<xp*.1);
run('game.isBackgroundCalculation=true');
assert.equal(run('getEnemyExperienceReward({level:5}, {expGain:0})'),Math.floor(xp*Math.exp(-3)));
assert.deepEqual(json("levelProgression.filterCurrencyDrops([['coreKey',1],['trialKey3',1],['magicBud',1]],0)"),[['coreKey',1],['trialKey3',1]]);
assert.equal(run("levelProgression.requirements({baseId:'rusted_blade',slot:'무기'}).level"),1);
assert.deepEqual(json("levelProgression.requirements({baseId:'rusted_blade',slot:'무기'}).attributes"),{strength:0,dexterity:0},'scimitars ask for strength and dexterity');
assert.equal(run('levelProgression.stampItem({itemLevel:Infinity,hiddenTier:3}).itemLevel'),9,'invalid saved item levels recover from existing provenance');
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    weapon=createItemFromBase(BASE_ITEM_DB.find(b=>b.id==='warden_greatsword'),'normal',10);
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
    belt.rarity='unique';belt.uniqueEffectKey='thousandBottles';game.level=1;`);
const damageWithBelt=worn=>run(`game.equipment['허리띠']=${worn?'belt':'null'};getPlayerStats(false).damageIncreasePct`);
assert.equal(damageWithBelt(true),damageWithBelt(false),'an ineligible unique belt grants no unique effect');
run('game.level=100');
assert.equal(damageWithBelt(true)-damageWithBelt(false),10,'천 개의 유리병 adds its damage once eligible');
for(const level of [9,10,19,20,49,50,99,100]) {
    assert.ok(run(`getExpReq(${level+1})>getExpReq(${level})`),'required experience must not fall at curve boundaries');
}
run(`game=JSON.parse(JSON.stringify(defaultGame));game.level=100;
    game.meteorSite.constellationBuff={stat:'strength',val:52,permanent:false};`);
assert.equal(run('combatEquipmentStats.inspect(weapon,"무기").ok'),true,'observed constellation is a stable build choice within the loop');
run('game.meteorSite.constellationBuff.val=51');
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
// The twin cosmos jewels grant their keystone from equipment sockets (2026-09-30: jewels live only in sockets).
run(`for (const slot of ['목걸이', '허리띠']) {
        const item = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === slot), 'normal', 1);
        item.baseStats = []; item.stats = []; game.equipment[slot] = item;
    }
    game.equipment['목걸이'].voidSocket = { open: true, jewel: { uniqueId: 'cbj_zubenubia_balance', cosmosKeystoneJewel: true, cosmosKeystone: 'w6', stats: [] } };
    game.equipment['허리띠'].voidSocket = { open: true, jewel: { uniqueId: 'cbj_zubenshamali_judgment', cosmosKeystoneJewel: true, cosmosKeystone: 'w6', stats: [] } };`);
assert.equal(run('getPlayerStats(false).requirementAttributes.strength'),30,'cosmos keystone immediately refreshes permanent requirement attributes');
run("game.equipment['목걸이'].voidSocket.jewel=null");
assert.equal(run('getPlayerStats(false).requirementAttributes.strength'),20,'removing a cosmos keystone cannot retain cached attributes');
const baseRequirements = json('BASE_ITEM_DB.map(base=>({base,req:levelProgression.requirements({baseId:base.id})}))');
for (const { base, req } of baseRequirements) {
    assert.ok(Object.values(req.attributes).every(value => Number.isInteger(value) && value >= 0 && value <= 140), base.id);
    if (['반지','목걸이','허리띠'].includes(base.slot)) assert.deepEqual(req.attributes, {}, base.id);
    if (base.reqTier === 20 && Object.keys(req.attributes).length === 1) assert.equal(Object.values(req.attributes)[0], 130, base.id);
}
assert.deepEqual(json("levelProgression.requirements({baseId:'bloodletter_blade'}).attributes"),{strength:31,dexterity:31});
for (const [id, expected] of [['hunter_axe',4],['war_helm',10],['bastion_helm',36],['warden_greatsword',52],
    ['obsidian_helm',70],['executioner_blade',86],['dread_plate',102],['apocalypse_greatblade',130]]) {
    assert.equal(run(`levelProgression.requirements({baseId:'${id}'}).attributes.strength`), expected, id);
}
assert.deepEqual(json("levelProgression.requirements({baseId:'gen__armor_energyShield_t20_1'}).attributes"),{strength:92,intelligence:92});
assert.deepEqual(json("levelProgression.requirements({baseId:'tempestlord_lance'}).attributes"),{strength:78,dexterity:78});
assert.deepEqual(json("levelProgression.requirements({baseId:'cosmos_prism_lance'}).attributes"),{strength:84,dexterity:84});
assert.deepEqual(json("levelProgression.requirements({baseId:'rusted_blade',hiddenTier:20,itemLevel:100})"),{level:1,attributes:{strength:0,dexterity:0}},'affix/drop tier never raises base requirements');
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
// The first act gives exactly the previewed gear and cannot destroy a chosen reward through loot filters.
for (const classId of json('Object.keys(HANA_WEAPON_COMBOS.classWeapons)')) {
    for (const choiceIndex of [0, 1, 2]) {
        run(`game=mergeDefaults({selectedClassId:${JSON.stringify(classId)}});grantClassStarterWeapon(game.selectedClassId);
            var firstChoice=getActRewardChoices(0)[${choiceIndex}], beforeReward=JSON.stringify(game.equipment);
            var firstPreview=buildActRewardPreviewItem(0,firstChoice);`);
        assert.deepEqual(json('equipmentCrafting.affixCounts(firstPreview)'), { prefix: 1, suffix: 1, special: 0 },
            `${classId}: first-act reward ${choiceIndex} obeys ordinary magic affix limits`);
        assert(run('firstPreview.stats.every(stat=>!!findStoredEquipmentAffix(firstPreview,stat))'), 'every guaranteed option belongs on its base');
        if (choiceIndex === 1) {
            run("var previewChange=previewBuildStats(copy=>{copy.equipment['무기']=firstPreview;});");
            assert(run('previewChange.dps[1]>previewChange.dps[0]'), `${classId}: first weapon improves the starter`);
        }
        if (choiceIndex === 2) assert(run("firstPreview.stats.some(stat=>stat.id==='move' && stat.val>0)"), `${classId}: boots improve movement`);
        assert.equal(run('JSON.stringify(game.equipment)'),run('beforeReward'),'preview does not change live gear');
        run(`game.settings.autoSalvageEnabled=true;game.settings.autoSalvageRarities.magic=true;
            game.settings.autoEquipEmptySlots=false;grantActRewardEntry(0,firstChoice);`);
        assert.equal(run('game.inventory.length'),1,'chosen reward survives auto salvage');
        const values = '.map(({id,val,tier})=>({id,val,tier}))';
        assert.deepEqual(json('game.inventory[0].baseStats'+values),json('firstPreview.baseStats'+values));
        assert.deepEqual(json('game.inventory[0].stats'+values),json('firstPreview.stats'+values),'actual affixes equal preview');
    }
}
run('game.season=2;game.loopCount=1');
assert.equal(run('getActRewardChoices(0)[1].fixedStarter'),undefined,'later loops keep random act rewards');
// A guaranteed sea gift must keep both the gear and fish when its free removal has no separate line.
run(`game=mergeDefaults({});game.level=100;
    var seaWeapon=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='warden_greatsword'),'rare',100);
    seaWeapon.stats=['flatDmg','pctDmg','aspd','strength','intelligence']
        .map(id=>rollAffixValue(MOD_DB.find(mod=>mod.id===id),getItemCraftTier(seaWeapon)));
    seaWeapon.stats.forEach((stat,index)=>{if(index!==2)stat.lockedByHoney=true});
    game.inventory=[seaWeapon];
    var seaState=ensureOceanState();seaState.unlocked=true;
    seaState.fishStock.kingLeviathan=1;seaState.fishStock.abyssAngler=3;
    var seaBefore=JSON.stringify({stats:seaWeapon.stats,fish:seaState.fishStock});`);
assert.equal(run("getSeaGiftRecipeStatus('leviathanRemnant',seaWeapon,'속도/치명').ready"),false,
    'a remnant with no add or separate removal route is blocked before crafting');
assert.equal(run("craftSeaGift('leviathanRemnant',seaWeapon,{category:'속도/치명'})"),false,
    'the remnant needs a different removable line after replacing its chosen option');
assert.equal(run('JSON.stringify({stats:seaWeapon.stats,fish:seaState.fishStock})'),run('seaBefore'),
    'failed remnant craft preserves the item and fish');
run(`seaWeapon.stats=['flatDmg','pctDmg','flatHp','aspd','strength','intelligence']
        .map(id=>rollAffixValue(MOD_DB.find(mod=>mod.id===id),getItemCraftTier(seaWeapon)));
    seaWeapon.stats.slice(3).forEach(stat=>{stat.lockedByHoney=true});
    seaState.fishStock.prismaticHorror=3;seaState.fishStock.glowfinTrout=4;
    var sealBefore=JSON.stringify({stats:seaWeapon.stats,fish:seaState.fishStock});`);
assert.equal(run("getSeaGiftRecipeStatus('doubleSealForge',seaWeapon,'속도/치명').ready"),false,
    'a category without room for the third line is blocked before double sealing');
assert.equal(run("getSeaGiftRecipeStatus('doubleSealForge',seaWeapon,'공격').ready"),true,
    'the first fitting category remains selectable');
assert.equal(run("craftSeaGift('doubleSealForge',seaWeapon,{category:'속도/치명'})"),false);
assert.equal(run('JSON.stringify({stats:seaWeapon.stats,fish:seaState.fishStock})'),run('sealBefore'),
    'blocked double seal keeps both the original affixes and fish');
assert.equal(run("craftSeaGift('doubleSealForge',seaWeapon,{category:'공격'})"),true);
assert.equal(run('seaWeapon.stats[0].lockedByHoney && seaWeapon.stats[1].lockedByHoney'),true);
assert.equal(run("getModCategory(seaWeapon.stats[2])"),'공격');
// Safe reroll cannot erase a compound side stat when its primary roll improves.
run(`game=mergeDefaults({});game.level=100;
    var compoundWeapon=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='warden_greatsword'),'rare',100);
    compoundWeapon.stats=[rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id==='compoundWeaponDmg'),6,6),
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id==='aspd'),5,5)];
    compoundWeapon.stats[0].val=compoundWeapon.stats[0].valMin;
    compoundWeapon.stats[0].extraStats[0].val=compoundWeapon.stats[0].extraStats[0].valMax;
    game.inventory=[compoundWeapon];
    var compoundFish=ensureOceanState();compoundFish.unlocked=true;
    compoundFish.fishStock.glowfinTrout=3;compoundFish.fishStock.shallowSilverfin=4;
    var compoundBefore=JSON.stringify(compoundWeapon.stats[0]);`);
assert.equal(run('getSeaGiftRerollRows(compoundWeapon)[0].mod.id'),'compoundWeaponDmg');
let seaRollIndex=0;
try {
    const draws=[0,0,.99,0];
    r.Math.random=()=>draws[Math.min(seaRollIndex++,draws.length-1)];
    assert.equal(run("craftSeaGift('safeReroll',compoundWeapon)"),true);
} finally { r.Math.random=originalRandom; }
assert.equal(run('compoundWeapon.stats[0].val'),run('JSON.parse(compoundBefore).val'));
assert.equal(run('compoundWeapon.stats[0].extraStats[0].val'),run('JSON.parse(compoundBefore).extraStats[0].val'));
assert.equal(run('compoundFish.fishStock.glowfinTrout'),0,'a declined roll preserves the whole line and charges its listed fish');
run(`compoundWeapon.stats[0].val=18;compoundWeapon.stats[0].extraStats[0].val=9.11;
    compoundFish.fishStock.voidLeviathanSpawn=1;compoundFish.fishStock.abyssAngler=3;`);
try { r.Math.random=()=>0;assert.equal(run("craftSeaGift('echoMod',compoundWeapon)"),true); }
finally { r.Math.random=originalRandom; }
assert.deepEqual(json('({main:compoundWeapon.stats[1].val,extra:compoundWeapon.stats[1].extraStats[0].val,kind:compoundWeapon.stats[1].echoKind})'),
    {main:9,extra:4.555,kind:'prefix'},'echo halves every part of a compound line without losing its affix kind');
assert.deepEqual(json('({main:[compoundWeapon.stats[1].valMin,compoundWeapon.stats[1].valMax],extra:[compoundWeapon.stats[1].extraStats[0].valMin,compoundWeapon.stats[1].extraStats[0].valMax]})'),
    {main:[8,9.5],extra:[4.5,5]},'echo halves primary and side-stat ranges with decimal precision');   // side stat 9 to 10: whole steps since 2026-10-27
assert.equal(run('normalizeItem(JSON.parse(JSON.stringify(compoundWeapon))).stats[1].extraStats[0].val'),4.555,
    'save normalization preserves the echoed side stat');
run(`game=mergeDefaults({});game.level=100;
    var benchWeapon=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='warden_greatsword'),'rare',100);
    benchWeapon.stats=[rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id==='aspd'),4,4)];game.inventory=[benchWeapon];
    var benchFish=ensureOceanState();benchFish.unlocked=true;
    benchFish.fishStock.prismaticHorror=2;benchFish.fishStock.tidelordKoi=1;benchFish.fishStock.abyssAngler=5;
    benchFish.fishStock.voidLeviathanSpawn=1;`);
assert.equal(run("craftSeaGift('crushDepthScar',benchWeapon,{optionId:'oceanBossSlayer'})"),true);
const benchSource=json('benchWeapon.stats.find(stat=>stat.oceanBenchOptionId)');
assert.equal(benchSource.valMin,18,'bench crafting retains its authored minimum instead of an ordinary mod range');
assert.equal(benchSource.valMax,28,'bench crafting retains its authored maximum');
assert.ok(benchSource.val>=18 && benchSource.val<=28);
try { r.Math.random=()=>0;assert.equal(run("craftSeaGift('echoMod',benchWeapon)"),true); }
finally { r.Math.random=originalRandom; }
const benchEcho=json('benchWeapon.stats.find(stat=>stat.isEchoMod)');
for (const key of ['val','valMin','valMax']) {
    assert.equal(benchEcho[key],Number((benchSource[key]/2).toFixed(3)),`bench echo keeps exactly half of ${key}`);
}
const restoredBench=json('normalizeItem(JSON.parse(JSON.stringify(benchWeapon)))');
for (const key of ['val','valMin','valMax']) {
    assert.equal(restoredBench.stats.find(stat=>stat.oceanBenchOptionId)[key],benchSource[key],`saved bench ${key} stays authored`);
    assert.equal(restoredBench.stats.find(stat=>stat.isEchoMod)[key],benchEcho[key],`saved bench echo ${key} stays halved`);
}
assert.equal(run('benchWeapon.stats.filter(stat=>stat.oceanBenchOptionId).length'),1,'the original alone owns the bench option');
assert.equal(run('benchWeapon.stats.find(stat=>stat.isEchoMod).echoKind'),'special');
assert.equal(run('getSeaGiftBenchSlot(benchWeapon)'),1,'later bench crafts still target the original line');
assert.equal(run("equipmentCrafting.storedAffixKind(benchWeapon,{...benchWeapon.stats[0],echoKind:'broken',oceanBenchOptionId:'oceanBossSlayer'})"),'special',
    'a corrupt echo kind falls back to legacy special provenance');
assert.equal(run("getSeaGiftBenchSlot({...benchWeapon,stats:[{...benchWeapon.stats[0],oceanBenchOptionId:'oceanBossSlayer'},benchWeapon.stats[1]]})"),1,
    'a saved old echo cannot impersonate its source bench slot');
assert.equal(run('normalizeItem(JSON.parse(JSON.stringify(benchWeapon))).stats[0].echoKind'),'special',
    'save normalization retains the echo affix kind');
assert.equal(run('getSeaGiftRerollRows(benchWeapon).length'),0,'bench and echo lines cannot turn into ordinary affixes on reroll');
run(`game=mergeDefaults({});game.level=100;
    var fossilWeapon=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='warden_greatsword'),'rare',100);
    fossilWeapon.stats=[rollAffixValueInTierRange(FOSSIL_EXCLUSIVE_MODS.find(mod=>mod.id==='fossilVoidHeart'),6,6),
        rollAffixValueInTierRange(MOD_DB.find(mod=>mod.id==='flatDmg'),5,5)];
    fossilWeapon.stats[0].fossilExclusiveDrop=true;
    var oldNormal={...fossilWeapon.stats[1],affixBalanceVersion:1};
    game.inventory=[fossilWeapon];
    var fossilFish=ensureOceanState();fossilFish.unlocked=true;
    fossilFish.fishStock.voidLeviathanSpawn=1;fossilFish.fishStock.abyssAngler=3;`);
const fossilSource=json('fossilWeapon.stats[0]');
try { r.Math.random=()=>0;assert.equal(run("craftSeaGift('echoMod',fossilWeapon)"),true); }
finally { r.Math.random=originalRandom; }
const fossilEcho=json('fossilWeapon.stats.find(stat=>stat.isEchoMod)');
const restoredFossil=json('normalizeItem(JSON.parse(JSON.stringify(fossilWeapon)))');
for (const key of ['val','valMin','valMax']) {
    const half=Number((fossilSource[key]/2).toFixed(3));
    assert.equal(fossilEcho[key],half,`fossil echo keeps exactly half of ${key}`);
    assert.equal(restoredFossil.stats.find(stat=>stat.isEchoMod)[key],half,`saved fossil echo ${key} stays halved`);
}
assert.equal(fossilEcho.echoKind,'special');
assert.equal(run('fossilWeapon.stats[0].val'),fossilSource.val,'echo crafting does not alter the fossil source');
assert.equal(run('normalizeItem({...fossilWeapon,stats:[oldNormal]}).stats[0].affixBalanceVersion'),2,
    'ordinary legacy affixes still take the normal balance migration');
run(`game=mergeDefaults({});game.level=100;
    var fullSeaHood=createItemFromBase(BASE_ITEM_DB.find(base=>base.id==='cloth_hood'),'rare',100);
    fullSeaHood.stats=['aoePctDmg','flatHp','energyShield','strength','dexterity','intelligence']
        .map(id=>rollAffixValue(MOD_DB.find(mod=>mod.id===id),getItemCraftTier(fullSeaHood)));
    fullSeaHood.stats.slice(1).forEach(stat=>{stat.lockedByHoney=true});game.inventory=[fullSeaHood];
    var fullSeaFish=ensureOceanState();fullSeaFish.unlocked=true;
    fullSeaFish.fishStock.abyssAngler=4;fullSeaFish.fishStock.tidalEel=3;
    fullSeaFish.fishStock.glowfinTrout=3;fullSeaFish.fishStock.voidLeviathanSpawn=2;
    var fullSeaBefore=JSON.stringify({stats:fullSeaHood.stats,fish:fullSeaFish.fishStock});`);
assert.equal(run("getSeaGiftRecipeStatus('abyssalGift',fullSeaHood).ready"),false);
assert.equal(run("getSeaGiftRecipeStatus('leviathanBoon',fullSeaHood,'저항').ready"),false);
assert.equal(run("getSeaGiftRecipeStatus('categoryShift',fullSeaHood,'저항').ready"),false);
assert.equal(run("craftSeaGift('abyssalGift',fullSeaHood)"),false);
assert.equal(run("craftSeaGift('categoryShift',fullSeaHood,{category:'저항'})"),false);
assert.equal(run('JSON.stringify({stats:fullSeaHood.stats,fish:fullSeaFish.fishStock})'),run('fullSeaBefore'),
    'unplaceable guaranteed or conversion recipes keep all lines and fish');
run(`game=mergeDefaults({});var batchSea=ensureOceanState();batchSea.unlocked=true;
    batchSea.fishStock.shallowSilverfin=35;batchSea.fishCaughtTotal.shallowSilverfin=35;
    batchSea.fishStock.tidalEel=6;batchSea.fishCaughtTotal.tidalEel=6;`);
assert.equal(run("craftSeaGift('reefBundle',null,{count:5})"),true);
assert.equal(run('game.ocean.fishStock.shallowSilverfin'),10,'five crafts consume the full fivefold fish cost');
assert.equal(run('game.currencies.reefFragment'),10,'five crafts grant exactly five recipes of currency');
const batchSeaBefore=run('JSON.stringify([game.ocean,game.currencies,game.inventory,game.equipment])');
assert.equal(run("craftSeaGift('reefBundle',null,{count:3})"),false,'an unfunded batch cannot partially execute');
assert.equal(run('JSON.stringify([game.ocean,game.currencies,game.inventory,game.equipment])'),batchSeaBefore);
const batchCurrencyTotal=()=>run('Object.values(game.currencies).reduce((sum,n)=>sum+n,0)');
const batchTotalBefore=batchCurrencyTotal();
assert.equal(run("craftSeaGift('tidalFortune',null,{count:2})"),true);
assert.equal(batchCurrencyTotal()-batchTotalBefore,2,'a random-currency batch preserves its number of individual rewards');
assert.equal(run('game.ocean.fishStock.shallowSilverfin'),4);
assert.equal(run('game.ocean.fishStock.tidalEel'),0);
assert.equal(run('game.ocean.fishCaughtTotal.shallowSilverfin'),35,'spending fish preserves discovery history');
console.log('smoke-level-progression passed');
