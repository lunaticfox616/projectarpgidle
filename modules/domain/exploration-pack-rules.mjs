

// c.owner is the current game state, supplied for each call; deps are legacy domain services.
/** encounter: an atlas content room (js/atlas-encounters.js) — elite-led, larger and tuned, rewarding when emptied. */
export function packExplorationPackKey(room, stage) { return room.id+':'+(stage===null?'pack':stage); }

/** 이어지는 무리를 받을 수 있는 탐험: 방 단위 무대이고, 무리를 따로 세우는 콘텐츠(벌집 같은)와 1루프의 액트 1이 아니다. */
export function packExplorationWavesAllowed(c, zone, map) { return !!map.stage && !roomPackKind(zone) && !(zone.type==='act' && zone.id===0 && (c.owner.season||1)===1); }

/** 정예 방, 또는 문이 하나인 막다른 방(입구와 보스 방 말고). */
export function packIsExplorationWaveRoom(map, room) { return room.role==='elite' || (['battle','optional'].includes(room.role) && map.doors.filter(door=>door.room===room.index).length===1); }

/** A +28% ordinary-monster budget: one larger room, one quiet-road group, then small room additions.
 * One-time generation only; existing runs retain every enemy. Atlas and bespoke encounters keep their authored budgets. */
/** Rooms without their own packs: the entry room, path rooms, and the first start's rescue room (its one monster comes apart). */
export function packOwnsNoPack(room, rescueRoom) { return room.role==='entry' || room.role==='path' || room===rescueRoom; }

/** 액트 1의 첫 몬스터(2026-10-15 사용자: "첫 방에 몬스터가 있고 그걸 잡으면 룬이 드랍되게", "하켄이 그 몬스터에게 맞고있는걸로"):
 * 이번 루프의 시작 무기를 아직 떨어뜨리지 않았을 때, 방 단위 무대의 구출 방(starterRescueRoom)에서 하켄 곁에 한 마리가 선다. 그 방의 보통 무리는
 * 없다. 한 대 맞기 전까지는 하켄을 친다(strikeRescueTarget). 이 몬스터가 루프의 첫 처치라 시작 무기가 그 자리 바닥에 떨어진다(2026-11-09까지는 시작 룬).
 * @returns {object[]} 그 무리, 없으면 빈 목록. */
/** 루프 1에만(2026-10-15 사용자: 루프 뒤에는 첫 방에 하켄이 없다). 그 뒤의 시작 무기는 그 루프의 첫 처치가 바닥에 떨어뜨린다. */
export function packStartsWithRescue(c, zone, map) { return zone.type==='act' && zone.id===0 && !!map.stage && (c.owner.season||1)===1
    && !c.owner.loopStarterWeaponGranted; }

/** 하켄을 치는 첫 몬스터(createStarterRescuePack)의 한 틱: 한 대라도 맞거나 하켄을 RESCUE_STRIKE.maxStrikes번 치기 전까지는 하켄 쪽을
 * 보고 RESCUE_STRIKE.rate의 빠르기로 공격 동작만 낸다(피해 없음, 하켄 위의 번쩍임은 js/canvas-act-title-card.js가 'npcStruck'로 그린다).
 * 주인공은 하켄에서 두 칸 옆에서 시작해 곧 이 몬스터를 친다. 그 뒤로는 여느 몬스터처럼 주인공과 싸운다. true = 이번 틱은 하켄을 노렸다. */
// pair: 두 마리가 하켄을 양옆에서 친다(대사는 "괴물들", "잔뿌리들"). share: 한 마리의 생명력과 피해 배율: 둘을 합쳐 한 마리였을 때와 비슷하게.
// gap: 하켄에서 떨어져 서는 칸 수. 바로 옆 칸에 서면 몬스터 그림이 하켄과 겹쳤다(2026-10-17 사용자 "NPC와 겹치지 않도록", 1에서 2로).
export const RESCUE_STRIKE=Object.freeze({rate:0.42,windUp:0.9,maxStrikes:4,fxMs:260,pair:2,share:0.55,gap:2});

/** 한 줄 지도의 방들: 입구 다음 방부터 끝 방까지, 걷는 차례로. */
export function packChainRoomsOf(map) { return map.route.slice(1).map(id=>map.rooms.find(room=>room.id===id)); }

/** 끝 방의 관문을 그 콘텐츠가 여는 구역(run.sealed): 군락지는 다섯째 웨이브가 설 때, 대균열은 처치 게이지가 찼을 때. */
export const SEALED_ROOM_ZONES=Object.freeze(['colony','grandBreach']);

/** A room an atlas map's earlier entry already emptied (before a portal): its pack is there, defeated. */
export function packEmptiedExplorationPack(room) {
    return {key:packExplorationPackKey(room,null),roomId:room.id,stage:null,waiting:[],aliveIds:[],eliteIds:[]};
}

/** A pack's spawn offset (0~99) for the visual seed, so wisps, roots, act monsters and elite traits differ room by room
 * (a room always gets the same seed). Boss stages keep 0 (their art variant). With 0 everywhere every room of a zone repeated them. */
export function packExplorationPackSpawnAt(c, zone, key, stage) {
    if(stage!==null)return 0;
    return Math.abs(c.deps.hashSeed(`${zone.atlasSeed || zone.id}:${key}`))%100;
}

/** A pack's shape marks, each kept only when set: its atlas encounter, a road group's anchor, a stage room's added pack (extra), a
 * follow-up wave (wave, releaseExplorationWave), the first start's rescue pair (rescue). */
export function packMarkExplorationPackShape(pack, encounter, shape, formation) {
    if(encounter)pack.encounter=encounter;
    if(shape.anchor)pack.anchor={...shape.anchor};
    if(shape.extra)pack.extra=shape.extra;
    if(shape.wave)pack.wave=shape.wave;
    if(formation && formation.rescue)pack.rescue=true;
}

/** 경계하는 무리 (data ACT_EXPLORATION_ALERT): an ordinary room pack that runs at the hero once a fight within its hearing hurts a
 * monster (js/act-exploration-state.js alerted). The roll hashes the pack key with its first enemy id: fixed per pack, different
 * each run, and it draws nothing from Math.random, so the rest of the map rolls as before. */
export function packMarkExplorationAlertPack(c, pack) {
    const rule=c.deps.ACT_EXPLORATION_ALERT;
    if(pack.stage!==null || pack.encounter || pack.anchor || pack.rescue || pack.eliteIds.length || !pack.waiting.length || !(c.owner.season>=rule.fromLoop))return;
    if((Math.abs(c.deps.hashSeed(`alert:${pack.key}:${pack.aliveIds[0]}`))%1000)/1000>=rule.chance)return;
    pack.alert=true;
    for(const enemy of pack.waiting)Object.assign(enemy,{alert:true,name:`${rule.prefix} ${enemy.name}`,encounterOutline:rule.outline});
}

/** 습격방 (data ACT_EXPLORATION_AMBUSH): on a room-by-room stage each battle or side room becomes one with this chance. Its ordinary
 * packs (the room's own and the added ones; not listening, sleeping or treasure packs) get ambush and their members the outline;
 * js/act-exploration-doors.js springAmbush gathers them at the door the hero comes in by. The roll hashes the room's own pack key with its
 * first enemy id (as the listening roll does): fixed per run, no random draw. Loop 1's act 1, elite-led, encounter and rescue rooms never
 * become one. @returns {object[]} the same packs */
export function packMarkExplorationAmbushRooms(c, zone, map, packs) {
    if(!map.stage || (zone.type==='act' && zone.id===0 && (c.owner.season||1)===1))return packs;
    for(const room of map.rooms.filter(row=>row.role==='battle' || row.role==='optional')) {
        for(const pack of packAmbushRoomPacks(c, room,packs)) {
            pack.ambush=true;
            pack.waiting.forEach(enemy=>{enemy.encounterOutline=c.deps.ACT_EXPLORATION_AMBUSH.outline;});
        }
    }
    return packs;
}

/** The packs a room's 습격 takes when its own pack's roll falls under the chance, else none. */
export function packAmbushRoomPacks(c, room, packs) {
    const own=packs.filter(pack=>pack.roomId===room.id && pack.stage===null && !pack.anchor && !pack.rescue && !pack.alert && !pack.sleep && !pack.treasure);
    const main=own.find(pack=>pack.key===room.id+':pack');
    if(!main || main.encounter || !main.aliveIds.length || own.some(pack=>pack.eliteIds.length || pack.waiting.some(enemy=>enemy.critter)))return [];
    return (Math.abs(c.deps.hashSeed(`ambush:${main.key}:${main.aliveIds[0]}`))%1000)/1000<c.deps.ACT_EXPLORATION_AMBUSH.chance ? own : [];
}

/** 이어지는 무리(data ACT_EXPLORATION_WAVES)를 받는 방과 그 수. 그 방 원래 무리의 첫 몬스터 번호로 굴려 다른 난수를 밀지 않는다.
 * @returns {Object<string,{left:number,total:number,at:?number}>} 방 id → 남은 번수, 모두 몇 번인지, 다음 무리가 설 전투 시각(ms, 그 방이
 *   비기 전에는 null). 탐험 기록에 저장된다(js/act-exploration-state.js validateWaves). */
export function packRollExplorationRoomWaves(c, zone, map, packs) {
    const rule=c.deps.ACT_EXPLORATION_WAVES,waves={};
    if(!packExplorationWavesAllowed(c, zone,map))return waves;
    for(const room of map.rooms.filter(row=>packIsExplorationWaveRoom(map,row))) {
        const roll=packExplorationWaveRoll(c, room,packs);
        if(roll===null || roll>=rule.chance)continue;
        const total=packWeightedWaveCount(roll/rule.chance,rule.counts);
        waves[room.id]={left:total,total,at:null};
    }
    return waves;
}

/** 그 방의 굴림(0 이상 1 미만): 그 방 원래 무리의 첫 몬스터 번호로. 원래 무리가 없거나 비었거나 조우, 구출, 습격의 방이면 null. */
export function packExplorationWaveRoll(c, room, packs) {
    const own=packs.filter(pack=>pack.roomId===room.id),main=own.find(pack=>pack.key===room.id+':pack');
    if(!main || main.encounter || !main.aliveIds.length || own.some(pack=>pack.rescue || pack.ambush))return null;
    return (Math.abs(c.deps.hashSeed(`waves:${main.key}:${main.aliveIds[0]}`))%1000)/1000;
}

/** u(0 이상 1 미만)를 무게 줄 [값, 무게]에 대어 고른 값. */
export function packWeightedWaveCount(u, rows) {
    let left=u*rows.reduce((sum,row)=>sum+row[1],0);
    for(const [value,weight] of rows){left-=weight;if(left<0)return value;}
    return rows[rows.length-1][0];
}

/** An atlas map's extra-elite mod leads some ordinary rooms with an elite (fixed per map and room). */
export function packIsAtlasExtraEliteRoom(c, zone, room) {
    if(!zone.atlasExtraElite || room.role==='boss')return false;
    return (Math.abs(c.deps.hashSeed(zone.atlasSeed+':'+room.id))%1000)/1000<zone.atlasExtraElite;
}

export function packShouldSealEncounterRun(plan, zone) {
    return !!plan.rooms && SEALED_ROOM_ZONES.includes(zone.type) && !(zone.type==='colony' && plan.source?.arena);
}

/** 구출 방: 입구 방 문 너머, 보스로 가는 길의 첫 전투 방(2026-10-15 사용자: "첫방에서 처음부터 하켄이 보이지 않도록 (조금 앞으로 걸어가야
 * 있도록)". PC 화면은 입구 방 전체를 한 번에 보여 주므로 입구 방 안에서는 숨길 수 없다). 루프 1의 첫 시작에만, 없으면 null. */
export function packStarterRescueRoom(c, zone, map) {
    if(!packStartsWithRescue(c, zone,map))return null;
    return map.route.map(id=>map.rooms.find(room=>room.id===id)).find(room=>room.role==='battle')||null;
}

/** 판의 진행 막대가 부를 무리(표식)의 수: generateEncounterPlan과 같은 셈이다(난수 없이). 방 단위 무대의 한 줄 지도가 이 수만큼 방을
 * 잇는다(js/content-maps.js markerChain): 우주계는 무리들과 보스, 심해는 무리들, 경계 너머는 조우마다 셋(마지막 조우는 보스까지). */
export function packCountEncounterMarkers(c, zone) {
    const profile=c.deps.getZoneEncounterProfile(zone);
    if(zone.type==='beyondBoundary')return zone.boundaryFinalWave ? 3+(profile.bossAdds>0?1:0) : 3;
    return zone.type==='cosmos' ? profile.markerCount+1 : profile.markerCount;
}

const ROOM_PACK_KINDS = Object.freeze({beehive:'hive',colony:'colony',grandBreach:'breach',
    cosmos:'markers',oceanDepth:'markers',beyondBoundary:'markers',meteor:'markers'});

/** Shared routing for pack creation and wave eligibility; no reverse dependency on the builders. */
export const roomPackKind = zone => zone.exploration && (zone.exploration.chain || zone.type === 'grandBreach' || zone.type === 'colony')
    ? ROOM_PACK_KINDS[zone.type] || null : null;
