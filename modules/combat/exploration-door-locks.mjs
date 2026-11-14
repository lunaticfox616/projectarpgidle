import { doorStageMap, doorRoom } from './exploration-door-map.mjs';

/** 그 방(roomIndex)에서 싸움이 벌어지고 있는가: 살아 있는 몬스터나 터지는 중인 물체. 방 단위 무대에서는 그 방의 것만 센다: 다른 방에
 * 남은 것(화면에 없다)이 모든 문을 잠그고 자동 걸음을 세웠다(2026-10-17 사용자 "방치정산 하고 난 다음 ... 몹이 없는데도 맵이 닫혀있어").
 * 이어진 지도(또는 방을 모를 때)는 예전처럼 지도 전체를 센다. */
function doorFightingIn(env, run, roomIndex) {
    const map = doorStageMap(env, run), room = map && Number.isInteger(roomIndex) ? map.rooms[roomIndex] : null;
    const here = cell => !room || env.deps.actExplorationRooms.roomAt(map, cell) === room;
    const bursting = row => (row.phase === 'warning' || row.phase === 'active') && here(row);
    return env.owner.enemies.some(enemy => enemy.hp > 0 && here(enemy)) || (run.objects?.entries || []).some(bursting) || (!!room && (doorWaveDue(run, room) || doorInvaderDue(run, room)));
}

/** 난입 보스가 들이닥친 방(js/combat-room-invader.js): 입장 연출 동안에도 문이 닫혀 있다. */
function doorInvaderDue(run,room) {return run.packs.some(pack => pack.invader && pack.roomId === room.id && pack.aliveIds.length > 0);}

/** 그 방에 이어지는 무리(data ACT_EXPLORATION_WAVES)가 남았고 지금 무리를 모두 쓰러뜨렸는가: 그동안도 싸우는 중이라 문이 닫혀 있고,
 * js/combat-encounters.js releaseExplorationWave가 잠시 뒤 새 무리를 세운다. */
export function doorWaveDue(run, room) {
    const wave = run.waves && run.waves[room.id];
    return !!wave && wave.left > 0 && run.packs.every(pack => pack.roomId !== room.id || !pack.aliveIds.length);
}

/** 방 단위 무대: 주인공이 선 방이 아닌 다른 방에서 싸움에 든 몬스터(화면에 없다)를 그 무리의 대기 줄로 돌려보낸다. 주인공이 그 방에
 * 들어서면 다시 알아챈다(actExplorationState.engage). 무리가 없는 것은 걷는다. 벽 칸에 선 것(방이 없다)은 그대로 둔다. 정산 뒤 다른
 * 방에 남은 몬스터가 전투 대상으로 잡혀 주인공이 서 버렸다(2026-10-17 사용자 "몹이 없는데도 맵이 닫혀있어"). */
export function doorSendStraysBack(env, run) {
    const map = doorStageMap(env, run), here = doorRoom(env, run);
    if (!here) return;
    const away = enemy => { const at = enemy.hp > 0 ? env.deps.actExplorationRooms.roomAt(map, enemy) : null; return !!at && at !== here; };
    if (!env.owner.enemies.some(away)) return;
    for (const enemy of env.owner.enemies.filter(away)) {
        const pack = run.packs.find(row => row.key === enemy.explorationPack);
        if (pack && !pack.waiting.includes(enemy)) pack.waiting.push(enemy);
    }
    env.owner.enemies = env.owner.enemies.filter(enemy => !away(enemy));
}

/** 주인공이 선 방에서 싸움이 벌어지고 있는가(js/act-exploration-progress.js: 자동 걸음이 멈춘다). */
export function doorFightingHere(env, run) {
    const here = doorRoom(env, run);
    return doorFightingIn(env, run, here ? here.index : null);
}

/** 싸우는 몬스터나 터지는 중인 물체가 있으면 방의 문이 모두 잠긴다. 보스 방 문은 정예가 남아 있어도 잠긴다. 지도나 방에 막 들어선 뒤
 * (EXPLORATION_ARRIVAL_GRACE_MS)에도 잠긴다: 2026-10-16 사용자 "그동안에 방 이동못하게막아".
 * @returns {?string} 잠긴 까닭: 'fight', 'gate', 'arrival'(들어선 뒤의 유예), 열렸으면 null */
function doorLockOf(env, run, door) {
    if (doorFightingIn(env, run, door.room)) return 'fight';
    if (door.gate && env.deps.actExplorationState.gateSealed(run)) return 'gate';
    return env.deps.actExplorationState.inArrivalGrace(run, env.deps.getCombatTime()) ? 'arrival' : null;
}

export function doorLocked(env, run,door) {return doorLockOf(env, run, door) !== null;}

/** 주인공이 선 방의 문들과 지금 잠겼는지: 그림(js/canvas-stage-rooms.js)과 미니맵이 읽는다. arrival은 들어선 뒤의 유예로만 잠긴 문이다
 * (봉인 그림은 한 번 열린 채로 본 문이면 그동안에도 접힌 모습이다, js/canvas-stage-door-marks.js). */
export function doorDoorsHere(env, run) {
    const map = doorStageMap(env, run), here = doorRoom(env, run);
    if (!map || !here) return [];
    return map.doors.filter(door => door.room === here.index).map(door => {
        const lock = doorLockOf(env, run, door);
        return { door, locked: lock !== null, arrival: lock === 'arrival' };
    });
}
