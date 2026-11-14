import { roomReadRoomKey } from './exploration-room-rules.mjs';
import { roomSpecialArena, roomCompileRooms } from './exploration-room-compile.mjs';
import { KEEP } from './act-exploration-rooms-values.mjs';

/** 탐험이 걷는 바탕 지도: 다른 구역은 그 명세의 지도(투기장이면 구실이 바뀐 것), 액트는 그 액트의 지도. */
function roomBaseMapOf(env, run) {
    if (run.source) return env.deps.explorationLayouts.build(run.source);
    return env.deps.ACT_EXPLORATION_MAPS.find(row => row.act === run.act) || null;
}

function roomRememberRoomMap(env, id, map) {
    env.memo.cache.set(id, map);
    if (env.memo.cache.size > KEEP) env.memo.cache.delete(env.memo.cache.keys().next().value);
    return map;
}

function roomSpecialArenaShape(env, run) {return run.source?.arena === true ? env.deps.STAGE_ROOM_PLANS.specialArenas[run.zoneId] : null;}

/** @param {{act:?number,source:?object,rooms:string}} run 탐험 기록(또는 같은 모양의 계획)
 * @returns {?object} 그 열쇠의 방 단위 지도(지은 것은 기억해 둔다). 이 판이 놓을 수 없는 열쇠나 없는 놓임새면 null. */
export function roomStageLayout(env, run) {
    const spec = roomReadRoomKey(env, run.rooms), base = spec ? roomBaseMapOf(env, run) : null;
    if (!base) return null;
    const seed = run.source ? String(run.source.seed) : 'act', id = [run.zoneId, base.id, env.deps.explorationLayouts.key(run.source || { style: 'act', act: run.act }), run.rooms, seed].join('|');
    if (env.memo.cache.has(id)) return env.memo.cache.get(id);
    const shape = roomSpecialArenaShape(env, run);
    if (shape) return roomRememberRoomMap(env, id, roomSpecialArena(env, base, spec, run, shape));
    const profile = run.zoneId === 'atlas_map' ? env.deps.STAGE_ROOM_PLANS.atlasProfiles[spec.region] : undefined;
    const plan = env.deps.actExplorationRoomPlans.build(base, spec.plan, seed, profile);
    // seed: 방의 생김새와 문 자리를 고르는 씨앗(지도, 놓임새, 탐험의 씨앗). 같은 탐험은 언제나 같은 지도다.
    return roomRememberRoomMap(env, id, plan ? roomCompileRooms(env, base, plan, { ...spec, act: run.source ? null : run.act, seed: [base.id, spec.plan, seed].join(':') }) : null);
}
