import { doorStageMap } from './exploration-door-map.mjs';
import { doorLocked } from './exploration-door-locks.mjs';

/** 살아 있는 소환수를 주인공이 도착한 칸 둘레로 데려온다: 방이 떨어져 있어 걸어서는 따라올 수 없다. */
function doorBringSummons(env, cell) {
    const blocked = env.deps.getGridBlockedCells();
    for (const summon of env.owner.summons || []) {
        if (!summon || summon.isGhost || !summon.alive || !env.deps.hasGridCell(summon)) continue;
        const spot = env.deps.findFreeGridCell(blocked, cell);
        if (!spot) continue;
        Object.assign(summon, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepAt: 0 });
        blocked.add(env.deps.gridCellKey(spot.gx, spot.gy));
    }
}

/** 방을 옮긴 주인공이 설 수 있는 칸인가: 걸을 수 있고, 다른 유닛, 물건, 이야기 NPC의 둘레(getGridBlockedCells)가 아니다. */
function doorStandable(env, map,cell) {return env.deps.actExplorationMap.walkable(map, cell) && !env.deps.getGridBlockedCells(env.owner.gridPlayer).has(env.deps.gridCellKey(cell.gx, cell.gy));}

/** 걸음이 끝난 주인공이 열린 문 칸에 서 있으면 이어진 방으로 옮긴다. @returns {boolean} 옮겼는지 */
export function doorCross(env, run) {
    const map = doorStageMap(env, run), hero = env.owner.gridPlayer, door = map ? env.deps.actExplorationRooms.doorAt(map, hero) : null;
    if (!door || doorLocked(env, run, door)) return false;
    // 두 칸 문: 밟은 칸과 같은 차례의 짝 문 쪽으로 나온다(js/act-exploration-rooms.js doorway). 문 안쪽에서 한 칸 더 들어간 칸
    // (arrivals)에 서고, 그 칸이 막혔으면(물건, 기다리는 무리, 이야기 NPC의 둘레) 문 안쪽(exits)에 선다(2026-10-17 사용자 "방 이동하면
    // 정확히 출입구칸 말고 한칸 더 방 안쪽에서 나오게").
    const index = door.cells.findIndex(cell => cell.gx === hero.gx && cell.gy === hero.gy);
    const spot = doorStandable(env, map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
    Object.assign(hero, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
    env.deps.actExplorationState.lockOn(run, null); // 락온은 그 방에서만: 방을 옮기면 풀린다
    // 들어선 방 밖으로 가라던 명령(문 칸, 두 칸 문의 짝 칸)은 여기서 끝난다: 남겨 두면 도착한 방에서 그 문으로 되돌아 걷는다.
    // 문 표시를 누르면 문의 한 칸(door.cell)으로 가는데, 짝 칸을 먼저 밟고 넘어가면 명령이 남아 되돌아갔다(2026-11-05 사용자 "간헐적으로").
    if (run.destination && env.deps.actExplorationRooms.roomAt(map, run.destination) !== env.deps.actExplorationRooms.roomAt(map, spot)) run.destination = null;
    env.deps.actExplorationState.arrive(run, env.deps.getCombatTime());
    doorBringSummons(env, spot);
    if(run.status==='active')doorEnterRoomEvents(env, run, map, spot);
    return true;
}

/** 방에 들어선 순간의 일: 습격 무리가 다가오고, 처음 들어서는 방이면 난입을 굴린다(이 때는 방문 기록에 아직 없다). */
function doorEnterRoomEvents(env, run, map, spot) {
    doorSpringAmbush(env, run, map, spot);
    env.deps.roomInvaders.rollRoom(run, map, env.deps.actExplorationRooms.roomAt(map, spot));
}

/** 주인공을 보스 방 문을 막 지난 자리에 세운다: 보스만 서는 싸움을 빈 입구 방을 걷지 않고 시작할 때(심해 가디언 판, js/combat.js
 * beginOceanRunRules). 문을 지날 때(cross)처럼 문 안쪽에서 한 칸 더 들어간 칸(막혔으면 문 안쪽)에 서고, 소환수가 따라오고, 방에
 * 들어선 시각이 적힌다. 두 칸 문 가운데 보스 방 한가운데 줄에 가까운 칸으로 들어선다. @returns {boolean} 옮겼는지 */
export function doorStartAtGate(env, run) {
    const map = doorStageMap(env, run), door = map ? map.doors.find(row => row.gate) : null;
    if (!door) return false;
    const room = map.rooms[door.to], off = cell => Math.abs(cell.gy - room.gy) + Math.abs(cell.gx - room.gx) / 100;
    const index = off(door.arrivals[0]) <= off(door.arrivals[1]) ? 0 : 1;
    const spot = doorStandable(env, map, door.arrivals[index]) ? door.arrivals[index] : door.exits[index];
    Object.assign(env.owner.gridPlayer, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0 });
    run.destination = null; // 입구 방에서 받은 걷기 명령은 여기서 끝난다: 남기면 보스 방에서 입구 쪽으로 되돌아 걷는다
    env.deps.actExplorationState.lockOn(run, null);
    env.deps.actExplorationState.arrive(run, env.deps.getCombatTime());
    doorBringSummons(env, spot);
    return true;
}

/** 습격방(data ACT_EXPLORATION_AMBUSH, js/combat-encounters.js markExplorationAmbushRooms)에 처음 들어선 순간: 그 방에서 기다리던 습격 무리가
 * 저마다 들어온 문(주인공이 선 칸) 쪽으로 다가와 서서(문까지의 거리를 pull의 몫으로 줄인 자리, 막혔으면 search칸 안의 가까운 빈 칸)
 * 공격 게이지를 windUp까지 채운다. 무리의 모양은 줄어든 채 남고, 주인공의 keep칸 안에는 서지 않는다. 들어선 뒤의 유예
 * (EXPLORATION_ARRIVAL_GRACE_MS)가 끝나면 한꺼번에 덤빈다. 설 칸이 없으면 제자리에서 덤빈다. 한 방에 한 번만 일어난다. */
function doorSpringAmbush(env, run, map, cell) {
    const room = env.deps.actExplorationRooms.roomAt(map, cell), packs = room ? run.packs.filter(pack => pack.ambush && pack.roomId === room.id) : [];
    if (!packs.length) return;
    const rule = env.deps.ACT_EXPLORATION_AMBUSH, lying = packs.flatMap(pack => pack.waiting);
    packs.forEach(pack => { delete pack.ambush; });
    const blocked = doorAmbushBlockedCells(env, map, room, lying), far = at => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy));
    for (const enemy of lying) {
        const size = env.deps.getGridUnitFootprint(enemy), toward = axis => Math.round(cell[axis] + (enemy[axis] - cell[axis]) * rule.pull);
        const spot = doorAmbushSpots({ gx: toward('gx'), gy: toward('gy') }, rule.search)
            .find(at => far(at) >= rule.keep && env.deps.canPlaceGridFootprint(blocked, at.gx, at.gy, size));
        if (spot) Object.assign(enemy, spot, { gridMoveTimer: 0 });
        env.deps.getGridUnitCells(enemy).forEach(at => blocked.add(env.deps.gridCellKey(at.gx, at.gy)));
        enemy.attackTimer = Math.max(Number(enemy.attackTimer) || 0, rule.windUp);
    }
}

/** 습격 무리가 서지 않는 칸: 다른 유닛, 상자, 이야기 NPC의 칸(getGridBlockedCells)과 그 방의 문 칸과 문 안쪽 칸. 습격 무리의 지금 자리는 빈다. */
function doorAmbushBlockedCells(env, map, room, lying) {
    const blocked = env.deps.getGridBlockedCells(), key = at => env.deps.gridCellKey(at.gx, at.gy);
    lying.forEach(enemy => env.deps.getGridUnitCells(enemy).forEach(at => blocked.delete(key(at))));
    map.doors.filter(door => door.room === room.index).forEach(door => door.cells.concat(door.landings).forEach(at => blocked.add(key(at))));
    return blocked;
}

/** 칸 cell과 그 둘레 reach칸 안의 칸들, 가까운 쪽부터: 체비쇼프 거리, 같으면 곧은 거리. */
function doorAmbushSpots(cell, reach) {
    const spots = [], ring = at => Math.max(Math.abs(at.gx - cell.gx), Math.abs(at.gy - cell.gy)), line = at => Math.hypot(at.gx - cell.gx, at.gy - cell.gy);
    for (let dy = -reach; dy <= reach; dy++) for (let dx = -reach; dx <= reach; dx++) spots.push({ gx: cell.gx + dx, gy: cell.gy + dy });
    return spots.sort((a, b) => ring(a) - ring(b) || line(a) - line(b));
}
