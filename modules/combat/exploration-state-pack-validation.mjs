import { stateValidCell } from './exploration-state-rules.mjs';

/** Optional patrol anchor is an integer map tile; regular/older packs have no anchor. */
function stateValidatePatrol(env, map,pack,room) {
    stateValidCell(env, map,pack.anchor);
    if(pack.stage!==null || pack.eliteIds.length || pack.key!==room.id+':patrol')throw Error('탐험 저장의 길목 무리가 잘못되었습니다.');
    if(!env.deps.actExplorationMap.route(map,map.entry,pack.anchor,new Set([env.deps.actExplorationMap.index(map,map.gate)])).length)
        throw Error('탐험 저장의 길목 무리에 도달할 수 없습니다.');
}

/** 입구 방의 무리는 액트 1의 첫 몬스터 하나뿐이다(2026-10-15 저녁 전의 저장. 지금은 js/combat-encounters.js starterRescueRoom의 전투 방에 선다):
 * 그 방의 보통 무리 열쇠에 정예 없이. */
function stateRescuePack(map,pack,room) {return pack.rescue===true && !!map.stage && pack.key===`${room.id}:pack` && pack.stage===null
    && Array.isArray(pack.eliteIds) && !pack.eliteIds.length && pack.anchor===undefined && pack.extra===undefined;}

function stateValidatePackShape(env, map,pack) {
    const room=map.rooms.find(row=>row.id===pack.roomId);
    if(!room || (room.role==='entry' && !stateRescuePack(map,pack,room)) || room.role==='path' || typeof pack.key!=='string')throw Error('탐험 저장의 적 무리가 잘못되었습니다.');
    if(!Array.isArray(pack.aliveIds) || !Array.isArray(pack.eliteIds) || !Array.isArray(pack.waiting))throw Error('탐험 저장의 적 목록이 없습니다.');
    if((room.role==='boss')!==(pack.stage!==null))throw Error('탐험 저장의 보스 단계가 잘못되었습니다.');
    stateValidatePackKind(env, map,pack,room);
}

/** A road group (anchor) and a stage room's added pack (extra) each have their own shape. */
function stateValidatePackKind(env, map,pack,room) {
    if(pack.anchor!==undefined)stateValidatePatrol(env, map,pack,room);
    if(pack.extra!==undefined)stateValidateExtra(map,pack,room);
    if(pack.wave!==undefined)stateValidateWave(env, map,pack,room);
    if(pack.invader!==undefined)stateValidateInvader(map,pack,room);
}

/** 난입 보스의 무리(js/combat-room-invader.js): 방 단위 무대의 보통 방에, 열쇠는 "방:invader", 정예 없이. */
function stateValidateInvader(map,pack,room) {
    const known=map.stage && pack.invader===true && pack.key===`${room.id}:invader`;
    if(!known || pack.stage!==null || pack.eliteIds.length || pack.anchor!==undefined || pack.extra!==undefined || pack.wave!==undefined)throw Error('탐험 저장의 난입 무리가 잘못되었습니다.');
}

/** 이어지는 무리의 가장 많은 번수(data ACT_EXPLORATION_WAVES counts). */
function stateMostWaves(env) {return Math.max(...env.deps.ACT_EXPLORATION_WAVES.counts.map(row=>row[0]));}

/** 방이 빈 뒤에 서는 이어지는 무리(js/combat-encounters.js releaseExplorationWave): 방 단위 무대에서만, n번째 무리의 열쇠는 "방:waveN", 정예 없이. */
function stateValidateWave(env, map,pack,room) {
    const known=map.stage && Number.isInteger(pack.wave) && pack.wave>=1 && pack.wave<=stateMostWaves(env) && pack.key===`${room.id}:wave${pack.wave}`;
    if(!known || pack.stage!==null || pack.eliteIds.length || pack.anchor!==undefined || pack.extra!==undefined)throw Error('탐험 저장의 이어지는 무리가 잘못되었습니다.');
}

/** 이어지는 무리의 기록(js/combat-encounters.js rollExplorationRoomWaves): 방 id마다 { left, total, at }. 저장에서 온 잘못된 줄은 버린다(그 방에 무리가
 * 더 오지 않을 뿐이다). 기록이 없는 탐험(이 판 전에 열린 탐험)은 그대로 둔다. */
export function stateValidateWaves(env, map,run) {
    if(run.waves===undefined)return;
    const shaped=!!run.waves && typeof run.waves==='object' && !Array.isArray(run.waves),rows=shaped?Object.entries(run.waves):[];
    const valid=([id,row])=>map.rooms.some(room=>room.id===id) && !!row && Number.isInteger(row.total) && row.total>=1 && row.total<=stateMostWaves(env)
        && Number.isInteger(row.left) && row.left>=0 && row.left<=row.total && (row.at===null || Number.isFinite(row.at));
    const kept=rows.filter(valid);
    if(!shaped || kept.length!==rows.length)env.deps.reportWarning('탐험 저장의 이어지는 무리 기록을 일부 버렸습니다.');
    run.waves=Object.fromEntries(kept);
}

/** 방 단위 무대의 방에 더 서는 무리(js/combat-encounters.js createStageExtraPacks): 방마다 둘까지, 정예 없이. */
function stateValidateExtra(map,pack,room) {
    const known=map.stage && [1,2].includes(pack.extra) && pack.key===`${room.id}:extra${pack.extra}`;
    if(!known || pack.stage!==null || pack.eliteIds.length || pack.anchor!==undefined || pack.objectId)throw Error('탐험 저장의 덧무리가 잘못되었습니다.');
}

export function stateValidatePack(env, map,pack,context) {
    if(!pack || context.keys.has(pack.key))throw Error('탐험 저장의 적 무리가 중복되거나 잘못되었습니다.');
    stateValidatePackShape(env, map,pack);context.keys.add(pack.key);
    for(const id of pack.aliveIds) {
        if(!Number.isSafeInteger(id) || id<1 || context.alive.has(id))throw Error('탐험 저장의 적 식별자가 중복되거나 잘못되었습니다.');
        context.alive.set(id,pack.key);
    }
    pack.waiting.forEach(enemy=>stateValidateEnemy(env, map,enemy,pack,context));
}

export function stateValidateEnemy(env, map,enemy,pack,context) {
    if(!enemy || !pack || !pack.aliveIds.includes(enemy.id) || enemy.explorationPack!==pack.key || context.records.has(enemy.id))throw Error('탐험 저장의 적 소유권이 일치하지 않습니다.');
    stateValidateEnemyBody(env, map,enemy);
    stateValidateCerberusRewards(env, map,enemy,pack);
    if(!!enemy.isElite!==pack.eliteIds.includes(enemy.id))throw Error('탐험 저장의 정예 판정이 일치하지 않습니다.');
    context.records.add(enemy.id);
}

export function stateValidateEnemyBody(env, map,enemy) {
    if(!Number.isFinite(enemy.hp) || !Number.isFinite(enemy.maxHp) || enemy.hp<=0 || enemy.hp>enemy.maxHp)throw Error('탐험 저장의 적 생명력이 잘못되었습니다.');
    stateValidCell(env, map,enemy);
    if(enemy.isBoss)stateValidCell(env, map,{gx:enemy.gx+1,gy:enemy.gy+1});
}

function stateValidateCerberusRewards(env, map,enemy,pack) {
    const parts=enemy.cerberusRewards;
    if(parts===undefined)return;
    if(!Array.isArray(parts)||pack.stage===null||parts.length>2-pack.stage)
        throw Error('케르베로스의 남은 보상 기록이 잘못되었습니다.');
    const ids=new Set([enemy.id]);
    parts.forEach(part=>{
        if(!part||!part.isElite||part.isBoss||part.cerberusRewards!==undefined
            ||part.explorationPack!==pack.key||ids.has(part.id))
            throw Error('케르베로스의 남은 보상 기록이 중복되거나 잘못되었습니다.');
        stateValidateEnemyBody(env, map,part);ids.add(part.id);
    });
}
