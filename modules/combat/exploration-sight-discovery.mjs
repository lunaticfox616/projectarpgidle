import { sightSightMode, sightWholeRoom } from './exploration-sight-mode.mjs';
import { FOG } from './act-exploration-sight-values.mjs';

/** fog 방식의 발견 칸(칸 번호의 묶음). 발견 목록은 늘 때마다 새 배열이 되므로(js/act-exploration-state.js) 그때만 다시 만든다:
 * 그리는 쪽이 프레임마다 묶음을 새로 짓던 것을 대신한다. */
export function sightSeenCells(env, run) {
    const memo = env.memo.seenMemo.get(run);
    if (memo && memo.list === run.discovered) return memo.set;
    const set = new Set(run.discovered);
    env.memo.seenMemo.set(run, { list: run.discovered, set });
    return set;
}

/** 플레이어가 아는 칸인가: 이동 명령을 걸 수 있고 그 칸의 물건이 보인다. room 방식은 가 본 방의 칸, fog 방식은 발견한 칸. */
export function sightKnownCell(env, run, cell) {
    const map = env.deps.actExplorationMap.forRun(run);
    if (sightSightMode(env, run) === FOG) return sightSeenCells(env, run).has(env.deps.actExplorationMap.index(map, cell));
    const room = env.deps.actExplorationRooms.roomAt(map, cell);
    return !!room && run.visitedRooms.includes(room.id);
}

function sightFloorOf(room) {return (room.x1 - room.x0 + 1) * (room.y1 - room.y0 + 1);}

/** 지도를 얼마나 밝혔는가(0..1): 약도 둘레의 고리. room 방식은 가 본 방의 바닥 몫, fog 방식은 발견한 바닥 칸의 몫. */
export function sightExploredShare(env, run) {
    const map = env.deps.actExplorationMap.forRun(run);
    if (sightSightMode(env, run) === FOG) {
        const floor = map.tiles.filter(env.deps.Boolean).length;
        return floor ? run.discovered.filter(id => map.tiles[id]).length / floor : 0;
    }
    const total = map.rooms.reduce((sum, room) => sum + sightFloorOf(room), 0);
    const walked = map.rooms.filter(room => run.visitedRooms.includes(room.id)).reduce((sum, room) => sum + sightFloorOf(room), 0);
    return total ? walked / total : 0;
}

/** room 방식의 탐험이 들고 있을 까닭이 없는 칸별 목록을 비운다(예전 저장에서 온 목록, 방식이 바뀐 탐험). */
export function sightDropCellList(env, run) {
    if (run.discovered.length && sightWholeRoom(env, run)) run.discovered = [];
}
