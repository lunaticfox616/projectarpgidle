import { FOG, ROOM } from './act-exploration-sight-values.mjs';

// 탐험 → { list, set }: fog 방식의 발견 칸 묶음(저장하지 않는다)

/** 테스트 패널의 선택(settings.stageSight 'fog'): 어느 지역이든 시야 방식으로 걸어 본다. */
function sightForced(env) {return env.deps.settings()?.stageSight === FOG;}

/** @returns {'room'|'fog'} 그 탐험의 시야 방식. */
export function sightSightMode(env, run) {
    const map = run ? env.deps.actExplorationMap.forRun(run) : null;
    if (!map || !map.stage) return FOG;
    return sightForced(env) || env.deps.STAGE_ROOM_PLANS.regions.sight.includes(map.region) ? FOG : ROOM;
}

export function sightWholeRoom(env, run) {return sightSightMode(env, run) === ROOM;}

/** 방 단위 지도에서 두 자리가 같은 방인가. 벽 위나 지도 밖이면 아니다. */
export function sightSameRoom(env, map, one, other) {
    const room = env.deps.actExplorationRooms.roomAt(map, one);
    return !!room && room === env.deps.actExplorationRooms.roomAt(map, other);
}

/** 방 단위 지도에서 cell과 같은 방에 선 것을 가리는 함수(여럿을 한 번에 가를 때). cell이 벽 위면 아무것도 아니다. */
export function sightInRoomOf(env, map, cell) {
    const here = env.deps.actExplorationRooms.roomAt(map, cell);
    return unit => !!here && env.deps.actExplorationRooms.roomAt(map, unit) === here;
}
