/** 방 단위 무대의 문 (2026-10-11 사용자: "던파처럼 방 하나마다 이동하는 방식", 지도는 js/act-exploration-rooms.js).
 * 주인공이 열린 문 칸에 서면 이어진 방의 문 안쪽으로 옮겨진다. 걷기가 아니라 자리 옮김이라 이동 기록(run.motion)을 남기지 않는다.
 * 문은 방 안에서 싸우는 몬스터가 살아 있는 동안 잠기고, 보스 방으로 가는 문은 정예가 남아 있으면 칸 자체에 설 수 없다(map.gate).
 * 시험판: 무대 시험판으로 연 창(주소에 stage=1, js/canvas-stage-actors.js)에서만 방 단위 지도를 새로 만든다.
 */
const actExplorationDoors = (() => {
    /** 이 창에서 새 탐험을 방 단위 지도로 여는가. 그림이 없는 환경(검증 스크립트)에서는 언제나 아니다. */
    function session() { return typeof stageView === 'object' && stageView.rooms(); }
    /** 새 탐험의 방 크기 열쇠: 테스트 패널에서 고른 가로, 깊이 덧칸(고르지 않았거나 없는 값이면 바탕값). */
    function planKey() {
        const rule = STAGE_ROOMS, pick = (value, steps, base) => (steps.includes(value) ? value : base);
        return actExplorationRooms.key(pick(game.settings.stageRoomWide, rule.wideSteps, rule.grow.wide), pick(game.settings.stageRoomDeep, rule.deepSteps, rule.grow.deep));
    }
    /** The run's room-by-room map, or null on a continuous map. */
    function stageMap(run) {
        const map = run ? actExplorationMap.forRun(run) : null;
        return map && map.stage ? map : null;
    }
    /** 싸우는 몬스터나 터지는 중인 물체가 있으면 방의 문이 모두 잠긴다. 보스 방 문은 정예가 남아 있어도 잠긴다. */
    function locked(run, door) {
        if (game.enemies.some(enemy => enemy.hp > 0) || actExplorationState.objects.active(run)) return true;
        return door.gate && actExplorationState.remainingElites(run) > 0;
    }
    /** 살아 있는 소환수를 주인공이 도착한 칸 둘레로 데려온다: 방이 떨어져 있어 걸어서는 따라올 수 없다. */
    function bringSummons(cell) {
        const blocked = getGridBlockedCells();
        for (const summon of game.summons || []) {
            if (!summon || summon.isGhost || !summon.alive || !hasGridCell(summon)) continue;
            const spot = findFreeGridCell(blocked, cell);
            if (!spot) continue;
            Object.assign(summon, { gx: spot.gx, gy: spot.gy, gridMoveTimer: 0, gridStepAt: 0 });
            blocked.add(gridCellKey(spot.gx, spot.gy));
        }
    }
    /** 걸음이 끝난 주인공이 열린 문 칸에 서 있으면 이어진 방으로 옮긴다. @returns {boolean} 옮겼는지 */
    function cross(run) {
        const map = stageMap(run), hero = game.gridPlayer, door = map ? actExplorationRooms.doorAt(map, hero) : null;
        if (!door || locked(run, door)) return false;
        // 문 칸으로 가라는 명령은 여기서 끝난다: 남겨 두면 도착한 방에서 그 문으로 되돌아 걷는다.
        if (run.destination && run.destination.gx === hero.gx && run.destination.gy === hero.gy) run.destination = null;
        Object.assign(hero, { gx: door.exit.gx, gy: door.exit.gy, gridMoveTimer: 0 });
        bringSummons(door.exit);
        return true;
    }
    /** 지금 걸어갈 칸: 같은 방이면 목표 그대로, 다른 방이면 그 방으로 가는 문 칸. 이어진 지도에서는 언제나 목표 그대로다. */
    function toward(run, target) {
        const map = stageMap(run);
        return map ? actExplorationRooms.waypoint(map, game.gridPlayer, target) : target;
    }
    /** 주인공이 선 방(문 칸은 그 문이 붙은 방). 이어진 지도에서는 null. */
    function room(run) {
        const map = stageMap(run);
        return map ? actExplorationRooms.roomAt(map, game.gridPlayer) : null;
    }
    /** 주인공이 선 방의 문들과 지금 잠겼는지: 그림(js/canvas-stage-rooms.js)과 미니맵이 읽는다. */
    function doorsHere(run) {
        const map = stageMap(run), here = room(run);
        if (!map || !here) return [];
        return map.doors.filter(door => door.room === here.index).map(door => ({ door, locked: locked(run, door) }));
    }
    /** 방 단위 탐험에서 주인공이 걷는 빠르기의 배수(STAGE_ROOMS.pace). 이어진 지도의 탐험은 1. */
    const pace = run => (run && run.rooms ? STAGE_ROOMS.pace : 1);
    return Object.freeze({ session, planKey, stageMap, cross, toward, room, doorsHere, pace });
})();
safeExposeGlobals({ actExplorationDoors });
