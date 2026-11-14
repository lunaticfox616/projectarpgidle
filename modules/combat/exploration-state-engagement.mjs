import { stateAtBossRoom, stateCurrent, stateBossReady } from './exploration-state-rules.mjs';
import { stateRevealRoom, stateNoticer } from './exploration-state-vision.mjs';
import { BOSS_ENTRANCE_MS } from './exploration-state-values.mjs';

/** False until the player has stood at the boss room for BOSS_ENTRANCE_MS; the first such step opens the entrance. */
function stateEntranceHoldMs(env, state,run,pack) {
    if(run.zoneId===env.deps.OUTSIDE_CHAOS_ZONE_ID && pack.waiting.some(enemy=>enemy.isWoodsman && !enemy.noAttack))
        return env.deps.WOODSMAN_BATTLE.intro.revealMs+env.deps.WOODSMAN_BATTLE.intro.speechMs;
    const seen=!run.source && Object.hasOwn(state.records?.actBest||{},run.zoneId);
    return seen?1200:BOSS_ENTRANCE_MS;
}

function stateBossAwake(env, state,run,o) {
    const room=o.map.rooms.find(row=>row.id===o.pack.roomId),open=env.memo.entrances.get(run);
    if(!stateAtBossRoom(o.map,room,state.gridPlayer))return false;
    if(!open || open.key!==o.pack.key || o.now<open.at) {
        const holdMs=stateEntranceHoldMs(env, state,run,o.pack);
        env.memo.entrances.set(run,{key:o.pack.key,at:o.now,holdMs});stateRevealRoom(env, run,o.map,room);return false;
    }
    if(o.now-open.at<open.holdMs)return false;
    env.memo.entrances.delete(run);
    return true;
}

/** 난입 보스가 들이닥치는 동안(js/combat-room-invader.js) 그 방의 다른 무리도 기다린다. */
function stateHeldByEntrance(env, run,pack) {
    const open=env.memo.entrances.get(run);
    return !!open && !!open.roomId && open.key!==pack.key && open.roomId===pack.roomId;
}

/** 입장을 지금 연다: 처음 들어선 방의 난입과 싸우는 도중의 불청객처럼 주인공이 관문을 밟지 않는 입장. { at, holdMs, roomId } */
export function stateOpenEntrance(env, run,pack,o) {env.memo.entrances.set(run,{key:pack.key,...o});}

/** A visible boss keeps waiting through its entrance, and in background hunts set to stop before bosses. */
function stateHoldBoss(env, state,run,o) {
    if(stateHeldByEntrance(env, run,o.pack))return true;
    // 끝 방의 조용한 무리(quiet: 보스 없이 끝나는 한 줄 지도의 마지막 무리, js/combat-encounters.js createRoomPackOf)는 다른 방의 무리처럼 바로 덤빈다
    if((o.pack.stage===null && !o.pack.invader) || o.pack.quiet)return false;
    // Stop before transferring a visible boss: a strong build could otherwise kill it
    // in this same tick, before the replay's next safety-policy check can see it.
    return !stateBossAwake(env, state,run,o);
}

/** @returns {?{key:string, at:number, holdMs:number}} The boss entrance in progress (combat ms), if any. */
export function stateEntrance(env, run) {return run && env.memo.entrances.get(run) || null;}

/** Transfers the waiting enemies that notice the hero (noticer) into combat without re-rolling or respawning them. now = combat ms. */
export function stateEngage(env, state,now=env.deps.getCombatTime()) {
    const run=stateCurrent(state);if(!run || run.status!=='active')return [];
    const map=env.deps.actExplorationMap.forRun(run),noticed=stateNoticer(env, run,map,state.gridPlayer),added=[];
    for(const pack of run.packs) {
        if(!pack.waiting.length || !stateBossReady(run,pack))continue;
        const ready=pack.waiting.filter(noticed);
        if(!ready.length || stateHoldBoss(env, state,run,{map,pack,now}))continue;
        const ids=new Set(ready.map(enemy=>enemy.id));
        pack.waiting=pack.waiting.filter(enemy=>!ids.has(enemy.id));
        added.push(...ready);
    }
    if(added.length)state.enemies.push(...added);
    return added;
}

/** Ordinary monsters that have not noticed the hero yet, within reach tiles of cell (Chebyshev). Bosses wait for their entrance. */
export function stateDormantNear(state,cell,reach) {
    const run=stateCurrent(state);if(!run || run.status!=='active')return [];
    return run.packs.filter(pack=>pack.stage===null && !pack.invader).flatMap(pack=>pack.waiting)
        .filter(enemy=>enemy.hp>0 && Math.max(Math.abs(enemy.gx-cell.gx),Math.abs(enemy.gy-cell.gy))<=reach);
}

/** An attack reached these monsters: the ones still waiting join the fight, like noticed ones. Others are left alone. */
export function stateWake(state,enemies) {
    const run=stateCurrent(state);if(!run || !enemies.length)return [];
    const ids=new Set(enemies.map(enemy=>enemy.id)),added=[];
    for(const pack of run.packs.filter(row=>row.stage===null && !row.invader)) {
        const struck=pack.waiting.filter(enemy=>ids.has(enemy.id));
        if(!struck.length)continue;
        pack.waiting=pack.waiting.filter(enemy=>!ids.has(enemy.id));
        added.push(...struck);
    }
    state.enemies.push(...added);
    return added;
}

/** 경계하는 무리 (data ACT_EXPLORATION_ALERT): a listening pack that has not noticed the hero hears a fight once a monster in
 * it is hurt within hearReach tiles of any member; every member then joins (wake). Returns those members, none outside a map. */
export function stateAlerted(env, state) {
    const run=stateCurrent(state);if(!run || run.status!=='active')return [];
    const packs=run.packs.filter(pack=>pack.alert && pack.waiting.length);
    const hurt=packs.length ? state.enemies.filter(enemy=>enemy.hp>0 && enemy.hp<enemy.maxHp).concat(env.memo.deathNoises.get(run)||[]) : [];
    env.memo.deathNoises.delete(run);
    const reach=env.deps.ACT_EXPLORATION_ALERT.hearReach;
    const hears=enemy=>hurt.some(source=>Math.max(Math.abs(enemy.gx-source.gx),Math.abs(enemy.gy-source.gy))<=reach);
    return packs.filter(pack=>pack.waiting.some(hears)).flatMap(pack=>pack.waiting);
}

/** Death is idempotent; waiting enemies cannot be killed by an unrelated event. */
export function stateRecordDeath(env, state,enemy) {
    const run=stateCurrent(state);
    if(!run || run.completionApplied || !['active','cleared'].includes(run.status) || enemy.hp>0)return false;
    const pack=run.packs.find(row=>row.key===enemy.explorationPack);
    if(!pack || pack.waiting.some(row=>row.id===enemy.id))return false;
    const index=pack.aliveIds.indexOf(enemy.id);if(index<0)return false;
    pack.aliveIds.splice(index,1);
    stateNoteDeathNoise(env, run,enemy);
    const bosses=run.packs.filter(row=>row.stage!==null);
    if(bosses.every(row=>row.aliveIds.length===0) && !env.deps.objects.active(run))run.status='cleared';
    return true;
}

/** Remembers where a monster died while a listening pack still waits (read once by alerted). */
function stateNoteDeathNoise(env, run,enemy) {
    if(!run.packs.some(pack=>pack.alert && pack.waiting.length))return;
    const cells=env.memo.deathNoises.get(run)||[];
    cells.push({gx:enemy.gx,gy:enemy.gy});env.memo.deathNoises.set(run,cells);
}

/** Keep surviving optional monsters owned when the completed map stops rendering combat. */
export function stateRetireCombat(state) {
    const run=stateCurrent(state);
    for(const enemy of state.enemies.filter(row=>row.hp>0)) {
        const pack=run.packs.find(row=>row.key===enemy.explorationPack);
        if(pack)pack.waiting.push(enemy);
    }
    state.enemies=[];
}
