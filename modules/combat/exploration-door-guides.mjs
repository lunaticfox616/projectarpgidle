import { doorStageMap } from './exploration-door-map.mjs';

/** 그 구역의 지도에 서는 이야기 NPC: 액트나 전직 시련 대사(data/story-journal.js)의 npc. 액트 1의 안내자는 루프 1에만 선다(2026-10-15
 * 사용자: 루프 뒤에는 첫 방에 하켄이 없다). 무대의 그림과 대사(js/canvas-act-title-card.js)와 서는 칸(guideCells)이 함께 읽는다.
 * @returns {?object} 그 npc 대사 줄(이름, 대사), 없으면 null */
export function doorStoryGuide(env, zoneId) {
    const act = Number.isInteger(zoneId) ? env.deps.getStoryActByZoneId(zoneId) : null;
    const lines = act ? env.deps.STORY_ACT_ENCOUNTERS[act.order] : (typeof zoneId === 'string' ? env.deps.STORY_TRIAL_ENCOUNTERS[zoneId] : null);
    return lines && lines.npc && !(act && act.order === 1 && (env.owner.season || 1) > 1) ? lines.npc : null;
}

/** The room where the map's guide stands and its first lines are said: the entry room, or in loop 1's first start the room behind
 * it where the guide is struck (js/combat-encounters.js starterRescueRoom; saves from before kept it in the entry room). */
export function doorGuideRoom(run, map) {
    const pack = run.packs.find(row => row.rescue);
    return (pack && map.rooms.find(row => row.id === pack.roomId)) || map.entry;
}

export function doorGuideCells(env, run) {
    if (!run) return [];
    if (!env.memo.guideKeys.has(run)) env.memo.guideKeys.set(run, doorFindGuideCells(env, run));
    return env.memo.guideKeys.get(run);
}

function doorFindGuideCells(env, run) {
    const map = doorStageMap(env, run);
    if (!map || !doorStoryGuide(env, run.zoneId)) return [];
    const room = doorGuideRoom(run, map), post = env.deps.actExplorationRooms.npcPost(room);
    const doorways = new Set(map.doors.flatMap(door => door.cells.concat(door.landings)).map(cell => env.deps.gridCellKey(cell.gx, cell.gy)));
    const key = env.deps.gridCellKey(post.gx, post.gy);
    return doorways.has(key) ? [] : [key];
}
