import { packChainRoomsOf, packEmptiedExplorationPack } from './exploration-pack-rules.mjs';
import { packCreateRoomPackOf, packPlaceExplorationBoss } from './exploration-pack-placement.mjs';
import { packCreateActExplorationPack } from './exploration-pack-create.mjs';

// c.owner is the current game state, supplied for each call; deps are legacy domain services.
/** 케르베로스의 세 단계. 머리의 기존 생명력·경험치·드랍 몫을 먼저 굴린 뒤 한 몸에 합친다. */
export const CERBERUS_STAGES=Object.freeze([
    Object.freeze({heads:['cold','fire'],boss:'fire',atk:1.7,crit:0}),
    Object.freeze({heads:['phys'],boss:'phys',atk:1.7,crit:14,headCrit:10}),
    Object.freeze({heads:[],boss:'phys',atk:2.1,crit:14,hybrid:'chaos'})
]);

/** 판의 표식 하나가 부르던 적들(spawnEncounterMarker와 같은 표식, 같은 차례로 만든다): 보스 표식은 곁의 정예들과 보스. */
export function packCreateMarkerEnemies(c, zone, marker) {
    const count=marker.count||1;
    if(marker.boss){
        const adds=Array.from({length:count-1},(_,index)=>c.deps.createEnemy(zone,{...marker,boss:false,elite:true},index));
        return adds.concat(c.deps.createEnemy(zone,{...marker,count:1,storyStage:c.owner.killsInZone},count));
    }
    const escort=zone.type==='cosmos' && zone.cosmosHabitat==='guard' && marker.elite && count===2;
    return Array.from({length:count},(_,index)=>c.deps.createEnemy(zone,
        escort && index===0?{...marker,packVisualId:'cosmos-ooze'}:marker,index));
}

/** 진행 막대의 무리들을 한 줄 지도에 세운다(2026-10-13 밤: 우주계, 심해, 경계 너머). 판에서 진행도에 따라 차례로 나타나던 무리가 방마다
 * 하나씩 서고, 마지막 무리는 끝 방에 선다. 방보다 무리가 많으면(STAGE_BOARD_ROOMS.chainMax) 끝 방 앞의 방에 겹쳐 선다. */
export function packCreateMarkerRoomPacks(c, zone, map) {
    const markers=c.deps.generateEncounterPlan(zone),rooms=packChainRoomsOf(map),last=rooms.length-1,groups=rooms.map(()=>[]),arranger=c.deps.arranger.forMap(map);
    const guard=zone.type==='cosmos' && zone.cosmosHabitat==='guard';
    markers.forEach((marker,index)=>groups[index===markers.length-1?last:Math.min(index,last-1)].push(marker));
    const packs=rooms.map((room,index)=>{
        if(!groups[index].length && index!==last)return packEmptiedExplorationPack(room);
        const enemies=groups[index].flatMap(marker=>packCreateMarkerEnemies(c, zone,marker));
        // 끝 방의 무리(보스가 있으면 보스 둘레)는 방 가운데에, 그 앞의 방들은 방마다 다른 자리에 선다
        const pack=packCreateRoomPackOf(c, map,room,enemies,index===last?null:arranger.cells(room,0,enemies.length));
        // Only a new two-member guard marker trades its existing cells; saved packs and boss escorts keep their placement.
        if(guard && groups[index].length===1 && !groups[index][0].boss && groups[index][0].elite && enemies.length===2)
            c.deps.formation.placeRanks(enemies,{front:arranger.front(room)});
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
            c.deps.formation.placeRanks(pack.waiting,{front:arranger.front(rooms[packs.indexOf(pack)])});
        });
    }
}

/** 벌집 전용 지도의 무리(2026-10-13 사용자: "벌집전용지도 만들던가"): 벌집 방은 모두 비어 있고, 갈림길을 고를 때마다 다음 방에 그
 * 벌떼가 선다(placeBeehiveRoomWave). 여왕의 방에는 여왕이 처음부터 서 있어 탐험이 먼저 끝나지 않는다: 마지막 갈림길 뒤에 그때의
 * 강화 수치로 다시 만든다. */
export function packCreateBeehiveRoomPacks(c, zone, map) {
    return map.rooms.filter(room=>room.role!=='entry').map(room=>room.role==='boss'
        ? packPlaceExplorationBoss(c, map,room,packCreateActExplorationPack(c, zone,room,0, {})) : packEmptiedExplorationPack(room));
}

/** One empty stage keeps the defense arena active without creating a map boss or an automatic clear. */
export function packCreateColonyDefenseRoomPacks(c, zone, map) {
    if(!map.colonyDefense)return packCreateBeehiveRoomPacks(c, zone,map);
    return map.rooms.filter(room=>room.role==='boss').map(room=>packCreateRoomPackOf(c, map,room,[]));
}

/** 단일 대균열 아레나의 군주 자리. 군주는 목표 처치 수에 닿기 전에는 run.sealed로 보류한다.
 * 저장된 옛 3방 원정은 그 지도와 첫 무리를 그대로 마치게 한다. */
export function packCreateGrandBreachRoomPacks(c, zone, map) {
    const throne=map.rooms.find(room=>room.role==='boss');
    const bossPack=packPlaceExplorationBoss(c, map,throne,packCreateActExplorationPack(c, zone,throne,0, {}));
    if(map.grandBreach)return [bossPack];
    const breach=packChainRoomsOf(map)[0],rule=c.deps.GRAND_BREACH_ENCOUNTER;
    const opening=Array.from({length:rule.openingPack},(_,index)=>c.deps.createEnemy(zone,{elite:index%4===0 && index/4<rule.eliteLimit,boss:false},index));
    return [packCreateRoomPackOf(c, map,breach,opening),bossPack];
}

/** 머리의 수치·보상 기록과 본체를 만든다. 정예 기록은 전투에 올리지 않고 joinCerberus가 합친다. */
export function packCerberusStageCast(c, stage) {
    const dressCerberus=(enemy,ele,body=false)=>{
        const visual=body?'s6_beast_cerberus':ele==='phys'?'cerberus-fang':'cerberus-head';
        Object.assign(enemy,{monsterVisualId:visual,spriteVariantId:null,bossAssetKey:null,monsterVisualSetId:null,ele});
        c.deps.assignEnemyGridCombatProfile(enemy);
        // 근접 보스는 기존 투사체 대기 시간이 없어져 빨라지는 충전 속도를 보정한다.
        if(enemy.isBoss && enemy.attackKind==='melee')enemy.attackSpeedVar*=0.8;
    };
    const rule=CERBERUS_STAGES[stage];
    const heads=rule.heads.map((ele,i)=>({marker:{boss:false,elite:true,storyStage:null},dress:enemy=>{
        Object.assign(enemy,{name:c.deps._t('👿 케르베로스 머리 {value}', { value: rule.heads.length+1-i }),ele});
        enemy.atkMul*=1.55;enemy.penetration+=12;enemy.critChance+=rule.headCrit||0;
    }}));
    return heads.concat({marker:{boss:true},dress:enemy=>{
        Object.assign(enemy,{name:'👿 야수왕 케르베로스',ele:rule.boss,hybridElement:rule.hybrid||enemy.hybridElement});
        dressCerberus(enemy,rule.boss,stage===2);
        enemy.atkMul*=rule.atk;enemy.penetration+=18;enemy.critChance+=rule.crit;
    }});
}

/** 보스 방의 한 단계. 케르베로스도 몸·이동·타격 판정이 하나인 보스다. */
export function packCreateExplorationBossStage(c, zone, map, room, stage) {
    // 나무꾼의 잔상: 보스 방에 서는 것은 혼돈 밖의 나무꾼으로 만든 허수아비다(판에서와 같다)
    if(zone.type==='woodsmanEcho')return packPlaceExplorationBoss(c, map,room,packCreateActExplorationPack(c, zone,room,stage,{encounter: null,
        formation: {cells:[{gx:room.gx,gy:room.gy}],cast:[{zone:c.deps.getZone(c.deps.OUTSIDE_CHAOS_ZONE_ID),marker:{at:0,boss:true},dress:c.deps.dressWoodsmanEchoDummy}]}}));
    if(zone.id!=='s6_beast_cerberus')return packPlaceExplorationBoss(c, map,room,packCreateActExplorationPack(c, zone,room,stage, {}));
    const cast=packCerberusStageCast(c, stage),cells=cast.map(()=>({gx:room.gx,gy:room.gy}));
    const pack=packCreateActExplorationPack(c, zone,room,stage,{encounter: null,formation: {cells,cast}});
    c.deps.actExplorationState.joinCerberus(pack,[],map);
    return packPlaceExplorationBoss(c, map,room,pack);
}
