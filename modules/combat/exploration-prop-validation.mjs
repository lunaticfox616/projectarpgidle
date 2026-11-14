import { propGrade, propCellKey, propIsEvent, propActive } from './exploration-prop-rules.mjs';
import { kinds, warningMs } from './exploration-objects-values.mjs';

/** A row's own shape: id, kind, chest grade, phase (no map needed). */
function propValidateRowShape(env, row,ids) {
    if(!row || !kinds.includes(row.kind) || typeof row.id!=='string' || ids.has(row.id))throw Error('잘못된 탐험 오브젝트 식별자');
    if(row.kind==='chest'?!propGrade(env, row):row.grade!==undefined)throw Error('잘못된 보급 상자 등급');
    propValidatePhase(row);
    ids.add(row.id);
}

function propValidateRow(env, run,row,ids,cells) {
    const map=env.deps.actExplorationMap.forRun(run);
    propValidateRowShape(env, row,ids);
    if(!env.deps.actExplorationMap.walkable(map,row,true)||cells.has(propCellKey(row)))throw Error('잘못된 탐험 오브젝트 위치');
    if(!map.rooms.some(r=>r.id===row.roomId&&['battle','optional'].includes(r.role)
        &&Math.abs(row.gx-r.gx)<=r.radiusX&&Math.abs(row.gy-r.gy)<=r.radiusY))throw Error('잘못된 탐험 오브젝트 방');
    cells.add(propCellKey(row));
}

function propValidatePhase(row) {
    if(!['ready','warning','active','spent'].includes(row.phase))throw Error('잘못된 탐험 오브젝트 상태');
    if(!Number.isInteger(row.wave)||row.wave<0||row.wave>(row.kind==='nest'?2:1))throw Error('잘못된 탐험 오브젝트 차수');
    if(!Number.isFinite(row.remainingMs)||row.remainingMs<0||row.remainingMs>Math.max(...Object.values(warningMs)))throw Error('잘못된 탐험 오브젝트 시계');
    propValidateOrdinaryPhase(row);
}

function propValidateOrdinaryPhase(row) {
    if(!propIsEvent(row) && (row.wave!==0 || !['ready','spent'].includes(row.phase)))throw Error('일반 오브젝트의 전투 상태');
    if(row.phase==='ready'&&row.wave!==0)throw Error('미시작 사건에 출현 기록이 있습니다.');
    if(row.phase==='active'&&row.wave===0)throw Error('시작된 사건의 무리가 없습니다.');
}

function propValidateHeader(source) {
    if(!source||source.version!==1||!Number.isInteger(source.seed)||source.seed<0||source.seed>4294967295)throw Error('잘못된 탐험 오브젝트 저장');
    if(!Array.isArray(source.entries)||source.entries.length>40)throw Error('잘못된 탐험 오브젝트 수량'); // 방 단위 무대는 방마다 놓는다(STAGE_ROOMS.objects.limit)
}

function propValidateReward(source) {
    if(!Number.isFinite(source.quantity)||source.quantity<1||source.quantity>4||!Number.isFinite(source.rarity)||source.rarity<0||source.rarity>500)throw Error('잘못된 탐험 오브젝트 보상 배율');
}

export function propValidate(env, run) {
    const source=run.objects;
    if(source===undefined) {
        if(run.packs.some(p=>p.objectId))throw Error('사건 무리에 오브젝트가 없습니다.');
        return;
    }
    propValidateHeader(source);propValidateReward(source);
    // Cells belong to the facing they were placed on (maps turn since 2026-10-04). Records from before carry none: they were
    // placed on the drawn facing, which is also what an older run upgrades to (actExplorationState.upgradeRotation).
    if(source.rotation===undefined)source.rotation=env.deps.actExplorationMap.forRun({...run,rotation:undefined}).rotation;
    if(source.rotation!==env.deps.actExplorationMap.forRun(run).rotation)throw Error('탐험 오브젝트의 맵 방향이 다릅니다.');
    // Chests saved before grades (2026-10-05) open as ordinary wooden ones; filling the default again changes nothing.
    source.entries.forEach(row=>{if(row?.kind==='chest'&&row.grade===undefined)row.grade='wood';});
    const ids=new Set(),cells=new Set();source.entries.forEach(row=>propValidateRow(env, run,row,ids,cells));
    if(run.status==='cleared'&&propActive(run))throw Error('진행 중인 탐험 사건이 완료 처리되었습니다.');
    if(source.entries.filter(propIsEvent).length>1)throw Error('중복 탐험 사건');
    if(source.pendingId!==null&&!source.entries.some(e=>e.id===source.pendingId&&e.phase==='ready'&&e.kind!=='ambush'))throw Error('잘못된 탐험 상호작용 대상');
    run.packs.filter(p=>p.objectId).forEach(pack=>propValidateEventPack(source,pack));
    source.entries.filter(propIsEvent).forEach(row=>propValidateEventOwnership(run,row));
}

function propValidateEventPack(source,pack) {
    const row=source.entries.find(e=>e.id===pack.objectId);
    if(!row||!propIsEvent(row)||pack.roomId!==row.roomId||pack.stage!==null||pack.eliteIds.length||pack.anchor)throw Error('잘못된 탐험 사건 무리');
    propValidateEventSequence(row,pack);
}

function propValidateEventSequence(row,pack) {
    if(!Number.isInteger(pack.objectWave)||pack.objectWave<1||pack.objectWave>row.wave||pack.key!==`${row.id}:${pack.objectWave}`)throw Error('잘못된 탐험 사건 순서');
    if(row.phase==='ready'||(row.phase==='spent'&&pack.aliveIds.length))throw Error('탐험 사건과 몬스터 상태 불일치');
}

function propValidateEventOwnership(run,row) {
    const packs=run.packs.filter(p=>p.objectId===row.id);
    if(packs.length!==row.wave)throw Error('탐험 사건 무리 기록이 누락되었습니다.');
    if(row.phase==='active'&&!packs.some(p=>p.aliveIds.length))throw Error('전투 중 사건에 몬스터가 없습니다.');
}

/** The atlas run's copy of its map's objects (js/exploration-object-combat.js remember) at load: its shape only. The copy does not
 * know the room stage layout it was placed on, and checking its cells on the joined generated map threw for every save made in an
 * atlas map on the room stage (2026-10-20 hunt: the save loaded as corrupt). The cells are checked on the real map when it is
 * entered again (actExplorationProgress.objects initialize). */
export function propRestoreAtlas(env, raw) {
    if(raw===undefined)return undefined;
    const objects=JSON.parse(JSON.stringify(raw)),ids=new Set();
    propValidateHeader(objects);propValidateReward(objects);
    objects.entries.forEach(row=>{if(row?.kind==='chest'&&row.grade===undefined)row.grade='wood';propValidateRowShape(env, row,ids);});
    if(objects.entries.some(propIsEvent))throw Error('아틀라스 오브젝트에 중복 전투 사건이 있습니다.');
    objects.pendingId=null;return objects;
}
