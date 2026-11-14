import { packRollExplorationRoomWaves, packShouldSealEncounterRun, roomPackKind, packStarterRescueRoom, packOwnsNoPack, packEmptiedExplorationPack, packMarkExplorationAmbushRooms, RESCUE_STRIKE } from './exploration-pack-rules.mjs';
import { packCreateActExplorationPack } from './exploration-pack-create.mjs';
import { packCreateExplorationBossStage, packCreateBeehiveRoomPacks, packCreateColonyDefenseRoomPacks, packCreateGrandBreachRoomPacks, packCreateMarkerRoomPacks } from './exploration-pack-content.mjs';

// c.owner is the current game state, supplied for each call; deps are legacy domain services.
/** How a zone is fought: a story act walks its authored map; any other zone whose factory declares `exploration` (a
 * generated-map spec, js/exploration-layouts.js, with bossStages) walks that map; everything else keeps the 9×8 board. */
export function packGetZoneExplorationPlan(c, zone) {
    if(!zone)return null;
    if(zone.type==='act')return c.deps.actExplorationMap.layout(zone.id+1) ? {act:zone.id+1,bossStages:c.deps.STORY_ACTS[zone.id].maxKills} : null;
    return zone.exploration ? {source:zone.exploration,zoneId:zone.id,bossStages:zone.exploration.bossStages||1} : null;
}

/** exploration: false = the legacy board (regression fixtures), true = must explore (throws where no map exists). */
export function packCreateActExplorationEncounter(c, zone, exploration) {
    const plan=exploration===false ? null : packGetZoneExplorationPlan(c, zone);
    if(!plan && exploration===true)throw Error('일반 액트나 전용 맵이 있는 콘텐츠에서만 탐험을 시작할 수 있습니다.');
    if(!plan)return null;
    plan.rotation=c.deps.actExplorationProgress.objects.savedFacing(zone)??c.deps.rollExplorationFacing();
    if(c.deps.actExplorationDoors.session())plan.rooms=c.deps.actExplorationDoors.planKey(zone,plan); // 방 단위 무대 시험판(js/act-exploration-doors.js): 액트와 그 밖의 모든 탐험 구역
    const run=c.deps.actExplorationState.create(plan,packCreateExplorationPacks(c, zone,c.deps.actExplorationMap.forRun(plan),plan.bossStages),c.deps.getCombatTime());
    run.waves=packRollExplorationRoomWaves(c, zone,c.deps.actExplorationMap.forRun(run),run.packs);
    if(packShouldSealEncounterRun(plan,zone))run.sealed=true;
    run.mode=c.deps.actExplorationProgress.startMode(c.owner.settings);
    c.deps.actExplorationProgress.objects.initialize(run,zone);
    return run;
}

export function packCreateExplorationPacks(c, zone, map, bossStages) {
    const own=roomPackKind(zone);
    if(own)return ROOM_BUILDERS[own](c,zone,map);
    const packs=[],encounters=c.deps.atlasEncounters.rooms(zone,map),arranger=c.deps.arranger.forMap(map);
    const {counts,patrol}=c.deps.formation.plan(zone,map),rescueRoom=packStarterRescueRoom(c, zone,map);
    for(const room of map.rooms) {
        if(packOwnsNoPack(room,rescueRoom))continue;
        const encounter=encounters[room.id]||null;
        if(room.role!=='boss'){packs.push(zone.atlasCleared?.includes(room.id) ? packEmptiedExplorationPack(room)
            : packCreateActExplorationPack(c, zone,room,null,{encounter: encounter,formation: packArrangedRoomFormation(c, arranger,zone,room,{encounter: encounter,formation: counts.get(room.id)})}));continue;}
        for(let stage=0;stage<bossStages;stage++)packs.push(packCreateExplorationBossStage(c, zone,map,room,stage));
    }
    // 잔잔한 사건(js/combat-incidents.js): 새 지도와 모든 무리의 칸을 보고 드물게 금빛 수액 슬라임, 길 잃은 몬스터, 잠든 무리
    const dressed=c.deps.combatIncidents.dressPacks(zone,map,packs.concat(packCreateAddedExplorationPacks(c, zone,map,{patrol: patrol,arranger: arranger,keep: rescueRoom}),
        packCreateStarterRescuePack(c, zone,map,rescueRoom)));
    return packMarkExplorationAmbushRooms(c, zone,map,dressed);
}

export function packCreateStarterRescuePack(c, zone, map, room) {
    if(!room)return [];
    // 하켄의 양옆에 RESCUE_STRIKE.gap칸씩 떨어져 선다(방 밖이면 그 너머 칸을 쓰지 않는다): 주인공은 앞의 한 마리부터 치게 된다.
    const post=c.deps.actExplorationRooms.npcPost(room),inside=gx=>gx>=room.x0 && gx<=room.x1;
    const cells=[post.gx+RESCUE_STRIKE.gap,post.gx-RESCUE_STRIKE.gap].filter(inside).slice(0,RESCUE_STRIKE.pair).map(gx=>({gx,gy:post.gy}));
    const pack=packCreateActExplorationPack(c, zone,room,null,{encounter: null,formation: {cells,rescue:true}});
    // 게이지를 거의 채워 둔다: 첫 장면(액트 이름과 깨어나는 대사 동안 게임이 멈춘다)에서 하켄을 향해 공격을 준비하는 자세로 보인다.
    // 처음 시작(js/opening-journey-ui.js)의 주인공이 아직 이 괴물을 치지 않았으면, 다가와 칠 때까지 하켄을 계속 친다(patient).
    const patient=!(c.owner.seenTutorials||[]).includes('opening_attack');
    pack.waiting.forEach(enemy=>Object.assign(enemy,{rescue:{gx:post.gx,gy:post.gy,strikes:0,patient},attackTimer:RESCUE_STRIKE.windUp,
        hp:Math.round(enemy.hp*RESCUE_STRIKE.share),maxHp:Math.round(enemy.maxHp*RESCUE_STRIKE.share),damageMul:enemy.damageMul*RESCUE_STRIKE.share}));
    return [pack];
}

/** 방의 원래 무리가 설 자리: 방 단위 무대에서는 그 방의 자리 묶음을 따른다(stageRoomArranger). 이어진 지도에서는 전의 자리 그대로다. */
export function packArrangedRoomFormation(c, arranger, zone, room, {encounter, formation}) {
    const cells=arranger.cells(room,0,c.deps.formation.count(zone,encounter,formation));
    return cells ? {...formation,cells,front:arranger.front(room)} : formation;
}

/** Packs beside the one each room has: the quiet-road group, and on a room-by-room stage the packs added to every room. */
/** keep: a room left to its own scene (the first start's rescue room, starterRescueRoom): no patrol and no extra packs there. */
export function packCreateAddedExplorationPacks(c, zone, map, {patrol, arranger, keep}) {
    const packs=patrol && patrol.roomId!==keep?.id?[packCreateActExplorationPack(c, zone,map.rooms.find(room=>room.id===patrol.roomId),null,{encounter: null,formation: patrol})]:[];
    return map.stage?packs.concat(packCreateStageExtraPacks(c, zone,map,arranger,keep)):packs;
}

/** 방 단위 무대의 방마다 더 서는 무리(data/stage-view.js STAGE_ROOMS.extraPacks, 2026-10-13 사용자: "한 방에 몬스터 한무리~1.5무리
 * 정도 더"): 지역의 기본 무리 크기로(큰 방에 얹는 덧수는 원래 무리만 받는다), 방 가운데의 양옆에 선다(첫째는 보스 쪽, 둘째는 입구 쪽). 열쇠는 "방:extra1", "방:extra2".
 * 정예는 없고 생김새는 열쇠마다 다르게 뽑힌다. 방에 들어서면 방 안을 모두 보므로 원래 무리와 함께 덤빈다. */
export function packCreateStageExtraPacks(c, zone, map, arranger, keep) {
    const rule=c.deps.STAGE_ROOMS.extraPacks,packs=[];
    for(const room of c.deps.actExplorationState.packRooms(map).filter(row=>row!==keep)) {
        const more=rule.always+(c.deps.random()<rule.chance?1:0);
        // 자리는 그 방의 자리 묶음에서(2026-10-13 밤부터: 전에는 늘 방 가운데의 양옆이었다)
        for(let extra=1;extra<=more;extra++) {
            packs.push(packCreateActExplorationPack(c, zone,room,null,{encounter: null,formation: {extra,cells:arranger.cells(room,extra,c.deps.formation.count(zone,null,{extra})),front:arranger.front(room)}}));
        }
    }
    return packs;
}

const ROOM_BUILDERS = Object.freeze({hive:packCreateBeehiveRoomPacks,colony:packCreateColonyDefenseRoomPacks,
    breach:packCreateGrandBreachRoomPacks,markers:packCreateMarkerRoomPacks});
