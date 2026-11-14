

export function doorSession(env) { return env.deps.roomStageEnabled(); }

/** 새 탐험의 열쇠: 방 크기(테스트 패널에서 고른 가로, 깊이 덧칸. 고르지 않았거나 없는 값이면 바탕값), 방 놓임새(액트는 프리셋
 * 넷 가운데 하나, 그 밖의 구역은 준 랜덤. js/act-exploration-room-plans.js), 그 구역의 무대 그림.
 * @param {object} zone 구역 @param {object} where 탐험 계획({act} 또는 {source}) */
export function doorPlanKey(env, zone, where) {
    const rule = env.deps.STAGE_ROOMS, pick = (value, steps, base) => (steps.includes(value) ? value : base), settings = env.owner.settings;
    return env.deps.actExplorationRooms.key({ wide: pick(settings.stageRoomWide, rule.wideSteps, rule.grow.wide), deep: pick(settings.stageRoomDeep, rule.deepSteps, rule.grow.deep),
        plan: env.deps.actExplorationRoomPlans.choose(where, settings.stageRoomPlan), region: env.deps.actExplorationRoomPlans.region(zone, where) });
}

/** The run's room-by-room map, or null on a continuous map. */
export function doorStageMap(env, run) {
    const map = run ? env.deps.actExplorationMap.forRun(run) : null;
    return map && map.stage ? map : null;
}

/** 지금 걸어갈 칸: 같은 방이면 목표 그대로, 다른 방이면 그 방으로 가는 문 칸. 이어진 지도에서는 언제나 목표 그대로다. */
export function doorToward(env, run, target) {
    const map = doorStageMap(env, run);
    return map ? env.deps.actExplorationRooms.waypoint(map, env.owner.gridPlayer, target) : target;
}

/** 주인공이 선 방(문 칸은 그 문이 붙은 방). 이어진 지도에서는 null. */
export function doorRoom(env, run) {
    const map = doorStageMap(env, run);
    return map ? env.deps.actExplorationRooms.roomAt(map, env.owner.gridPlayer) : null;
}

/** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(STAGE_ROOMS.pace). 이어진 지도의 탐험은 1. */
export function doorPace(env, run) {return run && run.rooms ? env.deps.STAGE_ROOMS.pace : 1;}
