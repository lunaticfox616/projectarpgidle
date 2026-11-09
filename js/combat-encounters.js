// 조우 만들기: 탐험 방의 무리, 지역 계획, 대균열과 특수 조우 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)

/** encounter: an atlas content room (js/atlas-encounters.js) — elite-led, larger and tuned, rewarding when emptied. */
const explorationPackKey=(room,stage)=>room.id+':'+(stage===null?'pack':stage);
/** A room an atlas map's earlier entry already emptied (before a portal): its pack is there, defeated. */
function emptiedExplorationPack(room) {
    return {key:explorationPackKey(room,null),roomId:room.id,stage:null,waiting:[],aliveIds:[],eliteIds:[]};
}
/** A pack's spawn offset (0~99) for the visual seed, so wisps, roots, act monsters and elite traits differ room by room
 * (a room always gets the same seed). Boss stages keep 0 (their art variant). With 0 everywhere every room of a zone repeated them. */
function explorationPackSpawnAt(zone,key,stage) {
    if(stage!==null)return 0;
    return Math.abs(hashSeed(`${zone.atlasSeed || zone.id}:${key}`))%100;
}

/** 무리의 한 자리에 설 적. 그 자리에 따로 정한 배역(role: 케르베로스의 머리와 몸통)이 있으면 그 표식으로 만들고, 만든 뒤 꾸민다. */
function createExplorationPackEnemy(zone,marker,index,role) {
    const enemy=createEnemy((role && role.zone) || zone,role?{...marker,...role.marker}:marker,index);
    if(role)role.dress(enemy);
    return enemy;
}
/** 콘텐츠 외형을 최종 확정한 뒤 그 몸에 맞는 공격 방식을 적용한다. 수치 보정은 한 번만 한다. */
function tuneExplorationEncounterEnemy(enemy,encounter,zone) {
    if(!encounter)return;
    atlasEncounters.tuneEnemy(enemy,encounter,zone);
    if(atlasEncounters.hasOwnLook(encounter))assignEnemyGridCombatProfile(enemy);
}
function createActExplorationPack(zone,room,stage,encounter=null,formation=null) {
    const shape=explorationPackFormation.prepare(zone,room,stage,encounter,formation),{key,at,cells,elite}=shape,waiting=[];
    const cast=(formation && formation.cast) || [];
    const roster=explorationPackFormation.roster(zone,stage,encounter,shape,formation);
    cells.forEach((cell,index)=>{
        const marker={at,count:1,boss:stage!==null,elite:elite && index===0,storyStage:stage,ownLook:atlasEncounters.hasOwnLook(encounter),packVisualId:roster[index]};
        const enemy=createExplorationPackEnemy(zone,marker,index,cast[index]);
        tuneExplorationEncounterEnemy(enemy,encounter,zone);
        if(stage!==null && zone.atlasStages)atlasEndgame.tuneStage(enemy,zone,stage);
        if(stage!==null && zone.memoryTier)memoryDungeon.tuneBoss(enemy,zone.memoryTier);
        if(stage!==null && typeof bossVariants==='object')bossVariants.dress(enemy);
        Object.assign(enemy,cell,{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:key});
        waiting.push(enemy);
    });
    explorationPackFormation.placeRanks(waiting,formation);
    const pack={key,roomId:room.id,stage,waiting,aliveIds:waiting.map(enemy=>enemy.id),eliteIds:waiting.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)};
    markExplorationPackShape(pack,encounter,shape,formation);
    markExplorationAlertPack(pack);
    atlasFinds.dressTreasurePack(zone,pack);
    return pack;
}

/** A pack's shape marks, each kept only when set: its atlas encounter, a road group's anchor, a stage room's added pack (extra), a
 * follow-up wave (wave, releaseExplorationWave), the first start's rescue pair (rescue). */
function markExplorationPackShape(pack,encounter,shape,formation) {
    if(encounter)pack.encounter=encounter;
    if(shape.anchor)pack.anchor={...shape.anchor};
    if(shape.extra)pack.extra=shape.extra;
    if(shape.wave)pack.wave=shape.wave;
    if(formation && formation.rescue)pack.rescue=true;
}

/** 경계하는 무리 (data ACT_EXPLORATION_ALERT): an ordinary room pack that runs at the hero once a fight within its hearing hurts a
 * monster (js/act-exploration-state.js alerted). The roll hashes the pack key with its first enemy id: fixed per pack, different
 * each run, and it draws nothing from Math.random, so the rest of the map rolls as before. */
function markExplorationAlertPack(pack) {
    const rule=ACT_EXPLORATION_ALERT;
    if(pack.stage!==null || pack.encounter || pack.anchor || pack.rescue || pack.eliteIds.length || !pack.waiting.length || !(game.season>=rule.fromLoop))return;
    if((Math.abs(hashSeed(`alert:${pack.key}:${pack.aliveIds[0]}`))%1000)/1000>=rule.chance)return;
    pack.alert=true;
    for(const enemy of pack.waiting)Object.assign(enemy,{alert:true,name:`${rule.prefix} ${enemy.name}`,encounterOutline:rule.outline});
}

/** 습격방 (data ACT_EXPLORATION_AMBUSH): on a room-by-room stage each battle or side room becomes one with this chance. Its ordinary
 * packs (the room's own and the added ones; not listening, sleeping or treasure packs) get ambush and their members the outline;
 * js/act-exploration-doors.js springAmbush gathers them at the door the hero comes in by. The roll hashes the room's own pack key with its
 * first enemy id (as the listening roll does): fixed per run, no random draw. Loop 1's act 1, elite-led, encounter and rescue rooms never
 * become one. @returns {object[]} the same packs */
function markExplorationAmbushRooms(zone,map,packs) {
    if(!map.stage || (zone.type==='act' && zone.id===0 && (game.season||1)===1))return packs;
    for(const room of map.rooms.filter(row=>row.role==='battle' || row.role==='optional')) {
        for(const pack of ambushRoomPacks(room,packs)) {
            pack.ambush=true;
            pack.waiting.forEach(enemy=>{enemy.encounterOutline=ACT_EXPLORATION_AMBUSH.outline;});
        }
    }
    return packs;
}
/** The packs a room's 습격 takes when its own pack's roll falls under the chance, else none. */
function ambushRoomPacks(room,packs) {
    const own=packs.filter(pack=>pack.roomId===room.id && pack.stage===null && !pack.anchor && !pack.rescue && !pack.alert && !pack.sleep && !pack.treasure);
    const main=own.find(pack=>pack.key===room.id+':pack');
    if(!main || main.encounter || !main.aliveIds.length || own.some(pack=>pack.eliteIds.length || pack.waiting.some(enemy=>enemy.critter)))return [];
    return (Math.abs(hashSeed(`ambush:${main.key}:${main.aliveIds[0]}`))%1000)/1000<ACT_EXPLORATION_AMBUSH.chance ? own : [];
}

/** 이어지는 무리(data ACT_EXPLORATION_WAVES)를 받는 방과 그 수. 그 방 원래 무리의 첫 몬스터 번호로 굴려 다른 난수를 밀지 않는다.
 * @returns {Object<string,{left:number,total:number,at:?number}>} 방 id → 남은 번수, 모두 몇 번인지, 다음 무리가 설 전투 시각(ms, 그 방이
 *   비기 전에는 null). 탐험 기록에 저장된다(js/act-exploration-state.js validateWaves). */
function rollExplorationRoomWaves(zone,map,packs) {
    const rule=ACT_EXPLORATION_WAVES,waves={};
    if(!explorationWavesAllowed(zone,map))return waves;
    for(const room of map.rooms.filter(row=>isExplorationWaveRoom(map,row))) {
        const roll=explorationWaveRoll(room,packs);
        if(roll===null || roll>=rule.chance)continue;
        const total=weightedWaveCount(roll/rule.chance,rule.counts);
        waves[room.id]={left:total,total,at:null};
    }
    return waves;
}
/** 이어지는 무리를 받을 수 있는 탐험: 방 단위 무대이고, 무리를 따로 세우는 콘텐츠(벌집 같은)와 1루프의 액트 1이 아니다. */
const explorationWavesAllowed=(zone,map)=>!!map.stage && !ownRoomPackBuilder(zone) && !(zone.type==='act' && zone.id===0 && (game.season||1)===1);
/** 그 방의 굴림(0 이상 1 미만): 그 방 원래 무리의 첫 몬스터 번호로. 원래 무리가 없거나 비었거나 조우, 구출, 습격의 방이면 null. */
function explorationWaveRoll(room,packs) {
    const own=packs.filter(pack=>pack.roomId===room.id),main=own.find(pack=>pack.key===room.id+':pack');
    if(!main || main.encounter || !main.aliveIds.length || own.some(pack=>pack.rescue || pack.ambush))return null;
    return (Math.abs(hashSeed(`waves:${main.key}:${main.aliveIds[0]}`))%1000)/1000;
}
/** 정예 방, 또는 문이 하나인 막다른 방(입구와 보스 방 말고). */
const isExplorationWaveRoom=(map,room)=>room.role==='elite' || (['battle','optional'].includes(room.role) && map.doors.filter(door=>door.room===room.index).length===1);
/** u(0 이상 1 미만)를 무게 줄 [값, 무게]에 대어 고른 값. */
function weightedWaveCount(u,rows) {
    let left=u*rows.reduce((sum,row)=>sum+row[1],0);
    for(const [value,weight] of rows){left-=weight;if(left<0)return value;}
    return rows[rows.length-1][0];
}
/** 전투 틱마다: 주인공이 선 방이 비었고 그 방에 이어지는 무리가 남았으면(js/act-exploration-doors.js waveDue: 그동안 문은 닫혀 있다)
 * delayMs 뒤에 그 방 원래 무리의 자리에 보통 무리 하나를 세운다. 세운 무리는 곧 주인공을 알아채고 덤빈다. */
function releaseExplorationWave(log) {
    const run=actExplorationState.current(game),map=run && run.status==='active'?actExplorationDoors.stageMap(run):null;
    const room=map?actExplorationRooms.roomAt(map,game.gridPlayer):null,wave=room && actExplorationDoors.waveDue(run,room)?run.waves[room.id]:null;
    if(!wave)return;
    const now=getCombatTime();
    if(wave.at===null){wave.at=now+ACT_EXPLORATION_WAVES.delayMs;return;}
    if(now<wave.at)return;
    const zone=getZone(game.currentZoneId),number=wave.total-wave.left+1,count=explorationPackFormation.count(zone,null,{});
    const pack=createActExplorationPack(zone,room,null,null,{wave:number,cells:explorationWaveCells(map,room,count)});
    run.packs.push(pack);
    Object.assign(wave,{left:wave.left-1,at:null});
    pack.waiting.forEach(enemy=>addBattleFx('enemySpawn',{enemyId:enemy.id,color:getElementColor(enemy.ele),duration:420,boss:false}));
    if(game.settings.showSpawnLog!==false)log(_t('⚠️ 무리가 더 몰려옵니다({number}/{total})', { number, total: wave.total }),'attack-monster');
}
/** 새 무리가 설 칸: 그 방 원래 무리의 자리에서, 막힌 칸, 그 방의 문 칸과 문 안쪽 칸, 주인공 둘레 한 칸은 피해 가까운 빈 칸으로. */
function explorationWaveCells(map,room,count) {
    const blocked=getGridBlockedCells(),hero=game.gridPlayer,key=at=>gridCellKey(at.gx,at.gy);
    map.doors.filter(door=>door.room===room.index).forEach(door=>door.cells.concat(door.landings).forEach(at=>blocked.add(key(at))));
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)blocked.add(gridCellKey(hero.gx+dx,hero.gy+dy));
    const wanted=stageRoomArranger.forMap(map).cells(room,0,count) || explorationPackFormation.spots(room,count);
    return wanted.map(cell=>{const spot=findFreeGridCell(blocked,cell)||cell;blocked.add(key(spot));return spot;});
}

/** An atlas map's extra-elite mod leads some ordinary rooms with an elite (fixed per map and room). */
function isAtlasExtraEliteRoom(zone,room) {
    if(!zone.atlasExtraElite || room.role==='boss')return false;
    return (Math.abs(hashSeed(zone.atlasSeed+':'+room.id))%1000)/1000<zone.atlasExtraElite;
}

/** How a zone is fought: a story act walks its authored map; any other zone whose factory declares `exploration` (a
 * generated-map spec, js/exploration-layouts.js, with bossStages) walks that map; everything else keeps the 9×8 board. */
function getZoneExplorationPlan(zone) {
    if(!zone)return null;
    if(zone.type==='act')return actExplorationMap.layout(zone.id+1) ? {act:zone.id+1,bossStages:STORY_ACTS[zone.id].maxKills} : null;
    return zone.exploration ? {source:zone.exploration,zoneId:zone.id,bossStages:zone.exploration.bossStages||1} : null;
}

/** Each run faces north, east, south or west (2026-10-04): the map's clockwise quarter turns, 0..3.
 * The only randomness of the facing; fixtures that walk fixed coordinates pin it to undefined (the map's drawn facing). */
function rollExplorationFacing() {return Math.floor(Math.random()*actExplorationMap.ROTATIONS);}

/** exploration: false = the legacy board (regression fixtures), true = must explore (throws where no map exists). */
function createActExplorationEncounter(zone,exploration) {
    const plan=exploration===false ? null : getZoneExplorationPlan(zone);
    if(!plan && exploration===true)throw Error('일반 액트나 전용 맵이 있는 콘텐츠에서만 탐험을 시작할 수 있습니다.');
    if(!plan)return null;
    plan.rotation=actExplorationProgress.objects.savedFacing(zone)??rollExplorationFacing();
    if(actExplorationDoors.session())plan.rooms=actExplorationDoors.planKey(zone,plan); // 방 단위 무대 시험판(js/act-exploration-doors.js): 액트와 그 밖의 모든 탐험 구역
    const run=actExplorationState.create(plan,createExplorationPacks(zone,actExplorationMap.forRun(plan),plan.bossStages),getCombatTime());
    run.waves=rollExplorationRoomWaves(zone,actExplorationMap.forRun(run),run.packs);
    if(shouldSealEncounterRun(plan,zone))run.sealed=true;
    run.mode=actExplorationProgress.startMode(game.settings);
    actExplorationProgress.objects.initialize(run,zone);
    return run;
}
function shouldSealEncounterRun(plan,zone) {
    return !!plan.rooms && SEALED_ROOM_ZONES.includes(zone.type) && !(zone.type==='colony' && plan.source?.arena);
}
/** A +28% ordinary-monster budget: one larger room, one quiet-road group, then small room additions.
 * One-time generation only; existing runs retain every enemy. Atlas and bespoke encounters keep their authored budgets. */
/** Rooms without their own packs: the entry room, path rooms, and the first start's rescue room (its one monster comes apart). */
const ownsNoPack=(room,rescueRoom)=>room.role==='entry' || room.role==='path' || room===rescueRoom;
function createExplorationPacks(zone,map,bossStages) {
    const own=ownRoomPackBuilder(zone);
    if(own)return own(zone,map);
    const packs=[],encounters=atlasEncounters.rooms(zone,map),arranger=stageRoomArranger.forMap(map);
    const {counts,patrol}=explorationPackFormation.plan(zone,map),rescueRoom=starterRescueRoom(zone,map);
    for(const room of map.rooms) {
        if(ownsNoPack(room,rescueRoom))continue;
        const encounter=encounters[room.id]||null;
        if(room.role!=='boss'){packs.push(zone.atlasCleared?.includes(room.id) ? emptiedExplorationPack(room)
            : createActExplorationPack(zone,room,null,encounter,arrangedRoomFormation(arranger,zone,room,encounter,counts.get(room.id))));continue;}
        for(let stage=0;stage<bossStages;stage++)packs.push(createExplorationBossStage(zone,map,room,stage));
    }
    // 잔잔한 사건(js/combat-incidents.js): 새 지도와 모든 무리의 칸을 보고 드물게 금빛 수액 슬라임, 길 잃은 몬스터, 잠든 무리
    const dressed=combatIncidents.dressPacks(zone,map,packs.concat(createAddedExplorationPacks(zone,map,patrol,arranger,rescueRoom),
        createStarterRescuePack(zone,map,rescueRoom)));
    return markExplorationAmbushRooms(zone,map,dressed);
}

/** 액트 1의 첫 몬스터(2026-10-15 사용자: "첫 방에 몬스터가 있고 그걸 잡으면 룬이 드랍되게", "하켄이 그 몬스터에게 맞고있는걸로"):
 * 이번 루프의 시작 무기를 아직 떨어뜨리지 않았을 때, 방 단위 무대의 구출 방(starterRescueRoom)에서 하켄 곁에 한 마리가 선다. 그 방의 보통 무리는
 * 없다. 한 대 맞기 전까지는 하켄을 친다(strikeRescueTarget). 이 몬스터가 루프의 첫 처치라 시작 무기가 그 자리 바닥에 떨어진다(2026-11-09까지는 시작 룬).
 * @returns {object[]} 그 무리, 없으면 빈 목록. */
/** 루프 1에만(2026-10-15 사용자: 루프 뒤에는 첫 방에 하켄이 없다). 그 뒤의 시작 무기는 그 루프의 첫 처치가 바닥에 떨어뜨린다. */
const startsWithRescue=(zone,map)=>zone.type==='act' && zone.id===0 && !!map.stage && (game.season||1)===1
    && !game.loopStarterWeaponGranted;
/** 구출 방: 입구 방 문 너머, 보스로 가는 길의 첫 전투 방(2026-10-15 사용자: "첫방에서 처음부터 하켄이 보이지 않도록 (조금 앞으로 걸어가야
 * 있도록)". PC 화면은 입구 방 전체를 한 번에 보여 주므로 입구 방 안에서는 숨길 수 없다). 루프 1의 첫 시작에만, 없으면 null. */
function starterRescueRoom(zone,map) {
    if(!startsWithRescue(zone,map))return null;
    return map.route.map(id=>map.rooms.find(room=>room.id===id)).find(room=>room.role==='battle')||null;
}
function createStarterRescuePack(zone,map,room) {
    if(!room)return [];
    // 하켄의 양옆에 RESCUE_STRIKE.gap칸씩 떨어져 선다(방 밖이면 그 너머 칸을 쓰지 않는다): 주인공은 앞의 한 마리부터 치게 된다.
    const post=actExplorationRooms.npcPost(room),inside=gx=>gx>=room.x0 && gx<=room.x1;
    const cells=[post.gx+RESCUE_STRIKE.gap,post.gx-RESCUE_STRIKE.gap].filter(inside).slice(0,RESCUE_STRIKE.pair).map(gx=>({gx,gy:post.gy}));
    const pack=createActExplorationPack(zone,room,null,null,{cells,rescue:true});
    // 게이지를 거의 채워 둔다: 첫 장면(액트 이름과 깨어나는 대사 동안 게임이 멈춘다)에서 하켄을 향해 공격을 준비하는 자세로 보인다.
    // 처음 시작(js/opening-journey-ui.js)의 주인공이 아직 이 괴물을 치지 않았으면, 다가와 칠 때까지 하켄을 계속 친다(patient).
    const patient=!(game.seenTutorials||[]).includes('opening_attack');
    pack.waiting.forEach(enemy=>Object.assign(enemy,{rescue:{gx:post.gx,gy:post.gy,strikes:0,patient},attackTimer:RESCUE_STRIKE.windUp,
        hp:Math.round(enemy.hp*RESCUE_STRIKE.share),maxHp:Math.round(enemy.maxHp*RESCUE_STRIKE.share),damageMul:enemy.damageMul*RESCUE_STRIKE.share}));
    return [pack];
}
/** 하켄을 치는 첫 몬스터(createStarterRescuePack)의 한 틱: 한 대라도 맞거나 하켄을 RESCUE_STRIKE.maxStrikes번 치기 전까지는 하켄 쪽을
 * 보고 RESCUE_STRIKE.rate의 빠르기로 공격 동작만 낸다(피해 없음, 하켄 위의 번쩍임은 js/canvas-act-title-card.js가 'npcStruck'로 그린다).
 * 주인공은 하켄에서 두 칸 옆에서 시작해 곧 이 몬스터를 친다. 그 뒤로는 여느 몬스터처럼 주인공과 싸운다. true = 이번 틱은 하켄을 노렸다. */
// pair: 두 마리가 하켄을 양옆에서 친다(대사는 "괴물들", "잔뿌리들"). share: 한 마리의 생명력과 피해 배율: 둘을 합쳐 한 마리였을 때와 비슷하게.
// gap: 하켄에서 떨어져 서는 칸 수. 바로 옆 칸에 서면 몬스터 그림이 하켄과 겹쳤다(2026-10-17 사용자 "NPC와 겹치지 않도록", 1에서 2로).
const RESCUE_STRIKE=Object.freeze({rate:0.42,windUp:0.9,maxStrikes:4,fxMs:260,pair:2,share:0.55,gap:2});
function strikeRescueTarget(enemy) {
    const npc=enemy.rescue;
    if(!npc)return false;
    if(enemy.hp<enemy.maxHp || !Number.isFinite(npc.gx) || !(npc.patient || npc.strikes<RESCUE_STRIKE.maxStrikes)){delete enemy.rescue;return false;}
    enemy.attackTimer=(Number(enemy.attackTimer)||0)+0.1*RESCUE_STRIKE.rate;
    if(enemy.attackTimer<1)return true;
    enemy.attackTimer-=1;
    npc.strikes++;
    announceEnemyAttackRelease(enemy, null, 'instantTarget', npc);
    addBattleFx('npcStruck',{gx:npc.gx,gy:npc.gy,duration:RESCUE_STRIKE.fxMs});
    return true;
}

/** 판의 진행 막대가 부를 무리(표식)의 수: generateEncounterPlan과 같은 셈이다(난수 없이). 방 단위 무대의 한 줄 지도가 이 수만큼 방을
 * 잇는다(js/content-maps.js markerChain): 우주계는 무리들과 보스, 심해는 무리들, 경계 너머는 조우마다 셋(마지막 조우는 보스까지). */
function countEncounterMarkers(zone) {
    const profile=getZoneEncounterProfile(zone);
    if(zone.type==='beyondBoundary')return zone.boundaryFinalWave ? 3+(profile.bossAdds>0?1:0) : 3;
    return zone.type==='cosmos' ? profile.markerCount+1 : profile.markerCount;
}
/** 판의 표식 하나가 부르던 적들(spawnEncounterMarker와 같은 표식, 같은 차례로 만든다): 보스 표식은 곁의 정예들과 보스. */
function createMarkerEnemies(zone,marker) {
    const count=marker.count||1;
    if(marker.boss){
        const adds=Array.from({length:count-1},(_,index)=>createEnemy(zone,{...marker,boss:false,elite:true},index));
        return adds.concat(createEnemy(zone,{...marker,count:1,storyStage:game.killsInZone},count));
    }
    const escort=zone.type==='cosmos' && zone.cosmosHabitat==='guard' && marker.elite && count===2;
    return Array.from({length:count},(_,index)=>createEnemy(zone,
        escort && index===0?{...marker,packVisualId:'cosmos-ooze'}:marker,index));
}
/** 이미 만든 적들을 방의 무리에 세운다: 보스는 방 가운데, 나머지는 그 둘레(보스가 없으면 가운데부터). 주인공이 그 방에 들어서면 덤빈다. */
function fillRoomPack(map,room,pack,enemies,places) {
    const bosses=enemies.filter(enemy=>enemy.isBoss),rest=enemies.filter(enemy=>!enemy.isBoss);
    const cells=places || (bosses.length?explorationPackFormation.around(room,rest.length):explorationPackFormation.spots(room,rest.length));
    rest.forEach((enemy,index)=>Object.assign(enemy,cells[index]));
    for(const enemy of enemies)Object.assign(enemy,{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:pack.key});
    Object.assign(pack,{waiting:enemies,aliveIds:enemies.map(enemy=>enemy.id),eliteIds:enemies.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)});
    if(bosses.length)placeExplorationBoss(map,room,{waiting:bosses});
    return pack;
}
/** 적들이 선 방의 무리. 끝 방의 무리는 단계 0이다(탐험은 끝 방이 비면 끝난다): 보스가 없으면 조용한 무리(quiet)라 보스 등장 연출 없이
 * 다른 방의 무리처럼 덤빈다(js/act-exploration-state.js holdBoss). */
function createRoomPackOf(map,room,enemies,places) {
    const final=room.role==='boss',pack=fillRoomPack(map,room,{key:explorationPackKey(room,final?0:null),roomId:room.id,stage:final?0:null},enemies,places);
    if(final && !enemies.some(enemy=>enemy.isBoss))pack.quiet=true;
    return pack;
}
/** 한 줄 지도의 방들: 입구 다음 방부터 끝 방까지, 걷는 차례로. */
const chainRoomsOf=map=>map.route.slice(1).map(id=>map.rooms.find(room=>room.id===id));
/** 진행 막대의 무리들을 한 줄 지도에 세운다(2026-10-13 밤: 우주계, 심해, 경계 너머). 판에서 진행도에 따라 차례로 나타나던 무리가 방마다
 * 하나씩 서고, 마지막 무리는 끝 방에 선다. 방보다 무리가 많으면(STAGE_BOARD_ROOMS.chainMax) 끝 방 앞의 방에 겹쳐 선다. */
function createMarkerRoomPacks(zone,map) {
    const markers=generateEncounterPlan(zone),rooms=chainRoomsOf(map),last=rooms.length-1,groups=rooms.map(()=>[]),arranger=stageRoomArranger.forMap(map);
    const guard=zone.type==='cosmos' && zone.cosmosHabitat==='guard';
    markers.forEach((marker,index)=>groups[index===markers.length-1?last:Math.min(index,last-1)].push(marker));
    const packs=rooms.map((room,index)=>{
        if(!groups[index].length && index!==last)return emptiedExplorationPack(room);
        const enemies=groups[index].flatMap(marker=>createMarkerEnemies(zone,marker));
        // 끝 방의 무리(보스가 있으면 보스 둘레)는 방 가운데에, 그 앞의 방들은 방마다 다른 자리에 선다
        const pack=createRoomPackOf(map,room,enemies,index===last?null:arranger.cells(room,0,enemies.length));
        // Only a new two-member guard marker trades its existing cells; saved packs and boss escorts keep their placement.
        if(guard && groups[index].length===1 && !groups[index][0].boss && groups[index][0].elite && enemies.length===2)
            explorationPackFormation.placeRanks(enemies,{front:arranger.front(room)});
        return pack;
    });
    if(zone.type==='meteor')mixMeteorRooms();
    if(zone.type==='oceanDepth')mixOceanRooms();
    return packs;

    /** 새 운석 지도의 앞 두 방만 섞는다. 모든 생성·배치 추첨 뒤 기존 개체와 칸의 소유권만 교환한다. */
    function mixMeteorRooms() {
        const [first,second]=packs;
        if(first?.stage!==null || second?.stage!==null)return;
        const guard=first.waiting.find(enemy=>enemy.monsterVisualId==='meteor-melt') || first.waiting.find(enemy=>!enemy.isElite && !enemy.isBoss);
        const shooter=second.waiting.find(enemy=>enemy.isElite && enemy.monsterVisualId==='meteor-sentinel');
        if(!guard || !shooter)return;
        swapRoomEnemies(first,second,guard,shooter);
    }
    /** 새 심해 지도만 섞는다. 마지막 quiet 방도 포함하되 보스와 이미 섞인 방은 기증 후보가 아니다. */
    function mixOceanRooms() {
        const ordinary=packs.filter(pack=>pack.waiting.length>1 && !pack.waiting.some(enemy=>enemy.isBoss));
        const receivers=ordinary.filter(pack=>pack.waiting.every(enemy=>!enemy.isElite && enemy.attackKind==='melee'));
        const donors=ordinary.filter(pack=>pack.waiting.every(enemy=>enemy.isElite && enemy.monsterVisualId==='ocean-oracle'));
        for(const first of receivers){
            const second=donors.find(pack=>pack.waiting.filter(enemy=>enemy.monsterVisualId==='ocean-oracle').length>1);
            if(!second)break;
            const guard=first.waiting.find(enemy=>enemy.monsterVisualId==='ocean-crab') || first.waiting[0];
            const shooter=second.waiting.find(enemy=>enemy.monsterVisualId==='ocean-oracle');
            swapRoomEnemies(first,second,guard,shooter);
        }
    }
    function swapRoomEnemies(first,second,guard,shooter) {
        const guardCell={gx:guard.gx,gy:guard.gy},shooterCell={gx:shooter.gx,gy:shooter.gy};
        first.waiting[first.waiting.indexOf(guard)]=shooter;
        second.waiting[second.waiting.indexOf(shooter)]=guard;
        Object.assign(shooter,guardCell,{explorationPack:first.key});
        Object.assign(guard,shooterCell,{explorationPack:second.key});
        [first,second].forEach(pack=>{
            pack.aliveIds=pack.waiting.map(enemy=>enemy.id);
            pack.eliteIds=pack.waiting.filter(enemy=>enemy.isElite).map(enemy=>enemy.id);
            explorationPackFormation.placeRanks(pack.waiting,{front:arranger.front(rooms[packs.indexOf(pack)])});
        });
    }
}
/** 전용 전투 지도를 걷는 콘텐츠면 그 콘텐츠가 무리를 세우는 함수, 아니면 null. */
const ownRoomPackBuilder=zone=>(zone.exploration && (zone.exploration.chain || zone.type==='grandBreach' || zone.type==='colony')
    ? ROOM_PACK_BUILDERS[zone.type] || null : null);
/** 판 콘텐츠가 방 단위 지도에 무리를 세우는 법(구역 종류 → 함수). 여기에 없는 구역은 방마다의 보통 무리와 보스 단계다. */
const ROOM_PACK_BUILDERS=Object.freeze({beehive:createBeehiveRoomPacks,colony:createColonyDefenseRoomPacks,grandBreach:createGrandBreachRoomPacks,
    cosmos:createMarkerRoomPacks,oceanDepth:createMarkerRoomPacks,beyondBoundary:createMarkerRoomPacks,meteor:createMarkerRoomPacks});
/** 끝 방의 관문을 그 콘텐츠가 여는 구역(run.sealed): 군락지는 다섯째 웨이브가 설 때, 대균열은 처치 게이지가 찼을 때. */
const SEALED_ROOM_ZONES=Object.freeze(['colony','grandBreach']);

/** 방 단위 지도에서 보스가 깨어나 싸움에 드는 순간에 거는 그 콘텐츠의 규칙. 판에서는 싸움이 열릴 때 걸리던 것이다: 혼돈 밖의 나무꾼의 저주
 * (걸어가는 동안은 쌓이지 않는다). */
function beginRoomBossRules(zone) {
    if(zone && zone.type==='outsideChaos' && !game.woodsmanCurseActive)startWoodsmanCurse();
}

/** 벌집 전용 지도의 무리(2026-10-13 사용자: "벌집전용지도 만들던가"): 벌집 방은 모두 비어 있고, 갈림길을 고를 때마다 다음 방에 그
 * 벌떼가 선다(placeBeehiveRoomWave). 여왕의 방에는 여왕이 처음부터 서 있어 탐험이 먼저 끝나지 않는다: 마지막 갈림길 뒤에 그때의
 * 강화 수치로 다시 만든다. */
function createBeehiveRoomPacks(zone,map) {
    return map.rooms.filter(room=>room.role!=='entry').map(room=>room.role==='boss'
        ? placeExplorationBoss(map,room,createActExplorationPack(zone,room,0)) : emptiedExplorationPack(room));
}
/** One empty stage keeps the defense arena active without creating a map boss or an automatic clear. */
function createColonyDefenseRoomPacks(zone,map) {
    if(!map.colonyDefense)return createBeehiveRoomPacks(zone,map);
    return map.rooms.filter(room=>room.role==='boss').map(room=>createRoomPackOf(map,room,[]));
}
/** Apply one hive wave's difficulty once, then give each bee its own combat role. */
function tuneBeehiveWaveEnemy(enemy, zone, isBoss, empower) {
    if (isBoss) {
        enemy.name = '👑 벌집 여왕';
        enemy.ele = 'chaos';
        enemy.ailmentChance += 0.12;
        enemy.traitName = _t('독침 여왕 (군체 강화 {floor})', { floor: Math.floor(empower || 0) });
        return enemy;
    }
    enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * zone.waveHpMul));
    enemy.atkMul *= zone.waveAttackRateMul;
    enemy.damageMul *= zone.waveDamageMul;
    const role = enemy.monsterVisualId;
    if (role === 'hive-drone') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.2);
        enemy.damageMul *= 1.12;
    } else if (role === 'hive-scout') {
        enemy.maxHp = Math.max(1, Math.floor(enemy.maxHp * 0.78));
        enemy.attackSpeedVar *= 1.25;
    } else if (role === 'hive-nurse') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.12);
        enemy.regenRate += 0.003;
        giveEnemyEnergyShield(enemy, 20);
    } else if (role === 'hive-guard') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.dr = Math.min(90, enemy.dr + 6);
    } else if (role === 'hive-royal') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.15);
        enemy.penetration += 8;
        enemy.attackSpeedVar *= 1.12;
    }
    enemy.hp = enemy.maxHp;
    return enemy;
}
/** 단일 대균열 아레나의 군주 자리. 군주는 목표 처치 수에 닿기 전에는 run.sealed로 보류한다.
 * 저장된 옛 3방 원정은 그 지도와 첫 무리를 그대로 마치게 한다. */
function createGrandBreachRoomPacks(zone,map) {
    const throne=map.rooms.find(room=>room.role==='boss');
    const bossPack=placeExplorationBoss(map,throne,createActExplorationPack(zone,throne,0));
    if(map.grandBreach)return [bossPack];
    const breach=chainRoomsOf(map)[0],rule=GRAND_BREACH_ENCOUNTER;
    const opening=Array.from({length:rule.openingPack},(_,index)=>createEnemy(zone,{elite:index%4===0 && index/4<rule.eliteLimit,boss:false},index));
    return [createRoomPackOf(map,breach,opening),bossPack];
}
/** New runs fight in one arena; only an active old save still has separate breach and lord rooms. */
function getGrandBreachArena(zone) {
    if(!actExplorationState.current(game) && !zone.exploration)return null;
    if(!actExplorationState.current(game))startEncounterRun();
    const run=actExplorationState.current(game),map=actExplorationMap.forRun(run);
    if(map.grandBreach)return {run,map,arena:map.grandBreach.arena,portals:map.grandBreach.riftCells,inside:true,singleRoom:true};
    const breach=chainRoomsOf(map)[0];
    const woke=!run.packs.some(pack=>pack.roomId===breach.id && pack.waiting.length);
    return {run,map,arena:breach,portals:grandBreachRoomPortals(breach),inside:woke && actExplorationRooms.roomAt(map,game.gridPlayer)===breach};
}
/** Saved three-room runs keep their old portal positions until that run ends. */
const grandBreachRoomPortals=room=>[{gx:room.x0+1,gy:room.y0+1},{gx:room.x1-1,gy:room.y0+1},{gx:Math.round(room.gx),gy:room.y1-1}];
/** At the kill target, remove surviving horde members and their already released attacks before the lord appears. */
function retireGrandBreachHordeAttacks() {
    for(let i=pendingEnemyCombatAttacks.length-1;i>=0;i--)dropEnemyAttack(i,getCombatTime());
}
/** 목표 처치 수에 닿으면 잔여 적을 걷고 같은 아레나에 군주를 세운다. */
function placeGrandBreachBoss(battlefield,boss) {
    const {run,map}=battlefield;
    retireGrandBreachHordeAttacks();
    game.enemies=[];
    for(const pack of run.packs)Object.assign(pack,{waiting:[],aliveIds:[],eliteIds:[]});
    fillRoomPack(map,map.rooms.find(room=>room.role==='boss'),run.packs.find(pack=>pack.stage===0),[boss]);
    delete run.sealed;
}
/** 벌집 원정이 방 단위 지도를 걷고 있으면 그 탐험, 판에서 싸우면 null. */
function getBeehiveRoomRun() {
    const run=actExplorationState.current(game);
    return run && run.rooms && game.currentZoneId==='beehive_run' ? run : null;
}
/** 방금 만든 벌떼(또는 여왕)를 벌집 지도의 방에 세운다: 벌떼는 입구에서 step번째 방, 여왕은 여왕의 방. 주인공이 그 방에 들어서면 덤빈다. */
function placeBeehiveRoomWave(run,enemies,step,isBoss) {
    const map=actExplorationMap.forRun(run),roomId=isBoss?map.route[map.route.length-1]:map.route[Math.min(step,map.route.length-2)];
    const room=map.rooms.find(row=>row.id===roomId),pack=run.packs.find(row=>row.roomId===roomId);
    const cells=explorationPackFormation.spots(room,enemies.length);
    enemies.forEach((enemy,index)=>Object.assign(enemy,cells[index],{gridMoveTimer:0,regenBank:0,spawnStamp:0,explorationPack:pack.key}));
    if(!isBoss) {
        const entry=stageRoomArranger.forMap(map).front(room),flank=[0,-1,1][(step-1)%3];
        const dx=entry.gx-room.gx,dy=entry.gy-room.gy;
        const [fx,fy]=Math.abs(dx)>=Math.abs(dy)?[Math.sign(dx),0]:[0,Math.sign(dy)];
        // A ranking anchor, never a spawn cell: alternate the rear flank without moving or adding any occupied tile.
        explorationPackFormation.placeRanks(enemies,{front:{gx:room.gx+3*(fx-fy*flank),gy:room.gy+3*(fy+fx*flank)}});
    }
    Object.assign(pack,{waiting:enemies,aliveIds:enemies.map(enemy=>enemy.id),eliteIds:enemies.filter(enemy=>enemy.isElite).map(enemy=>enemy.id)});
    if(isBoss)placeExplorationBoss(map,room,pack);
}
/** 아직 정산하지 않은 벌집의 적: 체력 0도 사망 정산 전에는 남겨 센다. 방에서 기다리는 여왕은 제 차례에 센다. */
function countBeehiveWaveAlive() {
    const fighting=(game.enemies||[]).length,run=getBeehiveRoomRun();
    if(!run)return fighting;
    return fighting+run.packs.filter(pack=>pack.stage===null || game.beehive.queenActive).reduce((sum,pack)=>sum+pack.waiting.length,0);
}

/** 케르베로스의 세 단계. 머리의 기존 생명력·경험치·드랍 몫을 먼저 굴린 뒤 한 몸에 합친다. */
const CERBERUS_STAGES=Object.freeze([
    Object.freeze({heads:['cold','fire'],boss:'fire',atk:1.7,crit:0}),
    Object.freeze({heads:['phys'],boss:'phys',atk:1.7,crit:14,headCrit:10}),
    Object.freeze({heads:[],boss:'phys',atk:2.1,crit:14,hybrid:'chaos'})
]);
/** 머리의 수치·보상 기록과 본체를 만든다. 정예 기록은 전투에 올리지 않고 joinCerberus가 합친다. */
function cerberusStageCast(stage) {
    const dressCerberus=(enemy,ele,body=false)=>{
        const visual=body?'s6_beast_cerberus':ele==='phys'?'cerberus-fang':'cerberus-head';
        Object.assign(enemy,{monsterVisualId:visual,spriteVariantId:null,bossAssetKey:null,monsterVisualSetId:null,ele});
        assignEnemyGridCombatProfile(enemy);
        // 근접 보스는 기존 투사체 대기 시간이 없어져 빨라지는 충전 속도를 보정한다.
        if(enemy.isBoss && enemy.attackKind==='melee')enemy.attackSpeedVar*=0.8;
    };
    const rule=CERBERUS_STAGES[stage];
    const heads=rule.heads.map((ele,i)=>({marker:{boss:false,elite:true,storyStage:null},dress:enemy=>{
        Object.assign(enemy,{name:_t('👿 케르베로스 머리 {value}', { value: rule.heads.length+1-i }),ele});
        enemy.atkMul*=1.55;enemy.penetration+=12;enemy.critChance+=rule.headCrit||0;
    }}));
    return heads.concat({marker:{boss:true},dress:enemy=>{
        Object.assign(enemy,{name:'👿 야수왕 케르베로스',ele:rule.boss,hybridElement:rule.hybrid||enemy.hybridElement});
        dressCerberus(enemy,rule.boss,stage===2);
        enemy.atkMul*=rule.atk;enemy.penetration+=18;enemy.critChance+=rule.crit;
    }});
}
/** 보스 방의 한 단계. 케르베로스도 몸·이동·타격 판정이 하나인 보스다. */
function createExplorationBossStage(zone,map,room,stage) {
    // 나무꾼의 잔상: 보스 방에 서는 것은 혼돈 밖의 나무꾼으로 만든 허수아비다(판에서와 같다)
    if(zone.type==='woodsmanEcho')return placeExplorationBoss(map,room,createActExplorationPack(zone,room,stage,null,
        {cells:[{gx:room.gx,gy:room.gy}],cast:[{zone:getZone(OUTSIDE_CHAOS_ZONE_ID),marker:{at:0,boss:true},dress:dressWoodsmanEchoDummy}]}));
    if(zone.id!=='s6_beast_cerberus')return placeExplorationBoss(map,room,createActExplorationPack(zone,room,stage));
    const cast=cerberusStageCast(stage),cells=cast.map(()=>({gx:room.gx,gy:room.gy}));
    const pack=createActExplorationPack(zone,room,stage,null,{cells,cast});
    actExplorationState.joinCerberus(pack,[],map);
    return placeExplorationBoss(map,room,pack);
}

/** 방 단위 무대의 방 하나에 무리들이 서는 자리 (data/stage-view.js STAGE_ROOMS.layouts와 packShapes. 2026-10-13 밤, 검토: "추가 몹팩 위치도
 * 가운데 양옆으로 정해져 있어", 사용자: "규칙 상관없으니까 바꿔줘"). 방마다 자리 묶음 하나를 고르고, 무리마다 서는 꼴을 고른다.
 * 벽에 붙은 칸(문 안쪽 자리, 상자와 항아리가 서는 가장자리)에는 서지 않고, 같은 방의 다른 무리와 겹치지 않는다. 방을 여는 때에 한 번
 * 정한다(난수는 Math.random: 무리를 뽑는 것과 같다). 이어진 지도에서는 아무것도 바꾸지 않는다. */
const stageRoomArranger=(()=>{
    const SHAPES=Object.freeze({
        cluster:[[0,0],[-1,0],[0,1],[1,-1],[-1,-1],[1,1],[0,-1],[-1,1],[1,0]],
        line:[[0,0],[1,0],[-1,0],[2,0],[-2,0],[3,0],[-3,0],[4,0],[-4,0]],
        column:[[0,0],[0,1],[0,-1],[0,2],[0,-2],[1,0],[-1,0],[1,1],[-1,-1]],
        loose:[[0,0],[-2,0],[0,1],[2,-1],[-2,-1],[2,1],[0,-1],[-2,1],[2,0]]
    });
    function weightedPick(rows) {
        let roll=Math.random()*rows.reduce((sum,row)=>sum+row.weight,0);
        return rows.find(row=>(roll-=row.weight)<0) || rows[0];
    }
    /** 들어온 문(입구 쪽으로 가는 문)의 맞은편이 +가 되는 부호. 그 문이 위아래에 있으면 반반이다. */
    function farSign(map,room) {
        const back=map.hops[room.index][map.entry.index];
        if(back && back.side==='east')return -1;
        if(back && back.side==='west')return 1;
        return Math.random()<.5?1:-1;
    }
    function openRoom(map,room) {
        return {room,layout:weightedPick(STAGE_ROOMS.layouts),sign:farSign(map,room),taken:new Set()};
    }
    /** 자리 묶음의 slot번째 자리(칸): 뭉친 무리(가운데에서 한 칸)가 벽에 붙지 않는 범위 안에서. */
    function spotCentre(state,slot) {
        const room=state.room,[fx,fy]=state.layout.spots[slot%state.layout.spots.length];
        return {gx:room.gx+Math.round(fx*state.sign*Math.max(0,room.radiusX-3)),gy:room.gy+Math.round(fy*Math.max(0,room.radiusY-2))};
    }
    const ringAround=(at,ring)=>{
        const out=[];
        for(let dy=-ring;dy<=ring;dy++)for(let dx=-ring;dx<=ring;dx++)if(Math.max(Math.abs(dx),Math.abs(dy))===ring)out.push({gx:at.gx+dx,gy:at.gy+dy});
        return out;
    };
    /** want에서 가장 가까운, 벽에 붙지 않았고 아직 아무도 서지 않은 칸. */
    function freeCellNear(state,want) {
        const room=state.room,inner=cell=>cell.gx>room.x0 && cell.gx<room.x1 && cell.gy>room.y0 && cell.gy<room.y1;
        for(let ring=0;ring<=room.radiusX*2;ring++) {
            const cell=ringAround(want,ring).find(spot=>inner(spot) && !state.taken.has(spot.gx+','+spot.gy));
            if(cell){state.taken.add(cell.gx+','+cell.gy);return cell;}
        }
        return want;
    }
    function packCells(state,slot,count) {
        const centre=spotCentre(state,slot),shape=SHAPES[weightedPick(STAGE_ROOMS.packShapes).id];
        return Array.from({length:count},(_,index)=>{
            const [dx,dy]=shape[index] || [0,0];
            return freeCellNear(state,{gx:centre.gx+dx,gy:centre.gy+dy});
        });
    }
    /** 지도 하나의 무리 자리를 정하는 것: cells(room, slot, count)는 그 방의 slot번째 무리(0 = 원래 무리, 1부터 덧무리)가 설 칸들.
     * 이어진 지도에서는 null을 준다(전의 자리 그대로). */
    function forMap(map) {
        const states=new Map();
        const stateOf=room=>states.get(room.id) || states.set(room.id,openRoom(map,room)).get(room.id);
        return {cells:(room,slot,count)=>(map.stage?packCells(stateOf(room),slot,count):null),front:room=>approach(map,room)};
    }
    /** 입구로 돌아가는 문을 전열 기준으로 삼는다. 새 경로 탐색 없이 지도의 기존 hops를 사용한다. */
    function approach(map,room) {
        return map.hops[room.index][map.entry.index]?.landing || map.entry;
    }
    return {forMap};
})();
/** 방의 원래 무리가 설 자리: 방 단위 무대에서는 그 방의 자리 묶음을 따른다(stageRoomArranger). 이어진 지도에서는 전의 자리 그대로다. */
function arrangedRoomFormation(arranger,zone,room,encounter,formation) {
    const cells=arranger.cells(room,0,explorationPackFormation.count(zone,encounter,formation));
    return cells ? {...formation,cells,front:arranger.front(room)} : formation;
}

/** Packs beside the one each room has: the quiet-road group, and on a room-by-room stage the packs added to every room. */
/** keep: a room left to its own scene (the first start's rescue room, starterRescueRoom): no patrol and no extra packs there. */
function createAddedExplorationPacks(zone,map,patrol,arranger,keep) {
    const packs=patrol && patrol.roomId!==keep?.id?[createActExplorationPack(zone,map.rooms.find(room=>room.id===patrol.roomId),null,null,patrol)]:[];
    return map.stage?packs.concat(createStageExtraPacks(zone,map,arranger,keep)):packs;
}

/** 방 단위 무대의 방마다 더 서는 무리(data/stage-view.js STAGE_ROOMS.extraPacks, 2026-10-13 사용자: "한 방에 몬스터 한무리~1.5무리
 * 정도 더"): 지역의 기본 무리 크기로(큰 방에 얹는 덧수는 원래 무리만 받는다), 방 가운데의 양옆에 선다(첫째는 보스 쪽, 둘째는 입구 쪽). 열쇠는 "방:extra1", "방:extra2".
 * 정예는 없고 생김새는 열쇠마다 다르게 뽑힌다. 방에 들어서면 방 안을 모두 보므로 원래 무리와 함께 덤빈다. */
function createStageExtraPacks(zone,map,arranger,keep) {
    const rule=STAGE_ROOMS.extraPacks,packs=[];
    for(const room of actExplorationState.packRooms(map).filter(row=>row!==keep)) {
        const more=rule.always+(Math.random()<rule.chance?1:0);
        // 자리는 그 방의 자리 묶음에서(2026-10-13 밤부터: 전에는 늘 방 가운데의 양옆이었다)
        for(let extra=1;extra<=more;extra++) {
            packs.push(createActExplorationPack(zone,room,null,null,{extra,cells:arranger.cells(room,extra,explorationPackFormation.count(zone,null,{extra})),front:arranger.front(room)}));
        }
    }
    return packs;
}

/** A boss stands on its room's centre with its footprint reaching away from the gate (2026-10-05 user request): the 2×2 body grows
 * right and down from its anchor, so on maps facing north or west it rose a tile further from the threshold than on the others,
 * at the screen's lower edge behind the HUD. A footprint that would leave the floor keeps the centre anchor. A boss as wide as its
 * picture (fitBossFootprint, 2026-10-16) keeps that 2×2 core where it was and grows its extra columns evenly on both sides; where
 * the wider body would leave the floor it goes back to 2×2. */
function placeExplorationBoss(map,room,pack) {
    for(const enemy of pack.waiting) {
        fitBossFootprint(enemy);
        if(!placeExplorationBossAt(map,room,enemy)&&enemy.footprint){delete enemy.footprint;placeExplorationBossAt(map,room,enemy);}
    }
    return pack;
}
function placeExplorationBossAt(map,room,enemy) {
    const gate=map.gate,size=getGridUnitFootprint(enemy),core=Math.min(2,size.columns);
    const cell={gx:room.gx-(gate.gx>room.gx?core-1:0)-Math.ceil((size.columns-core)/2),gy:room.gy-(gate.gy>room.gy?size.rows-1:0)};
    // Checked on the map itself: the grid bounds only cover the map once this run is the current one.
    const cells=Array.from({length:size.columns*size.rows},(_,i)=>({gx:cell.gx+i%size.columns,gy:cell.gy+Math.floor(i/size.columns)}));
    if(!cells.every(c=>actExplorationMap.walkable(map,c)))return false;
    Object.assign(enemy,cell);
    return true;
}

// Explicit false is retained for replaying legacy progress-based encounters in regression
// fixtures. Production callers use the zone default; saved legacy plans finish in place.
function startEncounterRun(exploration) {
    let zone = getZone(game.currentZoneId) || getZone(0);
    const opened=openEncounterExploration(zone,exploration),explorationRun=opened.run;
    let returnedToGridStart = opened.returning;
    pTimer = 0;
    resetCombatTacticsRuntime();
    resetCombatChannelRuntime();
    progressStallTicks = 0;
    game.runProgress = 0;
    game.encounterIndex = 0;
    // 재능 개화 미궁 보스 실제 처치 여부(이번 런 기준). 보스 처치 없이 런이 완료 처리되는 경우 개화를 막는다.
    game.bloomBossDefeated = false;
    if (typeof clearTalentCardRuntimeState === 'function') clearTalentCardRuntimeState();
    dispatchRuntimeEvent('encounter-started', {
        zoneId: zone.id,
        zoneType: zone.type,
        contentContext: getEncounterTelemetryContext(zone),
        background: !!game.isBackgroundCalculation
    });
    resetBattleRuntimeVisuals();
    game.actExploration=explorationRun;
    resetPlayerGridPosition();
    if (returnedToGridStart) {
        addBattleFx('playerReturnWarp', { duration: 720, cell: copyCombatGridCell(game.gridPlayer) });
    }
    restoreAndRecallSummons(getPlayerStats());
    primeTrialHazardTimer(zone);
    game.encounterPlan = explorationRun ? [] : generateEncounterPlan(zone);
    game.enemies = [];
    beginEncounterZoneRules(zone, explorationRun);
}
/** 전투가 열릴 때 거는 그 구역의 규칙. 혼돈 밖: 나무꾼의 저주(방 단위 지도에서는 나무꾼이 깨어날 때 걸린다: beginRoomBossRules).
 * 심해: 방 단위 지도에서는 이번 지도가 가디언의 투기장인지로 정산이 갈린다(판에서는 generateEncounterPlan이 적는다). */
function beginEncounterZoneRules(zone, explorationRun) {
    if (zone && zone.type === 'outsideChaos' && !explorationRun) startWoodsmanCurse();
    else resetWoodsmanCurse();
    if (zone && zone.type === 'oceanDepth') beginOceanRunRules(zone, explorationRun);
}
/** 심해 판이 열릴 때. 방 단위 지도: 이번 지도가 가디언의 투기장인지로 정산이 갈리고, 투기장은 영웅을 보스 방 문 안쪽에 세운다
 * (2026-10-19 사용자: "가디언 리프트에서 가디언 방으로 시작"). 판: generateEncounterPlan이 방금 적은 가디언 판은 진행 막대 끝 바로
 * 앞에서 시작해 다음 틱에 가디언이 선다(OCEAN_GUARDIAN_BOARD_START_PROGRESS). */
function beginOceanRunRules(zone, explorationRun) {
    if (!explorationRun) {
        if (game.oceanBossRunPending) game.runProgress = OCEAN_GUARDIAN_BOARD_START_PROGRESS;
        return;
    }
    game.oceanBossRunPending = !!explorationRun.source.arena;
    seatOceanGuardianArena(zone, explorationRun);
}
/** 심해 가디언 투기장은 영웅을 보스 방 문 안쪽에 세운다: 지도를 지을 때(이동하는 동안 빈 입구 방이 보이지 않게)와 판이 열릴 때. */
function seatOceanGuardianArena(zone, run) {
    if (zone && zone.type === 'oceanDepth' && run && run.source && run.source.arena) actExplorationDoors.startAtGate(run);
}

function startMoving(isTown) {
    cosmosRouteRuntime.reconcileDeparture(game);
    // End a run left behind before its floor owner clears unreleased loot and opens the destination.
    holdZoneBoundRuns(addLog);
    let returnDepartureCell = isTown && hasGridCell(game.gridPlayer)
        ? copyCombatGridCell(game.gridPlayer)
        : null;
    actExplorationProgress.depart(game);
    dispatchRuntimeEvent('movement-started', { background: !!game.isBackgroundCalculation });
    pTimer = 0;
    resetCombatTacticsRuntime();
    resetCombatChannelRuntime();
    progressStallTicks = 0;
    if (typeof clearTalentCardRuntimeState === 'function') clearTalentCardRuntimeState();
    resetBattleRuntimeVisuals();
    restoreAndRecallSummons(getPlayerStats());
    if (!isTown && hasKeystone('a2')) game.assassinBlurred = true;
    let ms = getPlayerStats().moveSpeed;
    if (!Number.isFinite(ms) || ms <= 0) ms = 100;
    let time = Math.max(0.5, 1.2 * (100 / ms));
    game.moveTotalTime = time;
    game.moveTimer = time;
    if (returnDepartureCell) {
        addBattleFx('playerReturnDepart', {
            duration: Math.max(500, Math.round(time * 1000)),
            cell: returnDepartureCell
        });
    }
    game.isTownReturning = !!isTown;
    game.combatHalted = false;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    game.playerAilments = [];
    game.playerLeechInstances = [];
    game.gladiatorSwiftOpeningReady = true;
    game.gladiatorSwiftGuardReady = true;
    game.woodsmanEntrancePending = false;
    resetWoodsmanCurse();
    let v = game.voidRift;
    if (v && v.active) {
        v.active = false;
        v.pendingWave = false;
        v.totalToSpawn = 0;
        v.spawnedCount = 0;
        v.defeatedCount = 0;
        v.spawnTick = 0;
    }
    prepareActExplorationArrival();
}

/** Moving into an explored zone (a story act, or a content with its own map) lays its map out at once: the travel
 * wait (다음 구간 준비 · 재정비) shows the entrance with the character standing in it instead of the legacy 9×8 board.
 * The run stays idle until the timer ends (actExplorationProgress.tick holds it while moveTimer > 0), then
 * startEncounterRun takes it over. */
function prepareActExplorationArrival() {
    const zone = getZone(game.currentZoneId);
    if (!zone || zone.id !== game.currentZoneId || !getZoneExplorationPlan(zone)) return;
    const run = createActExplorationEncounter(zone);
    run.arrival = true;
    game.actExploration = run;
    resetPlayerGridPosition();
    restoreAndRecallSummons(getPlayerStats());
    seatOceanGuardianArena(zone, run);
}
/** The act's exploration for a new encounter: the one laid out while moving here, else a new one (null outside acts).
 * returning: the character comes back from elsewhere on the board (the return warp plays), not already standing in it. */
function openEncounterExploration(zone,exploration) {
    const arrival=takeActExplorationArrival(zone,exploration);
    const returning=!arrival && hasGridCell(game.gridPlayer) && getGridUnitDistance(game.gridPlayer,COMBAT_GRID_CONFIG.playerSpawn)>0;
    return {run:arrival || createActExplorationEncounter(zone,exploration),returning};
}
/** The run laid out while moving here, if this encounter starts in the same act. */
function takeActExplorationArrival(zone, exploration) {
    const run = game.actExploration;
    if (exploration === false || !run || !run.arrival || run.zoneId !== zone.id) return null;
    delete run.arrival;
    return run;
}

/** Called by the existing fixed combat clock; offline resumes a saved exit without visual delay. */
function advanceActExplorationDeparture() {
    const run=actExplorationState.current(game),departure=run?.departure;
    if(!departure)return false;
    departure.remainingMs=game.isBackgroundCalculation ? 0 : Math.max(0,departure.remainingMs-100);
    if(departure.remainingMs>0)return true;
    const zone=getZone(game.currentZoneId);
    game.currentZoneId=departure.zoneId;
    actExplorationProgress.depart(game);
    enterAutomaticMapInterruptionAfterClear(zone);
    if(game.settings.townReturnAction==='stop'){actExplorationProgress.stopAfterCompletion(game);prepareActExplorationArrival();}
    else startMoving(false);
    dispatchRuntimeEvent('exploration-departed',{background:!!game.isBackgroundCalculation});
    return true;
}

function finishTownReturnAction() {
    let action = (game.settings && game.settings.townReturnAction) || 'retry';
    if (action !== 'stop') return false;
    game.combatHalted = true;
    game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
    updateStaticUI();
    return true;
}


function returnToTown() {
    if (game.isTownReturning && game.moveTimer > 0) return;
    const returningFromRun = ['grand_breach_run', 'colony_run'].includes(game.currentZoneId);
    const run = game.currentZoneId === 'grand_breach_run' ? game.voidRift.grandRun : game.colony;
    if (returningFromRun) game.currentZoneId = run?.returnZoneId ?? getAutoProgressZoneId(game.maxZoneId);
    leaveWoodsmanEchoForTown();
    atlasRun.leave('마을 귀환');
    cosmosRouteRuntime.leave(game);
    let pStats = getPlayerStats();
    game.playerHp = getPlayerHpCap(pStats);
    game.playerEnergyShield = Math.floor(pStats.energyShield || 0);
    game.playerLeechInstances = [];
    pTimer = 0;
    addLog(_t('⛺ 마을 귀환'), "season-up");
    startMoving(true);
    updateStaticUI();
    if (returningFromRun) queueImportantSave(200);
}

/** 전술 규칙의 마을 귀환(예전 귀환 룬): 규칙은 열린 지도의 마지막 포털을 쓰지 않는다(죽지 않고 지도가 닫히므로). */
function returnToTownByRule() {
    if (!atlasRun.lastPortal()) returnToTown();
}

let returnRuleReadyAt = 0;
/** Enabled 'return_town' rules: the first whose trigger holds sends the hero home, then the action's cooldown runs. */
function runReturnRules(pStats, now = getCombatTime()) {
    const action = CONDITION_PATTERN_ACTION_DB.find(row => row.id === 'return_town');
    const wait = returnRuleReadyAt - now;
    if (!game.combatTacticsUnlocked || (wait > 0 && wait <= action.cooldownMs)) return;
    const rules = (game.skillAutoRules || []).filter(rule => rule && rule.enabled && rule.actionType === 'return_town');
    if (!rules.some(rule => evaluateConditionPatternRule(rule, pStats, game, now))) return;
    returnRuleReadyAt = now + action.cooldownMs;
    returnToTownByRule();
}

function ensureEncounterRun() {
    if(actExplorationState.current(game))return;
    if(waveOwnsProgressPlan())return;
    if(game.combatHalted && isSkyTowerAtRewardLimit(getZone(game.currentZoneId))) {
        prepareActExplorationArrival();
        return;
    }
    if (game.moveTimer <= 0 && (!game.encounterPlan || game.encounterPlan.length === 0)) startEncounterRun();
    // Board waves own an empty plan. The hive reconciles stale flags; the colony resumes or fills its wave in tickColonyRun.
    function waveOwnsProgressPlan() {
        if(game.currentZoneId==='colony_run')return !!game.colony?.inRun;
        return game.currentZoneId==='beehive_run' && isBeehiveRunLockedForMapTravel();
    }
}

function isRegularAutoProgressZone(zone) {
    if (!zone) return false;
    if (zone.id === 'beehive_run' || zone.id === 'colony_run' || zone.id === 'grand_breach_run') return false;
    if (typeof zone.id === 'string' && zone.id.includes('_boss_')) return false;
    return ['act', 'abyss', 'trial', 'meteor', 'labyrinth', 'chaosRealm', 'skyTower'].includes(zone.type);
}
function reconcileMapProgressRuntimeState() {
    if(actExplorationState.current(game))return false;
    if (typeof reconcileBeehiveRunState === 'function') reconcileBeehiveRunState();
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (!isRegularAutoProgressZone(zone)) return false;
    let changed = false;
    let explicitStop = isCombatProgressStopped(zone);
    if (game.inTicketBossFight) {
        game.inTicketBossFight = false;
        changed = true;
    }
    if (game.combatHalted && !explicitStop) {
        game.combatHalted = false;
        changed = true;
    }
    if (game.combatHalted) return changed;
    if (game.moveTimer <= 0 && game.runProgress <= 0) {
        let hasPlan = Array.isArray(game.encounterPlan) && game.encounterPlan.length > 0;
        let liveEnemies = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0).length;
        if (liveEnemies > 0 && !hasPlan && Math.max(0, Math.floor(game.encounterIndex || 0)) === 0) {
            game.enemies = [];
            changed = true;
        }
        if (!hasPlan) {
            startEncounterRun();
            changed = true;
        }
    }
    return changed;
}

function spawnEncounterMarker(marker) {
    let zone = getZone(game.currentZoneId);
    let count = marker.count || 1;
    if (!hasGridCell(game.gridPlayer)) resetPlayerGridPosition();
    let blockedCells = getGridBlockedCells();
    if (marker.boss) {
        for (let i = 0; i < Math.max(0, count - 1); i++) {
            let enemy = createEnemy(zone, { ...marker, boss: false, elite: true }, i);
            assignEnemyGridSpawn(enemy, blockedCells);
            enemy.spawnStamp = getBattleSpawnStamp();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 360, boss: false });
        }
        let bossEnemy = createEnemy(zone, { ...marker, count: 1, storyStage: game.killsInZone }, count);
        assignEnemyGridSpawn(bossEnemy, blockedCells);
        bossEnemy.spawnStamp = getBattleSpawnStamp();
        game.enemies.push(bossEnemy);
        addBattleFx('enemySpawn', { enemyId: bossEnemy.id, color: getElementColor(bossEnemy.ele), duration: 460, boss: true });
        if (game.settings.showSpawnLog !== false) {
            addLog(_t("👑 '{replace}' 등장.", { replace: bossEnemy.name.replace(/^👿\s*/, '') }), "loot-unique");
        }
    } else {
        for (let i = 0; i < count; i++) {
            let enemy = createEnemy(zone, marker, i);
            assignEnemyGridSpawn(enemy, blockedCells);
            enemy.spawnStamp = getBattleSpawnStamp();
            game.enemies.push(enemy);
            addBattleFx('enemySpawn', { enemyId: enemy.id, color: getElementColor(enemy.ele), duration: 320, boss: false });
        }
        if (game.settings.showSpawnLog !== false) addLog(_t('⚠️ 적 {count}마리 참전', { count }), marker.elite ? "loot-rare" : "attack-monster");
    }
}

function getMapProgressGainMultiplier(zone) {
    return zone && zone.type === 'seasonBoss' ? 2 : 1;
}

/** 자체 진행 콘텐츠의 한 틱(대균열의 처치 게이지, 나무꾼의 잔상의 30초). @returns 이번 틱의 진행이 여기서 끝나는가: 판에서는 언제나
 * 끝나고, 방 단위 지도를 걷고 있으면 걸음이 이어서 돈다(advanceMapProgress). */
function tickOwnClockRun(zone) {
    if (zone.id === 'grand_breach_run') tickGrandBreachRun(zone);
    else if (zone.type === 'woodsmanEcho') tickWoodsmanEchoRun();
    else return false;
    return !actExplorationState.current(game);
}

function advanceMapProgress(pStats) {
    if (game.moveTimer > 0) return;
    let zone = getZone(game.currentZoneId) || getZone(0);
    if (zone && zone.type === 'outsideChaos' && game.woodsmanEntrancePending) return;
    if (zone && zone.id === 'beehive_run' && game.beehive && game.beehive.inRun) return;
    if (zone && tickOwnClockRun(zone)) return;
    ensureEncounterRun();
    if(actExplorationProgress.advance(pStats))return;
    if (game.runProgress >= 100) return;
    if (isCrowdProgressPaused()) return;
    let abyssScale = getAbyssMonsterScales(zone);
    let enemyCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let zoneType = zone ? zone.type : 'act';
    let baseGain = ({trial:0.26,abyss:0.42,skyTower:0.072})[zoneType] ?? 0.36;
    let crowdPenalty = enemyCount > 0 ? Math.max(0.4, 1 - enemyCount * 0.13) : 0.94;
    let emptyTravelMultiplier = enemyCount === 0 ? EMPTY_TRAVEL_PROGRESS_MULTIPLIER : 1;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let gain = baseGain * 0.5 * (moveSpeed / 100) * crowdPenalty * emptyTravelMultiplier
        * (abyssScale.mapProgressMul || 1) * getMapProgressGainMultiplier(zone);
    game.runProgress = Math.min(100, game.runProgress + gain);
    while (game.encounterIndex < game.encounterPlan.length && game.runProgress >= game.encounterPlan[game.encounterIndex].at) {
        spawnEncounterMarker(game.encounterPlan[game.encounterIndex]);
        game.encounterIndex++;
    }
}


function ensureWoodsmanEchoRunState() {
    game.woodsmanEchoRun = (game.woodsmanEchoRun && typeof game.woodsmanEchoRun === 'object') ? game.woodsmanEchoRun : {};
    let run = game.woodsmanEchoRun;
    run.active = !!run.active;
    run.duration = 30;
    run.timeLeft = Math.max(0, Number(run.timeLeft || 0));
    run.lastTickAt = Math.max(0, Math.floor(run.lastTickAt || 0));
    run.totalDamage = Math.max(0, Math.floor(run.totalDamage || 0));
    run.bestDps = Math.max(0, Number(run.bestDps || 0));
    return run;
}
/** Where the echo sends the hero back: where it was started (js/state.js getContentReturnZoneId), or the auto progress zone for a run
 * saved before 2026-10-20. It went to the chaos realm every time and never asked the realm's entry (this loop's chaos 20): a new
 * loop's level 1 hero fought the realm's floor 6 there. */
function takeWoodsmanEchoReturnZone(run) {
    const back = run.returnZoneId;
    run.returnZoneId = null;
    return back !== undefined && back !== null ? back : getAutoProgressZoneId(game.maxZoneId);
}
/** 귀환은 측정 완료가 아니다. 기록을 남기지 않고 출발한 지역의 재정비 흐름으로 돌아간다. */
function leaveWoodsmanEchoForTown() {
    if (game.currentZoneId !== WOODSMAN_ECHO_ZONE_ID) return;
    const run = ensureWoodsmanEchoRunState();
    run.active = false;
    run.timeLeft = 0;
    actExplorationProgress.depart(game);
    game.currentZoneId = takeWoodsmanEchoReturnZone(run);
}
function finishWoodsmanEchoRun() {
    let run = ensureWoodsmanEchoRunState();
    if (!run.active || game.currentZoneId !== WOODSMAN_ECHO_ZONE_ID) return;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (getCombatTime() - run.lastTickAt) / 1000));
    let elapsed = Math.max(0.1, run.duration - run.timeLeft);
    let dps = run.totalDamage / elapsed;
    run.bestDps = Math.max(run.bestDps || 0, dps);
    run.active = false;
    run.timeLeft = 0;
    game.enemies = [];
    game.combatHalted = false;
    actExplorationProgress.depart(game);
    game.currentZoneId = takeWoodsmanEchoReturnZone(run);
    recordWoodsmanEchoRun(run.totalDamage, dps, game, elapsed);
    addLog(_t('🪵 나무꾼의 잔상: 총 피해 {floor}, 최종 DPS {floor2} (최고 {floor3})', { floor: Math.floor(run.totalDamage).toLocaleString(), floor2: Math.floor(dps).toLocaleString(), floor3: Math.floor(run.bestDps).toLocaleString() }), 'season-up');
    updateStaticUI();
}
/** 잔상의 30초가 흐르는가. 방 단위 지도에서 잔상이 아직 제 방에서 기다리면 흐르지 않는다: 주인공이 그 방에 닿아 잔상이 일어설 때까지
 * 시계를 지금으로 당겨 둔다. */
function isWoodsmanEchoClockRunning(run) {
    const rooms = actExplorationState.current(game);
    if (!run.active) return false;
    if (!rooms || !rooms.packs.some(pack => pack.waiting.length > 0)) return true;
    run.lastTickAt = getCombatTime();
    return false;
}
function tickWoodsmanEchoRun() {
    let run = ensureWoodsmanEchoRunState();
    if (!isWoodsmanEchoClockRunning(run)) return;
    let now = getCombatTime();
    run.lastTickAt = Number.isFinite(run.lastTickAt) && run.lastTickAt > 0 ? run.lastTickAt : now;
    run.timeLeft = Math.max(0, run.timeLeft - Math.max(0, (now - run.lastTickAt) / 1000));
    run.lastTickAt = now;
    let target = (game.enemies || []).find(e => e && e.hp > 0);
    if (target) run.totalDamage = Math.max(0, Math.floor((target.echoStartHp || target.maxHp || 0) - Math.max(0, target.hp || 0)));
    if (run.timeLeft <= 0) finishWoodsmanEchoRun();
}
/** Append at most one reinforcement; capacity pauses the queue without consuming it.
 * @param {ReturnType<typeof getZone>} zone
 * @param {{pendingWave:boolean,spawnedCount:number,totalToSpawn:number,spawnTick:number}} rift Active run, mutated in place.
 * @returns {boolean} Whether an enemy was appended.
 */
function spawnVoidBreachReinforcement(zone, rift) {
    const alive = game.enemies.filter(e => e.hp > 0);
    if (!rift.pendingWave || rift.spawnedCount >= rift.totalToSpawn || alive.length >= 8
        || alive.filter(e => e.fromVoidRift).length >= 4) return false;
    rift.spawnTick++;
    if (rift.spawnTick < 4) return false;
    rift.spawnTick = 0;
    const index = rift.spawnedCount;
    const marker = { at: Math.max(5, Math.min(95, 10 + index * 8)), elite: Math.random() < 0.18, boss: false };
    const enemy = createEnemy(zone, marker, index + 1);
    enemy.fromVoidRift = true;
    applyVoidRiftMobTuning(enemy);
    game.enemies.push(enemy);
    ensureCombatGridRuntime();
    rift.spawnedCount++;
    return true;
}

/** Split each wave across the rifts. A crowded rift tries another before losing that spawn. */
function grandBreachSpawnCell(deployment, offset, blocked) {
    const {portals,arena,radius}=deployment;
    for (let step = 0; step < portals.length; step++) {
        const portal = portals[(offset + step) % portals.length], cell = findFreeGridCell(blocked, portal);
        if (!cell) continue;
        if (arena && (cell.gx < arena.x0 || cell.gx > arena.x1 || cell.gy < arena.y0 || cell.gy > arena.y1)) continue;
        if (radius && Math.max(Math.abs(cell.gx - portal.gx), Math.abs(cell.gy - portal.gy)) > radius) continue;
        return cell;
    }
    return null;
}
function spawnGrandBreachEnemy(zone, deployment, blocked, elite, index) {
    const cell = grandBreachSpawnCell(deployment, index % deployment.portals.length, blocked);
    if (!cell) return false;
    const enemy = createEnemy(zone, {elite,boss:false}, index);
    Object.assign(enemy, cell, {gridMoveTimer:0.25,attackTimer:0,spawnStamp:getBattleSpawnStamp()});
    blocked.add(gridCellKey(cell.gx,cell.gy));
    game.enemies.push(enemy);
    return true;
}

function grandBreachWaveSize(run, config, alive) {
    const stage=getGrandBreachProgress(run.gauge).stage;
    return Math.min(alive.length === 0 ? config.openingPack : config.refillPack, config.capacities[stage] - alive.length);
}
function deployGrandBreachWave(zone, deployment, config, alive, count) {
    const blocked = getGridBlockedCells();
    let elites = alive.filter(e => e.isElite).length;
    for (let i = 0; i < count; i++) {
        const elite = elites < config.eliteLimit && i % 4 === 0;
        if (!spawnGrandBreachEnemy(zone,deployment,blocked,elite,i)) break;
        elites += Number(elite);
    }
}
/** The next arena wave keeps its two announced mouths until release, even across a gauge-stage boundary.
 * First entries and old saves without a plan use their existing all-mouth wave once. The old three-room route has no plan. */
function planGrandBreachRefill(run, battlefield, previous) {
    if (!battlefield?.singleRoom) { delete run.refillPlan; return; }
    const pairs=GRAND_BREACH_ENCOUNTER.arena.portalPairs[getGrandBreachProgress(run.gauge).stage];
    const turn=previous && previous.turn < Number.MAX_SAFE_INTEGER ? previous.turn+1 : 0;
    run.refillPlan={portalIndices:[...pairs[turn%pairs.length]],at:run.nextRefillAt,turn};
}
function grandBreachWaveDeployment(battlefield, plan, radius) {
    const portals=battlefield?.portals || GRAND_BREACH_ENCOUNTER.portals;
    return {portals:plan ? plan.portalIndices.map(index=>portals[index]) : portals,arena:battlefield?.arena,radius};
}
/** Append one bounded pack. Missed refill intervals are not replayed as a burst.
 * @param {ReturnType<typeof getZone>} zone
 * @param {{kills:number,nextRefillAt?:number,refillPlan?:{portalIndices:number[],at:number,turn:number}}} run Combat-clock wave plan; mutated in place.
 * @param {number} now Combat clock milliseconds.
 * @param {?object} battlefield 단일 아레나 또는 구 저장의 전투 공간. 판 전투면 null.
 */
function refillGrandBreachWave(zone, run, now, battlefield) {
    if (!grandBreachRefillReady(run,now)) return;
    const config = battlefield?.singleRoom ? GRAND_BREACH_ENCOUNTER.arena : GRAND_BREACH_ENCOUNTER;
    const alive = game.enemies.filter(e => e.hp > 0);
    const count = grandBreachWaveSize(run, config, alive);
    const plan=battlefield?.singleRoom ? run.refillPlan : null;
    const deployment=grandBreachWaveDeployment(battlefield,plan,config.spawnRadius);
    if (count > 0) deployGrandBreachWave(zone,deployment,config,alive,count);
    // Saturated or blocked waves expire too: no spawn debt, and the warning is inside the same 900 ms interval.
    run.nextRefillAt = now + config.intervalMs;
    planGrandBreachRefill(run,battlefield,plan);
}
function grandBreachRefillReady(run,now) {
    return run.phase==='survival' && !getGrandBreachProgress(run.gauge).complete && now>=(run.nextRefillAt||0);
}

function grandBreachSurvivalReady(run, battlefield) {
    if (run.phase !== 'survival' || !battlefield || run.survivalStarted) return true;
    run.survivalStarted = battlefield.singleRoom || battlefield.inside;
    return run.survivalStarted;
}
function summonGrandBreachLord(zone, run, battlefield) {
    delete run.refillPlan;
    const boss=createEnemy(zone,{boss:true,count:1},0),soul=Math.max(0,Math.floor(run.kills||0));
    tuneGrandBreachLord(boss,soul);
    if(battlefield)placeGrandBreachBoss(battlefield,boss);
    else {retireGrandBreachHordeAttacks();game.enemies=[boss];}
    run.phase='boss';
    return soul;
}
/** The survival deadline on the combat clock, set when the fight begins (old runs get the full time on their next tick). */
function grandBreachTimeUp(run, now) {
    if (!Number.isFinite(run.survivalEndsAt)) run.survivalEndsAt = now + GRAND_BREACH_ENCOUNTER.survivalLimitSeconds * 1000;
    return now >= run.survivalEndsAt;
}
/** The lord was not called in time: the attempt fails as a defeat does (its held loot is lost), without a death or its penalty. */
function failGrandBreachTimeUp(zone) {
    delete game.voidRift.grandRun.refillPlan;
    actExplorationProgress.defeat(game);
    defeatInGrandBreach(zone, _t('⌛ {value}분 안에 균열 군주를 부르지 못해 대균열이 닫혔습니다.', { value: GRAND_BREACH_ENCOUNTER.survivalLimitSeconds / 60 }), {}, { say: addLog });
    actExplorationProgress.depart(game);
    resetBattleRuntimeVisuals();
    game.combatHalted=false;
    pendingHeavyUiRefresh=true;
    queueImportantSave(200);
}
function tickGrandBreachRun(zone) {
    let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let g = v.grandRun;
    if (g && (g.phase!=='survival' || !g.inRun)) delete g.refillPlan;
    if (!g || !g.inRun) return;
    let now = getCombatTime();
    const battlefield = getGrandBreachArena(zone);
    expireConditionEffects(now);
    if (!grandBreachSurvivalReady(g, battlefield)) return;
    if (g.phase === 'survival') {
        if(getGrandBreachProgress(g.gauge).complete)g.phase='bossPending';
        else if(grandBreachTimeUp(g,now)){failGrandBreachTimeUp(zone);return;}
        else refillGrandBreachWave(zone,g,now,battlefield);
    }
    if(g.phase==='bossPending') {
        const soul=summonGrandBreachLord(zone,g,battlefield);
        addLog(_t('🕳️ 균열 몬스터 {soul}처치! 균열 군주가 출현합니다. 군주의 힘과 격파 보상은 처치 수에 따라 증가합니다.', { soul }), 'loot-unique');
    }
}

/** The more rift creatures killed, the stronger the lord and the better the clear reward. */
function tuneGrandBreachLord(boss, kills) {
    const pressure = Math.min(6, Math.floor(Math.max(0, kills) / 10));
    boss.name = '👿 균열 군주';
    boss.ele = 'chaos';
    boss.maxHp = Math.max(1, Math.floor(boss.maxHp * (1 + pressure * 0.06)));
    boss.hp = boss.maxHp;
    boss.damageMul *= 1 + pressure * 0.05;
    boss.penetration += pressure * 2;
    boss.traitName = _t('공허 압박 {pressure}단계 (균열 몬스터 {kills}처치)', { pressure, kills });
    return boss;
}

safeExposeGlobals({ isRegularAutoProgressZone, reconcileMapProgressRuntimeState, startEncounterRun, startMoving, returnToTown, ensureEncounterRun, advanceMapProgress });
