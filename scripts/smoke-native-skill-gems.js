const assert=require('node:assert/strict');
const {runtime:r,run}=require('./lib/replay-fixture')(53);
const json=code=>JSON.parse(run('JSON.stringify('+code+')'));
run(`Math.random=()=>.5;
 game.skills=Object.keys(SKILL_DB).filter(n=>SKILL_DB[n].isGem);
 for(const name of game.skills)game.gemData[name]={level:1,quality:0,exp:0};`);
function setup(name,boss=true) {
    r.gemName=name;r.large=boss;
    run(`game.activeSkill=gemName;resetCombatTacticsRuntime();resetCombatChannelRuntime();
      game.gridPlayer={gx:3,gy:4,gridMoveTimer:0};game.combatTimeMs=100000;game.combatHalted=false;
      game.playerHp=10000;game.playerAilments=[];game.playerCastDelayUntil=0;game.queenBees=[];
      game.enemies=[Object.assign(createEnemy(getZone(1),{boss:large,at:0},0),
        {id:9001,gx:4,gy:4,hp:1e7,maxHp:1e7,energyShield:0,evasion:0,evasionChance:0,facingDirection:4})];
      game.seenTutorials=['story_prologue'];tutorialQueue.length=0;`);
}
function cast(extra=0) {
    r.extra=extra;run('globalThis.castStats=getPlayerStats();castStats.projectileExtraShots=extra;performPlayerAttack(castStats);');
}
function tick(ms) {r.tickMs=ms;run('game.combatTimeMs=100000+tickMs;updateSkillGemCombat(castStats);');}
const names=json('Object.keys(SKILL_DB).filter(n=>SKILL_DB[n].nativeCastId)');
assert.equal(names.length,10);
for(const name of names) {
    setup(name);cast();
    for(let ms=0;ms<=7000;ms+=50) {
        tick(ms);
        if(name==='인과' && ms>0 && ms<=500 && ms%100===0)run('receiveSkillGemPlayerHit(1,castStats);');
    }
    assert.ok(run('game.enemies[0].hp<1e7'),name+' applies production damage');
    const hp=run('game.enemies[0].hp');tick(7000);tick(7000);
    assert.equal(run('game.enemies[0].hp'),hp,name+' consumed contacts cannot repeat');
}
setup('빈 플라스크');cast(0);for(let ms=0;ms<=3000;ms+=25)tick(ms);
const baseDamage=run('1e7-game.enemies[0].hp');
const damages=[];
for(const extra of [1,2,5,100000]) {
    setup('빈 플라스크');cast(extra);for(let ms=0;ms<=3000;ms+=25)tick(ms);
    damages.push(run('1e7-game.enemies[0].hp'));
}
assert.ok(damages[0]>baseDamage && damages[1]>damages[0]);
assert.equal(damages[2],damages[3],'bonus shard cap remains bounded');
assert.equal(run('getProjectileExtraShotDpsMultiplier(SKILL_DB["빈 플라스크"],100000)'),run('getProjectileExtraShotDpsMultiplier(SKILL_DB["빈 플라스크"],20)'));
assert.equal(run('getProjectileExtraShotDpsMultiplier(SKILL_DB["폭발 혼합물"],10)'),1,'unaffected trajectory cannot claim phantom extra damage');
assert.ok(run('getProjectileExtraShotDpsMultiplier(SKILL_DB["빈 플라스크"],.5)')>1);
assert.ok(run('applyProjectilePatternMode(SKILL_DB["빈 플라스크"],"fan")===SKILL_DB["빈 플라스크"]'),'generic engraving cannot silently change only damage of a fixed trajectory');
setup('탄성 플라스크');run('game.queenBees=[{expiresAt:200000,attacksLeft:3,nextAt:0,hitPct:125}];');cast();
assert.equal(run('game.queenBees[0].attacksLeft'),2,'normal attack-start effects also trigger on native gems');
for(let ms=0;ms<=3000;ms+=25)tick(ms);
assert.equal(run('game.queenBees[0].attacksLeft'),2,'individual bounce contacts do not retrigger attack-start costs');
setup('암살');cast();tick(99);assert.equal(run('game.gridPlayer.gx'),3);
tick(100);assert.equal(run('game.gridPlayer.gx'),6,'teleport beyond entire 2x2 footprint');
assert.equal(run('game.enemies[0].hp'),1e7,'teleport is not a damage event');
tick(240);assert.ok(run('game.enemies[0].hp<1e7'));
run('game.gridPlayer={gx:3,gy:4};');cast();tick(340);
assert.equal(run('game.gridPlayer.gx'),6,'persistent enemy facing allows another rear teleport');
setup('암살');cast();run('game.enemies.push({...game.enemies[0],id:9002,isBoss:false,gridWidth:1,gridHeight:1,gx:6,gy:4});');
tick(100);assert.equal(run('game.gridPlayer.gx'),3,'late obstruction prevents teleport');
setup('파문심판',false);run('game.enemies[0].gx=5;game.enemies[0].gy=6;');
assert.equal(run('getSkillTargets(getPlayerStats()).length'),0,'diagonal cannot trigger an empty cross forever');
run('game.gridPlayer.gy=5;');assert.ok(run('getSkillTargets(getPlayerStats()).length')>0);
setup('신성한 안개');cast();tick(500);
assert.equal(run('game.enemies[0].holyMistUntil'),100000+Math.round(330/run('castStats.aspd'))+4000);
assert.equal(run('skillGemCombatRuntime.mist.holyTargets.length'),1);
run('game.enemies[0].gy=3;');tick(600);
assert.equal(run('skillGemCombatRuntime.mist.holyTargets[0].gy'),3.5,'status follows the large enemy center');
const mist=json('getEffectiveEnemyMitigation("fire",1,game.enemies[0],castStats)');tick(5000);
assert.equal(run('skillGemCombatRuntime.mist'),null,'expired status artwork is removed');
assert.ok(run('getEffectiveEnemyMitigation("fire",1,game.enemies[0],castStats)')>mist,'debuff expires');
setup('인과');cast();run('receiveSkillGemPlayerHit(0,castStats);');
assert.equal(run('skillGemCombatRuntime.channel.count'),0);
run('receiveSkillGemPlayerHit(1,castStats);');assert.equal(run('skillGemCombatRuntime.channel.count'),1);
run('game.gridPlayer.gy--;');tick(100);assert.equal(run('skillGemCombatRuntime.channel'),null,'movement cancels accumulated channel');
setup('탄성 플라스크');cast();run('globalThis.onlineRuntime=captureCombatRuntime();globalThis.savedGame=JSON.stringify(game);globalThis.sim=createCombatReplay(2000,game,getCombatTime());');
const online=json('skillGemCombatRuntime');
run('advanceCombatReplay(sim,1000);');
assert.deepEqual(json('skillGemCombatRuntime'),online,'offline replay cannot mutate online casts');
run('resetCombatTacticsRuntime();');assert.equal(run('skillGemCombatRuntime'),null,'new encounter clears pending contacts');
// Old saves gain definitions, never free gems. New ownership and active selection survive round trip.
run('globalThis.oldSave=mergeDefaults({level:30,skills:["연속 베기"],gemData:{"연속 베기":{level:4,quality:3,exp:12}},activeSkill:"연속 베기"});');
assert.deepEqual(json('oldSave.skills'),['기본 공격','연속 베기']);
run('game.skills=Object.keys(SKILL_DB).filter(n=>SKILL_DB[n].isGem);game.activeSkill="인과";game.gemData["인과"]={level:8,quality:6,exp:13};globalThis.roundTrip=mergeDefaults(JSON.parse(serializeSaveState(game)));');
assert.equal(run('roundTrip.activeSkill'),'인과');assert.equal(run('roundTrip.gemData["인과"].level'),8);
run('game.skills=game.skills.filter(n=>n!=="인과");');
assert.ok(json('getGemResearchCollectionState().attack.missing').includes('인과'),'new gems enter normal research acquisition pool');
console.log('10 production gems: contacts, boss geometry, investment, channel, replay and save compatibility passed');
