/** 탐험 지도에서 무엇이 보이는가를 정하는 한곳 (2026-10-13 성능 작업, docs/stage-render-performance-20261013.md).
 * 시야 방식은 둘이고 여기서만 고른다(sightMode). 다른 파일은 지역 이름을 보고 갈라 쓰지 않는다.
 *   room  주인공이 선 방 전체가 보인다. 방 단위 무대(js/act-exploration-rooms.js)의 바탕이다. 시야 반경 계산, 시야 탐색
 *         (actExplorationMap.visibleCells), 칸별 발견 목록(run.discovered), 안개를 쓰지 않는다. 몬스터와 물건은 방 소속
 *         (map.owner)으로만 가른다: 주인공과 같은 방이면 보이고 노릴 수 있으며, 다른 방의 무리는 깨어나지도 그려지지도 않는다.
 *   fog   시야 반경, 벽의 가림, 안개, 칸별 발견. 이어진 지도(위에서 보는 전장)는 언제나 이 방식이고, 방 단위 무대에서는 지역
 *         정의가 켠 지역(data/stage-room-plans.js STAGE_ROOM_PLANS.regions.sight)만 쓴다. 규칙은 js/act-exploration-state.js에
 *         그대로 있다.
 * 시야는 보이는 것과 노릴 수 있는 것만 정한다. 사거리, 충돌, 걸을 수 있는 칸, 길 찾기, 공격 범위는 따로다(js/combat-grid.js):
 * 방 전체가 보여도 벽 너머나 사거리 밖은 칠 수 없다. 약도의 방문 기록(run.visitedRooms)도 따로다: 가 보지 않은 방은 드러나지 않는다.
 * 방식은 저장하지 않는다. 탐험의 지도(run.rooms에 적힌 지역)에서 그때그때 읽으므로 방식 정보가 없는 예전 저장도 그대로 걷는다.
 * 게임 상태를 읽기만 한다(dropCellList만 예외: room 방식의 탐험에 남은 칸별 목록을 비운다).
 */
const actExplorationSight = (() => {
    const FOG = 'fog', ROOM = 'room';
    const seenMemo = new WeakMap(); // 탐험 → { list, set }: fog 방식의 발견 칸 묶음(저장하지 않는다)

    /** 테스트 패널의 선택(settings.stageSight 'fog'): 어느 지역이든 시야 방식으로 걸어 본다. */
    const forced = () => typeof game === 'object' && !!game.settings && game.settings.stageSight === FOG;
    /** @returns {'room'|'fog'} 그 탐험의 시야 방식. */
    function sightMode(run) {
        const map = run ? actExplorationMap.forRun(run) : null;
        if (!map || !map.stage) return FOG;
        return forced() || STAGE_ROOM_PLANS.regions.sight.includes(map.region) ? FOG : ROOM;
    }
    const wholeRoom = run => sightMode(run) === ROOM;
    /** 방 단위 지도에서 두 자리가 같은 방인가. 벽 위나 지도 밖이면 아니다. */
    function sameRoom(map, one, other) {
        const room = actExplorationRooms.roomAt(map, one);
        return !!room && room === actExplorationRooms.roomAt(map, other);
    }
    /** 방 단위 지도에서 cell과 같은 방에 선 것을 가리는 함수(여럿을 한 번에 가를 때). cell이 벽 위면 아무것도 아니다. */
    function inRoomOf(map, cell) {
        const here = actExplorationRooms.roomAt(map, cell);
        return unit => !!here && actExplorationRooms.roomAt(map, unit) === here;
    }
    /** fog 방식의 발견 칸(칸 번호의 묶음). 발견 목록은 늘 때마다 새 배열이 되므로(js/act-exploration-state.js) 그때만 다시 만든다:
     * 그리는 쪽이 프레임마다 묶음을 새로 짓던 것을 대신한다. */
    function seenCells(run) {
        const memo = seenMemo.get(run);
        if (memo && memo.list === run.discovered) return memo.set;
        const set = new Set(run.discovered);
        seenMemo.set(run, { list: run.discovered, set });
        return set;
    }
    /** 플레이어가 아는 칸인가: 이동 명령을 걸 수 있고 그 칸의 물건이 보인다. room 방식은 가 본 방의 칸, fog 방식은 발견한 칸. */
    function knownCell(run, cell) {
        const map = actExplorationMap.forRun(run);
        if (sightMode(run) === FOG) return seenCells(run).has(actExplorationMap.index(map, cell));
        const room = actExplorationRooms.roomAt(map, cell);
        return !!room && run.visitedRooms.includes(room.id);
    }
    const floorOf = room => (room.x1 - room.x0 + 1) * (room.y1 - room.y0 + 1);
    /** 지도를 얼마나 밝혔는가(0..1): 약도 둘레의 고리. room 방식은 가 본 방의 바닥 몫, fog 방식은 발견한 바닥 칸의 몫. */
    function exploredShare(run) {
        const map = actExplorationMap.forRun(run);
        if (sightMode(run) === FOG) {
            const floor = map.tiles.filter(Boolean).length;
            return floor ? run.discovered.filter(id => map.tiles[id]).length / floor : 0;
        }
        const total = map.rooms.reduce((sum, room) => sum + floorOf(room), 0);
        const walked = map.rooms.filter(room => run.visitedRooms.includes(room.id)).reduce((sum, room) => sum + floorOf(room), 0);
        return total ? walked / total : 0;
    }
    /** room 방식의 탐험이 들고 있을 까닭이 없는 칸별 목록을 비운다(예전 저장에서 온 목록, 방식이 바뀐 탐험). */
    function dropCellList(run) {
        if (run.discovered.length && wholeRoom(run)) run.discovered = [];
    }
    return Object.freeze({ sightMode, wholeRoom, sameRoom, inRoomOf, seenCells, knownCell, exploredShare, dropCellList });
})();
safeExposeGlobals({ actExplorationSight });
