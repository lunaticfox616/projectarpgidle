// Evaluation fixture, not a player save: reachable level/loop, actual rolls and actual allocation/equip boundaries.
// No synthetic damage, attributes, invalid passives, unique effects or free crafting modifiers.
function journeyBuildScore(rows) {
    const weights = {flatDmg:3,weaponPhysFlatDmg:3,weaponFlatDmgPct:2,pctDmg:1,attackPctDmg:1,
        physPctDmg:1,meleePctDmg:1,aspd:3,crit:1,critDmg:0.4,flatHp:0.6,pctHp:3,
        armor:0.025,dr:4,resAll:3,resF:1,resC:1,resL:1,resChaos:1,regen:15,leech:20,accuracy:0.05};
    return rows.reduce((sum,row)=>sum+(weights[row.stat || row.id] || 0)*Number(row.val ?? row.base ?? 0),0);
}
function allocateJourneyCombatNodes() {
    const allocated=[];
    while(game.passivePoints>0) {
        let best={id:null,score:0};
        for(const node of Object.values(PASSIVE_TREE.nodes)) {
            const path=getPassiveActivationPath(node.id);
            if(!path.length||path.length>game.passivePoints||getPassiveKeystoneConflict(path))continue;
            if(path.some(id=>['keystone','star_option'].includes(PASSIVE_TREE.nodes[id].kind)))continue;
            const effects=path.flatMap(id=>getPassiveNodeRawEffects(PASSIVE_TREE.nodes[id]));
            const score=journeyBuildScore(effects)/path.length;
            if(score>best.score)best={id:node.id,score};
        }
        if(!best.id)break;
        const result=activatePassivePath(best.id,{forcePulseNodeId:''});
        if(!result.activated)throw new Error('Combat passive path failed');
        allocated.push(...result.path);
    }
    return allocated;
}
function equipJourneyCandidate(slot,tier) {
    if(!getEquipCandidateSlots({slot:slot.replace(/[123]$/,'')}).includes(slot))return {slot,locked:true};
    const candidates=Array.from({length:40},()=>{
        const base=chooseItemBase(slot.replace(/[123]$/,''),tier,{type:'abyss',tier});
        return createItemFromBase(base,'rare',tier);
    }).filter(item=>canEquipItemToSlot(item,slot));
    candidates.sort((a,b)=>journeyBuildScore([...b.baseStats,...b.stats])-journeyBuildScore([...a.baseStats,...a.stats]));
    if(!candidates.length)throw new Error(`No eligible candidate for ${slot}`);
    const item=candidates[0];
    game.inventory.push(item);
    if(!equipItemById(item.id,slot))throw new Error(`Equip rejected: ${slot} ${item.name}`);
    return {slot,baseId:item.baseId,requirements:levelProgression.requirements(item),rolls:item.stats};
}
// Compare complete, legal loadouts. Resistances stop earning score at 60%; damage and life still matter.
function journeyDefenseScore(stats) {
    const resistance = ['F','C','L','Chaos'].reduce((sum,key)=>sum+Math.min(60,stats['res'+key]),0)/60;
    return 2*Math.log(Math.max(1,stats.totalDps))+Math.log(stats.maxHp)+resistance
        +Math.min(10,stats.regen)/10+0.3*Math.log1p(stats.armor/1000)+0.2*Math.log1p(stats.accuracy/1000);
}
function refineJourneyDefenses(tier) {
    const upgrades=[];
    for(const [slot,previous] of Object.entries(game.equipment)) {
        if(!previous)continue;
        let best=previous,bestScore=journeyDefenseScore(getPlayerStats(false));
        for(let i=0;i<160;i++) {
            const base=chooseItemBase(previous.slot,tier,{type:'abyss',tier});
            const candidate=createItemFromBase(base,'rare',tier);
            if(!canEquipItemToSlot(candidate,slot))continue;
            game.equipment[slot]=candidate;
            let stats;
            try {stats=getPlayerStats(false);}
            finally {game.equipment[slot]=previous;}
            if(Object.keys(stats.disabledEquipment).length)continue;
            const score=journeyDefenseScore(stats);
            if(score>bestScore){best=candidate;bestScore=score;}
        }
        if(best===previous)continue;
        game.inventory.push(best);
        if(!equipItemById(best.id,slot))throw new Error('Defensive replacement rejected: '+slot);
        upgrades.push({slot,baseId:best.baseId,rolls:best.stats});
    }
    return upgrades;
}
function configureWorldTreeLegalBuild(tier=14,defensive=false) {
    game=mergeDefaults({});window.game=game;
    game.season=10;game.loopCount=9;game.level=100;game.passivePoints=99;
    game.selectedClassId='warrior';game.selectedHeroId='hero2';game.passives=[getPassiveTreeRootNodeId()];
    game.pendingLoopHeroSelection=false;game.pendingLoopDecision=false;game.pendingLoopReady=false;
    game.chaosRealm.unlocked=true;game.loopProgressCurrent.chaos20Cleared=true;
    game.loopProgressCurrent.bestAbyssDepth=20;game.abyssEndlessDepth=21;game.abyssUnlockedDepths=[20,21];
    game.maxZoneId=getAbyssZoneIdForDepth(20);
    game.settings.autoEquipEmptySlots=false;game.settings.mapCompleteAction='repeatZone';
    game.settings.autoEnterGrandBreach=false;game.settings.autoEnterMeteor=false;
    game.settings.showDeathNotice=false;game.settings.autoSalvageEnabled=false;
    game.isBackgroundCalculation=false;
    contentProgression.sync();
    for(const id of ['craft','support','flask']) {
        const result=contentProgression.purchase(id,game);
        if(!result.ok)throw new Error(`Unlock failed: ${id} ${JSON.stringify(result)}`);
    }
    let totals=getPlayerStats(false).requirementAttributes;
    while(totals.strength<130) {
        const choice=findAttributeRoute({strength:130},totals);
        if(!choice||!activatePassivePath(choice.id,{forcePulseNodeId:''}).activated)throw new Error('Attribute path failed');
        totals=getPlayerStats(false).requirementAttributes;
    }
    allocateJourneyCombatNodes();
    const gear=Object.keys(game.equipment).map(slot=>equipJourneyCandidate(slot,tier));
    equipJourneyGems();
    const upgrades=defensive?refineJourneyDefenses(tier):[];
    game=mergeDefaults(JSON.parse(JSON.stringify(game)));window.game=game;
    const stats=getPlayerStats(false);
    if(Object.keys(stats.disabledEquipment).length)throw new Error('Disabled equipment in legal fixture');
    if(game.passivePoints<0||game.passives.length>100)throw new Error('Passive budget exceeded');
    game.playerHp=getPlayerHpCap(stats);game.playerEnergyShield=stats.energyShield;
    return {tier,gear,upgrades,candidatesPerSlot:defensive?200:40,points:99-game.passivePoints,nodes:game.passives.slice(),supports:game.equippedSupports.slice(),
        stats:{hp:stats.maxHp,dps:stats.totalDps,regen:stats.regen,armor:stats.armor,accuracy:stats.accuracy,
            resistance:{fire:stats.resF,cold:stats.resC,light:stats.resL,chaos:stats.resChaos},attributes:stats.requirementAttributes}};
}
function equipJourneyGems() {
    game.skills=['기본 공격','연속 베기'];game.gemData['연속 베기']={level:20,exp:0,quality:0};
    changeSkill('연속 베기');
    game.supports=['근접 물리 피해','가속','생명력 흡수'];
    for(const name of game.supports){game.supportGemData[name]={level:15,exp:0};toggleSupport(name);}
}
function simulateJourneyRoute(branch) {
    const before={...game.currencies};
    const beforeKills=game.loopKills,beforeEquipment=game.inventory.length;
    const segments=[];
    let clicks=1,ticks=0,last=game.currentZoneId;
    worldTreeJourneyUi.route(branch);worldTreeJourneyUi.travel();
    while(ticks<18000) {
        if(['defeat','guardian'].includes(game.worldTreeJourney.notice?.kind))break;
        if(game.worldTreeJourney.notice?.kind==='discovery') {worldTreeJourneyUi.resume();clicks++;}
        if(game.currentZoneId!==last) {
            segments.push({zone:game.currentZoneId,atSec:ticks/10});last=game.currentZoneId;
        }
        coreLoop(getCombatTime()+100);ticks++;
    }
    const currencies=Object.fromEntries(Object.entries(game.currencies).map(([key,value])=>[key,value-(before[key]||0)]).filter(([,value])=>value>0));
    const stats=getPlayerStats(false);
    return {branch,seconds:ticks/10,clicks,result:game.worldTreeJourney.notice?.kind||'timeout',segments,
        cleared:game.worldTreeJourney.cleared.slice(),kills:game.loopKills-beforeKills,
        zone:game.currentZoneId,progress:game.runProgress,hp:game.playerHp,maxHp:stats.maxHp,
        death:game.lastDeathLog,currencies,equipment:game.inventory.slice(beforeEquipment).map(item=>({name:item.name,rarity:item.rarity})),
        enemies:game.enemies.map(enemy=>({name:enemy.name,hp:enemy.hp,maxHp:enemy.maxHp}))};
}
module.exports={journeyBuildScore,allocateJourneyCombatNodes,equipJourneyCandidate,journeyDefenseScore,refineJourneyDefenses,configureWorldTreeLegalBuild,equipJourneyGems,simulateJourneyRoute};
